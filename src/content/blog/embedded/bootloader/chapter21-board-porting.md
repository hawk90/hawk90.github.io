---
title: "Ch 21: 새 보드 포팅 — defconfig부터 첫 부팅까지"
date: 2026-05-09T21:00:00
description: "U-Boot에 새 보드를 추가하는 전체 워크플로 — configs·board·dts·MAINTAINERS."
series: "Bootloader Internals"
seriesOrder: 21
tags: [embedded, bootloader, u-boot, porting, board]
draft: false
---

새 보드를 받아 U-Boot부터 띄울 때, 백지에서 시작하면 며칠을 그냥 잡아먹습니다. 다행히 거의 항상 *비슷한 보드*가 이미 mainline U-Boot에 들어 있습니다. 그 보드를 복사해 차이만 고치는 게 정석입니다.

## 한 줄 요약

**같은 SoC·비슷한 주변 회로의 reference 보드를 *템플릿*으로 복사한 다음, defconfig·DT·보드 코드·환경 변수 다섯 군데를 차례로 바꾸면 대부분 첫 시리얼 출력까지 도달합니다.**

## 시작 — 비슷한 보드 찾기

U-Boot 소스에서 `configs/`를 훑어봅니다.

```bash
ls configs | grep -i imx8m
imx8mm_evk_defconfig
imx8mn_evk_defconfig
imx8mp_evk_defconfig
imx8mq_evk_defconfig
imx8mq_phanbell_defconfig
verdin-imx8mm_defconfig
verdin-imx8mp_defconfig
```

SoC가 같고 DDR 종류와 PMIC가 비슷한 것이 후보입니다. `imx8mm_evk`처럼 NXP reference는 *가장 많이 검증*되어 있으니 후보 1번으로 둡니다.

```bash
# 후보 보드의 파일 리스트
grep -l "imx8mm_evk" configs/ \
    board/freescale/imx8mm_evk/* \
    arch/arm/dts/imx8mm-evk*.dts*
```

## 바꿀 파일 여섯 군데

새 보드 `boardx`를 추가한다고 하면, 손대는 곳은 보통 이렇습니다.

```text
1. configs/boardx_defconfig
2. board/myvendor/boardx/
     ├── Kconfig
     ├── Makefile
     ├── boardx.c        (보드 초기화, DRAM 크기 검출)
     ├── spl.c           (SPL 단계 DDR 초기화)
     ├── lpddr4_timing.c (DDR 타이밍, NXP 도구로 생성)
     └── MAINTAINERS
3. arch/arm/dts/boardx.dts
   arch/arm/dts/boardx-u-boot.dtsi
4. include/configs/boardx.h
5. board/myvendor/Kconfig (subsystem 등록)
6. arch/arm/mach-imx/imx8m/Kconfig (보드 선택 옵션 추가)
```

`-u-boot.dtsi`는 *U-Boot 단계 전용 DT 추가분*입니다. 본 DT는 Linux와 공유하고, U-Boot 만의 필요(예: SPL 단계 사용 device, bootph-pre-ram 같은 노드 속성)는 `.dtsi`로 끼워 넣습니다.

## defconfig 복사

```bash
cp configs/imx8mm_evk_defconfig configs/boardx_defconfig
```

열어서 보드 식별 부분을 바꿉니다.

```text
CONFIG_ARM=y
CONFIG_ARCH_IMX8M=y
CONFIG_SYS_TEXT_BASE=0x40200000
CONFIG_TARGET_BOARDX=y
CONFIG_SYS_LOAD_ADDR=0x40400000
CONFIG_SYS_CONFIG_NAME="boardx"
CONFIG_DEFAULT_DEVICE_TREE="boardx"
CONFIG_SPL_LDSCRIPT="arch/arm/cpu/armv8/u-boot-spl.lds"
CONFIG_SPL=y
CONFIG_SPL_FIT=y
CONFIG_BOOTCOMMAND="run distro_bootcmd"
CONFIG_BOOTSTD_FULL=y
CONFIG_DEFAULT_FDT_FILE="boardx.dtb"
```

