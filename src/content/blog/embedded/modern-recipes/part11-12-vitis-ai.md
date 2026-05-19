---
title: "11-12: Vitis AI — DPU·xmodel·VART"
date: 2026-05-17T14:00:00
description: "Xilinx Vitis AI로 TensorFlow/PyTorch 모델을 DPU용 xmodel로 quantize·compile하고 VART로 실행하는 흐름."
series: "Modern Embedded Recipes"
seriesOrder: 134
tags: [recipes, fpga, vitis-ai, dpu, edge-ai]
---

## 한 줄 요약

> **"Vitis AI는 *DPU(Deep Learning Processor Unit)*라는 Xilinx의 INT8 inference 엔진과 그것을 위한 toolchain입니다."** TensorFlow/PyTorch 모델을 quantize → compile → xmodel → VART로 실행합니다.

## 어떤 상황에서 쓰나

Zynq UltraScale+ MPSoC, Kria K26 SoM, Versal AI 장착 device에서 neural network inference를 돌릴 때 사실상 표준입니다. ZCU104, KV260 같은 dev kit이 대표 플랫폼입니다.

GPU·NPU 없이 *FPGA fabric으로 deep learning*을 하면서 *INT8 throughput*과 *낮은 전력*을 챙기는 게 핵심입니다. ResNet-50을 KV260에서 ~150 fps @ 5W 정도로 돌립니다.

## 핵심 개념 — DPU

```text
DPU = Deep Learning Processing Unit
- Xilinx의 IP block (RTL)
- FPGA fabric에 instantiate
- INT8 가속 (convolution, pool, FC, activation, ...)
- DPUCZDX8G: Zynq UltraScale+
- DPUCAHX8H: Alveo
- DPUCVDX8G: Versal
```

DPU는 *고정된 instruction set*을 가진 *softcore accelerator*입니다. xmodel은 *DPU instruction stream*. CPU instruction과 비슷한 관계입니다.

DPU 옵션:

```text
B512   ~256 GOPS    작은 model
B1024
B2304  ~1100 GOPS
B4096  ~2000 GOPS   ZCU104·KV260 표준
B8192  ~4000 GOPS   대형 부서
```

LUT, DSP, BRAM 사용량이 옵션에 따라 다릅니다. KV260은 보통 B4096.

## 전체 흐름

```text
1. Model 학습 (TF/PyTorch)
2. Quantize (FP32 → INT8) — calibration dataset 필요
3. Compile (quantized → xmodel) — DPU arch 지정
4. Deploy: VART API로 실행
```

## Step 1 — Quantize

```python
# PyTorch
from pytorch_nndct.apis import torch_quantizer

model = torchvision.models.resnet50(pretrained=True)
model.eval()

# input shape
input_shape = (1, 3, 224, 224)
dummy = torch.randn(input_shape)

# calibration
quantizer = torch_quantizer('calib', model, dummy, device='cpu')
quant_model = quantizer.quant_model

# calibration data 100~1000장 inference
for img in calib_loader:
    quant_model(img)

quantizer.export_quant_config()

# test mode로 다시
quantizer = torch_quantizer('test', model, dummy, device='cpu',
                            quant_config_file='quant_info.json')
quant_model = quantizer.quant_model

# verify accuracy
acc = evaluate(quant_model, val_loader)
print(f"Quantized accuracy: {acc}")

# export xmodel
quantizer.export_xmodel()
```

Calibration은 *대표성 있는 100~1000장*. Deploy 환경 분포와 가까워야 accuracy 손실 적습니다.

## Step 2 — Compile

```bash
vai_c_xir \
    --xmodel    ResNet50_int.xmodel \
    --arch      /opt/vitis_ai/compiler/arch/DPUCZDX8G/KV260/arch.json \
    --output_dir compiled \
    --net_name  resnet50
```

`arch.json`은 *DPU 인스턴스*의 spec. Board마다 다름. ZCU104, KV260, custom board.

출력: `compiled/resnet50.xmodel`. 이게 DPU instruction stream + 가중치.

## Step 3 — VART로 실행

C++ API:

```cpp
#include <vart/runner.hpp>
#include <xir/graph/graph.hpp>

int main() {
    // Load
    auto graph = xir::Graph::deserialize("compiled/resnet50.xmodel");
    auto subgraphs = graph->get_root_subgraph()->children_topological_sort();
    auto dpu_sg = std::find_if(subgraphs.begin(), subgraphs.end(),
        [](const auto *s) {
            return s->get_attr<std::string>("device") == "DPU";
        });

    auto runner = vart::Runner::create_runner(*dpu_sg, "run");

    // Input / output tensor info
    auto in_tensors  = runner->get_input_tensors();
    auto out_tensors = runner->get_output_tensors();

    // Allocate buffers
    int8_t *in_buf  = (int8_t*)malloc(in_tensors[0]->get_data_size());
    int8_t *out_buf = (int8_t*)malloc(out_tensors[0]->get_data_size());

    // Preprocess + load
    load_image("test.jpg", in_buf);

    // Run
    std::vector<vart::TensorBuffer*> ins  = { make_buf(in_buf, in_tensors[0]) };
    std::vector<vart::TensorBuffer*> outs = { make_buf(out_buf, out_tensors[0]) };
    auto job = runner->execute_async(ins, outs);
    runner->wait((int)job.first, -1);

    // Postprocess
    int top = argmax_int8(out_buf, 1000);
    printf("class %d\n", top);
}
```

Python API도 거의 동일합니다.

