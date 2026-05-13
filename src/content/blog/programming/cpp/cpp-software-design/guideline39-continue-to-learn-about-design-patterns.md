---
title: "가이드라인 39: 디자인 패턴에 대해 계속 학습하라"
date: 2026-05-15T10:00:00
description: "39개 가이드라인의 마무리다. 패턴 학습은 평생의 과제이며, 모던 C++의 진화와 함께 디자인의 본질도 계속 변해 간다."
tags: [C++, Software Design, Patterns, Learning]
series: "C++ Software Design"
seriesOrder: 39
---

## 왜 이 가이드라인이 중요한가?

39개 가이드라인의 **마지막** 글이다.

핵심 메시지는 **여기서 끝이 아니다**라는 것이다. 디자인은 다음과 같은 성격을 띤다.

- 평생 학습이 필요하다
- 언어가 진화하면서 함께 바뀐다
- 도메인과 문맥마다 달라진다
- 패턴 자체도 계속 진화한다

이 시리즈는 Iglberger가 정리한 **현재의 모범**이다. 5년 뒤에는 새 도구, 새 통찰, 새 패턴이 자리잡을 것이다.

이 가이드라인은 **다음에 무엇을 학습할지** 알려 주는 지침서 역할을 한다.

## 핵심 주제 — 시리즈 회고

Iglberger의 네 가지 큰 메시지(가이드라인 1-3, 22 등)는 다음과 같다.

1. **디자인은 의존성 관리다** (가이드라인 1)
2. **조합이 상속보다 낫다** (가이드라인 20)
3. **값 의미론을 우선한다** (가이드라인 22)
4. **변경에 대비한다** (가이드라인 2, 5)

이 네 가지가 시리즈 전체를 관통한다. 모든 패턴은 이 목표를 달성하기 위한 도구다.

## 학습 방향 1 — 클래식 패턴 깊이 파기

이 시리즈가 다룬 패턴은 다음과 같다.

| 카테고리 | 패턴 |
|---|---|
| 생성 | Singleton, Prototype |
| 구조 | Adapter, Bridge, Decorator |
| 행동 | Visitor, Strategy, Command, Observer |
| 모던 C++ | CRTP, Type Erasure, External Polymorphism |

다루지 않은 패턴도 많다.

- 생성 — Factory Method, Abstract Factory
- 구조 — Composite, Facade, Flyweight, Proxy
- 행동 — Chain of Responsibility, Iterator, Mediator, Memento, State, Template Method

자세한 내용은 [GoF 시리즈](/blog/programming/design/gof-design-patterns/)에서 23개 패턴을 모두 다룬다.

## 학습 방향 2 — 모던 C++의 진화

```
C++03 → C++11 → C++14 → C++17 → C++20 → C++23 → C++26 (개발 중)
```

각 표준이 디자인에 미친 영향은 다음과 같다.

- **C++11** — 이동 의미론과 람다로 값 의미론이 부활했다
- **C++14** — 제네릭 람다, 변수 템플릿
- **C++17** — `std::variant`, `std::optional`, fold expression
- **C++20** — Concepts, Modules, Coroutines, Ranges
- **C++23** — `std::expected`, `std::move_only_function`
- **C++26+** — Reflection이 기대된다, 더 많은 표준 라이브러리 기능

새 도구가 등장할 때마다 새 패턴이 함께 등장한다.

## 학습 방향 3 — Functional Programming의 영향

FP 개념이 C++에 흡수된 사례다.

- 람다 → 1급 함수
- `std::function` → 다형 함수
- `std::optional` → Maybe monad
- `std::expected` → Either monad
- `std::ranges` → pipeline과 합성
- Coroutines → 비동기 추상

FP 스타일의 패턴도 많이 쓰인다.

- Map / Filter / Reduce → `std::transform`, `std::ranges`
- Monad → `optional::transform`, `expected::and_then` (C++23)
- Functor 합성
- 불변성 (immutability)
- 순수 함수

C++은 이제 모던 OO와 FP를 함께 쓰는 혼합 언어다.

## 학습 방향 4 — 도메인 특화 패턴

일반 패턴 외에도 도메인별 패턴이 있다.

**게임 개발**

- Entity-Component-System (ECS)
- Game Loop
- Object Pool
- Spatial Partitioning

**네트워크**

