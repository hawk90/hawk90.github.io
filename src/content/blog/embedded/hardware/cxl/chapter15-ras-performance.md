---
title: "Ch 15: RAS·Performance·Compliance — 운용·검증의 마지막 단계"
date: 2026-05-16T09:15:00
description: "Reliability·Availability·Serviceability, 성능 고려사항, Compliance Testing."
series: "CXL 4.0 Internals"
seriesOrder: 15
tags: [cxl, ras, compliance, performance, cvme]
draft: false
---

## 한 줄 요약

> **"CXL 디바이스의 *운용 신뢰성*은 *RAS 이벤트 4 등급·Poison list·CVME 모니터링·AER 통합*으로 구성되고, *Performance Considerations*가 *latency·bandwidth·QoS 예산*을 정의하며, *Compliance Testing*이 *상호운용성*을 검증합니다."** — 이 셋이 *production 도입의 마지막 관문*입니다. 시리즈의 마무리 장입니다.

[Ch 14](/blog/embedded/hardware/cxl/chapter14-security)에서 *보안의 4 layer*를 봤습니다. 마지막 장은 *RAS·Performance·Compliance* — *운용·검증의 핵심*입니다.

## RAS 이벤트 4 등급

CXL 디바이스의 *RAS 이벤트*는 *4가지 등급*으로 분류됩니다.

| 등급 | 의미 | 호스트 대응 |
|------|------|-----------|
| Information | 정보성 (mailbox completion 등) | log만 |
| Warning | Correctable error | counter 모니터링 |
| Failure | Uncorrectable, 단일 영역 | poison list 격리, page offline |
| Fatal | 디바이스 오류 | 디바이스 reset 또는 교체 |

Linux 6.2+는 *Failure 이상에서 자동 page offline + MCE 이벤트* 트리거.

## Viral·AER·Recovery

| 메커니즘 | 의미 |
|---------|------|
| **AER** (Advanced Error Reporting) | PCIe의 *error reporting framework* — CXL이 그대로 활용 |
| **Viral** | error를 *propagation*해 *infected domain isolation* |
| **Recovery** | error 후 *link reset·device recovery*  |

이들이 *CXL link error의 standard handling*. *Linux의 pci_error_handlers*가 *vendor common path*.

## Poison List·Late Poison

*Poison List*는 *device가 bad media를 기록하는 리스트*입니다.

| 항목 | 의미 |
|------|------|
| Source | injected (test), internal (device 감지), vendor (firmware) |
| Granularity | cache line (64 B) ~ 페이지 |
| Operation | add, query, clear |

CXL 3.2부터 *Late Poison* 메커니즘이 추가됐습니다:

| 항목 | 기존 | Late Poison |
|------|-----|-------------|
| 통보 시점 | 즉시 | *지연 후* |
| 처리 | poison data를 *바로 host에 반환* | poison 표시만, 데이터 그대로 |
| Use case | data integrity 우선 | recovery 가능성 우선 |

Late Poison이 *recovery에 더 유리한 워크로드*에 활용.

## CVME — CXL Virtual Memory Errors

*CVME*는 *device 측 메모리 fault counting*입니다.

| 항목 | 의미 |
|------|------|
| 위치 | device 자체 RAS 통계 |
| Granularity | per-rank·per-bank·per-channel |
| Reporting | mailbox로 host 측 query 가능 |
| CXL 4.0 강화 | Granularity 강화, *Patrol Scrub cycle end* event |

CVME data가 *long-term 모니터링·디바이스 교체 결정의 기반*. *Datacenter operator*가 *health trend*를 추적.

## Performance Considerations

CXL Performance Considerations는 *spec Ch 13 (작년 추가)*에서 다루는 *latency budget·bandwidth utilization·QoS 가이드*입니다.

| 항목 | 가이드라인 |
|------|----------|
| Latency budget | direct attach 200 ns, switch 한 단 300 ns, pool 400 ns 이내 |
| Bandwidth utilization | sustained 60~85% (random vs sequential) |
| Cache hit rate | high cache-hit workload 우선 적용 |
| QoS | latency-sensitive vs throughput class 분리 |

자세한 측정·튜닝은 [Embedded Performance Engineering Ch 54](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency).

