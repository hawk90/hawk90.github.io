---
title: "Buildroot 첫 빌드 — QEMU에서 동작하는 시스템 만들기"
slug: "embedded/buildroot/chapter04-first-build"
date: 2026-05-19T09:04:00
description: "qemu_aarch64_virt_defconfig로 첫 시스템을 빌드하고 QEMU에서 부팅하는 전체 흐름."
series: "Buildroot Practical"
seriesOrder: 4
tags: [embedded, buildroot, qemu, first-build]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"`git clone` → `make defconfig` → `make` → `start-qemu.sh`."** — 네 명령으로 부팅 가능한 AArch64 시스템이 완성됩니다.

## 왜 QEMU부터 시작하는가

새 보드를 손에 받기 전, toolchain만 검증하고 싶다거나 rootfs 구성만 확인하고 싶을 때가 있습니다. 이럴 때 QEMU는 사실상 무료 보드입니다. 부팅 실패도 자유롭게 반복할 수 있고, 빌드와 실행을 한 머신에서 끝낼 수 있습니다. 운전 연수를 도로가 아니라 주차장에서 먼저 하는 것과 같습니다.

이 장에서는 `qemu_aarch64_virt_defconfig` 하나만 가지고 처음부터 끝까지 한 사이클을 돌립니다. 아래 출력은 모두 **Buildroot 2026.02.3**으로 실제 실행한 결과입니다. 빌드는 Apple M2 Pro 위 QEMU(HVF 가속)로 띄운 Debian 13 arm64 VM(vCPU 10개, RAM 12 GB)에서, 부팅은 macOS의 QEMU 11.1.3에서 했습니다.

## 사전 준비 — 호스트 패키지

Buildroot 매뉴얼 "System requirements"의 *Mandatory packages*는 다음과 같습니다.

- 빌드 도구: `which`, `sed`, `make`(3.81 이상), `binutils`, `build-essential`(Debian 계열), `diffutils`, `gcc`·`g++`(4.8 이상), `bash`, `patch`, `gzip`, `bzip2`, `perl`(5.8.7 이상), `tar`, `cpio`, `unzip`, `rsync`, `file`(`/usr/bin/file`), `bc`, `findutils`, `awk`
- 소스 받기: `wget`

이 장의 VM에서는 다음 명령으로 설치했습니다. `git`은 git으로 받는 패키지(이 릴리스의 glibc가 그렇습니다)에, `libncurses-dev`는 `make menuconfig`에, `python3`는 매뉴얼이 "highly recommended"로 분류한 legal-info·graph 도구에 필요합니다.

```bash
sudo apt-get install -y build-essential sed make binutils diffutils gcc g++ \
    bash patch gzip bzip2 perl tar cpio unzip rsync file bc findutils wget \
    git python3 libncurses-dev
```

QEMU는 따로 깔지 않아도 됩니다. 이 defconfig가 `BR2_PACKAGE_HOST_QEMU=y`로 host용 QEMU를 같이 빌드하고, `start-qemu.sh`가 그것을 씁니다. 매뉴얼은 또 "you can and should *build everything as a normal user*"라고 적습니다. root로 빌드할 이유가 없습니다.

## 클론 — 안정 릴리스 vs master

매뉴얼 "Release Engineering"에 따르면 Buildroot는 분기마다 릴리스(`.02`, `.05`, `.08`, `.11`)를 내고 매달 bugfix 릴리스를 붙이며, "The first release of each year is a long term support release"입니다. LTS는 *다음 LTS의 첫 bugfix 릴리스*까지 지원되므로, 2026.02.1이 나온 지금 LTS 계열은 2026.02.x입니다. 재현성을 위해 브랜치가 아니라 정확한 태그를 고정합니다.

```text
$ git clone --depth=1 --branch 2026.02.3 https://gitlab.com/buildroot.org/buildroot.git
$ cd buildroot
$ git log -1 --oneline
679b9ead Makefile: Update for 2026.02.3
```

`--depth=1`은 얕은 클론입니다. 패키지 패치를 상류에 보낼 계획이라면 전체 clone 후 같은 태그를 checkout합니다.

## defconfig 적용

QEMU AArch64 virt를 위한 defconfig는 트리에 이미 포함돼 있습니다.

```text
$ make qemu_aarch64_virt_defconfig
...
#
# configuration written to /home/br/buildroot/.config
#
```

