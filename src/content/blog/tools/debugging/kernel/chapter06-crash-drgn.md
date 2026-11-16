---
title: "crash와 drgn 분석 — vmcore에서 커널 상태 복원하기"
slug: "tools/debugging/kernel/chapter06-crash-drgn"
date: 2026-05-25T09:06:00
description: "kdump로 만든 vmcore를 사후 분석. crash 명령, drgn Python API, 실전 흐름."
tags: [kernel, crash, drgn, vmcore, kdump]
series: "Kernel Debugging"
seriesOrder: 6
draft: false
topics: ["tools", "tools/debugging"]
---

커널 panic 뒤 시스템은 재부팅됐고 재현은 안 됩니다. 이때 남은 증거가 커널 메모리 전체를 담은 vmcore입니다. user-space에서 `gdb exe core`로 core dump를 보듯, 커널에서는 **crash**와 **drgn**으로 vmcore를 봅니다. 이 장은 같은 Debian 13.7 arm64 게스트(커널 `6.12.116+deb13-arm64`)에서 실습 모듈 `kdbg_demo.ko`로 NULL 역참조 panic을 실제로 일으키고, 그 vmcore를 열어 본 기록입니다. 도구 버전은 crash 8.0.6, makedumpfile 1.7.6, kdump-tools 1.10.7, drgn 0.0.31(Debian 패키지)과 0.3.0(pip)입니다.

:::tldr
vmcore + 같은 빌드의 `vmlinux`가 있으면 panic 순간의 task·스택·메모리를 다시 읽을 수 있습니다. 다만 이 게스트에서는 kdump가 0바이트 덤프를 남겼고, QEMU로 받은 덤프는 crash에 옵션 두 개를 줘야 열렸습니다. "덤프가 실제로 열리는지"를 장애 전에 확인해 두는 것이 이 장의 결론입니다.
:::

## kdump 셋업

kdump는 미리 예약한 메모리에 두 번째 커널(capture kernel)을 올려 두었다가, panic하면 그 커널로 넘어가 첫 커널의 메모리를 `/proc/vmcore`로 읽어 저장하는 구조입니다.

### 활성화

Debian에서는 패키지 하나로 시작합니다.

```text
# apt install kdump-tools crash makedumpfile
# cat /etc/default/grub.d/kdump-tools.cfg
GRUB_CMDLINE_LINUX_DEFAULT="$GRUB_CMDLINE_LINUX_DEFAULT crashkernel=2G-4G:320M,4G-32G:512M,32G-64G:1024M,64G-128G:2048M,128G-:4096M"
```

설치가 GRUB 설정에 `crashkernel=` 범위 문법을 넣어 둡니다. v6.12 `Documentation/admin-guide/kdump/kdump.rst`(286~298행)의 문법으로 읽으면 RAM이 2~4 GB면 320 MB, 4~32 GB면 512 MB를 예약하라는 뜻입니다. 재부팅 뒤 4 GB 게스트에서는 512 MB가 잡혔습니다.

```text
$ grep -i crash /proc/iomem
  dc000000-fbffffff : Crash kernel
# kdump-config show
DUMP_MODE:		kdump
USE_KDUMP:		1
KDUMP_COREDIR:		/var/crash
crashkernel addr: 0xdc000000
   /var/lib/kdump/vmlinuz: symbolic link to /boot/vmlinuz-6.12.116+deb13-arm64
...
current state:    ready to kdump
...
kexec command:
  /sbin/kexec -p --command-line="BOOT_IMAGE=/boot/vmlinuz-6.12.116+deb13-arm64 root=PARTUUID=... ro reset_devices systemd.unit=kdump-tools-dump.service nr_cpus=1" --initrd=/var/lib/kdump/initrd.img /var/lib/kdump/vmlinuz
```

capture kernel은 `nr_cpus=1`과 `systemd.unit=kdump-tools-dump.service`로 부팅해 덤프만 저장하고 다시 재부팅합니다.

### kdump가 바꾸는 것: panic_on_oops

