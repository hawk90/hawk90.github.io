---
title: "임베디드 Bootloader 체인 — BootROM·SPL·U-Boot·Kernel·Secure Boot"
slug: "embedded/modern-recipes/part3-12-bootloader-chain"
date: 2026-04-12T09:34:00
description: "Cortex-A 부팅 단계. BootROM → SPL → U-Boot → Linux. Secure boot, FIT image, A/B."
series: "Modern Embedded Recipes"
seriesOrder: 34
tags: [recipes, bootloader, u-boot, secure-boot, spl]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"부팅은 점진적 환경 확장입니다."** 작은 ROM에서 출발해 전체 OS까지 확장합니다.

## Cortex-A 부팅 단계

부트 체인을 그림으로 보면 다음과 같습니다.

![Bootloader chain — BootROM에서 init까지](/images/blog/modern-recipes/diagrams/part1-05-bootloader-chain.svg)

U-Boot v2024.04 `doc/develop/spl.rst`는 자기 단계를 TPL → VPL → SPL → U-Boot proper로 나누고, 앞의 셋은 선택 사항이라고 적습니다("While many boards use SPL, less use TPL"). 그 앞에 칩의 BootROM이, 뒤에 kernel이 옵니다.

| 단계 | 크기 근거 | 실행 위치 | 주 역할 |
| --- | --- | --- | --- |
| 1. BootROM | 칩 mask ROM, 변경 불가 | on-chip | 부트 매체 선택, 다음 단계 헤더 확인·로드 |
| 2. SPL | `CONFIG_SPL_MAX_SIZE` 기본값: i.MX8MM `0x27000`, Allwinner(SRAM 0x10000/0x20000) `0x7fa0`, i.MX6(OCRAM 256 KB 아님) `0x10000` | on-chip SRAM | DRAM 초기화, U-Boot proper(또는 TF-A) 로드 |
| 3. U-Boot proper | `qemu_arm64` 빌드의 `u-boot.bin` 1,047,344 byte | DRAM | env·script·shell, kernel·DTB·initrd 로드 후 점프 |
| 4. Linux kernel | — | DRAM | DTB 파싱, driver init, init 시작 |
| 5. systemd / busybox init | — | rootfs mount 후 | 응용 시작 |

SPL 크기 값은 `common/spl/Kconfig`의 `config SPL_MAX_SIZE` 기본값 목록에서 그대로 옮겼습니다. 같은 "SPL"이라도 칩의 SRAM에 맞춰 i.MX8MM과 Allwinner의 한도가 다섯 배 가까이 차이 납니다.

## BootROM

BootROM은 칩에 구워진 mask ROM이라 고칠 수 없습니다. strap pin이나 fuse로 부트 매체(SD·eMMC·NOR·USB/UART recovery)를 고르고, 그 매체의 정해진 위치에서 다음 단계를 찾습니다. 위치는 칩마다 다르고, U-Boot의 보드 문서가 `dd` 명령으로 그 위치를 적어 둡니다.

| SoC | U-Boot v2024.04 문서 | 쓰는 위치 |
| --- | --- | --- |
| i.MX6 (SabreSD) | `doc/board/nxp/mx6sabresd.rst` | `SPL`을 `bs=1K seek=1`(1 KiB), `u-boot-dtb.img`를 `seek=69` |
| i.MX8MM EVK | `doc/board/nxp/imx8mm_evk.rst:51` | `flash.bin`을 `bs=1024 seek=33`(33 KiB) |
| i.MX8QXP MEK | `doc/board/nxp/imx8qxp_mek.rst:62` | `flash.bin`을 `bs=1024 seek=32` |
| Allwinner | `doc/board/allwinner/sunxi.rst:122` | `bs=1k seek=8`(8 KiB). H3 이후 SoC는 128 KiB도 본다 |

secure boot가 켜져 있으면 BootROM은 로드한 이미지의 서명도 확인합니다. 이 부분은 아래 Secure Boot 절에서 다룹니다.

## SPL (Secondary Program Loader)

`doc/develop/spl.rst`는 SPL을 "Sets up SDRAM and loads U-Boot proper"라고 정의합니다. 실제 보드 코드를 보면 그 순서가 그대로 보입니다. 아래는 v2024.04 `board/freescale/imx8mm_evk/spl.c`의 `board_init_f()`에서 오류 처리를 빼고 줄였습니다.

