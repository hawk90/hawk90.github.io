---
title: "Ch 6: 표준 서비스와 직접 만든 서비스"
date: 2026-05-08T06:00:00
description: "SIG가 정의한 표준 서비스(Battery, Heart Rate, HID 등) vs Custom Service. 언제 어느 쪽?"
series: "Getting Started with BLE"
seriesOrder: 6
tags: [ble, services, sig, custom, profiles]
type: book-review
bookTitle: "Getting Started with Bluetooth Low Energy"
bookAuthor: "Kevin Townsend et al."
draft: true
---

## 한 줄 요약

> **"표준에 있으면 무조건 표준 서비스를, 없으면 custom 128-bit UUID를 씁니다."** 표준 서비스의 가치는 *상호운용성*입니다. *iPhone의 기본 Heart Rate 앱*, *Android의 Bluetooth Settings*, *피트니스 플랫폼*이 모두 *handle을 모르고도 데이터를 해석*합니다. Custom은 *전용 앱과 펌웨어가 한 쌍*일 때만 의미가 있습니다.

5장의 GATT 모델은 *비어 있는 상자*입니다. 그 상자를 *어떻게 채우는가*가 6장의 주제입니다. SIG가 *100여 개의 표준 서비스*를 미리 정의해 두었습니다. 가능하면 그걸 따르는 게 *호환성·문서·도구* 모든 면에서 유리합니다.

이번 장에서는 *주요 표준 서비스 목록*, *16-bit Assigned Numbers의 의미*, *128-bit custom UUID의 패턴*, *Specification 문서를 읽는 법*을 다룹니다. 7장의 pairing은 *어떤 service를 어떤 보안 수준에서 노출할지*와 직결됩니다.

## 표준 서비스를 쓰는 이유

자체 service를 만드는 게 *훨씬 자유롭고 단순해 보입니다*. 그래도 *표준이 있으면 표준을 쓰라*는 이유는 다음과 같습니다.

| 이유 | 자세히 |
|------|--------|
| OS·앱 호환성 | iOS·Android의 *기본 앱*이 해석. Heart Rate 모니터는 *애플 워치 앱*과 바로 연동 |
| 도구 호환성 | nRF Connect, LightBlue가 *handle 모르고도* 값을 해석 |
| 문서 일관성 | *명세를 새로 안 써도* 됨. 동료가 spec 번호로 즉시 이해 |
| 인증 비용 | *Listed 디바이스*는 인증이 간편 |
| 미래 확장성 | SIG가 후속 *Profile*을 만들면 자동 호환 |

자체 service의 합리적 이유는 *표준에 정말 없는 데이터 모델*뿐입니다. 비콘의 raw payload, 정밀 측정기의 별도 포맷, *벤더 전용 OTA 채널* 등이 그런 예입니다.

## 16-bit Assigned Numbers — 표준 UUID의 출처

5장에서 *16-bit UUID는 SIG가 정한 것*이라고 했습니다. *전체 목록은 Bluetooth Assigned Numbers 문서*에 있습니다.

```text
구역 (16-bit UUID space)
0x1800 ~ 0x18FF   GATT Services
0x2700 ~ 0x27FF   GATT Units (단위 — Celsius, meter 등)
0x2800 ~ 0x28FF   GATT Attribute Types (Service, Characteristic 선언 등)
0x2900 ~ 0x29FF   GATT Descriptors
0x2A00 ~ 0x2BFF   GATT Characteristics
0x2C00 ~ 0xFCFF   Reserved for future
0xFD00 ~ 0xFDFF   Members Service UUIDs (회사 고유)
0xFE00 ~ 0xFEFF   Members Service UUIDs (회사 고유)
0xFF00 ~ 0xFFFF   Bluetooth SIG (proprietary, deprecated)
```

서비스가 모두 *0x18xx*에 모여 있어서 *제품 카테고리를 한눈에 알 수 있습니다*. Battery는 0x180F, Heart Rate는 0x180D, HID는 0x1812 같은 식입니다.

### 자주 쓰는 표준 서비스

