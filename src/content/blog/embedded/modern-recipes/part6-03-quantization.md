---
title: "6-03: Quantization — PTQ·QAT·INT8·INT4·Calibration·SmoothQuant"
date: 2026-05-21T03:00:00
description: "FP32→INT8/INT4 양자화의 수식, PTQ와 QAT 차이, per-channel·per-tensor 선택, LLM용 GPTQ·AWQ까지 실전 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 33
tags: [recipes, quantization, int8, int4, qat, ptq, gptq]
---

## 한 줄 요약

> **"Quantization은 float을 정수로 바꿔 메모리·연산을 줄이는 압축입니다."** FP32 → INT8로 메모리 4배·연산 2~4배 절약을 얻고 accuracy는 1~2%만 손해 봅니다. LLM에서는 INT4까지 가야 edge에 들어갑니다.

## 어떤 상황에서 쓰나

NPU·DLA·Edge TPU 같은 전용 가속기는 *INT8만* 지원하는 경우가 흔합니다. FP32 모델을 그대로 들고 가면 가속기가 일을 안 하고 CPU로 떨어집니다. Smartphone·자동차·IoT처럼 전력·메모리 예산이 빠듯한 환경에서는 quantization이 사실상 의무입니다.

LLM은 또 다른 이유입니다. Llama 3 8B를 FP16으로 들고 가면 16 GB가 필요해 mobile·SBC에 안 들어갑니다. INT4로 quantize하면 4 GB까지 줄어 Raspberry Pi 5·iPhone에서 돌릴 수 있게 됩니다. 2024년 이후 mobile LLM이 폭발한 것이 이 변화 덕분입니다.

## 핵심 개념

Quantization은 float 값을 정수로 *선형 매핑*하는 단순한 수식입니다.

```text
scale (s)     = (max - min) / 255
zero point(z) = round(-min / s)

quantize    q = round(x / s) + z
dequantize  x = (q - z) * s
```

Symmetric은 `z = 0`으로 두고 `[-128, 127]` 범위를 씁니다. 곱셈에 zero point가 없어 계산이 빠릅니다. Asymmetric은 `z ≠ 0`으로 `[0, 255]`를 써서 ReLU 후처럼 한쪽으로 치우친 분포를 더 정확하게 표현합니다. 보통 *weight = symmetric, activation = asymmetric*을 씁니다.

적용 시점은 두 가지입니다.

```text
PTQ (Post-Training Quantization)
  학습 끝난 모델에 calibration data 100~1000장 흘려 scale 결정
  장점 빠름, 재학습 불필요
  단점 accuracy 손실 1~5%

QAT (Quantization-Aware Training)
  학습 중 fake-quant node 삽입, gradient는 float·forward는 quantized
  장점 accuracy FP32에 근접
  단점 재학습 필요 (epoch 수 ~ 5)
```

세 번째 축은 *granularity*입니다.

```text
Per-tensor      tensor 전체에 scale 하나 — 빠름, 정확도 ↓
Per-channel     conv filter마다 scale — Modern 표준, 정확도 ↑↑
Per-group       LLM weight를 N개씩 묶어 scale — INT4 표준
```

LLM INT4는 group size 64~128로 per-group quantization이 거의 강제됩니다. Outlier 한 개가 scale을 망가뜨리는 것을 막기 위함입니다.

## 코드 / 실제 사용 예

### TFLite PTQ INT8

```python
import tensorflow as tf

converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]

def representative_dataset():
    for x in calib_images[:500]:
        yield [tf.cast(x[None, ...], tf.float32)]

converter.representative_dataset = representative_dataset
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
converter.inference_input_type  = tf.int8
converter.inference_output_type = tf.int8

tflite_int8 = converter.convert()
open("model_int8.tflite", "wb").write(tflite_int8)
```

`representative_dataset`이 핵심입니다. 100~1000장 정도가 보통이고 *실제 deploy 분포*에서 sampling합니다.

### QAT 흐름

```python
import tensorflow_model_optimization as tfmot

q_aware = tfmot.quantization.keras.quantize_model(model)
q_aware.compile(optimizer='adam', loss='categorical_crossentropy')
q_aware.fit(train_x, train_y, epochs=5, validation_split=0.1)

converter = tf.lite.TFLiteConverter.from_keras_model(q_aware)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_qat = converter.convert()
```

