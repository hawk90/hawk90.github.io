---
title: "Kernel Panic·Oops 메시지 해석 — Decoder Ring 만들기"
slug: "tools/debugging/kernel/chapter07-panic-oops"
date: 2026-05-25T09:07:00
description: "dmesg 한 줄로 정확한 위치 찾기. RIP, Call Trace, BUG, Tainted 디코딩."
tags: [kernel, panic, oops, dmesg, addr2line]
series: "Kernel Debugging"
seriesOrder: 7
draft: false
topics: ["tools", "tools/debugging"]
---

vmcore가 없는 운영 환경에서 남는 것은 보통 dmesg 한 덩어리입니다. 이 장은 그 한 덩어리에서 어디까지 결론을 낼 수 있는지를, 실제로 만든 oops와 KASAN 보고서로 따라갑니다. [Ch 6](/blog/tools/debugging/kernel/chapter06-crash-drgn)에서 vmcore로 분석한 바로 그 NULL 역참조를 이번에는 로그만으로 풉니다.

환경은 앞 장들과 같은 Debian 13.7 arm64 게스트입니다. oops는 배포판 커널 `6.12.116+deb13-arm64`에서, KASAN·lockdep 보고서는 v6.12 소스에 `CONFIG_KASAN`·`CONFIG_PROVE_LOCKING`을 켜고 빌드한 커널 `6.12.0-kdbg`(Ch 5)에서 얻었습니다. 아키텍처가 arm64라 레지스터 이름이 x86 자료와 다릅니다. x86과 다른 부분은 해당 절에서 소스로 짚습니다.

## Oops vs Panic

| | Oops | Panic |
|---|------|------|
| 뜻 | 커널이 예외를 처리하다 복구할 수 없는 상태를 만남. 현재 task를 끝내고 계속 감 | 시스템 정지 (`kernel.panic` 초 뒤 재부팅, 0이면 정지 유지) |
| 대표 메시지 (arm64) | `Internal error: Oops: <ESR> [#N] SMP` | `Kernel panic - not syncing: …` |
| taint | `D`(비트 7)가 켜짐 | panic 원인에 따름 |
| 승격 | arm64 `die()`: 인터럽트 문맥이거나 `panic_on_oops`면 panic (`arch/arm64/kernel/traps.c:232~234`) | — |

`kernel.panic_on_oops`의 기본값은 이 Debian 커널에서 0(`CONFIG_PANIC_ON_OOPS_VALUE=0`)이었습니다. 그런데 kdump-tools를 설치하면 1이 됩니다(Ch 6). 같은 버그가 kdump를 켠 서버에서는 재부팅으로, 끈 서버에서는 프로세스 하나의 죽음으로 끝날 수 있다는 뜻이라, 로그를 받으면 이 설정부터 확인합니다. 아래 oops는 `panic_on_oops=1`인 상태에서 찍혀 바로 `Kernel panic - not syncing: Oops: Fatal exception`으로 이어졌습니다.

## Oops 메시지 구조

실습 모듈 `kdbg_demo.ko`의 `null` 트리거가 남긴 전문입니다. 이 장의 나머지는 이 출력을 위에서부터 읽습니다.

