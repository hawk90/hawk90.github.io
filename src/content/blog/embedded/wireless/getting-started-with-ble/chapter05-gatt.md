---
title: "Ch 5: GATT — Generic Attribute Profile, 데이터 모델"
date: 2026-05-08T05:00:00
description: "Service → Characteristic → Descriptor 3층. 모든 BLE 애플리케이션 데이터의 골격."
series: "Getting Started with BLE"
seriesOrder: 5
tags: [ble, gatt, service, characteristic, descriptor]
type: book-review
bookTitle: "Getting Started with Bluetooth Low Energy"
bookAuthor: "Kevin Townsend et al."
draft: false
---

## 한 줄 요약

> **"GATT는 *Service → Characteristic → Descriptor*의 3계층 트리입니다. 모든 BLE 애플리케이션의 데이터는 이 트리의 *Attribute*에 얹힙니다."** 가장 흔한 *오용*은 *Attribute = Characteristic*으로 착각하는 것입니다. 실제로는 *Service도, Characteristic도, Descriptor도 모두 Attribute*이고, GATT가 그 위에 *의미*를 부여합니다.

3장에서 본 ATT는 *handle 단위로 값을 읽고 쓰는 무미한 프로토콜*이었습니다. GATT는 ATT 위에 *Service·Characteristic·Descriptor의 모델*을 얹어 *구조와 의미*를 부여합니다. 6장의 *표준 서비스*와 *Custom 서비스*는 이 GATT 모델을 *어떻게 채우는지*의 문제입니다.

이번 장에서는 *Attribute의 4가지 요소*, *Service/Characteristic 선언이 실제로 어떤 Attribute로 풀리는지*, *CCCD가 왜 별개의 Descriptor인지*, *MTU 협상으로 throughput을 어떻게 끌어올리는지*를 다룹니다.

## Attribute — 모든 것의 기본 단위

GATT 트리의 *모든 노드*는 *Attribute*입니다. Attribute는 *4가지 요소*로 구성됩니다.

```text
┌─────────────────────────────────────┐
│         Attribute                   │
├─────────────────────────────────────┤
│ Handle      : uint16 (예: 0x002A)   │ ← 위치 식별자, 1부터 시작
│ Type        : UUID (16 또는 128 bit) │ ← 무엇인지 (Service? Char? ...)
│ Value       : variable byte         │ ← 실제 데이터
│ Permission  : read/write/auth/...   │ ← 누가 어떻게 접근 가능
└─────────────────────────────────────┘
```

| 요소 | 크기 | 의미 |
|------|------|------|
| Handle | 2 byte | 디바이스 안에서 unique한 식별자. 1부터 증가 |
| Type | 2 또는 16 byte | 이 Attribute가 무엇을 나타내는지 (UUID) |
| Value | 0~512 byte | 실제 데이터 |
| Permission | - | Read, Write, Authentication, Authorization 등 |

*Handle*은 *디바이스 내부*에서만 의미가 있습니다. 다른 디바이스의 같은 service라도 *handle 번호는 다를 수 있습니다*. 그래서 *클라이언트는 GATT discovery로 매번 handle을 알아냅니다*.

*Type*은 *UUID*로 표현합니다. *16-bit UUID*는 *SIG가 미리 정한 의미*가 있고, *128-bit UUID*는 *자체 정의*입니다.

## UUID — 짧은 것과 긴 것

```text
16-bit UUID (예: 0x180F)
  = 128-bit Base UUID + 16-bit (offset 위치에 끼움)
  = 0000180F-0000-1000-8000-00805F9B34FB
              ─────── Bluetooth Base UUID ───────

32-bit UUID (드물게 사용)
  = 0000180F-0000-1000-8000-00805F9B34FB의 32-bit 자리

128-bit UUID (자체)
  = uuidgen으로 생성
  = 6E400001-B5A3-F393-E0A9-E50E24DCCA9E (Nordic UART)
```

