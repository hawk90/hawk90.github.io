---
title: "NPU·GPU에서의 HBM 활용 — Weight·Activation·KV Cache 배치 분석"
slug: "embedded/hardware/hbm/chapter08-npu-gpu-usage"
date: 2026-05-16T09:08:00
description: "Llama 2 70B의 GQA KV cache와 가상 용량 예산을 계산하고, GPU tiling·메모리 계층의 조건을 구분합니다."
series: "HBM·GDDR 심화"
seriesOrder: 8
tags: [hbm, npu, gpu, llm-serving]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"LLM inference의 *HBM 점유*는 *weight·activation·KV cache* 세 부분으로 갈립니다."** — Llama 2 70B는 *weight만 140 GB*이고, *KV cache는 batch와 sequence 길이에 정비례*해 batch 128에서 *seq 2048이면 86 GB, 4096이면 172 GB*가 됩니다. 길게 쓸수록 *KV cache가 weight를 넘어서는 것*이 메모리 폭증의 원인입니다. 뒤에서 *카드급 사례*와 *CXL·UALink와의 결합*도 봅니다.

[Ch 7](/blog/embedded/hardware/hbm/chapter07-memory-controller)에서 *컨트롤러의 내부*를 봤습니다. 이번 장은 *AI workload가 HBM을 어떻게 채우는지*입니다. *AI 가속기 사례*와 *HBM 너머의 메모리 tiering*까지 정리합니다.

## LLM inference의 메모리 분해

