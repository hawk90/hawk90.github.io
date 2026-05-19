---
title: "Ch 13: Formal Methods (DO-333)"
date: 2026-05-26T13:00:00
description: "DO-333 — model checking·deductive proof·abstract interpretation의 인증 자리."
series: "Developing Safety-Critical Software"
seriesOrder: 13
tags: [avionics, do-178c, do-333, formal-methods]
draft: true
---

## 한 줄 요약

> **"Formal method = 수학적 proof"** — testing 일부 대체 가능, 좁은 도메인.

## DO-333 — Formal Methods Supplement

```text
DO-333 (2011, RTCA):
  Title — Formal Methods Supplement to DO-178C
  
다루는 method:
  1. Abstract interpretation
  2. Model checking
  3. Theorem proving (deductive proof)
  
공통:
  Code·model의 *property*를 *수학적으로* verify
  Testing 대비 *all-paths* 분석
  
인증 위치:
  Testing·analysis의 *대체 또는 보완*
  특히 *robustness·timing·memory* property
```

DO-333 — *수학적 verification*의 인증 frame.

## 1. Abstract Interpretation

```text
Abstract interpretation:
  Sound static analysis
  All-paths over-approximation
  False positive 가능, false negative 없음
  
Properties detectable:
  - Runtime error
    - Buffer overflow
    - Division by zero
    - Integer overflow
    - Null pointer dereference
    - Use-after-free
    - Uninitialized read
  - Numerical accuracy
  - Dead code
  - Reachability

대표 tools:
  - Astrée (AbsInt) — Airbus 도입, A380·A340
  - Polyspace Code Prover (MathWorks)
  - Frama-C (CEA) — open source
  - PVS Studio
```

Sound = *false negative 0*. 진짜 안전.

## Astrée — Airbus Success

```text
Astrée (AbsInt):
  C·C++ static analyzer
  Sound abstract interpretation
  
Airbus 도입:
  A380·A340·A350 fly-by-wire SW
  RUNTIME ERROR 0 보장
  - No overflow
  - No division-by-zero  
  - No NULL deref
  - No infinite loop
  - No floating-point exception
  
효과:
  Testing 대비 *비용 절감 + 강한 보장*
  Real flight 사고 zero (관련 SW)
  
사용 절차:
  1. Code base 분석
  2. Iteration — false positive review
  3. Configuration tuning
  4. Final report — *runtime error 0* 또는 alarm list
```

Astrée — *flight-proven*. Avionics formal method 대표 사례.

## Polyspace Code Prover

```text
Polyspace Code Prover (MathWorks):
  Similar to Astrée
  Sound analysis
  
다른 점:
  Polyspace Bug Finder — heuristic (faster, less precise)
  Polyspace Code Prover — formal (slower, sound)
  
사용처:
  Boeing·Airbus·자동차
  ISO 26262·DO-178C
  Tool qualified TQL-4
  
Output:
  Each operation:
    Green — proven safe
    Red — proven error
    Orange — unknown
    Gray — unreachable
```

Color-coded — visual. Engineer 친화.

## 2. Model Checking

```text
Model checking:
  Finite-state model의 property를 exhaustive check
  Temporal logic property (LTL·CTL)
  
Properties verifiable:
  - Reachability (always·eventually)
  - Safety (never bad state)
  - Liveness (eventually progress)
  - Mutual exclusion
  - Deadlock-freeness
  - Protocol correctness
  
대표 tools:
  - SPIN (Stanford·Bell Labs) — Promela language
  - NuSMV
  - UPPAAL (real-time)
  - TLA+ (Lamport) — distributed system
  - SCADE Suite (synchronous)
```

State space exhaustive — *모든 path*. Combinatorial explosion 단점.

## Model Checking 예 — Mutex

