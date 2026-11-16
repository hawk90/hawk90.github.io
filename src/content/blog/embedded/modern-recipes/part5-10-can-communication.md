---
title: "CAN 통신 구현 — bxCAN Bit Timing·Filter·Mailbox·Error 상태"
slug: "embedded/modern-recipes/part5-10-can-communication"
date: 2026-04-14T09:58:00
description: "STM32F407 bxCAN으로 500 kbit/s bit timing, 32-bit mask filter, 송신 mailbox, FIFO0 수신 인터럽트를 만들고, CAN 2.0 fault confinement 규칙으로 error 상태를 읽습니다."
series: "Modern Embedded Recipes"
seriesOrder: 58
tags: [recipes, peripheral, can]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"bxCAN 설정은 bit timing(BTR), filter, mailbox 세 가지입니다."** 한 bit를 몇 개의 time quantum으로 나눌지, 어떤 ID를 FIFO로 들일지, 어느 mailbox로 보낼지를 정하면 frame이 오갑니다.

## 어떤 상황에서 쓰나

여러 ECU, motor controller, PLC가 한 bus를 공유하며 message를 broadcast하는 곳입니다. CAN은 ID가 작은 frame이 arbitration에서 이기고, 오류 검출과 error counter 관리를 controller가 합니다.

이 글은 STM32F407의 bxCAN(CAN1, PA11/PA12)으로 500 kbit/s 초기화, acceptance filter, 송신, FIFO0 수신 인터럽트, loopback 시험을 다룹니다. 출처는 Bosch CAN Specification Version 2.0(1991), CMSIS `stm32f407xx.h`(cmsis-device-f4)의 bit 정의, STM32CubeF4 HAL v1.8.3 `stm32f4xx_hal_can.c/.h`, Linux v6.12 `drivers/net/can/bxcan.c`, Zephyr v4.0.0 `drivers/can/can_stm32_bxcan.c`입니다. 버스 전기 특성(종단, transceiver, 전압 범위, 길이 예산)은 [1-10: CAN 버스 전기적 특성](/blog/embedded/modern-recipes/part1-10-can-electrical)이 다룹니다. 코드는 arm-none-eabi-gcc 16.2.0으로 `-Wall -Wextra` 경고 없이 빌드되고, bit timing 표는 host에서 계산했습니다. bxCAN은 QEMU에 model이 없어 frame 송수신은 돌려 보지 않았습니다.

## 핵심 개념

### Frame과 arbitration

Standard data frame은 SOF, 11-bit identifier, RTR, IDE, r0, DLC(4 bit), data 0~8 byte, CRC(15 bit), ACK, EOF 순서입니다. Extended frame은 identifier가 11 + 18 = 29 bit입니다. dominant(0)가 recessive(1)를 덮으므로 identifier를 bit 단위로 보내는 동안 0을 보낸 node가 남고, 그래서 ID가 작을수록 우선순위가 높습니다.

### Bit timing

Bosch CAN 2.0 8장은 한 bit를 SYNC_SEG(1 TQ), PROP_SEG(1~8 TQ), PHASE_SEG1(1~8 TQ), PHASE_SEG2로 나누고, 한 bit의 TQ 수를 "at least from 8 to 25"로 프로그램할 수 있어야 한다고 합니다. sample point는 PHASE_SEG1의 끝입니다.

bxCAN은 PROP_SEG와 PHASE_SEG1을 합친 TS1 하나를 받습니다. Linux bxcan driver는 TS1 field에 `phase_seg1 + prop_seg - 1`을 쓰고, 범위를 `tseg1_max = 16`, `sjw_max = 4`, `brp_max = 1024`로 둡니다. HAL의 `IS_CAN_PRESCALER`도 1~1024입니다.

| BTR field | bit | 값 |
|---|---|---|
| BRP | 9:0 | prescaler − 1 |
| TS1 | 19:16 | tseg1 − 1 |
| TS2 | 22:20 | tseg2 − 1 |
| SJW | 25:24 | SJW − 1 |
| LBKM | 30 | loopback mode |
| SILM | 31 | silent mode |

