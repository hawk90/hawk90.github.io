---
title: "Ch 7: CAN FD 프레임 상세 — 비트별 분석, ISO vs Non-ISO"
date: 2027-04-01T07:00:00
description: "FDF·res·BRS·ESI 4 새 비트와 그 위치. ISO 11898-1:2015 vs Non-ISO (Bosch 원본) 호환성."
series: "CAN Bus 심화"
seriesOrder: 7
tags: [can-fd, brs, esi, fdf, frame, iso, non-iso]
draft: true
---

## 한 줄 요약

> **"CAN 2.0 프레임 + 4 새 비트 + CRC 강화 = CAN FD"** — 비트 단위로 보면 어디서 갈라지고 어디서 합쳐지는지 명확.

## 전체 프레임 — 비트별

![CAN FD Standard Data Frame — bit by bit](/images/blog/can-bus/diagrams/ch07-can-fd-frame-detail.svg)

Standard ID + FD + BRS 활성 case.

### Arbitration Phase (Nominal Bit Rate, 500 kbps 가정)

| 필드 | 비트 수 | 값/의미 |
| --- | --- | --- |
| SOF | 1 | dominant |
| Identifier (Standard) | 11 | 11-bit ID |
| RRS | 1 | reserved (CAN 2.0의 RTR 자리) — recessive |
| IDE | 1 | dominant = Standard (Extended면 추가 ID 18-bit + r1) |
| **FDF** | 1 | recessive = CAN FD (구 CAN 2.0의 r0 자리) |
| **res** | 1 | reserved, dominant |
| **BRS** | 1 | 1 = data phase 가속, 0 = data phase도 nominal |
| **ESI** | 1 | 0 = Error Active 송신, 1 = Error Passive |

### Data Phase (Fast Bit Rate, 2-5 Mbps)

`BRS = 1`이면 ESI 직후부터 *fast bit rate*.

| 필드 | 비트 수 | 값/의미 |
| --- | --- | --- |
| DLC | 4 | 0-15 매핑 (다음 표 참조) |
| Data | 0-512 | DLC에 따른 payload |
| Stuff Count | 4 | bit stuffing 카운트 (Gray code) + parity |
| CRC | 17 또는 21 | CRC-17 (≤16B) / CRC-21 (>16B) |

### CRC delimiter 후 → Nominal Rate 복귀

| 필드 | 비트 수 | 의미 |
| --- | --- | --- |
| CRC delim | 1 (recessive) | CRC 종료 — *여기서 nominal rate 복귀* |
| ACK slot | 1 | 수신자가 dominant로 ACK |
| ACK delim | 1 (recessive) | — |
| EOF | 7 (recessive) | End of Frame |
| IFS | 3 | Inter-Frame Space |

## DLC 매핑 — 자세히

```text
DLC = 0  →  0 byte
DLC = 1-8 →  1-8 byte    (CAN 2.0 호환)
DLC = 9  →  12 byte
DLC = 10 →  16 byte
DLC = 11 →  20 byte
DLC = 12 →  24 byte
DLC = 13 →  32 byte
DLC = 14 →  48 byte
DLC = 15 →  64 byte
```

> ⚠️ **DLC = 11이면 정확히 20 byte**. 17-19 byte 데이터를 보낼 수 없음 → 20으로 padding (3 byte unused) 또는 *분할 송신*.

## Stuff Count — Bit Stuffing 무결성 검증

CAN 2.0의 *간헐 CRC 미감지* 약점 보완. **Stuff Count 필드**가 *해당 프레임에서 발생한 stuff bit 개수*를 인코딩 + 패리티.

```text
Stuff Count = (stuff bits 수) mod 8
인코딩: 3-bit Gray code + 1-bit parity = 4 bit
```

수신자가 자체 stuff bit 카운트와 비교 → *일치 안 하면 CRC Error*. Stuff 자체에서 발생한 노이즈를 잡음.

## CRC 다항식

### CRC-17 (Payload ≤ 16 byte)

`x^17 + x^16 + x^14 + x^13 + x^11 + x^6 + x^4 + x^3 + x + 1`

### CRC-21 (Payload > 16 byte)

`x^21 + x^20 + x^13 + x^11 + x^7 + x^4 + x^3 + 1`

> 💡 CRC 계산 범위 — *SOF부터 Stuff Count 끝까지*. *de-stuffed* (stuff bit 제외) 비트열에 대해.

## ISO vs Non-ISO CAN FD

**Bosch 원본 (2012)** 과 **ISO 11898-1:2015** 사이에 *CRC 계산 방식*이 살짝 다름.

