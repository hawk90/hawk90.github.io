---
title: "4-12: AMP·OpenAMP — Heterogeneous SoC·RPMsg·remoteproc"
date: 2026-05-07T00:00:00
description: "Cortex-A와 Cortex-M이 한 칩 위에서 별도의 OS를 돌리는 AMP 구조를 정리합니다. OpenAMP framework(libmetal/RPMsg/remoteproc), virtio-vring 기반 shared memory IPC, mailbox 인터럽트, i.MX·STM32MP·RP2350 사례까지 다룹니다."
series: "Practical RTOS Internals"
seriesOrder: 44
tags: [amp, openamp, heterogeneous, rpmsg, remoteproc, imx, stm32mp]
---

## 한 줄 요약

> **"AMP는 한 SoC 안에서 *서로 다른 OS*가 *서로 다른 코어*를 돌리는 모델입니다."** — Cortex-A의 Linux와 Cortex-M의 RTOS가 mailbox와 shared memory로 대화합니다.

## 어떤 문제를 푸는가

4-07편의 SMP는 *하나의 OS가 모든 코어를 관리*하는 모델이었습니다. ready list와 lock을 공유하기 때문에 모든 코어가 같은 ABI를 따라야 하고, 실시간 결정성과 throughput을 같은 scheduler 안에서 타협해야 합니다.

현실의 SoC는 자주 *목적이 다른 코어들*을 한 칩에 묶어 놓습니다. UI와 네트워크를 책임지는 Cortex-A는 Linux가 적합하고, 모터 제어처럼 *수 마이크로초 결정성*이 필요한 작업은 Cortex-M에서 RTOS로 돌려야 합니다. 두 코어를 SMP로 묶으면 둘 다 손해입니다. Linux는 RT 결정성을 보장하지 못하고, RTOS는 거대한 Linux 자료구조를 다룰 수 없습니다.

해답은 **AMP**(Asymmetric Multi-Processing)입니다. 각 코어가 *독립된 OS*를 부팅하고, 코어 사이는 *명시적 IPC*로만 통신합니다. 이 IPC를 표준화한 것이 **OpenAMP**이고, 그 위에 얹는 통신 추상화가 **RPMsg**입니다.

이번 편은 OpenAMP의 layer 구조, virtio-vring 기반 shared memory, mailbox/IPI를 통한 동기화, 실제 heterogeneous SoC 사례를 정리합니다.

## Heterogeneous SoC — 누가 누구를 데리고 있나

| SoC | 구성 |
|---|---|
| i.MX 8M Plus | 4 × Cortex-A53 + Cortex-M7 |
| i.MX 93 | 2 × Cortex-A55 + Cortex-M33 |
| STM32MP1 | 2 × Cortex-A7 + Cortex-M4 |
| STM32MP2 | 2 × Cortex-A35 + Cortex-M33 |
| Xilinx Zynq UltraScale+ | 4 × Cortex-A53 + 2 × Cortex-R5 |
| TI AM62x | Cortex-A53 + 2 × Cortex-R5 + 2 × Cortex-M4 |
| RP2350 | 2 × Cortex-M33 + 2 × RISC-V Hazard3 |

각 코어에는 정해진 역할이 있습니다.

- Cortex-A는 *Linux*를 돌려 UI, 통신, 파일 시스템, 보안 통신을 담당합니다.
- Cortex-M은 *RTOS*에서 low-latency I/O, 센서 sampling, 모터 PWM을 담당합니다.
- Cortex-R은 *AUTOSAR* 등 safety-critical 작업에 lock-step으로 쓰입니다.

같은 칩에 묶이는 이유는 *BOM 비용*과 *물리적 거리*입니다. PCB 위에 별도 칩으로 두는 것보다 한 SoC에 통합하는 편이 전력, 면적, 단가에서 유리합니다. 대신 소프트웨어가 코어 사이 통신을 설계해야 합니다.

## AMP의 기본 구조

