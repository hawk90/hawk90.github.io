---
title: "BSP 드라이버 추가 — 보드별 Peripheral 통합 흐름"
date: 2026-05-18T09:12:00
description: "BSP에서 새 드라이버 통합 — 기존 드라이버 활용, DT binding 추가, 새 드라이버 작성 결정 기준을 정리합니다."
series: "BSP Development"
seriesOrder: 12
tags: [embedded, bsp, driver, peripheral]
draft: false
---

## 한 줄 요약

**BSP의 드라이버 작업 80%는 *새 드라이버를 쓰는 게 아니라* DT에 노드를 추가하는 일입니다.** 기존 mainline 드라이버는 이미 충분히 풍부하므로, 보드별 peripheral을 통합할 때는 먼저 *어떤 드라이버가 이 칩을 이미 지원하는지* 찾는 것이 첫걸음입니다.

새 보드에 EEPROM, ADC, 가속도계, RTC를 붙였다고 가정합시다. 이때 BSP 엔지니어가 새 C 코드를 짤 일은 거의 없습니다. Linux는 이미 수천 개의 디바이스 드라이버를 갖고 있고, 대부분의 표준 chip(24c256 EEPROM, ads1015 ADC, mpu6050 IMU 등)은 그대로 동작합니다. *적절한 DT 노드만 작성*하면 됩니다. 이 글은 그 흐름을 정리합니다.

## 첫 번째 질문 — 드라이버가 이미 있는가?

```bash
# 칩 이름으로 검색
$ grep -r "24c256" drivers/
drivers/misc/eeprom/at24.c:    { "24c256", (kernel_ulong_t)&at24_data_24c256 },

$ ls drivers/iio/adc/ti-ads*.c
drivers/iio/adc/ti-ads1015.c
drivers/iio/adc/ti-ads124s08.c
drivers/iio/adc/ti-ads7950.c

# Documentation/devicetree/bindings/ 에서 binding 확인
$ find Documentation/devicetree/bindings -name "*ads1015*"
Documentation/devicetree/bindings/iio/adc/ti,ads1015.yaml
```

거의 모든 흔한 chip은 이미 드라이버가 있습니다. 없는 것이 오히려 예외입니다.

binding 문서는 *DT 노드를 어떻게 써야 하는지*의 정답입니다. 새 노드를 작성하기 전에 반드시 읽어야 합니다.

## 사례 1 — I2C EEPROM 추가

24c256 EEPROM을 I2C 버스에 추가합니다.

먼저 보드의 schematic을 확인합니다. EEPROM의 SDA/SCL이 어느 I2C 컨트롤러에 연결됐는지, 7-bit 주소(WP 핀 strap에 따라 결정)가 무엇인지 확인합니다.

```text
EEPROM: AT24C256
Connected to: I2C1
Address: 0x50 (A2=A1=A0=0)
VCC: 3.3V
WP: tied low (write enabled)
```

DT 노드는 다음과 같습니다.

```text
&i2c1 {
    clock-frequency = <100000>;
    status = "okay";

    eeprom@50 {
        compatible = "atmel,24c256";
        reg = <0x50>;
        pagesize = <64>;
    };
};
```

부팅 후 확인:

```bash
$ ls /sys/bus/i2c/devices/
0-0050  1-0048  ...

$ cat /sys/bus/i2c/devices/0-0050/eeprom | hexdump -C
00000000  00 ff ff ff ff ff ff ff  ff ff ff ff ff ff ff ff  |................|
```

새 C 코드 한 줄도 안 쓰고 EEPROM이 동작합니다. 이것이 device tree의 가치입니다.

## 사례 2 — I2C ADC 추가 (IIO subsystem)

TI ADS1015 4채널 ADC를 I2C에 붙입니다.

```text
&i2c1 {
    adc@48 {
        compatible = "ti,ads1015";
        reg = <0x48>;
        #address-cells = <1>;
        #size-cells = <0>;

        channel@0 {
            reg = <0>;        /* AIN0 */
            ti,gain = <2>;    /* PGA = ±2.048V */
            ti,datarate = <4>; /* 1600 SPS */
        };

        channel@1 {
            reg = <1>;        /* AIN1 */
            ti,gain = <2>;
            ti,datarate = <4>;
        };
    };
};
```

부팅 후 IIO sysfs로 읽기:

```bash
$ ls /sys/bus/iio/devices/
iio:device0

$ cat /sys/bus/iio/devices/iio:device0/name
ads1015

$ cat /sys/bus/iio/devices/iio:device0/in_voltage0_raw
12345

$ cat /sys/bus/iio/devices/iio:device0/in_voltage0_scale
0.062500
```

`raw × scale = mV` 변환은 사용자 공간에서 처리합니다.

## 사례 3 — pinctrl과 GPIO

새 peripheral을 추가할 때 *핀이 다른 기능과 충돌하지 않는지*가 중요합니다. SoC 핀은 보통 여러 기능을 다중화하며, pinctrl이 이를 관리합니다.

```text
&iomuxc {
    pinctrl_i2c1: i2c1grp {
        fsl,pins = <
            MX8MM_IOMUXC_I2C1_SCL_I2C1_SCL  0x400001c3
            MX8MM_IOMUXC_I2C1_SDA_I2C1_SDA  0x400001c3
        >;
    };

    pinctrl_gpio_led: gpioledgrp {
        fsl,pins = <
            MX8MM_IOMUXC_NAND_CE0_B_GPIO3_IO1   0x19
        >;
    };
};

&i2c1 {
    pinctrl-names = "default";
    pinctrl-0 = <&pinctrl_i2c1>;
    /* ... */
};

leds {
    compatible = "gpio-leds";
    pinctrl-names = "default";
    pinctrl-0 = <&pinctrl_gpio_led>;

    status {
        label = "status";
        gpios = <&gpio3 1 GPIO_ACTIVE_HIGH>;
        default-state = "off";
    };
};
```

`pinctrl-single,pins`는 generic binding이고 i.MX는 `fsl,pins`, Rockchip은 `rockchip,pins`처럼 vendor 고유 binding을 씁니다. SoC 패밀리별 매크로 헤더(`imx8mm-pinfunc.h` 등)를 include해야 합니다.

확인:

```bash
$ cat /sys/kernel/debug/pinctrl/30330000.pinctrl/pinmux-functions | head
$ cat /sys/kernel/debug/pinctrl/30330000.pinctrl/pinmux-pins | head
```

## 사례 4 — regulator binding

전원 공급에 PMIC가 있다면 regulator framework로 도메인을 관리합니다. EEPROM에 3.3V를 공급하는 LDO를 모델링하고 디바이스 노드가 이를 참조하게 만듭니다.

```text
&i2c2 {
    pmic@25 {
        compatible = "nxp,pca9450";
        reg = <0x25>;

        regulators {
            buck1_reg: BUCK1 {
                regulator-name = "BUCK1";
                regulator-min-microvolt = <600000>;
                regulator-max-microvolt = <2187500>;
                regulator-always-on;
            };

            ldo3_reg: LDO3 {
                regulator-name = "LDO3";
                regulator-min-microvolt = <3300000>;
                regulator-max-microvolt = <3300000>;
                regulator-always-on;
            };
        };
    };
};

&i2c1 {
    eeprom@50 {
        compatible = "atmel,24c256";
        reg = <0x50>;
        vcc-supply = <&ldo3_reg>;     /* 이 줄로 LDO3에 의존 */
    };
};
```

`vcc-supply`가 있으면 EEPROM probe 시 regulator를 enable하고, remove 시 disable합니다. runtime PM과 결합되면 전력 절감 효과가 큽니다.

확인:

```bash
$ cat /sys/kernel/debug/regulator/regulator_summary
 regulator                      use open bypass voltage current     min     max
---------------------------------------------------------------------------------
 LDO3                              1    1     0  3300mV     0mV  3300mV  3300mV
    eeprom@50                                  3300mV     0mV  3300mV  3300mV
```

## 사례 5 — SPI flash 추가

NOR flash를 SPI에 붙입니다.

```text
&spi1 {
    pinctrl-names = "default";
    pinctrl-0 = <&pinctrl_spi1>;
    cs-gpios = <&gpio5 9 GPIO_ACTIVE_LOW>;
    status = "okay";

    flash@0 {
        compatible = "jedec,spi-nor";
        reg = <0>;
        spi-max-frequency = <50000000>;
        spi-tx-bus-width = <1>;
        spi-rx-bus-width = <1>;

        partitions {
            compatible = "fixed-partitions";
            #address-cells = <1>;
            #size-cells = <1>;

            partition@0 {
                label = "u-boot-env";
                reg = <0x0 0x40000>;
            };

            partition@40000 {
                label = "config";
                reg = <0x40000 0x1c0000>;
            };
        };
    };
};
```

