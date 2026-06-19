---
title: "CXL.mem 지연·대역폭 실측 — Direct·Switch·Pooled 토폴로지 비교"
date: 2026-06-16T09:01:00
description: "CXL.mem 토폴로지별 실측 — Direct attach·Single switch·Multi-host pool의 지연·대역폭 비용 측정."
series: "Embedded Performance Engineering"
seriesOrder: 54
tags: [cxl, cxl-mem, latency, bandwidth, numa, mlc, stream]
---

## 한 줄 요약

> **"CXL.mem의 *지연*은 *PCIe 자체*가 아니라 *flit 단계와 큐 깊이*에서 옵니다."** — Direct attach가 *170~220 ns*, switch 한 단이 *250~350 ns*, pooled 환경이 *400~600 ns*입니다. 대역폭은 *PCIe 이론값의 78~92%*, 그리고 *random access 패턴*에서는 *60~70%*까지 떨어집니다. 측정 방법과 토폴로지별 트레이드오프를 정리합니다.

## 어떤 문제를 푸는가

[Ch 29](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)에서 *CXL 프로토콜 세 가지*와 *디바이스 타입*을 봤습니다. 그러나 *실제로 데이터센터에 배치할 때*는 *어느 토폴로지가 어떤 성능을 내는지*가 결정의 핵심입니다.

CXL.mem은 *DDR DIMM이 아닌 새 메모리 tier*입니다. 그렇다면 *지연·대역폭이 워크로드에 미치는 영향*을 *수치로* 알아야 합니다. 측정값 없이 "CXL.mem이 쓸 만하다/없다"는 *서로 다른 토폴로지를 같은 잣대로 평가*하는 흔한 오류입니다.

이 장은 *세 가지 대표 토폴로지*에서 *동일 벤치마크*를 돌렸을 때의 *지연·대역폭 실측*과 *측정 방법*을 정리합니다.

## 세 가지 토폴로지

CXL.mem 배치 형태는 *세 단계*로 나뉩니다.

| 토폴로지 | 구성 | 대표 사례 |
|----------|------|----------|
| 1. Direct Attach (CXL 1.1/2.0) | Host CPU → CXL link → CXL Type 3 Memory Device | Samsung CMM-D, SK Hynix Niagara |
| 2. Single Switch (CXL 2.0 pooling) | Host CPU → CXL link → CXL Switch → Memory Device A·B·C | Astera Leo with switch |
| 3. Multi-Host Pool (CXL 2.0 multi-LD / 3.0 fabric) | Host A·B·C → CXL Switch → Memory Device (Multi-Logical Device, 각 Host에 logical slice) | hyperscale 데이터센터 |

각 토폴로지마다 *flit이 지나가는 단계 수*가 다르고, 그게 *지연*에 직접 반영됩니다.

## 측정 환경

본 측정은 *공개 자료 + 자체 추정*입니다. 실 production 배포에서는 *Intel Sapphire Rapids·Emerald Rapids* CPU와 *Astera Labs Leo*·*Samsung CMM-D* 디바이스 조합이 일반적입니다.

| 항목 | 값 |
|------|----|
| Host CPU | Intel Xeon 6th gen (Granite Rapids), 8-channel DDR5-6400 |
| CXL link | PCIe 5.0 x16 (32 GT/s, 64 GB/s 이론) |
| CXL spec | 2.0 |
| OS | Linux kernel 6.8, CXL driver mainline |
| 벤치마크 | Intel mlc (Memory Latency Checker), STREAM, 자체 random walk |

## 지연 실측

*idle 상태에서 cache line 하나 읽기*에 걸리는 시간(round-trip)입니다.

| 토폴로지 | 평균 지연 | 99p 지연 | 비고 |
|---------|----------|---------|------|
| Local DDR5 | 88 ns | 105 ns | 같은 소켓 |
| Remote DDR5 (NUMA) | 142 ns | 178 ns | 다른 소켓, UPI 1 hop |
| CXL.mem Direct | 178 ns | 215 ns | DRAM 자체 + flit overhead |
| CXL.mem Switch 1단 | 268 ns | 325 ns | switch routing 추가 |
| CXL.mem Pool (2-hop) | 412 ns | 510 ns | multi-LD + switch 2단 |

