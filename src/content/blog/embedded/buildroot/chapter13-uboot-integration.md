---
title: "Buildroot U-Boot 통합 — 빌드·env·fw_env 흐름"
slug: "embedded/buildroot/chapter13-uboot-integration"
date: 2026-05-19T09:13:00
description: "Buildroot가 U-Boot를 가져와 빌드·패키징하는 방식과 env·fw_env.config로 런타임에 접근하는 패턴."
series: "Buildroot Practical"
seriesOrder: 13
tags: [embedded, buildroot, u-boot, bootloader, fw-env]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"U-Boot도 한 트리 안에 둡니다."** — kernel·rootfs와 같은 toolchain·같은 git 트리에서 빌드돼야 *시그니처·DTB·env offset*이 어긋나지 않습니다. Buildroot는 U-Boot를 *그냥 또 하나의 패키지*처럼 다룹니다.

## 왜 U-Boot까지 Buildroot가 빌드하는가

U-Boot를 별도 트리에서 빌드해 손으로 SD 카드에 옮기는 방식은 첫 prototype에서는 빠릅니다. 다만 U-Boot 버전·설정·env 위치가 rootfs 쪽 설정(`fw_env.config` 등)과 따로 관리되기 시작하면 둘이 어긋나기 쉽습니다. 열쇠와 자물쇠를 다른 가게에서 맞추는 것과 같습니다.

이 장의 U-Boot 산출물과 설정값은 Ch 10에서 **Buildroot 2026.02.3**으로 실제 빌드한 BeagleBone 이미지(U-Boot 2026.01, `am335x_evm` defconfig)에서 가져왔습니다.

Buildroot는 *같은 트리·같은 toolchain·같은 commit*으로 U-Boot까지 만듭니다. 산출물은 `output/images/`에 다른 산출물(`zImage`, `rootfs.ext4`)과 *나란히* 놓입니다. 한 트리를 clone하면 *부트로더부터 application까지* 완전히 재현 가능한 시스템이 됩니다.

## BR2_TARGET_UBOOT 옵션 한눈에

`Bootloaders` 메뉴 아래 `U-Boot`를 켜면 다음 트리가 열립니다. 자주 쓰는 것만 정리합니다.

| 옵션 | 의미 |
|---|---|
| `BR2_TARGET_UBOOT=y` | U-Boot 빌드 활성화 |
| `BR2_TARGET_UBOOT_LATEST_VERSION=y` | Buildroot가 기본 버전을 따라감 |
| `BR2_TARGET_UBOOT_CUSTOM_VERSION=y` | 특정 버전 고정 (예: `2024.04`) |
| `BR2_TARGET_UBOOT_CUSTOM_TARBALL=y` | 외부 tarball |
| `BR2_TARGET_UBOOT_CUSTOM_GIT=y` | 외부 git remote |
| `BR2_TARGET_UBOOT_BOARD_DEFCONFIG` | tree 안의 defconfig 이름 |
| `BR2_TARGET_UBOOT_USE_CUSTOM_CONFIG=y` | 외부 `.config` 파일 사용 |
| `BR2_TARGET_UBOOT_CONFIG_FRAGMENT_FILES` | 추가 fragment(여러 개 가능) |
| `BR2_TARGET_UBOOT_PATCH` | 적용할 patch 파일 / 디렉터리 |
| `BR2_TARGET_UBOOT_FORMAT_*` | 산출물 형식 (bin, img, kwb, imx 등) |
| `BR2_TARGET_UBOOT_SPL=y` | SPL을 함께 빌드 |
| `BR2_TARGET_UBOOT_SPL_NAME` | SPL 산출물 이름 (`MLO`, `u-boot-spl.bin`) |
| `BR2_PACKAGE_HOST_UBOOT_TOOLS=y` | host용 U-Boot tools(`mkimage` 등). 아래 두 옵션은 이 메뉴 안에 있음 |
| `BR2_PACKAGE_HOST_UBOOT_TOOLS_BOOT_SCRIPT=y` | `boot.scr` 자동 생성 |
| `BR2_PACKAGE_HOST_UBOOT_TOOLS_BOOT_SCRIPT_SOURCE` | `boot.cmd`의 경로 |

