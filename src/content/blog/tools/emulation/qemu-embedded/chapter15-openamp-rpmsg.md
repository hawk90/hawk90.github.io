---
title: "Ch 15: OpenAMP·RPMsg on QEMU"
date: 2026-05-17T15:00:00
description: "AMP — Cortex-A + Cortex-M 동시 실행 시뮬레이션."
tags: [QEMU, openamp, rpmsg, amp, remoteproc, zynq]
series: "QEMU Embedded Emulation"
seriesOrder: 15
draft: true
---

현대 임베디드 SoC는 *heterogeneous*입니다. Zynq UltraScale+(APU Cortex-A53 + RPU Cortex-R5), i.MX8(A72 + M4), STM32MP1(A7 + M4) 같은 시스템에서 *두 종류의 코어*가 *서로 다른 OS*를 동시에 돌리고, *shared memory + mailbox*로 통신합니다. **OpenAMP + RPMsg**가 그 표준 framework이고, QEMU에서 시뮬레이션할 수 있습니다.

## AMP vs SMP

| 모델 | 의미 | 예 |
|------|------|----|
| **SMP** (Symmetric MP) | 같은 OS가 모든 코어 관리 | Linux SMP on Cortex-A 4-core |
| **AMP** (Asymmetric MP) | 코어별 *독립 OS*·메모리 영역 | Linux on APU + FreeRTOS on RPU |

AMP는 *real-time 보장*이 필요한 영역(motor control·sensor fusion)을 RPU에 두고, *user app·Linux stack*은 APU에 두는 분리 구조입니다.

## OpenAMP 3-layer 스택

Linaro/Xilinx 공동 프레임워크.

```text
┌────────────────────────────────────────┐
│   Application                          │
├────────────────────────────────────────┤
│   RPMsg — message passing (virtio 위) │
├────────────────────────────────────────┤
│   VirtIO — shared memory + ring        │
├────────────────────────────────────────┤
│   remoteproc — life-cycle (load·start) │
└────────────────────────────────────────┘
```

| Layer | 역할 |
|-------|------|
| **remoteproc** | RPU firmware load·start/stop |
| **RPMsg** | endpoint·channel·message |
| **VirtIO** | 두 코어가 공유하는 ring buffer |

## Shared memory + Mailbox

두 코어가 *통신*하려면 *공유 메모리 영역*과 *trigger 메커니즘*이 필요합니다.

- **Shared memory** — 양쪽이 같은 주소로 매핑. DT의 `reserved-memory` 노드.
- **Mailbox/IPI** — APU가 RPU에 *"메시지가 있다"*는 신호. ARM SCMI mailbox 또는 vendor IPI.

```dts
reserved-memory {
    rpu_ddr: shared@70000000 {
        compatible = "shared-dma-pool";
        reg = <0x0 0x70000000 0x0 0x800000>;   /* 8MB */
        no-map;
    };
};

amba {
    ipi: mailbox@ff340000 {
        compatible = "xlnx,zynqmp-ipi-mailbox";
        reg = <0x0 0xff340000 0x0 0x1000>;
        interrupts = <0 35 4>;
    };
};
```

## QEMU AMP 구성

ZynqMP가 가장 표준적인 AMP 머신.

```bash
qemu-system-aarch64 -M xlnx-zcu102 -smp 4 -m 2G \
    -kernel apu/Image \
    -dtb apu/zynqmp-zcu102.dtb \
    -initrd apu/rootfs.cpio.gz \
    -device loader,file=rpu/firmware.elf,cpu-num=4 \
    -nographic
```

| 옵션 | 역할 |
|------|------|
| `-smp 4` | APU 4 core(Cortex-A53) |
| `-kernel apu/Image` | APU의 Linux |
| `-device loader,file=...,cpu-num=4` | RPU(cpu 4)에 firmware load |

QEMU의 `xlnx-zcu102` machine은 *APU + RPU lockstep*을 부분적으로 지원합니다.

## Linux APU side — RPMsg client

Linux 안에서 RPMsg를 *kernel driver*로.

```c
#include <linux/rpmsg.h>

static int rpmsg_sample_cb(struct rpmsg_device *rpdev,
                            void *data, int len,
                            void *priv, u32 src) {
    pr_info("from RPU [%d]: %s\n", src, (char *)data);
    return 0;
}

static int rpmsg_sample_probe(struct rpmsg_device *rpdev) {
    rpmsg_send(rpdev->ept, "hello from APU", 14);
    return 0;
}

static struct rpmsg_device_id rpmsg_ids[] = {
    { .name = "rpmsg-sample" },
};

static struct rpmsg_driver rpmsg_sample_drv = {
    .drv.name = "rpmsg-sample",
    .id_table = rpmsg_ids,
    .probe    = rpmsg_sample_probe,
    .callback = rpmsg_sample_cb,
};
module_rpmsg_driver(rpmsg_sample_drv);
```

## FreeRTOS RPU side — OpenAMP

RPU가 FreeRTOS 위에서 OpenAMP를 호출.