```text
[   18.525789] Unable to handle kernel NULL pointer dereference at virtual address 0000000000000008
[   18.526121] Mem abort info:
[   18.526262]   ESR = 0x0000000096000004
[   18.526400]   EC = 0x25: DABT (current EL), IL = 32 bits
[   18.526596]   SET = 0, FnV = 0
[   18.526710]   EA = 0, S1PTW = 0
[   18.527252]   FSC = 0x04: level 0 translation fault
[   18.527832] Data abort info:
[   18.528060]   ISV = 0, ISS = 0x00000004, ISS2 = 0x00000000
[   18.528265]   CM = 0, WnR = 0, TnD = 0, TagAccess = 0
[   18.528446]   GCS = 0, Overlay = 0, DirtyBit = 0, Xs = 0
[   18.528639] user pgtable: 4k pages, 48-bit VAs, pgdp=0000000042343000
[   18.528861] [0000000000000008] pgd=0000000000000000, p4d=0000000000000000
[   18.529097] Internal error: Oops: 0000000096000004 [#1] SMP
[   18.529318] Modules linked in: kdbg_demo(OE) binfmt_misc aes_ce_blk aes_ce_cipher crct10dif_ce polyval_ce polyval_generic ghash_ce gf128mul sha3_ce sha512_ce nls_ascii sha512_arm64 sha2_ce nls_cp437 sha256_arm64 vfat sha1_ce fat evdev cfg80211 rfkill drm efi_pstore configfs nfnetlink vsock_loopback vmw_vsock_virtio_transport_common vsock efivarfs qemu_fw_cfg ip_tables x_tables autofs4 ext4 crc16 mbcache jbd2 crc32c_generic virtio_net net_failover virtio_blk failover virtio_mmio
[   18.531213] CPU: 1 UID: 0 PID: 737 Comm: bash Tainted: G           OE      6.12.116+deb13-arm64 #1  Debian 6.12.116-1
[   18.531577] Tainted: [O]=OOT_MODULE, [E]=UNSIGNED_MODULE
[   18.531769] Hardware name: QEMU QEMU Virtual Machine, BIOS edk2-stable202408-prebuilt.qemu.org 08/13/2024
[   18.532101] pstate: 61400005 (nZCv daif +PAN -UAO -TCO +DIT -SSBS BTYPE=--)
[   18.532351] pc : kdbg_read_value.constprop.0+0xc/0x20 [kdbg_demo]
[   18.532591] lr : kdbg_null_deref+0x24/0xb98 [kdbg_demo]
[   18.532782] sp : ffff800082ba3990
[   18.532896] x29: ffff800082ba3990 x28: ffff00000615ca00 x27: 0000000000000000
[   18.533143] x26: 0000000000000000 x25: 0000000000000000 x24: 0000000000000000
[   18.533392] x23: ffff000006b58840 x22: 0000aaaae0d689d0 x21: 0000000000000005
[   18.533637] x20: 0000aaaae0d689d0 x19: 0000000000000005 x18: 0000000000000006
[   18.533883] x17: 0000000000000000 x16: 0000000000000000 x15: ffff800082ba357f
[   18.534128] x14: 0000000000000000 x13: 4c4c554e206d6f72 x12: ffff8000820d20a0
[   18.534371] x11: ffff80008207a0f8 x10: ffff8000820d20f8 x9 : ffff80007a92548c
[   18.534648] x8 : 0000000000000001 x7 : 0000000000017fe8 x6 : 0000000000000000
[   18.534912] x5 : ffff00007f9d0488 x4 : 0000000000000000 x3 : 0000000000000000
[   18.535164] x2 : 0000000000000000 x1 : ffff00000615ca00 x0 : 0000000000000000
[   18.535409] Call trace:
[   18.535493]  kdbg_read_value.constprop.0+0xc/0x20 [kdbg_demo]
[   18.535691]  trigger_write+0x22c/0x230 [kdbg_demo]
[   18.535874]  full_proxy_write+0x68/0xc8
[   18.536018]  vfs_write+0xdc/0x3b0
[   18.536142]  ksys_write+0x7c/0x120
[   18.536271]  __arm64_sys_write+0x24/0x38
[   18.536432]  invoke_syscall+0x60/0xe0
[   18.536572]  el0_svc_common.constprop.0+0x48/0xf0
[   18.536746]  do_el0_svc+0x24/0x38
[   18.536872]  el0_svc+0x38/0x148
[   18.536992]  el0t_64_sync_handler+0xc8/0xe0
[   18.537194]  el0t_64_sync+0x190/0x198
[   18.537331] Code: ffff8000 aa1e03e9 d503201f d2800000 (f9400400) 
[   18.537556] ---[ end trace 0000000000000000 ]---
```

## 1. 첫 줄 — 원인

```text
Unable to handle kernel NULL pointer dereference at virtual address 0000000000000008
```

arm64는 이 문장을 `arch/arm64/mm/fault.c:310`의 `pr_alert("Unable to handle kernel %s at virtual address %016lx\n", …)`로 찍습니다. `%s` 자리는 같은 파일 393~405행이 고릅니다. fault 주소가 `PAGE_SIZE`(이 커널은 4 KiB)보다 작으면 `NULL pointer dereference`, 아니면 `paging request`이고, 권한 위반이면 `write to read-only memory`·`execute from non-executable memory`·`read from unreadable memory` 중 하나입니다.

주소 `0x8`은 "NULL 포인터에서 8바이트 떨어진 곳"이라는 뜻입니다. 어느 구조체의 어느 필드인지는 아래 5절에서 명령어로 확인합니다. 오프셋만 보고 "두 번째 필드"라고 단정하지 않는 이유는, 필드 크기와 padding에 따라 같은 오프셋이 다른 필드일 수 있기 때문입니다. 실습 모듈의 `struct kdbg_item`은 `int id; int pad; unsigned long value;`라 오프셋 8이 세 번째 멤버 `value`입니다.

