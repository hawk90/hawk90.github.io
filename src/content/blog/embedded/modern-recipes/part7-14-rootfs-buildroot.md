---
title: "7-14: 루트 파일시스템 (Buildroot 기초)"
date: 2026-05-15T16:00:00
description: "Buildroot 설정, package 추가, post-build script, toolchain 선택, Yocto와의 trade-off를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 88
tags: [recipes, linux, buildroot, rootfs]
---

## 한 줄 요약

> **"Buildroot = make 한 번으로 cross toolchain + kernel + rootfs를 통째로 생성하는 빌드 시스템입니다."** 단순한 device에 가장 빠르게 적용할 수 있습니다.

## 어떤 상황에서 쓰나

100 MB 이내의 small footprint device, BLE gateway, IIoT sensor, kiosk처럼 *수십 개 package*면 충분한 시스템에 Buildroot가 가장 잘 맞습니다. 단일 binary로 모든 것을 정의하고 reproducible build가 가능하며, 6시간 안에 cross toolchain부터 SD image까지 만들어줍니다.

반대로 수백 package + multi-recipe + 다중 image type + 회사 전역 layer 공유가 필요한 환경에서는 Yocto가 더 적합합니다. 둘은 경쟁이 아니라 *크기 기반의 선택*입니다.

## 핵심 개념

```text
Buildroot 구조
buildroot/
  configs/<board>_defconfig    board별 기본 config
  board/<vendor>/<board>/      board-specific files
  package/                      ~3000개 package recipe
  output/                       build 결과
    images/                     rootfs.tar, sdcard.img, kernel
    target/                     install된 rootfs (실 파일)
    host/                       cross toolchain
```

기본 build cycle입니다.

1. `make <board>_defconfig`
2. `make menuconfig` (필요 시)
3. `make -jN`
4. `dd if=output/images/sdcard.img of=/dev/sdX`

한 줄로 정리하면 *Buildroot 한 디렉터리가 BSP의 single source*입니다.

**Buildroot vs Yocto:**

| 항목 | Buildroot | Yocto |
|------|-----------|-------|
| 크기 | ~수십 MB | ~수 GB |
| 빌드 시간 (첫 빌드) | 1~3시간 | 6~12시간 |
| 학습 곡선 | 완만 | 가파름 |
| package 수 | ~3000 | ~10000 |
| multi-image, layer | 제한적 | 강력 |
| 적합 규모 | small footprint | enterprise BSP |

## 코드 / 실제 사용 예

### 시작하기

```bash
git clone --depth 1 git://git.buildroot.net/buildroot
cd buildroot

# 사용 가능한 defconfig 보기
ls configs/

# 예시 — Raspberry Pi 4 64-bit
make raspberrypi4_64_defconfig
make menuconfig          # 옵션 조정
make -j$(nproc)

# 결과
ls output/images/
# bcm2711-rpi-4-b.dtb  Image  rootfs.tar  sdcard.img
```

`make` 한 번에 toolchain download → cross compile → rootfs 조립 → SD image 생성까지 끝납니다.

### menuconfig으로 package 추가

```text
make menuconfig

Target packages →
  Networking applications → [*] dropbear (SSH)
  System tools           → [*] htop
  Hardware handling      → [*] i2c-tools
  Text editors          → [*] vim
```

각 package에는 dependency가 자동 해결됩니다. 변경 후 `make` 다시 실행하면 추가 package만 빌드합니다.

### Custom defconfig 추출

```bash
make savedefconfig
# 결과: defconfig (변경 사항만 적힌 minimal config)

cp defconfig configs/myboard_defconfig
```

board별 defconfig을 commit하면 다른 사람이 `make myboard_defconfig`로 같은 config을 재현할 수 있습니다.

### Toolchain 선택

```text
make menuconfig → Toolchain →
  Toolchain type:
    [*] Buildroot toolchain     # source부터 빌드 (재현성 최고)
    [ ] External toolchain      # ARM, Linaro 등 prebuilt 사용

  C library:
    glibc     일반 distro와 호환
    musl      작고 깨끗
    uclibc-ng 최소
```

External toolchain은 빌드 시간을 크게 줄이지만 reproducibility가 낮아집니다. 양산은 Buildroot toolchain이 표준입니다.

### Board-specific overlay

```text
board/vendor/myboard/
  overlay/              rootfs에 그대로 복사할 파일
    etc/init.d/S99myapp
    etc/network/interfaces
  post-build.sh         build 직전 hook
  post-image.sh         image 생성 직전 hook
  genimage.cfg          SD image partition layout
```

```sh
# post-build.sh
#!/bin/sh
TARGET_DIR=$1
echo "myboard v1.0" > $TARGET_DIR/etc/board_info
chmod 755 $TARGET_DIR/etc/init.d/S99myapp
```

config에 다음을 추가합니다.

```text
BR2_ROOTFS_OVERLAY="board/vendor/myboard/overlay"
BR2_ROOTFS_POST_BUILD_SCRIPT="board/vendor/myboard/post-build.sh"
```

