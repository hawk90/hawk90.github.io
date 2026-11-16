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

> **"Pin mux와 clock은 보드 배선과 SoC 기능을 함께 확인해야 하는 초기화 항목입니다."** SoC 공통 정의는 dtsi와 SoC 코드에 있고, 보드별 선택은 회로도와 부품 구성을 따릅니다.

콘솔 UART 하나가 글자를 내보내려면 두 가지가 맞아야 합니다. 신호가 올바른 pad로 나가야 하고(pin mux), UART 블록에 정해진 주파수의 클록이 들어와야 합니다(clock). 이 장은 i.MX 8M Plus EVK의 콘솔 UART2를 따라가며 두 설정이 U-Boot v2024.04와 Linux v6.12 소스의 어디에서 일어나는지 봅니다.

## SoC 핀은 *공장*이다 — alternate function

SoC 핀 하나는 여러 기능 중 하나를 골라 씁니다. 공장 생산 라인 하나가 날마다 다른 제품을 찍어 내듯, pad 하나가 설정에 따라 UART도 되고 GPIO도 됩니다. 이 선택을 *pin mux*라고 합니다.

Linux v6.12 `imx8mp-pinfunc.h`에서 `UART1_RXD` pad로 시작하는 매크로는 네 개입니다.

```c
#define MX8MP_IOMUXC_UART1_RXD__UART1_DCE_RX   0x220 0x480 0x5E8 0x0 0x4
#define MX8MP_IOMUXC_UART1_RXD__UART1_DTE_TX   0x220 0x480 0x000 0x0 0x0
#define MX8MP_IOMUXC_UART1_RXD__ECSPI3_SCLK    0x220 0x480 0x000 0x1 0x0
#define MX8MP_IOMUXC_UART1_RXD__GPIO5_IO22     0x220 0x480 0x000 0x5 0x0
```

네 매크로 모두 mux 레지스터 오프셋은 `0x220`으로 같고, 넷째 값(mux mode)만 0, 0, 1, 5로 다릅니다. 하나의 레지스터에 어느 번호를 쓰느냐가 곧 pad의 기능입니다. 이 pad 이름은 SoC 내부 이름이며 package ball 번호는 pinout 자료에 따로 있습니다.

## IOMUXC 레지스터 — pin mux의 *물리적 정체*

NXP i.MX는 *IOMUXC*, TI·Rockchip·ST 계열은 각 SoC의 pin controller·GRF·GPIO register block을 사용합니다. 역할은 유사하지만 register layout과 설정 항목은 SoC별로 다릅니다. 이 장의 bit field 예시는 i.MX 8M Plus에 한정합니다.

i.MX 8M Plus IOMUXC의 한 핀에 대한 레지스터 셋입니다.

| 레지스터 | 비트필드 | 의미 |
|---------|---------|------|
| `IOMUXC_SW_MUX_CTL_PAD_xxx` | MUX_MODE [2:0] | ALT0~ALT7 선택 |
| `IOMUXC_SW_MUX_CTL_PAD_xxx` | SION [4] | 출력 기능에서도 입력 경로를 강제로 켬 |
| `IOMUXC_SW_PAD_CTL_PAD_xxx` | SoC별 pad-control field | drive strength, pull, hysteresis, slew 등. 비트 위치와 인코딩은 RM에서 pad별로 확인 |
| `IOMUXC_SELECT_INPUT_xxx` | input daisy 선택 값 | 해당 입력 신호에 연결할 pad를 선택. 신호별 field와 값은 RM 및 pinfunc 정의에서 확인 |

SION이 bit 4라는 것은 U-Boot v2024.04 `arch/arm/include/asm/mach-imx/iomux-v3.h:256`의 `IOMUX_CONFIG_SION 0x10`에서 확인됩니다. Linux DT에서는 `fsl,pins`의 설정 값 bit 30(`0x40000000`)이 SION 요청이고, `drivers/pinctrl/freescale/pinctrl-imx.c`(34, 496~499행)가 이 비트를 떼어 mux 레지스터의 SION으로 옮깁니다. Ch 2에서 본 EVK의 I2C 핀 값 `0x400001c2`에 bit 30이 켜져 있는 이유입니다. I2C는 SCL/SDA를 open-drain으로 내보내면서 같은 pad에서 입력도 읽어야 합니다.

