---
title: "5-10: CAN 통신"
date: 2026-05-14T10:00:00
description: "Frame format·filter·bit timing·error frame."
series: "Modern Embedded Recipes"
seriesOrder: 58
tags: [recipes, peripheral, can]
draft: false
---

## 한 줄 요약

> **"CAN ID = priority, payload = 0~8 byte. ACK는 다른 node가 송신."** 자동차·산업·로봇 표준 bus.

## 어떤 상황에서 쓰나

자동차의 ECU 간 통신, 산업 PLC, 로봇 motor controller — *node가 여러 개 있고 서로 message를 broadcast* 하는 환경. 차량의 OBD-II가 곧 CAN. SPI/UART와 다른 점은 *multi-master arbitration*과 *오류 검출/복구가 hardware로 처리*된다는 것.

이 글은 STM32 bxCAN peripheral의 frame 송수신, acceptance filter, bit timing을 다룹니다.

## 핵심 개념

### CAN 신호 (Classical 2.0)

```text
CAN_H ────╲╱──────────────╲╱──
CAN_L ──── ╱╲──────────────╱╲──
        Dominant       Recessive
        (0)            (1)
        H>L            H=L
```

* differential signal, 120 Ω termination at each bus end.
* dominant (0)이 recessive (1)을 *overrides* — 이게 arbitration의 핵심.

### Frame 구조 (Standard 11-bit ID)

```text
SOF | ID(11) | RTR | IDE | r0 | DLC(4) | DATA(0~8 byte) | CRC(15) | ACK | EOF
 │      │     │     │         │            │              │       │
 │   priority           data length        payload     receivers
 │                                                       ACK
START dominant bit
```

Extended frame은 ID 29-bit (11 + 18). 일반 차량용은 Standard, J1939 등은 Extended.

### Bit timing

```text
1 bit = 1 + tseg1 + tseg2 quanta
sample point at end of tseg1

baud = peripheral_clock / (prescaler × (1 + tseg1 + tseg2))

예) PCLK1 = 42 MHz, target 500 kbit/s
    prescaler = 6, tseg1 = 11, tseg2 = 2
    1 bit = (1 + 11 + 2) × 6 / 42M = 84 / 42M = 2 µs → 500 kHz
    sample point = (1 + 11) / 14 = 85.7% (CiA recommended 87.5%)
```

CiA (CAN in Automation) 권장: sample point 87.5%. 너무 일찍이면 *propagation delay에 못 따라가고*, 늦으면 *phase error에 약함*.

### Acceptance filter

CAN bus는 *모든 node가 모든 message를 받습니다*. filter로 *원하는 ID만* CPU로 올림 — power와 ISR 시간 절약.

**Mask mode:**

- ID & MASK == FILTER & MASK

**List mode:**

- ID == any of FILTER[]

STM32 bxCAN은 14개 filter bank, 각 *2개 ID list 또는 2개 mask*.

### Error frame과 bus-off

CAN은 *적극적 error detection* — bit error, stuff error, CRC error, form error, ACK error. error 발생 시 *error frame* 송신 → 다른 node에게 알림.

```text
TEC (Transmit Error Counter):
  error 시 +8, 정상 송신 시 -1
  TEC ≥ 128 → Error Passive
  TEC ≥ 256 → Bus Off (송신 중단)

REC (Receive Error Counter):
  비슷, 수신 측

Bus-off → 128 × 11 recessive bit 후 자동 복구 (또는 수동)
```

bus-off는 *심각한 상태*. cable 단선, termination 누락, 다른 node baud 불일치.

## 코드 예제

### 1. CAN 초기화

