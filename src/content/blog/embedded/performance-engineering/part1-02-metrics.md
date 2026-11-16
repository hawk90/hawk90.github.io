---
title: "성능 지표 정의 — Latency·Throughput·Utilization 분석"
slug: "embedded/performance-engineering/part1-02-metrics"
date: 2026-04-23T09:02:00
description: "3 핵심 지표 + 임베디드 추가 — Jitter·Deadline. Service time vs Response time."
series: "Embedded Performance Engineering"
seriesOrder: 2
tags: [performance, latency, throughput, utilization, jitter, deadline]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Latency·Throughput·Utilization"** 세 축으로 성능을 그립니다. 임베디드에서는 *jitter·deadline*이 추가됩니다.

## 3 핵심 지표

### Latency

**한 작업이 완료되기까지 걸리는 시간**을 의미합니다.

![요청부터 응답까지의 latency 구간](/images/blog/perf-eng/diagrams/part1-02-latency-request.svg)

단위는 µs, ms, s입니다. 측정 방식은 single request 시간이거나 *분포*(p50·p99·max)입니다.

### Throughput

**단위 시간당 처리량**을 의미합니다.

```text
초당 요청 수 (req/s)
초당 byte 수 (MB/s, Gbps)
초당 프레임 수 (FPS)
```

단위는 req/s, bytes/s, ops/s입니다.

### Utilization

**자원 사용률(%)**을 의미합니다.

$$U_{CPU} = \frac{t_{busy}}{t_{total}}, \quad U_{mem} = \frac{u}{m_{total}}, \quad U_{bus} = \frac{c_{active}}{c_{total}}$$

사용률이 얼마일 때 대기가 문제가 되는지는 아래 절에서 큐 시뮬레이션으로 직접 봅니다.

## Latency vs Throughput — 큐가 둘을 묶는다

처리량을 올리려고 자원 사용률을 높이면 요청이 큐에서 기다리는 시간이 늘어납니다. 이 관계를 숫자로 보려고 가장 단순한 큐 하나를 시뮬레이션했습니다. 서버 하나, FIFO, 도착 간격과 서비스 시간이 모두 지수 분포(M/M/1)이고 평균 서비스 시간 S = 1입니다. 사용률 U마다 요청 100만 개를 흘렸습니다(`bench/mm1.c`, `clang -O2`, M2 Pro, 고정 seed).

| U | 평균 응답 시간 W | 1/(1−U) | p99 응답 시간 | ΣW/T | λ·W |
|---:|---:|---:|---:|---:|---:|
| 0.50 | 1.99 | 2.00 | 9.17 | 1.00 | 1.00 |
| 0.70 | 3.35 | 3.33 | 15.42 | 2.35 | 2.35 |
| 0.80 | 5.04 | 5.00 | 23.21 | 4.03 | 4.03 |
| 0.90 | 9.75 | 10.00 | 43.17 | 8.79 | 8.79 |
| 0.95 | 19.38 | 20.00 | 88.84 | 18.39 | 18.39 |

U가 0.5에서 0.9로 올라가는 동안 처리량은 1.8배가 되지만 평균 응답 시간은 4.9배, p99는 4.7배가 됩니다. 0.9에서 0.95로 5%p만 더 올려도 응답 시간이 다시 두 배가 됩니다. 시뮬레이션 평균은 1/(1−U)와 4% 안에서 맞습니다. 다만 이 수치는 서비스 시간이 지수 분포라는 가정에서 나온 것입니다. 같은 시뮬레이션에서 서비스 시간만 1로 고정하면(M/D/1, `bench/md1.c`) U = 0.9의 평균 응답 시간은 5.43, p99는 22.77로 위 표의 절반 남짓입니다. 서비스 시간의 변동이 클수록 같은 사용률에서 더 오래 기다립니다. 그래서 내 시스템의 곡선은 부하를 단계적으로 올리며 직접 잽니다.

**Little's Law**는 분포 가정 없이 성립하는 관계입니다.

$$L = \lambda \cdot W$$

