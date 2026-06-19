---
title: "Ch 10: ARB/MUX — 세 프로토콜의 PHY 다중화"
date: 2026-05-16T09:10:00
description: "같은 PHY에 CXL.io·CXL.cache·CXL.mem을 시분할로 흘리는 layer."
series: "CXL 4.0 Internals"
seriesOrder: 10
tags: [cxl, arb-mux, vlsm, almp, multiplexing]
draft: false
---

## 한 줄 요약

> **"ARB/MUX는 *Transaction Layer와 Physical Layer 사이*에 위치하며, *세 프로토콜의 메시지를 같은 PHY로 시분할*하는 *CXL 고유 layer*입니다."** — *vLSM* (virtual Link State Machine)이 *protocol별 link state*를 관리하고, *ALMP*가 *protocol 협상·power transition*을 제어합니다. PCIe에는 없는 component로, *CXL이 protocol을 통합한 방식*의 핵심입니다.

[Ch 9](/blog/embedded/hardware/cxl/chapter09-flit-format)에서 *flit 단위 데이터 전송*을 봤습니다. 이 장은 *flit에 어느 protocol을 어떻게 packing할지 결정*하는 *ARB/MUX layer*입니다.

## ARB/MUX의 위치

CXL의 protocol stack에서:

| Layer | 역할 |
|-------|------|
| Application | host CPU·디바이스 SW |
| Transaction Layer | CXL.io/cache/mem 메시지 단위 처리 |
| **ARB/MUX** | **세 프로토콜의 flit packing·multiplex** |
| Link Layer | Flit 단위 reliability (CRC·FEC·LLR retry) |
| Physical Layer | Flex Bus PHY (PCIe 5.0/6.0/7.0) |

*ARB/MUX는 CXL 고유*입니다. PCIe에는 없는 layer로, *CXL이 multi-protocol을 한 PHY로 통합한 방식*의 핵심입니다.

## 왜 ARB/MUX가 필요한가

세 프로토콜이 *같은 PHY*를 공유하려면 *누가 언제 PHY를 쓸지* 결정하는 *arbiter*가 필요합니다.

| 시나리오 | ARB/MUX 결정 |
|---------|-------------|
| CXL.mem read와 CXL.io DMA가 동시 | 우선순위 비교 후 *latency-sensitive 먼저* |
| CXL.cache snoop과 CXL.io config | snoop이 *낮은 latency 필요* → 먼저 |
| 모든 프로토콜이 idle | *Empty Flit*으로 link 유지 |
| Power transition | *모든 protocol을 idle로 정렬* 후 진입 |

ARB/MUX는 *protocol별 traffic profile*을 알고 *Flit packing 결정*을 합니다.

## vLSM — Virtual Link State Machine

각 protocol마다 *독립 link state*를 관리:

| Link State | 의미 |
|------------|------|
| L0 | Active, 전송 가능 |
| L0p | Active, 일부 lane만 사용 (4.0) |
| L1 | Sleep, fast recovery |
| L2 | Deep sleep, slow recovery |
| Disabled | protocol 비활성 |

*세 protocol*이 *각자 vLSM*을 가집니다. 한 protocol이 L1·L2에 들어가도 *다른 protocol은 L0 유지* 가능.

| State combination | 동작 |
|------------------|------|
| io=L0, cache=L0, mem=L0 | 모두 active |
| io=L0, cache=L1, mem=L0 | cache idle, io·mem만 사용 |
| io=L1, cache=L0, mem=L0 | io idle (config 끝남), cache·mem 사용 |
| 모두 L1 | 링크 idle (power save) |

## ALMP — ARB/MUX Link Management Packet

*ALMP*는 *protocol negotiation·power transition*을 위한 *control packet*입니다.

| 용도 | 사용 |
|------|------|
| Initial Training | host·device 간 *protocol 합의* (어떤 protocol 활성화) |
| Power Transition | *L1·L2 진입·복귀* 협상 |
| Status Sync | 양 끝의 *state synchronization* |
| ALMP Bypass | *복잡한 협상 생략* (고급 모드) |

ALMP는 *flit 안에 packing*되어 흐르되, *우선순위가 매우 높습니다*. transmitter는 *ALMP를 지연 없이 보냅*니다.

## Arbitration Policy

ARB/MUX가 *어느 protocol을 우선*할지의 *기본 정책*:

| 우선순위 | Protocol | 이유 |
|---------|---------|------|
| **1순위** | CXL.cache snoop·response | latency-critical, *cache coherency 유지* |
| **2순위** | CXL.mem read response·write completion | host CPU stall 회피 |
| **3순위** | CXL.cache·CXL.mem request | *normal traffic* |
| **4순위** | CXL.io | bulk transfer·config (latency 덜 critical) |

이 정책은 *기본 가이드*. *디바이스·host implementation*이 *조정* 가능합니다. *워크로드별 fine-tuning*이 *성능 차이*를 만듭니다.

## Flit Packing 흐름

ARB/MUX의 *한 flit 만들기* 흐름:

| 단계 | 동작 |
|------|------|
| 1 | 각 protocol queue에서 *대기 중인 message* 확인 |
| 2 | *Arbitration policy*로 우선순위 결정 |
| 3 | Highest-priority message를 *slot 0에 할당* |
| 4 | 남은 slot에 *다른 message packing* |
| 5 | DLLP (flow control)·LLR header 추가 |
| 6 | CRC·FEC 계산 |
| 7 | Link Layer로 flit 전달 |

