---
title: "DMA 성능 최적화 — Burst·Scatter-Gather·Chain·Cache 일관성"
slug: "embedded/performance-engineering/part3-03-dma-performance"
date: 2026-04-25T09:02:00
description: "DMA burst·scatter-gather·double buffer·cache 일관성을 AXI 사양, STM32H7 HAL 소스, ARMv7-M MPU 규칙으로 확인하고 흔한 코드 오류를 고칩니다."
series: "Embedded Performance Engineering"
seriesOrder: 21
tags: [dma, burst, scatter-gather, cache, double-buffer]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"DMA는 CPU를 우회한 데이터 이동입니다."** burst size와 alignment, cache가 핵심을 결정합니다.

이 글의 STM32 코드는 STM32CubeH7 HAL 드라이버 소스(`STMicroelectronics/stm32h7xx-hal-driver`, 커밋 `65e5c7e`)에서 함수·필드 이름을 확인했고, 보드에서 실행하지는 않았습니다. 이 시리즈의 Debian 게스트에는 DMA 컨트롤러가 없어(`/sys/class/dma`가 비어 있고 `dmatest` 모듈도 없음) Linux dmaengine도 실행하지 못했습니다.

## DMA Throughput 결정 요소

| 요소 | 영향 |
|---|---|
| **Burst 길이** | transaction 하나에 담는 beat 수. AXI에서는 Length = AxLEN + 1 (3-01) |
| **Beat 크기** | 한 번에 옮기는 byte. 버스 폭을 넘을 수 없음(AXI A3.1.1) |
| **정렬** | transaction은 4 KB 경계를 넘을 수 없어(AXI A3.1.2) 경계 근처에서는 나뉨 |
| **Outstanding** | DMA controller가 동시에 열어 둘 수 있는 transaction 수 |
| **Bus contention** | 같은 Subordinate를 쓰는 다른 master의 영향(3-02) |

## Burst 설정 — STM32H7 DMA

STM32H7 HAL의 DMA stream 설정에서 burst는 `Init.MemBurst`/`Init.PeriphBurst`, 한 beat의 크기는 `Init.MemDataAlignment`/`Init.PeriphDataAlignment`입니다(`Inc/stm32h7xx_hal_dma.h`, 예: `DMA_MBURST_INC4`, `DMA_PDATAALIGN_WORD`).

```c
/* Instance, Request, Direction, Inc 같은 나머지 필드는 대상 칩과 요청에 맞춰 채운다 */
hdma.Init.PeriphDataAlignment = DMA_PDATAALIGN_WORD;   /* 4 byte beat */
hdma.Init.MemDataAlignment    = DMA_MDATAALIGN_WORD;
hdma.Init.FIFOMode            = DMA_FIFOMODE_ENABLE;   /* burst는 FIFO 모드에서만 쓰임 */
hdma.Init.FIFOThreshold       = DMA_FIFO_THRESHOLD_FULL;
hdma.Init.MemBurst            = DMA_MBURST_INC4;       /* 4 beat burst */
if (HAL_DMA_Init(&hdma) != HAL_OK) {
    Error_Handler();
}
```

STM32H7 HAL의 `HAL_DMA_Init()`은 FIFO가 꺼져 있으면 burst 설정을 레지스터에 넣지 않습니다(`stm32h7xx_hal_dma.c` 292~296행 "the Memory burst and peripheral burst are not used when the FIFO is disabled"). beat 4개 × 4 byte = 16 byte가 burst 하나입니다. burst를 키우면 transaction마다 붙는 요청·응답 단계가 더 많은 데이터에 나뉘어 붙습니다. 실제 배수는 버스 구조와 상대 장치에 달려 있고, 이 글에서는 재지 않았습니다.

## STM32H7 MDMA - Master DMA

```c
MDMA_HandleTypeDef hmdma;
hmdma.Init.Request = MDMA_REQUEST_SW;
hmdma.Init.TransferTriggerMode = MDMA_BUFFER_TRANSFER;
hmdma.Init.Priority = MDMA_PRIORITY_HIGH;
hmdma.Init.Endianness = MDMA_LITTLE_ENDIANNESS_PRESERVE;
hmdma.Init.SourceInc = MDMA_SRC_INC_WORD;
hmdma.Init.DestinationInc = MDMA_DEST_INC_WORD;
hmdma.Init.SourceDataSize = MDMA_SRC_DATASIZE_WORD;
hmdma.Init.DestDataSize = MDMA_DEST_DATASIZE_WORD;
hmdma.Init.DataAlignment = MDMA_DATAALIGN_PACKENABLE;
hmdma.Init.BufferTransferLength = 128;   /* buffer transfer 하나의 byte 수 */

/* Instance, SourceBurst·DestBurst 등 나머지 필드와 HAL_MDMA_Init(&hmdma) 생략 */
HAL_MDMA_Start(&hmdma, (uint32_t)src, (uint32_t)dst, len, 1);
```

