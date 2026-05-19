---
title: "2-02: Pipeline Stall — Data·Structural·Control Hazard + Forwarding"
date: 2026-05-08T09:00:00
description: "Stall = pipeline bubble. RAW·WAR·WAW hazard, forwarding, PMU STALL counter."
series: "Embedded Performance Engineering"
seriesOrder: 10
tags: [cpu, pipeline, hazard, stall, forwarding]
draft: true
---

## 한 줄 요약

> **"Stall = pipeline bubble"** — 명령이 진행 못 함 → IPC 손실.

## Data Hazard 3종 (RAW·WAR·WAW)

### RAW (Read After Write) — 진짜 의존성

```c
add r0, r1, r2   ; r0 = r1 + r2
sub r3, r0, r4   ; r0 사용 — RAW
```

`sub`가 `r0` 읽을 때 `add` 결과 필요. **Forwarding**으로 해결.

### WAR (Write After Read) — 반의존성

```c
add r0, r1, r2   ; r1 read
sub r1, r3, r4   ; r1 write
```

In-order pipeline에선 *문제 없음*. OoO에선 *register renaming*으로 해결.

### WAW (Write After Write) — 출력 의존성

```c
add r0, r1, r2
sub r0, r3, r4   ; r0 다시 write
```

In-order는 자동 처리. OoO는 renaming.

## Forwarding (Bypass)

```text
add r0, r1, r2    F D E   ─→ result available end of E
                     │     │
                     ↓ forwarding
sub r3, r0, r4       F D E
```

EX 단계 출력을 다음 명령의 EX 입력에 직접 연결. *별도 wire*로 register file 우회. ARM Cortex-A의 Operand Forwarding Unit.

## Load-Use Stall — Forwarding 불가능 케이스

```c
ldr r0, [r1]     F D E M W
                       ↑ load 결과 = M 단계 끝
add r2, r0, r3   F D E       ; E 단계에 r0 필요 — but M 단계 안 끝남
                     ─── 1 cycle bubble ───
```

ARM Cortex-M3/M4 *load-use penalty = 1 cycle*. Cortex-M7 = 2 cycle.

### 해결 — 명령 재정렬

```c
; 회피
ldr r0, [r1]
add r2, r0, r3   ; ← stall

; Good
ldr r0, [r1]
add r4, r5, r6   ; 독립 명령 삽입
add r2, r0, r3   ; ← load 결과 사용 시점에 준비됨
```

`-O2` 이상에서 컴파일러가 자동 재정렬. `volatile` 변수는 *순서 고정* — 재정렬 안 됨.

## Structural Hazard

```c
; 가상 — 단일 memory port 가정
ldr r0, [r1]    ; F D E M  ← memory
ldr r2, [r3]    ; F D E    ← M 단계에 또 memory 시도 → stall
```

**Harvard architecture** — instruction memory와 data memory 분리 → 동시 액세스.

ARM Cortex-M3/M4 — *single port* Harvard (I/D 통합 bus). M7 — *dual port* TCM.

## Control Hazard

```c
beq r0, r1, label   ; F D E
                       ↑ E 단계에 분기 확정
nop                 ; F (이미 fetch — 분기 시 flush)
nop                 ; F
```

해결 — **branch prediction**. 별도 편.

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

DWT CYCCNT로 측정 — `test_no_stall`과 `test_raw_chain`은 *같은 cycle*, `test_load_use`는 *1 cycle 더*.

## PMU STALL Counter (Cortex-A)

Cortex-A53 Performance Monitoring Unit 이벤트:

| Event | 의미 |
|---|---|
| `0x23` STALL_FRONTEND | F·D 단계 stall (cache miss·branch mispredict) |
| `0x24` STALL_BACKEND | E·M 단계 stall (data dependency·memory) |
| `0x73` STALL_BACKEND_MEM | memory bound stall |

```c
/* perf_event_open으로 측정 */
struct perf_event_attr attr = {
    .type = PERF_TYPE_RAW,
    .config = 0x24,   // STALL_BACKEND
};
int fd = perf_event_open(&attr, 0, -1, -1, 0);
```

`STALL_FRONTEND > STALL_BACKEND` — *fetch bound* (cache miss·mispredict 의심).  
`STALL_BACKEND > STALL_FRONTEND` — *compute/memory bound* (data dependency·DRAM 대기).

## Out-of-Order Renaming

Cortex-A72 등 OoO 코어:

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

Architectural register `r0` 두 정의 → *physical register* 두 개로 분리. 의존성 cycle 없는 분리된 stream으로 실행 가능.

## Conditional Execution — Cortex-M4 (Thumb-2 IT)

```c
cmp r0, r1
it lt
movlt r2, #1   ; if (r0 < r1) r2 = 1; else nothing
```

**분기 없이** conditional move → control hazard 회피. 짧은 if-then 패턴엔 최적.

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

다만 Cortex-A는 IT block 효율 떨어짐 — *컴파일러 자동 판단*.

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

SIMD = *수평적 병렬* — RAW chain 우회.

## 자주 하는 실수

> ⚠️ -O0에서 stall 측정

```bash
gcc -O0 -o test test.c
# 의미 없음 — 컴파일러가 명령 재정렬 안 함, 결과 inconsistent
```

성능 측정은 *최소 -O2*.

> ⚠️ `volatile`로 모든 변수 표시

```c
volatile uint32_t counter;   // ← 모든 access fence
counter++;                   // load + add + store, 재정렬 금지
```

성능 critical loop에서 `volatile`는 *컴파일러 최적화 차단*. *register·통신 register만* `volatile`.

> ⚠️ Branch가 항상 stall이라 가정

Modern CPU에서 *predict 성공 시 stall = 0*. Branch 자체는 문제 아님 — *misprediction*이 문제.

> ⚠️ Forwarding 의존성 무시

```c
for (int i = 0; i < N; i++) {
    x = x + a[i];   ; ← RAW chain — 한 cycle 1 add만
}
```

Loop unroll로 *독립 accumulator* 만들기:

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

- Stall = **pipeline bubble** — IPC 손실.
- RAW (data dependency) — forwarding으로 해결.
- Load-use = forwarding 불가, *1-2 cycle penalty*.
- PMU **STALL_FRONTEND vs STALL_BACKEND**로 원인 추정.
- 컴파일러 `-O2`·loop unroll·SIMD로 stall 회피.

다음 편은 **Branch Prediction**.

## 관련 항목

- [2-01: Pipeline 기초](/blog/embedded/performance-engineering/part2-01-pipeline)
- [2-03: Branch Prediction](/blog/embedded/performance-engineering/part2-03-branch-prediction)
