---
title: "새 보드 Device Tree 설계 — node·property·phandle 작성 흐름"
slug: "embedded/bsp/chapter03-device-tree-design"
date: 2026-05-18T09:03:00
description: "보드 토폴로지를 DT로 표현 — SoC dtsi 상속, 보드 dts 작성, overlay 활용."
series: "BSP Development"
seriesOrder: 3
tags: [embedded, bsp, device-tree, dts]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Device Tree는 *커널에 하드웨어 토폴로지를 설명하는 데이터 구조*입니다."** — 코드가 아니라 *선언*이므로, 보드를 추가할 때 *드라이버를 고치지 않고 DT만* 추가하는 것이 BSP 설계의 핵심입니다.

Debian 13의 arm64 커널 패키지(6.12.116)는 커널 이미지 하나와 함께 `freescale/` 아래에 `imx8mp*.dtb`만 36개를 설치합니다. 커널 바이너리는 하나이고, 보드마다 다른 것은 DTB뿐입니다. 모든 보드의 peripheral 주소·인터럽트·클록을 *커널 코드*에 박아 넣었다면 불가능한 배포 방식입니다. 이 장은 그 DTB를 새 보드용으로 쓰는 흐름을 Linux v6.12 소스와 dtc 1.8.1로 직접 컴파일하며 따라갑니다.

## DT의 세 가지 결과물

소스에서 출력으로 가는 흐름입니다.

| 단계 | 산출물 | 설명 |
|------|--------|------|
| 1 | `*.dts`, `*.dtsi` (소스) | `.dts`가 board description이며 재사용할 SoC/common fragment를 `.dtsi`로 include할 수 있음 |
| 2 | C preprocessor + `dtc` | include와 macro를 처리한 뒤 DTS를 DTB로 컴파일 |
| 3 | `*.dtb` (Device Tree Blob) | 부트로더가 커널에 전달하는 binary tree |
| 4 | kernel OF APIs | 커널이 전달받은 tree와 bindings에 따라 장치 표현을 구성 |

DT의 *논리적 정의*는 두 종류로 나뉩니다.

| 파일 | 내용 | 출처 |
|------|------|------|
| `<soc>.dtsi` | SoC 공통 — 모든 peripheral의 base address, 인터럽트, 클록 | SoC 벤더와 커널 커뮤니티 |
| `<board>.dts` | 보드별 — 어떤 peripheral을 enable, pinmux 선택, 외부 칩 연결 | BSP 엔지니어 작성 |

`<board>.dts`가 `<soc>.dtsi`를 *include*하고, 보드에서 *실제로 쓰는 노드만* `status = "okay"`로 활성화합니다. 가구가 빠진 아파트 평면도(dtsi)에 우리 집 가구 배치(dts)를 덧그리는 구조입니다.

## 가장 작은 dts — 한눈에 보는 구조

BeagleBone Black의 보드 DT는 Linux v6.12에서 네 파일로 나뉘어 있습니다. 아래는 그 파일들에서 핵심 줄만 모은 발췌이고, 각 블록 위 주석이 원래 파일입니다.

```c
/* am335x-boneblack.dts */
#include "am33xx.dtsi"
#include "am335x-bone-common.dtsi"
#include "am335x-boneblack-common.dtsi"
#include "am335x-boneblack-hdmi.dtsi"

/ {
	model = "TI AM335x BeagleBone Black";
	compatible = "ti,am335x-bone-black", "ti,am335x-bone", "ti,am33xx";
};

/* am335x-boneblack-common.dtsi */
memory@80000000 {
	device_type = "memory";
	reg = <0x80000000 0x20000000>; /* 512 MB */
};

/* am335x-boneblack-hdmi.dtsi */
nxp_hdmi_bonelt_pins: nxp-hdmi-bonelt-pins {
	pinctrl-single,pins = <
		AM33XX_PADCONF(AM335X_PIN_XDMA_EVENT_INTR0, PIN_OUTPUT_PULLDOWN, MUX_MODE3)
	>;
};

/* am335x-bone-common.dtsi */
&i2c0 {
	status = "okay";
	clock-frequency = <400000>;

	tps: tps@24 {
		reg = <0x24>;
	};
};

&mmc1 {
	status = "okay";
	bus-width = <0x4>;
	pinctrl-names = "default";
	pinctrl-0 = <&mmc1_pins>;
	cd-gpios = <&gpio0 6 GPIO_ACTIVE_LOW>;
};
```

