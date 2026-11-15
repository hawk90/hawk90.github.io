---
title: "ARM DS·Lauterbach 분석 — Hardware Trace 전문 도구"
slug: "embedded/performance-engineering/part5-06-arm-ds-lauterbach"
date: 2026-04-27T09:05:00
description: "ARM Development Studio Streamline, Lauterbach TRACE32, ETM·PTM hardware trace."
series: "Embedded Performance Engineering"
seriesOrder: 45
tags: [arm-ds, lauterbach, trace32, etm, ptm, streamline]
topics: ["embedded"]
---

## 한 줄 요약

> **"ARM DS와 Lauterbach는 ETM·PTM hardware trace를 분석하는 대표적인 임베디드 측정 도구입니다."** ETM·PTM의 지원 범위와 실제로 수집 가능한 trace 양은 코어·SoC·trace 출력·probe 구성에 따라 달라집니다.

## 어떤 문제를 푸는가

Linux perf의 sampling과 ftrace의 event/function tracing은 서로 다른 관측 방식이며 짧은 spike를 놓치거나 측정 자체가 시스템 동작을 바꿉니다. Cortex-M 같은 RTOS·bare-metal 환경에서는 perf가 아예 없습니다.

지원 Arm 구현의 ETM/PTM은 program-flow trace를 만들 수 있습니다. Trace architecture·option에 따라 timestamp·cycle·data 지원이 다르며 모든 코어가 모든 instruction의 주소와 데이터를 내보내는 것은 아닙니다. On-chip sink 또는 지원되는 외부 probe·interface로 수집하며 실제 binary·주소 mapping·동기화 정보와 함께 decode합니다.

하드웨어 trace 경로는 계측 코드를 실행하지 않아 소프트웨어 계측 부담을 줄일 수 있습니다. 다만 trace 생성량이 출력·버퍼 용량을 넘으면 필터링이나 유실이 발생할 수 있고, 모든 코어가 ETM/PTM을 제공하는 것도 아닙니다. 자동차·항공·산업 분야에서 널리 쓰이지만, 특정 도메인의 유일한 표준 도구라고 단정할 수는 없습니다.

## ARM Development Studio와 Streamline

ARM이 직접 제공하는 IDE는 ARM Development Studio(DS)이며, 그 안에 Streamline Performance Analyzer가 포함됩니다.

![ARM Development Studio 구성](/images/blog/perf-eng/diagrams/part5-06-arm-ds-structure.svg)

