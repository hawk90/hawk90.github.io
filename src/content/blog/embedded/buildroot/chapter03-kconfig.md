---
title: "Buildroot Kconfig 설정 — menuconfig와 defconfig 작성"
slug: "embedded/buildroot/chapter03-kconfig"
date: 2026-05-19T09:03:00
description: "Buildroot의 Kconfig 시스템 — make menuconfig 사용법, defconfig 패턴, 옵션 의존성."
series: "Buildroot Practical"
seriesOrder: 3
tags: [embedded, buildroot, kconfig, defconfig]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Buildroot의 모든 설정은 Kconfig를 통과합니다."** — 리눅스 커널과 같은 도구이며, 메뉴별 역할을 알면 필요한 설정을 찾기 쉽습니다.

## Kconfig를 왜 다시 만나는가

리눅스 커널을 빌드해 본 사람이라면 `make menuconfig`가 낯설지 않습니다. Buildroot는 같은 Kconfig를 빌드 시스템 전반에 적용했습니다. CPU 선택부터 패키지 활성화, init 시스템 선택까지 모두 한 트리 안에 들어 있고, `.config` 한 파일이 모든 결정을 담습니다. 식당으로 치면 `.config`는 주방에 넘어가는 *완성된 주문서*이고, defconfig는 손님이 말한 *"평소대로, 단 맵게"* 한 줄입니다.

이 장의 모든 출력은 **Buildroot 2026.02.3**(LTS 계열, commit `679b9ead`) 소스에서 직접 확인했습니다. 설정 단계(`make <board>_defconfig`, `olddefconfig`, `savedefconfig`)는 호스트 make만 필요해서 macOS의 GNU make 4.4.1에서도 돌아갔고, `merge_config.sh` 실행은 Debian 13 arm64 VM에서 했습니다.

Kconfig를 쓰면 다음이 따라옵니다.

- 옵션 의존성이 `depends on`과 `select`로 명시됩니다.
- 옵션마다 help text가 붙어 있어 의미를 추적할 수 있습니다.
- defconfig로 결과를 압축·재현할 수 있습니다.

이 장에서는 menuconfig의 최상위 메뉴를 한 번에 둘러보고, defconfig의 두 가지 명령(`make <name>_defconfig`, `make savedefconfig`)을 익힙니다.

## 첫 진입 — make menuconfig

menuconfig 화면의 제목과 최상위 메뉴 순서는 최상위 `Config.in`이 정합니다. 2026.02.3의 해당 줄은 다음과 같습니다.

```text
$ grep -nE '^(mainmenu|menu |source)' Config.in
3:mainmenu "Buildroot $BR2_VERSION Configuration"
35:source "$BR2_BASE_DIR/.br2-external.in.paths"
131:source "arch/Config.in"
133:source "toolchain/Config.in"
135:menu "Build options"
...
1018:source "system/Config.in"
1020:source "linux/Config.in"
1022:source "package/Config.in"
1024:source "fs/Config.in"
1026:source "boot/Config.in"
1028:source "package/Config.in.host"
1030:source "Config.in.legacy"
1033:source "$BR2_BASE_DIR/.br2-external.in.menus"
```

`source`된 각 파일의 첫 `menu`를 따라가면 화면에 보이는 10개 메뉴가 순서대로 나옵니다.

| 순서 | 메뉴 이름 | 정의 파일 |
|---|---|---|
| 1 | Target options | `arch/Config.in` |
| 2 | Toolchain | `toolchain/Config.in` |
| 3 | Build options | `Config.in` 135행 |
| 4 | System configuration | `system/Config.in` |
| 5 | Kernel | `linux/Config.in` |
| 6 | Target packages | `package/Config.in` |
| 7 | Filesystem images | `fs/Config.in` |
| 8 | Bootloaders | `boot/Config.in` |
| 9 | Host utilities | `package/Config.in.host` |
| 10 | Legacy config options | `Config.in.legacy` |

`BR2_EXTERNAL` 트리를 쓰면 `.br2-external.in.menus`가 마지막에 붙어 "External options" 메뉴가 하나 더 생깁니다(Ch 6).

