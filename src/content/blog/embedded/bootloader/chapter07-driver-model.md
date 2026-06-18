---
title: "U-Boot Driver Model 내부 — uclass·driver·device 추상화 구조"
date: 2026-05-09T09:07:00
description: "U-Boot Driver Model — uclass·driver·udevice 구조와 DT 기반 driver binding."
series: "Bootloader Internals"
seriesOrder: 7
tags: [embedded, bootloader, u-boot, driver-model]
draft: false
---

## 한 줄 요약

> **"Driver Model은 *uclass(인터페이스)·driver(구현)·udevice(인스턴스)*의 삼각 구조입니다."** — DT의 `compatible` 프로퍼티가 driver와 device를 *자동 매칭*합니다. 보드 코드는 *DT만 잘 쓰면* 대부분의 init이 끝납니다.

2014년 이전의 U-Boot은 *각 driver가 고유 API*를 가졌습니다. MMC는 `mmc_*`, GPIO는 `gpio_*`, I2C는 `i2c_*`. 공통점이 없었고 *모든 driver init이 보드 코드의 work*였습니다. Linux의 device model을 본떠 *Driver Model(DM)*이 도입되었고, 지금은 *거의 모든 driver*가 DM 위에서 동작합니다.

## 왜 Driver Model인가

legacy 시절의 U-Boot 보드 코드는 *모든 device를 명시적으로* init했습니다.

```c
/* legacy 방식 (구식) */

int board_mmc_init(struct bd_info *bis)
{
    /* MMC controller 1번 init */
    init_clk_usdhc(0);
    fsl_esdhc_initialize(bis, &usdhc_cfg[0]);

    /* MMC controller 2번 init */
    init_clk_usdhc(1);
    fsl_esdhc_initialize(bis, &usdhc_cfg[1]);

    return 0;
}

int board_eth_init(struct bd_info *bis)
{
    /* ENET init */
    setup_fec();
    return cpu_eth_init(bis);
}

int board_i2c_init(void)
{
    /* I2C 1번 init */
    i2c_init(I2C_SPEED, 0);
    /* I2C 2번 init */
    i2c_init(I2C_SPEED, 0);
    return 0;
}
```

보드 추가 시 *모든 init 코드*를 *수동으로* 짜야 했습니다. 같은 SoC라도 *어떤 페리페럴*을 쓰는지에 따라 코드가 다 달랐습니다.

DM 도입 후에는 *DT에 device를 정의*하기만 하면 됩니다.

```text
/* DT */
&usdhc1 {
    pinctrl-names = "default";
    pinctrl-0 = <&pinctrl_usdhc1>;
    bus-width = <8>;
    status = "okay";
};
```

U-Boot이 *부트 시점에 DT를 스캔*해서 *해당 driver를 찾아 probe*합니다. 보드 코드는 *touch 안 합니다*.

## 삼각 구조 — uclass / driver / udevice

![U-Boot DM 삼각 구조 — uclass 인터페이스, driver 구현, udevice 인스턴스](/images/blog/bootloader/diagrams/chapter07-driver-model.svg)

### uclass

uclass는 *기능 카테고리*입니다. "MMC controller"라는 추상 인터페이스가 `UCLASS_MMC`입니다. uclass는 *operation 시그니처*를 정의합니다.

```c
/* include/dm/uclass-id.h */
enum uclass_id {
    UCLASS_INVALID = 0,
    UCLASS_ROOT,
    UCLASS_CLK,
    UCLASS_CPU,
    UCLASS_GPIO,
    UCLASS_I2C,
    UCLASS_MMC,
    UCLASS_PINCTRL,
    UCLASS_PMIC,
    UCLASS_REGULATOR,
    UCLASS_SERIAL,
    UCLASS_ETH,
    UCLASS_USB,
    UCLASS_BLK,
    UCLASS_RTC,
    UCLASS_SPI,
    ...
};
```

각 uclass는 *operation struct*를 가집니다. MMC의 경우:

```c
/* include/mmc.h */
struct dm_mmc_ops {
    int (*send_cmd)(struct udevice *dev, struct mmc_cmd *cmd,
                    struct mmc_data *data);
    int (*set_ios)(struct udevice *dev);
    int (*get_cd)(struct udevice *dev);
    int (*get_wp)(struct udevice *dev);
    ...
};
```

driver들이 *이 시그니처를 구현*합니다.

### driver

driver는 *특정 hardware의 구체 코드*입니다. `U_BOOT_DRIVER` 매크로로 정의합니다.

