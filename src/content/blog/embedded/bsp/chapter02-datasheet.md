---
title: "SoC 데이터시트 읽기 — Pin Mux·Clock·Memory Map 파악법"
slug: "embedded/bsp/chapter02-datasheet"
date: 2026-05-18T09:02:00
description: "Reference Manual에서 BSP에 필요한 정보를 찾는 방법 — clock tree, memory map, pin mux."
series: "BSP Development"
seriesOrder: 2
tags: [embedded, bsp, datasheet, reference-manual]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Reference Manual을 *처음부터 끝까지* 읽으면 BSP가 끝나기 전에 일정이 끝납니다."** — *어디를*, *왜*, *어떤 순서로* 읽어야 하는지가 BSP 엔지니어의 핵심 기술입니다.

이 글은 i.MX 8M Plus를 예로 RM에서 부팅과 보드 통합에 필요한 부분만 골라 읽는 방법을 다룹니다. RM의 숫자 하나하나는 결국 Linux와 U-Boot 소스의 상수가 되므로, 이 글의 주소·매크로·클록 값은 모두 Linux v6.12와 U-Boot v2024.04 소스에서 대조한 값입니다. 도서관에서 책 한 권을 다 읽는 대신 색인부터 펴는 것과 같습니다.

## SoC 문서의 종류

벤더가 같은 SoC에 대해 *여러 종류의 문서*를 발행합니다. 이름이 비슷해 보여도 *대상이 완전히 다른* 문서입니다.

| 문서 | 약어 | 대상 |
|------|------|------|
| Datasheet | DS | 하드웨어 설계자 — 전기적 특성, 핀 정의, 패키지 |
| Reference Manual | RM, TRM | 펌웨어·BSP 엔지니어 — register와 peripheral 동작 |
| Errata | ER | 모두 — SoC errata와 workaround |
| Application Note | AN | 특정 주제 — DDR tuning, secure boot 흐름 |
| Pin 설정 도구 | — | 보드 설계자·BSP — 핀별 기능 선택과 DT 조각 생성 |

BSP 엔지니어는 *Datasheet*에서 핀과 전기 특성을, *Reference Manual*에서 레지스터와 클록 트리를, *Errata*에서 버그 workaround를, *Application Note*에서 DDR 같은 깊은 주제를 봅니다.

## 반드시 읽어야 할 4개 챕터

첫 부팅까지 필요한 입력은 네 주제로 모입니다. 각 주제가 어떤 소스 파일의 어떤 값이 되는지를 짝지어 보면 읽는 목적이 분명해집니다.

| RM 주제 | 소스에서 그 값이 들어가는 곳 (i.MX 8M Plus) |
|---------|------------------------------------------|
| Memory Map | `imx8mp.dtsi`의 `reg`, U-Boot `arch/arm/include/asm/arch-imx8m/imx-regs.h` |
| Clock Tree | Linux `drivers/clk/imx/clk-imx8mp.c`, DT의 `assigned-clocks` |
| Reset and Boot | 보드 boot switch, U-Boot `flash.bin` 오프셋 |
| Pin Multiplexing | Linux `imx8mp-pinfunc.h`, 보드 dts의 `fsl,pins` |

### 1. Memory Map (또는 Address Map)

SoC의 모든 *물리 주소 공간*을 한 표로 보여줍니다. DDR 영역, SRAM 영역, 모든 peripheral의 base address가 여기 있습니다.

i.MX 8M Plus의 메모리 맵 중 BSP가 먼저 쓰는 주소를 U-Boot v2024.04 `arch/arm/include/asm/arch-imx8m/imx-regs.h`에서 옮기면 다음과 같습니다. 같은 값이 Linux v6.12 `imx8mp.dtsi`의 노드 이름(`gpio1: gpio@30200000`, `iomuxc: pinctrl@30330000`, `clk: clock-controller@30380000`, `uart1: serial@30860000`, `uart2: serial@30890000`)에도 있습니다.

