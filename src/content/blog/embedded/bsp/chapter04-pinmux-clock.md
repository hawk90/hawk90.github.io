---
title: "Ch 4: Pin Mux와 Clock"
date: 2026-05-09T04:00:00
description: "보드의 가장 보드-특화된 초기화 — pin 멀티플렉싱과 clock tree 설정."
series: "BSP Development"
seriesOrder: 4
tags: [embedded, bsp, pinmux, clock]
draft: false
---

## 한 줄 요약

> **"Pin mux와 clock은 *보드별로 거의 100% 달라지는* 두 가지입니다."** — 다른 모든 dts 노드가 SoC dtsi에서 상속되더라도, 이 두 개는 BSP 엔지니어가 *처음부터* 적습니다.

새 보드에서 *시리얼이 안 뜨는* 이유 90%가 pin mux 또는 clock입니다. peripheral 자체는 정상이고, 드라이버도 probe 성공인데, 출력이 안 나옵니다. *핀이 다른 기능에 묶여 있거나*, *클록이 안 들어오는* 것입니다.

## SoC 핀은 *공장*이다 — alternate function

요즘 SoC의 핀 하나가 *3~8개의 기능*을 가집니다. 이걸 *pin mux*라고 합니다.

i.MX 8M Plus의 SAI5_RXFS ball(K1)의 alternate function입니다.

| ALT | 기능 |
|-----|------|
| ALT0 | SAI5_RXFS (오디오 SAI5 frame sync) |
| ALT1 | SAI1_TX_DATA0 |
| ALT2 | PWM4_OUT |
| ALT3 | I2C6_SCL |
| ALT4 | UART3_DCE_RX |
| ALT5 | GPIO3_IO21 |
| ALT6 | SRC_BOOT_MODE3 |
| ALT7 | EPDC_PWR_CTRL3 |

같은 핀이 SAI, UART, I2C, GPIO 어디로든 갈 수 있습니다. 보드 설계자가 *회로도에서* 하나를 택하고, BSP 엔지니어가 *DT의 pinctrl 노드*에 그 선택을 적습니다.

## IOMUXC 레지스터 — pin mux의 *물리적 정체*

NXP는 *IOMUXC*(IO Multiplexing Controller), TI는 *PINCTRL*, Rockchip은 *GRF + PMUGRF*, ST는 *GPIO*에 mux 기능이 통합되어 있습니다. 이름은 다르지만 *역할은 같습니다*. 각 핀에 대해 *5~6개 비트필드*를 설정합니다.

i.MX 8M Plus IOMUXC의 한 핀에 대한 레지스터 셋입니다.

| 레지스터 | 비트필드 | 의미 |
|---------|---------|------|
| `IOMUXC_SW_MUX_CTL_PAD_xxx` | MUX_MODE [2:0] | ALT0~ALT7 선택 |
| `IOMUXC_SW_MUX_CTL_PAD_xxx` | SION [4] | input override |
| `IOMUXC_SW_PAD_CTL_PAD_xxx` | DSE [3:1] | drive strength |
| `IOMUXC_SW_PAD_CTL_PAD_xxx` | SRE [0] | slew rate |
| `IOMUXC_SW_PAD_CTL_PAD_xxx` | PUE / PUS [12:13] | pull up/down/keeper |
| `IOMUXC_DAISY_xxx` | DAISY [N:0] | 어느 핀이 input인지 선택 (input mux) |

이걸 *손으로* 계산하면 거의 항상 실수합니다. 다행히 *DT의 매크로*가 이 셋을 한꺼번에 캡슐화합니다.

```text
MX8MP_IOMUXC_UART1_RXD__UART1_DCE_RX    0x140
```

매크로 이름은 `MX8MP_IOMUXC_<pad name>__<function name>` 패턴입니다. `__`(double underscore)가 *pad와 function의 구분자*입니다. 끝의 `0x140`이 *PAD_CTL* 값(drive strength, pull 등)입니다.

매크로 정의는 커널의 `arch/arm64/boot/dts/freescale/imx8mp-pinfunc.h`에 있습니다.

```c
#define MX8MP_IOMUXC_UART1_RXD__UART1_DCE_RX \
    0x1F4 0x454 0x5C4 0x0 0x0
```

다섯 숫자는 *MUX_CTL 레지스터 오프셋*, *PAD_CTL 오프셋*, *DAISY 오프셋*, *MUX_MODE 값*, *DAISY 값*입니다. SoC vendor가 이 매크로 파일을 *RM의 pinmux 표에서 생성*합니다.