핵심을 살펴봅시다.

- `#include` — dtsi를 끌어와 *상속*합니다. C의 include와 동일한 텍스트 치환.
- `model`, `compatible` — 보드 식별 문자열. 부트로더와 커널이 *어느 보드인지* 판단하는 근거.
- `memory@...` — DDR 영역. base address와 size.
- `&am33xx_pinmux { ... }` — pinmux fragment 정의.
- `&i2c0 { status = "okay"; ... }` — dtsi에서 disable 상태로 정의된 peripheral을 *enable*하고 외부 칩(TPS65217 PMIC)을 부착. `tps@24` 노드에는 `reg`만 있고 `compatible = "ti,tps65217"`은 `tps65217.dtsi`를 `/include/`해서 받습니다.
- `&mmc1 { ... }` — SD controller에 *bus width*, *pinctrl*, *card detect GPIO*를 연결. 전원 `vmmc-supply = <&vmmcsd_fixed>`는 `am335x-boneblack-common.dtsi`가 덧붙입니다.

한 노드의 속성이 여러 파일에 흩어져 있으므로, 최종 결과는 컴파일된 DTB에서 확인합니다. Ch 1에서 본 것처럼 `fdtget`으로 읽은 `memory@80000000`의 `reg`는 `80000000 20000000`입니다.

## 노드 명명 규칙

DT 노드는 *주소가 있는 것*과 *없는 것*으로 나뉩니다. 주소 있는 노드는 `<name>@<unit-address>` 형식을 쓰고, unit-address는 그 노드의 `reg` 첫 주소와 같아야 합니다. 주소는 부모 bus의 주소 공간 기준이라 CPU 물리 주소와 다를 수 있습니다. BeagleBone Black의 콘솔 UART가 좋은 예입니다. 컴파일한 DTB에서 `serial0` alias를 따라가면 다음과 같습니다.

```text
$ fdtget am335x-boneblack.dtb /aliases serial0
/ocp/interconnect@44c00000/segment@200000/target-module@9000/serial@0
$ fdtget -t x am335x-boneblack.dtb .../target-module@9000/serial@0 reg
0 1000
$ fdtget -t x am335x-boneblack.dtb .../target-module@9000 ranges
0 9000 1000
$ fdtget -t u am335x-boneblack.dtb .../target-module@9000/serial@0 interrupts
72
```

UART 노드 이름은 `serial@0`이고 `reg`도 0에서 시작합니다. 부모들의 `ranges`가 주소를 한 단계씩 옮깁니다. `target-module@9000`이 0을 0x9000으로(`ranges = <0x0 0x9000 0x1000>`), `segment@200000`이 0x9000을 0x209000으로, `interconnect@44c00000`이 0x200000 구간을 0x44e00000으로 옮겨 CPU 주소 0x44e09000이 됩니다(`am33xx-l4.dtsi:195-210`, 세 `ranges`는 `fdtget`으로 확인). 우편 주소가 "동 → 구 → 시" 순으로 넓어지는 것과 같습니다. 주소 없는 노드(예: `regulators` 묶음)는 `@`를 붙이지 않습니다.

dtc는 이 규칙을 두 경고로 검사합니다. 일부러 틀린 DTS를 컴파일해 보면 어느 경고가 무엇을 잡는지 보입니다.

```text
$ dtc -I dts -O dtb -o bad2.dtb bad2.dts
bad2.dts:14.15-16.4: Warning (unit_address_vs_reg): /regulators@0: node has a unit name, but no reg or ranges property
bad2.dts:17.7-19.4: Warning (unit_address_vs_reg): /uart: node has a reg or ranges property, but no unit name
bad2.dts:10.19-12.5: Warning (simple_bus_reg): /soc/serial@44e09000: simple-bus unit address format error, expected "44e0a000"
```

`unit_address_vs_reg`는 unit-address와 `reg`의 *존재 여부*만 맞추고, 값이 어긋난 것(`serial@44e09000`에 `reg = <0x44e0a000 ...>`)은 부모가 `simple-bus`일 때 `simple_bus_reg`가 잡습니다. 같은 노드를 루트 바로 아래에 두고 컴파일하면 dtc 1.8.1은 아무 경고도 내지 않았습니다.

`uart0:` 같은 *레이블*은 다른 곳에서 `&uart0`로 참조하기 위함입니다. dtsi가 레이블을 정의하고, dts가 `&uart0`로 *덮어쓰기*합니다.

