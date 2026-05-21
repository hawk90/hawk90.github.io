---
title: "7-08: Platform 드라이버"
date: 2026-05-15T10:00:00
description: "platform_driver_register, of_match_table, probe/remove, devm_* 자원 관리, IRQ와 MMIO 획득까지 platform driver의 표준 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 82
tags: [recipes, linux, platform-driver]
---

## 한 줄 요약

> **"Platform driver = DT 노드가 *match*되면 probe가 호출되는 driver입니다."** PCIe도 USB도 아닌 SoC 내장 IP는 거의 모두 platform driver입니다.

## 어떤 상황에서 쓰나

SoC의 내장 UART, I2C 컨트롤러, PWM, 자체 IP를 다룰 때 platform driver를 만듭니다. PCI 카드나 USB device처럼 자체적인 enumeration이 있는 bus가 아닌, *DT에 적힌 노드*로만 존재가 알려지는 device가 대상입니다.

또 한 가지 흔한 작업은 vendor IP의 BSP를 다듬는 일입니다. 이미 작성된 platform driver를 수정해 새 SoC 변형에 맞게 register layout을 바꾸거나 새 compatible string을 추가합니다.

## 핵심 개념

| 요소 | 역할 |
|------|------|
| `platform_driver` | driver 측 — probe, remove, `of_match_table` |
| `platform_device` | device 측 — DT에서 자동 생성 |
| `of_match_table` | DT compatible 문자열 매핑 |
| `probe` | device 발견 시 자원 획득 + 초기화 |
| `remove` | cleanup |
| `devm_*` | device-managed API — auto cleanup |

전형적인 driver 한 장의 골격입니다.

```c
static const struct of_device_id my_of_match[] = {
    { .compatible = "vendor,foo-v1" },
    { .compatible = "vendor,foo-v2", .data = (void *)1 },
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
```

`module_platform_driver`가 `module_init`과 `module_exit`을 한 줄로 해결합니다.

## 코드 / 실제 사용 예

### DT 노드와 driver

```dts
// DT
foo@40000000 {
    compatible = "vendor,foo-v1";
    reg        = <0x40000000 0x1000>;
    interrupts = <GIC_SPI 42 IRQ_TYPE_LEVEL_HIGH>;
    clocks     = <&clkc CLK_FOO>;
};
```

```c
// driver probe
static int my_probe(struct platform_device *pdev) {
    struct device *dev = &pdev->dev;
    struct my_data *d;

    d = devm_kzalloc(dev, sizeof(*d), GFP_KERNEL);
    if (!d) return -ENOMEM;

    d->regs = devm_platform_ioremap_resource(pdev, 0);
    if (IS_ERR(d->regs)) return PTR_ERR(d->regs);

    d->irq = platform_get_irq(pdev, 0);
    if (d->irq < 0) return d->irq;

    d->clk = devm_clk_get(dev, NULL);
    if (IS_ERR(d->clk)) return PTR_ERR(d->clk);

    clk_prepare_enable(d->clk);

    if (devm_request_irq(dev, d->irq, my_isr, 0, dev_name(dev), d))
        return -EIO;

    platform_set_drvdata(pdev, d);
    return 0;
}

static int my_remove(struct platform_device *pdev) {
    struct my_data *d = platform_get_drvdata(pdev);
    clk_disable_unprepare(d->clk);
    return 0;
    /* devm_* 자원은 자동 해제 */
}
```

`devm_*` API는 driver detach 시 자동으로 자원을 해제합니다. error path와 remove의 cleanup 코드를 거의 모두 제거할 수 있습니다.

### compatible string 여러 개와 data

```c
static const struct of_device_id my_of_match[] = {
    { .compatible = "vendor,foo-v1", .data = &foo_v1_cfg },
    { .compatible = "vendor,foo-v2", .data = &foo_v2_cfg },
    { }
};

static int my_probe(struct platform_device *pdev) {
    const struct foo_cfg *cfg = of_device_get_match_data(&pdev->dev);
    if (!cfg) return -EINVAL;

    write_init_regs(cfg->init_seq, cfg->init_len);
    /* ... */
}
```

여러 SoC 변형에 맞는 driver를 한 binary로 묶을 때 `.data`에 variant별 cfg를 넣어 둡니다. probe에서 `of_device_get_match_data`로 받습니다.

### DT property 읽기

```c
u32 freq, channels;
const char *mode;

of_property_read_u32(dev->of_node, "sample-rate", &freq);
of_property_read_u32(dev->of_node, "num-channels", &channels);
of_property_read_string(dev->of_node, "mode", &mode);

if (of_property_read_bool(dev->of_node, "enable-foo"))
    enable_foo();
```

DT property를 type별 helper로 읽습니다. 누락 시 기본값을 둘지 error로 처리할지는 driver마다 다릅니다.

### Reset, regulator, pinctrl

```c
d->reset = devm_reset_control_get_optional(dev, NULL);
if (!IS_ERR(d->reset))
    reset_control_assert(d->reset);

d->reg = devm_regulator_get(dev, "vdd");
if (!IS_ERR(d->reg))
    regulator_enable(d->reg);

d->pinctrl = devm_pinctrl_get_select_default(dev);
```

대부분의 IP는 reset → regulator → pinctrl → clock → IRQ 순서로 초기화합니다. `devm_*` 변종이 거의 모두 존재합니다.

