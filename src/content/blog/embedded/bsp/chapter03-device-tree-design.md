---
title: "새 보드 Device Tree 설계 — node·property·phandle 작성 흐름"
date: 2026-05-18T09:03:00
description: "보드 토폴로지를 DT로 표현 — SoC dtsi 상속, 보드 dts 작성, overlay 활용."
series: "BSP Development"
seriesOrder: 3
tags: [embedded, bsp, device-tree, dts]
draft: false
---

## 한 줄 요약

> **"Device Tree는 *커널에 하드웨어 토폴로지를 설명하는 데이터 구조*입니다."** — 코드가 아니라 *선언*이므로, 보드를 추가할 때 *드라이버를 고치지 않고 DT만* 추가하는 것이 BSP 설계의 핵심입니다.

ARM Linux는 한 zImage/Image가 *수십 가지 보드*를 지원할 수 있어야 합니다. 모든 보드의 peripheral 주소·인터럽트·클록을 *커널 코드*에 박아 넣으면 그 야망은 무너집니다. Device Tree가 이 차이를 *데이터*로 빼냅니다. BSP 엔지니어가 *코드 한 줄 안 쓰고* 새 보드를 띄울 수 있는 경우가 많은 이유입니다.

## DT의 세 가지 결과물

소스에서 출력으로 가는 흐름입니다.

| 단계 | 산출물 | 설명 |
|------|--------|------|
| 1 | `*.dts` (소스) | 사람이 작성. `#include`로 재사용 fragment를 `dtsi`로 분리 |
| 2 | `*.dtsi` | include 대상 |
| 3 | `dtc` (Device Tree Compiler) | dts → dtb 컴파일 |
| 4 | `*.dtb` (Device Tree Blob) | 바이너리 |
| 5 | bootloader → kernel | 부트로더가 커널에 전달 |
| 6 | kernel `of_*()` API | 커널이 parsing |

DT의 *논리적 정의*는 두 종류로 나뉩니다.

| 파일 | 내용 | 출처 |
|------|------|------|
| `<soc>.dtsi` | SoC 공통 — 모든 peripheral의 base address, 인터럽트, 클록 | 보통 vendor가 메인라인에 기여 |
| `<board>.dts` | 보드별 — 어떤 peripheral을 enable, pinmux 선택, 외부 칩 연결 | BSP 엔지니어 작성 |

`<board>.dts`가 `<soc>.dtsi`를 *include*하고, 보드에서 *실제로 쓰는 노드만* `status = "okay"`로 활성화합니다.

## 가장 작은 dts — 한눈에 보는 구조

다음은 BeagleBone Black의 *대폭 단순화한* `am335x-boneblack.dts` 형태입니다.

```text
/dts-v1/;

#include "am33xx.dtsi"            // SoC 공통
#include "am335x-bone-common.dtsi" // 보드 family 공통

/ {
    model = "TI AM335x BeagleBone Black";
    compatible = "ti,am335x-bone-black", "ti,am335x-bone", "ti,am33xx";

    memory@80000000 {
        device_type = "memory";
        reg = <0x80000000 0x20000000>;  // 512MB
    };
};

&cpu0_opp_table {
    /* 추가 OPP point */
};

&am33xx_pinmux {
    nxp_hdmi_bonelt_pins: nxp_hdmi_bonelt_pins {
        pinctrl-single,pins = <
            AM33XX_IOPAD(0x9b0, PIN_OUTPUT_PULLDOWN | MUX_MODE3)
        >;
    };
};

&i2c0 {
    status = "okay";

    tps: tps@24 {
        compatible = "ti,tps65217";
        reg = <0x24>;
    };
};

&mmc1 {
    status = "okay";
    bus-width = <0x4>;
    pinctrl-names = "default";
    pinctrl-0 = <&mmc1_pins>;
    cd-gpios = <&gpio0 6 GPIO_ACTIVE_LOW>;
    vmmc-supply = <&vmmcsd_fixed>;
};
```

핵심을 살펴봅시다.

- `#include` — dtsi를 끌어와 *상속*합니다. C의 include와 동일한 텍스트 치환.
- `model`, `compatible` — 보드 식별 문자열. 부트로더와 커널이 *어느 보드인지* 판단하는 근거.
- `memory@...` — DDR 영역. base address와 size.
- `&cpu0_opp_table { ... }` — dtsi의 노드를 *override*. ampersand는 *레이블 참조*입니다.
- `&am33xx_pinmux { ... }` — pinmux fragment 정의.
- `&i2c0 { status = "okay"; ... }` — dtsi에서 disable 상태로 정의된 peripheral을 *enable*하고 외부 칩(TPS65217 PMIC)을 부착.
- `&mmc1 { ... }` — eMMC/SD controller에 *bus width*, *pinctrl*, *card detect GPIO*, *전원 supply*를 연결.

