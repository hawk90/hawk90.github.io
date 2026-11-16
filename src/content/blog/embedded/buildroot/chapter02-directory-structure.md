---
title: "Buildroot 디렉터리 구조 분해 — board·configs·dl·output"
slug: "embedded/buildroot/chapter02-directory-structure"
date: 2026-05-19T09:02:00
description: "Buildroot 트리 — package, board, configs, fs, output, dl 디렉터리의 역할."
series: "Buildroot Practical"
seriesOrder: 2
tags: [embedded, buildroot, directory]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Buildroot 트리는 6개의 핵심 디렉터리로 거의 모든 것을 설명할 수 있습니다."** — `package/`, `board/`, `configs/`, `fs/`, `output/`, `dl/`의 역할만 알면 빌드 어디서 무엇이 일어나는지 추적할 수 있습니다.

## 왜 디렉터리부터 보는가

Buildroot를 처음 받으면 최상위에 파일과 디렉터리가 스무 개 넘게 있습니다. 그중 실무에서 거의 매일 들여다보는 곳은 6개로 좁혀집니다. 큰 공장에 처음 출근했을 때 창고·작업대·출하장 위치부터 익히는 것과 같습니다. 이 6개의 역할을 먼저 머릿속에 그려 두면 다음 장의 Kconfig 메뉴 구조나 패키지 작성 규약이 자연스럽게 연결됩니다.

이 장의 목록은 모두 **Buildroot 2026.02.3** 태그를 clone한 트리와, 그 트리에서 `qemu_aarch64_virt_defconfig`를 실제로 빌드한 결과(Ch 1의 Debian 13 arm64 VM)에서 뽑았습니다.

clone 직후 루트에서 `ls`를 찍으면 다음과 같습니다.

```text
$ ls -1
arch
board
boot
CHANGES
Config.in
Config.in.legacy
configs
COPYING
DEVELOPERS
docs
fs
linux
Makefile
Makefile.legacy
package
README
SECURITY.md
support
system
toolchain
utils
```

크기로는 `package/`가 50 MB로 가장 크고, `support/` 5.1 MB, `board/` 5.0 MB, `docs/` 2.8 MB, `configs/` 1.2 MB 순입니다(`du -sh`). 각 디렉터리의 역할은 다음과 같습니다.

| 디렉터리 | 역할 |
|---|---|
| `Config.in` | 최상위 Kconfig 진입점 |
| `Makefile` | make 명령의 본체 |
| `package/` | 패키지 정의 (`Config.in` + `.mk` 쌍), 디렉터리 2,941개 |
| `board/` | 보드별 파일 (defconfig가 참조하는 자료) |
| `configs/` | defconfig 카탈로그, 308개 |
| `fs/` | rootfs 이미지 생성기, 16종 |
| `output/` | 빌드 산물 (Buildroot의 `.gitignore`가 `/output*`을 제외) |
| `dl/` | 다운로드 캐시 (`.gitignore`가 `/dl`을 제외) |
| `linux/` | Linux 커널 빌드 인프라 |
| `boot/` | U-Boot, GRUB2, syslinux 등 부트로더 21종 |
| `toolchain/` | toolchain 빌드/임포트 |
| `arch/` | architecture별 Kconfig |
| `system/` | skeleton rootfs, device table |
| `support/` | 빌드 보조 스크립트, kconfig 소스 |
| `docs/` | 매뉴얼 소스 |
| `utils/` | `check-package` 같은 maintainer 도구 |

## package/ — 패키지의 본거지

`package/`는 Buildroot의 *중심*입니다. 한 패키지는 한 서브디렉터리에 들어 있고, 두 파일의 쌍으로 정의됩니다. busybox 디렉터리를 보면 그 쌍 말고도 몇 종류의 파일이 더 있습니다.

