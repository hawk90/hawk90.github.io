---
title: "Linux Kernel Boot ABI — ARM, RISC-V, x86 진입 규약"
slug: "embedded/bootloader/chapter19-kernel-handoff"
date: 2026-05-09T09:19:00
description: "Linux ARM32·AArch64·RISC-V·x86 boot protocol의 인자, CPU 상태, 메모리 요구를 1차 문서에 따라 비교."
series: "Bootloader Internals"
seriesOrder: 19
tags: [embedded, bootloader, u-boot, linux-abi, kernel]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> 부트로더가 kernel에 넘기는 것은 결국 **"어디에 kernel을 놓았는가, CPU 레지스터에 무엇을 담았는가, CPU가 어떤 상태인가"** 세 가지입니다. AArch64에서는 kernel 파일 맨 앞 64 byte의 헤더가 배치 규칙을 알려 주고, 진입하는 순간 `x0`에는 DTB 주소, `x1`~`x3`에는 0이 들어 있어야 합니다. 이 글은 그 순간을 디버거로 멈춰 직접 확인합니다.

기준은 Linux **v6.12**의 boot 문서(`Documentation/arch/*/boot*.rst`)와 U-Boot **v2024.04**입니다. AArch64는 실제로 실행했습니다. QEMU 11.1.3 `virt`(`-cpu cortex-a57 -m 1G`)에서 U-Boot `qemu_arm64_defconfig`로 Debian 13.7 arm64 kernel(Linux 6.12.107)을 `booti`하고, QEMU gdbstub에 `aarch64-elf-gdb` 18.1을 붙여 kernel 첫 명령어에서 멈췄습니다. ARM32·RISC-V·x86은 같은 버전의 문서로 요약합니다.

## AArch64 Image 헤더 — kernel이 알려 주는 배치 규칙

arm64 kernel `Image`의 첫 64 byte는 `Documentation/arch/arm64/booting.rst`가 정한 헤더입니다. Debian kernel 파일에서 직접 읽었습니다.

| 필드 | 값 | 의미 |
| --- | --- | --- |
| `code0` | `0xfa405a4d` | 첫 명령어. 앞 2 byte가 `MZ`(PE 파일 표식) |
| `text_offset` | `0x0` | 2 MiB 정렬 주소로부터 kernel을 놓을 거리 |
| `image_size` | `0x24f0000` (36.94 MiB) | kernel이 실제로 차지할 메모리 크기 |
| `flags` | `0xa` | bit0=0 little endian, bit1-2=1 4K page, bit3=1 물리 배치 자유 |
| `magic` | `0x644d5241` (`ARM\x64`) | arm64 Image 표식 |
| `res5` | `0x40` | PE/COFF 헤더 위치(EFI 실행용) |

`image_size`(36.94 MiB)가 파일 크기(35.9 MiB, 37,660,608 byte)보다 큽니다. 파일에 담기지 않는 BSS 같은 영역까지 포함한 "실제로 차지할 크기"이기 때문이고, 부트로더는 이 크기만큼 비워 두어야 합니다. `flags`의 bit 3은 문서에서 "Kernel physical placement"입니다. 1이면 2 MiB 정렬 주소가 48-bit 물리 주소 범위 안 어디에 있어도 되고, 0이면 DRAM 시작에 최대한 가깝게 놓아야 합니다.

`code0`이 재미있습니다. 이 4 byte는 PE 파일 표식 `MZ`로 시작하면서, 동시에 AArch64 명령어로 실행해도 아무 일도 하지 않게 만들어져 있습니다. 아래에서 gdb가 보여 주듯 `ccmp x18, #0x0, #0xd, pl`로 해석되고, 다음 명령어 `code1`이 실제 시작 코드로 점프합니다. 같은 파일이 [18장](/blog/embedded/bootloader/chapter18-efi-in-uboot)에서는 EFI 프로그램으로, 이 글에서는 직접 실행되는 이유입니다.

## U-Boot `booti`가 하는 배치

`arch/arm/lib/image.c`의 `booti_setup()`은 헤더를 읽어 kernel을 둘 주소를 정합니다.

```c
/* arch/arm/lib/image.c (v2024.04), booti_setup() 일부 */
if (!force_reloc && (le64_to_cpu(ih->flags) & BIT(3)))
	dst = image - text_offset;
else
	dst = gd->bd->bi_dram[0].start;

*relocated_addr = ALIGN(dst, SZ_2M) + text_offset;
```

