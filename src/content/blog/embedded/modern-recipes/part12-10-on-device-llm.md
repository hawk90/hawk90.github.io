---
title: "온디바이스 LLM 추론 — llama.cpp·GGUF·MLX·KV Cache·NPU Backend"
slug: "embedded/modern-recipes/part12-10-on-device-llm"
date: 2026-04-21T09:09:00
description: "4-bit 양자화된 LLM이 모바일·edge에서 동작하는 시대. llama.cpp/GGUF, Apple MLX, KV cache 메모리, 백엔드 선택을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 146
tags: [recipes, edge-ai, llm, llama-cpp, ggml, mlx, gguf]
topics: ["embedded"]
---

## 한 줄 요약

> **"4-bit 양자화와 KV cache 관리가 LLM을 edge에서 실행할 수 있게 했습니다."** Llama 3 8B Q4의 weight가 수 GB 수준으로 줄어들 수 있지만, 실제 구동 가능 여부는 quantization variant·KV cache·backend·메모리 여유로 확인합니다.

## 어떤 상황에서 쓰나

오프라인 voice assistant, 자율주행 cabin dialogue, 산업 진단 챗봇, 의료기기 음성 인터페이스, 카메라 자연어 명령처럼 *연결이 끊긴 채로 자연어 처리가 필요한 모든 사례*가 후보입니다.

Cloud LLM은 모델·네트워크·서비스 정책에 따라 privacy·latency·cost trade-off가 생깁니다. round-trip latency와 token 비용은 서비스·지역·payload에 따라 측정해야 하며, 의료·법률·기업·산업 환경에서는 보안·규제 요구사항을 먼저 검토합니다.

4-bit quantization과 GGUF format이 자리 잡으면서 7B~8B model을 *consumer 하드웨어*에서 돌리는 일이 흔해졌습니다. Phi-3 mini(3.8B) 같은 small model은 메모리가 더 작은 mobile·edge 보드를 겨냥합니다.

## 핵심 개념

LLM 추론의 memory 구성은 *weight + KV cache + activation*입니다.

**Weight 메모리:**

| Model | FP16 | INT8 | INT4 (≈) |
|-------|------|------|------|
| Llama 3 8B | 16 GB | 8 GB | 4~5 GB |
| Llama 3 70B | 140 GB | 70 GB | 35~40 GB |
| Phi-3 mini (3.8B) | 7.6 GB | 3.8 GB | 2~2.5 GB |

FP16·INT8은 parameter 수 × 2·1 byte로 계산한 값입니다. INT4 칸은 4-bit weight에 scale·일부 고정밀 tensor가 더해지므로 quantization variant(Q4_0, Q4_K_M 등)마다 다릅니다.

**KV cache (Llama 3 8B):**

| 설정 | 크기 |
|------|------|
| FP16, 4k ctx | 512 MB |
| INT8, 4k ctx | 256 MB |
| FP16, 32k ctx | 4 GB |

KV cache는 *context length × layers × KV heads × head_dim × 2(K·V) × element 크기*로 context length에 비례해 자랍니다. Long context를 원하면 KV cache 메모리부터 계산해야 OOM이 안 납니다. 계산 과정은 아래 "Context length·KV cache 계산"에 있습니다.

llama.cpp는 *GGUF format*과 *GGML* tensor library로 구성됩니다.

| 컴포넌트 | 역할 |
|----------|------|
| GGUF | single-file model + metadata + quantization |
| GGML | backend tensor compute (CPU SIMD, CUDA, Metal, Vulkan, BLAS) |
| llama.cpp | GGUF loader + LLM inference logic |

Backend selection이 backend·hardware에 따라 throughput을 결정합니다.

| GGML_CUDA | NVIDIA GPU, Jetson 포함 |
|---|---|
| GGML_METAL | Apple silicon |
| GGML_VULKAN | Mali·Adreno·Intel·AMD 통합 GPU |
| GGML_BLAS | OpenBLAS CPU |
| GGML_HEXAGON | Qualcomm Hexagon NPU |
| NEON / AVX2 | CPU SIMD (자동) |

