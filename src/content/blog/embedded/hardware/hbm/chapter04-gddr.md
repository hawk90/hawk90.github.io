---
title: "Ch 4: GDDR6·GDDR6X·GDDR7"
date: 2026-05-16T04:00:00
description: "고속 그래픽 메모리 — clock·PAM 신호의 진화로 32 Gbps에 도달한 경로."
series: "HBM·GDDR 심화"
seriesOrder: 4
tags: [gddr, gddr6, gddr7, pam3]
draft: false
---

## 한 줄 요약

> **"GDDR은 *signaling을 바꿔* pin rate를 *NRZ → PAM4 → PAM3*으로 끌어올렸습니다."** — GDDR6은 *16 Gbps NRZ*, GDDR6X는 *24 Gbps PAM4*, GDDR7은 *32 Gbps PAM3*입니다. *bus width(32-bit/chip)*는 그대로, *pin rate만 두 배*로 올린 경로입니다.

[Ch 3](/blog/embedded/hardware/hbm/chapter03-hbm-generations)에서 HBM이 *광폭 bus(1024-bit)*로 *낮은 pin rate*로 가는 길을 봤습니다. GDDR은 *반대 방향*입니다. *bus는 32-bit로 그대로 두고* *pin rate를 32 Gbps까지* 끌어올립니다. *signaling이 같이 진화*했기 때문에 가능했습니다.

## 한눈에 보는 표

| 세대 | 양산 | per-pin | Signaling | Chip BW | 전형적 용도 |
|------|------|---------|-----------|---------|-------------|
| GDDR5 | 2008 | 7 Gbps | NRZ | 28 GB/s | 1080 Ti |
| GDDR5X | 2016 | 11.5 Gbps | NRZ | 46 GB/s | 1080 |
| GDDR6 | 2018 | 14~16 Gbps | NRZ | 64 GB/s | RTX 20/30 |
| GDDR6X | 2020 | 19~24 Gbps | PAM4 | 96 GB/s | RTX 30/40 |
| GDDR7 | 2024 | 32~36 Gbps | PAM3 | 128~144 GB/s | RTX 50 |

GDDR은 *5 → 5X → 6 → 6X → 7*로 *2~3년마다* 세대가 바뀌었습니다. 같은 기간 HBM은 *4년에 한 번* 세대가 바뀐 셈입니다. 그래서 *현세대 그래픽카드* 안에서도 *GDDR 세대가 더 빠르게 분기*합니다.

## GDDR chip의 기본 구조

GDDR chip 한 개는 *32-bit channel*을 가집니다.

![GDDR6 chip — 16 Gb DRAM die의 bank 배치와 32-bit I/O ring](/images/blog/hardware/hbm/diagrams/ch04-gddr6-chip.svg)

| chip 사양 | GDDR6 |
|-----------|-------|
| die 용량 | 8·16 Gb |
| chip 용량 | 1·2 GB |
| bus per chip | 32-bit |
| pin rate | 14~16 Gbps |
| BW per chip | 56~64 GB/s |
| 패키지 | 180-ball BGA |
| supply | VDDQ 1.35 V, VDD 1.35 V |

GPU에 *여러 chip*을 *병렬로 붙여* 총 bus width를 만듭니다.

```text
RTX 4090 메모리 구성 (GDDR6X)

GPU (AD102 die)
├── memory controller × 12
└── 각 controller에 GDDR6X chip 1개

12 chip × 32-bit = 384-bit bus
12 chip × 21 Gbps × 32-bit = 1008 GB/s ≈ 1 TB/s
12 chip × 2 GB = 24 GB capacity
```

bus가 *384-bit*까지 늘어나면 *PCB 라우팅이 결정적*이 됩니다. *length matching, 임피던스 제어, decoupling*이 *카드 가격의 큰 부분*입니다.

## NRZ — GDDR6까지

GDDR6은 *NRZ(Non-Return to Zero)*입니다. 한 *Unit Interval*에 *0 또는 1*만 보냅니다.

한 UI에 *0 또는 1*만 보내는 2-level 방식입니다. *1 비트 / UI*이므로 16 Gbps는 16 G UI/s에 해당합니다.

