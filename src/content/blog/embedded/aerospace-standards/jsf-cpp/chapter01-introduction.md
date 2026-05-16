---
title: "Ch 1: JSF C++ — F-35 코딩 표준의 모든 것"
date: 2025-09-30T02:00:00
description: "Lockheed Martin이 F-35 Joint Strike Fighter용으로 만든 *240+ rules*의 C++ 코딩 표준. 항공기 SW의 모범 사례이자 AUTOSAR C++14의 원형."
tags: [jsf-cpp, lockheed-martin, f-35, joint-strike-fighter, cpp, aerospace, dod]
series: "JSF C++"
seriesOrder: 1
draft: false
---

**JSF C++ Coding Standards** (Joint Strike Fighter Air Vehicle C++ Coding Standards)는 *Lockheed Martin*이 2005년 발행한 *F-35 (Joint Strike Fighter) 프로젝트용 C++ 코딩 표준*이다. *240+ rules*로 *modern C++의 안전 critical 부분집합*을 정의했고, *AUTOSAR C++14의 원형*이 됐다.

F-35는 *세계 최대 군사 항공 프로그램*. 미국 + 14개 파트너국 + 8개 도입국 운용. *25만 줄+ C++ 코드*가 *비행 제어, 센서 융합, 무기 시스템* 담당. 모든 코드가 *JSF C++ 100% 준수* + *DO-178B Level A 인증*.

## 출처

```
Full name : Joint Strike Fighter Air Vehicle C++ Coding Standards
            for the System Development and Demonstration Program
저자      : Lockheed Martin Corporation
발행      : 2005-12 (Document Number 2RDU00001 Rev C)
공개 PDF : 검색 가능 (Lockheed Martin 일부 공개)
페이지   : 144
규칙 수  : 약 240 rules (조항 번호 기준)
```

이 표준은 *공개*이지만 *Lockheed Martin의 저작권*. 변형·인용은 *fair use 범위* 내.

## F-35 프로젝트 — 배경

```
JSF Program 시작     : 1995
F-35 첫 비행         : 2006 (Block 1)
양산 시작            : 2011
도입 국가 (2024)     : 미국, 영국, 이탈리아, 네덜란드, 호주, 캐나다,
                       덴마크, 노르웨이, 터키 (제외), 일본, 한국,
                       이스라엘, 벨기에, 폴란드, 핀란드, 독일,
                       체코, 스위스, 그리스 등
한국 도입            : 60대 (F-35A, 2018부터)
한국 FACO (Final Assembly Check Out): KAI 사천 (협력)
대당 가격            : ~$80M (2024)
프로그램 총 비용    : ~$1.7 trillion (라이프사이클)
```

F-35의 *SW 복잡도*가 *역사상 가장 큼*. ~25 million LoC. 절반 이상이 *C++*. *센서 융합, AESA radar, EOTS, IRST, ALIS/ODIN logistics*까지.

## 왜 C++였는가

```
F/A-18 (이전 세대) : Ada
F-22 (이전 세대)   : Ada
F-35              : C++

이유:
  - Ada 인력 풀 부족 (2000년대)
  - 상용 도구 생태계 (C++ 컴파일러·라이브러리)
  - Modern C++의 abstraction (OO, template)
  - DoD가 *Ada Mandate* 폐지 (1997)
```

선택 시점에 *C++ ISO 표준은 C++98*. C++11/14 등 modern 기능은 *후에 추가*.

## 규칙 분류 — 4단계

JSF C++은 *4 강제도*:

```
Will        : MUST follow (deviation 절차 없이)
Shall       : MUST follow (deviation 있으면 별도 승인)
Should      : SHOULD follow (강하게 권장)
Will not    : MUST NOT do
```

`Will`이 가장 엄격. AUTOSAR의 *Required + Mandatory*에 해당.

```
Will:        ~30 항목
Shall:       ~150 항목
Should:      ~60 항목
```

## JSF C++ vs AUTOSAR C++14 vs MISRA C++:2008

