---
title: "Ch 11: nRF Connect SDK 실습 — Zephyr + SoftDevice 후속"
date: 2026-05-08T11:00:00
description: "Nordic의 nRF52/nRF53. Zephyr RTOS 기반 nRF Connect SDK로 BLE 펌웨어."
series: "Getting Started with BLE"
seriesOrder: 11
tags: [ble, nrf, zephyr, ncs, peripheral]
type: book-review
bookTitle: "Getting Started with Bluetooth Low Energy"
bookAuthor: "Kevin Townsend et al."
draft: false
---

## 한 줄 요약

> **"Nordic의 *nRF Connect SDK(NCS)*는 *Zephyr RTOS 위에* Nordic 드라이버·BLE 호스트·sample을 얹은 메타 SDK입니다. 옛 *SoftDevice + nRF5 SDK* 시대는 끝났습니다. west로 빌드, Kconfig로 설정, devicetree로 하드웨어 매핑. 그리고 *Power Profiler Kit II*가 µA 단위 측정의 사실상 표준입니다."** ESP32(NimBLE)와 STM32WB는 *Cortex-M0+ 라디오 코어를 분리*해서 다른 트레이드오프를 만듭니다.

이번 장은 책의 BlueZ·Arduino 예제를 *현대 SDK*로 옮기는 길잡이입니다. NCS 디렉토리 구조, west 빌드 흐름, Kconfig·devicetree, sample 응용, Power Profiler Kit II 측정 절차, 그리고 *ESP32 NimBLE / STM32WB / TI CC2640* 대안 비교까지 한 번에 풉니다.

## NCS 디렉토리 구조

NCS는 *west*라는 메타 빌드 도구로 *여러 git repo를 동기*합니다. `ncs/` 루트 아래에 다음과 같이 펼쳐집니다.

```text
ncs/
├── zephyr/              # Zephyr RTOS 본체 (upstream + Nordic patch)
├── nrf/                 # Nordic 추가 라이브러리 (Bluetooth services, MCUboot 등)
│   ├── samples/         # Nordic 특화 sample
│   ├── subsys/          # bluetooth/, dfu/, partition_manager/ 등
│   ├── lib/             # bt_dis, dk_buttons_and_leds 등
│   └── boards/          # Nordic eval board overlay
├── modules/
│   ├── hal/nordic/      # MDK (Modem, BLE 컨트롤러)
│   ├── crypto/          # mbedTLS, oberon, nrf_oberon
│   └── lib/cmsis/
├── bootloader/          # MCUboot
├── mcuboot/
├── nrfxlib/             # closed-source libs (BLE controller, ZBOSS Zigbee 등)
└── tools/
    └── west/            # 메타 빌드 도구
```

```bash
# NCS 환경 셋업
pip install -U west
mkdir ncs && cd ncs
west init -m https://github.com/nrfconnect/sdk-nrf --mr v2.6.0
west update      # 모든 의존 repo clone
west zephyr-export   # CMake가 Zephyr 패키지 찾도록 설정
pip install -r zephyr/scripts/requirements.txt
pip install -r nrf/scripts/requirements.txt
```

VS Code의 *nRF Connect for VS Code* extension이 *west·toolchain·디버그*를 한 곳에 묶어 줍니다. 초보자는 *Nordic Toolchain Manager*로 시작해 NCS를 *원클릭 설치*하는 것이 가장 단순합니다.

## 첫 빌드 - peripheral_uart

가장 흔한 sample은 *Nordic UART Service(NUS) peripheral*입니다. 시리얼 데이터를 BLE로 wrap하는 응용입니다.

```bash
# Project 디렉토리에서
cd ncs/nrf/samples/bluetooth/peripheral_uart

# Build (nRF52840 DK board)
west build -b nrf52840dk_nrf52840

# Flash
west flash --erase

# Serial 모니터 (115200 8N1)
nrfjprog --com   # 또는 minicom -D /dev/ttyACM0
```

빌드 산출물은 `build/zephyr/zephyr.hex`와 `zephyr.elf`입니다. `west flash`가 *J-Link*를 통해 자동 flash하고, J-Link OB가 *VCP*(virtual COM port)도 같이 제공합니다.

## Kconfig - BLE 기능 토글

NCS의 모든 기능은 *Kconfig*로 켜고 끕니다. `prj.conf`에 옵션을 나열하고, `west build`가 통합합니다.

