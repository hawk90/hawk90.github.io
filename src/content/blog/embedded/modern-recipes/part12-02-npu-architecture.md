---
title: "NPU 아키텍처 분석 — Ethos·Hexagon·Systolic Array 비교"
date: 2026-04-21T09:01:00
description: "Arm Ethos·Qualcomm Hexagon·Apple Neural Engine 등 NPU 내부 구조와 systolic MAC array·INT8·memory hierarchy."
series: "Modern Embedded Recipes"
seriesOrder: 138
tags: [recipes, edge-ai, npu, ethos, hexagon]
---

## 한 줄 요약

> **"NPU는 *MAC array가 본체*인 INT8 가속기입니다."** Systolic array·SIMD vector·memory hierarchy의 조합으로 GPU보다 *전력당 throughput*이 10배 이상 좋습니다.

## 어떤 상황에서 쓰나

스마트폰 (Apple Neural Engine, Qualcomm Hexagon, Samsung NPU), 스마트 카메라, 로봇, AR/VR headset, 차량 ADAS, edge AI 박스 등 *저전력 inference*가 필요한 모든 곳에서 NPU가 표준입니다.

CPU로 ResNet-50 한 frame이 100ms 걸리면 NPU는 5ms에 끝납니다. 전력은 1/10. Battery 환경의 *24/7 inference*는 NPU 없이는 불가능합니다.

## 핵심 개념 — MAC Array

Neural network은 *대부분이 MAC*입니다.

```text
Convolution:    sum(w_ij × x_ij) over i, j, channels
Fully connected: sum(w_i × x_i) over i
```

NPU는 *수백~수천 개의 MAC unit*을 격자로 배치하고 cycle마다 한 번씩 굴립니다.

```text
Systolic array (TPU style):
  Weight가 미리 load됨
  Input이 한쪽에서 흘러 들어와 격자를 통과
  각 cell에서 MAC, 결과는 옆 cell로

  X X X X
  X X X X     ← 16 MAC 격자
  X X X X     매 cycle 16 × 1 = 16 MAC
  X X X X     128 × 128 array면 16384 MAC/cycle
```

## Arm Ethos — Cortex-M 짝꿍 NPU

| NPU | MAC | 성능 | 결합 |
|-----|-----|------|------|
| Ethos-U55 | ~256 | 32-512 GOPS | Cortex-M |
| Ethos-U65 | ~512 | 1 TOPS | Cortex-M |
| Ethos-U85 | ~2048 | 4 TOPS | Cortex-M |
| Ethos-N78 | 대형 | ~10 TOPS | Cortex-A |

Ethos-U55가 Cortex-M55와 결합한 시스템:

| 블록 | 역할 | 연결 |
| --- | --- | --- |
| Cortex-M55 | kernel dispatch, control | Ethos-U55 (control), AXI |
| Ethos-U55 | MAC array, NN inference | Cortex-M55 (control), AXI |
| AXI bus | shared interconnect | DDR / SRAM |
| DDR / SRAM | weight·activation 저장 | M55·U55 모두 접근 |

CPU가 kernel을 dispatch, NPU가 MAC을 처리. MCU급 power budget(수십 mW)에서 1 TOPS.

## Qualcomm Hexagon DSP

```text
Hexagon DSP (v66, v68):
  HVX (Hexagon Vector eXtensions): 1024-bit SIMD
  HMX (Hexagon Matrix eXtensions): MAC array
  ~10 TOPS @ 1.5W (Snapdragon 8 Gen 2)
```

Hexagon은 *프로그래밍 가능한 DSP*. NPU instruction set이 정의되어 있어 SDK로 직접 짤 수 있습니다.

```c
// Hexagon SDK
HVX_Vector va = *(HVX_Vector*)a;
HVX_Vector vb = *(HVX_Vector*)b;
HVX_Vector vc = Q6_Vw_vadd_VwVw(va, vb);   /* 32 × 32-bit add 한 cycle */
```

## Apple Neural Engine

```text
ANE (A17 Pro, M2):
  ~15.8 TOPS (M2), 35 TOPS INT8 (A17 Pro)
  16 cores (compute units)
  Core ML로만 access
```

Apple은 ANE의 ISA를 공개하지 않습니다. Core ML framework가 *유일한 진입점*입니다.

