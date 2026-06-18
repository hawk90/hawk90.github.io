---
title: "리눅스 커널 디버깅 개론 — User/Kernel 경계와 도구 선택"
date: 2026-05-25T09:01:00
description: "user-space와 kernel-space 디버깅의 차이. /proc, kallsyms, kernel debug info."
tags: [kernel, linux, debugging, proc]
series: "Kernel Debugging"
seriesOrder: 1
draft: false
---

지금까지 다룬 GDB·Sanitizer·Valgrind는 모두 *user-space 프로세스*가 대상이었습니다. 커널은 다릅니다 — 멈춰서 들여다볼 *프로세스 컨텍스트*가 없고, *전체 시스템*이 한 컨텍스트로 도는 데다, *디버거 자체*가 그 위에서 돌고 있어 평소 도구가 안 통합니다.

이 시리즈는 *Linux 커널 디버깅*의 전체 흐름을 다룹니다. 첫 장은 *왜 어렵나*부터 — user/kernel 경계, /proc 인터페이스, 커널 심볼·debug info의 구조까지.

:::tldr
커널은 *프로세스가 아니므로* GDB로 attach 못 함. 대신 *printk/ftrace/eBPF*로 안에서 보고, *kgdb*로 다른 머신에서 보고, *crash/drgn*으로 사후 분석.
:::

## User-space vs Kernel-space

| | user-space | kernel-space |
|---|------------|--------------|
| 주소 공간 | 프로세스별 분리 | 단일 (모든 프로세스 공유) |
| 보호 | 페이지 권한 | 전 access |
| 정지 | ptrace로 가능 | 정지 = 시스템 정지 |
| crash 영향 | 그 프로세스만 | 시스템 전체 (panic) |
| 디버거 attach | gdb -p PID | kgdb (별 머신 필요) |
| 표준 도구 | printf | printk |
| Backtrace | DWARF + libunwind | objtool + ORC unwinder |
| Memory | malloc | kmalloc / vmalloc / get_free_pages |

자기 자신을 디버깅하는 *bootstrap 문제*가 핵심. CPU 한 개에서 도는 single-machine 환경에서는 *디버거를 띄울 컨텍스트가 없기* 때문.

## Kernel 디버깅 다섯 가지 방법

| 방법 | 사용 | 위험도 |
|------|------|--------|
| **printk + dmesg** | 가장 흔함, 단순 | 낮음 |
| **dynamic_debug** | 런타임 토글 가능한 디버그 메시지 | 낮음 |
| **ftrace** | 함수·이벤트 trace, in-kernel | 낮음 |
| **eBPF / bpftrace** | 동적 instrumentation | 낮음 |
| **kdb / kgdb** | 실시간 인터랙티브 (별 머신 필요) | 중 |
| **kdump + crash** | 사후 분석 (vmcore 덤프) | 낮음 (사고 후) |
| **drgn** | Python으로 라이브/vmcore 분석 | 낮음 |

대부분의 일상은 *printk + ftrace + bpftrace*로 해결. 인터랙티브 step 디버깅은 *드물지만* kgdb.

## /proc — 커널 상태의 표준 인터페이스

```bash
$ ls /proc/
1/  2/  ...  buddyinfo  cgroups  cpuinfo  filesystems
interrupts  iomem  ioports  kallsyms  kmsg  loadavg
meminfo  modules  mounts  net/  schedstat  slabinfo
softirqs  stat  swaps  sys/  uptime  version  vmallocinfo  vmstat
```

핵심 진단 파일들.

| 파일 | 내용 |
|------|------|
| `/proc/cpuinfo` | CPU 정보 |
| `/proc/meminfo` | 메모리 전체 통계 |
| `/proc/slabinfo` | kmalloc slab 통계 |
| `/proc/interrupts` | IRQ별 카운터 |
| `/proc/softirqs` | softirq 카운터 |
| `/proc/loadavg` | 1/5/15분 load average |
| `/proc/stat` | 커널 통계 (CPU time, IRQ 카운트 등) |
| `/proc/vmstat` | 가상 메모리 통계 |
| `/proc/modules` | 로드된 모듈 |
| `/proc/kallsyms` | 커널 심볼 테이블 |
| `/proc/kmsg` | 커널 메시지 큐 (`dmesg` raw source) |
| `/proc/sys/` | sysctl 인터페이스 |
| `/proc/[pid]/` | 프로세스별 정보 (Ch에서 다룸) |

