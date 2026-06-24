---
title: "NPU·GPU에서의 HBM 활용 — Weight·Activation·KV Cache 배치 분석"
date: 2026-05-16T09:08:00
description: "Weight·activation·KV cache — HBM 자리잡기와 시리즈 마무리."
series: "HBM·GDDR 심화"
seriesOrder: 8
tags: [hbm, npu, gpu, llm-serving]
draft: false
---

## 한 줄 요약

> **"LLM inference의 *HBM 점유*는 *weight·activation·KV cache* 세 부분으로 갈립니다."** — 70B 모델 *weight 140 GB*, batch 128 *activation 40 GB*, *KV cache는 sequence 길이에 비례*해 *50~200 GB*까지 늘어납니다. *KV cache가 진짜 메모리 폭증의 원인*입니다. 시리즈를 마무리하며 *카드급 사례*와 *CXL·UALink와의 결합*까지 봅니다.

[Ch 7](/blog/embedded/hardware/hbm/chapter07-memory-controller)에서 *컨트롤러의 내부*를 봤습니다. 이번 마지막 장은 *AI workload가 HBM을 어떻게 채우는지*입니다. 시리즈를 마무리하면서 *현세대 AI 가속기 사례*와 *HBM 너머의 메모리 tiering*까지 정리합니다.

## LLM inference의 메모리 분해

LLaMA 70B 모델을 *batch 128, sequence 2048*로 서빙한다고 합시다.

```text
LLaMA 70B inference (FP16, batch 128, seq 2048)

Weight (정적, 모델 자체):
  70 B parameter × 2 byte = 140 GB

Activation (per-token, batch 분담):
  hidden_size 8192 × layer 80 × batch 128 × seq 1
  = 8192 × 80 × 128 × 2 / 1024³
  = 167 MB per token (decode)

KV cache (sequence에 비례):
  per token: hidden × 2 (K, V) × layer × dtype
           = 8192 × 2 × 80 × 2 byte = 2.5 MB per token
  
  batch 128 × seq 2048 × 2.5 MB
  = 128 × 2048 × 2.5 MB / 1024
  = 640 GB

총 메모리: 140 + 0.17 + 640 = 약 780 GB
```

*KV cache가 weight보다 4배 큽니다*. 이게 *LLM serving의 메모리 폭증*입니다.

| 가속기 | HBM capacity (공개 자료 기준) | 한 장으로 가능한 것 |
|--------|------------------------------|---------------------|
| NVIDIA H100 80 GB | 80 GB | LLaMA 70B FP16 weight도 단독 안 됨 |
| NVIDIA H200 | 141 GB | weight + 짧은 KV |
| NVIDIA B200 | 192 GB | weight + 중간 KV |
| AMD MI300X | 192 GB | weight + 중간 KV |
| AMD MI325X | 256 GB | LLaMA 70B + 큰 KV |

H100 *80 GB*로 LLaMA 70B를 *serving하려면* *모델 4분할 + KV cache 별도 호스트*가 필요합니다. H200·B200으로 가야 *한 장에 weight*가 들어갑니다.

## Weight 저장

weight는 *학습 후 정적*이고 *모든 추론에서 그대로 읽힙니다*.

**Weight layout in HBM** — 전형적 매핑은 *한 layer를 여러 stack에 분산*. Layer 0의 Q/K/V·FFN을 stack 0..7로 쪼개고, Layer 1도 같은 방식.

**Layout 규칙**

| 규칙 | 의미 |
|------|------|
| Channel-aware allocation | layer 한 개를 stack 1개에 몰면 다른 stack idle → layer를 stack에 분산해 동시 가동 |
| Same channel parallel access | 같은 layer의 weight tile을 같은 channel에 묶으면 bank conflict 발생 → tile boundary와 channel boundary를 misalign |

