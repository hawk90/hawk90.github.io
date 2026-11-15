---
title: "C++ 스타트업 코드 분석 — .init_array·전역 생성자 호출 순서"
slug: "embedded/embedded-cpp/part1-06-startup-code"
date: 2026-04-28T09:06:00
description: "Reset에서 main까지 — vector table, .data 복사, .bss 초기화, __libc_init_array가 호출하는 C++ static 생성자."
series: "Embedded C++ for Real Systems"
seriesOrder: 6
tags: [cpp, embedded, startup, init-array, static-initialization, reset-handler]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **정적 저장 기간 객체의 초기화에는 정적 초기화와 동적 초기화가 있습니다.** 이 글은 Cortex-M의 GNU/newlib 계열 startup이 `.data`·`.bss`를 준비하고 `.init_array`의 초기화 함수를 호출하는 흐름을 다룹니다. 모든 C++ 객체가 main 전에 생성되는 것은 아닙니다.

## 어떤 문제를 푸는가

비지역 static 객체에 필요한 동적 초기화는 구현의 startup 계약에 따라 실행됩니다. 상수 초기화로 끝나는 객체에는 실행할 초기화 함수가 없을 수 있고, 함수 내부 static 객체는 최초 진입 시 초기화됩니다. 표준은 일부 비지역 동적 초기화의 지연도 허용하므로 아래 흐름을 모든 C++ 구현의 유일한 실행 순서로 읽으면 안 됩니다. 임베디드에서 이 시점이 언제이고 누가 호출하는지 알아야 함정을 피할 수 있습니다.

```cpp
// 이 두 객체는 main 전에 생성되어야 함
Logger g_logger(LogLevel::Info);
Timer  g_timer(1000);

int main() {
    g_logger.log("started");
    return 0;
}
```

부트 순서를 모르면 다음과 같은 조용한 버그에 빠집니다.

- static 객체 A의 생성자에서 B를 사용하는데 B가 아직 미생성이면 zero-initialized 상태로 쓰여 런타임에 충돌합니다
- 부트 코드에서 C++ 객체에 접근하면 생성자가 호출되지 않아 vtable이 null이 되고 crash로 이어집니다
- static initialization order fiasco가 발생해 빌드마다 결과가 달라집니다

이 글은 Reset에서 main까지의 정확한 흐름과 C++ 객체 초기화 시점을 다룹니다.

## 부트 흐름 — Reset에서 main까지

ARM Cortex-M 기준입니다. 다른 아키텍처도 개념은 동일합니다.

![부트 시퀀스 — Reset에서 main까지](/images/blog/embedded-cpp/diagrams/part1-06-boot-sequence.svg)


1. **전원 ON 또는 Reset 핀** 입력으로 시작합니다.
2. **부트 메모리 선택** — MCU의 boot 설정에 따라 사용자 Flash, 시스템 ROM, SRAM 등 reset vector를 읽을 메모리가 결정됩니다. 모든 Cortex-M이 항상 vendor boot ROM부터 실행하는 것은 아닙니다.
3. **Reset Vector 읽음**
4. **`Reset_Handler`** (어셈블리 또는 C)
   - reset 진입 전에 하드웨어가 vector table의 첫 값으로 MSP를 읽습니다. handler에서 다시 설정하는 코드는 장치 startup 구현에 따라 다릅니다
   - `.data` 섹션 복사 (Flash → RAM)
   - `.bss` 섹션 0으로 초기화
   - FPU 활성화 (있다면)
   - 시스템 클럭 설정 (선택, 보통 `SystemInit()`)
5. **`__libc_init_array()`** — C++ 진입의 핵심입니다.
   - `.preinit_array` 순회 호출
   - `_init()` 호출 (legacy)
   - `.init_array` 순회 호출 — *C++ static 객체 생성자*가 여기서 돕니다
6. **`main()`**
7. **main 반환 처리** — startup과 C runtime 구현에 따라 exit, 종료 hook, 정지 loop 등으로 이어집니다. `__libc_fini_array`와 `__cxa_atexit` 등록 소멸자는 같은 메커니즘이 아니므로 종료 경로를 따로 확인합니다.

이 예시의 핵심 계약은 `.data`·`.bss` 준비 뒤 필요한 동적 초기화를 실행하고 application에 진입하는 것입니다. CMSIS startup은 `SystemInit`을 C runtime 초기화보다 먼저 부르기도 하므로 vendor 파일의 실제 순서를 확인합니다. FPU 명령을 쓰는 초기화 코드가 있다면 FPU 활성화도 그 전에 끝내야 합니다.

