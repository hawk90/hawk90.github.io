---
title: "Ch 1: AUTOSAR C++14 — 자동차 C++의 표준이 된 이유"
date: 2025-09-15T02:00:00
description: "AUTOSAR 컨소시엄, Classic/Adaptive, C++14 채택 배경, MISRA C++:2008과의 차이, MISRA C++:2023 통합."
tags: [autosar, cpp, c++14, iso-26262, adaptive, classic, automotive]
series: "AUTOSAR C++14"
seriesOrder: 1
draft: false
---

AUTOSAR(AUTomotive Open System ARchitecture)는 2003년 BMW, Bosch, Continental, Daimler, Ford 등 자동차 OEM과 Tier-1이 함께 만든 *자동차 소프트웨어 아키텍처 표준* 컨소시엄이다. 이 컨소시엄이 *Adaptive AUTOSAR* 플랫폼을 발표하면서 *C++14를 공식 채택*했고, 그에 따른 코딩 표준이 **AUTOSAR C++14 Coding Guidelines**(2017)이다.

## Classic vs Adaptive AUTOSAR

```
Classic AUTOSAR (2003~)         Adaptive AUTOSAR (2017~)
──────────────────────         ────────────────────────
RTOS 위 정적 스케줄              POSIX 위 동적 배치
ECU 단위 컴파일                  서비스 단위, 동적 디스커버리
C 언어                          C++14
deterministic, ms 단위           micros, GB 메모리
Powertrain, Body Control         ADAS, V2X, IVI, 자율주행
```

자율주행·V2X·OTA 업데이트 같은 *대규모·동적* 시스템이 Classic의 *정적 모델*로는 감당이 안 되면서 Adaptive가 등장. C++14 채택은 *그 결과*다.

## 왜 C++14였는가

2017년 표준 채택 시 C++17이 이미 있었지만 *컴파일러 성숙도*와 *boost·관련 도구 호환성*을 위해 C++14에 머물렀다.

C++14가 가진 *임베디드 안전 관련 기능*:

- **`constexpr` 함수 확장** — 컴파일 타임 계산.
- **`auto` 반환 타입 추론**.
- **`make_unique`** (`make_shared`는 C++11).
- **`std::shared_timed_mutex`**.
- **2진 리터럴 `0b1010`**.

C++17/20/23으로 가는 *마이그레이션 경로*는 *AUTOSAR가 정의*. 2023년 AUTOSAR R23-11에서는 *C++17 부분 채택* 시작.

## MISRA C++:2008 — AUTOSAR가 대체한 이유

```
MISRA C++:2008    →    AUTOSAR C++14 (2017)    →    MISRA C++:2023
─────────────         ──────────────────────         ────────────────
228 rules             340+ rules                     C++17/20 통합
C++03 기반            C++14 기반                     최신 표준 반영
C++11 표준 없음        modern C++ 적극 활용             AUTOSAR + MISRA 통합
```

MISRA C++:2008은 *C++11 이전*의 표준이라 *modern C++* 기능(`auto`, lambda, move semantics, smart pointer)을 *전혀 다루지 못한다*. AUTOSAR가 *modern C++ 시대의 안전 표준*으로 등장한 이유다.

2023년 **MISRA C++:2023**이 발표되면서 AUTOSAR와 MISRA가 *통합*된다. AUTOSAR 컨소시엄도 *MISRA C++:2023을 후계 표준으로* 공식 인정. 다만 *기존 프로젝트*는 AUTOSAR C++14를 *그대로 유지*하는 경우가 많다.

## AUTOSAR C++14의 구조

총 340+개 규칙. *6 카테고리, 25 sub-category*로 분류.

| 카테고리 | 의미 | 항목 수 |
|---------|------|--------|
| **General Principles** | 컴파일·언어 사용 정책 | ~30 |
| **Lexical Conventions** | 식별자, 주석, 키워드 | ~15 |
| **Basic Concepts** | 선언, 타입, 변환 | ~50 |
| **Standard Conversions** | 묵시·명시 변환 | ~30 |
| **Expressions** | 표현식, 평가 | ~40 |
| **Statements** | 제어흐름, switch, goto | ~35 |
| **Declarations** | 변수, 함수, 클래스 | ~25 |
| **Classes** | OOP, RAII, virtual | ~40 |
| **Templates** | 제네릭 프로그래밍 | ~30 |
| **Exception Handling** | try/catch | ~25 |
| **Standard Library** | STL 사용 | ~20 |

각 규칙은 다음 메타데이터를 가진다.