같은 계열의 다른 첫 줄 메시지도 소스에서 확인한 것만 적습니다.

| 메시지 | 위치 (v6.12) | 뜻 |
|--------|------|----|
| `Unable to handle kernel paging request at virtual address …` | `arch/arm64/mm/fault.c:405` | 매핑되지 않은 커널 주소 (NULL 근처가 아님) |
| `BUG: KASAN: slab-use-after-free in …` | KASAN 보고서 (아래) | 해제된 slab 객체 접근 |
| `BUG: sleeping function called from invalid context at %s:%d` | `kernel/sched/core.c:8633` (`__might_resched()`) | atomic 문맥에서 잘 수 있는 함수 호출 (아래) |
| `BUG: scheduling while atomic: %s/%d/0x%08x` | `kernel/sched/core.c:5864` (`__schedule_bug()`) | atomic 문맥에서 실제로 schedule |
| `WARNING: CPU: N PID: M at …` | `WARN_ON` | 경고만, 계속 실행 (Ch 2) |
| `BUG: soft lockup - CPU#%d stuck for %us!` | `kernel/watchdog.c:752` | 한 CPU가 오래 양보하지 않음 |

## 2. Fault 정보 — arm64 ESR

x86의 `#PF: error_code(…)` 자리에 arm64는 ESR(Exception Syndrome Register)을 풀어 줍니다. 위 출력에서 필요한 줄은 셋입니다.

```text
  ESR = 0x0000000096000004
  EC = 0x25: DABT (current EL), IL = 32 bits
  FSC = 0x04: level 0 translation fault
  CM = 0, WnR = 0, TnD = 0, TagAccess = 0
```

- `EC = 0x25`: 같은 예외 레벨(커널, EL1)에서 난 data abort입니다. `arch/arm64/include/asm/esr.h:48`의 `ESR_ELx_EC_DABT_CUR`가 0x25입니다.
- `FSC = 0x04`: level 0 translation fault, 즉 페이지 테이블 첫 단계부터 매핑이 없었습니다. 바로 아래 `pgd=0000000000000000`이 그 증거입니다.
- `WnR = 0`: 읽기였습니다. 쓰기였다면 1입니다.

이 줄들은 `fault.c`의 `mem_abort_decode()`(101행부터, `EC`는 106행, `FSC`는 115행)와 `data_abort_decode()`(68행부터, `WnR`은 88행)가 찍습니다. x86 커널이라면 대신 `#PF: error_code(0x0000)`이 나오고, 비트는 `arch/x86/include/asm/trap_pf.h:8~29`에 정의돼 있습니다. bit 0은 0이면 "페이지 없음", 1이면 "보호 위반", bit 1은 쓰기, bit 2는 사용자 모드, bit 3은 reserved bit, bit 4는 명령어 fetch입니다. 그래서 `0x0000`은 커널 모드 읽기·페이지 없음이고, `0x0011`은 커널 모드에서 존재하는 페이지로부터 명령어를 가져오다 보호 위반(NX)이 난 경우입니다. 이 장은 x86 커널을 실행하지 않았으므로 x86 출력 예는 싣지 않습니다.

## 3. Tainted

```text
CPU: 1 UID: 0 PID: 737 Comm: bash Tainted: G           OE      6.12.116+deb13-arm64 #1  Debian 6.12.116-1
Tainted: [O]=OOT_MODULE, [E]=UNSIGNED_MODULE
```

이 커널은 taint 문자 줄 아래에 `[문자]=이름` 형식의 둘째 줄을 붙였습니다(`kernel/panic.c:528~536`). `G`는 "독점 모듈 없음"이고, `O`·`E`는 실습 모듈 때문입니다(Ch 1 표). 이 oops 뒤에는 `D`(비트 7)가 더해지고, Ch 6의 drgn은 vmcore에서 비트 7·9·12·13을 읽었습니다. oops를 보고할 때는 out-of-tree 모듈 없이 재현되는지가 첫 질문이 됩니다.

## 4. pc — 죽은 명령

```text
pc : kdbg_read_value.constprop.0+0xc/0x20 [kdbg_demo]
lr : kdbg_null_deref+0x24/0xb98 [kdbg_demo]
```

