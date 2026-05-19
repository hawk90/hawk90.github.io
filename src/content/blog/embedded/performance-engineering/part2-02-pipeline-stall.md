---
title: "2-02: Pipeline Stall — Data·Structural·Control Hazard + Forwarding"
date: 2026-05-08T09:00:00
description: "Stall은 pipeline bubble을 만듭니다. RAW·WAR·WAW hazard, forwarding, PMU STALL counter를 살펴봅니다."
series: "Embedded Performance Engineering"
seriesOrder: 10
tags: [cpu, pipeline, hazard, stall, forwarding]
draft: false
---

## 한 줄 요약

> **Stall은 pipeline bubble입니다.** 명령이 진행하지 못하면서 IPC가 손실됩니다.

## Data Hazard 3종 (RAW·WAR·WAW)

### RAW (Read After Write) — 진짜 의존성

```c
add r0, r1, r2   ; r0 = r1 + r2
sub r3, r0, r4   ; r0 사용 — RAW
```

`sub`가 `r0`를 읽을 때 `add` 결과가 필요합니다. **Forwarding**으로 해결합니다.

### WAR (Write After Read) — 반의존성

```c
add r0, r1, r2   ; r1 read
sub r1, r3, r4   ; r1 write
```

In-order pipeline에서는 *문제가 없습니다*. OoO에서는 *register renaming*으로 해결합니다.

### WAW (Write After Write) — 출력 의존성

```c
add r0, r1, r2
sub r0, r3, r4   ; r0 다시 write
```

In-order는 자동으로 처리되고, OoO는 renaming으로 처리합니다.

## Forwarding (Bypass)

![Forwarding path — EX 단계 출력을 다음 명령의 EX 입력으로 직접 연결](/images/blog/perf-eng/diagrams/part2-02-forwarding.svg)

EX 단계의 출력을 다음 명령의 EX 입력에 직접 연결합니다. *별도 wire*로 register file을 우회합니다. ARM Cortex-A에는 Operand Forwarding Unit이 있습니다.

## Load-Use Stall — Forwarding 불가능 케이스

```c
ldr r0, [r1]     F D E M W
                       ↑ load 결과 = M 단계 끝
add r2, r0, r3   F D E       ; E 단계에 r0 필요 — but M 단계 안 끝남
                     ─── 1 cycle bubble ───
```

ARM Cortex-M3/M4의 *load-use penalty는 1 cycle*입니다. Cortex-M7은 2 cycle입니다.

### 해결책은 명령 재정렬

```c
; 회피
ldr r0, [r1]
add r2, r0, r3   ; ← stall

; Good
ldr r0, [r1]
add r4, r5, r6   ; 독립 명령 삽입
add r2, r0, r3   ; ← load 결과 사용 시점에 준비됨
```

`-O2` 이상에서 컴파일러가 자동으로 재정렬합니다. `volatile` 변수는 *순서가 고정*되어 재정렬되지 않습니다.

## Structural Hazard

```c
; 가상 — 단일 memory port 가정
ldr r0, [r1]    ; F D E M  ← memory
ldr r2, [r3]    ; F D E    ← M 단계에 또 memory 시도 → stall
```

**Harvard architecture**를 쓰면 instruction memory와 data memory가 분리되어 동시에 액세스할 수 있습니다.

ARM Cortex-M3/M4는 *single port* Harvard입니다 (I/D 통합 bus). M7은 *dual port* TCM을 가집니다.

## Control Hazard

```c
beq r0, r1, label   ; F D E
                       ↑ E 단계에 분기 확정
nop                 ; F (이미 fetch — 분기 시 flush)
nop                 ; F
```

**branch prediction**으로 해결합니다. 별도 편에서 다룹니다.

## ARM Cortex-M4 Cycle 측정 예

```c
volatile uint32_t a, b, c, d;

void test_no_stall(void) {
    /* 독립 명령 — stall 없음 */
    asm volatile (
        "add r0, r1, r2 \n"
        "add r3, r4, r5 \n"
        "add r6, r7, r8 \n"
    );
}

void test_raw_chain(void) {
    /* RAW chain — forwarding으로 처리 */
    asm volatile (
        "add r0, r1, r2 \n"
        "add r3, r0, r4 \n"   /* r0 의존 */
        "add r5, r3, r6 \n"   /* r3 의존 */
    );
}

void test_load_use(void) {
    asm volatile (
        "ldr r0, [%0]    \n"
        "add r1, r0, r0  \n"   /* load-use stall 1 cycle */
        :: "r"(&a)
    );
}
```

DWT CYCCNT로 측정하면 `test_no_stall`과 `test_raw_chain`은 *같은 cycle*이고, `test_load_use`는 *1 cycle이 더 걸립니다*.

