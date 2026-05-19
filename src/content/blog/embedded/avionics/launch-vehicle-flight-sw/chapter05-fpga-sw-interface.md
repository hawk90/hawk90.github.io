---
title: "Ch 5: FPGA-SW Interface — AXI·Register Map·IRQ·DMA Descriptor"
date: 2026-05-18T05:00:00
description: "FPGA-CPU 통합 SW 관점. AXI4/Lite/Stream, register map, IRQ, DMA descriptor ring."
series: "Launch Vehicle Flight Software"
seriesOrder: 5
tags: [avionics, fpga, axi, dma, irq, register-map]
draft: true
---

## 한 줄 요약

> **"FPGA-SW = AXI bus + register map + IRQ + DMA descriptor"** — SW 입장 4가지 인터페이스.

## AXI Interface 종류

```text
AXI4 (full):
  Memory-mapped DMA
  Burst·outstanding
  GPU·NPU·custom accelerator
  
AXI-Lite:
  Register interface
  Single-beat only
  Control·status registers
  
AXI-Stream:
  Continuous data flow
  No address
  Video·audio·packet
```

LV — *AXI-Lite control + AXI-Stream data + AXI4 DMA*.

## Register Map 설계

```c
/* FPGA IP register map */
typedef struct {
    volatile uint32_t CONTROL;        /* 0x00 — RW */
    volatile uint32_t STATUS;         /* 0x04 — RO */
    volatile uint32_t ERROR;          /* 0x08 — W1C */
    volatile uint32_t VERSION;        /* 0x0C — RO */
    volatile uint32_t DMA_SRC;        /* 0x10 — RW */
    volatile uint32_t DMA_DST;        /* 0x14 — RW */
    volatile uint32_t DMA_LEN;        /* 0x18 — RW */
    volatile uint32_t DMA_DESC_HEAD;  /* 0x1C — RW */
    volatile uint32_t IRQ_ENABLE;     /* 0x20 — RW */
    volatile uint32_t IRQ_STATUS;     /* 0x24 — W1C */
    /* ... */
} fpga_regs_t;

#define FPGA_BASE 0xA0000000
fpga_regs_t *fpga = (fpga_regs_t*)FPGA_BASE;
```

표준 layout — *CONTROL·STATUS·ERROR·VERSION·DMA·IRQ*. 모든 IP 공통.

## Linux Driver — mmap BAR

```c
static int my_probe(struct platform_device *pdev) {
    struct resource *res = platform_get_resource(pdev, IORESOURCE_MEM, 0);
    void __iomem *base = devm_ioremap_resource(&pdev->dev, res);
    
    /* Register access */
    uint32_t v = ioread32(base + CTRL);
    iowrite32(v | START, base + CTRL);
    
    /* IRQ */
    int irq = platform_get_irq(pdev, 0);
    devm_request_threaded_irq(&pdev->dev, irq, my_isr, my_thread,
                                IRQF_SHARED, "myfpga", priv);
    return 0;
}
```

표준 Linux platform driver — devicetree match.

## Bare-Metal Cortex-R/M

```c
#include "xil_io.h"

uint32_t Xil_In32(uint32_t addr);
void Xil_Out32(uint32_t addr, uint32_t val);

Xil_Out32(FPGA_BASE + CTRL, START_CMD);
while (Xil_In32(FPGA_BASE + STATUS) & BUSY);
```

Xilinx SDK — `Xil_In32`/`Xil_Out32` 표준.

## IRQ Routing — GIC

```text
FPGA IP:
  IRQ output → PL-PS IRQ port
   → GIC SPI (Shared Peripheral Interrupt)
   → Cortex-A·R IRQ
   → kernel ISR or RTOS handler
```

```c
/* Devicetree */
my_accel@a0000000 {
    compatible = "myco,my-accel";
    reg = <0xa0000000 0x1000>;
    interrupts = <0 89 4>;   /* GIC SPI 89, level-high */
};
```

## DMA Descriptor Ring

```c
typedef struct __attribute__((aligned(64))) {
    uint32_t next;
    uint32_t reserved;
    uint32_t buffer_addr;
    uint32_t reserved2;
    uint32_t control;       /* SOF·EOF·LEN */
    uint32_t status;        /* CMP·ERR·HW status */
    uint32_t app[5];        /* user data */
} sg_desc_t;

sg_desc_t descs[16];

/* Setup ring */
for (int i = 0; i < 16; i++) {
    descs[i].buffer_addr = (uint32_t)buf[i];
    descs[i].control = SOF | (BUF_SIZE & 0xFFFF);
    descs[i].next = (uint32_t)&descs[(i + 1) % 16];   /* circular */
}

/* Start DMA */
fpga->DMA_DESC_HEAD = (uint32_t)&descs[0];
fpga->CONTROL |= DMA_START;
```

Xilinx AXI DMA·Custom DMA — SG mode 표준.

## Completion IRQ

```c
volatile uint16_t cq_head;

irqreturn_t fpga_isr(int irq, void *priv) {
    uint32_t status = fpga->IRQ_STATUS;
    fpga->IRQ_STATUS = status;   /* W1C */
    
    if (status & DMA_DONE) {
        cq_head = (cq_head + 1) % NUM_DESC;
    }
    if (status & ERROR) {
        log_error(...);
    }
    
    return IRQ_HANDLED;
}

void task(void) {
    while (1) {
        if (cq_head != cq_tail) {
            process_frame(descs[cq_tail].buffer_addr);
            cq_tail = (cq_tail + 1) % NUM_DESC;
        }
    }
}
```

CQ ring + IRQ — DMA Completion 표준.

## AXI-Lite Control Register

