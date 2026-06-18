---
title: "ARM L1·L2 캐시 분석 — Set Associative·Inclusive·Maintenance"
date: 2026-04-11T09:18:00
description: "I-Cache/D-Cache·write-through vs write-back·invalidate/clean."
series: "Modern Embedded Recipes"
seriesOrder: 18
tags: [recipes, arm, cache]
draft: false
---

## 한 줄 요약

> **"Cache는 CPU와 메모리의 속도 차를 메우지만, DMA는 그 차이를 모릅니다."** 잘못된 cache 관리가 DMA buffer를 깨뜨립니다.

## 어떤 상황에서 쓰나

- Cortex-M7, Cortex-A에서 처음 cache를 enable할 때
- DMA로 받은 데이터가 0으로만 보일 때
- 같은 buffer를 두 번 쓰는데 두 번째가 stale일 때
- 성능 측정 시 cache hit/miss를 분석할 때

## 핵심 개념

### 1) L1 cache 구조 — I와 D

대부분의 캐시 있는 ARM은 L1을 instruction(I-Cache)과 data(D-Cache)로 분리합니다.

| 단계 | 종류 | 크기 | 비고 |
| --- | --- | --- | --- |
| L1 | I-Cache | 16 ~ 64 KB | instruction fetch |
| L1 | D-Cache | 16 ~ 64 KB | load/store |
| L2 | unified | 256 KB ~ 1 MB | I + D 공유 |
| Memory | — | — | L2 miss 시 접근 |

분리하는 이유는 동시 fetch와 load/store가 가능하기 때문입니다.

### 2) Cache line

CPU는 byte 단위가 아니라 cache line(보통 32 또는 64 byte) 단위로 메모리를 가져옵니다.

```text
Cortex-M7: 32 byte line
Cortex-A53: 64 byte line
Cortex-A72: 64 byte line
```

한 byte read도 64 byte를 읽어옵니다. 이 특성이 false sharing 같은 multi-core 함정을 만듭니다.

### 3) Write-through vs Write-back

| 정책 | 동작 | 장점 | 단점 |
| --- | --- | --- | --- |
| Write-through | 매 write를 즉시 memory에 | 단순, coherency 쉬움 | bus 부하 큼 |
| Write-back | dirty bit로 표시, evict 시 write | 빠름 | DMA와 coherency 어려움 |

Cortex-M7은 영역별로 정책을 MPU로 설정할 수 있습니다. Cortex-A는 보통 write-back이 기본입니다.

### 4) Cache maintenance — Invalidate, Clean, Clean+Invalidate

```text
Invalidate: cache 내용을 버림 (memory가 truth가 됨)
Clean:      dirty line을 memory로 write
Clean+Inv:  Clean 후 Invalidate
```

DMA write(peripheral → memory):

```c
// 1. CPU가 buffer 영역의 cache line을 invalidate (stale 제거)
SCB_InvalidateDCache_by_Addr((uint32_t *)buffer, sizeof(buffer));
// 2. DMA 동작
dma_start(buffer, len);
// 3. DMA 완료 대기
wait_dma_done();
// 4. CPU read 시 자동으로 memory에서 fetch (cache가 비었으므로)
process(buffer);
```

DMA read(memory → peripheral):

```c
// 1. CPU가 buffer를 채움 (cache에 dirty)
fill_buffer(buffer, len);
// 2. dirty line을 memory에 flush
SCB_CleanDCache_by_Addr((uint32_t *)buffer, sizeof(buffer));
// 3. DMA 동작 (DMA가 memory를 read)
dma_start(buffer, len);
```

순서를 잘못 잡으면 sporadic corruption이 발생합니다.

### 5) Cache enable (Cortex-M7)

```c
// Reset 직후 cache는 disabled. enable 필요.
SCB_EnableICache();
SCB_EnableDCache();

// 이후 성능 측정 시 cache effect 포함
```

Cortex-A는 BootROM 또는 bootloader가 켜 둡니다. Linux kernel boot 시점에는 이미 활성.

## 코드 / 실제 사용 예

DMA buffer를 안전하게 사용하는 패턴입니다.