HAL 헤더 `stm32h7xx_hal_mdma.h` 80~81행은 `BufferTransferLength`를 "한 번의 transfer로 옮길 byte 수(1~128 byte)"로 설명합니다. burst 길이가 아니고, burst는 별도 필드 `SourceBurst`·`DestBurst`가 정합니다. `HAL_MDMA_Start()`의 마지막 두 인자는 `BlockDataLength`와 `BlockCount`입니다(673행).

## Scatter-Gather

흩어진 조각을 하나의 연속 영역으로 모으는 전송입니다. 조각마다 CPU가 다시 설정하는 대신, 조각 정보를 descriptor로 메모리에 두고 DMA controller가 다음 descriptor를 스스로 읽어 이어 갑니다.

```c
typedef struct dma_desc {
    uint32_t src;
    uint32_t dst;
    uint32_t len;
    struct dma_desc *next;   /* NULL = 종료 */
} dma_desc_t;

dma_desc_t descriptors[4] = {
    { .src = 0x1000, .dst = BASE + 0,   .len = 256, .next = &descriptors[1] },
    { .src = 0x4500, .dst = BASE + 256, .len = 512, .next = &descriptors[2] },
    { .src = 0x9100, .dst = BASE + 768, .len = 128, .next = &descriptors[3] },
    { .src = 0xC200, .dst = BASE + 896, .len = 256, .next = NULL },
};
```

이 구조체는 개념을 보이는 예이고, 실제 descriptor 형식은 controller마다 reference manual이 정합니다. STM32H7 MDMA는 HAL에서 `HAL_MDMA_LinkedList_CreateNode()`와 `HAL_MDMA_LinkedList_AddNode()`로 linked list를 만듭니다(`stm32h7xx_hal_mdma.h`). descriptor 자체도 DMA가 메모리에서 읽어 오므로, Cortex-M7에서 descriptor를 cacheable 영역에 두었다면 다 쓴 뒤 clean해야 DMA가 최신 내용을 봅니다(아래 Cache 일관성).

## Double Buffer

```c
/* STM32H7 DMA — Double Buffer mode (interrupt) */
hdma.XferCpltCallback   = rx_half0_done;   /* memory 0 완료 */
hdma.XferM1CpltCallback = rx_half1_done;   /* memory 1 완료 */
HAL_DMAEx_MultiBufferStart_IT(&hdma, src, dst_a, dst_b, len);
```

`HAL_DMA_M0CpltCallback()`·`HAL_DMA_M1CpltCallback()` 같은 weak 함수는 STM32H7 HAL에 없습니다. `DMA_HandleTypeDef`의 함수 포인터 `XferCpltCallback`(148행)과 `XferM1CpltCallback`(152행)을 채우고, 인터럽트 모드는 `HAL_DMAEx_MultiBufferStart_IT()`로 시작합니다(`stm32h7xx_hal_dma_ex.h` 237~238행). 같은 드라이버의 `HAL_DMAEx_MultiBufferStart()`는 첫머리에서 "Memory-to-memory transfer not supported in double buffering mode"라며 memory-to-memory 방향을 거부합니다(`stm32h7xx_hal_dma_ex.c` 129행). double buffer는 주변장치 ↔ 메모리 스트림용입니다.

이득은 단순한 식으로 볼 수 있습니다. buffer 하나를 DMA가 채우는 시간을 T_dma, CPU가 처리하는 시간을 T_cpu라 하면, buffer 하나로는 둘이 번갈아 해야 하므로 buffer당 T_dma + T_cpu가 걸리고, 둘로 겹치면 max(T_dma, T_cpu)가 걸립니다. 둘이 같을 때 최대 2배이고, 한쪽이 훨씬 길면 이득이 거의 없습니다.

## Cache 일관성 - Cortex-M7

### CPU가 buffer write → DMA가 send