이 명령이 전체 빌드 계획을 결정합니다. 18줄짜리 defconfig가 5,149줄 `.config`로 펼쳐집니다(Ch 3). defconfig 원문의 핵심 줄은 다음과 같습니다.

```makefile
BR2_aarch64=y
BR2_PACKAGE_HOST_LINUX_HEADERS_CUSTOM_6_18=y
BR2_GLOBAL_PATCH_DIR="board/qemu/patches"
BR2_ROOTFS_POST_IMAGE_SCRIPT="board/qemu/post-image.sh"
BR2_LINUX_KERNEL=y
BR2_LINUX_KERNEL_CUSTOM_VERSION=y
BR2_LINUX_KERNEL_CUSTOM_VERSION_VALUE="6.18.7"
BR2_LINUX_KERNEL_USE_CUSTOM_CONFIG=y
BR2_LINUX_KERNEL_CUSTOM_CONFIG_FILE="board/qemu/aarch64-virt/linux.config"
BR2_TARGET_ROOTFS_EXT2=y
BR2_TARGET_ROOTFS_EXT2_4=y
BR2_PACKAGE_HOST_QEMU=y
BR2_PACKAGE_HOST_QEMU_SYSTEM_MODE=y
```

한 문장으로 요약하면 *"AArch64(기본 CPU cortex-a53), Buildroot가 빌드하는 glibc toolchain, Linux 6.18.7(보드 디렉터리의 커널 config), ext4 rootfs, host용 QEMU"*입니다. toolchain 줄이 없는 것은 기본값(`BR2_TOOLCHAIN_BUILDROOT=y`)을 그대로 쓰기 때문입니다.

## make — 30분의 풀 빌드

```bash
make 2>&1 | tee build.log
```

`tee`로 로그를 남기면 빌드 실패 위치를 찾기 쉽습니다. 병렬도는 `BR2_JLEVEL=0`이라 매뉴얼 "Top-level parallel build" 절의 표현대로 "by default number of CPUs + 1"로 *패키지 안에서* 병렬 컴파일하고, 패키지 사이는 순서대로 진행합니다. 패키지 사이까지 병렬로 돌리는 최상위 병렬 빌드는 `BR2_PER_PACKAGE_DIRECTORIES`가 필요하고, 같은 절은 이 기능을 "very experimental feature, which is known to break even in some non-unusual situations"라고 적습니다.

실제 로그의 `>>>` 줄은 442개였습니다. toolchain 부분만 순서대로 뽑으면 다음과 같습니다.

```text
>>> host-binutils 2.44 Downloading
...
>>> host-binutils 2.44 Installing to host directory
>>> host-gcc-initial 14.3.0 Downloading
...
>>> host-gcc-initial 14.3.0 Installing to host directory
>>> linux-headers 6.18.7 Downloading
...
>>> linux-headers 6.18.7 Installing to staging directory
>>> glibc 2.42-67-g4ebd33dd77eabe8d4c45232bed4b42a31d2f9edc Downloading
...
>>> glibc 2.42-67-g4ebd33dd77eabe8d4c45232bed4b42a31d2f9edc Installing to staging directory
>>> host-gcc-final 14.3.0 Extracting
...
>>> host-gcc-final 14.3.0 Building
```

부트스트랩은 *binutils → gcc-initial(libc 없이 C만) → 커널 헤더 → glibc → gcc-final* 다섯 단계입니다. glibc는 한 번만 빌드됩니다. `host-gcc-final`에 Downloading 줄이 없는 것은 gcc-initial이 받은 tarball을 그대로 쓰기 때문입니다.

전체 순서는 대략 다음과 같았습니다.

1. host 기본 도구 (`host-skeleton`, `host-m4`, `host-pkgconf`, `host-fakeroot`, `host-e2fsprogs` …)
2. toolchain (위 다섯 단계)
3. host-qemu와 그 의존성 (`host-python3`, `host-meson`, `host-libglib2`, `host-pixman`, `host-slirp` …)
4. target 패키지 (`skeleton`, `busybox`, `initscripts` …)
5. 커널 (`linux 6.18.7 Building`)
6. rootfs 이미지와 post-image (`Generating filesystem image rootfs.ext2`, `Executing post-image script board/qemu/post-image.sh`)

