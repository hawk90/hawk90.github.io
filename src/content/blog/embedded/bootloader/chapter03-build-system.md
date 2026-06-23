---
title: "U-Boot 빌드 시스템 분석 — Kconfig·Makefile·defconfig 동작 추적"
date: 2026-05-09T09:03:00
description: "U-Boot의 빌드 시스템 — Kconfig 옵션, Makefile 구조, defconfig 패턴, out-of-tree 빌드."
series: "Bootloader Internals"
seriesOrder: 3
tags: [embedded, bootloader, u-boot, kconfig, build]
draft: false
---

## 한 줄 요약

> **"U-Boot은 *Linux Kbuild를 그대로 가져다 씁니다*."** — `make <board>_defconfig`로 *옵션 한 묶음을 한 번에* 적용하고, `menuconfig`로 *세부 조정*하고, `make`로 *빌드*합니다. 흐름은 커널과 똑같습니다.

U-Boot 소스 트리를 처음 열면 *수만 개의 파일*에 압도됩니다. arch/ 아래만 해도 *수십 개의 아키텍처*, drivers/ 아래는 *수백 개의 driver*, configs/ 아래는 *천 개가 넘는 defconfig*. 다행히 *빌드 시스템은 단순*합니다. Linux 커널과 *같은 Kbuild*입니다. 한 번 익히면 *어떤 보드든* 같은 흐름으로 빌드합니다.

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

빌드 결과는 *소스 트리 루트*에 생깁니다.

```text
u-boot.bin           ← raw binary (TF-A의 BL33으로 사용)
u-boot              ← ELF binary (디버깅용)
u-boot.dtb           ← control DTB (CONFIG_OF_SEPARATE인 경우)
u-boot-dtb.bin       ← u-boot.bin + u-boot.dtb (concat)
u-boot-spl.bin       ← SPL (CONFIG_SPL=y인 경우)
u-boot-spl-dtb.bin   ← SPL + SPL용 DTB
spl/u-boot-spl       ← SPL ELF
u-boot.itb           ← FIT image (CONFIG_FIT=y인 경우)
```

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

`configs/<board>_defconfig`는 *해당 보드에서 활성화된 옵션만* 모은 *압축 .config*입니다.

```text
# configs/qemu_arm64_defconfig (발췌)
CONFIG_ARM=y
CONFIG_ARCH_QEMU=y
CONFIG_SYS_TEXT_BASE=0x00000000
CONFIG_NR_DRAM_BANKS=1
CONFIG_DEFAULT_DEVICE_TREE="qemu-arm64"
CONFIG_OF_BOARD=y
CONFIG_DISTRO_DEFAULTS=y
CONFIG_FIT=y
CONFIG_FIT_SIGNATURE=y
CONFIG_BOOTDELAY=0
CONFIG_SYS_PROMPT="=> "
CONFIG_CMD_BOOTEFI_HELLO=y
CONFIG_CMD_BOOTEFI_SELFTEST=y
CONFIG_CMD_PCI=y
CONFIG_CMD_DHCP=y
CONFIG_CMD_TFTPBOOT=y
CONFIG_CMD_EXT2=y
CONFIG_CMD_EXT4=y
CONFIG_CMD_FAT=y
CONFIG_OF_CONTROL=y
CONFIG_NET=y
CONFIG_DM=y
CONFIG_DM_USB=y
CONFIG_USB=y
CONFIG_USB_XHCI_HCD=y
CONFIG_USB_XHCI_PCI=y
CONFIG_VIRTIO_PCI=y
CONFIG_VIRTIO_NET=y
CONFIG_VIRTIO_BLK=y
CONFIG_EFI_LOADER=y
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

U-Boot의 Makefile은 *Linux Kbuild*를 거의 그대로 씁니다. 모듈 단위 Makefile은 `obj-y`로 *해당 디렉터리에서 빌드할 파일*을 명시합니다.

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

```bash
$ ls -l u-boot*.bin
-rw-r--r-- 1 user user  812032 May 19 09:00 u-boot.bin
-rw-r--r-- 1 user user   84368 May 19 09:00 u-boot-spl.bin
```

SPL은 *수십 KB 안에 들어가야* 합니다. SoC 내부 SRAM 크기를 넘으면 빌드는 통과해도 *부팅이 안 됩니다*.

`make u-boot.map`을 열면 *심볼별 크기*를 봅니다.

```text
.text          0x40200000   0x6a2c8
 ...
 mmc.o          .text       0x402030c0   0x2c84
 net.o          .text       0x40205d44   0x4a18
 ...
```

크기를 줄이려면 *불필요한 driver를 끄거나* `CONFIG_LTO=y`(link-time optimization)를 활성화합니다.

## 자주 하는 실수

### `make clean` 안 하고 defconfig 변경

`.config`가 *덮어쓰기*는 되지만 *.o 파일이 stale* 상태가 됩니다. *Kconfig 옵션이 바뀐 파일*은 재컴파일되는데, *간접 의존이 빠질* 수 있습니다. 큰 변경 후에는:

```bash
make distclean
make <board>_defconfig
make
```

### `ARCH` 환경 변수 누락

`make qemu_arm64_defconfig` 시 ARCH가 *호스트로 잡혀* 빌드 산출물이 *x86*이 되는 경우. 항상 환경 변수를 *셸 프로필이나 export*로 고정합니다.

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

- U-Boot은 *Linux Kbuild를 그대로* 사용합니다. `make <board>_defconfig` → `make menuconfig` → `make`.
- 디렉터리는 *영역별*입니다. arch/, board/, configs/, include/configs/, common/, drivers/, cmd/.
- Kconfig가 옵션을 정의하고, defconfig가 *옵션 묶음*을 저장합니다.
- 같은 소스를 *SPL용 .config*, *U-Boot Proper용 .config*로 *두 번* 빌드해 *두 binary*를 만듭니다.
- `make savedefconfig`로 menuconfig 변경을 *defconfig 형태*로 저장합니다.
- out-of-tree 빌드는 `O=<dir>`로 합니다. 여러 보드 개발에 편리합니다.
- cross-compile은 `ARCH=arm CROSS_COMPILE=aarch64-linux-gnu-` 환경 변수로 정합니다.
- SPL binary 크기는 *SoC 내부 SRAM 크기 안*에 들어가야 합니다. `u-boot.map`으로 점검합니다.

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
