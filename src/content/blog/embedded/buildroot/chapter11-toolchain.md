---
title: "Buildroot Toolchain 선택 — Internal vs External 비교"
slug: "embedded/buildroot/chapter11-toolchain"
date: 2026-05-19T09:11:00
description: "Buildroot toolchain 결정 — internal toolchain의 빌드 비용과 external toolchain(Bootlin·Arm·custom)의 호스트·ABI 제약을 실제 빌드 기록으로 비교합니다."
series: "Buildroot Practical"
seriesOrder: 11
tags: [embedded, buildroot, toolchain, cross-compile, glibc]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Toolchain은 *첫 빌드 시간*과 *전체 ABI*를 함께 결정합니다."** — Buildroot가 직접 toolchain까지 빌드하면 모든 결정이 트리 안에 남지만 오래 걸립니다. 외부 toolchain을 가져오면 빨리 시작하지만, 호스트·헤더·libc 조건을 맞춰야 합니다.

## 왜 toolchain이 별도의 장 한 개를 차지하는가

Ch 1의 QEMU 빌드에서 다운로드를 뺀 작업 시간 중 toolchain 묶음이 477초로 가장 큰 덩어리였습니다. 또 toolchain은 *전체 시스템의 ABI*를 정합니다. C 라이브러리, GCC 버전, 커널 헤더 버전이 정해지면 그 위의 모든 패키지가 영향을 받습니다. 집을 지을 때 기초 콘크리트를 고르는 것과 같아서, 나중에 바꾸면 위층을 전부 다시 지어야 합니다. 매뉴얼 "Cross-compilation toolchain" 절도 toolchain 옵션을 바꾸면 "the entire toolchain and system must be rebuilt"라고 적습니다.

이 장은 두 결정을 다룹니다. 하나는 *internal vs external toolchain*, 다른 하나는 *external이라면 어떤 배포본*을 쓸지입니다. 사실과 수치는 **Buildroot 2026.02.3**의 `toolchain/`·`package/gcc` 소스와, 이 시리즈에서 같은 VM으로 돌린 두 빌드(Ch 1의 QEMU internal toolchain, Ch 10의 BeagleBone external toolchain)의 `build-time.log`에서 가져왔습니다.

## Internal toolchain — Buildroot가 직접 빌드

기본 선택입니다. `qemu_aarch64_virt_defconfig`를 펼치면 toolchain 줄은 다음과 같았습니다(Ch 3).

```text
BR2_TOOLCHAIN_BUILDROOT=y
BR2_TOOLCHAIN_BUILDROOT_GLIBC=y
BR2_BINUTILS_VERSION="2.44"
BR2_GCC_VERSION="14.3.0"
BR2_KERNEL_HEADERS_AS_KERNEL=y
```

실제 빌드 순서는 *binutils → gcc-initial → 커널 헤더 → glibc → gcc-final*이었습니다(Ch 4). `build-time.log`의 단계별 시간입니다.

| 패키지 | 다운로드 | 그 외 단계 합 | 비고 |
|---|---:|---:|---|
| host-binutils 2.44 | — | 26.1초 (패키지 전체) | |
| host-gcc-initial 14.3.0 | — | 136.9초 (패키지 전체) | |
| linux-headers 6.18.7 | — | 35.6초 (패키지 전체) | 커널 tarball 다운로드 포함 |
| glibc 2.42-67-g4ebd33dd… | 337.8초 | 89.5초 (build 73.4초) | git 저장소에서 받음 |
| host-gcc-final 14.3.0 | 0.1초 | 204.6초 (build 189.9초) | |

장점은 모든 결정이 이 트리의 `.config`에 있다는 점입니다.

- **재현 기준이 트리 안에 있음** — binutils·gcc·libc 버전과 패치가 Buildroot 태그에 고정됩니다.
- **커널 헤더를 빌드하는 커널에 맞춤** — `BR2_KERNEL_HEADERS_AS_KERNEL=y`로 헤더 버전이 커널(6.18.7)과 같습니다.
- **libc 전환이 옵션 하나** — `toolchain/toolchain-buildroot/Config.in`의 "C library" choice에 uClibc-ng, glibc, musl이 있고 기본값은 glibc입니다.
- **ccache가 output 디렉터리를 넘어 공유됨** — `package/gcc/gcc.mk` 334행이 gcc 설정을 hash해 wrapper에 넣고, wrapper가 `CCACHE_COMPILERCHECK=string:<hash>`로 씁니다(Ch 14).