bit 시간 = prescaler × (1 + tseg1 + tseg2) / f_PCLK1이고, sample point = (1 + tseg1) / (1 + tseg1 + tseg2)입니다. [4-04](/blog/embedded/modern-recipes/part4-04-clock-setup)의 PCLK1 = 42 MHz에서 500 kbit/s는 한 bit가 84 clock이므로 prescaler × TQ 수 = 84입니다. 8~25 TQ 범위의 약수는 12, 14, 21이고, 이 글은 prescaler 6 × 14 TQ(tseg1 = 11, tseg2 = 2), sample point 12/14 = 85.7 %를 씁니다. 어느 sample point를 고를지는 bus 길이와 지연에 달린 문제이고, 1-10이 1 Mbit/s 예로 그 계산을 보입니다.

### Acceptance filter

bxCAN은 filter를 통과한 frame만 receive FIFO에 넣습니다. 32-bit scale·identifier mask mode에서 FR1은 비교할 identifier, FR2는 mask이고, mask가 1인 bit만 FR1과 같아야 통과합니다. 32-bit 배치는 Zephyr driver의 정의대로 STID가 bit 31:21, EXID가 bit 20:3, IDE가 bit 2, RTR가 bit 1입니다. Zephyr는 standard ID filter의 mask에 IDE bit를 항상 넣어 extended frame을 걸러 내고, Linux driver는 filter 0을 FR1 = FR2 = 0으로 두어 "Accept all messages"로 씁니다.

STM32F407에는 CAN1·CAN2가 나눠 쓰는 filter bank가 있고, `FMR`의 CAN2SB field가 CAN2가 쓰기 시작하는 bank 번호입니다. Linux driver는 이 값을 14로 두어 CAN1에 0~13번을 줍니다.

### Error counter와 상태

Bosch CAN 2.0 Part A 7장(Fault Confinement)의 규칙에서 이 글과 관련된 것입니다.

| 규칙 | 내용 |
|---|---|
| 송신 중 error flag | TEC + 8 (예외 있음) |
| 송신 성공 | TEC − 1 (0이면 그대로) |
| Error passive | "the TRANSMIT ERROR COUNT equals or exceeds 128, or when the RECEIVE ERROR COUNT equals or exceeds 128" |
| Bus off | "the TRANSMIT ERROR COUNT is greater than or equal to 256" |
| Error active 복귀 | TEC와 REC 모두 127 이하 |
| Bus off 복귀 | "after 128 occurrence of 11 consecutive 'recessive' bits" 뒤 counter를 0으로 |

bxCAN은 TEC를 `ESR` bit 23:16, REC를 bit 31:24에 두고, 상태를 `ESR`의 BOFF(bit 2), EPVF(bit 1), EWGF(bit 0)로 알립니다. Linux driver는 이 세 bit로 bus-off, error passive, error warning을 가릅니다. bus-off에서 자동으로 돌아올지는 `MCR`의 ABOM(Automatic Bus-Off Management)이 정하고, Linux driver는 ABOM을 끄고 "bus-off state left on sw request"로 둡니다.

## 코드 예제

`gpio_init()`은 [4-03](/blog/embedded/modern-recipes/part4-03-gpio-driver)의 것입니다.

### 1. CAN 초기화