```c
void board_init_f(ulong dummy)
{
	arch_cpu_init();
	init_uart_clk(1);
	timer_init();
	memset(__bss_start, 0, __bss_end - __bss_start);   /* BSS clear */
	spl_early_init();                                   /* DM, DT */
	preloader_console_init();                           /* SPL 배너 */
	enable_tzc380();
	power_init_board();                                 /* PMIC */
	spl_dram_init();                                    /* ddr_init(&dram_timing) */
	board_init_r(NULL, 0);
}
```

다음 단계 로드는 공통 코드인 `common/spl/spl.c`의 `board_init_r()`가 합니다. `board_boot_order()`로 부트 장치 목록을 받아 `boot_from_devices()`로 차례로 시도하고, 모두 실패하면 `failed to boot from all boot devices`를 찍고 멈춥니다. 성공하면 이미지 종류(`IH_OS_U_BOOT`, `IH_OS_ARM_TRUSTED_FIRMWARE`, `IH_OS_TEE`, `IH_OS_LINUX` 등)에 따라 점프 함수를 고릅니다. 앞 표의 `SPL_MAX_SIZE`가 이 코드 전체가 SRAM에 들어가야 하는 한도입니다.

## U-Boot Proper

U-Boot v2024.04를 `qemu_arm64_defconfig`로 빌드해 QEMU 11.1.3 `virt`(Cortex-A57, 1 GiB)에서 띄우고, 자동 부팅을 멈춘 뒤 기본 환경을 봤습니다.

```text
Hit any key to stop autoboot:  2  0
=> printenv bootcmd bootdelay kernel_addr_r fdt_addr ramdisk_addr_r
bootcmd=bootflow scan -lb
bootdelay=2
kernel_addr_r=0x40400000
fdt_addr=0x40000000
ramdisk_addr_r=0x44000000
```

`bootcmd`는 자동 실행 명령이고, `bootdelay` 초 동안 키 입력이 없으면 실행됩니다. 이 빌드의 기본값은 예전 `distro_bootcmd` 스크립트가 아니라 standard boot의 `bootflow scan -lb`입니다. 주소는 QEMU 보드의 `board/emulation/qemu-arm/qemu-arm.env`에서 오므로 실제 보드에서는 값이 다릅니다. 손으로 kernel을 띄울 때는 이 변수를 그대로 씁니다.

```bash
=> setenv bootargs "console=ttyAMA0 root=/dev/vda2"
=> load virtio 0:1 ${kernel_addr_r} Image
=> booti ${kernel_addr_r} - ${fdt_addr}
```

환경 변수와 `bootflow`는 [Bootloader 13장](/blog/embedded/bootloader/chapter13-env-bootcmd)과 [14장](/blog/embedded/bootloader/chapter14-bootflow-bootmeth)이 실제 부팅 로그로 다룹니다.

## FIT Image — 통합 부트 이미지

FIT(Flattened Image Tree)은 한 파일에 kernel·DTB·initrd와 각각의 hash·서명을 담는 형식입니다. 다음 `.its`는 kernel에 SHA-256 hash와 RSA-2048 서명 노드를 둡니다. `algo = "sha256,rsa2048"`와 `key-name-hint`는 `doc/usage/fit/signature.rst`의 예와 같은 속성입니다.

```dts
/dts-v1/;
/ {
    description = "ARM kernel image";
    images {
        kernel {
            data = /incbin/("./zImage");
            type = "kernel";
            arch = "arm";
            os = "linux";
            compression = "none";
            load = <0x82000000>;
            entry = <0x82000000>;
            hash-1 { algo = "sha256"; };
            signature-1 {
                algo = "sha256,rsa2048";
                key-name-hint = "dev";
            };
        };
        fdt {
            data = /incbin/("./board.dtb");
            type = "flat_dt";
        };
    };
    configurations {
        default = "conf-1";
        conf-1 {
            kernel = "kernel";
            fdt = "fdt";
        };
    };
};
```

서명은 `mkimage -f fit.its` 만으로 생기지 않습니다. `signature.rst`의 절차는 키 디렉터리(`-k`)로 서명하고, 공개키를 U-Boot의 control DTB에 넣고(`-K control.dtb`), 키를 `required`로 표시(`-r`)하는 세 단계입니다.

