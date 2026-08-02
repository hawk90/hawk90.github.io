---
title: "Ch 5: 설계 — Software Architecture·Partitioning·Coupling"
date: 2026-05-18T05:00:00
description: "DO-178C design process. SW architecture, ARINC-653 partitioning, coupling·cohesion."
series: "Developing Safety-Critical Software"
seriesOrder: 5
tags: [avionics, do-178c, design, architecture, partitioning]
draft: true
topics: ["embedded", "embedded/avionics"]
---

## 한 줄 요약

> **"Safety-critical SW Design = LLR + Architecture + Partitioning"** — fault isolation 우선.

## SW Architecture in DO-178C

HLR → SW Architecture (high-level) → LLR → Code.

**Architecture content**:

- Module decomposition
- Interfaces (between modules)
- Data flow
- Control flow
- State machine
- Hierarchy
- Threading model
- Memory layout

Architecture = *HLR과 LLR 사이 bridge*.

## Module Cohesion·Coupling

**Cohesion (응집도)** — 높을수록 좋음:

- Single responsibility per module
- Related functionality grouped

**Coupling (결합도)** — 낮을수록 좋음:

- Module 간 dependency 최소
- Interface 명확
- Data·control 분리

**Bad pattern (high coupling)**:

- Module A가 Module B의 internal state 직접 access
- Global state mutation
- Pointer 공유

DO-178C — *low coupling 권장*. *fault containment*.

## ARINC-653 Partitioning

**ARINC-653 (APEX)**:

- **Time partition** — 각 partition별 *time slot*
- **Space partition** — 각 partition별 *별도 memory*
- **Communication** — message-based (queueing·sampling port)

**Use case** — Mixed-DAL applications. Level A flight control + Level C navigation 같은 SoC → 각 *별도 partition*.

**Hypervisor·OS** — PikeOS, LynxOS-178, VxWorks 653, INTEGRITY-178.

Boeing 787·A380·F-35 등 채택. Mixed-DAL 인증의 핵심.

## Partition Communication

**Queueing Port**:

- FIFO message
- Sender·receiver 1:1
- Reliable

**Sampling Port**:

- Latest value
- Sender·receiver N:M
- Overwrite (no FIFO)

**Health monitor** — Partition failure → 다른 partition 영향 0. Restart·isolate·log.

Air-to-ground (sampling) vs Engine-to-display (sampling/queue).

## Threading·Concurrency

**DO-178C 인증 시**:

- Task·priority 명시
- Semaphore·mutex 사용 결정 documented
- Race condition 분석
- Deadlock 분석
- Priority inversion mitigation

**ARINC-653·POSIX 일부**:

- Bounded priority inversion
- Mutex with PI
- No dynamic threading

Static threading 표준. Runtime task create 금지.

## Memory Architecture

**Memory regions**:

- Code (text)
- Constants (rodata)
- Initialized data (data)
- Uninitialized data (bss)
- Stack (per task)
- Heap (optional, 보통 회피)
- MMIO·DMA buffers

**Constraint**:

- Static allocation 권장
- Dynamic 시 *bounded·predictable*
- No fragmentation
- Memory pool 표준

DO-178C — *worst-case memory usage 증명*.

## State Machine Documentation

**SW state machines**:

- States·transitions·events·actions
- Reachability analysis
- Unreachable state — must be reviewed

UML state chart 또는 specification language:

- SCXML
- Simulink Stateflow
- SDL
- 자체 notation

각 *state·transition* trace·test.

## Data Coupling vs Control Coupling

- **Data coupling** (good) — Module이 *data만* 전달. Pure function·input·output.
- **Stamp coupling** — Struct 전달, 일부만 사용.
- **Control coupling** — Flag·boolean으로 *동작 결정*. Switch·callback.
- **Common coupling** (bad) — Global variable 공유.
- **Content coupling** (worst) — Module이 *다른 module의 internal* 변경.

좋은 design — *data coupling 위주*.

## Coverage Analysis at Design

**Data coupling analysis** — 각 module 간 *data flow trace*. Unused data 검출.

**Control coupling analysis** — 각 control transfer trace. Unreachable code 검출.

이미 DO-178C Level A·B objective.

DO-178C — *data·control coupling traceable*.

## Architecture Tools

**Modeling**:

- IBM Rhapsody (UML·SysML)
- Enterprise Architect
- Cameo Systems Modeler
- Capella (open source)

**Code generation**:

- Simulink·SCADE (MBD)
- Rhapsody (UML → C·C++)

**Korea (방사청·KARI)** — Rhapsody·Enterprise Architect 일부, 자체 internal documentation.

## Architecture Review

**Review checklist**:

- [ ] Each HLR addressed by module
- [ ] Modules cohesive
- [ ] Coupling minimal
- [ ] Threading documented
- [ ] Memory layout documented
- [ ] State machines complete
- [ ] Interfaces specified
- [ ] Performance·deadline analysis
- [ ] Trace to HLR
- [ ] Derived requirements identified

Architecture review — *전체 system 설계 quality 결정*.

## Korean Application

**방사청 SW 신뢰성시험**:

- Architecture documentation (KISA·STA가 review)
- Partitioning 권장
- MISRA·CERT C 준수

**KARI**:

- Mission별 architecture (KOMPSAT·KSLV)
- Partitioning 옵션
- 자체 review process

## 자주 하는 실수

> ⚠️ Architecture 후 design 시작

HLR → Code 바로 → Architecture missing → trace 불가.

→ HLR → Architecture → LLR → Code.

> ⚠️ Mixed-DAL without partitioning

Level A + Level C SW 같은 partition → 둘 다 Level A 부담.

→ ARINC-653 partition.

> ⚠️ Coupling 무시

Global state mutation everywhere → fault contained 불가.

→ low coupling.

## 정리

- DO-178C design = **Architecture + LLR**.
- **ARINC-653 partitioning** — Mixed-DAL.
- **Low coupling + high cohesion** — fault containment.
- Static threading·memory 권장.
- Architecture review — *전체 design quality*.

다음 편은 **Coding Standards**.

## 관련 항목

- [Ch 4: Requirements](/blog/embedded/avionics/developing-safety-critical/chapter04-requirements)
- [Ch 6: Coding Standards](/blog/embedded/avionics/developing-safety-critical/chapter06-coding-standards)