```c
#define GPIO1_BASE_ADDR		0X30200000
#define IOMUXC_BASE_ADDR	0x30330000
#define CCM_BASE_ADDR		0x30380000
#define UART1_BASE_ADDR		0x30860000
#define UART3_BASE_ADDR		0x30880000
#define UART2_BASE_ADDR		0x30890000
#define I2C1_BASE_ADDR		0x30A20000
```

UART 번호와 주소 순서가 일치하지 않는다는 점이 눈에 띕니다. UART3가 UART2보다 낮은 주소에 있으므로 "UART n의 주소 = UART1 + n × 0x10000" 같은 추측은 틀립니다. 주소는 항상 표에서 읽습니다.

DDR은 SoC 표가 아니라 보드가 정합니다. EVK의 경우 U-Boot `include/configs/imx8mp_evk.h`가 `PHYS_SDRAM 0x40000000`, `PHYS_SDRAM_SIZE 0xC0000000 /* 3 GB */`, `PHYS_SDRAM_2 0x100000000`을 정의하고, Linux `imx8mp-evk.dts`의 `memory@40000000` 노드가 `reg = <0x0 0x40000000 0 0xc0000000>, <0x1 0x00000000 0 0xc0000000>`로 같은 두 영역을 적습니다. 주소·크기는 디바이스 트리의 `reg`에 들어가고, 셀 수는 부모 bus의 `#address-cells`·`#size-cells`가 정합니다.

읽을 때 다음을 확인합니다.

- DDR base address와 크기 (SoC 주소 규칙, 보드의 실제 메모리 부품·연결을 대조)
- 모든 UART base address (어느 UART이 console인지 미리 결정)
- IOMUXC, CCM의 base address (pin mux와 clock 코드에서 필요)
- Secure 영역과 Non-secure 영역의 경계 (ARMv8 보드)

### 2. Clock Tree (또는 Clock and Reset)

루트 oscillator에서 시작해 PLL과 divider를 거쳐 peripheral clock으로 연결되는 구조입니다. 수도관에 비유하면 oscillator는 상수도 본관, PLL은 가압 펌프, divider는 감압 밸브, peripheral clock root는 각 집의 수도꼭지입니다.

아래 그림은 Linux v6.12 `drivers/clk/imx/clk-imx8mp.c`에서 뽑은 일부입니다. `sys_pll1_out`에서 `sys_pll1_400m`(1/2), `sys_pll1_200m`(1/4), `sys_pll1_80m`(1/10)이 fixed factor로 갈라지고(484~493행), UART2 root의 mux 입력 목록 `imx8mp_uart2_sels`는 `osc_24m`, `sys_pll1_80m`, `sys_pll2_200m` 순으로 시작합니다(245행). ARM_PLL의 1.8 GHz는 `imx8mp.dtsi`의 A53 OPP 표 최고점 `opp-1800000000`입니다.

![i.MX 8M Plus clock tree](/images/blog/bsp/diagrams/ch02-clock-tree.svg)

읽을 때 다음을 정합니다.

- 외부 oscillator 주파수 (회로도의 crystal 부품값)
- 각 PLL의 *목표 주파수*. 예: `imx8mp.dtsi`는 `IMX8MP_CLK_NOC`를 `SYS_PLL2_1000M`에서 1 GHz로, `IMX8MP_CLK_GIC`를 `SYS_PLL2_500M`에서 500 MHz로 고정합니다(`assigned-clock-rates`).
- UART, I2C, SPI, MMC의 *parent clock 선택*

clock tree가 *디바이스 트리의 clocks 속성*과 *U-Boot SPL의 클록 초기화 코드*에 직접 반영됩니다. [Ch 4](/blog/embedded/bsp/chapter04-pinmux-clock)에서 자세히 다룹니다.

### 3. Reset and Boot (또는 Boot Sequence)

SoC가 power-on부터 *어떤 순서로* peripheral을 깨우고, *어디서* 첫 코드를 가져오는지를 다룹니다.

