---
title: "BSP 드라이버 추가 — 보드별 Peripheral 통합 흐름"
slug: "embedded/bsp/chapter12-driver-add"
date: 2026-05-18T09:12:00
description: "BSP에서 새 드라이버 통합 — 기존 드라이버 활용, DT binding 추가, 새 드라이버 작성 결정 기준을 정리합니다."
series: "BSP Development"
seriesOrder: 12
tags: [embedded, bsp, driver, peripheral]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

**드라이버 통합을 시작할 때는 기존 드라이버와 binding 지원 여부부터 확인합니다.** 칩 이름으로 커널 트리를 grep해 드라이버와 binding 문서가 나오면, 보드 작업은 DT 노드를 쓰는 일로 줄어듭니다.

새 보드에 EEPROM과 ADC를 붙였다고 가정합시다. 이 글은 Linux 6.12 소스(kernel.org tarball, sha256 확인)에서 두 칩의 드라이버와 binding을 찾고, 그 binding대로 DT 노드를 쓰는 흐름을 따라갑니다. QEMU virt 머신에는 I2C 버스가 없어 EEPROM과 ADC를 실제로 붙여 보지는 못했습니다. 그래서 DT 예시는 binding 문서와 대조했고, 부팅 후 출력은 싣지 않았습니다. 마지막의 새 드라이버 골격은 Debian 13 guest(커널 6.12.116)에서 실제로 빌드하고 적재했습니다.

## 첫 번째 질문 — 드라이버가 이미 있는가?

도서관에서 책을 사기 전에 소장 목록부터 검색하는 것과 같습니다. Linux 6.12 트리에서 실행한 결과입니다.

```text
$ grep -n '"24c256"\|atmel,24c256' drivers/misc/eeprom/at24.c
242:	{ "24c256",	(kernel_ulong_t)&at24_data_24c256 },
274:	{ .compatible = "atmel,24c256",		.data = &at24_data_24c256 },
$ ls drivers/iio/adc/ti-ads1*.c
drivers/iio/adc/ti-ads1015.c
drivers/iio/adc/ti-ads1100.c
drivers/iio/adc/ti-ads1119.c
drivers/iio/adc/ti-ads124s08.c
drivers/iio/adc/ti-ads1298.c
drivers/iio/adc/ti-ads131e08.c
$ ls Documentation/devicetree/bindings/iio/adc/ | grep -i ads1015
ti,ads1015.yaml
```

`at24.c`의 두 줄이 중요합니다. 242행은 I2C id table, 274행은 OF match table이고, DT의 `compatible = "atmel,24c256"`은 274행과 맞춰집니다. binding 문서는 *DT 노드를 어떻게 써야 하는지*의 정답이므로 새 노드를 쓰기 전에 읽습니다.

## 사례 1 — I2C EEPROM 추가

24c256 EEPROM을 I2C 버스에 추가합니다.

먼저 보드의 schematic에서 EEPROM의 SDA/SCL이 어느 I2C controller에 연결됐는지, 주소 핀 strap이 만드는 7-bit 주소가 무엇인지 확인합니다. 아래 노드는 I2C1, 주소 0x50으로 배선했다고 가정한 예입니다. BeagleBone Black의 보드 EEPROM도 같은 compatible과 주소를 씁니다(`am335x-bone-common.dtsi`의 `baseboard_eeprom@50`, `compatible = "atmel,24c256"`).

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

`pagesize`는 binding `eeprom/at24.yaml:152`의 속성이고, 같은 문서는 값을 칩 datasheet에서 확인하라고 적습니다. probe되면 at24 드라이버는 `NVMEM_TYPE_EEPROM` 타입으로 NVMEM 장치를 등록하고(`at24.c:741,784`), NVMEM core가 `eeprom`이라는 sysfs 파일을 붙입니다(`drivers/nvmem/core.c:396`). 이 글은 실제 EEPROM이 없어 읽기 결과는 싣지 않습니다.

## 사례 2 — I2C ADC 추가 (IIO subsystem)

