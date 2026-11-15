---
title: "U-Boot 빌드 시스템 분석 — Kconfig·Makefile·defconfig 동작 추적"
slug: "embedded/bootloader/chapter03-build-system"
date: 2026-05-09T09:03:00
description: "U-Boot의 빌드 시스템 — Kconfig 옵션, Makefile 구조, defconfig 패턴, out-of-tree 빌드."
series: "Bootloader Internals"
seriesOrder: 3
tags: [embedded, bootloader, u-boot, kconfig, build]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"U-Boot의 설정과 빌드는 Linux Kconfig·Kbuild에서 출발한 흐름을 사용합니다."** — 공통 개념을 재사용하지만 U-Boot 고유 설정·산출물과 SPL/TPL 단계가 더해집니다.

U-Boot 소스 트리를 처음 열면 많은 파일과 보드 설정에 압도될 수 있습니다. 설정·빌드 구조는 Linux Kconfig/Kbuild와 닮았지만, U-Boot에는 호환성을 위한 추가 생성물과 SPL/TPL 빌드 흐름이 있습니다. 공통 개념을 익힌 뒤에는 대상 보드 문서와 해당 버전의 설정을 확인해야 합니다.

## 빌드의 세 단계

U-Boot 빌드는 *세 단계*입니다.

![U-Boot 빌드 흐름 — defconfig → menuconfig → make와 주요 산출물](/images/blog/bootloader/diagrams/chapter03-build-flow.svg)

가장 자주 쓰는 흐름은 다음과 같습니다.

```bash
# 1. U-Boot 소스 받기
git clone https://source.denx.de/u-boot/u-boot.git
cd u-boot

# 2. cross-compiler 환경 변수
export ARCH=arm
export CROSS_COMPILE=aarch64-linux-gnu-

# 3. defconfig 적용
make qemu_arm64_defconfig

# 4. 빌드
make -j$(nproc)
```

빌드 결과는 기본 설정에서는 소스 트리에 생성되며, `O=<dir>`를 지정하면 그 출력 디렉터리에 생성됩니다. 설정에 따라 `u-boot`, `u-boot.bin`, control DTB, SPL/TPL 산출물 또는 FIT 이미지가 나올 수 있습니다. 파일 이름과 포함 여부는 해당 버전의 보드 설정과 실제 build log에서 확인하세요.

## 디렉터리 구조

U-Boot 소스 트리는 *영역별*로 디렉터리가 나뉩니다.

```text
u-boot/
├── arch/                      ← 아키텍처별 코드
│   ├── arm/
│   │   ├── cpu/               ← cortex-a53, armv8 등
│   │   ├── mach-imx/          ← SoC 패밀리 코드
│   │   ├── mach-rockchip/
│   │   ├── dts/               ← Device Tree source
│   │   └── lib/               ← 아키텍처 헬퍼
│   ├── riscv/
│   └── x86/
│
├── board/                     ← 보드별 코드
│   ├── freescale/imx8mp_evk/
│   ├── ti/am335x/
│   ├── rockchip/evb_rk3399/
│   └── beagle/beagleboneblack/
│
├── configs/                   ← defconfig 모음
│   ├── qemu_arm64_defconfig
│   ├── am335x_evm_defconfig
│   ├── imx8mp_evk_defconfig
│   └── ...
│
├── include/                   ← 헤더
│   ├── configs/               ← 보드별 헤더 (CONFIG_*)
│   ├── dt-bindings/
│   └── ...
│
├── common/                    ← 공통 코드
│   ├── board_f.c              ← board_init_f
│   ├── board_r.c              ← board_init_r
│   ├── main.c                 ← 명령 인터프리터
│   ├── cli.c
│   └── spl/
│       └── spl.c              ← SPL 메인
│
├── drivers/                   ← 드라이버 (DM 기반)
│   ├── mmc/
│   ├── net/
│   ├── serial/
│   ├── usb/
│   └── ...
│
├── fs/                        ← 파일 시스템
│   ├── ext4/
│   ├── fat/
│   └── ubifs/
│
├── lib/                       ← 라이브러리
│   ├── libfdt/                ← DT 처리
│   ├── crypto/
│   └── ...
│
├── cmd/                       ← 명령 구현
│   ├── mmc.c
│   ├── tftp.c
│   ├── boot.c
│   └── ...
│
├── tools/                     ← 호스트 도구
│   ├── mkimage.c
│   └── ...
│
├── Kconfig                    ← 최상위 Kconfig
├── Makefile
├── scripts/
│   ├── Kbuild.include
│   └── ...
└── doc/
```