```c
/* drivers/mmc/fsl_esdhc_imx.c (간략화) */

static int fsl_esdhc_probe(struct udevice *dev)
{
    /* clock enable, pinmux 설정, etc */
    return 0;
}

static const struct dm_mmc_ops fsl_esdhc_ops = {
    .send_cmd = fsl_esdhc_send_cmd,
    .set_ios = fsl_esdhc_set_ios,
    .get_cd = fsl_esdhc_get_cd,
};

static const struct udevice_id fsl_esdhc_ids[] = {
    { .compatible = "fsl,imx8mp-usdhc" },
    { .compatible = "fsl,imx8mm-usdhc" },
    { .compatible = "fsl,imx7d-usdhc" },
    { /* sentinel */ }
};

U_BOOT_DRIVER(fsl_esdhc) = {
    .name           = "fsl-esdhc-mmc",
    .id             = UCLASS_MMC,
    .of_match       = fsl_esdhc_ids,
    .ops            = &fsl_esdhc_ops,
    .probe          = fsl_esdhc_probe,
    .priv_auto      = sizeof(struct fsl_esdhc_priv),
    .platdata_auto  = sizeof(struct fsl_esdhc_plat),
    .flags          = DM_FLAG_PRE_RELOC,
};
```

`.id = UCLASS_MMC`이 *어느 uclass에 속하는지* 표시합니다. `.of_match = fsl_esdhc_ids`가 *DT의 compatible과 매칭*할 문자열 배열입니다.

### udevice

udevice는 *driver의 인스턴스*입니다. DT에서 *해당 driver의 compatible과 매치되는 노드 하나*가 udevice 하나가 됩니다.

```text
/* DT */
soc {
    usdhc1: mmc@30b40000 {
        compatible = "fsl,imx8mp-usdhc";
        reg = <0x30b40000 0x10000>;
        ...
    };

    usdhc2: mmc@30b50000 {
        compatible = "fsl,imx8mp-usdhc";
        reg = <0x30b50000 0x10000>;
        ...
    };
};
```

이 DT에서 udevice *두 개*가 생깁니다.

```text
udevice 1: name="mmc@30b40000", driver=fsl-esdhc-mmc, uclass=UCLASS_MMC
udevice 2: name="mmc@30b50000", driver=fsl-esdhc-mmc, uclass=UCLASS_MMC
```

같은 driver가 *두 인스턴스*를 가지는 것입니다.

## binding — DT가 driver를 찾는 법

U-Boot이 *DT를 어떻게 driver로 변환*하는지가 binding입니다.

1. U-Boot이 DT를 scan.
2. 각 노드의 `compatible` 프로퍼티 확인.
3. 모든 driver의 `of_match` 배열을 검색.
4. 매치되면 udevice 생성 + driver와 binding.
5. 부모 노드 우선 (root → soc → mmc@xxx 순).

```c
/* drivers/core/lists.c */

int lists_bind_fdt(struct udevice *parent, ofnode node, ...)
{
    struct driver *entry;
    int ret;

    for (entry = driver_list_start;
         entry != driver_list_end;
         entry++) {
        if (!entry->of_match)
            continue;

        for (id = entry->of_match; id->compatible; id++) {
            if (ofnode_device_is_compatible(node, id->compatible)) {
                /* 매치! udevice 생성 */
                ret = device_bind(parent, entry, ...);
                if (ret == 0)
                    return 0;
            }
        }
    }
    return -ENODEV;
}
```

매치되는 driver를 *찾지 못한 노드*는 *device가 생성되지 않습니다*. 동작도 안 합니다. 이것이 가장 흔한 디버깅 포인트입니다.

## bind vs probe

DM은 *bind*와 *probe*를 *분리*합니다.

**bind**

- device 인스턴스 생성
- parent-child 관계 설정
- driver_data 포인터만 연결
- 빠름, 메모리만 차지

**probe**

- 실제 hardware 초기화
- clock enable, pinmux, 레지스터 설정
- 첫 사용 시점까지 lazy

`probe`는 *해당 device가 처음 사용될 때*까지 *연기*됩니다. 부트 시간을 줄이기 위함입니다. MMC controller가 부트에 안 쓰이면 *probe 안 됩니다*.

```c
/* drivers/core/uclass.c */

int uclass_get_device(enum uclass_id id, int index, struct udevice **devp)
{
    struct udevice *dev = ...; /* lookup */

    if (dev->flags & DM_FLAG_ACTIVATED)
        return 0;  /* 이미 probe됨 */

    return device_probe(dev);  /* lazy probe */
}
```