DT에서는 매크로 하나가 세 레지스터 위치를 한꺼번에 담습니다.

```text
MX8MP_IOMUXC_UART1_RXD__UART1_DCE_RX    0x140
```

매크로 이름은 `MX8MP_IOMUXC_<pad name>__<function name>` 패턴입니다. `__`(double underscore)가 *pad와 function의 구분자*입니다. 끝의 `0x140`이 conf_reg에 쓰일 *PAD_CTL* 값입니다.

매크로 정의는 Linux v6.12 [`imx8mp-pinfunc.h`](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/boot/dts/freescale/imx8mp-pinfunc.h)에 있습니다.

```c
#define MX8MP_IOMUXC_UART1_RXD__UART1_DCE_RX \
    0x220 0x480 0x5E8 0x0 0x4
```

다섯 값은 `<mux_reg conf_reg input_reg mux_mode input_val>` 순서입니다. Linux v6.12 `imx8mp-pinfunc.h`에서 가져온 값이며, `fsl,pins` 안에서는 매크로 뒤에 pad control 값(예: `0x140`)이 별도 항목으로 붙습니다.

## DT의 pinctrl 패턴

peripheral 노드가 pinctrl 노드를 *참조*합니다. Linux v6.12 `imx8mp-verdin.dtsi:315-321`의 Ethernet 노드는 기본 상태와 sleep 상태를 둘 다 둡니다.

```c
&fec {
	phy-mode = "rgmii-id";
	pinctrl-names = "default", "sleep";
	pinctrl-0 = <&pinctrl_fec>;
	pinctrl-1 = <&pinctrl_fec_sleep>;
	...
};
```

읽는 법입니다.

- `pinctrl-names`가 *상태 이름의 배열*이고, `pinctrl-N`은 N번째 이름에 대응하는 핀 그룹 phandle 목록입니다.
- `"default"`는 driver core가 probe 직전에 적용합니다. `drivers/base/pinctrl.c`의 `pinctrl_bind_pins()`가 "called by the device core before probe"라는 주석과 함께 `PINCTRL_STATE_DEFAULT`를 찾아 선택합니다(18~40행). `"init"` 상태가 있으면 그것을 먼저 씁니다.
- `"sleep"`은 드라이버가 PM 경로에서 `pinctrl_pm_select_sleep_state()`(`drivers/pinctrl/core.c:1620`)를 불러야 적용됩니다. 상태를 정의만 해 두면 전환되지 않습니다.

## 부트로더 단계의 pin mux

부트로더가 동작할 시점에는 커널의 pinctrl driver가 없으므로 U-Boot가 스스로 콘솔 pad를 설정해야 합니다. 방법은 두 가지입니다. 예전 i.MX 보드 코드는 `iomux_v3_cfg_t` 배열을 `imx_iomux_v3_setup_multiple_pads()`로 직접 썼습니다. U-Boot v2024.04의 i.MX 8M Plus EVK는 그렇게 하지 않습니다. `imx8mp_evk_defconfig`가 `CONFIG_SPL_DM=y`, `CONFIG_SPL_OF_CONTROL=y`, `CONFIG_SPL_PINCTRL=y`, `CONFIG_PINCTRL_IMX8M=y`, `CONFIG_DM_SERIAL=y`를 켭니다. `SPL_DM_SERIAL`은 `DM_SERIAL && SPL_DM`이면 기본값이 y이므로(`drivers/serial/Kconfig:175-178`) SPL의 시리얼도 driver model 장치로 probe되고, 그때 커널과 같은 DT의 `pinctrl_uart2` 노드가 적용됩니다.

SPL용 DT에 어떤 노드가 들어갈지는 `arch/arm/dts/imx8mp-evk-u-boot.dtsi`가 정합니다.

```c
&pinctrl_uart2 {
	bootph-pre-ram;
};

&pinctrl_usdhc2 {
	bootph-pre-ram;
};
```

