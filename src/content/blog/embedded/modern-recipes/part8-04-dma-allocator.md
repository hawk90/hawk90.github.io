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

> **DMA 저장소의 CPU 주소, 장치 주소, 소유권과 해제 시점을 따로 관리합니다.** coherent라고 완료·순서가 보장되지는 않으며, linker section 이름이 cache 속성을 정하지도 않습니다.

## 어떤 상황에서 쓰나

DMA가 이전 데이터를 보내거나 CPU가 이전 수신 값을 읽는다면 cache 유지보수 누락을 조사합니다. 다만 주소 변환·길이·전송 방향·장치 완료 전에 buffer를 재사용하는 문제도 같은 증상을 만들 수 있습니다. cache 함수 하나를 추가하기 전에 어느 주체가 어느 주소로 언제 접근하는지 기록합니다.

CPU 가상 주소와 DMA 주소는 한 건물의 우편 주소와 배송 창구 번호처럼 용도가 다릅니다. Linux의 `void *`, `phys_addr_t`, `dma_addr_t`를 같은 정수로 취급하지 않습니다. IOMMU가 없어도 host bridge 변환이나 bounce buffer 때문에 DMA 주소가 CPU 물리 주소와 같다고 보장할 수 없습니다.

이 글은 Linux 6.12 계열 DMA API와 Cortex-M7의 정적 저장소를 구분합니다. 장치별 register·descriptor format·interrupt 코드를 지어 넣지 않고, 드라이버가 완성해야 할 제출·완료·취소 계약을 명시합니다.

## 먼저 정할 계약

연속성은 한 가지가 아닙니다. CPU에서 연속인 가상 주소, 물리적으로 연속인 page, 장치가 보는 연속 DMA 주소를 구분합니다. 여러 장의 서류를 한 봉투처럼 보여 주는 IOMMU 매핑도 장치의 segment 수·길이·경계 제한까지 없애지는 않습니다.

| 항목 | 확인할 내용 |
|---|---|
| 주소 범위 | 장치의 DMA mask와 coherent mask, segment/boundary 제약을 설정합니다. |
| 저장소 출처 | 해당 DMA API가 지원하는 메모리를 사용합니다. stack·vmalloc 주소를 dma_map_single에 넘기지 않습니다. |
| 일관성 | coherent인지 streaming map/sync/unmap 계약인지 구분합니다. |
| 수명 | 제출 전부터 완료 또는 장치 정지 확인까지 저장소와 mapping을 유지합니다. |
| 실패 정책 | allocation·mapping 실패와 제출 실패의 정리 경로를 만듭니다. |

32-bit DMA 장치라면 probe 등에서 `dma_set_mask_and_coherent(dev, DMA_BIT_MASK(32))`의 반환값을 검사합니다. 이 호출은 실제 장치의 능력에 맞춘 설정이며, 임의로 64-bit mask를 선택하는 대안이 아닙니다. DMA 주소 0도 유효할 수 있으므로 0인지 검사하는 대신 해당 mapping API의 오류 판정을 사용합니다.

## Coherent 할당: cache 일관성과 전송 완료는 별개

coherent allocation은 CPU와 장치가 데이터를 관찰하는 일관성 계약을 제공합니다. 그렇다고 CPU store 순서·descriptor 게시·doorbell ordering·장치 완료까지 자동으로 처리하지는 않습니다. 같은 종이를 함께 볼 수 있어도 어느 줄을 다 쓴 뒤 넘기는지는 별도 약속입니다.

다음은 allocation의 원래 device·size·CPU/DMA 주소를 한곳에 보관하는 보조 코드입니다. 호출자는 구조체를 0으로 초기화하며 이 객체를 복사해 소유자를 늘리지 않습니다.

