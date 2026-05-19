---
title: "6-03: Quantization — INT8·INT4·PTQ·QAT·Calibration"
date: 2026-05-21T03:00:00
description: "INT8/INT4 quantization. Post-Training Quantization (PTQ), Quantization-Aware Training (QAT), calibration."
series: "Modern Embedded Recipes"
seriesOrder: 33
tags: [recipes, quantization, int8, int4, qat, calibration]
draft: true
---

## 한 줄 요약

> **"Quantization = float → int 변환"** — 4x throughput·2x memory·accuracy 약간 ↓.

## Quantization 종류

```text
FP32 (baseline)           — 32-bit float, 가장 정확
FP16                       — 2x faster, 0.5x memory, accuracy ≈ FP32
BF16                       — exponent FP32 + mantissa 작게, 학습 친화
INT8                       — 4x faster, 0.25x memory, accuracy 1-2% ↓
INT4                       — 8x faster, 0.125x memory, accuracy 5%+ ↓
Binary (1-bit)             — 32x faster, accuracy 큰 손실
```

자율주행·서버 — INT8 표준. LLM — INT4까지.

## Quantization 수식

```text
Scale (s) = (max - min) / 255
Zero point (z) = -min / s

q = round(x / s) + z      /* float → int8 */
x = (q - z) * s            /* int8 → float (dequant) */

Symmetric: z = 0, range [-128, 127]
Asymmetric: z ≠ 0, range [0, 255]
```

## Post-Training Quantization (PTQ)

```python
import tensorflow as tf

converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]

# Float16 — easy
tflite_fp16 = converter.convert()

# INT8 — calibration 필요
def representative_data():
    for x in calibration_data:
        yield [x]

converter.representative_dataset = representative_data
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
converter.inference_input_type = tf.int8
converter.inference_output_type = tf.int8
tflite_int8 = converter.convert()
```

PTQ — *학습 후 quantize*. Calibration data (~100 samples)로 *scale·zero point 계산*.

## QAT — Quantization-Aware Training

```python
import tensorflow_model_optimization as tfmot

quant_model = tfmot.quantization.keras.quantize_model(model)
quant_model.compile(optimizer='adam', loss=...)
quant_model.fit(train_data, epochs=5)

# Convert
converter = tf.lite.TFLiteConverter.from_keras_model(quant_model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_qat = converter.convert()
```

학습 중 *fake quantization* — gradient는 float, forward는 quantized. *accuracy 회복*.

## INT4 — LLM 표준

```python
# GPTQ — 4-bit quantization for LLM
from auto_gptq import AutoGPTQForCausalLM, BaseQuantizeConfig

quantize_config = BaseQuantizeConfig(
    bits=4,
    group_size=128,
    desc_act=False,
)

model = AutoGPTQForCausalLM.from_pretrained("meta-llama/Llama-2-7b",
                                              quantize_config)
model.quantize(examples)
model.save_quantized("./llama-7b-4bit")
```

LLM 7B + INT4 = *~4 GB*. Raspberry Pi 5·iPhone에서 inference 가능.

## llama.cpp Quantization

```bash
# Convert HuggingFace → GGUF
python convert.py models/llama-7b/

# Quantize to Q4_K_M (recommended 4-bit)
./quantize models/llama-7b/ggml-model-f16.gguf \
           models/llama-7b/ggml-model-Q4_K_M.gguf Q4_K_M

# Quantize variants:
# Q2_K   — 2-bit (3.5 GB, 큰 accuracy ↓)
# Q3_K_M — 3-bit
# Q4_K_M — 4-bit (4 GB, recommended)
# Q5_K_M — 5-bit
# Q6_K   — 6-bit
# Q8_0   — 8-bit (7 GB, 거의 FP16 accuracy)
```

llama.cpp — 가장 인기 LLM inference. CPU·Metal·CUDA·Vulkan backend.

## Mixed-Precision Quantization

```text
Layer별 다른 precision:
  Conv1 (first):    FP16 (input 민감)
  Conv2-10:        INT8 (bulk)
  FC last:         FP16 (output 정확)
  Embedding:       INT4 (큰 메모리, 정확도 둔감)
```

자동 — *TensorRT auto-selection* 또는 NAS (Neural Architecture Search).

## Symmetric vs Asymmetric

