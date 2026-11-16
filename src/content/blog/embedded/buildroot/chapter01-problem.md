---
title: "Buildroot가 푸는 문제 — Yocto와의 핵심 차이 분석"
slug: "embedded/buildroot/chapter01-problem"
date: 2026-05-19T09:01:00
description: "Buildroot의 위치 — 임베디드 리눅스 rootfs 빌드 시스템, Yocto와의 트레이드오프."
series: "Buildroot Practical"
seriesOrder: 1
tags: [embedded, buildroot, rootfs, yocto, embedded-linux]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Buildroot는 *한 장의 Makefile* 같은 임베디드 리눅스 빌드 시스템입니다."** — 작은 시스템을 빠르게 만들고 싶을 때 가장 단순한 선택지입니다.

이 시리즈는 **Buildroot 2026.02.3**(LTS 계열, commit `679b9ead`)을 기준으로 합니다. 빌드 결과는 Apple M2 Pro 호스트 위 QEMU(HVF 가속)로 띄운 Debian 13 arm64 VM(vCPU 10개, RAM 12 GB)에서 실제로 돌린 값입니다. Buildroot 매뉴얼은 "Buildroot is designed to run on Linux systems"라고 적고 있어서, macOS에서 직접 빌드하지 않고 Linux VM을 썼습니다.

## 임베디드 리눅스의 부팅 가능한 이미지란

데스크톱 리눅스에서는 배포판이 모든 것을 해 줍니다. Ubuntu를 설치하면 부트로더부터 GNU userland까지 한 번에 깔립니다. 임베디드에서는 그렇지 않습니다. 보드마다 SoC가 다르고, 메모리 크기와 부팅 매체가 다르고, 필요한 패키지가 다릅니다. 결국 직접 조합해야 합니다. 이케아 가구를 받았는데 설명서 없이 나사 봉지만 열 개가 온 상황과 비슷합니다.

조합해야 하는 것은 대략 다음과 같습니다.

- **부트로더** — U-Boot 또는 vendor BSP의 자체 부트로더
- **커널** — Linux mainline 또는 vendor fork + 보드별 device tree
- **C 라이브러리** — glibc, musl, uClibc-ng 중 하나
- **루트 파일시스템** — busybox + 필요한 패키지들
- **이미지 포맷** — SD 카드용 raw, flash용 squashfs·UBIFS 등

이 모든 것을 *cross-compile*해야 합니다. 호스트와 다른 아키텍처의 타깃용으로요. 의존성도 직접 풉니다. 패키지 A가 패키지 B의 헤더에 의존하고, B가 C의 라이브러리를 링크하는 그래프를 손으로 정렬하는 일입니다.

Buildroot 매뉴얼 첫 장은 이 일을 이렇게 정의합니다. "Buildroot is a tool that simplifies and automates the process of building a complete Linux system for an embedded system, using cross-compilation." 그리고 cross toolchain, root filesystem, 커널 이미지, 부트로더를 만들 수 있으며 "any combination of these options, independently"로 쓸 수 있다고 덧붙입니다. 이런 도구를 *임베디드 리눅스 빌드 시스템*이라 부르고, 대표적인 두 가지가 Buildroot와 Yocto입니다.

## Buildroot의 설계 철학

Buildroot의 핵심은 단순함입니다. 전체가 GNU Make 위에 얹혀 있고, 설정은 리눅스 커널과 같은 Kconfig를 씁니다. 보드 하나를 만드는 과정이 다음 세 줄입니다.

```text
$ make qemu_aarch64_virt_defconfig
$ make
$ output/images/start-qemu.sh
```

처음 보면 *너무 단순한* 느낌이 듭니다. 이 단순함은 의도된 결과이고, 매뉴얼 FAQ에 그 입장이 명시돼 있습니다. "Why doesn't Buildroot generate binary packages (.deb, .ipkg...)?" 항목의 개발자 입장문 일부입니다.

```text
 * Buildroot is not meant to be a distribution (or rather, a distribution
   generator.) It is the opinion of most Buildroot developers that this
   is not a goal we should pursue.

 * We believe that for most embedded Linux systems, binary packages are
   not necessary, and potentially harmful.
```

이 입장에서 다음 설계가 나옵니다.

