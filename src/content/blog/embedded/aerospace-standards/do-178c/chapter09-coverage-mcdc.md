---
title: "Ch 9: Coverage Analysis — Statement, Decision, MC/DC 완전 해부"
date: 2026-05-18T10:00:00
description: "MC/DC truth table 작성, 도구 검출, untestable code 처리, structural coverage analysis."
tags: [do-178c, coverage, mc-dc, statement, decision, truth-table, structural]
series: "DO-178C"
seriesOrder: 9
draft: true
---

DO-178C DAL A에서 *가장 비용 큰 항목*이 *MC/DC 100%*. *Modified Condition/Decision Coverage*는 *각 조건이 독립적으로 결과에 영향*을 미치는지 *수학적으로 입증*. 이 장은 *MC/DC truth table 작성, 도구 검출, untestable code 처리*까지.

## Coverage 3 단계

```
Level 1: Statement Coverage
  - 모든 line이 *최소 1번 실행*
  - 가장 약함

Level 2: Decision Coverage (Branch Coverage)
  - 모든 if/while/for의 *true와 false* 양쪽 실행
  - Statement Coverage 100%를 포함

Level 3: Modified Condition/Decision Coverage (MC/DC)
  - 각 boolean 조건이 *독립적으로 결과에 영향*
  - Decision Coverage 100%를 포함
  - 가장 엄격 (DAL A 의무)
```

## DAL별 Coverage 요구

| DAL | Statement | Decision | MC/DC | Data Coupling | Control Coupling |
|-----|-----------|----------|-------|---------------|------------------|
| A | 100% | 100% | **100%** | ✓ | ✓ |
| B | 100% | 100% | - | ✓ | ✓ |
| C | 100% | - | - | - | - |
| D | - | - | - | - | - |

DAL D는 *coverage 면제*. DAL C는 *statement만*. DAL B는 *decision*. DAL A는 *MC/DC*.

## Statement Coverage — 가장 단순

각 *실행 가능한 statement*가 *최소 한 번 실행*되었나.

### 예

```c
int abs_value(int x) {
    if (x < 0) {        // 1
        return -x;       // 2
    }
    return x;            // 3
}
```

```
Test 1: abs_value(5)
  실행: line 1, line 3
  → coverage: {1, 3}

Test 2: abs_value(-3)
  실행: line 1, line 2
  → coverage: {1, 2}

Combined: {1, 2, 3} = 100% statement
```

Test 2개로 *100% statement coverage*. 간단.

### 한계

```c
int divide(int a, int b) {
    if (b == 0) {        // 1
        return 0;         // 2 — 안전 fallback
    }
    return a / b;         // 3
}

// Test 1: divide(10, 2) → {1, 3} (line 2 안 실행)
// Test 2: divide(0, 0)  → {1, 2} (line 3 안 실행)
// 결합: 100% statement
```

OK처럼 보임. 하지만 *line 1의 if 조건이 true/false 양쪽 검증되었나*? Statement coverage는 *그것은 모름*. Decision coverage가 필요.

## Decision Coverage (Branch Coverage)

각 *결정 지점 (if, while, for, switch)*에서 *true와 false 양쪽*이 실행.

### 같은 예

```c
int divide(int a, int b) {
    if (b == 0) {        // decision: b==0
        return 0;
    }
    return a / b;
}
```

```
Decision: b == 0
  - true case:  Test 2 (b=0)
  - false case: Test 1 (b=2)
  → 양쪽 검증, decision 100%
```

Statement + Decision 둘 다 100%.

### 더 복잡한 예

```c
int classify(int x, int y) {
    if (x > 0 && y > 0) {       // decision: x>0 && y>0
        return 1;
    }
    if (x < 0 || y < 0) {        // decision: x<0 || y<0
        return -1;
    }
    return 0;
}
```