장점은 *단순함*입니다. 수신단이 *임계전압 1개*만 보면 됩니다. *BER이 매우 낮습니다*. 단점은 *clock을 두 배로 올려야 두 배 빨라진다*는 것입니다. *16 Gbps NRZ 너머*가 *PCB·BGA 공정의 한계*가 되어 *GDDR6에서 멈췄습니다*.

## PAM4 — GDDR6X의 4-level

NVIDIA와 Micron이 *RTX 30 시리즈*용으로 *공동 개발*한 GDDR6X는 *PAM4*를 도입했습니다.

한 UI에 *4 레벨(2 비트)*을 실어 보냅니다. 같은 clock에서 *2배 데이터*입니다.

NRZ·PAM4·PAM3 세 가지 signaling을 같은 시간축으로 비교하면 다음과 같습니다.

![NRZ vs PAM4 vs PAM3 — 같은 시간축에서의 레벨 비교](/images/blog/hardware/hbm/diagrams/ch04-signaling.svg)

한 UI에 *2 비트*가 들어갑니다. PAM4 *21 Gbps*는 NRZ로 환산하면 *42 Gbps*에 해당합니다. *clock 자체는 NRZ 21 Gbps 수준*이라 *eye가 NRZ와 비슷한 폭*을 갖습니다. 다만 *level 사이 거리가 1/3*로 좁아져 *SNR margin이 줄어듭니다*.

```text
PAM4 eye diagram (이론)

레벨 3 (11) ━━━━━━━ 
            ━━ eye 1 (top)
레벨 2 (10) ━━━━━━━
            ━━ eye 2 (mid)
레벨 1 (01) ━━━━━━━
            ━━ eye 3 (bottom)
레벨 0 (00) ━━━━━━━

NRZ 대비 eye 높이 1/3 → SNR -9.5 dB
```

PAM4의 *9.5 dB penalty*는 *FEC(Forward Error Correction)*와 *DBI(Data Bus Inversion)*로 보완합니다. *PCB 라우팅이 깐깐*해서 *카드 PCB가 8~12층*에 *임피던스 ±5%*가 요구됩니다.

## PAM3 — GDDR7의 절충

GDDR7은 *PAM3*입니다. *4-level이 아닌 3-level*을 사용합니다.

3-level × 1 UI에 *1.5 bit*를 인코딩합니다. 실제로는 *8 ternary symbol → 12 bit* 매핑을 씁니다.

PAM3은 *NRZ의 2배 효율*에 *못 미치고* PAM4의 *효율보다는 낮은데* SNR이 *PAM4보다 좋습니다*. *3-level 간격*이 *PAM4의 2-level 간격*보다 *50% 넓기* 때문입니다.

```text
SNR penalty 비교 (NRZ 대비)

NRZ  : 0 dB (기준)
PAM3 : -4.8 dB
PAM4 : -9.5 dB

데이터레이트 효율:
NRZ  : 1.0 bit/UI
PAM3 : 1.5 bit/UI (이론)
PAM4 : 2.0 bit/UI
```

GDDR7은 *32 Gbps*에서 *PAM3*로 동작하고 *PAM3의 effective bit rate*는 *clock × 1.5*로 들어갑니다. NVIDIA RTX 50 시리즈가 *GDDR7 32 Gbps*로 출시 예정입니다.

```text
GDDR7 (2024~2025)
├── per-pin       : 32 Gbps (PAM3)
├── chip BW       : 128 GB/s
├── chip capacity : 2~4 GB (16~24 Gb DRAM)
├── 패키지        : 266-ball BGA (PAM3 ground reference 증가)
└── VDD/VDDQ      : 1.2 V / 1.1 V

대표 제품:
- NVIDIA RTX 5090 (16 chip × 32 Gbps × 32-bit = 2.0 TB/s, 32 GB)
- Samsung GDDR7 32 Gbps qualification 완료 (2024)
- SK Hynix GDDR7 32 Gbps 양산 (2025)
- Micron GDDR7 28~32 Gbps
```

## PCB 라우팅 — GDDR의 진짜 비용

GDDR의 *진짜 비용*은 *PCB와 신호 무결성*에 있습니다.

![RTX 4090의 GDDR6X 384-bit PCB layout — GPU die 주변에 6 chip, length-matched trace](/images/blog/hardware/hbm/diagrams/ch04-pcb.svg)

