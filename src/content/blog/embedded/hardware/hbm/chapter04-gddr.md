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

> **"GDDR은 *signaling을 바꿔* pin rate를 *NRZ → PAM4 → PAM3*으로 끌어올렸습니다."** — 이 글의 GDDR6 기준은 Micron의 *16 Gb/s*, GDDR6X는 RTX 4090의 *PAM4 21 Gbps*, GDDR7은 JEDEC의 *PAM3, device당 192 GB/s*(x32 환산 48 Gb/s)입니다. *chip당 bus width(32-bit)*는 그대로 두고 pin rate를 올린 경로입니다.

[Ch 3](/blog/embedded/hardware/hbm/chapter03-hbm-generations)에서 HBM이 *광폭 bus(1024-bit)*로 *낮은 pin rate*로 가는 길을 봤습니다. GDDR은 *반대 방향*입니다. *bus는 chip당 32-bit로 두고* *pin rate를 끌어올립니다*. *signaling이 같이 진화*했기 때문에 가능했습니다.

## 한눈에 보는 표

| 세대 | 기준 | per-pin | Signaling | Chip BW (× 32-bit) | 예 |
|------|------|---------|-----------|---------|-------------|
| GDDR6 | JESD250 · Micron flyer | 최대 16 Gb/s | NRZ (PAM 아님) | `16 × 32 ÷ 8 = 64 GB/s` | NVIDIA L4·L40 |
| GDDR6X | Micron · Ada 백서 | 21 Gbps (RTX 4090) | PAM4 | `21 × 32 ÷ 8 = 84 GB/s` | RTX 4090 |
| GDDR7 | JESD239 (2024-03-05) | `192 × 8 ÷ 32 = 48 Gb/s` (산술) | PAM3 | 최대 192 GB/s | RTX 5090 |

