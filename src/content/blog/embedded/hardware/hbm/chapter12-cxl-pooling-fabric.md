---
title: "메모리 풀링과 데이터센터 토폴로지 — 용량을 서버 밖에서 빌리는 일"
slug: "embedded/hardware/hbm/chapter12-cxl-pooling-fabric"
date: 2026-06-15T09:04:00
description: "CXL 풀의 용량·대역폭·배치 조건을 구별하고, 동시 수요 예산과 TPP·Pond 연구의 적용 범위를 살펴봅니다."
series: "HBM·GDDR 심화"
seriesOrder: 12
tags: [cxl, memory-pooling, fabric, datacenter, gfam]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"풀링은 토폴로지 문제처럼 보이지만, 메모리를 사고 배치하는 사람에게는 *용량을 서버 안에서 살 것인가 서버 밖에서 빌릴 것인가*의 문제입니다."** — on-package HBM의 용량은 *스택 수에 묶여* 있고, host에 연결한 CXL pool은 별도 메모리 확장 경로입니다. [Ch 9](/blog/embedded/hardware/hbm/chapter09-cxl-mem)에서 본 대로 CXL.mem은 *호스트 CPU*의 load/store를 늘리는 경로입니다. 빌린 용량은 *지연이 한두 단 먼 자리*에 있습니다. Pond 논문의 158개 workload에서도 pool 메모리에 전부 올렸을 때 same-NUMA 대비 5% 안에 든 것은 접근 overhead를 64 ns로 두면 43%, 140 ns로 두면 37%뿐이었고, 21% 넘는 workload는 25% 넘게 느려졌습니다.

[Ch 11](/blog/embedded/hardware/hbm/chapter11-cxl-device-types)에서 *디바이스 한 대*의 유형 분류를 봤습니다. 이 마지막 장은 시야를 데이터센터 전체로 넓힙니다. 시리즈 내내 따라온 질문은 *"이 워크로드의 데이터를 어느 메모리에 둘 것인가"*였습니다. 풀링은 그 질문에 *서버 밖*이라는 선택지를 하나 더 붙이는 일입니다.

fabric 자체의 동작은 [CXL 4.0 Internals Ch 4](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)와 [Ch 13](/blog/embedded/hardware/cxl/chapter13-switching-fabric)이 맡습니다. 이 장은 그 메커니즘이 *메모리 계층에 남기는 결과*만 다룹니다.

## 용량은 스택 수에 묶여 있다

HBM의 용량 상한은 *물리 구조가 정합니다*. 스택 하나의 die 수와 패키지에 올릴 수 있는 스택 수가 곧 상한입니다. 예를 들어 H100 SXM은 HBM3 stack 5개에 80 GB, HBM4 표준의 stack당 최대는 32 Gb × 16-Hi = 64 GB입니다([Ch 3](/blog/embedded/hardware/hbm/chapter03-hbm-generations)). HBM은 패키지 안에 통합되므로 DIMM처럼 추가할 수 없고([Ch 2](/blog/embedded/hardware/hbm/chapter02-hbm-stack)), 용량을 바꾸려면 다른 SKU를 고르거나 모델을 여러 장에 나눕니다.

그 상한이 실제로 어디서 걸리는지는 [Ch 8](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)에서 봤습니다. Llama 2 70B를 batch 128·seq 2048로 가정의 weight+KV 소계만 *약 226 GB*인데, H100 SXM의 HBM은 *80 GB*입니다.

CXL 카드를 서버 하나에 꽂아 두면 그 카드의 용량은 *그 서버의 새 상한*이 될 뿐입니다. 풀링은 상한을 서버 경계 밖으로 옮깁니다.

| 배치 | 용량 상한을 정하는 것 | 늘리려면 |
|------|---------------------|---------|
| on-package HBM | 스택 수 × 스택 용량, 인터포저 면적, 열 | 다른 패키지/SKU 또는 모델 분할·offload 검토 |
| 로컬 DDR DIMM | 소켓당 채널·슬롯 수 | DIMM 증설, 한계에 닿으면 서버 교체 |
| Direct-attach CXL 카드 | 서버의 슬롯 수 × 카드 용량 | 그 서버에 카드 추가 |
| Switch 뒤 풀 | 풀 전체 용량 | pool·host decoder·주소 공간·switch·관리 계층 한도 안에서 확장 |