NVIDIA TensorRT-LLM과 vLLM은 *weight를 자동으로 channel-aware*하게 *layout*합니다. *수동 tuning*은 거의 사라졌습니다.

## Activation — batch와 sequence

activation은 *forward pass 중 layer 입출력*입니다. *batch와 sequence가 곱*입니다.

**Activation memory**

| 단계 | Shape | Size per layer | 비고 |
|------|-------|----------------|------|
| Prefill (입력 prompt encoding) | `(batch × seq_in × hidden) = (128 × 2048 × 8192)` | `128 × 2048 × 8192 × 2 B = 4 GB` | layer마다 reuse 가능 → peak ≈ `2 × max(layer_input, layer_output) ≈ 8 GB` |
| Decode (토큰 하나씩) | `(batch × 1 × hidden) = (128 × 1 × 8192)` | `128 × 8192 × 2 B = 2 MB` | 매우 작음 |

prefill은 *throughput bound*, decode는 *latency bound*입니다. *activation memory 자체*는 *KV cache에 비하면 작습니다*.

## KV cache — 메모리 폭증의 원인

attention 연산은 *과거 모든 토큰의 K, V*를 *현재 query*가 *참조*합니다. 이것을 *재계산 안 하려고* *KV cache*에 저장합니다.

**KV cache size**

| 단위 | Attention | K | V | total |
|------|-----------|---|---|-------|
| per layer per token | Vanilla MHA | 16 KB | 16 KB | 32 KB |
| per layer per token | GQA (group 8) | 2 KB | 2 KB | 4 KB |
| per token (80 layer) | Vanilla MHA | — | — | 2.5 MB |
| per token (80 layer) | GQA | — | — | 320 KB |
| batch 128 × seq 2048 | Vanilla MHA | — | — | **640 GB** |
| batch 128 × seq 2048 | GQA | — | — | **80 GB** |

*GQA*가 *KV cache를 8배 줄였습니다*. LLaMA 2 70B부터 *GQA가 표준*입니다.

**KV cache access pattern** — decode 단계의 매 토큰

```python
for layer in 80:
    Q = compute(activation)
    K, V = compute(activation)               # new token push

    # read past K, V for attention
    for past_token in past_tokens:
        attention += Q @ K[past_token].T

    # weighted sum with V
    output = sum(attention * V[past_token])
```

**Memory traffic per layer per token**

| 종류 | 크기 |
|------|------|
| Weight read | 2 GB (FFN + attention weights) |
| KV cache read | `past_len × 4 KB` (GQA) |

Sequence가 길어질수록 KV traffic이 증가 → **long context inference는 KV bound**.

8K context: KV traffic이 weight traffic의 *2배*. 128K context: *32배*. *long context*가 *memory bound의 극단*입니다.

## Memory layout — tiling 전략

GPU/NPU kernel은 *HBM access pattern*을 *명시적으로 tiling*합니다.

```c
// CUDA matmul tiling 의사 코드
__global__ void matmul_tiled(
    half *A,    // M × K, in HBM
    half *B,    // K × N, in HBM
    half *C,    // M × N, in HBM
    int M, int N, int K
) {
    // 1. block-level tile
    __shared__ half tileA[128][32];
    __shared__ half tileB[32][128];
    
    int row = blockIdx.y * 128 + threadIdx.y;
    int col = blockIdx.x * 128 + threadIdx.x;
    
    float sum = 0;
    
    // 2. tile loop
    for (int t = 0; t < K; t += 32) {
        // load tile A from HBM → shared
        tileA[threadIdx.y][threadIdx.x] = A[row * K + t + threadIdx.x];
        // load tile B from HBM → shared
        tileB[threadIdx.y][threadIdx.x] = B[(t + threadIdx.y) * N + col];
        __syncthreads();
        
        // compute on shared (fast)
        for (int k = 0; k < 32; k++) {
            sum += tileA[threadIdx.y][k] * tileB[k][threadIdx.x];
        }
        __syncthreads();
    }
    
    C[row * N + col] = sum;
}
```

