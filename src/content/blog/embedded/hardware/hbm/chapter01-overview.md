---
title: "HBM과 GDDR 분기점 분석 — Bandwidth·Capacity·Cost 트레이드오프"
date: 2026-05-16T09:01:00
description: "HBM과 GDDR의 분기점 — bandwidth·capacity·cost의 트레이드오프와 시장 분할."
series: "HBM·GDDR 심화"
seriesOrder: 1
tags: [hbm, gddr, memory, bandwidth]
draft: false
---

## 한 줄 요약

> **"같은 DRAM 셀에서 시작했지만, *bus width와 packaging*이 갈렸습니다."** — GDDR은 *PCB 위 chip*으로 *clock을 끝까지 밀어 올린* 방식, HBM은 *interposer 위 stack*으로 *bus를 1024-bit까지 넓힌* 방식입니다. 한쪽은 *값이 싸고 capacity가 크고*, 다른 쪽은 *대역폭과 효율*이 큽니다.

NVIDIA H100과 RTX 4090을 같이 놓고 보면 둘 다 *최신 메모리*를 씁니다. 그런데 H100은 *80 GB HBM3*에 *3.35 TB/s*, RTX 4090은 *24 GB GDDR6X*에 *1.0 TB/s*입니다. 같은 회사의 같은 세대 칩인데 *메모리 선택*이 완전히 다릅니다. 이 분기점이 어디서 생기는지가 이 시리즈의 시작입니다.

## DDR 가족의 분기

JEDEC 표준 안에서 DRAM은 *세 갈래*로 갈렸습니다.

| 계열 | 용도 | 세대 |
|------|------|------|
| **DDR** (Double Data Rate) | CPU·서버 메인 메모리 | DDR4 (3.2 Gbps, 데스크탑·서버) · DDR5 (4.8~8.0 Gbps, 현세대) |
| **LPDDR** (Low Power DDR) | 모바일·랩탑·자동차 | LPDDR4X (4.2 Gbps) · LPDDR5X (8.5 Gbps) |
| **GDDR** (Graphics DDR) | GPU·콘솔·네트워킹 | GDDR6 (14~16 Gbps, NRZ) · GDDR6X (21~24 Gbps, PAM4) · GDDR7 (32 Gbps+, PAM3) |
| **HBM** (High Bandwidth Memory) | HPC·AI 가속기 | HBM2 (2.4 Gbps × 1024-bit) · HBM2E (3.6 Gbps) · HBM3 (6.4 Gbps, 819 GB/s) · HBM3E (9.2~9.8 Gbps, 1.2 TB/s+) · HBM4 (2048-bit, 1.6 TB/s+, 2025+) |

뿌리는 같은 DRAM 셀입니다. 셀 자체의 *access time*은 *나노초 단위*로 거의 차이가 없습니다. 갈리는 곳은 *셀 밖*입니다. 신호를 어떻게 보내는지, bus를 얼마나 넓게 가져가는지, 패키지를 어떻게 묶는지가 다릅니다.

## 분기의 본질

차이를 *세 축*으로 정리할 수 있습니다.

| 축 | DDR | GDDR | HBM |
|----|-----|------|-----|
| Bus width | 64-bit/DIMM | 32-bit/chip | 1024-bit/stack |
| Per-pin rate | 6.4 Gbps | 32 Gbps | 9.6 Gbps |
| Signaling | NRZ | PAM3·PAM4 | NRZ |
| Packaging | DIMM (PCB) | BGA on PCB | TSV stack on interposer |
| Capacity | 32~128 GB | 8~32 GB | 24~192 GB |
| Cost per GB | $5~10 | $10~20 | $30~60 |

GDDR은 *clock을 끝까지 밀어 올린* 방식입니다. 32-bit *좁은 bus*로 *PAM4·PAM3* 같은 *멀티 레벨 signaling*까지 끌어와 *pin rate*를 *32 Gbps*까지 올립니다.

HBM은 *반대 방향*입니다. *pin rate는 낮추고*, 대신 *bus width*를 *1024-bit*까지 넓힙니다. 한 stack에 *1024개 신호*가 한꺼번에 움직입니다.

같은 1 TB/s를 만드는 두 가지 방법:

**GDDR6X 방식 (RTX 4090).** `21 Gbps × 384-bit bus = 1.0 TB/s`. 12개 GDDR6X chip × 32-bit이며, PCB 위에서 *길이·임피던스 일치*가 필요하다. chip 1개당 약 *84 GB/s*.

**HBM3 방식 (H100).** `6.4 Gbps × 1024-bit × 5 stack = 4.1 TB/s`. 5개 HBM3 stack × 1024-bit이며, interposer 위 *microbump*로 연결된다. stack 1개당 *819 GB/s*.

같은 *총 대역폭*이라도 *pin 수, 신호 무결성 부담, 전력*이 완전히 다릅니다.

## Bandwidth per pin

핵심 지표 하나를 짚고 가야 합니다. *pin 1개당 데이터 전송률*입니다.

