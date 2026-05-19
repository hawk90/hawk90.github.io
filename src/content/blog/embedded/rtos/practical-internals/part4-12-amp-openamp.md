---
title: "4-12: AMP·OpenAMP — Heterogeneous SoC·RPMsg·remoteproc"
date: 2026-05-20T00:00:00
description: "Cortex-A+M 조합. AMP. OpenAMP/RPMsg/remoteproc. Shared memory IPC. i.MX·STM32MP·RP2350."
series: "Practical RTOS Internals"
seriesOrder: 44
tags: [amp, openamp, heterogeneous, rpmsg, remoteproc, imx, stm32mp]
draft: true
---

## 한 줄 요약

> **"AMP = 한 SoC 안 *서로 다른 OS*"** — Cortex-A의 Linux + Cortex-M의 RTOS.

## Heterogeneous SoC 사례

| SoC | 구성 |
|---|---|
| **i.MX 8M Plus** | 4 × Cortex-A53 + Cortex-M7 |
| **i.MX 93** | 2 × Cortex-A55 + Cortex-M33 |
| **STM32MP1** | 2 × Cortex-A7 + Cortex-M4 |
| **STM32MP2** | 2 × Cortex-A35 + Cortex-M33 |
| **RP2350** | 2 × Cortex-M33 + 2 × RISC-V Hazard3 |
| **Xilinx Zynq Ultrascale+** | 4 × Cortex-A53 + 2 × Cortex-R5 + Mali GPU |
| **TI AM62x** | Cortex-A53 + 2 × Cortex-R5 + 2 × Cortex-M4 |

각 core 역할:
- **Cortex-A** — Linux, 사용자 UI, 통신
- **Cortex-M** — 실시간 control, low-latency I/O
- **Cortex-R** — safety-critical (자동차)

## AMP — Each Core Independent OS

```text
Cortex-A (Linux):
  - DDR 영역 0x80000000 - 0xFFFFFFFF
  - 자체 boot, scheduler, drivers
  - IPC interface to M-core

Cortex-M (FreeRTOS):
  - SRAM·TCM 또는 DDR 일부 (0x80000000 reserved)
  - Linux와 *통신*하나 *공유 OS 아님*
  - 자체 boot, IRQ
```

각 core 독립 — *각자의 OS·memory·schedule*.

## OpenAMP Framework

```text
Mentor Graphics·Xilinx 시작 → Linaro 표준화

3 layers:
  1. libmetal — HAL, memory·IRQ·atomic
  2. open-amp — RPMsg, remoteproc, virtio
  3. application
```

```c
/* M-core side — FreeRTOS */
#include "openamp/open_amp.h"

struct rpmsg_endpoint ep;
rpmsg_create_ept(&ep, &rpmsg_device,
                  "echo-channel", RPMSG_ADDR_ANY, RPMSG_ADDR_ANY,
                  rx_callback, NULL);

rpmsg_send(&ep, data, len);
```

## RPMsg — Remote Processor Messaging

```text
Linux client                M-core server
     │                            │
     │  rpmsg_send("hello")       │
     │ ───────────────────────→  │
     │                            │
     │  rpmsg_send("ack")          │
     │ ←─────────────────────────│
     │                            │
   (kernel rpmsg driver)       (FreeRTOS rpmsg lib)
```

Driver 위 *channel·endpoint* 개념. TCP 같은 추상화.

## remoteproc — Linux side

```bash
# Load M-core firmware
echo m4_firmware.elf > /sys/class/remoteproc/remoteproc0/firmware
echo start > /sys/class/remoteproc/remoteproc0/state

# Stop
echo stop > /sys/class/remoteproc/remoteproc0/state
```

Linux가 *M-core boot/stop 통제*. Firmware 동적 교체 가능.

## virtio-vring — 공유 메모리 IPC

```text
Shared DDR 영역:
  vring_tx_buffer  — A→M ring
  vring_rx_buffer  — M→A ring

Each ring:
  desc[] — descriptor (addr, len)
  avail[] — available slot (writer)
  used[]  — used slot (reader)
```

Virtio 표준 — KVM·QEMU·OpenAMP 모두 같은 protocol. Cache-coherent 영역 또는 *non-cacheable*.

## IPI 또는 Mailbox

```text
A-core → M-core 신호:
  방법 1: Mailbox peripheral (write to register → M-core IRQ)
  방법 2: SGI (Cortex-A GIC)
  
M-core → A-core:
  IPI (또는 IRQ to GIC SPI)
```

i.MX RT — *MU* (Messaging Unit) peripheral. STM32MP — *IPCC*.

## 자동차 — Hypervisor + AMP