`mmc list` 같은 명령이 호출되는 시점에 *그제서야* MMC가 probe됩니다.

## DM_FLAG — driver 동작 제어

`U_BOOT_DRIVER`의 `.flags` 필드가 *driver의 동작 방식*을 조정합니다.

| flag | 의미 |
|------|------|
| `DM_FLAG_PRE_RELOC` | relocation 전에도 사용 가능 |
| `DM_FLAG_ACTIVATED` | probe 완료 상태 |
| `DM_FLAG_NAME_ALLOCED` | name이 동적 할당됨 |
| `DM_FLAG_REMOVE_WITH_PD_ON` | power domain 켜진 상태로 remove |
| `DM_FLAG_OS_PREPARE` | OS 인계 전 호출 |
| `DM_FLAG_PROBE_AFTER_BIND` | bind 직후 즉시 probe |
| `DM_FLAG_DEFAULT_PD_CTRL_OFF` | power domain 자동 제어 끔 |

`DM_FLAG_PRE_RELOC`이 가장 중요합니다. 이 flag 없는 driver는 *board_init_r 이후*에만 동작합니다. UART, console driver는 *반드시* PRE_RELOC.

```c
U_BOOT_DRIVER(serial_imx) = {
    .name   = "serial_imx",
    .id     = UCLASS_SERIAL,
    .of_match = serial_imx_ids,
    .probe  = imx_serial_probe,
    .flags  = DM_FLAG_PRE_RELOC,  /* console은 pre-reloc */
};
```

## dm tree — 런타임 검증

U-Boot 명령 인터프리터에서 `dm tree`가 *전체 device tree*를 출력합니다.

```text
=> dm tree
 Class     Index  Probed  Driver                Name
-----------------------------------------------------------
 root          0  [ + ]   root_driver           root_driver
 simple_bus    0  [ + ]   generic_simple_bus    |-- soc@0
 clk           0  [ + ]   imx8mp_clk            |   |-- clock-controller@30380000
 pinctrl       0  [ + ]   imx8mp_pinctrl        |   |-- iomuxc@30330000
 serial        0  [ + ]   serial_imx            |   |-- serial@30890000
 mmc           0  [   ]   fsl-esdhc-mmc         |   |-- mmc@30b40000
 mmc           1  [   ]   fsl-esdhc-mmc         |   |-- mmc@30b50000
 ethernet      0  [ + ]   eqos_imx              |   |-- ethernet@30bf0000
 i2c           0  [ + ]   imx-i2c               |   |-- i2c@30a20000
 pmic          0  [ + ]   pca9450               |   |   `-- pmic@25
 regulator     0  [ + ]   pca9450_regulator     |   |       `-- regulators
 cpu           0  [ + ]   imx8_cpu              |-- cpu@0
 cpu           1  [ + ]   imx8_cpu              |-- cpu@1
 cpu           2  [ + ]   imx8_cpu              |-- cpu@2
 cpu           3  [ + ]   imx8_cpu              |-- cpu@3
```

`[ + ]`이 *probed*, `[   ]`이 *bind만 됨, probe 전*. probed가 *모두 +*가 아닐 수도 있습니다. lazy probe이기 때문입니다.

probe 실패는 *DT의 incomplete* 또는 *parent driver bug*가 원인입니다. 가장 자주 보이는 패턴:

```text
=> dm tree
 mmc      0  [   ]   fsl-esdhc-mmc         |   |-- mmc@30b40000
=> mmc list
Card did not respond to voltage select! : -110
=> dm tree
 mmc      0  [   ]   fsl-esdhc-mmc         |   |-- mmc@30b40000
```

probe가 *시도되었지만 실패*했고, 다음에 다시 probe됩니다. 원인 *대부분*은 *clock 안 잡힘* 또는 *regulator 안 켜짐*.

## dm uclass — uclass별 목록

```text
=> dm uclass
uclass 0: root
0      * root_driver @ ff8e5b80, seq -1
uclass 14: clk
0        clock-controller@30380000 @ ff8e6b40, seq 0
...
uclass 47: mmc
0      * mmc@30b40000 @ ff8eac80, seq 0
1      * mmc@30b50000 @ ff8eba80, seq 1
uclass 52: serial
0      * serial@30890000 @ ff8e7c80, seq 0
```

특정 uclass의 *모든 device*를 한 번에 봅니다. driver 개발 시 빠른 진단 도구입니다.

## SPL에서의 DM

SPL도 DM을 *전부* 또는 *부분적으로* 쓸 수 있습니다. `CONFIG_SPL_DM=y` 옵션입니다.