- **binary 패키지 feed가 없습니다.** 런타임 `apt`·`opkg` 같은 것이 없고, 갱신은 rootfs 이미지 통째 교체입니다. FAQ는 그 이유를 "the image deployed to the embedded system is guaranteed to really be the one that has been tested and validated"라고 설명합니다.
- **설정 변경을 자동 추적하지 않습니다.** 매뉴얼 "Understanding when a full rebuild is necessary"는 "Buildroot does not attempt to detect what parts of the system should be rebuilt"라고 적습니다. 무엇을 다시 빌드할지는 사용자가 판단합니다.
- **한 output 디렉터리는 한 설정입니다.** 보드가 둘이면 `O=` 디렉터리를 둘 둡니다.

패키지별 sysroot 격리(`BR2_PER_PACKAGE_DIRECTORIES`)는 있지만, `Config.in`에서 프롬프트가 "Use per-package directories (experimental)"이고 기본값은 꺼져 있습니다(Ch 14에서 실제로 켜 봅니다).

이렇게 포기한 대가로 얻는 것이 *전체 구조를 한눈에 이해할 수 있는 단순함*입니다. `make V=1`로 명령을 한 줄씩 따라갈 수 있고, `make printvars`로 패키지 변수가 어떻게 펼쳐졌는지 바로 볼 수 있습니다.

## 빌드 시간이 어디로 가는가

"Buildroot는 빠르다"는 말을 실제로 재 봤습니다. `qemu_aarch64_virt_defconfig`를 아무것도 바꾸지 않고 빈 `dl/`에서 `/usr/bin/time -v make`로 빌드했습니다.

```text
	User time (seconds): 6459.39
	System time (seconds): 779.84
	Percent of CPU this job got: 404%
	Elapsed (wall clock) time (h:mm:ss or m:ss): 29:50.42
	Maximum resident set size (kbytes): 1345612
```

벽시계 29분 50초가 걸렸고, 이 시간에는 소스 다운로드가 포함됩니다. Buildroot는 단계별 시작·끝 시각을 `output/build/build-time.log`에 남깁니다. 이 파일을 패키지 묶음별로 합산했습니다(최상위 병렬 빌드를 켜지 않았으므로 단계가 순서대로 돌고, 합계 1,707초가 벽시계와 거의 같습니다).

| 묶음 | 다운로드 | 압축 해제·configure·build·install | 비고 |
|---|---:|---:|---|
| toolchain (binutils·gcc 2단계·glibc·linux-headers·gmp·mpfr·mpc) | 399초 | 477초 | glibc는 git 저장소에서 받아 다운로드만 338초 |
| 그 외 host 도구 (host-qemu·host-cmake·host-python3 등) | 178초 | 522초 | host-cmake 260초, host-qemu 93초 |
| linux 6.18.7 커널 | 0초 | 89초 | tarball은 linux-headers가 이미 받음 |
| target 패키지 (busybox·skeleton·initscripts·gcc-final 등 8개) | 30초 | 13초 | busybox build 6초 |

가장 무거운 것은 toolchain입니다. 다운로드를 빼고도 477초이고, 그중 glibc 빌드만 73초, host-gcc-final 빌드가 190초였습니다. 반대로 target 쪽 사용자 공간 패키지는 이 defconfig에서 busybox 정도라 13초에 끝났습니다. 이 defconfig는 QEMU 자체(`BR2_PACKAGE_HOST_QEMU=y`)까지 빌드하므로 host 도구 묶음이 toolchain과 비슷하게 큽니다.

두 번째 `make`는 아무것도 바꾸지 않았을 때 7.41초였습니다. 패키지는 모두 건너뛰고 rootfs 이미지 생성과 post-image 스크립트만 다시 돕니다.

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

Yocto로 같은 시스템을 빌드한 시간은 이 글에서 재지 않았습니다. 두 도구의 시간 비교는 같은 호스트에서 직접 재야 의미가 있고, 그 방법은 Ch 20에 정리했습니다.

## Yocto의 설계 철학

Yocto는 정반대 방향으로 갑니다. 핵심에 BitBake라는 별도의 빌드 엔진이 있고, *recipe*마다 *task*가 있고, task 입력의 *signature*가 같으면 미리 빌드된 sstate 산출물을 재사용합니다. openembedded-core의 `meta/conf/bitbake.conf`는 그 저장 위치를 `SSTATE_DIR ?= "${TOPDIR}/sstate-cache"`로 정의합니다.

```text
$ source oe-init-build-env
$ bitbake core-image-minimal
```

겉보기는 두 줄이지만 그 뒤에는 다음 장치가 있습니다.

