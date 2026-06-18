---
title: "Embedded C++ for Real Systems — 임베디드 모던 C++ 시리즈 소개"
date: 2026-04-28T09:00:00
description: "어디까지 C++를 써도 되는가? RAII, constexpr, no-exception 설계부터 lock-free 패턴까지. 임베디드에서 안전하게 C++를 쓰는 법."
series: "Embedded C++ for Real Systems"
seriesOrder: 0
tags: [cpp, embedded, raii, constexpr, no-exception, modern-cpp, arm, templates]
type: tech
featured: true
---

## 이 시리즈를 쓰는 이유

"임베디드에서 C++를 쓰면 안 됩니다."

이런 말을 들어본 적 있으신가요? 아직도 많은 임베디드 팀에서는 C++를 금기시합니다. 이유는 대략 이렇습니다:

- "C++는 무겁다"
- "예외 처리가 예측 불가능하다"
- "동적 할당이 위험하다"
- "런타임 오버헤드가 있다"

**일부는 맞고, 일부는 틀립니다.**

Modern C++의 많은 기능은 **zero-cost abstraction**입니다. 컴파일 타임에 모든 것이 결정되고, 런타임 오버헤드는 없습니다. 이 시리즈는 임베디드에서 C++를 **안전하고 효율적으로** 사용하는 방법을 다룹니다.

## 대상 독자

1. **C에서 C++로 전환하려는 임베디드 개발자**
   - "C++를 써도 될까?" 고민 중인 분
   - 팀에 C++ 도입을 설득해야 하는 분

2. **C++를 쓰고 있지만 확신이 없는 분**
   - "이렇게 해도 되나?" 싶은 코드가 있는 분
   - Best practice를 알고 싶은 분

3. **Modern C++ 기능을 임베디드에 적용하고 싶은 분**
   - C++11/14/17/20/23 기능 중 뭘 써도 되는지
   - 어떤 기능은 피해야 하는지

## 시리즈 구성

**총 5개 Part, 40개 글**로 구성됩니다.

C++ 기초부터 zero-cost abstraction, 메모리 관리, 고급 패턴, 하드웨어 추상화까지 체계적으로 다룹니다.

---

### Part 1: C++ in Embedded Context (8개)

임베디드에서 C++를 사용하는 기본 원칙을 다룹니다.

| # | 글 제목 | 핵심 내용 |
|---|--------|----------|
| 1-01 | C++ vs C: 무엇이 다른가 | 오버헤드 분석, 장단점 |
| 1-02 | 컴파일러 플래그 가이드 | -fno-exceptions, -fno-rtti, -Os |
| 1-03 | 런타임 요구사항 | libstdc++, newlib, 최소 런타임 |
| 1-04 | 코드 크기 분석 | bloat 원인, 측정 방법 |
| 1-05 | ABI 호환성 | C/C++ 혼합, name mangling |
| 1-06 | 스타트업 코드 | static 생성자, __libc_init_array |
| 1-07 | 링커 스크립트와 C++ | .init_array, 섹션 배치 |
| 1-08 | C++ 표준 선택 | C++11/14/17/20/23 비교 |

---

### Part 2: Zero-Cost Abstractions (10개)

런타임 비용 없이 추상화하는 방법을 다룹니다.

| # | 글 제목 | 핵심 내용 |
|---|--------|----------|
| 2-01 | RAII 기초 | 리소스 관리, 소멸자 보장 |
| 2-02 | RAII 실전 패턴 | Lock, Handle, ScopedXxx |
| 2-03 | constexpr 기초 | 컴파일 타임 계산 |
| 2-04 | constexpr 고급 | LUT 생성, CRC 테이블 |
| 2-05 | consteval과 constinit | C++20 기능 |
| 2-06 | Templates 기초 | 함수/클래스 템플릿 |
| 2-07 | Templates 비용 분석 | 코드 bloat 측정, 제어 |
| 2-08 | Static Polymorphism | CRTP, virtual 없이 다형성 |
| 2-09 | Type Traits 활용 | std::is_*, SFINAE |
| 2-10 | Concepts (C++20) | 템플릿 제약, 가독성 |

---

### Part 3: Memory & Error Handling (10개)

메모리와 에러를 안전하게 다루는 방법을 다룹니다.

| # | 글 제목 | 핵심 내용 |
|---|--------|----------|
| 3-01 | 동적 할당 없이 C++ 쓰기 | std::array, static 할당 |
| 3-02 | Custom Allocator 기초 | Allocator 인터페이스 |
| 3-03 | Pool Allocator 구현 | 고정 크기 블록 |
| 3-04 | std::pmr 활용 | polymorphic_allocator |
| 3-05 | No-Exception 설계 | -fno-exceptions 환경 |
| 3-06 | 에러 처리 패턴 | error code, optional |
| 3-07 | std::expected (C++23) | Result 타입 |
| 3-08 | No-RTTI 설계 | typeid 없이 타입 정보 |
| 3-09 | 스마트 포인터 선택 | unique_ptr vs shared_ptr |
| 3-10 | 소유권 모델 | Ownership, borrowing |

