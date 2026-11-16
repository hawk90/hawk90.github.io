---
title: "TFLite Micro 분석 — Op Resolver·Tensor Arena·Cortex-M"
slug: "embedded/modern-recipes/part12-06-tflite-micro"
date: 2026-04-21T09:04:00
description: "MCU용 TensorFlow Lite Micro의 구조, op resolver·tensor arena·CMSIS-NN integration·Ethos-U delegate."
series: "Modern Embedded Recipes"
seriesOrder: 142
tags: [recipes, edge-ai, tflite-micro, mcu, cortex-m]
topics: ["embedded"]
---

## 한 줄 요약

> **"TFLite Micro는 MCU에서 `.tflite` 모델을 돌리는 runtime입니다."** 실행 중 메모리는 미리 잡은 tensor arena 한 덩어리에서만 쓰고, 필요한 op만 resolver에 등록합니다. 같은 person detection 모델이 Cortex-M4에서 CMSIS-NN kernel로 바꾸자 실행 명령어 수가 22분의 1로 줄었습니다.

## 이 글의 실행 환경

- TFLite Micro: `tensorflow/tflite-micro` 저장소 commit `2c13ceb`(2026-11-13).
- 모델: 저장소의 `person_detect.tflite`(300,568 byte). [12-03](/blog/embedded/modern-recipes/part12-03-npu-architecture)에서 Vela에 넣은 것과 같은 파일입니다(sha256 `808cfdfc…`).
- host 실행: Debian 13 arm64 guest, g++ 14.2.0.
- Cortex-M4 실행: 같은 guest의 Debian `arm-none-eabi-gcc` 14.2.1로 빌드하고, macOS의 QEMU 11.1.3 `mps2-an386`(Cortex-M4F)에서 semihosting으로 돌렸습니다.

QEMU는 cycle을 흉내 내지 않으므로, 아래의 Cortex-M 비교는 시간이 아니라 **실행된 명령어 수**입니다. 명령어 수는 QEMU TCG plugin으로 셌습니다.

## 어떤 상황에서 쓰나

수백 KB RAM의 Cortex-M MCU에서 작은 신경망(키워드 검출, 사람 검출 등)을 OS 없이 돌릴 때입니다. 저장소의 예제가 그 크기를 보여 줍니다. `micro_speech` test의 arena는 28,600 byte, `person_detection`은 136 KB로 잡혀 있습니다.

## 핵심 개념

1. 모델은 `.tflite`(FlatBuffer) 그대로 flash에 둡니다. `GetModel()`은 복사나 parsing 없이 그 버퍼를 가리킵니다.
2. 입력·출력·중간 tensor는 모두 사용자가 넘긴 **tensor arena** 안에 놓입니다. `AllocateTensors()`가 arena 안에서 tensor 위치를 정하고, 수명이 겹치지 않는 tensor는 같은 자리를 다시 씁니다.
3. op 구현은 `MicroMutableOpResolver<N>`에 **필요한 것만** 등록합니다. 이전 판의 `AllOpsResolver`는 현재 저장소에 없습니다(`all_ops_resolver.h` 파일 자체가 없습니다).
4. Cortex-M용 최적화 kernel은 `OPTIMIZED_KERNEL_DIR=cmsis_nn`으로 빌드할 때 들어갑니다.

## 모델 변환 흐름

Keras 모델을 INT8 `.tflite`로 바꾸는 API는 [12-04](/blog/embedded/modern-recipes/part12-04-quantization)에서 LiteRT 문서와 대조한 것과 같습니다. 이 글의 환경에는 TensorFlow가 없어 이 단계는 실행하지 않았고, 아래 실행은 저장소에 이미 있는 INT8 모델을 썼습니다.

```python
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.representative_dataset = rep_data_gen
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
converter.inference_input_type  = tf.int8
converter.inference_output_type = tf.int8
tflite_model = converter.convert()
```

## .tflite → C array

```bash
xxd -i person_detect.tflite > model.h
```

```text
unsigned char person_detect_tflite[] = {
  0x1c, 0x00, 0x00, 0x00, 0x54, 0x46, 0x4c, 0x33, 0x00, 0x00, 0x00, 0x00,
...
unsigned int person_detect_tflite_len = 300568;
```

