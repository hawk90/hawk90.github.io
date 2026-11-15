---
title: "리눅스 커널 디버깅 개론 — User/Kernel 경계와 도구 선택"
slug: "tools/debugging/kernel/chapter01-user-kernel-boundary"
date: 2026-05-25T09:01:00
description: "user-space와 kernel-space 디버깅의 차이. /proc, kallsyms, kernel debug info."
tags: [kernel, linux, debugging, proc]
series: "Kernel Debugging"
seriesOrder: 1
draft: false
topics: ["tools", "tools/debugging"]
---

지금까지 다룬 GDB·Sanitizer·Valgrind는 모두 *user-space 프로세스*가 대상이었습니다. 커널 코드는 각 프로세스의 커널 모드 실행 경로와 인터럽트·커널 스레드에서도 동작합니다. 사용자 프로세스 하나에 붙는 `ptrace` 디버거와 달리, 커널을 조사하려면 실행 중인 커널에 맞는 심볼·디버그 정보·추적 지점이 필요합니다. kgdb로 멈추면 설정에 따라 다른 CPU의 실행도 정지할 수 있으므로 운영 시스템에서는 영향을 먼저 고려해야 합니다.

이 시리즈는 *Linux 커널 디버깅*의 전체 흐름을 다룹니다. 첫 장은 *왜 어렵나*부터 — user/kernel 경계, /proc 인터페이스, 커널 심볼·debug info의 구조까지.

:::tldr
커널은 *프로세스가 아니므로* GDB로 attach 못 함. 대신 *printk/ftrace/eBPF*로 안에서 보고, *kgdb*로 다른 머신에서 보고, *crash/drgn*으로 사후 분석.
:::

## User-space vs Kernel-space

| | user-space | kernel-space |
|---|------------|--------------|
| 주소 공간 | 프로세스별 사용자 매핑 | 커널 매핑은 프로세스 간 공유되며 페이지 테이블 구현은 아키텍처·설정에 따름 |
| 보호 | 프로세스 격리와 페이지 권한 | CPU privilege level과 페이지 권한으로 제한 |
| 정지 | `ptrace`로 대상 프로세스를 제어 | kgdb 등으로 정지할 수 있으나 CPU·설정에 따라 영향 범위가 다름 |
| crash 영향 | 보통 해당 프로세스에 국한 | 오류 종류·문맥에 따라 복구 가능한 oops부터 panic까지 다름 |
| 디버거 attach | `gdb -p PID`는 ptrace 권한·정책 범위에서 동작 | kgdb는 별도 I/O 경로와 호환되는 `vmlinux`가 필요 |
| 표준 도구 | printf | printk |
| Backtrace | DWARF·프레임 정보 등 | 설정된 unwinder와 일치하는 커널 심볼·디버그 정보 |
| Memory | malloc | kmalloc / vmalloc / get_free_pages |

커널 디버깅의 어려움은 대상 코드와 디버거가 같은 커널·하드웨어 자원을 공유한다는 점입니다. 별도 호스트와 kgdb 같은 원격 경로는 필수 조건이 아니라, 타깃이 멈추거나 콘솔을 점유할 때 제어·관찰 수단을 분리하는 실용적인 방법입니다.

## Kernel 디버깅 도구

| 방법 | 사용 | 위험도 |
|------|------|--------|
| **printk + dmesg** | 가장 흔함, 단순 | 낮음 |
| **dynamic_debug** | 런타임 토글 가능한 디버그 메시지 | 낮음 |
| **ftrace** | 함수·이벤트 trace, in-kernel | 낮음 |
| **eBPF / bpftrace** | 동적 instrumentation | 낮음 |
| **kdb / kgdb** | 실시간 인터랙티브 (별 머신 필요) | 중 |
| **kdump + crash** | 사후 분석 (vmcore 덤프) | 낮음 (사고 후) |
| **drgn** | Python으로 라이브/vmcore 분석 | 낮음 |

도구 선택은 재현 가능성, 관측 지점, 커널 설정, 운영 영향에 따라 달라집니다. `printk`, ftrace, eBPF는 관측용이며 인터랙티브 정지 조사는 별도 KGDB 설정이 필요합니다.

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
| `/proc/kmsg` | 커널 메시지 읽기 인터페이스 (접근·소비 방식은 `/dev/kmsg` 및 `dmesg`와 다름) |
| `/proc/sys/` | sysctl 인터페이스 |
| `/proc/[pid]/` | 프로세스별 정보 (Ch에서 다룸) |

`/proc/kallsyms`는 커널이 노출하는 심볼과 주소를 보여 주지만, 모든 심볼이 항상 포함되거나 주소가 공개되는 것은 아닙니다. 빌드 설정, 권한 정책, KASLR, `kptr_restrict`가 결과에 영향을 줍니다.

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

