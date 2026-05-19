---
title: "Ch 3: HBM2/HBM2E/HBM3/HBM3E 스펙 비교"
date: 2026-05-16T03:00:00
description: "세대별 bandwidth·capacity·signaling — JEDEC 표준의 진화 흐름."
series: "HBM·GDDR 심화"
seriesOrder: 3
tags: [hbm, hbm2, hbm3, hbm3e, hbm4]
draft: false
---

## 한 줄 요약

> **"세대마다 *pin rate 1.5~2배*가 표준 행보입니다."** — HBM2(2.4 Gbps) → HBM2E(3.6) → HBM3(6.4) → HBM3E(9.6) 순으로 *pin rate*가 뛰었습니다. *stack당 bandwidth*는 *307 GB/s → 1.2 TB/s+*로 *4년 만에 4배*가 됐습니다. HBM4는 *bus width를 2배(2048-bit)*로 늘려 *signaling 부담은 낮추면서 대역폭은 1.6 TB/s+*를 노립니다.

[Ch 2](/blog/embedded/hardware/hbm/chapter02-hbm-stack)에서 *물리적 구조*를 봤습니다. 이번 장은 *시간 축*입니다. 같은 *base die + DRAM die* 골격이 *세대마다 어떻게 진화*했는지, JEDEC 표준이 *어떤 새 기능*을 더했는지를 봅니다.

## 한눈에 보는 표

| 세대 | JEDEC 표준 | 양산 시기 | per-pin | Stack BW | Stack capacity | I/O | VDD |
|------|-----------|-----------|---------|----------|----------------|-----|-----|
| HBM | JESD235 | 2015 | 1.0 Gbps | 128 GB/s | 1·4 GB | 1024-bit | 1.2 V |
| HBM2 | JESD235A | 2018 | 2.4 Gbps | 307 GB/s | 4·8 GB | 1024-bit | 1.2 V |
| HBM2E | JESD235B | 2020 | 3.6 Gbps | 461 GB/s | 8·16 GB | 1024-bit | 1.2 V |
| HBM3 | JESD238 | 2022 | 6.4 Gbps | 819 GB/s | 16·24 GB | 1024-bit | 1.1 V |
| HBM3E | JESD238A | 2024 | 9.2~9.8 Gbps | 1.18~1.25 TB/s | 24·36 GB | 1024-bit | 1.1 V |
| HBM4 | JESD238B (예정) | 2025~2026 | 6.4~8.0 Gbps | 1.6~2.0 TB/s | 36·48·64 GB | 2048-bit | 1.0 V |

각 세대의 *변곡점*을 짚어 가겠습니다.

## HBM (2015) — 시작

AMD Fury X(Fiji)와 함께 *첫 양산*된 세대입니다. SK 하이닉스가 제조했습니다.

```text
HBM (1세대)
├── per-pin       : 1.0 Gbps
├── bus           : 1024-bit
├── stack BW      : 128 GB/s
├── max stack     : 4-Hi
├── max capacity  : 4 GB / stack
├── channel       : 8 × 128-bit
└── VDD           : 1.2 V

대표 카드:
- AMD Radeon R9 Fury X (4 stack × 1 GB = 4 GB, 512 GB/s)
```

당시 *상황을 보면 놀라운 수치*였습니다. 같은 시기 GDDR5는 *7 Gbps × 256-bit = 224 GB/s*였습니다. HBM 4 stack이 *2배 이상*의 대역폭을 *훨씬 적은 전력*으로 냈습니다.

문제는 *capacity*와 *cost*였습니다. 4 GB로는 *2015년에도 부족*했고, *interposer 비용*이 *GPU die보다 비쌌습니다*. 그래서 *1세대는 게이밍에서 빠지고* HPC로 이동합니다.

## HBM2 (2018) — 본격화

NVIDIA P100·V100, Google TPU v2와 함께 *데이터센터의 표준*이 됐습니다.

```text
HBM2 (2018)
├── per-pin       : 2.4 Gbps (clock 1.2 GHz)
├── stack BW      : 307 GB/s
├── max stack     : 8-Hi
├── max capacity  : 8 GB / stack
├── pseudo channel: 16 × 64-bit (PC 도입)
└── ECC           : SECDED 옵션

대표 카드:
- NVIDIA V100 (4 stack × 4 GB = 16 GB, 900 GB/s)
- NVIDIA V100 32GB (4 stack × 8 GB)
- Google TPU v2/v3
```

핵심 변화는 *Pseudo Channel*입니다. 한 channel을 *반쪽씩 독립 명령*으로 운영해 *bank-level parallelism*을 *위층*으로 한 단계 더 올렸습니다.