```c
void can_init_500k(void) {
    RCC->APB1ENR |= RCC_APB1ENR_CAN1EN;
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;

    // PA11 RX, PA12 TX (AF9)
    gpio_init(GPIOA, 11, &(gpio_config_t){.mode=GPIO_MODE_AF, .pull=GPIO_PULL_UP, .af=9});
    gpio_init(GPIOA, 12, &(gpio_config_t){.mode=GPIO_MODE_AF, .speed=GPIO_SPEED_HIGH, .af=9});

    // Enter init mode
    CAN1->MCR |= CAN_MCR_INRQ;
    while (!(CAN1->MSR & CAN_MSR_INAK));

    CAN1->MCR &= ~CAN_MCR_SLEEP;
    CAN1->MCR |= CAN_MCR_TXFP | CAN_MCR_NART;
    // TXFP = priority by request order
    // NART = no auto retransmit

    // 500 kbit/s @ PCLK1 = 42 MHz
    // prescaler 6, tseg1=11, tseg2=2 → (1+11+2)*6/42M = 2 µs
    CAN1->BTR = (1u << 24)            // SJW = 2
              | ((2 - 1) << 20)        // tseg2 = 2
              | ((11 - 1) << 16)       // tseg1 = 11
              | (6 - 1);               // prescaler = 6

    // Exit init mode
    CAN1->MCR &= ~CAN_MCR_INRQ;
    while (CAN1->MSR & CAN_MSR_INAK);
}
```

### 2. Acceptance filter

```c
void can_filter_init(void) {
    CAN1->FMR |= CAN_FMR_FINIT;

    // Filter 0: accept ID 0x100 (11-bit, mask all bits)
    CAN1->FA1R &= ~(1u << 0);
    CAN1->FS1R |=  (1u << 0);    // 32-bit scale
    CAN1->FM1R &= ~(1u << 0);    // mask mode

    CAN1->sFilterRegister[0].FR1 = (0x100 << 21);    // filter ID
    CAN1->sFilterRegister[0].FR2 = (0x7FF << 21);    // mask: all 11 bits

    CAN1->FFA1R &= ~(1u << 0);   // assign to FIFO 0
    CAN1->FA1R  |=  (1u << 0);   // activate

    CAN1->FMR &= ~CAN_FMR_FINIT;
}

// 모든 ID 수신
void can_filter_pass_all(void) {
    CAN1->FMR |= CAN_FMR_FINIT;
    CAN1->FA1R &= ~(1u << 0);
    CAN1->FM1R &= ~(1u << 0);
    CAN1->FS1R |=  (1u << 0);
    CAN1->sFilterRegister[0].FR1 = 0;
    CAN1->sFilterRegister[0].FR2 = 0;   // mask = 0 → don't care
    CAN1->FA1R |= (1u << 0);
    CAN1->FMR &= ~CAN_FMR_FINIT;
}
```

### 3. Send frame

```c
int can_send(uint32_t id, const uint8_t *data, uint8_t len) {
    // 빈 mailbox 찾기
    int mb = -1;
    if      (CAN1->TSR & CAN_TSR_TME0) mb = 0;
    else if (CAN1->TSR & CAN_TSR_TME1) mb = 1;
    else if (CAN1->TSR & CAN_TSR_TME2) mb = 2;
    else return -1;

    CAN1->sTxMailBox[mb].TIR  = (id << 21);          // standard
    CAN1->sTxMailBox[mb].TDTR = len & 0xF;
    CAN1->sTxMailBox[mb].TDLR = (data[0])
                              | (data[1] << 8)
                              | (data[2] << 16)
                              | (data[3] << 24);
    CAN1->sTxMailBox[mb].TDHR = (data[4])
                              | (data[5] << 8)
                              | (data[6] << 16)
                              | (data[7] << 24);
    CAN1->sTxMailBox[mb].TIR |= CAN_TI0R_TXRQ;       // request transmit
    return 0;
}
```

### 4. Receive (FIFO + interrupt)

```c
typedef struct {
    uint32_t id;
    uint8_t  len;
    uint8_t  data[8];
} can_rx_t;

#define RX_Q 32
static volatile can_rx_t rx_q[RX_Q];
static volatile int rx_head, rx_tail;

void can_rx_init(void) {
    CAN1->IER |= CAN_IER_FMPIE0;        // FIFO0 message pending
    NVIC_EnableIRQ(CAN1_RX0_IRQn);
}

void CAN1_RX0_IRQHandler(void) {
    while (CAN1->RF0R & CAN_RF0R_FMP0) {
        can_rx_t f;
        f.id = CAN1->sFIFOMailBox[0].RIR >> 21;
        f.len = CAN1->sFIFOMailBox[0].RDTR & 0xF;
        uint32_t lo = CAN1->sFIFOMailBox[0].RDLR;
        uint32_t hi = CAN1->sFIFOMailBox[0].RDHR;
        f.data[0] = lo;  f.data[1] = lo >> 8;  f.data[2] = lo >> 16; f.data[3] = lo >> 24;
        f.data[4] = hi;  f.data[5] = hi >> 8;  f.data[6] = hi >> 16; f.data[7] = hi >> 24;
        CAN1->RF0R |= CAN_RF0R_RFOM0;   // release

        int next = (rx_head + 1) % RX_Q;
        if (next != rx_tail) {
            rx_q[rx_head] = f;
            rx_head = next;
        }
    }
}

int can_recv(can_rx_t *f) {
    if (rx_head == rx_tail) return -1;
    *f = rx_q[rx_tail];
    rx_tail = (rx_tail + 1) % RX_Q;
    return 0;
}
```

