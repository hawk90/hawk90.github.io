---
title: "Device Tree 실전 — DTS·DTB·Overlay·Phandle 추적"
slug: "embedded/modern-recipes/part7-03-device-tree-basics"
date: 2026-04-16T09:02:00
description: "Device Tree Source 문법. DTC 컴파일. Overlay로 dynamic 변경. Linux driver match."
series: "Modern Embedded Recipes"
seriesOrder: 77
tags: [recipes, device-tree, dts, dtb, overlay, linux]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Device Tree는 hardware 토폴로지 선언입니다."** 커널은 어떤 장치가 어디에 있는지 DTB에서 *읽고*, 노드의 `compatible`로 driver를 짝지어 probe합니다. 이 글의 DTS는 모두 `dtc` 1.7.2로 컴파일했고, driver 쪽은 QEMU `virt` 보드에 노드 하나를 더해 Linux v6.12에서 직접 probe시켰습니다.

## 어떤 문제를 푸는가

같은 SoC를 쓰는 보드라도 UART를 몇 개 쓰는지, I²C에 어떤 센서가 붙었는지는 보드마다 다릅니다. 그 차이를 커널 C 코드에 넣으면 보드마다 커널을 따로 빌드해야 합니다. Device Tree는 이 차이를 커널 밖의 데이터 파일로 뺍니다. 건물 도면이 "어느 층 어느 방에 무엇이 있는지"만 적고 공사 방법은 적지 않듯이, DT는 장치의 위치와 연결만 적고 동작은 driver가 맡습니다.

## DTS·DTB·DTBO

| 파일 | 내용 | 만드는 방법 |
| --- | --- | --- |
| `.dts`/`.dtsi` | 사람이 읽고 쓰는 소스. `.dtsi`는 include용 | 직접 작성 |
| `.dtb` | 바이너리 blob. bootloader가 메모리에 올려 커널에 주소를 넘김 | `dtc -I dts -O dtb -o board.dtb board.dts` |
| `.dtbo` | overlay. base DTB 위에 덮어쓰는 조각 | `dtc -@ -I dts -O dtb -o x.dtbo x.dts` (`/plugin/;` 선언) |

이 글의 실행 환경은 Debian 13 arm64 VM의 `dtc` 1.7.2(`device-tree-compiler`)와, 그 VM에서 빌드한 Linux v6.12 arm64 `defconfig` 커널, QEMU 11.1.3입니다. 커널 빌드는 [7-05](/blog/embedded/modern-recipes/part7-05-kernel-build)에서 다룹니다.

## 기본 구조

실제 보드의 DT를 보는 가장 쉬운 방법은 QEMU에 자기 DTB를 덤프시키는 것입니다.

```bash
qemu-system-aarch64 -M virt,dumpdtb=virt.dtb -cpu cortex-a57 -m 1G -nographic
dtc -I dtb -O dts -o virt.dts virt.dtb
```

덤프한 `virt.dts`의 첫 UART 노드는 다음과 같습니다. 이 DTB는 label 없이 숫자 phandle만 담고 있어서, 다시 컴파일하면 `clocks`·`gpios` 칸이 phandle 참조가 아니라는 warning이 나옵니다(이 글의 `dtc` 출력).

```dts
	pl011@9000000 {
		clock-names = "uartclk", "apb_pclk";
		clocks = <0x8000 0x8000>;
		interrupts = <0x00 0x01 0x04>;
		reg = <0x00 0x9000000 0x00 0x1000>;
		compatible = "arm,pl011", "arm,primecell";
	};
```

손으로 쓴 작은 보드 DT의 뼈대는 다음과 같습니다. 이 파일은 `dtc`가 오류 없이 컴파일합니다.

