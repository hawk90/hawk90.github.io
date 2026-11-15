---
title: "GDDR6·GDDR6X·GDDR7 — PAM 신호의 전송률과 전압 여유"
slug: "embedded/hardware/hbm/chapter04-gddr"
date: 2026-05-16T09:04:00
description: "NRZ·PAM4·PAM3의 인코딩 비율과 symbol rate를 비교하고, 전압 간격 모델의 한계를 설명합니다."
series: "HBM·GDDR 심화"
seriesOrder: 4
tags: [gddr, gddr6, gddr7, pam3]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"GDDR은 *signaling을 바꿔* pin rate를 *NRZ → PAM4 → PAM3*으로 끌어올렸습니다."** — 이 글의 초기 GDDR6 기준은 *NRZ 16 Gbps*, GDDR6X는 *PAM4로 21 Gbps*(Micron), GDDR7은 *PAM3로 최대 48 Gbps*(JEDEC)입니다. *chip당 bus width(32-bit)*는 그대로 두고 pin rate를 올린 경로입니다.

[Ch 3](/blog/embedded/hardware/hbm/chapter03-hbm-generations)에서 HBM이 *광폭 bus(1024-bit)*로 *낮은 pin rate*로 가는 길을 봤습니다. GDDR은 *반대 방향*입니다. *bus는 chip당 32-bit로 두고* *pin rate를 끌어올립니다*. *signaling이 같이 진화*했기 때문에 가능했습니다.

## 한눈에 보는 표

| 세대 | 기준 | per-pin | Signaling | Chip BW (× 32-bit) | 예 |
|------|------|---------|-----------|---------|-------------|
| GDDR6 | JESD250 (2017) | 최대 16 Gbps | NRZ | 64 GB/s | NVIDIA L4·L40 |
| GDDR6X | Micron | 21 Gbps | PAM4 | 84 GB/s | RTX 4090 |
| GDDR7 | JESD239 (2024) | 최대 48 Gbps | PAM3 | 최대 192 GB/s | RTX 5090 |

