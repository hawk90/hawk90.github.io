---
title: "Cache Line 최적화 — Alignment·Prefetch·False Sharing 처리"
slug: "embedded/performance-engineering/part2-07-cache-line"
date: 2026-04-24T09:06:00
description: "코어별 cache line 크기를 확인하고, M2 Pro에서 false sharing 거리·SoA/AoS를 측정하며, prefetch·non-temporal·DMA maintenance를 TRM과 CMSIS로 정리합니다."
series: "Embedded Performance Engineering"
seriesOrder: 15
tags: [cache, line, alignment, prefetch, false-sharing]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Cache line 활용 = spatial locality 활용"**입니다. 한 번 fetch한 line 안에서 최대한 많은 일을 처리합니다.

## Cache Line 크기

line 크기는 코어마다 다르므로 하나의 상수로 고정하지 않습니다.

| 대상 | line 크기 | 출처 |
|---|---|---|
| Cortex-M7 L1 I·D | 32 byte | M7 TRM(DDI 0489D) 3.3.4 CCSIDR `LineSize` |
| Cortex-A53 L1 I·D, L2 | 64 byte | A53 TRM(DDI 0500E) 6.1, 2.1.7 |
| Apple M2 Pro | 128 byte | `sysctl hw.cachelinesize` |

C++17의 `std::hardware_destructive_interference_size`는 이 표와 다를 수 있습니다. Apple clang 21(libc++)과 Debian GCC 14.2 모두 256을 돌려주었습니다(2-06). 런타임에 정확한 값이 필요하면 Arm에서는 CCSIDR·CTR 같은 시스템 레지스터나 OS가 주는 값(macOS의 `hw.cachelinesize`, Linux의 `/sys/devices/system/cpu/cpu0/cache/`)을 읽습니다.

## 측정 — False Sharing

두 thread가 각자 자기 카운터를 1억 번 `atomic_fetch_add`(relaxed) 합니다. 두 카운터 사이의 거리만 바꿨습니다(`bench/cl/fs.c`, `clang -O2`, M2 Pro, 각 3회).

| 두 카운터의 거리 | 시간 (3회) |
|---:|---|
| 8 byte | 1.160, 1.192, 1.179 s |
| 64 byte | 0.431, 0.313, 0.562 s |
| 128 byte | 0.205, 0.207, 0.208 s |
| 256 byte | 0.206, 0.209, 0.209 s |

두 thread는 서로의 값을 한 번도 읽지 않지만, 같은 line에 있으면 한 쪽이 쓸 때마다 다른 쪽 코어의 그 line이 무효화되어 5.7배 느려집니다. 64 byte 떨어뜨려도 아직 느리고 128 byte에서 멈춥니다. M2 Pro의 line이 128 byte이기 때문이고, 64 byte line을 가정한 `alignas(64)` padding은 이 코어에서 부족합니다.

```c
struct counters {
    _Alignas(128) atomic_long producer_count;   /* line 크기 이상 떨어뜨림 */
    _Alignas(128) atomic_long consumer_count;
};
```

![64-byte cache line의 세 가지 배치 — 섞임/분리/false sharing](/images/blog/perf-eng/diagrams/part2-07-cache-line-layout.svg)

그림은 64 byte line 기준입니다. line 크기가 다른 코어에서는 위 표의 값으로 바꿔 읽습니다.

## Alignment

```c
struct __attribute__((aligned(64))) hot_data {
    uint32_t counter;
    uint32_t flag;
};

alignas(64) uint32_t buffer[256];   /* C11 <stdalign.h>, C++11 */
```

DMA buffer라면 정렬 단위를 cache maintenance 단위에 맞춥니다. Cortex-M7의 `SCB_InvalidateDCache_by_Addr()`는 32 byte로 정렬된 주소부터 32 byte 단위로 동작하므로(CMSIS `cachel1_armv7.h` 주석), buffer의 시작 주소와 크기를 32 byte 배수로 둡니다.

## Hot-Cold Splitting

```c
struct guest {                /* sizeof = 396 */
    int id;
    int active;
    char address[256];        /* 드물게 사용 */
    char email[128];          /* 드물게 */
    int last_login;           /* hot */
};

struct guest_hot {            /* sizeof = 12 */
    int id;
    int active;
    int last_login;
};
```

M2 Pro clang에서 `struct guest`는 396 byte, `struct guest_hot`은 12 byte였습니다(`bench/cl/sz.c`). hot 필드 셋만 도는 루프는 `guest` 배열에서 원소마다 line 하나 이상을 가져오지만, `guest_hot` 배열에서는 128 byte line 하나에 10개 남짓이 들어갑니다.

## SoA vs AoS