```
Decision 1: x > 0 && y > 0
  - true:  Test (1, 1)
  - false: Test (-1, -1)

Decision 2: x < 0 || y < 0
  - true:  Test (-1, -1)
  - false: Test (0, 0)

Tests needed:
  (1, 1)    → decision1=true,  decision2=false, returns 1
  (-1, -1)  → decision1=false, decision2=true,  returns -1
  (0, 0)    → decision1=false, decision2=false, returns 0

3 test cases → 100% decision
```

Decision은 *전체 조건의 평가 결과*. 개별 조건은 보지 않음.

## MC/DC — Modified Condition/Decision Coverage

**핵심 정의**: *각 조건이 결과에 독립적으로 영향*을 미치는 case가 *모두 검증*되어야.

### 단순 조건의 MC/DC

```c
if (a) { ... }
```

- a=true → result=true
- a=false → result=false

Test 2개로 *MC/DC 100%*. (Decision Coverage와 동일.)

### 복합 조건의 MC/DC

```c
if (a && b) { ... }
```

Decision Coverage 요구:
- (a, b)=(true, true) → result=true
- (a, b)=(false, ?)   → result=false

2개 test로 충분 (decision).

MC/DC 요구:
- *a의 독립 영향*: a 바꿨을 때 result 바뀌는 케이스
- *b의 독립 영향*: b 바꿨을 때 result 바뀌는 케이스

```
Test  a      b      result
─────────────────────
T1    T      T      T
T2    F      T      F        ← T1 vs T2: a만 다름, result 바뀜 → a의 영향
T3    T      F      F        ← T1 vs T3: b만 다름, result 바뀜 → b의 영향
T4    F      F      F
```

T1, T2, T3 *3 cases*로 MC/DC 100%. T4는 불필요.

**MC/DC test 수의 추정**: n 조건에 *n+1* test case 최소.

### Truth Table 작성

복잡한 조건은 *truth table*로 분석.

```c
if (a && (b || c)) { ... }
```

```
모든 가능한 조합 (2^3 = 8):

#   a  b  c  | result | 비고
─────────────────────────
1   T  T  T  |   T    |
2   T  T  F  |   T    |
3   T  F  T  |   T    |
4   T  F  F  |   F    | a=T but b∨c=F
5   F  T  T  |   F    |
6   F  T  F  |   F    |
7   F  F  T  |   F    |
8   F  F  F  |   F    |
```

각 조건의 *독립 영향* 입증할 쌍 찾기.

**a의 독립 영향:**

- b와 c 동일, a만 다름, result 바뀜
- T1 (TTT, T) vs T5 (FTT, F): ✓
- T2 (TTF, T) vs T6 (FTF, F): ✓
- T3 (TFT, T) vs T7 (FFT, F): ✓

**b의 독립 영향:**

- a와 c 동일, b만 다름, result 바뀜
- T1 (TTT, T) vs T3 (TFT, T): result 동일! 영향 없음
- T2 (TTF, T) vs T4 (TFF, F): ✓

**c의 독립 영향:**

- a와 b 동일, c만 다름, result 바뀜
- T1 (TTT, T) vs T2 (TTF, T): result 동일! 영향 없음
- T3 (TFT, T) vs T4 (TFF, F): ✓

### Minimal Test Set

여러 후보 중 *최소 test 수* 선택:

```
선택: T1 (TTT), T2 (TTF), T3 (TFT), T4 (TFF), T5 (FTT)

검증:
  a: T1 vs T5 → 독립 영향 ✓
  b: T2 vs T4 → 독립 영향 ✓
  c: T3 vs T4 → 독립 영향 ✓

5개 test로 MC/DC 100% (3 조건 → 4 test 최소, 1 추가 필요)
```

n 조건 = n+1 test 최소. 하지만 *실제로는 더 많이 필요*한 경우 흔함.

### 더 복잡한 예 — XOR-like

```c
if ((a && b) || (c && d)) { ... }
```

