---
title: "Ch 2: BoW 아키텍처 — 슬라이스 구조"
date: 2026-05-16T02:00:00
description: "Slice·lane·data rate — BoW의 기본 빌딩 블록과 forwarded clock·sideband의 동작."
series: "BoW 개요"
seriesOrder: 2
tags: [bow, slice, architecture]
draft: false
---

## 한 줄 요약

> **"BoW의 모든 것은 *Slice 단위로 scaling*합니다."** — 한 Slice는 *16 data lane + 1 forwarded clock + sideband*입니다. 더 많은 대역폭은 Slice를 *병렬로 늘려서* 확보합니다. per-lane data rate는 *4~16 Gbps*에서 *step별로* 고릅니다.

[Ch 1](/blog/embedded/hardware/bow/chapter01-overview)에서 BoW가 *무엇을 노리는 표준*인지 봤습니다. 이번에는 *실제 구조*를 봅니다. PHY 입장에서 한 Slice가 *어떻게 생겼고*, 어떻게 *동기화*하며, 여러 Slice를 *어떻게 묶는지*까지입니다.

## Slice의 정의

Slice는 BoW의 *원자 단위*입니다. 한 방향(TX 또는 RX)당 다음을 포함합니다.

```text
Slice (단방향)
┌──────────────────────────────────────────────┐
│  16 × data lane                              │
│   ├── lane[0]   ──────────────────────►     │
│   ├── lane[1]   ──────────────────────►     │
│   ├── lane[2]   ──────────────────────►     │
│   ├── ...                                    │
│   └── lane[15]  ──────────────────────►     │
│                                              │
│  1 × forwarded clock                         │
│   └── fwd_clk   ──────────────────────►     │
│                                              │
│  N × sideband (구현마다 다름, 보통 2~4)      │
│   ├── sb[0]     ↔                            │
│   └── sb[1]     ↔                            │
└──────────────────────────────────────────────┘
```

양방향이 필요하면 *Slice 두 개*를 짝지어 *full-duplex* 링크를 만듭니다. *TX Slice*와 *RX Slice*가 *bump 평면 위에 인접*하게 배치되는 게 일반적인 floorplan입니다.

## 16 lane이 왜 16인가

Slice 폭이 *16 lane*으로 정해진 이유는 *현실적 trade-off* 때문입니다.

| 후보 폭 | 장점 | 단점 |
|---------|------|------|
| 8 lane | floorplan 유연, 작은 칩에 유리 | sideband 오버헤드 비율 큼 |
| **16 lane** | 오버헤드 적정, alignment 다루기 좋음 | — |
| 32 lane | sideband 비율 더 낮음 | bump 평면이 길어져 skew 관리 어려움 |
| 64 lane | bandwidth 큼 | skew·power gating 어려움, lane 일부 failure 시 손실 큼 |

16 lane이면 *lane 1개가 죽어도 1/16(6.25%) 손실*입니다. 32 lane이면 *3.1%*로 더 작긴 하지만, 16 lane은 *redundant lane 1개를 추가*해도 *오버헤드 6.25%* 수준입니다. *수율·재구성 유연성*과 *오버헤드*의 절충점이 16입니다.

## per-lane data rate

per-lane data rate는 *공정과 패키징*에 따라 *step별로* 고릅니다.

| 데이터레이트 | 대표 공정 | 패키징 | 신호 무결성 |
|--------------|-----------|--------|--------------|
| 4 Gbps | 16 nm 이하 | organic, BoW Flexi 권장 | 여유 있음 |
| 8 Gbps | 7 nm | organic / silicon bridge | 적정 |
| 12 Gbps | 5 nm | silicon bridge 권장 | 빡빡함 |
| 16 Gbps | 3 nm 이하 | silicon bridge / interposer | 매우 빡빡 |

*Slice당 raw bandwidth*는 *lane 수 × data rate*입니다. 16 lane × 16 Gbps = *256 Gbps = 32 GB/s per Slice*. Slice 16개를 묶으면 *4 Tbps = 512 GB/s*. 이 정도면 *L2-to-L2 코히어런트 링크*로도 쓸 만한 수준입니다.