## DT의 pinctrl 패턴

peripheral 노드가 pinctrl 노드를 *참조*합니다.

```text
&uart1 {
    pinctrl-names = "default", "sleep";
    pinctrl-0 = <&pinctrl_uart1>;
    pinctrl-1 = <&pinctrl_uart1_sleep>;
    status = "okay";
};

&iomuxc {
    pinctrl_uart1: uart1grp {
        fsl,pins = <
            MX8MP_IOMUXC_UART1_RXD__UART1_DCE_RX    0x140
            MX8MP_IOMUXC_UART1_TXD__UART1_DCE_TX    0x140
        >;
    };

    pinctrl_uart1_sleep: uart1sleepgrp {
        fsl,pins = <
            MX8MP_IOMUXC_UART1_RXD__GPIO5_IO22      0x100
            MX8MP_IOMUXC_UART1_TXD__GPIO5_IO23      0x100
        >;
    };
};
```

읽는 법입니다.

- `pinctrl-names`가 *상태 이름의 배열*입니다. "default"가 probe 시 적용.
- `pinctrl-0`은 *첫 번째 이름의 phandle 배열*. 여러 phandle을 한 상태에 묶을 수 있습니다.
- `pinctrl-1`은 *두 번째 이름*. "sleep" 상태에서 핀을 GPIO로 돌립니다.
- pinctrl driver가 *런타임에* 이 상태들을 토글합니다.

같은 패턴이 TI, ST, Rockchip에 동일하게 적용됩니다. 매크로 이름만 다릅니다.

## 부트로더 단계의 pin mux

문제는 *부트로더가 동작할 시점에는 커널의 pinctrl driver가 없습니다*. U-Boot SPL이 직접 *console UART의 pinmux를 손으로 설정*해야 합니다.

NXP i.MX 8M Plus용 U-Boot board 코드 예시입니다.

```c
/* board/freescale/imx8mp_evk/spl.c */
#include <asm/arch/imx8mp_pins.h>
#include <asm/mach-imx/iomux-v3.h>

static iomux_v3_cfg_t const uart_pads[] = {
    MX8MP_PAD_UART2_RXD__UART2_DCE_RX | MUX_PAD_CTRL(UART_PAD_CTRL),
    MX8MP_PAD_UART2_TXD__UART2_DCE_TX | MUX_PAD_CTRL(UART_PAD_CTRL),
};

int board_early_init_f(void)
{
    imx_iomux_v3_setup_multiple_pads(uart_pads, ARRAY_SIZE(uart_pads));
    return 0;
}
```

`imx_iomux_v3_setup_multiple_pads()`가 *IOMUXC 레지스터에 값을 쓰는* 함수입니다. SPL 단계에서 *console UART이 동작하기 전*에 호출됩니다.

동일한 핀 정보가 *U-Boot의 C 코드*와 *커널의 DT*에 *두 번* 들어갑니다. 이건 중복이지만, 두 단계가 *서로 다른 시점*에 다른 정보 모델로 동작하기 때문입니다. 최근 U-Boot은 *자기 DT*를 사용하는 방식으로 옮겨가고 있지만, 아직 모든 SoC가 그 수준은 아닙니다.

## Clock tree — 루트에서 leaf까지

Pinmux가 *공간*의 문제라면, clock은 *시간*의 문제입니다. peripheral마다 *필요한 클록 주파수*가 있고, 그 클록을 *SoC의 어느 PLL에서 어떻게 분배*받을지를 정해야 합니다.

전형적인 SoC clock tree의 단순화한 흐름입니다.

```text
24MHz XTAL  (보드의 외부 oscillator)
   │
   ├─→ SYS_PLL1  (800MHz fixed)
   │      │
   │      ├─→ /2 → 400MHz  ─→ AHB_CLK_ROOT
   │      ├─→ /4 → 200MHz  ─→ IPG_CLK_ROOT
   │      ├─→ /8 → 100MHz  ─→ UART_CLK_ROOT  ─→ uart1, uart2, ...
   │      └─→ /20 → 40MHz  ─→ I2C_CLK_ROOT
   │
   ├─→ SYS_PLL2  (1000MHz fixed)
   │      └─→ /2 → 500MHz  ─→ SDR_CLK
   │
   ├─→ ARM_PLL   (1800MHz max, 가변)
   │      └────────────────→ A53 cores
   │
   ├─→ GPU_PLL   (1000MHz)
   │      └────────────────→ GPU clock
   │
   ├─→ VIDEO_PLL (가변, panel rate)
   │      └────────────────→ Display, MIPI-DSI
   │
   └─→ DRAM_PLL  (DDR rate)
          └─────────────────→ DDR controller
```

