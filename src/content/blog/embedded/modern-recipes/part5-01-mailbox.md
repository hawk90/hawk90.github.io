---
title: "5-01: FPGA Mailbox Protocol — CPU ↔ FPGA Command·Status"
date: 2026-05-20T19:00:00
description: "FPGA-CPU mailbox 설계. Command/status register, doorbell IRQ, sequence counter, error handling."
series: "Modern Embedded Recipes"
seriesOrder: 25
tags: [recipes, fpga, mailbox, doorbell, axi]
draft: true
---

## 한 줄 요약

> **"Mailbox = CPU ↔ FPGA 명령·응답 channel"** — register + doorbell + sequence.

## 기본 Mailbox 구조

```text
FPGA register space (CPU 측 보기):
  0x00 — Command register (CPU writes)
  0x04 — Argument 0
  0x08 — Argument 1
  0x0C — Argument 2
  ...
  0x40 — Status register (FPGA writes)
  0x44 — Response 0
  0x48 — Response 1
  ...
  0x80 — Doorbell (CPU writes, IRQ to FPGA)
  0x84 — IRQ status (CPU reads)
  
또는 mirror — FPGA → CPU IRQ.
```

## Command Sequence

```c
/* CPU side */
volatile uint32_t *mb = fpga_base;

void send_command(uint32_t cmd, uint32_t arg0, uint32_t arg1) {
    mb[CMD_ARG0/4] = arg0;
    mb[CMD_ARG1/4] = arg1;
    __DMB();   /* args 먼저 가시화 */
    mb[CMD/4] = cmd;
    __DMB();
    mb[DOORBELL/4] = 1;   /* FPGA 깨움 */
}

uint32_t wait_response(void) {
    while (mb[STATUS/4] == STATUS_BUSY) {
        /* poll */
    }
    return mb[RESPONSE0/4];
}
```

순서 — *args 먼저, 그 다음 cmd, 마지막 doorbell*.

## Sequence Counter — Drop·Replay 감지

```c
typedef struct mailbox_msg {
    uint32_t seq;
    uint32_t cmd;
    uint32_t args[4];
    uint32_t crc;
} __attribute__((packed)) mailbox_msg_t;

static uint32_t tx_seq = 0;

void send_msg(mailbox_msg_t *msg) {
    msg->seq = ++tx_seq;
    msg->crc = compute_crc(msg, sizeof(*msg) - 4);
    write_mailbox(msg);
}

bool recv_msg(mailbox_msg_t *out) {
    static uint32_t rx_seq = 0;
    read_mailbox(out);
    
    if (compute_crc(out, sizeof(*out) - 4) != out->crc) {
        return false;   /* CRC fail */
    }
    if (out->seq <= rx_seq) {
        return false;   /* duplicate or out-of-order */
    }
    rx_seq = out->seq;
    return true;
}
```

CRC + sequence — *robust* mailbox.

## Doorbell IRQ

```c
/* FPGA → CPU IRQ */
irqreturn_t fpga_isr(int irq, void *data) {
    uint32_t status = mb[IRQ_STATUS/4];
    
    /* Ack */
    mb[IRQ_STATUS/4] = status;   /* W1C */
    
    if (status & IRQ_RESPONSE) {
        wake_up_interruptible(&fpga_wait);
    }
    if (status & IRQ_ERROR) {
        log_error(...);
    }
    return IRQ_HANDLED;
}
```

W1C (Write 1 to Clear) — 표준 ack pattern.

## Linux Mailbox Framework

```c
#include <linux/mailbox_client.h>
#include <linux/mailbox_controller.h>

/* Client side */
struct mbox_chan *chan;
struct mbox_client mc = {
    .dev = &pdev->dev,
    .rx_callback = my_rx_cb,
    .tx_done = my_tx_done,
    .tx_block = true,
    .tx_tout = 100,
};

chan = mbox_request_channel(&mc, 0);

/* Send */
struct my_message msg = { ... };
mbox_send_message(chan, &msg);
```

Linux standard — vendor-agnostic. Xilinx Zynq·NXP·TI 모두 지원.

## Zynq Ultrascale+ — RPU/APU Mailbox

```text
Zynq UltraScale+:
  APU (Cortex-A53 × 4) — Linux
  RPU (Cortex-R5 × 2)  — real-time
  PMU (MicroBlaze)     — power mgmt
  PL  (FPGA fabric)    — custom logic

Mailbox IP:
  - IPI (Inter-Processor Interrupt)
  - 8 registers per direction
  - Doorbell + acknowledge
```

Linux + RTOS (FreeRTOS·Xen) — *mailbox로 통신*.

## OpenAMP — RPMsg via Mailbox

```c
/* APU side — Linux */
/proc/device-tree/reserved-memory/ipc_buffer
mbox = mailbox-test

/* RPU side — FreeRTOS */
rpmsg_init();
rpmsg_create_ept("ping_channel", ping_cb);
rpmsg_send(ep, "hello", 6);
```

OpenAMP RPMsg = *mailbox + virtio*. 4-12 chapter.

## STM32MP1 IPCC

```text
STM32MP1:
  Cortex-A7 dual core — Linux
  Cortex-M4           — FreeRTOS·bare-metal
  
IPCC (Inter-Processor Communication Controller):
  - 6 channels × 2 directions
  - IRQ-driven
  - HAL: HAL_IPCC_*
```

```c
/* CM4 — sending to CA7 */
HAL_IPCC_NotifyCPU(&hipcc, IPCC_CHANNEL_1, IPCC_CHANNEL_DIR_TX);

/* Receive callback */
void HAL_IPCC_TxCallback(IPCC_HandleTypeDef *hipcc, uint32_t ch, IPCC_CHANNEL_DIR dir) {
    if (ch == IPCC_CHANNEL_2) handle_ack();
}
```