John D. C. Little의 2011년 회고 논문("Little's Law as Viewed on Its 50th Anniversary", *Operations Research* 59(3))은 $L$을 시스템 안에 있는 항목의 평균 개수, $\lambda$를 평균 도착률, $W$를 한 항목이 시스템 안에 머문 평균 시간으로 정의합니다. 여기서 "시스템 안"은 큐에서 기다리는 것과 서비스받는 것을 모두 포함합니다. 같은 논문의 정리 LL.1은 관측 구간 [0, T]의 시작과 끝에 시스템이 비어 있으면 이 식이 그 구간에서 정확히 성립한다고 적습니다. LL.1의 증명은 n(t) 아래 넓이가 각 항목의 W 합과 같다는 것이고, 위 표의 ΣW/T 열도 그 넓이(ΣW)를 T로 나눠 구했습니다. 그래서 마지막 두 열은 같은 양을 두 가지로 쓴 것이고, 독립적으로 잰 L이 아닙니다.

임베디드에서는 이 식을 거꾸로 씁니다. 예를 들어 UART 수신 큐에 초당 1,000개 메시지가 들어오고 한 메시지가 큐에서 평균 5 ms 머문다면, 큐에는 평균 1,000 × 0.005 = 5개가 들어 있습니다. 평균 점유가 5개라는 것은 큐 깊이를 정하는 출발점일 뿐이고, 버스트를 견디려면 최대 점유를 따로 잽니다.

## Service Time vs Response Time

![Service time과 Response time의 관계 — queue 대기 시간 포함 여부](/images/blog/perf-eng/diagrams/part1-02-service-vs-response.svg)

- **Service Time**은 실제 *처리 시간*입니다(queue 제외).
- **Response Time**은 *대기와 처리*를 합한 시간이며, 사용자가 체감하는 값입니다.

위 시뮬레이션에서 S는 언제나 1이었지만, U = 0.95에서 평균 response time은 19.38이었습니다. service time을 줄이는 최적화와 대기를 줄이는 조치(부하 분산, 우선순위)는 서로 다른 일입니다.

## 임베디드 — Jitter

Jitter는 주기 작업이 깨어나는 시각의 변동입니다. 여기서는 예정 시각 대비 실제 시각의 지연(lateness)을 재서, 그 최댓값과 최솟값의 차이를 jitter로 씁니다.

$$\text{Jitter} = \max(\text{lateness}) - \min(\text{lateness})$$

범용 OS에서 이 값이 어느 정도인지 M2 Pro의 macOS에서 1 ms 주기 루프를 돌려 보았습니다. 다음 깨어날 시각을 절대값으로 계산해 `mach_wait_until()`로 기다리고, 깨어난 직후 `mach_absolute_time()`을 읽어 예정 시각과의 차이를 기록했습니다(`bench/jitter.c`, 1만 주기 × 3회). 측정 중 호스트에서는 다른 QEMU 게스트 6개가 돌고 있었고 load average는 7.65였습니다.

| 실행 | min | p50 | p99 | p99.9 | max | jitter |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1.6 µs | 202.8 µs | 257.8 µs | 2.33 ms | 3.35 ms | 3.35 ms |
| 2 | 2.9 µs | 200.8 µs | 256.1 µs | 1.78 ms | 3.30 ms | 3.30 ms |
| 3 | 2.8 µs | 202.3 µs | 1.46 ms | 10.13 ms | 16.75 ms | 16.75 ms |

1 ms 주기 작업이 중앙값으로 약 0.2 ms 늦게 깨어나고, 최악은 한 주기를 넘깁니다. 이 환경에서는 1 ms 주기에서 중앙값 0.2 ms, 최악 3~17 ms 늦었습니다. 주기 제어 루프에 이만한 jitter가 허용되지 않으면 RTOS나 하드웨어 타이머 인터럽트로 주기를 만듭니다. 허용 한계는 제어 루프의 요구사항으로 정합니다.

### Jitter 측정

FreeRTOS에서는 `vTaskDelayUntil()`로 같은 측정을 합니다. *Mastering the FreeRTOS Real Time Kernel* 4.7.5절에 따르면 이 함수의 인자는 task가 Blocked에서 Ready로 옮겨질 *정확한 tick 값*을 지정하므로, `vTaskDelay()`와 달리 호출 시점에 상대적이지 않습니다. 그래서 고정 주기 task에 씁니다. 아래 코드는 예정 시각을 DWT cycle로 누적해 두고 실제로 깨어난 cycle과의 차이를 기록합니다. 이 코드는 보드에서 실행하지 않았습니다.

