---
title: "12-05: TFLite Micro — Op Resolver·Tensor Arena·Cortex-M"
date: 2026-05-17T21:00:00
description: "MCU용 TensorFlow Lite Micro의 구조, op resolver·tensor arena·CMSIS-NN integration·Ethos-U delegate."
series: "Modern Embedded Recipes"
seriesOrder: 141
tags: [recipes, edge-ai, tflite-micro, mcu, cortex-m]
---

## 한 줄 요약

> **"TFLite Micro는 *MCU에 들어가는 ML runtime*입니다."** 메모리 100 KB대, no malloc, no OS 의존, INT8 quantized model이 기본입니다.

## 어떤 상황에서 쓰나

Cortex-M4/M7/M33/M55, RISC-V MCU, ESP32 등 *KB ~ 수십 MB RAM의 MCU*에서 keyword spotting, person detection, gesture recognition, anomaly detection 같은 *작은 신경망*을 돌릴 때 표준입니다.

ARM Ethos-U NPU와 결합하면 Cortex-M55 + Ethos-U55 같은 *MCU급* AI inference가 됩니다. Battery로 24/7 always-on inference가 가능합니다.

## 핵심 개념 — 디자인 원칙

1. No dynamic memory after init (no `malloc`/`free`)
2. Single `.tflite` model을 flash에 binary로 둠
3. Tensor arena 한 덩어리 메모리에서 inference 동안 reuse
4. Op resolver로 *사용 op만* link → flash 절약
5. C++ static link

이 원칙이 *실시간 + 결정적 + 작은 memory* 환경에 맞습니다.

## 모델 변환 흐름

```python
import tensorflow as tf

# Train
model = tf.keras.Sequential([...])
model.compile(...)
model.fit(...)

# Quantize to INT8
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.representative_dataset = rep_data_gen
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
converter.inference_input_type  = tf.int8
converter.inference_output_type = tf.int8

tflite_model = converter.convert()
with open('model.tflite', 'wb') as f:
    f.write(tflite_model)
```

`.tflite`는 FlatBuffer format. 그대로 MCU flash에 둡니다.

## .tflite → C array

```bash
xxd -i model.tflite > model.h
```

```c
unsigned char model_tflite[] = {
    0x1c, 0x00, 0x00, 0x00, 0x54, 0x46, 0x4c, 0x33,
    /* ... */
};
unsigned int model_tflite_len = 24512;
```

이 array가 MCU flash에 들어갑니다.

## TFLite Micro Basics

```c
#include "tensorflow/lite/micro/all_ops_resolver.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/schema/schema_generated.h"
#include "model.h"

// 1. Memory arena
constexpr int kArenaSize = 100 * 1024;
alignas(16) static uint8_t tensor_arena[kArenaSize];

// 2. Model
static const tflite::Model *model = nullptr;

// 3. Interpreter
static tflite::MicroInterpreter *interp = nullptr;

void setup(void) {
    model = tflite::GetModel(model_tflite);
    if (model->version() != TFLITE_SCHEMA_VERSION) {
        MicroPrintf("Model schema version mismatch\n");
        return;
    }

    static tflite::AllOpsResolver resolver;
    static tflite::MicroInterpreter static_interp(
        model, resolver, tensor_arena, kArenaSize);
    interp = &static_interp;

    TfLiteStatus status = interp->AllocateTensors();
    if (status != kTfLiteOk) {
        MicroPrintf("AllocateTensors failed\n");
        return;
    }
}

void loop(void) {
    // Get input tensor
    TfLiteTensor *input = interp->input(0);

    // Fill input (INT8)
    for (int i = 0; i < input->bytes; i++) {
        input->data.int8[i] = sample_input[i];
    }

    // Invoke
    if (interp->Invoke() != kTfLiteOk) return;

    // Read output
    TfLiteTensor *output = interp->output(0);
    int8_t max_value = output->data.int8[0];
    int max_index = 0;
    for (int i = 1; i < output->dims->data[1]; i++) {
        if (output->data.int8[i] > max_value) {
            max_value = output->data.int8[i];
            max_index = i;
        }
    }
    MicroPrintf("class=%d score=%d\n", max_index, max_value);
}
```