| UUID | Service Name | 비고 |
|------|--------------|------|
| 0x1800 | Generic Access | GAP 자체, 모든 디바이스 필수 |
| 0x1801 | Generic Attribute | GATT 자체 (Service Changed) |
| 0x1802 | Immediate Alert | "Find My Phone" |
| 0x1803 | Link Loss | 연결 끊김 알림 |
| 0x1804 | Tx Power | 송신 출력 보고 |
| 0x1805 | Current Time | 시간 동기 |
| 0x1806 | Reference Time Update | 시간 보정 요청 |
| 0x1807 | Next DST Change | DST 알림 |
| 0x1808 | Glucose | 혈당 (의료기기) |
| 0x1809 | Health Thermometer | 체온계 |
| 0x180A | Device Information | 제조사·모델·펌웨어 ★ 거의 모든 디바이스 사용 |
| 0x180D | Heart Rate | 심박 모니터 |
| 0x180E | Phone Alert Status | 전화 알림 |
| 0x180F | Battery Service | 배터리 ★ 거의 모든 디바이스 사용 |
| 0x1810 | Blood Pressure | 혈압계 |
| 0x1811 | Alert Notification | 메시지 알림 (sms 등) |
| 0x1812 | Human Interface Device (HID) | 키보드·마우스·게임패드 |
| 0x1813 | Scan Parameters | 스캔 파라미터 보고 |
| 0x1814 | Running Speed and Cadence | 러닝 센서 |
| 0x1815 | Automation IO | IoT 일반 (LED·스위치 등) |
| 0x1816 | Cycling Speed and Cadence | 자전거 센서 |
| 0x1818 | Cycling Power | 자전거 파워미터 |
| 0x1819 | Location and Navigation | GPS 데이터 |
| 0x181A | Environmental Sensing | 온습도·기압 ★ IoT 센서 표준 |
| 0x181B | Body Composition | 체성분 |
| 0x181C | User Data | 사용자 프로필 |
| 0x181D | Weight Scale | 체중계 |
| 0x181E | Bond Management | 본드 관리 |
| 0x181F | Continuous Glucose Monitoring | 연속 혈당 |
| 0x1820 | Internet Protocol Support | IPv6 over BLE |
| 0x1822 | Pulse Oximeter | 산소포화도 |
| 0x1826 | Fitness Machine | 러닝머신·로잉머신 |
| 0x1827 | Mesh Provisioning | BLE Mesh |
| 0x1828 | Mesh Proxy | BLE Mesh |
| 0x1843 | Audio Input Control | LE Audio |
| 0x1844 | Volume Control | LE Audio |
| 0x1849 | Constant Tone Extension | AoA/AoD (5.1+) |
| 0x184E | Audio Stream Control | LE Audio |
| 0x1850 | Published Audio Capabilities | LE Audio |
| 0x1851 | Audio Input Control | LE Audio |
| 0x1856 | Telephone Bearer | LE Audio |

각 서비스마다 *별도 Specification PDF*가 있습니다. *bluetooth.com/specifications/specs*에서 무료로 받을 수 있습니다.

### 자주 쓰는 표준 Characteristic

| UUID | Characteristic | 소속 Service |
|------|----------------|--------------|
| 0x2A00 | Device Name | Generic Access |
| 0x2A01 | Appearance | Generic Access |
| 0x2A04 | Peripheral Preferred Conn Params | Generic Access |
| 0x2A05 | Service Changed | Generic Attribute |
| 0x2A19 | Battery Level | Battery Service |
| 0x2A24 | Model Number String | Device Information |
| 0x2A25 | Serial Number String | Device Information |
| 0x2A26 | Firmware Revision String | Device Information |
| 0x2A27 | Hardware Revision String | Device Information |
| 0x2A28 | Software Revision String | Device Information |
| 0x2A29 | Manufacturer Name String | Device Information |
| 0x2A37 | Heart Rate Measurement | Heart Rate |
| 0x2A38 | Body Sensor Location | Heart Rate |
| 0x2A39 | Heart Rate Control Point | Heart Rate |
| 0x2A4D | Report | HID |
| 0x2A4E | Protocol Mode | HID |
| 0x2A50 | PnP ID | Device Information |
| 0x2A6D | Pressure | Environmental Sensing |
| 0x2A6E | Temperature | Environmental Sensing |
| 0x2A6F | Humidity | Environmental Sensing |
| 0x2A76 | UV Index | Environmental Sensing |
| 0x2A77 | Irradiance | Environmental Sensing |
| 0x2AB4 | Boolean | Generic Boolean |