4~7번째 byte `0x54 0x46 0x4c 0x33`은 FlatBuffer file identifier `TFL3`입니다. TFLite Micro의 Makefile은 같은 일을 `generate_cc_arrays.py`로 하는데, 이 script가 Pillow를 import하므로 Debian에서는 `python3-pil`이 없으면 person detection 빌드가 멈춥니다.

## TFLite Micro 기본 코드

저장소의 `examples/person_detection/main_functions.cc`를 따라 쓴 최소 코드입니다. 아래 측정은 모두 이 구조의 프로그램으로 했습니다.

```cpp
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/micro/micro_log.h"
#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"
#include "tensorflow/lite/micro/system_setup.h"
#include "tensorflow/lite/micro/models/person_detect_model_data.h"

constexpr int kArenaSize = 136 * 1024;
alignas(16) static uint8_t arena[kArenaSize];

int main() {
  tflite::InitializeTarget();
  const tflite::Model *model = tflite::GetModel(g_person_detect_model_data);
  if (model->version() != TFLITE_SCHEMA_VERSION) {     // 3 in micro_interpreter.h
    MicroPrintf("schema %d != %d", model->version(), TFLITE_SCHEMA_VERSION);
    return 1;
  }

  static tflite::MicroMutableOpResolver<5> r;          // only the ops this graph uses
  r.AddAveragePool2D(); r.AddConv2D(); r.AddDepthwiseConv2D(); r.AddReshape(); r.AddSoftmax();

  static tflite::MicroInterpreter interp(model, r, arena, kArenaSize);
  if (interp.AllocateTensors() != kTfLiteOk) { MicroPrintf("AllocateTensors failed"); return 1; }
  MicroPrintf("arena_used_bytes %u", (unsigned)interp.arena_used_bytes());

  TfLiteTensor *in = interp.input(0);                  // int8 [1, 96, 96, 1]
  for (size_t i = 0; i < in->bytes; i++) in->data.int8[i] = image[i];
  if (interp.Invoke() != kTfLiteOk) return 1;

  TfLiteTensor *out = interp.output(0);                // int8 [1, 2]: no_person, person
  MicroPrintf("no_person %d person %d", out->data.int8[0], out->data.int8[1]);
  return 0;
}
```

malloc도, OS 호출도 없습니다. op 다섯 개(`AVERAGE_POOL_2D`, `CONV_2D`, `DEPTHWISE_CONV_2D`, `RESHAPE`, `SOFTMAX`)는 저장소 예제가 이 모델에 등록하는 목록 그대로입니다.

host에서 저장소의 test를 먼저 돌리면 빌드 환경이 맞는지 확인할 수 있습니다.

```bash
make -f tensorflow/lite/micro/tools/make/Makefile -j4 test_person_detection_test
```

```text
person data.  person score: 113, no person score: -113
no person data.  person score: -57, no person score: 57
~~~ALL TESTS PASSED~~~
```

## Tensor arena 크기

크기는 넉넉히 잡고 `AllocateTensors()` 뒤 `arena_used_bytes()`로 실제 사용량을 본 다음 줄입니다. person detection 모델에서 잰 값입니다.

| 빌드 | arena 지정 | `arena_used_bytes()` |
|------|-----------:|---------------------:|
| host (aarch64, g++) | 139,264 | 85,024 |
| Cortex-M4, reference kernel | 139,264 | 82,292 |
| Cortex-M4, CMSIS-NN kernel | 139,264 | 82,308 |

같은 모델이라도 target과 kernel에 따라 값이 다르므로, 최종 크기는 target 빌드에서 잽니다. 64 KB arena로 줄이면 `AllocateTensors()`가 실패하고 무엇이 모자란지 출력합니다.

```text
Failed to resize buffer. Requested: 55296, available 38656, missing: 16640
AllocateTensors with 64 KB arena -> error
```

실패는 조용히 지나가지 않고 `kTfLiteError`로 돌아옵니다.

## Op resolver

