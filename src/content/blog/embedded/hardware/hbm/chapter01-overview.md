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

NVIDIA H100과 RTX 4090을 같이 놓고 보면 서로 다른 메모리 구성을 씁니다. 이 글은 두 제품이 발표된 세대의 비교이며 현재 제품의 최고 사양 순위가 아닙니다. 그런데 H100 SXM은 *80 GB HBM3*에 *3.35 TB/s*, RTX 4090은 *24 GB GDDR6X*에 *1,008 GB/s*입니다. 같은 회사의 같은 시기 칩인데 *메모리 선택*이 완전히 다릅니다. 이 분기점이 어디서 생기는지가 이 시리즈의 시작입니다.

## DRAM 가족의 분기

JEDEC 표준 안에서 DRAM은 *네 갈래*로 갈렸습니다.

| 계열 | 용도 |
|------|------|
| **DDR** (Double Data Rate) | CPU·서버 메인 메모리 |
| **LPDDR** (Low Power DDR) | 모바일·랩탑·자동차 |
| **GDDR** (Graphics DDR) | GPU·그래픽 카드·일부 추론 카드 |
| **HBM** (High Bandwidth Memory) | HPC·AI 가속기 |

뿌리는 같은 DRAM 셀입니다. 갈리는 곳은 *셀 밖*입니다. 신호를 어떻게 보내는지, bus를 얼마나 넓게 가져가는지, 패키지를 어떻게 묶는지가 다릅니다.

## 분기의 본질

| 축 | DDR | GDDR | HBM |
|----|-----|------|-----|
| Bus width | 64-bit/DIMM | x32 구성 기준 32-bit/chip | 1024-bit/stack (HBM4는 2048-bit) |
| Signaling | NRZ | NRZ (GDDR6) · PAM4 (GDDR6X) · PAM3 (GDDR7) | NRZ |
| Packaging | DIMM (PCB) | BGA on PCB | TSV stack on interposer |

GDDR은 *pin rate를 끝까지 밀어 올린* 방식입니다. 32-bit *좁은 bus*에 *PAM4·PAM3* 같은 *멀티 레벨 signaling*까지 끌어와 pin rate를 올립니다.

HBM은 *반대 방향*입니다. *pin rate는 낮게 두고*, 대신 *bus width*를 *1024-bit*까지 넓힙니다. HBM3의 1024는 데이터 DQ 폭입니다. 명령·주소·전원까지 포함한 전체 접점 수가 아닙니다.

두 방식을 실제 제품으로 비교하면 이렇습니다.

**GDDR6X 방식 (RTX 4090).** `21 Gbps × 384-bit ÷ 8 = 1,008 GB/s`. 32-bit chip 12개를 PCB 위에 놓습니다. chip 1개당 `21 × 32 ÷ 8 = 84 GB/s`입니다.

