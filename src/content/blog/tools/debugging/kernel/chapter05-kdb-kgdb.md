---
title: "kdb·kgdb 인터랙티브 커널 디버깅 — Source-level Step·Breakpoint"
slug: "tools/debugging/kernel/chapter05-kdb-kgdb"
date: 2026-05-25T09:05:00
description: "별 머신 또는 시리얼로 커널을 step-debug. kgdb 셋업, gdb 연결, 실전 흐름."
tags: [kernel, kgdb, kdb, serial, vm-debug]
series: "Kernel Debugging"
seriesOrder: 5
draft: false
topics: ["tools", "tools/debugging"]
---

ftrace·eBPF는 *관찰*만 합니다. 실행을 멈추고 변수를 들여다보려면 **kgdb**가 필요합니다. 커널은 자기 자신을 디버깅하면서 동시에 디버거의 입출력을 처리할 수 없으므로, 디버거는 시리얼 같은 별도 경로로 붙습니다. 이 장은 v6.12 소스로 KGDB를 켜고 빌드한 커널을 QEMU arm64 `virt`에서 띄우고, 호스트 Mac의 gdb와 타깃 콘솔의 kdb로 실제로 멈춰 본 기록입니다.

:::tldr
kgdb는 커널 안의 gdb stub이고, `kgdboc`가 그 stub을 시리얼 포트에 연결합니다. 진입은 SysRq `g`, 부팅 인자 `kgdbwait`, 또는 oops입니다. 배포판 커널에는 대개 꺼져 있어서 직접 빌드해야 합니다.
:::

## 두 가지 모드

| 모드 | 사용 |
|------|------|
| **kdb** | 타깃 콘솔에서 바로 쓰는 셸 (`bt`, `ps`, `md`, `lsmod` …) |
| **kgdb** | 호스트 gdb가 gdb remote protocol로 원격 연결 |

둘은 같은 디버그 코어 위에 있어서 함께 켤 수 있습니다. v6.12 `Documentation/dev-tools/kgdb.rst`(587~628행)에 따르면 kdb 프롬프트에서 `kgdb`를 치거나, kdb 프롬프트가 떠 있을 때 gdb를 연결하면 gdb가 처음 보내는 패킷을 알아보고 kgdb 모드로 바뀝니다. 이 장의 실습도 그렇게 kdb에서 gdb로 넘어갔습니다.

## 빌드 옵션

먼저 배포판 커널에 kgdb가 있는지 봅니다. Ch 1의 Debian 6.12 arm64 커널은 `/boot/config-6.12.116+deb13-arm64`에 `# CONFIG_KGDB is not set`이 있었습니다.

그래서 v6.12 소스(`linux-6.12.tar.xz`)를 게스트 안에서 `make defconfig`로 시작해 다음을 바꿔 빌드했습니다. 커널 이름은 `6.12.0-kdbg`입니다.

```text
CONFIG_KGDB=y
CONFIG_KGDB_SERIAL_CONSOLE=y
CONFIG_KGDB_KDB=y
CONFIG_KDB_KEYBOARD=y
CONFIG_KGDB_HONOUR_BLOCKLIST=y
CONFIG_CONSOLE_POLL=y
CONFIG_SERIAL_8250_PCI=y
CONFIG_DEBUG_INFO_DWARF5=y
# CONFIG_DEBUG_INFO_REDUCED is not set
CONFIG_GDB_SCRIPTS=y
CONFIG_FRAME_POINTER=y
# CONFIG_RANDOMIZE_BASE is not set
# CONFIG_ARM64_PTR_AUTH_KERNEL is not set
CONFIG_PREEMPT=y
CONFIG_KASAN=y            # Ch 7용
CONFIG_PROVE_LOCKING=y    # Ch 7용
```

kgdb.rst(56~92행)가 권하는 것은 `CONFIG_DEBUG_INFO`, `CONFIG_FRAME_POINTER`, 그리고 `CONFIG_KGDB_SERIAL_CONSOLE`입니다. 아래 세 줄은 첫 빌드에서 실패를 겪고 추가했습니다.

