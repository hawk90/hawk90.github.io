---
title: "7-04: Device Tree Overlay"
date: 2026-05-15T06:00:00
description: "DT overlay의 fragment, target, symbol, dtoverlay 명령, Raspberry Pi 적용 예까지 동적 device 활성화를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 78
tags: [recipes, linux, devicetree, overlay]
---

## 한 줄 요약

> **"DT overlay는 *base DTB에 fragment를 덮어쓰는 패치*입니다."** I2C sensor 한 개를 추가하려고 base DT 전체를 재컴파일할 필요가 없습니다.

## 어떤 상황에서 쓰나

같은 board에 옵션으로 LCD나 sensor를 다는 경우, 사용자가 GPIO에 외부 module을 꽂는 경우, 한 device family가 여러 변형(variant)을 가지는 경우 overlay가 답입니다. Base DTB는 board의 *고정* 구성만 담고, 옵션은 .dtbo 파일로 분리해 boot time에 선택합니다.

Raspberry Pi와 BeagleBone이 overlay를 표준 운영 방식으로 사용하기에 가장 친숙합니다. 그러나 i.MX, Allwinner, Rockchip 같은 SoC에서도 동일한 메커니즘이 적용됩니다.

## 핵심 개념

```text
fragment       overlay의 단위 — 하나의 target 노드에 적용
target         어디에 덮어쓸지 — base DT의 phandle 참조
__symbols__    base DT가 노출한 label → path 매핑
plugin;        overlay 선언 (dtc -@로 컴파일)
status         "okay" / "disabled" — 활성 여부 토글
```

overlay 한 장의 골격입니다.

```dts
/dts-v1/;
/plugin/;       /* overlay임을 선언 */

/ {
    fragment@0 {
        target = <&i2c1>;       /* base DT의 i2c1에 덮어쓰기 */
        __overlay__ {
            #address-cells = <1>;
            #size-cells = <0>;
            status = "okay";

            bme280@76 {
                compatible = "bosch,bme280";
                reg = <0x76>;
            };
        };
    };
};
```

base DT가 `&i2c1` symbol을 export 했기에 overlay가 그 위치를 가리킬 수 있습니다.

## 코드 / 실제 사용 예

### Base DT의 symbol 활성화

```bash
# kernel build 시
make dtbs DTC_FLAGS=-@
# 또는 CONFIG_DTC_PLUGINS_OUTPUT 활성
```

`-@` 옵션이 `__symbols__` 노드를 만들어 모든 label을 export합니다. overlay가 target을 phandle로 가리키려면 필수입니다.

### BME280 추가 overlay

```dts
/dts-v1/;
/plugin/;

/ {
    fragment@0 {
        target = <&i2c1>;
        __overlay__ {
            #address-cells = <1>;
            #size-cells = <0>;
            status = "okay";

            bme280@76 {
                compatible = "bosch,bme280";
                reg = <0x76>;
            };
        };
    };
};
```

```bash
dtc -@ -I dts -O dtb -o bme280.dtbo bme280-overlay.dts
sudo cp bme280.dtbo /boot/overlays/
```

### Raspberry Pi config.txt

```text
# /boot/config.txt
dtoverlay=bme280
dtoverlay=spi1-3cs
dtoverlay=disable-bt
dtparam=i2c_arm=on
```

`dtoverlay=` 라인이 boot loader에게 overlay 적용을 지시합니다. `dtparam=`은 base DT가 노출한 parameter를 토글합니다.

### `/proc/device-tree`로 결과 확인

```bash
$ ls /proc/device-tree/soc/i2c@7e804000/
bme280@76  clocks  ...
$ cat /proc/device-tree/soc/i2c@7e804000/bme280@76/compatible
bosch,bme280
```

부팅 후 overlay가 적용되었는지 device-tree filesystem으로 확인할 수 있습니다.

### Runtime overlay (configfs)

```bash
# kernel CONFIG_OF_CONFIGFS=y 필요
sudo mkdir /sys/kernel/config/device-tree/overlays/bme
sudo cp bme280.dtbo /sys/kernel/config/device-tree/overlays/bme/dtbo
# device가 즉시 probe됨

# 제거
sudo rmdir /sys/kernel/config/device-tree/overlays/bme
```

부팅 후에도 overlay를 활성화할 수 있습니다. Hot-plug 시나리오에 유용하지만, 모든 driver가 cleanly remove를 지원하지는 않습니다.