```c title="phase-jitter-sample"
TickType_t last_wake = xTaskGetTickCount();
uint32_t expected_cycles = DWT->CYCCNT;
while (1) {
    vTaskDelayUntil(&last_wake, period);
    expected_cycles += (uint32_t)period * CYCLES_PER_TICK;
    uint32_t actual_cycles = DWT->CYCCNT;
    int32_t phase_error = (int32_t)(actual_cycles - expected_cycles);
    log_phase_error_cycles(phase_error);
    do_work();
}
```

`log_phase_error_cycles()`는 아래 "Latency 분포 측정 예"의 히스토그램처럼 값을 버킷에 누적하는 함수로 채웁니다.

## 임베디드 — Deadline

작업이 *반드시 끝나야 할 시점*을 의미합니다.

*Mastering the FreeRTOS Real Time Kernel* 1.1절은 두 종류를 이렇게 나눕니다.

| Type | 정의 | 책의 예 |
| --- | --- | --- |
| **Hard** | deadline을 어기면 시스템이 완전히 실패한다 | 충돌 센서에 너무 늦게 반응한 에어백 |
| **Soft** | deadline을 어겨도 시스템이 쓸모없어지지는 않는다 | 키 입력에 늦게 반응해 답답하지만 쓸 수는 있는 장치 |

Latency 대신 deadline 만족 여부가 metric이 됩니다. 즉, *deadline 안에 들어왔는가? 몇 % 들어왔는가?*를 봅니다.

## Percentile 표기

| 표기 | 의미 |
| --- | --- |
| p50 (median) | 절반은 더 빠름 |
| p90 | 10% 케이스만 더 느림 |
| p99 | 1% 케이스만 더 느림 |
| p999 | 0.1% (1000 중 1) |
| p9999 | 0.01% |
| max | worst-case |

요구사항과 분석 모델에 따라 deadline 충족을 평가합니다. 유한한 시험에서 관측한 max는 하드 실시간 보장을 증명하지 않으며, p99/p999 목표는 소프트 실시간 서비스 목표의 한 예일 뿐입니다.

## Long Tail

1-01에서 쓴 측정(16 KiB 배열 합, M2 Pro, 10만 회)을 log2 버킷으로 나누면 꼬리가 어떻게 생겼는지 보입니다(`bench/disthist.c`, 한 번 실행).

| 구간 | 표본 수 |
|---|---:|
| 64~128 ns | 29,891 |
| 128~256 ns | 69,970 |
| 256~512 ns | 135 |
| 1,024~2,048 ns | 2 |
| 2,048~4,096 ns | 2 |

이 실행의 mean은 156 ns, p99는 209 ns, max는 2,875 ns였습니다. 표본 99.86%가 두 버킷에 몰려 있고, 마지막 네 개는 본체에서 한참 떨어져 있습니다. 평균과 p99는 이 네 개를 거의 반영하지 않습니다. deadline을 넘기는 것은 이런 꼬리이므로, 분포를 요약할 때 max와 그 횟수를 따로 적습니다.

## Saturation 측정

![Resource 사용률과 응답 시간의 관계 — 부하 증가에 따른 대기 시간 예시](/images/blog/perf-eng/diagrams/part1-02-saturation-curve.svg)

이 곡선은 위 M/M/1 표와 같은 모양의 예시입니다. 내 시스템의 안전 한계는 요구 응답 시간과, 부하를 올려 가며 잰 곡선으로 정합니다.

## 임베디드 추가 지표

### IPC (Instructions Per Cycle)

Armv8 PMU로는 `INST_RETIRED` / `CPU_CYCLES`입니다. 같은 코어에서도 작업에 따라 IPC가 수십 배 차이 납니다. M2 Pro에서 `/usr/bin/time -l`이 보고하는 instructions retired와 cycles elapsed로 두 프로그램을 비교했습니다(`bench/ipc.c`, `clang -O2`, 각 3회).

| 프로그램 | instructions retired | cycles elapsed | IPC (3회) |
|---|---:|---:|---|
| `sum`: L1에 들어가는 16 KiB 배열을 20만 번 합산 | 630,567,192 | 121,263,922 | 5.20, 5.23, 5.26 |
| `chase`: 256 MiB 무작위 포인터 사슬 2천만 단계 (셔플 준비 포함) | 1,087,548,378 | 9,302,601,066 | 0.117, 0.106, 0.107 |

