---
title: "12-10: 온디바이스 LLM — llama.cpp·GGUF·MLX·KV Cache·NPU Backend"
date: 2026-05-18T02:00:00
description: "4-bit 양자화된 LLM이 모바일·edge에서 동작하는 시대. llama.cpp/GGUF, Apple MLX, KV cache 메모리, 백엔드 선택을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 146
tags: [recipes, edge-ai, llm, llama-cpp, ggml, mlx, gguf]
---

## 한 줄 요약

> **"4-bit 양자화 + KV cache + NPU backend가 LLM을 edge로 내려보냈습니다."** Llama 3 8B Q4가 4.5 GB로 줄어 Raspberry Pi 5·iPhone·Jetson에서 돌고, Phi-3 mini는 2 GB로 더 작은 device에도 들어갑니다.

## 어떤 상황에서 쓰나

오프라인 voice assistant, 자율주행 cabin dialogue, 산업 진단 챗봇, 의료기기 음성 인터페이스, 카메라 자연어 명령처럼 *연결이 끊긴 채로 자연어 처리가 필요한 모든 사례*가 후보입니다.

Cloud LLM이 더 똑똑하지만 세 가지 한계가 있습니다. Privacy(대화·이미지 raw가 device 밖으로 나감), latency(round-trip 1~3초), cost(token당 과금). 의료·법률·기업 internal·industrial 같은 영역은 cloud가 답이 아닙니다.

2024년 이후 4-bit quantization과 GGUF format이 안정되면서 7B~8B model이 *consumer 하드웨어*에서 의미 있는 속도로 동작하기 시작했습니다. Phi-3 mini(3.8B) 같은 small model은 더 빠르게 mobile에 침투하고 있습니다.

## 핵심 개념

LLM 추론의 memory 구성은 *weight + KV cache + activation*입니다.

```text
Weight                        FP16     INT8     INT4
Llama 3 8B                    16 GB    8 GB     4.5 GB
Llama 3 70B                   140 GB   70 GB    35 GB
Phi-3 mini (3.8B)             7.6 GB   3.8 GB   2.1 GB

KV cache (Llama 3 8B FP16, 4k ctx)        1 GB
KV cache (4k ctx, INT8)                   500 MB
KV cache (32k ctx, FP16)                  8 GB
```

KV cache가 *context length × layers × heads × head_dim × 2*로 quadratic 비슷하게 자랍니다. Long context를 원하면 KV cache 메모리부터 계산해야 OOM이 안 납니다.

llama.cpp는 *GGUF format*과 *GGML* tensor library로 구성됩니다.

```text
GGUF                  single-file model + metadata + quantization
GGML                  backend tensor compute (CPU SIMD, CUDA, Metal, Vulkan, BLAS)
llama.cpp             GGUF loader + LLM inference logic
```

Backend selection이 backend·hardware에 따라 throughput을 결정합니다.

| GGML_CUDA | NVIDIA GPU, Jetson 포함 |
|---|---|
| GGML_METAL | Apple silicon |
| GGML_VULKAN | Mali·Adreno·Intel·AMD 통합 GPU |
| GGML_BLAS | OpenBLAS CPU |
| NEON / AVX2 | CPU SIMD (자동) |

Apple은 별도로 *MLX*라는 framework를 가지고 있어 Neural Engine까지 활용합니다. Qualcomm은 QNN backend가 llama.cpp에 통합되는 중입니다.

## 코드 / 실제 사용 예

### 빌드

```bash
git clone https://github.com/ggerganov/llama.cpp
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

Backend는 build time에 결정됩니다. 한 binary가 여러 backend를 동시에 가지지는 않습니다.

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

```c
#include "llama.h"

llama_backend_init();

struct llama_model_params mparams = llama_model_default_params();
mparams.n_gpu_layers = 99;
struct llama_model *model = llama_load_model_from_file(
    "llama-3-8b-Q4_K_M.gguf", mparams);

struct llama_context_params cparams = llama_context_default_params();
cparams.n_ctx = 4096;
cparams.n_threads = 6;
struct llama_context *ctx = llama_new_context_with_model(model, cparams);

/* Tokenize */
llama_token tokens[1024];
int n = llama_tokenize(model, prompt, strlen(prompt),
                        tokens, 1024, true, true);

/* Encode prompt */
struct llama_batch batch = llama_batch_init(512, 0, 1);
for (int i = 0; i < n; i++) {
    llama_batch_add(batch, tokens[i], i, NULL, 0, false);
}
batch.logits[batch.n_tokens - 1] = true;
llama_decode(ctx, batch);

/* Sample loop */
for (int t = 0; t < 200; t++) {
    float *logits = llama_get_logits_ith(ctx, batch.n_tokens - 1);
    llama_token next = sample_top_p(logits, llama_n_vocab(model), 0.9f);
    if (next == llama_token_eos(model)) break;

    char piece[256];
    int plen = llama_token_to_piece(model, next, piece, sizeof(piece), 0, false);
    fwrite(piece, 1, plen, stdout); fflush(stdout);

    llama_batch_clear(batch);
    llama_batch_add(batch, next, n + t, NULL, 0, true);
    llama_decode(ctx, batch);
}

