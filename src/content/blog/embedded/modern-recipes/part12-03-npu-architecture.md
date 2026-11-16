---
title: "NPU 아키텍처 분석 — Ethos·Hexagon·Systolic Array 비교"
slug: "embedded/modern-recipes/part12-03-npu-architecture"
date: 2026-04-21T09:01:00
description: "Arm Ethos·Qualcomm Hexagon·Apple Neural Engine 등 NPU 내부 구조와 systolic MAC array·INT8·memory hierarchy."
series: "Modern Embedded Recipes"
seriesOrder: 139
tags: [recipes, edge-ai, npu, ethos, hexagon]
topics: ["embedded"]
---

## 한 줄 요약

> **"NPU는 MAC array·vector unit·memory hierarchy를 조합한 workload-specific accelerator입니다."** 같은 모델이라도 MAC 수, SRAM 배치, 지원 operator에 따라 결과가 달라지므로, 비교는 vendor 컴파일러가 내는 보고서와 실측으로 합니다.

## 어떤 상황에서 쓰나

스마트폰, 스마트 카메라, 로봇, 차량, edge AI 박스처럼 저전력으로 신경망 추론을 해야 하는 곳입니다. CPU와 NPU의 latency·전력 차이는 model·runtime·clock·memory path에 따라 다르므로, 이 글은 수치를 외우는 대신 Arm Ethos-U의 공개 컴파일러(Vela)로 같은 모델을 여러 NPU 구성에 넣어 보는 방법을 보입니다.

이 글의 실행은 Debian 13 arm64 guest의 Python venv에 설치한 `ethos-u-vela` 5.2.0으로 했고, 모델은 TensorFlow Lite Micro 저장소의 `person_detect.tflite`(MobileNet v1 기반 96×96 사람 검출, INT8, sha256 `808cfdfc…`)입니다.

## 핵심 개념 — MAC Array

신경망 연산의 대부분은 곱셈-누적(MAC)입니다. convolution은 weight와 입력 window를 곱해 채널·공간 방향으로 더하고, fully connected는 weight 벡터와 입력 벡터의 내적입니다. 아래 Vela 실행에서도 person detection 모델 한 번의 추론은 7,160,196 MAC으로 보고됐습니다.

NPU는 MAC unit을 격자로 배치해 cycle마다 여러 MAC을 동시에 굴립니다. TPU 계열의 systolic array는 weight를 격자에 미리 올려 두고, 입력이 한쪽에서 흘러 들어와 cell을 차례로 지나며 각 cell이 MAC을 한 뒤 결과를 옆으로 넘깁니다. 공장 조립 라인에 비유하면 작업자(cell)는 자기 자리에서 같은 동작만 하고 부품(데이터)이 컨베이어를 따라 움직입니다. 128 × 128 격자라면 cycle당 16,384 MAC입니다.

## Arm Ethos-U — Cortex-M과 짝을 이루는 NPU

Vela 5.2.0의 `architecture_features.py`는 지원하는 구성을 이름으로 정의합니다. 이름 끝의 숫자가 cycle당 MAC 수입니다.

| 계열 | Vela가 받는 구성 |
| --- | --- |
| Ethos-U55 | `ethos-u55-32`, `-64`, `-128`, `-256` |
| Ethos-U65 | `ethos-u65-256`, `-512` (512는 256 MAC 코어 2개로 정의) |
| Ethos-U85 | `ethos-u85-128`, `-256`, `-512`, `-1024`, `-2048` |

peak 연산량은 MAC 수 × 2(곱셈과 덧셈) × clock입니다. Vela의 기본 U55 system 구성(`Ethos_U55_High_End_Embedded`)은 core clock을 500 MHz로 두므로, `ethos-u55-256`이면 256 × 2 × 500 MHz = 256 GOPS입니다. 실제 칩의 clock과 구성은 칩 벤더가 정하므로, 제품의 TOPS는 그 칩의 데이터시트에서 봅니다([12-01](/blog/embedded/modern-recipes/part12-01-edge-inference)의 Alif E7 예).