```text
$ ls package/busybox/
0001-networking-libiproute-use-linux-if_packet.h-instead-.patch
0002-Makefile.flags-strip-non-l-arguments-returned-by-pkg.patch
...
0014-wget-dont-allow-control-characters-or-spaces-in-the-URL.patch
busybox-minimal.config
busybox.config
busybox.hash
busybox.mk
Config.in
inittab
mdev.conf
S01syslogd
S02klogd
S02sysctl
S10mdev
S15watchdog
S41ifplugd
S50crond
S50telnet
S90httpd
telnetd.service
udhcpc.script
```

핵심은 다음 두 가지입니다.

- **`Config.in`** — Kconfig로 노출할 옵션을 정의합니다. menuconfig에서 보이는 체크박스와 선택 항목이 모두 여기서 옵니다.
- **`<name>.mk`** — 패키지를 *어떻게 빌드할지* 기술합니다. version, source URL, 의존성, configure/build/install 명령 hook이 들어갑니다.

같은 디렉터리의 나머지 파일은 다음 역할을 합니다.

| 파일 | 역할 | busybox의 예 |
|---|---|---|
| `NNNN-*.patch` | source에 적용할 패치 (알파벳 순) | `0001-…`부터 `0014-…`까지 14개 |
| `<name>.hash` | tarball과 license 파일의 hash | `busybox.hash` |
| `S<NN><name>` | `/etc/init.d`에 설치할 SysV init 스크립트 | `S01syslogd`, `S50crond` |
| `<name>.service` | systemd unit | `telnetd.service` |
| `<name>.config` | 자체 Kconfig 패키지의 기본 설정 | `busybox.config`, `busybox-minimal.config` |

2026.02.3의 `package/` 아래 디렉터리는 2,941개, `.mk` 파일은 3,307개입니다. `.mk`가 더 많은 이유는 `package/pkg-generic.mk` 같은 infra 파일과, 한 디렉터리에 여러 `.mk`를 두는 패키지가 있기 때문입니다. 두 파일의 규약은 Ch 5에서 상세히 다룹니다.

## board/ — 보드별 자산

`board/`는 defconfig가 *참조하는* 보드별 자료를 모읍니다. 보드 디렉터리는 vendor 이름 아래 한 단계 더 들어가기도 합니다. BeagleBone의 자료는 `board/beaglebone/`이 아니라 `board/beagleboard/beaglebone/`에 있습니다.

```text
$ ls board/beagleboard/beaglebone/
extlinux.conf
genimage.cfg
linux-sgx.fragment
patches
post-build.sh
readme.txt
rootfs_overlay
uEnv.txt
```

| 파일 | 역할 |
|---|---|
| `genimage.cfg` | SD 카드 이미지 레이아웃 (FAT boot 파티션 16M + ext4 rootfs 파티션 512M) |
| `post-build.sh` | rootfs 조립 직후 실행. 이 보드는 `uEnv.txt`와 `extlinux.conf`를 `BINARIES_DIR`로 복사 |
| `uEnv.txt`, `extlinux.conf` | U-Boot이 읽는 부팅 설정 |
| `patches/` | `BR2_GLOBAL_PATCH_DIR`이 가리키는 패치·hash 디렉터리 |
| `readme.txt` | 보드 설명과 빌드 방법 |

`board/`의 파일들은 `configs/<board>_defconfig`의 값으로 참조됩니다. 세 보드의 실제 참조를 defconfig에서 뽑았습니다.

| 보드 디렉터리 | defconfig가 참조하는 줄 |
|---|---|
| `board/qemu/aarch64-virt/` | `BR2_LINUX_KERNEL_CUSTOM_CONFIG_FILE="board/qemu/aarch64-virt/linux.config"` |
| `board/beagleboard/beaglebone/` | `BR2_ROOTFS_POST_BUILD_SCRIPT="board/beagleboard/beaglebone/post-build.sh"`, `BR2_ROOTFS_POST_SCRIPT_ARGS="-c board/beagleboard/beaglebone/genimage.cfg"` |
| `board/raspberrypi4-64/` | `BR2_ROOTFS_POST_IMAGE_SCRIPT="board/raspberrypi4-64/post-image.sh"` |

