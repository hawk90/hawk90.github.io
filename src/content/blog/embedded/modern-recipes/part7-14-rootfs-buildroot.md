---
title: "루트 파일시스템 구축 — Buildroot 기초·Package·Toolchain"
slug: "embedded/modern-recipes/part7-14-rootfs-buildroot"
date: 2026-04-16T09:13:00
description: "Buildroot 2026.08로 QEMU arm64 rootfs를 빌드하고 custom package, overlay, post-build script, savedefconfig, toolchain·init 선택을 실제 빌드로 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 88
tags: [recipes, linux, buildroot, rootfs]
topics: ["embedded"]
---

## 한 줄 요약

> **"Buildroot는 `make` 한 번으로 cross toolchain, kernel, rootfs image를 만드는 빌드 시스템입니다."** 이 글은 Buildroot 2026.08의 `qemu_aarch64_virt_defconfig`에 custom package 하나, overlay, post-build script를 붙여 빌드하고, 만든 image를 QEMU로 부팅해 세 가지가 rootfs에 들어갔는지 확인합니다.

## 어떤 상황에서 쓰나

보드 하나에 필요한 toolchain, kernel, BusyBox 기반 rootfs를 한 저장소의 설정 파일 하나로 재현하고 싶을 때 씁니다. 아래 빌드에서 defconfig 파일 하나(19줄)가 toolchain, kernel 버전과 설정 파일, rootfs 형식, 추가 package, overlay와 hook 경로를 모두 담았고, 그 파일에서 다시 만든 `.config`는 원래 것과 `BR2_DEFCONFIG` 경로 한 줄만 달랐습니다.

Yocto와의 선택은 이 글에서 다루지 않습니다. 두 도구를 같은 조건으로 빌드해 비교하지 않았기 때문입니다. 옮겨 갈 때의 개념 대응은 [Buildroot → Yocto 마이그레이션](/blog/embedded/buildroot/chapter20-yocto-migration)에 있습니다.

## 핵심 개념

Buildroot 소스 트리에서 이 글이 만지는 곳은 다음과 같습니다.

| 경로 | 내용 | 이 글의 빌드에서 |
|------|------|------|
| `configs/<이름>_defconfig` | board별 기본 설정 | `qemu_aarch64_virt_defconfig`에서 시작해 `myboard_defconfig`로 저장 |
| `package/<이름>/` | package마다 `Config.in`과 `<이름>.mk` | 2026.08 트리에 `.mk` 파일이 2,971개(`ls package/*/*.mk`), 여기에 `myapp` 추가 |
| `board/<회사>/<보드>/` | overlay, hook script | `board/vendor/myboard/` |
| `output/images/` | kernel, rootfs image | `Image`(13,302,272 B), `rootfs.ext2`(60 MiB) |
| `output/target/` | image로 묶기 전의 rootfs 디렉터리 | 4.6 MB |
| `output/host/` | cross toolchain과 host 도구 | 607 MB |

`make`는 package를 순서대로 download → extract → patch → configure → build → install하고, target 디렉터리에 overlay를 복사하고 post-build script를 부른 뒤 filesystem image를 만들고 post-image script를 부릅니다. 아래 빌드 로그의 마지막 단계들이 그 순서대로 찍힙니다.

## 코드 / 실제 사용 예

재현 환경은 다음과 같습니다.

- 빌드: Debian 13.7 arm64 VM(QEMU `-accel hvf`, vCPU 6개, RAM 8 GiB, Apple M2 Pro host), GNU Make 4.4.1
- Buildroot: `https://github.com/buildroot/buildroot.git`의 태그 `2026.08`(commit `d5180309`)
- 부팅: macOS의 QEMU 11.1.3 `qemu-system-aarch64`

### Custom package — myapp

package는 `Config.in`(menuconfig에 보일 항목)과 `myapp.mk`(받고 빌드하고 설치하는 규칙) 두 파일입니다. 소스는 로컬 디렉터리에서 가져오도록 `MYAPP_SITE_METHOD = local`을 썼습니다.

```text
# package/myapp/Config.in
config BR2_PACKAGE_MYAPP
	bool "myapp"
	help
	  My custom application.
```