```text
# prj.conf

# Bluetooth 기본
CONFIG_BT=y
CONFIG_BT_PERIPHERAL=y
CONFIG_BT_DEVICE_NAME="MySensor"
CONFIG_BT_DEVICE_APPEARANCE=833

# Security
CONFIG_BT_SMP=y
CONFIG_BT_SMP_SC_ONLY=y
CONFIG_BT_BONDABLE=y
CONFIG_BT_SETTINGS=y
CONFIG_SETTINGS=y
CONFIG_NVS=y
CONFIG_FLASH=y
CONFIG_FLASH_MAP=y

# Services
CONFIG_BT_BAS=y                   # Battery Service
CONFIG_BT_DIS=y                   # Device Information Service
CONFIG_BT_NUS=y                   # Nordic UART Service

# BLE 5
CONFIG_BT_EXT_ADV=y
CONFIG_BT_PER_ADV=y
CONFIG_BT_USER_PHY_UPDATE=y
CONFIG_BT_USER_DATA_LEN_UPDATE=y

# Buffers
CONFIG_BT_BUF_ACL_RX_SIZE=251
CONFIG_BT_BUF_ACL_TX_SIZE=251
CONFIG_BT_L2CAP_TX_MTU=247

# Logging
CONFIG_LOG=y
CONFIG_BT_DEBUG_LOG=y

# Power 측정용
CONFIG_PM=y
CONFIG_PM_DEVICE=y
```

`west build -t menuconfig`로 *대화형 메뉴*를 띄울 수도 있습니다. 처음 만지면 *몇천 개의 옵션*에 압도되는데, sample이 *대부분 미리 설정*되어 있어 *증분*만 손대면 됩니다.

## Devicetree - 하드웨어 매핑

*Devicetree*는 Linux kernel에서 온 *하드웨어 기술 언어*입니다. NCS는 board 별 `.dts` 파일을 기본으로 두고, 응용이 *overlay*(`.overlay`)로 덮어씁니다.

```text
# boards/nrf52840dk_nrf52840.overlay
/ {
    aliases {
        led0 = &led0;
        sw0 = &button0;
    };
};

&i2c0 {
    status = "okay";
    sda-gpios = <&gpio0 26 GPIO_ACTIVE_HIGH>;
    scl-gpios = <&gpio0 27 GPIO_ACTIVE_HIGH>;
    clock-frequency = <I2C_BITRATE_FAST>;

    bme280@76 {
        compatible = "bosch,bme280";
        reg = <0x76>;
    };
};
```

```c
// 응용 코드에서 devicetree 노드 참조
#include <zephyr/device.h>
#include <zephyr/drivers/sensor.h>

const struct device *bme280 = DEVICE_DT_GET_ANY(bosch_bme280);
if (!device_is_ready(bme280)) {
    return -ENODEV;
}

struct sensor_value temp;
sensor_sample_fetch(bme280);
sensor_channel_get(bme280, SENSOR_CHAN_AMBIENT_TEMP, &temp);
```

Devicetree는 *학습 곡선*이 가파릅니다. 처음에는 `nrfx_twim_*` 직접 호출이 익숙하지만, NCS는 *generic sensor API*를 권장합니다. 같은 응용 코드가 *BME280을 BMP280으로 바꿔도* `compatible` 필드만 수정하면 됩니다.

## Sample 응용 라인업

NCS는 *수십 개 BLE sample*을 제공합니다. 자주 쓰는 것들입니다.

| Sample | 위치 | 용도 |
|--------|------|------|
| `peripheral_uart` | nrf/samples/bluetooth/ | Nordic UART Service (serial over BLE) |
| `peripheral_hr` | zephyr/samples/bluetooth/ | Heart Rate Service |
| `peripheral_lbs` | nrf/samples/bluetooth/ | LED Button Service (Nordic 데모) |
| `central_uart` | nrf/samples/bluetooth/ | NUS client |
| `central_bas` | zephyr/samples/bluetooth/ | Battery Service client |
| `direct_test_mode` | zephyr/samples/bluetooth/ | DTM (인증 테스트용) |
| `iso_broadcaster` / `iso_receiver` | zephyr/samples/bluetooth/ | LE Audio broadcast |
| `direction_finding_*` | nrf/samples/bluetooth/ | AoA/AoD |
| `mesh_*` | zephyr/samples/bluetooth/ | Bluetooth Mesh |
| `peripheral_mtu_update` | zephyr/samples/bluetooth/ | MTU 협상 데모 |

```c
// peripheral_uart의 main.c (요약)
#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/bluetooth/services/nus.h>

static struct bt_nus_cb nus_cb = {
    .received = nus_received_cb,
};

static void nus_received_cb(struct bt_conn *conn,
                             const uint8_t *data, uint16_t len)
{
    printk("Received %u bytes\n", len);
    /* echo back */
    bt_nus_send(NULL, data, len);
}

int main(void)
{
    bt_enable(NULL);
    bt_nus_init(&nus_cb);
    bt_le_adv_start(BT_LE_ADV_CONN_NAME, NULL, 0, NULL, 0);
    return 0;
}
```