kdump-tools는 서비스를 시작할 때 `kernel.panic_on_oops=1`을 씁니다(`/usr/sbin/kdump-config`의 `apply_panic_triggers()`, 617~626행). Ch 2에서 본 것처럼 원래 oops는 해당 task만 죽이지만, kdump를 켠 뒤에는 **oops가 곧 panic이고 재부팅**입니다. 이 장의 실습에서도 그랬습니다. 실습 모듈의 NULL 역참조를 일으키자 게스트가 바로 capture kernel로 넘어갔습니다.

```text
[   69.806907] Internal error: Oops: 0000000096000004 [#1] SMP
...
[   69.808661] CPU: 3 UID: 0 PID: 7259 Comm: sh Kdump: loaded Tainted: G           OE      6.12.116+deb13-arm64 #1  Debian 6.12.116-1
...
[   69.815487] Starting crashdump kernel...
[   69.815629] Bye!
[    0.000000] Booting Linux on physical CPU 0x0000000003 [0x610f0000]
```

CPU 줄에 `Kdump: loaded`가 찍혀 있으면 이 상태입니다. 디버그용 out-of-tree 모듈을 시험하는 장비에서 kdump를 켤 때는 이 동작을 알고 켜야 합니다.

### 이 게스트에서 kdump는 0바이트를 남겼다

capture kernel의 로그는 다음과 같았습니다.

```text
kdump-tools[479]: running makedumpfile --dump-dmesg /proc/vmcore /var/crash/202611161015/dmesg.202611161015.
kdump-tools[496]: calculate_plat_config: PAGE SIZE 0x1000 and VA Bits 52 not supported
kdump-tools[496]: get_machdep_info_arm64: Can't determine platform config values
kdump-tools[496]: makedumpfile Failed.
kdump-tools[479]: kdump-tools: makedumpfile --dump-dmesg failed. dmesg content will be unavailable ... failed!
kdump-tools[479]: running makedumpfile -F -c -d 31 /proc/vmcore | compress > /var/crash/202611161015/dump-incomplete.
kdump-tools[500]: calculate_plat_config: PAGE SIZE 0x1000 and VA Bits 52 not supported
kdump-tools[500]: makedumpfile Failed.
kdump-tools[479]: kdump-tools: saved vmcore in /var/crash/202611161015.
```

```text
$ ls -la /var/crash/202611161015/
-rw-r--r-- 1 root root    0 Nov 16 10:15 dump.202611161015
```

Debian 6.12 arm64 커널은 `CONFIG_ARM64_VA_BITS_52=y`로 빌드돼 있고, makedumpfile 1.7.6은 4 KiB 페이지 + 52비트 VA 조합을 처리하지 못했습니다. 그런데도 kdump-tools는 "saved vmcore"라고 기록하고 0바이트 파일을 남겼습니다. **kdump가 "ready"라고 해서 덤프가 생기는 것은 아니므로**, 설치한 뒤 버릴 VM에서 한 번 crash를 일으켜 파일 크기와 열림을 확인해야 합니다. 실패 메시지는 dump level과 상관없는 아키텍처 판별 함수(`get_machdep_info_arm64`)에서 나왔고, 필터 없이 dmesg만 뽑는 `--dump-dmesg`도 같은 메시지로 실패했습니다. 그래서 `/etc/default/kdump-tools`의 `MAKEDUMP_ARGS`(기본 `-c -d 31`)를 바꾸는 것으로는 해결되지 않았습니다.

### 강제 패닉 테스트와 QEMU 덤프 (폐기 가능한 VM에서만)

kdump 대신 이 장은 QEMU가 게스트 메모리를 통째로 저장하는 기능으로 vmcore를 만들었습니다. [Postmortem Ch 5](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)와 같은 방식입니다. 게스트는 `-device vmcoreinfo`를 붙여 띄웠습니다. QEMU 문서("VMCoreInfo device")에 따르면 이 장치는 게스트가 덤프용 정보를 적어 둘 fw_cfg 항목(`etc/vmcoreinfo`)을 만들고, 게스트 커널의 `qemu_fw_cfg` 드라이버가 거기에 VMCOREINFO 노트의 물리 주소를 씁니다(`drivers/firmware/qemu_fw_cfg.c:323~341`의 `fw_cfg_write_vmcoreinfo()`). 그리고 kdump 서비스는 멈추고 `panic_on_oops`만 켜서 panic 상태로 멈춰 있게 했습니다.