```c
#define CAN_BTR(brp, ts1, ts2, sjw)                 \
    ((((uint32_t)(sjw) - 1u) << CAN_BTR_SJW_Pos) |  \
     (((uint32_t)(ts2) - 1u) << CAN_BTR_TS2_Pos) |  \
     (((uint32_t)(ts1) - 1u) << CAN_BTR_TS1_Pos) |  \
     (((uint32_t)(brp) - 1u) << CAN_BTR_BRP_Pos))

int can_init_500k(int loopback) {
    RCC->APB1ENR |= RCC_APB1ENR_CAN1EN;
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;

    // PA11 CAN1_RX, PA12 CAN1_TX (AF9)
    gpio_init(GPIOA, 11, &(gpio_config_t){.mode=GPIO_MODE_AF, .pull=GPIO_PULL_UP, .af=9});
    gpio_init(GPIOA, 12, &(gpio_config_t){.mode=GPIO_MODE_AF, .speed=GPIO_SPEED_HIGH, .af=9});

    // Same order as HAL_CAN_Init(): INRQ -> INAK, then leave sleep
    CAN1->MCR |= CAN_MCR_INRQ;
    while (!(CAN1->MSR & CAN_MSR_INAK)) { }
    CAN1->MCR &= ~CAN_MCR_SLEEP;
    while (CAN1->MSR & CAN_MSR_SLAK) { }

    CAN1->MCR |= CAN_MCR_TXFP;      // transmit in request order
    CAN1->MCR &= ~(CAN_MCR_NART | CAN_MCR_ABOM);   // auto retransmit, sw bus-off recovery

    // 42 MHz / 6 = 7 MHz TQ; 1 + 11 + 2 = 14 TQ -> 500 kbit/s, sample 85.7 %
    CAN1->BTR = CAN_BTR(6, 11, 2, 2) | (loopback ? CAN_BTR_LBKM : 0u);

    CAN1->MCR &= ~CAN_MCR_INRQ;     // leave init mode
    for (uint32_t t = 0; CAN1->MSR & CAN_MSR_INAK; t++)
        if (t > 1000000u) return -1;   // no 11 recessive bits seen
    return 0;
}
```

HAL `HAL_CAN_Start()`도 INRQ를 지운 뒤 INAK가 0이 되기를 timeout과 함께 기다립니다. 그대로 기다리기만 하면 RX 핀이 recessive로 올라오지 않는 배선에서 멈추므로 위 코드도 횟수로 끊습니다.

### 2. Acceptance filter

```c
#define FILT_IDE (1u << 2)
#define FILT_RTR (1u << 1)

// bank 0: standard data frame with exactly this 11-bit ID -> FIFO0
void can_filter_std(uint16_t id) {
    CAN1->FMR |= CAN_FMR_FINIT;
    CAN1->FA1R &= ~(1u << 0);       // deactivate bank 0
    CAN1->FM1R &= ~(1u << 0);       // identifier mask mode
    CAN1->FS1R |=  (1u << 0);       // single 32-bit scale
    CAN1->FFA1R &= ~(1u << 0);      // FIFO0

    CAN1->sFilterRegister[0].FR1 = (uint32_t)id << 21;               // IDE = 0, RTR = 0
    CAN1->sFilterRegister[0].FR2 = (0x7FFu << 21) | FILT_IDE | FILT_RTR;

    CAN1->FA1R |= (1u << 0);
    CAN1->FMR &= ~CAN_FMR_FINIT;
}

// bank 0: accept everything (Linux bxcan does the same)
void can_filter_pass_all(void) {
    CAN1->FMR |= CAN_FMR_FINIT;
    CAN1->FA1R &= ~(1u << 0);
    CAN1->FM1R &= ~(1u << 0);
    CAN1->FS1R |=  (1u << 0);
    CAN1->FFA1R &= ~(1u << 0);
    CAN1->sFilterRegister[0].FR1 = 0;
    CAN1->sFilterRegister[0].FR2 = 0;   // mask 0: every bit is don't-care
    CAN1->FA1R |= (1u << 0);
    CAN1->FMR &= ~CAN_FMR_FINIT;
}
```

mask에 IDE·RTR bit를 넣었으므로 `can_filter_std(0x100)`은 ID 0x100인 standard data frame만 받고, 상위 11 bit가 0x100인 extended frame이나 remote frame은 받지 않습니다.

### 3. Send frame

```c
int can_send_std(uint16_t id, const uint8_t *data, uint8_t len) {
    if (id > 0x7FF || len > 8 || (len != 0 && data == NULL)) return -1;

    int mb;
    uint32_t tsr = CAN1->TSR;
    if      (tsr & CAN_TSR_TME0) mb = 0;
    else if (tsr & CAN_TSR_TME1) mb = 1;
    else if (tsr & CAN_TSR_TME2) mb = 2;
    else return -1;                 // all three mailboxes busy

    uint8_t b[8] = {0};
    for (uint8_t i = 0; i < len; i++) b[i] = data[i];

    CAN1->sTxMailBox[mb].TIR  = (uint32_t)id << CAN_TI0R_STID_Pos;   // IDE = 0, RTR = 0
    CAN1->sTxMailBox[mb].TDTR = len;
    CAN1->sTxMailBox[mb].TDLR = b[0] | (b[1] << 8) | (b[2] << 16) | ((uint32_t)b[3] << 24);
    CAN1->sTxMailBox[mb].TDHR = b[4] | (b[5] << 8) | (b[6] << 16) | ((uint32_t)b[7] << 24);
    CAN1->sTxMailBox[mb].TIR |= CAN_TI0R_TXRQ;                       // request
    return mb;
}
```

