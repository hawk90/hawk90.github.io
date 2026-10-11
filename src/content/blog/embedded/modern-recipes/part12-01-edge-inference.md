---
title: "Edge Inference 분석 — Cloud vs Edge·Latency·Privacy"
slug: "embedded/modern-recipes/part12-01-edge-inference"
date: 2026-04-21T09:00:00
description: "추론을 cloud가 아니라 device에서 돌려야 하는 조건을 frame 간격·region 왕복·대역폭·privacy(GDPR 데이터 최소화)·오프라인 동작으로 나누고, 출입 카운터에 적용한 결정 예, 공개 사양으로 본 하드웨어 등급과 런타임 선택, 원본 반출 차단·오프라인 결과 보관 코드를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 137
tags: [recipes, edge-ai, inference, tflite, onnx]
topics: ["embedded"]
---

## 한 줄 요약

> **"Edge로 옮길지는 모델 크기가 아니라 frame 간격, 밖으로 나가는 데이터, 끊긴 네트워크에서의 동작으로 정합니다."** 이 글은 그 질문에 답하는 순서와, 그 결정을 지키는 원본 반출 차단·오프라인 결과 보관 코드를 다룹니다.

## 어떤 상황에서 쓰나

카메라·마이크·진동 센서처럼 데이터가 연속으로 들어오고, 추론 결과로 device가 바로 무언가를 해야 하는 시스템입니다. 컨베이어 불량 검출, 로봇 장애물 회피, wake-word, 출입 카운터가 여기에 속합니다.

이 글은 Part 12의 첫 편이라 *어디서 추론할지*를 정하는 데 집중합니다. NPU 내부 구조는 [12-02](/blog/embedded/modern-recipes/part12-02-npu-architecture), 양자화는 [12-03](/blog/embedded/modern-recipes/part12-03-quantization), 런타임별 사용법은 12-04~12-06에서 따로 다룹니다. 고른 edge 경로가 frame 예산을 실제로 맞추는지 재는 법(stage별 latency, pipeline의 mailbox 정책, buffer 수)은 다음 편 [12-01b Edge 추론 Pipeline 측정](/blog/embedded/modern-recipes/part12-01b-edge-pipeline-measurement)에서 다룹니다.

글의 순서는 이렇습니다. "결정 기준 — 네 가지 질문"에서 자리를 정하고, "하드웨어 등급"과 "프레임워크 선택"에서 edge 안의 선택지를 좁히고, "코드 / 실제 사용 예"에서 그 결정을 코드와 빌드로 지키는 원본 반출 차단·오프라인 대응 코드를 봅니다.

## 결정 기준 — 네 가지 질문

| 질문 | edge 쪽으로 기우는 답 | cloud 쪽으로 기우는 답 |
|---|---|---|
| 결과가 얼마나 빨리 동작으로 이어져야 하나 | cloud 경로 시간(업로드 + 왕복 + 서버 처리)이 frame 간격보다 김 | 사람이 나중에 보는 리포트·대시보드 |
| 원본 데이터가 얼마나 큰가 | 원본 데이터율이 uplink 속도보다 큼 | 이벤트·요약값처럼 작음 |
| 원본이 device 밖으로 나가도 되나 | 사람 얼굴·음성처럼 개인정보가 섞임 | 이미 익명화된 집계 |
| 네트워크가 끊겨도 동작해야 하나 | 끊긴 동안에도 제어가 멈추면 안 됨 | 끊기면 재시도해도 되는 분석 |

첫 두 줄의 경계는 숫자로 그을 수 있고, 그 숫자는 아래 "Cloud 경로에 더해지는 것"과 "대역폭" 절에 있습니다. 30 fps에서 frame 간격은 33.3 ms인데, Azure 공개값으로 Korea Central region에서 West US region까지의 왕복만 130 ms이고 비압축 1080p frame 한 장의 업로드는 1 Gbit/s에서도 약 24.9 ms입니다.

왼쪽 열 답이 하나라도 있으면 그 추론의 기본 자리는 edge입니다. Cloud에 남기려면 왼쪽 열에 걸린 이유를 다른 방법으로 풀어야 합니다(아래 적용 예의 세 번째 항목). 왼쪽 열 답이 없는 일(모델 재학습, 여러 device 데이터를 모은 분석, A/B 비교)은 cloud에 남겨도 됩니다. 한 제품 안에서도 추론마다 답이 갈리므로, 결정 단위는 *제품*이 아니라 *추론 하나*입니다.

### 적용 예 — 출입 카운터

1080p 카메라로 문을 지나는 사람 수를 세는 출입 카운터에는 추론이 세 종류 있습니다. 네 질문(빠른 동작, 원본 크기, 원본 반출, 오프라인)을 추론마다 따로 적용하면 다음과 같이 갈립니다.

- **매 frame 사람 검출 + 선 통과 판정 → edge.** frame을 놓치면 통과를 놓칩니다. 원본은 1080p 영상(아래 대역폭 표)이고 얼굴이 찍히며, 네트워크가 끊겨도 세야 합니다. 네 질문 모두 왼쪽 열입니다.
- **시간대별 인원 집계·대시보드 → cloud.** 사람이 나중에 봅니다. 원본은 정수 몇 개짜리 익명 집계이고, 끊기면 다시 보내면 됩니다. 왼쪽 열 답이 없습니다.
- **오검출 사례로 모델 재학습 → cloud, 단 수집 경로를 따로 승인.** 급하지 않고 끊기면 다시 보내면 되지만, 사례 frame 묶음에 얼굴이 찍힙니다.

