---
title: "실전 사례 — CXL.mem 추가로 LLM inference KV cache 처리량 회복"
date: 2026-06-16T09:03:00
description: "70B 모델 KV cache가 HBM 한계를 넘어 throughput이 무너졌을 때, CXL.mem 256 GB pool 추가로 회복한 실전 케이스."
series: "Embedded Performance Engineering"
seriesOrder: 56
tags: [cxl, llm-inference, kv-cache, hbm, tiered-memory, case-study]
draft: false
---

## 한 줄 요약

> **"H100 96 GB 5장(총 HBM 480 GB)으로 LLaMA 70B inference를 돌리던 노드가 batch 96 이상에서 throughput이 무너졌습니다."** — 원인은 *KV cache가 HBM 용량을 초과해 PCIe DMA swap thrashing*. 해결은 *Astera Leo 계열 CXL.mem pool 추가* + *cold KV block을 CXL.mem에 자동 배치*. 결과는 *batch 96에서 throughput ~92% 회복, batch 128 확장 가능*. 본 사례의 수치는 *현장 관측을 일반화한 시나리오*입니다.

## 배경

운영 환경 (현장 일반화):

| 항목 | 값 |
|------|----|
| GPU | 5x NVIDIA H100 96 GB SXM5 |
| HBM 총량 | 480 GB (96 GB × 5) |
| CPU | 2 socket Xeon SPR/EMR 세대 |
| 호스트 RAM | 1 TB DDR5 |
| 모델 | LLaMA 70B (FP16) |
| 추론 엔진 | vLLM 계열 (tiered KV 지원 빌드) |
| 정상 동작 | batch 64, throughput ~240 tokens/sec/server |

## 증상

운영 중 *batch 96 이상*으로 부하 증가 시:

| Batch | Throughput | 변화 |
|-------|-----------|------|
| 32 | 130 tokens/sec | baseline |
| 64 | 240 tokens/sec | 정상 |
| **96** | **80 tokens/sec** | **추락** |
| 128 | OOM | 못 돌림 |

*batch 96에서 throughput이 1/3로 떨어짐*. 비정상.

## 진단

### 1. GPU 메모리 사용량 확인

```bash
$ watch -n 1 nvidia-smi
# batch 96 동안

| GPU  Name    | Mem Used / Total |
|  0   H100    | 92450 MiB / 96000 MiB |
|  1   H100    | 92312 MiB / 96000 MiB |
|  2   H100    | 92478 MiB / 96000 MiB |
|  3   H100    | 92501 MiB / 96000 MiB |
|  4   H100    | 92388 MiB / 96000 MiB |
```

총 *462 GB / 480 GB 사용* — HBM 거의 가득.

### 2. CUDA profiler 분석

```bash
$ nsys profile --gpu-metrics-device=all ./vllm-server
```

Nsight Systems에서 본 *프레임당 시간 분해*:

| 단계 | 정상 (batch 64) | 비정상 (batch 96) |
|------|----------------|------------------|
| Attention compute | 8 ms | 9 ms |
| FFN compute | 12 ms | 13 ms |
| **KV cache load/swap** | **2 ms** | **180 ms** |
| Token generation | 1 ms | 1 ms |

*KV cache load가 90배 증가*. 원인: *HBM 부족분을 PCIe DMA로 Host RAM과 swap*.

### 3. Roofline 분석

[Ch 16(메모리 대역폭 분석)](/blog/embedded/performance-engineering/part2-08-memory-bandwidth) Roofline plot 결과:

- 정상: *memory-bound 영역의 상한선 근처* (HBM 8 TB/s 활용)
- 비정상: *memory-bound 영역의 훨씬 아래* (PCIe 64 GB/s에 발목 잡힘)
- *Compute 활용률 23%* — GPU가 *놀고 있는* 상태

## 원인

[HBM·GDDR 심화 Ch 8](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)에서 본 LLaMA 70B 메모리 분해:

