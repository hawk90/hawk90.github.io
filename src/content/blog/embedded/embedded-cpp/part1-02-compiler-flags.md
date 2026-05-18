---
title: "Part 1-02: 컴파일러 플래그 가이드"
date: 2026-05-13T02:00:00
description: "C++를 임베디드 모드로 — -fno-exceptions, -fno-rtti, -Os, -flto. 각 플래그가 실제 바이너리에 무엇을 하는가."
series: "Embedded C++ for Real Systems"
seriesOrder: 2
tags: [cpp, embedded, compiler, gcc, clang, flags, optimization]
type: tech
---

## 한 줄 요약

> **"기본 C++ 설정은 데스크톱용입니다."** — 임베디드는 *예외 끄기, RTTI 끄기, 크기 최적화*가 출발점입니다.

## 어떤 문제를 푸는가

GCC와 Clang의 기본 C++ 설정은 *데스크톱 가정*입니다. 동적 할당이 풍부하고, 예외가 자유롭고, RTTI가 켜져 있습니다. 임베디드에서는 *이 기본을 거의 모두* 끄거나 바꿉니다.

문제는 *어떤 플래그를 어떤 순서로 켜야 하는지* 명확하지 않다는 점입니다. 잘못된 조합은 *링크 실패*를 만들고, 옳은 조합은 *수십 KB의 코드를 사라지게* 합니다.

이 글은 *임베디드 C++ 프로젝트의 표준 플래그 셋*과 *각 플래그가 실제로 무엇을 하는지*를 정리합니다.

## 임베디드 표준 플래그 셋

대부분 임베디드 C++ 프로젝트가 시작점으로 쓸 만한 조합입니다.

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

각 플래그가 무엇을 하는지 *하나씩* 봅니다.

## 언어 표준 — `-std=c++17`

C++ 표준을 명시합니다. 표준에 따라 사용 가능한 기능과 표준 라이브러리가 달라집니다.

| 표준 | 권장 환경 | 핵심 |
| --- | --- | --- |
| C++11 | 모든 임베디드 | RAII, constexpr 기초, unique_ptr |
| C++14 | GCC 4.9+ | constexpr 확장, generic lambda |
| **C++17** | **권장 기본** | `std::optional`, `std::variant`, structured bindings |
| C++20 | GCC 10+, 신규 프로젝트 | concepts, `std::span`, consteval |
| C++23 | GCC 13+, 실험적 | `std::expected`, `<print>` |

ARM Compiler 6(armclang)은 C++17 완전 지원. *legacy ARM Compiler 5는 C++03만 — 새 프로젝트에서 피합니다*.

자세한 표준 선택 기준은 [Part 1-08](/blog/embedded/embedded-cpp/part1-08-cpp-standard-choice).

## `-fno-exceptions` — 예외 처리 끄기

C++ 예외는 *런타임 unwind table*과 *handler*를 데려옵니다.

```cpp
// 예외 켜짐: 이 함수가 unwind table을 추가
int divide(int a, int b) {
    if (b == 0) throw std::runtime_error("div by zero");
    return a / b;
}
```

`-fno-exceptions` 효과:

- *throw 문이 컴파일 에러*가 됨
- 표준 라이브러리의 *예외 던지는 함수*가 `abort()` 또는 *undefined behavior*로 동작
- *unwind table 제거* → 보통 5-20KB 감소
- `noexcept` 명시 함수의 *코드가 더 단순*

```text
# 같은 함수, 예외 켜짐 vs 꺼짐 (ARM Cortex-M4, -Os)

# -fexceptions: 312 B (함수 본문 + unwind 정보)
# -fno-exceptions: 32 B
```

대안 — `std::optional`, `std::expected` (C++23), error code 반환. [Part 3-05](/blog/embedded/embedded-cpp/part3-05-no-exception-design)에서 자세히.

### 주의 — STL 함수가 던지는 예외

`std::vector::at()`은 *예외를 던집니다*. `-fno-exceptions`에서 호출하면 *컴파일 에러 또는 abort*. *operator[]를 쓰거나 직접 검사*.

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

- *type info 테이블 제거* → 1-5KB 감소
- `dynamic_cast`, `typeid` *컴파일 에러*
- `std::any`, `std::function`도 *제한*