llama_free(ctx);
llama_free_model(model);
llama_backend_free();
```

매 token마다 *decode → sample → 다음 batch*를 반복합니다. KV cache가 누적되어 매번 한 token만 compute합니다.

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

`IQ4_NL`처럼 imatrix를 활용한 *importance-aware* quantize가 같은 size에서 더 좋은 quality를 줍니다.

### Apple MLX

```python
import mlx.core as mx
from mlx_lm import load, generate

model, tokenizer = load("mlx-community/Llama-3-8B-Instruct-4bit")

response = generate(model, tokenizer,
                     prompt="Explain edge AI",
                     max_tokens=200, verbose=True)
```

Apple silicon에서 Metal compute + Neural Engine을 활용합니다. M3 Max에서 Llama 3 8B Q4가 40 tok/s, 70B Q4가 5 tok/s 정도 나옵니다.

### Context length·KV cache 계산

```c
/* KV cache size 추정 */
size_t kv_bytes = n_layers * 2 /*K+V*/ * n_heads * head_dim
                * n_ctx * sizeof(half);

/* Llama 3 8B: 32 layers, 8 KV heads (GQA), 128 head_dim */
/* 4k ctx: 32 * 2 * 8 * 128 * 4096 * 2 = 512 MB (FP16) */
/* 32k ctx: 32 * 2 * 8 * 128 * 32768 * 2 = 4 GB */
```

Grouped Query Attention(GQA)이 표준이 되면서 KV cache가 1/4로 줄어 long context가 현실화됐습니다.

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

Llama 3 8B Q4_K_M, 동일 prompt 추론 throughput입니다.

```text
Device                       Backend       Token/sec   First token latency
Raspberry Pi 5 (8 GB)        NEON CPU       4 t/s       ~3 sec
RPi 5 + Hailo-8              실험 단계
Mac mini M2 (16 GB)          Metal         25 t/s       ~0.8 sec
Mac Studio M3 Max (64 GB)    Metal         45 t/s       ~0.4 sec
Jetson Orin Nano (8 GB)      CUDA          18 t/s       ~1 sec
Jetson AGX Orin (64 GB)      CUDA          45 t/s       ~0.4 sec
iPhone 15 Pro                Metal         15 t/s       ~1 sec
Snapdragon 8 Gen 3           QNN (실험)    20 t/s       ~1 sec
```

Pi 5 4 t/s는 단어 단위로는 사람이 읽는 속도와 비슷합니다. 실용 가능한 첫 baseline입니다.

KV cache 메모리 (Llama 3 8B, GQA 8 heads)입니다.

```text
Context       KV cache (FP16)   KV cache (INT8)
2k             256 MB             128 MB
4k             512 MB             256 MB
8k             1 GB               512 MB
32k            4 GB               2 GB
128k           16 GB              8 GB
```

Weight 4.5 GB + KV cache + 약간의 working memory가 합산되므로 8 GB 보드에서는 4~8k context가 현실적 상한입니다.

## 자주 보는 함정

> FP16 model을 edge로

```bash
./llama-cli -m llama-3-8b-f16.gguf   # 16 GB OOM
```

Q4_K_M·Q5_K_M으로 quantize한 변형을 씁니다.

> Context length를 무조건 늘림

```c
cparams.n_ctx = 32768;   /* KV cache 4 GB → OOM */
```

KV cache 메모리를 먼저 계산하고 context length를 결정합니다.

> CPU only로 sluggish

```bash
./llama-cli -m model.gguf   # default CPU — 2 t/s
```

`-ngl 99`로 GPU offload하거나 backend(`GGML_VULKAN` 등)를 build time에 켭니다.

> Sampling 잘못

```c
next = argmax(logits);   /* greedy → 반복 출력 */
```

Temperature 0.7 + top-p 0.9 정도가 baseline입니다.

> Chat template 누락

```c
prompt = "Hello";   /* special token 없음 → 모델이 chat mode로 안 들어감 */
```

모델별 chat template을 적용하거나 `--chat-template` 옵션을 활용합니다.

> mmap 비활성화

```bash
./llama-cli --no-mmap   /* 모델 전체를 RAM에 — 32 GB 필요 */
```

기본 mmap을 그대로 두면 OS가 page를 on-demand로 불러와 메모리 사용량이 크게 줄어듭니다.

## 정리

- 4-bit quantization + KV cache + NPU backend로 7B~8B LLM이 edge에서 실용 가능해졌습니다.
- llama.cpp + GGUF + GGML이 사실상 표준 stack입니다.
- Q4_K_M이 size·quality·speed의 sweet spot입니다.
- KV cache는 context length × layers × heads × head_dim × 2로 자라므로 메모리 계산이 필수입니다.
- Backend는 build time에 결정합니다(CUDA·Metal·Vulkan·BLAS).
- Apple silicon은 MLX로 Metal + Neural Engine을 함께 활용합니다.
- llama-server는 OpenAI API 호환 endpoint를 노출해 local-first 앱 통합이 쉽습니다.
- Pi 5에서 4 t/s, Mac Studio M3에서 45 t/s, Jetson Orin AGX에서 45 t/s 수준입니다.

다음 편은 **TF-M·TrustZone secure firmware**입니다.

## 관련 항목

- [6-03: Quantization](/blog/embedded/modern-recipes/part6-03-quantization)
- [6-02: TensorRT](/blog/embedded/modern-recipes/part6-02-tensorrt)
- [6-08: TF-M TrustZone](/blog/embedded/modern-recipes/part6-08-tfm-trustzone)
