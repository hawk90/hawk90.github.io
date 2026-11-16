---
title: "임베디드 벤치마킹 기초 — 재현성·Warmup·노이즈 제거"
slug: "embedded/performance-engineering/part1-06-benchmark"
date: 2026-04-23T09:06:00
description: "신뢰할 수 있는 벤치마크는 warmup, isolation, multi-run이 필요합니다. CoreMark·Dhrystone·SPEC을 살펴봅니다."
series: "Embedded Performance Engineering"
seriesOrder: 6
tags: [benchmark, reproducibility, warmup, coremark, isolation]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **벤치마크 결과에는 조건과 변동성을 함께 기록합니다.** 반복 횟수와 warmup은 workload와 측정 목적에 맞춰 정합니다.

## 좋은 벤치마크의 5 조건

1. **Reproducible** — 같은 결과가 매번 나옵니다.
2. **Representative** — 실 워크로드를 대표합니다.
3. **Stable** — 변동 범위와 환경 변화를 기록하고, 판단 기준은 사용 목적에 맞춥니다.
4. **Isolated** — 외부 영향이 제거됩니다.
5. **Measurable** — 명확한 metric이 있습니다.

## Warmup — 첫 측정은 버린다

새로 띄운 프로세스에서 같은 일을 12번 반복하며 반복마다 시간을 재 보았습니다. 일은 `malloc`으로 받은 4 MiB 버퍼 전체에 값을 쓰고 더하는 것이고, 반복마다 똑같은 양입니다. 다른 점은 0번째 반복만 페이지를 처음 건드린다는 것뿐입니다(`bench/warmup.c`, M2 Pro, `clang -O2`, 프로세스 5개).

| 실행 | 0번째 | 1번째 | 2~11번째 |
|---:|---:|---:|---:|
| 1 | 399.1 µs | 62.8 µs | 62.5~66.3 µs |
| 2 | 342.5 µs | 62.8 µs | 61.7~64.5 µs |
| 3 | 326.2 µs | 63.1 µs | 62.6~64.7 µs |
| 4 | 342.8 µs | 118.2 µs | 64.3~68.6 µs |
| 5 | 349.7 µs | 62.5 µs | 62.0~65.2 µs |

0번째 반복은 2~11번째의 약 5~6배입니다. 같은 일을 `getrusage()`의 minor fault 수와 함께 재 보면(`bench/warmup-pf.c`) 0번째 반복에서 256번, 1·2번째 반복에서 0번입니다. 4 MiB를 이 Mac의 16 KiB 페이지로 나눈 수가 정확히 256이므로, 0번째 반복은 페이지마다 한 번씩 첫 접근 fault를 처리한 것입니다. 이 작업은 1번째부터 안정되지만, 4번 실행처럼 한 번 더 튀는 경우도 있습니다. 그래서 처음 몇 회를 버리되, 몇 회를 버릴지는 반복별 시간을 찍어 보고 정합니다.

```c
for (int i = 0; i < WARMUP; i++) work();   // discard
for (int i = 0; i < N; i++) {
    uint32_t t = DWT->CYCCNT;
    work();
    record(DWT->CYCCNT - t);
}
```

반대로 cold start가 실제 사용 조건이라면(부팅 직후 한 번만 도는 초기화 같은 것) 0번째 값이 측정 대상입니다. warmup은 "무엇을 재려는가"에 따라 버릴 수도, 따로 기록할 수도 있습니다.

## Isolation — 노이즈 제거

### Linux

```bash
# CPU pinning
taskset -c 3 ./benchmark

# 클럭을 최고 주파수로 요청
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Isolate CPU (kernel boot parameter)
isolcpus=domain,2,3

# irqbalance가 IRQ를 옮기지 않게
sudo systemctl stop irqbalance

# ASLR 끄기
echo 0 | sudo tee /proc/sys/kernel/randomize_va_space
```

각 설정의 의미는 Linux 6.12 문서에 있습니다.

| 설정 | 문서의 설명 |
|---|---|
| `performance` governor | `Documentation/admin-guide/pm/cpufreq.rst`: `scaling_max_freq` 한도 안에서 가장 높은 주파수를 요청 |
| `isolcpus=` | `kernel-parameters.txt`: 지정한 CPU를 방해 요인에서 격리. 기본 flag `domain`은 일반 SMP 부하 분산과 스케줄링에서 제외. 문서에 "Deprecated - use cpusets instead"라고 적혀 있음 |
| `randomize_va_space` | `sysctl/kernel.rst`: 0은 주소 공간 무작위화 끔, 1은 mmap base·stack·VDSO 무작위화, 2는 heap까지 |