```c
#include "openamp/open_amp.h"

static int ept_callback(struct rpmsg_endpoint *ept,
                        void *data, size_t len,
                        uint32_t src, void *priv) {
    /* APU에서 받은 데이터 처리 */
    rpmsg_send(ept, "hello from RPU", 14);
    return RPMSG_SUCCESS;
}

void rpu_task(void *arg) {
    struct rpmsg_device *rdev =
        platform_create_rpmsg_vdev(0, VIRTIO_DEV_DEVICE, 0, 0, NULL);

    struct rpmsg_endpoint ept;
    rpmsg_create_ept(&ept, rdev, "rpmsg-sample",
                     RPMSG_ADDR_ANY, RPMSG_ADDR_ANY,
                     ept_callback, NULL);

    while (1) {
        platform_poll(rdev);
    }
}
```

## remoteproc — RPU 부팅

Linux의 remoteproc framework이 RPU firmware의 *life-cycle*을 관리.

```bash
# RPU 0 firmware 로드
guest$ echo my_firmware.elf > /sys/class/remoteproc/remoteproc0/firmware

# Start
guest$ echo start > /sys/class/remoteproc/remoteproc0/state

# 확인
guest$ cat /sys/class/remoteproc/remoteproc0/state
running

# Stop
guest$ echo stop > /sys/class/remoteproc/remoteproc0/state
```

이 한 시퀀스가 *AMP system의 booting + runtime control*.

## 통신 흐름

1. APU의 *RPMsg endpoint 생성* (name = "rpmsg-sample")
2. RPU도 같은 name으로 endpoint 생성
3. *Name service* 통해 두 endpoint match
4. APU `rpmsg_send` → VirtIO ring write → mailbox IRQ → RPU
5. RPU callback 호출 → 처리 → `rpmsg_send` 응답
6. mailbox IRQ → APU callback

shared memory(VirtIO ring) + mailbox(IRQ)가 핵심.

## Use case

| 도메인 | RPU 역할 | APU 역할 |
|--------|----------|----------|
| NPU offload | 가속기 driver | model serving |
| Sensor fusion | RT sensor preprocess | analytics |
| Motor control | RT control loop | UI·logging |
| Industrial PLC | RT ladder logic | OPC-UA server |
| Robotics | RT actuator | ROS2 stack |

*RT 보장*과 *rich SW stack*의 분리가 AMP의 본질.

## QEMU의 한도

- QEMU의 ZynqMP AMP 시뮬레이션은 *부분적*. mailbox·shared memory는 동작하지만 *정확한 RT 보장*은 없음.
- 두 코어가 *진짜 병렬*인지는 QEMU implementation에 따라 차이. 보통 *scheduling*은 host가 결정.
- 학습·기능 검증에는 충분, *RT 성능 검증*은 실 보드.

## 두 QEMU instance 패턴

같은 머신 안에서 AMP가 어려우면 *두 QEMU 인스턴스*를 띄우고 *shared memory file*로 연결.

```bash
# host
truncate -s 8M /tmp/amp_shmem

# APU instance
qemu-system-aarch64 -M virt -smp 4 -m 2G \
    -object memory-backend-file,id=mem,size=8M,share=on,mem-path=/tmp/amp_shmem \
    -kernel apu/Image -nographic &

# RPU instance
qemu-system-arm -M mps2-an521 -cpu cortex-m33 \
    -object memory-backend-file,id=mem,size=8M,share=on,mem-path=/tmp/amp_shmem \
    -kernel rpu/firmware.elf -nographic &
```

mailbox는 *socket*으로 simulate. 약간의 추가 작업이 필요하지만 *유연*.

## 흔한 함정

- **`reserved-memory` 누락** — Linux가 RPU 메모리를 *동시 사용*해 충돌.
- **endian mismatch** — APU와 RPU가 서로 다른 endian이면 byte swap 필요.
- **cache coherency** — shared memory는 *non-cacheable* 또는 *명시적 flush* 필요.
- **firmware ELF format** — RPU의 ELF가 *올바른 entry point*와 *PT_LOAD section* 가져야.

## 정리

- **AMP**(Asymmetric MP)는 heterogeneous core가 *서로 다른 OS*를 돌리는 모델. ZynqMP·i.MX8·STM32MP1.
- **OpenAMP** 3-layer: remoteproc(life-cycle)·RPMsg(message)·VirtIO(ring).
- 통신: shared memory + mailbox/IPI. 양쪽이 같은 주소로 매핑.
- Linux APU는 RPMsg kernel driver, RPU(FreeRTOS)는 OpenAMP libopenamp.
- remoteproc로 RPU firmware load/start/stop을 sysfs로 제어.
- Use case: NPU offload·sensor fusion·motor control·robotics — RT와 rich stack 분리.
- QEMU 시뮬레이션은 기능 검증에 충분, RT 성능은 실 보드.
- 두 QEMU 인스턴스로 shared memory file 통해 connect 가능.

## 다음 장 예고

다음 장은 *security* — **TrustZone**. ARM의 secure/non-secure world 분리와 OP-TEE 부팅.

## 관련 항목

- [Ch 14: Semihosting](/blog/tools/emulation/qemu-embedded/chapter14-semihosting)
- [Ch 16: TrustZone](/blog/tools/emulation/qemu-embedded/chapter16-trustzone)
- [Ch 17: ARM Hypervisor](/blog/tools/emulation/qemu-embedded/chapter17-hypervisor)
- [Practical RTOS Internals — AMP·OpenAMP](/blog/embedded/rtos/practical-internals/part4-12-amp-openamp)