### GPIO 핀 reassign overlay

```dts
fragment@0 {
    target = <&gpio>;
    __overlay__ {
        my_pins: my_pins {
            brcm,pins = <17 27>;
            brcm,function = <1 0>;   /* out, in */
        };
    };
};

fragment@1 {
    target-path = "/";    /* phandle 대신 path */
    __overlay__ {
        leds {
            compatible = "gpio-leds";
            heartbeat {
                gpios = <&gpio 17 0>;
                linux,default-trigger = "heartbeat";
            };
        };
    };
};
```

pin reassign과 새로운 노드 추가를 fragment 두 개로 표현합니다.

### Parameter 노출

```dts
/ {
    fragment@0 { ... };

    __overrides__ {
        addr = <&bme280>, "reg:0";    /* dtoverlay=bme280,addr=0x77 */
    };
};
```

`__overrides__`로 boot loader가 parameter를 주입할 수 있게 합니다. 같은 overlay를 변형해 쓰기 편해집니다.

## 측정 / 성능 비교

```text
방식                       빌드 시간    boot 영향
base DT 전체 재컴파일     수십 초       SD 재flash 필요
overlay (.dtbo) 추가      <1초          파일만 복사
configfs runtime overlay  <100 ms       reboot 불필요
```

Overlay 작업이 모두 *증분* 작업이기 때문에 개발 속도가 크게 향상됩니다.

```text
RAM 영향
overlay 적용              수 KB 증가 (devicetree blob 일부)
device probe              driver별 ~수 ms
```

## 자주 보는 함정

> `__symbols__` 누락

```text
dtc -I dts -O dtb ...        # -@ 없음
overlay 적용 → "target = <&i2c1>" resolve 실패
```

Base DT를 build할 때 반드시 `-@`을 줍니다. 또는 kernel build system에서 `DTC_FLAGS=-@`를 설정합니다.

> Reg 충돌

```dts
bme280@76 { reg = <0x76>; };
bme280@76 { reg = <0x76>; };   /* 두 overlay가 같은 주소 — 둘 중 하나만 active */
```

같은 bus에 같은 reg를 두 overlay가 활성화하면 후자가 무시되거나 충돌이 발생합니다.

> Driver compatible 불일치

```dts
compatible = "bosch,bmp280";    /* sensor는 bme280인데 잘못 적음 */
```

probe가 silently 실패합니다. `dmesg | grep -i bme`로 driver match 여부를 확인합니다.

> Pin function이 base DT와 충돌

```dts
target = <&gpio>;
__overlay__ {
    brcm,pins = <14 15>;   /* UART pin을 GPIO로 빼앗음 → console 사라짐 */
};
```

GPIO나 pinmux를 건드리는 overlay는 console과 같은 critical 자원을 빼앗지 않는지 확인합니다.

> Runtime overlay remove 시 driver leak

```text
rmdir /sys/kernel/config/device-tree/overlays/bme
[  ...] WARNING: leaking irq
```

일부 driver는 `remove`에서 자원을 cleanup하지 못합니다. Production에서는 가급적 boot time overlay만 사용합니다.

## 정리

- DT overlay는 base DTB에 fragment 단위로 덮어쓰는 patch입니다.
- Base DT는 반드시 `-@`로 build해 `__symbols__`를 export해야 합니다.
- Raspberry Pi의 `dtoverlay=`, configfs runtime overlay 두 방식이 표준입니다.
- 한 base DT에 여러 변형(variant) board를 둘 때 가장 깔끔한 해결책입니다.
- `__overrides__`로 parameter를 노출하면 overlay 한 장으로 여러 device를 다룰 수 있습니다.
- Runtime overlay는 driver의 cleanly remove 지원 여부를 확인 후 사용합니다.

다음 편은 **커널 빌드**입니다. defconfig, menuconfig, out-of-tree, packaging까지 다룹니다.

## 관련 항목

- [7-01: 임베디드 Linux 부팅 흐름](/blog/embedded/modern-recipes/part7-01-linux-boot-flow)
- [7-02: U-Boot 활용](/blog/embedded/modern-recipes/part7-02-uboot-usage)
- [7-05: 커널 빌드](/blog/embedded/modern-recipes/part7-05-kernel-build)
- [7-06: Kernel Module](/blog/embedded/modern-recipes/part7-06-kernel-module)
- [7-08: Platform 드라이버](/blog/embedded/modern-recipes/part7-08-platform-driver)
