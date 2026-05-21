---
title: "2-08: MMU 기초"
date: 2026-05-12T20:00:00
description: "Page table·TLB·virtual address·Linux의 4-level paging."
series: "Modern Embedded Recipes"
seriesOrder: 20
tags: [recipes, arm, mmu]
draft: false
---

## 한 줄 요약

> **"MMU는 모든 메모리 접근을 가상 → 물리 주소로 번역합니다."** 이 번역 표(page table)와 캐시(TLB)가 Linux 메모리 관리의 토대입니다.

## 어떤 상황에서 쓰나

- 임베디드 Linux의 OOM, segfault 디버깅
- DMA에 가상 주소 vs 물리 주소 혼동
- Userspace에서 mmap한 영역의 page fault 분석
- KASAN, KMSAN 같은 메모리 도구 이해

## 핵심 개념

### 1) 가상 주소 → 물리 주소

```text
User process가 보는 주소     실제 RAM 주소
   0x00400000 (.text)  →  page table  →  0x80100000
   0x00601000 (.data)  →               →  0x802A0000
   0x00800000 (heap)   →               →  ... (page에 따라)
```

Process마다 별도의 page table을 갖습니다. 같은 가상 주소도 process별로 다른 물리 주소를 가리킵니다.

### 2) Page와 page table

기본 page 크기는 4 KB입니다(ARM은 16 KB, 64 KB도 옵션). 가상 주소를 page 단위로 잘라 page table을 통해 물리 주소로 변환합니다.

**ARMv8 4 KB page, 48-bit VA:**

- bit  47 ~ 39  38 ~ 30  29 ~ 21  20 ~ 12  11 ~ 0
- L0       L1       L2       L3       offset
- 9 bit    9 bit    9 bit    9 bit    12 bit

4-level이므로 한 번 변환에 메모리 access 4번이 일어납니다. 그래서 **TLB**(Translation Lookaside Buffer)로 캐싱합니다.

### 3) TLB — Translation Lookaside Buffer

가장 최근 변환 결과를 캐시합니다.

**Cortex-A53:**

- ITLB: 10 entry, fully-associative
- DTLB: 10 entry
- L2 TLB: 512 entry

TLB hit이면 1 cycle, miss이면 page table walk(2 ~ 4 cycle, cached) 또는 main memory access(수십 cycle).

### 4) Page attribute

각 page는 자체 attribute를 갖습니다(read-only, executable, user/kernel, cacheable 등). PTE(Page Table Entry)의 bit으로 표현됩니다.

**ARMv8 PTE attribute:**

| Bit | 의미 |
|-----|------|
| AF | Access Flag (page 접근 적이 있나) |
| AP[2:1] | read/write, user/kernel |
| NS | non-secure |
| SH[1:0] | shareability |
| AttrIdx | memory attribute index |
| PXN/UXN | privileged/user execute never |

`PXN = 1, UXN = 1`이면 그 page는 코드 실행 불가. heap, stack에는 보통 NX(execute never)가 설정됩니다.

### 5) Linux의 메모리 관리

Linux는 process마다 `mm_struct`를 갖고, 그 안에 page table root를 둡니다. fork() 시 page table을 copy하고 COW(copy-on-write)로 lazy 복제합니다.

```text
fork()
   parent mm_struct       child mm_struct
        │                       │
        ▼                       ▼
   page table root         (parent와 같은 PT를 share, read-only 표시)
        │                       │
   write 발생 시 → page fault → kernel이 새 page를 할당, copy
```

### 6) Page fault 처리

```text
가상 주소 접근 → MMU lookup → PTE 없음 → page fault → kernel handler
   │
   ├─ valid mapping이지만 page가 swap 됨 → swap-in
   ├─ COW page에 write → 새 page 할당
   ├─ Demand paging (lazy alloc) → 새 page 할당
   └─ 진짜 invalid → SIGSEGV
```

## 코드 / 실제 사용 예

Linux user space에서 mmap을 통해 메모리를 받습니다.

```c
#include <sys/mman.h>

int main(void) {
    void *p = mmap(NULL, 4096,
                   PROT_READ | PROT_WRITE,
                   MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    *(int *)p = 42;     // 이때 page fault → kernel이 물리 page 할당
    munmap(p, 4096);
    return 0;
}
```

