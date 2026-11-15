---
title: "CPU 파이프라인 분석 — 5-stage·Cortex-M·Cortex-A 비교"
slug: "embedded/performance-engineering/part2-01-pipeline"
date: 2026-04-24T09:00:00
description: "Fetch·Decode·Execute·Memory·Writeback의 5-stage 파이프라인을 봅니다. Cortex-M3/M4는 3-stage, Cortex-A는 8~15-stage입니다."
series: "Embedded Performance Engineering"
seriesOrder: 9
tags: [cpu, pipeline, cortex-m, cortex-a]
draft: false
topics: ["embedded"]
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

## Cortex-M0 / M0+ — 3-Stage / 2-Stage

```text
Cortex-M0: [Fetch] → [Decode] → [Execute]
Cortex-M0+: [Fetch+Decode] → [Execute]
```

매우 단순한 구조라서 작은 die와 낮은 전력이 특징입니다. M0+는 M0보다 짧은 pipeline으로 non-sequential fetch를 한 stage 덜 거칠 수 있습니다. 구체적인 branch timing은 processor revision과 memory system을 확인합니다.

## Cortex-M3/M4 — 3-Stage

```text
[Fetch] → [Decode] → [Execute (E+M+W 통합)]
```

```c
ldr r0, [r1]   ; F D E
add r2, r0, r3 ; F D E   ← r0 사용
```

`r0` 의존성이 있습니다. 실제 load-use stall 여부와 cycle 수는 명령 조합, 구현 및 memory latency에 따라 달라집니다. Cortex-M4 전체에 같은-cycle forwarding을 일반화하지 않습니다.

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

## Cortex-A72 — Out-of-Order

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
- Superscalar execution으로 독립 명령을 병렬 처리할 수 있습니다. Issue width와 sustained IPC는 stage, instruction mix와 resource constraints에 따라 달라집니다.

성능이 높지만 전력 소모도 그만큼 큽니다.

## Pipeline 길이 Trade-off

| 길이 | 장점 | 단점 |
|---|---|---|
| 짧음 (3) | Branch miss penalty가 작습니다 | 클럭 속도 한계가 있습니다 |
| 중간 (8) | 균형이 잡힙니다 | — |
| 김 (target별) | 높은 clock 목표에 활용할 수 있음 | Mispredict 비용은 구현별 |

Pentium 4는 31 stage였습니다. mispredict 시 *31 cycle을 손실*했고, 결국 실패한 디자인이 되었습니다.

## Throughput vs Latency

$$T_{\text{no pipeline}} = 5N \text{ cycle}, \quad T_{\text{5-stage pipe}} = 5 + (N-1) = N + 4 \text{ cycle} \ (N \gg 1)$$

*N=1000*이면 이상적인 수식은 no-pipeline 5,000 cycle, 5-stage pipeline 1,004 cycle이며 비율은 약 4.98배입니다. 이는 stage latency가 같고 stall이 없다는 단순 모델의 throughput 비교입니다. 한 명령의 latency는 5 cycle로 동일합니다.

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

이 예는 load-use 간격을 보여 주지만, 고정된 stall 수를 모든 메모리와 명령 조합에 일반화할 수 없습니다. 대상 Cortex-M4 TRM과 생성된 기계어를 확인하고 측정합니다.

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
- target별 instruction mix와 memory system에서 측정하며, architecture 고정 IPC 목표값은 제시하지 않습니다.

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

CYCCNT 측정 경계는 코어·컴파일러·대상 메모리와 측정하려는 작업에 맞춰 설계해야 합니다. DSB/ISB는 항상 필요한 고정 recipe가 아니므로, 해당 플랫폼의 TRM과 측정 코드 생성 결과를 확인합니다.

```c
__DSB();
uint32_t start = DWT->CYCCNT;
/* code */
__DSB();
uint32_t end = DWT->CYCCNT;
```

## 정리

- Pipeline은 **명령어 단계별 병렬화**입니다 (F·D·E·M·W).
- Cortex-M0는 3-stage, Cortex-M0+는 2-stage입니다. M3/M4는 **3-stage**, M7은 6-stage dual-issue pipeline입니다.
- Cortex-A는 8~15+ stage의 *out-of-order superscalar*입니다.
- 3 hazard (structural·data·control)는 forwarding과 branch prediction으로 회피합니다.
- Pipeline 깊이는 trade-off가 있습니다. *길수록 클럭이 높아지지만 mispredict 비용도 커집니다*.

다음 편은 **Pipeline Stall**입니다. Data dependency를 자세히 다룹니다.

## 관련 항목

- [2-02: Pipeline Stall](/blog/embedded/performance-engineering/part2-02-pipeline-stall)
- [2-03: Branch Prediction](/blog/embedded/performance-engineering/part2-03-branch-prediction)
