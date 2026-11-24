---
title: "임베디드 C++ vs C — 런타임·코드 크기·ABI 관점 비교"
slug: "embedded/embedded-cpp/part1-01-cpp-vs-c"
date: 2026-04-28T09:01:00
description: "임베디드에서 C++가 진짜로 무거운가? 측정 가능한 비교와, C가 여전히 옳은 자리들."
series: "Embedded C++ for Real Systems"
seriesOrder: 1
tags: [cpp, c, embedded, overhead, zero-cost, comparison]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **C++ 추상화의 추가 비용은 기능 이름으로 정할 수 없습니다.** 같은 동작의 C 구현과 같은 타깃·옵션으로 비교합니다.

## 어떤 문제를 푸는가

새 임베디드 프로젝트의 언어를 정할 때 가장 먼저 부딪히는 질문입니다. "C로 갈까 C++로 갈까."

C++를 택하면 다음 두려움이 따라옵니다.

- 코드 크기가 폭증할 것 같습니다
- 런타임 비용을 가늠하기 어렵습니다
- 디버깅이 더 까다로워질 것 같습니다
- 인증(MISRA, DO-178C)에서 막힐 것 같습니다

zero-cost는 해당 추상화를 손으로 구현한 코드보다 추가 비용이 없도록 설계한다는 원칙입니다. 실제 실행 시간·저장 공간·초기화가 모두 0이라는 뜻은 아닙니다. 컴파일러 최적화, 라이브러리 구현, 타깃과 사용 방식별로 검증해야 합니다.

## C++가 C에 더하는 것

C++는 C의 superset에 가깝지만 동일하지는 않습니다. C++가 더하는 도구는 크게 네 가지입니다.

| 도구 | 확인할 비용과 조건 |
| --- | --- |
| 클래스·비가상 멤버 함수 | 레이아웃·padding·호출 및 인라인 결과. 클래스 문법만으로 추가 런타임이 필수인 것은 아님 |
| 템플릿 | 인스턴스별 코드·컴파일 시간, 중복 제거 여부 |
| `constexpr` | 상수 평가가 필요한 문맥에서는 컴파일 시간 평가. 일반 호출은 런타임 실행 가능 |
| RAII | 수동 정리와 같은 자원 해제 작업이 필요함. 인라인은 그 작업 자체를 제거하지 않음 |
| 가상 함수 | vptr/vtable과 간접 호출. devirtualization되면 직접 호출·인라인 가능 |
| 예외·RTTI | ABI·라이브러리별 메타데이터, 정상/오류 경로 실행 비용 |
| 스마트 포인터 | `unique_ptr`의 deleter 상태와 정리, `shared_ptr`의 공유 제어 블록·참조 계수 |
| 입출력·동적 할당 | 선택한 구현과 포맷 기능, allocation 빈도 및 실패 정책 |

예외나 RTTI만 끈다고 나머지 코드의 크기와 지연 시간이 자동으로 C와 같아지지는 않습니다. 아래의 작은 비교는 특정 추상화가 최적화되는 사례를 보여줍니다.

한눈에 보면 다음과 같이 정리됩니다.

![C++ 기능별 런타임 비용](/images/blog/embedded-cpp/diagrams/part1-01-cpp-overhead.svg)

## 측정 — 단순 함수의 어셈블리

말로는 부족합니다. 어셈블리를 직접 봅니다.

같은 동작을 하는 C와 C++를 Cortex-M4 ELF object로 교차 컴파일합니다. 검증 환경은 Homebrew Clang 23.1.5, `-O2 -ffreestanding`이며, GCC 13이나 실제 STM32 보드에서 실행한 결과로 제시하지 않습니다.

```c title="comparison.c"
typedef unsigned int u32;
_Static_assert(sizeof(u32) == 4, "32-bit MMIO access required");
int add_one(int x) { return x + 1; }
void blink_on(void) { *(volatile u32*)0x40020018u = 1u << 5; }
void blink_off(void) { *(volatile u32*)0x40020018u = 1u << 21; }
```

