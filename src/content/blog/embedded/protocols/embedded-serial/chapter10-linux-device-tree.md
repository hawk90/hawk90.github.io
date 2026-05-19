---
title: "Ch 10: Linux Device Tree — SPI·I²C·UART 선언"
date: 2026-05-16T10:00:00
description: "DTS 노드로 직렬 버스와 슬레이브 디바이스 매핑. Pinctrl·clocks·DMA까지."
series: "Embedded Protocols 심화"
seriesOrder: 10
tags: [linux, device-tree, dts, spi, i2c, uart, pinctrl]
draft: true
---

## 한 줄 요약

> **"DTS가 보드의 설계도"** — 어떤 페리퍼럴이 어디 있고, 어떤 슬레이브가 붙었는지를 *런타임 데이터*로 표현.

## 어떤 문제를 푸는가

옛 Linux는 보드별 *C 파일*에 페리퍼럴 주소·인터럽트 번호·디바이스 목록을 박았습니다. 보드 100개면 C 파일 100개 — 유지 불가.

**Device Tree**는 같은 정보를 *데이터*(`.dts`)로 분리:
- 커널 이미지는 1개, *DT blob* (`.dtb`)만 보드별로 교체.
- DT를 부팅 시 커널에 주입 (`u-boot fdt_addr`).
- 커널은 DT를 *파싱*해 적절한 드라이버 매칭.

## DT 기본 — 한 노드의 구조

```dts
node_label: node_name@unit_address {
    compatible = "vendor,model";
    reg = <0x40004000 0x400>;        // 주소 + 크기
    interrupts = <GIC_SPI 37 IRQ_TYPE_LEVEL_HIGH>;
    clocks = <&clk_uart>;
    pinctrl-names = "default";
    pinctrl-0 = <&uart_pins>;
    status = "okay";                   // 또는 "disabled"
};
```

- `compatible` — 드라이버가 *이 노드를 잡는 키*
- `reg` — 메모리 매핑 또는 슬레이브 주소
- `interrupts` — IRQ 번호
- `pinctrl-*` — 핀 mux 설정
- `status` — `okay` (활성), `disabled` (비활성)

## SPI 노드 — STM32MP1 예

```dts
&spi1 {
    pinctrl-names = "default", "sleep";
    pinctrl-0 = <&spi1_pins>;
    pinctrl-1 = <&spi1_sleep_pins>;
    cs-gpios = <&gpiog 8 GPIO_ACTIVE_LOW>;  // CS는 GPIO로 제어
    dmas = <&dmamux1 37 0x400 0x05>,
           <&dmamux1 38 0x400 0x05>;
    dma-names = "rx", "tx";
    status = "okay";

    flash@0 {
        compatible = "winbond,w25q128", "jedec,spi-nor";
        reg = <0>;                             // CS index
        spi-max-frequency = <50000000>;        // 50 MHz
        spi-tx-bus-width = <1>;
        spi-rx-bus-width = <1>;
    };

    adc@1 {
        compatible = "maxim,max11410";
        reg = <1>;
        spi-max-frequency = <8000000>;
        spi-cpha;                              // CPHA=1
        spi-cpol;                              // CPOL=1 → Mode 3
    };
};
```

핵심:
- `spi-max-frequency` — 슬레이브가 견디는 최대 클럭
- `spi-cpha`·`spi-cpol` — Mode 비트 (없으면 0)
- 자식 노드 `reg`가 CS index

## I²C 노드

```dts
&i2c1 {
    pinctrl-names = "default";
    pinctrl-0 = <&i2c1_pins>;
    clock-frequency = <400000>;       // 400 kHz Fast
    status = "okay";

    rtc@68 {
        compatible = "maxim,ds3231";
        reg = <0x68>;                  // 7-bit 주소
        interrupt-parent = <&gpiog>;
        interrupts = <14 IRQ_TYPE_EDGE_FALLING>;
    };

    eeprom@50 {
        compatible = "atmel,24c64";
        reg = <0x50>;
        pagesize = <32>;
    };

    bmp180@77 {
        compatible = "bosch,bmp180";
        reg = <0x77>;
    };
};
```

- `clock-frequency` — 버스 속도 (100k·400k·1M·3.4M)
- `reg` — 7-bit 슬레이브 주소
- `interrupt-parent` — 별도 INT 핀이 있는 디바이스 (DS3231)

## UART (serial) 노드

