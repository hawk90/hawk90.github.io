---
title: "BSP RootFS 통합 — Buildroot·Yocto와 보드별 패키지 묶기"
slug: "embedded/bsp/chapter16-rootfs"
date: 2026-05-18T09:16:00
description: "BSP에서 rootfs 빌드 시스템 선택과 통합 — Buildroot 외부 트리, Yocto 메타레이어."
series: "BSP Development"
seriesOrder: 16
tags: [embedded, bsp, buildroot, yocto, rootfs]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

**BSP의 rootfs는 직접 만들지 말고 빌드 시스템에 *통합*해야 유지보수가 가능합니다.** Buildroot의 외부 트리와 Yocto의 메타레이어가 표준 통합 형태입니다.

부트로더와 커널을 다 만들어도 application이 동작할 *환경*이 없으면 BSP가 완성되지 않습니다. busybox, libc, application 의존 라이브러리, init 시스템, 설정 파일이 rootfs에 들어가고, 이것을 재현 가능하게 모으는 도구가 Buildroot와 Yocto입니다. Ch 1에서 본 Buildroot의 `beaglebone_defconfig`가 그 결과물의 한 예였습니다.

이번 글은 *BSP의 시각*에서 두 시스템과 통합하는 방법을 다룹니다. Buildroot 쪽은 2024.02 소스로 최소 외부 트리를 실제로 만들어 defconfig까지 적용해 봤고(툴체인 빌드는 하지 않았습니다), Yocto 쪽은 빌드하지 않고 Yocto Project 5.0.17(scarthgap) 문서와 대조했습니다. Buildroot 자체 사용법은 [Buildroot 시리즈](/blog/embedded/buildroot/chapter01-problem)에서 다루고, 여기서는 *BSP가 어떻게 빌드 시스템에 자리잡는가*에 집중합니다.

## Buildroot vs Yocto — 어떤 걸 고를까

두 시스템의 차이는 BSP를 어디에 두느냐에서 드러납니다.

| 항목 | Buildroot | Yocto |
|------|-----------|-------|
| BSP 통합 방식 | `BR2_EXTERNAL` 외부 트리 | 별도 레이어(`meta-<vendor>`) |
| 보드 정의 | defconfig 하나 | `conf/machine/<board>.conf` |
| 이미지 조립 | `genimage` (post-image 스크립트) | `wic` (`.wks` 파일) |
| 패키지 규모 | 2024.02의 `package/*/*.mk` 파일 2,836개 | — |

Yocto의 레시피 수는 사용하는 레이어 조합에 따라 달라지므로 한 숫자로 비교하지 않았습니다. 빌드 시간도 이 글에서는 재지 않았습니다.

## Buildroot 외부 트리 (BR2_EXTERNAL)

Buildroot 본체에 BSP 코드를 *복사*하면 Buildroot를 올릴 때마다 그 변경을 다시 얹어야 합니다. Buildroot 매뉴얼 `docs/manual/customize-outside-br.adoc`이 설명하는 외부 트리(br2-external)로 분리합니다. 이 글의 예는 아래 구조이고, 실제로 만들어 본 것은 `external.desc`, `external.mk`, `Config.in`, `configs/`, overlay, 패키지 하나입니다.

```text
bsp-mybsp/
├── external.desc           # 트리 이름과 desc
├── external.mk             # 추가 패키지의 Makefile include
├── Config.in               # 추가 패키지의 Kconfig include
├── configs/
│   └── mybsp_defconfig
├── board/
│   └── mybsp/
│       ├── linux.fragment   # kernel config 단편
│       ├── busybox.fragment # busybox config 단편
│       ├── genimage.cfg     # 이미지 조립
│       ├── post-build.sh    # rootfs 후처리
│       └── post-image.sh    # 최종 이미지 조립
├── package/
│   ├── mybsp-init/
│   │   ├── Config.in
│   │   ├── mybsp-init.mk
│   │   └── mybsp-init.service
│   └── mybsp-firmware/
└── patches/
    ├── linux/
    │   └── 0001-arm-dts-add-mybsp.patch
    └── uboot/
        └── 0001-board-mybsp-fixup.patch
```

`external.desc`는 트리를 식별합니다(매뉴얼 89행의 "The `external.desc` file" 절).

```text
name: MYBSP
desc: BSP for MyBoard rev A/B
```

`external.mk`와 `Config.in`은 추가 패키지를 등록합니다.

