---
title: "Cortex-M7 캐시와 DMA — Cache Line·Write-Back·Clean/Invalidate 순서"
slug: "embedded/modern-recipes/part2-06-arm-cache"
date: 2026-04-11T09:18:00
description: "Cortex-M7 D-cache가 켜진 상태에서 DMA buffer를 깨뜨리지 않는 clean/invalidate 순서, buffer 정렬, MPU non-cacheable 설정."
series: "Modern Embedded Recipes"
seriesOrder: 18
tags: [recipes, arm, cache]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"D-cache가 켜진 Cortex-M7에서 DMA buffer의 cache와 메모리는 소프트웨어가 맞춥니다."** 방향별 clean/invalidate 순서와 32 byte 정렬을 지키거나, buffer를 MPU non-cacheable region에 둡니다.

Normal·Device memory type과 MPU attribute의 기본은 [2-05: ARM 메모리 맵](/blog/embedded/modern-recipes/part2-05-arm-memory-map)에, DMA 전송 방향과 모드는 [4-10: DMA 기초](/blog/embedded/modern-recipes/part4-10-dma-basics)에 있습니다. 이 글의 레지스터와 순서는 [Cortex-M7 TRM DDI 0489F](https://developer.arm.com/documentation/ddi0489/f/), [Cortex-M7 Devices Generic User Guide DUI 0646C](https://developer.arm.com/documentation/dui0646/c/), [CMSIS 5.9.0](https://github.com/ARM-software/CMSIS_5/tree/5.9.0/CMSIS/Core/Include) 기준이며, 2026-10-11에 이 세 자료와 대조했습니다.

## 어떤 상황에서 쓰나

- Cortex-M7에서 D-cache를 처음 enable할 때
- DMA로 받은 buffer에서 새 데이터 대신 이전 값이 보일 때
- DMA로 내보낸 데이터가 CPU가 마지막으로 쓴 값과 다를 때

## 핵심 개념

### Cortex-M7 L1 D-cache

Cortex-M7의 L1은 instruction cache와 data cache로 나뉩니다. 각 cache는 없거나 4·8·16·32·64 KB 중 하나이고, 크기는 칩을 만드는 쪽이 구현 단계에서 고릅니다(TRM 표 1-1). D-cache는 4-way, I-cache는 2-way set associative이고 line은 둘 다 32 byte입니다(TRM 5.9절).

Cache maintenance는 이 line 단위로 동작합니다. 1 byte를 invalidate해도 그 byte가 들어 있는 32 byte line 전체가 대상이 됩니다. 아래 정렬 규칙이 여기서 나옵니다.

### Write-through와 Write-back

TRM 5.9절은 D-cache에 hit한 write를 다음처럼 처리한다고 적습니다.

| 정책 | Write hit 처리 | 메모리가 최신 값을 갖는 시점 |
| --- | --- | --- |
| Write-through | cache RAM에 쓰고 AXIM 버스로도 씀 | write 직후 |
| Write-back | cache RAM에만 쓰고 line을 dirty로 표시 | dirty line이 evict될 때 |

Cortex-M7 기본 메모리 맵에서 SRAM 영역(0x20000000~0x3FFFFFFF)의 cache policy는 Write-Back, Write-Allocate입니다(DUI 0646C 표 2-12). 그래서 MPU를 따로 설정하지 않은 SRAM의 DMA buffer는 CPU가 쓴 값이 메모리에 아직 없을 수 있고, DMA가 메모리에 쓴 값이 cache에는 없을 수 있습니다. DUI 0646C 4.8.5절도 외부 DMA가 바꾼 데이터를 Cortex-M7에 보이게 하는 일을 cache maintenance의 용도로 듭니다.

### Clean과 Invalidate

| 동작 | 효과 | CMSIS 함수 (주소 범위 지정) |
| --- | --- | --- |
| Clean | dirty line을 메모리에 쓰고 line은 cache에 남김 | `SCB_CleanDCache_by_Addr` |
| Invalidate | line을 버림. 다음 read는 메모리에서 다시 가져옴 | `SCB_InvalidateDCache_by_Addr` |
| Clean + Invalidate | clean한 뒤 버림 | `SCB_CleanInvalidateDCache_by_Addr` |

[CMSIS 5.9.0 `cachel1_armv7.h`](https://github.com/ARM-software/CMSIS_5/blob/5.9.0/CMSIS/Core/Include/cachel1_armv7.h)의 세 `_by_Addr` 함수는 시작 주소에 32를 더해 가며 `DCCMVAC`·`DCIMVAC`·`DCCIMVAC` 레지스터에 씁니다. 이 레지스터는 bit[31:5]만 주소로 받으므로(DUI 0646C 표 4-65) 한 번 쓰면 그 주소가 든 line 하나에 적용됩니다. 반복 횟수는 길이에 시작 주소의 line 내 offset을 더해 정하므로, buffer의 마지막 byte가 든 line까지 처리됩니다. 루프 앞뒤에 `__DSB()`가, 끝에 `__ISB()`가 있으므로 호출이 돌아온 뒤 시작하는 DMA는 maintenance가 끝난 메모리를 봅니다.

### DMA 방향별 순서

**Peripheral → memory (DMA가 받고 CPU가 읽음).** Maintenance를 두 번 합니다.

```c
#define RX_LEN 1024u   /* 32의 배수 */
__attribute__((aligned(32))) static uint8_t rx_buffer[RX_LEN];

void rx_start(void)
{
    SCB_CleanInvalidateDCache_by_Addr(rx_buffer, RX_LEN);  /* (1) */
    dma_rx_start(rx_buffer, RX_LEN);
}

void rx_complete(void)   /* DMA 전송 완료 인터럽트에서 호출 */
{
    SCB_InvalidateDCache_by_Addr(rx_buffer, RX_LEN);       /* (2) */
    process(rx_buffer, RX_LEN);
}
```

`dma_rx_start`·`process`는 칩별 DMA 드라이버와 응용 코드가 채우는 자리입니다.

- (1) 시작 전에 buffer 범위의 dirty line을 없앱니다. Write-back line은 evict될 때 메모리에 쓰이므로(TRM 5.9절), dirty line이 남아 있다가 DMA가 메모리에 쓴 뒤 evict되면 DMA가 쓴 데이터를 덮어씁니다.
- (2) 완료 뒤에 다시 invalidate합니다. TRM 5.2절은 "Speculative cache linefills can be initiated to any Cacheable memory address"라고 적고, 드물게는 그 linefill을 일으키는 명령이 없어도 그렇다고 덧붙입니다. 따라서 (1)로 비운 line이 DMA 도중 옛 메모리 값으로 다시 채워지지 않는다는 보장이 없고, 완료 시점에 다시 invalidate해야 CPU가 DMA가 쓴 값을 읽습니다.

**(2)가 막는 문제를 일부러 만들어 보기.** Speculative linefill은 시점을 정할 수 없으므로, 같은 효과를 내는 일반 read를 DMA 도중에 넣습니다. Cacheable 주소의 read miss는 line을 할당합니다(TRM 5.9절, "all cacheable locations are Read-Allocate").

```c
memset(rx_buffer, 0xAA, RX_LEN);
SCB_CleanInvalidateDCache_by_Addr(rx_buffer, RX_LEN);       /* (1) */
dma_rx_start(rx_buffer, RX_LEN);
(void)*(volatile uint8_t *)&rx_buffer[RX_LEN - 32];         /* last line -> cache */
```

DMA는 주소 증가 모드로 두고, 이 read는 DMA가 마지막 line에 쓰기 전에 실행되어야 합니다. 완료 뒤 (2)를 빼고 `rx_buffer[RX_LEN - 32]`~`rx_buffer[RX_LEN - 1]`을 읽으면, 그 line이 그사이 evict되지 않은 한 DMA가 받은 값 대신 0xAA가 나와야 합니다. (2)를 넣으면 받은 값이 나와야 합니다.

**Memory → peripheral (CPU가 채우고 DMA가 내보냄).** 시작 전에 clean을 한 번 합니다.

```c
#define TX_LEN 256u    /* 32의 배수 */
__attribute__((aligned(32))) static uint8_t tx_buffer[TX_LEN];

fill_buffer(tx_buffer, TX_LEN);
SCB_CleanDCache_by_Addr(tx_buffer, TX_LEN);
dma_tx_start(tx_buffer, TX_LEN);
```

DMA는 메모리를 읽으므로 CPU가 쓴 값이 dirty line에만 있으면 옛 값을 내보냅니다. Clean이 그 값을 메모리로 내립니다.

### Buffer 정렬

`_by_Addr` 함수는 buffer의 첫 line과 마지막 line 전체를 처리합니다. 시작 주소를 `a`, 길이를 `n`이라 하면 buffer 밖인데 함께 처리되는 byte는 앞쪽 `a mod 32`개와 뒤쪽 `(32 − (a + n) mod 32) mod 32`개이고, 합해서 최대 62 byte입니다. 이 byte에 다른 변수가 있으면 두 방향으로 깨집니다.

- (2)의 invalidate가 그 변수에 CPU가 써 둔 dirty 값을 버립니다.
- DMA 도중 CPU가 그 변수에 쓰면 Write-Allocate로 line이 cache에 들어오고, buffer 쪽 byte는 옛 메모리 값을 담은 채 line 전체가 dirty가 됩니다. 이 line이 (2) 전에 evict되면 DMA가 쓴 데이터를 옛 값으로 덮어쓰고, (2)까지 남아 있으면 (2)가 그 변수의 새 값을 버립니다.

그래서 시작 주소를 32 byte로 정렬하고 길이를 32의 배수로 잡아 두 값을 모두 0으로 만듭니다. 위 예의 1024 byte는 line 32개입니다.

정렬을 직접 정할 수 없을 때는 다음처럼 처리합니다.

- **라이브러리나 HAL이 잡은 buffer.** DMA는 직접 정렬한 bounce buffer로 받고, (2)를 거친 뒤 라이브러리 buffer로 복사합니다. 또는 그 buffer가 든 section을 아래 non-cacheable region에 배치합니다.
- **길이가 매번 다른 수신.** Buffer는 최대 길이를 32의 배수로 올려 잡고, maintenance는 받은 길이가 아니라 할당한 전체 길이로 합니다. 할당 범위 전체가 이 buffer만의 line이므로 남는 byte를 invalidate해도 다른 변수가 다치지 않습니다.

### Cache enable

Reset 직후 CCR 값은 0x00040200으로 DC(bit 16)와 IC(bit 17)가 0, 즉 두 cache가 모두 꺼져 있습니다(TRM 표 3-1, CMSIS `SCB_CCR_DC_Pos`·`SCB_CCR_IC_Pos`). TRM 4.1.3절은 enable 전에 cache를 invalidate하지 않으면 동작이 UNPREDICTABLE이라고 적습니다. CMSIS 5.9.0의 `SCB_EnableICache()`·`SCB_EnableDCache()`는 cache 전체를 invalidate한 뒤 CCR 비트를 세우고 `__DSB()`·`__ISB()`를 실행하므로 이 요구를 함께 처리합니다.

## 코드 / 실제 사용 예

### MPU non-cacheable region

DMA buffer를 cacheable 영역에 두지 않으면 maintenance 호출이 필요 없습니다. Non-cacheable 주소의 access는 cache를 거치지 않고 AXIM 버스로 가고(TRM 5.9절), speculative linefill도 일어나지 않습니다(TRM 5.2절).

```c
/* 0x20020000..0x2002FFFF: Normal, non-cacheable (example address) */
MPU->RNR  = 1;
MPU->RBAR = 0x20020000;                     /* 64 KB aligned */
MPU->RASR = (1u << MPU_RASR_XN_Pos)         /* execute never */
          | (3u << MPU_RASR_AP_Pos)         /* AP=011 full access */
          | (1u << MPU_RASR_TEX_Pos)        /* TEX=001, C=0, B=0 */
          | (15u << MPU_RASR_SIZE_Pos)      /* 2^(15+1) = 64 KB */
          | MPU_RASR_ENABLE_Msk;
ARM_MPU_Enable(MPU_CTRL_PRIVDEFENA_Msk);
```

각 필드의 근거는 DUI 0646C입니다.

- TEX=001, C=0, B=0은 "Normal, Outer and inner noncacheable"입니다(표 4-55).
- Region 크기는 2^(SIZE+1) byte이므로 SIZE=15가 64 KB입니다(4.6.5절 SIZE field values).
- AP=011은 privileged·unprivileged 모두 RW입니다(표 4-57). AP를 설정하지 않으면 000이고, 이때는 모든 접근이 permission fault입니다.

[CMSIS 5.9.0 `mpu_armv7.h`](https://github.com/ARM-software/CMSIS_5/blob/5.9.0/CMSIS/Core/Include/mpu_armv7.h)의 `ARM_MPU_Enable`은 `__DMB()` 뒤 `MPU->CTRL`에 enable 비트를 쓰고, `SCB->SHCSR`의 MEMFAULTENA를 세운 다음 `__DSB()`·`__ISB()`를 실행합니다. Handler가 enable되지 않은 fault는 HardFault로 escalate되므로(DUI 0646C 2.4.2절), 이 함수로 켜면 AP 설정 실수 같은 permission fault가 MemManage handler로 갑니다. 다만 같은 절의 다른 escalation 조건은 그대로라, MemManage와 우선순위가 같거나 높은 exception handler 안에서 fault가 나면 여전히 HardFault가 됩니다.

설정이 들어갔는지는 `MPU->RNR = 1` 뒤 `MPU->RASR`를 읽어 쓴 값과 같은지, `MPU->CTRL`의 bit 0(ENABLE)이 1인지로 확인합니다.

**DMA 시작 전 barrier.** Non-cacheable buffer에 CPU가 쓴 값과 DMA를 시작하는 peripheral 레지스터 write는 서로 다른 버스 인터페이스로 나갈 수 있습니다. TRM 5.1절은 다른 인터페이스 사이의 순서가 barrier 명령 없이는 보장되지 않는다고 적고, TRM 5.9.2절의 store buffer는 write를 cache RAM이나 AXIM으로 보내기 전에 담아 둡니다. Maintenance 함수를 부르지 않으면 그 안의 `__DSB()`도 없으므로, DMA 시작 직전에 `__DSB()`를 직접 넣습니다. DSB는 앞선 explicit memory access가 모두 끝나야 완료됩니다(DUI 0646C 3.12.5절).

```c
fill_buffer(nc_tx_buffer, TX_LEN);   /* nc_tx_buffer: inside the MPU region */
__DSB();
dma_tx_start(nc_tx_buffer, TX_LEN);
```

### 두 방법 중 고르기

- **Maintenance 비용.** `_by_Addr` 호출은 line마다 레지스터 write 한 번입니다. 1024 byte 수신이면 (1)에서 32번, (2)에서 32번으로 전송마다 64번이고, buffer 길이에 비례합니다. CPU가 buffer를 몇 번 읽든 이 횟수는 같습니다.
- **Non-cacheable 비용.** CPU의 load·store가 모두 AXIM 접근이 됩니다(TRM 5.9절). 비용은 CPU가 buffer에 접근하는 횟수에 비례하고, 같은 line을 다시 읽어도 cache hit가 없습니다.

따라서 CPU가 받은 데이터를 여러 번 읽거나 byte 단위로 훑는 buffer는 cacheable + maintenance가, CPU가 거의 만지지 않고 DMA끼리 넘기는 buffer는 non-cacheable이 비용 구조에 맞습니다.

### 중간 선택지

- **Write-through region.** TEX=000, C=1, B=0은 "Outer and inner write-through. No Write-Allocate"입니다(DUI 0646C 표 4-55). Write hit도 AXIM으로 나가므로(TRM 5.9절) dirty line이 생기지 않고, 송신 전 clean과 (1)이 막던 dirty line 덮어쓰기가 필요 없어집니다. 읽기는 여전히 cache되고 speculative linefill 대상이므로 수신 완료 뒤 (2)는 그대로 필요하고, store buffer 때문에 DMA 시작 전 `__DSB()`도 남습니다.
- **DTCM.** TCM 접근은 cache controller를 거치지 않습니다(TRM 5.9절). Cortex-M7의 AHBS 인터페이스가 TCM에 대한 DMA 접근을 제공하므로(TRM 1.1절), 칩이 DMA를 AHBS에 연결해 두었다면 DTCM에 둔 buffer는 maintenance 없이 씁니다. CPU의 DTCM write와 DMA 레지스터 write도 다른 인터페이스이므로 위 barrier는 필요합니다.

## 자주 보는 함정

> ⚠️ 시작 전에만 invalidate하고 완료 뒤 invalidate를 생략

[DMA 방향별 순서](#dma-방향별-순서)의 (2)가 빠진 경우입니다. 증상은 같은 절의 재현 코드처럼 일부 line만 옛 값으로 보이는 것입니다.

> ⚠️ DMA buffer가 다른 변수와 cache line을 공유

[Buffer 정렬](#buffer-정렬)의 두 방향 손상이 생깁니다.

> ⚠️ "non-cacheable"이라며 B 비트만 세움

DUI 0646C 표 4-55에서 TEX=000, C=0, B=1은 Device(Shareable)이고, TEX=001, C=0, B=1은 Reserved encoding입니다. Normal, non-cacheable은 TEX=001, C=0, B=0입니다.

## 정리

- D-cache가 켜진 SRAM buffer는 수신 전후 두 번, 송신 전 한 번 maintenance합니다. 수신 완료 뒤 invalidate는 생략하지 않습니다.
- Buffer는 32 byte 정렬과 32의 배수 길이로 다른 변수와 line을 나누지 않게 하고, 정렬을 정할 수 없으면 bounce buffer를 둡니다.
- CPU가 거의 읽지 않는 buffer는 MPU non-cacheable region이나 DMA가 닿는 DTCM에 두고, DMA 시작 전에 `__DSB()`를 넣습니다.

다음 편에서는 **MPU 활용**을 다룹니다. region 설정, attribute, fault 분석입니다.

## 관련 항목

- [2-05: ARM 메모리 맵](/blog/embedded/modern-recipes/part2-05-arm-memory-map)
- [2-07: MPU 활용](/blog/embedded/modern-recipes/part2-07-arm-mpu)
- [2-10: Memory Barrier 실전](/blog/embedded/modern-recipes/part2-10-memory-barrier) — self-modifying code 뒤 I-cache invalidate 포함
- [4-10: DMA 기초](/blog/embedded/modern-recipes/part4-10-dma-basics)
- 더 깊이 — [Embedded Performance Engineering: CPU Cache 기초](/blog/embedded/performance-engineering/part2-05-cache-basics)
