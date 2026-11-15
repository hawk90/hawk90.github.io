---
title: "운영 메모리 누수 진단 — long-running 프로세스의 진단 전략"
slug: "tools/debugging/memory/chapter05-prod-leak-diagnosis"
date: 2026-05-31T09:05:00
description: "장기 실행 서비스의 누수 추적. /proc 모니터링, cgroup memory.max, OOM 회피."
tags: [memory, leak, production, cgroup, oom]
series: "Memory Diagnostics"
seriesOrder: 5
draft: false
topics: ["tools", "tools/debugging"]
---

이 장은 운영 환경에서 누수 의심 신호를 좁히는 방법을 다룹니다. ASan·Valgrind·heaptrack은 각기 빌드·성능·기록량 제약이 있으므로, 운영 수집은 영향과 안전성을 검증한 제한된 방법으로 시작합니다.

:::tldr
`/proc/[pid]/smaps_rollup` 추세와 cgroup 지표를 우선 비교하고, allocator profiler나 drgn은 지원되는 범위와 측정 영향을 확인한 뒤 사용합니다.
:::

## 1단계 — 누수 *확인*

운영에서 "메모리 많이 쓴다" 가 *진짜 누수*인지부터.

```bash
# 시간별 PSS 추이 — 누수 여부 결정적 단서
$ for i in $(seq 1 100); do
    pss=$(sudo cat /proc/$PID/smaps_rollup | grep "^Pss:" | awk '{print $2}')
    echo "$(date +%s) $pss"
    sleep 60
  done > /tmp/pss.log
```

추세는 진단 신호이지 누수 판정기가 아닙니다. 비교 가능한 workload 구간에서 여러 차례 측정하고, 캐시·allocator retention·파일 매핑·cgroup 제한 등 다른 원인을 함께 확인합니다. 일시적으로 수렴하거나 평평해도 누수를 배제할 수 없고, 증가 곡선만으로 누수를 확정할 수도 없습니다.

`gnuplot` / `matplotlib`로 시각화:

```bash
$ gnuplot -e "
    set terminal png;
    set output '/tmp/pss.png';
    plot '/tmp/pss.log' using 1:2 with lines
"
```

## 2단계 — 누수 *영역* 좁히기

```bash
$ sudo cat /proc/$PID/status | grep -E "Rss|Vm"
RssAnon:   5000000 kB     # 폭주? heap 또는 anon mmap
RssFile:    200000 kB     # 정상 범위
RssShmem:    50000 kB     # 정상
```

RssAnon 증가는 heap 또는 익명 mmap의 후보 신호이고 RssFile 증가는 resident file mapping 후보입니다. RSS 분류만으로 누수 원인을 확정하지 말고 `smaps`의 매핑과 애플리케이션 동작을 대조합니다.

```bash
$ sudo cat /proc/$PID/smaps | awk '
  /^[0-9a-f]+-/ { mapping=$0 }
  /^Private_Dirty:/ {
    if ($2 > 10240) print $2 " KB " mapping
  }' | sort -n -r | head
6000000 KB  7f1234567000-7f56789abc00 rw-p 00000000 00:00 0
2000000 KB  7f3456789000-7f789abcdef00 rw-p 00000000 00:00 0
[stack]
[heap]
...
```

가장 큰 *private dirty* 영역이 범인. anon mmap (소스 표시 없음)이면 *어디서 mmap*했는지 알기 어려움 — strace로.

## 3단계 — 누수 *콜스택*

### 옵션 A — jemalloc profiling 상시

가장 추천. *재시작 한 번*으로 상시 활성.

```bash
# 서비스 환경 변수에
MALLOC_CONF=prof:true,prof_active:true,prof_prefix:/var/log/myprog/jeprof,lg_prof_sample:19
LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libjemalloc.so.2
```

프로파일링은 통계적 샘플링과 backtrace 비용이 있습니다. 고정 overhead 수치를 가정하지 말고 대표 workload에서 latency·CPU·RSS 영향을 측정한 뒤 상시 활성화 여부를 결정합니다.

자동 dump 트리거 (SIGUSR2 등):

