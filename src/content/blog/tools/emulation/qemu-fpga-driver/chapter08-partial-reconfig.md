---
title: "Ch 8: Partial Reconfiguration"
date: 2025-09-04T08:00:00
description: "Runtime sub-region 교체 — driver 측 워크플로."
tags: [QEMU, partial-reconfig, fpga-region, dfx]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 8
draft: true
---

## 이 챕터의 의도

FPGA 전체 재프로그래밍은 수십 초가 걸린다. Partial Reconfiguration(PR)은 일부 영역만 초 단위로 교체할 수 있어 ML model swap, HFT strategy 전환, NPU kernel 교체에 필수다. Linux는 `fpga_region` subsystem으로 이를 추상화하고, driver는 region 정의와 reconfig 흐름만 구현하면 된다.

## 핵심 항목

- ✦ **Partial Reconfiguration (PR / DFX)** 의미 — FPGA fabric의 *지정된 sub-region*만 새 bitstream으로 교체
- ✦ **Static region** — bitstream 변경 안 됨 (shell, PCIe endpoint, DMA controller)
- ✦ **Dynamic Function eXchange (DFX) region** — 교체 가능 영역 (user logic slot)
- ✦ Vendor tools — Xilinx Vivado *DFX flow*, Intel Quartus *Partial Reconfig flow*
- ✦ Linux **fpga_region** subsystem — `drivers/fpga/fpga-region.c`
- ✦ Region 정의 방식
  - **Device Tree overlay** — runtime add/remove
  - **configfs** — `/sys/kernel/config/device-tree/overlays/`
  - **bridge** — region과 main bus 사이 격리
- ✦ Reconfig 워크플로
  1. **Quiesce** — region 안 user logic 정지, in-flight DMA cancel
  2. **Isolate** — bridge OFF, region이 main bus와 격리
  3. **Program** — partial bitstream load
  4. **Resume** — bridge ON, driver re-init region
- ✦ Driver 측 — `fpga_region_register` + ops, region 단위로 bind/unbind
- ✦ In-flight DMA 처리 — region 변경 전 *모든* descriptor 완료, IRQ off
- ✦ QEMU emulation — region state machine (UNLOADED → LOADING → READY → RECONFIGURING)
- ✦ Use case
  - **ML model swap** — 다른 NN 모델로 user logic 교체
  - **HFT strategy swap** — 시장 상황별 다른 alpha
  - **NPU kernel** — operator별 다른 회로
  - **Cloud FPGA** — tenant 전환 시
- ◦ Region 간 보안 — region끼리 격리, AES key isolation

## 다이어그램 (4)

1. FPGA fabric — static + DFX regions 배치도
2. Reconfig 4단계 (quiesce → isolate → program → resume)
3. Linux fpga_region + bridge + manager 관계
4. Region state machine

## 코드 sketch

```c
/* QEMU 측 — region 추가 + state */
typedef enum { REGION_UNLOADED, REGION_LOADING, REGION_READY, REGION_RECONFIG } RegionState;

typedef struct FpgaRegion {
    char name[32];
    RegionState state;
    MemoryRegion user_logic;   /* 이 region 만의 BAR slice */
    uint32_t bitstream_id;
} FpgaRegion;

static void region_reconfig(FakeFPGA *s, int idx, const char *bs) {
    FpgaRegion *r = &s->regions[idx];

    /* quiesce — DMA in-flight 검사 */
    if (s->channels_busy_in_region(idx)) {
        r->state = REGION_RECONFIG;
        /* wait */
    }

    /* isolate — bridge off (simulate) */
    s->bridge_enable[idx] = false;

    /* program */
    r->state = REGION_LOADING;
    load_bitstream(bs, &r->user_logic);
    r->state = REGION_READY;

    /* resume */
    s->bridge_enable[idx] = true;
    msix_notify(&s->parent, RECONFIG_DONE_VEC);
}
```

```c
/* Driver — fpga_region 등록 */
static int my_fpga_region_program(struct fpga_region *region,
                                   struct fpga_image_info *info) {
    struct my_fpga *f = region->priv;
    int region_idx = region->info->region_id;

    /* 1. quiesce — 이 region의 channel drain */
    quiesce_region_channels(f, region_idx);

    /* 2. isolate — bridge off */
    writel(0, f->shell_mmio + BRIDGE_CTRL(region_idx));

    /* 3. program — fpga_mgr 위임 (Ch 7) */
    int ret = fpga_mgr_load(region->mgr, info);
    if (ret) return ret;

    /* 4. resume — bridge on */
    writel(1, f->shell_mmio + BRIDGE_CTRL(region_idx));
    return 0;
}

static const struct fpga_region_info my_region_info = {
    .mgr        = f->mgr,
    .compat_id  = &my_compat_id,
    .program_fpga = my_fpga_region_program,
    .priv       = f,
};
```

```bash
# Userspace로 DT overlay
mkdir /sys/kernel/config/device-tree/overlays/swap1
cat new-logic.dtbo > /sys/kernel/config/device-tree/overlays/swap1/dtbo
# fpga-region driver가 region program 호출 → partial bitstream load
```

## 레퍼런스

- Linux `Documentation/driver-api/fpga/fpga-region.rst`
- Xilinx UG909 — Vivado Design Suite DFX
- Intel Quartus Partial Reconfiguration User Guide
- "Cloud-FPGA: dynamic FPGA on-demand" 논문

## 관련 항목

- [Ch 7: 비트스트림 로딩](/blog/tools/emulation/qemu-fpga-driver/chapter07-bitstream-loading)
- [Ch 11: SR-IOV/mdev](/blog/tools/emulation/qemu-fpga-driver/chapter11-sriov-mdev)
- [Ch 12: OPAE/DFL](/blog/tools/emulation/qemu-fpga-driver/chapter12-opae-dfl)
