---
title: "2-01: CPU 파이프라인 — 5-stage·Cortex-M·Cortex-A 비교"
date: 2026-05-08T08:00:00
description: "Fetch·Decode·Execute·Memory·Writeback의 5-stage 파이프라인을 봅니다. Cortex-M3/M4는 3-stage, Cortex-A는 8~15-stage입니다."
series: "Embedded Performance Engineering"
seriesOrder: 9
tags: [cpu, pipeline, cortex-m, cortex-a]
draft: false
---

## 한 줄 요약

> **Pipeline은 명령어 병렬화입니다.** 한 사이클당 한 명령어 *완료*가 목표입니다.

## 5-Stage Classic Pipeline (MIPS R3000)

| Stage | 작업 |
|---|---|
| **F** (Fetch) | PC가 가리키는 memory에서 명령어를 읽습니다 |
| **D** (Decode) | opcode를 해독하고 register를 read합니다 |
| **E** (Execute) | ALU 연산을 수행합니다 |
| **M** (Memory) | load/store 시 메모리에 액세스합니다 |
| **W** (Writeback) | register file에 결과를 씁니다 |

```text
Time:    1    2    3    4    5    6    7    8
Inst1:  [F] [D] [E] [M] [W]
Inst2:       [F] [D] [E] [M] [W]
Inst3:            [F] [D] [E] [M] [W]
Inst4:                 [F] [D] [E] [M] [W]
```

이상적으로는 *매 cycle마다 1 명령이 완료*됩니다 (IPC = 1.0).

실제로는 데이터 의존성 때문에 stall이 발생합니다. 다음은 RAW(Read-After-Write) hazard 하나로 뒤따르는 명령들이 한 cycle씩 밀리는 모습입니다.

![5-stage pipeline에 RAW hazard 하나가 들어왔을 때의 stall 전파](/images/blog/perf-eng/diagrams/part2-01-pipeline-stages.svg)

## Cortex-M0/M0+ — 2-Stage

```text
[Fetch] → [Execute (Decode+Execute+WB 통합)]
```

매우 단순한 구조라서 작은 die와 낮은 전력이 특징입니다. 분기 시 *1 cycle을 손실*합니다.

## Cortex-M3/M4 — 3-Stage

```text
[Fetch] → [Decode] → [Execute (E+M+W 통합)]
```

```c
ldr r0, [r1]   ; F D E
add r2, r0, r3 ; F D E   ← r0 사용
```

`r0` 의존성이 있지만 load 결과가 *같은 cycle*에 ALU로 전달됩니다 (forwarding). Stall 없이 진행됩니다.

## Cortex-M7 — 6-Stage Dual-Issue

```text
F1 → F2 → D → I → E1 → E2
```

- *F1·F2*는 분리된 fetch입니다 (캐시 line 단위).
- *D·I*는 Decode와 Issue를 합칩니다 (2 instruction 동시).
- *E1·E2*는 ALU와 2nd ALU 또는 Load Store입니다.

Dual-issue로 IPC > 1이 가능합니다 (이론적으로 2.0).

## Cortex-A53 — 8-Stage In-Order

```text
F1 F2 F3 D1 D2 I E1 E2
```

In-order 발행에 dual-issue를 더한 구조입니다. 적당한 성능과 낮은 전력이 특징이며, Raspberry Pi 3B의 BCM2837에 들어 있습니다.

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

- *5-stage fetch*로 깊은 branch prediction을 지원합니다.
- *Out-of-order issue*로 의존성이 없는 명령을 먼저 실행합니다.
- *4-wide superscalar*로 동시에 4 명령을 처리합니다.

성능이 높지만 전력 소모도 그만큼 큽니다.

## Pipeline 길이 Trade-off

| 길이 | 장점 | 단점 |
|---|---|---|
| 짧음 (3) | Branch miss penalty가 작습니다 | 클럭 속도 한계가 있습니다 |
| 중간 (8) | 균형이 잡힙니다 | — |
| 김 (15+) | 고클럭이 가능합니다 (1.5 GHz↑) | Mispredict penalty가 큽니다 |

Pentium 4는 31 stage였습니다. mispredict 시 *31 cycle을 손실*했고, 결국 실패한 디자인이 되었습니다.

## Throughput vs Latency

```text
Without pipeline: 5 cycle per instruction × N = 5N cycle
With 5-stage pipe: 5 + (N-1) cycle = N + 4 cycle  (N≫1)
```