PTQ로 1~2% accuracy가 떨어졌다면 QAT로 거의 회복됩니다. Production critical model은 QAT가 표준입니다.

### ONNX Runtime quantize

```python
from onnxruntime.quantization import quantize_static, CalibrationDataReader

class Reader(CalibrationDataReader):
    def __init__(self, paths):
        self.it = iter(paths)
    def get_next(self):
        try:
            img = load(next(self.it))
            return {'input': img}
        except StopIteration:
            return None

quantize_static(
    model_input='model.onnx',
    model_output='model_int8.onnx',
    calibration_data_reader=Reader(calib_paths),
    quant_format=QuantFormat.QDQ,
    per_channel=True,
    activation_type=QuantType.QInt8,
    weight_type=QuantType.QInt8,
)
```

`QDQ` (Quantize-Dequantize) format은 inference engine이 fold 후 INT8 kernel을 선택합니다. TensorRT·OpenVINO 모두 이 포맷을 받습니다.

### llama.cpp quantize — LLM INT4

```bash
# HuggingFace → GGUF FP16
python convert_hf_to_gguf.py models/llama-3-8b \
       --outfile llama-3-8b-f16.gguf

# Quantize
./llama-quantize llama-3-8b-f16.gguf llama-3-8b-Q4_K_M.gguf Q4_K_M
```

`Q4_K_M`은 mixed bit-width입니다. Attention K·V는 6-bit, FFN은 4-bit, embedding은 6-bit처럼 layer 종류에 따라 다른 bit를 씁니다. 같은 4-bit family 중 *accuracy/size trade-off*가 가장 좋다고 평가됩니다.

```text
Variant      Size     PPL Δ vs FP16   비고
Q2_K         3.5 GB    +0.6           accuracy 큰 손실
Q3_K_M       3.7 GB    +0.10
Q4_K_M       4.6 GB    +0.03          ← 권장
Q5_K_M       5.5 GB    +0.01
Q6_K         6.3 GB    +0.005
Q8_0         8.5 GB    +0.001         FP16 거의 동등
```

### GPTQ — 4-bit weight, Hessian 기반

```python
from auto_gptq import AutoGPTQForCausalLM, BaseQuantizeConfig

cfg = BaseQuantizeConfig(bits=4, group_size=128, desc_act=False)
model = AutoGPTQForCausalLM.from_pretrained(
    "meta-llama/Llama-3-8B-Instruct", quantize_config=cfg)
model.quantize(calib_examples)
model.save_quantized("llama-3-8b-gptq-4bit")
```

GPTQ는 layer별 Hessian inverse를 추정해 *rounding error를 다음 weight로 흘려 보내는* 방식입니다. Vanilla round 대비 4-bit에서 perplexity 차이가 크게 줄어듭니다.

### SmoothQuant — activation outlier 처리

```python
import smoothquant
# Activation outlier를 weight로 transfer → INT8 안정화
model = smoothquant.smooth_lm(model, scales, alpha=0.5)
# 이후 일반 INT8 PTQ
```

LLM activation은 *극소수 channel에 outlier*가 있습니다. 그대로 INT8 quantize하면 dynamic range가 outlier에 끌려가 accuracy가 무너집니다. SmoothQuant는 activation outlier를 mathematically 동등한 weight scale로 옮겨 둘 다 안정화합니다.

### Per-channel vs per-tensor 비교

```python
# Per-tensor (빠름)
scale = (w.max() - w.min()) / 255

# Per-channel (정확)
scale_per_ch = (w.max(dim=(1,2,3)) - w.min(dim=(1,2,3))) / 255
# Conv weight: [out_ch, in_ch, kh, kw]
```

Modern framework는 *per-channel weight + per-tensor activation*이 기본 조합입니다. 정확도는 거의 FP32 수준이면서 활성 quantize는 한 번에 끝나 빠릅니다.

### Calibration method 선택

```text
Min-Max          단순, outlier에 약함
Percentile 99.9% outlier 무시, robust
KL Divergence    histogram + KL minimize, TensorRT 표준
Entropy          KL과 유사
MSE              squared error 최소
```

TensorRT는 KL이 기본입니다. ResNet·YOLO 계열에서 잘 동작합니다. LLM activation은 outlier가 많아 percentile 99.9 또는 SmoothQuant가 안전합니다.