**HBM3 방식 (H100 SXM5).** HBM3 stack 5개를 interposer 위에 놓아 *3.35 TB/s*를 냅니다. HBM3 정격(6.4 Gbps, stack당 819 GB/s)으로 돌리면 5 stack이 4.1 TB/s지만, H100의 공개 peak를 5로 나누면 stack당 약 670 GB/s입니다. 이는 산술 평균이며 측정한 sustained 대역폭이 아닙니다. 두 제품의 입력값은 [NVIDIA H100 사양](https://www.nvidia.com/en-us/data-center/h100/)과 [Ada 백서의 RTX 4090 부록](https://images.nvidia.cn/aem-dam/Solutions/geforce/ada/nvidia-ada-gpu-architecture.pdf)을 기준으로 합니다.

같은 *총 대역폭*을 만들어도 *pin 수, 배선, 패키징*이 완전히 다릅니다.

## Bandwidth per pin

핵심 지표 하나를 짚고 가야 합니다. *pin 1개당 데이터 전송률*입니다.

| 메모리 | 기준 | per-pin | signaling |
|--------|------|---------|-----------|
| HBM2 | JESD235B (2018) | 2.4 Gbps | NRZ |
| HBM2E | JESD235C (2020) / SK hynix | 3.2 / 3.6 Gbps | NRZ |
| HBM3 | JESD238 (2022) | 6.4 Gbps | NRZ |
| HBM3E | SK hynix 12-Hi (2024) | 9.6 Gbps | NRZ |
| GDDR6 | JESD250 (2017) | 최대 16 Gbps | NRZ |
| GDDR6X | Micron (RTX 3090 Ti) | 21 Gbps | PAM4 |
| GDDR7 | JESD239 (2024) | 최대 48 Gbps | PAM3 |

GDDR은 NRZ에서 PAM4, 다시 PAM3으로 *signaling 자체를 바꿔* 가며 pin rate를 올렸습니다. HBM은 HBM2(2.4 Gbps)에서 HBM3E(9.6 Gbps)까지 *4배* 늘었습니다. 대신 bus가 1024-bit라 HBM3 stack 하나(819 GB/s)가 GDDR6X chip(84 GB/s) *약 10개 분량*입니다.

## 패키징의 분기

GDDR chip은 *일반 PCB 위 BGA*로 붙습니다. 이 글에서 비교하는 CoWoS 방식은 GPU와 HBM을 interposer로 연결합니다. [SK hynix·TSMC의 2024년 설명](https://news.skhynix.com/en/sk-hynix-partners-with-tsmc-to-strengthen-hbm-technological-leadership/)도 이 구조를 2.5D 패키징으로 정의합니다. 넓은 DQ를 짧게 연결한다는 설계 차이에 주목해야 하며, 모든 HBM 패키지에 실리콘 interposer만 가능하다는 뜻은 아닙니다. 구매 가격·조립 수율·열 설계를 같은 조건으로 비교한 비용 자료가 없어 여기서는 가격 우열을 계산하지 않습니다.

## 시장 분할

메모리 종류로 제품을 나누면 다음과 같습니다.

| 진영 | 대표 제품 |
|------|-----------|
| **HBM** | NVIDIA H100·H200·B200 (HBM3·HBM3e)<br>AMD Instinct MI300X (HBM3)·MI325X (HBM3E)<br>Intel Gaudi 3 (HBM2e) |
| **GDDR** | NVIDIA GeForce RTX 4090 (GDDR6X)<br>NVIDIA L4·L40 (GDDR6) |

같은 NVIDIA 안에서도 H100은 HBM, RTX 4090은 GDDR입니다.

## HBM 양산 이력

HBM 양산은 한국 두 회사와 Micron이 이끌어 왔습니다.

| 시기 | 회사 | 내용 |
|------|------|------|
| 2015 | SK hynix | AMD Radeon R9 Fury X의 1세대 HBM 공급 |
| 2016년 1월 | Samsung | 4 GB HBM2 양산 |
| 2020년 2월 | Samsung | 16 GB HBM2E (Flashbolt, 3.2 Gbps) 발표 |
| 2020년 7월 | SK hynix | 16 GB HBM2E 양산 (3.6 Gbps) |
| 2022년 6월 | SK hynix | HBM3 양산, NVIDIA H100에 공급 |
| 2024년 2월 | Micron | 24 GB 8-Hi HBM3E 양산 발표 ([9.2 Gbps 초과·1.2 TB/s 초과](https://micron.gcs-web.com/news-releases/news-release-details/micron-commences-volume-production-industry-leading-hbm3e), H200용) |
| 2024년 9월 | SK hynix | [12-Hi 36 GB HBM3E 양산 발표](https://news.skhynix.com/en/sk-hynix-begins-volume-production-of-the-world-first-12-layer-hbm3e/) (9.6 Gbps) |

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

*per-stack*과 *per-chip*을 헷갈리면 그런 결론이 나옵니다. HBM3 stack 1개는 *819 GB/s*, GDDR6X chip 1개는 *84 GB/s*입니다. 10배 차이로 보입니다. 하지만 RTX 4090은 GDDR6X chip *12개*로 *1,008 GB/s*를 냅니다. HBM3 stack 약 1.2개 분량입니다. *시스템 레벨*에서 봐야 합니다.

### "GDDR과 LPDDR이 같은 거다"

다릅니다. LPDDR은 *모바일용 저전력 DRAM*이고, GDDR은 *그래픽용 고속 DRAM*입니다. JEDEC 표준 자체가 따로 있습니다.

### HBM이 *DDR5의 후속*이라는 오해

HBM은 *DDR5의 진화형*이 아니라 *패키징부터 다른 카테고리*입니다. CPU가 HBM을 쓰는 예도 있습니다. Intel Xeon CPU Max는 패키지 안의 HBM2e(최대 64 GB)를 *HBM-only*, DDR과 함께 쓰는 *Flat*, DDR의 캐시로 쓰는 *Cache* 세 모드로 씁니다. Fujitsu A64FX(슈퍼컴퓨터 후가쿠)는 32 GB HBM2를 *주 메모리*로 씁니다.

## 정리

- DRAM 가족은 *DDR·LPDDR·GDDR·HBM* 네 갈래로 갈렸고, *셀은 같지만 패키징과 signaling*이 다릅니다.
- GDDR은 *32-bit 좁은 bus*에 *PAM4·PAM3*로 pin rate를 올린 방식입니다. GDDR7 규격은 최대 48 Gbps입니다.
- HBM은 *1024-bit 넓은 bus*에 *낮은 pin rate*로 stack당 *819 GB/s(HBM3)~1.23 TB/s(HBM3E)*를 만든 방식입니다.
- 비교한 CoWoS 구조는 HBM과 GPU를 interposer로 연결하며, DQ 폭과 전체 접점 수를 구별해야 합니다.
- H100·H200·B200·MI300X는 HBM, RTX 4090·L4·L40은 GDDR입니다.
- 다음 장부터 *HBM stack 구조*와 *TSV*부터 차근차근 들어갑니다.

## 다음 편

[Ch 2: HBM 스택 구조와 TSV](/blog/embedded/hardware/hbm/chapter02-hbm-stack)에서는 *base die*와 *DRAM die*가 *어떻게 적층*되는지, *TSV(Through-Silicon Via)*가 *어떻게 전기 신호를 위로 통과*시키는지를 봅니다. *microbump pitch*와 *yield* 이슈도 함께 다룹니다.

## 관련 항목

- [Ch 2: HBM 스택 구조와 TSV](/blog/embedded/hardware/hbm/chapter02-hbm-stack)
- [Ch 3: HBM2/HBM2E/HBM3/HBM3E 스펙 비교](/blog/embedded/hardware/hbm/chapter03-hbm-generations)
- [Ch 4: GDDR6·GDDR6X·GDDR7](/blog/embedded/hardware/hbm/chapter04-gddr)
