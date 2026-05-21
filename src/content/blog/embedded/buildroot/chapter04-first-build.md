---
title: "Ch 4: 첫 빌드 — QEMU에서 동작하는 시스템"
date: 2026-05-19T04:00:00
description: "qemu_aarch64_virt_defconfig로 첫 시스템을 빌드하고 QEMU에서 부팅하는 전체 흐름."
series: "Buildroot Practical"
seriesOrder: 4
tags: [embedded, buildroot, qemu, first-build]
draft: false
---

## 한 줄 요약

> **"`git clone` → `make defconfig` → `make` → `start-qemu.sh`."** — 네 명령으로 부팅 가능한 AArch64 시스템이 완성됩니다.

## 왜 QEMU부터 시작하는가

새 보드를 *손에* 받기 전, *toolchain*만 검증하고 싶다거나, *rootfs 구성*만 확인하고 싶을 때가 있습니다. 이럴 때 QEMU는 사실상 무료 보드입니다. 부팅 실패도 자유롭게 반복할 수 있고, 빌드와 실행을 한 머신에서 끝낼 수 있습니다.

이 장에서는 `qemu_aarch64_virt_defconfig` 하나만 가지고 *처음부터 끝까지* 한 사이클을 돌립니다. 빌드 중에 각 단계가 *무엇을 하는지* 알아두면 다음 장의 패키지 작성, 보드 customize가 훨씬 자연스럽게 이해됩니다.

## 사전 준비 — 호스트 패키지

Buildroot는 빌드를 위해 host에 몇 가지 도구를 요구합니다. Ubuntu 22.04 / 24.04 기준 설치 명령은 다음과 같습니다.

```bash
sudo apt install -y \
    build-essential \
    git \
    wget \
    cpio \
    unzip \
    rsync \
    bc \
    file \
    python3 \
    libncurses-dev \
    libssl-dev \
    bzip2 \
    xz-utils
```

QEMU 실행도 함께 깔아 둡니다.

```bash
sudo apt install -y qemu-system-arm qemu-system-aarch64
```

대부분의 환경에서는 위 패키지만으로 충분합니다. 만약 ARM toolchain까지 *호스트가 가지고 있어야* 하는 옵션을 켰다면 (`BR2_TOOLCHAIN_EXTERNAL`) 그쪽 의존성도 필요합니다.

## 클론 — 안정 릴리스 vs master

Buildroot는 *분기별 릴리스*(`YYYY.MM`)와 *LTS*(`YYYY.02-LTS`, `YYYY.08-LTS`)를 운영합니다. 처음에는 *최신 LTS*가 안전합니다.

```text
$ git clone --depth=1 --branch 2024.02.x \
        https://gitlab.com/buildroot.org/buildroot.git
$ cd buildroot
$ git log --oneline -1
abcdef0 Update for 2024.02.6 release
```

`--depth=1`은 *얕은 클론*입니다. 변경 이력을 추적할 필요가 없다면 깔끔합니다. 패키지 패치를 자주 보낼 계획이라면 full clone이 좋습니다.

```text
$ git clone https://gitlab.com/buildroot.org/buildroot.git
$ cd buildroot
$ git checkout 2024.02.x
```

## defconfig 적용

QEMU AArch64 virt를 위한 defconfig는 트리에 이미 포함돼 있습니다.

```text
$ make qemu_aarch64_virt_defconfig
#
# configuration written to /home/me/buildroot/.config
#
```

이 한 줄이 *전체 빌드 계획*을 결정합니다. `.config`가 1,500줄쯤 생성됩니다. 내용을 한 번 훑어보면 다음과 같은 항목이 보입니다.

```make
BR2_aarch64=y
BR2_cortex_a53=y
BR2_TOOLCHAIN_BUILDROOT_GLIBC=y
BR2_LINUX_KERNEL=y
BR2_LINUX_KERNEL_DEFCONFIG="defconfig"
BR2_LINUX_KERNEL_INTREE_DTS_NAME="arm/qemu-virt-a53"
BR2_TARGET_ROOTFS_EXT2=y
BR2_TARGET_ROOTFS_EXT2_4=y
BR2_PACKAGE_HOST_QEMU=y
```

