---
title: "Pipeline Stall 분석 — Data·Structural·Control Hazard·Forwarding"
slug: "embedded/performance-engineering/part2-02-pipeline-stall"
date: 2026-04-24T09:01:00
description: "Stall은 pipeline bubble을 만듭니다. RAW·WAR·WAW hazard와 forwarding을 보고, M2 Pro에서 RAW 사슬 비용을 재고, Cortex-A53의 stall PMU 이벤트를 TRM으로 확인합니다."
series: "Embedded Performance Engineering"
seriesOrder: 10
tags: [cpu, pipeline, hazard, stall, forwarding]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **Stall은 pipeline bubble입니다.** 명령이 진행하지 못하면서 IPC가 손실됩니다.

## Data Hazard 3종 (RAW·WAR·WAW)

### RAW (Read After Write) — 진짜 의존성

```asm
add r0, r1, r2      @ r0 = r1 + r2
sub r3, r0, r4      @ r0 사용 — RAW
```

`sub`는 `add`의 결과가 있어야 시작할 수 있습니다. 결과를 register file에 쓰기 전에 다음 명령의 입력으로 바로 넘기는 **forwarding**이 이 대기를 줄이지만, 연산 자체의 latency보다 짧게 만들 수는 없습니다.

### WAR (Write After Read) — 반의존성

```asm
add r0, r1, r2      @ r1 read
sub r1, r3, r4      @ r1 write
```

### WAW (Write After Write) — 출력 의존성

```asm
add r0, r1, r2
sub r0, r3, r4      @ r0 다시 write
```

WAR과 WAW는 같은 *이름*을 다시 쓰기 때문에 생기는 의존성이라, 이름을 바꾸면 사라집니다. 순서대로 실행하는 파이프라인에서는 읽기와 쓰기가 프로그램 순서대로 일어나므로 문제가 되지 않습니다. 순서를 바꿔 실행하는 코어는 register renaming으로 이름을 떼어 냅니다. Cortex-A72 Software Optimization Guide(UAN 0016A) 4.9절은 A72가 범용 레지스터를 rename해 추측·비순차 실행을 하지만, 대부분의 특수 목적 레지스터는 rename하지 않으며 그런 레지스터를 읽고 쓰는 명령에는 비추측 실행 같은 제약이 붙는다고 적습니다.

## Forwarding (Bypass)

![Forwarding path — EX 단계 출력을 다음 명령의 EX 입력으로 직접 연결](/images/blog/perf-eng/diagrams/part2-02-forwarding.svg)

EX 단계의 출력을 다음 명령의 EX 입력에 직접 연결해 register file을 우회합니다. Cortex-M7 TRM(DDI 0489D) 1.2.1은 Data Processing Unit의 특징으로 "interlock을 최소화하는 광범위한 forwarding 로직"을 듭니다.

## RAW 사슬의 비용 — 측정

forwarding이 있어도 의존 사슬은 연산 latency만큼 기다립니다. M2 Pro에서 L1에 들어가는 `double` 4,096개 배열의 합을 10만 번 구했습니다. 누산기 하나(`sum1`)와 넷(`sum4`)을 비교하고, 컴파일러가 벡터로 바꾸지 않게 `-fno-vectorize -fno-slp-vectorize`를 주었습니다(`bench/accum.c`, `clang -O2`, 각 3회).

```c
double sum1(const double *x) { double s = 0; for (int i = 0; i < N; i++) s += x[i]; return s; }
double sum4(const double *x) {
    double s0 = 0, s1 = 0, s2 = 0, s3 = 0;
    for (int i = 0; i < N; i += 4) { s0 += x[i]; s1 += x[i+1]; s2 += x[i+2]; s3 += x[i+3]; }
    return (s0 + s1) + (s2 + s3);
}
```

| 함수 | instructions retired | cycles elapsed | IPC | 원소당 cycle (3회) |
|---|---:|---:|---:|---|
| `sum1` | 2,064,154,252 | 1,224,449,174 | 1.69 | 2.99, 2.98, 2.98 |
| `sum4` | 934,972,513 | 308,341,990 | 3.03 | 0.75, 0.75, 0.75 |

`sum1`의 루프 본문은 `ldr d1`, `fadd d0, d0, d1`, 카운터 증가, 비교, 분기 다섯 명령이고(objdump로 확인), 원소 하나에 정확히 3 cycle이 걸렸습니다. 앞 `fadd`의 결과가 다음 `fadd`의 입력이라, 이 코어에서 `fadd` 하나의 결과를 기다리는 시간이 그대로 원소당 시간이 된 것입니다. 누산기를 넷으로 나누면 네 사슬이 겹쳐 원소당 0.75 cycle, 정확히 4배가 됩니다.

부동소수점 덧셈은 결합 법칙이 성립하지 않으므로 컴파일러가 `sum1`을 `sum4`로 바꿔 주지 않습니다. 합의 순서가 바뀌면 결과의 마지막 비트가 달라질 수 있다는 것을 받아들일 때만 손으로 나눕니다.