![세대별 per-pin rate — HBM vs GDDR 비교](/images/blog/hardware/hbm/diagrams/ch01-per-pin-rate.svg)

GDDR은 *세대마다 pin rate가 두 배*에 가깝게 뛰었습니다. NRZ에서 PAM4, 다시 PAM3으로 *signaling 자체를 바꿔* 가며 *clock을 짜낸* 결과입니다.

HBM은 *훨씬 느리게* 갑니다. 2.4 → 9.6 Gbps까지 4배 늘었을 뿐입니다. 하지만 *bus width 1024-bit*이라 *stack 하나*가 *GDDR chip 12개 분량*과 맞먹습니다.

## Cost와 power의 분기

GDDR과 HBM은 *비용 구조*가 다릅니다.

비용 분해 (대략):

**GDDR6X 24 GB (12 chip × 2 GB).**

| 항목 | 비용 |
|------|------|
| DRAM die | $80 |
| BGA package | $20 |
| PCB 라우팅 | $10 (board cost에 내장) |
| 메모리 컨트롤러 | GPU die 내부 |
| **total (메모리만)** | **≈ $110** |

**HBM3 96 GB (4 stack × 24 GB).**

| 항목 | 비용 |
|------|------|
| DRAM die (48개) | $240 |
| Base die (4개) | $80 |
| TSV + microbump | $60 |
| Interposer | $200 |
| CoWoS 패키징 | $300 |
| KGD test | $40 |
| **total (메모리 + 패키징)** | **≈ $920** |

같은 capacity라도 HBM은 *8~10배 비싸기* 일쑤입니다. 대신 *전력은 절반 이하*이고, *대역폭은 3~4배*가 나옵니다.

전력 비교 — 1 TB/s를 만드는 데 필요한 전력:

| 메모리 | 전력 | 내역 |
|--------|------|------|
| GDDR6X | 약 85 W | chip 12개 × 7 W |
| HBM3 | 약 25 W | stack 2개 × 12 W |

HBM이 약 *3배 효율적*.

데이터센터에서는 *전력 1 W*가 *연간 $1.5*의 운영비입니다. AI 가속기 *50만 대* 규모가 되면 *몇 십 MW* 차이가 *수십 억 원* 차이로 돌아옵니다. HBM의 *비싼 가격*이 *3년 안에 회수*되는 이유입니다.

## 시장 분할

이런 트레이드오프 때문에 시장이 *깨끗하게 갈립니다*.

| 진영 | 대표 제품 | 특징 |
|------|-----------|------|
| **HBM** | NVIDIA H100/H200/B100/B200, Blackwell 차세대<br>AMD MI300X/MI325X, MI350 계열<br>Google TPU v5p/Trillium<br>Intel Gaudi 3<br>Korea: Sapeon·Rebellions NPU 계열 | training·대형 추론<br>대당 $20K~$40K<br>per-rack 100~200 kW |
| **GDDR** | NVIDIA RTX 30/40/50 시리즈<br>AMD RX 7000/8000 시리즈<br>PlayStation 5, Xbox Series X<br>데이터센터 추론 카드 (L4·L40·H100 PCIe NVL)<br>네트워킹 SoC (Marvell, Broadcom) | 그래픽·게임·소형 추론<br>대당 $500~$8K<br>per-card 250~450 W |

같은 NVIDIA 안에서도 H100은 HBM, RTX 4090은 GDDR입니다. *분기점은 명확*합니다. *capacity가 100 GB를 넘어야 하고, 대역폭이 1.5 TB/s 이상 필요*하면 HBM 외에는 선택지가 없습니다.

## 한국 메모리 산업의 위치

HBM 시장은 *한국 두 회사가 사실상 양분*하고 있습니다.

HBM 시장 점유율 (2025년경 공개 자료 기준 추정):

| 회사 | 점유율 | 비고 |
|------|--------|------|
| SK 하이닉스 | ~53% | HBM3·HBM3E 1위 |
| Samsung | ~38% | |
| Micron | ~9% | HBM3E 후발, 점유율 추격 중 |

NVIDIA Blackwell HBM3E 공급:

| 회사 | 역할 | 비고 |
|------|------|------|
| SK Hynix | 주 공급 | 9.2 Gbps grade qualified 우선 |
| Micron | 추가 공급 | 9.8 Gbps 양산 |
| Samsung | qualification 진행 | |

SK 하이닉스가 *2023년 HBM3 양산*에 *가장 먼저* 들어가 NVIDIA의 *first source*가 됐고, *HBM3E*에서도 *9.2 Gbps grade*로 *양산 선두*를 지키고 있습니다. Samsung은 *HBM3E 12-Hi 24 Gb DRAM*으로 *36 GB stack*을 먼저 발표했지만 NVIDIA *qualification*이 늦어졌습니다. Micron은 *9.8 Gbps*로 *per-pin rate*는 가장 높지만 *총 volume*은 아직 3위입니다.

