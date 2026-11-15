---
title: "Pin Mux와 Clock Tree 분석 — 보드 부팅의 첫 두 관문"
slug: "embedded/bsp/chapter04-pinmux-clock"
date: 2026-05-18T09:04:00
description: "보드의 가장 보드-특화된 초기화 — pin 멀티플렉싱과 clock tree 설정."
series: "BSP Development"
seriesOrder: 4
tags: [embedded, bsp, pinmux, clock]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Pin mux와 clock은 보드 배선과 SoC 기능을 함께 확인해야 하는 초기화 항목입니다."** — SoC 공통 정의는 dtsi나 vendor code에서 재사용할 수 있고, 보드별 선택은 회로도와 부품 구성에 맞춥니다.

새 보드에서 시리얼이 안 보이면 pin mux와 clock은 확인할 항목이지만, 그 원인 비율을 고정된 수치로 말할 근거는 없습니다. console 선택·baud·전원·배선·부트 단계도 함께 확인하고, probe 성공만으로 UART signal 경로가 정상이라고 단정하지 않습니다.

## SoC 핀은 *공장*이다 — alternate function

요즘 SoC의 핀 하나가 *3~8개의 기능*을 가집니다. 이걸 *pin mux*라고 합니다.

Linux v6.12 `imx8mp-pinfunc.h`에는 UART1_RXD pad를 UART1 DCE 수신 기능으로 설정하는 항목이 있습니다. 이 header의 pad 이름은 SoC의 mux 설정을 나타내며 package ball 이름을 대신하지 않습니다. 보드에서 쓸 수 있는지 판단하려면 package pinout과 회로도도 함께 확인해야 합니다.

## IOMUXC 레지스터 — pin mux의 *물리적 정체*

NXP i.MX는 *IOMUXC*, TI·Rockchip·ST 계열은 각 SoC의 pin controller·GRF·GPIO register block을 사용합니다. 역할은 유사하지만 register layout과 설정 항목은 SoC별로 다릅니다. 이 장의 bit field 예시는 i.MX 8M Plus에 한정합니다.

i.MX 8M Plus IOMUXC의 한 핀에 대한 레지스터 셋입니다.

| 레지스터 | 비트필드 | 의미 |
|---------|---------|------|
| `IOMUXC_SW_MUX_CTL_PAD_xxx` | MUX_MODE [2:0] | ALT0~ALT7 선택 |
| `IOMUXC_SW_MUX_CTL_PAD_xxx` | SION [4] | input override |
| `IOMUXC_SW_PAD_CTL_PAD_xxx` | SoC별 pad-control field | drive strength, pull, hysteresis, slew 등. 비트 위치와 인코딩은 RM에서 pad별로 확인 |
| `IOMUXC_SELECT_INPUT_xxx` | input daisy 선택 값 | 해당 입력 신호에 연결할 pad를 선택. 신호별 field와 값은 RM 및 pinfunc 정의에서 확인 |

이 표는 레지스터 역할을 구분합니다. pad-control field의 비트 위치와 값은 SoC별로 달라질 수 있으므로 다른 i.MX 세대의 예를 복사하지 않습니다.

이걸 *손으로* 계산하면 거의 항상 실수합니다. 다행히 *DT의 매크로*가 이 셋을 한꺼번에 캡슐화합니다.

```text
MX8MP_IOMUXC_UART1_RXD__UART1_DCE_RX    0x140
```

매크로 이름은 `MX8MP_IOMUXC_<pad name>__<function name>` 패턴입니다. `__`(double underscore)가 *pad와 function의 구분자*입니다. 끝의 `0x140`이 *PAD_CTL* 값(drive strength, pull 등)입니다.

매크로 정의는 Linux v6.12 [`imx8mp-pinfunc.h`](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/boot/dts/freescale/imx8mp-pinfunc.h)에 있습니다.

```c
#define MX8MP_IOMUXC_UART1_RXD__UART1_DCE_RX \
    0x220 0x480 0x5E8 0x0 0x4
```

다섯 값은 `<mux_reg conf_reg input_reg mux_mode input_val>` 순서입니다. Linux v6.12 `imx8mp-pinfunc.h`에서 가져온 값이며, 뒤에 `fsl,pins` property의 pad control 값(예: `0x140`)이 별도 항목으로 올 수 있습니다.

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
- `pinctrl-1`은 *두 번째 이름*에 대응하는 상태입니다. 예제에서는 sleep 상태에서 핀을 GPIO 기능으로 mux하지만, 안전한 상태는 보드 회로와 전원 설계에 따라 달라집니다.
- pinctrl core 자체가 모든 상태를 자동 전환하지는 않습니다. 해당 장치 드라이버나 PM 경로가 적절한 상태를 선택해야 합니다.

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