이 비교에서 풀링의 핵심은 용량 할당의 경계입니다. *용량의 상한이 서버가 아니라 풀에 걸린다*는 것.

## 대역폭과 용량은 다른 축이다

풀링을 검토할 때 가장 먼저 갈리는 지점은 *지금 무엇이 병목인가*입니다. HBM3 stack 하나가 819 GB/s, 9.6 Gbps HBM3E가 1,228.8 GB/s이고, CXL 링크는 PCIe 5.0 x16 원시 전송률이 64 GB/s입니다. 풀을 아무리 키워도 *링크 대역폭*은 그대로입니다.

| 병목 | 증상 | 풀링이 답인가 |
|------|------|--------------|
| 대역폭 | 모델은 올라가는데 처리량이 안 나옴. [Ch 5](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)의 roofline에서 memory bound 쪽에 붙어 있음 | 아니다. HBM 세대·스택 수·컨트롤러 효율의 문제 |
| 용량 | 모델이나 working set이 아예 안 올라감. 배치를 줄이거나 노드를 쪼개서 우회 중 | 그렇다. 용량 확장의 후보. 접근 경로와 latency budget 충족 여부는 별도 확인 |

대역폭이 모자란데 용량을 사고, 용량이 모자란데 대역폭 좋은 메모리를 사는 것이 가장 비싼 실수입니다. 두 축은 서로를 대신하지 못합니다.

## 토폴로지 세 단계가 메모리에 하는 일