이 중 *보드 포팅에 가장 자주 손대는 곳*은 `board/`, `configs/`, `arch/<arch>/dts/`, `include/configs/`입니다. [BSP Ch 6](/blog/embedded/bsp/chapter06-u-boot-porting)에서 다룬 적이 있습니다.

## Kconfig — 옵션 정의

Kconfig 파일이 *모든 옵션*을 정의합니다. 옵션은 *bool, tristate, string, int, hex*가 가능하고, *의존 관계*를 표현할 수 있습니다.

```make
# drivers/mmc/Kconfig (발췌)

menu "MMC Host controller Support"

config MMC
    bool "MMC/SD/SDIO card support"
    default ARM || PPC || SANDBOX
    help
      MMC/SD card support.

config DM_MMC
    bool "Enable MMC controllers using Driver Model"
    depends on MMC && DM
    help
      Use Driver Model for MMC.

config FSL_USDHC
    bool "Freescale/NXP i.MX uSDHC controller"
    depends on DM_MMC && BLK
    select MMC_SDHCI
    help
      Driver for i.MX MMC controller.

endmenu
```

`depends on`은 *활성화 조건*, `select`는 *자동 활성화*. `CONFIG_FSL_USDHC=y`를 켜면 *MMC_SDHCI*가 자동으로 켜집니다.

### menuconfig

`make menuconfig`는 *대화식 TUI*로 .config를 편집합니다.

**U-Boot Configuration** 최상위 메뉴:

- General setup --->
- ARM architecture --->
- Boot media --->
- Boot images --->
- Boot timing --->
- Boot count support --->
- Console --->
- Device Tree Control --->
- Environment --->
- Network --->
- Library routines --->


옵션을 검색하려면 `/`를 누르고 검색어를 입력합니다.

```text
Search Results
──────────────
Symbol: SPL [=y]
Type  : bool
Prompt: Enable SPL
  Location:
    -> Boot images
  Defined at common/spl/Kconfig:33
  Selected by:
    - ARCH_OMAP2PLUS && ...
  Selects:
    SUPPORT_OF_CONTROL && ...
```

옵션 하나를 찾는 가장 빠른 방법입니다.

## defconfig — 옵션 묶음

`configs/<board>_defconfig`는 기본값에서 달라지는 설정을 저장한 간결한 입력 파일입니다. 이를 직접 `.config`처럼 사용하지 않고, U-Boot의 `make <board>_defconfig` target으로 해당 버전의 전체 설정 파일을 생성합니다.

```text
# configs/qemu_arm64_defconfig의 축약된 형태; 실제 항목은 버전에 따라 다름
CONFIG_ARM=y
CONFIG_ARCH_QEMU=y
```

`make <board>_defconfig`는 *이 파일을 .config로 풀어*, *Kconfig의 default 값을 채워*, *전체 .config를 만듭니다*.

### 새 defconfig 만들기

`menuconfig`로 옵션을 수정한 뒤 *defconfig를 저장*하려면 `make savedefconfig`를 씁니다.

```bash
# 1. 적용
make qemu_arm64_defconfig

# 2. 수정
make menuconfig
# (옵션 추가/삭제)

# 3. 새 defconfig 저장
make savedefconfig

# 4. configs/ 안으로
cp defconfig configs/my_board_defconfig
```

