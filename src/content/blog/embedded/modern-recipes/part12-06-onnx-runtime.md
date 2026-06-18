---
title: "ONNX Runtime 분석 — Execution Provider와 Cross-Platform 배포"
date: 2026-04-21T09:05:00
description: "ONNX format·ONNX Runtime의 Execution Provider (CUDA·TensorRT·DML·CoreML)·embedded build·cross-platform inference."
series: "Modern Embedded Recipes"
seriesOrder: 142
tags: [recipes, edge-ai, onnx, onnxruntime]
---

## 한 줄 요약

> **"ONNX는 *프레임워크 중립 모델 format*, ONNX Runtime은 *모든 hardware에 한 모델로 배포*하는 inference 엔진입니다."** Execution Provider만 바꿔 같은 .onnx로 CUDA, TensorRT, CoreML, DML, CPU를 골라 씁니다.

## 어떤 상황에서 쓰나

PyTorch 학습 → ONNX export → 다양한 device 배포가 가장 흔한 패턴입니다. 한 모델 file로 Windows ML, Linux GPU, macOS, Jetson, Android, iOS, embedded ARM 모두 가능합니다. TensorRT가 NVIDIA 전용이라면 ONNX Runtime은 *cross-vendor* 옵션입니다.

LLM serving (Phi, Llama via ONNX Runtime GenAI), audio model (Whisper), vision (YOLOv8) 모두 ONNX Runtime이 사실상 표준 deploy 옵션입니다.

## 핵심 개념 — ONNX format

**ONNX (Open Neural Network Exchange):**

- Protobuf 기반 그래프 representation
- Operator set version (opset)
- 모델 = nodes (ops) + initializers (weights) + I/O

```python
import torch

model = torchvision.models.resnet50(pretrained=True)
model.eval()

dummy = torch.randn(1, 3, 224, 224)
torch.onnx.export(model, dummy, "resnet50.onnx",
                  input_names=['input'],
                  output_names=['output'],
                  dynamic_axes={'input': {0: 'batch'},
                                'output': {0: 'batch'}},
                  opset_version=17)
```

`resnet50.onnx` 한 파일이 *어디서나* 동작.

## ONNX Runtime 기본

```python
import onnxruntime as ort
import numpy as np

sess = ort.InferenceSession('resnet50.onnx',
                             providers=['CPUExecutionProvider'])

input = np.random.randn(1, 3, 224, 224).astype(np.float32)
out = sess.run(['output'], {'input': input})
print(out[0].shape)
```

C++:

```cpp
#include <onnxruntime_cxx_api.h>

Ort::Env env(ORT_LOGGING_LEVEL_WARNING, "test");
Ort::SessionOptions opts;
Ort::Session sess(env, "resnet50.onnx", opts);

std::vector<int64_t> shape = {1, 3, 224, 224};
std::vector<float> input(1*3*224*224);
auto mem = Ort::MemoryInfo::CreateCpu(OrtArenaAllocator, OrtMemTypeDefault);
auto in_tensor = Ort::Value::CreateTensor<float>(mem, input.data(),
                                                  input.size(),
                                                  shape.data(), shape.size());

const char *in_name  = "input";
const char *out_name = "output";
auto outputs = sess.Run(Ort::RunOptions{}, &in_name, &in_tensor, 1, &out_name, 1);

float *out = outputs[0].GetTensorMutableData<float>();
```

## Execution Provider — Hardware별 backend

| Provider | 대상 |
|----------|------|
| `CPUExecutionProvider` | 모든 platform, fallback |
| `CUDAExecutionProvider` | NVIDIA GPU |
| `TensorrtExecutionProvider` | NVIDIA + TensorRT (속도 ↑) |
| `DmlExecutionProvider` | DirectML (Windows GPU) |
| `CoreMLExecutionProvider` | Apple GPU/ANE |
| `OpenVINOExecutionProvider` | Intel CPU/GPU/NPU |
| `QNNExecutionProvider` | Qualcomm Hexagon |
| `NNAPIExecutionProvider` | Android NPU |
| `SnpeExecutionProvider` | Qualcomm SNPE |
| `ROCMExecutionProvider` | AMD GPU |
| `ACLExecutionProvider` | ARM Compute Library |

