---
title: "Part 1-06: 스타트업 코드"
date: 2026-05-07T06:00:00
description: "Reset에서 main까지 — vector table, .data 복사, .bss 초기화, __libc_init_array가 호출하는 C++ static 생성자."
series: "Embedded C++ for Real Systems"
seriesOrder: 6
tags: [cpp, embedded, startup, init-array, static-initialization, reset-handler]
type: tech
---

## 한 줄 요약

> **"C++ 객체는 main 전에 생성됩니다."** `__libc_init_array`가 `.init_array` 섹션을 돌며 static 생성자를 차례로 호출합니다.

## 어떤 문제를 푸는가

C++의 static 객체는 main 호출 전에 생성자가 실행되어야 합니다. 임베디드에서 이 시점이 언제이고 누가 호출하는지 알아야 함정을 피할 수 있습니다.

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


```text
[전원 ON / Reset 핀]
    ↓
[ROM의 boot ROM 실행 — vendor]
    ↓
[Reset Vector 읽음]
    ↓
Reset_Handler  (어셈블리 또는 C)
    ↓
1. SP 초기화 (stack pointer를 vector table의 첫 값으로)
2. .data 섹션 복사 (Flash → RAM)
3. .bss 섹션 0으로 초기화
4. FPU 활성화 (있다면)
5. 시스템 클럭 설정 (선택, 보통 SystemInit())
    ↓
__libc_init_array()   ← C++ 진입의 핵심
    ↓
    .preinit_array 순회 호출
    _init() 호출 (legacy)
    .init_array 순회 호출  ← *C++ static 객체 생성자*
    ↓
main()
    ↓
(main return)
    ↓
__libc_fini_array() (보통 안 호출됨, 임베디드는 main 무한루프)
    ↓
exit() → 무한 루프
```

핵심은 2번 .bss 초기화 → .init_array 호출 → main 순서입니다. 이 순서를 깨뜨려서는 안 됩니다.

## Vector Table — Reset의 시작점

ARM Cortex-M의 첫 256 바이트는 vector table입니다. 각 entry는 함수 포인터입니다.

```cpp
// vectors.cpp 또는 vectors.c
extern "C" void Reset_Handler(void);
extern "C" void Default_Handler(void);

extern uint32_t _estack;   // 링커가 정의 — stack top

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

전형적인 ARM Cortex-M 구현은 다음과 같습니다.

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

GCC와 newlib이 제공하는 함수입니다. 세 개의 섹션을 차례로 호출합니다.

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

각 static 객체의 생성자가 함수 포인터로 이 섹션에 들어갑니다.

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
void __static_initialization_0() {
    g_logger.Logger::Logger();   // 생성자 호출
}

// .init_array 섹션에 함수 포인터 등록
__attribute__((section(".init_array")))
void (*__init_0)(void) = __static_initialization_0;
```

링커가 모든 `.init_array.*` 섹션을 정렬해 결합합니다. `__libc_init_array`가 순회하며 호출합니다.

결과적으로 `g_logger`는 main 호출 직전에 생성됩니다.

## Static 초기화 순서 — 같은 TU 안

같은 Translation Unit(같은 .cpp 파일) 안의 static 객체는 선언 순서대로 초기화됩니다.

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

함수 내 static 변수는 최초 호출 시점에 생성됩니다. 순서가 안전합니다.

자세한 내용은 [Part 4-08: Singleton 대안](/blog/embedded/embedded-cpp/part4-08-singleton-alternatives)에서 다룹니다.

## 임베디드의 함정 — Constructor에서 H/W 접근

static 생성자가 하드웨어를 만지면 문제가 됩니다. `__libc_init_array` 시점에는 클럭만 설정되고 peripheral은 미초기화 상태일 수 있습니다.

```cpp
// 위험!
class GPIO {
public:
    GPIO() {
        // peripheral 클럭 활성화 — Reset_Handler에서 안 했다면 실패
        RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;
        // ...
    }
};

GPIO g_led_pin;   // SystemInit 후, main 전에 호출
```

`SystemInit()` 다음, `main()` 직전입니다. 보통은 안전하지만 peripheral 초기화 순서에 의존성이 있으면 깨질 수 있습니다.

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

## `static_assert`로 생성자 trivial 강제

H/W 접근을 안 하는 static은 trivial constructor가 안전합니다.

```cpp
class Counter {
public:
    constexpr Counter() : count(0) {}
    void increment() { ++count; }
private:
    int count;
};

static_assert(std::is_trivially_default_constructible_v<Counter>);

Counter g_counter;   // .bss 0 초기화로 완성 (생성자 호출 불필요)
```

trivial constructor는 `.init_array`에 추가되지 않습니다. `.bss` zero-init만으로 충분합니다. 부트가 빠르고 위험이 없습니다.

## `.init_array` 섹션이 Flash에 있는지