`savedefconfig`는 *기본값과 다른 옵션만* 저장합니다. 그래서 defconfig 파일이 *짧고 가독성 있게* 유지됩니다.

## Makefile — Kbuild

U-Boot은 Kbuild의 Makefile 형식과 개념을 사용하지만, 빌드 규칙 전체가 Linux 커널과 동일한 것은 아닙니다. 예를 들어 U-Boot 구성에서는 `obj-y`와 함께 SPL/TPL 단계별 조건을 사용할 수 있습니다. 모듈 단위 Makefile은 `obj-y`로 해당 디렉터리에서 빌드할 파일을 명시합니다.

```make
# drivers/mmc/Makefile (발췌)
obj-$(CONFIG_$(SPL_TPL_)MMC)      += mmc.o mmc-uclass.o
obj-$(CONFIG_DM_MMC)              += mmc-uclass.o
obj-$(CONFIG_FSL_USDHC)           += fsl_esdhc_imx.o
obj-$(CONFIG_MMC_SDHCI)           += sdhci.o
obj-$(CONFIG_MMC_BCM2835)         += bcm2835_sdhost.o
```

`obj-$(CONFIG_FSL_USDHC) += fsl_esdhc_imx.o`는 `CONFIG_FSL_USDHC=y`일 때만 *fsl_esdhc_imx.o를 빌드 대상에 추가*합니다.

### SPL vs U-Boot Proper 빌드

`$(SPL_TPL_)` 접두사가 *어느 단계에서 활성화할지*를 분리합니다.

```make
obj-$(CONFIG_$(SPL_TPL_)MMC) += mmc.o
```

빌드되는 경우:
- U-Boot Proper 빌드 시: `CONFIG_MMC=y`이면 컴파일
- SPL 빌드 시: `CONFIG_SPL_MMC=y`이면 컴파일
- TPL 빌드 시: `CONFIG_TPL_MMC=y`이면 컴파일

같은 소스를 *다른 .config로 세 번* 컴파일하는 구조입니다. SPL은 *공간이 작으므로* `CONFIG_SPL_MMC=y`지만 `CONFIG_SPL_MMC_WRITE`는 *꺼서* 코드를 줄이는 식입니다.

## out-of-tree 빌드

소스 트리를 *건드리지 않고* 빌드 산출물을 별도 디렉터리에 두려면 `O=`를 씁니다.

```bash
# 소스는 ~/u-boot, 빌드는 ~/build/u-boot
mkdir -p ~/build/u-boot
make -C ~/u-boot O=~/build/u-boot qemu_arm64_defconfig
make -C ~/u-boot O=~/build/u-boot -j$(nproc)
```

여러 보드를 동시에 개발할 때 유용합니다. 같은 소스로 *여러 빌드 디렉터리*를 만들 수 있습니다.

```bash
~/build/qemu_arm64/
~/build/beagle/
~/build/imx8mp_evk/
```

## cross-compile 환경

ARM 보드를 빌드하려면 *aarch64 cross-compiler*가 필요합니다. Ubuntu/Debian:

```bash
sudo apt install gcc-aarch64-linux-gnu
```

환경 변수:

```bash
export ARCH=arm
export CROSS_COMPILE=aarch64-linux-gnu-
```

`ARCH=arm`은 ARMv7과 ARMv8 *공통*으로 씁니다. `CROSS_COMPILE`이 *aarch64-* 또는 *arm-*인지로 32/64 비트를 구분합니다.

| 타깃 | ARCH | CROSS_COMPILE |
|------|------|---------------|
| ARMv7-A 32bit | arm | arm-linux-gnueabihf- |
| ARMv8-A 64bit | arm | aarch64-linux-gnu- |
| RISC-V 64bit | riscv | riscv64-linux-gnu- |
| MIPS | mips | mips-linux-gnu- |