```text
PC 도입 전 (HBM):
  Channel 0 (128-bit) ─── 한 번에 한 명령
  
PC 도입 후 (HBM2):
  Channel 0
  ├── PC0 (64-bit) ─── 독립 명령 A
  └── PC1 (64-bit) ─── 독립 명령 B  ← 동시 수행
```

bank conflict 회피·effective bandwidth 향상에 큰 영향을 줬습니다.

## HBM2E (2020) — 중간 단계

HBM2의 *클럭만 끌어올린* 마이너 버전입니다.

```text
HBM2E (2020)
├── per-pin       : 3.6 Gbps (Samsung Flashbolt 3.2 Gbps)
├── stack BW      : 461 GB/s
├── max stack     : 8-Hi
├── max capacity  : 16 GB / stack (16 Gb DRAM)
└── 신호 변화 거의 없음, DRAM 밀도만 2배

대표 카드:
- NVIDIA A100 40GB (5 stack × 8 GB, 1.6 TB/s)
- NVIDIA A100 80GB (5 stack × 16 GB, 2.0 TB/s)
- AMD MI100 (4 stack × 8 GB, 1.2 TB/s)
```

A100이 *HBM2E*의 대표 시스템입니다. *5 stack 구성*으로 *80 GB / 2.0 TB/s*를 만들어 *2020~2022년 AI training의 표준*이 됐습니다.

per-pin이 *2.4 → 3.6 Gbps*로 *50% 증가*했지만 *전체 구조*는 *HBM2*와 같습니다. *DRAM 밀도*만 *8 Gb → 16 Gb die*로 *두 배 늘었습니다*.

## HBM3 (2022) — 세대 변곡

JEDEC가 *큰 폭의 사양 변경*을 한 세대입니다.

```text
HBM3 (2022)
├── per-pin       : 6.4 Gbps (clock 3.2 GHz)
├── stack BW      : 819 GB/s
├── max stack     : 12-Hi (이전 8-Hi)
├── max capacity  : 24 GB / stack (16 Gb DRAM × 12)
├── channel       : 16 × 64-bit (8 × 128-bit에서 변경)
├── pseudo channel: 32 × 32-bit
├── VDD           : 1.1 V (이전 1.2 V)
├── ECC           : on-die ECC 표준
├── RAS           : refresh management 강화
└── 새 명령       : RFM, ASR

대표 카드:
- NVIDIA H100 (5 stack × 16 GB = 80 GB, 3.35 TB/s)
- AMD MI300X (8 stack × 24 GB = 192 GB, 5.3 TB/s)
```

변화가 *많습니다*. 하나씩 봅니다.

**채널 수 두 배.** 8 × 128-bit에서 *16 × 64-bit*로 갈라 *bank-level parallelism*을 더 끌어올렸습니다. PC까지 합치면 *32개 독립 명령 스트림*이 *동시에* 돌아갈 수 있습니다.

**on-die ECC 표준화.** HBM3부터는 *SECDED 1-bit 보정*이 *DRAM die 안에 내장*됩니다. data path는 *추가 redundancy 비트*가 *내부적으로* 흐릅니다. CPU의 *DDR5 on-die ECC*와 비슷한 흐름입니다.

**RFM (Refresh Management).** *Row Hammer 공격* 대응 명령입니다. 컨트롤러가 *특정 row에 대한 access 빈도*를 *base die에 알리고*, base die가 *인접 row*를 *조기 refresh*합니다.

**ASR (Adaptive Self-Refresh).** 온도에 따라 *refresh 주기*를 *동적으로 조정*합니다. 저온일 때 *refresh 줄여 power 절감*, 고온일 때 *refresh 늘려 데이터 보호*.

## HBM3E (2024) — 현세대

NVIDIA Blackwell B100/B200/B300의 *주력 메모리*입니다.

```text
HBM3E (2024)

per-pin 차이 (벤더마다):
├── SK Hynix    : 9.2 Gbps (NVIDIA H200 1st-source)
├── Micron      : 9.8 Gbps (B200용)
└── Samsung     : 9.6 Gbps (qualification 진행)

stack BW:
├── 9.2 Gbps × 1024-bit = 1.18 TB/s
├── 9.6 Gbps × 1024-bit = 1.23 TB/s
└── 9.8 Gbps × 1024-bit = 1.25 TB/s

max capacity: 36 GB / stack (24 Gb DRAM × 12 = 36 GB)

대표 카드:
- NVIDIA H200 (6 stack × 24 GB = 144 GB, 4.8 TB/s)
- NVIDIA B100 (8 stack × 24 GB = 192 GB)
- NVIDIA B200 (8 stack × 24 GB = 192 GB, 8 TB/s)
- AMD MI325X (8 stack × 32 GB = 256 GB)
```

