---
title: "Branch Prediction 분석 — Static·2-bit·BTB·BHT·Mispredict 비용"
date: 2026-04-24T09:02:00
description: "BTFNT, 2-bit saturating counter, BTB·BHT. Mispredict 10-20 cycle. PMU BR_MIS_PRED."
series: "Embedded Performance Engineering"
seriesOrder: 11
tags: [cpu, branch, prediction, btb, bht]
draft: false
---

## 한 줄 요약

> **"Branch prediction = pipeline 살리는 트릭"** 입니다. mispredict 시 *전체 flush*가 일어납니다.

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

깊은 pipeline일수록 예측 실패 비용이 커집니다. Modern CPU에서 mispredict는 cache miss와 비슷한 비용을 갖습니다.

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

Loop은 대부분 taken이고 error path는 대부분 not-taken이라, 통계적 hit rate가 약 70%입니다.

ARM Cortex-M0/M3는 pure static 방식입니다. Branch instruction 자체가 backward·forward를 판별할 수 있습니다.

## Dynamic — 1-bit Predictor

```text
last_branch_taken → 1
last_branch_not_taken → 0
predict = last result
```

```c
for (int i = 0; i < 10; i++) { ... }   // 9 taken + 1 not-taken
```

루프 끝에서 두 번 mispredict가 발생합니다 (taken→not-taken 전환과 다음 루프 시작 not-taken→taken). 정확도는 70-80%입니다.

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

루프 끝에서 한 번만 mispredict가 발생합니다. 한 번의 예외로 바로 flip되지 않기 때문입니다. 정확도는 85-95%입니다.

## BHT (Branch History Table)

각 branch PC를 index로 2-bit counter를 저장합니다.

```text
PC (12-bit hash) → Index → 2-bit counter
```

크기는 보통 1k~16k entry입니다. ARM Cortex-A53은 256 entry × 4-way set associative 구조를 갖습니다.

## BTB (Branch Target Buffer)

분기 주소뿐 아니라 대상 주소도 캐시합니다.

**PC → BTB entry:**

- { target_addr, predict_bits }

분기 명령 fetch 시점에 BTB hit이면 바로 target fetch가 이루어집니다. 1 cycle도 잃지 않습니다.

## Global History — Two-Level Adaptive (gshare)

```text
last 8 branches taken? → 8-bit history register

index = (PC ^ history) mod table_size
```

**상관관계 학습**입니다. `if (a) {} if (b) {} if (a && b) {}` 패턴에서 c의 결과를 a·b 결과로 예측합니다.

Cortex-A72는 *Tournament predictor*를 씁니다 (local + global을 모두 두고 동적으로 선택).

## Indirect Branch — Function Pointer·vtable

```c
void (*handler)(int) = handlers[type];
handler(arg);    // indirect branch — target 가변
```

BTB 한 entry는 최근 target만 기억합니다. 가변이면 mispredict가 빈번해집니다.

해결책은 *Indirect Branch Predictor*입니다 (Cortex-A72의 별도 hardware).

## Return Address Stack

```c
function_a();   // call → push return addr to stack
   /* ... */
   return;      // pop stack → predict return target
```

별도의 *return stack*을 둡니다 (8~16 entry). Function call/return은 거의 완벽하게 예측됩니다.

깊은 recursion이 stack을 초과하면 mispredict가 발생합니다.

## Cortex-M3/M4 — Limited Prediction

```c
; Cortex-M3 prediction
beq label       ; static prediction만 (BTFNT 기본)
bx lr           ; return — *prediction 없음*, 항상 flush
```

Cortex-M3는 branch 자체에 prefetch buffer를 둡니다. mispredict는 2 cycle이고 그 외 hit은 0 cycle입니다.

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

Mispredict를 회피하는 기법입니다. 다만 modern OoO에서 predict가 잘 되면 branchless가 더 빠르지 않을 수 있어 **측정이 우선**입니다.

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

컴파일러가 *forward branch arrangement*를 hint대로 배치합니다. 일부 ARM에서는 *static prediction*에도 영향을 줍니다.

## Spectre — Branch Prediction의 어두운 면

```c
if (x < array_size) {            // mispredict → speculative execution
    y = array[secret_offset];    // 실행되지만 commit 안 됨
                                  // 그러나 *cache state 변경* → side channel
}
```

CVE-2017-5754 Meltdown·Spectre 계열입니다. ARM에서도 Cortex-A75 이상에서 영향이 있습니다. 완화 기법으로는 `csdb` barrier와 KAISER 기법이 있습니다.

## 자주 하는 실수

> ⚠️ `volatile`로 mispredict 회피 시도

`volatile`은 컴파일러 재정렬 차단입니다. branch prediction과는 무관합니다.

> ⚠️ 짧은 if-else로 무조건 branchless

```c
if (rare_case) special_path();   // ← 1% taken
```

99% predict가 성공하면 mispredict 비용은 적습니다. Branchless가 항상 빠른 것은 아닙니다.

> ⚠️ Indirect call 남발

```c
op_table[op_code]();   // 함수 포인터 — indirect branch mispredict 빈번
```

`switch`는 *jump table*로 컴파일되지만 direct jump 형태라 일부 컴파일러는 BTB 친화적으로 처리합니다. Computed goto (`&&label`)도 옵션으로 쓸 수 있습니다.

> ⚠️ Inline assembly로 branch 자제

```c
asm volatile ("b label");   // 직접 jump → mispredict 가능성 ↑ (BHT 학습 못 함)
```

컴파일러가 자동으로 생성한 branch보다 덜 효율적입니다. 명시적인 이유가 없으면 자제합니다.

## 정리

- Mispredict 비용은 pipeline 깊이만큼 cycle을 손실합니다.
- Static BTFNT에서 2-bit saturating, BTB + BHT + return stack 순으로 발전합니다.
- Cortex-A는 *tournament + indirect predictor*까지 지원합니다.
- PMU **BR_MIS_PRED**로 측정하며, 목표는 5% 미만입니다.
- `__builtin_expect`·branchless·jump table을 적극 활용합니다.

다음 편은 **Speculative Execution**입니다.

## 관련 항목

- [2-02: Pipeline Stall](/blog/embedded/performance-engineering/part2-02-pipeline-stall)
- [2-04: Speculative Execution](/blog/embedded/performance-engineering/part2-04-speculative-execution)
