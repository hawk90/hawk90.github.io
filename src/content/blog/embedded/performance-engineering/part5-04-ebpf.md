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

> **"eBPF는 검증된 작은 프로그램을 커널 안에서 실행해, 안전하면서도 ftrace보다 표현력 높은 분석을 가능하게 합니다."**

## 어떤 문제를 푸는가

ftrace는 강력하지만 데이터를 사용자 공간으로 모두 내보낸 뒤 후처리하는 구조입니다. 100 KHz syscall stream을 그대로 dump하면 디스크가 금방 차고 분석도 어렵습니다.

eBPF는 검증된 BPF bytecode를 커널 hook 지점에서 직접 실행하므로, hash map에 집계하거나 histogram으로 압축한 결과만 사용자 공간으로 가져옵니다. 측정 overhead가 낮고, 코드 한 줄로 "프로세스별 read 시스템 호출 횟수"를 집계할 수 있습니다.

bpftrace는 awk와 비슷한 DSL로 eBPF를 손쉽게 작성하는 도구이며, BCC는 Python으로 더 복잡한 분석기를 만드는 framework입니다. 이 글에서는 두 도구와 그 기반 mechanism을 다룹니다.

## BPF VM과 Verifier

eBPF 프로그램은 64-bit register 10개의 가상 머신에서 실행됩니다. 커널이 bytecode를 로드할 때 verifier가 다음을 검사합니다.

- 모든 분기가 유한 시간 안에 종료되는가
- 모든 메모리 접근이 유효한 범위 안인가
- Loop은 검증 가능한가 (허용 기능은 커널 버전과 verifier 규칙에 따름)
- 사용 가능한 helper function만 호출하는가

검증된 BPF는 설정과 아키텍처에 따라 interpreter 또는 JIT 경로로 실행됩니다. verifier는 허용된 메모리 접근과 제어 흐름을 검사하지만, 프로그램 비용이 항상 0이거나 모든 운영상 위험이 사라지는 뜻은 아닙니다.

```bash
uname -r                              # 4.9+ 권장, 5.x 이상 활용도 ↑
zcat /proc/config.gz | grep BPF       # CONFIG_BPF=y 확인
```

## bpftrace One-liner

설치는 대부분 distro에서 패키지로 가능합니다.

```bash
apt install bpftrace
```

자주 쓰는 one-liner부터 살펴봅니다.

```bash
# 시스템 전체 syscall 빈도
bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'

# 프로세스별 read 호출 횟수
bpftrace -e 'tracepoint:syscalls:sys_enter_read { @[comm] = count(); }'

# read latency 분포 (histogram)
bpftrace -e '
  tracepoint:syscalls:sys_enter_read { @start[tid] = nsecs; }
  tracepoint:syscalls:sys_exit_read /@start[tid]/ {
    @us = hist((nsecs - @start[tid]) / 1000);
    delete(@start[tid]);
  }'
```

`@`는 BPF map을 의미하며, 출력은 종료 시점에 자동으로 표시됩니다.

```text
@us:
[1]                   12 |                                  |
[2, 4)               234 |@@@                               |
[4, 8)              1024 |@@@@@@@@@@@@@@                    |
[8, 16)             3456 |@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@|
[16, 32)            1200 |@@@@@@@@@@@@@@@@@@                |
[32, 64)             456 |@@@@@@                            |
```

`hist()`는 log2 buckets, `lhist()`는 linear buckets를 생성합니다.

## kprobe·uprobe·tracepoint·USDT 비교

| 종류 | 위치 | 안정성 | 비용 |
|---|---|---|---|
| Tracepoint | 커널 정적 probe | 커널 버전·이벤트별 확인 | 이벤트·수집 방식에 따름 |
| Kprobe | 커널 임의 함수 | 불안정 | 중간 |
| Uprobe | 사용자 함수 | 사용자 ABI 의존 | 중간-높음 |
| USDT | 사용자 정적 probe | 안정 | 낮음 |

Tracepoint 이름과 필드는 대상 커널의 tracefs `events/.../format`에서 확인합니다. 커널 내부 이벤트는 안정된 userspace ABI로 보장되지 않으므로, 커널 변경 때 재검증합니다. Kprobe는 내부 함수 이름과 ABI 변화에도 취약합니다.

```bash
# kprobe — 임의 커널 함수
bpftrace -e 'kprobe:vfs_read { @[comm] = count(); }'

# uprobe — 사용자 함수
bpftrace -e 'uprobe:/lib/x86_64-linux-gnu/libc.so.6:malloc {
  @bytes = hist(arg0);
}'

# USDT — 사용자 정적 probe
bpftrace -e 'usdt:/usr/sbin/mysqld:mysql:query__start { @ = count(); }'
```

USDT는 application이 `DTRACE_PROBE` 매크로로 미리 정의해 둔 probe입니다. MySQL, PostgreSQL, OpenJDK, libpython 등이 제공합니다.

## BCC — Python으로 복잡한 분석