## Vector Table — Reset의 시작점

Cortex-M vector table에는 초기 MSP 값과 예외·장치별 interrupt handler 주소가 들어갑니다. 크기는 장치의 vector 수에 따라 달라지며 256바이트로 고정되지 않습니다. 첫 entry는 함수 포인터가 아니라 stack 주소입니다.

```cpp
// vectors.cpp: GNU 계열 Cortex-M용 배치 예시
#include <stdint.h>
extern "C" void Reset_Handler(void);
extern "C" void Default_Handler(void);

extern "C" uint32_t _estack;   // 링커가 정의 — stack top

__attribute__((section(".isr_vector")))
const void* vectors[] = {
    &_estack,                     // 0x00: 초기 stack pointer
    (void*)Reset_Handler,         // 0x04: Reset vector
    (void*)Default_Handler,       // 0x08: NMI
    (void*)Default_Handler,       // 0x0C: HardFault
    (void*)Default_Handler,       // 0x10: MemManage
    (void*)Default_Handler,       // 0x14: BusFault
    (void*)Default_Handler,       // 0x18: UsageFault
    // ...
};
```

링커 스크립트가 vectors를 Flash 시작 주소(0x08000000)에 배치합니다. 전원 ON 시 CPU가 첫 4 바이트를 SP로, 다음 4 바이트를 PC로 로드해 Reset_Handler를 실행합니다.

## Reset_Handler — 첫 C++ 호출 전 준비

GNU/newlib 계열의 흐름을 설명하는 골격입니다. `SystemInit`, runtime 함수와 `main`의 선언, linker symbol 정렬 및 vendor hook은 제품 startup에서 가져와야 합니다. 이 코드 조각은 단독 완성 startup이 아닙니다.

```cpp
extern "C" {
    extern uint32_t _sidata;    // .data의 LMA (Flash 위치)
    extern uint32_t _sdata;     // .data의 VMA 시작 (RAM)
    extern uint32_t _edata;     // .data의 VMA 끝 (RAM)
    extern uint32_t _sbss;      // .bss 시작 (RAM)
    extern uint32_t _ebss;      // .bss 끝 (RAM)
}

extern "C" void Reset_Handler(void) {
    // 1. .data 복사: Flash에서 RAM으로
    uint32_t* src = &_sidata;
    uint32_t* dst = &_sdata;
    while (dst < &_edata) {
        *dst++ = *src++;
    }

    // 2. .bss 0으로 초기화
    dst = &_sbss;
    while (dst < &_ebss) {
        *dst++ = 0;
    }

    // 3. 시스템 클럭 (벤더 함수)
    SystemInit();

    // 4. C++ 런타임 + static 객체 초기화
    __libc_init_array();

    // 5. main 호출
    int rc = main();

    // 6. main return 시
    __libc_fini_array();
    while (1);   // 또는 exit(rc)
}
```

1, 2번이 안 끝난 상태에서 C++ 객체를 만지면 위험합니다. `.bss`가 0이 아닐 수 있고 `.data`가 random일 수 있습니다.

## `__libc_init_array` — C++ static 생성자 호출

newlib의 `libc/misc/init.c`에 있는 함수이며, GCC 언어 자체가 요구하는 함수 이름은 아닙니다. 아래는 개념적 구현입니다. `_init` 호출은 newlib 빌드 설정에 따라 조건부입니다. preinit array, 조건부 _init, init array 순으로 실행합니다.

```c
// 개념적 구현 (newlib 내부)
void __libc_init_array(void) {
    size_t count;
    size_t i;

    // 1. .preinit_array — 가장 먼저
    count = __preinit_array_end - __preinit_array_start;
    for (i = 0; i < count; i++)
        __preinit_array_start[i]();

    // 2. _init — legacy GNU init
    _init();

    // 3. .init_array — C++ static 생성자가 들어 있음
    count = __init_array_end - __init_array_start;
    for (i = 0; i < count; i++)
        __init_array_start[i]();
}
```

`__init_array_start`와 `__init_array_end`는 링커가 정의합니다. 링커 스크립트의 `.init_array` 섹션의 시작과 끝을 가리킵니다.

```ld
/* 링커 스크립트 (예: STM32F4) */
.init_array : {
    PROVIDE_HIDDEN(__init_array_start = .);
    KEEP(*(SORT(.init_array.*)))
    KEEP(*(.init_array))
    PROVIDE_HIDDEN(__init_array_end = .);
} >FLASH
```