```text
DDR / SRAM:
  0x4000_0000 ~ 0xBFFF_FFFF : Linux 점유
  0xBFF0_0000 ~ 0xBFFF_FFFF : 공유 (vring + buffer pool, reserved-memory)
  0x8000_0000 ~ 0x8007_FFFF : Cortex-M firmware 전용

Boot:
  1. SoC reset → Cortex-A가 부트, ROM → SPL → U-Boot → Linux
  2. Linux remoteproc driver가 Cortex-M firmware load
  3. Cortex-M boot, OpenAMP 초기화
  4. 두 OS가 RPMsg endpoint를 통해 통신
```

각 코어는 *자기 메모리에서 자기 OS만 본다*는 점이 핵심입니다. 공유 영역은 *device tree에 reserved-memory로 명시*되어 Linux가 일반 메모리로 사용하지 못하게 막습니다. 이 영역만이 두 코어가 동시에 접근하는 통로가 됩니다.

## OpenAMP — 표준화된 IPC Framework

OpenAMP는 원래 Mentor Graphics와 Xilinx가 시작한 라이브러리였고, 지금은 Linaro 산하 OpenAMP project로 표준화되어 있습니다. BSD-3-Clause 오픈소스입니다.

```text
OpenAMP 3 layer:
  1. libmetal       HAL — memory map, IRQ register, atomic
  2. open-amp       RPMsg / remoteproc / virtio-vring 구현
  3. application    RPMsg endpoint를 통한 통신
```

전체 topology를 한 장으로 보면 이렇습니다. 두 코어가 각자의 libmetal HAL 위에 RPMsg/virtio를 올리고, 공유 DDR의 vring과 buffer pool을 매개로 메시지를 주고받습니다. mailbox IRQ가 상대 코어를 깨우는 신호입니다.

![OpenAMP heterogeneous SoC topology](/images/blog/rtos/diagrams/part4-12-openamp-topology.svg)

`libmetal`이 *플랫폼 추상화*입니다. 같은 OpenAMP 코드가 Linux 위에서도 FreeRTOS/Zephyr 위에서도 빌드되도록 *memory map, interrupt register, polling/blocking wait*를 추상화합니다.

```c
/* Cortex-M side — FreeRTOS + OpenAMP */
#include <openamp/open_amp.h>
#include <metal/io.h>

static struct rpmsg_endpoint  echo_ep;
static struct rpmsg_device   *rpdev;

static int echo_rx(struct rpmsg_endpoint *ept, void *data, size_t len,
                   uint32_t src, void *priv) {
    /* 받은 메시지를 그대로 돌려보냄 */
    return rpmsg_send(ept, data, len);
}

void openamp_task(void *p) {
    /* virtio device, vring 초기화 (플랫폼 layer) */
    rpdev = platform_create_rpmsg_vdev(0);

    /* "echo" channel endpoint 생성 */
    rpmsg_create_ept(&echo_ep, rpdev, "echo-channel",
                     RPMSG_ADDR_ANY, RPMSG_ADDR_ANY,
                     echo_rx, NULL);

    while (1) {
        platform_poll(rpdev);   /* mailbox IRQ wait + vring 처리 */
    }
}
```

## RPMsg — 코어 사이의 TCP 같은 추상화

RPMsg는 *channel과 endpoint*를 통해 메시지를 주고받는 protocol입니다. 한 channel은 양쪽에 *이름과 주소*를 가지고, 한 메시지는 헤더(src/dst, len, flags) + payload로 전송됩니다.

```text
Linux                              Cortex-M
  │                                    │
  │  rpmsg_send(ept, "hello", 5)       │
  │  ───────────────────────────────→  │  echo_rx(ept, "hello", 5, ...)
  │                                    │  rpmsg_send(ept, "hello", 5)
  │  rx_callback(..., "hello", 5)      │
  │  ←───────────────────────────────  │
  │                                    │
```

송수신 자체는 *비차단*입니다. 송신 측은 vring의 빈 descriptor에 buffer를 등록하고 mailbox를 통해 상대에게 알립니다. 수신 측은 mailbox IRQ를 받아 vring의 used ring을 확인하고 callback을 호출합니다.

## virtio-vring — Shared Memory의 큐 구조

OpenAMP는 *KVM/QEMU가 쓰는 virtio*를 그대로 차용합니다. 두 vring(TX, RX)이 공유 메모리에 놓이고, 각 vring은 descriptor 배열과 available/used ring으로 구성됩니다.

