---
title: "Ch 11: Toolchain 선택 — internal vs external"
date: 2026-05-19T11:00:00
description: "Buildroot toolchain 결정 — internal toolchain의 단순함과 external toolchain(Bootlin·Linaro·vendor SDK)의 속도·호환성 트레이드오프."
series: "Buildroot Practical"
seriesOrder: 11
tags: [embedded, buildroot, toolchain, cross-compile, glibc]
draft: false
---

## 한 줄 요약

> **"Toolchain은 *처음 30분*을 결정합니다."** — Buildroot가 직접 toolchain까지 빌드하면 깨끗하지만 느립니다. 외부 toolchain을 가져오면 즉시 시작하지만 호환성을 챙겨야 합니다.

## 왜 toolchain이 별도의 장 한 개를 차지하는가

Buildroot 빌드 시간의 *절반에서 2/3*가 toolchain 단계입니다. binutils → host-gcc stage1 → kernel headers → glibc stage1 → host-gcc stage2 → glibc stage2의 *6단계 부트스트랩*이 끝나야 첫 패키지가 빌드를 시작합니다. 처음 30분 ~ 1시간이 여기서 사라집니다.

또한 toolchain 결정은 *전체 시스템의 ABI*를 정합니다. C 라이브러리(glibc / musl / uClibc-ng) 선택, GCC 버전, kernel headers 버전이 한 번 정해지면 *그 위에 올리는 모든 패키지*가 영향을 받습니다. 잘못 고르면 두 달 뒤 vendor 라이브러리를 받았는데 *링크가 안 되는* 사태가 옵니다.

이 장은 두 결정을 다룹니다. 하나는 *internal vs external toolchain*, 다른 하나는 *external이라면 어떤 distribution*을 쓸지입니다.

## Internal toolchain — Buildroot가 직접 빌드

기본 선택입니다. `BR2_TOOLCHAIN_BUILDROOT=y`로 켜지며, Buildroot가 처음부터 끝까지 toolchain을 만듭니다.

```text
BR2_TOOLCHAIN_BUILDROOT=y
BR2_TOOLCHAIN_BUILDROOT_GLIBC=y          # 또는 _MUSL / _UCLIBC
BR2_GCC_VERSION_13_X=y
BR2_BINUTILS_VERSION_2_41_X=y
BR2_KERNEL_HEADERS_6_6=y
```

장점이 명확합니다.

- **재현성** — 같은 트리·같은 commit이면 *완전히 같은* toolchain.
- **외부 의존성 0** — vendor가 내일 망해도 빌드 가능.
- **kernel header를 임의로 선택** — Linux 6.6과 짝지을지 5.15와 짝지을지 자유.
- **세 가지 libc 자유 전환** — 같은 트리에서 musl·glibc 전환이 menuconfig 한 토글.

단점은 *시간*입니다.

- **첫 빌드 30 ~ 50분** — 빠른 워크스테이션 기준.
- **트리당 한 번씩** — `BR2_PER_PACKAGE_DIRECTORIES`를 안 켜면 변형 보드마다 다시 빌드.
- **CI 비용** — 한 PR마다 toolchain까지 다시 만들면 분 단위가 시간 단위로 늘어남.

다음 경우에 internal이 정답입니다.

- **프로토타이핑·학습** — 빠른 iteration보다 *이해*가 중요한 단계.
- **mainline에 가까운 시스템** — vendor SoC 특수성이 없는 경우.
- **재현성·법무가 중요한 제품** — 모든 source가 트리 안에 있어야 할 때.
- **musl·uClibc-ng**처럼 *vendor가 안 만들어 주는* libc를 쓸 때.

## External toolchain — pre-built 받아 쓰기

`BR2_TOOLCHAIN_EXTERNAL=y`로 전환합니다. Buildroot가 toolchain *빌드*를 건너뛰고 *받아 설치만* 합니다.

