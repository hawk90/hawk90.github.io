---
title: "HBM2·HBM2E·HBM3·HBM3E 세대 비교 — JEDEC 표준 진화 흐름"
slug: "embedded/hardware/hbm/chapter03-hbm-generations"
date: 2026-05-16T09:03:00
description: "세대별 bandwidth·capacity·signaling — JEDEC 표준의 진화 흐름."
series: "HBM·GDDR 심화"
seriesOrder: 3
tags: [hbm, hbm2, hbm3, hbm3e, hbm4]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"표준의 상한과 벤더 제품의 속도 등급을 구별해야 합니다."** — HBM2(2.4 Gbps) → HBM2E(3.6) → HBM3(6.4) → HBM3E(9.6) 순으로 *pin rate*가 뛰었습니다. *stack당 bandwidth*는 JESD235B의 *307 GB/s(2018)*에서 SK hynix HBM3E의 `9.6 × 1024 ÷ 8 = 1,228.8 GB/s(2024)`로 *6년 만에 4배*가 됐습니다. HBM4는 *bus width를 2배(2048-bit)*로 늘려, 2025년 최초 표준 발표의 *8 Gb/s* 기준으로도 대역폭을 *최대 2 TB/s*로 올렸습니다.

[Ch 2](/blog/embedded/hardware/hbm/chapter02-hbm-stack)에서 *물리적 구조*를 봤습니다. 이번 장은 *시간 축*입니다. 같은 *base die + DRAM die* 골격이 *세대마다 어떻게 진화*했는지, JEDEC 표준이 *어떤 새 기능*을 더했는지를 봅니다.

## 한눈에 보는 표

이 표는 각 세대의 기준 문서·발표값입니다. 최신 제품 카탈로그가 아니며, HBM2E·HBM3E 행은 JEDEC revision이 아닌 벤더 제품 발표값입니다.

| 세대 | 기준 (발표일) | per-pin | Stack BW | Stack capacity | I/O |
|------|-----------|---------|----------|----------------|-----|
| HBM2 | JESD235A (2016-01-12) · JESD235B (2018-12-17) | 2.0 (산술) · 2.4 Gbps | 256 · 307 GB/s | 최대 8 · 24 GB | 1024-bit |
| HBM2E | Samsung (2020-02-04) · SK hynix (2020-07-02) | 3.2 · 3.6 Gbps | 410 · 460 GB/s | 16 GB | 1024-bit |
| HBM3 | JESD238 (2022-01-27) | 6.4 Gbps | 819 GB/s | 4~64 GB | 1024-bit |
| HBM3E | Micron (2024-02-26) · SK hynix (2024-09-26) | 9.2 초과 · 9.6 Gbps | 1.2 TB/s 초과 · 1,228.8 GB/s (산술) | 24 · 36 GB | 1024-bit |
| HBM4 | JESD270-4 (2025-04 발표) | 최대 8 Gb/s | 최대 2 TB/s | 최대 64 GB | 2048-bit |