```
4 조건 → 5 test 최소 추정.
실제 분석:
  truth table 2^4 = 16 행
  각 조건의 독립 영향 입증
  최소 5-6 test 필요

a의 영향 (T1 vs T2): b, c, d 같고 a만 다름 + result 바뀜
b의 영향: a=T 고정 (b만 의미), c=d=F
c의 영향: a=b=F (c, d만 의미), d=T 고정
d의 영향: a=b=F, c=T 고정
```

수동 분석 *극히 복잡*. 도구 사용 필수.

## MC/DC 도구

### VectorCAST

```bash
# Instrument source
vcst instrument src/pitch_controller.c

# Run tests
vcst run TC-PFC-103-001 TC-PFC-103-002 ...

# Coverage report
vcst report --coverage mc/dc
```

```
=== Coverage Report — pitch_controller.c ===

Function: pitch_pid_compute()
  Statement Coverage:   100% (45/45)
  Decision Coverage:    100% (22/22)
  MC/DC:                100% (18/18)

Function: pitch_pid_validate()
  Statement Coverage:   95% (38/40)
  Decision Coverage:    87% (13/15)
  MC/DC:                72% (8/11)  ← Failed

  Uncovered:
    Line 23: condition (a && b) where a varies but b constant in all tests
    Line 56: condition (x || y || z) where x and y always same
```

도구가 *어느 case 부족*인지 정확히 지적. *추가 test 작성*.

### LDRA Testbed

```bash
# Configure project
ldra configure --target dar mc/dc

# Build instrumented
ldra build

# Test execution
ldra run-tests

# Report
ldra report --format html
```

