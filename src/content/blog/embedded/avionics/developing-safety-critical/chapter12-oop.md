---
title: "Ch 12: Object-Oriented (DO-332) — C++ in avionics"
date: 2026-05-18T12:00:00
description: "DO-332 — OO 기능의 인증 위험과 완화. C++의 avionics 자리."
series: "Developing Safety-Critical Software"
seriesOrder: 12
tags: [avionics, do-178c, do-332, oop, cpp]
draft: true
---

## 한 줄 요약

> **"OO 기능별 위험 + 완화"** — exception·dynamic dispatch는 제한 또는 금지.

## DO-332 — Object-Oriented Supplement

```text
DO-332 (2011, RTCA):
  Title — Object-Oriented Technology and Related 
  Techniques Supplement
  
다루는 언어:
  C++, Java, Ada (with OO), C#
  실제 avionics — *C++ 중심*
  
다루는 기능:
  - Inheritance
  - Polymorphism
  - Dynamic dispatch
  - Overloading
  - Exception handling
  - Templates
  - Type substitution (LSP)
  - Memory management (new·delete)
```

각 기능 — *risk + 완화*.

## OO 기능별 위험·완화

```text
Inheritance:
  Risk — 복잡한 type hierarchy
         Liskov 위반 시 unexpected behavior
  Mitigate — 깊이 제한 (보통 ≤3), interface 위주
  
Multiple Inheritance:
  Risk — Diamond problem, complexity
  Mitigate — *금지* (interface inheritance OK)
  
Polymorphism:
  Risk — Runtime decision, unpredictable
  Mitigate — Static dispatch 우선, 
             dynamic은 limited use
  
Dynamic Dispatch (virtual function):
  Risk — Coverage·analysis 어려움
         vtable overhead
  Mitigate — Coverage at each override
             Substitution analysis
  
Type Substitution (LSP):
  Risk — Sub-type이 base contract 위반
  Mitigate — Class invariant verification
  
Overloading:
  Risk — Ambiguity, reader confusion
  Mitigate — 제한적 사용, 명확 naming
```

각 기능 — *통제된 사용*.

## Exception — 사실상 금지

```text
Exception 위험:
  - Non-local control flow (unpredictable)
  - Coverage·analysis 매우 복잡
  - Stack unwinding overhead
  - Code size 증가 (exception table)
  - Real-time 영향 (예외 처리 시간 가변)
  
DO-332 입장:
  Exception 사용 가능, 단 *모든 path 분석*
  
실무:
  *Exception 사용 안 함* — 99%
  Compile -fno-exceptions
  Return code·status object 사용
  
예외 case:
  Throw/catch *없음*
  Operator new throw bad_alloc — 대체 new(nothrow)
```

C++ exception — *avionics에 부적합*. 거의 모든 표준 금지.

## Templates — Generic Programming

```text
Template 위험:
  - Code bloat (instantiation 다수)
  - Compile-time error 복잡
  - Coverage at instantiation level
  - Debug 어려움
  
DO-332 입장:
  Template 가능, 단 *각 instantiation* verify
  
실무:
  STL — 제한적 사용
    std::array — OK (no allocation)
    std::vector — 회피 (allocation)
    std::function — 회피
    
  자체 template — OK
    Generic container
    Type-safe wrapper
    constexpr 계산
```

Template — *zero-cost abstraction* 활용. 단 *instantiation 통제*.

## Memory Management — new·delete

```text
Dynamic memory 위험:
  - Heap fragmentation
  - Allocation failure (predictability ↓)
  - Free 추적 어려움
  - Real-time 보장 불가
  
DO-178C·DO-332 입장:
  *Init 이후 dynamic 회피*
  Init 단계만 허용
  
실무:
  - Static allocation
  - Memory pool (fixed-size)
  - Stack allocation
  - Placement new (in pre-allocated buffer)
  - new(nothrow) — fail check
  
대체:
  custom allocator (pool 기반)
  스토리지 별도 partition
```

C++ — *RAII + static lifetime* 위주.

## Modern C++ in Safety-Critical

