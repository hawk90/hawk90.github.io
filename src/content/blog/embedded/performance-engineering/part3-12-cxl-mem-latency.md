---
title: "CXL.mem 지연·대역폭 실측 — Direct·Switch·Pooled 토폴로지 비교"
slug: "embedded/performance-engineering/part3-12-cxl-mem-latency"
date: 2026-06-16T09:01:00
description: "CXL.mem 토폴로지 세 가지의 구조, 실제 CXL 디바이스 실측(MICRO 2023), mlc·STREAM·DAMON으로 직접 재는 방법."
series: "Embedded Performance Engineering"
seriesOrder: 54
tags: [cxl, cxl-mem, latency, bandwidth, numa, mlc, stream]
topics: ["embedded"]
---

## 한 줄 요약

> **"CXL.mem의 지연은 디바이스 설계에 크게 좌우됩니다."** 실제 CXL 메모리 디바이스 3종을 잰 연구(Sun et al., MICRO 2023)에서 load 지연이 원격 소켓 DDR5의 1.35배부터 약 3배까지 갈렸습니다. 내 시스템의 값은 mlc·STREAM으로 직접 재야 합니다.

## 어떤 문제를 푸는가

[Ch 29](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)에서 *CXL 프로토콜 세 가지*와 *디바이스 타입*을 봤습니다. 그러나 *실제로 데이터센터에 배치할 때*는 *어느 토폴로지가 어떤 성능을 내는지*가 결정의 핵심입니다.

CXL.mem은 *DDR DIMM이 아닌 새 메모리 tier*입니다. 그렇다면 *지연·대역폭이 워크로드에 미치는 영향*을 *수치로* 알아야 합니다. 측정값 없이 "CXL.mem이 쓸 만하다/없다"는 *서로 다른 토폴로지를 같은 잣대로 평가*하는 흔한 오류입니다.

이 장은 *세 가지 대표 토폴로지*의 구조, 공개된 실측 결과, 그리고 *측정 방법*을 정리합니다.

## 세 가지 토폴로지

CXL.mem 배치 형태는 *세 단계*로 나뉩니다.

| 토폴로지 | 구성 | 대표 사례 |
|----------|------|----------|
| 1. Direct Attach (CXL 1.1/2.0) | Host CPU → CXL link → CXL Type 3 Memory Device | Samsung CMM-D |
| 2. Single Switch (CXL 2.0 pooling) | Host CPU → CXL link → CXL Switch → Memory Device A·B·C | TBD |
| 3. Multi-Host Pool (CXL 2.0 multi-LD / 3.0 fabric) | Host A·B·C → CXL Switch → Memory Device (Multi-Logical Device, 각 Host에 logical slice) | TBD |

각 토폴로지마다 *flit이 지나가는 단계 수*가 다르고, 그게 *지연*에 직접 반영됩니다.

## 공개된 실측 — 실제 CXL 디바이스 3종

Sun et al.(MICRO 2023)은 Intel Sapphire Rapids 서버에 *실제 CXL 메모리 디바이스 3종*(CXL-A·B·C, ASIC 기반 hard IP와 FPGA 기반 soft IP)을 붙이고 Intel MLC와 자체 마이크로벤치마크로 쟀습니다. 비교 기준은 원격 NUMA 노드의 DDR5(DDR5-R)입니다.

| 디바이스 | load(ld) 지연, DDR5-R 대비 |
|---------|----------|
| CXL-A | 약 1.35배 (35% 더 김) |
| CXL-B | 약 2배 |
| CXL-C | 약 3배 |

논문의 결론은 *CXL 메모리 지연이 CXL 컨트롤러 설계에 크게 좌우된다*는 것입니다. 같은 DDR4를 써도 CXL-C(DDR4-3200)가 CXL-B(DDR4-2400)보다 ld 지연이 67% 길었습니다. 이 측정은 direct attach 디바이스 기준이고, switch·pool 토폴로지의 실측은 이 글의 자료에 없습니다(TBD).

## 측정 방법 — mlc