- **`CONFIG_DEBUG_INFO_REDUCED`**: arm64 `defconfig`는 이것을 켜 둡니다. 첫 빌드에서 커널의 gdb 스크립트가 `Reduced debug information will prevent GDB from having complete types.`라는 오류를 냈습니다.
- **`CONFIG_ARM64_PTR_AUTH_KERNEL`**: 역시 defconfig에서 켜져 있습니다. 첫 빌드에서 gdb `bt`가 둘째 프레임에서 `0x43ac80008047bf34 in ?? ()`, `Backtrace stopped: previous frame identical to this frame (corrupt stack?)`로 끊겼습니다. 복귀 주소의 위쪽 비트에 서명(PAC)이 들어가 있어서, 정상 커널 주소(`0xffff8000…`)로 보이지 않았던 것입니다. 끄고 다시 빌드하자 아래처럼 전체 스택이 나왔습니다.
- **`CONFIG_RANDOMIZE_BASE`**: kgdb.rst(374~380행)는 KASLR이 gdb의 심볼 해석을 혼란스럽게 하므로 끄라고 권합니다(부팅 인자 `nokaslr`도 같은 효과).

kgdb.rst(71~76행)는 `CONFIG_STRICT_KERNEL_RWX`가 software breakpoint를 막을 수 있으니 끄라고도 하지만, arm64에서는 이 옵션이 항상 켜져 있었습니다(`.config`에 `CONFIG_STRICT_KERNEL_RWX=y`). 그 영향은 아래 breakpoint 절에서 봅니다.

## QEMU + 자체 커널

QEMU `virt`의 PL011 UART(`ttyAMA0`)는 콘솔로 두고, kgdb용으로 PCI 16550 시리얼을 하나 더 달아 호스트 TCP 4460번에 연결했습니다. 디스크는 Ch 1의 Debian 루트 파일 시스템을 그대로 씁니다.

```bash
qemu-system-aarch64 -M virt,gic-version=3 -accel hvf -cpu host -smp 4 -m 4g \
  -kernel kdbg/Image -append "root=/dev/vda1 rw console=ttyAMA0 kgdboc=ttyS0,115200" \
  -drive if=none,id=d0,file=vm.qcow2,format=qcow2 -device virtio-blk-pci,drive=d0 \
  -nic user,model=virtio-net-pci,hostfwd=tcp:127.0.0.1:2252-:22 \
  -chardev socket,id=kg,host=127.0.0.1,port=4460,server=on,wait=off -device pci-serial,chardev=kg \
  -serial file:serial-kdbg.log -display none -monitor none
```

부팅 로그에서 kgdb가 그 포트를 잡은 것을 확인했습니다.

```text
[    0.412241] 0000:00:03.0: ttyS0 at I/O 0x10a0 (irq = 17, base_baud = 115200) is a 16550A
[    0.415226] KGDB: Registered I/O driver kgdboc
$ cat /sys/module/kgdboc/parameters/kgdboc
ttyS0,115200
```

부팅 인자의 뜻은 kgdb.rst의 해당 절에 있습니다.

- `kgdboc=ttyS0,115200`(131행 "Kernel parameter: kgdboc"): kgdb를 그 tty에 연결합니다.
- `kgdbwait`(300~312행): 부팅 중 디버거 연결을 기다립니다. I/O 드라이버가 built-in이어야 하고 `kgdboc=` 뒤에 와야 하며, 모듈이면 아무 일도 하지 않습니다. 이 장은 `kgdbwait`를 쓰지 않았습니다.
- `kgdbcon`(315행): gdb가 붙어 있는 동안 printk를 gdb로 보냅니다. kdb는 쓰지 않는 기능입니다.

## 호스트 gdb 연결

타깃에서 `echo g > /proc/sysrq-trigger`로 디버거에 들어간 뒤, 호스트 Mac의 `aarch64-elf-gdb`(GDB 18.1)로 연결했습니다. vmlinux의 소스 경로는 게스트의 `/root/linux-6.12`이므로 호스트의 같은 v6.12 트리로 바꿔 줍니다.