Ethos-U55는 Cortex-M 같은 host CPU와 메모리를 공유합니다.

| 블록 | 역할 |
| --- | --- |
| Cortex-M (예: M55) | TFLite Micro 실행, NPU에 command stream dispatch, NPU가 못 하는 operator 처리 |
| Ethos-U55 | MAC array로 convolution·pooling 등 실행 |
| SRAM / Flash | activation은 SRAM, weight는 Flash 등에 두고 둘 다 접근 |

## Vela로 같은 모델을 여러 구성에 넣기

Vela는 INT8 TFLite 모델을 받아 NPU가 실행할 부분을 custom operator로 바꾸고, 메모리 사용량과 성능 추정을 보고합니다.

```bash
python3 -m venv venv && . venv/bin/activate
pip install ethos-u-vela            # 5.2.0
for c in ethos-u55-64 ethos-u55-128 ethos-u55-256 ethos-u65-256 ethos-u85-256; do
    vela --accelerator-config $c --output-dir out-$c person_detect.tflite
done
```

`ethos-u55-128`의 요약 출력 일부입니다.

```text
Accelerator configuration               Ethos_U55_128
System configuration             Ethos_U55_High_End_Embedded
Memory mode                               Shared_Sram
Total SRAM used                                 72.73 KiB
Total Off-chip Flash used                      228.27 KiB
CPU operators = 0 (0.0%)
NPU operators = 57 (100.0%)
Neural network macs                           7160196 MACs/batch
```

`out-*/*_summary_*.csv`에서 뽑은 구성별 추정치입니다.

| 구성 | core clock | NPU cycle | 전체 cycle | 추정 추론 시간 |
| --- | ---: | ---: | ---: | ---: |
| `ethos-u55-64` | 500 MHz | 369,563 | 457,984 | 0.916 ms |
| `ethos-u55-128` | 500 MHz | 204,284 | 353,931 | 0.708 ms |
| `ethos-u55-256` | 500 MHz | 127,348 | 299,767 | 0.600 ms |
| `ethos-u65-256` | 1 GHz | 121,810 | 125,147 | 0.125 ms |

MAC 수를 64에서 256으로 네 배 늘리면 NPU cycle은 약 2.9분의 1로 줄지만, 전체 cycle은 1.5분의 1로만 줄었습니다. 전체 cycle에는 메모리 접근 시간이 포함되고, U55의 이 system 구성은 SRAM과 off-chip flash를 함께 쓰므로 MAC을 늘려도 메모리 쪽 시간이 남기 때문입니다. U65 구성은 Vela 기본값이 `Dedicated_Sram_384KB` 메모리 모드와 1 GHz clock이라 같은 모델에서 전체 cycle이 NPU cycle에 가깝습니다. 이 값들은 Vela의 모델 기반 추정이고, 실제 보드에서 잰 값이 아닙니다.

모델의 operator 57개가 모두 NPU로 갔다는 줄(`CPU operators = 0`)도 중요합니다. 지원되지 않는 operator가 있으면 그 수가 여기에 나오고, 그 부분은 Cortex-M에서 돕니다.

## 다른 NPU 계열

공개 자료로 확인한 수치만 적습니다.

| 플랫폼 | 공개 수치 | 출처 |
| --- | --- | --- |
| Apple M2 Neural Engine | "up to 15.8 trillion operations per second" | Apple Newsroom, 2022-06 M2 발표 |
| NVIDIA Jetson AGX Orin 64GB | 275 TOPS(sparse), GPU 170 / DLA 105 TOPS(sparse) | NVIDIA Jetson Orin 비교표([12-01](/blog/embedded/modern-recipes/part12-01-edge-inference) 참고) |

Qualcomm Hexagon, Google Edge TPU 등의 TOPS·전력 수치는 이번에 연 공개 자료에서 확인하지 못해 싣지 않았습니다. Apple의 A17 Pro 발표 자료는 Neural Engine이 "up to 2x faster"라고만 적어 TOPS 값은 쓰지 않았습니다.

각 계열의 프로그래밍 진입점은 다음과 같습니다.

