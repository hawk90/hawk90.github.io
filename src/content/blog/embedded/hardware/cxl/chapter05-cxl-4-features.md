---
title: "Ch 5: CXL 4.0의 핵심 새 기능 — 128 GT/s·Bundled Port"
date: 2026-05-16T09:05:00
description: "PCIe 7.0 기반 128 GT/s, Bundled Port·Streamlined Port의 동기와 효과."
series: "CXL 4.0 Internals"
seriesOrder: 5
tags: [cxl-4, pcie-7, bundled-port, streamlined-port, ppr]
draft: false
---

## 한 줄 요약

> **"CXL 4.0은 *PCIe 7.0의 128 GT/s*를 base로 *대역폭을 두 배*로 늘리면서, *Bundled Port·Streamlined Port*로 *port 집계*와 *간소화된 enumeration*을 도입했습니다."** — *Flit 구조는 3.0과 동일*(같은 256B·FEC·CRC) 그대로 두고, *PHY·운용 기능·유지보수*에 집중한 세대입니다. *x2 native width·retimer 4개*가 장거리 link를 가능하게 합니다.

[Ch 4](/blog/embedded/hardware/cxl/chapter04-pooling-gfam)에서 *CXL 2.0~3.x의 fabric 진화*를 봤습니다. 이 장은 *CXL 4.0이 그 위에 더한 변경*을 분해합니다.

## 4.0의 변경 — 5가지 영역

CXL Consortium 공개 발표가 4.0의 변경을 *5가지 영역*으로 정리합니다.

| 영역 | 주요 변경 |
|------|----------|
| 물리 계층 | *128 GT/s* (PCIe 7.0), *x2 native width*, *retimer 4개* |
| 토폴로지 | *Bundled Port*, *Streamlined Port* |
| 유지보수 | *Host-initiated PPR*, *memory sparing at boot/deferred* |
| 모니터링 | *CVME granularity*, *Patrol Scrub cycle end* event |
| Compliance | *Extended Metadata Capability* test, *Compliance Mode DOE* 활용 |

각 영역을 순서대로 봅니다.

## 128 GT/s — PCIe 7.0 PHY

CXL 4.0은 *PCIe 7.0 Base Specification*의 PHY를 그대로 사용합니다.

| 세대 | 데이터 속도 | PHY 베이스 |
|------|-----------|----------|
| CXL 1.1·2.0 | 32 GT/s | PCIe 5.0 |
| CXL 3.0·3.1·3.2 | 64 GT/s | PCIe 6.0 |
| **CXL 4.0** | **128 GT/s** | **PCIe 7.0** |

*속도가 두 배*가 되면서 *x16 link의 단방향 대역폭*도 *128 GB/s → 256 GB/s*로 두 배가 됩니다.

### Flit 구조는 동일

CXL 4.0의 *디자인 결정 중 가장 영리한 부분*은 *Flit 구조를 3.0 그대로 유지*한 점입니다.

| 항목 | CXL 3.0 | CXL 4.0 |
|------|---------|---------|
| Flit 크기 | 256 B | 256 B (동일) |
| FEC | 적용 | 동일 |
| CRC | 적용 | 동일 |
| Latency-Optimized 변형 | 지원 | 지원 |

*Backward compatibility 보장*. *4.0 디바이스가 3.x host에 attach해도 동작*하고, *3.x 디바이스가 4.0 host에 attach해도 동작*합니다. 자세한 flit 구조는 [Ch 9 Flit Format](/blog/embedded/hardware/cxl/chapter09-flit-format)에서.

### x2 Native Width

CXL 4.0부터 *x2가 native width*가 됐습니다. 기존에는 x1·x4·x8·x16이 표준이었고 x2는 *bifurcation으로만* 가능했습니다.

| Lane 구성 | 단방향 대역폭 (128 GT/s) |
|----------|----------------------|
| x1 | 16 GB/s |
| x2 | 32 GB/s |
| x4 | 64 GB/s |
| x8 | 128 GB/s |
| x16 | 256 GB/s |

*x2의 가치*는 *소형 디바이스 (NIC·SmartNIC·작은 메모리 expander)*에 *낮은 power·작은 die area*로 *적절한 대역폭*을 제공하는 것입니다.

### Retimer 4개 지원

*Retimer*는 *링크를 길게 늘이거나 신호 무결성을 유지*하기 위한 *링크 중간 component*입니다. 신호를 *수신·재생·재송신*합니다.