## 시리즈 로드맵

이 시리즈는 *HBM 중심*으로 가지만 *GDDR과의 비교*도 빼지 않습니다. 8개 챕터의 흐름은 다음과 같습니다.

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

이번 시리즈의 *자매 시리즈* 둘이 있습니다. BoW 시리즈와 UCIe 시리즈는 *die-to-die* 표준입니다. HBM이 *DRAM stack*을 *interposer 위*에 놓는다면, BoW/UCIe는 *로직 칩렛*을 *같은 interposer 위*에 놓습니다. 함께 보면 *현세대 패키징의 전체 그림*이 나옵니다.

CXL 시리즈는 *HBM의 한계 너머*입니다. *stack 4개로 192 GB*를 만들어도 *LLM weight 1 TB*는 못 담습니다. CXL은 *PCIe 너머로 메모리를 풀링*해 *TB급 메모리*를 만드는 길입니다.

## 자주 하는 실수

### "HBM이 항상 GDDR보다 빠르다"

*per-stack*과 *per-chip*을 헷갈리면 그런 결론이 나옵니다. HBM3 stack 1개는 *819 GB/s*, GDDR6X chip 1개는 *84 GB/s*입니다. 10배 차이로 보입니다. 하지만 *GPU 한 장*에 GDDR6X chip이 *12개* 들어가면 *1 TB/s*가 됩니다. HBM stack 2개 분량입니다. *시스템 레벨*에서 봐야 합니다.

### "HBM은 무조건 비싸서 못 쓴다"

소형 추론·게임에는 *맞습니다*. 그러나 *AI training cluster*에서 *전력 효율*과 *boards-per-rack* 밀도가 *3배 다르면* HBM의 *초기 비용*은 *운영비로 회수*됩니다. *총소유비용(TCO)* 기준으로 봐야 합니다.

### "GDDR과 LPDDR이 같은 거다"

전혀 다릅니다. LPDDR은 *모바일용 저전력 DDR*이고, GDDR은 *그래픽용 고속 DDR*입니다. 신호 무결성 요건, 패키지 BGA 핀 정의, 명령어 셋이 모두 다릅니다. 데이터시트 헷갈리는 일이 의외로 많습니다.

### HBM이 *DDR5의 후속*이라는 오해

HBM은 *DDR5의 진화형*이 아니라 *완전히 다른 패키징 카테고리*입니다. CPU는 *앞으로도 DDR5/DDR6*을 쓰지 HBM을 쓰지 않습니다. CPU에 HBM이 붙는 경우는 *Xeon Max*처럼 *온패키지 HBM*을 *L4 캐시처럼* 쓰는 *특수 케이스*뿐입니다.

## 정리

- DRAM 가족은 *DDR·LPDDR·GDDR·HBM* 네 갈래로 갈렸고, *셀은 같지만 패키징과 signaling*이 다릅니다.
- GDDR은 *32-bit 좁은 bus*에 *PAM3/PAM4*로 *pin rate*를 *32 Gbps*까지 끌어올린 방식입니다.
- HBM은 *1024-bit 넓은 bus*에 *낮은 pin rate*로 *stack당 819 GB/s~1.2 TB/s*를 만든 방식입니다.
- 같은 1 TB/s라도 HBM 쪽이 *전력은 절반 이하*, *비용은 8배 이상*입니다.
- 시장은 *깨끗하게 갈렸습니다*. HBM은 *AI/HPC*, GDDR은 *그래픽·소형 추론*입니다.
- HBM은 *한국 두 회사(SK 하이닉스, Samsung)*가 *시장의 90%*를 점유합니다.
- NVIDIA Blackwell의 HBM3E 공급망에서 *SK 하이닉스가 first source*, *Micron이 fastest grade*, *Samsung이 추격*입니다.
- 다음 장부터 *HBM stack 구조*와 *TSV*부터 차근차근 들어갑니다.

## 다음 편

[Ch 2: HBM 스택 구조와 TSV](/blog/embedded/hardware/hbm/chapter02-hbm-stack)에서는 *base die*와 *DRAM die*가 *어떻게 적층*되는지, *TSV(Through-Silicon Via)*가 *어떻게 전기 신호를 위로 통과*시키는지를 봅니다. *microbump pitch*와 *yield* 이슈도 함께 다룹니다.

## 관련 항목

- [Ch 2: HBM 스택 구조와 TSV](/blog/embedded/hardware/hbm/chapter02-hbm-stack)
- [Ch 3: HBM2/HBM2E/HBM3/HBM3E 스펙 비교](/blog/embedded/hardware/hbm/chapter03-hbm-generations)
- [Ch 4: GDDR6·GDDR6X·GDDR7](/blog/embedded/hardware/hbm/chapter04-gddr)
- BoW Ch 1: 개요 — die-to-die 표준의 한쪽
- UCIe Ch 1: 개요 — die-to-die 표준의 다른 쪽
- CXL Ch 1: 개요 — HBM 너머의 메모리 풀링
