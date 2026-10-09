---
title: "메모리 풀링과 데이터센터 토폴로지 — 용량을 서버 밖에서 빌리는 일"
slug: "embedded/hardware/hbm/chapter12-cxl-pooling-fabric"
date: 2026-06-15T09:04:00
description: "on-package HBM의 용량 상한 밖을 CXL 풀이 맡는 방식 — 빌린 용량의 지연 값, hot/cold 구분이라는 전제, 서버당 고정 구성에서 풀 조달로의 전환."
series: "HBM·GDDR 심화"
seriesOrder: 12
tags: [cxl, memory-pooling, fabric, datacenter, gfam]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"풀링은 토폴로지 문제처럼 보이지만, 메모리를 사고 배치하는 사람에게는 *용량을 서버 안에서 살 것인가 서버 밖에서 빌릴 것인가*의 문제입니다."** — on-package HBM의 용량은 *스택 수에 묶여* 있고, 그 한계 밖을 맡는 것이 *풀*입니다. 다만 빌린 용량은 *지연이 한두 단 먼 자리*에 있고, *hot/cold 구분이 서지 않는 워크로드*에서는 이득이 나지 않습니다.

[Ch 11](/blog/embedded/hardware/hbm/chapter11-cxl-device-types)에서 *디바이스 한 대*의 유형 분류를 봤습니다. 이 마지막 장은 시야를 데이터센터 전체로 넓힙니다. 시리즈 내내 따라온 질문은 *"이 워크로드의 데이터를 어느 메모리에 둘 것인가"*였습니다. 풀링은 그 질문에 *서버 밖*이라는 선택지를 하나 더 붙이는 일입니다.

fabric 자체의 동작은 [CXL 4.0 Internals Ch 4](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)와 [Ch 13](/blog/embedded/hardware/cxl/chapter13-switching-fabric)이 맡습니다. 이 장은 그 메커니즘이 *메모리 계층에 남기는 결과*만 다룹니다.

## 용량은 스택 수에 묶여 있다

HBM의 용량 상한은 *물리 구조가 정합니다*. 스택 하나의 die 수와 패키지에 올릴 수 있는 스택 수가 곧 상한이고, 그 위에 인터포저 면적과 [Ch 6](/blog/embedded/hardware/hbm/chapter06-thermal-power)에서 본 열 문제가 얹힙니다. 용량을 더 원하면 패키지를 다시 설계해야 하고, 그 말은 *다음 세대를 기다린다*는 뜻입니다.

그 상한이 실제로 어디서 걸리는지는 [Ch 8](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)에서 봤습니다. Llama 2 70B를 batch 128·seq 2048로 서빙하면 *약 226 GB*가 필요한데, H100 SXM의 HBM은 *80 GB*입니다.

CXL 카드를 서버 하나에 꽂아 두면 그 카드의 용량은 *그 서버의 새 상한*이 될 뿐입니다. 풀링은 상한을 서버 경계 밖으로 옮깁니다.

| 배치 | 용량 상한을 정하는 것 | 늘리려면 |
|------|---------------------|---------|
| on-package HBM | 스택 수 × 스택 용량, 인터포저 면적, 열 | 패키지 재설계 — 세대 교체를 기다림 |
| 로컬 DDR DIMM | 소켓당 채널·슬롯 수 | DIMM 증설, 한계에 닿으면 서버 교체 |
| Direct-attach CXL 카드 | 서버의 슬롯 수 × 카드 용량 | 그 서버에 카드 추가 |
| Switch 뒤 풀 | 풀 전체 용량 | 풀에 카드 추가 — 어느 서버와도 무관 |

마지막 줄이 풀링이 파는 유일한 물건입니다. *용량의 상한이 서버가 아니라 풀에 걸린다*는 것.

## 대역폭과 용량은 다른 축이다

풀링을 검토할 때 가장 먼저 갈리는 지점은 *지금 무엇이 병목인가*입니다. HBM은 stack 하나가 수백 GB/s~1 TB/s대이고, CXL 링크는 PCIe 5.0 x16 원시 전송률이 64 GB/s입니다. 풀을 아무리 키워도 *링크 대역폭*은 그대로입니다.