CROSS_COMPILE의 *끝 dash가 중요*합니다. `aarch64-linux-gnu-gcc`가 *컴파일러 이름*인데, Makefile은 `$(CROSS_COMPILE)gcc`로 조립합니다.

## 빌드 출력 읽기

`make`의 출력을 읽을 줄 알아야 *어디서 실패했는지* 압니다.

```text
$ make -j8
  HOSTCC  scripts/basic/fixdep
  HOSTCC  scripts/kconfig/conf.o
  ...
  GEN     include/autoconf.mk
  CHK     include/config/uboot.release
  CHK     include/generated/version_autogenerated.h
  ...
  CC      arch/arm/cpu/armv8/cache.o
  CC      arch/arm/cpu/armv8/cpu.o
  ...
  CC      common/board_f.o
  CC      common/board_r.o
  ...
  LD      u-boot
  OBJCOPY u-boot-nodtb.bin
  CAT     u-boot-dtb.bin
  COPY    u-boot.bin
  SYM     u-boot.sym
```

`HOSTCC`는 *host 컴파일러*(scripts/, tools/), `CC`는 *cross 컴파일러*. `LD`는 *링크*, `OBJCOPY`는 *binary 변환*.

빌드 실패 시 줄의 *맨 앞 단어*가 *어느 도구가 실패했는지* 알려 줍니다.

```text
arch/arm/mach-imx/spl.c:42:5: error: 'CONFIG_FOO' undeclared
```

이런 메시지는 *Kconfig에서 옵션 누락*입니다. defconfig를 점검합니다.

## binary 크기 확인

산출물 크기를 보려면:

`ls -l` 또는 `stat`로 실제 파일 크기를 확인하고, 보드의 SRAM 적재 한계와 대조합니다. 여기서는 U-Boot 소스와 cross-toolchain을 빌드하지 않았으므로 특정 파일 크기나 날짜를 결과로 제시하지 않습니다.

SPL이 실제로 적재·실행되는 초기 메모리 영역은 플랫폼별로 다릅니다. 해당 보드의 linker script, SPL memory map, BootROM 제한을 확인해 산출물이 허용 영역에 들어가는지 검증합니다.

map file의 실제 섹션 주소와 크기를 보고, SPL이 사용하는 영역이 보드의 메모리 배치와 겹치지 않는지 확인합니다. 특정 주소와 심볼 크기는 SoC·보드·설정별 산출물이므로 여기서는 고정 예시로 제시하지 않습니다.

크기를 줄이려면 불필요한 기능을 비활성화하는 방법을 우선 검토합니다. LTO 지원 여부와 크기·부팅 영향은 toolchain 및 보드 설정에 따라 달라지므로 적용 전후 산출물을 측정해야 합니다.

## 자주 하는 실수

### 여러 보드 설정의 output directory 분리

여러 보드나 설정을 번갈아 빌드할 때는 `O=<dir>`로 output directory를 분리하면 `.config`와 생성 파일이 섞이지 않습니다. 기존 output tree를 재사용할 경우에는 해당 U-Boot 버전과 보드의 clean 절차를 확인하고, `distclean`이 필요한지 판단합니다.

```bash
make distclean
make <board>_defconfig
make
```

### 타깃 아키텍처와 cross-compiler 확인

defconfig와 cross-compiler prefix는 의도한 타깃과 일치해야 합니다. 설정 후 `.config`의 아키텍처 옵션, 빌드 로그의 compiler prefix, 결과 ELF의 machine type을 확인하세요. 저장소의 build system이 `ARCH`를 요구하는 구성이라면 해당 값을 지정하고, 보드 문서의 빌드 절차를 따릅니다.

### `CROSS_COMPILE`을 *상대 경로*로

```bash
# Bad
export CROSS_COMPILE=./toolchain/bin/aarch64-linux-gnu-

# Good (절대 경로 또는 PATH)
export PATH=$HOME/toolchain/bin:$PATH
export CROSS_COMPILE=aarch64-linux-gnu-
```

