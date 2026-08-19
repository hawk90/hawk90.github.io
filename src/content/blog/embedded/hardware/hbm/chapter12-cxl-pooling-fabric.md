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

[Ch 11](/blog/embedded/hardware/hbm/chapter11-cxl-device-types)에서 *디바이스 한 대*의 유형 분류를 봤습니다. 이 마지막 장은 시야를 데이터센터 전체로 넓히되, 보는 각도는 시리즈 내내 유지해 온 것과 같게 둡니다. 우리가 계속 따라온 질문은 *"이 워크로드의 데이터를 어느 메모리에 둘 것인가"*였습니다. 풀링은 그 질문에 *서버 밖*이라는 선택지를 하나 더 붙이는 일입니다.

fabric 자체의 동작은 [CXL 4.0 Internals Ch 4](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)와 [Ch 13](/blog/embedded/hardware/cxl/chapter13-switching-fabric)이 맡습니다. PBR 라우팅, Fabric Manager의 책임 범위, GFAM, Coherency Domain ID, switch 계층 구조가 모두 그쪽에 있습니다. 이 장은 그 메커니즘이 *메모리 계층에 남기는 결과*만 다룹니다.

## 용량은 스택 수에 묶여 있다

HBM의 용량 상한은 *물리 구조가 정합니다*. 스택 하나의 die 수와 패키지에 올릴 수 있는 스택 수가 곧 상한이고, 그 위에는 인터포저 면적과 [Ch 6](/blog/embedded/hardware/hbm/chapter06-thermal-power)에서 본 열 예산이 얹힙니다. 용량을 더 원하면 패키지를 다시 설계해야 하고, 그 말은 *다음 세대를 기다린다*는 뜻입니다. 서버 한 대 안에서 오늘 해결할 수 있는 문제가 아닙니다.

그 상한이 실제로 어디서 걸리는지는 [Ch 8](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)에서 이미 봤습니다. LLaMA 70B를 서빙하는 데 *780 GB*가 필요한데 on-package HBM은 [Ch 9](/blog/embedded/hardware/hbm/chapter09-cxl-mem)의 계층 표 기준으로 *24~192 GB* 자리입니다. 카드 한 장의 CXL 메모리가 *256 GB~2 TB*를 맡아 그 간극을 메웁니다.

여기서 한 걸음 더 나아간 것이 풀입니다. CXL 카드를 서버 하나에 꽂아 두면 그 카드의 용량은 *그 서버의 새 상한*이 될 뿐입니다. 풀링은 상한을 서버 경계 밖으로 옮깁니다.

| 배치 | 용량 상한을 정하는 것 | 늘리려면 |
|------|---------------------|---------|
| on-package HBM | 스택 수 × 스택 용량, 인터포저 면적, 열 예산 | 패키지 재설계 — 세대 교체를 기다림 |
| 로컬 DDR DIMM | 소켓당 채널·슬롯 수 | DIMM 증설, 한계에 닿으면 서버 교체 |
| Direct-attach CXL 카드 | 서버의 슬롯 수 × 카드 용량 | 그 서버에 카드 추가 |
| Switch 뒤 풀 | 풀 전체 용량 (host별 상한이 아님) | 풀에 카드 추가 — 어느 서버와도 무관 |

마지막 줄이 풀링이 파는 유일한 물건입니다. *용량의 상한이 서버가 아니라 풀에 걸린다*는 것.

## 대역폭과 용량은 다른 축이다

풀링을 검토할 때 가장 먼저 갈리는 지점은 *지금 무엇이 병목인가*입니다. Ch 9의 공존 구성에서 HBM은 *8 TB/s*, CXL은 *100 GB/s* 자리였습니다. 두 자리 이상 차이입니다. 풀을 아무리 키워도 이 숫자는 움직이지 않습니다.

그래서 판단이 둘로 갈립니다.

| 병목 | 증상 | 풀링이 답인가 |
|------|------|--------------|
| 대역폭 | 모델은 올라가는데 처리량이 안 나옴. [Ch 5](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)의 roofline에서 memory bound 쪽에 붙어 있음 | 아니다. HBM 세대·스택 수·컨트롤러 효율의 문제 |
| 용량 | 모델이나 working set이 아예 안 올라감. 배치를 줄이거나 노드를 쪼개서 우회 중 | 그렇다. 풀이 미는 축이 정확히 이쪽 |