```c title="dma-coherent-lease.h"
#ifndef DMA_COHERENT_LEASE_H
#define DMA_COHERENT_LEASE_H
#include <linux/dma-mapping.h>
#include <linux/errno.h>

struct coherent_lease {
    struct device *dev;
    void *cpu;
    dma_addr_t dma;
    size_t size;
    bool in_flight;
};

static inline int coherent_lease_alloc(struct device *dev, size_t size,
                                       struct coherent_lease *out)
{
    void *cpu;
    dma_addr_t dma;
    if (!dev || !out || !size) return -EINVAL;
    if (out->cpu || out->in_flight) return -EBUSY;
    cpu = dma_alloc_coherent(dev, size, &dma, GFP_KERNEL);
    if (!cpu) return -ENOMEM;
    *out = (struct coherent_lease){ .dev = dev, .cpu = cpu,
                                  .dma = dma, .size = size };
    return 0;
}

static inline int coherent_lease_free(struct coherent_lease *lease)
{
    if (!lease) return -EINVAL;
    if (lease->in_flight) return -EBUSY;
    if (lease->cpu)
        dma_free_coherent(lease->dev, lease->size, lease->cpu, lease->dma);
    *lease = (struct coherent_lease){ 0 };
    return 0;
}
#endif
```

본 coherent helper의 할당·해제와 SG table 생성은 IRQ가 활성인 task 문맥에서 수행합니다. allocation 경로는 GFP_KERNEL을 사용하므로 잠들 수 있으며, hard IRQ나 spinlock을 잡은 채 호출하는 일반 API로 사용하지 않습니다.

`in_flight`는 드라이버가 실제 제출·완료 절차와 함께 관리할 상태입니다. 제출 전에 참으로 바꾸고, 장치의 접근 종료를 확인한 뒤에만 거짓으로 바꿉니다. timeout이 났다는 이유만으로 거짓으로 바꾸거나 free하면 안 됩니다. 여러 문맥이 접근하면 상태 검사와 제출·해제 전체를 직렬화해야 하며 bool 하나가 race를 해결하지 않습니다.

coherent descriptor에서 payload/주소를 먼저 쓰고 소유권 bit를 나중에 공개하려면 `dma_wmb()` 같은 DMA ordering 규칙을 장치 protocol에 맞춰 적용합니다. CPU가 완료 bit를 본 뒤 payload를 읽는 쪽도 필요한 ordering을 따릅니다. MMIO doorbell과 posted write 처리까지 장치 문서와 Linux DMA API 문서를 기준으로 정합니다.

작은 descriptor를 여러 개 관리할 때는 실제 Linux `dma_pool_create`·`dma_pool_alloc`·`dma_pool_free`도 후보입니다. 생성 시 alignment와 boundary를 설정하며 반환 CPU 주소와 dma_addr_t를 함께 보관합니다. block을 모두 반납하고 장치가 멈춘 뒤 pool을 파괴합니다.

## Streaming mapping: 실패 판정과 짝 맞추기

streaming mapping은 CPU가 준비한 메모리를 장치에 빌려주는 계약입니다. 다음 예제는 `kmalloc` 계열 등 dma_map_single에 적합한 단일 TX buffer를 전제로 합니다. `kbuf`의 할당·해제는 호출자가 담당하며 mapping이 끝날 때까지 살아 있어야 합니다.

```c title="dma-tx-map.h"
#ifndef DMA_TX_MAP_H
#define DMA_TX_MAP_H
#include <linux/dma-mapping.h>
#include <linux/errno.h>

struct tx_mapping {
    struct device *dev;
    dma_addr_t dma;
    size_t len;
    bool mapped, in_flight;
};

static inline int tx_mapping_prepare(struct device *dev, void *kbuf,
                                      size_t len, struct tx_mapping *out)
{
    dma_addr_t dma;
    if (!dev || !kbuf || !out || !len) return -EINVAL;
    if (out->mapped || out->in_flight) return -EBUSY;
    dma = dma_map_single(dev, kbuf, len, DMA_TO_DEVICE);
    if (dma_mapping_error(dev, dma)) return -EIO;
    *out = (struct tx_mapping){ .dev = dev, .dma = dma,
                               .len = len, .mapped = true };
    return 0;
}

static inline int tx_mapping_release(struct tx_mapping *map)
{
    if (!map) return -EINVAL;
    if (map->in_flight) return -EBUSY;
    if (map->mapped)
        dma_unmap_single(map->dev, map->dma, map->len, DMA_TO_DEVICE);
    *map = (struct tx_mapping){ 0 };
    return 0;
}
#endif
```