대표적인 설정은 다음과 같습니다.

Ch 10에서 실제로 쓴 설정(`beaglebone_defconfig` + 추가 줄)입니다.

```text
BR2_TARGET_UBOOT=y
BR2_TARGET_UBOOT_BUILD_SYSTEM_KCONFIG=y
BR2_TARGET_UBOOT_CUSTOM_VERSION=y
BR2_TARGET_UBOOT_CUSTOM_VERSION_VALUE="2026.01"
BR2_TARGET_UBOOT_BOARD_DEFCONFIG="am335x_evm"
BR2_TARGET_UBOOT_NEEDS_DTC=y
BR2_TARGET_UBOOT_NEEDS_OPENSSL=y
BR2_TARGET_UBOOT_NEEDS_GNUTLS=y
# BR2_TARGET_UBOOT_FORMAT_BIN is not set
BR2_TARGET_UBOOT_FORMAT_IMG=y
BR2_TARGET_UBOOT_SPL=y
BR2_TARGET_UBOOT_SPL_NAME="MLO"
BR2_PACKAGE_HOST_UBOOT_TOOLS=y
BR2_PACKAGE_HOST_UBOOT_TOOLS_BOOT_SCRIPT=y
BR2_PACKAGE_HOST_UBOOT_TOOLS_BOOT_SCRIPT_SOURCE="$(BR2_EXTERNAL_ACME_PATH)/board/acme/bbb/boot.cmd"
```

`LATEST_VERSION`을 고르면 2026.02.3에서는 `boot/uboot/Config.in` 88행의 `default "2026.01"`입니다.

각 항목은 다음 절에서 풀어 설명합니다.

## Source location 4가지

`Source` 토글로 *어디서 U-Boot 소스를 가져올지*를 정합니다. 네 가지 선택지가 있습니다.

```text
BR2_TARGET_UBOOT_LATEST_VERSION=y        # Buildroot가 권장하는 mainline 버전
BR2_TARGET_UBOOT_CUSTOM_VERSION=y        # 직접 명시
BR2_TARGET_UBOOT_CUSTOM_TARBALL=y        # 외부 tarball URL
BR2_TARGET_UBOOT_CUSTOM_GIT=y            # 외부 git remote
```

각 선택의 사용 기준은 다음과 같습니다.

| 선택 | 적합한 경우 |
|---|---|
| **Latest** | 학습·prototyping·mainline 보드 |
| **Custom version** | `"2026.01"`처럼 특정 mainline 버전을 고정 |
| **Custom tarball** | vendor가 mirror로 배포하는 *고정 tarball* |
| **Custom git** | vendor fork (NXP/TI/Xilinx의 `u-boot-fslc`, `ti-u-boot` 등) |

vendor fork는 보통 git을 씁니다.

```text
BR2_TARGET_UBOOT_CUSTOM_GIT=y
BR2_TARGET_UBOOT_CUSTOM_REPO_URL="https://github.com/nxp-imx/uboot-imx"
BR2_TARGET_UBOOT_CUSTOM_REPO_VERSION="lf_v2024.04"
```

`lf_v2024.04`는 `git ls-remote`로 확인한 nxp-imx/uboot-imx의 실제 branch입니다. branch는 움직이므로 양산 트리에서는 commit hash로 고정합니다(Ch 12와 같은 이유).

vendor-specific DDR PHY init, eMMC tuning, secure boot ROM API 같은 코드가 fork 안에 들어 있습니다. 가능하면 mainline을 쓰되 *기능이 빠진 부분만* fork를 쓰는 게 장기 유지보수에 유리합니다.

## defconfig — 시작점 선택

U-Boot config 시스템도 Linux와 똑같이 *defconfig + fragments*를 씁니다. 트리 안의 defconfig를 쓰는 가장 일반적인 방식.

```text
BR2_TARGET_UBOOT_BOARD_DEFCONFIG="rpi_4"
```

