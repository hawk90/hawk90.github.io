---
title: "Ch 15: OpenAMP·RPMsg on QEMU"
date: 2025-09-02T15:00:00
description: "AMP — Cortex-A + Cortex-M 동시 실행 시뮬레이션."
tags: [QEMU, openamp, rpmsg, amp]
series: "QEMU Embedded Emulation"
seriesOrder: 15
draft: true
---

## 이 챕터의 의도

현대 임베디드 SoC는 *heterogeneous*다 — Zynq UltraScale+(APU Cortex-A53 + RPU Cortex-R5), i.MX8 (A72 + M4), STM32MP (A7 + M4). 두 클래스 코어가 동시에 다른 OS를 돌리고 *shared memory + mailbox*로 통신한다. **OpenAMP** + **RPMsg**가 표준 framework. 본 챕터는 QEMU로 AMP 환경을 만들고 *Linux ↔ FreeRTOS* 통신을 시뮬레이션.

## 핵심 항목

- ✦ **AMP (Asymmetric Multi-Processing)** — heterogeneous core, *서로 다른 OS·메모리 영역*
- ✦ SMP vs AMP — SMP는 같은 OS가 모든 core 관리, AMP는 core별 독립 OS
- ✦ **OpenAMP framework** — Linaro/Xilinx 공동, *remoteproc + RPMsg + VirtIO* 3 layer
  - **remoteproc** — life-cycle 관리 (load firmware, start/stop remote core)
  - **RPMsg** — 메시지 passing 추상화 (virtio-based)
  - **VirtIO** — 공유 메모리 + ring 구조
- ✦ Shared memory region 설정 — DT `reserved-memory` 노드, both side 동일 주소 매핑
- ✦ **Mailbox/IPI emulation** — QEMU custom device 또는 ARM SCMI mailbox
- ✦ QEMU AMP 구성 — `-smp` + per-cpu `-cpu`, 또는 두 QEMU instance + shared mem
- ✦ Zynq-style — `xlnx-zcu102` machine은 APU + RPU lockstep 지원 (실험적)
- ✦ Linux on APU + FreeRTOS on RPU — APU가 RPU firmware를 remoteproc으로 load
- ✦ Communication channel — endpoint name service, channel 생성·삭제
- ✦ Service registration — RPMsg name service (`/dev/rpmsg_ctrl0`)
- ✦ Use case — NPU offload, sensor data가 RPU에서 전처리 후 APU로, real-time control loop
- ◦ TrustZone secure world + AMP (Ch 16) 조합

## 다이어그램 (4)

1. AMP 구조 — APU(Linux) + RPU(FreeRTOS) + 공유 메모리 + mailbox
2. OpenAMP 3-layer stack — remoteproc / RPMsg / VirtIO
3. Linux↔FreeRTOS 통신 흐름 — endpoint 생성 → send → IPI → receive
4. QEMU AMP 구성 — single instance multi-cpu vs dual instance shared mem

## 코드 sketch

```bash
# Zynq UltraScale+ AMP — QEMU
qemu-system-aarch64 -M xlnx-zcu102 -smp 4 -m 2G \
    -kernel apu/Image -dtb apu/zynqmp-zcu102.dtb \
    -initrd apu/rootfs.cpio.gz \
    -device loader,file=rpu/firmware.elf,cpu-num=4 \
    -nographic
```

```c
/* Linux APU side — RPMsg client */
#include <linux/rpmsg.h>

static int rpmsg_sample_cb(struct rpmsg_device *rpdev, void *data, int len, void *priv, u32 src) {
    pr_info("from RPU [%d]: %s\n", src, (char *)data);
    return 0;
}

static int rpmsg_sample_probe(struct rpmsg_device *rpdev) {
    rpmsg_send(rpdev->ept, "hello from APU", 14);
    return 0;
}

static struct rpmsg_device_id rpmsg_driver_id[] = { { .name = "rpmsg-sample" } };
static struct rpmsg_driver rpmsg_sample_drv = {
    .drv.name   = "rpmsg-sample",
    .id_table   = rpmsg_driver_id,
    .probe      = rpmsg_sample_probe,
    .callback   = rpmsg_sample_cb,
};
module_rpmsg_driver(rpmsg_sample_drv);
```

```c
/* FreeRTOS RPU side — OpenAMP */
#include "openamp/open_amp.h"

static int ept_callback(struct rpmsg_endpoint *ept, void *data, size_t len,
                        uint32_t src, void *priv) {
    /* APU에서 받은 데이터 처리 */
    rpmsg_send(ept, "hello from RPU", 14);
    return RPMSG_SUCCESS;
}

void rpu_task(void *arg) {
    struct rpmsg_device *rdev = platform_create_rpmsg_vdev(0, VIRTIO_DEV_DEVICE, ...);
    struct rpmsg_endpoint ept;
    rpmsg_create_ept(&ept, rdev, "rpmsg-sample", RPMSG_ADDR_ANY, RPMSG_ADDR_ANY,
                     ept_callback, NULL);
    while (1) {
        platform_poll(rdev);
    }
}
```

## 레퍼런스

- OpenAMP project — github.com/OpenAMP/open-amp
- libmetal — github.com/OpenAMP/libmetal (HAL 추상)
- Linux `Documentation/staging/rpmsg.rst`
- Linux `drivers/remoteproc/`, `drivers/rpmsg/`
- Xilinx OpenAMP 문서 (Zynq UltraScale+ MPSoC OpenAMP Framework)
- "Asymmetric Multi-Processing with OpenAMP" — Embedded World

## 관련 항목

- [Ch 11: Bare-metal](/blog/tools/emulation/qemu-embedded/chapter11-baremetal) (기존)
- [Ch 12: RTOS](/blog/tools/emulation/qemu-embedded/chapter12-rtos) (기존)
- [Ch 16: TrustZone](/blog/tools/emulation/qemu-embedded/chapter16-trustzone)
- [Ch 17: ARM Hypervisor](/blog/tools/emulation/qemu-embedded/chapter17-hypervisor)