전송 코드는 *NRZ(2-level)*이 기본이고, 4 Gbps의 *낮은 레이트*에서는 *unterminated*로도 동작합니다. 16 Gbps에서는 *ODT(on-die termination)*가 필수입니다.

## forwarded clock

BoW는 *source-synchronous* 방식입니다. TX 쪽이 *데이터와 함께 clock을 같이 보냅니다*. RX 쪽은 그 clock으로 *데이터를 직접 샘플*합니다.

```text
TX 쪽                                  RX 쪽
┌─────────────┐                       ┌─────────────┐
│  serializer │ ─── data[0..15] ───►  │ deserializer│
│             │                       │             │
│  clock_gen  │ ─── fwd_clk ───────►  │  sampler    │
└─────────────┘                       └─────────────┘
```

CDR(Clock Data Recovery)을 *생략*하는 게 핵심입니다. CDR은 *고전력 + 면적*을 차지합니다. SerDes 기반 PCIe는 lane마다 CDR이 들어가지만, BoW는 *clock을 별도로 보내기 때문에* PHY가 *훨씬 작고 전력이 적습니다*.

대신 *fwd_clk과 data lane 간 skew*를 *PHY가 보정*해야 합니다. *per-lane deskew*가 BoW PHY의 핵심 IP입니다.

```text
초기 상태 (skew 존재)
fwd_clk    ━┐━━━━━┃━━━━━┃━━━━━┃━━━━━┃━━
            샘플 시점만 표시
data[0]   ━━━┓━━━━━┛━━━━━┓━━━━━┛━━━━━┓━━   ← 정렬됨
data[5]   ━━━━━┓━━━━━┛━━━━━┓━━━━━┛━━━━━━   ← 늦음
data[12]  ━┓━━━━━┛━━━━━┓━━━━━┛━━━━━┓━━━━   ← 빠름

deskew 후
data[*]   ━━━┓━━━━━┛━━━━━┓━━━━━┛━━━━━┓━━   ← 모두 fwd_clk과 정렬
```

per-lane delay line으로 *각 lane을 ±1 UI 안으로 정렬*합니다. 16 Gbps라면 1 UI = 62.5 ps입니다.

## sideband

sideband는 *링크 관리·전력 제어·debug*를 위한 *저속 신호*입니다. data lane과는 *완전히 분리된* 채널입니다.

sideband로 처리하는 일들은 다음과 같습니다.

```text
sideband 메시지 종류
├── Initialization
│   ├── reset assert/deassert
│   ├── lane mapping 협상
│   └── deskew training 시작/완료
├── Power state
│   ├── L0 (active)
│   ├── L0s (low-latency idle)
│   ├── L1 (deeper idle, fwd_clk gated)
│   └── L2 (sleep)
├── Error reporting
│   ├── CRC error counter
│   ├── lane failure report
│   └── retraining request
└── Vendor-specific
    └── debug, telemetry
```

UCIe에서는 sideband가 *별도 protocol stack*으로 강하게 정의되지만, BoW는 *훨씬 단순*합니다. 사용자가 *protocol을 자유롭게 정할 수 있도록* 일부 sideband를 *opaque message*로 두기도 합니다.

## Slice 간 alignment

대역폭을 키울 때는 Slice를 *병렬로 묶습니다*. 예를 들어 8 Slice를 묶으면 *128 lane*이 됩니다. 이때 *Slice 간 alignment*가 중요해집니다.

```text
8 Slice 병렬 구성
            ┌─ Slice 0 (lane 0..15) ──┐
            ├─ Slice 1 (lane 16..31) ─┤
            ├─ Slice 2 (lane 32..47) ─┤
TX die  ───►├─ Slice 3 (lane 48..63) ─┤───► RX die
            ├─ Slice 4 (lane 64..79) ─┤
            ├─ Slice 5 (lane 80..95) ─┤
            ├─ Slice 6 (lane 96..111)─┤
            └─ Slice 7 (lane 112..127)┘
                        ↑
              Slice 간 skew도 보정해야
```