x86의 `RIP` 자리가 arm64에서는 `pc`입니다. `+0xc/0x20`은 "심볼 시작에서 0xc, 심볼 크기 0x20"인데, 이 크기는 ELF의 함수 크기가 아닙니다. 모듈 심볼의 크기는 `kernel/module/kallsyms.c`의 `find_kallsyms_symbol()`(276~312행)이 **다음 심볼까지의 거리**로 계산합니다. 실제로 `.ko`의 심볼 테이블은 다음과 같았습니다.

```text
$ readelf -sW kdbg_demo.ko | grep -E 'kdbg_read_value|kdbg_null_deref|kdbg_uaf'
    48: 0000000000000008    96 FUNC    LOCAL  DEFAULT    1 kdbg_uaf
    55: 0000000000000008    20 FUNC    LOCAL  DEFAULT    7 kdbg_read_value.constprop.0
    57: 0000000000000028    64 FUNC    LOCAL  DEFAULT    7 kdbg_null_deref
```

`kdbg_read_value.constprop.0`의 실제 크기는 20(0x14)바이트이고, 같은 섹션(7번, `.text.unlikely`)의 다음 심볼 `kdbg_null_deref`가 0x20 뒤에 있어서 0x20이 찍혔습니다. `kdbg_null_deref`는 섹션의 마지막 심볼이라 모듈 메모리 끝까지가 크기(0xb98)가 됐습니다. `/0x…`는 "대략 이 함수 안"이라는 정도로만 읽습니다.

소스 줄로 바꿀 때는 `scripts/faddr2line`에 `.ko`와 `함수+오프셋/크기`를 그대로 줍니다.

```text
$ ./scripts/faddr2line /root/mod/kdbg_demo.ko 'kdbg_read_value.constprop.0+0xc/0x20' 'trigger_write+0x22c/0x230'
kdbg_read_value.constprop.0+0xc/0x20:
kdbg_read_value at /root/mod/kdbg_demo.c:24 (discriminator 1)

trigger_write+0x22c/0x230:
trigger_write at /root/mod/kdbg_demo.c:76
$ ./scripts/faddr2line /usr/lib/debug/boot/vmlinux-6.12.116+deb13-arm64 'vfs_write+0xdc/0x3b0'
vfs_write+0xdc/0x3b0:
vfs_write at fs/read_write.c:681
```

`kdbg_demo.c:24`는 `return it->value;`, 76행은 `trigger_write()`에서 `kdbg_null_deref()`를 부르는 줄입니다. 런타임 주소를 relocatable `.ko`에 그대로 `addr2line`으로 넣으면 섹션 기준이 달라 엉뚱한 줄이 나오므로, 모듈은 이렇게 `심볼+오프셋`으로 풉니다.

## 5. Code — 명령 hex dump

```text
Code: ffff8000 aa1e03e9 d503201f d2800000 (f9400400) 
```

pc 앞 네 워드와, 괄호 안의 faulting 명령입니다. `scripts/decodecode`에 그대로 넣으면 디스어셈블해 줍니다.

```text
$ grep 'Code:' oops.txt | sed 's/^\[[^]]*\] //' | ARCH=arm64 ./scripts/decodecode
Code: ffff8000 aa1e03e9 d503201f d2800000 (f9400400)
All code
========
   0:	ffff8000 	.inst	0xffff8000 ; undefined
   4:	aa1e03e9 	mov	x9, x30
   8:	d503201f 	nop
   c:	d2800000 	mov	x0, #0x0                   	// #0
  10:*	f9400400 	ldr	x0, [x0, #8]		<-- trapping instruction

Code starting with the faulting instruction
===========================================
   0:	f9400400 	ldr	x0, [x0, #8]
```

`ldr x0, [x0, #8]`이 범인이고, 바로 앞 `mov x0, #0x0`이 x0을 0으로 만들었습니다. 첫 워드 `ffff8000`은 함수 시작(섹션 오프셋 0x8) 앞 8바이트에 있던 값이라 `undefined`로 풀렸습니다. 1절의 fault 주소 0x8이 명령의 `#8`과 정확히 맞으므로 "NULL 구조체의 오프셋 8 읽기"가 확정됩니다. vmcore 없이도 Ch 6에서 crash `dis -l`로 얻은 것과 같은 결론입니다.

## 6. 레지스터

```text
x2 : 0000000000000000 x1 : ffff00000615ca00 x0 : 0000000000000000
```

