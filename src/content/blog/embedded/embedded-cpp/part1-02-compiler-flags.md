---
title: "임베디드 C++ 컴파일러 플래그 분석 — -fno-rtti·-fno-exceptions·-Os"
date: 2026-04-28T09:02:00
description: "C++를 임베디드 모드로 — -fno-exceptions, -fno-rtti, -Os, -flto. 각 플래그가 실제 바이너리에 무엇을 하는가."
series: "Embedded C++ for Real Systems"
seriesOrder: 2
tags: [cpp, embedded, compiler, gcc, clang, flags, optimization]
type: tech
---

## 한 줄 요약

> **"기본 C++ 설정은 데스크톱용입니다."** 임베디드는 예외 끄기, RTTI 끄기, 크기 최적화가 출발점입니다.

## 어떤 문제를 푸는가

GCC와 Clang의 기본 C++ 설정은 데스크톱 가정입니다. 동적 할당이 풍부하고, 예외가 자유롭고, RTTI가 켜져 있습니다. 임베디드에서는 이 기본을 거의 모두 끄거나 바꿉니다.

문제는 어떤 플래그를 어떤 순서로 켜야 하는지 명확하지 않다는 점입니다. 잘못된 조합은 링크 실패를 만들고, 옳은 조합은 수십 KB의 코드를 사라지게 합니다.

이 글은 임베디드 C++ 프로젝트의 표준 플래그 셋과 각 플래그가 실제로 무엇을 하는지 정리합니다.

## 임베디드 표준 플래그 셋

대부분의 임베디드 C++ 프로젝트가 시작점으로 쓸 만한 조합입니다.

```makefile
# 언어 표준
CXXFLAGS += -std=c++17

# 임베디드 핵심
CXXFLAGS += -fno-exceptions
CXXFLAGS += -fno-rtti
CXXFLAGS += -fno-threadsafe-statics
CXXFLAGS += -fno-use-cxa-atexit

# 최적화
CXXFLAGS += -Os
CXXFLAGS += -flto
CXXFLAGS += -ffunction-sections
CXXFLAGS += -fdata-sections

# 링커
LDFLAGS  += -Wl,--gc-sections

# 경고
CXXFLAGS += -Wall -Wextra -Wpedantic
CXXFLAGS += -Wnon-virtual-dtor
CXXFLAGS += -Wold-style-cast

# 디버그 정보 (release에도 유지)
CXXFLAGS += -g3 -gdwarf-4

# ARM 특화 (예시)
CXXFLAGS += -mcpu=cortex-m4 -mthumb -mfloat-abi=hard -mfpu=fpv4-sp-d16
```

각 플래그가 무엇을 하는지 하나씩 살펴봅니다.

## 언어 표준 — `-std=c++17`

C++ 표준을 명시합니다. 표준에 따라 사용 가능한 기능과 표준 라이브러리가 달라집니다.

| 표준 | 권장 환경 | 핵심 |
| --- | --- | --- |
| C++11 | 모든 임베디드 | RAII, constexpr 기초, unique_ptr |
| C++14 | GCC 4.9+ | constexpr 확장, generic lambda |
| **C++17** | **권장 기본** | `std::optional`, `std::variant`, structured bindings |
| C++20 | GCC 10+, 신규 프로젝트 | concepts, `std::span`, consteval |
| C++23 | GCC 13+, 실험적 | `std::expected`, `<print>` |

ARM Compiler 6(armclang)은 C++17을 완전히 지원합니다. legacy ARM Compiler 5는 C++03만 지원하므로 새 프로젝트에서는 피합니다.

자세한 표준 선택 기준은 [Part 1-08](/blog/embedded/embedded-cpp/part1-08-cpp-standard-choice)에서 다룹니다.

## `-fno-exceptions` — 예외 처리 끄기

C++ 예외는 런타임 unwind table과 handler를 함께 데려옵니다.

```cpp
// 예외 켜짐: 이 함수가 unwind table을 추가
int divide(int a, int b) {
    if (b == 0) throw std::runtime_error("div by zero");
    return a / b;
}
```

`-fno-exceptions` 효과:

- throw 문이 컴파일 에러가 됩니다
- 표준 라이브러리의 예외 던지는 함수가 `abort()` 또는 undefined behavior로 동작합니다
- unwind table이 제거되어 보통 5-20KB가 감소합니다
- `noexcept` 명시 함수의 코드가 더 단순해집니다

```text
# 같은 함수, 예외 켜짐 vs 꺼짐 (ARM Cortex-M4, -Os)

# -fexceptions: 312 B (함수 본문 + unwind 정보)
# -fno-exceptions: 32 B
```

