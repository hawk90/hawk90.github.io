---
title: "Ch 3: 멀티프로세서 SW — AMP·SMP·OpenAMP·RPMsg in LV"
date: 2026-05-18T03:00:00
description: "발사체 heterogeneous SoC의 SW 협업 패턴. AMP·SMP·OpenAMP·RPMsg·remoteproc. Fault isolation."
series: "Launch Vehicle Flight Software"
seriesOrder: 3
tags: [avionics, amp, smp, openamp, rpmsg, ipc]
draft: true
---

## 한 줄 요약

> **"LV FCC = ARM Linux + DSP/Cortex-R RTOS"** — OpenAMP·RPMsg로 통신.

## SMP vs AMP — LV 적용

```text
SMP (Symmetric):
  같은 OS — Linux 또는 PREEMPT_RT
  모든 코어 공유
  Mission management·telemetry에 적합
  
AMP (Asymmetric):
  각 코어 별도 OS
  Linux + RTOS 또는 RTOS + RTOS
  Fault isolation 우수
  LV에 *주류*
```

LV — *AMP가 일반적*. ASIL·DO-178C 인증 시 *격리 필수*.

## Heterogeneous AMP Architecture

```text
Zynq Ultrascale+ 사례:
  
  Cortex-A53 × 4 (APU):
    OS: Linux PREEMPT_RT
    Mission management
    Telemetry encoding
    Network·comm
    
  Cortex-R5 × 2 (RPU) DCLS:
    OS: FreeRTOS·VxWorks
    TVC control loop
    Sensor fusion
    Safety-critical
    
  PMU MicroBlaze:
    Power management
    
  FPGA fabric (PL):
    Custom timing·I/O
    
모두 *같은 SoC*. *공유 메모리·shared peripherals*.
```

## OpenAMP — Linaro Framework

```text
OpenAMP layers:
  1. libmetal       — HAL, memory map, IRQ
  2. open-amp       — RPMsg, remoteproc, virtio-vring
  3. application    — RPMsg endpoint

Standardized:
  Apache 2.0
  Cortex-A·Cortex-R·DSP 모두 지원
```

KARI·NASA·ESA — *OpenAMP 채택 증가*.

## RPMsg — IPC

```c
/* APU (Linux) side */
#include <linux/rpmsg.h>

struct rpmsg_device *rpdev;
struct rpmsg_endpoint *ept;

int rx_cb(struct rpmsg_device *rpdev, void *data, int len,
           void *priv, u32 src) {
    /* Receive from RPU */
    process_rpu_message(data, len);
    return 0;
}

ept = rpmsg_create_ept(rpdev, &chinfo);

/* Send to RPU */
rpmsg_send(ept, msg, sizeof(msg));
```

```c
/* RPU (FreeRTOS) side */
#include "openamp/open_amp.h"

struct rpmsg_endpoint ep;
rpmsg_create_ept(&ep, &rpmsg_device, "control-channel",
                  RPMSG_ADDR_ANY, RPMSG_ADDR_ANY,
                  rx_cb, NULL);

rpmsg_send(&ep, command, sizeof(command));
```

`rpmsg_send` — *zero-copy via virtio-vring*. Linux ↔ RTOS 표준.

## remoteproc — Linux RPU Control

```bash
# Linux APU에서 RPU firmware load
echo rpu_firmware.elf > /sys/class/remoteproc/remoteproc0/firmware
echo start > /sys/class/remoteproc/remoteproc0/state

# RPU log
cat /sys/kernel/debug/remoteproc/remoteproc0/trace0

# Stop·restart
echo stop > /sys/class/remoteproc/remoteproc0/state
```

OTA로 *RPU firmware만 교체* 가능. LV ground test에서 *iteration 빠름*.

## virtio-vring — Shared Memory

```text
DDR shared region:
  vring_tx (APU → RPU):
    desc[N]    buffer descriptors
    avail      producer index
    used       consumer index
  
  vring_rx (RPU → APU):
    desc[N]
    avail
    used
  
  buffer_pool

Memory attribute:
  Non-cacheable 또는 명시 maintenance
  Cortex-A·R 둘 다 일관성 유지
```

KVM virtio와 같은 protocol — *driver 재활용*.

## Role 분할 — LV FCC 사례

```text
APU (Linux):
  GUI / ground operator interface (pre-launch)
  Telemetry encoding (CCSDS)
  GPS/INS fusion (high-level)
  Mission timeline
  Database (event log)
  
RPU (FreeRTOS):
  Sensor sampling (1-10 kHz)
  TVC actuator control
  Engine cutoff timing
  Stage separation logic
  Hardware health monitor
  
FPGA:
  IMU sampling (>10 kHz)
  Reed-Solomon encoding
  Custom protocols
  Watchdog
```

각 영역 *deadline·언어·인증 요구* 다름.

## Fault Isolation

```text
AMP의 핵심 — fault 격리:
  Linux 측 task가 hang → RPU 영향 0
  RTOS 측 task가 crash → Linux 영향 0
  
ARINC-653 partitioning과 비슷:
  Time partition (별도 시간 axis)
  Space partition (별도 memory)
```

ASIL-D·DO-178C Level A — *partition isolation 필수*. AMP는 *hardware-level* 격리.

## Communication Patterns

### Command·Response