명령이 `[x0, #8]`을 읽었고 `x0`이 0입니다. 레지스터 덤프는 fault 순간의 값이므로, 명령어가 쓰는 레지스터를 먼저 Code 줄에서 찾고 그 값을 덤프에서 읽는 순서로 봅니다. 어떤 레지스터가 어떤 인자인지 짐작하는 것보다 확실합니다. x86이라면 같은 자리에 `RAX`… 레지스터와 fault 주소 레지스터 `CR2`가 찍힙니다. arm64에서는 fault 주소가 첫 줄의 `virtual address`에 이미 나와 있습니다.

## 7. Call Trace — 콜스택

```text
Call trace:
 kdbg_read_value.constprop.0+0xc/0x20 [kdbg_demo]
 trigger_write+0x22c/0x230 [kdbg_demo]
 full_proxy_write+0x68/0xc8
 vfs_write+0xdc/0x3b0
 ksys_write+0x7c/0x120
 __arm64_sys_write+0x24/0x38
 invoke_syscall+0x60/0xe0
 ...
 el0t_64_sync+0x190/0x198
```

위가 안쪽(죽은 곳), 아래가 바깥(시스템 콜 진입)입니다. 눈여겨볼 점은 `kdbg_null_deref`가 목록에 없다는 것입니다. 말단 함수 `kdbg_read_value`가 frame record를 만들지 않았기 때문입니다. 5절의 디스어셈블에 `stp x29, x30, …`이 없는 것이 그 증거이고, 그래서 frame pointer를 따라 올라가는 unwinder는 `kdbg_read_value` 다음에 곧바로 `trigger_write`로 갑니다. 빠진 호출자는 `lr : kdbg_null_deref+0x24`가 채웁니다. 말단 함수에서 죽은 oops에서는 `lr` 줄을 Call trace의 둘째 줄로 읽어야 합니다.

x86 커널의 Call Trace에는 `? `가 붙은 줄이 섞여 나옵니다. `arch/x86/kernel/dumpstack.c:72`가 unwinder가 신뢰할 수 없다고 판단한 주소에 `? `를 붙이는 것이고, arm64 출력에는 이 표시가 없었습니다.

## 자동 decode — decode_stacktrace.sh

oops 전문을 `scripts/decode_stacktrace.sh`에 넣으면 각 줄에 소스 위치를 붙여 줍니다. 인자는 `vmlinux`, 소스 경로, 모듈 디렉터리입니다.

```text
$ ./scripts/decode_stacktrace.sh /usr/lib/debug/boot/vmlinux-6.12.116+deb13-arm64 /root/linux-6.12 /root/mod < oops.txt
pc : kdbg_read_value.constprop.0 (/usr/src/linux-headers-6.12.116+deb13-common/include/linux/slab.h:894 /root/mod/kdbg_demo.c:37) kdbg_demo
lr : kdbg_null_deref (/root/mod/kdbg_demo.c:43 (discriminator 2)) kdbg_demo
...
trigger_write (/root/mod/kdbg_demo.c:76) kdbg_demo
full_proxy_write (debian/build/build_arm64_none_arm64/fs/debugfs/file.c:328 (discriminator 1)) 
vfs_write (debian/build/build_arm64_none_arm64/fs/read_write.c:681) 
ksys_write (debian/build/build_arm64_none_arm64/fs/read_write.c:736) 
__arm64_sys_write (debian/build/build_arm64_none_arm64/fs/read_write.c:745) 
...
```

커널 쪽 줄은 `faddr2line`과 같았지만, 모듈의 `pc`·`lr`은 **틀렸습니다**. 37행과 43행은 `kdbg_uaf()` 안(`kmalloc` 호출과 `pr_info`)이고, 실제 위치는 24행입니다. 원인은 위 `readelf` 출력에 있습니다. `kdbg_read_value.constprop.0`(섹션 7, 오프셋 0x8)과 `kdbg_uaf`(섹션 1, 오프셋 0x8)가 서로 다른 섹션에서 같은 오프셋을 갖고, `.text` 기준으로 주소를 계산한 결과가 `kdbg_uaf` 쪽 줄로 떨어졌습니다. `faddr2line`은 같은 입력에서 24행을 냈습니다. 컴파일러가 함수를 `.text.unlikely`로 옮긴 모듈에서는 두 도구의 결과가 다를 수 있으므로, 모듈 프레임은 `faddr2line`으로 한 번 더 확인합니다.

## 8. Modules linked in

```text
Modules linked in: kdbg_demo(OE) binfmt_misc aes_ce_blk aes_ce_cipher ... virtio_net net_failover virtio_blk failover virtio_mmio
```