`CONFIG_TARGET_BOARDX=y`는 *우리가 아직 만들지 않은* 옵션입니다. 그래서 `arch/arm/mach-imx/imx8m/Kconfig`에 등록해 둬야 합니다.

```text
# arch/arm/mach-imx/imx8m/Kconfig 에 추가
config TARGET_BOARDX
    bool "boardx"
    select BINMAN
    select IMX8MM
    select SUPPORT_SPL
    select OF_BOARD_FIXUP
    help
      boardx is a custom imx8mm-based industrial board.
```

## board/myvendor/boardx/Kconfig·Makefile

`board/myvendor/Kconfig`에 등록:

```text
if TARGET_BOARDX
config SYS_BOARD
    default "boardx"

config SYS_VENDOR
    default "myvendor"

config SYS_CONFIG_NAME
    default "boardx"

source "board/myvendor/boardx/Kconfig"
endif
```

`board/myvendor/boardx/Kconfig`:

```text
config SYS_BOARD_PINMUX
    default "boardx_pinmux"

config IMX_CONFIG
    default "board/myvendor/boardx/imximage.cfg"
```

`board/myvendor/boardx/Makefile`:

```makefile
obj-y += boardx.o
ifdef CONFIG_SPL_BUILD
obj-y += spl.o lpddr4_timing.o
endif
```

`SPL_BUILD` 시점에는 SPL용 파일만, U-Boot proper 시점에는 보드 본체 코드만 빌드됩니다. 두 단계가 한 트리에서 *분리 컴파일*된다는 점이 처음엔 헷갈리지만 익숙해지면 자연스럽습니다.

## boardx.c — 최소 보드 초기화

```c
// board/myvendor/boardx/boardx.c
#include <common.h>
#include <init.h>
#include <asm/arch/sys_proto.h>
#include <asm/io.h>

int board_init(void)
{
    /* DRAM, console 이후 한 번만 호출 */
    return 0;
}

int dram_init(void)
{
    /* DRAM 크기를 SoC 레지스터에서 읽음 */
    gd->ram_size = imx_ddr_size();
    return 0;
}

int board_phys_sdram_size(phys_size_t *size)
{
    *size = imx_ddr_size();
    return 0;
}

int board_late_init(void)
{
    /* env로 보드 식별, MAC 주소 등 */
    env_set("board_name", "boardx");
    env_set("board_rev", "A1");
    return 0;
}
```

처음 한 사이클에는 이 정도면 충분합니다. 나중에 PHY reset·LED·watchdog feed 등을 더해 갑니다.

## spl.c — SPL 단계 DDR

가장 위험한 부분입니다. DDR 타이밍이 틀리면 *SPL이 메모리 첫 접근에서 hang*합니다.

```c
// board/myvendor/boardx/spl.c
#include <common.h>
#include <hang.h>
#include <init.h>
#include <spl.h>
#include <asm/arch/clock.h>
#include <asm/arch/ddr.h>

extern struct dram_timing_info dram_timing;

void spl_dram_init(void)
{
    ddr_init(&dram_timing);
}

void board_init_f(ulong dummy)
{
    int ret;

    arch_cpu_init();
    init_uart_clk(1);

    ret = spl_init();
    if (ret) {
        debug("spl_init failed: %d\n", ret);
        hang();
    }

    preloader_console_init();
    enable_tzc380();
    spl_dram_init();
    board_init_r(NULL, 0);
}
```

`dram_timing`은 NXP DDR Tool 또는 벤더가 제공한 calibration 결과를 그대로 가져옵니다. *직접 계산하지 않습니다*. 잘못된 timing은 *언젠가* 메모리 corruption으로 드러나는데, 그 시점이 부팅 직후가 아니라 *부팅한 지 한참 뒤 random crash*로 나타나니 무서운 버그입니다.

## DT — boardx.dts

reference 보드의 DT를 복사해서 시작합니다.

