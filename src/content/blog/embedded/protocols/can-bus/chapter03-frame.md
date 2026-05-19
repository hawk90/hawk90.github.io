---
title: "Ch 3: CAN 2.0 프레임 — Standard·Extended·Remote·Error·Overload"
date: 2026-05-16T03:00:00
description: "5가지 프레임 종류와 각 필드의 의미. Bit stuffing과 CRC까지."
series: "CAN Bus 심화"
seriesOrder: 3
tags: [can, frame, standard-id, extended-id, bit-stuffing, crc]
draft: true
---

## 한 줄 요약

> **"5가지 프레임 + 13 필드"** — Standard 데이터 프레임이 95%. 나머지 4종은 *특수 상황*용.

## CAN 프레임 5종

| 종류 | 용도 | 빈도 |
| --- | --- | --- |
| **Data Frame** (Standard, 11-bit ID) | 일반 데이터 송신 | 95% |
| **Data Frame** (Extended, 29-bit ID) | 더 많은 ID 공간 (J1939) | 흔함 |
| **Remote Frame** | 데이터 *요청* | 옛 시스템 |
| **Error Frame** | 에러 감지·전파 | 비정상 시 |
| **Overload Frame** | 수신자 *잠시 멈춰* | 거의 안 봄 |

## 한눈에 보는 구조

![CAN 2.0 Standard Data Frame](/images/blog/can-bus/diagrams/ch03-can-frame.svg)

Standard frame의 13 필드. SOF부터 EOF까지 *비트 단위*로 정렬.

## Standard Data Frame — 13 필드 상세

| 필드 | 비트 | 의미 |
| --- | --- | --- |
| **SOF** | 1 (dominant) | Start of Frame |
| **Identifier** | 11 | 우선순위 + 메시지 ID |
| **RTR** | 1 | Remote Transmission Request (0 = data, 1 = remote) |
| **IDE** | 1 | Identifier Extension (0 = Standard) |
| **r0** | 1 | reserved (dominant) |
| **DLC** | 4 | Data Length Code (0-8) |
| **Data** | 0-64 | Payload (0-8 byte) |
| **CRC** | 15 | Cyclic Redundancy Check |
| **CRC Delim** | 1 (recessive) | CRC 구분자 |
| **ACK Slot** | 1 | 수신자가 dominant로 응답 |
| **ACK Delim** | 1 (recessive) | ACK 구분자 |
| **EOF** | 7 (recessive) | End of Frame |
| **IFS** | 3 | Inter-Frame Space |

총 최소 47 비트 + payload. 8 byte payload 시 = 47 + 64 = **111 bit** (bit stuffing 전).

## Identifier — 우선순위

11-bit ID 중 *작은 값이 높은 우선순위*. 0x000이 최고, 0x7FF가 최저.

```text
0x000 - 0x07F : 최고 (긴급 — 브레이크, 충돌 감지)
0x080 - 0x1FF : 안전 관련 (ABS, ESP)
0x200 - 0x3FF : 일반 운전 (엔진, 변속)
0x400 - 0x5FF : 바디 (도어, 라이트)
0x600 - 0x7FF : 최저 (진단, 정보)
```

이 *관습*은 시스템 설계자가 결정. 표준이 강제하진 않음.

### Extended ID (29-bit)

`IDE = 1`이면 11-bit + 18-bit = **29-bit** ID. 5억 가지 ID 공간. J1939·OBD-II UDS가 사용.

```text
SRR (1) | IDE (1) | ID-18 (18) | RTR (1) | r1, r0 (2) | DLC (4) | ...
```

Standard와 *같은 버스에 공존* 가능. 우선순위 — Standard ID 우선 (SRR = recessive, Standard SOF dominant 후 ID).

## DLC와 Data

DLC (Data Length Code) 4-bit, 그러나 *실제 데이터 길이는 0-8 byte*만:

| DLC | Data 길이 |
| --- | --- |
| 0 | 0 byte |
| 1-7 | 그 수의 byte |
| 8 | 8 byte |
| 9-15 | 8 byte (예약, 일부 8 해석) |

> 💡 **DLC ≠ data 길이가 *항상* 일치하진 않음**. 9-15는 8 byte로 처리. CAN FD에서 확장.

## CRC — 15-bit

`x^15 + x^14 + x^10 + x^8 + x^7 + x^4 + x^3 + 1` 다항식. SOF부터 Data 끝까지 계산.

수신자가 자체 CRC 계산 후 *불일치*면 *Error Frame* 발생. 신뢰성의 핵심.

## Bit Stuffing — 동기화 유지

![CAN bit stuffing (tikz-timing)](/images/blog/can-bus/diagrams/ch03-can-bit-stuffing.svg)

연속 5비트 동일이면 *반대 비트* 1개 삽입 (송신자). 수신자가 *제거*. 이유:

- CAN은 *별도 클럭 라인 없음*. 클럭 회복은 *비트 엣지*로.
- 같은 비트가 6개 이상 연속이면 *엣지 안 옴* → 클럭 drift.

```text
원본:    00000 1 11111 0 ...
                ↑         ↑
            stuff bit  stuff bit (반대 비트)
실제 송신: 000000 111110 ...
```

Bit stuffing은 SOF부터 CRC 끝까지 적용, **ACK 이후 (CRC delim, ACK, EOF)는 미적용**.

### Bit Stuffing의 부작용 — Worst Case

