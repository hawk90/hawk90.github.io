---
title: "온디바이스 LLM 추론 — llama.cpp·GGUF·MLX·KV Cache·NPU Backend"
slug: "embedded/modern-recipes/part12-11-on-device-llm"
date: 2026-04-21T09:09:00
description: "4-bit 양자화된 LLM이 모바일·edge에서 동작하는 시대. llama.cpp/GGUF, Apple MLX, KV cache 메모리, 백엔드 선택을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 147
tags: [recipes, edge-ai, llm, llama-cpp, ggml, mlx, gguf]
topics: ["embedded"]
---

## 한 줄 요약

> **"온디바이스 LLM의 메모리는 weight + KV cache이고, 둘 다 계산할 수 있습니다."** 4-bit 양자화가 weight를 줄이고, KV cache는 context 길이에 비례해 자랍니다. 아래 실행에서 KV cache 크기는 식으로 계산한 값과 byte 단위까지 같았습니다.

## 이 글의 실행 환경

- Apple M2 Pro, macOS 27.2.1. llama.cpp commit `ef6bc6f`(2026-11-16)을 CMake 4.5로 빌드했습니다. macOS에서는 Metal backend가 기본으로 켜집니다.
- 모델: `Qwen/Qwen2.5-0.5B-Instruct-GGUF`의 `qwen2.5-0.5b-instruct-fp16.gguf`(1,266,425,696 byte)를 받아 직접 양자화했습니다. 0.5B 모델을 쓴 것은 노트북에서 모든 단계를 끝까지 돌리기 위해서이고, 8B 모델의 숫자는 아래 표처럼 출처를 따로 적었습니다.
- MLX: Python 3.14 venv의 `mlx` 0.32.4, `mlx-lm` 0.32.2.

## 어떤 상황에서 쓰나

네트워크 없이 장치 안에서 자연어를 처리해야 하거나, 데이터를 밖으로 보낼 수 없는 경우입니다. 이때 결정해야 할 것은 어느 모델을 어느 양자화로, 어느 context 길이까지 올릴 수 있느냐이고, 그 답은 메모리 계산에서 나옵니다.

## 핵심 개념

### Weight 메모리

llama.cpp `tools/quantize/README.md`의 Llama 3.1 8B 표와 Hugging Face의 Phi-3-mini GGUF 파일 크기입니다([12-04](/blog/embedded/modern-recipes/part12-04-quantization)).

| 모델 | 변형 | bits/weight | 크기 |
|------|------|------------:|-----:|
| Llama 3.1 8B | F16 | 16.0005 | 14.96 GiB |
| Llama 3.1 8B | Q8_0 | 8.5008 | 7.95 GiB |
| Llama 3.1 8B | Q4_K_M | 4.8944 | 4.58 GiB |
| Phi-3-mini-4k-instruct | fp16 | — | 7,643,295,904 byte |
| Phi-3-mini-4k-instruct | q4 | — | 2,393,231,072 byte |

같은 Q4_K_M이라도 bits/weight는 모델마다 다릅니다. 0.5B 모델을 직접 양자화한 결과입니다.

```bash
./build/bin/llama-quantize qwen2.5-0.5b-instruct-fp16.gguf my-q4_k_m.gguf Q4_K_M
```

```text
llama_model_quantize_impl: model size  =  1202.09 MiB (16.00 BPW)
llama_model_quantize_impl: quant size  =   462.96 MiB (6.16 BPW)
```

8B에서는 4.89 BPW였던 Q4_K_M이 0.5B에서는 6.16 BPW입니다. 결과 파일은 491,400,032 byte로, Hugging Face 저장소의 공식 `q4_k_m` 파일과 크기가 같았습니다.

### KV cache

KV cache는 layer마다 K와 V를 context 길이만큼 저장합니다.

```text
KV bytes = n_layer × 2 (K, V) × n_head_kv × head_dim × n_ctx × bytes per element
```

