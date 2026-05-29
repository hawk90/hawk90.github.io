---
title: "Ch 11: AUTOSAR C++14, MISRA C++:2008/2023과의 비교"
date: 2026-05-18T12:00:00
description: "JSF C++ → MISRA C++:2008 → AUTOSAR C++14 → MISRA C++:2023 표준 비교."
tags: [jsf-cpp, autosar, misra-cpp, comparison, evolution]
series: "JSF C++"
seriesOrder: 11
draft: true
---

JSF C++(2005)와 후속 *MISRA C++:2008*, *AUTOSAR C++14*(2017), *MISRA C++:2023* 간의 비교. *공식 발행 사실과 표준 문서 명시 정책*만 정리.

## C++ 표준 진화 Timeline

```
1998: C++98 (ISO/IEC 14882:1998)
2003: C++03 (ISO/IEC 14882:2003)
2011: C++11
2014: C++14
2017: C++17
2020: C++20
2023: C++23
```

## 안전·임베디드 코딩 표준 발행

| 표준 | 발행자 | 발행 | 기준 C++ |
|------|--------|------|----------|
| JSF C++ Coding Standards | Lockheed Martin | 2005-12 | C++03 |
| MISRA C++:2008 | MISRA Consortium | 2008 | C++03 |
| AUTOSAR C++14 Guidelines | AUTOSAR Consortium | 2017 | C++14 |
| MISRA C++:2023 | MISRA Consortium | 2023 | C++17 |

각 표준의 *공식 문서·발행처 페이지에서 확인 가능*.

## 표준 간 관계

MISRA C++:2023의 *공식 announcement*가 명시하는 바: AUTOSAR C++14와 MISRA C++:2008을 *통합*. AUTOSAR 컨소시엄도 *MISRA C++:2023을 후계로 채택* 발표 (AUTOSAR 공식 페이지·MISRA announcement 참고).

JSF C++가 이후 표준에 *어느 정도 영향*을 주었다는 *기술적 평가*는 산업 문헌에 자주 등장하지만 *공식 mapping 문서는 표준 간 직접 제공되지 않는 경우 일반적*.

## 강제도 분류 비교

각 표준이 *공식 문서에 명시한* 분류 체계:

```
JSF C++:
  Will / Shall / Should / Will not
  (출처: JSF Coding Standards 문서 Section 4)

MISRA C++:2008:
  Document / Required / Advisory
  (출처: MISRA C++:2008 문서)

AUTOSAR C++14:
  Required / Advisory / Document
  (출처: AUTOSAR C++14 Guidelines)

MISRA C++:2023:
  Mandatory / Required / Advisory
  (출처: MISRA C++:2023 공식 announcement)
```

각 분류의 *deviation 절차*는 표준별로 약간 다름. 자세히는 *원문 문서*.

## 핵심 정책 — 공통점

각 표준이 *명시적으로 정책*을 갖는 영역 (구체 rule 번호는 *원문 참조*):

### Exception 처리

- **JSF C++**: 사용 금지 (*Will not*).
- **MISRA C++:2008** / **AUTOSAR C++14** / **MISRA C++:2023**: 사용 시 제약 다수. 임베디드/항공/자동차에서 *대부분 `-fno-exceptions` 빌드*.

각 표준의 정확한 rule wording은 *원문 문서 참고*.

### RTTI (`typeid` / `dynamic_cast`)

- **JSF C++**: 사용 금지.
- 후속 표준: 사용에 제약. 대부분의 안전 critical 빌드에서 `-fno-rtti`.

### 동적 메모리 (new/delete, malloc/free)

- **JSF C++**: initialization phase 외 사용 제한.
- **AUTOSAR C++14** 이후: smart pointer (`std::unique_ptr`, `std::shared_ptr`) 활용 권장. raw `new`/`delete` 직접 호출 회피.
- 각 표준의 정확한 wording은 *원문 참고*.

### 다중 상속

- 공통: *interface (pure abstract class) 외 회피*.

### 가상 소멸자

- 공통: polymorphic class는 virtual destructor 필수.

### C-style cast

- 공통: 금지. `static_cast` / `const_cast` / `reinterpret_cast` / `dynamic_cast` 명시.

## Modern C++ 기능 사용 가능성

JSF C++(2005)는 C++03 기반이므로 *C++11 이후 기능은 원본 범위 외*:

- `auto` (C++11)
- Lambda (C++11)
- `nullptr` (C++11)
- `enum class` (C++11)
- Range-based for (C++11)
- Move semantics (C++11)
- `constexpr` (C++11/14 확장)
- Smart pointer (`std::unique_ptr`, `std::shared_ptr`, C++11)
- `std::array` (C++11)
- Structured bindings (C++17)
- `std::optional` / `std::variant` (C++17)
- `std::expected` (C++23)