이 시리즈의 Debian 게스트에서는 이 중 일부가 의미가 없습니다. `/sys/devices/system/cpu/cpu0/cpufreq`가 없어서 governor를 바꿀 수 없고, `irqbalance.service`도 설치되어 있지 않습니다. `randomize_va_space`는 2였습니다. 내 환경에서 어떤 손잡이가 실제로 있는지부터 확인합니다.

### Bare-metal

- 측정 대상 외의 task를 멈춥니다.
- 측정 구간의 인터럽트를 막습니다. CMSIS에서는 `__disable_irq()`/`__enable_irq()`입니다. 단, 실제 사용 조건에서 인터럽트가 들어온다면 막은 결과는 그 조건의 값이 아닙니다.
- DMA를 정지합니다.
- 캐시가 있는 코어(Cortex-M7 등)라면 캐시 상태를 정해 둡니다. 켠 상태에서 warm으로 잴지, 무효화하고 cold로 잴지를 결과와 함께 적습니다.

## N=1은 거짓말

한 번 잰 값이 얼마나 믿을 만한지는 같은 측정을 반복해야 알 수 있습니다. Debian 게스트에서 Google Benchmark(Debian 패키지 `libbenchmark-dev` 1.9.1)로 1 KiB `memcpy`를 쟀습니다. 한 번 실행에 5회 반복(`--benchmark_repetitions=5`)이고, 같은 명령을 세 번 실행했습니다.

| 실행 | median | stddev | cv |
|---:|---:|---:|---:|
| 1 | 14.4 ns | 1.50 ns | 10.04% |
| 2 | 32.2 ns | 21.4 ns | 58.32% |
| 3 | 12.8 ns | 2.71 ns | 19.22% |

부하가 걸린 호스트 위의 VM이라 변동이 큽니다. 한 실행만 보고 "1 KiB memcpy는 32 ns"라고 적으면 다른 실행의 2.2~2.5배를 보고하는 셈입니다. 그래서 표본 수, 반복 사이의 변동(cv), 측정 환경을 함께 기록합니다. MCU에서는 표본을 모두 저장하지 않고 아래처럼 요약만 남깁니다.

```c
struct {
    uint32_t min, max, sum;
    uint32_t hist[64];
} stats;
```

## CoreMark