mapping 실패에는 unmap하지 않습니다. 성공한 mapping은 같은 device·DMA 주소·size·direction으로 해제합니다. `DMA_TO_DEVICE`는 장치가 메모리를 읽는 TX 방향이며, map 뒤 CPU가 buffer를 수정하면 안 됩니다. 제출 실패 시 장치에 공개되지 않았음을 확인하고 해제하며, 완료 또는 취소 시에는 장치의 접근이 끝났음을 먼저 확인합니다.

mapping을 유지하면서 CPU와 장치가 번갈아 접근한다면 ownership을 넘길 때 sync 규칙을 따릅니다. 아래 표는 CPU/장치 사이의 계약이며 특정 cache instruction 목록이 아닙니다. DMA API가 bounce buffer 등을 사용할 수도 있습니다.

| 방향 | 장치의 메모리 접근 | CPU로 돌려받을 때와 재제출 |
|---|---|---|
| DMA_TO_DEVICE | CPU가 준비한 내용을 읽습니다. | CPU 수정 전에 필요한 sync-for-CPU, 수정 후 sync-for-device를 적용합니다. |
| DMA_FROM_DEVICE | 수신 내용을 씁니다. | 완료 뒤 CPU가 읽기 전에 sync-for-CPU, 재제출 전에 sync-for-device를 적용합니다. |
| DMA_BIDIRECTIONAL | 읽고 씁니다. | 양쪽 전환마다 해당 계약을 지키며 소유권을 겹치지 않습니다. |

최종 unmap은 mapping의 짝을 닫습니다. coherent와 streaming 중 어느 쪽이 빠른지는 이 분류만으로 정하지 않습니다. allocation·map/unmap·sync 빈도와 실제 접근 패턴을 비교합니다.

## Scatter-gather: chained list와 entry 수 구분

scatterlist는 큰 표를 여러 묶음의 페이지에 나눠 보관할 수 있으므로 `sgt.sgl[i]`로 전체를 순회하지 않습니다. 입력 entry 수와 장치용 mapping 후의 entry 수도 다를 수 있습니다.

아래 helper는 호출자가 소유한 정상 page 배열을 받아 page당 한 entry를 만듭니다. 장치 제출은 하지 않으며, out은 0 초기화되고 아직 소유한 table이 없어야 합니다.

```c title="dma-sg-pages.h"
#ifndef DMA_SG_PAGES_H
#define DMA_SG_PAGES_H
#include <linux/dma-mapping.h>
#include <linux/scatterlist.h>
#include <linux/mm.h>

static inline int map_page_table(struct device *dev, struct page **pages,
                                 unsigned int count, struct sg_table *out)
{
    struct sg_table table = { 0 };
    struct scatterlist *sg;
    unsigned int i;
    int ret;
    if (!dev || !pages || !count || !out || out->sgl) return -EINVAL;
    for (i = 0; i < count; ++i) if (!pages[i]) return -EINVAL;
    ret = sg_alloc_table(&table, count, GFP_KERNEL);
    if (ret) return ret;
    for_each_sg(table.sgl, sg, count, i)
        sg_set_page(sg, pages[i], PAGE_SIZE, 0);
    ret = dma_map_sgtable(dev, &table, DMA_TO_DEVICE, 0);
    if (ret) { sg_free_table(&table); return ret; }
    *out = table;
    return 0;
}

static inline void release_page_table(struct device *dev, struct sg_table *table)
{
    if (!table || !table->sgl) return;
    dma_unmap_sgtable(dev, table, DMA_TO_DEVICE, 0);
    sg_free_table(table);
    *table = (struct sg_table){ 0 };
}
#endif
```

장치 descriptor를 만들 때는 `for_each_sgtable_dma_sg`와 `sg_dma_address`·`sg_dma_len`을 사용합니다. `orig_nents`는 원래 목록, `nents`는 mapped 목록의 entry 수입니다. 저수준 `dma_map_sg`는 반환값 0을 실패로 처리하고, 해제에는 반환 entry 수가 아니라 원래 입력 수를 넘깁니다. 위 sgtable API는 이 차이를 table에 보관합니다.