- Reactor, Proactor
- Active Object
- Half-Sync/Half-Async

**고성능 / HPC**

- SIMD 벡터화
- 캐시 친화적 데이터 레이아웃 (AoS vs SoA)
- Lock-free 자료구조
- Coroutine 기반 I/O

**임베디드**

- State machine
- Event-driven
- Static polymorphism (no heap)

## 학습 방향 5 — 아키텍처 패턴

이 시리즈가 다룬 것은 클래스와 컴포넌트 수준이다. 그 위에는 더 큰 패턴들이 있다.

- **Layered Architecture**
- **Hexagonal / Clean Architecture** (가이드라인 9)
- **Microservices**
- **CQRS, Event Sourcing**
- **Domain-Driven Design** (Eric Evans)

자세한 내용은 가이드라인 10의 ADR과 C4 model 추천 도서들을 참고한다.

## 학습 방향 6 — 책 추천

**필수**

- *Design Patterns* (GoF, 1994) — 클래식
- *C++ Software Design* (Iglberger, 2022) — 이 시리즈의 원본
- *Effective Modern C++* (Meyers, 2014) — [시리즈 링크](/blog/programming/cpp/effective-modern-cpp/)
- *Effective C++ 3rd* (Meyers, 2005) — [시리즈 링크](/blog/programming/cpp/effective-cpp/)
- *Beautiful C++* (Vandevoorde, 2020) — [시리즈 링크](/blog/programming/cpp/beautiful-cpp/)

**Modern OO / 디자인**

- *Clean Architecture* (Martin, 2017)
- *Domain-Driven Design* (Evans, 2003)
- *Patterns of Enterprise Application Architecture* (Fowler, 2002)
- *Refactoring* (Fowler, 1999/2018)

**Functional / 합성**

- *Functional Programming in C++* (Čukić, 2018)
- *Category Theory for Programmers* (Milewski, 2019)

**Concurrency**

- *C++ Concurrency in Action* (Williams, 2019)
- *The Art of Multiprocessor Programming* (Herlihy & Shavit, 2020)

## 학습 방향 7 — 실전 / 코드 읽기

오픈소스 읽기는 가장 효과적인 학습이다.

- LLVM, Clang — 거대한 C++ 코드베이스의 디자인
- Boost — 패턴 응용의 보고
- Folly (Facebook) — 모던 C++
- Abseil (Google) — 표준 보완
- Qt — 침습적 OO의 모범

자체 프로젝트로 손에 익히는 것도 중요하다.

- 작은 게임 / 시뮬레이션
- 자체 컨테이너 라이브러리
- DSL (Domain-Specific Language)
- 인터프리터 / 컴파일러

직접 코드를 짜다 보면 패턴이 자연스러워진다.

## 학습 방향 8 — 컨퍼런스 / 강연

영어권 강연이 풍부하다. 유튜브에서 손쉽게 찾을 수 있다.

- CppCon — 매년 개최
- Meeting C++
- C++Now
- ACCU

Iglberger 본인 강연도 추천이다. "Breaking Dependencies", "The Truth of the Visitor Pattern" 등이 있다.

## 학습 방향 9 — 도구 / 분석

**정적 분석**

- clang-tidy
- cppcheck
- PVS-Studio

**컴파일러 옵션** — 경고를 활성화한다 (`-Wall -Wextra -Wpedantic`).

**프로파일링**

- perf, vtune
- Tracy, easy_profiler
- Compiler Explorer (godbolt.org) — 어셈블리 확인

도구를 통해 디자인 의도와 실제 결과가 일치하는지 확인할 수 있다.

## 학습 방향 10 — 다른 언어

C++만 보면 시야가 좁아진다. 다른 언어의 디자인도 함께 살펴본다.

- **Rust** — 소유권과 borrow checker, 메모리 안전성의 새 패러다임
- **Haskell** — 타입 시스템의 극한, 순수 함수
- **Lisp / Scheme** — 매크로와 메타프로그래밍
- **Go** — 단순성과 동시성 (goroutine)
- **Python** — 객체 모델의 단순성

각 언어가 보여 주는 디자인 사고를 익힌 뒤 C++로 돌아오면 새로운 시각이 열린다.

## 마지막 메시지 — Iglberger의 정신

> "Design is the art of managing dependencies — and the science of preparing for change."