```c
/* Vitis HLS control register layout */
typedef struct {
    volatile uint32_t AP_CTRL;       /* 0x00 — start/done/idle */
    volatile uint32_t GIE;           /* 0x04 — global IRQ enable */
    volatile uint32_t IER;           /* 0x08 — IRQ enable */
    volatile uint32_t ISR;           /* 0x0C — IRQ status */
    volatile uint32_t input_addr;    /* 0x10 — function arg */
    volatile uint32_t output_addr;   /* 0x18 */
    volatile uint32_t size;          /* 0x20 */
} hls_ctrl_t;

#define AP_START   (1 << 0)
#define AP_DONE    (1 << 1)
#define AP_IDLE    (1 << 2)
#define AP_READY   (1 << 3)
#define AP_AUTORESTART (1 << 7)

void run_accel(int input_phys, int output_phys, int size) {
    hls_ctrl_t *ctrl = (hls_ctrl_t*)BASE;
    ctrl->input_addr = input_phys;
    ctrl->output_addr = output_phys;
    ctrl->size = size;
    
    ctrl->IER = 0x1;   /* done IRQ */
    ctrl->GIE = 0x1;
    ctrl->AP_CTRL = AP_START;
    
    /* IRQ on done */
}
```

Vitis HLS 자동 생성 layout — *모든 HLS accelerator 동일*.

## AXI-Stream — Continuous

```text
AXI-Stream signals:
  TDATA   — payload
  TVALID  — valid
  TREADY  — ready (backpressure)
  TLAST   — packet end
  TUSER   — sideband
  TKEEP   — byte enable
  
Usage:
  Camera CSI → AXI-Stream → DMA → DDR
  ML inference → AXI-Stream → next stage
```

DMA controller가 *AXI-Stream → AXI4* 변환.

## SpaceWire Interface

```text
SpaceWire (ECSS-E-ST-50-12C):
  ESA space avionics standard
  200 Mbit/s LVDS
  RMAP (Remote Memory Access Protocol)
  
FPGA SpaceWire IP:
  - GRSPW2 (Cobham/Gaisler)
  - SpaceWire UART
  - Wormhole router

Linux SpaceWire driver:
  /dev/spw0
  ioctl·read/write
```

ESA mission 표준 — *Sentinel·BepiColombo·JUICE*.

## CompactPCI·VPX Backplane

```text
VPX (VITA 46):
  6.25 Gbps SerDes lanes
  PCIe·SRIO·SpaceWire·Ethernet 통합
  OpenVPX standard topology
  
FPGA on VPX:
  PCIe endpoint
  SerDes lanes for data fabric
  TPC (Trigger·Power·Control)
```

Mil-aero·LV FCC 백plane.

## Watchdog — FPGA Hardware

```c
/* FPGA hardware watchdog */
volatile uint32_t *wdt = (uint32_t*)WDT_BASE;

/* SW must pet watchdog every N ms */
wdt[KICK] = 0xDEADBEEF;

/* No kick → FPGA resets PS·system */
```

LV — *hardware watchdog 필수*. FPGA가 *CPU hang 감지*.

## Mailbox Pattern

```c
/* SW → FPGA command */
fpga->CMD_REG = CMD_PROCESS;
fpga->CMD_ARG = data;
fpga->DOORBELL = 1;   /* wake FPGA */

/* FPGA → SW (via IRQ + status) */
while (!(fpga->STATUS & READY));
uint32_t result = fpga->RESPONSE;
```

7-01 chapter — mailbox protocol. CRC·sequence·timeout 표준.

## Test·Validation

```text
1. Unit — FPGA RTL simulation (Verilator·QuestaSim)
2. Cosim — C + RTL co-simulation
3. Hardware-in-loop (HIL) — FPGA + sensor·actuator
4. Mission rehearsal — full system
```

LV — *각 단계 인증 문서* 필요.

## 자주 하는 실수

> ⚠️ Register write 순서

```c
fpga->ADDR = src;
fpga->LEN = 100;
fpga->START = 1;   /* ← ADDR·LEN이 commit 안 됐을 수 */
```

→ `__DMB()` 사이 또는 *posted write flush*.

> ⚠️ DMA descriptor cache

```c
descs[0].buffer_addr = ...;
fpga->DMA_DESC_HEAD = (uint32_t)&descs[0];
/* CPU cache 안 flush → FPGA 옛 descriptor */
```

→ non-cacheable region 또는 *clean*.

> ⚠️ IRQ ack 안 함

```c
isr(...) {
    process();
    /* W1C 안 함 — IRQ pending 계속 */
}
```

→ `fpga->IRQ_STATUS = status` (write 1 to clear).

> ⚠️ FPGA reset 순서

```c
/* FPGA reset 후 SW 즉시 사용 → DMA descriptor 없음 */
```

→ FPGA init 끝 *대기* (poll AP_IDLE).

## 정리

- FPGA-SW = **AXI4 DMA + AXI-Lite control + IRQ + descriptor ring**.
- Register map — *CONTROL·STATUS·ERROR·VERSION* 표준.
- Vitis HLS 자동 layout — `AP_CTRL`·`IER`·`ISR`.
- AXI-Stream + DMA — *continuous data*.
- SpaceWire·VPX — space avionics 표준 backplane.
- LV — *hardware watchdog 필수*.

다음 편은 **CCSDS Space Packet**.

## 관련 항목

- [Ch 4: Control·Signal](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter04-control-and-signal)
- [Ch 6: CCSDS Space Packet](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter06-ccsds-space-packet)
- [Modern Recipes 5-01: Mailbox](/blog/embedded/modern-recipes/part5-01-mailbox)