```c
/* AoS — Array of Structures */
struct particle { float x, y, z, vx, vy, vz, mass; } parts[N];
for (i = 0; i < N; i++) parts[i].x += parts[i].vx * dt;

/* SoA — Structure of Arrays */
float x[N], vx[N];
for (i = 0; i < N; i++) x[i] += vx[i] * dt;
```

M2 Pro에서 입자 400만 개를 20번 갱신했습니다(`bench/cl/soa.c`, `clang -O2`, 각 3회).

| 배치 | 입자당 시간 (3회) |
|---|---|
| AoS (`sizeof` 28 byte) | 0.61, 0.60, 0.60 ns |
| SoA | 0.14, 0.15, 0.14 ns |

AoS는 `x`와 `vx` 8 byte를 쓰려고 입자마다 28 byte를 끌어오고, SoA는 쓰는 8 byte만 가져옵니다. SoA에서는 연속한 `x` 네 개를 128비트 벡터 하나로 읽을 수 있어 벡터화도 쉬워집니다(2-09). 반대로 한 입자의 여러 필드를 함께 쓰거나 무작위로 한 입자씩 접근한다면, 필드가 한 line에 모인 AoS가 line을 덜 가져옵니다.

## Software Prefetch

```c
for (i = 0; i < N; i++) {
    __builtin_prefetch(&data[i + 8], 0 /* read */, 0 /* no temporal locality */);
    process(data[i]);
}
```

GCC 14.2 매뉴얼의 정의입니다.

| 인자 | 의미 |
|---|---|
| addr | prefetch할 주소 |
| rw | 0 = 읽기(기본값), 1 = 쓰기 준비 |
| locality | 0~3의 컴파일 타임 상수. 0 = temporal locality 없음, 3 = 높음(기본값) |

같은 매뉴얼은 대상이 data prefetch를 지원하지 않으면 주소 식의 부작용만 평가하고 다른 코드는 만들지 않으며 경고도 내지 않는다고 적습니다. Armv7-M에는 `PLD`와 `PLI`가 있고(ARMv7-M ARM A7.7.93~A7.7.97), `arm-none-eabi-gcc` 16.2는 Cortex-M4·M7 모두에 `pld [r0, #64]`를 냈습니다(2-06). 거리는 2-06에서처럼 바꿔 가며 재서 정합니다. 그 측정에서 무작위 gather의 이득은 최대 7%였습니다.

## Hardware Prefetcher와 예측기 제어

Cortex-M7의 `CCR.BP`(bit 18)는 ARMv7-M ARM B3.2.8에 따르면 branch prediction(program flow prediction) 활성화 비트이고 data prefetch와는 무관합니다. M7은 ACTLR(TRM 3.3.1)의 `DISBTACREAD`로 BTAC를 끄고 static 예측만 쓰게 할 수도 있습니다. Cortex-A53의 L1 data prefetch engine(TRM 6.1)을 조정하는 비트는 CPUACTLR_EL1(TRM 4.3.78)에 있습니다.

## Streaming Access — Non-Temporal

한 번 쓰고 다시 읽지 않는 큰 buffer는 캐시에 남겨 둘 이유가 없습니다. AArch64에는 non-temporal 힌트가 붙은 pair load/store `LDNP`·`STNP`가 있습니다. Cortex-A53 TRM 6.6.3에 따르면 A53에서 `LDNP`의 cache 요청은 L2에만 할당되고, 다른 line보다 일찍 교체되기 쉬운 정책을 받습니다. 같은 TRM의 CPUACTLR_EL1 `DTAH` 비트를 1로 두면 `LDNP`·`STNP`가 일반 `LDP`·`STP`와 똑같이 동작합니다.

clang에는 `__builtin_nontemporal_store()`가 있지만, `float` 하나를 저장하는 함수에 쓰자 `clang -O2`(arm64)는 평범한 `str s0, [x0, x1, lsl #2]`를 냈습니다(`bench/cl/nt.c`). 힌트가 실제 명령으로 바뀌는지는 생성된 코드에서 확인합니다.

## Cache Line Pad — Producer/Consumer Queue

```c
#define LINE 128   /* M2 Pro. Cortex-A53은 64 */

struct spsc_queue {
    _Alignas(LINE) atomic_size_t head;   /* producer만 씀 */
    _Alignas(LINE) atomic_size_t tail;   /* consumer만 씀 */
    _Alignas(LINE) uint32_t data[CAPACITY];
};
```

`_Alignas(LINE)`만으로 다음 멤버가 다음 line에서 시작하므로 별도의 `pad[]` 배열은 필요 없습니다. 위 false sharing 측정처럼 producer와 consumer가 다른 코어에서 돌 때 의미가 있습니다.

## Cache Maintenance — DMA·Coherence

```c
/* Cortex-M7 + DMA receive */
__attribute__((aligned(32))) uint8_t dma_buf[256];

HAL_UART_Receive_DMA(&huart, dma_buf, 256);
/* ... DMA 완료 후: DMA는 memory에 썼고 CPU cache에는 옛 값이 있을 수 있음 */
SCB_InvalidateDCache_by_Addr((uint32_t *)dma_buf, 256);
process(dma_buf);
```