후속 표준이 *각자의 적용 범위에 따라* 이러한 기능을 *권장하거나 의무화*. 자세히는 각 표준의 *해당 절*.

본 블로그의 [AUTOSAR C++14 시리즈](/blog/embedded/automotive/autosar-cpp/chapter01-intro) Ch 14가 C++17/20/23 도입 가이드.

## Naming Convention

각 표준이 *특정 convention 강제하지 않음*. 단:

- **JSF C++**: Hungarian-like prefix (`m_`, `s_`, `p_`, `l_`)를 *예시*로 자주 보여줌. 일부 항공 코드베이스에서 채택.
- **MISRA C++:2008** / **AUTOSAR C++14** / **MISRA C++:2023**: 프로젝트가 *자체 convention* 정의. Hungarian 강제 안 함.

## 같은 기능 — 다른 표준 스타일

같은 기능 (예: PID 컨트롤러)을 *서로 다른 표준 스타일*로 작성한 *비교 코드*는 [Ch 5](/blog/embedded/aerospace-standards/jsf-cpp/chapter05-declarations-casts)의 PID 예제 및 [Ch 10](/blog/embedded/aerospace-standards/jsf-cpp/chapter10-exceptions-memory-library) 참고.

핵심 syntactic 차이:

```cpp
// C++03 (JSF 시기)
class CFoo {
public:
    CFoo() : m_value(0) {}
    int Get() const { return m_value; }
private:
    int m_value;
};

// C++14+ (AUTOSAR 이후)
class Foo {
public:
    Foo() = default;
    int Get() const noexcept { return value_; }
private:
    int value_{0};  // C++11 default member initializer
};
```

각 표준이 *허용하거나 의무화하는 modern syntax*는 *해당 표준 문서*.

## 표준 도구 지원

대부분의 상용 정적 분석 도구가 *여러 표준 동시 지원*. Vendor 공개 자료:

- Helix QAC (Perforce): MISRA, AUTOSAR, JSF C++, CERT
- LDRA Testbed: MISRA, JSF, AUTOSAR
- Polyspace (MathWorks): MISRA, AUTOSAR, JSF C++, CERT
- Coverity (Synopsys): MISRA, AUTOSAR 등

자세히는 [Ch 12 — Tools](/blog/embedded/aerospace-standards/jsf-cpp/chapter12-tools-certification).

## 표준 선택 기준 — 일반

새 프로젝트에서 *어느 표준을 채택할지*는 다음 요소에 따라:

- **산업**: 항공 (DO-178C 기반 → MISRA C++:2023 또는 자체), 자동차 (AUTOSAR / MISRA C++:2023), 우주 (ECSS + 자체)
- **C++ 표준 버전**: 사용 가능한 컴파일러·인증 toolchain
- **고객·인증 요구**: 일부 고객이 *특정 표준* 강제
- **도구 ecosystem**: 사용 가능한 qualified tool
- **인력 경험**

MISRA C++:2023이 *MISRA C++:2008과 AUTOSAR C++14의 통합 후속*으로 발표되어 *새 프로젝트에서의 채택 trend*가 형성되고 있음 (MISRA 공식 announcement 참고).

## 정리

- JSF C++ (2005, Lockheed Martin, C++03 기반)
- MISRA C++:2008 (MISRA, C++03 기반)
- AUTOSAR C++14 (2017, AUTOSAR, C++14 기반)
- MISRA C++:2023 (MISRA, C++17 기반, AUTOSAR + MISRA C++:2008 통합 후속)
- 공통 정책: exception/RTTI 금지·회피, 동적 메모리 제한, 다중 상속 interface 외 회피, virtual destructor, C-style cast 금지
- 자세한 정책·rule 번호·deviation 절차는 *각 표준 원문* 필수 참조

## 참조

- JSF C++: [PDF (Stroustrup 사이트)](https://www.stroustrup.com/JSF-AV-rules.pdf)
- MISRA C++:2008 / MISRA C++:2023: [misra.org.uk](https://misra.org.uk/)
- AUTOSAR C++14 Guidelines: [autosar.org](https://www.autosar.org/)
- ISO C++ Standards: [isocpp.org](https://isocpp.org/)
- C++ Core Guidelines: [isocpp.github.io/CppCoreGuidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)

## 다음 장 예고

12장: *Tools + 시리즈 마무리*.

## 관련 항목

- [Ch 10 — Exceptions, Memory, Library](/blog/embedded/aerospace-standards/jsf-cpp/chapter10-exceptions-memory-library)
- [Ch 12 — Tools, 마무리](/blog/embedded/aerospace-standards/jsf-cpp/chapter12-tools-certification)
- [AUTOSAR C++14 시리즈](/blog/embedded/automotive/autosar-cpp/chapter01-intro)
- [MISRA C 시리즈](/blog/embedded/automotive/misra-c/chapter01-introduction)
