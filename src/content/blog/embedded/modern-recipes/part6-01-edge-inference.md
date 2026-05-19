---
title: "6-01: Edge Inference Pipeline — Preprocess·Inference·Postprocess"
date: 2026-05-21T01:00:00
description: "Edge AI pipeline. Preprocess (NEON resize·normalize), inference (NPU·GPU), postprocess (NMS·tracking)."
series: "Modern Embedded Recipes"
seriesOrder: 31
tags: [recipes, edge-ai, inference, pipeline]
draft: true
---

## 한 줄 요약

> **"Edge AI = preprocess + inference + postprocess 3-stage pipeline"** — 각 stage 같이 최적화.

## Pipeline 구조

```text
Sensor → Preprocess → Inference → Postprocess → Output
  ↓         ↓            ↓            ↓            ↓
Camera   Resize       NPU/GPU      NMS·Track   Action
LiDAR    Normalize    TensorRT
Mic      FFT          ONNX
```

비용 분포:
- Preprocess: 5-20%
- Inference: 60-80%
- Postprocess: 5-15%

## NEON Preprocess — Resize + Normalize

```c
#include <arm_neon.h>

void preprocess(const uint8_t *rgb_in, float *out, int n) {
    /* uint8 → float [0,1] */
    for (int i = 0; i + 16 <= n; i += 16) {
        uint8x16_t v8 = vld1q_u8(&rgb_in[i]);
        uint16x8_t lo = vmovl_u8(vget_low_u8(v8));
        uint16x8_t hi = vmovl_u8(vget_high_u8(v8));
        
        float32x4_t scale = vdupq_n_f32(1.0f / 255.0f);
        vst1q_f32(&out[i], vmulq_f32(
            vcvtq_f32_u32(vmovl_u16(vget_low_u16(lo))), scale));
        /* repeat for other 3 */
    }
}
```

Scalar 대비 *16x throughput*.

## TFLite Micro — MCU

```c
#include "tensorflow/lite/micro/micro_interpreter.h"

const tflite::Model *model = tflite::GetModel(model_data);
tflite::MicroInterpreter interp(model, resolver, tensor_arena, ARENA_SIZE);
interp.AllocateTensors();

TfLiteTensor *in = interp.input(0);
memcpy(in->data.uint8, preprocessed, in->bytes);
interp.Invoke();
TfLiteTensor *out = interp.output(0);
```

Cortex-M55·Helium MVE — keyword detection·anomaly.

## ONNX Runtime

```c
OrtCreateEnv(ORT_LOGGING_LEVEL_WARNING, "app", &env);
OrtSessionOptions *opts;
OrtSessionOptionsAppendExecutionProvider_CUDA(opts, 0);
OrtCreateSession(env, "model.onnx", opts, &session);

OrtRun(session, NULL, &input_name, &input_tensor, 1,
       &output_name, 1, &output_tensor);
```

CUDA·TensorRT·CoreML·NNAPI backend. *Vendor-agnostic*.

## TensorRT — NVIDIA

```cpp
auto *builder = nvinfer1::createInferBuilder(logger);
auto *network = builder->createNetworkV2(0);
auto *parser = nvonnxparser::createParser(*network, logger);
parser->parseFromFile("model.onnx", ...);

auto *config = builder->createBuilderConfig();
config->setFlag(BuilderFlag::kFP16);
auto *engine = builder->buildEngineWithConfig(*network, *config);

auto *ctx = engine->createExecutionContext();
ctx->enqueueV2(buffers, stream, nullptr);
```

Jetson — TensorRT 압도적. 자율주행 표준.

## Postprocess — NMS

```c
void nms(detection_t *dets, int *n, float iou_thr) {
    qsort(dets, *n, sizeof(detection_t), cmp_score_desc);
    int kept = 0;
    for (int i = 0; i < *n; i++) {
        bool sup = false;
        for (int j = 0; j < kept; j++) {
            if (iou(dets[i], dets[j]) > iou_thr) { sup = true; break; }
        }
        if (!sup) dets[kept++] = dets[i];
    }
    *n = kept;
}
```

YOLO output → NMS → final boxes. NEON IoU compute로 4x speedup.

## Tracking — SORT

```c
void sort_update(track_t *tracks, int *n, detection_t *dets, int dn) {
    for (int i = 0; i < *n; i++) kf_predict(&tracks[i].kf);
    int matches[*n];
    hungarian_assign(tracks, *n, dets, dn, matches);
    for (int i = 0; i < *n; i++) {
        if (matches[i] >= 0) {
            kf_update(&tracks[i].kf, &dets[matches[i]]);
        } else tracks[i].age++;
    }
}
```

자율주행·CCTV — SORT/DeepSORT.

## Pipeline Parallelism — 3 Thread

```c
frame_t buf[3];
int prep = 0, inf = 1, post = 2;

while (1) {
    parallel({
        preprocess(input, &buf[prep]);
        inference(&buf[inf]);
        postprocess(&buf[post]);
    });
    /* rotate indices */
    int tmp = post; post = inf; inf = prep; prep = tmp;
}
```

3 frame in-flight — throughput 3x.

## Mixed Precision

```cpp
config->setFlag(BuilderFlag::kFP16);   /* 2x */
config->setFlag(BuilderFlag::kINT8);   /* 4x */
```

NPU·GPU — FP16·INT8 hardware 가속.

## Latency Budget — 자동차 30 fps

```text
Sensor      : 5 ms
Preprocess  : 3 ms
Inference   : 20 ms   ← bottleneck
NMS         : 1 ms
Tracking    : 2 ms
Decision    : 2 ms
Total       : 33 ms (frame interval)
```

Inference 부족 시 — *model 축소·cascade·NPU offload*.

## QAT — Quantization-Aware Training

```python
quant_model = clone_model(model, clone_function=quantize_layer)
quant_model.fit(train_data, epochs=5)

converter = tf.lite.TFLiteConverter.from_keras_model(quant_model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
```

학습 시 *quantize-aware* — INT8 accuracy 회복.

## 자주 하는 실수

> ⚠️ CPU preprocess

```c
resize_scalar(img);  /* CPU 60% */
inference(GPU);      /* GPU 60%, CPU idle */
```

→ NEON·DSP·GPU preprocess.

> ⚠️ FP32 production

→ FP16·INT8.

> ⚠️ Sync inference

→ async + double buffer.

## 정리

- Edge inference = **3-stage pipeline**.
- NEON preprocess·TensorRT inference·NMS·tracking.
- TFLite Micro·ONNX·TensorRT·OpenVINO·CoreML.
- **Pipeline parallelism** + **batch** + **FP16/INT8**.
- 자율주행 — 33 ms budget 안 inference 20 ms.

다음 편은 **TensorRT 통합**.

## 관련 항목

- [5-06: AXI](/blog/embedded/modern-recipes/part5-06-axi)
- [6-02: TensorRT](/blog/embedded/modern-recipes/part6-02-tensorrt)