조작 키는 리눅스 커널 menuconfig와 같습니다.

| 키 | 동작 |
|---|---|
| `↑` `↓` | 항목 이동 |
| `Enter` | 서브메뉴 진입 |
| `Space` | 선택 토글 |
| `Y` / `N` | 켜기 / 끄기 |
| `?` | 현재 옵션의 help 보기 |
| `/` | 옵션 이름·심볼 검색 |
| `Esc` `Esc` | 이전 메뉴로 이동. 최상위에서 나가면 저장 여부를 묻습니다 |

`/`를 누른 뒤 심볼 이름(`BR2_PACKAGE_OPENSSH`)을 치면 그 옵션이 정의된 파일과 메뉴 경로가 나옵니다. 도서관 검색대에서 청구기호를 찾는 것과 같아서, 메뉴 위치를 외울 필요가 없습니다. 같은 정보를 터미널에서 얻으려면 `grep`으로 정의 위치부터 찾으면 됩니다.

```text
$ grep -rn "config BR2_PACKAGE_OPENSSH$" package/
package/openssh/Config.in:1:config BR2_PACKAGE_OPENSSH
```

## 1) Target options — 어떤 CPU를 위한 시스템인가

CPU·architecture·ABI를 결정합니다. 모든 패키지의 cross-compile flag가 여기서 파생됩니다. `qemu_aarch64_virt_defconfig`를 적용한 뒤 `.config`의 해당 줄은 다음과 같습니다.

```text
$ grep -E '^BR2_(aarch64|cortex|ARM_FPU|ARM64_PAGE_SIZE|GCC_TARGET)' .config
BR2_aarch64=y
BR2_cortex_a53=y
BR2_GCC_TARGET_ABI="lp64"
BR2_GCC_TARGET_CPU="cortex-a53"
BR2_ARM_FPU_FP_ARMV8=y
BR2_ARM64_PAGE_SIZE_4K=y
BR2_ARM64_PAGE_SIZE="4K"
```

defconfig에는 `BR2_aarch64=y` 한 줄만 있는데 `.config`에는 `cortex_a53`, `lp64`, `FP_ARMV8`이 들어왔습니다. `arch/Config.in.arm` 108행의 `default BR2_cortex_a53 if BR2_ARCH_IS_64`가 CPU를 정한 것입니다. 고른 CPU는 `BR2_GCC_TARGET_CPU` 문자열이 되고, `package/gcc/gcc.mk`가 이를 `--with-cpu=$(GCC_TARGET_CPU)`로 GCC configure에 넘깁니다. 외부 toolchain이면 `pkg-toolchain-external.mk`가 `-mcpu=$(GCC_TARGET_CPU)`를 wrapper에 넣습니다.

| 심볼 | 이 설정에서의 값 | 의미 |
|---|---|---|
| `BR2_aarch64` | `y` | architecture 자체 |
| `BR2_cortex_a53` | `y` | CPU 선택 |
| `BR2_GCC_TARGET_CPU` | `"cortex-a53"` | GCC `--with-cpu` / `-mcpu` 값 |
| `BR2_GCC_TARGET_ABI` | `"lp64"` | 64비트 long·pointer ABI |
| `BR2_ARM64_PAGE_SIZE` | `"4K"` | 커널·libc의 페이지 크기 가정 |

32비트 ARM(`BR2_arm`)을 고르면 `BR2_ARM_FPU_VFPV3`, `BR2_ARM_INSTRUCTIONS_THUMB2` 같은 심볼이 대신 나타납니다. BeagleBone용 `configs/beaglebone_defconfig`가 `BR2_cortex_a8=y`, `BR2_ARM_FPU_VFPV3=y`를 쓰는 예입니다.

## 2) Toolchain — cross-compile의 출처

toolchain을 직접 빌드할지, 외부 toolchain을 가져올지 결정합니다. 기본값을 그대로 둔 aarch64 설정에서 결정된 값은 다음과 같습니다.

