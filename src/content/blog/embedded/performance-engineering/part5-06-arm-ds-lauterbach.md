---
title: "ARM DS·Lauterbach 분석 — Hardware Trace 전문 도구"
date: 2026-04-27T09:05:00
description: "ARM Development Studio Streamline, Lauterbach TRACE32, ETM·PTM hardware trace."
series: "Embedded Performance Engineering"
seriesOrder: 45
tags: [arm-ds, lauterbach, trace32, etm, ptm, streamline]
---

## 한 줄 요약

> **"ARM DS와 Lauterbach는 ETM·PTM hardware trace로 모든 명령 실행을 무손실로 기록하는, 임베디드 전용 측정의 표준입니다."**

## 어떤 문제를 푸는가

Linux 위 perf와 ftrace는 software sampling 기반이라 짧은 spike를 놓치거나 측정 자체가 시스템 동작을 바꿉니다. Cortex-M 같은 RTOS·bare-metal 환경에서는 perf가 아예 없습니다.

ARM 코어는 ETM(Embedded Trace Macrocell) 또는 PTM(Program Trace Macrocell)이라는 hardware trace unit을 코어 옆에 두고, 매 명령 실행을 압축된 stream으로 외부로 내보냅니다. 외부에는 DSTREAM, ULINKpro, Lauterbach TRACE32 같은 debug probe가 이 stream을 수신해 PC와 메모리에 기록합니다.

소프트웨어 overhead가 0이며, 모든 분기와 함수 호출이 ns 단위로 보존됩니다. 자동차, 항공, 산업 인증이 필요한 분야에서 사실상 표준 도구입니다.

## ARM Development Studio와 Streamline

ARM이 직접 제공하는 IDE는 ARM Development Studio(DS)이며, 그 안에 Streamline Performance Analyzer가 포함됩니다.

![ARM Development Studio 구성](/images/blog/perf-eng/diagrams/part5-06-arm-ds-structure.svg)

Streamline의 capture 흐름은 다음과 같습니다.

1. Target에 gator daemon 설치 (Linux) 또는 ETM unit 활성화 (bare-metal).
2. 호스트에서 Streamline 실행, target 연결.
3. Capture 시작 → 코어 PMU, ETM trace, OS 정보 동시 수집.
4. Timeline view에 코어별 hotspot, 함수 호출, OS 이벤트 표시.

Streamline의 강점은 Linux 시스템과 bare-metal을 같은 UI로 처리하는 점입니다. RTOS task switch와 인터럽트도 자동으로 인식합니다.

## DSTREAM·DSTREAM-PT Debug Probe

- **DSTREAM** — JTAG/SWD 디버그, 4 GB trace buffer
- **DSTREAM-PT** — PCIe 기반 고속, 32 GB trace buffer, 100 Gbit/s 수신
- **DSTREAM-ST** — 휴대형, 16 GB trace buffer

JTAG/SWD는 디버그 제어용, ETM/PTM trace는 별도의 trace port로 출력됩니다. 멀티코어 Cortex-A의 ETM은 코어당 수 Gbps의 trace 데이터를 생성하므로, probe의 buffer 크기와 수신 대역폭이 측정 깊이를 결정합니다.

## Lauterbach TRACE32

산업계에서 가장 폭넓게 쓰이는 임베디드 디버거가 Lauterbach TRACE32입니다. 자동차 ECU 개발에서는 사실상 기본 도구입니다.

- **TRACE32 PowerView** — GUI
- **TRACE32 PowerDebug** — JTAG/SWD/cJTAG probe
- **TRACE32 PowerTrace** — ETM/PTM/Nexus trace probe (8-32 GB buffer)

PRACTICE 스크립트(`.cmm`)로 자동화가 가능합니다.

```text
SYStem.RESet
SYStem.CPU CortexA72
SYStem.Up

Break.Set main /Onchip
Go
WAIT !STATE.RUN()

Trace.Init
Trace.METHOD Onchip
Trace.Mode FlowTrace
Trace.Arm
Go
```

수집된 trace는 statistics, branch coverage, function timing 분석에 사용됩니다.

## ETM과 PTM — 무엇을 trace하는가

![ETM vs PTM — Hardware Trace Unit 비교](/images/blog/perf-eng/diagrams/part5-06-etm-ptm.svg)

Cortex-A에서는 ETMv4가 표준이며 Cortex-M에서는 ETM-M0, ETM-M4가 있습니다. Cortex-M0+의 MTB(Micro Trace Buffer)는 SRAM 일부를 trace buffer로 쓰는 간이형입니다.

ETM stream은 압축되어 있어 disassembly와 합쳐야 사람이 읽을 수 있습니다. Lauterbach나 ARM DS가 이 reconstruct를 자동으로 합니다.

## RTOS Awareness

지원 RTOS — FreeRTOS, ThreadX, Zephyr, AUTOSAR OS, QNX, INTEGRITY.

TRACE32와 ARM DS는 위 RTOS의 task 구조를 인식해 task switch를 timeline에 표시합니다. Task별 CPU 점유율, mutex 대기 시간, ISR 진입 횟수 같은 metric을 hardware trace에서 직접 계산합니다.