```bash
# Linux/macOS: 새 128-bit UUID 생성
uuidgen
# 출력: 7A2D8E45-5C9F-4B12-A8D3-1E6F4B5C2A91
```

16-bit를 쓰면 *광고 페이로드와 ATT 트래픽이 짧아집니다*. SIG에 등록된 service면 항상 16-bit를 씁니다. 자체 service만 128-bit를 씁니다.

```text
ATT 한 PDU의 크기 차이
Read By Group Type Response (Service Discovery)
  16-bit UUID Service:   handle(2) + endHandle(2) + UUID(2) = 6 byte per entry
  128-bit UUID Service:  handle(2) + endHandle(2) + UUID(16) = 20 byte per entry
```

## Service — Attribute의 묶음

Service는 *논리적으로 관련된 Characteristic의 묶음*입니다. *Service Declaration*이라는 Attribute로 시작합니다.

```text
Service Declaration Attribute
  Handle    = 0x0010 (예)
  Type      = 0x2800 (Primary Service)
           또는 0x2801 (Secondary Service)
  Value     = Service의 UUID (16 또는 128 bit)
  Permission = Read only

Service의 끝은 어디?
→ 다음 Service Declaration이 나오기 직전까지가 한 Service
```

| Type UUID | 의미 |
|-----------|------|
| 0x2800 | Primary Service (독립적으로 의미 있는 service) |
| 0x2801 | Secondary Service (다른 service에 포함되는 보조 service) |
| 0x2802 | Include (다른 service를 포함) |
| 0x2803 | Characteristic Declaration |

대부분의 service는 *Primary*입니다. Secondary는 *Include로 다른 service에 포함될 때*만 의미가 있어서 *실전에서는 드뭅니다*.

## Characteristic — 실제 데이터 + 속성

Characteristic은 *한 데이터 항목*입니다. *두 개의 Attribute*로 표현됩니다.

```text
1. Characteristic Declaration (Attribute)
   Handle    = 0x0020
   Type      = 0x2803 (Characteristic Declaration)
   Value     = Properties(1B) || ValueHandle(2B) || UUID(2 or 16B)
   Permission = Read only

2. Characteristic Value (Attribute)
   Handle    = 0x0021 (= 위의 ValueHandle)
   Type      = Characteristic의 UUID (예: 0x2A19 Battery Level)
   Value     = 실제 데이터 (예: 1 byte의 0~100)
   Permission = Properties에 따라
```

*두 개의 Attribute가 한 Characteristic을 만든다*는 게 처음 볼 때 헷갈리는 부분입니다. 첫 번째는 *메타데이터*, 두 번째는 *실제 값*입니다.

### Properties Byte

```text
Properties (1 byte)
┌────┬────┬────┬────┬────┬────┬────┬────┐
│Bcst│Read│WrNR│Wrte│Ntfy│Indc│SgnW│Ext │
└────┴────┴────┴────┴────┴────┴────┴────┘
 0x01 0x02 0x04 0x08 0x10 0x20 0x40 0x80

Read   (0x02): ATT Read Request로 읽기 가능
WrNR   (0x04): Write Without Response (응답 없는 쓰기)
Wrte   (0x08): Write Request (응답 있는 쓰기)
Ntfy   (0x10): Notification (서버 → 클라, 응답 없음)
Indc   (0x20): Indication (서버 → 클라, 확인 응답 필요)
SgnW   (0x40): Authenticated Signed Write
Ext    (0x80): Extended Properties (별도 descriptor에 추가)
```

흔한 조합입니다.

| Characteristic | Properties | 의미 |
|---------------|-----------|------|
| Battery Level | Read \| Notify | 폰이 읽거나, 변화 시 알림 받기 |
| Heart Rate | Notify | 측정 시마다 알림 |
| RGB LED Color | Write | 폰이 색을 씀 |
| Button State | Read \| Notify | 현재 상태 읽기 + 변화 알림 |
| Firmware Update | Write Without Response | 빠른 업로드용 |

## Descriptor — Characteristic의 메타