```makefile
# package/myapp/myapp.mk
MYAPP_VERSION = 1.0
MYAPP_SITE = /root/myapp-src
MYAPP_SITE_METHOD = local
MYAPP_LICENSE = MIT

define MYAPP_BUILD_CMDS
	$(MAKE) CC="$(TARGET_CC)" -C $(@D)
endef

define MYAPP_INSTALL_TARGET_CMDS
	$(INSTALL) -D -m 0755 $(@D)/myapp $(TARGET_DIR)/usr/bin/myapp
endef

$(eval $(generic-package))
```

```c
/* /root/myapp-src/myapp.c */
#include <stdio.h>
int main(void) { puts("myapp: hello from a Buildroot package"); return 0; }
```

```makefile
# /root/myapp-src/Makefile
myapp: myapp.c
	$(CC) $(CFLAGS) -o $@ $<
```

`Config.in`을 menuconfig에 보이게 하려면 `package/Config.in`의 메뉴 하나에 `source` 줄을 넣습니다. 이 빌드에서는 `menu "Miscellaneous"` 첫 줄에 넣었습니다.

```text
menu "Miscellaneous"
	source "package/myapp/Config.in"
```

### Overlay와 post-build script

```text
board/vendor/myboard/
├── overlay/etc/init.d/S99myapp     # mode 644 in the source tree
└── post-build.sh                   # mode 755
```

```sh
#!/bin/sh
# board/vendor/myboard/overlay/etc/init.d/S99myapp
case "$1" in
  start) /usr/bin/myapp; cat /etc/board_info ;;
esac
```

```sh
#!/bin/sh
# board/vendor/myboard/post-build.sh
TARGET_DIR=$1
echo "myboard v1.0" > $TARGET_DIR/etc/board_info
chmod 755 $TARGET_DIR/etc/init.d/S99myapp
```

Buildroot 매뉴얼은 post-build script에 "The path to the target filesystem is passed as the first argument"라고 적고, 스크립트는 Buildroot 트리를 현재 디렉터리로 해서 돕니다(`docs/manual/customize-rootfs.adoc` 57–62행). 그래서 `$1`이 `output/target`입니다. overlay의 `S99myapp`은 일부러 mode 644로 두었습니다. 그 이유는 "자주 보는 함정"에서 봅니다.

### 설정과 빌드

`qemu_aarch64_virt_defconfig`에서 시작해 menuconfig로 세 가지를 바꿨습니다. Target packages → Miscellaneous에서 `myapp`을 켜고, System configuration에서 Root filesystem overlay directories와 Custom scripts to run before creating filesystem images를 위 경로로 정했습니다. 그리고 Host utilities의 host qemu를 껐습니다. 이 defconfig는 `BR2_PACKAGE_HOST_QEMU=y`로 QEMU까지 빌드하지만(`configs/qemu_aarch64_virt_defconfig` 17행), 부팅은 Mac의 QEMU로 했기 때문입니다. 바꾼 설정은 `savedefconfig`로 파일에 남깁니다.

```bash
make qemu_aarch64_virt_defconfig
make menuconfig
make savedefconfig BR2_DEFCONFIG=configs/myboard_defconfig
```

```text
$ cat configs/myboard_defconfig
BR2_aarch64=y
BR2_PACKAGE_HOST_LINUX_HEADERS_CUSTOM_6_18=y
BR2_GLOBAL_PATCH_DIR="board/qemu/patches"
BR2_DOWNLOAD_FORCE_CHECK_HASHES=y
BR2_SYSTEM_DHCP="eth0"
BR2_ROOTFS_OVERLAY="board/vendor/myboard/overlay"
BR2_ROOTFS_POST_BUILD_SCRIPT="board/vendor/myboard/post-build.sh"
BR2_ROOTFS_POST_IMAGE_SCRIPT="board/qemu/post-image.sh"
BR2_ROOTFS_POST_SCRIPT_ARGS="$(BR2_DEFCONFIG)"
BR2_LINUX_KERNEL=y
BR2_LINUX_KERNEL_CUSTOM_VERSION=y
BR2_LINUX_KERNEL_CUSTOM_VERSION_VALUE="6.18.7"
BR2_LINUX_KERNEL_USE_CUSTOM_CONFIG=y
BR2_LINUX_KERNEL_CUSTOM_CONFIG_FILE="board/qemu/aarch64-virt/linux.config"
BR2_LINUX_KERNEL_NEEDS_HOST_OPENSSL=y
BR2_PACKAGE_MYAPP=y
BR2_TARGET_ROOTFS_EXT2=y
BR2_TARGET_ROOTFS_EXT2_4=y
# BR2_TARGET_ROOTFS_TAR is not set
```