`bootph-pre-ram`이 붙은 노드만 DRAM 초기화 전 단계(SPL)의 DT에 남습니다. 그래서 핀 정보는 Linux와 U-Boot가 같은 `imx8mp-evk.dts`를 공유하고, U-Boot 쪽에는 "SPL에서도 이 노드가 필요하다"는 표시만 더해집니다. 새 보드에서 SPL 콘솔이 안 나오면 콘솔 핀 그룹에 이 표시가 있는지부터 봅니다.

## Clock tree — 루트에서 leaf까지

Pinmux가 *공간*의 문제라면, clock은 *시간*의 문제입니다. peripheral마다 *필요한 클록 주파수*가 있고, 그 클록을 *SoC의 어느 PLL에서 어떻게 분배*받을지를 정해야 합니다. i.MX 8M Plus의 트리 일부는 [Ch 2의 clock tree 그림](/blog/embedded/bsp/chapter02-datasheet)에 Linux `clk-imx8mp.c`에서 뽑아 그려 두었습니다.

U-Boot SPL이 이 트리를 실제로 어떻게 세우는지는 `arch/arm/mach-imx/imx8m/clock_imx8mm.c`(i.MX 8M Mini/Nano/Plus 공용)의 `clock_init()`(424행)에 있습니다. 주석과 설정을 표로 옮기면 다음과 같습니다.

| 클록 | U-Boot v2024.04가 하는 일 | 출처 행 |
|------|--------------------------|---------|
| SYS_PLL1 | "sys pll1 fixed at 800MHz", 출력 enable만 함 | 431, 435~441 |
| SYS_PLL2 | "sys pll2 fixed at 1GHz", 출력 enable만 함 | 432, 443~449 |
| ARM_PLL | `intpll_configure(ANATOP_ARM_PLL, MHZ(1200))`, "Configure ARM at 1.2GHz" | 451~455 |
| SYS_PLL3 | i.MX 8M Nano/Plus는 600 MHz | 460~461 |
| NOC_IO (8MP) | "8MP ROM already set NOC to 800Mhz", NOC_IO만 설정 | 466~468 |

콘솔 UART의 클록은 별도 함수가 맡습니다. `board/freescale/imx8mp_evk/spl.c:130`의 `board_init_f()`가 SPL 진입 직후 `init_uart_clk(1)`을 부르고, 이 함수(`clock_imx8mm.c:308`)는 UART2 root의 source를 0번, 주석대로 "24M OSC"로 고릅니다.

```c
case 1:
	clock_enable(CCGR_UART2, 0);
	clock_set_target_val(UART2_CLK_ROOT, CLK_ROOT_ON |
			     CLK_ROOT_SOURCE_SEL(0));
	clock_enable(CCGR_UART2, 1);
	return;
```

같은 파일의 `imx_get_uartclk()`가 `24000000U`를 돌려주는 것과 짝이 맞습니다. 콘솔 UART는 PLL이 아니라 24 MHz 오실레이터를 직접 받으므로, PLL 설정이 틀려도 콘솔은 뜹니다. 반대로 보드의 오실레이터가 24 MHz가 아니면 모든 baud rate가 같은 비율로 어긋납니다.

## Common Clock Framework (CCF)

