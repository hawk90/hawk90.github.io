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

eBPF(extended Berkeley Packet Filter)는 커널 안의 hook에 붙여 실행하는 작은 프로그램 형식입니다. 패킷 필터에서 출발했지만 지금은 tracing·관측·보안에 두루 쓰입니다. [Ch 3](/blog/tools/debugging/kernel/chapter03-ftrace-tracepoints)의 ftrace가 "기록하고 나중에 읽기"라면, eBPF는 기록하는 그 자리에서 거르고 세고 히스토그램을 만듭니다. 이 장은 같은 Debian 13.7 arm64 게스트(커널 `6.12.116+deb13-arm64`)에서 bpftrace v0.23.2, BCC 0.31.0(`bpfcc-tools`), libbpf-tools 0.31.0으로 실행한 결과입니다.

:::tldr
bpftrace 한 줄은 `probe /filter/ { action }`입니다. map(`@`)으로 집계하고 `hist()`로 분포를 봅니다. 커널은 로드 전에 verifier로 프로그램을 검사하고, 무한 루프 같은 것은 그 단계에서 거부합니다.
:::

## eBPF 모델

![eBPF execution pipeline — 사용자 코드가 BPF 바이트코드로 컴파일된 뒤 커널 verifier·JIT를 거쳐 hook에서 실행되고 결과가 perf buffer로 돌아온다](/images/blog/debugging/kernel/diagrams/ch04-ebpf-pipeline.svg)

bpftrace나 BCC가 만든 바이트코드는 `bpf(2)`로 커널에 들어가고, verifier가 통과시킨 것만 JIT 컴파일돼 hook에 붙습니다. 이 커널은 `CONFIG_BPF_SYSCALL=y`, `CONFIG_BPF_JIT=y`, `CONFIG_DEBUG_INFO_BTF=y`입니다. BTF는 커널 타입 정보를 담은 섹션이라 `-dbg` 패키지(약 6.3 GiB, Ch 1) 없이도 구조체 필드를 읽게 해 줍니다. 이 커널에서는 5.6 MB였습니다.

```text
$ ls -la /sys/kernel/btf/vmlinux
-r--r--r-- 1 root root 5638097 Nov 16 09:37 /sys/kernel/btf/vmlinux
```

verifier가 검사하는 것은 프로그램 자체의 안전성(경계 밖 메모리 접근, 끝나지 않는 루프 등)입니다. 프로그램이 너무 자주 불려서 생기는 부하나, 관측 로직이 틀려서 생기는 잘못된 결론은 막지 않습니다.

## bpftrace 설치

Debian 13에서는 패키지 하나입니다.

```text
# apt install bpftrace bpfcc-tools libbpf-tools
# bpftrace --version
bpftrace v0.23.2
```

root가 아니면 bpftrace는 시작하지 않습니다. 커널 쪽도 막혀 있습니다. 이 커널은 `CONFIG_BPF_UNPRIV_DEFAULT_OFF=y`라 `kernel.unprivileged_bpf_disabled`가 2이고, v6.12 `Documentation/admin-guide/sysctl/kernel.rst`(1593~1612행)에 따르면 이 값에서는 `CAP_SYS_ADMIN`이나 `CAP_BPF` 없이 `bpf()`를 부르면 `-EPERM`입니다.

```text
$ su nobody -s /bin/sh -c "bpftrace -e 'BEGIN { exit(); }'"
ERROR: bpftrace currently only supports running as the root user.
$ cat /proc/sys/kernel/unprivileged_bpf_disabled
2
```

## 첫 원-라이너

`openat(2)` tracepoint에 붙어 누가 어떤 파일을 여는지 찍습니다. 3초 뒤 `timeout`이 SIGINT를 보내 끝냅니다. 그 사이 다른 셸에서 `cat /etc/hostname`과 `ls /root`를 실행했습니다.

```text
# timeout -s INT 3 bpftrace -e 'tracepoint:syscalls:sys_enter_openat
    /comm == "cat" || comm == "ls"/ { printf("%s opens %s\n", comm, str(args.filename)); }'
Attaching 1 probe...
cat opens /etc/ld.so.cache
cat opens /lib/aarch64-linux-gnu/libc.so.6
cat opens 
cat opens /usr/share/locale/locale.alias
cat opens /usr/lib/locale/C.UTF-8/LC_IDENTIFICATION
...
cat opens /etc/hostname
ls opens /etc/ld.so.cache
ls opens /lib/aarch64-linux-gnu/libselinux.so.1
ls opens /lib/aarch64-linux-gnu/libcap.so.2
ls opens /lib/aarch64-linux-gnu/libc.so.6
ls opens /lib/aarch64-linux-gnu/libpcre2-8.so.0
ls opens /proc/filesystems
...
ls opens /root
```