```python
import vart, xir
import numpy as np

g = xir.Graph.deserialize("compiled/resnet50.xmodel")
sg = next(s for s in g.get_root_subgraph().toposort_child_subgraph()
          if s.get_attr("device") == "DPU")
runner = vart.Runner.create_runner(sg, "run")

inputs  = [np.empty(t.dims, dtype=np.int8) for t in runner.get_input_tensors()]
outputs = [np.empty(t.dims, dtype=np.int8) for t in runner.get_output_tensors()]

inputs[0][:] = preprocess(img)

job = runner.execute_async(inputs, outputs)
runner.wait(job)

print("top:", outputs[0].argmax())
```

## Step 4 — Multi-thread Throughput

DPU는 *한 모델 instance*가 동시에 *여러 frame*을 in-flight로 처리. Multi-thread로 throughput을 끌어올립니다.

```cpp
auto runner = vart::Runner::create_runner(dpu_sg, "run");

std::vector<std::thread> ts;
for (int i = 0; i < 4; i++) {
    ts.emplace_back([&]() {
        while (running) {
            auto img = queue_pop();
            std::vector<TensorBuffer*> ins{...}, outs{...};
            auto job = runner->execute_async(ins, outs);
            runner->wait(job.first, -1);
            result_push(outs);
        }
    });
}
```

4 thread × ResNet-50 → KV260에서 ~600 fps. Single-thread 대비 4배.

## YOLOv5 예 — Detection Model

```python
from pytorch_nndct.apis import torch_quantizer
import torch

model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)
model.model[-1].export = True   # detect layer 분리

dummy = torch.randn(1, 3, 640, 640)
quantizer = torch_quantizer('calib', model, dummy)
quant_model = quantizer.quant_model

for img in calib_loader:
    quant_model(img)

quantizer.export_xmodel()
```

```bash
vai_c_xir --xmodel YOLOv5s_int.xmodel \
          --arch /opt/.../KV260/arch.json \
          --output_dir compiled --net_name yolov5s
```

VART 실행 후 *postprocess* (NMS, box decode)는 CPU에서.

## DPU와 CPU의 분담

```text
[CPU]  Preprocess (resize, normalize, BGR→RGB)
       ↓
[DPU]  Backbone, head (conv, pool, activation, ...)
       ↓
[CPU]  Postprocess (NMS, sigmoid, box decode)
```

CPU pre/post가 bottleneck이면 OpenCV optimize, OpenMP, NEON SIMD로 가속.

## Profile

```bash
# DPU runtime profile
xdputil benchmark resnet50.xmodel 1   # 1 thread
xdputil benchmark resnet50.xmodel 4   # 4 thread
```

```text
ResNet-50 KV260:
1 thread: 150 fps, 6.6ms/frame
4 thread: 600 fps, 6.7ms/frame (latency 동일, throughput 4×)
8 thread: 750 fps, ~13ms (queue 적체)
```

Thread 수는 *core 수*가 아니라 *queue depth*로 보면 됩니다.

## DPU IP Instantiate

Vivado에서 DPU IP를 fabric에 instantiate:

```text
1. Vivado에 Vitis-AI DPU IP 추가
2. Configure: B4096, single/multi DPU, RAM/URAM usage
3. AXI 연결: M_AXI_HP 4개 (DDR), M_AXI_GP (control)
4. Generate bitstream
5. petalinux로 PetaLinux 빌드, DPU driver 포함
```

Pre-built KV260 / ZCU104 image가 있으니 처음에는 그걸 그대로 사용.

## 자주 보는 함정

> Calibration data 부족

100장 이하로 calibration하면 accuracy가 5~10% 떨어질 수 있음. 500~1000장 권장.

> Unsupported op

```python
quantizer = torch_quantizer('calib', model, dummy)
# WARNING: op 'LayerNorm' not supported by DPU → CPU subgraph
```

DPU에서 지원 안 하는 op는 CPU로 떨어짐. 모델을 *DPU-friendly*하게 (BatchNorm vs LayerNorm 등) 또는 fuse.

> Input shape 고정

DPU는 *fixed shape*만 지원. Dynamic shape 모델은 max shape으로 fixed + pad.

> Multi-DPU 활용 안 함

KV260은 단일 DPU지만 ZU19EG 같은 큰 device는 *2개 DPU*. 두 instance를 다른 stream에 할당.

> Memory bandwidth

DPU는 DDR bandwidth가 bottleneck. AXI HP 4개 모두 활용. 다른 master(camera, network)와 충돌하면 throughput 떨어짐.

> CPU pre/post bottleneck

```text
DPU: 6 ms inference
CPU: 20 ms preprocess + 10 ms NMS = 30 ms

total: 36 ms → 28 fps (DPU 6 ms는 의미 없음)
```

Profile으로 측정. Preprocess는 GStreamer 또는 별도 fabric block으로 가속.

## 정리

- Vitis AI = DPU IP + toolchain (quantize, compile, runtime).
- Quantize: FP32 → INT8, calibration dataset 100~1000장 필요.
- Compile: quantized → xmodel (DPU instruction).
- Runtime: VART API (C++/Python).
- Multi-thread로 4× throughput 일반적.
- DPU는 FPGA fabric에 instantiate되는 softcore (RTL IP).
- B4096이 KV260·ZCU104 표준 옵션.
- CPU pre/post bottleneck을 항상 profile.

다음 편은 **OpenCL on FPGA**입니다.

## 관련 항목

- [11-10: HLS](/blog/embedded/modern-recipes/part11-10-hls)
- [11-11: HLS 최적화](/blog/embedded/modern-recipes/part11-11-hls-optimization)
- [11-13: OpenCL on FPGA](/blog/embedded/modern-recipes/part11-13-opencl-fpga)
- [6-01: Edge Inference](/blog/embedded/modern-recipes/part6-01-edge-inference)
- [6-03: Quantization](/blog/embedded/modern-recipes/part6-03-quantization)
- [12-04: TensorRT](/blog/embedded/modern-recipes/part12-04-tensorrt)