주소가 0으로 보일 때는 `/proc/sys/kernel/kptr_restrict`, 커널 설정, 배포판 정책을 함께 확인합니다. `sudo`만으로 모든 정책을 우회할 수 있는 것은 아닙니다. KASLR이 켜져 있으면 런타임 주소가 부팅마다 달라질 수 있으므로, 주소 해석에는 같은 빌드의 심볼과 런타임 기준을 맞춰야 합니다.

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

0이 아니면 하나 이상의 taint 사유가 기록된 상태입니다. 이는 곧바로 비표준 커널이나 결함을 뜻하지 않으며, 원인 분석 때 각 비트를 해석해야 합니다. 아래 비트 번호와 문자는 Linux v7.3-rc6 공식 문서 기준입니다.

| 비트 | 문자 | 의미 |
|------|------|------|
| 0 | G/P | `G`: GPL 호환 모듈, `P`: 독점 모듈 로드 |
| 1 | F | force module load |
| 2 | S | 사양 밖 하드웨어·설정에서 실행 |
| 3 | R | force unload |
| 4 | M | MCE 발생 |
| 5 | B | bad page 발견 |
| 6 | U | user-space가 taint 설정 요청 |
| 7 | D | die (oops/panic 후) |
| 8 | A | ACPI table 덮어씀 |
| 9 | W | warning 발생 |
| 10 | C | staging driver 로드 |
| 11 | I | 플랫폼 펌웨어 결함 우회 적용 |
| 12 | O | out-of-tree 모듈 |
| 13 | E | 서명되지 않은 모듈 로드 |
| 14 | L | soft lockup 발생 |
| 15 | K | livepatch 적용 |
| 16 | X | 배포판별 보조 taint |
| 17 | T | randstruct 플러그인으로 빌드 |
| 18 | N | 커널 내 테스트 실행 |
| 19 | J | fwctl의 변경 가능한 debug 작업 사용 |

```bash
$ dmesg | grep -i taint
[0.000000] Disabled fast string operations
[...] BUG: ... Tainted: G        W  OE     5.15.0-...
```

`Tainted: G W OE`라면 GPL 호환 모듈만 로드된 상태(`G`), 이전 warning(`W`), out-of-tree 모듈(`O`), 서명되지 않은 모듈(`E`)을 뜻합니다. 원인 조사 시 taint 사유를 확인하고, 가능하면 깨끗한 커널에서도 재현되는지 비교합니다.

## sysrq — Magic SysRq

```bash
$ echo 1 | sudo tee /proc/sys/kernel/sysrq    # 활성화
$ echo b | sudo tee /proc/sysrq-trigger        # sync 없이 즉시 재부팅 — 데이터 손실 위험
$ echo s | sudo tee /proc/sysrq-trigger        # sync all filesystems
$ echo t | sudo tee /proc/sysrq-trigger        # dump all task stacks → dmesg
$ echo m | sudo tee /proc/sysrq-trigger        # dump memory info
$ echo w | sudo tee /proc/sysrq-trigger        # dump tasks in D state
$ echo c | sudo tee /proc/sysrq-trigger        # trigger kernel crash → kdump
```

물리 키 조합은 `Alt+SysRq+<key>`입니다. SysRq도 커널이 완전히 잠기거나 기능이 비활성화된 경우 응답하지 않을 수 있습니다. `t`는 task 상태를 콘솔에 덤프하며, 출력은 콘솔 log level과 로그 보존 설정을 고려해 확인합니다. `b`는 파일시스템 동기화 없이 재부팅하므로 진단 중 실행하지 마세요.

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

지원되는 함수에 호환 패치를 적용해 일부 수정은 재부팅 없이 반영할 수 있습니다. 배포판·커널 설정·패치 형식에 의존하며, 임의의 디버그 빌드를 실행 중인 커널과 교체하는 기능은 아닙니다.

```bash
$ sudo kpatch load /lib/modules/.../my-patch.ko
$ kpatch list
Loaded patch modules:
my-patch
```

장애 대응에서는 패치의 적용 가능성과 운영 절차를 별도로 검토해야 합니다.

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| `/proc/kallsyms` 주소가 모두 0 | `kptr_restrict`, 커널 설정·배포판 정책을 확인. 값 2에서는 root 권한만으로 공개되지 않을 수 있음. |
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

debuginfod 서버가 해당 빌드의 build-id와 아티팩트를 제공할 때에만 자동 조회가 됩니다. 서버·클라이언트 설정과 빌드 보관 정책에 따라 달라지므로, 모든 배포 환경의 표준 경로로 간주하지 않습니다.

## 정리

- 커널 디버깅 = user-space와 *근본적으로 다름*. 단일 컨텍스트, 시스템 영향, attach 불가.
- 5가지 무기: printk, ftrace, eBPF, kgdb, crash/drgn.
- /proc이 표준 상태 인터페이스. /proc/kallsyms이 심볼 진입점.
- vmlinux + DWARF가 debug info의 기반.
- Tainted 커널은 *vanilla 재현* 필요.
- Magic SysRq는 지원·활성화된 경우 저수준 진단 명령을 제공하며, 완전 정지 상태에서도 항상 동작한다고 보장되지는 않습니다.
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
