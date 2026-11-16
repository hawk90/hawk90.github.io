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

U-Boot의 빌드는 Linux에서 가져온 Kconfig·Kbuild 위에 세 가지가 더해진 구조입니다. defconfig를 C 전처리기에 먼저 통과시키고, 아키텍처를 `.config`에서 읽고, 같은 `.config` 하나로 SPL과 U-Boot Proper를 따로 빌드합니다. 이 장의 모든 출력은 U-Boot v2024.04 소스와 이 시리즈의 빌드 디렉터리(`qemu_arm64`, `imx8mm_evk`)에서 나왔습니다. 70줄짜리 defconfig가 `CONFIG_` 줄 1,382개(파일 전체 1,802줄)의 `.config`가 되는 과정을 따라가고, 실제로 겪은 함정 하나(CROSS_COMPILE 없이 defconfig를 적용하면 옵션이 조용히 사라짐)를 짚습니다.

## 빌드 명령

이 시리즈의 모든 U-Boot는 macOS에서 Homebrew의 `aarch64-elf-gcc` 16.2.0으로, 소스 밖 디렉터리에 빌드했습니다.

```bash title="build-qemu-arm64.sh"
cd ~/Workspaces/code-review-sources/u-boot-v2024.04
make O=$OUT CROSS_COMPILE=aarch64-elf- qemu_arm64_defconfig
make O=$OUT -j8 CROSS_COMPILE=aarch64-elf- \
    HOSTCFLAGS=-I/opt/homebrew/opt/openssl@3/include \
    HOSTLDFLAGS=-L/opt/homebrew/opt/openssl@3/lib
```

`ARCH`는 지정하지 않았습니다. U-Boot v2024.04의 `config.mk` 22행이 `ARCH := $(CONFIG_SYS_ARCH:"%"=%)`로 `.config`에서 아키텍처를 읽기 때문입니다. Linux 커널처럼 `ARCH=arm`을 넘길 필요가 없습니다. `HOSTCFLAGS`·`HOSTLDFLAGS`는 호스트 도구(`mkimage` 등)가 OpenSSL을 찾게 하려는 macOS 사정입니다.

`qemu_arm64` 빌드 로그의 명령 종류를 세면 빌드가 무엇으로 이뤄지는지 보입니다.

| 단계 표시 | 개수 | 뜻 |
| --- | ---: | --- |
| `CC` | 417 | 타깃용 C 컴파일 (`$(CROSS_COMPILE)gcc`) |
| `HOSTCC` | 104 | 호스트용 컴파일 (`scripts/`, `tools/`) |
| `AS` | 17 | 어셈블리 |
| `LD` | 8 | 링크 |
| `DTC` | 2 | Device Tree 컴파일 |

로그는 이렇게 끝납니다.

```text
  RELOC   u-boot-nodtb.bin
  SYM     u-boot.sym
  DTC     arch/arm/dts/qemu-arm.dtb
  DTC     arch/arm/dts/qemu-arm64.dtb
  COPY    u-boot.bin
  SHIPPED dts/dt.dtb
  OFCHK   .config
```

`RELOC`은 `CONFIG_STATIC_RELA=y`일 때 `tools/relocate-rela`가 RELA relocation을 raw 바이너리에 미리 적용하는 단계입니다. `Makefile`의 주석은 이것이 "currently arm64 only"라고 적습니다. relocation 자체는 [Ch 8](/blog/embedded/bootloader/chapter08-board-init)에서 다룹니다. `qemu_arm64`는 DTB를 QEMU에서 받으므로(`CONFIG_OF_BOARD=y`) `CONFIG_OF_OMIT_DTB=y`입니다. 그래서 `u-boot.bin`은 `u-boot-nodtb.bin`을 그대로 복사한 것이고 둘 다 1,047,344바이트입니다. `dts/dt.dtb`는 72바이트짜리 빈 DTB입니다.

## 소스 트리에서 자주 여는 곳