release에는 매핑 때와 같은 device를 전달합니다. release 전에 모든 DMA를 멈추고 page의 수명을 유지합니다. SG를 쓴다고 한 transaction으로 전송되거나 장치의 descriptor 한계가 없어지는 것은 아닙니다. coherent한 IOMMU mapping이 있더라도 page pinning·ownership·device mask가 별도로 필요합니다.

## CMA와 IOMMU가 해결하는 범위

CMA는 큰 물리 연속 영역을 제공하기 위한 경로입니다. 다음은 root와 reserved-memory가 모두 2-cell 주소/크기를 사용하는 DTS 예제이며 64 MiB의 동적 shared pool을 기술합니다. 실제 board의 cell 수와 예약 영역은 그 board DTS를 따릅니다.

```dts title="dma-cma-example.dts"
/dts-v1/;
/ {
    #address-cells = <2>;
    #size-cells = <2>;
    reserved-memory {
        #address-cells = <2>;
        #size-cells = <2>;
        ranges;
        dma_pool: dma-pool {
            compatible = "shared-dma-pool";
            reusable;
            size = <0x0 0x04000000>;
            alignment = <0x0 0x00100000>;
            linux,cma-default;
        };
    };
};
```

`dma_alloc_coherent` 호출이 반드시 이 CMA pool에서 물리 연속 메모리를 받는다고 단정하지 않습니다. DMA ops·IOMMU·allocation context와 platform 구성이 실제 경로를 결정합니다. 예약량이 있어도 모든 큰 요청의 성공이나 특정 latency를 보장하지 않습니다.

IOMMU는 장치 주소를 물리 page로 변환하고 격리 domain을 구성할 수 있습니다. 활성화·domain·passthrough 설정과 장치 그룹이 중요하며, IOMMU가 있다는 사실만으로 격리가 완료된 것은 아닙니다. GPU의 private VRAM도 호스트의 일반 DMA buffer와 같은 주소 공간이라고 가정하지 않습니다.

## Cortex-M7: 저장소 배치와 MPU 속성을 따로 설정

Cortex-M에서는 Linux DMA API 대신 MCU의 bus·cache·MPU 계약을 따릅니다. 여기서는 STM32H743의 D2 AHB SRAM 시작 주소 0x30000000 중 앞 32 KiB를 예제로 예약합니다. 이 주소를 SRAM2라고 부르거나 모든 H7·모든 DMA controller에 같은 map을 적용하지 않습니다.

[8-01의 byte pool](/blog/embedded/modern-recipes/part8-01-dynamic-memory)의 저장소 선언만 아래처럼 바꾸는 예입니다. POOL_N=16·BLOCK_SZ=256, used metadata와 task 문맥의 대여·반납 검사는 앞 글을 그대로 사용합니다. metadata까지 NOLOAD 영역으로 옮기지 않습니다.

```c title="dma-pool-placement.c"
alignas(32) static unsigned char pool_buf[POOL_N][BLOCK_SZ]
    __attribute__((section(".dma_buffer")));
_Static_assert(BLOCK_SZ % 32 == 0, "whole-line block stride");
```

다음은 DMA 영역만 보이는 linker script 조각입니다. 실제 firmware의 FLASH·다른 RAM·vector·data/bss 초기화와 함께 통합해야 합니다.

```ld title="dma-region.ld"
MEMORY {
    DMA_RAM (rw) : ORIGIN = 0x30000000, LENGTH = 32K
}
SECTIONS {
    .dma_buffer (NOLOAD) : {
        . = ALIGN(32);
        __dma_start = .;
        KEEP(*(.dma_buffer .dma_buffer.*))
        . = ALIGN(32);
        __dma_end = .;
    } > DMA_RAM
}
ASSERT(__dma_end <= ORIGIN(DMA_RAM) + LENGTH(DMA_RAM), "DMA region overflow")
```

NOLOAD는 buffer 내용을 초기화하거나 non-cacheable로 만드는 지시가 아닙니다. 사용 전에 필요한 내용을 채우며, 앞 장에서 설명한 full-line ownership을 지킵니다. 실제 DMA controller의 접근 가능 영역·clock·power domain도 확인합니다.