- **레이어 시스템** — `meta`, `meta-poky`, vendor·BSP 레이어가 쌓이고, `.bbappend`로 아래 레이어의 recipe를 덧씌웁니다.
- **sstate-cache** — task 산출물을 signature로 캐시합니다.
- **패키지 feed** — recipe 결과를 ipk/rpm/deb로 나눕니다.
- **SDK 생성** — `bitbake -c populate_sdk <image>`로 외부 개발자용 SDK를 만듭니다.

기능은 강력합니다. 다만 처음 입문하는 비용이 큽니다. recipe 하나 추가하려면 BitBake의 task graph, `do_compile`/`do_install`/`do_package` 흐름, sstate 무효화 규칙을 알아야 합니다.

## 한눈에 비교

| 항목 | Buildroot 2026.02.3 | Yocto/OE |
|---|---|---|
| **엔진** | GNU Make | BitBake |
| **설정** | Kconfig (`.config`, defconfig) | `.conf` + `.bb` recipe |
| **트리에 든 패키지 정의** | `package/` 아래 디렉터리 2,941개 | oe-core scarthgap `meta/`의 `.bb` 920개 (+ 추가 레이어) |
| **재빌드 판단** | 사용자 책임 (매뉴얼 명시) | task signature로 자동 |
| **산출물 재사용 계층** | 없음 (`dl/`·ccache만) | sstate-cache |
| **packaging** | rootfs 이미지 | ipk/rpm/deb feed |
| **SDK 생성** | `make sdk`로 toolchain + sysroot tarball | `populate_sdk`, eSDK |
| **외부 트리** | `BR2_EXTERNAL` (덧씌우기 불가) | 레이어 + `.bbappend` |
| **첫 빌드 (이 VM, QEMU defconfig)** | 29분 50초 | 측정하지 않음 |

패키지 정의 수는 두 저장소에서 `ls -d package/*/ | wc -l`, `find meta -name '*.bb' | wc -l`로 센 값입니다. oe-core는 의도적으로 작은 핵심이고, 나머지 recipe는 meta-openembedded 같은 별도 레이어에 있습니다. 그래서 "Buildroot가 패키지가 더 많다"가 아니라 "Buildroot는 한 저장소에 다 들어 있다"로 읽어야 합니다.

## Buildroot가 적합한 경우

다음 상황에서 Buildroot가 잘 맞습니다.

- **단일 보드, 단일 이미지**를 만드는 프로젝트. 한 output 디렉터리가 한 설정이라는 모델과 그대로 맞습니다.
- **이미지 통째 교체로 갱신**하는 제품. FAQ가 말하는 "complete system upgrades"와 같은 방향입니다.
- **빌드 시스템 전담 인력이 없는** 팀. 패키지 하나가 `Config.in`과 `.mk` 두 파일이라(Ch 5), 읽고 고칠 대상이 작습니다.
- **빠른 iteration**이 중요한 단계. 위 측정에서 변경 없는 재빌드는 7초, busybox 한 패키지 재빌드(`make busybox-rebuild`)는 8초였습니다.

## Yocto가 적합한 경우

반대로 다음 상황에서는 Yocto가 더 잘 맞습니다.

- **여러 보드를 한 코드베이스에서** 동시에 관리할 때. MACHINE conf와 image recipe가 분리돼 있습니다.
- **런타임 패키지 설치**가 필요한 제품. Buildroot는 binary 패키지를 만들지 않습니다.
- **외부 개발자에게 확장 가능한 SDK를 배포**해야 할 때. eSDK에서 `devtool`로 recipe를 추가할 수 있습니다.
- **vendor BSP가 Yocto 레이어로 배포**되는 경우. OpenEmbedded Layer Index에 `meta-freescale`, `meta-ti-bsp`, `meta-xilinx-core`, `meta-qcom` 같은 vendor 레이어가 등록돼 있습니다.

조직이 커지고 제품 라인이 늘어나면 Buildroot의 단순함이 *제약*으로 바뀝니다. 그 신호를 읽는 법은 Ch 20에서 다룹니다.

## 실제로 어디에 쓰이는가

설계 철학은 채택 사례로 봐야 구체화됩니다. 여기서는 1차 자료로 확인한 것만 적습니다.

