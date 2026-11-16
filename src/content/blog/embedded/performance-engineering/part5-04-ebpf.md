---
title: "eBPF·bpftrace 동적 트레이싱 — 커널 무수정 관측"
slug: "embedded/performance-engineering/part5-04-ebpf"
date: 2026-04-27T09:03:00
description: "eBPF VM과 verifier, bpftrace one-liner, BCC tools, kprobe·uprobe·USDT 비교."
series: "Embedded Performance Engineering"
seriesOrder: 43
tags: [ebpf, bpftrace, bcc, dynamic-tracing]
topics: ["embedded"]
---

## 한 줄 요약

> **"eBPF는 검증된 작은 프로그램을 커널 안에서 실행해, 이벤트를 커널 안에서 바로 집계합니다."** ftrace처럼 모든 이벤트를 버퍼에 쏟아 내지 않고, 결과 표만 사용자 공간으로 가져옵니다.

## 어떤 문제를 푸는가

[5-03](/blog/embedded/performance-engineering/part5-03-ftrace)의 ftrace와 [5-02](/blog/embedded/performance-engineering/part5-02-perf-advanced)의 `perf record`는 이벤트를 하나하나 버퍼에 적은 뒤 사용자 공간에서 후처리합니다. 이 글 뒤쪽의 측정에서 `getppid` 700만 번을 도는 동안 `perf record -a`로 시스템 전체의 `sys_enter` 이벤트를 받아 적었더니 `perf.data`가 1.72 GB였습니다. 통계청이 국민 한 사람 한 사람의 답안지를 트럭으로 실어 나르는 셈입니다.

eBPF는 집계 코드를 커널의 hook 지점에 직접 붙입니다. 각 동네 사무소가 그 자리에서 집계표를 만들어 숫자만 보내는 방식입니다. 같은 700만 번을 bpftrace로 세었을 때 결과는 comm별 개수 14줄이었습니다.

bpftrace는 awk와 비슷한 한 줄 언어로 eBPF 프로그램을 만드는 도구이고, BCC는 C로 쓴 BPF 프로그램을 Python에서 싣고 결과를 처리하는 도구 모음입니다. 이 글의 출력은 모두 Apple M2 Pro 위 QEMU 11.1.3 HVF guest(8 vCPU)의 Debian 13 arm64, 커널 `6.12.116+deb13-arm64`, bpftrace v0.23.2, BCC(`bpfcc-tools`) 0.31.0에서 얻었습니다.

## BPF VM과 Verifier

