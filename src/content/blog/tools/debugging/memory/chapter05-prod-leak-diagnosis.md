---
title: "운영 메모리 누수 진단 — long-running 프로세스의 진단 전략"
slug: "tools/debugging/memory/chapter05-prod-leak-diagnosis"
date: 2026-05-31T09:05:00
description: "천천히 새는 데몬 하나를 놓고 PSS 추세·smaps로 누수를 확인하고, jemalloc SIGUSR2 dump·BCC memleak으로 콜스택을 찾고, cgroup memory.high·memory.max·PSI trigger가 실제로 어떻게 반응하는지 Debian 12 VM에서 재현합니다."
tags: [memory, leak, production, cgroup, oom]
series: "Memory Diagnostics"
seriesOrder: 5
draft: false
topics: ["tools", "tools/debugging"]
---

개발 환경에서는 ASan이나 Valgrind로 프로그램을 처음부터 다시 돌리면 됩니다. 운영 중인 서비스는 사정이 다릅니다. 다시 빌드하거나 몇 배 느리게 돌릴 수 없고, 누수는 며칠에 걸쳐 천천히 드러납니다. 그래서 운영 진단은 "켜 두어도 되는 관측"으로 누수를 확인하고, "잠깐 붙였다 떼는 도구"로 콜스택을 찾고, "커널이 정한 한도"로 피해를 막는 순서로 갑니다.

이 장에서는 요청 네 개 중 하나의 응답 버퍼(64 KiB)를 해제하지 않는 데몬 `leakd`를 Debian 12.15 arm64 VM(앞 장들과 같은 QEMU HVF, 커널 `6.1.0-56-arm64`)에서 띄워 놓고 이 순서를 그대로 밟습니다. 숫자는 이 VM의 데모 값입니다.

:::tldr
`smaps_rollup`의 PSS를 주기적으로 기록해 기울기를 보고, `smaps`의 `Private_Dirty`로 영역을 좁히고, jemalloc dump 두 개의 차이나 BCC `memleak`으로 콜스택을 찾습니다. cgroup `memory.high`는 throttle만 하고 OOM을 부르지 않으며, `memory.max`에 닿아 회수가 안 되면 cgroup 안에서 OOM killer가 돕니다.
:::

## 실험 대상 — leakd

`leakd`는 초당 약 100개의 요청을 처리하는 루프입니다. SIGUSR2를 받으면 jemalloc profile을 dump하는데, handler는 플래그만 세우고 dump는 루프에서 합니다. [Ch 3](/blog/tools/debugging/memory/chapter03-jemalloc-tcmalloc)에서 본 대로 dump 안에서 락과 할당이 일어나기 때문입니다.

```c
/* leakd.c: a long-running daemon that leaks one 64 KiB buffer per request */
static volatile sig_atomic_t dump_requested;

static void on_usr2(int sig) { (void)sig; dump_requested = 1; }  /* only set a flag */

static char *build_response(int id) {
    char *buf = malloc(64 * 1024);
    memset(buf, 'x', 64 * 1024);
    snprintf(buf, 64, "response %d", id);
    return buf;
}

static void handle_request(int id) {
    char *resp = build_response(id);
    if (id % 4 != 0) free(resp);              /* bug: every 4th response leaks */
}

int main(void) {
    signal(SIGUSR2, on_usr2);
    for (int id = 0;; id++) {
        handle_request(id);
        if (dump_requested) {                  /* dump outside the handler */
            dump_requested = 0;
            int err = mallctl("prof.dump", NULL, NULL, NULL, 0);
            fprintf(stderr, "prof.dump -> %d\n", err);
        }
        usleep(10000);                         /* ~100 requests/s */
    }
}
```

`--enable-prof`로 빌드한 jemalloc 5.3.0(Ch 3에서 만든 `/opt/jemalloc-prof`)에 링크하고 `MALLOC_CONF=prof:true,prof_prefix:/var/log/leakd/jeprof`로 띄웠습니다.

## 1단계 — 정말 새는가: PSS 추세

