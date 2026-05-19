---
title: "6-07: 온디바이스 LLM — llama.cpp·GGML·MLX·Qualcomm AI Engine"
date: 2026-05-21T07:00:00
description: "Edge LLM 실행. llama.cpp Q4_K_M, Apple MLX, Qualcomm AI Engine. Pi 5·M-series·Jetson 사례."
series: "Modern Embedded Recipes"
seriesOrder: 37
tags: [recipes, edge-ai, llm, llama-cpp, ggml, mlx]
draft: true
---

## 한 줄 요약

> **"Edge LLM = 4-bit quantization + KV cache + NPU"** — 7B 모델이 Raspberry Pi에서 동작.

## Edge LLM 시대 (2024-)

```text
2023: Llama 2 7B FP16 — 14 GB, server only
2024: Llama 3 8B Q4 — 4 GB, mobile·edge
2025: Llama 3 70B Q4 — 35 GB, edge box·M3 Max
```

자율주행·로봇·IoT — *온디바이스 추론* 필수. Privacy + latency + cost.

## llama.cpp

```bash
# Build
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make -j8

# 또는 CUDA·Metal·Vulkan
make GGML_CUDA=1 -j8
make GGML_METAL=1 -j8   # macOS
make GGML_VULKAN=1 -j8

# Download model
wget https://huggingface.co/.../llama-3-8b-instruct-Q4_K_M.gguf

# Inference
./llama-cli -m model.gguf -p "Hello" -n 100
```

## GGUF Format

```text
GGUF (GPT-Generated Unified Format):
  - llama.cpp 표준
  - Single file
  - Metadata embed
  - Quantization variants
  
Variants:
  Q2_K       2-bit   3.5 GB   많은 accuracy ↓
  Q3_K_M     3-bit   3.7 GB
  Q4_K_M     4-bit   4.6 GB   recommended
  Q5_K_M     5-bit   5.5 GB
  Q6_K       6-bit   6.3 GB
  Q8_0       8-bit   8.5 GB   거의 FP16
  F16        16-bit  16 GB
```

## llama.cpp C API

```c
#include "llama.h"

llama_init();

struct llama_model_params model_params = llama_model_default_params();
struct llama_model *model = llama_load_model_from_file("model.gguf", model_params);

struct llama_context_params ctx_params = llama_context_default_params();
ctx_params.n_ctx = 4096;   /* context length */
struct llama_context *ctx = llama_new_context_with_model(model, ctx_params);

/* Tokenize */
llama_token tokens[1024];
int n = llama_tokenize(model, prompt, strlen(prompt), tokens, 1024, true, true);

/* Inference */
llama_batch batch = llama_batch_init(512, 0, 1);
for (int i = 0; i < n; i++) {
    llama_batch_add(batch, tokens[i], i, {0}, false);
}
batch.logits[batch.n_tokens - 1] = true;

llama_decode(ctx, batch);

/* Sample next token */
float *logits = llama_get_logits_ith(ctx, batch.n_tokens - 1);
llama_token next = sample_top_p(logits, n_vocab, 0.9);
```

## KV Cache

```text
LLM 추론:
  Input prompt: 50 token
  Generation: 1 token at a time
  
KV cache:
  Key·Value 각 layer × 각 head 저장
  새 token만 compute, 이전은 cache
  → 매 token compute O(N) vs O(N²)
```

```c
ctx_params.n_ctx = 4096;   /* KV cache capacity */
/* 8B model FP16 KV cache: ~2 GB */
/* Q4: ~500 MB */
```

KV cache가 *큰 메모리 차지*. Long context = 더 큰 RAM 필요.

## Apple MLX

```python
import mlx.core as mx
from mlx_lm import load, generate

model, tokenizer = load("mlx-community/Llama-3-8B-Instruct-4bit")

response = generate(model, tokenizer, prompt="Hello",
                     max_tokens=100, verbose=True)
print(response)
```

Apple MLX — *M-series Neural Engine 활용*. Metal compute + ANE.

```text
M3 Max:
  Llama 3 8B Q4: 40 token/s
  Llama 3 70B Q4: 5 token/s
```

## Qualcomm AI Engine

```text
Snapdragon 8 Gen 3·X Elite:
  - Hexagon NPU 45 TOPS
  - llama.cpp QNN backend
  - Qualcomm Stable LM·Stable Diffusion 데모
  
Mobile LLM:
  - 7B model on phone
  - 20+ token/s
```

```bash
# Qualcomm AI Hub
qai-hub upload-model model.onnx
qai-hub compile --target snapdragon-8-gen-3
```

## Jetson Orin AGX — LLM

```bash
# llama.cpp CUDA
./llama-cli -m llama-3-8b-Q4_K_M.gguf -ngl 99 -c 4096 \
            -p "What is autonomous driving?" -n 200

# Performance:
# 30-50 token/s with full GPU offload
```

`-ngl 99` — *모든 layer GPU offload*. RAM 8GB+ 필요.

## Raspberry Pi 5

```bash
# Pi 5 (8GB) — CPU only
./llama-cli -m llama-3-8b-Q4_K_M.gguf -t 4 -c 2048 \
            -p "Hello" -n 50

# Performance:
# ~4 token/s (slow but functional)
```

Pi 5 + Llama 8B Q4 — *오프라인 LLM*. Hobbyist·IoT.

