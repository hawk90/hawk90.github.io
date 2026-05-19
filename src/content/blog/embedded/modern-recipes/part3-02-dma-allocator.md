---
title: "3-02: DMA-Friendly Allocator — dma_alloc_coherent·IOMMU·Pool"
date: 2026-05-20T09:00:00
description: "DMA buffer 할당. Linux dma_alloc_coherent, IOMMU, non-cacheable pool, physical address."
series: "Modern Embedded Recipes"
seriesOrder: 14
tags: [recipes, dma, allocator, iommu, coherent]
draft: true
---

## 한 줄 요약

> **"DMA buffer = physically contiguous + non-cacheable + aligned"** — 일반 malloc 안 됨.

## DMA Buffer 요구사항

```text
1. Physically contiguous — DMA는 virtual address 모름
2. Cache 일관성 — DMA write vs CPU cache
3. Alignment — burst·SIMD friendly
4. DMA addressable — 32-bit 일부 device·64-bit modern
5. Allocator overhead 최소 — 자주 alloc/free
```

일반 `malloc` — 가상 메모리, fragmented, cacheable. *DMA에 부적합*.

## Linux dma_alloc_coherent

```c
#include <linux/dma-mapping.h>

dma_addr_t dma_handle;
void *cpu_addr = dma_alloc_coherent(dev, 4096, &dma_handle, GFP_KERNEL);
/* cpu_addr = virtual, dma_handle = physical (또는 IOMMU mapped) */

/* 사용 */
memcpy(cpu_addr, data, len);
HW_REG_SET_DMA_ADDR(dma_handle);
HW_REG_DMA_START();

/* 해제 */
dma_free_coherent(dev, 4096, cpu_addr, dma_handle);
```

`coherent` — *non-cacheable* 또는 *cache-coherent*. 자동 처리 — *flush/invalidate 불필요*.

## dma_map_single — Streaming Mapping

```c
/* Single-use mapping */
dma_addr_t dma = dma_map_single(dev, kbuf, len, DMA_TO_DEVICE);
HW_DMA_TX(dma, len);
wait_dma_done();
dma_unmap_single(dev, dma, len, DMA_TO_DEVICE);
```

`map_single` — *cacheable memory 임시 DMA용*. Cache maintenance 자동:
- `DMA_TO_DEVICE` — flush before
- `DMA_FROM_DEVICE` — invalidate after
- `DMA_BIDIRECTIONAL` — both

Coherent보다 *cache 활용 가능* — 일반 buffer 효율.

## Scatter-Gather

```c
struct sg_table sgt;
sg_alloc_table(&sgt, NUM_BUFS, GFP_KERNEL);

for (int i = 0; i < NUM_BUFS; i++) {
    sg_set_buf(&sgt.sgl[i], buffers[i], BUF_SIZE);
}

dma_map_sg(dev, sgt.sgl, NUM_BUFS, DMA_TO_DEVICE);

/* HW가 sg list 따라 DMA */
hw_dma_start_sg(&sgt);
```

여러 buffer를 *한 DMA transaction*. Scatter-gather (4-04 chapter).

## CMA — Contiguous Memory Allocator

```text
Linux CMA:
  - boot 시 *contiguous 영역 reserve*
  - 일반 사용 시 — *movable allocation*
  - DMA alloc 요청 시 — 그 영역 evict
  - Camera·display·video codec — 큰 buffer
```

```dts
/* Device tree */
reserved-memory {
    cma_buffer: cma_buffer {
        compatible = "shared-dma-pool";
        reusable;
        size = <0x40000000>;   /* 1 GB */
        alignment = <0x100000>;
        linux,cma-default;
    };
};
```

```c
/* CMA 사용 — dma_alloc_coherent 내부에서 */
dma_addr_t handle;
void *p = dma_alloc_coherent(dev, 16 * 1024 * 1024, &handle, GFP_KERNEL);
/* → CMA pool에서 16 MB 연속 */
```

## IOMMU — SMMU (ARM)

```text
IOMMU 없음:
  DMA address = physical address
  → DMA가 *임의 physical memory 접근* (보안 위험)
  
IOMMU 있음 (ARM SMMU):
  DMA address = IOVA (IO Virtual Address)
  → SMMU page table로 *제한된 영역만* access
  → Container·VM에 안전
```

```c
/* IOMMU mapping */
dma_addr_t iova = dma_map_single(dev, kbuf, len, DMA_TO_DEVICE);
/* iova ≠ physical addr — SMMU가 translate */
```

Cortex-A SoC modern — SMMU 표준. 자동차·서버 격리.

## Streaming DMA — User Space

```c
/* /dev/dma_buf 같은 file 통해 */
struct dma_buf *buf = dma_buf_alloc(&ops, 4096);
int fd = dma_buf_fd(buf, O_CLOEXEC);

/* User space */
void *p = mmap(NULL, 4096, PROT_READ | PROT_WRITE,
                MAP_SHARED, fd, 0);
/* p — user-space DMA buffer */
```

Wayland·V4L2·GPU — *DMA buffer sharing* 표준. Zero-copy pipeline.

## Embedded (FreeRTOS) — Static DMA Pool