```make
# external.mk
include $(sort $(wildcard $(BR2_EXTERNAL_MYBSP_PATH)/package/*/*.mk))
```

```text
# Config.in
source "$BR2_EXTERNAL_MYBSP_PATH/package/mybsp-init/Config.in"
```

Buildroot 2024.02를 Debian 13 guest에 풀고 이 트리를 연결해 본 결과입니다.

```text
$ make BR2_EXTERNAL=/root/br/bsp-mybsp list-defconfigs
External configs in "BSP for MyBoard rev A/B":
  mybsp_defconfig                     - Build for mybsp
$ make BR2_EXTERNAL=/root/br/bsp-mybsp mybsp_defconfig
$ grep -E "^BR2_EXTERNAL|^BR2_PACKAGE_MYBSP_INIT|^BR2_ROOTFS_OVERLAY" .config   # 출력 일부
BR2_EXTERNAL_NAMES="MYBSP"
BR2_EXTERNAL_MYBSP_PATH="/root/br/bsp-mybsp"
BR2_EXTERNAL_MYBSP_VERSION=""
BR2_ROOTFS_OVERLAY="$(BR2_EXTERNAL_MYBSP_PATH)/board/mybsp/overlay"
BR2_PACKAGE_MYBSP_INIT=y
```

`external.desc`의 `desc:`가 목록 제목이 되고, `name: MYBSP`가 `BR2_EXTERNAL_MYBSP_PATH` 변수 이름이 됩니다. 한 번 지정한 경로는 `output/.br2-external.mk`에 저장되므로 이후 `make`에는 `BR2_EXTERNAL`을 다시 주지 않습니다. 이 글은 이어지는 `make`(툴체인과 rootfs 빌드)를 실행하지 않았습니다.

실제 보드의 defconfig에는 커널·패치·후처리 옵션이 더 들어갑니다. 아래는 그런 defconfig의 예이고 빌드하지 않았습니다. 변수 이름은 Buildroot 2024.02 매뉴얼(`customize-outside-br.adoc:220-221`, `customize-patches.adoc:14-47`)과 Ch 1의 `beaglebone_defconfig`에서 확인한 것들입니다.

```text
# mybsp_defconfig 발췌
BR2_arm=y
BR2_cortex_a7=y
BR2_LINUX_KERNEL=y
BR2_LINUX_KERNEL_CUSTOM_GIT=y
BR2_LINUX_KERNEL_CUSTOM_REPO_URL="https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git"
BR2_LINUX_KERNEL_CUSTOM_REPO_VERSION="v6.6.30"
BR2_LINUX_KERNEL_DEFCONFIG="multi_v7"
BR2_LINUX_KERNEL_CONFIG_FRAGMENT_FILES="$(BR2_EXTERNAL_MYBSP_PATH)/board/mybsp/linux.fragment"
BR2_LINUX_KERNEL_INTREE_DTS_NAME="mybsp"

BR2_GLOBAL_PATCH_DIR="$(BR2_EXTERNAL_MYBSP_PATH)/patches"

BR2_PACKAGE_MYBSP_INIT=y
BR2_PACKAGE_MYBSP_FIRMWARE=y

BR2_ROOTFS_OVERLAY="$(BR2_EXTERNAL_MYBSP_PATH)/board/mybsp/overlay"
BR2_ROOTFS_POST_BUILD_SCRIPT="$(BR2_EXTERNAL_MYBSP_PATH)/board/mybsp/post-build.sh"
BR2_ROOTFS_POST_IMAGE_SCRIPT="$(BR2_EXTERNAL_MYBSP_PATH)/board/mybsp/post-image.sh"
```

핵심 변수 세 개를 짚습니다.

- `BR2_LINUX_KERNEL_CUSTOM_REPO_URL` + `_VERSION` — 어느 커널 트리를 쓸지 명시
- `BR2_GLOBAL_PATCH_DIR` — BSP의 모든 패치 한 자리. 매뉴얼은 이 옵션을 패키지에 패치를 더하는 "preferred method"라고 부릅니다(`customize-patches.adoc:47`).
- `BR2_ROOTFS_OVERLAY` — overlay 디렉터리. 여기 둔 파일은 rootfs에 *그대로* 복사됨

overlay에는 시스템 설정, 인증서, default config가 들어갑니다.

```text
board/mybsp/overlay/
├── etc/
│   ├── hostname
│   ├── network/interfaces
│   └── ssh/
│       └── sshd_config
├── opt/
│   └── mybsp/
│       └── default.cfg
└── usr/
    └── lib/
        └── firmware/
            └── mybsp-fw.bin
```