| | JSF C++ | AUTOSAR C++14 | MISRA C++:2008 |
|---|---------|---------------|----------------|
| 발행 | 2005 | 2017 | 2008 |
| 기준 | C++03 | C++14 | C++03 |
| 항목 수 | ~240 | ~340 | ~228 |
| 분류 | Will/Shall/Should/Will not | Required/Advisory/Document | Required/Advisory |
| 적용 | F-35 + 그 후 항공 | Adaptive AUTOSAR | 자동차 일반 |
| 영향 | AUTOSAR의 원형 | JSF + MISRA의 통합 | JSF 후 자동차 적용 |

**역사적 흐름**:

```
1992  C++98 표준화 (이전 K&R)
2005  JSF C++ (F-35) ←─────────────┐
                                    │
2008  MISRA C++:2008 (자동차) ←─────┤  영향
                                    │
2011  C++11                          │
2014  C++14                          │
2017  AUTOSAR C++14 ←──────────────┘  큰 영향
                                    │
2023  MISRA C++:2023 ←──────────────┘  통합
```

AUTOSAR C++14는 *JSF C++ + MISRA C++:2008의 modern C++ 버전*이다.

## 카테고리 구조

JSF C++는 *35 카테고리*:

```
1.  Introduction
2.  References
3.  Definitions
4.  Environment
5.  Language Compliance
6.  Lexical Conventions
7.  Comments
8.  Identifiers
9.  Whitespace
10. Naming Identifiers
11. Macros
12. Identifiers
13. Types
14. Constants
15. Declarations and Definitions
16. Initialization
17. Casts
18. Expressions
19. Statements
20. Functions
21. Classes
22. Inheritance
23. Templates
24. Special Functions
25. Operators
26. Constructors
27. Member Access
28. Friend
29. Memory Management
30. Exceptions
31. Library Use
32. Multi-threading
33. Floating-Point Types
34. Integer Types
35. Optimization
```

각 카테고리에 *수~수십 개 rule*.

## 대표 Rules — Will 등급

```
AV Rule 1 (Will)
  Any one function (or method) will contain no more than 200 logical
  source lines of code (L-SLOCs).

AV Rule 2 (Will)
  There shall not be any self-modifying code.

AV Rule 3 (Will)
  All functions shall have cyclomatic complexity number of less than 20.

AV Rule 13 (Will)
  All code shall conform to ISO/IEC 14882:2002(E) standard C++.

AV Rule 23 (Will)
  Initialization of nonlocal objects shall be free of side-effects to
  initialization order.

AV Rule 27 (Will)
  An assertion will be used to verify any assumption that is made about
  the validity of expressions, parameters, and return values.

AV Rule 67 (Will)
  Public and protected data should only be used in structs—not classes.

AV Rule 95 (Will)
  Tabs should be avoided.

AV Rule 144 (Will)
  Pointer arithmetic will not be used.

AV Rule 161 (Will)
  In the definition of a non-static data member, the data member's type
  shall not include a pointer or reference to itself.

AV Rule 189 (Will)
  The exception handlers shall be specific to the abnormal conditions
  expected.
```

## 대표 Rules — Will Not 등급

```
AV Rule 17 (Will not)
  The literals "L" and "l" shall not be used in long type designation
  due to confusion with the digit "1".

AV Rule 96 (Will not)
  Goto statements shall not be used.

AV Rule 174 (Will not)
  The setjmp macro and the longjmp function shall not be used.

AV Rule 178 (Will not)
  The signal handling facilities of <csignal> shall not be used.

AV Rule 196 (Will not)
  Exceptions shall not be used.       ← 큰 결정
```

**Exception 금지**가 JSF C++의 *가장 잘 알려진 결정*. AUTOSAR도 *권장*이지만 JSF는 *Will not* — *절대 금지*.

## 대표 Rules — Should 등급

```
AV Rule 200 (Should)
  Functional and operational requirements shall not be the only criteria
  used to evaluate code.

AV Rule 211 (Should)
  Reuse of design and code is preferred over the development of new
  designs and code.
```

## 특이 결정 — JSF만의 강한 입장

### 1. Exception 완전 금지 (Rule 196)