부트로더 단계는 없습니다. QEMU가 `-kernel`로 커널을 직접 올리기 때문입니다. 단계별 소요 시간은 `output/build/build-time.log`에 남고, 이 빌드의 합계는 Ch 1에 정리했습니다. 벽시계로 29분 50초였고 그중 소스 다운로드가 607초(합산)였습니다.

## 산출물 확인

빌드가 끝나면 `output/images/`에 산출물이 모입니다.

```text
$ ls -l output/images/
total 21480
-rw-r--r-- 1 br br 13236736 Nov 16 03:06 Image
-rw-r--r-- 1 br br 62914560 Nov 16 03:07 rootfs.ext2
lrwxrwxrwx 1 br br       11 Nov 16 03:07 rootfs.ext4 -> rootfs.ext2
-rwxr-xr-x 1 br br      819 Nov 16 03:07 start-qemu.sh
```

| 파일 | 의미 |
|---|---|
| `Image` | 압축하지 않은 arm64 커널 (13 MB) |
| `rootfs.ext2` | ext4 형식 rootfs, `BR2_TARGET_ROOTFS_EXT2_SIZE="60M"` 그대로 62,914,560바이트 |
| `rootfs.ext4` | `rootfs.ext2`를 가리키는 symlink |
| `start-qemu.sh` | 이 산출물로 QEMU를 띄우는 스크립트 |

`start-qemu.sh`의 핵심 줄은 다음과 같습니다(819바이트 중 마지막 `exec` 줄).

```bash
exec qemu-system-aarch64 -M virt -cpu cortex-a53 -nographic -smp 1 -kernel Image -append "rootwait root=/dev/vda console=ttyAMA0" -netdev user,id=eth0 -device virtio-net-device,netdev=eth0 -drive file=rootfs.ext4,if=none,format=raw,id=hd0 -device virtio-blk-device,drive=hd0  ${EXTRA_ARGS} "$@"
```

스크립트 앞부분은 `--serial-only`와 `--use-system-qemu` 두 옵션을 받습니다. 후자를 주지 않으면 `PATH` 앞에 `output/host/bin`을 붙여 Buildroot가 빌드한 QEMU를 씁니다. 메모리 옵션(`-m`)이 없으므로 QEMU 기본값인 128 MiB로 뜹니다.

## output 디렉터리 해부

`make` 한 번이 만든 `output/`은 다섯 디렉터리로 나뉩니다. 크기는 `du -sh` 값입니다.

```text
$ ls output/
build  host  images  staging  target
```

| 디렉터리 | 크기 | 역할 | 들어가 보는 이유 |
|---|---:|---|---|
| `host/` | 1.1 GB | 호스트에서 실행하는 도구·cross toolchain (`host/bin/`에 227개) | 망가진 binary, wrapper 추적 |
| `build/` | 13 GB | 패키지별 소스 + 빌드 산출물 70개 디렉터리, `build-time.log` | 소스 확인, 실패 재현 |
| `staging/` | (symlink) | `host/aarch64-buildroot-linux-gnu/sysroot`를 가리킴 | 헤더·`.so` 누락 확인 |
| `target/` | 4.4 MB | rootfs 조립 트리. 최상위에 `THIS_IS_NOT_YOUR_ROOT_FILESYSTEM` | 설치된 파일 미리 보기 |
| `images/` | 21 MB | 최종 산출물 | flash, archive |

`staging/`과 `target/`은 *staging은 링크 시점, target은 실행 시점*으로 구분합니다. 라이브러리 패키지가 `<PKG>_INSTALL_STAGING = YES`면 헤더와 `.so`가 staging(=sysroot)에 들어가 다음 패키지가 링크할 수 있고, `.so`는 target에도 복사돼 보드에서 실행됩니다. 매뉴얼 quick start는 `target/`에 대해 "this directory *should not be used on your target*"이라고 경고합니다. `/dev` 노드가 없고 busybox의 setuid 같은 권한이 아직 적용되지 않았기 때문이며, 권한은 이미지를 만들 때 fakeroot 안에서 입혀집니다.

## .stamp_ — 단계 추적의 정체

각 패키지 빌드 디렉터리 안에는 빈 stamp 파일이 있습니다. busybox와 glibc의 실제 목록입니다.

