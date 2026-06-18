---
title: "eBPF·bpftrace로 커널 디버깅 — 동적 관측의 신세대"
date: 2026-05-25T09:04:00
description: "kprobe/uprobe/tracepoint 위에 표현력 있는 trace 언어. bpftrace 원-라이너부터 BCC까지."
tags: [kernel, ebpf, bpftrace, kprobe, bcc]
series: "Kernel Debugging"
seriesOrder: 4
draft: false
---

eBPF(extended Berkeley Packet Filter)는 *커널 안에서 안전하게 실행되는 바이트코드 VM*입니다. 원래 패킷 필터링용이었지만 지금은 *trace·observability·security*의 표준 인프라. bpftrace는 그 위의 *고급 언어*로, ftrace의 모든 기능에 *표현력*과 *집계 능력*을 더합니다.

:::tldr
`bpftrace -e 'kprobe:do_sys_open { printf("%s opens %s\n", comm, str(arg1)); }'` — 한 줄로 *시스템 전체의 file open* 추적.
:::

## eBPF 모델

![eBPF execution pipeline — 사용자 코드가 BPF 바이트코드로 컴파일된 뒤 커널 verifier·JIT를 거쳐 hook에서 실행되고 결과가 perf buffer로 돌아온다](/images/blog/debugging/kernel/diagrams/ch04-ebpf-pipeline.svg)

핵심: **verifier가 모든 프로그램을 검증** → 검증 통과 = *커널 crash 불가*. 운영 환경에 부담 없이.

## bpftrace 설치

```bash
# Fedora
$ sudo dnf install bpftrace

# Ubuntu
$ sudo apt install bpftrace

# Alpine
$ apk add bpftrace
```

```bash
$ sudo bpftrace --version
v0.20.0
```

## 첫 원-라이너

```bash
# 모든 file open 추적
$ sudo bpftrace -e '
  tracepoint:syscalls:sys_enter_openat {
    printf("%s opens %s\n", comm, str(args->filename));
  }
'
bash opens /etc/passwd
sshd opens /var/log/auth.log
...
```

`-e` 뒤가 *프로그램*. probe + action 형태.

## Probe 종류

```bash
# Tracepoint (정적)
tracepoint:syscalls:sys_enter_openat

# kprobe (동적, 함수 진입)
kprobe:do_sys_open

# kretprobe (함수 반환)
kretprobe:do_sys_open

# uprobe (user-space 함수)
uprobe:/usr/bin/bash:readline

# uretprobe
uretprobe:/usr/bin/bash:readline

# USDT (user-space static)
usdt:/usr/sbin/mysqld:mysql:query__start

# perf software event
software:context-switches:1000      # 1000번에 한 번 샘플
software:page-faults:100
software:cpu-clock:1000000

# perf hardware event
hardware:cpu-cycles:100000
hardware:cache-misses:10000

# interval / profile
interval:s:1               # 1초마다
profile:hz:99              # 99Hz 모든 CPU
```

## 변수와 컨텍스트

```bash
# bpftrace에서 사용 가능한 builtin 변수
pid                # 현재 PID
tid                # 현재 TID
uid                # 현재 UID
comm               # 프로세스 이름
nsecs              # 현재 시각 (ns)
cpu                # 현재 CPU
elapsed            # 프로그램 시작 후 ns
args               # tracepoint 인자 (구조체)
arg0, arg1, ...    # kprobe 인자 (register-based)
retval             # kretprobe 반환값
```

## 출력 함수

```bash
printf("...")           # 즉시 출력
print(@hist)           # 히스토그램 출력
time("%H:%M:%S\n")     # 타임스탬프
str(ptr)               # char* → string
str(ptr, len)          # 길이 제한
ksym(addr)             # kernel symbol → name
usym(addr)             # user symbol → name
exit()                 # 프로그램 종료
```

## Map — 집계

```bash
# 누적 카운트
$ sudo bpftrace -e '
  tracepoint:syscalls:sys_enter_openat {
    @opens[comm] = count();
  }
'
^C

@opens[ssh]: 3
@opens[bash]: 42
@opens[systemd]: 156
```

종료 (Ctrl-C) 시 자동 출력. `@map[key]`로 정의.

## 히스토그램

```bash
# read syscall 지속시간 히스토그램
$ sudo bpftrace -e '
  tracepoint:syscalls:sys_enter_read {
    @start[tid] = nsecs;
  }
  tracepoint:syscalls:sys_exit_read /@start[tid]/ {
    @dur = hist(nsecs - @start[tid]);
    delete(@start[tid]);
  }
'
^C

@dur:
[1K, 2K)         123 |@@                                          |
[2K, 4K)         456 |@@@@@@@                                     |
[4K, 8K)        2345 |@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@   |
[8K, 16K)        789 |@@@@@@@@@@@@                                |
[16K, 32K)        12 |                                            |
```