## 표준 서비스의 데이터 포맷

각 service의 *Characteristic 값 포맷*은 spec에 *바이트 단위로* 정의되어 있습니다.

### Battery Level (0x2A19)

값 — `1 byte, uint8, 0~100` (퍼센트). 예 — `0x55 → 85%`.

GATT 서버는 단순히 1 byte만 반환하면 된다. 폰의 기본 앱이 이걸 그대로 % 로 표시.

```c
uint8_t battery_level = 87;

static int battery_level_read(uint16_t conn_handle, uint16_t attr_handle,
                               struct ble_gatt_access_ctxt *ctxt, void *arg) {
    return os_mbuf_append(ctxt->om, &battery_level, sizeof(battery_level));
}
```

### Heart Rate Measurement (0x2A37)

```text
값: variable byte

Byte 0: Flags
  bit 0: HR value format (0=uint8, 1=uint16)
  bit 1: Sensor contact status detected
  bit 2: Sensor contact status supported
  bit 3: Energy expended present
  bit 4: RR-Interval present
  bits 5..7: Reserved

Byte 1~: Heart Rate Value (1 또는 2 byte)
Byte ...: Energy Expended (if flag bit 3)
Byte ...: RR-Interval (반복, if flag bit 4)
```

```c
typedef struct {
    uint8_t flags;
    uint8_t hr_value;  // bpm
} __attribute__((packed)) hr_measurement_t;

void notify_hr(uint16_t conn_handle, uint8_t bpm) {
    hr_measurement_t m = {
        .flags = 0x00,     // 8-bit value, no contact info, no energy, no RR
        .hr_value = bpm
    };
    struct os_mbuf *om = ble_hs_mbuf_from_flat(&m, sizeof(m));
    ble_gatts_notify_custom(conn_handle, hr_measurement_attr_handle, om);
}
```

### Temperature (0x2A6E, Environmental Sensing)

```text
값: 2 byte, sint16, 0.01 °C 단위

예: 0x09 09 = 2313 → 23.13 °C
예: 0xFF F6 = -10 → -0.10 °C

Presentation Format Descriptor (0x2904):
  Format = 0x0E (sint16)
  Exponent = 0xFE (-2)
  Unit = 0x272F (Celsius)
```

### HID Report (0x2A4D)

HID 키보드는 *Report Reference Descriptor (0x2908)*로 *Report ID와 종류*를 명시합니다. 키 한 번에 *수 byte*가 흐릅니다.

![HID Keyboard Input Report — 8 byte 구조](/images/blog/ble/diagrams/ch06-hid-keyboard-report.svg)

## Generic Access & Device Information — 모든 디바이스 필수

거의 모든 BLE 디바이스가 다음 두 서비스를 *기본 탑재*합니다.

### Generic Access (0x1800)

```text
Characteristics
  0x2A00 Device Name          UTF-8 string
  0x2A01 Appearance           uint16 (디바이스 아이콘 카테고리)
  0x2A04 Peripheral Preferred Connection Parameters
         uint16×4 (min interval, max interval, latency, supervision timeout)
```

*Appearance*는 *폰이 디바이스 아이콘을 그리는 데* 씁니다.

```text
0x0000  Unknown
0x0040  Phone
0x0080  Computer
0x00C0  Watch
0x0140  Heart Rate Sensor
0x0180  Blood Pressure
0x0200  HID Generic
0x03C0  Pulse Oximeter
0x0440  Outdoor Sports
```

### Device Information (0x180A)