## `compatible` 문자열 — 드라이버 매칭의 핵심

`compatible`은 문자열 배열이며 구체적인 식별자부터 더 일반적인 호환 식별자 순으로 기술합니다. 드라이버는 자신이 선언한 OF match table과 이 목록을 대조합니다.

```text
compatible = "ti,am335x-bone-black", "ti,am335x-bone", "ti,am33xx";
```

이 줄을 해석하면:

1. `ti,am335x-bone-black`은 이 보드 변형을 식별합니다.
2. `ti,am335x-bone`과 `ti,am33xx`는 호환성을 더 넓게 표현합니다.
3. 실제 driver binding은 각 드라이버의 match table 및 등록 상태에 달려 있습니다.

UART 노드도 같은 방식입니다. BeagleBone Black의 UART0는 `compatible = "ti,am3352-uart", "ti,omap3-uart"`로, AM335x 전용 이름 뒤에 OMAP3 호환 이름을 둡니다.

벤더 prefix(`ti,`, `fsl,`)는 커널 트리의 `Documentation/devicetree/bindings/vendor-prefixes.yaml`에 등록된 목록입니다.

## `reg`, `interrupts`, `clocks` — 세 가지 표준 속성

거의 모든 peripheral 노드가 이 셋을 가집니다.

Linux v6.12 `imx8mp.dtsi`의 UART2 노드입니다.

```c
uart2: serial@30890000 {
	compatible = "fsl,imx8mp-uart", "fsl,imx6q-uart";
	reg = <0x30890000 0x10000>;
	interrupts = <GIC_SPI 27 IRQ_TYPE_LEVEL_HIGH>;
	clocks = <&clk IMX8MP_CLK_UART2_ROOT>,
		 <&clk IMX8MP_CLK_UART2_ROOT>;
	clock-names = "ipg", "per";
	...
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

GIC 아래 노드는 `interrupts`가 *3개 셀*입니다. 첫 셀이 SPI/PPI 유형(`GIC_SPI` = 0), 둘째가 그 유형 안의 번호, 셋째가 trigger type입니다([GIC binding](https://github.com/torvalds/linux/blob/v6.12/Documentation/devicetree/bindings/interrupt-controller/arm%2Cgic.yaml)). AM335x의 UART0처럼 GIC가 아닌 interrupt controller 아래에서는 `interrupts = <72>` 한 셀입니다. 셀 수는 interrupt parent의 `#interrupt-cells`가 정합니다.

DT의 번호는 Linux IRQ 번호가 아닙니다. QEMU virt 머신을 `-M acpi=off`로 띄운 Debian 13 guest에서 PL011 UART를 보면 차이가 드러납니다.

```text
$ dtc -I fs -O dts /sys/firmware/devicetree/base | sed -n '/pl011@9000000 {/,/};/p'
	pl011@9000000 {
		clock-names = "uartclk", "apb_pclk";
		interrupts = <0x00 0x01 0x04>;
		clocks = <0x8000 0x8000>;
		compatible = "arm,pl011", "arm,primecell";
		reg = <0x00 0x9000000 0x00 0x1000>;
	};
$ dmesg | grep 9000000.pl011
[    0.089396] 9000000.pl011: ttyAMA0 at MMIO 0x9000000 (irq = 13, base_baud = 0) is a PL011 rev1
```