```cpp title="comparison.cpp"
using u32 = unsigned int;
static_assert(sizeof(u32) == 4);
struct Counter {
    int value;
    explicit Counter(int v) : value(v) {}
    int add_one() const { return value + 1; }
};
template<unsigned Address, unsigned Pin>
struct Gpio {
    static_assert(Pin < 16, "GPIO pin must be below 16");
    static void on() { *reinterpret_cast<volatile u32*>(Address + 0x18u) = 1u << Pin; }
    static void off() { *reinterpret_cast<volatile u32*>(Address + 0x18u) = 1u << (Pin + 16); }
};
using Led = Gpio<0x40020000u, 5>;
extern "C" int add_one(int x) { Counter c(x); return c.add_one(); }
extern "C" void blink_on() { Led::on(); }
extern "C" void blink_off() { Led::off(); }
#ifdef INVALID_PIN
static_assert(sizeof(Gpio<0x40020000u, 16>) > 0);
#endif
```

```bash
clang --target=arm-none-eabi -mcpu=cortex-m4 -mthumb -O2 -ffreestanding -c comparison.c -o c.o
clang++ --target=arm-none-eabi -mcpu=cortex-m4 -mthumb -O2 -ffreestanding -std=c++17 -c comparison.cpp -o cpp.o
llvm-objdump -d c.o cpp.o
llvm-objcopy --dump-section .text=c.text c.o
llvm-objcopy --dump-section .text=cpp.text cpp.o
cmp c.text cpp.text
```

이 조건에서는 세 함수의 `.text` 바이트가 같습니다. 생성자와 멤버 호출이 최적화되고, 주소·핀 상수가 같은 volatile store로 내려갑니다. 전체 ELF 파일, startup, 라이브러리 크기까지 같다는 증거는 아닙니다. 이 GPIO 예제는 템플릿 기반 정적 함수이며 RAII를 사용하지 않습니다.

주소는 STM32F4 계열 GPIOA BSRR 배치를 전제로 한 예입니다. 실제 접근 전에는 정확한 품번의 레지스터 주소·클록·핀 모드·보드 연결을 확인해야 합니다. 호스트에서는 실행하지 않습니다. 타입이 달라도 범용 템플릿 인자가 받을 수 있으므로 “서로 다른 타입이면 절대 섞어 쓸 수 없다”는 보장은 없으며, 이 예제의 직접적인 보호는 핀 범위 `static_assert`입니다.

저장소의 `scripts/verify-embedded-cpp-comparison-examples.mjs`는 본문 소스를 추출해 바이트 동일성을 검사하고, 핀16 인스턴스가 컴파일에 실패하는지도 확인합니다.

## 비용이 진짜로 발생하는 영역

zero-cost가 아닌 영역도 있습니다. 기능별 필요성과 최악 경로 비용을 정하고 선택합니다.

### 1. 예외 처리

예외는 unwind table과 런타임 핸들러를 함께 데려옵니다. 실제로 무엇이 붙는지 오브젝트 하나로 확인합니다.

```cpp
// 예외 사용: <stdexcept> 필요, a / b의 정수 overflow 정책은 별도
int divide(int a, int b) {
    if (b == 0) throw std::runtime_error("divide by zero");
    return a / b;
}
```

아래 파일을 arm-none-eabi-g++ 16.2.0, `-mcpu=cortex-m4 -mthumb -Os -fno-rtti -fexceptions`로 컴파일하면 오브젝트가 다음 섹션과 미해결 심볼을 갖습니다. `std::runtime_error` 대신 `int`를 던져 `<stdexcept>` 없이 컴파일되게 했습니다.

```cpp title="exc.cpp"
struct Guard { ~Guard(); };
void work();
int divide_exc(int a, int b) { if (b == 0) throw 1; return a / b; }
int divide_code(int a, int b, int* out) { if (b == 0) return -1; *out = a / b; return 0; }
void guarded() { Guard g; work(); }
```