```text
BR2_TOOLCHAIN_EXTERNAL=y
BR2_TOOLCHAIN_EXTERNAL_DOWNLOAD=y
BR2_TOOLCHAIN_EXTERNAL_BOOTLIN=y         # 또는 LINARO/ARM/CUSTOM
BR2_TOOLCHAIN_EXTERNAL_BOOTLIN_AARCH64_GLIBC=y
```

장점은 단순합니다.

- **첫 빌드가 5분 ~ 10분** — toolchain은 다운로드만.
- **CI가 가벼움** — toolchain tarball을 한 번 캐시해 두면 모든 빌드가 즉시 시작.
- **vendor BSP와 호환** — vendor가 권장 toolchain을 명시한 경우 그대로 사용.

단점도 명확합니다.

- **fixed kernel headers·libc 버전** — toolchain이 *고정한 ABI*를 따라야 함.
- **외부 의존성** — 배포자가 사라지면 LTS 유지 어려움.
- **patches 불가능** — 발견된 GCC 버그를 *내가 직접 패치하기* 어려움.
- **musl·uClibc-ng 선택 제한** — Bootlin은 둘 다 제공하지만 vendor SDK는 보통 glibc 한정.

다음 경우에 external이 정답입니다.

- **CI 시간이 비용** — 매 PR마다 30분 toolchain을 다시 빌드하는 비용이 큰 경우.
- **vendor SDK 호환 요구** — Xilinx Vitis, NXP Yocto SDK 등 *fixed toolchain*이 spec.
- **여러 보드 공유** — 같은 architecture의 여러 변형 보드가 한 toolchain 공유.
- **재현성 < 속도** — prototyping·테스트 환경.

## Internal vs external — 한눈에 비교

| 항목 | Internal | External |
|---|---|---|
| **첫 빌드 시간** | 30 ~ 50분 | 5 ~ 10분 |
| **libc 선택** | glibc / musl / uClibc-ng | toolchain이 고정 |
| **kernel headers** | 자유롭게 선택 | toolchain이 고정 |
| **GCC patches** | `package/gcc/*.patch`로 가능 | 불가능 |
| **재현성** | source 전부 트리 안 | 외부 tarball에 의존 |
| **CI 친화도** | 무거움 | 가벼움 |
| **vendor SDK 호환** | 별도 작업 필요 | vendor toolchain 그대로 |
| **장기 유지보수** | 매우 강함 | 배포자 의존 |

실무에서는 *prototyping은 internal, 양산은 external*로 가는 경우가 많습니다. 양산 단계에서 빌드 시간이 *팀 전체*의 비용으로 누적되기 때문입니다.

## External toolchain — 4가지 distribution

External을 골랐다면 다음 후보 중에서 선택합니다.

### Bootlin toolchain

Buildroot 본가에서 제공하는 *공식 무료* toolchain. `toolchains.bootlin.com`에서 제공.

```text
BR2_TOOLCHAIN_EXTERNAL_BOOTLIN=y
BR2_TOOLCHAIN_EXTERNAL_BOOTLIN_AARCH64_GLIBC_STABLE=y
```

- **장점** — Buildroot 팀이 직접 빌드·테스트. 모든 ABI 조합 (glibc·musl·uClibc-ng × stable·bleeding-edge) 매트릭스 제공.
- **단점** — vendor 특수 patches 없음. 보드 BSP가 *vendor toolchain만 지원*한다고 명시하면 사용 불가.

처음 외부 toolchain을 시도한다면 *Bootlin부터*가 안전합니다.

### Linaro toolchain

ARM 생태계에서 오래 유지된 toolchain.

```text
BR2_TOOLCHAIN_EXTERNAL_LINARO_AARCH64=y
```

- **장점** — ARM-specific 최적화가 들어가 있음. embedded ARM 보드에서 *조금 더 빠른* 코드를 생성하는 경우가 있음.
- **단점** — Linaro의 별도 배포 주기. 최신 GCC가 늦게 들어옴.

대부분의 경우 Bootlin이 더 최신이라 사용 빈도가 줄어드는 추세.