```text
$ grep -E '^BR2_(TOOLCHAIN_BUILDROOT|TOOLCHAIN_BUILDROOT_GLIBC|BINUTILS_VERSION|GCC_VERSION)=' .config
BR2_TOOLCHAIN_BUILDROOT=y
BR2_TOOLCHAIN_BUILDROOT_GLIBC=y
BR2_BINUTILS_VERSION="2.44"
BR2_GCC_VERSION="14.3.0"
```

즉 이 릴리스의 기본은 **Buildroot가 binutils 2.44 + GCC 14.3.0 + glibc toolchain을 직접 빌드**하는 것입니다. 반대로 `beaglebone_defconfig`는 `BR2_TOOLCHAIN_EXTERNAL_BOOTLIN=y`로 미리 빌드된 Bootlin toolchain을 내려받습니다.

| 항목 | Buildroot toolchain | External toolchain |
|---|---|---|
| 첫 빌드에서 하는 일 | binutils·gcc·libc를 소스에서 빌드 | 미리 빌드된 tarball을 받아 풀기 |
| 버전 결정 위치 | 이 트리의 `.config` | 외부 배포처의 tarball |
| 소스 위치 | `output/build/host-gcc-*` 등에 풀림 | 배포처가 제공하는 범위 |
| 이 릴리스의 예 | `qemu_aarch64_virt_defconfig` | `beaglebone_defconfig` (Bootlin) |

빌드 시간 차이는 Ch 11에서 실제로 잰 값으로 비교합니다.

## 3) Build options — 호스트 빌드의 행동

빌드 자체의 행동에 관한 옵션이 모입니다. 다운로드 위치, 미러, 병렬 잡 수, ccache가 여기 있습니다. 기본값은 `Config.in`에 그대로 적혀 있습니다.

| 심볼 | 기본값 (`Config.in`) | 설명 |
|---|---|---|
| `BR2_DL_DIR` | `"$(TOPDIR)/dl"` | 다운로드 캐시. 같은 이름의 환경 변수가 있으면 그쪽이 이깁니다 |
| `BR2_PRIMARY_SITE` | `""` | 먼저 시도할 미러 |
| `BR2_PRIMARY_SITE_ONLY` | 꺼짐 | 켜면 primary site 외에는 받지 않음 |
| `BR2_JLEVEL` | `0` | "0이면 호스트 CPU 수로 자동 결정" |
| `BR2_CCACHE_DIR` | `"$(HOME)/.buildroot-ccache"` | ccache 저장소 |
| `BR2_PER_PACKAGE_DIRECTORIES` | 꺼짐 | 프롬프트가 "(experimental)" |

`BR2_PER_PACKAGE_DIRECTORIES`의 help는 용도를 두 가지로 적습니다.

```text
	  This is useful for two related purposes:

	    - Cleanly isolate the build of each package, so that a
	      given package only "sees" the dependencies it has
	      explicitly expressed, and not other packages that may
	      have by chance been built before.

	    - Enable top-level parallel build.

	  This is labeled as an experimental feature, as not all
	  packages behave properly with per-package directories.
```

ccache에 대해서는 매뉴얼 "Using ccache in Buildroot" 절이 캐시가 output 디렉터리 *밖*에 있어 여러 빌드가 공유한다는 점, `make ccache-stats`로 hit/miss를 볼 수 있다는 점을 설명합니다. 실제 hit율과 단축 시간은 Ch 14에서 측정합니다.

## 4) System configuration — 런타임 시스템의 성격

hostname, root password, init 시스템, getty, `/dev` 관리 정책처럼 시스템의 정체성에 해당하는 옵션입니다. 기본값으로 둔 aarch64 설정의 값은 다음과 같습니다.

