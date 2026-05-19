---
title: "Ch 6: 열 설계와 전력 관리"
date: 2026-05-16T06:00:00
description: "HBM stack의 열 부하·power state·refresh의 cost와 냉각 솔루션."
series: "HBM·GDDR 심화"
seriesOrder: 6
tags: [hbm, thermal, power, refresh]
draft: false
---

## 한 줄 요약

> **"HBM stack 한 개에서 *7~12 W*가 *작은 면적*에서 발열합니다."** — 12-Hi stack은 *11×11 mm*에 *12 W*를 쏟아내 *열 밀도가 GPU die 수준*입니다. *공기 냉각은 곧 한계*에 닿아 *direct-to-die liquid cooling*이 *데이터센터 표준*이 됐습니다. *Temperature-compensated refresh*와 *power state 전환*도 *대역폭 손실의 trade-off*에서 결정됩니다.

[Ch 5](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)에서 *bandwidth가 어디서 깎이는지*를 봤습니다. 이번 장에서는 *그 bandwidth를 유지하는 데 드는 전력*과 *그 전력이 만드는 열*을 봅니다. *HBM은 빠른 대신 뜨겁습니다*. AI 데이터센터의 *cooling 비용*이 *지난 5년간 두 배*가 된 이유입니다.

## HBM stack의 전력 분해

HBM3 stack 1개의 *전력 분해*를 봅니다.

```text
HBM3 stack power breakdown (full load, 819 GB/s)

총 전력: 약 12 W

├── PHY (IO drive)        : 5.5 W  (47%)
│   ├── data lane × 1024  : 4.0 W
│   ├── clock distribution: 1.0 W
│   └── command/address   : 0.5 W
│
├── DRAM core              : 3.5 W  (30%)
│   ├── sense amp          : 1.5 W
│   ├── row decoder/RAS    : 1.0 W
│   └── column path        : 1.0 W
│
├── Refresh                : 2.0 W  (17%)
│   ├── auto refresh       : 1.4 W
│   └── ASR adjustment     : 0.6 W
│
└── Base die logic         : 1.0 W  (8%)
    ├── ECC engine         : 0.4 W
    ├── controller         : 0.4 W
    └── BIST/PMU           : 0.2 W
```

*PHY가 거의 절반*입니다. *1024-bit*의 *모든 lane*이 *동시에 switching*하면 *상당한 전력*이 소모됩니다. 그래서 HBM3는 *DBI(Data Bus Inversion)*로 *switching 빈도를 낮추는* 기능을 *표준*으로 제공합니다.

```text
DBI 동작

원본 데이터: 1010_0101_1111_0001  (4번 switching)
DBI 적용  : 0101_1010_0000_1110 + DBI bit 1 (3번 switching)

수신단: DBI bit = 1이면 반전해서 복원
효과: 1bit invertion으로 평균 switching 30~40% 감소
     → IO power 약 25% 절감
```

## stack의 열 밀도

12 W를 *11×11 mm 면적*에서 발산하면 *열 밀도*는 다음과 같습니다.

```text
HBM3 12-Hi stack heat density

면적: 11 × 11 mm = 121 mm²
전력: 12 W
밀도: 0.099 W/mm² = 9.9 W/cm²

비교:
- 일반 CPU die: 5~15 W/cm²
- GPU die (H100): 50~80 W/cm² (3D 적층 안 함)
- LED chip: 20~50 W/cm²
- HBM3 stack: 10 W/cm² (top surface 기준)
```

*surface 기준 열 밀도*는 GPU보다 *낮습니다*. 그러나 문제는 *3D 적층 구조*입니다. *맨 위 die*에서 발생한 열이 *11장의 die를 통과해* *base die까지 빠져나가야* 합니다.

```text
열 흐름 (3D stack)

         ← cooling 표면 (cold plate)
   top   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         │  DRAM die 12  ←━ refresh, sense amp 활동
         │  TIM (thermal interface)
         │  DRAM die 11
         │  TIM
         │  ...
         │
         │  DRAM die 1
         │  TIM
   base  │  Base die        ←━ PHY가 가장 뜨거움
         ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         ← interposer (열 발산 잘 안 됨)

문제: 위에서 아래로 열 흐름
- TIM resistance × 12층 = 누적 저항
- base die가 가장 뜨거움 (PHY + 모든 die 열이 모임)
- 윗단 DRAM은 그나마 cold plate로 직접 발산
```