---

### Part 4: Advanced Patterns (8개)

고급 C++ 패턴을 임베디드에 적용합니다.

| # | 글 제목 | 핵심 내용 |
|---|--------|----------|
| 4-01 | Intrusive Containers | 동적 할당 없는 자료구조 |
| 4-02 | ETL 라이브러리 | Embedded Template Library |
| 4-03 | Lock-free 기초 | atomic, CAS |
| 4-04 | Lock-free Container | queue, stack |
| 4-05 | Type-safe Flags | enum class, 비트 플래그 |
| 4-06 | State Machine | 타입 안전한 상태 머신 |
| 4-07 | Compile-time FSM | constexpr 상태 머신 |
| 4-08 | Singleton 대안 | 의존성 주입, static |

---

### Part 5: Hardware Abstraction (4개)

C++로 하드웨어를 추상화하는 방법을 다룹니다.

| # | 글 제목 | 핵심 내용 |
|---|--------|----------|
| 5-01 | Register 추상화 | 타입 안전한 MMIO |
| 5-02 | GPIO 추상화 | 템플릿 기반 GPIO |
| 5-03 | Peripheral 추상화 | UART, SPI, I2C |
| 5-04 | HAL 설계 패턴 | 범용 HAL 구조 |

---

## 학습 로드맵

- **C++ 도입 검토 중** — Part 1 (기초) → Part 2-01~04 (RAII, constexpr)
- **이미 C++ 사용 중** — Part 2 (zero-cost) → Part 3 (메모리/에러) → Part 4 (패턴)
- **하드웨어 추상화 설계** — Part 2-06~08 (템플릿) → Part 5 (HAL)

## 핵심 원칙

### 1. 측정 가능한 주장만 한다

- "빠르다" → "어셈블리 N줄, 사이클 M개"
- "안전하다" → "컴파일 타임에 검증됨"
- Godbolt(Compiler Explorer)로 확인

### 2. 대안을 제시한다

- "이건 쓰지 마세요" → "대신 이걸 쓰세요"
- 금지만 하지 않고 해결책 제공

### 3. C를 비하하지 않는다

- C가 더 적합한 상황도 있음
- 부트 코드, 극소형 MCU, 인증 제약

## 핵심 질문

시리즈 전체를 관통하는 질문:

1. **이 기능이 런타임 비용을 추가하는가?**
2. **이 기능이 디버깅을 더 쉽게 만드는가?**
3. **이 기능이 코드 품질을 끌어올리는가?**
4. **바이너리 크기가 감당 가능한가?**

## 대상 환경

| 항목 | 기준 |
|-----|------|
| 아키텍처 | ARM Cortex-M/A, RISC-V |
| OS | bare-metal, FreeRTOS, Zephyr |
| 컴파일러 | GCC, Clang, ARM Compiler |
| 플래그 | -fno-exceptions, -fno-rtti |
| 할당 | 정적 우선, 제한된 동적 |
| 중요 지표 | 코드 크기, latency, determinism |

## 컴파일러 플래그 가이드

```makefile
# 기본 설정
CXXFLAGS += -std=c++17
CXXFLAGS += -fno-exceptions
CXXFLAGS += -fno-rtti
CXXFLAGS += -fno-threadsafe-statics

# 최적화
CXXFLAGS += -Os          # 또는 -O2
CXXFLAGS += -flto        # Link Time Optimization

# 경고
CXXFLAGS += -Wall -Wextra -Wpedantic
CXXFLAGS += -Werror

# ARM 특화
CXXFLAGS += -mcpu=cortex-m4
CXXFLAGS += -mthumb
CXXFLAGS += -mfloat-abi=hard
```

## 사전 지식

- C 프로그래밍 (포인터, 구조체)
- 기본적인 C++ 문법
- 임베디드 기초 (레지스터, 인터럽트)
- 컴파일/링크 과정 이해

## 레퍼런스

**서적**
- *Effective Modern C++* - Scott Meyers
- *C++ Core Guidelines* - Stroustrup & Sutter
- *Real-Time C++* (4th ed) - Christopher Kormanyos
- *Large-Scale C++ Volume I* - John Lakos

**온라인**
- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/)
- [Embedded Template Library (ETL)](https://www.etlcpp.com/)
- [Compiler Explorer](https://godbolt.org/)
- [Embedded Artistry](https://embeddedartistry.com/)

**컨퍼런스**
- CppCon Embedded Track
- Meeting C++ Embedded
- Embedded World

## 이 시리즈의 목표

이 시리즈를 완주하면:

- **C++ 도입 여부를 판단**할 수 있다
- **zero-cost abstraction을 활용**할 수 있다
- **메모리 안전한 코드를 작성**할 수 있다
- **예외/RTTI 없이 설계**할 수 있다
- **하드웨어를 타입 안전하게 추상화**할 수 있다
- **코드 bloat를 통제**할 수 있다

---

다음 글: [Part 1-01: C++ vs C: 무엇이 다른가](/blog/embedded/embedded-cpp/part1-01-cpp-vs-c)