대역폭이 모자란 상황에 용량을 사고, 용량이 모자란 상황에 대역폭 좋은 메모리를 더 사는 것이 데이터센터 메모리 구매에서 가장 비싼 실수입니다. 두 축은 서로를 대신하지 못합니다.

## 토폴로지 세 단계가 메모리에 하는 일

CXL은 *Direct → Switching → Fabric*의 세 단계를 거쳐 왔습니다. 흔히 토폴로지 그림으로 설명되지만, 메모리 계층 입장에서 이 세 단계는 *용량의 경계와 지연의 자리*를 각각 한 칸씩 옮긴 사건입니다.

| 단계 | CXL 버전 | 용량이 묶이는 경계 | load 지연 (Ch 9 실측) | 조달·회수 단위 |
|------|---------|------------------|---------------------|---------------|
| Direct Attach | 1.1 | 서버 한 대의 슬롯 | 170~220 ns | 카드 = 서버에 고정 |
| Switching·Pooling | 2.0 | 풀 하나, host에는 분할 단위로 | 250~350 ns | 논리 분할 단위(LD) |
| Fabric | 3.0 / 3.x | fabric 전역 | 400~600 ns (2-hop pooled) | 메모리 영역 |

비교 기준인 로컬 DDR5는 *80~100 ns*입니다. 단계가 하나 올라갈 때마다 지연이 눈에 띄게 붙고, 그 대가로 *용량을 나눠 쓸 수 있는 범위*가 넓어집니다. 세 단계가 각각 푼 문제도 이렇게 읽는 편이 정확합니다.

- 1.1: *내 서버의 용량 상한을 올린다*. 남는 용량은 여전히 그 서버 안에 갇힙니다.
- 2.0: *한 서버가 안 쓰는 용량을 옆 서버가 쓴다*. 조달이 서버 단위에서 풀 단위로 바뀌는 지점입니다.
- 3.x: *여러 host가 같은 데이터를 동시에 본다*. 여기서부터는 조달 얘기가 아니라 *데이터 공유* 얘기로 성격이 바뀝니다.

세 번째 단계에서 성격이 바뀐다는 점이 중요합니다. 2.0까지는 "메모리를 얼마나 효율적으로 사는가"의 문제지만, 3.x는 "원래 네트워크로 주고받던 데이터를 load/store로 볼 것인가"라는 *다른 질문*입니다. 후자를 푸는 데 필요한 coherency 메커니즘은 이 시리즈의 범위 밖이고, [CXL Ch 4](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)가 그 자리를 맡습니다.

## 빌린 용량은 얼마나 먼 자리인가

위 표의 지연 값은 *조용한 링크*에서 잰 값입니다. 실제 풀은 여러 host가 같은 디바이스를 두드리는 구조이므로, 혼잡한 시간대에는 이보다 나쁜 쪽으로 봐 두는 편이 안전합니다. 평균만 보고 배치를 정하면 *꼬리에서 사고가 납니다*.

그래서 배치 원칙은 단순합니다. *hot working set은 로컬에, 빌린 용량은 cold tier에.* Ch 9에서 정리한 잘 맞는 워크로드가 전부 이 모양이었습니다.

| 워크로드 | 풀에 올리는 데이터 | 왜 견디나 |
|---------|------------------|----------|
| LLM inference | KV cache pool | 순차 접근이 많아 지연 민감도가 낮음 |
| In-memory DB | cold tier 데이터 | hot 영역은 로컬 DDR에 남김 |
| 대규모 컨테이너 호스트 | overcommit 분 | 평상시 접근 빈도가 낮은 영역 |

반대로 HPC tight loop나 training의 weight·activation처럼 *지연과 대역폭을 동시에 요구*하는 데이터는 풀에 올릴 자리가 아닙니다. 판단 기준은 Ch 9에서 쓴 문장 그대로입니다 — *지연 200~400 ns에 견디는 워크로드인가*.

## hot/cold 구분이 풀링의 전제 조건

풀이 이득을 내려면 *풀에 둬도 되는 데이터가 실제로 존재*해야 합니다. 당연해 보이지만 도입 검토에서 가장 자주 건너뛰는 확인입니다. 워크로드의 접근이 전체 용량에 고르게 퍼져 있으면, 어느 페이지를 풀에 올리든 같은 비율로 두드려지고 결과는 *전체가 조금씩 느려지는 것*뿐입니다. 용량은 늘었는데 아무도 이득을 못 봅니다.

도입 전에 답해 둘 질문은 세 개입니다.

