---
title: "2-01: CPU 파이프라인 — 5-stage·Cortex-M·Cortex-A 비교"
date: 2026-05-13T08:00:00
description: "Fetch·Decode·Execute·Memory·Writeback 5-stage. Cortex-M3/M4 3-stage, Cortex-A 8~15-stage 비교."
series: "Embedded Performance Engineering"
seriesOrder: 9
tags: [cpu, pipeline, cortex-m, cortex-a]
draft: true
---

## 한 줄 요약

> **"Pipeline = 명령어 병렬화"** — 한 사이클당 한 명령어 *완료* 목표.

## 5-Stage Classic Pipeline (MIPS R3000)

| Stage | 작업 |
|---|---|
| **F** (Fetch) | PC → memory 명령어 읽음 |
| **D** (Decode) | opcode 해독, register read |
| **E** (Execute) | ALU 연산 |
| **M** (Memory) | load/store 시 메모리 액세스 |
| **W** (Writeback) | register file 쓰기 |

```text
Time:    1    2    3    4    5    6    7    8
Inst1:  [F] [D] [E] [M] [W]
Inst2:       [F] [D] [E] [M] [W]
Inst3:            [F] [D] [E] [M] [W]
Inst4:                 [F] [D] [E] [M] [W]
```

이상적 — *매 cycle 1 명령 완료* (IPC = 1.0).

## Cortex-M0/M0+ — 2-Stage

```text
[Fetch] → [Execute (Decode+Execute+WB 통합)]
```

매우 단순 — 작은 die, 낮은 전력. 분기 시 *1 cycle 손실*.

## Cortex-M3/M4 — 3-Stage

```text
[Fetch] → [Decode] → [Execute (E+M+W 통합)]
```

```c
ldr r0, [r1]   ; F D E
add r2, r0, r3 ; F D E   ← r0 사용
```

`r0` 의존성 — load 결과가 *같은 cycle*에 ALU 전달 (forwarding). Stall 없이 진행.

## Cortex-M7 — 6-Stage Dual-Issue

```text
F1 → F2 → D → I → E1 → E2
```

- *F1·F2* — 분리된 fetch (캐시 line 단위)
- *D·I* — Decode + Issue (2 instruction 동시)
- *E1·E2* — ALU + 2nd ALU 또는 Load Store

Dual-issue → IPC > 1 가능 (이론 2.0).

## Cortex-A53 — 8-Stage In-Order

```text
F1 F2 F3 D1 D2 I E1 E2
```

In-order 발행 + dual-issue. 적당한 성능, 낮은 전력. Raspberry Pi 3B의 BCM2837.

## Cortex-A72 — 15-Stage Out-of-Order

```text
F1 F2 F3 F4 F5 D1 D2 D3 Dispatch [Issue Queue]
                              ↓
                       [Multiple Execution Units]
                              ↓
                          [Reorder Buffer]
                              ↓
                            Commit
```

- *5-stage fetch* — 깊은 branch prediction
- *Out-of-order issue* — 의존성 없는 명령 먼저
- *4-wide superscalar* — 동시 4 명령

성능 high, 전력 그만큼.

## Pipeline 길이 Trade-off

| 길이 | 장점 | 단점 |
|---|---|---|
| 짧음 (3) | Branch miss penalty 작음 | 클럭 속도 한계 |
| 중간 (8) | 균형 | — |
| 김 (15+) | 고클럭 가능 (1.5 GHz↑) | Mispredict penalty 큼 |

Pentium 4 — 31 stage → mispredict 시 *31 cycle 손실*. 실패한 디자인.

## Throughput vs Latency

```text
Without pipeline: 5 cycle per instruction × N = 5N cycle
With 5-stage pipe: 5 + (N-1) cycle = N + 4 cycle  (N≫1)
```

*N=1000* — pipeline 200x throughput. 그러나 *latency* (한 명령의 완료 시간)은 *동일 또는 길어짐*.

## Pipeline Hazard 3종

### 1. Structural Hazard

