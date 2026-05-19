---
title: "Ch 2: SoC 데이터시트 읽기"
date: 2026-05-09T02:00:00
description: "Reference Manual에서 BSP에 필요한 정보를 찾는 방법 — clock tree, memory map, pin mux."
series: "BSP Development"
seriesOrder: 2
tags: [embedded, bsp, datasheet, reference-manual]
draft: false
---

## 한 줄 요약

> **"Reference Manual을 *처음부터 끝까지* 읽으면 BSP가 끝나기 전에 일정이 끝납니다."** — *어디를*, *왜*, *어떤 순서로* 읽어야 하는지가 BSP 엔지니어의 핵심 기술입니다.

NXP i.MX 8M Plus Reference Manual은 *5400페이지*입니다. Rockchip RK3588 TRM은 *3600페이지*. TI AM62x는 *9000페이지*가 넘습니다. 다 읽을 수 없고, 다 읽을 필요도 없습니다. *BSP를 띄우는 데 필요한 4개 챕터*를 정확히 짚는 것이 이 글의 목표입니다.

## SoC 문서의 종류

벤더가 같은 SoC에 대해 *여러 종류의 문서*를 발행합니다. 이름이 비슷해 보여도 *대상이 완전히 다른* 문서입니다.

| 문서 | 약어 | 대상 | 분량 |
|------|------|------|------|
| Datasheet | DS | 하드웨어 설계자 — 전기적 특성, 핀 정의, 패키지 | 100~300페이지 |
| Reference Manual | RM, TRM | 펌웨어·BSP 엔지니어 — 모든 레지스터, peripheral 동작 | 2000~9000페이지 |
| Errata | ER | 모두 — SoC 버그 목록과 workaround | 50~200페이지 |
| Application Note | AN | 특정 주제 — DDR tuning, secure boot 흐름 | 20~100페이지/건 |
| Pin Mux Spreadsheet | — | 보드 설계자·BSP — 핀별 기능 매트릭스 | XLSX 1개 |

BSP 엔지니어는 *Datasheet*에서 핀과 부트 모드를, *Reference Manual*에서 레지스터와 클록 트리를, *Errata*에서 버그 workaround를, *Application Note*에서 DDR 같은 깊은 주제를 봅니다. *Pin Mux Spreadsheet*가 작업 효율을 좌우합니다.

## 반드시 읽어야 할 4개 챕터

Reference Manual의 거의 모든 SoC에서 다음 네 챕터가 BSP의 80%를 결정합니다.

### 1. Memory Map (또는 Address Map)

SoC의 모든 *물리 주소 공간*을 한 표로 보여줍니다. DDR 영역, SRAM 영역, 모든 peripheral의 base address가 여기 있습니다.

NXP i.MX 8M Plus의 메모리 맵 일부입니다.

```text
0x0000_0000 - 0x0007_FFFF   Boot ROM
0x0010_0000 - 0x0011_FFFF   On-chip SRAM (128KB)
0x3000_0000 - 0x303F_FFFF   AIPS-1 (peripheral bus 1)
0x3034_0000 - 0x3034_FFFF   IOMUXC (pinmux 컨트롤러)
0x3038_0000 - 0x3038_FFFF   CCM    (Clock Control Module)
0x3084_0000 - 0x3084_FFFF   UART1
0x3082_0000 - 0x3082_FFFF   GPIO1
...
0x4000_0000 - 0xFFFF_FFFF   DDR (최대 4GB)
```

이 주소들은 *디바이스 트리의 `reg` 속성*에 들어갑니다. 같은 정보가 RM과 dtsi에 *중복*으로 들어 있어야 합니다. dtsi에 적힌 주소가 잘못되면 peripheral probe가 실패합니다.

읽을 때 다음을 확인합니다.

- DDR base address (대부분 0x4000_0000 또는 0x8000_0000)
- 모든 UART base address (어느 UART이 console인지 미리 결정)
- IOMUXC, CCM의 base address (pin mux와 clock 코드에서 필요)
- Secure 영역과 Non-secure 영역의 경계 (ARMv8 보드)

### 2. Clock Tree (또는 Clock and Reset)

루트 oscillator에서 시작해 PLL을 거쳐 모든 peripheral clock으로 가는 *트리* 구조입니다. SoC에 따라 클록 노드가 *200~600개*에 달합니다.

