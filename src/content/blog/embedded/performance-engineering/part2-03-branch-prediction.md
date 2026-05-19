---
title: "2-03: Branch Prediction — Static·2-bit·BTB·BHT·Mispredict 비용"
date: 2026-05-08T10:00:00
description: "BTFNT, 2-bit saturating counter, BTB·BHT. Mispredict 10-20 cycle. PMU BR_MIS_PRED."
series: "Embedded Performance Engineering"
seriesOrder: 11
tags: [cpu, branch, prediction, btb, bht]
draft: true
---

## 한 줄 요약

> **"Branch prediction = pipeline 살리는 트릭"** — mispredict 시 *전체 flush*.

## Mispredict 비용

```text
Pipeline depth: 8
Branch resolved at: stage 5
Misprediction → 5 cycle flush → 5 cycle 손실
```

| CPU | Pipeline | Mispredict Penalty |
|---|---|---|
| Cortex-M0 | 2 | 1 cycle |
| Cortex-M3/M4 | 3 | **2 cycle** |
| Cortex-M7 | 6 | 4~5 cycle |
| Cortex-A53 | 8 | **8 cycle** |
| Cortex-A72 | 15 | **15 cycle** |
| Intel Skylake | 14~19 | **15+ cycle** |

깊은 pipeline일수록 *예측 실패 비용 ↑*. Modern CPU에서 mispredict = *cache miss와 비슷한 비용*.

## Static Prediction — BTFNT

**Backward Taken, Forward Not-Taken**.

```c
for (int i = 0; i < N; i++) {   // backward branch — predict taken
    // loop body
}

if (rare_error) {                // forward — predict not-taken
    handle_error();
}
```

Loop은 *대부분 taken*, error path는 *대부분 not-taken* → 통계적 hit rate 70%.

ARM Cortex-M0/M3 — pure static. Branch instruction 자체가 *backward·forward* 판별 가능.

## Dynamic — 1-bit Predictor

```text
last_branch_taken → 1
last_branch_not_taken → 0
predict = last result
```

```c
for (int i = 0; i < 10; i++) { ... }   // 9 taken + 1 not-taken
```

루프 끝 두 번 mispredict (taken→not-taken 전환 + 다음 루프 시작 not-taken→taken). 정확도 70-80%.

## 2-bit Saturating Counter — 표준

```text
[Strongly Not Taken] ←→ [Weakly Not Taken] ←→ [Weakly Taken] ←→ [Strongly Taken]
       00                     01                  10                 11

Predict:
  00, 01 → Not Taken
  10, 11 → Taken

Update on actual outcome:
  Taken → counter++  (saturate at 11)
  Not Taken → counter--  (saturate at 00)
```

루프 끝 single mispredict만 — 한 번의 예외에 *바로 flip 안 함*. 정확도 85-95%.

## BHT (Branch History Table)

각 branch PC를 *index*로 2-bit counter 저장:

```text
PC (12-bit hash) → Index → 2-bit counter
```

크기 — 1k~16k entry. ARM Cortex-A53 = 256 entry × 4-way set associative.

## BTB (Branch Target Buffer)

분기 *주소*뿐 아니라 *대상 주소*도 캐시.

```text
PC → BTB entry:
       { target_addr, predict_bits }
```

분기 명령 *fetch 시점*에 BTB hit이면 *바로 target fetch* — 1 cycle도 안 잃음.

## Global History — Two-Level Adaptive (gshare)

```text
last 8 branches taken? → 8-bit history register

index = (PC ^ history) mod table_size
```

**상관관계 학습** — `if (a) {} if (b) {} if (a && b) {}` 패턴에서 c의 결과를 a·b 결과로 예측.

Cortex-A72 — *Tournament predictor* (local + global 둘 다, 동적 선택).

## Indirect Branch — Function Pointer·vtable

```c
void (*handler)(int) = handlers[type];
handler(arg);    // indirect branch — target 가변
```

BTB 한 entry로 *최근 target만* 기억. 가변이면 mispredict 빈번.

해결 — *Indirect Branch Predictor* (Cortex-A72의 별도 hardware).

## Return Address Stack

```c
function_a();   // call → push return addr to stack
   /* ... */
   return;      // pop stack → predict return target
```

별도 *return stack* — 8~16 entry. Function call/return은 *완벽 예측*.

