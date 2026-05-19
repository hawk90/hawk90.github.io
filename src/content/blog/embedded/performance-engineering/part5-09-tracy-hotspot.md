---
title: "5-09: Tracy·Hotspot·uftrace — Modern Low-Overhead Profilers"
date: 2026-05-08T28:00:00
description: "Tracy ns-instrumentation, Hotspot perf GUI, uftrace function trace, Coz causal."
series: "Embedded Performance Engineering"
seriesOrder: 51
tags: [profiling, tracy, hotspot, uftrace, coz, low-overhead]
draft: true
---

## 한 줄 요약

> **"Modern profiler = ns 정확도 + 적은 overhead + 좋은 GUI"** — Tracy·Hotspot·uftrace.

## Tracy Profiler

```text
Wolfpld/tracy — open source, ns-accurate instrumentation
  - 게임 엔진·실시간 graphics
  - C++·C·Rust binding
  - Frame-by-frame analysis
  - Lock·memory·GPU 통합
  - Cross-platform (Win·Mac·Linux·Android)
```

```cpp
#include "Tracy.hpp"

void render_frame(void) {
    ZoneScoped;   /* automatic scope range */
    
    {
        ZoneScopedN("Update");
        update_objects();
    }
    {
        ZoneScopedN("Draw");
        draw_scene();
    }
    
    FrameMark;   /* end of frame */
}
```

매 zone은 *수 ns overhead*. 1M zone/sec 가능.

## Tracy GUI

```text
Timeline:
  Frame 1: [Update]──[Draw]──[Present]   16.7 ms
  Frame 2: [Update]──[Draw]──[Present]   17.2 ms
  Frame 3: [Update]──[Draw]──[Present]   33.1 ms  ← spike
  
Detail:
  Frame 3 Draw — 18 ms
    └ DrawCalls — 16 ms
        └ shader compile — 12 ms   ← cause
```

Spike의 *원인까지 drill-down*. 게임 60 fps 유지의 표준.

## Tracy GPU Support

```cpp
#include "TracyVulkan.hpp"

TracyVkCollect(ctx, cmdbuf);   /* GPU timestamp */
```

Vulkan·OpenGL·DirectX·Metal — 모두 지원. GPU + CPU timeline 합쳐.

## KDAB Hotspot — Linux perf GUI

```bash
sudo apt install hotspot   # or build from source

# perf.data 열기
hotspot perf.data
```

```text
View modes:
  - Summary — top function·event counts
  - Flame Graph — interactive
  - Caller/Callee — tree view
  - Top Down·Bottom Up — call hierarchy
  - Disassembly — annotated asm
  - Timeline — sched_switch trace
```

`perf report` console version의 *훨씬 친절한 GUI*.

## uftrace — Function Trace

```bash
# Compile with -pg
gcc -pg -O2 source.c -o prog

# Trace
uftrace ./prog

# Output:
# # DURATION    TID     FUNCTION
#    14.234 us [12345] | main() {
#     5.123 us [12345] |   parse_args() {
#     1.234 us [12345] |     strdup();
#                       |   } /* parse_args */
#     8.901 us [12345] |   process();
#                       | } /* main */
```

함수 진입/종료 *모두 캡쳐* — sampling 아닌 *exact*. -pg overhead ~30%.

## uftrace 시각화

```bash
uftrace record ./prog
uftrace replay
uftrace report --avg-self   # 함수별 avg time
uftrace tui                 # 터미널 GUI
uftrace dump --chrome > trace.json   # Chrome timeline
```