*log2 히스토그램*. `lhist(val, min, max, step)`로 선형 히스토그램.

## 자주 쓰는 한 줄들

```bash
# 새 프로세스
$ sudo bpftrace -e '
  tracepoint:syscalls:sys_enter_execve {
    printf("%s -> %s\n", comm, str(args->filename));
  }
'

# 죽은 프로세스
$ sudo bpftrace -e '
  tracepoint:syscalls:sys_enter_exit_group {
    printf("%-16s pid=%d exit=%d\n", comm, pid, args->error_code);
  }
'

# disk I/O 크기
$ sudo bpftrace -e '
  kprobe:vfs_read {
    @reads[comm] = sum(arg2);
  }
'

# TCP connect 추적
$ sudo bpftrace -e '
  kprobe:tcp_connect {
    printf("%s connect\n", comm);
  }
'

# slow syscall (10ms+)
$ sudo bpftrace -e '
  tracepoint:raw_syscalls:sys_enter { @s[tid] = nsecs; }
  tracepoint:raw_syscalls:sys_exit /@s[tid]/ {
    $d = nsecs - @s[tid];
    if ($d > 10*1000*1000) {
      printf("%s slow syscall: %d ms\n", comm, $d / 1000000);
    }
    delete(@s[tid]);
  }
'

# 콜스택 샘플 (CPU profiler)
$ sudo bpftrace -e '
  profile:hz:99 {
    @[kstack] = count();
  }
'
```

## kstack / ustack — 콜스택 출력

```bash
# kernel stack
$ sudo bpftrace -e '
  kprobe:vfs_read {
    @[kstack] = count();
  }
'

@[
    vfs_read+1
    ksys_read+103
    __x64_sys_read+22
    do_syscall_64+90
    entry_SYSCALL_64_after_hwframe+99
]: 1234
```

`ustack`은 user-space. `ustack(perf)`는 perf-style.

## BCC — Python으로 더 복잡한 프로그램