TI ADS1015 ADC를 I2C에 붙입니다. binding `iio/adc/ti,ads1015.yaml`은 자식 노드를 `"^channel@[0-7]+$"` 패턴으로(48행), 채널 속성을 `ti,gain`(69행)과 `ti,datarate`(82행)로 정의합니다. 아래 예의 숫자 의미(gain 2 = ±2.048 V, datarate 4 = 1600 SPS)는 이 binding의 enum 설명과 대조해 정합니다.

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

probe되면 IIO 장치가 `/sys/bus/iio/devices/iio:deviceN/` 아래에 생기고, 채널마다 `in_voltageX_raw`와 `in_voltageX_scale`이 생깁니다. IIO ABI 문서(`Documentation/ABI/testing/sysfs-bus-iio:141-153`)는 raw 값에 scale과 offset을 적용한 단위를 밀리볼트로 정의합니다. 이 글은 실제 ADC가 없어 읽은 값은 싣지 않습니다.

## 사례 3 — pinctrl과 GPIO

새 peripheral을 추가할 때 *핀이 다른 기능과 충돌하지 않는지*가 중요합니다. 아래는 i.MX 8M Mini 예입니다.

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

`pinctrl-single,pins`는 generic binding(Ch 3의 BeagleBone Black이 씁니다)이고 i.MX는 `fsl,pins`를 씁니다. SoC 패밀리별 매크로 헤더(`imx8mm-pinfunc.h` 등)를 include해야 합니다. 같은 pad를 두 장치가 요청하면 pinmux core가 `pin %s already requested by %s; cannot claim for %s`를 찍고 두 번째 요청을 거절합니다(`drivers/pinctrl/pinmux.c:133`).

확인:

```bash
$ cat /sys/kernel/debug/pinctrl/30330000.pinctrl/pinmux-functions | head
$ cat /sys/kernel/debug/pinctrl/30330000.pinctrl/pinmux-pins | head
```

## 사례 4 — regulator binding

전원 공급에 PMIC가 있다면 regulator framework로 도메인을 관리합니다. EEPROM에 3.3V를 공급하는 LDO를 모델링하고 디바이스 노드가 이를 참조하게 만듭니다.

PCA9450의 compatible은 binding `regulator/nxp,pca9450-regulator.yaml:28-30`에 `nxp,pca9450a`, `nxp,pca9450b`, `nxp,pca9450c`로 나뉘어 있습니다. i.MX 8M Plus EVK는 `nxp,pca9450c`입니다(Ch 3).

```text
&i2c2 {
    pmic@25 {
        compatible = "nxp,pca9450c";
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

`vcc-supply`는 `at24.yaml:196`의 속성이고, at24 드라이버가 `devm_regulator_get(dev, "vcc")`로 이 regulator를 잡습니다(`at24.c:704`).

연결 상태는 debugfs의 `regulator_summary`로 봅니다. QEMU guest에는 PMIC가 없어 dummy regulator 한 줄만 나오지만, 열 이름은 실제 보드와 같습니다.

```text
$ head -8 /sys/kernel/debug/regulator/regulator_summary
 regulator                      use open bypass  opmode voltage current     min     max
---------------------------------------------------------------------------------------
 regulator-dummy                  1    0      0 unknown     0mV     0mA     0mV     0mV