Llama 2 70B 모델을 *batch 128, sequence 2048*로 서빙한다고 합시다. [Llama 2 논문](https://arxiv.org/abs/2307.09288)과 [Meta fairseq2의 llama2_70b 구성](https://facebookresearch.github.io/fairseq2/stable/_modules/fairseq2/models/llama/config.html)을 기준으로 layer 80개, hidden 8192, attention head 64개, KV head 8개(GQA)·학습 context 4096을 사용합니다. Weight의 140 GB는 정확한 tensor별 checkpoint 크기가 아닌 70B×2 byte의 반올림 모델입니다. 아래 모든 GB·MB는 십진 단위입니다.

| 항목 | 가정과 계산 | 결과 |
|---|---|---|
| Weight | 70×10⁹ parameter × 2 B | 140 GB |
| Decode hidden tensor 1개 | 8192 × 128 × 2 B | 2.097152 MB |
| KV / token, 전체 layer | 2 × 80 × 8 × 128 × 2 B | 327,680 B |
| KV / batch128·seq2048 | 327680 × 128 × 2048 | 85.899345920 GB |
| Weight + KV | 140 + 85.899345920 | 225.899345920 GB |

마지막 행은 **activation·attention/MLP 중간값·workspace·allocator·KV block 여유·통신 buffer를 제외한 소계**입니다. Hidden tensor 80개를 단순 합산한 값이나 입력/출력 두 개만으로 실제 activation peak를 정할 수 없습니다.

seq 2048에서는 KV cache(86 GB)가 weight(140 GB)보다 작습니다. 하지만 KV cache는 *sequence에 정비례*합니다. Llama 2의 최대 길이인 *4096*으로 늘리면 *172 GB*가 되어 weight를 넘습니다. GQA가 없었다면, 곧 KV head가 attention head와 같은 64개였다면 seq 2048에서도 *8배인 687 GB*였을 것입니다. GQA가 줄이려는 것이 바로 이 메모리입니다.

| 가속기 | HBM capacity | weight 140 GB를 넣고 남는 용량 |
|--------|--------------|-------------------------------|
| NVIDIA H100 SXM | 80 GB | 부족 (weight도 단독으로 안 들어감) |
| NVIDIA H200 | 141 GB | `141 − 140 = 1 GB` |
| NVIDIA B200 (DGX B200 1,440 GB ÷ 8) | 180 GB | `180 − 140 = 40 GB` |
| AMD MI300X | 192 GB | `192 − 140 = 52 GB` |
| AMD MI325X | 256 GB | `256 − 140 = 116 GB` |

용량은 [H100](https://www.nvidia.com/en-us/data-center/h100/)·[H200](https://www.nvidia.com/en-us/data-center/h200/)·[DGX B200](https://www.nvidia.com/en-eu/data-center/dgx-b200/)·[MI300X](https://www.amd.com/en/products/accelerators/instinct/mi300/mi300x.html)·[MI325X](https://www.amd.com/en/products/accelerators/instinct/mi300/mi325x.html) 제품 페이지의 공칭값입니다.

H100 80 GB 한 장에는 weight조차 들어가지 않아(`140 ÷ 80 = 1.75`) *최소 2장으로 나눠야* 합니다. H200은 weight는 들어가지만 KV cache 자리가 1 GB입니다. 위 표에서 weight+KV 소계 약 226 GB를 넘는 공칭 용량은 MI325X뿐입니다. 이 비교는 weight와 KV만 더한 소계이고, 위에서 뺀 activation·workspace·runtime 예약분은 들어 있지 않습니다.

## KV 소계를 직접 계산하기

다음 Node.js 계산기는 layer·KV head·head dimension·byte 수·batch·sequence 길이를 정수로 받아 KV 소계를 구합니다. 큰 모델을 실제로 메모리에 올리지 않으며, workspace나 allocator 비용은 포함하지 않습니다.

```js title="hbm-kv-budget.mjs"
export function kvBytes({layers, kvHeads, headDim, elementBytes, batch, sequence}) {
  const inputs = [layers, kvHeads, headDim, elementBytes, batch, sequence];
  if (!inputs.every(x => Number.isSafeInteger(x) && x > 0)) {
    throw new RangeError('positive safe integers required');
  }
  const result = inputs.reduce((product, value) => product * BigInt(value), 2n);
  return result;
}
const base = {layers:80, kvHeads:8, headDim:128, elementBytes:2, batch:128};
console.log(kvBytes({...base, sequence:2048}).toString());
console.log(kvBytes({...base, sequence:4096}).toString());
console.log(kvBytes({...base, kvHeads:64, sequence:2048}).toString());
console.log(kvBytes({...base, batch:1, sequence:1}).toString());
```

Node.js v24.21.0 실행 결과입니다. 순서대로 GQA seq 2048(86 GB), seq 4096(172 GB), KV head 64인 MHA 가정(687 GB), token 하나(327,680 B)입니다.

```text
$ node hbm-kv-budget.mjs
85899345920
171798691840
687194767360
327680
```

## Weight 저장

weight는 *학습 후 정적*이고 *모든 추론에서 그대로 읽힙니다*.

*같은 weight를 토큰마다 다시 읽는다*는 점이 decode가 메모리 대역폭을 많이 쓰는 이유입니다. layer 하나의 weight는 평균 *140 GB ÷ 80 = 1.75 GB*입니다.

## Activation — batch와 sequence

activation은 *forward pass 중 layer 입출력*입니다. *batch와 sequence가 곱*입니다.

**Activation memory**

| 단계 | Shape | Size per layer | 비고 |
|------|-------|----------------|------|
| Prefill (입력 prompt encoding) | `(batch × seq_in × hidden) = (128 × 2048 × 8192)` | `128 × 2048 × 8192 × 2 B = 4.294967296 GB` | hidden tensor 하나. 실제 peak 추정 아님 |
| Decode (토큰 하나씩) | `(batch × 1 × hidden) = (128 × 1 × 8192)` | `128 × 8192 × 2 B = 2.097152 MB` | hidden tensor 하나 |

각 행은 hidden tensor 하나의 크기입니다. 실제 peak activation은 MLP 중간 차원·attention 중간값까지 포함하므로 이보다 크며, 이 글에서는 측정하지 않았습니다.

## KV cache — 메모리 폭증의 원인

attention 연산은 *과거 모든 토큰의 K, V*를 *현재 query*가 *참조*합니다. 이것을 *재계산 안 하려고* *KV cache*에 저장합니다.

**KV cache size**

| 단위 | Attention | K | V | total |
|------|-----------|---|---|-------|
| per layer per token | Vanilla MHA (KV head 64) | 16.4 KB | 16.4 KB | 32.8 KB |
| per layer per token | GQA (KV head 8) | 2.0 KB | 2.0 KB | 4.1 KB |
| per token (80 layer) | Vanilla MHA | — | — | 2.6 MB |
| per token (80 layer) | GQA | — | — | 0.33 MB |
| batch 128 × seq 2048 | Vanilla MHA | — | — | **687 GB** |
| batch 128 × seq 2048 | GQA | — | — | **86 GB** |

*GQA*가 *KV cache를 `64 ÷ 8 = 8`배 줄였습니다*. Llama 2 논문은 *34B와 70B*가 GQA를 쓴다고 적습니다.

**KV cache access pattern** — decode 단계의 매 토큰

각 layer에서 새 토큰의 Q·K·V를 계산하고 K·V를 cache에 추가합니다. Query는 해당 KV head group의 과거 K에 점수를 계산한 뒤 scale·causal mask·softmax를 적용하고 V를 가중합합니다. GQA에서 query head와 KV head 수가 다르므로 단순 배열 합산으로 대신할 수 없습니다.

**Memory traffic per layer per token**

| 종류 | 크기 |
|------|------|
| Weight read | 약 1.75 GB (140 GB ÷ 80 layer) |
| KV cache read | `batch × past_len × 4.1 KB` (GQA) |

이 모델의 KV 읽기량은 context에 비례하고, weight 읽기량은 context와 무관합니다.

다음 8K·128K는 **Llama 2의 학습 context 4096을 넘는 산술 확장 사례이며 모델 품질·runtime 지원을 주장하지 않습니다**. batch 128 기준으로 계산하면, 8K context에서 layer당 KV read는 `128 × 8192 × 4096 B = 4.29 GB`로 weight(1.75 GB)의 `4.29 ÷ 1.75 ≈ 2.5배`입니다. 128K context에서는 `128 × 131072 × 4096 B = 68.7 GB`, `68.7 ÷ 1.75 ≈ 39배`입니다.

## Memory layout — tiling 전략

GPU/NPU kernel은 *HBM access pattern*을 *명시적으로 tiling*합니다.

원소를 여러 thread가 나눠 읽고 shared memory에서 재사용하려면 load 범위·thread block·경계 padding·barrier가 함께 맞아야 합니다. [CUDA 12.8.1의 Shared Memory 예제](https://docs.nvidia.com/cuda/archive/12.8.1/cuda-c-programming-guide/index.html#shared-memory)는 block tile의 load→동기화→계산→동기화를 설명합니다. 해당 예제의 행렬 크기 배수 전제와 이 장의 임의 크기 문제를 혼동하면 안 됩니다.

128×128 thread block은 16,384 thread입니다. CUDA 12.8.1 가이드는 *현재 GPU에서 thread block 하나는 최대 1024 thread*라고 적으므로 이 크기는 launch할 수 없습니다. 출력 tile 128×128을 사용하려면 thread당 여러 결과를 맡기는 별도 thread mapping이 필요합니다. 출력 tile 크기와 blockDim을 같다고 가정하지 않습니다.

핵심은 *shared memory(on-chip)에 tile 단위로 load*하고 *재사용*해 *HBM access*를 *최소화*하는 것입니다.

| FP16 tile 하나 | byte 수 | 주의점 |
|---|---|---|
| 32×32 | 2048 B | 입력 하나의 크기 |
| 128×64 | 16384 B | 입력 하나의 크기 |

GEMM은 A·B 두 입력의 tile을 함께 올리므로 shared memory 사용량은 위 값의 두 배 이상입니다.

[FlashAttention 논문](https://arxiv.org/abs/2205.14135)은 *tiling으로 GPU HBM과 on-chip SRAM 사이의 메모리 읽기·쓰기 횟수를 줄이는* IO-aware exact attention 알고리즘입니다. 논문 Figure 1의 설명대로 큰 *N × N attention 행렬을 HBM에 만들지 않는* 것이 핵심입니다.

## Decode는 왜 batch를 키우는가

decode는 *토큰 하나를 만들 때마다 weight 전체를 한 번 읽습니다*. 가상 3.35 TB/s 경로에서 weight 140 GB를 한 번 읽는 산술값은 `140 ÷ 3,350 = 0.0418 s`, 약 42 ms입니다. H100 SXM 80 GB 한 장의 실제 실행값이 아니며, 실제 분산에서는 GPU별 weight 분담과 통신을 포함해 다시 계산해야 합니다.

이 가상 읽기 비용을 batch 전체에 나눠 볼 수 있습니다. 실제 다중 GPU latency는 [Ch 5](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)의 조건대로 다시 계산해야 합니다. 가상 42 ms 경로에서 batch 64의 토큰당 분담은 `41.79 ÷ 64 ≈ 0.65 ms`입니다. 이는 전체 token throughput의 역수에 해당하는 비용 예이며, 각 사용자가 0.65 ms마다 다음 토큰을 받는다는 뜻은 아닙니다. batch를 키울수록 weight read가 *amortize*되고, 결국 계산량이나 KV cache 용량이 다음 한계가 됩니다.

## 카드급 사례

AI 가속기 카드의 *HBM 구성*입니다. stack 구성은 벤더가 공개한 경우만 적었습니다.

| 카드 | HBM | stack 구성 | capacity | spec BW | TDP |
|------|-----|-----------|----------|---------|-----|
| NVIDIA H100 SXM5 | HBM3 | 5 stack ([Hopper 구조 설명](https://developer.nvidia.com/blog/nvidia-hopper-architecture-in-depth/)) | 80 GB | 3.35 TB/s | 최대 700 W |
| NVIDIA H200 SXM | HBM3e | — | 141 GB | 4.8 TB/s | 최대 700 W |
| NVIDIA B200 | HBM3e | — | 180 GB | 8 TB/s | TBD |
| AMD Instinct MI300X | HBM3 | — | 192 GB | 5.3 TB/s | 최대 TBP 750 W |
| AMD Instinct MI325X | HBM3E | — | 256 GB | 6 TB/s | TBP 1000 W peak |
| Google TPU v5p | HBM | — | 95 GiB (물리 96 GiB) | 2,765 GB/s | — |

이 표는 제품 발표 세대의 예이며 최신 SKU 순위가 아닙니다. B200은 DGX B200의 8 GPU 합계(1,440 GB, 64 TB/s)를 8로 나눈 값입니다. MI300X의 메모리 bus 8,192-bit는 AMD 각주(`8,192-bit × 5.2 Gbps ÷ 8 = 5.325 TB/s`)의 값입니다. [Google TPU v5p 문서](https://cloud.google.com/tpu/docs/v5p)는 chip당 물리 HBM이 96 GiB이고, 시스템과 libtpu runtime 예약분을 빼서 95 GiB로 적는다고 설명합니다. 공칭 용량과 runtime 가용 메모리가 다르다는 것을 벤더가 직접 밝힌 예입니다.

한국 NPU의 경우입니다.

| 칩 | 메모리 | capacity | 특징 |
|-----|--------|----------|------|
| [Rebellions Rebel100](https://rebellions.ai/rebellions-product/rebel100/) | HBM3E, 4.8 TB/s, chiplet 간 UCIe-Advanced | 144 GB | 1,024 TFLOPS FP16, 2,048 TFLOPS FP8, 최대 600 W |

## CXL과의 결합 — Memory Tiering

위 계산에서 H200 한 장은 Llama 2 70B weight를 넣고 1 GB가 남았습니다. 긴 context의 KV cache까지 담으려면 카드를 늘리거나, HBM 아래 *낮은 tier*의 메모리를 씁니다. *CXL*이 그 후보입니다.

![AI 가속기의 메모리 tiering — SRAM / HBM / CXL / NVMe / 네트워크 메모리](/images/blog/hardware/hbm/diagrams/ch08-tiering.svg)

다음은 **별도 offload runtime을 설계한다는 가정의 배치 정책**입니다. CXL 1.1 규격은 Type 3를 *호스트를 위한 memory expander*로 정의합니다([Ch 11](/blog/embedded/hardware/hbm/chapter11-cxl-device-types)). 그래서 아래 배치에서 CXL에 둔 KV cache는 GPU가 HBM처럼 바로 읽는 것이 아니라, 호스트 쪽 메모리에서 옮겨 와야 하는 데이터입니다.

- *hot KV cache* → HBM
- *warm KV cache* → CXL
- *cold KV cache* → SSD
- *weight (정적)* → HBM (전부 캐시)

[vLLM PagedAttention 논문](https://arxiv.org/abs/2309.06180)은 tier 분산이 아니라 *GPU 메모리 안의 KV cache 관리* 기법입니다. 논문은 OS의 *virtual memory와 paging*에서 착안해 KV cache를 블록 단위로 나누고, *KV cache 메모리 낭비를 거의 0*으로 줄이며 요청 사이·안에서 KV cache를 *유연하게 공유*한다고 적습니다.

## UALink — GPU 간 메모리 공유

여러 가속기가 *메모리 semantic(read·write·atomic)으로* 서로 통신하도록 잇는 open 표준이 *UALink*입니다. [UALink Consortium의 2025년 4월 8일 발표](https://ualinkconsortium.org/wp-content/uploads/2025/04/UALink-1.0-Specification-PR_FINAL.pdf)는 *UALink 200G 1.0 Specification*의 비준을 알리고, 한 AI computing pod에서 *가속기 최대 1,024개*를 *lane당 200G*로 scale-up 연결한다고 적습니다.

| 항목 | NVLink (NVIDIA) | UALink 200G 1.0 (open consortium) |
|------|-----------------|-----------------------------------|
| 신호 속도 | TBD | 200G per lane |
| GPU 당 집계 BW | B200 `14.4 ÷ 8 = 1.8 TB/s` | TBD |
| Fabric 규모 | DGX B200: NVSwitch 2개 | pod당 가속기 최대 1,024개 |

NVLink 열은 DGX B200 페이지의 *NVLink 14.4 TB/s aggregate bandwidth*와 *NVSwitch 2x*입니다. [UALink 1.0 개요 글(2025-05-15)](https://ualinkconsortium.org/blog/ualink-200g-1-0-specification-overview-802/)은 lane 4개를 묶은 station 하나가 v1.0에서 *최대 800 Gb/s*이고, coherency는 *software로 유지*한다고 설명합니다.

## Ch 1~8 정리

HBM·GDDR 부분인 Ch 1~8을 한 줄씩 정리합니다. Ch 9부터는 HBM 너머의 메모리인 *CXL.mem*으로 넘어갑니다.

| Ch | 주제 | 핵심 |
|----|------|------|
| 1 | HBM과 GDDR 분기 | bus width vs pin rate |
| 2 | HBM 스택 구조 | base die + DRAM die × N + TSV |
| 3 | 세대 비교 | HBM2 → HBM3E → HBM4 |
| 4 | GDDR 진화 | NRZ → PAM4 → PAM3 |
| 5 | 대역폭 병목 | sustained BW, roofline, memory wall |
| 6 | 열·전력 | refresh, liquid cooling |
| 7 | 메모리 컨트롤러 | bank scheduling, address mapping |
| 8 | NPU·GPU 활용 | weight, KV cache, tiering |

## 자주 하는 실수

### "HBM capacity로 모든 LLM이 수용된다"

70B 모델 *weight 140 GB*는 H200(141 GB)에 1 GB를 남기고 들어갑니다. batch 128·seq 2048의 *KV cache 86 GB*까지 합치면 226 GB라 *H200 한 장으로는 담을 수 없어* 여러 장으로 나눠야 합니다.

### KV cache를 *작다고 가정*

GQA로 8분의 1로 줄여도 batch 128·seq 2048에서 *86 GB*, seq 4096이면 *172 GB*입니다. KV cache는 *batch와 sequence에 정비례*합니다.

### "batch 1 decode는 GPU 계산력을 다 쓴다"

decode는 토큰마다 *weight 전체를 읽어야* 합니다. [Ch 5](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)의 roofline에서 batch 1 decode의 intensity는 약 1 FLOP/Byte라, H100 SXM 기준 상한이 dense FP16 peak의 약 0.3%입니다. batch를 키워야 같은 weight read로 여러 토큰을 만들 수 있습니다.

## 정리

- LLM inference 메모리는 *weight·activation·KV cache*로 갈리고, 긴 context에서는 *KV cache가 가장 크게 늘어납니다*.
- Llama 2 70B FP16 weight는 *140 GB*, KV cache는 batch 128·seq 2048에서 *86 GB*(GQA)입니다. GQA가 없었다면 *687 GB*였습니다.
- *tile 단위 access*로 HBM 재읽기를 줄이는 것이 kernel 효율의 핵심입니다. FlashAttention은 attention 자체를 tile로 나눕니다.
- decode는 토큰마다 weight 전체를 읽습니다. *batch를 키우면* 그 read가 여러 토큰에 *amortize*됩니다.
- 카드 capacity는 H100(80 GB) → H200(141 GB) → B200(180 GB) → MI325X(256 GB) 순으로 늘었습니다.
- *CXL은 HBM 아래 tier의 메모리*, *UALink는 가속기 간 메모리 접근*을 위한 open 표준입니다.
- 한국 NPU 예로 Rebellions Rebel100은 *HBM3E 144 GB, 4.8 TB/s*입니다.

## 다음 편

[Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)에서 HBM·GDDR·DDR 다음의 메모리 계층인 CXL.mem을 봅니다.

## 관련 항목

- [Ch 1: 고대역 메모리 개요](/blog/embedded/hardware/hbm/chapter01-overview)
- [Ch 5: 대역폭 계산과 병목 분석](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)
- [Ch 7: 메모리 컨트롤러 인터페이스](/blog/embedded/hardware/hbm/chapter07-memory-controller)
