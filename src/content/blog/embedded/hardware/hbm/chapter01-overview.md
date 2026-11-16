---
title: "HBM과 GDDR의 분기점 — 버스 폭과 패키징 비교"
slug: "embedded/hardware/hbm/chapter01-overview"
date: 2026-05-16T09:01:00
description: "H100과 RTX 4090의 공개 사양으로 버스 폭·전송률·패키징의 차이를 비교합니다."
series: "HBM·GDDR 심화"
seriesOrder: 1
tags: [hbm, gddr, memory, bandwidth]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"같은 DRAM 셀에서 시작했지만, *bus width와 packaging*이 갈렸습니다."** — GDDR은 *PCB 위 chip*으로 *pin rate를 끝까지 밀어 올린* 방식, HBM은 *interposer 위 stack*으로 *bus를 1024-bit까지 넓힌* 방식입니다.

NVIDIA H100과 RTX 4090을 같이 놓고 보면 서로 다른 메모리 구성을 씁니다. [NVIDIA H100 제품 사양](https://www.nvidia.com/en-us/data-center/h100/)에서 H100 SXM은 *80 GB*에 *3.35 TB/s*이고, [Hopper 구조 설명](https://developer.nvidia.com/blog/nvidia-hopper-architecture-in-depth/)은 이 80 GB가 *HBM3 stack 5개*라고 밝힙니다. [Ada 백서](https://images.nvidia.cn/aem-dam/Solutions/geforce/ada/nvidia-ada-gpu-architecture.pdf)의 RTX 4090 사양은 *24 GB GDDR6X*, *1008 GB/sec*입니다. 같은 회사의 칩인데 *메모리 선택*이 완전히 다릅니다. 이 분기점이 어디서 생기는지가 이 시리즈의 시작입니다. 이 글은 두 제품 세대를 비교하며 현재 제품의 최고 사양 순위를 매기지 않습니다.

## DRAM 가족의 분기

JEDEC 표준 안에서 DRAM은 *네 갈래*로 갈렸습니다. 각 계열은 표준 문서도 따로 있습니다.

| 계열 | 대표 표준 | 이 시리즈에서 보는 제품 예 |
|------|-----------|-----------|
| **DDR** (Double Data Rate) | [JESD79-5](https://www.jedec.org/standards-documents/docs/jesd79-5) (DDR5) | 서버·PC 메인 메모리 |
| **LPDDR** (Low Power DDR) | [JESD209-5](https://www.jedec.org/standards-documents/docs/jesd209-5) (LPDDR5) | AMD Strix Halo의 LPDDR5X ([Ch 4](/blog/embedded/hardware/hbm/chapter04-gddr)) |
| **GDDR** (Graphics DDR) | JESD250 (GDDR6) · JESD239 (GDDR7) | RTX 4090·L4·L40 |
| **HBM** (High Bandwidth Memory) | JESD235 (HBM·HBM2) · JESD238 (HBM3) · JESD270-4 (HBM4) | H100·H200·MI300X |

뿌리는 같은 DRAM 셀입니다. 갈리는 곳은 *셀 밖*입니다. 신호를 어떻게 보내는지, bus를 얼마나 넓게 가져가는지, 패키지를 어떻게 묶는지가 다릅니다.

## 분기의 본질

| 축 | GDDR | HBM |
|----|------|-----|
| Bus width | 32 DQ/chip ([Micron GDDR6](https://www.micron.com/content/dam/micron/global/public/products/product-flyer/gddr6-product-flyer.pdf)) | 1024-bit/stack (HBM3: 64-bit channel × 16), HBM4는 2048-bit |
| Signaling | NRZ (GDDR6) · PAM4 (GDDR6X) · PAM3 (GDDR7) | JEDEC 발표문에 방식 명시 없음 |
| Packaging | BGA on PCB | TSV stack, interposer로 host와 연결 |

GDDR은 *pin rate를 끝까지 밀어 올린* 방식입니다. chip당 32 DQ의 *좁은 bus*에 [Micron GDDR6X](https://www.micron.com/products/memory/graphics-memory/gddr6x)의 *PAM4*, [JEDEC GDDR7](https://www.jedec.org/news/pressreleases/jedec-publishes-gddr7-graphics-memory-standard)의 *PAM3* 같은 *멀티 레벨 signaling*까지 끌어와 pin rate를 올립니다.

HBM은 *반대 방향*입니다. *pin rate는 낮게 두고*, 대신 *bus width*를 *1024-bit*까지 넓힙니다. [JEDEC HBM3 문서 페이지](https://www.jedec.org/standards-documents/docs/jesd238a)는 channel마다 *64-bit 데이터 bus*를 두고, [2022년 HBM3 발표](https://www.jedec.org/news/pressreleases/jedec-publishes-hbm3-update-high-bandwidth-memory-hbm-standard)는 독립 channel을 *16개*로 정했습니다. `64 × 16 = 1024`이므로 1024는 데이터 DQ 폭입니다. 명령·주소·전원까지 포함한 전체 접점 수가 아닙니다.

두 방식을 실제 제품으로 비교하면 이렇습니다.

**GDDR6X 방식 (RTX 4090).** Ada 백서의 입력값은 21 Gbps, 384-bit입니다. `21 Gbps × 384 ÷ 8 = 1,008 GB/s`로 백서의 1008 GB/sec와 일치합니다. 같은 백서는 AD102의 384-bit를 *32-bit 메모리 컨트롤러 12개*로 설명합니다. 컨트롤러 하나가 x32 chip 하나를 맡는다고 두면 chip 1개당 `21 × 32 ÷ 8 = 84 GB/s`입니다.

**HBM3 방식 (H100 SXM5).** HBM3 stack 5개로 *3.35 TB/s*를 냅니다. HBM3 정격(JEDEC 6.4 Gb/s, stack당 819 GB/s)으로 돌리면 `5 × 819.2 = 4,096 GB/s`지만, H100의 공개 peak를 5로 나누면 stack당 `3,350 ÷ 5 = 670 GB/s`입니다. 거꾸로 pin rate로 환산하면 `3,350 × 8 ÷ (5 × 1024) ≈ 5.23 Gb/s`입니다. NVIDIA가 이 pin rate를 직접 공개하지는 않으므로 이 값은 공개 peak에서 역산한 산술값이며 측정한 sustained 대역폭이 아닙니다.

같은 *총 대역폭*을 만들어도 *pin 수, 배선, 패키징*이 완전히 다릅니다.

## Bandwidth per pin

핵심 지표 하나를 짚고 가야 합니다. *pin 1개당 데이터 전송률*입니다.

| 메모리 | 기준 (발표일) | per-pin | signaling |
|--------|------|---------|-----------|
| HBM2 | [JESD235B](https://www.jedec.org/news/pressreleases/jedec-updates-groundbreaking-high-bandwidth-memory-hbm-standard-0) (2018-12-17) | 2.4 Gbps | TBD |
| HBM2E | [Samsung Flashbolt](https://news.samsung.com/global/samsung-to-advance-high-performance-computing-systems-with-launch-of-industrys-first-3rd-generation-16gb-hbm2e) (2020-02-04) / [SK hynix](https://news.skhynix.com/sk-hynix-starts-mass-production-of-high-speed-dram-hbm2e/) (2020-07-02) | 3.2 / 3.6 Gbps | TBD |
| HBM3 | [JESD238](https://www.jedec.org/news/pressreleases/jedec-publishes-hbm3-update-high-bandwidth-memory-hbm-standard) (2022-01-27) | 6.4 Gbps | TBD |
| HBM3E | [SK hynix 12-Hi](https://news.skhynix.com/en/sk-hynix-begins-volume-production-of-the-world-first-12-layer-hbm3e/) (2024-09-26) | 9.6 Gbps | TBD |
| GDDR6 | [Micron GDDR6 flyer](https://www.micron.com/content/dam/micron/global/public/products/product-flyer/gddr6-product-flyer.pdf) | 최대 16 Gbps | TBD |
| GDDR6X | Ada 백서 (RTX 4090) / Micron 제품 페이지 | 21 / 최대 24 Gbps | PAM4 |
| GDDR7 | [JESD239](https://www.jedec.org/news/pressreleases/jedec-publishes-gddr7-graphics-memory-standard) (2024-03-05) | 192 GB/s ÷ 32 DQ × 8 = 48 Gbps | PAM3 |

HBM2E 행은 JEDEC 발표문을 찾지 못해 두 벤더의 제품 발표값을 적었습니다. GDDR7의 48 Gbps는 JEDEC이 밝힌 *device당 192 GB/s*를 x32 device로 나눈 산술값이며, 발표문 자체는 pin rate를 적지 않습니다. signaling 칸의 TBD는 이 글에서 연 발표문에 신호 방식이 나오지 않은 곳입니다.

GDDR은 NRZ에서 PAM4, 다시 PAM3으로 *signaling 자체를 바꿔* 가며 pin rate를 올렸습니다. HBM은 HBM2(2.4 Gbps)에서 HBM3E(9.6 Gbps)까지 `9.6 ÷ 2.4 = 4배` 늘었습니다. 대신 bus가 1024-bit라 HBM3 stack 하나(819 GB/s)가 GDDR6X chip(84 GB/s)의 `819 ÷ 84 ≈ 9.75`, *약 10개 분량*입니다.

## 패키징의 분기

GDDR chip은 *PCB 위 BGA*로 붙습니다. Micron의 GDDR6 flyer는 패키지를 *BGA-180*으로 적습니다. HBM 쪽은 [SK hynix·TSMC의 2024년 4월 19일 발표](https://news.skhynix.com/en/sk-hynix-partners-with-tsmc-to-strengthen-hbm-technological-leadership/)가 CoWoS를 *GPU와 HBM을 interposer라는 기판 위에서 잇는 2.5D 패키징*으로 정의합니다. 이 글이 비교하는 것은 넓은 DQ를 짧게 잇는다는 설계 차이입니다. 모든 HBM 패키지가 실리콘 interposer를 쓴다는 주장은 하지 않습니다. 구매 가격·조립 수율·열 설계를 같은 조건으로 비교한 공개 자료를 찾지 못해 여기서는 가격 우열을 계산하지 않습니다.

## 시장 분할

메모리 종류로 제품을 나누면 다음과 같습니다. 출처는 각 벤더의 제품 페이지·백서입니다.

| 진영 | 대표 제품 (메모리) | 출처 |
|------|-----------|------|
| **HBM** | NVIDIA H100 SXM (HBM3), H200 (HBM3e), DGX B200의 B200 (HBM3e) | Hopper 구조 설명, [H200](https://www.nvidia.com/en-us/data-center/h200/), [DGX B200](https://www.nvidia.com/en-eu/data-center/dgx-b200/) |
| **HBM** | AMD Instinct MI300X (HBM3), MI325X (HBM3E) | [MI300X](https://www.amd.com/en/products/accelerators/instinct/mi300/mi300x.html), [MI325X](https://www.amd.com/en/products/accelerators/instinct/mi300/mi325x.html) |
| **GDDR** | GeForce RTX 4090 (GDDR6X), L4 (GDDR6) | Ada 백서 본문·부록 D |
| **GDDR** | L40 (GDDR6), GeForce RTX 5090 (GDDR7) | [L40](https://www.nvidia.com/en-us/data-center/l40/), [RTX 5090](https://www.nvidia.com/en-us/geforce/graphics-cards/50-series/rtx-5090/) |

같은 NVIDIA 안에서도 H100은 HBM, RTX 4090은 GDDR입니다.

## HBM 양산 이력

각 행은 해당 회사의 발표문 날짜입니다.

| 발표일 | 회사 | 내용 |
|------|------|------|
| 2016-01-19 | [Samsung](https://news.samsung.com/global/samsung-begins-mass-producing-worlds-fastest-dram-based-on-newest-high-bandwidth-memory-hbm-interface) | 4 GB HBM2 양산 시작 (8 Gb die 4장, stack당 256 GB/s) |
| 2020-02-04 | Samsung | 16 GB HBM2E Flashbolt 발표 (16 Gb die 8장, 3.2 Gbps, 410 GB/s) |
| 2020-07-02 | SK hynix | 16 GB HBM2E 양산 (3.6 Gbps, 460 GB/s) |
| 2022-06-08 | [SK hynix](https://news.skhynix.com/sk-hynix-to-supply-industrys-first-hbm3-dram-to-nvidia/) | HBM3 양산, NVIDIA H100에 공급 (최대 819 GB/s) |
| 2024-02-26 | [Micron](https://micron.gcs-web.com/news-releases/news-release-details/micron-commences-volume-production-industry-leading-hbm3e) | 24 GB 8-Hi HBM3E 양산 (9.2 Gbps 초과, 1.2 TB/s 초과, H200용) |
| 2024-09-26 | SK hynix | 12-Hi 36 GB HBM3E 양산 (9.6 Gbps) |

Samsung의 2016년 발표는 이 4 GB HBM2의 256 GB/s를 *HBM1 패키지의 두 배*라고 설명합니다. 1세대 HBM의 stack당 대역폭이 128 GB/s였다는 뜻입니다.

## 시리즈 로드맵

이 시리즈는 *HBM 중심*으로 가지만 *GDDR과의 비교*도 빼지 않습니다. 뒤쪽 네 장은 HBM 너머의 메모리인 CXL.mem을 다룹니다.

| 챕터 | 주제 | 핵심 |
|------|------|------|
| Ch 1 | 개요 (이 글) | HBM vs GDDR 분기 |
| Ch 2 | HBM stack 구조 | TSV·base die·microbump |
| Ch 3 | 세대 비교 | HBM2 → HBM4 |
| Ch 4 | GDDR | GDDR6·6X·7 |
| Ch 5 | 대역폭 병목 | sustained BW·roofline |
| Ch 6 | 열·전력 | refresh·cooling |
| Ch 7 | 메모리 컨트롤러 | bank·scheduling |
| Ch 8 | NPU·GPU 활용 | weight·KV cache |
| Ch 9 | CXL.mem | HBM·GDDR·DDR 다음의 메모리 계층 |
| Ch 10 | CXL.mem 프로토콜 | 왕복 지연과 링크 대역폭 |
| Ch 11 | CXL 디바이스 타입 | Type 1·2·3 |
| Ch 12 | 메모리 풀링 | 데이터센터 토폴로지 |

## 자주 하는 실수

### "HBM이 항상 GDDR보다 빠르다"

*per-stack*과 *per-chip*을 헷갈리면 그런 결론이 나옵니다. HBM3 stack 1개는 *819 GB/s*, GDDR6X chip 1개는 *84 GB/s*입니다. 10배 차이로 보입니다. 하지만 RTX 4090은 32-bit 컨트롤러 *12개*로 *1,008 GB/s*를 냅니다. `1,008 ÷ 819.2 ≈ 1.23`, HBM3 정격 stack 약 1.2개 분량입니다. *시스템 레벨*에서 봐야 합니다.

### "GDDR과 LPDDR이 같은 거다"

다릅니다. 표준부터 따로입니다. GDDR6은 JESD250, LPDDR5는 JESD209-5입니다. [JESD250D 문서 페이지](https://www.jedec.org/standards-documents/docs/jesd250)는 GDDR6를 *8~16 Gb x16 dual channel SGRAM*의 최소 요구사항으로 정의합니다.

### HBM이 *DDR5의 후속*이라는 오해

HBM은 *DDR5의 진화형*이 아니라 *패키징부터 다른 카테고리*입니다. CPU가 HBM을 쓰는 예도 있습니다. [Intel Xeon CPU Max 제품 페이지](https://www.intel.com/content/www/us/en/products/details/processors/xeon/max-series.html)는 패키지 안에 *HBM2e 64 GB를 stack 4개*로 두고, 64 GB 안에 들어가는 workload는 *DDR 없이* 돌릴 수 있다고 설명합니다.

## 정리

- DRAM 가족은 *DDR·LPDDR·GDDR·HBM* 네 갈래로 갈렸고, 표준 문서도 따로입니다. *셀은 같지만 패키징과 signaling*이 다릅니다.
- GDDR은 *chip당 32 DQ*에 *PAM4(GDDR6X)·PAM3(GDDR7)*로 pin rate를 올린 방식입니다. GDDR7은 device당 192 GB/s, x32 기준 48 Gbps입니다.
- HBM은 *1024-bit 넓은 bus*에 *낮은 pin rate*로 stack당 *819 GB/s(HBM3 정격)~1,228.8 GB/s(9.6 Gbps HBM3E)*를 만든 방식입니다.
- H100 SXM의 3.35 TB/s를 stack 5개로 나누면 670 GB/s, pin rate로는 약 5.23 Gb/s로 HBM3 정격보다 낮습니다.
- H100·H200·B200·MI300X·MI325X는 HBM, RTX 4090·L4·L40·RTX 5090은 GDDR입니다.
- 다음 장부터 *HBM stack 구조*와 *TSV*부터 차근차근 들어갑니다.

## 다음 편

[Ch 2: HBM 스택 구조와 TSV](/blog/embedded/hardware/hbm/chapter02-hbm-stack)에서는 *base die*와 *DRAM die*가 *어떻게 적층*되는지, *TSV(Through-Silicon Via)*가 *어떻게 전기 신호를 위로 통과*시키는지를 봅니다. die 사이를 잇는 *microbump*와, 쌓는 장수가 늘수록 불리해지는 *yield 모델*도 함께 다룹니다.

## 관련 항목

- [Ch 2: HBM 스택 구조와 TSV](/blog/embedded/hardware/hbm/chapter02-hbm-stack)
- [Ch 3: HBM2/HBM2E/HBM3/HBM3E 스펙 비교](/blog/embedded/hardware/hbm/chapter03-hbm-generations)
- [Ch 4: GDDR6·GDDR6X·GDDR7](/blog/embedded/hardware/hbm/chapter04-gddr)