| 병목 | 증상 | 풀링이 답인가 |
|------|------|--------------|
| 대역폭 | 모델은 올라가는데 처리량이 안 나옴. [Ch 5](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)의 roofline에서 memory bound 쪽에 붙어 있음 | 아니다. HBM 세대·스택 수·컨트롤러 효율의 문제 |
| 용량 | 모델이나 working set이 아예 안 올라감. 배치를 줄이거나 노드를 쪼개서 우회 중 | 그렇다. 풀이 미는 축이 정확히 이쪽 |

대역폭이 모자란데 용량을 사고, 용량이 모자란데 대역폭 좋은 메모리를 사는 것이 가장 비싼 실수입니다. 두 축은 서로를 대신하지 못합니다.

## 토폴로지 세 단계가 메모리에 하는 일

CXL은 버전마다 *용량을 나눠 쓸 수 있는 범위*를 넓혀 왔습니다.

| 단계 | CXL 버전 | 용량이 묶이는 경계 | 나눠 쓰는 단위 |
|------|---------|------------------|---------------|
| Direct Attach | 1.1 | 서버 한 대의 슬롯 | 카드 = 서버에 고정 |
| Switching·Pooling | 2.0 | 풀 하나 | MLD(Multi-Logical Device)의 논리 장치 |
| Fabric | 3.0 / 3.x | fabric 전역 | 메모리 영역, 여러 host의 공유 |

단계가 하나 올라갈 때마다 [Ch 10](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)에서 본 대로 *왕복 경로에 통과 지점이 늘어* 지연이 붙고, 그 대가로 *나눠 쓸 수 있는 범위*가 넓어집니다. 단계별 실제 지연 값은 TBD입니다.

- 1.1: *내 서버의 용량 상한을 올린다*. 남는 용량은 여전히 그 서버 안에 갇힙니다.
- 2.0: *한 서버가 안 쓰는 용량을 옆 서버가 쓴다*. 조달이 서버 단위에서 풀 단위로 바뀝니다.
- 3.x: *여러 host가 같은 데이터를 본다*. 여기서부터는 조달 얘기가 아니라 *데이터 공유* 얘기로 성격이 바뀝니다.

3.x의 공유에 필요한 coherency 메커니즘은 [CXL Ch 4](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)가 다룹니다.

## 빌린 용량은 먼 자리다

풀은 여러 host가 같은 디바이스를 두드리는 구조이므로, 혼잡한 시간대의 지연은 조용할 때보다 나빠질 수 있습니다. 평균만 보고 배치를 정하면 *꼬리에서 사고가 납니다*.

그래서 배치 원칙은 단순합니다. *hot working set은 로컬에, 빌린 용량은 cold tier에.*

| 워크로드 | 풀에 올리는 데이터 | 이유 |
|---------|------------------|------|
| LLM inference | KV cache 일부 | 용량이 먼저 부족해지는 데이터 |
| In-memory DB | cold tier 데이터 | hot 영역은 로컬 DDR에 남김 |
| VM·컨테이너 호스트 | 평소 덜 쓰는 메모리 | 접근 빈도가 낮은 영역 |

반대로 지연과 대역폭을 동시에 요구하는 데이터는 풀에 올릴 자리가 아닙니다.

## hot/cold 구분이 풀링의 전제 조건

풀이 이득을 내려면 *풀에 둬도 되는 데이터가 실제로 존재*해야 합니다. 워크로드의 접근이 전체 용량에 고르게 퍼져 있으면, 어느 페이지를 풀에 올리든 같은 비율로 두드려지고 결과는 *전체가 조금씩 느려지는 것*뿐입니다.

도입 전에 답해 둘 질문은 세 개입니다.

- 실제 working set이 전체 용량의 몇 %인가. 이 비율이 작을수록 풀의 값어치가 큽니다.
- 그 비율이 시간에 따라 얼마나 흔들리는가. hot 영역이 자주 이동하면 이동 비용이 이득을 먹습니다.
- 데이터를 누가 배치하는가. 애플리케이션이 직접 정할 수도 있고(DAX), OS가 접근 패턴을 보고 옮길 수도 있습니다(System RAM 노드).