단점은 *시간*입니다. 위 표만 더해도 다운로드를 빼고 약 490초, glibc를 git으로 받는 시간까지 더하면 13분을 넘었습니다. `make clean`을 할 때마다 이 시간이 다시 듭니다. 매뉴얼의 internal backend 단점 목록도 "Rebuilding the toolchain is needed when doing `make clean`, which takes time"입니다.

## External toolchain — pre-built 받아 쓰기

`BR2_TOOLCHAIN_EXTERNAL=y`로 전환하면 Buildroot는 toolchain을 빌드하지 않고 받아 풀기만 합니다. Ch 10의 BeagleBone 빌드가 그 경우였고, `build-time.log`의 toolchain 줄은 다음과 같았습니다.

| 단계 | 시간 |
|---|---:|
| download | 963.2초 |
| extract | 14.5초 |
| install-staging (sysroot 복사) | 3.6초 |
| install-target (libc 등 복사) | 0.6초 |

이 빌드의 다운로드는 VM의 느린 네트워크 탓에 오래 걸렸지만, *받은 뒤* 쓸 수 있게 되기까지는 20초가 안 걸렸습니다. internal toolchain의 약 490초와 비교되는 숫자입니다. 한 번 받은 tarball은 `dl/`에 남으므로, `make clean` 뒤나 CI의 다음 빌드에서는 압축 해제 시간만 듭니다.

대신 제약이 생깁니다.

- **헤더·libc·GCC 버전이 toolchain에 고정** — Buildroot는 그 값을 `.config`에 *선언*해야 하고, 실제 toolchain과 맞는지 빌드 시작 때 검사합니다(아래 "custom" 절).
- **호스트 아키텍처 제약** — 미리 빌드된 toolchain은 특정 호스트용 실행 파일입니다. Ch 10에서 본 것처럼 Bootlin toolchain은 `depends on BR2_HOSTARCH = "x86_64"`라, aarch64 호스트에서는 선택되지 않고 다른 toolchain으로 바뀌었습니다.
- **gcc 자체 패치 불가** — `package/gcc/<version>/*.patch` 같은 패치는 internal toolchain에만 적용됩니다.

## Internal vs external — 한눈에 비교

| 항목 | Internal | External |
|---|---|---|
| **toolchain 단계 시간 (이 시리즈 실측)** | 약 490초 + glibc git 다운로드 338초 | 압축 해제·설치 약 19초 + tarball 다운로드 |
| **libc 선택** | glibc / musl / uClibc-ng | toolchain이 고정 |
| **kernel headers** | `BR2_KERNEL_HEADERS_AS_KERNEL` 등으로 선택 | toolchain에 포함된 버전 |
| **gcc 패치** | `package/gcc/…/*.patch` 적용 | 불가능 |
| **호스트** | Buildroot가 지원하는 Linux 호스트 | toolchain 배포본이 지원하는 호스트만 |
| **재현 기준** | Buildroot 태그 | Buildroot 태그 + 외부 tarball (hash로 검증) |

## External toolchain — 배포본

2026.02.3의 `toolchain/toolchain-external/`에는 다음 디렉터리가 있습니다.

```text
toolchain-external-arm-aarch64
toolchain-external-arm-aarch64-be
toolchain-external-arm-arm
toolchain-external-bootlin
toolchain-external-custom
toolchain-external-synopsys-arc
```

### Bootlin toolchain

`toolchain-external-bootlin/Config.in.options`에 아키텍처·libc·stable/bleeding-edge 조합이 나열됩니다(예: `BR2_TOOLCHAIN_EXTERNAL_BOOTLIN_AARCH64_GLIBC_STABLE`, `…_ARMV7_EABIHF_GLIBC_STABLE`). 본체 `beaglebone_defconfig`가 이 toolchain을 씁니다. 다만 위에서 말한 대로 x86_64 호스트 전용입니다.

### Arm GNU Toolchain