대안으로는 `std::optional`, `std::expected`(C++23), error code 반환이 있습니다. 자세한 내용은 [Part 3-05](/blog/embedded/embedded-cpp/part3-05-no-exception-design)에서 다룹니다.

### 주의 — STL 함수가 던지는 예외

`std::vector::at()`은 예외를 던집니다. `-fno-exceptions`에서 호출하면 컴파일 에러나 abort로 이어집니다. `operator[]`를 쓰거나 직접 검사합니다.

```cpp
// Bad with -fno-exceptions
int x = vec.at(idx);   // throws if out of range

// Good
if (idx < vec.size()) {
    int x = vec[idx];
}
```

## `-fno-rtti` — RTTI 끄기

Run-Time Type Information을 끕니다. `typeid`와 `dynamic_cast`가 무력화됩니다.

```cpp
// RTTI 켜짐: type info 테이블 생성
class Base { virtual ~Base() = default; };
class Derived : public Base {};

Base* b = new Derived;
if (auto* d = dynamic_cast<Derived*>(b)) {
    // ...
}
```

`-fno-rtti` 효과:

- type info 테이블이 제거되어 1-5KB가 감소합니다
- `dynamic_cast`, `typeid`가 컴파일 에러가 됩니다
- `std::any`, `std::function`도 일부 제한됩니다

대안은 다음과 같습니다.

- enum 기반 type tag로 직접 분기합니다
- `std::variant` + `std::visit`로 closed type set을 다룹니다
- CRTP로 컴파일 타임 다형성을 구현합니다

자세한 대안은 [Part 3-08](/blog/embedded/embedded-cpp/part3-08-no-rtti-design)에서 다룹니다.

## `-fno-threadsafe-statics` — Magic static 끄기

C++11부터 함수 내 static 변수의 초기화는 thread-safe입니다. GCC는 이를 위해 추가 lock과 initialization guard를 삽입합니다.

```cpp
int& get_counter() {
    static int counter = 0;   // C++11: thread-safe 초기화
    return counter;
}
```

`-fno-threadsafe-statics` 효과:

- guard 코드가 제거되어 함수당 수십 바이트가 절약됩니다
- bare-metal이거나 initialization을 한 thread에서만 한다고 보장되면 안전합니다
- 다중 thread에서 동시에 init하면 race가 발생합니다

bare-metal과 single-core RTOS는 거의 항상 안전하게 끌 수 있습니다. 다중 core나 다중 task에서 동시 init하는 경우만 주의합니다.

## `-fno-use-cxa-atexit` — atexit 등록 끄기

C++ 표준은 static 객체의 소멸자를 `atexit`로 등록합니다. 임베디드에서 프로그램이 영원히 돌면 소멸자는 호출되지 않습니다. 등록 코드만 공간을 낭비할 뿐입니다.

```cpp
struct Logger {
    ~Logger() { /* never called in embedded */ }
};
Logger global_logger;
```

`-fno-use-cxa-atexit` 효과:

- `__cxa_atexit` 호출이 제거됩니다
- 수십에서 수백 바이트가 절약됩니다
- RTOS 환경에서도 거의 항상 안전합니다

## `-Os` vs `-O2` vs `-O3`

| 플래그 | 의도 | 임베디드 적합도 |
| --- | --- | --- |
| `-O0` | 최적화 없음, 디버깅 | 개발 초기 |
| `-O1` | 가벼운 최적화 | 디버깅 + 적정 속도 |
| `-O2` | 균형 | 일반 release |
| **`-Os`** | **크기 우선** | **임베디드 기본** |
| `-O3` | 속도 극대 | 코드 크기 폭증 가능 |
| `-Oz` (Clang) | 더 공격적 크기 | tight 환경 |
| `-Ofast` | 표준 위반 허용 | 임베디드에서 위험 |

`-Os`가 임베디드의 기본입니다. 같은 코드, 같은 컴파일러로 측정한 결과는 다음과 같습니다.

```text
# 한 임베디드 프로젝트 (STM32F4)
-O0  : 152 KB
-O1  : 84 KB
-O2  : 76 KB
-Os  : 68 KB    ← 임베디드 기본
-O3  : 92 KB    ← 인라인 폭증
```

핫 패스만 `-O2` 또는 `-O3` 함수 attribute로 분리하는 기법도 흔합니다.

```cpp
__attribute__((optimize("O3")))
void hot_loop() { /* */ }
```

## `-flto` — Link Time Optimization

링크 시점에 전체 프로그램을 보고 최적화합니다.

효과는 다음과 같습니다.

- inter-procedural 인라인이 가능합니다(다른 .o 파일의 함수도 인라인)
- 사용되지 않는 함수가 제거됩니다
- 코드 크기가 일반적으로 5-15% 감소합니다

비용은 다음과 같습니다.