빌드 중 sub-make에서 *cwd가 바뀌면* 상대 경로가 깨집니다.

### `savedefconfig`로 만든 파일 *그대로* 커밋

`savedefconfig`가 *정확히 정렬*해 주지만, 알파벳 순이 아닌 *Kconfig 트리 순*입니다. 가독성을 위해 *그룹별 빈 줄*을 수동으로 넣지 마세요. 다음 `savedefconfig`에서 사라집니다.

### `obj-y` 대신 `obj-$(CONFIG_X)`를 빼먹음

새 driver 파일을 추가할 때 Makefile에 `obj-y += my_driver.o`라고 쓰면 *모든 빌드에 무조건 포함*됩니다. 보통은 `obj-$(CONFIG_MY_DRIVER) += my_driver.o`로 *Kconfig와 연결*합니다.

### `menuconfig`가 `ncurses-dev` 없이 안 됨

```text
*** Unable to find the ncurses libraries.
*** make[1]: *** [scripts/kconfig/Makefile:14: menuconfig] Error 1
```

Ubuntu/Debian: `sudo apt install libncurses-dev`. macOS: `brew install ncurses`.

## 정리

- U-Boot은 Linux Kconfig/Kbuild에서 파생된 설정·Makefile 흐름을 사용하며, 호환성 설정과 SPL/TPL 같은 자체 동작도 확인해야 합니다.
- 디렉터리는 *영역별*입니다. arch/, board/, configs/, include/configs/, common/, drivers/, cmd/.
- Kconfig가 옵션을 정의하고, defconfig가 *옵션 묶음*을 저장합니다.
- 하나의 U-Boot 설정에서 stage별 옵션으로 SPL과 U-Boot Proper 같은 별도 산출물을 만들 수 있습니다. 실제 선택 옵션은 `CONFIG_SPL_*` 등 해당 보드의 설정에서 확인합니다.
- `make savedefconfig`로 menuconfig 변경을 *defconfig 형태*로 저장합니다.
- out-of-tree 빌드는 `O=<dir>`로 합니다. 여러 보드 개발에 편리합니다.
- cross-compile은 `ARCH=arm CROSS_COMPILE=aarch64-linux-gnu-` 환경 변수로 정합니다.
- SPL 산출물의 적재·실행 메모리 한계는 보드 문서와 map file로 확인합니다.

## 다음 편

[Ch 4: 부트 단계 — BL1 → SPL → TPL → U-Boot Proper](/blog/embedded/bootloader/chapter04-boot-stages)에서는 ARMv8-A의 BL1·BL2·BL31·BL33과 U-Boot의 SPL·TPL·U-Boot Proper의 책임을 정리합니다. 각 단계의 *메모리 모델*과 *권한 수준*도 함께 봅니다.

## 관련 항목

- [Ch 1: 부트로더가 푸는 문제](/blog/embedded/bootloader/chapter01-boot-problem)
- [Ch 2: U-Boot의 위치](/blog/embedded/bootloader/chapter02-u-boot-position)
- [Ch 4: 부트 단계](/blog/embedded/bootloader/chapter04-boot-stages)
- [Ch 7: Driver Model](/blog/embedded/bootloader/chapter07-driver-model)
- [BSP Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
- [Buildroot Ch 4: 패키지와 옵션](/blog/embedded/buildroot/chapter04-first-build)
- [원문 — U-Boot README](https://source.denx.de/u-boot/u-boot/-/blob/master/README)
- [원문 — Kbuild documentation](https://www.kernel.org/doc/Documentation/kbuild/)
- [U-Boot: Kconfig in U-Boot](https://docs.u-boot.org/en/stable/develop/kconfig.html)
- [U-Boot v2024.01: Building with GCC](https://docs.u-boot.org/en/v2024.01/build/gcc.html)
