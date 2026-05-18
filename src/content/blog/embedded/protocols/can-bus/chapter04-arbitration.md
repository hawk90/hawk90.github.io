---
title: "Ch 4: CAN 중재 — Non-Destructive Priority Arbitration"
date: 2027-04-01T04:00:00
description: "낮은 ID가 무조건 이긴다. 충돌 없이 자동으로 우선순위 결정 — CAN의 가장 우아한 부분."
series: "CAN Bus 심화"
seriesOrder: 4
tags: [can, arbitration, csma-ca, priority, latency]
draft: true
---

## 한 줄 요약

> **"낮은 ID 이김"** — 두 노드가 동시에 송신 시작해도 *충돌 없이* 자동 결정. Bit-level wired-AND가 마법.

## 어떤 문제를 푸는가

여러 ECU가 *동시에 송신*하면 어떻게 충돌을 해결? 일반 네트워크의 답:

- **Ethernet (CSMA/CD)** — 충돌 감지 → *random backoff* → 비결정성, 자동차 부적합.
- **Token Ring** — 토큰 전달, 결정성 OK이지만 토큰 보관 노드 실패 시 복잡.
- **TDMA** — 시간 슬롯 분할, FlexRay 채택, 클럭 동기 필요.

CAN의 답 — **CSMA/CA + bit-level priority**. 충돌 없이 *비파괴적*으로 자동 결정.

## CSMA/CA 흐름

| 단계 | 동작 |
| --- | --- |
| **Carrier Sense** | 노드가 송신 전 *버스 idle 확인* (IFS 후 11+ recessive) |
| **Multiple Access** | 여러 노드가 동시에 송신 시작 가능 |
| **Collision Avoidance** | 동시 송신 시 *비트 단위로 모니터링*, 자기 비트 ≠ 버스 비트면 *양보* |

## 한눈에 보는 중재

![CAN arbitration — two nodes race](/images/blog/can-bus/diagrams/ch04-can-arbitration.svg)

두 노드 A·B가 동시 송신:
- A: ID = `0001 0100 010` (= 0x0A2)
- B: ID = `0001 0100 100` (= 0x0A4)

ID 8번째 비트에서 *A는 0 (dominant) 송신*, *B는 1 (recessive) 송신*. 버스 *wired-AND* 결과는 *0*. B는 *자기 데이터(1) ≠ 버스(0)* 감지 → **양보**. A 계속 송신.

## 핵심 — Dominant Wins

```text
A 송신: 0 1 0 0 1 0 1 0 0 ...   (보내는 비트)
B 송신: 0 1 0 0 1 0 1 1 0 ...
버스:    0 1 0 0 1 0 1 0 0 ...   ← wired-AND (A·B)
                       ↑
                  여기서 B 양보
```

규칙 — **자기 송신 비트와 버스 비트가 다르면 즉시 양보**. *재전송은 자동* — 다음 idle에 다시 시도.

## "비파괴적" 의미

Ethernet의 충돌 — *양쪽 다 데이터 손실*, backoff 후 재전송. CAN의 양보 — **이긴 노드는 손실 없음**, 계속 송신. 진 노드만 다음 기회 기다림.

→ 최고 우선순위 ID는 *항상 deterministic latency* 보장.

## 우선순위 ID 설계 전략

ID 비트는 *MSB가 높은 우선순위*. 설계 시 다음 비트들로 *우선순위 인코딩*:

```text
ID = [PRIO (3-bit)] [GROUP (4-bit)] [NODE (4-bit)]
     ↓               ↓                ↓
   0 = critical    엔진(0)·바디(1)·... 노드 번호
```

CANopen·J1939는 자체 ID 체계를 정의 (각각 9·10편).

### Latency 보장의 조건

| ID | 보장 |
| --- | --- |
| 최고 우선순위 (예 0x000) | 즉시 송신 — 다음 IFS 후 |
| 중간 | 더 높은 ID가 *없을 때* 송신 |
| 최저 | 버스 idle 시에만 — 최악의 경우 *영원히 못 보냄* |

→ **Starvation 가능**. 안전 설계 — 최저 우선순위에 *재전송 카운트 + 절대 deadline* 추가.

## Worst-Case Response Time (WCRT)

자동차 ECU 설계의 핵심 분석. 메시지 m의 WCRT:

```text
WCRT(m) = blocking + interference + own transmission

blocking = max(transmission_time(lower_prio_msg))   # 이미 시작된 낮은 우선순위 양보 못 함
interference = Σ ceil(WCRT(m) / period(h)) × C(h)    # 더 높은 우선순위 메시지
own = bit_count(m) × bit_time
```

