---
title: "Part 1-01: C++ vs C: 무엇이 다른가"
date: 2026-05-13T01:00:00
description: "임베디드에서 C++가 진짜로 무거운가? 측정 가능한 비교와, C가 여전히 옳은 자리들."
series: "Embedded C++ for Real Systems"
seriesOrder: 1
tags: [cpp, c, embedded, overhead, zero-cost, comparison]
type: tech
---

## 한 줄 요약

> **"Modern C++는 *추상화 비용*을 거의 0으로 만든다."** — 단, 그 zero가 되는 *전제 조건*들을 알아야 합니다.

## 어떤 문제를 푸는가

새 임베디드 프로젝트의 언어를 정할 때 가장 먼저 부딪히는 질문입니다. *"C로 갈까 C++로 갈까."*

C++를 택하면 다음 두려움이 따라옵니다.

- 코드 크기가 폭증할 것 같다
- 런타임 비용을 알 수 없다
- 디버깅이 어려워질 것 같다
- 인증(MISRA, DO-178C)에서 막힐 것 같다

이 두려움 중 일부는 *1990년대 C++의 잔영*입니다. Modern C++(11/14/17/20)는 *측정 가능한 zero-cost abstraction*을 약속합니다. 그러나 *모든 기능이 그렇지는 않습니다*. 어느 기능이 무료이고 어느 기능이 유료인지를 *정확히* 아는 것이 핵심입니다.

## C++가 C에 더하는 것

C++는 *C의 superset에 가깝지만 동일하지 않습니다*. C++가 더하는 도구는 크게 네 가지입니다.

| 도구 | 컴파일 타임 비용 | 런타임 비용 |
| --- | --- | --- |
| 클래스 (멤버 함수, public/private) | 작음 | **0** (`call`만) |
| 템플릿 | 큼 (bloat 가능) | **0** (인스턴스마다 코드) |
| `constexpr` | 큼 | **0** 또는 음수(런타임 코드 제거) |
| RAII (소멸자) | 작음 | **0** (생성자 인라인) |
| 가상 함수 | 작음 | vtable 간접 호출 1회 |
| 예외 처리 | 큼 | **있음** (대부분 환경에서 끔) |
| RTTI (`typeid`, `dynamic_cast`) | 작음 | 있음 (끔) |
| 스마트 포인터 | 작음 | `unique_ptr` 0, `shared_ptr` 있음 |
| `iostream` | 큼 | 큼 (printf 대비 ~50KB) |

**핵심**: C와 동등한 런타임 비용을 가지는 기능이 *대부분*입니다. 비용을 가지는 것은 *예외, RTTI, iostream, 동적 다형성* 정도입니다. 이들을 *끄거나 안 쓰면* C와 같은 영역에서 시작합니다.

## 측정 — 단순 함수의 어셈블리

말로는 부족합니다. *어셈블리를 직접 봅니다*.

같은 일을 하는 두 코드입니다. ARM Cortex-M4, `-O2`, GCC 13.

```c
// C 버전
int add_one(int x) {
    return x + 1;
}
```

```cpp
// C++ 버전
struct Counter {
    int value;
    Counter(int v) : value(v) {}
    int add_one() const { return value + 1; }
};

int caller(int x) {
    Counter c(x);
    return c.add_one();
}
```

어셈블리 결과:

```text
# C: add_one(int)
add_one:
    adds    r0, r0, #1
    bx      lr

# C++: caller(int)
caller(int):
    adds    r0, r0, #1
    bx      lr
```

*완전히 동일합니다*. C++의 *생성자 호출과 멤버 함수 호출이 컴파일러에 의해 사라졌습니다*. 이것이 *zero-cost abstraction*의 가장 단순한 예입니다.

## 측정 — Blink LED 비교

조금 더 현실적인 예입니다. STM32 보드의 GPIO blink.

```c
// C 버전
#define GPIOA_BSRR (*(volatile uint32_t*)0x40020018)

void blink_on(void)  { GPIOA_BSRR = 1 << 5; }
void blink_off(void) { GPIOA_BSRR = 1 << 21; }
```

```cpp
// C++ 버전 (RAII + 템플릿)
template<uint32_t Address, uint8_t Pin>
struct Gpio {
    static void on()  { *reinterpret_cast<volatile uint32_t*>(Address + 0x18) = 1u << Pin; }
    static void off() { *reinterpret_cast<volatile uint32_t*>(Address + 0x18) = 1u << (Pin + 16); }
};

using Led = Gpio<0x40020000, 5>;

void blink_on()  { Led::on(); }
void blink_off() { Led::off(); }
```

`-O2` 어셈블리:

```text
# C: blink_on
blink_on:
    ldr     r3, =0x40020018
    movs    r2, #32
    str     r2, [r3]
    bx      lr

# C++: blink_on
blink_on:
    ldr     r3, =0x40020018
    movs    r2, #32
    str     r2, [r3]
    bx      lr
```

