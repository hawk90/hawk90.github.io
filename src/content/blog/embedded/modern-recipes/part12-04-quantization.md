---
title: "딥러닝 Quantization 분석 — PTQ·QAT·INT8·INT4·Calibration"
slug: "embedded/modern-recipes/part12-04-quantization"
date: 2026-04-21T09:02:00
description: "FP32→INT8/INT4 양자화의 수식, PTQ와 QAT 차이, per-channel·per-tensor 선택, LLM용 GPTQ·AWQ까지 실전 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 140
tags: [recipes, quantization, int8, int4, qat, ptq, gptq]
topics: ["embedded"]
---

## 한 줄 요약

> **"Quantization은 float 표현을 낮은 bit-width 정수로 바꿔 메모리·연산량을 줄이는 기법입니다."** 같은 INT8이라도 scale을 tensor 하나에 줄지 channel마다 줄지에 따라 작은 channel의 오차가 수십 배 달라집니다.

## 어떤 상황에서 쓰나

INT8만 받는 가속기(예: [12-03](/blog/embedded/modern-recipes/part12-03-npu-architecture)의 Ethos-U는 INT8 TFLite 모델을 입력으로 받습니다)에 모델을 올리거나, flash·RAM이 부족해 weight를 줄여야 할 때입니다. LLM은 크기 때문에 더 절실합니다. 8B parameter 모델은 16-bit로 두면 weight만 16 GB 남짓이고, llama.cpp의 Llama 3.1 8B 표에서 F16 파일은 14.96 GiB, Q4_K_M은 4.58 GiB입니다.

이 글의 계산과 ONNX Runtime 실행은 Debian 13 arm64 guest의 Python 3.13.5, numpy, `onnx` 1.23.2, `onnxruntime` 1.32.0에서 돌렸습니다.

## 핵심 개념

LiteRT(TFLite) quantization 명세는 INT8 값과 실수를 다음처럼 잇습니다.

```text
real_value = (int8_value - zero_point) × scale
```

정의를 뒤집으면 `q = round(x / scale) + zero_point`이고, 표현 범위를 넘는 값은 clip합니다. 같은 명세는 weight를 zero-point 0인 symmetric으로, activation을 zero-point가 범위 안 어디든 올 수 있는 asymmetric으로 둡니다. 0~6 범위의 ReLU6 출력을 uint8 asymmetric으로 표현하면 scale = 6 / 255이고, 아래처럼 왕복합니다.

```text
asym uint8: scale 0.023529 zp 0 q [0, 42, 85, 128, 170, 212, 255] back [0.0, 0.9882, 2.0, 3.0118, 4.0, 4.9882, 6.0]
```

적용 시점은 두 가지입니다.

| 방식 | 동작 |
|------|------|
| PTQ (Post-Training Quantization) | 학습이 끝난 모델에 calibration 입력을 흘려 activation 범위를 재고 scale을 정함 |
| QAT (Quantization-Aware Training) | 학습 중에 quantize·dequantize를 흉내 내는 node를 넣어, 양자화 오차를 본 채로 weight를 학습 |

### Granularity — per-tensor와 per-channel

scale을 몇 개 둘지가 세 번째 축입니다. 명세는 weight에 per-axis(Conv의 per-channel)와 per-tensor를 둘 다 허용합니다.

차이를 숫자로 보려고, output channel마다 크기가 0.01배~2배로 다른 conv weight `[8, 3, 3, 3]`을 만들어 symmetric INT8로 양자화했습니다. scale을 tensor 전체에 하나 줄 때와 channel마다 줄 때, 각 channel의 최대 절대 오차를 그 channel의 최대값으로 나눈 상대 오차입니다.

```text
ch  max|w|   rel.err per-tensor  rel.err per-channel
0   0.0233     0.5877              0.0038
1   0.0392     0.4578              0.0037
2   0.1102     0.1638              0.0039
3   0.1689     0.1052              0.0036
4   0.4500     0.0384              0.0037
5   1.1991     0.0151              0.0035
6   1.9350     0.0093              0.0039
7   4.6207     0.0039              0.0039
non-zero int8 values per channel with the per-tensor scale: [1, 11, 22, 25, 24, 26, 27, 27] of 27
```