세 번째 항목은 원본 반출 질문이 왼쪽 열인데도 cloud에 남습니다. 재학습은 device 한 대에서 끝나는 일이 아니라서, 추론 경로가 아니라 *수집 경로*를 분리하고 승인 절차를 붙이는 쪽으로 풉니다(아래 privacy 표의 세 번째 줄).

### Latency 예산은 frame 간격에서 시작합니다

30 fps 카메라는 frame이 1000 / 30 ≈ 33.3 ms마다, 60 fps는 ≈ 16.7 ms마다 들어옵니다. 이 간격은 두 가지를 정합니다.

- **처리량 예산**: 가장 느린 stage가 frame 간격보다 길면 frame이 쌓이거나 버려집니다.
- **지연 예산**: sensor 노출부터 actuator 명령까지의 합입니다. Pipeline으로 처리량을 맞춰도 지연은 stage 시간의 합으로 남습니다.

### Cloud 경로에 더해지는 것 — 거리와 업로드

Cloud 경로는 이 합에 업로드, 서버까지의 왕복, 서버 대기열이 더해집니다. 이 중 거리에 묶인 부분은 공개된 측정값이 있습니다. Microsoft가 공개한 [Azure region 간 왕복 지연 통계](https://learn.microsoft.com/en-us/azure/networking/azure-network-latency)(2026-07-30까지 30일간의 P50, 2026-10-11 확인)에서 출발지가 Korea Central인 행을 30 fps 간격과 나란히 놓으면 다음과 같습니다.

| 목적지 region | P50 왕복 (Azure 공개값) | 30 fps 간격(33.3 ms) 대비 |
|---|---|---|
| Korea South | 8 ms | 0.24배 |
| Japan East | 30 ms | 0.9배 |
| West US | 130 ms | 3.9배 |
| East US | 185 ms | 5.6배 |

이 값은 Azure backbone 위 region 사이의 왕복이고, device에서 첫 region까지 가는 접속망 구간은 들어 있지 않습니다. 표가 보여 주는 것은 region 사이 거리만으로 쓰는 시간이고, West US·East US 행은 그 시간만으로 30 fps 간격을 네 배·여섯 배 가까이 넘습니다. 첫 질문의 경계로 보면 이 두 region은 업로드와 서버 처리를 0으로 쳐도 30 fps 제어에 실패하고, Korea South·Japan East는 남은 시간(25.3 ms·3.3 ms) 안에 업로드와 서버 처리가 들어가야 통과합니다.

업로드 시간은 산술로 나옵니다. 아래 대역폭 표의 1080p NV12 frame 하나는 3,110,400 B = 24,883,200 bit라, uplink 속도별 전송 시간은 다음과 같습니다(속도는 계산용 가정값입니다).

| uplink | 비압축 1080p frame 1장 전송 |
|---|---|
| 10 Mbit/s | 약 2.49 s |
| 100 Mbit/s | 약 249 ms |
| 1 Gbit/s | 약 24.9 ms |

1 Gbit/s uplink에서도 비압축 frame 한 장이 30 fps 간격의 75%를 씁니다. 그래서 cloud 경로는 인코더로 압축해 보내고, 그 인코더가 지연 예산 안의 stage 하나가 됩니다.

### 대역폭 — 비압축 영상은 금방 GB/s가 됩니다

V4L2 문서(docs.kernel.org, 7.3.0-rc6 판)의 [Semi-Planar YUV 표](https://docs.kernel.org/userspace-api/media/v4l/pixfmt-yuv-planar.html)에서 NV12는 성분당 8 bit, 4:2:0 subsampling이고, luma plane 뒤에 Cb·Cr을 번갈아 담은 chroma plane이 붙습니다. Chroma가 가로·세로 절반이라 픽셀당 평균 1.5 byte입니다.

| 조건 | 계산 | 결과 |
|---|---|---|
| 1080p NV12 1 frame | 1920 × 1080 × 1.5 B | 3,110,400 B |
| 카메라 1대, 60 fps | × 60 | 약 186.6 MB/s |
| 카메라 8대 | × 8 | 약 1.49 GB/s |

카메라 1대만 해도 약 186.6 MB/s ≈ 1.49 Gbit/s라, 둘째 질문의 경계로 보면 위 표의 어느 uplink도 비압축 원본을 실시간으로 보내지 못합니다. 추론을 device에서 하면 원본 전송과 인코더 stage가 경로에서 빠지고, 밖으로 나가는 것은 결과 크기만큼으로 줄어듭니다. 출입 카운터라면 시간대별 정수 몇 개입니다.

### Privacy — 무엇이 device 밖으로 나가는가

EU GDPR [제5조 1항 (c)](https://www.legislation.gov.uk/eur/2016/679/article/5/adopted)는 개인정보가 처리 목적에 "adequate, relevant and limited to what is necessary"여야 한다는 데이터 최소화 원칙을 두고, [제25조 2항](https://www.legislation.gov.uk/eur/2016/679/article/25/adopted)은 controller가 기본값으로 각 목적에 필요한 개인정보만 처리되도록 하라고 요구합니다(링크는 채택 당시 원문을 보여 주는 legislation.gov.uk 판). 출입 인원만 세면 되는 시스템이 원본 frame을 서버로 보내면, 목적에 필요한 것보다 많은 데이터를 처리하게 됩니다.

Edge 추론은 이 원칙을 *구조*로 지키는 방법입니다. 설계 검토에서는 device 밖으로 나가는 데이터를 경로별로 적어 봅니다.

| 경로 | 원본이 섞여 나가는 예 | 설계 선택 |
|---|---|---|
| 추론 결과 | 원본 대신 보내기로 한 결과에 crop 이미지가 붙음 | 결과 schema에 이미지 필드를 두지 않음 |
| 디버그 로그 | 오검출 분석용으로 저장한 frame | 기본 빌드에서 frame dump 비활성화, 필요하면 명시적 opt-in |
| 모델 개선용 수집 | 재학습 데이터로 올리는 원본 | 수집 경로를 추론 경로와 분리해 따로 승인 |
| 원격 진단 | 원격 뷰어 스트림 | 개발용 기능은 출하 빌드에서 제거 |

법적 판단은 이 글의 범위가 아닙니다. 이 글이 다루는 것은 표의 첫 두 줄을 코드와 빌드 설정으로 막는 방법이고, 결과 구조체와 frame dump 빌드 옵션, 출하 빌드 검사는 아래 코드 절의 "원본이 나갈 길을 빌드에서 막기"에 있습니다.

### 오프라인 — cloud는 보조 경로입니다

```python
result = cloud_api(image) if online else local_model(image)
```

이 구조에서 local 모델은 네트워크가 끊긴 동안에만 돕니다. 연결된 평소 운영에서는 local 경로가 한 번도 실행되지 않으므로, 그 경로의 결과와 지연은 운영 중에 확인되지 않은 채 끊긴 순간을 맞습니다. 제어에 쓰는 추론은 local을 기본 경로로 두고, cloud는 결과 업로드·재학습 데이터 수집처럼 늦어도 되는 일에만 씁니다.

추론을 local로 옮기면 끊긴 동안 남는 문제는 *결과*입니다. 출입 카운터는 끊긴 동안 센 인원을 버리면 집계가 틀리므로, 결과를 device에 쌓았다가 다시 연결되면 오래된 것부터 보냅니다(store-and-forward). 저장 공간이 차면 가장 오래된 결과를 버리지 않고 다음 결과에 *합쳐서*, 시간 해상도는 잃어도 합계는 지킵니다. 코드는 아래 "끊긴 동안의 결과 — store-and-forward"에 있습니다.

### 네 질문 다음에 볼 것 — 데이터량, 전력, 모델 갱신

네 질문으로 자리를 정한 뒤에도 세 가지가 설계를 바꿉니다.

- **데이터량.** 위 대역폭 표의 카메라 1대(1080p60 NV12, 약 186.6 MB/s)를 하루(86,400 s) 내내 비압축으로 올리면 약 16.1 TB입니다. Edge에서 추론하고 아래 코드 절의 24 B 결과 구조체를 1초에 하나씩 보낸다고 가정하면 하루 2,073,600 B, 약 2.07 MB입니다. 업로드 경로의 대역폭과 cloud 쪽 저장 용량은 이 차이로 정해집니다.
- **전력.** 아래 하드웨어 표에서 W 단위로 공개된 소비 전력은 Hailo-8L 가속기 칩의 typical 1.5 W부터 AGX Orin 64GB 모듈의 15 W - 60 W까지 걸쳐 있습니다. Raspberry Pi 5의 5 V/5 A는 전원 입력 규격이라 소비 전력이 아니고, Alif E7은 NPU 전력을 공개하지 않습니다. 전원 예산이 정해진 제품이면 이 값이 edge 안에서 쓸 수 있는 등급을 먼저 거릅니다.
- **모델 갱신.** Edge 모델은 device마다 들어 있어서, 모델을 바꾸는 일이 device 하나하나에 배포하는 일이 됩니다. Cloud로 모으는 결과에는 어느 모델이 낸 값인지 남겨야 갱신 전후를 나눠 볼 수 있습니다. 아래 결과 구조체에 `uint16_t model_ver`를 더해도 arm64에서 크기는 24 B 그대로입니다(셈은 "원본이 나갈 길을 빌드에서 막기"에 있습니다).

## 하드웨어 등급 — 공개 사양으로 본 범위

아래는 각 제조사가 공개한 값만 옮긴 표이고, 값은 2026-10-11에 아래 출처에서 확인했습니다. 출처에 값이 없는 칸은 `TBD`입니다. Jetson 계열 전체 라인업과 세대 비교는 [12-08 NVIDIA Jetson](/blog/embedded/modern-recipes/part12-08-jetson)에 있고, 여기서는 등급 사이의 거리만 봅니다.

| 예시 (등급) | 메모리 | 전력 (공식 표기) |
|---|---|---|
| Alif Ensemble E7 (microNPU를 넣은 MCU) | MRAM 최대 5.5 MB, SRAM 최대 13.5 MB | NPU 값 TBD |
| Raspberry Pi 5 (SBC) | 1·2·4·8·16 GB LPDDR4X-4267 | 입력 5 V/5 A |
| Raspberry Pi AI HAT+ (SBC + 가속기) | 외부 메모리 불필요 (Hailo 표기) | 칩 typical 2.5 W / 1.5 W |
| Jetson Orin Nano 8GB, Super (edge GPU) | 8 GB 128-bit LPDDR5, 102 GB/s | 7 W - 15 W - 25 W |
| Jetson AGX Orin 64GB (server급 edge) | 64 GB 256-bit LPDDR5, 204.8 GB/s | 15 W - 60 W |

- Alif 페이지의 전력값은 STOP 모드 1.7 µA와 고효율 Cortex-M55 동적 전류 27 µA/MHz이고, NPU 값이 아닙니다.
- Raspberry Pi 5의 값은 USB-C Power Delivery 전원 입력 규격입니다.
- AI HAT+의 전력은 가속기 칩 값이고(Hailo-8 2.5 W, Hailo-8L 1.5 W), HAT 보드 전체 값은 TBD입니다.
- Ethos-U55는 칩이 아니라 IP라 메모리·전력 행을 두지 않았습니다. E7 행이 그 IP 두 개를 넣은 칩입니다.

| 예시 | 공개된 연산 성능 |
|---|---|
| Ethos-U55 (IP) | 32·64·128·256 MAC/cycle 구성 |
| Alif E7 | Ethos-U55 두 개: 256 MAC/cycle 최대 204 GOPS, 128 MAC/cycle 최대 46 GOPS |
| Raspberry Pi 5 | Cortex-A76 4코어 2.4 GHz |
| AI HAT+ | 26 TOPS (Hailo-8) / 13 TOPS (Hailo-8L) |
| Orin Nano 8GB (Super) | 67 TOPS sparse INT8, GPU dense INT8 33 TOPS |
| AGX Orin 64GB | 275 TOPS sparse INT8 |

출처는 다음과 같습니다.

- Ethos-U55: MAC/cycle 구성은 Arm의 오프라인 컴파일러 Vela 5.2.0 태그의 [`architecture_features.py`](https://gitlab.arm.com/artificial-intelligence/ethos-u/ethos-u-vela/-/blob/5.2.0/ethosu/vela/architecture_features.py)에 있는 `ethos-u55-32`~`ethos-u55-256` 설정(`macs` 필드)입니다.
- Alif E7: [Ensemble E7 제품 페이지](https://alifsemi.com/ensemble-e7-series/). 페이지에 판 표기가 없어 확인 날짜만 남깁니다.
- Raspberry Pi: [Raspberry Pi 5 product brief](https://datasheets.raspberrypi.com/rpi5/raspberry-pi-5-product-brief.pdf)(2026년 10월판), [AI HAT+ product brief](https://datasheets.raspberrypi.com/ai-hat-plus/raspberry-pi-ai-hat-plus-product-brief.pdf)(2024년 10월판). 가속기 칩의 메모리·전력은 Hailo의 [Hailo-8](https://hailo.ai/files/hailo-8-product-brief-en/)·[Hailo-8L](https://hailo.ai/files/hailo-8l-product-brief-en/) product brief이고, 두 문서에는 판 표기가 없어 확인 날짜만 남깁니다.
- Jetson: NVIDIA [Jetson Orin 제품 페이지](https://www.nvidia.com/en-us/autonomous-machines/embedded-systems/jetson-orin/)의 모듈 비교 표. 페이지에 판 표기가 없어 확인 날짜만 남깁니다.

### MAC 수를 TOPS로 바꾸는 계산

MAC 한 번을 곱셈·덧셈 두 연산으로 세면 최대 연산량은 `2 × MAC/cycle × clock`입니다. MAC/cycle만으로는 이 값이 정해지지 않고, clock은 NPU를 넣은 칩이 정합니다.

Alif E7 페이지는 두 NPU의 GOPS를 공개하고, NPU clock은 적지 않습니다. 같은 페이지에 적힌 core clock은 고성능 Cortex-M55 최대 400 MHz, 고효율 Cortex-M55 최대 160 MHz이고, 어느 NPU가 어느 core 쪽에 붙는지는 적혀 있지 않습니다. 공개 GOPS에서 식이 요구하는 clock(`GOPS ÷ (2 × MAC/cycle)`)을 거꾸로 구하면 다음과 같습니다.

| E7의 NPU | 공개 GOPS | 식이 요구하는 clock |
|---|---|---|
| 256 MAC/cycle | 204 | 약 398 MHz |
| 128 MAC/cycle | 46 | 약 180 MHz |

페이지의 core clock을 그대로 넣으면 2 × 256 × 400 MHz = 204.8 GOPS, 2 × 128 × 160 MHz = 40.96 GOPS입니다.

256 MAC NPU의 공개값은 400 MHz에서 모든 MAC이 매 cycle 일하는 값과 맞습니다. 128 MAC NPU의 46 GOPS는 페이지에 적힌 어느 core clock으로도 이 식에서 나오지 않고, 페이지만으로는 그 NPU의 clock이 얼마인지 알 수 없습니다. 확실한 것은 MAC 수 차이가 2배인데 공개 성능 차이는 204 ÷ 46 ≈ 4.4배라는 것입니다. 같은 IP를 MAC 수만 보고 비교하면 이 차이를 놓칩니다.

같은 단위로 놓으면 204 GOPS = 0.204 TOPS입니다. Alif 페이지에는 sparse·dense 표기가 없습니다. 이 글은 204가 위 식으로 400 MHz에서 모든 MAC이 매 cycle 일하는 값과 맞는다는 점에서 dense 값으로 *추정*하고 비교합니다. 그 추정으로 Orin Nano 8GB(Super)의 GPU dense INT8 33 TOPS와 견주면 33 ÷ 0.204 ≈ 162배입니다. MCU 등급은 "더 느린 Jetson"이 아니라, 모델 크기와 입력 크기를 그 범위에 맞춰 줄여야 하는 다른 등급입니다.

### Sparse·dense 칸을 같은 기준으로 맞추기

NVIDIA 표에서 AGX Orin 64GB의 275 TOPS는 GPU Tensor Core 170 TOPS와 DLA 105 TOPS(둘 다 sparse INT8)를 더한 값이고, 같은 표에 GPU dense INT8은 85 TOPS, DLA dense INT8은 52.5 TOPS로 따로 적혀 있습니다. Orin Nano 8GB(Super)는 DLA 칸이 `~`라 67 TOPS가 전부 GPU 몫이고, dense INT8은 33 TOPS입니다. [TensorRT 문서](https://docs.nvidia.com/deeplearning/tensorrt/latest/inference-library/data-formats-tensors.html)(2026-10-11 확인 시 TensorRT 11.4.0 판)에 따르면 structured sparsity로 성능을 얻으려면 가중치가 네 개짜리 vector마다 0을 두 개 이상 가져야 하고, builder config에 `kSPARSE_WEIGHTS` flag를 켜야 합니다. 그 조건을 맞추지 않은 모델은 dense 칸끼리 비교합니다.

## 프레임워크 선택

| 등급 | 런타임 | 근거 (아래 목록) |
|---|---|---|
| MCU + Ethos-U | TFLite Micro + Vela | TFLM `kernels/ethos_u` README |
| MCU (NPU 없음) | TFLite Micro + CMSIS-NN | TFLM `kernels/cmsis_nn` |
| SBC·Mobile | ONNX Runtime | ORT EP 요약 표 |
| Jetson | TensorRT, 또는 ONNX Runtime의 TensorRT·CUDA EP | JetPack SDK 페이지 |

- **TFLM `kernels/ethos_u`.** TFLM 저장소(커밋 `230c9d9`)의 [README](https://github.com/tensorflow/tflite-micro/tree/230c9d9531bd9b08d445b4f2ed0760756ffd5f78/tensorflow/lite/micro/kernels/ethos_u)에 따르면 Vela가 모델에 Ethos-U custom op를 넣고, TFLM 런타임은 그 op를 만나면 작업을 Ethos-U로 넘깁니다. 같은 README는 Ethos-U를 면적이 제한된 embedded·IoT 기기용 microNPU로 소개합니다.
- **TFLM `kernels/cmsis_nn`.** 같은 커밋에 [`kernels/cmsis_nn`](https://github.com/tensorflow/tflite-micro/tree/230c9d9531bd9b08d445b4f2ed0760756ffd5f78/tensorflow/lite/micro/kernels/cmsis_nn) kernel 디렉터리가 있습니다.
- **ORT EP 요약 표.** [EP 요약 표](https://onnxruntime.ai/docs/execution-providers/)의 IoT/Edge/Mobile 열에는 Intel OpenVINO, Arm Compute Library (preview), Android Neural Networks API, Arm NN (preview), CoreML (preview), XNNPACK이 있습니다. 표에는 판 표기가 없어, 확인한 2026-10-11 당시 최신 릴리스 [v1.31.0](https://github.com/microsoft/onnxruntime/releases/tag/v1.31.0)을 적어 둡니다.
- **JetPack SDK 페이지.** [JetPack SDK 페이지](https://developer.nvidia.com/embedded/jetpack)(판 표기 없음, 2026-10-11 확인)는 JetPack 7이 Jetson Orin과 Thor 플랫폼을 지원한다고 적고, AI compute stack에 CUDA·cuDNN·TensorRT를 둡니다.

ONNX Runtime 문서는 EP 구조가 하드웨어별 라이브러리를 감싸, 같은 ONNX 모델을 cloud와 edge의 여러 환경에 배포할 수 있게 한다고 설명합니다. 같은 문서에 따르면 EP 목록은 우선순위 순서이고, 앞 EP가 실행할 수 없는 node는 다음 EP로 넘어갑니다(`['CUDAExecutionProvider', 'CPUExecutionProvider']`면 CUDA가 못 하는 node는 CPU). [TensorRT EP 문서](https://onnxruntime.ai/docs/execution-providers/TensorRT-ExecutionProvider.html)도 TensorRT가 지원하지 않는 operator가 있으면 graph를 나눠 지원되는 subgraph만 TensorRT로 보내고, `trt_min_subgraph_size`보다 작은 subgraph는 다른 EP로 넘긴다고 적습니다. 그래서 TensorRT EP 뒤에 CUDA EP를 함께 등록하라고 권합니다.

이 구조에서 생기는 장단점은 다음과 같습니다.

- **장점.** 같은 모델을 여러 등급에 배포해야 하면 ONNX Runtime으로 시작해 등급마다 EP 목록을 바꿔 끼웁니다. 지원되지 않는 operator가 있어도 세션은 돕니다.
- **실패 모양.** 세션이 돈다고 해서 가속기가 모델 전체를 받았다는 뜻은 아닙니다. 위 fallback 동작 때문에, 일부 node가 CPU EP로 넘어가도 세션은 그대로 만들어지고 돕니다. 그래서 EP 목록을 바꿀 때마다 [12-01b](/blog/embedded/modern-recipes/part12-01b-edge-pipeline-measurement)의 방법으로 stage 시간을 다시 잽니다. TensorRT EP의 `trt_dump_subgraphs` 옵션을 켜면 TensorRT engine으로 바뀐 subgraph가 ONNX 형식으로 파일 시스템에 저장되므로, 무엇이 넘어갔는지 볼 수 있습니다.

그래서 이 글은 다음 순서를 권합니다. 먼저 ONNX Runtime과 EP로 여러 등급을 맞추고, 한 플랫폼에서 TensorRT EP가 받은 부분만으로 예산을 맞추지 못할 때 vendor 런타임을 직접 쓰는 쪽으로 옮깁니다. EP별 이름과 설정, 각 런타임의 코드는 [12-04 TensorRT](/blog/embedded/modern-recipes/part12-04-tensorrt), [12-05 TFLite Micro](/blog/embedded/modern-recipes/part12-05-tflite-micro), [12-06 ONNX Runtime](/blog/embedded/modern-recipes/part12-06-onnx-runtime)에 있습니다.

## 코드 / 실제 사용 예

이 절의 코드는 앞의 privacy 표 첫 두 줄과 오프라인 절의 결과 보관을 옮긴 것입니다.

### 원본이 나갈 길을 빌드에서 막기

앞의 privacy 표에서 첫 두 줄(추론 결과, 디버그 로그)을 코드로 옮긴 예입니다. 출입 카운터가 device 밖으로 보내는 것은 결과 구조체 하나이고, 그 구조체에는 픽셀을 담을 필드가 없습니다. Frame을 파일로 남기는 코드는 `FRAME_DUMP`를 정의한 빌드에만 들어갑니다.

```c
#include <stdint.h>
#include <stdio.h>

/* The only thing that leaves the device. No pixel field exists. */
typedef struct {
    uint32_t seq;
    uint64_t t_ns;
    uint16_t count_in;
    uint16_t count_out;
} count_result_t;

_Static_assert(sizeof(count_result_t) <= 24, "result grew: check for image data");

#ifdef FRAME_DUMP                       /* debug builds only */
void frame_dump(const uint8_t *nv12, uint32_t seq) {
    char path[64];
    snprintf(path, sizeof path, "frame_%06u.nv12", (unsigned)seq);
    FILE *fp = fopen(path, "wb");
    if (fp) { fwrite(nv12, 1, 1920 * 1080 * 3 / 2, fp); fclose(fp); }
}
#define FRAME_DUMP_HOOK(p, s) frame_dump((p), (s))
#else
#define FRAME_DUMP_HOOK(p, s) ((void)(p), (void)(s))
#endif

void on_frame(const uint8_t *nv12, uint32_t seq, count_result_t *out) {
    FRAME_DUMP_HOOK(nv12, seq);
    out->seq = seq;                     /* detector and line counter go here */
}
```

24 byte는 이 구조체가 arm64에서 차지하는 크기이고, [AAPCS64](https://github.com/ARM-software/abi-aa/blob/2025Q4/aapcs64/aapcs64.rst)(2025Q4 릴리스) 규칙으로 셉니다. 이 ABI에서 word·half-word·double-word의 정렬은 각각 4·2·8 byte이고, aggregate의 정렬은 가장 크게 정렬된 member를 따르며, 크기는 모든 member를 담는 그 정렬의 최소 배수입니다. `seq`가 0~3, padding 뒤 `t_ns`가 8~15, 두 `uint16_t`가 16~19를 차지해 20 byte가 되고, 정렬 8의 배수로 올려 24 byte입니다.

같은 규칙으로 `_Static_assert`가 무엇을 잡는지도 셉니다. `uint8_t thumb[16]` 같은 썸네일 필드를 붙이면 20 + 16 = 36 byte를 8의 배수로 올려 40 byte가 되어 빌드가 멈춥니다. 반면 `uint16_t` 하나를 더하면 22 byte가 되어 올림한 크기는 24 byte 그대로라 통과합니다. 그래서 이 assert는 schema 검토를 대신하지 않고, 이미지처럼 큰 필드가 슬쩍 붙는 경우만 잡습니다. 두 빌드를 만들고 symbol을 비교합니다.

```bash
clang -std=c11 -O2 -Wall -Wextra -Wpedantic -c result.c -o release.o
clang -std=c11 -O2 -Wall -Wextra -Wpedantic -DFRAME_DUMP -c result.c -o debug.o
nm release.o
nm debug.o
```

출하 빌드(`release.o`)의 symbol 목록에 `frame_dump`나 `fopen`·`fwrite`가 있으면 frame dump 코드가 들어간 것입니다. 이 차이를 사람이 매번 보지 않도록, 출하 산출물에 대고 도는 검사를 하나 둡니다.

```sh
#!/bin/sh
# usage: check.sh <release object or binary>
if nm "$1" | grep -q 'frame_dump' || strings "$1" | grep -q '\.nv12'; then
    echo "FAIL: frame dump code in $1"; exit 1
fi
echo "OK: no frame dump in $1"
```

이 검사는 `frame_dump` symbol이나 `.nv12` 파일 이름 문자열이 있으면 exit 1로 실패하고, 없으면 exit 0으로 통과합니다. 출하 빌드의 CI 단계에 넣으면, frame dump 옵션이 켜진 채 출하되는 경우 빌드가 실패합니다. 표의 나머지 두 줄(수집 경로 승인, 원격 뷰어 제거)은 코드보다 운영 절차에 속하므로 여기서 다루지 않습니다.

### 끊긴 동안의 결과 — store-and-forward

앞의 오프라인 절에서 말한 대로, 출입 카운터는 끊긴 동안의 결과를 device에 쌓았다가 다시 연결되면 오래된 것부터 보냅니다. 아래 코드는 위 `count_result_t`를 고리 버퍼에 쌓습니다. 버퍼가 차면 가장 오래된 항목을 버리지 않고 그다음 항목에 인원수를 더한 뒤 지웁니다. 동작이 보이도록 버퍼 크기를 4로 작게 두고, seq 3~8 동안 연결이 끊긴 상황을 흉내 냅니다.

```c
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>

typedef struct {
    uint32_t seq;
    uint64_t t_ns;
    uint16_t count_in;
    uint16_t count_out;
} count_result_t;

enum { QCAP = 4 };                      /* small on purpose, to force folding */
static count_result_t q[QCAP];
static int q_head, q_len, folded;

static uint16_t add_sat(uint16_t a, uint16_t b) {
    return (uint16_t)(a + b > UINT16_MAX ? UINT16_MAX : a + b);
}

/* Full queue: fold the oldest entry into the next one instead of dropping it.
   Time resolution is lost, totals are kept. */
static void sf_push(const count_result_t *r) {
    if (q_len == QCAP) {
        count_result_t *a = &q[q_head], *b = &q[(q_head + 1) % QCAP];
        b->count_in  = add_sat(b->count_in,  a->count_in);
        b->count_out = add_sat(b->count_out, a->count_out);
        q_head = (q_head + 1) % QCAP;
        q_len--;
        folded++;
    }
    q[(q_head + q_len) % QCAP] = *r;
    q_len++;
}

static unsigned sent_in, sent_out;
static bool uplink_send(const count_result_t *r) {     /* stand-in for the real uplink */
    printf("  send seq %2u  in %2u out %2u\n", (unsigned)r->seq,
           (unsigned)r->count_in, (unsigned)r->count_out);
    sent_in += r->count_in;
    sent_out += r->count_out;
    return true;
}

static void sf_flush(void) {            /* oldest first; stop at the first failure */
    while (q_len > 0 && uplink_send(&q[q_head])) {
        q_head = (q_head + 1) % QCAP;
        q_len--;
    }
}

int main(void) {
    unsigned made_in = 0, made_out = 0;
    for (uint32_t seq = 1; seq <= 10; seq++) {
        bool online = seq < 3 || seq > 8;   /* link down for seq 3..8 */
        count_result_t r = { seq, seq * 1000000000ull,
                             (uint16_t)(seq % 3 + 1), (uint16_t)1 };
        made_in += r.count_in;
        made_out += r.count_out;
        sf_push(&r);
        if (online) sf_flush();
        else printf("  offline, queued %d\n", q_len);
    }
    printf("produced in %u out %u / sent in %u out %u / folded %d\n",
           made_in, made_out, sent_in, sent_out, folded);
    return 0;
}
```

`main`의 마지막 줄은 만든 인원수(`produced`), 보낸 인원수(`sent`), 합친 횟수(`folded`)를 찍습니다. `folded`가 0보다 크면서 `produced`와 `sent`의 두 합계가 같으면, 버퍼가 넘쳐도 인원수를 잃지 않았다는 뜻입니다. 받는 쪽은 seq가 건너뛴 것을 보고, 건너뛴 뒤의 첫 항목이 그 구간의 합이라는 것을 압니다. 한계는 두 가지입니다.

- 이 고리 버퍼는 RAM에 있어서, 끊긴 동안 전원이 꺼지면 쌓인 결과가 사라집니다. 전원 차단까지 견뎌야 하면 비휘발성 저장소에 둡니다.
- 합친 값이 `uint16_t`를 넘으면 `add_sat`가 65,535에서 멈추므로, 그 뒤로는 합계도 정확하지 않습니다. 오래 끊길 수 있는 설치 환경이면 필드 폭과 버퍼 크기를 그 기간에 맞춰 정합니다.

## 자주 보는 함정

> 공개 성능 수치를 기준을 맞추지 않고 비교함

AGX Orin의 275 TOPS는 sparse이고 GPU·DLA 합이며, dense GPU 칸은 85 TOPS입니다. Ethos-U55는 MAC 수만 공개되고 clock은 칩이 정합니다. Sparse·dense, GPU·DLA 합산, MAC × clock을 같은 기준으로 맞춘 뒤에야 등급 사이의 거리가 나옵니다. 기준을 맞춘 숫자는 위 "MAC 수를 TOPS로 바꾸는 계산"에 있습니다.

> 디버그용 frame 저장이 출하 빌드에 남음

추론 결과에서 이미지를 빼도, 오검출 분석용으로 넣은 frame 저장 코드가 출하 빌드에 남으면 원본이 device 저장소에 쌓이고, 로그를 수집하는 경로가 그 파일까지 가져가면 원본이 밖으로 나갑니다. 위 "원본이 나갈 길을 빌드에서 막기"처럼 frame dump를 컴파일 시점 옵션으로 묶고, 출하 산출물에 `frame_dump` symbol이 없는지를 CI에서 검사합니다.

## 정리

- 추론을 어디서 할지는 *추론 하나 단위*로, frame 간격·데이터 크기·privacy·오프라인 네 질문으로 정합니다. 출입 카운터는 검출을 edge에, 집계를 cloud에 둡니다. 그다음 데이터량(비압축 카메라 1대 하루 약 16.1 TB 대 결과 약 2.07 MB), 전력, 모델 갱신 경로를 봅니다.
- 첫 두 질문은 숫자로 가릅니다. 30 fps는 33.3 ms, 60 fps는 16.7 ms가 처리량 예산이고, Azure 공개값으로 Korea Central에서 West US region까지 P50 왕복만 130 ms라 이 거리 하나가 30 fps 간격 약 3.9개입니다. 1080p60 NV12 카메라 1대는 비압축으로 약 1.49 Gbit/s, 8대는 약 1.49 GB/s이고, 비압축 1080p frame 한 장은 1 Gbit/s uplink에서도 약 24.9 ms가 걸립니다.
- 끊긴 동안의 결과는 store-and-forward로 쌓고, 버퍼가 차면 버리지 말고 합쳐서 합계를 지킵니다.
- GDPR 데이터 최소화(제5조 1항 (c))와 기본값에 의한 보호(제25조 2항)는 원본을 밖으로 내보내지 않는 edge 구조와 맞닿아 있습니다. 코드에서는 결과 구조체에 픽셀 필드를 두지 않고, frame dump를 `FRAME_DUMP` 빌드에만 넣고, 출하 산출물에 `frame_dump` symbol이 없는지를 검사합니다.
- 공개 성능은 sparse·dense와 MAC × clock을 맞춰 읽습니다. Alif E7의 256 MAC Ethos-U55 204 GOPS는 400 MHz에서 모든 MAC이 일하는 값과 맞아서, 이 글은 dense 값으로 추정했습니다(Alif는 sparse·dense를 표기하지 않음). 그 추정으로 Orin Nano 8GB의 dense GPU 33 TOPS와 약 162배 차이입니다. 128 MAC NPU의 46 GOPS는 페이지에 적힌 core clock으로는 같은 식에서 나오지 않습니다.
- ONNX Runtime은 EP가 못 하는 node를 다음 EP로 넘기므로, EP 목록을 바꿀 때마다 stage 시간을 다시 잽니다.

### 수정 이력

- 2026-10-11: 하드웨어 표·EP 목록·TensorRT sparsity 조건을 각 1차 자료와 다시 대조하고 확인 날짜를 붙였습니다. ONNX Runtime IoT/Edge/Mobile 열에 Qualcomm QNN이 있다고 적었던 것을 바로잡았습니다(QNN은 GPU 열에 있습니다). Pipeline buffer 수를 상태 나열로 다시 셌습니다(이전 판의 "6개 이상"을 5개로 정정). 128 MAC NPU를 약 180 MHz로 돈다고 적었던 역산을, 페이지의 core clock과 나란히 놓고 46 GOPS가 식과 맞지 않는다는 서술로 바꿨습니다. Alif 값을 dense로 본 것이 추정임을 밝히고, 배율을 162배로 고쳤습니다. 결과 구조체·`FRAME_DUMP`·출하 빌드 검사와 store-and-forward 예제를 더했습니다.
- 2026-10-11 (2차): 개발용 노트북에서 실행한 출력과 그 환경 표를 모두 지우고, 처리량·지연은 코드의 설계값과 구조로 셈한 값으로 바꿨습니다. 같은 이유로 NEON 정규화 비교 절을 지웠습니다(SIMD는 [8-07 SIMD](/blog/embedded/modern-recipes/part8-07-simd)가 다룹니다). 다시 열어 보지 못한 Ethos-U55 TRM 기반 서술(AXI manager 구성, clock 입력)을 지웠습니다. 결과 구조체 크기를 AAPCS64 규칙으로 셈했습니다. Raspberry Pi·Hailo 출처를 product brief로 바꾸고(Raspberry Pi 두 문서는 발행 월을 표기합니다), Vela·TFLM 링크를 태그·커밋에 고정했습니다.
- 2026-10-11 (3차): stage latency 측정, 3-stage pipeline 코드, 처리량·지연 셈, buffer 수 절을 다음 편 [12-01b Edge 추론 Pipeline 측정](/blog/embedded/modern-recipes/part12-01b-edge-pipeline-measurement)으로 옮겼습니다. 이 글은 추론을 어디서 할지를 정하는 내용만 남깁니다.

다음 편은 **[Edge 추론 Pipeline 측정 — Stage Latency·Mailbox 정책·Buffer 수](/blog/embedded/modern-recipes/part12-01b-edge-pipeline-measurement)**입니다.

## 관련 항목

- [12-01b: Edge 추론 Pipeline 측정](/blog/embedded/modern-recipes/part12-01b-edge-pipeline-measurement) — 고른 edge 경로가 frame 예산을 맞추는지 재는 법
- [12-02: NPU 아키텍처](/blog/embedded/modern-recipes/part12-02-npu-architecture)
- [12-03: Quantization](/blog/embedded/modern-recipes/part12-03-quantization)
- [12-04: TensorRT](/blog/embedded/modern-recipes/part12-04-tensorrt)
- [12-05: TFLite Micro](/blog/embedded/modern-recipes/part12-05-tflite-micro)
- [12-06: ONNX Runtime](/blog/embedded/modern-recipes/part12-06-onnx-runtime)
- [12-08: NVIDIA Jetson](/blog/embedded/modern-recipes/part12-08-jetson)
- [12-10: 온디바이스 LLM](/blog/embedded/modern-recipes/part12-10-on-device-llm)
