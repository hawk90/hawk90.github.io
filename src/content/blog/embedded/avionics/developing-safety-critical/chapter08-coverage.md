---
title: "Ch 8: Coverage — Statement·Decision·MC/DC"
date: 2026-05-18T08:00:00
description: "DAL별 structural coverage 요구 — statement·decision·MC/DC의 정의와 도구."
series: "Developing Safety-Critical Software"
seriesOrder: 8
tags: [avionics, do-178c, coverage, mc-dc]
draft: true
---

## 한 줄 요약

> **"Coverage = test 충분성 metric"** — DAL 별 *statement → decision → MC/DC*.

## DAL별 Coverage 요구

| Level | Coverage |
|---|---|
| A | MC/DC + Decision + Statement |
| B | Decision + Statement |
| C | Statement |
| D | None (requirements-based test only) |
| E | None |

DAL이 *상승할수록* coverage rigor 증가.

## Statement Coverage

**정의** — 각 *statement*가 1번 이상 실행.

```c
void f(int x) {
  int y = 0;           // S1
  if (x > 0) {
    y = 1;             // S2
  }
  printf("y=%d", y);   // S3
}
```

**Test**:

- x=5 → S1·S2·S3 실행 (S1·S2·S3 covered)
- x=-1 → S1·S3 실행 (S1·S3 covered)

**Required**: 2 test cases (모든 statement reached).

가장 약한 coverage. *false sense of safety*.

## Statement Coverage의 한계

```c
int divide(int a, int b) {
  return a / b;            // S1 — covered with b!=0
}

// Test: divide(10, 2) → 5 → PASS
// Statement coverage = 100%
// 그러나 divide(10, 0) → crash (not tested!)
```

100% statement — *모든 경로 검증 안 함*. Level C 한계.

## Decision Coverage

**정의** — 각 *decision* (if·while·for·case)이 true·false 양쪽으로 *최소 1번씩*.

```c
void g(int x) {
  if (x > 0) {        // decision
    printf("pos");
  } else {
    printf("neg");
  }
}
```

**Test**:

- x=5 → decision=true (true case)
- x=-1 → decision=false (false case)

**Required**: 2 test cases (모든 decision true·false).

Statement보다 *강함*. Level B 요구.

## Decision Coverage의 한계

```c
void h(int a, int b) {
  if (a > 0 && b > 0) {    // 복합 condition
    printf("ok");
  }
}

// Test 1: a=1, b=1 → decision=true
// Test 2: a=-1, b=1 → decision=false
// Decision coverage = 100%
// 그러나 b가 *실제로 영향 미치는지* 확인 안 됨
```

Compound condition에서 *부분*만 검증 가능. Level A 부족.

## MC/DC — Modified Condition/Decision Coverage

**정의** — 각 *condition*이 *독립적으로* decision outcome 결정.

**요구**:

1. Statement coverage 충족
2. Decision coverage 충족
3. 각 condition: 다른 condition fix 상태에서 해당 condition만 바꿔서 decision 변화 시연

예 — `if (A && B) { ... }`.

| A | B | decision | 의미 |
|---|---|---|---|
| T | T | T | — |
| T | F | F | B의 영향 확인 |
| F | T | F | A의 영향 확인 |
| F | F | F | — |

필요한 test (3 test cases):

- (T,T) → T
- (T,F) → F (B independent effect)
- (F,T) → F (A independent effect)

Level A 요구. Most rigorous structural coverage.

## MC/DC 예 — 더 복잡한 condition

`if (A || (B && C)) { ... }`. 각 condition 독립 영향 시연.

**A 영향** (B,C fix → A 변화):

- A=T,B=?,C=? → T
- A=F,B=F,C=? → F (또는 B=?,C=F)

**B 영향** (A=F, C=T fix → B 변화):

- A=F,B=T,C=T → T
- A=F,B=F,C=T → F

**C 영향** (A=F, B=T fix → C 변화):

- A=F,B=T,C=T → T
- A=F,B=T,C=F → F

총 4~5 test cases.

복합 조건 → MC/DC test case 수 증가. Level A의 *비용*.

## MC/DC vs Multiple Condition Coverage

**Multiple Condition Coverage (MCC)** — 모든 조건 조합 ($2^N$) 모두 cover. 예: `if (A && B && C)` → $2^3 = 8$ combinations 모두.

**MC/DC** — 각 condition independent 영향만. $N+1$ cases (보통) 충분.

DO-178C — *MC/DC* 채택 (MCC 너무 과함).

MC/DC = *효율적 + 강력*. F-22·F-35 등에 채택.

## Object Code Coverage

Level A — *object code* 분석 추가.

C source → assembly에서 컴파일러는 short-circuit 평가, branch prediction, optimization을 수행한다. Source coverage 100% ≠ Object coverage 100%.

예 — `if (a && b)` 컴파일 결과.

```text
cmp a, 0
je  .Lfalse
cmp b, 0
je  .Lfalse
; true case
```

4 branches → 4 object coverage 점.

Level A — *object coverage* 추가 검증.

## Coverage Tools

**Vector CAST (Vector)**:

- Unit·integration test
- Coverage (Statement·Decision·MC/DC)
- DO-178C qualified (TQL-1)
- Industry leader

**LDRA Testbed (LDRA)**:

- Coverage + static analysis
- DO-178C qualified
- 유럽 강세 (Airbus)

**Cantata++ (QA Systems)**:

- Unit test + coverage
- DO-178C qualified
- 자동차·항공·우주

**RapiTest·RapiCover (Rapita)**:

- Embedded target coverage
- Hardware accelerated
- Real target 측정

**Tessy (Razorcat)**:

- Unit test + coverage
- 자동차·항공