| 경로 | 내용 | 이 시리즈의 예 |
| --- | --- | --- |
| `configs/` | 보드별 defconfig | `qemu_arm64_defconfig`(70줄), `imx8mm_evk_defconfig`(120줄) |
| `board/<vendor>/<board>/` | 보드 코드 | `board/freescale/imx8mm_evk/spl.c` |
| `arch/arm/mach-imx/imx8m/` | SoC 계열 코드 | i.MX 8M 클록·DDR |
| `arch/arm/dts/` | Device Tree 소스 | `imx8mm-evk.dts` |
| `include/configs/` | 보드 헤더 (기본 환경 변수 등) | `qemu-arm.h`, `imx8mm_evk.h` |
| `common/` | 공통 흐름 | `board_f.c`, `board_r.c`, `main.c`, `cli.c`, `spl/spl.c` |
| `drivers/`, `fs/`, `net/`, `cmd/` | 드라이버, 파일 시스템, 네트워크, 명령 | `drivers/mmc/`, `fs/ext4/`, `cmd/mmc.c` |
| `tools/` | 호스트 도구 | `mkimage`, binman |

보드를 포팅할 때 손대는 곳은 주로 `configs/`, `board/`, `arch/arm/dts/`, `include/configs/`입니다([BSP Ch 6](/blog/embedded/bsp/chapter06-u-boot-porting)).

## Kconfig — 옵션 정의

v2024.04 `drivers/mmc/Kconfig`의 실제 정의입니다.

```make
menu "MMC Host controller Support"

config MMC
	bool "MMC/SD/SDIO card support"
	default ARM || PPC || SANDBOX
	select DM_MMC if DM
	help
	  This selects MultiMediaCard, Secure Digital and Secure
	  Digital I/O support.
```

```make
config DM_MMC
	bool "Enable MMC controllers using Driver Model"
	depends on DM
	select BLK
```

```make
config FSL_USDHC
	bool "Freescale/NXP i.MX uSDHC controller support"
	depends on MX6 || MX7 ||ARCH_MX7ULP || IMX8 || IMX8M || IMX8ULP || IMX9 || IMXRT
	select FSL_ESDHC_IMX
```

(help 문구 일부 생략)

`depends on`은 이 옵션을 켤 수 있는 조건이고, `select`는 이 옵션이 켜질 때 함께 켜는 옵션입니다. `select`는 대상의 `depends on`을 확인하지 않고 강제로 켜므로, 쓰는 쪽이 조건을 맞춰야 합니다. `imx8mm_evk`의 `.config`에서는 `CONFIG_FSL_USDHC=y`와 그 결과인 `CONFIG_FSL_ESDHC_IMX=y`가 함께 보입니다.

`make menuconfig`의 `/` 검색은 옵션이 어디에 정의됐는지 알려 줍니다. `SPL`은 `common/spl/Kconfig` 13행에 `bool "Enable SPL"`, `depends on SUPPORT_SPL`로 정의돼 있습니다.

## defconfig에서 .config로

### 전처리기를 먼저 거친다

U-Boot의 `scripts/kconfig/Makefile`은 Linux와 달리 defconfig를 C 전처리기에 먼저 넣습니다.

```make
%_defconfig: $(obj)/conf
	$(Q)$(CPP) -nostdinc -I $(srctree) -undef -x assembler-with-cpp $(srctree)/arch/$(SRCARCH)/configs/$@ -o generated_defconfig
	$(Q)$< $(silent) --defconfig=generated_defconfig $(Kconfig)
```

그래서 defconfig 안에서 `#include`로 다른 조각을 가져올 수 있습니다. 그리고 최상위 `Makefile` 402행이 `CPP = $(CC) -E`이고 `CC`는 `$(CROSS_COMPILE)gcc`입니다. 결국 defconfig를 적용하는 단계부터 어떤 컴파일러가 쓰이는지가 결과에 영향을 줍니다.

### 실제로 겪은 함정 — CROSS_COMPILE 없는 defconfig

[Ch 24](/blog/embedded/bootloader/chapter24-spl-deep)를 준비하면서 `imx8mm_evk_defconfig`를 `CROSS_COMPILE` 없이 적용한 적이 있습니다. 그러자 macOS의 `gcc`(Apple clang)가 전처리를 맡았고, Kconfig가 이런 경고를 냈습니다. 같은 현상을 [Ch 30](/blog/embedded/bootloader/chapter30-bootloader-ci)에서 다시 재현한 로그입니다.