## Roofline 적용

[Performance Engineering Ch 7 Roofline](/blog/embedded/performance-engineering/part1-07-modeling)의 *Roofline model*을 *CXL.mem 워크로드에 적용*:

| 영역 | 의미 |
|------|------|
| Compute roof | CPU의 peak FLOPS·TOPS |
| Memory roof | CXL.mem의 effective bandwidth (sustained ~60-85%) |
| Workload | arithmetic intensity (FLOPS / byte) 기준 위치 |

대부분 AI workload는 *memory-bound* — *Roofline의 inclined region*에 위치. *CXL.mem의 effective bandwidth*가 *bottleneck*.

## Compliance Testing

CXL Spec Ch 14 *Compliance Testing*은 *디바이스가 표준에 부합*하는지 검증합니다.

| 영역 | 적용 |
|------|------|
| Protocol level | CXL.io·CXL.cache·CXL.mem 메시지 정합성 |
| Link level | Flit·CRC·FEC·LLR 정상 동작 |
| Topology | switching·routing·LD allocation |
| Security | SPDM·IDE·TSP·TDISP |

CXL 4.0의 *추가 test case*:

| Test | 추가/변경 |
|------|----------|
| Extended Metadata Capability | 새 test 추가 |
| Compliance Mode DOE | 기존 test가 *Compliance Mode DOE 활용* |
| Configuration values | update |

*Compliance Mode DOE*는 *DOE channel 위의 표준 test routing*. *모든 4.0 디바이스가 Compliance Mode를 지원*하면 *test infrastructure가 통일*됩니다.

## 실 운용 — `cxl health`·event log

운영에서 가장 자주 쓰는 명령:

```bash
# 1. 디바이스 health (mailbox opcode 0x4400)
$ cxl health -m mem0
{
  "memdev":"mem0",
  "health_status":"normal",
  "media_status":"normal",
  "life_used_percent":12,
  "temperature":42,
  "dirty_shutdown_count":3
}

# 2. Event Records (opcode 0x4500)
$ cxl monitor -m mem0
[2026-06-18 09:10:23] Info: Mailbox cmd 0x4400 completed
[2026-06-18 09:11:45] Warning: Correctable ECC error at 0x80045000
[2026-06-18 09:12:01] Failure: Media error at 0x80067800

# 3. Poison list
$ cxl list -m mem0 -P
{
  "poison":[
    {"address":"0x80012340", "length":64, "source":"injected"},
    {"address":"0x80067800", "length":4096, "source":"internal"}
  ]
}

# 4. bpftrace로 이벤트 빈도 추적
$ bpftrace -e '
  tracepoint:cxl:cxl_aer_correctable_error {
    @[probe] = count();
  }
  interval:s:60 { print(@); clear(@); }
'
```

## 장기 추적 지표

운영에서 *장기 추적*할 *5가지 지표*:

| 지표 | 의미 |
|------|------|
| poison rate | bad media 누적 속도 — wear trend |
| life_used_percent | device의 *사용된 lifetime* |
| dirty_shutdown_count | 비정상 종료 누적 — 데이터 무결성 위험 |
| temperature trend | thermal throttling 위험 |
| CVME counter (per region) | 영역별 fault frequency |

Prometheus·Grafana 같은 *모니터링 stack*에 노출해 *데이터센터 fleet 관리*.

## 자주 하는 실수

### "Failure event = 디바이스 즉시 교체"

*Failure는 단일 영역 fault*. *page offline으로 격리*가 우선. *fleet-wide failure rate trend*를 보고 교체 결정.

### "Compliance Mode DOE는 4.0 전용"

*기본 mechanism은 3.x에도*. CXL 4.0이 *Compliance test routing을 표준화*한 것. *vendor implementation*의 *호환성 차이*가 있을 수 있음.

### "CVME 데이터는 자동 분석"

*Raw data*가 host에 전달될 뿐, *분석은 software 측 책임*. *모니터링 stack 구축*이 필수.

### "Late Poison은 항상 좋다"

*워크로드 의존*. *Data integrity가 critical*하면 *기존 즉시 reporting이 안전*. *Recovery 가능성·다운타임 비용*을 *비교 평가*.

