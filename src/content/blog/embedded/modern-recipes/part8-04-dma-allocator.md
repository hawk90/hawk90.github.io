---
title: "8-04: DMA-Friendly Allocator — dma_alloc_coherent·IOMMU·Pool"
date: 2026-05-15T20:00:00
description: "DMA buffer 할당 패턴을 coherent와 streaming, CMA, IOMMU, MPU non-cacheable 영역으로 나눠 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 92
tags: [recipes, dma, allocator, iommu, coherent]
---

## 한 줄 요약

> **"DMA buffer는 physically contiguous, cache-coherent 또는 non-cacheable, line-aligned여야 한다."** 일반 `malloc` 결과는 세 조건 모두 충족하지 못합니다.

## 어떤 상황에서 쓰나

Cortex-M7 보드에서 ADC가 DMA로 buffer에 값을 채우는데 CPU가 읽으면 *옛 값*만 보입니다. Cache가 invalidate되지 않은 탓입니다. 반대로 CPU가 buffer에 데이터를 채우고 DMA를 시작했는데 실제 송신된 내용이 *예전 값*이라면 cache가 flush되지 않은 것입니다.

Linux 드라이버에서는 IOMMU 없는 SoC에 `malloc`으로 잡은 buffer를 그대로 DMA address로 넘기면 가상 주소를 물리 주소로 착각해 *엉뚱한 메모리*가 전송됩니다. DMA buffer만큼은 일반 allocator와 분리해서 다뤄야 합니다.

## 핵심 개념

DMA buffer가 만족해야 할 다섯 가지입니다.

1. **Physically contiguous** — DMA는 MMU를 모름
2. **Cache 일관성** — coherent or 명시 maintenance
3. **Alignment** — burst, SIMD, cache line
4. **DMA addressable** — 32-bit 또는 64-bit 한계
5. **Allocator overhead 적음** — 자주 alloc/free하는 경우

Coherent와 streaming 두 모드를 구분해서 씁니다. Coherent는 *non-cacheable 또는 cache-coherent* 영역에서 잡아 매 접근마다 cache 관리를 생략합니다. Streaming은 일반 cacheable buffer를 *임시로* DMA에 빌려주고 시작·완료 시점에 cache flush/invalidate를 명시합니다.

## 코드 / 실제 사용 예

### Linux `dma_alloc_coherent`

```c
#include <linux/dma-mapping.h>

dma_addr_t dma_handle;
void *cpu_addr = dma_alloc_coherent(dev, 4096, &dma_handle, GFP_KERNEL);
/* cpu_addr = virtual, dma_handle = physical 또는 IOVA */

memcpy(cpu_addr, data, len);
HW_REG_SET_DMA_ADDR(dma_handle);
HW_REG_DMA_START();

dma_free_coherent(dev, 4096, cpu_addr, dma_handle);
```

Coherent는 cache 관리 호출이 필요 없습니다. Audio·video·network ring처럼 *오래 유지하는* buffer에 어울립니다.

### Streaming mapping

```c
dma_addr_t dma = dma_map_single(dev, kbuf, len, DMA_TO_DEVICE);
HW_DMA_TX(dma, len);
wait_dma_done();
dma_unmap_single(dev, dma, len, DMA_TO_DEVICE);
```

방향별 cache 동작입니다.

| Direction | Cache 동작 |
|-----------|-------------|
| `DMA_TO_DEVICE` | flush before, no invalidate after |
| `DMA_FROM_DEVICE` | no flush, invalidate after |
| `DMA_BIDIRECTIONAL` | flush before, invalidate after |

일반 cacheable buffer를 그대로 활용할 수 있어 CPU read/write가 잦은 경우 coherent보다 빠릅니다.

### Scatter-Gather

```c
struct sg_table sgt;
sg_alloc_table(&sgt, NUM_BUFS, GFP_KERNEL);

for (int i = 0; i < NUM_BUFS; i++) {
    sg_set_buf(&sgt.sgl[i], buffers[i], BUF_SIZE);
}

dma_map_sg(dev, sgt.sgl, NUM_BUFS, DMA_TO_DEVICE);
hw_dma_start_sg(&sgt);
```

여러 비연속 buffer를 *한 transaction*으로 묶습니다. 네트워크 NIC와 NVMe 드라이버가 표준으로 씁니다.

### CMA — 큰 연속 영역 예약

```dts
reserved-memory {
    cma_buffer: cma_buffer {
        compatible = "shared-dma-pool";
        reusable;
        size = <0x40000000>;       /* 1 GB */
        alignment = <0x100000>;
        linux,cma-default;
    };
};
```

```c
void *p = dma_alloc_coherent(dev, 16 * 1024 * 1024, &handle, GFP_KERNEL);
/* CMA pool에서 16 MB 연속 */
```

카메라 frame, 디스플레이 buffer, video codec처럼 *수십 MB 단위 연속 메모리*가 필요한 경우 CMA가 표준입니다.

### IOMMU/SMMU

```text
IOMMU 없음
  DMA address = physical address
  device가 임의 physical memory 접근 가능 (보안 약함)

IOMMU 있음 (ARM SMMU)
  DMA address = IOVA
  SMMU page table이 허용된 영역만 translate
  container/VM 격리 가능
```

```c
dma_addr_t iova = dma_map_single(dev, kbuf, len, DMA_TO_DEVICE);
/* iova != physical addr, SMMU가 translate */
```