Qwen2.5-0.5B는 llama.cpp가 읽은 metadata로 `n_layer = 24`, `n_head_kv = 2`, `n_embd_head_k = 64`입니다. 식에 넣으면 4096 context, f16에서 24 × 2 × 2 × 64 × 4096 × 2 = 50,331,648 byte = 48 MiB입니다. 실제 log입니다.

```text
llama_kv_cache: size =   48.00 MiB (  4096 cells,  24 layers,  1/1 seqs), K (f16):   24.00 MiB, V (f16):   24.00 MiB
llama_kv_cache: size =  384.00 MiB ( 32768 cells,  24 layers,  1/1 seqs), K (f16):  192.00 MiB, V (f16):  192.00 MiB
llama_kv_cache: size =   25.50 MiB (  4096 cells,  24 layers,  1/1 seqs), K (q8_0):   12.75 MiB, V (q8_0):   12.75 MiB
```

context를 8배로 늘리면 KV cache도 정확히 8배입니다. KV cache를 `q8_0`으로 두면 절반이 아니라 48 × 34 / 64 = 25.5 MiB입니다. `q8_0`은 값 32개마다 scale을 붙여 34 byte를 쓰기 때문입니다.

같은 식을 Llama 3 8B에 적용합니다. config(`num_hidden_layers` 32, `num_key_value_heads` 8, `hidden_size` 4096 / `num_attention_heads` 32 = head_dim 128)를 넣으면 다음과 같습니다.

| context | f16 | q8_0 |
|---------|----:|-----:|
| 4k | 512 MiB | 272 MiB |
| 8k | 1 GiB | 544 MiB |
| 32k | 4 GiB | 2.125 GiB |

query head 32개가 KV head 8개를 나눠 쓰는 GQA라서, KV head가 32개일 때보다 KV cache가 4분의 1입니다. 이 표는 계산값이고 8B 모델로 실행하지는 않았지만, 같은 식이 위 0.5B 실행과 맞았습니다.

### llama.cpp 구성

| 구성 요소 | 역할 |
|----------|------|
| GGUF | model과 metadata(tokenizer, chat template 등)를 담는 단일 파일 |
| GGML | tensor 연산 library와 backend |
| llama.cpp | GGUF loader, 추론 loop, CLI·server |

`ggml/CMakeLists.txt`에 있는 backend option은 `GGML_CUDA`, `GGML_METAL`(macOS 기본 ON), `GGML_VULKAN`, `GGML_BLAS`, `GGML_OPENCL`, `GGML_HEXAGON` 등이고, `GGML_BACKEND_DL`은 "build backends as dynamic libraries (requires BUILD_SHARED_LIBS)"입니다. Snapdragon용 Hexagon backend의 빌드 방법은 `docs/backend/snapdragon/README.md`에 따로 있습니다.

## 코드 / 실제 사용 예

### 빌드

```bash
git clone https://github.com/ggml-org/llama.cpp
cd llama.cpp
cmake -B build -DCMAKE_BUILD_TYPE=Release          # Metal is on by default on macOS
cmake --build build -j 8

cmake -B build -DGGML_CUDA=ON                      # NVIDIA, Jetson
cmake -B build -DGGML_VULKAN=ON                    # Vulkan GPUs
```

이 글에서는 macOS 빌드만 실행했습니다.

### CLI

```bash
./build/bin/llama-cli -m my-q4_k_m.gguf -ngl 99 -c 4096 -p "Explain edge AI in two sentences." -n 200
```

`llama-cli --help`로 확인한 option입니다.

| option | 의미(help 문구) | 기본값 |
|--------|----------------|--------|
| `-ngl, --n-gpu-layers N` | max. number of layers to store in VRAM | `auto` |
| `-c, --ctx-size N` | size of the prompt context | 0(model에서 읽음) |
| `-t, --threads N` | number of CPU threads | -1 |
| `--temp N` | temperature | 0.80 |
| `--top-p N` | top-p sampling | 0.95 |
| `-lm, --load-mode MODE` | `auto`, `none`, `mmap`, `mlock`, `mmap+mlock` | `auto`(mmap) |
| `--chat-template` | custom jinja chat template | model metadata의 template |