QEMU 디렉터리에는 `linux.config`와 `readme.txt` 두 파일만 있습니다. post-image 스크립트는 여러 QEMU 보드가 공유하는 `board/qemu/post-image.sh`를 씁니다. Ch 7에서 `BR2_ROOTFS_OVERLAY`, post-build, post-image hook을 상세히 다룹니다.

## configs/ — defconfig 카탈로그

`configs/`는 *그대로 시작점이 되는* defconfig 모음입니다. 한 파일이 한 보드(또는 한 시나리오)입니다.

```text
$ ls configs/ | wc -l
308
$ ls configs/qemu_* | wc -l
46
$ ls configs/beagle*
configs/beaglebone_defconfig
configs/beaglebone_qt5_defconfig
configs/beagleboneai_defconfig
configs/beagleboneai64_defconfig
configs/beagleplay_defconfig
configs/beaglev_fire_defconfig
configs/beagley_ai_defconfig
```

QEMU용만 46개입니다. `qemu_aarch64_virt_defconfig` 외에도 `qemu_riscv64_virt_defconfig`, `qemu_x86_64_defconfig`, `qemu_mips32r2_malta_defconfig`처럼 아키텍처마다 하나 이상 있어, 실 보드 없이 아키텍처별 빌드를 검증할 수 있습니다.

defconfig는 *기본값과 다른 옵션만* 담은 압축 형태이며, `make <name>_defconfig`로 `.config`에 풀어 넣습니다. `qemu_aarch64_virt_defconfig`는 18줄이고, 펼친 `.config`는 5,149줄입니다(Ch 3).

```text
$ make qemu_aarch64_virt_defconfig
...
#
# configuration written to /home/br/buildroot/.config
#
```

defconfig는 git에 커밋되는 가장 중요한 산출물 중 하나이며, Ch 3 후반에 `make savedefconfig`로 *내 defconfig*를 만드는 흐름을 설명합니다.

## fs/ — 파일시스템 이미지 생성기

`fs/`는 rootfs를 *어떤 형식*으로 패키징할지에 관한 코드입니다.

```text
$ ls fs/
btrfs      cloop      common.mk  Config.in  cpio       cramfs
erofs      ext2       f2fs       initramfs  iso9660    jffs2
oci        squashfs   tar        ubi        ubifs      yaffs2
```

서브디렉터리는 16개이고, 대부분 `Config.in`과 `<fs>.mk` 두 파일입니다(`cpio/`·`iso9660/`·`ubi/`에는 `dracut.conf`·`grub.cfg`·`ubinize.cfg` 같은 보조 파일이 더 있습니다).

```text
$ ls fs/ext2 fs/squashfs
fs/ext2:
Config.in  ext2.mk

fs/squashfs:
Config.in  squashfs.mk
```

`Config.in`이 `BR2_TARGET_ROOTFS_EXT2` 같은 옵션을, `.mk`가 이미지 생성 명령을 정의합니다. 예를 들어 `fs/ext2/ext2.mk` 31행은 `$(HOST_DIR)/sbin/mkfs.ext$(BR2_TARGET_ROOTFS_EXT2_GEN)`을 부릅니다. 입력은 `target/` 디렉터리를 fakeroot 안에서 복사한 트리이고, 출력은 `output/images/rootfs.<format>` 파일입니다.

| 포맷 | 용도 | 쓰기 가능 |
|---|---|---|
| `ext2` (ext2/3/4 변형 선택) | SD/eMMC rootfs | O |
| `squashfs` | 압축, 읽기 전용 | X |
| `erofs` | 압축, 읽기 전용 | X |
| `cpio` | initramfs 재료 | RAM 위에서만 |
| `tar` | 다른 도구의 입력 | 해당 없음 |
| `ubifs`·`ubi` | NAND flash | O |
| `jffs2` | NOR/NAND flash | O |

여러 포맷을 *동시에* 켜면 같은 rootfs가 여러 형식으로 출력됩니다. Ch 8에서 실제 크기를 비교합니다.

## output/ — 모든 산물의 종착지