```c
// 64-byte aligned buffer (cache line 경계)
__attribute__((aligned(32)))
static uint8_t rx_buffer[1024];

void dma_receive_start(void) {
    // DMA가 받기 전 cache 비우기
    SCB_InvalidateDCache_by_Addr((uint32_t *)rx_buffer, sizeof(rx_buffer));
    
    DMA1_Stream0->M0AR = (uint32_t)rx_buffer;
    DMA1_Stream0->NDTR = sizeof(rx_buffer);
    DMA1_Stream0->CR  |= DMA_SxCR_EN;
}

void DMA1_Stream0_IRQHandler(void) {
    DMA1->LIFCR = DMA_LIFCR_CTCIF0;
    
    // 이 시점에 buffer는 memory에 있음, cache는 비어 있음 (위에서 invalidate)
    // CPU read 시 자동으로 fetch
    process(rx_buffer);
}
```

다른 안전한 방법은 buffer를 non-cacheable region에 두는 것입니다(MPU 사용).

```c
// MPU로 0x20020000~0x20030000을 non-cacheable로
MPU->RNR  = 1;
MPU->RBAR = 0x20020000;
MPU->RASR = MPU_RASR_ENABLE_Msk
          | (15 << MPU_RASR_SIZE_Pos)    // 64KB
          | MPU_RASR_S_Msk
          | (1 << MPU_RASR_TEX_Pos)
          | MPU_RASR_B_Msk;              // non-cacheable
```

## 측정 / 비교

| 코어 | L1 I/D | L2 | Cache line |
| --- | --- | --- | --- |
| Cortex-M7 | 4 ~ 64 KB 각 | option (chip별) | 32 byte |
| Cortex-A7 | 32 KB 각 | 256 KB ~ 1 MB | 64 byte |
| Cortex-A53 | 8 ~ 64 KB 각 | shared 128KB~2MB | 64 byte |
| Cortex-A72 | 48 KB I, 32 KB D | shared 0.5~4 MB | 64 byte |
| Cortex-A78 | 64 KB 각 | private + shared L3 | 64 byte |

| 메모리 접근 | Cycle (Cortex-M7 @ 400 MHz) |
| --- | --- |
| L1 hit | 1 ~ 2 |
| L2 hit | 5 ~ 10 |
| Main memory | 30 ~ 100 |

| Cache enable 전후 (Cortex-M7) | 성능 |
| --- | --- |
| Disabled | 1x (base) |
| I-Cache only | 3 ~ 4x |
| I + D Cache | 5 ~ 10x |

## 자주 보는 함정

> ⚠️ DMA buffer를 cache line aligned 하지 않음

64 byte line인데 buffer가 60 byte offset이면 invalidate가 인접 buffer까지 영향을 줍니다. `__attribute__((aligned(32)))` 필수.

> ⚠️ Invalidate 빼고 DMA 동작

DMA가 write한 영역을 CPU가 cache의 stale로 읽습니다. 디버깅 시 stale 값이 나오면 cache 의심.

> ⚠️ Self-modifying code 후 I-Cache invalidate 누락

코드를 동적으로 패치한 후 I-Cache를 비우지 않으면 옛 코드를 실행합니다. `SCB_InvalidateICache()` 또는 영역 단위 invalidate.

> ⚠️ Multi-core에서 같은 cache line에 쓰는 변수 두 개

False sharing입니다. 두 코어가 같은 line을 ping-pong해 성능이 1/10로 떨어집니다. 변수를 cache line 단위로 격리.

> ⚠️ Cortex-M7에서 cache 안 켜고 성능 비교

reset 후 cache는 disabled입니다. Cortex-M4와 비슷한 성능이 나오면 cache 활성 여부 의심.

## 정리

- L1은 I와 D로 분리됩니다. L2는 보통 shared입니다.
- Cache line은 32(M7) 또는 64(A-series) byte. 단일 byte access도 line 전체를 가져옵니다.
- DMA buffer는 invalidate(write 후) 또는 clean(read 전)으로 cache와 동기화합니다.
- Cortex-M7은 cache가 default disabled입니다. enable 필요.
- False sharing, alignment, self-modifying code 후 invalidate가 흔한 디버깅 원인입니다.

다음 편에서는 **MPU 활용**을 다룹니다. region 설정, attribute, fault 분석입니다.

## 관련 항목

- [2-05: ARM 메모리 맵](/blog/embedded/modern-recipes/part2-05-arm-memory-map)
- [2-07: MPU 활용](/blog/embedded/modern-recipes/part2-07-arm-mpu)
- [2-10: Memory Barrier 실전](/blog/embedded/modern-recipes/part2-10-memory-barrier)
- 더 깊이 — [Embedded Performance Engineering: Cache 분석](/blog/embedded/performance-engineering/)