```text
Task A   ████████░░░░░░██████░░░░
Task B   ░░░░░░░░██████░░░░░░░░██
ISR1     ░░█░░░░░░░░░░░░░░░░█░░░░
Idle     ░░░░░░░░░░░░░░░░░░░░░░░░
```

소프트웨어 trace point를 심을 필요 없이 RTOS의 task control block을 ETM 데이터에서 읽어 재구성하므로 production 코드가 그대로 측정됩니다.

## Code Coverage와 인증

| 표준 | 도메인 | 요구 |
|---|---|---|
| DO-178C | 항공 | Modified Condition/Decision Coverage |
| ISO 26262 | 자동차 | Branch Coverage |
| IEC 62304 | 의료 | Statement Coverage |

위 인증은 모든 분기가 실제로 실행되었음을 증명해야 합니다. ETM trace는 코드 instrumentation 없이 분기 전부를 기록하므로, 코드 수정 없이 인증을 통과할 수 있는 거의 유일한 방법입니다.

TRACE32 → Coverage.List

| Function | Statement | Branch | MC/DC |
|---|---|---|---|
| process_input | 100% | 95% | 80% |
| handle_error | 80% | 60% | 50% |

## 가격대와 라이센스

| 제품 | 가격 |
|---|---|
| ARM Development Studio Ultimate Edition (ARM Streamline 포함) | 연 $3,000-5,000 |
| DSTREAM probe | $5,000-8,000 |
| DSTREAM-PT (고속) | $15,000+ |
| Lauterbach PowerDebug USB 3 | $4,000-6,000 |
| Lauterbach PowerTrace II | $10,000-20,000 |
| Lauterbach PowerTrace III | $30,000+ |

가격이 높아 보이지만, 자동차나 항공 ECU 개발에서는 개발팀 한 사람의 1-2개월 인건비 수준입니다. 인증 통과에 드는 시간이 줄어드는 가치가 훨씬 크다는 판단입니다.

## 시나리오 — 자동차 ECU의 ISR 지연 측정

요구사항 — CAN 수신 ISR이 50 us 안에 완료.

측정 절차

1. TRACE32로 PowerTrace 연결
2. CAN_RX_ISR 진입과 이탈을 break point로 등록
3. 100만 번의 trace 수집
4. Statistic.Func로 평균, 최대, 분포 확인

결과

- 평균 12 µs
- 최대 78 µs ← 요구사항 위반
- 분포 95% < 20µs, 99% < 40µs, 0.01% > 70µs

이 0.01%의 spike가 무엇 때문인지 ETM trace로 그 시점의 instruction stream을 거꾸로 재생해 원인을 찾습니다. Software profiler로는 불가능한 분석입니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Trace port 핀이 출력되지 않은 보드

PCB 설계 시 ETM trace 핀(TRACEDATA, TRACECLK)을 연결하지 않으면 hardware trace를 사용할 수 없습니다. 양산 보드에서 제거하더라도 개발 보드에는 반드시 빼두어야 합니다.

> ⚠️ Trace buffer overflow

ETM이 초당 10 Gbit를 출력하는데 probe buffer가 1 GB면 0.8초만 기록 가능합니다.

긴 시나리오는 cycle accurate를 끄거나 filter로 특정 함수만 trace합니다.

> ⚠️ Cortex-M0에서 ETM 기대

Cortex-M0에는 ETM이 없습니다. Cortex-M0+는 MTB가 있지만 SRAM 일부를 사용하므로 buffer가 매우 작습니다(KB 단위). Cortex-M3 이상부터 ETM-M3가 본격적입니다.

> ⚠️ Streamline gator daemon overhead 무시

gator daemon은 sampling 기반이며 1-3% CPU를 사용합니다.

Bare-metal과 달리 Linux Streamline은 software 측정이 일부 섞여 있으므로 ETM 만큼 완전 zero overhead는 아닙니다.

## 정리

- ETM과 PTM은 ARM 코어 옆에 붙은 hardware trace unit으로 zero overhead 명령 추적을 제공합니다.
- ARM Development Studio의 Streamline은 Linux와 bare-metal을 같은 UI로 분석합니다.
- Lauterbach TRACE32는 자동차 ECU 개발의 사실상 표준이며 PRACTICE 스크립트로 자동화 가능합니다.
- RTOS awareness로 task switch와 ISR이 자동 timeline에 표시됩니다.
- DO-178C, ISO 26262 인증의 coverage 증명에 ETM trace가 핵심입니다.
- PCB 설계 시 trace 핀을 빼두어야 하며 buffer 크기가 측정 깊이를 결정합니다.

다음 편은 **Bare-metal 프로파일링** — 더 작은 시스템의 GPIO와 DWT.

## 관련 항목

- [5-05: Flamegraph 분석](/blog/embedded/performance-engineering/part5-05-flamegraph)
- [5-07: Bare-metal 프로파일링](/blog/embedded/performance-engineering/part5-07-baremetal-profiling)
- [Practical RTOS Internals 2-11: Tracing·Observability](/blog/embedded/rtos/practical-internals/part2-11-tracing-observability)