```text
$ ls -a output/build/busybox-1.37.0/ | grep stamp
.stamp_built
.stamp_configured
.stamp_dotconfig
.stamp_downloaded
.stamp_extracted
.stamp_installed
.stamp_kconfig_fixup_done
.stamp_patched
.stamp_target_installed
$ ls -a output/build/glibc-2.42-67-g4ebd33dd77eabe8d4c45232bed4b42a31d2f9edc/ | grep stamp
.stamp_built
.stamp_configured
.stamp_downloaded
.stamp_extracted
.stamp_installed
.stamp_patched
.stamp_staging_installed
.stamp_target_installed
```

busybox에는 staging stamp가 없고(라이브러리가 아님), 대신 kconfig 패키지라서 `.stamp_dotconfig`·`.stamp_kconfig_fixup_done`이 있습니다. glibc에는 `.stamp_staging_installed`가 있습니다. 커널 디렉터리에는 `.stamp_images_installed`도 생겼습니다. 각 단계가 끝나면 stamp가 생기고, 다음 `make`는 stamp가 있는 단계를 건너뜁니다.

| stamp 파일 | 의미 |
|---|---|
| `.stamp_downloaded` | 다운로드·hash 검증 완료 |
| `.stamp_extracted` | 압축 해제 |
| `.stamp_patched` | 패치 적용 완료 |
| `.stamp_configured` | configure 단계 통과 |
| `.stamp_built` | 빌드 완료 |
| `.stamp_staging_installed` | staging 설치 |
| `.stamp_target_installed` | target 설치 |
| `.stamp_host_installed` | host 패키지의 host 설치 |
| `.stamp_images_installed` | `images/` 설치 (커널·부트로더) |
| `.stamp_installed` | 위 설치 단계 전체 완료 |

`<pkg>-rebuild`, `<pkg>-reconfigure`는 이 stamp를 지우는 타깃입니다. `package/pkg-generic.mk` 1053~1073행을 보면 `clean-for-reinstall`이 설치 stamp를, `clean-for-rebuild`가 거기에 `.stamp_built`를, `clean-for-reconfigure`가 다시 `.stamp_configured`를 지웁니다. 그래서 `rebuild`는 다시 빌드한 뒤 *설치까지* 다시 합니다. 실제로 `make busybox-rebuild`를 돌리니 다음 두 줄만 나왔고 8.03초가 걸렸습니다.

```text
>>> busybox 1.37.0 Building
>>> busybox 1.37.0 Installing to target
```

그 뒤 stamp 시각을 보면 `.stamp_built`, `.stamp_installed`, `.stamp_target_installed`만 새 시각(03:09)이고 나머지는 처음 시각(02:56) 그대로였습니다. rootfs 이미지는 다시 만들지 않으므로, 바뀐 busybox를 이미지에 넣으려면 그다음에 `make`를 한 번 더 칩니다.

## 첫 부팅

`start-qemu.sh`의 `exec` 줄과 같은 인자로 macOS의 QEMU 11.1.3에서 띄웠습니다(rootfs는 복사본을 썼습니다). 부팅 로그의 앞과 뒤입니다.

```text
Booting Linux on physical CPU 0x0000000000 [0x410fd034]
Linux version 6.18.7 (br@brvm) (aarch64-buildroot-linux-gnu-gcc.br_real (Buildroot 2026.02.3) 14.3.0, GNU ld (GNU Binutils) 2.44) #1 SMP Mon Nov 16 03:06:55 UTC 2026
...
Kernel command line: rootwait root=/dev/vda console=ttyAMA0
...
virtio_blk virtio0: [vda] 122880 512-byte logical blocks (62.9 MB/60.0 MiB)
...
EXT4-fs (vda): mounted filesystem 97c90481-9a59-437c-8a53-559a289bbf3c ro with ordered data mode. Quota mode: disabled.
VFS: Mounted root (ext4 filesystem) readonly on device 254:0.
...
Run /sbin/init as init process
...
Starting network: udhcpc: started, v1.37.0
...
udhcpc: lease of 10.0.2.15 obtained from 10.0.2.2, lease time 86400
...
Welcome to Buildroot
buildroot login:
```

커널 버전 문자열에 `(Buildroot 2026.02.3) 14.3.0`과 `GNU Binutils 2.44`가 찍혀, 이 트리가 만든 toolchain으로 빌드됐음을 확인할 수 있습니다. `[vda] 122880 512-byte logical blocks`는 60 MiB 이미지 크기와 정확히 맞습니다. `root`(비밀번호 없음, Ch 3의 기본값)로 로그인했습니다.