```text
CONFIG_SPL_DM=y
CONFIG_SPL_DM_MMC=y
CONFIG_SPL_DM_GPIO=y
CONFIG_SPL_DM_PMIC=y
CONFIG_SPL_OF_CONTROL=y
CONFIG_SPL_OF_PLATDATA=y    ← 옵션: DT 대신 platdata 사용 (크기 절약)
```

`CONFIG_SPL_OF_PLATDATA`는 *SPL에서 DT 파싱을 건너뛰고 미리 생성된 C struct를 사용*하는 옵션입니다. SPL 크기를 줄이는 *고급 옵션*입니다. 빌드 시 `dtoc` 도구가 *DT를 C 코드로 변환*합니다.

```text
$ make spl/u-boot-spl
  DTOC C   spl/dts/dt-plat.c
  DTOC H   spl/dts/dt-structs-gen.h
```

생성된 `dt-plat.c`는 다음 같이 *static 데이터*로 device들을 정의합니다.

```c
/* spl/dts/dt-plat.c (생성 코드) */

struct dtd_fsl_imx8mp_usdhc dtv_mmc_30b40000 = {
    .reg            = {0x30b40000, 0x10000},
    .bus_width      = 0x8,
    .pinctrl_0      = 0x40,
    ...
};

U_BOOT_DRVINFO(mmc_30b40000) = {
    .name   = "fsl_esdhc_imx",
    .plat   = &dtv_mmc_30b40000,
};
```

DT 파싱 코드가 빠지므로 *SPL 크기가 수 KB 감소*합니다.

## 새 driver 한 개 — 최소 예시

가상의 가속도 센서 driver를 DM 위에서 짜는 예시입니다.

```c
/* drivers/sensor/acme_accel.c */

#include <common.h>
#include <dm.h>
#include <i2c.h>
#include <sensor.h>

struct acme_accel_priv {
    struct udevice *i2c_dev;
    u8 chip_addr;
};

static int acme_accel_read(struct udevice *dev, int *xyz)
{
    struct acme_accel_priv *priv = dev_get_priv(dev);
    u8 buf[6];
    int ret;

    ret = dm_i2c_read(priv->i2c_dev, 0x32, buf, 6);
    if (ret)
        return ret;

    xyz[0] = (buf[1] << 8) | buf[0];
    xyz[1] = (buf[3] << 8) | buf[2];
    xyz[2] = (buf[5] << 8) | buf[4];

    return 0;
}

static int acme_accel_probe(struct udevice *dev)
{
    struct acme_accel_priv *priv = dev_get_priv(dev);

    /* parent가 i2c bus */
    priv->i2c_dev = dev->parent;
    priv->chip_addr = dev_read_addr(dev);

    /* sensor reset */
    return dm_i2c_reg_write(priv->i2c_dev, 0x2D, 0x08);
}

static const struct sensor_ops acme_accel_ops = {
    .read = acme_accel_read,
};

static const struct udevice_id acme_accel_ids[] = {
    { .compatible = "acme,xl345" },
    { /* sentinel */ }
};

U_BOOT_DRIVER(acme_xl345) = {
    .name       = "acme-xl345",
    .id         = UCLASS_SENSOR,
    .of_match   = acme_accel_ids,
    .ops        = &acme_accel_ops,
    .probe      = acme_accel_probe,
    .priv_auto  = sizeof(struct acme_accel_priv),
};
```

DT:

```text
&i2c1 {
    accelerometer@53 {
        compatible = "acme,xl345";
        reg = <0x53>;
    };
};
```

빌드 후 부트:

```text
=> dm tree
 i2c          0  [ + ]   imx-i2c        |-- i2c@30a20000
 sensor       0  [   ]   acme-xl345     |   `-- accelerometer@53