i.MX 8M Plus의 단순화된 흐름입니다.

```text
24MHz XTAL  ─┐
             ├─→ SYS_PLL1 (800MHz fixed)
             │       ├─→ /2 = 400MHz
             │       ├─→ /4 = 200MHz
             │       └─→ /8 = 100MHz  ─→ UART_CLK_ROOT
             │
             ├─→ ARM_PLL (1800MHz max) ─→ A53 cores
             │
             └─→ DRAM_PLL (DDR rate)  ─→ DRAM controller
```

읽을 때 다음을 정합니다.

- 외부 oscillator 주파수 (보드별로 다름, *회로도에서* 확인)
- 각 PLL의 *목표 주파수* (벤더 BSP의 권장값)
- UART, I2C, SPI, MMC의 *parent clock 선택*

clock tree가 *디바이스 트리의 clocks 속성*과 *U-Boot SPL의 클록 초기화 코드*에 직접 반영됩니다. [Ch 4](/blog/embedded/bsp/chapter04-pinmux-clock)에서 자세히 다룹니다.

### 3. Reset and Boot (또는 Boot Sequence)

SoC가 power-on부터 *어떤 순서로* peripheral을 깨우고, *어디서* 첫 코드를 가져오는지를 다룹니다.

BSP에서 가장 먼저 결정해야 할 것이 *boot mode*입니다. 같은 i.MX 8M Plus라도 *4가지 boot mode*가 있습니다.

| Boot mode | 출처 | 용도 |
|----------|------|------|
| eMMC | 보드 위 eMMC 칩 | 양산 제품 |
| SD card | 외부 SD 슬롯 | 개발 |
| USB serial download | USB OTG 포트 | 공장 provisioning, 복구 |
| QSPI NOR flash | 외부 SPI flash | 작은 시스템 |

Boot mode는 *보드 위 핀의 strap 저항*으로 결정됩니다. RM의 boot 챕터에 *BOOT_MODE0/1/2 핀의 표*가 있습니다.

| `BOOT_MODE[2:0]` | Boot Device |
|---|---|
| `3'b000` | Reserved |
| `3'b001` | USB Serial Download |
| `3'b010` | eMMC (USDHC3) |
| `3'b011` | SD Card (USDHC2) |
| `3'b100` | QSPI NOR Flash |
| `3'b101` | NAND Flash |
| ... | ... |

이 값이 *보드 회로도와 일치*해야 합니다. 일치하지 않으면 BootROM이 엉뚱한 미디어를 찾고, 시리얼에는 아무것도 안 나옵니다.

### 4. Pin Multiplexing (IOMUXC, PINCTRL)

SoC의 모든 외부 핀이 *여러 기능*을 가집니다. 한 핀이 UART_TX도, GPIO도, SPI MOSI도, I2S DATA도 될 수 있습니다. *어느 모드를 선택할지*가 pin mux입니다.

i.MX 8M Plus의 SAI5_RXFS 핀(Ball K1)의 alternate function 표입니다.

| ALT | Function |
|---|---|
| ALT0 | `SAI5_RXFS` — SAI5 frame sync (default) |
| ALT1 | `SAI1_TX_DATA0` — SAI1 transmit data 0 |
| ALT2 | `PWM4_OUT` |
| ALT3 | `I2C6_SCL` |
| ALT4 | `UART3_DCE_RX` |
| ALT5 | `GPIO3_IO21` — general purpose IO |
| ALT6 | `SRC_BOOT_MODE3` |
| ALT7 | `EPDC_PWR_CTRL3` |

각 ALT는 *IOMUXC 레지스터*의 MUX_MODE 필드에 해당합니다. RM 표를 보고 *우리 보드에서 어떤 ALT를 쓰는지*를 정해 *디바이스 트리의 pinctrl 노드*에 적습니다.

Pin Mux Spreadsheet(별도 XLSX)가 *이 정보를 보드 단위로 정리해 주는* 보조 자료입니다. 다음 절에서 봅니다.

## Pin Mux Spreadsheet — 가장 유용한 보조 자료

NXP, TI, ST는 *공식 Pin Mux 도구*를 제공합니다.