```text
buildroot login: root
# uname -a
Linux buildroot 6.18.7 #1 SMP Mon Nov 16 03:06:55 UTC 2026 aarch64 GNU/Linux
# cat /etc/os-release
NAME=Buildroot
VERSION=2026.02.3
ID=buildroot
VERSION_ID=2026.02.3
PRETTY_NAME="Buildroot 2026.02.3"
# free -m
              total        used        free      shared  buff/cache   available
Mem:            112          10          98           0           4          98
Swap:             0           0           0
# df -h /
Filesystem                Size      Used Available Use% Mounted on
/dev/root                51.1M      4.1M     42.8M   9% /
```

`/etc/os-release`는 최상위 `Makefile`의 `target-finalize` 단계가 `BR2_VERSION`으로 써 넣은 것입니다. 사용 중인 메모리는 10 MB, rootfs는 4.1 MB였습니다. 여기까지 도달했다면 toolchain, 커널, rootfs, init이 모두 맞물렸다는 뜻입니다.

`poweroff`를 치면 init 스크립트가 역순으로 멈추고 `reboot: Power down`으로 QEMU가 끝납니다. 응답이 없을 때는 `-nographic` 모드의 escape인 `Ctrl-A X`로 빠져나옵니다.

## dl/ — 캐시의 역할

빌드 후 `dl/`에는 소스가 패키지별 디렉터리로 모여 있습니다.

```text
$ du -sh dl
1.2G	dl
$ ls dl | wc -l
47
```

다음에 같은 트리에서 빌드를 새로 시작하면 이미 받은 소스는 다시 받지 않습니다. 여러 트리가 함께 쓰려면 Ch 2에서 본 대로 환경 변수로 지정합니다.

```bash
export BR2_DL_DIR=/mnt/cache/buildroot-dl
```

## 두 번째 빌드 — 증분 동작

같은 트리에서 아무것도 바꾸지 않고 `make`를 다시 돌리면 7.41초가 걸렸고, 출력은 다음이 전부였습니다.

```text
>>>   Finalizing host directory
>>>   Finalizing target directory
>>>   Sanitizing RPATH in target tree
>>>   Sanity check in overlays
>>>   Generating root filesystems common tables
>>>   Generating filesystem image rootfs.ext2
>>>   Executing post-image script board/qemu/post-image.sh
WALL 7.41 s
```

패키지 단계는 stamp 덕에 모두 건너뛰고, target 마무리·rootfs 이미지·post-image는 *매번* 다시 돕니다. 패키지 하나만 다시 다룰 때 쓰는 타깃은 다음과 같습니다(매뉴얼 "Package-specific make targets").

```bash
make busybox-rebuild         # 빌드 + 설치 재실행
make busybox-reconfigure     # configure부터 재실행
make busybox-dirclean        # 빌드 디렉터리 삭제, 다음 make에서 처음부터
make linux-rebuild           # 커널 빌드 + 설치 재실행
```

`rebuild` 뒤에 `reinstall`을 따로 붙일 필요는 없습니다. 위 stamp 실험처럼 `rebuild`가 설치까지 다시 합니다. 다만 매뉴얼은 `rebuild`·`reconfigure`가 "only makes sense when using the `OVERRIDE_SRCDIR` feature or when you modified a file directly in the build directory"라고 적습니다. 패키지 *옵션*을 바꿨을 때 무엇을 다시 빌드할지는 Buildroot가 추적하지 않습니다(Ch 1).

## 자주 만나는 첫 빌드 실패

1. **호스트 도구 검사 실패** — 빌드 첫 단계에서 `support/dependencies/dependencies.sh`가 필수 도구를 확인합니다. macOS에서 같은 트리로 `make`를 쳤더니 Xcode의 `gcc`(실제로는 clang)가 `gcc version` 문자열을 내지 않아 다음에서 멈췄습니다. 매뉴얼이 Linux 호스트를 전제하는 이유입니다.

   ```text
   You must install 'gcc' on your build machine
   gmake: *** [support/dependencies/dependencies.mk:27: dependencies] Error 1
   ```