chip BW는 x32 구성을 가정한 `per-pin × 32 ÷ 8`입니다. GDDR6의 16 Gb/s는 [Micron GDDR6 product flyer](https://www.micron.com/content/dam/micron/global/public/products/product-flyer/gddr6-product-flyer.pdf)의 *32 DQ per component, data rates up to 16 Gb/s*이며 이후 모든 제품의 상한이 아닙니다. GDDR7의 192 GB/s는 [JEDEC의 2024년 3월 5일 발표](https://www.jedec.org/news/pressreleases/jedec-publishes-gddr7-graphics-memory-standard) 기준입니다. 같은 발표는 GDDR7을 *PAM 인터페이스를 쓰는 첫 JEDEC 표준 DRAM*이라고 적으므로, 그 전 세대인 JEDEC GDDR6는 PAM이 아닙니다. GDDR6X의 Micron 제품 페이지는 *16 Gb 제품 최대 24 Gb/s*까지 적지만, 표에는 Ada 백서가 밝힌 RTX 4090의 21 Gbps를 썼습니다. 표의 예 제품이 모두 그 행의 최대 속도로 동작한다는 뜻은 아닙니다.

## GDDR chip의 기본 구조

이 절은 x32 동작 구성을 설명합니다. Micron flyer의 GDDR6 I/O width는 *2-channel x16/x8*이라 x16 구성도 있으므로, 칩 수를 전체 버스 폭만으로 확정하면 안 됩니다.

![GDDR6 chip — DRAM die의 bank 배치와 32-bit I/O ring](/images/blog/hardware/hbm/diagrams/ch04-gddr6-chip.svg)

| chip 사양 | Micron GDDR6 flyer의 값 |
|-----------|-------|
| density | 8~16 Gb |
| 구성 | 2-channel x16/x8 (x16 두 개면 32 DQ) |
| data rate | 최대 16 Gb/s |
| BW per chip | `16 × 32 ÷ 8 = 64 GB/s` (산술) |
| VDD, VDDQ | 1.35 V (low-voltage 1.25 V) |
| package | BGA-180, 14 mm × 12 mm, 0.75 mm ball pitch |

[JEDEC JESD250D 문서 페이지](https://www.jedec.org/standards-documents/docs/jesd250)도 GDDR6 표준의 범위를 *8 Gb~16 Gb x16 dual channel* device로 적고, AC timing 같은 일부 항목은 표준화하지 않았으니 *벤더 데이터시트를 보라*고 명시합니다.

GPU에 *여러 chip*을 *병렬로 붙여* 총 bus width를 만듭니다.

[NVIDIA Ada 백서](https://images.nvidia.cn/aem-dam/Solutions/geforce/ada/nvidia-ada-gpu-architecture.pdf)에서 RTX 4090은 24 GB·384-bit·21 Gbps이며, `21 × 384 ÷ 8 = 1,008 GB/s`가 백서의 1008 GB/sec와 일치합니다. 같은 백서는 AD102의 384-bit를 *32-bit 메모리 컨트롤러 12개*로 설명합니다.

## NRZ — GDDR6까지

GDDR6은 *NRZ(Non-Return to Zero)*입니다. 한 *Unit Interval(UI)*에 *0 또는 1*, 곧 *1 bit*를 보냅니다. 16 Gbps NRZ는 초당 16 G UI입니다.

장점은 *단순함*입니다. 수신단이 *임계전압 1개*만 보면 됩니다. 단점은 *속도를 두 배로 하려면 UI도 절반으로* 줄여야 한다는 것입니다.

## PAM4 — GDDR6X의 4-level

Ada 백서는 *RTX 3090·3080 출시 때 NVIDIA와 Micron이 첫 GDDR6X를 19.5 Gbps로 출하*했다고 적고, [Micron GDDR6X 페이지](https://www.micron.com/products/memory/graphics-memory/gddr6x)는 GDDR6X가 *PAM4*를 쓴다고 설명합니다. 한 UI에 *4 레벨*, 곧 *2 bit*를 싣습니다.

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

GDDR7은 *PAM3*입니다. *4-level이 아닌 3-level(+1, 0, −1)*을 씁니다. JEDEC은 PAM3이 *고속 동작에서 SNR을 개선하고 에너지 효율을 높인다*고 설명합니다.

3개 상태의 이론적 정보량은 *log₂3 ≈ 1.585 bit/symbol*입니다. 그러나 JEDEC 발표가 설명한 GDDR7 전송은 **2 cycle에 3 bit**(NRZ는 2 cycle에 2 bit), 즉 *1.5 bit/symbol*입니다. 전송률을 symbol rate로 환산할 때는 1.5를 써야 합니다. 예를 들어 48 Gbps는 32 Gbaud, 32 Gbps는 약 21.33 Gbaud입니다. 이 값은 데이터 symbol rate이며 모든 CK·WCK 신호의 clock 주파수를 뜻하지 않습니다. 레벨 간격은 전압 폭의 *1/2*로 PAM4의 1/3보다 *50% 넓습니다*.

같은 전압 폭·등간격 모델의 비교입니다.

| 방식 | 인접 전압 간격 / NRZ | 간격의 dB 비 | 실제 인코딩 bit/symbol |
|---|---|---|---|
| NRZ | 1 | 0 | 1 |
| PAM3 (GDDR7) | 1/2 | 약 −6.02 dB | 1.5 |
| PAM4 | 1/3 | 약 −9.54 dB | 2 |

JEDEC JESD239(2024년 3월 5일) GDDR7의 주요 내용입니다.

독립 channel 4개(GDDR6의 2개에서 두 배), 16~32 Gbit 밀도와 2-Channel mode, ODECC 실시간 보고·data poison·error check and scrub·command address parity with command blocking(CAPARBLK), LFSR training pattern이 JEDEC 발표에 명시되어 있습니다. JEDEC은 192 GB/s를 *GDDR6의 두 배*라고 적는데, 이는 GDDR6 기준을 `192 ÷ 2 = 96 GB/s`, x32로 24 Gb/s로 잡은 셈입니다. 이 표의 Micron GDDR6 64 GB/s와 비교하면 `192 ÷ 64 = 3배`입니다. 배수는 어느 GDDR6 속도 등급을 기준으로 삼느냐에 따라 달라지므로, 기준을 함께 적어야 합니다.

[NVIDIA GeForce RTX 5090 페이지](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/)는 *32 GB GDDR7*, *512-bit*를 적습니다. 메모리 속도는 같은 페이지에 나오지 않습니다.

## symbol rate를 직접 계산하기

다음은 데이터 전송률을 symbol rate와 UI로 환산하는 산술 도구입니다. GDDR7은 JEDEC 발표의 1.5 bit/symbol을 사용하며, 전기적 동작 가능성을 판정하지 않습니다.

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
console.log(symbolRate(21, 'NRZ'));
console.log(symbolRate(48, 'PAM3'));
console.log(symbolRate(32, 'PAM3'));
```

Node.js v24.21.0에서 실행한 출력입니다.

```text
$ node gddr-symbol-rate.mjs
{ gbaud: 10.5, uiPicoseconds: 95.23809523809524 }
{ gbaud: 21, uiPicoseconds: 47.61904761904762 }
{ gbaud: 32, uiPicoseconds: 31.25 }
{ gbaud: 21.333333333333332, uiPicoseconds: 46.875 }
```

## PCB 라우팅

GDDR chip은 GPU 주변 PCB 위에 놓입니다. 아래 그림은 배치 개념도이며 특정 보드의 배선이 아닙니다.

![GPU 주변 GDDR chip 배치 개념도 — length-matched trace](/images/blog/hardware/hbm/diagrams/ch04-pcb.svg)

위 실행 결과대로 PAM4 21 Gbps의 UI는 *95.24 ps*입니다. 같은 데이터 속도를 NRZ로 내면 UI가 *47.62 ps*라, PAM4는 *UI 폭에서 여유*를 얻고 *레벨 간격에서 여유*를 잃는 셈입니다. HBM은 PCB 대신 interposer로 GPU와 잇습니다([Ch 2](/blog/embedded/hardware/hbm/chapter02-hbm-stack)).

## DRAM 명령 인터페이스

GDDR6 chip은 JESD250D 페이지의 표현대로 *x16 dual channel*입니다. 32 DQ를 *16-bit channel 두 개*로 나눠 각각 독립적으로 명령을 받습니다. Micron flyer는 access granularity를 *2-channel 각 32B 또는 PC mode의 1-channel 64B*로 적습니다.

JEDEC GDDR7 발표 기준으로 독립 channel은 GDDR6가 chip당 2개, GDDR7이 4개입니다. HBM3는 stack당 16 channel(채널당 64-bit)이라 *channel-level parallelism*이 훨씬 많습니다.

## 신뢰성 기능

| 세대 | 데이터 무결성 기능 | 출처 |
|-----|-----|-----|
| GDDR6 (Micron) | CRC: BL16에서 2X CRC-8 | Micron flyer |
| GDDR7 | ODECC 실시간 보고, data poison, error check & scrub, CAPARBLK | JEDEC 2024 발표 |

JEDEC 발표는 GDDR7을 *대역폭뿐 아니라 RAS 시장 요구를 다룬 첫 GDDR*이라고 소개합니다(JEDEC GDDR 소위원회 의장 Michael Litt).

## 자주 하는 실수

### "PAM4는 NRZ보다 무조건 빠르다"

PAM4는 같은 symbol rate에서 *2배의 데이터*를 보냅니다. 같은 전압 폭·등간격 모델에서 인접 간격은 NRZ의 1/3이고, 그 진폭 비는 `20·log₁₀(1/3) = −9.54 dB`입니다. JEDEC은 GDDR7의 PAM3가 고속 동작에서 SNR을 개선한다고 설명합니다. 다만 그 비교 대상은 NRZ이며, PAM4와 직접 비교한 문장은 발표에 없습니다.

### "PAM4 21 Gbps는 NRZ 42 Gbps와 같다"

21 Gbps는 이미 *데이터 전송률*입니다. PAM4는 이것을 *10.5 Gbaud*의 symbol로 보냅니다. NRZ로 환산하면 21 Gbps NRZ와 같은 데이터 양을 *절반의 symbol rate*로 보내는 것입니다.

### GDDR을 *DDR5의 대체품*으로 가정

GDDR은 *그래픽용 DRAM*입니다. CPU와 GPU를 한 칩에 넣은 APU는 다른 선택을 하기도 합니다. [AMD Ryzen AI Max+ 395 제품 페이지](https://www.amd.com/en/products/processors/laptop/ryzen/ai-300-series/amd-ryzen-ai-max-plus-395.html)의 system memory는 *256-bit LPDDR5x*, 최대 속도 *LPDDR5x-8000*, 최대 128 GB입니다. `8 × 256 ÷ 8 = 256 GB/s`입니다.

### "데이터센터 추론 카드는 GDDR6X"

Ada 백서 부록 D의 NVIDIA L4는 *24 GB GDDR6 w/ ECC, 300 GB/s*, [L40 페이지](https://www.nvidia.com/en-us/data-center/l40/)는 *48 GB GDDR6 with ECC, 864 GB/s*입니다. 둘 다 GDDR6X가 아닙니다.

## 정리

- GDDR은 *chip당 32-bit bus*를 *그대로 두고 pin rate를 끌어올린* 경로입니다.
- *NRZ(Micron GDDR6 16 Gb/s)*에서 *PAM4(GDDR6X, RTX 4090 21 Gbps)*, *PAM3(GDDR7, 192 GB/s ÷ 32 DQ = 48 Gb/s)*로 *signaling 자체*가 바뀌었습니다.
- 같은 전압 폭의 등간격 모델에서 PAM4·PAM3 간격은 각각 NRZ의 1/3·1/2입니다. 실제 SNR·BER 손실과 구별해야 합니다.
- PAM4 21 Gbps의 symbol rate는 *10.5 Gbaud*, UI는 *약 95 ps*입니다.
- GDDR7은 device당 *최대 192 GB/s*, 독립 channel *4개*, *on-die ECC*를 표준으로 갖습니다.

## 다음 편

[Ch 5: 대역폭 계산과 병목 분석](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)에서는 *공칭 대역폭과 실제 대역폭*의 차이, *roofline model*, *memory wall*을 봅니다. AI workload에서 *왜 대역폭이 늘 부족한지* 정량적으로 풉니다.

## 관련 항목

- [Ch 3: HBM 세대 비교](/blog/embedded/hardware/hbm/chapter03-hbm-generations)
- [Ch 5: 대역폭 계산과 병목 분석](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)
- [Ch 6: 열 설계와 전력 관리](/blog/embedded/hardware/hbm/chapter06-thermal-power)