같은 hardware 자원 두 명령 동시 사용. 예 — 단일 memory port에 F·M 동시 액세스.

해결 — *Harvard architecture* (I-cache + D-cache 분리).

### 2. Data Hazard

```c
add r0, r1, r2  ; r0 = r1 + r2
sub r3, r0, r4  ; r0 사용 — 앞 명령 결과 필요
```

`add`의 W 단계가 끝나기 전에 `sub`이 r0 읽으려 함. 해결 — *forwarding* 또는 *stall*.

### 3. Control Hazard

```c
beq r0, r1, label  ; 분기 — 어디로 갈지 D 단계 후에야 알 수 있음
add r2, r3, r4     ; ← 미리 fetch했지만 분기 시 무효
```

해결 — *branch prediction* (다음 편).

## ARM Forwarding (Cortex-M4)

```c
ldr r0, [r1]   ; F D E   M  W (load 완료 = W)
mul r2, r0, r3 ; F D D' E   M  W   ← stall 1 cycle (load-use)
```

Load 결과는 *forwarding 불가* — 1 cycle bubble. 컴파일러가 *재정렬* 시도:

```c
ldr r0, [r1]   ; F D E   M  W
nop            ; bubble 채움 (또는 독립 명령)
mul r2, r0, r3
```

## 측정 — Cortex-M7 IPC

```c
DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;
uint32_t start = DWT->CYCCNT;
loop_kernel();
uint32_t cycles = DWT->CYCCNT - start;

uint32_t insts = count_instructions_in_loop();
float ipc = (float)insts / cycles;
```

목표 IPC:
- Cortex-M0: ~0.7
- Cortex-M3: ~0.9
- Cortex-M4: ~0.95
- Cortex-M7 (dual-issue): ~1.5
- Cortex-A72 (OoO): ~3.0

## SuperH vs ARM Pipeline 차이

| ARM | SuperH SH-2/4 |
|---|---|
| Load delay slot 묵시적 | Delay slot 명시 (branch 후 명령 항상 실행) |
| Conditional execution (Thumb-2) | 없음 |
| 32 register | 16 register |

옛 자동차 ECU의 SH-4는 *명시 delay slot* — 컴파일러가 명시적 처리.

## 자주 하는 실수

> ⚠️ Pipeline 깊이 ≠ 성능

Cortex-M7 6-stage가 Cortex-M3 3-stage보다 클럭당 *더 빠른 건 아님*. Dual-issue 활용 시만.

> ⚠️ NOP으로 stall 해결 시도

```c
ldr r0, [r1]
nop
nop
add r2, r0, r3
```

컴파일러가 *이미 더 잘 최적화*. 직접 NOP 삽입은 보통 *비최적*.

> ⚠️ 짧은 함수 = 빠름 가정

함수 호출 = *pipeline flush 가능성*. 인라인이 *더 빠름*. `inline`·LTO로 컴파일러 도움.

> ⚠️ Cycle 측정 오류

DWT CYCCNT는 *DMB·DSB 없이* 정확 측정 안 됨. *barrier 추가*:

```c
__DSB();
uint32_t start = DWT->CYCCNT;
/* code */
__DSB();
uint32_t end = DWT->CYCCNT;
```

## 정리

- Pipeline = **명령어 단계별 병렬** (F·D·E·M·W).
- Cortex-M0 2-stage, M3/M4 **3-stage**, M7 6-stage dual-issue.
- Cortex-A — 8~15-stage *out-of-order superscalar*.
- 3 hazard (structural·data·control) — forwarding·branch prediction으로 회피.
- Pipeline 깊이 trade-off — *길수록 클럭↑·mispredict 비용↑*.

다음 편은 **Pipeline Stall** — data dependency 디테일.

## 관련 항목

- [2-02: Pipeline Stall](/blog/embedded/performance-engineering/part2-02-pipeline-stall)
- [2-03: Branch Prediction](/blog/embedded/performance-engineering/part2-03-branch-prediction)