Linux Common Clock Framework(CCF)는 clock provider/consumer를 위한 공통 API를 제공합니다. SoC별 provider와 binding은 다르므로 사용 가능한 parent·rate·clock ID는 해당 커널과 SoC 자료에서 확인합니다.

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

U-Boot에도 clock framework가 있지만, 특정 SoC의 초기 PLL·clock root 설정은 SPL과 SoC별 코드가 맡을 수 있습니다. 아래는 실행 가능한 U-Boot 함수가 아니라 설정 단계의 관계를 설명하기 위한 개략 의사 코드입니다.

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

실제 호출 시점과 함수 이름은 U-Boot 버전·SoC 포팅에 따라 다릅니다. 특정 보드에서는 이 코드 경로와 UART parent clock 설정 순서를 해당 U-Boot 소스로 확인해야 합니다.

이 장의 코드는 의사 코드이며 U-Boot API나 빌드 가능한 예제가 아닙니다. 실제 PLL·clock-root 설정은 U-Boot 버전과 SoC 포팅의 초기화 코드, 보드 전원·주파수 요구사항을 함께 확인해야 합니다. 참조 보드 구현을 재사용할 때도 변경점을 검토합니다.

## 보드별로 변경되는 부분 — 어디인가

SoC dtsi의 clock 노드는 *고정*입니다. 우리가 *보드에서* 바꾸는 것은 다음입니다.

1. 외부 oscillator 주파수 (XTAL)
   - 회로도 확인
   - U-Boot `board.c`의 `osc_24m_clk` 정의
2. peripheral의 clock-rates / assigned-rates
   - 어떤 peripheral은 보드별로 다른 주파수가 필요
   - 예: 카메라 sensor의 MCLK = 24MHz vs 48MHz
3. assigned-clock-parents
   - 보드의 디스플레이가 다르면 VIDEO_PLL을 다른 rate로

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

**[1] 하드웨어 점검**

- [ ] USB-TTL의 TX/RX 교차 확인
- [ ] GND 연결
- [ ] baud rate 일치 (보통 115200)
- [ ] 보드에 *전원*이 정상으로 들어오는지 (LED 확인)

**[2] 부트 미디어 점검**

- [ ] BOOT_MODE 핀이 SD/eMMC 중 옳은 미디어로 설정됐는지
- [ ] SPL/U-Boot 이미지가 SD에 올바른 오프셋에 있는지
- [ ] SD가 SPL이 찾을 수 있는 포맷 (보통 raw write to offset 1KB)

**[3] Pin mux 점검**

- [ ] board_early_init_f()에서 console UART pad가 설정됐는지
- [ ] 매크로의 ALT가 맞는지 (UART2_RXD vs UART_TX는 자주 헷갈림)
- [ ] PAD_CTL의 pull 설정 (input은 pull-up 권장)

**[4] Clock 점검**

- [ ] SYS_PLL1이 enable됐는지
- [ ] UART_CLK_ROOT의 parent가 옳은지
- [ ] ccgr (clock gate) 비트가 켜져 있는지
- [ ] U-Boot의 CONFIG_DEBUG_UART_CLOCK이 *실제 주파수*와 같은지

ARM Trusted Firmware-A를 쓰는 보드라면 *BL2가 console UART을 설정*합니다. BL2 단계에서 이미 막힌 거라면 BL2의 console 코드를 확인합니다.

## JTAG로 *clock 살아 있는지* 확인

부팅 중에 *어디서 멈췄는지* 모를 때 JTAG으로 IOMUXC와 CCM 레지스터를 *직접* 읽습니다.

Linux v6.12 `imx8mp.dtsi`는 IOMUXC의 register base를 `0x30330000`으로 정의하고, pin-function header는 UART1_RXD의 mux offset을 `0x220`으로 둡니다. 따라서 해당 mux register의 physical address는 base+offset인 `0x30330220`입니다. 실제 JTAG memory-read 명령과 읽기 권한은 debugger, SoC security state, silicon 설정에 따라 달라지므로 특정 도구의 출력값을 범용 예로 제시하지 않습니다.

JTAG/SWD는 firmware에서 설정한 register 상태를 조사하는 방법 중 하나입니다. Serial console, bootloader log, kernel tracing 및 보드 계측도 함께 사용할 수 있으며, JTAG이 항상 필요하거나 사용 가능한 것은 아닙니다.

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