```cpp
// 위반
try {
    DoWork();
} catch (...) { /* ... */ }

// Good — return code
int rc = DoWork();
if (rc != 0) HandleError(rc);
```

이유 (Lockheed Martin 문서):
- Exception 처리 시간이 *비결정적*
- Stack unwinding이 *static analysis 곤란*
- *MC/DC coverage*에 *모든 throw path*를 검증해야

### 2. 동적 메모리 — 거의 모든 케이스 금지

```cpp
// 위반
Foo *p = new Foo();         // Rule 206 위반
delete p;

// Good — 정적 또는 stack
static Foo g_foo;
// 또는
Foo local_foo;
```

JSF는 *new/delete 직접 사용 거의 금지*. *placement new*도 제한.

### 3. RTTI 완전 금지

```cpp
// 위반
typeid(obj);                // Rule 화제 — 일반적으로 금지
dynamic_cast<Foo *>(p);      // 위반
```

RTTI는 *runtime cost + binary size 비용*. F-35의 *실시간 budget*에 부담.

### 4. Multiple inheritance 제한

```cpp
// 회피 — Rule 88
class C : public A, public B {};   // 다중 상속 일반적 금지

// 허용 — 인터페이스 다중 상속만
class IReadable { public: virtual ~IReadable() = default; ... };
class IWritable { public: virtual ~IWritable() = default; ... };
class File : public IReadable, public IWritable { ... };   // OK
```

### 5. Friend 거의 금지

```cpp
// 위반 — Rule 89
class Foo {
    friend class Bar;        // 권장 X
    friend int helper();     // 권장 X
};
```

캡슐화를 깨므로 회피.

### 6. 0 대신 명시적 상수

```cpp
// 위반
if (x == 0) { ... }

// Good
const int kZero = 0;
if (x == kZero) { ... }
```

리뷰어가 *의도된 0*과 *실수 0*을 구분 가능.

## 코드 메트릭 한계

JSF C++는 *명시적 한계* 정함:

```
함수 줄 수     : ≤ 200 (Rule 1)
Cyclomatic     : ≤ 20 (Rule 3)
파라미터 수    : ≤ 7 (Rule 108)
함수 호출 깊이  : 권장 ≤ 4
namespace 깊이  : 권장 ≤ 4
class 멤버 수   : 합리적
```

이 metric은 *L-SLOCs* (Logical Source Lines of Code) 기준 — 주석·빈 줄·중괄호 제외.

## 명명 규칙 — Hungarian-like

```cpp
// JSF C++ 스타일
class CMyClass {                // C prefix
    int m_count;                // m_ for member
    static int s_total;          // s_ for static
public:
    void Compute() const;        // PascalCase
    int GetCount() const { return m_count; }
};

void Foo(int p_arg) {            // p_ for parameter
    int l_local;                 // l_ for local
}
```

*Hungarian notation에 가까운 prefix*. *현대 C++에서는 회피되는* 스타일.

AUTOSAR는 *Hungarian 회피*. JSF의 이 부분이 *시대 영향*.

## DO-178B/C 통합

JSF C++ 자체는 *DO-178 인증* 아님. F-35 SW가 *DO-178B Level A 인증* 받을 때 *코딩 표준으로 JSF C++ 채택*했다는 의미.

```
DO-178B Level A 인증
  → 71 objectives 충족
  → Source Code Standards = JSF C++ Coding Standards
  → 모든 rule 100% 준수 또는 deviation 보고
```

## 국내 적용

| 회사·프로젝트 | JSF C++ 영향 |
|-------------|------------|
| KAI KF-21 Boramae | 직접 적용 X. *비슷한 자체 표준* + MISRA + DO-178C |
| KAI F-35 FACO (사천) | 직접 적용 — Lockheed Martin이 표준 강제 |
| KAI T-50/FA-50 | 자체 표준 (MISRA + 일부 JSF 영향) |
| LIG Nex1 미사일 | DoD 자체 표준 + JSF 영향 |

**JSF C++를 직접 사용하는 국내 회사는 적다**. 하지만 *AUTOSAR C++14를 통해 영향*. 자동차 회사도 *간접적으로 JSF C++ 정신*을 따르고 있다.