- **Buildroot 본체가 직접 지원하는 보드** — 2026.02.3의 `configs/`에는 defconfig 308개가 있습니다. `freescale_imx8mpevk_defconfig`, `beaglebone_defconfig`, `raspberrypi4_64_defconfig` 같은 보드 설정과 QEMU용 46개가 포함됩니다.
- **Buildroot 위에 BSP·SDK를 얹는 제3자 프로젝트** — 매뉴얼 "About Buildroot"는 "a number of third-party projects are based on, or develop their BSP or SDK on top of Buildroot"라고 적습니다.
- **Yocto 기반 배포판** — Automotive Grade Linux(`meta-agl`)와 webOS Open Source Edition(`meta-webosose`)은 OpenEmbedded Layer Index에 레이어로 등록돼 있습니다.

같은 FAQ는 배포판이 필요하면 "Open Embedded, or openWRT"가 더 맞는 도구라고 직접 권합니다. 두 도구가 서로를 대체하려 하지 않고 역할을 나눠 갖는다는 점을 Buildroot 개발자들이 스스로 밝힌 셈입니다.

## 결정 트리

당장 어느 쪽으로 갈지 막막하면 다음 흐름이 출발점이 됩니다.

| 질문 | 답이 *Yes*면 | 답이 *No*면 |
|---|---|---|
| 1. Vendor BSP가 *Yocto layer*로만 옵니까? | Yocto | 2번으로 |
| 2. 보드 여러 개를 *동시에* 같은 코드베이스로 유지합니까? | Yocto 검토 | 3번으로 |
| 3. 런타임에 패키지를 설치·삭제해야 합니까? | Yocto | 4번으로 |
| 4. *외부 개발자가 SDK에 recipe를 추가*해야 합니까? | Yocto (eSDK) | 5번으로 |
| 5. 빌드 시스템 전담 인력이 있습니까? | 둘 다 가능 | Buildroot |

OTA·A/B 업데이트는 이 표에서 뺐습니다. Buildroot에도 RAUC·SWUpdate·Mender 패키지가 있어서(Ch 16) 두 도구를 가르는 질문이 아닙니다.

## 그 외 옵션

선택지가 둘만 있는 것은 아닙니다.

- **OpenWrt** — 라우터·게이트웨이용 배포판이자 빌드 시스템입니다. Buildroot FAQ가 배포판을 원하면 쓰라고 권하는 도구입니다.
- **PTXdist** — Pengutronix가 유지하는 Kconfig 기반 빌드 시스템입니다.
- **Debian / Ubuntu Core** — 배포판 기반 접근입니다. 빌드 시스템이 아니라 미리 빌드된 패키지를 조합합니다.

이 시리즈는 Buildroot에 집중합니다.

## 가벼운 실습 — qemu_aarch64_virt

이 시리즈는 두 보드를 메인 예시로 씁니다.

| 보드 | 역할 | defconfig |
|---|---|---|
| **QEMU AArch64 virt** | 실 하드웨어 없이 검증 | `qemu_aarch64_virt_defconfig` |
| **BeagleBone Black** | 실 하드웨어, SD 카드 이미지 | `beaglebone_defconfig` |

Ch 4에서 QEMU 흐름을 처음부터 끝까지 따라가고, Ch 10에서 BeagleBone Black용 SD 카드 이미지를 만듭니다.

다음은 위에서 시간을 잰 빌드의 명령과 산출물입니다.

```text
$ git clone --depth=1 --branch 2026.02.3 https://gitlab.com/buildroot.org/buildroot.git
$ cd buildroot
$ make qemu_aarch64_virt_defconfig
$ make
$ ls -l output/images/
total 21480
-rw-r--r-- 1 br br 13236736 Nov 16 03:06 Image
-rw-r--r-- 1 br br 62914560 Nov 16 03:07 rootfs.ext2
lrwxrwxrwx 1 br br       11 Nov 16 03:07 rootfs.ext4 -> rootfs.ext2
-rwxr-xr-x 1 br br      819 Nov 16 03:07 start-qemu.sh
```

`Image`는 13 MB짜리 커널, `rootfs.ext2`는 defconfig가 정한 60 MiB 크기의 ext4 이미지(`rootfs.ext4`는 그 symlink), `start-qemu.sh`는 QEMU 부팅 스크립트입니다. `rootfs.ext2`가 디스크에서 실제로 차지하는 블록은 `du` 기준 8.6 MB였고, 부팅 뒤 `df -h /`는 51.1M 중 4.1M 사용을 보였습니다. 이 단순한 산출물 구조 자체가 Buildroot의 정체성입니다.

