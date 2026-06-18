---
title: "HBM 메모리 컨트롤러 분석 — Bank·Row·Column·Address Mapping·Scheduling"
date: 2026-05-16T09:07:00
description: "Bank·row·column·command — 컨트롤러가 보는 HBM과 scheduling·address mapping."
series: "HBM·GDDR 심화"
seriesOrder: 7
tags: [hbm, memory-controller, bank, scheduling]
draft: false
---

## 한 줄 요약

> **"메모리 컨트롤러가 *bank parallelism을 짜내는 정도*가 *sustained BW의 80~95%*를 결정합니다."** — bank·row·column 계층, command scheduling, address XOR mapping, per-bank refresh가 모두 *컨트롤러의 책임*입니다. 같은 HBM3 stack이라도 *컨트롤러 설계가 미숙하면 효율이 50%*로 떨어집니다.

[Ch 6](/blog/embedded/hardware/hbm/chapter06-thermal-power)에서 *HBM의 전력과 열*을 봤습니다. 이번 장은 *컨트롤러가 HBM을 어떻게 보는지*입니다. *DRAM 명령 인터페이스*, *bank scheduling*, *address mapping*은 *NPU/GPU 설계의 차별화 지점*이기도 합니다. NVIDIA·AMD·Google·Rebellions가 *같은 HBM3 stack을 쓰면서도 다른 효율*을 내는 이유가 *컨트롤러 IP*에 있습니다.

## 컨트롤러가 보는 HBM

컨트롤러 입장에서 HBM3 stack 1개는 다음 *주소 공간*입니다.

```text
HBM3 stack 주소 계층

stack (1024-bit)
├── Channel 0 .. Channel 15  (16 channel)
│   └── Pseudo Channel 0, 1
│       └── Bank Group 0 .. 3 (HBM3)
│           └── Bank 0 .. 3
│               └── Row 0 .. 32767  (16 Gb DRAM 기준)
│                   └── Column 0 .. 1023
│                       └── prefetch 8 byte burst

주소 비트:
[Channel : 4][PC : 1][BankGroup : 2][Bank : 2][Row : 15][Column : 6][Byte : 6]
                                                                       ↑
                                                              burst boundary
```

총 *bank 수*는 *16 channel × 2 PC × 4 BG × 4 bank = 512 bank*입니다. *512 outstanding request*가 *이론상* 동시 가능합니다.

| 단위 | 폭 | 개수 (HBM3) |
|------|----|-------------|
| Bit per cell | 1 | — |
| Column | 32 byte (burst) | 1024 / channel |
| Row | 1 KB | 32768 / bank |
| Bank | 32 MB | 4 / BG |
| Bank Group | 128 MB | 4 / PC |
| Pseudo Channel | 512 MB | 2 / channel |
| Channel | 1 GB | 16 / stack |
| Stack | 16 GB (16 Gb die × 8) ~ 36 GB (24 Gb die × 12) | — |

## DRAM 명령 인터페이스

컨트롤러가 HBM에 보내는 *기본 명령*은 다음과 같습니다.

```text
HBM3 commands

  활성화
  ACT  (Activate)        : row를 sense amp에 올림
  PRE  (Precharge)       : row를 닫고 bit line 충전
  PREA (Precharge All)   : 모든 bank precharge

  데이터
  RD   (Read)            : column 읽기 (burst 8)
  RDA  (Read + AutoPre)  : 읽고 자동 precharge
  WR   (Write)           : column 쓰기
  WRA  (Write + AutoPre) : 쓰고 자동 precharge

  Refresh
  REFab (All-bank)       : 모든 bank refresh
  REFsb (Single-bank)    : 한 bank만 refresh
  REFpb (Per-bank)       : 지정 bank refresh

  Mode
  MRS   (Mode Register)  : config 변경
  ZQCAL (impedance cal)  : on-die termination 조정
  RFM   (Refresh Mgmt)   : Row Hammer 대응
```

명령 사이에는 *minimum timing constraint*가 있습니다.