```text
# systemctl stop kdump-tools        # current state: Not ready to kdump
# sysctl -w kernel.panic_on_oops=1
# insmod /root/mod/kdbg_demo.ko
# echo null > /sys/kernel/debug/kdbg_demo/trigger
...
[   18.738137] Kernel panic - not syncing: Oops: Fatal exception
[   19.328476] ---[ end Kernel panic - not syncing: Oops: Fatal exception ]---
```

`kernel.panic`가 0이라 게스트는 panic 상태로 멈춰 있습니다. 호스트에서 QMP로 메모리를 받았습니다.

```text
$ qmp.py 4451 '{"execute":"dump-guest-memory","arguments":{"paging":false,"protocol":"file:.../vmcore-null.elf"}}'
EVENT ... "event": "DUMP_COMPLETED", "data": {"result": {"total": 2147483648, "status": "completed", "completed": 2147483648}}
$ file vmcore-null.elf
vmcore-null.elf: ELF 64-bit LSB core file, ARM aarch64, version 1 (SYSV), SVR4-style
$ readelf -n vmcore-null.elf | grep VMCOREINFO
  VMCOREINFO           0x00000d49	Unknown note type: (0x00000000)
```

2 GiB 게스트라 덤프도 2 GiB(2,147,491,231바이트)였습니다. makedumpfile의 `-d 31`처럼 0 페이지·캐시·사용자 페이지·free 페이지(`makedumpfile(8)`의 dump level 1+2+4+8+16)를 빼는 필터는 이 방식에는 없습니다.

## crash — 전통 도구

crash는 gdb를 품은 커널 전용 분석기입니다. 같은 빌드의 디버그 `vmlinux`와 덤프 파일을 인자로 줍니다. 이 QEMU 덤프는 그냥 열면 실패했습니다.

```text
# crash -s /usr/lib/debug/boot/vmlinux-6.12.116+deb13-arm64 /root/vmcore-null.elf
crash: seek error: kernel virtual address: ffff00007f9ab090  type: "IRQ stack pointer"
...
crash: seek error: kernel virtual address: ffff00007fa38880  type: "memory section root table"
```

[Postmortem Ch 5](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)에서도 crash 8.0.6은 같은 종류의 QEMU 덤프를 열지 못했습니다. 이번에는 원인을 좁혀 봤습니다. VMCOREINFO 노트에는 `NUMBER(VA_BITS)=52`와 `NUMBER(TCR_EL1_T1SZ)=0x10`(실제로는 64−16=48비트)이 함께 들어 있었고, oops의 `user pgtable: 4k pages, 48-bit VAs` 줄도 48비트였습니다. 즉 52비트로 빌드한 커널이 이 CPU에서는 48비트로 돌고 있었습니다. crash에 실제 VA 비트 수와 물리 메모리 시작 주소(`readelf -lW`의 PT_LOAD가 `0x40000000`)를 직접 주자 열렸습니다.

```text
# crash -s --machdep vabits_actual=48 --machdep phys_offset=0x40000000 \
    /usr/lib/debug/boot/vmlinux-6.12.116+deb13-arm64 /root/vmcore-null.elf
NOTE: setting vabits_actual to: 48
NOTE: setting phys_offset to: 0x40000000
WARNING: cpu 1: invalid NT_PRSTATUS note (n_type != NT_PRSTATUS)
WARNING: cpu 0: cannot find NT_PRSTATUS note
...
      KERNEL: /usr/lib/debug/boot/vmlinux-6.12.116+deb13-arm64  [TAINTED]
    DUMPFILE: /root/vmcore-null.elf
        CPUS: 4 [OFFLINE: 3]
        DATE: Mon Nov 16 10:18:00 UTC 2026
      UPTIME: 00:00:34
LOAD AVERAGE: 1.04, 0.23, 0.08
       TASKS: 106
    NODENAME: localhost
     RELEASE: 6.12.116+deb13-arm64
     VERSION: #1 SMP Debian 6.12.116-1 (2026-11-07)
     MACHINE: aarch64  (unknown Mhz)
      MEMORY: 2 GB
       PANIC: "Kernel panic - not syncing: Oops: Fatal exception" (check log for details)
```

