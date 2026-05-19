---
title: "Ch 13: 레지스터 뱅크 패턴 — Multi-Region 디바이스"
date: 2026-05-17T13:00:00
description: "Doorbell·CSR·queue 영역 분리 — 현실 가속기의 BAR 레이아웃."
tags: [QEMU, register-bank, bar, mmio, indirect]
series: "QEMU Fake Device Driver"
seriesOrder: 13
draft: true
---

production device는 *수십~수백 개의 register*. 한 BAR에 *모두 평면*으로 두면 *읽기·관리·디버깅* 모두 어렵습니다. 현실 가속기(NPU·NIC·NVMe)는 *register bank* 패턴으로 *영역별 분리*. 이 장은 그 패턴을 정리합니다.

## Register bank의 개념

```text
BAR0 (4KB)
├── 0x000~0x0FF  CSR (Control/Status)
├── 0x100~0x3FF  Queue doorbells
└── 0x400~0xFFF  Device-specific

BAR1 (16KB)
├── 0x0000~0x0FFF  Queue 0 SQ/CQ pointers
├── 0x1000~0x1FFF  Queue 1
├── 0x2000~0x2FFF  Queue 2
└── 0x3000~0x3FFF  Queue 3

BAR2 (64KB)
└── User logic registers
```

*영역별 분리*로 driver와 device가 *clear contract*. 각 영역이 *독립 callback*.

## 여러 MemoryRegion

```c
struct MyDeviceState {
    PCIDevice parent_obj;
    MemoryRegion bar0_csr;
    MemoryRegion bar0_doorbells;
    MemoryRegion bar0_userspec;
    MemoryRegion bar1_queues;
    MemoryRegion bar2_user;
};
```

각 region이 *자기 ops*를 가짐.

## CSR ops

```c
static uint64_t csr_read(void *opaque, hwaddr addr, unsigned size) {
    MyDeviceState *s = opaque;
    switch (addr) {
    case 0x00: return 0x46414b45;   /* IDENT */
    case 0x04: return s->ctrl;
    case 0x08: return s->version;
    /* ... */
    }
    return 0;
}

static const MemoryRegionOps csr_ops = {
    .read = csr_read,
    .write = csr_write,
    .endianness = DEVICE_LITTLE_ENDIAN,
    .impl.min_access_size = 4,
    .impl.max_access_size = 4,
};
```

## Doorbell ops

```c
static void doorbell_write(void *opaque, hwaddr addr,
                            uint64_t val, unsigned size) {
    MyDeviceState *s = opaque;
    int queue_id = addr / 8;          /* 8 bytes per queue (SQ + CQ) */
    bool is_sq = (addr % 8) == 0;

    if (is_sq) {
        s->queues[queue_id].sq_tail = val;
        process_queue(s, queue_id);
    } else {
        s->queues[queue_id].cq_head = val;
    }
}

static const MemoryRegionOps doorbell_ops = {
    .read = doorbell_read,    /* doorbell은 보통 WO지만 read 시 0 반환 */
    .write = doorbell_write,
    .endianness = DEVICE_LITTLE_ENDIAN,
};
```

doorbell의 *write만* 의미. 별도 region으로 *busy 대 분리*.

## Container + subregion

```c
static void my_pci_realize(PCIDevice *pdev, Error **errp) {
    MyDeviceState *s = MY_PCI(pdev);

    /* BAR0 — container */
    memory_region_init(&s->bar0, OBJECT(s), "bar0", 0x1000);

    memory_region_init_io(&s->bar0_csr, OBJECT(s), &csr_ops, s,
                          "csr", 0x100);
    memory_region_init_io(&s->bar0_doorbells, OBJECT(s), &doorbell_ops, s,
                          "doorbells", 0x300);
    memory_region_init_io(&s->bar0_userspec, OBJECT(s), &userspec_ops, s,
                          "userspec", 0xC00);

    memory_region_add_subregion(&s->bar0, 0x000, &s->bar0_csr);
    memory_region_add_subregion(&s->bar0, 0x100, &s->bar0_doorbells);
    memory_region_add_subregion(&s->bar0, 0x400, &s->bar0_userspec);

    pci_register_bar(pdev, 0, PCI_BASE_ADDRESS_SPACE_MEMORY, &s->bar0);
}
```

container가 *parent*, subregion이 각 *bank*. tree 구조.

## Stride 기반 layout

queue N 개에서 *register stride*가 명확하면 단일 callback에서 *index 계산*.

```c
#define QUEUE_STRIDE   0x100
#define NUM_QUEUES     8

static void queue_write(void *opaque, hwaddr addr,
                        uint64_t val, unsigned size) {
    MyDeviceState *s = opaque;
    int q = addr / QUEUE_STRIDE;
    if (q >= NUM_QUEUES) return;

    int offset = addr % QUEUE_STRIDE;
    switch (offset) {
    case 0x00: s->queues[q].sq_base = val; break;
    case 0x04: s->queues[q].sq_size = val; break;
    /* ... */
    }
}
```

queue 8개 × stride 0x100 = 0x800. 16KB BAR1에 다 들어감.

## Register table abstraction

복잡해지면 *register table*로 추상화.

```c
typedef struct RegInfo {
    const char *name;
    uint32_t offset;
    uint8_t  size;
    bool     readonly;
    void   (*write)(MyDeviceState *s, uint32_t val);
    uint32_t (*read)(MyDeviceState *s);
} RegInfo;

static const RegInfo regs[] = {
    { "IDENT",    0x00, 4, true,  NULL, read_ident },
    { "CTRL",     0x04, 4, false, write_ctrl, read_ctrl },
    { "VERSION",  0x08, 4, true,  NULL, read_version },
    /* ... */
};
```

