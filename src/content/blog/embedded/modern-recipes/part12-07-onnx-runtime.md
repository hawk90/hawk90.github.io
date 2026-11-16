---
title: "ONNX Runtime 분석 — Execution Provider와 Cross-Platform 배포"
slug: "embedded/modern-recipes/part12-07-onnx-runtime"
date: 2026-04-21T09:05:00
description: "ONNX format·ONNX Runtime의 Execution Provider (CUDA·TensorRT·DML·CoreML)·embedded build·cross-platform inference."
series: "Modern Embedded Recipes"
seriesOrder: 143
tags: [recipes, edge-ai, onnx, onnxruntime]
topics: ["embedded"]
---

## 한 줄 요약

> **"ONNX는 모델 교환 format이고 ONNX Runtime은 Execution Provider(EP) 기반 inference engine입니다."** 같은 `.onnx`라도 어느 EP가 어느 node를 맡는지에 따라 속도가 10배 넘게 달라지므로, 실행 뒤 node 배치를 확인합니다.

## 이 글의 실행 환경

- **Linux**: Debian 13 arm64 guest(4 vCPU), Python 3.13.5, `torch` 2.15.0+cpu, `torchvision` 0.29.2, `onnx` 1.23.2, `onnxruntime` 1.32.0.
- **macOS**: Apple M2 Pro, macOS 27.2.1, Python 3.14 venv의 `onnxruntime` 1.32.0(PyPI wheel). C++은 GitHub release `onnxruntime-osx-arm64-1.32.0.tgz`와 Apple clang 21.0.0.
- **모델**: torchvision ResNet-50을 `weights=None`(무작위 초기화)으로 export했습니다. 정확도가 아니라 동작·node 배치·시간을 보려는 실행입니다.
- **EP 이름·option·build flag**: `microsoft/onnxruntime` main(commit `368a672`, `VERSION_NUMBER` 1.33.0)의 소스와 대조했습니다.

## 어떤 상황에서 쓰나

PyTorch로 학습한 모델을 ONNX로 한 번 export하고, 배포할 장치마다 EP만 바꿔 돌리려는 경우입니다. EP 목록은 장치·빌드마다 다릅니다. 같은 1.32.0 wheel이 Linux arm64 guest에서는 `['AzureExecutionProvider', 'CPUExecutionProvider']`, macOS에서는 `['CoreMLExecutionProvider', 'AzureExecutionProvider', 'CPUExecutionProvider']`를 돌려줬습니다.

## 핵심 개념 — ONNX format

ONNX 파일은 protobuf로 된 graph입니다. node(op), initializer(weight), 입력·출력, 그리고 op 의미를 정하는 opset version이 들어 있습니다.

```python
import torch, torchvision

model = torchvision.models.resnet50(weights=None).eval()
dummy = torch.randn(1, 3, 224, 224)
torch.onnx.export(model, dummy, "resnet50.onnx",
                  input_names=["input"], output_names=["output"],
                  dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
                  opset_version=17)
```

이전 판의 `pretrained=True`는 지금의 torchvision API인 `weights=`로 바꿨습니다. torch 2.15에서 이 호출은 그대로 돌지만 결과가 예전과 다릅니다.

```text
UserWarning ... 'dynamic_axes' is not recommended when dynamo=True ... Supply the 'dynamic_shapes' argument
default opset [('ai.onnx', 18)] input dim0 dim_param: "batch"
```

PyTorch 2.9부터 기본 exporter가 `torch.export` 기반(dynamo)으로 바뀌어, `opset_version=17`을 줬는데 결과 opset은 18이었고, weight는 `resnet50.onnx.data`(102,015,648 byte)라는 별도 파일로 나왔습니다. `.onnx` 본체는 218,388 byte뿐입니다. `dynamo=False`를 주면 옛 TorchScript exporter가 opset 17의 단일 파일(102,057,677 byte)을 만들지만 deprecated 경고가 나옵니다. 아래 실행은 이 단일 파일로 했습니다. 배포할 때는 `.data` 파일을 같이 옮겨야 하는지 먼저 확인합니다.