Linux Common Clock Framework(CCF)는 clock provider/consumer를 위한 공통 API입니다. i.MX 8M Plus의 provider는 `drivers/clk/imx/clk-imx8mp.c`이고, consumer는 DT의 `clocks` 속성으로 clock ID를 지정합니다.

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
/* include/dt-bindings/clock/imx8mp-clock.h (Linux v6.12) */
#define IMX8MP_CLK_24M				2
#define IMX8MP_SYS_PLL1_800M			56
#define IMX8MP_CLK_UART1_ROOT			251
#define IMX8MP_CLK_USDHC1_ROOT			257
#define IMX8MP_CLK_END				330
```

ID는 0부터 `IMX8MP_CLK_END`(330) 앞까지입니다. 숫자를 외우지 말고 매크로 이름으로만 씁니다.

CCF가 *런타임에* 다음을 처리합니다.

- `clk_prepare_enable()` — peripheral driver가 호출하면 clock gate를 *열어* 클록을 흘립니다.
- `clk_set_rate()` — 목표 주파수로 *divider를 재계산*합니다.
- `clk_get_parent()` — 부모 클록 노드를 따라갑니다.
- `clk_set_parent()` — clock mux로 *다른 parent를 선택*합니다.

부팅 후 `/sys/kernel/debug/clk/clk_summary`로 *전체 트리*를 봅니다. i.MX 보드가 없어 QEMU virt 머신(Debian 13, 커널 6.12.116, `-M acpi=off`)에서 돌린 결과를 싣습니다. virt 머신에는 고정 클록 하나뿐이지만 열의 의미는 같습니다.

```text
$ cat /sys/kernel/debug/clk/clk_summary
                                 enable  prepare  protect                                duty  hardware                            connection
   clock                          count    count    count        rate   accuracy phase  cycle    enable   consumer                         id
---------------------------------------------------------------------------------------------------------------------------------------------
 clk24mhz                            3       4        0        24000000    0          0     50000      Y   9030000.pl061                   apb_pclk
                                                                                                           9000000.pl011                   no_connection_id
                                                                                                           9000000.pl011                   apb_pclk
                                                                                                           deviceless                      no_connection_id