```text
Property: "lock·unlock 항상 paired"

LTL: G(lock → F(unlock))
  G = always
  F = eventually
  
SPIN으로 verify:
  Promela model:
    proctype mutex_user() {
      lock;
      // critical section
      unlock;
    }
  
  → State space exhaustive
  → All paths가 lock→unlock 보장 확인
  → 또는 counter-example 제시
```

Concurrent code — model checking *강점*. RTOS·protocol verify.

## 3. Theorem Proving (Deductive Proof)

```text
Theorem proving:
  수학적 axiom·rule 기반 *정리 증명*
  Mechanized prover
  
Properties provable:
  - Functional correctness
  - Algorithm correctness (sort·crypto)
  - Type safety
  - Invariant
  - Refinement (high-level → low-level)
  
대표 tools:
  - Coq (INRIA) — functional, dependent types
  - Isabelle/HOL (Cambridge·TU München)
  - Lean (Microsoft Research)
  - SPARK Ada — Ada subset with proof
  - Frama-C + WP plugin
```

Theorem prover — *interactive*. 사람 + 자동화 결합.

## SPARK Ada — 인증 친화

```text
SPARK:
  Ada subset for formal verification
  AdaCore (commercial) + open source
  
특징:
  - Restricted Ada
  - Contract (precondition·postcondition·invariant)
  - Static analysis prove contract
  
사용처:
  - Eurofighter Typhoon
  - 일부 NASA mission
  - 자동차·철도
  - 정부·방산
  
예:
  function Compute_Altitude (Pressure : Float)
    return Float
    with Pre  => Pressure > 0.0,
         Post => Compute_Altitude'Result >= 0.0;
  
  Static prover가 *Post 증명*
```

SPARK — *Ada의 강점*. 인증 권장 사례.

## Frama-C — C Verification

```text
Frama-C (CEA·INRIA):
  C analysis framework
  여러 plugin:
    - Value (abstract interpretation)
    - WP (Weakest Precondition - theorem proving)
    - EVA (Evolved Value)
    - Slicing
    - Metrics
  
Open source + commercial 지원
  
사용처:
  Aerospace (CEA·Airbus 부분)
  Critical OS·driver
  
예:
  /*@ requires \valid(p);
      ensures *p == 42;
  */
  void set_value(int *p) {
      *p = 42;
  }
  
  → WP가 contract 증명
```

Frama-C — *open source 강점*. C에서 SPARK 유사.

## Formal Method 대체 가능 Objective

```text
DO-178C objectives 중 *formal method로 대체 가능*:

Testing 대체:
  - Robustness test (특정 property)
  - Boundary value test (abstract interpretation)
  - Equivalent class test (formal proof)
  
Analysis 대체 또는 보완:
  - Stack analysis (formal computation)
  - WCET (시간 abstract interpretation)
  - Resource analysis
  
Coverage:
  Formal method가 *all-paths* 분석
  → Object code coverage 대체 가능 (Level A)
  → 단 PSAC에 *명시 + agreed with FAA*
```

DO-333 사용 시 PSAC·SVP 명시 → FAA·EASA agreed.

## Formal Method 한계

```text
한계:
  - 좁은 domain
    제어·protocol·crypto — 가능
    UI·application — 어려움
    
  - Property 정의 어려움
    "안전하다" 정량 어려움
    Specification language 학습
    
  - Tool 성숙도
    Astrée·Polyspace·SPARK — mature
    Coq·Isabelle — niche
    
  - 비용
    Engineer 학습 (수개월~년)
    Tool license
    Iteration (false positive 해결)
    
  - State explosion (model checking)
    상태 수 폭증
    Abstraction 필요
```

Formal — *전 SW 적용 비현실*. 핵심 모듈만.

## Hybrid Approach

```text
실제 인증 strategy:

Layer 1 — Application code:
  Testing + coverage (traditional)
  
Layer 2 — Critical algorithm:
  Formal method (abstract interpretation 또는 proof)
  + Testing 보조
  
Layer 3 — Mathematical core:
  Theorem prover (Coq·SPARK)
  + Code generation
  
Layer 4 — Protocol·concurrency:
  Model checking (SPIN·UPPAAL)
  
Layer 5 — System integration:
  HIL test (formal 불가)
```