```text
$ aarch64-elf-gdb -q ./vmlinux
(gdb) set substitute-path /root/linux-6.12 /path/to/linux-6.12
(gdb) target remote 127.0.0.1:4460
arch_kgdb_breakpoint () at ./arch/arm64/include/asm/kgdb.h:21
21		asm ("brk %0" : : "I" (KGDB_COMPILED_DBG_BRK_IMM));
(gdb) bt
#0  arch_kgdb_breakpoint () at ./arch/arm64/include/asm/kgdb.h:21
#1  kgdb_breakpoint () at kernel/debug/debug_core.c:1221
#2  0xffff80008048e4a8 in sysrq_handle_dbg (key=<optimized out>) at kernel/debug/debug_core.c:986
#3  0xffff80008197150c in __handle_sysrq (key=103 'g', check_mask=check_mask@entry=false) at drivers/tty/sysrq.c:613
#4  0xffff800081972e10 in write_sysrq_trigger (file=<optimized out>, buf=<optimized out>, count=2, ppos=<optimized out>) at drivers/tty/sysrq.c:1182
#5  0xffff800080b36644 in pde_write (pde=0xffff0000c28e8140, file=0xffff0000c9d28000, buf=0xaaaac82b8c10 <error: Cannot access memory at address 0xaaaac82b8c10>, count=2, ppos=0xffff800089ae7d10) at fs/proc/inode.c:330
...
#7  0xffff8000809a3330 in vfs_write (file=file@entry=0xffff0000c9d28000, buf=buf@entry=0xaaaac82b8c10 <error: Cannot access memory at address 0xaaaac82b8c10>, count=count@entry=2, pos=pos@entry=0xffff800089ae7d10) at fs/read_write.c:681
...
#18 0xffff800080011d3c in el0t_64_sync () at arch/arm64/kernel/entry.S:598
```

`echo g`의 `write(2)`가 `__handle_sysrq(key=103 'g')`를 거쳐 `kgdb_breakpoint()`의 `brk` 명령에서 멈췄습니다. 인자 값과 소스 줄까지 user-space gdb와 같은 모양입니다. 사용자 공간 버퍼(`0xaaaac82b8c10`)는 gdb가 읽지 못했습니다.

### CPU와 task가 thread로 보인다

`info threads`는 CPU마다 `shadowCPUn` 스레드 하나, 그리고 모든 task를 하나씩 thread로 보여 줍니다. 아래는 첫 빌드에서 얻은 목록의 앞부분입니다.

```text
(gdb) info threads
  Id   Target Id                      Frame 
  1    Thread 4294967294 (shadowCPU0) cpuidle_idle_call () at kernel/sched/idle.c:186
  2    Thread 4294967293 (shadowCPU1) __daif_local_save_flags () at ./arch/arm64/include/asm/irqflags.h:82
  3    Thread 4294967292 (shadowCPU2) 0xffff8000831eab80 in default_idle_call () at kernel/sched/idle.c:125
  4    Thread 4294967291 (shadowCPU3) arch_kgdb_breakpoint () at ./arch/arm64/include/asm/kgdb.h:21
  5    Thread 1 (systemd)             __switch_to (prev=0xffff0000c0838000, next=0xffff0000c0938000) at arch/arm64/kernel/process.c:608
  6    Thread 2 (kthreadd)            __switch_to (prev=0xffff0000c0839cc0, next=0xffff0000c0938000) at arch/arm64/kernel/process.c:608
...
* 98   Thread 795 (bash)              arch_kgdb_breakpoint () at ./arch/arm64/include/asm/kgdb.h:21
```

세 CPU는 idle에서, 하나는 `echo g`를 실행한 bash에서 멈춰 있었습니다. Ch 1에서 본 roundup(`kernel/debug/debug_core.c:131~137`)이 다른 CPU를 모두 세운 결과입니다. 잠든 task는 모두 `__switch_to`에 있습니다. thread 번호를 바꿔 `bt`하면 그 task의 커널 스택을 봅니다.

### breakpoint

`do_sys_openat2`에 breakpoint를 걸고 계속 실행하자, 처음 파일을 연 것은 systemd(PID 1)였습니다.

