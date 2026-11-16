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

문제는 어떤 플래그를 어떤 순서로 켜야 하는지 명확하지 않다는 점입니다. 잘못된 조합은 링크 실패를 만들고([Part 0](/blog/embedded/embedded-cpp/00-preface)의 hard/soft float 혼합 예), 옳은 조합은 쓰지 않는 코드와 테이블을 링크 결과에서 지웁니다. 이 글의 측정은 모두 같은 Mac에서 Homebrew arm-none-eabi-g++ 16.2.0(`-mcpu=cortex-m4 -mthumb`)으로 했고, 이 툴체인에는 newlib·libstdc++가 없어 C++ 표준 라이브러리가 필요한 측정만 호스트 g++-16과 Clang 23.1.5로 했습니다.

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

같은 컴파일러 버전이라도 언어 모드와 표준 라이브러리의 제공 범위는 다릅니다. 기능별 지원 버전은 [cppreference의 컴파일러 지원 표](https://en.cppreference.com/w/cpp/compiler_support)에 언어 기능과 라이브러리 기능이 따로 정리되어 있습니다.

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

- throw 문이 컴파일 에러가 됩니다(아래 [직접 확인](#직접-확인--금지되는-코드와-남는-런타임-심볼) 절의 실제 메시지)
- 소멸자가 있는 지역 객체를 둔 함수에서 예외용 landing pad와 `.ARM.extab`이 사라집니다. [Part 1-01](/blog/embedded/embedded-cpp/part1-01-cpp-vs-c#1-예외-처리)의 `guarded()`는 `.text` 26 → 16바이트, unwind 테이블 28바이트 → 0이었습니다
- 이미 빌드된 라이브러리는 그대로입니다. 바로 아래 `at()` 예가 그 결과입니다

throw를 포함한 함수는 이 플래그에서 컴파일되지 않으므로, 크기 비교는 예외를 쓰지 않도록 고친 대안 구현과 해야 합니다.

대안으로는 `std::optional`, `std::expected`(C++23), error code 반환이 있습니다. 자세한 내용은 [Part 3-05](/blog/embedded/embedded-cpp/part3-05-no-exception-design)에서 다룹니다.

### 주의 — STL 함수가 던지는 예외

`std::vector::at()`은 예외를 던집니다. `-fno-exceptions`로 컴파일해도 `at()` 호출은 컴파일 오류가 되지 않습니다. GCC 16.2의 libstdc++ 헤더는 hosted 구성에서 범위 검사 실패를 라이브러리 안의 `std::__throw_out_of_range_fmt`로 넘기고, 그 함수는 예외를 켜고 빌드된 라이브러리에 있습니다. 호스트 g++-16에서 `-fno-exceptions`로 `v.at(5)`(크기 3)를 부르면 이렇게 끝납니다.

```text
terminate called after throwing an instance of 'std::out_of_range'
  what():  vector::_M_range_check: __n (which is 5) >= this->size() (which is 3)
exit=134
```

catch할 수 없는 예외가 던져져 `std::terminate`로 끝난 것입니다. 같은 헤더의 freestanding 분기(`! _GLIBCXX_HOSTED`)는 이 함수를 `std::__terminate()` 호출로 정의합니다. `operator[]`로 바꾸기만 하면 경계 밖 접근이 미정의 동작이 되므로 명시적 범위 검사가 먼저입니다.

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

- 다형 클래스마다 만들던 type_info 객체(`_ZTI*`)와 이름 문자열(`_ZTS*`)이 사라집니다. 클래스 세 개짜리 계층에서 `.rodata`가 96 → 40바이트였습니다([Part 1-01](/blog/embedded/embedded-cpp/part1-01-cpp-vs-c#2-rtti))
- downcast·crosscast `dynamic_cast`와 `typeid`가 컴파일 오류가 됩니다. 접근 가능한 기반으로의 upcast `dynamic_cast`는 정적으로 풀리므로 그대로 컴파일됩니다(아래 직접 확인 절의 `up()`)
- `std::function::target_type()`처럼 `typeid`에 기대는 멤버를 쓸 수 없습니다

대안은 다음과 같습니다.

- enum 기반 type tag로 직접 분기합니다
- `std::variant` + `std::visit`로 closed type set을 다룹니다
- CRTP로 컴파일 타임 다형성을 구현합니다

자세한 대안은 [Part 3-08](/blog/embedded/embedded-cpp/part3-08-no-rtti-design)에서 다룹니다.

## `-fno-threadsafe-statics` — Magic static 끄기

C++11부터 함수 내 static 변수의 동적 초기화는 thread-safe입니다([stmt.dcl]/3: 초기화 도중 다른 스레드가 같은 선언에 들어오면 초기화가 끝날 때까지 기다린다). GCC는 이를 위해 guard 변수와 `__cxa_guard_acquire`/`__cxa_guard_release` 호출을 넣습니다.

```cpp
extern int initialize_counter();
int& get_counter() {
    static int counter = initialize_counter();  // 동적 초기화, 함수 선언 필요
    return counter;
}
```

위 함수를 두 설정으로 컴파일한 결과입니다(`-Os`, 끝의 `.word` 상수 줄과 주소 열은 생략).

```text
# 기본 (thread-safe statics)            # -fno-threadsafe-statics
push  {r4, lr}                          push  {r4, lr}
ldr   r4, [pc, #36]                     ldr   r4, [pc, #20]
ldr   r3, [r4, #0]                      ldr   r3, [r4, #0]
dmb   ish                               lsls  r3, r3, #31
lsls  r3, r3, #31                       bmi.n 14
bmi.n 22                                bl    _Z18initialize_counterv
mov   r0, r4                            movs  r3, #1
bl    __cxa_guard_acquire               str   r0, [r4, #4]
cbz   r0, 22                            str   r3, [r4, #0]
bl    _Z18initialize_counterv           ldr   r0, [pc, #4]
str   r0, [r4, #4]                      pop   {r4, pc}
mov   r0, r4
bl    __cxa_guard_release
ldr   r0, [pc, #8]
pop   {r4, pc}
.text 48 B                              .text 32 B
```

기본 설정은 guard의 첫 바이트를 읽은 뒤 `dmb ish` 배리어를 두고, 초기화되지 않았으면 `__cxa_guard_acquire`로 들어갑니다. 이 함수는 libsupc++가 제공하며 스레드 모델에 맞는 잠금을 씁니다. 플래그를 켜면 배리어와 두 호출이 사라지고 guard에 1을 직접 씁니다. 그래서 동시에 두 실행 흐름이 처음 들어오면 `initialize_counter()`가 두 번 돌 수 있습니다.

상수 초기화의 static int counter=0은 동적 초기화 guard 비용의 예가 아닙니다. 단일 코어도 task 선점·ISR 재진입이 있으므로 동시 초기화가 없다는 근거가 필요합니다.

## -fno-use-cxa-atexit — 등록 방식 변경

[GCC 공식 옵션](https://gcc.gnu.org/onlinedocs/gcc/C_002b_002b-Dialect-Options.html)은 `-fuse-cxa-atexit`를 `atexit` 대신 `__cxa_atexit`로 정적 소멸자를 등록하는 선택으로 설명합니다. 반대 옵션은 등록 경로를 바꿀 뿐 소멸자 등록을 없애지 않습니다. 아래 두 줄을 arm-none-eabi-g++ 16.2.0으로 컴파일하면 경로가 이렇게 갈립니다.

| 설정 | 미정의 심볼 | 소멸자 호출 경로 |
| --- | --- | --- |
| 기본 | `__aeabi_atexit`, `__dso_handle`, `_ZN6LoggerD1Ev` | 정적 초기화 때 ARM EABI의 `__aeabi_atexit`로 등록 |
| `-fno-use-cxa-atexit` | `_ZN6LoggerD1Ev` | `.fini_array`에 `_GLOBAL__sub_D_global_logger` 4바이트 항목 |

ARM 타깃은 `__cxa_atexit` 대신 EABI 이름 `__aeabi_atexit`를 부릅니다. 반대 옵션을 주면 이 타깃은 `atexit`도 부르지 않고 소멸자를 `.fini_array`에 넣습니다. 같은 소스를 x86-64 Linux로 컴파일한 아래 직접 확인 절에서는 `atexit`가 미정의 심볼로 남습니다. 등록 자체를 없애는 옵션은 Clang의 `-fno-c++-static-destructors`입니다(아래 Clang 절).

```cpp
struct Logger { ~Logger(); };
Logger global_logger;
```

종료하지 않는 firmware라면 `.fini_array`나 `__aeabi_atexit` 등록은 실행되지 않는 코드입니다. 다만 호스트 단위 테스트처럼 같은 코드가 종료하는 환경에서도 돌면, 소멸자에 의존하는 정리(파일 flush 등)가 그쪽에서만 일어납니다.

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

작은 모듈 하나(비트 단위 CRC32, 64바이트 링 버퍼, `switch` 명령 파서, 16비트 fill 루프)를 레벨별로 컴파일한 `.text` 크기입니다(arm-none-eabi-g++ 16.2.0, `-mcpu=cortex-m4 -mthumb -fno-exceptions -fno-rtti -ffreestanding`).

| 레벨 | `.text*` 합계 (바이트) |
| --- | ---: |
| `-O0` | 506 |
| `-O1` | 236 |
| `-O2` | 228 |
| `-O3` | 332 |
| `-Os` | 204 |
| `-Oz` | 204 |

`-O0`에서는 `Ring`의 인라인 멤버 함수 두 개가 별도 COMDAT 섹션(`.text._ZN4Ring4pushEh` 66, `.text._ZN4Ring3popERh` 64)에 놓여 `.text` 376바이트와 합쳤고, 나머지 레벨은 `.text` 하나입니다. `-O3`의 증가분은 대부분 CRC32에서 나왔습니다. 안쪽 8회 루프를 펼쳐 함수가 48바이트(`-Os`)에서 116바이트(`-O3`)가 됐습니다. `-Oz`는 GCC 12에서 들어온 레벨이며, 이 모듈에서는 `-Os`와 결과가 같았습니다. 모듈 하나의 숫자이므로 프로젝트 전체의 비율로 옮기지 않습니다.

GCC는 함수별로 최적화 레벨을 바꾸는 `optimize` attribute를 제공합니다. [GCC 문서](https://gcc.gnu.org/onlinedocs/gcc/Common-Attributes.html)는 "디버깅 목적으로만 쓰고 프로덕션 코드에는 맞지 않는다"고 적습니다. Clang 23.1.5는 이 attribute를 `warning: unknown attribute 'optimize' ignored`로 무시합니다.

```cpp
__attribute__((optimize("O3")))
void hot_loop() { /* */ }
```

## `-flto` — Link Time Optimization

링크 시점에 전체 프로그램을 보고 최적화합니다.

효과는 다음과 같습니다.

- inter-procedural 인라인이 가능합니다(다른 .o 파일의 함수도 인라인)
- 사용되지 않는 함수가 제거됩니다

위 모듈에 `crc32()`와 `parse_cmd()`만 부르는 `main.cpp`를 붙여 링크한 결과가 아래 [gc-sections 절](#-ffunction-sections---fdata-sections---wl--gc-sections)의 표에 있습니다. LTO를 켜면 두 함수가 `main`에 인라인되어 심볼 표에서 사라졌습니다.

비용은 다음과 같습니다.

- 링크 단계에서 코드 생성을 다시 하므로 링크가 느려집니다
- 인라인된 함수에는 중단점·스택 프레임이 따로 남지 않습니다(위 예에서 `crc32` 심볼이 없어졌습니다)
- 링커 스크립트가 파일 이름으로 섹션을 배치하면(`*foo.o(.text*)`) LTO 뒤에는 그 파일 이름의 오브젝트가 없어 규칙이 맞지 않습니다

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

위 모듈과 `main.cpp`를 [Part 1-07](/blog/embedded/embedded-cpp/part1-07-linker-scripts)과 같은 형태의 링커 스크립트·startup으로 Cortex-M4 ELF로 링크한 결과입니다(`-Os`, `-nostdlib -lgcc`).

| 빌드 | text | data | bss | 남은 모듈 심볼 |
| --- | ---: | ---: | ---: | --- |
| 기본 | 433 | 8 | 72 | 모든 함수와 `rx` |
| `-ffunction-sections -fdata-sections -Wl,--gc-sections` | 329 | 8 | 0 | `crc32`, `parse_cmd`, `main` |
| 위 + `-flto` | 248 | 8 | 0 | `main` |

세 ELF 모두 QEMU `mps2-an386`(Cortex-M4)에서 실행해 같은 종료 코드 22를 냈습니다. 쓰지 않는 링 버퍼 `rx`(bss 72바이트)와 `fill`·`feed`·`sum_rx`가 섹션 단위로 지워졌습니다. 정적 아카이브는 원래도 필요한 멤버 단위로 선택되므로, section GC는 선택된 멤버 안에서 더 잘게 지우는 단위를 줍니다. 벡터 테이블처럼 코드에서 참조하지 않는 섹션은 링커 스크립트에서 `KEEP`으로 지켜야 GC에 지워지지 않습니다.

## 경고 플래그 — 임베디드에서 더 엄격

경고를 error로 다루면 경고가 쌓이지 않습니다. 아래 `-Wdouble-promotion` 예처럼 경고 하나가 곧 성능 문제인 경우가 있습니다.

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

- `-Wdouble-promotion`: Cortex-M4F의 FPU(FPv4-SP)는 단정밀도만 계산합니다. 그래서 FPU가 있어도 `double` 연산은 소프트웨어 호출이 됩니다. `float` 인자에 `0.1`(double 리터럴)을 곱하면 이렇게 됩니다.

```text
dp3.cpp:1:35: warning: implicit conversion from 'float' to 'double' to match other operand of binary expression [-Wdouble-promotion]
    1 | float scale_d(float x) { return x * 0.1; }

00000000 <_Z7scale_df>:              # x * 0.1
   0:	push	{r3, lr}
   2:	vmov	r0, s0
   6:	bl	0 <__aeabi_f2d>
   ...
  10:	bl	0 <__aeabi_dmul>
  14:	bl	0 <__aeabi_d2f>
  ...
00000028 <_Z7scale_ff>:              # x * 0.1f
  28:	vldr	s15, [pc, #8]
  2c:	vmul.f32	s0, s0, s15
  30:	bx	lr
```

  `0.1f`로 고치면 FPU 명령 하나가 됩니다.
- `-Wcast-align`: 정렬 요구를 늘리는 포인터 캐스트를 알립니다. GCC 문서는 기본 형태가 정렬 제약이 있는 타깃에서만 경고하고, `-Wcast-align=strict`는 타깃과 무관하게 경고한다고 적습니다. `const unsigned char*`를 `const unsigned*`로 바꾸는 캐스트에 arm-none-eabi-g++ 16.2.0(`-mcpu=cortex-m4`)은 기본 형태로도 경고했고, 호스트 aarch64 g++-16은 경고하지 않았습니다. 같은 코드를 호스트 단위 테스트로도 빌드한다면 `-Wcast-align=strict`라야 양쪽에서 같은 경고가 납니다.
- `-Wnon-virtual-dtor`: 가상 함수가 있는데 소멸자가 가상이 아닌 클래스를 알립니다. 그런 기반 포인터로 파생 객체를 `delete`하면 미정의 동작입니다([expr.delete]/3).

## 디버그 정보 — `-g3 -gdwarf-4`

release 빌드에도 디버그 정보를 유지합니다. `.debug_*` 섹션은 할당(ALLOC) 플래그가 없어 ELF 파일에는 들어가지만 Flash 이미지에는 들어가지 않습니다. 위 LTO 빌드에 `-g3`만 더하면 이렇게 됩니다.

| 빌드 | `size`의 text/data/bss | ELF 파일 크기 |
| --- | --- | ---: |
| `-flto ... --gc-sections` | 248 / 8 / 0 | 5,492 B |
| 위 + `-g3` | 248 / 8 / 0 | 31,848 B |

`arm-none-eabi-objcopy -O binary`로 만든 Flash 이미지는 loadable 섹션만 담으므로 두 빌드가 같습니다.

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

release의 `-DNDEBUG=1`은 `<cassert>`의 `assert`를 아무 일도 하지 않는 식으로 바꿉니다(C 표준 7.2). release에서도 남겨야 하는 검사는 `assert`가 아닌 별도 매크로로 씁니다.

## 자주 보는 함정과 안티패턴

### 1. `-fno-exceptions` 늦게 적용

예외 정책을 바꾸면 직접 throw/catch 코드와 라이브러리 오류 처리 경로를 함께 검토해야 합니다. 프로젝트 초기부터 선택한 정책을 컴파일·링크 테스트로 확인합니다.

### 2. `-O3`를 임베디드 기본으로 사용

인라인 폭증으로 코드 크기가 늘어납니다. `-Os`를 적용한 뒤 측정 결과를 보고 핫 패스만 `-O3`로 올립니다.

### 3. `-flto` 없이 `-ffunction-sections` 만 사용

`--gc-sections`로 함수 제거는 되지만 cross-file 인라인은 되지 않습니다. 위 표에서 gc-sections만 쓴 빌드는 329바이트, LTO를 더한 빌드는 248바이트였습니다.

### 4. 디버그 빌드에 `-flto`

LTO는 디버깅 의미를 흐립니다. release에만 적용합니다.

### 5. ARM 플래그 불일치

컴파일러와 라이브러리(newlib, libstdc++)의 ARM 플래그가 다르면 링크 실패가 납니다. 모두 통일합니다.

### 6. `-Werror`를 나중에 켜기

경고가 쌓인 뒤 켜면 그동안 쌓인 경고가 한꺼번에 빌드를 막습니다. 처음부터 켭니다.

## Clang 추가 옵션

Clang(armclang 포함)은 GCC 옵션 대부분을 같은 이름으로 받고, 다음 옵션을 더 가집니다.

```makefile
# Clang
CXXFLAGS += -Oz                          # GCC도 12부터 지원
CXXFLAGS += -fno-c++-static-destructors  # 정적 소멸자 등록 자체를 생략
CXXFLAGS += -fno-asynchronous-unwind-tables
```

`-fno-c++-static-destructors`는 Clang 전용입니다. 아래 직접 확인 절의 `registration.cpp`에 주면 미정의 심볼이 하나도 남지 않습니다. 소멸자 호출과 등록이 모두 생략되기 때문입니다. `-fno-asynchronous-unwind-tables`는 임의의 명령 지점에서 스택을 풀 수 있게 하는 테이블 생성을 끕니다. C++ 예외 테이블을 지우는 옵션은 `-fno-exceptions`입니다.

## 측정 — 플래그 효과 누적

빈 `main`에는 예외·RTTI·동적 static 초기화가 없으므로 플래그를 바꿔도 차이가 나지 않습니다. 위 절들은 그래서 각 기능을 실제로 쓰는 작은 소스를 따로 컴파일했습니다. 아래 예제는 같은 방식으로 옵션별 컴파일 성공·실패와 남는 런타임 심볼을 확인합니다.


## 직접 확인 — 금지되는 코드와 남는 런타임 심볼

다음 소스는 Homebrew Clang 23.1.5에서 x86-64 Linux ELF 오브젝트로 컴파일합니다. 링크와 실행은 하지 않습니다.

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
clang++ --target=x86_64-unknown-linux-gnu -std=c++17 -fno-c++-static-destructors -c registration.cpp -o nodtor.o
llvm-nm -u cxa.o plain.o nodtor.o up.o
```

DOWNCAST·THROW 구성은 이렇게 실패합니다.

```text
flags.cpp:5:37: error: use of dynamic_cast requires -frtti
flags.cpp:8:14: error: cannot use 'throw' with exceptions disabled
```

나머지 오브젝트의 미정의 심볼입니다.

```text
cxa.o:
                 U _ZN6LoggerD1Ev
                 U __cxa_atexit
                 U __dso_handle
plain.o:
                 U _ZN6LoggerD1Ev
                 U atexit
nodtor.o:
up.o:
                 U _Unwind_Resume
                 U _Z10initializev
                 U __cxa_guard_abort
                 U __cxa_guard_acquire
                 U __cxa_guard_release
                 U __gxx_personality_v0
```

`up()`의 upcast `dynamic_cast`는 `-fno-rtti`에서도 컴파일됩니다. `up.o`는 예외를 켠 채 컴파일했으므로 동적 static 초기화가 `initialize()` 예외에 대비한 `__cxa_guard_abort`와 `_Unwind_Resume`까지 끌어옵니다.

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