*base die의 정션 온도*가 *85~95°C*에 쉽게 도달합니다. *thermal throttling*이 *바로 그 지점*에서 발동합니다.

## Refresh — 발열과 신뢰성의 trade-off

DRAM 데이터는 *capacitor*에 *전하 형태*로 저장됩니다. *시간이 지나면 leakage*로 사라집니다. *주기적인 refresh*가 *데이터를 다시 채워* 보존합니다.

```text
Refresh 주기

JEDEC HBM3 표준:
  tREFI (refresh interval) = 3.9 μs
  tRFC (refresh duration) = 350 ns

64 ms 안에 모든 row 한 번씩:
  64 ms / 3.9 μs = 16384 refresh per 64 ms

문제: 온도가 올라가면 leakage 가속
  85°C 미만: 64 ms 충분
  85~95°C : 32 ms (2배 자주)
  95°C 이상: 16 ms (4배 자주)
```

*고온에서 refresh가 늘어나면 발열이 또 늘어납니다*. *positive feedback loop*가 형성되어 *thermal runaway*로 이어질 수 있습니다. 그래서 *ASR(Adaptive Self-Refresh)*가 *세 단계 자동 전환*을 합니다.

```text
ASR (Adaptive Self-Refresh) 전환

온도 zone:
  Cold  (< 45°C) : refresh interval × 2 (절약)
  Normal (45-85°C): refresh interval × 1 (표준)
  Hot   (85-95°C) : refresh interval × 1/2 (강화)
  Extreme (>95°C) : refresh interval × 1/4 (긴급)

base die에 thermal sensor (8개 zone)
온도에 따라 self-refresh mode 자동 전환
host controller는 MRS register로 hint만 제공
```

*ASR이 활성*이면 *cold*일 때 *bandwidth가 1~2% 추가 확보*되고, *hot*일 때 *3~5% 손실*이 발생합니다. *온도 관리가 결국 bandwidth 관리*입니다.

## Temperature-Compensated Refresh

ASR의 진화형으로 *TC Refresh*가 있습니다. *die별·zone별*로 *개별 refresh rate*를 적용합니다.

```text
TC Refresh

stack 안 die별 sensor:
  die 1 (base 근처) : 92°C → refresh × 2
  die 6 (중간)       : 78°C → refresh × 1
  die 12 (top)       : 70°C → refresh × 1

기존 방식: 가장 뜨거운 die에 맞춰 전체 refresh
TC 방식 : die별로 다르게 → 평균 refresh 감소 → 평균 power 감소

효과: 전체 stack power 약 0.5~1 W 절약
```

HBM3E부터 *TC Refresh*가 *표준 옵션*이 됐습니다. NVIDIA H100·H200의 *base die controller*가 이 기능을 활용합니다.

## Power state

HBM은 *몇 가지 power state*를 가집니다.

```text
HBM power states

  PD-Exit (active)
  ├── Read/Write active
  └── ~10~12 W per stack

  Power-Down
  ├── DRAM core clock gated, IO 유지
  └── ~5 W per stack
  └── tXP (exit latency): ~10 ns

  Self-Refresh
  ├── DRAM 자체 refresh, controller idle 가능
  └── ~2.5 W per stack
  └── tXSR (exit latency): ~200 ns

  Deep Sleep (HBM3+ optional)
  ├── PLL off, IO termination off
  └── ~0.5 W per stack
  └── tXDS (exit latency): ~10 μs
```

AI inference workload는 *대부분 active state*에 있어 *power state 전환 효과가 작습니다*. 그러나 *training cluster*에서 *evaluation phase*나 *checkpoint save* 동안 *self-refresh로 진입*하면 *수십 W 절감*이 *cluster 전체*로 *수 kW*가 됩니다.

## Cooling 솔루션

HBM이 *interposer 위*에 *GPU/NPU 옆*에 붙어 있으면 *cooling*이 *둘을 동시에* 처리해야 합니다.

```text
H100/H200/B200 cooling stack

      ┌────────────────────────┐
      │   Cold plate (Cu)      │   ← liquid 또는 vapor chamber
      ├────────────────────────┤
      │   TIM2 (액체 metal)    │
      ├────────────────────────┤
      │   Lid                  │
      ├────────────────────────┤
      │   TIM1 (high-conductive)│
      ├────────────────────────┤
      │   GPU die + HBM stacks │   ← interposer 위
      ├────────────────────────┤
      │   Underfill            │
      ├────────────────────────┤
      │   Organic substrate    │
      ├────────────────────────┤
      │   Ball grid array      │
      └────────────────────────┘
```

