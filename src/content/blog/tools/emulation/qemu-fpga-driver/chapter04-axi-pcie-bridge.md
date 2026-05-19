---
title: "Ch 4: AXI ↔ PCIe Bridge 모방"
date: 2026-05-17T04:00:00
description: "Register map·DMA engine emulation — FPGA shell의 핵심 부분."
tags: [QEMU, axi, pcie-bridge, dma-engine]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 4
draft: true
---

Ch 3의 fake-fpga에 *FPGA shell의 핵심*인 AXI ↔ PCIe bridge와 DMA engine을 더합니다. 목표는 driver가 Xilinx XDMA나 Intel DMA IP와 *같은 register layout*을 보게 만드는 것 — 그래야 driver 코드를 실 FPGA로 옮길 때 *수정 없이* 동작합니다.

## 어떤 문제를 푸는가

driver 입장에서 PCIe와 AXI의 변환은 *투명*해야 합니다. driver는 `writel(val, mmio + offset)` 한 줄을 쓰고, 내부적으로는:

- PCIe MMIO write → AXI4-Lite write (CSR 영역)
- PCIe MMIO read → AXI4-Lite read
- PCIe DMA (host RAM ↔ device) → AXI4 burst read/write

가 일어납니다. fake-fpga의 callback 안에서 *이 변환을 흉내*내야 driver가 같은 코드로 동작합니다.

## Shell register block 모방

Xilinx XDMA shell이 노출하는 표준 register들. fake-fpga가 BAR1에 같은 layout을 둡니다.

| Offset | Register | 의미 |
|--------|----------|------|
| `0x0000` | `XDMA_REG_IDENT` | "XLNX" magic |
| `0x0004` | `XDMA_REG_CTRL` | enable, mode |
| `0x0008` | `XDMA_REG_VERSION` | bitstream/shell version |
| `0x0040` | `XDMA_REG_STATUS` | busy, error |
| `0x0094` | `XDMA_REG_IRQ_MASK` | IRQ enable |
| `0x4000+` | DMA H2C channel registers | host→card |
| `0x5000+` | DMA C2H channel registers | card→host |

XDMA 호환 layout을 둔 *이유*는 단순합니다 — driver를 *실 FPGA로 옮길 때 register offset 변경 없이* 동작합니다.

## DMA channel register set

각 channel(H2C/C2H)당 register block.

| Offset | Register | 의미 |
|--------|----------|------|
| `+0x00` | `DMA_CH_CTRL` | run/pause |
| `+0x04` | `DMA_CH_STATUS` | done, error |
| `+0x10` | `DMA_CH_SRC_LO/HI` | 소스 주소 (64-bit) |
| `+0x18` | `DMA_CH_DST_LO/HI` | 목적지 주소 |
| `+0x20` | `DMA_CH_LEN` | 길이(byte) |
| `+0x24` | `DMA_CH_GO` | doorbell — write 시 trigger |

여러 channel을 stride 0x100으로 배치. H2C0·H2C1·H2C2·H2C3 식으로 확장됩니다.

## QEMU 측 구현 — DMA engine

```c
typedef struct DmaChannel {
    uint64_t src, dst;
    uint32_t len;
    uint32_t ctrl;
    uint32_t status;
    bool     busy;
    int      msix_vec;
} DmaChannel;

typedef struct FakeFPGA {
    /* ... Ch 3 base ... */
    DmaChannel h2c[4];
    DmaChannel c2h[4];
} FakeFPGA;
```

`DMA_CH_GO` doorbell write 시 트랜잭션 시작.

```c
static void dma_go(FakeFPGA *s, DmaChannel *ch, bool h2c) {
    g_autofree void *buf = g_malloc(ch->len);

    if (h2c) {
        /* host RAM 읽기 (PCIe read) → AXI write로 변환된다고 가정 */
        pci_dma_read(&s->parent, ch->src, buf, ch->len);
        /* user logic 처리(여기서는 단순 echo) */
        pci_dma_write(&s->parent, ch->dst, buf, ch->len);
    } else {
        /* C2H — card RAM에서 host로 (여기서는 test pattern 생성) */
        memset(buf, 0xa5, ch->len);
        pci_dma_write(&s->parent, ch->dst, buf, ch->len);
    }

    ch->status |= DMA_STATUS_DONE;
    msix_notify(&s->parent, ch->msix_vec);   /* IRQ 발사 */
}
```

`pci_dma_read`/`pci_dma_write`는 QEMU가 *host RAM*에 접근하는 표준 API. driver가 `dma_map_single`로 받은 IOVA를 사용하면 IOMMU 모델을 거쳐 동작합니다.

## DMA write handler

`DMA_CH_GO` write를 감지해 채널 실행.

```c
static void dma_write(void *opaque, hwaddr off, uint64_t val, unsigned size) {
    FakeFPGA *s = opaque;
    bool h2c = (off >= 0x4000 && off < 0x5000);
    int  idx = ((off & 0xFFF) / 0x100);
    DmaChannel *ch = h2c ? &s->h2c[idx] : &s->c2h[idx];

    switch (off & 0xFF) {
    case 0x10: ch->src = (ch->src & 0xFFFFFFFF00000000ULL) | val; break;
    case 0x14: ch->src = (ch->src & 0xFFFFFFFFULL) | (val << 32); break;
    case 0x18: ch->dst = (ch->dst & 0xFFFFFFFF00000000ULL) | val; break;
    case 0x1C: ch->dst = (ch->dst & 0xFFFFFFFFULL) | (val << 32); break;
    case 0x20: ch->len = val; break;
    case 0x24:                          /* doorbell */
        if (!ch->busy) {
            ch->busy = true;
            dma_go(s, ch, h2c);
            ch->busy = false;
        }
        break;
    }
}
```

