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

> **"ARM DS와 Lauterbach TRACE32는 ETM·PTM이 내보내는 hardware trace를 받아 프로그램 흐름을 복원하는 도구입니다."** 다만 어떤 코어에 어떤 trace block이 붙는지, trace가 data까지 담는지는 코어 세대마다 다르고 벤더 문서에 표로 정리되어 있습니다.

## 어떤 문제를 푸는가

Linux perf의 sampling은 일정 간격으로 PC를 찍는 방식이라 그 사이에 끝난 짧은 spike를 놓치고, ftrace의 function tracing은 계측 코드가 실행되면서 타이밍을 바꿉니다. Cortex-M 같은 RTOS·bare-metal 환경에는 perf 자체가 없습니다. 비유하면 sampling은 5초마다 찍는 CCTV 스냅샷이고, hardware trace는 모든 갈림길에서 어느 쪽으로 갔는지를 적어 두는 블랙박스입니다.

ETM(Embedded Trace Macrocell)과 PTM(Program Trace Macrocell)은 코어 옆에 붙은 하드웨어 블록입니다. 명령마다 주소를 내보내지 않고 분기 결과 같은 최소 정보만 압축해서 내보내고, 도구가 그 정보와 실제 binary의 disassembly를 합쳐 실행 경로를 다시 만듭니다. [Lauterbach "Training Arm CoreSight ETM Tracing"](https://www2.lauterbach.com/pdf/training_arm_etm.pdf)(Release 09.2024) 표의 "bits per instruction" 열이 이 압축률입니다. CoreSight ETMv3는 명령당 약 1.2 bit, PTM과 Cortex-A3x/A5x/A7x의 ETMv4는 약 0.3 bit입니다. 같은 문서는 이 값이 data trace·cycle count 없이 program flow만 낸 경우의 Arm 공표값이라고 밝힙니다.

수집 경로는 두 가지입니다. 같은 문서는 trace를 칩 안의 메모리(ETB·ETF·ETR)에 담는 "onchip trace"와, TPIU를 거쳐 최대 40개 핀의 parallel trace port(일부 Cortex-A·R은 HSSTP serial port)로 외부 장비에 내보내는 "offchip trace"를 구분합니다.

> **메모** 이 글은 상용 도구·probe·실제 target을 실행하지 않았습니다. 아래 내용은 모두 본문에 링크한 Arm·Lauterbach 문서에서 확인한 것이고, 출력 예시는 싣지 않았습니다.

## ARM Development Studio와 Streamline

ARM이 직접 제공하는 IDE는 ARM Development Studio(DS)이며, 그 안에 Streamline Performance Analyzer가 포함됩니다.

![ARM Development Studio 구성](/images/blog/perf-eng/diagrams/part5-06-arm-ds-structure.svg)

Streamline이 데이터를 모으는 agent는 OS 유무에 따라 다릅니다. [Arm gator source](https://github.com/ARM-software/gator)는 Linux/Android용 `gatord`이고, bare-metal에는 **Barman**을 씁니다. [Arm Streamline Target Setup Guide for Bare-metal Applications](https://documentation-service.arm.com/static/5f4f6c97ca7b6a3399378218)(101815_0704_00_en, Version 7.4) 2.1절의 설명은 다음과 같습니다.

- Barman은 Streamline의 생성 도구가 만들어 주는 `barman.c`·`barman.h` 두 파일이고, 펌웨어에 같이 빌드합니다.
- 펌웨어가 런타임에 Barman을 초기화하고, 수집 루틴을 주기적으로 호출해야 합니다. 곧 Barman은 *소프트웨어 계측*입니다.
- 수집 대상은 Cortex-A·R의 PMU counter, 샘플링한 PC, 사용자 정의 counter입니다.
- 지원 아키텍처는 Armv7-A/R/M, Armv8-A(AArch32·AArch64), Armv8-R, Armv8-M입니다.
- Arm은 보안 감사 없이 Barman을 출시 제품에 넣지 말라고 경고합니다.

2.2절은 저장 방식을 다섯 가지로 나눕니다. Linear RAM buffer는 버퍼가 차면 수집을 멈춰 데이터를 잃지 않고, Circular RAM buffer는 가장 오래된 데이터를 덮어씁니다. 나머지 셋은 STM·ITM·ETM 인터페이스로 내보낸 trace를 DSTREAM 같은 장비로 받은 뒤 host 디렉터리에 덤프해 Streamline으로 가져오는 방식입니다. 그러니 bare-metal에서 ETM만 켠다고 Linux `gatord` capture와 같은 결과가 나오지 않습니다. ETM 경로를 쓰더라도 Barman이 펌웨어에 들어가 있어야 합니다.

## DSTREAM·DSTREAM-PT Debug Probe

JTAG/SWD는 코어를 멈추고 레지스터를 읽는 debug control 경로이고, ETM/PTM trace는 TPIU를 통한 별도의 trace output 경로입니다. probe는 두 경로를 한 상자에 담습니다. [Arm DSTREAM-PT 제품 페이지](https://www.arm.com/products/development-tools/debug-probes/dstream-pt)가 밝히는 사양은 다음과 같습니다.

| 항목 | DSTREAM-PT 공개 사양 |
|---|---|
| Trace port | 32-bit parallel, 최대 19.2 Gbps |
| On-probe trace store | 8 GB |
| Debug clock | JTAG 최대 180 MHz, SWD 최대 125 MHz |
| Host 연결 | Gigabit Ethernet 또는 USB 3.0 |

HSSTP serial trace는 이 제품이 아니라 별도 모델인 [DSTREAM-HT](https://www.arm.com/products/development-tools/debug-probes/dstream-ht)의 기능입니다. 8 GB store가 실제로 몇 초 분량인지는 trace 생성률로 정해지므로, 아래 "Trace buffer overflow" 절의 계산식을 씁니다.

## Lauterbach TRACE32

[TRACE32 Arm 지원 안내](https://www.lauterbach.com/supported-platforms/architectures/arm)는 debug·on-chip/off-chip trace·OS awareness를 구분합니다. 제품 구성은 다음과 같습니다.

- **TRACE32 PowerView** — GUI
- **TRACE32 PowerDebug** — debug probe (JTAG·SWD 연결)
- **TRACE32 PowerTrace** — off-chip trace capture 장비. 지원 페이지는 trace buffer가 최대 8 GByte라고 적습니다.
- **CombiProbe·µTrace** — debug와 trace를 한 장비에 묶은 소형 제품

PRACTICE 스크립트(`.cmm`)로 설정을 자동화합니다. 아래 명령은 모두 Lauterbach ETM training 매뉴얼에 나오는 것입니다. `Trace.Mode Fifo`는 기본 모드로 trace memory가 차면 가장 오래된 기록을 덮어쓰고, `Trace.Mode Stack`은 memory가 차는 순간 기록을 멈춥니다. Cycle accurate mode는 core clock을 알려 줘야 시간으로 환산됩니다(매뉴얼의 Cortex-A9 예).

```text
ETM.TImeMode CycleAccurate    ; enable cycle accurate mode
Trace.CLOCK 800.MHZ           ; inform TRACE32 about your core clock frequency
Trace.Mode Fifo               ; default: newest overwrites oldest
Trace.List                    ; display the trace listing
```

매뉴얼은 녹화 중 clock이 바뀌는 경우를 별도 절로 다룹니다. DVFS가 켜진 target에서 `Trace.CLOCK` 하나만 주면 시간 환산이 틀립니다.

## ETM과 PTM — 무엇을 trace하는가

![ETM vs PTM — Hardware Trace Unit 비교](/images/blog/perf-eng/diagrams/part5-06-etm-ptm.svg)

Lauterbach ETM training의 코어별 표를 옮기면 다음과 같습니다.

| 코어 | Trace | Data address/value | Context ID | Cycle count | bit/명령 |
|---|---|---|---|---|---|
| Cortex-M3/M4/M23 | CoreSight ETMv3 | DWT로 | — | — | 약 1.20 |
| Cortex-M7/M33 | ETMv4 | DWT로 | — | 있음 | 약 0.35 |
| Cortex-R4/R5 | CoreSight ETMv3 | 있음 | 있음 | 있음 | 약 1.20 |
| Cortex-R7/R8/R52 | ETMv4 | 있음 | 있음 | 있음 | 약 0.40 |
| Cortex-A9/A15/A17 | PTM | 없음 | 있음 | 있음 | 약 0.30 |
| Cortex-A3x/A5x/A7x | ETMv4 | 없음 | 있음 | 있음 | 약 0.30 |

PTM은 같은 매뉴얼에서 "data trace를 전혀 제공하지 않는다"고 적혀 있고, Cortex-A9·A15·A17에서만 쓰입니다. PTM이 내보내는 것은 *waypoint*입니다. 간접 분기의 목적지와 조건 코드, 직접 분기의 조건 코드, 예외, 명령어 세트·보안 상태 변경, Context ID 변경, 실행 시작·정지가 그 목록입니다. 선택적으로 waypoint 사이 cycle count와 global timestamp를 붙일 수 있습니다. 직접 분기는 목적지를 binary에서 알 수 있으니 조건 결과만 보내면 되고, 그래서 도구가 반드시 같은 binary를 가지고 있어야 복원이 됩니다.

Cortex-M 쪽은 trace block이 모두 *선택 사항*입니다. [Lauterbach "Training Cortex-M Tracing"](https://www2.lauterbach.com/pdf/training_cortexm_etm.pdf)(Release 02.2026) 표에 따르면 Cortex-M0와 M1은 "No trace options"이고, M0+는 MTB와 제한된 DWT가 선택 사항입니다. M3/M4는 ITM·DWT·ETMv3, M7은 ITM·DWT·ETMv4가 선택 사항입니다. M23은 ETMv3와 MTB가 상호 배타적이고, M33은 한 칩에 MTB와 ETM을 함께 넣을 수 있습니다. 같은 코어 이름이어도 칩 벤더가 어느 블록을 넣었는지는 그 칩의 reference manual이 정합니다.

MTB(Micro Trace Buffer)는 [CoreSight MTB-M0+ TRM](https://documentation-service.arm.com/static/5e9065e1c8052b160876034f)(ARM DDI 0486B) 1.1절이 "ETM·PTM trace 솔루션과 경쟁하려는 것이 아닌" 단순한 실행 trace라고 소개합니다. 같은 문서 1.3절(Features)에 따르면 MTB SRAM 크기는 칩 구현 시점에 정해지고, 그 SRAM은 trace와 일반 저장에 같이 쓰이며, SRAM 안의 trace buffer 위치와 크기는 소프트웨어로 정합니다. Lauterbach Cortex-M training은 trace 영역의 위치와 크기를 소프트웨어로 정하므로 개발 빌드가 끝나면 그 RAM을 되돌려 쓸 수 있다고 설명합니다. 또 MTB 영역은 보통 linker script에서 별도 섹션(`.mtb`)으로 두고, TRACE32가 `Trace.TBADDRESS ADDRESS.OFFSET(sYmbol.SECADDRESS(.mtb))`로 그 주소를 찾게 합니다.

## RTOS Awareness

Lauterbach는 RTOS별 "OS Awareness Manual"을 따로 냅니다. 이 글에서 확인한 것은 [FreeRTOS](https://www2.lauterbach.com/pdf/rtos_freertos.pdf), [Zephyr](https://www2.lauterbach.com/pdf/rtos_zephyr.pdf), [ThreadX](https://www2.lauterbach.com/pdf/rtos_threadx.pdf), [QNX](https://www2.lauterbach.com/pdf/rtos_qnx.pdf), [OSEK/ORTI](https://www2.lauterbach.com/pdf/rtos_orti.pdf) 매뉴얼입니다(모두 Release 02.2026). FreeRTOS 매뉴얼은 지원 범위를 "FreeRTOS V4.x to V11.x"(Arm 포함), "SafeRTOS V5.x to V9.x"로 적습니다.

여기서 중요한 함정은 *program flow trace만으로는 task 통계가 나오지 않는다*는 점입니다. FreeRTOS 매뉴얼의 "Task Runtime Statistics" 절은 이 기능이 task switch를 trace할 수 있을 때만 동작한다고 하고, 괄호로 "program flow trace is not sufficient"라고 못 박습니다. 필요한 것은 task 정보를 내보내는 on-chip trace(예: data trace) 또는 TRACE32의 소프트웨어 trace(FDX·LOGGER)로 보내는 계측입니다. Arm에서는 RTOS가 task switch 때 Context ID 레지스터를 갱신하면 `ETM.ContextID 32`로 그 값을 trace에 싣는 방법이 매뉴얼에 나옵니다. 조건이 갖춰지면 다음 명령으로 task별 시간을 봅니다.

```text
Trace.List List.TASK DEFault   ; trace buffer and task switches
Trace.STATistic.TASK           ; task runtime statistic
Trace.Chart.TASK               ; task runtime timechart
```

같은 절은 녹화 시작 직후 어떤 task가 돌고 있었는지 모르는 구간을 "(unknown)"으로 계산한다고 적습니다. 또 FreeRTOS의 task *상태*(ready·blocked 등) 추적은 trace만으로 안 되고 AUTOSAR ARTI 기반 계측으로만 지원된다고 밝힙니다. 그러니 mutex 대기 시간 같은 상태 정보는 ETM에서 자동으로 나오지 않습니다.

## Code Coverage와 인증

Trace 기반 coverage는 계측 코드 없이 "어느 명령이 실행됐는가"를 모읍니다. [Lauterbach "Application Note for Trace-Based Code Coverage"](https://www2.lauterbach.com/pdf/app_code_coverage.pdf)(Release 02.2026)는 이 방식의 전제를 두 가지로 적습니다. 코어가 program flow trace를 낼 수 있어야 하고, 측정은 object code 기준이라 source line은 object-source mapping으로 표시됩니다. 같은 문서는 그 mapping이 낮은 최적화에서 더 잘 맞아서 trace 기반 coverage를 "production code에서는 할 수 없다"고 명시합니다. 또 MC/DC·condition·decision coverage에는 개별 source line을 계측해야 할 수 있다고 적습니다. 곧 hardware trace가 있다고 MC/DC가 자동으로 나오지 않습니다.

ETM training은 coverage용 ETM 설정으로 `ETM.DataTrace off`를 권합니다. coverage에는 data 정보가 필요 없어서 trace port 대역을 아낄 수 있기 때문입니다. MMU로 프로세스를 나누는 OS에서는 같은 가상 주소가 프로세스마다 다른 함수이므로 Address Space ID까지 trace해야 한다고 덧붙입니다. Coverage 결과를 인증 증거로 쓸 때 필요한 tool qualification은 적용 표준이 정하는 일이고, 이 글에서는 표준 원문을 확인하지 않았으므로 다루지 않습니다.

## 가격대와 라이센스

Arm과 Lauterbach는 이 글에서 확인한 공식 페이지에 가격을 공개하지 않습니다. 그래서 가격 비교는 하지 않고, 선택할 때 위 문서들로 대조할 항목만 정리합니다.

| 제품 | 대조할 항목 | 근거 문서 |
|---|---|---|
| Arm DS / DSTREAM-PT | trace port 폭, on-probe store, bare-metal이면 Barman 통합 | DSTREAM-PT 제품 페이지, Streamline bare-metal guide |
| Lauterbach TRACE32 | 코어의 ETM 버전, onchip/offchip 경로, RTOS awareness 매뉴얼 유무 | ETM training, OS Awareness Manual |

## 시나리오 — 자동차 ECU의 ISR 지연 측정

Cortex-R5 기반 ECU에서 CAN 수신 ISR의 지연을 본다고 해 봅시다. 위 표에서 Cortex-R5는 CoreSight ETMv3로 data trace·Context ID·cycle count를 모두 낼 수 있는 코어입니다. 순서는 다음과 같습니다.

1. ETM에서 cycle accurate를 켜고 `Trace.CLOCK`에 실제 core clock을 줍니다. DVFS가 있으면 clock 변경을 같이 기록합니다.
2. Program flow만으로 ISR 진입·탈출이 보이므로 data trace는 끕니다. ETMv3는 FIFO가 넘칠 것 같으면 data 정보를 *표시 없이* 버린다고 ETM training이 적고 있어서, data trace를 켜 두면 빠진 줄 모르는 구멍이 생깁니다.
3. `Trace.Mode Stack`으로 ISR이 반복되는 처음 구간을 채우고, 넘침이 없었는지 확인합니다. FIFO가 넘치면 ETM은 "Trace restarted after FIFO overflow"를 기록하고 다음 명령의 전체 주소를 다시 보냅니다.

Entry/exit breakpoint로 코어를 멈추는 실험은 이 측정과 다릅니다. 멈추는 순간 타이밍이 바뀌기 때문입니다. 관찰한 최대값은 시험 조건에서의 표본 최대이지 WCET 증명이 아닙니다.

## 자주 보는 함정과 안티패턴

> ⚠️ Trace port 핀이 출력되지 않은 보드

Off-chip parallel trace는 TPIU 핀이 커넥터까지 배선되어 있어야 합니다. 핀이 없어도 ETB·ETF·ETR 같은 on-chip buffer나 Cortex-M의 MTB로는 trace를 받을 수 있습니다. 담을 수 있는 길이는 그 칩이 구현한 buffer 크기가 정하므로 칩 reference manual에서 크기부터 봅니다.

> ⚠️ Trace buffer overflow

필요한 capture 용량은 (명령 처리율) × (bit/명령) × (녹화 시간)으로 어림합니다. 예를 들어 1초에 10억 명령을 실행하는 코어가 PTM 공표값 0.3 bit/명령으로 trace를 내면 초당 0.3 Gbit, 곧 37.5 MB입니다. 이 경우 DSTREAM-PT의 8 GB store는 계산상 약 213초 분량입니다. 다만 0.3 bit는 data trace·cycle count를 끈 program flow 기준이라, cycle accurate를 켜면 이보다 빨리 찹니다. 긴 시나리오는 cycle accurate를 끄거나 TRACE32의 STREAM 모드로 host 디스크에 바로 흘립니다.

> ⚠️ Cortex-M0에서 ETM 기대

Cortex-M0와 M1에는 trace 옵션이 아예 없습니다. M0+는 MTB가 선택 사항이므로 칩 reference manual에서 MTB가 들어 있는지부터 봅니다.

> ⚠️ PTM 코어에서 변수 값 추적 기대

Cortex-A9·A15·A17의 PTM은 data address도 data value도 내보내지 않습니다. 변수 값 변화를 보려면 watchpoint나 소프트웨어 계측을 따로 써야 합니다.

> ⚠️ Barman을 출시 펌웨어에 남겨 두기

Streamline bare-metal guide는 Barman을 개발 환경 전용으로 규정하고, 보안 감사 없이 출시 제품에 넣지 말라고 경고합니다.

## 정리

- ETM과 PTM은 분기 결과 같은 최소 정보만 내보내고, 도구가 binary와 합쳐 실행 경로를 복원합니다. Lauterbach 표 기준으로 ETMv3는 명령당 약 1.2 bit, PTM과 Cortex-A의 ETMv4는 약 0.3 bit입니다.
- PTM(Cortex-A9/A15/A17)은 data trace가 없고, Cortex-M3/M4/M7/M33의 data trace는 DWT가 맡습니다.
- Cortex-M0·M1에는 trace 옵션이 없고, M0+는 MTB가 선택 사항입니다.
- Bare-metal Streamline은 Barman이라는 소프트웨어 agent를 펌웨어에 넣어야 하며, 출시 제품용이 아닙니다.
- TRACE32의 task 통계는 program flow trace만으로 나오지 않고, Context ID나 data trace·소프트웨어 trace로 task switch를 기록해야 합니다.
- Trace 기반 coverage는 object code 기준이고, production 최적화 빌드에는 쓸 수 없다고 Lauterbach 문서가 명시합니다.

다음 편은 **Bare-metal 프로파일링** — 더 작은 시스템의 GPIO와 DWT.

## 관련 항목

- [5-05: Flamegraph 분석](/blog/embedded/performance-engineering/part5-05-flamegraph)
- [5-07: Bare-metal 프로파일링](/blog/embedded/performance-engineering/part5-07-baremetal-profiling)
- [Practical RTOS Internals 2-11: Tracing·Observability](/blog/embedded/rtos/practical-internals/part2-11-tracing-observability)
- [Embedded Debugging: JTAG·SWD·CoreSight](/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight) — ETM이 붙어 있는 CoreSight 디버그 회로 구조
