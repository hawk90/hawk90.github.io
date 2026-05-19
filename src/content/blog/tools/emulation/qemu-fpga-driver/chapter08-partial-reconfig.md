---
title: "Ch 8: Partial Reconfiguration"
date: 2026-05-17T08:00:00
description: "Runtime sub-region 교체 — driver 측 워크플로."
tags: [QEMU, partial-reconfig, fpga-region, dfx]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 8
draft: true
---

FPGA 전체 재프로그래밍은 *수십 초*가 걸립니다. 일부 영역만 *초 단위*로 교체하는 게 **Partial Reconfiguration**(PR). ML model swap·HFT strategy 전환·NPU operator 교체에 필수입니다. Linux는 `fpga_region` subsystem으로 이 메커니즘을 추상화하고, driver는 region 정의 + reconfig 흐름만 구현하면 됩니다.

## 무엇을 푸는가

다음 시나리오를 떠올려 봅시다.

- *ML 추론 서버*가 다양한 모델(ResNet, BERT, GPT)을 번갈아 가며 처리해야 합니다.
- *HFT 시스템*이 시장 상황에 따라 다른 alpha strategy를 켜야 합니다.
- *NPU 컴파일러*가 operator(conv, attention, layernorm)별 다른 회로를 dispatch합니다.

Full reconfig은 30~60초 — production에 부적합. **PR은 0.5~5초**입니다. 그만큼 빈번한 swap이 가능해집니다.

## Static vs Dynamic 영역

| 영역 | 변경 | 내용 |
|------|------|------|
| **Static region** | 안 됨 | shell, PCIe endpoint, DMA controller, 메모리 controller |
| **Dynamic Function eXchange (DFX) region** | 됨 | user logic slot — 여러 개 있을 수 있음 |

bitstream을 합성할 때 *어떤 영역이 DFX인지* 미리 정해 둡니다. vendor tool — Xilinx Vivado의 *DFX flow*, Intel Quartus의 *Partial Reconfig flow*가 이 분할을 지원합니다.

## fpga_region subsystem

`drivers/fpga/fpga-region.c`. 핵심 구성.

| 컴포넌트 | 역할 |
|----------|------|
| `fpga_region` | DFX region을 추상 객체로 |
| `fpga_manager` | bitstream 실제 push (Ch 7) |
| `fpga_bridge` | region을 main bus와 분리/연결 |
| `program_fpga` op | quiesce → isolate → program → resume 워크플로 |

## Region 정의 방식

| 방식 | 시나리오 |
|------|----------|
| **Device Tree overlay** | runtime add/remove, embedded SoC에 적합 |
| **configfs** | `/sys/kernel/config/device-tree/overlays/` |
| **PCIe DFL** | bitstream 자체에 region 정보 (Ch 12) |

## Reconfig 4단계

```text
1. Quiesce
   - region 안 user logic 정지
   - in-flight DMA descriptor 모두 완료까지 대기
   - IRQ source 비활성
        │
        ▼
2. Isolate
   - bridge OFF
   - region이 main bus와 격리되어 *어떤 신호도* 영향 못 줌
        │
        ▼
3. Program
   - partial bitstream을 fpga_mgr로 load
   - vendor HW가 *지정된 영역만* reprogram
        │
        ▼
4. Resume
   - bridge ON
   - driver가 새 user logic re-init
   - IRQ 재활성
```

각 단계는 *원자적*이어야 하며, 실패 시 *이전 상태로 rollback*해야 합니다.

## QEMU 측 — region state machine

```c
typedef enum {
    REGION_UNLOADED,
    REGION_LOADING,
    REGION_READY,
    REGION_RECONFIGURING,
} RegionState;

typedef struct FpgaRegion {
    char name[32];
    RegionState state;
    MemoryRegion user_logic;   /* 이 region 만의 BAR slice */
    uint32_t bitstream_id;
} FpgaRegion;

static void region_reconfig(FakeFPGA *s, int idx, const char *bs) {
    FpgaRegion *r = &s->regions[idx];

    /* 1. quiesce — in-flight DMA 검사 */
    if (channels_busy_in_region(s, idx)) {
        r->state = REGION_RECONFIGURING;
        /* 실제로는 BH로 wait, 여기서는 단순화 */
    }

    /* 2. isolate — bridge off */
    s->bridge_enable[idx] = false;

    /* 3. program */
    r->state = REGION_LOADING;
    load_bitstream(bs, &r->user_logic);
    r->state = REGION_READY;

    /* 4. resume */
    s->bridge_enable[idx] = true;
    msix_notify(&s->parent, RECONFIG_DONE_VEC);
}
```

## Driver — fpga_region program