Toolchain 메뉴에서 온 줄은 kernel headers 버전(`BR2_PACKAGE_HOST_LINUX_HEADERS_CUSTOM_6_18`) 하나뿐입니다. toolchain 종류와 C library는 기본값(Buildroot toolchain, glibc)을 그대로 써서 적히지 않았습니다. savedefconfig는 기본값과 다른 항목만 적습니다. 이 파일을 다른 output 디렉터리에서 `make O=/root/brtest myboard_defconfig`로 풀어 `.config`를 비교했더니 `BR2_DEFCONFIG` 경로 한 줄만 달랐습니다. 이 파일을 commit해 두면 다른 사람이 `make myboard_defconfig && make`로 같은 설정을 얻습니다.

빈 output에서 `time make`를 돌린 결과입니다(소스 download 포함, `>>>` 줄만 발췌).

```text
$ time make
>>> host-skeleton  Extracting
...
>>>   Copying overlay board/vendor/myboard/overlay
>>>   Executing post-build script board/vendor/myboard/post-build.sh
...
>>>   Generating root filesystems common tables
...
>>>   Generating filesystem image rootfs.ext2
...
>>>   Executing post-image script board/qemu/post-image.sh
...
real	27m54.999s
user	76m27.831s
sys	5m51.190s
$ ls -l output/images/
-rw-r--r-- 1 root root 13302272 Nov 16 15:21 Image
-rw-r--r-- 1 root root 62914560 Nov 16 15:21 rootfs.ext2
lrwxrwxrwx 1 root root       11 Nov 16 15:21 rootfs.ext4 -> rootfs.ext2
-rwxr-xr-x 1 root root      809 Nov 16 15:21 start-qemu.sh
```

Buildroot가 남기는 `output/build/build-time.log`를 단계별로 더하면 build 796초, download 581초, configure 185초였고, package로는 host-cmake 450초, glibc 211초, host-gcc-final 196초, host-gcc-initial 176초, linux 128초, busybox 100초 순이었습니다. 가장 오래 걸린 host-cmake는 defconfig에 적지 않은 host 도구입니다. 받은 소스는 `dl/`(1.1 GB)에 남습니다.

### QEMU로 부팅해 확인

`board/qemu/aarch64-virt/readme.txt`의 명령에서 경로와 image 이름(`rootfs.ext4` 대신 symlink 대상 `rootfs.ext2`)만 바꿔 Mac에서 띄웠습니다.

```bash
qemu-system-aarch64 -M virt -cpu cortex-a53 -nographic -smp 1 -kernel Image \
  -append "rootwait root=/dev/vda console=ttyAMA0" \
  -netdev user,id=eth0 -device virtio-net-device,netdev=eth0 \
  -drive file=rootfs.ext2,if=none,format=raw,id=hd0 -device virtio-blk-device,drive=hd0
```

