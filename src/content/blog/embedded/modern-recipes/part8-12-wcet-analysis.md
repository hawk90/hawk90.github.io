---
title: "WCET 분석 기법 — Static·Measurement·Hybrid 방법론"
slug: "embedded/modern-recipes/part8-12-wcet-analysis"
date: 2026-04-17T09:11:00
description: "WCET와 ACET의 차이, 측정 기반과 static analysis, cache 영향, hard real-time 요구사항을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 100
tags: [recipes, performance, wcet]
topics: ["embedded"]
---

## 한 줄 요약

> **"WCET는 *최악*의 실행 시간입니다."** 평균이 아니라 최악이 마감 안에 들어와야 hard real-time이 성립합니다. 이 글은 같은 600 byte 입력이라도 내용에 따라 실행 경로가 달라진다는 것을 보여 줍니다. 같은 입력·같은 조건(`\xff`, hot cache)을 2,000번씩 잰 최댓값도 실행마다 583 ns에서 16,208 ns까지 흔들렸습니다. 그래서 측정만으로는 상한을 증명할 수 없습니다.

## 어떤 상황에서 쓰나

브레이크 제어, 투약 펌프, 비행 제어처럼 마감을 한 번 놓치면 위험한 시스템은 평균 실행 시간(ACET)이 아니라 실행 시간의 상한이 필요합니다. 출근길이 평균 30분이어도 중요한 회의가 있는 날은 사고·공사까지 감안한 최악의 시간으로 집을 나서는 것과 같습니다.

soft real-time 시스템에서도 "얼마나 느려질 수 있는가"를 알아야 jitter 허용치와 큐 크기를 정할 수 있습니다.

## 핵심 개념

| 약어 | 의미 |
| --- | --- |
| BCET | Best-Case Execution Time |
| ACET | Average-Case Execution Time |
| WCET | Worst-Case Execution Time |

WCET를 얻는 방법은 두 갈래입니다.

- **측정 기반** — 여러 입력·상태로 실행해 관측된 최댓값에 여유를 더합니다. 관측된 최댓값은 상한이 아니라 하한입니다. 측정하지 않은 경로와 상태가 더 느릴 수 있습니다.
- **정적 분석** — 실행 파일의 제어 흐름과 프로세서 모델(cache·pipeline)로 상한을 계산합니다. AbsInt는 자사 aiT를 "statically compute tight upper bounds for the worst-case execution time (WCET) of tasks"이며 "directly analyze binary executables and take the intrinsic cache and pipeline behavior into account"한다고 설명합니다. 같은 회사의 TimeWeaver는 정적 경로 분석과 실행 trace를 합친 hybrid 방식이고, 정적 분석만으로 예측하기 어려운 고성능 프로세서를 대상으로 한다고 적습니다(absint.com 제품 페이지).

실행 시간을 늘리는 요인은 네 가지로 나눠 봅니다.

| 요인 | 무엇이 달라지나 |
| --- | --- |
| 분기 | 입력에 따라 다른 경로를 탐 |
| 반복 | 반복 횟수가 입력에 따라 달라짐 |
| cache·memory | 같은 코드도 cache 상태에 따라 접근 시간이 다름 |
| interrupt·선점 | 다른 interrupt나 task가 끼어들어 시간이 늘고, cache 내용도 바뀜 |

## 코드 / 실제 사용 예

### 실험 대상 — 입력에 따라 경로가 달라지는 함수

`unescape()`는 `\n`과 `\xHH`를 풀어 쓰는 작은 parser입니다. 입력 길이가 같아도 escape가 얼마나 섞였는지에 따라 반복 안의 경로가 달라집니다.

```c
/* parse.h */
/* unescape a C-like string: "\\n" -> newline, "\\xHH" -> byte; returns output length */
static int unescape(const char *s, char *out)
{
    int n = 0;
    while (*s) {
        if (*s != '\\') { out[n++] = *s++; continue; }
        s++;
        if (*s == 'n') { out[n++] = '\n'; s++; }
        else if (*s == 'x') {
            int v = 0;
            for (int k = 0; k < 2 && *++s; k++)
                v = v * 16 + (*s <= '9' ? *s - '0' : (*s | 32) - 'a' + 10);
            out[n++] = (char)v;
            if (*s) s++;
        } else if (*s) out[n++] = *s++;
    }
    return n;
}
```