```text
Characteristics (모두 string 또는 byte array, 모두 Read-only)
  0x2A29 Manufacturer Name String          "Acme Inc."
  0x2A24 Model Number String               "WidgetPro-3"
  0x2A25 Serial Number String              "SN-12345678"
  0x2A27 Hardware Revision String          "Rev B"
  0x2A26 Firmware Revision String          "1.4.2"
  0x2A28 Software Revision String          "1.4.2-build123"
  0x2A23 System ID                         8 byte (manufacturer ID + organization unique ID)
  0x2A50 PnP ID                            7 byte (Vendor ID Source + Vendor + Product + Version)
```

폰의 *Bluetooth 설정 페이지*가 이 정보를 그대로 보여 줍니다.

## Custom Service — 128-bit UUID 패턴

표준에 없는 데이터라면 *custom service*를 만듭니다.

### UUID 생성

```bash
# Linux / macOS
uuidgen
# 7A2D8E45-5C9F-4B12-A8D3-1E6F4B5C2A91

# Python
python3 -c "import uuid; print(uuid.uuid4())"
# c4d5e6f7-1234-4abc-9def-0123456789ab
```

### Base UUID + 16-bit offset 패턴

큰 프로젝트는 *한 base UUID를 잡고, 16-bit offset으로 service/char를 채웁니다*.

```text
Base UUID: 6E400000-B5A3-F393-E0A9-E50E24DCCA9E  (Nordic UART의 base)

Service:        6E400001-B5A3-F393-E0A9-E50E24DCCA9E  (UART Service)
RX Char:        6E400002-B5A3-F393-E0A9-E50E24DCCA9E  (Client → Server)
TX Char:        6E400003-B5A3-F393-E0A9-E50E24DCCA9E  (Server → Client, Notify)
```

이 패턴이 *몇 가지 장점*을 줍니다.

- *프로젝트 식별*이 base 16-bit로 한 번에 됨
- *광고 페이로드 절약* — Service UUID는 전체를 다 실어야 하지만, *개별 char은 base와 다른 부분만 알리면* 펌웨어가 짧음
- *디버깅 도구가 base를 등록*하면 *짧은 별칭*으로 표시

### Nordic UART Service (NUS) — Custom의 대표

NUS는 *de facto 표준*입니다. *시리얼 통신을 BLE로 흉내내는* 가장 단순한 패턴입니다.

**NUS Service** — `6E400001-B5A3-F393-E0A9-E50E24DCCA9E`.

| Characteristic | UUID | 동작 |
|----------------|------|------|
| RX (Write, Write Without Response) | `6E400002-...` | 클라이언트가 "보낼 데이터"를 write |
| TX (Notify) | `6E400003-...` | 서버가 "보낼 데이터"를 notify |

```c
#define NUS_SVC_UUID        BLE_UUID128_DECLARE(\
    0x9E, 0xCA, 0xDC, 0x24, 0x0E, 0xE5, 0xA9, 0xE0,\
    0x93, 0xF3, 0xA3, 0xB5, 0x01, 0x00, 0x40, 0x6E)

#define NUS_RX_CHR_UUID     BLE_UUID128_DECLARE(\
    0x9E, 0xCA, 0xDC, 0x24, 0x0E, 0xE5, 0xA9, 0xE0,\
    0x93, 0xF3, 0xA3, 0xB5, 0x02, 0x00, 0x40, 0x6E)

#define NUS_TX_CHR_UUID     BLE_UUID128_DECLARE(\
    0x9E, 0xCA, 0xDC, 0x24, 0x0E, 0xE5, 0xA9, 0xE0,\
    0x93, 0xF3, 0xA3, 0xB5, 0x03, 0x00, 0x40, 0x6E)

static int nus_rx_write(uint16_t conn_handle, uint16_t attr_handle,
                         struct ble_gatt_access_ctxt *ctxt, void *arg) {
    uint16_t len = OS_MBUF_PKTLEN(ctxt->om);
    char buf[256];
    ble_hs_mbuf_to_flat(ctxt->om, buf, sizeof(buf), &len);
    // 받은 데이터 처리
    process_received_data(buf, len);
    return 0;
}

static const struct ble_gatt_svc_def nus_svc = {
    .type = BLE_GATT_SVC_TYPE_PRIMARY,
    .uuid = NUS_SVC_UUID,
    .characteristics = (struct ble_gatt_chr_def[]) {
        {
            .uuid = NUS_RX_CHR_UUID,
            .access_cb = nus_rx_write,
            .flags = BLE_GATT_CHR_F_WRITE | BLE_GATT_CHR_F_WRITE_NO_RSP,
        },
        {
            .uuid = NUS_TX_CHR_UUID,
            .access_cb = NULL,
            .flags = BLE_GATT_CHR_F_NOTIFY,
            .val_handle = &nus_tx_handle,
        },
        { 0 }
    },
};
```

