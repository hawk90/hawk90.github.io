---
title: "Ch 5: 에러 처리 — Counter, Active·Passive·Bus-Off, Fault Confinement"
date: 2026-05-16T05:00:00
description: "결함 노드가 버스를 막지 못하게 — TEC/REC 카운터로 자동 격리하는 우아한 상태기계."
series: "CAN Bus 심화"
seriesOrder: 5
tags: [can, error, fault-confinement, bus-off, tec, rec]
draft: true
---

## 한 줄 요약

> **"고장 노드를 스스로 격리시킨다"** — 에러 카운터가 임계값 넘으면 *송신 권한 박탈* → 버스 보호.

## 5가지 에러 종류 (복습)

| 에러 | 원인 |
| --- | --- |
| **Bit Error** | 송신 비트 ≠ 모니터링 비트 (단, 중재·ACK 제외) |
| **Stuff Error** | 6+ 연속 동일 비트 |
| **CRC Error** | CRC 불일치 |
| **Form Error** | 고정 비트 (Delim, EOF) 규칙 위반 |
| **ACK Error** | 송신자가 ACK slot에 dominant 못 받음 |

## 한눈에 보는 상태 머신

![CAN error state machine](/images/blog/can-bus/diagrams/ch05-can-fault-confinement.svg)

세 상태 + 카운터 → 자동 전이.

## Error Counter 두 종류

각 노드 내부:

- **TEC** (Transmit Error Counter) — 송신 중 발생 에러
- **REC** (Receive Error Counter) — 수신 중 발생 에러

### 증가·감소 규칙 (요약)

| 사건 | TEC | REC |
| --- | --- | --- |
| 송신 중 에러 | +8 | — |
| 수신 중 에러 | — | +1 (또는 +8 특수) |
| 성공적 송신 | -1 | — |
| 성공적 수신 | — | -1 |

세부 규칙은 ISO 11898-1 §10.2에 12 조항. 핵심 — *에러 일으킨 쪽 더 빨리 증가*.

## 3가지 상태

### Error Active (정상)

- TEC < 128 *and* REC < 128
- 에러 감지 시 *Active Error Flag* (6 dominant bit) 송신 → 다른 노드도 인지

### Error Passive (경고)

- TEC ≥ 128 *or* REC ≥ 128
- *Passive Error Flag* (6 recessive bit) — 다른 노드에 *전파 안 됨*
- 자기 에러는 알지만 *버스에 영향 줄이기*

### Bus Off (격리)

- TEC ≥ 256
- **송신 불가**, 수신만 가능
- 자기가 *결함*이라고 판정 — 버스에서 자동 격리

## Bus-Off 복구

자동 복구는 ISO 표준에 *옵션*:

- **자동 복구** — 128 × 11 연속 recessive bit 관찰 후 *Error Active*로 복귀
- **수동 복구** — 사용자 코드가 명시적으로 reset

자동차에선 *자동 복구* 채택이 많음. STM32 HAL의 `AutoBusOff = ENABLE`이 그것.

## 왜 이렇게 설계됐나

**고장 격리** (fault confinement) — 한 결함 노드가 *버스 전체*를 막지 못하게.

- **고장 ECU**: 송신마다 bit error → TEC 급증 → 256 도달 → bus off → *조용해짐*
- **다른 ECU**: 그 고장 ECU의 에러 프레임은 REC +1만 → 정상 동작 유지

이 설계 덕분에 *한 ECU 고장이 차 전체를 멈추지 않음*. 자동차 안전의 핵심.

## 디버깅 — Error Counter 모니터링

페리퍼럴 레지스터에서 TEC·REC 읽기:

```c
// STM32 — ESR register
uint32_t esr = hcan1.Instance->ESR;
uint8_t tec = (esr >> 16) & 0xFF;
uint8_t rec = (esr >> 24) & 0xFF;

// 상태 비트
bool error_passive = esr & CAN_ESR_EPVF;
bool bus_off       = esr & CAN_ESR_BOFF;
bool last_error    = (esr >> 4) & 0x07;  // LEC: last error code

printf("TEC=%d REC=%d %s%s LEC=%d\n",
       tec, rec,
       error_passive ? "PASSIVE " : "",
       bus_off ? "BUS-OFF " : "",
       last_error);
```