이렇게 두면 빌드 시 `make rpi_4_defconfig`가 실행되고, U-Boot 트리의 `configs/rpi_4_defconfig`가 baseline이 됩니다. fragment 병합은 커널과 같은 `pkg-kconfig.mk` infra라 Ch 12에서 본 동작(fragment 파일을 고치면 다음 `make`가 다시 merge)이 그대로 적용됩니다.

기존 defconfig가 맞지 않으면 *완전히 외부의* `.config`를 던질 수 있습니다.

```text
BR2_TARGET_UBOOT_USE_CUSTOM_CONFIG=y
BR2_TARGET_UBOOT_CUSTOM_CONFIG_FILE="board/myboard/uboot.config"
```

또는 baseline은 트리 defconfig를 쓰되 *덧붙이는 fragment*만 외부에서 줄 수 있습니다. Ch 12의 kernel customize와 같은 패턴입니다.

```text
BR2_TARGET_UBOOT_BOARD_DEFCONFIG="rpi_4"
BR2_TARGET_UBOOT_CONFIG_FRAGMENT_FILES="board/myboard/uboot-extra.config"
```

`uboot-extra.config`의 내용은 평범한 Kconfig 단편입니다.

```text
CONFIG_BOOTDELAY=1
CONFIG_USE_BOOTCOMMAND=y
CONFIG_BOOTCOMMAND="run distro_bootcmd"
CONFIG_ENV_IS_IN_MMC=y
CONFIG_SYS_MMC_ENV_DEV=0
CONFIG_ENV_OFFSET=0xC0000
CONFIG_ENV_SIZE=0x2000
CONFIG_CMD_FS_GENERIC=y
```

defconfig 자체를 *고치지 않고* fragment로만 덧붙이는 게 유지보수에 좋습니다. U-Boot 버전을 올려 defconfig가 바뀌어도 fragment는 그대로 적용됩니다.

## 산출물 — bin / img / SPL / FIT

U-Boot는 SoC ROM 부트 방식에 따라 여러 형식을 만듭니다. `BR2_TARGET_UBOOT_FORMAT_*`가 어떤 파일을 `output/images/`로 복사할지 정합니다. `boot/uboot/Config.in` 프롬프트 기준의 대표 형식입니다.

| 옵션 | 산출물 |
|---|---|
| `_FORMAT_BIN` | `u-boot.bin` |
| `_FORMAT_IMG` | `u-boot.img` (U-Boot legacy header) |
| `_FORMAT_ITB` | `u-boot.itb` (FIT) |
| `_FORMAT_IMX` | `u-boot.imx` |
| `_FORMAT_KWB` | `u-boot.kwb` (Marvell) |
| `_FORMAT_SB` | `u-boot.sb` (Freescale i.MX28) |
| `_FORMAT_CUSTOM` | `_FORMAT_CUSTOM_NAME`에 적은 파일 |

SPL은 `BR2_TARGET_UBOOT_SPL=y`와 `BR2_TARGET_UBOOT_SPL_NAME`으로 복사합니다. help는 기본값이 `spl/u-boot-spl.bin`이고 "SPL name is MLO on OMAP and SPL on i.MX6 for example"이라고 적습니다. BeagleBone 빌드의 실제 파일입니다.

```text
$ ls -l output/build/uboot-2026.01/{MLO,spl/u-boot-spl.bin,u-boot.bin,u-boot.img}
-rw-r--r-- 1 br br  110524 Nov 16 04:36 MLO
-rwxr-xr-x 1 br br  110004 Nov 16 04:36 spl/u-boot-spl.bin
-rw-r--r-- 1 br br  717536 Nov 16 04:36 u-boot.bin
-rw-r--r-- 1 br br 1564932 Nov 16 04:36 u-boot.img
```

`MLO`는 `u-boot-spl.bin`보다 520바이트 큽니다. AM335x ROM이 읽는 헤더가 붙은 SPL이기 때문입니다. `BR2_TARGET_UBOOT_FORMAT_BIN`이 꺼져 있으므로 `output/images/`에는 `MLO`와 `u-boot.img`만 복사됐습니다(Ch 10의 목록).

여러 산출물을 동시에 켤 수 있고, post-image 단계의 genimage가 이들을 SD 카드 이미지로 묶습니다(Ch 10).