### ARM GNU Toolchain

ARM 공식.

```text
BR2_TOOLCHAIN_EXTERNAL_ARM_AARCH64=y
```

- **장점** — ARM이 *직접* 빌드해 vendor와 같은 정렬. AArch64에서 안정적.
- **단점** — multiarch 변형(big-endian, soft-float)이 제한적.

ARM 보드의 *공식 reference 환경*과 일치시킬 때 선택.

### Custom external — vendor SDK 그대로

NXP·TI·Xilinx 등 SoC vendor가 *자체 toolchain*을 배포하는 경우 그대로 가져와 씁니다.

```text
BR2_TOOLCHAIN_EXTERNAL_CUSTOM=y
BR2_TOOLCHAIN_EXTERNAL_PATH="/opt/nxp/imx-toolchain/aarch64-poky-linux"
BR2_TOOLCHAIN_EXTERNAL_PREFIX="aarch64-poky-linux"
BR2_TOOLCHAIN_EXTERNAL_HEADERS_5_15=y
BR2_TOOLCHAIN_EXTERNAL_GCC_12=y
BR2_TOOLCHAIN_EXTERNAL_GLIBC=y
BR2_TOOLCHAIN_EXTERNAL_INET_RPC=y
BR2_TOOLCHAIN_EXTERNAL_CXX=y
```

각 항목의 의미는 다음과 같습니다.

| 옵션 | 의미 |
|---|---|
| `EXTERNAL_PATH` | toolchain 설치 디렉터리. 보통 `/opt/...` |
| `EXTERNAL_PREFIX` | binary prefix. `aarch64-poky-linux-gcc`가 있으면 `aarch64-poky-linux` |
| `EXTERNAL_HEADERS_*` | kernel headers 버전 (toolchain에 *동봉된* 헤더의 버전) |
| `EXTERNAL_GCC_*` | GCC 버전 |
| `EXTERNAL_GLIBC` | glibc/musl/uClibc 어느 것 |
| `EXTERNAL_INET_RPC` | RPC 헤더 포함 (네트워크 RPC 패키지가 요구) |
| `EXTERNAL_CXX` | libstdc++ 포함 |

**정확한 메타데이터 작성**이 결정적입니다. headers 버전을 6.6으로 잘못 적으면 *Buildroot가 6.6용 헤더로 패키지를 빌드*하지만 *실제 toolchain은 5.15 헤더*라 syscall이 어긋납니다. 검증은 다음 명령으로.

```bash
$ /opt/nxp/imx-toolchain/aarch64-poky-linux/bin/aarch64-poky-linux-gcc -v
gcc version 12.3.0 ...
$ /opt/.../bin/aarch64-poky-linux-gcc -dumpspecs | grep version    # GCC
$ cat /opt/.../aarch64-poky-linux/include/linux/version.h          # kernel headers
$ /opt/.../bin/aarch64-poky-linux-gcc --print-multi-os-directory   # libc 위치
```

확인된 결과를 *그대로* Kconfig에 옮기는 게 가장 안전합니다.

## ABI 호환성 — 무엇이 일치해야 하는가

External toolchain을 쓰면 *ABI 일치*가 책임으로 돌아옵니다. 다음 항목들이 정확히 짝을 이뤄야 합니다.

| 항목 | 일치 의미 |
|---|---|
| **architecture / ABI** | aarch64 / armv7-a hf / armv7-a sf 등 |
| **CPU variant** | cortex-a53 / a72 / a76 등 (적어도 *호환 family*) |
| **C library** | glibc·musl·uClibc-ng 중 하나가 일관 |
| **kernel headers** | 빌드 시 헤더 ≤ 실행 시 커널 |
| **GCC ABI version** | 같은 major (특히 C++ ABI는 깨지기 쉬움) |
| **endianness** | LE/BE 같음 |
| **float ABI** | soft / hard / softfp 일치 |

