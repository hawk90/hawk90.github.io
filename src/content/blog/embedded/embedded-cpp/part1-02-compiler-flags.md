---
title: "임베디드 C++ 컴파일러 플래그 분석 — -fno-rtti·-fno-exceptions·-Os"
slug: "embedded/embedded-cpp/part1-02-compiler-flags"
date: 2026-04-28T09:02:00
description: "C++를 임베디드 모드로 — -fno-exceptions, -fno-rtti, -Os, -flto. 각 플래그가 실제 바이너리에 무엇을 하는가."
series: "Embedded C++ for Real Systems"
seriesOrder: 2
tags: [cpp, embedded, compiler, gcc, clang, flags, optimization]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> 타깃 ABI와 런타임 정책을 정하고, 예외·RTTI·초기화·최적화 옵션이 만드는 코드와 미정의 심볼을 확인합니다. 기능을 끄는 것 자체가 항상 정답은 아닙니다.

## 어떤 문제를 푸는가

GCC와 Clang의 기본 C++ 설정은 데스크톱 가정입니다. 동적 할당이 풍부하고, 예외가 자유롭고, RTTI가 켜져 있습니다. bare-metal과 임베디드 Linux는 요구가 다르며, 선택한 런타임에서 지원하는 기능과 정책을 먼저 정합니다.

문제는 어떤 플래그를 어떤 순서로 켜야 하는지 명확하지 않다는 점입니다. 잘못된 조합은 링크 실패를 만들고, 옳은 조합은 수십 KB의 코드를 사라지게 합니다.

이 글은 임베디드 C++ 프로젝트의 표준 플래그 셋과 각 플래그가 실제로 무엇을 하는지 정리합니다.

## 타깃·정책별 플래그 예시

다음은 ARM bare-metal을 가정한 선택지입니다. 초기화 동기화·소멸자 등록 옵션을 공통 안전 기본값처럼 복사하지 않습니다. --gc-sections는 GNU 호환 ELF 링커용이며 -flto는 대응 도구 체인이 필요합니다.

```makefile
# 언어 표준
CXXFLAGS += -std=c++17

# 임베디드 핵심
CXXFLAGS += -fno-exceptions
CXXFLAGS += -fno-rtti
# 동시 초기화가 없다고 입증한 경우에만 선택
# CXXFLAGS += -fno-threadsafe-statics
# -fno-use-cxa-atexit는 등록 제거가 아니라 등록 방식 변경

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

| 표준 | 주요 기능 예 |
| --- | --- |
| C++11/14 | RAII·constexpr·generic lambda 등 언어 기능과 라이브러리 구현을 함께 확인합니다. |
| C++17 | optional·variant·structured bindings 등을 지원하는 도구 체인을 선택합니다. |
| C++20/23 | concepts·span·expected 등 필요한 기능별 구현 상태와 타깃 라이브러리를 확인합니다. |

같은 컴파일러 버전이라도 언어 모드와 표준 라이브러리의 제공 범위는 다릅니다. ARM Compiler도 정확한 제품 버전·타깃·설정을 확인하며 이름 하나로 완전 지원을 보장하지 않습니다.

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
- 이미 빌드된 라이브러리를 재작성하지 않습니다. 라이브러리의 no-exception 모드와 오류 경로를 따로 확인합니다.
- C++ 예외 관련 코드 생성이 달라지지만 모든 unwind 정보의 제거와 고정 크기 감소를 보장하지 않습니다.
- `noexcept` 명시 함수의 코드가 더 단순해집니다

throw를 포함한 동일 함수는 -fno-exceptions에서 컴파일되지 않으므로 그 상태의 작은 함수 크기를 성공 측정값으로 제시할 수 없습니다. 예외를 쓰지 않는 대안 구현과 비교한다면 소스 차이와 전체 링크 조건도 기록해야 합니다.

대안으로는 `std::optional`, `std::expected`(C++23), error code 반환이 있습니다. 자세한 내용은 [Part 3-05](/blog/embedded/embedded-cpp/part3-05-no-exception-design)에서 다룹니다.

### 주의 — STL 함수가 던지는 예외

`std::vector::at()`은 예외를 던집니다. 플래그만으로 모든 at 호출이 컴파일 오류가 되는 것은 아닙니다. 범위 밖 처리 동작은 사용한 표준 라이브러리 빌드 정책을 확인합니다. operator[]로 바꾸기만 하면 경계 밖 UB를 만들 수 있으므로 명시적 범위 검사가 먼저입니다.

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
struct Base { virtual ~Base() = default; };
class Derived : public Base {};

Base* b = new Derived;
if (auto* d = dynamic_cast<Derived*>(b)) {
    // ...
}
```