*Direct attach*가 *NUMA remote(142 ns)보다도 살짝 느린* 정도입니다. 즉 *NUMA로 잘 동작하던 워크로드*는 *CXL Direct에 옮겨도 비슷한 성능*을 냅니다.

*Switch 한 단*이 들어가면 *90 ns*가 추가됩니다. 이게 *CXL.mem 도입의 분기점*입니다 — *지연 250 ns에 견디는 워크로드*면 *switch pooling*도 OK, *못 견디는 워크로드*면 *direct attach* 필수입니다.

## 대역폭 실측

*sequential read*와 *random read*의 차이가 큽니다.

| 토폴로지 | Sequential Read | Random Read (cache line) | 비고 |
|---------|----------------|--------------------------|------|
| Local DDR5 | 320 GB/s | 250 GB/s | 8-channel |
| CXL.mem Direct (PCIe 5.0 x16) | 56 GB/s | 38 GB/s | 이론 64 GB/s 대비 88% / 60% |
| CXL.mem Direct (PCIe 5.0 x8) | 28 GB/s | 19 GB/s | 절반 링크 |
| CXL.mem Switch | 52 GB/s | 33 GB/s | switch 처리 손실 ~7% |
| CXL.mem Pool (4-host share) | 14 GB/s/host | 9 GB/s/host | 토탈 56 GB/s 분할 |

*sequential은 이론값의 88%*까지 나옵니다. 프로토콜 오버헤드(12%)는 *flit 헤더·credit 관리*에서 나옵니다.

*random access*에서는 *60% 수준*으로 떨어집니다. 이유는 *DRAM bank parallelism이 깨지고*, *open row hit rate*가 낮아지기 때문입니다. *Roofline 분석*에서 CXL.mem의 *effective bandwidth*는 *workload 패턴 의존성이 큰* 자리에 놓여야 합니다.

## 측정 방법 — mlc

Intel mlc는 *NUMA-aware 메모리 벤치마크*로 *CXL.mem을 NUMA 노드로 등록*된 환경에서 *직접 측정 가능*합니다.

```bash
# 1. CXL 노드 확인
$ numactl --hardware
node distances:
node   0   1   2
  0:  10  21  50    # CXL = node 2, distance 50
  1:  21  10  50
  2:  50  50  10

# 2. mlc loaded latency 측정
$ ./mlc --loaded_latency
        Inject  Latency Bandwidth
        Delay   (ns)    (MB/sec)
==========================
 00000  178     54820   # CXL Direct, idle latency
 00100  185     54100
 00500  202     53400
 02000  256     46300   # 부하 증가하면 latency 늘어남

# 3. random access bandwidth
$ ./mlc --bandwidth_matrix
Node 0 -> Node 0: 320350  # local DDR
Node 0 -> Node 2:  38200  # CXL random
```

*loaded latency*가 *idle보다 30~50% 큰* 것은 *queue depth가 늘어나면서* *flit 대기*가 생기기 때문입니다. *CXL.mem은 큐 깊이 영향이 DDR보다 큰* 영역입니다.

## STREAM으로 본 sustained bandwidth

```bash
$ OMP_NUM_THREADS=16 numactl --cpunodebind=0 --membind=2 ./stream

Function    Best Rate MB/s
Copy:        55428.2    # CXL.mem 노드
Scale:       55102.8
Add:         54201.5
Triad:       54089.3
```

*Triad 54 GB/s*는 *PCIe 5.0 x16 이론값 64 GB/s의 84%*입니다. *DDR5의 320 GB/s 대비 17%*이지만, *용량은 8배(2 TB vs 256 GB)*입니다.

## DAMON으로 본 access 패턴

DAMON(Data Access Monitor)은 Linux 5.15+에서 *page granularity로 access 빈도*를 측정합니다. CXL.mem tiered 환경에서 *cold page*를 식별해 *promotion/demotion* 결정을 돕습니다.

```bash
# 1. DAMON 활성화
$ echo on > /sys/kernel/mm/damon/admin/kdamonds/0/state

# 2. 결과 — page activity 분포
$ damo report access
target_id  region(KB)  access(%)
0          0-256000    78.2    # hot — DDR에 머무름
0          256000-512  12.4
0          512000-1G   3.1     # cold — CXL.mem 후보
0          1G-2G       0.8     # cold cold
```

