---
title: "6-02: TensorRT 통합 — Build·Plugin·DLA·Multi-Stream"
date: 2026-05-21T02:00:00
description: "NVIDIA TensorRT engine build, custom plugin, DLA offload, multi-stream, profiling."
series: "Modern Embedded Recipes"
seriesOrder: 32
tags: [recipes, tensorrt, jetson, dla, cuda]
draft: true
---

## 한 줄 요약

> **"TensorRT = NVIDIA GPU·NPU 가속 inference engine"** — 최적화된 layer kernel.

## Engine Build Pipeline

```text
PyTorch/TF model
   ↓ export
ONNX model
   ↓ TensorRT build
.engine (binary)
   ↓ load
inference
```

Build = *한 번*, inference = *반복*. Engine은 *device-specific* (compute capability).

## Build — C++ API

```cpp
#include <NvInfer.h>
#include <NvOnnxParser.h>

class Logger : public nvinfer1::ILogger {
    void log(Severity s, const char *msg) noexcept override {
        if (s <= Severity::kWARNING) std::cerr << msg << "\n";
    }
} logger;

auto *builder = nvinfer1::createInferBuilder(logger);
auto *network = builder->createNetworkV2(
    1U << static_cast<int>(NetworkDefinitionCreationFlag::kEXPLICIT_BATCH));

auto *parser = nvonnxparser::createParser(*network, logger);
parser->parseFromFile("model.onnx",
                      static_cast<int>(Severity::kWARNING));

auto *config = builder->createBuilderConfig();
config->setMemoryPoolLimit(MemoryPoolType::kWORKSPACE, 1ULL << 30);
config->setFlag(BuilderFlag::kFP16);   /* FP16 */

auto *engine = builder->buildSerializedNetwork(*network, *config);

/* Save */
std::ofstream f("model.engine", std::ios::binary);
f.write(static_cast<const char*>(engine->data()), engine->size());
```

`trtexec` CLI도 동일:

```bash
trtexec --onnx=model.onnx --saveEngine=model.engine --fp16
```

## Engine Load + Inference

```cpp
auto *runtime = nvinfer1::createInferRuntime(logger);
auto *engine = runtime->deserializeCudaEngine(engine_data, engine_size);

auto *ctx = engine->createExecutionContext();

/* Allocate buffers */
void *bufs[2];
cudaMalloc(&bufs[0], input_size);
cudaMalloc(&bufs[1], output_size);

/* Inference */
cudaMemcpyAsync(bufs[0], input_data, input_size, cudaMemcpyHostToDevice, stream);
ctx->enqueueV3(stream);
cudaMemcpyAsync(output_data, bufs[1], output_size, cudaMemcpyDeviceToHost, stream);
cudaStreamSynchronize(stream);
```

`enqueueV3` — modern API. *async on stream*.

## Multi-Stream — Pipeline

```cpp
const int N_STREAMS = 4;
cudaStream_t streams[N_STREAMS];
nvinfer1::IExecutionContext *ctxs[N_STREAMS];

for (int i = 0; i < N_STREAMS; i++) {
    cudaStreamCreate(&streams[i]);
    ctxs[i] = engine->createExecutionContext();
}

/* Pipeline — N frames in-flight */
for (int frame = 0; frame < N_FRAMES; frame++) {
    int s = frame % N_STREAMS;
    cudaMemcpyAsync(bufs[s][0], inputs[frame], ..., streams[s]);
    ctxs[s]->enqueueV3(streams[s]);
    cudaMemcpyAsync(outputs[frame], bufs[s][1], ..., streams[s]);
}
```

Stream 4개 → throughput *최대 4x*. Jetson GPU·DLA *parallel utilization*.

## DLA — Deep Learning Accelerator (Jetson)

```cpp
/* DLA 사용 — 별도 hardware engine */
config->setDefaultDeviceType(nvinfer1::DeviceType::kDLA);
config->setDLACore(0);    /* DLA core 0 */
config->setFlag(BuilderFlag::kGPU_FALLBACK);   /* unsupported layers는 GPU */
```

Jetson Xavier·Orin — *2 DLA core*. INT8 quantize, *very low power*.

GPU + DLA 둘 다 사용 — *3 inference instance*.

## Custom Plugin

```cpp
class MyPlugin : public nvinfer1::IPluginV2DynamicExt {
public:
    int32_t enqueue(const nvinfer1::PluginTensorDesc *inputDesc,
                     const nvinfer1::PluginTensorDesc *outputDesc,
                     const void *const *inputs, void *const *outputs,
                     void *workspace, cudaStream_t stream) noexcept override {
        /* Custom CUDA kernel */
        my_cuda_kernel<<<grid, block, 0, stream>>>(
            (float*)inputs[0], (float*)outputs[0], n);
        return 0;
    }
    /* ... */
};
```