이전 판의 `--no-mmap`은 이 build의 help에 없고 `--load-mode`가 그 자리를 맡습니다.

### C API

`include/llama.h`는 이 commit에서 바뀌었습니다. `llama_decode()`와 `llama_batch_get_one()`이 deprecated가 되었고, 대신 `llama_batch_ext`와 `llama_process(ctx, LLAMA_PROCESS_TYPE_DECODE, batch)`를 씁니다(`examples/simple/simple.cpp`가 새 방식입니다). 이전 판의 `llama_batch_get_one` loop는 컴파일되지만 deprecated 경고가 납니다. 아래는 새 API로 쓴 loop이고, 실행해 문장을 생성했습니다.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "llama.h"

/* put tokens[0..n) at positions pos0.. in sequence 0; request logits for the last one */
static void batch_set_tokens(struct llama_batch_ext *b, const llama_token *tokens, int n, llama_pos pos0) {
    llama_batch_ext_clear(b);
    for (int i = 0; i < n; i++) {
        int32_t idx = llama_batch_ext_add_token(b, 0, tokens[i]);
        llama_pos pos = pos0 + i;
        llama_batch_ext_set_pos(b, idx, &pos);
    }
    llama_batch_ext_set_output_logits(b, n - 1, true);
}

int main(int argc, char **argv) {
    const char *path = argv[1], *prompt = argv[2];
    llama_backend_init();

    struct llama_model_params mparams = llama_model_default_params();
    mparams.n_gpu_layers = 99;
    struct llama_model *model = llama_model_load_from_file(path, mparams);
    const struct llama_vocab *vocab = llama_model_get_vocab(model);

    struct llama_context_params cparams = llama_context_default_params();
    cparams.n_ctx = 4096;
    struct llama_context *ctx = llama_init_from_model(model, cparams);

    llama_token tokens[1024];
    int n = llama_tokenize(vocab, prompt, strlen(prompt), tokens, 1024, true, true);

    struct llama_sampler *smpl = llama_sampler_chain_init(llama_sampler_chain_default_params());
    llama_sampler_chain_add(smpl, llama_sampler_init_top_p(0.95f, 1));
    llama_sampler_chain_add(smpl, llama_sampler_init_temp(0.8f));
    llama_sampler_chain_add(smpl, llama_sampler_init_dist(1234));

    struct llama_batch_ext *batch = llama_batch_ext_init(ctx);
    batch_set_tokens(batch, tokens, n, 0);                 /* whole prompt in one batch */
    llama_pos n_past = n;
    for (int t = 0; t < 40; t++) {
        if (llama_process(ctx, LLAMA_PROCESS_TYPE_DECODE, batch)) break;
        llama_token next = llama_sampler_sample(smpl, ctx, -1);
        if (llama_vocab_is_eog(vocab, next)) break;
        char piece[256];
        int plen = llama_token_to_piece(vocab, next, piece, sizeof(piece), 0, false);
        fwrite(piece, 1, plen, stdout); fflush(stdout);
        batch_set_tokens(batch, &next, 1, n_past++);       /* then one token at a time */
    }

    llama_batch_ext_free(batch);
    llama_sampler_free(smpl);
    llama_free(ctx);
    llama_model_free(model);
    llama_backend_free();
    return 0;
}
```

```bash
cc -std=c11 -Wall -O2 -Iinclude -Iggml/include gen.c -Lbuild/bin -lllama -Wl,-rpath,$PWD/build/bin -o gen
./gen my-q4_k_m.gguf "$PROMPT"       # PROMPT in the model's chat format (ChatML for Qwen2.5)
```

```text
Edge AI refers to computer vision and AI applications optimized for real-time processing on edge devices, such as smartphones and machines, to achieve faster, more efficient, and more cost-effective AI solutions.
[prompt tokens 16, generated 38]
```

처음 batch는 prompt 전체이고, 그 뒤로는 새 token 하나에 position `n_past`를 붙여 넘깁니다. 앞 token의 K·V는 KV cache에 남아 있으므로 매번 새 token만 계산합니다. llama.cpp의 C API는 이렇게 자주 바뀌므로, 쓰는 commit의 `examples/simple`을 기준으로 맞춥니다.

### llama-server

```bash
./build/bin/llama-server -m my-q4_k_m.gguf --host 127.0.0.1 --port 18080 -ngl 99 -c 4096
curl -s http://127.0.0.1:18080/v1/chat/completions -H "Content-Type: application/json" \
     -d '{"model":"qwen2.5-0.5b","messages":[{"role":"user","content":"Say hello in five words."}],"max_tokens":20,"temperature":0}'