```text
section           size
.text               80
.ARM.extab          20
.ARM.exidx          24

U _Z4workv
U _ZN5GuardD1Ev
U __aeabi_unwind_cpp_pr0
U __cxa_allocate_exception
U __cxa_end_cleanup
U __cxa_throw
U __gxx_personality_v0
U _ZTIi
```

`__cxa_*`·`__gxx_personality_v0`는 libsupc++(예외 런타임)가, `__aeabi_unwind_cpp_pr0`는 libgcc의 ARM EHABI unwinder가 채웁니다. throw가 없는 `guarded()`만 따로 컴파일해도 차이가 납니다. `-fexceptions`에서는 `.text` 26바이트에 `.ARM.extab` 20·`.ARM.exidx` 8바이트가 붙고, `-fno-exceptions`에서는 `.text` 16바이트뿐입니다. `work()`가 예외를 던질 경우를 대비해 `~Guard()`를 한 번 더 부르고 `__cxa_end_cleanup`으로 넘어가는 landing pad가 생기기 때문입니다. 이 환경(Homebrew arm-none-eabi-gcc)에는 libsupc++·newlib가 들어 있지 않아, 이 런타임이 최종 펌웨어에 더하는 크기는 재지 못했습니다.

예외를 금지하는 프로젝트라면 throw를 오류 반환으로 바꾸고 애플리케이션과 라이브러리의 실패 경로를 함께 검토합니다. 다음 플래그를 추가하면 throw가 있는 코드는 컴파일 단계에서 거부됩니다.

```makefile
CXXFLAGS += -fno-exceptions
```

`exc.cpp`에 이 플래그를 주면 GCC 16.2.0은 이렇게 멈춥니다.

```text
exc.cpp:3:50: error: exception handling disabled, use '-fexceptions' to enable
```

대안으로는 `std::optional`, `std::expected` (C++23), error code 반환이 있습니다. 자세한 내용은 [Part 3-05: No-Exception 설계](/blog/embedded/embedded-cpp/part3-05-no-exception-design)에서 다룹니다.

### 2. RTTI

`dynamic_cast`와 다형 객체의 `typeid`는 클래스마다 컴파일러가 만드는 type_info 객체를 씁니다. 단순 업캐스트와 가상 호출은 `-fno-rtti`에서도 됩니다. 추상 기반 `Sensor`와 파생 `Temp`·`Press` 두 개로 이루어진 계층을 같은 컴파일러로 컴파일하면 `.rodata` 차이가 이렇습니다.

```text
# -frtti                                  # -fno-rtti
.rodata                 80                .rodata                 40
.rodata._ZTI6Sensor      8
.rodata._ZTS6Sensor      8
_ZTI4Temp  12B  _ZTS4Temp   6B
_ZTI5Press 12B  _ZTS5Press  7B
```

`_ZTI*`가 type_info 객체, `_ZTS*`가 타입 이름 문자열입니다. 세 클래스에서 56바이트가 늘었고, 이 비용은 다형 클래스 수와 이름 길이에 비례해 커집니다. `.text`는 두 경우 모두 같았습니다.

```makefile
CXXFLAGS += -fno-rtti
```

대안으로는 tagged union, `std::variant`, visitor 패턴(CRTP 기반)이 있습니다.

### 3. iostream

`std::cout`은 locale·포맷 상태와 정적 초기화 객체(`std::ios_base::Init`)를 함께 끌어옵니다. 이 글의 툴체인에는 libstdc++가 없어 iostream 링크 크기를 재지 못했습니다. 비교할 때는 같은 포맷 요구를 `printf`·`fmt`·UART 출력으로 각각 구현하고 [코드 크기 분석](/blog/embedded/embedded-cpp/part1-04-code-size-analysis)의 map 비교를 씁니다.

대안으로는 `printf`(C 라이브러리), `fmt`(버전·포맷 옵션·빌드 방식별 크기 확인), 직접 UART 출력 등이 있습니다.