*Descriptor*는 *Characteristic의 추가 정보*입니다. 같은 Characteristic 영역에 들어가는 *추가 Attribute*입니다.

```text
SIG가 미리 정한 Descriptor UUID
0x2900  Characteristic Extended Properties
0x2901  Characteristic User Description (사람이 읽는 이름)
0x2902  Client Characteristic Configuration (CCCD) ← 핵심
0x2903  Server Characteristic Configuration
0x2904  Characteristic Presentation Format
0x2905  Characteristic Aggregate Format
0x2906  Valid Range
0x2907  External Report Reference (HID)
0x2908  Report Reference (HID)
```

가장 중요한 것은 *CCCD (Client Characteristic Configuration Descriptor)*입니다.

### CCCD — Notify/Indicate 활성화

```text
CCCD Attribute (UUID 0x2902)
  Value = 2 byte
    0x0000 : Notification, Indication 모두 OFF
    0x0001 : Notification 활성화 (bit 0)
    0x0002 : Indication 활성화 (bit 1)

Permission = Read | Write (클라이언트가 직접 씀)
```

*Notify/Indicate property가 있는 Characteristic*은 *반드시 CCCD를 옆에 둬야 합니다*. 클라이언트가 *CCCD에 0x0001을 쓰면* 그때부터 서버가 notification을 보냅니다. 안 쓰면 서버는 *아무리 데이터가 바뀌어도 침묵*합니다.

```text
Client → Server
12 30 00 01 00
│  │  │  │  │
│  │  │  └──┴── value 0x0001 (Notification ON)
│  └──┴──────── handle 0x0030 (CCCD)
└────────────── ATT Write Request (0x12)

Server → Client
13                ← ATT Write Response (성공)

(이후 데이터 변화 시)
Server → Client
1B 2A 00 5C
│  │  │  └── new value (예: 92)
│  └──┴───── value handle 0x002A
└─────────── Handle Value Notification (0x1B)
```

### User Description

```text
UUID 0x2901
Value = UTF-8 string (예: "Living Room Temperature")
```

폰 앱이 *사용자에게 보여줄 이름*입니다. 같은 디바이스에 *여러 개의 같은 service*가 있을 때 구분에 유용합니다.

### Presentation Format

```text
UUID 0x2904
Value (7 byte)
  Format(1B) || Exponent(1B signed) || Unit(2B UUID) || NameSpace(1B) || Description(2B)

예: 온도 (단위: °C, 0.1°C 해상도)
  Format    = 0x0E (sint16)
  Exponent  = 0xFF (-1, 즉 ×10⁻¹)
  Unit      = 0x272F (Celsius)
  NameSpace = 0x01 (Bluetooth SIG)
  Description = 0x0000
```

Format Byte 종류 (자주 쓰는 것).

```text
0x01 boolean
0x04 uint8
0x06 uint16
0x08 uint32
0x0C sint8
0x0E sint16
0x10 sint32
0x14 float32 (IEEE-754)
0x19 UTF-8 string
```

## 전체 GATT 데이터베이스 예 — Heart Rate

표준 *Heart Rate Service (0x180D)*의 GATT 데이터베이스입니다.

