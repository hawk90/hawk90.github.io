---
title: "Buildroot Kconfig 설정 — menuconfig와 defconfig 작성"
date: 2026-05-19T09:03:00
description: "Buildroot의 Kconfig 시스템 — make menuconfig 사용법, defconfig 패턴, 옵션 의존성."
series: "Buildroot Practical"
seriesOrder: 3
tags: [embedded, buildroot, kconfig, defconfig]
draft: false
---

## 한 줄 요약

> **"Buildroot의 모든 설정은 Kconfig를 통과합니다."** — 리눅스 커널과 같은 도구이고, 익숙해지면 8개 메뉴에서 길을 잃지 않습니다.

## Kconfig를 왜 다시 만나는가

리눅스 커널을 빌드해 본 사람이라면 `make menuconfig`가 낯설지 않습니다. Buildroot는 *그대로 같은 Kconfig*를 빌드 시스템 전반에 적용했습니다. CPU 선택부터 패키지 활성화, init 시스템 선택까지 모두 한 트리 안에 들어 있고, `.config` 한 파일이 모든 결정을 담습니다.

장점은 분명합니다.

- *옵션 의존성*이 명시적으로 표현됩니다(`depends on`, `select`).
- *help text*가 옵션마다 붙어 있어 의미를 추적할 수 있습니다.
- *defconfig*로 결과를 압축·재현할 수 있습니다.

이 장에서는 menuconfig의 8개 최상위 메뉴를 한 번에 둘러보고, defconfig의 두 가지 명령(`make <name>_defconfig`, `make savedefconfig`)을 익힙니다.

## 첫 진입 — make menuconfig

clone 직후의 트리에서 menuconfig를 띄우면 다음과 같이 보입니다.

```text
$ make menuconfig
```

**Buildroot 2026.02 Configuration** 최상위 메뉴:

- Target options --->
- Build options --->
- Toolchain --->
- System configuration --->
- Kernel --->
- Target packages --->
- Filesystem images --->
- Bootloaders --->
- Host utilities --->
- Legacy config options --->


핵심은 위에서 보이는 **8개 메뉴**입니다. (`Legacy config options`는 maintainer가 *삭제 예정* 옵션을 정리하는 곳이고, 실무에서 직접 만질 일은 거의 없습니다.)

조작 키는 리눅스 커널 menuconfig와 동일합니다.

| 키 | 동작 |
|---|---|
| `↑` `↓` | 항목 이동 |
| `Enter` | 서브메뉴 진입 |
| `Space` | toggle (`[ ]` ↔ `[*]` ↔ `[M]`) |
| `Y` / `N` | 강제 켜기 / 끄기 |
| `?` | 현재 옵션의 help 보기 |
| `/` | 옵션 이름·심볼 검색 |
| `Esc Esc` | 한 단계 뒤로 / 저장하고 종료 |

`/`를 누른 뒤 옵션 심볼(`BR2_PACKAGE_OPENSSH`)을 치면 *어디 메뉴 어느 옵션*인지 한 번에 찾아 줍니다. 메뉴 탐색에 익숙해지기 전까지 가장 자주 쓰는 키가 `/`입니다.

## 1) Target options — *어떤 SoC를 위한 시스템인가*

CPU·architecture·ABI를 결정합니다. 모든 패키지의 cross-compile flag가 여기서 파생됩니다.

```text
Target options  --->
  Target Architecture (AArch64 (little endian))  --->
  Target Architecture Variant (cortex-A53)  --->
  Floating point strategy (FP-ARMv8)  --->
  MMU Page Size (4KB)  --->
  ABI (lp64)  --->
```

| 옵션 | 의미 |
|---|---|
| `BR2_aarch64` 등 | architecture 자체 |
| `BR2_cortex_a53` | -mcpu= flag |
| `BR2_ARM_FPU_VFPV3` | -mfpu= flag |
| `BR2_ARM_INSTRUCTIONS_THUMB2` | -mthumb |

CPU를 정확히 고르면 *모든 패키지가 그 CPU 최적화로 빌드*됩니다. 잘못 고르면 보드에서 SIGILL이 나거나, 성능을 깎아 먹습니다.

## 2) Build options — *호스트 빌드의 행동*

빌드 자체의 행동에 관한 옵션이 모입니다. 디렉터리 위치, 다운로드 미러, 빌드 잡 수 등입니다.

```text
Build options  --->
  Commands  --->
  Number of jobs to run simultaneously (0)
  Enable compiler cache
  (/buildroot-dl) Download dir
  (https://...) Primary download site
  ($(TOPDIR)/output) Build dir
  [*] Enable per-package directories
```

자주 만지는 옵션은 다음과 같습니다.