LDRA는 *항공 산업 광범위 사용*. 다수 대형 프로그램에 적용 사례 공개. 자세히는 [ldra.com](https://ldra.com/).

## MC/DC 적용 — 실제 코드

### 항공 코드 예 — Stall Warning

```c
// LLR-FCS-014b: pre-stall detection
bool is_pre_stall(float aoa, float threshold, int high_count) {
    if (aoa > 0.8f * threshold && high_count >= 3 && !is_inhibited()) {
        return true;
    }
    return false;
}
```

조건 분석:
- A: `aoa > 0.8f * threshold` (AoA exceeds 80% of threshold)
- B: `high_count >= 3` (3 consecutive samples)
- C: `!is_inhibited()` (not inhibited by other system)

3 조건 → 4 test 최소.

```
Tests:
  T1: A=T, B=T, C=T → true     (모든 만족)
  T2: A=F, B=T, C=T → false    (A 영향 입증, T1 vs T2)
  T3: A=T, B=F, C=T → false    (B 영향 입증, T1 vs T3)
  T4: A=T, B=T, C=F → false    (C 영향 입증, T1 vs T4)

4 test case로 MC/DC 100%.
```

### Test Implementation

```c
// tests/test_stall_warning.c

TEST(stall_warning, mcdc_T1_all_conditions_true) {
    set_inhibited(false);                           // C = !inhibited = T
    bool result = is_pre_stall(14.0f, 15.0f, 5);    // A: 14 > 12, T; B: 5≥3, T
    EXPECT_TRUE(result);                             // → true (T1)
}

TEST(stall_warning, mcdc_T2_aoa_below_threshold) {
    set_inhibited(false);                           // C = T
    bool result = is_pre_stall(10.0f, 15.0f, 5);    // A: 10 > 12, F; B: T
    EXPECT_FALSE(result);                             // → false (T2)
}

TEST(stall_warning, mcdc_T3_insufficient_count) {
    set_inhibited(false);
    bool result = is_pre_stall(14.0f, 15.0f, 2);    // A: T; B: 2≥3, F
    EXPECT_FALSE(result);                             // (T3)
}

TEST(stall_warning, mcdc_T4_inhibited) {
    set_inhibited(true);                             // C = !true = F
    bool result = is_pre_stall(14.0f, 15.0f, 5);    // A: T; B: T
    EXPECT_FALSE(result);                             // (T4)
}
```

4 tests로 *MC/DC 100% 입증*. *각 condition의 독립 영향 검증*.

## Short-Circuit Evaluation 이슈

C/C++의 `&&`/`||`은 *short-circuit*:

```c
if (a && expensive_call()) { ... }

// a == false면 expensive_call() *실행 안 됨*
```

MC/DC 도구는 *short-circuit 인식*해야. 그렇지 않으면 *false positive coverage*.

### Bitwise vs Logical

```c
// Logical (short-circuit)
if (a && b)        // b는 a가 true일 때만 평가

// Bitwise (no short-circuit)
if (a & b)         // 양쪽 모두 평가 — boolean으로 쓰면 위반 (MISRA)
```

MISRA Rule 10.1이 *bitwise를 boolean에 쓰는 것 금지*. Logical만 사용.

### Compiler Optimization Effect

```c
// 컴파일러가 short-circuit을 deduce
if (always_true_const && var) { ... }

// → 컴파일러가 (var)로 단순화
// → MC/DC: var 한 조건만 남음
// → Test: var=T, var=F 2개로 MC/DC 100% (도구가 이를 인지)
```

도구가 *compiler optimization 후 코드*를 분석. *Source-level과 다를 수 있음*.

## Untestable Code

일부 코드는 *test로 도달 불가능* — *방어적 fallback*, *impossible state*.

```c
void process(int x) {
    switch (x) {
        case STATE_A: handle_a(); break;
        case STATE_B: handle_b(); break;
        case STATE_C: handle_c(); break;
        default:
            assert(0);  // ← 도달 시 abort. Test 불가능 (assert가 abort)
            break;
    }
}
```

`default` 분기가 *모든 가능한 input에서 도달 안 됨*. *Coverage 100% 달성 불가*.

### Resolution — Structural Coverage Analysis (SCA)

DO-178C §6.4.4.3. *untestable code 정당화*.

```
=== Untestable Code Analysis SCA-2024-042 ===

File:     state_machine.c
Function: process()
Line:     45 (default branch with assert)

Coverage Status: Uncovered (cannot be reached by tests)

Reason: x is constrained by caller to {STATE_A, STATE_B, STATE_C}.
        Default branch is defensive code, only reachable on
        memory corruption or undefined behavior.

Mitigation:
  1. Caller validation: All callers of process() use enum which restricts
     x to defined values.
  2. Static analysis: Polyspace Code Prover confirms default unreachable
     in normal operation.
  3. Defensive value: assert() will halt system if somehow reached.

Conclusion: Default branch is necessary defensive code. Cannot be tested
           through normal means. Approved as untestable.

Approved:
  Module Owner:       J. Doe       2024-07-15
  Verification Lead:  S. Kim       2024-07-16
  SQA:                T. Park      2024-07-16
  FAA DER (DAL B):    Jim Wilson   2024-07-20
```

각 untestable line이 *별도 justification*. 심사관이 *case-by-case 승인*.

### Untestable Code 비율

**DAL A 시스템 권장:**

- Untestable code < 1% of total LoC

**DAL A 평균:**

- ~0.2% - 0.5% (잘 작성된 코드)

**Untestable이 5%+ 이면:**

- 코드 재설계 필요 (defensive 과다)

## Data Coupling & Control Coupling Coverage (A-7-9)

DAL A/B 의무. 모든 *coupling*이 *최소 1 test*에서 실행.

**Data Coupling Coverage:**

- 각 모듈 간 parameter passing이 test에 실행
- 각 global variable read/write가 test에 실행

**Control Coupling Coverage:**

- 각 모듈 간 function call이 test에 실행
- 각 function pointer 호출이 test에 실행

도구가 *coupling map 생성* + *test와 매칭*.

## Coverage at Different Levels

**Unit Test Level:**

- 각 함수의 *statement, decision, MC/DC*
- 가장 세밀

**Integration Test Level:**

- 모듈 간 *data coupling, control coupling*
- Less granular

**System Test Level (HIL):**

- HLR coverage (각 HLR이 적어도 1 test로 검증)
- Functional coverage

**요약:**

- Unit:        Structural coverage (MC/DC) 충족
- Integration: Coupling coverage 충족
- System/HIL:  Functional (HLR) coverage 충족

각 level의 coverage가 *서로 보완*. *모두 합쳐* DO-178C 71 obj 충족.

## MC/DC가 검출하는 실제 버그

MC/DC 100% 달성 과정에서 *수많은 버그 발견*.

### Real-world Bug Examples

**Bug 1**: Logic operator 오류

```c
// 의도
if (sensor_valid && reading_in_range) { use_reading(); }

// 코드 (오타)
if (sensor_valid || reading_in_range) { use_reading(); }
```

Decision coverage *통과 가능* (true/false 둘 다 발생). MC/DC가 *각 조건의 독립 영향* 입증 시 *다름* 검출.

**Bug 2**: 조건 순서

```c
// 의도
if (init_done && !shutdown_pending) { process(); }

// 코드 (잘못된 순서)
if (!shutdown_pending && init_done) { process(); }
```

동일 동작이지만 *short-circuit 순서*는 다름. `init_done = false` 시 *!shutdown_pending 평가 발생* — 미초기화 변수 읽을 수도. MC/DC 분석 시 *각 조건 평가 시점* 발견.

**Bug 3**: Dead branch

```c
if (always_true_in_practice && other_cond) {
    do_work();
}

// Test: always_true_in_practice = true (only practical case)
// other_cond의 독립 영향 입증: T vs F → result T vs F
// always_true_in_practice의 독립 영향 입증: T vs F → result T vs F
// 두 번째 입증 위해 *false case 만들어야* → 코드 의미 재검토 필요
```

MC/DC가 *논리적으로 도달 불가*한 case에 *test 요구*. *코드 재설계* 강제.

## Coverage in Aerospace — 일반 관찰

대형 항공 SW 프로그램의 *coverage 적용*은 일반적으로 다음 패턴:
- *Statement / Decision 100%* 목표
- *DAL A 부분에 MC/DC 100%*
- *Untestable code*는 정당화 보고서 다수
- *Test case 수십만 + 실행 시간 수개월*

각 프로그램의 *정확한 coverage 수치, 도구 stack, 인력*은 *공식 발표가 없는 한 추정 안 함*. Airbus 등 일부 대형 OEM은 *Astrée + MC/DC + DO-333 formal methods*의 *통합 verification stack* 적용 사례를 vendor 자료에 공개한 바 있다.

## Coverage 측정 비용

```
DAL A 100 KLoC 시스템:

Unit test 작성:       10 person-years
Integration test:      3 person-years
MC/DC 분석 + 갭 채움:  5 person-years
Coverage report 작성:  2 person-years
─────────────────────
Total:                20 person-years

Tool cost:           $200K (VectorCAST + qualification)
Hardware:            $50K (target boards for test)
HIL setup:           $5M (sharing 가능)
─────────────────
Total ~$5M only for coverage activity
```

DAL A의 *전체 verification 비용 $10M의 50%*가 coverage 활동.

## Coverage Report — 심사관 자료

```
=== Coverage Report — FMS Module ===

Period:        2024-06-01 to 2024-08-30
Build:         FMS-v2.0.0-build-12345
Test Runs:     247 unit tests + 89 integration + 35 HIL

Summary:
  Source Lines:       105,234
  Coverage Achieved:
    Statement:        100.00% (105,234 / 105,234)
    Decision:         100.00% (28,471 / 28,471)
    MC/DC:             99.94% (18,234 / 18,245)

  Untestable (SCA approved):
    11 conditions: see SCA-2024-040 through SCA-2024-050

  Justifications:
    All 11 untestable conditions documented and approved.

Coverage by Module:
  flight_control.c        100.00%   100.00%   100.00%   (45/45)
  navigation.c             100.00%   100.00%   100.00%   (32/32)
  guidance.c               100.00%   100.00%    99.80%   (28/28 - 1 SCA)
  attitude_control.c       100.00%   100.00%    99.92%   (12/12 - 1 SCA)
  fault_management.c       100.00%   100.00%    99.85%   (15/16 - 1 SCA)
  ...

Coverage by LLR:
  Total LLRs:              1,987
  LLRs with full coverage: 1,987 (100%)

Coverage by HLR:
  Total HLRs:                487
  HLRs with full coverage:   487 (100%)
  HLR-level test cases:      647

Anomalies:
  None.

Conclusion:
  DO-178C DAL A coverage requirements satisfied.
  All untestable code justified per SCA records.

Approved:
  Coverage Engineer:   M. Lee       2024-09-01
  Verification Lead:   S. Kim       2024-09-02
  SQA:                 T. Park      2024-09-03
  FAA DER:             Jim Wilson   2024-09-15
```

이 보고서가 *SOI 3 review*에 제출. *심사관이 sampling으로 직접 검증*.

## 도구 — 종합

**정상 MC/DC 도구 (DO-178C TQL-2 qualified):**

**1. LDRA Testbed**

- 항공 산업 광범위 사용
- Coverage + static analysis + test 통합
- 다수 대형 OEM 프로그램 적용 (vendor 공개)

**2. VectorCAST**

- 자동화 강함
- 항공·자동차 양쪽
- LDRA보다 약간 가벼움

**3. RTRT (IBM Rational Test RealTime)**

- 일부 OEM legacy

**4. Cantata (QA Systems)**

- 항공 적합, LDRA 자매사

**5. Parasoft C/C++ Test**

- 일반 commercial

**도구 미qualified (validation 필요):**

- gcov + lcov          : 오픈소스, host-side
- llvm-cov + GCC       : 컴파일러 통합 coverage
- bullseye              : 상용

ASIL D 인증은 *qualified tool 필수*. *LDRA 또는 VectorCAST*.

## 정리

- DO-178C는 *Statement, Decision, MC/DC* 3 단계.
- DAL A는 *MC/DC 100%* 의무.
- MC/DC: *각 조건이 결과에 독립적으로 영향*. n 조건 = n+1 test 최소.
- Truth table 작성으로 *minimal test set 도출*.
- Short-circuit, compiler optimization, bitwise 등 *세밀한 issue*.
- Untestable code는 *SCA로 정당화* — DAL A 평균 0.2-0.5%.
- Data Coupling / Control Coupling 도 coverage 대상 (DAL A/B).
- Tool: *LDRA, VectorCAST* qualified.
- DAL A coverage 활동만 *~$5M 비용 (100 KLoC)*.
- MC/DC가 *실제 로직 버그* 검출에 효과적.

## 다음 장 예고

10장은 *Configuration Management & SQA* — baseline 관리, change control, PR workflow, SQA audit.

## 관련 항목

- [Ch 8 — Verification (RAT)](/blog/embedded/aerospace-standards/do-178c/chapter08-verification-rat)
- [Ch 10 — CM & SQA](/blog/embedded/aerospace-standards/do-178c/chapter10-cm-sqa)
- [Ch 12 — Formal Methods (DO-333)](/blog/embedded/aerospace-standards/do-178c/chapter12-formal-methods-security)
- [VectorCAST](https://www.vector.com/int/en/products/products-a-z/software/vectorcast/)
- [LDRA Testbed](https://ldra.com/)
- [RTCA DO-178C §6.4 Software Verification Process](https://www.rtca.org/)