`cat` 한 번이 locale 파일까지 31번 `openat`을 불렀고, 정작 `/etc/hostname`은 마지막이었습니다. 셋째 줄의 빈 이름도 출력 그대로 옮겼습니다. 이 실행에서는 원인을 따로 조사하지 않았습니다. `-e` 뒤가 프로그램이고, `/.../`가 필터, `{ }`가 action입니다. tracepoint 인자의 이름과 타입은 `-lv`로 미리 봅니다.

```text
# bpftrace -lv 'tracepoint:syscalls:sys_enter_openat'
tracepoint:syscalls:sys_enter_openat
    int __syscall_nr
    int dfd
    const char * filename
    int flags
    umode_t mode
```

## Probe 종류

이 게스트에서 쓸 수 있는 probe 수부터 셌습니다.

```text
# bpftrace -l 'kprobe:*' | wc -l
51582
# bpftrace -l 'tracepoint:*' | wc -l
1696
# bpftrace -l 'fentry:*' | wc -l
50363
```

| probe | 예 | 이 게스트에서 |
|-------|----|---------------|
| `tracepoint:` | `tracepoint:syscalls:sys_enter_openat` | 동작 |
| `kprobe:` / `kretprobe:` | `kprobe:vfs_read` | 동작 |
| `fentry:` / `fexit:` | `fentry:vfs_read` (BTF 기반) | 목록 50,363개 |
| `uprobe:` / `uretprobe:` | `uprobe:/usr/bin/bash:readline` | attach 성공 |
| `profile:` | `profile:hz:99` | 동작 |
| `interval:` | `interval:s:1` | 동작 |
| `software:` | `software:page-faults:100` | 동작 |
| `hardware:` | `hardware:cpu-cycles:1000000` | **실패** (`perf_event_open failed`) |

`hardware:` 실패는 이 VM에 PMU가 노출되지 않았기 때문입니다. 실기기나 PMU를 넘겨주는 하이퍼바이저에서는 다를 수 있으니 먼저 한 번 붙여 봅니다. `profile:hz:99`를 3초 걸면 CPU마다 정확히 같은 수가 나왔습니다.

```text
@[0]: 290
@[1]: 290
@[3]: 290
@[2]: 290
```

함수 이름은 커널 버전마다 바뀝니다. v6.12 `include/linux/slab.h`에서 `kmalloc()`은 `alloc_hooks(kmalloc_noprof(...))`로 정의되고(884행) 실제 함수는 `__kmalloc_noprof`(795행)입니다. 그래서 옛 자료의 `kprobe:__kmalloc`은 이 게스트에 없었습니다.

```text
# bpftrace -l 'kprobe:*kmalloc*' | head -8
kprobe:___kmalloc_large_node
kprobe:__kmalloc_cache_node_noprof
kprobe:__kmalloc_cache_noprof
kprobe:__kmalloc_large_node_noprof
kprobe:__kmalloc_large_noprof
kprobe:__kmalloc_node_noprof
kprobe:__kmalloc_node_track_caller_noprof
kprobe:__kmalloc_noprof
```

## 변수와 컨텍스트

builtin 변수는 bpftrace(8) 맨 페이지의 BUILTINS 표에 있습니다. 이 장에서 쓴 것만 추리면 다음과 같습니다.

| 변수 | 뜻 |
|------|----|
| `pid`, `tid`, `uid`, `comm`, `cpu` | 현재 task·CPU |
| `nsecs` | 현재 시각(ns) |
| `args` | tracepoint 인자 구조체 (`args.filename`) |
| `arg0`, `arg1`, … | kprobe 인자. 맨 페이지 표현으로 "CPU 레지스터에서 꺼내며, 레지스터로 넘어오는 개수는 아키텍처에 따름" |
| `retval` | kretprobe 반환값 |
| `kstack`, `ustack` | 커널·사용자 스택 |

## 출력 함수

