---
title: "Arm 임베디드 부트 단계 — TF-A BL1·BL2·BL31·BL33과 U-Boot SPL/TPL"
slug: "embedded/bootloader/chapter04-boot-stages"
date: 2026-05-09T09:04:00
description: "TF-A의 대표 AArch64 단계와 U-Boot SPL/TPL 모델을 소개하고, Linux 진입 인자와 보드별 단계 차이를 설명합니다."
series: "Bootloader Internals"
seriesOrder: 4
tags: [embedded, bootloader, u-boot, tf-a, spl]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

부트 단계가 여러 개로 나뉘는 이유는 세 가지 제약입니다. reset 직후 쓸 수 있는 메모리가 작고, mask ROM은 고칠 수 없고, EL3 같은 높은 권한 코드는 작고 오래 상주해야 합니다. 이 장은 두 실제 배치를 나란히 봅니다. QEMU에서 TF-A가 BL1부터 맡는 배치와, i.MX 8M Mini에서 U-Boot SPL이 BootROM 다음을 맡는 배치입니다. TF-A의 `platform_def.h`로 계산한 주소가 부팅 로그의 진입 주소와 바이트 단위로 맞고, imx8mm의 FIT 이미지를 `dumpimage`로 열면 SPL이 BL31과 U-Boot를 어디에 두는지 보입니다.

## 단계가 나뉘는 이유

| 제약 | 결과 | 이 시리즈의 예 |
| --- | --- | --- |
| reset 직후 메모리가 작다 | DRAM을 켜는 작은 단계가 먼저 돈다 | imx8mm SPL 한계 0x27000바이트, QEMU TF-A secure SRAM 1 MiB |
| mask ROM은 고칠 수 없다 | 고칠 수 있는 코드를 그다음 단계에 둔다 | BootROM → SPL / BL1 |
| 권한이 다르다 | EL3 상주 코드는 따로 작게 만든다 | BL31 49,255바이트(release) |

TF-A QEMU에서는 BL1·BL2·BL31이 모두 secure SRAM 1 MiB 안에 있습니다. imx8mm에서는 SPL이 TCM에서 돌고, BL31은 OCRAM, U-Boot Proper는 DRAM으로 갑니다. 같은 "다단 부트"라도 무엇이 어디에 있는지는 플랫폼이 정합니다.

## 배치 A — QEMU, TF-A가 BL1부터

TF-A v2.15.0 `plat/qemu/qemu/include/platform_def.h`의 정의입니다.

```c
#define SEC_ROM_BASE			0x00000000
#define SEC_ROM_SIZE			0x00020000
#define SEC_SRAM_BASE			0x0e000000
#define SEC_SRAM_SIZE			0x00100000
#define SHARED_RAM_BASE			SEC_SRAM_BASE
#define SHARED_RAM_SIZE			0x00001000
#define BL_RAM_BASE			(SHARED_RAM_BASE + SHARED_RAM_SIZE)
#define BL_RAM_SIZE			(SEC_SRAM_SIZE - SHARED_RAM_SIZE)
#define BL1_RO_BASE			SEC_ROM_BASE
#define BL1_RW_BASE			(BL1_RW_LIMIT - 0x12000)
#define BL1_RW_LIMIT			(BL_RAM_BASE + BL_RAM_SIZE)
#define BL2_BASE			(BL31_BASE - 0x35000)
#define BL31_BASE			(BL31_LIMIT - 0x70000)
#define BL31_LIMIT			(BL_RAM_BASE + BL_RAM_SIZE - FW_HANDOFF_SIZE)
#define NS_IMAGE_OFFSET			(NS_DRAM0_BASE + 0x20000000)
```

(관련 줄만 발췌. `NS_DRAM0_BASE`는 0x40000000)

`FW_HANDOFF_SIZE`는 `TRANSFER_LIST`를 켜지 않은 이 빌드에서 0입니다. 그러면 SRAM 끝 0x0e100000에서 거꾸로 계산이 됩니다.

| 이미지 | 계산 | 결과 | 부팅 로그 |
| --- | --- | --- | --- |
| BL1 코드 | `SEC_ROM_BASE` | 0x0 (ROM) | reset PC 0x0 |
| BL1 데이터 | 0x0e100000 − 0x12000 | 0x0e0ee000 | `BL1: RAM 0xe0ee000 - 0xe0f6000` |
| BL31 | 0x0e100000 − 0x70000 | 0x0e090000 | `Entry point address = 0xe090000` |
| BL2 | 0x0e090000 − 0x35000 | 0x0e05b000 | `Entry point address = 0xe05b000` |
| BL33 (U-Boot) | 0x40000000 + 0x20000000 | 0x60000000 | `Entry point address = 0x60000000` |