`output/`은 빌드 산물이 들어가는 곳입니다. Buildroot 저장소의 `.gitignore` 첫 줄이 `/output*`이라, 본체 트리 안에서 빌드하면 git에 잡히지 않습니다. `qemu_aarch64_virt_defconfig` 빌드 직후 구조와 크기는 다음과 같습니다.

```text
$ ls output/
build  host  images  staging  target
$ du -sh output/build output/host output/images output/target
13G	output/build
1.1G	output/host
21M	output/images
4.4M	output/target
$ ls -la output/staging
lrwxrwxrwx 1 br br 66 Nov 16 03:07 output/staging -> /home/br/buildroot/output/host/aarch64-buildroot-linux-gnu/sysroot
```

| 경로 | 역할 |
|---|---|
| `build/` | 패키지별 빌드 디렉터리 (`busybox-1.37.0/`, `linux-6.18.7/` 등 70개)와 `build-time.log` |
| `host/` | host용 도구와 cross toolchain. `host/bin/`에 실행 파일 227개 |
| `host/bin/aarch64-buildroot-linux-gnu-*` | cross compiler·binutils |
| `staging/` | `host/<tuple>/sysroot`를 가리키는 symlink |
| `target/` | rootfs를 *조립 중*인 트리 |
| `images/` | 최종 산출물 (`Image`, `rootfs.ext2`, `start-qemu.sh`) |
| `per-package/` | `BR2_PER_PACKAGE_DIRECTORIES`를 켰을 때만 생김 |

`staging/`이 symlink인 이유는 매뉴얼 "Buildroot quick start"에 있습니다. "`staging/` is a symlink to the target toolchain sysroot inside `host/`, which exists for backwards compatibility." 같은 절은 `target/`에 대해 *직접 쓰지 말라*고 경고합니다. `/dev` 노드가 없고 권한도 맞지 않기 때문이며("it doesn't have the correct permissions (e.g. setuid for the busybox binary)"), 실제 `target/` 최상위에는 `THIS_IS_NOT_YOUR_ROOT_FILESYSTEM`이라는 파일이 들어 있습니다.

가장 자주 보는 두 곳은 다음입니다.

- **`output/build/<pkg>-<version>/`** — 해당 패키지의 압축 풀린 소스. 빌드 실패 디버깅 시 들어갑니다.
- **`output/images/`** — flash하거나 QEMU에 넘길 최종 산출물.

네 디렉터리의 역할을 한 장으로 정리하면 다음과 같습니다.

![output 디렉터리 4구역](/images/blog/buildroot/diagrams/chapter02-output-layout.svg)

`make clean`과 `make distclean`이 지우는 범위는 최상위 `Makefile` 1140~1151행에 있습니다.

```makefile
clean:
	rm -rf $(BASE_TARGET_DIR) $(BINARIES_DIR) $(HOST_DIR) $(HOST_DIR_SYMLINK) \
		$(BUILD_DIR) $(BASE_DIR)/staging \
		$(LEGAL_INFO_DIR) $(GRAPHS_DIR) $(PER_PACKAGE_DIR) $(O)/pkg-stats.*

.PHONY: distclean
distclean: clean
ifeq ($(O),$(CURDIR)/output)
	rm -rf $(O)
endif
	rm -rf $(TOPDIR)/dl $(BR2_CONFIG) $(CONFIG_DIR)/.config.old $(CONFIG_DIR)/..config.tmp \
		$(CONFIG_DIR)/.auto.deps $(BASE_DIR)/.br2-external.*
```

`distclean`은 설정 파일뿐 아니라 **트리 안의 `dl/`까지 지웁니다**(`rm -rf $(TOPDIR)/dl`). `BR2_DL_DIR`을 트리 밖으로 빼 두지 않았다면 `distclean` 한 번에 1.2 GB 다운로드를 다시 해야 합니다. ccache 디렉터리는 기본값이 `$(HOME)/.buildroot-ccache`라 둘 다 건드리지 않습니다.

## dl/ — 다운로드 캐시