panic 문자열, 시각, task 수가 바로 나옵니다. `OFFLINE: 3`은 panic 경로가 다른 CPU를 멈춰 세운 결과(`SMP: stopping secondary CPUs`)입니다. NT_PRSTATUS 경고는 아래 `bt`에 영향을 줍니다.

### 기본 명령

이 덤프에서 실행한 명령과 결과입니다.

| 명령 | 결과 |
|------|------|
| `sys` | 위 요약 |
| `log \| tail -45` | panic 직전 dmesg. oops 전문과 `Kernel panic` 줄이 그대로 나옴 |
| `ps \| grep bash` | `>     737       1   1  ffff00000615ca00  RU   0.1     4336     2168  bash` (`>`가 panic한 task) |
| `bt` | `PID: 737 TASK: ffff00000615ca00 CPU: 1 COMMAND: "bash"` 한 줄만. 레지스터 노트를 못 읽어 프레임 없음 |
| `mod -s kdbg_demo /root/mod/kdbg_demo.ko` | 모듈 심볼 적재 |
| `dis -l kdbg_read_value.constprop.0` | 아래 |
| `kmem -i` | 메모리 요약 (`TOTAL MEM 421581 pages, 1.6 GB`) |
| `foreach UN bt` | 출력 없음 (D state task 없음) |
| `p jiffies` | `jiffies = $1 = 4294900866` |

`bt`가 비는 것은 crash가 QEMU 덤프의 CPU 레지스터 노트를 인식하지 못했기 때문입니다(위 `NT_PRSTATUS` 경고). 스택은 아래 drgn으로 얻었습니다. kdump 덤프와 비교해 보고 싶었지만 이 게스트에서는 kdump 덤프가 0바이트라 비교하지 못했습니다.

### 한 예 — panic 원인 추적

`log`가 보여 준 oops의 `pc`는 `kdbg_read_value.constprop.0+0xc/0x20`이었습니다. 모듈 심볼을 올리고 그 함수를 디스어셈블하면 범인 명령이 보입니다.

```text
crash> mod -s kdbg_demo /root/mod/kdbg_demo.ko
     MODULE       NAME                                  TEXT_BASE         SIZE  OBJECT FILE
ffff80007a944140  kdbg_demo                          ffff80007a925000    16384  /root/mod/kdbg_demo.ko 
crash> dis -l kdbg_read_value.constprop.0
0xffff80007a925448 <kdbg_read_value.constprop.0>:	mov	x9, x30
0xffff80007a92544c <kdbg_read_value.constprop.0+4>:	nop
0xffff80007a925450 <kdbg_read_value.constprop.0+8>:	mov	x0, #0x0                   	// #0
0xffff80007a925454 <kdbg_read_value.constprop.0+12>:	ldr	x0, [x0, #8]
0xffff80007a925458 <kdbg_read_value.constprop.0+16>:	ret
```

`+12`(= `+0xc`)는 `ldr x0, [x0, #8]`이고, 바로 앞에서 `x0`에 0을 넣었습니다. 컴파일러가 상수 인자(`NULL`)를 함수 안으로 접어 넣은 사본(`.constprop.0`)이라 `mov x0, #0x0`이 그대로 보입니다. oops의 `virtual address 0000000000000008`과 `#8`이 일치하므로, NULL 구조체의 오프셋 8 필드를 읽었다는 결론입니다. 실습 모듈의 `struct kdbg_item`에서 오프셋 8은 `value`입니다. 앞의 `mov x9, x30; nop` 두 명령은 ftrace 진입 패치 자리입니다. `arch/arm64/kernel/ftrace.c`(v6.12, 72~89행) 주석대로 컴파일러가 넣은 NOP 두 개 중 첫째는 `MOV X9, LR`로 바뀌고, 둘째는 추적을 켤 때 `BL`로 바뀝니다.

