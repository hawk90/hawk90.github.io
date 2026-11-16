---
title: "CPU 파이프라인 분석 — 5-stage·Cortex-M·Cortex-A 비교"
slug: "embedded/performance-engineering/part2-01-pipeline"
date: 2026-04-24T09:00:00
description: "Fetch·Decode·Execute·Memory·Writeback의 5-stage 파이프라인과 Arm 문서에 적힌 Cortex-M·Cortex-A 파이프라인을 비교하고, M2 Pro에서 의존 사슬이 IPC를 정하는 것을 측정합니다."
series: "Embedded Performance Engineering"
seriesOrder: 9
tags: [cpu, pipeline, cortex-m, cortex-a]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **Pipeline은 명령어 병렬화입니다.** 한 사이클당 한 명령어 *완료*가 목표입니다.

## 5-Stage Classic Pipeline

교과서의 고전적 RISC 파이프라인은 명령 하나를 다섯 단계로 나눕니다.

| Stage | 작업 |
|---|---|
| **F** (Fetch) | PC가 가리키는 memory에서 명령어를 읽습니다 |
| **D** (Decode) | opcode를 해독하고 register를 read합니다 |
| **E** (Execute) | ALU 연산을 수행합니다 |
| **M** (Memory) | load/store 시 메모리에 액세스합니다 |
| **W** (Writeback) | register file에 결과를 씁니다 |

단계마다 다른 명령이 들어 있으므로, cycle마다 각 단계를 차지한 명령은 다음과 같습니다.

| cycle | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Inst1 | F | D | E | M | W | | | |
| Inst2 | | F | D | E | M | W | | |
| Inst3 | | | F | D | E | M | W | |
| Inst4 | | | | F | D | E | M | W |

5 cycle째부터는 매 cycle 명령 하나가 W를 마칩니다(IPC = 1.0). 명령 하나의 latency는 여전히 5 cycle입니다.

실제로는 데이터 의존성 때문에 stall이 발생합니다. 다음은 RAW(Read-After-Write) hazard 하나로 뒤따르는 명령들이 한 cycle씩 밀리는 모습입니다.

![5-stage pipeline에 RAW hazard 하나가 들어왔을 때의 stall 전파](/images/blog/perf-eng/diagrams/part2-01-pipeline-stages.svg)

## Cortex-M과 Cortex-A의 파이프라인

Arm이 공개한 문서에서 확인한 범위만 적습니다. 단계 이름과 세부 구조는 Arm이 공개하지 않은 것이 많아 싣지 않습니다.

| 코어 | 문서에 적힌 파이프라인 | 출처 |
|---|---|---|
| Cortex-M0 | 3-stage | Arm Cortex-M0 Processor Datasheet |
| Cortex-M0+ | 2-stage, von Neumann | Cortex-M0+ Devices Generic User Guide(DUI 0662B) 1.1 |
| Cortex-M4 | 3-stage, Harvard | Cortex-M4 Devices Generic User Guide(DUI 0553A) 1.1 |
| Cortex-M7 | 6-stage, Harvard, in-order superscalar. 많은 명령을 dual-issue하며 load/load, load/store 쌍도 포함 | Cortex-M7 Devices Generic User Guide(DUI 0646B) 1.1, Cortex-M7 TRM(DDI 0489D) 1.1 |
| Cortex-A53 | in-order, 대부분의 명령을 대칭 dual-issue | Cortex-A53 TRM(DDI 0500E) 1.3 |
| Cortex-A72 | fetch → decode·rename·dispatch까지 in-order, 이후 8개 실행 파이프라인으로 out-of-order issue. dispatch는 cycle당 최대 3 µop | Cortex-A72 Software Optimization Guide(UAN 0016A) 2.1, 4.1 |

M7 TRM 1.2.1은 dual-issue를 위해 정수 레지스터 파일에 읽기 포트 6개, 쓰기 포트 4개를 두고, interlock을 줄이는 forwarding 로직과 ALU 두 개(하나는 SIMD 가능)를 갖췄다고 적습니다. A72 SOG 2.1의 그림은 실행 파이프라인을 Branch, Integer 0/1, Integer Multi-Cycle, FP/ASIMD 0/1, Load, Store의 여덟 개로 나누고, 각 파이프라인이 cycle마다 µop 하나를 받아 끝낼 수 있다고 적습니다.

Raspberry Pi 문서에 따르면 초기 Raspberry Pi 3 Model B와 Compute Module 3의 BCM2837은 Cortex-A53 네 개로 된 클러스터입니다.

## Cortex-M4의 load와 의존성