| 항목 | batch 64 | batch 96 | batch 128 |
|------|---------|---------|----------|
| Weight (정적) | 140 GB | 140 GB | 140 GB |
| Activation | 12 GB | 18 GB | 24 GB |
| **KV cache** | **320 GB** | **480 GB** | **640 GB** |
| **총** | **472 GB** | **638 GB** | **804 GB** |

*HBM 총용량 480 GB*. batch 64는 *간신히* 들어가고, batch 96은 *158 GB 초과*. 초과분이 *PCIe로 host RAM과 swap*.

*PCIe 5.0 x16 양방향 64 GB/s*로 *수백 GB 데이터*를 *매 프레임 swap*하니 *throughput이 무너집니다*.

## 해결

### 1. 하드웨어 추가

서버에 *Astera Labs Leo CXL.mem 카드 2장* 추가:

| 항목 | 값 |
|------|---|
| 카드 | Astera Labs Leo CXL Memory |
| 용량 | 2 TB DRAM (DDR5 기반) |
| 인터페이스 | PCIe 5.0 x16, CXL 2.0 |
| 카드 수 | 2장 |
| 총 CXL.mem | 4 TB |
| 측정 지연 | 215 ns (Direct attach) |
| 측정 대역폭 | 56 GB/s/카드 (sequential) |

### 2. 추론 엔진 측 설정 (개념적)

vLLM 계열 추론 엔진에서 *KV cache를 HBM·CXL.mem에 분산 배치*하는 설정 (실제 schema는 *fork·버전*에 따라 다름, 아래는 *개념 표현*):

```yaml
# 개념적 예시 — 실 schema는 사용 엔진의 docs 참조
kv_cache:
  storage_tiers:
    - device: cuda           # HBM (hot tier)
      capacity: "70%"
      role: hot
    - device: numa:2,3       # CXL.mem nodes (warm tier)
      capacity: "100%"
      role: warm
  promotion_policy:
    type: lru
    window_size: 128         # 최근 128 token 이내 hot
  block_size: 16             # token 단위
```

핵심 아이디어: *recent token KV는 HBM*, *old token KV는 CXL.mem*. LRU 기반 promotion·demotion. *어느 vLLM fork·patch가 이를 native 지원*하는지는 *해당 프로젝트의 release note*를 확인.

### 3. Linux Tiered Memory 설정

```bash
# DAMON 활성화 (자동 promotion/demotion 보조)
$ echo on > /sys/kernel/mm/damon/admin/kdamonds/0/state

# NUMA balancing 활성
$ echo 1 > /proc/sys/kernel/numa_balancing

# CXL 노드를 movable zone으로 노출
$ daxctl reconfigure-device dax2.0 -m system-ram
$ daxctl reconfigure-device dax3.0 -m system-ram
```

## 결과

해결 후 측정:

| Batch | Throughput | p99 latency | HBM 사용 | CXL 사용 |
|-------|-----------|------------|---------|---------|
| 32 | 130 tok/s | 45 ms | 220 GB | 0 GB |
| 64 | 240 tok/s | 52 ms | 380 GB | 80 GB |
| **96** | **220 tok/s** | **68 ms** | **420 GB** | **240 GB** |
| **128** | **280 tok/s** | **94 ms** | **440 GB** | **400 GB** |

- batch 96에서 *throughput 220 tok/s 회복* (해결 전 80 → 220, *275% 향상*)
- batch 128까지 *확장 가능* (해결 전 OOM)
- p99 latency *25% 증가*하지만 *throughput 우선 워크로드*에는 OK

## DAMON로 본 access 분포

[Ch 55](/blog/embedded/performance-engineering/part5-11-cxl-profiling-tools)에서 본 DAMON 출력:

| Region | Access % | 위치 | 의미 |
|--------|---------|------|------|
| recent 128 token KV | 92% | HBM | hot |
| 128~512 token KV | 18% | HBM → CXL 점진 demotion | warm |
| 512+ token KV | 2% | CXL | cold |
| Weight | 100% | HBM (절대 안 옮김) | static |