다음 CMSIS 코드는 **cache를 활성화하기 전 초기 부팅**에 이 부분 영역을 Normal non-cacheable·execute-never로 설정하는 예입니다. region 0이 이 용도로 예약되어 있다고 가정하며 다른 MPU region과의 우선순위·권한을 검토해야 합니다.

```c title="dma-mpu-config.c"
#include "stm32h743xx.h"
#include "mpu_armv7.h"

_Static_assert(D2_AHBSRAM_BASE == 0x30000000UL, "H743 D2 base");
_Static_assert(D2_AHBSRAM_BASE % (32U * 1024U) == 0, "MPU region alignment");

void configure_dma_region_at_boot(void)
{
    ARM_MPU_Disable();
    ARM_MPU_SetRegion(ARM_MPU_RBAR(0, D2_AHBSRAM_BASE),
        ARM_MPU_RASR(1, ARM_MPU_AP_FULL, 1, 0, 0, 0, 0, ARM_MPU_REGION_SIZE_32KB));
    ARM_MPU_Enable(MPU_CTRL_PRIVDEFENA_Msk);
}
```

TEX/C/B의 조합까지 지정해야 Normal non-cacheable을 뜻합니다. cache가 이미 활성화되었거나 다른 alias가 있거나 DMA가 진행 중일 때 위 코드를 실행하는 전환 절차는 다루지 않습니다. non-cacheable이어도 전송 방향·완료·ordering·buffer 수명은 사라지지 않습니다. CPU가 값을 바로 읽는다고 해서 DMA가 완전히 끝났다고 판단할 수도 없습니다.

## DPDK와 고정 buffer의 위치

DPDK mempool은 NIC queue가 재사용할 packet buffer를 관리하는 한 가지 방식입니다. EAL 초기화·pool 생성 실패·장치 설정·NUMA socket 선택·DMA 주소 mode를 확인해야 하며, HugePages를 사용했다는 이유만으로 IOMMU page-walk 비용이 특정 비율로 줄지는 않습니다.

`io_uring` fixed buffer도 사용자 메모리 등록 기능이지 모든 device의 DMA 주소를 미리 영구 설정하는 기능은 아닙니다. mmap·pinning·I/O·DMA mapping 경계를 구분합니다. 해당 I/O 경로는 [다음 글](/blog/embedded/modern-recipes/part8-05-zero-copy)에서 다룹니다.

## 검증할 실패 경로

아래 helper의 계약은 정상 호출만 보고 판단하지 않습니다. 크기 0·NULL·이미 소유한 객체·allocation 실패·mapping 실패·전송 중 release·해제 후 재사용을 검사합니다. SG에는 table 생성 실패와 DMA mapping 실패를 별도로 넣고, 성공 시에만 정확한 정리를 수행하는지 봅니다.

| 층 | 보드 없이 확인할 내용 | 실제 장치에서 확인할 내용 |
|---|---|---|
| Linux helper | 실제 kernel header 빌드와 실패 주입 시 정리 순서 | 장치 제출·완료·취소·race·DMA API debug |
| SG | chained 순회·orig/mapped entry 수·실패 정리 | descriptor 한계·실제 매핑 경로 |
| CMA DTS | cell 수·크기 encoding·dtc 구문 | board 예약·할당 경로·연속 요청 성공 |
| MPU/linker | 실제 헤더의 base/attribute와 최종 ELF 배치·영역 초과 거부 | cache alias·bus 접근·DMA 종료·권한 |

이 장은 STM32H7 ADC나 NVMe에서 실측하지 않은 latency·jitter·개선 배수를 제시하지 않습니다. Linux memory allocator, DMA mapping과 장치 전송은 서로 다른 비용입니다.

### 이번 예제 검증 결과

Linux 6.12.107 계열의 실제 kernel header로 coherent·streaming·SG·DMA-BUF helper를 모듈로 빌드하고 modpost를 통과했습니다. 이 모듈은 장치에 연결하거나 load하지 않았습니다. 별도의 synthetic DMA 동작으로 allocation/map/attachment 실패, 유효한 DMA 주소 0, 전송 중 해제 거부, 원래 SG 3개와 mapped 2개, 역순 해제를 검사했습니다. 이 실패 주입은 실제 DMA나 kernel ABI의 런타임 검사가 아닙니다.

