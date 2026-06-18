---
title: "메모리 대역폭 병목 분석 — Theoretical vs Achievable·Roofline·Memory Wall"
date: 2026-05-16T09:05:00
description: "Theoretical vs achievable — 메모리 대역폭의 실제와 roofline·memory wall."
series: "HBM·GDDR 심화"
seriesOrder: 5
tags: [hbm, bandwidth, roofline, bottleneck]
draft: false
---

## 한 줄 요약

> **"공칭 대역폭의 *70~85%*만 *실제로 쓸 수 있습니다*."** — refresh·row activation·bank conflict로 *효율이 깎입니다*. AI workload는 *대부분 memory bound*이고, *LLM inference*에서는 *MFU 30~50%*에서 *MBU 60~85%*가 동시에 나옵니다. *compute가 빨리 늘어 memory가 병목*인 *memory wall*의 핵심을 정량적으로 풉니다.

[Ch 4](/blog/embedded/hardware/hbm/chapter04-gddr)에서 *GDDR signaling의 진화*를 봤습니다. 이번 장은 *대역폭이 실제로 어떻게 쓰이는지*입니다. 데이터시트의 *819 GB/s*가 *실제 application에서 700 GB/s*만 나오는 *그 30%의 손실*이 *어디로 가는지*가 핵심입니다.

## Theoretical BW의 계산

먼저 *공칭 대역폭*은 단순합니다.

```text
공식: BW = clock × bus_width × DDR(2)
       = pin_rate × bus_width / 8

HBM3 stack:
  6.4 Gbps × 1024-bit / 8 = 819 GB/s

HBM3E stack (9.6 Gbps):
  9.6 Gbps × 1024-bit / 8 = 1228 GB/s ≈ 1.23 TB/s

HBM4 stack (8.0 Gbps × 2048-bit):
  8.0 Gbps × 2048-bit / 8 = 2048 GB/s ≈ 2.0 TB/s

GDDR6X chip (21 Gbps × 32-bit):
  21 Gbps × 32-bit / 8 = 84 GB/s

NVIDIA H100 (5 stack × HBM3):
  5 × 819 = 4096 GB/s ≈ 4 TB/s 공칭
  실제 spec: 3.35 TB/s (이미 effective rate 표기)
```

H100 데이터시트는 *3.35 TB/s*로 *이미 깎인 값*을 적습니다. NVIDIA가 *channel utilization과 refresh overhead*를 *반영한 spec*을 *제품 marketing*에 씁니다. *4 TB/s 이론치*가 아닙니다.

## 효율 손실 — 어디로 가는가

공칭에서 *실효치까지의 갭*은 *네 가지 요인*에서 옵니다.

```text
Bandwidth loss sources

theoretical BW
  │
  ├── refresh overhead         ─── -3~5%
  │   (auto refresh, REF/REFsb)
  │
  ├── row activation           ─── -5~10%
  │   (RAS → CAS, tRCD)
  │
  ├── bank conflict            ─── -5~15%
  │   (queue stall, schedule miss)
  │
  ├── command/address overhead ─── -2~5%
  │   (precharge, mode register)
  │
  └── ECC redundancy           ─── -0~5%
      (data path가 ECC 비트로 일부 점유)

→ sustained BW ≈ 70~85% of theoretical
```

각 요인을 *수치로* 봅니다.

### Refresh overhead

DRAM은 *주기적으로 row를 refresh*해야 데이터가 보존됩니다. HBM3 기준 *64 ms마다 모든 row*를 한 번씩 refresh합니다.

```text
HBM3 refresh budget

총 row 수 (24 Gb DRAM × 12 = 36 GB stack):
  약 65536 rows per bank × 32 bank × 16 channel
  = 33M rows per stack

refresh 명령 (tREFI = 3.9 μs):
  64 ms / 3.9 μs = 16384 commands per cycle
  
한 command가 8 row를 refresh (REFab):
  → 16384 × 8 = 131K rows / 64 ms

각 refresh의 tRFC = 350 ns
  → 16384 × 350 ns = 5.7 ms 동안 bus busy
  → 64 ms 중 5.7 ms = 8.9% busy
```