보통 compiler가 만든 초기화 wrapper의 주소가 들어갑니다. wrapper 하나가 여러 객체를 초기화할 수 있으므로 entry 수는 객체 수와 같지 않습니다.

## Static 객체 생성자가 들어가는 방법

```cpp
// app.cpp
class Logger {
public:
    Logger() {
        // 생성자 본문
    }
};

Logger g_logger;   // static 객체
```

컴파일러가 자동으로 다음 코드를 생성합니다.

```cpp
// 컴파일러가 만드는 hidden 코드 (개념)
// compiler 내부의 초기화 wrapper를 나타내는 선언입니다.
// 직접 작성한 C++에서 생성자를 일반 member 함수처럼 호출할 수는 없습니다.
void __static_initialization_0();

// .init_array 섹션에 함수 포인터 등록
__attribute__((section(".init_array")))
void (*__init_0)(void) = __static_initialization_0;
```

링커가 모든 `.init_array.*` 섹션을 정렬해 결합합니다. `__libc_init_array`가 순회하며 호출합니다.

결과적으로 `g_logger`는 main 호출 직전에 생성됩니다.

## Static 초기화 순서 — 같은 TU 안

같은 Translation Unit의 일반적인 비-inline 비-template 비지역 객체처럼 ordered dynamic initialization 대상은 정의 순서를 따릅니다. inline 변수와 template static data member 등은 별도 규칙이 있으므로 모든 static을 한 규칙으로 묶지 않습니다.

```cpp
// file1.cpp
Logger g_logger;          // 1번째
Timer  g_timer(g_logger); // 2번째 — g_logger 이미 OK
Cache  g_cache(g_timer);  // 3번째 — g_timer 이미 OK
```

이 경우는 안전합니다. 순서가 보장됩니다.

## Static 초기화 순서 — 다른 TU 사이

문제는 다른 .cpp 파일 간의 초기화 순서가 unspecified라는 점입니다.

```cpp
// file_a.cpp
Logger g_logger;

// file_b.cpp
extern Logger g_logger;
Timer g_timer(g_logger);   // g_logger가 먼저 초기화 보장 X
```

`g_timer`가 먼저 초기화되면 `g_logger`는 아직 zero-initialized 상태입니다. 객체에 따라 런타임에 충돌합니다.

이것이 **Static Initialization Order Fiasco**입니다. Modern C++가 가장 권장하는 해결책은 Construct-On-First-Use입니다.

```cpp
// 해결 — Construct-On-First-Use
Logger& get_logger() {
    static Logger instance;   // C++11+ thread-safe init
    return instance;
}

// 다른 곳에서
Timer g_timer(get_logger());   // 호출 시점에 instance 생성 보장
```

함수 내 static의 동적 초기화는 최초 제어 진입 시 실행됩니다. C++11 이후 동시 진입의 초기화 완료를 기다리는 보장이 있지만 `-fno-threadsafe-statics`를 사용하거나 필요한 guard runtime이 없으면 해당 계약을 다시 확인해야 합니다. 초기화 중 재귀 진입도 피해야 합니다.

자세한 내용은 [Part 4-08: Singleton 대안](/blog/embedded/embedded-cpp/part4-08-singleton-alternatives)에서 다룹니다.

## 임베디드의 함정 — Constructor에서 H/W 접근

static 생성자가 하드웨어를 만지면 문제가 됩니다. `__libc_init_array` 시점에는 클럭만 설정되고 peripheral은 미초기화 상태일 수 있습니다.

```cpp
// 위험!
class GPIO {
public:
    GPIO() {
        // 이 시점에 RCC 접근과 의존 클럭이 유효한지 별도 확인 필요
        RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;
        // ...
    }
};

GPIO g_led_pin;   // SystemInit 후, main 전에 호출
```

이 글의 골격에서는 `SystemInit()` 다음, `main()` 직전입니다. RCC clock-enable 쓰기 하나만으로 외부 전원·핀·clock tree 등 다른 전제까지 성립하지는 않습니다. 생성자에서 접근할 수 있는 하드웨어 범위를 startup 계약으로 정해야 합니다.

권장은 static 객체를 lazy 초기화하거나 main 안에서 명시적으로 init하는 것입니다.

```cpp
// 안전
class GPIO {
public:
    void init() {
        RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;
        // ...
    }
};

GPIO g_led;

int main() {
    SystemClock_Config();
    g_led.init();   // 명시적, 순서 통제
    // ...
}
```