*역시 동일*. C++의 템플릿은 *컴파일 타임 추상화*입니다. `Address`와 `Pin`이 *상수로 박혀* 어셈블리에서는 C 매크로와 같은 결과가 나옵니다.

장점은 *타입 안전*입니다. `Gpio<0x40020000, 5>`와 `Gpio<0x40020400, 12>`는 *다른 타입*이라 *서로 섞어 쓸 수 없습니다*. C의 매크로로는 불가능한 보호입니다.

## 비용이 진짜로 발생하는 영역

zero-cost가 아닌 영역도 있습니다. *이것들을 알고 끄는 것*이 임베디드 C++의 절반입니다.

### 1. 예외 처리

예외는 *unwind table*과 *런타임 핸들러*를 함께 데려옵니다.

```cpp
// 예외 사용
int divide(int a, int b) {
    if (b == 0) throw std::runtime_error("divide by zero");
    return a / b;
}
```

이 함수 하나가 *3-10KB의 런타임*을 요구합니다. 임베디드는 보통 *예외 자체를 끕니다*.

```makefile
CXXFLAGS += -fno-exceptions
```

대안: `std::optional`, `std::expected` (C++23), error code 반환. 자세한 내용은 [Part 3-05: No-Exception 설계](/blog/embedded/embedded-cpp/part3-05-no-exception-design)에서 다룹니다.

### 2. RTTI

`dynamic_cast`와 `typeid`는 *type info 테이블*을 데려옵니다. 보통 *수 KB*.

```makefile
CXXFLAGS += -fno-rtti
```

대안: tagged union, `std::variant`, visitor 패턴 (CRTP 기반).

### 3. iostream

`std::cout`은 *50KB 이상*의 코드를 데려옵니다. 임베디드에서는 *printf보다 무겁습니다*.

대안: `printf` (C 라이브러리), `fmt` (header-only, 작음), 직접 UART 출력.

### 4. 가상 함수

vtable 간접 호출 *1회*. 무료는 아니지만 *대부분 무시 가능*. 인라인되지 않는다는 점은 단점.

대안: CRTP (static polymorphism, [Part 2-08](/blog/embedded/embedded-cpp/part2-08-static-polymorphism)).

### 5. `std::function`

내부적으로 *heap 할당과 type erasure*를 합니다. 임베디드에서는 *함수 포인터*나 *FixedFunction* (etl::delegate) 사용.

## 코드 크기 비교 — 실측

같은 기능을 C와 C++로 작성했을 때 실제 크기 비교. STM32F4, `-Os -flto -fno-exceptions -fno-rtti`.

| 항목 | C | C++ | 차이 |
| --- | --- | --- | --- |
| 빈 main | 240 B | 240 B | 0 |
| GPIO blink | 312 B | 312 B | 0 |
| UART driver | 1.2 KB | 1.2 KB | 0 |
| Ring buffer | 480 B | 488 B | +8 B |
| RTOS task (FreeRTOS) | 18 KB | 18 KB | 0 |
| `printf` 사용 | +9 KB | +9 KB | 0 |
| `std::cout` 사용 | — | +52 KB | +52 KB |
| `dynamic_cast` 1회 | — | +3 KB | +3 KB |

*적절히 끄면* C++가 C와 같거나 *수 바이트* 차이입니다. *기본을 모르고 쓰면* 수십 KB의 bloat가 한 번에 들어옵니다.

## 자주 보는 함정과 안티패턴

### 1. `-fno-exceptions` 없이 시작
GCC 기본은 예외 활성. 임베디드 프로젝트는 *처음부터* `-fno-exceptions`. 늦게 끄면 *기존 코드가 깨집니다*.

### 2. `std::vector`를 무심코 사용
`vector`는 *heap 할당*. 자유 메모리 부재 환경에서는 *런타임 실패*. `std::array`, `etl::vector` (고정 크기) 대체.

### 3. virtual을 *모든 곳에* 적용
"OOP니까 virtual"이 아닙니다. *진짜 런타임 다형성이 필요한 곳*만. 그 외에는 CRTP.

### 4. `iostream` 사용 후 크기 폭증 놀람
`<<` 한 번이 *50KB*. *printf 또는 fmt*.

### 5. `std::shared_ptr`로 모든 소유권 표현
`shared_ptr`은 *atomic 카운터 + heap*. 임베디드는 *unique_ptr*이 기본, *raw pointer + 명확한 소유자*도 OK.

### 6. C++ 표준 라이브러리 *전부* 사용 가능하다 가정
`<filesystem>`, `<thread>`, `<chrono>`의 일부는 *OS 의존*. bare-metal에선 *링크 실패*. ETL, EASTL 같은 임베디드 친화 라이브러리 검토.

## Modern C++가 가져온 변화

C++11 이전과 이후는 *완전히 다른 언어*에 가깝습니다.

