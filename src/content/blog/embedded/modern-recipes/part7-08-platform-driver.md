---
title: "Platform 드라이버 작성 — of_match·devm 해제 순서·probe 실패 판정 (Linux v6.12)"
slug: "embedded/modern-recipes/part7-08-platform-driver"
date: 2026-04-16T09:07:00
description: "DT로 기술된 SoC 장치에 platform driver를 처음 붙이는 개발자를 위해 Linux v6.12 소스 기준으로 of_match_table과 variant data, devm 자원의 해제 순서와 remove 시점, probe defer, 로드 뒤 sysfs·dmesg·devices_deferred로 probe 결과를 가르는 방법을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 82
tags: [recipes, linux, platform-driver]
topics: ["embedded"]
lastVerified: 2026-10-11
---

## 한 줄 요약

> **"DT 노드의 compatible이 driver의 `of_match_table`과 맞으면 probe가 불리고, probe가 devm으로 받은 자원은 detach 때 remove 뒤에 등록 역순으로 풀립니다."**

## 어떤 상황에서 쓰나

SoC 내장 UART, I2C 컨트롤러, PWM, 자체 IP처럼 bus가 스스로 enumeration하지 않는 장치에 driver를 붙일 때입니다. platform device는 DT 말고도 ACPI나 board 코드 등록으로 생길 수 있지만, 이 글은 DT 노드로 기술된 장치만 다룹니다.

DT 노드 문법(reg·interrupts·phandle)은 [7-03: Device Tree 실전](/blog/embedded/modern-recipes/part7-03-device-tree-basics), 모듈 빌드(KBuild Makefile, `-C`·`M=`, cross compile)는 [7-06: 커널 모듈 기초](/blog/embedded/modern-recipes/part7-06-kernel-module)를 전제로 합니다. 이 글의 코드와 커널 동작 설명은 Linux v6.12 태그 소스 기준입니다.

## match와 등록