* length matching*은 *모든 신호 쌍*이 *같은 시간*에 도착하도록 trace 길이를 *맞추는 것*입니다. PAM4 21 Gbps에서 1 UI = 47.6 ps인데, 47.6 ps는 *PCB 위에서 약 7 mm*입니다. *±0.5 mm 오차*는 *±7%* 정도의 *eye width 침투*가 됩니다.

| 세대 | PCB 사양 | 비용 |
|------|----------|------|
| GDDR5 | 6층 PCB, 표준 length matching ±2 mm | cheap |
| GDDR6 | 8층, ±1 mm | moderate |
| GDDR6X | 10~12층, ±0.5 mm, FEC, 추가 ground plane | expensive |
| GDDR7 | 12층, ±0.4 mm, retimer 옵션 | expensive |
| HBM3 | interposer (silicon), microbump 55 μm | 별개 비용 구조 — PCB는 단순, 비용은 interposer가 흡수 |

GDDR이 *chip 가격은 싸지만 PCB·VRM·decoupling 비용*은 *상당히 큽니다*. *256-bit, 384-bit, 512-bit*로 갈수록 *카드 PCB가 결정적*인 비용 요소입니다.

## DRAM 명령 인터페이스

GDDR과 HBM은 *DRAM 명령어 셋*이 유사하지만 *세부 차이*가 있습니다.

```text
GDDR6 command (16 bank, 2 channel × 16-bit)

CKE  ─── Clock Enable
CS   ─── Chip Select
CA[9:0] ─ Command/Address bus
DQ[15:0] ─ Data (channel 0)
DQ[31:16] ─ Data (channel 1)

명령 종류:
- ACT  (activate row)
- RD   (read column)
- WR   (write column)
- PRE  (precharge bank)
- REF  (refresh all banks)
- RFM  (refresh management, GDDR6X+)
```

GDDR6은 *2 channel × 16-bit*로 *내부적으로 분할*됩니다. HBM3의 *16 channel × 64-bit*에 비해 *channel-level parallelism이 훨씬 적습니다*. *bank parallelism*에 더 의존합니다.

## 신뢰성 기능

GDDR도 *ECC와 RAS*가 강화됐습니다.

| 세대 | ECC |
|------|-----|
| GDDR5 | 없음 (cost 우선) |
| GDDR6 | on-die ECC 옵션 (벤더별) |
| GDDR6X | on-die ECC + DBI 강화 |
| GDDR7 | SECDED on-die ECC 표준 |

데이터센터용 GDDR6X (NVIDIA L40, L4)는 *sideband ECC 16:1* (8-bit data + 1-bit ECC × 16 lane)을 추가해 *soft error rate*를 보장한다.

데이터센터 추론 카드(L40, L4 등)는 *ECC GDDR6X*를 씁니다. *24/7 동작*에서 *soft error*가 누적되면 *추론 정확도*가 떨어지기 때문입니다. 게이밍 카드는 ECC가 *off*가 일반적이고, *fps 우선*입니다.

## 전력 비교

GDDR과 HBM의 *전력 효율* 차이는 *시스템 설계의 분기점*입니다.

| 메모리 | 구성 | 전력 |
|--------|------|------|
| GDDR6 | 16 Gbps × 384-bit | 약 110 W (12 chip × 9 W) |
| GDDR6X | 21 Gbps × 384-bit | 약 130 W (12 chip × 11 W) |
| GDDR7 | 32 Gbps × 256-bit | 약 95 W (8 chip × 12 W) |
| HBM3 | 6.4 × 1024 × 1.5 | 약 35 W (2 stack × 18 W) |
| HBM3E | 9.6 × 1024 × 1.2 | 약 25 W (2 stack × 12 W) |

HBM이 *3~4배 효율적*. 다만 *capacity per W*도 함께 봐야 한다.

GDDR이 *효율은 낮지만 capacity는 풍부*합니다. 32 GB GDDR6X 카드를 *$2K*에 살 수 있는 반면 192 GB HBM3 가속기는 *$25K* 시작입니다. *용도와 예산*이 *분기*시킵니다.

## 자주 하는 실수

### "PAM4가 *항상 NRZ보다 빠르다*"

