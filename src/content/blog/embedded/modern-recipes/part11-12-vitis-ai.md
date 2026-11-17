---
title: "Vitis AI 분석 — DPU·xmodel·VART"
slug: "embedded/modern-recipes/part11-12-vitis-ai"
date: 2026-04-20T09:11:00
description: "Vitis AI 3.5의 DPU 흐름(PyTorch quantize → vai_c_xir compile → xmodel → VART 실행)을 UG1414 v3.5·PG338 v4.1과 Vitis AI v3.5 소스로 정리하고, DPUCZDX8G의 크기·성능·대역 수치를 AMD 문서 값으로 바로잡습니다."
series: "Modern Embedded Recipes"
seriesOrder: 134
tags: [recipes, fpga, vitis-ai, dpu, edge-ai]
topics: ["embedded"]
---

## 한 줄 요약

> **"Vitis AI의 DPU 흐름은 FP32 모델을 INT8로 quantize하고, DPU 구성에 맞춰 xmodel로 compile한 뒤, VART로 실행하는 세 단계입니다."** DPU(Deep Learning Processor Unit)는 FPGA fabric에 올리는 AMD의 추론 IP이고, Zynq UltraScale+ MPSoC용이 DPUCZDX8G입니다.

## 어떤 상황에서 쓰나

Zynq UltraScale+ MPSoC 보드(ZCU102, ZCU104, Kria 계열)에서 CNN 추론을 PL(programmable logic)에 맡기고 싶을 때 쓰는 흐름입니다. GPU 대신 FPGA fabric의 DSP로 INT8 연산을 돌리고, ARM 코어는 전처리·후처리를 맡습니다.