```c
static int my_fpga_region_program(struct fpga_region *region,
                                   struct fpga_image_info *info) {
    struct my_fpga *f = region->priv;
    int region_idx = region->info->region_id;
    int ret;

    /* 1. quiesce — 이 region의 channel drain */
    ret = quiesce_region_channels(f, region_idx);
    if (ret) return ret;

    /* 2. isolate — bridge off */
    writel(0, f->shell_mmio + BRIDGE_CTRL(region_idx));

    /* 3. program — fpga_mgr 위임 (Ch 7) */
    ret = fpga_mgr_load(region->mgr, info);
    if (ret) goto resume_anyway;

    /* 4. resume — bridge on */
resume_anyway:
    writel(1, f->shell_mmio + BRIDGE_CTRL(region_idx));
    return ret;
}

static int my_fpga_setup_region(struct my_fpga *f, int idx) {
    struct fpga_region_info info = {
        .mgr        = f->mgr,
        .compat_id  = &my_compat_id,
        .program_fpga = my_fpga_region_program,
        .priv       = f,
        .region_id  = idx,
    };
    f->region[idx] = devm_fpga_region_register_full(&f->pdev->dev, &info);
    return PTR_ERR_OR_ZERO(f->region[idx]);
}
```

## Userspace — DT overlay로 swap

embedded SoC에서는 device tree overlay가 표준.

```bash
# 새 partial bitstream을 firmware 디렉터리에 둠
sudo cp new_model.dtbo /lib/firmware/

# overlay 등록 → fpga-region driver가 program_fpga 호출
mkdir /sys/kernel/config/device-tree/overlays/swap1
echo new_model.dtbo > /sys/kernel/config/device-tree/overlays/swap1/path

# 결과 확인
cat /sys/class/fpga_region/region0/programmed
# 1
```

PCIe FPGA에서는 vendor-specific ioctl(OPAE의 `fpgaConf`, Xilinx의 `xclbin load`)이 같은 역할.

## In-flight DMA 처리

reconfig 중 *진행 중인* DMA가 있으면 위험합니다. *재시작*해야 하는데, region이 사라지면 transaction 자체가 *static region* 영역으로 *돌아오지 않을* 수 있죠.

```c
static int quiesce_region_channels(struct my_fpga *f, int region_idx) {
    /* 1. submit 막기 */
    set_bit(REGION_QUIESCING, &f->region_state[region_idx]);

    /* 2. 이 region을 쓰는 모든 in-flight descriptor 완료 대기 */
    int timeout = msecs_to_jiffies(1000);
    while (in_flight_in_region(f, region_idx)) {
        if (!--timeout) return -ETIMEDOUT;
        msleep(1);
    }

    /* 3. IRQ 비활성 */
    writel(0, f->shell_mmio + IRQ_ENABLE_REGION(region_idx));
    return 0;
}
```

## Use case 정리

| 도메인 | swap 패턴 |
|--------|-----------|
| AI 추론 | model별 user logic (ResNet → BERT → GPT) |
| HFT | strategy별 alpha (morning → midday → close) |
| NPU compiler | operator별 회로 (conv → attention → layernorm) |
| Cloud FPGA | tenant 전환 시 |
| 시뮬레이션 | 검증 phase별 회로 |

cloud FPGA의 *멀티 테넌트* 시나리오에서는 PR이 *분리 보장*의 핵심입니다. 한 tenant의 region을 다른 tenant로 swap할 때 *완전 격리*가 필요해서.

## Region 간 보안

multi-tenant 환경에서 region끼리의 *side channel*도 우려됩니다. 대응:

- 각 region에 *전용 BAR slice*
- AES key 분리 (region별 다른 key)
- 클럭·power 분리(가능한 한)
- DMA address space 분리(IOMMU group으로)

이런 보안 격리는 OpenTitan(Ch 6) 같은 RoT chip이 *root of trust*로 동작하는 시스템에서 더 강력해집니다.

## 정리

- **Partial Reconfiguration**(PR/DFX)으로 user logic 영역만 *runtime 교체*. full reconfig 30s → PR 1s.
- **Static**(shell) vs **DFX**(user) 영역 분할. vendor tool(Vivado DFX, Quartus PR flow)에서 합성.
- Linux **fpga_region** subsystem이 driver 차이를 추상화. `program_fpga` callback.
- 4단계: **Quiesce → Isolate → Program → Resume**. 각 단계가 atomic, 실패 시 rollback.
- In-flight DMA 처리가 핵심 — submit 차단 + drain timeout + IRQ disable.
- Userspace는 DT overlay(embedded) 또는 vendor ioctl(PCIe).
- ML model swap·HFT strategy·NPU operator·cloud tenant 전환의 표준 메커니즘.

## 다음 장 예고

다음 장부터 워크플로의 *Step 2* — VFIO입니다. **VFIO 기초** — userspace driver framework, IOMMU group, container/group/device 3-tier, 첫 ioctl 호출까지.

## 관련 항목

- [Ch 7: 비트스트림 로딩](/blog/tools/emulation/qemu-fpga-driver/chapter07-bitstream-loading)
- [Ch 9: VFIO 기초](/blog/tools/emulation/qemu-fpga-driver/chapter09-vfio-basics)
- [Ch 11: SR-IOV·mdev](/blog/tools/emulation/qemu-fpga-driver/chapter11-sriov-mdev)
- [QEMU Internals — VFIO](/blog/tools/emulation/qemu-internals/chapter19-vhost)