```text
$ grep -E '^BR2_(TARGET_GENERIC_HOSTNAME|TARGET_GENERIC_ISSUE|TARGET_GENERIC_PASSWD_METHOD|TARGET_GENERIC_ROOT_PASSWD|INIT_BUSYBOX|ROOTFS_DEVICE_CREATION_DYNAMIC_DEVTMPFS|TARGET_GENERIC_GETTY_PORT)=' .config
BR2_TARGET_GENERIC_HOSTNAME="buildroot"
BR2_TARGET_GENERIC_ISSUE="Welcome to Buildroot"
BR2_TARGET_GENERIC_PASSWD_METHOD="sha-256"
BR2_TARGET_GENERIC_ROOT_PASSWD=""
BR2_INIT_BUSYBOX=y
BR2_ROOTFS_DEVICE_CREATION_DYNAMIC_DEVTMPFS=y
BR2_TARGET_GENERIC_GETTY_PORT="console"
```

root password가 빈 문자열이라는 점을 눈여겨봐야 합니다. 이 기본값 그대로 이미지를 내보내면 비밀번호 없는 root 로그인이 됩니다(Ch 18).

선택지는 `system/Config.in`의 `choice` 블록이 정합니다.

- **Init system** — `BR2_INIT_BUSYBOX`, `BR2_INIT_SYSV`, `BR2_INIT_OPENRC`, `BR2_INIT_SYSTEMD`, `BR2_INIT_CATATONIT`, `BR2_INIT_TINI`, `BR2_INIT_TINYINIT`, `BR2_INIT_NONE`의 8개입니다.
- **/dev management** — "Static using device table", "Dynamic using devtmpfs only", "Dynamic using devtmpfs + mdev", "Dynamic using devtmpfs + eudev"의 4개입니다. mdev는 BusyBox를, eudev는 `BR2_USE_WCHAR`·공유 라이브러리·MMU를 요구합니다.

기본값은 BusyBox init과 devtmpfs only입니다. `beaglebone_defconfig`처럼 핫플러그 장치가 있는 보드 설정은 `BR2_ROOTFS_DEVICE_CREATION_DYNAMIC_MDEV=y`를 명시합니다.

## 5) Kernel — Linux 빌드의 모든 것

리눅스 커널을 빌드 대상에 포함할지, 어느 버전·소스·config를 쓸지 결정합니다. `qemu_aarch64_virt_defconfig`의 커널 관련 줄은 다음과 같습니다.

```text
BR2_LINUX_KERNEL=y
BR2_LINUX_KERNEL_CUSTOM_VERSION=y
BR2_LINUX_KERNEL_CUSTOM_VERSION_VALUE="6.18.7"
BR2_LINUX_KERNEL_USE_CUSTOM_CONFIG=y
BR2_LINUX_KERNEL_CUSTOM_CONFIG_FILE="board/qemu/aarch64-virt/linux.config"
BR2_LINUX_KERNEL_NEEDS_HOST_OPENSSL=y
```

메뉴의 "Latest version"은 `linux/Config.in`에서 `bool "Latest version (6.19)"`, 실제 버전 문자열은 `default "6.19.14"`입니다. 이 defconfig는 그 기본값 대신 6.18.7로 고정했습니다. QEMU virt는 머신이 device tree를 만들어 주므로 이 설정에는 DTS 옵션이 없습니다(`# BR2_LINUX_KERNEL_DTS_SUPPORT is not set`).

| 심볼 | 쓰임 |
|---|---|
| `BR2_LINUX_KERNEL_CUSTOM_VERSION_VALUE` | 정확한 버전 고정 |
| `BR2_LINUX_KERNEL_CUSTOM_GIT_REPO_URL` | vendor BSP fork를 git으로 가져올 때 |
| `BR2_LINUX_KERNEL_USE_CUSTOM_CONFIG` + `BR2_LINUX_KERNEL_CUSTOM_CONFIG_FILE` | 커널 `.config`를 board 디렉터리에서 가져올 때 |
| `BR2_LINUX_KERNEL_DTS_SUPPORT` + `BR2_LINUX_KERNEL_INTREE_DTS_NAME` | 커널 트리 안의 `.dts` 이름 (`beaglebone_defconfig`는 `ti/omap/am335x-boneblack` 등 9개) |
| `BR2_LINUX_KERNEL_CUSTOM_DTS_PATH` | 트리 밖 `.dts` 경로 |