### LEC (Last Error Code) 해석

| LEC | 의미 |
| --- | --- |
| 0 | No error |
| 1 | Stuff error |
| 2 | Form error |
| 3 | ACK error |
| 4 | Bit recessive error |
| 5 | Bit dominant error |
| 6 | CRC error |
| 7 | Set by SW (or no change) |

부팅 시 *TEC=0, REC=0*. 시스템 안정 후 TEC가 *조금씩 늘면* 송신 측 문제, REC 늘면 *수신 측* 또는 *버스 노이즈*.

## 흔한 에러 시나리오

### 단일 노드 단독 부팅 — ACK Error

다른 노드 없음 → 송신 시 ACK 없음 → ACK Error → TEC +8 매 송신. 32 시도 후 *Passive*, 128 시도 후 *Bus Off*. 해결 — *loopback mode* 또는 *2번째 노드 추가*.

### 잘못된 Bit Timing

다른 노드들과 *sample point 또는 prescaler 불일치* → 데이터 비트마다 *Bit Error* → 빠른 Bus Off.

### 종단 없음

*반사*로 데이터 깨짐 → 간헐 CRC/Bit Error. 카운터가 *천천히 증가* → 운영 중 갑자기 Bus Off.

### 트랜시버 결함

V_DD 부족, 핀 short, ESD 손상 → *반복 Bit Error*. 트랜시버 교체.

## STM32 — Error Callback

```c
void HAL_CAN_ErrorCallback(CAN_HandleTypeDef *hcan) {
    uint32_t err = HAL_CAN_GetError(hcan);

    if (err & HAL_CAN_ERROR_EPV)
        log_error("Error Passive");
    if (err & HAL_CAN_ERROR_BOF)
        log_error("Bus Off");
    if (err & HAL_CAN_ERROR_ACK)
        log_error("ACK error");
    if (err & HAL_CAN_ERROR_STF)
        log_error("Stuff error");
    // ...

    HAL_CAN_ResetError(hcan);
}
```

## 자주 하는 실수

> ⚠️ 에러 카운터 무시

운영 중 *TEC = 30 ~ 50*에서 머무름 → "동작은 함" → 실은 *간헐 에러 누적*. 카운터를 정기 폴링하거나 *Error Warning Limit* 인터럽트로 감시.

> ⚠️ Bus Off 후 즉시 retry

자동 복구도 *128 × 11 bit (~3 ms @ 500 kbps)* 필요. 그 사이 송신 시도 → 페리퍼럴 무시. *복구 완료 콜백* 기다리기.

> ⚠️ Bus Off 재시작 무한 루프

복구 후 *근본 원인 안 고침* → 다시 Bus Off. 안전 시스템은 *복구 시도 횟수 제한* + fallback (예: 별도 LED, 백업 ECU).

> ⚠️ Loopback에서 에러 처리 안 함

Loopback mode는 *자기 ACK*이라 ACK Error 없음. 실 버스 시험 전 *normal mode* 변경 필수.

## 정리

- CAN 에러 = **5가지 종류** + TEC/REC 카운터.
- **Error Active → Passive → Bus Off** 자동 전이.
- *Bus Off가 곧 격리* — 차 전체 멈춤 방지.
- 운영 중 **TEC/REC 모니터링**이 디버깅 1차.
- Bus Off 자동 복구는 *옵션* — auto 또는 manual 선택.

다음 편은 **CAN FD** — Flexible Data-Rate, 5 Mbps + 64 byte payload.

## 관련 항목

- [Ch 4: 중재](/blog/embedded/protocols/can-bus/chapter04-arbitration)
- [Ch 6: CAN FD](/blog/embedded/protocols/can-bus/chapter06-can-fd)