이 결과의 의미를 한 문장으로 요약하면 다음과 같습니다. *"AArch64 Cortex-A53, glibc toolchain, mainline Linux, ext4 rootfs, host용 QEMU 함께 빌드"*. 다음 절의 `make`가 이 계획을 실제로 수행합니다.

## make — 30분의 풀 빌드

```text
$ make -j$(nproc) 2>&1 | tee build.log
```

병렬 잡 수는 `-jN`으로 지정합니다. `$(nproc)`가 보통 가장 빠릅니다. `tee`로 log를 남기는 습관은 빌드가 깨졌을 때 *위치를 찾는 데* 거의 필수입니다.

빌드는 대략 다음 순서로 진행됩니다. 각 단계가 화면에 흐를 때 *어디쯤인지* 감이 잡히도록 정리해 두면 좋습니다.

**1. Initial directory setup**


**2. Download — dl/<pkg>/<tarball>.tar.***


**3. Toolchain**

- host-binutils, host-gcc(stage 1), kernel-headers,
- glibc(stage 1), host-gcc(stage 2), glibc(stage 2)

**4. Target packages**

- skeleton, busybox, … (의존성 순)

**5. Kernel**

- linux-extract, linux-configure, linux-build, linux-install

**6. Bootloader**

- (qemu_aarch64_virt_defconfig는 U-Boot 없이 -kernel 부팅)

**7. Filesystem images**

- fakeroot rootfs build, mkfs.ext4, …

**8. Post-image (해당 시)**

처음에는 3단계(toolchain)이 가장 오래 걸립니다. 한 번 빌드한 toolchain은 `output/host/`에 캐시되므로, *같은 defconfig*로 재빌드하면 toolchain 단계는 거의 즉시 통과합니다.

전형적인 출력은 다음과 같이 보입니다.

```text
>>> host-skeleton    Configuring
>>> host-skeleton    Building
>>> host-skeleton    Installing to host directory
>>> toolchain-buildroot   Configuring
>>> binutils 2.41    Downloading
>>> binutils 2.41    Extracting
>>> binutils 2.41    Patching
>>> binutils 2.41    Configuring
>>> binutils 2.41    Building
>>> binutils 2.41    Installing to host directory
...
>>> linux 6.6.30     Extracting
>>> linux 6.6.30     Configuring
>>> linux 6.6.30     Building
>>> busybox 1.36.0   Building
>>> Generating root filesystem image rootfs.ext4
```

`>>>` 접두사가 *Buildroot 단계 표시*입니다. 어디가 어느 패키지의 어느 단계인지 한눈에 잡힙니다.

## 산출물 확인

빌드가 끝나면 `output/images/`에 산출물이 모입니다.

```text
$ ls -lh output/images/
total 87M
-rw-r--r-- 1 me me  34M Image
-rw-r--r-- 1 me me  60M rootfs.ext2
-rw-r--r-- 1 me me  60M rootfs.ext4
-rw-r--r-- 1 me me 1.4K start-qemu.sh
```

| 파일 | 의미 |
|---|---|
| `Image` | 압축 풀린 Linux 커널 |
| `rootfs.ext4` | ext4 포맷의 rootfs (= `rootfs.ext2`의 symlink) |
| `start-qemu.sh` | QEMU를 *이 산출물로* 띄우는 스크립트 |

`start-qemu.sh`를 열어 보면 어떤 명령을 만들었는지 보입니다.

```bash
#!/bin/sh
exec qemu-system-aarch64 \
    -M virt \
    -cpu cortex-a53 \
    -smp 1 \
    -m 256 \
    -nographic \
    -kernel "${BINARIES_DIR}/Image" \
    -append "rootwait root=/dev/vda console=ttyAMA0" \
    -drive file="${BINARIES_DIR}/rootfs.ext4",if=none,format=raw,id=hd0 \
    -device virtio-blk-device,drive=hd0 \
    -netdev user,id=mynet \
    -device virtio-net-device,netdev=mynet
```