이 문법이 *전체 ARM Linux 보드*에 동일하게 적용됩니다.

## 노드 명명 규칙

DT 노드는 *주소가 있는 것*과 *없는 것*으로 나뉩니다.

**주소 있음:**

- uart0: serial@44e09000 {
- reg = <0x44e09000 0x1000>;
- compatible = "ti,am3352-uart";
- ...
- };

**주소 없음:**

- regulators {
- compatible = "simple-bus";
- ...
- };

주소 있는 노드는 `<name>@<unit-address>` 형식입니다. unit-address가 *부모 노드의 reg 첫 셀*과 일치해야 합니다. dtc가 이 일치를 *경고*합니다.

`uart0:` 같은 *레이블*은 다른 곳에서 `&uart0`로 참조하기 위함입니다. dtsi가 레이블을 정의하고, dts가 `&uart0`로 *덮어쓰기*합니다.

## `compatible` 문자열 — 드라이버 매칭의 핵심

`compatible`은 *문자열 배열*이고, 커널이 *왼쪽부터* 드라이버를 매칭합니다.

```text
compatible = "ti,am335x-bone-black", "ti,am335x-bone", "ti,am33xx";
```

이 줄을 해석하면:

1. `ti,am335x-bone-black` 드라이버가 있으면 그것을 쓴다.
2. 없으면 `ti,am335x-bone`을 시도.
3. 그것도 없으면 가장 일반적인 `ti,am33xx`.

이 fallback 구조 덕에 *새 보드 변형*이 추가될 때 *드라이버 추가 없이* 동작할 수 있습니다.

벤더 prefix는 *DT bindings 문서*에 등록되어 있어야 합니다. 임의 prefix를 만들면 메인라인에 받아들여지지 않습니다.

## `reg`, `interrupts`, `clocks` — 세 가지 표준 속성

거의 모든 peripheral 노드가 이 셋을 가집니다.

```text
serial@44e09000 {
    compatible = "ti,am3352-uart";
    reg = <0x44e09000 0x1000>;
    interrupts = <72>;
    clocks = <&dpll_per_m2_div4_wkupdm_ck>;
    clock-names = "fck";
    status = "disabled";
};
```

| 속성 | 의미 |
|------|------|
| `reg` | 물리 주소 영역. `<base size>` 페어. RM의 메모리 맵에서 옴. |
| `interrupts` | 인터럽트 번호. interrupt controller에 따라 셀 개수 다름. |
| `clocks` | 이 peripheral의 입력 클록. 클록 트리의 leaf를 참조. |
| `clock-names` | 여러 clock일 때 각각의 *역할 이름*. |
| `status` | "okay" 또는 "disabled". 보드 dts에서 활성화. |

ARMv8 GIC 환경에서는 `interrupts`가 *3개 셀*입니다.

```text
interrupts = <GIC_SPI 26 IRQ_TYPE_LEVEL_HIGH>;
```

`GIC_SPI`는 *Shared Peripheral Interrupt* 종류, `26`은 *번호 - 32*, 그 다음이 *trigger type*입니다. 이 규약을 모르면 인터럽트가 안 들어와도 *왜 안 들어오는지* 알 수 없습니다.

## DT bindings 문서 — 노드 형식의 *명세*

각 `compatible`에 대해 *어떤 속성을 받아야 하는지*는 별도 문서에 적혀 있습니다. 커널 소스 트리의 `Documentation/devicetree/bindings/` 아래입니다.

```text
Documentation/devicetree/bindings/
├── arm/
├── clock/
├── gpio/
├── i2c/
├── mmc/
├── net/
├── pinctrl/
├── power/
├── serial/
│   └── omap_serial.yaml
└── ...
```

`omap_serial.yaml`을 열어 보면 *required* / *optional* 속성, *example*이 명시되어 있습니다. 최근 바인딩은 YAML 형식이고 `make dt_binding_check`로 *DT가 바인딩을 따르는지* 검증할 수 있습니다.

```bash
# 커널 소스 트리에서
make ARCH=arm dtbs_check DT_SCHEMA_FILES=Documentation/devicetree/bindings/serial/omap_serial.yaml
```

처음 노드를 작성할 때는 *기존 비슷한 보드*의 dts를 참고하면서 *바인딩 문서를 옆에 두고* 작업합니다.