PAM4는 *clock이 같다면* 2배 빠릅니다. 하지만 *SNR penalty 9.5 dB* 때문에 *PCB·BGA·DRAM IO를 다 업그레이드*해야 *그 속도가 나옵니다*. PAM4 14 Gbps와 NRZ 14 Gbps를 비교하면 *NRZ가 BER도 좋고 전력도 적습니다*. *signaling 선택*은 *clock의 한계*에 닿았을 때만 의미가 있습니다.

### "GDDR6X와 GDDR7이 *PCB 호환*된다"

전혀 아닙니다. GDDR6X 180-ball BGA, GDDR7 266-ball BGA로 *패키지 자체가 다릅니다*. 전압 도메인(VDDQ)도 1.35 V → 1.1 V로 변경됩니다. RTX 40 → 50 카드는 *PCB 재설계*가 필수입니다.

### GDDR을 *DDR5의 대체품*으로 가정

GDDR은 *graphics 최적화 DRAM*이고 *CPU memory controller*가 *GDDR을 지원하지 않습니다*. CPU에 GDDR를 붙이려면 *별도 controller IP*가 필요합니다. AMD Strix Halo 같은 *그래픽 강화 APU*는 *LPDDR5X*를 광폭으로 쓰지 GDDR을 쓰지 않습니다.

### length matching tolerance를 *±2 mm*로 잡음

GDDR5 시절 가이드입니다. GDDR6X PAM4에서는 *±0.5 mm*가 *요구*되고 *±1 mm*면 *BER이 10⁻⁶ 수준*으로 떨어집니다. board re-spin이 잦은 이유입니다.

### "GDDR이 *항상 HBM보다 싸다*"

chip 자체는 그렇지만 *대역폭 단위 비용*은 *비슷*하기도 합니다. *1 TB/s GDDR6X 카드 PCB*가 *$300*이면, *HBM 2 stack interposer 패키징*이 *$500* 정도입니다. *시스템 가격*은 *카드 BOM*과 *수율*이 모두 들어가야 비교가 됩니다.

## 정리

- GDDR은 *32-bit/chip bus*를 *그대로 두고 pin rate를 끌어올린* 경로입니다.
- *NRZ(GDDR6 16 Gbps)*에서 *PAM4(GDDR6X 24 Gbps)*, *PAM3(GDDR7 32 Gbps)*로 *signaling 자체*가 *세대마다 진화*했습니다.
- PAM4는 *NRZ 대비 9.5 dB SNR penalty*가 있어 *PCB·BGA*가 *고비용*입니다.
- PAM3은 *PAM4와 NRZ의 절충*입니다. *효율 1.5 bit/UI*에 *SNR penalty -4.8 dB*입니다.
- GDDR chip은 *값이 싸지만 PCB 라우팅·VRM·decoupling*이 *카드 가격의 큰 부분*입니다.
- 전력 효율은 *HBM 대비 3~4배 떨어집니다*. 다만 *capacity per dollar*는 *4~6배 좋습니다*.
- 데이터센터 추론 카드(L40, L4)는 *ECC GDDR6X*를 씁니다. 게이밍 카드는 *ECC off*가 일반적입니다.
- GDDR과 HBM은 *완전히 다른 시장*이지만 *같은 GPU 회사*가 *둘 다 사용*합니다.

## 다음 편

[Ch 5: 대역폭 계산과 병목 분석](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)에서는 *공칭 대역폭과 실제 대역폭*의 차이, *roofline model*, *memory wall*을 봅니다. AI workload에서 *왜 대역폭이 늘 부족한지* 정량적으로 풉니다.

## 관련 항목

- [Ch 3: HBM 세대 비교](/blog/embedded/hardware/hbm/chapter03-hbm-generations)
- [Ch 5: 대역폭 계산과 병목 분석](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)
- [Ch 6: 열 설계와 전력 관리](/blog/embedded/hardware/hbm/chapter06-thermal-power)
- [UCIe Ch 3: 물리 레이어](/blog/embedded/hardware/ucie/chapter03-physical-layer) — 고속 signaling 일반론
- [BoW Ch 2: 아키텍처](/blog/embedded/hardware/bow/chapter02-architecture) — forwarded clock signaling 대안