`-fno-rtti` 효과:

- RTTI 정보를 생성하는 범위가 달라지며 크기 효과는 실제 사용 코드에서 측정합니다.
- RTTI가 필요한 downcast·crosscast와 typeid 사용이 제한됩니다. 접근 가능한 기반으로의 upcast나 dynamic_cast<void*>까지 모두 금지되는 것은 아닙니다.
- `std::any`, `std::function`도 일부 제한됩니다

대안은 다음과 같습니다.

- enum 기반 type tag로 직접 분기합니다
- `std::variant` + `std::visit`로 closed type set을 다룹니다
- CRTP로 컴파일 타임 다형성을 구현합니다

자세한 대안은 [Part 3-08](/blog/embedded/embedded-cpp/part3-08-no-rtti-design)에서 다룹니다.

## `-fno-threadsafe-statics` — Magic static 끄기

C++11부터 함수 내 static 변수의 초기화는 thread-safe입니다. GCC는 이를 위해 추가 lock과 initialization guard를 삽입합니다.

```cpp
extern int initialize_counter();
int& get_counter() {
    static int counter = initialize_counter();  // 동적 초기화, 함수 선언 필요
    return counter;
}
```

`-fno-threadsafe-statics` 효과:

- 동적 초기화 guard 코드가 달라지며 실제 심볼·크기 변화를 확인합니다
- bare-metal이거나 initialization을 한 thread에서만 한다고 보장되면 안전합니다
- 다중 thread에서 동시에 init하면 race가 발생합니다

상수 초기화의 static int counter=0은 동적 초기화 guard 비용의 예가 아닙니다. 단일 코어도 task 선점·ISR 재진입이 있으므로 동시 초기화가 없다는 근거가 필요합니다.

## -fno-use-cxa-atexit — 등록 방식 변경