NUS는 *Nordic의 nRF Connect 앱*이 *기본 UI를 제공*합니다. 폰에서 *시리얼 모니터처럼* 사용 가능합니다.

## Specification 문서 읽는 법

표준 service를 구현할 때 *spec 문서*를 직접 봐야 합니다. 구조가 일관됩니다.

### 두 종류의 문서

| 종류 | 내용 |
|------|------|
| Service Specification | 한 service의 *Characteristic 목록과 요구 사항* |
| Profile Specification | 한 *application class*의 service 조합과 *행동 사양* |

예를 들어 *Heart Rate*는 두 문서가 있습니다.

**Heart Rate Service Specification 1.0:**

- Battery Service의 Characteristic 목록
- 각 Characteristic의 포맷과 권한

**Heart Rate Profile Specification 1.0:**

- 어떤 디바이스가 어떤 role을 가지는지
- Sensor (server) vs Collector (client)
- 필수 service / optional service
- 행동 — 측정 시작, 정지, 에너지 리셋 등

### Service Specification의 표 구조

§3 *Service Characteristics* — Heart Rate Service의 Characteristic 목록.

| Characteristic Name | Requirement | Properties |
|---------------------|-------------|------------|
| Heart Rate Measurement | Mandatory | Notify |
| Body Sensor Location | Optional | Read |
| Heart Rate Control Point | Conditional\* | Write |

\* Conditional — *Energy Expended*를 지원하면 필수.

§4 *Characteristic Descriptors*:

- Heart Rate Measurement에는 CCCD가 필수
- Heart Rate Control Point에는 권한 정보 descriptor 필요

### Profile Specification의 행동 사양

**6.1 Service Discovery.** Collector는 GATT discovery로 Heart Rate Service의 Characteristic을 찾는다. Body Sensor Location이 없으면 다음 step으로 넘어간다.

**6.2 Configure Notification.** Collector는 Heart Rate Measurement의 CCCD에 Notification ON을 쓴다.

**6.3 Reception.** Sensor가 측정 시마다 Notification을 보낸다.

**6.4 Error Handling.** Collector는 ATT 에러 응답 시 ...

직접 spec을 따르는 게 *재발명을 막고, 향후 호환성을 보장*합니다.

## SIG-Adopted vs Custom — 결정 흐름

![SIG-Adopted vs Custom Decision Flow](/images/blog/ble/diagrams/ch06-sig-vs-custom-flow.svg)

### 혼합 패턴 — 가장 흔한 양산 구성

대부분의 IoT 디바이스는 *표준 + custom의 혼합*입니다.

**필수 표준 서비스**

- Generic Access (0x1800) — ★ 모든 디바이스 필수
- Generic Attribute (0x1801) — ★ 모든 디바이스 필수
- Device Information (0x180A) — 디바이스 식별
- Battery Service (0x180F) — 배터리 표시

**애플리케이션 표준 서비스 (해당되면)**

- Environmental Sensing (0x181A) — 온도·습도·압력 등
- Heart Rate (0x180D) — 헬스
- HID (0x1812) — 키보드 등

**Custom 서비스**

- OTA Update Service — 펌웨어 업데이트
- Vendor Configuration Service — 캘리브레이션 등 벤더 전용