```text
generated_defconfig:40:warning: unexpected data:  # CONFIG_SPL_SHARES_INIT_SP_ADDR is not set
generated_defconfig:51:warning: unexpected data:  # CONFIG_CMD_EXPORTENV is not set
generated_defconfig:52:warning: unexpected data:  # CONFIG_CMD_IMPORTENV is not set
generated_defconfig:53:warning: unexpected data:  # CONFIG_CMD_CRC32 is not set
generated_defconfig:117:warning: unexpected data:  # CONFIG_USB_STORAGE is not set
```

clang 전처리기가 `# CONFIG_... is not set` 줄 앞에 공백을 넣었고, Kconfig는 그 줄을 주석으로도 설정으로도 읽지 못해 버렸습니다. 결과적으로 "끄라"는 지시 5개가 사라져 Kconfig 기본값으로 돌아갔습니다. 빌드는 성공했습니다. 그러나 그 기본값 중 하나가 SPL 스택 위치를 바꿔, SPL 스택 포인터가 0x401FFE50이라는 엉뚱한 곳을 가리키는 이미지가 나왔습니다. 경고 몇 줄 외에는 실패 신호가 없었습니다. 그 뒤로는 defconfig 단계에도 항상 `CROSS_COMPILE`을 넘기고, 출력에서 "unexpected"를 grep합니다.

### savedefconfig는 원본을 그대로 돌려준다

defconfig는 기본값과 다른 옵션만 적은 축약본입니다. `make <board>_defconfig`가 Kconfig 기본값을 채워 전체 `.config`를 만들고, `make savedefconfig`가 반대로 축약합니다. 수정하지 않은 `qemu_arm64` 빌드에서 `savedefconfig`를 돌려 원본과 비교했습니다.

```text
$ make O=$OUT CROSS_COMPILE=aarch64-elf- savedefconfig
scripts/kconfig/conf  --savedefconfig=defconfig Kconfig
$ diff configs/qemu_arm64_defconfig $OUT/defconfig && echo IDENTICAL
IDENTICAL
```

| 파일 | 줄 수 |
| --- | ---: |
| `configs/qemu_arm64_defconfig` | 70 |
| `savedefconfig` 결과 | 70 (원본과 동일) |
| `.config`의 `CONFIG_` 줄 | 1,382 |

업스트림 defconfig가 `savedefconfig`의 출력 형식 그대로 관리된다는 뜻입니다. 옵션 순서도 알파벳순이 아니라 Kconfig 트리 순서입니다. 손으로 정렬하거나 빈 줄을 넣으면 다음 `savedefconfig`에서 원래 모양으로 돌아갑니다. 보드 defconfig를 고칠 때는 `menuconfig`로 바꾸고 `savedefconfig` 결과를 `configs/`에 복사하는 흐름이 diff를 깔끔하게 유지합니다.

## Makefile — 같은 .config, 두 번의 빌드

v2024.04 `drivers/mmc/Makefile`의 앞부분입니다.

```make
obj-y += mmc.o
obj-$(CONFIG_$(SPL_)DM_MMC) += mmc-uclass.o

ifdef CONFIG_$(SPL_TPL_)DM_MMC
obj-$(CONFIG_$(SPL_TPL_)BOOTSTD) += mmc_bootdev.o
endif
```

`$(SPL_)`와 `$(SPL_TPL_)`는 `scripts/Kbuild.include`에 이렇게 정의돼 있습니다.

```make
ifdef CONFIG_SPL_BUILD
SPL_ := SPL_
ifeq ($(CONFIG_VPL_BUILD),y)
SPL_TPL_ := VPL_
else
ifeq ($(CONFIG_TPL_BUILD),y)
SPL_TPL_ := TPL_
else
SPL_TPL_ := SPL_
endif
endif
else
SPL_ :=
SPL_TPL_ :=
endif
```

