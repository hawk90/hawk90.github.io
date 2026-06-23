---
title: "Edge Inference 분석 — Cloud vs Edge·Latency·Privacy"
date: 2026-04-21T09:00:00
description: "Edge inference가 cloud 대비 언제 답인지, MCU부터 server-class edge까지 하드웨어 스펙트럼과 프레임워크 선택, 3-stage pipeline 설계를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 137
tags: [recipes, edge-ai, inference, pipeline, tflite, onnx]
---

## 한 줄 요약

> **"Edge inference는 latency·privacy·cost 셋이 모이는 지점입니다."** Cloud가 더 강한 모델을 돌릴 수 있어도, 30 ms 안에 응답해야 하거나 카메라 raw frame을 밖으로 못 내보낼 때는 edge 외에 답이 없습니다.

## 어떤 상황에서 쓰나

자율주행 vision, factory defect detection, drone obstacle avoidance, 음성 wake-word, 산업용 anomaly detection이 대표 무대입니다. 공통점은 셋입니다.

첫째, latency budget이 짧습니다. 자동차는 frame 한 장이 33 ms, drone 회피는 50 ms, factory 컨베이어 분류는 10 ms 단위입니다. Cloud round-trip은 100 ms 이상이 보통이라 *물리적으로* 불가능합니다.

둘째, 데이터가 raw + 대용량입니다. 1080p × 60 fps × 8-camera = 1 GB/s 수준이라 cloud로 보내는 비용·대역폭이 비현실적입니다. 셋째, privacy가 강제됩니다. 의료·국방·가정용 카메라는 raw frame이 device 밖으로 나가면 안 됩니다.

반대로 cloud가 답인 경우도 분명합니다. 대형 LLM 학습·serving, batch inference, model A/B test, low-frequency analytics는 cloud의 규모 경제가 압도적입니다. *모든 추론을 edge로* 미는 것이 답이 아니라, *어떤 추론을 edge로 옮길지* 결정하는 것이 설계의 시작입니다.

## 핵심 개념

Edge AI 디바이스는 자원 폭이 매우 넓습니다.

| Class | 예시 | 메모리 | Compute | 전력 |
|---|---|---|---|---|
| MCU | Cortex-M55+Ethos-U55 | 256 KB | 0.5 TOPS INT8 | 0.1 W |
| SBC | Raspberry Pi 5 | 8 GB | ~0.5 TFLOPS CPU | 5 W |
| Mobile SoC | Snapdragon X Elite | 16 GB | 45 TOPS NPU | 15 W |
| Edge GPU | Jetson Orin Nano | 8 GB | 40 TOPS | 15 W |
| Server edge | Jetson AGX Orin | 64 GB | 275 TOPS | 60 W |

전력 6배, compute 500배 차이입니다. 같은 model이 MCU에서 ms·SBC에서 100 ms·Orin에서 1 ms 단위로 나옵니다.

프레임워크 선택도 자원에 따라 달라집니다.

| 자원 등급 | 프레임워크 |
|-----------|-----------|
| MCU | TFLite Micro, CMSIS-NN, Ethos-U Vela |
| Mobile/SBC | TFLite (full), ONNX Runtime, NNAPI, Core ML |
| Edge GPU | TensorRT, ONNX Runtime CUDA, OpenVINO |
| Server edge | TensorRT, vLLM, TGI |

ONNX Runtime은 거의 모든 plat에 backend가 있어 *처음 portability가 필요할 때* 좋은 선택입니다. 성능을 끝까지 짜내려면 vendor SDK(TensorRT, Core ML, QNN)로 내려갑니다.

Edge inference는 거의 항상 *세 stage pipeline*으로 구성됩니다.

```text
Sensor → Preprocess → Inference → Postprocess → Action
            5-20%      60-80%       5-15%
```

Inference만 빠르게 하면 안 됩니다. Preprocess가 CPU에서 막히면 GPU·NPU가 idle하고, postprocess가 scalar로 돌면 detection 결과가 늦게 나옵니다. 셋을 *함께* 최적화해야 throughput이 올라옵니다.

## 코드 / 실제 사용 예

### NEON으로 preprocess 가속