| 세대 | Retimer 최대 |
|------|------------|
| CXL 3.x | 2 (typical) |
| **CXL 4.0** | **4** |

*4개의 retimer*가 가능해지면서 *몇 미터 거리*의 *외부 enclosure*에 CXL 디바이스를 둘 수 있게 됐습니다. *blade enclosure·rack-scale 메모리 풀*의 *물리적 거리 제약*이 완화됩니다.

## Bundled Port — Port 집계

CXL 4.0의 *가장 가시적인 새 기능*입니다. *디바이스가 multiple upstream port*를 *논리적으로 하나의 port group*으로 묶어 *host에 노출*합니다.

| 항목 | 의미 |
|------|------|
| Port group | 여러 물리 port의 *논리적 묶음* |
| Host 인식 | port group을 *한 device처럼* enumeration |
| 트래픽 분산 | device 내부에서 *port별 dynamic routing* |
| Bandwidth | port들의 *aggregated bandwidth*로 활용 |

기대 효과:

- **Latency 감소** — 트래픽이 *덜 혼잡한 port로 dynamic routing*
- **Bandwidth 증가** — *aggregated bandwidth* 활용
- **QoS 개선** — port 별로 *traffic class 분리* 가능
- **Failover** — 한 port fail해도 *나머지 port로 graceful degradation*

활용 사례:
- 대용량 메모리 디바이스가 *x16 link 하나로 부족*할 때 *여러 link 묶기*
- 다른 *VH (virtual hierarchy)*에 별도 port를 *동시 노출*해 *fan-out 효율* 향상
- *blade enclosure*에서 *backplane 다중 link*를 *하나의 device로 추상화*

## Streamlined Port — 간소화된 운용

*Streamlined Port*는 *Bundled Port의 한 변형*으로 *enumeration·관리 흐름을 간소화*한 것입니다.

| 차이 | Bundled Port | Streamlined Port |
|------|------------|-----------------|
| 복잡도 | 전체 기능 | 간소화 |
| 적합 | 고급 fabric | 단순 multi-host |
| Configuration | 복잡 | 빠른 setup |

*소형 enclosure나 fixed-topology* 환경에서 *bundled port의 full feature set이 과한* 경우, *streamlined로 같은 효과를 더 빠르게* 달성.

## Host-initiated PPR — 부팅 시 Bad Row Repair

*PPR (Post Package Repair)*은 *DRAM의 bad row를 spare row로 대체*하는 maintenance입니다. CXL 4.0부터 *host가 부팅 시 직접 PPR을 trigger*할 수 있게 됐습니다.

| 시점 | 변화 |
|------|------|
| 3.x 이전 | device가 *자체 RAS 이벤트*에 반응해 PPR 실행 |
| **4.0** | *Host가 boot 시점에 명시적으로 PPR 명령* 가능 |

기대 효과:
- *Pre-emptive repair* — fault 발생 전 *예방적 PPR*
- *Maintenance schedule* — host가 *데이터센터 운영 스케줄*과 *연계*해 PPR 시점 결정
- *Cluster-wide coordination* — 여러 device의 PPR을 *한 번에 진행* 가능

## Memory Sparing — Boot 또는 Deferred

*Memory sparing*은 *물리 영역에 fault*가 발생했을 때 *spare 영역으로 재할당*하는 maintenance입니다. CXL 4.0은 *boot 시점 또는 다음 boot로 deferral*을 지원합니다.

| Trigger | 동작 |
|---------|------|
| Boot-time sparing | 부팅 직후 *bad region을 spare로 교체* |
| Deferred (next boot) | *online 상태에서는 표시만*, 다음 boot에서 교체 |

Deferred sparing이 *운영 친화적*입니다. *production 워크로드 중단 없이* fault를 추적·기록하고, *예정된 maintenance window*에 교체 수행.

## CVME — Enhanced Monitoring

*CVME (CXL Virtual Memory Errors)*는 CXL 디바이스의 *메모리 fault 카운팅* 메커니즘입니다. CXL 4.0은:

| 개선 | 의미 |
|------|------|
| Granularity 강화 | per-rank·per-bank 같은 *세밀한 fault 분류* |
| Patrol Scrub cycle end event | scrub 완료 시 *명시적 이벤트*, host가 *결과 확인* 가능 |

이 모니터링이 *production에서의 disk-style health 추적*과 *예측적 디바이스 교체*를 가능하게 합니다.