### "Roofline에서 CXL.mem이 bottleneck이면 무조건 더 큰 device"

*Workload tuning이 먼저*. *cache hit rate↑·data locality↑·sequential access*로 *effective bandwidth 향상*. *device upgrade는 마지막 옵션*.

## 정리

- *RAS 이벤트 4 등급*은 Information·Warning·Failure·Fatal. *Failure 이상에서 page offline 자동*.
- *AER·Viral·Recovery*가 *standard error handling*. Linux pci_error_handlers가 *common path*.
- *Poison list*가 *bad media tracking*. *Late Poison* (3.2+)으로 *recovery-friendly* 모드 추가.
- *CVME*는 *device 측 fault counting*. CXL 4.0의 *granularity 강화·Patrol Scrub event*.
- *Performance Considerations*: latency budget·sustained bandwidth·QoS class.
- *Roofline 모델 적용*으로 *memory-bound 워크로드의 bottleneck 식별*.
- *Compliance Testing*: protocol·link·topology·security. *Compliance Mode DOE가 4.0의 표준 routing*.
- *장기 운영 지표*: poison rate·life_used·dirty_shutdown·temperature·CVME.

## 시리즈 마무리 — 15편 회고

본 시리즈는 *CXL 4.0의 핵심 동작과 구현*을 *15편*으로 풀었습니다.

| Part | Ch | 주제 |
|------|-----|------|
| 개념·아키텍처 | 1-5 | CXL의 자리·진화, Type 분류, 일관성, fabric, 4.0 새 기능 |
| 프로토콜 | 6-10 | CXL.io·CXL.cache·CXL.mem·Flit·ARB/MUX |
| 구현·운용 | 11-15 | Linux 드라이버·QEMU·Switch·Security·RAS/Performance |

*공개 자료 (CXL Consortium·Linux GPL·QEMU GPL·hyperscale 논문)*를 1차 자료로 사용하고, *CXL 4.0 Specification은 § navigation aid*로만 인용했습니다. *spec 본문의 wording·table·figure 재생산 없음*.

다음 단계의 *CXL 깊이 학습*은 *기존 다른 시리즈*에 *분산 추가*된 챕터들이 받습니다:

- [HBM·GDDR 심화 Ch 9~12](/blog/embedded/hardware/hbm/chapter09-cxl-mem) — 메모리 산업 관점
- [Embedded Performance Engineering Ch 54~56](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency) — 성능 측정·튜닝
- [Embedded Security Ch 11~13](/blog/embedded/embedded-security/chapter11-pcie-cxl-ide) — 보안 깊이
- [Modern Embedded Recipes Ch 149~151](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl) — 임베디드·implementation
- [Bootloader Internals Ch 34~36](/blog/embedded/bootloader/chapter34-pcie-enumeration) — 부팅·UEFI
- 4개 디버깅 시리즈의 CXL 추가 챕터들

## 관련 항목

- [Ch 1: CXL의 자리와 진화](/blog/embedded/hardware/cxl/chapter01-cxl-position) — 시리즈 시작
- [Embedded Performance Engineering Ch 54: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
- [Memory Diagnostics Ch 6: CXL 메모리 진단](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)
- [Embedded Debugging Ch 9: CXL 디바이스 트러블슈팅](/blog/tools/debugging/embedded/chapter09-cxl-device-troubleshoot)
- [Postmortem Debugging Ch 5: CXL 디바이스 Core Dump 분석](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)

## 시리즈 자료 출처 안내

본 시리즈는 *CXL Consortium·DMTF·PCI-SIG 공개 자료·Linux drivers/cxl/ 소스 (GPL)·QEMU 소스 (GPL)·hyperscale 연구 자료*를 *1차 자료*로 합니다. CXL 4.0 Specification (Revision 4.0, Version 1.0, August 13, 2025)은 *§ navigation aid*로만 인용. *spec 본문의 wording·table·figure 재생산 없음*.

> CXL® and Compute Express Link® are trademarks of the Compute Express Link Consortium, Inc.
> Spec 인용은 © 2019-2025 COMPUTE EXPRESS LINK CONSORTIUM, INC. ALL RIGHTS RESERVED.의 저작권을 따릅니다.