DT에는 `GIC_SPI 1 IRQ_TYPE_LEVEL_HIGH`(0, 1, 4)가 적혀 있지만 커널이 붙인 virtual IRQ는 13입니다. 드라이버는 커널이 매핑해 준 번호만 쓰므로, DT에는 GIC binding이 정한 SPI 번호를 그대로 적고 32를 더하거나 빼지 않습니다.

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
│   └── 8250_omap.yaml
└── ...
```

AM335x UART의 binding은 v6.12 기준 `serial/8250_omap.yaml`입니다. YAML 바인딩에는 *required* / *optional* 속성과 *example*이 있습니다. 검사 대상은 둘로 나뉩니다. `Documentation/devicetree/bindings/writing-schema.rst`(167~191행)에 따르면 `make dt_binding_check`는 *바인딩 스키마 자체*와 그 example을 검사하고, `make dtbs_check`가 *DTS가 바인딩을 따르는지*를 검사합니다. 같은 문서는 `dtbs_check`가 오류 있는 스키마 파일을 건너뛴다고 적으므로 두 타깃을 함께 돌립니다.

```bash
# 커널 소스 트리에서 (dtschema 패키지 필요)
make ARCH=arm dt_binding_check dtbs_check DT_SCHEMA_FILES=8250_omap.yaml
```

이 글에서는 `dtbs_check`를 돌리지 않았습니다(dtschema를 설치하지 않았습니다).

처음 노드를 작성할 때는 *기존 비슷한 보드*의 dts를 참고하면서 *바인딩 문서를 옆에 두고* 작업합니다.

## SoC dtsi 상속 — 올바른 분리

새 보드 dts에 SoC 노드까지 통째로 복사하면 SoC dtsi의 수정이 우리 보드에 전달되지 않습니다. 다음 분리를 지킵니다.

| 파일 | 설명 |
|------|------|
| `imx8mp.dtsi` | SoC 공통 (메인라인) |
| `imx8mp-evk.dts` | NXP EVK 보드 (메인라인) |
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

`imx8mp.dtsi`에 peripheral의 reg, interrupts, clocks가 이미 정의되어 있고, v6.12에서 이 파일에는 `status = "disabled"`가 63번, `status = "okay"`는 0번 나옵니다. 보드 dts는 쓰는 노드를 *enable*하고 보드 고유 값만 더합니다.

## dtc — Device Tree Compiler

DT 소스를 바이너리로 변환하는 도구입니다. 커널 빌드는 `#include`와 매크로(`GIC_SPI`, `MX8MP_IOMUXC_...`)를 처리하려고 C preprocessor를 먼저 돌린 뒤 dtc를 부릅니다. 커널 밖에서 같은 일을 하려면 두 단계를 직접 이어 줍니다. 이 글의 모든 DTB는 다음 명령으로 만들었습니다(macOS의 clang을 preprocessor로 썼습니다).

```bash
# Linux v6.12 소스 트리에서
clang -E -nostdinc -undef -D__DTS__ -x assembler-with-cpp \
    -I include -I arch/arm64/boot/dts/freescale -I arch/arm64/boot/dts \
    -o board.dts.pp arch/arm64/boot/dts/freescale/<board>.dts
dtc -I dts -O dtb -i arch/arm64/boot/dts/freescale -o board.dtb board.dts.pp

# 역변환 (dtb → dts)
dtc -I dtb -O dts -o decompiled.dts board.dtb
```

preprocessor 없이 `dtc`에 `.dts`를 바로 넣으면 `#include <dt-bindings/...>` 줄에서 실패합니다. 경고는 기본으로 켜져 있고, `-W no-<check>`로 특정 검사를 끕니다. 커널 Makefile도 이렇게 합니다. `arch/arm64/boot/dts/freescale/Makefile`은 `DTC_FLAGS_fsl-ls1088a-rdb := -Wno-interrupt_map`처럼 보드별로 경고를 끕니다.

## DT를 *런타임에* 확인하기

부팅한 시스템에서 *실제로 커널이 받은 DT*를 볼 수 있습니다. QEMU virt 머신 위 Debian 13 guest(커널 6.12.116)를 `-M acpi=off`로 부팅한 결과입니다.

```text
$ ls /sys/firmware/devicetree/base/ | head
#address-cells
#size-cells
aliases
apb-pclk
chosen
compatible
cpus
dma-coherent
flash@0
fw-cfg@9020000
$ cat /sys/firmware/devicetree/base/chosen/stdout-path
/pl011@9000000
$ ls -l /proc/device-tree
lrwxrwxrwx 1 root root 29 Nov 16 06:56 /proc/device-tree -> /sys/firmware/devicetree/base
$ readlink -f /sys/bus/amba/devices/9000000.pl011/driver
/sys/bus/amba/drivers/uart-pl011
```

`dtc -I fs -O dts /sys/firmware/devicetree/base`로 트리 전체를 DTS로 되돌릴 수 있고, 위 PL011 노드가 그렇게 얻은 출력입니다. 노드가 드라이버에 붙었는지는 `/sys/bus/.../driver` 링크로 봅니다.

같은 guest를 기본 설정(UEFI + ACPI)으로 부팅하면 `/sys/firmware/devicetree/`가 비어 있습니다. dmesg에는 `ACPI: RSDP ... (v02 BOCHS )`가 찍히고, `/sys/firmware/fdt`에는 `chosen` 노드에 `bootargs`와 `linux,uefi-*` 속성만 있는 513바이트짜리 FDT가 남습니다. 하드웨어 기술을 ACPI 테이블이 맡으면 DT는 커널에 전달되지 않습니다. 임베디드 BSP가 DT를 쓴다는 전제는 부트로더가 DTB를 넘길 때에만 성립합니다.

