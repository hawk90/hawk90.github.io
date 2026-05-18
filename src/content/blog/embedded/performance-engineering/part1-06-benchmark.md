---
title: "1-06: 벤치마킹 기초 — 재현성, Warmup, 노이즈 제거"
date: 2026-05-12T06:00:00
description: "신뢰할 수 있는 벤치마크 — warmup, isolation, multi-run. CoreMark·Dhrystone·SPEC."
series: "Embedded Performance Engineering"
seriesOrder: 6
tags: [benchmark, reproducibility, warmup, coremark, isolation]
draft: true
---

## 한 줄 요약

> **"벤치마크는 재현성 있어야"** — Warmup·isolation·N=100+. 한 번 측정은 거짓말.

## 좋은 벤치마크의 5 조건

1. **Reproducible** — 같은 결과 매번
2. **Representative** — 실 워크로드 대표
3. **Stable** — 변동 ±5% 이내
4. **Isolated** — 외부 영향 제거
5. **Measurable** — 명확한 metric

## Warmup — 첫 측정은 버린다

```text
첫 측정:    150 ms (cache cold, branch predictor 미학습)
2-10번째:   90-110 ms (warmup 중)
11번째+:    100 ms ± 5% (정상)
```

해결 — *처음 N회 측정 무시*:

```c
for (int i = 0; i < WARMUP; i++) work();   // discard
for (int i = 0; i < N; i++) {
    uint32_t t = DWT->CYCCNT;
    work();
    record(DWT->CYCCNT - t);
}
```

WARMUP = 10-100 권장.

## Isolation — 노이즈 제거

### Linux

```bash
# CPU pinning
taskset -c 3 ./benchmark

# Disable frequency scaling
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Isolate CPU (kernel boot)
isolcpus=2,3   # CPU 2,3을 scheduler에서 제외

# Network·other interrupts off
sudo systemctl stop irqbalance

# Disable ASLR (predictable)
echo 0 | sudo tee /proc/sys/kernel/randomize_va_space
```

### Bare-metal

- 다른 task disable
- ISR mask (`__disable_irq()` for critical region)
- DMA 정지
- Cache enable·warm

## N=1은 거짓말

```text
한 번 측정: 100 ms
실은 95-110 ms 분포 (±5%)
```

**N = 100 이상**. 평균·p99·max·stdev 모두 보고.

```c
struct {
    uint32_t min, max, sum;
    uint32_t hist[64];
} stats;
```

## CoreMark — EEMBC 표준

비영리 EEMBC의 *임베디드 표준 벤치*. *Standardized integer workload* — 모든 칩 비교 가능.

```bash
# 빌드
git clone https://github.com/eembc/coremark
cd coremark
make PORT_DIR=linux64

# 실행
./coremark.exe
# CoreMark 1.0 : 13841 / GCC 11.4.0 -O2 ...
```

### 결과 비교

| CPU | CoreMark | CoreMark/MHz |
| --- | --- | --- |
| Cortex-M0+ @ 50 MHz | 100 | 2.0 |
| Cortex-M4F @ 168 MHz | 850 | 5.1 |
| Cortex-M7 @ 480 MHz | 2900 | 6.0 |
| Cortex-A53 @ 1.5 GHz | 6300 | 4.2 |
| RISC-V SiFive E31 @ 320 MHz | 1500 | 4.7 |
| ESP32-C3 @ 160 MHz | 530 | 3.3 |

CoreMark/MHz = *효율 (architecture)*. Cortex-M7이 최고.

## Dhrystone (DMIPS) — 옛 표준

1984년 Reinhold Weicker. *Integer workload*.

```text
Cortex-M0+: 0.95 DMIPS/MHz
Cortex-M4:  1.25 DMIPS/MHz
Cortex-A53: 2.30 DMIPS/MHz
```

비판 — *compiler 최적화에 민감*, 실 워크로드 대표성 약함. CoreMark가 더 신뢰.

## SPEC CPU — Server/Desktop 표준

SPECint·SPECfp. 라이선스 비쌈. 임베디드엔 *너무 큼*.

## Linux Benchmarks

| 도구 | 측정 |
| --- | --- |
| `sysbench` | CPU·memory·thread·mutex |
| `iperf3` | network bandwidth |
| `UnixBench` | 종합 |
| `fio` | disk I/O |
| `stress-ng` | 부하 발생 |
| `phoronix-test-suite` | 자동 multi-bench |

## Micro-Benchmark 작성

```c
#include "benchmark.h"

void bench_memcpy_1k(void) {
    static uint8_t src[1024], dst[1024];
    memcpy(dst, src, sizeof(src));
}

BENCHMARK(bench_memcpy_1k);
BENCHMARK_MAIN();
```

[Google Benchmark](https://github.com/google/benchmark) 또는 [Catch2](https://github.com/catchorg/Catch2).

### Compiler가 최적화로 *지워버림* 방지

```c
volatile int sink;
sink = result;     // optimizer가 result 계산 제거 못 함

// 또는 __asm__ memory barrier
__asm__ volatile("" : : "r"(result) : "memory");
```

## 임베디드 벤치 패턴

```c
void run_bench(const char *name, void (*fn)(void)) {
    // Warmup
    for (int i = 0; i < 10; i++) fn();
    
    // Measure
    uint32_t min = UINT32_MAX, max = 0, sum = 0;
    for (int i = 0; i < 100; i++) {
        uint32_t t = DWT->CYCCNT;
        fn();
        uint32_t e = DWT->CYCCNT - t;
        if (e < min) min = e;
        if (e > max) max = e;
        sum += e;
    }
    printf("%s: avg=%u min=%u max=%u\n", name, sum/100, min, max);
}
```

## Comparative Benchmark

A/B 비교 — *같은 환경, 다른 옵션*.

```text
Baseline:           100 ms ± 5
Optimization A:      85 ms ± 4 (15% 개선)
Optimization B:      90 ms ± 7 (10% but jitter↑)
```

**Statistical test** — Mann-Whitney U test로 차이가 *유의미한가* 검증.

## A/B Test Pitfall

같은 코드 vs 자신 — *±5% 변동이 자연스러움*. **10% 미만 개선은 noise일 가능성**.

## Continuous Benchmarking

```yaml
# CI/CD에서 매 PR마다 자동 benchmark
- name: Benchmark
  run: |
    ./benchmark > current.txt
    diff baseline.txt current.txt | check_regression
```

Production code의 *성능 회귀* 자동 감지.

## 자주 하는 실수

> ⚠️ N=1 또는 N=10

Stdev 모름 → 결론 X. **N ≥ 100**.

> ⚠️ Warmup 없이

Cache cold → 부정확. 10+ warmup.

> ⚠️ Different workload 비교

apples to oranges. 같은 input·환경.

> ⚠️ Compiler가 result 최적화 제거

위 — `volatile` 또는 asm barrier.

## 정리

- 벤치마크 = **재현 + 대표 + 안정 + 격리 + 측정**.
- **Warmup 10-100회** + **measurement N=100+**.
- **CoreMark**가 임베디드 표준 (CoreMark/MHz로 효율).
- Linux는 *CPU pinning + frequency lock + isolcpus*.
- A/B는 **statistical test** — 10% 미만 noise 가능.

다음 편은 **성능 모델링** — Amdahl·Roofline.

## 관련 항목

- [1-05: 실시간 성능 분석](/blog/embedded/performance-engineering/part1-05-realtime)
- [1-07: 성능 모델링](/blog/embedded/performance-engineering/part1-07-modeling)
- [CoreMark](https://www.eembc.org/coremark/)