resolver에서 필요한 op 하나를 빼면 `AllocateTensors()`가 실패합니다. 위 코드에서 `AddSoftmax()`만 지운 결과입니다.

```text
Didn't find op for builtin opcode 'SOFTMAX'
Failed to get registration from op code SOFTMAX
AllocateTensors failed
```

모델에 어떤 op가 있는지 모르면 이 메시지로 하나씩 확인하거나, [12-03](/blog/embedded/modern-recipes/part12-03-npu-architecture)처럼 Vela·모델 검사 도구로 op 목록을 먼저 뽑습니다.

## CMSIS-NN — Cortex-M 최적화 kernel

`cortex_m_generic` README의 빌드 형식을 따라 Cortex-M4F용 library를 reference kernel과 CMSIS-NN kernel로 한 번씩 만들었습니다. `TARGET_TOOLCHAIN_ROOT`를 주지 않으면 Makefile이 Arm GCC를 따로 내려받습니다.

```bash
make -f tensorflow/lite/micro/tools/make/Makefile -j4 TARGET=cortex_m_generic \
     TARGET_ARCH=cortex-m4+fp TARGET_TOOLCHAIN_ROOT=/usr/bin/ microlite
make -f tensorflow/lite/micro/tools/make/Makefile -j4 TARGET=cortex_m_generic \
     TARGET_ARCH=cortex-m4+fp TARGET_TOOLCHAIN_ROOT=/usr/bin/ OPTIMIZED_KERNEL_DIR=cmsis_nn microlite
```

두 library에 위 프로그램을 link해 QEMU `mps2-an386`에서 돌렸습니다. 둘 다 `[no_person, person] = [-113, 113]`으로 host test와 같은 답을 냈습니다. Invoke를 1번 하는 binary와 2번 하는 binary의 명령어 수 차이가 Invoke 한 번의 명령어 수입니다.

```bash
qemu-system-arm -M mps2-an386 -nographic -semihosting-config enable=on,target=native \
                -plugin ./libinsncount.dylib -kernel pd_cmsis_1.elf
```

| kernel | 전체(Invoke 1회) | 전체(Invoke 2회) | Invoke 1회 | `.text` |
|--------|-----------------:|-----------------:|-----------:|--------:|
| reference | 529,755,814 | 1,053,819,691 | 524,063,877 | 398,420 byte |
| CMSIS-NN | 28,783,829 | 51,841,564 | 23,057,735 | 430,412 byte |

Invoke 한 번의 명령어 수는 CMSIS-NN이 22.7분의 1입니다. 대신 `.text`는 31,992 byte 늘었습니다(`.text`에는 300,568 byte의 모델이 포함됩니다). 실제 MCU의 시간은 명령어 수에 memory wait state, cache, pipeline 효과가 더해지므로 보드의 cycle counter로 다시 잽니다. TFLite Micro의 `cortex_m_generic/micro_time.cc`는 `GetCurrentTimeTicks()`에서 DWT `CYCCNT`(또는 `ARM_MODEL_USE_PMU_COUNTERS`일 때 PMU cycle counter)를 읽으므로, 보드에서는 `MicroProfiler`의 tick이 cycle 수입니다. 같은 파일의 `ticks_per_second()`는 0을 돌려주므로 시간으로 바꾸려면 core clock으로 직접 나눕니다.

### MicroProfiler

```cpp
#include "tensorflow/lite/micro/micro_profiler.h"

static tflite::MicroProfiler prof;
static tflite::MicroInterpreter interp(model, r, arena, kArenaSize, nullptr, &prof);
interp.Invoke();
prof.LogTicksPerTagCsv();
```

host(aarch64) 빌드에서 tick은 `clock()` 값입니다. 절대값은 MCU와 무관하지만 op 사이의 비중은 볼 수 있습니다.

```text
"Unique Tag","Total ticks across all events with that tag."
DEPTHWISE_CONV_2D, 3456
CONV_2D, 19078
AVERAGE_POOL_2D, 5
RESHAPE, 1
SOFTMAX, 1
"total number of ticks", 22541
```

이 모델에서는 `CONV_2D`가 전체의 85%입니다.

## Ethos-U