| 벤더 | 도구 |
|------|------|
| NXP | MCUXpresso Config Tools (Pin Mux 탭) |
| TI | SysConfig (브라우저 또는 IDE 통합) |
| ST | STM32CubeMX |
| Rockchip | Pin Spreadsheet (Excel, vendor에서 받음) |

도구가 *GUI*로 핀을 선택하면 *DT fragment*와 *U-Boot board 코드*를 생성해 줍니다. *직접 손으로 IOMUXC 레지스터 값을 계산하는 것은 거의 항상 실수의 원천*입니다.

NXP의 도구가 생성하는 i.MX 8M Plus DT fragment 예시입니다.

```text
&iomuxc {
    pinctrl_uart1: uart1grp {
        fsl,pins = <
            MX8MP_IOMUXC_UART1_RXD__UART1_DCE_RX    0x140
            MX8MP_IOMUXC_UART1_TXD__UART1_DCE_TX    0x140
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

`MX8MP_IOMUXC_UART1_RXD__UART1_DCE_RX` 같은 매크로가 *IOMUXC 레지스터 5개*(MUX_CTL, PAD_CTL, INPUT_DAIZY 등)에 들어갈 값을 한꺼번에 캡슐화합니다. 매크로 정의는 `arch/arm64/boot/dts/freescale/imx8mp-pinfunc.h`에 있습니다.

## Errata는 *반드시* 읽는다

Errata는 SoC의 *알려진 버그*입니다. 이걸 안 읽으면 *부팅이 잘 안 되는* 이유를 평생 찾습니다.

i.MX 8M Plus 실리콘 erratum 예시입니다.

```text
ERR050273
The PCIe PHY does not handshake correctly under certain
timing conditions when L1 sub-state is entered.

Workaround:
Disable L1 sub-state by clearing bit [12] of register
PCIE_PORT_PROCESSOR_LANE_CONTROL.
```

이 workaround가 *U-Boot board 코드*나 *Linux 커널 quirk*에 들어가야 합니다. 메인라인이나 vendor BSP에 이미 들어가 있는 경우가 많지만, *우리가 fork한 시점 이후의 erratum*은 직접 적용해야 합니다.

읽는 순서는 다음과 같습니다.

1. SoC vendor 사이트에서 *해당 SoC의 최신 errata*를 받습니다.
2. *Severity High* 또는 *Critical*만 먼저 봅니다. 보통 10건 미만입니다.
3. 각 erratum의 *workaround가 우리 코드에 적용되어 있는지* 확인합니다.
4. 안 들어가 있다면 BSP의 *알려진 문제* 목록에 올립니다.

## 무엇을 *건너뛰어도* 되는가

RM의 다음 부분은 BSP 첫 부팅 단계에서는 *건너뛰어도* 됩니다.

- **GPU/VPU/카메라 ISP 관련 챕터** — 대형 IP는 별도 드라이버 작업으로, 첫 부팅 이후 단계.
- **PCIe 상세** — Wi-Fi가 PCIe면 필요. 아니면 후순위.
- **CAN, FlexRay 같은 산업용 버스** — 그 기능을 쓰는 보드에서만.
- **DSP, NPU 코어 챕터** — 대부분의 BSP가 *Linux 부팅까지*는 무시.
- **Security IP 상세** — TF-A가 위임받는 부분. 따로 다룸.

이런 챕터를 *제품 요구사항에 따라* 차차 읽어나갑니다. *첫 부팅까지는* 위 4개 챕터로 충분합니다.

## 회로도 읽기 — RM의 짝꿍

RM이 *SoC의 능력*을 보여준다면, 회로도는 *우리 보드가 그 능력을 어떻게 활용*하는지를 보여줍니다. BSP는 둘을 *교차 참조*하며 작업합니다.

회로도에서 BSP에 직접 필요한 정보입니다.

- [ ] XTAL 주파수 (보통 24MHz, 25MHz, 32.768kHz)
- [ ] `BOOT_MODE` 핀의 strap 저항값
- [ ] UART1 (또는 console UART)의 RX/TX 핀 번호
- [ ] 어느 USDHC가 SD에, 어느 USDHC가 eMMC에 연결되는지
- [ ] Ethernet PHY 모델 (Atheros AR8031, RTL8211 등) + MDIO 주소
- [ ] DDR 칩 모델 (Micron MT41K, SK Hynix H5AN 등)
- [ ] DDR 칩 개수 (1, 2, 4) → DRAM bus width 결정
- [ ] PMIC 모델 + I2C 주소
- [ ] Wi-Fi/BT 모듈 종류 (TI WL18xx, Cypress CYW43xx)
- [ ] 각 power rail의 voltage (1.0V, 1.1V, 1.8V, 3.3V)
- [ ] Reset 회로 (`POR_B`, watchdog reset)

이 목록을 *완전히* 채울 때까지 BSP 작업을 시작하지 않습니다. 빈칸이 있다면 *부팅 도중* 발견하게 되는데, 그 시점에는 디버깅 비용이 훨씬 큽니다.

## RM 읽기의 효율 — 검색이 80%

수천 페이지를 *순서대로 읽는 것*은 비효율적입니다. 다음 방식이 훨씬 빠릅니다.

```text
[검색 워크플로우]