## SoC dtsi 상속 — 올바른 분리

새 보드 dts에 *통째로 모든 노드*를 적는 사람이 가끔 있습니다. 안 됩니다. 다음 분리를 지킵니다.

| 파일 | 설명 |
|------|------|
| `imx8mp.dtsi` | SoC 공통. NXP가 메인라인 유지 |
| `imx8mp-evk.dts` | EVK 보드. NXP가 메인라인 유지 |
| `acme-cam.dts` | 우리 보드. 우리가 작성 |

우리 dts가 `imx8mp.dtsi`만 include하고, EVK 노드를 *복사하지 않습니다*. EVK의 좋은 부분만 *참고*해서 우리 보드의 토폴로지를 적습니다.

```text
/dts-v1/;

#include "imx8mp.dtsi"
#include <dt-bindings/gpio/gpio.h>

/ {
    model = "ACME i.MX 8M Plus Camera Board";
    compatible = "acme,imx8mp-cam", "fsl,imx8mp";

    memory@40000000 {
        device_type = "memory";
        reg = <0x0 0x40000000 0x0 0x80000000>;  /* 2GB */
    };
};

&uart2 {
    pinctrl-names = "default";
    pinctrl-0 = <&pinctrl_uart2>;
    status = "okay";
};

&usdhc3 {
    pinctrl-names = "default";
    pinctrl-0 = <&pinctrl_usdhc3>;
    bus-width = <8>;
    non-removable;
    status = "okay";
};

&iomuxc {
    pinctrl_uart2: uart2grp {
        fsl,pins = <
            MX8MP_IOMUXC_UART2_RXD__UART2_DCE_RX    0x140
            MX8MP_IOMUXC_UART2_TXD__UART2_DCE_TX    0x140
        >;
    };

    pinctrl_usdhc3: usdhc3grp {
        fsl,pins = <
            MX8MP_IOMUXC_NAND_WE_B__USDHC3_CLK      0x190
            MX8MP_IOMUXC_NAND_WP_B__USDHC3_CMD      0x1d0
            /* ... 8 data lines */
        >;
    };
};
```

`imx8mp.dtsi`에 *모든 peripheral의 reg, interrupts, clocks*가 이미 정의되어 있습니다. 우리는 *enable*만 합니다. 이게 *올바른 상속 사용*입니다.

## dtc — Device Tree Compiler

DT 소스를 바이너리로 변환하는 도구입니다. 커널 빌드 시 자동 실행되지만, *수동으로* 돌리면 디버깅에 좋습니다.

```bash
# 컴파일
dtc -I dts -O dtb -o acme-cam.dtb acme-cam.dts

# 역변환 (dtb → dts, debugging에 유용)
dtc -I dtb -O dts -o decompiled.dts acme-cam.dtb

# preprocessor 사용 (include 처리)
cpp -nostdinc -I include -I arch/arm64/boot/dts \
    -undef -x assembler-with-cpp acme-cam.dts \
| dtc -O dtb -o acme-cam.dtb -
```

커널이 dtbs 빌드할 때 첫번째 방식을 자동으로 합니다. 출력에 *경고*가 잘 보이도록 하려면 `-Wall`도 추가합니다.

```bash
dtc -I dts -O dtb -W no-unit_address_vs_reg acme-cam.dts -o acme-cam.dtb
```

`unit_address_vs_reg`는 *unit-address와 reg가 어긋날 때* 경고하는데, 보드 dts에서 자주 false positive로 나옵니다. 정말로 어긋날 때만 *진짜 문제*가 됩니다.

## DT를 *런타임에* 확인하기

부팅한 시스템에서 *실제로 적용된 DT*를 볼 수 있습니다.

```bash
# 전체 트리 확인
$ ls /sys/firmware/devicetree/base/
aliases   chosen   cpus    memory@40000000   soc@0   ...

# 특정 peripheral
$ cat /sys/firmware/devicetree/base/soc@0/serial@30890000/compatible
fsl,imx8mp-uart
fsl,imx6q-uart

# 또는 dtc로 역변환
$ dtc -I fs -O dts /sys/firmware/devicetree/base/ -o /tmp/runtime.dts
```

부팅 후 dts가 *기대대로 적용되었는지* 검증하는 가장 빠른 방법입니다.

## DT overlay — 변형 보드와 add-on 카드

보드 변형이 *여러 개*면 *각각 별도 dts*가 무겁습니다. Overlay가 *기본 dts에 fragment를 얹는* 방식을 제공합니다.