### 5. Loopback test

CAN transceiver 없이도 *loopback mode*로 자체 송수신 test 가능.

```c
CAN1->MCR |= CAN_MCR_INRQ;
while (!(CAN1->MSR & CAN_MSR_INAK));
CAN1->BTR |= CAN_BTR_LBKM;   // loopback
CAN1->MCR &= ~CAN_MCR_INRQ;
```

real bus와 분리되어 자기 송신을 자기가 수신. 코드 검증에 유용.

## 측정 / 동작 확인

CAN 분석기 (PEAK PCAN-USB, Vector, Kvaser)로 message를 모니터링하면 가장 명확. 없으면 두 STM32 보드를 *transceiver (TJA1051, SN65HVD230) + 120Ω termination*으로 연결.

**정상:**

- Node A: send id=0x100, data=[01 02 03 04]
- Node B: recv id=0x100, data=[01 02 03 04]  ✓

**문제 사례:**

- Send 후 TEC가 +8씩 증가 → 다른 node가 ACK 안 함
- → cable, termination, baud 확인

TEC = 255 → Error Passive
TEC = 256+ → Bus Off (전송 중단)

scope로 CAN_H/CAN_L 차이 (recessive ~0V, dominant ~2V)를 확인.

## 자주 보는 함정

> ⚠️ Transceiver 누락

MCU의 CAN_TX/RX는 *TTL*. real CAN bus에는 *transceiver IC* (TJA1051, MCP2551, SN65HVD230) 필수.

> ⚠️ 120 Ω termination 누락

bus 양 끝 각 120 Ω 없으면 reflection으로 신호 깨짐. 두 끝 사이 = 60 Ω.

> ⚠️ Baud 불일치

모든 node가 *정확히 같은 baud*. 한 node가 다르면 *모든 message에 NACK*.

> ⚠️ Single node 송신 → ACK error

CAN은 *다른 node가 ACK*. 1개 node만 있으면 모든 transmit이 ACK error. loopback mode 또는 silent mode로 test.

> ⚠️ Sample point 잘못

cable 길이가 길거나 transceiver propagation delay 큰 경우 sample point 87.5%를 조정해야 함.

> ⚠️ Filter 잘못 설정해 *아무것도 수신 안 함*

mask = 0xFFFF로 두면 ID 정확히 일치만 수신. 처음에는 *pass-all* (mask=0)로 시작해 검증 후 좁힘.

## 정리

- CAN = differential, **dominant (0) overrides recessive (1)** — arbitration 자동.
- ID = priority. **Acceptance filter**로 원하는 ID만 받음.
- **Bit timing** = prescaler × (1 + tseg1 + tseg2). sample point 87.5% 권장.
- **TJA1051 transceiver + 120Ω termination**이 hardware 필수.
- **Error counter**로 bus-off detect → 복구 정책.

다음 편은 **USB Device 기초**입니다. CDC virtual COM, HID class, TinyUSB 통합을 다룹니다.

## 관련 항목

- [1-10: CAN 버스 전기적 특성](/blog/embedded/modern-recipes/part1-10-can-electrical)
- [4-05: 인터럽트 핸들링](/blog/embedded/modern-recipes/part4-05-interrupt-handling)
- [5-11: USB Device 기초](/blog/embedded/modern-recipes/part5-11-usb-device)
- [12-12: Matter·Thread](/blog/embedded/modern-recipes/part12-12-matter-thread)