```

```text
object chat.completion | finish stop | content 'Hello! How can I help you today?' | usage {'completion_tokens': 10, 'prompt_tokens': 35, ...}
```

README가 "OpenAI-compatible API server"라고 부르는 endpoint이고, 응답은 OpenAI chat completion 형식이었습니다. 짧은 user message가 prompt token 35개가 된 것은 server가 GGUF metadata의 chat template을 적용했기 때문입니다.

### 양자화 변형 비교 — imatrix와 perplexity

```bash
./build/bin/llama-imatrix -m qwen2.5-0.5b-instruct-fp16.gguf -f wiki.train.raw --chunks 40 -o imatrix.gguf -ngl 99
./build/bin/llama-quantize --imatrix imatrix.gguf qwen2.5-0.5b-instruct-fp16.gguf my-q4_k_m-imat.gguf Q4_K_M
./build/bin/llama-quantize --imatrix imatrix.gguf qwen2.5-0.5b-instruct-fp16.gguf my-iq4_nl.gguf IQ4_NL
./build/bin/llama-perplexity -m <model>.gguf -f wiki.test.raw --chunks 40 -ngl 99
```

wikitext-2(llama.cpp의 `scripts/get-wikitext-2.sh`가 받는 파일), context 512, 40 chunk의 결과입니다.

| 변형 | 크기 | PPL |
|------|-----:|----:|
| F16 | 1202.09 MiB | 14.1755 ± 0.40595 |
| Q4_K_M | 462.96 MiB | 14.8273 ± 0.42970 |
| Q4_K_M + imatrix | 462.96 MiB | 14.5803 ± 0.41925 |
| IQ4_NL + imatrix | 403.69 MiB | 15.0742 ± 0.43512 |

imatrix를 쓴 Q4_K_M은 크기가 같으면서 PPL이 14.83에서 14.58로 내려갔고, IQ4_NL은 더 작은 대신 PPL이 더 높았습니다. 40 chunk라 ± 범위가 넓으므로, 실제 선택은 쓰려는 모델과 더 긴 평가로 합니다. imatrix의 calibration(train)과 평가(test)는 다른 파일로 나눴습니다.

### llama-bench

```bash
./build/bin/llama-bench -m qwen2.5-0.5b-instruct-fp16.gguf -m my-q4_k_m.gguf -p 512 -n 128 -ngl 99,0 -r 3
```

M2 Pro에서 `-ngl 99`(Metal에 전부)와 `-ngl 0`(GPU에 layer 없음)을 비교했습니다. 단위는 token/s, 3회 평균입니다.

| 모델 | ngl | pp512 | tg128 |
|------|----:|------:|------:|
| F16 | 99 | 6163.34 ± 38.63 | 144.66 ± 1.09 |
| F16 | 0 | 1195.52 ± 77.63 | 98.46 ± 9.19 |
| Q4_K_M | 99 | 4969.75 ± 23.23 | 224.38 ± 2.48 |
| Q4_K_M | 0 | 1453.85 ± 60.76 | 192.83 ± 10.54 |

prompt 처리(pp)는 GPU offload의 효과가 컸습니다. token 생성(tg)은 GPU·CPU 모두 Q4_K_M이 F16보다 빨랐지만, GPU의 pp는 거꾸로 F16이 더 빨랐습니다. 어느 쪽이 유리한지는 장치와 측정 항목마다 달라, 대상 장치에서 `llama-bench`로 재야 합니다.

### Apple MLX

MLX README는 연산이 "currently the CPU and the GPU"에서 돌고, array가 shared memory(unified memory model)에 있다고 적습니다.

```python
from mlx_lm import load, generate
model, tokenizer = load("mlx-community/Qwen2.5-0.5B-Instruct-4bit")
messages = [{"role": "user", "content": "Explain edge AI in one sentence."}]
prompt = tokenizer.apply_chat_template(messages, add_generation_prompt=True)
response = generate(model, tokenizer, prompt=prompt, max_tokens=60, verbose=True)
```

```text
Prompt: 37 tokens, 28.795 tokens-per-sec
Generation: 49 tokens, 237.249 tokens-per-sec
Peak memory: 0.369 GB
```

이전 판처럼 문자열을 그대로 `prompt`로 넘기면 chat template이 빠지므로, `apply_chat_template`으로 감쌌습니다.

## 측정 / 성능 비교

위 두 표가 이 글의 측정입니다. 다른 장치와 비교할 때는 같은 GGUF 파일, 같은 `-p`·`-n`·`-ngl`로 `llama-bench`를 돌리고, 메모리는 weight 크기와 위 KV cache 식을 더해 계산합니다. pp는 첫 token까지의 시간, tg는 생성 속도에 해당하므로 두 값을 따로 적습니다.

## 자주 보는 함정

> ⚠️ KV cache를 빼고 메모리를 계산

Llama 3 8B Q4_K_M은 weight가 4.58 GiB지만, 32k context면 f16 KV cache가 4 GiB 더 필요합니다. context 길이를 정하기 전에 위 식으로 더합니다.

> ⚠️ q8_0 KV cache를 정확히 절반으로 계산

`q8_0`은 1.0625 byte/값이라 f16의 53%입니다(위 실행 25.5 MiB vs 48 MiB).

> ⚠️ 작은 모델의 bits/weight를 큰 모델과 같다고 봄

Q4_K_M이 8B에서는 4.89 BPW, 0.5B에서는 6.16 BPW였습니다. 파일 크기는 직접 만들어 확인합니다.

> ⚠️ 예전 C API 예제를 그대로 씀

`llama_load_model_from_file`, `llama_new_context_with_model` 같은 예전 이름은 이 commit의 `llama.h`에 아예 없고, `llama_decode`와 `llama_batch_get_one`은 deprecated입니다. 고정한 commit의 `examples/simple`을 기준으로 씁니다.

> ⚠️ Chat template 없이 prompt를 넣음

instruct 모델은 학습한 chat 형식으로 감싸야 합니다. `llama-server`와 `llama-cli`는 GGUF metadata의 template을 쓰고, 직접 API를 부를 때는 template을 적용합니다.

## 정리

- 메모리는 weight + KV cache입니다. KV cache = n_layer × 2 × n_head_kv × head_dim × n_ctx × element 크기이고, 0.5B 실행에서 식과 log가 정확히 같았습니다.
- Llama 3 8B(GQA, KV head 8)의 f16 KV cache는 4k에서 512 MiB, 32k에서 4 GiB입니다.
- Q4_K_M의 bits/weight는 모델 크기에 따라 다릅니다(8B 4.89, 0.5B 6.16).
- imatrix는 같은 크기의 Q4_K_M에서 PPL을 14.83에서 14.58로 낮췄습니다.
- llama.cpp C API는 이 commit에서 `llama_batch_ext` + `llama_process`로 바뀌었습니다.
- 성능은 `llama-bench`의 pp·tg를 대상 장치에서 같은 조건으로 잽니다.

다음 편은 **TF-M·TrustZone secure firmware**입니다.

## 관련 항목

- [12-04: Quantization](/blog/embedded/modern-recipes/part12-04-quantization)
- [12-05: TensorRT](/blog/embedded/modern-recipes/part12-05-tensorrt)
- [12-12: TF-M TrustZone](/blog/embedded/modern-recipes/part12-12-tfm-trustzone)