```

실제 보드에서는 `LDO3` 같은 regulator 아래에 그것을 쓰는 장치가 들여쓰기로 나옵니다.

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

`compatible = "jedec,spi-nor"`과 `fixed-partitions`는 각각 binding `mtd/jedec,spi-nor.yaml`과 `mtd/partitions/fixed-partitions.yaml`에 있습니다. 파티션마다 `/dev/mtdN`이 생기고 `/proc/mtd`에 크기와 이름이 나옵니다. 이 글은 SPI flash를 붙여 보지 않았습니다.

## 사례 6 — MMC slot

SD/eMMC slot도 DT 노드로 연결합니다. Ch 3에서 본 BeagleBone Black의 `&mmc1`이 같은 구조입니다.

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

최소 골격은 다음과 같습니다. 6.12 헤더로 빌드되는 형태입니다.

```c
static int mychip_probe(struct platform_device *pdev)
{
	struct mychip_data *priv;

	priv = devm_kzalloc(&pdev->dev, sizeof(*priv), GFP_KERNEL);
	if (!priv)
		return -ENOMEM;

	priv->base = devm_platform_ioremap_resource(pdev, 0);
	if (IS_ERR(priv->base))
		return PTR_ERR(priv->base);

	priv->irq = platform_get_irq(pdev, 0);
	if (priv->irq < 0)
		return priv->irq;

	priv->clk = devm_clk_get_enabled(&pdev->dev, NULL);
	if (IS_ERR(priv->clk))
		return dev_err_probe(&pdev->dev, PTR_ERR(priv->clk), "no clock\n");

	platform_set_drvdata(pdev, priv);
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
	.probe = mychip_probe,
};
module_platform_driver(mychip_driver);
```

`remove` 콜백이 없습니다. `devm_clk_get_enabled()`가 클록을 켠 채로 돌려주고 장치가 떨어질 때 자동으로 끄므로, 예전 골격처럼 `remove`에서 `clk_disable_unprepare()`를 부를 일이 없어졌습니다. 예전 골격의 `static int mychip_remove(...)`을 그대로 6.12에 넣으면 컴파일이 실패합니다. 6.12의 `struct platform_driver`에서 `remove`는 `void (*remove)(struct platform_device *);`이기 때문입니다(`include/linux/platform_device.h:245`). Debian 13 guest에서 커널 헤더로 두 판을 빌드한 결과입니다.

```text
/root/mychip/mychip_old.c:55:19: error: initialization of ‘void (*)(struct platform_device *)’ from incompatible pointer type ‘int (*)(struct platform_device *)’ [-Wincompatible-pointer-types]
   55 |         .remove = mychip_remove,
      |                   ^~~~~~~~~~~~~