| 파일 | 역할 |
|------|------|
| `acme-cam.dts` | base |
| `acme-cam-with-ov5640.dtso` | Sony 카메라 모듈이 끼워졌을 때 추가 |
| `acme-cam-with-ar0521.dtso` | OnSemi 카메라 모듈이 끼워졌을 때 추가 |

overlay 파일(`.dtso` 또는 `.dts` with `/plugin/` 태그) 예시입니다.

```text
/dts-v1/;
/plugin/;

&i2c2 {
    #address-cells = <1>;
    #size-cells = <0>;

    ov5640: camera@3c {
        compatible = "ovti,ov5640";
        reg = <0x3c>;
        clocks = <&clk_24m>;
        powerdown-gpios = <&gpio1 6 GPIO_ACTIVE_HIGH>;
        reset-gpios = <&gpio1 7 GPIO_ACTIVE_LOW>;
        status = "okay";
    };
};
```

빌드는 base와 동일하지만 `-@` 옵션이 *상징적 정보를 dtb에 보존*합니다.

```bash
dtc -@ -I dts -O dtb -o acme-cam.dtb acme-cam.dts
dtc -@ -I dts -O dtbo -o acme-cam-with-ov5640.dtbo acme-cam-with-ov5640.dts
```

런타임 적용은 부트로더 단계(U-Boot `fdt apply`) 또는 커널 후 ConfigFS overlay 인터페이스로 가능합니다.

```bash
# (커널이 OF overlay 지원 빌드되어 있어야 함)
mkdir /sys/kernel/config/device-tree/overlays/cam
cat acme-cam-with-ov5640.dtbo > /sys/kernel/config/device-tree/overlays/cam/dtbo
```

Raspberry Pi가 이 방식을 *매우 적극적으로* 씁니다. `/boot/config.txt`에 `dtoverlay=...`로 부트 시 overlay를 적용합니다.

## 자주 하는 실수

### dtsi를 *복사*해서 dts에 붙임

가장 흔합니다. SoC 메인라인 업데이트를 *전혀* 못 받게 됩니다. `#include`로 상속하고 *override*만 합니다.

### `status = "okay"` 빠뜨림

`imx8mp.dtsi`의 거의 모든 peripheral은 `status = "disabled"` 상태입니다. 보드에서 *쓰겠다고 명시*해야 probe됩니다. UART 안 뜨면 *가장 먼저* 의심합니다.

### `compatible`을 *마음대로* 만듦

`acme,super-cool-uart`처럼 새 compatible을 만들면 커널이 매칭할 드라이버가 *없습니다*. SoC 벤더의 기존 compatible을 *그대로* 씁니다.

### `reg`의 셀 개수 헷갈림

`#address-cells = <2>`, `#size-cells = <2>` 환경(ARMv8 64-bit)에서는 `reg = <0x0 0x40000000 0x0 0x80000000>`처럼 *4개 셀*입니다. ARMv7은 보통 *2개 셀*입니다. 부모 노드의 `#address-cells` / `#size-cells`가 자식의 reg 형식을 정합니다.

### Interrupts에 *raw 번호*만 적음

```text
interrupts = <26>;   /* ARMv8 GIC면 잘못 — 3 cells 필요 */
```

GIC 환경에서는 `<GIC_SPI 26 IRQ_TYPE_LEVEL_HIGH>`가 맞습니다. `parent`(`interrupt-parent`)가 GIC인지 GPIO controller인지에 따라 셀 형식이 다릅니다.

### pin mux를 *깜빡*

UART 노드는 enable했는데 `pinctrl-0`을 안 적으면, *해당 핀이 다른 기능*에 묶여 있어 UART 신호가 안 나옵니다. peripheral enable과 pinmux는 *항상 함께* 따라옵니다.

### `dt_binding_check`를 *돌리지 않음*

```bash
make ARCH=arm64 dtbs_check
```

이 한 번이 *명세 위반*을 잡아냅니다. 메인라인 기여하려면 *반드시* 통과해야 합니다.

## 작은 예시 — 우리 보드의 *완성도 있는* dts skeleton

i.MX 8M Plus 기반 ACME 카메라 보드의 *최소 동작* dts입니다.