이 식이 *수렴*하면 메시지 m은 deadline 만족. 발산하면 *우선순위 재설계* 필요.

Rate Monotonic Analysis (RMA) — Liu & Layland 정리 적용 가능 (정확한 분석은 *Tindell·Hansson*).

## Bit Stuffing이 latency에 미치는 영향

8 byte payload = 47 + 64 = 111 bit. Stuff 최악 = +19 bit → 130 bit. 500 kbps에서 *260 µs*. 한 메시지가 다른 메시지를 *최대 260 µs* 막을 수 있음.

자동차 설계에선 *bit stuffing 고려한 WCRT*를 계산.

## 페리퍼럴 동작

MCU CAN 페리퍼럴은 *TX FIFO·Mailbox*에 송신 대기 메시지 보관. 페리퍼럴이 자동으로:

1. 버스 idle 감지
2. SOF + ID 송신
3. *Bit-level monitor* — 자기 비트 ≠ 버스면 *즉시 송신 중단, ACK 대기로 전환*
4. 양보 시 *Mailbox 유지* (재전송)
5. 다음 idle에 자동 재시도

> 💡 **STM32는 3개 TX Mailbox**. 같은 mailbox 내에서는 *priority* (mailbox 안에 등록한 메시지의 ID) 또는 *TXFP* (FIFO 우선) 모드 선택.

## STM32 HAL — Mailbox 우선순위 모드

```c
hcan1.Init.TimeTriggeredMode = DISABLE;
hcan1.Init.AutoBusOff = ENABLE;          // bus-off 시 자동 복구
hcan1.Init.AutoWakeUp = DISABLE;
hcan1.Init.AutoRetransmission = ENABLE;  // 양보 후 재전송
hcan1.Init.ReceiveFifoLocked = DISABLE;
hcan1.Init.TransmitFifoPriority = DISABLE;  // ID-based priority
```

`AutoRetransmission = DISABLE` 시 — 양보하면 *재전송 안 함* → 메시지 손실. 일반적으론 *enable*.

## 중재 도중 에러 발생

송신 중 *Bit Error* (자기 dominant 보냈는데 recessive) → 양보일 수도, error일 수도. 페리퍼럴이 구분:

- **Arbitration field에서 mismatch** = 양보 (정상).
- **Data·CRC에서 dominant→recessive 받음** = Bit Error (에러).
- **Recessive→dominant 받음** = 양보 또는 error frame echo.

이 규칙이 *5편 (에러 처리)*에서 자세히.

## 실측 예 — 자동차 파워트레인 CAN

500 kbps, 메시지 평균 8 byte:
- 1 message = 130 bit / 500k = **260 µs**
- Idle window 평균 = IFS 3 bit + 다른 메시지 = ~100 µs
- 초당 메시지 ~3000 (모든 ECU 합산)
- 버스 이용률 = 260 × 3000 / 1,000,000 = **78%**

→ 자동차 CAN 설계 가이드라인: **버스 이용률 ≤ 30-40%** 권장 (여유 + WCRT 보장).

## 자주 하는 실수

> ⚠️ ID 충돌

두 노드가 *같은 ID*로 송신 시도 → arbitration이 끝까지 결정 못 함 → *Bit Error 또는 한쪽 무한 양보*. ID는 *전체 시스템에서 unique*.

> ⚠️ 우선순위를 *순서*로 착각

CAN ID는 *우선순위*만, *전송 순서*는 아님. 낮은 우선순위 ID는 *언제든* 보낼 수 있으나, 더 높은 게 있으면 양보.

> ⚠️ Critical 메시지에 낮은 우선순위

브레이크 신호를 0x600 (낮은 우선) → 응급 시 *지연*. *낮은 ID 부여*가 안전 설계.

> ⚠️ Periodic 메시지 ID를 인접하게

ID 0x101, 0x102, 0x103 같이 인접하면 *동시 송신* 시 0x101이 두 번 이겨버려 *나머지 지연*. **분산 배치**.

## 정리

- CAN = **CSMA/CA + non-destructive priority**.
- Dominant(0)가 recessive(1)을 덮음 — 낮은 ID 무조건 승.
- 진 노드는 *다음 idle*에 자동 재시도.
- 우선순위 설계 = **WCRT 분석**으로 deadline 보장.
- 버스 이용률 30-40% 이내로 여유.

다음 편은 **에러 처리** — Error counter, fault confinement, bus-off.

## 관련 항목

- [Ch 3: 프레임 구조](/blog/embedded/protocols/can-bus/chapter03-frame)
- [Ch 5: 에러 처리](/blog/embedded/protocols/can-bus/chapter05-error-handling)