```

새 판은 빌드되고 적재됩니다. `MODULE_DEVICE_TABLE`이 만든 alias가 udev의 자동 적재 근거가 됩니다.

```text
$ insmod mychip.ko
$ ls /sys/bus/platform/drivers/mychip/
bind
module
uevent
unbind
$ modinfo mychip.ko | grep alias
alias:          of:N*T*Cmyvendor,mychip-v1C*
alias:          of:N*T*Cmyvendor,mychip-v1
```

`devm_*` 함수는 디바이스 lifetime에 자원을 묶어 줍니다. probe 실패나 unbind 시 자동으로 해제됩니다.

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
  - Sang-Deok Yoon (contact via the site's Contact page)

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

validation(Ch 3의 `writing-schema.rst` 설명대로 스키마와 DTS를 각각 검사합니다. 이 글은 dtschema를 설치하지 않아 실행하지 않았습니다):

```bash
make dt_binding_check DT_SCHEMA_FILES=myvendor,mychip.yaml
make dtbs_check DT_SCHEMA_FILES=myvendor,mychip.yaml
```

`myvendor`라는 prefix는 `Documentation/devicetree/bindings/vendor-prefixes.yaml`에 등록되어 있지 않으므로, upstream에 보낼 때는 vendor prefix 등록 패치가 함께 필요합니다.

## 커널 모듈 로드 순서

빌트인 드라이버는 link order대로 init합니다. 모듈은 `modprobe` 또는 udev에 의해 부팅 후 로드됩니다.

순서 의존성을 명시적으로 표현하는 방법:

```c
/* 이 드라이버가 다른 subsystem을 *먼저* 필요로 함 */
module_init(mychip_init);              /* 일반 */
late_initcall(mychip_late_init);       /* 늦게 */
subsys_initcall(myframework_init);     /* subsystem 단계 */
```

DT의 phandle 참조(`clocks = <&clks 23>`)로 생긴 의존성은 deferred probe가 해결합니다. 의존 장치가 아직 준비되지 않으면 `devm_clk_get_enabled()` 같은 함수가 `-EPROBE_DEFER`를 돌려주고(`include/linux/errno.h:19`, `EPROBE_DEFER 517`), driver core가 나중에 probe를 다시 시도합니다. 위 골격의 `dev_err_probe()`는 이 경우 에러 대신 deferred 사유를 기록합니다.

아직 probe를 기다리는 장치 목록은 debugfs의 `devices_deferred`(`drivers/base/dd.c:346`)에 나옵니다. QEMU guest에서는 비어 있었습니다.

## 흔한 실수

- **binding 문서 확인 없이 DT 노드 작성**: 속성 이름·단위·예제가 *정답*입니다. 무시하면 probe 실패.
- **`status = "disabled"` 노드를 enable 안 함**: 기본 DT에 `status = "disabled"`로 적힌 노드는 보드 DTS에서 `&node { status = "okay"; }`로 켜야 합니다.
- **regulator/clock 누락**: 부트로더가 켜 둔 전원과 클록 덕분에 처음에는 동작하다가, 커널이 아무도 쓰지 않는 클록(`clk_disable_unused()`, `drivers/clk/clk.c:1531,1570`)과 regulator(`regulator_late_cleanup()`, `drivers/regulator/core.c:6326`)를 끄는 시점에 멈춥니다. `vcc-supply`, `clocks`를 명시합니다.
- **pinctrl 충돌**: 같은 pad를 두 디바이스가 요청하면 두 번째가 거절되고 dmesg에 `pin ... already requested by ...; cannot claim for ...`가 남습니다.
- **예전 드라이버 골격 복사**: 6.12의 `platform_driver.remove`는 `void`를 돌려줍니다. `int`를 돌려주는 예전 코드는 컴파일이 실패합니다.
- **out-of-tree 드라이버 남발**: 모든 vendor 수정사항을 out-of-tree로 두면 kernel 업그레이드마다 rebase 지옥. 가능한 한 upstream 또는 in-tree로.

## 정리

- 새 chip 통합의 첫걸음은 *이미 있는 드라이버 찾기*입니다. 24c256은 `at24.c:242,274`, ADS1015는 `ti-ads1015.c`와 `ti,ads1015.yaml`이 있습니다.
- 드라이버가 있으면 binding대로 쓴 DT 노드가 보드 작업의 전부입니다.
- `Documentation/devicetree/bindings/`의 YAML 문서가 *정답*이며, 새 노드를 쓰기 전에 반드시 읽습니다.
- pinctrl, regulator, clock binding은 이 글의 모든 예(EEPROM, PMIC, SPI flash, MMC)가 함께 참조하는 공통 기반입니다.
- 새 드라이버를 짤 때는 platform_driver, of_match, devm_* 자원 관리, EPROBE_DEFER를 익혀 둡니다. 6.12에서는 `remove`가 `void`입니다.
- binding 문서는 `make dt_binding_check`로 schema validation합니다.
- 빌트인 vs 모듈 결정은 [Ch 8](/blog/embedded/bsp/chapter08-kernel-config)의 기준을 따릅니다.
- out-of-tree 드라이버는 upstream 머지 전 임시 수단으로만 씁니다.

## 다음 편 예고

[Ch 13: Power Management](/blog/embedded/bsp/chapter13-power-management)에서는 suspend/resume, runtime PM, regulator framework, cpuidle/cpufreq를 살펴봅니다.

## 관련 항목

- [Ch 7: Device Tree 작성](/blog/embedded/bsp/chapter07-tfa-trustzone)
- [Ch 8: Linux 커널 설정](/blog/embedded/bsp/chapter08-kernel-config)
- [Ch 13: Power Management](/blog/embedded/bsp/chapter13-power-management)
- [Ch 14: Thermal과 watchdog](/blog/embedded/bsp/chapter14-thermal-watchdog)
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/00-preface) — driver 패턴
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/00-preface) — interrupt 처리 비교