## 상수 초기화와 trivial 생성자를 구분하기

직접 작성한 constexpr 생성자는 상수 초기화를 가능하게 하지만 trivial 생성자는 아닙니다. C++20의 `constinit`으로 정적 저장 기간 변수의 상수 초기화를 요구할 수 있습니다. C++17 프로젝트는 constexpr 초기화식과 생성된 오브젝트를 함께 확인합니다.

```cpp title="constant-init.cpp"
#include <type_traits>
struct Counter {
    int count;
    constexpr Counter() : count(0) {}
};
static_assert(!std::is_trivially_default_constructible_v<Counter>);
constinit Counter counter;
#ifdef BAD_TRIVIAL_ASSERT
static_assert(std::is_trivially_default_constructible_v<Counter>);
#endif
int main() { return counter.count; }
```

`clang++ -std=c++20 constant-init.cpp -o constant-init`로 실행하면 exit 0입니다. `-DBAD_TRIVIAL_ASSERT`를 추가하면 이전 설명의 잘못된 trivial 가정이 컴파일 단계에서 드러납니다. 상수 초기화 여부와 .bss/.data 배치는 같은 개념이 아니며, nonzero 초기값이면 .data/읽기 전용 영역 등이 필요할 수 있습니다.

## `.init_array` 섹션이 Flash에 있는지

링커 스크립트에서 `.init_array`가 어디에 배치되는지 확인합니다.

```ld
/* 보통 — Flash에 배치 (RAM 절약) */
.init_array : {
    KEEP(*(SORT(.init_array.*)))
    KEEP(*(.init_array))
} >FLASH
```

`KEEP`가 중요합니다. `--gc-sections`가 `.init_array`를 제거하지 않도록 막아줍니다. 보존하지 않으면 도달성 규칙과 linker 구현에 따라 필요한 초기화 entry가 제거될 수 있습니다. 실제 map과 ELF로 확인합니다.

## 소멸자 등록 옵션과 초기화 entry 확인

`-fno-use-cxa-atexit`는 소멸자를 없애는 옵션이 아닙니다. GCC 문서의 계약은 정적 객체 소멸자를 `__cxa_atexit` 대신 `atexit`로 등록하는 것입니다. 종료 없는 firmware에서의 등록 제거는 runtime 정책과 지원 옵션을 따로 검토합니다. 추정 절감 바이트를 근거로 이 옵션을 켜지 않습니다.

```cpp title="dynamic-init.cpp"
extern int read_boot_value();
struct BootValue { int value; BootValue() : value(read_boot_value()) {} };
BootValue first, second;
```

```bash
clang++ --target=arm-none-eabi -mcpu=cortex-m4 -mthumb -std=c++17 -O0 -c dynamic-init.cpp -o dynamic-init.o
llvm-readelf -SW dynamic-init.o
llvm-readelf -r dynamic-init.o
llvm-nm --demangle dynamic-init.o
```

Clang 23.1.3의 위 ARM ELF 오브젝트에는 초기화할 객체가 두 개여도 .init_array entry가 하나이며, 그 relocation은 TU 초기화 wrapper를 가리켰습니다. 최종 firmware에서는 pointer 크기와 entry 개수를 확인하되 이를 곧바로 객체 수나 부트 시간으로 환산하지 않습니다. 부트 시간은 보드의 clock, 생성자 본문, 외부 장치 대기 등을 포함해 별도로 측정합니다.

## 자주 보는 함정과 안티패턴

### 1. Reset_Handler에서 .data 복사 누락

초기값 있는 global이 random 상태가 됩니다. 정상 동작하다가 조용히 실패합니다.

### 2. .bss 0 초기화 누락

zero-init 가정 변수(`static int counter = 0;`)가 random이 됩니다. 카운터가 음수에서 시작하는 등의 silent bug가 발생합니다.

### 3. `__libc_init_array` 호출 누락

필요한 동적 초기화가 실행되지 않습니다. 객체 수명과 상태 계약을 어긴 것이므로 가상 호출뿐 아니라 일반 함수 사용도 잘못될 수 있으며 특정 vptr 값이나 crash를 보장하지 않습니다.

### 4. Constructor에서 다른 TU의 static에 의존

초기화 순서 fiasco가 발생합니다. Construct-On-First-Use 패턴으로 회피합니다.

### 5. Constructor에서 RTOS 호출