`west build -b nrf52840dk_nrf52840 -p` (pristine)로 빌드, flash 후 *nRF Connect 모바일 앱*에서 NUS service에 접속하면 양방향 echo가 동작합니다.

## Power Profiler Kit II - µA 단위 측정

BLE 펌웨어의 *진짜 검증*은 *전류 프로파일*입니다. *PPK II*는 Nordic이 만든 *전류 측정·전원 공급 보드*입니다.

| 사양 | 값 |
|------|----|
| 전류 범위 | 200 nA ~ 1 A (자동 range) |
| 분해능 | 100 nA |
| 샘플레이트 | 100 kSa/s |
| 가격 | $99 |

![PPK II 측정 setup — USB 5V → PPK II → DUT VDD, J-Link separate, PC receives stream](/images/blog/ble/diagrams/ch11-ppk2-setup.svg)

![BLE peripheral current profile — 10 mA TX bursts every 100 ms over 3 µA sleep baseline](/images/blog/ble/diagrams/ch11-current-profile.svg)

PPK II로 측정하면 *광고 주기 결정*이 *과학*이 됩니다. 1초 주기에서 평균 50 µA가 나오는지 *실측 확인* 후 양산 단가와 배터리를 정합니다. 측정 없이 *데이터시트 추정*만으로는 거의 항상 *50% 이상 오차*가 납니다.

## 대안 1 - ESP32 NimBLE

Nordic만이 답은 아닙니다. *ESP32 시리즈*는 WiFi와 BLE를 한 칩에 통합한 *가성비 강자*입니다.

| 항목 | Nordic nRF52840 | ESP32-C3 |
|------|----------------|----------|
| 코어 | Cortex-M4 @ 64 MHz | RISC-V @ 160 MHz |
| Flash/RAM | 1 MB / 256 KB | 4 MB / 400 KB (모듈 기준) |
| WiFi | 없음 | 802.11 b/g/n |
| BLE | 5.4 | 5.0 |
| sleep 전류 | ~3 µA | ~5 µA |
| 단가(2025) | $5~10 | $1~3 |
| 스택 | Zephyr/SoftDevice | NimBLE / Bluedroid |
| 개발 환경 | NCS (Zephyr) | ESP-IDF (FreeRTOS) |

```c
// ESP-IDF NimBLE - peripheral 광고
#include "nimble/nimble_port.h"
#include "host/ble_hs.h"

void app_main(void) {
    nvs_flash_init();
    nimble_port_init();
    ble_store_config_init();
    ble_svc_gap_device_name_set("ESP-Sensor");
    
    /* GATT services 등록 후 */
    
    nimble_port_freertos_init(host_task);
}
```

ESP32-C3 코드는 [ESP32-C3 Mastering Ch 8](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt)에서 자세히 다룹니다.

## 대안 2 - STM32WB

ST의 *STM32WB55*는 *Cortex-M4 + Cortex-M0+ dual-core*입니다. M0+가 *BLE 컨트롤러를 단독으로* 돌려서 *M4 응용 코어는 응용에 집중*하는 구조입니다.

| 항목 | 값 |
|------|----|
| 앱 코어 | Cortex-M4 @ 64 MHz |
| 라디오 코어 | Cortex-M0+ @ 32 MHz |
| BLE | 5.4 |
| Thread/Zigbee | 가능 (M0+ 펌웨어 교체) |
| 단가 | $4~6 |
| 스택 | STM32Cube WPAN |

```c
// STM32Cube WPAN - HCI command (M4 → M0+)
hci_le_set_advertising_parameters(
    160,        // adv interval min (× 0.625 ms)
    240,        // adv interval max
    ADV_IND,
    PUBLIC_ADDR,
    PUBLIC_ADDR,
    &addr,
    ADV_CH_ALL,
    NO_WHITE_LIST_USE
);
```

*M4 + M0+ 분리*가 장점이자 단점입니다. 응용이 *라디오 부하에 영향받지 않는* 장점이 있지만, *디버깅이 복잡*하고 *RAM 공유 메커니즘(IPCC)*이 학습 곡선을 만듭니다.

## 대안 비교 매트릭스