| 플랫폼 | 진입점 |
|--------|-----------|
| Arm Ethos-U | Vela로 변환한 모델 → TFLite Micro + Ethos-U custom operator |
| Apple Neural Engine | Core ML (ISA 비공개) |
| NVIDIA DLA | TensorRT ([12-05](/blog/embedded/modern-recipes/part12-05-tensorrt)) |

## Memory Hierarchy

NPU의 MAC array는 데이터가 제때 오지 않으면 쉽니다. weight와 activation을 가까운 SRAM에 둘수록 좋고, 모델이 SRAM에 다 들어가지 않으면 바깥 메모리 접근이 병목이 됩니다. 위 Vela 결과에서 MAC을 네 배로 늘려도 전체 시간이 1.5분의 1로만 준 것이 그 예입니다. roofline으로 말하면 byte당 MAC이 적은 layer는 memory-bound, 많은 layer는 compute-bound입니다.

## Quantization — INT8

TFLite(LiteRT) quantization 명세는 INT8 값과 실수의 관계를 다음 식으로 정의합니다.

```text
real_value = (int8_value - zero_point) × scale
```

같은 명세는 weight를 per-axis(Conv의 per-channel) 또는 per-tensor로, zero-point를 0으로 두고, activation은 per-tensor·asymmetric으로 둡니다. 이전 판의 `q = round((x - zero_point) / scale)`와 `x = (q + zero_point) × scale`은 이 정의와 맞지 않아 고쳤습니다(정의를 뒤집으면 `q = round(x / scale) + zero_point`). 양자화의 자세한 절차와 실행 예는 [12-04](/blog/embedded/modern-recipes/part12-04-quantization)에서 다룹니다.

## 자주 보는 함정

> ⚠️ 모든 layer가 NPU에서 돈다는 가정

지원되지 않는 operator가 있으면 그 부분은 host CPU로 갑니다. Vela 요약의 `CPU operators` 줄로 확인합니다. 위 모델은 0개였습니다.

> ⚠️ MAC 수로 성능을 추정

위 표처럼 MAC을 네 배로 늘려도 전체 cycle은 1.5분의 1로만 줄었습니다. 메모리 구성(SRAM 크기, flash 사용 여부)까지 같은 조건에서 비교합니다.

> ⚠️ 추정치를 측정치로 사용

Vela의 cycle·추론 시간은 성능 모델의 추정입니다. 실제 칩의 clock, 메모리 wait state, host CPU 부분이 더해지므로 보드에서 [12-02](/blog/embedded/modern-recipes/part12-02-edge-pipeline-measurement)의 방법으로 다시 잽니다.

> ⚠️ 양자화 공식을 틀리게 구현

위 정의(`(q - zero_point) × scale`)와 부호가 다른 식으로 전처리를 짜면 입력이 한쪽으로 치우칩니다. 모델의 input tensor가 가진 scale·zero_point를 그대로 씁니다.

## 정리

- NPU의 핵심은 MAC array와 그것을 먹여 살리는 memory hierarchy입니다.
- Ethos-U55는 Vela 기준 32~256 MAC/cycle 구성이고, peak는 MAC × 2 × clock입니다.
- 같은 person detection 모델에서 U55의 MAC을 64→256으로 늘리면 NPU cycle은 2.9분의 1, 전체 cycle은 1.5분의 1로 줄었습니다(Vela 추정).
- INT8의 실수 값은 `(q - zero_point) × scale`입니다.

다음 편은 **Quantization**입니다.

## 관련 항목

- [12-05: TensorRT](/blog/embedded/modern-recipes/part12-05-tensorrt)
- [12-06: TFLite Micro](/blog/embedded/modern-recipes/part12-06-tflite-micro)
- [12-07: ONNX Runtime](/blog/embedded/modern-recipes/part12-07-onnx-runtime)
- [12-01: Edge Inference](/blog/embedded/modern-recipes/part12-01-edge-inference)
- [12-04: Quantization](/blog/embedded/modern-recipes/part12-04-quantization)