```text
Shared memory (reserved DDR):
  vring_tx (A → M)
    desc[N]   buffer 주소 + 길이
    avail     producer index (A 쪽이 update)
    used      consumer index (M 쪽이 update)

  vring_rx (M → A)
    desc[N]
    avail     M 쪽 producer
    used      A 쪽 consumer

  buffer_pool[2N]   실제 메시지 buffer
```

producer는 *avail index*를 증가시키고 mailbox로 상대를 깨웁니다. consumer는 *used index*를 증가시켜 buffer를 돌려 줍니다. 한쪽 vring이 가득 차면 송신은 차단되거나 즉시 실패합니다.

vring이 놓이는 메모리는 *non-cacheable* 또는 *명시적 cache maintenance*가 필요합니다. Cortex-A는 데이터 캐시가 있고, Cortex-M도 M7 이상이면 L1 cache가 있습니다. 캐시 일관성이 hardware로 보장되지 않는 SoC가 대부분이므로 *MPU/MMU에서 vring 영역을 device memory로 mapping*하거나, 매 송수신마다 *clean/invalidate*를 호출합니다.

## remoteproc — Linux가 Cortex-M을 부팅

Linux의 remoteproc driver는 *원격 코어의 firmware load, start, stop*을 sysfs로 노출합니다.

```bash
# M-core firmware 지정
echo m4_firmware.elf > /sys/class/remoteproc/remoteproc0/firmware

# M-core boot
echo start > /sys/class/remoteproc/remoteproc0/state

# 로그 확인
cat /sys/kernel/debug/remoteproc/remoteproc0/trace0

# stop
echo stop > /sys/class/remoteproc/remoteproc0/state
```

firmware ELF에는 *resource table*이라는 섹션이 들어 있고, 여기에 *vring 주소, buffer pool 주소, mailbox 정보*가 기록되어 있습니다. remoteproc가 ELF를 분석해 reserved-memory에 placement하고, 자기쪽 virtio device를 *resource table에 맞춰* 등록합니다. 그 결과 양쪽 OpenAMP가 *같은 vring을 보게* 됩니다.

이 메커니즘 덕분에 *Linux가 boot되어 있는 한 Cortex-M firmware를 동적으로 교체*할 수 있습니다. OTA로 M-core firmware만 교체하는 패턴이 가능합니다.

## Mailbox — 코어 사이 인터럽트

vring으로 데이터를 옮기는 것은 *async polling*만으로도 가능하지만, *상대를 깨우기*에는 인터럽트가 필요합니다. SoC마다 다른 hardware peripheral을 씁니다.

```text
NXP i.MX  : MU (Messaging Unit)
ST  STM32MP : IPCC (Inter-Processor Communication Controller)
Xilinx Zynq : IPI (Inter-Processor Interrupt)
TI AM62x   : Mailbox cluster
RP2350     : SIO doorbell + FIFO
```

A-core가 mailbox register에 쓰면 M-core쪽에 *고정된 IRQ*가 발생합니다. M-core 측 OpenAMP는 이 IRQ handler에서 *vring used/avail index를 확인*하고 endpoint callback을 dispatch합니다. 반대 방향도 같은 방식입니다.

## RPMsg Application — 두 가지 흔한 패턴

### Echo Server

가장 단순한 예입니다. M-core는 *수신한 메시지를 그대로 송신*합니다. RTT 측정과 채널 동작 확인에 쓰입니다.

```c
/* M-core */
static int echo_rx(struct rpmsg_endpoint *ept, void *data, size_t len,
                   uint32_t src, void *priv) {
    return rpmsg_send(ept, data, len);
}
```

### Sensor Stream (M → A)

자주 보는 실전 패턴입니다. M-core가 *주기적으로 센서 데이터*를 만들어 A-core에 흘려보냅니다.