## Compliance Testing 강화

CXL 4.0의 Compliance chapter는 *새 test case*를 추가했습니다.

| Test | 추가/변경 |
|------|----------|
| Extended Metadata Capability | 새 test 추가 |
| Compliance Mode DOE | 기존 test가 *Compliance Mode DOE 활용*하도록 update |
| 일반 test | configuration value 업데이트 |

Compliance testing은 *상호운용성의 핵심*입니다. CXL 4.0 device가 *모든 4.0 host에서 동작*하려면 *Compliance Mode DOE*가 *표준 path*가 됩니다.

## 4.0이 *안 한* 것

CXL 4.0이 *프로토콜 자체*를 *건드리지 않은* 것이 *중요한 점*입니다.

| 영역 | 4.0에서 안 함 |
|------|-------------|
| Flit 구조 | 3.0과 동일 |
| Coherency 모델 | 3.x HDM-D/DB·BISnp 그대로 |
| Fabric routing | 3.0 PBR 그대로 |
| Security | 3.1 TSP 그대로 |

*안 바꾼 영역*이 *backward compat 보장의 기반*. CXL 4.0이 *너무 많이 바꿨다면* 3.x 디바이스·host와의 *대규모 호환성 문제*가 발생했을 것.

## 자주 하는 실수

### "CXL 4.0이 CXL 3.x보다 모든 면에서 빠르다"

*PHY 대역폭만* 두 배입니다. *latency*는 *비슷하거나 약간 증가* (128 GT/s 신호 처리 overhead). *cache hit-rate 의존 워크로드*는 *4.0이 빠르지 않을 수 있음*. *workload별 측정* 필수.

### "Bundled Port는 multi-LD를 대체"

*완전히 다른 차원*입니다. Bundled Port는 *port 수준 집계*, multi-LD는 *capacity 수준 분할*. *둘 다 동시 가능*하고 *상호 보완*적.

### "Host-initiated PPR이면 RAS 자동 처리 끝"

*틀렸습니다*. Host가 *PPR을 언제 trigger할지* 결정해야 하고, *그 결정은 RAS 이벤트 모니터링·예측 모델*에 기반해야 합니다. *automation은 software 측 책임*.

### "Retimer 4개 = 무조건 좋다"

*Latency가 늘어납니다*. 각 retimer가 *수 ns의 latency*를 추가. *retimer 1개*면 되는 짧은 link에 *4개를 두면 손해*. *링크 길이 매핑* 후 *필요 수만 사용*.

### "Streamlined Port가 Bundled Port의 simplified version"

*Bundled의 한 운용 mode*입니다. *full Bundled feature가 필요 없을 때 선택*하는 것이지 *별도 표준이 아닙니다*.

## 정리

- CXL 4.0은 *PCIe 7.0의 128 GT/s* base로 *대역폭 두 배*. *x2 native·retimer 4개*가 추가.
- *Bundled Port*는 *port 집계*. *Streamlined Port*는 *간소화 운용*.
- *Host-initiated PPR·boot/deferred sparing*이 *maintenance를 host 측 제어*로 가져왔습니다.
- *CVME granularity·Patrol Scrub event*가 *모니터링을 강화*. predictive maintenance 가능.
- *Flit 구조·coherency·fabric routing은 3.0 그대로* — *backward compatibility 보장*.

## 다음 편

[Ch 6: CXL.io — PCIe와의 차이·DOE·DVSEC](/blog/embedded/hardware/cxl/chapter06-cxl-io)에서 *CXL.io 프로토콜의 PCIe 호환성*과 *CXL 고유 확장*(DVSEC·DOE)을 본격적으로 분해합니다.

## 관련 항목

- [Ch 1: CXL의 자리와 진화](/blog/embedded/hardware/cxl/chapter01-cxl-position)
- [Ch 2: System Architecture](/blog/embedded/hardware/cxl/chapter02-system-architecture)
- [Ch 9: Flit Format](/blog/embedded/hardware/cxl/chapter09-flit-format)
- [Ch 15: RAS·Performance·Compliance](/blog/embedded/hardware/cxl/chapter15-ras-performance)

## 시리즈 자료 출처 안내

본 글은 *CXL Consortium 공개 발표·press release·white paper*를 1차 자료로 합니다. CXL 4.0 Specification은 *§ navigation aid*로만 인용. 자세한 spec 인용 정책은 [Ch 1 footer](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내) 참고.