Buildroot가 *직접 만들어 주는* 이 스크립트는 학습용으로도 좋습니다. 옵션 하나하나의 의미가 임베디드 부팅 매개변수의 표준 예시이기 때문에, 그대로 보드 부팅 환경(U-Boot bootargs)에도 응용할 수 있습니다.

## output 디렉터리 해부

`make` 한 번이 만들어 내는 `output/`은 *5개 핵심 디렉터리*로 나뉩니다. 각각의 역할을 한 번 짚어두면 디버깅이 훨씬 쉽습니다.

```text
output/
├── host/         ─ 호스트가 실행하는 도구·toolchain. PATH에 추가됨
├── build/        ─ 패키지별 source + 빌드 산출물. 디버깅의 중심
├── staging/      ─ symlink → host/<tuple>/sysroot. 패키지가 *링크할* 헤더·.so
├── target/       ─ 최종 rootfs의 *staging area*. 여기를 archive하면 rootfs
├── images/       ─ 최종 산출물 (Image, rootfs.ext4, U-Boot binary 등)
└── build-time.log ─ 패키지별 빌드 시간
```

| 디렉터리 | 누구의 시선 | 들어가 보는 이유 |
|---|---|---|
| `host/` | 빌드 호스트 | 망가진 binary, 잘못된 wrapper 추적 |
| `build/` | 빌드 시점 | source 직접 확인, `make V=1` 재현 |
| `staging/` | *cross-compile 시점*의 target | 헤더·`.so` 누락 확인 |
| `target/` | runtime 시점의 target | rootfs 내용 미리 보기, init script 확인 |
| `images/` | 배포 산출물 | flash, archive |

`staging/`과 `target/`의 차이가 *처음에는 헷갈립니다*. 한 줄로 요약하면 *staging은 link 시점, target은 run 시점*입니다. `libfoo`라는 패키지가 다른 패키지를 위해 `libfoo.h`와 `libfoo.so`를 제공한다면, 헤더와 `.so`의 *symlinks*는 staging에 들어가야 다음 패키지가 *링크*할 수 있습니다. 동시에 `.so`는 target에도 복사돼야 *런타임*에 dlopen이 가능합니다. 이 구분이 `BR2_INSTALL_STAGING=YES`의 의미입니다.

## .stamp_ — 단계 추적의 정체

각 패키지 디렉터리(`output/build/<pkg>-<ver>/`) 안에는 *빈 stamp 파일들*이 있습니다.

```text
$ ls output/build/openssl-3.2.1/ | grep stamp
.stamp_configured
.stamp_built
.stamp_host_installed
.stamp_images_installed
.stamp_staging_installed
.stamp_target_installed
```

Buildroot는 *각 단계가 끝나면 stamp 파일을 생성*합니다. 다음 빌드가 시작될 때 *stamp가 있으면 그 단계를 skip*합니다. 즉 incremental의 *진실*은 이 파일들에 있습니다.

| stamp 파일 | 의미 |
|---|---|
| `.stamp_downloaded` | tarball 다운로드·hash 검증 완료 |
| `.stamp_extracted` | tarball 압축 풀림 |
| `.stamp_patched` | `0001-*.patch`까지 적용 완료 |
| `.stamp_configured` | `./configure` 또는 동등 단계 통과 |
| `.stamp_built` | `make`로 object·바이너리 생성 완료 |
| `.stamp_staging_installed` | 헤더·`.so`가 `staging/`에 복사 |
| `.stamp_target_installed` | 산출물이 `target/`에 복사 |
| `.stamp_host_installed` | host용 산출물이 `host/`에 복사 |
| `.stamp_images_installed` | 이미지가 `images/`에 복사 |