[CXL 2.0 발표](https://computeexpresslink.org/wp-content/uploads/2024/02/0c1418_caa15c61bc7b499087ad4ec3713df1ec.pdf)와 [CXL 3.0 소개](https://computeexpresslink.org/event/cxl-3-0-enabling-composable-systems-with-expanded-fabric-capabilities/)는 switching·pooling과 이후 fabric·sharing의 범위를 설명합니다. 표는 사양의 기능 구분이며 OS가 전부 지원하거나 모든 장치가 상호운용된다는 뜻은 아닙니다.

| 단계 | CXL 버전 | 용량이 묶이는 경계 | 나눠 쓰는 단위 |
|------|---------|------------------|---------------|
| Direct Attach | 1.1 | 서버 한 대의 슬롯 | 카드 = 서버에 고정 |
| Switching·Pooling | 2.0 | 풀 하나 | 장치 전체(SLD) 또는 MLD의 논리 장치(LD, 최대 16개) |
| Fabric | 3.0 / 3.x | fabric 전역 | 메모리 영역, 여러 host의 공유 |

단계가 하나 올라갈 때마다 [Ch 10](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)에서 본 대로 *왕복 경로에 통과 지점이 늘어* 지연이 붙고, 그 대가로 *나눠 쓸 수 있는 범위*가 넓어집니다. 단계별 실제 지연 값은 TBD입니다.

- 1.1: *내 서버의 용량 상한을 올린다*. 남는 용량은 여전히 그 서버 안에 갇힙니다.
- 2.0: *한 서버가 안 쓰는 용량을 옆 서버가 쓴다*. 조달이 서버 단위에서 풀 단위로 바뀝니다.
- 3.x: *여러 host가 같은 데이터를 본다*. 여기서부터는 조달 얘기가 아니라 *데이터 공유* 얘기로 성격이 바뀝니다.

3.x의 공유에 필요한 coherency 메커니즘은 [CXL Ch 4](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)가 다룹니다.

## 빌린 용량은 먼 자리다

CXL 2.0 pooling은 host별로 분리된 논리 장치/용량을 할당하는 것이고, 같은 byte를 여러 host가 동시에 보는 *공유*는 CXL 3.0 소개에서 개선 항목으로 나오는 별개의 기능입니다. 지연 비용은 Pond 논문이 직접 다룹니다. 앞에서 본 대로 158개 workload를 pool 메모리에만 두면 21% 넘게가 25% 이상 느려졌습니다. 그래서 Pond는 VM마다 local·pool 비율을 예측해 나눕니다.

그래서 배치 원칙은 단순합니다. *hot working set은 로컬에, 빌린 용량은 cold tier에.*

| 워크로드 | 풀에 올리는 데이터 | 이유 |
|---------|------------------|------|
| LLM inference | KV cache 일부 | Astera Labs가 Leo의 용도로 *KV cache storage for LLMs*를 듦 |
| In-memory DB | cold tier 데이터 | 같은 발표가 in-memory database를 대표 용도로 듦 |
| VM·컨테이너 호스트 | VM 메모리의 일부 | Pond가 VM에 local·pool 메모리를 나눠 배정 |

반대로 지연과 대역폭을 동시에 요구하는 데이터는 풀에 올릴 자리가 아닙니다.

## hot/cold 구분이 풀링의 전제 조건

풀이 이득을 내려면 *풀에 둬도 되는 데이터가 실제로 존재*해야 합니다. TPP 논문이 Meta 서버 fleet의 메모리 사용 패턴을 분석한 출발점이 이것입니다. 논문은 *차가운 page를 느린 memory로 내릴 기회*가 있다는 것을 먼저 보이고 나서 배치 기법을 냅니다.

GPU KV를 host CXL에 두는 경우에도 실제 offload runtime과 transfer 경로가 필요합니다. 단지 cold라는 분류만으로 장치가 직접 접근할 수는 없습니다. 도입 전에 답해 둘 질문은 세 개입니다.

- 실제 working set이 전체 용량의 몇 %인가.
- 그 비율이 시간에 따라 얼마나 흔들리는가.
- 데이터를 누가 배치하는가. 애플리케이션이 직접 정하거나(DAX), OS가 접근 패턴을 보고 옮깁니다(System RAM 노드).

OS가 옮기는 쪽의 근거로는 [TPP 논문](https://arxiv.org/abs/2206.02878)(ASPLOS '23, doi 10.1145/3582016.3582063)이 있습니다. *애플리케이션을 고치지 않는* OS 수준 배치로 기본 Linux보다 *18%* 좋았고, NUMA Balancing·AutoTiering보다 *5~17%* 나았습니다. 수치는 논문의 workload·장치·kernel 구성에서 나온 결과입니다.

## 동시 수요 예산을 계산하기

동시 수요는 같은 시각·같은 단위로 정렬된 trace로 계산해야 합니다. 아래 Node.js 예는 행을 시각, 열을 host로 보고 관측 구간의 최대 합과 host별 최대값의 합을 구합니다. missing sample을 0으로 채우지 않으며, 실제 구매 비용이나 필요한 reserve를 추정하지 않습니다.

```js title="cxl-pool-demand.mjs"
export function demandPeaks(rows) {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 4096 ||
      !Array.isArray(rows[0]) || rows[0].length === 0 || rows[0].length > 1024) {
    throw new RangeError('nonempty bounded demand matrix required');
  }
  const hosts = rows[0].length, peaks = Array(hosts).fill(0);
  let concurrentPeak = 0;
  for (const row of rows) {
    if (!Array.isArray(row) || row.length !== hosts ||
        !Array.from(row).every(x => Number.isSafeInteger(x) && x >= 0)) {
      throw new RangeError('aligned nonnegative integer samples required');
    }
    let sum = 0;
    row.forEach((value, i) => { sum += value; peaks[i] = Math.max(peaks[i], value); });
    if (!Number.isSafeInteger(sum)) throw new RangeError('sum overflow');
    concurrentPeak = Math.max(concurrentPeak, sum);
  }
  const separatePeakSum = peaks.reduce((sum, x) => sum + x, 0);
  if (!Number.isSafeInteger(separatePeakSum)) throw new RangeError('sum overflow');
  return {separatePeakSum, concurrentPeak};
}
console.log(demandPeaks([[100,0],[0,100]]));
console.log(demandPeaks([[100,100]]));
console.log(demandPeaks([[64,16,32,8],[16,64,8,32],[32,8,64,16]]));
```

Node.js v24.21.0 실행 결과입니다.

```text
$ node cxl-pool-demand.mjs
{ separatePeakSum: 200, concurrentPeak: 100 }
{ separatePeakSum: 200, concurrentPeak: 200 }
{ separatePeakSum: 224, concurrentPeak: 120 }
```

peak가 엇갈린 두 host는 200 대 100, peak가 겹친 두 host는 200 대 200으로 절감 여지가 없습니다. 세 번째는 host 4개의 peak 합 224(64+64+64+32) 대 동시 peak 120입니다. 이 계산에는 관측되지 않은 미래 peak, 할당 단위, reserve, pool 자체 비용이 들어 있지 않습니다.

## 조달 방식이 바뀐다

서버당 고정 구성에서 메모리는 *서버별 peak 수요*를 기준으로 삽니다. 어떤 서버가 드물게 큰 메모리를 요구하면 그 서버는 그만큼을 달고 살아야 하고, 평소에 남는 부분은 옆 서버가 모자라도 빌려줄 수 없습니다.

풀 구성에서는 기준이 *동시 peak*로 바뀝니다. 각 서버의 peak를 모두 더한 값이 아니라, 실제로 동시에 몰리는 최대치만큼만 있으면 됩니다.

| 항목 | 서버당 고정 구성 | 풀 구성 |
|------|----------------|--------|
| 구매 기준 | 서버별 peak의 합 | 동시 peak |
| 남는 용량 | 그 서버 안에 갇힘 | 다른 host에 재할당 |
| 증설 단위 | DIMM 증설·서버 교체 | 풀에 카드 추가 |
| 새로 드는 비용 | — | switch·관리 계층 운영, 지연 한 단 |

마지막 줄을 빼고 읽으면 풀링이 공짜처럼 보입니다. 실제로는 *지연 한 단*과 *운영할 관리 계층*이 새로 생깁니다.

이 이득을 정량화한 연구가 [Pond(ASPLOS '23)](https://arxiv.org/abs/2203.00241)입니다. 클라우드 운영 trace를 분석해 *8~16 소켓 범위로 풀링하면 이득 대부분*을 얻는다고 봤고, VM에 로컬·풀 메모리를 얼마씩 줄지 예측하는 방식으로 *DRAM 비용을 7% 줄이면서 성능을 same-NUMA-node 할당 대비 1~5% 이내*로 지켰습니다. 논문의 158 workload 평가 결과입니다.

## 메모리 계층에서 자주 어긋나는 판단

### "풀에서 가져온 메모리도 결국 DDR이니 성능은 비슷하다"

용량은 늘지만 *지연은 늘어납니다*. Direct-attach CXL 메모리부터가 원격 소켓 DDR5보다 1.35~3배 느렸고([Ch 10](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)의 Sun 등 실측), switch를 거치면 통과 지점이 더 붙습니다. Pond도 VM 메모리를 *로컬과 pool로 나눠* 배정해 성능을 지켰습니다.

### "HBM이 있으니 CXL 풀은 필요 없다"

두 메모리는 *경쟁 관계가 아닙니다*. HBM은 용량이 스택 수에 묶이고, CXL 풀은 그 한계 밖의 용량을 맡습니다. 대역폭은 HBM이, 용량은 풀이 담당하는 분업입니다.

### "풀링하면 메모리를 산 만큼 다 쓴다"

*할당 단위가 발목을 잡습니다*. CXL 3.1 규격(2023년 8월) §1.4는 CXL 2.0이 장치를 여러 virtual hierarchy에 pool할 수 있다고 적고, §2.4는 Type 3 MLD가 자원을 *최대 16개의 격리된 Logical Device*로 나눈다고 적습니다. 그래서 할당 단위는 장치 하나(SLD) 또는 LD 하나입니다. 워크로드가 요구하는 크기가 그 경계와 맞지 않으면 남는 조각이 생깁니다. 위 계산기의 결과도 할당 단위를 넣지 않은 하한입니다.

### "tiering은 OS에 맡기면 안 된다"

맡길 수 있습니다. TPP는 애플리케이션을 고치지 않는 OS 수준 배치로 기본 Linux보다 18% 좋았습니다. 같은 연구에서 NUMA Balancing보다도 5~17% 나았으므로, 어떤 배치 메커니즘을 쓰는지가 결과를 가릅니다.

### "CXL fabric이 NVLink을 대체한다"

*용도가 다릅니다*. NVLink는 GPU 사이의 고대역폭 경로이고, CXL fabric은 범용 메모리 공유 경로입니다.

> **메모**: fabric 자체의 오해 — 2.0 pooling과 3.0 fabric의 coherency 차이, GFAM의 invalidation 비용, Fabric Manager의 SPOF 여부, PBR 토폴로지의 deadlock 조건 — 은 [CXL 4.0 Internals Ch 4](/blog/embedded/hardware/cxl/chapter04-pooling-gfam#자주-하는-실수)에 정리돼 있습니다.

## 정리

- 풀링이 파는 것은 토폴로지가 아니라 *용량 상한의 위치*입니다.
- HBM 패키지의 물리 용량과 host CXL pool 용량은 별도이며, GPU offload 경로가 있어야 함께 사용할 수 있습니다.
- *대역폭 병목과 용량 병목은 다른 문제*입니다. 풀 용량 증가만으로 host 링크의 대역폭이 늘지는 않습니다. CXL 장치·채널을 추가해 시스템 총 BW를 확장하는 별도 설계와 구별합니다.
- CXL 1.1(direct) → 2.0(switching·MLD pooling) → 3.x(fabric·공유)로 갈수록 *나눠 쓰는 범위가 넓어지고 경로가 길어집니다*.
- 풀링의 전제 조건은 *hot/cold가 실제로 갈리는 워크로드*입니다.
- 조달 기준이 *서버별 peak의 합*에서 *동시 peak*로 바뀝니다. Pond는 DRAM 비용 7% 절감을 성능 손실 1~5% 이내로 보였습니다.
- OS 수준 배치도 효과가 있습니다. TPP는 기본 Linux 대비 18% 성능 향상을 보였습니다.

## 다음 편

HBM·GDDR 심화 시리즈는 여기서 마칩니다. 시작은 [Ch 1](/blog/embedded/hardware/hbm/chapter01-overview)의 질문 하나였습니다 — *같은 DRAM 셀에서 왜 HBM과 GDDR이 갈렸는가*. 답을 따라가다 보니 stack과 인터포저([Ch 2](/blog/embedded/hardware/hbm/chapter02-hbm-stack)), 세대별 대역폭([Ch 3](/blog/embedded/hardware/hbm/chapter03-hbm-generations)), 공칭과 실측의 간극([Ch 5](/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck)), 그 대역폭을 유지하는 값인 열과 전력([Ch 6](/blog/embedded/hardware/hbm/chapter06-thermal-power)), 컨트롤러가 짜내는 bank parallelism([Ch 7](/blog/embedded/hardware/hbm/chapter07-memory-controller))까지 왔습니다.

[Ch 8](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)에서 AI 워크로드가 그 메모리를 어떻게 채우는지 보고 나서야 *용량이 벽이라는 사실*이 드러났고, 거기서부터 [Ch 9](/blog/embedded/hardware/hbm/chapter09-cxl-mem)~Ch 12의 CXL 네 장이 이어졌습니다. 결국 이 시리즈는 *대역폭의 이야기로 시작해 용량의 이야기로 끝난* 셈입니다. 두 축이 서로 다른 문제라는 것이 시리즈 전체를 관통하는 한 문장입니다.

CXL을 *프로토콜·구현 쪽에서 다시* 보고 싶다면 [CXL 4.0 Internals](/blog/embedded/hardware/cxl/chapter01-cxl-position) 시리즈가 그 자리를 맡습니다. 그 밖의 인접 주제는 기존 시리즈에 분산 추가된 챕터로 이어집니다.

- *프로토콜·드라이버*: [Modern Embedded Recipes Ch 150~152](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
- *성능 분석*: [Embedded Performance Engineering Ch 54~56](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
- *보안*: [Embedded Security Ch 11~13](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)
- *부팅·BIOS*: [Bootloader Internals Ch 34~36](/blog/embedded/bootloader/chapter34-pcie-enumeration)

## 관련 항목

- [Ch 1: HBM과 GDDR 분기점 분석](/blog/embedded/hardware/hbm/chapter01-overview) — 시리즈 시작
- [Ch 8: NPU·GPU에서의 HBM 활용](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage) — 용량이 벽이 되는 지점
- [Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem) — CPU 메모리 확장과 Linux 노출의 개요
- [Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)
- [Ch 11: CXL Type 1·2·3 디바이스 분류](/blog/embedded/hardware/hbm/chapter11-cxl-device-types)
- [Embedded Performance Engineering Ch 29: CXL Interconnect 분석](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)
- [CXL 4.0 Internals Ch 4: Pooling·GFAM·Fabric](/blog/embedded/hardware/cxl/chapter04-pooling-gfam) — G-FAM·PBR·Fabric Manager의 메커니즘
- [CXL 4.0 Internals Ch 13: Switching·Fabric Manager](/blog/embedded/hardware/cxl/chapter13-switching-fabric) — switch 내부 구조와 Fabric Manager의 책임 범위