```bash
mkdir keys
openssl genpkey -algorithm RSA -out keys/dev.key -pkeyopt rsa_keygen_bits:2048
openssl req -batch -new -x509 -key keys/dev.key -out keys/dev.crt -subj /CN=dev
mkimage -f fit.its -K control.dtb -k keys -r image.fit
```

위 `.its`를 v2024.04로 빌드한 `tools/mkimage`에 그대로 넣어 봤습니다(`zImage`는 4 KiB 임의 데이터, `control.dtb`는 빌드 산출물의 DTB). 서명이 붙었다는 줄과 control DTB에 들어간 공개키 노드는 이렇습니다.

```text
  Hash algo:    sha256
  Sign algo:    sha256,rsa2048:dev
```

```text
	signature {

		key-dev {
			required = "image";
```

`key-name-hint = "dev"`가 키 파일 `keys/dev.key`/`dev.crt`를 고르고, 서명 노드가 image 아래 있으므로 `required = "image"`가 됐습니다.

같은 문서는 이미지만 서명하면 서명된 이미지를 다른 구성으로 섞는 "mix and match" 공격과 옛 이미지로 바꾸는 roll-back 공격을 막지 못한다고 설명하고, 서명을 configuration 노드에 두라고 합니다. 실제 `.itb`의 hash 노드를 dump해서 맞춰 보는 과정은 [Bootloader 15장](/blog/embedded/bootloader/chapter15-fit-image)에 있습니다.

## Secure Boot

secure boot는 각 단계가 다음 단계의 서명을 확인하는 사슬입니다. 첫 고리는 바꿀 수 없는 곳에 있어야 하므로 공개키 hash를 eFuse/OTP에 굽습니다.

| 단계 | 무엇을 검증하나 | 신뢰의 근거 |
| --- | --- | --- |
| BootROM | SPL(또는 BL2) 서명 | eFuse의 공개키 hash (i.MX는 `SRK_HASH`) |
| SPL / BL2 | 다음 단계 이미지 | 앞 단계가 검증한 자기 코드에 든 키 |
| U-Boot | FIT 구성의 kernel·DTB 서명 | control DTB에 넣은 `required` 공개키 |

U-Boot의 i.MX HAB 가이드(`doc/imx/habv4/guides/mx6_mx7_secure_boot.txt` 1.5절)는 SRK hash를 fuse에 구울 때 "An error in SRK Hash results in a part that does not boot"라고 경고합니다. 1.7절은 서명된 이미지가 HAB event 없이 부팅되는 것을 확인한 뒤에야 `SEC_CONFIG[1]` fuse로 칩을 닫으라고 하고, 닫은 뒤에는 "the chip does not load an image that has not been signed using the correct PKI tree"라고 적습니다. kernel 이후의 고리(module 서명, rootfs 검증)와 QEMU에서 고리를 하나 끊어 보는 실험은 [Bootloader 27장](/blog/embedded/bootloader/chapter27-chain-of-trust)이 다룹니다.

### TF-A (Trusted Firmware-A)

TF-A v2.15.0 `docs/design/firmware-design.rst`는 AArch64 cold boot를 다섯 단계로 나눕니다.

| 단계 | 문서의 이름 | 비고 |
| --- | --- | --- |
| BL1 | AP Trusted ROM | |
| BL2 | Trusted Boot Firmware | BL31·BL32·BL33 이미지 로드 |
| BL31 | EL3 Runtime Software | secure monitor, PSCI |
| BL32 | Secure-EL1 Payload | 문서에 "(optional)". OP-TEE 등 |
| BL33 | Non-trusted Firmware | U-Boot나 UEFI |

AArch32에서는 BL31이 없고 BL32가 EL3 Runtime Software 역할을 맡는 네 단계입니다. DRAM 초기화를 BL2가 하는지는 플랫폼 몫입니다. STM32MP1의 U-Boot 문서는 "TF-A (BL2) initialize the DDR and loads the next stage binaries from a FIP file"이라고 적습니다. QEMU에서 BL1부터 BL33까지 실제로 넘어가는 로그는 [Bootloader 25장](/blog/embedded/bootloader/chapter25-tfa-optee)에 있습니다.

## A/B Boot — 안전 업데이트