각 *layer 별 적합한 method*.

## NASA Pathfinder·Curiosity — Formal Use

```text
NASA JPL 형식적 검증 사례:

Cassini (1997 launch):
  Manual proof + extensive testing
  
Mars Pathfinder (1997):
  Priority inversion bug catch — model checking 활용
  
Mars Curiosity (2012):
  Lockheed JPL 협력
  SPIN·model checking for autonomy
  
SpaceX Crew Dragon (2020):
  C++ heavy + 자체 formal·static
  
SLS·Orion (current):
  NASA NPR 7150.2 Class A
  Formal method limited
```

NASA — formal method *연구·실사용*. JPL 강점.

## DO-333 산출물

```text
기본 DO-178C 산출물 + DO-333 추가:

Formal Analysis Plan:
  - Used formal methods
  - Tool
  - Properties to prove
  - Scope
  - Coverage

Formal Analysis Results:
  - Properties proved
  - Counter-examples
  - Analysis report
  - Tool output

Property Verification Trace:
  - HLR ↔ formal property ↔ proof

Tool Qualification:
  - DO-330 (Ch 9)
  - Astrée·Polyspace 등 vendor kit
```

DO-333 = *기존 + formal evidence*.

## Korean Formal Method

```text
KARI·한국 항공우주:
  Formal method 학습 단계
  Tool 도입 부족
  연구 기관 (KAIST·KIST) 일부
  
한화·LIG:
  Polyspace 도입 (자동차 영향)
  Astrée 검토
  
학계:
  KAIST formal methods 연구
  SoongSil·POSTECH 일부
  
방사청:
  Formal method 직접 요구 없음
  자체 verification 강조
```

한국 — *학계 + 일부 산업*. 도입 초기.

## Verification Power vs Cost

```text
Verification 방법별 power·cost:

Code review:    low cost, medium power
Unit test:      medium cost, medium power
System test:    high cost, medium power
MC/DC coverage: high cost, high power (specific)
Object coverage: very high, high power
Abstract int:   high cost, very high power (specific)
Model check:    very high, very high (specific)
Theorem proof:  extreme, ultimate power (limited scope)
```

Cost·power trade-off — *적재적소*.

## 자주 하는 실수

> ⚠️ Formal "전체 대체"

```text
"Formal method로 모든 verification 대체"
→ 비현실적
→ Application·UI 불가
```

→ Hybrid — 핵심에만.

> ⚠️ False positive 무절제

```text
Polyspace 결과 — 1000 alarms
→ 모두 무시
→ 진짜 결함 묻힘
```

→ Each alarm — *review·dismiss·fix·waive*.

> ⚠️ Tool qualification 누락

```text
SPARK·Astrée·Polyspace 사용
→ DO-330 qualification 미실시
→ Audit fail
```

→ Vendor kit + configuration.

> ⚠️ Property 잘못 정의

```text
"안전성 증명" — vague property
→ 무엇을 prove? unclear
```

→ Property 수학적·정량 명시.

## 정리

- DO-333 — *Formal Methods* supplement.
- **3 categories** — abstract interpretation, model checking, theorem proving.
- Astrée — Airbus *flight-proven*, runtime error 0.
- SPARK Ada — *contract-based*, 인증 친화.
- Frama-C — *open source C verification*.
- Testing 일부 *대체 가능* (PSAC·FAA 명시).
- Hybrid — 핵심 모듈에 formal, 나머지 traditional.
- 한국 — *학계·일부 산업*, 도입 초기.

다음 편은 **Certification Artifacts**.

## 관련 항목

- [Ch 12: Object-Oriented](/blog/embedded/avionics/developing-safety-critical/chapter12-oop)
- [Ch 14: Certification Artifacts](/blog/embedded/avionics/developing-safety-critical/chapter14-certification-artifacts)