[Arm gator source](https://github.com/ARM-software/gator)는 Linux/Android의 `gatord`와 bare-metal의 **barman embedded agent**를 구분합니다. Bare-metal에서 ETM만 켜면 Linux gator capture와 같은 결과가 생기는 것은 아닙니다. [Arm Streamline bare-metal setup guide](https://documentation-service.arm.com/static/5f4f6c97ca7b6a3399378218)에서 agent·PMU·저장 backend·task 정보를 확인합니다.

Capture 전 실제 DS/Streamline release, core·SoC, OS/RTOS integration, 지원 counter·trace source, binary hash·symbol과 loss indicator를 고정합니다. 이 글에서는 상용 도구·probe·RTOS target을 실행하지 않았습니다.

## DSTREAM·DSTREAM-PT Debug Probe

probe별 memory 크기와 transfer throughput은 제품 모델·firmware·구성에 따라 다르므로 최신 vendor 자료를 확인합니다. 확인하지 않은 수치 비교는 생략합니다.

JTAG/SWD는 debug control에, ETM/PTM trace는 trace output 경로에 쓰입니다. 실제 data rate와 capture depth는 target 실행·trace configuration·probe 구성으로 확인합니다.

## Lauterbach TRACE32

[TRACE32 Arm 지원 안내](https://www.lauterbach.com/supported-platforms/architectures/arm)는 debug·on-chip/off-chip trace·OS awareness를 구분합니다. 실제 target·probe·license 조합의 지원 범위를 확인합니다.

- **TRACE32 PowerView** — GUI
- **TRACE32 PowerDebug** — JTAG/SWD/cJTAG probe
- **TRACE32 PowerTrace** — 지원되는 ETM/PTM/Nexus trace capture probe (구성은 제품·target에 따라 확인)

PRACTICE 스크립트(`.cmm`)로 자동화가 가능합니다.

PRACTICE command는 실제 TRACE32 release·target script에서 확인합니다. 기존 reset·run·trace 명령 나열은 장비에서 검증되지 않아 즉시 실행 가능한 capture procedure로 두지 않습니다. Reset·breakpoint·halt와 비정지 trace 관측도 구분합니다.

## ETM과 PTM — 무엇을 trace하는가

코어별 trace block은 공식 [Arm Cortex-M0](https://developer.arm.com/documentation/dui0497/latest/), [Cortex-M3 datasheet](https://developer.arm.com/-/media/Arm%20Developer%20Community/PDF/Processor%20Datasheets/Arm%20Cortex-M3%20Processor%20Datasheet.pdf), 그리고 실제 SoC TRM에서 확인해야 합니다.

![ETM vs PTM — Hardware Trace Unit 비교](/images/blog/perf-eng/diagrams/part5-06-etm-ptm.svg)

CoreSight trace 구성은 코어 세대와 SoC 통합 옵션에 따라 다릅니다. Cortex-M0에는 ETM이 없고, Cortex-M0+는 구현에 따라 MTB를 제공할 수 있습니다. 일부 Cortex-M23/M33 구현은 ETM 등 trace block을 선택적으로 포함합니다. 실제 보드의 TRM와 feature list를 확인합니다.

ETM stream은 압축되어 있어 disassembly와 합쳐야 사람이 읽을 수 있습니다. Lauterbach나 ARM DS가 이 reconstruct를 자동으로 합니다.

## RTOS Awareness

지원 RTOS — FreeRTOS, ThreadX, Zephyr, AUTOSAR OS, QNX, INTEGRITY.

TRACE32와 Arm Development Studio는 지원되는 RTOS·버전·symbol/debug 정보와 trace 설정이 갖춰진 경우 task 정보를 timeline에 결합할 수 있습니다. CPU 점유율과 ISR 흐름은 수집한 trace에서 분석할 수 있지만, mutex 대기 시간에는 RTOS 이벤트·상태 정보가 필요하며 ETM만으로 자동 복원된다고 볼 수 없습니다.

Instruction flow·context ID·RTOS switch 정보의 출처를 구분해야 합니다. 누락된 task switch·buffer overflow가 있으면 timeline의 빈 구간을 idle로 판정하지 않습니다.

## Code Coverage와 인증

Coverage report를 사용하려면 실제 metric(statement·branch·MC/DC 등), source/object mapping, 누락된 trace, tool qualification과 적용 표준·등급의 요구를 확인합니다. Hardware trace가 있다는 사실만으로 인증을 통과하거나 MC/DC가 자동 산출되는 것은 아닙니다. 이 장에서는 인증 표준 전문·실제 coverage·qualification 자료를 검증하지 않았으며, 이전 가상 percentage 표와 확인하지 않은 command를 제거했습니다.

## 가격대와 라이센스

| 제품 | 선택 시 확인할 항목 |
|---|---|
| Arm Development Studio / DSTREAM | core trace 지원, capture interface, 필요한 license |
| Lauterbach TRACE32 | debug probe, trace probe, target adapter, license 구성 |

가격과 package 구성은 vendor·지역·시점에 따라 달라져 여기서는 수치 비교를 하지 않습니다.

구매 판단은 target 호환성, 필요한 trace 기능, vendor 지원, 개발·검증 비용을 기준으로 하며, trace 도구만으로 인증 결과를 보장하지 않습니다.

## 시나리오 — 자동차 ECU의 ISR 지연 측정

실제 프로젝트가 정의한 ISR deadline을 입력으로 두고 source/binary·clock·interrupt priority·trace 설정·sink/probe를 기록합니다. Entry/exit breakpoint로 코어를 멈추는 실험을 원래의 비침습 ISR latency 측정과 같다고 쓰지 않습니다.

Trace timestamp가 ISR의 어느 경계를 나타내는지, 외부 event와 동기화됐는지, 누락·overflow가 없는지 확인합니다. 관찰한 최대값은 시험 조건의 표본 최대이며 WCET의 증명이 아닙니다. 이 작업에서는 CAN waveform·trace·지연 결과를 얻지 않았습니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Trace port 핀이 출력되지 않은 보드

Off-chip parallel trace에는 해당 pin routing이 필요하지만 on-chip buffer나 다른 trace interface는 조건이 다릅니다. Parallel trace pin이 없다는 이유만으로 모든 hardware trace가 불가능하다고 단정하지 않습니다. 양산 보드에서 제거하더라도 개발 보드에는 반드시 빼두어야 합니다.

> ⚠️ Trace buffer overflow

Trace가 지속적으로 생성되면 capture buffer가 차는 시점을 추적해야 합니다. 실제 capture 길이는 target의 trace rate, filtering, compression, probe buffer와 host transfer 설정으로 계산합니다.

긴 시나리오는 cycle accurate를 끄거나 filter로 특정 함수만 trace합니다.

> ⚠️ Cortex-M0에서 ETM 기대

Cortex-M0에는 ETM이 없습니다. Cortex-M0+의 MTB 여부와 크기는 구현에 따라 확인하고, 다른 Cortex-M core에서도 ETM은 SoC의 실제 integration option을 확인합니다.

> ⚠️ Streamline gator daemon overhead 무시

gator daemon의 CPU·memory 비용은 target 설정, sampling rate, 수집 event에 따라 달라지므로 실제 구성에서 측정합니다.

Linux Streamline은 PMU, software instrumentation, OS data 등 여러 source를 함께 수집할 수 있습니다. ETM을 포함하더라도 전체 capture 영향은 설정과 workload에서 확인합니다.

## 정리

- ETM과 PTM은 지원되는 ARM 코어에서 소프트웨어 계측 부담을 줄이는 hardware trace 경로를 제공합니다.
- Arm Development Studio는 지원되는 Linux 및 bare-metal workflow를 제공하며, target별 기능을 확인합니다.
- TRACE32의 PRACTICE·debug·trace·OS-awareness를 실제 release·target 조합으로 확인합니다.
- 지원되는 RTOS와 symbol 정보가 맞으면 OS-awareness 기능으로 task와 ISR 정보를 timeline에 결합할 수 있습니다.
- ETM trace는 요구 표준·등급과 검증된 수집 절차에 따라 coverage 증거의 한 방법이 될 수 있습니다.
- PCB 설계에서는 trace pin, buffer, clock, probe 호환성을 사전에 확인합니다.

다음 편은 **Bare-metal 프로파일링** — 더 작은 시스템의 GPIO와 DWT.

## 관련 항목

- [5-05: Flamegraph 분석](/blog/embedded/performance-engineering/part5-05-flamegraph)
- [5-07: Bare-metal 프로파일링](/blog/embedded/performance-engineering/part5-07-baremetal-profiling)
- [Practical RTOS Internals 2-11: Tracing·Observability](/blog/embedded/rtos/practical-internals/part2-11-tracing-observability)
- [Embedded Debugging: JTAG·SWD·CoreSight](/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight) — ETM이 붙어 있는 CoreSight 디버그 회로 구조