## Buildroot 커스텀 패키지

application을 패키지로 만드는 패턴입니다.

```text
package/mybsp-init/
├── Config.in
└── mybsp-init.mk
```

실제로 만든 패키지 파일입니다.

```text
# Config.in
config BR2_PACKAGE_MYBSP_INIT
	bool "mybsp-init"
	help
	  Init helper for MyBoard.
```

```make
# mybsp-init.mk
MYBSP_INIT_VERSION = 1.2.0
MYBSP_INIT_SITE = $(BR2_EXTERNAL_MYBSP_PATH)/package/mybsp-init/src
MYBSP_INIT_SITE_METHOD = local
MYBSP_INIT_LICENSE = Proprietary

define MYBSP_INIT_BUILD_CMDS
	$(TARGET_MAKE_ENV) $(MAKE) CC="$(TARGET_CC)" -C $(@D)
endef

define MYBSP_INIT_INSTALL_TARGET_CMDS
	$(INSTALL) -D -m 0755 $(@D)/mybsp-init $(TARGET_DIR)/usr/sbin/mybsp-init
endef

$(eval $(generic-package))
```

Buildroot가 이 패키지를 어떻게 이해했는지는 `make mybsp-init-show-info`가 JSON으로 보여 줍니다. 앞부분입니다.

```text
{ "mybsp-init": { "type": "target", "name": "mybsp-init", "virtual": false, "version": "1.2.0", "licenses": "Proprietary", "license_files": [ ], "redistributable": true, "dl_dir": "mybsp-init", "downloads": [ { "source": "mybsp-init-1.2.0.tar.gz", "uris": [ "local+/root/br/bsp-mybsp/package/mybsp-init/src", ...
```

`SITE_METHOD = local`이면 `uris`의 첫 항목이 `local+` 경로가 되어, 트리 안의 소스를 그대로 가져옵니다. 보드별 firmware나 agent처럼 같은 저장소에 소스가 있는 패키지에 맞습니다. systemd unit을 설치하려면 `<PKG>_INSTALL_INIT_SYSTEMD` 훅을 더합니다(매뉴얼 `adding-packages-generic.adoc`).

## Yocto 메타레이어 (meta-mybsp)

Yocto는 *레이어*로 BSP를 구성합니다. 보드별 레이어를 만들어 base 레이어와 합칩니다. 이 절의 파일은 빌드하지 않은 예이고, 변수 이름은 모두 Yocto 5.0.17 Reference Manual의 variable glossary에서 항목을 확인했습니다.

```text
meta-mybsp/
├── conf/
│   ├── layer.conf
│   ├── machine/
│   │   └── mybsp.conf
│   └── distro/
│       └── mybsp-distro.conf
├── recipes-bsp/
│   ├── u-boot/
│   │   ├── u-boot-mybsp_2024.04.bb
│   │   └── u-boot-mybsp/
│   │       └── 0001-board-mybsp.patch
│   └── formfactor/
├── recipes-kernel/
│   └── linux/
│       ├── linux-mybsp_6.6.bb
│       └── linux-mybsp/
│           ├── defconfig
│           ├── mybsp.cfg
│           └── 0001-arm-dts-mybsp.patch
├── recipes-core/
│   ├── images/
│   │   └── mybsp-image.bb
│   └── mybsp-init/
│       └── mybsp-init_1.2.0.bb
└── wic/
    └── mybsp.wks
```

`layer.conf`는 레이어 자체를 등록합니다. Yocto 5.0.17 Development Tasks Manual의 "Creating Your Own Layer" 예제와 같은 변수입니다. 그 예제는 `BBFILES`에 `.bbappend`도 넣으므로 아래에도 넣었습니다. `LAYERSERIES_COMPAT`은 "the Yocto Project releases for which the current version is compatible"입니다.

```text
BBPATH .= ":${LAYERDIR}"
BBFILES += "${LAYERDIR}/recipes-*/*/*.bb \
            ${LAYERDIR}/recipes-*/*/*.bbappend"

BBFILE_COLLECTIONS += "mybsp"
BBFILE_PATTERN_mybsp = "^${LAYERDIR}/"
BBFILE_PRIORITY_mybsp = "10"

LAYERSERIES_COMPAT_mybsp = "kirkstone scarthgap"
```

`machine/mybsp.conf`는 보드를 정의합니다.