`toolchain-external-arm-aarch64`("Arm AArch64 14.2.rel1")와 `toolchain-external-arm-arm`("Arm ARM 14.2.rel1")입니다. `depends on BR2_HOSTARCH = "x86_64" || BR2_HOSTARCH = "aarch64"`라서 aarch64 호스트에서도 쓸 수 있고, 이 시리즈의 arm64 VM에서 Ch 10 빌드가 실제로 `BR2_TOOLCHAIN_EXTERNAL_ARM_ARM=y`로 진행됐습니다. 32비트 ARM 쪽은 `depends on BR2_ARM_CPU_HAS_NEON`, `depends on BR2_ARM_EABIHF`가 있어 Cortex-A8(AM335x)처럼 NEON이 있는 hard-float 설정에서만 보입니다.

### Linaro toolchain

2026.02.3에는 Linaro 프로필이 없습니다. `Config.in.legacy`에 `BR2_TOOLCHAIN_EXTERNAL_LINARO_AARCH64`가 "Linaro AArch64 2018.05 is no longer maintained and has been removed from Buildroot"로 남아 있을 뿐입니다. 예전 defconfig에 이 줄이 있으면 Legacy 메뉴에 걸립니다(Ch 4).

### Custom external — 지원되는 toolchain만 가져오기

`BR2_TOOLCHAIN_EXTERNAL_CUSTOM`은 위 목록에 없는 toolchain을 직접 지정합니다. 매뉴얼은 crosstool-NG나 Buildroot 자신이 만든 toolchain은 지원하지만, OpenEmbedded/Yocto SDK는 지원하지 않는다고 분명히 적습니다.

```text
We do not support toolchains or SDK generated by OpenEmbedded or
Yocto, because these toolchains are not pure toolchains (i.e. just the
compiler, binutils, the C and C++ libraries). Instead these toolchains
come with a very large set of pre-compiled libraries and
programs.
```

custom toolchain의 주요 옵션 이름은 `toolchain-external/Config.in`과 `toolchain-external-custom/Config.in.options`에 있습니다.

```text
BR2_TOOLCHAIN_EXTERNAL=y
BR2_TOOLCHAIN_EXTERNAL_CUSTOM=y
BR2_TOOLCHAIN_EXTERNAL_PREINSTALLED=y
BR2_TOOLCHAIN_EXTERNAL_PATH="/opt/vendor/cross-toolchain"
BR2_TOOLCHAIN_EXTERNAL_CUSTOM_PREFIX="aarch64-linux-gnu"
BR2_TOOLCHAIN_EXTERNAL_HEADERS_5_15=y
BR2_TOOLCHAIN_EXTERNAL_GCC_12=y
BR2_TOOLCHAIN_EXTERNAL_CUSTOM_GLIBC=y
BR2_TOOLCHAIN_EXTERNAL_CXX=y
```

| 옵션 | 의미 |
|---|---|
| `_PREINSTALLED` / `_DOWNLOAD` | 이미 설치된 경로를 쓸지, `BR2_TOOLCHAIN_EXTERNAL_URL`에서 받을지 |
| `_PATH` | toolchain 설치 디렉터리 |
| `_CUSTOM_PREFIX` | 실행 파일 이름 앞부분 (`aarch64-linux-gnu-gcc`의 `aarch64-linux-gnu`) |
| `_HEADERS_*` | toolchain에 *포함된* 커널 헤더 버전 |
| `_GCC_*` | GCC 버전 |
| `_CUSTOM_GLIBC` / `_CUSTOM_MUSL` / `_CUSTOM_UCLIBC` | libc 종류 (musl 프롬프트는 "musl (experimental)") |
| `_INET_RPC`, `_CXX`, `_HAS_SSP` 등 | toolchain이 가진 기능 |

이 선언이 실제 toolchain과 다르면 Buildroot가 빌드 시작 때 멈춥니다. 매뉴얼은 "At the beginning of the execution, Buildroot will tell you if the selected options do not match the toolchain configuration"이라고 적고, 검사 코드는 `toolchain/helpers.mk`에 있습니다. 헤더는 `support/scripts/check-kernel-headers.sh`, GCC는 `check_gcc_version`이 확인하며 메시지는 다음 형식입니다(소스의 printf 문자열).

```text
Incorrect selection of kernel headers: expected %d.%d.x, got %d.%d.x
Incorrect selection of gcc version: expected %s.x, got %s
```

그래서 헤더 버전을 잘못 적으면 *조용히 다른 헤더로 빌드*되는 것이 아니라 이 메시지로 멈춥니다. 선언할 값은 toolchain에서 직접 읽습니다.

