---
title: "실전 사례 — CXL.mem 추가로 LLM inference KV cache 처리량 회복"
date: 2026-06-16T09:03:00
description: "70B 모델 KV cache가 HBM 한계를 넘어 throughput이 무너졌을 때, CXL.mem 256 GB pool 추가로 회복한 실전 케이스."
series: "Embedded Performance Engineering"
seriesOrder: 56
tags: [cxl, llm-inference, kv-cache, hbm, tiered-memory, case-study]
draft: true
---

> Outline — *Part 6 case study* 패턴. *증상·진단·원인·해결·재발 방지*의 5단 구조.
>
> 시나리오 (가상이지만 production에 기반):
>
> - **배경**: NVIDIA H100 5장(HBM3 96 GB × 5 = 480 GB) 노드에서 *LLaMA 70B inference 서빙*. 정상은 *batch 64, throughput 240 tokens/sec*
> - **증상**: *batch 96 이상으로 올리면 throughput이 80 tokens/sec로 추락*. *batch 32에서는 정상*
> - **진단**:
>   - nvidia-smi `mem_used` 모니터링 → batch 96에서 HBM 480 GB 중 462 GB 사용
>   - PyTorch CUDA profiler → *KV cache offload (Host RAM ↔ GPU PCIe DMA)*가 *프레임의 70%* 차지
>   - Roofline plot → memory-bound 영역에 처박힘. compute 활용률 23%
> - **원인**: *KV cache 폭증 — Ch 8 (HBM·GDDR 심화)에서 본 LLaMA 70B batch 128 → 640 GB*. HBM 부족분이 *PCIe DMA로 페이지 단위 swap*. *swap thrashing*
> - **해결**:
>   - Astera Labs Leo *2 TB CXL.mem* 카드 *2장* 추가 (PCIe 5.0 x16 each)
>   - *vLLM CXL plugin* (가상 — production stack은 다양) — *KV cache의 cold block을 CXL.mem에 배치*
>   - *Linux DAMON·DAMOS*로 *recent token = HBM, old token = CXL.mem* 자동 tier
> - **결과**:
>   - batch 96에서 *throughput 220 tokens/sec 회복* (정상의 92%)
>   - batch 128까지 확장 가능 → *throughput 280 tokens/sec*
>   - p99 latency 25% 증가하지만 *throughput 우선 워크로드*에는 OK
> - **재발 방지**:
>   - *KV cache budget monitoring* 대시보드 추가
>   - *batch size auto-tuning* — CXL.mem usage 기반 자동 조정
>   - *DAMON window size* 튜닝으로 false promotion 방지
>
> 핵심 lesson:
>
> - HBM의 *대역폭 우위*와 CXL.mem의 *용량 우위*는 *동일 inference 파이프라인 안*에서 *상보적으로 활용 가능*
> - *throughput 회복*은 *workload가 capacity-bound인가 bandwidth-bound인가*에 따라 결정됨. capacity-bound면 CXL.mem이 정답
> - *DAMON 기반 자동 tiering*이 *manual placement보다 운영 단순*. 단 *튜닝이 필요*함
>
> 관련: [Ch 8 HBM·GDDR 심화](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage), [Ch 9 HBM·GDDR 심화](/blog/embedded/hardware/hbm/chapter09-cxl-mem), [Ch 54](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency).
