---
title: "메모리 대역폭 병목 분석 — 공칭값·측정 기준·Roofline"
slug: "embedded/hardware/hbm/chapter05-bandwidth-bottleneck"
date: 2026-05-16T09:05:00
description: "공칭 대역폭과 관측한 트래픽을 구분하고, roofline과 가상 읽기 시간 하한을 계산합니다."
series: "HBM·GDDR 심화"
seriesOrder: 5
tags: [hbm, bandwidth, roofline, bottleneck]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"데이터시트 대역폭은 *peak*입니다. 실제로 쓰는 대역폭은 그보다 낮습니다."** — 이 글에서 직접 잰 Apple M2 Pro는 공칭 200 GB/s에 Triad 153 GB/s였습니다. 이 측정은 차이의 원인을 분리하지 않았지만, 아래에서 DRAM 쪽 손실 요인을 짚습니다. 그리고 batch 1 LLM decode 같은 연산은 *연산보다 메모리를 먼저 다 씁니다*. V100에서 H100까지 연산 성능은 약 8배, HBM 대역폭은 약 3.7배 늘어 그 간격이 벌어졌습니다. 이것이 *memory wall*입니다.

[Ch 4](/blog/embedded/hardware/hbm/chapter04-gddr)에서 *GDDR signaling의 진화*를 봤습니다. 이번 장은 *대역폭이 실제로 어떻게 쓰이는지*입니다.

## Theoretical BW의 계산

먼저 *공칭 대역폭*은 단순합니다.

공식은 `BW(GB/s) = pin rate(Gbps) × DQ width ÷ 8`입니다.

| 구성 | 입력값 | 산술 결과 |
|---|---|---|
| HBM3 | 6.4 × 1024 ÷ 8 | 819.2 GB/s |
| HBM3E의 9.6 Gbps 등급 | 9.6 × 1024 ÷ 8 | 1228.8 GB/s |
| 최초 HBM4 표준 기준 | 8 × 2048 ÷ 8 | 2048 GB/s |
| GDDR6X x32 예 | 21 × 32 ÷ 8 | 84 GB/s |

기준 발표와 속도 등급은 [Ch 3](/blog/embedded/hardware/hbm/chapter03-hbm-generations)을 참조합니다. HBM3 5 stack을 6.4 Gbps로 계산하면 `5 × 819.2 = 4096 GB/s`입니다.