## JSF C++ 대안 — Modern Alternative

JSF C++는 *2005년 발행 + C++03 기준*. Modern C++에 안 맞는 부분도.

```
JSF C++ (2005, C++03)
  ↓
AUTOSAR C++14 (2017) — Modern C++14
  ↓
MISRA C++:2023 — Modern C++17 + 통합
```

*새 항공 프로젝트*는 MISRA C++:2023을 *고려*. JSF C++는 *F-35 legacy 유지보수*에서만.

## 도구 지원

```
Helix QAC      : JSF C++ rule set 옵션
Polyspace      : JSF C++ 일부 매핑
Coverity       : JSF C++ rule mapping
LDRA           : JSF C++ 직접 지원 (F-35 협력으로 강함)
Klocwork       : 일부
```

LDRA가 *JSF C++ 검사가 가장 깊다*. F-35 직접 협력 경험.

## JSF C++의 영향 — 후세 표준

```
JSF C++ (2005)
   │
   ├── MISRA C++:2008 영향
   ├── AUTOSAR C++14 (2017)의 큰 원형
   │     - Exception 금지 정책
   │     - 동적 메모리 제한
   │     - 다중 상속 제한
   │     - RAII 권장
   │     - Rule of Five
   │
   ├── HIC++ (High Integrity C++) 일부 흡수
   ├── BARR-C (자동차 C 변형) 일부 영향
   └── MISRA C++:2023 (2023) — 통합
```

*JSF C++가 한 결정*이 *15+ 년에 걸쳐 자동차·우주·의료 산업으로 확산*했다.

## 시리즈 로드맵

이 시리즈는 JSF C++ *240+ rules*를 *12장*에 정리:

1. **Ch 1 (지금)** — 배경, F-35, AUTOSAR 영향
2. **Ch 2** — Environment, Language Compliance (Rule 1-13)
3. **Ch 3** — Lexical, Comments, Identifiers, Naming (Rule 14-66)
4. **Ch 4** — Macros, Types, Constants (Rule 67-153)
5. **Ch 5** — Declarations, Initialization, Casts, Expressions (Rule 138-168)
6. **Ch 6** — Statements, Functions (Rule 159-208)
7. **Ch 7** — Classes 1: 기본 (Rule 67-95)
8. **Ch 8** — Classes 2: 상속, virtual (Rule 88-100)
9. **Ch 9** — Templates (Rule 101-105)
10. **Ch 10** — Exceptions, Memory, Library, Multi-threading (Rule 191-220)
11. **Ch 11** — AUTOSAR C++14, MISRA C++ 와의 비교
12. **Ch 12** — F-35 사례, 인증, 도구

## 정리

- JSF C++는 *F-35 (2005)용 Lockheed Martin 표준*. ~240 rules.
- *Will/Shall/Should/Will not* 분류.
- *Exception 완전 금지, 동적 메모리 거의 금지, RTTI 금지* 등 강한 입장.
- *DO-178B Level A 인증*과 함께 사용.
- *AUTOSAR C++14의 원형* — 자동차 표준에 큰 영향.
- 국내 직접 사용: KAI F-35 FACO. 간접 영향: KF-21, 모든 자동차 C++ 프로젝트.
- Modern 대안: AUTOSAR C++14 → MISRA C++:2023.

## 다음 장 예고

2장은 Environment + Language Compliance — Rule 1-13의 컴파일러·환경·이식성 규칙.

## 관련 항목

- [DO-178C Ch 1 — 항공 SW 인증](/blog/embedded/aerospace-standards/do-178c/chapter01-overview)
- [AUTOSAR C++ Ch 1 — 자동차 C++ 표준](/blog/embedded/standards/autosar-cpp/chapter01-intro)
- [MISRA C Ch 1](/blog/embedded/standards/misra-c/chapter01-introduction)
- [JPL Power of 10](/blog/embedded/aerospace-standards/jpl-power-of-ten/chapter01-the-ten-rules)
- [원문 — JSF C++ Coding Standards (PDF)](https://www.stroustrup.com/JSF-AV-rules.pdf)
