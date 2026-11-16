---
title: "DMA-Friendly Allocator — dma_alloc_coherent·IOMMU·Pool"
slug: "embedded/modern-recipes/part8-04-dma-allocator"
date: 2026-04-17T09:03:00
description: "DMA buffer 할당 패턴을 coherent와 streaming, CMA, IOMMU, MPU non-cacheable 영역으로 나눠 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 92
tags: [recipes, dma, allocator, iommu, coherent]
topics: ["embedded"]
---

## 한 줄 요약

> **"DMA buffer 요구사항은 device·IOMMU·cache 정책에 맞춰 정합니다."** 드라이버가 정하는 것은 "어떤 주소를 device에 줄지"와 "언제 cache를 넘길지" 두 가지이고, Linux에서는 둘 다 DMA API가 답합니다. 이 글은 그 답을 Debian 13 arm64 커널 모듈로 직접 받아 보고, Cortex-M7처럼 OS가 없는 경우의 대응을 CMSIS·ST 헤더 기준으로 정리합니다.

## 어떤 상황에서 쓰나

Cortex-M7 보드에서 ADC가 DMA로 buffer를 채우는데 CPU가 읽으면 옛 값만 보인다면, CPU는 cache에 남은 사본을 읽고 있습니다. 반대로 CPU가 buffer를 채우고 DMA를 시작했는데 예전 내용이 나간다면, 새 값이 아직 cache에만 있고 memory에 내려가지 않았습니다. 우체통(memory)에 편지를 넣어야 집배원(DMA)이 가져가는데, 책상 위(cache)에만 올려 두고 넣었다고 생각한 상황과 같습니다.

Linux 드라이버에서는 CPU가 쓰는 주소와 device가 쓰는 주소가 다를 수 있습니다. 아래 실행에서 32비트 DMA mask를 가진 device에 `kmalloc` buffer의 물리 주소(4 GiB 위)를 그대로 주었다면 device는 그 주소에 닿지 못합니다. `dma_map_single`은 같은 buffer에 대해 4 GiB 아래의 다른 주소를 돌려주었습니다.

## 핵심 개념

DMA buffer가 만족해야 할 조건은 다섯 가지입니다.

1. **device가 접근할 수 있는 mapping** — 연속 물리 메모리가 필요할 수도 있고, scatter-gather나 IOMMU가 대신할 수도 있습니다.
2. **cache 일관성** — 하드웨어가 보장하거나(coherent), 소프트웨어가 정해진 시점에 clean·invalidate합니다.
3. **정렬** — DMA 엔진의 burst 조건을 맞추고, cache line을 다른 데이터와 나누지 않아야 합니다.
4. **주소 범위** — device가 낼 수 있는 주소 폭(32비트 등) 안에 있어야 합니다.
5. **할당 비용** — 자주 할당·해제한다면 미리 잡아 둔 pool을 씁니다.

Linux `dma-api-howto.rst`(v6.12)는 mapping을 두 종류로 나눕니다. **Consistent(coherent)** mapping은 "usually mapped at driver initialization"이고, device와 CPU가 "explicit software flushing" 없이 서로의 갱신을 봅니다. 문서가 드는 예는 network card DMA ring descriptor입니다. **Streaming** mapping은 "usually mapped for one DMA transfer"이고, 예는 device가 보내고 받는 networking buffer입니다. 같은 문서는 cache가 DMA-coherent가 아닌 시스템에서 buffer가 다른 데이터와 cache line을 나누지 않아야 한다고 덧붙입니다.

## 코드 / 실제 사용 예

### 실행 환경과 실험 모듈