| 함수 | 효과 |
|------|------|
| `printf(fmt, ...)` | 즉시 출력 |
| `str(ptr)` | `char *`를 문자열로 |
| `ksym(addr)` / `usym(addr)` | 주소를 심볼로 |
| `print(@m)` / `clear(@m)` / `delete(@m[k])` | map 출력·비우기·항목 삭제 |
| `count()` / `sum(n)` / `hist(n)` / `lhist(n, min, max, step)` | 집계 |
| `exit()` | 종료 |

## Map — 집계

`@이름[키] = count()`로 키별 개수를 셉니다. 프로그램이 끝날 때 map이 자동으로 출력됩니다. 3초 동안 다른 셸에서 `cat /etc/hostname`을 세 번 실행했습니다.

```text
# timeout -s INT 3 bpftrace -e 'tracepoint:syscalls:sys_enter_openat { @opens[comm] = count(); }'
Attaching 1 probe...

@opens[bash]: 3
@opens[systemd]: 6
@opens[cat]: 93
```

`cat` 세 번이 93번, 즉 한 번에 31번이라 앞 절의 줄 수와 맞습니다.

## 히스토그램

`read(2)`의 진입과 반환 시각 차이를 `hist()`에 넣으면 log2 분포가 나옵니다. `dd`로 4 KiB 읽기를 2,000번 했습니다.

```text
# timeout -s INT 3 bpftrace -e '
  tracepoint:syscalls:sys_enter_read /comm == "dd"/ { @start[tid] = nsecs; }
  tracepoint:syscalls:sys_exit_read /@start[tid]/ {
    @dur = hist(nsecs - @start[tid]);
    delete(@start[tid]);
  }'
Attaching 2 probes...

@dur:
[128, 256)           365 |@@@@@@@@@@@                                         |
[256, 512)          1628 |@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@|
[512, 1K)              4 |                                                    |
[1K, 2K)               1 |                                                    |
[2K, 4K)               1 |                                                    |
[4K, 8K)               1 |                                                    |
[8K, 16K)              0 |                                                    |
[16K, 32K)             1 |                                                    |
```

단위는 ns입니다. `/dev/zero` 읽기라 대부분 128~512 ns였고, 16~32 µs짜리 꼬리가 하나 있었습니다. 평균만 보면 사라지는 이런 꼬리를 보는 것이 히스토그램의 용도입니다. 같은 방식으로 `lhist()`는 선형 구간을 만듭니다. 1 KiB와 8 KiB 블록으로 100번씩 읽은 결과입니다.

```text
# timeout -s INT 3 bpftrace -e 'kprobe:vfs_read /comm == "dd"/ {
    @sz = lhist(arg2, 0, 16384, 4096); @reads[comm] = sum(arg2); }'
@reads[dd]: 923264
@sz:
[0, 4K)              102 |@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@|
[4K, 8K)               0 |                                                    |
[8K, 12K)            100 |@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@  |
```

`arg2`는 `vfs_read(file, buf, count, pos)`의 `count`, 즉 요청한 크기입니다. 실제 디스크 I/O 바이트가 아니라는 점에 주의합니다. `dd`는 200번 읽었는데 `[0, 4K)`가 102라서 2번이 더 들어왔습니다. 이 프로그램은 파일을 구분하지 않으므로 무엇을 읽은 것인지는 이 출력으로는 알 수 없습니다.

## 자주 쓰는 한 줄들

아래는 모두 이 게스트에서 실행해 출력이 나온 것입니다.

```text
# 프로세스 종료 코드 (다른 셸에서 sh -c 'exit 7')
# timeout -s INT 3 bpftrace -e 'tracepoint:syscalls:sys_enter_exit_group /comm == "sh"/ {
    printf("%-16s pid=%d exit=%d\n", comm, pid, args.error_code); }'
sh               pid=85061 exit=7

# TCP connect (다른 셸에서 curl http://deb.debian.org/)
# timeout -s INT 5 bpftrace -e 'kprobe:tcp_connect { printf("%s pid=%d tcp_connect\n", comm, pid); }'
curl pid=85056 tcp_connect
curl pid=85056 tcp_connect

# page fault를 100번에 한 번 샘플 (dd, python3로 메모리 할당)
# timeout -s INT 4 bpftrace -e 'software:page-faults:100 { @[comm] = count(); }'
@[dd]: 3
@[python3]: 18
```