U-Boot Proper를 빌드할 때는 둘 다 빈 문자열이라 `CONFIG_DM_MMC`를 보고, SPL을 빌드할 때는 `CONFIG_SPL_DM_MMC`를 봅니다. `$(SPL_)`는 TPL·VPL 빌드에서도 `SPL_`이고, 단계를 구분하려면 `$(SPL_TPL_)`를 씁니다. `.config`는 하나이고, 그 안에 두 단계의 옵션이 함께 있습니다. `imx8mm_evk`의 MMC 관련 줄입니다.

```text
CONFIG_MMC=y
CONFIG_DM_MMC=y
CONFIG_SPL_MMC=y
CONFIG_SPL_DM_MMC=y
CONFIG_MMC_WRITE=y
# CONFIG_SPL_MMC_WRITE is not set
```

빌드 디렉터리에 남은 오브젝트를 비교하면 차이가 그대로 나옵니다.

| 오브젝트 | U-Boot Proper (`drivers/mmc/`) | SPL (`spl/drivers/mmc/`) |
| --- | --- | --- |
| `mmc.o`, `mmc-uclass.o`, `mmc_boot.o`, `fsl_esdhc_imx.o` | 있음 | 있음 |
| `mmc_write.o` | 있음 | 없음 (`SPL_MMC_WRITE` 꺼짐) |
| `mmc_bootdev.o` | 있음 | 없음 (SPL에 bootstd 없음) |

SPL 빌드는 `spl/` 아래 별도 디렉터리에서 `scripts/Makefile.spl`로 돌고, 이 빌드의 로그에서 `spl/`로 시작하는 `CC`·`LD`·`AS` 줄이 189개였습니다. 같은 소스 파일을 다른 매크로로 한 번 더 컴파일하는 것입니다.

## SPL 크기 한계는 링커가 지킨다

SPL은 SoC 내부 SRAM에 들어가야 합니다. `imx8mm_evk`의 관련 설정과 실제 크기입니다.

```text
CONFIG_SPL_TEXT_BASE=0x7E1000
CONFIG_SPL_MAX_SIZE=0x27000
CONFIG_SPL_BSS_START_ADDR=0x910000
CONFIG_SPL_BSS_MAX_SIZE=0x2000
CONFIG_SPL_STACK=0x920000
```

```text
$ aarch64-elf-size spl/u-boot-spl u-boot
   text	   data	    bss	    dec	    hex	filename
 115537	  28849	    456	 144842	  235ca	spl/u-boot-spl
 636322	  35512	  24928	 696762	  aa1ba	u-boot
```

(경로 줄임)

`spl/u-boot-spl.bin`은 152,599바이트이고 한계 0x27000(159,744바이트)의 95.5%입니다. 남은 여유는 7,145바이트입니다. 이 한계는 SPL 링커 스크립트 `arch/arm/cpu/armv8/u-boot-spl.lds`가 지킵니다.

```text
MEMORY { .sram : ORIGIN = IMAGE_TEXT_BASE,
		LENGTH = IMAGE_MAX_SIZE }
MEMORY { .sdram : ORIGIN = CONFIG_SPL_BSS_START_ADDR,
		LENGTH = CONFIG_SPL_BSS_MAX_SIZE }
```

`scripts/Makefile.spl` 199행이 `-DIMAGE_MAX_SIZE=$(CONFIG_$(SPL_TPL_)MAX_SIZE)`로 값을 넣습니다. SPL에 기능을 더해 0x27000을 넘기면 링크가 실패합니다. 크기를 줄일 때는 `aarch64-elf-size`와 `u-boot-spl.map`으로 큰 오브젝트를 찾고, 그 기능의 `CONFIG_SPL_*`를 끄는 것부터 봅니다. 이 SRAM 배치 전체는 [Ch 24](/blog/embedded/bootloader/chapter24-spl-deep)에서 다룹니다.

## 자주 하는 실수

