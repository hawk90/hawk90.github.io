---
title: "Branch Prediction 분석 — Static·2-bit·BTB·BHT·Mispredict 비용"
slug: "embedded/performance-engineering/part2-03-branch-prediction"
date: 2026-04-24T09:02:00
description: "BTFNT, 2-bit saturating counter, BTB·BHT와 Cortex-A53의 실제 예측기 구성을 보고, M2 Pro에서 mispredict 비용과 패턴 학습 한계를 측정합니다."
series: "Embedded Performance Engineering"
seriesOrder: 11
tags: [cpu, branch, prediction, btb, bht]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"Branch prediction = pipeline 살리는 트릭"** 입니다. mispredict 시 *전체 flush*가 일어납니다.

## Mispredict 비용 — 측정

분기 예측이 틀리면 그 뒤로 미리 가져와 진행하던 명령을 버리고 올바른 주소부터 다시 시작합니다. 이 비용은 코어마다 다르고, 이 시리즈에서 본 Cortex-A53 TRM과 Cortex-A72 SOG에는 mispredict penalty의 cycle 수가 나오지 않습니다. 그래서 M2 Pro에서 직접 쟀습니다.

배열 원소마다 조건 분기 하나를 실행하는 루프입니다. 컴파일러가 분기를 `csel`로 바꾸지 못하게 inline asm `tbz`로 분기를 강제했고, 분기 방향은 원소의 bit 0으로 정했습니다(`bench/br.c`, `clang -O2`, 65,536개 배열을 2,000번, 분기 131,072,000번).

```c
__asm__ volatile("tbz %w1, #0, 1f\n\tadd %0, %0, #1\n1:" : "+r"(cnt) : "r"(b));
```

| 패턴 | 분기당 cycle (3회) |
|---|---|
| 항상 같은 방향 | 2.05, 2.06, 2.06 |
| 무작위 (taken 50%) | 9.95, 9.94, 9.94 |

무작위 쪽은 분기가 not-taken일 때 `add`를 하나 더 실행하므로 명령어가 6.7억에서 7.4억으로 10% 늘지만, cycle은 4.8배가 되어 분기당 7.9 cycle 더 걸립니다. 무작위 50% 분기를 예측기가 절반쯤 틀린다고 보면, 틀린 예측 하나에 대략 16 cycle입니다. 이 값은 한 코어, 한 분기 형태에서 나온 추정이고, "50% 틀림"이라는 가정이 들어 있습니다. 하드웨어 카운터(`BR_MIS_PRED`)로 실제 mispredict 수를 세면 가정 없이 나눌 수 있지만, macOS의 `time -l`은 그 카운터를 보여 주지 않고 Debian 게스트에는 PMU 카운터가 없습니다.

## 예측기는 패턴을 외운다

같은 프로그램에서 길이 P의 무작위 bit 패턴을 만들어 배열 전체에 반복해 깔았습니다. 패턴은 무작위지만 P 주기로 반복되므로, 예측기가 그 길이를 외울 수 있다면 다시 빨라져야 합니다.

| 반복 주기 P | 분기당 cycle (3회) |
|---:|---|
| 8 | 2.47, 2.39, 2.55 |
| 64 | 2.44, 2.43, 2.44 |
| 1,024 | 2.64, 2.64, 2.64 |
| 4,096 | 2.79, 2.70, 2.68 |
| 16,384 | 8.14, 7.70, 8.10 |
| 65,536 (반복 없음) | 9.95, 9.94, 9.94 |

M2 Pro의 예측기는 길이 4,096의 무작위 패턴까지는 거의 다 외웠고, 16,384에서는 대부분 놓쳤습니다. 이 결과에서 말할 수 있는 것은 이 코어의 분기 이력 용량이 이 분기 하나에 대해 4,096과 16,384 사이 어딘가라는 정도이고, 그 내부 구조는 Apple이 공개하지 않습니다. 아래 절의 고전적 예측기는 이런 패턴 학습이 어디서 오는지를 보여 주는 단순한 모델입니다.