대안:
- *enum 기반 type tag* — 직접 분기
- `std::variant` + `std::visit` — closed type set
- CRTP — 컴파일 타임 다형성

자세한 대안은 [Part 3-08](/blog/embedded/embedded-cpp/part3-08-no-rtti-design).

## `-fno-threadsafe-statics` — Magic static 끄기

C++11부터 *함수 내 static 변수의 초기화는 thread-safe*입니다. GCC는 이를 위해 *추가 lock*과 *initialization guard*를 삽입합니다.

```cpp
int& get_counter() {
    static int counter = 0;   // C++11: thread-safe 초기화
    return counter;
}
```

`-fno-threadsafe-statics`:

- guard 코드 *제거* → 함수당 수십 바이트 절약
- *bare-metal* 또는 *initialization을 한 thread에서만 한다고 보장*하면 안전
- 다중 thread에서 *동시에 init*하면 race

bare-metal과 single-core RTOS는 거의 항상 *안전하게 끌 수 있음*. 다중 core나 다중 task에서 *동시 init*하는 경우만 주의.

## `-fno-use-cxa-atexit` — atexit 등록 끄기

C++ 표준은 *static 객체의 소멸자*를 `atexit`로 등록합니다. 임베디드에서 *프로그램이 영원히 돌면* 소멸자는 *호출 안 됩니다*. 등록 코드만 *공간 낭비*.

```cpp
struct Logger {
    ~Logger() { /* never called in embedded */ }
};
Logger global_logger;
```

`-fno-use-cxa-atexit`:

- `__cxa_atexit` 호출 *제거*
- *수십~수백 바이트* 절약
- *RTOS 환경*에서도 거의 항상 안전

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

`-Os`가 임베디드 *기본*. 같은 코드, 같은 컴파일러로 측정:

```text
# 한 임베디드 프로젝트 (STM32F4)
-O0  : 152 KB
-O1  : 84 KB
-O2  : 76 KB
-Os  : 68 KB    ← 임베디드 기본
-O3  : 92 KB    ← 인라인 폭증
```

*핫 패스만 `-O2` 또는 `-O3` 함수 attribute*로 분리하는 *기법*도 흔합니다.

```cpp
__attribute__((optimize("O3")))
void hot_loop() { /* */ }
```

## `-flto` — Link Time Optimization

링크 시점에 *전체 프로그램*을 보고 최적화합니다.

효과:
- *inter-procedural 인라인* (다른 .o 파일의 함수도 인라인)
- *사용 안 되는 함수 제거*
- *코드 크기 5-15% 감소* (일반)

비용:
- *컴파일 시간 증가*
- *디버깅 어려움* (인라인 폭증으로 변수 추적 어려움)
- 일부 *링커 스크립트와 충돌* — 섹션 배치가 어려워질 수 있음

권장: *release 빌드에만 활성*. 개발 빌드는 끄고.

## `-ffunction-sections` + `-fdata-sections` + `-Wl,--gc-sections`

함수와 데이터를 *각자 별도 섹션*에 두고, 링커가 *안 쓰는 섹션을 제거*합니다.

```text
# 없으면: main만 쓰는데도 라이브러리 전체 링크
.text: foo, bar, baz, qux, ...

# 있으면: 사용한 것만
.text.foo, .text.bar, ...
→ linker가 .text.bar만 남김
```

*드라이버 코드의 30-60%를 잘라낼 수 있음*. 거의 항상 켜는 게 이득.

## 경고 플래그 — 임베디드에서 더 엄격

C++ 임베디드는 *모든 경고를 error*로. 한 줄의 실수가 *런타임 충돌*로 이어지기 쉽습니다.

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

*특히 임베디드 중요*:

- `-Wdouble-promotion` — float promotion이 *FPU 없는 MCU*에서 *softfloat 호출*을 부르므로 성능 폭락.
- `-Wcast-align` — ARM에서 unaligned access는 *bus fault*.
- `-Wnon-virtual-dtor` — 메모리 누수의 단골 원인.

## 디버그 정보 — `-g3 -gdwarf-4`

*release 빌드에도 디버그 정보 유지*. ELF 파일에는 들어가지만 *Flash에는 안 들어감* (링커가 `.debug_*` 섹션 제외).