### 4. 가상 함수

동적 호출이 남으면 vtable을 읽는 load 두 번과 간접 분기가 필요합니다. 반대로 컴파일러가 정확한 타입을 알면 devirtualization으로 호출 자체를 없앱니다. 같은 `read()`를 기반 참조와 `final` 클래스 참조로 부른 결과입니다(arm-none-eabi-g++ 16.2.0 `-Os`).

```text
00000000 <_Z8via_baseRK6Sensor>:     # const Sensor& s → s.read()
   0:	ldr	r3, [r0, #0]
   2:	ldr	r3, [r3, #0]
   4:	bx	r3

00000006 <_Z9via_finalRK4Temp>:      # struct Temp final, const Temp& t → t.read()
   6:	movs	r0, #25
   8:	bx	lr
```

`final`이 붙은 `Temp`는 더 파생될 수 없으므로 컴파일러가 `Temp::read()`를 직접 부르고, 본문이 `return 25;`라 인라인까지 했습니다.

대안은 CRTP(static polymorphism, [Part 2-08](/blog/embedded/embedded-cpp/part2-08-static-polymorphism))입니다.

### 5. `std::function`

type erasure를 쓰며, heap 할당 여부는 라이브러리의 작은 객체 버퍼 크기가 정합니다. GCC 16.2의 libstdc++(`bits/std_function.h`)는 callable이 `_Nocopy_types` 공용체(객체 포인터·함수 포인터·멤버 함수 포인터) 크기 안에 들어가고 정렬이 맞으며 위치 불변일 때만 내부 버퍼에 저장합니다. 64비트 호스트(aarch64 macOS, g++-16)에서 `operator new` 호출 수를 세면 경계가 그대로 보입니다.

```text
sizeof(std::function<int()>)=32
no capture                   sizeof(lambda)= 1  operator new calls=0
capture 2 x long (16B)       sizeof(lambda)=16  operator new calls=0
capture Big (24B)            sizeof(lambda)=24  operator new calls=1
```

멤버 함수 포인터가 두 워드라 32비트 ARM에서는 이 경계가 8바이트입니다. 캡처가 있다고 늘 할당하지는 않지만, 경계를 넘는 순간 할당이 생기고 소스에서는 보이지 않습니다. 비소유 콜백에는 함수 포인터나 `etl::delegate`를 검토하되, 캡처 객체의 수명을 보장합니다. 소유하는 고정 용량 callable과 delegate는 같은 계약이 아닙니다.

## 코드 크기를 비교할 때 남길 자료

STM32F4의 빈 main·UART·RTOS 등에 일률적인 바이트 수를 붙이려면 재현 소스와 linker script, 정확한 MCU·툴체인·라이브러리 버전, 빌드 옵션과 ELF/map이 필요합니다. 이 글의 검증은 위 세 함수의 object 코드에 한정합니다.

전체 펌웨어를 비교할 때는 기능·오류 정책을 맞추고 독립된 빌드 디렉터리를 사용합니다. Flash 초기화 이미지와 정적 RAM, stack/heap의 최고 사용량을 분리하며, [코드 크기 분석](/blog/embedded/embedded-cpp/part1-04-code-size-analysis)의 방법으로 차이가 생긴 심볼과 archive 멤버를 추적합니다.

## 자주 보는 함정과 안티패턴

### 1. `-fno-exceptions` 없이 시작

예외 사용 정책을 초기에 정합니다. 금지 정책이면 `-fno-exceptions`와 오류 반환을 일관되게 적용하고, 라이브러리의 allocation 실패·throw/abort 경로도 확인합니다. 예외가 필요한 시스템에 일괄 적용할 플래그는 아닙니다.

### 2. `std::vector`를 무심코 사용

기본 allocator의 vector는 저장 공간이 부족해지면 동적으로 할당합니다. 매 push마다 할당하는 것은 아니며, custom allocator로 출처를 바꿀 수도 있습니다. 운용 중 할당을 금지한다면 capacity·원소 자체의 할당·고갈 정책까지 확인합니다. `std::array`, `etl::vector`(고정 크기)로 대체합니다.