```dts
/dts-v1/;

/ {
    model = "MyBoard v1";
    compatible = "myco,myboard";
    #address-cells = <1>;
    #size-cells = <1>;

    cpus {
        #address-cells = <1>;
        #size-cells = <0>;

        cpu@0 {
            device_type = "cpu";
            compatible = "arm,cortex-a72";
            reg = <0>;
        };
    };

    memory@80000000 {
        device_type = "memory";
        reg = <0x80000000 0x80000000>;   /* 2 GiB at 0x80000000 */
    };

    soc {
        compatible = "simple-bus";
        #address-cells = <1>;
        #size-cells = <1>;
        ranges;

        uart0: serial@10000000 {
            compatible = "ns16550a";
            reg = <0x10000000 0x100>;
            clock-frequency = <24000000>;
            current-speed = <115200>;
            status = "okay";
        };
    };
};
```

## #address-cells·#size-cells

각 cell은 32비트 값입니다. 부모 노드의 `#address-cells`와 `#size-cells`가 자식 `reg`의 형식을 정합니다. QEMU `virt`의 루트는 둘 다 2라서, 64비트 주소와 크기를 cell 두 개씩으로 적습니다.

```dts
/* root: #address-cells = <2>; #size-cells = <2>; */
reg = <0x00 0x9000000 0x00 0x1000>;   /* address 0x0_0900_0000, size 0x1000 */
```

`fdtget`으로 같은 값을 읽으면 cell 네 개가 그대로 나옵니다(아래 demo 노드).

```text
0 9100000 0 1000
```

## Phandle — Cross-reference

한 노드가 다른 노드를 가리킬 때는 label을 붙이고 `&label`로 참조합니다. 컴파일하면 `dtc`가 대상 노드에 `phandle` 속성(정수)을 만들고, 참조 자리에 그 정수를 넣습니다.

```dts
/dts-v1/;
/ {
	#address-cells = <1>;
	#size-cells = <1>;

	gpio_controller: gpio_controller@40020000 {
		reg = <0x40020000 0x1000>;
		gpio-controller;
		#gpio-cells = <2>;
	};

	leds {
		compatible = "gpio-leds";
		led0 {
			gpios = <&gpio_controller 12 0>;
		};
	};
};
```

```text
        phandle = <0x00000001>;
            gpios = <0x00000001 0x0000000c 0x00000000>;
```

위는 `fdtdump` 출력입니다. `gpios`의 첫 cell이 phandle 1, 나머지 두 cell이 `#gpio-cells = <2>`가 정한 핀 번호와 flag입니다.

## Interrupt 정의

GIC v3의 `#interrupt-cells`는 3입니다. 바인딩 문서는 첫 cell을 interrupt 종류(0 = SPI, 1 = PPI), 둘째를 그 종류 안의 번호로 정의합니다(Linux v6.12 `Documentation/devicetree/bindings/interrupt-controller/arm,gic-v3.yaml` 46-53행). 셋째는 trigger flag이고, `dt-bindings/interrupt-controller/irq.h`에서 `IRQ_TYPE_LEVEL_HIGH`는 4입니다.

```dts
/dts-v1/;
#include <dt-bindings/interrupt-controller/arm-gic.h>
/ {
	#address-cells = <1>;
	#size-cells = <1>;
	intc: interrupt-controller@8000000 {
		compatible = "arm,gic-v3";
		interrupt-controller;
		#interrupt-cells = <3>;
		reg = <0x8000000 0x10000>, <0x80a0000 0xf60000>;
	};
	serial@9000000 {
		compatible = "arm,pl011", "arm,primecell";
		reg = <0x9000000 0x1000>;
		interrupt-parent = <&intc>;
		interrupts = <GIC_SPI 1 IRQ_TYPE_LEVEL_HIGH>;
	};
};
```

`GIC_SPI` 같은 이름은 C 전처리기 매크로라서 `dtc`가 직접 읽지 못합니다. 이 파일을 그대로 넣으면 `#include` 줄에서 멈춥니다.

```text
Error: irq.dts:2.1-9 syntax error
FATAL ERROR: Unable to parse input tree
```

커널 빌드가 하듯 `cpp`를 먼저 돌리면 컴파일되고, 결과는 QEMU가 만든 `pl011@9000000`의 `interrupts = <0x00 0x01 0x04>`와 같은 값입니다.

```bash
cpp -nostdinc -undef -x assembler-with-cpp -I linux-6.12/include irq.dts -o irq.pp.dts
dtc -I dts -O dtb -o irq.dtb irq.pp.dts
fdtget irq.dtb /serial@9000000 interrupts
```