## DT overlay — 변형 보드와 add-on 카드

보드 변형이 *여러 개*면 *각각 별도 dts*가 무겁습니다. Overlay는 기본 DTB에 fragment를 얹는 방식입니다. 레고 기본판 위에 부품 세트를 끼우는 것과 같습니다.

Linux v6.12에 실제 예가 있습니다. Gateworks의 `imx8mp-venice-gw74xx-imx219.dtso`는 Sony IMX219 카메라 모듈을 GW74xx 보드에 붙이는 overlay이고, `freescale/Makefile:262`가 `imx8mp-venice-gw74xx-imx219-dtbs := imx8mp-venice-gw74xx.dtb imx8mp-venice-gw74xx-imx219.dtbo`로 둘을 합칩니다. overlay 본문의 핵심입니다.

```c
/dts-v1/;
/plugin/;

&i2c4 {
	#address-cells = <1>;
	#size-cells = <0>;

	imx219: sensor@10 {
		compatible = "sony,imx219";
		reg = <0x10>;
		clocks = <&cam24m>;
		VDIG-supply = <&reg_cam>;
		...
	};
};

&mipi_csi_0 {
	status = "okay";
	...
};
```

`&i2c4`처럼 base DTB의 레이블을 참조하므로, base는 레이블을 `/__symbols__` 노드로 남기는 `-@` 옵션으로 컴파일해야 합니다. 두 경우를 모두 돌려 본 결과입니다(`fdtoverlay`는 dtc 패키지의 도구입니다).

```text
$ fdtoverlay -i base.dtb -o merged.dtb imx219.dtbo        # base를 -@로 컴파일
$ fdtget merged.dtb /soc@0/bus@30800000/i2c@30a50000/sensor@10 compatible
sony,imx219
$ fdtoverlay -i base-nosym.dtb -o merged2.dtb imx219.dtbo # base를 -@ 없이 컴파일

Failed to apply 'imx219.dtbo': FDT_ERR_BADOFFSET
base blob does not have a '/__symbols__' node, make sure you have compiled the base blob with '-@' option
```

`-@`로 만든 base는 74,511바이트, 없이 만든 base는 57,038바이트였습니다. `fdtput -r`로 `/__symbols__`만 지우면 61,051바이트가 되므로 249개 레이블 경로가 13,460바이트를 차지하고, 나머지는 `-@`가 레이블 붙은 모든 노드에 넣은 `phandle` 속성입니다(144개 → 249개).

적용 시점은 셋 중 하나입니다.

| 시점 | 방법 | 출처 |
|------|------|------|
| 빌드 | 커널 Makefile의 `-dtbs :=` 합성, 또는 `fdtoverlay` | `freescale/Makefile:262` |
| 부트로더 | U-Boot `fdt apply <addr>` | U-Boot v2024.04 `cmd/fdt.c:1119` |
| 커널 런타임 | 커널 내부 API `of_overlay_fdt_apply()` | Linux v6.12 `drivers/of/overlay.c:980`, `Documentation/devicetree/overlay-notes.rst` |

메인라인 커널에는 사용자 공간에서 `.dtbo`를 써 넣는 인터페이스가 없습니다. `drivers/of/`에 configfs 코드가 없고, `/sys/kernel/config/device-tree/overlays` 경로는 메인라인 밖 패치가 만드는 것입니다. Debian 13 커널은 `# CONFIG_OF_OVERLAY is not set`이라 커널 내부 API도 꺼져 있습니다.

## 자주 하는 실수

### dtsi를 *복사*해서 dts에 붙임

SoC 메인라인 업데이트를 받지 못하게 됩니다. `#include`로 상속하고 *override*만 합니다.

### `status = "okay"` 빠뜨림

`imx8mp.dtsi`에는 `status = "disabled"`가 63번 있습니다. 보드에서 *쓰겠다고 명시*해야 probe됩니다. UART가 안 뜨면 *가장 먼저* 의심합니다.

### `compatible`을 *마음대로* 만듦

`acme,super-cool-uart`처럼 새 compatible을 만들면 커널이 매칭할 드라이버가 *없습니다*. 드라이버의 OF match table에 있는 기존 compatible을 씁니다.