```text
주요 timing parameter (HBM3, 3.2 GHz clock)

tRCD  (ACT → RD/WR latency)         : 15 ns (~48 clock)
tRP   (PRE → ACT latency)            : 15 ns (~48 clock)
tRAS  (ACT → PRE 사이 최소)          : 32 ns
tWR   (WR → PRE recovery)            : 18 ns
tRC   (ACT → ACT 같은 bank)          : tRAS + tRP = 47 ns
tCCD_L (RD → RD same bank group)     : 4 clock
tCCD_S (RD → RD different BG)        : 2 clock  ← 빠른 인터리브 가능
tFAW  (4개 row activation 윈도)      : 30 ns
```

핵심 통찰은 *tCCD_L < tCCD_S*입니다. *다른 bank group끼리 인터리브*하면 *명령 발행 간격이 2 clock*까지 줄어 *bus utilization*이 *최고치*가 됩니다.

## Scheduling — Open vs Closed Page

같은 row를 *계속 열어 둘지(Open)* *바로 닫을지(Closed)*가 핵심 정책 선택입니다.

**Open Page Policy** — 같은 row를 *열어 두고* 여러 column을 연속 read. row hit이면 `tCL`만 필요. row miss 시 `PRE → ACT`로 새 row 진입.

```text
ACT row=R
RD col=0
RD col=1
RD col=2
RD col=3
RD col=7
PRE
ACT row=R'
```

- **장점**: row hit 비율이 높으면 latency 짧음
- **단점**: row miss 시 `tRP + tRCD = 30 ns` 추가

**Closed Page Policy** — 한 번 읽고 바로 auto-precharge로 닫음. row buffer locality가 없을 때 단순.

```text
ACT row=R + RD col=0 + auto PRE
ACT row=R + RD col=1 + auto PRE
ACT row=R + RD col=2 + auto PRE
```

- **장점**: row buffer locality 없을 때 simple
- **단점**: row hit 가능성 버림

대부분 컨트롤러는 *Adaptive Page Policy*를 씁니다. *최근 access history*를 보고 *open할지 close할지* 결정합니다.

```text
Adaptive page policy 예

queue를 본 시점에 같은 row 추가 access가 있으면:
  open page 유지
없으면:
  RDA/WRA로 auto precharge

NVIDIA H100, AMD MI300X 모두 adaptive 사용
```

## Bank parallelism — 인터리브의 핵심

컨트롤러가 *bank parallelism*을 짜내는 방식이 *효율의 80%*를 결정합니다.

![Bank Interleaving — Bad vs Good](/images/blog/hbm/diagrams/ch07-bank-interleaving.svg)

- **Bad** — 같은 bank만 hit. 매번 PRE를 기다려야 하고 나머지 511 bank가 idle → BW utilization **6 %**.
- **Good** — 라운드 로빈. 모든 bank가 pipeline으로 동작 → BW utilization **90 %+**.

이를 가능하게 하려면 *address-to-bank mapping*이 *균등*해야 합니다.

## Address mapping — XOR hash

linear mapping(상위 비트 = bank)은 *연속 access*에서 *bank conflict 다발*입니다.

```text
Linear mapping (나쁨)

address = 0x0000_0000 → bank 0
address = 0x0010_0000 → bank 1  (1 MB step)
address = 0x0020_0000 → bank 2
...

연속 메모리 sweep(matrix scan):
  addr[0..N]이 모두 bank 0  ← 한 bank만 hit!
```

해결책은 *XOR hash mapping*입니다.

**XOR mapping**

```text
bank_index = addr[bits low] XOR addr[bits mid] XOR addr[bits high]
```

이 방식의 효과:

- 연속 access가 자동으로 bank 분산
- adversarial pattern을 만들기 어려움
- stride access (matrix column scan)도 분산

```c
// 의사 코드: HBM3 컨트롤러 address mapping
uint64_t addr;  // 입력 byte address

// burst boundary 무시
uint64_t base = addr >> 5;  // 32 byte burst

// XOR로 channel 계산 (4 bit)
int ch = (base >> 4) & 0xF;
ch ^= (base >> 12) & 0xF;
ch ^= (base >> 20) & 0xF;

// XOR로 bank 계산 (4 bit)
int bank = (base >> 8) & 0xF;
bank ^= (base >> 16) & 0xF;

// row, column 분리
int row = (base >> 12) & 0x7FFF;
int col = base & 0x3F;
```