[GCC 공식 옵션](https://gcc.gnu.org/onlinedocs/gcc/C_002b_002b-Dialect-Options.html)은 -fuse-cxa-atexit를 atexit 대신 __cxa_atexit로 정적 소멸자를 등록하는 선택으로 설명합니다. 반대 옵션은 일반 atexit 경로로 바꿀 수 있으며 소멸자 등록 전체를 제거한다는 뜻이 아닙니다.

```cpp
struct Logger { ~Logger(); };
Logger global_logger;
```

프로그램이 종료하지 않는 firmware에서도 재시작·모듈 수명·테스트 종료 정책을 먼저 정합니다. 등록을 제거할 별도 정책을 선택한다면 그 옵션과 소스·startup 동작을 명시하고 생성 심볼을 확인해야 합니다.

## `-Os` vs `-O2` vs `-O3`

| 플래그 | 의도 | 임베디드 적합도 |
| --- | --- | --- |
| `-O0` | 최적화 없음, 디버깅 | 개발 초기 |
| `-O1` | 가벼운 최적화 | 디버깅 + 적정 속도 |
| `-O2` | 균형 | 일반 release |
| **`-Os`** | **크기 우선** | **임베디드 기본** |
| `-O3` | 속도 극대 | 코드 크기 폭증 가능 |
| `-Oz` (지원 컴파일러) | 더 공격적 크기 | tight 환경 |
| `-Ofast` | 표준 위반 허용 | 임베디드에서 위험 |

Os는 크기 우선 후보이며 O2/O3/Oz와 실제 Flash·RAM·지연 시간을 비교합니다. 동일 프로젝트의 재현 가능한 소스·컴파일러·링커 스크립트 없이 임의 KB 표를 측정 결과로 넣지 않습니다.

GCC는 다음 optimize attribute를 제공하지만 Clang에 같은 의미로 복사하지 않습니다. 함수별 최적화는 해당 컴파일러 지원과 측정 결과를 확인합니다.

```cpp
__attribute__((optimize("O3")))
void hot_loop() { /* */ }
```

## `-flto` — Link Time Optimization

링크 시점에 전체 프로그램을 보고 최적화합니다.

효과는 다음과 같습니다.

- inter-procedural 인라인이 가능합니다(다른 .o 파일의 함수도 인라인)
- 사용되지 않는 함수가 제거됩니다
- 전체 도구 체인과 입력에 따라 코드 크기가 늘거나 줄 수 있어 실제 산출물로 비교합니다

비용은 다음과 같습니다.

- 컴파일 시간이 길어집니다
- 디버깅이 어려워집니다(인라인 폭증으로 변수 추적이 까다로워집니다)
- 일부 링커 스크립트와 충돌해 섹션 배치가 어려워질 수 있습니다

release 빌드에만 활성화하고 개발 빌드에서는 끕니다.

## `-ffunction-sections` + `-fdata-sections` + `-Wl,--gc-sections`

함수와 데이터를 각자 별도 섹션에 두고, 링커가 사용하지 않는 섹션을 제거합니다.

```text
# 분리 전: 선택된 오브젝트 멤버의 여러 함수가 하나의 .text에 있음
.text: foo, bar, baz, qux, ...

# 있으면: 사용한 것만
.text.foo, .text.bar, ...
→ linker가 .text.bar만 남김
```

크기 효과는 입력에 따라 다릅니다. 정적 아카이브는 원래도 필요한 멤버 단위로 선택되며, section GC는 선택된 멤버 안의 더 작은 제거 단위를 제공합니다. ISR·등록 테이블 등은 KEEP 또는 참조 보존 규칙이 필요할 수 있습니다.

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
- -Wcast-align: 정렬 요구를 바꾸는 캐스트를 검토합니다. 비정렬 접근의 허용·fault는 CPU·명령·메모리 속성·설정에 따라 다릅니다.
- `-Wnon-virtual-dtor`: 메모리 누수의 단골 원인입니다

## 디버그 정보 — `-g3 -gdwarf-4`

release 빌드에도 디버그 정보를 유지합니다. ELF 파일에는 들어가지만 Flash에는 들어가지 않습니다(링커가 `.debug_*` 섹션을 제외합니다).

ELF 파일 크기와 Flash에 프로그래밍하는 loadable 영역은 다른 측정량입니다. 디버그 정보의 비할당 섹션, objcopy 출력 형식, 링커 스크립트를 확인하고 고정 KB 예시를 측정값으로 쓰지 않습니다.

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

예외 정책을 바꾸면 직접 throw/catch 코드와 라이브러리 오류 처리 경로를 함께 검토해야 합니다. 프로젝트 초기부터 선택한 정책을 컴파일·링크 테스트로 확인합니다.

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

이 옵션은 비동기 지점의 unwind table 생성을 제어합니다. C++ 예외 정보 전체를 제거하는 옵션과 같지 않으며 크기 효과도 실제 파일에서 확인합니다.

## 측정 — 플래그 효과 누적

빈 main만으로 예외·RTTI·동적 static 초기화 비용을 모두 측정할 수는 없습니다. 기능을 실제 사용한 소스, 성공·실패한 구성, map/section 크기, 런타임 링크와 Flash/RAM의 포함 범위를 함께 기록합니다. 아래 예제는 바이트 절감률 대신 옵션의 의미를 확인합니다.


## 직접 확인 — 금지되는 코드와 남는 런타임 심볼

다음 소스는 Homebrew Clang 23.1.3에서 x86-64 Linux ELF 오브젝트로 컴파일합니다. 실제 firmware 링크·크기·MCU 실행을 검증한 기록은 아닙니다.

```cpp title="flags.cpp"
struct Base { virtual ~Base() = default; };
struct Derived : Base {};
Base* up(Derived* value) { return dynamic_cast<Base*>(value); }
#ifdef DOWNCAST
Derived* down(Base* value) { return dynamic_cast<Derived*>(value); }
#endif
#ifdef THROW
int fail() { throw 7; }
#endif
extern int initialize();
int& instance() { static int value = initialize(); return value; }
```

```cpp title="registration.cpp"
struct Logger { ~Logger(); };
Logger logger;
```

```bash
clang++ --target=x86_64-unknown-linux-gnu -std=c++17 -fno-rtti -c flags.cpp -o up.o
clang++ --target=x86_64-unknown-linux-gnu -std=c++17 -fno-rtti -DDOWNCAST -c flags.cpp -o down.o
clang++ --target=x86_64-unknown-linux-gnu -std=c++17 -fno-exceptions -DTHROW -c flags.cpp -o throw.o
clang++ --target=x86_64-unknown-linux-gnu -std=c++17 -c registration.cpp -o cxa.o
clang++ --target=x86_64-unknown-linux-gnu -std=c++17 -fno-use-cxa-atexit -c registration.cpp -o plain.o
llvm-nm -u cxa.o plain.o
```

upcast는 성공하지만 DOWNCAST·THROW 구성은 원인에 맞는 컴파일 실패를 기대합니다. registration의 미정의 심볼은 기본 __cxa_atexit와 반대 옵션의 atexit를 구분합니다. flags.cpp의 동적 static은 guard 관련 심볼을 만들며 no-threadsafe-statics 구성과 비교합니다.

## 정리

- 타깃 ABI·런타임·동시 초기화 정책에 맞춰 옵션을 고르고 blanket disable을 공통 기본값으로 두지 않습니다.
- 크기 효과는 같은 소스·도구 체인·링크 조건에서 측정하며 기능 금지와 등록 방식 변경을 구분합니다.
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