먼저 상태부터 짚고 갑니다. docs.amd.com의 *Vitis AI User Guide*(UG1414) 최신판(Doc_Version 6.2, 2026-08-26)의 첫 쪽은 "Obsolete Document Notice"로, 이 문서가 "더 이상 지원되지 않는 DPU 기반 Vitis AI 워크플로"를 설명하며 현재 NPU 기반 정보는 별도의 Vitis AI 제품 문서를 보라고 적습니다. 그래서 이 글은 DPU 흐름이 정리된 마지막 판 중 하나인 **Vitis AI 3.5**(UG1414 v3.5, 2023-09-28)와 *DPUCZDX8G for Zynq UltraScale+ MPSoCs Product Guide*(PG338 v4.1, 2023-01-23), 그리고 GitHub [`Xilinx/Vitis-AI`](https://github.com/Xilinx/Vitis-AI/tree/v3.5)의 `v3.5` 태그 소스를 기준으로 씁니다. 새 설계라면 이 흐름이 지원 대상인지부터 AMD 문서로 확인해야 합니다.

> **실행하지 않았습니다.** Vitis AI Docker, DPU 보드, Vivado는 이 환경에 없습니다. 아래 코드와 명령은 실행 결과 없이 UG1414 v3.5의 예제, Vitis AI v3.5 소스의 함수 시그니처, PG338의 표로만 확인했습니다. FPS·지연 같은 숫자는 모두 AMD 문서에 적힌 값이고, 이 글에서 잰 값은 없습니다.

## 핵심 개념 — DPU

DPU는 CNN 연산(convolution, pooling, elementwise 등)을 하는 고정 구조의 가속기입니다. 모델마다 새 회로를 합성하는 HLS와 달리, 회로는 그대로 두고 compiler가 만든 명령 스트림(xmodel 안에 들어감)을 바꿔 다른 모델을 돌립니다. 공장으로 치면 HLS는 제품마다 라인을 새로 깔고, DPU는 범용 라인 하나에 작업 지시서만 바꿔 넣는 방식입니다.

UG1414 v3.5의 하드웨어 플랫폼 표에 나오는 DPU 이름은 다음과 같습니다.

| DPU | 플랫폼 (UG1414 v3.5) |
|---|---|
| DPUCZDX8G | Zynq UltraScale+ MPSoC |
| DPUCVDX8G | Versal VCK190, Versal AI Core |
| DPUCVDX8H | Versal VCK5000 |
| DPUCV2DX8G | VEK280, Versal AI Edge, V70 |
| DPUCAHX8H | Alveo HBM 플랫폼 (XIR compiler 지원 목록) |

DPUCZDX8G의 크기는 PG338 v4.1 "Architecture of the DPUCZDX8G" 절의 표로 정해집니다. 구성은 B512, B800, B1024, B1152, B1600, B2304, B3136, B4096 여덟 가지이고(B8192는 없습니다), 사이클당 peak 연산 수는 PP(pixel) × ICP(input channel) × OCP(output channel) × 2입니다. 곱셈과 누적을 연산 두 개로 셉니다.

| 구성 | PP | ICP | OCP | Peak ops/cycle |
|---|---|---|---|---|
| B512 | 4 | 8 | 8 | 512 |
| B1152 | 4 | 12 | 12 | 1152 |
| B2304 | 8 | 12 | 12 | 2304 |
| B4096 | 8 | 16 | 16 | 4096 |

IP 하나에 DPU 코어를 최대 4개까지 넣을 수 있습니다("Number of DPU Cores" 절). 같은 문서의 "DPUCZDX8G Peak Performance" 표는 디바이스별 구성과 이론 peak를 이렇게 적습니다.

| 디바이스 | 구성 | 클록 (MHz) | Peak (GOPS) |
|---|---|---|---|
| ZU2 | B1152 × 1 | 370 | 426 |
| ZU3 | B2304 × 1 | 370 | 852 |
| ZU5 | B4096 × 1 | 350 | 1400 |
| ZU7EV | B4096 × 2 | 330 | 2700 |
| ZU9 | B4096 × 3 | 333 | 4100 |

GOPS = PP × ICP × OCP × 2 × 클록이므로 ZU5는 4096 × 350 MHz ≈ 1434 GOPS인데 표에는 1400으로 적혀 있습니다. 실제 모델 처리율의 예로, PG338 "Xilinx Model Zoo Performance" 절은 ZCU102에서 B4096 코어 3개를 287 MHz, 6 스레드로 돌렸을 때 ResNet50(224×224, 7.7 GOPs/image, Top-1 0.7334)이 194.1 FPS라고 적습니다. 보드·구성·스레드가 다르면 이 숫자는 그대로 옮길 수 없습니다.

## 전체 흐름

1. 모델 학습(PyTorch·TensorFlow)
2. Inspect: 어느 연산이 DPU에서, 어느 연산이 CPU에서 도는지 확인
3. Quantize(FP32 → INT8): calibration 이미지로 activation 범위 측정
4. Compile(`vai_c_xir`): DPU 구성(`arch.json`)에 맞춰 xmodel 생성
5. Deploy: 보드에서 VART로 실행

## Step 1 — Inspect와 Quantize (PyTorch)

UG1414 v3.5는 quantize 전에 inspector로 모델을 검사하라고 합니다. inspector는 연산마다 DPU와 CPU 중 어디서 돌지를 나눈 결과와, DPU에서 못 도는 이유를 담은 메시지를 보여 줍니다(quantizer 개요 절). PyTorch 쪽 사용법은 "Inspect Float Model Before Quantization" 절에 있습니다.

```python
from pytorch_nndct.apis import Inspector, torch_quantizer

inspector = Inspector("DPUCZDX8G_ISA1_B4096")      # target name or fingerprint
inspector.inspect(model, torch.randn([1, 3, 224, 224]), device=torch.device("cpu"))
```

Quantize는 같은 스크립트를 두 번 돌리는 구조입니다. `calib` 모드로 calibration 이미지를 흘려 양자화 단계를 정하고, `test` 모드로 정확도를 확인하면서 xmodel을 내보냅니다. `torch_quantizer`의 인자 이름과 기본값은 Vitis AI v3.5 [`pytorch_nndct/apis.py`](https://github.com/Xilinx/Vitis-AI/blob/v3.5/src/vai_quantizer/vai_q_pytorch/pytorch_binding/pytorch_nndct/apis.py)에서 확인했습니다(`torch_quantizer`와 `Inspector.inspect()` 모두 `device`의 기본값이 `cuda`라 CPU만 있다면 명시해야 합니다).

```python
dummy = torch.randn(1, 3, 224, 224)

# pass 1: calibration
quantizer = torch_quantizer("calib", model, (dummy,), device=torch.device("cpu"))
qmodel = quantizer.quant_model
for img in calib_loader:              # 100-1000 images, no labels needed
    qmodel(img)
quantizer.export_quant_config()        # writes quantize_result/Quant_info.json

# pass 2: test + export (batch size 1)
quantizer = torch_quantizer("test", model, (dummy,), device=torch.device("cpu"))
qmodel = quantizer.quant_model
evaluate(qmodel, val_loader)
quantizer.export_xmodel(output_dir="quantize_result", deploy_check=False)
```

UG1414 v3.5에서 이 흐름의 근거는 다음과 같습니다. calibration은 역전파가 없어 라벨 없는 이미지로 충분하고 보통 100~1000장이면 된다고 적습니다. `calib` 결과로 생기는 `Quant_info.json`은 "텐서의 양자화 단계"를 담은 파일이고 quantize된 모델 평가에 필요합니다. 반면 `torch_quantizer`의 `quant_config_file` 인자는 "양자화 전략 설정 JSON의 위치"라서 `Quant_info.json`을 넘기는 자리가 아닙니다. xmodel을 내보낼 때는 batch size를 1로 하라고 적고, 결과로 `quantize_result/` 아래에 `<Model>_int.xmodel`이 생깁니다.

## Step 2 — Compile

```bash
vai_c_xir -x quantize_result/ResNet_int.xmodel \
          -a /opt/vitis_ai/compiler/arch/DPUCZDX8G/ZCU102/arch.json \
          -o compiled -n resnet50
```

UG1414 v3.5의 명령 형식은 `vai_c_xir -x <quantized.xmodel> -a <arch.json> -o <out> -n <netname>`입니다. `arch.json`은 대상 DPU를 알려 주는 파일로, Vitis AI Docker의 `/opt/vitis_ai/compiler/arch` 아래에 미리 빌드된 구성별로 들어 있고 내용은 `{"target": "DPUCZDX8G_ISA0_B4096"}` 같은 이름입니다. 직접 만든 DPU라면 DPU 참조 설계가 `{"fingerprint": "0x..."}` 형태의 파일을 만들어 줍니다. fingerprint는 DPU 종류·ISA 버전·구성을 담은 64비트 값이고, runtime은 이 값으로 보드의 DPU와 xmodel이 맞는지 확인합니다. 그래서 같은 B4096이라도 보드의 DPU 구성과 다른 `arch.json`으로 compile한 xmodel은 그 보드에서 돌지 않습니다.

## Step 3 — VART로 실행

C++ API는 UG1414 v3.5 "Programming with VART" 절과 v3.5 소스의 [`vart/runner.hpp`](https://github.com/Xilinx/Vitis-AI/blob/v3.5/src/vai_runtime/vart/runner/include/vart/runner.hpp)를 따릅니다. `execute_async()`는 `(job id, status)` 쌍을 돌려주고, `wait(jobid, timeout)`의 timeout은 음수면 끝날 때까지 기다립니다.

```cpp
auto graph = xir::Graph::deserialize("compiled/resnet50.xmodel");
auto children = graph->get_root_subgraph()->children_topological_sort();
const xir::Subgraph *dpu_sg = nullptr;
for (auto *s : children)
    if (s->has_attr("device") && s->get_attr<std::string>("device") == "DPU")
        dpu_sg = s;

auto runner = vart::Runner::create_runner(dpu_sg, "run");
auto in_t  = runner->get_input_tensors();
auto out_t = runner->get_output_tensors();

/* fill input TensorBuffers, then: */
auto job = runner->execute_async(inputs, outputs);
runner->wait((int)job.first, -1);
```

Python은 Vitis AI v3.5 예제 [`resnet50_mt_py/resnet50.py`](https://github.com/Xilinx/Vitis-AI/blob/v3.5/examples/vai_runtime/resnet50_mt_py/resnet50.py)가 가장 정확한 참고입니다. 입력·출력은 C 메모리 순서의 numpy `int8` 배열이고, 입력은 텐서의 `fix_point` 속성으로 정한 배율(2^fix_point)을 곱한 뒤 `astype(np.int8)`로 바꿔 넣습니다. 예제는 반올림이나 범위 제한 없이 바로 변환하므로, 정규화된 값에 배율을 곱해 int8 범위를 넘지 않는지는 모델의 전처리에서 확인해야 합니다.

```python
import vart, xir, numpy as np

g = xir.Graph.deserialize("compiled/resnet50.xmodel")
sgs = [s for s in g.get_root_subgraph().toposort_child_subgraph()
       if s.has_attr("device") and s.get_attr("device").upper() == "DPU"]
runner = vart.Runner.create_runner(sgs[0], "run")

it, ot = runner.get_input_tensors()[0], runner.get_output_tensors()[0]
in_scale = 2 ** it.get_attr("fix_point")
inp = [np.empty(tuple(it.dims), dtype=np.int8, order="C")]
out = [np.empty(tuple(ot.dims), dtype=np.int8, order="C")]
inp[0][0, ...] = (preprocess(img) * in_scale).astype(np.int8)   # as in the example

job_id = runner.execute_async(inp, out)
runner.wait(job_id)
```

## Step 4 — 스레드마다 runner 하나

UG1414 v3.5 "Programming with VART" 절의 Tip은 "VART로 멀티스레딩을 하려면 스레드마다 runner를 하나씩 만들라"입니다. 위 `resnet50.py` 예제도 스레드 수만큼 `create_runner()`를 불러 `all_dpu_runners`에 담고 스레드에 하나씩 넘깁니다. runner 하나를 여러 스레드가 나눠 쓰는 형태는 문서가 권하는 방법이 아닙니다.

```cpp
std::vector<std::unique_ptr<vart::Runner>> runners;
for (int i = 0; i < n_threads; i++)
    runners.emplace_back(vart::Runner::create_runner(dpu_sg, "run"));

std::vector<std::thread> ts;
for (int i = 0; i < n_threads; i++)
    ts.emplace_back([&, i] {
        while (running) {
            auto frame = queue_pop();
            auto job = runners[i]->execute_async(frame.in, frame.out);
            runners[i]->wait((int)job.first, -1);
            result_push(frame);
        }
    });
```

스레드를 늘려 얼마나 빨라지는지는 DPU 코어 수, 전·후처리 시간, 메모리 대역에 달려 있습니다. 위 PG338 표의 194.1 FPS도 "코어 3개, 6 스레드"라는 조건이 붙은 값입니다.

## DPU와 CPU의 분담

| 단계 | 어디서 | 근거 |
|---|---|---|
| 전처리(resize, normalize, int8 변환) | CPU | VART 예제의 `preprocess` + `fix_point` 배율 |
| DPU가 지원하는 연산(conv, pool 등) | DPU | inspector가 나눈 DPU subgraph |
| DPU가 지원하지 않는 연산 | CPU | UG1414: "Operators not supported by the DPU can be executed on the CPU" |
| 후처리(softmax, NMS, box decode) | CPU(또는 PG338의 선택형 softmax 모듈) | 모델에 따라 다름 |

end-to-end 처리율은 가장 느린 단계가 정합니다. DPU 추론이 빨라도 전처리나 후처리가 더 오래 걸리면 FPS는 그쪽에 묶입니다. 그래서 DPU만 재지 말고 전·후처리를 포함해 프레임 단위로 시간을 잽니다.

## Profile

보드에서 DPU만의 처리율은 `xdputil benchmark`로 잴 수 있습니다. 사용법은 Vitis AI v3.5 [`xdputil_component/benchmark.py`](https://github.com/Xilinx/Vitis-AI/blob/v3.5/src/vai_library/usefultools/python/xdputil_component/benchmark.py)의 도움말 그대로 `<xmodel> [-i subgraph_index] <num_of_threads>`입니다.

```bash
xdputil benchmark compiled/resnet50.xmodel 1
xdputil benchmark compiled/resnet50.xmodel 4
```

이 글은 보드가 없어 결과를 싣지 않습니다. UG1414 v3.5는 `xdputil run`과 `XLNX_ENABLE_DUMP=1` 등의 환경 변수로 DPU 결과를 GPU/CPU 기준 결과와 비교하는 디버그 절차도 설명합니다("DPU Debug with VART").

## DPU IP를 Vivado에 넣기

PG338 v4.1 "Development Flow" 절의 Vivado 흐름은 DPUCZDX8G IP를 저장소에 추가 → block design에 추가 → 파라미터 설정 → PS에 연결 → 레지스터 주소 할당 → bitstream 생성 → BOOT.BIN 생성 순서입니다. IP의 포트는 "Port Descriptions" 절에 있습니다.

| 포트 | 폭 | 역할 |
|---|---|---|
| `DPUx_M_AXI_INSTR` | 32 | 명령 fetch용 AXI master |
| `DPUx_M_AXI_DATA0`, `DATA1` | 128 (MPSoC) | 데이터용 AXI master |
| `dpux_interrupt` | 1 | Active-High interrupt |
| `SFM_M_AXI` | 128 | softmax 데이터용 AXI master. 하드웨어 softmax를 켰을 때만 생김 |

같은 문서의 PS 연결 절은 명령 fetch 포트들은 interconnect 하나를 거쳐 PS의 `S_AXI_LPD`에, 데이터 포트는 가능한 한 PS의 slave 포트에 직접 잇고, 우선순위가 높은 코어(DPU0)를 `S_AXI_HP0_FPD`처럼 번호가 작은 포트에 연결하라고 권합니다. Vitis 흐름(DPU TRD)도 같은 문서의 "Vitis DPU TRD Flow" 절에 있습니다.

## 자주 보는 함정

> Calibration 데이터가 배포 환경과 다름

UG1414 v3.5는 calibration에 100~1000장이면 보통 충분하다고 하면서, calibration 세트가 학습 세트의 일부여도 된다고 설명합니다. 장수보다 중요한 것은 배포 환경의 입력 분포를 담고 있느냐입니다. quantize 뒤에는 `test` 모드로 검증 세트 전체 정확도를 봅니다(문서는 평가에 검증 세트 전체가 필요하다고 적습니다).

> DPU가 지원하지 않는 연산

inspector 결과에서 CPU로 떨어진 연산이 그래프 중간에 있으면 DPU subgraph가 여러 개로 쪼개지고, 그 사이마다 데이터가 CPU를 오갑니다. UG1414는 지원 연산 목록과 DPU 제한("Supported Operators and DPU Limitations")을 대상 DPU 구성과 함께 확인하라고 합니다.

> `Quant_info.json`을 `quant_config_file`로 넘김

앞에서 본 것처럼 두 파일은 역할이 다릅니다. `test` 모드는 `calib`이 남긴 `quantize_result/` 결과를 읽으므로 따로 넘길 필요가 없습니다.

> 입력 크기를 정하지 않은 모델

PyTorch inspector에는 구체적인 shape의 입력 텐서를 넘기고(문서는 TF2 inspector에도 "concrete input shapes"가 필요하다고 적습니다), xmodel 내보내기는 batch size 1로 합니다. 동적 shape 모델은 고정 shape으로 만든 뒤 quantize합니다.

> 메모리 대역

PG338 v4.1 "I/O Bandwidth Requirements" 표에서 ResNet50을 B4096 코어 하나로 돌릴 때 I/O 대역은 peak 5298 MB/s, 평균 3132 MB/s입니다(B1152는 2052, 1017 MB/s). 같은 절은 여러 코어를 병렬로 돌리면 I/O 대역 제한 때문에 코어마다 최적 성능을 못 낼 수 있다고 적습니다. 카메라 DMA나 다른 master가 같은 DDR을 쓰면 이 여유는 더 줄어듭니다.

## 정리

- Vitis AI DPU 흐름은 inspect → quantize(calib/test) → `vai_c_xir` → VART입니다.
- AMD는 최신 UG1414 첫 쪽에서 DPU 기반 흐름 문서를 obsolete로 표시했습니다. 이 글은 Vitis AI 3.5 기준입니다.
- DPUCZDX8G는 B512~B4096 여덟 구성, 코어 최대 4개입니다. Peak ops/cycle = PP × ICP × OCP × 2입니다.
- Calibration은 라벨 없는 100~1000장, xmodel 내보내기는 batch 1입니다. `Quant_info.json`과 `quant_config_file`은 다른 것입니다.
- `arch.json`(이름 또는 fingerprint)이 보드의 DPU와 맞아야 xmodel이 돕니다.
- VART 멀티스레딩은 스레드마다 runner 하나입니다.
- FPS는 DPU·전처리·후처리 중 가장 느린 단계가 정하고, DPU 대역(ResNet50 B4096 평균 3.1 GB/s)도 함께 봅니다.

다음 편은 **OpenCL on FPGA**입니다.

## 관련 항목

- [11-10: Vitis HLS](/blog/embedded/modern-recipes/part11-10-hls)
- [11-11: HLS 최적화](/blog/embedded/modern-recipes/part11-11-hls-optimization)
- [11-13: OpenCL on FPGA](/blog/embedded/modern-recipes/part11-13-opencl-fpga)
- [12-01: Edge Inference](/blog/embedded/modern-recipes/part12-01-edge-inference)
- [12-04: Quantization](/blog/embedded/modern-recipes/part12-04-quantization)
- [12-05: TensorRT](/blog/embedded/modern-recipes/part12-05-tensorrt)