## ONNX Runtime 기본

```python
import onnxruntime as ort
import numpy as np

sess = ort.InferenceSession("resnet50.onnx", providers=["CPUExecutionProvider"])
x = np.random.default_rng(0).standard_normal((1, 3, 224, 224), dtype=np.float32)
out = sess.run(["output"], {"input": x})
print(out[0].shape)                                              # (1, 1000)
print(sess.run(None, {"input": np.repeat(x, 4, 0)})[0].shape)    # (4, 1000): dynamic batch
```

C++ API로 같은 모델을 한 번 돌리는 코드입니다. release tarball의 header와 library로 빌드했습니다.

```cpp
#include <onnxruntime_cxx_api.h>
#include <algorithm>
#include <cstdio>
#include <vector>

int main() {
    Ort::Env env(ORT_LOGGING_LEVEL_WARNING, "test");
    Ort::SessionOptions opts;
    Ort::Session sess(env, "resnet50-legacy.onnx", opts);

    std::vector<int64_t> shape = {1, 3, 224, 224};
    std::vector<float> input(1 * 3 * 224 * 224, 0.5f);
    auto mem = Ort::MemoryInfo::CreateCpu(OrtArenaAllocator, OrtMemTypeDefault);
    auto in_tensor = Ort::Value::CreateTensor<float>(mem, input.data(), input.size(),
                                                     shape.data(), shape.size());

    const char *in_name  = "input";
    const char *out_name = "output";
    auto outputs = sess.Run(Ort::RunOptions{}, &in_name, &in_tensor, 1, &out_name, 1);

    float *out = outputs[0].GetTensorMutableData<float>();
    auto n = outputs[0].GetTensorTypeAndShapeInfo().GetElementCount();
    std::printf("output elements %zu, top-1 index %ld\n", (size_t)n,
                (long)(std::max_element(out, out + n) - out));
}
```

```bash
O=onnxruntime-osx-arm64-1.32.0
c++ -std=c++17 -O2 -I$O/include infer.cc -L$O/lib -lonnxruntime -Wl,-rpath,$PWD/$O/lib -o infer
./infer
```

```text
output elements 1000, top-1 index 713
```

## Execution Provider

ONNX Runtime main의 `include/onnxruntime/core/graph/constants.h`에 정의된 이름 가운데 이 글과 관련된 것입니다. 문자열은 대소문자까지 정확해야 합니다.

| Provider 문자열 | 대상 |
|-----------------|------|
| `CPUExecutionProvider` | 모든 platform, 마지막 fallback |
| `CUDAExecutionProvider` | NVIDIA GPU |
| `TensorrtExecutionProvider` | NVIDIA GPU + TensorRT |
| `DmlExecutionProvider` | DirectML (Windows) |
| `CoreMLExecutionProvider` | Apple CoreML |
| `OpenVINOExecutionProvider` | Intel OpenVINO |
| `QNNExecutionProvider` | Qualcomm QNN |
| `NnapiExecutionProvider` | Android NNAPI |
| `SNPEExecutionProvider` | Qualcomm SNPE |
| `XnnpackExecutionProvider` | XNNPACK |

이전 판의 `NNAPIExecutionProvider`·`SnpeExecutionProvider`는 철자가 틀렸고, `ROCMExecutionProvider`·`ACLExecutionProvider`는 현재 main의 `constants.h`와 `onnxruntime/core/providers/` 디렉터리에 없어 뺐습니다.

providers 목록은 **앞에 있는 EP부터** node를 가져갑니다. 앞 EP가 지원하지 않는 node만 뒤로 넘어갑니다. 목록에 그 build에 없는 EP를 적으면 오류가 아니라 경고만 나고 빠집니다.

```text
UserWarning: Specified provider 'CUDAExecutionProvider' is not in available provider names.Available providers: 'AzureExecutionProvider, CPUExecutionProvider'
session providers ['CPUExecutionProvider']
```

GPU가 있는 줄 알고 배포했는데 CPU로 돌고 있을 수 있으니 `sess.get_providers()`를 log로 남깁니다.