```c
/* M-core — periodic sample */
typedef struct {
    uint64_t ts_us;
    int16_t  accel_xyz[3];
    int16_t  gyro_xyz[3];
} imu_sample_t;

void imu_task(void *p) {
    imu_sample_t s;
    for (;;) {
        s.ts_us = micros();
        read_imu(s.accel_xyz, s.gyro_xyz);
        rpmsg_send(&imu_ep, &s, sizeof(s));
        vTaskDelay(pdMS_TO_TICKS(10));   /* 100 Hz */
    }
}
```

Linux 측은 *user-space character device*(`/dev/rpmsg*`)로 같은 buffer를 read만 합니다.

```c
/* Linux user-space */
int fd = open("/dev/rpmsg_ctrl0", O_RDWR);
ioctl(fd, RPMSG_CREATE_EPT_IOCTL, &ept_info);

int ept_fd = open("/dev/rpmsg0", O_RDWR);
imu_sample_t buf;
while (read(ept_fd, &buf, sizeof(buf)) > 0) {
    push_to_database(&buf);
}
```

## 자동차 — Hypervisor와 AMP의 결합

자동차 ECU는 *기능 안전 등급이 다른 작업*을 한 칩에 통합할 때 AMP를 적극 활용합니다. Cortex-R52 lock-step 코어가 AUTOSAR ECU로 ASIL-D 작업을 맡고, Cortex-A78 cluster는 hypervisor 위에 여러 VM(Android 인포테인먼트, Linux V2X, PREEMPT_RT ADAS)을 돌립니다.

```text
SoC 예시 — Renesas R-Car S4

Cortex-A55 × 8 (cluster)
  EL2 Hypervisor (Xen, COQOS, PikeOS)
    ├ VM 1 : Android 인포테인먼트
    ├ VM 2 : Linux V2X
    └ VM 3 : PREEMPT_RT Linux for ADAS

Cortex-R52 × 2 (lock-step)
  AUTOSAR Classic — brake / steer / airbag (ASIL-D)

Cortex-M으로 power management

상호 통신 : virtio-rpmsg over IPC
```

각 도메인 사이는 *물리적 격리*가 우선이고, 데이터 교환만 RPMsg로 합니다. ASIL-D 작업이 인포테인먼트 fault로 영향을 받지 않도록 hardware partitioning이 보장됩니다.

## RP2350 — Hybrid Heterogeneous

Raspberry Pi의 RP2350은 *같은 칩에 Cortex-M33 두 코어와 Hazard3 RISC-V 두 코어*가 들어 있고, boot 시 OTP fuse로 *둘 중 한쪽 ISA*를 선택합니다. 같은 binary가 ARM에서도 RISC-V에서도 돌지는 않지만, *같은 hardware 위에서 두 ISA가 선택 가능*하다는 점이 독특합니다.

```c
#include "pico/multicore.h"

void core1_entry(void) {
    while (1) {
        uint32_t cmd = multicore_fifo_pop_blocking();
        process(cmd);
    }
}

int main(void) {
    multicore_launch_core1(core1_entry);

    while (1) {
        uint32_t v = read_sensor();
        multicore_fifo_push_blocking(v);
    }
}
```

dual M0+ 시절의 RP2040은 *hardware coherency가 없는* 전형이라 SIO FIFO와 hardware spinlock에 의존했고, RP2350의 dual M33도 같은 통신 모델을 그대로 잇습니다. 작은 메시지는 SIO FIFO로, 큰 데이터는 SRAM + spinlock으로 옮기는 형태입니다.

## Inter-Core Message Latency 측정

```text
i.MX 8M Plus, A53 ↔ M7, OpenAMP over MU + reserved DDR (non-cacheable):
  단방향 minimum payload (4 B)  : 8 ~ 12 µs
  64 B payload                   : 9 ~ 14 µs
  1 KB payload                   : 18 ~ 30 µs
  RTT (echo)                     : 18 ~ 28 µs

STM32MP1, A7 ↔ M4, IPCC + SRAM:
  단방향 4 B                     : 4 ~ 6 µs
  RTT                            : 9 ~ 14 µs

RP2040, M0+ ↔ M0+, SIO FIFO:
  단방향 4 B                     : ~50 ns (≈10 cycle)
  RTT                            : ~120 ns
```