- **`BR2_DL_DIR`** — 다운로드 캐시 위치. CI에서는 영속 볼륨으로.
- **`BR2_PRIMARY_SITE`** + **`BR2_PRIMARY_SITE_ONLY`** — 사내 미러 우선.
- **`BR2_PER_PACKAGE_DIRECTORIES`** — per-package 모드. 패키지 간 격리가 강화돼 *간헐적 빌드 오류*가 줄어듭니다.
- **`BR2_CCACHE`** — ccache 활성화. 반복 빌드 속도가 크게 개선됩니다.

## 3) Toolchain — *cross-compile의 출처*

toolchain을 *직접 빌드*할지, *외부 toolchain*을 가져올지 결정합니다. 이 결정은 빌드 시간과 디버깅 편의에 큰 영향을 줍니다.

```text
Toolchain  --->
  Toolchain type (Buildroot toolchain)  --->
  ( ) External toolchain
  C library (glibc)
  Kernel Headers (Same as kernel being built)
  Binutils Version (2.41)
  GCC compiler Version (gcc 13.x)
  Enable C++ support
  Enable WCHAR support
  Enable IPv6 support
  ...
```

두 선택지의 트레이드오프는 다음과 같습니다.

| 항목 | Buildroot toolchain | External toolchain |
|---|---|---|
| 첫 빌드 시간 | 길다 (gcc + glibc 빌드) | 짧다 (이미 빌드된 것을 가져옴) |
| 재현성 | 높다 (트리 안에서 결정) | 외부 tarball·URL에 의존 |
| 디버깅 | source가 `output/build/`에 풀려 있음 | 외부 디렉터리 |
| 추천 | 학습·테스트 | 제품, vendor toolchain 강제 |

vendor가 *특정 toolchain*을 요구하면(예: Linaro, ARM GNU, Bootlin) external toolchain을 씁니다. 그 외 경우는 Buildroot toolchain이 깔끔합니다.

## 4) System configuration — *런타임 시스템의 성격*

hostname, root password, init 시스템, getty, /dev 관리 정책 등 *시스템 정체성*에 해당하는 옵션입니다.

```text
System configuration  --->
  (buildroot) System hostname
  (Welcome to Buildroot) System banner
  Passwords encoding (sha-512)
  Init system (BusyBox)
  /dev management (Dynamic using devtmpfs only)
  [*] Enable root login with password
  (root) Root password
  /bin/sh (busybox' default shell)
  [*] Run a getty (login prompt) after boot
    TTY port (console)
    Baudrate (keep kernel default)
```

특히 중요한 두 결정은 다음입니다.

- **Init system** — *busybox init*, *systemV*, *systemd*, *OpenRC* 중 선택. 소형 시스템은 busybox init, 데스크톱급은 systemd가 일반적입니다.
- **/dev management** — *static* / *devtmpfs only* / *devtmpfs + mdev* / *devtmpfs + eudev*. 최근 시스템 표준은 *devtmpfs + mdev* 또는 *devtmpfs + eudev*입니다.

## 5) Kernel — *Linux 빌드의 모든 것*

리눅스 커널을 *빌드 대상*에 포함할지, 어느 버전·source·config를 쓸지 결정합니다.

```text
Kernel  --->
  [*] Linux Kernel
    Kernel version (Latest version (6.6))  --->
    ( ) Custom Git repository
    Kernel configuration (Use the architecture default configuration)  --->
      ( ) Using a custom config file
    Kernel binary format (Image)
    [*] Build a Device Tree Blob (DTB)
      Device Tree Source file names: (qemu/aarch64-virt)
    Linux Kernel Tools  --->
      [*] cpupower
      [*] perf
```

핵심 옵션은 다음과 같습니다.

- **`BR2_LINUX_KERNEL_CUSTOM_VERSION`** — 6.6.30 같은 정확한 버전 고정.
- **`BR2_LINUX_KERNEL_CUSTOM_GIT_REPO_URL`** — vendor BSP의 fork를 그대로 가져올 때.
- **`BR2_LINUX_KERNEL_USE_CUSTOM_CONFIG`** + **`BR2_LINUX_KERNEL_CUSTOM_CONFIG_FILE`** — `.config`를 board 디렉터리에서 가져올 때.
- **`BR2_LINUX_KERNEL_INTREE_DTS_NAME`** — Device Tree source 이름 (kernel tree 안의 `.dts`).
- **`BR2_LINUX_KERNEL_DTS_SUPPORT`** + **`BR2_LINUX_KERNEL_CUSTOM_DTS_PATH`** — 외부 `.dts`를 *지정 경로에서* 컴파일.

커널 빌드만 다시 돌리고 싶을 때는 다음 명령을 자주 씁니다.

```bash
make linux-menuconfig
make linux-savedefconfig
make linux-rebuild
make linux-rebuild linux-reinstall
```