## PMU STALL Counter (Cortex-A)

Cortex-A53 Performance Monitoring Unit의 이벤트는 다음과 같습니다.

| Event | 의미 |
|---|---|
| `0x23` STALL_FRONTEND | F·D 단계 stall입니다 (cache miss·branch mispredict) |
| `0x24` STALL_BACKEND | E·M 단계 stall입니다 (data dependency·memory) |
| `0x73` STALL_BACKEND_MEM | memory bound stall입니다 |

```c
/* perf_event_open으로 측정 */
struct perf_event_attr attr = {
    .type = PERF_TYPE_RAW,
    .config = 0x24,   // STALL_BACKEND
};
int fd = perf_event_open(&attr, 0, -1, -1, 0);
```

`STALL_FRONTEND > STALL_BACKEND`이면 *fetch bound*입니다 (cache miss나 mispredict가 의심됩니다).
`STALL_BACKEND > STALL_FRONTEND`이면 *compute나 memory bound*입니다 (data dependency나 DRAM 대기입니다).

## Out-of-Order Renaming

Cortex-A72 등 OoO 코어의 동작은 다음과 같습니다.

```text
ISA 레벨:   r0 = r1 + r2
            r3 = r0 + r4
            r0 = r5 + r6   (WAW!)
            r7 = r0 + r8

Renaming 후:
            v10 = v1 + v2
            v11 = v10 + v4
            v12 = v5 + v6   (WAW 해소)
            v13 = v12 + v8
```

Architectural register `r0`의 두 정의가 *physical register* 두 개로 분리됩니다. 의존성 cycle이 없는 분리된 stream으로 실행할 수 있습니다.

## Conditional Execution — Cortex-M4 (Thumb-2 IT)

```c
cmp r0, r1
it lt
movlt r2, #1   ; if (r0 < r1) r2 = 1; else nothing
```

**분기 없이** conditional move를 수행하여 control hazard를 회피합니다. 짧은 if-then 패턴에 최적입니다.

```c
; 회피 (branch hazard)
cmp r0, r1
bge skip
mov r2, #1
skip:

; Good (no branch)
cmp r0, r1
it lt
movlt r2, #1
```

다만 Cortex-A는 IT block 효율이 떨어집니다. 그래서 *컴파일러가 자동으로 판단*합니다.

## NEON·DSP — SIMD로 Latency Hiding

```c
; 4 element 합산 — scalar
add r0, r1, r2
add r0, r0, r3   ; RAW chain (4 cycle)
add r0, r0, r4
add r0, r0, r5

; NEON SIMD
vadd.f32 q0, q1, q2   ; 4 elements 동시 — 1 cycle
```

SIMD는 *수평적 병렬화*이므로 RAW chain을 우회합니다.

## 자주 하는 실수

> ⚠️ -O0에서 stall 측정

```bash
gcc -O0 -o test test.c
# 의미 없음 — 컴파일러가 명령 재정렬 안 함, 결과 inconsistent
```

성능 측정은 *최소 -O2*에서 해야 합니다.

> ⚠️ `volatile`로 모든 변수 표시

```c
volatile uint32_t counter;   // ← 모든 access fence
counter++;                   // load + add + store, 재정렬 금지
```

성능 critical loop에서 `volatile`는 *컴파일러 최적화를 차단*합니다. *register와 통신 register에만* `volatile`을 씁니다.

> ⚠️ Branch가 항상 stall이라 가정

Modern CPU에서는 *predict가 성공하면 stall = 0*입니다. Branch 자체가 문제가 아니라 *misprediction*이 문제입니다.

> ⚠️ Forwarding 의존성 무시

```c
for (int i = 0; i < N; i++) {
    x = x + a[i];   ; ← RAW chain — 한 cycle 1 add만
}
```

Loop unroll로 *독립 accumulator*를 만듭니다.

```c
for (int i = 0; i < N; i += 4) {
    x0 += a[i];
    x1 += a[i+1];
    x2 += a[i+2];
    x3 += a[i+3];
}
sum = x0 + x1 + x2 + x3;
```

## 정리

- Stall은 **pipeline bubble**이며, IPC 손실로 이어집니다.
- RAW (data dependency)는 forwarding으로 해결합니다.
- Load-use는 forwarding이 불가하여 *1-2 cycle penalty*가 있습니다.
- PMU **STALL_FRONTEND와 STALL_BACKEND**로 원인을 추정합니다.
- 컴파일러 `-O2`, loop unroll, SIMD로 stall을 회피합니다.

다음 편은 **Branch Prediction**입니다.

## 관련 항목

- [2-01: Pipeline 기초](/blog/embedded/performance-engineering/part2-01-pipeline)
- [2-03: Branch Prediction](/blog/embedded/performance-engineering/part2-03-branch-prediction)