```text
# 같은 빌드, 디버그 정보 유무
program.elf       : 142 KB (with debug)
program.bin       : 64 KB  (Flash 들어가는 부분)
```

장점:
- *crash dump*에서 stack trace 가능
- *gdb로 attach 후 분석*
- *static analyzer*에 도움

## ARM 특화 플래그

ARM Cortex-M/A 계열은 *명시 필수*.

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

`-mfloat-abi=hard` vs `soft`:
- `hard` — FPU 레지스터로 인자 전달, 빠름
- `soft` — 모두 정수 레지스터, 호환성 우선
- `softfp` — 인자는 정수 레지스터, 내부는 FPU (혼합)

*ABI를 라이브러리와 맞춰야 링크 가능*.

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

*assertion*은 debug에서만 활성화하는 게 일반적.

## 자주 보는 함정과 안티패턴

### 1. `-fno-exceptions` 늦게 적용
*수만 줄 작성 후 끄기* → 표준 라이브러리 호출이 *대거 컴파일 실패*. 처음부터 켭니다.

### 2. `-O3`를 *임베디드 기본*으로
인라인 폭증 → *코드 크기 ↑*. `-Os` 후 *측정* 기반으로 핫 패스만 `-O3`.

### 3. `-flto` 없이 `-ffunction-sections` 만
`--gc-sections`로 *함수 제거*는 되지만 *cross-file 인라인*은 안 됨. 보통 함께.

### 4. 디버그 빌드에 `-flto`
LTO는 *디버깅 의미*를 흐림. *release만*.

### 5. ARM 플래그 불일치
컴파일러와 *라이브러리 (newlib, libstdc++)*의 ARM 플래그가 다르면 *링크 실패*. 모두 통일.

### 6. `-Werror`를 *나중에* 켜기
경고가 쌓인 후 켜면 *수백 개의 에러*. 처음부터 켭니다.

## Clang 추가 옵션

Clang(armclang 포함)은 GCC와 거의 호환되지만 추가 옵션:

```makefile
# Clang 추가
CXXFLAGS += -Oz                     # GCC -Os보다 공격적
CXXFLAGS += -fno-c++-static-destructors  # 명시적 ~atexit 끔
CXXFLAGS += -fno-asynchronous-unwind-tables
```

`-fno-asynchronous-unwind-tables`는 *예외 unwind 테이블*까지 모두 제거. *추가 1-3KB 절약*.

## 측정 — 플래그 효과 누적

빈 main 함수에 *플래그를 하나씩 추가*해 크기 측정 (STM32F4, GCC 13).

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

*무려 80% 감소*. 빈 함수 하나만으로도 *기본 설정과 임베디드 설정의 차이*가 거대합니다.

## 정리

- 임베디드 C++ 표준 플래그 = *예외/RTTI/threadsafe-statics 끄기 + 크기 최적화 + LTO + gc-sections*.
- 각 플래그가 *측정 가능한 효과* 있음. 끄기만 해도 *5-10배 크기 감소*.
- 경고는 *처음부터 모두 켜고 Werror*. 나중에 끄는 게 추가하는 것보다 쉬움.
- 디버그/release *분리*. release에 LTO, debug에 `-O0 -g3`.
- ARM 특화 플래그 *반드시* — CPU, FPU, ABI 일치.

## 관련 항목

- [Part 1-01: C++ vs C](/blog/embedded/embedded-cpp/part1-01-cpp-vs-c) — 왜 이 플래그가 필요한가
- [Part 1-04: 코드 크기 분석](/blog/embedded/embedded-cpp/part1-04-code-size-analysis) — 플래그 효과를 측정하는 도구
- [Part 3-05: No-Exception 설계](/blog/embedded/embedded-cpp/part3-05-no-exception-design) — `-fno-exceptions` 환경의 패턴
- [Part 3-08: No-RTTI 설계](/blog/embedded/embedded-cpp/part3-08-no-rtti-design) — `-fno-rtti` 환경의 패턴

## 다음 글

[Part 1-03: 런타임 요구사항](/blog/embedded/embedded-cpp/part1-03-runtime-requirements) — C++ 코드가 실행되기 위해 *어떤 런타임 지원*이 필요한가. libstdc++, newlib, libgcc의 역할.