Apple은 별도로 *MLX*라는 array framework를 제공합니다. MLX는 Apple silicon의 CPU·GPU(Metal)와 unified memory를 쓰고, Neural Engine은 쓰지 않습니다. Qualcomm SoC는 llama.cpp의 Hexagon backend가 있으며, 지원 op·model 범위는 설치한 llama.cpp 버전에서 확인합니다.

## 코드 / 실제 사용 예

### 빌드

```bash
git clone https://github.com/ggml-org/llama.cpp
cd llama.cpp

# CPU only
cmake -B build && cmake --build build -j

# CUDA (Jetson, x86)
cmake -B build -DGGML_CUDA=ON && cmake --build build -j

# Metal (macOS)
cmake -B build -DGGML_METAL=ON && cmake --build build -j

# Vulkan (Mali, Adreno, RPi 5)
cmake -B build -DGGML_VULKAN=ON && cmake --build build -j
```

Backend는 build time에 고릅니다. GPU backend를 켠 build에도 CPU backend는 함께 들어가 offload하지 않은 layer를 처리합니다. 여러 GPU backend를 한 배포물에 담으려면 `-DGGML_BACKEND_DL=ON -DBUILD_SHARED_LIBS=ON`으로 backend를 shared library로 빌드해 runtime에 load합니다.

### CLI 추론

```bash
# Phi-3 mini Q4 on Raspberry Pi 5
wget https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-gguf/resolve/main/Phi-3-mini-4k-instruct-q4.gguf

./build/bin/llama-cli \
    -m Phi-3-mini-4k-instruct-q4.gguf \
    -t 4 \
    -c 2048 \
    -p "Explain edge AI in two sentences." \
    -n 200

# Jetson Orin AGX with full GPU offload
./build/bin/llama-cli \
    -m llama-3-8b-instruct-Q4_K_M.gguf \
    -ngl 99 \
    -c 4096 \
    -p "Hello"
```

`-ngl 99`는 *모든 layer를 GPU에 offload*하라는 의미입니다. RAM이 부족하면 일부 layer만 GPU에 두고 나머지를 CPU에 둘 수 있습니다.

### C API 사용

`include/llama.h`의 현재 API로 prompt를 한 번 decode한 뒤 token을 하나씩 생성하는 최소 loop입니다. 예전 이름(`llama_load_model_from_file`, `llama_new_context_with_model`, `llama_token_eos` 등)은 deprecated이고, `llama_batch_add`는 `llama.h`가 아니라 예제용 `common` library에 있던 helper입니다.

```c
#include "llama.h"

llama_backend_init();

struct llama_model_params mparams = llama_model_default_params();
mparams.n_gpu_layers = 99;
struct llama_model *model =
    llama_model_load_from_file("llama-3-8b-Q4_K_M.gguf", mparams);
const struct llama_vocab *vocab = llama_model_get_vocab(model);

struct llama_context_params cparams = llama_context_default_params();
cparams.n_ctx = 4096;
struct llama_context *ctx = llama_init_from_model(model, cparams);

llama_token tokens[1024];
int n = llama_tokenize(vocab, prompt, strlen(prompt),
                       tokens, 1024, true, true);

struct llama_sampler *smpl =
    llama_sampler_chain_init(llama_sampler_chain_default_params());
llama_sampler_chain_add(smpl, llama_sampler_init_top_p(0.95f, 1));
llama_sampler_chain_add(smpl, llama_sampler_init_temp(0.8f));
llama_sampler_chain_add(smpl, llama_sampler_init_dist(LLAMA_DEFAULT_SEED));

struct llama_batch batch = llama_batch_get_one(tokens, n);
for (int t = 0; t < 200; t++) {
    llama_decode(ctx, batch);
    llama_token next = llama_sampler_sample(smpl, ctx, -1);
    if (llama_vocab_is_eog(vocab, next)) break;

    char piece[256];
    int plen = llama_token_to_piece(vocab, next, piece, sizeof(piece), 0, false);
    fwrite(piece, 1, plen, stdout); fflush(stdout);

    batch = llama_batch_get_one(&next, 1);
}

llama_sampler_free(smpl);
llama_free(ctx);
llama_model_free(model);
llama_backend_free();
```