부팅 후 `/dev/mtd0`, `/dev/mtd1`로 노출됩니다.

```bash
$ cat /proc/mtd
dev:    size   erasesize  name
mtd0: 00040000 00010000 "u-boot-env"
mtd1: 001c0000 00010000 "config"

$ mtd_debug read /dev/mtd0 0 1024 dump.bin
```

## 사례 6 — MMC slot

SD/eMMC slot도 거의 DT만으로 동작합니다.

```text
&usdhc2 {
    pinctrl-names = "default";
    pinctrl-0 = <&pinctrl_usdhc2>;
    cd-gpios = <&gpio2 12 GPIO_ACTIVE_LOW>;   /* card detect */
    vmmc-supply = <&reg_usdhc2_vmmc>;
    bus-width = <4>;
    no-mmc;                /* SD 전용 */
    no-sdio;
    status = "okay";
};
```

`vmmc-supply`는 SD 카드 전원 LDO. `cd-gpios`는 카드 삽입 감지 핀. `bus-width = <4>`는 4-bit data.

## 새 드라이버를 *작성해야 하는* 경우

다음 조건이 모두 만족하면 새 드라이버가 필요합니다.

1. Vendor proprietary IP라서 기존 드라이버가 없음.
2. 같은 카테고리의 generic framework(IIO, GPIO, regulator 등)가 *없거나* IP 동작이 너무 다름.
3. binding 문서를 새로 작성할 만큼 *재사용 가능*함.

이 경우 다음 절차입니다.

1. `drivers/<subsystem>/<vendor>_<chip>.c` 작성.
2. Kconfig·Makefile 등록.
3. `Documentation/devicetree/bindings/<subsystem>/<vendor>,<chip>.yaml` 작성.
4. DT 노드 작성.
5. probe·remove·suspend·resume 구현.
6. `devm_*` 자원 관리.
7. 검토 후 upstream 제안.

최소 골격은 다음과 같습니다.

```c
#include <linux/module.h>
#include <linux/of.h>
#include <linux/platform_device.h>

struct mychip_data {
    void __iomem *base;
    int irq;
    struct clk *clk;
};

static int mychip_probe(struct platform_device *pdev)
{
    struct mychip_data *priv;
    struct resource *res;

    priv = devm_kzalloc(&pdev->dev, sizeof(*priv), GFP_KERNEL);
    if (!priv)
        return -ENOMEM;

    res = platform_get_resource(pdev, IORESOURCE_MEM, 0);
    priv->base = devm_ioremap_resource(&pdev->dev, res);
    if (IS_ERR(priv->base))
        return PTR_ERR(priv->base);

    priv->irq = platform_get_irq(pdev, 0);
    if (priv->irq < 0)
        return priv->irq;

    priv->clk = devm_clk_get(&pdev->dev, NULL);
    if (IS_ERR(priv->clk))
        return PTR_ERR(priv->clk);

    clk_prepare_enable(priv->clk);
    platform_set_drvdata(pdev, priv);
    return 0;
}

static int mychip_remove(struct platform_device *pdev)
{
    struct mychip_data *priv = platform_get_drvdata(pdev);
    clk_disable_unprepare(priv->clk);
    return 0;
}

static const struct of_device_id mychip_of_match[] = {
    { .compatible = "myvendor,mychip-v1" },
    { }
};
MODULE_DEVICE_TABLE(of, mychip_of_match);

static struct platform_driver mychip_driver = {
    .driver = {
        .name = "mychip",
        .of_match_table = mychip_of_match,
    },
    .probe  = mychip_probe,
    .remove = mychip_remove,
};
module_platform_driver(mychip_driver);

MODULE_LICENSE("GPL v2");
MODULE_DESCRIPTION("MyVendor MyChip driver");
```

`devm_*` 함수는 디바이스 lifetime에 자원을 묶어 줍니다. probe 실패나 remove 시 자동으로 해제됩니다.

## DT binding 문서 작성

새 드라이버에는 binding 문서가 따라옵니다. YAML 형식입니다.