깊은 recursion이 stack 초과하면 *mispredict* 발생.

## Cortex-M3/M4 — Limited Prediction

```c
; Cortex-M3 prediction
beq label       ; static prediction만 (BTFNT 기본)
bx lr           ; return — *prediction 없음*, 항상 flush
```

Cortex-M3 — *branch 자체에 prefetch buffer*. mispredict 2 cycle, 그 외 hit 0 cycle.

## Cortex-A53 — Branch Predictor Spec

| 항목 | 사양 |
|---|---|
| BTB | 256 entry, 4-way set assoc |
| BHT | 6144 entry |
| Return Stack | 8-entry |
| Predict per cycle | 1 |
| Mispredict penalty | 8 cycle |

## 측정 — PMU Event

| Event | 의미 |
|---|---|
| `0x10` BR_PRED | 분기 명령 수 |
| `0x11` BR_MIS_PRED | 잘못 예측한 분기 수 |
| `0x18` BR_RETURN_MIS_PRED | 잘못 예측한 return |

```bash
# Linux perf
perf stat -e branches,branch-misses ./prog
# branch-miss-rate = branch-misses / branches
# 일반 코드: < 5%
# 잘 짜인 코드: < 1%
# branch-heavy worst case: 15~20%
```

## Branchless Code

```c
// 회피
int max(int a, int b) {
    if (a > b) return a;
    else return b;
}

// Good — branchless
int max(int a, int b) {
    int diff = a - b;
    int mask = diff >> 31;   // -1 if a<b, 0 if a>=b
    return b + (diff & ~mask);
}
```

또는 ARM Thumb-2 IT block:

```c
cmp r0, r1
it gt
movgt r0, r1    ; conditional move
```

Mispredict 회피. 다만 *modern OoO에서 predict가 잘 되면* branchless 안 빠를 수 있음 — **측정 우선**.

## __builtin_expect — 컴파일러 힌트

```c
if (__builtin_expect(rare_error, 0)) {
    handle();
}

// 매크로화
#define likely(x)   __builtin_expect(!!(x), 1)
#define unlikely(x) __builtin_expect(!!(x), 0)

if (unlikely(rare_error)) {
    handle();
}
```

컴파일러가 *forward branch arrangement*를 hint대로. 일부 ARM에서 *static prediction*에도 영향.

## Spectre — Branch Prediction의 어두운 면

```c
if (x < array_size) {            // mispredict → speculative execution
    y = array[secret_offset];    // 실행되지만 commit 안 됨
                                  // 그러나 *cache state 변경* → side channel
}
```

CVE-2017-5754 Meltdown·Spectre. ARM에서도 *Cortex-A75 이상에서 영향*. 완화 — `csdb` barrier, KAISER 기법.

## 자주 하는 실수

> ⚠️ `volatile`로 mispredict 회피 시도

`volatile`은 *컴파일러 재정렬 차단* — branch prediction과 무관.

> ⚠️ 짧은 if-else로 무조건 branchless

```c
if (rare_case) special_path();   // ← 1% taken
```

99% predict 성공 → mispredict 비용 적음. *Branchless가 항상 빠르지 않음*.

> ⚠️ Indirect call 남발

```c
op_table[op_code]();   // 함수 포인터 — indirect branch mispredict 빈번
```

`switch`는 *jump table*로 컴파일되지만 *direct jump* — 일부 컴파일러는 BTB 친화적. Computed goto (`&&label`)도 옵션.

> ⚠️ Inline assembly로 branch 자제

```c
asm volatile ("b label");   // 직접 jump → mispredict 가능성 ↑ (BHT 학습 못 함)
```

컴파일러 자동 생성 branch보다 *덜 효율적*. 명시 이유 없으면 자제.

## 정리

- Mispredict 비용 = pipeline 깊이만큼 cycle 손실.
- Static BTFNT → 2-bit saturating → BTB + BHT + return stack.
- Cortex-A는 *tournament + indirect predictor*까지.
- PMU **BR_MIS_PRED**로 측정 — < 5% 목표.
- `__builtin_expect`·branchless·jump table 활용.

다음 편은 **Speculative Execution**.

## 관련 항목

- [2-02: Pipeline Stall](/blog/embedded/performance-engineering/part2-02-pipeline-stall)
- [2-04: Speculative Execution](/blog/embedded/performance-engineering/part2-04-speculative-execution)