OS가 옮기는 쪽의 근거로는 Meta의 TPP 연구가 있습니다. Meta 서버 fleet의 메모리 사용 패턴을 분석해 *차가운 페이지를 느린 tier로 내릴 기회*가 있음을 보였고, *애플리케이션을 고치지 않는* OS 수준 배치로 기본 Linux 대비 성능을 18% 올렸습니다. 기본 NUMA balancing보다도 5~17% 나았습니다.

## 조달 방식이 바뀐다

서버당 고정 구성에서 메모리는 *서버별 peak 수요*를 기준으로 삽니다. 어떤 서버가 드물게 큰 메모리를 요구하면 그 서버는 그만큼을 달고 살아야 하고, 평소에 남는 부분은 옆 서버가 모자라도 빌려줄 수 없습니다.

풀 구성에서는 기준이 *동시 peak*로 바뀝니다. 각 서버의 peak를 모두 더한 값이 아니라, 실제로 동시에 몰리는 최대치만큼만 있으면 됩니다.

| 항목 | 서버당 고정 구성 | 풀 구성 |
|------|----------------|--------|
| 구매 기준 | 서버별 peak의 합 | 동시 peak |
| 남는 용량 | 그 서버 안에 갇힘 | 다른 host에 재할당 |
| 증설 단위 | DIMM 증설·서버 교체 | 풀에 카드 추가 |
| 새로 드는 비용 | — | switch·관리 계층 운영, 지연 한 단 |

마지막 줄을 빼고 읽으면 풀링이 공짜처럼 보입니다. 실제로는 *지연 한 단*과 *운영할 관리 계층*이 새로 생기고, 그 둘이 이득보다 큰 환경도 있습니다.

이 이득을 정량화한 연구가 Microsoft Azure의 *Pond*입니다. 클라우드 운영 trace를 분석해 *8~16 소켓 범위로만 풀링해도 이득 대부분*을 얻는다고 봤고, VM에 로컬·풀 메모리를 얼마씩 줄지 예측하는 방식으로 *DRAM 비용을 7% 줄이면서 성능을 같은 NUMA 노드 할당 대비 1~5% 이내*로 지켰습니다.

## 메모리 계층에서 자주 어긋나는 판단

### "풀에서 가져온 메모리도 결국 DDR이니 성능은 비슷하다"

용량은 늘지만 *지연은 늘어납니다*. Direct-attach CXL 메모리부터가 로컬 DDR보다 먼 자리이고, switch를 거치면 그만큼 더 멀어집니다. 풀은 *cold tier*로 두고 hot working set은 로컬에 남기는 배치가 기본입니다.

### "HBM이 있으니 CXL 풀은 필요 없다"

두 메모리는 *경쟁 관계가 아닙니다*. HBM은 용량이 스택 수에 묶이고, CXL 풀은 그 한계 밖의 용량을 맡습니다. 대역폭은 HBM이, 용량은 풀이 담당하는 분업입니다.

### "풀링하면 메모리를 산 만큼 다 쓴다"

*할당 단위가 발목을 잡습니다*. CXL 2.0 pooling은 MLD의 논리 장치 단위로 host에 붙입니다. 워크로드가 요구하는 크기가 그 경계와 맞지 않으면 남는 조각이 생깁니다. 도입 전에 *워크로드의 메모리 요구 분포*를 먼저 봐야 합니다.

### "tiering은 OS에 맡기면 안 된다"

맡길 수 있습니다. TPP는 애플리케이션을 고치지 않는 OS 수준 배치로 성능을 올렸습니다. 다만 *기본 NUMA balancing만으로는 부족*했다는 것이 같은 연구의 결과입니다. 어떤 배치 메커니즘을 쓰는지가 결과를 가릅니다.

### "CXL fabric이 NVLink을 대체한다"

*용도가 다릅니다*. NVLink는 GPU 사이의 고대역폭 경로이고, CXL fabric은 범용 메모리 공유 경로입니다.