## Static Prediction — BTFNT

**Backward Taken, Forward Not-Taken**. 분기 대상이 뒤쪽(주소가 작음)이면 taken, 앞쪽이면 not-taken으로 예측합니다. 루프의 back-edge는 뒤쪽 분기이고 대부분 taken이므로 이 규칙이 맞습니다.

```c
for (int i = 0; i < N; i++) {   // back-edge: backward → predict taken
    // loop body
}

if (rare_error) {                // forward → predict not-taken
    handle_error();
}
```

Cortex-M7 TRM(DDI 0489D) 1.2.2는 Prefetch Unit에 Branch Target Address Cache(BTAC)가 있고, BTAC를 구성하지 않은 경우에는 static branch predictor를 쓴다고 적습니다.

## Dynamic — 1-bit와 2-bit 예측기

1-bit 예측기는 지난번 결과를 그대로 다음 예측으로 씁니다. 2-bit 포화 카운터는 taken이면 1 증가, not-taken이면 1 감소하고(0과 3에서 멈춤), 2 이상이면 taken으로 예측합니다. 두 예측기를 `for (i = 0; i < 10; i++)`의 back-edge(taken 9번, not-taken 1번)에 100번 돌려 보았습니다(`bench/predsim.py`, strongly not-taken에서 시작).

| 예측기 | 1,000번 중 mispredict | 정답률 | 안정 상태에서 루프 1회당 |
|---|---:|---:|---:|
| 1-bit | 200 | 80.0% | 2번 |
| 2-bit | 102 | 89.8% | 1번 |

1-bit는 루프 끝의 not-taken에서 한 번 틀리고, 그 결과를 기억한 탓에 다음 진입의 첫 taken에서 또 틀립니다. 2-bit는 한 번의 not-taken으로 taken 쪽에서 내려오지 않으므로 루프 끝에서 한 번만 틀립니다.

## BHT·BTB·Return Stack — Cortex-A53의 실제 구성

교과서는 분기 PC로 인덱싱하는 카운터 표를 BHT(Branch History Table), 분기 대상 주소를 기억하는 캐시를 BTB(Branch Target Buffer)라고 부릅니다. 최근 분기 결과들의 이력(global history)을 PC와 섞어 인덱스로 쓰면, 위 측정처럼 앞선 분기들의 패턴에 따라 다른 카운터를 고를 수 있습니다.

Cortex-A53 TRM(DDI 0500E) 2.1.1 "Instruction Fetch Unit"은 A53의 구성을 이렇게 적습니다.

| 구성 요소 | A53 TRM 2.1.1의 설명 |
|---|---|
| Branch Target Instruction Cache (BTIC) | 1 entry. 명령 캐시 fetch 두 번 분량을 담아, taken으로 예측한 분기 뒤의 빈 cycle을 없앰 |
| Branch Target Address Cache (BTAC) | 256 entry. *간접* 분기의 대상 주소를 예측 |
| Branch predictor | global 방식. branch history register와 3,072 entry pattern history table 사용 |
| Return stack | 8 entry. 호출마다 복귀 주소를 push하고, 복귀를 인식하면 pop해 예측 주소로 씀 |

네 가지 모두 "architecturally transparent"라서 context switch 때 flush할 필요가 없다고 같은 절이 덧붙입니다.

## Indirect Branch — Function Pointer·vtable

```c
void (*handler)(int) = handlers[type];
handler(arg);    // indirect branch — target이 바뀜
```

간접 분기는 방향이 아니라 *대상 주소*를 예측해야 합니다. A53에서는 위 표의 256 entry BTAC가 이 일을 합니다. `switch`를 jump table로 컴파일한 것도 표에서 주소를 읽어 뛰는 간접 분기이므로 같은 예측기를 씁니다.

## Return Address Stack

```c
function_a();   // call → 복귀 주소 push
   /* ... */
   return;      // 복귀 → pop한 주소로 예측
```