처음 decode는 prompt 전체를 한 번에 처리하고, 그다음부터는 *decode → sample → token 한 개짜리 batch*를 반복합니다. 앞 token의 K·V는 context 안 KV cache에 남아 있으므로 매번 새 token 하나만 compute합니다.

### llama-server — OpenAI compatible

```bash
./build/bin/llama-server \
    -m llama-3-8b-Q4_K_M.gguf \
    --host 0.0.0.0 --port 8080 \
    -ngl 99 -c 4096
```

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3-8b",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

OpenAI API 호환 endpoint를 노출합니다. Local-first application은 같은 client 코드로 cloud·local을 switch할 수 있습니다.

### Quantize 직접 수행

```bash
# HuggingFace → GGUF FP16
python convert_hf_to_gguf.py models/llama-3-8b/ \
       --outfile llama-3-8b-f16.gguf

# Q4_K_M (권장)
./llama-quantize llama-3-8b-f16.gguf \
                  llama-3-8b-Q4_K_M.gguf Q4_K_M

# Imatrix calibration (더 좋은 quantize)
./llama-imatrix -m llama-3-8b-f16.gguf -f calibration.txt \
                -o imatrix.dat
./llama-quantize --imatrix imatrix.dat \
                  llama-3-8b-f16.gguf llama-3-8b-IQ4_NL.gguf IQ4_NL
```

imatrix는 calibration text에서 weight별 중요도를 모아 quantize 오차를 중요한 weight에 덜 주도록 합니다. 특히 낮은 bit 변형에서 효과를 보므로, 같은 size의 변형을 `llama-perplexity`로 비교해 고릅니다.

### Apple MLX

```python
import mlx.core as mx
from mlx_lm import load, generate

model, tokenizer = load("mlx-community/Llama-3-8B-Instruct-4bit")

response = generate(model, tokenizer,
                     prompt="Explain edge AI",
                     max_tokens=200, verbose=True)
```

Apple silicon의 Metal GPU와 unified memory 위에서 돌아가며, 속도는 chip·memory bandwidth·quantization에 따라 측정합니다.

### Context length·KV cache 계산

```c
/* KV cache size 추정 */
size_t kv_bytes = n_layers * 2 /*K+V*/ * n_kv_heads * head_dim
                * n_ctx * sizeof(half);

/* Llama 3 8B: 32 layers, 8 KV heads (GQA), 128 head_dim */
/* 4k ctx: 32 * 2 * 8 * 128 * 4096 * 2 = 512 MB (FP16) */
/* 32k ctx: 32 * 2 * 8 * 128 * 32768 * 2 = 4 GB */
```

Grouped Query Attention(GQA)은 여러 query head가 KV head를 공유하게 해 KV cache를 줄입니다. Llama 3 8B는 query head 32개에 KV head 8개라 같은 head 수의 multi-head attention보다 KV cache가 1/4입니다.

### Chat template

```c
const char *llama3_template =
    "<|begin_of_text|>"
    "<|start_header_id|>system<|end_header_id|>\n\n"
    "%s<|eot_id|>"
    "<|start_header_id|>user<|end_header_id|>\n\n"
    "%s<|eot_id|>"
    "<|start_header_id|>assistant<|end_header_id|>\n\n";

snprintf(prompt, sizeof(prompt), llama3_template, system_msg, user_msg);
```

모델마다 chat template이 다릅니다. Llama·Mistral·Gemma·Phi가 모두 다른 special token을 씁니다. GGUF metadata에 template이 들어 있는 경우 `llama-cli`가 자동으로 적용합니다.

## 측정 / 성능 비교

Token/sec와 first-token latency는 device·backend·quantization·context length·thread 수에 따라 크게 달라지므로, 같은 조건을 고정하고 `llama-bench`로 측정합니다.

```bash
./build/bin/llama-bench -m llama-3-8b-Q4_K_M.gguf -p 512 -n 128 -ngl 99
```