```text
┌────────┬────────┬─────────────────────────────────┬─────────┬────────────┐
│ Handle │  Type  │           Description           │  Value  │ Permission │
├────────┼────────┼─────────────────────────────────┼─────────┼────────────┤
│ 0x0010 │ 0x2800 │ Primary Service                 │ 0x180D  │ R          │
│ 0x0011 │ 0x2803 │ Characteristic Declaration       │ 10|12,00│ R          │
│        │        │ Properties=Notify(0x10)         │ |37,2A  │            │
│        │        │ ValueHandle=0x0012, UUID=0x2A37 │         │            │
│ 0x0012 │ 0x2A37 │ Heart Rate Measurement (value)  │ ...     │ none*      │
│ 0x0013 │ 0x2902 │ CCCD                            │ 00 00   │ R/W        │
│ 0x0014 │ 0x2803 │ Characteristic Declaration       │ 02|15,00│ R          │
│        │        │ Properties=Read(0x02)           │ |38,2A  │            │
│        │        │ ValueHandle=0x0015, UUID=0x2A38 │         │            │
│ 0x0015 │ 0x2A38 │ Body Sensor Location (value)    │ 0x02    │ R          │
│ 0x0016 │ 0x2803 │ Characteristic Declaration       │ 08|17,00│ R          │
│        │        │ Properties=Write(0x08)          │ |39,2A  │            │
│        │        │ ValueHandle=0x0017, UUID=0x2A39 │         │            │
│ 0x0017 │ 0x2A39 │ Heart Rate Control Point (val)  │ ...     │ W          │
└────────┴────────┴─────────────────────────────────┴─────────┴────────────┘

* Notify-only는 ATT read permission이 없어도 됨
* 클라이언트는 CCCD에 0x0001을 써서 notify 활성화
```

이 트리를 *클라이언트는 어떻게 발견*하는가?

```text
1. ATT Read By Group Type Request, Type=0x2800
   → 모든 Primary Service의 [handle, endHandle, UUID] 목록
2. ATT Read By Type Request, Type=0x2803 (within service range)
   → 각 service 안의 Characteristic 선언 목록
3. ATT Find Information Request (within characteristic range)
   → 각 characteristic의 Descriptor 목록 (CCCD 등)
4. ATT Write Request, handle=CCCD, value=0x0001
   → notify 활성화
```

이 4단계를 *Service Discovery*라고 부릅니다. *연결 직후 1회만* 수행하고, 이후로는 캐시를 씁니다 (5.1의 GATT Caching).

## NimBLE — Battery Service 예제

```c
#include "host/ble_hs.h"
#include "services/gap/ble_svc_gap.h"
#include "services/gatt/ble_svc_gatt.h"

static uint8_t battery_level = 87;
static uint16_t battery_level_attr_handle;

// Characteristic access callback
static int battery_level_access(uint16_t conn_handle, uint16_t attr_handle,
                                 struct ble_gatt_access_ctxt *ctxt, void *arg)
{
    switch (ctxt->op) {
    case BLE_GATT_ACCESS_OP_READ_CHR:
        return os_mbuf_append(ctxt->om, &battery_level, sizeof(battery_level));
    default:
        return BLE_ATT_ERR_UNLIKELY;
    }
}

// GATT 서비스 정의
static const struct ble_gatt_svc_def gatt_svcs[] = {
    {
        .type = BLE_GATT_SVC_TYPE_PRIMARY,
        .uuid = BLE_UUID16_DECLARE(0x180F),          // Battery Service
        .characteristics = (struct ble_gatt_chr_def[]) {
            {
                .uuid = BLE_UUID16_DECLARE(0x2A19),  // Battery Level
                .access_cb = battery_level_access,
                .flags = BLE_GATT_CHR_F_READ | BLE_GATT_CHR_F_NOTIFY,
                .val_handle = &battery_level_attr_handle,
            },
            { 0 } // terminator
        },
    },
    { 0 } // terminator
};

void gatt_svr_init(void)
{
    ble_svc_gap_init();
    ble_svc_gatt_init();
    ble_gatts_count_cfg(gatt_svcs);
    ble_gatts_add_svcs(gatt_svcs);
}

// 1초마다 배터리 레벨 notify
void battery_notify_task(void *arg)
{
    uint16_t conn_handle = (uint16_t)(uintptr_t)arg;
    while (1) {
        struct os_mbuf *om = ble_hs_mbuf_from_flat(&battery_level, 1);
        ble_gatts_notify_custom(conn_handle, battery_level_attr_handle, om);
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}
```

NimBLE이 *CCCD를 자동으로 추가*합니다. `BLE_GATT_CHR_F_NOTIFY` 플래그만 주면 됩니다.

## ATT MTU — Throughput의 핵심

ATT MTU는 *한 PDU의 최대 크기*입니다. *기본값 23 byte*이고, *Exchange MTU Request*로 늘릴 수 있습니다.