```text
// arch/arm/dts/boardx.dts
/dts-v1/;

#include "imx8mm.dtsi"
#include "imx8mm-boardx.dtsi"

/ {
    model = "MyVendor BoardX";
    compatible = "myvendor,boardx", "fsl,imx8mm";

    chosen {
        stdout-path = &uart2;
    };

    memory@40000000 {
        device_type = "memory";
        reg = <0x0 0x40000000 0 0x40000000>;  /* 1 GB */
    };

    reg_usdhc2_vmmc: regulator-usdhc2-vmmc {
        compatible = "regulator-fixed";
        regulator-name = "VSD_3V3";
        regulator-min-microvolt = <3300000>;
        regulator-max-microvolt = <3300000>;
        gpio = <&gpio2 19 GPIO_ACTIVE_HIGH>;
        enable-active-high;
    };
};

&uart2 {
    pinctrl-names = "default";
    pinctrl-0 = <&pinctrl_uart2>;
    status = "okay";
};

&usdhc2 {
    pinctrl-names = "default";
    pinctrl-0 = <&pinctrl_usdhc2>;
    vmmc-supply = <&reg_usdhc2_vmmc>;
    cd-gpios = <&gpio2 12 GPIO_ACTIVE_LOW>;
    bus-width = <4>;
    status = "okay";
};
```

`-u-boot.dtsi`로 U-Boot 전용 속성을 추가합니다.

```text
// arch/arm/dts/boardx-u-boot.dtsi
&{/soc@0} {
    bootph-all;
};

&osc_24m {
    bootph-all;
};

&uart2 {
    bootph-all;
};

&usdhc2 {
    bootph-pre-ram;
};
```

`bootph-pre-ram`이 *SPL에서 쓰이는* 노드, `bootph-all`이 *모든 단계에서 쓰이는* 노드를 표시합니다. 이걸 빠뜨리면 SPL이 해당 device를 못 봅니다.

## 첫 빌드와 첫 부팅

다 채웠으면 빌드:

```bash
make boardx_defconfig
make -j$(nproc) ARCH=arm CROSS_COMPILE=aarch64-linux-gnu-
```

`u-boot.bin`·`spl/u-boot-spl.bin`·`flash.bin`(NXP의 묶인 이미지)이 나옵니다. `flash.bin`을 SD에 dd해 보드를 켭니다.

```bash
sudo dd if=flash.bin of=/dev/sdb bs=1k seek=33 conv=fsync
```

시리얼 콘솔(115200 8N1)을 띄우고 전원을 넣습니다. *아무것도 안 나오는* 게 흔한 첫 결과입니다.

## 첫 시리얼 출력까지의 단계

이 흐름이 사실상 표준 디버깅 순서입니다.

```text
1. CONFIG_DEBUG_UART=y, CONFIG_DEBUG_UART_NS16550=y로 SPL보다도
   이른 시점의 직접 UART 출력을 켠다.
   -> 글자만이라도 나오면 UART 핀mux·클럭이 살아 있다는 뜻

2. SPL 부팅:
   U-Boot SPL 2026.04 (May 09 2026 - 16:01:23)
   DDRINFO: start DRAM init
   DDRINFO: DRAM rate 3000MTS
   DDRINFO: ddrphy calibration done
   DDRINFO: complete DRAM PHY training
   -> DDR이 살아 있다는 뜻

3. SPL이 U-Boot proper로 점프:
   U-Boot 2026.04 (May 09 2026 - 16:01:23)
   CPU:   i.MX8MM rev1.0 1600 MHz (running at 1200 MHz)
   ...
   Net:   eth0: ethernet@30be0000
   Hit any key to stop autoboot:
   -> Proper U-Boot 살아 있음

4. autoboot 진입, MMC/Net에서 boot.itb 로드
   -> 부팅 흐름 완성

5. bootm/booti로 Linux kernel handoff
   -> Linux부팅 시작
```

각 단계에서 멈추면 그 구간의 코드가 의심 대상입니다. 1단계가 안 되면 *DEBUG_UART 설정·UART pinmux·UART clock*, 2단계가 안 되면 *DDR timing*, 3단계가 안 되면 *cache/MMU/clock*, 4단계가 안 되면 *MMC/Net driver*, 5단계가 안 되면 *DTB·cmdline·kernel ABI*입니다.

## MAINTAINERS와 commit 분리

mainline에 올릴 생각이면 `board/myvendor/boardx/MAINTAINERS`에 자신을 넣습니다.

