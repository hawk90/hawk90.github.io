---
title: "eBPF·bpftrace로 커널 디버깅 — 동적 관측의 신세대"
slug: "tools/debugging/kernel/chapter04-ebpf-kernel"
date: 2026-05-25T09:04:00
description: "kprobe/uprobe/tracepoint 위에 표현력 있는 trace 언어. bpftrace 원-라이너부터 BCC까지."
tags: [kernel, ebpf, bpftrace, kprobe, bcc]
series: "Kernel Debugging"
seriesOrder: 4
draft: false
topics: ["tools", "tools/debugging"]
---

eBPF(extended Berkeley Packet Filter)는 커널 기능에 연결되는 프로그램 형식입니다. 원래 패킷 필터링에서 시작해 tracing·observability·security 등 여러 용도로 쓰입니다. bpftrace는 이를 위한 상위 수준 tracing 언어이며, 지원 probe·기능은 커널과 bpftrace 버전에 따라 달라집니다.

:::tldr
`tracepoint:syscalls:sys_enter_openat { printf("%s opens %s\\n", comm, str(args.filename)); }` — 해당 tracepoint가 있는 시스템에서 openat 경로를 관찰하는 예입니다.
:::

## eBPF 모델

![eBPF execution pipeline — 사용자 코드가 BPF 바이트코드로 컴파일된 뒤 커널 verifier·JIT를 거쳐 hook에서 실행되고 결과가 perf buffer로 돌아온다](/images/blog/debugging/kernel/diagrams/ch04-ebpf-pipeline.svg)

핵심: verifier는 허용된 메모리 접근·제어 흐름 등 안전성 조건을 검사해 부적합한 프로그램을 거부합니다. 검증 통과가 커널·드라이버 결함, 잘못된 관측 로직, 과도한 부하나 정보 노출까지 막는다는 뜻은 아니므로 운영 영향과 권한을 함께 검토합니다.

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
    printf("%s opens %s\n", comm, str(args.filename));
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
arg0, arg1, ...    # kprobe 인자 (0부터 시작; 함수 서명·아키텍처에 의존)
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
    printf("%s -> %s\n", comm, str(args.filename));
  }
'

# 죽은 프로세스
$ sudo bpftrace -e '
  tracepoint:syscalls:sys_enter_exit_group {
    printf("%-16s pid=%d exit=%d\n", comm, pid, args.error_code);
  }
'

# vfs_read 요청 크기 집계 (블록 장치의 실제 disk I/O 바이트가 아님)
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
    u32 tid = (u32)bpf_get_current_pid_tgid();
    u64 ts = bpf_ktime_get_ns();
    start.update(&tid, &ts);
    return 0;
}

int trace_return(struct pt_regs *ctx) {
    u32 tid = (u32)bpf_get_current_pid_tgid();
    u64 *tsp = start.lookup(&tid);
    if (tsp) {
        u64 delta = bpf_ktime_get_ns() - *tsp;
        dist.increment(bpf_log2l(delta / 1000));
        start.delete(&tid);
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

## libbpf 기반 도구 — 다른 구현 선택지

libbpf 기반 도구는 *BPF CO-RE* (Compile Once Run Everywhere)와 BTF relocation을 이용해 여러 호환 커널에서 실행되도록 빌드할 수 있습니다. 실제 호환성은 사용하는 커널 기능·BTF 제공 여부와 도구 구현에 달려 있습니다. BCC와는 서로 다른 개발 방식이며 일대일 후속 관계는 아닙니다.

```bash
$ git clone https://github.com/iovisor/bcc.git
$ cd bcc/libbpf-tools
$ make
$ ./opensnoop      # BCC 버전과 호환되지만 훨씬 가벼움
```

CO-RE 도구도 배포·권한·커널 호환성 검증이 필요합니다. CO-RE가 자동으로 정적 바이너리를 만들거나 모든 커널에서 동작하게 보장하지는 않습니다.

## eBPF + 커널 추적의 강력함

### 사례 1 — 누가 어떤 파일에 쓰나

```bash
$ sudo bpftrace -e '
  tracepoint:syscalls:sys_enter_write {
    @bytes[comm, args.fd] = sum(args.count);
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

eBPF 프로그램은 커널에 로드될 때 verifier 검사를 받습니다. 검사 범위와 허용 기능은 커널 버전, 프로그램 유형, 권한에 따라 다릅니다.

검증 내용:
- 실행을 제한할 수 없는 제어 흐름은 거부됩니다. 지원 커널은 제한된 반복을 허용할 수 있습니다.
- 메모리 접근은 verifier가 추적 가능한 포인터·범위 규칙을 따라야 합니다; 이는 모든 실행 오류가 불가능하다는 뜻은 아닙니다.
- 스택 사용량 ≤ 512 bytes.
- 명령 수·검증 복잡도 한도는 커널 버전과 프로그램 유형에 따라 달라집니다.
- helper 함수 인자 타입 일치.

검증 실패 시 load가 거부됩니다. 이 검사는 임의의 잘못된 프로그램 실행을 제한하지만 시스템 전체의 crash 부재를 보장하지는 않습니다.

```bash
$ sudo bpftrace -e 'kprobe:do_sys_open { while (1) { } }'
이 예시의 진단 문구는 bpftrace 버전에 따라 다르며, 이를 특정 커널 verifier의 실행 결과로 간주하면 안 됩니다. 지원되지 않는 무한 반복이 거부되는 동작을 보이려면 대상 환경에서 별도로 실행해야 합니다.
```

## 부하

eBPF 비용은 probe 빈도, 프로그램 복잡도, map·출력 방식, 커널과 하드웨어에 따라 달라집니다. 단일 비용 수치 대신 대상 workload에서 손실·지연·CPU 사용량을 측정하고 필요한 범위에서만 활성화합니다.

```bash
# 시스템 전체 syscall 카운트 (지속 실행 가능)
$ sudo bpftrace -e '
  tracepoint:raw_syscalls:sys_enter {
    @[comm, args.id] = count();
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
| `Permission denied` | 권한·capability뿐 아니라 sysctl, LSM, lockdown, 커널 설정 확인 |
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
- BCC와 libbpf 기반 CO-RE 도구는 서로 다른 구현 선택지입니다.
- verifier는 허용되지 않은 프로그램을 거부하지만 시스템 전체의 crash 부재를 보장하지 않습니다.
- 운영 적용 전 workload에서 비용·손실·권한 범위를 검증합니다.

## 다음 장 예고

Ch 5 — kdb / kgdb. *실시간 인터랙티브* 커널 디버깅 (별 머신 또는 시리얼 필요).

## 관련 항목

- [Ch 3: ftrace + tracepoints](/blog/tools/debugging/kernel/chapter03-ftrace-tracepoints)
- [Ch 5: kdb / kgdb](/blog/tools/debugging/kernel/chapter05-kdb-kgdb)
- [Performance Engineering: eBPF 동적 트레이싱](/blog/embedded/performance-engineering/part5-04-ebpf) — probe 종류별 overhead 비교와 latency spike 진단 시나리오가 있는 성능 쪽
- strace-tracing 시리즈
- [bpftrace tutorial](https://github.com/bpftrace/bpftrace/blob/master/docs/tutorial_one_liners.md)
- [Brendan Gregg — BPF Performance Tools](https://www.brendangregg.com/bpf-performance-tools-book.html)
- [BCC tools](https://github.com/iovisor/bcc/tree/master/tools)
- [libbpf-tools](https://github.com/iovisor/bcc/tree/master/libbpf-tools)