같은 코드, provider만 바꿈:

```python
# NVIDIA
sess = ort.InferenceSession('resnet50.onnx',
    providers=['TensorrtExecutionProvider', 'CUDAExecutionProvider', 'CPUExecutionProvider'])

# Apple
sess = ort.InferenceSession('resnet50.onnx',
    providers=['CoreMLExecutionProvider', 'CPUExecutionProvider'])

# Windows DirectX
sess = ort.InferenceSession('resnet50.onnx',
    providers=['DmlExecutionProvider', 'CPUExecutionProvider'])
```

Provider 순서대로 *지원 op는 해당 provider*, *unsupported는 fallback*.

## TensorRT EP — NVIDIA에서 최고 throughput

```python
options = [
    ('TensorrtExecutionProvider', {
        'trt_fp16_enable': True,
        'trt_int8_enable': False,
        'trt_engine_cache_enable': True,
        'trt_engine_cache_path': './trt_cache',
    }),
    'CUDAExecutionProvider',
    'CPUExecutionProvider',
]
sess = ort.InferenceSession('model.onnx', providers=options)
```

첫 호출에 TensorRT가 engine을 build (수분), 이후는 cache에서 load. TensorRT 직접 쓰는 것 대비 약간 overhead. 편의성 vs 약간의 성능.

## CoreML EP — Apple Silicon

```python
sess = ort.InferenceSession('model.onnx',
    providers=[('CoreMLExecutionProvider', {
        'COREML_FLAG_USE_CPU_ONLY': False,
        'COREML_FLAG_USE_NPU': True,
    })])
```

ANE (Apple Neural Engine)에 자동 dispatch. M2/M3 Mac에서 ResNet-50 ~1ms.

## QNN EP — Qualcomm Hexagon

```python
sess = ort.InferenceSession('model.onnx',
    providers=[('QNNExecutionProvider', {
        'backend_path': '/path/to/libQnnHtp.so',
    })])
```

Snapdragon 디바이스의 Hexagon HTP (NPU)를 활용.

## Embedded / Minimal Build

```text
ONNX Runtime 전체: ~50 MB
Mobile build (선택 op만): ~5 MB
Custom slim build: 더 작게
```

CMake로 직접:

```bash
git clone https://github.com/microsoft/onnxruntime.git
cd onnxruntime
./build.sh --config MinSizeRel \
           --minimal_build \
           --disable_ml_ops \
           --include_ops_by_config required_ops.config \
           --enable_reduced_operator_type_support
```

`required_ops.config`에 *모델이 쓰는 op만* 명시.

## 모델 최적화 — ORT format

```python
import onnxruntime as ort

sess_options = ort.SessionOptions()
sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
sess_options.optimized_model_filepath = 'model.opt.onnx'

sess = ort.InferenceSession('model.onnx', sess_options)
```

`.opt.onnx`는 *최적화된 ORT format*. Mobile build에서 더 빠르게 load.

## Quantization

```python
from onnxruntime.quantization import quantize_dynamic, QuantType

quantize_dynamic('model.onnx', 'model.int8.onnx',
                 weight_type=QuantType.QInt8)
```

Dynamic quantization: weight만 INT8, activation은 runtime 변환. 빠르고 손실 적음.

Static quantization (calibration 필요):

```python
from onnxruntime.quantization import quantize_static, CalibrationDataReader

class MyReader(CalibrationDataReader):
    def get_next(self):
        return {'input': next_batch()}

quantize_static('model.onnx', 'model.int8.onnx', MyReader(),
                quant_format=QuantFormat.QDQ)
```

## 사례 — YOLOv8 multi-platform

같은 .onnx 한 파일로:

| Platform | EP | 성능 |
|----------|-----|------|
| Server (NVIDIA T4) | TensorRT EP | 250 fps |
| Workstation (RTX 4090) | CUDA EP | 400 fps |
| Jetson Orin | TensorRT EP | 80 fps |
| Mac M2 | CoreML EP | 60 fps |
| Windows + AMD GPU | DML EP | 50 fps |
| Android (Qualcomm) | QNN EP | 30 fps |
| Linux ARM (RPi5) | CPU | 5 fps |