bit 3이 1이면 올린 주소를 2 MiB 단위로 **올림**하고, 0이면 DRAM 시작으로 보냅니다. `image_size`가 0인 옛 kernel이면 "Image lacks image_size field, assuming 16MiB"를 출력하고 `text_offset`을 `0x80000`으로 가정합니다. 2 MiB 경계가 아닌 `0x40480000`에 kernel을 올려 `booti`했습니다.

```text
=> load virtio 0:1 0x40480000 /boot/vmlinuz
37660608 bytes read in 295 ms (121.7 MiB/s)
=> echo fdtcontroladdr=${fdtcontroladdr}
fdtcontroladdr=7e593d90
=> booti 0x40480000 - ${fdtcontroladdr}
Moving Image from 0x40480000 to 0x40600000, end=42af0000
## Flattened Device Tree blob at 7e593d90
   Booting using the fdt blob at 0x7e593d90
Working FDT set to 7e593d90
   Loading Device Tree to 000000007d485000, end 000000007d587fff ... OK
Working FDT set to 7d485000

Starting kernel ...
```

`0x40480000`을 2 MiB로 올림하면 `0x40600000`이고, 끝 주소 `0x42af0000`은 `0x40600000 + image_size`입니다. `cmd/booti.c`는 이때 `image_size`만큼 `memmove`합니다. 파일보다 큰 범위를 옮기므로, kernel을 올린 주소 바로 뒤에 다른 이미지(initrd 등)를 붙여 두면 이 이동에 덮일 수 있습니다. 처음부터 2 MiB 정렬 주소(예: QEMU의 `kernel_addr_r=0x40400000`)에 올리면 이동이 일어나지 않습니다.

DTB도 옮겨졌습니다. U-Boot는 DTB를 RAM 위쪽 `0x7d485000`으로 복사한 뒤 그 주소를 kernel에 넘깁니다. 문서는 DTB가 8 byte 경계에 있고 2 MB를 넘지 않을 것을 요구하는데, 이 DTB는 4 KiB 정렬에 약 1 MiB(`0x7d485000`~`0x7d587fff`)입니다.

## 진입 순간의 레지스터

gdb를 QEMU에 붙여 kernel 첫 명령어 주소 `0x40600000`에 hardware breakpoint를 걸고 위의 `booti`를 실행했습니다.

같은 지점을 관찰하려면 기존 QEMU 실행 명령에 `-gdb tcp:127.0.0.1:1234`를 추가하고, U-Boot 자동 부팅을 중단해 프롬프트에서 기다립니다. 별도 터미널에서 GDB를 실행한 뒤 다음 순서로 연결합니다. 아래는 본문의 관찰 지점에 맞춘 재현 절차이며, 디스크 이미지와 U-Boot 빌드 준비는 앞 장과 같습니다.

```bash
aarch64-elf-gdb
```

```text
(gdb) target remote 127.0.0.1:1234
(gdb) hbreak *0x40600000
(gdb) continue
```

이제 QEMU의 U-Boot 콘솔에서 앞의 `load`와 `booti` 명령을 실행합니다. GDB가 멈추면 레지스터와 첫 두 명령어를 읽습니다.

```text
(gdb) info registers x0 x1 x2 x3 pc cpsr
(gdb) x/2i $pc
(gdb) p/x ($cpsr >> 6) & 0xf
```