## boot.scr와 uEnv.txt — boot 명령 파일

U-Boot이 부팅 때 실행할 명령은 보드 설정에 따라 SD 카드의 `boot.scr`, `uEnv.txt`, `extlinux/extlinux.conf` 중 무엇에서 올지 정해집니다. BeagleBone 빌드의 U-Boot `.config`에는 `CONFIG_BOOTCOMMAND="run findfdt; run init_console; run finduuid; run distro_bootcmd"`와 `CONFIG_BOOTSTD=y`가 있었습니다. 본체 BeagleBone 보드 파일이 `uEnv.txt`와 `extlinux.conf`를 둘 다 boot 파티션에 넣는 이유입니다.

`boot.scr`은 `mkimage`가 평문 `boot.cmd`를 U-Boot script image로 감싼 파일입니다. `package/uboot-tools/uboot-tools.mk` 213~216행이 그 명령입니다.

```makefile
define HOST_UBOOT_TOOLS_GENERATE_BOOT_SCRIPT
	$(@D)/tools/mkimage -C none -A $(MKIMAGE_ARCH) -T script \
		-d $(call qstrip,$(BR2_PACKAGE_HOST_UBOOT_TOOLS_BOOT_SCRIPT_SOURCE)) \
		$(@D)/tools/boot.scr
endef
```

`BOOT_SCRIPT=y`인데 `BOOT_SCRIPT_SOURCE`가 비어 있으면 같은 파일 209행의 "Please define a source file for U-Boot boot script" 오류로 멈춥니다. Ch 10에서 쓴 `boot.cmd`입니다.

```bash
setenv bootargs "console=ttyS0,115200n8 root=/dev/mmcblk0p2 ro rootfstype=squashfs rootwait"
load mmc 0:1 ${loadaddr} zImage
load mmc 0:1 ${fdtaddr} am335x-boneblack.dtb
bootz ${loadaddr} - ${fdtaddr}
```

생성된 `boot.scr`을 Buildroot가 빌드한 `mkimage`·`dumpimage`로 확인했습니다.

```text
$ host/bin/mkimage -l images/boot.scr
Image Name:   
Created:      Mon Nov 16 04:34:42 2026
Image Type:   ARM Linux Script (uncompressed)
Data Size:    209 Bytes = 0.20 KiB = 0.00 MiB
Load Address: 00000000
Entry Point:  00000000
Contents:
   Image 0: 201 Bytes = 0.20 KiB = 0.00 MiB
$ host/bin/dumpimage -T script -p 0 -o /tmp/boot.cmd.out images/boot.scr
```

꺼낸 내용은 위 `boot.cmd`와 같았습니다. legacy image header에는 CRC가 있어 전송 중 손상은 잡지만 cryptographic 서명은 아닙니다. 서명 검증이 필요하면 FIT image 서명을 씁니다.

`uEnv.txt`는 평문 env 파일입니다. Buildroot가 자동 생성하지는 않고, 본체 BeagleBone 보드는 post-build 스크립트가 `board/beagleboard/beaglebone/uEnv.txt`를 `BINARIES_DIR`로 복사합니다(Ch 7). 그 파일의 핵심 줄입니다.

```text
set_bootargs=setenv bootargs console=${console} root=/dev/${bootpartition} rw rootfstype=ext4 rootwait
uenvcmd=run set_mmc1; run set_bootargs;run loadimage;run loadfdt;printenv bootargs;bootz ${loadaddr} - ${fdtaddr}
```

`booti`는 ARM64 `Image`, `bootz`는 ARM `zImage`, `bootm`은 legacy uImage·FIT용입니다.

## env 위치 — 플래시·eMMC·SD·UBI

U-Boot env는 재부팅 사이에 살아남는 변수 집합입니다. 어디에 저장할지는 U-Boot의 `CONFIG_ENV_IS_IN_*`가 정합니다.