### 경로 길이 — QEMU에서 명령 수 세기

QEMU `mps2-an385`(Cortex-M3)를 `-icount shift=0`으로 돌리면 guest 명령 하나가 가상 시간 1 ns이므로, 25 MHz CMSDK TIMER0의 한 tick이 명령 40개입니다([8-01](/blog/embedded/modern-recipes/part8-01-dynamic-memory#공통-머리말)과 같은 방법). 같은 길이(600 byte)의 세 입력으로 `unescape()`의 명령 수를 셌습니다. 같은 프로그램에서 Cortex-M의 cycle counter인 DWT `CYCCNT`도 켜 봤습니다. `bm.h`·`startup_bm.c`·`link-an385.ld`는 [8-02의 재현 환경](/blog/embedded/modern-recipes/part8-02-memory-alignment#재현-환경)과 같습니다.

```c
/* path length of unescape() for three 600-byte inputs, and whether DWT->CYCCNT counts on QEMU */
#include "bm.h"
#include "parse.h"

#define T0_CTRL  (*(volatile uint32_t *)0x40000000)
#define T0_VALUE (*(volatile uint32_t *)0x40000004)
#define T0_RELOAD (*(volatile uint32_t *)0x40000008)
#define DEMCR    (*(volatile uint32_t *)0xE000EDFC)
#define DWT_CTRL (*(volatile uint32_t *)0xE0001000)
#define DWT_CYCCNT (*(volatile uint32_t *)0xE0001004)

static char out[1024];

static unsigned insns(const char *s)          /* 25 MHz timer, -icount shift=0: 1 tick = 40 insns */
{
    uint32_t a = T0_VALUE;
    unescape(s, out);
    uint32_t b = T0_VALUE;
    return (a - b) * 40u;
}

int main(void)
{
    DEMCR |= 1u << 24;                        /* TRCENA */
    DWT_CYCCNT = 0;
    DWT_CTRL |= 1u;                           /* CYCCNTENA */
    T0_RELOAD = 0xffffffffu; T0_VALUE = 0xffffffffu; T0_CTRL = 1;

    static char nominal[601], worst[601], newline[601];   /* 600 input bytes each */
    for (int i = 0; i < 600; i++) nominal[i] = 'a' + i % 26;
    for (int i = 0; i < 600; i += 4) { worst[i] = '\\'; worst[i + 1] = 'x'; worst[i + 2] = 'f'; worst[i + 3] = 'f'; }
    for (int i = 0; i < 600; i += 2) { newline[i] = '\\'; newline[i + 1] = 'n'; }

    puts_("600 plain bytes       : "); putu(insns(nominal)); puts_(" insns\n");
    puts_("300 x \\n escapes     : "); putu(insns(newline)); puts_(" insns\n");
    puts_("150 x \\xff escapes   : "); putu(insns(worst)); puts_(" insns\n");
    uint32_t c0 = DWT_CYCCNT;
    for (volatile int i = 0; i < 1000; i++) { }
    puts_("DWT->CYCCNT after a 1000-iteration loop: "); putu(DWT_CYCCNT - c0); puts_("\n");
    exit_();
}
```

```bash
#!/bin/bash
CF="-O2 -g -ffreestanding -nostdlib -fno-builtin -mthumb -mcpu=cortex-m3"
arm-none-eabi-gcc $CF -T link-an385.ld -o wcet.elf startup_bm.c wcet_qemu.c -lgcc
timeout 10 qemu-system-arm -M mps2-an385 -nographic -semihosting -icount shift=0 -kernel wcet.elf
```

```text
600 plain bytes       : 4840 insns
300 x \n escapes     : 3320 insns
150 x \xff escapes   : 5400 insns
DWT->CYCCNT after a 1000-iteration loop: 0
```

- **입력 길이가 같아도 경로 길이가 달랐습니다.** `\n` 300개는 3,320 명령, 평범한 문자 600개는 4,840 명령, `\xff` 150개는 5,400 명령이었습니다(해상도 40 명령). 이 함수의 최악 입력은 "가장 긴 입력"이 아니라 "가장 비싼 분기를 가장 많이 타는 입력"입니다.
- **QEMU에서 DWT `CYCCNT`는 0이었습니다.** 켜는 순서(DEMCR.TRCENA → `CYCCNT` = 0 → DWT_CTRL.CYCCNTENA)를 따랐지만 값이 늘지 않았습니다. QEMU의 명령 수는 사이클이 아니고(QEMU 문서: "does not provide cycle accurate emulation"), DWT로 사이클을 재는 측정은 실제 보드에서 합니다.

### 실행 시간 분포 — cache 상태와 관측 최댓값

같은 함수를 Apple M2 Pro에서 2,000번씩 재고, "cold cache" 쪽은 매번 64 MiB를 훑어 cache를 밀어낸 뒤 쟀습니다. 시계는 `mach_absolute_time()`(해상도 41.7 ns)입니다. `__asm__ volatile("" ::: "memory")`와 `noinline`은 컴파일러가 측정 대상 호출을 시계 읽기 밖으로 옮기지 못하게 합니다. 이 장치 없이 처음 잰 값은 중앙값이 0 ns로 나왔습니다.

```c
/* observed execution time of unescape(): hot vs cold cache, median vs maximum */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <mach/mach_time.h>
#include "parse.h"

__attribute__((noinline)) static int unescape_noinline(const char *s, char *o) { return unescape(s, o); }

#define RUNS 2000
static char out[1024], nominal[601], worst[601];
static char *evict;                               /* 64 MiB, streamed to push data out of the caches */
static volatile char sink;

static double tick_ns;                            /* mach_absolute_time tick in ns (macOS) */
static double now_ns(void) { return mach_absolute_time() * tick_ns; }
static int cmp(const void *a, const void *b) { double x = *(const double *)a, y = *(const double *)b; return (x > y) - (x < y); }

static void series(const char *name, const char *in, int cold)
{
    static double t[RUNS];
    for (int r = 0; r < RUNS; r++) {
        if (cold) for (size_t i = 0; i < (64u << 20); i += 64) sink += evict[i];
        __asm__ volatile("" ::: "memory");
        double t0 = now_ns();
        __asm__ volatile("" ::: "memory");
        sink += (char)unescape_noinline(in, out);
        __asm__ volatile("" ::: "memory");
        t[r] = now_ns() - t0;
    }
    qsort(t, RUNS, sizeof t[0], cmp);
    printf("%-22s median %6.0f ns  p99 %6.0f ns  max %7.0f ns\n", name, t[RUNS / 2], t[RUNS * 99 / 100], t[RUNS - 1]);
}

int main(void)
{
    mach_timebase_info_data_t tb;
    mach_timebase_info(&tb);
    tick_ns = (double)tb.numer / tb.denom;
    printf("timer resolution %.1f ns\n", tick_ns);
    evict = malloc(64u << 20);
    memset(evict, 1, 64u << 20);
    for (int i = 0; i < 600; i++) nominal[i] = 'a' + i % 26;
    for (int i = 0; i < 600; i += 4) { worst[i] = '\\'; worst[i + 1] = 'x'; worst[i + 2] = 'f'; worst[i + 3] = 'f'; }
    series("plain, hot cache", nominal, 0);
    series("\\xff, hot cache", worst, 0);
    series("plain, cold cache", nominal, 1);
    series("\\xff, cold cache", worst, 1);
    return 0;
}
```

Apple M2 Pro에서 Apple clang 21.0.0(`cc --version`: `clang-2100.4.1.1`)으로 빌드해 같은 프로그램을 세 번 돌린 결과입니다.

```text
timer resolution 41.7 ns
plain, hot cache       median    375 ns  p99    458 ns  max    1667 ns
\xff, hot cache        median    292 ns  p99    500 ns  max     625 ns
plain, cold cache      median    375 ns  p99    750 ns  max    1083 ns
\xff, cold cache       median    500 ns  p99    708 ns  max    1000 ns
timer resolution 41.7 ns
plain, hot cache       median    375 ns  p99    417 ns  max    1458 ns
\xff, hot cache        median    292 ns  p99    500 ns  max     583 ns
plain, cold cache      median    375 ns  p99    708 ns  max     958 ns
\xff, cold cache       median    542 ns  p99   1042 ns  max    5667 ns
timer resolution 41.7 ns
plain, hot cache       median    375 ns  p99    458 ns  max    1250 ns
\xff, hot cache        median    292 ns  p99    500 ns  max    1542 ns
plain, cold cache      median    375 ns  p99    667 ns  max    3833 ns
\xff, cold cache       median    500 ns  p99    917 ns  max    3875 ns
```

- **중앙값은 세 번 모두 거의 같았지만 최댓값은 크게 달랐습니다.** `\xff, cold cache`의 최댓값은 1,000 → 5,667 → 3,875 ns였습니다. 재현 절차대로 새로 빌드해 한 번 더 돌렸을 때는 hot cache `\xff`의 최댓값이 16,208 ns였습니다. 관측된 최댓값을 그대로 WCET로 쓰면, 다음 측정에서 그보다 큰 값이 나올 수 있습니다.
- **64 MiB를 훑은 뒤 `\xff` 중앙값은 292 → 500~542 ns로 늘었고 평범한 문자는 375 ns 그대로였습니다.** 이 순회는 data cache 말고 TLB·분기 예측 상태도 바꾸므로 원인을 하나로 가르지 않았습니다.
- **CPU가 바뀌면 "비싼 입력"도 바뀌었습니다.** QEMU 명령 수로는 `\xff`가 평범한 문자보다 많았는데(5,400 대 4,840), M2 Pro의 hot cache 중앙값은 `\xff` 292 ns, 평범한 문자 375 ns로 반대였습니다. 평범한 문자 600개는 출력도 600 byte를 쓰고, `\xff` 150개는 150 byte만 씁니다. 명령 수, 메모리 쓰기, 분기 예측이 CPU마다 다르게 비용이 되므로 최악 입력은 대상 CPU에서 확인합니다.

이 측정은 범용 OS 위의 결과라 hard real-time 근거가 아닙니다. 방법(경로 길이를 입력별로 세기, cache 상태를 바꿔 재기, 분포의 꼬리 보기)을 보여 주는 것이 목적이고, 실제 WCET 측정은 대상 보드에서 DWT 같은 cycle counter로 합니다.

### Loop bound 명시

```c
#define MAX_N 64

void process_all(const sample_t *buf, int n)
{
    if (n > MAX_N) n = MAX_N;          /* the analysis can now assume at most MAX_N iterations */
    for (int i = 0; i < n; i++)
        process(&buf[i]);
}
```

정적 분석 도구는 모든 반복의 횟수 상한을 알아야 합니다. 입력이 정하는 반복에는 코드에서 상한을 강제하고, 그 상한을 도구에 알려 줍니다(도구마다 annotation 형식이 다릅니다).

### Cache 상태를 바꿔 재기

```c
void measure_cold(void)
{
    SCB_CleanInvalidateDCache();       /* CMSIS, Cortex-M7 data cache */
    uint32_t c0 = DWT->CYCCNT;
    work();
    cold = DWT->CYCCNT - c0;
}
```

`SCB_CleanInvalidateDCache()`는 CMSIS 5.9.0 `cachel1_armv7.h`에 있는 Cortex-M7 D-cache 함수입니다. cold가 항상 최악인 것은 아니어서, cache 상태·interrupt·다른 bus master의 접근을 함께 바꿔 가며 재야 합니다. 이 코드는 보드가 없어 실행하지 않았습니다.

### Cache를 끄는 선택

```c
SCB_DisableDCache();
critical_section();
SCB_EnableDCache();
```

cache를 끄면 hit·miss에 따른 변동이 사라지는 대신 모든 접근이 memory로 갑니다. 끄고 켜는 동작 자체에도 시간이 들고(CMSIS 5.9.0 `SCB_DisableDCache()`는 CCR.DC를 끈 뒤 set·way마다 `DCCISW`로 전체를 clean·invalidate합니다), 다른 bus master와의 경쟁은 그대로 남습니다. 결정성과 평균 성능의 맞바꿈이므로 측정으로 정합니다.

## 측정 / 성능 비교

| 측정 | 결과 |
| --- | --- |
| `unescape()` 경로 길이, Cortex-M3 QEMU, 600 byte 입력 | `\n` 3,320 / 평범한 문자 4,840 / `\xff` 5,400 명령 |
| DWT `CYCCNT` on QEMU | 0 (모델 안 됨) |
| M2 Pro, hot cache 중앙값 | 평범한 문자 375 ns, `\xff` 292 ns |
| M2 Pro, cold cache 중앙값 | 평범한 문자 375 ns, `\xff` 500~542 ns |
| M2 Pro, `\xff` cold 최댓값 (세 번) | 1,000 / 5,667 / 3,875 ns |

마감까지의 여유는 이 표처럼 흔들리는 관측 최댓값이 아니라, 정적 분석 상한이나 대상 보드에서 interrupt·cache 조건을 통제해 잰 값에 근거를 남겨 정합니다.

## 자주 보는 함정

> ⚠️ 평균으로 마감을 계산

위 측정에서 중앙값과 최댓값은 최대 10배 넘게 달랐습니다(542 대 5,667 ns). 주기와 마감은 WCET로 계산합니다.

> ⚠️ hot cache로만 측정

```c
for (int i = 0; i < 1000; i++) measure(work);    /* every run after the first is hot */
```

반복 측정에서는 첫 실행 뒤 cache가 데워집니다. 위 `\xff` 입력은 cache를 밀어내자 중앙값이 1.7~1.9배가 됐습니다.

> ⚠️ 측정을 시계 밖으로 옮긴 컴파일러

위 host 측정은 처음에 중앙값 0 ns가 나왔습니다. 측정 대상 호출을 `noinline`으로 두고 compiler barrier로 감싸야 시계 사이에 남습니다.

> ⚠️ 상한 없는 반복

```c
while (!data_ready) { }      /* how long? */
```

끝나는 시점이 외부 신호에 달린 반복은 WCET를 정할 수 없습니다. timeout을 두거나 interrupt·event로 바꿉니다.

> ⚠️ 입력이 깊이를 정하는 재귀, real-time 경로의 `malloc`

재귀 깊이와 범용 allocator의 탐색 길이는 입력과 heap 상태에 따라 늘어납니다. [8-01](/blog/embedded/modern-recipes/part8-01-dynamic-memory)에서 heap_4의 `malloc(200)`은 앞쪽 빈 구멍 수에 비례해 120 명령에서 4,920 명령까지 늘었습니다. real-time 경로에서는 반복과 고정 크기 pool을 씁니다.

## 재현 환경

- 경로 길이: `arm-none-eabi-gcc` 16.2.0, QEMU 11.1.3 `mps2-an385`, `bash run-qemu.sh`(`parse.h`·`wcet_qemu.c`·8-02의 `bm.h`·`startup_bm.c`·`link-an385.ld`).
- 시간 분포: Apple M2 Pro, macOS, Apple clang 21.0.0, `cc -std=c11 -O2 -Wall -o wcet_host wcet_host.c && ./wcet_host`.

## 정리

- WCET는 상한이고, 측정으로 얻는 최댓값은 그 하한입니다. 이 실행에서 같은 측정의 최댓값이 583 ns에서 16,208 ns까지 흔들렸습니다.
- 같은 길이의 입력도 경로가 달라 명령 수가 3,320~5,400으로 갈렸습니다. 최악 입력은 가장 비싼 분기를 가장 많이 타는 입력입니다.
- 어느 입력이 비싼지는 CPU마다 달랐습니다(QEMU 명령 수와 M2 Pro 시간의 순서가 반대).
- 64 MiB를 훑은 뒤에는 `\xff` 입력만 느려졌고(292 → 500 ns 이상) 평범한 문자는 그대로였습니다. 원인을 cache 하나로 가르지는 않았습니다.
- QEMU는 사이클을 모델링하지 않고 DWT `CYCCNT`도 0이었습니다. 사이클 측정은 보드에서 합니다.
- 정적 분석 도구(aiT 등)는 실행 파일과 프로세서 모델로 상한을 계산합니다.
- 반복에는 상한을 두고, real-time 경로에서는 재귀·범용 `malloc`·끝을 모르는 대기를 피합니다.

다음 편부터 Part 9 **Concurrency 응용**으로 넘어갑니다.

## 관련 항목

- [PRTOS 1-10: Realtime Analysis](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)
- [PRTOS 2-10: Scheduler Latency](/blog/embedded/rtos/practical-internals/part2-10-scheduler-latency)
- [8-11: 전력 최적화](/blog/embedded/modern-recipes/part8-11-power-optimization)
- [PE 1-05: Realtime](/blog/embedded/performance-engineering/part1-05-realtime)
- [PE 2-06: Cache Miss](/blog/embedded/performance-engineering/part2-06-cache-miss)