H100의 *3.35 TB/s*는 HBM3를 *정격(6.4 Gbps)보다 낮은 속도*로 돌린 *peak*입니다. stack 5개로 역산하면 pin당 `3,350 × 8 ÷ 5,120 ≈ 5.23 Gb/s`입니다([Ch 1](/blog/embedded/hardware/hbm/chapter01-overview)). 효율 손실을 뺀 값이 아닙니다. NVIDIA도 [Volta 백서](https://images.nvidia.com/content/volta-architecture/pdf/volta-architecture-whitepaper.pdf)에서 V100의 900 GB/s peak에 대해 *많은 workload에서 최대 95%의 메모리 대역폭 사용률*을 냈다고 적어, peak와 실제 사용량을 구별합니다.

## 효율 손실 — 어디로 가는가

peak에서 *실제로 쓰는 대역폭*까지의 갭은 다음 요인에서 옵니다.

- **refresh** — HBM 컨트롤러 문서 [AMD PG276](https://docs.amd.com/r/en-US/pg276-axi-hbm/Features)이 refresh *overhead를 줄이는* hidden single row refresh 옵션을 따로 둡니다.
- **row activation** — PG276: bank의 열린 row는 하나이고, 다른 row로 가려면 지금 row를 *precharge한 뒤 activate*해야 합니다.
- **bank conflict** — 같은 이유로 여러 요청이 *같은 bank의 다른 row*를 노리면 그 순서대로 PRE·ACT를 거칩니다.
- **방향 전환** — PG276: HBM stack은 전기적 인터페이스가 하나라 write 뒤 read 사이에 *bus turnaround* 시간이 듭니다.

각 요인이 몇 %를 깎는지를 세대별로 공개한 1차 자료는 찾지 못했습니다. 대신 컨트롤러가 이 요인들을 직접 겨냥한다는 것은 공개 문서에 나옵니다. [AMD PG276](https://docs.amd.com/r/en-US/pg276-axi-hbm/Features)의 HBM 컨트롤러 기능 목록에는 *temperature controlled refresh rate*, *overhead를 줄이는 hidden single row refresh*, *page opening activation overhead 최소화*, *Read/Write grouping*, *access reordering*이 들어 있습니다.

### Row activation latency

DRAM access는 *row를 먼저 activate*해야 *column read/write*가 가능합니다.

![DRAM access sequence — row open(ACT) → 같은 row 안의 RD 연속 → row close(PRE) → 새 row open. row hit는 burst 효율적, row miss는 PRE·ACT가 끼어든다](/images/blog/hardware/hbm/diagrams/ch05-row-access-sequence.svg)

*같은 row 안의 access(row hit)*는 *효율적*이지만, *random access*는 *row miss*가 많아 *bandwidth가 깎입니다*.

### Bank conflict

여러 *outstanding request*가 *같은 bank*를 노리면 *직렬화*됩니다.

![Bank conflict — bank 3에 다른 row 요청이 쌓여 직렬화되는 동안 bank 7은 곧바로 처리하므로 utilization이 저하된다](/images/blog/hardware/hbm/diagrams/ch05-bank-conflict.svg)

HBM3는 stack당 *16 channel*에 channel마다 pseudo channel이 2개라, 독립적으로 명령을 받는 단위가 많습니다. 컨트롤러는 *address mapping*으로 요청을 이 단위들에 고르게 흩어 conflict를 줄입니다.

## Achievable BW의 측정

실제 BW를 측정하는 가장 간단한 방법은 *STREAM* 방식의 Triad입니다. Triad는 `a[i] = b[i] + scalar × c[i]`이며, 원소당 입력 2회·출력 1회, FP64라면 24 byte를 셉니다.

GPU가 없는 이 글의 환경에서 같은 측정을 Apple M2 Pro(MacBook Pro 16-inch 2023, 32 GB)에 직접 해 봤습니다. [Apple 기술 사양](https://support.apple.com/en-us/111838)은 M2 Pro의 메모리 대역폭을 *200 GB/s*로 적습니다. 배열 3개 × 64 Mi 원소 × 8 byte = 1.5 GiB로 캐시보다 충분히 크게 잡았고, pthread로 원소를 나눠 10회 중 최소 시간을 씁니다.

```c title="triad.c"
// STREAM-style Triad a[i] = b[i] + s*c[i], pthreads, best of R runs.
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>
typedef struct { double *a, *b, *c; size_t lo, hi; } job;
static double s = 3.0;
static void *work(void *p) {
    job *j = p;
    for (size_t i = j->lo; i < j->hi; ++i) j->a[i] = j->b[i] + s * j->c[i];
    return NULL;
}
static double now(void) {
    struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t);
    return t.tv_sec + t.tv_nsec * 1e-9;
}
int main(int argc, char **argv) {
    size_t n = argc > 1 ? strtoull(argv[1], 0, 10) : 1u << 26;
    int T = argc > 2 ? atoi(argv[2]) : 8, R = 10;
    double *a = malloc(n * 8), *b = malloc(n * 8), *c = malloc(n * 8);
    if (!a || !b || !c || T < 1 || T > 64) return 1;
    for (size_t i = 0; i < n; ++i) { a[i] = 0; b[i] = 1; c[i] = 2; }
    pthread_t th[64]; job js[64]; double best = 1e9;
    for (int r = 0; r < R; ++r) {
        double t0 = now();
        for (int k = 0; k < T; ++k) {
            js[k] = (job){a, b, c, n * k / T, n * (k + 1) / T};
            pthread_create(&th[k], NULL, work, &js[k]);
        }
        for (int k = 0; k < T; ++k) pthread_join(th[k], NULL);
        double dt = now() - t0;
        if (dt < best) best = dt;
    }
    for (size_t i = 0; i < n; ++i) if (a[i] != 7.0) { puts("check failed"); return 2; }
    double bytes = 24.0 * n;
    printf("n=%zu threads=%d bytes=%.0f best=%.6f s triad=%.1f GB/s check=ok\n",
           n, T, bytes, best, bytes / best / 1e9);
    return 0;
}
```

macOS 27.2.1, Apple clang 21.0.0, `-O2`로 빌드해 thread 수를 바꿔 실행한 결과입니다.

```text
$ clang -O2 -o triad triad.c
$ for t in 1 2 4 8 12; do ./triad 67108864 $t; done
n=67108864 threads=1 bytes=1610612736 best=0.018165 s triad=88.7 GB/s check=ok
n=67108864 threads=2 bytes=1610612736 best=0.011150 s triad=144.4 GB/s check=ok
n=67108864 threads=4 bytes=1610612736 best=0.012064 s triad=133.5 GB/s check=ok
n=67108864 threads=8 bytes=1610612736 best=0.010524 s triad=153.0 GB/s check=ok
n=67108864 threads=12 bytes=1610612736 best=0.010635 s triad=151.4 GB/s check=ok
```

8 thread를 세 번 더 실행하면 152.0·152.3·152.4 GB/s였습니다. 가장 높은 153.0 GB/s도 공칭 200 GB/s의 `153.0 ÷ 200 = 76.5%`입니다. thread 1개로는 88.7 GB/s에 그쳐, 메모리 대역폭을 채우려면 동시에 떠 있는 요청이 많아야 한다는 것도 보입니다. 이 수치는 이 Mac의 unified memory 결과이며 HBM의 효율이 아닙니다. 같은 방법을 GPU에 쓰려면 [NVIDIA CUDA Samples](https://github.com/NVIDIA/cuda-samples)의 bandwidth 예제와 [CUDA 12.8.1 가이드](https://docs.nvidia.com/cuda/archive/12.8.1/cuda-c-programming-guide/index.html)가 출발점입니다. 이 글은 GPU 측정을 하지 않았습니다.

다음 계산기는 논리적 byte 수·시간·FLOP을 받아 roofline 값으로 환산합니다.

```js title="hbm-roofline.mjs"
export function roofline({bytes, seconds, flops, peakGBs, peakGFLOPs}) {
  if (![bytes, seconds, flops, peakGBs, peakGFLOPs].every(
      x => Number.isFinite(x) && x > 0)) throw new RangeError("positive finite inputs");
  const intensity = flops / bytes;
  const logicalGBs = bytes / seconds / 1e9;
  const knee = peakGFLOPs / peakGBs;
  const ceilingGFLOPs = Math.min(peakGFLOPs, peakGBs * intensity);
  if (![intensity, logicalGBs, knee, ceilingGFLOPs].every(
      x => Number.isFinite(x) && x > 0)) throw new RangeError("numeric range");
  return {intensity, logicalGBs, knee, ceilingGFLOPs};
}
```

FP64 Triad 원소 하나(24 byte, 2 FLOP)를 H100 SXM의 공칭 3,350 GB/s로 읽는다고 두고, 아래 roofline 절의 dense FP16 peak(약 989.5 TFLOPS)를 넣어 실행한 결과입니다.

```js
console.log(roofline({bytes: 24, seconds: 24 / 3350e9, flops: 2,
                      peakGBs: 3350, peakGFLOPs: 1979e3 / 2}));
```

```text
{
  intensity: 0.08333333333333333,
  logicalGBs: 3350,
  knee: 295.3731343283582,
  ceilingGFLOPs: 279.16666666666663
}
```

Triad는 intensity가 0.083이라, 공칭 대역폭을 다 쓴다고 해도 상한이 약 279 GFLOPS입니다. 연산 peak의 `279 ÷ 989,500 ≈ 0.03%`입니다. 정밀도가 다른 두 값(FP64 Triad와 FP16 Tensor peak)을 한 그림에 놓은 것은 memory bound의 정도를 보이기 위한 산술이며 H100 측정이 아닙니다.

## Roofline 모델

*Roofline*은 *compute와 memory bandwidth*의 관계를 *한 그림*에 보여 줍니다.

![Roofline 모델 — memory bound와 compute bound 영역, knee point](/images/blog/hardware/hbm/diagrams/ch05-roofline.svg)

knee = peak_compute / peak_BW입니다. [NVIDIA H100 제품 사양](https://www.nvidia.com/en-us/data-center/h100/)에서 H100 SXM은 FP16 Tensor Core가 *1,979 TFLOPS(\* with sparsity)*입니다. [Hopper 구조 설명](https://developer.nvidia.com/blog/nvidia-hopper-architecture-in-depth/)의 사양 표는 dense와 sparsity 값을 *1000 | 2000 TFLOPS*처럼 1:2로 나란히 적으므로, dense는 그 절반인 *약 990 TFLOPS*입니다. knee는 `990 TFLOPS ÷ 3.35 TB/s ≈ 295 FLOP/Byte`입니다.

*Arithmetic Intensity*는 *byte 1개당 몇 FLOP*를 하는지입니다. 몇 가지 연산을 직접 계산하면 다음과 같습니다.

| 연산 | 계산 | Intensity (FLOP/Byte) | H100 기준 |
|------|------|----------------------|-----------|
| Vector add (FP32) `a[i]=b[i]+c[i]` | 1 FLOP / (4 B × 3) | 0.083 | memory bound |
| GEMV, batch 1 (FP16 weight) | 2 FLOP / 2 B per weight | 약 1 | memory bound |
| GEMM N×N×N (FP16, 이상적 재사용) | 2N³ / (3N² × 2 B) = N/3 | N=1024: 341, N=16384: 5,461 | knee 위 |

LLM decode의 batch 1 연산은 GEMV에 가까워 *intensity가 1 근처*입니다. knee(295)보다 한참 아래라 *memory bound*입니다. batch를 B로 키우면 같은 weight로 B개 토큰을 계산하므로, 읽는 byte가 weight로 거의 정해지는 동안은 intensity가 B배가 됩니다. KV cache 읽기가 커지면 그만큼 덜 오릅니다([Ch 8](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)).

## Memory wall

이 절의 V100 입력은 [NVIDIA Volta 백서](https://images.nvidia.com/content/volta-architecture/pdf/volta-architecture-whitepaper.pdf), H100 입력은 앞의 제품 사양을 사용합니다. 다른 정밀도·sparsity·모델의 실측 성능을 비교한 값이 아닙니다.

*compute*와 *memory BW*의 *증가 속도 차이*가 *벌어지고 있습니다*.

| GPU | 출시 | FP16 Tensor (dense) | HBM BW | knee (FLOP/B) |
|-----|------|---------------------|--------|---------------|
| V100 | 2017 | 125 TFLOPS | 900 GB/s | 139 |
| H100 SXM | 2022 | 약 990 TFLOPS | 3.35 TB/s | 295 |
| 배율 | | 약 7.9배 | 약 3.7배 | 약 2.1배 |

knee가 *오른쪽으로 이동*하면 같은 workload라도 *memory bound* 쪽으로 밀립니다.

해결 방향은 *세 갈래*입니다.

1. **on-chip cache 늘리기** — Hopper 구조 설명에서 H100 SXM5의 L2는 *50 MB*입니다. [Ch 8](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)의 Llama 2 70B weight 140 GB와 비교하면 `140,000 ÷ 50 = 2,800`분의 1입니다.
2. **HBM 세대 진화** — stack당 대역폭은 2024년 SK hynix HBM3E가 `9.6 × 1024 ÷ 8 = 1,228.8 GB/s`, 2025년 HBM4 표준 발표가 `8 × 2048 ÷ 8 = 2,048 GB/s`입니다([Ch 3](/blog/embedded/hardware/hbm/chapter03-hbm-generations)).
3. **알고리즘 측에서 intensity 올리기** — batch 키우기, FlashAttention처럼 tile로 HBM 왕복 줄이기.

## LLM inference의 MBU

LLM 추론에서는 *Memory Bandwidth Utilization(MBU)*을 함께 봅니다. 추론은 두 단계로 나뉩니다.

1. **Prefill (prompt encoding)** — prompt 토큰을 한꺼번에 처리하므로 weight 하나를 여러 토큰이 재사용합니다. 위 batch와 같은 논리로 prompt 길이만큼 intensity가 오릅니다.
2. **Decode (token by token)** — 매 토큰마다 weight를 다시 읽고, sequence 길이에 비례해 KV cache를 추가로 읽습니다. memory bound입니다.

MBU를 논리적 byte 수/시간/공칭 BW로 정의했다면, 하드웨어 DRAM 활성 비율과 구별해 보고해야 합니다. MFU도 실행 FLOP 산정·정밀도·sparsity·시간 구간을 명시해야 합니다.

70B를 2 byte로 저장한 140 GB를 **가상의 단일 3.35 TB/s 메모리 경로**로 한 번 읽으면 `140/3350 ≈ 0.04179초`입니다. H100 SXM 80 GB 한 장에는 이 weight가 들어가지 않으므로 이것을 단일 H100의 Llama 2 70B 실행 latency라고 부를 수 없습니다.

여러 GPU로 나누면 각 GPU의 weight 분담·실제 BW·통신·실행 중첩으로 시간을 다시 계산해야 합니다. Batch는 weight 읽기 비용을 토큰 여러 개에 나누는 효과가 있지만, 사용자별 latency와 전체 token throughput은 서로 다른 지표입니다.

## 측정 도구

GPU에서 *어디가 병목*인지 보는 도구가 있습니다.

[Nsight Compute CLI 2023.1.1](https://docs.nvidia.com/nsight-compute/2023.1/pdf/NsightComputeCli.pdf)의 full set 예입니다. 설치된 버전과 권한·지원 GPU를 먼저 기록합니다.

```bash
ncu --version
ncu --set full ./inference
```

이 환경에는 NVIDIA GPU가 없어 profiling을 실행하지 않았고, 관측 수치는 제시하지 않습니다.


## 자주 하는 실수

### "spec BW를 그대로 capacity planning에 쓴다"

데이터시트 대역폭은 *peak*입니다. 위 M2 Pro 측정에서 순차 Triad조차 공칭의 76.5%였습니다. planning에는 측정값을 쓰고, 측정 조건(working set 크기, thread 수, 반복 중 최소/중앙값)을 함께 남깁니다.

### "BW가 부족하니 더 빠른 chip을 쓴다"

roofline의 상한은 `min(peak_compute, peak_BW × intensity)`입니다. intensity가 knee(H100 약 295)보다 큰 *compute bound 단계*에서는 앞 항이 상한을 정하므로 *BW를 늘려도 상한이 그대로*입니다. 위의 GEMM N=1024(341 FLOP/B)가 그런 예입니다. 어느 단계가 어느 쪽에 막히는지는 *Nsight Compute* 같은 profiler로 단계별로 봅니다.

### "STREAM이 충분한 벤치마크다"

STREAM은 *순차 access*입니다. 위 triad.c도 연속 배열을 thread별 연속 구간으로 나눠 읽습니다. 실제 LLM decode는 weight 순차 읽기에 *KV cache 접근*이 섞입니다. 그래서 Triad 결과는 그 기계의 *순차 대역폭 상한*으로 쓰고, workload 효율은 그 workload로 따로 잽니다.

### "MFU만 보면 시스템 효율을 안다"

MFU만 보면 *compute 사용률*은 알지만 *memory 사용률은 모릅니다*. batch 1 decode처럼 intensity가 1 근처인 단계는 roofline상 MFU가 `1 ÷ 295`, 0.3% 수준이 상한입니다. 이때 낮은 MFU는 이상이 아니라 memory bound의 결과이므로 *MBU와 함께* 봐야 합니다.

### bank conflict를 *컨트롤러 책임*으로만 가정

컨트롤러의 address mapping은 정해진 함수라, 그 함수와 어긋나는 stride로 몰리는 access는 같은 bank에 쌓입니다([Ch 7](/blog/embedded/hardware/hbm/chapter07-memory-controller)의 toy mapping 실행 참조). CUDA 쪽에서는 [CUDA 12.8.1 가이드](https://docs.nvidia.com/cuda/archive/12.8.1/cuda-c-programming-guide/index.html)가 설명하는 *coalesced access* 같은 software 쪽 배치가 함께 필요합니다.

## 정리

- *공칭 대역폭*은 `pin rate × bus width ÷ 8`이고, H100의 3.35 TB/s도 *peak*입니다.
- 실제 대역폭은 *refresh·row activation·bank conflict·명령 overhead*로 깎입니다. M2 Pro 실측 Triad는 공칭 200 GB/s의 76.5%(153.0 GB/s)였습니다.
- *Roofline*에서 H100의 knee는 *약 295 FLOP/Byte*입니다. batch 1 LLM decode는 intensity가 *약 1*이라 강한 memory bound입니다.
- V100 → H100에서 연산은 *약 7.9배*, 대역폭은 *약 3.7배* 늘어 knee가 *약 2배* 오른쪽으로 갔습니다.
- 140 GB/3.35 TB/s의 약 42 ms는 가상 경로의 weight 읽기 하한이며, 실제 다중 GPU latency가 아닙니다.
- Nsight Compute의 관측 범위와 논리적 BW·하드웨어 사용 비율을 구별합니다.

## 다음 편

[Ch 6: 열 설계와 전력 관리](/blog/embedded/hardware/hbm/chapter06-thermal-power)에서는 HBM stack의 *열 구조*, 온도와 *refresh*의 관계, *냉각 방식*과 *thermal throttling*을 봅니다.

## 관련 항목

- [Ch 3: HBM 세대 비교](/blog/embedded/hardware/hbm/chapter03-hbm-generations)
- [Ch 6: 열 설계와 전력 관리](/blog/embedded/hardware/hbm/chapter06-thermal-power)
- [Ch 8: NPU·GPU 활용](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)