표의 카운트는 첫 번째 실행 값입니다. `sum`은 한 cycle에 명령어를 다섯 개 넘게 끝냈고, `chase`는 열 cycle에 하나 정도를 끝냈습니다. `chase`의 각 load는 앞 load의 결과 주소를 쓰므로 DRAM 왕복을 기다리는 동안 다음 일을 시작할 수 없습니다. IPC가 낮으면 이렇게 *무엇을 기다리는지*를 다음 카운터(cache refill, stall)로 찾습니다(2-02, 2-06, 2-10).

### Cache Hit Rate

카운터 값은 정수이므로 나누기 전에 실수로 바꿉니다. 정수끼리 나누면 miss < access인 한 결과가 항상 0이 되어 hit rate가 1.0으로 나옵니다.

```c
double hit_rate = 1.0 - (double)cache_miss / (double)cache_access;
```

Armv8에서는 L1D라면 `L1D_CACHE_REFILL`/`L1D_CACHE`가 이 비율이 됩니다. 두 이벤트가 무엇을 세는지(prefetch 포함 여부 등)는 코어 TRM의 PMU 이벤트 표에 있으므로, 다른 코어와 비교할 때는 그 정의가 같은지부터 봅니다.

### MIPS / DMIPS

**MIPS**는 millions of instructions per second이고, **DMIPS**는 Dhrystone 벤치마크 점수로 표기한 MIPS입니다. 위 IPC 표가 보여 주듯 초당 명령어 수는 같은 코어에서도 작업에 따라 수십 배 달라지므로, 한 벤치마크의 MIPS 값으로 다른 작업의 성능을 예측하지 않습니다.

### CoreMark