*N=1000*이면 pipeline은 200x throughput을 냅니다. 다만 *latency* (한 명령의 완료 시간)는 *동일하거나 길어집니다*.

## Pipeline Hazard 3종

### 1. Structural Hazard

같은 hardware 자원을 두 명령이 동시에 사용하는 경우입니다. 예를 들어 단일 memory port에 F와 M이 동시 액세스하는 상황입니다.

해결책은 *Harvard architecture*입니다 (I-cache와 D-cache 분리).

### 2. Data Hazard

```c
add r0, r1, r2  ; r0 = r1 + r2
sub r3, r0, r4  ; r0 사용 — 앞 명령 결과 필요
```

`add`의 W 단계가 끝나기 전에 `sub`이 r0를 읽으려 합니다. *forwarding*이나 *stall*로 해결합니다.

### 3. Control Hazard

```c
beq r0, r1, label  ; 분기 — 어디로 갈지 D 단계 후에야 알 수 있음
add r2, r3, r4     ; ← 미리 fetch했지만 분기 시 무효
```

*branch prediction*으로 해결합니다 (다음 편에서 다룹니다).

## ARM Forwarding (Cortex-M4)

```c
ldr r0, [r1]   ; F D E   M  W (load 완료 = W)
mul r2, r0, r3 ; F D D' E   M  W   ← stall 1 cycle (load-use)
```

Load 결과는 *forwarding이 불가능*하여 1 cycle bubble이 생깁니다. 컴파일러가 *재정렬*을 시도합니다.

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

목표 IPC는 다음과 같습니다.
- Cortex-M0: ~0.7
- Cortex-M3: ~0.9
- Cortex-M4: ~0.95
- Cortex-M7 (dual-issue): ~1.5
- Cortex-A72 (OoO): ~3.0

## SuperH vs ARM Pipeline 차이

| ARM | SuperH SH-2/4 |
|---|---|
| Load delay slot이 묵시적입니다 | Delay slot이 명시적입니다 (branch 후 명령 항상 실행) |
| Conditional execution (Thumb-2)이 있습니다 | 없습니다 |
| 32 register | 16 register |

옛 자동차 ECU의 SH-4는 *delay slot이 명시적*이라 컴파일러가 명시적으로 처리해야 했습니다.

## 자주 하는 실수

> ⚠️ Pipeline 깊이가 성능과 같지는 않음

Cortex-M7 6-stage가 Cortex-M3 3-stage보다 클럭당 *더 빠른 건 아닙니다*. Dual-issue를 활용했을 때만 그렇습니다.

> ⚠️ NOP으로 stall 해결 시도

```c
ldr r0, [r1]
nop
nop
add r2, r0, r3
```

컴파일러가 *이미 더 잘 최적화*합니다. 직접 NOP을 삽입하는 것은 보통 *비최적*입니다.

> ⚠️ 짧은 함수가 빠르다고 가정

함수 호출은 *pipeline flush 가능성*이 있습니다. 인라인이 *더 빠릅니다*. `inline`이나 LTO로 컴파일러를 도와줍니다.

> ⚠️ Cycle 측정 오류

DWT CYCCNT는 *DMB와 DSB 없이는* 정확하게 측정되지 않습니다. *barrier를 추가*합니다.

```c
__DSB();
uint32_t start = DWT->CYCCNT;
/* code */
__DSB();
uint32_t end = DWT->CYCCNT;
```

## 정리

- Pipeline은 **명령어 단계별 병렬화**입니다 (F·D·E·M·W).
- Cortex-M0는 2-stage, M3/M4는 **3-stage**, M7은 6-stage dual-issue입니다.
- Cortex-A는 8~15-stage의 *out-of-order superscalar*입니다.
- 3 hazard (structural·data·control)는 forwarding과 branch prediction으로 회피합니다.
- Pipeline 깊이는 trade-off가 있습니다. *길수록 클럭이 높아지지만 mispredict 비용도 커집니다*.

다음 편은 **Pipeline Stall**입니다. Data dependency를 자세히 다룹니다.

## 관련 항목

- [2-02: Pipeline Stall](/blog/embedded/performance-engineering/part2-02-pipeline-stall)
- [2-03: Branch Prediction](/blog/embedded/performance-engineering/part2-03-branch-prediction)