```c
#include <arm_neon.h>

/* uint8 RGB → normalized float, 16 픽셀씩 */
void preprocess_neon(const uint8_t *rgb, float *out, int n_px) {
    float32x4_t scale = vdupq_n_f32(1.0f / 255.0f);
    int i = 0;
    for (; i + 16 <= n_px; i += 16) {
        uint8x16_t v8  = vld1q_u8(&rgb[i]);
        uint16x8_t lo  = vmovl_u8(vget_low_u8(v8));
        uint16x8_t hi  = vmovl_u8(vget_high_u8(v8));

        float32x4_t f0 = vcvtq_f32_u32(vmovl_u16(vget_low_u16(lo)));
        float32x4_t f1 = vcvtq_f32_u32(vmovl_u16(vget_high_u16(lo)));
        float32x4_t f2 = vcvtq_f32_u32(vmovl_u16(vget_low_u16(hi)));
        float32x4_t f3 = vcvtq_f32_u32(vmovl_u16(vget_high_u16(hi)));

        vst1q_f32(&out[i +  0], vmulq_f32(f0, scale));
        vst1q_f32(&out[i +  4], vmulq_f32(f1, scale));
        vst1q_f32(&out[i +  8], vmulq_f32(f2, scale));
        vst1q_f32(&out[i + 12], vmulq_f32(f3, scale));
    }
    for (; i < n_px; i++) out[i] = rgb[i] / 255.0f;
}
```

Scalar 대비 8~12배 빠릅니다. Preprocess가 inference보다 길어지는 사고를 막는 가장 기본 패턴입니다.

### TFLite Micro — MCU edge

```c
#include "tensorflow/lite/micro/micro_interpreter.h"

constexpr int kArenaSize = 64 * 1024;
static uint8_t tensor_arena[kArenaSize];

void run_kws(void) {
    const tflite::Model *model = tflite::GetModel(g_model_data);
    static tflite::MicroMutableOpResolver<6> resolver;
    resolver.AddConv2D();
    resolver.AddDepthwiseConv2D();
    resolver.AddFullyConnected();
    resolver.AddSoftmax();
    resolver.AddReshape();
    resolver.AddQuantize();

    static tflite::MicroInterpreter interp(
        model, resolver, tensor_arena, kArenaSize);
    interp.AllocateTensors();

    TfLiteTensor *in = interp.input(0);
    memcpy(in->data.int8, mfcc_buf, in->bytes);
    interp.Invoke();

    TfLiteTensor *out = interp.output(0);
    int max_idx = argmax_int8(out->data.int8, out->bytes);
    if (out->data.int8[max_idx] > kThreshold) trigger(max_idx);
}
```

Cortex-M55 + Helium MVE에서 keyword spotting이 1~2 ms 안에 끝납니다. Always-on detection의 표준 구성입니다.

### ONNX Runtime — portable backend

```cpp
#include <onnxruntime_cxx_api.h>

Ort::Env env(ORT_LOGGING_LEVEL_WARNING, "edge");
Ort::SessionOptions opts;

#ifdef USE_CUDA
opts.AppendExecutionProvider_CUDA({});
#elif defined(USE_TENSORRT)
opts.AppendExecutionProvider_TensorRT({});
#elif defined(USE_NNAPI)
opts.AppendExecutionProvider_Nnapi(0);
#endif

Ort::Session session(env, "model.onnx", opts);

std::array<int64_t, 4> shape{1, 3, 224, 224};
auto input_tensor = Ort::Value::CreateTensor<float>(
    mem_info, input.data(), input.size(), shape.data(), shape.size());

auto outputs = session.Run(Ort::RunOptions{nullptr},
                            input_names, &input_tensor, 1,
                            output_names, 1);
```

같은 코드가 CUDA·TensorRT·NNAPI·Core ML·DirectML 어디서든 돌아갑니다. Vendor lock-in을 미루고 싶을 때 유용합니다.

### 3-stage pipeline parallelism

```c
typedef struct { uint8_t *raw; float *pre; box_t *det; } frame_t;

void pipeline_worker(frame_t *frames, int n) {
    int prep = 0, inf = 1, post = 2;
    while (1) {
        parallel_3({
            preprocess_neon(frames[prep].raw, frames[prep].pre, ...);
            inference(frames[inf].pre, frames[inf].det);
            postprocess_nms(frames[post].det);
        });
        int t = post; post = inf; inf = prep; prep = t;
    }
}
```