```text
#@TYPE: Machine
#@NAME: MyBoard Rev A
#@DESCRIPTION: Machine configuration for MyBoard

require conf/machine/include/arm/armv7a/tune-cortexa7.inc

KERNEL_IMAGETYPE = "zImage"
KERNEL_DEVICETREE = "mybsp.dtb"

PREFERRED_PROVIDER_virtual/kernel = "linux-mybsp"
PREFERRED_PROVIDER_virtual/bootloader = "u-boot-mybsp"

UBOOT_MACHINE = "mybsp_defconfig"
UBOOT_ENTRYPOINT = "0x40008000"
UBOOT_LOADADDRESS = "0x40008000"

SERIAL_CONSOLES = "115200;ttyS0"

IMAGE_FSTYPES = "ext4 wic.bz2 wic.bmap"
WKS_FILE = "mybsp.wks"

MACHINE_FEATURES = "usbhost ext2 ext3 vfat alsa"
```

`require`한 `conf/machine/include/arm/armv7a/tune-cortexa7.inc`는 poky scarthgap 브랜치에 있는 파일입니다.

커널 레시피는 `linux-yocto` base를 활용합니다. `recipes-kernel/linux/linux-yocto.inc`와, `KBRANCH ?= "v6.6/standard/base"`로 시작하는 `linux-yocto_6.6.bb`가 poky scarthgap에 있습니다.

```text
# linux-mybsp_6.6.bb
require recipes-kernel/linux/linux-yocto.inc

LINUX_VERSION = "6.6.30"
LINUX_VERSION_EXTENSION = "-mybsp"
KBRANCH = "v6.6/standard/base"
SRCREV = "abcdef1234..."
SRC_URI = "git://git.yoctoproject.org/linux-yocto.git;branch=${KBRANCH};protocol=https \
           file://defconfig \
           file://mybsp.cfg \
           file://0001-arm-dts-mybsp.patch \
           "

COMPATIBLE_MACHINE = "mybsp"
```

U-Boot 레시피도 같은 구조로 `SRC_URI`와 패치를 둡니다.

## Yocto 이미지 레시피

이미지가 어떤 패키지 묶음을 포함할지 정의합니다.

```text
# mybsp-image.bb
SUMMARY = "MyBoard production image"
LICENSE = "MIT"

inherit core-image

IMAGE_INSTALL:append = " \
    kernel-modules \
    openssh \
    chrony \
    mybsp-init \
    mybsp-firmware \
    "

IMAGE_FEATURES += "ssh-server-openssh package-management"

IMAGE_ROOTFS_EXTRA_SPACE = "32768"
```

`IMAGE_INSTALL`에는 `:append`를 씁니다. Reference Manual의 `IMAGE_INSTALL` 항목은 `IMAGE_INSTALL:append = " package-name"` 형태를 권하고, `+=`를 `local.conf`나 이미지 레시피에서 쓰는 것은 "not recommended"라고 적습니다(ordering 문제). `IMAGE_ROOTFS_EXTRA_SPACE`의 단위는 KB이므로 32768은 32 MiB의 여유 공간입니다. `ssh-server-openssh`, `package-management`는 `ref-manual/features.html`의 image feature 목록에 있습니다.

빌드는 다음과 같습니다.

```bash
$ source oe-init-build-env build-mybsp
$ bitbake-layers add-layer ../meta-mybsp
$ MACHINE=mybsp bitbake mybsp-image
```

결과물은 `tmp/deploy/images/<machine>/` 아래에 모입니다. 이 글은 Yocto 빌드를 실행하지 않았습니다.

## Buildroot vs Yocto — BSP 통합 비교

같은 작업을 두 시스템이 어떻게 표현하는지 비교합니다.

| 작업 | Buildroot | Yocto |
|------|-----------|-------|
| 커널 트리 지정 | `BR2_LINUX_KERNEL_CUSTOM_REPO_URL` | recipe의 `SRC_URI` |
| 커널 패치 | `BR2_GLOBAL_PATCH_DIR/linux/` | recipe `SRC_URI`의 `file://` |
| dtb 추가 | `BR2_LINUX_KERNEL_INTREE_DTS_NAME` | recipe의 `KERNEL_DEVICETREE` |
| rootfs overlay | `BR2_ROOTFS_OVERLAY` | 파일을 설치하는 custom recipe + `IMAGE_INSTALL:append` |
| 후처리 스크립트 | `BR2_ROOTFS_POST_IMAGE_SCRIPT` | `IMAGE_POSTPROCESS_COMMAND` |
| 이미지 조립 | `genimage` | `wic` (wks 파일) |
| 보드 정의 | `defconfig` 하나 | `machine.conf` + machine include |