대형 SoC의 OpenAMP는 *마이크로초 단위*, 같은 칩 안의 작은 SIO FIFO는 *나노초 단위*입니다. 두 자릿수 차이의 원인은 *mailbox IRQ 진입/탈출 비용*과 *cache maintenance*입니다.

## 자주 보는 함정과 안티패턴

> 경고 — Shared memory를 cacheable로 두기

```c
/* Cortex-M MPU에 vring 영역 mapping 안 함 → 기본 cacheable */
shared_buf[0] = 0x42;
/* Cortex-A가 read → 옛 데이터 (cache stale) */
```

vring과 buffer pool 영역은 *device memory 또는 non-cacheable normal memory*로 설정합니다. 그렇지 못한 SoC라면 매 송수신마다 `SCB_CleanDCache_by_Addr` / `SCB_InvalidateDCache_by_Addr`를 호출합니다.

> 경고 — reserved-memory 누락

```dts
reserved-memory {
    rpmsg_dma_reserved: rpmsg@bff00000 {
        reg = <0 0xbff00000 0 0x100000>;
        no-map;
    };
};
```

이 노드가 device tree에 없으면 Linux가 *해당 영역도 일반 메모리로 사용*해 vring을 덮어씁니다. 결과는 *조용한 데이터 corruption*입니다.

> 경고 — M-core firmware load 후 start 안 함

```bash
echo m4_fw.elf > /sys/class/remoteproc/remoteproc0/firmware
# echo start 빠뜨림
```

ELF가 placement만 되고 reset이 release되지 않으면 *M-core는 그대로 halt*입니다. 자동화 스크립트 또는 boot service에서 *load + start*를 묶어 둡니다.

> 경고 — 양쪽 endianness 차이 무시

대부분의 ARM/RISC-V Linux와 RTOS는 little-endian이지만, *legacy DSP*나 *PowerPC 보조 코어*가 들어가는 SoC도 존재합니다. 같은 구조체를 그대로 보내면 필드 해석이 어긋납니다. 멀티 ISA를 섞을 때는 *명시적 byte-order 변환*을 사용합니다.

> 경고 — buffer 크기 작게 잡고 자주 보내기

```c
for (int i = 0; i < 1000; i++)
    rpmsg_send(ep, &b, 4);          /* 1000번의 mailbox IRQ */
```

각 송신마다 mailbox IRQ가 한 번씩 들어가므로 *작은 메시지를 폭주*시키면 처리 비용이 폭발합니다. 가능하면 *batch*로 묶어 보내거나 streaming endpoint를 따로 둡니다.

## 정리

- AMP는 *한 SoC 안의 서로 다른 코어가 서로 다른 OS*를 돌리는 모델이며, 코어 사이 통신은 명시적 IPC로만 일어납니다.
- OpenAMP framework는 *libmetal(HAL), open-amp(RPMsg/remoteproc/virtio), application*의 3 layer로 구성됩니다.
- RPMsg는 *channel + endpoint* 추상화로 메시지를 전달하고, 내부는 virtio-vring을 통한 shared memory와 mailbox IRQ로 구현됩니다.
- Linux 측 remoteproc driver가 *Cortex-M firmware의 load와 start/stop*을 통제하므로 OTA로 M-core firmware만 교체할 수 있습니다.
- vring 영역은 *non-cacheable*이거나 *명시적 cache maintenance*가 필요하며, device tree의 `reserved-memory`로 Linux 사용을 차단합니다.
- 자동차 도메인은 *Cortex-A hypervisor + Cortex-R lock-step + Cortex-M PMIC*를 AMP로 묶고 ASIL-D 격리를 hardware로 보장합니다.
- 대형 SoC의 OpenAMP는 마이크로초 단위, 작은 dual-M SoC의 SIO FIFO는 나노초 단위로 *두 자릿수 차이*가 납니다.

다음 편은 [4-13 C++ in RTOS](/blog/embedded/rtos/practical-internals/part4-13-cpp-in-rtos)에서 RTOS C API를 C++ 객체로 감싸는 패턴을 다룹니다.

## 관련 항목

- [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [4-11: TrustZone과 TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
- [5-04: Porting](/blog/embedded/rtos/practical-internals/part5-04-porting)