디자인은 코드 작성의 일부가 아니라 **본질**이다.

39개 가이드라인은 도구이지 목적이 아니다. **목적**은 변경에 유연하고, 의존성이 명확하며, 테스트 가능하고, 효율적인 코드를 만드는 것이다.

이 시리즈의 끝이 곧 시작이다.

## 시리즈 회고 — 가이드라인 정리

```
Ch 1: 디자인의 본질 (1-3)
  — 변경 / 의존성 / 결합

Ch 2: 디자인 원칙 (4-10)
  — 5 SOLID + 아키텍처 문서

Ch 3: 디자인 패턴의 의도 (11-14)
  — 패턴 이해 / 오해 / 명명

Ch 4: Visitor (15-18)
  — Expression Problem, std::variant

Ch 5: Strategy + Command + 값 의미론 (19-23)
  — 모던 변형

Ch 6: Adapter, Observer, CRTP (24-27)
  — 구조 / 행동 / 컴파일 타임

Ch 7: Bridge, Prototype, External Polymorphism (28-31)
  — 의존 절단 / 복사 / 비-침습

Ch 8: Type Erasure (32-34)
  — 값 의미론 다형성

Ch 9: Decorator (35-36)
  — 책임 추가 / 런타임 vs 컴파일 타임

Ch 10: Singleton (37-38)
  — 안티 패턴 검토

Ch 11: 마무리 (39)
  — 계속 학습
```

## 실무 가이드 — 학습 루틴

```
주간:
- 패턴 한 개를 새 도메인에 적용해 본다
- 오픈소스 코드 한 모듈을 읽는다
- 자신의 코드의 디자인 효과를 측정한다

월간:
- 책 한 권을 읽는다 (디자인 / FP / 아키텍처)
- 컨퍼런스 강연 1~2개를 본다
- 토이 프로젝트로 패턴을 실험한다

연간:
- 큰 책을 끝낸다 (DDD, Clean Architecture 등)
- 다른 언어 하나를 익힌다 (Rust / Haskell)
- 1년 전 코드를 다시 보고 회고한다
```

## 실무 가이드 — 체크리스트

- [ ] GoF 23 패턴의 사용 시점을 인지하고 있는가?
- [ ] 모던 C++ 변형(variant, Type Erasure)을 활용하고 있는가?
- [ ] 디자인 결정을 측정으로 뒷받침하는가?
- [ ] 다른 언어나 패러다임에서 영감을 얻고 있는가?
- [ ] 코드 리뷰와 회고로 디자인 학습을 가속하고 있는가?
- [ ] 새 표준(C++23/26)에서 새 도구를 채택하고 있는가?

## 핵심 정리

1. **39 가이드라인은 시작**이다 — 평생의 학습이 따른다
2. **네 가지 큰 메시지** — 의존성, 조합, 값 의미론, 변경 대비
3. **확장 영역** — GoF 전체, 아키텍처 패턴, FP, 도메인 특화
4. **C++의 진화** — 새 표준이 새 디자인 도구를 가져온다
5. **다른 언어**는 시야를 넓혀 준다
6. **실전** — 오픈소스, 자체 프로젝트, 측정
7. 도구가 아니라 **좋은 디자인 그 자체**가 목적이다

## 관련 항목 — 외부 자원

- [GoF 디자인 패턴 시리즈](/blog/programming/design/gof-design-patterns/) — 23 패턴 완전 정리
- [Effective C++ 시리즈](/blog/programming/cpp/effective-cpp/) — Meyers 클래식
- [Effective Modern C++ 시리즈](/blog/programming/cpp/effective-modern-cpp/) — C++11/14
- [Beautiful C++ 시리즈](/blog/programming/cpp/beautiful-cpp/) — 모던 가이드라인
- [가이드라인 1: Software Design의 중요성](/blog/programming/cpp/cpp-software-design/guideline01-understand-the-importance-of-software-design) — 시리즈의 시작점

## 시리즈 완결 — 감사 인사

39개 가이드라인을 끝까지 함께해 주셔서 감사하다.

이 시리즈가 더 좋은 C++ 코드, 더 좋은 디자인, 더 좋은 엔지니어가 되는 데 작은 보탬이 되길 바란다.

**좋은 디자인은 변경에 친화적인 코드다.**

— Hawk