8 byte payload + 헤더 = 47 + 64 = 111 bit. Bit stuffing으로 *최대 19 bit 추가* → 130 bit. 500 kbps에서 **260 µs**.

## ACK — 수신자의 도장

송신자가 *ACK slot*을 recessive로 보냄. 수신 OK한 *모든 노드*가 그 자리에서 dominant로 덮어씀.

```text
송신자: ... CRC | r |       | r | EOF | ...   ("내가 보냄, ACK 받을 준비")
수신자:               D                       ("받았다")
실제:    ... CRC | r |   D   | r | EOF | ...
                    ↑       ↑
                CRC Delim  ACK Delim
                       ACK Slot
```

> ⚠️ **자기 자신에게 ACK는 안 됨**. 송신자만 단독으로 버스에 있으면 *ACK Error* — 트랜시버가 *Self-test*로 우회 가능.

## Remote Frame

`RTR = 1` (recessive). 데이터 없이 "ID X의 데이터 보내줘"라는 *요청*. 자동차에서는 거의 *deprecated* — 요즘은 *cyclic broadcast*로 대체.

## Error Frame — 에러 신호 폭격

오류 감지 즉시 *6 dominant bit*를 보냄. 다른 노드도 즉시 *error frame echo*. 결과 — 현재 프레임 *전체 무효*, 송신자 재시도.

| Error 종류 | 감지 방식 |
| --- | --- |
| **Bit Error** | 송신 비트와 *모니터링한* 버스 불일치 |
| **Stuff Error** | 6 연속 동일 비트 (stuff 누락) |
| **CRC Error** | CRC 불일치 |
| **Form Error** | 고정 비트 (Delim, EOF) 위반 |
| **ACK Error** | ACK slot이 recessive 유지 |

5편(에러 처리)에서 *fault confinement*와 함께 자세히.

## Overload Frame

수신자가 *처리 못 따라감* → "Inter-Frame Space 동안 6 dominant bit". 결과 — 다음 프레임 *지연*. 모던 시스템에서 거의 안 봄.

## STM32 HAL 송신 예

```c
CAN_TxHeaderTypeDef tx_header;
uint8_t data[8] = {0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88};
uint32_t mailbox;

tx_header.StdId = 0x123;        // 11-bit ID
tx_header.ExtId = 0;
tx_header.IDE = CAN_ID_STD;     // Standard
tx_header.RTR = CAN_RTR_DATA;   // Data frame
tx_header.DLC = 8;
tx_header.TransmitGlobalTime = DISABLE;

HAL_CAN_AddTxMessage(&hcan1, &tx_header, data, &mailbox);
```

페리퍼럴이 SOF·CRC·bit stuffing·ACK 처리 모두 자동.

## 수신 — Filter

CAN ID 공간이 크므로 *관심 메시지만* 받는 게 효율. 페리퍼럴 filter 사용.

```c
CAN_FilterTypeDef filter;
filter.FilterBank = 0;
filter.FilterMode = CAN_FILTERMODE_IDMASK;
filter.FilterScale = CAN_FILTERSCALE_32BIT;
filter.FilterIdHigh = 0x123 << 5;     // 11-bit ID를 상위 비트로
filter.FilterIdLow = 0;
filter.FilterMaskIdHigh = 0x7FF << 5;
filter.FilterMaskIdLow = 0;
filter.FilterFIFOAssignment = CAN_RX_FIFO0;
filter.FilterActivation = ENABLE;
HAL_CAN_ConfigFilter(&hcan1, &filter);
```

`Mask = 0x7FF` 이면 *완전 일치*. `Mask = 0x700` + `Id = 0x100` 이면 *0x100-0x1FF 범위 매치*.

## 자주 하는 실수

> ⚠️ Loopback mode 없이 single-node 테스트

CAN 버스에 *자기 혼자* 있으면 ACK 없음 → *지속 ACK Error + 송신 무한 재시도* → 결국 *bus-off*. 다른 노드 또는 *self-test/loopback mode* 사용.

> ⚠️ Standard·Extended ID 혼동

`IDE` 비트 잘못 설정 → ID 해석 다름. 페리퍼럴 API의 `StdId` vs `ExtId` 정확히.

> ⚠️ DLC = 8 가정 코드

데이터시트에 `DLC = 8`로 적혀 있지만 *런타임에 다른 값*도 가능. 수신 시 `header.DLC` 항상 확인.

> ⚠️ Filter 비활성으로 모든 메시지 수신

high-traffic 버스 (500 kbps × 8 ECU)에서 *모든 메시지*를 인터럽트로 받으면 CPU 100%. Filter로 *관심 ID만*.

## 정리

- CAN 프레임 5종 — **Data**가 95%, 나머지는 특수.
- Standard 11-bit ID + DLC + 0-8 byte + CRC + ACK + EOF.
- **Bit stuffing**으로 5+연속 동일 비트 회피 → 클럭 동기.
- **Filter**로 페리퍼럴 단에서 관심 ID만.
- Single-node 테스트는 *Loopback mode* 필수.

다음 편은 **CAN 중재** — 우선순위 ID로 충돌 없이 한 송신자 결정.

## 관련 항목

- [Ch 2: 물리 계층](/blog/embedded/protocols/can-bus/chapter02-physical)
- [Ch 4: 중재](/blog/embedded/protocols/can-bus/chapter04-arbitration)