```swift
let model = try MyModel(configuration: MLModelConfiguration())
let input = MyModelInput(image: cgImage)
let result = try model.prediction(input: input)
```

`MLModelConfiguration().computeUnits = .all`이면 CPU/GPU/ANE 중 자동 선택.

## Google Edge TPU (Coral)

```text
Edge TPU:
  4 TOPS @ 2W
  INT8 only
  TensorFlow Lite 전용
  USB stick, M.2, dev board 등 form factor
```

```python
from pycoral.utils import edgetpu
from pycoral.adapters import common

interpreter = edgetpu.make_interpreter('model_edgetpu.tflite')
interpreter.allocate_tensors()
common.set_input(interpreter, image)
interpreter.invoke()
```

## NVIDIA Jetson — GPU + DLA

Jetson은 *NPU가 아닌 GPU + DLA(Deep Learning Accelerator)* 조합:

```text
Orin AGX:
  CUDA cores: 2048
  Tensor cores: 64
  DLA: 2 cores, 정수 가속
```

GPU는 flexible (CUDA, training 가능), DLA는 INT8 inference 전용 (저전력).

## Memory Hierarchy

```text
NPU memory:
  L1 / activation buffer:   몇 KB~수십 KB, register file
  L2 / weight buffer:       100 KB~수 MB, SRAM
  L3 / scratchpad:          수 MB
  DDR:                      ~ GB, external

이상적: weight·activation이 L1/L2에 들어가서 DDR access 최소화
현실:   큰 model은 layer마다 DDR access 필요
```

NPU 효율은 *MAC array 활용률 × memory bandwidth 충족*. DDR이 못 따라가면 MAC이 idle.

```text
Roofline:
  arithmetic intensity (MAC/byte) vs throughput

  Memory-bound:  small layer, DDR bandwidth 한계
  Compute-bound: large layer, MAC 한계
```

INT8 conv가 보통 compute-bound, FC layer가 memory-bound.

## Quantization — INT8

NPU는 *대부분 INT8*. FP32 → INT8로 4× memory 감소, 2~4× throughput 증가.

```text
quantize:   q = round((x - zero_point) / scale)
dequantize: x = (q + zero_point) × scale

per-tensor: scale 한 개
per-channel: scale이 채널마다
```

```python
import tensorflow as tf

converter = tf.lite.TFLiteConverter.from_saved_model('model')
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.representative_dataset = rep_data
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
converter.inference_input_type = tf.int8
converter.inference_output_type = tf.int8
tflite_model = converter.convert()
```

Calibration data 100~500장으로 scale을 결정. Accuracy 손실 1~3% 정도가 일반적.

## Power vs Performance

| 플랫폼 | TOPS | 전력 | TOPS/W |
|--------|------|------|--------|
| Cortex-M (CMSIS-NN) | 0.001 | 0.001 | 1 |
| Ethos-U55 | 0.5 | 0.05 | 10 |
| Hexagon HMX | 10 | 1.5 | 6.7 |
| Edge TPU | 4 | 2 | 2 |
| Apple ANE M2 | 15.8 | ~3 | ~5 |
| Jetson Orin GPU | 275 | 50 | 5.5 |
| Jetson Orin DLA | 105 | ~20 | 5.3 |
| A100 GPU | 624 | 400 | 1.6 |

작은 NPU일수록 TOPS/W 효율이 좋습니다. Cloud GPU는 절대 throughput 크지만 효율은 낮습니다.

## NPU Programming 인터페이스

| 플랫폼 | 인터페이스 |
|--------|-----------|
| Arm Ethos | Vela compiler → TFLite Micro + Ethos delegate |
| Qualcomm Hexagon | SNPE SDK, QNN SDK |
| Apple ANE | Core ML (모델 변환 후) |
| Google Edge TPU | `edgetpu_compiler` → TFLite |
| NVIDIA DLA | TensorRT (with kDLA flag) |

대부분 *모델 → 컴파일러 → device-specific binary* 흐름. CPU instruction이 직접 노출되지 않습니다.

## Ethos-U55 + Cortex-M55 예