TXRQ를 마지막에 따로 세우는 순서는 HAL `HAL_CAN_AddTxMessage()`와 같습니다.

### 4. Receive (FIFO0 + interrupt)

```c
typedef struct {
    uint32_t id;
    uint8_t  ext, rtr, len;
    uint8_t  data[8];
} can_rx_t;

#define RX_Q 32                         // power of two
static can_rx_t rx_q[RX_Q];
static volatile uint32_t rx_head, rx_tail;

void can_rx_init(void) {
    CAN1->IER |= CAN_IER_FMPIE0;        // FIFO0 message pending
    NVIC_EnableIRQ(CAN1_RX0_IRQn);
}

void CAN1_RX0_IRQHandler(void) {
    while (CAN1->RF0R & CAN_RF0R_FMP0) {
        uint32_t rir = CAN1->sFIFOMailBox[0].RIR;
        can_rx_t f;
        f.ext = (rir & CAN_RI0R_IDE) != 0;
        f.rtr = (rir & CAN_RI0R_RTR) != 0;
        f.id  = f.ext ? rir >> CAN_RI0R_EXID_Pos : rir >> CAN_RI0R_STID_Pos;
        f.len = CAN1->sFIFOMailBox[0].RDTR & CAN_RDT0R_DLC;
        uint32_t lo = CAN1->sFIFOMailBox[0].RDLR;
        uint32_t hi = CAN1->sFIFOMailBox[0].RDHR;
        for (int i = 0; i < 4; i++) {
            f.data[i]     = (uint8_t)(lo >> (8 * i));
            f.data[i + 4] = (uint8_t)(hi >> (8 * i));
        }
        CAN1->RF0R |= CAN_RF0R_RFOM0;   // release the FIFO output mailbox

        uint32_t head = rx_head;
        if (head - rx_tail < RX_Q) {    // drop when full
            rx_q[head % RX_Q] = f;
            rx_head = head + 1;
        }
    }
}

int can_recv(can_rx_t *f) {
    uint32_t tail = rx_tail;
    if (tail == rx_head) return -1;
    *f = rx_q[tail % RX_Q];
    rx_tail = tail + 1;
    return 0;
}
```

IDE를 보고 standard·extended ID를 가르는 방식은 Zephyr `can_stm32_rx_fifo_pop()`과 같고, data를 읽은 뒤 `RF0R`에 RFOM0을 세워 FIFO를 비우는 것은 Linux `bxcan_handle_fifo()`와 같습니다.

### 5. Loopback 시험

transceiver나 다른 node 없이 송수신 경로를 확인할 때 `can_init_500k(1)`로 LBKM을 켭니다. Linux driver도 `CAN_CTRLMODE_LOOPBACK`에서 LBKM을 세우고, 주석에 "loopback + silent mode put the controller in test mode, useful for hot self-test"라고 적습니다.

```c
int can_selftest(void) {
    if (can_init_500k(1) != 0) return -1;
    can_filter_pass_all();
    can_rx_init();

    const uint8_t tx[4] = {0x01, 0x02, 0x03, 0x04};
    if (can_send_std(0x100, tx, 4) < 0) return -2;

    can_rx_t f;
    for (uint32_t t = 0; t < 1000000u; t++) {
        if (can_recv(&f) == 0)
            return (f.id == 0x100 && f.len == 4 && f.data[3] == 0x04) ? 0 : -3;
    }
    return -4;                          // nothing received
}
```

## 측정 / 동작 확인

### host에서 bit timing 표 확인