```text
C++11·14·17·20 features 활용:

OK·권장:
  - auto (제한적)
  - constexpr
  - nullptr (NULL 대체)
  - override·final
  - enum class
  - Range-based for
  - std::array
  - std::optional
  - Smart pointer (unique_ptr OK, shared_ptr 주의)
  - Move semantics (제한적)
  - Initializer list
  
주의·제한:
  - std::variant (impl 복잡)
  - std::function (heap 사용)
  - std::any
  - std::async·thread (RTOS와 별개)
  
금지·회피:
  - Exception (try·catch·throw)
  - RTTI (typeid·dynamic_cast)
  - new·delete (after init)
  - std::vector·map·string (allocation)
  - new(throw)
```

Modern C++ — *safety subset* 형성. constexpr·RAII·type safety 활용.

## C vs C++ 선택

```text
C (전통):
  + 컴파일러 신뢰성
  + 명시적 (low surprise)
  + Coverage·analysis 쉬움
  + Tool ecosystem 성숙
  + 인증 history 길음
  
  - Abstraction 부족
  - Code duplication
  - Type safety 약함
  - Manual memory management
  
C++ (modern subset):
  + RAII (resource safe)
  + Abstraction (generic·OOP)
  + Type safety
  + constexpr·compile-time
  + Modern features productivity
  
  - 컴파일러 복잡
  - Coverage·analysis 어려움
  - 인증 history 짧음
  - C++ subset rule 학습
```

현실 — *Boeing·Airbus 새 program C++ 채택 증가*.

## C++ Adoption — 사례

```text
C/Ada 위주 (legacy):
  Boeing 737·747·777 — Ada·C
  Airbus A320·A330·A340·A380 — Ada·C
  Eurofighter Typhoon — Ada·C
  
C++ 채택 (modern):
  Boeing 787 — C++ subset
  Airbus A350·A220 — C++ + SCADE
  Lockheed F-35 — JSF C++ 2005
  Boeing 777X — C++17 subset
  
우주:
  SpaceX Crew Dragon — C++ heavy
  NASA Orion·SLS — C++14
  Mars Perseverance — C·C++ 혼합
  JWST — C++
  KSLV-II — C 위주

자동차 (인증 비교):
  AUTOSAR C++14 / MISRA C++ 2023
  ISO 26262 ASIL-D
```

C++ 추세 — *modern aerospace · 자동차 영향*.

## C++ 인증 패턴

```text
F-35 Pattern (JSF C++ 2005):
  C++03 subset
  No exception, no RTTI, no template
  Manual inheritance limit
  Static dispatch 우선
  
Modern Pattern (Boeing 787·A350):
  C++14·17 subset
  constexpr·smart pointer
  Limited template
  AUTOSAR·MISRA C++ 2023 derive
  
NASA Pattern (cFS·F-Prime):
  C (cFS), C++ (F-Prime)
  F-Prime — C++11
  Component framework
  Self-imposed subset
```

각 organization — 자체 subset.

## F-Prime — JPL C++ Framework

```text
F-Prime (F´):
  JPL 개발 — Mars helicopter Ingenuity 등 채택
  
특징:
  - C++11
  - Component-based
  - Topology (event-driven)
  - Code auto-gen from XML
  - Telemetry·command
  - Open source (Apache 2.0)
  
DO-178C status:
  Not directly certified
  자체 verification
  필요 시 user가 re-cert
  
구조:
  Component {
    Input port → input port handler
    Output port → output port handler
    Command port → command handler
    Telemetry port → telemetry update
  }
  
Topology:
  Components 연결
  Auto-generated boilerplate
```

F-Prime = NASA *modern C++ framework*. Open source 재사용.

## C++ Coverage 도전

```text
C++ specific coverage 도전:

Virtual function:
  Each override — coverage?
  → 모든 dynamic call site에서 가능한 모든 type
  
Template instantiation:
  Each instantiation — separate coverage?
  → 각 type별 generated code 검증
  
Implicit constructor·destructor:
  Compiler-generated code
  → Coverage tool이 catch
  
Operator overloading:
  Each operator — verify
  
RAII destructor:
  Exception path (보통 없음)
  Normal path
```