### `reg`의 셀 개수 헷갈림

`reg`의 셀 수와 의미는 노드의 부모 bus가 선언한 `#address-cells`와 `#size-cells`에 따릅니다. CPU 아키텍처만으로 셀 수를 정할 수 없습니다. 예를 들어 부모가 각각 2로 선언했다면 `reg = <0x0 0x40000000 0x0 0x80000000>`은 64-bit address와 size를 나타내는 네 셀입니다.

### Interrupts에 *raw 번호*만 적음

```text
interrupts = <26>;   /* ARMv8 GIC면 잘못 — 3 cells 필요 */
```

GIC 환경에서는 `<GIC_SPI 26 IRQ_TYPE_LEVEL_HIGH>`가 맞습니다. 셀 수는 `interrupt-parent`의 `#interrupt-cells`가 정합니다. EVK의 PMIC는 GPIO controller를 parent로 두고 `interrupt-parent = <&gpio1>; interrupts = <3 IRQ_TYPE_LEVEL_LOW>;`처럼 두 셀을 씁니다.

### pin mux를 *깜빡*

UART 노드는 enable했는데 `pinctrl-0`을 안 적으면, *해당 핀이 다른 기능*에 묶여 있어 UART 신호가 안 나옵니다. peripheral enable과 pinmux는 *항상 함께* 따라옵니다.

### `dt_binding_check`를 *돌리지 않음*

```bash
make ARCH=arm64 dtbs_check
```

이 명령은 DTS를 binding schema와 대조합니다. `writing-schema.rst`가 적듯 `dtbs_check`는 오류 있는 스키마를 건너뛰므로 `dt_binding_check`도 함께 돌립니다. 검사는 스키마가 있는 속성만 보므로, 회로도와 맞는지는 별도로 확인합니다.

## 작은 예시 — 우리 보드의 *완성도 있는* dts skeleton

i.MX 8M Plus 기반 가상 ACME 카메라 보드의 *DTS 골격*입니다. PMIC 노드는 EVK(`imx8mp-evk.dts:451-457`)의 PCA9450C를 따랐고, `/* ... */` 자리는 회로도에 맞춰 채울 곳입니다. 핀 그룹이 비어 있으므로 이 골격은 그대로 컴파일하지 않았습니다.

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
        compatible = "nxp,pca9450c";
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

fixed regulator의 `gpio` 속성 이름은 v6.12 `regulator/fixed-regulator.yaml:59`에 있고, PHY의 `reset-assert-us`·`reset-deassert-us`는 `net/ethernet-phy.yaml:187,192`에 있습니다. `chosen`의 `stdout-path = &uart2`는 커널 console 경로를 지정하며, EVK도 같은 줄을 씁니다.

## 정리

- Device Tree는 *커널에 하드웨어 토폴로지를 데이터로 전달*합니다. 보드를 추가할 때 *드라이버를 안 고치는* 것이 목표입니다.
- `<soc>.dtsi`(SoC 공통) + `<board>.dts`(BSP 작성)의 두 층 구조입니다. dts가 dtsi를 *include*하고 *override*합니다.
- 세 가지 표준 속성 `reg`, `interrupts`, `clocks`가 거의 모든 peripheral 노드에 등장합니다.
- `compatible` 문자열은 구체적인 identifier부터 일반적인 호환 identifier 순으로 쓰며, 실제 매칭은 driver OF table에 따릅니다.
- DT bindings 문서(`Documentation/devicetree/bindings/`)가 각 compatible의 *명세*입니다. `make dt_binding_check dtbs_check`로 스키마와 DTS를 함께 검증합니다.
- peripheral은 `status = "okay"`로 *enable*해야 하고, *pinmux*와 *clock*이 함께 연결되어야 동작합니다.
- DT overlay는 *변형 보드와 add-on*을 처리합니다. base를 `dtc -@`로 빌드해야 하고, 빌드 시점(`fdtoverlay`)이나 U-Boot `fdt apply`로 적용합니다. 메인라인 커널에는 사용자 공간 overlay 인터페이스가 없습니다.
- 부팅 후 `/sys/firmware/devicetree/base/`에서 *커널이 받은 DT*를 확인합니다. ACPI로 부팅한 시스템에서는 이 디렉터리가 비어 있습니다.
- DT의 interrupt 번호와 Linux IRQ 번호는 다릅니다(QEMU PL011: DT `GIC_SPI 1`, Linux irq 13).

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