- 실제 working set이 전체 용량의 몇 %인가. 이 비율이 작을수록 풀의 값어치가 큽니다.
- 그 비율이 시간에 따라 얼마나 흔들리는가. 하루 중 몇 시간만 hot한 데이터는 좋은 후보지만, 분 단위로 hot 영역이 이동하면 이동 비용이 이득을 먹습니다.
- 워크로드가 자기 데이터의 성격을 *스스로 알려 줄 수 있는가*. KV cache처럼 애플리케이션이 수명을 아는 데이터가 있고, 범용 컨테이너 호스트처럼 밖에서는 알 수 없는 경우가 있습니다.

세 번째가 특히 갈림길입니다. 애플리케이션이 배치를 지시할 수 있으면 풀은 *설계된 tier*가 되고, 그렇지 못하면 OS의 추정에 맡기는 *확률적 tier*가 됩니다. 같은 하드웨어라도 두 경우의 실측 결과는 전혀 다릅니다.

## 조달 방식이 바뀐다

서버당 고정 구성에서 메모리는 *서버별 peak 수요*를 기준으로 삽니다. 어떤 서버가 드물게 512 GB를 요구하면 그 서버는 512 GB를 달고 살아야 하고, 평소에 남는 부분은 옆 서버가 모자라도 빌려줄 수 없습니다. 서버가 고장 나면 그 안의 메모리도 함께 사라집니다.

풀 구성에서는 기준이 *동시 peak*로 바뀝니다. 각 서버의 peak를 모두 더한 값이 아니라, 실제로 동시에 몰리는 최대치만큼만 있으면 됩니다. 이 차이가 풀링이 만드는 경제적 이득의 거의 전부입니다.

| 항목 | 서버당 고정 구성 | 풀 구성 |
|------|----------------|--------|
| 구매 기준 | 서버별 peak의 합 | 동시 peak |
| 남는 용량 | 그 서버 안에 갇힘 | 다른 host에 재할당 |
| 증설 단위 | DIMM 증설·서버 교체 | 풀에 카드 추가 |
| 서버 장애 시 | 메모리도 함께 빠짐 | 풀에 남아 재할당 가능 |
| 새로 드는 비용 | — | switch·control plane 운영, 지연 한 단 |

마지막 줄을 빼고 이 표를 읽으면 풀링이 공짜처럼 보입니다. 실제로는 *지연 한 단*과 *운영해야 할 control plane 하나*가 새로 생기고, 그 둘이 앞의 이득보다 큰 환경도 있습니다. 노드 수가 적고 워크로드 구성이 고정된 클러스터라면 고정 구성이 여전히 합리적인 선택입니다.

CXL 3.x가 그리는 최종 그림은 자원 종류별로 풀을 나눠 두고 워크로드마다 필요한 만큼 조합하는 *Composable Datacenter*입니다. 메모리 쪽만 떼어 보면 *1 PB급 풀*에서 워크로드가 시작할 때 *수 TB*를 빌리고 끝날 때 반납하는 모양입니다. 이 그림은 *CXL fabric + Fabric Manager + composable OS*가 모두 성숙해야 성립하므로, *2026~2028*에 부분적 실현, *2030+*에 본격 도입으로 보는 것이 일반적인 전망입니다.

## 운영 사례

공개된 도입 사례는 대부분 *cold tier와 overcommit*이라는 같은 자리에서 시작합니다. Meta의 Memory Tiering은 컨테이너 host overcommit에 CXL.mem을 cold tier로 붙였고, Microsoft Azure의 Project Pond는 다중 VM 메모리 풀링을 다룹니다. Samsung·SK Hynix는 CMM-D·Niagara를 양산하며 자사 데이터센터 적용을 공개 자료로 보고했습니다.

눈여겨볼 것은 *어느 쪽도 hot 데이터를 풀로 옮기는 구성으로 시작하지 않았다*는 점입니다. 앞 절의 전제 조건이 현장에서도 그대로 작동하고 있습니다.