## 숫자로 보는 규모

같은 빌드의 디스크 사용량입니다(`du -sh`).

| 항목 | 크기 |
|---|---:|
| `dl/` (소스 47개 디렉터리) | 1.2 GB |
| `dl/glibc` (git 저장소째 받음) | 631 MB |
| `output/` 전체 | 14 GB |
| `output/build/` (패키지별 빌드 디렉터리 70개) | 13 GB |
| `output/host/` (cross toolchain + host 도구) | 1.1 GB |
| `output/target/` | 4.4 MB |
| `output/images/` | 21 MB |

최종 rootfs의 재료인 `target/`은 4.4 MB인데 `output/`은 14 GB입니다. 그 대부분은 빌드 디렉터리에 풀린 gcc·glibc·qemu 소스와 오브젝트입니다. Ch 4에서 이 디렉터리를 하나씩 봅니다.

## 자주 하는 오해

Buildroot를 처음 접하면 흔히 빠지는 오해가 몇 가지 있습니다.

- **"Buildroot는 배포판이다."** 아닙니다. FAQ 표현으로 "Buildroot is not meant to be a distribution"입니다. 런타임 패키지 매니저가 없고, 패키지 추가는 다시 빌드해서 이미지를 교체하는 방식입니다.
- **"패키지 옵션을 바꾸면 다음 make가 알아서 다시 빌드한다."** 아닙니다. 매뉴얼은 "once a package has been built, it is never rebuilt unless explicitly told to do so"라고 적습니다. 하위 옵션을 바꿨다면 `make <pkg>-reconfigure`나 `make <pkg>-dirclean`을, toolchain·아키텍처를 바꿨다면 `make clean all`을 씁니다.
- **"패키지를 빼면 rootfs에서도 빠진다."** 아닙니다. 같은 절은 "When a package is removed from the configuration, Buildroot does not do anything special"이라고 적습니다. 지우려면 전체 재빌드가 필요합니다.

## 정리

- Buildroot는 GNU Make와 Kconfig로 toolchain·커널·부트로더·rootfs를 cross-compile해 묶는 도구이고, binary 패키지를 일부러 만들지 않습니다.
- Yocto는 BitBake·레이어·sstate·패키지 feed를 갖춘 유연한 도구입니다.
- 이 VM에서 `qemu_aarch64_virt_defconfig` 첫 빌드는 29분 50초였고, 다운로드를 뺀 시간의 가장 큰 몫은 toolchain(477초)과 host-qemu를 포함한 host 도구(522초)였습니다.
- 변경 없는 재빌드는 7.41초, busybox 한 패키지 재빌드는 8.03초였습니다.
- Buildroot는 설정 변경 후 무엇을 다시 빌드할지 추적하지 않고, 그 판단을 사용자에게 맡긴다고 매뉴얼에 적혀 있습니다.
- Vendor BSP가 어느 쪽 형태로 오는지가 실무에서 결정적 요인이 될 때가 많습니다.
- 이 시리즈는 QEMU AArch64와 BeagleBone Black을 메인 예시 보드로 씁니다.

## 다음 장 예고

다음 편은 **Ch 2: 디렉터리 구조**. Buildroot 트리의 6개 핵심 디렉터리가 각각 무엇을 담당하는지 살펴봅니다.


## 관련 항목

- [Ch 2: 디렉터리 구조](/blog/embedded/buildroot/chapter02-directory-structure)
- [Ch 4: 첫 빌드 — QEMU에서 동작하는 시스템](/blog/embedded/buildroot/chapter04-first-build)
- [Ch 10: 실전 — BeagleBone Black 시스템 처음부터 끝까지](/blog/embedded/buildroot/chapter10-real-board)
- [Ch 20: Yocto로의 마이그레이션](/blog/embedded/buildroot/chapter20-yocto-migration) — 두 도구의 개념 매핑과 이전 신호
- [BSP Development Ch 16: Buildroot/Yocto와 BSP — rootfs 통합](/blog/embedded/bsp/chapter16-rootfs) — BSP 관점에서 빌드 시스템 선택
- [원문 — Buildroot Manual](https://buildroot.org/downloads/manual/manual.html)
- [원문 — Buildroot FAQ: Why doesn't Buildroot generate binary packages?](https://buildroot.org/downloads/manual/manual.html#faq-no-binary-packages)