oops 순간 로드돼 있던 모듈 전부이고, 괄호 안은 모듈별 taint입니다. 의심 모듈이 `(OE)`처럼 표시되면 그 모듈을 빼고 재현하는 것이 첫 실험입니다.

## Soft Lockup

soft lockup 감지기는 한 CPU가 일정 시간 스케줄러에 양보하지 않으면 경고를 찍습니다. 형식은 `kernel/watchdog.c:752`의 `BUG: soft lockup - CPU#%d stuck for %us! [%s:%d]`이고, `kernel.softlockup_panic`이 켜져 있으면 772행에서 `panic("softlockup: hung tasks")`가 됩니다. 이 커널은 `CONFIG_SOFTLOCKUP_DETECTOR=y`, `softlockup_panic=0`이었습니다. 이 장에서는 soft lockup을 재현하지 않았습니다.

## Hard Lockup

hard lockup은 인터럽트까지 막힌 CPU를 다른 메커니즘이 감지해 `Watchdog detected hard LOCKUP on cpu %d`(`kernel/watchdog.c:193`)를 찍습니다. 이 Debian 커널은 `CONFIG_HARDLOCKUP_DETECTOR=y`였지만, 이 장에서는 재현하지 않았습니다.

## Hung Task

D state(uninterruptible)로 오래 멈춘 task는 `INFO: task %s:%d blocked for more than %ld seconds.`(`kernel/hung_task.c:133`)로 보고됩니다. 시간 한도는 `kernel.hung_task_timeout_secs`이고, 이 커널은 `CONFIG_DEFAULT_HUNG_TASK_TIMEOUT=120`대로 120이었습니다. `hung_task_panic`이 켜져 있으면 227행에서 `panic("hung_task: blocked tasks")`가 됩니다. 이 장에서는 재현하지 않았습니다.

## KASAN report

배포판 커널에는 KASAN이 없습니다. v6.12를 `CONFIG_KASAN_GENERIC`으로 빌드한 커널에서 실습 모듈의 `uaf` 트리거(할당 → 해제 → 읽기)를 실행한 결과입니다.

```text
[  284.294687] ==================================================================
[  284.295196] BUG: KASAN: slab-use-after-free in kdbg_uaf+0xbc/0xcc [kdbg_demo]
[  284.295636] Read of size 8 at addr ffff0000cca9a3c8 by task bash/859

[  284.296154] CPU: 0 UID: 0 PID: 859 Comm: bash Tainted: G           O       6.12.0-kdbg #1
[  284.296644] Tainted: [O]=OOT_MODULE
[  284.296855] Hardware name: linux,dummy-virt (DT)
[  284.297162] Call trace:
[  284.297340]  dump_backtrace.part.0+0xd8/0xe4
[  284.297670]  show_stack+0x18/0x24
[  284.297888]  dump_stack_lvl+0x70/0x98
[  284.298131]  print_report+0x17c/0x4e4
[  284.298355]  kasan_report+0xb8/0x10c
[  284.298581]  __asan_report_load8_noabort+0x20/0x34
[  284.298872]  kdbg_uaf+0xbc/0xcc [kdbg_demo]
[  284.299140]  trigger_write+0x224/0x260 [kdbg_demo]
...

[  284.301778] Allocated by task 859:
[  284.301973]  kasan_save_stack+0x3c/0x64
[  284.302184]  kasan_save_track+0x20/0x40
[  284.302397]  kasan_save_alloc_info+0x40/0x60
[  284.302630]  __kasan_kmalloc+0xb8/0xbc
[  284.302835]  __kmalloc_cache_noprof+0x15c/0x394
[  284.303086]  kdbg_uaf+0x40/0xcc [kdbg_demo]
...

[  284.305861] Freed by task 859:
[  284.306037]  kasan_save_stack+0x3c/0x64
[  284.306251]  kasan_save_track+0x20/0x40
[  284.306477]  kasan_save_free_info+0x4c/0x80
[  284.306710]  __kasan_slab_free+0x4c/0x68
[  284.306928]  kfree+0x118/0x400
[  284.307100]  kdbg_uaf+0x74/0xcc [kdbg_demo]
...

[  284.309852] The buggy address belongs to the object at ffff0000cca9a3c0
                which belongs to the cache kmalloc-32 of size 32
[  284.310537] The buggy address is located 8 bytes inside of
                freed 32-byte region [ffff0000cca9a3c0, ffff0000cca9a3e0)
```