```c
/* DMA transmit: CPU가 쓴 내용을 memory로 내보낸 뒤 DMA 시작 */
fill_data(dma_buf);
SCB_CleanDCache_by_Addr((uint32_t *)dma_buf, 256);
HAL_UART_Transmit_DMA(&huart, dma_buf, 256);
```

| 함수 (CMSIS) | 동작 |
|---|---|
| `SCB_CleanDCache_by_Addr` | dirty line을 memory에 씀 |
| `SCB_InvalidateDCache_by_Addr` | line을 버림 |
| `SCB_CleanInvalidateDCache_by_Addr` | 쓰고 버림 |

이 코드는 보드에서 실행하지 않았습니다. 함수 이름과 32 byte 단위 동작은 CMSIS_5 `cachel1_armv7.h`에서 확인했습니다.

## Hot Path 정렬

```c
__attribute__((hot))  void critical_function(void) { /* ... */ }
__attribute__((cold)) void error_handler(void)     { /* ... */ }
```

GCC 14.2 매뉴얼에 따르면 `hot` 함수는 더 적극적으로 최적화되고, 많은 대상에서 text section의 별도 subsection에 모여 locality가 좋아집니다. `cold` 함수는 속도 대신 크기로 최적화되고 따로 모입니다. 손으로 표시하는 대신 PGO(1-08)를 쓰면 실제 실행 분포로 같은 결정을 합니다.

## 자주 하는 실수

> ⚠️ 구조체 padding을 짐작

```c
struct thing {
    char flag;
    int value;
    char name[3];
};
```

M2 Pro clang에서 이 구조체의 `sizeof`는 12였습니다(`bench/cl/sz.c`). `value`를 4 byte 경계에 맞추느라 `flag` 뒤에 3 byte, 끝에 1 byte가 들어갑니다. 필드를 큰 것부터 나열하면 줄어듭니다. 실제 배치는 `sizeof`·`offsetof`나 컴파일러의 `-Wpadded` 경고로 확인합니다.

> ⚠️ 64 byte line을 가정한 padding

위 측정에서 64 byte padding은 M2 Pro의 false sharing을 다 없애지 못했습니다. padding 크기는 대상 코어의 line 크기로 정합니다.

> ⚠️ `volatile` + cache line padding

`volatile`은 컴파일러가 접근을 지우거나 합치지 못하게 할 뿐이고, false sharing은 하드웨어 coherence 문제입니다. 서로 다른 문제입니다.

> ⚠️ SoA를 모든 경우에 사용

한 객체의 여러 필드를 함께 쓰거나 무작위 접근이 많으면 AoS가 line을 덜 가져옵니다. 접근 패턴을 보고 고릅니다.

## 정리

- line 크기는 Cortex-M7 32 B, Cortex-A53 64 B, M2 Pro 128 B입니다. `hardware_destructive_interference_size`는 두 toolchain 모두 256이었습니다.
- M2 Pro에서 같은 line의 두 카운터는 5.7배 느렸고, 64 byte 간격으로는 부족했으며 128 byte에서 멈췄습니다.
- M2 Pro에서 SoA는 AoS보다 4배 빨랐습니다(0.14 대 0.60 ns/입자). 쓰는 필드만 가져오기 때문입니다.
- A53의 `LDNP`는 L2에만 할당됩니다. clang의 non-temporal builtin이 실제로 `stnp`가 되는지는 코드를 보고 확인합니다.
- Cortex-M7 DMA buffer는 32 byte 정렬·32 byte 배수 크기로 두고 clean·invalidate합니다.

다음 편은 **Memory Bandwidth**입니다.

## 관련 항목

- [2-06: Cache Miss](/blog/embedded/performance-engineering/part2-06-cache-miss)
- [2-08: Memory Bandwidth](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)

## 참고 자료

- Cortex-M7 Technical Reference Manual (DDI 0489D) 3.3.1, 3.3.4
- Cortex-A53 MPCore Technical Reference Manual (DDI 0500E) 2.1.7, 4.3.78, 6.1, 6.6.3
- ARMv7-M Architecture Reference Manual (DDI 0403E) A7.7.93~A7.7.97, B3.2.8
- [GCC 14.2 Other Builtins](https://gcc.gnu.org/onlinedocs/gcc-14.2.0/gcc/Other-Builtins.html), [Common Function Attributes](https://gcc.gnu.org/onlinedocs/gcc-14.2.0/gcc/Common-Function-Attributes.html)
- [CMSIS_5 `cachel1_armv7.h`](https://github.com/ARM-software/CMSIS_5/blob/develop/CMSIS/Core/Include/cachel1_armv7.h)