1. PDF reader에서 keyword 검색
   "UART1 base address" → 메모리 맵 표
   "PLL1" → clock 트리 그림
   "BOOT_MODE" → boot mode 표

2. 그림(figure) 중심으로 본다
   Clock tree, memory map, boot sequence 그림이
   해당 챕터의 *요약*에 해당.

3. 표(table)를 우선 본다
   Pin mux 표, 레지스터 표, boot 모드 표.
   본문은 표를 *해설*하는 형태가 많다.

4. 비슷한 SoC의 BSP source를 *반대로* 본다
   `arch/arm64/boot/dts/freescale/imx8mp-evk.dts`에서
   `interrupts = <GIC_SPI 26 IRQ_TYPE_LEVEL_HIGH>`를 찾고,
   RM의 GIC interrupt 표에서 *왜 26인지* 역추적.
```

특히 *세 번째*가 강력합니다. 비슷한 보드의 *동작하는 BSP*가 RM의 *가장 정확한 해석서*입니다.

## 실전 예 — i.MX 8M Plus 콘솔 UART 결정

새 보드의 console UART을 RM과 회로도를 *교차 참조*하면서 정하는 흐름을 봅시다.

**단계 1: 회로도 확인.** debug 헤더의 RX/TX 핀이 SoC의 *어떤 ball*에 연결되어 있는지 확인합니다. 결과: K17(UART2_RXD), L17(UART2_TXD).

**단계 2: RM의 pin mux 표.** Ball K17의 ALT 표를 봅니다(`UART2_RXD` pad).

| ALT | Function |
|---|---|
| ALT0 | `UART2_RXD` (UART2 default) |
| ALT1 | `ECSPI3_SCLK` |
| ALT2 | `ENET2_RGMII_RD3` |
| ALT3 | `I2S6_DAT0` |
| ALT4 | `GPIO5_IO24` |
| ALT5 | (reserved) |

ALT0이 UART2 RX입니다.

**단계 3: 메모리 맵에서 UART2 base address.** RM 메모리 맵 챕터.

```text
0x3089_0000 - 0x3089_FFFF   UART2
```

**단계 4: DT 작성.** `imx8mp.dtsi`에 이미 정의된 `&uart2` 노드를 활성화합니다.

```text
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

**단계 5: U-Boot defconfig.**

```text
CONFIG_DEBUG_UART=y
CONFIG_DEBUG_UART_BASE=0x30890000
CONFIG_DEBUG_UART_CLOCK=24000000
CONFIG_DEBUG_UART_IMX=y
```

이렇게 *RM → 회로도 → DT → defconfig*의 일직선 흐름이 BSP 작업의 *최소 단위*입니다.

## Reference Manual 첫 일주일 일정

새 SoC를 처음 받았을 때 일주일 안에 다음을 끝냅니다.

| 일자 | 작업 |
|------|------|
| Day 1 | RM 목차 훑기. Memory Map 챕터 정독. |
| Day 2 | Clock Tree 챕터. 권장 PLL 값을 노트에 정리. |
| Day 3 | Boot Sequence 챕터. Boot mode 표를 회로도와 매칭. |
| Day 4 | Pin Mux 챕터. Pin Mux Spreadsheet 도구 설치 및 익숙해지기. |
| Day 5 | Errata 정독. Severity High 항목을 BSP 노트에 기록. |
| Day 6 | 회로도 검토. 위의 *회로도에서 검색* 체크리스트 채우기. |
| Day 7 | 비슷한 보드의 reference BSP source 디렉터리 구조 익히기. |