`curl` 한 번에 `tcp_connect`가 두 번 찍혔습니다. 왜 두 번인지는 목적지 주소를 함께 찍어야 알 수 있는데, 이 실행에서는 주소를 기록하지 않았습니다.

## kstack / ustack — 콜스택 출력

`@[kstack] = count()`는 같은 커널 스택이 몇 번 나왔는지 셉니다. "이 함수가 어디서 불리나"를 가장 빨리 답하는 방법입니다.

```text
# timeout -s INT 3 bpftrace -e 'kprobe:vfs_read /comm == "dd"/ { @[kstack] = count(); }'
@[
        vfs_read+0
        __arm64_sys_read+36
        invoke_syscall+96
        el0_svc_common.constprop.0+72
        do_el0_svc+36
        el0_svc+56
        el0t_64_sync_handler+200
        el0t_64_sync+400
]: 201
```

200번 읽은 `dd`가 201번 같은 경로로 들어왔습니다. arm64에서는 `el0t_64_sync`(EL0에서 온 동기 예외)부터 `__arm64_sys_read`까지가 시스템 콜 진입 경로입니다. Ch 2의 WARN 덤프와 같은 순서입니다. bpftrace는 오프셋을 10진수로 찍으므로(`+36`), dmesg의 16진수(`+0x24`)와 비교할 때 변환합니다.

## BCC — Python으로 더 복잡한 프로그램