- **defconfig 단계에서 `CROSS_COMPILE`을 빼먹음** — 위에서 본 대로 옵션이 조용히 사라질 수 있습니다. defconfig 출력의 "unexpected data"를 확인합니다.
- **보드를 바꿔 같은 출력 디렉터리를 재사용** — `.config`와 생성 파일이 섞입니다. 보드마다 `O=`를 따로 둡니다. 이 시리즈는 `qemu_arm64` 변형을 `uboot-qemu-arm64`, `uboot-smc`, `uboot-ubi`, `uboot-pci64` 등 여러 디렉터리로 나눠 빌드했습니다.
- **`savedefconfig` 결과를 손으로 정렬** — 다음 저장에서 되돌아가고 diff만 커집니다.
- **새 드라이버를 `obj-y`로 추가** — 모든 빌드에 들어갑니다. `obj-$(CONFIG_MY_DRIVER)`로 Kconfig와 연결하고, SPL에도 필요하면 `$(SPL_)`·`$(SPL_TPL_)` 형태를 씁니다.
- **`select`로 의존성이 없는 옵션을 켬** — `select`는 대상의 `depends on`을 무시합니다. 조건이 맞지 않는 조합이 만들어질 수 있습니다.

## 정리

- U-Boot은 Linux Kconfig·Kbuild를 쓰되 defconfig를 `$(CPP)`로 먼저 전처리하고, `ARCH`는 `.config`의 `CONFIG_SYS_ARCH`에서 읽습니다.
- defconfig 단계에도 `CROSS_COMPILE`이 필요합니다. 없으면 호스트 전처리기 때문에 "is not set" 줄이 사라질 수 있습니다.
- `qemu_arm64_defconfig` 70줄은 `CONFIG_` 줄 1,382개짜리 `.config`로 펼쳐지고, `savedefconfig`는 원본과 똑같은 70줄을 돌려줍니다.
- `.config` 하나에 Proper와 SPL 옵션이 함께 있고, `$(SPL_)`·`$(SPL_TPL_)`가 단계별로 다른 오브젝트를 고릅니다.
- SPL 크기 한계 `CONFIG_SPL_MAX_SIZE`는 링커 스크립트의 MEMORY 영역 길이가 됩니다.

## 다음 편

[Ch 4: 부트 단계 — BL1 → SPL → TPL → U-Boot Proper](/blog/embedded/bootloader/chapter04-boot-stages)에서는 ARMv8-A의 BL1·BL2·BL31·BL33과 U-Boot의 SPL·TPL·U-Boot Proper의 책임을 정리합니다. 각 단계의 메모리 모델과 권한 수준도 함께 봅니다.

## 근거 자료

- U-Boot v2024.04 소스: `config.mk`(22행 `ARCH`), `Makefile`(402행 `CPP`), `scripts/kconfig/Makefile`(defconfig 전처리), `scripts/Kbuild.include`(`SPL_`, `SPL_TPL_`), `scripts/Makefile.spl`(199행 `IMAGE_MAX_SIZE`), `arch/arm/cpu/armv8/u-boot-spl.lds`, `drivers/mmc/Kconfig`, `drivers/mmc/Makefile`, `common/spl/Kconfig`.
- 이 시리즈의 빌드: `qemu_arm64` 빌드 로그와 `savedefconfig` 결과, `imx8mm_evk` `.config`·오브젝트·`aarch64-elf-size`, CROSS_COMPILE 없는 defconfig 재현 로그.
- [U-Boot v2024.04: Building with GCC](https://docs.u-boot.org/en/v2024.04/build/gcc.html).
- U-Boot v2024.04 `Makefile`(`u-boot.bin` 규칙, `quiet_cmd_static_rela`).

## 관련 항목

- [Ch 1: 부트로더가 푸는 문제](/blog/embedded/bootloader/chapter01-boot-problem)
- [Ch 2: U-Boot의 위치](/blog/embedded/bootloader/chapter02-u-boot-position)
- [Ch 4: 부트 단계](/blog/embedded/bootloader/chapter04-boot-stages)
- [Ch 7: Driver Model](/blog/embedded/bootloader/chapter07-driver-model)
- [BSP Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
- [Buildroot Ch 4: 패키지와 옵션](/blog/embedded/buildroot/chapter04-first-build)