### Custom package 만들기

```text
package/myapp/
  Config.in
  myapp.mk
```

```text
# Config.in
config BR2_PACKAGE_MYAPP
    bool "myapp"
    help
      My custom application.
```

```makefile
# myapp.mk
MYAPP_VERSION = 1.0
MYAPP_SITE = $(call github,myorg,myapp,v$(MYAPP_VERSION))
MYAPP_LICENSE = MIT
MYAPP_DEPENDENCIES = libcurl

define MYAPP_BUILD_CMDS
    $(MAKE) CC="$(TARGET_CC)" -C $(@D)
endef

define MYAPP_INSTALL_TARGET_CMDS
    $(INSTALL) -m 0755 $(@D)/myapp $(TARGET_DIR)/usr/bin/
endef

$(eval $(generic-package))
```

`Config.in`을 `package/Config.in`에 source로 추가하면 menuconfig에 노출됩니다.

### Init 시스템 선택

```text
make menuconfig → System configuration → Init system
  [*] BusyBox       기본 — 작고 빠름
  [ ] systemV       전통적
  [ ] systemd       풀스택 — RAM 비용 큼
  [ ] OpenRC        gentoo 스타일
  [ ] None          custom init
```

작은 device는 BusyBox init이 가장 단순합니다. systemd는 ~30 MB 이상의 RAM을 추가로 씁니다.

### Reproducible build

```text
BR2_REPRODUCIBLE=y
BR2_DL_DIR=$(HOME)/buildroot-dl     # source tarball cache
BR2_CCACHE=y
```

같은 source + 같은 toolchain으로 *bit-identical* 결과가 나오게 만들 수 있습니다. 양산기 인증과 supply chain 점검에 필수입니다.

## 측정 / 성능 비교

| 지표 | Buildroot | Yocto (poky) |
|------|-----------|---------------|
| 첫 빌드 (16 코어) | ~90분 | ~6시간 |
| 재빌드 (1 package 추가) | ~5분 | ~15분 |
| disk 사용량 | ~5 GB | ~50 GB |
| rootfs 최소 크기 | ~2 MB (busybox) | ~50 MB (core-image-minimal) |
| package 수 | ~3000 | ~10000 |

```text
부팅 시간 (i.MX8M Mini + rootfs.ext4)
busybox + dropbear         1.8 s
systemd minimal            6.2 s
```

부팅 시간을 우선시한다면 BusyBox init이 결정적으로 유리합니다.

## 자주 보는 함정

> 빌드 도중 download 실패

```text
make: *** failed to download tar
```

회사 방화벽이나 sourceforge mirror 변경이 흔한 원인입니다. `BR2_DL_DIR`을 별도 서버에 두고 미리 받아두는 패턴이 양산에서 표준입니다.

> Toolchain 변경 후 부분 rebuild

```text
make foo-rebuild       # 잘못된 결과
```

Toolchain 변경 시 *반드시* `make clean`을 합니다. Buildroot는 toolchain 변경 추적이 약합니다.

> Host system 의존성

```text
You must install m4 ...
```

`make prepare`나 `support/dependencies/dependencies.sh`로 host 요구사항을 확인합니다. CI는 Docker container로 통일하는 것이 안전합니다.

> Overlay 권한 누락

```text
rootfs에 파일은 있는데 실행 안 됨
```

`overlay/`의 파일은 git에서 mode가 보존되지 않습니다. `post-build.sh`에서 `chmod`로 명시합니다.

> rootfs.tar 크기 초과

```text
ext4 image creation failed: not enough space
```

`BR2_TARGET_ROOTFS_EXT2_SIZE`를 늘리거나 불필요한 package를 끕니다.

## 정리

- Buildroot는 small footprint Linux의 단일 source build tool입니다.
- `make <board>_defconfig`와 `make -jN` 두 줄로 SD image까지 완성됩니다.
- Custom defconfig을 commit해 board별 BSP를 공유합니다.
- Overlay와 post-build hook으로 board-specific 파일을 끼웁니다.
- Custom package는 Config.in과 mk 파일 두 개로 정의합니다.
- BusyBox init이 작고 빠르고, systemd는 30 MB 이상의 RAM을 더 씁니다.
- Yocto는 enterprise 규모 BSP, Buildroot는 작은 device에 맞습니다.

다음 편부터 Part 8 **동적 메모리**로 넘어갑니다.

## 관련 항목

- [7-01: 임베디드 Linux 부팅 흐름](/blog/embedded/modern-recipes/part7-01-linux-boot-flow)
- [7-02: U-Boot 활용](/blog/embedded/modern-recipes/part7-02-uboot-usage)
- [7-05: 커널 빌드](/blog/embedded/modern-recipes/part7-05-kernel-build)
- [7-06: Kernel Module 기초](/blog/embedded/modern-recipes/part7-06-kernel-module)