[BCC](https://github.com/iovisor/bcc)는 eBPF C 프로그램을 Python에서 컴파일해 붙이는 도구 모음입니다. Debian은 완성된 도구를 `/usr/sbin/<이름>-bpfcc`로 설치하고, 이 게스트에는 130개가 있었습니다.

```text
$ ls /usr/sbin/*-bpfcc | wc -l
130
$ ls /usr/sbin/*-bpfcc | head -12 | xargs -n1 basename | tr '\n' ' '
argdist-bpfcc bashreadline-bpfcc bindsnoop-bpfcc biolatency-bpfcc biolatpcts-bpfcc biopattern-bpfcc biosnoop-bpfcc biotop-bpfcc bitesize-bpfcc bpflist-bpfcc btrfsdist-bpfcc btrfsslower-bpfcc
```

`opensnoop`은 앞의 원-라이너를 도구로 만든 것입니다.

```text
# timeout -s INT 5 opensnoop-bpfcc -n cat
85305  cat                 3   0 PID    COMM               FD ERR PATH
/etc/ld.so.cache
85305  cat                 3   0 /lib/aarch64-linux-gnu/libc.so.6
85305  cat                -1   2 /usr/lib/locale/locale-archive
85305  cat                -1   2 /usr/share/locale/locale.alias
```

`ERR 2`(ENOENT)로 실패한 열기까지 보이는 것이 원-라이너보다 나은 점입니다. 첫 줄은 헤더(`PID COMM FD ERR PATH`)와 첫 이벤트가 한 줄에 섞여 나왔고, `stdbuf -oL`을 붙여도 같았습니다. 같은 도구의 libbpf판(아래)은 깨끗하게 나왔습니다.

## 자체 BCC 도구

`vfs_read`의 지연 시간 분포를 kprobe와 kretprobe로 재는 스크립트입니다. 3초 동안 재고 끝냅니다.

```python
#!/usr/bin/env python3
from bcc import BPF
import time

prog = r"""
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
print("Tracing vfs_read for 3 s...")
time.sleep(3)
print("\nvfs_read latency (us):")
b["dist"].print_log2_hist("us")
```

그 사이 `dd`가 4 KiB를 3,000번 읽었습니다.

```text
Tracing vfs_read for 3 s...

vfs_read latency (us):
     us                  : count     distribution
         0 -> 1          : 2998     |****************************************|
         2 -> 3          : 1        |                                        |
         4 -> 7          : 2        |                                        |
         8 -> 15         : 1        |                                        |
```

bpftrace로도 같은 것을 한 줄로 쓸 수 있습니다. BCC가 나은 경우는 결과를 Python에서 가공하거나, 여러 map을 묶어 자체 출력 형식을 만들 때입니다. 대신 BCC는 실행할 때 C 소스를 컴파일하므로, BCC `INSTALL.md`의 Debian·Ubuntu 설치 절차는 `bpfcc-tools`와 함께 `linux-headers-$(uname -r)`를 설치합니다. 이 게스트에도 설치해 두었습니다.

## libbpf 기반 도구 — 다른 구현 선택지

libbpf-tools는 같은 도구들을 C와 libbpf로 미리 컴파일한 것입니다. BTF와 CO-RE(Compile Once, Run Everywhere) relocation으로 실행하는 커널의 구조체 배치에 맞춰 로드되므로, 실행 시 컴파일러와 커널 헤더가 필요 없습니다. Debian 13 패키지는 `/usr/sbin/<이름>-libbpf`로 설치합니다.

```text
# timeout -s INT 5 opensnoop-libbpf -n cat
PID    COMM              FD ERR PATH
85409  cat                3   0 /etc/ld.so.cache
85409  cat                3   0 /lib/aarch64-linux-gnu/libc.so.6
85409  cat               -1   2 /usr/lib/locale/locale-archive
85409  cat               -1   2 /usr/share/locale/locale.alias
# ls -la /usr/sbin/opensnoop-bpfcc /usr/sbin/opensnoop-libbpf
-rwxr-xr-x 1 root root  14581 Mar 28  2025 /usr/sbin/opensnoop-bpfcc
-rwxr-xr-x 1 root root 465904 Mar 28  2025 /usr/sbin/opensnoop-libbpf
```

BCC판은 14 KB짜리 Python 스크립트이고 libbpf판은 466 KB짜리 ELF 실행 파일입니다. 출력도 헤더가 섞이지 않았습니다. 헤더나 Clang을 설치하기 어려운 임베디드 타깃에는 libbpf판이 맞습니다. libbpf-tools `README.md`(45~58, 83행)는 CO-RE 도구가 커널 헤더 패키지 대신 `vmlinux.h`를 쓰며, 실행하는 커널에 `CONFIG_DEBUG_INFO_BTF=y`로 만든 BTF가 있어야 하고 libbpf가 `/sys/kernel/btf/vmlinux`를 찾는다고 적고 있습니다.

## eBPF + 커널 추적의 강력함

위 실행을 질문별로 다시 묶으면 이렇습니다.

| 질문 | 이 장에서 쓴 프로그램 |
|------|------|
| 누가 어떤 파일을 여나 | `sys_enter_openat` + `str(args.filename)`, 또는 `opensnoop` |
| 이 함수는 어디서 불리나 | `kprobe:<함수> { @[kstack] = count(); }` |
| 요청 크기 분포는 | `kprobe:vfs_read { @ = lhist(arg2, ...) }` |
| 지연 시간 꼬리가 있나 | 진입·반환 시각 차이를 `hist()` |
| 누가 page fault를 내나 | `software:page-faults:100` |

## 안전성 — Verifier

v6.12 `Documentation/bpf/verifier.rst`(12~14행)에 따르면 verifier는 첫 명령부터 가능한 경로를 따라 내려가며 각 명령의 레지스터·스택 상태 변화를 시뮬레이션합니다. 이미 검사한 상태와 겹치는 경로는 가지치기합니다(305~308행). 끝나지 않는 루프를 넣어 실제로 확인해 봤습니다. `-v`를 주면 커널 verifier 로그가 그대로 나옵니다.

```text
# timeout -s INT 3 bpftrace -v -e 'kprobe:do_sys_openat2 { while (1) { } }'
0: R1=ctx() R10=fp0
;  @ bpftrace.bpf.o:0
0: (05) goto pc-1
0: (05) goto pc-1
...
infinite loop detected at insn 0
cur state: R1=ctx() R10=fp0
old state: R1=ctx() R10=fp0
processed 9 insns (limit 1000000) max_states_per_insn 0 total_states 1 peak_states 1 mark_read 0
ERROR: Loading BPF object(s) failed.
```

`goto pc-1`은 자기 자신으로 점프하는 명령입니다. verifier는 같은 명령에서 같은 레지스터 상태를 다시 만나자 `infinite loop detected`(`kernel/bpf/verifier.c:18005`)로 거부했습니다. `limit 1000000`은 프로그램 하나당 검사할 수 있는 명령 수 한도 `BPF_COMPLEXITY_LIMIT_INSNS`(`include/linux/bpf.h:1928`)입니다. 반면 `$i < 1000000`으로 끝이 정해진 루프는 같은 커널에서 오류 없이 붙었습니다.

v6.12 소스에서 확인한 제한은 다음과 같습니다.

| 제한 | 값 | 위치 |
|------|----|------|
| 검사 명령 수 | 1,000,000 | `include/linux/bpf.h:1928` |
| 스택 | 512 B (호출 체인 합계) | `MAX_BPF_STACK`, `include/linux/filter.h:96`; 검사 `kernel/bpf/verifier.c:6046` |
| 끝나지 않는 루프 | 거부 | `kernel/bpf/verifier.c:18005` |

## 부하

eBPF 비용은 probe가 불리는 빈도에 비례합니다. 위 실험 중 가장 빈도가 높았던 것은 `vfs_read` kprobe였고, BCC 스크립트에서 3,002번 불렸습니다. 이 장에서는 부하를 따로 측정하지 않았으므로 수치를 적지 않습니다. 운영 시스템에 붙일 때는 같은 workload를 probe 없이 한 번, 붙이고 한 번 돌려 처리량을 비교합니다. 상시 돌리는 프로그램은 출력을 줄이고 주기적으로만 내보냅니다.

```bash
# syscall 번호별 카운트를 10초마다 출력하고 비움
bpftrace -e '
  tracepoint:raw_syscalls:sys_enter { @[comm, args.id] = count(); }
  interval:s:10 { print(@); clear(@); }'
```

## 자주 만나는 문제

| 증상 | 원인 / 해법 (이 장에서 확인한 것) |
|------|-------------|
| `ERROR: bpftrace currently only supports running as the root user.` | root로 실행. 커널도 `unprivileged_bpf_disabled=2` |
| `Loading BPF object(s) failed.` | verifier 거부. `-v`로 커널 로그를 보고 원인 줄을 찾음 |
| `perf_event_open failed` (`hardware:`) | PMU가 없음 (이 VM) |
| `kprobe:__kmalloc` 같은 이름이 없음 | 이름 변경 (`__kmalloc_noprof`). `bpftrace -l 'kprobe:*kmalloc*'`로 검색 |
| 이벤트 손실 경고 | bpftrace(8)의 `perf_rb_pages`(기본 64, CPU당 ring buffer 페이지 수)를 키움. `-B`는 stdout 버퍼링 모드라 무관 |
| BCC 도구가 컴파일 오류 | 커널 헤더 없음. libbpf-tools판을 씀 |

## 정리

- eBPF 프로그램은 verifier를 통과해야 로드됩니다. 이 게스트에서 무한 루프는 `infinite loop detected`로 거부됐고, 한도가 있는 루프는 붙었습니다.
- bpftrace는 `probe /filter/ { action }`입니다. tracepoint 인자는 `-lv`로, 함수 이름은 `-l`로 실행 중인 커널에서 확인합니다.
- `count()`·`sum()`·`hist()`·`lhist()`로 그 자리에서 집계하고, `@[kstack]`으로 호출 경로를 셉니다.
- BCC는 Python에서 가공할 때, libbpf-tools는 헤더·컴파일러 없이 배포할 때 씁니다. 둘 다 Debian 13에 패키지로 있습니다.
- `hardware:` probe는 PMU가 있어야 하고, 부하는 probe 빈도에 비례하므로 workload에서 따로 잽니다.

## 다음 장 예고

Ch 5 — kdb / kgdb. 관측이 아니라 멈추고 들여다보는 디버깅입니다. Debian 커널에는 KGDB가 없으므로 v6.12 소스로 따로 빌드한 커널을 QEMU에서 띄웁니다.

## 관련 항목

- [Ch 3: ftrace + tracepoints](/blog/tools/debugging/kernel/chapter03-ftrace-tracepoints)
- [Ch 5: kdb / kgdb](/blog/tools/debugging/kernel/chapter05-kdb-kgdb)
- [Performance Engineering: eBPF 동적 트레이싱](/blog/embedded/performance-engineering/part5-04-ebpf) — probe 종류별 overhead 비교와 latency spike 진단 시나리오가 있는 성능 쪽
- [bpftrace](https://github.com/bpftrace/bpftrace) — 맨 페이지 bpftrace(8)
- [BCC tools](https://github.com/iovisor/bcc/tree/master/tools)
- [libbpf-tools](https://github.com/iovisor/bcc/tree/master/libbpf-tools)