순서대로 *커널 `.config` 열기*, *defconfig 추출*, *변경 후 다시 빌드*, *rebuild + rootfs 반영*.

## 6) Target packages — *2,000개의 패키지 메뉴*

가장 깊은 트리입니다. 카테고리별로 그룹화돼 있고, 각 항목 안에 또 서브카테고리가 있습니다.

```text
Target packages  --->
  Audio and video applications  --->
  Compressors and decompressors  --->
  Debugging, profiling and benchmark  --->
  Development tools  --->
  Filesystem and flash utilities  --->
  Fonts, cursors, icons, sounds and themes  --->
  Games  --->
  Graphic libraries and applications (graphic/text)  --->
  Hardware handling  --->
  Interpreter languages and scripting  --->
  Libraries  --->
  Mail  --->
  Miscellaneous  --->
  Networking applications  --->
  Package managers  --->
  Real-Time  --->
  Security  --->
  Shell and utilities  --->
  System tools  --->
  Text editors and viewers  --->
```

여기서 패키지를 켜면 `BR2_PACKAGE_<NAME>=y`가 `.config`에 들어가고, 빌드에 포함됩니다. 어떤 패키지를 찾으려면 `/`로 검색하는 것이 가장 빠릅니다.

```text
/openssh<Enter>
Symbol: BR2_PACKAGE_OPENSSH
Type  : bool
Defined at package/openssh/Config.in:1
Prompt: openssh
Location: -> Target packages -> Networking applications
```

위 출력의 *Location*을 따라가면 옵션이 있는 메뉴 경로가 그대로 나옵니다.

옵션 의존성은 `depends on`과 `select`로 표현됩니다. 예를 들어 `openssh`는 OpenSSL이나 libressl을 필요로 합니다. 한 패키지를 켜면 *암시적으로* 의존 패키지도 함께 켜지는 경우가 있고, *명시적으로* 켜야 옵션이 보이는 경우도 있습니다.

```text
$ make graph-depends
```

이 명령은 의존성 그래프를 SVG로 그려 `output/graphs/graph-depends.svg`에 남깁니다. 의존성이 꼬였을 때 시각적으로 추적하기 좋습니다.

## 7) Filesystem images — *어떤 형식으로 패키징할까*

rootfs를 어느 *포맷*으로 출력할지 선택합니다. 여러 개를 동시에 켤 수 있습니다.

```text
Filesystem images  --->
  [*] cpio the root filesystem (for use as an initial RAM filesystem)
      Compression method (gzip)
  [*] ext2/3/4 root filesystem
      ext2/3/4 variant (ext4)
      [*] Add extra inodes
      (16) extra inodes
  [ ] squashfs
  [ ] tar
  [ ] ubi
```

대표 옵션과 용도는 다음과 같습니다.

| 옵션 | 산물 | 흔한 용도 |
|---|---|---|
| `BR2_TARGET_ROOTFS_CPIO` | `rootfs.cpio[.gz]` | initramfs |
| `BR2_TARGET_ROOTFS_EXT2` | `rootfs.ext4` | SD / eMMC |
| `BR2_TARGET_ROOTFS_SQUASHFS` | `rootfs.squashfs` | read-only flash |
| `BR2_TARGET_ROOTFS_TAR` | `rootfs.tar` | container 베이스 |
| `BR2_TARGET_ROOTFS_UBI` | `rootfs.ubi` | NAND flash |

Ch 8에서 각 포맷의 트레이드오프를 자세히 다룹니다.

## 8) Bootloaders — *어디서 부팅할까*

U-Boot, Barebox, GRUB, syslinux, edk2 같은 부트로더입니다.

```text
Bootloaders  --->
  [*] U-Boot
      Build system (Kconfig)
      U-Boot Version (Custom version)  --->
      (2024.04) U-Boot version
      Board defconfig (qemu_arm64)
      [*] U-Boot needs ATF BL31
      U-Boot binary format (.bin)
```

U-Boot도 *자체 Kconfig*를 가지며, Buildroot는 그 위에 *얇은 wrapper*입니다. U-Boot 옵션을 만지려면 다음 명령을 씁니다.

```text
$ make uboot-menuconfig          # U-Boot Kconfig 열기
$ make uboot-savedefconfig       # U-Boot defconfig 추출
$ make uboot-rebuild             # rebuild
```

비슷한 흐름이 linux, busybox에도 적용됩니다. 모두 *자체 Kconfig를 가진 패키지*에 통일된 wrapper입니다.

## 9) Host utilities — *호스트에서 쓸 도구*

빌드된 이미지를 *호스트가 다룰 도구*들이 들어갑니다. `genimage`, `mkpasswd`, `dosfstools`, `mtools` 같은 도구입니다.