## Load-Use

load 결과를 바로 다음 명령이 쓰면, load가 끝날 때까지 그 명령이 기다립니다. Cortex-M4 TRM(DDI 0439B) 표 3-1은 `LDR Rd, [Rn, <op2>]`를 2 cycle로 적고, 3.3.2절은 다음 명령이 LDR/STR이고 앞 LDR의 결과를 *주소 계산*에 쓰지 않을 때만 다음 명령에서 1 cycle을 덜어 낸다고 적습니다. 결과를 주소로 바로 쓰는 경우는 이 절약 대상이 아닙니다.

### 해결책은 명령 재정렬

```asm
@ 의존 명령이 load 바로 뒤
ldr r0, [r1]
add r2, r0, r3

@ 독립 명령을 사이에 둠
ldr r0, [r1]
add r4, r5, r6
add r2, r0, r3
```

컴파일러는 alias·예외·언어 메모리 모델이 허락하는 범위에서 이런 재배치를 합니다. 이 글에서는 보드로 cycle을 재지 않았습니다.

## Structural Hazard

같은 자원을 두 명령이 동시에 원하면 하나가 기다립니다. Cortex-M4 TRM 2.2.1절은 코어의 AHB-Lite 인터페이스를 다음과 같이 나눕니다.

| 인터페이스 | 담당 |
|---|---|
| ICode | Code 영역(0x00000000~0x1FFFFFFF)의 명령 fetch |
| DCode | Code 영역의 data와 debug 접근 |
| System | 0x20000000~0xDFFFFFFF, 0xE0100000~0xFFFFFFFF의 명령 fetch와 data·debug 접근 |

flash(Code 영역)에서 실행하면 fetch는 ICode, data는 DCode로 나뉩니다. 반면 SRAM(0x2000_0000 이상)에서 코드를 실행하면 fetch와 data가 모두 System 버스를 쓰므로, 같은 버스를 두고 경쟁합니다. 같은 절은 외부에서 ICode와 DCode를 중재할 때 DCode에 더 높은 우선순위를 주라고 권합니다.

## Control Hazard

```asm
cmp r0, r1
beq label           @ 분기 결과가 나올 때까지
nop                 @ 이미 fetch한 명령은 분기하면 버려짐
nop
```

Cortex-M4 표 3-1에서 조건 분기는 "1 or 1 + P" cycle이고, 분기하지 않으면 1 cycle입니다(각주 c). P는 pipeline refill에 드는 1~3 cycle입니다. 분기 예측은 다음 편에서 다룹니다.

## PMU Stall 이벤트 (Cortex-A53)

Armv8 PMU에는 공통 이벤트 번호 0x23 `STALL_FRONTEND`, 0x24 `STALL_BACKEND`가 정의되어 있고(Linux `include/linux/perf/arm_pmuv3.h` 51~52행), Linux는 코어가 PMCEID로 지원을 알릴 때만 이 이름을 노출합니다(1-01). 그런데 Cortex-A53 TRM(DDI 0500E) 12.9절 표 12-28의 이벤트 목록에는 0x23·0x24가 없습니다. A53에서 stall 원인을 나눠 보려면 같은 표의 구현 정의 이벤트를 씁니다.

| 이벤트 | A53 TRM 표 12-28의 설명 |
|---|---|
| 0xE0 | DPU 명령 큐(IQ)가 비었고, 원인이 micro-TLB miss·명령 캐시 miss·pre-decode 오류가 아닌 cycle |
| 0xE1 | IQ가 비었고 명령 캐시 miss를 처리 중인 cycle |
| 0xE2 | IQ가 비었고 명령 micro-TLB miss를 처리 중인 cycle |
| 0xE4 | SIMD·FP 명령도, AGU 주소 계산을 기다리는 load/store도 아닌 원인의 interlock cycle |
| 0xE5 | load/store가 AGU에서 주소 계산용 데이터를 기다리는 interlock cycle |
| 0xE6 | SIMD·FP 명령 때문인 interlock cycle |
| 0xE7 | load miss 때문에 Wr 단계가 멈춘 cycle |

0xE0~0xE2는 앞단(명령 공급), 0xE4~0xE7은 뒷단(의존성과 메모리)입니다. Linux에서는 raw 이벤트로 셉니다.

```bash
perf stat -e r0e1,r0e5,r0e7,cycles -- ./app
```

이 시리즈의 HVF 게스트에는 범용 PMU 카운터가 없어서 이 명령을 실행하지 못했습니다(1-01).

## Out-of-Order Renaming

ISA 레지스터 이름을 물리 레지스터로 다시 붙이면 WAW와 WAR이 사라집니다. 아래는 개념을 보이는 의사코드입니다.