이 중 *headers ≤ runtime kernel* 규칙이 가장 자주 사고를 일으킵니다. toolchain이 kernel headers 5.15로 빌드됐는데 보드 커널이 5.10이라면 *런타임에 ENOSYS*가 납니다. 반대 방향(빌드 5.10, 런타임 5.15)은 OK입니다.

## 흔한 실패 — sysroot mismatch

External toolchain의 sysroot는 *toolchain이 가지고 있는 디렉터리*입니다.

```text
$ aarch64-poky-linux-gcc --print-sysroot
/opt/nxp/.../aarch64-poky-linux/aarch64-poky-linux/sysroot/
```

Buildroot는 이 sysroot를 *그대로* 사용하지 *않습니다*. 대신 staging 디렉터리에 *복사한 뒤* 패키지가 설치하는 헤더·`.so`를 추가합니다.

```text
output/staging/
├── usr/
│   ├── include/      ─ toolchain 헤더 + 패키지 헤더
│   ├── lib/          ─ toolchain lib + 패키지 lib
│   └── lib/pkgconfig/  ─ pkg-config 정보
```

문제는 *toolchain sysroot 안의 라이브러리*와 *패키지가 설치한 라이브러리*가 *충돌*하는 경우입니다. 가장 흔한 사례:

```text
package/libfoo: requires openssl >= 3.0
toolchain sysroot: openssl 1.1.1 (vendor가 같이 배포)
output/staging:    openssl 3.2 (Buildroot package)
```

링크 시 어느 것을 찾을지 모호해집니다. 해결은 *vendor toolchain의 sysroot 안 라이브러리를 제거*하거나, *그 패키지를 사용하지 않는 것*. Buildroot는 `BR2_TOOLCHAIN_EXTERNAL_LIBS_CLEANUP` 같은 옵션으로 일부를 자동 정리하지만 *완전 자동화는 불가능*합니다.

## 흔한 실패 — `GLIBC_2.38 not found`

런타임 보드에서 application 실행 시 다음 에러를 자주 봅니다.

```text
./myapp: /lib/aarch64-linux-gnu/libc.so.6: version `GLIBC_2.38' not found
```

원인은 *빌드 시 glibc가 2.38인데 보드의 glibc는 2.31*인 경우입니다. 해결은 다음 중 하나.

- 보드의 glibc를 같은 buildroot로 *함께* 업데이트 (가장 깨끗).
- application 빌드를 *보드의 glibc* 버전에 맞춰 진행 — toolchain 통일.
- 정적 링크 — `-static` (rootfs 크기 증가).

이 사고는 *toolchain 통일*이 안 됐다는 신호입니다. 같은 트리에서 빌드한 application은 *정확히 같은 buildroot*가 만든 toolchain으로 빌드돼야 한다는 원칙을 유지해야 합니다.

## 흔한 실패 — multilib 부재

ARM에서 `aarch32` binary를 같이 돌리고 싶을 때, 또는 32-bit ARM 라이브러리에 의존하는 closed-source binary가 있을 때 *multilib*가 필요합니다.

External toolchain은 *대부분 multilib 미지원*입니다. 32-bit + 64-bit 둘 다 필요하면 다음 중 하나.

- **두 trees로 분리** — 32-bit용 buildroot tree + 64-bit용 buildroot tree, 산출물 병합.
- **vendor SDK** — NXP·TI는 multilib SDK를 제공.
- **internal toolchain + multilib=y** — Buildroot의 `BR2_TOOLCHAIN_BUILDROOT_MULTILIB` 옵션.

이 결정은 *prototyping 단계에서* 미리 해두는 게 좋습니다. 양산 직전에 발견하면 *전체 빌드 시스템을 다시 짜야* 합니다.

## libc 선택 — glibc / musl / uClibc-ng

internal toolchain이면 자유 선택입니다. 결정 기준은 다음 표로 충분합니다.

| 항목 | glibc | musl | uClibc-ng |
|---|---|---|---|
| **크기 (stripped)** | 8 ~ 12 MB | 0.6 ~ 1 MB | 0.5 ~ 1 MB |
| **호환성** | 가장 넓음 | 일부 closed-source 호환 안 됨 | 좁음 (legacy) |
| **표준 준수** | GNU 확장 풍부 | POSIX 엄격 | POSIX |
| **locale·NLS** | 풍부 | 제한적 | 제한적 |
| **NSS·iconv** | full | 정적 | 제한적 |
| **C++ 호환** | full | mostly | 부분적 |
| **활용처** | desktop·server·일반 embedded | 컨테이너·소형 embedded | 매우 소형·legacy |

선택이 어려우면 *glibc*가 default. 작은 시스템(rootfs < 30 MB)이 목표라면 *musl*로 전환. uClibc-ng는 *과거 호환이 필요한 legacy 프로젝트*가 아니면 거의 안 씁니다.

## 검증 절차

toolchain 결정 후 다음 절차로 *조용한 ABI 문제*를 미리 잡습니다.

```bash
# 1) toolchain의 실제 ABI 확인
$ readelf -h output/host/aarch64-buildroot-linux-gnu/sysroot/lib/libc.so.6 | head
ELF Header:
  Class:                             ELF64
  Machine:                           AArch64
  OS/ABI:                            UNIX - System V