## ARM Cortex Mailbox

```text
Cortex-A·R cluster:
  Generic Interrupt Controller (GIC)
  SGI (Software Generated Interrupt) 0-15 = IPI
  
  Mailbox registers in SoC-specific region:
    - Snoop Control Unit
    - or System Mailbox peripheral
```

Cortex-A SMP — *MPIDR_EL1 read*로 자기 core 확인, *SGI 발사*.

## RP2040 Inter-Core FIFO

```c
#include "pico/multicore.h"

/* CPU 0 → CPU 1 */
multicore_fifo_push_blocking(0xDEADBEEF);

/* CPU 1 */
uint32_t v = multicore_fifo_pop_blocking();
```

RP2040 — *8-deep hardware FIFO* 양방향. Mailbox의 *간단한 형태*.

## Performance Trade-off

| 방식 | Latency | Throughput | 사용처 |
|---|---|---|---|
| Polling (no IRQ) | ~ µs | high | hard RT |
| Doorbell IRQ | 5-50 µs | medium | 일반 |
| DMA + completion IRQ | 10 µs setup | very high | bulk data |
| Shared memory + flag | µs (cache) | high | OpenAMP |

작은 message — polling 또는 doorbell. 큰 data — DMA + completion.

## FPGA AXI Stream + Mailbox

```text
Big data flow:
  CPU → AXI HP master → FPGA buffer (DMA)
  
Mailbox:
  "Buffer ready" command via register
  
FPGA:
  Process buffer
  
Mailbox:
  "Done" response + result location
```

작은 control = mailbox, 큰 data = AXI bus.

## Xilinx HLS — Hardware Accelerator + Mailbox

```cpp
/* HLS function */
void accelerator(int *input, int *output, int *cmd, int *status) {
    /* Wait for command */
    while (*cmd == 0);
    
    /* Process */
    for (int i = 0; i < N; i++) {
        output[i] = input[i] * 2;
    }
    
    /* Signal done */
    *status = STATUS_DONE;
}
```

HLS의 control register = mailbox와 같은 역할.

## ARM SMC (Secure Monitor Call)

```c
/* Cortex-A — Linux → Secure World */
register unsigned long x0 asm("x0") = SMC_FUNCTION_ID;
register unsigned long x1 asm("x1") = arg1;
asm volatile ("smc #0" : "+r"(x0) : "r"(x1));
/* x0 — return value */
```

TF-A (Trusted Firmware-A) — *SMC가 mailbox 역할*. 자동차 secure boot·crypto.

## NVIDIA Tegra IVC

```text
NVIDIA Tegra (Drive·Jetson):
  IVC (Inter-VM Communication):
    - 2 cluster (예: CCPLEX + BPMP)
    - Shared memory based mailbox
    - Doorbell via Hypervisor
```

자율주행 — *각 cluster 격리* + IVC로 안전 통신.

## Error Handling — Watchdog·Timeout

```c
uint32_t wait_response_timeout(int ms) {
    uint32_t start = jiffies;
    while ((jiffies - start) < msecs_to_jiffies(ms)) {
        if (mb[STATUS/4] != STATUS_BUSY) {
            return mb[RESPONSE/4];
        }
        cpu_relax();
    }
    /* Timeout — FPGA may be stuck */
    fpga_reset();
    return -ETIMEDOUT;
}
```

FPGA hang·corruption — *반드시 timeout + reset*.

## 자동차 사례 — Brake ECU + FPGA Sensor

```text
Cortex-R52 (lock-step) — control logic
  ↑ AXI mailbox ↓
Xilinx Zynq — sensor input processing
  ↑ AXI streaming ↓
Camera·LiDAR data

매 frame:
  R52: cmd "ProcessFrame"
  FPGA: 처리 (수 ms)
  FPGA: status "Done" + IRQ
  R52: data fetch
```

ASIL-D — *timing 정확성 mailbox protocol에 기록*.

## 자주 하는 실수

> ⚠️ DMB 없이 cmd write

```c
mb[ARG] = 42;
mb[CMD] = CMD_PROCESS;   /* ← FPGA가 ARG=0 볼 수 있음 */
```

→ `__DMB()` 사이.

> ⚠️ IRQ 안 ack

```c
fpga_isr() {
    /* status read */
    /* W1C 안 함 */
}
/* → IRQ 계속 pending — storm */
```

→ ack 명시.

> ⚠️ Sequence number 안 씀

```c
/* duplicate command 가능 */
send(CMD);   /* IRQ로 ack */
send(CMD);   /* dup? */
```

→ sequence + idempotency.

> ⚠️ Timeout 없이 wait

```c
while (mb[STATUS] == BUSY);   /* FPGA hang → 영원 */
```

→ timeout + watchdog reset.

## 정리

- Mailbox = **register + doorbell + sequence + CRC**.
- Linux **mailbox framework** = vendor-agnostic.
- Zynq Ultrascale+·STM32MP1 — built-in mailbox.
- 작은 message = mailbox, 큰 data = DMA + completion.
- **OpenAMP RPMsg** = mailbox + virtio.
- 자동차 — sequence·CRC·timeout 필수.

다음 편은 **CQ·SQ**.

## 관련 항목

- [4-06: IRQ Affinity](/blog/embedded/modern-recipes/part4-06-irq-affinity)
- [5-02: CQ·SQ](/blog/embedded/modern-recipes/part5-02-cq-sq)