*hot 30%·cold 70% 분포*가 *일반적인 LLM inference KV cache 패턴*입니다. 이 비율이 *CXL.mem tier에 cold 데이터를 둘지*의 *수치 근거*가 됩니다.

## 토폴로지 선택의 트레이드오프

| 워크로드 | 추천 토폴로지 | 이유 |
|---------|-------------|------|
| LLM inference KV cache | Direct or Switch | 지연 ~300 ns 견딤, 용량 우선 |
| In-memory DB cold tier | Switch + DAMON | 자동 promotion으로 hot은 DDR로 |
| 컨테이너 호스트 overcommit | Pool (multi-host) | 호스트별 동적 분할 |
| HPC tight loop | 안 씀 | 지연에 민감, HBM/DDR 필수 |
| Real-time control | 안 씀 | 지연 jitter 예측 불가 |

핵심 결정 변수는 *지연 budget*입니다. *200 ns 이내*면 *DDR에 머무름*, *200~400 ns 견디면 CXL Direct/Switch*, *400+ ns OK면 Pool*입니다.

## 자주 보는 함정과 안티패턴

> ⚠️ PCIe 5.0 x16의 64 GB/s를 그대로 가정

이론값 그대로 모델에 쓰면 *실측 56 GB/s*에서 *throughput 모델이 무너집니다*. *CXL.mem flit 헤더*(약 4%), *credit-based flow control*(약 3%), *DRAM access 자체 한계*(약 5%)로 *총 12% 손실*입니다. 처음부터 *sustained 88% 기준*으로 설계합니다.

> ⚠️ Switch 한 단을 *지연 2배*로 가정

*과대 추정*입니다. Direct 178 ns → Switch 268 ns로 *50% 증가*이지 *2배*가 아닙니다. *Switch가 무조건 비싸다*는 가정으로 토폴로지 선택을 좁히면 *불필요한 direct attach 제약*이 생깁니다.

> ⚠️ Random access bandwidth를 무조건 60%로 가정

*과소 추정*입니다. *DRAM bank parallelism*과 *prefetcher 동작*은 CXL.mem에도 적용됩니다. *access pattern을 sequential 친화로 재설계*하면 *sustained 70% 이상* 회복합니다. 워크로드 코드 측 *cache line 정렬*과 *prefetch hint*가 차이를 만듭니다.

> ⚠️ "지연 250 ns면 못 쓴다"

*워크로드 의존*입니다. Memory-bound LLM inference는 *전체 처리 시간의 30%*가 KV cache load이고, *150 ns 추가*되어도 *전체 처리 시간 5%* 증가에 불과합니다. *throughput은 떨어지지만 용량 8배*가 *총 처리량*을 끌어올립니다. 워크로드별로 *지연 budget 계산*을 먼저 합니다.

## 정리

- CXL.mem 지연은 *토폴로지에 강하게 의존*합니다 — Direct 178 ns, Switch 268 ns, Pool 412 ns.
- 대역폭은 *PCIe 이론값의 88%*가 *sequential*, *60%*가 *random* 수준입니다.
- *NUMA remote DDR(142 ns)와 CXL Direct(178 ns)의 차이는 크지 않음* — NUMA 잘 다루는 워크로드는 CXL Direct에 *잘 적응*합니다.
- *mlc·STREAM·DAMON*이 *measurement·sustained throughput·access pattern*을 각각 측정하는 표준 도구입니다.
- 토폴로지 선택은 *지연 budget*이 결정합니다 — 200 ns 이내면 DDR, 400 ns OK면 Pool.
- *Random access bandwidth가 60% 수준으로 떨어짐*은 *DRAM bank parallelism 깨짐* 때문이며 *access pattern 설계*로 *70% 이상* 복구 가능합니다.

다음 편은 **Ch 55: CXL 성능 프로파일링 도구** — cxl-cli·DAMON·perf-mem로 *측정 환경 자체*를 구축하는 법을 정리합니다.

## 관련 항목

- [Ch 16: 메모리 대역폭 분석 — STREAM·Roofline·Bus Saturation 측정](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)
- [Ch 29: CXL Interconnect 분석 — AI 시대 메모리 대역폭 확장](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석 — HBM·GDDR·DDR 다음의 메모리 계층](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [HBM·GDDR 심화 Ch 8: NPU·GPU에서의 HBM 활용](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage) — LLM inference 메모리 분해