```text
Linux version 6.18.7 (root@localhost) (aarch64-buildroot-linux-gnu-gcc.br_real (Buildroot 2026.08-dirty) 15.3.0, GNU ld (GNU Binutils) 2.45.1) #1 SMP Mon Nov 16 15:21:33 UTC 2026
...
Run /sbin/init as init process
...
Starting crond: OK
myapp: hello from a Buildroot package
myboard v1.0

Welcome to Buildroot
buildroot login: root
# ls -l /usr/bin/myapp /etc/init.d/S99myapp /etc/board_info
-rw-r--r--    1 root     root            13 Nov 16 15:21 /etc/board_info
-rwxr-xr-x    1 root     root            76 Nov 16 14:52 /etc/init.d/S99myapp
-rwxr-xr-x    1 root     root          5920 Nov 16 15:21 /usr/bin/myapp
# cat /proc/1/comm
init
# ls /etc/init.d
S01seedrng  S02klogd    S11modules  S50crond    rcK
S01syslogd  S02sysctl   S40network  S99myapp    rcS
# df -h /
Filesystem                Size      Used Available Use% Mounted on
/dev/root                51.1M      4.3M     42.6M   9% /
# free -m
              total        used        free      shared  buff/cache   available
Mem:            112          10          98           0           4          98
Swap:             0           0           0
```

세 가지가 모두 들어갔습니다. package가 설치한 `/usr/bin/myapp`이 있고, overlay의 `S99myapp`은 BusyBox init의 `rcS`가 부팅 끝에 실행해 `myapp`의 출력과 post-build가 만든 `/etc/board_info`를 찍었습니다. 60 MiB ext4 image 중 사용량은 4.3 MB였습니다. 커널 버전 문자열의 `-dirty`는 Buildroot git 트리에서 추적되는 파일 `package/Config.in`에 `source` 줄을 넣고 commit하지 않았기 때문입니다. `support/scripts/setlocalversion`은 `git diff-index`로 추적 파일의 변경만 보므로(41–43행), 새로 만든 `package/myapp`과 `board/vendor`는 `-dirty`에 영향을 주지 않습니다.

### 한 package만 다시 빌드

`myapp.c`를 고친 뒤에는 그 package만 다시 빌드합니다. 아래는 `touch /root/myapp-src/myapp.c`로 소스를 바꾼 것으로 만든 뒤 잰 결과입니다(`>>>`·컴파일 줄과 시간만 발췌). 매뉴얼은 `<package>-rebuild`가 root filesystem image를 다시 만들지 않는다("do not trigger re-creating the root filesystem image")고 하고, image가 필요하면 `make`를 한 번 더 돌리라고 적습니다(`docs/manual/rebuilding-packages.adoc` 121–125행).

```text
$ time make myapp-rebuild
>>> myapp 1.0 Syncing from source dir /root/myapp-src
>>> myapp 1.0 Building
/usr/bin/make -j7 CC="/root/br/output/host/bin/aarch64-buildroot-linux-gnu-gcc" -C /root/br/output/build/myapp-1.0
/root/br/output/host/bin/aarch64-buildroot-linux-gnu-gcc  -o myapp myapp.c
>>> myapp 1.0 Installing to target
real	0m6.557s
$ time make
>>>   Finalizing host directory
>>>   Finalizing target directory
>>>   Sanitizing RPATH in target tree
>>>   Sanity check in overlays board/vendor/myboard/overlay
>>>   Copying overlay board/vendor/myboard/overlay
>>>   Executing post-build script board/vendor/myboard/post-build.sh
>>>   Generating root filesystems common tables
>>>   Generating filesystem image rootfs.ext2
>>>   Executing post-image script board/qemu/post-image.sh
real	0m6.817s
```

두 번째 `make`는 package를 다시 빌드하지 않고 target 디렉터리 마무리(finalize)부터 image 생성까지만 다시 했습니다. overlay 복사와 post-build는 `make`를 돌릴 때마다 한 번씩 다시 돕니다.

### Toolchain과 C library

menuconfig의 Toolchain → Toolchain type은 두 가지입니다(`toolchain/Config.in`).

| Toolchain type | 내용 |
|----------------|------|
| Buildroot toolchain | binutils·gcc·C library를 소스부터 빌드합니다. 위 빌드가 이것이고, gcc 15.3.0과 glibc로 만들어졌습니다 |
| External toolchain | "Buildroot can either download automatically a toolchain, or use an already installed toolchain"(같은 파일의 help) |