# 2) 보드 커널 헤더 버전과 일치 확인
$ grep -E 'LINUX_VERSION_CODE' output/host/.../include/linux/version.h

# 3) 빌드된 binary 한 개로 sanity check
$ readelf -d output/target/bin/busybox | grep NEEDED
 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]
$ readelf -V output/target/bin/busybox | grep GLIBC
  Name: GLIBC_2.34
  Name: GLIBC_2.17
```

마지막의 `GLIBC_2.34` 같은 *highest version*이 *런타임이 요구할 glibc 최저 버전*입니다. 이 값이 *target 보드의 glibc*보다 작거나 같아야 합니다.

## 정리

- Toolchain 결정이 전체 ABI를 결정하며, 빌드 시간의 절반 ~ 2/3를 차지합니다.
- *Internal toolchain*은 깨끗하지만 30 ~ 50분 추가. prototyping·학습·musl 사용 시 적합.
- *External toolchain*은 5 ~ 10분으로 빠르지만 ABI를 toolchain이 고정. CI·vendor 호환·양산에 적합.
- External 후보는 Bootlin(기본) / Linaro / ARM GNU / Custom(vendor SDK)입니다.
- ABI 일치 항목은 architecture·CPU·libc·kernel headers·GCC version·endianness·float ABI 7개입니다.
- Headers ≤ runtime kernel 규칙을 지키지 않으면 ENOSYS·`GLIBC_2.X not found` 같은 런타임 사고가 납니다.
- libc 기본은 glibc, 소형 시스템은 musl. uClibc-ng는 legacy 전용.
- 빌드 후 `readelf -V`로 *required GLIBC version*을 검증하는 게 가장 빠른 sanity check입니다.

다음 편은 **Ch 12: Linux 커널 customize**. Toolchain 위에 *커널과 device tree*를 어떻게 정렬하는지 다룹니다.

## 관련 항목

- [Ch 4: 첫 빌드 — QEMU에서 동작하는 시스템](/blog/embedded/buildroot/chapter04-first-build) — toolchain 단계의 실제 흐름
- [Ch 12: Linux 커널 customize — defconfig fragment와 DTS](/blog/embedded/buildroot/chapter12-kernel-customize)
- [Ch 17: SDK 생성·배포 — make sdk와 application 워크플로](/blog/embedded/buildroot/chapter17-sdk) — toolchain을 application 개발자에게 배포
- [BSP Development Ch 7: 크로스 컴파일 toolchain](/blog/embedded/bsp/chapter07-toolchain) — BSP 관점에서의 toolchain
- [원문 — Buildroot Manual §3: getting started](https://buildroot.org/downloads/manual/manual.html)
