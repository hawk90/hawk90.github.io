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

지금까지 다룬 GDB·Sanitizer·Valgrind는 모두 *user-space 프로세스*가 대상이었습니다. 커널 코드는 시스템 콜을 부른 프로세스의 커널 모드 실행 경로, 인터럽트, 커널 스레드에서 돕니다. `ptrace`로 프로세스 하나를 붙잡는 디버거와 달리, 커널을 조사하려면 실행 중인 커널과 정확히 같은 빌드의 심볼·디버그 정보와 추적 지점이 필요합니다. kgdb는 한 CPU가 디버거에 들어가면 나머지 CPU도 모두 멈춰 세웁니다. `kernel/debug/debug_core.c`(v6.12, 131~137행)는 이것을 *roundup*이라 부르고 기본값으로 켜 둡니다.

이 시리즈는 Linux 커널 디버깅의 전체 흐름을 다룹니다. 첫 장은 user/kernel 경계, `/proc` 인터페이스, 커널 심볼과 debug info가 어디에 있는지를 실제 시스템에서 확인합니다.

:::tldr
커널은 프로세스가 아니라서 `gdb -p`로 붙지 못합니다. 대신 printk·ftrace·eBPF로 안에서 보고, kgdb로 밖에서 멈추고, crash·drgn으로 사후에 봅니다. 어느 도구든 출발점은 `/proc/kallsyms`와 같은 빌드의 `vmlinux`입니다.
:::

## 실습 환경

이 시리즈의 출력은 모두 아래 환경에서 직접 실행해 얻었습니다. 소스 인용은 `linux-6.12.tar.xz`(kernel.org, `sha256sums.asc`로 검증) 기준 파일:줄입니다.

| 항목 | 값 |
|------|----|
| 호스트 | Apple Silicon Mac, QEMU 11.1.3 `-M virt -accel hvf -cpu host`, 4 vCPU, 4 GiB |
| 게스트 | Debian 13.7 arm64 (`debian-13-nocloud-arm64.qcow2`, `SHA512SUMS`로 검증) |
| 커널 | `6.12.116+deb13-arm64` (Debian 배포판 커널) |
| 디버그 정보 | `linux-image-6.12.116+deb13-arm64-dbg` 6.12.116-1 |

Debian 커널에 없는 기능(KGDB, KASAN, lockdep)은 Ch 5와 Ch 7에서 v6.12 소스로 따로 빌드한 커널로 확인합니다.

## User-space vs Kernel-space

경계를 가장 빨리 체감하는 방법은 주소를 보는 것입니다. v6.12 `Documentation/arch/arm64/memory.rst`(31~35행)의 4 KiB 페이지·48비트 VA 배치에서 사용자 공간은 `0000000000000000`~`0000ffffffffffff`, 커널 이미지가 놓이는 vmalloc 영역은 `ffff800080000000`부터입니다. 아래 표의 주소는 이 게스트에서 나온 값입니다. 사용자 쪽 예는 아래 Tainted 절의 WARN 덤프에서 레지스터 `x20`에 남아 있던 값입니다.

| | user-space | kernel-space |
|---|------------|--------------|
| 주소 예 (arm64) | `0000aaaaf0fa1200` (WARN 덤프의 `x20`) | `ffff8000804544d8` (`vfs_read`) |
| 정지 | `ptrace`로 대상 프로세스만 멈춤 | kgdb 진입 시 roundup으로 모든 CPU 정지 |
| 오류의 결과 | 해당 프로세스가 시그널로 종료 | oops(해당 task 종료) 또는 panic(시스템 정지) |
| 붙는 방법 | `gdb -p PID` | kgdb(별도 I/O 경로), 또는 vmcore 사후 분석 |
| 로그 | `printf`·stderr | `printk` → 커널 ring buffer |
| 메모리 할당 | `malloc` | `kmalloc`·`vmalloc`·`alloc_pages` |

같은 커널 자원 위에서 디버거가 돌기 때문에, 타깃이 멈추면 디버거의 입출력도 같이 멈춥니다. kgdb가 시리얼 같은 별도 경로를 요구하는 이유가 여기에 있습니다.