A53의 return stack은 8 entry입니다. 깊이가 이를 넘을 때의 동작은 TRM 2.1.1에 나오지 않습니다.

## Cortex-M4 — 분기 비용

Cortex-M4 TRM(DDI 0439B) 표 3-1에서 조건 분기 `B<cc>`는 "1 or 1 + P" cycle이고, 각주 c에 따르면 분기하지 않으면 1 cycle입니다. 무조건 분기 `B`와 `BL`은 1 + P cycle입니다. P는 pipeline refill에 드는 cycle로, 같은 표의 정의에 따르면 대상 명령의 정렬과 폭, 그리고 프로세서가 주소를 일찍 추측했는지에 따라 1~3입니다. 이 글에서는 보드로 재지 않았습니다.

## 측정 — PMU Event

Cortex-A53 TRM 12.9절 표 12-28의 분기 관련 이벤트입니다.

| Event | A53 TRM의 설명 |
|---|---|
| `0x10` BR_MIS_PRED | Mispredicted or not predicted branch speculatively executed |
| `0x12` BR_PRED | Predictable branch speculatively executed |
| `0xC9` | Conditional branch executed |
| `0xCA` | Indirect branch mispredicted |
| `0xCC` | Conditional branch mispredicted |

Linux perf의 일반 이벤트 `branch-misses`는 Armv8 PMU에서 `BR_MIS_PRED`에 매핑됩니다(Linux 6.12 `drivers/perf/arm_pmuv3.c` 49행).

```bash
perf stat -e branches,branch-misses ./prog
```

이 시리즈의 게스트에는 PMU 카운터가 없어 실행하지 못했습니다(1-01).

## Branchless Code

```c
int max_if(int a, int b) {
    if (a > b) return a;
    else return b;
}
```

`max_if`를 컴파일러에 맡기면 이미 분기가 없습니다. `clang -O2`(arm64)는 `cmp w0, w1; csel w0, w0, w1, gt`, `arm-none-eabi-gcc` 16.2(`-mcpu=cortex-m4 -O2`)는 `cmp r0, r1; it lt; movlt r0, r1`을 냈습니다(`bench/maxb.c`).

손으로 쓴 비트 트릭은 오히려 위험합니다.

```c
int max_mask(int a, int b) {
    int diff = a - b;          // a, b가 멀면 signed overflow (UB)
    int mask = diff >> 31;
    return b + (diff & ~mask);
}
```

`max_mask(INT_MAX, -1)`을 `-fsanitize=undefined`로 돌리면 `signed integer overflow: 2147483647 - -1 cannot be represented in type 'int'`가 나오고, 결과는 `-1`로 틀립니다. 분기를 없애는 일은 컴파일러에게 맡기고, 생성된 코드를 확인합니다.

조건부 실행이 항상 이득도 아닙니다. Cortex-A72 Software Optimization Guide(UAN 0016A) 4.2절은 조건부 명령이 목적 레지스터를 통해 앞 명령에 의존하게 되는 예(`MULEQ`/`MULNE`)를 들고, 조건이 예측하기 쉬우면 조건부 실행이 오히려 손해이고 예측하기 어려우면 이득이라고 적습니다. 그래서 Arm은 latency 2 cycle 이하의 정수 명령, load, store에만 조건부 형태를 고려하라고 권합니다.

## __builtin_expect — 컴파일러 힌트

```c
#define likely(x)   __builtin_expect(!!(x), 1)
#define unlikely(x) __builtin_expect(!!(x), 0)

if (unlikely(rare_error)) {
    handle();
}
```

GCC 14.2 매뉴얼은 `__builtin_expect`가 컴파일러에 분기 예측 정보를 준다고 설명하면서, "programmers are notoriously bad at predicting how their programs actually perform"이므로 가능하면 실제 profile feedback(`-fprofile-arcs`, 1-08의 PGO)을 쓰라고 권합니다.

## Spectre — Branch Prediction의 어두운 면

