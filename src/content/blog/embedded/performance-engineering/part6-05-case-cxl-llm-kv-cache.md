---
title: "설계 시나리오 — CXL.mem과 LLM inference KV cache"
slug: "embedded/performance-engineering/part6-05-case-cxl-llm-kv-cache"
date: 2026-06-16T09:03:00
description: "H100과 CXL 메모리를 결합하는 LLM KV cache 설계 시나리오를 살펴봅니다. 구성·성능 수치는 재현되거나 검증된 실측 사례가 아닙니다."
series: "Embedded Performance Engineering"
seriesOrder: 56
tags: [cxl, llm-inference, kv-cache, hbm, tiered-memory, case-study]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"H100 80 GB 5장과 CXL 메모리를 함께 쓰는 KV cache 설계는 어떤 조건을 검증해야 할까요?"** 이 글은 가상 구성으로 용량·주소 지정·이동 정책을 따져 보는 설계 시나리오입니다. 아래 성능 수치와 trace는 실측 자료가 아니며, vLLM의 공식 CXL KV backend로 제시하지 않습니다. NVIDIA는 H100 SXM을 GPU당 80 GB와 3.35 TB/s로 명시합니다([공식 HGX 사양](https://docs.nvidia.com/enterprise-reference-architectures/hgx-ai-factory-h100-h200-b200/latest/components.html)).

## 배경

설계 시나리오에 사용할 가정 hardware profile:

| 항목 | 값 |
|------|----|
| GPU | NVIDIA H100 SXM 5개 (GPU당 80 GB HBM) |
| HBM 총량 | 400 GB nominal (80 GB × 5; 실제 사용 가능량은 더 적음) |
| CPU | 2 socket Xeon SPR/EMR 세대 |
| 호스트 RAM | 1 TB DDR5 |
| 모델 | LLaMA 70B (FP16) |
| 추론 엔진 | vLLM (CXL 연결·KV 이동은 이 글에서 검증하지 않음) |

다섯 GPU는 용량 산술을 위한 가정이며 실제5장 SXM baseboard·slot 구성이 검증됐다는 뜻이 아닙니다. LLaMA의 head 구성과5-way tensor parallel이 호환된다고 가정하지도 않습니다. Host·GPU·PCIe/CXL 경로와 serving parallelism을 실제 지원 구성으로 고정해야 합니다.

## 증상

용량이 모자라는지 판단하려면 batch size만으로 부족합니다. prompt와 generation token 수, 동시 sequence 수, KV dtype, model config, tensor parallel 구성, runtime reserve를 같은 조건에서 기록해야 합니다. 이 글에는 그런 workload profile이 없어 실제 throughput 저하나 OOM 사례를 확인하지 않았습니다.

## 진단

### 1. GPU 메모리 사용량 확인

```bash
nvidia-smi --query-gpu=name,memory.total,memory.used --format=csv
```

실제 출력은 GPU별 device capacity, reserved memory, process별 사용량을 확인해야 합니다. 이 글에는 `nvidia-smi` 실행 로그가 없습니다.

### 2. GPU trace로 데이터 이동 원인 구분

대상 GPU와 지원되는 Nsight Systems 버전에서 실제 server command를 캡처하고, CUDA memcpy, GPU kernels, host synchronization, KV connector activity를 같은 trace에서 구분해야 합니다. 이 장에는 profiler trace가 없으므로 load/swap 지연이나 원인을 제시하지 않습니다.

### 3. Roofline 비교에 필요한 사양

[Ch 16(메모리 대역폭 분석)](/blog/embedded/performance-engineering/part2-08-memory-bandwidth) Roofline 비교에 사용할 기준 사양:

- H100 SXM 하나의 공식 메모리 대역폭은 3.35 TB/s입니다. 다섯 GPU의 합산 peak 16.75 TB/s는 동시 접근·토폴로지·실효 대역폭을 보장하지 않는 산술 합입니다.
- PCIe 5.0 x16은 raw 기준 약 64 GB/s per direction이며 protocol overhead와 실제 구현이 payload throughput을 낮춥니다. (출처: [PCI-SIG PCIe 5.0 rate 설명](https://pcisig.com/what-bit-rates-does-pcie-50-specification-support-and-how-does-it-compare-prior-pcie-generations))
- compute utilization과 memory throughput은 같은 trace 구간의 device metric으로 측정해야 합니다. 이 장에는 해당 측정 결과가 없습니다.

## 원인

70B parameters를 FP16으로 저장하면 weight payload만 단순 계산으로 약 140 GB입니다. KV cache 용량은 model layer/head configuration, token context, concurrent sequences, KV dtype, parallel sharding에 따라 달라지므로 batch number만으로 계산할 수 없습니다. 이 글에는 이를 계산할 configuration이 없습니다.

PCIe 5.0 x16 bandwidth를 bidirectional 합계 64 GB/s라고 표현하지 않습니다. 표준 raw bandwidth는 각 방향 기준이며, memory swap 여부와 양은 serving engine의 구현·trace로 확인해야 합니다.

## 해결

### 1. 하드웨어 추가

가정 구성에 *CXL memory add-in card 2장*을 둡니다. 실제 host 호환성은 확인하지 않았습니다.

| 항목 | 값 |
|------|---|
| 검토 대상 | Astera Labs A1000 CXL 계열, 실제 revision·DIMM 구성 미정 |
| 용량 가정 | 카드당2TB nominal, 해당 revision·DIMM 지원은 별도 확인 |
| 인터페이스 | PCIe 5.0 x16, CXL 2.0 |
| 카드 수 | 2장 |
| 총 CXL.mem 가정 | 4TB nominal (2TB × 2) |
| 실효 지연·대역폭 | 이 글에서 측정하지 않음 |

카드2장4TB는 이 시나리오의 명목상 용량 가정입니다. 현재 family page만으로 특정 A1000 revision의 최대2TB 지원을 확정하지 않습니다. 실제 DIMM·firmware·host의 지원 용량이나 사용 가능한 NUMA memory·성능 보장과 별도입니다. [Astera Labs A1000/Leo 제품 사양](https://www.asteralabs.com/products/leo-smart-memory-controllers/)과 실제 플랫폼 호환성을 확인해야 합니다.

### 2. 추론 엔진 측 설정 (개념적)

2026-10-24에 확인한 vLLM 공식 문서는 CPU primary tier와 optional secondary tiers를 지원하는 KV offload connector를 설명합니다. Secondary tier와 GPU 간 이동은 CPU tier를 거칩니다. 해당 문서만으로 CXL NUMA memory가 지원된다고 단정할 수 없으므로 이 글은 실행 가능한 vLLM CXL 설정을 제공하지 않습니다([vLLM KV offloading 문서](https://docs.vllm.ai/en/latest/features/kv_offloading_usage/)).

설계 질문은 hot KV를 GPU memory에 두고 cold data를 더 느린 tier로 옮길 수 있는지입니다. 실제 정책은 선택한 serving engine release와 connector API가 지원하는 tier에 한정해야 합니다. 임의의 `numa:2,3` 설정은 유효 schema가 아닙니다.

### 3. Linux Tiered Memory 설정

Linux에서 CXL memory를 System RAM/NUMA node로 노출하는 방식은 firmware ACPI 정보, kernel configuration, memory zone 등에 좌우됩니다. NUMA demotion은 memory-tier metadata에 따라 reclaim 시 distant node를 선호할 수 있는 커널 동작이지, DAMON이 LLM KV block을 자동 식별·이동한다는 뜻은 아닙니다([CXL early boot 문서](https://docs.kernel.org/driver-api/cxl/linux/early-boot.html), [CXL reclaim 문서](https://docs.kernel.org/driver-api/cxl/allocation/reclaim.html)).

## 결과를 검증하는 방법

이 글에는 결과를 입증할 trace, GPU별 memory telemetry, workload profile이 없습니다. 성능 회복을 주장하기 전 같은 model artifact·prompt/context distribution·concurrency·sampling window에서 baseline과 candidate를 비교하고, throughput 및 latency 분포와 GPU/CXL/host memory traffic을 보존해야 합니다.

## DAMON로 본 access 분포

[Ch 55](/blog/embedded/performance-engineering/part5-11-cxl-profiling-tools)에서 다룬 DAMON은 address range access pattern을 분석하는 도구입니다. 이를 KV block 단위의 access identity 또는 자동 이동 정책으로 간주하지 않습니다. DAMON이 serving process의 메모리 이동을 유발하는지, 각 allocation이 어느 tier에 놓였는지는 별도의 page-migration/NUMA 및 engine 계측으로 확인해야 합니다.

## 재발 방지

운영에서는 GPU별 reserved/used memory, host/CXL NUMA node 사용량·page migration, per-token throughput, latency percentile, GPU idle/copy activity를 수집할 수 있습니다. 임계값과 자동 batch 조정은 SLO·장치 용량·workload의 반복 측정으로 정해야 합니다. 이 장의 모니터링 임계값·dashboard는 특정 환경에서 검증되지 않았습니다.

## 자주 보는 함정과 안티패턴

> ⚠️ "GPU만 빠르면 LLM inference 빨라진다"

GPU compute·HBM 용량/대역폭·KV 재사용·interconnect·동기화의 병목은 model·단계·workload에 따라 달라집니다. KV cache만을 모든 inference의 병목으로 단정하지 않습니다.

> ⚠️ "CXL.mem 추가 = throughput 무조건 향상"

용량 확장으로 도움이 될 수 있지만, 더 느린 tier의 전송·재사용·동기화 비용 때문에 성능이 나빠질 수도 있습니다. Compute-bound 여부만으로 영향이 없다고 단정할 수 없으며 동일 workload로 비교해야 합니다.

> ⚠️ Manual KV cache placement에 집착

자동 tiering과 application-managed placement 중 무엇이 나은지는 serving engine, page layout, reuse pattern과 측정 결과로 결정합니다. DAMON을 vLLM KV offload의 자동 controller로 간주하지 않습니다.

> ⚠️ Tier 추가 후 batch size 같은 그대로

Batch 증가는 메모리 사용량과 latency를 함께 바꿉니다. 기존 batch를 baseline으로 유지한 뒤 서비스 SLO 범위에서 batch·concurrency를 비교합니다. 용량 확대만으로 batch 증가가 유리하다고 결론 내리지 않습니다.

## 정리

- 5×H100 80 GB와 CXL memory를 가정한 용량 분석 시나리오입니다. batch별 footprint는 실제 serving configuration으로 검증되지 않았습니다.
- CXL memory expansion, Linux memory placement, vLLM KV offload는 각각 별도 호환성·API·성능 검증이 필요합니다.
- throughput, batch capacity, latency 결과는 이 문서에서 실측되지 않았습니다.
- HBM과 CXL memory는 용량·지연·대역폭이 다른 memory tier입니다. 유용성은 workload, software placement, topology와 측정 결과에 달려 있습니다.
- 재발 방지 기준과 monitoring threshold는 deployment별로 정의해야 하며 이 글에서 설정값을 검증하지 않았습니다.

CXL 주제를 더 살펴보려면 [Embedded Security Ch 11~13](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)의 *보안 측면*, [Memory Diagnostics Ch 6~7](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)의 *진단 측면*으로 이어집니다.

## 관련 항목

- [Ch 7: 성능 모델링 — Roofline](/blog/embedded/performance-engineering/part1-07-modeling)
- [Ch 16: 메모리 대역폭 분석](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)
- [Ch 47: NVIDIA Nsight Systems](/blog/embedded/performance-engineering/part5-08-nsight)
- [Ch 54: CXL.mem 지연·대역폭](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
- [Ch 55: CXL 성능 프로파일링 도구](/blog/embedded/performance-engineering/part5-11-cxl-profiling-tools)
- [HBM·GDDR 심화 Ch 8: NPU·GPU에서의 HBM 활용](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