```text
(gdb) break do_sys_openat2
Breakpoint 1 at 0xffff80008099a5d8: file fs/open.c, line 1401.
(gdb) continue
[Switching to thread 5 (Thread 1)]

Thread 5 hit Breakpoint 1, do_sys_openat2 (dfd=dfd@entry=-100, filename=0xffffc4d60338 <error: Cannot access memory at address 0xffffc4d60338>, how=how@entry=0xffff800087757d40) at fs/open.c:1401
1401	{
(gdb) bt 4
#0  do_sys_openat2 (dfd=dfd@entry=-100, filename=0xffffc4d60338 <error: Cannot access memory at address 0xffffc4d60338>, how=how@entry=0xffff800087757d40) at fs/open.c:1401
#1  0xffff80008099ad2c in do_sys_open (dfd=-100, filename=<optimized out>, flags=<optimized out>, mode=<optimized out>) at fs/open.c:1430
#2  __do_sys_openat (dfd=-100, filename=<optimized out>, flags=<optimized out>, mode=<optimized out>) at fs/open.c:1446
#3  __se_sys_openat (dfd=-100, filename=<optimized out>, flags=<optimized out>, mode=<optimized out>) at fs/open.c:1441
(gdb) p *how
$1 = {flags = 655616, mode = 0, resolve = 0}
```

커널 구조체(`*how`)는 읽혔지만 사용자 공간 문자열 `filename`은 이번에도 읽지 못했습니다. 파일 이름이 필요하면 Ch 3의 kprobe(`+0($arg2):ustring`)나 Ch 4의 bpftrace가 더 쉽습니다.

`next`는 기대대로 동작하지 않았습니다. gdb가 다음 줄에 임시 breakpoint를 넣지 못했다는 경고를 남기고, 실행이 인터럽트 진입 경로로 빠졌습니다.

```text
(gdb) next
el1_interrupt (regs=0xffff800087757b80, handler=0xffff8000800103e8 <gic_handle_irq>) at arch/arm64/kernel/entry-common.c:551
551			__el1_irq(regs, handler);
Warning:
Cannot insert breakpoint 0.
Cannot access memory at address 0xffff8000832e2ba8
```

`break`로 건 breakpoint는 동작했으므로, 이 커널에서 실용적인 방법은 멈추고 싶은 곳마다 `break`를 걸고 `continue`하는 것이었습니다. 단계 실행이 왜 실패했는지는 이 실행에서 더 조사하지 않았습니다. 위의 `STRICT_KERNEL_RWX` 권고와 관련이 있는지도 확인하지 않았습니다.

### 커널 gdb 스크립트

`CONFIG_GDB_SCRIPTS=y`로 빌드하면 `make scripts_gdb`가 `vmlinux-gdb.py`를 만들고, gdb에서 `lx-` 명령을 쓸 수 있습니다.

```text
(gdb) source vmlinux-gdb.py
(gdb) lx-version
Linux version 6.12.0-kdbg (root@localhost) (gcc (Debian 14.2.0-19) 14.2.0, GNU ld (GNU Binutils for Debian) 2.44) #2 SMP PREEMPT Mon Nov 16 10:40:59 UTC 2026
(gdb) lx-ps
      TASK          PID    COMM
0xffff8000850f4340   0   swapper/0
0xffff0000c0968000   1   systemd
0xffff0000c0969cc0   2   kthreadd
...
0xffff0000c9c19cc0  468  bash
0xffff0000ceb49cc0  469  sh
0xffff0000c99d9cc0  471  sleep
```

`$lx_current()` 함수는 이 조합(GDB 18.1, arm64)에서 `Argument to arithmetic operation not a number or boolean.`으로 실패했습니다.

## 실 하드웨어 + 시리얼

![KGDB serial link — host gdb ↔ target kgdb via USB-Serial cable](/images/blog/kernel-debug/diagrams/ch05-kgdb-serial-link.svg)

실제 보드에서는 타깃의 UART를 USB-시리얼 케이블로 호스트에 잇고, 호스트 gdb가 그 tty로 붙습니다. kgdb.rst(393행)의 kdb 예시 인자는 `console=ttyS0,115200 kgdboc=ttyS0,115200 nokaslr`로, 콘솔과 kgdb가 같은 포트를 씁니다. 이 장은 실 하드웨어로 실행하지 않았습니다.

```bash
# 호스트 (실기기에서는 이 장비를 쓰지 않았음)
gdb vmlinux
(gdb) set serial baud 115200
(gdb) target remote /dev/ttyUSB0
```