Cortex-M4 TRM(DDI 0439B) 표 3-1은 `ADD`, `MUL`을 1 cycle, `LDR Rd, [Rn, <op2>]`를 2 cycle로 적고, 각주 b에서 "이웃한 load/store 단일 명령은 address와 data 단계를 pipeline할 수 있다"고 덧붙입니다. 3.3.2절 "Load/store timings"는 이것을 구체적으로 설명합니다.

- 다음 명령이 LDR이나 STR이고, 앞 LDR의 목적 레지스터가 다음 명령의 *주소 계산*에 쓰이지 않으면 다음 명령의 비용에서 1 cycle이 빠집니다.
- 그래서 `LDR R0,[R1]; LDR R1,[R2]`는 보통 합쳐 3 cycle, `LDR R0,[R1,R5]; LDR R1,[R2]; LDR R2,[R3,#4]`는 보통 4 cycle입니다.
- `LDR PC,[any]`는 load 2 cycle에 pipeline reload 3 cycle이 붙어 최소 5 cycle입니다.

```asm
ldr r0, [r1]        @ 2 cycle
ldr r2, [r3]        @ r0을 주소에 쓰지 않음 → 1 cycle 절약, 둘이 합쳐 보통 3 cycle
ldr r4, [r0]        @ r0을 주소에 씀 → 위 절약 조건에 해당하지 않음
```

이 글에서는 보드로 재지 않았습니다. QEMU는 cycle을 모델링하지 않으므로(1-03) 이 숫자는 QEMU로 확인할 수 없습니다.

## 측정 — 의존 사슬이 IPC를 정한다

out-of-order superscalar 코어가 독립 명령을 얼마나 동시에 처리하는지는 M2 Pro에서 직접 볼 수 있습니다. 루프 한 번에 `add` 여덟 개를 넣되, 하나의 레지스터에 사슬로 걸거나(`dep`), 레지스터 4개(`ind4`) 또는 8개(`ind8`)에 나눠 독립 사슬로 만들었습니다. 컴파일러가 바꾸지 못하게 inline asm으로 썼습니다(`bench/chain.c`, `clang -O2`, 루프 10⁸회).

```c
/* dep: 8 adds on one register */
__asm__ volatile("add %0,%0,#1\n add %0,%0,#1\n ... (8개)" : "+r"(a));
/* ind4: same 8 adds over a, b, c, d */
__asm__ volatile("add %0,%0,#1\n add %1,%1,#1\n add %2,%2,#1\n add %3,%3,#1\n ..." : "+r"(a), "+r"(b), "+r"(c), "+r"(d));
```

`/usr/bin/time -l`의 instructions retired와 cycles elapsed로 IPC를 냈습니다(각 3회).

| 변형 | instructions retired | cycles elapsed | IPC (3회) | 루프 1회당 cycle |
|---|---:|---:|---|---:|
| `dep` | 1,011,819,364 | 816,327,905 | 1.24, 1.24, 1.24 | 8.2 |
| `ind4` | 1,011,390,361 | 251,141,242 | 4.03, 4.05, 4.02 | 2.5 |
| `ind8` | 1,011,440,812 | 190,638,786 | 5.31, 5.32, 5.33 | 1.9 |

명령어 수는 세 변형이 같습니다. `dep`은 루프 한 번에 8.2 cycle, 즉 의존하는 `add` 하나에 1 cycle씩 걸렸습니다. 이것이 `add`의 latency입니다. IPC가 1보다 조금 큰 것은 루프 카운터와 분기 명령이 사슬과 독립이라 같은 cycle에 함께 끝나기 때문입니다. 같은 여덟 개를 독립 사슬로 나누면 같은 코어가 cycle당 `add`를 3.2개(`ind4`), 4.2개(`ind8`) 처리합니다. 파이프라인과 다중 실행 유닛이 성능을 내려면 *독립 명령이 있어야* 합니다.

## Throughput vs Latency

$$T_{\text{no pipeline}} = 5N \text{ cycle}, \quad T_{\text{5-stage pipe}} = 5 + (N-1) = N + 4 \text{ cycle}$$

*N = 1000*이면 이상적인 수식은 no-pipeline 5,000 cycle, 5-stage pipeline 1,004 cycle이며 비율은 약 4.98배입니다. 이는 stage latency가 같고 stall이 없다는 단순 모델의 throughput 비교입니다. 한 명령의 latency는 5 cycle로 동일합니다. 위 M2 Pro 측정의 `dep`이 latency 쪽, `ind8`이 throughput 쪽입니다.

## Pipeline Hazard 3종

### 1. Structural Hazard

같은 hardware 자원을 두 명령이 동시에 사용하는 경우입니다. 예를 들어 단일 memory port에 F와 M이 동시 액세스하는 상황입니다. 명령과 데이터의 버스를 나눈 Harvard 구조(Cortex-M4, M7)는 이 충돌을 없앱니다. 2-stage인 Cortex-M0+는 von Neumann 구조입니다(위 표).