KASAN 보고서는 세 가지 스택을 줍니다. 잘못 읽은 곳(`kdbg_uaf+0xbc`), 할당한 곳(`kdbg_uaf+0x40`, `__kmalloc_cache_noprof` 경유), 해제한 곳(`kdbg_uaf+0x74`, `kfree` 경유)입니다. 객체가 `kmalloc-32` 캐시의 32바이트 영역이고 그 안 8바이트 지점을 8바이트 읽었다는 것도 알려 줍니다. 오프셋 8은 다시 `value` 필드입니다. user-space ASan과 같은 정보를 커널에서 얻는 셈입니다. 대가도 같아서, v6.12 `Documentation/dev-tools/kasan.rst`(19~21행)는 Generic KASAN을 "디버깅용이며 성능·메모리 오버헤드가 크다"고 적고 있습니다. 운영 커널에는 넣지 않습니다.

## Sleeping in atomic — lockdep 커널

실습 모듈의 `atomic` 트리거는 spinlock을 잡은 채 `msleep(10)`을 부릅니다. 잡은 채로 잠들면 안 되는 코드입니다. lockdep(`CONFIG_PROVE_LOCKING`)을 켠 `6.12.0-kdbg`에서, taint가 `O`뿐인 상태로 한 번 실행했습니다. 첫 보고서는 다음과 같았습니다.

```text
[  217.176617] BUG: scheduling while atomic: bash/503/0x00000002
[  217.177365] 2 locks held by bash/503:
[  217.177625]  #0: ffff0000c0efa3f8 (sb_writers#10){.+.+}-{0:0}, at: vfs_write+0x678/0xad8
[  217.178168]  #1: ffff80007f6f2078 (demo_lock){+.+.}-{2:2}, at: kdbg_sleep_atomic+0x24/0x48 [kdbg_demo]
[  217.178834] Modules linked in: kdbg_demo(O)
[  217.179114] CPU: 1 UID: 0 PID: 503 Comm: bash Tainted: G           O       6.12.0-kdbg #2
[  217.179663] Tainted: [O]=OOT_MODULE
[  217.179893] Hardware name: linux,dummy-virt (DT)
[  217.180242] Call trace:
[  217.180408]  dump_backtrace.part.0+0xd8/0xf0
[  217.180691]  show_stack+0x1c/0x38
[  217.180925]  dump_stack_lvl+0x6c/0x90
[  217.181170]  dump_stack+0x18/0x20
[  217.181392]  __schedule_bug+0x100/0x130
[  217.181654]  __schedule+0x1bf0/0x2918
[  217.181914]  schedule+0x110/0x3f0
[  217.182135]  schedule_timeout+0x14c/0x280
[  217.182459]  msleep+0x90/0xd0
[  217.182658]  kdbg_sleep_atomic+0x2c/0x48 [kdbg_demo]
[  217.182984]  trigger_write+0x244/0x270 [kdbg_demo]
[  217.183299]  full_proxy_write+0xd4/0x170
[  217.183563]  vfs_write+0x1e0/0xad8
[  217.183791]  ksys_write+0xf8/0x1f0
[  217.184016]  __arm64_sys_write+0x70/0xb0
[  217.184284]  invoke_syscall+0x74/0x268
[  217.184533]  el0_svc_common.constprop.0+0xb0/0x238
```

`scheduling while atomic: bash/503/0x00000002`의 마지막 값은 preempt count이고(`kernel/sched/core.c:5864`의 형식 `%s/%d/0x%08x`), 0이 아니므로 선점이 꺼진 채 schedule에 들어왔다는 뜻입니다. lockdep이 켜진 커널이라 그 순간 잡고 있던 잠금 목록이 함께 찍혔고, `#1: … (demo_lock) … at: kdbg_sleep_atomic+0x24/0x48 [kdbg_demo]`가 범인을 바로 가리킵니다. 스택은 `msleep` → `schedule_timeout` → `schedule` → `__schedule_bug` 순서입니다.