## 측정 / 성능 비교

ResNet-50 ImageNet top-1 accuracy 변화입니다.

```text
Precision               Top-1 acc    Size      Latency (Cortex-A78)
FP32                     76.1 %      98 MB     300 ms
FP16                     76.1 %      49 MB     150 ms
INT8 PTQ per-tensor      75.2 %      25 MB      80 ms
INT8 PTQ per-channel     75.8 %      25 MB      80 ms
INT8 QAT                 76.0 %      25 MB      80 ms
INT4 PTQ                 73.5 %      13 MB      55 ms
INT4 GPTQ                75.0 %      13 MB      55 ms
```

PTQ만으로도 accuracy drop이 1% 이하면 그대로 쓸 수 있습니다. 1% 이상이면 per-channel·QAT·calibration data 확장으로 회복합니다.

LLM 비교입니다. Llama 3 8B, perplexity (낮을수록 좋음)입니다.

```text
Variant      Size      PPL          Token/sec (Jetson Orin)   체감
FP16         16 GB     6.21         OOM                       -
Q8_0          8.5 GB   6.22         12                        FP16과 동등
Q5_K_M        5.5 GB   6.25         28                        체감 동등
Q4_K_M        4.6 GB   6.31         40                        잘 모를 수준
Q3_K_M        3.7 GB   6.45         55                        일부 약화
Q2_K          3.5 GB   7.10         70                        가끔 이상
```

Q4_K_M이 size·quality·speed의 sweet spot입니다.

## 자주 보는 함정

> Calibration data 너무 적음

```python
representative_dataset = [single_image]   # 1장
```

100장 이상, 가능하면 deploy 분포의 1000장 정도를 씁니다.

> Calibration data가 deploy와 다름

```text
실내 calibration → 야외 deploy → 5% accuracy 손실
```

Day/night, indoor/outdoor, multiple devices에서 골고루 sampling합니다.

> First/last layer까지 INT8

```text
입력 normalize layer 또는 출력 logit layer를 INT8화
→ accuracy 크게 손해
```

Mixed precision으로 입출력 layer를 FP16에 두면 회복됩니다.

> Batch norm fusion 누락

```text
Conv → BN → ReLU 분리된 채 quantize
→ BN folding 안 되어 scale 추정 부정확
```

Quantize 전에 *BN folding*을 먼저 수행합니다. 대부분 toolchain이 자동으로 처리하지만 custom path에서는 직접 확인이 필요합니다.

> LLM activation outlier 무시

```python
quantize_static(llm.onnx, ...)   # KL calibration
# Layer 마다 perplexity 폭증
```

SmoothQuant·AWQ로 outlier를 처리한 뒤 quantize합니다.

> NPU에 FP32 input

```c
npu_run(fp32_buffer);   /* NPU is INT8-only → fallback to CPU */
```

Preprocess에서 INT8로 변환해 NPU buffer에 직접 넣습니다.

## 정리

- Quantization은 float을 정수로 선형 매핑하는 압축으로 메모리 4배·연산 2~4배를 얻습니다.
- PTQ는 빠르지만 1~5% accuracy 손실, QAT는 재학습 필요하지만 FP32에 근접합니다.
- Weight는 per-channel symmetric, activation은 per-tensor asymmetric이 표준 조합입니다.
- LLM은 per-group INT4 + GPTQ/AWQ + SmoothQuant 조합이 사실상 표준입니다.
- llama.cpp Q4_K_M은 size·quality·speed의 sweet spot입니다.
- Calibration data는 100~1000장, *deploy 분포*에서 sampling합니다.
- First/last layer는 FP16에 두는 mixed precision이 accuracy 회복에 효과적입니다.
- NPU·DLA·Edge TPU는 거의 INT8 전용이므로 quantization이 deploy 전제 조건입니다.

다음 편은 **Thermal management**입니다.

## 관련 항목

- [6-02: TensorRT](/blog/embedded/modern-recipes/part6-02-tensorrt)
- [6-04: Thermal](/blog/embedded/modern-recipes/part6-04-thermal)
- [6-07: 온디바이스 LLM](/blog/embedded/modern-recipes/part6-07-llama-cpp-edge)