## CoreML EP — 실제 측정

M2 Pro에서 같은 ResNet-50을 EP와 CoreML `MLComputeUnits`만 바꿔 돌렸습니다. 시간은 30회 실행의 중앙값이고, node 배치는 ORT profiler의 `provider` 필드로 셌습니다.

```python
sess = ort.InferenceSession("resnet50.onnx",
    providers=[("CoreMLExecutionProvider", {"MLComputeUnits": "CPUAndNeuralEngine"}),
               "CPUExecutionProvider"])
```

| providers | 중앙값 | kernel node 배치 | CPU 대비 최대 절대 오차 |
|-----------|-------:|------------------|----------------------:|
| `CPU` | 29.50 ms | CPU 57 | — |
| `CoreML(ALL)`, `CPU` | 2.78 ms | CoreML 1 | 0.2466 |
| `CoreML(CPUAndNeuralEngine)`, `CPU` | 2.71 ms | CoreML 1 | 0.2466 |
| `CoreML(CPUAndGPU)`, `CPU` | 4.56 ms | CoreML 1 | 1.053 |
| `CoreML(CPUOnly)`, `CPU` | 12.43 ms | CoreML 1 | 5.3e-05 |
| `CPU`, `CoreML` (순서 반대) | 28.87 ms | CPU 57 | — |

CoreML EP가 graph 전체를 node 하나로 가져가면 CPU EP보다 10배 넘게 빨랐습니다. 순서를 `CPU`, `CoreML`로 바꾸면 CPU EP가 모든 node를 먼저 가져가 CoreML은 하나도 받지 못했습니다. CPU EP 대비 최대 절대 오차는 `CPUOnly`에서 5.3e-05, 나머지 설정에서 0.25~1.05였고, 이 글에서는 그 원인을 따로 확인하지 않았습니다. 실제 모델에서는 정확도 지표로 다시 비교합니다.

이전 판의 option 이름은 CoreML EP가 받지 않습니다. 그대로 넣은 결과입니다.

```text
EP Error .../coreml_options.cc:68 ... Unknown option: COREML_FLAG_USE_CPU_ONLY
Falling back to ['CPUExecutionProvider'] and retrying.
```

Python API는 이 오류 뒤 CPU로 다시 session을 만들어 **실행은 계속됩니다**(CPU EP만으로 32.75 ms). `COREML_FLAG_USE_CPU_ONLY`는 C API의 flag 값이고, provider option 문자열은 `coreml_provider_factory.h`의 `MLComputeUnits`·`ModelFormat`·`RequireStaticInputShapes`·`EnableOnSubgraphs` 등입니다. `COREML_FLAG_USE_NPU`는 header에 없습니다.

## TensorRT·QNN EP option

이 글에서는 NVIDIA GPU와 Qualcomm 장치가 없어 실행하지 않았고, option 이름만 소스에서 확인했습니다.

```python
trt = ("TensorrtExecutionProvider", {
    "trt_fp16_enable": True,
    "trt_engine_cache_enable": True,
    "trt_engine_cache_path": "./trt_cache",
})
sess = ort.InferenceSession("model.onnx", providers=[trt, "CUDAExecutionProvider", "CPUExecutionProvider"])

qnn = ("QNNExecutionProvider", {"backend_path": "/path/to/libQnnHtp.so"})
```

`trt_fp16_enable`, `trt_int8_enable`, `trt_engine_cache_enable`, `trt_engine_cache_path`, dynamic shape용 `trt_profile_min_shapes` 등은 `onnxruntime/core/providers/tensorrt/`의 option 정의에 있고, QNN EP는 `backend_path`나 `backend_type` 중 하나로 backend를 고릅니다. TensorRT 11에서 바뀐 precision 처리는 [12-05](/blog/embedded/modern-recipes/part12-05-tensorrt)를 봅니다.

## Graph 최적화와 ORT format

`optimized_model_filepath`는 최적화한 graph를 **ONNX 파일로** 저장합니다. ORT format(`.ort`)이 아닙니다.