스케줄러 시작 전 허용되는 API는 RTOS마다 다릅니다. 객체 생성 API와 blocking API를 구분하고, tick·scheduler·heap이 필요한 작업은 해당 runtime이 준비된 뒤 명시적으로 호출합니다.

### 6. `.init_array` 섹션 KEEP 누락

`--gc-sections`가 static 생성자 함수를 제거합니다. 객체가 zero-init만으로 시작해 잘못된 동작을 합니다.

## Bare-metal Minimal Startup — 직접 작성

극도로 작은 환경에서 startup을 직접 작성하는 패턴입니다.

```cpp
// minimal_startup.cpp: 생략된 platform hook은 아래 한계를 참고합니다.
#include <stdint.h>
extern "C" {

extern uint32_t _sidata, _sdata, _edata, _sbss, _ebss;
extern void(*__init_array_start[])(void);
extern void(*__init_array_end[])(void);

void Reset_Handler(void) {
    // .data 복사
    for (uint32_t *src = &_sidata, *dst = &_sdata; dst < &_edata; )
        *dst++ = *src++;

    // .bss 클리어
    for (uint32_t *dst = &_sbss; dst < &_ebss; )
        *dst++ = 0;

    // C++ static 생성자
    for (auto* fn = __init_array_start; fn < __init_array_end; ++fn)
        (*fn)();

    // main
    extern int main(void);
    main();

    while (1);
}

}   // extern "C"
```

이 골격은 .preinit_array, 소멸자 등록, FPU·clock·vector 설정, .ARM.exidx 등 제품별 요구를 생략했습니다. newlib을 쓰지 않는 설계의 출발점이며 이 코드만으로 실제 보드 부트가 검증된 것은 아닙니다. compiler가 copy loop를 memcpy/memset 호출로 바꾸는지도 오브젝트에서 확인해야 합니다.

## 정리

- 이 예시는 reset 하드웨어의 MSP 설정 후 .data/.bss와 platform 초기화, init-array 호출을 거쳐 main에 진입합니다. vendor별 순서는 startup 파일에서 확인합니다.
- .init_array는 초기화 wrapper의 함수 포인터 목록이며 entry 수가 객체 수와 일치하지는 않습니다.
- 일반 ordered dynamic initialization은 같은 TU의 정의 순서를 따릅니다. TU 사이 의존과 inline/template 변수는 별도 규칙을 확인합니다.
- 생성자의 하드웨어·RTOS 접근은 준비 순서와 API 계약으로 판단하고, 전제가 많은 작업은 main의 명시적 init로 옮깁니다.
- trivial 생성자와 constexpr 생성자는 다른 개념입니다. 상수 초기화를 요구할 때는 constinit 또는 상수 초기화식과 오브젝트 검사를 사용합니다.
- 작은 환경에서는 startup 자체를 직접 작성할 수도 있습니다.

## 1차 자료와 확인 범위

- [CMSIS Cortex-M startup](https://arm-software.github.io/CMSIS_6/latest/Core/startup_c_pg.html) — vector와 SystemInit/runtime 진입
- [newlib init.c](https://github.com/mirror/newlib-cygwin/blob/master/newlib/libc/misc/init.c) — array 순회와 조건부 _init
- [GCC C++ dialect options](https://gcc.gnu.org/onlinedocs/gcc/C_002b_002b-Dialect-Options.html) — cxa-atexit와 guard 옵션
- [C++ draft: static initialization](https://eel.is/c++draft/basic.start.static)와 [dynamic initialization](https://eel.is/c++draft/basic.start.dynamic) — 언어 규칙

2026-10-22 확인은 host의 상수 초기화 예제 실행과 ARM ELF 오브젝트의 .init_array·relocation 검사입니다. reset, FPU, 실제 newlib 링크와 보드 부팅은 실행하지 않았습니다.

## 관련 항목

- [Part 1-03: 런타임 요구사항](/blog/embedded/embedded-cpp/part1-03-runtime-requirements) — `__libc_init_array`의 소속
- [Part 1-07: 링커 스크립트와 C++](/blog/embedded/embedded-cpp/part1-07-linker-scripts) — `.init_array` 섹션 배치
- [Part 4-08: Singleton 대안](/blog/embedded/embedded-cpp/part4-08-singleton-alternatives) — Construct-On-First-Use

## 다음 글

[Part 1-07: 링커 스크립트와 C++](/blog/embedded/embedded-cpp/part1-07-linker-scripts) — `.init_array`, `.text`, `.rodata`, `.data`, `.bss`의 정확한 배치와 custom 섹션을 다룹니다.