```c
typedef struct {
    uint16_t cmd_id;
    uint16_t length;
    uint8_t payload[60];
} cmd_msg_t;

/* APU sends */
cmd_msg_t cmd = { .cmd_id = CMD_START_TVC, ... };
rpmsg_send(ept, &cmd, sizeof(cmd));

/* RPU receives, processes, replies */
```

### Streaming Sensor

```c
typedef struct {
    uint64_t timestamp_us;
    int16_t accel_xyz[3];
    int16_t gyro_xyz[3];
} imu_sample_t;

/* RPU streams 1 kHz IMU */
for (;;) {
    sample = read_imu();
    rpmsg_send(ept, &sample, sizeof(sample));
    vTaskDelay(pdMS_TO_TICKS(1));
}
```

### Telemetry Forwarding

```c
/* RPU → APU → ground */
RPU: rpmsg_send(telemetry_data);
APU: encode_ccsds(telemetry_data) → downlink_telemetry();
```

## ARINC-653 — APEX

```text
ARINC-653 (Avionics Application Standard Software Interface):
  Partition based RTOS
  Time partition (slots)
  Space partition (memory)
  
  Each partition:
    별도 task·driver
    Inter-partition comm via *port* (queueing·sampling)
    
구현:
  INTEGRITY·LynxOS·PikeOS·VxWorks 653
  
민항 사용:
  A380·B787·B777X
```

LV — ARINC-653 *부분 적용* 또는 *AMP로 대체*.

## Hypervisor 사용

```text
Cortex-A78AE + EL2 hypervisor:
  Multiple VM
  Each VM = partition
  Strong isolation
  Type-1 hypervisor: Xen·Bao·sysGo PikeOS
  
LV 가능성:
  여러 mission function 통합
  → ECU consolidation 트렌드
```

자동차에서 시작 — LV 적용 점진.

## Time Sync — APU·RPU

```text
Shared timestamp:
  ARM Generic Timer (CNTPCT)
  All cores 같은 counter
  → Linux clock_gettime · FreeRTOS xTaskGetTickCount sync
  
Application:
  APU·RPU 메시지 *timestamp 일치*
  Sensor·command·response correlation
```

CNTPCT는 SMP·AMP 모두에서 *unified time*.

## boot sequence

```text
1. ROM bootloader (mask ROM)
2. First-Stage Bootloader (FSBL) — boot Cortex-R·M
3. U-Boot 또는 TF-A — boot Cortex-A
4. Linux APU 부팅
5. Linux remoteproc → RPU firmware load
6. RPU FreeRTOS 시작
7. OpenAMP channel establish
8. Mission phase 진입
```

각 단계 *수 초*. LV — pre-launch에 *모든 boot 완료*.

## STM32MP1 사례

```text
STM32MP1:
  Cortex-A7 × 2 — Linux
  Cortex-M4 × 1 — FreeRTOS·bare-metal
  
LV·소형 위성에서 사용:
  Small CubeSat
  Pico/Nano satellite
  
Linux GUI + M4 sensor read
```

소형 발사체·CubeSat — *비용 효율*.

## ESA SAVOIR / LEON

```text
ESA SAVOIR (Space Avionics Open Interface aRchitecture):
  Standardized avionics
  
LEON processor:
  SPARC V8 architecture
  ESA/Gaisler open
  Rad-hard variants
  Linux·RTEMS support
  
ESA mission 표준
```

ESA — *LEON + RTEMS* 표준. ARM 대안.

## Performance — RPMsg Latency

```text
Cortex-A53 ↔ Cortex-R5 RPMsg:
  Message size 64 byte:
    Latency: 5-20 µs
    Throughput: ~100 MB/s (via shared memory)
    
Mailbox IRQ alone:
  Latency: 1-2 µs
```

LV control loop이 *수십 ms cycle*이라면 RPMsg는 *충분히 빠름*.

## 자주 하는 실수

> ⚠️ Cache 일관성 가정

```text
APU cache + RPU cache + shared DDR
→ stale data 가능
```

→ non-cacheable region 또는 명시 maintenance.

> ⚠️ Vring 크기 underestimate

```text
Burst 시 vring full → message drop
```

→ peak rate 분석 + buffer pool sizing.

> ⚠️ Single endpoint everything

```text
1 RPMsg channel — 명령·streaming·log 모두
→ priority inversion
```

→ separate channels.

> ⚠️ RPU firmware update 시 APU dependency

```text
RPU restart → APU side 한참 hang
```

→ graceful handshake·timeout.

## 정리

- LV FCC = **AMP heterogeneous** (Linux + RTOS).
- **OpenAMP framework** = libmetal + RPMsg + remoteproc.
- **virtio-vring shared memory** IPC.
- **Fault isolation** — partition·hypervisor.
- ARINC-653·LEON·SAVOIR — 표준.
- 한국 LV — *KARI 자체 OpenAMP 기반* 구조.

다음 편은 **Control·Signal 처리**.

## 관련 항목

- [Ch 2: FCC Architecture](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter02-fcc-architecture)
- [Ch 4: Control·Signal](/blog/embedded/avionics/launch-vehicle-flight-sw/chapter04-control-and-signal)
- [RTOS 4-12: AMP·OpenAMP](/blog/embedded/rtos/practical-internals/part4-12-amp-openamp)
