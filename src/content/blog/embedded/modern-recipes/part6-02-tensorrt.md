---
title: "6-02: TensorRT — ONNX→Engine·FP16·INT8·DLA·Multi-Stream"
date: 2026-05-07T02:00:00
description: "NVIDIA TensorRT로 ONNX 모델을 engine으로 빌드하고 FP16·INT8·DLA·multi-stream으로 throughput을 끌어올리는 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 32
tags: [recipes, tensorrt, jetson, dla, cuda, onnx]
---

## 한 줄 요약

> **"TensorRT는 NVIDIA GPU·DLA를 위한 ahead-of-time inference compiler입니다."** ONNX를 한 번 engine으로 굽고 나면 같은 hardware에서 cuDNN 대비 2~5배, FP16·INT8까지 적용하면 추가로 2~4배 빨라집니다.

## 어떤 상황에서 쓰나

Jetson 보드(Nano·Xavier·Orin)나 데이터센터 GPU(T4·A100·L4)에서 추론을 돌릴 때 사실상 표준입니다. 자율주행 인지 스택, 의료영상 분석, 비디오 분석 서버, edge AI 박스에서 TensorRT를 안 쓰는 경우를 찾기가 어렵습니다.

TensorRT를 쓰지 않고 PyTorch·TF를 그대로 deploy하면 framework overhead와 미활용 layer 최적화로 성능을 절반도 못 씁니다. 반대로 TensorRT engine으로 미리 굽고 fp16·int8·DLA·multi-stream까지 적용하면 같은 hardware의 한계까지 끌어낼 수 있습니다.

## 핵심 개념

TensorRT는 *ahead-of-time compile*이 핵심입니다.

```text
PyTorch/TF model
   ↓ export
ONNX (graph representation)
   ↓ trtexec / Builder API
.engine (device-specific binary)
   ↓ load at runtime
inference
```

Engine은 *device + driver + TensorRT version*에 묶입니다. Orin에서 빌드한 engine을 Xavier로 옮기면 deserialize가 실패합니다. 그래서 보통 *target device 위에서* 빌드합니다.

Build 시 결정하는 핵심 옵션 세 가지입니다.

```text
Precision     FP32 (기본) → FP16 (2x) → INT8 (추가 2x, calibration 필요)
Workspace     layer 변형 시 사용할 임시 메모리 (보통 1~2 GB)
Device type   GPU (Tensor core) 또는 DLA (저전력 INT8 전용)
```

INT8은 *representative dataset*으로 activation 분포를 측정해 scale을 잡아야 합니다. 100~1000장 정도가 보통입니다. 데이터 분포가 deploy 환경과 다르면 accuracy가 크게 떨어집니다.

Multi-stream은 여러 CUDA stream으로 *frame을 in-flight로 겹쳐* throughput을 늘리는 패턴입니다. Latency는 같지만 throughput이 stream 수만큼 늘어납니다.

## 코드 / 실제 사용 예

### trtexec — CLI로 빠르게

```bash
# FP16 engine
trtexec --onnx=model.onnx --saveEngine=model_fp16.engine --fp16

# INT8 with calibration cache
trtexec --onnx=model.onnx --saveEngine=model_int8.engine \
        --int8 --calib=calib.cache

# DLA core 0 with GPU fallback
trtexec --onnx=model.onnx --saveEngine=model_dla.engine \
        --fp16 --useDLACore=0 --allowGPUFallback

# 동적 batch size
trtexec --onnx=model.onnx --saveEngine=model.engine --fp16 \
        --minShapes=input:1x3x224x224 \
        --optShapes=input:8x3x224x224 \
        --maxShapes=input:16x3x224x224
```

대부분의 프로토타입은 `trtexec`로 시작해도 충분합니다. 빌드 시간이 길어 production에서는 캐시된 engine을 그대로 배포합니다.

### Builder API — C++

