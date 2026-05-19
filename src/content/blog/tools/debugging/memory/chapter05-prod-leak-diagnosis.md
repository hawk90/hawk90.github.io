---
title: "Ch 5: 운영 메모리 누수 진단"
date: 2026-05-17T05:00:00
description: "장기 실행 서비스의 누수 추적. /proc 모니터링, cgroup memory.max, OOM 회피."
tags: [memory, leak, production, cgroup, oom]
series: "Memory Diagnostics"
seriesOrder: 5
draft: false
---

이 시리즈의 마지막 장 — *재현 환경 없는* 운영의 누수 진단. ASan은 빌드 다시 필요, Valgrind는 너무 느림, heaptrack은 trace 너무 큼. 그래서 *프로덕션 친화 도구 셋*이 필요합니다.

:::tldr
`/proc/[pid]/smaps_rollup` 폴링 + jemalloc 상시 profiler + cgroup `memory.max`로 보호 + drgn으로 *라이브 분석*.
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

추세:
- *우상향 무한* → 누수.
- *우상향 후 수렴* → 캐시 (정상).
- *주기적 sawtooth* → GC가 있는 언어 (Go/Java) 또는 explicit `free`.
- *플랫* → 누수 없음.

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

RssAnon만 폭주 → 일반 heap 또는 mmap 누수. RssFile 폭주 → 파일 매핑 누수 (Drogon 같은 framework의 *log file mmap* 등).

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

부하: < 5%. 운영에 *상시 활성* 가능.

자동 dump 트리거 (SIGUSR2 등):

```c
#include <signal.h>
#include <jemalloc/jemalloc.h>

void dump_handler(int sig) {
    mallctl("prof.dump", NULL, NULL, NULL, 0);
}

int main() {
    signal(SIGUSR2, dump_handler);
    // ...
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

[BCC tools](/blog/tools/debugging/kernel/chapter04-ebpf-kernel#bcc-—-python으로-더-복잡한-프로그램)의 `memleak`.

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

- 5초 대기 → *그 5초 동안* alloc + 추적 안 된 free의 *누적 누수*.
- 운영에 부담 적음 (eBPF verifier 통과).

### 옵션 C — heaptrack attach

```bash
$ heaptrack -p $PID
[10분 후]
^C
$ heaptrack_gui heaptrack.myprog.*.zst
```

`heaptrack-gui`의 *Consumed* 탭에서 *시간별 메모리 그래프* + 콜스택. 한 화면.

부하: 2-3x. 운영 영향 있으나 *짧은 샘플*은 허용.

### 옵션 D — drgn으로 라이브 분석

```bash
$ sudo drgn -p $PID
>>> from drgn.helpers.linux import *

# vmalloc 영역
>>> for addr, info in vmalloc_areas(prog):
...     print(hex(addr), info.size)

# slab 통계 (커널)
>>> for slab in for_each_slab_cache(prog):
...     print(slab.name.string_(), slab.size)
```

drgn은 *user-space 프로세스의 동적 정보*에도 활용 가능 (커널 측에서 본 정보 + procfs).

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
print('LEAK' if slope > 1024 else 'OK')
"
```

CI에 통합 — 매 배포 시 *짧은 load test* + slope 검증으로 회귀 차단.

## cgroup memory.max — 보호

운영 환경에서 *프로세스 단일 메모리 사용 제한*. OOM이 *해당 cgroup* 안에서만 일어남.

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

- **memory.max** — *hard limit*. 초과 시 OOM killer.
- **memory.high** — *soft limit*. 초과 시 throttle (reclaim 가속).
- **memory.low** — *minimum*. OOM 시 마지막.
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

container 환경(Docker/K8s)은 이미 cgroup 사용. K8s `resources.limits.memory`가 *memory.max*에 매핑.

## OOM 회피 — graceful degradation

OOM 직전에 *서비스가 알아채고* 캐시 비우기.

```c
// 주기적 RSS 체크
#include <sys/resource.h>

void check_memory() {
    struct rusage ru;
    getrusage(RUSAGE_SELF, &ru);
    long rss_kb = ru.ru_maxrss;
    
    if (rss_kb > 3 * 1024 * 1024) {  // 3GB 이상
        log_warning("memory pressure, clearing caches");
        clear_caches();
        malloc_trim(0);
    }
}
```

또는 *PSI* (Pressure Stall Information):

```bash
$ cat /proc/pressure/memory
some avg10=0.50 avg60=0.30 avg300=0.10 total=1234567
full avg10=0.10 avg60=0.05 avg300=0.02 total=234567
```

- `some` — *일부* 프로세스가 메모리 대기.
- `full` — *모든* 프로세스가 대기.
- 임계값 등록 → poll/epoll 알림.

```c
int fd = open("/proc/pressure/memory", O_RDWR | O_NONBLOCK);
write(fd, "some 150000 1000000", 19);  // 1초 중 150ms 이상 stall이면 알림
// poll(...)으로 대기
```

systemd-OOMD가 이걸 활용 — *완전 OOM 전에* memory.swap.max 늘리거나 worst 프로세스 종료.

## 자동 dump 트리거

```c
// 메모리 폭주 의심 시 자동으로 jemalloc dump
void *monitor_thread(void *arg) {
    long last_rss = 0;
    while (1) {
        sleep(60);
        long rss = get_rss();
        if (rss > last_rss * 1.5) {
            // 50% 급증 → dump
            mallctl("prof.dump", NULL, NULL, NULL, 0);
            log_info("auto-dumped at RSS=%ld", rss);
        }
        last_rss = rss;
    }
}
```

대규모 서비스에서 *모든 누수가 자동 캡처* → 사후 분석.

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
- 자동 dump로 모든 사고 캡처.
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