"메모리를 많이 쓴다"와 "샌다"는 다른 말입니다. 캐시가 차오르는 중일 수도 있고, allocator가 빈 공간을 쥐고 있을 수도 있습니다. 새는지를 보려면 한 시점의 크기가 아니라 같은 부하에서의 *기울기*를 봅니다. [Ch 1](/blog/tools/debugging/memory/chapter01-memory-accounting)에서 본 대로 6.1의 `VmRSS`는 근사치이므로, 페이지 테이블을 직접 센 `smaps_rollup`의 PSS를 씁니다.

```bash
for i in $(seq 1 16); do
    pss=$(awk '/^Pss:/ {print $2}' /proc/$PID/smaps_rollup)
    echo "$(date +%s) $pss"
    sleep 2
done | tee pss.log
```

```text
1795403194 8356
1795403196 11050
1795403198 13978
...
1795403221 47250
1795403223 49158
1795403225 53394
```

31초 동안 8 MB에서 53 MB까지 거의 일직선으로 올랐습니다. 기울기는 최소제곱 직선으로 구합니다.

```python
import numpy as np
d = np.loadtxt('pss.log')
t, kb = d[:,0] - d[0,0], d[:,1]
slope = np.polyfit(t, kb, 1)[0]
print(f'slope: {slope:.1f} kB/s over {t[-1]:.0f} s')
```

```text
slope: 1448.1 kB/s over 31 s
```

초당 약 100요청 중 4분의 1이 64 KiB를 남기면 이론값은 25 × 64 = 1,600 KiB/s입니다. 실제 요청률은 `usleep(10000)`과 처리 시간 때문에 100보다 조금 낮으니, 1,448 kB/s는 이 버그와 잘 맞습니다. 이렇게 "기대 기울기"를 계산해 두면 측정이 맞는지 바로 확인할 수 있습니다.

이 방법은 체중계에 매일 같은 시각에 올라가는 것과 같습니다. 하루 측정으로는 아무것도 말할 수 없지만, 같은 조건의 기록이 쌓이면 추세가 보입니다. 운영에서는 부하가 일정한 시간대끼리 비교하고, 캐시가 다 찬 뒤의 구간을 씁니다. 캐시가 차는 동안의 상승은 언젠가 평평해지지만, 누수는 평평해지지 않습니다.

## 2단계 — 어디가 새는가: status와 smaps

다음은 어떤 종류의 메모리가 늘었는지 가립니다. `status`의 세 줄이 첫 갈림길입니다.

```text
$ grep -E '^(RssAnon|RssFile|RssShmem)' /proc/7761/status
RssAnon:	   55536 kB
RssFile:	    3056 kB
RssShmem:	       0 kB
```

익명 메모리가 거의 전부입니다. 이제 `smaps`에서 `Private_Dirty`가 10 MiB를 넘는 매핑을 찾습니다.

```text
$ awk '/^[0-9a-f]+-/ { mapping=$0 }
       /^Private_Dirty:/ { if ($2 > 10240) print $2 " kB " mapping }' /proc/7761/smaps | sort -n -r | head
55276 kB ffff81300000-ffff84c00000 rw-p 00000000 00:00 0
```

이름 없는 익명 매핑 하나에 55 MB가 몰려 있습니다. jemalloc이 운영체제에서 받아 온 영역입니다. 매핑 이름이 없으니 `/proc`만으로는 누가 할당했는지 알 수 없고, 여기서부터는 allocator 쪽 도구가 필요합니다.

## 3단계 — 누가 할당했나: 콜스택

### jemalloc dump 두 개의 차이

`leakd`에 SIGUSR2를 두 번 보내 dump를 두 개 받았습니다(첫 번째는 기록을 시작하고 2초쯤, 두 번째는 기록이 끝날 때). 루프가 dump 결과를 표준 오류에 남겼습니다.

```text
prof.dump -> 0
prof.dump -> 0
$ ls /var/log/leakd/
jeprof.7761.0.m0.heap
jeprof.7761.1.m1.heap
```

mallctl로 요청한 dump는 이름에 `m<번호>`가 붙습니다(jemalloc 매뉴얼의 `prof.dump` 항목). 두 dump의 차이를 누적 기준으로 보면 늘어난 몫이 어느 콜스택에서 왔는지 나옵니다.