```text
Host utilities  --->
  [*] host genimage
  [*] host mkpasswd
  [*] host dosfstools
  [*] host mtools
  [*] host parted
  [*] host qemu
```

이들은 *타깃 rootfs*에는 들어가지 *않습니다*. 호스트의 `output/host/bin/`에 설치되어, post-image 스크립트에서 SD 카드 이미지를 조립하는 등에 쓰입니다. Ch 7에서 활용 예가 나옵니다.

## defconfig — 결과를 한 줄로 압축하기

menuconfig로 변경한 결과는 `.config`에 들어가 있는데, 이 파일은 *전체 옵션*이 다 적힌 수천 줄짜리 산물입니다. git에 그대로 커밋하는 것은 비효율적이고 가독성도 떨어집니다.

대신 `make savedefconfig`를 씁니다.

```text
$ make savedefconfig
```

이 명령은 *기본값과 다른 옵션만* 모아 `defconfig` 파일을 만듭니다. 보통 50 ~ 200줄 안쪽으로 짧습니다. 다음과 같이 사용하는 흐름이 표준입니다.

```bash
make menuconfig
make savedefconfig
mv defconfig configs/myboard_defconfig
git add configs/myboard_defconfig
```

순서대로 *GUI에서 설정 조정*, *변경 사항을 defconfig로 추출*, *configs로 이동*, *git에 추가*.

이렇게 만든 defconfig는 *다른 사람이* 다음과 같이 재현할 수 있습니다.

```bash
make myboard_defconfig
make
```

defconfig가 git에 남는 *공식적인 보드 정의*이며, `.config`는 그 *전개판*입니다. 둘의 관계가 명확하게 분리되어 있어야 시간이 흐른 뒤에도 빌드를 재현할 수 있습니다.

## fragment 파일로 분할

defconfig 한 장이 너무 커지면 *조각 파일*로 나눌 수 있습니다. `support/kconfig/merge_config.sh`가 표준 도구입니다.

```text
$ ./support/kconfig/merge_config.sh \
        configs/myboard_defconfig \
        configs/fragments/with-debug.config \
        configs/fragments/with-openssh.config
```

이 패턴은 *동일한 보드*의 production / debug 변형을 두고 싶을 때 깔끔합니다. fragment 하나가 *기능 단위*가 되어 조합 가능해집니다.

## 자주 하는 실수

- **`.config`를 직접 편집합니다.** 의존성 검증이 빠지면서 inconsistency가 생깁니다. 가능하면 항상 menuconfig를 거쳐야 안전합니다.
- **`.config`를 git에 커밋합니다.** 수천 줄의 noise. 항상 `make savedefconfig`의 결과인 `defconfig`만 커밋합니다.
- **`make oldconfig` 없이 트리만 업그레이드합니다.** Buildroot 본체를 새 버전으로 올린 뒤에는 *반드시* `make oldconfig` 또는 `make olddefconfig`로 옵션 변화에 응답해야 합니다.
- **defconfig를 손으로 작성합니다.** 가능은 하지만 권장하지 않습니다. 반드시 menuconfig를 거치고 savedefconfig로 출력하세요.

## 정리

- Buildroot의 설정은 리눅스 커널과 같은 Kconfig 시스템 위에 있습니다.
- menuconfig에는 8개의 핵심 메뉴가 있고, 각 메뉴는 *시스템의 한 단면*을 정의합니다.
- 옵션 검색은 `/`로 빠르게, 의존성은 `make graph-depends`로 시각화합니다.
- linux·u-boot·busybox 같이 자체 Kconfig를 가진 패키지는 `make <pkg>-menuconfig` / `make <pkg>-savedefconfig`로 다룹니다.
- `make savedefconfig`로 *최소 차이*만 담은 defconfig를 추출해 git에 커밋합니다.
- fragment 파일과 `merge_config.sh`로 production / debug 변형을 조합합니다.
- `.config`는 산물이고, `defconfig`가 공식 정의입니다. 이 분리를 흐리지 마세요.

## 다음 장 예고

다음 편은 **Ch 4: 첫 빌드 — QEMU에서 동작하는 시스템**. `git clone`에서 부팅 prompt까지 전체 흐름을 따라갑니다.


## 관련 항목

- [Ch 2: 디렉터리 구조](/blog/embedded/buildroot/chapter02-directory-structure)
- [Ch 4: 첫 빌드 — QEMU에서 동작하는 시스템](/blog/embedded/buildroot/chapter04-first-build)
- [Ch 8: 출력 파일시스템 — initramfs, squashfs, ext4, cpio](/blog/embedded/buildroot/chapter08-filesystems)
- [BSP Development Ch 8: 커널 config 설계](/blog/embedded/bsp/chapter08-kernel-config) — kernel Kconfig 운영 패턴