`-p`는 prompt 처리(pp), `-n`은 token 생성(tg) 길이입니다. pp는 first-token latency를, tg는 대화 중 체감 속도를 좌우하므로 두 값을 따로 기록합니다. Raspberry Pi 5(CPU), Jetson(CUDA), Apple silicon(Metal), Snapdragon(Hexagon)처럼 backend가 다른 device는 같은 GGUF 파일로 비교합니다.

KV cache 메모리 (Llama 3 8B, GQA 8 heads)입니다.

| Context | KV cache (FP16) | KV cache (INT8) |
|---------|------------------|-------------------|
| 2k | 256 MB | 128 MB |
| 4k | 512 MB | 256 MB |
| 8k | 1 GB | 512 MB |
| 32k | 4 GB | 2 GB |
| 128k | 16 GB | 8 GB |

Weight·KV cache·working memory를 합산해야 하므로 8 GB 보드의 usable context는 quantization·runtime overhead·동시 프로세스에 따라 달라집니다. 4~8k context는 특정 구성에서의 starting point로 benchmark합니다.

## 자주 보는 함정

> FP16 model을 edge로

```bash
./build/bin/llama-cli -m llama-3-8b-f16.gguf   # weight만 16 GB
```

Q4_K_M·Q5_K_M으로 quantize한 변형을 씁니다.

> Context length를 무조건 늘림

```c
cparams.n_ctx = 32768;   /* Llama 3 8B FP16 KV cache 4 GB 추가 */
```

KV cache 메모리를 먼저 계산하고 context length를 결정합니다.

> CPU only로 sluggish

```bash
./build/bin/llama-cli -m model.gguf   # GPU backend 없이 build — CPU만 사용
```

`-ngl 99`로 GPU offload하거나 backend(`GGML_VULKAN` 등)를 build time에 켭니다.

> Sampling 잘못

```c
next = argmax(logits);   /* greedy — 같은 구절 반복에 빠지기 쉬움 */
```

llama.cpp CLI 기본값(temperature 0.8, top-p 0.95)에서 시작해 용도에 맞춰 조정합니다.

> Chat template 누락

```c
prompt = "Hello";   /* special token 없음 → 모델이 chat mode로 안 들어감 */
```

모델별 chat template을 적용하거나 `--chat-template` 옵션을 활용합니다.

> mmap 비활성화

```bash
./build/bin/llama-cli -m model.gguf --load-mode none   # 시작 시 weight 전체를 읽어 들임
```

기본(`--load-mode auto`)은 mmap으로 weight를 page cache에서 바로 쓰므로 load가 빠르고, 같은 model을 여러 process가 page를 공유할 수 있습니다. 추론 중에는 결국 weight 대부분이 메모리에 올라오므로, mmap이 필요한 총 메모리 자체를 줄여 주지는 않습니다. 예전 build의 `--no-mmap`은 현재 `--load-mode`로 바뀌었습니다.

## 정리

- 4-bit quantization과 KV cache 관리로 7B~8B LLM을 edge 보드 메모리에 올릴 수 있습니다.
- llama.cpp는 GGUF model format과 GGML tensor library로 구성됩니다.
- Q4_K_M은 흔히 쓰는 출발점이고, 다른 변형과 perplexity·속도로 비교합니다.
- KV cache는 context length × layers × KV heads × head_dim × 2로 자라므로 메모리 계산이 필수입니다.
- Backend는 build time에 고릅니다(CUDA·Metal·Vulkan·BLAS·Hexagon).
- Apple silicon은 MLX로 Metal GPU와 unified memory를 활용합니다.
- llama-server는 OpenAI API 호환 endpoint를 노출해 local-first 앱 통합이 쉽습니다.
- Device별 token/sec는 `llama-bench`로 같은 model·quantization·context에서 측정해 비교합니다.

다음 편은 **TF-M·TrustZone secure firmware**입니다.

## 관련 항목

- [12-03: Quantization](/blog/embedded/modern-recipes/part12-03-quantization)
- [12-04: TensorRT](/blog/embedded/modern-recipes/part12-04-tensorrt)
- [12-11: TF-M TrustZone](/blog/embedded/modern-recipes/part12-11-tfm-trustzone)