이 구성이 *모든 폰의 표준 앱과 호환*되면서 *벤더 전용 기능*도 모두 노출 가능합니다.

## 자주 하는 실수와 troubleshooting

| 실수 | 해결 |
|------|------|
| 표준 service UUID에 자기 정의 char 추가 | spec 위반. custom service로 분리 |
| Battery Level을 32-bit float로 송신 | spec은 uint8 0~100. spec 따르기 |
| Heart Rate를 1 byte로 송신 (spec은 flags+value) | Flags byte 0x00 prefix 추가 |
| Custom service의 16-bit UUID 발급 | 16-bit는 SIG 등록 디바이스만. 128-bit 사용 |
| 표준 service에 read 권한 빠뜨림 | Battery Level은 read 필수 |
| 같은 service 두 instance 등록 | Spec이 *single instance only*면 위반 |
| NUS를 표준이라 부름 | De facto이지만 SIG 표준 아님. custom임을 명시 |
| Device Information을 안 넣음 | 폰 설정에서 정보 안 뜸. 거의 필수 |
| Generic Access 빠뜨림 | BLE 스택이 자동 추가하지만 확인 필요 |

## 정리

- *SIG는 100여 개의 표준 service*를 정의합니다. 데이터가 *표준에 매칭되면 무조건 표준*을 씁니다.
- 16-bit UUID 공간은 *카테고리별로 잘 정리*되어 있습니다. *0x18xx는 service, 0x2Axx는 characteristic, 0x29xx는 descriptor*입니다.
- *Generic Access (0x1800), Generic Attribute (0x1801), Device Information (0x180A), Battery Service (0x180F)*는 거의 모든 디바이스의 기본입니다.
- *각 service마다 spec PDF*가 있고, *Profile spec*은 *application class의 행동*을 추가로 정합니다.
- *Custom service*는 *128-bit UUID*가 필수입니다. *uuidgen으로 생성*하고, *base UUID + 16-bit offset 패턴*이 실전에 편합니다.
- *Nordic UART Service (NUS)*는 *de facto 표준*입니다. *시리얼을 BLE로* 가장 간단히 구현합니다.
- *양산 디바이스는 표준 + custom 혼합*입니다. 표준은 *호환성*, custom은 *벤더 전용 기능*을 채웁니다.
- *Spec 위반*은 *폰 기본 앱과의 호환 실패*로 직결됩니다. 표준 service에 *임의 char를 추가하지 말아야* 합니다.

## 다음 편

[Ch 7: Pairing·Bonding — BLE 보안의 핵심](/blog/embedded/wireless/getting-started-with-ble/chapter07-pairing-bonding)에서 *연결의 보안*을 다룹니다. *Just Works, Passkey Entry, Numeric Comparison, OOB*의 4가지 association model, *LE Secure Connections의 ECDH*, *IRK/LTK/CSRK의 키 분배*까지 정리합니다.

## 관련 항목

- [Ch 5: GATT — 데이터 모델](/blog/embedded/wireless/getting-started-with-ble/chapter05-gatt)
- [Ch 7: Pairing·Bonding](/blog/embedded/wireless/getting-started-with-ble/chapter07-pairing-bonding)
- [Ch 11: nRF Connect SDK 실전](/blog/embedded/wireless/getting-started-with-ble/chapter11-nrf-connect-sdk) — 표준 service 구현 예
- [ESP32-C3 Mastering Ch 8: BLE 5.0](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt) — Battery Service 실전
- [Embedded Security Ch 7: Side-Channel](/blog/embedded/embedded-security/chapter07-side-channel) — BLE 암호화의 사이드채널
- [원문 — Bluetooth Assigned Numbers](https://www.bluetooth.com/specifications/assigned-numbers/)
- [원문 — Bluetooth Specifications List](https://www.bluetooth.com/specifications/specs/)
- [원문 — Nordic UART Service](https://infocenter.nordicsemi.com/topic/sdk_nrf5_v17.1.0/ble_sdk_app_nus_eval.html)