A/B 업데이트는 kernel·rootfs를 두 벌(`boot_a`/`boot_b`, `root_a`/`root_b`) 두고, 현재 슬롯과 부팅 시도 횟수를 환경 변수에 기록합니다. 횟수 세기는 U-Boot의 `CONFIG_BOOTCOUNT_LIMIT`가 맡습니다. `doc/README.bootcount`의 규칙은 이렇습니다.

- 부팅할 때마다 `bootcount`가 1씩 늘고, 그 값이 `bootlimit`을 넘으면 `bootcmd` 대신 `altbootcmd`를 실행합니다.
- `bootlimit`이 없으면 이 기능은 꺼집니다. `altbootcmd`가 없으면 U-Boot는 shell에 머뭅니다.
- 부팅이 성공하면 `bootcount`를 0으로 되돌리는 것은 "some application code (typically a Linux application)"의 책임입니다.
- `upgrade_available`이 0이면 `bootcount`를 저장하지 않습니다.

그래서 슬롯 전환 자체는 직접 짜야 합니다.

```bash
=> setenv bootlimit 3
=> setenv bootcmd 'if test ${slot} = a; then run boot_a; else run boot_b; fi'
=> setenv altbootcmd 'if test ${slot} = a; then setenv slot b; else setenv slot a; fi; setenv bootcount 0; saveenv; run bootcmd'
```

비교가 `bootcount > bootlimit`이라 `bootlimit=3`이면 네 번째 부팅에서 `altbootcmd`로 넘어갑니다. A/B 파티션만으로는 rollback이 되지 않고, 성공 표시와 환경 저장까지 갖춰야 합니다. 환경 backend별 동작과 QEMU에서 실패를 일부러 일으켜 본 결과는 [Bootloader 17장](/blog/embedded/bootloader/chapter17-ab-update)에 있습니다.

## STM32MP1 부팅 예

U-Boot `doc/board/st/stm32mp1.rst`의 "Boot Sequences" 절은 두 체인을 적습니다.

| 체인 | FSBL (embedded RAM) | SSBL (DDR) | secure monitor |
| --- | --- | --- | --- |
| Trusted (권장) | TF-A BL2 | U-Boot (BL33) | SPMin 또는 OP-TEE |
| Basic (STM32MP15x만) | U-Boot SPL | U-Boot | U-Boot의 PSCI |

문서는 Trusted 체인이 STM32MP13x에서 지원되는 유일한 체인이라고 하고, Basic 체인에 대해서는 "SPL has limited security initialization"이라고 적습니다. GPT에는 `fsbl1`·`fsbl2` 파티션을 각각 256 KiB 이상으로 두는데, 문서는 두 파티션이 같은 내용이고 FSBL 업데이트를 fail-safe로 하려고 둔다고 설명합니다.

## i.MX8QXP 부팅

i.MX8QXP의 `flash.bin`에는 Cortex-A용 코드만 들어가지 않습니다. `doc/board/nxp/imx8qxp_mek.rst`의 Quick Start는 BL31 빌드, `scfw_tcm.bin`과 `ahab-container.img` 받기, U-Boot 빌드 순서이고, 두 파일은 NXP 배포본의 `imx-sc-firmware-1.2.7.1/mx8qx-mek-scfw-tcm.bin`(System Controller Firmware)과 `imx-seco-2.3.1/firmware/seco/mx8qx-ahab-container.img`입니다. AHAB 가이드(`doc/imx/ahab/guides/mx8_mx8x_encrypted_boot.txt`)는 "AHAB is able to decrypt image containers by calling SECO authentication"이라고 적어, 이미지 인증을 SECO가 맡는다는 것을 보여 줍니다. 같은 i.MX8 계열이라도 `imx8mm_evk.rst`의 Quick Start에는 이 두 파일이 없고 BL31과 DDR firmware만 있습니다.

## 부팅 디버깅

### UART 부트 로그 캡처

```bash
screen /dev/ttyUSB0 115200 -L
```

각 단계는 자기 배너를 찍습니다. QEMU의 U-Boot proper는 `U-Boot 2024.04 (...)`, `DRAM:  1 GiB`, `Hit any key to stop autoboot:` 순으로 찍었습니다. SPL은 `preloader_console_init()`에서 serial을 초기화한 뒤 `CONFIG_SPL_BANNER_PRINT`가 켜져 있으면 `U-Boot SPL <버전> (<날짜>)` 배너를 찍고, 모든 장치에서 로드에 실패하면 앞서 본 `failed to boot from all boot devices`를 찍습니다. 마지막으로 보인 배너가 멈춘 단계를 가리킵니다. SPL 배너조차 없으면 SPL이 실행되지 않았거나 그 전의 UART 초기화에서 멈췄다고 봅니다.