```text
/dts-v1/;

#include "imx8mp.dtsi"
#include <dt-bindings/gpio/gpio.h>

/ {
    model = "ACME i.MX 8M Plus Camera Board v1";
    compatible = "acme,imx8mp-cam", "fsl,imx8mp";

    chosen {
        stdout-path = &uart2;
    };

    memory@40000000 {
        device_type = "memory";
        reg = <0x0 0x40000000 0x0 0x80000000>;
    };

    reg_usb1_vbus: regulator-usb1-vbus {
        compatible = "regulator-fixed";
        regulator-name = "usb1_vbus";
        regulator-min-microvolt = <5000000>;
        regulator-max-microvolt = <5000000>;
        gpio = <&gpio4 22 GPIO_ACTIVE_HIGH>;
        enable-active-high;
    };
};

&uart2 {
    pinctrl-names = "default";
    pinctrl-0 = <&pinctrl_uart2>;
    status = "okay";
};

&i2c1 {
    pinctrl-names = "default";
    pinctrl-0 = <&pinctrl_i2c1>;
    clock-frequency = <400000>;
    status = "okay";

    pmic: pmic@25 {
        compatible = "rohm,bd71847";
        reg = <0x25>;
        interrupt-parent = <&gpio1>;
        interrupts = <3 IRQ_TYPE_LEVEL_LOW>;
        /* regulators sub-node ... */
    };
};

&usdhc3 {
    pinctrl-names = "default";
    pinctrl-0 = <&pinctrl_usdhc3>;
    bus-width = <8>;
    non-removable;
    status = "okay";
};

&fec {
    pinctrl-names = "default";
    pinctrl-0 = <&pinctrl_fec>;
    phy-mode = "rgmii-id";
    phy-handle = <&ethphy0>;
    status = "okay";

    mdio {
        #address-cells = <1>;
        #size-cells = <0>;

        ethphy0: ethernet-phy@1 {
            compatible = "ethernet-phy-ieee802.3-c22";
            reg = <1>;
            reset-gpios = <&gpio1 9 GPIO_ACTIVE_LOW>;
            reset-assert-us = <10000>;
            reset-deassert-us = <80000>;
        };
    };
};

&iomuxc {
    pinctrl_uart2: uart2grp { /* ... */ };
    pinctrl_i2c1:  i2c1grp  { /* ... */ };
    pinctrl_usdhc3: usdhc3grp { /* ... */ };
    pinctrl_fec:   fecgrp   { /* ... */ };
};
```

`chosen`의 `stdout-path = &uart2`는 *부트로더가 어느 UART을 console로 쓸지* 알려줍니다. earlycon이 이 정보를 사용합니다.

## 정리

- Device Tree는 *커널에 하드웨어 토폴로지를 데이터로 전달*합니다. 보드를 추가할 때 *드라이버를 안 고치는* 것이 목표입니다.
- `<soc>.dtsi`(벤더 제공) + `<board>.dts`(BSP 작성)의 두 층 구조입니다. dts가 dtsi를 *include*하고 *override*합니다.
- 세 가지 표준 속성 `reg`, `interrupts`, `clocks`가 거의 모든 peripheral 노드에 등장합니다.
- `compatible` 문자열은 *왼쪽부터* 매칭되며, fallback 구조 덕에 새 보드 변형이 *드라이버 수정 없이* 동작할 수 있습니다.
- DT bindings 문서(`Documentation/devicetree/bindings/`)가 각 compatible의 *명세*입니다. `make dtbs_check`로 검증합니다.
- peripheral은 `status = "okay"`로 *enable*해야 하고, *pinmux*와 *clock*이 함께 연결되어야 동작합니다.
- DT overlay는 *변형 보드와 add-on*을 처리합니다. `dtc -@`로 빌드하고 ConfigFS 또는 부트로더에서 적용합니다.
- 부팅 후 `/sys/firmware/devicetree/base/`에서 *실제 적용된 DT*를 확인할 수 있습니다.

## 다음 편

[Ch 4 — Pin Mux와 Clock](/blog/embedded/bsp/chapter04-pinmux-clock)에서는 dts의 `pinctrl-*`과 `clocks` 속성이 *실제로* 어떻게 동작하는지, Common Clock Framework가 무엇인지를 파고듭니다.

## 관련 항목

- [Ch 1: BSP란 무엇인가](/blog/embedded/bsp/chapter01-what-is-bsp)
- [Ch 2: SoC 데이터시트 읽기](/blog/embedded/bsp/chapter02-datasheet)
- [Ch 4: Pin Mux와 Clock](/blog/embedded/bsp/chapter04-pinmux-clock)
- [Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
- [원문 — Kernel Device Tree Usage Model](https://www.kernel.org/doc/html/latest/devicetree/usage-model.html)
- [원문 — Device Tree bindings 디렉터리](https://github.com/torvalds/linux/tree/master/Documentation/devicetree/bindings)
- [원문 — Device Tree Specification](https://www.devicetree.org/specifications/)