기억할 패턴은 다음과 같습니다.

- **루트는 외부 XTAL**입니다. 보드별로 다릅니다. 24MHz, 25MHz, 26MHz가 흔합니다.
- **PLL이 다음 층**입니다. SoC 내부에서 곱셈/나눗셈으로 *높은 주파수*를 만듭니다.
- **divider가 그 다음**입니다. 각 PLL 출력을 /2, /4, /N으로 나눠 *clock root*를 만듭니다.
- **clock root에서 leaf**로 분배됩니다. 각 peripheral이 *어느 root에 연결*되는지가 SoC dtsi에 적혀 있습니다.

## Common Clock Framework (CCF)

Linux 커널이 모든 SoC의 clock tree를 *통일된 방식*으로 다루기 위해 도입한 framework입니다. `drivers/clk/`에 SoC별 driver가 있고, *동일한 API*로 접근합니다.

DT에서 peripheral이 clock을 *참조*하는 방식입니다.

```text
&uart1 {
    clocks = <&clk IMX8MP_CLK_UART1_ROOT>,
             <&clk IMX8MP_CLK_UART1_ROOT>;
    clock-names = "ipg", "per";
    status = "okay";
};
```

`IMX8MP_CLK_UART1_ROOT`는 *clock ID*입니다. dt-bindings 헤더에 정의되어 있습니다.

```c
/* include/dt-bindings/clock/imx8mp-clock.h */
#define IMX8MP_CLK_24M                  3
#define IMX8MP_CLK_SYS_PLL1_800M       46
#define IMX8MP_CLK_UART1_ROOT         137
#define IMX8MP_CLK_USDHC1_ROOT        139
/* ... 수백 개 */
```

CCF가 *런타임에* 다음을 처리합니다.

- `clk_prepare_enable()` — peripheral driver가 호출하면 clock gate를 *열어* 클록을 흘립니다.
- `clk_set_rate()` — 목표 주파수로 *divider를 재계산*합니다.
- `clk_get_parent()` — 부모 클록 노드를 따라갑니다.
- `clk_set_parent()` — clock mux로 *다른 parent를 선택*합니다.

부팅 후 `/sys/kernel/debug/clk/clk_summary`로 *전체 트리*를 볼 수 있습니다.

```text
$ cat /sys/kernel/debug/clk/clk_summary
                                 enable  prepare  protect     duty
   clock                 rate   count    count    count    hardware  signal
---------------------------------------------------------------------------
 osc_24m              24000000      6       6       0     Y           50000
    sys_pll1         800000000      6       6       0     Y           50000
       sys_pll1_400m 400000000      4       4       0     Y           50000
          ahb_root   400000000      4       4       0     Y           50000
       sys_pll1_100m 100000000      2       2       0     Y           50000
          uart1_root 100000000      1       1       0     Y           50000
          uart2_root 100000000      1       1       0     Y           50000
```

읽는 법:

- `rate` — 현재 주파수.
- `enable count` — 이 clock을 *enable한 사용자 수*.
- `prepare count` — clock을 *준비 상태로 만든 사용자 수*.

UART이 동작 안 할 때 `uart1_root`의 enable count가 0이면 *peripheral driver가 clock을 enable 안 하고 있는 것*입니다. probe 코드를 의심합니다.

## U-Boot 단계의 clock 초기화

부트로더는 *CCF가 없습니다*. SPL 시점에 *손으로* PLL을 설정합니다.

```c
/* arch/arm/mach-imx/imx8m/clock_imx8mp.c (요약) */

void clock_init(void)
{
    /* SYS PLL1: 800MHz */
    clock_enable(CCGR_SCTR, 0);
    pll_config(&ana_pll->sys_pll1_gen_ctrl, 0x800000d8, ...);

    /* SYS PLL2: 1000MHz */
    pll_config(&ana_pll->sys_pll2_gen_ctrl, 0x800000f0, ...);

    /* AHB at 400MHz */
    clock_set_target_val(AHB_CLK_ROOT, CLK_ROOT_ON |
                         CLK_ROOT_SOURCE_SEL(1) |   /* sys_pll1_800m */
                         CLK_ROOT_PRE_DIV(0) |
                         CLK_ROOT_POST_DIV(1));     /* /2 = 400MHz */

    /* UART at 100MHz */
    clock_set_target_val(UART1_CLK_ROOT, CLK_ROOT_ON |
                         CLK_ROOT_SOURCE_SEL(0) |   /* sys_pll1_100m */
                         CLK_ROOT_PRE_DIV(0) |
                         CLK_ROOT_POST_DIV(0));
}
```