## 외부에서 kgdb 진입

### Method 1 — magic sysrq

```bash
echo g > /proc/sysrq-trigger
```

v6.12 `sysrq.rst`는 `g`를 "Used by kgdb (kernel debugger)"로 정의합니다. 위 스택의 `sysrq_handle_dbg()`(`kernel/debug/debug_core.c:986`)가 이 키의 처리기입니다.

### Method 2 — 부팅 시 wait

`kgdbwait`는 부팅 중 디버거를 기다립니다(위 인자 설명). 이 장은 실행하지 않았습니다.

### Method 3 — 코드에 명시 break

```c
#include <linux/kgdb.h>
kgdb_breakpoint();
```

위 `bt`의 #1 `kgdb_breakpoint () at kernel/debug/debug_core.c:1221`이 바로 이 함수입니다. SysRq `g`도 결국 이것을 부릅니다.

### Method 4 — oops

kgdb가 켜진 커널에서는 oops도 디버거로 들어갑니다. Ch 7의 atomic 문맥 실험 뒤 이 커널은 `kernel BUG at mm/vmalloc.c:3097!`로 oops를 냈고, 콘솔에는 다음이 찍힌 채 멈췄습니다.

```text
[  217.231696] kernel BUG at mm/vmalloc.c:3097!
[  217.231981] Internal error: Oops - BUG: 00000000f2000800 [#1] PREEMPT SMP
[  217.232371] KGDB: waiting... or $3#33 for KDB
```

이때 gdb를 붙이면 oops 순간의 스택이 그대로 보입니다.

```text
(gdb) bt 6
#0  __get_vm_area_node (size=size@entry=32768, align=align@entry=65536, shift=shift@entry=12, flags=34, ...) at mm/vmalloc.c:3097
#1  0xffff800080889254 in __vmalloc_node_range_noprof (...) at mm/vmalloc.c:3788
#2  0xffff800080165d88 in alloc_thread_stack_node (tsk=<optimized out>, node=<optimized out>) at kernel/fork.c:315
#3  dup_task_struct (orig=0xffff0000ceb49cc0, node=-1) at kernel/fork.c:1116
#4  copy_process (pid=pid@entry=0x0, trace=trace@entry=0, node=node@entry=-1, args=args@entry=0xffff800089dc7c70) at kernel/fork.c:2204
#5  0xffff800080168f10 in kernel_clone (args=args@entry=0xffff800089dc7c70) at kernel/fork.c:2786
```

3097행은 `BUG_ON(in_interrupt());`였습니다. bash가 fork하면서 스레드 스택을 vmalloc하는 경로였는데, 앞선 실험이 preempt count를 망가뜨린 탓에 커널이 인터럽트 문맥으로 착각한 것입니다. 원인과 첫 보고서는 Ch 7에서 봅니다.

## kdb 사용

gdb 없이 타깃의 kgdboc 포트에서 바로 쓰는 셸이 kdb입니다. 이 장에서는 TCP 4460번 포트에 스크립트로 붙어 명령을 보냈습니다. SysRq `g`를 쓰자 다음 프롬프트가 떴습니다.

```text
Entering kdb (current=0xffff0000c670d640, pid 390) on processor 0 due to Keyboard Entry
[0]kdb> bt
Stack traceback for pid 390
0xffff0000c670d640      390      389  1    0   R  0xffff0000c670eb70 *bash
CPU: 0 UID: 0 PID: 390 Comm: bash Tainted: G           O       6.12.0-kdbg #2
Tainted: [O]=OOT_MODULE
Hardware name: linux,dummy-virt (DT)
Call trace:
 dump_backtrace.part.0+0xd8/0xf0
 ...
 kgdb_breakpoint+0x3c/0xc0
 sysrq_handle_dbg+0x38/0x78
 __handle_sysrq+0x1fc/0x420
 write_sysrq_trigger+0x100/0x178
 ...
[0]kdb> ps
3 idle processes (state -) and 
74 sleeping system daemon (state [ims]) processes suppressed,
use 'ps A' to see all.
Task Addr               Pid   Parent [*] cpu State Thread             Command
0xffff0000c670d640      390      389  1    0   R  0xffff0000c670eb70 *bash
0xffff0000c0968000        1        0  0    0   S  0xffff0000c0969530  systemd
...
[0]kdb> lsmod
Module                  Size  modstruct     Used by
kdbg_demo               4096/    4096/       0/    8192  0xffff80007f6f28c0    0  (Live) ...
[0]kdb> md4c4 jiffies
0xffff8000850df200 fffeeeb3 00000000 00000000 00000000   ................
[0]kdb> dmesg 3
<4>[    5.232859] **********************************************************
<6>[    5.261902] kdbg_demo: loaded
<6>[   20.173979] sysrq: DEBUG
[0]kdb> go
```