- 컴파일 시간이 길어집니다
- 디버깅이 어려워집니다(인라인 폭증으로 변수 추적이 까다로워집니다)
- 일부 링커 스크립트와 충돌해 섹션 배치가 어려워질 수 있습니다

release 빌드에만 활성화하고 개발 빌드에서는 끕니다.

## `-ffunction-sections` + `-fdata-sections` + `-Wl,--gc-sections`

함수와 데이터를 각자 별도 섹션에 두고, 링커가 사용하지 않는 섹션을 제거합니다.

```text
# 없으면: main만 쓰는데도 라이브러리 전체 링크
.text: foo, bar, baz, qux, ...

# 있으면: 사용한 것만
.text.foo, .text.bar, ...
→ linker가 .text.bar만 남김
```

드라이버 코드의 30-60%를 잘라낼 수 있습니다. 거의 항상 켜는 편이 이득입니다.

## 경고 플래그 — 임베디드에서 더 엄격

C++ 임베디드에서는 모든 경고를 error로 다룹니다. 한 줄의 실수가 런타임 충돌로 이어지기 쉽습니다.

```makefile
CXXFLAGS += -Wall              # 기본 경고
CXXFLAGS += -Wextra            # 추가 경고
CXXFLAGS += -Wpedantic         # 표준 엄격
CXXFLAGS += -Wnon-virtual-dtor # base에 virtual dtor 없음
CXXFLAGS += -Wold-style-cast   # C style cast 금지
CXXFLAGS += -Woverloaded-virtual # virtual function 가리기
CXXFLAGS += -Wcast-align       # 정렬 위반 캐스트
CXXFLAGS += -Wconversion       # 암시적 type 변환
CXXFLAGS += -Wsign-conversion  # signed/unsigned 변환
CXXFLAGS += -Wnull-dereference # null deref 가능
CXXFLAGS += -Wdouble-promotion # float → double 암시
CXXFLAGS += -Wformat=2         # printf 포맷 엄격
CXXFLAGS += -Werror            # 경고 = 에러
```

특히 임베디드에서 중요한 항목은 다음과 같습니다.

- `-Wdouble-promotion`: float promotion이 FPU 없는 MCU에서 softfloat 호출을 부르기 때문에 성능이 폭락합니다
- `-Wcast-align`: ARM에서 unaligned access는 bus fault로 이어집니다
- `-Wnon-virtual-dtor`: 메모리 누수의 단골 원인입니다

## 디버그 정보 — `-g3 -gdwarf-4`

release 빌드에도 디버그 정보를 유지합니다. ELF 파일에는 들어가지만 Flash에는 들어가지 않습니다(링커가 `.debug_*` 섹션을 제외합니다).

```text
# 같은 빌드, 디버그 정보 유무
program.elf       : 142 KB (with debug)
program.bin       : 64 KB  (Flash 들어가는 부분)
```

장점은 다음과 같습니다.

- crash dump에서 stack trace가 가능합니다
- gdb로 attach해 분석할 수 있습니다
- static analyzer에 도움이 됩니다

## ARM 특화 플래그

ARM Cortex-M/A 계열은 명시가 필수입니다.

```makefile
# Cortex-M4F (STM32F4, NXP K64)
CXXFLAGS += -mcpu=cortex-m4
CXXFLAGS += -mthumb
CXXFLAGS += -mfloat-abi=hard
CXXFLAGS += -mfpu=fpv4-sp-d16

# Cortex-M7 (STM32F7/H7)
CXXFLAGS += -mcpu=cortex-m7
CXXFLAGS += -mthumb
CXXFLAGS += -mfloat-abi=hard
CXXFLAGS += -mfpu=fpv5-sp-d16  # 또는 fpv5-d16

# Cortex-M0/M0+ (STM32F0, low-power)
CXXFLAGS += -mcpu=cortex-m0plus
CXXFLAGS += -mthumb
# FPU 없음 — mfloat-abi=soft (기본)
```

`-mfloat-abi=hard` vs `soft` 차이는 다음과 같습니다.

- `hard`: FPU 레지스터로 인자를 전달하며 빠릅니다
- `soft`: 모두 정수 레지스터를 쓰며 호환성을 우선합니다
- `softfp`: 인자는 정수 레지스터로 전달하고 내부에서 FPU를 씁니다(혼합)

ABI를 라이브러리와 맞춰야 링크가 가능합니다.

## 디버그 vs Release 분리

권장 패턴:

```makefile
# Debug
CXXFLAGS_DEBUG := -O0 -g3 -DDEBUG=1
CXXFLAGS_DEBUG += -fstack-protector-strong

# Release
CXXFLAGS_RELEASE := -Os -g3 -flto -DNDEBUG=1
CXXFLAGS_RELEASE += -ffunction-sections -fdata-sections

# 공통
CXXFLAGS_COMMON := -std=c++17
CXXFLAGS_COMMON += -fno-exceptions -fno-rtti
CXXFLAGS_COMMON += -Wall -Wextra -Werror

ifeq ($(BUILD),debug)
  CXXFLAGS := $(CXXFLAGS_COMMON) $(CXXFLAGS_DEBUG)
else
  CXXFLAGS := $(CXXFLAGS_COMMON) $(CXXFLAGS_RELEASE)
endif
```

assertion은 debug에서만 활성화하는 게 일반적입니다.

## 자주 보는 함정과 안티패턴

### 1. `-fno-exceptions` 늦게 적용

수만 줄 작성 후 끄면 표준 라이브러리 호출이 대거 컴파일 실패합니다. 처음부터 켭니다.

### 2. `-O3`를 임베디드 기본으로 사용

인라인 폭증으로 코드 크기가 늘어납니다. `-Os`를 적용한 뒤 측정 결과를 보고 핫 패스만 `-O3`로 올립니다.

### 3. `-flto` 없이 `-ffunction-sections` 만 사용

`--gc-sections`로 함수 제거는 되지만 cross-file 인라인은 되지 않습니다. 보통 함께 씁니다.

### 4. 디버그 빌드에 `-flto`

LTO는 디버깅 의미를 흐립니다. release에만 적용합니다.

### 5. ARM 플래그 불일치

컴파일러와 라이브러리(newlib, libstdc++)의 ARM 플래그가 다르면 링크 실패가 납니다. 모두 통일합니다.

### 6. `-Werror`를 나중에 켜기

경고가 쌓인 후 켜면 수백 개의 에러가 한꺼번에 쏟아집니다. 처음부터 켭니다.

## Clang 추가 옵션

Clang(armclang 포함)은 GCC와 거의 호환되지만 다음과 같은 추가 옵션이 있습니다.

```makefile
# Clang 추가
CXXFLAGS += -Oz                     # GCC -Os보다 공격적
CXXFLAGS += -fno-c++-static-destructors  # 명시적 ~atexit 끔
CXXFLAGS += -fno-asynchronous-unwind-tables
```

`-fno-asynchronous-unwind-tables`는 예외 unwind 테이블까지 모두 제거합니다. 추가로 1-3KB가 절약됩니다.

## 측정 — 플래그 효과 누적

빈 main 함수에 플래그를 하나씩 추가하면서 크기를 측정합니다(STM32F4, GCC 13).

```text
default                                    : 24 KB
+ -Os                                      : 12 KB
+ -fno-exceptions                          : 8 KB
+ -fno-rtti                                : 7.5 KB
+ -fno-threadsafe-statics                  : 7.4 KB
+ -ffunction-sections + --gc-sections      : 6 KB
+ -flto                                    : 5.6 KB
+ -fno-use-cxa-atexit                      : 5.5 KB
```

80%가 감소합니다. 빈 함수 하나만으로도 기본 설정과 임베디드 설정의 차이가 거대합니다.

## 정리

- 임베디드 C++ 표준 플래그는 예외/RTTI/threadsafe-statics 끄기와 크기 최적화, LTO, gc-sections의 조합입니다.
- 각 플래그는 측정 가능한 효과를 갖고, 끄기만 해도 5-10배 크기 감소가 가능합니다.
- 경고는 처음부터 모두 켜고 Werror로 다룹니다. 나중에 끄는 편이 추가하는 것보다 쉽습니다.
- 디버그와 release를 분리해 release에는 LTO를, debug에는 `-O0 -g3`를 적용합니다.
- ARM 특화 플래그는 반드시 지정해 CPU, FPU, ABI를 일치시킵니다.

## 관련 항목

- [Part 1-01: C++ vs C](/blog/embedded/embedded-cpp/part1-01-cpp-vs-c) — 왜 이 플래그가 필요한가
- [Part 1-04: 코드 크기 분석](/blog/embedded/embedded-cpp/part1-04-code-size-analysis) — 플래그 효과를 측정하는 도구
- [Part 3-05: No-Exception 설계](/blog/embedded/embedded-cpp/part3-05-no-exception-design) — `-fno-exceptions` 환경의 패턴
- [Part 3-08: No-RTTI 설계](/blog/embedded/embedded-cpp/part3-08-no-rtti-design) — `-fno-rtti` 환경의 패턴

## 다음 글

[Part 1-03: 런타임 요구사항](/blog/embedded/embedded-cpp/part1-03-runtime-requirements) — C++ 코드가 실행되기 위해 어떤 런타임 지원이 필요한지 다룹니다. libstdc++, newlib, libgcc의 역할이 핵심입니다.