Page table 상태 확인:

```bash
# 현재 process의 mapping
cat /proc/self/maps

# 메모리 통계
cat /proc/self/status | grep -E "VmSize|VmRSS|VmData"

# 페이지 폴트 수
ps -o min_flt,maj_flt,cmd 1234
```

DMA용 물리 주소 메모리 할당:

```c
// Linux kernel driver
void *cpu_addr;
dma_addr_t phys_addr;

cpu_addr = dma_alloc_coherent(dev, 4096, &phys_addr, GFP_KERNEL);
// cpu_addr: 가상 주소 (CPU가 사용)
// phys_addr: 물리 주소 (DMA가 사용)
```

`dma_alloc_coherent`는 cache coherent한 영역을 반환합니다. CPU와 DMA가 같은 데이터를 보장 받습니다.

## 측정 / 비교

| Page table walk | Cycle (Cortex-A72) |
| --- | --- |
| L1 TLB hit | 0 ~ 1 |
| L2 TLB hit | 5 ~ 8 |
| Cached page table walk | 10 ~ 30 |
| Uncached walk | 100 ~ 400 |
| TLB miss + page fault | 수천 ~ 수만 |

| Linux page table level (4 KB page) | VA bit | 최대 가상 주소 |
| --- | --- | --- |
| 2-level | 32 | 4 GB |
| 3-level | 39 | 512 GB |
| 4-level | 48 | 256 TB |
| 5-level | 57 | 128 PB |

## 자주 보는 함정

> ⚠️ DMA에 가상 주소 전달

driver에서 user buffer의 가상 주소를 DMA controller에 그대로 주면 DMA는 엉뚱한 물리 주소를 접근합니다. `dma_map_single` 또는 `dma_alloc_coherent`로 변환.

> ⚠️ 큰 contiguous 메모리 할당 실패

물리 메모리가 단편화돼 있으면 `kmalloc(1MB)`가 실패합니다. `vmalloc`(가상 contiguous, 물리 분산) 또는 CMA(Contiguous Memory Allocator) 사용.

> ⚠️ Stack overflow를 SIGSEGV로 안 잡힘

guard page가 stack 끝에 있으면 그 page에 닿을 때만 fault. 한 함수가 한 번에 8 KB 이상 stack을 잡으면 guard를 건너뛰어 다른 영역을 손상시킬 수 있습니다.

> ⚠️ Page fault가 RT 작업의 latency를 망침

real-time process는 `mlockall(MCL_CURRENT | MCL_FUTURE)`로 메모리 잠금 필요. 그렇지 않으면 swap-in latency가 수 ms 이상 들 수 있습니다.

> ⚠️ ASID 무시한 TLB flush

context switch마다 TLB 전체 flush하면 너무 느립니다. ARM은 ASID(Address Space ID)로 process별 entry를 구분하므로 flush 불필요. Linux는 자동 처리.

## 정리

- MMU는 모든 메모리 접근을 page table을 통해 가상 → 물리로 번역합니다.
- ARMv8은 4 KB page, 4-level page table을 표준으로 씁니다.
- TLB가 변환 결과를 캐싱해 lookup 비용을 줄입니다.
- Linux는 process별 page table, COW, demand paging으로 메모리를 관리합니다.
- DMA는 물리 주소를 쓰므로 `dma_*` API로 변환합니다.
- RT 작업은 `mlockall`로 page fault를 막아야 latency를 보장합니다.

다음 편에서는 **TrustZone-M 기초**를 다룹니다. Cortex-M33의 보안 분리입니다.

## 관련 항목

- [2-02: Cortex-A 시리즈 비교](/blog/embedded/modern-recipes/part2-02-cortex-a-comparison)
- [2-06: ARM 캐시 (L1/L2)](/blog/embedded/modern-recipes/part2-06-arm-cache)
- [2-07: MPU 활용](/blog/embedded/modern-recipes/part2-07-arm-mpu)
- [2-09: TrustZone-M 기초](/blog/embedded/modern-recipes/part2-09-trustzone-m)