계산과 로그가 모두 맞습니다. BL2는 BL31 바로 아래에 붙어 있습니다. BL1의 데이터 영역(0x0e0ee000부터 SRAM 끝까지)은 숫자상 BL31의 범위(0x0e090000–0x0e100000) 안에 겹칩니다. 실제 BL31 이미지는 로그대로 0x0e090000–0x0e09f89b만 차지해서 BL1 데이터까지 닿지 않습니다. BL2는 BL31과 BL33을 올린 뒤 제어를 BL1에 돌려주고, BL1이 BL31로 점프합니다. 로그의 "BL1: Booting BL31"이 그 순서입니다.

## 배치 B — i.MX 8M Mini, SPL이 BootROM 다음

`imx8mm_evk` v2024.04 빌드의 SPL 설정입니다.

```text
CONFIG_SPL_TEXT_BASE=0x7E1000
CONFIG_SPL_MAX_SIZE=0x27000
CONFIG_SPL_BSS_START_ADDR=0x910000
CONFIG_SPL_BSS_MAX_SIZE=0x2000
CONFIG_SPL_STACK=0x920000
```

SPL 코드는 TCM 0x7E1000에, BSS와 스택은 OCRAM(0x910000, 0x920000 아래)에 있습니다. SPL이 DRAM을 켠 뒤 다음 단계를 가져오는 FIT 이미지는 `flash.bin`의 0x57c00 위치에 있습니다. 그 구간을 잘라 `dumpimage -l`로 읽었습니다.

```text
FIT description: Configuration to load ATF before U-Boot
 Image 0 (uboot)
  Description:  U-Boot (64-bit)
  Type:         Standalone Program
  Data Size:    672720 Bytes = 656.95 KiB = 0.64 MiB
  Load Address: 0x40200000
  Entry Point:  unavailable
 Image 1 (atf)
  Description:  ARM Trusted Firmware
  Type:         Firmware
  Data Size:    0 Bytes = 0.00 KiB = 0.00 MiB
  Load Address: 0x00920000
 Image 3 (fdt-1)
  Description:  imx8mm-evk
  Type:         Flat Device Tree
  Data Size:    41168 Bytes = 40.20 KiB = 0.04 MiB
 Default Configuration: 'config-1'
 Configuration 0 (config-1)
  Description:  imx8mm-evk
  Kernel:       unavailable
  Firmware:     uboot
  FDT:          fdt-1
  Loadables:    atf
```

(`Created`·`Compression`·`Architecture`·`OS` 줄과 `Image 2 (fip)` 생략)

`atf`의 크기가 0인 것은 `bl31.bin` 없이 빌드했기 때문입니다([Ch 2](/blog/embedded/bootloader/chapter02-u-boot-position)). 읽을 것은 주소입니다. BL31은 OCRAM 0x920000, 즉 SPL 스택 꼭대기 바로 위에 놓이고, U-Boot Proper는 DRAM 0x40200000에 놓입니다. firmware인 `uboot`에 entry가 없어서 첫 loadable `atf`의 entry가 점프 주소가 됩니다. SPL은 "U-Boot로 간다"는 분기를 타면서 실제로는 BL31에 도착합니다. 이 경로는 [Ch 24](/blog/embedded/bootloader/chapter24-spl-deep)에서 `common/spl/spl.c`와 `spl_fit.c`로 따라갑니다.

| 단계 | 위치 | 크기 |
| --- | --- | --- |
| BootROM | mask ROM | — |
| SPL | TCM 0x7E1000 (BSS·스택은 OCRAM) | 152,599바이트 |
| BL31 | OCRAM 0x920000 | (TF-A `PLAT=imx8mm` 빌드) |
| U-Boot Proper | DRAM 0x40200000 | 672,720바이트 (DTB 제외) |

## TPL