1세대 HBM은 인용한 자료 중 [Samsung의 2016년 1월 19일 HBM2 발표](https://news.samsung.com/global/samsung-begins-mass-producing-worlds-fastest-dram-based-on-newest-high-bandwidth-memory-hbm-interface)가 *자사 4 GB HBM2의 256 GB/s는 HBM1 패키지의 두 배*라고 쓴 비교 문장(곧 128 GB/s)에만 나와, 다른 칸을 채울 수 없어 표에서 뺐습니다. 전압은 JEDEC 발표 중 HBM3(동작 1.1 V, host 인터페이스 0.4 V low-swing)와 HBM4(VDDC 1.0·1.05 V, VDDQ 0.7·0.75·0.8·0.9 V)에만 나옵니다.

(산술) 표시는 발표문의 다른 값에서 계산한 칸입니다. HBM2의 2.0 Gbps는 [JESD235A 발표](https://www.jedec.org/news/pressreleases/jedec-updates-groundbreaking-high-bandwidth-memory-hbm-standard)의 256 GB/s를 `256 × 8 ÷ 1024`로 환산한 값입니다. HBM2E의 3.2 Gbps 기준을 JEDEC이 어느 revision에서 정했는지는 JEDEC 발표문을 찾지 못해 표에 적지 않았습니다. JEDEC의 [JESD235 문서 페이지](https://www.jedec.org/standards-documents/docs/jesd235a)는 현재 2021년 3월판 JESD235D를 보여 주고, [Synopsys의 2022년 4월 16일 HBM3 설명](https://www.synopsys.com/articles/hbm3-ip-dwtb.html)은 JESD235D를 *HBM2E 표준*으로 부릅니다.

HBM4 행은 [2025년 4월 발표](https://www.storagenewsletter.com/2025/04/17/jedec-and-industry-leaders-collaborate-to-release-jesd270-4-hbm4-standard/)의 범위입니다. JESD235 계열이 아니라 *새 번호 체계*를 쓰며, [JEDEC 문서 페이지](https://www.jedec.org/standards-documents/docs/jesd270-4)에는 2025년 12월판 JESD270-4A(Version 1.1)가 올라와 있습니다.

각 세대의 *변곡점*을 짚어 가겠습니다.

## HBM — 시작

1세대 HBM의 수치는 이 글에서 연 1차 자료 중 위 Samsung 발표의 비교 문장 하나에만 나옵니다. HBM2 package의 256 GB/s가 HBM1 package의 두 배라는 문장이라, 1세대 stack 대역폭은 128 GB/s입니다. 인용한 자료에는 1세대의 bus 폭·channel 구성·적층 수가 없습니다. JESD235A·B 발표의 1024-bit·8 channel은 HBM2 update의 설명이라 1세대에 옮기지 않았습니다. 같은 1024-bit였다고 두면 pin rate는 `128 × 8 ÷ 1024 = 1.0 Gbps`가 됩니다.

같은 Samsung 발표는 비교 대상으로 *4 Gb GDDR5 chip 하나가 9 Gbps에서 36 GB/s*라고 적습니다. HBM2 stack 하나(256 GB/s)는 그 chip의 `256 ÷ 36 ≈ 7.1`배입니다.

## HBM2 (2016) — 본격화

JESD235A(2016-01-12)가 256 GB/s를, JESD235B(2018-12-17)가 2.4 Gbps·307 GB/s와 12-Hi·16 Gb layer 구성을 정의했습니다.

**HBM2:**

| 항목 | JESD235A | JESD235B |
|------|-----|-----|
| per-pin | 2.0 Gbps (산술) | 2.4 Gbps |
| stack BW | 256 GB/s | 307 GB/s |
| channel | 8 × 128-bit | 8 × 128-bit |
| stack 높이 | 2·4·8-Hi | 2·4·8·12-Hi |
| capacity | stack당 1~8 GB | stack당 1~24 GB |

**대표 카드** — [Volta 백서](https://images.nvidia.com/content/volta-architecture/pdf/volta-architecture-whitepaper.pdf)의 V100은 *stack당 die 4장, stack 4개, 16 GB, 900 GB/s*입니다. [Ampere 백서](https://images.nvidia.com/aem-dam/en-zz/Solutions/data-center/nvidia-ampere-architecture-whitepaper.pdf)의 A100 40GB는 *활성 HBM2 stack 5개, stack당 die 8장, 1215 MHz(DDR), 1555 GB/sec*입니다. 1215 MHz DDR은 `1.215 × 2 = 2.43 Gb/s`이고, `2.43 × 5 × 1024 ÷ 8 = 1,555.2 GB/s`로 백서 값과 맞습니다.

핵심 변화는 *Pseudo Channel*입니다. JESD235A 발표는 이것을 *유효 대역폭을 높이는 새 pseudo channel 구조*로 소개합니다. [AMD PG276](https://docs.amd.com/r/en-US/pg276-axi-hbm/Features)은 HBM2 stack을 channel 8개로, 각 channel을 *64-bit pseudo channel 2개*로 나누고 pseudo channel마다 *stack 용량의 1/16*을 맡긴다고 설명합니다.

| 단위 | 폭 | 개수 (stack당) |
|------|----|----|
| channel | 128-bit | 8 |
| pseudo channel | 64-bit | 16 (channel당 2) |

## HBM2E (2020) — 중간 단계

HBM2E의 수치는 벤더 발표에서 나옵니다.

**HBM2E (2020):**

| 항목 | Samsung Flashbolt | SK hynix |
|------|-----|-----|
| 발표 | [2020-02-04](https://news.samsung.com/global/samsung-to-advance-high-performance-computing-systems-with-launch-of-industrys-first-3rd-generation-16gb-hbm2e) | [2020-07-02 양산](https://news.skhynix.com/sk-hynix-starts-mass-production-of-high-speed-dram-hbm2e/) |
| per-pin | 3.2 Gbps | 3.6 Gbps |
| stack BW | 410 GB/s | 460 GB/s (`3.6 × 1024 ÷ 8 = 460.8`) |
| 구성 | 16 Gb die 8장 = 16 GB | 16 Gb die 8장 = 16 GB |

Samsung은 같은 발표에서 Flashbolt가 *4.2 Gbps까지 시험됐고 그때 stack당 538 GB/s*라고도 밝혔지만, 이는 시험 최고값이며 위 표의 제품 속도가 아닙니다. Synopsys 설명은 HBM2E에서 clock과 data strobe가 *최대 1.8 GHz*로 같아 CA·데이터 모두 3.6 Gbps라고 적습니다.

**대표 카드** — [NVIDIA A100 80GB](https://www.nvidia.com/en-us/data-center/a100/)는 *80 GB HBM2e*, 1,935 GB/s(PCIe)·2,039 GB/s(SXM)입니다. H100 PCIe는 [Hopper 구조 설명](https://developer.nvidia.com/blog/nvidia-hopper-architecture-in-depth/)에서 *80 GB HBM2e, HBM2e stack 5개*입니다.

per-pin이 *2.4 → 3.6 Gbps*로 `3.6 ÷ 2.4 = 1.5`배가 됐고, DRAM die가 *16 Gb*로 커져 8-Hi stack 하나가 *16 GB*가 됐습니다.

## HBM3 (2022) — 세대 변곡

[JEDEC의 2022년 1월 27일 최초 발표](https://www.jedec.org/news/pressreleases/jedec-publishes-hbm3-update-high-bandwidth-memory-hbm-standard)를 기준으로 channel·적층 수·밀도·on-die ECC를 정리합니다.

**HBM3 (JESD238, 2022년 1월):**

| 항목 | 값 |
|------|-----|
| per-pin | 6.4 Gb/s |
| stack BW | 819 GB/s |
| channel | 16 (HBM2의 8에서 두 배) |
| pseudo channel | channel당 2개 (가상 32 channel) |
| max stack | 12-Hi (16-Hi 확장 조항) |
| capacity | 4 GB(8 Gb × 4-Hi) ~ 64 GB(32 Gb × 16-Hi), 1세대 제품은 16 Gb layer 예상 |
| 전압 | 동작 1.1 V, host 인터페이스 0.4 V low-swing |
| ECC | on-die ECC (symbol 기반), 실시간 오류 보고 |

**대표 카드** — NVIDIA H100 SXM5 (HBM3 stack 5개, 80 GB, 3.35 TB/s), [AMD Instinct MI300X](https://www.amd.com/en/products/accelerators/instinct/mi300/mi300x.html) (192 GB HBM3, 5.3 TB/s). AMD는 MI300X의 값을 `8,192-bit × 5.2 Gbps ÷ 8 = 5.325 TB/s`로 각주에 밝힙니다. 8,192-bit는 1024-bit 인터페이스 `8,192 ÷ 1024 = 8`개 분량입니다.

**채널 수 두 배.** 독립 channel이 8개에서 *16개*로 늘었고, channel마다 pseudo channel이 2개라 JEDEC 표현으로 *가상 32 channel*을 지원합니다.

**on-die ECC 표준화.** JEDEC은 HBM3에 *강력한 symbol 기반 on-die ECC*와 *실시간 오류 보고*를 넣었다고 밝힙니다.

**clock 구조 변경.** Synopsys 설명에 따르면 command clock(CK)과 data strobe(WDQS·RDQS)가 분리됐습니다. 6.4 Gbps에서 data strobe는 3.2 GHz, CK는 최대 1.6 GHz라 CA bus의 최대 전송률은 3.2 Gbps입니다.

## HBM3E (2024)

[NVIDIA H200](https://www.nvidia.com/en-us/data-center/h200/)(141 GB HBM3e, 4.8 TB/s)과 [DGX B200](https://www.nvidia.com/en-eu/data-center/dgx-b200/)의 B200이 HBM3e를 씁니다. DGX B200은 GPU 8개에 *총 1,440 GB, 64 TB/s HBM3e*이므로 GPU 하나는 `1,440 ÷ 8 = 180 GB`, `64 ÷ 8 = 8 TB/s`입니다.

**HBM3E — 벤더별 양산 제품:**

| 벤더 | per-pin | stack BW | 구성 | 양산 발표 |
|------|---------|----------------------|------|-----------|
| [Micron](https://micron.gcs-web.com/news-releases/news-release-details/micron-commences-volume-production-industry-leading-hbm3e) | 9.2 Gb/s 초과 | 1.2 TB/s 초과 (발표값) | 8-Hi, 24 GB | 2024-02-26 |
| [SK hynix](https://news.skhynix.com/en/sk-hynix-begins-volume-production-of-the-world-first-12-layer-hbm3e/) | 9.6 Gbps | 1,228.8 GB/s (`9.6 × 1024 ÷ 8`) | 12-Hi, 36 GB | 2024-09-26 |

SK hynix는 12-Hi 36 GB를 *3 GB(24 Gb) DRAM chip 12장*으로 만들었다고 밝힙니다. Micron은 같은 2024년 2월 발표에서 36 GB 12-High HBM3E를 *2024년 3월에 샘플링*한다고 적었습니다.

## HBM4 (2025) — 광폭 인터페이스로

아래는 JEDEC이 2025년 4월 발표한 JESD270-4의 범위입니다. 이후 제품 등급의 최고 속도나 양산 상태를 정리한 표가 아닙니다. `8 × 2048 ÷ 8 = 2,048 GB/s`이며, 발표문의 2 TB/s는 이를 요약한 표현입니다.

HBM4는 *흐름을 바꿉니다*. pin rate는 HBM3E 제품(9.6 Gbps)보다 낮은 8 Gb/s를 기준으로 두고, *bus width를 2배(2048-bit)*로 늘렸습니다.

**HBM4 (JESD270-4, 2025년 4월):**

| 항목 | 값 |
|------|-----|
| per-pin | 최대 8 Gb/s |
| bus | 2048-bit (1024-bit에서 2배) |
| stack BW | 최대 2 TB/s |
| channel | 32 (HBM3의 16에서 두 배), channel당 pseudo channel 2개 |
| stack | 4·8·12·16-Hi |
| DRAM die | 24 Gb 또는 32 Gb |
| max capacity | 64 GB / stack (32 Gb × 16) |
| VDDC / VDDQ | 1.0·1.05 V / 0.7·0.75·0.8·0.9 V (벤더 선택) |
| RAS | DRFM(directed refresh management), row hammer 완화 |
| 호환 | 하나의 controller로 HBM3·HBM4를 함께 지원할 수 있도록 인터페이스 정의 |

## RAS — 신뢰성 기능

세대마다 JEDEC 발표문이 새로 적은 *Reliability·Availability·Serviceability* 기능입니다.

| 세대 | RAS 기능 (발표문 표현) |
|------|---------|
| HBM2 (JESD235A) | DRAM 온도가 신뢰 동작 수준을 넘으면 controller에 알리는 기능 |
| HBM2E (Synopsys 설명) | DM 신호를 ECC 저장 위치로 바꿔 쓰는 host 측 sideband ECC 옵션(64-bit data + 8-bit ECC) |
| HBM3 | symbol 기반 on-die ECC, 실시간 오류 보고·투명성 |
| HBM4 | DRFM으로 row hammer 완화 |

JEDEC은 HBM3의 ECC 도입 이유를 *플랫폼 수준의 높은 RAS에 대한 시장 요구*로 적습니다. Synopsys 설명에 따르면 HBM3는 DM 신호를 없애고 pseudo channel마다 ECC 신호 2개를 더했으며, 그래서 32 byte보다 작은 write는 read-modify-write가 필요합니다.

## bandwidth 그래프

세대별 stack 1개의 기준 대역폭 비교입니다. HBM3E는 SK hynix 2024년 제품, HBM4는 2025년 최초 표준 발표 기준입니다. 막대는 동일한 선형 축을 사용하며 최신 제품 최고 속도를 뜻하지 않습니다.

![HBM 세대별 기준 대역폭 — 선형 GB/s 축, 표준 발표와 제품 예 구분](/images/blog/hardware/hbm/diagrams/ch03-stack-bw.svg)

NVIDIA 백서와 제품 사양에 기초한 카드 비교입니다. 마지막 열은 공개 peak를 stack 수로 나눈 산술 평균입니다. sustained 대역폭의 관측값이나 효율이 아닙니다.

| 카드 | HBM | stack 수 | 총 BW | stack당 공칭 평균 BW |
|------|-----|---------|--------|----------------|
| V100 (16 GB) | HBM2 | 4 | 900 GB/s | `900 ÷ 4 = 225 GB/s` |
| A100 (40 GB) | HBM2 | 5 | 1,555 GB/s | `1,555 ÷ 5 = 311 GB/s` |
| H100 SXM5 | HBM3 | 5 | 3.35 TB/s | `3,350 ÷ 5 = 670 GB/s` |
| H200 | HBM3e | — | 4.8 TB/s | — |
| B200 | HBM3e | — | 8 TB/s | — |

A100 40GB의 311 GB/s가 위 JESD235B 기준 307 GB/s보다 높은 것은 백서의 1215 MHz(2.43 Gb/s)가 2.4 Gbps보다 조금 빠르기 때문입니다. H200·B200의 stack 수는 이 글에서 연 NVIDIA 자료에 나오지 않아 비워 두었습니다.

연산과 메모리의 증가율 비교는 [Ch 5](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)에서 V100·H100의 공개 사양으로 직접 계산합니다.

## 자주 하는 실수

### "HBM3E와 HBM3가 *같은 슬롯*에 호환된다"

HBM은 DIMM 슬롯이 아니라 패키지 안에 통합됩니다([Ch 2](/blog/embedded/hardware/hbm/chapter02-hbm-stack)). 세대를 고르는 곳은 *패키지 설계 단계*입니다. NVIDIA GH100 die가 좋은 예입니다. Hopper 구조 설명에서 GH100 전체 구성은 *HBM3 또는 HBM2e stack 6개*를 지원하지만, H100 SXM5는 *HBM3 stack 5개*, H100 PCIe는 *HBM2e stack 5개*로 *패키지를 따로* 만들었습니다. H200은 같은 Hopper 세대 GPU에 *HBM3e*를 붙인 제품입니다.

### per-pin rate를 *channel rate*와 혼동

HBM3 *per-pin*은 6.4 Gb/s입니다. 그런데 *DDR이라서 effective rate는 12.8 Gbps* 같은 식의 *오해*가 있습니다. JEDEC 발표의 6.4 Gb/s는 *data rate*이고, [JESD238B.01 문서 페이지](https://www.jedec.org/standards-documents/docs/jesd238a)는 channel의 데이터 bus가 *double data rate로 동작*한다고 적습니다. Synopsys 설명대로 이 속도에서 data strobe(WDQS·RDQS)는 *3.2 GHz*로 돌고, host가 보내는 CK는 *최대 1.6 GHz*입니다. `3.2 GHz × 2 = 6.4 Gb/s`가 이미 DDR을 포함한 값입니다.

### "Samsung·SK·Micron이 *같은 9.6 Gbps*다"

같은 HBM3E라도 발표된 속도가 다릅니다. Micron은 *9.2 Gb/s 초과*, SK hynix는 *9.6 Gbps*를 발표했습니다. 세대 이름만으로 같은 속도 등급이라고 가정하면 안 됩니다.

### HBM4를 *HBM3E의 단순한 클럭 업그레이드*로 가정

HBM4는 *bus width 자체가 2배*입니다. JEDEC은 하나의 controller가 *HBM3와 HBM4를 함께* 다룰 수 있도록 인터페이스를 정의했다고 밝혔지만, 데이터 신호는 1024개에서 2048개로 늘었습니다. 대역폭 증가는 pin rate가 아니라 이 폭에서 나옵니다.

## 정리

- HBM은 1세대 128 GB/s에서 9.6 Gbps HBM3E의 1,228.8 GB/s까지 stack BW가 `1,228.8 ÷ 128 = 9.6`배로 늘었습니다.
- 세대 간 *변곡점*은 HBM2(PC 도입), HBM3(channel 16개·1.1 V·on-die ECC), HBM4(2048-bit bus)입니다.
- *per-pin rate*는 HBM2의 *2.0 Gbps*(JESD235A 산술)에서 HBM3E의 *9.6 Gbps*까지 올라갔습니다.
- *DRAM die 밀도*는 Samsung HBM2 *8 Gb*, HBM2E *16 Gb*, SK hynix HBM3E *24 Gb*로 늘어 *stack capacity*를 *36 GB*까지 끌어올렸습니다.
- HBM3에서 *on-die ECC*가 표준에 들어갔습니다.
- HBM4는 pin rate 대신 *bus width(2048-bit)*를 늘려 대역폭을 올렸습니다.
- 벤더별 *pin rate*가 다르므로 *세대 이름만으로 같은 속도를 가정*하면 안 됩니다.
- 다음 장에서 *반대편의 GDDR*을 봅니다. PAM 신호의 symbol rate와 데이터 전송률을 구별하는 것이 핵심입니다.

## 다음 편

[Ch 4: GDDR6·GDDR6X·GDDR7](/blog/embedded/hardware/hbm/chapter04-gddr)에서는 *PAM4·PAM3* 같은 *멀티 레벨 signaling*이 symbol당 bit 수와 전압 여유를 어떻게 바꾸는지 봅니다. *PCB 라우팅*과 *signal integrity* 부담도 같이 다룹니다.

## 관련 항목

- [Ch 1: 고대역 메모리 개요](/blog/embedded/hardware/hbm/chapter01-overview)
- [Ch 2: HBM 스택 구조와 TSV](/blog/embedded/hardware/hbm/chapter02-hbm-stack)
- [Ch 4: GDDR6·GDDR6X·GDDR7](/blog/embedded/hardware/hbm/chapter04-gddr)
- [Ch 5: 대역폭 계산과 병목 분석](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)