```c
/* Linker section */
__attribute__((section(".dma_buffer"), aligned(64)))
static uint8_t dma_pool_storage[POOL_SIZE * BLOCK_SIZE];

struct dma_pool {
    uint8_t *free_list;
    SemaphoreHandle_t lock;
};

void *dma_pool_alloc(struct dma_pool *p) {
    xSemaphoreTake(p->lock, portMAX_DELAY);
    void *b = p->free_list;
    if (b) p->free_list = *(void**)b;
    xSemaphoreGive(p->lock);
    return b;
}
```

MPU 영역으로 *non-cacheable* → cache 관리 불필요.

## Linker Script — Non-Cacheable Region

```text
/* STM32H7 — AXI SRAM region */
MEMORY {
    AXI_SRAM (rwx)   : ORIGIN = 0x24000000, LENGTH = 512K
    DMA_RAM (rwx)    : ORIGIN = 0x30000000, LENGTH = 32K   /* SRAM2 */
}

SECTIONS {
    .dma_buffer (NOLOAD) : {
        *(.dma_buffer)
    } > DMA_RAM
}
```

MPU에서 *DMA_RAM 영역 non-cacheable*로 설정.

## Cortex-M7 MPU — Non-Cacheable

```c
HAL_MPU_Disable();

MPU_Region_InitTypeDef region = {0};
region.BaseAddress = 0x30000000;
region.Size = MPU_REGION_SIZE_32KB;
region.AccessPermission = MPU_REGION_FULL_ACCESS;
region.IsBufferable = MPU_ACCESS_BUFFERABLE;
region.IsCacheable = MPU_ACCESS_NOT_CACHEABLE;
region.IsShareable = MPU_ACCESS_NOT_SHAREABLE;
region.Number = MPU_REGION_NUMBER0;
HAL_MPU_ConfigRegion(&region);

HAL_MPU_Enable(MPU_PRIVILEGED_DEFAULT);
```

이 영역의 buffer — cache 관리 0.

## DPDK — User Space Huge Pages

```c
/* DPDK initialization */
rte_eal_init(argc, argv);
struct rte_mempool *mp = rte_pktmbuf_pool_create("MP", 8192, 256, 0,
                                                  RTE_MBUF_DEFAULT_BUF_SIZE,
                                                  rte_socket_id());

/* HugePages-backed — 2 MB page → IOMMU page walk 빠름 */
```

10G+ network — *user-space huge page DMA*. Kernel 우회.

## Vulkan·Metal Memory

```cpp
VkBufferCreateInfo bufferInfo = {
    .size = 4 * 1024 * 1024,
    .usage = VK_BUFFER_USAGE_TRANSFER_DST_BIT | VK_BUFFER_USAGE_STORAGE_BUFFER_BIT,
};

VkBuffer buf;
vkCreateBuffer(device, &bufferInfo, NULL, &buf);

VkMemoryAllocateInfo allocInfo = {
    .allocationSize = memReq.size,
    .memoryTypeIndex = findMemoryType(memReq.memoryTypeBits,
                                        VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT),
};
VkDeviceMemory mem;
vkAllocateMemory(device, &allocInfo, NULL, &mem);
vkBindBufferMemory(device, buf, mem, 0);
```

GPU buffer = *DMA buffer*. Vulkan·Metal·DirectX 모두 비슷.

## VirtIO — VM Guest

```text
Hypervisor (KVM):
  Guest VM의 DMA buffer = virtio queue
  Host가 mapping (vhost-net 등)
  
구조:
  Guest write → virtqueue → host driver → real DMA
```

자동차 hypervisor·container 환경.

## 자주 하는 실수

> ⚠️ malloc 결과를 DMA에

```c
uint8_t *buf = malloc(1024);
HAL_DMA_Start(&hdma, src, (uint32_t)buf, 1024);
/* ✗ — cacheable, *virtual* address, fragmented */
```

→ dma_alloc_coherent 또는 *static aligned buffer*.

> ⚠️ Stack에 DMA buffer

```c
void func(void) {
    uint8_t buf[256];
    HAL_DMA_Start_IT(&hdma, src, (uint32_t)buf, 256);
    return;   /* ← buf out of scope, DMA 진행 중 */
}
```

→ static·heap.

> ⚠️ Cache maintenance 누락

```c
fill_data(dma_buf, len);
/* SCB_CleanDCache_by_Addr 누락 */
DMA_start(dma_buf, len);   /* DMA가 *옛 data* read */
```

→ flush/invalidate 명시.

> ⚠️ DMA address 가정

```c
DMA_REG = (uint32_t)cpu_addr;   /* virtual addr — *DMA 잘못된 곳* */
```

→ `dma_handle` (physical or IOVA).

## 정리

- DMA buffer = **contiguous + non-cacheable·coherent + aligned**.
- Linux **dma_alloc_coherent** = 표준 API.
- **dma_map_single** = streaming, cache 활용.
- **CMA** = 큰 contiguous reserve.
- **IOMMU/SMMU** = address translation + 보안.
- Cortex-M = MPU + linker section.

다음 편은 **Zero-Copy**.

## 관련 항목

- [3-01: Cache Alignment](/blog/embedded/modern-recipes/part3-01-cache-alignment)
- [3-03: Zero-Copy](/blog/embedded/modern-recipes/part3-03-zero-copy)