EEMBC의 CoreMark는 실행·보고 규칙을 소스와 함께 공개합니다. [README](https://github.com/eembc/coremark/blob/main/README.md)(커밋 `1f483d5`)의 Run Rules는 다음을 요구합니다.

- 최소 10초 동안 실행한다.
- seed `0,0,0x66`과 `0x3415,0x3415,0x66`, 버퍼 2000바이트로 검증이 통과해야 한다.
- 모든 소스를 같은 플래그로 컴파일하고, `core_portme*` 외의 소스는 고치지 않는다.

결과는 `CoreMark 1.0 : N / C [/ P] [/ M]` 형식으로 적습니다. N은 초당 반복 수, C는 컴파일러 버전과 플래그, P는 코드·데이터 배치, M은 병렬 실행 방식입니다. CoreMark/MHz를 보고할 때는 P를 생략할 수 없고 메모리 대 코어 클럭 비율도 적어야 합니다. 그래서 데이터시트의 CoreMark/MHz 숫자를 비교할 때는 이 C와 P 칸이 같은지부터 봅니다. 이 글에서는 CoreMark를 실행하지 않았습니다.

## 측정 — Time Source

| 시계 | 반환 단위·해상도 | 사용 |
| --- | --- | --- |
| `xTaskGetTickCount()` | RTOS tick. `configTICK_RATE_HZ`가 1000이면 1 ms | task 단위 timing |
| `DWT->CYCCNT` | 코어 cycle. 32비트라 168 MHz에서 약 25.6초마다 wrap | 짧은 구간 |
| `clock_gettime(CLOCK_MONOTONIC_RAW)` | ns 단위 반환. 아래 측정 참고 | Linux 경과시간 측정 |
| GPIO + 로직 분석기 | 분석기 샘플링 주기 | 외부 측정 (HW) |
| HW timer | 타이머 입력 클럭 | 임베디드 정밀 |

`clock_gettime()`은 ns 단위로 값을 돌려주지만, 그 값이 ns마다 바뀌지는 않습니다. Debian 게스트에서 `clock_getres(CLOCK_MONOTONIC_RAW)`는 1 ns를 돌려주었지만, 같은 부팅의 커널 로그는 `arch_timer: cp15 timer(s) running at 24.00MHz`와 `sched_clock: 56 bits at 24MHz, resolution 41ns`입니다. macOS에서는 `clock_getres(CLOCK_MONOTONIC_RAW)`가 42 ns를 돌려줍니다. 1-01의 측정값이 41.7 ns 단위로 끊긴 것도 이 24 MHz 카운터 때문입니다.

## Latency 분포 측정 예

임베디드 타깃에서는 표본을 모두 저장할 메모리가 없으므로, 값을 log2 버킷에 누적하고 최댓값만 따로 보관합니다. 아래 코드는 호스트에서 `clang -O0 -Wall`로 컴파일해 assert가 모두 통과하는 것을 확인했습니다.

```c title="bounded-latency-histogram"
#include <assert.h>
#include <stdint.h>

#define BUCKETS 32
static uint32_t hist[BUCKETS];
static uint32_t max_val;

static unsigned bucket_index(uint32_t us) {
    unsigned i = 0;
    while (us > 1u) { us >>= 1; ++i; }
    return i;
}
static void log_latency_us(uint32_t us) {
    ++hist[bucket_index(us)];
    if (us > max_val) max_val = us;
}
int main(void) {
    log_latency_us(0); log_latency_us(1); log_latency_us(2);
    log_latency_us(UINT32_MAX);
    assert(hist[0] == 2 && hist[1] == 1 && hist[31] == 1);
    assert(max_val == UINT32_MAX);
    return 0;
}
```

## 자주 하는 실수

> ⚠️ 평균만 보고 OK 판정

Median이 좋아도 *long tail*은 보이지 않습니다. 항상 *p99·max*를 함께 봅니다.

> ⚠️ Utilization 90%+ 목표

위 M/M/1 시뮬레이션에서 U = 0.9의 평균 응답 시간은 서비스 시간의 9.75배, p99는 43배였습니다. 사용률 목표는 응답 시간 요구에서 거꾸로 정하고, 내 시스템에서 부하를 올려 가며 확인합니다.

> ⚠️ Tick rate으로 µs 측정 시도

1 kHz tick으로 *µs latency*를 측정하면 0 또는 1 ms로만 보입니다. 이때는 *DWT* 또는 hw timer를 씁니다.

> ⚠️ Throughput만 최적화

예를 들어 묶음 처리(batching)로 throughput을 2배로 올리면, 묶음이 찰 때까지 기다리는 시간이 각 요청의 latency에 더해집니다. throughput을 바꾼 변경은 latency 분포도 함께 다시 잽니다.

## 정리

- 3 핵심 지표는 **Latency, Throughput, Utilization**입니다.
- 임베디드에서는 **Jitter와 Deadline**이 추가됩니다.
- Service time과 Response time은 다릅니다(queueing 영향).
- 분포, 표본 수와 표본 최대를 요구사항에 맞춰 해석합니다.
- M/M/1 시뮬레이션에서 U를 0.5에서 0.9로 올리면 평균 응답 시간이 4.9배가 됩니다. Little's Law L = λW는 분포와 무관하게 성립합니다.
- M2 Pro에서 IPC는 L1 합산 5.2, 무작위 포인터 추적 0.11이었습니다. IPC는 같은 코어에서도 작업에 따라 크게 다릅니다.
- CoreMark 점수는 README의 보고 형식(C·P 칸)이 같을 때만 비교합니다.

다음 편은 **측정의 기본**입니다. wall-clock, CPU cycle, instruction count를 다룹니다.

## 관련 항목

- [1-01: 성능 분석 방법론](/blog/embedded/performance-engineering/part1-01-methodology)
- [1-03: 측정의 기본](/blog/embedded/performance-engineering/part1-03-measurement)
- [1-04: 통계적 분석](/blog/embedded/performance-engineering/part1-04-statistics)

## 참고 자료

- [FreeRTOS `vTaskDelayUntil()` API](https://freertos.org/Documentation/02-Kernel/04-API-references/02-Task-control/02-vTaskDelayUntil)
- [*Mastering the FreeRTOS Real Time Kernel*](https://github.com/FreeRTOS/FreeRTOS-Kernel-Book) 1.1절(hard/soft real-time), 4.7.5절(`vTaskDelayUntil()`)
- John D. C. Little, "Little's Law as Viewed on Its 50th Anniversary," *Operations Research* 59(3), 2011, pp.536-549
- [EEMBC CoreMark](https://github.com/eembc/coremark/blob/main/README.md)