```yaml
# Documentation/devicetree/bindings/misc/myvendor,mychip.yaml
%YAML 1.2
---
$id: http://devicetree.org/schemas/misc/myvendor,mychip.yaml#
$schema: http://devicetree.org/meta-schemas/core.yaml#

title: MyVendor MyChip controller

maintainers:
  - Sang-Deok Yoon <hawking90a@gmail.com>

properties:
  compatible:
    enum:
      - myvendor,mychip-v1

  reg:
    maxItems: 1

  interrupts:
    maxItems: 1

  clocks:
    maxItems: 1

required:
  - compatible
  - reg
  - interrupts
  - clocks

additionalProperties: false

examples:
  - |
    mychip@10000000 {
        compatible = "myvendor,mychip-v1";
        reg = <0x10000000 0x1000>;
        interrupts = <0 42 4>;
        clocks = <&clks 23>;
    };
```

validation:

```bash
make dt_binding_check DT_SCHEMA_FILES=myvendor,mychip.yaml
make dtbs_check DT_SCHEMA_FILES=myvendor,mychip.yaml
```

## 커널 모듈 로드 순서

빌트인 드라이버는 link order대로 init합니다. 모듈은 `modprobe` 또는 udev에 의해 부팅 후 로드됩니다.

순서 의존성을 명시적으로 표현하는 방법:

```c
/* 이 드라이버가 다른 subsystem을 *먼저* 필요로 함 */
module_init(mychip_init);              /* 일반 */
late_initcall(mychip_late_init);       /* 늦게 */
subsys_initcall(myframework_init);     /* subsystem 단계 */
```

DT의 phandle 참조(`clocks = <&clks 23>`)가 있으면 deferred probe로 의존성 자동 해결됩니다. 의존 디바이스가 아직 probe 안 됐으면 `EPROBE_DEFER`(-517) 반환하고 나중에 재시도합니다.

```bash
# probe 실패한 디바이스 확인
$ cat /sys/kernel/debug/devices_deferred
30890000.serial    consumers: 30330000.pinctrl
```

## 흔한 실수

- **binding 문서 확인 없이 DT 노드 작성**: 속성 이름·단위·예제가 *정답*입니다. 무시하면 probe 실패.
- **`status = "disabled"` 노드를 enable 안 함**: 기본 DT에 `status = "disabled"`로 적힌 노드는 보드 DTS에서 `&node { status = "okay"; }`로 켜야 합니다.
- **regulator/clock 누락**: 디바이스가 처음 동작은 하지만 *suspend 후 동작 불가*. `vcc-supply`, `clocks` 명시.
- **pinctrl 충돌**: 같은 핀을 두 디바이스가 잡으면 후순위가 probe 실패. dmesg에 `unable to claim pin`이 보임.
- **out-of-tree 드라이버 남발**: 모든 vendor 수정사항을 out-of-tree로 두면 kernel 업그레이드마다 rebase 지옥. 가능한 한 upstream 또는 in-tree로.

## 정리

- 새 chip 통합의 첫걸음은 *이미 있는 드라이버 찾기*이며, 대부분의 표준 chip은 mainline에 있습니다.
- DT 노드만 추가하면 EEPROM, ADC, IMU, RTC, flash, MMC 등이 동작합니다.
- `Documentation/devicetree/bindings/`의 YAML 문서가 *정답*이며, 새 노드를 쓰기 전에 반드시 읽습니다.
- pinctrl, regulator, clock binding은 보드의 거의 모든 디바이스가 의존하는 공통 기반입니다.
- 새 드라이버를 짤 때는 platform_driver, of_match, devm_* 자원 관리, EPROBE_DEFER를 익혀 둡니다.
- binding 문서는 `make dt_binding_check`로 schema validation합니다.
- 빌트인 vs 모듈 결정은 [Ch 8](/blog/embedded/bsp/chapter08-kernel-config)의 기준을 따릅니다.
- out-of-tree 드라이버는 upstream 머지 전 임시 수단으로만 씁니다.

## 다음 편 예고

[Ch 13: Power Management](/blog/embedded/bsp/chapter13-power-management)에서는 suspend/resume, runtime PM, regulator framework, cpuidle/cpufreq를 살펴봅니다.

## 관련 항목

- [Ch 7: Device Tree 작성](/blog/embedded/bsp/chapter07-device-tree)
- [Ch 8: Linux 커널 설정](/blog/embedded/bsp/chapter08-kernel-config)
- [Ch 13: Power Management](/blog/embedded/bsp/chapter13-power-management)
- [Ch 14: Thermal과 watchdog](/blog/embedded/bsp/chapter14-thermal-watchdog)
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/) — driver 패턴
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/) — interrupt 처리 비교