```text
ATT MTU 23 (default)
  payload 실용: 23 - 3 (ATT 헤더) = 20 byte
  notification 한 번에 20 byte 데이터

ATT MTU 247 (NimBLE 기본 max)
  payload 실용: 247 - 3 = 244 byte
  notification 한 번에 244 byte → 12배 throughput

ATT MTU 517 (스펙 최대)
  payload 실용: 517 - 3 = 514 byte
```

### MTU 협상

```text
Client → Server
02 47 00         ← Exchange MTU Request, client MTU = 247

Server → Client
03 90 00         ← Exchange MTU Response, server MTU = 144

협상 결과: min(247, 144) = 144
이후 모든 ATT 트래픽이 144 byte MTU를 따름
```

연결 직후 *한 번만* 협상합니다. 클라이언트가 *Exchange MTU Request*를 보내야 협상이 시작됩니다. iOS는 *자동으로 185 byte*를 요청합니다. Android는 *Android 5+*가 *517*까지 요청 가능합니다.

### NimBLE에서 MTU 늘리기

```c
// 부팅 시
ble_att_set_preferred_mtu(247);

// 연결 후 능동적으로 협상 시작
ble_gattc_exchange_mtu(conn_handle, NULL, NULL);

// MTU 변경 이벤트
case BLE_GAP_EVENT_MTU:
    ESP_LOGI("ble", "MTU updated to %d", event->mtu.value);
    break;
```

### DLE와 MTU의 관계

3장에서 본 *Data Length Extension*은 LL 계층의 payload를 251 byte까지 늘립니다. *ATT MTU > 27*이면 *반드시 DLE도 협상*되어야 한 ATT PDU가 *여러 LL PDU로 fragment* 됩니다.

```text
ATT MTU 247, DLE 251 활성화
  ATT PDU 244 byte → L2CAP 248 byte → LL 한 PDU (DLE)
  → 1 connection event 안에 다 송신

ATT MTU 247, DLE 미활성 (27 byte 한계)
  ATT PDU 244 byte → L2CAP 248 byte → LL 11개로 fragment
  → 11개 CE 필요, throughput 1/11
```

DLE 미활성 시 *MTU만 늘려도 효과가 작습니다*. 양쪽 다 협상되어야 진짜 빠릅니다.

## GATT 연산 — Read/Write/Notify/Indicate

| 연산 | 방향 | 응답 | 한 PDU 최대 |
|------|------|------|------------|
| Read | C → S | Read Response | MTU - 1 byte |
| Read Long | C → S | 여러 번 Read Blob | 누적 512 byte |
| Read Multiple | C → S | 한 번에 여러 handle | MTU - 1 byte |
| Write | C → S | Write Response | MTU - 3 byte |
| Write Without Response | C → S | 없음 | MTU - 3 byte |
| Long Write | C → S | Prepare Write × N + Execute | 누적 512 byte |
| Reliable Write | C → S | Prepare Write × N (CRC 포함) + Execute | 누적 512 byte |
| Notification | S → C | 없음 | MTU - 3 byte |
| Indication | S → C | Confirmation | MTU - 3 byte |

### Notify vs Indicate

*Notification*은 *fire-and-forget*입니다. 빠르지만 *유실 가능*합니다 (실제로 BLE의 reliable한 특성상 거의 안 잃지만, ATT 레벨에선 보장 안 됨).

*Indication*은 *Confirmation을 받아야 다음 indication을 보낼 수 있습니다*. 안전하지만 *throughput이 절반 이하*입니다.

| 항목 | Notification | Indication |
|------|-------------|------------|
| 응답 | 없음 | Confirmation 필요 |
| 다음 송신 | 즉시 가능 | Confirmation 받아야 |
| 사용 | 빈번한 센서 데이터 | 중요한 알림 |
| 예 | Heart Rate, Sensor stream | Battery Critical, Alarm |

## 자주 하는 실수와 troubleshooting