```

자동으로 device가 생겼습니다. 보드 코드에 *한 줄도* 안 썼습니다.

## 자주 하는 실수

### `of_match`의 *sentinel 누락*

```c
static const struct udevice_id ids[] = {
    { .compatible = "vendor,my-driver" },
    /* sentinel 누락! */
};
```

배열의 *끝을 표시*하는 `{ /* sentinel */ }`를 빼면 *out-of-bounds*로 메모리를 읽어 *random match*가 일어날 수 있습니다. 항상 끝에 빈 entry를 둡니다.

### `DM_FLAG_PRE_RELOC` 없이 *board_init_f에서 사용*

UART, console, GPIO는 *pre-reloc 가능*해야 합니다. 이 flag 없으면 *board_init_f 단계에서 device가 안 보입니다*.

```c
.flags = DM_FLAG_PRE_RELOC,
```

console에 *아무것도 안 나오는데* device 자체는 *제대로 정의된* 경우, PRE_RELOC 누락이 자주 범인입니다.

### `priv_auto` 크기 mismatch

`priv_auto = sizeof(struct acme_accel_priv)`가 *실제 priv struct 크기*와 다르면 *메모리 corruption*. typedef alias로 *큰 struct*를 정의했는데 크기를 *작게 잡으면* probe 후 *주변 메모리가 깨집니다*.

### `dev->parent`를 *잘못 가정*

I2C device의 parent는 *I2C bus*이지만, SPI device의 parent는 *SPI bus*입니다. driver별로 *parent 사용 패턴이 다릅니다*. uclass 문서를 확인.

### `probe`가 *DT 노드를 다시 읽음*

`dev_read_*` 함수로 DT 노드의 프로퍼티를 *probe 시점에* 읽습니다. `priv_auto`에 *캐시해 두지 않으면* 매 호출마다 DT 파싱이 일어나 *느려집니다*.

### `dm tree`에서 device가 *안 보임*

```text
=> dm tree
(my device not shown)
```

원인 후보:
- DT의 compatible string 오타
- driver의 of_match 배열에 누락
- driver 자체가 빌드에 *포함 안 됨* (Kconfig 누락)
- 부모 노드가 *status = "disabled"*

`fdt print /soc/i2c@xxx/my-device`로 DT를 확인하고, 빌드 산출물에 *.o가 있는지* 확인합니다.

### `select` 누락

defconfig에서 `CONFIG_MY_DRIVER=y`만 켜고 `CONFIG_DM=y`가 안 켜져 있는 경우. DM은 *대부분의 Kconfig에서 default y*이지만 *명시적으로 확인*합니다.

```text
CONFIG_DM=y
CONFIG_DM_I2C=y
CONFIG_DM_SENSOR=y
CONFIG_MY_DRIVER=y
```

## 정리

- Driver Model은 *uclass(인터페이스) · driver(구현) · udevice(인스턴스)*의 삼각 구조입니다.
- DT의 *compatible* 프로퍼티가 *driver의 of_match와 매칭*되어 *udevice가 자동 생성*됩니다.
- *bind*(인스턴스 생성)와 *probe*(실제 init)가 분리되어 있고, probe는 *lazy*입니다.
- `DM_FLAG_PRE_RELOC`이 *relocation 이전*에도 사용 가능한 driver임을 표시합니다. UART, console에 필수.
- `dm tree`로 *전체 device 트리*와 *probe 상태*를 봅니다. `[ + ]`이 probed, `[   ]`이 bind만 됨.
- `dm uclass`로 *특정 uclass의 모든 device*를 봅니다.
- SPL은 `CONFIG_SPL_DM=y`로 DM 사용. 크기 절약을 위해 `CONFIG_SPL_OF_PLATDATA`로 *DT 대신 C struct*를 쓸 수 있습니다.
- 새 driver는 `U_BOOT_DRIVER` 매크로로 정의합니다. uclass id, of_match, probe, ops, priv_auto가 핵심 필드.

## 다음 편

[Ch 8: 보드 초기화 — board_init_f와 board_init_r](/blog/embedded/bootloader/chapter08-board-init)에서는 U-Boot의 *부트 흐름*을 봅니다. relocation 전과 후의 환경 차이, `init_sequence_f`/`init_sequence_r` 배열, 보드가 hook할 수 있는 지점.

## 관련 항목

- [Ch 3: 빌드 시스템](/blog/embedded/bootloader/chapter03-build-system)
- [Ch 6: Device Tree와 부트로더](/blog/embedded/bootloader/chapter06-device-tree)
- [Ch 8: board_init_f vs board_init_r](/blog/embedded/bootloader/chapter08-board-init)
- [Ch 9: DRAM 초기화](/blog/embedded/bootloader/chapter09-dram-init)
- [Ch 21: 보드 포팅 — 처음부터 끝까지](/blog/embedded/bootloader/chapter21-board-porting)
- [BSP Ch 6: U-Boot 보드 포팅](/blog/embedded/bsp/chapter06-u-boot-porting)
- [원문 — U-Boot Driver Model](https://u-boot.readthedocs.io/en/latest/develop/driver-model/index.html)
- [원문 — U-Boot DM design](https://u-boot.readthedocs.io/en/latest/develop/driver-model/design.html)