특정 단계부터 다시 시작하려면 *해당 stamp를 지우면* 됩니다.

```text
$ rm output/build/openssl-3.2.1/.stamp_built
$ make openssl                 # build부터 다시
```

`make openssl-rebuild`는 *내부적으로* `.stamp_built`와 그 이후의 stamp를 지운 뒤 `make openssl`을 호출합니다. `make openssl-reconfigure`는 `.stamp_configured`부터 지웁니다. 명령 이름이 *stamp의 의미*와 정확히 1:1 대응한다는 것을 알면 어디까지 되돌릴지 정밀하게 선택할 수 있습니다.

## 첫 부팅

```text
$ ./output/images/start-qemu.sh
```

화면이 흐르고 다음과 같은 부팅 로그가 지나갑니다.

```text
[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x410fd034]
[    0.000000] Linux version 6.6.30 (...)  aarch64 GNU/Linux
[    0.000000] random: crng init done
[    0.040000] virtio_blk virtio0: [vda] 122880 512-byte logical blocks
EXT4-fs (vda): mounted filesystem with ordered data mode.
...
Welcome to Buildroot
buildroot login:
```

`root`(비밀번호 없음)로 로그인하면 셸이 나옵니다.

```text
buildroot login: root
# uname -a
Linux buildroot 6.6.30 #1 SMP PREEMPT_DYNAMIC Tue May 19 ... aarch64 GNU/Linux
# free -m
              total        used        free      shared  buff/cache   available
Mem:            245           7         235           0           2         231
# ls /
bin   dev   etc   home  init  lib   lib64 linuxrc media mnt   opt   proc
root  run   sbin  sys   tmp   usr   var
```

여기까지 도달했다면 toolchain, 커널, rootfs, init이 *모두 정확히* 정렬됐다는 뜻입니다. 처음 본 사람은 이 한 화면이 *얼마나 많은 결정을 압축*하고 있는지 새삼 느낍니다.

QEMU에서 나오려면 `Ctrl-A X`입니다 (`-nographic` 모드의 escape sequence).

## dl/ — 캐시의 역할

빌드 후 `dl/`을 확인하면 모든 source tarball이 디렉터리별로 모여 있습니다.

```text
$ du -sh dl/
1.2G    dl/
$ ls dl/
binutils   busybox    gcc        glibc      linux      ...
```

다음에 빌드를 새로 시작해도 *다운로드는 다시 일어나지 않습니다*. CI에서는 이 디렉터리를 컨테이너 영속 볼륨으로 mount해서 *팀 전체가 공유*하는 패턴이 일반적입니다.

```text
$ make BR2_DL_DIR=/mnt/cache/buildroot-dl ...
```

또는 환경 변수로 한 번에 지정합니다.

```bash
export BR2_DL_DIR=/mnt/cache/buildroot-dl
```

## 두 번째 빌드 — 증분 동작

같은 트리에서 `make`를 다시 돌리면 *변경 없는 패키지*는 모두 *skip*됩니다.

```text
$ make
>>> Buildroot 2024.02.6 Collecting legal info
...
>>> Finalizing target directory
>>> Sanitizing RPATH in target tree
>>> Generating root filesystem image rootfs.ext4
```

핵심은 단계의 *재실행 입자도*입니다. 패키지 한 개만 재빌드하고 싶다면 다음 명령들이 표준입니다.

```text
$ make busybox-rebuild         # busybox만 다시 빌드
$ make busybox-reconfigure     # configure부터
$ make busybox-dirclean        # source까지 지우고 다음 빌드 때 처음부터
$ make linux-rebuild           # 커널만 다시 빌드
$ make linux-rebuild linux-reinstall    # rebuild + rootfs 반영
```

`make all`(= `make`)는 *바뀐 부분만* 자동으로 추적하지만, Buildroot는 Yocto만큼 정밀하지 않습니다. 패키지 옵션을 바꿨을 때는 *명시적인 rebuild*가 안전합니다.