세 stage가 *동시에* 다른 frame을 처리하면 throughput은 가장 느린 stage에 수렴합니다. 한 stage 30 ms × 3 = 90 ms 직렬에서 30 ms 단위 frame 출력으로 바뀝니다.

## 측정 / 성능 비교

같은 YOLOv8n model을 클래스별로 돌렸을 때 대략적인 latency입니다.

| Hardware | Precision | Latency | Power | 원격 가능? |
|----------|-----------|---------|-------|-----------|
| Cortex-M55 + Ethos-U55 | INT8 | 50 ms (224) | 0.1 W | × |
| Pi 5 CPU | FP16 | 180 ms | 3 W | × |
| Pi 5 + Hailo-8 NPU | INT8 | 10 ms | 4 W | × |
| Jetson Orin Nano GPU | FP16 | 15 ms | 7 W | × |
| Jetson AGX Orin GPU+DLA | INT8 | 3 ms | 40 W | × |
| Cloud T4 GPU | FP16 | 8 ms + 80 ms RTT | — | ◯ |

Cloud는 inference 자체는 빠르지만 RTT가 더해져 *체감 latency*가 가장 큽니다. Edge가 답인 이유의 핵심입니다.

전력당 throughput으로 보면 더 분명합니다.

| Hardware | fps/W |
|----------|-------|
| Ethos-U55 | 500 |
| Hailo-8 | 250 |
| Orin Nano | 9 |
| AGX Orin | 8 |
| T4 (cloud) | 1.5 |

전력 효율은 *전용 NPU·DLA*가 압도적입니다. Battery·passive cooling 환경에서는 NPU 선택이 거의 강제됩니다.

## 자주 보는 함정

> Inference만 측정하고 끝

```c
auto t0 = now(); inference(); auto t1 = now();   /* 8 ms */
/* 실제 카메라 → 화면은 80 ms */
```

Preprocess·copy·display까지 포함한 end-to-end가 진짜 latency입니다. 항상 sensor부터 action까지 측정합니다.

> Cloud fallback 가정

```python
result = cloud_api(image) if online else local_model(image)
```

자동차·factory는 연결이 끊긴 채로 동작해야 합니다. *cloud는 보조*, edge가 primary로 설계합니다.

> Model 한 개로 모든 device

```text
서버에서 학습한 ResNet-50을 그대로 Pi에 → OOM
```

Device-tier별 model variant(`nano`/`small`/`medium`)를 따로 두고 deploy합니다.

> Preprocess CPU·inference GPU 비대칭

```c
resize_scalar();   /* CPU 100% */
inference_gpu();   /* GPU 100%, CPU idle */
```

NEON·DSP·VIC로 preprocess를 옮기면 두 stage가 같은 시간 안에 끝나 throughput이 두 배가 됩니다.

> Quantization을 마지막에 시도

```text
deploy 직전 INT8 변환 → accuracy 5% drop → 다시 train
```

처음부터 INT8 target을 두고 calibration data를 모아야 합니다.

## 정리

- Edge inference의 가치는 latency·privacy·cost·offline 네 가지입니다.
- 모든 추론을 edge로 옮기는 것이 답이 아니라 *어떤 추론을 옮길지* 결정합니다.
- MCU → SBC → mobile SoC → edge GPU → server edge로 자원 폭이 500배 이상 벌어집니다.
- 프레임워크는 자원에 맞춰 TFLite Micro·ONNX Runtime·TensorRT·Core ML 중에서 고릅니다.
- 추론은 preprocess·inference·postprocess 3-stage pipeline으로 *함께* 최적화합니다.
- Pipeline parallelism으로 throughput을 가장 느린 stage에 수렴시킵니다.
- 전력당 throughput에서는 전용 NPU·DLA가 압도적입니다.
- End-to-end latency를 측정해야 진짜 성능이 보입니다.

다음 편은 **TensorRT** 통합입니다.

## 관련 항목

- [6-02: TensorRT](/blog/embedded/modern-recipes/part12-04-tensorrt)
- [6-05: Jetson](/blog/embedded/modern-recipes/part12-08-jetson)
- 6-07: 온디바이스 LLM
- [3-05: SIMD](/blog/embedded/modern-recipes/part8-07-simd)