```c
if (x < array_size) {            // 예측이 틀리면 추측 실행
    y = array2[array1[x] * 4096];  // 버려지지만 캐시에 흔적이 남음
}
```

Linux 문서 `Documentation/admin-guide/hw-vuln/spectre.rst`는 Spectre 변형을 CVE-2017-5753(Bounds check bypass, variant 1), CVE-2017-5715(Branch target injection, variant 2), CVE-2019-1125(variant 1 swapgs)로 정리합니다. 같은 문서는 variant 1 대책으로, 공격자가 영향을 줄 수 있는 포인터를 다루는 커널 코드에 "nospec" accessor 매크로를 써서 추측 load를 막는다고 적습니다. arm64에서 그 핵심인 `array_index_mask_nospec()`(`arch/arm64/include/asm/barrier.h` 88~102행)은 주석대로 "0 ≤ idx < sz이면 ~0UL, 아니면 0"인 마스크를 `cmp`/`sbc`로 만들고, 곧이어 `csdb()`(`hint #20`)를 실행합니다. Meltdown 대응인 PTI(이전 이름 KAISER)는 `Documentation/arch/x86/pti.rst`에 따로 설명되어 있으며 Spectre 대책과는 별개입니다. 2-04에서 이어서 다룹니다.

## 자주 하는 실수

> ⚠️ `volatile`로 mispredict 회피 시도

`volatile`은 컴파일러가 그 접근을 지우거나 합치지 못하게 할 뿐, 분기 방향의 예측 가능성과는 무관합니다.

> ⚠️ 짧은 if-else로 무조건 branchless

위 측정에서 같은 방향 분기는 루프 1회당 2.06 cycle, 4,096 주기로 반복되는 패턴도 2.7 cycle이었습니다. 예측이 맞는 분기는 싸므로, 무작위에 가까운 분기에만 branchless가 이득입니다.

> ⚠️ 간접 호출 남발

함수 포인터, vtable, jump table은 모두 간접 분기입니다. 대상이 자주 바뀌면 BTAC(A53은 256 entry) 예측이 틀립니다. 대상이 몇 개 안 되면 직접 비교 분기 몇 개가 나을 수 있지만, 측정으로 정합니다.

## 정리

- M2 Pro에서 무작위 분기는 분기당 9.9 cycle, 같은 방향 분기는 2.1 cycle이었습니다. 50% 오예측을 가정하면 오예측 하나에 약 16 cycle입니다.
- 같은 코어는 길이 4,096의 무작위 패턴까지 외웠고 16,384에서는 놓쳤습니다.
- 2-bit 카운터는 10회 루프에서 1-bit의 절반만 틀립니다(시뮬레이션 102 대 200).
- Cortex-A53은 global 예측기(3,072 entry PHT), 256 entry BTAC, 8 entry return stack을 갖습니다(TRM 2.1.1).
- 분기 제거는 컴파일러에 맡기고(`csel`, `it`), 손으로 쓴 비트 트릭은 overflow를 확인합니다.

다음 편은 **Speculative Execution**입니다.

## 관련 항목

- [2-02: Pipeline Stall](/blog/embedded/performance-engineering/part2-02-pipeline-stall)
- [2-04: Speculative Execution](/blog/embedded/performance-engineering/part2-04-speculative-execution)

## 참고 자료

- Cortex-A53 MPCore Technical Reference Manual (DDI 0500E) 2.1.1, 12.9 표 12-28
- Cortex-M7 Technical Reference Manual (DDI 0489D) 1.2.2; Cortex-M4 Technical Reference Manual (DDI 0439B) 표 3-1
- Cortex-A72 Software Optimization Guide (UAN 0016A) 4.2
- [GCC 14.2 Other Builtins (`__builtin_expect`)](https://gcc.gnu.org/onlinedocs/gcc-14.2.0/gcc/Other-Builtins.html)
- Linux v6.12 `Documentation/admin-guide/hw-vuln/spectre.rst`, `arch/arm64/include/asm/barrier.h`, `Documentation/arch/x86/pti.rst`
