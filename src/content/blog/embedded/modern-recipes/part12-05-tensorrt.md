---
title: "TensorRT 분석 — ONNX→Engine·FP16·INT8·DLA·Multi-Stream"
slug: "embedded/modern-recipes/part12-05-tensorrt"
date: 2026-04-21T09:03:00
description: "NVIDIA TensorRT로 ONNX 모델을 engine으로 빌드하고 FP16·INT8·DLA·multi-stream으로 throughput을 끌어올리는 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 141
tags: [recipes, tensorrt, jetson, dla, cuda, onnx]
topics: ["embedded"]
---

## 한 줄 요약

> **"TensorRT는 NVIDIA GPU·DLA를 위한 ahead-of-time inference compiler입니다."** TensorRT 11.0부터는 모든 network가 strongly typed라 precision을 builder flag가 아니라 모델의 tensor type과 Q/DQ node가 정하고, INT8 calibrator API는 사라졌습니다.

## 이 글이 확인한 범위

이 글을 쓴 환경에는 NVIDIA GPU가 없어 TensorRT를 실행하지 않았습니다. 대신 API와 동작은 다음 1차 자료로 확인했습니다.

- NVIDIA/TensorRT 오픈소스 저장소(commit `72fc1a3`)의 header. `NvInferVersion.h`가 11.4.0입니다.
- TensorRT 11.0.0 release notes(docs.nvidia.com)
- 같은 저장소의 `samples/trtexec/README.md`

이전 판의 성능 표(ResNet-50·YOLOv8m latency·fps, GPU 사용률)는 출처가 없어 뺐고, 이전 판 코드 가운데 TensorRT 11에서 사라진 API는 아래에서 바로잡았습니다.

## 어떤 상황에서 쓰나

Jetson 보드나 데이터센터 GPU에서 ONNX 모델을 미리 최적화한 engine으로 굽고, 실행 때는 그 engine만 불러 쓰려는 경우입니다. [12-01](/blog/embedded/modern-recipes/part12-01-edge-inference)에서 인용한 JetPack 페이지는 JetPack software stack에 CUDA·cuDNN·TensorRT가 들어 있다고 적습니다.

## 핵심 개념

흐름은 ONNX → builder → serialized engine(plan) → runtime에서 deserialize → 실행입니다. builder가 layer 조합과 kernel을 미리 고르므로, 실행 시점에는 그 결과만 씁니다. 기본 설정으로 빌드한 engine은 빌드한 TensorRT version과 GPU에 맞춰져 있으므로 target 장치(또는 같은 구성) 위에서 빌드합니다. 11.4.0 header에는 이 제약을 완화하는 `BuilderFlag::kVERSION_COMPATIBLE`과 `IBuilderConfig::setHardwareCompatibilityLevel`이 있습니다.

TensorRT 11.0 release notes에서 이 글과 직접 관련된 변화는 셋입니다.

- **Strongly typed가 기본.** "createNetworkV2() produces a strongly typed network by default in TensorRT 11.0.0. Weak typing is no longer supported." 11.4.0 header에서 `NetworkDefinitionCreationFlag::kSTRONGLY_TYPED`는 "Strongly typed mode is always enabled" 주석과 함께 deprecated이고, 이전 판이 쓰던 `kEXPLICIT_BATCH`는 header에 없습니다.
- **precision flag 제거.** per-precision `BuilderFlag` 값(`kFP16`, `kBF16`, `kFP8`, `kINT8`, `kINT4`, `kFP4` 등)이 제거됐습니다. 11.4.0 header의 `BuilderFlag`에도 `kGPU_FALLBACK`, `kTF32`, `kSPARSE_WEIGHTS` 등은 있지만 `kFP16`·`kINT8`은 없습니다. FP16으로 돌리려면 network의 tensor type이 FP16이어야 합니다.
- **implicit quantization 제거.** "The IInt8Calibrator class and all subclasses (… IInt8EntropyCalibrator2 …), setInt8Calibrator() … have been removed. Use explicit quantization with Q/DQ nodes instead." INT8 모델은 [12-04](/blog/embedded/modern-recipes/part12-04-quantization)에서 ONNX Runtime으로 만든 것 같은 Q/DQ 그래프로 넘깁니다.

## 코드 / 실제 사용 예

### trtexec

`samples/trtexec/README.md`의 예입니다. DLA에서 돌리고 DLA가 못 하는 layer는 GPU로 넘기는 명령과, dynamic shape 범위를 주는 명령입니다.