```bash
/opt/vendor/cross-toolchain/bin/aarch64-linux-gnu-gcc -dumpversion
grep LINUX_VERSION_CODE "$(/opt/vendor/cross-toolchain/bin/aarch64-linux-gnu-gcc -print-sysroot)/usr/include/linux/version.h"
```

## ABI 호환성 — 무엇이 일치해야 하는가

External toolchain을 쓰면 ABI 일치가 사용자 책임으로 돌아옵니다.

| 항목 | 일치 의미 |
|---|---|
| **architecture / ABI** | aarch64 / armv7-a hard-float 등 |
| **CPU variant** | 같은 instruction set family |
| **C library** | glibc·musl·uClibc-ng 중 하나 |
| **kernel headers** | 빌드에 쓴 헤더 버전 ≤ 실행할 커널 버전 |
| **endianness / float ABI** | LE/BE, soft/hard |

가장 자주 사고를 내는 것이 *헤더 ≤ 실행 커널* 조건입니다. userspace가 헤더에 있는 새 syscall을 쓰는데 실행하는 커널이 더 오래돼 그 syscall이 없으면 `ENOSYS`가 납니다. internal toolchain + `BR2_KERNEL_HEADERS_AS_KERNEL`은 이 조건을 구조적으로 맞춥니다.

## 흔한 실패 — sysroot mismatch

External toolchain을 쓰면 Buildroot는 toolchain의 sysroot를 staging으로 *복사*하고 그 위에 패키지가 헤더·라이브러리를 더합니다. Ch 10 로그의 `Copying external toolchain sysroot to staging...` 줄이 그 단계입니다. 그래서 toolchain sysroot에 이미 들어 있는 라이브러리를 Buildroot 패키지로 다시 빌드하면, 같은 이름의 헤더·`.so`가 겹칩니다. 매뉴얼이 OE/Yocto SDK를 지원하지 않는 이유가 바로 이것입니다("Buildroot cannot import the 'sysroot' of the toolchain, as it would contain hundreds of megabytes of pre-compiled libraries").

## 흔한 실패 — `GLIBC_2.xx not found`

보드에서 application을 실행할 때 `version 'GLIBC_2.xx' not found`가 나오면, 빌드에 쓴 glibc가 보드의 glibc보다 새롭다는 뜻입니다. 해결은 다음 중 하나입니다.

- 보드의 rootfs를 같은 Buildroot 빌드로 업데이트합니다.
- application을 그 rootfs를 만든 toolchain(또는 그 SDK, Ch 17)으로 빌드합니다.
- 정적 링크합니다.

## 흔한 실패 — multilib 부재

Buildroot의 한 output 디렉터리는 하나의 ABI를 위한 rootfs를 만듭니다. 32비트 binary를 64비트 rootfs에서 함께 돌려야 한다면, 32비트용 output을 따로 빌드해 산출물을 합치는 방법을 검토합니다. 이 결정은 prototyping 단계에서 미리 해 두는 편이 낫습니다.

## libc 선택 — glibc / musl / uClibc-ng

internal toolchain이면 `toolchain/toolchain-buildroot/Config.in`의 "C library" choice에서 고릅니다. 세 libc의 크기와 호환성 비교는 이 장에서 직접 재지 않았습니다. 대신 Buildroot 쪽에서 확인할 수 있는 사실은 다음과 같습니다.

- 기본값은 glibc이고, 각 libc는 `BR2_PACKAGE_<LIBC>_SUPPORTS`(아키텍처 지원)에 의존합니다.
- 패키지 `Config.in`에는 libc 조건이 자주 나옵니다. Ch 9의 htop처럼 `depends on !BR2_STATIC_LIBS`, `BR2_TOOLCHAIN_USES_GLIBC` 같은 조건으로 musl·uClibc-ng에서 빠지는 패키지가 있습니다.
- glibc 자체도 커널 헤더 하한이 있습니다(`comment "glibc needs a toolchain w/ kernel headers >= 3.2"` 등).

크기가 목표라면 같은 defconfig를 libc만 바꿔 두 번 빌드하고 `output/target`의 크기를 비교하는 것이 가장 확실합니다.

## 검증 절차

toolchain을 정한 뒤 빌드된 binary로 ABI를 확인합니다. 아래는 이 시리즈의 빌드에서 확인한 값입니다.