```text
Symmetric — zero point = 0:
  scale = max(|min|, |max|) / 127
  range [-128, 127]
  계산 빠름
  
Asymmetric — zero point ≠ 0:
  scale = (max - min) / 255
  zero point shift
  range [0, 255]
  더 정확 (특히 ReLU 후 양수만)
```

Weight = symmetric, activation = asymmetric — 흔한 조합.

## Per-Channel vs Per-Tensor

```text
Per-tensor:
  하나의 scale·zero point per tensor
  계산 빠름
  
Per-channel (per filter):
  각 conv filter별 scale·zero point
  정확도 ↑↑
  Convolutional layer 표준
```

Modern framework — *per-channel weight + per-tensor activation*.

## Calibration Methods

```text
Min-Max:
  scale = (max - min) / 255
  outlier에 민감
  
Percentile (99.9%):
  outlier 무시 — robust
  
KL Divergence:
  histogram + KL minimization
  TensorRT 표준
  
Entropy:
  비슷한 KL
```

TensorRT — *KL Divergence calibration* 기본.

## ARM Quantization Frameworks

```text
CMSIS-NN (Cortex-M):
  INT8 SIMD ops on Helium MVE
  
Arm Compute Library (Cortex-A):
  NEON·SVE optimized INT8 kernels
  
Vulkan compute on Mali GPU:
  INT8 shaders
```

## Performance — Cortex-A78

```text
ResNet-50 inference:
  FP32:  300 ms (CPU)
  FP16:  150 ms (CPU)
  INT8:   80 ms (CPU NEON)
  INT8:   15 ms (NPU)
  
LLaMA 7B:
  FP16:  out of memory (14 GB)
  INT8:  7 GB, ~5 token/s
  INT4:  4 GB, ~10 token/s
```

## NPU·DLA — INT8 Hardware

```text
Jetson Orin DLA:
  INT8: 105 TOPS
  FP16: 5.2 TOPS
  → INT8가 20x 빠름
  
Hailo-8 NPU:
  INT8 only — FP32 inference 안 됨
  
Google Edge TPU:
  INT8 only
```

NPU = *INT8 가속 hardware*. Floating point 못 함.

## Outlier Handling

```python
# Activation outlier (LLM 흔함)
# SmoothQuant — outlier를 weight로 transfer
import smoothquant

model = smoothquant.smooth_lm(model, alpha=0.5)
# 이후 normal INT8 quantize
```

LLM activation — *outlier가 INT8 표현 깸*. SmoothQuant·AWQ·GPTQ — outlier 처리.

## Accuracy Recovery

```text
PTQ 후 accuracy 떨어짐 → 옵션:
  1. QAT (best, but retrain 필요)
  2. Mixed precision (정확도 critical layer FP16 유지)
  3. Per-channel quantization
  4. Better calibration data (대표성)
  5. Cross-Layer Equalization (CLE)
  6. AdaRound (FP weight rounding 최적화)
```

## 자주 하는 실수

> ⚠️ Calibration data 부족

```python
representative_data = [single_sample]   # 1 sample
```

→ 100+ samples, *distribution 대표*.

> ⚠️ PTQ로 accuracy 보장

```python
ptq_model.evaluate(test_data)   # accuracy 5% ↓
```

→ QAT 또는 mixed precision.

> ⚠️ FP32 input 직접 NPU에

```c
npu_inference(fp32_input);   /* NPU INT8 only */
```

→ preprocess에서 quantize.

> ⚠️ Activation dynamic range

```python
# Static quant — activation도 사전 quantize
# 그러나 input 분포 모르면 — runtime overflow
```

→ representative data.

## 정리

- Quantization — **FP32 → INT8·INT4**.
- **PTQ** = calibration, **QAT** = retrain.
- **Per-channel weight + per-tensor activation** 표준.
- **GPTQ·AWQ·SmoothQuant** = LLM 4-bit.
- NPU·DLA — *INT8 hardware* 20x speedup.
- Mixed precision — critical layer FP16 유지.

다음 편은 **Thermal Throttling**.

## 관련 항목

- [6-02: TensorRT](/blog/embedded/modern-recipes/part6-02-tensorrt)
- [6-04: Thermal](/blog/embedded/modern-recipes/part6-04-thermal)