[BCC](https://github.com/iovisor/bcc) (BPF Compiler Collection) — eBPF C 프로그램 + Python frontend. bpftrace보다 *훨씬 복잡한 로직* 가능.

```bash
$ sudo dnf install bcc-tools
$ ls /usr/share/bcc/tools/ | head -10
argdist  bashreadline  biolatency  biosnoop  biotop  bitesize  capable
cpudist  cpuunclaimed  dbslower  dbstat  deadlock  ...
```

수십 개의 *완성된 도구*. 직접 짤 필요 없음.

```bash
# block device I/O latency
$ sudo /usr/share/bcc/tools/biolatency 1 10
$ sudo /usr/share/bcc/tools/biosnoop          # 각 I/O 추적

# CPU profiling
$ sudo /usr/share/bcc/tools/profile -F 99 30  # 99Hz 30초

# file open
$ sudo /usr/share/bcc/tools/opensnoop

# TCP 추적
$ sudo /usr/share/bcc/tools/tcpconnect
$ sudo /usr/share/bcc/tools/tcpaccept
$ sudo /usr/share/bcc/tools/tcpretrans
$ sudo /usr/share/bcc/tools/tcplife

# 메모리 누수
$ sudo /usr/share/bcc/tools/memleak -p <pid>
```

[Brendan Gregg의 BCC 사례](https://www.brendangregg.com/ebpf.html)가 표준 참고.

## 자체 BCC 도구

```python
#!/usr/bin/env python3
from bcc import BPF

prog = """
#include <uapi/linux/ptrace.h>

BPF_HASH(start, u32);
BPF_HISTOGRAM(dist);

int trace_enter(struct pt_regs *ctx) {
    u32 pid = bpf_get_current_pid_tgid();
    u64 ts = bpf_ktime_get_ns();
    start.update(&pid, &ts);
    return 0;
}

int trace_return(struct pt_regs *ctx) {
    u32 pid = bpf_get_current_pid_tgid();
    u64 *tsp = start.lookup(&pid);
    if (tsp) {
        u64 delta = bpf_ktime_get_ns() - *tsp;
        dist.increment(bpf_log2l(delta / 1000));
        start.delete(&pid);
    }
    return 0;
}
"""

b = BPF(text=prog)
b.attach_kprobe(event="vfs_read", fn_name="trace_enter")
b.attach_kretprobe(event="vfs_read", fn_name="trace_return")

print("Tracing vfs_read... Ctrl-C to end")
try:
    b.trace_print()
except KeyboardInterrupt:
    pass

print("\nvfs_read latency (us):")
b["dist"].print_log2_hist("us")
```

bpftrace 한 줄로 가능하지만 *복잡한 자료구조·로직*은 BCC.

## libbpf-tools — 새 표준

BCC의 후속 — *BPF CO-RE* (Compile Once Run Everywhere). 컴파일 시 vmlinux.h 사용 → 한 binary가 *여러 커널 버전*에서 동작.

```bash
$ git clone https://github.com/iovisor/bcc.git
$ cd bcc/libbpf-tools
$ make
$ ./opensnoop      # BCC 버전과 호환되지만 훨씬 가벼움
```

대규모 운영에선 libbpf-tools가 *표준*. BCC는 *Python 의존*이라 매번 컴파일 → CO-RE는 정적 바이너리.

## eBPF + 커널 추적의 강력함

### 사례 1 — 누가 어떤 파일에 쓰나

```bash
$ sudo bpftrace -e '
  tracepoint:syscalls:sys_enter_write {
    @bytes[comm, args->fd] = sum(args->count);
  }
' | head
```

### 사례 2 — page fault 콜스택

```bash
$ sudo bpftrace -e '
  software:page-faults:1 /comm == "myprog"/ {
    @[ustack] = count();
  }
'
```

### 사례 3 — 특정 함수의 인자 분포

```bash
$ sudo bpftrace -e '
  kprobe:__kmalloc {
    @sizes = hist(arg0);
  }
'
```

대부분의 *프로덕션 진단*에 충분.

## 안전성 — Verifier

eBPF의 핵심 차별점. 모든 프로그램이 *커널에 로드되기 전 정적 검증*.

검증 내용:
- 무한 루프 금지 (bounded loops만, 또는 BPF_LOOP).
- 메모리 접근이 *항상 valid pointer*.
- 스택 사용량 ≤ 512 bytes.
- 명령 수 ≤ 1M (kernel 5.2+).
- helper 함수 인자 타입 일치.

검증 실패 시 *load 거부*. 즉 *crash가 불가능*.

```bash
$ sudo bpftrace -e 'kprobe:do_sys_open { while (1) { } }'
ERROR: Unbounded loop detected
```

## 부하

eBPF 자체 비용은 *매우 작음* — 단순 카운터는 *수십 ns*. ftrace보다 *살짝 무겁지만* expressive. 일반 운영에 *상시* 켜 둘 수도 있음.

```bash
# 시스템 전체 syscall 카운트 (지속 실행 가능)
$ sudo bpftrace -e '
  tracepoint:raw_syscalls:sys_enter {
    @[comm, args->id] = count();
  }
  interval:s:10 {
    print(@);
    clear(@);
  }
'
```

## 자주 만나는 문제

| 증상 | 원인 / 해법 |
|------|-------------|
| `Permission denied` | root 필요. 또는 `CAP_BPF`, `CAP_PERFMON` |
| `Verifier denied` | 메모리 안전 위반. 코드 단순화 |
| 함수 없음 | inline 되었거나 다른 이름. `bpftrace -l 'kprobe:*pattern*'`로 검색 |
| `Unable to attach probe` | 모듈 미로드 또는 권한 |
| 결과 손실 (`LOST x events`) | perf buffer 크기 `-B` 늘리기 |
| `BPF program load failed` | 커널 버전 낮음. libbpf-tools CO-RE 권장 |

## 정리

- eBPF = 커널 안 안전한 바이트코드 VM. trace·observability·security.
- bpftrace가 *고급 언어* — ftrace보다 표현력 ↑.
- probe: tracepoint / kprobe / uprobe / USDT / interval.
- map으로 *집계*, hist로 *히스토그램*.
- BCC = Python+C frontend, libbpf-tools = CO-RE static.
- verifier가 crash 불가능 보장.
- 일반 운영에 *상시* 켜 둘 수 있는 정도의 부하.

## 다음 장 예고

Ch 5 — kdb / kgdb. *실시간 인터랙티브* 커널 디버깅 (별 머신 또는 시리얼 필요).

## 관련 항목

- [Ch 3: ftrace + tracepoints](/blog/tools/debugging/kernel/chapter03-ftrace-tracepoints)
- [Ch 5: kdb / kgdb](/blog/tools/debugging/kernel/chapter05-kdb-kgdb)
- strace-tracing 시리즈
- [bpftrace tutorial](https://github.com/bpftrace/bpftrace/blob/master/docs/tutorial_one_liners.md)
- [Brendan Gregg — BPF Performance Tools](https://www.brendangregg.com/bpf-performance-tools-book.html)
- [BCC tools](https://github.com/iovisor/bcc/tree/master/tools)
- [libbpf-tools](https://github.com/iovisor/bcc/tree/master/libbpf-tools)