## post-image 스크립트로 최종 이미지

Buildroot의 `post-image.sh`는 빌드된 산출물을 final image로 묶습니다.

```bash
#!/bin/bash
# board/mybsp/post-image.sh
set -e

BOARD_DIR="$(dirname $0)"
GENIMAGE_CFG="${BOARD_DIR}/genimage.cfg"

cp ${BOARD_DIR}/uboot-env.txt ${BINARIES_DIR}/

rm -rf "${BINARIES_DIR}/genimage.tmp"
genimage \
    --rootpath "${TARGET_DIR}" \
    --tmppath "${BINARIES_DIR}/genimage.tmp" \
    --inputpath "${BINARIES_DIR}" \
    --outputpath "${BINARIES_DIR}" \
    --config "${GENIMAGE_CFG}"

bmaptool create -o "${BINARIES_DIR}/sdcard.bmap" "${BINARIES_DIR}/sdcard.img"
```

`genimage.cfg`는 다음 글에서 다룹니다.

## 자주 하는 실수

**Buildroot 본체에 패치 직접 적용.** Buildroot를 fork해 BSP 변경을 넣으면 Buildroot를 올릴 때마다 그 변경을 다시 얹어야 합니다. 외부 트리에 둡니다.

**Yocto 레이어에 vendor 코드 직접 commit.** `SRC_URI`로 가져오게 두고, 패치만 레이어에 둡니다. 소스 자체를 commit 하면 git history와 라이선스 추적이 어려워집니다.

**커널 config를 defconfig 전체로.** Buildroot는 `BR2_LINUX_KERNEL_DEFCONFIG`로 커널 트리의 defconfig을 base로 쓰고, `BR2_LINUX_KERNEL_CONFIG_FRAGMENT_FILES`에는 *차이*만 둡니다. Ch 8에서 본 것처럼 같은 커널에서도 savedefconfig 결과와 in-tree defconfig이 다를 정도로 전체 config는 버전마다 흔들립니다.

**Yocto에서 `IMAGE_INSTALL`을 `=`나 `+=`로 씀.** `=`로 할당하면 `core-image`가 채운 기본 목록이 사라지고, `+=`는 Reference Manual이 ordering 문제로 권하지 않습니다. `:append`를 씁니다.

## 정리

- BSP의 rootfs는 Buildroot 또는 Yocto에 *통합*하는 것이 표준입니다. 손으로 모으지 않습니다.
- Buildroot는 외부 트리(BR2_EXTERNAL)로 BSP를 분리합니다. Buildroot 본체 코드에 손대지 않습니다.
- Yocto는 meta-vendor 레이어로 BSP를 분리합니다. machine.conf, 커널 recipe, U-Boot recipe, 이미지 recipe로 구성됩니다.
- Buildroot 외부 트리는 `external.desc`의 `name`으로 `BR2_EXTERNAL_<NAME>_PATH`를 만들고, `list-defconfigs`에 `desc`로 나타납니다.
- Yocto 이미지 레시피에서는 `IMAGE_INSTALL:append`를 씁니다.
- 커널 config는 defconfig + fragment 패턴으로 *차이*만 관리합니다. 전체 defconfig을 BSP가 들고 있으면 upgrade가 막힙니다.
- rootfs overlay와 post-build 스크립트로 시스템 설정과 application을 주입합니다.
- 최종 이미지는 Buildroot에서 `genimage`, Yocto에서 `wic`로 조립합니다.

## 다음 편 예고

[Ch 17: 이미지 패키징](/blog/embedded/bsp/chapter17-image-packaging)에서는 빌드된 산출물을 어떻게 *최종 flash image*로 조립하는지 다룹니다. 파티션 layout, GPT, A/B partition, SD/eMMC writer 도구가 주제입니다.

## 관련 항목

- [Ch 15: 부트 시간 최적화](/blog/embedded/bsp/chapter15-boot-time-optimization) — 부팅 단계의 측정
- [Ch 17: 이미지 패키징](/blog/embedded/bsp/chapter17-image-packaging) — 다음 단계
- [Buildroot Practical 시리즈](/blog/embedded/buildroot/chapter01-problem) — Buildroot 자체의 깊이 있는 다룸
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/00-preface) — recipe 묶음