`dl/`은 *다운로드받은 source*의 캐시입니다. 패키지마다 하위 디렉터리를 가집니다.

```text
$ ls dl/busybox dl/linux
dl/busybox:
busybox-1.37.0.tar.bz2

dl/linux:
linux-6.18.7.tar.xz
$ du -sh dl
1.2G	dl
```

QEMU defconfig 하나로 47개 디렉터리, 1.2 GB가 쌓였습니다. 그중 631 MB가 `dl/glibc`입니다. 이 릴리스의 glibc는 git 커밋으로 지정돼 있어 저장소째 받기 때문입니다.

매뉴얼 "Location of downloaded packages" 절은 여러 트리가 `dl/`을 공유하는 방법으로 환경 변수를 권합니다. 이 변수는 `.config`의 값을 덮어씁니다("Unlike most options in the .config file, this value is overridden by the `BR2_DL_DIR` environment variable").

```bash
export BR2_DL_DIR=/mnt/shared/buildroot-dl
```

회사 망 안쪽에서 외부 인터넷 접근이 제한된다면 `BR2_PRIMARY_SITE`로 *사내 미러*를 먼저 시도하게 할 수 있습니다.

```text
BR2_PRIMARY_SITE="https://mirror.corp.example.com/buildroot"
BR2_PRIMARY_SITE_ONLY=y
```

`Config.in`의 help에 따르면 `BR2_PRIMARY_SITE`는 wget이 아는 URI, `file://` 절대 경로, `scp://`를 받습니다. `BR2_PRIMARY_SITE_ONLY`를 켜면 다른 위치는 시도하지 않고, help는 그 용도를 "ensure that the project can be built even if the upstream tarball locations disappear"라고 적습니다.

## 보조 디렉터리들

핵심 6개 외에도 몇 군데는 알아두면 좋습니다.

- **`linux/`** — 커널 빌드 인프라(`linux.mk`)와 RTAI·Xenomai 확장(`linux-ext-*.mk`). 커널은 `package/`가 아니라 여기에 따로 있습니다.
- **`boot/`** — U-Boot, Barebox, GRUB2, syslinux, edk2, OpenSBI, ARM Trusted Firmware, OP-TEE OS 등 21개 디렉터리. 각자 `Config.in`과 `.mk`를 가집니다.
- **`toolchain/`** — toolchain을 직접 빌드할지(`toolchain-buildroot/`), 외부 toolchain을 가져올지(`toolchain-external/`)를 결정하는 코드.
- **`arch/`** — `Config.in.<arch>` 파일들. 각 architecture별 CPU 변형, ABI 옵션.
- **`system/`** — `skeleton/`(rootfs의 `dev`·`etc`·`usr` 등 기본 디렉터리), `device_table.txt`, `system.mk`.
- **`support/`** — 호스트 측 도구. `support/kconfig/`에 menuconfig 소스와 `merge_config.sh`, `support/scripts/`에 `genimage.sh`·`br2-external` 같은 스크립트가 있습니다.
- **`utils/`** — `check-package`, `scancpan`, `scanpypi`, `genrandconfig`, `generate-cyclonedx`, `docker-run` 같은 도구.

## 한 번에 보는 빌드 흐름 — 어디서 어디로

위 디렉터리 사이를 데이터가 흐르는 순서는 다음과 같습니다.

1. `configs/<board>_defconfig` → `make <board>_defconfig` → `.config`
2. `.config`가 고른 패키지마다 `dl/<pkg>/`에 소스가 없으면 다운로드하고 hash를 검증
3. `output/build/<pkg>-<ver>/`에 압축 해제 + 패치 적용 → configure·build
4. 라이브러리는 `staging/`(= `host/<tuple>/sysroot`)에, 실행 파일은 `output/target/`에 설치
5. `fs/<format>/`의 명령이 fakeroot 안에서 `target/` 복사본으로 `output/images/rootfs.<format>` 생성
6. 커널 `Image`(`linux/`), 부트로더(`boot/`), post-image 스크립트(`board/`)의 산출물이 `output/images/`에 모임