Intel mlc는 *NUMA-aware 메모리 벤치마크*로, 3.0부터 *CPU 없는 메모리 전용 NUMA 노드*를 지원합니다. CXL.mem이 NUMA 노드로 등록된 환경에서 그대로 쓸 수 있습니다.

```bash
# 1. CXL 노드 확인 (CPU 없는 노드)
$ numactl --hardware

# 2. 노드 간 idle 지연 행렬
$ ./mlc --latency_matrix

# 3. 부하를 올려 가며 지연·대역폭
$ ./mlc --loaded_latency

# 4. 노드 간 대역폭 행렬
$ ./mlc --bandwidth_matrix
```

출력 형식과 옵션은 Intel MLC 문서에 있습니다. 숫자는 플랫폼·디바이스마다 다르므로 직접 잰 값으로 판단합니다.

## STREAM으로 본 sustained bandwidth

```bash
$ OMP_NUM_THREADS=16 numactl --cpunodebind=0 --membind=2 ./stream
```

`--membind`로 CXL 노드(여기서는 node 2)에만 할당해 Copy·Scale·Add·Triad 처리량을 잽니다. 같은 명령을 local 노드에 돌린 결과와 비교하면 CXL tier의 대역폭 비율이 나옵니다.

## DAMON으로 본 access 패턴

DAMON(Data Access Monitor)은 *메모리 region 단위로 access 빈도*를 측정합니다. CXL.mem tiered 환경에서 *cold region*을 식별해 *promotion/demotion* 결정을 돕습니다.

```bash
# 1. DAMON 설정 후 시작 (sysfs, 대상 지정은 커널 문서 참조)
$ echo on > /sys/kernel/mm/damon/admin/kdamonds/0/state

# 2. 결과 — region별 access 분포
$ damo report access
```

hot/cold 비율은 워크로드마다 다르므로, 이 분포를 직접 보고 *CXL.mem tier에 cold 데이터를 둘지* 판단합니다.

## 토폴로지 선택

결정 변수는 *지연 budget*과 *용량*입니다. 위 실측처럼 같은 direct attach라도 디바이스에 따라 지연이 원격 소켓 DDR5의 1.35배~3배로 갈리므로, 토폴로지보다 먼저 *실제 디바이스의 지연*을 mlc로 재고 워크로드의 지연 budget과 비교합니다.

## 자주 보는 함정과 안티패턴

> ⚠️ PCIe 5.0 x16의 64 GB/s를 그대로 가정

링크 원시 전송률(32 GT/s × 16 ÷ 8)은 이론 상한입니다. 프로토콜 오버헤드와 디바이스 구현이 실효 대역폭을 정하므로 STREAM·mlc로 잰 값으로 모델을 세웁니다.

> ⚠️ "CXL 메모리 지연은 하나의 값"

Sun et al.의 세 디바이스는 같은 시스템에서 1.35배~약 3배로 갈렸습니다. 다른 디바이스의 수치를 가져다 쓰지 않고, 쓸 디바이스를 직접 잽니다.

## 정리

- CXL.mem 지연은 *디바이스 설계에 강하게 의존*합니다 — 실제 디바이스 3종이 원격 소켓 DDR5의 1.35배~약 3배(Sun et al., MICRO 2023).
- switch·pool 토폴로지의 실측은 이 글의 자료에 없습니다.
- *mlc·STREAM·DAMON*이 *지연·sustained throughput·access pattern*을 각각 재는 도구입니다.
- 토폴로지 선택은 *직접 잰 지연*과 워크로드의 *지연 budget*으로 합니다.

다음 편은 **Ch 55: CXL 성능 프로파일링 도구** — cxl-cli·DAMON·perf-mem로 *측정 환경 자체*를 구축하는 법을 정리합니다.

## 관련 항목

- [Ch 16: 메모리 대역폭 분석 — STREAM·Roofline·Bus Saturation 측정](/blog/embedded/performance-engineering/part2-08-memory-bandwidth)
- [Ch 29: CXL Interconnect 분석 — AI 시대 메모리 대역폭 확장](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석 — HBM·GDDR·DDR 다음의 메모리 계층](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [HBM·GDDR 심화 Ch 8: NPU·GPU에서의 HBM 활용](/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage) — LLM inference 메모리 분해