커널만 다시 다루고 싶을 때 쓰는 타깃은 매뉴얼 "Package-specific make targets" 표에 있습니다.

```bash
make linux-menuconfig       # 커널 Kconfig 열기
make linux-savedefconfig    # 커널 defconfig 추출
make linux-rebuild          # 컴파일 명령 재실행
make linux-reconfigure      # configure부터 다시
```

매뉴얼은 `rebuild`와 `reconfigure`를 "`OVERRIDE_SRCDIR`을 쓰거나 build 디렉터리의 파일을 직접 고쳤을 때만 의미가 있다"고 적습니다. 커널 `.config`만 바꿨다면 `linux-rebuild`가 그 경우에 해당합니다.

## 6) Target packages — 2,941개의 패키지 메뉴

가장 깊은 트리입니다. `package/Config.in`의 2단계 `menu`는 다음 20개입니다.

```text
Audio and video applications          Compressors and decompressors
Debugging, profiling and benchmark    Development tools
Filesystem and flash utilities        Fonts, cursors, icons, sounds and themes
Games                                 Graphic libraries and applications (graphic/text)
Hardware handling                     Interpreter languages and scripting
Libraries                             Mail
Miscellaneous                         Networking applications
Package managers                      Real-Time
Security                              Shell and utilities
System tools                          Text editors and viewers
```

2026.02.3의 `package/` 아래 디렉터리는 2,941개, `.mk` 파일은 3,307개입니다(`ls -d package/*/ | wc -l`, `find package -name '*.mk' | wc -l`). 패키지를 켜면 `BR2_PACKAGE_<NAME>=y`가 `.config`에 들어가고 빌드 대상이 됩니다.

의존성은 `depends on`과 `select`로 표현됩니다. `package/openssh/Config.in`의 첫 줄들이 두 가지를 다 보여 줍니다.

```text
config BR2_PACKAGE_OPENSSH
	bool "openssh"
	depends on BR2_USE_MMU # fork()
	select BR2_PACKAGE_OPENSSL
	select BR2_PACKAGE_ZLIB
```

`depends on`은 *조건이 맞아야 메뉴에 보인다*는 뜻이고, `select`는 *이걸 켜면 저것도 강제로 켠다*는 뜻입니다. 앞의 것은 놀이기구의 키 제한, 뒤의 것은 세트 메뉴입니다. 실제로 `.config`에 `BR2_PACKAGE_OPENSSH=y` 한 줄을 넣고 `make olddefconfig`를 돌리면 `y`로 켜진 줄이 318개에서 364개로 늘었습니다. OpenSSL(`BR2_PACKAGE_LIBOPENSSL_*` 하위 옵션 포함)·zlib·openssh 하위 옵션이 모두 따라 켜졌기 때문입니다.

의존성 그래프는 `graph-depends`로 그립니다. 출력 형식은 최상위 `Makefile` 212행에서 정해집니다.

```makefile
BR_GRAPH_OUT := $(or $(BR2_GRAPH_OUT),pdf)
```

기본은 PDF이고, SVG가 필요하면 매뉴얼 예시대로 환경 변수를 줍니다. 결과는 `output/graphs/`에 남습니다. 매뉴얼 "Optional packages"는 이 타깃에 호스트의 `graphviz`가 필요하다고 적습니다.

```bash
BR2_GRAPH_OUT=svg make graph-depends
```

## 7) Filesystem images — 어떤 형식으로 패키징할까

rootfs를 어느 포맷으로 출력할지 선택합니다. 여러 개를 동시에 켤 수 있습니다. 2026.02.3의 `fs/`에는 btrfs, cloop, cpio, cramfs, erofs, ext2, f2fs, initramfs, iso9660, jffs2, oci, squashfs, tar, ubi, ubifs, yaffs2의 16개 서브디렉터리가 있습니다. QEMU defconfig는 ext4 하나만 켭니다.