`/proc/kallsyms`이 특히 중요. 커널의 *모든 함수·변수 주소*가 있어 추적·디버깅의 기반.

```bash
$ sudo cat /proc/kallsyms | grep -E "T do_fork$"
ffffffff8108c130 T do_fork

$ sudo cat /proc/kallsyms | head -10
ffffffff81000000 T startup_64
ffffffff81000040 T secondary_startup_64
ffffffff8100007e T verify_cpu
...
```

각 줄: `<주소> <type> <name>`. type:
- `T` — Text (function)
- `D` — Data (initialized)
- `B` — BSS
- `R` — read-only data
- `t` — local function

`sudo`로 봐야 *실제 주소*가 나옴 (보안상 일반 사용자에겐 0으로 마스킹). KASLR 활성이면 부팅마다 주소 다름.

## Kernel 심볼과 debug info

커널 자체도 ELF + DWARF.

```bash
$ file /usr/lib/debug/lib/modules/$(uname -r)/vmlinux
vmlinux: ELF 64-bit LSB executable, x86-64, ...

$ readelf -S /usr/lib/debug/lib/modules/$(uname -r)/vmlinux | grep debug
[36] .debug_aranges    PROGBITS  ...
[37] .debug_info       PROGBITS  ...
[38] .debug_abbrev     PROGBITS  ...
[39] .debug_line       PROGBITS  ...
```

배포판 *debuginfo 패키지*에 vmlinux + debug sections.

```bash
# Fedora
$ sudo dnf install kernel-debuginfo-$(uname -r)
# Ubuntu/Debian
$ sudo apt install linux-image-$(uname -r)-dbg
```

vmlinux + kallsyms 조합이 *모든 커널 디버깅 도구*의 기반. crash, drgn, perf 등이 사용.

## Modules

```bash
$ lsmod | head -5
Module                  Size  Used by
nf_conntrack          172032  4 nf_nat,xt_conntrack,...
btrfs                1748992  1
xfs                  1810432  1
...

$ modinfo nf_conntrack
filename:       /lib/modules/.../nf_conntrack.ko.xz
license:        GPL
description:    ...
depends:        nf_defrag_ipv6,nf_defrag_ipv4,...
```

각 모듈도 ELF (`.ko`) 파일. debug info는 모듈별로.

```bash
$ ls /usr/lib/debug/lib/modules/$(uname -r)/kernel/net/netfilter/
nf_conntrack.ko.debug  ...
```

## Tainted Kernel

```bash
$ cat /proc/sys/kernel/tainted
0
```

0이 아니면 *비-vanilla* 상태. 비트별 의미.

| 비트 | 문자 | 의미 |
|------|------|------|
| 0 | G/P | proprietary 모듈 로드 |
| 1 | F | force module load |
| 2 | S | SMP 검증 안 됨 |
| 3 | R | force unload |
| 4 | M | MCE 발생 |
| 5 | B | bad page 발견 |
| 6 | U | user-space에서 tainted 설정 |
| 7 | D | die (oops/panic 후) |
| 9 | A | ACPI table 덮어씀 |
| 10 | W | warning 발생 |
| 12 | I | tainted via ad-hoc |
| 13 | C | staging driver 로드 |
| 14 | O | out-of-tree 모듈 |
| 17 | K | kexec |
| 18 | X | proprietary firmware |

```bash
$ dmesg | grep -i taint
[0.000000] Disabled fast string operations
[...] BUG: ... Tainted: G        W  OE     5.15.0-...
```

`Tainted: G W OE` = proprietary + warning + out-of-tree. 버그 리포트 시 *vanilla 커널에서 재현*해야 하는 이유.

## sysrq — Magic SysRq