ONNX에 없는 custom op — *CUDA kernel + plugin*. NMS·custom activation 등.

## TensorRT-LLM — Modern LLM

```cpp
/* LLama 7B in TensorRT */
trtllm::ModelConfig cfg;
cfg.builder_opt = trtllm::BuilderOpt{
    .use_fp16 = true,
    .use_inflight_batching = true,
};

trtllm::Builder builder(cfg);
auto engine = builder.build_from_huggingface("meta-llama/Llama-2-7b");
```

LLM serving — TensorRT-LLM·vLLM·tinygrad.

## Inflight Batching

```text
Inflight batching:
  - 여러 sequence가 *다른 length*
  - 짧은 것이 끝나면 *바로 새 sequence 추가*
  - GPU utilization 90%+
```

Naive batching — *longest sequence 기다림*. Inflight — *동적 scheduling*.

## Profiling — Nsight Systems

```bash
nsys profile --trace=cuda,nvtx ./trt_inference

# Per-layer timing
trtexec --loadEngine=model.engine --dumpProfile

# Layer breakdown:
# Conv1d        2.3 ms
# Conv2d        5.1 ms
# Activation    0.8 ms
# Pool          1.2 ms
# ...
```

Bottleneck layer 식별 → *fuse·skip·custom*.

## Tactic Selection

```cpp
config->setProfilingVerbosity(ProfilingVerbosity::kDETAILED);
```

TensorRT가 *layer 마다 여러 algorithm 시도* → 최적 선택. 빌드 시간 ↑ but inference 빠름.

## Cached Engine

```bash
# Build time 큰 model — 캐시 활용
trtexec --onnx=model.onnx --saveEngine=cache/model_fp16.engine --fp16
```

같은 GPU·driver·TensorRT version — *engine 재사용*.

## ONNX Optimization

```python
# Polygraphy — ONNX 분석·최적화
import polygraphy.backend.trt as trt
import polygraphy.backend.onnx as onnx

# Constant folding
optimized = onnx.fold_constants(model)

# Build TensorRT
engine = trt.engine_from_network(
    trt.network_from_onnx_path("model.onnx"),
    config=trt.CreateConfig(fp16=True))
```

ONNX 단계에서 *불필요한 layer 제거·fold*.

## Mixed Precision Strategy

```text
Layer별:
  Conv·MatMul — FP16 (또는 INT8)
  Activation·Pool — FP16
  Normalization — FP32 (정확도)
  Output — FP32 (loss 계산)
```

```cpp
ITensor *t = ...;
t->setPrecision(DataType::kFP32);   /* layer별 명시 */
```

## Jetson Orin Spec

```text
Jetson AGX Orin:
  CPU: 12 × Cortex-A78AE
  GPU: 2048 CUDA + 64 Tensor core (Ampere)
  DLA: 2 (Deep Learning Accelerator)
  
TensorRT performance:
  YOLOv8m FP16: 5 ms (200 fps)
  ResNet-50 INT8: 1.5 ms (660 fps)
  Llama 7B FP16: 30 token/s
```

## TensorRT Engine — Device Specificity

```text
Built engine — *device + driver + TensorRT version* 의존
  Jetson Orin engine → Xavier에서 *load 실패*
  
Solution:
  Build on target device
  또는 trtexec --useDLACore + --device 명시
```

## 자주 하는 실수

> ⚠️ FP32 default

```cpp
config->setFlag(BuilderFlag::kFP16);   // 잊기 쉬움
```

→ FP16 또는 INT8 명시.

> ⚠️ Engine 다른 device

```cpp
deserializeCudaEngine();   // device mismatch — runtime error
```

→ target device에서 build.

> ⚠️ Single stream

```cpp
ctx->enqueueV3(default_stream);
```

→ multiple stream + pipeline.

> ⚠️ DLA fallback 없이 unsupported op

```cpp
config->setDefaultDeviceType(DeviceType::kDLA);
/* op unsupported → build fail */
```

→ `kGPU_FALLBACK` flag.

## 정리

- TensorRT = **GPU·DLA inference engine**.
- Build = 한 번 (`.engine`), inference = 반복.
- **Multi-stream** + **DLA** = throughput 최대.
- **Custom plugin** — ONNX 외 op.
- **Inflight batching** — LLM serving.
- Jetson Orin — TensorRT 표준.

다음 편은 **Quantization**.

## 관련 항목

- [6-01: Edge Inference](/blog/embedded/modern-recipes/part6-01-edge-inference)
- [6-03: Quantization](/blog/embedded/modern-recipes/part6-03-quantization)