```text
$ grep -E '^BR2_TARGET_ROOTFS_EXT2' .config
BR2_TARGET_ROOTFS_EXT2=y
BR2_TARGET_ROOTFS_EXT2_4=y
BR2_TARGET_ROOTFS_EXT2_GEN=4
BR2_TARGET_ROOTFS_EXT2_LABEL="rootfs"
BR2_TARGET_ROOTFS_EXT2_SIZE="60M"
BR2_TARGET_ROOTFS_EXT2_INODES=0
BR2_TARGET_ROOTFS_EXT2_INODE_SIZE=256
BR2_TARGET_ROOTFS_EXT2_RESBLKS=5
BR2_TARGET_ROOTFS_EXT2_MKFS_OPTIONS="-O ^64bit"
BR2_TARGET_ROOTFS_EXT2_NONE=y
BR2_TARGET_ROOTFS_EXT2_BLOCKS=0
BR2_TARGET_ROOTFS_EXT2_EXTRA_INODES=0
BR2_TARGET_ROOTFS_EXT2_EXTRA_BLOCKS=0
```

`SIZE="60M"`은 이미지 크기 고정값이고, `_NONE=y`는 압축하지 않는다는 뜻입니다.

| 옵션 | 산물 | 쓰임 |
|---|---|---|
| `BR2_TARGET_ROOTFS_CPIO` | `rootfs.cpio[.gz]` | initramfs |
| `BR2_TARGET_ROOTFS_EXT2` | `rootfs.ext2`(+`rootfs.ext4` 링크) | SD / eMMC |
| `BR2_TARGET_ROOTFS_SQUASHFS` | `rootfs.squashfs` | 읽기 전용 flash |
| `BR2_TARGET_ROOTFS_TAR` | `rootfs.tar` | 다른 도구의 입력 |
| `BR2_TARGET_ROOTFS_UBI` | `rootfs.ubi` | NAND flash |

Ch 8에서 각 포맷의 크기와 쓰임을 실제 산출물로 비교합니다.

## 8) Bootloaders — 어디서 부팅할까

`boot/` 아래에는 U-Boot, Barebox, GRUB2, syslinux, edk2, OpenSBI, ARM Trusted Firmware, OP-TEE OS 등 21개 디렉터리가 있습니다. QEMU aarch64 defconfig는 부트로더를 켜지 않습니다. QEMU가 `-kernel`로 커널을 직접 올리기 때문입니다. 실제 보드인 `beaglebone_defconfig`의 U-Boot 부분은 다음과 같습니다.

```text
BR2_TARGET_UBOOT=y
BR2_TARGET_UBOOT_BUILD_SYSTEM_KCONFIG=y
BR2_TARGET_UBOOT_CUSTOM_VERSION=y
BR2_TARGET_UBOOT_CUSTOM_VERSION_VALUE="2026.01"
BR2_TARGET_UBOOT_BOARD_DEFCONFIG="am335x_evm"
BR2_TARGET_UBOOT_FORMAT_IMG=y
BR2_TARGET_UBOOT_SPL=y
BR2_TARGET_UBOOT_SPL_NAME="MLO"
```

U-Boot도 자체 Kconfig를 가지며, Buildroot는 그 위의 얇은 wrapper입니다. linux, busybox, uclibc 같은 패키지도 같은 이름 규칙의 타깃을 가집니다.

```bash
make uboot-menuconfig          # U-Boot Kconfig 열기
make uboot-savedefconfig       # U-Boot defconfig 추출
make uboot-rebuild             # 컴파일 재실행
```

## 9) Host utilities — 호스트에서 쓸 도구

이미지를 호스트가 다룰 때 쓰는 도구입니다. `beaglebone_defconfig`가 켜는 host 패키지는 `BR2_PACKAGE_HOST_DOSFSTOOLS`, `BR2_PACKAGE_HOST_GENIMAGE`, `BR2_PACKAGE_HOST_KMOD_XZ`, `BR2_PACKAGE_HOST_MTOOLS`입니다. FAT 부트 파티션을 만들고(dosfstools·mtools) SD 카드 이미지를 조립(genimage)하는 데 쓰입니다. QEMU defconfig는 `BR2_PACKAGE_HOST_QEMU=y`로 호스트용 QEMU를 같이 빌드합니다.

