---
title: "Buildroot U-Boot 통합 — 빌드·env·fw_env 흐름"
date: 2026-05-19T09:13:00
description: "Buildroot가 U-Boot를 가져와 빌드·패키징하는 방식과 env·fw_env.config로 런타임에 접근하는 패턴."
series: "Buildroot Practical"
seriesOrder: 13
tags: [embedded, buildroot, u-boot, bootloader, fw-env]
draft: false
---

## 한 줄 요약

> **"U-Boot도 한 트리 안에 둡니다."** — kernel·rootfs와 같은 toolchain·같은 git 트리에서 빌드돼야 *시그니처·DTB·env offset*이 어긋나지 않습니다. Buildroot는 U-Boot를 *그냥 또 하나의 패키지*처럼 다룹니다.

## 왜 U-Boot까지 Buildroot가 빌드하는가

U-Boot를 별도 트리에서 빌드해 *손으로 SD 카드에 옮기는* 방식은 첫 prototype에서는 빠릅니다. 다만 양산이 가까워질수록 사고가 잦아집니다. *toolchain이 다르면* SPL이 main U-Boot를 찾지 못하고, *env offset이 다르면* `fw_setenv`가 엉뚱한 영역을 덮어씁니다.

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
| `BR2_TARGET_UBOOT_CUSTOM_FRAGMENT_FILES` | 추가 fragment(여러 개 가능) |
| `BR2_TARGET_UBOOT_PATCH` | 적용할 patch 파일 / 디렉터리 |
| `BR2_TARGET_UBOOT_FORMAT_*` | 산출물 형식 (bin, img, kwb, imx 등) |
| `BR2_TARGET_UBOOT_SPL=y` | SPL을 함께 빌드 |
| `BR2_TARGET_UBOOT_SPL_NAME` | SPL 산출물 이름 (`MLO`, `u-boot-spl.bin`) |
| `BR2_TARGET_UBOOT_BOOT_SCRIPT=y` | `boot.scr` 자동 생성 |
| `BR2_TARGET_UBOOT_BOOT_SCRIPT_SOURCE` | `boot.cmd`의 경로 |

대표적인 설정은 다음과 같습니다.

```text
BR2_TARGET_UBOOT=y
BR2_TARGET_UBOOT_CUSTOM_VERSION=y
BR2_TARGET_UBOOT_CUSTOM_VERSION_VALUE="2024.04"
BR2_TARGET_UBOOT_BOARD_DEFCONFIG="am335x_evm"
BR2_TARGET_UBOOT_FORMAT_BIN=y
BR2_TARGET_UBOOT_FORMAT_IMG=y
BR2_TARGET_UBOOT_SPL=y
BR2_TARGET_UBOOT_SPL_NAME="MLO u-boot-spl.bin"
BR2_TARGET_UBOOT_BOOT_SCRIPT=y
BR2_TARGET_UBOOT_BOOT_SCRIPT_SOURCE="board/myboard/boot.cmd"
```

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
| **Custom version** | "*2024.04*"처럼 *특정 mainline 버전*을 고정 |
| **Custom tarball** | vendor가 mirror로 배포하는 *고정 tarball* |
| **Custom git** | vendor fork (NXP/TI/Xilinx의 `u-boot-fslc`, `ti-u-boot` 등) |

vendor fork는 보통 git을 씁니다.

```text
BR2_TARGET_UBOOT_CUSTOM_GIT=y
BR2_TARGET_UBOOT_CUSTOM_REPO_URL="https://github.com/nxp-imx/uboot-imx"
BR2_TARGET_UBOOT_CUSTOM_REPO_VERSION="lf_v2024.04"
```

vendor-specific DDR PHY init, eMMC tuning, secure boot ROM API 같은 코드가 fork 안에 들어 있습니다. 가능하면 mainline을 쓰되 *기능이 빠진 부분만* fork를 쓰는 게 장기 유지보수에 유리합니다.

## defconfig — 시작점 선택

U-Boot config 시스템도 Linux와 똑같이 *defconfig + fragments*를 씁니다. 트리 안의 defconfig를 쓰는 가장 일반적인 방식.

```text
BR2_TARGET_UBOOT_BOARD_DEFCONFIG="rpi_4"
```

이렇게 두면 빌드 시 `make rpi_4_defconfig`가 실행되고, 같은 트리(`configs/rpi_4_defconfig`)의 파일이 baseline이 됩니다.

기존 defconfig가 맞지 않으면 *완전히 외부의* `.config`를 던질 수 있습니다.