실제 STM32H743/CMSIS 헤더와 ARM GCC 16.2.0으로 MPU 코드를 교차 컴파일하고 Normal non-cacheable·XN·enable bit encoding을 검사했습니다. GNU 최종 ELF에서 DMA 저장소의 32-byte 정렬·NOLOAD와 영역 초과 거부를 확인했으며 DTS는 dtc 구문 검사를 통과했습니다. 실제 MPU·DMA·cache 동작은 실행하지 않았습니다.

## 자주 보는 함정

- **CPU 포인터를 DMA register에 쓰기:** Linux에서는 DMA API가 반환한 dma_addr_t를 사용합니다. virt_to_phys로 임의 대체하지 않습니다.
- **coherent allocation 직후 전송하고 바로 free:** 완료 또는 장치 정지를 확인하기 전에는 CPU/DMA 주소 쌍을 유지합니다.
- **타이머 만료를 취소 완료로 취급:** timeout은 장치가 여전히 buffer를 사용할 가능성을 없애지 않습니다.
- **64-byte 시작 정렬이면 32-byte cache line도 안전:** 64-byte 정렬은 32-byte 정렬을 포함하지만 끝 경계와 다른 객체의 line 공유까지 보장하지는 않습니다.
- **heap이면 수명이 자동 유지됨:** heap도 조기 free하면 위험합니다. stack도 API가 동기적으로 끝나고 접근성 조건을 만족하는 경우와 비동기 DMA가 남는 경우를 구분합니다. Linux streaming DMA에는 stack을 사용하지 않습니다.

## 정리

- CPU·물리·DMA 주소와 각 연속성 요구를 구분합니다.
- coherent는 cache 일관성 계약이며 완료·순서·소유권을 대신하지 않습니다.
- streaming mapping은 오류 판정과 동일 인자의 unmap/sync 규칙을 따릅니다.
- SG는 chain을 순회하며 원래 entry 수와 DMA entry 수를 구분합니다.
- CMA·IOMMU·HugePages는 수명과 장치별 제약을 제거하지 않습니다.
- linker 배치와 MPU 속성을 분리하고 non-cacheable에서도 종료·ordering을 지킵니다.

다음 편은 **Zero-Copy Pipeline**입니다. 같은 buffer를 넘기면서도 완료·재사용·오류 경로를 잃지 않는 방법을 다룹니다.

## 관련 항목

- [8-03: Cache Alignment](/blog/embedded/modern-recipes/part8-03-cache-alignment)
- [8-05: Zero-Copy Pipeline](/blog/embedded/modern-recipes/part8-05-zero-copy)
- [12-10: Zero-Copy Camera](/blog/embedded/modern-recipes/part12-10-zero-copy-camera)
- [PE 3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
- [RTOS 4-02: FreeRTOS Heap](/blog/embedded/rtos/practical-internals/part4-02-freertos-heap)

## 1차 자료

- [Linux 6.12 DMA API guide](https://docs.kernel.org/6.12/core-api/dma-api-howto.html), [DMA API](https://docs.kernel.org/6.12/core-api/dma-api.html): 주소·mask·mapping·sync·SG·pool 계약입니다.
- [Linux v6.12 dma-mapping.h](https://github.com/torvalds/linux/blob/v6.12/include/linux/dma-mapping.h), [scatterlist.h](https://github.com/torvalds/linux/blob/v6.12/include/linux/scatterlist.h): helper의 실제 API와 순회 정의입니다.
- [reserved-memory shared-dma-pool binding](https://github.com/torvalds/linux/blob/v6.12/Documentation/devicetree/bindings/reserved-memory/shared-dma-pool.yaml): CMA DTS의 필드와 제약입니다.
- [ST STM32H743 device header](https://github.com/STMicroelectronics/cmsis-device-h7/blob/master/Include/stm32h743xx.h), [CMSIS MPU API](https://arm-software.github.io/CMSIS_6/main/Core/group__mpu__functions.html): 주소와 MPU register encoding의 기준입니다.