아래 Linux 코드는 모두 하나의 실험 모듈(`dmademo.c`, [재현 환경](#재현-환경))에 들어 있고, Apple M2 Pro 위 QEMU(`-accel hvf`) Debian 13 arm64 게스트(커널 6.12.116+deb13-arm64, GCC 14.2.0)에서 `insmod`로 돌렸습니다. device는 DT 없이 `platform_device_register_simple`로 만든 가짜 device이고, DMA mask를 32비트로 줍니다. 이 게스트의 부팅 로그는 메모리 배치를 이렇게 보고합니다.

```text
cma: Reserved 64 MiB at 0x00000000fc000000 on node -1
software IO TLB: area num 8.
software IO TLB: mapped [mem 0x00000000f8000000-0x00000000fc000000] (64MB)
```

모듈의 전체 출력입니다.

```text
dmademo: dev_is_dma_coherent=0
dmademo: coherent 4 KiB: cpu=ffff80008257d000 is_vmalloc=1 dma=0x00000000d9c30000
dmademo: coherent 16 MiB: cpu=ffff800084955000 dma=0x00000000fc300000
dmademo: kmalloc buf phys=0x0000000102dec000 -> dma_map_single=0x00000000f8801000 (bounced: not the physical address)
dmademo: sg[0] dma=0x00000000f8802000 len=2048
dmademo: sg[1] dma=0x00000000f8802800 len=2048
dmademo: sg[2] dma=0x00000000f8803000 len=2048
dmademo: sync_for_device    4096 B: 101 ns/call
dmademo: sync_for_device   65536 B: 1564 ns/call
dmademo: sync_for_device 1048576 B: 24544 ns/call
```

### Linux `dma_alloc_coherent`

```c
#include <linux/dma-mapping.h>

dma_addr_t dma_handle;
void *cpu_addr = dma_alloc_coherent(dev, 4096, &dma_handle, GFP_KERNEL);
/* cpu_addr: for the CPU; dma_handle: for the device (bus address / IOVA) */

memcpy(cpu_addr, data, len);
hw_set_dma_addr(dma_handle);      /* device-specific register write */
hw_dma_start();

dma_free_coherent(dev, 4096, cpu_addr, dma_handle);
```

위 출력의 `coherent 4 KiB` 줄에서 `cpu`는 vmalloc 영역 주소(`is_vmalloc=1`)이고 `dma`는 4 GiB 아래 `0xd9c30000`이었습니다. 이 device는 `dev_is_dma_coherent=0`(하드웨어 coherency 없음)이라, 커널은 페이지를 cache를 끈 속성으로 다시 mapping해 CPU에게 줍니다. 그래서 cache 관리 호출 없이 CPU와 device가 같은 내용을 보는 대신, CPU의 접근도 cache를 거치지 않습니다. CPU가 이 영역을 많이 읽고 쓰는 용도라면 아래 streaming이 맞습니다. coherent 메모리도 쓰기 순서까지 보장하지는 않으므로, descriptor의 두 word 순서가 중요하면 `wmb()`를 넣으라고 같은 문서가 적습니다.

### Streaming mapping

```c
dma_addr_t dma = dma_map_single(dev, kbuf, len, DMA_TO_DEVICE);
if (dma_mapping_error(dev, dma))
    return -ENOMEM;
hw_dma_tx(dma, len);
wait_dma_done();
dma_unmap_single(dev, dma, len, DMA_TO_DEVICE);
```

방향은 데이터가 움직이는 쪽입니다. `DMA_TO_DEVICE`는 "from main memory to the device", `DMA_FROM_DEVICE`는 "from the device to main memory"입니다(`dma-api-howto.rst`). arm64의 비-coherent device에서 그 방향이 하는 일은 `arch/arm64/mm/dma-mapping.c`에 있습니다.

| 호출 | arm64 동작 (v6.12) |
| --- | --- |
| `dma_sync_*_for_device` / map | `dcache_clean_poc`: CPU cache의 더러운 line을 memory로 내림 (15–21행) |
| `dma_sync_*_for_cpu` / unmap, `DMA_FROM_DEVICE`·`BIDIRECTIONAL` | `dcache_inval_poc`: CPU cache의 사본을 버림 (23–32행) |
| `dma_sync_*_for_cpu`, `DMA_TO_DEVICE` | 아무것도 하지 않음 (`if (dir == DMA_TO_DEVICE) return;`) |

이 clean·invalidate는 byte가 아니라 cache line 단위로 범위를 훑으므로 비용이 크기에 비례합니다. 위 출력의 마지막 세 줄이 4 KiB 101 ns, 64 KiB 1,564 ns, 1 MiB 24,544 ns로, 크기가 16배 늘 때마다 시간도 15~16배 늘었습니다. 1 KiB당 약 24 ns입니다. 이 값은 hvf 가상화 위 M2 Pro에서 잰 것이라 임베디드 Cortex-A의 절대값과는 다릅니다.

### 주소가 닿지 않을 때 — swiotlb bounce

출력의 `kmalloc buf` 줄에서 buffer의 물리 주소는 `0x102dec000`(4 GiB 위)인데, `dma_map_single`이 돌려준 주소는 `0xf8801000`이었습니다. 이 device의 mask가 32비트라 원래 주소에 닿지 못하자, 커널이 부팅 때 4 GiB 아래에 잡아 둔 swiotlb 영역(`0xf8000000`–`0xfc000000`)의 bounce buffer로 바꿨습니다. `kernel/dma/direct.h`의 `dma_direct_map_page`가 `dma_capable()`이 실패하면 `swiotlb_map()`으로 넘어가는 경로입니다(84–104행). 그래서 device에는 반드시 DMA API가 준 주소를 넘깁니다. bounce가 일어나면 map·unmap 때 복사가 더해지므로, 처음부터 device가 닿는 영역에서 할당하는 것이 빠릅니다.

### Scatter-Gather

여러 개의 떨어진 buffer를 한 번의 map으로 device 주소 목록으로 바꿉니다. `sgt.sgl[i]`처럼 배열로 index하면 sg table이 여러 조각으로 chain될 때 틀리므로 `for_each_sg`로 돕니다. 위 출력의 `sg[0]`~`sg[2]` 줄이 이 코드의 결과입니다.

```c
#define NUM_BUFS 3
#define BUF_SIZE 2048

static void sg_demo(struct device *dev)
{
	struct sg_table sgt;
	struct scatterlist *sg;
	void *buffers[NUM_BUFS] = { 0 };
	int i;

	if (sg_alloc_table(&sgt, NUM_BUFS, GFP_KERNEL))
		return;
	for_each_sg(sgt.sgl, sg, NUM_BUFS, i) {
		buffers[i] = kmalloc(BUF_SIZE, GFP_KERNEL);
		if (!buffers[i])
			goto out;
		sg_set_buf(sg, buffers[i], BUF_SIZE);
	}
	if (dma_map_sgtable(dev, &sgt, DMA_TO_DEVICE, 0))
		goto out;
	for_each_sgtable_dma_sg(&sgt, sg, i)       /* program the device from these */
		pr_info("dmademo: sg[%d] dma=%pad len=%u\n", i, &sg_dma_address(sg), sg_dma_len(sg));
	dma_unmap_sgtable(dev, &sgt, DMA_TO_DEVICE, 0);
out:
	for (i = 0; i < NUM_BUFS; i++)
		kfree(buffers[i]);
	sg_free_table(&sgt);
}
```

`dma_map_sgtable()`은 성공하면 0을 돌려주고, device에 줄 항목은 `for_each_sgtable_dma_sg`로 읽습니다(`kernel/dma/mapping.c:288`, `include/linux/scatterlist.h:209`). 이번 실행에서는 세 buffer 모두 4 GiB 위에 잡혀 swiotlb로 bounce됐습니다.

### CMA — 큰 연속 영역 예약

```dts
reserved-memory {
    #address-cells = <2>;
    #size-cells = <2>;
    ranges;

    cma_buffer: cma_buffer {
        compatible = "shared-dma-pool";
        reusable;
        size = <0x0 0x04000000>;     /* 64 MiB, sized for the board */
        alignment = <0x0 0x100000>;
        linux,cma-default;
    };
};
```

v6.12 `kernel/dma/contiguous.c`의 `rmem_cma_setup()`은 `compatible = "shared-dma-pool"` 노드에서 `reusable`이 없거나 `no-map`이 있으면 거부하고, `linux,cma-default`가 있으면 그 영역을 기본 CMA로 씁니다(457–498행). 커널 명령줄로 CMA 크기를 줬다면 이 노드는 건너뜁니다. 이 게스트는 DT 노드 대신 커널 설정 `CONFIG_CMA_SIZE_MBYTES=64`로 64 MiB를 `0xfc000000`에 잡았고, 위 출력에서 16 MiB `dma_alloc_coherent`가 그 범위 안 `0xfc300000`을 받았습니다.

### IOMMU/SMMU

`dma-api-howto.rst`의 "CPU and DMA addresses" 절은 세 종류의 주소를 구분합니다. CPU가 쓰는 가상 주소, CPU 물리 주소, 그리고 device가 쓰는 bus 주소입니다. 문서는 "In some systems, bus addresses are identical to CPU physical addresses, but in general they are not. IOMMUs and host bridges can produce arbitrary mappings"라고 적습니다. 이 게스트에는 IOMMU가 없어 bus 주소가 물리 주소와 같거나(4 GiB 아래), swiotlb가 대신 주소를 바꿨습니다. IOMMU가 있으면 `dma_map_single`이 IOMMU page table에 mapping을 만들고 그 IOVA를 돌려줍니다. 어느 경우든 드라이버 코드는 같고, device에는 API가 준 값만 씁니다.

### Cortex-M7: 정적 DMA pool

OS가 cache를 관리해 주지 않는 MCU에서는 DMA buffer를 전용 section에 모으고, 그 영역을 MPU로 non-cacheable로 만들거나 cache 유지 명령을 직접 부릅니다. pool은 [8-01](/blog/embedded/modern-recipes/part8-01-dynamic-memory)의 free-list cache에 정렬만 더하면 됩니다.

```c
#define BLOCK_SIZE 512                       /* multiple of the 32 B M7 line */
#define POOL_SIZE  8

__attribute__((section(".dma_buffer"), aligned(32)))
static uint8_t dma_pool_storage[POOL_SIZE * BLOCK_SIZE];

struct dma_pool {
    void *free_list;
    SemaphoreHandle_t lock;                  /* task context only, not ISR */
};

void *dma_pool_alloc(struct dma_pool *p)
{
    xSemaphoreTake(p->lock, portMAX_DELAY);
    void *b = p->free_list;
    if (b) p->free_list = *(void **)b;
    xSemaphoreGive(p->lock);
    return b;
}
```

정렬은 Cortex-M7 D-cache line 32 B(CMSIS 5.9.0 `cachel1_armv7.h`의 `__SCB_DCACHE_LINE_SIZE`)에 맞추고 블록 크기도 그 배수로 둡니다. 그래야 [8-03](/blog/embedded/modern-recipes/part8-03-cache-alignment#자주-보는-함정)에서 본 것처럼 invalidate가 이웃 변수를 함께 지우지 않습니다.

### Linker script로 DMA 영역 지정

```text
MEMORY {
    AXI_SRAM (rwx) : ORIGIN = 0x24000000, LENGTH = 512K
    DMA_RAM  (rwx) : ORIGIN = 0x30000000, LENGTH = 32K   /* start of D2 AHB SRAM */
}

SECTIONS {
    .dma_buffer (NOLOAD) : {
        *(.dma_buffer)
    } > DMA_RAM
}
```

주소는 ST `cmsis_device_h7` v1.10.6의 `stm32h743xx.h`에서 가져왔습니다. `D1_AXISRAM_BASE`는 `0x24000000`("up to 512KB ... over AXI"), `D2_AHBSRAM_BASE`는 `0x30000000`("up to 288KB ... over AXI->AHB Bridge")입니다. 어느 DMA 컨트롤러가 어느 SRAM에 닿는지는 reference manual의 bus matrix 장에서 확인해야 하고, 이 글은 그 문서를 열지 못해 다루지 않습니다.

### Cortex-M7 MPU non-cacheable region

```c
HAL_MPU_Disable();

MPU_Region_InitTypeDef region = {0};
region.Enable           = MPU_REGION_ENABLE;
region.Number           = MPU_REGION_NUMBER0;
region.BaseAddress      = 0x30000000;
region.Size             = MPU_REGION_SIZE_32KB;
region.AccessPermission = MPU_REGION_FULL_ACCESS;
region.TypeExtField     = MPU_TEX_LEVEL1;            /* TEX=001 */
region.IsCacheable      = MPU_ACCESS_NOT_CACHEABLE;  /* C=0 */
region.IsBufferable     = MPU_ACCESS_NOT_BUFFERABLE; /* B=0 */
region.IsShareable      = MPU_ACCESS_NOT_SHAREABLE;
region.DisableExec      = MPU_INSTRUCTION_ACCESS_DISABLE;
HAL_MPU_ConfigRegion(&region);

HAL_MPU_Enable(MPU_PRIVILEGED_DEFAULT);
```

이 설정에서 자주 틀리는 곳은 두 군데입니다. 하나는 `Enable`을 비워 두는 실수입니다. ST `stm32h7xx_hal_driver` v1.11.5의 `MPU_Region_InitTypeDef` 첫 필드가 `Enable`이고 `MPU_REGION_DISABLE`이 0이라, `{0}`으로 시작한 region은 꺼진 채 남습니다. 다른 하나는 TEX = 0, C = 0, B = 1 조합입니다. ARMv7-M ARM(DDI 0403E.b) Table B3-13에서 이 조합은 Normal이 아니라 "Shared device"이고, Normal non-cacheable은 TEX = 001, C = 0, B = 0입니다. 같은 문서 A3.2.1은 Device 메모리 접근이 항상 natural alignment여야 한다고 적으므로, Device로 잡힌 영역에 `memcpy`가 unaligned로 접근하면 fault가 납니다. 같은 설정을 [PE 3-03](/blog/embedded/performance-engineering/part3-03-dma-performance)도 씁니다.

이 영역의 buffer는 cache 유지 호출이 필요 없는 대신 CPU의 읽기·쓰기도 cache를 쓰지 못합니다. 보드가 없어 이 MCU 절의 코드는 실행하지 않았고, 이름과 값은 위 ST·CMSIS 헤더와 ARMv7-M ARM에서 확인했습니다.

### DPDK hugepage mempool

```c
rte_eal_init(argc, argv);
struct rte_mempool *mp = rte_pktmbuf_pool_create("MP", 8192, 256, 0,
                                                  RTE_MBUF_DEFAULT_BUF_SIZE,
                                                  rte_socket_id());
```

인자는 DPDK v23.11 `rte_mbuf.h:710`의 `(name, n, cache_size, priv_size, data_room_size, socket_id)` 순서입니다. DPDK Linux 시작 가이드(`sys_reqs.rst`)는 packet buffer용 대용량 pool에 hugepage가 필요하다고 하고, 이유로 page 수가 줄어 TLB miss가 줄어드는 것을 듭니다. 이 글은 DPDK를 실행하지 않았습니다.

## 측정 / 성능 비교

위 모듈 실행에서 잰 것은 streaming sync의 비용입니다. 64 B를 쓴 뒤 `dma_sync_single_for_device(DMA_TO_DEVICE)`를 100번 부른 평균입니다.

| 크기 | 호출당 시간 | 4 KiB 대비 |
| ---: | ---: | ---: |
| 4 KiB | 101 ns | 1 |
| 64 KiB | 1,564 ns | 15.5 |
| 1 MiB | 24,544 ns | 243 |

같은 모듈을 새 디렉터리에서 다시 빌드해 넣었을 때 세 값은 101·1,477·24,182 ns로 6% 안쪽에서 같았고, `kmalloc` 주소와 bounce 주소(`0x103205000` → `0xf9000000`)는 실행마다 바뀌었습니다. 비용은 크기에 거의 정확히 비례했습니다. cache 유지 명령이 line마다 하나씩 나가기 때문입니다(`dcache_clean_poc`). 그래서 RT 경로에서 큰 buffer를 자주 넘긴다면 coherent(non-cacheable) 영역을 쓰거나, 실제로 바뀐 범위만 sync합니다. 이 숫자는 hvf 게스트의 것이고, Cortex-M7 보드에서의 `SCB_CleanDCache_by_Addr` 비용은 그 보드에서 따로 재야 합니다.

## 자주 보는 함정

> ⚠️ 일반 `malloc` 결과를 DMA 주소로

```c
uint8_t *buf = malloc(1024);
HAL_DMA_Start(&hdma, src, (uint32_t)buf, 1024);
```

MMU가 없는 Cortex-M에서는 주소 자체는 맞지만, buffer가 cacheable이고 정렬이 보장되지 않습니다. 시작과 크기를 32 B로 맞춘 DMA pool에서 꺼내고, cacheable이라면 전송 전 clean, 수신 후 invalidate를 부릅니다.

> ⚠️ Stack에 DMA buffer

```c
void func(void)
{
    uint8_t buf[256];
    HAL_DMA_Start_IT(&hdma, src, (uint32_t)buf, 256);
    return;   /* buf is gone while the DMA is still writing */
}
```

함수가 돌아가면 DMA가 그 stack 영역을 계속 덮어씁니다. Linux도 stack 주소는 DMA에 쓰지 말라고 적습니다(`dma-api-howto.rst` "What memory is DMA'able?"). buffer는 `static`이나 pool에 둡니다.

> ⚠️ Cache 유지 누락

```c
fill_data(dma_buf, len);
DMA_start(dma_buf, len);   /* the DMA reads memory; the new data may still be in the cache */
```

cacheable buffer라면 Cortex-M7에서는 `SCB_CleanDCache_by_Addr`를, Linux에서는 `dma_map_single`이나 `dma_sync_single_for_device`를 전송 전에 부릅니다.

> ⚠️ CPU 주소를 DMA 주소로

```c
DMA_REG = (uint32_t)cpu_addr;   /* virtual address */
```

위 실행에서 `dma_alloc_coherent`가 준 `cpu`는 `0xffff80008257d000`, `dma`는 `0xd9c30000`이었습니다. device 레지스터에는 `dma_handle`을 씁니다.

> ⚠️ 32 B line MCU에서 크기를 line 배수로 올리지 않음

정렬만 맞추고 크기를 line 배수로 올리지 않으면 buffer의 마지막 line을 뒤 변수와 나눕니다. CMSIS `SCB_InvalidateDCache_by_Addr`는 범위가 걸친 line 전체를 invalidate합니다.

## 재현 환경

모듈은 Debian 13 arm64 게스트(QEMU 11.1.3 `-M virt -accel hvf -cpu host`, 8 GiB)에서 `linux-headers-6.12.116+deb13-arm64`로 빌드했습니다.

```bash
printf 'obj-m += dmademo.o\n' > Makefile
make -C /lib/modules/$(uname -r)/build M=$PWD modules
sudo dmesg -C && sudo insmod dmademo.ko && sudo dmesg && sudo rmmod dmademo
```

```c
// SPDX-License-Identifier: GPL-2.0
/* Prints what the DMA API hands back on this machine, and how long streaming syncs take. */
#include <linux/module.h>
#include <linux/platform_device.h>
#include <linux/dma-mapping.h>
#include <linux/dma-map-ops.h>
#include <linux/slab.h>
#include <linux/gfp.h>
#include <linux/mm.h>
#include <linux/ktime.h>
#include <linux/scatterlist.h>

static struct platform_device *pdev;

static void time_sync(struct device *dev, unsigned int order)
{
	size_t len = PAGE_SIZE << order;
	struct page *pg = alloc_pages(GFP_KERNEL | GFP_DMA, order);
	void *buf;
	dma_addr_t h;
	u64 t0, t;
	int i;

	if (!pg)
		return;
	buf = page_address(pg);
	h = dma_map_single(dev, buf, len, DMA_TO_DEVICE);
	if (dma_mapping_error(dev, h))
		goto out;
	t0 = ktime_get_ns();
	for (i = 0; i < 100; i++) {
		memset(buf, i, 64);                       /* CPU writes ... */
		dma_sync_single_for_device(dev, h, len, DMA_TO_DEVICE);   /* ... then hands over */
	}
	t = (ktime_get_ns() - t0) / 100;
	pr_info("dmademo: sync_for_device %7zu B: %llu ns/call\n", len, t);
	dma_unmap_single(dev, h, len, DMA_TO_DEVICE);
out:
	__free_pages(pg, order);
}

#define NUM_BUFS 3
#define BUF_SIZE 2048

static void sg_demo(struct device *dev)
{
	struct sg_table sgt;
	struct scatterlist *sg;
	void *buffers[NUM_BUFS] = { 0 };
	int i;

	if (sg_alloc_table(&sgt, NUM_BUFS, GFP_KERNEL))
		return;
	for_each_sg(sgt.sgl, sg, NUM_BUFS, i) {
		buffers[i] = kmalloc(BUF_SIZE, GFP_KERNEL);
		if (!buffers[i])
			goto out;
		sg_set_buf(sg, buffers[i], BUF_SIZE);
	}
	if (dma_map_sgtable(dev, &sgt, DMA_TO_DEVICE, 0))
		goto out;
	for_each_sgtable_dma_sg(&sgt, sg, i)       /* program the device from these */
		pr_info("dmademo: sg[%d] dma=%pad len=%u\n", i, &sg_dma_address(sg), sg_dma_len(sg));
	dma_unmap_sgtable(dev, &sgt, DMA_TO_DEVICE, 0);
out:
	for (i = 0; i < NUM_BUFS; i++)
		kfree(buffers[i]);
	sg_free_table(&sgt);
}

static int __init dmademo_init(void)
{
	struct device *dev;
	dma_addr_t h, h16;
	void *cpu, *cpu16, *kbuf;

	pdev = platform_device_register_simple("dmademo", -1, NULL, 0);
	if (IS_ERR(pdev))
		return PTR_ERR(pdev);
	dev = &pdev->dev;
	if (dma_coerce_mask_and_coherent(dev, DMA_BIT_MASK(32)))
		pr_info("dmademo: no 32-bit DMA\n");
	pr_info("dmademo: dev_is_dma_coherent=%d\n", dev_is_dma_coherent(dev));

	cpu = dma_alloc_coherent(dev, 4096, &h, GFP_KERNEL);
	pr_info("dmademo: coherent 4 KiB: cpu=%px is_vmalloc=%d dma=%pad\n",
		cpu, is_vmalloc_addr(cpu), &h);

	cpu16 = dma_alloc_coherent(dev, 16 << 20, &h16, GFP_KERNEL);
	pr_info("dmademo: coherent 16 MiB: cpu=%px dma=%pad\n", cpu16, &h16);

	kbuf = kmalloc(4096, GFP_KERNEL);
	if (kbuf) {
		phys_addr_t pa = virt_to_phys(kbuf);
		dma_addr_t s = dma_map_single(dev, kbuf, 4096, DMA_TO_DEVICE);

		pr_info("dmademo: kmalloc buf phys=%pa -> dma_map_single=%pad%s\n", &pa, &s,
			dma_mapping_error(dev, s) ? " (error)" :
			(s != pa ? " (bounced: not the physical address)" : ""));
		if (!dma_mapping_error(dev, s))
			dma_unmap_single(dev, s, 4096, DMA_TO_DEVICE);
		kfree(kbuf);
	}

	sg_demo(dev);
	time_sync(dev, 0);   /* 4 KiB */
	time_sync(dev, 4);   /* 64 KiB */
	time_sync(dev, 8);   /* 1 MiB */

	if (cpu16)
		dma_free_coherent(dev, 16 << 20, cpu16, h16);
	if (cpu)
		dma_free_coherent(dev, 4096, cpu, h);
	return 0;
}

static void __exit dmademo_exit(void)
{
	platform_device_unregister(pdev);
}

module_init(dmademo_init);
module_exit(dmademo_exit);
MODULE_LICENSE("GPL");
```

## 정리

- Coherent mapping은 driver 초기화 때 잡아 두는 ring descriptor 같은 용도이고, streaming은 전송마다 map·unmap하는 data buffer 용도입니다.
- 하드웨어 coherency가 없는 device에서 `dma_alloc_coherent`는 cache를 끈 vmalloc 영역 주소를 CPU에 줬습니다.
- 32비트 mask device에 4 GiB 위 buffer를 map하자 swiotlb bounce 주소가 돌아왔습니다. device에는 항상 DMA API가 준 주소를 씁니다.
- arm64에서 for-device sync는 clean, for-cpu sync는 invalidate이고, 비용은 크기에 비례했습니다(4 KiB 101 ns → 1 MiB 24.5 µs).
- 큰 연속 영역은 CMA로 예약합니다. 이 게스트에서 16 MiB coherent 할당이 CMA 영역에서 나왔습니다.
- Cortex-M7 MPU non-cacheable region은 `Enable`을 채우고 TEX = 001, C = 0, B = 0으로 둡니다. TEX = 0, B = 1은 Device 메모리입니다.
- Stack과 일반 heap 결과는 DMA buffer로 쓰지 않습니다.

다음 편은 **Zero-Copy Pipeline**입니다.

## 관련 항목

- [8-03: Cache Alignment](/blog/embedded/modern-recipes/part8-03-cache-alignment)
- [8-05: Zero-Copy Pipeline](/blog/embedded/modern-recipes/part8-05-zero-copy)
- [12-10: Zero-Copy Camera Pipeline](/blog/embedded/modern-recipes/part12-10-zero-copy-camera)
- [PE 3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
- [RTOS 4-02: FreeRTOS Heap](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)