Buildroot toolchain에서 고를 수 있는 C library는 uClibc-ng, glibc, musl 세 가지입니다(`toolchain/toolchain-buildroot/Config.in`). 위 빌드 시간 중 host-gcc-initial·host-gcc-final·glibc가 합해 582초였으므로, external toolchain을 쓰면 이 부분이 빠집니다. 다만 external toolchain으로 같은 설정을 빌드해 재지는 않았습니다. 두 방식의 차이는 [Buildroot Toolchain 선택](/blog/embedded/buildroot/chapter11-toolchain)에서 다룹니다.

### Init 시스템

System configuration → Init system의 선택지는 BusyBox, systemV, OpenRC, systemd, catatonit, tini, tiny init, Custom (none) 여덟 가지이고 기본값은 BusyBox입니다(`system/Config.in` 86–194행). 위 부팅의 `/proc/1/comm`이 `init`이고 `/etc/init.d/rcS`가 `S??*` script를 번호 순서로 실행한 것이 BusyBox init 구성입니다. systemd와 BusyBox init의 크기나 부팅 시간은 이 글에서 재지 않았습니다.

### Reproducible build

`BR2_REPRODUCIBLE`의 menuconfig 항목 이름은 "Make the build reproducible (experimental)"입니다. help는 같은 설정에서 "exactly identical binaries"를 만드는 것이 목표라고 적습니다. 다만 지금 구현은 "restricted to builds with the same output directory"이고, "not all packages behave properly to ensure reproducibility"여서 experimental로 둔다고 덧붙입니다(`Config.in` 770–787행). 같은 결과가 나오는지는 같은 `O=` 경로에서 두 번 빌드해 image를 비교해야 알 수 있고, 이 글은 그 비교를 하지 않았습니다.

## 측정 / 성능 비교

이 글의 빌드 하나에서 잰 숫자를 모읍니다. 조건은 위 재현 환경(Debian 13 arm64 VM, vCPU 6개)입니다.

| 항목 | 값 |
|------|------|
| 빈 output에서 첫 `make` (download 포함) | 27분 55초 (user 76분 28초) |
| 그중 download 단계 합 | 581초 |
| `make myapp-rebuild` (소스 `touch` 뒤) | 6.6초 |
| 이어서 image 다시 만들기(`make`) | 6.8초 |
| `output/host` | 607 MB |
| `output/build` | 11 GB |
| `dl/` | 1.1 GB |
| `rootfs.ext2` / 그 안의 사용량 | 60 MiB / 4.3 MB |
| kernel `Image` | 13,302,272 B |
| 부팅 직후 `free -m` (`-m` 지정 없음) | total 112, used 10 |

`output/build` 11 GB 중 큰 것은 `linux-6.18.7` 2.0 GB, `linux-headers-6.18.7` 1.7 GB, `host-gcc-initial`과 `host-gcc-final` 각 1.5 GB였습니다. 빌드 머신의 디스크 용량은 이 디렉터리 크기를 기준으로 잡습니다.

## 자주 보는 함정

> ⚠️ host 도구 누락

Debian 13 기본 설치에서 첫 `make`는 바로 멈췄습니다.

```text
You must install 'wget' on your build machine
You must install 'unzip' on your build machine
make: *** [support/dependencies/dependencies.mk:27: dependencies] Error 1
```

`support/dependencies/dependencies.sh`가 빌드 전에 host 도구를 검사한 결과입니다. 이 경우는 `apt install wget unzip` 뒤 다시 `make`하면 됩니다. CI에서는 이 목록을 빌드 이미지에 미리 넣어 둡니다.

> ⚠️ overlay 파일의 실행 권한

overlay는 `system/system.mk`의 `SYSTEM_RSYNC`로 복사되고, 그 옵션은 `rsync -a --ignore-times ... --chmod=u=rwX,go=rX`입니다. 대문자 `X`는 원본에 실행 권한이 있을 때만 실행 권한을 줍니다. 같은 옵션으로 직접 복사해 봤습니다.

```text
$ chmod 644 s/a; chmod 755 s/b
$ rsync -a --ignore-times --chmod=u=rwX,go=rX s/ d/; ls -l d
total 8
-rw-r--r-- 1 root root 1 Nov 16 15:23 a
-rwxr-xr-x 1 root root 1 Nov 16 15:23 b
```