Ch 14의 외부 toolchain 빌드(qemu_aarch64_virt + `BR2_TOOLCHAIN_EXTERNAL=y`, 이 arm64 호스트에서 Arm AArch64 14.2.rel1이 선택됨)의 busybox입니다.

```text
$ aarch64-none-linux-gnu-readelf -d target/bin/busybox | grep NEEDED
 0x0000000000000001 (NEEDED)             Shared library: [libresolv.so.2]
 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]
 0x0000000000000001 (NEEDED)             Shared library: [ld-linux-aarch64.so.1]
$ aarch64-none-linux-gnu-readelf -V target/bin/busybox | grep -oE "GLIBC_[0-9.]+" | sort -uV | tail -3
GLIBC_2.33
GLIBC_2.34
GLIBC_2.38
```

가장 높은 `GLIBC_2.38`이 이 binary가 요구하는 glibc 최저 버전입니다. 보드의 glibc가 이보다 오래되면 앞 절의 `GLIBC_2.xx not found`가 납니다. 같은 toolchain의 헤더 버전은 sysroot의 `linux/version.h`에서 읽습니다.

```text
#define LINUX_VERSION_CODE 267277
```

267277 = 4 × 65536 + 20 × 256 + 13, 즉 커널 헤더 4.20.13입니다. 이 toolchain의 Kconfig가 `.config`에 남긴 `BR2_TOOLCHAIN_HEADERS_AT_LEAST="4.20"`과 맞습니다. 빌드한 커널은 6.18.7이므로 "헤더 ≤ 실행 커널" 조건을 만족합니다. 반대로 internal toolchain + `BR2_KERNEL_HEADERS_AS_KERNEL`이면 헤더가 6.18이 됩니다.

`readelf`는 Buildroot가 `output/host/bin/`에 넣어 주는 toolchain의 것을 씁니다(외부 toolchain이면 `aarch64-none-linux-gnu-readelf`, internal이면 `aarch64-buildroot-linux-gnu-readelf`).

## 정리

- Internal toolchain은 binutils → gcc-initial → 커널 헤더 → glibc → gcc-final로 빌드되고, 이 시리즈의 QEMU 빌드에서 다운로드를 빼고 약 490초가 들었습니다.
- External toolchain은 받은 뒤 압축 해제·설치가 약 19초였고, 대신 헤더·libc·GCC가 toolchain에 고정됩니다.
- 미리 빌드된 toolchain은 호스트 아키텍처를 탑니다. Bootlin은 x86_64 전용, Arm GNU는 x86_64·aarch64를 지원합니다.
- 2026.02.3에는 Linaro 프로필이 없고 Legacy 메뉴에만 남아 있습니다.
- custom toolchain의 헤더·GCC 선언이 틀리면 빌드 시작 때 "Incorrect selection of …"로 멈춥니다.
- OE/Yocto SDK는 pure toolchain이 아니라서 매뉴얼이 지원하지 않는다고 밝힙니다.
- 빌드 후 `readelf`로 interpreter·`NEEDED`·필요 GLIBC 버전을 확인합니다.

## 다음 장 예고

다음 편은 **Ch 12: Linux 커널 customize**. Toolchain 위에 *커널과 device tree*를 어떻게 정렬하는지 다룹니다.


## 관련 항목

- [Ch 4: 첫 빌드 — QEMU에서 동작하는 시스템](/blog/embedded/buildroot/chapter04-first-build) — toolchain 단계의 실제 흐름
- [Ch 12: Linux 커널 customize — defconfig fragment와 DTS](/blog/embedded/buildroot/chapter12-kernel-customize)
- [Ch 17: SDK 생성·배포 — make sdk와 application 워크플로](/blog/embedded/buildroot/chapter17-sdk) — toolchain을 application 개발자에게 배포
- [Ch 10: 실전 — BeagleBone Black](/blog/embedded/buildroot/chapter10-real-board) — 호스트 아키텍처 때문에 바뀐 외부 toolchain
- [BSP Development Ch 7: 크로스 컴파일 toolchain](/blog/embedded/bsp/chapter07-tfa-trustzone) — BSP 관점에서의 toolchain
- [원문 — Buildroot Manual: Cross-compilation toolchain](https://buildroot.org/downloads/manual/manual.html)