각 Slice는 *자체 forwarded clock*을 가지므로, *Slice 간에 위상이 다를 수 있습니다*. 데이터 word가 *여러 Slice에 걸쳐* 분산되면 *word 단위 alignment*가 추가로 필요합니다.

BoW는 *Slice 간 deskew*를 *initialization 시 한 번* 합니다. *training pattern*을 보내고 모든 Slice가 도착하는 시점을 비교해 *지연을 조정*합니다.

```text
Slice별 도착 시점 (training 단계)
                   ─── word boundary ───
Slice 0: ━━━━━━━━━━┓ pattern arrives
Slice 1: ━━━━━━━━━━━┓ pattern arrives  (+0.3 UI)
Slice 2: ━━━━━━━━━┓   pattern arrives  (-0.2 UI)
...

조정 후
Slice 0..7: ━━━━━━━━┓ 모두 같은 word boundary
```

## redundant lane

BoW는 *redundant lane*을 옵션으로 권장합니다. 16 lane Slice에 *예비 lane 1~2개*를 두고, *production test*에서 *bad lane을 골라내 remap*하는 식입니다.

```text
실제 구성 예 (16 + 2 redundant)
┌─ lane 0  (active)        ─┐
├─ lane 1  (active)        ─┤
├─ lane 2  (active)        ─┤
├─ ...                     ─┤
├─ lane 15 (active)        ─┤
├─ lane 16 (redundant 1)   ─┤   ← lane 5가 죽으면 5↔16 remap
└─ lane 17 (redundant 2)   ─┘   ← lane 11이 죽으면 11↔17 remap
```

remap 정보는 *e-fuse* 또는 *one-time-programmable* 영역에 *die마다 저장*됩니다. 자세한 yield 전략은 [Ch 6](/blog/embedded/hardware/bow/chapter06-packaging)에서 다룹니다.

## PHY 블록 다이어그램

한 Slice의 PHY를 *블록 단위*로 보면 다음과 같습니다.

```text
TX PHY (Slice)                       RX PHY (Slice)
┌─────────────────────┐               ┌─────────────────────┐
│  Application Layer  │               │  Application Layer  │
│   (CXL, AXI, etc.)  │               │   (CXL, AXI, etc.)  │
└─────────┬───────────┘               └─────────┬───────────┘
          │                                     │
┌─────────▼───────────┐               ┌─────────▼───────────┐
│  Word formatter     │               │  Word formatter     │
│  (data → 16 lanes)  │               │  (16 lanes → data)  │
└─────────┬───────────┘               └─────────┬───────────┘
          │                                     │
┌─────────▼───────────┐               ┌─────────▼───────────┐
│  Per-lane serializer│   ─ data ─►   │ Per-lane sampler    │
│  (e.g. 8:1 SerDes)  │               │ + deskew            │
└─────────┬───────────┘               └─────────┬───────────┘
          │                                     │
┌─────────▼───────────┐   ─ clk ──►   ┌─────────▼───────────┐
│  Clock driver       │               │  Clock buffer       │
│  (PLL → fwd_clk)    │               │                     │
└─────────────────────┘               └─────────────────────┘
          │                                     │
┌─────────▼───────────┐   ─ sb ───►   ┌─────────▼───────────┐
│  Sideband Tx        │               │  Sideband Rx        │
│  + Link controller  │   ◄── sb ──   │  + Link controller  │
└─────────────────────┘               └─────────────────────┘
```

이 PHY 위에 *protocol layer*가 얹힙니다. 그 protocol이 BoW Memory(메모리 트랜잭션) 또는 일반 packet(CXL.io 등)이 됩니다.

## protocol-agnostic transport

BoW의 *명시적 철학*은 *protocol-agnostic*입니다. PHY는 *raw lane 위의 word 전송*까지만 책임지고, 그 위에 어떤 protocol을 얹을지는 *시스템 설계자가 결정*합니다.