실제로는 *per-bank refresh(REFpb)*나 *fine-grained refresh*를 써서 *bus 점유율을 분산*시킵니다. *효과적인 refresh overhead*는 *3~5%* 수준입니다.

### Row activation latency

DRAM access는 *row를 먼저 activate*해야 *column read/write*가 가능합니다.

![DRAM access sequence — row open(ACT) → 같은 row 안의 RD 연속 → row close(PRE) → 새 row open. row hit는 burst 효율적, row miss는 ACT+PRE+ACT의 42 ns overhead](/images/blog/hardware/hbm/diagrams/ch05-row-access-sequence.svg)

*같은 row 내 access(row hit)*는 *효율적*이지만, *random access*는 *row miss 비율*이 높아 *bandwidth 깎입니다*. 잘 설계된 컨트롤러는 *row buffer locality*가 *70~90%* 정도입니다.

### Bank conflict

여러 *outstanding request*가 *같은 bank*를 노리면 *직렬화*됩니다.

![Bank conflict — bank 3에 다른 row 요청이 쌓여 직렬화되는 동안 bank 7은 곧바로 처리하므로 utilization이 저하된다](/images/blog/hardware/hbm/diagrams/ch05-bank-conflict.svg)

HBM3는 *16 channel × 2 PC × 16 bank = 512 bank*가 *독립*합니다. 컨트롤러가 *address mapping*을 *XOR hash*로 잘 설계하면 *bank conflict*가 *5% 이하*로 떨어집니다.

### Command/address overhead

precharge, activate, mode register write 같은 *데이터 전송이 아닌 명령*도 *command bus*를 차지합니다. HBM3에서 *C/A overhead*는 *전체 cycle의 2~5%*입니다.

## Achievable BW의 측정

실제 BW를 측정하는 가장 간단한 방법은 *STREAM* 벤치마크입니다.

```c
// STREAM Triad: a[i] = b[i] + scalar * c[i]
// memory traffic = 3N (2 read, 1 write) × sizeof(double)

#define N (1<<28)  // 256M elements
double *a, *b, *c;
double scalar = 3.0;

cudaMalloc(&a, N * sizeof(double));
cudaMalloc(&b, N * sizeof(double));
cudaMalloc(&c, N * sizeof(double));

// kernel
__global__ void triad(double *a, double *b, double *c, double s, int n) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) a[i] = b[i] + s * c[i];
}

// measure time → BW = 3 * N * 8 / time
```

H100 (3.35 TB/s spec)의 *STREAM triad* 결과는 일반적으로 *2.5~2.8 TB/s* 정도입니다. *spec 대비 75~83%* 효율입니다.

| 카드 | 워크로드 | sustained BW | 효율 |
|------|---------|--------------|------|
| A100 80GB (2.0 TB/s spec) | STREAM triad | 1.65 TB/s | 82% |
| A100 80GB | cuBLAS sgemm | 1.50 TB/s | 75% |
| A100 80GB | random access | 0.55 TB/s | 28% (worst case) |
| H100 80GB (3.35 TB/s spec) | STREAM triad | 2.75 TB/s | 82% |
| H100 80GB | LLM inference | 2.40 TB/s | 72% |
| MI300X (5.3 TB/s spec) | STREAM triad | 4.20 TB/s | 79% |

*random access*가 *27% 효율*까지 떨어지는 게 충격적입니다. 이는 *row hit 비율 낮음, bank conflict 다발*이 겹친 *worst case*입니다.

## Roofline 모델

*Roofline*은 *compute와 memory bandwidth*의 관계를 *한 그림*에 보여 줍니다.

![Roofline 모델 — memory bound와 compute bound 영역, knee point](/images/blog/hardware/hbm/diagrams/ch05-roofline.svg)

knee = peak_compute / peak_BW. NVIDIA H100 기준 *1000 TFLOPS / 3.35 TB/s = 298 FLOPS/Byte*입니다.

*Arithmetic Intensity*는 *byte 1개당 몇 FLOP*를 하는지입니다. AI workload별로 보면:

| 연산 | Intensity (FLOPS/Byte) | 결론 |
|------|----------------------|------|
| Vector add (`a[i]+b[i]`) | 0.25 | 강한 memory bound |
| Sparse matvec | 0.5~2 | memory bound |
| GEMM 1024×1024 | 30~50 | memory bound (H100) |
| GEMM 16384×16384 | 100~300 | knee 근처 |
| Conv 3×3 dense | 10~30 | memory bound |
| LLM attention (KV cache 읽기) | 5~15 | 강한 memory bound |
| LLM MLP (matmul) | 50~100 | memory bound (H100) |
| TPU TPC integer ops | 200+ | compute bound |

H100의 *knee = 298 FLOPS/Byte*인데 *대부분 AI workload*가 *10~100 FLOPS/Byte*에 있습니다. 다시 말해 *대부분이 memory bound*입니다.

## Memory wall

*compute*와 *memory BW*의 *증가 속도 차이*가 *벌어지고 있습니다*.

![Memory wall — compute는 25배, memory BW는 9배만 늘어 격차 확대](/images/blog/hardware/hbm/diagrams/ch05-memory-wall.svg)

compute *25배* growth 동안 memory BW *9배* growth. *knee point가 오른쪽으로 이동*하며 *더 많은 workload*가 *memory bound*로 떨어집니다.

같은 GPU 안에서 *compute 25배*가 늘 동안 *memory BW는 9배*만 늘었습니다. *knee가 오른쪽으로 이동*하며 *더 많은 workload*가 *memory bound*로 떨어집니다.

해결책은 *세 갈래*입니다.

1. **on-chip cache 늘리기** — H100의 L2가 *50 MB*, B200은 *82 MB*. 그러나 *LLM weight 100 GB*에는 *턱없이 부족*합니다.
2. **HBM 세대 빠르게 진화** — HBM3E(1.2 TB/s) → HBM4(2 TB/s) → HBM4E(2.5 TB/s+).
3. **알고리즘 측에서 *AI를 compute bound로* 옮기기** — flash attention, mixture-of-experts(MoE) sparsity.

## LLM inference의 MBU

LLM 추론에서 *Memory Bandwidth Utilization(MBU)*가 *core metric*이 됐습니다.

```text
LLM inference 단계

1. Prefill (prompt encoding)
   - 모든 weight 한 번씩 읽음
   - batch 클수록 reuse 증가
   - compute bound 경향
   
2. Decode (token by token)
   - 매 토큰마다 weight 다시 읽음
   - KV cache 추가 읽기 (sequence 길이에 비례)
   - 강한 memory bound

MBU = actual BW used / peak BW
MFU = actual FLOPS / peak FLOPS

LLaMA 70B inference on H100 (batch=1):
  Decode latency: 30 ms/token
  weight = 140 GB / 3.35 TB/s = 42 ms (이론)
  실제 30 ms ← KV cache는 cache hit 효과
  MBU ≈ 80%
  MFU ≈ 5%
```

LLaMA 70B decode는 *MBU 80%, MFU 5%*입니다. *compute는 거의 쉬고 memory만 돌아갑니다*. *batch를 키워야* MFU가 올라가지만 *latency도 같이* 늘어납니다.

## 측정 도구

GPU/NPU에서 *어디가 병목*인지 보는 도구가 있습니다.

```bash
# NVIDIA — Nsight Compute (GPU profiling)
ncu --set full --target-processes all ./inference
# 보고서에서 "Memory Workload Analysis" 섹션
# - DRAM Throughput (% of peak)
# - L2 Cache Hit Rate
# - Memory Pipes Busy

# AMD — ROCm Profiler
rocprof --hsa-trace --hip-trace ./inference
# rocprof-compute analyze

# Linux generic — perf
perf stat -e cache-references,cache-misses,LLC-load-misses ./app

# Intel Gaudi — habana-tools
hl-prof-config -gaudi -trace=memory
```

데이터센터급에서는 *DCGM(NVIDIA Data Center GPU Manager)*로 *fleet-wide BW utilization*을 모니터링합니다.