| 옵션 | 저장소 | 짝지을 옵션 |
|---|---|---|
| `CONFIG_ENV_IS_IN_MMC` | eMMC / SD의 raw 영역 | `CONFIG_SYS_MMC_ENV_DEV`, `CONFIG_ENV_OFFSET`, `CONFIG_ENV_SIZE` |
| `CONFIG_ENV_IS_IN_SPI_FLASH` | SPI NOR | `CONFIG_ENV_OFFSET`, `CONFIG_ENV_SECT_SIZE` |
| `CONFIG_ENV_IS_IN_NAND` | raw NAND | `CONFIG_ENV_OFFSET`, `CONFIG_ENV_RANGE` |
| `CONFIG_ENV_IS_IN_UBI` | UBI volume | `CONFIG_ENV_UBI_PART`, `CONFIG_ENV_UBI_VOLUME` |
| `CONFIG_ENV_IS_IN_FAT` | FAT 파일 | `CONFIG_ENV_FAT_INTERFACE`, `CONFIG_ENV_FAT_DEVICE_AND_PART`, `CONFIG_ENV_FAT_FILE` |
| `CONFIG_ENV_IS_NOWHERE` | 저장 안 함 | 매 부팅마다 기본값 사용 |

BeagleBone 빌드의 실제 값(`output/build/uboot-2026.01/.config`)은 FAT 방식이었습니다.

```text
CONFIG_ENV_SIZE=0x20000
CONFIG_ENV_IS_IN_FAT=y
CONFIG_ENV_FAT_INTERFACE="mmc"
CONFIG_ENV_FAT_DEVICE_AND_PART="0:1"
CONFIG_ENV_FAT_FILE="uboot.env"
```

즉 `saveenv`는 mmc 0번의 첫 파티션(Ch 10의 FAT boot 파티션)에 `uboot.env`라는 128 KiB(`0x20000`) 파일을 씁니다. 이 값들은 userspace `fw_env.config`와 정확히 맞아야 합니다.

## fw_env.config — userspace에서 env 접근

런타임에 application이 U-Boot env를 바꿔야 하는 경우가 있습니다. OTA의 A/B 슬롯 전환, bootcount 초기화, factory reset 플래그 등입니다. Buildroot에는 두 가지 구현이 있습니다.

```text
BR2_PACKAGE_LIBUBOOTENV=y                 # libubootenv의 fw_printenv/fw_setenv
# 또는
BR2_PACKAGE_UBOOT_TOOLS=y
BR2_PACKAGE_UBOOT_TOOLS_FWPRINTENV=y      # U-Boot 소스의 fw_printenv/fw_setenv
```

`libubootenv`의 `Config.in` help는 "The package provides the fw_printenv / fw_setenv utilities, new tools build from the library and not from U-Boot"라고 적습니다. Ch 10 빌드에서 켰더니 `/usr/bin/fw_printenv`(9,640바이트)와 그 symlink `fw_setenv`가 설치됐지만, **`/etc/fw_env.config`는 생기지 않았습니다**. 이 파일은 U-Boot 설정에 맞춰 직접 overlay로 넣어야 합니다.

형식은 U-Boot 소스의 `tools/env/fw_env.config` 예제가 기준입니다. 그 파일의 일부입니다.

```text
# Block device example
#/dev/mmcblk0		0xc0000		0x20000
#/dev/mmcblk0		-0x20000	0x20000

# VFAT example
#/boot/uboot.env	0x0000          0x4000
```

같은 파일 머리말은 "Up to two entries are valid, in this case the redundant environment sector is assumed present", "Device offset must be prefixed with 0x"라고 적습니다. BeagleBone 빌드처럼 `CONFIG_ENV_IS_IN_FAT`라면 FAT 파티션을 mount한 경로의 파일을 장치 자리에 적고, 크기는 `CONFIG_ENV_SIZE`에 맞춥니다.

```text
# /etc/fw_env.config (FAT boot partition mounted on /boot)
/boot/uboot.env		0x0000		0x20000
```

| 필드 | 의미 |
|---|---|
| 장치 | MTD·block device·파일 경로 |
| offset | 장치 안의 byte offset (`CONFIG_ENV_OFFSET`, FAT 파일이면 0) |
| env 크기 | `CONFIG_ENV_SIZE` |
| sector 크기 | erase 단위 (NOR·NAND) |
| sector 수 | NAND에서만 |