핵심은 *DRAM die 자체*가 *24 Gb*로 *2배 커진* 것입니다. *12-Hi stacking*과 결합해 *36 GB stack*이 가능해졌습니다. *cell density* 향상이 *공정 미세화*로 들어가서 *DRAM die 자체가 같은 크기*를 유지합니다.

벤더별 *pin rate 차이*도 주목할 만합니다. *SK Hynix가 양산 안정성*, *Micron이 속도*, *Samsung이 capacity*에서 강점이라는 평가입니다.

## HBM4 (2025+) — 광폭 인터페이스로

HBM4는 *흐름을 바꿉니다*. *pin rate를 더 끌어올리지 않고*, *bus width를 2배(2048-bit)*로 늘립니다.

```text
HBM4 예상 (JESD238B 초안 기준)

├── per-pin       : 6.4~8.0 Gbps (HBM3와 비슷)
├── bus           : 2048-bit (1024-bit에서 2배)
├── stack BW      : 1.6~2.0 TB/s
├── max stack     : 16-Hi (옵션)
├── max capacity  : 48~64 GB / stack
├── VDD           : 1.0 V
├── bonding       : hybrid bonding (옵션, no microbump)
└── base die      : custom logic 옵션 (HBM4P)

채택 예정 칩:
- NVIDIA Rubin (R100, 2026)
- AMD MI400 (2026)
- 차세대 TPU
```

왜 *광폭으로 갔는가*? *9.8 Gbps에서 더 올리려면 PAM4 같은 signaling*이 필요한데, *HBM의 strict timing budget*에서 *PAM4는 BER 부담*이 큽니다. *bus width를 늘리는 게 안전*하다는 결론입니다.

```text
HBM3E → HBM4 transition

방식 1: per-pin 14~16 Gbps + PAM (포기)
  - PAM4 SerDes로 power · area 폭증
  - DRAM die의 IO 회로가 GDDR6X 수준으로 복잡
  - 발열·yield 모두 악화

방식 2: bus 2048-bit + per-pin 그대로 (채택)
  - microbump pitch를 55 → 30 μm로 줄임
  - hybrid bonding으로 9 μm까지 가능 (HBM4P)
  - 면적·전력 부담 분산
```

hybrid bonding은 *솔더 없이 구리끼리 접합*하는 기술입니다. *microbump pitch*가 *9 μm*로 줄어 *같은 면적에 2048 신호*가 들어갑니다. Samsung·SK Hynix·TSMC가 모두 *2025년 양산*을 목표로 합니다.

## RAS — 신뢰성 기능

세대마다 *Reliability·Availability·Serviceability* 기능이 강화됐습니다.

```text
RAS 기능 누적

HBM2  : 기본 메모리, 옵션 SECDED ECC
HBM2E : on-die ECC 옵션 추가
HBM3  : on-die ECC 표준, RFM(Row Hammer 방어), 
        PPR(Post-Package Repair), 
        boundary scan,
        temperature compensated refresh
HBM3E : 위 기능 + DBI(Data Bus Inversion) 강화, 
        per-channel error reporting
HBM4  : 위 기능 + on-die ECC 더 강력 (SECDED → DECTED?), 
        Cyclic Redundancy Check 표준화
```

AI training cluster에서 *수만 개의 stack*이 *24시간 가동*되면 *soft error*가 *시간당 수회* 발생합니다. *PPR과 ECC* 없이는 *training이 며칠 만에 실패*합니다. 그래서 HBM3부터 *RAS가 사실상 필수 옵션*이 됐습니다.

## bandwidth 그래프

세대별 *stack 1개*의 *bandwidth* 진화입니다.

```text
Stack BW (GB/s)

   2000 ┤                                ┌──── HBM4 (예정)
   1500 ┤
   1250 ┤                          ████ HBM3E
   1000 ┤
    819 ┤                    ████ HBM3
    500 ┤              ████ HBM2E
    307 ┤        ████ HBM2
    128 ┤  ████ HBM
      0 └────────────────────────────────────────
         2015  2018  2020  2022  2024  2026

GPU/NPU 한 카드의 총 BW (stack 5~8개):
- V100  : 4 stack × 307 GB/s × 73% = 900 GB/s
- A100  : 5 stack × 461 GB/s × 87% = 2.0 TB/s
- H100  : 5 stack × 819 GB/s × 82% = 3.35 TB/s
- H200  : 6 stack × 1.2 TB/s × 67% = 4.8 TB/s
- B200  : 8 stack × 1.0 TB/s × 100% = 8 TB/s
```