```cpp
#include <NvInfer.h>
#include <NvOnnxParser.h>

class Logger : public nvinfer1::ILogger {
    void log(Severity s, const char *msg) noexcept override {
        if (s <= Severity::kWARNING) std::cerr << msg << "\n";
    }
} g_logger;

void build_engine(const char *onnx_path, const char *engine_path) {
    auto builder = nvinfer1::createInferBuilder(g_logger);
    auto flag    = 1U << int(nvinfer1::NetworkDefinitionCreationFlag::kEXPLICIT_BATCH);
    auto network = builder->createNetworkV2(flag);

    auto parser = nvonnxparser::createParser(*network, g_logger);
    parser->parseFromFile(onnx_path, int(nvinfer1::ILogger::Severity::kWARNING));

    auto config = builder->createBuilderConfig();
    config->setMemoryPoolLimit(nvinfer1::MemoryPoolType::kWORKSPACE, 1ULL << 30);
    config->setFlag(nvinfer1::BuilderFlag::kFP16);

    auto serialized = builder->buildSerializedNetwork(*network, *config);

    std::ofstream f(engine_path, std::ios::binary);
    f.write(static_cast<const char*>(serialized->data()), serialized->size());
}
```

`createNetworkV2`에 `kEXPLICIT_BATCH`를 안 주면 옛 implicit batch mode로 떨어져 dynamic shape이 어색하게 동작합니다. 최신 코드는 거의 항상 explicit batch입니다.

### Engine load + inference

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

`enqueueV3`이 최신 API입니다. 같은 engine에서 여러 context를 만들면 *동시 추론*이 가능합니다.

### INT8 calibration

```cpp
class Int8Calibrator : public nvinfer1::IInt8EntropyCalibrator2 {
    std::vector<std::string> files_;
    int idx_ = 0;
    void *device_input_;
    size_t input_size_;
public:
    int32_t getBatchSize() const noexcept override { return 1; }
    bool getBatch(void *bindings[], const char *names[],
                  int n_bindings) noexcept override {
        if (idx_ >= files_.size()) return false;
        load_image(files_[idx_++], host_buf_);
        cudaMemcpy(device_input_, host_buf_, input_size_,
                   cudaMemcpyHostToDevice);
        bindings[0] = device_input_;
        return true;
    }
    /* readCalibrationCache / writeCalibrationCache는 파일 IO만 */
};

config->setFlag(nvinfer1::BuilderFlag::kINT8);
config->setInt8Calibrator(&calibrator);
```

KL-divergence 기반 entropy calibrator가 기본입니다. Representative dataset 500~1000장 정도면 ResNet·YOLO 계열에서 충분합니다.