```python
so = ort.SessionOptions()
so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
so.optimized_model_filepath = "model.opt.onnx"
ort.InferenceSession("resnet50.onnx", so, providers=["CPUExecutionProvider"])
```

```text
orig nodes 169 {'Identity': 47, 'Conv': 53, 'Relu': 49, 'MaxPool': 1, 'Add': 16, 'GlobalAveragePool': 1, 'Flatten': 1, 'Gemm': 1}
opt  nodes 57 {'FusedConv': 49, 'MaxPool': 1, 'Conv': 4, 'GlobalAveragePool': 1, 'Flatten': 1, 'Gemm': 1} domains ['', 'com.microsoft']
```

Conv·Add·Relu가 `com.microsoft` domain의 `FusedConv`로 합쳐져 node가 169개에서 57개로 줄었습니다. 저장할 때 ORT는 다음 경고를 냅니다. 이 파일은 만든 장치에서만 씁니다.

```text
Serializing optimized model with Graph Optimization level greater than ORT_ENABLE_EXTENDED and the NchwcTransformer enabled.
The generated model may contain hardware specific optimizations, and should only be used in the same environment the model was optimized in.
```

ORT format은 별도 도구로 만듭니다. 같은 명령이 minimal build에 넘길 op 목록도 함께 만듭니다.

```bash
python -m onnxruntime.tools.convert_onnx_models_to_ort ortconv/
```

```text
Converting optimized ONNX model .../resnet50-legacy.onnx to ORT format model .../resnet50-legacy.with_runtime_opt.ort
Converted 1/1 models successfully.
```

```text
# required_operators.config
ai.onnx;1;GlobalAveragePool
ai.onnx;11;Conv
ai.onnx;12;MaxPool
ai.onnx;13;Flatten,Gemm
com.microsoft;1;FusedConv
```

만들어진 `.ort` 파일은 `ort.InferenceSession("resnet50-legacy.ort")`로 그대로 열렸습니다.

## Minimal build

`tools/ci_build/build_args.py`의 size reduction option입니다. 이 글에서는 이 빌드를 실행하지 않았습니다.

```bash
./build.sh --config MinSizeRel \
           --minimal_build \
           --disable_ml_ops \
           --include_ops_by_config required_operators.config \
           --enable_reduced_operator_type_support
```

같은 파일의 help는 `--minimal_build`를 "Create a minimal build supporting only ORT format models"라고 설명합니다. 그래서 minimal build에는 위의 `.ort` 파일을 넘겨야 합니다. 이전 판의 "전체 50 MB, mobile 5 MB"는 출처가 없어 뺐습니다. 비교 기준으로, 이 글의 Linux aarch64 1.32.0 wheel에서 Python 확장 module `onnxruntime_pybind11_state…so`는 28,477,456 byte였습니다.

## Quantization

dynamic quantization은 weight를 미리 INT8로 바꾸고, activation은 실행 중에 양자화합니다. calibration 입력이 필요 없습니다. static quantization은 [12-04](/blog/embedded/modern-recipes/part12-04-quantization)에서 `quantize_static`으로 돌렸습니다.

```python
from onnxruntime.quantization import quantize_dynamic, QuantType

quantize_dynamic("resnet50.onnx", "resnet50.int8dyn.onnx", weight_type=QuantType.QInt8)
```

M2 Pro CPU EP, 30회 중앙값입니다.

```text
fp32 102057677 B median 28.90 ms | int8 dynamic 25637443 B median 19.14 ms | max abs diff 2.641
```

파일은 4분의 1로, 시간은 3분의 2로 줄었습니다. 양자화된 graph에는 `DynamicQuantizeLinear` 50개와 `ConvInteger` 53개가 들어갑니다. 출력 오차(최대 2.64)가 정확도에 얼마나 영향을 주는지는 무작위 weight로는 알 수 없으므로, 실제 weight와 검증 데이터로 잽니다.

## Profile