```
Rule A0-1-1
Category    : Required / Advisory
Severity    : Error / Warning
Decidable   : Decidable / Undecidable
Reference   : MISRA C++:2008 0-1-1 (있으면)
Reason      : 왜 이 규칙이 필요한가
```

## 강제도 — MISRA와 비슷

| 강제도 | 의미 |
|--------|------|
| **Required** | 원칙적 준수, deviation 허용 |
| **Advisory** | 권장 |
| **Document** | 문서화만 |

MISRA C의 *Mandatory*는 AUTOSAR에서 *Required + Decidable + Error*에 해당. 동일한 deviation 절차.

## ISO 26262와의 매핑

AUTOSAR C++14는 *ISO 26262 Part 6*의 *코딩 가이드라인 요건*을 직접 충족한다.

```
ISO 26262 Part 6, Clause 5.4
  "A set of recommended coding guidelines shall be applied..."

AUTOSAR C++14가 이를 충족.

ASIL 등급별 적용
  ASIL A      Advisory 일부 면제 가능
  ASIL B      Required 모두 + Advisory 일부
  ASIL C      Required 모두 + Advisory 권장
  ASIL D      Required 모두 + Advisory 강력 권장
```

자율주행 SoC 펌웨어는 *ASIL D + AUTOSAR C++14* 조합이 일반적이다.

## C와 C++ 표준의 차이 — 핵심

C++가 *훨씬 더 큰 표면적*을 가지므로 가이드라인이 *더 많고 더 복잡*하다.

| 주제 | C 표준 | C++ 표준 |
|------|--------|---------|
| 메모리 | 동적 할당 금지 (MISRA 21.3) | RAII로 *대체* |
| 함수 | 단일 진입·종료 | constructor/destructor 호출 추적 |
| 가변 인자 | `va_list` 금지 | variadic template (compile-time) 권장 |
| 다중 상속 | N/A | virtual 상속 정책 |
| 예외 | N/A | try/catch 정책 |

## 시리즈 로드맵

1. **Ch 1 (지금)** — AUTOSAR 배경, Classic/Adaptive, C++14 채택, MISRA 관계.
2. **Ch 2** — 언어 환경: General Principles, Lexical, 빌드.
3. **Ch 3** — 표현식·변환: Basic Concepts, Standard Conversions.
4. **Ch 4** — 함수·람다: Declarations, lambda capture, noexcept.
5. **Ch 5** — 클래스: OOP, RAII, virtual, special member functions.
6. **Ch 6** — 템플릿: 제네릭 프로그래밍, SFINAE, concept.
7. **Ch 7** — 예외 처리: try/catch 정책, exception safety.
8. **Ch 8** — STL: container, algorithm 사용 정책.
9. **Ch 9** — 동시성·메모리: thread, atomic, memory order.
10. **Ch 10** — 도구·인증·MISRA C++:2023 마이그레이션.

## 도구 — AUTOSAR 분석기

| 도구 | AUTOSAR 지원 |
|------|-------------|
| Helix QAC | 공식 채택, ISO 26262 qualification |
| Polyspace Bug Finder | AUTOSAR 검사 패키지 |
| Coverity | AUTOSAR 매핑 |
| Klocwork | AUTOSAR 분류 |
| **clang-tidy** | `cppcoreguidelines-*`, `bugprone-*`이 일부 커버 |

MISRA C와 마찬가지로 *Tool Qualification*이 ASIL D 인증에 필수.

## 정리

- AUTOSAR C++14는 *Adaptive AUTOSAR* 플랫폼의 C++ 코딩 표준.
- 340+개 규칙, *Required/Advisory/Document* 분류.
- ISO 26262 Part 6 코딩 가이드라인 요건을 충족.
- *MISRA C++:2008 후속*. 2023부터는 *MISRA C++:2023이 통합 후계*.
- 자율주행·ADAS·V2X 펌웨어가 주 적용 분야.

## 다음 장 예고

2장은 General Principles + Lexical + Build — 컴파일 환경 가정, 식별자 규칙, *one definition rule* 까지.

## 관련 항목

- [MISRA C Ch 1 — MISRA란](/blog/embedded/automotive/misra-c/chapter01-introduction)
- [CERT C Ch 1](/blog/embedded/automotive/cert-c/chapter01-intro-vs-misra)
- [AUTOSAR 공식](https://www.autosar.org/)
- [AUTOSAR C++14 Coding Guidelines PDF](https://www.autosar.org/fileadmin/standards/adaptive/22-11/AUTOSAR_RS_CPP14Guidelines.pdf)