| 칩 | 강점 | 약점 | 추천 응용 |
|----|------|------|----------|
| nRF52840 | 가장 큰 ecosystem, NCS 성숙, Mesh·Thread·Zigbee | 단가 약간 높음 | 양산 IoT, OEM |
| nRF5340 | 두 코어 분리(보안 분리), BLE 5.4 | 학습 곡선 | 고보안 응용 |
| nRF54L15 | BLE 5.4 + ARM Cortex-M33 | 신생 (2024년) | 차세대 |
| ESP32-C3 | WiFi 통합, 단가 최저 | sleep 전류 높음 | 가성비 IoT |
| STM32WB55 | 듀얼 코어, ST ecosystem | 복잡한 IPCC | ST 친화 양산 |
| TI CC2640R2 / CC2652 | 다중 프로토콜 (Thread, Zigbee, BLE) | TI tooling | 멀티프로토콜 |

## 자주 하는 실수

| 증상 | 원인 | 해결 |
|------|------|------|
| west build 실패: "module not found" | pip 의존성 미설치 | pip install -r zephyr/scripts/req... |
| west update 매우 느림 | 모든 repo clone (수 GB) | 초기 한 번만, 이후 incremental |
| nRF Connect SDK 새 버전 후 빌드 실패 | Kconfig 옵션 deprecated | 릴리즈 노트 마이그레이션 가이드 |
| flash 후 동작 안 함 | bootloader / 응용 partition mismatch | pristine 빌드 + erase |
| sleep 전류 100 µA에서 못 내려옴 | peripheral driver 안 끄임 | UART/GPIO suspend 명시 |
| Bond NVS 손실 (OTA) | partition 변경 | Settings subsys 보존 |
| J-Link debug 끊김 | VCC mismatch | 외부 전원 + J-Link target 동일 |
| PPK II 측정값이 ±50% | decoupling cap 부족 | 100nF + 10µF DUT 가까이 |

가장 큰 함정은 *west update*에서 *NCS 버전 mismatch*입니다. `west.yml`의 *revision*을 *명시적으로 tag*로 고정하지 않으면 *팀원마다 다른 SDK*로 빌드해서 *재현 불능 버그*가 생깁니다. 양산 프로젝트는 *west manifest를 git으로 관리*하고 *tag 단위로 업그레이드*하는 것이 안전합니다.

## 정리

- NCS는 *Zephyr 위에* Nordic 드라이버·BLE·sample을 얹은 *메타 SDK*입니다. 옛 SoftDevice + nRF5 SDK는 *deprecated*입니다.
- *west*가 빌드 entry. `west build -b <board> samples/<path>` + `west flash`가 표준 흐름입니다.
- *Kconfig*가 기능 토글, *devicetree*가 하드웨어 매핑입니다. 둘은 *상호 보완*입니다.
- *sample*이 *시작점*입니다. peripheral_uart, peripheral_hr, central_bas로 BLE 기본 패턴을 익힙니다.
- *Power Profiler Kit II*가 전력 측정의 사실상 표준입니다. *데이터시트 추정*은 거의 항상 50% 이상 오차가 납니다.
- *ESP32-C3 NimBLE*은 WiFi + BLE를 $2 안에 묶고, *STM32WB*는 듀얼 코어로 *라디오를 분리*합니다.
- 양산 프로젝트는 *NCS 버전을 west manifest로 고정*해야 재현 가능합니다.

## 다음 편

[Ch 12: BLE 디버깅 — Wireshark, BLE Sniffer, nRF Connect](/blog/embedded/wireless/getting-started-with-ble/chapter12-debugging)에서는 *보이지 않는 무선 트래픽*을 보는 도구들을 다룹니다. nRF52840 dongle + Wireshark sniffer, btmon, nRF Connect 모바일 앱, 그리고 흔한 버그 카탈로그까지 시리즈를 마무리합니다.

## 관련 항목

- [Ch 9: Connection 관리](/blog/embedded/wireless/getting-started-with-ble/chapter09-connection-management) — interval/latency 설정 코드
- [Ch 10: BLE 5의 진짜 변화](/blog/embedded/wireless/getting-started-with-ble/chapter10-ble5-features) — PHY/Extended API
- [Ch 12: BLE 디버깅](/blog/embedded/wireless/getting-started-with-ble/chapter12-debugging)
- [ESP32-C3 Mastering Ch 8: BLE 5.0 — GAP·GATT](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt) — NimBLE 비교
- [원문 — nRF Connect SDK Docs](https://docs.nordicsemi.com/bundle/ncs-latest/page/nrf/index.html)
- [원문 — Zephyr Bluetooth Stack](https://docs.zephyrproject.org/latest/connectivity/bluetooth/index.html)
- [원문 — Power Profiler Kit II](https://www.nordicsemi.com/Products/Development-hardware/Power-Profiler-Kit-2)