중요한 것은 **첫 보고서만 믿는다**는 점입니다. 이 실행에서는 첫 보고서 뒤에 `WARNING: suspicious RCU usage`, `BUG: sleeping function called from invalid context at kernel/rseq.c:161`, `kernel/softirq.c:307`의 WARNING이 줄줄이 이어졌고, 결국 bash가 다음에 fork할 때 `kernel BUG at mm/vmalloc.c:3097!`(`BUG_ON(in_interrupt())`)로 oops가 났습니다. 두 번째 BUG 보고서에는 `preempt_count: ffffffff, expected: 0`이 찍혀 있었습니다. 첫 사고 뒤 preempt count가 비정상 값이 됐고, 그 뒤 코드들이 이 값 때문에 차례로 경고를 낸 것으로 읽힙니다. 마지막 oops만 보면 vmalloc 버그로 보이지만, 원인은 맨 처음 줄의 `demo_lock`이었습니다. 이 oops에서 kgdb가 멈춘 장면은 [Ch 5](/blog/tools/debugging/kernel/chapter05-kdb-kgdb)에 있습니다.

## 일반 커널 디버깅 흐름

Ch 1~7은 일반 커널 디버깅을 다루며, Ch 8~9는 CXL 드라이버 사례를 별도로 이어갑니다.

- **Ch 1** User/Kernel 경계, /proc, kallsyms.
- **Ch 2** printk + dmesg + dynamic_debug.
- **Ch 3** ftrace + tracepoints.
- **Ch 4** eBPF / bpftrace / BCC.
- **Ch 5** kdb / kgdb 인터랙티브.
- **Ch 6** crash / drgn — vmcore postmortem.
- **Ch 7** (이 장) panic / oops 메시지 해석.

이 장의 oops를 예로 하면 흐름은 다음과 같습니다.

1. 첫 줄과 ESR로 종류를 가릅니다. 여기서는 커널 모드 읽기, NULL+8.
2. `pc`를 `faddr2line`으로 소스 줄로, `Code:`를 `decodecode`로 명령으로 바꿉니다. 여기서는 `kdbg_demo.c:24`의 `ldr x0, [x0, #8]`.
3. Call trace와 `lr`로 호출 경로를 복원합니다. 말단 함수면 `lr`이 빠진 프레임입니다.
4. taint와 `Modules linked in`으로 재현 조건을 정합니다.
5. 로그로 부족하면 vmcore(Ch 6), 재현되면 kgdb(Ch 5)나 KASAN·lockdep 빌드로 갑니다.

## 정리

- Oops는 task를 끝내고 계속 가고, panic은 시스템을 세웁니다. 둘 사이는 `panic_on_oops`(kdump-tools가 1로 바꿈)가 가릅니다.
- arm64의 첫 줄은 fault 종류와 주소를, `ESR`의 EC·FSC·WnR은 예외 종류와 읽기·쓰기를 알려 줍니다.
- `pc`의 `/크기`는 다음 심볼까지의 거리입니다. 모듈 프레임은 `faddr2line`으로 풀고, `decode_stacktrace.sh` 결과는 섹션이 갈린 모듈에서 틀릴 수 있습니다.
- `Code:`를 `decodecode`로 풀면 fault 주소와 명령의 오프셋을 맞춰 볼 수 있습니다.
- 말단 함수에서 죽으면 Call trace에서 호출자가 빠지고, `lr`이 그 자리를 채웁니다.
- KASAN은 접근·할당·해제 세 스택을, lockdep 빌드는 atomic 문맥 위반의 위치를 알려 줍니다.

## 관련 항목 (시리즈 전체)

- [Ch 1: User/Kernel 경계](/blog/tools/debugging/kernel/chapter01-user-kernel-boundary)
- [Ch 2: printk + dmesg + dynamic_debug](/blog/tools/debugging/kernel/chapter02-printk-dmesg)
- [Ch 3: ftrace + tracepoints](/blog/tools/debugging/kernel/chapter03-ftrace-tracepoints)
- [Ch 4: eBPF for kernel](/blog/tools/debugging/kernel/chapter04-ebpf-kernel)
- [Ch 5: kdb / kgdb](/blog/tools/debugging/kernel/chapter05-kdb-kgdb)
- [Ch 6: crash + drgn](/blog/tools/debugging/kernel/chapter06-crash-drgn)

## 외부 자료

- [Postmortem Debugging](/blog/tools/debugging/postmortem/chapter01-core-generation) — user-space core
- [Sanitizers](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan) — KASAN의 user-space 버전
- [`Documentation/admin-guide/bug-hunting.rst` (v6.12)](https://www.kernel.org/doc/html/v6.12/admin-guide/bug-hunting.html)
- [`Documentation/dev-tools/kasan.rst` (v6.12)](https://www.kernel.org/doc/html/v6.12/dev-tools/kasan.html)
- `dmesg(1)`, `addr2line(1)`