```text
BR2_TARGET_UBOOT_USE_CUSTOM_CONFIG=y
BR2_TARGET_UBOOT_CUSTOM_CONFIG_FILE="board/myboard/uboot.config"
```

또는 baseline은 트리 defconfig를 쓰되 *덧붙이는 fragment*만 외부에서 줄 수 있습니다. Ch 12의 kernel customize와 같은 패턴입니다.

```text
BR2_TARGET_UBOOT_BOARD_DEFCONFIG="rpi_4"
BR2_TARGET_UBOOT_CUSTOM_FRAGMENT_FILES="board/myboard/uboot-extra.config"
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

U-Boot는 보드·SoC ROM 부트 방식에 따라 *여러 형식*을 산출합니다. `BR2_TARGET_UBOOT_FORMAT_*`로 어떤 것을 만들지 고릅니다.

| 산출물 | 용도 |
|---|---|
| `u-boot.bin` | 가장 단순한 raw binary. 직접 jump 시작 주소가 정확히 맞을 때 |
| `u-boot.img` | U-Boot legacy header가 붙은 형식. 일부 보드의 SPL이 이걸 찾음 |
| `MLO` / `u-boot-spl.bin` | SPL (Secondary Program Loader) — TI AM335x 등의 ROM이 요구 |
| `SPL` | NXP i.MX, Rockchip 등의 SPL |
| `u-boot.itb` | FIT image — secure boot 시그니처 포함 가능 |
| `u-boot.kwb` | Marvell Kirkwood/Armada |
| `u-boot.imx` | NXP i.MX legacy IVT header |
| `u-boot.sb` | Freescale/NXP Vybrid |

산출물은 모두 `output/images/`에 떨어집니다.

```text
$ ls output/images/
MLO            u-boot.img     u-boot.bin
boot.scr       Image          sun50i-h6-orangepi-3.dtb
rootfs.ext4    rootfs.tar
```

복수의 산출물을 동시에 켤 수 있고, *post-image script*가 이들을 모아 SD 카드 이미지를 만드는 게 일반적입니다. SD 카드 이미지 생성은 Ch 15에서 다룹니다.

## boot.scr와 uEnv.txt — boot 명령 자동 생성

U-Boot는 보드 부팅 시 *어떤 명령을 실행할지*를 SD 카드의 `boot.scr` 또는 `uEnv.txt`에서 읽습니다. 이걸 직접 작성하는 게 깔끔합니다.

`boot.scr`은 *서명된 binary script*입니다. Buildroot가 자동으로 만들어 줍니다.

```text
BR2_TARGET_UBOOT_BOOT_SCRIPT=y
BR2_TARGET_UBOOT_BOOT_SCRIPT_SOURCE="board/myboard/boot.cmd"
```

`boot.cmd`는 사람이 읽는 평문 스크립트입니다.

```bash
# board/myboard/boot.cmd
setenv bootargs "console=ttyS0,115200 root=/dev/mmcblk0p2 rootwait"
load mmc 0:1 ${kernel_addr_r} Image
load mmc 0:1 ${fdt_addr_r} sun50i-h6-orangepi-3.dtb
booti ${kernel_addr_r} - ${fdt_addr_r}
```

빌드 시 Buildroot가 `mkimage`로 변환해 `output/images/boot.scr`를 만듭니다. SD 카드의 boot partition에 넣어 두면 U-Boot가 자동으로 실행합니다.

`uEnv.txt`는 *서명 없는 평문 env*입니다. Buildroot가 자동 생성하지는 않지만 post-image script로 넣어 두는 경우가 많습니다.

```text
# uEnv.txt
bootdelay=1
bootcmd=load mmc 0:1 ${kernel_addr_r} Image; load mmc 0:1 ${fdt_addr_r} board.dtb; booti ${kernel_addr_r} - ${fdt_addr_r}
bootargs=console=ttyS0,115200 root=/dev/mmcblk0p2 rootwait
```

`boot.scr`은 서명·CRC가 들어가 *불의의 텍스트 손상*을 막아 줍니다. 양산은 `boot.scr`을, 디버깅·prototyping은 `uEnv.txt`를 쓰는 게 일반적입니다.

`booti`는 ARM64, `bootm`은 uImage, `bootz`는 zImage용입니다. 보드 architecture에 맞게 선택하면 됩니다.

## env 위치 — 플래시·eMMC·SD·UBI

U-Boot env는 *재부팅 사이에 살아남아야 할 변수 집합*입니다. 어디에 저장할지는 `CONFIG_ENV_IS_IN_*` 옵션 하나로 정합니다.

| 옵션 | 저장소 | 짝지을 옵션 |
|---|---|---|
| `CONFIG_ENV_IS_IN_MMC` | eMMC / SD | `CONFIG_SYS_MMC_ENV_DEV`, `CONFIG_ENV_OFFSET`, `CONFIG_ENV_SIZE` |
| `CONFIG_ENV_IS_IN_SPI_FLASH` | SPI NOR | `CONFIG_ENV_OFFSET`, `CONFIG_ENV_SECT_SIZE` |
| `CONFIG_ENV_IS_IN_NAND` | raw NAND | `CONFIG_ENV_OFFSET`, `CONFIG_ENV_RANGE` |
| `CONFIG_ENV_IS_IN_UBI` | UBI volume | `CONFIG_ENV_UBI_PART`, `CONFIG_ENV_UBI_VOLUME` |
| `CONFIG_ENV_IS_IN_FAT` | FAT 파일 | `CONFIG_ENV_FAT_INTERFACE`, `CONFIG_ENV_FAT_DEVICE_AND_PART`, `CONFIG_ENV_FAT_FILE` |
| `CONFIG_ENV_IS_NOWHERE` | 휘발성 | 매 부팅마다 default 사용 |

가장 흔한 eMMC 예.

```text
CONFIG_ENV_IS_IN_MMC=y
CONFIG_SYS_MMC_ENV_DEV=0          # mmc 0번 디바이스
CONFIG_SYS_MMC_ENV_PART=1         # boot partition 1
CONFIG_ENV_OFFSET=0xC0000         # boot partition 안에서 768KB offset
CONFIG_ENV_SIZE=0x2000            # 8KB
CONFIG_ENV_OFFSET_REDUND=0xC2000  # 이중화 (선택)
```

이 값들은 *나중에 userspace `fw_env.config`*와 *정확히 일치*해야 합니다. 한 글자만 어긋나면 사고가 납니다.

## fw_env.config — userspace에서 env 접근

런타임에 application이 `fw_setenv kernel_version 6.6.0`처럼 U-Boot env를 갱신해야 하는 경우가 흔합니다. OTA 업데이트, A/B 슬롯 전환, factory reset flag 등이 예입니다. `libubootenv` 또는 BusyBox의 `fw_printenv`/`fw_setenv`가 이걸 처리합니다.

Buildroot에서 켜는 방법.

```text
BR2_PACKAGE_LIBUBOOTENV=y         # 권장 — newer, FIT 지원
# 또는
BR2_PACKAGE_UBOOT_TOOLS_FW_PRINTENV=y    # legacy
```

런타임에 *어디를 읽을지*를 알려 주는 게 `/etc/fw_env.config`입니다. 파일 한 줄당 *한 device를 정의*합니다.

```text
# /etc/fw_env.config
# <device>            <offset>   <env-size>   <sector-size>   <num-sectors>
/dev/mmcblk0boot1     0xC0000    0x2000       0x200
/dev/mmcblk0boot1     0xC2000    0x2000       0x200
```

각 필드의 의미는 다음과 같습니다.

| 필드 | 의미 |
|---|---|
| `<device>` | env가 저장된 block device 경로 |
| `<offset>` | device 안에서의 byte offset (U-Boot의 `CONFIG_ENV_OFFSET`과 일치) |
| `<env-size>` | env 영역 크기 (`CONFIG_ENV_SIZE`와 일치) |
| `<sector-size>` | erase block 크기. MMC/SD는 보통 `0x200`(512), NOR은 `0x10000`(64KB) |
| `<num-sectors>` | NAND에서만. 보통 생략 |

두 줄을 적으면 *primary + redundant* 이중화입니다. U-Boot가 `CONFIG_ENV_OFFSET_REDUND`를 쓰는 경우 *반드시* 두 줄을 적어야 합니다. 한 줄이면 redundant 영역이 갱신 안 되어 *오래된 env로 부팅*하는 사고가 납니다.

런타임 사용 예.

```bash
$ fw_printenv bootcmd
bootcmd=run distro_bootcmd