U-Boot에는 SPL 앞에 한 단계를 더 두는 TPL이 있습니다. v2024.04 `configs/`에서 `CONFIG_TPL=y`인 defconfig는 39개이고, 그중 28개가 Rockchip 보드입니다. 나머지는 대부분 Freescale P1010·P1020·P2020 계열 NAND 부팅 보드와 sandbox입니다. U-Boot v2024.04의 Rockchip 문서(`doc/board/rockchip/rockchip.rst`)는 TPL을 DRAM 초기화 자리로 다룹니다. U-Boot 소스에 DRAM 초기화가 없는 SoC는 Rockchip rkbin의 DDR 바이너리를 `ROCKCHIP_TPL`로 넣어 TPL/SPL 이미지를 만들라고 안내합니다. 이 시리즈의 두 배치는 TPL을 쓰지 않습니다.

![U-Boot SPL/TPL 모델 — BootROM → TPL(작은 SRAM, 옵션) → SPL(DDR init + U-Boot Proper 적재) → U-Boot Proper(DDR) → Linux Kernel](/images/blog/bootloader/diagrams/ch04-uboot-spl-tpl.svg)

## Exception level의 변화

![ARMv8-A 부트 단계 — BL1 → BL2 → BL31 → BL33 → Linux와 EL 권한](/images/blog/bootloader/diagrams/chapter04-armv8-boot-stages.svg)

TF-A 디버그 로그는 다음 단계로 넘어갈 때마다 SPSR을 남깁니다. SPSR의 M[3:0]이 그 단계가 실행될 EL입니다.

| 단계 | SPSR | EL | world |
| --- | --- | --- | --- |
| BL1 | — (reset) | EL3 | secure |
| BL2 | 0x3c5 | EL1h | secure (S-EL1) |
| BL31 | 0x3cd | EL3h | secure |
| BL33 = U-Boot | 0x3c5 | EL1h | non-secure |

BL2와 U-Boot의 SPSR은 같은 0x3c5입니다. 둘의 차이는 SPSR이 아니라 SCR_EL3.NS 비트로 정하는 world입니다. 이 QEMU 구성은 EL2가 없어서 U-Boot가 EL1에 있습니다. `virtualization=on`이면 BL33은 EL2로 들어갑니다([Ch 1](/blog/embedded/bootloader/chapter01-boot-problem)).

![TrustZone EL3 splits secure and non-secure worlds](/images/blog/bootloader/diagrams/ch04-trustzone-el-split.svg)

## RISC-V의 대응

U-Boot v2024.04 `doc/board/emulation/qemu-riscv.rst`가 설명하는 SPL 구성에서는 SPL이 M-mode에서 시작합니다. SPL은 U-Boot Proper와 OpenSBI `FW_DYNAMIC`을 FIT에서 올리고, OpenSBI가 U-Boot Proper를 S-mode로 시작합니다. 위 imx8mm의 "SPL → BL31 → U-Boot Proper"와 모양이 같고, BL31 자리에 OpenSBI가 들어갑니다. QEMU에서 OpenSBI가 다음 단계를 S-mode로 넘기려는 로그는 [Ch 2](/blog/embedded/bootloader/chapter02-u-boot-position)에 있습니다.

| 단계 | Armv8 (imx8mm) | RISC-V (U-Boot SPL 구성) |
| --- | --- | --- |
| 첫 프로그램 | SPL (EL3) | SPL (M-mode) |
| 상주 firmware | BL31 (EL3) | OpenSBI (M-mode) |
| 부트 정책 | U-Boot Proper (EL2/EL1) | U-Boot Proper (S-mode) |

RISC-V의 privilege mode와 Arm의 Exception level은 다른 개념입니다. SBI 호출과 SMC도 같은 ABI가 아니라 각 ISA의 firmware 인터페이스입니다.

## 단계 사이에 넘기는 것

| 인계 | 넘기는 것 | 확인한 곳 |
| --- | --- | --- |
| BL2 → BL1 → BL31 | 다음 이미지들의 entry point·SPSR (`entry_point_info`) | TF-A 디버그 로그 |
| BL31 → BL33 | entry 0x60000000, SPSR 0x3c5 | TF-A 디버그 로그 |
| SPL → BL31 (imx8mm) | FIT `atf` 노드의 load·entry 0x920000 | `arch/arm/dts/imx8mm-u-boot.dtsi`의 `entry = <0x920000>`, [Ch 24](/blog/embedded/bootloader/chapter24-spl-deep) |
| U-Boot → Linux | `x0` = DTB 물리 주소, `x1`–`x3` = 0 | gdb로 확인, [Ch 19](/blog/embedded/bootloader/chapter19-kernel-handoff) |