eBPF 프로그램은 커널 안의 작은 가상 머신 명령어로 컴파일됩니다. v6.12 [classic_vs_extended.rst](https://github.com/torvalds/linux/blob/v6.12/Documentation/bpf/classic_vs_extended.rst)는 이 형식이 레지스터 2개였던 classic BPF를 "10 internal registers and a read-only frame pointer"로 넓혔다고 설명합니다. 커널은 프로그램을 싣기 전에 verifier로 검사하고, 통과한 것만 hook에 붙입니다. 공항 보안 검색대처럼 탑승(실행) 전에 한 번 전부 확인하는 구조입니다.

이 커널이 eBPF를 지원하는지는 설정과 sysctl로 봅니다.

```text
$ grep -E 'CONFIG_BPF_SYSCALL|CONFIG_BPF_JIT=|CONFIG_BPF_JIT_ALWAYS_ON|CONFIG_DEBUG_INFO_BTF=|CONFIG_BPF_LSM' /boot/config-$(uname -r)
CONFIG_BPF_SYSCALL=y
CONFIG_BPF_JIT=y
# CONFIG_BPF_JIT_ALWAYS_ON is not set
CONFIG_BPF_LSM=y
CONFIG_DEBUG_INFO_BTF=y
$ cat /proc/sys/net/core/bpf_jit_enable
1
```

JIT가 켜져 있으므로(`bpf_jit_enable` = 1) 검증된 프로그램은 arm64 기계어로 바뀌어 돕니다. `CONFIG_BPF_JIT_ALWAYS_ON`이 꺼져 있어 interpreter 경로도 빌드에 남아 있습니다.

verifier가 실제로 무엇을 받고 무엇을 거절하는지 BCC로 세 프로그램을 실어 봤습니다(`verifier_tests.py`, 각 프로그램을 `vfs_read` kprobe에 붙임).

```c
/* bounded_loop: 상수 64회 */
for (int i = 0; i < 64; i++) acc ^= bpf_get_prandom_u32();

/* unbounded_loop: 반복 횟수를 verifier가 알 수 없음 */
u32 n = bpf_get_prandom_u32();
for (u32 i = 0; i < n; i++) acc ^= bpf_get_prandom_u32();

/* stack_1024: 1024바이트 지역 배열 */
char buf[1024];
bpf_probe_read_kernel(buf, sizeof(buf), (void *)PT_REGS_PARM1(ctx));
```

```text
bounded_loop: LOADED
bpf: Argument list too long. Program  too large (26 insns), at most 4096 insns
unbounded_loop: REJECTED (Exception: Failed to load BPF program b'probe': Argument list too long)
error: /virtual/main.c:0:0: in function probe i32 (ptr): Looks like the BPF stack limit is exceeded. Please move large on stack variables into BPF per-cpu array map. For non-kernel uses, the stack can be increased using -mllvm -bpf-stack-size.
```

결과는 세 갈래였습니다.

| 프로그램 | 어디서 막혔나 | 결과 |
|---|---|---|
| 상수 bound 루프 | — | 커널이 받아들임 |
| bound를 알 수 없는 루프 | 커널(`bpf()` 시스템 호출) | `E2BIG`("Argument list too long") |
| 1024바이트 스택 배열 | 컴파일러(clang BPF backend) | "BPF stack limit is exceeded" |

두 번째 줄의 "Program too large (26 insns), at most 4096 insns"는 BCC가 `E2BIG`을 보고 덧붙인 문구이고, 26개짜리 프로그램이 4096을 넘었다는 뜻은 아닙니다. 이번 실행에서 커널 verifier의 로그 본문은 받지 못했습니다. v6.12 `kernel/bpf/verifier.c`에서 `-E2BIG`을 돌려주는 경로 중 하나가 검사한 명령어 수가 `BPF_COMPLEXITY_LIMIT_INSNS`(`include/linux/bpf.h`, 1000000)를 넘을 때의 "BPF program is too large. Processed %d insn"입니다. 스택 한도는 `include/linux/filter.h`의 `MAX_BPF_STACK` = 512이고, clang이 커널에 보내기 전에 막았습니다.

## bpftrace One-liner

Debian 13에서는 패키지로 설치됩니다.

```bash
apt install bpftrace
```

자주 쓰는 한 줄부터 봅니다. `-c`로 대상 명령을 주면 그 명령이 끝날 때 bpftrace도 끝나고 map을 출력합니다. 시스템 전체 syscall을 comm별로 세면, 4 KiB씩 2만 번 읽고 쓰는 `dd`가 40116번으로 나옵니다.

```text
$ bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }' \
    -c 'dd if=/dev/zero of=/dev/null bs=4k count=20000 status=none'
@[bpftrace]: 11
@[dd]: 40116
```

`read`만 세면 20001번입니다. `fd`와 요청 크기로 나눠 보면 `/dev/zero`(fd 0)에서 4096바이트씩 20000번, 그리고 프로그램 시작 단계에서 fd 3으로 832바이트를 읽은 한 번입니다(`@fd[args.fd, args.count] = count()`로 확인).

```text
$ bpftrace -e 'tracepoint:syscalls:sys_enter_read { @[comm] = count(); }' -c 'dd ... count=20000'
@[dd]: 20001
```

`read` 지연 분포는 진입 시각을 thread별 map에 적어 두었다가 복귀 때 빼서 histogram에 넣습니다. 17.5 MB 파일을 64 KiB씩 읽은 결과입니다.

```bash
bpftrace -e '
  tracepoint:syscalls:sys_enter_read { @start[tid] = nsecs; }
  tracepoint:syscalls:sys_exit_read /@start[tid]/ {
    @us = hist((nsecs - @start[tid]) / 1000);
    delete(@start[tid]);
  }' -c 'dd if=/root/w/f4/sched.data of=/dev/null bs=64k status=none'
```

```text
@start[11394]: 2053574746509
@us:
[0]                    1 |                                                    |
[1]                    0 |                                                    |
[2, 4)               139 |@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@|
[4, 8)                 0 |                                                    |
[8, 16)                2 |                                                    |
[16, 32)               3 |@                                                   |
[32, 64)              35 |@@@@@@@@@@@@@                                       |
[64, 128)             51 |@@@@@@@@@@@@@@@@@@@                                 |
[128, 256)            40 |@@@@@@@@@@@@@@                                      |
[256, 512)            12 |@@@@                                                |
```

분포가 두 봉우리입니다. 2–4 us 무리(139건)와 32–512 us 무리(138건)로 갈렸습니다. 평균 하나로는 보이지 않는 모양이고, 두 무리가 왜 갈렸는지가 다음 질문이 됩니다. 이 글에서는 그 원인까지 추적하지 않았습니다. 맨 위 `@start[11394]` 한 줄은 아래 함정 절에서 다시 봅니다.

`hist()`는 2의 거듭제곱 구간, `lhist(n, min, max, step)`은 같은 폭 구간입니다(bpftrace(8) man page: "log2 histogram", "linear histogram"). 500 ns 간격으로 `dd`의 4 KiB `read`를 보면 거의 전부가 첫 칸입니다.

```text
@ns:
[0, 500)           19164 |@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@|
[500, 1000)          825 |@@                                                  |
[1000, 1500)           3 |                                                    |
...
[4000, ...)            5 |                                                    |
```

## kprobe·uprobe·tracepoint·USDT 비교

hook 지점은 네 종류입니다. 어디에 꽂느냐에 따라 "버전이 바뀌어도 그대로인가"가 달라집니다. v6.12 [bpf_design_QA.rst](https://github.com/torvalds/linux/blob/v6.12/Documentation/bpf/bpf_design_QA.rst)는 tracepoint도 kprobe 위치도 안정 ABI가 아니라고 답합니다. tracepoint는 "tied to internal implementation details", kprobe 위치는 "internal implementation details"라서 새 커널에서 깨질 수 있고, 그때는 BPF 프로그램을 고쳐야 한다고 적습니다.

| 종류 | 위치 | 이름이 바뀌면 | 이 글의 예 |
|---|---|---|---|
| Tracepoint | 커널 소스의 정적 계측점 | 커널 버전에 따라 바뀔 수 있음 | `syscalls:sys_enter_read` |
| Kprobe | 커널 함수 첫머리 등 | 함수 이름·inline 여부에 따라 깨짐 | `kprobe:vfs_read` |
| Uprobe | 사용자 바이너리의 심볼·오프셋 | 심볼이 없으면 attach 실패 | `uprobe:libc.so.6:malloc` |
| USDT | 애플리케이션이 미리 박아 둔 정적 probe | 애플리케이션이 유지 | `python:gc__start` |

kprobe와 uprobe 예입니다. uprobe는 `ls -lR` 한 번 동안 `malloc` 요청 크기 분포를 그렸습니다.

```text
$ bpftrace -e 'kprobe:vfs_read /comm == "dd"/ { @[comm] = count(); }' -c 'dd ... count=20000'
@[dd]: 20001

$ bpftrace -e 'uprobe:/lib/aarch64-linux-gnu/libc.so.6:malloc /pid == cpid/ { @bytes = hist(arg0); }' \
    -c '/usr/bin/ls -lR /usr/share/doc/bpftrace'
@bytes:
[4, 8)                36 |@@@@@@@@@@@@@@@@@@                                  |
[8, 16)               22 |@@@@@@@@@@@                                         |
[16, 32)              83 |@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@         |
[32, 64)             100 |@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@|
[64, 128)             25 |@@@@@@@@@@@@@                                       |
...
[32K, 64K)             2 |@                                                   |
```

경로가 x86 예제의 `/lib/x86_64-linux-gnu/`가 아니라 `/lib/aarch64-linux-gnu/`라는 점에 주의합니다.

USDT는 애플리케이션이 소스에 미리 정의해 둔 probe입니다. 어떤 바이너리에 있는지는 `bpftrace -l`로 확인합니다. 이 guest에서는 결과가 예상과 달랐습니다.

| 바이너리 | USDT probe 수 |
|---|---:|
| `/lib/aarch64-linux-gnu/libc.so.6` | 0 |
| `/usr/bin/python3.13` | 5 |
| `/usr/lib/aarch64-linux-gnu/libstdc++.so.6` | 3 (`throw`, `rethrow`, `catch`) |

Debian 13의 Python 3.13에는 `audit`, `gc__start`, `gc__done`, `import__find__load__start`, `import__find__load__done` 다섯 개만 있었고, `function__entry`는 "Failed to find usdt probe"였습니다. 있는 probe로 세대별 GC 횟수를 셌습니다.

```text
$ echo "import gc; [gc.collect(i % 3) for i in range(30)]" > gc30.py
$ bpftrace -e 'usdt:/usr/bin/python3.13:python:gc__start /pid == cpid/ { @gen[arg0] = count(); }' \
    -c "/usr/bin/python3.13 gc30.py"
@gen[1]: 10
@gen[0]: 13
@gen[2]: 14
```

스크립트가 세대 0·1·2를 10번씩 부르므로, 세대 0의 3번과 세대 2의 4번은 스크립트가 부르지 않은 GC입니다. 어느 시점에 일어났는지는 이번에 나눠 보지 않았습니다. USDT가 있는지는 배포판 빌드 옵션에 따라 달라지므로, 문서의 probe 이름을 믿기 전에 `bpftrace -l`로 대상 바이너리를 확인합니다.

## BCC — Python으로 복잡한 분석

`bpfcc-tools` 0.31.0은 `/usr/sbin/`에 `-bpfcc` 접미사가 붙은 도구 130개를 설치했습니다. 각 도구는 C로 쓴 BPF 프로그램과 Python 출력부로 이루어진 완성품입니다.

```bash
apt install bpfcc-tools
```

몇 가지를 실제 부하와 함께 돌렸습니다. `opensnoop`은 `cat /etc/hostname` 한 번이 실제로 연 파일을 모두 보여 줍니다.

```text
$ opensnoop-bpfcc -n cat -d 6
PID    COMM               FD ERR PATH
11840  cat                 4   0 /etc/ld.so.cache
11840  cat                 4   0 /lib/aarch64-linux-gnu/libc.so.6
11840  cat                -1   2 /usr/lib/locale/locale-archive
11840  cat                -1   2 /usr/share/locale/locale.alias
11840  cat                -1   2 /usr/lib/locale/C.UTF-8/LC_IDENTIFICATION
11840  cat                 4   0 /usr/lib/locale/C.utf8/LC_IDENTIFICATION
...
11840  cat                 4   0 /etc/hostname
```

`ERR 2`(`ENOENT`)로 실패한 열기가 14건(성공 17건)입니다. 로캘 파일을 `C.UTF-8`로 먼저 찾고 없으면 `C.utf8`로 다시 찾기 때문입니다. 정작 목표인 `/etc/hostname`은 마지막 한 줄입니다.

`runqlat`은 task가 실행 가능해진 뒤 CPU를 받기까지의 대기 시간 분포입니다. `perf bench sched pipe -l 20000`을 돌리는 3초 동안의 결과입니다.

```text
$ runqlat-bpfcc 3 1
     usecs               : count     distribution
         0 -> 1          : 8261     |****************************************|
         2 -> 3          : 219      |*                                       |
         4 -> 7          : 73       |                                        |
         8 -> 15         : 65       |                                        |
        16 -> 31         : 32       |                                        |
        32 -> 63         : 11       |                                        |
        64 -> 127        : 2        |                                        |
       128 -> 255        : 1        |                                        |
       256 -> 511        : 2        |                                        |
       512 -> 1023       : 0        |                                        |
      1024 -> 2047       : 1        |                                        |
```

`biolatency`는 블록 I/O 완료 시간 분포입니다. 1 MiB씩 64번 `oflag=direct`로 쓰는 동안 57건이 잡혔고, 대부분 128–512 us였습니다.

```text
$ biolatency-bpfcc 4 1
     usecs               : count     distribution
        32 -> 63         : 1        |                                        |
       128 -> 255        : 15       |**************                          |
       256 -> 511        : 41       |****************************************|
```

`profile -f`는 folded stack 형식으로 출력해 [5-05](/blog/embedded/performance-engineering/part5-05-flamegraph)의 flamegraph 입력으로 바로 쓸 수 있습니다. 그런데 이 guest에서는 사용자 스택이 전부 `[unknown]`이었습니다. 대상 프로세스가 기록 끝까지 살아 있는 경우(`-p`)도 같았습니다.

```text
$ profile-bpfcc -F 99 -f -p $PID 3 > prof2.folded
$ sort -k2 -nr -t' ' prof2.folded | head -2
prog_v1;[unknown];[unknown];[unknown];[unknown];[unknown] 231
prog_v1;[unknown];[unknown];[unknown];[unknown];[unknown] 48
```

같은 프로세스를 bpftrace의 `ustack`으로 찍으면 이름이 나옵니다.

```text
$ bpftrace -e "profile:hz:99 /pid == $PID/ { @[ustack(5)] = count(); }"
@[
        hot_function+32
        main+84
        __libc_start_call_main+124
        __libc_start_main@GLIBC_2.17+156
        _start+48
]: 231
```

BCC 0.31.0이 왜 이 바이너리를 풀지 못했는지는 이번에 확인하지 않았습니다. 다만 도구 하나의 `[unknown]`을 "스택이 없다"로 읽지 말고 다른 도구로 교차 확인해야 한다는 점은 분명합니다. bpftrace 출력에도 `process_batch`가 빠져 있습니다. `hot_function`은 다른 함수를 부르지 않는 leaf 함수라 자기 frame record를 만들지 않고, frame pointer를 따라가면 그 호출자를 건너뛰게 됩니다. 같은 바이너리를 `perf record --call-graph fp`로 찍은 [5-01](/blog/embedded/performance-engineering/part5-01-perf-basics)의 report에는 `process_batch`가 있었습니다.

## perf vs eBPF — Overhead 비교

집계를 커널 안에서 하는 것이 실제로 얼마나 싼지 쟀습니다. `perf bench syscall basic -l 1000000`(`getppid` 100만 번)을 7번씩 돌린 한 번 호출당 시간의 중앙값입니다(`aggcost.sh`).

| 수집 방식 | 중앙값 (usecs/op) | baseline 대비 | 남은 데이터 |
|---|---:|---:|---|
| 없음 | 0.1146 | 1.0× | — |
| bpftrace `raw_syscalls:sys_enter` → `count()` map | 0.1573 | 1.4× | comm별 14줄 |
| `perf record -a -e raw_syscalls:sys_enter` | 0.2381 | 2.1× | `perf.data` 1,724,131,977 B |

같은 tracepoint를 켜고 bpftrace는 커널 안에서 세기만, perf는 사건마다 기록을 적었습니다. bpftrace는 `syscall-basic` 7000042번을 세고 끝에 표 하나를 내놓았고, perf는 같은 구간에 시스템 전체(`-a`)의 `sys_enter`를 1.72 GB로 남겼습니다. baseline 위에 더해진 호출당 비용은 bpftrace가 0.043 us, perf가 0.124 us로 약 3분의 1이었습니다. [5-03](/blog/embedded/performance-engineering/part5-03-ftrace)의 표와 비교하면 같은 루프에서 ftrace `raw_syscalls` 이벤트 기록이 1.9×, 필터 없는 function tracer가 3.9×였습니다.

| 도구 | 비용을 좌우하는 조건 | 수집 데이터 |
|------|--------------------|-------------|
| `perf record` | 표본 주파수·call graph 방식·이벤트 빈도 | 표본·이벤트 기록 |
| ftrace function | 켠 함수 수·호출 빈도 | 함수 진입/복귀 |
| ftrace/eBPF tracepoint | 이벤트 빈도·필터·집계 여부 | 선택한 이벤트 |
| bpftrace kprobe | probe 빈도·프로그램 길이 | 집계 결과 |

## 시나리오 — 갑작스런 latency spike 진단

응답이 가끔 늦어질 때는 넓은 그물에서 좁은 그물로 갑니다. 위에서 실제로 돌린 도구들을 그 순서로 묶으면 다음과 같습니다.

```bash
# 1. CPU를 기다리는 시간이 문제인가 (run queue)
runqlat-bpfcc 10 1

# 2. CPU를 쓰는 곳은 어디인가 (스택 표본)
bpftrace -e "profile:hz:99 /pid == $PID/ { @[ustack(8)] = count(); }"

# 3. 블록 I/O가 느린가
biolatency-bpfcc 10 1

# 4. 특정 syscall의 느린 호출만 골라 찍기 (10 ms 초과)
bpftrace -e '
  tracepoint:syscalls:sys_enter_read { @start[tid] = nsecs; }
  tracepoint:syscalls:sys_exit_read /@start[tid]/ {
    $dur = nsecs - @start[tid];
    if ($dur > 10000000) {
      printf("%s pid=%d dur=%dms\n", comm, pid, $dur / 1000000);
    }
    delete(@start[tid]);
  }'
```

1단계에서 꼬리가 길면 스케줄링, 3단계에서 길면 저장장치 쪽입니다. 각 단계의 결과가 다음 단계에서 무엇을 볼지 정합니다.

## BPF_LSM과 보안 측면

eBPF는 관측만 하지 않습니다. v6.12 [prog_lsm.rst](https://github.com/torvalds/linux/blob/v6.12/Documentation/bpf/prog_lsm.rst)는 LSM hook에 BPF 프로그램을 붙여 "system-wide MAC (Mandatory Access Control) and Audit policies"를 구현할 수 있다고 설명합니다. 이 guest의 커널은 `CONFIG_BPF_LSM=y`이고, 활성 LSM 목록에도 `bpf`가 들어 있었습니다.

```text
$ cat /sys/kernel/security/lsm
lockdown,capability,landlock,yama,apparmor,tomoyo,bpf,ipe,ima,evm
```

프로그램 형태는 `SEC("lsm/<hook>")`와 `BPF_PROG()` 매크로입니다. 아래는 모양만 보이는 뼈대이며, 이 글에서는 싣지 않았습니다.

```c
SEC("lsm/bprm_check_security")
int BPF_PROG(bprm_check_security, struct linux_binprm *bprm) {
    return 0;           /* prog_lsm.rst 예: 거부할 때 -EPERM 반환 */
}
```

이 방향의 운영 도구는 [5-10](/blog/embedded/performance-engineering/part5-10-ebpf-continuous)에서 다룹니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Bound를 알 수 없는 loop

위 실험에서 상수 64회 루프는 실렸고, 반복 횟수가 런타임 값인 루프는 `E2BIG`으로 거부되었습니다. 루프에는 verifier가 증명할 수 있는 상수 상한을 둡니다.

> ⚠️ Stack 크기 초과

1024바이트 지역 배열은 커널에 가기도 전에 clang이 "BPF stack limit is exceeded"로 막았습니다. 한도는 `MAX_BPF_STACK` = 512바이트입니다. 큰 버퍼는 오류 메시지가 권하는 대로 per-CPU array map에 둡니다.

> ⚠️ Uprobe 심볼 의존

```text
$ bpftrace -e 'uprobe:/root/w/f4/prog_strip:hot_function { @ = count(); }' -c '/root/w/f4/prog_strip 1'
ERROR: Could not resolve symbol: /root/w/f4/prog_strip:hot_function, cannot attach probe.
```

strip한 바이너리에서는 같은 함수에 붙지 못했습니다(strip 전 `prog_v1`에서는 `@: 3`). 심볼 이름으로 거는 uprobe는 배포 바이너리의 빌드 방식에 묶입니다. 애플리케이션이 USDT를 제공하면 그쪽이 이름을 스스로 유지합니다.

> ⚠️ map 정리 누락

위 `read` 지연 예의 출력 맨 위에 `@start[11394]: 2053574746509` 한 줄이 남았습니다. `sys_enter_read`에서 넣은 항목 중, `-c`의 대상 명령이 끝나 bpftrace가 detach하기 전까지 `sys_exit_read`가 오지 않은 것입니다. 복귀 probe가 오지 않는 경로(프로세스 종료, 시그널)가 있으면 이런 항목이 쌓이므로, 오래 도는 스크립트는 `delete()`와 함께 크기 상한이나 주기적 `clear()`를 둡니다.

## 정리

- eBPF 프로그램은 verifier 검사를 거쳐 hook에 붙고, 이 guest에서는 JIT(`bpf_jit_enable` = 1)로 돕니다.
- 상수 bound 루프는 실렸고, bound를 모르는 루프는 `E2BIG`, 512바이트를 넘는 스택은 clang에서 거부되었습니다.
- bpftrace는 한 줄로 count·`hist`·`lhist`를 만들고, BCC는 `opensnoop`·`runqlat`·`biolatency` 같은 완성 도구를 줍니다.
- tracepoint와 kprobe 위치는 안정 ABI가 아닙니다(bpf_design_QA.rst). uprobe는 심볼이 없으면 붙지 않고, USDT는 배포판 빌드마다 있는 probe가 다릅니다.
- 같은 tracepoint에서 bpftrace 집계는 1.4×와 14줄, `perf record` 기록은 2.1×와 1.72 GB였습니다.
- 한 도구의 `[unknown]` 스택은 다른 도구로 교차 확인합니다.

다음 편은 **Flamegraph 분석** — sampling 결과를 한 장의 그림으로.

## 관련 항목

- [5-03: ftrace 활용](/blog/embedded/performance-engineering/part5-03-ftrace)
- [5-05: Flamegraph 분석](/blog/embedded/performance-engineering/part5-05-flamegraph)
- [5-10: 연속 프로파일링](/blog/embedded/performance-engineering/part5-10-ebpf-continuous)
- [Kernel Debugging: eBPF·bpftrace](/blog/tools/debugging/kernel/chapter04-ebpf-kernel) — 같은 bpftrace를 커널 버그 추적에 쓰는 디버깅 쪽