2. **디스크 부족** — 이 defconfig 하나로 `output/` 14 GB + `dl/` 1.2 GB를 썼습니다. 보드를 여럿 빌드하면 그 배수입니다.
3. **업그레이드 후 사라진 옵션** — 새 Buildroot에서 없어진 심볼은 "Legacy config options" 메뉴(`Config.in.legacy`)에 모입니다. `make olddefconfig` 후 그 메뉴에 켜진 항목이 있으면 help를 읽고 대체 옵션으로 옮깁니다. 2026.02.3의 `Config.in.legacy`에는 예를 들어 Linaro AArch64 toolchain(`BR2_TOOLCHAIN_EXTERNAL_LINARO_AARCH64`)이 "no longer maintained and has been removed"로 들어 있습니다.
4. **사내 망 다운로드 실패** — `BR2_PRIMARY_SITE`로 사내 미러를 먼저 시도하게 하고, 외부 접속을 막아야 한다면 `BR2_PRIMARY_SITE_ONLY=y`를 켭니다(Ch 2).
5. **root로 빌드** — 매뉴얼은 일반 사용자 빌드를 권하고, `output/target/`에 `/dev` 노드를 만들지 않는 이유를 "Buildroot doesn't run as root and doesn't want to run as root"라고 설명합니다. 권한·소유권은 fakeroot 단계와 device table(Ch 7)로 넣습니다.

## 다음 단계 — 지금 가능해진 것들

이 시점에서 다음 실험을 해 볼 수 있습니다.

- `make menuconfig`로 패키지 한두 개 추가 → `make` → 부팅 → 확인.
- `make linux-menuconfig`로 커널 옵션 토글 → `make` → 재부팅. `linux-menuconfig`는 커널의 configure 이후 stamp를 지우므로 다음 `make`가 커널을 다시 빌드합니다(Ch 12).
- `make graph-depends`로 의존성 그래프 그리기(호스트에 graphviz 필요).
- `make graph-size`로 rootfs의 파일별 크기 통계 만들기.

busybox 한 패키지 재빌드가 8초, 변경 없는 재빌드가 7초였으니 이런 실험은 대부분 커널이나 toolchain을 건드리지 않는 한 짧게 끝납니다.

## 정리

- `git clone`(2026.02.3 태그) → `make qemu_aarch64_virt_defconfig` → `make` → `start-qemu.sh` 네 단계로 첫 시스템이 완성됐습니다. 빌드는 29분 50초였습니다.
- toolchain은 binutils → gcc-initial → 커널 헤더 → glibc → gcc-final 다섯 단계로 부트스트랩됩니다.
- 산출물은 `Image`(13 MB), `rootfs.ext2`(60 MiB, `rootfs.ext4` symlink), `start-qemu.sh`이고, QEMU 128 MiB 메모리에서 부팅해 rootfs 4.1 MB, 메모리 10 MB를 썼습니다.
- stamp 파일이 증분 빌드의 근거이고, `<pkg>-rebuild`는 빌드와 설치 stamp를 지워 둘 다 다시 합니다. 이미지는 다음 `make`가 만듭니다.
- 변경 없는 `make`는 7.41초였고, rootfs 이미지와 post-image는 매번 다시 생성됩니다.
- 첫 빌드 실패는 호스트 도구 검사(`dependencies.sh`), 디스크, Legacy 옵션, 사내 망 다운로드에서 자주 납니다.

다음 편은 **Ch 5: 패키지 시스템 — .mk와 Config.in**. Buildroot 패키지 한 개가 어떻게 구성되는지 해부합니다.

## 관련 항목

- [Ch 3: Kconfig 설정 — menuconfig와 defconfig](/blog/embedded/buildroot/chapter03-kconfig)
- [Ch 5: 패키지 시스템 — .mk와 Config.in](/blog/embedded/buildroot/chapter05-package-system)
- [Ch 7: 보드 customize — overlay, post-build, post-image](/blog/embedded/buildroot/chapter07-board-customize)
- [Ch 10: 실전 — BeagleBone Black 시스템 처음부터 끝까지](/blog/embedded/buildroot/chapter10-real-board)
- [BSP Development Ch 10: 첫 부팅](/blog/embedded/bsp/chapter10-first-boot) — 실 보드에서의 첫 부팅 디버깅
- [Buildroot Manual — System requirements](https://buildroot.org/downloads/manual/manual.html#requirement)