`x0`에 DTB를 넣는 규약은 Linux AArch64 커널 진입에만 해당합니다. 앞선 firmware 단계 사이의 인계는 각 프로젝트가 정합니다.

## 로그로 단계 찾기

어느 단계가 멈췄는지는 시리얼에 마지막으로 찍힌 줄의 접두어로 압니다. 각 접두어는 소스에서 이렇게 나옵니다.

| 접두어 | 출력하는 곳 |
| --- | --- |
| `U-Boot SPL 2024.04 (...)` | `common/spl/spl.c`의 `preloader_console_init()`, `CONFIG_SPL_BANNER_PRINT=y`일 때 (imx8mm에서 켜짐) |
| `SPL: ...` 오류 | `include/spl.h`의 `SPL_TPL_PROMPT` ("SPL: ") |
| `NOTICE:  BL1:` / `BL2:` / `BL31:` | TF-A 각 단계 (`NOTICE` 이상은 release 빌드에서도 출력) |
| `U-Boot 2024.04 (...)` | U-Boot Proper |

`preloader_console_init()`이 불리기 전, 즉 SPL이 시리얼을 초기화하기 전에 멈추면 아무것도 출력되지 않습니다. 그 구간은 `CONFIG_DEBUG_UART`로 초기 UART를 직접 쓰거나 JTAG으로 봅니다([Ch 22](/blog/embedded/bootloader/chapter22-debugging)).

## 정리

- 단계는 메모리 크기, ROM의 불변성, 권한 분리 때문에 나뉩니다.
- QEMU TF-A는 secure SRAM 1 MiB 끝에서부터 BL31, BL2, BL1 데이터를 배치하고, `platform_def.h` 계산이 로그 주소와 그대로 맞습니다.
- imx8mm은 SPL이 TCM에서 돌며 FIT에서 BL31을 OCRAM 0x920000에, U-Boot를 DRAM 0x40200000에 올립니다.
- TPL은 v2024.04에서 39개 defconfig만 쓰고, 그중 28개가 Rockchip입니다.
- BL2와 BL33은 SPSR이 같아도 world가 다릅니다. world는 SCR_EL3.NS로 정합니다.
- 시리얼의 마지막 접두어로 멈춘 단계를 찾습니다. SPL 배너 전의 멈춤은 debug UART나 JTAG으로 봅니다.

## 다음 편

[Ch 5: Falcon Mode — SPL이 커널을 직접 부팅](/blog/embedded/bootloader/chapter05-falcon-mode)에서는 U-Boot Proper를 건너뛰는 구성을 다룹니다.

## 근거 자료

- TF-A v2.15.0 `plat/qemu/qemu/include/platform_def.h`, QEMU 디버그 빌드 부팅 로그.
- U-Boot v2024.04: `imx8mm_evk` `.config`, `flash.bin`에서 잘라낸 FIT의 `dumpimage -l`, `arch/arm/dts/imx8mm-u-boot.dtsi`, `common/spl/spl.c`(`preloader_console_init`), `include/spl.h`(`SPL_TPL_NAME`, `SPL_TPL_PROMPT`), `configs/*`(`CONFIG_TPL=y`), `doc/board/rockchip/rockchip.rst`(TPL), `doc/board/emulation/qemu-riscv.rst`.
- [TF-A Firmware Design](https://trustedfirmware-a.readthedocs.io/en/v2.15.0/design/firmware-design.html): BL 단계의 역할.
- [Linux AArch64 boot protocol](https://docs.kernel.org/6.12/arch/arm64/booting.html).

## 관련 항목

- [Ch 1: 부트로더가 푸는 문제](/blog/embedded/bootloader/chapter01-boot-problem)
- [Ch 2: U-Boot의 위치](/blog/embedded/bootloader/chapter02-u-boot-position)
- [Ch 5: Falcon Mode](/blog/embedded/bootloader/chapter05-falcon-mode)
- [Ch 8: board_init_f vs board_init_r](/blog/embedded/bootloader/chapter08-board-init)
- [Ch 15: FIT Image](/blog/embedded/bootloader/chapter15-fit-image)
- [Ch 24: SPL 심화](/blog/embedded/bootloader/chapter24-spl-deep)
- [BSP Ch 7: TF-A와 TrustZone 통합](/blog/embedded/bsp/chapter07-tfa-trustzone)
- [Embedded Security Ch 2: Secure Boot 체인](/blog/embedded/embedded-security/chapter02-secure-boot)