**SCADE Test (Ansys)**:

- SCADE 통합
- Model + code coverage

각 tool — *cost 수십만 달러*. Qualification 부담.

## Coverage 측정 — Instrumentation

Coverage tool 방식.

**Source instrumentation** — Compiler가 각 branch·decision에 counter 삽입. Test 실행 → counter 누적.

```c
void f(int x) {
  coverage_inc(F_S1);
  if (x > 0) {
    coverage_inc(F_S2);
    ...
  }
}
```

장점 — 정확. 단점 — overhead, timing 영향.

**Binary instrumentation** — 실행 코드 직접 modify. 덜 정확하지만 source 안 건드림.

**Hardware tracing** — ARM ETM·ETB·CoreSight. Object code coverage 측정. Real-time, no overhead.

방식 별 *trade-off*. Real target — hardware tracing.

## Coverage 분석 Report

```text
Vector CAST output 예:

Function: alt_filter_update
  Statement coverage: 95% (19/20)
  Decision coverage:  90% (9/10)
  MC/DC coverage:     85% (17/20)
  
Uncovered:
  Line 42: error path (out-of-range)
  Decision @ line 65: short-circuit false branch
  MC/DC @ line 78: A=F,B=T → not tested
  
Recommendation:
  TC-ALT-016: Test out-of-range input
  TC-ALT-017: Cover short-circuit case
  TC-ALT-018: Add B independent test
```

각 *uncovered* — *justify 또는 test 추가*.

## Coverage 한계 — Dead Code

"100% 도달 불가" — 두 종류.

1. **Dead code (제거)** — Unreachable code → 코드 수정 (제거 또는 reachable 만들기).
2. **Defensive code (justify)** — "Should never happen" branch. 예: switch default·assert·panic → coverage waiver + justification.

**DO-178C**:

- Dead code — *제거 의무*
- Defensive code — *문서화 + waiver*

Defensive code waiver — *증명 책임 author에*.

## Requirements-based Test와 Coverage 관계

**DO-178C 강조**:

- Coverage 100% ≠ test 충분
- Test = *requirement-based*가 본질
- Coverage = test가 *얼마나 깊이* 도달했는지

**순서**:

1. HLR·LLR → test case 작성
2. Test 실행 → coverage 측정
3. Coverage 부족 →
   - 더 많은 requirement-based test
   - 또는 더 많은 robustness test
   - Dead code (제거)
   - Defensive code (waive)

"coverage 채우기 위한 test" — 회피.

Coverage가 *목적이 아닌 결과*. Trace의 의미.

## Test·Coverage Tool 통합

**Workflow**:

1. Source code → coverage instrumentation:
   ```bash
   vcast --instrument source.c
   ```
2. Build instrumented binary:
   ```bash
   make -C build/instrumented
   ```
3. Run tests:
   ```bash
   vcast --run all-tests
   ```
4. Analyze coverage:
   ```bash
   vcast --coverage-report
   ```
5. Identify gaps — Add test, Justify defensive, Remove dead
6. Iterate
7. Final report

CI·CD 통합 — 매 commit coverage check.

## Korean Coverage Practice

**방사청 SW 신뢰성시험**:

- Test 결과 분석
- Coverage 측정 권장
- Level 상응 — *시험 강도 요구*

**KARI Flight SW (KSLV-II)**:

- C language
- Custom coverage tool 또는 GCOV
- Internal 분석

**한화·LIG**:

- Vector CAST 도입 추세
- DO-178C-style coverage

한국 — *coverage 인식 확산*. Tool 도입 진행 중.

## Coverage Cost·Effort

**Coverage achievement effort**:

| Coverage | Effort |
|---|---|
| Statement 100% | moderate effort |
| Decision 100% | significant effort |
| MC/DC 100% | very high effort |
| Object 100% (LvA) | extreme effort |

**Test case 수 (typical)**:

| Coverage | Multiplier |
|---|---|
| Statement-only | 1x baseline |
| + Decision | 1.5x |
| + MC/DC | 3-5x |
| + Object | 5-10x |

Level A 인증의 *코스트 주범*.

DAL A의 *경제 부담*. Architecture 단순화 + partition 활용.

## 자주 하는 실수

> ⚠️ Coverage 우선, requirement 후순위

"100% coverage 만들기" → Requirement-based test가 적음 → Test가 *artificial* → Audit 시 fail.

→ *Requirements-based test 먼저*.

> ⚠️ Tool 결과 무비판 수용

Vector CAST report 100% → Audit OK → 실은 instrumentation 오류 또는 test가 trivial.

→ *Manual review 병행*.

> ⚠️ Object code coverage 무시 (Level A)

Source 100% → 완료 → Object 60% (compiler 영향) → Level A fail.

→ *Object coverage 별도 측정*.

> ⚠️ Defensive code 무한정 waive

"Should never happen" — 모두 waive → Real bug catch 못함.

→ 각 waive *justify·문서화 + 적정성 review*.

## 정리

- DAL별 coverage — **Statement→Decision→MC/DC→Object**.
- **MC/DC** = 각 condition independent 영향 시연.
- 100% coverage ≠ test 충분 — *requirement-based 본질*.
- Tool — Vector CAST·LDRA·Cantata·RapiTest (모두 DO-330 qualified).
- Dead code — *제거*, Defensive — *waive 문서화*.
- Level A의 *주요 cost source*.
- 한국 — coverage 도입 진행 중.

다음 편은 **Tool Qualification (DO-330)**.

## 관련 항목

- [Ch 7: Verification](/blog/embedded/avionics/developing-safety-critical/chapter07-verification)
- [Ch 9: Tool Qualification](/blog/embedded/avionics/developing-safety-critical/chapter09-tool-qualification)