```c
fill_data(tx_buf, 256);                  /* CPU가 씀: write-back이면 cache에만 있을 수 있음 */
SCB_CleanDCache_by_Addr(tx_buf, 256);    /* memory로 내보냄 */
HAL_UART_Transmit_DMA(&huart1, tx_buf, 256);
```

### DMA가 buffer fill → CPU가 read

```c
HAL_UART_Receive_DMA(&huart1, rx_buf, 256);
/* DMA complete */
SCB_InvalidateDCache_by_Addr(rx_buf, 256);   /* cache의 옛 line을 버림 */
process(rx_buf);
```

### Misalignment 함정

CMSIS `cachel1_armv7.h`의 주석에 따르면 `SCB_InvalidateDCache_by_Addr()`는 32 byte로 정렬된 주소부터 32 byte 단위로 동작합니다. Cortex-M7의 line도 32 byte입니다(2-05).

```c
SCB_InvalidateDCache_by_Addr(buf, 100);   /* buf가 32 byte 정렬이 아니면 */
```

`buf`가 정렬되지 않았거나 길이가 32의 배수가 아니면, 처음과 마지막 line에 함께 들어 있는 다른 변수까지 버려집니다. CPU가 그 변수에 쓴 값이 아직 memory에 없었다면 그 값이 사라집니다.

```c
__attribute__((aligned(32))) uint8_t buf[128];   /* line 정렬, 길이 32의 배수 */
SCB_InvalidateDCache_by_Addr(buf, 128);           /* 정확히 4 line */
```

## Non-Cacheable Memory 영역

```c
/* MPU로 non-cacheable region 설정 (STM32H7 HAL) */
MPU_Region_InitTypeDef region = {0};
region.Enable           = MPU_REGION_ENABLE;
region.Number           = MPU_REGION_NUMBER0;
region.BaseAddress      = (uint32_t)&__dma_region_start;   /* 링커가 정한 시작 주소 */
region.Size             = MPU_REGION_SIZE_512KB;
region.AccessPermission = MPU_REGION_FULL_ACCESS;
region.TypeExtField     = MPU_TEX_LEVEL1;   /* TEX=001, C=0, B=0: Normal non-cacheable */
region.IsCacheable      = MPU_ACCESS_NOT_CACHEABLE;
region.IsBufferable     = MPU_ACCESS_NOT_BUFFERABLE;
HAL_MPU_ConfigRegion(&region);
```

`MPU_Region_InitTypeDef`의 첫 두 필드는 `Enable`과 `Number`입니다(`stm32h7xx_hal_cortex.h` 47~52행). `{0}`으로 초기화한 채 두면 region이 꺼진 상태로 남습니다. 또 ARMv7-M ARM 표 B3-13에 따르면 TEX·C·B가 모두 0이면 Strongly-ordered이고, Normal non-cacheable은 TEX = 001, C = 0, B = 0이므로 `TypeExtField`를 `MPU_TEX_LEVEL1`(`stm32h7xx_hal_cortex.h` 174행)로 둡니다. ARMv7-M ARM B3.5.3에 따르면 region 크기는 2^N(5 ≤ N ≤ 32) byte이고 시작 주소는 크기에 맞춰 정렬되어야 하며(RegionBaseAddress[(N−1):0] = 0), region이 겹치면 번호가 큰 region이 이깁니다. 이 영역의 buffer는 cache maintenance가 필요 없는 대신 CPU가 읽고 쓸 때도 cache를 쓰지 못합니다.

## DMA Latency

DMA 시작까지의 비용(설정 레지스터 쓰기, 요청 처리)과 완료 통지 비용(인터럽트 진입 등)은 controller와 드라이버에 따라 다르고, 이 글에서는 재지 않았습니다. Cortex-M4의 인터럽트 진입만 해도 wait state 없는 메모리에서 최대 12 cycle입니다(M4 TRM 3.9.1, 3-05). 작은 전송일수록 이 고정 비용의 비중이 커집니다. 손익분기점은 3-04에서 다룹니다.

## Linux dmaengine API

```c
dma_cap_mask_t mask;
dma_cap_zero(mask);
dma_cap_set(DMA_MEMCPY, mask);
struct dma_chan *chan = dma_request_chan_by_mask(&mask);   /* memcpy를 지원하는 channel */
if (IS_ERR(chan))
    return PTR_ERR(chan);
struct dma_async_tx_descriptor *tx;

tx = dmaengine_prep_dma_memcpy(chan, dst, src, len, DMA_PREP_INTERRUPT);
if (!tx)
    return -EIO;   /* channel이 memcpy를 지원하지 않으면 NULL */
tx->callback = dma_done_cb;
dma_cookie_t cookie = dmaengine_submit(tx);
dma_async_issue_pending(chan);

dma_sync_wait(chan, cookie);
```

