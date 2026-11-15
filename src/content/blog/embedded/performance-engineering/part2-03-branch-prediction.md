---
title: "Branch Prediction 분석 — Static·2-bit·BTB·BHT·Mispredict 비용"
slug: "embedded/performance-engineering/part2-03-branch-prediction"
date: 2026-04-24T09:02:00
description: "BTFNT, 2-bit saturating counter, BTB·BHT. Mispredict 10-20 cycle. PMU BR_MIS_PRED."
series: "Embedded Performance Engineering"
seriesOrder: 11
tags: [cpu, branch, prediction, btb, bht]
draft: false
topics: ["embedded"]
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
| Cortex-M0/M3/M4 | 구현별 branch handling 확인 | target TRM과 측정 필요 |
| Cortex-M7 | six-stage dual-issue pipeline | mispredict cost는 target에서 확인 |
| Cortex-A / x86 | core별 pipeline·predictor 구현 | target TRM과 측정 필요 |

깊은 pipeline은 비용에 영향을 줄 수 있지만, mispredict penalty는 pipeline depth만으로 산출할 수 없습니다. cache miss와의 상대 비용 역시 workload와 target에서 측정합니다.

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

단순히 매번 taken인 loop가 끝에서 not-taken이 되면 predictor history와 재진입 시점에 따라 예측 결과가 달라집니다. accuracy 비율은 workload·predictor 상태에 따라 측정합니다.

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

루프 끝에서 한 번만 mispredict가 발생합니다. 한 번의 예외로 바로 flip되지 않기 때문입니다. 정확도는 branch 분포와 초기 predictor 상태에 따라 달라집니다.

## BHT (Branch History Table)

각 branch PC를 index로 2-bit counter를 저장합니다.

```text
PC (12-bit hash) → Index → 2-bit counter
```

크기는 보통 1k~16k entry입니다. Cortex-A53 예측기의 구체적인 크기·구성은 공개된 ISA의 보장으로 취급하지 않습니다. 코어 revision의 TRM 또는 vendor 자료가 없으면 구현별 세부값은 생략합니다.

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

Cortex-M3는 분기 target 쪽 명령을 speculative prefetch할 수 있습니다. branch cost는 target revision과 memory system에 따라 달라지므로 고정 cycle을 제시하지 않습니다.

## Cortex-A53 — 구현별 세부 사양 확인

| 항목 | 범위 |
|---|---|
| BTB·BHT·return stack | 구현 세부 사항이며 이 글에서 보편 사양으로 단정하지 않음 |
| 예측 폭·mispredict 비용 | 코어, 메모리 응답, branch 위치에 따라 달라짐; 대상 TRM과 측정으로 확인 |

## 측정 — PMU Event

| Event | 의미 |
|---|---|
| `0x10` BR_MIS_PRED | 잘못 예측한 분기 수 (architectural PMUv3 event) |
| `0x11` CPU_CYCLES | cycle counter event (구현·권한 설정 확인) |
| `0x12` BR_PRED | 분기 예측 이벤트; 대상에서 지원하는지 확인 |
| Return mispredict | event 매핑은 CPU/TRM 및 OS perf PMU driver에서 확인 |

```bash
# Linux perf
perf stat -e branches,branch-misses ./prog
# branch-miss-rate = branch-misses / branches
# 해석은 target workload와 branch mix를 함께 고려합니다.
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

CVE-2017-5754는 Meltdown로, Spectre v1/v2는 각각 CVE-2017-5753/5715로 보고되었습니다. 영향을 받는 코어와 완화책은 취약점 변형 및 구현에 따라 달라집니다. `CSDB`는 특정 speculation-sensitive 코드 패턴의 완화에 쓰일 수 있지만, KAISER/KPTI는 Meltdown 대응과 관련되며 일반적인 Spectre 대책으로 묶지 않습니다.

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

- Mispredict 비용은 pipeline 깊이만으로 결정되지 않습니다. 분기 해석 시점, fetch 재시작, 메모리 계층과 코어 구현을 확인하고 대상에서 측정합니다.
- Static BTFNT에서 2-bit saturating, BTB + BHT + return stack 순으로 발전합니다.
- Cortex-A는 *tournament + indirect predictor*까지 지원합니다.
- PMU event의 존재와 의미를 target TRM/perf driver로 확인해 분기 예측을 측정합니다.
- `__builtin_expect`·branchless·jump table을 적극 활용합니다.

다음 편은 **Speculative Execution**입니다.

## 관련 항목

- [2-02: Pipeline Stall](/blog/embedded/performance-engineering/part2-02-pipeline-stall)
- [2-04: Speculative Execution](/blog/embedded/performance-engineering/part2-04-speculative-execution)