### 3. virtual을 모든 곳에 적용

"OOP니까 virtual"은 아닙니다. 진짜 런타임 다형성이 필요한 곳에만 씁니다. 그 외에는 CRTP를 씁니다.

### 4. `iostream` 사용 후 크기 폭증에 놀람

첫 입출력 사용이 어떤 라이브러리 경로를 끌어오는지 map으로 확인합니다. printf·fmt·전용 UART 출력도 같은 포맷 요구로 비교합니다.

### 5. `std::shared_ptr`로 모든 소유권 표현

`shared_ptr`은 공유 제어 블록과 참조 계수가 필요합니다. libstdc++의 복사(`_M_add_ref_copy`)는 `__gnu_cxx::__exchange_and_add_dispatch`를 거치는데, 이 함수는 스레드가 활성일 때 원자 연산을 씁니다. 할당 횟수는 생성 방식이 정합니다. 위 호스트 프로그램에서 `std::shared_ptr<int>(new int(1))`은 `operator new`를 2번(객체와 제어 블록), `std::make_shared<int>(1)`은 1번 불렀습니다. 단독 소유에는 `unique_ptr`, 비소유 접근에는 수명이 보장된 참조·포인터를 사용합니다.

### 6. C++ 표준 라이브러리 전부 사용 가능하다고 가정