그래서 overlay에 mode 644로 둔 `S99myapp`은 그대로 복사됐다면 실행되지 않았을 것이고, 위 빌드에서는 post-build의 `chmod 755`가 이를 755로 바꿨습니다. git은 실행 비트를 기록합니다(이 트리의 `board/qemu/post-image.sh`는 `git ls-files -s`로 mode `100755`). 실행 비트가 빠지는 것은 파일을 만들 때 `chmod +x`를 하지 않았거나, 실행 비트를 보존하지 못하는 filesystem에서 파일을 만들어 commit했을 때입니다. 쓰기 권한 같은 다른 mode는 overlay로 보존되지 않으므로 device table로 정합니다. 그 실험은 [Buildroot 보드 Customize](/blog/embedded/buildroot/chapter07-board-customize)에 있습니다.

> ⚠️ toolchain 설정을 바꾼 뒤 부분 rebuild

매뉴얼은 "When the toolchain configuration is changed, a complete rebuild generally is needed"라고 적습니다(`docs/manual/rebuilding-packages.adoc` 24–28행). compiler 버전이나 C library를 바꾼 뒤 `<package>-rebuild`만 하면 이미 빌드된 다른 package는 옛 toolchain으로 만든 그대로 남습니다. `make clean all`로 처음부터 다시 빌드합니다.

> ⚠️ 나중에 켠 library를 기존 package가 쓰지 않음

같은 문서는 library package를 새로 켜면 그 package는 빌드하지만, 그 library를 선택적으로 쓸 수 있는 이미 빌드된 package는 다시 빌드하지 않는다고 적고 `ctorrent`와 `openssl`을 예로 듭니다(30–44행). 해당 package를 `-rebuild`(설정이 바뀌어야 하면 `-reconfigure`)하거나 전체를 다시 빌드합니다.

> ⚠️ download 경로

`BR2_DL_DIR`의 기본값은 `$(TOPDIR)/dl`이고, 같은 이름의 환경 변수가 있으면 그 값이 설정을 덮어씁니다(`Config.in` 237–249행). 여러 Buildroot 트리나 CI job이 소스를 한 번만 받게 하려면 이 경로를 공유합니다.

## 정리

- Buildroot 2026.08 `qemu_aarch64_virt_defconfig`에 package 하나, overlay, post-build를 더한 빌드는 이 VM에서 28분, `rootfs.ext2` 안의 사용량은 4.3 MB였습니다.
- custom package는 `Config.in`과 `<이름>.mk` 두 파일이고, `package/Config.in`에 `source` 줄을 넣어야 menuconfig에 보입니다.
- post-build script의 첫 인자가 target 디렉터리입니다. overlay 복사와 post-build는 `make`를 돌릴 때마다 다시 돕니다.
- overlay는 원본 파일의 실행 비트를 따르므로, 실행할 파일은 원본에서 `+x`를 주거나 post-build에서 `chmod`합니다.
- `savedefconfig`로 남긴 파일 하나에서 같은 `.config`가 다시 나왔습니다. 이 파일을 commit합니다.
- `<package>-rebuild`는 image를 다시 만들지 않습니다. toolchain 설정을 바꿨으면 전체를 다시 빌드합니다.

다음 편부터 Part 8로 넘어가 [임베디드 동적 메모리](/blog/embedded/modern-recipes/part8-01-dynamic-memory)를 다룹니다.

## 관련 항목

- [7-01: Linux 부팅 흐름](/blog/embedded/modern-recipes/part7-01-linux-boot-flow)
- [7-02: U-Boot 활용](/blog/embedded/modern-recipes/part7-02-uboot-usage)
- [7-05: 커널 빌드](/blog/embedded/modern-recipes/part7-05-kernel-build)
- [7-06: Kernel Module 기초](/blog/embedded/modern-recipes/part7-06-kernel-module)
- [Buildroot 첫 빌드 — QEMU에서 동작하는 시스템 만들기](/blog/embedded/buildroot/chapter04-first-build)
- [Buildroot 보드 Customize — overlay·post-build·post-image 흐름](/blog/embedded/buildroot/chapter07-board-customize)