이게 *전체*입니다. Malloc 없음. OS 없음.

## Tensor Arena 크기

Arena는 *intermediate tensor + scratch buffer*를 담는 단일 영역입니다.

**크기 결정:**

1. 처음에 넉넉히 (예: 200 KB)
2. `AllocateTensors` 후 `interp->arena_used_bytes()` 호출
3. 실제 사용량 확인
4. 그 + 10% 정도로 줄임

**예시:**

| 모델 | Arena |
|------|-------|
| Person Detection 96×96 | ~70 KB |
| Speech Commands tiny | ~10 KB |
| Keyword Spotter | ~15 KB |
| Visual Wake Word | ~50 KB |

## Op Resolver 최적화

`AllOpsResolver`는 모든 op를 link해 flash가 큽니다. 사용하는 op만 명시:

```c
#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"

static tflite::MicroMutableOpResolver<8> resolver;
resolver.AddConv2D();
resolver.AddDepthwiseConv2D();
resolver.AddFullyConnected();
resolver.AddSoftmax();
resolver.AddRelu();
resolver.AddMaxPool2D();
resolver.AddReshape();
resolver.AddQuantize();
```

`AllOpsResolver`가 200 KB이면 `MutableOpResolver`로 30 KB까지 줄어듭니다.

## CMSIS-NN — Cortex-M 최적화 kernel

CMSIS-NN은 ARM이 제공하는 *Cortex-M용 최적화된 NN kernel*. TFLite Micro에 통합됩니다.

```bash
# CMake build
make -f tensorflow/lite/micro/tools/make/Makefile \
     TARGET=cortex_m_generic \
     TARGET_ARCH=cortex-m7+fp \
     OPTIMIZED_KERNEL_DIR=cmsis_nn \
     hello_world
```

CMSIS-NN을 활성화하면 INT8 conv가 *5-10배* 빨라집니다 (M7에서). Cortex-M4 SIMD (DSP extensions)와 M55의 Helium (MVE)을 활용.

## Ethos-U Delegate

Ethos-U NPU와 결합하려면 모델을 *Vela*로 변환:

```bash
vela model.tflite --accelerator-config ethos-u55-256
# → model_vela.tflite 생성 (NPU command + 일부 CPU fallback)
```

Vela 변환된 모델은 *NPU custom op*를 포함합니다. Op resolver에 추가:

```c
#include "tensorflow/lite/micro/kernels/ethosu.h"

resolver.AddEthosU();
```

이제 NPU-targetable layer는 Ethos-U55가, fallback layer는 Cortex-M55 + CMSIS-NN이 처리.

## 사례 — Person Detection on STM32

STM32 Cube AI 또는 직접 빌드:

```text
Model: MobileNetV1 0.25 96×96 grayscale
Input: 96 × 96 × 1 (int8)
Flash: 350 KB (model + runtime + ops)
RAM:   90 KB (arena) + 10 KB (other)
```

```c
// 카메라 frame을 96×96 grayscale로 변환
camera_capture(rgb_buffer);
resize_grayscale(rgb_buffer, 320, 240, gray_buffer, 96, 96);

// 입력 채우기
TfLiteTensor *in = interp->input(0);
for (int i = 0; i < 96*96; i++)
    in->data.int8[i] = gray_buffer[i] - 128;   // -128~127 범위

// Inference
interp->Invoke();

// 출력: [no_person_prob, person_prob]
TfLiteTensor *out = interp->output(0);
int8_t person = out->data.int8[1];
if (person > THRESHOLD) led_on();
```

Cortex-M7 480 MHz에서 ~200 ms/inference. CMSIS-NN으로 ~30 ms. Ethos-U55 추가 시 ~5 ms.

## Memory Layout

**Flash:**