회사별 프로젝트와 적용 범위를 정리한 표는 [CXL 4.0 Internals Ch 4](/blog/embedded/hardware/cxl/chapter04-pooling-gfam#운영-사례--hyperscale-도입)에 있습니다. 도입 시점은 CXL 2.0 pooling이 2024~2025 양산 적용, 3.0 fabric이 2026+ 본격 도입입니다.

## 메모리 계층에서 자주 어긋나는 판단

이 시리즈는 on-package HBM에서 출발해 여기까지 왔습니다. 그래서 마지막으로 짚을 것은 fabric의 동작 방식이 아니라, *풀링된 메모리를 계층 어디에 놓을 것인가*에서 어긋나는 판단들입니다.

### "풀에서 가져온 메모리도 결국 DDR이니 성능은 비슷하다"

용량은 늘지만 *지연은 늘어납니다*. Direct-attach CXL 메모리부터가 로컬 DDR보다 한 단계 먼 자리이고, switch를 한 단 거치면 그만큼 더 멀어집니다. 대역폭이 아니라 *지연에 민감한 워크로드*를 풀 메모리 위에 올리면, 용량이 넉넉해졌는데 처리량은 떨어지는 결과가 나옵니다. 풀은 *cold tier*로 두고 hot working set은 로컬에 남기는 배치가 기본입니다.

### "HBM이 있으니 CXL 풀은 필요 없다"

두 메모리는 *경쟁 관계가 아닙니다*. HBM은 on-package라 용량이 스택 수에 묶이고, 그 한계가 곧 모델 크기의 한계가 됩니다. CXL 풀은 그 한계 밖의 용량을 맡습니다. [Ch 8](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)에서 본 NPU·GPU 구성이 HBM과 CXL을 함께 쓰는 이유가 이것입니다. 대역폭은 HBM이, 용량은 풀이 담당하는 분업입니다.

### "풀링하면 메모리를 산 만큼 다 쓴다"

*할당 단위가 발목을 잡습니다*. CXL 2.0 pooling은 LD 단위로 host에 붙입니다. 워크로드가 요구하는 크기가 LD 경계와 맞지 않으면 남는 조각이 생기고, 그 조각은 다른 host가 쓰지 못합니다. 실제 이용률은 LD 분할 설계에 좌우되므로, 도입 전에 *워크로드의 메모리 요구 분포*를 먼저 봐야 합니다.

### "tiering은 OS가 알아서 해 준다"

*자동 승격·강등은 접근 패턴을 뒤늦게 따라갑니다*. 페이지가 hot으로 판정돼 로컬로 올라올 때쯤 워크로드의 관심은 이미 다른 곳에 가 있는 경우가 흔합니다. Meta의 Memory Tiering 사례처럼, 실제 운영에서는 *워크로드가 자기 데이터의 성격을 알려 주는* 힌트가 함께 있어야 이득이 납니다.

### "CXL fabric이 NVLink을 대체한다"

*용도가 다릅니다*. NVLink는 GPU 사이의 고대역폭·저지연 경로이고, CXL fabric은 범용 메모리 공유 경로입니다. 대역폭과 지연의 자릿수가 다르기 때문에 한쪽이 다른 쪽을 흡수하지 않습니다. 공존이 현실입니다.

> **메모**: fabric 자체의 오해 — 2.0 pooling과 3.0 fabric의 coherency 차이, GFAM의 invalidation 비용, Fabric Manager의 SPOF 여부, PBR 토폴로지의 deadlock 조건 — 은 [CXL 4.0 Internals Ch 4](/blog/embedded/hardware/cxl/chapter04-pooling-gfam#자주-하는-실수)에 정리돼 있습니다.

## 정리

- 풀링이 파는 것은 토폴로지가 아니라 *용량 상한의 위치*입니다. 상한이 서버에 걸리느냐 풀에 걸리느냐가 전부입니다.
- HBM의 용량은 *스택 수·인터포저·열 예산*에 묶여 다음 세대까지 못 늘립니다. CXL 풀이 그 한계 밖을 맡습니다.
- *대역폭 병목과 용량 병목은 다른 문제*입니다. 풀은 용량 축만 밀고, 대역폭 숫자는 건드리지 못합니다.
- 토폴로지 세 단계는 *용량의 경계를 넓히는 대신 지연을 한 단씩 붙입니다*. 로컬 DDR *80~100 ns* 대비 direct *170~220 ns*, switch 경유 *250~350 ns*, 2-hop 풀 *400~600 ns*.
- 풀링의 전제 조건은 *hot/cold가 실제로 갈리는 워크로드*입니다. 접근이 고르게 퍼져 있으면 이득이 나지 않습니다.
- 조달 기준이 *서버별 peak의 합*에서 *동시 peak*로 바뀌는 것이 경제적 이득의 본체이고, 그 대가로 *지연 한 단과 control plane 하나*가 새로 생깁니다.
- 공개된 hyperscale 사례도 모두 *cold tier·overcommit*에서 시작했습니다. 2024~2025 pooling 양산, 2026+ fabric 본격 도입이 대체적인 그림입니다.

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