per-tensor scale은 가장 큰 channel(최대 4.62)에 맞춰지므로, 가장 작은 channel 0은 27개 weight 중 26개가 0으로 반올림되어 상대 오차가 59%입니다. per-channel은 모든 channel이 0.4% 이하입니다. 자로 비유하면, 1 m 눈금 하나로 1 mm 부품과 1 m 부품을 같이 재는 것이 per-tensor, 부품마다 맞는 자를 쓰는 것이 per-channel입니다.

```python
# per-tensor vs per-channel INT8 weight quantization on a conv weight whose
# output channels have very different ranges
import numpy as np
rng = np.random.default_rng(0)
w = rng.normal(size=(8, 3, 3, 3)).astype(np.float32)           # [out_ch, in_ch, kh, kw]
w *= np.array([0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0, 2.0], np.float32)[:, None, None, None]

def q_sym(x, scale):                       # symmetric: zero_point = 0, range [-127, 127]
    q = np.clip(np.round(x / scale), -127, 127)
    return q * scale                       # real = (q - 0) * scale

s_t = np.abs(w).max() / 127                                   # one scale
s_c = np.abs(w).reshape(8, -1).max(axis=1) / 127              # one scale per out channel
```

LLM weight에는 channel보다 더 잘게, 연속한 weight 묶음(group)마다 scale을 두는 per-group 방식도 씁니다.

## 코드 / 실제 사용 예

### ONNX Runtime static quantization

64 → 256 → 10의 작은 MLP를 `onnx.helper`로 만들고, 200개 calibration 입력으로 `quantize_static`을 돌렸습니다. 이전 판의 코드는 `QuantFormat`·`QuantType`을 import하지 않아 그대로는 실행되지 않았습니다.

```python
from onnxruntime.quantization import quantize_static, CalibrationDataReader, QuantFormat, QuantType

class Reader(CalibrationDataReader):
    def __init__(self, data):
        self.it = iter(data)
    def get_next(self):
        try:
            return {"input": next(self.it)}
        except StopIteration:
            return None

quantize_static(
    model_input="model.onnx",
    model_output="model_int8.onnx",
    calibration_data_reader=Reader(calib),
    quant_format=QuantFormat.QDQ,
    per_channel=True,
    activation_type=QuantType.QInt8,
    weight_type=QuantType.QInt8,
)
```

```text
onnxruntime 1.32.0
size fp32 77003 int8 QDQ 22629
ops in quantized graph {'DequantizeLinear': 7, 'QuantizeLinear': 4, 'MatMul': 2, 'Add': 1}
max relative output error: mean 0.0222, worst 0.0739; argmax agreement 98/100
```

파일은 77,003 byte에서 22,629 byte로 줄었습니다. QDQ format은 원래 연산(`MatMul`, `Add`)을 그대로 두고 앞뒤에 `QuantizeLinear`·`DequantizeLinear`를 끼워 넣은 그래프입니다. 100개 test 입력에서 FP32 출력 대비 최대 상대 오차의 평균은 2.2%, 최악 7.4%였고, 최댓값 index(분류 결과)는 100개 중 98개가 같았습니다. 실제 모델에서는 이 비교를 정확도 지표로 다시 합니다.

### TFLite PTQ INT8

LiteRT 문서의 "Post-training integer quantization" 페이지가 쓰는 API입니다. 이 글의 환경에는 TensorFlow가 없어 실행하지 않았습니다.

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

`representative_dataset`이 activation 범위를 정하는 calibration 입력입니다. 실제 deploy 분포에서 뽑아야 범위가 맞습니다.

### llama.cpp quantize — LLM 4-bit

llama.cpp의 `tools/quantize/README.md`는 GGUF로 변환한 모델을 `llama-quantize`로 양자화하는 예를 보입니다.

```bash
./build/bin/llama-quantize gemma-4-E2B-it-bf16.gguf gemma-4-E2B-it-Q4_K_M.gguf Q4_K_M
```

같은 README의 Llama 3.1 8B 표(일부)입니다. 이 표는 README에 실린 값이고 이 글에서 재지 않았습니다.

| Variant | bits/weight | size (GiB) | text generation t/s @ 128 |
|---------|------------:|-----------:|--------------------------:|
| Q2_K | 3.1593 | 2.95 | 79.85 ±0.20 |
| Q3_K_M | 3.9960 | 3.74 | 71.68 ±0.22 |
| Q4_K_M | 4.8944 | 4.58 | 71.93 ±1.52 |
| Q5_K_M | 5.7036 | 5.33 | 67.23 ±1.08 |
| Q6_K | 6.5633 | 6.14 | 58.67 ±3.13 |
| Q8_0 | 8.5008 | 7.95 | 50.93 ±0.08 |
| F16 | 16.0005 | 14.96 | — |