이들은 타깃 rootfs에 들어가지 않고 `output/host/bin/`에 설치됩니다. Ch 7에서 post-image 스크립트가 이 도구를 부르는 흐름을 봅니다.

## defconfig — 결과를 한 줄로 압축하기

menuconfig 결과인 `.config`는 모든 심볼이 다 적힌 파일입니다. `qemu_aarch64_virt_defconfig`를 적용한 직후의 `.config`는 5,149줄이었습니다. 이걸 그대로 git에 넣으면 리뷰할 때 무엇이 의도한 변경인지 보이지 않습니다. 이사할 때 짐 목록 전체가 아니라 *평소와 다른 것만* 적어 두는 것과 같은 이치로, `make savedefconfig`는 기본값과 다른 심볼만 남깁니다.

먼저 아무것도 바꾸지 않고 왕복시켜 봤습니다.

```text
$ make qemu_aarch64_virt_defconfig
$ wc -l .config
5149 .config
$ make savedefconfig BR2_DEFCONFIG=$PWD/saved_defconfig
$ diff saved_defconfig configs/qemu_aarch64_virt_defconfig && echo IDENTICAL
IDENTICAL
$ wc -l saved_defconfig
18 saved_defconfig
```

5,149줄이 18줄로 돌아오고, 원본 defconfig와 바이트 단위로 같습니다. 다음으로 openssh 한 줄을 켠 뒤 같은 과정을 거쳤습니다.

```text
$ echo 'BR2_PACKAGE_OPENSSH=y' >> .config
$ make olddefconfig
$ make savedefconfig BR2_DEFCONFIG=$PWD/ssh_defconfig
$ diff configs/qemu_aarch64_virt_defconfig ssh_defconfig
13a14
> BR2_PACKAGE_OPENSSH=y
```

`select`로 따라 켜진 OpenSSL·zlib 심볼은 defconfig에 하나도 남지 않습니다. 다시 펼칠 때 `select`가 똑같이 켜 주기 때문입니다. 그래서 defconfig의 diff는 *사람이 내린 결정*만 보여 줍니다.

내 보드 defconfig를 만드는 흐름은 다음과 같습니다.

```bash
make menuconfig
make savedefconfig BR2_DEFCONFIG=configs/myboard_defconfig
git add configs/myboard_defconfig
```

`BR2_DEFCONFIG`를 주지 않아도 됩니다. `make <name>_defconfig`가 `.config`에 `BR2_DEFCONFIG="<트리>/configs/<name>_defconfig"`를 기록하고(위 실험의 `.config` 449행), `savedefconfig`는 그 경로에 덮어씁니다. 그 값도 없으면 `Config.in`의 기본값 `$(CONFIG_DIR)/defconfig`에 씁니다. 다른 사람은 다음 두 줄로 같은 `.config`를 재현합니다.

```bash
make myboard_defconfig
make
```

## fragment 파일로 분할

같은 보드의 production / debug 변형을 두고 싶다면 기능 단위 조각 파일을 합칩니다. Buildroot는 커널에서 온 `support/kconfig/merge_config.sh`를 같이 배포합니다. 스크립트 머리말은 이 도구가 "overridden values"와 "values that did not make it to the resulting .config file"을 경고한다고 적습니다.

SSH 관련 두 줄을 fragment로 두고 QEMU defconfig에 합쳐 봤습니다. 이 스크립트는 GNU coreutils의 `cp`·`mktemp` 동작을 가정해서 macOS에서는 실패했고, Debian 13 VM에서 실행했습니다.