```text
0 1 4
```

## Pin Mux

```dts
pinctrl: pinctrl@40020000 {
    uart0_pins: uart0-pinmux {
        pins = "PA9", "PA10";
        function = "uart";
        bias-disable;
    };
};

uart0: serial@10000000 {
    pinctrl-names = "default";
    pinctrl-0 = <&uart0_pins>;
};
```

`pins`·`function`·`bias-disable`은 generic pinctrl 바인딩의 속성 이름이고, 실제로 받는 값과 노드 모양은 SoC마다 pinctrl driver 바인딩이 정합니다. 장치 쪽의 `pinctrl-names = "default"`는 driver core가 처리합니다. Linux v6.12의 `really_probe()`는 probe 전에 `pinctrl_bind_pins()`를 부르고(`drivers/base/dd.c:636`), 이 함수가 `default` 상태를 찾아 적용합니다(`drivers/base/pinctrl.c:18-40`). 그래서 driver가 pinctrl API를 직접 부르지 않아도, 그 SoC의 pinctrl driver가 먼저 probe되어 있으면 mux가 설정됩니다.

## I²C·SPI Device 등록

```dts
&i2c1 {
    status = "okay";
    clock-frequency = <400000>;

    eeprom@50 {
        compatible = "atmel,24c256";
        reg = <0x50>;
        pagesize = <64>;
    };

    rtc@68 {
        compatible = "maxim,ds3231";
        reg = <0x68>;
    };
};

&spi1 {
    status = "okay";

    flash@0 {
        compatible = "winbond,w25q128", "jedec,spi-nor";
        reg = <0>;
        spi-max-frequency = <50000000>;
    };
};
```

`&i2c1`은 다른 파일(보통 SoC `.dtsi`)에서 label로 정의한 노드에 속성과 자식을 덧붙입니다. 자식의 `reg`는 I²C에서는 7비트 주소, SPI에서는 chip select 번호입니다.

`compatible` 문자열은 driver의 match table에 있는 값이어야 합니다. v6.12에서 `atmel,24c256`은 at24 EEPROM driver(`drivers/misc/eeprom/at24.c:274`), DS3231 RTC는 `maxim,ds3231`(`drivers/rtc/rtc-ds1307.c:1111`)입니다. SPI NOR는 `jedec,spi-nor`가 마지막에 와야 바인딩 검사를 통과합니다(`Documentation/devicetree/bindings/mtd/jedec,spi-nor.yaml:20-33`). `spi-max-frequency`는 컨트롤러와 flash, 보드 배선이 모두 만족하는 값으로 정합니다.

## Status Property

```dts
&uart2 { status = "disabled"; };
&i2c3 { status = "okay"; };
```

커널은 `status`가 없거나 `"okay"` 또는 `"ok"`인 노드만 사용 가능으로 봅니다(`drivers/of/base.c:459-461`의 `__of_device_is_available`). 뒤의 demo 노드로 확인한 결과는 다음과 같습니다. `"disabled"`면 platform device가 아예 만들어지지 않았고, `"ok"`도 `"okay"`와 똑같이 받아들여졌습니다.

```text
status: disabled 
ls: /sys/bus/platform/devices/9100000.demo: No such file or directory
status: ok 
/sys/bus/platform/devices/9100000.demo
```

## Compatible — Driver Matching

```dts
compatible = "ti,am3352-uart", "ti,omap3-uart";
```

위 줄은 Linux v6.12 `arch/arm/boot/dts/ti/omap/am33xx-l4.dtsi` 203행의 AM335x UART입니다. 목록은 가장 구체적인 것부터 일반적인 것 순으로 적습니다. 같은 driver의 match table 안에서는 앞쪽 문자열에 맞는 항목이 높은 점수를 받아 선택됩니다(`drivers/of/base.c:295-356`의 `__of_device_is_compatible`, `:996-1015`의 `__of_match_node`).