링커 스크립트에서 `.init_array`가 어디에 배치되는지 확인합니다.

```ld
/* 보통 — Flash에 배치 (RAM 절약) */
.init_array : {
    KEEP(*(SORT(.init_array.*)))
    KEEP(*(.init_array))
} >FLASH
```

`KEEP`가 중요합니다. `--gc-sections`가 `.init_array`를 제거하지 않도록 막아줍니다. 없으면 static 생성자가 사라지고 객체가 미초기화 상태로 남습니다.

## `-fno-use-cxa-atexit` — atexit 등록 끄기

C++ 표준은 static 객체의 소멸자를 `__cxa_atexit`로 등록합니다. 임베디드는 main이 끝나지 않으면 호출되지 않습니다. 등록 비용만 발생합니다.

```makefile
CXXFLAGS += -fno-use-cxa-atexit
```

생성자만 `.init_array`에 등록되고 소멸자는 완전히 제거됩니다. 수십에서 수백 바이트가 절약됩니다.

## 측정 — static 객체 갯수와 init 시간

```bash
# .init_array 크기 = static 생성자 수 × 4 (포인터 크기)
arm-none-eabi-size -A firmware.elf | grep init_array

.init_array         32       80014c0
# 32 / 4 = 8개 static 생성자
```

`nm`으로 생성자 함수들을 확인합니다.

```bash
arm-none-eabi-nm --demangle firmware.elf | grep "_GLOBAL__sub_I_"

00000a40 t _GLOBAL__sub_I_g_logger
00000b20 t _GLOBAL__sub_I_g_timer
00000c40 t _GLOBAL__sub_I_g_cache
```

각 `_GLOBAL__sub_I_*`가 한 TU의 static 초기화 함수입니다.

수십 개의 static 객체가 있으면 `__libc_init_array` 자체에 수 ms가 소요됩니다. 부트 시간이 critical하면 명시적 init으로 옮깁니다.

## 자주 보는 함정과 안티패턴

### 1. Reset_Handler에서 .data 복사 누락

초기값 있는 global이 random 상태가 됩니다. 정상 동작하다가 조용히 실패합니다.

### 2. .bss 0 초기화 누락

zero-init 가정 변수(`static int counter = 0;`)가 random이 됩니다. 카운터가 음수에서 시작하는 등의 silent bug가 발생합니다.

### 3. `__libc_init_array` 호출 누락

static 객체 생성자가 호출되지 않습니다. vtable이 null이 됩니다. virtual 호출 시 crash가 납니다.

### 4. Constructor에서 다른 TU의 static에 의존

초기화 순서 fiasco가 발생합니다. Construct-On-First-Use 패턴으로 회피합니다.

### 5. Constructor에서 RTOS 호출

RTOS는 main 이후에 시작됩니다. static 생성자에서 task 생성이나 mutex 사용을 하면 crash가 납니다.

### 6. `.init_array` 섹션 KEEP 누락

`--gc-sections`가 static 생성자 함수를 제거합니다. 객체가 zero-init만으로 시작해 잘못된 동작을 합니다.

## Bare-metal Minimal Startup — 직접 작성

극도로 작은 환경에서 startup을 직접 작성하는 패턴입니다.

```cpp
// minimal_startup.cpp
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

newlib 없이도 부트가 완성됩니다. 가장 작은 환경(수 KB Flash)에 유용합니다.

## 정리

- 부트 순서는 Reset → SP/.data/.bss → SystemInit → `__libc_init_array` → main입니다.
- C++ static 객체 생성자는 `.init_array` 섹션에 함수 포인터로 등록되고 `__libc_init_array`가 차례로 호출합니다.
- 같은 TU 내부는 선언 순서가 보장되지만 다른 TU 사이는 unspecified입니다. Construct-On-First-Use로 회피합니다.
- 생성자에서 peripheral과 RTOS 호출은 금지합니다. 명시적 init를 main에 두는 것이 안전합니다.
- trivial constructor와 `constexpr`을 활용하면 `.init_array`에 들어가지 않아 부담이 줄어듭니다.
- 작은 환경에서는 startup 자체를 직접 작성할 수도 있습니다.

## 관련 항목

- [Part 1-03: 런타임 요구사항](/blog/embedded/embedded-cpp/part1-03-runtime-requirements) — `__libc_init_array`의 소속
- [Part 1-07: 링커 스크립트와 C++](/blog/embedded/embedded-cpp/part1-07-linker-scripts) — `.init_array` 섹션 배치
- [Part 4-08: Singleton 대안](/blog/embedded/embedded-cpp/part4-08-singleton-alternatives) — Construct-On-First-Use

## 다음 글

[Part 1-07: 링커 스크립트와 C++](/blog/embedded/embedded-cpp/part1-07-linker-scripts) — `.init_array`, `.text`, `.rodata`, `.data`, `.bss`의 정확한 배치와 custom 섹션을 다룹니다.