42 MHz에서 500 kbit/s를 내는 모든 (prescaler, tseg1, tseg2)를 host에서 셌습니다. 조건은 한 bit 8~25 TQ(CAN 2.0), tseg1 1~16, tseg2 1~8(bxCAN field 폭)이고, 각 조합의 sample point와 `CAN_BTR()` 값을 찍습니다. `CAN_BTR()`은 1절의 macro를 그대로 옮겼고, field 위치 상수는 `stm32f407xx.h`의 값입니다.

```c
/* can_timing.c */
#include <stdio.h>
#include <stdint.h>

#define CAN_BTR_SJW_Pos 24
#define CAN_BTR_TS2_Pos 20
#define CAN_BTR_TS1_Pos 16
#define CAN_BTR_BRP_Pos 0
#define CAN_BTR(brp, ts1, ts2, sjw)                 \
    ((((uint32_t)(sjw) - 1u) << CAN_BTR_SJW_Pos) |  \
     (((uint32_t)(ts2) - 1u) << CAN_BTR_TS2_Pos) |  \
     (((uint32_t)(ts1) - 1u) << CAN_BTR_TS1_Pos) |  \
     (((uint32_t)(brp) - 1u) << CAN_BTR_BRP_Pos))

int main(void) {
    const uint32_t pclk = 42000000, rate = 500000;
    int n = 0;
    for (uint32_t brp = 1; brp <= 1024; brp++) {
        if (pclk % (brp * rate)) continue;
        uint32_t tq = pclk / (brp * rate);
        if (tq < 8 || tq > 25) continue;
        for (uint32_t ts2 = 1; ts2 <= 8; ts2++) {
            uint32_t ts1 = tq - 1 - ts2;
            if (ts1 < 1 || ts1 > 16) continue;
            n++;
            printf("brp=%2u tq=%2u ts1=%2u ts2=%u sample=%5.1f%% BTR=0x%08X\n",
                   brp, tq, ts1, ts2, 100.0 * (1 + ts1) / tq,
                   CAN_BTR(brp, ts1, ts2, ts2 < 4 ? ts2 : 4));
        }
    }
    printf("%d combinations; this post: 0x%08X\n", n, CAN_BTR(6, 11, 2, 2));
    return 0;
}
```

```bash
clang -O2 -Wall -o can_timing can_timing.c && ./can_timing
```

```text
brp= 4 tq=21 ts1=16 ts2=4 sample= 81.0% BTR=0x033F0003
brp= 4 tq=21 ts1=15 ts2=5 sample= 76.2% BTR=0x034E0003
brp= 4 tq=21 ts1=14 ts2=6 sample= 71.4% BTR=0x035D0003
brp= 4 tq=21 ts1=13 ts2=7 sample= 66.7% BTR=0x036C0003
brp= 4 tq=21 ts1=12 ts2=8 sample= 61.9% BTR=0x037B0003
brp= 6 tq=14 ts1=12 ts2=1 sample= 92.9% BTR=0x000B0005
brp= 6 tq=14 ts1=11 ts2=2 sample= 85.7% BTR=0x011A0005
brp= 6 tq=14 ts1=10 ts2=3 sample= 78.6% BTR=0x02290005
brp= 6 tq=14 ts1= 9 ts2=4 sample= 71.4% BTR=0x03380005
brp= 6 tq=14 ts1= 8 ts2=5 sample= 64.3% BTR=0x03470005
brp= 6 tq=14 ts1= 7 ts2=6 sample= 57.1% BTR=0x03560005
brp= 6 tq=14 ts1= 6 ts2=7 sample= 50.0% BTR=0x03650005
brp= 6 tq=14 ts1= 5 ts2=8 sample= 42.9% BTR=0x03740005
brp= 7 tq=12 ts1=10 ts2=1 sample= 91.7% BTR=0x00090006
brp= 7 tq=12 ts1= 9 ts2=2 sample= 83.3% BTR=0x01180006
brp= 7 tq=12 ts1= 8 ts2=3 sample= 75.0% BTR=0x02270006
brp= 7 tq=12 ts1= 7 ts2=4 sample= 66.7% BTR=0x03360006
brp= 7 tq=12 ts1= 6 ts2=5 sample= 58.3% BTR=0x03450006
brp= 7 tq=12 ts1= 5 ts2=6 sample= 50.0% BTR=0x03540006
brp= 7 tq=12 ts1= 4 ts2=7 sample= 41.7% BTR=0x03630006
brp= 7 tq=12 ts1= 3 ts2=8 sample= 33.3% BTR=0x03720006
21 combinations; this post: 0x011A0005
```