핵심은 *shared memory(on-chip)에 tile 단위로 load*하고 *재사용*해 *HBM access*를 *최소화*하는 것입니다.

```text
tile size 선택

tile 1024 byte (32×32 half):
  - shared memory 사용: 작음
  - HBM access 빈번
  - bandwidth bound

tile 16 KB (128×64 half):
  - shared memory 한계 근접
  - HBM access 적음
  - compute bound로 이동 가능

H100 shared memory: 228 KB per SM
  → tile 64 KB까지 안전
```

*Flash Attention*은 *attention 자체를 tile*해서 *KV cache를 fully on-chip*에 올립니다. *long context의 game changer*입니다.

## MFU·MBU의 현실

대표적인 inference workload의 *측정치*입니다.

LLaMA 70B inference on H100(FP16)의 측정치는 다음과 같습니다.

| 단계 | latency | MFU | MBU | 특징 |
|------|---------|-----|-----|------|
| prefill (seq=2048, batch=1) | 80 ms | 35% | 50% | compute bound (큰 matmul) |
| decode (batch=1) | 30 ms/token | 5% | 80% | memory bound (small batch matmul) |
| decode (batch=64) | 50 ms/token | 30% | 75% | weight read를 batch에 amortize |

*batch가 클수록 MFU 상승*합니다. weight read가 *batch 전체에 amortize*되기 때문입니다. *batch 1*에서는 *weight 140 GB*를 *읽기만 하면 42 ms*인데 *batch 64*에서는 *그대로 42 ms*입니다 (capacity 한계까지).

```text
batch scaling

batch 1:    weight read 1회 × 42 ms = 42 ms / token
batch 64:   weight read 1회 × 42 ms = 0.65 ms / token (이론)
            실제 50 ms × token 도달 (limited by FLOPS)

batch sweet spot:
  H100 80 GB: batch 16~32
  H200 141 GB: batch 32~64
  B200 192 GB: batch 64~128
```

## 카드급 사례

현세대 AI 가속기 카드의 *HBM 구성*입니다.

| 카드 | HBM 구성 | capacity | spec BW | TDP |
|------|----------|----------|---------|-----|
| NVIDIA H100 80GB SXM5 | 5 × HBM3 × 16 GB | 80 GB | 3.35 TB/s | 700 W |
| NVIDIA H200 SXM5 | 6 × HBM3E × 24 GB | 141 GB | 4.8 TB/s | 700 W (liquid) |
| NVIDIA B100 / B200 SXM6 | 8 × HBM3E × 24 GB | 192 GB | 8 TB/s | 1000 W (liquid 필수) |
| NVIDIA B300 (Blackwell Ultra, 2026) | 8 × HBM3E × 36 GB (12-Hi) | 288 GB | 8 TB/s | 1400 W |
| AMD MI300X | 8 × HBM3 × 24 GB (chiplet) | 192 GB | 5.3 TB/s | 750 W |
| AMD MI325X | 8 × HBM3E × 32 GB | 256 GB | 6.0 TB/s | 750 W |
| Google TPU v5p | 4 × HBM3 | 95 GB | 2.8 TB/s | — |

한국 NPU의 경우입니다.

| 칩 | 메모리 | capacity | 특징 |
|-----|--------|----------|------|
| Rebellions REBEL-Quad (Hot Chips 2025) | HBM3E (4-chiplet, UCIe) | 144 GB | 1 PFLOPS FP16, 300 W. ATOM(전세대)은 16 GB GDDR6 |
| Sapeon X330 | GDDR (HBM 아님!) | — | inference 전용, FP8 367 TFLOPS @ 120 W. Sapeon은 Rebellions와 합병 |
| Samsung MACH-1 (연구 중) | HBM die 일부를 PIM | — | on-die 가속으로 memory traffic 자체 감소 |

