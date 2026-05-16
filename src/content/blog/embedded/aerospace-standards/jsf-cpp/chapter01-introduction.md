---
title: "Ch 1: JSF C++ — F-35 코딩 표준"
date: 2025-09-30T02:00:00
description: "Lockheed Martin이 F-35 Joint Strike Fighter용으로 발행한 C++ 코딩 표준 (2005). 항공 SW 코딩 가이드의 한 대표."
tags: [jsf-cpp, lockheed-martin, f-35, joint-strike-fighter, cpp, aerospace, dod]
series: "JSF C++"
seriesOrder: 1
draft: false
---

**JSF C++ Coding Standards** (Joint Strike Fighter Air Vehicle C++ Coding Standards)는 *Lockheed Martin*이 2005년 발행한 *F-35 (Joint Strike Fighter) 프로그램용 C++ 코딩 표준*. *항공 critical SW의 C++ 코딩 가이드*로 *후속 자동차·일반 안전 critical 표준*에 영향을 주었다.

## 출처 — 공식

```
Full name : Joint Strike Fighter Air Vehicle C++ Coding Standards
            for the System Development and Demonstration Program
저자      : Lockheed Martin Corporation
발행      : 2005-12
문서 번호 : 2RDU00001 Rev C
페이지   : 144 (공개 PDF 기준)
```

공개된 PDF는 *검색 가능* (Bjarne Stroustrup 사이트 등). 변형·인용은 *fair use 범위* 내에서.

## F-35 프로그램 — 공개 사실

```
JSF Program 시작      : 1995
F-35 첫 비행          : 2006
양산 시작             : 2011 (LRIP 단계 포함)
도입 국가             : 미국 + 다수 파트너국
한국 도입             : F-35A (KAI FACO Sacheon 협력)
```

각 국가별 도입 수량, 가격, 도입 시점 등 *세부 데이터*는 *시점에 따라 변동*하므로 *각 국 공식 발표*를 직접 참조하는 것이 안전. F-35 program의 *총 SW 규모, 언어 비율, 비용 등*은 *공식 수치가 공개되지 않거나 추정인 경우 많음* — 이 시리즈는 *확정적 수치 제시 안 함*.

## 강제도 분류

JSF C++는 *4 강제도*를 정의:

```
Will       — 의무 (deviation 없이 준수)
Shall      — 의무 (deviation 가능, 별도 승인)
Should     — 강한 권장
Will not   — 금지
```

각 분류의 *deviation 절차*는 *표준 원문* 참고.

## 규칙 영역 — 카테고리

표준 원문이 정의한 *대분류* (페이지 목차 기준):

```
- Introduction / References / Definitions
- Environment
- Language Compliance
- Lexical Conventions / Comments / Identifiers
- Whitespace / Naming
- Macros, Types, Constants
- Declarations, Initialization, Casts, Expressions
- Statements / Functions
- Classes / Inheritance / Templates
- Special Functions / Operators
- Memory Management / Exceptions
- Library Use / Multi-threading
- Floating-Point / Integer Types
- Optimization
```

각 영역에 *수~수십 개 rule*. 정확한 rule 번호·wording은 *원문 PDF*.

## 잘 알려진 정책

JSF C++가 명시한 *대표적인 정책* (구체 rule 번호는 원문 참조):

### Exception 사용 금지

```cpp
// 회피
try {
    DoWork();
} catch (...) { /* ... */ }

// Good — return code
int rc = DoWork();
if (rc != 0) HandleError(rc);
```

Exception 금지의 일반적 근거:
- 처리 시간 비결정적
- Stack unwinding이 static analysis 곤란
- *MC/DC coverage* 어려움
- WCET 분석 부담

### 동적 메모리 제한

```cpp
// 회피 — runtime allocation
Foo *p = new Foo();
delete p;

// Good — 정적 또는 stack
static Foo s_foo;
Foo local_foo;
```

`new/delete`는 *initialization phase*에 한정 권장. 운영 phase는 *static + pool*. NASA JPL Power of 10 Rule 3과 같은 정신.

### RTTI 금지

```cpp
// 회피
typeid(obj);
dynamic_cast<Foo *>(p);
```

`-fno-rtti`로 *컴파일 시 차단* 권장. Runtime cost + binary size + static analysis 약화.

### 다중 상속 — Interface 외 회피

```cpp
// 회피 — concrete class 다중 상속
class C : public A, public B { /* both have data */ };

// 허용 — 인터페이스 다중 상속
class IReadable { /* pure virtual */ };
class IWritable { /* pure virtual */ };
class File : public IReadable, public IWritable { /* ... */ };
```

### `friend` 사용 최소

`friend`가 *encapsulation*을 약화. *최후의 수단*.

### Self-modifying Code 금지

Runtime code generation, code patching 등 *완전 금지*. Static analysis 불가, verification 불가.

### Function 크기·Complexity 한계

함수당 *LSLOC 한계*와 *cyclomatic complexity 한계* 명시. 정확한 값은 *원문 Rule 1, Rule 3*.

## 코드 메트릭 한계 — 영역

```
함수 줄 수      : 한계 명시 (원문 Rule 1)
Cyclomatic     : 한계 명시 (원문 Rule 3)
파라미터 수    : 한계 명시
중첩 깊이      : 권장값
```

