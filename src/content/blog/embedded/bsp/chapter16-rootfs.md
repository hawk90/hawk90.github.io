---
title: "Ch 16: Buildroot/Yocto와 BSP — rootfs 통합"
date: 2026-05-09T16:00:00
description: "BSP에서 rootfs 빌드 시스템 선택과 통합 — Buildroot 외부 트리, Yocto 메타레이어."
series: "BSP Development"
seriesOrder: 16
tags: [embedded, bsp, buildroot, yocto, rootfs]
draft: false
---

## 한 줄 요약

**BSP의 rootfs는 직접 만들지 말고 빌드 시스템에 *통합*해야 유지보수가 가능합니다.** Buildroot의 외부 트리와 Yocto의 메타레이어가 표준 통합 형태입니다.

부트로더와 커널을 다 만들어도 application이 동작할 *환경*이 없으면 BSP가 완성되지 않습니다. busybox, libc, OpenSSL, application 의존 라이브러리, init 시스템, 설정 파일 같은 것들이 rootfs에 들어갑니다. 이걸 손으로 모으는 시대는 끝났습니다. Buildroot나 Yocto가 표준입니다.

이번 글은 *BSP의 시각*에서 두 시스템과 통합하는 방법을 다룹니다. Buildroot 자체 사용법은 [Buildroot 시리즈](/blog/embedded/buildroot/)에서 다루고, 여기서는 *BSP가 어떻게 빌드 시스템에 자리잡는가*에 집중합니다.

## Buildroot vs Yocto — 어떤 걸 고를까

| 항목 | Buildroot | Yocto |
|------|-----------|-------|
| 학습 곡선 | 며칠 | 몇 주 |
| 빌드 시간 (1차) | 30분~1시간 | 3~8시간 |
| 빌드 시간 (증분) | 빠름 | 캐시 hit 시 매우 빠름 |
| 패키지 수 | 2,500+ | 13,000+ |
| 패키지 의존성 | 단순 | 복잡 (레이어 트리) |
| SDK | 가능 | 표준 |
| 산업 채택 | 가전, 라우터 | 자동차, 산업용 |
| BSP 통합 방식 | BR2_EXTERNAL 트리 | meta-vendor 레이어 |

선택 기준은 단순합니다.

- **단일 보드, 작은 팀, 빠른 iteration** → Buildroot
- **여러 보드, 여러 팀, 장기 LTS, SDK 필요** → Yocto

자동차 OEM은 거의 Yocto입니다. AGL(Automotive Grade Linux)이 Yocto 기반입니다. 가전과 산업 IoT는 Buildroot가 많습니다.

## Buildroot 외부 트리 (BR2_EXTERNAL)

Buildroot 본체에 BSP 코드를 *복사*하면 업스트림 추적이 불가능해집니다. 외부 트리가 정답입니다.

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

`external.desc`는 트리를 식별합니다.

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
source "$BR2_EXTERNAL_MYBSP_PATH/package/mybsp-firmware/Config.in"
```

빌드는 두 트리를 연결한 형태로 호출합니다.

```bash
$ cd buildroot
$ make BR2_EXTERNAL=/path/to/bsp-mybsp mybsp_defconfig
$ make
```

`defconfig`에는 BSP 전용 옵션이 들어갑니다.

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
- `BR2_GLOBAL_PATCH_DIR` — BSP의 모든 패치 한 자리 (커널, U-Boot, 라이브러리 모두)
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

```text
# Config.in
config BR2_PACKAGE_MYBSP_INIT
    bool "mybsp-init"
    select BR2_PACKAGE_SYSTEMD
    help
      Init service for MyBoard.
```

```make
# mybsp-init.mk
MYBSP_INIT_VERSION = 1.2.0
MYBSP_INIT_SITE = $(BR2_EXTERNAL_MYBSP_PATH)/package/mybsp-init/src
MYBSP_INIT_SITE_METHOD = local
MYBSP_INIT_LICENSE = Proprietary
MYBSP_INIT_DEPENDENCIES = systemd

define MYBSP_INIT_BUILD_CMDS
    $(MAKE) CC="$(TARGET_CC)" -C $(@D)
endef

define MYBSP_INIT_INSTALL_TARGET_CMDS
    $(INSTALL) -m 0755 $(@D)/mybsp-init $(TARGET_DIR)/usr/sbin/mybsp-init
    $(INSTALL) -m 0644 $(BR2_EXTERNAL_MYBSP_PATH)/package/mybsp-init/mybsp-init.service \
        $(TARGET_DIR)/usr/lib/systemd/system/mybsp-init.service
endef

define MYBSP_INIT_INSTALL_INIT_SYSTEMD
    ln -fs ../mybsp-init.service \
        $(TARGET_DIR)/usr/lib/systemd/system/multi-user.target.wants/mybsp-init.service
endef

$(eval $(generic-package))
```

`SITE_METHOD = local`로 트리 내부 소스를 빌드하는 패턴이 보드별 firmware/agent 패키지에 적합합니다. 외부 git 저장소면 `git`, tarball이면 `wget`을 씁니다.

## Yocto 메타레이어 (meta-mybsp)

Yocto는 *레이어*로 BSP를 구성합니다. 보드별 레이어를 만들어 base 레이어와 합칩니다.

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

`layer.conf`는 레이어 자체를 등록합니다.

```text
BBPATH .= ":${LAYERDIR}"
BBFILES += "${LAYERDIR}/recipes-*/*/*.bb"

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