## NPU Offload — llama.cpp Backends

```text
Backends:
  GGML_CUDA       NVIDIA
  GGML_METAL      Apple
  GGML_VULKAN     Mali·Adreno·Intel·AMD
  GGML_KOMPUTE    cross-GPU Vulkan
  GGML_BLAS       OpenBLAS CPU
  GGML_OPENBLAS   CPU SIMD
  GGML_CLBLAST    OpenCL
  
Embedded:
  Cortex-A SIMD (NEON) — default
  Qualcomm QNN backend (in progress)
```

자동차·로봇 — Vulkan 또는 *vendor NPU*.

## Context Length — Memory Trade-off

```text
Llama 3 8B context length:
  2K context  → 0.5 GB KV cache
  4K context  → 1 GB
  8K context  → 2 GB
  32K context → 8 GB
  128K context → 32 GB
```

KV cache *quadratic*. Long context — 별도 mechanism (FlashAttention·sliding window).

## FlashAttention

```text
FlashAttention v2/v3:
  - Tiled attention computation
  - Memory ↓ 10x
  - Speed ↑ 2-3x
  - Long context 가능
```

CUDA·Metal 표준. llama.cpp 통합.

## Speculative Decoding

```text
Draft model (작음, 빠름) — N token 미리 생성
Target model (큼, 정확) — verify
  Match: accept
  Mismatch: reject, target 사용
  
Speedup: 2-3x with same quality
```

Edge — *작은 draft model* + main model.

## Mixed Precision

```text
Layer별:
  Embedding         Q4
  Attention QKV     Q5
  Attention out     Q4
  FFN up·gate       Q3
  FFN down          Q4
  Layer norm        FP16
```

Quality 유지 + size 최소. llama.cpp `K_quant` variants.

## RoPE — Rotary Position Embedding

```c
/* Modern LLM — RoPE position encoding */
/* Context extension via NTK scaling */

ctx_params.rope_freq_base = 10000.0;
ctx_params.rope_freq_scale = 0.5;   /* 2x context */
```

NTK-aware scaling — *trained 2K context를 8K로 확장*.

## Chat Template

```c
/* Llama 3 chat format */
const char *prompt =
    "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n"
    "You are a helpful assistant.<|eot_id|>\n"
    "<|start_header_id|>user<|end_header_id|>\n"
    "%s<|eot_id|>\n"
    "<|start_header_id|>assistant<|end_header_id|>\n";

char buf[4096];
snprintf(buf, sizeof(buf), prompt, user_input);
```

각 모델 *별도 format*. Mistral·Llama·Gemma·Phi.

## Streaming Output

```c
while (1) {
    llama_decode(ctx, batch);
    float *logits = llama_get_logits_ith(ctx, batch.n_tokens - 1);
    llama_token next = sample(logits);
    
    if (next == eos_token) break;
    
    char text[256];
    llama_token_to_piece(model, next, text, sizeof(text), 0, false);
    printf("%s", text);
    fflush(stdout);
    
    /* Next batch */
    llama_batch_clear(batch);
    llama_batch_add(batch, next, batch.n_tokens, {0}, true);
}
```

User-facing — *streaming output*이 표준 UX.

## OpenAI-Compatible Server

```bash
# llama.cpp server
./llama-server -m model.gguf --port 8080 --host 0.0.0.0
```

OpenAI API 호환:

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3-8b",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

Local LLM·privacy-first app — OpenAI API drop-in.

## Edge Use Case

```text
1. Voice assistant (offline):
   Wake word detection — small NN
   ASR (whisper.cpp) — 300M model
   LLM (Llama 3B) — local
   TTS — local
   → 완전 offline·privacy

2. 자율주행 dialogue:
   Cortex-A78 + GPU
   Small LLM for cabin interaction
   No internet 의존

3. Industrial diagnostic:
   Sensor data + LLM 해석
   Real-time alert
   Off-grid operation
```

## 자주 하는 실수

> ⚠️ FP16 model on edge

```bash
./llama-cli -m llama-3-8b-f16.gguf   # 16 GB — OOM on most edge
```

→ Q4_K_M 또는 Q5_K_M.

> ⚠️ Long context without enough RAM

```c
ctx_params.n_ctx = 32768;   /* 8 GB KV cache */
/* OOM */
```

→ context length 측정·제한.

> ⚠️ No GPU offload

```bash
# 빠르지 않다 — CPU only
./llama-cli -m model.gguf   # 기본 CPU
```

→ `-ngl 99` for GPU.

> ⚠️ Sample method 잘못

```c
/* Greedy — repetitive */
next = argmax(logits);
```

→ Temperature + top-p·top-k.

## 정리

- Edge LLM = **4-bit quantization** + **KV cache** + **NPU**.
- **llama.cpp** = 표준 edge inference engine.
- **GGUF** format — Q4_K_M 권장.
- Apple MLX·Qualcomm QNN — NPU 백엔드.
- Jetson Orin 30-50 token/s, Pi 5 ~4 token/s.
- **OpenAI-compatible server** — local 통합 쉬움.

다음 편은 **TF-M·TrustZone**.

## 관련 항목

- [6-06: Zero-Copy Camera](/blog/embedded/modern-recipes/part6-06-zero-copy-camera)
- [6-08: TF-M TrustZone](/blog/embedded/modern-recipes/part6-08-tfm-trustzone)