이 코드가 SPL의 *가장 초기 단계*에서 호출됩니다. UART을 켜기 전에 *UART의 parent clock이 흘러야* 합니다.

벤더가 reference BSP에서 이 함수를 *완성된 형태로* 제공합니다. 우리는 *주파수 값*만 보드에 맞게 조정합니다. PLL 자체의 *주파수 선택*은 거의 안 건드립니다.

## 보드별로 변경되는 부분 — 어디인가

SoC dtsi의 clock 노드는 *고정*입니다. 우리가 *보드에서* 바꾸는 것은 다음입니다.

```text
[보드별 변경점]

1. 외부 oscillator 주파수 (XTAL)
   - 회로도 확인
   - U-Boot board.c의 osc_24m_clk 정의

2. peripheral의 clock-rates / assigned-rates
   - 어떤 peripheral은 보드별로 다른 주파수가 필요
   - 예: 카메라 sensor의 MCLK = 24MHz vs 48MHz

3. assigned-clock-parents
   - 보드의 디스플레이가 다르면 VIDEO_PLL을 다른 rate로
```

DT 예시입니다.

```text
&clk {
    assigned-clocks = <&clk IMX8MP_VIDEO_PLL1>;
    assigned-clock-rates = <594000000>;
};

&i2c1 {
    assigned-clocks = <&clk IMX8MP_CLK_I2C1>;
    assigned-clock-parents = <&clk IMX8MP_SYS_PLL1_160M>;
    assigned-clock-rates = <40000000>;
};
```

`assigned-clock-*` 속성은 *부팅 시 한 번* 적용됩니다. 이후 peripheral driver가 다시 `clk_set_rate()`를 호출하면 변경됩니다.

## 실전 — 시리얼 console이 안 뜨면

새 보드에서 *U-Boot의 시리얼이 안 뜨는* 상황에서 점검하는 순서입니다.

```text
[1] 하드웨어 점검
    □ USB-TTL의 TX/RX 교차 확인
    □ GND 연결
    □ baud rate 일치 (보통 115200)
    □ 보드에 *전원*이 정상으로 들어오는지 (LED 확인)

[2] 부트 미디어 점검
    □ BOOT_MODE 핀이 SD/eMMC 중 옳은 미디어로 설정됐는지
    □ SPL/U-Boot 이미지가 SD에 올바른 오프셋에 있는지
    □ SD가 SPL이 찾을 수 있는 포맷 (보통 raw write to offset 1KB)

[3] Pin mux 점검
    □ board_early_init_f()에서 console UART pad가 설정됐는지
    □ 매크로의 ALT가 맞는지 (UART2_RXD vs UART_TX는 자주 헷갈림)
    □ PAD_CTL의 pull 설정 (input은 pull-up 권장)

[4] Clock 점검
    □ SYS_PLL1이 enable됐는지
    □ UART_CLK_ROOT의 parent가 옳은지
    □ ccgr (clock gate) 비트가 켜져 있는지
    □ U-Boot의 CONFIG_DEBUG_UART_CLOCK이 *실제 주파수*와 같은지
```

ARM Trusted Firmware-A를 쓰는 보드라면 *BL2가 console UART을 설정*합니다. BL2 단계에서 이미 막힌 거라면 BL2의 console 코드를 확인합니다.

## JTAG로 *clock 살아 있는지* 확인

부팅 중에 *어디서 멈췄는지* 모를 때 JTAG으로 IOMUXC와 CCM 레지스터를 *직접* 읽습니다.

```text
# OpenOCD 또는 J-Link Commander에서
> mdw 0x30890084   # IMX8MP CCM_TARGET_ROOT_UART1
0x10000000         # bit 28 = enable, source/divider 비트 확인

> mdw 0x303404B0   # IMX8MP IOMUXC_SW_MUX_CTL_PAD_UART1_RXD
0x00000000         # MUX_MODE 비트 확인 (UART1 RX는 ALT0이어야)
```