### list 순회 — 자료구조

crash의 `list`는 커널 연결 리스트를 따라가며 멤버를 찍습니다. `-h`로 시작 구조체 주소를 줍니다. `init_task`(swapper/0)의 주소는 `ps`에서 `ffff800082059580`이었습니다.

```text
crash> list task_struct.tasks -s task_struct.comm -h ffff800082059580 | head -12
ffff800082059580
  comm = "swapper/0\000\000\000\000\000\000",
ffff000000213780
  comm = "systemd\000\000\000\000\000\000\000\000",
ffff000000211280
  comm = "kthreadd\000\000\000\000\000\000\000",
ffff000000210000
  comm = "pool_workqueue_",
ffff000000214a00
  comm = "kworker/R-kvfre",
ffff000000212500
  comm = "kworker/R-rcu_g",
```

같은 명령을 `-H init_task.tasks`로 쓰자 `list: invalid argument: init_task.tasks`로 거부됐습니다. `-H`는 심볼 이름이 아니라 list_head 주소를 받습니다.

## drgn — Python 기반 모던 도구

[drgn](https://github.com/osandov/drgn)은 vmcore나 실행 중인 커널을 Python 객체로 읽게 해 주는 디버거입니다. Debian 13 패키지(`python3-drgn` 0.0.31)는 이 QEMU 덤프에서 첫 변수 읽기부터 실패했습니다.

```text
_drgn.FaultError: recursive address translation; page table may be missing from core dump: 0xffff800081d27800
```

빌드 의존성을 설치한 뒤 pip로 빌드한 0.3.0은 같은 파일을 옵션 없이 열었습니다.

```text
$ /root/venv/bin/drgn --version
drgn 0.3.0 (using Python 3.13.5, elfutils 0.192, without debuginfod (dlopen),
without json-c, with libkdumpfile, with lzma, without pcre2)
```

### 진입

```bash
drgn -c vmcore-null.elf -s /usr/lib/debug/boot/vmlinux-$(uname -r) -s /root/mod/kdbg_demo.ko   # vmcore
drgn                                                                                      # 실행 중인 커널 (/proc/kcore)
```

옵션 없이 `drgn`만 실행하면 실행 중인 커널에 붙고, `/usr/lib/debug`의 디버그 정보를 스스로 찾았습니다.

### 패닉 분석 스크립트

아래 스크립트를 vmcore에 대고 실행했습니다(일부 발췌).

```python
from drgn.helpers.linux.printk import get_dmesg
from drgn.helpers.linux.pid import for_each_task, find_task
from drgn.helpers.linux.sched import task_state_to_char, cpu_curr
from drgn.helpers.linux.cpumask import for_each_online_cpu

print("panic_on_oops =", prog["panic_on_oops"].value_())
lines = get_dmesg(prog).decode().splitlines()
print("\n".join(l for l in lines if "kdbg_demo: about" in l or "Kernel panic" in l))

tr = prog.crashed_thread().stack_trace()
for i, f in enumerate(tr):
    if i > 13:
        print("  ... (%d frames total)" % len(tr)); break
    print(f)

for cpu in for_each_online_cpu(prog):
    c = cpu_curr(prog, cpu)
    print("CPU", cpu, c.comm.string_().decode(), c.pid.value_())
bits = [b for b in range(19) if prog["tainted_mask"].value_() >> b & 1]
print("taint bits:", bits)
D = [t.comm.string_().decode() for t in for_each_task(prog) if task_state_to_char(t) == "D"]
print("D-state tasks:", D)
```

```text
panic_on_oops = 1
[   18.525571] kdbg_demo: about to read it->value from NULL
[   18.738137] Kernel panic - not syncing: Oops: Fatal exception
[   19.328476] ---[ end Kernel panic - not syncing: Oops: Fatal exception ]---
crashed thread tid 737
#0 at 0xffff800080efe4a0 (__delay+0x58/0xcc) in __delay at arch/arm64/lib/delay.c:59:11
#1 at 0xffff800080efe54c (__const_udelay+0x2c/0x38) in __const_udelay at arch/arm64/lib/delay.c:70:2
#2 at 0xffff800080f2e7dc (panic+0x364/0x374) in panic at kernel/panic.c:530:3
#3 at 0xffff80008001fe6c (die+0x284/0x2b0) in die at arch/arm64/kernel/traps.c:234:3
#4 at 0xffff800080f2de38 (die_kernel_fault+0x4c8/0x4d8) in die_kernel_fault at arch/arm64/mm/fault.c:316:2
#5 at 0xffff8000800362ac (__do_kernel_fault+0x1c4/0x1c4) in __do_kernel_fault at arch/arm64/mm/fault.c:409:2
#6 at 0xffff800080f55900 (do_page_fault+0x200/0x5a4) in do_page_fault at arch/arm64/mm/fault.c:742:2
#7 at 0xffff800080f55d04 (do_translation_fault+0x5c/0x6c) in do_translation_fault at arch/arm64/mm/fault.c:753:10
#8 at 0xffff800080035fd0 (do_mem_abort+0x48/0x98) in do_mem_abort at arch/arm64/mm/fault.c:890:7
#9 at 0xffff800080f431c0 (el1_abort+0x40/0x64) in el1_abort at arch/arm64/kernel/entry-common.c:477:2
#10 at 0xffff800080f44de0 (el1h_64_sync_handler+0x50/0xdc) in el1h_64_sync_handler at arch/arm64/kernel/entry-common.c:575:3
#11 at 0xffff800080011284 (el1h_64_sync+0x64/0x68) at arch/arm64/kernel/entry.S:593
#12 at 0xffff80007a925454 (kdbg_read_value.constprop.0+0xc/0x14) in kdbg_read_value at /root/mod/kdbg_demo.c:24:11
#13 at 0xffff80007a925454 (kdbg_read_value.constprop.0+0xc/0x14) in kdbg_read_value at /root/mod/kdbg_demo.c:24:11
  ... (1024 frames total)
CPU 1 bash 737
taint bits: [7, 9, 12, 13]
D-state tasks: []
```

crash가 못 읽은 스택이 drgn에서는 소스 줄까지 나왔습니다. panic 경로(`die` → `panic`, `traps.c:234`는 Ch 2에서 본 `panic_on_oops` 분기)와 예외 진입(`el1h_64_sync`), 그리고 범인인 `kdbg_demo.c:24`(`return it->value;`)가 순서대로 보입니다. #13부터는 같은 프레임이 1,024개까지 반복됐고, drgn은 그 위의 호출자로 넘어가지 못했습니다. 실제 호출자(`trigger_write`)는 dmesg의 Call trace에 있었으므로, 모듈 프레임 위쪽은 `log` 출력과 함께 읽습니다.

taint 비트 7(D), 9(W), 12(O), 13(E)은 Ch 1의 표로 읽으면 "oops 발생, warning, out-of-tree, 서명 없는 모듈"입니다.

### vs crash

이 장에서 같은 덤프로 비교한 결과입니다.

| | crash 8.0.6 | drgn 0.0.31 (Debian) | drgn 0.3.0 (pip) |
|---|-------|------|------|
| QEMU ELF 덤프 열기 | `--machdep vabits_actual=48 phys_offset=0x40000000` 필요 | 실패 (`FaultError`) | 옵션 없이 성공 |
| panic task 스택 | 프레임 없음 (`NT_PRSTATUS` 미인식) | — | 소스 줄까지 |
| dmesg | `log` | — | `get_dmesg()` |
| 디스어셈블 | `dis -l` | — | (Python에서 직접 하지 않음) |
| 라이브 커널 | `/proc/kcore`로 성공 (아래) | 성공 | — |
| 자동화 | 명령 파일을 stdin으로 | Python 스크립트 | Python 스크립트 |

## 라이브 디버깅 — drgn on /proc/kcore

drgn은 덤프 없이 실행 중인 커널을 읽습니다. 장애 중인 서버를 재부팅하기 전에 상태를 떠 두는 용도입니다. 같은 게스트에서 Debian 패키지판으로 실행했습니다.

```python
from drgn.helpers.linux.pid import for_each_task
from drgn.helpers.linux.cpumask import for_each_online_cpu
from drgn.helpers.linux.sched import cpu_curr
from drgn.helpers.linux.fs import d_path, for_each_file

for cpu in for_each_online_cpu(prog):
    t = cpu_curr(prog, cpu)
    print("CPU", cpu, t.comm.string_().decode(), t.pid.value_())
sshd = [t for t in for_each_task(prog) if t.comm.string_() == b"sshd"][0]
for fd, f in for_each_file(sshd):
    print(" fd", fd, d_path(f.f_path).decode())
print(prog.stack_trace(sshd))
```

```text
CPU 0 cc1 5823
CPU 1 cc1 5799
CPU 2 cc1 5817
CPU 3 drgn 5723
 fd 0 /dev/null
 fd 1 [sockfs]
 fd 2 [sockfs]
 ...
#0  __switch_to (arch/arm64/kernel/process.c:611:9)
#1  context_switch (kernel/sched/core.c:5363:2)
#2  __schedule (kernel/sched/core.c:6752:8)
...
#9  do_sys_poll (fs/select.c:1015:12)
#10 __do_sys_ppoll (fs/select.c:1121:8)
...
#19 el0t_64_sync+0x190/0x194 (arch/arm64/kernel/entry.S:598)
```

CPU 세 개는 커널 빌드(`cc1`)를, 하나는 drgn 자신을 돌리고 있었습니다. sshd의 스택은 Ch 1의 SysRq `t` 덤프와 같은 `ppoll` 대기였지만, 이번에는 인라인 함수(`context_switch`, `do_poll`)와 소스 줄까지 나왔습니다. crash도 `/proc/kcore`로 라이브 세션을 열었고, `bt <sshd PID>`가 같은 경로를 주소와 함께 보여 줬습니다.

## 자주 만나는 사고 유형

v6.12 소스의 메시지 형식과, 이 시리즈에서 실제로 재현한 것을 나눠 적습니다.

| 유형 | 메시지 (v6.12 소스) | 재현 |
|------|------|------|
| NULL 역참조 | arm64: `Unable to handle kernel NULL pointer dereference at virtual address …` | 이 장 |
| Soft lockup | `BUG: soft lockup - CPU#%d stuck for %us! [%s:%d]` (`kernel/watchdog.c:752`), `softlockup_panic`이면 `panic("softlockup: hung tasks")`(772행) | 안 함 |
| Hung task | `INFO: task %s:%d blocked for more than %ld seconds.` (`kernel/hung_task.c:133`) | 안 함 |
| Use-after-free | `BUG: KASAN: slab-use-after-free in …` | Ch 7 (KASAN 커널) |
| Out of memory | `panic_on_oom`이면 `Out of memory: %s panic_on_oom is enabled` (`mm/oom_kill.c:1080`) | 안 함 |

hung task는 위 drgn 스크립트의 D-state 목록, soft lockup은 crash의 `bt`를 CPU별로 보는 것이 출발점입니다. 이 장의 덤프에는 둘 다 없었습니다.

## 원격 덤프 저장 — NFS·SSH

로컬 디스크가 작거나 믿을 수 없는 장비는 capture kernel이 덤프를 네트워크로 보내게 합니다. Debian kdump-tools에서는 `/etc/default/kdump-tools`의 변수로 설정합니다(파일 주석 78~103행).

```bash
# /etc/default/kdump-tools
NFS="<nfs mount>"          # 또는
SSH="<user at server>"
SSH_KEY="<path>"
```

이 장에서는 원격 저장을 설정하지 않았습니다. 위처럼 makedumpfile 단계에서 실패하는 커널이라면 저장 위치를 바꿔도 결과는 같습니다.

## debugfs — 드라이버가 노출하는 디버그 상태

vmcore가 없을 때는 각 서브시스템이 debugfs에 내놓은 상태가 단서가 됩니다. 이 게스트의 `/sys/kernel/debug`에는 다음이 있었습니다.

```text
acpi			dma_pools		lru_gen			remoteproc
bdi			dmaengine		lru_gen_full		sched
block			dri			memblock		slab
check_wx_pages		dynamic_debug		opp			sleep_time
clear_warn_once		energy_model		phy			split_huge_pages
clk			extfrag			pinctrl			stackdepot
cxl			fault_around_bytes	pm_genpd		suspend_stats
debug_enabled		gpio			psci			swiotlb
devfreq			i2c			pwm			tracing
device_component	ieee80211		ras			virtio-ports
devices_deferred	interconnect		regmap			wakeup_sources
dma_buf			kprobes			regulator
```

Ch 2의 `dynamic_debug`, Ch 3의 `tracing`, Ch 8의 `cxl`이 모두 여기 있습니다. 실습 모듈도 `debugfs_create_dir("kdbg_demo", NULL)` 한 줄로 자기 트리거 파일을 만들었습니다. 자기 드라이버의 내부 상태를 이렇게 노출해 두면 장애 때 vmcore 없이도 읽을 수 있습니다.

## 자주 만나는 함정

| 증상 | 원인 (이 장에서 확인한 것) |
|------|------|
| oops 한 번에 시스템이 재부팅됨 | kdump-tools가 `panic_on_oops=1`을 씀 |
| `/var/crash/*/dump.*`가 0바이트 | makedumpfile 1.7.6이 `VA Bits 52`를 처리 못 함. 로그에 `makedumpfile Failed.` |
| crash가 `seek error`로 시작 못 함 | 52비트 빌드 커널이 48비트로 동작. `--machdep vabits_actual=48 --machdep phys_offset=…` |
| crash `bt`가 프레임 없이 끝남 | QEMU 덤프의 `NT_PRSTATUS`를 인식 못 함. drgn으로 스택 확인 |
| drgn `FaultError: recursive address translation` | Debian 0.0.31. 0.3.0으로 해결 |
| `list: invalid argument` | `-H`에는 주소. 구조체 시작 주소는 `-h` |

## 정리

- kdump는 예약 메모리의 capture kernel이 첫 커널의 메모리를 저장하는 구조이고, Debian에서는 `kdump-tools` 설치와 재부팅으로 "ready"가 됩니다.
- kdump-tools는 `panic_on_oops=1`을 씁니다. kdump를 켜면 oops가 panic이 됩니다.
- 이 게스트(52비트 VA arm64 커널, makedumpfile 1.7.6)에서는 kdump가 0바이트 덤프를 남겼습니다. 덤프가 실제로 열리는지는 장애 전에 확인합니다.
- QEMU `dump-guest-memory` 덤프는 crash에 `vabits_actual`·`phys_offset`을 줘야 열렸고, 스택은 drgn 0.3.0이 소스 줄까지 복원했습니다.
- 원인 추적은 `log`의 `pc` → `dis -l`로 명령 → fault 주소와 오프셋 대조 순서입니다. 이 장에서는 `ldr x0, [x0, #8]`과 fault 주소 `0x8`이 맞았습니다.

## 다음 장 예고

Ch 7 — Kernel panic / Oops 메시지 해석. vmcore가 없을 때 dmesg 한 덩어리에서 같은 결론에 이르는 방법을, 이 장과 같은 oops와 KASAN 보고서로 봅니다. Ch 8~9에서는 CXL 드라이버를 별도로 살펴봅니다.

## 관련 항목

- [Ch 5: kdb / kgdb](/blog/tools/debugging/kernel/chapter05-kdb-kgdb)
- [Ch 7: Panic / Oops 해석](/blog/tools/debugging/kernel/chapter07-panic-oops)
- [Postmortem Debugging 시리즈](/blog/tools/debugging/postmortem/chapter01-core-generation) — user-space core
- [drgn 공식](https://drgn.readthedocs.io/)
- [crash 매뉴얼](https://crash-utility.github.io/)
- [`Documentation/admin-guide/kdump/kdump.rst` (v6.12)](https://www.kernel.org/doc/html/v6.12/admin-guide/kdump/kdump.html)