LSLOC = *Logical Source Lines of Code* — 주석·빈 줄·중괄호 제외.

## 명명 — Hungarian-like

```cpp
class CMyClass {            // C prefix (옵션)
    int m_count;            // m_ for member
    static int s_total;     // s_ for static
public:
    void Compute() const;
    int GetCount() const { return m_count; }
};

void Foo(int p_arg) {       // p_ for parameter
    int l_local;            // l_ for local
}
```

*Hungarian notation에 가까운 prefix*. *현대 C++에서는 회피되는 스타일*이지만 *JSF 시기의 관습*. 자세히는 Ch 3 참고.

## 인증과의 관계 — DO-178C

JSF C++ *자체*는 *DO-178C/B 인증서 아님*. 항공 SW가 *DO-178B/C Level A 인증*을 받을 때 *Source Code Standards 항목*에 *JSF C++ 같은 코딩 표준*을 채택하는 방식.

```
DO-178C 인증 (DAL A)
  → Source Code Standards = 채택된 코딩 표준
  → 100% 준수 또는 deviation 보고
```

자세히는 본 블로그의 [DO-178C 시리즈](/blog/embedded/aerospace-standards/do-178c/chapter01-overview) 참조.

## JSF C++ vs 후속 표준

| | JSF C++ | MISRA C++:2008 | AUTOSAR C++14 | MISRA C++:2023 |
|---|---------|----------------|---------------|----------------|
| 발행 | 2005 | 2008 | 2017 | 2023 |
| 기준 | C++03 | C++03 | C++14 | C++17 |
| 분류 | Will/Shall/Should/Will not | Document/Required/Advisory | Required/Advisory/Document | Mandatory/Required/Advisory |

각 표준 간의 *공식 mapping*은 *대부분 표준 발행처가 제공하지 않음*. JSF C++가 *후속 표준에 어느 정도 영향을 주었다*는 *기술적 관찰*은 산업 문헌에 자주 등장한다. 자세히는 Ch 11 참고.

## 도구 지원 — Vendor 공개

다음 도구들이 *JSF C++ rule set*을 *공식적으로 지원한다고 vendor가 명시*:

- Perforce Helix QAC
- LDRA Testbed
- MathWorks Polyspace
- Synopsys Coverity (일부 매핑)

각 vendor 페이지에서 *정확한 지원 범위* 확인. 자세히는 Ch 12 (Tools) 참고.

## Modern C++의 진화와 JSF

JSF C++ 원본은 *C++03 기반* (2005 발행 시점의 표준). C++11/14/17/20/23 기능은 *원본 범위 외*. 후속 표준이 *modern C++ 기능을 단계적 통합*:

- **MISRA C++:2008** — C++03 기반
- **AUTOSAR C++14** — C++14 기반
- **MISRA C++:2023** — C++17 기반 (AUTOSAR + MISRA C++:2008 통합 후속)

새 프로젝트라면 *최신 표준 검토*가 일반적. F-35 같은 *기존 프로그램*은 *legacy 코딩 표준 유지*.

## 시리즈 로드맵

이 시리즈는 JSF C++의 *주요 정책 영역*을 정리:

1. **Ch 1 (지금)** — 배경, 분류, 정책 영역
2. **Ch 2** — Environment, Language Compliance
3. **Ch 3** — Lexical, Naming Conventions
4. **Ch 4** — Macros, Types, Constants
5. **Ch 5** — Declarations, Initialization, Casts, Expressions
6. **Ch 6** — Statements, Functions
7. **Ch 7** — Classes 기본
8. **Ch 8** — Inheritance, Virtual, RTTI
9. **Ch 9** — Templates
10. **Ch 10** — Exceptions, Memory, Library, Multi-threading
11. **Ch 11** — AUTOSAR / MISRA와의 비교
12. **Ch 12** — Tools + 시리즈 마무리

각 장은 *원문 PDF Rule 번호·wording*을 *직접 인용하기보다 정책 영역을 설명*한다. *정확한 rule 적용*은 *원문을 직접 참조*하여 진행해야 한다.

## 정리

- JSF C++는 *F-35 program용 Lockheed Martin 표준* (2005, 문서 2RDU00001 Rev C).
- *Will/Shall/Should/Will not* 4단계 분류.
- *Exception, RTTI 금지, dynamic memory 제한, 다중 상속 제한* 등 안전 critical 정책.
- C++03 기반 → 후속 표준 (MISRA C++:2008/2023, AUTOSAR C++14)이 modern 기능 통합.
- 정적 분석 도구 다수가 JSF C++ rule set 지원.
- 정확한 rule 번호·wording은 *원문 PDF*.

## 다음 장 예고

2장은 *Environment + Language Compliance* — 함수 크기·complexity 한계, ISO C++ 준수.

## 관련 항목

- [DO-178C 시리즈](/blog/embedded/aerospace-standards/do-178c/chapter01-overview)
- [AUTOSAR C++14 시리즈](/blog/embedded/automotive/autosar-cpp/chapter01-intro)
- [MISRA C 시리즈](/blog/embedded/automotive/misra-c/chapter01-introduction)
- [NASA JPL Power of 10](/blog/embedded/aerospace-standards/jpl-power-of-ten/chapter01-the-ten-rules)
- [원문 PDF (Stroustrup 사이트)](https://www.stroustrup.com/JSF-AV-rules.pdf)