함수 이름은 Linux 6.12 `include/linux/dmaengine.h`에 있습니다(`dmaengine_prep_dma_memcpy` 1079행, `dmaengine_submit` 1244행, `dma_async_issue_pending` 1450행, `dma_sync_wait` 1515행, `dma_request_chan` 1522행). 주변장치 드라이버가 쓰는 slave DMA 절차는 `Documentation/driver-api/dmaengine/client.rst`에 단계별로 있습니다.

## 전송 방식 비교

| 방식 | CPU가 하는 일 | 완료를 아는 단위 |
|---|---|---|
| **Polling** | 데이터마다 상태 레지스터를 읽고 옮김 | 데이터 하나 |
| **IRQ per byte** | 데이터마다 인터럽트 진입·복귀 | 데이터 하나 |
| **DMA + IRQ** | 설정 한 번, 완료 인터럽트 한 번 | buffer 하나 |
| **DMA chain / double buffer** | buffer가 바뀔 때만 처리 | buffer 하나 |

## 자주 하는 실수

> ⚠️ DMA buffer를 stack에

```c
void send_data(void) {
    uint8_t buf[256];          /* stack */
    fill(buf);
    HAL_UART_Transmit_DMA(&huart, buf, 256);
    return;                    /* DMA가 아직 읽는 중인데 buf의 수명이 끝남 */
}
```

함수가 돌아오면 그 stack 영역은 다음 호출이 덮어씁니다. DMA buffer는 전송이 끝날 때까지 살아 있는 static·전역 영역에 둡니다.

> ⚠️ Cache maintenance 누락

CPU가 쓴 뒤 clean하지 않으면 DMA가 memory의 옛 값을 보내고, DMA가 쓴 뒤 invalidate하지 않으면 CPU가 cache의 옛 값을 읽습니다.

> ⚠️ MPU region 정렬

B3.5.3의 규칙대로 region의 시작 주소는 크기의 배수여야 합니다. 512 KB region을 정렬되지 않은 주소에 두면 의도한 영역과 다른 범위가 덮이므로, 링커 스크립트에서 DMA 영역을 크기에 맞춰 정렬합니다.

## 정리

- AXI burst는 AxLEN + 1 beat이고 4 KB 경계를 넘을 수 없습니다.
- STM32H7 MDMA의 `BufferTransferLength`는 buffer transfer 하나의 byte 수(1~128)이지 burst 길이가 아닙니다.
- STM32H7 double buffer는 `XferCpltCallback`·`XferM1CpltCallback`과 `HAL_DMAEx_MultiBufferStart_IT()`로 쓰고, memory-to-memory는 지원하지 않습니다.
- double buffer의 이득은 T_dma + T_cpu에서 max(T_dma, T_cpu)로 줄어드는 만큼이고, 최대 2배입니다.
- Cortex-M7 DMA buffer는 32 byte 정렬과 clean·invalidate가 필요하고, MPU non-cacheable region은 `Enable`·`Number`를 채우고 크기에 맞춰 정렬해야 합니다.

다음 편은 **DMA vs CPU 손익 분석**을 다룹니다.

## 관련 항목

- [3-02: Bus Contention](/blog/embedded/performance-engineering/part3-02-bus-contention)
- [3-04: DMA vs CPU](/blog/embedded/performance-engineering/part3-04-dma-vs-cpu)

## 참고 자료

- [STM32CubeH7 HAL driver](https://github.com/STMicroelectronics/stm32h7xx-hal-driver) (`stm32h7xx_hal_dma.h`, `_dma_ex.h/.c`, `_mdma.h`, `_cortex.h`)
- ARMv7-M Architecture Reference Manual (DDI 0403E) B3.5.3
- AMBA AXI Protocol Specification (ARM IHI 0022, Issue L) A3.1.1, A3.1.2
- [CMSIS_5 `cachel1_armv7.h`](https://github.com/ARM-software/CMSIS_5/blob/develop/CMSIS/Core/Include/cachel1_armv7.h)
- Linux v6.12 `include/linux/dmaengine.h`, `Documentation/driver-api/dmaengine/client.rst`