clock과 pinmux 레지스터를 *바로 읽을 수 있다*는 점이 JTAG의 가장 큰 가치입니다. 시리얼이 안 뜨는 상황에서는 *유일한 진단 수단*입니다.

## 자주 하는 실수

### Pin mux 매크로의 *ALT 방향* 헷갈림

UART의 RX는 *입력*, TX는 *출력*입니다. SoC ball의 *pad name*과 *function name*이 헷갈리면 RX/TX가 바뀝니다. 회로도와 *세 번* 비교합니다.

### `clocks` 속성에 *parent ID* 적음

`clocks`는 *이 peripheral의 입력 clock leaf*입니다. parent를 적으면 안 됩니다. parent를 바꾸고 싶으면 `assigned-clock-parents`를 씁니다.

### Clock을 enable했는데 *gate*는 닫혀 있음

CCF가 `clk_prepare_enable()` 한 번에 모든 것을 해 주지만, SoC에 따라 *별도의 gate clock 노드*가 있어 그것도 enable해야 합니다. CCGR 비트가 안 켜지면 *peripheral이 dead*입니다.

### 다른 peripheral과 *핀 공유* 실수

같은 핀이 두 dts 노드에서 동시에 *다른 ALT*로 설정되면, 마지막에 적용된 쪽이 이깁니다. 둘 다 동작 안 합니다. `pinctrl_show /sys/kernel/debug/pinctrl/...`로 *최종 적용 상태*를 확인합니다.

### XTAL 주파수 *24MHz 가정*

대부분이 24MHz지만, 산업용 보드는 *26MHz, 25MHz*도 흔합니다. 잘못된 XTAL 주파수로 PLL을 계산하면 *모든 leaf clock이 비례적으로 어긋납니다*. UART baud rate가 어색하게 틀리면 (예: 105k처럼 비표준 값) XTAL을 의심합니다.

### `assigned-clocks`를 *너무 적극* 사용

매번 `assigned-clocks`로 override하면 *clock tree 전체*가 흔들리고 다른 peripheral이 망가집니다. 필요한 한 두 leaf만 적용합니다.

## 정리

- Pin mux는 *공간*의 문제, clock은 *시간*의 문제입니다. 둘 다 *보드별로 거의 100% 달라집니다*.
- SoC 핀 하나가 3~8개의 alternate function을 가집니다. IOMUXC/PINCTRL 레지스터가 그중 하나를 선택합니다.
- DT의 pinctrl 노드는 `pinctrl-names`, `pinctrl-0`, `pinctrl-1`로 *상태별 핀 설정 묶음*을 정의합니다. peripheral 노드가 phandle로 참조합니다.
- 부트로더 단계(SPL/U-Boot)에는 CCF가 없으므로 *board.c의 C 코드*로 직접 IOMUXC 레지스터를 씁니다.
- Common Clock Framework는 *모든 SoC의 clock tree를 통일된 API*로 다룹니다. `/sys/kernel/debug/clk/clk_summary`로 런타임 상태를 봅니다.
- 보드별 clock 변경은 *XTAL 주파수*와 *assigned-clock-rates*에 집중됩니다. PLL 자체의 설정은 거의 SoC 기본을 따릅니다.
- 시리얼이 안 뜨면 *하드웨어 → 부트 미디어 → pin mux → clock* 순서로 점검합니다. JTAG으로 *IOMUXC와 CCM 레지스터*를 직접 읽는 것이 가장 빠른 진단입니다.

## 다음 편

[Ch 5 — DDR 매개변수](/blog/embedded/bsp/chapter05-ddr-params)에서는 BSP에서 가장 까다로운 부분인 DDR memory의 *물리적 timing 파라미터*가 어디서 오는지, vendor tool 사용법, 잘못된 값의 *증상*을 다룹니다.

## 관련 항목

- [Ch 2: SoC 데이터시트 읽기](/blog/embedded/bsp/chapter02-datasheet)
- [Ch 3: Device Tree 설계](/blog/embedded/bsp/chapter03-device-tree-design)
- [Ch 5: DDR 매개변수 — 보드별 timing](/blog/embedded/bsp/chapter05-ddr-params)
- [Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
- [원문 — Linux Common Clock Framework](https://www.kernel.org/doc/html/latest/driver-api/clk.html)
- [원문 — Linux pinctrl subsystem](https://www.kernel.org/doc/html/latest/driver-api/pin-control.html)