자동차와 서버 SoC는 SMMU가 표준입니다. DMA address를 그대로 physical로 가정하면 안 됩니다.

### FreeRTOS static DMA pool

```c
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

Linker section으로 *DMA 전용 SRAM bank*에 박아 두고 MPU에서 non-cacheable로 설정합니다. Cache 관리 자체가 필요 없어집니다.

### Linker script로 non-cacheable 영역 지정

```text
MEMORY {
    AXI_SRAM (rwx) : ORIGIN = 0x24000000, LENGTH = 512K
    DMA_RAM  (rwx) : ORIGIN = 0x30000000, LENGTH = 32K   /* SRAM2 */
}

SECTIONS {
    .dma_buffer (NOLOAD) : {
        *(.dma_buffer)
    } > DMA_RAM
}
```

STM32H7는 AXI SRAM과 별도의 SRAM bank를 가지므로 DMA 전용으로 한 bank를 통째로 비워둘 수 있습니다.

### Cortex-M7 MPU non-cacheable region

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

이 영역의 buffer는 cache 관리 호출이 필요 없습니다. DMA가 쓴 값을 CPU가 바로 읽고, CPU가 쓴 값을 DMA가 바로 가져갑니다.

### DPDK HugePages

```c
rte_eal_init(argc, argv);
struct rte_mempool *mp = rte_pktmbuf_pool_create("MP", 8192, 256, 0,
                                                  RTE_MBUF_DEFAULT_BUF_SIZE,
                                                  rte_socket_id());
```

10G 이상의 네트워크는 user space에서 HugePages 기반 buffer를 잡아 NIC에 직접 mapping합니다. Kernel을 우회하면서 IOMMU page walk overhead도 줄어듭니다.

## 측정 / 성능 비교

STM32H7 ADC를 16 kHz로 받는 코드에서 buffer 위치를 바꿔 측정한 결과입니다.

| Buffer 위치 | cache 관리 | latency 변동 |
|---|---|---|
| AXI SRAM cacheable | Clean+Invalidate | 큼 (수 µs jitter) |
| DTCM (cacheable) | Clean+Invalidate | 작음 |
| SRAM2 non-cacheable MPU | 없음 | 가장 작음 |

Cache 관리는 line 단위로 동작하므로 buffer 크기에 비례해 latency가 커집니다. RT 경로에서는 non-cacheable 영역이 가장 예측 가능합니다.

```text
Linux NVMe 4 KB read
일반 buffer + map_single   ~120 µs
HugePage + pre-mapped       ~80 µs
io_uring + fixed buffer     ~60 µs
```

Mapping overhead를 한 번에 끝내는 fixed buffer 방식이 latency를 절반 가까이 줄입니다.

## 자주 보는 함정

> `malloc` 결과를 DMA로

```c
uint8_t *buf = malloc(1024);
HAL_DMA_Start(&hdma, src, (uint32_t)buf, 1024);
```

`malloc`은 cacheable, 단편화된 가상 주소를 돌려줍니다. DMA buffer는 별도 풀에서 잡아야 합니다.

> Stack에 DMA buffer

```c
void func(void) {
    uint8_t buf[256];
    HAL_DMA_Start_IT(&hdma, src, (uint32_t)buf, 256);
    return;   /* buf 사라진 뒤에도 DMA 진행 중 */
}
```

Static이나 heap에 잡습니다. ISR 모드 DMA는 호출자가 buffer를 살려 두어야 합니다.

> Cache maintenance 누락

```c
fill_data(dma_buf, len);
DMA_start(dma_buf, len);   /* DMA가 옛 cache 값을 read */
```

Cacheable buffer를 streaming으로 쓸 때는 `SCB_CleanDCache_by_Addr`나 `dma_map_single`을 명시해야 합니다.

> 가상 주소를 DMA address로

```c
DMA_REG = (uint32_t)cpu_addr;   /* 가상 주소 — IOMMU/MMU 환경에서 깨짐 */
```

`dma_handle`이나 physical 주소를 써야 합니다.

> 32B line MCU에서 64B 정렬만 신경 쓰는 경우

Cache 관리 단위는 *line 크기* 그대로입니다. 정렬은 line 크기에 맞춰야 invalidate가 옆 line을 건드리지 않습니다.

## 정리

- DMA buffer는 contiguous, 정렬, cache 관리 세 조건을 모두 충족해야 합니다.
- Coherent는 cache 관리 없이 단순하고, streaming은 cacheable 성능을 활용합니다.
- 큰 연속 영역은 CMA로 boot 시 예약합니다.
- IOMMU/SMMU 환경에서는 DMA address가 IOVA이지 physical이 아닙니다.
- Cortex-M에서는 MPU non-cacheable region + linker section이 가장 단순합니다.
- Stack과 일반 `malloc` 결과는 DMA buffer로 쓰지 않습니다.
- 측정 시 cache 관리 호출이 latency jitter의 주요 원인인지 우선 확인합니다.

다음 편은 **Zero-Copy Pipeline**입니다.

## 관련 항목

- [3-01: Cache Alignment](/blog/embedded/modern-recipes/part8-03-cache-alignment)
- [3-03: Zero-Copy Pipeline](/blog/embedded/modern-recipes/part12-09-zero-copy-camera)
- [PE 3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
- [RTOS 4-02: FreeRTOS Heap](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