## CXL과의 결합 — Memory Tiering

*HBM 192 GB*로도 *대형 LLM weight + 전체 KV cache*를 *담지 못합니다*. *CXL*이 *낮은 tier*의 메모리를 제공합니다.

![AI 가속기의 메모리 tiering — SRAM / HBM / CXL / NVMe / 네트워크 메모리](/images/blog/hardware/hbm/diagrams/ch08-tiering.svg)

LLM serving 매핑은 다음과 같습니다.

- *hot KV cache* → HBM
- *warm KV cache* → CXL
- *cold KV cache* → SSD
- *weight (정적)* → HBM (전부 캐시)

vLLM·SGLang 같은 *현세대 serving framework*는 *KV cache를 tier 1~3에 자동 분산*합니다. *paged attention*이라고 부르는 기법이 *대표적*입니다.

## UALink — GPU 간 메모리 공유

여러 GPU가 *서로의 HBM을 직접 access*하는 *UALink*는 *2024년 컨소시엄 결성*, *2025년 4월 200G 1.0 spec 비준*으로 이어졌습니다.

**UALink vs NVLink**

| 항목 | NVLink (NVIDIA proprietary) | UALink (open consortium) |
|------|-----------------------------|--------------------------|
| 세대 / spec | 4세대(GH200)·5세대(B200/GB200) | 200G 1.0 (2025-04 비준) |
| 신호 속도 | — | 200 Gbps/lane (4-lane station = 800 Gbps) |
| GPU 당 집계 BW | B200 1.8 TB/s · GH200 900 GB/s | — |
| Fabric 규모 | NVLink switch 기반 | 1024 accelerator까지 |
| Cache coherent | O | O |
| 양산 | 출시 중 | 제품화 2026+ |

UALink 컨소시엄: AMD, Broadcom, Cisco, Google, HPE, Intel, Meta, Microsoft.

**GPU 간 HBM 공유 효과** — weight 한 GPU에 두고 나머지 GPU가 직접 access. weight replication을 줄여 *더 큰 모델 서빙* 가능.

[UALink 시리즈](/blog/embedded/hardware/ualink/chapter01-overview)에서 자세히 다룹니다.

## 시리즈 마무리

HBM·GDDR 8개 장을 *지났습니다*. 시리즈를 한 줄씩 정리합니다.

| Ch | 주제 | 핵심 |
|----|------|------|
| 1 | HBM과 GDDR 분기 | bus width vs pin rate |
| 2 | HBM 스택 구조 | base die + DRAM die × N + TSV |
| 3 | 세대 비교 | HBM2 → HBM3E → HBM4 |
| 4 | GDDR 진화 | NRZ → PAM4 → PAM3 |
| 5 | 대역폭 병목 | sustained BW, roofline, memory wall |
| 6 | 열·전력 | refresh, ASR, liquid cooling |
| 7 | 메모리 컨트롤러 | bank scheduling, XOR mapping |
| 8 | NPU·GPU 활용 | weight, KV cache, tiering |

## 추천 후속 시리즈

이 시리즈와 *직접 연결*되는 *세 시리즈*를 추천합니다.

| # | 시리즈 | 연관 |
|---|--------|------|
| 1 | UCIe | HBM stack이 interposer에 붙는 것과 같은 방식으로 로직 칩렛이 붙음 — 패키징 차원에서 함께 이해 |
| 2 | BoW | 또 다른 die-to-die 표준. HBM과 함께 사용 가능 (개방형 인터커넥트) |
| 3 | CXL | HBM 너머의 메모리 풀링, Tier 2 메모리 확장 |
| 4 | UALink | GPU 간 HBM 공유, Tier 4 네트워크 메모리 |
| 5 | DDR | DRAM의 가장 일반적인 형태, CPU 메인 메모리 |
| 6 | NVMe | Tier 3 메모리 (LLM serving의 cold tier) |