BCC `profile` 옵션은 [공식 source](https://github.com/iovisor/bcc/blob/master/tools/profile.py)의 CLI 정의를 기준으로 확인합니다. 이 예시에서 `-a`는 annotation, `-f`는 folded output입니다.

BCC(BPF Compiler Collection)는 C로 BPF를 작성하고 Python으로 결과를 처리하는 framework입니다. 즉시 쓰는 도구가 풍부합니다.

```bash
apt install bpfcc-tools

opensnoop-bpfcc                       # 열린 파일 실시간
execsnoop-bpfcc                       # exec 호출 실시간
biolatency-bpfcc                      # block I/O latency histogram
runqlat-bpfcc                         # run queue latency
tcpconnect-bpfcc                      # TCP connect 호출
profile-bpfcc -F 99 -f 30             # 99 Hz, 30초 folded output
```

`profile-bpfcc`는 stack collapsed 형식으로 출력하므로 flamegraph로 바로 그릴 수 있습니다.

```bash
profile-bpfcc -F 99 -af 30 > out.stacks
flamegraph.pl < out.stacks > flame.svg
```

## perf vs eBPF — Overhead 비교

| 도구 | Overhead | 수집 데이터 |
|------|----------|-------------|
| 도구 | 비용을 좌우하는 조건 | 수집 데이터 |
|------|--------------------|-------------|
| `perf record` | sample rate·call graph 방식 | sample stack |
| ftrace function | 활성 함수 수·호출 빈도 | 함수 진입/이탈 |
| ftrace/eBPF tracepoint | 이벤트 빈도·필터·집계 | 선택 event |
| bpftrace kprobe | probe 빈도·프로그램 동작 | 집계 결과 |

고정된 overhead 퍼센트는 플랫폼·버전·부하에 따라 달라지므로, production 적용 전 대상 시스템에서 측정합니다.

eBPF의 핵심 이득은 raw event를 dump하지 않고 커널 안에서 집계하는 점입니다. 100만 event를 1000 bucket histogram으로 압축하면 사용자 공간으로 가는 데이터는 수 KB로 끝납니다.

## 시나리오 — 갑작스런 latency spike 진단

```bash
# 1. run queue latency 확인
runqlat-bpfcc 10 1

# 2. CPU에서 가장 시간을 쓰는 함수
profile-bpfcc -F 99 -af 30 > out.stacks
flamegraph.pl < out.stacks > flame.svg

# 3. block I/O 의심되면
biolatency-bpfcc

# 4. 특정 syscall이 의심되면
bpftrace -e '
  tracepoint:syscalls:sys_enter_read { @start[tid] = nsecs; }
  tracepoint:syscalls:sys_exit_read /@start[tid]/ {
    $dur = nsecs - @start[tid];
    if ($dur > 10000000) {
      printf("%s pid=%d dur=%dms\n", comm, pid, $dur/1000000);
    }
    delete(@start[tid]);
  }'
```

이 흐름으로 30초 안에 hot path와 latency outlier를 분리할 수 있습니다.

## BPF_LSM과 보안 측면

5.7+ 커널은 BPF_LSM hook을 지원합니다. 보안 정책을 BPF로 작성해 LSM(Linux Security Module) hook에 attach할 수 있으며, SELinux 같은 정적 정책보다 유연합니다.

```c
SEC("lsm/bprm_check_security")
int BPF_PROG(bprm_check_security, struct linux_binprm *bprm) {
    /* exec 차단 정책 */
    return -EPERM;
}
```

Cilium Tetragon이 이 방향의 대표적 활용이며, 5-10편에서 다룹니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Bounded loop가 없는 커널에서 loop 사용

```c
for (int i = 0; i < n; i++) { ... }   // verifier reject
```

5.3 이전에는 unrolled loop만 가능했습니다. `#pragma unroll`이나 bounded loop를 사용해야 합니다.

> ⚠️ Stack 크기 초과

```text
BPF stack은 512 byte 제한
큰 struct를 stack에 두면 verifier reject
```

큰 데이터는 BPF map이나 per-CPU array를 사용해야 합니다.

> ⚠️ Uprobe ABI 의존

```bash
uprobe:/lib/libc.so.6:malloc
```

libc 업그레이드로 symbol이 사라지거나 inline되면 즉시 깨집니다. USDT가 더 안정적입니다.

> ⚠️ map 정리 누락

```bash
@start[tid] = nsecs;
# 끝날 때 delete(@start[tid]) 없음 → memory leak
```

특히 process exit으로 sys_exit가 호출되지 않는 경우 map entry가 누적됩니다.

## 정리

- eBPF는 verifier 검사를 거쳐 커널 hook에 연결되며, 실행 경로는 interpreter 또는 설정된 JIT입니다.
- bpftrace는 awk 같은 DSL로 one-liner부터 복잡한 분석까지 작성 가능합니다.
- BCC는 Python framework이며 opensnoop, biolatency, runqlat 등 즉시 쓰는 도구를 제공합니다.
- Tracepoint·USDT는 hook 지점을 명시적으로 제공하지만, 이름·필드·가용성은 대상 시스템에서 확인합니다. kprobe·uprobe는 내부 ABI와 symbol에 의존합니다.
- 커널 안에서 hash map으로 집계하므로 raw event dump보다 overhead가 훨씬 낮습니다.
- BPF_LSM으로 보안 hook까지 확장 가능합니다.

다음 편은 **Flamegraph 분석** — sampling 결과를 한 장의 그림으로.

## 관련 항목

- [5-03: ftrace 활용](/blog/embedded/performance-engineering/part5-03-ftrace)
- [5-05: Flamegraph 분석](/blog/embedded/performance-engineering/part5-05-flamegraph)
- [5-10: 연속 프로파일링](/blog/embedded/performance-engineering/part5-10-ebpf-continuous)
- [Kernel Debugging: eBPF·bpftrace](/blog/tools/debugging/kernel/chapter04-ebpf-kernel) — 같은 bpftrace를 커널 버그 추적에 쓰는 디버깅 쪽