```dts
&uart4 {
    pinctrl-names = "default";
    pinctrl-0 = <&uart4_pins>;
    pinctrl-1 = <&uart4_sleep_pins>;
    dmas = <&dmamux1 63 0x400 0x05>,
           <&dmamux1 64 0x400 0x05>;
    dma-names = "rx", "tx";
    status = "okay";
};

&uart7 {
    pinctrl-0 = <&uart7_pins>;
    rts-gpios = <&gpioe 9 GPIO_ACTIVE_LOW>;
    cts-gpios = <&gpioe 10 GPIO_ACTIVE_LOW>;
    status = "okay";

    bluetooth {
        compatible = "brcm,bcm43438-bt";
        max-speed = <3000000>;
    };
};
```

- 별도 `clock-frequency` 없음 — *유저 공간*에서 termios로 설정 (`stty -F /dev/ttySTM4 115200`)

## Pinctrl — 핀 mux 설정

```dts
&pinctrl {
    spi1_pins: spi1-0 {
        pins1 {
            pinmux = <STM32_PINMUX('G', 9, AF5)>,    // SCK
                     <STM32_PINMUX('G', 11, AF5)>;   // MOSI
            bias-disable;
            drive-push-pull;
            slew-rate = <3>;
        };
        pins2 {
            pinmux = <STM32_PINMUX('G', 10, AF5)>;   // MISO
            bias-disable;
        };
    };
};
```

`AF5` — Alternate Function 5 (벤더 데이터시트 참조). `slew-rate`·`drive-push-pull`·`bias-pull-up` 등 전기 특성도 여기서.

## DT Overlay — 런타임 슬레이브 추가

부팅 후 *작은 DT 패치*를 동적으로 적용. **장점** — 메인 DTS 안 건드리고 보드 변형.

```dts
/dts-v1/;
/plugin/;

&{/soc/i2c@40005400} {
    #address-cells = <1>;
    #size-cells = <0>;

    sensor@40 {
        compatible = "honeywell,hmc5883l";
        reg = <0x40>;
    };
};
```

빌드: `dtc -O dtb -o sensor.dtbo sensor.dtso`.
적용: `mkdir /sys/kernel/config/device-tree/overlays/my_sensor; cat sensor.dtbo > .../my_sensor/dtbo`.

라즈베리 파이 OS는 `/boot/config.txt`에 `dtoverlay=...` 한 줄로 자동 적용.

## Yocto / Buildroot 통합

### Yocto

```bitbake
# layer recipe
SRC_URI += "file://my-board.dts"

do_configure_append() {
    cp ${WORKDIR}/my-board.dts ${S}/arch/arm/boot/dts/
}

KERNEL_DEVICETREE = "stm32mp157c-my-board.dtb"
```

### Buildroot

`BR2_LINUX_KERNEL_INTREE_DTS_NAME = "stm32mp157c-my-board"` 같은 config. 또는 *외부 DTS 트리* 사용.

## 디버깅 도구

```bash
# 부팅 후 적용된 DT 확인
cat /proc/device-tree/spi@40004000/flash@0/compatible

# 또는 fdt commands
dtc -I fs /sys/firmware/devicetree/base > current.dts

# 드라이버 매칭 보기
dmesg | grep -i "spi\|i2c\|serial"
```

`/sys/class/spi*`, `/sys/class/i2c-*`, `/dev/spidev*` — 드라이버가 정상 바인딩되었는지 확인.

## 자주 하는 실수

> ⚠️ `status = "disabled"`

기본 DT 노드가 *disabled*인 경우가 흔함 (cubemx 생성 코드 등). `&spi1 { status = "okay"; };` 명시 필요.

> ⚠️ Pinctrl 누락

핀이 *기본 GPIO 모드*로 잡혀 SPI 시그널이 안 나옴. *컴파일 OK + 동작 0* 시그니처.

> ⚠️ Compatible 오타

`"winbond,w25q128"` vs `"winband,w25q128"` — 드라이버 *조용히 안 잡힘*. dmesg에 *바인딩 메시지 없으면* 의심.

> ⚠️ Slave `reg` (CS index) 중복

같은 SPI 버스의 두 자식이 `reg = <0>` 둘 다 가지면 빌드 에러 또는 *예측 불가*. CS는 고유.

## 정리

- DT가 *보드 정보를 데이터로* 분리 — 커널 이미지 공통.
- SPI/I²C/UART는 *부모 노드 + 자식 슬레이브 노드* 구조.
- **Pinctrl·clocks·dmas·interrupts** 4 property가 거의 모든 페리퍼럴 공통.
- **DT Overlay**로 런타임 슬레이브 추가.
- `status = "okay"`와 `compatible` 정확성이 90%.

다음 편은 **Linux Driver 작성** — DT로 잡힌 디바이스를 어떻게 user space에서 쓰나.

## 관련 항목

- [Ch 11: Linux Driver](/blog/embedded/protocols/embedded-serial/chapter11-linux-drivers)
- [Yocto 시리즈](/blog/embedded/yocto/ch01-linux-for-embedded-systems)