- Code:                ~ 200 KB (TFLite Micro + kernels)
- Model:               ~ 100~500 KB (.tflite as C array)
- Other code, libs:    ~ 100 KB

**RAM:**

- Tensor arena:        ~ 50~200 KB
- System (stack, etc.): ~ 50 KB

Cortex-M4 보드는 RAM 128 KB / Flash 512 KB가 흔합니다. 적당한 모델이 들어갑니다. M7 (1 MB RAM)에는 더 큰 모델.

## Profiling

```c
#include "tensorflow/lite/micro/micro_profiler.h"

static tflite::MicroProfiler profiler;
static tflite::MicroInterpreter static_interp(
    model, resolver, tensor_arena, kArenaSize, nullptr, &profiler);

interp.Invoke();
profiler.LogTicksPerTagCsv();
```

각 op의 실행 시간이 출력. Bottleneck을 찾아 optimize.

## 측정 비교

```text
Speech Commands (Tiny CNN) on Cortex-M4 (STM32F4 168 MHz):
  Reference kernel (no SIMD):  120 ms
  CMSIS-NN INT8:                25 ms
  → 5×

Person Detection (MobileNetV1 0.25) on Cortex-M7 (STM32H7 480 MHz):
  Reference:                    300 ms
  CMSIS-NN INT8:                 35 ms
  → 9×

MobileNetV1 0.25 on Cortex-M55 + Ethos-U55:
  CMSIS-NN only:                 35 ms
  Ethos-U55 delegate:             5 ms
  → 7× over CMSIS-NN
```

## 자주 보는 함정

> Float32 모델 그대로

```text
Float32 MobileNet on Cortex-M4:  > 2 seconds
INT8 quantized:                  ~ 100 ms
```

MCU에서 float은 *느림*. 반드시 INT8 quantize.

> Arena 너무 작음

```text
AllocateTensors → kTfLiteError
```

Arena가 부족하면 silently fail 안 하고 error code 반환. 처음에 넉넉히 잡고 줄임.

> AllOpsResolver 사용

```text
Flash usage: 600 KB (model 50 KB) — 대부분이 op resolver
```

MutableOpResolver로 필요한 op만.

> CMSIS-NN 활성화 안 함

```bash
# build flag
OPTIMIZED_KERNEL_DIR=cmsis_nn
```

기본 빌드는 reference kernel. 5-10× 차이.

> Unsupported op

```text
Unsupported op: SOFTMAX_V2
```

TFLite Micro는 모든 op를 지원 안 함. Vela report 또는 빌드 에러로 확인.

> Input quantization 누락

```c
// Input은 float이라고 가정
in->data.f[i] = pixel / 255.0f;
// → INT8 모델에는 잘못된 형식
```

Quantized model은 *INT8 input*. `q = round(x / scale - zero_point)`로 변환.

## 정리

- TFLite Micro = MCU용 TFLite, no malloc, OS-free.
- 모델은 .tflite → C array로 flash에 둠.
- Tensor arena 한 덩어리에서 intermediate tensor reuse.
- MutableOpResolver로 사용 op만 link.
- CMSIS-NN으로 Cortex-M INT8 5-10배 가속.
- Vela로 Ethos-U binary 변환 + Ethos-U delegate.
- INT8 quantization 필수. Float32는 MCU에 너무 무거움.
- Arena 크기는 `arena_used_bytes()`로 측정 후 조정.

다음 편은 **ONNX Runtime**입니다.

## 관련 항목

- [12-02: NPU 아키텍처](/blog/embedded/modern-recipes/part12-02-npu-architecture)
- [12-04: TensorRT](/blog/embedded/modern-recipes/part12-04-tensorrt)
- [12-06: ONNX Runtime](/blog/embedded/modern-recipes/part12-06-onnx-runtime)
- [6-01: Edge Inference](/blog/embedded/modern-recipes/part6-01-edge-inference)
- [6-03: Quantization](/blog/embedded/modern-recipes/part6-03-quantization)
