---
title: "설계 시나리오 — CXL.mem과 LLM inference KV cache"
slug: "embedded/performance-engineering/part6-05-case-cxl-llm-kv-cache"
date: 2026-06-16T09:03:00
description: "H100 80GB에 OPT-13B를 올리는 LLM KV cache 설계 시나리오입니다. PagedAttention 논문과 NVIDIA·vLLM 문서의 숫자로 용량과 전송 시간을 계산하며, GPU·CXL 실측은 하지 않았습니다."
series: "Embedded Performance Engineering"
seriesOrder: 56
tags: [cxl, llm-inference, kv-cache, hbm, tiered-memory, case-study]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"KV cache가 GPU 메모리를 넘칠 때, CXL 메모리를 어느 자리에 두면 되는가?"** 이 글은 논문과 공식 문서의 숫자로 용량·전송 시간을 계산해 보는 *설계 시나리오*입니다. GPU와 CXL 하드웨어는 쓰지 않았고, 처리량이나 지연을 잰 결과는 없습니다. 계산의 입력값은 모두 출처가 있고, 계산 자체는 기록해 두었습니다.

## 배경

LLM 추론에서 KV cache는 요청마다 생겼다 사라지는 메모리입니다. 이미 읽은 token들의 key·value 벡터를 저장해 두는 메모장 같은 것이라, 대화가 길어질수록 메모장도 두꺼워집니다.