마지막 값은 DAIF 네 비트를 하위 4 bit로 모은 것으로, 모두 마스크됐으면 `0xf`, 본문의 `0x600002c5`에서는 `0xb`입니다. kernel을 올릴 주소나 Image 헤더가 달라졌다면 breakpoint도 `booti`가 선택할 진입 주소에 맞춥니다. QEMU 연결·레지스터 확인 방법은 [공식 GDB 사용 문서](https://www.qemu.org/docs/master/system/gdb.html)에 설명되어 있습니다.

```text
Breakpoint 1, 0x0000000040600000 in ?? ()
x0             0x7d485000          2101891072
x1             0x0                 0
x2             0x0                 0
x3             0x0                 0
pc             0x40600000          0x40600000
cpsr           0x600002c5          [ SP EL=1 F I D BTYPE=0 C Z ]
=> 0x40600000:	ccmp	x18, #0x0, #0xd, pl	// pl = nfrst
   0x40600004:	b	0x423120f0
```

문서의 "Primary CPU general-purpose register settings"와 하나씩 맞춰 봅니다.

- `x0 = 0x7d485000`: 바로 위 로그의 "Loading Device Tree to 7d485000"과 같은 주소입니다. 원래 위치(`fdtcontroladdr`)가 아니라 **옮긴 뒤의 주소**가 넘어갑니다.
- `x1`~`x3 = 0`: 문서가 "reserved for future use"로 0을 요구하는 값입니다. U-Boot는 `arch/arm/lib/bootm.c`에서 `armv8_switch_to_el2((u64)images->ft_addr, 0, 0, 0, …)`로 이 네 값을 넘깁니다.
- `cpsr = 0x600002c5`: 하위 4 bit `0x5`는 EL1h, 곧 EL1입니다.

### 인터럽트 마스크 — 문서와 다른 한 비트

문서의 CPU mode 절은 "All forms of interrupts must be masked in PSTATE.DAIF (Debug, SError, IRQ and FIQ)"라고 네 가지를 모두 요구합니다. 위 `cpsr`의 DAIF는 D(bit 9)·I(bit 7)·F(bit 6)가 1이지만 **A(SError, bit 8)는 0**입니다.

소스를 따라가면 이유가 보입니다. `arch/arm/cpu/armv8/start.S`는 U-Boot 자신을 위해 `msr daifclr, #0x4`("Unmask SError interrupts")로 SError를 풉니다. kernel로 넘어가기 전 `cleanup_before_linux()`가 부르는 `disable_interrupts()`는 AArch64용 구현(`arch/arm/lib/interrupts_64.c`)이 아무것도 하지 않고 0을 돌려주는 함수입니다. 그리고 이미 EL1이면 `armv8_switch_to_el2`는 상태를 바꾸지 않고 kernel로 점프합니다. 그래서 reset 때부터 마스크되어 있던 D·I·F는 그대로이고, U-Boot가 푼 A만 풀린 채로 kernel에 들어갑니다. 이 QEMU 환경에서는 kernel이 정상 부팅했지만, 진입 직후 SError가 나는 보드라면 kernel이 예외 벡터를 준비하기 전에 받게 되는 조건입니다. ABI를 검증할 때는 레지스터 값뿐 아니라 이런 상태 비트까지 실제로 봐야 하는 이유입니다.

## EL1과 EL2

문서는 진입 EL로 EL2를 권장하고 EL1도 허용합니다. QEMU에 `-machine virt,virtualization=on`을 주면 U-Boot가 EL2에서 실행되고, 같은 절차의 결과가 달라집니다.

| | 기본 (`virt`) | `virt,virtualization=on` |
| --- | --- | --- |
| 진입 `cpsr` | `0x600002c5` (EL1h) | `0x600002c9` (EL2h) |
| `x0` / `x1`~`x3` | `0x7d485000` / 0 | `0x7d485000` / 0 |
| kernel 로그 | `CPU: All CPU(s) started at EL1`, `kvm [1]: HYP mode not available` | `CPU: All CPU(s) started at EL2`, `kvm [1]: IPA Size Limit: 44 bits` |

EL1로 들어오면 kernel은 hypervisor 모드를 쓸 수 없어 KVM이 꺼집니다. 문서가 EL2를 "RECOMMENDED in order to have access to the virtualisation extensions"라고 쓴 이유가 이 한 줄입니다. 가상화를 쓰는 제품이라면 TF-A나 U-Boot가 kernel을 EL2로 넘기도록 구성되어 있는지 이 로그로 확인합니다.

## initrd와 cache·MMU 조건

같은 문서의 나머지 AArch64 조건 중 부트로더 쪽에서 자주 걸리는 것들입니다.

- initrd를 넘긴다면 kernel Image를 포함하는 1 GB 정렬, 최대 32 GB 크기의 물리 주소 창 안에 완전히 들어 있어야 합니다.
- MMU는 꺼져 있어야 하고, kernel이 놓인 범위는 PoC까지 clean되어 있어야 합니다. U-Boot는 `cleanup_before_linux()`에서 I-cache와 D-cache를 끄고 무효화합니다(AArch64에서 `dcache_disable()`은 MMU도 함께 끕니다).
- DTB는 8 byte 경계, 2 MB 이하이며, 특정 속성으로 매핑되어야 하는 2 MB 영역 안에 두면 안 됩니다.

## 다른 아키텍처는 무엇이 다른가

같은 v6.12 문서들의 진입 조건을 나란히 놓으면 다음과 같습니다.

| 아키텍처 | 문서 | DTB/부트 정보 | 그 밖의 레지스터·상태 |
| --- | --- | --- | --- |
| AArch64 | `arm64/booting.rst` | `x0` = DTB 물리 주소 | `x1`~`x3` = 0, MMU off, DAIF 마스크, EL2 권장 |
| ARM32 | `arm/booting.rst` | `r2` = ATAGS 또는 DTB 물리 주소 | `r0` = 0, `r1` = machine type, IRQ·FIQ 비활성 |
| RISC-V | `riscv/boot.rst` | `a1` = DT 주소 | `a0` = 현재 hart ID, `satp` = 0 (MMU off) |
| x86-64 | `x86/boot.rst` (64-bit Boot Protocol) | `rsi` = `struct boot_params` 주소 | 64-bit mode·paging 켜진 상태, 진입점 = 적재 주소 + `0x200`, 인터럽트 비활성 |

ARM32 문서는 kernel decompressor가 DTB를 덮지 않으면서 low-memory mapping 안에 들도록, RAM 시작에서 128 MiB 경계 바로 위를 안전한 DTB 위치로 제시합니다(initramfs는 그 DTB 바로 위). RISC-V는 UEFI로 부팅할 때 EFI stub이 boot hart ID를 펌웨어에서 얻어야 하므로, 문서가 그 방법을 따로 정합니다. `RISCV_EFI_BOOT_PROTOCOL`이 권장 방법이고, devicetree의 `boot-hartid` 노드는 deprecated이며 새 펌웨어는 프로토콜을 구현해야 합니다. x86은 레지스터 몇 개가 아니라 `boot_params`("zero page")라는 구조체를 채워 넘기는 방식이라 성격이 가장 다릅니다.

## U-Boot 명령과 경로

| 명령 | 다루는 형식 | 이 시리즈에서 본 곳 |
| --- | --- | --- |
| `booti` | AArch64 `Image` (위 헤더) | 이 글, [14장](/blog/embedded/bootloader/chapter14-bootflow-bootmeth) extlinux |
| `bootm` | FIT·legacy image | [15장](/blog/embedded/bootloader/chapter15-fit-image), [16장](/blog/embedded/bootloader/chapter16-verified-boot) |
| `bootz` | ARM32 `zImage` | — |
| `bootefi` | EFI 프로그램 (kernel의 EFI stub 포함) | [18장](/blog/embedded/bootloader/chapter18-efi-in-uboot) |

`bootefi` 경로에서는 위의 레지스터 규약을 U-Boot가 아니라 kernel의 EFI stub이 맞춥니다. 18장 로그의 `EFI stub: Exiting boot services...` 다음이 이 글의 진입 지점에 해당합니다.

## 정리

- arm64 Image 헤더(Debian 6.12): `text_offset` 0, `image_size` 36.94 MiB(파일보다 큼), `flags` 0xa(LE, 4K, 배치 자유).
- `booti`는 bit 3이 1이면 적재 주소를 2 MiB로 올림해 옮깁니다. `0x40480000` → `0x40600000`으로 `image_size`만큼 이동했습니다.
- 진입 순간 `x0`는 U-Boot가 **옮긴 뒤의** DTB 주소(`0x7d485000`), `x1`~`x3`는 0이었습니다.
- v2024.04의 이 경로에서는 DAIF 중 SError(A)가 풀린 채로 진입했습니다. `start.S`가 풀고, AArch64 `disable_interrupts()`는 아무것도 하지 않습니다.
- EL1 진입이면 KVM이 꺼지고(`HYP mode not available`), EL2 진입이면 켜집니다.
- ARM32는 `r2`, RISC-V는 `a1`(hart ID는 `a0`), x86-64는 `rsi`의 `boot_params`로 부트 정보를 넘깁니다.

## 다음 장 예고

다음 장에서는 RAUC와 SWUpdate가 업데이트 번들을 어떻게 만들고 설치하는지, 그리고 [17장](/blog/embedded/bootloader/chapter17-ab-update)에서 본 U-Boot 쪽 슬롯 변수(`BOOT_ORDER`, `BOOT_<이름>_LEFT`)와 어떻게 이어지는지 비교합니다.

## 관련 항목

- [Ch 18: EFI in U-Boot](/blog/embedded/bootloader/chapter18-efi-in-uboot) — Linux EFI stub 이전의 EFI handoff
- [Ch 20: RAUC / SWUpdate](/blog/embedded/bootloader/chapter20-rauc-swupdate) — update framework와 bootchooser contract
- [U-Boot v2024.04 `arch/arm/lib/image.c`](https://github.com/u-boot/u-boot/blob/v2024.04/arch/arm/lib/image.c) · [`arch/arm/lib/bootm.c`](https://github.com/u-boot/u-boot/blob/v2024.04/arch/arm/lib/bootm.c)
- [Linux ARM64 boot protocol v6.12](https://docs.kernel.org/6.12/arch/arm64/booting.html)
- [Linux ARM boot protocol v6.12](https://docs.kernel.org/6.12/arch/arm/booting.html)
- [Linux RISC-V boot requirements v6.12](https://docs.kernel.org/6.12/arch/riscv/boot.html)
- [Linux x86 boot protocol v6.12](https://docs.kernel.org/6.12/arch/x86/boot.html)