```text
ISA 레벨:        r0 = r1 + r2
                 r3 = r0 + r4
                 r0 = r5 + r6
                 r7 = r0 + r8

Renaming 후:     p10 = p1 + p2
                 p11 = p10 + p4
                 p12 = p5 + p6
                 p13 = p12 + p8
```

`r0`의 두 정의가 서로 다른 물리 레지스터 p10, p12로 갈라졌으므로, 위 두 줄과 아래 두 줄은 서로 기다리지 않고 동시에 진행할 수 있습니다.

## Conditional Execution — Cortex-M4 (Thumb-2 IT)

짧은 if-then은 분기 없이 조건부 명령으로 바꿀 수 있습니다. `arm-none-eabi-gcc` 16.2(`-mcpu=cortex-m4 -mthumb -O2`)가 아래 C 함수에 낸 코드입니다(`bench/it.c`).

```c
int setlt(int a, int b, int r) { if (a < b) r = 1; return r; }
```

```asm
setlt:
	cmp	r0, r1
	ite	ge
	movge	r0, r2
	movlt	r0, #1
	bx	lr
```

`ite ge`는 뒤따르는 두 명령을 각각 "ge이면", "lt이면" 실행하게 만듭니다. 분기가 없으므로 control hazard도 없습니다. 컴파일러가 알아서 고르므로 손으로 쓸 일은 드뭅니다.

## 자주 하는 실수

> ⚠️ -O0에서 stall 측정

Apple clang 21로 `sum1`을 `-O0`로 컴파일하면 루프 안에서 누산기 `s`를 `ldr d0, [sp, #16]`로 스택에서 읽고 `fadd` 뒤 `str d0, [sp, #16]`로 다시 씁니다(`bench/o0.c`). 사슬에 store→load가 끼어드는 것입니다. 실제 코드의 stall을 보려면 출시 빌드와 같은 최적화 수준에서 잽니다.

> ⚠️ `volatile`로 모든 변수 표시

`arm-none-eabi-gcc` 16.2, Cortex-M4, `-O2`로 `for (i = 0; i < n; i++) x++;`를 컴파일했습니다(`bench/vol.c`). 일반 변수는 루프 전체가 `ldr`, `add r3, r3, r0`, `str` 세 명령으로 접혔습니다. `volatile`로 선언하면 매 반복마다 `ldr`, `adds`, `str`가 남아 n번 실행됩니다. `volatile`은 모든 접근을 그대로 남기라는 뜻이므로 MMIO 레지스터처럼 정말 필요한 곳에만 씁니다.

> ⚠️ Branch가 항상 stall이라 가정

Cortex-M4에서도 분기하지 않는 조건 분기는 1 cycle입니다. 비용은 분기 자체보다 pipeline을 다시 채워야 하는 경우(P = 1~3 cycle)에서 나옵니다. 예측기가 있는 코어에서 맞게 예측한 분기의 비용은 다음 편에서 잽니다.

> ⚠️ 누산기 하나로 긴 reduction

위 측정에서 누산기를 하나에서 넷으로 나누자 같은 합이 4배 빨라졌습니다. 정수 합은 컴파일러가 알아서 나눕니다. 같은 루프를 `long`으로 바꿔 `clang -O2`로 컴파일하면 128비트 벡터 누산기 네 개(`add.2d v0..v3`)로 펼쳐집니다. 부동소수점은 결과가 바뀔 수 있어서 손으로 나눠야 합니다.

## 정리

- Stall은 **pipeline bubble**이며, IPC 손실로 이어집니다.
- RAW는 진짜 의존성이라 forwarding으로도 연산 latency 아래로 줄지 않습니다. M2 Pro에서 `double` 합의 사슬은 원소당 3 cycle, 누산기 넷으로 0.75 cycle이었습니다.
- WAR·WAW는 이름 의존성이라 renaming으로 사라집니다(A72 SOG 4.9).
- Cortex-M4에서 SRAM 실행은 fetch와 data가 System 버스를 함께 씁니다(TRM 2.2.1).
- Cortex-A53 TRM에는 0x23·0x24가 없고, 구현 정의 이벤트 0xE0~0xE7로 앞단과 뒷단 stall을 나눕니다.

다음 편은 **Branch Prediction**입니다.

## 관련 항목

- [2-01: Pipeline 기초](/blog/embedded/performance-engineering/part2-01-pipeline)
- [2-03: Branch Prediction](/blog/embedded/performance-engineering/part2-03-branch-prediction)

## 참고 자료

- Cortex-M4 Technical Reference Manual (DDI 0439B) 2.2.1, 표 3-1, 3.3.2
- Cortex-M7 Technical Reference Manual (DDI 0489D) 1.2.1
- Cortex-A53 MPCore Technical Reference Manual (DDI 0500E) 12.9, 표 12-28
- Cortex-A72 Software Optimization Guide (UAN 0016A) 4.9
- Linux v6.12 `include/linux/perf/arm_pmuv3.h`