```text
$ jeprof --text --cum --base=/var/log/leakd/jeprof.7761.0.m0.heap ./leakd /var/log/leakd/jeprof.7761.1.m1.heap
Using local file ./leakd.
Using local file /var/log/leakd/jeprof.7761.1.m1.heap.
Total: 45.7 MB
     0.0   0.0%   0.0%     45.7 100.0% __libc_start_call_main
     ...
     0.0   0.0%   0.0%     45.7 100.0% build_response (inline)
     0.0   0.0%   0.0%     45.7 100.0% handle_request (inline)
     ...
     0.0   0.0%   0.0%     45.7 100.0% main
```

두 dump 사이에 늘어난 45.7 MB가 모두 `build_response`와 `handle_request`(컴파일러가 `main`에 인라인한 함수)에서 왔습니다. 이 방식은 서비스를 재시작하지 않고 원하는 때에 시점을 찍을 수 있습니다. 대신 처음부터 profiling을 켠 jemalloc으로 떠 있어야 하고, profiling에는 샘플링과 backtrace 비용이 듭니다. Debian 12 패키지의 jemalloc에 이 기능이 없다는 것은 Ch 3에서 확인했습니다.

### BCC memleak — 재시작 없이 붙이기

allocator를 바꿀 수 없고 이미 떠 있는 프로세스라면 eBPF가 남은 선택지입니다. [BCC tools](/blog/tools/debugging/kernel/chapter04-ebpf-kernel#bcc--python으로-더-복잡한-프로그램)의 `memleak`은 uprobe로 `malloc`·`free` 계열을 추적해 아직 해제되지 않은 할당을 콜스택별로 모읍니다. Debian 12에서는 `bpfcc-tools` 패키지(0.26)가 `/usr/sbin/memleak-bpfcc`로 설치합니다.

glibc malloc을 그대로 쓰는 `leakd-plain`(같은 코드에서 jemalloc 부분만 뺀 것, `-fno-omit-frame-pointer`로 빌드)에 10초 간격으로 붙였습니다.

```text
$ memleak-bpfcc -p 7949 10
Attaching to pid 7949, Ctrl+C to quit.
[03:07:42] Top 10 stacks with outstanding allocations:
	13631488 bytes in 208 allocations from stack
		0x0000aaaabdc009ec	main+0x88 [leakd-plain]
		0x0000ffff886a7744	__libc_start_call_main+0x74 [libc.so.6]
		0x0000ffff886a7818	__libc_start_main_impl+0x98 [libc.so.6]
		0x0000aaaabdc00870	_start+0x30 [leakd-plain]
[03:07:52] Top 10 stacks with outstanding allocations:
	27918336 bytes in 426 allocations from stack
		0x0000aaaabdc009ec	main+0x88 [leakd-plain]
		...
```

10초 사이에 미해제 할당이 208개에서 426개로, 13.6 MB에서 27.9 MB로 늘었습니다. 블록 하나가 정확히 65,536 바이트(13,631,488 / 208)라 64 KiB 응답 버퍼가 범인이라는 것까지 보입니다. 함수가 `main`에 인라인돼 스택에는 `main+0x88`만 나왔습니다. 더 자세한 스택을 보려면 최적화 수준을 낮추거나 `noinline`을 붙여 다시 빌드해야 합니다.

한 가지 함정도 만났습니다. 같은 도구에 `--combined-only`를 붙이면 0.26의 Python 스크립트가 `AttributeError: 'list' object has no attribute 'decode'`로 죽었습니다(`print_outstanding_combined()`, 546행). 옵션 없이 돌리면 위처럼 정상이었습니다.

### heaptrack attach

세 번째 선택지는 [Ch 2](/blog/tools/debugging/memory/chapter02-heaptrack)의 `heaptrack -p`입니다. GDB로 주입하므로 eBPF가 없는 환경에서도 되지만, heaptrack의 usage 메시지가 직접 "UNSTABLE and can lead to CRASHES"라고 경고합니다. attach 전에 할당된 메모리는 기록되지 않는다는 점도 Ch 2에서 확인했습니다.

| 방법 | 재시작 필요 | 이 VM에서 본 것 | 주의 |
|------|-------------|-----------------|------|
| jemalloc prof dump | 예 (prof 빌드로 시작) | 두 dump 차이 45.7 MB → `build_response` | 샘플링 추정, 상시 비용 |
| BCC `memleak` | 아니오 | 10초에 +218개, 64 KiB 블록 | 커널 BPF 필요, 0.26 `--combined-only` 버그 |
| `heaptrack -p` | 아니오 | Ch 2 참고 | 주입·분리 시 crash 경고 |

## 4단계 — 고쳤는가: 같은 기울기로 검증

수정한 뒤에는 1단계와 같은 조건으로 PSS를 다시 기록하고 기울기를 비교합니다. 위 스크립트를 배포 파이프라인의 짧은 부하 테스트 뒤에 붙이면, 기울기가 정해 둔 값을 넘을 때 배포를 막는 회귀 검사가 됩니다. 문턱값은 그 서비스의 정상 상태 기울기를 몇 번 재 보고 정합니다. 이 장의 `leakd`는 버그가 있을 때 1,448 kB/s였습니다.

## cgroup으로 피해 막기 — memory.high와 memory.max

누수를 찾는 동안에도 서비스는 돌아야 하고, 한 서비스가 머신 전체를 OOM으로 몰아서는 안 됩니다. cgroup v2의 메모리 컨트롤러가 이 울타리입니다. `Documentation/admin-guide/cgroup-v2.rst`(v6.1)의 정의를 먼저 봅니다.

| 파일 | 문서의 정의 |
|------|-------------|
| `memory.high` | 사용량 throttle 한도. 넘으면 cgroup의 프로세스가 throttle되고 강한 회수 압력을 받음. 넘어도 OOM killer를 부르지 않으며, 극단적인 경우 넘을 수 있음 |
| `memory.max` | hard limit. 사용량이 여기에 닿고 줄일 수 없으면 cgroup 안에서 OOM killer가 불림. 경우에 따라 잠시 넘을 수 있음 |
| `memory.low` | best-effort 보호. 유효 low 경계 안의 사용량은 보호되지 않은 cgroup에 회수할 메모리가 없을 때만 회수됨 |
| `memory.events` | `low`·`high`·`max`·`oom`·`oom_kill`·`oom_group_kill` 횟수 |

문서는 `memory.high`를 "메모리 사용을 제어하는 주된 장치"로, `memory.max`를 "마지막 안전망"으로 설명합니다. 두 한도가 실제로 어떻게 다르게 반응하는지 `leakd-plain`을 systemd 유닛으로 띄워 확인했습니다. swap은 0으로 막았습니다. 아래 첫 출력의 `t=` 값은 2초 간격으로 찍은 샘플의 번호라, 실제 경과 시간은 그 두 배입니다.

```text
$ systemd-run --unit=leakd --property=MemoryMax=64M --property=MemoryHigh=48M --property=MemorySwapMax=0 /root/leakd-plain
Running as unit: leakd.service
t=1s current=1658880 low 0 high 0 max 0 oom 0 oom_kill 0 oom_group_kill 0
...
t=17s current=47890432 low 0 high 0 max 0 oom 0 oom_kill 0 oom_group_kill 0
t=18s current=50974720 low 0 high 3 max 0 oom 0 oom_kill 0 oom_group_kill 0
t=19s current=52883456 low 0 high 140 max 0 oom 0 oom_kill 0 oom_group_kill 0
t=20s current=54001664 low 0 high 225 max 0 oom 0 oom_kill 0 oom_group_kill 0
$ systemctl status leakd
...
     Memory: 52.2M (high: 48.0M max: 64.0M swap max: 0B available: 0B)
```

48 MiB(50,331,648 바이트)를 넘는 순간부터 `high` 카운터가 오르기 시작했습니다. 얼마 뒤 30초 동안 다시 지켜봤지만 사용량은 6천만 바이트 언저리에서 아주 천천히 오를 뿐이었고, `high`는 956까지 올라도 `oom_kill`은 0이었습니다. 프로세스는 죽지 않고 느려졌습니다.

```text
current=60444672 low 0 high 752 max 0 oom 0 oom_kill 0 oom_group_kill 0
...
current=62300160 low 0 high 956 max 0 oom 0 oom_kill 0 oom_group_kill 0
```

이것이 `memory.high`의 성격입니다. 고속도로 진입 램프의 신호등처럼 차를 막지는 않고 천천히 들여보냅니다. 운영자에게는 시간을 벌어 주는 장치이고, 그동안 PSI나 `memory.events`로 경보를 받을 수 있습니다.

같은 프로그램을 `MemoryHigh` 없이 `MemoryMax=64M`만 걸고 띄우면 결과가 다릅니다.

```text
$ systemd-run --unit=leakd2 --property=MemoryMax=64M --property=MemorySwapMax=0 /root/leakd-plain
...
current=63725568 low 0 high 0 max 0 oom 0 oom_kill 0 oom_group_kill 0
current=66351104 low 0 high 0 max 0 oom 0 oom_kill 0 oom_group_kill 0
cgroup removed
$ journalctl -u leakd2
Nov 23 03:10:06 localhost systemd[1]: Started leakd2.service - /root/leakd-plain.
Nov 23 03:10:54 localhost systemd[1]: leakd2.service: A process of this unit has been killed by the OOM killer.
Nov 23 03:10:54 localhost systemd[1]: leakd2.service: Main process exited, code=killed, status=9/KILL
Nov 23 03:10:54 localhost systemd[1]: leakd2.service: Failed with result 'oom-kill'.
$ journalctl -k | grep -E "Memory cgroup out of memory|oom-kill:"
... oom-kill:constraint=CONSTRAINT_MEMCG,nodemask=(null),cpuset=/,mems_allowed=0-1,oom_memcg=/system.slice/leakd2.service,task_memcg=/system.slice/leakd2.service,task=leakd-plain,pid=8176,uid=0
... Memory cgroup out of memory: Killed process 8176 (leakd-plain) total-vm:67488kB, anon-rss:65256kB, file-rss:1048kB, shmem-rss:0kB, UID:0 pgtables:172kB oom_score_adj:0
```

시작 48초 만에 cgroup 안의 OOM killer가 프로세스를 죽였습니다. [Ch 1](/blog/tools/debugging/memory/chapter01-memory-accounting)의 시스템 OOM 로그와 비교하면 `constraint=CONSTRAINT_MEMCG`와 `oom_memcg=` 칸, 그리고 "Memory cgroup out of memory"라는 문구가 cgroup OOM의 표시입니다. 머신의 나머지 프로세스는 영향을 받지 않았습니다. systemd는 유닛 결과를 `oom-kill`로 기록하고 cgroup을 지웠기 때문에, 죽은 뒤에는 `memory.events`를 읽을 수 없었습니다. 사후 분석에는 `journalctl`이 남습니다.

systemd 유닛 파일에서는 같은 설정을 이렇게 씁니다.

```ini
[Service]
MemoryHigh=48M
MemoryMax=64M
MemorySwapMax=0
```

cgroup 파일을 직접 다룰 때는 `/sys/fs/cgroup/<그룹>/memory.max`에 값을 쓰고 PID를 `cgroup.procs`에 쓰면 됩니다. throttle 중인 cgroup의 `memory.stat`을 보면 무엇이 차 있는지 나뉘어 보입니다. 이 실행에서는 `anon 61865984`, `file 0`으로 전부 익명 메모리였습니다.

## PSI — 압박을 알림으로 받기

`memory.high`가 프로세스를 느리게 만드는 동안 그 느려짐 자체를 지표로 받을 수 있습니다. PSI(Pressure Stall Information)입니다. Debian 12 커널은 `CONFIG_PSI=y`이고 `CONFIG_PSI_DEFAULT_DISABLED`가 꺼져 있어 PSI가 기본으로 켜져 있습니다. 시스템 전체 값은 `/proc/pressure/memory`에서, cgroup별 값은 `<cgroup>/memory.pressure`에서 읽습니다.

`Documentation/accounting/psi.rst`(v6.1)에 따르면 `some` 줄은 적어도 일부 작업이 자원을 기다리며 멈춘 시간의 비율, `full` 줄은 비유휴 작업 전부가 동시에 멈춘 시간의 비율입니다. throttle 중인 `leakd` cgroup에서는 이렇게 나왔습니다.

```text
some avg10=93.36 avg60=50.35 avg300=13.86 total=44277156
```

최근 10초 중 93%를 메모리 회수와 `memory.high` throttle 대기로 멈춰 있었다는 뜻입니다. 앞서 처음 읽은 `memory.pressure`에서는 작업이 하나뿐인 cgroup이라 `some`과 `full`이 같은 값(avg10=21.76)이었습니다.

PSI는 숫자를 직접 읽기보다 trigger로 쓸 때 더 쓸모 있습니다. 같은 문서는 `<some|full> <멈춘 시간 us> <시간 창 us>` 형식의 문자열을 PSI 파일에 쓰고 `poll()`로 기다리라고 안내하고, "some 150000 1000000"(1초 창에서 150 ms 이상 부분 정체)을 예로 듭니다. trigger마다 별도의 `open()`이 필요하다는 점도 적혀 있습니다.

```c
/* psi_wait.c: register a PSI trigger and report when it fires */
int fd = open(path, O_RDWR | O_NONBLOCK);
const char *trig = "some 150000 1000000";   /* 150 ms stall within 1 s */
write(fd, trig, strlen(trig) + 1);
struct pollfd pfd = { .fd = fd, .events = POLLPRI };
for (int n = 0; n < 3; n++) {
    int r = poll(&pfd, 1, 30000);
    if (r == 0) { puts("timeout"); break; }
    if (pfd.revents & POLLERR) { puts("POLLERR"); break; }
    if (pfd.revents & POLLPRI) printf("event %d: trigger fired\n", n);
}
```

throttle 중인 cgroup의 `memory.pressure`에 걸자 바로 세 번 연속 알림이 왔습니다.

```text
$ ./psi_wait /sys/fs/cgroup/system.slice/leakd.service/memory.pressure
event 0: trigger fired
event 1: trigger fired
event 2: trigger fired
```

서비스는 이 알림을 받아 자기 캐시를 줄이거나, jemalloc dump를 찍거나, 경보를 올릴 수 있습니다. OOM이 오기 전에 손쓸 기회를 주는 것이 PSI trigger의 역할입니다.

## 언어 런타임의 도구 — Python tracemalloc

C 레벨 도구는 Python 객체가 어디서 만들어졌는지 모릅니다. 인터프리터가 할당하는 메모리는 모두 인터프리터 콜스택으로 보이기 때문입니다. Python에는 표준 라이브러리 `tracemalloc`이 있습니다. 두 스냅샷의 차이를 줄 단위로 보여 줍니다.

```python
import tracemalloc

_cache = []

def handle(i):
    payload = "x" * 1000 + str(i)
    if i % 4 == 0:
        _cache.append(payload)        # bug: grows forever

tracemalloc.start(25)
snap1 = tracemalloc.take_snapshot()
for i in range(40000):
    handle(i)
snap2 = tracemalloc.take_snapshot()
for stat in snap2.compare_to(snap1, "lineno")[:3]:
    print(stat)
```

```text
/root/pyleak.py:6: size=10.0 MiB (+10.0 MiB), count=10000 (+10000), average=1054 B
/root/pyleak.py:8: size=83.1 KiB (+83.1 KiB), count=1 (+1), average=83.1 KiB
/usr/lib/python3.11/tracemalloc.py:560: size=320 B (+320 B), count=2 (+2), average=160 B
```

Python 3.11.2에서 6행(문자열 생성)이 1만 개, 10 MiB 늘었고 8행(리스트 확장)이 그다음입니다. 4만 번 중 4분의 1이 남는다는 버그와 정확히 맞습니다. 더 자세한 사용법은 [Python Debugging Ch 5](/blog/tools/debugging/python/chapter05-faulthandler-tracemalloc)에 있습니다.

## 시리즈 정리

프로세스 안쪽의 메모리 진단은 이 5장으로 한 바퀴 돌았습니다.

- **Ch 1** 메모리 회계: VSS/RSS/PSS/USS, `smaps_rollup`과 `VmRSS`의 차이
- **Ch 2** heaptrack: 할당 콜스택, temporary 할당, attach
- **Ch 3** jemalloc·tcmalloc: allocator 내장 통계와 heap profile
- **Ch 4** glibc 도구: `libc_malloc_debug`, `mallinfo2`, `malloc_trim`, arena
- **Ch 5** (이 장) 운영 누수 진단: PSS 기울기, dump 차이, `memleak`, cgroup, PSI

| 단계 | 쓸 수 있는 것 |
|------|---------------|
| 개발 | ASan·Valgrind Memcheck로 처음부터 실행 |
| 스테이징 | heaptrack 또는 jemalloc prof로 전체 기록 |
| 운영 상시 | `smaps_rollup` PSS 추세, `mallinfo2`·allocator 통계, cgroup `memory.events`, PSI trigger |
| 운영 비상 | jemalloc dump(prof 빌드일 때), BCC `memleak`, `heaptrack -p` |

## 정리

- 누수 확인은 한 시점의 크기가 아니라 같은 부하에서 PSS의 기울기로 합니다. `leakd`는 1,448 kB/s였고, 버그로 계산한 기대값과 맞았습니다.
- `status`의 `RssAnon`과 `smaps`의 `Private_Dirty`로 메모리 종류와 매핑을 좁힙니다.
- 콜스택은 jemalloc dump 두 개의 `--base` 차이나 BCC `memleak`으로 찾습니다. `memleak`은 재시작이 필요 없습니다.
- `memory.high`는 throttle만 하고 OOM을 부르지 않았습니다. `memory.max`만 건 같은 프로그램은 48초 뒤 cgroup OOM으로 죽었습니다.
- PSI trigger(`some 150000 1000000`)는 throttle 중인 cgroup에서 바로 알림을 줬습니다.
- Python은 `tracemalloc`의 스냅샷 비교로 줄 단위 누수를 찾습니다.

## 다음 장 예고

Ch 6부터는 프로세스 바깥, 메모리 장치 자체로 시야를 넓힙니다. QEMU로 에뮬레이션한 CXL Type 3 메모리 장치를 띄워 `cxl list`·`daxctl`·NUMA 노드로 메모리가 어떻게 드러나는지 봅니다.

## 관련 항목 (시리즈 전체)

- [Ch 1: 메모리 회계](/blog/tools/debugging/memory/chapter01-memory-accounting)
- [Ch 2: heaptrack](/blog/tools/debugging/memory/chapter02-heaptrack)
- [Ch 3: jemalloc / tcmalloc](/blog/tools/debugging/memory/chapter03-jemalloc-tcmalloc)
- [Ch 4: glibc 도구](/blog/tools/debugging/memory/chapter04-glibc-tools)

## 외부 자료

- [Sanitizers — ASan](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)
- [Valgrind — Memcheck](/blog/tools/debugging/valgrind/chapter02-memcheck)
- [Kernel Debugging Ch 4: eBPF](/blog/tools/debugging/kernel/chapter04-ebpf-kernel)
- [Linux v6.1 `Documentation/admin-guide/cgroup-v2.rst`](https://github.com/torvalds/linux/blob/v6.1/Documentation/admin-guide/cgroup-v2.rst) — memory.high, memory.max, memory.low, memory.events
- [Linux v6.1 `Documentation/accounting/psi.rst`](https://github.com/torvalds/linux/blob/v6.1/Documentation/accounting/psi.rst) — some/full, trigger 형식
- [BCC `memleak`](https://github.com/iovisor/bcc/blob/v0.26.0/tools/memleak.py)
- [jemalloc profiling use case](https://github.com/jemalloc/jemalloc/wiki/Use-Case%3A-Heap-Profiling)
- [Python 3.11 `tracemalloc`](https://docs.python.org/3.11/library/tracemalloc.html)
- [Brendan Gregg — Memory leak flame graph](https://www.brendangregg.com/FlameGraphs/memoryflamegraphs.html)