같은 흐름을 그림으로 보면 다음과 같습니다.

![Buildroot 빌드 데이터 흐름](/images/blog/buildroot/diagrams/chapter02-build-flow.svg)

이 흐름이 머릿속에 들어가면 빌드가 어디서 실패해도 *어느 디렉터리를 봐야 하는지* 짚을 수 있습니다. 다운로드 실패는 `dl/`, 컴파일 실패는 `output/build/<pkg>/`, 이미지 크기 초과는 `fs/`의 옵션입니다.

## 자주 하는 실수

- **`output/`을 별도 저장소에 커밋합니다.** 본체 트리의 `.gitignore`는 `/output*`과 `/dl`을 이미 제외하지만, 외부 트리(Ch 6)를 따로 관리하면서 `O=`로 그 안에 output을 두면 직접 제외해야 합니다. 위 빌드의 `output/`은 14 GB였습니다.
- **`buildroot/` 본체에 직접 패치를 쌓습니다.** 업그레이드 때 충돌이 납니다. 자신의 패키지·보드는 `BR2_EXTERNAL` 트리에 따로 두는 것이 공식 방법입니다. Ch 6에서 다룹니다.
- **`dl/`을 트리 안에 둔 채 `distclean`을 습관처럼 칩니다.** 위 `Makefile`대로 `dl/`이 같이 지워집니다. `BR2_DL_DIR`을 트리 밖으로 뺍니다.
- **`output/build/<pkg>/`를 손으로 수정합니다.** `make <pkg>-dirclean`이나 `make clean`이 디렉터리를 지우고 다시 풉니다. 변경은 `package/<pkg>/NNNN-*.patch`나 `BR2_GLOBAL_PATCH_DIR`의 패치로 남겨야 영구적입니다.

## 정리

- Buildroot의 핵심은 6개 디렉터리, `package/`·`board/`·`configs/`·`fs/`·`output/`·`dl/`입니다.
- 2026.02.3의 `package/`는 2,941개 디렉터리, `configs/`는 308개 defconfig(QEMU용 46개), `fs/`는 16개 포맷입니다.
- `board/`는 defconfig가 참조하는 보드별 자산입니다. BeagleBone은 `board/beagleboard/beaglebone/`에 있습니다.
- `output/`은 QEMU 빌드에서 14 GB였고 그중 13 GB가 `build/`입니다. `staging/`은 sysroot를 가리키는 symlink입니다.
- `output/target/`은 권한과 `/dev`가 맞지 않으니 직접 쓰지 않고, `output/images/`의 이미지를 씁니다.
- `make distclean`은 트리 안의 `dl/`까지 지웁니다. `BR2_DL_DIR`을 밖으로 빼거나 환경 변수로 공유합니다.
- 본체 디렉터리에 직접 수정·패치를 쌓지 말고, 변경은 패치 파일 또는 `BR2_EXTERNAL`로 분리합니다.

## 다음 장 예고

다음 편은 **Ch 3: Kconfig 설정 — menuconfig와 defconfig**. `make menuconfig`의 최상위 메뉴 10개를 한 번에 둘러봅니다.


## 관련 항목

- [Ch 1: Buildroot가 푸는 문제 — Yocto와의 비교](/blog/embedded/buildroot/chapter01-problem)
- [Ch 3: Kconfig 설정 — menuconfig와 defconfig](/blog/embedded/buildroot/chapter03-kconfig)
- [Ch 5: 패키지 시스템 — .mk와 Config.in](/blog/embedded/buildroot/chapter05-package-system)
- [Ch 6: 외부 트리 — BR2_EXTERNAL](/blog/embedded/buildroot/chapter06-br2-external)
- [Ch 7: 보드 customize — overlay, post-build, post-image](/blog/embedded/buildroot/chapter07-board-customize)
- [Buildroot Manual — "Buildroot quick start" 절 (output 디렉터리 설명)](https://buildroot.org/downloads/manual/manual.html)