### 2. Data Hazard

```asm
add r0, r1, r2      @ r0 = r1 + r2
sub r3, r0, r4      @ r0 사용 — 앞 명령 결과 필요
```

고전적 5단에서 `add`의 W가 끝나기 전에 `sub`이 D에서 r0를 읽으려 합니다. 결과를 E 출력에서 바로 넘기는 *forwarding*이나 *stall*로 해결합니다. Cortex-M7 TRM 1.2.1이 말하는 "extensive forwarding logic"이 이것입니다.

### 3. Control Hazard

```asm
cmp r0, r1
beq label           @ 분기 — 어디로 갈지는 비교 결과가 나온 뒤에야 확정
add r2, r3, r4      @ 미리 fetch했지만 분기하면 버려짐
```

Cortex-M4 표 3-1에서 조건 분기는 "1 or 1 + P" cycle이고, 각주 c는 분기하지 않으면 1 cycle에 끝난다고 적습니다. P는 pipeline refill에 드는 1~3 cycle입니다. 분기 예측은 다음 편에서 다룹니다.

## 자주 하는 실수

> ⚠️ Pipeline 깊이가 성능과 같지는 않음

Cortex-M7의 6-stage 자체가 아니라 dual-issue와 forwarding이 클럭당 성능을 올립니다. 위 M2 Pro 측정처럼 명령이 모두 한 사슬에 걸려 있으면 다중 발행 코어도 cycle당 하나씩만 끝냅니다.

> ⚠️ NOP으로 stall 해결 시도

```asm
ldr r0, [r1]
nop
nop
add r2, r0, r3
```

NOP도 fetch·decode를 거치는 명령입니다. 빈칸을 채우려면 의존성이 없는 *쓸모 있는* 명령을 그 자리에 두어야 하고, 이것은 컴파일러의 명령 스케줄링이 하는 일입니다. 손으로 NOP을 넣으면 코드만 길어집니다.

> ⚠️ 분기와 함수 호출의 비용을 0으로 가정

Cortex-M4 표 3-1에서 `BL`과 같은 분기는 1 + P cycle이고, P는 1~3 cycle입니다. 아주 짧은 함수를 루프 안에서 부르면 이 비용이 본문보다 커질 수 있으므로, inline이나 LTO(1-08)로 호출을 없앱니다.

> ⚠️ Cycle 측정 경계

CYCCNT 읽기도 명령이라 앞뒤 명령과 함께 파이프라인에 들어갑니다. 측정 구간을 아주 짧게 잡으면 경계의 몇 cycle이 결과를 좌우하므로, 빈 구간을 먼저 재서 빼거나 구간 안의 반복을 늘립니다.

## 정리

- Pipeline은 **명령어 단계별 병렬화**입니다 (F·D·E·M·W).
- Arm 문서 기준 Cortex-M0는 3-stage, M0+는 2-stage, M4는 3-stage, M7은 6-stage dual-issue입니다. A53은 in-order dual-issue, A72는 dispatch 이후 out-of-order입니다.
- Cortex-M4에서 이웃한 LDR은 조건이 맞으면 1 cycle을 아낍니다(TRM 3.3.2).
- M2 Pro에서 같은 `add` 8개가 한 사슬이면 IPC 1.24, 8개 독립 사슬이면 5.3이었습니다. 다중 발행은 독립 명령이 있을 때만 효과가 있습니다.

다음 편은 **Pipeline Stall**입니다. Data dependency를 자세히 다룹니다.

## 관련 항목

- [2-02: Pipeline Stall](/blog/embedded/performance-engineering/part2-02-pipeline-stall)
- [2-03: Branch Prediction](/blog/embedded/performance-engineering/part2-03-branch-prediction)

## 참고 자료

- [Arm Cortex-M0 Processor Datasheet](https://arm.com/-/media/Arm%20Developer%20Community/PDF/Processor%20Datasheets/Arm_Cortex-M0_Processor_Datasheet.pdf)
- Cortex-M0+ Devices Generic User Guide (DUI 0662B), Cortex-M4 Devices Generic User Guide (DUI 0553A), Cortex-M7 Devices Generic User Guide (DUI 0646B)
- Cortex-M4 Technical Reference Manual (DDI 0439B) 표 3-1, 3.3.2; Cortex-M7 Technical Reference Manual (DDI 0489D) 1.1, 1.2.1
- Cortex-A53 MPCore Technical Reference Manual (DDI 0500E) 1.3; Cortex-A72 Software Optimization Guide (UAN 0016A) 2.1, 4.1
- [Raspberry Pi processors](https://www.raspberrypi.com/documentation/computers/processors.html)