### Power management

```c
static int my_runtime_suspend(struct device *dev) {
    struct my_data *d = dev_get_drvdata(dev);
    clk_disable_unprepare(d->clk);
    return 0;
}

static int my_runtime_resume(struct device *dev) {
    struct my_data *d = dev_get_drvdata(dev);
    return clk_prepare_enable(d->clk);
}

static const struct dev_pm_ops my_pm = {
    SET_RUNTIME_PM_OPS(my_runtime_suspend, my_runtime_resume, NULL)
};

static struct platform_driver my_driver = {
    ...
    .driver = {
        ...
        .pm = &my_pm,
    },
};
```

`pm_runtime_get_sync`와 `pm_runtime_put`을 driver 사용 경로에 끼우면 idle 시 자동으로 clock과 power를 끌 수 있습니다.

### probe defer

```c
static int my_probe(struct platform_device *pdev) {
    d->clk = devm_clk_get(dev, NULL);
    if (PTR_ERR(d->clk) == -EPROBE_DEFER)
        return -EPROBE_DEFER;
    if (IS_ERR(d->clk))
        return PTR_ERR(d->clk);
    /* ... */
}
```

다른 driver가 아직 등록 안 되어 자원을 못 받는 경우 `-EPROBE_DEFER`를 돌려주면 kernel이 나중에 다시 probe합니다. 부팅 순서 문제의 표준 해결책입니다.

### Module 빌드와 load

```bash
# KBuild Makefile에 obj-m += foo.o
make ARCH=arm64 CROSS_COMPILE=aarch64-linux-gnu- modules

# target에서
insmod foo.ko
dmesg | tail
ls /sys/bus/platform/drivers/foo/
```

DT match가 성공하면 dmesg에 probe 메시지가 찍히고 sysfs에 driver 항목이 생깁니다.

## 측정 / 성능 비교

| 연산 | 시간 |
|---|---|
| platform_driver_register | ~10 µs (DT scan) |
| probe (단순 IP) | ~1 ms (clock enable 포함) |
| probe (복잡한 IP, multi-reset) | ~10 ms |
| remove | ~수백 µs (devm cleanup 포함) |

probe가 부팅 latency에 직접 영향을 줍니다. 가능하면 async probe(`PROBE_PREFER_ASYNCHRONOUS`)를 켜 boot 시간을 줄입니다.

```text
RAM 사용량
platform driver                  ~수 KB (code + private data)
devm allocations                 device 해제 시 자동 free
```

## 자주 보는 함정

> compatible string 오타

```dts
compatible = "vendor,fooo";    /* 's' 누락 → driver match 실패 */
```

dmesg에 probe 메시지가 안 보이면 가장 먼저 의심합니다. DT를 `dtc -I dtb -O dts board.dtb`로 풀어 확인합니다.

> devm을 안 쓰고 cleanup 누락

```c
static int my_probe(...) {
    p = kmalloc(...);
    if (err) return -EIO;   /* p leak */
}
```

가능한 모든 자원을 `devm_*`로 받으면 누락이 사라집니다. 일부 자원은 devm이 없어 수동으로 free해야 하니 그 부분만 goto 패턴으로 처리합니다.

> probe defer를 error로 처리

```c
if (IS_ERR(d->clk))
    return -EIO;    /* -EPROBE_DEFER을 -EIO로 덮어씀 → 영구 실패 */
```

`-EPROBE_DEFER`는 정상 path입니다. 따로 처리해 그대로 돌려줍니다.

> Sleep을 ISR에서

```c
static irqreturn_t my_isr(int irq, void *d) {
    mutex_lock(&m);    /* ISR에서 sleep 함수 — BUG */
}
```

ISR top half는 sleep 불가능합니다. 무거운 일은 threaded IRQ나 workqueue로 넘깁니다.

> Concurrent open

```c
static int my_open(...) { d->ref++; }
```

여러 user가 동시에 device를 열 수 있습니다. refcount는 atomic이어야 하고, exclusive 모드면 `test_and_set_bit`을 씁니다.

## 정리

- Platform driver의 본질은 DT compatible match와 probe 호출입니다.
- `devm_*` API는 detach 시 자동 cleanup이라 error path를 거의 없앱니다.
- `of_device_get_match_data`로 SoC variant별 cfg를 한 binary로 묶습니다.
- 자원 획득 순서는 reset → regulator → pinctrl → clock → IRQ가 표준입니다.
- `-EPROBE_DEFER`는 부팅 순서 문제의 표준 해결책입니다.
- Runtime PM은 pm_runtime_get/put 두 호출만 끼우면 자동 절전이 활성화됩니다.

다음 편부터 7-09~7-13은 별도로 다루고, 본 시리즈에서는 **Buildroot 기초**로 넘어갑니다.

## 관련 항목

- [7-04: Device Tree Overlay](/blog/embedded/modern-recipes/part7-04-device-tree-overlay)
- [7-06: Kernel Module 기초](/blog/embedded/modern-recipes/part7-06-kernel-module)
- [7-07: 캐릭터 드라이버](/blog/embedded/modern-recipes/part7-07-char-driver)
- [4-05: sysfs](/blog/embedded/modern-recipes/part7-12-sysfs)