*공기 냉각의 한계*는 *500~600 W*입니다. NVIDIA H100 SXM이 *700 W*인데 *공기로 어렵습니다*. 그래서 *서버 차원에서 liquid cooling*이 *기본*이 됐습니다.

```text
서버 cooling 비교

A100 (400 W TDP):
  - rack 8 GPU: 3.2 kW
  - 공기 냉각 가능 (front-to-back 40 mm fan)
  - rack 12 kW

H100 (700 W TDP):
  - rack 8 GPU: 5.6 kW
  - 공기 냉각 한계점
  - SXM5 module: liquid cooling 옵션

B200 (1000 W TDP):
  - rack 8 GPU: 8 kW
  - liquid cooling 필수
  - direct-to-die cold plate

GB200 NVL72 (액체 냉각 rack):
  - 72 GPU × 1200 W = 86 kW per rack
  - 100% liquid cooled
  - facility-level cooling 인프라 필요
```

NVIDIA의 *Blackwell B200*은 *공기 냉각 옵션이 없습니다*. *GB200 NVL72 rack*은 *처음부터 liquid-only*로 설계됐습니다.

## Direct-to-die cooling

가장 공격적인 cooling은 *direct-to-die*입니다. *lid를 제거*하고 *cold plate가 die에 직접 접촉*합니다.

```text
Direct-to-die cooling (lapping)

기존 (lid 포함):
   cold plate → TIM2 → lid → TIM1 → die
   thermal resistance: 0.04 K/W (lid + TIM1+2)

direct-to-die:
   cold plate → TIM (single, liquid metal) → die
   thermal resistance: 0.015 K/W
   
→ junction temperature 약 10~15°C 낮음
→ same TDP에서 더 안정적
→ 또는 같은 온도에서 더 높은 TDP 허용
```

대신 *기계적 변형 위험*이 커서 *cold plate flatness*가 *< 25 μm*로 요구됩니다. *대형 데이터센터*만 *감당할 수 있는* 정밀도입니다.

## Thermal throttling

HBM이 *임계 온도*에 도달하면 *thermal throttling*이 *bandwidth를 자발적으로 깎습니다*.

```text
Thermal throttling stages

Tj_max (HBM3): 95°C

stage 1 (T = 85°C):
  - ASR 모드를 hot으로 전환
  - refresh × 2
  - 효과: BW -3%

stage 2 (T = 90°C):
  - clock frequency -10%
  - 효과: BW -10%

stage 3 (T = 95°C):
  - clock frequency -25%
  - 효과: BW -25%

stage 4 (T = 100°C):
  - emergency shutdown
  - host에 thermal interrupt
```

H100에서 *thermal throttle 발생*은 *NVIDIA-SMI*로 확인됩니다.

```bash
# throttle 상태 확인
nvidia-smi --query-gpu=temperature.memory,clocks_throttle_reasons.active --format=csv

# 출력 예
temperature.memory, clocks_throttle_reasons.active
85, 0x0000000000000004    # MEM_THERMAL_SLOWDOWN bit
```

데이터센터에서는 *throttle event*가 *workload SLA*를 깨므로 *cooling 인프라를 over-provision*합니다.

## Power delivery — VRM 부담

HBM3는 *VDD 1.1 V × 12 W = 11 A*를 *stack 하나*에 공급해야 합니다. *5 stack 시스템*이면 *55 A*입니다. *50 mV ripple* 이하로 깨끗하게 줘야 합니다.

```text
HBM3 power rail

VDD     1.1 V  ← DRAM core + base die
VDDQ    0.4 V  ← IO drivers (1024-bit lanes)
VPP     1.8 V  ← word line boost (charge pump 내부)

per-stack current:
  VDD : 11 A (12 W / 1.1 V)
  VDDQ: 12 A (4.8 W / 0.4 V)
  → 총 24 A 공급 필요

GPU 패키지 power:
  GPU die: 500 W / 0.75 V ≈ 670 A (!)
  HBM 5 stack: 60 W / 다중 rail
```

GPU die에 *670 A*가 공급되어야 합니다. *VRM이 substrate 위에 동심원 배치*되고, *substrate가 12층 buildup*으로 *전류 분배*를 합니다. *Power Integrity*가 *signal integrity 못지않게 어렵습니다*.