실제 GPU/NPU 컨트롤러의 XOR pattern은 *비공개 IP*입니다. *workload-specific tuning*이 들어가서 *AI training pattern*에 *특히 최적화*되어 있습니다.

## Per-bank refresh — bandwidth 보호

전통적인 *all-bank refresh(REFab)*는 *모든 bank를 350 ns 동안 stall*시킵니다. *bus가 통째로 멈춥니다*.

```text
REFab의 비용

각 REFab: 350 ns × bus 정지
64 ms / 3.9 μs = 16384 REFab per cycle
total stall: 16384 × 350 ns = 5.7 ms / 64 ms = 8.9%

→ 8.9% bandwidth loss
```

*per-bank refresh(REFpb)*는 *한 bank만 refresh*합니다. *다른 bank는 계속 일합니다*.

![REFab vs REFpb](/images/blog/hbm/diagrams/ch07-refpb.svg)

REFpb는 한 번에 *한 bank만* refresh합니다. 나머지 bank는 그동안에도 active 상태 유지.

- **bandwidth loss**: 8.9 % / 16 banks ≈ **0.6 %**
- **조건**: 컨트롤러가 bank별 refresh schedule을 추적해야 함
- HBM3에서 표준 지원

NVIDIA·AMD 컨트롤러는 *REFpb를 기본*으로 합니다. *AI training cluster*에서 *0.6 vs 9 %*의 *효율 차이*가 *수십억 원 단위*입니다.

## Read-write turnaround

같은 *bus 위*에서 *Read 후 Write*나 *Write 후 Read*는 *turnaround penalty*가 있습니다.

**Turnaround 비용**

| 방향 | 비용 |
|------|------|
| RD → WR (same bank) | `tRTW = 8 clock` (data bus 방향 전환) |
| WR → RD (same bank) | `tWTR = tWR + tCL = 18 + 14 = 32 ns` |

queue에서 RD/WR가 섞이면 turnaround가 빈번해집니다. **batch grouping**이 효율적입니다.

좋은 컨트롤러는 *RD batch + WR batch* 형태로 *grouping*해 *turnaround를 최소화*합니다.

![Batched RD/WR Scheduling](/images/blog/hbm/diagrams/ch07-batched-rw.svg)

queue가 `R W R W R W R W`로 도착해도 컨트롤러가 `R R R R / W W W W / R R R R`로 묶어 turnaround를 *N번 → 2번*으로 줄입니다.

## ECC 처리

HBM3 on-die ECC는 *base die*가 처리하지만, *컨트롤러도 추가 ECC*를 둘 수 있습니다.

![HBM3 ECC Layers](/images/blog/hbm/diagrams/ch07-ecc-layers.svg)

NVIDIA H100은 *system-level ECC*를 *on*으로 출하합니다. 데이터센터 신뢰성을 위해서입니다.

## Outstanding request queue

컨트롤러는 *수십 개의 outstanding request*를 *동시에 추적*해 *bank 별로 schedule*합니다.

![HBM 컨트롤러 내부 큐 — address mapping, per-bank queue, scheduler, bus](/images/blog/hardware/hbm/diagrams/ch07-controller-queue.svg)

FR-FCFS는 *First-Ready, First-Come-First-Served*입니다. *같은 row에 있는 request*가 우선 처리됩니다.

큐 깊이가 *32~64 per bank*에 달합니다. *AI workload의 outstanding miss 수*가 *수천*에 달하기 때문에 *queue가 깊어야* 합니다.

## NPU vs GPU 컨트롤러 차이

같은 HBM3을 쓰지만 *NPU와 GPU의 컨트롤러*는 *최적화 방향*이 다릅니다.

```text
NVIDIA GPU 컨트롤러 (H100)

- generic workload 대응 (graphics, HPC, AI)
- adaptive page policy (다양한 access pattern)
- L2 cache 큼 (50 MB), MSHR 수천 개
- cache miss → controller로 lat masking

AMD MI300X 컨트롤러
- AI focused
- 8 stack × 64 channel parallelism
- Infinity Fabric로 cache coherent

Google TPU 컨트롤러
- systolic array에 맞춘 access pattern
- predictable strided access
- prefetch 기반 latency hiding

Rebellions Atom (Korean NPU)
- transformer-specific access
- attention KV cache locality 최적화
- per-tile address remap

Sapeon X330 (SK Telecom NPU)
- inference 전용
- weight streaming 우선
- DRAM-side compression 옵션
```