```bash
./trtexec --onnx=data/mnist/mnist.onnx --useDLACore=0 --fp16 --allowGPUFallback

./trtexec --onnx=model.onnx --minShapes=input:1x3x244x244 --optShapes=input:16x3x244x244 \
          --maxShapes=input:32x3x244x244 --shapes=input:5x3x244x244
```

README에는 아직 `--fp16`·`--int8` 예가 남아 있지만, release notes는 11.0에서 `--stronglyTyped` flag가 "has no effect"가 됐고 precision `BuilderFlag`가 제거됐다고 적습니다. 이 글에서는 TensorRT 11의 `trtexec`가 `--fp16`을 어떻게 처리하는지 실행해 확인하지 못했으므로, precision은 모델의 type으로 정한다고 보고 씁니다.

### Builder API — C++

11.4.0 header에 있는 함수만으로 다시 쓴 engine 빌드입니다. `createNetworkV2`에는 0을 넘기고(strongly typed가 기본), precision flag는 두지 않습니다.

```cpp
#include <NvInfer.h>
#include <NvOnnxParser.h>
#include <fstream>
#include <iostream>
#include <memory>

class Logger : public nvinfer1::ILogger {
    void log(Severity s, const char *msg) noexcept override {
        if (s <= Severity::kWARNING) std::cerr << msg << "\n";
    }
} g_logger;

bool build_engine(const char *onnx_path, const char *engine_path) {
    std::unique_ptr<nvinfer1::IBuilder> builder{nvinfer1::createInferBuilder(g_logger)};
    std::unique_ptr<nvinfer1::INetworkDefinition> network{builder->createNetworkV2(0)};
    std::unique_ptr<nvonnxparser::IParser> parser{nvonnxparser::createParser(*network, g_logger)};
    if (!parser->parseFromFile(onnx_path, int(nvinfer1::ILogger::Severity::kWARNING)))
        return false;

    std::unique_ptr<nvinfer1::IBuilderConfig> config{builder->createBuilderConfig()};
    config->setMemoryPoolLimit(nvinfer1::MemoryPoolType::kWORKSPACE, 1ULL << 30);

    std::unique_ptr<nvinfer1::IHostMemory> plan{builder->buildSerializedNetwork(*network, *config)};
    if (!plan) return false;
    std::ofstream f(engine_path, std::ios::binary);
    f.write(static_cast<const char *>(plan->data()), plan->size());
    return true;
}
```

이 코드는 header의 선언(`createNetworkV2(NetworkDefinitionCreationFlags)`, `setMemoryPoolLimit(MemoryPoolType, std::size_t)`, `buildSerializedNetwork(INetworkDefinition&, IBuilderConfig&)`, `IParser::parseFromFile(char const*, int)`)과 대조했을 뿐 컴파일하지 않았습니다. CUDA toolkit과 TensorRT library가 있는 Jetson·Linux GPU 장치에서 빌드합니다.

### Engine load와 inference

```cpp
auto runtime = nvinfer1::createInferRuntime(g_logger);
auto engine  = runtime->deserializeCudaEngine(buf.data(), buf.size());
auto ctx     = engine->createExecutionContext();

void *bufs[2];
cudaMalloc(&bufs[0], input_bytes);
cudaMalloc(&bufs[1], output_bytes);

ctx->setTensorAddress("input",  bufs[0]);
ctx->setTensorAddress("output", bufs[1]);

cudaStream_t stream;
cudaStreamCreate(&stream);

cudaMemcpyAsync(bufs[0], host_input,  input_bytes, cudaMemcpyHostToDevice, stream);
ctx->enqueueV3(stream);
cudaMemcpyAsync(host_output, bufs[1], output_bytes, cudaMemcpyDeviceToHost, stream);
cudaStreamSynchronize(stream);
```

`deserializeCudaEngine(void const*, std::size_t)`, `setTensorAddress(char const*, void*)`, `enqueueV3(cudaStream_t)`는 11.4.0 `NvInferRuntime.h`에 그대로 있습니다. tensor 이름 `"input"`·`"output"`은 모델의 입력·출력 이름에 맞춥니다.

### Multi-stream

execution context마다 stream과 buffer를 따로 두면 여러 frame을 동시에 넣을 수 있습니다.