device와 driver의 match는 `driver_override`, OF(DT) compatible, ACPI, `id_table`, driver 이름 순으로 시도합니다(`platform_match`, [drivers/base/platform.c, v6.12](https://github.com/torvalds/linux/blob/v6.12/drivers/base/platform.c)). DT 장치는 두 번째 단계에서 `of_match_table`의 compatible 문자열로 맞춰집니다.

`module_platform_driver`는 `platform_driver_register`·`platform_driver_unregister`를 부르는 `module_init`·`module_exit`을 한 줄로 만듭니다. v6.12의 `struct platform_driver`에서 `.remove`는 `void (*)(struct platform_device *)`입니다([platform_device.h, v6.12](https://github.com/torvalds/linux/blob/v6.12/include/linux/platform_device.h)).

## 코드 / 실제 사용 예

### DT 노드와 driver 한 파일

```dts
foo@40000000 {
    compatible = "vendor,foo-v1";
    reg        = <0x40000000 0x1000>;
    interrupts = <GIC_SPI 42 IRQ_TYPE_LEVEL_HIGH>;
    clocks     = <&clkc CLK_FOO>;
    resets     = <&rstc RST_FOO>;
    vdd-supply = <&reg_foo>;
    vendor,mode = "fast";
};
```

`foo`는 가상의 IP입니다. `CLK_FOO`·`RST_FOO`는 보드 DTS가 include하는 SoC의 clock·reset binding 헤더에서 오는 번호이고, 아래의 `FOO_IRQ_EN`·`FOO_IRQ_STAT`은 이 IP의 가상 레지스터 오프셋이라 실제 IP의 레퍼런스 매뉴얼 값으로 바꿉니다. 아래 세 블록을 순서대로 이으면 한 파일입니다.

```c
#include <linux/clk.h>
#include <linux/interrupt.h>
#include <linux/io.h>
#include <linux/mod_devicetable.h>
#include <linux/module.h>
#include <linux/of.h>
#include <linux/platform_device.h>
#include <linux/regulator/consumer.h>
#include <linux/reset.h>

#define FOO_IRQ_EN      0x10
#define FOO_IRQ_STAT    0x14

struct my_data {
    void __iomem *regs;
    struct clk *clk;
    struct reset_control *rst;
    int irq;
    u32 rate;
    const char *mode;
};

static irqreturn_t my_isr(int irq, void *data)
{
    struct my_data *d = data;
    u32 stat = readl(d->regs + FOO_IRQ_STAT);

    if (!stat)
        return IRQ_NONE;
    writel(stat, d->regs + FOO_IRQ_STAT);
    return IRQ_HANDLED;
}

static void my_reset_assert(void *data)
{
    reset_control_assert(data);
}
```

```c
static int my_probe(struct platform_device *pdev)
{
    struct device *dev = &pdev->dev;
    struct my_data *d;
    int ret;

    d = devm_kzalloc(dev, sizeof(*d), GFP_KERNEL);
    if (!d)
        return -ENOMEM;

    d->rate = 48000;
    ret = of_property_read_u32(dev->of_node, "vendor,sample-rate", &d->rate);
    if (ret && ret != -EINVAL)
        return dev_err_probe(dev, ret, "bad vendor,sample-rate\n");

    ret = of_property_read_string(dev->of_node, "vendor,mode", &d->mode);
    if (ret)
        return dev_err_probe(dev, ret, "vendor,mode missing or invalid\n");

    d->regs = devm_platform_ioremap_resource(pdev, 0);
    if (IS_ERR(d->regs))
        return dev_err_probe(dev, PTR_ERR(d->regs), "regs\n");

    ret = devm_regulator_get_enable(dev, "vdd");
    if (ret)
        return dev_err_probe(dev, ret, "vdd\n");

    d->clk = devm_clk_get_enabled(dev, NULL);
    if (IS_ERR(d->clk))
        return dev_err_probe(dev, PTR_ERR(d->clk), "clk\n");

    d->rst = devm_reset_control_get_optional_exclusive(dev, NULL);
    if (IS_ERR(d->rst))
        return dev_err_probe(dev, PTR_ERR(d->rst), "reset\n");

    ret = reset_control_deassert(d->rst);
    if (ret)
        return dev_err_probe(dev, ret, "reset deassert\n");
    ret = devm_add_action_or_reset(dev, my_reset_assert, d->rst);
    if (ret)
        return ret;

    d->irq = platform_get_irq(pdev, 0);
    if (d->irq < 0)
        return d->irq;

    ret = devm_request_irq(dev, d->irq, my_isr, 0, dev_name(dev), d);
    if (ret)
        return dev_err_probe(dev, ret, "irq\n");

    platform_set_drvdata(pdev, d);
    writel(1, d->regs + FOO_IRQ_EN);
    return 0;
}
```

```c
static void my_remove(struct platform_device *pdev)
{
    struct my_data *d = platform_get_drvdata(pdev);

    writel(0, d->regs + FOO_IRQ_EN);
}

static const struct of_device_id my_of_match[] = {
    { .compatible = "vendor,foo-v1" },
    { }
};
MODULE_DEVICE_TABLE(of, my_of_match);

static struct platform_driver my_driver = {
    .probe  = my_probe,
    .remove = my_remove,
    .driver = {
        .name           = "foo",
        .of_match_table = my_of_match,
    },
};
module_platform_driver(my_driver);

MODULE_DESCRIPTION("foo platform driver example");
MODULE_LICENSE("GPL");
```

실패 경로는 받은 에러 코드를 바꾸지 않고 `dev_err_probe`로 돌려줍니다. `dev_err_probe`는 `-EPROBE_DEFER`면 이유를 debugfs `devices_deferred`에 남기고 `dev_dbg`만 찍으며, `-ENOMEM`이면 아무것도 찍지 않고, 나머지는 `dev_err`로 찍습니다([drivers/base/core.c, v6.12](https://github.com/torvalds/linux/blob/v6.12/drivers/base/core.c)). `platform_get_irq`는 실패하면 스스로 `dev_err_probe`로 "IRQ index 0 not found"를 찍으므로 값만 돌려줍니다([drivers/base/platform.c](https://github.com/torvalds/linux/blob/v6.12/drivers/base/platform.c)). 이 로그가 '로드 후 확인'에서 실패 원인을 가르는 단서가 됩니다.

### devres 해제 순서

devres는 driver detach 때, 그리고 probe가 실패했을 때 등록의 역순으로 해제됩니다(`release_nodes`의 역순 순회, [drivers/base/devres.c, v6.12](https://github.com/torvalds/linux/blob/v6.12/drivers/base/devres.c)). 위 probe라면 IRQ 해제 → reset assert → `reset_control_put` → clock disable·unprepare·put → regulator disable·put → unmap → 메모리 해제 순입니다. 그래서 IRQ는 clock과 reset이 준비된 *뒤에* 요청해야 해제 때 가장 먼저 풀립니다.

각 helper가 devm으로 돌려놓는 것은 다음과 같습니다(v6.12 헤더 주석 기준).

| 호출 | detach 때 자동으로 하는 일 | 출처 |
|------|--------------------------|------|
| `devm_clk_get_enabled` | disable, unprepare, put | [clk.h](https://github.com/torvalds/linux/blob/v6.12/include/linux/clk.h) |
| `devm_regulator_get_enable` | `regulator_disable`, `regulator_put` | [regulator/devres.c](https://github.com/torvalds/linux/blob/v6.12/drivers/regulator/devres.c) |
| `devm_reset_control_get_optional_exclusive` | `reset_control_put`만 — assert는 하지 않음 | [reset.h](https://github.com/torvalds/linux/blob/v6.12/include/linux/reset.h) |

reset은 put만 자동이라 assert를 `devm_add_action_or_reset`으로 따로 등록했습니다. DT에 `resets`가 없으면 optional getter는 NULL을 돌려주고, `reset_control_deassert(NULL)`·`reset_control_assert(NULL)`은 0을 돌려주는 no-op입니다([reset.h](https://github.com/torvalds/linux/blob/v6.12/include/linux/reset.h), [drivers/reset/core.c](https://github.com/torvalds/linux/blob/v6.12/drivers/reset/core.c)). `devm_regulator_get_enable(dev, "vdd")`는 DT의 `vdd-supply`를 찾습니다([of_regulator.c](https://github.com/torvalds/linux/blob/v6.12/drivers/regulator/of_regulator.c)).

pinctrl은 `CONFIG_PINCTRL`이 켜져 있으면 probe에서 따로 고르지 않아도 됩니다. driver core가 probe 직전에 `pinctrl_bind_pins`를 부릅니다. DT에 `default` 상태가 있을 때만 동작해, `init` 상태가 있으면 그것을, 없으면 `default` 상태를 선택합니다. `default` 상태가 없으면 아무 상태도 고르지 않습니다. DT가 가리키는 pin controller가 아직 등록되지 않았으면 `pinctrl_bind_pins`가 `-EPROBE_DEFER`를 돌려주고 driver의 probe는 불리지 않습니다(`dt_to_map_one_config`, [drivers/pinctrl/devicetree.c](https://github.com/torvalds/linux/blob/v6.12/drivers/pinctrl/devicetree.c), [drivers/base/dd.c](https://github.com/torvalds/linux/blob/v6.12/drivers/base/dd.c)의 `really_probe`, [drivers/base/pinctrl.c](https://github.com/torvalds/linux/blob/v6.12/drivers/base/pinctrl.c), [Makefile](https://github.com/torvalds/linux/blob/v6.12/drivers/base/Makefile)).

### remove가 필요한 경우

driver core는 detach 때 driver의 remove를 먼저 부르고 그다음 `devres_release_all`을 부릅니다(`device_remove` → `device_unbind_cleanup`, [drivers/base/dd.c](https://github.com/torvalds/linux/blob/v6.12/drivers/base/dd.c)). 그래서 위 `my_remove` 안에서는 MMIO·clock·IRQ가 아직 살아 있고, probe 끝에서 켠 IP의 인터럽트 출력을 끄는 것처럼 devm이 모르는 하드웨어 정리를 여기서 합니다. 모든 자원을 devm으로 받고 하드웨어 정리가 필요 없으면 `.remove`를 비워 둡니다.

### compatible string 여러 개와 data

같은 IP의 SoC 변형을 한 driver로 묶을 때는 `.data`에 variant별 설정을 넣습니다. 위 파일의 `my_of_match`를 아래 표로 바꾸고, probe에서 `FOO_IRQ_EN`에 쓰는 값을 cfg에서 가져옵니다.

```c
struct foo_cfg {
    u32 irq_mask;
};

static const struct foo_cfg foo_v1_cfg = { .irq_mask = 0x1 };
static const struct foo_cfg foo_v2_cfg = { .irq_mask = 0x3 };

static const struct of_device_id my_of_match[] = {
    { .compatible = "vendor,foo-v1", .data = &foo_v1_cfg },
    { .compatible = "vendor,foo-v2", .data = &foo_v2_cfg },
    { }
};
MODULE_DEVICE_TABLE(of, my_of_match);
```

```c
    const struct foo_cfg *cfg = of_device_get_match_data(dev);

    if (!cfg)
        return dev_err_probe(dev, -EINVAL, "no match data\n");
    /* ... */
    writel(cfg->irq_mask, d->regs + FOO_IRQ_EN);
```

`of_device_get_match_data`는 match된 항목이 없거나 항목에 `.data`가 없으면 NULL을 돌려주므로([drivers/of/device.c, v6.12](https://github.com/torvalds/linux/blob/v6.12/drivers/of/device.c)) 표의 모든 항목에 `.data`를 채웁니다.

### DT property 읽기

`of_property_read_u32`는 property가 없으면 `-EINVAL`, 값이 4바이트보다 짧으면 `-EOVERFLOW`를 돌려줍니다. DTB에서 펼친 트리는 값 없이 이름만 있는 property도 value 포인터를 채우므로(`populate_properties`, [drivers/of/fdt.c](https://github.com/torvalds/linux/blob/v6.12/drivers/of/fdt.c)) 빈 property는 길이 0으로 `-EOVERFLOW`가 됩니다. `of_property_read_string`은 property가 없으면 `-EINVAL`, 길이가 0이면 `-ENODATA`, 문자열이 property 길이 안에서 NUL로 끝나지 않으면 `-EILSEQ`를 돌려줍니다. 둘 다 성공했을 때만 출력 변수를 바꿉니다([of.h](https://github.com/torvalds/linux/blob/v6.12/include/linux/of.h), [drivers/of/property.c](https://github.com/torvalds/linux/blob/v6.12/drivers/of/property.c)).

그래서 위 probe는 선택 property `vendor,sample-rate`를 기본값으로 초기화한 뒤 `-EINVAL`(없음)일 때만 기본값을 쓰고, 있는데 형식이 틀린 경우는 probe를 실패시킵니다. 필수 property `vendor,mode`는 어떤 에러든 probe를 실패시킵니다.

### 로드 후 확인

target에서 driver core(`drivers/base/dd.c`)의 `dev_dbg`를 dynamic debug로 켠 뒤 모듈을 로드합니다. 첫 줄은 `CONFIG_DYNAMIC_DEBUG`가 켜진 커널이어야 합니다. `CONFIG_DYNAMIC_DEBUG_CORE`만 켜져 있으면 built-in인 dd.c의 `dev_dbg`는 dynamic debug 대상이 아닙니다([dev_printk.h](https://github.com/torvalds/linux/blob/v6.12/include/linux/dev_printk.h)의 `dev_dbg` 정의, 명령 문법은 [dynamic-debug-howto.rst](https://github.com/torvalds/linux/blob/v6.12/Documentation/admin-guide/dynamic-debug-howto.rst)). 마지막 줄은 `CONFIG_DEBUG_FS`가 켜져 있고 debugfs가 `/sys/kernel/debug`에 마운트되어 있어야 합니다([debugfs.rst](https://github.com/torvalds/linux/blob/v6.12/Documentation/filesystems/debugfs.rst)).

```bash
echo 'file drivers/base/dd.c +p' > /proc/dynamic_debug/control
insmod foo.ko
ls -l /sys/bus/platform/drivers/foo/
dmesg | tail -n 20
cat /sys/kernel/debug/devices_deferred
```

dd.c는 compatible이 맞아 driver의 probe까지 가면 `bus: 'platform': really_probe: probing driver foo with device`를 먼저 찍고, driver의 probe가 돌려준 값에 따라 아래 줄을 찍습니다(`really_probe`·`call_driver_probe`·`driver_deferred_probe_add`, [drivers/base/dd.c, v6.12](https://github.com/torvalds/linux/blob/v6.12/drivers/base/dd.c)).

| probe 결과 | `/sys/bus/platform/drivers/foo/` | dd.c의 dmesg | `devices_deferred` |
|------|------|------|------|
| 성공 | device 이름의 symlink가 생김 | `probing driver foo with device`, `bound device to driver foo` | 없음 |
| `-ENODEV`·`-ENXIO` 반환 | symlink 없음 | `probing driver foo with device`, `probe with driver foo rejects match <errno>` | 없음 |
| 그 밖의 에러 반환 | symlink 없음 | `probing driver foo with device`, `probe with driver foo failed with error <errno>` | 없음 |
| `-EPROBE_DEFER` 반환 | symlink 없음 | `probing driver foo with device`, `Driver foo requests probe deferral` | device 이름과 driver가 `dev_err_probe`에 넘긴 이유 |
| compatible 불일치 | symlink 없음 | 위 dd.c 줄이 하나도 없음(probe 단계에 들어가지 않음) | 없음 |

다섯 행은 dmesg 열에서 모두 갈립니다. 특히 `-ENODEV`·`-ENXIO` 반환과 compatible 불일치는 symlink와 `devices_deferred`가 같지만, 앞의 것만 `probing driver foo with device` 줄을 남깁니다. `failed with error` 줄은 `dev_err`라 dynamic debug를 켜지 않아도 찍히고, 나머지 dd.c 줄은 `dev_dbg`라 첫 줄 없이는 찍히지 않습니다.

부팅 중에는 late_initcall이 `deferred_probe_timeout`(`CONFIG_MODULES`에서 기본 10초) 뒤로 작업 하나를 예약합니다. 그 작업이 아직 대기 중일 때 driver가 등록되면(`driver_register` → `deferred_probe_extend_timeout`) 작업이 취소되고 그 시점에서 같은 시간 뒤로 다시 예약됩니다. 그래서 작업은 late_initcall에서 10초 뒤가 아니라, 대기 중에 등록된 마지막 driver(모듈로 넣은 driver 포함)에서 `deferred_probe_timeout`이 지난 뒤에 돕니다. 작업이 돌면 그때까지 pending 목록에 남은 device마다 `deferred probe pending: <이유>`가 `dev_warn`으로 한 번 찍히고, 이유가 기록되지 않은 device는 `(reason unknown)`으로 찍힙니다(`deferred_probe_timeout_work_func`, [drivers/base/dd.c](https://github.com/torvalds/linux/blob/v6.12/drivers/base/dd.c), [drivers/base/driver.c](https://github.com/torvalds/linux/blob/v6.12/drivers/base/driver.c)).

## 자주 보는 함정

> compatible string 오타

```dts
compatible = "vendor,fooo-v1";    /* one extra 'o' vs "vendor,foo-v1" in the driver table */
```

probe 단계에 들어가지 않으니 위 절차에서 `probing driver foo with device` 줄도 없습니다. 이 경우 DT를 `dtc -I dtb -O dts board.dtb`로 풀어 문자열을 driver의 `of_match_table`과 비교합니다.

> probe defer를 다른 에러로 덮어씀

```c
d->clk = devm_clk_get_enabled(dev, NULL);
if (IS_ERR(d->clk))
    return -EIO;    /* -EPROBE_DEFER becomes -EIO: no retry */
```

`-EPROBE_DEFER`를 그대로 돌려주면 device가 pending 목록에 들어가고, 다른 driver의 probe가 성공할 때마다 workqueue가 다시 시도합니다(dd.c 머리 주석 "Deferred Probe infrastructure", [v6.12](https://github.com/torvalds/linux/blob/v6.12/drivers/base/dd.c)). pending 목록에 넣는 것은 `-EPROBE_DEFER`를 받았을 때뿐이라(`driver_probe_device`) 다른 에러로 바꾸면 자동 재시도 대상에서 빠집니다.

`-EPROBE_DEFER`는 driver의 probe 안에서만 생기지 않습니다. `really_probe`는 probe를 부르기 전에 device link로 이어진 supplier가 준비되지 않았으면 `device_links_check_suppliers`에서, pin controller가 아직 없으면 `pinctrl_bind_pins`에서 defer를 돌려줍니다. platform bus의 `platform_probe`도 driver의 probe 전에 `of_clk_set_defaults`(DT의 `assigned-clocks`·`assigned-clock-parents`가 가리키는 clock provider가 아직 없을 때)와 `dev_pm_domain_attach`(power domain provider가 없을 때)에서 defer를 돌려줍니다. 다만 power domain 경로는 `driver_deferred_probe_check_state`를 거치므로, initcall이 끝나고 deferred probe timeout이 지난 뒤에는 defer 대신 `-ETIMEDOUT`을 돌려주고 "deferred probe timeout, ignoring dependency" 경고를 남깁니다. 그래서 timeout이 지난 뒤 `insmod`로 올린 driver는 power domain provider가 없으면 기다리지 않고 `-110`으로 probe에 실패합니다(`driver_deferred_probe_check_state`, [drivers/base/dd.c](https://github.com/torvalds/linux/blob/v6.12/drivers/base/dd.c), [drivers/base/platform.c](https://github.com/torvalds/linux/blob/v6.12/drivers/base/platform.c), [drivers/clk/clk-conf.c](https://github.com/torvalds/linux/blob/v6.12/drivers/clk/clk-conf.c), [drivers/pmdomain/core.c](https://github.com/torvalds/linux/blob/v6.12/drivers/pmdomain/core.c)의 `__genpd_dev_pm_attach`). 이 네 경우 가운데 `devices_deferred`에 이유를 남기는 것은 `dev_err_probe`를 부르는 `device_links_check_suppliers`뿐입니다([drivers/base/core.c](https://github.com/torvalds/linux/blob/v6.12/drivers/base/core.c)). 그래서 `devices_deferred`에 device 이름만 있고 이유가 비어 있으면 driver의 probe가 아니라 이 앞 단계를 먼저 봅니다. 위 코드처럼 덮어쓰는 실수는 probe 안에서 clock·regulator·reset getter가 provider를 찾지 못해 `-EPROBE_DEFER`를 돌려줄 때 생깁니다.

> clock은 `devm_clk_get` + `clk_prepare_enable`로 켜서 remove에서 끄고, IRQ는 devm에 맡김

```c
static void my_remove(struct platform_device *pdev)
{
    struct my_data *d = platform_get_drvdata(pdev);

    clk_disable_unprepare(d->clk);    /* devm IRQ is still registered here */
}
```

remove가 devres 해제보다 먼저 불리므로(위 'remove가 필요한 경우' 참고) clock이 꺼진 뒤에도 handler가 등록되어 있습니다. 그 사이에 인터럽트가 들어오면 handler가 clock 없는 IP의 레지스터를 읽게 됩니다. clock을 `devm_clk_get_enabled`로 받아 IRQ보다 먼저 등록하면 해제 순서가 IRQ → clock으로 맞춰집니다.

## 정리

- 자원은 `devm_*`로 받고, 에러 코드는 바꾸지 않고 `dev_err_probe`로 돌려줍니다. `-EPROBE_DEFER`가 살아야 재시도되고, 나머지 에러는 로그가 남습니다.
- devres는 등록 역순으로 풀리므로 IRQ는 clock·reset이 준비된 뒤 마지막에 요청합니다.
- remove는 devres 해제 전에 불립니다. devm이 모르는 하드웨어 정리만 여기에 둡니다.
- 로드 뒤 성공 여부는 `/sys/bus/platform/drivers/<name>/`의 symlink로, defer는 `devices_deferred`로 판정합니다.

Runtime PM(`pm_runtime_enable`과 get/put 경로)은 [BSP Power Management](/blog/embedded/bsp/chapter13-power-management)의 'Runtime PM — 디바이스별 dynamic suspend' 절에서 다룹니다.

다음 편은 **mmap 4가지 모드**입니다. 이 글의 driver는 레지스터를 커널 안에서만 매핑했는데, 다음 편은 user space 쪽 mmap 모드를 다루고 'UIO·V4L2에서 DMA 영역 mmap' 절에서 장치 영역을 user space에 매핑하는 경우를 봅니다.

## 관련 항목

- [7-03: Device Tree 실전](/blog/embedded/modern-recipes/part7-03-device-tree-basics)
- [7-04: Device Tree Overlay 적용](/blog/embedded/modern-recipes/part7-04-device-tree-overlay)
- [7-06: 커널 모듈 기초](/blog/embedded/modern-recipes/part7-06-kernel-module)
- [7-07: 캐릭터 드라이버 작성](/blog/embedded/modern-recipes/part7-07-char-driver)
- [7-09: mmap 4가지 모드](/blog/embedded/modern-recipes/part7-09-mmap)
- [7-12: sysfs·configfs 활용](/blog/embedded/modern-recipes/part7-12-sysfs)