```bash
$ echo 1 | sudo tee /proc/sys/kernel/sysrq    # 활성화
$ echo b | sudo tee /proc/sysrq-trigger        # immediate reboot
$ echo s | sudo tee /proc/sysrq-trigger        # sync all filesystems
$ echo t | sudo tee /proc/sysrq-trigger        # dump all task stacks → dmesg
$ echo m | sudo tee /proc/sysrq-trigger        # dump memory info
$ echo w | sudo tee /proc/sysrq-trigger        # dump tasks in D state
$ echo c | sudo tee /proc/sysrq-trigger        # trigger kernel crash → kdump
```

물리적 키보드는 `Alt+SysRq+<key>`. 시스템 hang 상태에서 *유일하게* 응답하는 경로. `t`로 모든 스레드 stack 덤프 → dmesg에서 *hang 원인* 추적.

## addr2line on vmlinux

크래시 로그의 PC를 함수+줄로.

```bash
$ addr2line -e /usr/lib/debug/.../vmlinux 0xffffffff8108c1a0
mm/memory.c:1234

$ addr2line -e /usr/lib/debug/.../vmlinux -fi 0xffffffff8108c1a0
handle_pte_fault
mm/memory.c:1234
 (inlined by) handle_mm_fault
mm/memory.c:5678
```

user-space addr2line과 같음 — *vmlinux를 인자로 줌*만 차이.

## kpatch / livepatch

커널 *재부팅 없이* 패치 적용. 핫픽스 표준 도구.

```bash
$ sudo kpatch load /lib/modules/.../my-patch.ko
$ kpatch list
Loaded patch modules:
my-patch
```

디버깅에 직접 쓰는 도구는 아니지만 *프로덕션에서 디버그 빌드를 라이브로 swap*하는 데 유용.

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| `/proc/kallsyms` 주소가 모두 0 | `/proc/sys/kernel/kptr_restrict=2` (보안 기본). `sudo` 또는 root로. |
| `printk` 출력 안 보임 | log level이 낮음. `dmesg -n 7` 또는 `/proc/sys/kernel/printk` |
| kdump 파일 안 만들어짐 | kdump 서비스 비활성 또는 `crashkernel` 부팅 옵션 누락 |
| eBPF "Permission denied" | `CAP_BPF` 또는 root 권한 |
| 모듈 debug info 없음 | 해당 모듈의 `-debuginfo` 패키지 별도 설치 |

## debuginfo + debuginfod for kernel

[debuginfod 시리즈에서 본](/blog/tools/debugging/dwarf-elf/chapter06-split-dwarf-tools)것처럼 *커널 vmlinux*도 build-id로 자동 다운로드.

```bash
$ export DEBUGINFOD_URLS="https://debuginfod.fedoraproject.org/"
$ gdb /usr/lib/debug/.../vmlinux /var/crash/.../vmcore
[자동 vmlinux + 모듈 debuginfo 다운로드]
```

대형 SaaS 사업자 (CoreOS, AWS) 환경에서 vmlinux를 *어디서나 자동 매칭*하는 표준 경로.

## 정리

- 커널 디버깅 = user-space와 *근본적으로 다름*. 단일 컨텍스트, 시스템 영향, attach 불가.
- 5가지 무기: printk, ftrace, eBPF, kgdb, crash/drgn.
- /proc이 표준 상태 인터페이스. /proc/kallsyms이 심볼 진입점.
- vmlinux + DWARF가 debug info의 기반.
- Tainted 커널은 *vanilla 재현* 필요.
- Magic SysRq는 hang 상태의 유일한 응답 경로.
- addr2line은 같지만 vmlinux를 인자로.

## 다음 장 예고

Ch 2 — printk + dmesg + dynamic_debug. 커널 로깅의 모든 것: log level, ratelimit, 동적 활성화.

## 관련 항목

- [Ch 2: printk / dmesg / dynamic_debug](/blog/tools/debugging/kernel/chapter02-printk-dmesg)
- [DWARF and ELF Internals](/blog/tools/debugging/dwarf-elf/chapter01-elf-overview)
- strace / tracing 시리즈 — ftrace/eBPF 사전 학습
- [Linux Kernel Documentation — Debugging](https://www.kernel.org/doc/html/latest/dev-tools/index.html)
- `man 5 proc` — /proc 전체
- [`Documentation/admin-guide/sysrq.rst`](https://www.kernel.org/doc/html/latest/admin-guide/sysrq.html) — Magic SysRq