EEMBC의 정수 workload 벤치마크입니다. [README](https://github.com/eembc/coremark/blob/main/README.md)(커밋 `1f483d5`)에 따르면 빌드는 `make PORT_DIR=<platform>`이고, 저장소에는 `linux`, `macos`, `posix`, `freebsd`, `barebones` 같은 포트 디렉터리가 있습니다. 예전 글에 흔한 `PORT_DIR=linux64`는 이 커밋에 없습니다.

```bash
git clone https://github.com/eembc/coremark
cd coremark
make PORT_DIR=linux XCFLAGS="-DPERFORMANCE_RUN=1" REBUILD=1 run1.log
make PORT_DIR=linux XCFLAGS="-DVALIDATION_RUN=1" REBUILD=1 run2.log
```

README의 Run Rules가 요구하는 두 실행(성능, 검증)이 위 두 줄입니다. 최소 10초 실행, 모든 소스를 같은 플래그로 컴파일, `core_portme*` 외 소스 수정 금지, 결과 형식 `CoreMark 1.0 : N / C [/ P] [/ M]`은 1-02에서 정리했습니다. 이 글에서는 CoreMark를 실행하지 않았습니다.

## Dhrystone (DMIPS) — 옛 표준

Reinhold P. Weicker가 만든 합성 벤치마크입니다. C 2.2판 헤더 주석(`riscv-tests`의 `benchmarks/dhrystone/dhrystone.h`, `#define Version "C, Version 2.2"`)에 따르면 원본은 Ada로 *Communications of the ACM* 27(10), 1984년 10월호 pp.1013-1030에 실렸고, 같은 논문에 문장 분포의 근거가 된 통계가 함께 실렸습니다.

같은 주석은 Dhrystone 2의 측정 규칙으로 분리 컴파일, 프로시저 병합 금지, 그 밖의 최적화는 허용하되 명시를 들고, 최적화 컴파일러가 일부 문장의 코드를 생성하지 않는 경우가 여전히 있다고 적습니다. 그래서 사용자에게 모든 문장에 코드가 생성됐는지 어셈블리 목록으로 확인하라고 권합니다. DMIPS 숫자를 볼 때 이 확인을 했는지가 빠져 있다면 비교에 쓰지 않습니다.

## SPEC CPU — Server/Desktop 표준

SPEC CPU 2017은 SPECspeed(한 작업을 끝내는 시간)와 SPECrate(단위 시간당 처리량) 두 종류를 정수·부동소수점으로 나눠 둡니다. [spec.org/cpu2017](https://www.spec.org/cpu2017/) 페이지 기준 신규 고객 가격은 1,000달러입니다. 같은 페이지는 CPU 2026 출시와 함께 2017을 은퇴시키며, 2026년 11월 3일부터 CPU 2017 결과의 게재 접수를 멈추고 11월 17일에 은퇴시킨다고 적습니다.

## Linux Benchmarks

| 도구 | 쓰임 |
| --- | --- |
| `sysbench` | CPU·memory·thread·mutex |
| `iperf3` | network bandwidth |
| `fio` | disk I/O |
| `stress-ng` | 부하 발생 (1-05에서 cyclictest와 함께 사용) |
| `cyclictest` | timer wake-up 지연 (1-04, 1-05) |

## Micro-Benchmark 작성

[Google Benchmark](https://github.com/google/benchmark)는 C++ 라이브러리이고, 벤치마크 함수는 `benchmark::State&`를 받아 `for (auto _ : state)` 루프 안에서 측정할 일을 합니다. 위 표의 측정에 쓴 코드가 이것입니다(`g++ -O2 gbench.cc -lbenchmark -lpthread`, Debian 게스트).

```cpp
#include <benchmark/benchmark.h>
#include <cstring>
#include <cstdint>

static void BM_memcpy_1k(benchmark::State& state) {
    static uint8_t src[1024], dst[1024];
    for (auto _ : state) {
        std::memcpy(dst, src, sizeof(src));
        benchmark::DoNotOptimize(dst);
        benchmark::ClobberMemory();
    }
    state.SetBytesProcessed(int64_t(state.iterations()) * sizeof(src));
}
BENCHMARK(BM_memcpy_1k);
BENCHMARK_MAIN();
```

`DoNotOptimize`와 `ClobberMemory`는 아래 절의 문제를 막는 도구입니다.

### Compiler가 최적화로 *지워버리는* 것 방지

이 문제는 위 warmup 측정을 만들다가 실제로 겪었습니다. 처음 버전은 버퍼에 쓰고 더한 합만 `volatile` 변수에 넣었는데, `clang -O2`가 합을 버퍼를 읽지 않고 식으로 계산해 버렸고 버퍼에 쓰는 일은 아무도 읽지 않으니 지웠습니다. 다섯 번 실행 모두 12회 반복이 전부 `0.0 µs`로 나왔습니다(`bench/warmup-dce.c`). 버퍼 포인터를 빈 asm에 넘겨 "메모리가 밖에서 읽힌다"고 알리자 위 표의 값이 나왔습니다.

```c
volatile uint64_t sink;
sink = result;     // result 계산 자체는 남는다

// 메모리에 쓴 내용까지 남겨야 하면: 포인터를 asm에 넘기고 memory clobber
__asm__ volatile("" : : "r"(buf) : "memory");
```

`volatile` 변수에 결과를 넣으면 그 *값*의 계산은 남지만, 값을 만드는 데 필요하지 않은 메모리 쓰기는 여전히 사라질 수 있습니다. 측정 결과가 비현실적으로 작게 나오면 먼저 어셈블리를 봅니다.

## 임베디드 벤치 패턴

Cortex-M에서 쓰는 최소 패턴입니다. 보드에서 실행하지 않았습니다. 버릴 warmup 횟수는 위처럼 반복별 값을 먼저 찍어 보고 정합니다.

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

M2 Pro에서 64 KiB 배열 합을 2,000번 재고 그 중앙값을 출력하는 프로그램을 세 가지로 만들었습니다(`bench/ab.c`). A는 `clang -O2`, A2는 A를 그대로 복사한 파일, B는 `-O2 -fno-vectorize -fno-slp-vectorize`입니다. 세 실행 파일을 번갈아 20번씩 돌렸습니다. 코어는 고정하지 않았습니다.

| 실행 파일 | 20개 중앙값의 중앙값 | min | max |
|---|---:|---:|---:|
| A | 645.5 ns | 625 ns | 1,291 ns |
| A2 (A의 복사본) | 625 ns | 625 ns | 1,291 ns |
| B (벡터화 끔) | 5,083 ns | 5,042 ns | 8,958 ns |

두 표본의 분포가 같은지를 Mann-Whitney U 검정(정규 근사, 동점 보정, `bench/mwu.py`)으로 보았습니다.

| 비교 | U | z | p |
|---|---:|---:|---:|
| A vs A2 | 250.0 | 1.56 | 0.119 |
| A vs B | 0.0 | −5.48 | 4.3×10⁻⁸ |

같은 실행 파일끼리도 중앙값이 645.5 ns와 625 ns로 3.3% 다르게 나왔습니다. 값을 보면 분포가 둘로 갈립니다. A는 20번 중 8번, A2는 5번이 1.2~1.3 µs로 약 두 배였고, 나머지는 625~667 ns였습니다. 코어를 고정하지 않은 상태라 두 배가 된 원인은 확인하지 않았습니다. 검정은 p = 0.12로 A와 A2가 다르다고 말하지 않습니다. 벡터화를 끈 B는 20번 모두 A보다 느렸고 p는 10⁻⁸ 수준입니다. B의 max는 min의 1.8배였는데, 그 원인은 이 측정으로 확인하지 않았습니다.

## A/B Test Pitfall

위 A/A 비교처럼 같은 코드를 자신과 비교해도 숫자는 다르게 나옵니다. 그래서 A/B 전에 A/A를 한 번 돌려, 내 환경에서 "아무것도 바꾸지 않았을 때의 차이"가 얼마인지부터 봅니다. 그보다 작은 개선은 같은 횟수의 측정으로는 구분할 수 없습니다.

## Continuous Benchmarking

```yaml
# 개념적 단계: baseline 관리와 check_regression 도구를 프로젝트에서 구현해야 함
- name: Benchmark
  run: |
    ./benchmark > current.txt
    diff baseline.txt current.txt | check_regression
```

`check_regression`은 위 Mann-Whitney 검정처럼 baseline 표본과 현재 표본을 비교하는 스크립트로 직접 만들어야 합니다. CI 러너가 공유 VM이라면 위 Google Benchmark 표처럼 cv가 수십 %까지 흔들리므로, 회귀 판정 문턱은 같은 러너에서 A/A로 잰 변동보다 크게 잡습니다.

## 자주 하는 실수

> ⚠️ N=1 또는 N=10

표본 수는 변동과 목표 정밀도에 맞춰 설계합니다. 평균·분산만으로 드문 꼬리 동작이 보장되지는 않습니다.

> ⚠️ Warmup 없이

위 측정에서 첫 반복은 2~11번째의 약 5~6배였습니다. 반복별 값을 찍어 안정되는 지점을 보고 버릴 횟수를 정합니다.

> ⚠️ Different workload 비교

apples to oranges 비교가 됩니다. 같은 input과 환경을 써야 합니다.

> ⚠️ Compiler가 result를 최적화로 제거

warmup 측정의 첫 버전은 12회 반복이 모두 0.0 µs였습니다. 결과가 비현실적으로 작으면 어셈블리를 보고, 필요한 메모리를 asm barrier나 `benchmark::DoNotOptimize`로 붙잡습니다.

## 정리

- 벤치마크는 **재현 + 대표 + 안정 + 격리 + 측정**의 다섯 가지가 핵심입니다.
- 4 MiB 버퍼 작업의 첫 반복은 페이지 fault 256번 때문에 2~11번째의 약 5~6배였습니다. warmup 횟수는 반복별 값을 보고 정합니다.
- CoreMark는 README의 성능·검증 두 실행과 보고 형식을 지켜야 비교할 수 있습니다. Dhrystone은 생성된 코드를 확인해야 합니다.
- Linux의 격리 설정은 내 환경에 실제로 있는지부터 확인합니다. `isolcpus`는 커널 문서에서 deprecated입니다.
- A/B 전에 A/A를 돌립니다. M2 Pro의 A/A는 중앙값 3.3% 차이에 p = 0.12, 벡터화 on/off는 p = 4.3×10⁻⁸이었습니다.

다음 편은 **성능 모델링**입니다. Amdahl과 Roofline을 다룹니다.

## 관련 항목

- [1-05: 실시간 성능 분석](/blog/embedded/performance-engineering/part1-05-realtime)
- [1-07: 성능 모델링](/blog/embedded/performance-engineering/part1-07-modeling)
- [CoreMark](https://www.eembc.org/coremark/)

## 참고 자료

- [EEMBC CoreMark run rules and reporting](https://github.com/eembc/coremark/blob/main/README.md)
- Linux v6.12: `Documentation/admin-guide/kernel-parameters.txt`(isolcpus), `admin-guide/sysctl/kernel.rst`(randomize_va_space), `admin-guide/pm/cpufreq.rst`(performance governor)
- [Dhrystone 2.1 C 소스 헤더 (riscv-tests)](https://github.com/riscv-software-src/riscv-tests/blob/master/benchmarks/dhrystone/dhrystone.h)
- [SPEC CPU 2017](https://www.spec.org/cpu2017/)
- [Google Benchmark](https://github.com/google/benchmark)