> **메모**: fabric 자체의 오해 — 2.0 pooling과 3.0 fabric의 coherency 차이, GFAM의 invalidation 비용, Fabric Manager의 SPOF 여부, PBR 토폴로지의 deadlock 조건 — 은 [CXL 4.0 Internals Ch 4](/blog/embedded/hardware/cxl/chapter04-pooling-gfam#자주-하는-실수)에 정리돼 있습니다.

## 정리

- 풀링이 파는 것은 토폴로지가 아니라 *용량 상한의 위치*입니다.
- HBM의 용량은 *스택 수·인터포저·열*에 묶여 다음 세대까지 못 늘립니다. CXL 풀이 그 한계 밖을 맡습니다.
- *대역폭 병목과 용량 병목은 다른 문제*입니다. 풀은 용량 축만 밉니다.
- CXL 1.1(direct) → 2.0(switching·MLD pooling) → 3.x(fabric·공유)로 갈수록 *나눠 쓰는 범위가 넓어지고 경로가 길어집니다*.
- 풀링의 전제 조건은 *hot/cold가 실제로 갈리는 워크로드*입니다.
- 조달 기준이 *서버별 peak의 합*에서 *동시 peak*로 바뀝니다. Pond는 DRAM 비용 7% 절감을 성능 손실 1~5% 이내로 보였습니다.
- OS 수준 배치도 효과가 있습니다. TPP는 기본 Linux 대비 18% 성능 향상을 보였습니다.

## 다음 편

HBM·GDDR 심화 시리즈는 여기서 마칩니다. 시작은 [Ch 1](/blog/embedded/hardware/hbm/chapter01-overview)의 질문 하나였습니다 — *같은 DRAM 셀에서 왜 HBM과 GDDR이 갈렸는가*. 답을 따라가다 보니 stack과 인터포저([Ch 2](/blog/embedded/hardware/hbm/chapter02-hbm-stack)), 세대별 대역폭([Ch 3](/blog/embedded/hardware/hbm/chapter03-hbm-generations)), 공칭과 실측의 간극([Ch 5](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)), 그 대역폭을 유지하는 값인 열과 전력([Ch 6](/blog/embedded/hardware/hbm/chapter06-thermal-power)), 컨트롤러가 짜내는 bank parallelism([Ch 7](/blog/embedded/hardware/hbm/chapter07-memory-controller))까지 왔습니다.

[Ch 8](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)에서 AI 워크로드가 그 메모리를 어떻게 채우는지 보고 나서야 *용량이 벽이라는 사실*이 드러났고, 거기서부터 [Ch 9](/blog/embedded/hardware/hbm/chapter09-cxl-mem)~Ch 12의 CXL 네 장이 이어졌습니다. 결국 이 시리즈는 *대역폭의 이야기로 시작해 용량의 이야기로 끝난* 셈입니다. 두 축이 서로 다른 문제라는 것이 시리즈 전체를 관통하는 한 문장입니다.

CXL을 *프로토콜·구현 쪽에서 다시* 보고 싶다면 [CXL 4.0 Internals](/blog/embedded/hardware/cxl/chapter01-cxl-position) 시리즈가 그 자리를 맡습니다. 그 밖의 인접 주제는 기존 시리즈에 분산 추가된 챕터로 이어집니다.

- *프로토콜·드라이버*: [Modern Embedded Recipes Ch 149~151](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
- *성능 분석*: [Embedded Performance Engineering Ch 54~56](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
- *보안*: [Embedded Security Ch 11~13](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)
- *부팅·BIOS*: [Bootloader Internals Ch 34~36](/blog/embedded/bootloader/chapter34-pcie-enumeration)

## 관련 항목

- [Ch 1: HBM과 GDDR 분기점 분석](/blog/embedded/hardware/hbm/chapter01-overview) — 시리즈 시작
- [Ch 8: NPU·GPU에서의 HBM 활용](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage) — 용량이 벽이 되는 지점
- [Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem) — 이 장이 인용한 지연·대역폭 실측
- [Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)
- [Ch 11: CXL Type 1·2·3 디바이스 분류](/blog/embedded/hardware/hbm/chapter11-cxl-device-types)
- [Embedded Performance Engineering Ch 29: CXL Interconnect 분석](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)
- [CXL 4.0 Internals Ch 4: Pooling·GFAM·Fabric](/blog/embedded/hardware/cxl/chapter04-pooling-gfam) — GFAM·PBR·Coherency Domain ID의 메커니즘
- [CXL 4.0 Internals Ch 13: Switching·Fabric Manager](/blog/embedded/hardware/cxl/chapter13-switching-fabric) — switch 내부 구조와 Fabric Manager의 책임 범위
