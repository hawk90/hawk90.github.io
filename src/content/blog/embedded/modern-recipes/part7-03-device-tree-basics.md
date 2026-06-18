---
title: "Device Tree 실전 — DTS·DTB·Overlay·Phandle 추적"
date: 2026-04-16T09:02:00
description: "Device Tree Source 문법. DTC 컴파일. Overlay로 dynamic 변경. Linux driver match."
series: "Modern Embedded Recipes"
seriesOrder: 77
tags: [recipes, device-tree, dts, dtb, overlay, linux]
draft: false
---

## 한 줄 요약

> **"Device Tree는 hardware 토폴로지 선언입니다."** kernel은 어떤 device가 어디에 있는지 *읽고* driver를 매칭합니다.

## DTS·DTB·DTBO

```text
sample.dts    ← human readable source
  │
  │ dtc -I dts -O dtb -o sample.dtb sample.dts
  ↓
sample.dtb    ← binary blob, bootloader가 kernel에 전달
  │
  ↓
sample.dtbo   ← overlay (run-time merge)
```

## 기본 구조

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
        reg = <0x80000000 0x80000000>;   // 2 GB at 0x80000000
    };

    soc {
        compatible = "simple-bus";
        #address-cells = <1>;
        #size-cells = <1>;
        ranges;

        uart0: serial@10000000 {
            compatible = "ns16550a";
            reg = <0x10000000 0x100>;
            interrupts = <23>;
            clock-frequency = <24000000>;
            current-speed = <115200>;
            status = "okay";
        };
    };
};
```

## #address-cells·#size-cells

각 cell은 *32-bit value*입니다. 부모 노드가 *자식의 reg 형식*을 결정합니다.

```dts
#address-cells = <2>;
#size-cells = <2>;

memory@0 {
    reg = <0x0 0x80000000 0x0 0x40000000>;   // address (2 cells) + size (2 cells)
    /* = 0x0000_0000_8000_0000 길이 0x0000_0000_4000_0000 = 1 GB */
};
```

64-bit address space는 *2 cell*을 사용합니다.

## Phandle — Cross-reference

```dts
gpio0: gpio@40020000 {
    compatible = "snps,dw-apb-gpio";
    reg = <0x40020000 0x1000>;
    #gpio-cells = <2>;
};

leds {
    compatible = "gpio-leds";
    led0 {
        label = "status";
        gpios = <&gpio0 12 GPIO_ACTIVE_HIGH>;
    };
};
```

`&gpio0`은 phandle reference입니다. `<gpio_pin gpio_flags>` 형식을 따릅니다.

## Interrupt 정의

```dts
intc: interrupt-controller@8000000 {
    compatible = "arm,gic-v3";
    interrupt-controller;
    #interrupt-cells = <3>;
    reg = <0x8000000 0x10000>,
          <0x8010000 0x100000>;
};

uart0: serial@10000000 {
    interrupts = <GIC_SPI 33 IRQ_TYPE_LEVEL_HIGH>;
    interrupt-parent = <&intc>;
};
```

GIC-v3는 3 cell을 씁니다 (`SPI/PPI`·number·trigger type).

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

부팅 시 kernel이 *자동으로 pin mux를 설정*합니다.

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
        compatible = "dallas,ds3231";
        reg = <0x68>;
    };
};

&spi1 {
    status = "okay";
    
    flash@0 {
        compatible = "winbond,w25q128";
        reg = <0>;
        spi-max-frequency = <50000000>;
    };
};
```

`&i2c1`은 다른 곳에서 정의된 노드를 *증강*합니다 (label reference).

## Status Property

```dts
&uart2 { status = "disabled"; };
&i2c3 { status = "okay"; };
```

`"okay"`는 kernel 활성화, `"disabled"`는 비활성을 의미합니다. 보드별로 다른 peripheral on/off에 사용합니다.

## Compatible — Driver Matching

```dts
compatible = "ti,am335x-uart", "ns16550a";
```

Linux kernel은 *순차 검색*을 합니다. `ti,am335x-uart` 매칭 driver가 우선이고, 없으면 `ns16550a`로 넘어갑니다.

### Driver 측

```c
static const struct of_device_id my_uart_of_match[] = {
    { .compatible = "ti,am335x-uart" },
    { },
};
MODULE_DEVICE_TABLE(of, my_uart_of_match);
```