*8년 만에 6.25배*가 늘었습니다. 같은 기간 *GPU compute*는 *25배*(FP16 기준)가 늘었습니다. *compute가 더 빠르게 늘어* *memory가 병목*이 되는 흐름이 확실합니다. Ch 5에서 이 *memory wall*을 자세히 봅니다.

## 자주 하는 실수

### "HBM3E와 HBM3가 *같은 슬롯*에 호환된다"

JEDEC 핀 정의는 *세대마다 다릅니다*. HBM3와 HBM3E는 *대부분 호환*이지만 일부 신호 정의가 변경됐습니다. 더 큰 문제는 *interposer 라우팅*이 *세대 specific*이라 *동일 GPU die*가 *HBM2E와 HBM3를 함께 쓰지 못합니다*. NVIDIA H100과 H200 die가 *다른 이유*입니다.

### per-pin rate를 *channel rate*와 혼동

HBM3 *per-pin*은 6.4 Gbps입니다. 그런데 *DDR이라서 effective rate는 12.8 Gbps* 같은 식의 *오해*가 있습니다. JEDEC HBM3 사양에서 *6.4 Gbps*는 *이미 DDR을 포함한 effective rate*입니다. clock 자체는 *3.2 GHz*입니다.

### "Samsung·SK·Micron이 *같은 9.6 Gbps*다"

벤더마다 *몇 Gbps grade*가 다릅니다. NVIDIA가 *qualification*하는 part number도 다릅니다. *H200 launch 시점*에서 SK Hynix가 *9.2 Gbps grade*로 *first-source* 위치를 잡았고, *Samsung은 9.6 Gbps grade가 늦게 통과*되어 *전세대 H100용 8.0 Gbps*로 먼저 시장에 들어갔습니다. *데이터시트의 'grade'*를 보지 않고 *세대 이름만으로 같다고 가정*하면 BOM에 문제가 생깁니다.

### HBM4를 *HBM3E의 단순한 클럭 업그레이드*로 가정

HBM4는 *bus width 자체가 2배*입니다. *interposer 라우팅*과 *base die layout*이 *완전히 새로* 설계됩니다. 기존 HBM3E 설계 자산을 *그대로 reuse*할 수 없습니다. *HBM4 GPU/NPU die*는 *재설계*가 필수입니다.

## 정리

- HBM은 *2015년 1세대* 이후 *9년 만에 stack BW가 10배*로 늘었습니다.
- 세대 간 *변곡점*은 HBM2(PC 도입), HBM3(channel 16개·1.1 V·on-die ECC), HBM4(2048-bit bus)입니다.
- *per-pin rate*는 *NRZ를 유지*하면서 *2.4 → 9.8 Gbps*까지 올라갔습니다. signaling 변화 없이 *clock으로 짜냈습니다*.
- *DRAM die 밀도*도 *8 → 16 → 24 Gb*로 늘어 *stack capacity*를 *36 GB*까지 끌어올렸습니다.
- HBM3에서 *RAS 기능*이 *대거 표준화*됐습니다. on-die ECC, RFM, PPR이 모두 들어갔습니다.
- HBM4는 *signaling 한계*를 *bus width 확장(2048-bit)*과 *hybrid bonding*으로 우회합니다.
- 벤더별 *pin rate grade*가 다르므로 *세대 이름만으로 호환을 가정*하면 안 됩니다.
- 다음 장에서 *반대편의 GDDR*을 봅니다. *32 Gbps per-pin*이 *어떻게 가능한지*가 핵심입니다.

## 다음 편

[Ch 4: GDDR6·GDDR6X·GDDR7](/blog/embedded/hardware/hbm/chapter04-gddr)에서는 *PAM4·PAM3* 같은 *멀티 레벨 signaling*이 *어떻게 pin rate를 32 Gbps까지* 끌어올렸는지 봅니다. *PCB 라우팅*과 *signal integrity* 부담도 같이 다룹니다.

## 관련 항목

- [Ch 1: 고대역 메모리 개요](/blog/embedded/hardware/hbm/chapter01-overview)
- [Ch 2: HBM 스택 구조와 TSV](/blog/embedded/hardware/hbm/chapter02-hbm-stack)
- [Ch 4: GDDR6·GDDR6X·GDDR7](/blog/embedded/hardware/hbm/chapter04-gddr)
- [Ch 5: 대역폭 계산과 병목 분석](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)
- [UCIe Ch 5: 버전 비교](/blog/embedded/hardware/ucie/chapter05-version-comparison) — 표준 세대 진화 패턴