### Multi-stream pipeline

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
    cudaMemcpyAsync(bufs[s][0], inputs[f], in_bytes,
                    cudaMemcpyHostToDevice, streams[s]);
    ctxs[s]->setTensorAddress("input",  bufs[s][0]);
    ctxs[s]->setTensorAddress("output", bufs[s][1]);
    ctxs[s]->enqueueV3(streams[s]);
    cudaMemcpyAsync(outputs[f], bufs[s][1], out_bytes,
                    cudaMemcpyDeviceToHost, streams[s]);
}
for (int i = 0; i < N; i++) cudaStreamSynchronize(streams[i]);
```

Copy·compute가 stream 간에 겹쳐 GPU utilization이 70~95%까지 올라옵니다. Latency 자체는 변하지 않지만 frame rate가 stream 수에 비례해 늘어납니다.

### DLA offload

```cpp
config->setDefaultDeviceType(nvinfer1::DeviceType::kDLA);
config->setDLACore(0);
config->setFlag(nvinfer1::BuilderFlag::kGPU_FALLBACK);
config->setFlag(nvinfer1::BuilderFlag::kINT8);
```

Jetson Xavier·Orin에는 DLA가 2개 있습니다. GPU와 동시에 돌리면 *세 개의 추론 instance*가 병렬로 굴러갑니다. DLA가 지원하지 않는 layer는 `kGPU_FALLBACK`으로 GPU에 떨어뜨려야 build가 성공합니다.

### Custom plugin

```cpp
class MyPlugin : public nvinfer1::IPluginV2DynamicExt {
public:
    int enqueue(const nvinfer1::PluginTensorDesc *inDesc,
                const nvinfer1::PluginTensorDesc *outDesc,
                const void *const *ins, void *const *outs,
                void *ws, cudaStream_t stream) noexcept override {
        const int n = inDesc[0].dims.d[0] * inDesc[0].dims.d[1];
        my_kernel<<<(n + 255) / 256, 256, 0, stream>>>(
            (const float*)ins[0], (float*)outs[0], n);
        return 0;
    }
    /* getOutputDimensions / supportsFormatCombination / clone 등 구현 */
};
```

ONNX 표준에 없는 연산은 plugin으로 직접 CUDA kernel을 끼워 넣습니다. NMS·custom activation·후처리가 흔한 사례입니다.

## 측정 / 성능 비교

Jetson AGX Orin, 동일 ResNet-50, batch 1 기준입니다.

```text
구현                         Latency    Throughput   GPU 사용률
PyTorch eager                 18 ms       55 fps       40%
TensorRT FP32                  6 ms      170 fps       85%
TensorRT FP16                  3 ms      330 fps       80%
TensorRT INT8                  1.5 ms    660 fps       75%
TensorRT INT8 + 4 stream       1.5 ms   2200 fps       95%
TensorRT INT8 on DLA + GPU FP16             1500 fps   GPU 50% + DLA 100%
```

FP16만 켜도 PyTorch 대비 6배 빨라집니다. INT8까지 가면 11배, multi-stream + DLA까지 합치면 동일 hardware에서 30~40배까지 throughput이 오릅니다.

YOLOv8m + Orin 기준 비교입니다.

```text
구현                         Latency     fps
PyTorch FP32                  35 ms      29
TensorRT FP16                  6 ms     167
TensorRT INT8                  4 ms     250
TensorRT INT8 + 2 stream       4 ms     500
```

자율주행 carrier 카메라 8대 × 30 fps = 240 fps가 single Orin AGX에서 처리 가능한 수준입니다.

## 자주 보는 함정

> Engine을 다른 device에서 빌드

```cpp
runtime->deserializeCudaEngine(buf, sz);
/* device mismatch → nullptr 또는 runtime error */
```

Engine은 *device + driver + TensorRT version* 모두에 묶입니다. CI에서 target device 위에서 빌드하거나, 첫 boot에 device에서 빌드 후 cache합니다.

> FP32 default 그대로 deploy

```cpp
auto config = builder->createBuilderConfig();
auto engine = builder->buildSerializedNetwork(*network, *config);
/* FP32 — Tensor core 못 씀 */
```

`kFP16` 또는 `kINT8`을 명시해야 Tensor core가 활성화됩니다.

> INT8 calibration data가 deploy 환경과 다름

```text
실내 calibration → 야외 deploy → accuracy 10% ↓
```

Representative dataset은 실제 deploy 분포에서 sampling합니다. Day/night, indoor/outdoor를 섞어 줍니다.

> Dynamic shape 미지원 layer

```text
opset 17 model → 일부 op 미지원 → fallback or error
```

`--minShapes`/`--optShapes`/`--maxShapes`로 범위를 지정하거나, dynamic batch만 쓰고 H·W는 fixed로 둡니다.

> Single stream + 작은 batch

```cpp
ctx->enqueueV3(default_stream);   /* GPU 30% */
```

Multi-stream + pipeline copy로 GPU 사용률 80%대를 목표로 합니다.

> DLA에 unsupported op 그대로

```cpp
config->setDefaultDeviceType(DeviceType::kDLA);
/* op unsupported → build fail */
```

`kGPU_FALLBACK` flag를 항상 같이 둡니다. 어떤 layer가 GPU로 떨어졌는지는 verbose 로그로 확인합니다.

## 정리

- TensorRT는 ONNX를 ahead-of-time으로 engine으로 굽는 NVIDIA inference compiler입니다.
- Engine은 device·driver·TensorRT version에 묶이므로 target에서 빌드합니다.
- FP16·INT8 flag로 Tensor core를 활성화해 2~4배 가속을 얻습니다.
- INT8은 representative dataset으로 entropy calibration이 필요합니다.
- Multi-stream과 DLA를 같이 쓰면 같은 hardware에서 throughput이 수십 배 늘어납니다.
- Custom op는 PluginV2DynamicExt로 CUDA kernel을 직접 끼웁니다.
- `trtexec`는 프로토타입과 벤치마크 모두에 첫 선택입니다.
- Verbose 로그로 layer fusion과 device assignment를 항상 확인합니다.

다음 편은 **Quantization** 깊이 살펴보기입니다.

## 관련 항목

- [6-01: Edge Inference](/blog/embedded/modern-recipes/part6-01-edge-inference)
- [6-03: Quantization](/blog/embedded/modern-recipes/part6-03-quantization)
- [6-05: Jetson](/blog/embedded/modern-recipes/part6-05-jetson)
- [5-04: PCIe Streaming](/blog/embedded/modern-recipes/part5-04-pcie-streaming)
- [PE 5-08: Nsight Systems](/blog/embedded/performance-engineering/part5-08-nsight)