표준은 OS 없이도 제공해야 하는 freestanding 헤더를 따로 정합니다. 현재 작업 초안의 [freestanding 헤더 표](https://eel.is/c++draft/compliance)(표 27)에는 `<array>`·`<atomic>`·`<optional>`·`<span>` 등이 있고 `<filesystem>`·`<thread>`·`<chrono>`는 없습니다. 표에 있는 헤더도 일부 항목만 freestanding인 경우가 있어, bare-metal 라이브러리가 무엇을 제공하는지는 그 구현의 문서로 확인합니다. ETL, EASTL 같은 임베디드 친화 라이브러리를 검토합니다.

## Modern C++가 가져온 변화

C++11 이전과 이후는 거의 다른 언어에 가깝습니다.

| 기능 | 추가 표준 | 임베디드 가치 |
| --- | --- | --- |
| `constexpr` | C++11 | 상수 평가 문맥에서 런타임 계산을 제거 |
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
| `std::span` | C++20 | 포인터 + 길이의 비소유 view, 수명·범위 검사는 별도 |
| `std::expected` | C++23 | 예외 없는 에러 처리 |

상수 평가와 최적화로 추가 비용을 없앨 수 있는 도구들입니다. 기능마다 저장 공간·수명·오류 경로의 계약을 함께 확인합니다.

## C가 여전히 옳은 자리

C++가 만능은 아닙니다. C가 더 적합한 경우는 다음과 같습니다.

- **부트 코드 / 인터럽트 벡터 테이블**: 구현 도구와 startup 계약에 따라 C·어셈블리·제한된 C++ 중 선택합니다
- **극소형 MCU**: 사용할 언어 기능과 라이브러리의 실제 코드·RAM 크기가 제한에 맞는지 확인합니다
- **인증 제약**: 적용 표준의 언어 사용 규칙과 도구 검증 계획, 팀의 증거 축적 비용을 비교합니다
- **legacy 코드**: 수십만 줄의 C 코드베이스에 C++ 일부만 섞으면 복잡성이 커집니다
- **팀 역량**: C++ 숙련도가 낮은 팀에서는 느린 도입이 빠른 도입보다 안전합니다

`__libc_init_array`는 일부 런타임의 초기화 경로입니다. 동적 초기화 전에는 그 결과에 의존하는 전역 객체를 사용하면 안 되지만, 상수 초기화된 객체나 필요한 메모리 초기화 뒤의 단순 지역 객체까지 금지되는 것은 아닙니다. 자세한 내용은 [Part 1-06: 스타트업 코드](/blog/embedded/embedded-cpp/part1-06-startup-code)에서 다룹니다.

## C와 C++의 공존 전략

C++로 쓰는 임베디드 프로젝트도 C와 섞입니다. STM32Cube HAL·FreeRTOS 커널처럼 벤더 HAL과 RTOS가 C로 배포되기 때문입니다.

- **HAL/드라이버**: C(벤더 제공, 검증된 코드)
- **부트/스타트업**: C 또는 어셈블리
- **애플리케이션 로직**: C++(RAII, 타입 안전, 추상화 활용)
- **외부 라이브러리 wrapper**: C++(C API를 RAII로 감쌉니다)

C/C++ 혼합 시에는 name mangling과 ABI가 문제가 됩니다. `extern "C"` 블록과 헤더 분리 패턴이 표준 해법입니다. 자세한 내용은 [Part 1-05: ABI 호환성](/blog/embedded/embedded-cpp/part1-05-abi-compatibility)에서 다룹니다.

## 핵심 질문 — 언어가 아닌 사용법

C와 C++의 선택은 언어 자체의 우열 문제가 아닙니다. 어떤 기능을 어떻게 쓰는지가 결정합니다.

C++를 안전하게 쓰려면 시리즈 전체를 관통하는 네 질문을 각 결정마다 던집니다.

1. **이 기능이 런타임 비용을 추가하는가?** 어셈블리로 확인합니다
2. **이 기능이 디버깅을 더 쉽게 만드는가?** 타입 안전과 명확한 의도가 핵심입니다
3. **이 기능이 코드 품질을 끌어올리는가?** RAII, const, constexpr이 그 예입니다
4. **바이너리 크기가 감당 가능한가?** 측정과 `-Os -flto`로 확인합니다

C++의 강점인 추상화가 부담 없이 가능한지를 프로젝트마다 평가합니다.

## 정리

- 이 글의 세 함수는 Clang 23.1.5 `-O2`에서 C와 C++의 `.text`가 바이트 단위로 같았습니다. 전체 시스템 비용은 별도로 검증합니다.
- 비용이 발생하는 영역은 예외, RTTI, iostream, 동적 할당, `std::function`이며 알고 끄거나 대체합니다.
- C는 부트 코드, 극소형 MCU, 인증 환경에서 여전히 적합합니다.
- 결정은 언어 선택이 아니라 사용법 선택입니다. 위 네 가지 핵심 질문으로 매 결정을 평가합니다.

## 1차 자료

- [C++ Core Guidelines: zero-overhead 원칙과 자원 관리](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
- [Clang 교차 컴파일 문서](https://clang.llvm.org/docs/CrossCompilation.html)
- [GCC C++ 옵션: exceptions, RTTI, static 초기화](https://gcc.gnu.org/onlinedocs/gcc/C_002b_002b-Dialect-Options.html)

## 관련 항목

- [Part 1-02: 컴파일러 플래그 가이드](/blog/embedded/embedded-cpp/part1-02-compiler-flags) — `-fno-exceptions`, `-fno-rtti`, `-Os` 설정
- [Part 1-04: 코드 크기 분석](/blog/embedded/embedded-cpp/part1-04-code-size-analysis) — bloat 측정과 통제
- [Part 2-08: Static Polymorphism](/blog/embedded/embedded-cpp/part2-08-static-polymorphism) — virtual 없이 다형성
- [Part 3-05: No-Exception 설계](/blog/embedded/embedded-cpp/part3-05-no-exception-design) — 예외 없이 에러 처리
- GoF 5: Singleton (avoid) — 임베디드의 DI 대안

## 다음 글

[Part 1-02: 컴파일러 플래그 가이드](/blog/embedded/embedded-cpp/part1-02-compiler-flags) — C++를 임베디드 모드로 만드는 정확한 플래그 조합과 그것이 어셈블리에 미치는 영향을 다룹니다.