`md4c4`는 "4바이트 단위로 4개"이고, `jiffies` 같은 심볼 이름을 주소 대신 쓸 수 있었습니다. `go`를 치자 시스템이 다시 돌았고, ssh 세션도 그대로 살아 있었습니다. `help`가 보여 준 명령 중 자주 쓰는 것을 추리면 다음과 같습니다(출력의 Description을 옮김).

| kdb 명령 | help의 설명 |
|----------|------|
| `bt [<vaddr>]` | Stack traceback |
| `btp <pid>` | Display stack for process <pid> |
| `bta [<state_chars>\|A]` | Backtrace all processes whose state matches |
| `btc` | Backtrace current process on each cpu |
| `ps [<state_chars>\|A]` | Display active task list |
| `cpu <cpunum>` | Switch to new cpu |
| `md <vaddr>` (`mdWcN`) | Display Memory Contents |
| `mds <vaddr>` | Display Memory Symbolically |
| `mm <vaddr> <contents>` | Modify Memory Contents |
| `rd` | Display Registers |
| `bp`·`bl`·`bc` | Set / Display / Clear breakpoints |
| `ss` | Single Step |
| `lsmod` | List loaded kernel modules |
| `dmesg [lines]` | Display syslog buffer |
| `summary` | Summarize the system |
| `ftdump` | Dump ftrace log |
| `kgdb` | Enter kgdb mode |
| `go [<vaddr>]` | Continue Execution |
| `reboot` | Reboot the machine immediately |

`ftdump`이 있다는 점이 눈에 띕니다. Ch 3의 ftrace 버퍼를, 시스템이 멈춘 상태에서 kdb로 꺼낼 수 있다는 뜻입니다. 이 장에서는 실행하지 않았습니다.

## ramoops — 사후 분석

kgdb를 붙일 수 없는 장비에서는 panic 직전 로그를 재부팅 뒤까지 남기는 pstore가 대안입니다. 메모리 영역에 남기는 백엔드가 ramoops이고, 설정은 v6.12 `Documentation/admin-guide/ramoops.rst`에 있습니다. Debian 6.12 커널은 `CONFIG_PSTORE=y`, `CONFIG_PSTORE_RAM=m`이고, 이 게스트에서는 대신 EFI 변수 백엔드인 `efi_pstore` 모듈이 로드돼 있었습니다(Ch 7의 `Modules linked in`). 이 장은 ramoops를 설정해 보지 않았습니다. 예약 메모리 주소와 크기는 보드의 메모리 맵에 맞춰 정해야 하는 값이라 여기서 예시 값을 싣지 않습니다.

## Ethernet transport

v6.12 트리에서 `kgdboe`라는 문자열은 `drivers/tty/serial/kgdboc.c`에만 있고 `Documentation/`에는 없습니다. mainline이 제공하는 I/O 드라이버는 시리얼(`kgdboc`)과 키보드 입력이며, 네트워크로 붙는 방법은 이 장의 범위 밖입니다.

## 실전 — 한 흐름

이 장에서 실제로 한 순서를 정리하면 다음과 같습니다.

1. 타깃: `echo g > /proc/sysrq-trigger` → kdb 프롬프트. `bt`, `ps`, `dmesg`로 빠르게 상태를 봅니다.
2. 호스트: `target remote` → kdb가 gdb 패킷을 보고 kgdb로 바뀜. `info threads`로 CPU와 task 확인.
3. 의심 함수에 `break`, `continue`. 멈추면 `bt`, `info args`, `p *구조체`.
4. 끝나면 `detach`. 타깃은 그대로 계속 돕니다.
5. oops가 나면 kgdb가 스스로 멈춰 기다리므로, 같은 방법으로 붙어 스택을 봅니다.