```text
BoW 위에 얹는 protocol 예
├── CXL.io / CXL.cache / CXL.mem  (코히어런트 메모리)
├── AXI-Stream                    (custom IP 연결)
├── PCIe TLP                      (PCIe extender)
├── Ethernet packet               (네트워킹 SoC 칩렛 연결)
└── proprietary 메시지            (벤더 specific)
```

이 점이 UCIe와 *가장 큰 차이*입니다. UCIe는 *protocol layer를 강하게 정의*하지만 BoW는 *느슨하게* 둡니다. *해석은 위 layer가 한다*는 입장입니다.

## 자주 하는 실수

### Slice마다 *별도 PLL*을 두려는 시도

여러 Slice를 *독립적으로 clocking*하면 *Slice 간 word alignment*가 어렵습니다. 하나의 PLL에서 *fwd_clk을 분배*하고, 각 Slice의 *deskew*만 *PHY 단계*에서 처리하는 게 깔끔합니다.

### data lane만 deskew하고 *Slice 간 alignment*를 잊음

per-lane deskew(±1 UI)는 *Slice 내부*만 정렬합니다. *Slice 간*은 *word 단위*로 추가 정렬이 필요합니다. 한 Slice의 word_n이 다른 Slice의 word_n+1과 짝지어지면 *모든 데이터가 어긋납니다*.

### sideband를 *고속*으로 설계

sideband를 data와 같은 속도로 만들 이유가 없습니다. *수십 MHz 수준*이면 충분합니다. 빠르게 만들면 *power gating 어려움 + bump 부족*만 옵니다.

### redundant lane을 *bump map에서 빼먹음*

PHY 시뮬레이션에서는 redundant lane이 잘 동작하지만, *bump map 단계*에서 *physical bump를 할당하지 않으면* 실제로는 쓸 수 없습니다. floorplan 검토 단계에서 *redundant 포함 lane 수*로 bump를 계산해야 합니다.

### CDR이 있으면 *더 좋다*고 가정

PCIe와 똑같이 CDR을 넣어 *좀 더 안정적*으로 만들려는 시도. 면적·전력이 *2~3배*가 되고, BoW의 *저전력 이점*이 사라집니다. forwarded clock 방식의 *철학을 유지*해야 합니다.

## 정리

- Slice는 *16 data lane + forwarded clock + sideband*입니다.
- per-lane data rate는 *4~16 Gbps*에서 step별로 고릅니다.
- 대역폭은 *Slice를 병렬로 늘려* 키웁니다. 1 Slice 256 Gbps, 16 Slice 4 Tbps.
- forwarded clock 방식이라 *CDR이 없습니다*. PHY가 작고 전력이 낮습니다.
- *per-lane deskew*가 PHY의 핵심 IP입니다. 16 Gbps에서 1 UI = 62.5 ps.
- *Slice 간 alignment*는 training 단계에서 *word boundary 기준*으로 보정합니다.
- redundant lane으로 *수율 손실을 흡수*합니다. e-fuse에 remap 정보를 저장합니다.
- BoW는 *protocol-agnostic*입니다. PHY 위에 CXL·AXI·custom을 자유롭게 얹습니다.

## 다음 편

[Ch 3: BoW 2.0 vs UCIe 비교](/blog/embedded/hardware/bow/chapter03-vs-ucie)에서는 *두 D2D 표준*을 *기술·비용·생태계* 척도로 비교합니다. 어느 쪽을 골라야 하는지 *결정 기준*도 함께 봅니다.

## 관련 항목

- [Ch 1: BoW 개요](/blog/embedded/hardware/bow/chapter01-overview)
- [Ch 3: BoW 2.0 vs UCIe 비교](/blog/embedded/hardware/bow/chapter03-vs-ucie)
- [Ch 4: BoW Memory](/blog/embedded/hardware/bow/chapter04-bow-memory)
- [UCIe Ch 2: PHY와 module](/blog/embedded/hardware/ucie/chapter02-phy-module)
- [원문 — OCP ODSA BoW Spec](https://www.opencompute.org/projects/ocp-server/odsa)