## Driver 측 — XDMA 호환 API

driver가 위 register layout을 어떻게 부르는지.

```c
static void xfer_h2c(struct my_fpga *f,
                     dma_addr_t src, dma_addr_t dst, u32 len) {
    void __iomem *ch = f->shell_mmio + 0x4000;   /* H2C0 base */

    writel((u32)src,         ch + 0x10);   /* SRC_LO */
    writel((u32)(src >> 32), ch + 0x14);   /* SRC_HI */
    writel((u32)dst,         ch + 0x18);   /* DST_LO */
    writel((u32)(dst >> 32), ch + 0x1C);   /* DST_HI */
    writel(len,              ch + 0x20);   /* LEN */
    writel(1,                ch + 0x24);   /* GO (doorbell) */
}
```

이 함수가 *실 Xilinx Alveo*에서도 *동일하게* 동작합니다 — 우리가 만든 fake가 실 XDMA shell의 layout을 정확히 따라가므로.

## Endianness와 alignment

```c
static const MemoryRegionOps dma_ops = {
    .read = dma_read, .write = dma_write,
    .endianness = DEVICE_LITTLE_ENDIAN,
    .impl.min_access_size = 4, .impl.max_access_size = 4,
    .valid.min_access_size = 4, .valid.max_access_size = 4,
};
```

실 FPGA shell은 거의 항상 little-endian. 4-byte aligned 접근만 허용해 driver의 잘못된 사용을 *조기에* 잡습니다.

## Streaming DMA (AXI-Stream)

AXI-MM과 별개로 *AXI-Stream*도 모방합니다. 주소가 없는 *연속 stream*. 보통 user logic의 *입출력 port*에 연결되는 인터페이스.

```c
/* Stream — descriptor 없이 단방향, 일정 rate */
static void stream_pump(FakeFPGA *s, int ch_idx) {
    /* user logic → host로 연속 데이터 */
    while (s->stream_active[ch_idx]) {
        uint8_t buf[64];
        generate_stream_data(buf);   /* user logic simulation */
        pci_dma_write(&s->parent, s->stream_dst[ch_idx], buf, 64);
        s->stream_dst[ch_idx] += 64;
    }
}
```

streaming은 *NIC 같은 device*나 *NPU의 input feeder*에 자연스럽습니다.

## Multi-channel

shell은 보통 H2C0~H2C3·C2H0~C2H3 같은 *다중 채널*을 제공합니다.

```c
#define NUM_DMA_CHANNELS  4

typedef struct FakeFPGA {
    /* ... */
    DmaChannel h2c[NUM_DMA_CHANNELS];
    DmaChannel c2h[NUM_DMA_CHANNELS];
} FakeFPGA;
```

각 채널은 *독립적*. driver는 CPU 코어별로 채널을 배정해 lock-free 처리 가능합니다(Ch 6 multi-queue).

## 흔한 함정

- **endian 누락** — host 기본을 따라가 little-endian이 아닌 platform에서 깨짐.
- **`pci_dma_read/write` 사용 시 IOMMU** — driver가 `dma_map_single` 안 하고 raw 가상 주소를 줬다면 IOMMU 변환이 안 되어 깨짐. dmesg에 "Invalid DMA address".
- **doorbell race** — guest가 doorbell write 직후 status를 *즉시* poll. fake에서 동기 처리하면 OK지만, 비동기 BH로 옮기면 race 가능.
- **64-bit 주소** — `SRC_LO/HI`·`DST_LO/HI` 둘 다 채워야. driver가 lo만 쓰면 high bits가 stale.

## 정리

- AXI ↔ PCIe bridge는 driver의 register write를 *FPGA 내부 AXI*로 변환합니다. fake-fpga에서는 *callback 안에서* 흉내냅니다.
- **XDMA 호환 layout**(`IDENT` "XLNX", `CTRL` 0x04, `STATUS` 0x40, DMA channels 0x4000+/0x5000+)을 따라 driver를 *실 FPGA로 그대로* 옮김.
- DMA channel당 register set(SRC/DST/LEN/GO) — `GO` doorbell write로 trigger.
- 구현: `dma_ops` callback에서 `pci_dma_read/write`로 host RAM 접근 후 *msix_notify*로 IRQ.
- AXI-Stream은 주소 없는 단방향. NIC/NPU feeder의 표준 패턴.
- Multi-channel(H2C0~3, C2H0~3)로 CPU 코어 별 lock-free 동작 가능.
- Endianness·alignment·IOMMU mapping이 흔한 함정.

## 다음 장 예고

다음 장에서는 IRQ 모델 — **MSI-X**의 vector 다수·user IRQ multiplexing·polling fallback을 다룹니다. FPGA의 수십~수천 IRQ source를 어떻게 driver에 노출하는지의 표준 패턴을 본격적으로.

## 관련 항목

- [Ch 3: QEMU Fake FPGA 디바이스](/blog/tools/emulation/qemu-fpga-driver/chapter03-qemu-fake-fpga)
- [Ch 5: FPGA 인터럽트 모델](/blog/tools/emulation/qemu-fpga-driver/chapter05-irq-model)
- [QEMU Fake Device — SG-DMA](/blog/tools/emulation/qemu-fake-device/chapter14-scatter-gather-dma)
- [Driver-RTL Co-simulation — BFM](/blog/tools/emulation/driver-cosim/chapter06-bfm)