```python
# DCGM API 예시
import pydcgm
import dcgm_fields

handle = pydcgm.DcgmHandle()
group = pydcgm.DcgmGroup(handle, groupName="my_gpus")

fields = [
    dcgm_fields.DCGM_FI_DEV_MEM_COPY_UTIL,     # DRAM access %
    dcgm_fields.DCGM_FI_PROF_DRAM_ACTIVE,       # active cycles
    dcgm_fields.DCGM_FI_PROF_PIPE_FP16_ACTIVE,  # FP16 pipe busy
]

# 1초마다 샘플링
fg = pydcgm.DcgmFieldGroup(handle, "my_fields", fields)
fg.SamplingFrequency(1000000)  # 1 sec in usec

samples = fg.GetLatest()
for sample in samples:
    print(f"DRAM: {sample.DCGM_FI_DEV_MEM_COPY_UTIL}%")
    print(f"FP16: {sample.DCGM_FI_PROF_PIPE_FP16_ACTIVE}%")
```

## 자주 하는 실수

### "spec BW를 그대로 capacity planning에 쓴다"

3.35 TB/s spec을 *그대로 가정*하면 *실제로는 2.5 TB/s* 정도 나옵니다. *25% 정도의 헤드룸*을 보고 *latency target*을 잡아야 합니다.

### "BW가 충분하니 더 빠른 chip을 쓴다"

profiling 없이 *BW upgrade*만 하면 *돈만 나가고 효과 없음*일 수 있습니다. *compute bound 단계*에서는 *BW를 늘려도 throughput이 안 늘어납니다*. *Nsight Compute*로 *어디 단계에서 어느 쪽이 병목*인지 먼저 봐야 합니다.

### "STREAM이 충분한 벤치마크다"

STREAM은 *순차 access pattern*입니다. 실제 LLM은 *KV cache random access*가 섞입니다. *효율 측정*은 *대표 workload*로 해야 합니다. *MLPerf inference*가 *현실적인 기준*입니다.

### "MFU만 보면 시스템 효율을 안다"

MFU만 보면 *compute 사용률*은 알지만 *memory 사용률은 모릅니다*. *MBU와 함께* 봐야 *진짜 병목*이 보입니다. *MFU 30%, MBU 90%*면 *memory bound*이고, *MFU 80%, MBU 40%*면 *compute bound*입니다.

### bank conflict를 *컨트롤러 책임*으로만 가정

컨트롤러가 잘 해도 *application의 access pattern*이 *adversarial*이면 conflict가 누적됩니다. CUDA의 *coalesced access*나 ROCm의 *wavefront access* 같은 *software-side 최적화*가 *결정적*입니다.

## 정리

- *공칭 대역폭*에서 *refresh·activation·bank conflict·C/A overhead*로 *15~30%*가 깎입니다.
- *sustained BW*는 일반적으로 *공칭의 70~85%*입니다. random access는 *30%까지* 떨어집니다.
- *Roofline 모델*은 *Arithmetic Intensity*에 따라 *compute bound인지 memory bound인지*를 보여 줍니다.
- AI workload의 *대부분*은 *memory bound*입니다. LLM decode는 *MBU 80%, MFU 5%* 같은 패턴이 흔합니다.
- *compute 25배 vs memory BW 9배* 증가 속도 차이가 *memory wall*입니다.
- *해결책*은 *큰 on-chip cache, HBM 세대 진화, 알고리즘 측 sparsity*의 세 갈래입니다.
- 측정은 *NVIDIA Nsight, AMD rocprof, Intel hl-prof*로 *DRAM 활용률*과 *cache hit rate*를 따로 봅니다.
- 다음 장에서 *HBM의 열·전력 부담*을 다룹니다. *bandwidth 효율의 또 다른 면*입니다.

## 다음 편

[Ch 6: 열 설계와 전력 관리](/blog/embedded/hardware/hbm/chapter06-thermal-power)에서는 *HBM stack 1개가 12 W*를 *얼마나 작은 면적에서* 발산하는지, *thermal throttling*이 *언제 발동*되는지, *liquid cooling*과 *direct-to-die*의 차이를 봅니다.

## 관련 항목

- [Ch 3: HBM 세대 비교](/blog/embedded/hardware/hbm/chapter03-hbm-generations)
- [Ch 6: 열 설계와 전력 관리](/blog/embedded/hardware/hbm/chapter06-thermal-power)
- [Ch 8: NPU·GPU 활용](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)
- CXL Ch 8: ML 가속기 — memory wall 보완 경로