커널 레시피는 `linux-yocto` base를 활용합니다.

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

`u-boot-mybsp_2024.04.bb`도 같은 패턴입니다. `u-boot-fw-utils`와 `u-boot-tools`가 host에서 build되도록 `EXTRA_OECONF`와 의존성을 설정합니다.

## Yocto 이미지 레시피

이미지가 어떤 패키지 묶음을 포함할지 정의합니다.

```text
# mybsp-image.bb
SUMMARY = "MyBoard production image"
LICENSE = "MIT"

inherit core-image

IMAGE_INSTALL += " \
    kernel-modules \
    u-boot-fw-utils \
    openssh \
    chrony \
    mybsp-init \
    mybsp-firmware \
    "

IMAGE_FEATURES += "ssh-server-openssh package-management"

IMAGE_LINGUAS = "en-us ko-kr"
IMAGE_ROOTFS_EXTRA_SPACE = "32768"
```

빌드는 다음과 같습니다.

```bash
$ source oe-init-build-env build-mybsp
$ bitbake-layers add-layer ../meta-mybsp
$ MACHINE=mybsp bitbake mybsp-image
```

결과물은 `tmp/deploy/images/mybsp/` 아래에 `.wic.bz2`, `.dtb`, `zImage`, `u-boot.bin`이 모입니다.

## Buildroot vs Yocto — BSP 통합 비교

같은 작업을 두 시스템이 어떻게 표현하는지 비교합니다.

| 작업 | Buildroot | Yocto |
|------|-----------|-------|
| 커널 트리 지정 | `BR2_LINUX_KERNEL_CUSTOM_REPO_URL` | recipe의 `SRC_URI` |
| 커널 패치 | `BR2_GLOBAL_PATCH_DIR/linux/` | recipe `SRC_URI`의 `file://` |
| dtb 추가 | `BR2_LINUX_KERNEL_INTREE_DTS_NAME` | recipe의 `KERNEL_DEVICETREE` |
| rootfs overlay | `BR2_ROOTFS_OVERLAY` | `IMAGE_INSTALL` + custom recipe |
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

**Buildroot 본체에 패치 직접 적용.** 업스트림에서 받은 Buildroot를 git에 fork하고 거기에 BSP 변경을 박는 경우가 있습니다. 다음 Buildroot LTS로 올릴 때 merge 지옥이 옵니다. *반드시* 외부 트리.

**Yocto 레이어에 vendor 코드 직접 commit.** `SRC_URI`로 가져오게 두고, 패치만 레이어에 둡니다. 소스 자체를 commit 하면 git history와 라이선스 추적이 어려워집니다.

**커널 config를 defconfig 전체로.** Buildroot는 `BR2_LINUX_KERNEL_DEFCONFIG`로 distro의 defconfig을 base로 쓰고, fragment에는 *차이*만 둡니다. defconfig을 전체로 가져가면 다음 커널 버전업 때 옵션 충돌이 폭발합니다.

**Buildroot에서 ld.so.cache 재생성 잊기.** `post-build.sh`에서 `/etc/ld.so.cache`를 갱신하지 않으면 dynamic linker가 동작하지 않습니다. 표준 Buildroot는 자동이지만 커스텀 패키지는 의존성을 명시해야 합니다.

**Yocto에서 `INHERIT` 순서 무시.** `core-image`를 inherit 한 후 `IMAGE_INSTALL`을 override 하지 않고 그냥 할당하면 기본 패키지가 사라집니다. 항상 `+=`로 추가.

## 정리

- BSP의 rootfs는 Buildroot 또는 Yocto에 *통합*하는 것이 표준입니다. 손으로 모으지 않습니다.
- Buildroot는 외부 트리(BR2_EXTERNAL)로 BSP를 분리합니다. Buildroot 본체 코드에 손대지 않습니다.
- Yocto는 meta-vendor 레이어로 BSP를 분리합니다. machine.conf, 커널 recipe, U-Boot recipe, 이미지 recipe로 구성됩니다.
- Buildroot는 빠른 iteration과 작은 팀에, Yocto는 장기 LTS와 복잡한 product line에 적합합니다.
- 커널 config는 defconfig + fragment 패턴으로 *차이*만 관리합니다. 전체 defconfig을 BSP가 들고 있으면 upgrade가 막힙니다.
- rootfs overlay와 post-build 스크립트로 시스템 설정과 application을 주입합니다.
- 최종 이미지는 Buildroot에서 `genimage`, Yocto에서 `wic`로 조립합니다.

## 다음 편 예고

[Ch 17: 이미지 패키징](/blog/embedded/bsp/chapter17-image-packaging)에서는 빌드된 산출물을 어떻게 *최종 flash image*로 조립하는지 다룹니다. 파티션 layout, GPT, A/B partition, SD/eMMC writer 도구가 주제입니다.

## 관련 항목

- [Ch 15: 부트 시간 최적화](/blog/embedded/bsp/chapter15-boot-time-optimization) — 부팅 단계의 측정
- [Ch 17: 이미지 패키징](/blog/embedded/bsp/chapter17-image-packaging) — 다음 단계
- [Buildroot Practical 시리즈](/blog/embedded/buildroot/) — Buildroot 자체의 깊이 있는 다룸
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/) — recipe 묶음