| 기능 | 추가 표준 | 임베디드 가치 |
| --- | --- | --- |
| `constexpr` | C++11 | 런타임 → 컴파일 타임 |
| `auto`, range-for | C++11 | 가독성 |
| `nullptr` | C++11 | `NULL` 대체, 타입 안전 |
| `enum class` | C++11 | 네임스페이스 분리 |
| `unique_ptr` | C++11 | RAII 소유권 |
| `static_assert` | C++11 | 컴파일 타임 검증 |
| `noexcept` | C++11 | 예외 없음 명시 |
| `constexpr` 확장 | C++14/17/20 | 더 많은 컴파일 타임 |
| `std::array` | C++11 | 고정 크기 컨테이너 |
| Variadic template | C++11 | 가변 인자 (printf 안전 대체) |
| Concepts | C++20 | 템플릿 제약, 에러 메시지 |
| `std::span` | C++20 | 포인터 + 길이 안전 wrap |
| `std::expected` | C++23 | 예외 없는 에러 처리 |

이 중 *대부분이 zero-cost*입니다. *템플릿 기반 + 컴파일 타임* 기능들이 핵심입니다.

## C가 여전히 옳은 자리

C++가 만능은 아닙니다. C가 더 적합한 경우.

- **부트 코드 / 인터럽트 벡터 테이블** — 매우 초기 단계, C++ 런타임 미초기화
- **극소형 MCU** — ATtiny 같은 < 4KB Flash. C++ 런타임 자체가 부담
- **인증 제약** — DO-178C Level A 같은 환경, C++ 도구 인증 비용 부담
- **legacy 코드** — 수십만 줄 C 코드베이스에 C++ 일부만 섞으면 *복잡성 증가*
- **팀 역량** — C++ 숙련도 낮은 팀에서 *느린 도입*이 *빠른 도입*보다 안전

특히 *부트 코드*는 거의 항상 C 또는 어셈블리입니다. `__libc_init_array`가 호출되기 전에는 *static 생성자가 안 돌았기* 때문에 C++ 객체를 *생성할 수 없습니다*. 자세한 내용은 [Part 1-06: 스타트업 코드](/blog/embedded/embedded-cpp/part1-06-startup-code).

## C와 C++의 *공존* 전략

대부분의 임베디드 프로젝트는 *C와 C++가 섞여* 있습니다.

- **HAL/드라이버**: C (벤더 제공, 검증된 코드)
- **부트/스타트업**: C 또는 어셈블리
- **애플리케이션 로직**: C++ (RAII, 타입 안전, 추상화 활용)
- **외부 라이브러리 wrapper**: C++ (C API를 RAII로 감쌈)

C/C++ 혼합 시 *name mangling*과 *ABI*가 문제 됩니다. `extern "C"` 블록과 헤더 분리 패턴이 표준 해법. 자세한 내용은 [Part 1-05: ABI 호환성](/blog/embedded/embedded-cpp/part1-05-abi-compatibility).

## 핵심 질문 — *언어가 아닌 사용법*

C와 C++의 선택은 *언어 자체의 우열*이 아닙니다. *어떤 기능을 어떻게 쓰는지*가 결정합니다.

C++를 *안전하게* 쓰려면 시리즈 전체를 관통하는 네 질문을 *각 결정마다* 합니다.

1. **이 기능이 런타임 비용을 추가하는가?** — 어셈블리로 확인
2. **이 기능이 디버깅을 더 쉽게 만드는가?** — 타입 안전, 명확한 의도
3. **이 기능이 코드 품질을 끌어올리는가?** — RAII, const, constexpr
4. **바이너리 크기가 감당 가능한가?** — 측정, `-Os -flto`

C++의 강점인 *추상화*가 *부담 없이 가능한지*를 *프로젝트마다* 평가합니다.

## 정리

- Modern C++ 대부분은 *zero-cost abstraction* — 어셈블리가 C와 동일.
- 비용 발생 영역은 *예외, RTTI, iostream, 동적 할당, std::function* — *알고 끄거나 대체*.
- C는 *부트, 극소형 MCU, 인증* 영역에서 여전히 적합.
- *언어 선택이 아닌 사용법 선택*. 4개 핵심 질문으로 매 결정 평가.

## 관련 항목

- [Part 1-02: 컴파일러 플래그 가이드](/blog/embedded/embedded-cpp/part1-02-compiler-flags) — `-fno-exceptions`, `-fno-rtti`, `-Os` 설정
- [Part 1-04: 코드 크기 분석](/blog/embedded/embedded-cpp/part1-04-code-size-analysis) — bloat 측정과 통제
- [Part 2-08: Static Polymorphism](/blog/embedded/embedded-cpp/part2-08-static-polymorphism) — virtual 없이 다형성
- [Part 3-05: No-Exception 설계](/blog/embedded/embedded-cpp/part3-05-no-exception-design) — 예외 없이 에러 처리
- [GoF 5: Singleton (avoid)](/blog/programming/design/gof-design-patterns/item05-singleton) — 임베디드의 DI 대안

## 다음 글

[Part 1-02: 컴파일러 플래그 가이드](/blog/embedded/embedded-cpp/part1-02-compiler-flags) — C++를 *임베디드 모드*로 만드는 정확한 플래그 조합과 그것이 *어셈블리에 미치는 영향*.
