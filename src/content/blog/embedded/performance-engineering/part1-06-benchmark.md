---
title: "임베디드 벤치마킹 기초 — 재현성·Warmup·노이즈 제거"
date: 2026-04-23T09:06:00
description: "신뢰할 수 있는 벤치마크는 warmup, isolation, multi-run이 필요합니다. CoreMark·Dhrystone·SPEC을 살펴봅니다."
series: "Embedded Performance Engineering"
seriesOrder: 6
tags: [benchmark, reproducibility, warmup, coremark, isolation]
draft: false
---

## 한 줄 요약

> **벤치마크는 재현성이 있어야 합니다.** Warmup, isolation, N=100+가 필수입니다. 한 번 측정은 거짓말입니다.

## 좋은 벤치마크의 5 조건

1. **Reproducible** — 같은 결과가 매번 나옵니다.
2. **Representative** — 실 워크로드를 대표합니다.
3. **Stable** — 변동이 ±5% 이내입니다.
4. **Isolated** — 외부 영향이 제거됩니다.
5. **Measurable** — 명확한 metric이 있습니다.

## Warmup — 첫 측정은 버린다

```text
첫 측정:    150 ms (cache cold, branch predictor 미학습)
2-10번째:   90-110 ms (warmup 중)
11번째+:    100 ms ± 5% (정상)
```

해결책은 *처음 N회 측정을 무시*하는 것입니다.

```c
for (int i = 0; i < WARMUP; i++) work();   // discard
for (int i = 0; i < N; i++) {
    uint32_t t = DWT->CYCCNT;
    work();
    record(DWT->CYCCNT - t);
}
```

WARMUP은 10에서 100 사이를 권장합니다.

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

- 다른 task를 disable합니다.
- ISR을 mask합니다 (`__disable_irq()` for critical region).
- DMA를 정지합니다.
- Cache를 enable하고 warm합니다.

## N=1은 거짓말

```text
한 번 측정: 100 ms
실은 95-110 ms 분포 (±5%)
```

**N은 100 이상**이 필요합니다. 평균·p99·max·stdev를 모두 보고해야 합니다.

```c
struct {
    uint32_t min, max, sum;
    uint32_t hist[64];
} stats;
```

## CoreMark — EEMBC 표준

비영리 EEMBC의 *임베디드 표준 벤치마크*입니다. 표준화된 integer workload여서 모든 칩을 비교할 수 있습니다.

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

CoreMark/MHz는 *아키텍처 효율*을 나타냅니다. Cortex-M7이 가장 높습니다.

## Dhrystone (DMIPS) — 옛 표준

1984년 Reinhold Weicker가 만든 integer workload입니다.

```text
Cortex-M0+: 0.95 DMIPS/MHz
Cortex-M4:  1.25 DMIPS/MHz
Cortex-A53: 2.30 DMIPS/MHz
```

다만 컴파일러 최적화에 민감하고 실 워크로드 대표성이 약하다는 비판이 있습니다. 그래서 CoreMark가 더 신뢰받습니다.

## SPEC CPU — Server/Desktop 표준

SPECint와 SPECfp가 있습니다. 라이선스가 비싸고 임베디드에는 *너무 무겁습니다*.

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

[Google Benchmark](https://github.com/google/benchmark)나 [Catch2](https://github.com/catchorg/Catch2)를 활용합니다.

### Compiler가 최적화로 *지워버리는* 것 방지

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

A/B 비교는 *같은 환경에서 다른 옵션*을 비교하는 방식입니다.

```text
Baseline:           100 ms ± 5
Optimization A:      85 ms ± 4 (15% 개선)
Optimization B:      90 ms ± 7 (10% but jitter↑)
```

**Statistical test**가 필요합니다. Mann-Whitney U test로 차이가 *유의미한가*를 검증합니다.

## A/B Test Pitfall

같은 코드를 자신과 비교해도 *±5% 변동이 자연스럽게* 발생합니다. **10% 미만 개선은 noise일 가능성**이 있습니다.

## Continuous Benchmarking

```yaml
# CI/CD에서 매 PR마다 자동 benchmark
- name: Benchmark
  run: |
    ./benchmark > current.txt
    diff baseline.txt current.txt | check_regression
```

Production code의 *성능 회귀*를 자동으로 감지합니다.

## 자주 하는 실수

> ⚠️ N=1 또는 N=10

Stdev를 모르므로 결론을 내릴 수 없습니다. **N ≥ 100**이 필요합니다.

> ⚠️ Warmup 없이

Cache cold 상태라 부정확합니다. 10회 이상 warmup이 필요합니다.

> ⚠️ Different workload 비교

apples to oranges 비교가 됩니다. 같은 input과 환경을 써야 합니다.

> ⚠️ Compiler가 result를 최적화로 제거

앞에서 본 것처럼 `volatile`이나 asm barrier로 막아야 합니다.

## 정리

- 벤치마크는 **재현 + 대표 + 안정 + 격리 + 측정**의 다섯 가지가 핵심입니다.
- **Warmup 10-100회**와 **measurement N=100+**가 필요합니다.
- **CoreMark**가 임베디드 표준입니다 (CoreMark/MHz로 효율을 봅니다).
- Linux는 *CPU pinning, frequency lock, isolcpus*를 함께 씁니다.
- A/B 비교에는 **statistical test**가 필요합니다. 10% 미만은 noise일 수 있습니다.

다음 편은 **성능 모델링**입니다. Amdahl과 Roofline을 다룹니다.

## 관련 항목

- [1-05: 실시간 성능 분석](/blog/embedded/performance-engineering/part1-05-realtime)
- [1-07: 성능 모델링](/blog/embedded/performance-engineering/part1-07-modeling)
- [CoreMark](https://www.eembc.org/coremark/)