## Kernel 디버깅 도구

도구마다 커널 설정이 따로 필요합니다. 그래서 "어느 도구를 쓸까"보다 먼저 "지금 커널에 무엇이 켜져 있나"를 봅니다. 아래 표의 설정값은 이 게스트의 `/boot/config-6.12.116+deb13-arm64`에서 읽은 것입니다.

| 방법 | 용도 | 필요한 설정 | Debian 6.12 arm64 |
|------|------|-------------|-------------------|
| printk + dmesg | 로그 | 항상 있음 | `CONFIG_LOG_BUF_SHIFT=17` |
| dynamic_debug | `pr_debug` 런타임 토글 | `CONFIG_DYNAMIC_DEBUG` | `=y` |
| ftrace | 함수·이벤트 trace | `CONFIG_FUNCTION_TRACER` | `=y` |
| kprobe | 임의 함수 hook | `CONFIG_KPROBES`, `CONFIG_KPROBE_EVENTS` | `=y` |
| eBPF / bpftrace | 프로그래머블 trace | `CONFIG_BPF_SYSCALL`, `CONFIG_DEBUG_INFO_BTF` | `=y` |
| kdb / kgdb | 정지·step | `CONFIG_KGDB` | **not set** |
| kdump + crash | 사후 분석 | `CONFIG_KEXEC`, `CONFIG_CRASH_DUMP` | `=y` |
| drgn | 라이브·vmcore 분석 | `CONFIG_PROC_KCORE` + debug info | `=y` |
| KASAN / lockdep | 메모리·잠금 오류 검출 | `CONFIG_KASAN`, `CONFIG_PROVE_LOCKING` | **not set** |

배포판 커널은 운영용이라 kgdb와 KASAN·lockdep을 켜 두지 않았습니다. 관측 도구(printk·ftrace·eBPF)는 그대로 쓸 수 있고, 정지형 디버깅과 검출기는 별도 빌드가 필요합니다.

## /proc — 커널 상태의 표준 인터페이스

`/proc`는 커널이 상태를 파일 모양으로 내보내는 곳입니다. 숫자 디렉터리(PID)를 빼고 보면 이 게스트에는 다음이 있습니다.

```text
$ ls /proc | grep -v '^[0-9]' | column -c 100
acpi		driver		kallsyms	meminfo		slabinfo	uptime
buddyinfo	dynamic_debug	kcore		misc		softirqs	version
bus		execdomains	key-users	modules		stat		vmallocinfo
cgroups		fb		keys		mounts		swaps		vmstat
cmdline		filesystems	kmsg		net		sys		zoneinfo
consoles	fs		kpagecgroup	pagetypeinfo	sysrq-trigger
cpuinfo		interrupts	kpagecount	partitions	sysvipc
crypto		iomem		kpageflags	pressure	thread-self
devices		ioports		loadavg		schedstat	timer_list
diskstats	irq		locks		self		tty
```

이 시리즈에서 자주 쓰는 파일은 다음과 같습니다.

| 파일 | 내용 | 쓰는 장 |
|------|------|---------|
| `/proc/kallsyms` | 커널 심볼 테이블 | 이 장, Ch 7 |
| `/proc/modules` | 로드된 모듈(`lsmod`의 원본) | 이 장 |
| `/proc/sys/kernel/` | sysctl (`printk`, `tainted`, `sysrq`, `kptr_restrict`) | 이 장, Ch 2 |
| `/proc/sysrq-trigger` | Magic SysRq 명령 실행 | 이 장, Ch 6 |
| `/proc/kmsg` | 커널 로그를 읽어 *소비*하는 인터페이스. `dmesg`는 `/dev/kmsg`를 읽음 | Ch 2 |
| `/proc/kcore` | 실행 중 커널 메모리의 ELF core 뷰 (drgn 라이브 모드) | Ch 6 |
| `/proc/iomem` | 물리 주소 맵 (`Crash kernel` 예약 영역 확인) | Ch 6 |

## /proc/kallsyms — 심볼 진입점