```text
BOARDX BOARD
M:  Hawk Yoon <hawking90a@gmail.com>
S:  Maintained
F:  arch/arm/dts/boardx.dts
F:  arch/arm/dts/boardx-u-boot.dtsi
F:  board/myvendor/boardx/
F:  configs/boardx_defconfig
F:  include/configs/boardx.h
```

commit은 *기능별로 분리*합니다. 통째로 한 patch보다 다음 흐름이 받아들여지기 좋습니다.

1. `arm: dts: add boardx device tree`
2. `board: myvendor: add boardx board support`
3. `configs: add boardx_defconfig`
4. `doc: add boardx documentation`

## 자주 하는 실수

새 보드 포팅에서 자주 만나는 함정입니다.

- **DDR timing을 reference 보드 그대로 둔다.** 같은 SoC라도 PCB layout·DDR chip·전압이 다르면 *언젠가* 깨집니다. DDR Tool로 재calibration이 정석입니다.
- **`-u-boot.dtsi`를 잊는다.** `bootph-pre-ram` 속성이 없어 SPL에서 device가 안 보이는데, 에러는 *"MMC not found"*처럼 device 차원에서 나오기 때문에 원인 찾기 까다롭습니다.
- **`CONFIG_SYS_TEXT_BASE`를 reference에서 안 바꾼다.** DRAM 크기와 layout이 다르면 *부팅 도중 자기 자신을 덮어쓰기* 합니다.
- **UART 핀mux는 켰는데 *UART clock이 안 켜진* 상태.** 가장 흔한 "첫 출력이 안 나오는" 원인. `init_uart_clk()` 호출 빠짐.
- **defconfig 옵션을 너무 많이 켠다.** 첫 부팅까지는 *최소 기능*만 켜고, 부팅 후 하나씩 추가하는 편이 디버깅하기 좋습니다.
- **DT 노드는 추가했는데 `status="okay"`를 빼먹어** device가 disable된 채로 부팅.
- **eMMC·NOR boot mode 핀이 안 맞아서** SoC ROM이 SD가 아닌 다른 매체를 본다. SoC datasheet의 BOOT_MODE 핀 도해를 PCB와 한 번 더 대조해야 합니다.

## 정리

- 새 보드는 *비슷한 reference 보드 복사*로 시작하는 것이 가장 빠르고 안전합니다.
- 손대는 곳은 `configs/`·`board/<vendor>/<board>/`·`arch/arm/dts/`·`include/configs/` 네 곳이 핵심입니다.
- DDR timing은 *직접 계산하지 않고* 벤더 도구의 결과를 그대로 가져옵니다.
- `-u-boot.dtsi`로 SPL 단계의 device를 명시(`bootph-pre-ram`)해야 합니다.
- 첫 시리얼 출력 → SPL → DDR init → proper U-Boot → autoboot → Linux 다섯 단계의 *어디서 멈췄는지*가 디버깅 분기점입니다.
- `CONFIG_DEBUG_UART`는 SPL보다도 이른 시점의 출력을 켜는 마지막 보루입니다.
- mainline 제출을 위해서는 기능별 commit 분리와 MAINTAINERS 등록이 필요합니다.

## 다음 장 예고

다음 장이 시리즈 마지막입니다. 새 보드를 포팅하면서 자주 만나는 *부팅 안 됨* 상황을 어떻게 진단하는지를 정리합니다. DEBUG_UART·JTAG·OpenOCD·post-mortem·실패 매트릭스까지 다루고, 그다음 시리즈로 어떻게 이어갈지도 안내합니다.

## 관련 항목

- [Ch 20: RAUC / SWUpdate — 펌웨어 업데이트 프레임워크](/blog/embedded/bootloader/chapter20-rauc-swupdate)
- [Ch 22: 디버깅 — DEBUG, JTAG, serial, post-mortem](/blog/embedded/bootloader/chapter22-debugging)
- [BSP Development Ch 6: BSP 첫 단계 — 부트로더에서 첫 시리얼까지](/blog/embedded/bsp/) — 같은 흐름을 BSP 시점에서
- [원문 — U-Boot doc/board/](https://u-boot.readthedocs.io/en/latest/board/index.html)