## kgdb의 한계

| 문제 | 이 장에서 확인한 것 |
|------|------|
| 배포판 커널에 없음 | Debian 6.12 arm64는 `CONFIG_KGDB` not set |
| 정지 중 시스템 전체가 멈춤 | roundup으로 모든 CPU 정지. 네트워크·타이머 모두 멈춤 |
| 사용자 공간 메모리 | `filename`, `buf` 같은 사용자 포인터는 gdb가 읽지 못함 |
| 단계 실행 | `next`가 임시 breakpoint를 넣지 못하고 인터럽트 경로로 빠짐 |
| arm64 PAC | 복귀 주소 서명 때문에 `bt`가 끊김. `ARM64_PTR_AUTH_KERNEL` 끔 |
| arm64 defconfig의 축소 debug info | 커널 gdb 스크립트가 거부. `DEBUG_INFO_REDUCED` 끔 |

평소에는 ftrace·eBPF로 보고, 재현할 수 있고 상태를 직접 만져 봐야 하는 버그에 kgdb를 씁니다. 운영 장비에서는 vmcore + crash/drgn(다음 장)이 더 현실적입니다.

## 자주 만나는 함정

| 증상 | 원인 (이 장에서 확인한 것) |
|------|------|
| `Remote replied unexpectedly to 'vMustReplyEmpty': timeout` | 타깃이 디버거 안에 있지 않음. SysRq `g`를 먼저 |
| `bt`가 `0x43ac… in ?? ()`에서 끊김 | arm64 PAC. `CONFIG_ARM64_PTR_AUTH_KERNEL` 끄고 재빌드 |
| `Reduced debug information will prevent GDB …` | `CONFIG_DEBUG_INFO_REDUCED=y` (arm64 defconfig 기본) |
| `Python Exception … No module named 'linux'` | `vmlinux-gdb.py`가 `scripts/gdb/`와 같은 트리 구조에 있어야 함 |
| 사용자 포인터가 `Cannot access memory` | kgdb에서 사용자 공간 메모리가 읽히지 않음. kprobe·bpftrace로 |
| `next` 후 `Cannot insert breakpoint 0.` | 단계 실행 대신 `break` + `continue` |

## 정리

- kgdb는 커널 안의 gdb stub이고 `kgdboc`가 시리얼에 연결합니다. kdb는 같은 stub 위의 콘솔 셸입니다.
- Debian 6.12 arm64 커널에는 KGDB가 없어 v6.12를 직접 빌드했습니다. arm64 defconfig에서는 `DEBUG_INFO_REDUCED`와 `ARM64_PTR_AUTH_KERNEL`도 꺼야 gdb가 제대로 동작했습니다.
- QEMU에서는 PCI 16550 하나를 TCP로 빼서 kgdb 전용으로 쓰면 콘솔과 섞이지 않습니다.
- 진입은 SysRq `g`, `kgdb_breakpoint()`, `kgdbwait`, 그리고 oops입니다.
- `break`/`continue`/`bt`/`p`는 user-space gdb처럼 동작했고, 사용자 공간 메모리와 `next`는 동작하지 않았습니다.

## 다음 장 예고

Ch 6 — crash + drgn. 멈춘 시스템이 아니라 저장된 vmcore를 사후 분석합니다.

## 관련 항목

- [Ch 4: eBPF for kernel debugging](/blog/tools/debugging/kernel/chapter04-ebpf-kernel)
- [Ch 6: crash + drgn](/blog/tools/debugging/kernel/chapter06-crash-drgn)
- [GDB and LLDB Ch 8: 원격 디버깅](/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging) — RSP 프로토콜
- [`Documentation/dev-tools/kgdb.rst` (v6.12)](https://www.kernel.org/doc/html/v6.12/dev-tools/kgdb.html)
- [`Documentation/admin-guide/ramoops.rst` (v6.12)](https://www.kernel.org/doc/html/v6.12/admin-guide/ramoops.html)