## 자주 하는 실수

### "HBM capacity로 모든 LLM이 수용된다"

70B 모델 *weight 140 GB*는 H200(141 GB)에 *겨우 들어갑니다*. *KV cache 80 GB*까지 합치면 *어느 H200도 못 담습니다*. *최소 2장 분할*이 필수입니다. *카드 capacity*만 보고 *수용 가능*을 판단하면 *오답*입니다.

### KV cache를 *작다고 가정*

GQA로 줄여도 *64 GB+*가 나오기 일쑤입니다. *long context*는 *더 늘어납니다*. *paged attention* 같은 *동적 관리*가 *필수*입니다.

### tile size를 *수동 tuning*하려는 시도

NVIDIA TensorRT, vLLM, AMD ROCm 모두 *autotuner*가 들어 있습니다. *수동 tile*은 *autotuner를 이기기 어렵습니다*. 새 모델·새 GPU에서 *autotuner를 신뢰*하는 게 안전합니다.

### "batch 1 inference에 H100을 사주면 빠르다"

batch 1은 *MFU 5%*입니다. *H100의 1000 TFLOPS 중 50 TFLOPS만 사용*입니다. *latency*는 *H200*과 *비슷*하기도 합니다. *batch가 작은 사용처*에서는 *L40·L4 같은 GDDR 카드*가 *비용 효율적*입니다.

### *HBM capacity를 늘리면* 무조건 *throughput*이 늘어난다는 가정

capacity가 늘면 *batch를 키울 수 있고* throughput이 늘긴 합니다. 하지만 *batch가 어느 점*을 넘으면 *latency가 SLA를 깨고*, *MBU 상한*에 닿아 *gain이 멈춥니다*. *capacity와 bandwidth의 균형*이 핵심입니다.

## 정리

- LLM inference 메모리는 *weight·activation·KV cache*로 갈리고, *KV cache가 최대 폭증 원인*입니다.
- *70B FP16 weight*는 *140 GB*, GQA *KV cache*는 *80~640 GB*입니다.
- *channel-aware allocation*과 *tile-based access*가 *HBM 효율*을 결정합니다.
- *MFU와 MBU*를 같이 봐야 *진짜 병목*이 보입니다. decode는 *MBU 80%, MFU 5%*가 흔합니다.
- *batch가 클수록 MFU 상승*하지만 *latency도 증가*합니다.
- 현세대 카드는 H100(80GB) → H200(141GB) → B200(192GB) → MI325X(256GB) → B300(288GB) 순으로 *capacity가 빠르게 증가*합니다.
- *CXL은 Tier 2 메모리*, *UALink는 GPU 간 HBM 공유*, *NVMe는 Tier 3 cold tier*입니다.
- 한국 NPU(Rebellions Atom, Sapeon X330)는 *HBM 채택*과 *GDDR 채택*이 *섞여 있습니다*.
- 시리즈는 끝났지만 *UCIe·BoW·CXL·UALink* 시리즈와 *함께 읽으면* *현세대 패키징·메모리 시스템*의 전체 그림이 보입니다.

## 추천 후속 시리즈

- UCIe Ch 1: 개요 — 칩렛 표준의 핵심
- BoW Ch 1: 개요 — open die-to-die 표준
- CXL Ch 1: 개요 — HBM 너머의 메모리
- UALink Ch 1: 개요 — GPU 간 메모리 fabric

## 관련 항목

- [Ch 1: 고대역 메모리 개요](/blog/embedded/hardware/hbm/chapter01-overview)
- [Ch 5: 대역폭 계산과 병목 분석](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)
- [Ch 7: 메모리 컨트롤러 인터페이스](/blog/embedded/hardware/hbm/chapter07-memory-controller)
- CXL Ch 8: ML 가속기 — HBM과 CXL의 조합
- UCIe Ch 12: case studies — 칩렛 + HBM 실제 사례