ops callback에서 *table lookup*. 새 register 추가는 *table 한 줄*.

## Bit-level access

register 안의 *individual bit*가 *다른 의미*면 매크로로.

```c
#define CTRL_ENABLE        BIT(0)
#define CTRL_MODE_MASK     GENMASK(3, 1)
#define CTRL_MODE(x)       FIELD_PREP(CTRL_MODE_MASK, x)
#define CTRL_INTR_EN       BIT(4)

static void write_ctrl(MyDeviceState *s, uint32_t val) {
    bool old_enable = s->ctrl & CTRL_ENABLE;
    s->ctrl = val & (CTRL_ENABLE | CTRL_MODE_MASK | CTRL_INTR_EN);

    bool new_enable = s->ctrl & CTRL_ENABLE;
    if (new_enable && !old_enable) {
        device_start(s);
    }
}
```

Linux kernel의 `BIT`·`GENMASK`·`FIELD_*` macros를 *그대로* 사용.

## RO/RW/W1C/W1S — 의미 분리

```c
typedef enum {
    REG_RO,       /* Read-Only */
    REG_RW,       /* Read/Write */
    REG_W1C,      /* Write-1-to-Clear */
    REG_W1S,      /* Write-1-to-Set */
    REG_WO,       /* Write-Only */
} RegMode;

typedef struct RegInfo2 {
    const char *name;
    uint32_t offset;
    RegMode mode;
    uint32_t initial;
    uint32_t writable_mask;
} RegInfo2;
```

table에 *mode + writable_mask*를 두면 generic write callback이 *자동 처리*.

```c
static void write_reg(MyDeviceState *s, const RegInfo2 *r, uint32_t val) {
    switch (r->mode) {
    case REG_RW:
        s->regs[r->offset/4] = (s->regs[r->offset/4] & ~r->writable_mask)
                             | (val & r->writable_mask);
        break;
    case REG_W1C:
        s->regs[r->offset/4] &= ~(val & r->writable_mask);
        break;
    /* ... */
    }
}
```

## Shadow register

driver의 *마지막 write 값*과 device의 *실 상태*가 다를 수 있음. *shadow*로 분리.

```c
struct MyDeviceState {
    uint32_t ctrl_shadow;   /* driver가 쓴 값 */
    uint32_t ctrl_actual;   /* device의 실 상태 (sequencing 후) */
};
```

OpenTitan 같은 *security device*가 shadow register를 *fault attack 완화*에 사용. 같은 값을 *두 번 써야* 적용.

## Indirect register

큰 register space를 *작은 BAR에 indirect access*.

```c
/* BAR에 노출되는 register */
#define REG_INDIRECT_ADDR  0x10
#define REG_INDIRECT_DATA  0x14

/* 실 backing은 큰 array */
uint32_t internal_regs[1024];

static void indirect_write(MyDeviceState *s, hwaddr addr, uint32_t val) {
    if (addr == REG_INDIRECT_ADDR) {
        s->indirect_addr = val;
    } else if (addr == REG_INDIRECT_DATA) {
        s->internal_regs[s->indirect_addr] = val;
    }
}
```

PHY register·calibration data 같은 *수천 개 register*에 자주 사용.

## Register clustering by function

기능별 그룹화 — *MAC layer registers*·*PHY registers*·*config*·*statistics*.

```text
0x0000~0x00FF  Config (board id, revision)
0x0100~0x01FF  MAC layer
0x0200~0x02FF  PHY interface
0x0300~0x03FF  Statistics counters
0x0400~0x04FF  Interrupt
0x0500~0x05FF  Debug/test
```

driver의 *header*도 같은 구조 — 가독성 ↑.

## Multi-BAR strategy

대규모 device는 *여러 BAR*.

| BAR | 용도 |
|-----|------|
| 0 | CSR + doorbell (작음, frequently accessed) |
| 1 | Queue state (크기 중간) |
| 2 | User logic / data buffer (큼) |
| 3 | MSI-X table |
| 4 | (예비) |

frequently accessed register를 *별도 BAR*에 두어 *cache locality* 향상.

## 흔한 함정

- **subregion overlap** — 같은 offset에 두 region 등록. 한 쪽만 동작.
- **alignment 위반** — subregion이 *parent의 access size align*에 어긋남.
- **table maintenance** — register 추가 시 table·매크로·VMState 셋 다 갱신.
- **shadow stale** — driver 측 shadow read만 보면 *실 상태 놓침*.

## 정리

- 현실 device는 *register bank* 패턴 — CSR·doorbell·queue·user를 *영역별 분리*.
- **Container MemoryRegion** + subregion으로 tree 구성.
- Stride 기반 N-queue는 *단일 callback*에서 index 계산.
- **Register table abstraction**으로 *수십 register*를 *한 table*에. RO/RW/W1C/W1S mode.
- **Shadow register**로 driver-visible과 internal state 분리. security device에 흔함.
- **Indirect register**로 *큰 internal space*를 *작은 BAR window*에.
- Multi-BAR로 *cache locality + functional 분리*.

## 다음 장 예고

다음 장은 Ch 7의 DMA를 *production-grade*로 — **scatter-gather DMA + descriptor ring**.

## 관련 항목

- [Ch 12: NVMe Case Study](/blog/tools/emulation/qemu-fake-device/chapter12-case-study-nvme)
- [Ch 14: Scatter-Gather DMA](/blog/tools/emulation/qemu-fake-device/chapter14-scatter-gather-dma)
- [FPGA Driver — AXI/PCIe Bridge](/blog/tools/emulation/qemu-fpga-driver/chapter04-axi-pcie-bridge)