Chrome timeline (chrome://tracing) — *interactive zoom*.

## Coz — Causal Profiler

Coz (Curtsinger·Berger 2015):

```text
Traditional profiler — "이 함수가 50% 시간"
Coz — "이 함수를 *10% 빠르게 하면* 전체 *얼마 빨라지나*?"
```

```bash
sudo apt install coz-profiler

coz run ./prog
coz plot   # speedup curve
```

What-if analysis — *최적화 효과 사전 예측*.

## perf vs Tracy 비교

| 항목 | perf | Tracy |
|---|---|---|
| Sampling | ✓ | × (instrumentation only) |
| Instrumentation | tracepoint 의존 | 매 zone 명시 |
| Frame analysis | 약함 | **강함** (FrameMark) |
| GPU | × | ✓ |
| Overhead | 1-5% | ~10 ns/zone |
| GUI | report 콘솔 / Hotspot | Tracy 내장 |
| 사용처 | Linux server | 게임·실시간 |

## Apple Instruments

```bash
# macOS·iOS profiler
instruments -t "Time Profiler" -D out.trace ./prog
```

GUI — *flame chart + call tree*. SwiftUI animation·iOS app battery 분석.

자동차 인포테인먼트 (Mercedes MBUX, Apple CarPlay backend) — Instruments 활용.

## Linux PowerTOP·turbostat

```bash
sudo powertop
sudo turbostat ./prog
```

CPU 전력·C-state·frequency 측정. Tracy·perf와 *결합*.

## Tracealyzer for FreeRTOS

```c
#include "trcRecorder.h"
vTraceEnable(TRC_START);

/* 자동 trace — task switch, IRQ, queue, semaphore */
```

Percepio Tracealyzer GUI — RTOS-specific *task·event timeline*. 임베디드 표준.

## Embedded — Custom Tracer

```c
struct trace_event { uint32_t timestamp; uint16_t id; uint16_t data; };
struct trace_event ring[1024];
volatile uint32_t head;

#define TRACE(id, data) \
    do { \
        struct trace_event *e = &ring[head & 1023]; \
        e->timestamp = DWT->CYCCNT; \
        e->id = id; \
        e->data = data; \
        head++; \
    } while(0)

TRACE(TID_ENTER_ISR, 0);
ISR_body();
TRACE(TID_EXIT_ISR, 0);
```

매 trace ~50 cycle. RTT·flash로 dump 후 *host 분석*.

## Flamegraph + Hotspot

```bash
perf record -F 99 -g ./prog
perf script | stackcollapse-perf.pl | flamegraph.pl > flame.svg

# 또는 Hotspot — 자동
```

Flame graph + Hotspot — 가장 흔한 *Linux profiling stack*.

## VTune Self-Hosted Alternative

```bash
# Intel VTune Community — free
vtune -collect hotspots ./prog
vtune-gui   # GUI
```

Hotspot·Memory Access·Threading·Microarchitecture — *모든 분석 모드*. Intel CPU 한정 *최강*.

## 자주 하는 실수

> ⚠️ Production code에 Tracy zone

```cpp
ZoneScoped;   /* Release build에서도 활성 → overhead */
```

→ `#ifdef PROFILING` guard 또는 *production 비활성화*.

> ⚠️ uftrace 모든 함수

```c
gcc -pg ./prog   /* 모든 함수 trace — 큰 overhead */
```

→ `uftrace -F "main"` 등 *함수 필터*.

> ⚠️ Coz 결과 절대값으로 해석

```text
Coz가 "10% 빨라짐"이라 하면 — 평균
실제 실행은 *variance ±5%*
```

→ 여러 측정.

> ⚠️ Hotspot 큰 perf.data

```text
perf.data 1 GB → Hotspot load 10+ min
```

→ 짧은 record window.

## 정리

- **Tracy** = ns 정확 instrumentation, 게임·실시간.
- **Hotspot** = perf 결과의 좋은 GUI.
- **uftrace** = 함수 단위 trace (exact, not sampling).
- **Coz** = causal — what-if analysis.
- **Tracealyzer** = RTOS 전용.
- **Apple Instruments** = macOS·iOS.
- **VTune** = Intel CPU 최강.

다음 편은 **eBPF Continuous**.

## 관련 항목

- [5-08: Nsight Systems](/blog/embedded/performance-engineering/part5-08-nsight)
- [5-10: eBPF Continuous](/blog/embedded/performance-engineering/part5-10-ebpf-continuous)