`Q4_K_M`의 bits/weight는 이름의 4가 아니라 4.8944이고, 같은 README의 메모리 표에서 Llama 3.1 8B Q4_K_M 파일은 4.9 GB입니다. README는 정확도 손실을 perplexity나 KL divergence로 잰다고 설명하지만, 이 표에는 그 값이 없어 이 글도 싣지 않았습니다.

### GPTQ와 SmoothQuant

두 방법 모두 LLM용 PTQ입니다. 이 글에서는 실행하지 않았고, 설명은 각 논문의 초록에서 옮겼습니다.

- **GPTQ**(arXiv 2210.17323)는 "a new one-shot weight quantization method based on approximate second-order information"으로, weight를 "3 or 4 bits per weight"까지 줄이면서 정확도 저하를 무시할 수준으로 둔다고 보고합니다.
- **SmoothQuant**(arXiv 2211.10438)는 W8A8을 위한 training-free PTQ입니다. "weights are easy to quantize while activations are not"이라는 관찰에서 출발해, 수학적으로 동등한 변환으로 activation의 outlier 부담을 weight로 옮깁니다.

## 측정 / 성능 비교

이 글에서 잰 것과 인용한 것을 나눠 적습니다.

| 항목 | 값 | 출처 |
| --- | --- | --- |
| per-tensor vs per-channel 상대 오차, 가장 작은 channel | 0.5877 vs 0.0038 | 위 numpy 실행 |
| 작은 MLP, ORT QDQ INT8 파일 크기 | 77,003 → 22,629 byte | 위 ORT 실행 |
| 같은 MLP, argmax 일치 | 98/100 | 위 ORT 실행 |
| Llama 3.1 8B, Q4_K_M vs F16 크기 | 4.58 vs 14.96 GiB | llama.cpp quantize README |

ResNet-50 등 큰 모델의 정확도·latency는 이번에 실행하지 않았고 확인한 공개 자료도 없어 싣지 않았습니다.

## 자주 보는 함정

> ⚠️ calibration 입력이 적거나 deploy와 다름

activation 범위는 calibration 입력에서 정해집니다. 실제 deploy 분포와 다른 입력으로 정하면 scale이 맞지 않습니다. 몇 장을 쓸지는 정확도 비교로 정하고, 낮과 밤처럼 조건이 다른 입력을 골고루 넣습니다.

> ⚠️ per-tensor weight scale

위 실행처럼 channel 간 크기 차이가 큰 weight에 scale 하나를 주면 작은 channel이 거의 0이 됩니다. 가속기가 per-channel을 지원하는지 먼저 봅니다.

> ⚠️ 양자화 식의 부호

`(q - zero_point) × scale`의 부호를 바꿔 쓰면 전처리가 틀립니다. 모델 input tensor의 scale·zero_point를 읽어 그대로 씁니다([12-03](/blog/embedded/modern-recipes/part12-03-npu-architecture)).

> ⚠️ INT8 가속기에 float 입력

INT8 모델의 입력이 int8이면, 전처리에서 위 식으로 변환해 넣어야 합니다. float를 그대로 넣으면 모델이 기대하는 범위가 아닙니다.

## 정리

- INT8 값과 실수는 `real = (q - zero_point) × scale`로 이어지고, weight는 symmetric, activation은 asymmetric이 명세의 기본입니다.
- 크기가 다른 channel에 scale 하나를 주면 작은 channel의 오차가 수십 배 커집니다(위 실행 59% vs 0.4%).
- ONNX Runtime `quantize_static`은 작은 MLP를 3.4분의 1 크기의 QDQ 모델로 바꿨고 분류 결과는 98% 일치했습니다.
- LLM 4-bit 양자화의 실제 크기는 README 표의 bits/weight로 봅니다(Q4_K_M 4.89).

다음 편은 **TensorRT**입니다.

## 관련 항목

- [12-05: TensorRT](/blog/embedded/modern-recipes/part12-05-tensorrt)
- [12-08: Thermal](/blog/embedded/modern-recipes/part12-08-thermal)
- 6-07: 온디바이스 LLM