```

읽는 법:

- `rate` — 현재 주파수.
- `enable count` / `prepare count` — 이 clock을 enable·prepare한 사용자 수.
- `consumer`, `connection id` — 커널 6.12의 출력은 클록마다 쓰는 장치와 DT `clock-names`를 함께 보여 줍니다. PL011이 같은 클록을 이름 없이 한 번, `apb_pclk`로 한 번 잡고 있습니다.

UART가 동작하지 않을 때 해당 root의 enable count가 0이면 *peripheral driver가 clock을 enable하지 않은 것*이고, consumer 목록에 장치가 없으면 DT `clocks` 연결부터 봅니다.

## U-Boot 단계의 clock 초기화

U-Boot에도 clock framework가 있습니다. `imx8mp_evk_defconfig`는 `CONFIG_CLK_IMX8MP=y`와 `CONFIG_CLK_COMPOSITE_CCF=y`를 켭니다. 다만 위에서 본 것처럼 DRAM 이전의 PLL과 UART root는 SPL이 `clock_init()`·`init_uart_clk()`로 레지스터를 직접 씁니다. DT 기반 clock driver는 그 뒤 단계에서 MMC·Ethernet 같은 장치의 클록을 다룹니다.

## 보드별로 변경되는 부분 — 어디인가

SoC dtsi의 clock 노드는 *고정*입니다. 우리가 *보드에서* 바꾸는 것은 다음입니다.

1. 외부 oscillator 주파수 — 회로도의 crystal 부품값. U-Boot `imx_get_uartclk()`처럼 24 MHz를 상수로 둔 코드가 있으므로 다르면 함께 고칩니다.
2. 보드 부품이 요구하는 rate — 예: 카메라 sensor의 입력 클록. Ch 3의 IMX219 overlay는 24 MHz `fixed-clock` 노드(`cam24m`)를 따로 만들어 센서에 줍니다.
3. 디스플레이 — 패널 pixel clock에 맞춰 VIDEO_PLL1 rate와 parent를 고릅니다.

TQ의 LVDS 패널 overlay(Linux v6.12 `imx8mp-tqma8mpql-mba8mpxl-lvds-g133han01.dtso:55`)가 `assigned-clocks`로 `IMX8MP_VIDEO_PLL1`을 지정하는 예입니다. `assigned-clock-*` 속성은 `of_clk_set_defaults()`(`drivers/clk/clk-conf.c:170`)가 해석해 적용하고, 이후 driver가 `clk_set_rate()`를 부르면 바뀝니다.

## 실전 — 시리얼 console이 안 뜨면

새 보드에서 *U-Boot의 시리얼이 안 뜨는* 상황에서 점검하는 순서입니다.

**[1] 하드웨어 점검**

- [ ] USB-TTL의 TX/RX 교차 확인
- [ ] GND 연결
- [ ] baud rate 일치 (`imx8mp_evk_defconfig`는 `CONFIG_BAUDRATE`를 따로 두지 않아 Kconfig 기본값 115200을 씁니다)
- [ ] 보드에 *전원*이 정상으로 들어오는지 (LED 확인)

**[2] 부트 미디어 점검**

- [ ] BOOT_MODE 핀이 SD/eMMC 중 옳은 미디어로 설정됐는지
- [ ] SPL/U-Boot 이미지가 SD에 올바른 오프셋에 있는지
- [ ] `flash.bin`이 SD의 32 KiB 오프셋에 raw로 써졌는지 (U-Boot `doc/board/nxp/imx8mp_evk.rst:55`, `dd ... bs=1K seek=32`)

**[3] Pin mux 점검**

- [ ] 콘솔 핀 그룹에 `bootph-pre-ram`이 있어 SPL DT에 남았는지
- [ ] 매크로의 기능이 맞는지 (`UART1_RXD__UART1_DCE_RX`와 `UART1_RXD__UART1_DTE_TX`는 같은 pad의 다른 방향)
- [ ] PAD_CTL 값이 동작하는 보드(EVK `0x140`)와 같은지

**[4] Clock 점검**

- [ ] `init_uart_clk()`의 index가 콘솔 UART 번호와 맞는지 (UART2 = 1)
- [ ] UART root의 source가 24 MHz OSC인지
- [ ] CCGR (clock gate) 비트가 켜져 있는지
- [ ] U-Boot의 `CONFIG_DEBUG_UART_CLOCK`이 *실제 주파수*와 같은지

SPL 다음 단계도 콘솔을 씁니다. U-Boot 문서의 i.MX 8M Plus 흐름은 TF-A에서 `make PLAT=imx8mp bl31`로 BL31만 빌드하고(`doc/board/nxp/imx8mp_evk.rst:24`), BL31은 `IMX_BOOT_UART_BASE`가 0이면 `imx8m_uart_get_base()`로 콘솔 주소를 찾습니다(TF-A v2.15.0 `plat/imx/imx8m/imx8mp/imx8mp_bl31_setup.c:140-157`). SPL 배너는 나오는데 U-Boot 배너가 안 나오면 BL31 콘솔 설정도 의심합니다.

## JTAG로 *clock 살아 있는지* 확인

부팅 중에 *어디서 멈췄는지* 모를 때 JTAG으로 IOMUXC와 CCM 레지스터를 *직접* 읽습니다.

Linux v6.12 `imx8mp.dtsi`는 IOMUXC의 register base를 `0x30330000`으로 정의하고, pin-function header는 UART2_RXD의 mux offset을 `0x228`로 둡니다. 따라서 그 mux register의 물리 주소는 base+offset인 `0x30330228`이고, 값의 하위 3비트가 0이면 UART2 기능입니다. 이 글은 i.MX 보드에서 JTAG을 실행하지 않았으므로 읽은 값은 싣지 않습니다.

U-Boot 프롬프트까지 왔다면 JTAG 없이 `md.l 0x30330228 1`로 같은 레지스터를 읽을 수 있습니다(`md` 명령은 U-Boot `cmd/mem.c`).

## 자주 하는 실수

### Pin mux 매크로의 *ALT 방향* 헷갈림

UART의 RX는 *입력*, TX는 *출력*입니다. 앞에서 본 `UART1_RXD__UART1_DTE_TX`처럼 pad 이름은 RXD인데 기능은 TX인 매크로가 있습니다. DCE/DTE 중 어느 쪽인지 회로도와 비교합니다.

### `clocks` 속성에 *parent ID* 적음

`clocks`는 *이 peripheral의 입력 clock leaf*입니다. parent를 적으면 안 됩니다. parent를 바꾸고 싶으면 `assigned-clock-parents`를 씁니다.

### Clock을 enable했는데 *gate*는 닫혀 있음

i.MX 8M Plus에서 UART2는 mux/divider인 `IMX8MP_CLK_UART2`와 gate인 `IMX8MP_CLK_UART2_ROOT`가 별개입니다(`clk-imx8mp.c:583`, `:667`). DT의 `clocks`가 gate(`_ROOT`)를 가리켜야 `clk_prepare_enable()`이 CCGR 비트까지 켭니다. U-Boot의 `init_uart_clk()`도 `clock_enable(CCGR_UART2, 1)`로 gate를 따로 엽니다.

### 다른 peripheral과 *핀 공유* 실수

같은 pad를 두 장치가 요청하면 pinmux core가 `pin %s already requested by %s; cannot claim for %s` 메시지로 두 번째 요청을 거절합니다(`drivers/pinctrl/pinmux.c:133`). 어느 장치가 어느 pad를 잡았는지는 debugfs의 `/sys/kernel/debug/pinctrl/<pinctrl 장치>/pinmux-pins`에 나옵니다(`Documentation/driver-api/pin-control.rst`). QEMU virt에는 pin controller가 없어 이 디렉터리에 `pinctrl-devices`, `pinctrl-handles`, `pinctrl-maps`만 있었습니다.

### XTAL 주파수 *24MHz 가정*

U-Boot의 `imx_get_uartclk()`는 `24000000U`를 상수로 돌려줍니다. 보드 crystal이 다른 값이면 이 상수로 계산한 baud divider가 crystal 비율만큼 어긋나므로, 시리얼에 깨진 글자가 나오면 crystal 값부터 확인합니다.

### `assigned-clocks`를 *너무 적극* 사용

`assigned-clocks`로 공유 PLL(예: VIDEO_PLL1)의 rate를 바꾸면 그 PLL을 parent로 쓰는 다른 장치의 rate도 함께 바뀝니다. 공유 PLL에는 소유 장치 하나만 rate를 지정합니다.

## 정리

- Pin mux는 *공간*의 문제, clock은 *시간*의 문제입니다.
- i.MX 8M Plus의 `UART1_RXD` pad는 pinfunc 매크로 기준 네 기능을 갖고, 같은 mux 레지스터(0x220)의 mode 값이 그중 하나를 고릅니다.
- DT의 pinctrl 노드는 `pinctrl-names`, `pinctrl-0`, `pinctrl-1`로 *상태별 핀 설정 묶음*을 정의합니다. peripheral 노드가 phandle로 참조합니다.
- U-Boot v2024.04의 i.MX 8M Plus EVK SPL은 DM pinctrl로 DT의 `pinctrl_uart2`(`bootph-pre-ram`)를 적용하고, UART2 root는 `init_uart_clk(1)`이 24 MHz OSC로 고정합니다.
- U-Boot `clock_init()`은 SYS_PLL1 800 MHz, SYS_PLL2 1 GHz를 "fixed"로 두고 ARM PLL을 1.2 GHz로 설정합니다.
- Linux CCF의 상태는 `/sys/kernel/debug/clk/clk_summary`로 보고, 6.12 출력은 consumer와 connection id까지 보여 줍니다.
- 시리얼이 안 뜨면 *하드웨어 → 부트 미디어 → pin mux → clock* 순서로 점검합니다. U-Boot까지 왔다면 `md`로 IOMUXC·CCM 레지스터를 읽습니다.

## 다음 편

[Ch 5 — DDR 매개변수](/blog/embedded/bsp/chapter05-ddr-params)에서는 BSP에서 가장 까다로운 부분인 DDR memory의 *물리적 timing 파라미터*가 어디서 오는지, vendor tool 사용법, 잘못된 값의 *증상*을 다룹니다.

## 관련 항목

- [Ch 2: SoC 데이터시트 읽기](/blog/embedded/bsp/chapter02-datasheet)
- [Ch 3: Device Tree 설계](/blog/embedded/bsp/chapter03-device-tree-design)
- [Ch 5: DDR 매개변수 — 보드별 timing](/blog/embedded/bsp/chapter05-ddr-params)
- [Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
- [원문 — Linux Common Clock Framework](https://www.kernel.org/doc/html/latest/driver-api/clk.html)
- [원문 — Linux pinctrl subsystem](https://www.kernel.org/doc/html/latest/driver-api/pin-control.html)