```cpp
constexpr int N = 4;
cudaStream_t streams[N];
nvinfer1::IExecutionContext *ctxs[N];
void *bufs[N][2];

for (int i = 0; i < N; i++) {
    cudaStreamCreate(&streams[i]);
    ctxs[i] = engine->createExecutionContext();
    cudaMalloc(&bufs[i][0], in_bytes);
    cudaMalloc(&bufs[i][1], out_bytes);
}

for (int f = 0; f < n_frames; f++) {
    int s = f % N;
    cudaMemcpyAsync(bufs[s][0], inputs[f], in_bytes, cudaMemcpyHostToDevice, streams[s]);
    ctxs[s]->setTensorAddress("input",  bufs[s][0]);
    ctxs[s]->setTensorAddress("output", bufs[s][1]);
    ctxs[s]->enqueueV3(streams[s]);
    cudaMemcpyAsync(outputs[f], bufs[s][1], out_bytes, cudaMemcpyDeviceToHost, streams[s]);
}
for (int i = 0; i < N; i++) cudaStreamSynchronize(streams[i]);
```

throughput이 실제로 얼마나 늘어나는지는 모델과 GPU에 달려 있어, 이 글에서는 숫자를 적지 않습니다. stage 시간을 재는 방법은 [12-02](/blog/embedded/modern-recipes/part12-02-edge-pipeline-measurement)에 있습니다.

### DLA offload

```cpp
config->setDefaultDeviceType(nvinfer1::DeviceType::kDLA);
config->setDLACore(0);
config->setFlag(nvinfer1::BuilderFlag::kGPU_FALLBACK);
```

`setDefaultDeviceType`, `setDLACore`, `BuilderFlag::kGPU_FALLBACK`은 11.4.0 header에 있습니다. 이전 판의 `setFlag(kINT8)` 줄은 TensorRT 11에서 그 flag가 없으므로 뺐습니다. DLA 개수는 장치마다 다르고, [12-01](/blog/embedded/modern-recipes/part12-01-edge-inference)에서 인용한 NVIDIA Jetson Orin 비교표대로 Orin Nano 8GB에는 DLA가 없습니다.

### Custom plugin

release notes는 "The entire IPluginV2 family is deprecated, but not removed"라고 적고, 11.4.0의 `NvInferPluginBase.h`에는 `IPluginV3`가 있습니다. 새 plugin은 V3 interface로 씁니다. 이전 판의 `IPluginV2DynamicExt` 예는 deprecated interface라 뺐습니다.

## 자주 보는 함정

> ⚠️ TensorRT 10 시절 코드를 11에 그대로 빌드

`kEXPLICIT_BATCH`, `BuilderFlag::kFP16`·`kINT8`, `IInt8EntropyCalibrator2`, `setInt8Calibrator()`는 11.4.0 header에 없습니다. 인터넷의 예제 대부분이 이 이름들을 쓰므로, 빌드가 깨지면 release notes의 "Removed and Deprecated C++ APIs"를 먼저 봅니다.

> ⚠️ precision을 builder에서 정하려 함

strongly typed network에서는 FP16·INT8이 모델 안의 type과 Q/DQ node로 정해집니다. ONNX를 export할 때 FP16으로 변환하거나 Q/DQ를 넣어 둡니다.

> ⚠️ engine을 다른 장치·버전으로 옮김

기본 설정의 engine은 빌드한 TensorRT version과 GPU에 맞춰져 있습니다. 장치 위에서 빌드하거나 같은 구성의 장치에서 빌드한 engine만 배포하고, 그렇게 할 수 없으면 위의 version·hardware 호환 옵션을 검토합니다.

> ⚠️ DLA가 없는 장치에서 DLA 설정

Orin Nano에는 DLA가 없으니 DLA 설정을 넣기 전에 장치 사양을 먼저 확인합니다.

## 정리

- TensorRT는 ONNX를 미리 engine으로 굽는 inference compiler이고, 기본 설정의 engine은 version과 GPU에 맞춰져 있습니다.
- TensorRT 11은 strongly typed가 기본이라 precision을 모델의 type·Q/DQ가 정하고, `kFP16`·`kINT8` flag와 INT8 calibrator API는 제거됐습니다.
- engine 실행은 `deserializeCudaEngine` → `setTensorAddress` → `enqueueV3` 순서입니다.
- 이 글은 GPU가 없어 실행하지 않았고, API는 11.4.0 header와 11.0 release notes로 대조했습니다.

다음 편은 **TFLite Micro**입니다.

## 관련 항목

- [12-01: Edge Inference](/blog/embedded/modern-recipes/part12-01-edge-inference)
- [12-04: Quantization](/blog/embedded/modern-recipes/part12-04-quantization)
- [12-09: Jetson](/blog/embedded/modern-recipes/part12-09-jetson)
- [5-04: PCIe Streaming](/blog/embedded/modern-recipes/part11-09-pcie-streaming)
- [PE 5-08: Nsight Systems](/blog/embedded/performance-engineering/part5-08-nsight)