prescaler 4(21 TQ), 6(14 TQ), 7(12 TQ)에서 모두 21개 조합이 나오고, 이 글의 설정은 BTR = 0x011A0005입니다. tseg2 = 1인 줄은 PHASE_SEG2가 CAN 2.0이 정한 Information Processing Time 상한 2 TQ보다 짧아질 수 있는 조합이라, 1-10은 PHASE_SEG2 ≥ 2로 걸러 냅니다. 표의 SJW는 min(tseg2, 4)로 넣었습니다.

### 보드에서

`can_selftest()`가 0을 돌려주면 BTR·filter·mailbox·FIFO 경로가 맞는 것입니다. `can_init_500k()`가 -1이면 init mode를 못 빠져나온 것이므로, RX 핀(PA11)의 배선과 transceiver 전원을 봅니다. 두 보드를 transceiver로 이어 시험할 때 송신 쪽 `ESR`의 TEC가 계속 오르면, 위 fault confinement 표대로 송신마다 error가 나고 있는 것이고 ACK를 줄 다른 node가 bus에 없는지부터 봅니다. 전기적인 확인 순서는 1-10을 따릅니다.

## 자주 보는 함정

> ⚠️ node 하나로 시험

CAN frame의 ACK slot은 다른 node가 채웁니다. node가 하나뿐이면 송신마다 ACK error가 나고 TEC가 오릅니다. 혼자 시험할 때는 loopback mode(LBKM)를 씁니다.

> ⚠️ node마다 bit timing이 다름

모든 node의 bit 시간이 같아야 합니다. 같은 500 kbit/s라도 sample point를 정하는 기준은 bus 길이 예산에서 나오므로 1-10의 계산을 따릅니다.

> ⚠️ filter를 처음부터 좁게 잡음

mask 계산이 틀리면 아무것도 FIFO에 들어오지 않습니다. 먼저 `can_filter_pass_all()`로 수신을 확인한 뒤 `can_filter_std()`로 좁힙니다.

> ⚠️ standard filter에 IDE를 안 넣음

mask에 IDE bit가 없으면 상위 11 bit가 같은 extended frame도 통과합니다. 수신 쪽에서 IDE를 확인하지 않으면 그 frame의 ID를 standard ID로 잘못 읽습니다.

> ⚠️ bus-off에서 멈춤

ABOM을 끈 상태에서 bus-off가 되면 software가 복구 절차를 밟아야 합니다. `ESR`의 BOFF를 주기적으로 보거나 error interrupt를 켜서 알아차립니다.

## 정리

- BTR = **(SJW−1)<<24 | (TS2−1)<<20 | (TS1−1)<<16 | (BRP−1)**. 42 MHz에서 6 × 14 TQ = 500 kbit/s, sample 85.7 %.
- filter는 **32-bit mask mode, mask 1 bit만 비교**. standard filter에는 IDE·RTR를 mask에 넣습니다.
- 송신은 **빈 mailbox → TIR/TDTR/TDLR/TDHR → TXRQ**.
- 수신은 **FMPIE0 → RIR의 IDE로 ID 해석 → RFOM0**.
- error 상태는 **ESR의 TEC/REC와 BOFF/EPVF/EWGF**, 규칙은 CAN 2.0 fault confinement.

다음 편은 **USB Device 기초**입니다. CDC virtual COM, HID class, TinyUSB 통합을 다룹니다.

## 관련 항목

- [1-10: CAN 버스 전기적 특성](/blog/embedded/modern-recipes/part1-10-can-electrical)
- [4-05: 인터럽트 핸들링](/blog/embedded/modern-recipes/part4-05-interrupt-handling)
- [5-11: USB Device 기초](/blog/embedded/modern-recipes/part5-11-usb-device)
- [12-13: Matter·Thread](/blog/embedded/modern-recipes/part12-13-matter-thread)