같은 HBM3 stack에서도 *컨트롤러 IP의 차이*가 *workload별 효율 5~15%*를 만듭니다.

## AXI4-Stream wrapper

NPU·FPGA 설계에서 *HBM 컨트롤러*를 *AXI-Stream*으로 *추상화*하는 경우가 많습니다.

![HBM ↔ NPU 인터페이스 — AXI-S wrapper가 NPU에 표준 인터페이스 제공](/images/blog/hardware/hbm/diagrams/ch07-npu-axi.svg)

Xilinx HBM Controller IP가 *AXI-Stream wrapper*로 *32-channel access*를 제공합니다. 각 channel은 *256-bit*로 동작하고 *내부적으로 16개 HBM channel*로 분산됩니다.

```text
Xilinx Alveo U55C (16 GB HBM2)

User logic ──► AXI4 [256-bit × 32 master]
                       │
                       ▼
              HBM Controller IP
                       │
                       ▼
              16 HBM channels × 2 stack
```

## 자주 하는 실수

### "address mapping은 컨트롤러 IP가 알아서 한다"

기본 mapping은 *generic*입니다. *workload-specific tuning*을 하면 *5~10% bandwidth 추가*가 가능합니다. AI training cluster에서 큰 효과입니다.

### bank 수가 *많으면 무조건 좋다*고 가정

bank가 늘어나면 *컨트롤러 큐*가 깊어져야 하고 *scheduler logic*이 복잡해집니다. *큐 자체가 die area를 차지*합니다. *HBM3의 512 bank*가 *현재 GPU에서 fully utilize*되지 않습니다.

### REFab과 REFpb를 *비슷*하게 가정

8.9% vs 0.6% bandwidth loss는 *15배 차이*입니다. 컨트롤러가 *REFpb를 지원하지 않으면* *AI training의 단가가 크게 달라집니다*.

### "open page가 *항상* 좋다"

random access workload에서는 *closed page가 빠릅니다*. *workload별 page policy 선택*이 *5~10% 차이*를 냅니다. Adaptive가 가장 안전합니다.

### ECC overhead를 *무시*

system-level ECC를 *on*하면 *bus utilization*에서 *12.5%*가 redundancy로 쓰입니다. 그러나 *off*하면 *수일 단위 training*에서 *bit flip*이 *모델을 망칠* 수 있습니다. *데이터센터 표준은 항상 ECC on*입니다.

## 정리

- HBM3 컨트롤러는 *512 bank*를 *동시 추적*하며 *FR-FCFS scheduling*으로 동작합니다.
- *bank parallelism*이 *sustained BW의 80~95%*를 결정합니다.
- *address XOR mapping*은 *연속 access도 자동으로 bank 분산*시킵니다.
- *open vs closed page policy*는 *workload pattern*에 따라 *adaptive*로 선택해야 합니다.
- *REFpb*는 *REFab 대비 8.3% bandwidth*를 절약합니다. AI training에서 *반드시 사용*입니다.
- *RD/WR turnaround penalty*는 *batch grouping*으로 *최소화*합니다.
- NVIDIA·AMD·Google·Korean NPU(Rebellions, Sapeon)는 *같은 HBM3*를 쓰지만 *컨트롤러 IP의 차이*로 *workload별 효율*이 *5~15% 갈립니다*.
- Xilinx 같은 FPGA 솔루션은 *AXI-Stream wrapper*로 *32 master*를 *HBM channel에 매핑*합니다.

## 다음 편

[Ch 8: NPU·GPU에서의 활용](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)에서는 *LLM weight·activation·KV cache가 HBM에 어떻게 자리잡는지*를 봅니다. *시리즈의 마무리*입니다.

## 관련 항목

- [Ch 5: 대역폭 계산과 병목 분석](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)
- [Ch 6: 열 설계와 전력 관리](/blog/embedded/hardware/hbm/chapter06-thermal-power)
- [Ch 8: NPU·GPU 활용](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)
- CXL Ch 4: CXL.mem — 외부 메모리 컨트롤러
- BoW Ch 4: BoW Memory — 메모리 트랜잭션의 일반론