PyTorch → ONNX export 한 번, 6 platform 배포.

## 사례 — Whisper 음성 인식

```python
import onnxruntime as ort

sess = ort.InferenceSession('whisper-tiny.onnx',
                             providers=['CoreMLExecutionProvider'])

mel = compute_mel_spectrogram(audio)  # (1, 80, 3000)
out = sess.run(None, {'input_features': mel})
tokens = greedy_decode(out[0])
```

Whisper-tiny가 Mac M2에서 *real-time보다 10배 빠르게* 동작. CoreML로 ANE 활용.

## ONNX Runtime Web — Browser

```javascript
import * as ort from 'onnxruntime-web';

const session = await ort.InferenceSession.create('model.onnx', {
    executionProviders: ['webgl', 'wasm']
});

const input = new ort.Tensor('float32', new Float32Array(...), [1, 3, 224, 224]);
const output = await session.run({input});
```

WASM + WebGL/WebGPU로 *브라우저*에서 inference. Server 없이 client에서.

## Profile

```python
sess_options = ort.SessionOptions()
sess_options.enable_profiling = True
sess = ort.InferenceSession('model.onnx', sess_options)

# Run inference
sess.run(...)
profile_file = sess.end_profiling()
# Chrome Tracing format → chrome://tracing
```

각 op의 latency가 visualize됩니다. Bottleneck op를 찾아 optimize.

## 자주 보는 함정

> Provider 우선순위 잘못

```python
providers=['CPUExecutionProvider', 'CUDAExecutionProvider']
```

CPU가 첫 번째면 CUDA가 무시됨. 빠른 것을 *먼저*.

> Unsupported op로 fallback

```text
Some nodes are not supported by TensorrtExecutionProvider
→ partition fallback to CUDA
```

EP 별로 지원 op가 다름. Verbose log로 *어느 op가 어디로 가는지* 확인.

> ONNX opset 호환

```text
TensorRT 8.4 supports opset 17
Model opset 18 → fail or downgrade
```

ONNX export 시 target EP에 맞는 opset 선택.

> Dynamic shape 미지원

```python
dynamic_axes={'input': {0: 'batch'}}
```

지원되지만 TensorRT EP는 min/max shape 명시 필요. 그렇지 않으면 매 호출마다 engine rebuild.

> Calibration data 부족

Static INT8 quantization에서 calibration data가 부족하면 accuracy 5-10% 손실. 500~1000장 권장.

> Mobile build에서 op 누락

```text
Op 'GridSample' not found
```

Custom build에서 op를 빠뜨림. `required_ops.config` 재생성.

## 정리

- ONNX = 프레임워크 중립 모델 format.
- ONNX Runtime = 그 모델을 *어떤 hardware*에서도 돌리는 inference 엔진.
- Execution Provider만 바꿔서 CPU/CUDA/TensorRT/CoreML/DML/QNN/NNAPI 전환.
- Provider 순서: 빠른 것 먼저, 마지막에 CPU fallback.
- Minimal build로 5 MB까지 줄임. Embedded·mobile에 적합.
- Dynamic INT8 quantization은 calibration 없이 빠르게.
- ORT format으로 mobile loading 최적화.
- Browser inference도 onnxruntime-web으로 가능.
- 모델 한 번 export로 다양한 platform 배포가 ONNX Runtime의 핵심 가치.

다음 편은 **Series 마지막 — Modern Embedded Recipes 정리**입니다.

## 관련 항목

- [12-02: NPU 아키텍처](/blog/embedded/modern-recipes/part12-02-npu-architecture)
- [12-04: TensorRT](/blog/embedded/modern-recipes/part12-04-tensorrt)
- [12-05: TFLite Micro](/blog/embedded/modern-recipes/part12-05-tflite-micro)
- [6-01: Edge Inference](/blog/embedded/modern-recipes/part12-01-edge-inference)
- [6-03: Quantization](/blog/embedded/modern-recipes/part12-03-quantization)