| 증상 | 원인 | 해결 |
|------|------|------|
| notify를 켰는데 폰에 도착 안 함 | CCCD 클라이언트가 안 켬 | 앱에서 setNotification(true) |
| write 한 후 응답이 안 옴 | Write Without Response 썼는데 응답 기대 | Write Request로 변경 |
| ATT MTU 늘렸는데 throughput 안 올라감 | DLE 미활성 | 양쪽 DLE 설정 확인 |
| characteristic value 512 byte 초과 | ATT 한계 | 여러 characteristic로 분리 |
| 같은 UUID 여러 service 발견 | 실제 그렇게 등록함 | custom UUID 분리 또는 instance별 user description |
| 서비스 discovery 매번 느림 | GATT caching 안 함 | Service Changed 0x2A05 활성화 |
| notify 대량 송신 시 일부 누락 | 버퍼 부족 | 송신 후 ble_gattc_indicate_resp 또는 backpressure |
| 폰에 service 이름이 안 보임 | User Description (0x2901) 없음 | descriptor 추가 |

## 정리

- 모든 *Service, Characteristic, Descriptor*는 본질적으로 *Attribute*입니다. Attribute는 *handle + type(UUID) + value + permission* 4요소로 구성됩니다.
- *Service Declaration (0x2800)*이 service의 시작이고, *다음 0x2800이 나오기 전까지*가 한 service입니다.
- Characteristic은 *Declaration Attribute (0x2803) + Value Attribute (실제 UUID)* 두 개로 표현됩니다. Properties가 *Read/Write/Notify/Indicate*를 정합니다.
- *CCCD (0x2902)*는 *클라이언트가 notify/indicate를 켜는 스위치*입니다. 서버는 이 비트가 켜져 있을 때만 송신합니다.
- *UUID*는 *16-bit (SIG 표준) vs 128-bit (custom)*입니다. 16-bit는 짧고 빠르고, 128-bit는 자체 service에 필수입니다.
- *ATT MTU*는 *기본 23 byte → 협상으로 247 또는 517*까지. *DLE도 같이 활성*해야 진짜 throughput이 나옵니다.
- *Notification*은 빠르고 fire-and-forget, *Indication*은 안전하지만 *Confirmation 대기*로 throughput이 낮습니다.
- GATT discovery는 *연결 직후 1회*이고, *5.1의 GATT Caching*이 *재접속 시 매번 다시 안 하게* 만들었습니다.

## 다음 편

[Ch 6: 표준 서비스와 직접 만든 서비스](/blog/embedded/wireless/getting-started-with-ble/chapter06-services-characteristics)에서 *SIG가 정의한 표준 서비스(Battery, Heart Rate, HID 등)*와 *자체 정의 custom service*를 비교합니다. *언제 표준을 쓰고 언제 custom을 만드는지*, *Specification 문서를 읽는 법*까지 다룹니다.

## 관련 항목

- [Ch 3: 프로토콜 스택](/blog/embedded/wireless/getting-started-with-ble/chapter03-protocol-stack) — ATT/GATT 계층
- [Ch 4: GAP](/blog/embedded/wireless/getting-started-with-ble/chapter04-gap)
- [Ch 6: 표준 서비스와 Custom 서비스](/blog/embedded/wireless/getting-started-with-ble/chapter06-services-characteristics)
- [Ch 7: Pairing·Bonding](/blog/embedded/wireless/getting-started-with-ble/chapter07-pairing-bonding) — GATT permission과 보안
- [ESP32-C3 Mastering Ch 8: BLE 5.0](/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt)
- [원문 — Bluetooth Core Spec Vol 3 Part F (ATT)](https://www.bluetooth.com/specifications/specs/core-specification-5-4/)
- [원문 — Bluetooth Core Spec Vol 3 Part G (GATT)](https://www.bluetooth.com/specifications/specs/core-specification-5-4/)
- [원문 — Apache NimBLE GATT API](https://mynewt.apache.org/latest/network/ble_hs/ble_gatts.html)