## Reading Property from Driver

```c
static int my_probe(struct platform_device *pdev) {
    struct device_node *np = pdev->dev.of_node;
    u32 freq;
    const char *label;
    
    of_property_read_u32(np, "clock-frequency", &freq);
    of_property_read_string(np, "label", &label);
    
    /* MMIO mapping */
    void __iomem *base = devm_platform_ioremap_resource(pdev, 0);
    if (IS_ERR(base)) return PTR_ERR(base);
    
    /* IRQ */
    int irq = platform_get_irq(pdev, 0);
    if (irq < 0) return irq;
    
    /* GPIO */
    struct gpio_desc *gpio = devm_gpiod_get(&pdev->dev, "reset", GPIOD_OUT_LOW);
    
    return 0;
}
```

`devm_*` 변종은 *자동 release*를 제공합니다. driver unload 시 cleanup이 자동으로 일어납니다.

## Device Tree Overlay

런타임에 *DT를 변경*합니다. *PR Capes·shields·hot-plug device*에 씁니다.

```dts
/dts-v1/;
/plugin/;

&i2c1 {
    #address-cells = <1>;
    #size-cells = <0>;
    status = "okay";

    new_sensor: sensor@68 {
        compatible = "bosch,bmp280";
        reg = <0x68>;
    };
};
```

```bash
dtc -@ -I dts -O dtb -o overlay.dtbo overlay.dts

# Raspberry Pi / BeagleBone
sudo dtoverlay overlay.dtbo
```

부팅 시 적용도, 동적 적용도 모두 가능합니다.

## /proc/device-tree·dtdiff

```bash
# 현재 kernel 본 DT
ls /proc/device-tree/
cat /proc/device-tree/model

# dtdiff
dtc -I fs /proc/device-tree | less
```

`/sys/firmware/devicetree/base/`도 같은 내용을 담고 있습니다.

## DTC 컴파일 시 -@ 옵션

```bash
dtc -@ -I dts -O dtb -o board.dtb board.dts
```

`-@` 옵션은 *symbol table을 포함*시킵니다. 이렇게 하면 overlay가 *symbol reference*를 할 수 있습니다.

## 자주 하는 실수

> ⚠️ `#address-cells` 부모 vs 자식

```dts
soc {
    #address-cells = <1>;   // 자식 reg의 address cell 수
    
    uart@10000000 {
        reg = <0x10000000 0x100>;   // 1 address cell + 1 size cell
    };
};
```

자식의 `reg`은 *부모의 `#address-cells`*를 따릅니다. 헷갈리기 쉬운 부분입니다.

> ⚠️ `phandle` 사용 시 label 없음

```dts
gpio_controller@40020000 {   // ← label 없음
    /* ... */
};

leds {
    gpios = <&gpio_controller 12 0>;   // ← undefined reference
};
```

label 정의가 필수입니다.

```dts
gpio_controller: gpio_controller@40020000 { ... };
```

> ⚠️ Disabled 노드의 child도 disable

```dts
&i2c1 {
    status = "disabled";
    sensor@50 { ... };   // ← parent disabled, driver probe 안 됨
};
```

> ⚠️ DTB 로드 시 옛 binary

```bash
make dtbs
cp arch/arm/boot/dts/myboard.dtb /boot/
```

Bootloader가 *옛 DTB*를 가리키면 변경이 무효가 됩니다. `/boot/extlinux/extlinux.conf` 또는 u-boot env를 확인합니다.

## 정리

- DTS는 **hardware 토폴로지 선언**입니다. kernel·bootloader가 읽습니다.
- 핵심은 `compatible`·`reg`·`interrupts`·`status`입니다.
- **Phandle**로 cross-reference를 만듭니다.
- Linux driver는 `compatible` 매칭으로 *probe*를 수행합니다.
- **Overlay**는 런타임 DT 수정입니다.
- `/proc/device-tree`로 현재 상태를 확인합니다.

다음 편은 **Bootloader U-Boot**입니다.

## 관련 항목

- [1-03: PCIe BAR](/blog/embedded/modern-recipes/part11-03-pcie-bar)
- [1-05: Bootloader](/blog/embedded/modern-recipes/part3-12-bootloader-chain)