```python
# Vela로 TFLite 모델을 Ethos-U binary로 변환
vela model.tflite --config vela.ini --system-config Ethos_U55_High_End_Embedded
# → model_vela.tflite 생성

# 또는 명령줄
vela --output-dir out model.tflite --accelerator-config ethos-u55-256
```

```c
// Cortex-M55 측 코드 (TFLite Micro + Ethos delegate)
#include "tensorflow/lite/micro/all_ops_resolver.h"

static const tflite::Model *model = tflite::GetModel(model_vela_tflite);
tflite::MicroAllOpsResolver resolver;
tflite::MicroInterpreter interp(model, resolver, tensor_arena, ARENA_SIZE);

interp.AllocateTensors();
copy_input_to(interp.input(0));
interp.Invoke();
read_output(interp.output(0));
```

CPU는 dispatch만, NPU가 conv를 처리.

## 사례 — Person Detection on STM32H747 + Ethos-U55

```text
Model: MobileNet v1 0.25 96×96
Input: 96×96×3 grayscale
Operations: ~7 MOPS

CPU only (Cortex-M7):  ~50 ms inference, 200 mW
With Ethos-U55:        ~6 ms inference, 80 mW
```

8배 빠르고 전력 1/3. Always-on person detection이 가능해집니다.

## 자주 보는 함정

> 모든 layer가 NPU에서 돌아간다는 가정

```text
Unsupported op (예: Custom activation) → CPU fallback
→ NPU·CPU 사이 데이터 이동 비용으로 oh 무 의미
```

Vela report로 *어느 layer가 fallback*인지 확인. 모델을 NPU-friendly로 재설계.

> Memory size 부족

```text
Ethos-U55 SRAM: 200 KB
Model activation: 1 MB → DDR access 빈번 → 효율 50%
```

작은 모델 (MobileNet, EfficientNet-Lite) 선택. 또는 NPU의 SRAM 옵션이 큰 chip.

> INT8 accuracy 손실 무시

```text
FP32 model:  ImageNet top-1 73%
INT8 model:  top-1 70%   ← 3% 손실
```

Quantization-aware training (QAT)로 줄일 수 있음. Post-training quantization (PTQ)는 빠르지만 손실 큼.

> NPU TOPS가 곧 application throughput

```text
NPU peak: 10 TOPS
Model:    1 GOPS (1 frame)
Theoretical: 10000 fps

Real:     200 fps (5%)
```

Memory bandwidth, kernel launch overhead, pre/post processing이 제약. Peak는 marketing.

> Per-tensor vs per-channel quantization

Per-tensor는 더 단순하지만 accuracy 손실 크고, per-channel은 정확하지만 hardware support 필요. NPU가 지원하는지 확인.

> Batch size 1 가정

Edge는 보통 batch=1. NPU 효율이 batch=1에서 떨어집니다. Multi-frame batching이 가능하면 8 frame batch로 throughput 2~3배 늘림.

## 정리

- NPU = MAC array + memory hierarchy + INT8 가속.
- Systolic array가 핵심 패턴. 매 cycle 수백~수천 MAC.
- Arm Ethos (Cortex-M 짝), Qualcomm Hexagon (DSP+HMX), Apple ANE, Google Edge TPU, NVIDIA DLA가 대표.
- TOPS/W 효율은 작은 NPU가 cloud GPU보다 좋습니다.
- INT8 quantization이 표준. PTQ는 빠르지만 손실, QAT는 정확하지만 학습 필요.
- Memory bandwidth와 MAC 활용률 둘 다 챙겨야 효율.
- Unsupported op는 CPU fallback. 모델을 NPU-friendly하게.
- Vendor SDK (Vela, SNPE, Core ML, edgetpu_compiler) 거쳐 binary 생성.

다음 편은 **TFLite Micro**입니다.

## 관련 항목

- [12-04: TensorRT](/blog/embedded/modern-recipes/part12-04-tensorrt)
- [12-05: TFLite Micro](/blog/embedded/modern-recipes/part12-05-tflite-micro)
- [12-06: ONNX Runtime](/blog/embedded/modern-recipes/part12-06-onnx-runtime)
- [6-01: Edge Inference](/blog/embedded/modern-recipes/part12-01-edge-inference)
- [6-03: Quantization](/blog/embedded/modern-recipes/part12-03-quantization)