BSP에서 먼저 확인할 항목이 *boot source*입니다. Boot mode는 SoC boot configuration 핀과 fuse 설정, 보드의 strap/switch 회로가 함께 정합니다. 아래 표는 i.MX 8M Plus EVK의 SW4 스위치 표입니다. 모든 보드의 범용 strap 표가 아니라 이 EVK의 배선입니다.

| EVK boot device | SW4-1 | SW4-2 | SW4-3 | SW4-4 |
|---|---:|---:|---:|---:|
| Boot from fuses | 0 | 0 | 0 | 0 |
| USB serial download | 0 | 0 | 0 | 1 |
| USDHC3 (eMMC boot; EVK default) | 0 | 0 | 1 | 0 |
| USDHC2 (SD boot) | 0 | 0 | 1 | 1 |
| NAND 8-bit, 256-page | 0 | 1 | 0 | 0 |
| NAND 8-bit, 512-page | 0 | 1 | 0 | 1 |
| QSPI 3-byte read | 0 | 1 | 1 | 0 |
| QSPI Hyperflash | 0 | 1 | 1 | 1 |
| ecSPI | 1 | 0 | 0 | 0 |

표는 [NXP Getting Started with the i.MX 8M Plus EVK](https://www.nxp.com/document/guide/getting-started-with-the-i-mx-8m-plus-evk:GS-iMX-8M-Plus-EVK) 3.4절의 표와 같고, 같은 문서는 "1 = ON; 0 = OFF"와 "The default boot device is eMMC/uSDHC3"를 적습니다. 개발 중에 SD 카드로 부팅하려면 SW4를 `0011`로 바꿔야 한다는 뜻입니다. U-Boot `doc/board/nxp/imx8mp_evk.rst`의 절차도 `flash.bin`을 MicroSD의 32 KiB 오프셋에 씁니다(`dd ... bs=1K seek=32`).

### 4. Pin Multiplexing (IOMUXC, PINCTRL)

SoC의 외부 pad 하나는 여러 alternate function 중 하나를 고릅니다. 멀티탭 콘센트 하나에 어떤 가전을 꽂을지 정하는 일과 같습니다. 각 보드가 배선한 기능에 맞는 mux mode를 선택하는 것이 pin mux입니다.

Linux v6.12 `imx8mp-pinfunc.h:732`에는 UART1_RXD pad를 UART1 DCE 수신 기능으로 설정하는 매크로가 있습니다. 이 파일은 mux/config/input 레지스터 오프셋과 기능 이름을 제공하지만 package ball 위치는 담지 않습니다. pad와 ball 매핑은 package pinout 자료에 있습니다.

```text
MX8MP_IOMUXC_UART1_RXD__UART1_DCE_RX  0x220 0x480 0x5E8 0x0 0x4
```

매크로의 다섯 값은 `<mux_reg conf_reg input_reg mux_mode input_val>` 순서입니다. 같은 파일의 `MX8MP_IOMUXC_UART2_TXD__UART2_DCE_TX`는 `0x22C 0x48C 0x000 0x0 0x0`으로 input_reg가 0인 반면, RX 쪽 `UART2_RXD__UART2_DCE_RX`는 input_reg `0x5F0`과 input_val `0x6`을 가집니다. 같은 UART라도 방향에 따라 설정할 레지스터 수가 다릅니다. 이 매크로는 SoC가 *할 수 있는* 선택이고, 보드가 실제로 그 pad를 무엇에 배선했는지는 회로도에 있습니다.

## Pin 설정 도구 — 벤더가 주는 보조 자료

SoC 벤더는 핀 선택을 GUI로 하는 도구를 제공합니다. 벤더 제품 페이지에서 확인한 기능은 다음과 같습니다.

| 벤더 | 도구 | 제품 페이지가 밝힌 기능 |
|------|------|------------------------|
| NXP | Config Tools for i.MX Applications Processors | Pins Tool이 C 코드와 "Device Tree Snippets Include (.dtsi) files", CSV 보고서를 생성. 지원 장치 목록에 i.MX8MPLUS 포함 |
| TI | SysConfig | pin mux 설정 GUI. CCStudio 통합, 단독 데스크톱 앱, 클라우드 앱 세 형태 |

MCU용 MCUXpresso Config Tools 페이지는 Pins Tool 출력을 "ANSI-C source code"라고만 적으므로 i.MX 8M 계열에는 위의 i.MX용 Config Tools를 씁니다.

결과물인 보드 DT가 어떤 모습인지는 Linux v6.12 `imx8mp-evk.dts`가 보여 줍니다. EVK의 I2C1과 콘솔 UART2 핀 그룹입니다.

```c
&iomuxc {
    pinctrl_uart2: uart2grp {
        fsl,pins = <
            MX8MP_IOMUXC_UART2_RXD__UART2_DCE_RX    0x140
            MX8MP_IOMUXC_UART2_TXD__UART2_DCE_TX    0x140
        >;
    };

    pinctrl_i2c1: i2c1grp {
        fsl,pins = <
            MX8MP_IOMUXC_I2C1_SCL__I2C1_SCL         0x400001c2
            MX8MP_IOMUXC_I2C1_SDA__I2C1_SDA         0x400001c2
        >;
    };
};
```

각 줄의 마지막 값(`0x140`, `0x400001c2`)은 [`imx8mp-pinfunc.h`](https://github.com/torvalds/linux/blob/v6.12/arch/arm64/boot/dts/freescale/imx8mp-pinfunc.h) 매크로 밖에 있는 pad control 값입니다. 매크로가 *어느 기능*인지를 정하고, 이 값이 pull·drive strength 같은 *전기적 설정*을 정합니다. 두 값은 RM의 IOMUXC 장에서 서로 다른 레지스터(mux_reg와 conf_reg)에 들어갑니다.

## Errata는 *반드시* 읽는다

Errata는 SoC의 *알려진 버그*와 그 우회 방법입니다. RM은 칩이 *설계대로* 동작한다고 가정하고 쓰였으므로, RM대로 했는데 안 되는 문제의 답은 errata에 있습니다.

같은 NXP 계열인 i.MX 95의 PCIe erratum을 예로 듭니다. Linux v6.16의 `drivers/pci/controller/dwc/pci-imx6.c`가 workaround 코드 옆에 남긴 요약입니다.

```text
ERR051586: Compliance with 8GT/s Receiver Impedance ECN

The default value of GEN3_RELATED_OFF[GEN3_ZRXDC_NONCOMPL]
is 1 which makes receiver non-compliant with the ZRX-DC
parameter for 2.5 GT/s when operating at 8 GT/s or higher.
It causes unnecessary timeout in L1.

Workaround: Program GEN3_RELATED_OFF[GEN3_ZRXDC_NONCOMPL]
to 0.
```

위 erratum은 커널 PCIe host driver가 초기화 콜백 `imx_pcie_host_post_init`에서 이 비트를 0으로 씁니다. 적용 여부는 `IMX_PCIE_FLAG_8GT_ECN_ERR051586` 플래그로 정해지고, 이 플래그는 `[IMX95]` 항목에만 붙어 있습니다.

이 코드가 *언제* 들어왔는지가 교훈입니다. kernel.org에서 받은 `pci-imx6.c`를 버전별로 grep하면 v6.15에는 `ERR051586`이 0번, v6.16에는 5번 나옵니다. 그러니 v6.12나 v6.15에서 fork한 i.MX 95 BSP에는 이 workaround가 없습니다. fork 시점 이후에 나온 erratum은 직접 백포트해야 합니다.

읽는 순서는 다음과 같습니다.

1. SoC vendor 사이트에서 *해당 SoC의 최신 errata*를 받습니다.
2. 우리 보드가 쓰는 블록(DDR, USB, PCIe, 부트 미디어)에 해당하는 erratum을 먼저 고릅니다.
3. 각 erratum 번호(`ERR051586` 같은)로 U-Boot와 커널 트리를 grep해 *workaround가 우리 코드에 있는지* 확인합니다.
4. 없다면 upstream의 해당 커밋을 찾아 백포트하거나 BSP의 *알려진 문제* 목록에 올립니다.

## 무엇을 *건너뛰어도* 되는가

RM의 다음 부분은 BSP 첫 부팅 단계에서는 *건너뛰어도* 됩니다.

- **GPU/VPU/카메라 ISP 관련 챕터** — 대형 IP는 별도 드라이버 작업으로, 첫 부팅 이후 단계.
- **PCIe 상세** — Wi-Fi가 PCIe면 필요. 아니면 후순위.
- **CAN, FlexRay 같은 산업용 버스** — 그 기능을 쓰는 보드에서만.
- **DSP, NPU 코어 챕터** — Linux 부팅 경로에 들어가지 않음.
- **Security IP 상세** — TF-A가 위임받는 부분. 따로 다룸.

이런 챕터는 제품 요구사항에 그 기능이 들어갈 때 읽습니다.

## 회로도 읽기 — RM의 짝꿍

RM이 *SoC의 능력*을 보여준다면, 회로도는 *우리 보드가 그 능력을 어떻게 활용*하는지를 보여줍니다. BSP는 둘을 *교차 참조*하며 작업합니다.

회로도에서 BSP에 직접 필요한 정보입니다.

- [ ] 외부 oscillator와 각 clock source의 주파수
- [ ] `BOOT_MODE` 핀의 strap 저항값
- [ ] UART1 (또는 console UART)의 RX/TX 핀 번호
- [ ] 어느 USDHC가 SD에, 어느 USDHC가 eMMC에 연결되는지
- [ ] Ethernet PHY 모델 + MDIO 주소
- [ ] DDR 칩 모델
- [ ] DDR 부품의 데이터 폭·rank·연결과 SoC DRAM bus 구성을 대조
- [ ] PMIC 모델 + I2C 주소
- [ ] Wi-Fi/BT 모듈 종류
- [ ] 각 power rail의 voltage
- [ ] Reset 회로 (`POR_B`, watchdog reset)

이 목록의 칸 하나하나가 DT 노드 하나가 됩니다. BeagleBone Black을 예로 들면 PMIC 칸은 `am335x-bone-common.dtsi`의 `tps: tps@24`(I2C0, 주소 0x24)가 되고, PHY 칸은 `ethernet-phy@0`이 됩니다. 빈칸이 남으면 DT를 쓸 수 없으므로 목록을 다 채운 뒤에 DT 작업을 시작합니다.

## RM 읽기의 효율 — 검색과 구조 파악

RM을 처음부터 순서대로 읽는 대신 다음 순서로 필요한 표에 바로 갑니다.

1. **PDF reader에서 keyword 검색.** "UART1 base address"로 메모리 맵 표를, "PLL1"으로 clock 트리 그림을, "BOOT_MODE"로 boot mode 표를 곧장 찾습니다.
2. **그림(figure) 중심으로 본다.** Clock tree, memory map, boot sequence 그림이 해당 챕터의 *요약*에 해당합니다.
3. **표(table)를 우선 본다.** Pin mux 표, 레지스터 표, boot 모드 표가 핵심입니다.
4. **동작하는 BSP source를 *반대로* 본다.** Linux `imx8mp.dtsi:1077`의 `uart1` 노드에 있는 `interrupts = <GIC_SPI 26 IRQ_TYPE_LEVEL_HIGH>`를 찾고(바로 아래 `uart2`는 `GIC_SPI 27`), RM의 interrupt 표에서 UART1이 26번인 근거를 역추적합니다.

동작하는 BSP는 RM을 대신하지 않지만, 어떤 RM 항목이 실제로 쓰였는지 알려 주는 색인 역할을 합니다.

## 실전 예 — i.MX 8M Plus 콘솔 UART 결정

새 보드의 console UART을 RM과 회로도를 *교차 참조*하면서 정하는 흐름을 봅시다.

EVK는 UART2를 콘솔로 씁니다. `imx8mp-evk.dts`의 `chosen` 노드가 `stdout-path = &uart2;`이고 `&uart2` 노드에 `/* console */` 주석이 있습니다. 이 결정을 RM과 회로도에서 다시 따라가 봅니다.

**단계 1: 회로도와 package pinout 확인.** debug 헤더의 RX/TX 신호를 회로도에서 따라가 SoC pad 이름(`UART2_RXD`, `UART2_TXD`)을 찾고, package pinout에서 ball 위치를 확인합니다. 이 글은 EVK 회로도를 인용하지 않으므로 ball 번호는 적지 않습니다.

**단계 2: pin function 대조.** pad 이름을 `imx8mp-pinfunc.h`에서 찾습니다. `MX8MP_IOMUXC_UART2_RXD__UART2_DCE_RX`는 `0x228 0x488 0x5F0 0x0 0x6`(740행)이고, mux mode 0이 UART2 기능입니다.

**단계 3: 메모리 맵에서 UART2 base address.** `imx-regs.h:42`의 `UART2_BASE_ADDR 0x30890000`이고, `imx8mp.dtsi`의 `uart2: serial@30890000`의 `reg = <0x30890000 0x10000>`과 같습니다.

**단계 4: DT 작성.** `imx8mp.dtsi`에 이미 정의된 `&uart2` 노드를 활성화합니다. 아래는 `imx8mp-evk.dts:738-743`과 `:1028-1033`입니다.

```c
&uart2 {
    pinctrl-names = "default";
    pinctrl-0 = <&pinctrl_uart2>;
    status = "okay";
};

&iomuxc {
    pinctrl_uart2: uart2grp {
        fsl,pins = <
            MX8MP_IOMUXC_UART2_RXD__UART2_DCE_RX    0x140
            MX8MP_IOMUXC_UART2_TXD__UART2_DCE_TX    0x140
        >;
    };
};
```

**단계 5: U-Boot 초기 디버그 UART.** `imx8mp_evk_defconfig`는 `CONFIG_MXC_UART=y`만 켜고 콘솔은 DT의 `stdout-path`를 따릅니다. driver model이 뜨기 전 SPL 초기에 문자를 찍고 싶다면 debug UART를 켭니다. 심볼 이름은 U-Boot v2024.04 `drivers/serial/Kconfig`의 `DEBUG_UART_MXC`(408행), `DEBUG_UART_BASE`(498행), `DEBUG_UART_CLOCK`(525행)이고, 클록 24 MHz는 같은 SoC를 쓰는 `imx8mp_dhcom_pdk2_defconfig:30`의 값입니다.

```ini
CONFIG_DEBUG_UART=y
CONFIG_DEBUG_UART_MXC=y
CONFIG_DEBUG_UART_BASE=0x30890000
CONFIG_DEBUG_UART_CLOCK=24000000
```

`DEBUG_UART`의 드라이버 선택(choice)은 기본값이 `DEBUG_UART_NS16550`(Kconfig 235행)이므로 `DEBUG_UART_MXC=y`를 명시해야 i.MX UART 드라이버가 붙습니다. 이렇게 *RM → 회로도 → DT → defconfig*로 이어지는 흐름이 BSP 작업의 *최소 단위*입니다.

## 새 SoC를 받았을 때 읽는 순서

| 순서 | 작업 | 산출물 |
|------|------|--------|
| 1 | RM 목차 훑기, Memory Map 장 | console UART·IOMUXC·CCM·DDR 주소 표 |
| 2 | Clock Tree 장 | 사용할 peripheral의 parent clock 목록 |
| 3 | Boot 장 | boot mode 표와 회로도 strap 대조 |
| 4 | Pin Mux 장, pin 설정 도구 | 보드 핀 표 |
| 5 | Errata | 우리 보드 블록에 해당하는 erratum 목록과 코드 적용 여부 |
| 6 | 회로도 | 위 회로도 체크리스트 |
| 7 | reference BSP source | EVK dts·U-Boot board 디렉터리 구조 |

## 자주 하는 실수

### Datasheet와 Reference Manual을 *혼동*

Datasheet는 전기적 특성 중심이고, Reference Manual은 레지스터 중심입니다. BSP는 RM을 봅니다. 받은 자료에 레지스터 표가 없으면 datasheet만 받은 것입니다.

### 영문 PDF에 *비활성 검색*

스캔된 PDF는 텍스트 레이어가 없어 검색이 안 됩니다. 이때는 OCR을 돌리거나 벤더 사이트에서 원본 PDF를 다시 받습니다. 검색 안 되는 RM과 작업하는 것은 *눈 감고 코끼리 만지기*입니다.

### Errata를 *최신본*으로 안 받음

Errata 문서에는 개정 이력이 있고, 개정마다 erratum이 추가됩니다. 위의 ERR051586 workaround가 커널에 v6.16에서야 들어온 것처럼 erratum은 칩 출시 뒤에도 늘어납니다. 원인을 모르는 문제가 남아 있으면 최신 개정판을 다시 받아 개정 이력부터 봅니다.

### Pin Mux를 *손으로* 계산

IOMUXC 레지스터 오프셋을 RM 표에서 손으로 옮겨 적으면 위의 UART2/UART3 주소 역전 같은 함정에 걸립니다. 커널 `imx8mp-pinfunc.h`의 매크로나 벤더 도구 출력을 씁니다.

## 정리

- Memory Map, Clock Tree, Reset & Boot, Pin Multiplexing 네 주제가 첫 부팅의 입력이고, 각각 `imx-regs.h`·`clk-imx8mp.c`·boot switch·`imx8mp-pinfunc.h`로 이어집니다.
- UART3가 UART2보다 낮은 주소에 있듯, 주소는 규칙으로 추측하지 않고 표에서 읽습니다.
- Errata는 erratum 번호로 소스 트리를 grep해 적용 여부를 확인합니다. ERR051586은 Linux v6.16에서 들어왔습니다.
- pin 설정은 커널 pinfunc 매크로나 벤더 도구(NXP Config Tools의 `.dtsi`, TI SysConfig) 출력을 씁니다.
- 회로도와 RM은 *교차 참조*합니다. 회로도가 *우리 보드*를, RM이 *SoC의 능력*을 보여줍니다.
- RM은 목차와 keyword 검색으로 필요한 장을 찾고, figure·table·관련 설명을 함께 확인합니다.
- 비슷한 보드의 *동작하는 BSP source*가 가장 정확한 *RM 해석서*입니다.
- U-Boot debug UART 드라이버 선택 기본값은 NS16550이므로 i.MX에서는 `DEBUG_UART_MXC=y`를 명시합니다.

## 다음 편

[Ch 3 — Device Tree 설계](/blog/embedded/bsp/chapter03-device-tree-design)에서는 RM에서 얻은 정보를 *디바이스 트리*로 표현하는 방법, `<soc>.dtsi` 상속, `<board>.dts` 작성, overlay 사용을 다룹니다.

## 관련 항목

- [Ch 1: BSP란 무엇인가](/blog/embedded/bsp/chapter01-what-is-bsp)
- [Ch 3: Device Tree 설계](/blog/embedded/bsp/chapter03-device-tree-design)
- [Ch 4: Pin Mux와 Clock](/blog/embedded/bsp/chapter04-pinmux-clock)
- [Ch 5: DDR 매개변수 — 보드별 timing](/blog/embedded/bsp/chapter05-ddr-params)
- [PCIe Ch 6: Power Management](/blog/embedded/hardware/pcie/chapter06-power-management) — erratum이 말하는 L1에서의 불필요한 timeout이 어떤 상태에서 일어나는지
- [원문 — NXP i.MX 8M Plus Reference Manual](https://www.nxp.com/products/processors-and-microcontrollers/arm-processors/i-mx-applications-processors/i-mx-8-applications-processors/i-mx-8m-plus-arm-cortex-a53-machine-learning-vision-multimedia-and-industrial-iot:IMX8MPLUS)
- [NXP Config Tools for i.MX Applications Processors](https://www.nxp.com/design/design-center/software/development-software/config-tools-for-i-mx-applications-processors:CONFIG-TOOLS-IMX)