[12-03](/blog/embedded/modern-recipes/part12-03-npu-architecture)에서 이 모델을 Vela 5.2.0에 넣었을 때 57개 operator가 모두 NPU로 갔습니다(`CPU operators = 0`). TFLite Micro의 `kernels/ethos_u/README.md`에 따르면 Vela가 NPU 부분을 Ethos-U custom op로 바꾸고, runtime은 그 op를 만나면 Ethos-U로 넘깁니다. 빌드는 `CO_PROCESSOR=ethos_u`와 `ETHOSU_ARCH`를 주고, resolver에는 `AddEthosU()`를 등록합니다.

```bash
make -f tensorflow/lite/micro/tools/make/Makefile network_tester_test CO_PROCESSOR=ethos_u \
     ETHOSU_ARCH=u55 TARGET=cortex_m_generic TARGET_ARCH=cortex-m55 microlite
```

같은 README는 Ethos-U driver의 초기화 API를 TFLite Micro API보다 먼저 불러야 한다고 적고, Ethos-U가 있는 실행 환경으로 Arm Corstone-300 FVP를 듭니다. 이 글의 QEMU에는 Ethos-U model이 없어 이 단계는 실행하지 않았습니다.

## 자주 보는 함정

> ⚠️ Invoke 전에 입력을 다시 채우지 않음

같은 입력으로 Invoke를 두 번 부르는 binary를 돌리자 두 번째 결과가 `[-113, 113]`이 아니라 `[2, -2]`였습니다(reference, CMSIS-NN 모두). arena는 수명이 끝난 tensor 자리를 다시 쓰므로, 입력 tensor의 내용은 Invoke 뒤에 남아 있다고 보장되지 않습니다. 매 Invoke 전에 입력을 다시 씁니다.

> ⚠️ arena를 재지 않고 정함

`arena_used_bytes()`는 target·kernel마다 다릅니다(위 표 82,292~85,024). target 빌드에서 재고, 모자라면 `AllocateTensors()`의 `missing:` 값을 봅니다.

> ⚠️ resolver에 op 누락

모델의 op 하나라도 빠지면 `AllocateTensors()`가 `Didn't find op for builtin opcode`로 실패합니다.

> ⚠️ CMSIS-NN을 켜지 않음

`OPTIMIZED_KERNEL_DIR` 없이 빌드하면 reference kernel이 들어갑니다. 이 모델에서는 Invoke 명령어 수가 22.7배였습니다.

> ⚠️ 입력 양자화 부호

이 모델의 입력은 int8, scale 0.007843, zero_point -1입니다. 실수 입력 `x`는 `q = round(x / scale) + zero_point`로 바꿉니다. 이전 판처럼 `- zero_point`로 쓰면 zero_point만큼 어긋납니다. 저장소 예제는 uint8 이미지를 넣을 때 128을 빼서 int8로 바꿉니다.

## 정리

- TFLite Micro는 `.tflite`를 flash에 두고, tensor는 고정된 arena 안에서만 할당합니다.
- `MicroMutableOpResolver`에 모델이 쓰는 op만 등록합니다. 하나라도 빠지면 `AllocateTensors()`가 실패합니다.
- arena 크기는 `arena_used_bytes()`로 target 빌드에서 잽니다. person detection 모델은 Cortex-M4에서 82,292 byte였습니다.
- Cortex-M4에서 CMSIS-NN kernel은 Invoke 명령어 수를 22.7분의 1로 줄였고 `.text`는 31,992 byte 늘었습니다.
- arena가 입력 버퍼를 다시 쓰므로 매 Invoke 전에 입력을 채웁니다.

다음 편은 **ONNX Runtime**입니다.

## 관련 항목

- [12-03: NPU 아키텍처](/blog/embedded/modern-recipes/part12-03-npu-architecture)
- [12-05: TensorRT](/blog/embedded/modern-recipes/part12-05-tensorrt)
- [12-07: ONNX Runtime](/blog/embedded/modern-recipes/part12-07-onnx-runtime)
- [12-01: Edge Inference](/blog/embedded/modern-recipes/part12-01-edge-inference)
- [12-04: Quantization](/blog/embedded/modern-recipes/part12-04-quantization)