| | Non-ISO (Bosch 원본) | ISO 11898-1:2015 |
| --- | --- | --- |
| Stuff Count | 없음 | 4-bit |
| CRC 시작 비트 | CRC 자체 비트 = 0 으로 시작 | CRC 자체 비트 = 1 (모두 1) 으로 시작 |
| CRC 범위 | de-stuffed bits | de-stuffed bits + Stuff Count |
| 호환성 | 옛 시제품 칩 | 양산 표준 |

→ ISO 모드와 Non-ISO 모드는 *상호 호환 안 됨*. 같은 버스의 모든 노드가 *같은 모드*여야.

STM32 FDCAN — `Init.NonISOOperation = ENABLE` 또는 `DISABLE`. **양산 칩은 거의 모두 ISO**, 옛 *시제품 단계* 칩만 Non-ISO. 새 프로젝트는 ISO만.

## Loopback 신호 — Bit-Level

![CAN FD bit-level timing — BRS transition](/images/blog/can-bus/diagrams/ch07-can-fd-brs-transition.svg)

BRS 비트 직전·직후 *클럭 분주*가 변경되는 트랜지션을 그림으로. 트랜시버가 *이 시점에 fast mode 전환*해야 데이터 phase 가속이 정상 동작.

## STM32 FDCAN 송수신

```c
FDCAN_TxHeaderTypeDef tx_header;
uint8_t data[64];

tx_header.Identifier = 0x123;
tx_header.IdType = FDCAN_STANDARD_ID;
tx_header.TxFrameType = FDCAN_DATA_FRAME;
tx_header.DataLength = FDCAN_DLC_BYTES_64;    // 64 byte
tx_header.FDFormat = FDCAN_FD_CAN;            // CAN FD format
tx_header.BitRateSwitch = FDCAN_BRS_ON;       // BRS = 1
tx_header.ErrorStateIndicator = FDCAN_ESI_ACTIVE;

HAL_FDCAN_AddMessageToTxFifoQ(&hfdcan1, &tx_header, data);
```

수신 콜백에서 `header.FDFormat`, `header.BitRateSwitch` 확인 → 적절히 처리.

## Filter 변화

CAN FD 페리퍼럴은 *32-bit filter element*. CAN 2.0의 *16-bit filter 두 개*보다 정밀. STM32 FDCAN의 `FDCAN_FilterTypeDef`:

```c
FDCAN_FilterTypeDef filter;
filter.IdType = FDCAN_STANDARD_ID;
filter.FilterIndex = 0;
filter.FilterType = FDCAN_FILTER_MASK;
filter.FilterConfig = FDCAN_FILTER_TO_RXFIFO0;
filter.FilterID1 = 0x100;             // ID
filter.FilterID2 = 0x7F0;             // Mask (0x100-0x10F 매치)
HAL_FDCAN_ConfigFilter(&hfdcan1, &filter);
```

## 자주 하는 실수

> ⚠️ ISO vs Non-ISO 불일치

새 보드가 ISO, 옛 보드가 Non-ISO → *Bus Off 폭격*. 모두 ISO로 일원화.

> ⚠️ Non-FDCAN 페리퍼럴에서 FD 송신 시도

옛 STM32F4의 bxCAN은 *CAN 2.0 전용*. FD 송신 시도 시 *Format Error*. FDCAN 페리퍼럴이 있는 칩 (G4·H7·U5 등)으로 교체.

> ⚠️ DLC 9-15의 *연속성 가정*

DLC = 11이면 *정확히 20 byte*. 18 byte 보내려면 *20 byte로 padding*. 사용자 프로토콜에 *실제 길이 필드* 별도 필요.

> ⚠️ Data phase 클럭 prescaler 계산 잘못

Nominal·Data 클럭의 *공통 분주기* 잘 맞지 않으면 *간헐 비트 에러*. CubeMX의 *bit timing tool* 활용.

## 정리

- CAN FD = CAN 2.0 + **FDF·BRS·ESI·Stuff Count** 4 새 비트.
- DLC 9-15 = 12·16·20·24·32·48·64 byte (불연속).
- **CRC-17** (≤16B) / **CRC-21** (>16B) + Stuff Count 패리티.
- **ISO** vs **Non-ISO** 호환 안 됨 — 양산은 ISO만.
- **BRS = 1**이면 ESI 후 ~ CRC delim 전까지 *fast bit rate*.

다음 편은 **CAN XL** — 10 Mbps, 페이로드 2048 byte.

## 관련 항목

- [Ch 6: CAN FD 개요](/blog/embedded/protocols/can-bus/chapter06-can-fd)
- [Ch 8: CAN XL](/blog/embedded/protocols/can-bus/chapter08-can-xl)