## 자주 만나는 첫 빌드 실패

1. **`No space left on device`** — `output/` + `dl/`이 합쳐 보통 10 ~ 20 GB. 호스트 디스크 여유를 확인하세요.
2. **`Permission denied`** — root 권한으로 빌드하지 마세요. Buildroot는 *비루트 사용자*로 빌드하도록 설계됐고, root는 명시적으로 거부됩니다.
3. **`config option Foo not found in Bar`** — Buildroot 트리 업그레이드 직후 자주 발생. `make oldconfig` 또는 `make olddefconfig`로 새 옵션을 *명시적으로 처리*하세요.
4. **`SSL certificate problem` 같은 download 실패** — 사내 망에서 자주 발생. `BR2_PRIMARY_SITE`로 사내 미러를 우선 사이트로 두거나, `BR2_PRIMARY_SITE_ONLY=y`로 외부 fallback을 차단합니다.
5. **`Disabling extended attribute support` 같이 fakeroot 경고** — overlayfs나 일부 파일시스템에서 발생. tmpfs가 아닌 *진짜 디스크 위*에 트리를 두면 대체로 해결됩니다.
6. **빌드 도중 randomly 멈춤** — 8 GB 미만 RAM에서 `-jN`이 너무 크면 OOM이 납니다. `-j$(nproc)` 대신 `-j2`나 `-j4`로 낮춰 보세요.

## 다음 단계 — *지금 가능해진 것들*

이 시점에서 다음 실험을 자유롭게 할 수 있습니다.

- `make menuconfig`로 패키지 한두 개 추가 (`htop`, `tmux`, `mosquitto`) → `make` → 부팅 → 확인.
- `make linux-menuconfig`로 커널 옵션 토글 → `make linux-rebuild linux-reinstall` → 재부팅.
- `make graph-depends`로 의존성 그래프 그려 보기.
- `make graph-size`로 rootfs 크기 비율 시각화.

각 실험이 *몇 분 단위*로 끝납니다. 이 빠른 반복이 Buildroot의 핵심 장점입니다.

## 정리

- `git clone` → `make qemu_aarch64_virt_defconfig` → `make` → `start-qemu.sh` 네 단계로 첫 시스템이 완성됩니다.
- 빌드는 toolchain → packages → kernel → filesystem 순으로 흐르며, `>>>` 접두사로 단계가 명시됩니다.
- 산출물은 `output/images/`에 모이고, `start-qemu.sh`가 그대로 부팅 명령을 만들어 줍니다.
- `dl/`은 다운로드 캐시이며, CI에서는 공유 볼륨으로 운영합니다.
- 증분 빌드는 패키지별 `make <pkg>-rebuild`로 정밀 제어합니다.
- 첫 빌드 실패의 대부분은 디스크 공간, root 권한, 사내 망 다운로드, RAM 부족 중 하나입니다.
- 한 사이클이 30분 안쪽으로 끝나기 때문에 *반복 실험*이 쉽고, 이것이 학습의 큰 동력이 됩니다.

다음 편은 **Ch 5: 패키지 시스템 — .mk와 Config.in**. Buildroot 패키지 한 개가 어떻게 구성되는지 해부합니다.

## 관련 항목

- [Ch 3: Kconfig 설정 — menuconfig와 defconfig](/blog/embedded/buildroot/chapter03-kconfig)
- [Ch 5: 패키지 시스템 — .mk와 Config.in](/blog/embedded/buildroot/chapter05-package-system)
- [Ch 7: 보드 customize — overlay, post-build, post-image](/blog/embedded/buildroot/chapter07-board-customize)
- [Ch 10: 실전 — BeagleBone Black 시스템 처음부터 끝까지](/blog/embedded/buildroot/chapter10-real-board)
- [BSP Development Ch 10: 첫 부팅](/blog/embedded/bsp/chapter10-first-boot) — 실 보드에서의 첫 부팅 디버깅
