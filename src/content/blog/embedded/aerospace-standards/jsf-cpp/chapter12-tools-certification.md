---
title: "Ch 12: Tools + 시리즈 마무리"
date: 2025-09-30T13:00:00
description: "JSF C++ 정적 분석 도구, JSF C++ 원문 자료, 시리즈 전체 정리."
tags: [jsf-cpp, tools, ldra, helix-qac, certification]
series: "JSF C++"
seriesOrder: 12
draft: false
---

JSF C++ 시리즈 마지막. *공개 자료 기반 도구 정리*, *원문 자료*, *시리즈 종합*.

## 정적 분석 도구 — Vendor 공개 정보 기반

### Helix QAC (Perforce)

- 회사: Perforce Software, Inc.
- 지원 표준: MISRA C/C++, AUTOSAR C++14, CERT C/C++ (vendor가 명시)
- JSF C++ rule set 지원은 *vendor 공식 페이지에서 확인*
- 가격 정보는 *문의 기반 (sales contact)*

자세히: [Perforce Helix QAC](https://www.perforce.com/products/helix-qac)

### LDRA Testbed

- 회사: LDRA Ltd.
- 지원 표준: MISRA, JSF C++, AUTOSAR (vendor 명시)
- 기능: 정적 분석 + 테스트 (TBrun) + coverage (MC/DC)
- DO-178C qualification kit 제공

자세히: [LDRA](https://ldra.com/)

### Polyspace (MathWorks)

- 회사: MathWorks
- 제품: Polyspace Bug Finder + Polyspace Code Prover
- 기능: Bug Finder (rule check), Code Prover (abstract interpretation 기반 runtime error 부재 증명)
- 지원 표준: MISRA C/C++, JSF C++, AUTOSAR C++14, CERT

자세히: [MathWorks Polyspace](https://www.mathworks.com/products/polyspace.html)

### Coverity (Synopsys)

- 회사: Synopsys
- 기능: Path-sensitive static analysis
- 지원 표준: MISRA, AUTOSAR 등
- Cloud 옵션 제공

자세히: [Synopsys Coverity](https://www.synopsys.com/software-integrity/security-testing/static-analysis-sast.html)

### clang-tidy

- 라이선스: Apache 2.0 with LLVM Exception (open source)
- LLVM/Clang 프로젝트의 lint tool
- 검사군: `cppcoreguidelines-*`, `modernize-*`, `readability-*`, `bugprone-*`, `cert-*` 등
- JSF C++ 직접 지원 *없음* — 일부 rule이 `cppcoreguidelines`와 일치

자세히: [clang-tidy 공식](https://clang.llvm.org/extra/clang-tidy/)

## 도구 선택 — 일반 원칙

DO-178C DAL A/B 프로젝트에서 정적 분석·테스트·coverage 도구는 *qualification 필요* (DO-330). Vendor가 *Qualification Kit* 제공하는 경우가 *프로젝트 부담 감소*에 유리.

도구 비용·license 모델은 *vendor 직접 문의*. 공개된 정확한 가격 정보는 *대부분 vendor 페이지에 없음*.

## F-35 프로그램 — 공개 정보

F-35 Lightning II (Joint Strike Fighter):

- 개발사: Lockheed Martin
- 첫 비행: 2006
- 양산 시작: 2011
- 도입 국가: 미국 + 다수 파트너 국가 (한국 포함)
- 변형: F-35A (CTOL), F-35B (STOVL), F-35C (CV)

JSF C++ Coding Standards:
- 발행: 2005-12
- 발행처: Lockheed Martin Corporation
- 문서 번호: 2RDU00001 Rev C
- *공개 PDF*가 Bjarne Stroustrup의 웹사이트 등에서 검색 가능

F-35 프로그램의 *총 SW 규모, 인증 비용, 언어 비율*에 관한 *공식 수치*는 일반적으로 *공개되지 않거나 추정*. 인터넷의 자주 인용되는 숫자도 *출처가 분명하지 않은 경우 많음* — 이 시리즈는 *확정적 수치 제시 안 함*.

## 한국 항공 산업 — 공개 사실

- **KAI** (한국항공우주산업): F-35 *Asia-Pacific Final Assembly and Check Out (FACO)* 시설 운영 (사천). Lockheed Martin과 협력.
- **KF-21 Boramae**: KAI 주도 한국형 전투기 개발 사업. 2022 시제기 첫 비행.
- **T-50 Golden Eagle**: KAI 개발 초음속 훈련기 (Lockheed Martin 협력 기반). 다수 국가에 수출.
- **LIG Nex1**: 항공 전자·통신·미사일 시스템.
- **한화 에어로스페이스**: 엔진, 위성, 우주 발사체 등.
- **KARI** (한국항공우주연구원): 위성, 발사체, 무인기 R&D.

각 회사·기관의 *내부 코딩 표준, 사용 도구, 인력 규모*는 *비공개*. 이 시리즈는 *내부 정보 추정 제시 안 함*.

## Tool Qualification — DO-330

DO-178C DAL A 코드 verification 도구는 DO-330 *qualification*. 일반 절차:

1. Tool Operational Requirements (TOR)
2. Tool Validation (vendor suite + project 환경)
3. Project-specific validation
4. Limitations documentation
5. Tool Accomplishment Summary (TAS)
6. FAA DER 또는 EASA equivalent 승인

자세히 DO-178C Ch 11 참고: [Tool Qualification (DO-330)](/blog/embedded/aerospace-standards/do-178c/chapter11-tool-qualification-do330)

## C++ 표준 진화

```
1998: C++98 (ISO/IEC 14882:1998)
2003: C++03 (ISO/IEC 14882:2003) — JSF C++의 기준
2011: C++11
2014: C++14
2017: C++17
2020: C++20
2023: C++23
```

JSF C++ 원본(2005년 발행)은 *C++03*. C++11 이후의 기능 (`auto`, lambda, `nullptr`, `enum class`, smart pointer, move semantics, range-based for, `constexpr` 등)은 *원본 JSF C++의 적용 범위 외*.

## 후세 표준

- **MISRA C++:2008** — MISRA Consortium, C++03 기반
- **AUTOSAR C++14 Guidelines** — AUTOSAR Consortium (2017), C++14 기반
- **MISRA C++:2023** — MISRA Consortium, C++17 기반. AUTOSAR + MISRA C++:2008 통합 후속

각 표준의 *exception, RTTI, 동적 메모리* 정책은 *JSF C++의 정신을 큰 틀에서 계승*. 세부 비교는 Ch 11 참고.

## 시리즈 정리 — 12장 종합

| Ch | 주제 | 핵심 |
|----|------|------|
| 1 | 배경 | Lockheed Martin 2005, F-35, ~240 rules |
| 2 | Environment | AV Rule 1 (200 LSLOC), AV Rule 3 (CCN ≤20), ISO C++03 |
| 3 | Lexical, Naming | Hungarian-like prefix (m_/s_/p_/l_) |
| 4 | Macros, Types, Constants | Macros 회피 → inline, cstdint, const variable |
| 5 | Declarations, Casts | Initializer list, C-style cast 금지 |
| 6 | Statements, Functions | goto/setjmp/varargs/recursion/exception 금지 |
| 7 | Classes basic | public data → struct, Rule of Three, virtual dtor |
| 8 | Inheritance, Virtual | Multiple inheritance interface only, RTTI 금지 |
| 9 | Templates | 단순 generic, TMP 회피 |
| 10 | Exceptions, Memory, Library | Exception 완전 금지 (Rule 196) |
| 11 | 비교 | JSF → MISRA08 → AUTOSAR14 → MISRA23 진화 |
| 12 | Tools, 마무리 | 도구 종합, 자료 |

## Key Principles (검증 가능)

1. JSF C++는 *C++03 기반의 코딩 표준* (Lockheed Martin, 2005).
2. *Will / Shall / Should / Will not* 4단계 강제도.
3. *Exception, RTTI 사용 금지* (AV Rule 196, AV Rule 96-97).
4. *Dynamic memory*는 *initialization phase에 한정* 권장.
5. *Multiple inheritance*는 *interface (pure abstract) 외 회피*.
6. 함수 크기 *L-SLOC 200 이내* (AV Rule 1).
7. Cyclomatic complexity *20 이내* (AV Rule 3).
8. *Modern C++ 기능* (auto, lambda, enum class, smart pointer 등)은 *원본 JSF C++ 범위 외*.
9. 후속 표준 (MISRA C++:2008/2023, AUTOSAR C++14)이 *기본 정신을 계승*하며 *modern C++ 기능 통합*.

## 원문 + 참고 자료

JSF C++ 자체:
- Lockheed Martin, *Joint Strike Fighter Air Vehicle C++ Coding Standards for the System Development and Demonstration Program*, Document 2RDU00001 Rev C, 2005-12.
- PDF: Bjarne Stroustrup의 사이트 등에서 검색 가능. [예시 link](https://www.stroustrup.com/JSF-AV-rules.pdf)

후세 표준:
- AUTOSAR, *Guidelines for the use of the C++14 language in critical and safety-related systems* (AUTOSAR C++14): [autosar.org](https://www.autosar.org/)
- MISRA, *MISRA C++:2008* / *MISRA C++:2023*: [misra.org.uk](https://misra.org.uk/)
- ISO/IEC 14882 (C++ standard)

DO-178C / 인증:
- RTCA DO-178C / EUROCAE ED-12C
- RTCA DO-330 (Tool Qualification)
- 본 블로그의 [DO-178C 시리즈](/blog/embedded/aerospace-standards/do-178c/chapter01-overview)

C++ Core Guidelines (MISRA C++:2023 일부 영향):
- [isocpp.github.io/CppCoreGuidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)

도구 vendor:
- [Helix QAC](https://www.perforce.com/products/helix-qac)
- [LDRA](https://ldra.com/)
- [Polyspace](https://www.mathworks.com/products/polyspace.html)
- [Coverity](https://www.synopsys.com/software-integrity/security-testing/static-analysis-sast.html)
- [clang-tidy](https://clang.llvm.org/extra/clang-tidy/)

F-35 / 한국 항공 (공식):
- [F-35 program](https://www.f35.com/)
- [Lockheed Martin](https://www.lockheedmartin.com/)
- [KAI](https://www.koreaaero.com/)
- [KARI](https://www.kari.re.kr/)

## JSF C++ 시리즈를 마치며

JSF C++는 *2005년에 발행된 C++03 기반 항공 SW 코딩 표준*이며, 후속 *MISRA C++:2008*, *AUTOSAR C++14*, *MISRA C++:2023*에 영향을 주었습니다. 본 시리즈는 *공개된 표준 문서와 vendor 공개 자료*를 기반으로 정리했고, *기업 내부 정보·확인되지 않은 수치는 제시하지 않았습니다*.

실제 적용은 *원문 PDF와 인증 표준 (DO-178C 등)을 직접 참조*하여 진행해야 합니다.

## 관련 항목

- [Ch 11 — AUTOSAR, MISRA 비교](/blog/embedded/aerospace-standards/jsf-cpp/chapter11-comparison)
- [DO-178C 시리즈](/blog/embedded/aerospace-standards/do-178c/chapter01-overview)
- [NASA JPL Power of 10](/blog/embedded/aerospace-standards/jpl-power-of-ten/chapter01-the-ten-rules)
- [ECSS-Q-ST-80C 시리즈](/blog/embedded/aerospace-standards/ecss-q-st-80c/chapter01-introduction)
- [AUTOSAR C++14 시리즈](/blog/embedded/automotive/autosar-cpp/chapter01-intro)
- [MISRA C 시리즈](/blog/embedded/automotive/misra-c/chapter01-introduction)