다만 이 점수는 **driver 하나의 table 안에서만** 비교됩니다. 서로 다른 두 driver가 각각 일반 문자열과 구체 문자열에 맞으면, 먼저 등록된 driver가 장치를 가져갑니다. 장치가 이미 bind되어 있으면 나중에 온 더 구체적인 driver는 그 장치를 보지 않습니다. 직접 확인한 결과는 아래 [demo](#reading-property-from-driver)에 있습니다.

### Driver 측

```c
static const struct of_device_id demo_of_match[] = {
	{ .compatible = DEMO_COMPAT },
	{ }
};
MODULE_DEVICE_TABLE(of, demo_of_match);
```

`MODULE_DEVICE_TABLE(of, ...)`은 이 table을 모듈 alias로 내보냅니다. 아래 demo 모듈을 `modinfo -F alias`로 보면 `of:N*T*Cmyco,demo-v2`와 `of:N*T*Cmyco,demo-v2C*` 두 줄이 나옵니다. udev가 장치의 modalias로 `modprobe`를 부르면 이 alias로 모듈을 찾습니다.

## Reading Property from Driver

QEMU `virt`의 DT에 노드 하나를 더해 driver가 속성을 읽는 과정을 직접 돌렸습니다. 덤프한 `virt.dts`의 루트 끝에 아래 노드를 넣고 다시 컴파일했습니다. 주소 `0x9100000`은 이 보드의 다른 노드가 쓰지 않는 자리이고, driver가 레지스터를 읽지는 않습니다.

```dts
	demo@9100000 {
		compatible = "myco,demo-v2", "myco,demo";
		reg = <0x0 0x09100000 0x0 0x1000>;
		clock-frequency = <24000000>;
		label = "status";
		status = "okay";
	};
```

Driver는 한 소스를 `DEMO_COMPAT`만 바꿔 두 모듈로 빌드했습니다. `demo_generic`은 `"myco,demo"`, `demo_v2`는 `"myco,demo-v2"`에 맞습니다.

```c
// SPDX-License-Identifier: GPL-2.0
#include <linux/module.h>
#include <linux/of.h>
#include <linux/platform_device.h>

static int demo_probe(struct platform_device *pdev)
{
	struct device_node *np = pdev->dev.of_node;
	const char *label = "(none)";
	void __iomem *base;
	u32 freq = 0;
	int ret;

	ret = of_property_read_u32(np, "clock-frequency", &freq);
	if (ret)
		return dev_err_probe(&pdev->dev, ret, "no clock-frequency\n");
	of_property_read_string(np, "label", &label);

	base = devm_platform_ioremap_resource(pdev, 0);
	if (IS_ERR(base))
		return PTR_ERR(base);

	dev_info(&pdev->dev, "%s: probed, clock-frequency=%u label=%s\n",
		 KBUILD_MODNAME, freq, label);
	return 0;
}

static const struct of_device_id demo_of_match[] = {
	{ .compatible = DEMO_COMPAT },
	{ }
};
MODULE_DEVICE_TABLE(of, demo_of_match);

static struct platform_driver demo_driver = {
	.probe = demo_probe,
	.driver = {
		.name = KBUILD_MODNAME,
		.of_match_table = demo_of_match,
	},
};
module_platform_driver(demo_driver);
MODULE_LICENSE("GPL");
```

```makefile
obj-m += demo_generic.o demo_v2.o
CFLAGS_demo_generic.o := -DDEMO_COMPAT='"myco,demo"'
CFLAGS_demo_v2.o      := -DDEMO_COMPAT='"myco,demo-v2"'
KDIR ?= /root/linux-6.12

all:
	$(MAKE) -C $(KDIR) M=$(PWD) modules
```

같은 파일을 `demo_generic.c`와 `demo_v2.c` 두 이름으로 두고 `make`했습니다. `KDIR`은 이 글의 커널을 빌드한 트리입니다. 모듈 두 개와 busybox를 initramfs에 넣고, `/init`에서 순서를 바꿔 두 번 올렸습니다.

```bash
insmod /demo_generic.ko; insmod /demo_v2.ko
basename $(readlink /sys/bus/platform/devices/9100000.demo/driver)
rmmod demo_v2; rmmod demo_generic
insmod /demo_v2.ko; insmod /demo_generic.ko
basename $(readlink /sys/bus/platform/devices/9100000.demo/driver)
```

```bash
qemu-system-aarch64 -M virt -cpu cortex-a57 -m 1G -nographic -no-reboot \
  -kernel Image -dtb virt-demo.dtb -initrd ird.cpio.gz -append "console=ttyAMA0 quiet"
```

```text
--- load generic first, then v2
bound driver: demo_generic
--- load v2 first, then generic
bound driver: demo_v2
[    0.677106] demo_generic: loading out-of-tree module taints kernel.
[    0.680516] demo_generic 9100000.demo: demo_generic: probed, clock-frequency=24000000 label=status
[    0.738232] demo_v2 9100000.demo: demo_v2: probed, clock-frequency=24000000 label=status
```

`compatible`의 첫 문자열은 `myco,demo-v2`인데도, `demo_generic`을 먼저 올리면 장치는 `demo_generic`에 묶였습니다. 구체적인 문자열을 쓰는 driver가 우선하려면 그 driver가 먼저 등록되어야 하고, 이 순서는 모듈이면 로드 순서가 정하고, built-in이면 커널 초기화 중 driver가 등록되는 순서가 정합니다. 그래서 일반 문자열에만 맞는 driver와 구체 문자열용 driver를 같은 커널에 함께 두는 경우에는 이 순서를 직접 확인해야 합니다.

`devm_platform_ioremap_resource()`처럼 `devm_`으로 시작하는 함수는 자원을 장치의 devres 목록에 묶어 둡니다. 커널 문서는 "all devres entries are released on driver detach"라고 적습니다(`Documentation/driver-api/driver-model/devres.rst:50-55`). 위 `rmmod`에서 따로 `iounmap`을 부르지 않은 이유입니다.

## Device Tree Overlay

Overlay는 base DTB를 다시 빌드하지 않고 노드를 더하거나 속성을 바꾸는 조각입니다. 파일 첫머리에 `/plugin/;`을 적고, base 쪽 label을 `&label`로 가리킵니다.

```dts
/dts-v1/;
/plugin/;

&i2c1 {
    #address-cells = <1>;
    #size-cells = <0>;
    status = "okay";

    sensor@76 {
        compatible = "bosch,bme280";
        reg = <0x76>;
    };
};
```

```bash
dtc -@ -I dts -O dtb -o overlay.dtbo overlay.dts
```

`bosch,bme280`은 v6.12 bmp280 I²C driver의 match table에 있습니다(`drivers/iio/pressure/bmp280-i2c.c:33`). Overlay를 실제로 base에 적용하는 과정과 실패하는 경우는 [7-04: Device Tree Overlay](/blog/embedded/modern-recipes/part7-04-device-tree-overlay)에서 U-Boot `fdt apply`와 `fdtoverlay`로 돌려 봅니다.

## /proc/device-tree

커널이 받은 DT는 `/sys/firmware/devicetree/base` 아래에 노드는 디렉터리, 속성은 파일로 보입니다. `/proc/device-tree`는 그곳을 가리키는 symlink입니다. 위 demo를 부팅한 initramfs에서 본 결과입니다.

```text
lrwxrwxrwx    1 0        0               29 Nov 16 13:39 /proc/device-tree -> /sys/firmware/devicetree/base
--- compatible
myco,demo-v2
myco,demo
--- clock-frequency
00000000  01 6e 36 00                                       |.n6.|
00000004
```

문자열 목록은 NUL로 구분되어 있어 `tr '\0' '\n'`으로 풀었고, `clock-frequency`는 big-endian 32비트 `0x016e3600` = 24,000,000입니다. 현재 커널이 본 DT 전체를 소스로 되돌리려면 `dtc -I fs -O dts /sys/firmware/devicetree/base`를 씁니다.

## DTC 컴파일 시 -@ 옵션

`-@`는 label을 `__symbols__` 노드에 기록합니다. 위 phandle 예제를 `-@`로 컴파일하면 `fdtdump`에 다음 노드가 생깁니다.

```text
    __symbols__ {
        gpio_controller = "/gpio_controller@40020000";
    };
```

Overlay의 `&i2c1` 같은 참조는 적용할 때 base의 `__symbols__`에서 경로를 찾아 풉니다. 그래서 overlay를 받을 base DTB는 `-@`로 빌드해야 합니다. 커널 빌드 시스템은 overlay와 합칠 base로 등록된 DTB에만 `-@`를 붙입니다(Linux v6.12 `scripts/Makefile.dtbs:113-114`).

## 자주 하는 실수

> ⚠️ `#address-cells` 부모 vs 자식

```dts
soc {
    #address-cells = <1>;   /* cells in a child's reg address */
    #size-cells = <1>;

    uart@10000000 {
        reg = <0x10000000 0x100>;   /* 1 address cell + 1 size cell */
    };
};
```

자식의 `reg`는 *부모*의 `#address-cells`·`#size-cells`를 따릅니다. 자기 노드에 적은 값은 그 노드의 자식에게 적용됩니다.

> ⚠️ label 없이 phandle 참조

위 phandle 예제에서 `gpio_controller:` label을 지우고 컴파일하면 `dtc`가 멈춥니다.

```text
label.dts:14.8-16.5: ERROR (phandle_references): /leds/led0: Reference to non-existent node or label "gpio_controller"

ERROR: Input tree has errors, aborting (use -f to force output)
```

노드 이름(`gpio_controller@40020000`)은 label이 아닙니다. 참조하려면 `gpio_controller: gpio_controller@40020000 { ... };`처럼 label을 붙입니다.

> ⚠️ 부모가 disabled인데 자식만 켬

```dts
&i2c1 {
    status = "disabled";
    sensor@50 { compatible = "atmel,24c256"; reg = <0x50>; };
};
```

I²C 자식 장치는 컨트롤러 driver가 probe되어 adapter를 등록할 때 만들어집니다. v6.12 `i2c_register_adapter()`가 `of_i2c_register_devices(adap)`를 부르는 곳이 `drivers/i2c/i2c-core-base.c:1581`입니다. 컨트롤러 노드가 disabled면 위 status 실험처럼 platform device 자체가 없으므로, 자식은 등록되지 않습니다.

> ⚠️ 빌드한 DTB와 부팅에 쓰는 DTB가 다름

```bash
make dtbs
ls arch/arm64/boot/dts/freescale/imx8mm-evk.dtb
```

v6.12 arm64 빌드의 DTB는 `arch/arm64/boot/dts/<vendor>/` 아래에 생깁니다(이 글의 빌드에서 확인). Bootloader가 boot 파티션의 다른 파일을 읽고 있으면 고친 DTB는 쓰이지 않습니다. 부팅 후 `/proc/device-tree`에서 고친 속성이 보이는지로 확인합니다.

## 정리

- DTS는 hardware 토폴로지 선언이고, 커널은 DTB를 읽어 `compatible`로 driver를 짝짓습니다.
- `reg`의 cell 수는 부모의 `#address-cells`·`#size-cells`가 정합니다.
- `&label` 참조는 label이 있어야 컴파일됩니다. `-@`는 label을 `__symbols__`로 남겨 overlay가 쓸 수 있게 합니다.
- `GIC_SPI` 같은 이름은 `cpp`를 거쳐야 하는 매크로입니다.
- `status`는 없거나 `"okay"`/`"ok"`일 때만 장치가 만들어집니다.
- `compatible` 순서는 driver 하나의 table 안에서 우선순위를 정할 뿐이고, driver 사이에서는 먼저 등록된 쪽이 장치를 가져갑니다.

다음 편은 [7-04: Device Tree Overlay](/blog/embedded/modern-recipes/part7-04-device-tree-overlay)입니다.

## 관련 항목

- [7-02: U-Boot 활용](/blog/embedded/modern-recipes/part7-02-uboot-usage)
- [7-04: Device Tree Overlay](/blog/embedded/modern-recipes/part7-04-device-tree-overlay)
- [7-08: Platform 드라이버](/blog/embedded/modern-recipes/part7-08-platform-driver)
- [3-12: 임베디드 Bootloader 체인](/blog/embedded/modern-recipes/part3-12-bootloader-chain)