$ fw_setenv slot B
$ fw_setenv bootcount 0
$ fw_setenv -- bootargs "console=ttyS0,115200 root=/dev/mmcblk0p3 rw"
```

`fw_setenv NAME` (값 없이)으로 삭제, `fw_setenv NAME VALUE`로 갱신입니다. `--`는 *값에 `-`가 들어가는 경우*의 escape입니다.

## SPL과 main U-Boot의 분업

대부분의 modern SoC는 *두 단계 부팅*을 합니다. SoC ROM이 작은 SPL을 SRAM에 로드해 실행하고, SPL이 DRAM을 초기화한 뒤 main U-Boot를 DRAM에 로드합니다.

```text
[SoC ROM]
    ↓ load 32 ~ 128 KB
[SPL — SRAM]
    - DDR PHY init
    - clock tree setup
    - basic console
    ↓ load 500 KB ~ 1 MB
[main U-Boot — DRAM]
    - 전체 device 트리
    - filesystem, network, USB
    - bootcmd 실행
    ↓
[Linux kernel]
```

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

`BR2_TARGET_UBOOT_SPL_NAME`은 *어떤 산출물 이름*을 SPL로 인식할지 알려 주는 힌트입니다. 보드마다 이름이 다릅니다. TI는 `MLO`, NXP i.MX는 `u-boot-spl.bin`, Rockchip은 `idbloader.img`입니다. 보드 README나 `Documentation/board/<vendor>/<board>.rst`에서 확인합니다.

## 흔한 실수

U-Boot 통합에서 가장 자주 만나는 문제 다섯 가지입니다.

**env offset/size mismatch.** U-Boot `CONFIG_ENV_OFFSET=0xC0000`인데 `fw_env.config`에 `0x100000`이라고 적은 경우. `fw_printenv`가 *읽으면* CRC error로 default를 돌려주고, *쓰면* 엉뚱한 영역(보통 rootfs 일부)을 덮어씁니다. 변경한 쪽에서 반드시 두 파일을 같이 갱신해야 합니다.

**FIT signature 불일치.** secure boot 환경에서 FIT image (`u-boot.itb` 또는 `fitImage`)는 U-Boot의 *embedded public key*로 검증됩니다. 빌드 시 사용한 `keys/` 디렉터리와 U-Boot DTB에 embed된 key가 다르면 *"signature missing"* 또는 *"hash error"*로 부팅 실패합니다.

**DTB가 잘못 임베디드.** U-Boot의 `u-boot.dtb`와 kernel DTB는 다른 파일입니다. 같다고 가정하면 *U-Boot가 보드 인식 못 함* 또는 *kernel이 peripheral을 못 찾는* 사고가 납니다. 두 개를 분리해서 관리하는 게 안전합니다.

**`BR2_TARGET_UBOOT_SPL` 미설정.** AM335x에 `BR2_TARGET_UBOOT_SPL=y`를 안 켜면 `u-boot.bin`만 만들어집니다. SD 카드에 굽고 부팅해도 *ROM이 SPL을 못 찾아* 콘솔에 아무 것도 안 나옵니다. 보드 부팅이 SoC ROM 단계에서 멈춰 보이면 *SPL 관련 옵션*을 먼저 의심합니다.

**`mkimage` 부재로 boot.scr 생성 실패.** `BR2_TARGET_UBOOT_BOOT_SCRIPT=y`가 켜져 있으면 Buildroot가 자동으로 host의 `mkimage`를 빌드합니다. host build가 실패하면 `boot.scr`이 안 만들어지고 *조용히 skip*되는 경우가 있습니다. `output/host/bin/mkimage`가 존재하는지 확인하는 게 빠른 sanity check입니다.

**env partition 권한.** Linux에서 `/dev/mmcblk0boot1`은 보통 *read-only*입니다. `fw_setenv`가 쓰기 실패하면 `/sys/block/mmcblk0boot1/force_ro`에 0을 써서 해제하거나 부팅 시 udev rule로 자동 처리합니다.

## 정리

- U-Boot를 Buildroot 트리 안에 두면 toolchain·DTB·env offset이 자동으로 정렬됩니다.
- Source는 latest / version / tarball / git 네 가지. vendor fork는 보통 git을 씁니다.
- Defconfig는 *트리 내 defconfig + 외부 fragment* 조합이 유지보수에 유리합니다.
- 산출물은 `u-boot.bin` / `u-boot.img` / SPL / FIT 등 보드별로 다양합니다. ROM이 요구하는 형식을 정확히 켜야 합니다.
- `boot.scr`은 서명·CRC가 들어간 boot script. 양산용. `uEnv.txt`는 평문, 디버깅용입니다.
- env 저장 위치는 `CONFIG_ENV_IS_IN_*` 하나로 결정됩니다. eMMC·NOR·NAND·UBI·FAT·휘발성 6가지가 있습니다.
- 런타임 접근은 `fw_env.config` + `fw_printenv`/`fw_setenv`. *U-Boot 설정과 글자 단위로 일치*해야 합니다.
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