```python
so = ort.SessionOptions()
so.enable_profiling = True
sess = ort.InferenceSession("resnet50.onnx", so, providers=["CPUExecutionProvider"])
sess.run(None, {"input": x})
profile_file = sess.end_profiling()      # JSON file path
```

결과 JSON의 node event는 `name`이 `…_kernel_time`으로 끝나고, `args`에 `op_name`, `provider`, `input_type_shape`, `output_type_shape` 등이 있습니다. guest의 첫 실행을 op별로 합치면 `FusedConv`가 91.1%였습니다. 위 CoreML 표의 node 배치도 이 `provider` 필드에서 셌습니다.

## ONNX Runtime Web

이 글에서는 실행하지 않았습니다. main의 `js/web/lib/index.ts`는 backend를 `webgl`, `webgpu`, `webnn`, `cpu`, `wasm` 이름으로 등록합니다.

```javascript
import * as ort from 'onnxruntime-web';

const session = await ort.InferenceSession.create('model.onnx', {
    executionProviders: ['webgpu', 'wasm'],
});
```

## 자주 보는 함정

> ⚠️ providers 순서

`["CPUExecutionProvider", "CoreMLExecutionProvider"]`로 두자 CPU EP가 57개 node를 모두 가져가 28.87 ms로, CoreML이 먼저일 때(2.78 ms)보다 10배 느렸습니다. 빠른 EP를 앞에, CPU를 마지막에 둡니다.

> ⚠️ 없는 EP·틀린 option이 조용히 CPU로 감

없는 EP 이름은 경고만 내고 빠지고, Python API는 EP option 오류가 나도 CPU로 다시 session을 만듭니다. `sess.get_providers()`와 profiler의 `provider` 필드로 실제 배치를 확인합니다.

> ⚠️ PyTorch exporter가 바뀜

torch 2.9 이후 기본 exporter는 `opset_version`과 다른 opset을 만들 수 있고 weight를 `.data` 파일로 나눕니다. export 뒤 opset과 파일 구성을 확인합니다.

> ⚠️ `optimized_model_filepath`를 ORT format으로 착각

이 option의 결과는 ONNX 파일이고, 장치 종속 최적화가 들어갈 수 있습니다. minimal build용 `.ort`는 `convert_onnx_models_to_ort`로 만듭니다.

> ⚠️ Minimal build에서 op 누락

minimal build는 `required_operators.config`에 있는 op만 넣습니다. 모델을 바꾸면 config를 다시 생성합니다. 위 예에서도 runtime 최적화를 적용한 config에는 `Add,Relu`(opset 14)가 더 들어갔습니다.

## 정리

- ONNX는 graph + weight + opset이고, 최근 PyTorch exporter는 opset과 파일 구성을 바꿀 수 있습니다.
- providers 목록의 앞쪽 EP부터 node를 가져갑니다. M2 Pro에서 CoreML EP를 앞에 두면 ResNet-50이 29.50 ms에서 2.71~2.78 ms로 줄었고, 순서를 바꾸면 효과가 사라졌습니다.
- EP 이름과 option 문자열은 소스(`constants.h`, 각 EP의 option 정의)와 대조합니다. 틀리면 대개 오류 없이 CPU로 갑니다.
- `optimized_model_filepath`는 ONNX를, `convert_onnx_models_to_ort`는 `.ort`와 minimal build용 op config를 만듭니다.
- dynamic INT8은 ResNet-50 파일을 4분의 1로, M2 Pro CPU 시간을 28.90 ms에서 19.14 ms로 줄였습니다.

다음 편은 **Thermal**입니다.

## 관련 항목

- [12-03: NPU 아키텍처](/blog/embedded/modern-recipes/part12-03-npu-architecture)
- [12-05: TensorRT](/blog/embedded/modern-recipes/part12-05-tensorrt)
- [12-06: TFLite Micro](/blog/embedded/modern-recipes/part12-06-tflite-micro)
- [12-01: Edge Inference](/blog/embedded/modern-recipes/part12-01-edge-inference)
- [12-04: Quantization](/blog/embedded/modern-recipes/part12-04-quantization)