*recent token이 HBM에 머무름*과 *old token이 CXL로 demotion*의 패턴이 *자동으로 형성*됨.

## 재발 방지

운영에 추가한 모니터링:

| 지표 | 임계 | 대응 |
|------|-----|------|
| HBM 사용률 | >90% 5분 지속 | 자동 batch size 감소 |
| KV cache PCIe swap rate | >10 GB/s 1분 | alert + investigation |
| CXL.mem 사용률 | >80% | 카드 추가 검토 |
| DAMON false promotion rate | >20% | window_size 튜닝 |
| CXL p99 latency | >400 ns | 디바이스 health 확인 |

이 5가지 지표를 Prometheus에 노출해 *Grafana 대시보드*로 본부 운영팀이 추적.

## 자주 보는 함정과 안티패턴

> ⚠️ "GPU만 빠르면 LLM inference 빨라진다"

*틀렸습니다*. *KV cache가 memory-bound 작업의 핵심*. *GPU compute*가 *남아돌아도 메모리가 병목*이면 throughput이 안 올라갑니다. *메모리 용량·대역폭이 GPU compute만큼 중요*.

> ⚠️ "CXL.mem 추가 = throughput 무조건 향상"

*조건부*입니다. *memory-bound 워크로드*에만 효과. *compute-bound 워크로드*는 CXL이 *영향 없음*. *Roofline 분석*으로 *어느 영역인지 먼저 확인*.

> ⚠️ Manual KV cache placement에 집착

DAMON 같은 *자동 tiering*이 *manual placement보다 일반적으로 우수*. application이 *모든 KV block의 hotness를 정확히 알기 어렵습니다*. 자동 메커니즘에 *맡기고 monitoring*이 권장.

> ⚠️ Tier 추가 후 batch size 같은 그대로

*확장의 여지*가 생겼는데 *batch 64 그대로* 두면 *추가 비용만 발생*. CXL 도입 후에는 *workload 재튜닝*이 *반드시* 필요합니다.

## 정리

- LLaMA 70B inference가 *batch 96 이상에서 throughput이 무너진* 사례. 원인은 *KV cache의 HBM 초과 + PCIe swap thrashing*.
- 해결은 *Astera Leo CXL.mem 4 TB 추가* + *vLLM의 tiered KV cache* + *Linux DAMON 자동 promotion*.
- 결과: *batch 96 throughput 92% 회복*, *batch 128까지 확장 가능*, p99 latency 25% 증가는 *throughput 우선 워크로드 수용 가능*.
- 핵심 lesson: *HBM은 대역폭 우위*, *CXL.mem은 용량 우위*. *상보적 활용*이 *memory-bound 워크로드의 정답*.
- 재발 방지는 *5가지 지표*(HBM 사용률, PCIe swap rate, CXL 사용률, false promotion, CXL latency) 상시 모니터링.

다음 편은 *Embedded Performance Engineering 시리즈의 마무리* 영역으로 들어갑니다. CXL 관련 다음 깊이는 [Embedded Security Ch 11~13](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide)의 *보안 측면*, [Memory Diagnostics Ch 6~7](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)의 *진단 측면*으로 이어집니다.

## 관련 항목

- [Ch 7: 성능 모델링 — Roofline](/blog/embedded/performance-engineering/part1-07-modeling)
- [Ch 16: 메모리 대역폭 분석](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)
- [Ch 47: NVIDIA Nsight Systems](/blog/embedded/performance-engineering/part5-08-nsight)
- [Ch 54: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
- [Ch 55: CXL 성능 프로파일링 도구](/blog/embedded/performance-engineering/part5-11-cxl-profiling-tools)
- [HBM·GDDR 심화 Ch 8: NPU·GPU에서의 HBM 활용](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage)
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