```c
#include <signal.h>
#include <jemalloc/jemalloc.h>

volatile sig_atomic_t dump_requested;

void dump_handler(int sig) {
    dump_requested = 1;  // signal handler에서는 async-signal-safe 작업만 수행
}

int main() {
    signal(SIGUSR2, dump_handler);
    // 일반 실행 흐름에서 dump_requested를 확인한 뒤 mallctl("prof.dump", ...)
}
```

```bash
# RSS 증가 의심 시 외부에서
$ sudo kill -USR2 $PID
# /var/log/myprog/jeprof.<pid>.<n>.heap 생성

# 두 시점 diff
$ jeprof --text --base=jeprof.12345.0.heap \
    ./myprog jeprof.12345.20.heap | head
```

### 옵션 B — eBPF 메모리 추적

[BCC tools](/blog/tools/debugging/kernel/chapter04-ebpf-kernel#bcc--python으로-더-복잡한-프로그램)의 `memleak`.

```bash
$ sudo /usr/share/bcc/tools/memleak -p $PID --combined-only
Attaching to pid 12345, Ctrl+C to quit.
[3:21:14] Top 10 stacks with outstanding allocations:
        152040000 bytes in 76020 allocations from stack
                __libc_malloc+0x2a [libc.so.6]
                Cache::add+0x42 [myprog]
                Server::process+0x123 [myprog]
                main+0x88 [myprog]
        ...
```

- `memleak`이 보고하는 outstanding allocation은 후보일 뿐입니다. 추적 구간·stack 수집 방식·도구 버전에 따라 결과와 overhead가 달라지므로, 실제 시스템에서 검증합니다.

### 옵션 C — heaptrack attach

```bash
$ heaptrack -p $PID
[10분 후]
^C
$ heaptrack_gui heaptrack.myprog.*.zst
```

GUI의 allocation-cost 그래프와 호출 스택은 heaptrack 기록 안의 할당 정보를 보여 줍니다. RSS·cgroup 사용량 그래프와 같은 값은 아닙니다.

heaptrack의 runtime attach는 공식 문서에서 unstable로 안내되며 대상 프로세스가 중단될 수 있습니다. 운영 대상에 적용하기 전 재현 환경에서 검증하고, 가능하면 프로세스 시작 시점부터 기록합니다.

### 옵션 D — drgn으로 라이브 분석

```bash
$ sudo drgn -p $PID
>>> from drgn.helpers.linux import *

>>> # drgn은 주로 커널 메모리와 커널 자료구조 분석에 사용합니다.
>>> # user-space heap allocation stack을 자동으로 복원하는 도구로 간주하지 않습니다.
```

drgn은 주로 커널 메모리와 커널 자료구조의 라이브 분석에 씁니다. user-space allocation stack을 procfs에서 복원하는 도구로 사용하지 말고, 해당 heap profiler나 디버거를 선택합니다.

## 4단계 — 누수 *수정 후 검증*

코드 수정 → 다시 배포 → 시간별 PSS가 *수렴*하는지.

```bash
# 자동화 — 30분간 PSS 측정, 추세 확인
$ ./monitor_pss.sh $PID 30  | tee pss-after.log
$ python3 -c "
import numpy as np
data = np.loadtxt('pss-after.log')[:, 1]
slope = np.polyfit(range(len(data)), data, 1)[0]
print(f'slope: {slope:.2f} KB/sec')
print('증가 추세 검토 필요' if slope > 1024 else '이 표본에서 임계 초과 없음')
"
```

CI에 통합 — 매 배포 시 *짧은 load test* + slope 검증으로 회귀 차단.

## cgroup memory.max — 보호

`memory.max`는 프로세스 한 개가 아니라 cgroup 전체의 메모리 사용을 제한합니다. 한도에 닿으면 reclaim 후 cgroup 내 OOM 처리로 이어질 수 있지만, 시스템 OOM과 무관하게 모든 할당이 즉시 실패한다고 단정할 수는 없습니다.

```bash
# systemd unit
[Service]
MemoryMax=4G
MemoryHigh=3.5G        # 이 위는 throttle

# 수동
$ sudo systemd-run --scope -p MemoryMax=4G ./myprog
```

cgroup v2:
```bash
$ sudo mkdir /sys/fs/cgroup/myapp
$ echo 4G | sudo tee /sys/fs/cgroup/myapp/memory.max
$ echo $PID | sudo tee /sys/fs/cgroup/myapp/cgroup.procs
```

- **memory.max** — cgroup의 hard limit. 도달하면 reclaim을 시도하고, 계속 한도를 넘으면 cgroup OOM이 발생할 수 있습니다.
- **memory.high** — 초과 시 reclaim 압력을 높이는 throttle 경계이며 OOM 경계와 다릅니다.
- **memory.low** — 하위 경계 아래의 사용량에 best-effort 보호를 주는 값입니다.
- **memory.swap.max** — swap 한도.

```bash
# 현재 사용량
$ cat /sys/fs/cgroup/myapp/memory.current
3500000000

$ cat /sys/fs/cgroup/myapp/memory.stat | head
anon 2500000000
file 1000000000
kernel_stack 1048576
pagetables 524288
...
```

컨테이너 runtime은 cgroup을 사용합니다. Kubernetes memory limit은 보통 해당 컨테이너 cgroup의 memory limit으로 전달되며, 정확한 적용값은 노드의 cgroup 버전과 runtime 설정에서 확인합니다.

## OOM 회피 — graceful degradation

OOM 직전 회복을 보장하는 패턴은 없습니다. `getrusage(RUSAGE_SELF).ru_maxrss`는 현재 RSS가 아니라 최대 RSS이며 플랫폼별 단위도 다릅니다. 이를 현재 pressure 센서처럼 쓰지 말고 PSI/cgroup 지표를 사용하며, 아래의 임계값·복구 동작은 서비스별 검토가 필요한 의사코드입니다.

애플리케이션이 소유한 캐시를 줄일지는 서비스의 자체 pressure 정책으로 결정합니다. `malloc_trim()`은 glibc allocator를 사용할 때만 후보이며, 호출 자체가 RSS 감소를 보장하지 않습니다.

또는 *PSI* (Pressure Stall Information):

```bash
$ cat /proc/pressure/memory
some avg10=0.50 avg60=0.30 avg300=0.10 total=1234567
full avg10=0.10 avg60=0.05 avg300=0.02 total=234567
```

- `some` — *일부* 프로세스가 메모리 대기.
- `full` — 해당 PSI 집계 범위에서 실행 중인 모든 비-idle 작업이 자원 압력으로 지연.
- 임계값 등록 → poll/epoll 알림.

```c
int fd = open("/proc/pressure/memory", O_RDWR | O_NONBLOCK);
write(fd, "some 150000 1000000", 19);  // 1초 중 150ms 이상 stall이면 알림
// poll(...)으로 대기
```

systemd-oomd는 PSI와 cgroup 상태를 정책에 따라 사용해 cgroup을 종료할 수 있습니다. `memory.swap.max`를 자동으로 늘리는 기능이라고 설명하지 않습니다.

## 자동 dump 트리거

```c
// 메모리 폭주 의심 시 자동으로 jemalloc dump
void *monitor_thread(void *arg) {
    long last_rss = 0;
    while (1) {
        sleep(60);
        long rss = get_rss();
        if (last_rss > 0 && rss > last_rss * 1.5) {
            // 50% 급증 → dump
            mallctl("prof.dump", NULL, NULL, NULL, 0);
            log_info("auto-dumped at RSS=%ld", rss);
        }
        last_rss = rss;
    }
}
```

이 예시는 직전 1분보다 RSS가 50% 늘어난 경우만 포착합니다. 느린 누수, baseline 설정, allocator retention은 놓칠 수 있으므로 모든 누수를 자동 포착하지 않습니다.

## 로그 통합 — Prometheus + Grafana

```c
// /metrics endpoint
http_handler("/metrics", [](){
    struct mallinfo2 mi = mallinfo2();
    fprintf(out, "myapp_heap_used %zu\n", mi.uordblks);
    fprintf(out, "myapp_heap_free %zu\n", mi.fordblks);
    fprintf(out, "myapp_heap_arena %zu\n", mi.arena);
});
```

Prometheus가 polling. Grafana에서 *RSS, heap_used, heap_free*를 함께 그래프 → fragmentation 시각화.

## Java/JVM 특수 — JFR / heap dump

JVM은 자체 heap profiler.

```bash
# JFR (Java Flight Recorder)
$ jcmd $PID JFR.start filename=/tmp/leak.jfr duration=60s

# heap dump
$ jmap -dump:format=b,file=/tmp/heap.hprof $PID

# 분석
$ eclipse-mat /tmp/heap.hprof
```

native 부분은 위 도구로, *Java heap*은 JVM 도구로 — 두 길로 분리.

## Python 특수

```python
import tracemalloc
tracemalloc.start(25)

# 의심 작업
process()

snapshot = tracemalloc.take_snapshot()
top = snapshot.statistics('lineno')
for stat in top[:10]:
    print(stat)
```

[Python Debugging Ch 5](/blog/tools/debugging/python/chapter05-faulthandler-tracemalloc)에서 자세히. 운영 Django/Flask 서비스에 적용 가능.

## Go 특수

```go
import _ "net/http/pprof"

go http.ListenAndServe(":6060", nil)

// 외부에서
$ go tool pprof http://localhost:6060/debug/pprof/heap
```

Go는 GC. 누수는 *goroutine leak* 또는 *map에 무한 key* 형태가 흔함.

## 시리즈 정리

5장으로 *메모리 진단 전체*.

- **Ch 1** 메모리 회계 — VSS/RSS/PSS, /proc/[pid]/smaps.
- **Ch 2** heaptrack — 가벼운 heap profiler.
- **Ch 3** jemalloc/tcmalloc + pprof.
- **Ch 4** glibc 자체 도구 — mtrace/mcheck/MALLOC_CHECK_.
- **Ch 5** (이 장) 운영 누수 진단 — cgroup, PSI, 자동 dump.

도구 선택 흐름:
1. *개발* — ASan + Valgrind Memcheck.
2. *스테이징* — heaptrack 또는 jemalloc prof.
3. *운영* — jemalloc 상시 prof + smaps_rollup 모니터링.
4. *비상* — eBPF memleak + drgn.

## 정리

- 누수 *확인* → /proc/[pid]/smaps_rollup의 PSS 추세.
- 누수 *영역* → smaps의 Private_Dirty 정렬.
- 누수 *콜스택* → jemalloc prof (상시) 또는 BCC memleak.
- cgroup memory.max로 보호 + PSI로 graceful degradation.
- 자동 dump 조건은 누락 사례를 만들 수 있으므로 별도 관측과 재현 절차를 유지합니다.
- Java/Python/Go는 자체 도구 병용.

## 관련 항목 (시리즈 전체)

- [Ch 1: 메모리 회계](/blog/tools/debugging/memory/chapter01-memory-accounting)
- [Ch 2: heaptrack](/blog/tools/debugging/memory/chapter02-heaptrack)
- [Ch 3: jemalloc / tcmalloc](/blog/tools/debugging/memory/chapter03-jemalloc-tcmalloc)
- [Ch 4: glibc 도구](/blog/tools/debugging/memory/chapter04-glibc-tools)

## 외부 자료

- [Sanitizers — ASan](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)
- [Valgrind — Memcheck](/blog/tools/debugging/valgrind/chapter02-memcheck)
- [Kernel Debugging Ch 4: eBPF](/blog/tools/debugging/kernel/chapter04-ebpf-kernel)
- [`Documentation/admin-guide/cgroup-v2.rst`](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html)
- [PSI 공식 문서](https://www.kernel.org/doc/html/latest/accounting/psi.html)
- [systemd-oomd](https://www.freedesktop.org/software/systemd/man/systemd-oomd.html)
- [Brendan Gregg — Memory leak flame graph](https://www.brendangregg.com/FlameGraphs/memoryflamegraphs.html)
- [Linux PSI — pressure triggers](https://docs.kernel.org/accounting/psi.html)
- [Linux cgroup v2 memory controller](https://docs.kernel.org/admin-guide/cgroup-v2.html#memory)
- [systemd-oomd](https://www.freedesktop.org/software/systemd/man/latest/systemd-oomd.service.html)
