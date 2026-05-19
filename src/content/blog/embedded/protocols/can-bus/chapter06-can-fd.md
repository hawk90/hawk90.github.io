---
title: "Ch 6: CAN FD — Flexible Data-Rate (5 Mbps × 64 byte)"
date: 2026-05-16T06:00:00
description: "Bosch 2012. 중재는 그대로 1 Mbps, 데이터만 가속 5 Mbps. 페이로드 8 → 64 byte."
series: "CAN Bus 심화"
seriesOrder: 6
tags: [can-fd, flexible-data-rate, bosch, iso-11898-1]
draft: true
---

## 한 줄 요약

> **"중재는 천천히, 데이터만 빠르게"** — CAN의 우선순위 시스템은 그대로 두고, 페이로드 구간만 5 Mbps로 가속.

## 어떤 문제를 푸는가

CAN 2.0의 한계:
- 페이로드 **8 byte** — ECU 메모리 dump, 펌웨어 OTA에 부족.
- 최대 **1 Mbps** — 카메라 데이터 등 고대역에 부적합.

해결책 후보:
1. CAN 클럭 그냥 올리기 → *중재 latency* 깨짐, 긴 버스 못 씀.
2. 별도 전용 버스 (FlexRay) → *비싸고 복잡*.
3. **CAN FD** — 중재 phase는 그대로, 데이터 phase만 가속.

Bosch가 2012년 CAN FD 발표, ISO 11898-1:2015 표준화. 자동차 새 ECU의 *기본*이 되어 가는 중.

## 한눈에 보는 구조

![CAN FD frame compared to CAN 2.0](/images/blog/can-bus/diagrams/ch06-can-fd-frame.svg)

CAN 2.0 frame과 비교. *중재 phase*는 동일, *BRS bit*에서 클럭 가속, *CRC + ACK*까지 빠른 속도, *그 후 원속도 복귀*.

## CAN 2.0 vs CAN FD — 핵심 차이

| 항목 | CAN 2.0 | CAN FD |
| --- | --- | --- |
| **Arbitration 클럭** | 1 Mbps | 1 Mbps (동일) |
| **Data 클럭** | 1 Mbps | **5 Mbps** (또는 8) |
| **Payload** | 0-8 byte | **0-64 byte** |
| **CRC 다항식** | 15-bit | 17-bit (≤16B) / **21-bit** (>16B) |
| **DLC 해석** | 0-15 → 0-8 byte | 0-15 → 0-64 byte 매핑 |
| **호환성** | 표준 | CAN 2.0 노드와 *섞이면 문제* (FD-Tolerant 모드 필요) |

## 새 비트들 — FDF·BRS·ESI

| 비트 | 의미 |
| --- | --- |
| **FDF** (Flexible Data Format) | 1 = CAN FD, 0 = CAN 2.0 (구 r0 비트) |
| **res** | reserved, dominant |
| **BRS** (Bit Rate Switch) | 1 = data phase 가속, 0 = data phase도 원속도 |
| **ESI** (Error State Indicator) | 송신 노드의 error state — Active(0) / Passive(1) |

### Bit Rate Switching 동작

```text
arbitration phase (1 Mbps)        data phase (5 Mbps)         arbitration (1 Mbps)
SOF | ID | RTR | FDF | r | BRS | ESI | DLC | Data | CRC | ACK | EOF
                                   ↑                            ↑
                              여기부터 5 Mbps                 여기서 1 Mbps 복귀
```

BRS 직전에 트랜시버가 *fast mode* 전환. CRC delimiter에서 *원속도 복귀*. 결과 — **중재는 모든 노드 같은 속도**, 데이터는 *고속 호환 노드끼리만*.

## DLC 매핑 — 8 → 64

```text
DLC 0-8  → 0-8 byte    (CAN 2.0과 동일)
DLC 9    → 12 byte
DLC 10   → 16 byte
DLC 11   → 20 byte
DLC 12   → 24 byte
DLC 13   → 32 byte
DLC 14   → 48 byte
DLC 15   → 64 byte
```

> 💡 9-15가 *불연속*. 페이로드 17 byte짜리는 *없음*. 20 byte 보내거나 16 + 16으로 분할.

## CRC 강화

CAN 2.0의 15-bit CRC는 *bit stuffing*과 결합해 *간헐 미감지*. CAN FD에선:

- ≤ 16 byte payload: **CRC-17**
- > 16 byte payload: **CRC-21**

+ **Stuff Count** 필드 추가 → bit stuffing 카운트 검증 → *stuff-related 에러* 더 잘 감지.

## 호환성 — FD-Tolerant vs FD-Active

CAN FD 표준 정의:

- **FD-Active** — CAN FD 송수신 가능 (모던 ECU)
- **FD-Tolerant** — CAN FD 프레임을 *무시*하지만 *에러 일으키지 않음* (기존 CAN 2.0 노드 + 패치)
- **CAN 2.0 only** — CAN FD 프레임 보면 *에러* → 버스 망

→ 같은 버스에 CAN 2.0과 CAN FD 섞으려면 *모든 CAN 2.0 노드가 FD-Tolerant*여야. 신차 설계는 *FD-Active* 일원화.

## STM32 FDCAN 페리퍼럴

STM32H7·G4 등 모던 STM32는 *FDCAN 페리퍼럴* (구 bxCAN 대체). HAL `FDCAN_HandleTypeDef` 사용.

```c
FDCAN_HandleTypeDef hfdcan1;

void can_fd_init(void) {
    hfdcan1.Instance = FDCAN1;
    hfdcan1.Init.FrameFormat = FDCAN_FRAME_FD_BRS;  // FD + BRS
    hfdcan1.Init.Mode = FDCAN_MODE_NORMAL;
    hfdcan1.Init.AutoRetransmission = ENABLE;
    hfdcan1.Init.TransmitPause = DISABLE;
    hfdcan1.Init.ProtocolException = DISABLE;

    // Arbitration: 500 kbps (nominal)
    hfdcan1.Init.NominalPrescaler = 8;
    hfdcan1.Init.NominalTimeSeg1 = 13;
    hfdcan1.Init.NominalTimeSeg2 = 2;
    hfdcan1.Init.NominalSyncJumpWidth = 1;

    // Data: 2 Mbps (BRS phase)
    hfdcan1.Init.DataPrescaler = 2;
    hfdcan1.Init.DataTimeSeg1 = 13;
    hfdcan1.Init.DataTimeSeg2 = 2;
    hfdcan1.Init.DataSyncJumpWidth = 1;

    HAL_FDCAN_Init(&hfdcan1);
}
```

## 트랜시버 요구

CAN 2.0 트랜시버 (TJA1051) — *5 Mbps 못 견딤*. CAN FD에는 **fast transceiver** 필요:

- **TJA1043 BSF**, **TJA1463** (NXP)
- **TCAN1043** (TI)
- 일반 *Symbol rate ≤ 5 Mbps* (CAN FD), ≤ 8 Mbps (CAN FD SIC)

PCB도 *더 짧은 stub, matched length* 필요.

## 응용 — 어디 쓰나

- **ECU 펌웨어 OTA** — 64 byte payload로 빠른 download
- **카메라 ROI 데이터** — 압축한 영역 ROI 결과 전송
- **차량 진단** (UDS over CAN FD) — 1.5x 빠른 진단 세션
- **AUTOSAR Classic + Adaptive** — 새 AUTOSAR 표준이 CAN FD 권장

## 자주 하는 실수

> ⚠️ Data prescaler 잘못

CAN FD에서 *data prescaler*가 *arbitration prescaler*의 *정수배 또는 약수*여야 — 클럭 동기. ST CubeMX의 *automatic calculator* 활용 권장.

> ⚠️ 옛 노드와 섞기

CAN 2.0 노드 (FD-Tolerant 아닌)와 CAN FD 노드 같은 버스 → *Bus Off 폭격*. 버스 분리.

> ⚠️ 트랜시버 fast mode 미지원

저가 TJA1051 사용 + 5 Mbps 시도 → *signal 깨짐*. 트랜시버 데이터시트의 *최대 symbol rate* 확인.

> ⚠️ Stub 길이 안 줄임

CAN 2.0에서 *0.3 m stub OK*였지만 CAN FD 5 Mbps에서는 *0.1 m 이하* 필요. PCB 재설계.

## 정리

- CAN FD = **중재 = 1 Mbps**, **데이터 = 5 Mbps**, **payload = 64 byte**.
- *BRS·FDF·ESI* 새 비트.
- CRC-17 / CRC-21 + Stuff Count로 에러 감지 강화.
- CAN 2.0과 같은 버스 공존엔 *모든 CAN 2.0 노드 FD-Tolerant* 필요.
- 트랜시버·PCB 모두 *fast mode* 대응 필요.

다음 편은 **CAN FD 프레임 상세** — 각 필드 비트별, 실제 캡처 예.

## 관련 항목

- [Ch 5: 에러 처리](/blog/embedded/protocols/can-bus/chapter05-error-handling)
- [Ch 7: CAN FD 프레임 상세](/blog/embedded/protocols/can-bus/chapter07-can-fd-frame)
- [Ch 8: CAN XL](/blog/embedded/protocols/can-bus/chapter08-can-xl)