이 일주일을 *충실히* 거치면 그 뒤 부팅 디버깅이 *훨씬* 효율적입니다.

## 자주 하는 실수

### Datasheet와 Reference Manual을 *혼동*

Datasheet는 *얇고* 전기적 특성 중심입니다. Reference Manual은 *두껍고* 레지스터 중심입니다. BSP는 RM을 봅니다. 자료를 받았는데 *얇으면* "혹시 datasheet만 받은 것 아닌가" 확인합니다.

### 영문 PDF에 *비활성 검색*

스캔된 PDF는 검색이 안 됩니다. *digital born* PDF인지 확인합니다. 안 되면 OCR을 돌리거나 *벤더의 최신 버전*을 받습니다. 검색 안 되는 RM과 작업하는 것은 *눈 감고 코끼리 만지기*입니다.

### Errata를 *최신본*으로 안 받음

Errata는 *수시로 갱신*됩니다. 6개월 전에 받은 것이 *이미 outdated*일 수 있습니다. 새 erratum이 *우리 보드의 알 수 없는 문제*를 설명해 줄 수 있습니다.

### Pin Mux를 *손으로* 계산

IOMUXC 레지스터의 5개 필드를 직접 비트 시프트로 계산하는 사람을 가끔 봅니다. 거의 항상 한두 비트가 틀립니다. *벤더 도구*가 만든 매크로를 씁니다.

### Vendor 도구 *사용을 거부*

"외부 도구는 못 믿겠다"고 손으로 모두 짜는 경우가 있습니다. NXP MCUXpresso Config Tools, TI SysConfig, ST CubeMX는 *벤더 reference BSP의 입력*입니다. 손으로 짜면 *벤더와 다른 길*로 가게 되어 디버깅 도움을 받기 어렵습니다.

## 정리

- Reference Manual의 *4개 챕터*가 BSP의 80%를 결정합니다. Memory Map, Clock Tree, Reset & Boot, Pin Multiplexing입니다.
- Datasheet와 Reference Manual은 *다른 문서*입니다. BSP는 RM을 봅니다.
- Errata는 *반드시 최신본*을 받아 Severity High부터 봅니다.
- Pin Mux Spreadsheet (NXP MCUXpresso, TI SysConfig, ST CubeMX)는 *반드시* 사용합니다. 손 계산은 실수의 원천입니다.
- 회로도와 RM은 *교차 참조*합니다. 회로도가 *우리 보드*를, RM이 *SoC의 능력*을 보여줍니다.
- RM 읽기는 *검색이 80%*입니다. 순서대로 읽지 말고 keyword, figure, table 중심으로 점프합니다.
- 비슷한 보드의 *동작하는 BSP source*가 가장 정확한 *RM 해석서*입니다.
- 새 SoC 첫 일주일: Memory Map, Clock, Boot, Pin Mux, Errata, 회로도, reference BSP 구조 익히기.

## 다음 편

[Ch 3 — Device Tree 설계](/blog/embedded/bsp/chapter03-device-tree-design)에서는 RM에서 얻은 정보를 *디바이스 트리*로 표현하는 방법, `<soc>.dtsi` 상속, `<board>.dts` 작성, overlay 사용을 다룹니다.

## 관련 항목

- [Ch 1: BSP란 무엇인가](/blog/embedded/bsp/chapter01-what-is-bsp)
- [Ch 3: Device Tree 설계](/blog/embedded/bsp/chapter03-device-tree-design)
- [Ch 4: Pin Mux와 Clock](/blog/embedded/bsp/chapter04-pinmux-clock)
- [Ch 5: DDR 매개변수 — 보드별 timing](/blog/embedded/bsp/chapter05-ddr-params)
- [원문 — NXP i.MX 8M Plus Reference Manual](https://www.nxp.com/products/processors-and-microcontrollers/arm-processors/i-mx-applications-processors/i-mx-8-applications-processors/i-mx-8m-plus-arm-cortex-a53-machine-learning-vision-multimedia-and-industrial-iot:IMX8MPLUS)
- [원문 — TI AM62x Technical Reference Manual](https://www.ti.com/product/AM625)