Tool — Vector CAST·LDRA C++ 지원. 단 complexity 증가.

## C++ Object Code Concerns

```text
Object code coverage (Level A):
  C++ → object code:
    - Constructor inlining
    - Virtual table
    - Template instantiation
    - Exception table (있다면)
    - RTTI table (있다면)
  
  → Object code 증가
  → Coverage 측정 어려움
  
완화:
  - -fno-exceptions, -fno-rtti
  - Final·override 사용 (devirtualization)
  - Template constraint
  - Manual inspection
```

C++ — Level A에 *추가 cost*. 그러나 abstraction 가치 보상.

## DO-332 추가 산출물

```text
DO-178C 산출물 + DO-332 추가:

Type Hierarchy Documentation:
  Class hierarchy
  Inheritance type (public·private·virtual)
  
Substitution Analysis:
  LSP 준수 verification
  Sub-type contract 적합성
  
Polymorphism Analysis:
  Each virtual function override
  Dynamic dispatch site analysis
  
Memory Lifecycle Documentation:
  Object lifetime
  Constructor·destructor sequence
  
Exception Handling Plan:
  사용 시 — 모든 throw·catch path
  미사용 시 — 명시 (-fno-exceptions)
```

OO = *추가 분석 부담*.

## Korean C++ in Aerospace

```text
KARI KSLV-II:
  C language 위주
  C++ — 자체 도구·simulator
  
한화에어로스페이스·KAI KF-21:
  C++ + C 혼용
  자동차 — AUTOSAR C++14
  방산 — 자체 subset
  
LIG넥스원:
  C++ — missile·radar
  Simulink autocode + manual C++
```

한국 — *C++ 도입 증가*. 자동차 → 항공·방산 학습.

## Coding Recommendations

```text
실무 best practice:

Class design:
  - Inheritance 깊이 ≤ 3
  - Interface 위주 (pure virtual)
  - Composition > inheritance
  - Override·final 명시
  - Rule of 0·5 (special member functions)

Functions:
  - const correctness
  - Reference > pointer (가능 시)
  - noexcept 명시
  - constexpr 적극

Memory:
  - Static·stack 우선
  - Smart pointer (unique_ptr 위주)
  - placement new (pool)
  - No raw new·delete (post-init)

Errors:
  - Return code 또는 expected<T,E>
  - No exception
  - assert (debug only)
```

C++ subset 정착 — *예측·검증·인증 가능*.

## 자주 하는 실수

> ⚠️ Modern C++ 욕심

```text
"std::vector·std::string·std::function — productive"
→ Heap allocation
→ Real-time·인증 부담
```

→ Subset rule + static container.

> ⚠️ Exception "안전 fallback"

```text
"try·catch로 fault handle"
→ Coverage·analysis 폭증
→ Unpredictable timing
```

→ -fno-exceptions + return code.

> ⚠️ RTTI 사용

```text
dynamic_cast·typeid
→ Runtime overhead·complexity
→ Coverage 어려움
```

→ -fno-rtti + design pattern.

> ⚠️ Template 무절제

```text
Heavy template metaprogramming
→ Compile time 폭증
→ Coverage·debug 어려움
```

→ Template 사용 *간단·local*.

## 정리

- DO-332 — *OO + Avionics* 통합 standard.
- Each OO feature — *risk + 완화*.
- Exception — *사실상 금지* (-fno-exceptions).
- C++ subset = JSF C++ 2005 → MISRA C++ 2023.
- Modern C++ — Boeing 787·A350·F-35·SpaceX 채택.
- F-Prime — JPL의 *open source C++ framework*.
- 한국 — *C++ 도입 증가*, KARI는 C 위주.

다음 편은 **Formal Methods (DO-333)**.

## 관련 항목

- [Ch 11: Model-Based Development](/blog/embedded/avionics/developing-safety-critical/chapter11-mbd)
- [Ch 13: Formal Methods](/blog/embedded/avionics/developing-safety-critical/chapter13-formal-methods)
- [Practical RTOS — C++ in RTOS](/blog/embedded/rtos/practical-internals/part4-13-cpp-in-rtos)