```text
Cortex-A78 cluster (4 core):
  EL2 Hypervisor (Xen·Hyperviser by Bosch)
    ├ VM 1: Android (인포테인먼트)
    ├ VM 2: Linux (V2X·연결)
    └ VM 3: PREEMPT_RT Linux (ADAS)
  
Cortex-R52 cluster (2 core lock-step):
  AUTOSAR ECU (brake·steer·airbag)
  
Communication: virtio-rpmsg over IPC
```

ASIL-D는 R52에서 (lock-step). 일반 기능은 A78 VM에. *물리적 격리*.

## RP2040 / RP2350 Dual-Core

```c
#include "pico/multicore.h"

void core1_task(void) {
    while (1) {
        uint32_t cmd = multicore_fifo_pop_blocking();
        process(cmd);
    }
}

int main(void) {
    multicore_launch_core1(core1_task);
    multicore_fifo_push_blocking(0x1234);
}
```

RP2040 — *대칭 SMP 아님* (FreeRTOS 11 SMP는 가능). RP2350 — Cortex-M33 + Hazard3 RISC-V *heterogeneous* 가능.

## RP2350 — ARM+RISC-V Hybrid

```text
RP2350:
  Cortex-M33 × 2  OR  Hazard3 RISC-V × 2
  → boot 시 선택 (FUSE)
  → 같은 binary, 다른 ISA에서 실행
```

특이 — 사용자가 *ISA 선택*. 같은 코어 layout, 다른 명령어 set.

## Linux side — RPMsg Application

```c
#include <linux/rpmsg.h>

int rpmsg_probe(struct rpmsg_device *rpdev) {
    ept = rpmsg_create_ept(rpdev, &chinfo);
    return 0;
}

int rpmsg_callback(struct rpmsg_device *rpdev, void *data, int len, ...) {
    /* Received from M-core */
    process(data, len);
    return 0;
}

static struct rpmsg_driver rpmsg_drv = {
    .drv.name = "echo-rpmsg",
    .probe = rpmsg_probe,
    .callback = rpmsg_callback,
};
```

또는 user-space `rpmsg_char` device — `/dev/rpmsgN` 통해 read/write.

## Heterogeneous Boot — Linux boot M-core

```text
1. SPL boots
2. U-Boot loads
3. U-Boot → load M-core ELF to shared memory
4. U-Boot → remoteproc start M-core
5. U-Boot → load Linux kernel
6. Linux boot → continue M-core conversation
```

또는 Linux가 *런타임 load* — `echo start > /sys/.../remoteproc`.

## OpenAMP Application Patterns

### Echo Server (M) ↔ Client (A)

```c
/* M-core echo */
int rx_callback(struct rpmsg_endpoint *ept, void *data, size_t len, ...) {
    rpmsg_send(ept, data, len);   /* echo back */
    return RPMSG_SUCCESS;
}
```

### Sensor Stream (M → A)

```c
/* M-core — periodic sensor read */
void sensor_task(void *p) {
    for (;;) {
        sensor_data_t d = read_sensor();
        rpmsg_send(&sensor_ep, &d, sizeof(d));
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}

/* Linux — receive + log */
read(rpmsg_fd, &data, sizeof(data));
log_to_database(&data);
```

## 자주 하는 실수

> ⚠️ Shared memory cache 무시

```c
/* M-core write */
shared_buf[0] = 0x42;
/* Linux read → 옛 데이터 (cache stale) */
```

→ shared memory *non-cacheable* MPU/MMU 설정. 또는 *명시 cache maintenance*.

> ⚠️ A-core boot M-core 안 함

```c
M-core firmware가 flash에 있는데 — Linux remoteproc 안 start
→ M-core 멈춰 있음
```

→ `echo start > /sys/.../state` 또는 boot script.

> ⚠️ Endianness 차이

A-core little-endian + M-core little-endian — OK.  
하나라도 big endian이면 — *명시 변환*.

> ⚠️ Memory layout 충돌

```text
Linux DDR: 0x80000000 - 0xBFFFFFFF
M-core DDR: 0xC0000000 - 0xC07FFFFF (reserved)

Linux device tree에 *reserved-memory* 명시 안 하면 → Linux가 사용 → corruption
```

→ device tree `reserved-memory` 노드.

## 정리

- AMP = **각 core 별도 OS**.
- **OpenAMP** = libmetal + RPMsg + remoteproc + virtio.
- i.MX·STM32MP·Zynq·RP2350 — heterogeneous SoC.
- Linux remoteproc — M-core *boot/stop 통제*.
- 자동차 — Hypervisor + AMP + lock-step.
- Shared memory는 *non-cacheable* 또는 *명시 maintenance*.

다음 편은 **C++ in RTOS**.

## 관련 항목

- [4-11: TrustZone·TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
- [4-13: C++ in RTOS](/blog/embedded/rtos/practical-internals/part4-13-cpp-in-rtos)