```text
$ cat ~/frag/with-ssh.config
BR2_PACKAGE_OPENSSH=y
BR2_PACKAGE_DROPBEAR=y
$ cd ~/out-merge
$ ~/buildroot/support/kconfig/merge_config.sh -m \
      ~/buildroot/configs/qemu_aarch64_virt_defconfig ~/frag/with-ssh.config
Merging /home/br/frag/with-ssh.config
#
# merged configuration written to .config (needs make)
#
$ make -C ~/buildroot O=$PWD olddefconfig
$ grep -E '^BR2_PACKAGE_(OPENSSH|DROPBEAR)=' .config
BR2_PACKAGE_DROPBEAR=y
BR2_PACKAGE_OPENSSH=y
```

`-m`는 병합만 하고 `make`를 부르지 않는 옵션이라, 뒤에 `olddefconfig`로 의존성을 풀어 줍니다. 출력 마지막 줄의 "(needs make)"가 바로 그 뜻입니다.

## 자주 하는 실수

- **`.config`를 직접 편집하고 그대로 빌드합니다.** Kconfig는 `depends on`이 맞지 않는 줄을 다음 `olddefconfig`에서 경고 없이 지웁니다. BusyBox init 설정에 `BR2_PACKAGE_SYSTEMD=y`를 덧붙이고 `make olddefconfig`를 돌렸더니 그 줄이 사라졌습니다(`package/systemd/Config.in`의 `depends on BR2_INIT_SYSTEMD`). 손으로 고쳤다면 `olddefconfig` 뒤 의도한 줄이 남았는지 `grep`으로 확인합니다.
- **`.config`를 git에 커밋합니다.** 위 예에서 5,149줄 중 사람이 정한 것은 18줄이었습니다. `savedefconfig` 결과만 커밋합니다.
- **Buildroot를 올린 뒤 그대로 빌드합니다.** 새 버전에서 사라지거나 이름이 바뀐 심볼은 `Config.in.legacy`의 "Legacy config options" 메뉴에 모입니다. `make olddefconfig` 후 이 메뉴에 켜진 항목이 있는지 확인합니다.
- **savedefconfig 결과에 select로 켜진 심볼을 손으로 추가합니다.** 위 실험처럼 `select`가 다시 켜 주므로 중복이고, 상위 패키지를 끌 때 혼란만 남습니다.

## 정리

- Buildroot 설정은 리눅스 커널과 같은 Kconfig 위에 있고, 최상위 메뉴 10개의 순서는 최상위 `Config.in`의 `source` 순서입니다.
- 2026.02.3의 aarch64 기본 toolchain은 Buildroot가 직접 빌드하는 binutils 2.44 + GCC 14.3.0 + glibc입니다.
- 기본 root password는 빈 문자열이고, 기본 init은 BusyBox, `/dev`는 devtmpfs only입니다.
- `select`는 의존 패키지를 강제로 켜고, `depends on`은 조건이 맞을 때만 옵션을 보여 줍니다. openssh 한 줄이 `y` 심볼 46개를 늘렸습니다.
- `make savedefconfig`는 5,149줄 `.config`를 18줄 defconfig로 되돌렸고, 원본과 바이트 단위로 같았습니다.
- `graph-depends`의 기본 출력은 PDF이며 `BR2_GRAPH_OUT=svg`로 바꿉니다.
- `merge_config.sh -m` 뒤에는 `make olddefconfig`가 필요합니다.

## 다음 장 예고

다음 편은 **Ch 4: 첫 빌드 — QEMU에서 동작하는 시스템**. `git clone`에서 부팅 prompt까지 전체 흐름을 따라갑니다.


## 관련 항목

- [Ch 2: 디렉터리 구조](/blog/embedded/buildroot/chapter02-directory-structure)
- [Ch 4: 첫 빌드 — QEMU에서 동작하는 시스템](/blog/embedded/buildroot/chapter04-first-build)
- [Ch 8: 출력 파일시스템 — initramfs, squashfs, ext4, cpio](/blog/embedded/buildroot/chapter08-filesystems)
- [BSP Development Ch 8: 커널 config 설계](/blog/embedded/bsp/chapter08-kernel-config) — kernel Kconfig 운영 패턴
- [Buildroot Manual — Package-specific make targets](https://buildroot.org/downloads/manual/manual.html#pkg-build-steps)