## Korea 인더스트리의 cooling 동향

한국 데이터센터의 *AI cluster cooling* 현황은 다음과 같습니다.

```text
국내 AI 데이터센터 cooling (2025)

KT 클라우드 천안:
  - H100 SXM5 (공기 냉각 700 W)
  - PUE 1.4

네이버 각춘천:
  - 자체 LCM(Liquid Cold-plate Module) 개발
  - PUE 1.2

삼성SDS / SK텔레콤:
  - B200 도입 예정, full liquid cooling 준비
  - 시설 retrofit 진행

→ Korean fab에서 HBM 생산하면서
   국내 AI 인프라는 cooling 인프라 추격 중
```

## 자주 하는 실수

### "HBM이 GPU보다 *덜* 뜨겁다"

surface 열 밀도는 GPU가 5~8배 큽니다. 그러나 HBM은 *3D 적층*이라 *내부 die*는 *열 빠져나갈 길*이 적어 *junction temperature*는 *비슷하게 뜨겁습니다*. *base die 92°C*가 흔합니다.

### refresh 증가가 *문제 아님*이라는 가정

refresh × 2가 되면 *bandwidth 5%*가 깎이고 *power 0.5 W*가 늘어납니다. 이게 *추가 발열*이 되어 *또 refresh가 늘어나는* feedback loop입니다. *온도 zone*을 *Normal 안*에 유지하는 게 *대역폭 유지*에 결정적입니다.

### "공기 냉각으로 충분하다"

H100까지는 가능했습니다. B200·B300은 *공기 옵션이 없습니다*. NVIDIA가 *공기 SKU를 안 만듭니다*. cooling 인프라 *없이 B200을 도입*하는 것은 *불가능*입니다.

### Cold plate flatness를 *과소평가*

direct-to-die에서 *25 μm flatness*가 안 나오면 *die corner에 stress*가 누적되어 *cracking*이나 *delamination*이 발생합니다. *카드 수명*이 *수개월*로 *극단적으로 짧아질* 수 있습니다.

### *RTX 카드의 GDDR cooling*과 *HBM cooling*을 동일시

GDDR은 *카드 PCB*에 *분산*되어 *카드 fan*으로 *전체 면적 냉각*이 됩니다. HBM은 *GPU die 옆 좁은 면적*에 *집중*되어 *cold plate에 의존*합니다. *cooling 전략 자체가 다릅니다*.

## 정리

- HBM3 stack 1개는 *7~12 W*를 *11×11 mm 면적*에서 발산합니다.
- *PHY가 전력의 47%*를 차지하고, *DBI*로 *switching을 줄여* IO power를 절감합니다.
- *3D 적층 구조*라 *base die의 junction temperature*가 *90°C+*에 쉽게 도달합니다.
- *Refresh는 온도에 따라 자동 조정*됩니다. ASR과 TC Refresh가 *bandwidth와 power의 trade-off*를 동적으로 잡습니다.
- *Power state*는 active·power-down·self-refresh·deep-sleep의 네 단계입니다.
- *공기 냉각의 한계*는 *500~600 W*입니다. H100 이후는 *liquid cooling*이 *기본*입니다.
- *direct-to-die cooling*은 *lid를 제거*해 *thermal resistance를 60% 낮춥니다*. *대형 데이터센터의 표준*입니다.
- *Thermal throttling*은 *85°C부터 단계적*으로 발동되어 *bandwidth가 3~25% 깎입니다*.
- 다음 장에서 *메모리 컨트롤러가 HBM을 어떻게 보는지* 들어갑니다.

## 다음 편

[Ch 7: 메모리 컨트롤러 인터페이스](/blog/embedded/hardware/hbm/chapter07-memory-controller)에서는 *bank·row·column 계층*, *command scheduling*, *address mapping XOR hash*, *per-bank refresh* 같은 *컨트롤러 설계*의 핵심을 다룹니다.

## 관련 항목

- [Ch 2: HBM 스택 구조와 TSV](/blog/embedded/hardware/hbm/chapter02-hbm-stack)
- [Ch 5: 대역폭 계산과 병목 분석](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)
- [Ch 7: 메모리 컨트롤러 인터페이스](/blog/embedded/hardware/hbm/chapter07-memory-controller)
- [UCIe Ch 8: runtime recalibration](/blog/embedded/hardware/ucie/chapter08-runtime-recalibration) — 온도 변화 대응