chip BW는 x32 구성을 가정한 `per-pin × 32 ÷ 8`입니다. GDDR6의 16 Gbps는 [Micron의 초기 제품군 설명](https://www.micron.com/content/dam/micron/global/public/products/product-flyer/gddr6-product-flyer.pdf)의 기준이며 이후 모든 제품의 상한이 아닙니다. GDDR7의 192 GB/s는 [JEDEC의 2024년 최초 발표](https://www.businesswire.com/news/home/20240305637931/en/) 기준입니다. 표의 예 제품이 모두 그 행의 최대 속도로 동작한다는 뜻은 아닙니다.

## GDDR chip의 기본 구조

이 절은 x32 동작 구성을 설명합니다. 부품에는 x16 구성도 있으므로 칩 수를 전체 버스 폭만으로 확정하면 안 됩니다.

![GDDR6 chip — DRAM die의 bank 배치와 32-bit I/O ring](/images/blog/hardware/hbm/diagrams/ch04-gddr6-chip.svg)

| chip 사양 | Micron 초기 GDDR6 제품군의 예 |
|-----------|-------|
| die 용량 | 8~16 Gb |
| 구성 | x16 dual channel (2 channel × 16-bit = 32-bit) |
| pin rate | 최대 16 Gbps |
| BW per chip | 최대 64 GB/s |
| 동작 전압 | 1.35 V |

GPU에 *여러 chip*을 *병렬로 붙여* 총 bus width를 만듭니다.

RTX 4090의 공개 사양은 24 GB·384-bit·21 Gbps이며, `21 × 384 ÷ 8 = 1,008 GB/s`입니다. [NVIDIA Ada 백서 부록](https://images.nvidia.cn/aem-dam/Solutions/geforce/ada/nvidia-ada-gpu-architecture.pdf)을 기준으로 한 공칭 계산입니다.

PCB에서는 각 부품의 timing budget에 맞춰 배선을 설계합니다. 단순히 모든 trace의 물리적 길이가 같으면 충분하다는 뜻은 아닙니다.

## NRZ — GDDR6까지

GDDR6은 *NRZ(Non-Return to Zero)*입니다. 한 *Unit Interval(UI)*에 *0 또는 1*, 곧 *1 bit*를 보냅니다. 16 Gbps NRZ는 초당 16 G UI입니다.

장점은 *단순함*입니다. 수신단이 *임계전압 1개*만 보면 됩니다. 단점은 *속도를 두 배로 하려면 UI도 절반으로* 줄여야 한다는 것입니다.

## PAM4 — GDDR6X의 4-level

NVIDIA와 Micron이 함께 개발한 GDDR6X는 *PAM4*를 썼습니다. 한 UI에 *4 레벨*, 곧 *2 bit*를 싣습니다.

다음 그림은 같은 symbol 폭으로 레벨 수를 비교한 개념도입니다. 같은 데이터 전송률이나 같은 전압 폭의 파형 측정이 아닙니다.

![NRZ·PAM4·PAM3의 레벨 개념도 — 동일 symbol 폭, 전압 축은 각 행별 정규화](/images/blog/hardware/hbm/diagrams/ch04-signaling.svg)

PAM4는 UI당 2 bit라서, *21 Gbps를 내려면 symbol rate는 10.5 Gbaud*면 됩니다. 같은 데이터 속도의 NRZ보다 UI가 *두 배 깁니다*. 대신 같은 전압 폭 안에 레벨을 4개 넣으므로 *인접 레벨 사이 간격이 NRZ의 1/3*로 좁아집니다.

PAM4의 레벨과 eye를 설명하기 위한 임의의 bit 라벨입니다. 실제 GDDR6X의 wire 인코딩 표를 재현한 것은 아닙니다.

| 레벨 | 의미 | 인접 eye |
|------|------|---------|
| 3 | 11 | eye 1 (top, 레벨 3 ↔ 2) |
| 2 | 10 | eye 2 (mid, 레벨 2 ↔ 1) |
| 1 | 01 | eye 3 (bottom, 레벨 1 ↔ 0) |
| 0 | 00 | — |

**전체 전압 폭이 같고 레벨이 등간격이라는 모델**에서는 인접 간격이 NRZ의 1/3이므로 진폭 비가 `20·log₁₀(1/3) ≈ −9.5 dB`입니다. 이는 전압 간격의 비교이며 실제 수신기의 SNR·BER penalty를 측정한 결과가 아닙니다. 잡음·equalization·coding·채널 손실을 포함한 링크 budget은 따로 필요합니다.

## PAM3 — GDDR7의 절충

GDDR7은 *PAM3*입니다. *4-level이 아닌 3-level*을 씁니다. JEDEC은 PAM3이 *고속에서 SNR을 개선하고 에너지 효율을 높인다*고 설명합니다.

3개 상태의 이론적 정보량은 *log₂3 ≈ 1.585 bit/symbol*입니다. 그러나 [JEDEC 발표](https://www.businesswire.com/news/home/20240305637931/en/)가 설명한 GDDR7 인코딩은 **2 symbol에 3 bit, 즉 1.5 bit/symbol**입니다. 전송률을 symbol rate로 환산할 때는 1.5를 써야 합니다. 예를 들어 48 Gbps는 32 Gbaud, 32 Gbps는 약 21.33 Gbaud입니다. 이 값은 데이터 symbol rate이며 모든 CK·WCK 신호의 clock 주파수를 뜻하지 않습니다. 레벨 간격은 전압 폭의 *1/2*로 PAM4의 1/3보다 *50% 넓습니다*.

같은 전압 폭·등간격 모델의 비교입니다.

| 방식 | 인접 전압 간격 / NRZ | 간격의 dB 비 | 실제 인코딩 bit/symbol |
|---|---|---|---|
| NRZ | 1 | 0 | 1 |
| PAM3 (GDDR7) | 1/2 | 약 −6.02 dB | 1.5 |
| PAM4 | 1/3 | 약 −9.54 dB | 2 |

JEDEC JESD239(2024년 3월 5일) GDDR7의 주요 내용입니다.

독립 channel 4개, 16~32 Gbit 밀도 지원, ODECC 실시간 보고·data poison·error check and scrub·명령 주소 parity는 [JEDEC 최초 발표](https://www.businesswire.com/news/home/20240305637931/en/)에 명시되어 있습니다. 이 표의 초기 GDDR6 64 GB/s와 GDDR7 192 GB/s를 직접 비교하면 **3배**입니다. 다른 속도 등급을 기준으로 한 배수를 이 표에 섞으면 안 됩니다.

NVIDIA GeForce RTX 5090은 *32 GB GDDR7*을 *512-bit*로 붙입니다.

## symbol rate를 직접 계산하기

다음은 데이터 전송률을 symbol rate와 UI로 환산하는 산술 도구입니다. GDDR7은 실제 인코딩의 1.5 bit/symbol을 사용하며, 전기적 동작 가능성을 판정하지 않습니다. Node.js에서 실행하면 PAM4 21 Gbps의 결과가 10.5 Gbaud·약 95.24 ps입니다.

```js title="gddr-symbol-rate.mjs"
export function symbolRate(gigabitsPerSecond, encoding) {
  const bits = new Map([['NRZ', 1], ['PAM3', 1.5], ['PAM4', 2]]).get(encoding);
  if (!bits || !Number.isFinite(gigabitsPerSecond) || gigabitsPerSecond <= 0) {
    throw new RangeError('positive finite rate and known encoding required');
  }
  const gbaud = gigabitsPerSecond / bits;
  const uiPicoseconds = 1000 / gbaud;
  if (!Number.isFinite(uiPicoseconds) || gbaud <= 0) {
    throw new RangeError('rate outside numeric range');
  }
  return { gbaud, uiPicoseconds };
}
console.log(symbolRate(21, 'PAM4'));
```

## PCB 라우팅

GDDR chip은 GPU 주변 PCB 위에 놓입니다. 데이터와 strobe가 수신 timing 범위 안에 들어오도록 신호군별 skew와 배선 조건을 확인합니다.

![GPU 주변 GDDR chip 배치 개념도 — length-matched trace](/images/blog/hardware/hbm/diagrams/ch04-pcb.svg)

PAM4 21 Gbps의 UI는 `1 ÷ 10.5 Gbaud ≈ 95 ps`입니다. 같은 데이터 속도를 NRZ로 내면 UI가 약 48 ps라, PAM4는 *UI 폭에서 여유*를 얻고 *레벨 간격에서 여유*를 잃는 셈입니다. HBM은 PCB가 아니라 *interposer 위 배선*으로 같은 문제를 풉니다.

## DRAM 명령 인터페이스

GDDR6 chip은 *x16 dual channel*입니다. 32-bit를 *16-bit channel 두 개*로 나눠 각각 독립적으로 명령을 받습니다.

x32 구성의 channel A는 DQ[15:0], channel B는 DQ[31:16]을 사용합니다. ACT는 row 활성화, RD·WR는 읽기·쓰기, PRE는 precharge, REF는 refresh 명령입니다.

GDDR6의 독립 channel은 chip당 2개, GDDR7은 4개입니다. HBM3는 stack당 16 channel(채널당 64-bit)이라 *channel-level parallelism*이 훨씬 많습니다.

## 신뢰성 기능

| 세대 | ECC |
|------|-----|
| GDDR7 | on-die ECC(ODECC) 표준, 실시간 오류 보고 |

GDDR7부터 on-die ECC와 *data poison*, *error check & scrub* 같은 RAS 기능이 JEDEC 표준에 들어갔습니다.

## 자주 하는 실수

### "PAM4는 NRZ보다 무조건 빠르다"

PAM4는 같은 symbol rate에서 *2배의 데이터*를 보냅니다. 같은 전압 폭·등간격 모델에서 인접 간격은 NRZ의 1/3이고, 그 진폭 비는 약 −9.54 dB입니다. 실제 지원 속도는 부품의 전기 사양과 보드 검증으로 판단합니다.

### "PAM4 21 Gbps는 NRZ 42 Gbps와 같다"

21 Gbps는 이미 *데이터 전송률*입니다. PAM4는 이것을 *10.5 Gbaud*의 symbol로 보냅니다. NRZ로 환산하면 21 Gbps NRZ와 같은 데이터 양을 *절반의 symbol rate*로 보내는 것입니다.

### GDDR을 *DDR5의 대체품*으로 가정

GDDR은 *그래픽용 DRAM*입니다. 큰 대역폭이 필요한 APU도 GDDR 대신 LPDDR을 넓게 씁니다. AMD Ryzen AI Max+ 395(Strix Halo)는 *256-bit LPDDR5X-8000*을 씁니다.

### "데이터센터 추론 카드는 GDDR6X"

NVIDIA L4(24 GB)와 L40(48 GB)은 *GDDR6*입니다.

## 정리

- GDDR은 *chip당 32-bit bus*를 *그대로 두고 pin rate를 끌어올린* 경로입니다.
- *NRZ(초기 GDDR6 기준 16 Gbps)*에서 *PAM4(GDDR6X, 21 Gbps)*, *PAM3(GDDR7, 최대 48 Gbps)*로 *signaling 자체*가 바뀌었습니다.
- 같은 전압 폭의 등간격 모델에서 PAM4·PAM3 간격은 각각 NRZ의 1/3·1/2입니다. 실제 SNR·BER 손실과 구별해야 합니다.
- PAM4 21 Gbps의 symbol rate는 *10.5 Gbaud*, UI는 *약 95 ps*입니다.
- GDDR7은 chip당 *최대 192 GB/s*, 독립 channel *4개*, *on-die ECC*를 표준으로 갖습니다.

## 다음 편

[Ch 5: 대역폭 계산과 병목 분석](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)에서는 *공칭 대역폭과 실제 대역폭*의 차이, *roofline model*, *memory wall*을 봅니다. AI workload에서 *왜 대역폭이 늘 부족한지* 정량적으로 풉니다.

## 관련 항목

- [Ch 3: HBM 세대 비교](/blog/embedded/hardware/hbm/chapter03-hbm-generations)
- [Ch 5: 대역폭 계산과 병목 분석](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)
- [Ch 6: 열 설계와 전력 관리](/blog/embedded/hardware/hbm/chapter06-thermal-power)