*Flit 가득 차지 않아도* *latency 요구*로 *전송할 수 있음* (Latency-Optimized 모드).

## Bypass Feature

*고급 모드*로 *ARB/MUX의 일부 결정을 생략*합니다:

| 일반 | Bypass |
|------|--------|
| 매 flit마다 arbitration | *miniature heuristic*만 사용 |
| Full ALMP negotiation | *간소화된 protocol 합의* |
| State machine 전체 | *fast path만* |

Bypass는 *deterministic workload*(예측 가능한 traffic pattern)에서 *latency 절감*에 효과적. *복잡한 mixed traffic*에는 *full ARB/MUX*가 권장.

## L0p (4.0의 새 power state)

CXL 4.0의 *L0p*는 *active 상태에서 일부 lane만 사용*하는 state:

| 상태 | Lane 사용 | Bandwidth |
|------|----------|----------|
| L0 | 전체 (예: x16) | 256 GB/s |
| **L0p** | 일부 (예: x8) | 128 GB/s |
| L1 | 0 | 0 (sleep) |

*L0p의 가치*:
- *유휴 워크로드*에서 *bandwidth 줄이고 power save*
- *L1 진입·복귀의 latency 페널티* 회피
- *동적 dynamic scaling* 가능

ALMP가 *L0 ↔ L0p ↔ L1 전환*을 협상합니다.

## CXL 4.0 vs 이전 — ARB/MUX 변경

ARB/MUX 자체는 *대부분 그대로*. *4.0의 추가*:

| 변경 | 의미 |
|------|------|
| L0p state 지원 | 부분 lane active |
| Bundled Port awareness | port group 단위 ARB |
| Improved Latency-Optimized | small message faster transmit |

*근본 architecture 변경 없음* — backward compat 유지.

## Linux 측 — ARB/MUX 인식

ARB/MUX 자체는 *firmware·hardware 결합*으로 동작. *Linux 측 직접 인식·제어 minimal*. 다만 *상태 monitoring* 가능:

```bash
# CXL device state monitoring (vendor-specific)
$ cxl monitor -m mem0 | grep -i state
[2026-06-19 09:00:00] CXL.mem vLSM: L0
[2026-06-19 09:00:30] CXL.cache vLSM: L0 → L1 (idle)

# bpftrace로 ALMP 트래픽 추적 (vendor·platform 의존)
$ bpftrace -e 'kprobe:cxl_almp_send { @[arg1] = count(); }'
```

상세 동작은 *device firmware·BIOS·platform OEM*가 *대부분 hide*. *운영자는 상태 trend monitoring*만 일반적.

## 자주 하는 실수

### "ARB/MUX는 단순한 multiplexer"

*정교한 arbiter*입니다. *3개 protocol·여러 vLSM·power state·ALMP*를 *동시 관리*. *firmware 복잡도가 매우 높음*.

### "Latency-critical 트래픽은 항상 1순위"

*기본 policy*는 그렇지만 *워크로드별 조정 가능*. *bulk transfer 위주*에서는 *throughput에 우선순위*를 줄 수도 있음. *vendor firmware tuning*.

### "L1·L2 entry는 자동"

*ALMP 협상 필요*합니다. 양 끝의 *idle 인식*과 *state sync*가 필요. *protocol 별로 다른 시점*에 idle.

### "ARB/MUX는 host·device 양쪽에 같은 implementation"

*기능은 같지만 implementation 다름*. Host의 ARB/MUX는 *CPU 메모리 컨트롤러 내장*, device는 *별도 controller chip*. *Symmetric protocol·asymmetric implementation*.

### "Bypass mode가 항상 빠르다"

*Predictable workload에서만*. *Mixed traffic·dynamic workload*는 *full ARB/MUX가 더 안정적·결국 더 빠름*. Bypass는 *전문 workload tuning* 영역.

## 정리

- *ARB/MUX*는 *Transaction Layer와 Physical Layer 사이의 multiplexer* — CXL 고유 layer입니다.
- *vLSM*이 *protocol별 link state* 관리. L0·L0p·L1·L2·Disabled.
- *ALMP*가 *protocol negotiation·power transition*을 위한 *control packet*.
- *Arbitration policy*: snoop·response 1순위 → mem/cache request → io 순.
- *Bypass Feature*는 *predictable workload*에 *latency 절감*.
- *CXL 4.0의 L0p state*는 *부분 lane active*로 *dynamic bandwidth scaling*.

## 다음 편

[Ch 11: Linux drivers/cxl/ 분석 — Mainline kernel CXL 구현](/blog/embedded/hardware/cxl/chapter11-linux-driver)에서 *Linux 6.x의 CXL subsystem 코드 구조*와 *probe 흐름*을 본격적으로 분해합니다.

## 관련 항목

- [Ch 5: CXL 4.0의 핵심 새 기능](/blog/embedded/hardware/cxl/chapter05-cxl-4-features)
- [Ch 9: Flit Format](/blog/embedded/hardware/cxl/chapter09-flit-format)
- [Ch 11: Linux drivers/cxl/ 분석](/blog/embedded/hardware/cxl/chapter11-linux-driver)

## 시리즈 자료 출처 안내

본 글은 *CXL Consortium·PCI-SIG 공개 자료*를 1차 자료로 합니다. CXL 4.0 Specification은 *§ navigation aid*로만 인용. 자세한 spec 인용 정책은 [Ch 1 footer](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내) 참고.