`/proc/kallsyms`는 커널 이미지에 내장된 심볼 테이블입니다. 빌드 때 `scripts/link-vmlinux.sh`가 `scripts/kallsyms`로 만들어 넣으므로, 디버그 패키지가 없어도 함수 이름과 주소를 얻을 수 있습니다. 이 게스트에서는 17만 줄이 넘었습니다.

```text
$ grep -c '' /proc/kallsyms
176431
$ grep -E ' (kernel_clone|do_fork|_text|vfs_read)$' /proc/kallsyms
ffff800080000000 T _text
ffff8000800a6110 T kernel_clone
ffff8000804544d8 T vfs_read
```

`do_fork`는 결과에 없습니다. v6.12 `kernel/fork.c`에는 `do_fork`라는 이름이 남아 있지 않고 fork 경로의 중심 함수는 `kernel_clone()`입니다. 오래된 글의 함수 이름을 그대로 grep하면 이렇게 빈손이 되므로, 이름은 늘 실행 중인 커널에서 확인합니다.

각 줄은 `<주소> <type> <이름>`이고 type 문자는 `nm`의 표기를 따릅니다. 대문자는 전역, 소문자는 지역 심볼입니다([GNU binutils `nm` 문서](https://sourceware.org/binutils/docs/binutils/nm.html)). 이 게스트의 분포는 다음과 같았습니다.

```text
$ awk '{print $2}' /proc/kallsyms | sort | uniq -c | sort -rn
  76288 d
  36643 t
  27176 T
  22881 r
   6457 B
   3487 D
   3190 b
    250 W
     51 R
      4 a
      4 V
```

| type | 섹션 |
|------|------|
| `T` / `t` | text(코드) |
| `D` / `d` | 초기화된 data |
| `B` / `b` | BSS |
| `R` / `r` | read-only data |
| `W` | weak 심볼 |
| `a` | absolute 값 |

주소가 보이는지는 `kernel/ksyms_common.c`의 `kallsyms_show_value()`(v6.12, 28~43행)가 정합니다. `kptr_restrict`가 0이면 `perf_event_paranoid`가 1 이하일 때 누구에게나 보이고, 아니면 1일 때와 마찬가지로 `CAP_SYSLOG`가 있어야 보입니다. 2 이상이면 누구에게도 보이지 않습니다. 이 게스트는 `kptr_restrict=0`, `perf_event_paranoid=3`이라 root에게만 주소가 보였습니다.

```text
$ su nobody -s /bin/sh -c 'grep -E " (kernel_clone|vfs_read)$" /proc/kallsyms'
0000000000000000 T kernel_clone
0000000000000000 T vfs_read

# echo 2 > /proc/sys/kernel/kptr_restrict
# grep -E ' (kernel_clone|vfs_read)$' /proc/kallsyms
0000000000000000 T kernel_clone
0000000000000000 T vfs_read
```

`kptr_restrict=2`에서는 root도 0을 봅니다. 주소가 모두 0이면 `sudo`를 붙이기 전에 이 두 sysctl부터 확인합니다.

## Kernel 심볼과 debug info

`/proc/kallsyms`는 이름과 주소까지만 줍니다. 소스 줄, 구조체 배치, 지역 변수는 DWARF가 있는 `vmlinux`가 있어야 합니다. Debian은 이를 `linux-image-<버전>-dbg` 패키지로 나눠 둡니다. 설치 크기가 dpkg 기준 6,650,312 KB(약 6.3 GiB)라 미리 디스크를 확인합니다.

```text
# apt install linux-image-$(uname -r)-dbg
$ V=/usr/lib/debug/boot/vmlinux-$(uname -r)
$ file $V
/usr/lib/debug/boot/vmlinux-6.12.116+deb13-arm64: ELF 64-bit LSB shared object, ARM aarch64,
version 1 (SYSV), statically linked, BuildID[sha1]=fdeb5bdaa6e975728dacb60e2bb35a26047a16a4,
with debug_info, not stripped
$ readelf -S -W $V | grep -E '\.debug_|\.BTF'
  [14] .BTF              PROGBITS        ffff8000817b66e0 17c66e0 5607d1 00   A  0   0  1
  [15] .BTF_ids          PROGBITS        ffff800081d16eb4 1d26eb4 000d7c 00   A  0   0  1
  [37] .debug_aranges    PROGBITS        0000000000000000 240ba00 033260 00      0   0 16
  [38] .debug_info       PROGBITS        0000000000000000 243ec60 f6c6416 00      0   0  1
  [39] .debug_abbrev     PROGBITS        0000000000000000 11b05076 765717 00      0   0  1
  [40] .debug_line       PROGBITS        0000000000000000 1226a78d 1d726b5 00      0   0  1
  [41] .debug_frame      PROGBITS        0000000000000000 13fdce48 367ed0 00      0   0  8
  [42] .debug_str        PROGBITS        0000000000000000 14344d18 4a89a8 01  MS  0   0  1
  [43] .debug_line_str   PROGBITS        0000000000000000 147ed6c0 01c217 01  MS  0   0  1
  [44] .debug_loclists   PROGBITS        0000000000000000 148098d7 27184ac 00      0   0  1
  [45] .debug_rnglists   PROGBITS        0000000000000000 16f21d83 4efe41 00      0   0  1
```

파일은 400,565,808바이트이고, 그 대부분이 `.debug_info`(0xf6c6416, 약 247 MiB)입니다. `.BTF`는 `A`(alloc) 플래그가 있어 실행 중인 커널 메모리에도 올라가는 섹션이고, `.debug_*`는 디스크에만 있습니다. Ch 4의 bpftrace가 디버그 패키지 없이 구조체를 읽을 수 있는 것은 이 BTF 덕분입니다.

`vmlinux`의 심볼 주소는 `/proc/kallsyms`와 같았습니다. 이 둘이 같은 빌드라는 확인이 모든 주소 해석의 전제입니다.

```text
$ nm $V | grep -E ' (kernel_clone|vfs_read|_text)$'
ffff800080000000 T _text
ffff8000800a6110 T kernel_clone
ffff8000804544d8 T vfs_read
```

## Modules

모듈도 각자 ELF 파일(`.ko`, Debian은 `.ko.xz`로 압축)입니다. `lsmod`는 `/proc/modules`를 읽어 보여 줍니다.

```text
$ lsmod | head -5
Module                  Size  Used by
dm_mod                180224  0
vsock_loopback         12288  0
vmw_vsock_virtio_transport_common    61440  1 vsock_loopback
vsock                  57344  2 vmw_vsock_virtio_transport_common,vsock_loopback

$ modinfo cxl_pci | head -12
filename:       /lib/modules/6.12.116+deb13-arm64/kernel/drivers/cxl/cxl_pci.ko.xz
import_ns:      CXL
license:        GPL v2
description:    CXL: PCI manageability
alias:          pci:v*d*sv*sd*bc05sc02i10*
depends:        
intree:         Y
name:           cxl_pci
vermagic:       6.12.116+deb13-arm64 SMP mod_unload modversions aarch64
sig_id:         PKCS#7
signer:         Build time autogenerated kernel key
sig_key:        66:1F:AA:BB:D9:A4:9F:B2:B7:F9:07:E1:CC:2E:D7:1A:30:9B:E7:E0
```

`alias`의 `bc05sc02i10`은 `drivers/cxl/pci.c:956`의 `PCI_DEVICE_CLASS((PCI_CLASS_MEMORY_CXL << 8 | CXL_MEMORY_PROGIF), ~0)`가 만든 것입니다. `PCI_CLASS_MEMORY_CXL`은 0x0502(`include/linux/pci_ids.h:54`)이고 prog-if가 0x10입니다. Ch 8에서 `cxl_pci`가 언제 붙는지를 볼 때 이 값이 기준이 됩니다. 모듈의 디버그 정보도 같은 `-dbg` 패키지에 들어 있습니다.

```text
$ find /usr/lib/debug -name 'virtio_net*'
/usr/lib/debug/lib/modules/6.12.116+deb13-arm64/kernel/drivers/net/virtio_net.ko
```

## Tainted Kernel

커널은 "이 상태에서 난 버그는 재현·지원이 어렵다"는 표시를 비트마스크로 남깁니다. 버그 보고서를 받으면 가장 먼저 보는 값입니다. 깨끗하게 부팅한 이 게스트는 0이었습니다.

```text
$ cat /proc/sys/kernel/tainted
0
```

v6.12 `Documentation/admin-guide/tainted-kernels.rst`(85~103행)와 `kernel/panic.c`의 `taint_flags[]`(495~513행)에 정의된 비트는 19개입니다.

| 비트 | 문자 | 의미 |
|------|------|------|
| 0 | G/P | `G`: 독점 모듈 없음, `P`: 독점 모듈 로드 |
| 1 | F | 모듈 강제 로드 |
| 2 | S | 사양 밖 시스템에서 실행 |
| 3 | R | 모듈 강제 언로드 |
| 4 | M | Machine Check Exception |
| 5 | B | bad page 참조 |
| 6 | U | 사용자 공간이 요청한 taint |
| 7 | D | 최근 OOPS·BUG 발생 |
| 8 | A | ACPI table 덮어씀 |
| 9 | W | 커널 warning 발생 |
| 10 | C | staging 드라이버 로드 |
| 11 | I | 플랫폼 펌웨어 버그 우회 적용 |
| 12 | O | out-of-tree 모듈 로드 |
| 13 | E | 서명 없는 모듈 로드 |
| 14 | L | soft lockup 발생 |
| 15 | K | livepatch 적용 |
| 16 | X | 배포판용 보조 taint |
| 17 | T | randstruct 플러그인으로 빌드 |
| 18 | N | 커널 내 테스트 실행 |

이 시리즈에서 쓰는 실습 모듈 `kdbg_demo.ko`(debugfs 파일에 단어를 쓰면 NULL 역참조·WARN 등을 일으키는 out-of-tree 모듈)를 올리면 값이 바로 바뀝니다.

```text
# insmod /root/mod/kdbg_demo.ko
# cat /proc/sys/kernel/tainted
12288
# echo warn > /sys/kernel/debug/kdbg_demo/trigger
# cat /proc/sys/kernel/tainted
12800
```

12288은 4096(O) + 8192(E)이고, 12800은 거기에 512(W)가 더해진 값입니다. 서명하지 않은 모듈이 거부되지 않고 `E`만 남은 것은 이 커널이 `CONFIG_MODULE_SIG=y`이지만 `CONFIG_MODULE_SIG_FORCE`는 꺼져 있기 때문입니다. WARN 덤프에는 taint가 문자와 이름으로 함께 찍힙니다.

```text
CPU: 0 UID: 0 PID: 7761 Comm: bash Tainted: G           OE      6.12.116+deb13-arm64 #1  Debian 6.12.116-1
Tainted: [O]=OOT_MODULE, [E]=UNSIGNED_MODULE
```

`G`는 "독점 모듈이 없다"는 뜻의 기본 문자입니다. 이 줄을 받았다면 out-of-tree 모듈을 빼고 같은 증상이 나는지부터 확인합니다.

## sysrq — Magic SysRq

v6.12 `sysrq.rst`(9~10행)는 SysRq를 "완전히 잠기지 않은 한 커널이 무엇을 하고 있든 응답하는 키 조합"으로 설명합니다. 셸이 듣지 않을 때 "지금 모든 task가 어디서 자고 있나"를 덤프하는 마지막 수단으로 쓰는 이유입니다.

```bash
cat /proc/sys/kernel/sysrq            # 이 게스트: 438
echo m > /proc/sysrq-trigger          # 메모리 정보
echo w > /proc/sysrq-trigger          # D state(uninterruptible) task
echo t > /proc/sysrq-trigger          # 모든 task의 상태와 스택
echo l > /proc/sysrq-trigger          # 활성 CPU의 backtrace
echo c > /proc/sysrq-trigger          # 의도적 crash (Ch 6, 버릴 VM에서만)
echo b > /proc/sysrq-trigger          # sync 없이 즉시 재부팅 (데이터 손실)
```

438은 `CONFIG_MAGIC_SYSRQ_DEFAULT_ENABLE=0x01b6`에서 온 값입니다. v6.12 `Documentation/admin-guide/sysrq.rst`(20~46행)의 비트 정의로 풀면 0x2(log level)·0x4(keyboard)·0x10(sync)·0x20(remount ro)·0x80(reboot)·0x100(RT nice)이고, **0x8(process 덤프)은 빠져 있습니다**. 다만 같은 문서 44~46행에 따르면 이 마스크는 키보드 입력에만 적용되고, 관리자 권한으로 `/proc/sysrq-trigger`에 쓰는 명령은 항상 허용됩니다. 실제로 root로 `t`를 쓰자 덤프가 나왔습니다. task 106개가 찍혔고, sshd는 `ppoll`에서 자고 있었습니다.

```text
[  304.383583] task:sshd            state:S stack:0     pid:1062  tgid:1062  ppid:1      flags:0x00100004
[  304.383944] Call trace:
[  304.384034]  __switch_to+0xf4/0x168
[  304.384156]  __schedule+0x398/0xf10
[  304.384278]  schedule+0x30/0xf8
[  304.384387]  schedule_hrtimeout_range_clock+0x188/0x1a0
[  304.384567]  schedule_hrtimeout_range+0x1c/0x30
[  304.384723]  do_sys_poll+0x390/0x520
[  304.384871]  __arm64_sys_ppoll+0xb4/0x148
[  304.385011]  invoke_syscall+0x60/0xe0
```

`w`는 D state task가 없어서 `sysrq: Show Blocked State` 한 줄만 남겼습니다. `t` 한 번에 100개가 넘는 task 스택이 쏟아지므로, ring buffer(이 커널은 `CONFIG_LOG_BUF_SHIFT=17`, 128 KiB)가 덮여 앞쪽 부팅 로그가 사라질 수 있다는 점은 Ch 2에서 다룹니다.

## addr2line on vmlinux

크래시 로그의 `함수+오프셋`이나 주소를 소스 줄로 바꾸는 방법은 user-space와 같습니다. 인자로 `vmlinux`를 주는 점만 다릅니다.

```text
$ addr2line -e $V -f 0xffff8000804544d8
vfs_read
debian/build/build_arm64_none_arm64/fs/read_write.c:550
$ addr2line -e $V -f -i 0xffff800080454518
vfs_read
debian/build/build_arm64_none_arm64/fs/read_write.c:557
```

경로 앞의 `debian/build/build_arm64_none_arm64/`는 Debian 빌드 디렉터리입니다. 소스 트리에서는 `fs/read_write.c`로 읽으면 됩니다. KASLR이 켜진 커널이라면 런타임 주소에서 오프셋을 빼야 합니다. 이 게스트는 부팅 로그에 `KASLR disabled due to lack of seed`(`arch/arm64/kernel/kaslr.c:30`)가 찍혀 있었습니다. QEMU의 UEFI 펌웨어가 KASLR seed를 주지 않았기 때문이고, 그래서 `/proc/kallsyms`와 `nm` 주소가 같아 그대로 넣을 수 있었습니다. 모듈 주소는 `.ko`가 relocatable이라 이 방법이 통하지 않고, Ch 7의 `faddr2line`이나 `decode_stacktrace.sh`를 씁니다.

## kpatch / livepatch

livepatch는 실행 중인 커널의 함수를 패치 모듈로 바꿔 끼우는 기능입니다. 아키텍처 지원이 필요해서, v6.12에서 `select HAVE_LIVEPATCH`가 있는 것은 `arch/x86`, `arch/powerpc`, `arch/s390`, `arch/loongarch`의 Kconfig뿐입니다. arm64는 목록에 없고, 이 게스트에도 `/sys/kernel/livepatch`가 없었습니다. 그래서 이 시리즈는 livepatch를 실행하지 않았고, 지원 아키텍처에서의 사용법은 v6.12 `Documentation/livepatch/livepatch.rst`를 참고합니다. livepatch가 적용되면 위 taint 표의 `K` 비트가 켜집니다.

## 자주 만나는 함정

| 증상 | 원인 (이 장에서 확인한 것) |
|------|------|
| `/proc/kallsyms` 주소가 모두 0 | `CAP_SYSLOG` 없음, 또는 `kptr_restrict=2` (`kallsyms_show_value()`) |
| grep한 함수가 kallsyms에 없음 | 이름이 바뀜 (`do_fork` → `kernel_clone`) |
| `addr2line`이 `??`를 냄 | `vmlinux`가 실행 중인 커널과 다른 빌드. build-id를 대조 |
| 모듈 주소를 addr2line에 넣어도 안 맞음 | `.ko`는 relocatable. `faddr2line` 사용 (Ch 7) |
| `tainted`가 0이 아님 | 표의 비트로 분해. out-of-tree 모듈(`O`)이 흔한 원인 |
| SysRq 키가 안 먹는데 `/proc/sysrq-trigger`는 됨 | `kernel.sysrq` 마스크는 키보드 입력에만 적용 |

## debuginfo + debuginfod for kernel

[DWARF 시리즈의 debuginfod](/blog/tools/debugging/dwarf-elf/chapter06-split-dwarf-tools)는 커널에도 통합니다. build-id가 키이므로, 위 `file` 출력의 BuildID를 그대로 질의합니다. 이 게스트에 `debuginfod` 패키지를 설치하자 `/etc/debuginfod/elfutils.urls`에 `https://debuginfod.debian.net`이 들어 있었습니다.

```text
$ export DEBUGINFOD_URLS=https://debuginfod.debian.net
$ timeout 120 debuginfod-find debuginfo fdeb5bdaa6e975728dacb60e2bb35a26047a16a4
$ ls -la ~/.cache/debuginfod_client/fdeb5bdaa6e975728dacb60e2bb35a26047a16a4/
-rw------- 1 root root 41066496 Nov 16 09:47 debuginfo.sWbDnp
```

서버는 이 커널의 debuginfo를 내려주기 시작했지만, 2분 동안 41 MB를 받은 뒤 `timeout`에 걸려 끝났습니다(`vmlinux`는 400 MB). 장애 현장에서 처음 받는 상황이라면 이 시간을 계산에 넣어야 하고, 반복해서 볼 서버라면 `-dbg` 패키지를 미리 설치해 두는 편이 빠릅니다.

## 정리

- 커널은 `gdb -p`로 붙지 못합니다. 관측(printk·ftrace·eBPF), 정지(kgdb), 사후 분석(crash·drgn)으로 나눠 씁니다.
- 도구보다 커널 설정이 먼저입니다. Debian 6.12 arm64는 관측 도구는 모두 켜져 있고 KGDB·KASAN·lockdep은 꺼져 있습니다.
- `/proc/kallsyms`의 주소 공개는 `kptr_restrict`와 `CAP_SYSLOG`가 정합니다. 함수 이름은 실행 중인 커널에서 확인합니다.
- 소스 줄과 구조체는 같은 build-id의 `vmlinux`(Debian `-dbg`, 약 6.3 GiB 설치)가 있어야 얻습니다.
- taint 값은 비트로 분해합니다. out-of-tree 모듈 하나로 `OE`가 붙습니다.
- `kernel.sysrq` 마스크는 키보드에만 적용되고, `/proc/sysrq-trigger`는 root에게 항상 열려 있습니다.

## 다음 장 예고

Ch 2 — printk + dmesg + dynamic_debug. log level, ring buffer 크기, ratelimit, 재컴파일 없는 `pr_debug` 토글을 같은 게스트에서 확인합니다.

## 관련 항목

- [Ch 2: printk / dmesg / dynamic_debug](/blog/tools/debugging/kernel/chapter02-printk-dmesg)
- [DWARF and ELF Internals](/blog/tools/debugging/dwarf-elf/chapter01-elf-overview)
- [Linux Kernel Documentation — Development tools](https://www.kernel.org/doc/html/v6.12/dev-tools/index.html)
- [`Documentation/admin-guide/tainted-kernels.rst`](https://www.kernel.org/doc/html/v6.12/admin-guide/tainted-kernels.html)
- [`Documentation/admin-guide/sysrq.rst`](https://www.kernel.org/doc/html/v6.12/admin-guide/sysrq.html) — Magic SysRq
- `man 5 proc` — /proc 전체