### JTAG로 stage별 break

```bash
(gdb) target remote :3333
(gdb) break *0x7E1000   # i.MX8MM SPL entry (CONFIG_SPL_TEXT_BASE)
(gdb) continue
```

break 주소는 그 보드의 `CONFIG_SPL_TEXT_BASE`입니다. `imx8mm_evk_defconfig`는 `0x7E1000`, `stm32mp15_basic_defconfig`는 `0x2FFC2500`입니다. OpenOCD·J-Link 연결 문제는 [JTAG·SWD 편](/blog/embedded/modern-recipes/part10-02-jtag-swd)에서 다룹니다.

## 자주 하는 실수

> ⚠️ Boot partition offset 잘못

```bash
dd if=flash.bin of=/dev/sdX bs=1k seek=8    # Allwinner 위치. i.MX8MM이면 BootROM이 못 찾는다
```

위의 BootROM 표처럼 offset은 칩마다 다릅니다. i.MX6은 1 KiB, i.MX8MM은 33 KiB, Allwinner는 8 KiB입니다. 그 보드의 U-Boot 문서에 적힌 `dd` 명령을 그대로 씁니다.

> ⚠️ console 이름 잘못

```bash
setenv bootargs "console=ttyS0,115200 root=/dev/vda2"   # QEMU virt의 UART는 PL011
```

QEMU `virt`의 DTB에서 `fdt print /chosen`을 하면 `stdout-path = "/pl011@9000000"`이 나옵니다. Linux v6.12의 PL011 driver(`drivers/tty/serial/amba-pl011.c`)는 장치 이름을 `.dev_name = "ttyAMA"`로 등록하므로 이 보드의 console은 `ttyAMA0`입니다. `console=`에 없는 장치를 적으면 kernel 로그가 그 UART로 나오지 않습니다.

> ⚠️ Secure boot key를 잘못 구움

앞의 HAB 가이드가 경고하듯 SRK hash를 틀리게 구우면 그 칩은 부팅하지 않고, fuse는 되돌릴 수 없습니다. 개발 중에는 test key로 서명해 칩을 닫지 않은 상태에서 HAB event를 확인하고, 양산 키와 `SEC_CONFIG` 닫기는 마지막에 합니다.

## 정리

- 부팅은 **BootROM → (TPL) → SPL → U-Boot → Kernel** 순서이고, U-Boot 문서상 TPL·VPL·SPL은 선택 단계입니다.
- SPL은 DRAM 초기화와 다음 단계 로드를 맡고, 크기 한도는 칩 SRAM에 맞춘 `CONFIG_SPL_MAX_SIZE`입니다.
- BootROM이 이미지를 찾는 위치는 칩마다 다르고, U-Boot 보드 문서의 `dd` 명령이 정답입니다.
- **FIT image**의 서명은 configuration에 두고, 공개키를 control DTB에 `required`로 넣어야 검증이 강제됩니다.
- **A/B boot**는 `bootcount`/`bootlimit`/`altbootcmd`와 OS 쪽의 성공 표시가 함께 있어야 rollback이 됩니다.
- TF-A는 AArch64에서 BL1·BL2·BL31·(BL32)·BL33의 다섯 단계를 정의합니다.

다음 편부터 Part 4로 넘어가 **첫 bare-metal 프로그램**을 Linker script와 startup 코드부터 만듭니다.

## 관련 항목

- [Part 4-01: 첫 bare-metal 프로그램](/blog/embedded/modern-recipes/part4-01-first-baremetal)
- [Part 7-03: Device Tree 실전](/blog/embedded/modern-recipes/part7-03-device-tree-basics)
- [Part 10-02: JTAG·SWD 안 붙을 때](/blog/embedded/modern-recipes/part10-02-jtag-swd)
- [Bootloader 4장: Arm 임베디드 부트 단계](/blog/embedded/bootloader/chapter04-boot-stages)
- [Bootloader 24장: SPL·TPL 내부 해부](/blog/embedded/bootloader/chapter24-spl-deep)