U-Boot 쪽이 redundant env(`CONFIG_ENV_OFFSET_REDUND` 등)를 쓰면 두 줄을 적어야 합니다. 이 장에서는 보드가 없어 `fw_printenv`를 실제로 실행하지 않았습니다.

## SPL과 main U-Boot의 분업

대부분의 modern SoC는 *두 단계 부팅*을 합니다. SoC ROM이 작은 SPL을 SRAM에 로드해 실행하고, SPL이 DRAM을 초기화한 뒤 main U-Boot를 DRAM에 로드합니다.

부팅 흐름은 SoC ROM → SPL(SRAM) → main U-Boot(DRAM) → Linux kernel 순서로 이어집니다. SoC ROM이 SPL을 내부 SRAM으로 로드하고, SPL이 DRAM을 초기화한 뒤 main U-Boot를 DRAM으로 로드합니다. BeagleBone 빌드에서는 SPL(`MLO`)이 110,524바이트, main U-Boot(`u-boot.img`)가 1,564,932바이트였습니다. U-Boot `.config`에 `CONFIG_SPL_MMC=y`, `CONFIG_SPL_FS_FAT=y`가 있어 SPL이 SD의 FAT 파티션에서 `u-boot.img`를 읽습니다. main U-Boot는 전체 device 트리와 filesystem·network·USB를 올린 다음 `bootcmd`를 실행해 Linux kernel로 넘어갑니다.

<!-- TODO: TikZ — boot stage flow diagram (SoC ROM → SPL → main U-Boot → Linux) -->

각 단계의 책임은 다음과 같습니다.

| 단계 | 책임 |
|---|---|
| **SoC ROM** | 보드 출하 시 mask programmed. SD/eMMC/SPI에서 SPL 로드 |
| **SPL** | DDR init, clock init, console UART, main U-Boot 로드 |
| **main U-Boot** | env, filesystem, ethernet, USB, FIT, bootcmd |
| **Linux** | 진짜 시스템 |

Buildroot로 SPL을 함께 빌드하려면 다음 두 옵션이 필요합니다.

```text
BR2_TARGET_UBOOT_SPL=y
BR2_TARGET_UBOOT_SPL_NAME="MLO u-boot-spl.bin"
```

`BR2_TARGET_UBOOT_SPL_NAME`은 U-Boot 빌드 디렉터리에서 `output/images/`로 복사할 SPL/TPL 파일 이름(공백 구분)입니다. 기본값은 `spl/u-boot-spl.bin`이고, help가 예로 드는 것은 OMAP의 `MLO`와 i.MX6의 `SPL`입니다. 다른 SoC는 U-Boot 문서 `doc/board/<vendor>/`의 보드 설명에서 확인합니다.

## 흔한 실수

U-Boot 통합에서 가장 자주 만나는 문제 다섯 가지입니다.

**env 위치·크기 불일치.** `fw_env.config`가 U-Boot의 `CONFIG_ENV_*`와 다르면 `fw_printenv`는 CRC가 맞지 않아 env를 읽지 못하고, `fw_setenv`는 엉뚱한 위치에 씁니다. U-Boot 설정을 바꾸면 `fw_env.config`도 같은 커밋에서 바꿉니다. BeagleBone 빌드처럼 env가 FAT 파일이면, 그 파티션이 Linux에서 mount돼 있어야 합니다.

**FIT signature 불일치.** secure boot 환경에서 FIT image (`u-boot.itb` 또는 `fitImage`)는 U-Boot의 *embedded public key*로 검증됩니다. 빌드 시 사용한 `keys/` 디렉터리와 U-Boot DTB에 embed된 key가 다르면 *"signature missing"* 또는 *"hash error"*로 부팅 실패합니다.

**DTB가 잘못 임베디드.** U-Boot의 `u-boot.dtb`와 kernel DTB는 다른 파일입니다. 같다고 가정하면 *U-Boot가 보드 인식 못 함* 또는 *kernel이 peripheral을 못 찾는* 사고가 납니다. 두 개를 분리해서 관리하는 게 안전합니다.