크기는 PagedAttention 논문(Kwon et al., *Efficient Memory Management for Large Language Model Serving with PagedAttention*, SOSP 2023, [arXiv:2309.06180](https://arxiv.org/abs/2309.06180)) 3절이 OPT-13B로 계산해 보입니다.

$$
2\ (\text{key, value}) \times 5120\ (\text{hidden}) \times 40\ (\text{layers}) \times 2\ (\text{bytes, FP16}) = 800\ \text{KB/token}
$$

같은 절은 OPT가 최대 2048 token을 만들 수 있으니 요청 하나의 KV cache가 1.6 GB까지 커진다고 적습니다. 논문 Table 1의 서버 구성은 다음과 같습니다.

| 모델 | GPU | GPU 메모리 합계 | 파라미터 | KV cache용 메모리 | 최대 KV slot |
|---|---|---|---|---|---|
| OPT-13B | A100 | 40 GB | 26 GB | 12 GB | 15.7K |
| OPT-66B | 4×A100 | 160 GB | 132 GB | 21 GB | 9.7K |
| OPT-175B | 8×A100-80GB | 640 GB | 346 GB | 264 GB | 60.1K |

13B 줄은 위 식과 맞습니다. 12 GiB를 800 KiB로 나누면 15,728 slot입니다. 66B 줄은 GPU 메모리를 네 배로 늘렸는데 KV cache용 메모리는 21 GB에 그칩니다. 모델이 커지면 weight가 메모리를 먼저 차지한다는 뜻입니다.

이 시나리오는 OPT-13B를 NVIDIA H100 SXM 한 장에 올린다고 가정합니다. NVIDIA HGX 문서는 H100 SXM을 GPU당 "80GB HBM3", "3.35TB/s"로 적습니다([NVIDIA HGX Components](https://docs.nvidia.com/enterprise-reference-architectures/hgx-ai-factory-h100-h200-b200/latest/components.html)).

## 증상

서비스 요청이 늘면 KV cache 공간이 먼저 바닥납니다. PagedAttention 4.5절은 이때 vLLM이 하는 일을 적습니다. 새 token에 줄 빈 block이 없으면 일부 sequence를 골라 선점(preempt)하고, 그 KV block을 CPU 메모리로 옮기거나(swapping) 나중에 다시 계산합니다(recomputation). 선점한 sequence가 끝날 때까지 새 요청은 받지 않습니다.

그래서 증상은 "OOM"이 아니라 **처리량 저하와 대기열 증가**로 나타납니다. 메모리가 모자라다는 신호가 지연으로 바뀌어 보이는 셈입니다.

## 진단

### 1. GPU 메모리에 KV cache가 얼마나 들어가는가

H100 80 GB에서 OPT-13B 파라미터 26 GB(Table 1)를 빼면 54 GB가 남습니다. activation과 runtime 예약분을 무시한 상한입니다. 이 값을 800 KiB/token으로 나누면 다음과 같습니다(계산 기록: `kv-arith.log`).

| 항목 | 값 |
|---|---|
| KV cache에 쓸 수 있는 상한 | 54 GB |
| token slot | 약 70,779 |
| 2048 token짜리 요청 | 약 34개 |

즉 최대 길이 요청이 35개째 들어오는 순간부터 선점이 시작됩니다. 실제 서비스에서는 activation 몫을 빼야 하니 이보다 일찍 시작합니다.

### 2. 옮기는 데 얼마나 걸리는가

GPU와 호스트 메모리 사이의 경로는 PCIe입니다. NVIDIA HGX 문서는 8-GPU baseboard에 "Eight Gen5 x16 links"가 있다고 적고, [H100 제품 페이지](https://www.nvidia.com/en-us/data-center/h100/)는 H100 SXM의 interconnect를 "PCIe Gen5: 128GB/s"로 적습니다. 페이지는 이 값이 한 방향인지 양방향 합인지 밝히지 않습니다. 128 GB/s를 한 방향에 모두 쓴다고 쳐도 요청 하나의 KV(800 KiB × 2048 = 1.5625 GiB)를 옮기는 데 13.1 ms가 걸리고, 이것이 오버헤드를 빼지 않은 *하한*입니다.

PagedAttention 7.3절(Figure 19)은 실제로 재 봤습니다. block이 작으면 CPU와 GPU 사이에 작은 전송이 많아져 "limits the effective PCIe bandwidth"하고, 그래서 swapping의 오버헤드가 커진다고 적습니다. 반면 recomputation의 오버헤드는 block 크기와 무관하고, "recomputation overhead is never higher than 20% of swapping's latency"였습니다. block 크기 16~64에서는 두 방식의 end-to-end 성능이 비슷했습니다. vLLM의 기본 block 크기는 16입니다(7.2절).

### 3. Roofline 비교에 필요한 사양

[2-08(메모리 대역폭 분석)](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)의 Roofline으로 보면 두 경로의 차이가 큽니다. HBM은 GPU당 3.35 TB/s이고, PCIe Gen5는 128 GB/s입니다. 가장 유리하게 잡아도 약 26배 차이입니다. GPU가 KV cache를 직접 CXL 메모리에서 읽게 하는 설계는 이 비율 때문에 성립하기 어렵습니다. CXL 메모리는 GPU 옆의 *작업대*가 아니라 뒤편의 *창고*로 써야 합니다.

## 원인

정리하면 원인은 두 가지가 겹친 것입니다. 하나는 용량입니다. 파라미터가 고정으로 자리를 차지한 뒤 남는 공간이 동시 요청 수를 정합니다. 다른 하나는 이동 비용입니다. 넘친 KV를 내보냈다가 다시 들여오는 경로가 HBM보다 두 자릿수 느립니다.

## 해결

### 1. CXL 메모리를 CPU tier 뒤에 두기

PagedAttention 4.5절의 swapping 설계에는 중요한 성질이 있습니다. "the number of blocks swapped to the CPU RAM never exceeds the number of total physical blocks in the GPU RAM"이라서, CPU 쪽 swap 공간은 GPU의 KV cache 메모리 크기로 묶입니다. 이 시나리오라면 GPU당 54 GB입니다. 이 설계만 놓고 보면 swap 공간 때문에 CXL을 붙일 이유는 없습니다. 호스트 DRAM이 54 GB를 못 내줄 때에만 CXL이 의미가 있습니다.

현재 vLLM은 그보다 넓은 offload 구조를 갖고 있습니다. 2026-11-16에 확인한 [vLLM KV Offloading Usage Guide](https://docs.vllm.ai/en/latest/features/kv_offloading_usage/)는 `OffloadingConnector`가 완료된 KV block을 더 느리고 큰 tier로 내린다고 설명합니다. "Only the CPU primary tier has direct GPU access"이고, 그 뒤의 secondary tier(`fs`, `obj`, `p2p`)와 GPU 사이의 전송은 "staged through the CPU primary tier"입니다. CXL은 문서에 나오지 않습니다.

그렇다면 CXL 메모리가 들어갈 자리는 *CPU primary tier* 안입니다. CXL 메모리는 Linux에서 CPU 없는 NUMA 노드로 올라오고([3-11](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)), 같은 vLLM 문서는 `SimpleCPUOffloadConnector`의 huge page 절에서 "the memory follows the worker's NUMA policy, for example from `--numa-bind`"라고 적습니다. 다만 이 경로로 CPU tier를 CXL 노드에 두는 설정은 이 글에서 돌려 보지 않았습니다. 이 글의 arm64 QEMU 환경에서는 CXL region 자체가 만들어지지 않았기 때문입니다(3-11).

### 2. Linux tiered memory에 맡길 때의 조건

커널이 알아서 내리게 하는 방법도 있습니다. v6.12 `Documentation/ABI/testing/sysfs-kernel-mm-numa`는 `/sys/kernel/mm/numa/demotion_enabled`를 "Enable/disable demoting pages during reclaim"으로 설명합니다. fast tier가 압박을 받으면 slow tier로 page를 옮기고, 이 이동은 swap보다 먼저 일어납니다. 같은 문서는 할당한 프로세스의 cpuset 밖 노드로 옮길 수 있어 엄격한 cpuset 보장이 필요한 시스템에서는 켜지 말라고 적습니다. 이 글의 측정 VM에서 이 값은 `false`였습니다.

이 방식은 *reclaim이 일어날 때* 동작하므로, 호스트 DRAM이 넉넉하면 아무것도 내려가지 않습니다. vLLM처럼 애플리케이션이 직접 tier를 고르는 방식과는 결정 주체가 다릅니다.

## 결과를 검증하는 방법

이 시나리오의 숫자는 계산값이라, 실제 시스템에서는 다음을 같은 workload로 비교해야 결론을 낼 수 있습니다. PagedAttention 논문이 쓴 지표와 같은 축입니다.

| 비교 | 측정 대상 | 근거 |
|---|---|---|
| baseline vs CXL CPU tier | 요청률별 normalized latency | 논문 6절 평가에서 쓴 지표 |
| swapping vs recomputation | block 크기별 오버헤드 | 논문 7.3절, Figure 19 |
| CPU tier 위치 | 호스트 DRAM 노드 vs CXL 노드의 swap-in 시간 | 이 글의 계산(13.1 ms 하한)과 비교 |

## DAMON로 본 access 분포

CPU tier에 내려간 KV block은 sequence가 다시 스케줄되기 전까지 읽히지 않습니다. 이런 메모리는 DAMON으로 보면 0 Hz region으로 나타납니다. [3-12](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)에서 64 MiB hot 영역과 448 MiB cold 영역을 가진 프로그램을 damo 3.4.5로 기록했더니, hot 영역은 200 Hz, cold 영역은 0 Hz(age 16.8~22.9 s)로 정확히 갈렸습니다.

여기서 주의할 점이 있습니다. v6.12 `Documentation/mm/damon/design.rst`에 따르면 가상·물리 주소 모니터링 모두 "PTE Accessed-bit for basic access checks"를 씁니다. DAMON이 보는 것은 PTE의 Accessed bit입니다. GPU의 DMA 전송이 이 기록에 어떻게 나타나는지는 이 글에서 재 보지 않았으므로, DAMON 결과를 KV block의 실제 재사용 빈도로 바로 읽지 않습니다. KV block 단위의 사용 정보는 serving engine 쪽(vLLM의 `eviction_policy`, KV events)이 더 직접적인 출처입니다.

## 재발 방지

선점은 용량이 모자랄 때마다 다시 일어나니, 두 값을 계속 봐야 합니다. 하나는 GPU의 KV cache 사용률이고, 다른 하나는 선점·swap 횟수입니다. 앞의 계산처럼 H100 한 장에서 OPT-13B의 최대 길이 요청은 34개 언저리에서 GPU가 가득 차므로, 동시 요청 수의 상한을 이 근처에서 정하고 실측으로 조정합니다.

## 자주 보는 함정과 안티패턴

> ⚠️ GPU가 CXL 메모리를 직접 읽게 하기

HBM 3.35 TB/s와 PCIe Gen5 128 GB/s는 약 26배 차이입니다. CXL 메모리는 KV cache를 *보관*하는 곳이지, attention 계산 중에 읽는 곳이 아닙니다.

> ⚠️ "CXL.mem 추가 = throughput 향상"

PagedAttention 4.5절의 swapping 설계에서 CPU 쪽 swap 공간은 GPU KV 메모리 크기로 묶입니다. 호스트 DRAM이 그만큼을 이미 내줄 수 있다면, CXL을 붙여도 swap 용량은 늘지 않습니다.

> ⚠️ swap만 고려하고 recomputation을 빼먹기

PagedAttention 7.3절에서 recomputation 오버헤드는 swapping 지연의 20%를 넘지 않았습니다. 느린 tier를 늘리기 전에 다시 계산하는 쪽이 싼지부터 비교합니다.

> ⚠️ 작은 block으로 swap

같은 절(Figure 19)은 block이 작으면 CPU와 GPU 사이에 작은 전송이 많아져 swapping 오버헤드가 커지고, block 크기 16~64에서는 swapping과 recomputation의 end-to-end 성능이 비슷했다고 적습니다. swapping을 쓴다면 vLLM 기본값인 16보다 block을 줄이지 않습니다.

## 정리

- OPT-13B의 KV cache는 800 KB/token, 최대 길이 요청 하나에 1.6 GB입니다(PagedAttention 3절).
- H100 80 GB 한 장에서 파라미터 26 GB를 빼면, 최대 길이 요청 약 34개에서 KV 공간이 찹니다(계산값).
- 그 KV를 PCIe Gen5 128 GB/s(NVIDIA 표기)로 옮기면 요청당 13.1 ms가 하한입니다. HBM과의 대역폭 차이는 약 26배입니다.
- vLLM의 offload에서 GPU와 직접 주고받는 것은 CPU primary tier뿐이므로, CXL 메모리의 자리는 그 tier 안(NUMA 정책)입니다. 이 설정은 돌려 보지 않았습니다.
- swapping의 대안인 recomputation은 논문에서 swapping 지연의 20% 이하였습니다.

CXL 주제를 더 살펴보려면 [Embedded Security Ch 11~13](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)의 *보안 측면*, [Memory Diagnostics Ch 6~7](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)의 *진단 측면*으로 이어집니다.

## 관련 항목

- [1-07: 성능 모델링 — Roofline](/blog/embedded/performance-engineering/part1-07-modeling)
- [2-08: 메모리 대역폭 분석](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)
- [5-08: NVIDIA Nsight Systems](/blog/embedded/performance-engineering/part5-08-nsight)
- [3-12: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
- [5-11: CXL 성능 프로파일링 도구](/blog/embedded/performance-engineering/part5-11-cxl-profiling-tools)
- [HBM·GDDR 심화 Ch 8: NPU·GPU에서의 HBM 활용](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