**`BR2_TARGET_UBOOT_SPL` 미설정.** AM335x에서 `BR2_TARGET_UBOOT_SPL=y`를 끄면 `MLO`가 `output/images/`로 복사되지 않고, genimage.cfg의 `"MLO"` 항목에서 이미지 생성이 실패합니다. 콘솔에 아무것도 안 나오는 보드라면 boot 파티션에 `MLO`가 있는지부터 확인합니다(Ch 10의 `mdir`).

**boot.scr 생성 실패.** `BR2_PACKAGE_HOST_UBOOT_TOOLS_BOOT_SCRIPT=y`인데 source 경로가 비어 있으면 `uboot-tools.mk` 209행 오류로 멈춥니다. 경로가 있으면 `host-uboot-tools` 빌드의 `mkimage`로 만들어 `output/images/boot.scr`에 둡니다.

**eMMC boot 파티션의 쓰기 보호.** env를 eMMC의 `mmcblk0boot*` 하드웨어 파티션에 두면, Linux 커널은 이 장치를 기본으로 read-only로 노출합니다(`/sys/block/mmcblk0boot1/force_ro`). `fw_setenv` 전에 이 값을 0으로 바꾸는 절차가 필요합니다.

## 정리

- Ch 10의 BeagleBone 빌드에서 U-Boot 2026.01은 `MLO`(110,524바이트)와 `u-boot.img`를 만들었고, env는 FAT 파일(`uboot.env`, `0x20000`)이었습니다.
- Source는 latest / version / tarball / git 네 가지. vendor fork는 보통 git을 씁니다.
- Defconfig는 *트리 내 defconfig + 외부 fragment* 조합이 유지보수에 유리합니다.
- 산출물은 `u-boot.bin` / `u-boot.img` / SPL / FIT 등 보드별로 다양합니다. ROM이 요구하는 형식을 정확히 켜야 합니다.
- `boot.scr`은 `mkimage -C none -A <arch> -T script`로 만든 legacy script image이고(`mkimage -l`로 확인), CRC는 있지만 서명은 아닙니다. `uEnv.txt`는 평문입니다.
- env 저장 위치는 `CONFIG_ENV_IS_IN_*` 하나로 결정됩니다. eMMC·NOR·NAND·UBI·FAT·휘발성 6가지가 있습니다.
- `libubootenv`는 `fw_printenv`/`fw_setenv`를 설치하지만 `/etc/fw_env.config`는 만들지 않습니다. U-Boot의 `CONFIG_ENV_*`에 맞춰 직접 넣습니다.
- SPL은 DDR/clock 초기화와 main U-Boot 로드를 책임집니다. `BR2_TARGET_UBOOT_SPL=y`와 보드별 SPL 이름이 짝지어야 합니다.

## 다음 장 예고

다음 편은 **Ch 14: 빌드 캐싱 — ccache, BR2_CCACHE, per-package directories**. 30 ~ 50분짜리 toolchain·U-Boot·kernel 재빌드를 *분 단위*로 줄이는 캐싱 전략을 다룹니다.


## 관련 항목

- [Ch 7: 보드 customize — board 디렉터리·post-image](/blog/embedded/buildroot/chapter07-board-customize) — boot.cmd, fw_env.config 배치
- [Ch 11: Toolchain 선택 — internal vs external](/blog/embedded/buildroot/chapter11-toolchain) — U-Boot와 kernel이 공유할 toolchain
- [Ch 12: Linux 커널 customize — defconfig fragment와 DTS](/blog/embedded/buildroot/chapter12-kernel-customize) — fragment 패턴은 U-Boot와 동일
- [Ch 16: OTA 업데이트 — SWUpdate·RAUC·Mender 통합](/blog/embedded/buildroot/chapter16-ota) — A/B 슬롯 env 변수 관리
- [Bootloader 시리즈 Ch 18: U-Boot env in flash](/blog/embedded/bootloader/chapter18-efi-in-uboot) — env 저장소와 redundant 동작 원리
- [원문 — Buildroot Manual §17: Customizing the bootloader](https://buildroot.org/downloads/manual/manual.html#customize-bootloader)
- [원문 — U-Boot Documentation](https://docs.u-boot.org/en/latest/)
