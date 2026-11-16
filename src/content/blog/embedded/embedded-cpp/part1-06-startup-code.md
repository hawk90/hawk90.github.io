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

- static 객체 A의 생성자에서 B를 사용하는데 B가 아직 생성되지 않았으면, A는 zero-initialized 상태의 B를 읽습니다
- 생성자가 돌기 전에 객체를 쓰면 멤버와 vptr이 0인 객체를 다루게 됩니다
- 다른 파일의 static 객체끼리 의존하면 결과가 링크 순서에 따라 바뀝니다(아래 [다른 TU 사이](#static-초기화-순서--다른-tu-사이) 절에서 QEMU로 재현)

이 글은 Reset에서 main까지의 흐름과 C++ 객체 초기화 시점을 다룹니다. 실행 결과는 모두 Homebrew arm-none-eabi-g++ 16.2.0으로 링크한 Cortex-M4 ELF를 QEMU 11.1.3의 `mps2-an386` 보드에서 semihosting으로 돌린 것입니다. startup은 이 글의 [최소 startup](#bare-metal-minimal-startup--직접-작성)과 같은 구조에 `.preinit_array` 순회와 semihosting 출력·종료 함수만 더했습니다.

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
   - 시스템 클럭 설정 (CMSIS startup이면 `SystemInit()`)
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

링커 스크립트가 vectors를 Flash 시작 주소(STM32F4는 0x08000000, QEMU `mps2-an386`은 0x00000000)에 배치합니다. 리셋 시 CPU가 vector table의 첫 워드를 MSP로, 둘째 워드를 PC로 읽어 Reset_Handler를 실행합니다. 둘째 워드의 최하위 비트는 Thumb 상태를 뜻하는 1이어야 하며, 함수 주소를 그대로 넣으면 링커가 이 비트를 붙입니다.

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

1, 2번이 안 끝난 상태에서는 C든 C++든 전역 변수 값을 믿을 수 없습니다. 실제 SRAM은 전원 인가 직후 내용이 정해져 있지 않습니다. QEMU는 RAM을 0으로 채운 채 시작하므로 1번을 빼 보면 다른 증상이 나옵니다. `int boot_count = 42;`를 출력하는 프로그램에서 `.data` 복사 루프만 지운 startup으로 링크하니 이렇게 나왔습니다.

```text
# .data 복사 있음
boot_count=42 zeroed=0
# .data 복사 없음
boot_count=0 zeroed=0
```

QEMU에서는 `.bss` 정리를 빼도 증상이 보이지 않습니다. 에뮬레이터에서 통과했다고 2번이 필요 없는 것이 아닙니다.

## `__libc_init_array` — C++ static 생성자 호출

newlib의 `libc/misc/init.c`에 있는 함수이며, C++ 언어가 요구하는 함수 이름은 아닙니다. 아래는 newlib-cygwin 저장소 HEAD의 함수 본문 그대로입니다. `_init` 호출은 `_HAVE_INIT_FINI`로 빌드했을 때만 들어갑니다.

```c
void
__libc_init_array (void)
{
  size_t count;
  size_t i;

  count = __preinit_array_end - __preinit_array_start;
  for (i = 0; i < count; i++)
    __preinit_array_start[i] ();

#ifdef _HAVE_INIT_FINI
  _init ();
#endif

  count = __init_array_end - __init_array_start;
  for (i = 0; i < count; i++)
    __init_array_start[i] ();
}
```

newlib의 ARM crt0(`libgloss/arm/crt0.S`)는 이 함수를 부르기 전에 `atexit(__libc_fini_array)`를 먼저 등록하고, `main`이 반환하면 `exit`를 부릅니다. 그래서 `__libc_fini_array`는 `exit` 안에서 돕니다([Part 1-03](/blog/embedded/embedded-cpp/part1-03-runtime-requirements#부트-시퀀스--무엇이-언제-실행되는가)).

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

`.init_array`에는 컴파일러가 번역 단위(TU)마다 만든 초기화 wrapper의 주소가 들어갑니다. wrapper 하나가 그 TU의 객체를 모두 초기화하므로 entry 수는 객체 수와 같지 않습니다(아래 [소멸자 등록 옵션](#소멸자-등록-옵션과-초기화-entry-확인) 절의 `readelf` 결과).

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

컴파일러는 이 TU를 위한 지역 함수 하나를 만들고, 그 주소를 `.init_array` 섹션에 4바이트 entry로 넣습니다. GCC 16.2.0은 이 함수를 TU의 첫 동적 초기화 객체 이름을 따서 `_GLOBAL__sub_I_g_logger`(지역 심볼 `t`)로 이름 붙였고, Clang 23.1.5는 파일 이름을 따서 `_GLOBAL__sub_I_dynamic_init.cpp`처럼 붙였습니다. 이 함수 안에서 `Logger::Logger()`를 부릅니다.

링커가 모든 입력의 `.init_array.*`·`.init_array` 섹션을 한 섹션으로 모으고, `__libc_init_array`가 순회하며 호출합니다. 결과적으로 `g_logger`는 `main` 호출 전에 생성됩니다.

## Static 초기화 순서 — 같은 TU 안

같은 Translation Unit 안에서 ordered initialization 대상인 두 변수는 정의 순서대로 초기화됩니다([basic.start.dynamic]/3). 표준은 template 특수화의 static 변수를 unordered, template이 아닌 inline 변수를 partially-ordered로 따로 분류합니다([basic.start.dynamic]/1).

```cpp
// file1.cpp
Logger g_logger;          // 1번째
Timer  g_timer(g_logger); // 2번째 — g_logger 이미 OK
Cache  g_cache(g_timer);  // 3번째 — g_timer 이미 OK
```

세 변수 모두 template도 inline도 아니므로 ordered이고, 이 순서가 보장됩니다.

## Static 초기화 순서 — 다른 TU 사이

문제는 다른 .cpp 파일 사이입니다. 표준은 다른 TU의 두 변수 초기화를 indeterminately sequenced, 즉 어느 쪽이 먼저인지 정하지 않습니다([basic.start.dynamic]/3).

```cpp
// file_a.cpp
Logger g_logger;

// file_b.cpp
extern Logger g_logger;
Timer g_timer(g_logger);   // g_logger가 먼저 초기화 보장 X
```

GNU 툴체인에서는 실제 순서를 링크 순서가 정합니다. `Logger`의 생성자가 `level`을 3으로 두고, `Timer`의 생성자가 그 값을 복사하는 두 파일을 순서만 바꿔 링크해 QEMU에서 실행한 결과입니다.

```text
# arm-none-eabi-g++ ... file_a.cpp file_b.cpp
ctor g_logger
ctor g_timer
main: g_timer.copied=3

# arm-none-eabi-g++ ... file_b.cpp file_a.cpp
ctor g_timer
ctor g_logger
main: g_timer.copied=0
```

두 ELF의 `.init_array`는 모두 8바이트(entry 2개)이고, entry 순서만 반대입니다. 두 번째 빌드에서 `g_timer`는 아직 zero-initialized 상태인 `g_logger`의 `level` 0을 복사했습니다. 컴파일 경고도 링크 에러도 없습니다. CMake가 소스 목록 순서를 바꾸거나 파일을 라이브러리로 옮기면 이런 변화가 생깁니다.

이것이 **Static Initialization Order Fiasco**입니다. [ISO C++ FAQ](https://isocpp.org/wiki/faq/ctors#static-init-order)가 제시하는 해결책은 Construct-On-First-Use입니다.

```cpp
// 해결 — Construct-On-First-Use
Logger& get_logger() {
    static Logger instance;   // C++11+ thread-safe init
    return instance;
}

// 다른 곳에서
Timer g_timer(get_logger());   // 호출 시점에 instance 생성 보장
```

함수 내 static의 동적 초기화는 최초 제어 진입 시 실행됩니다. C++11부터는 동시 진입이 초기화 완료를 기다립니다([stmt.dcl]/3). `-fno-threadsafe-statics`를 쓰면 이 대기 코드가 빠지고([Part 1-02](/blog/embedded/embedded-cpp/part1-02-compiler-flags#-fno-threadsafe-statics--magic-static-끄기)의 디스어셈블), 기본 설정이면 `__cxa_guard_acquire`/`__cxa_guard_release`를 제공하는 libsupc++가 링크되어야 합니다. 초기화 도중 같은 선언에 재귀로 들어오면 미정의 동작입니다([stmt.dcl]/3).

자세한 내용은 [Part 4-08: Singleton 대안](/blog/embedded/embedded-cpp/part4-08-singleton-alternatives)에서 다룹니다.

## 임베디드의 함정 — Constructor에서 H/W 접근

static 생성자가 하드웨어를 만지면 문제가 됩니다. 위 Reset_Handler 골격에서 `__libc_init_array` 시점에 끝난 하드웨어 설정은 `SystemInit()`이 한 일뿐입니다.

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
/* Flash에 배치: 실행 중 바뀌지 않는 함수 포인터 표 */
.init_array : {
    KEEP(*(SORT(.init_array.*)))
    KEEP(*(.init_array))
} >FLASH
```

`KEEP`가 중요합니다. `.init_array` entry는 코드 어디에서도 이름으로 참조하지 않으므로, `--gc-sections`는 이 섹션을 쓰지 않는 섹션으로 판단합니다. 위 `file_a.cpp`·`file_b.cpp`를 `KEEP`만 지운 링커 스크립트와 `-ffunction-sections -fdata-sections -Wl,--gc-sections`로 링크하면, 링크는 경고 없이 성공하고 ELF에서 `.init_array` 섹션이 사라집니다. 실행 결과입니다.

```text
main: g_timer.copied=0
```

두 생성자가 모두 지워져 `ctor` 줄이 하나도 찍히지 않았습니다.

## 소멸자 등록 옵션과 초기화 entry 확인

`-fno-use-cxa-atexit`는 소멸자를 없애는 옵션이 아닙니다. GCC 문서는 이 옵션을 `__cxa_atexit` 대신 `atexit`로 정적 소멸자를 등록하는 선택으로 설명합니다. arm-none-eabi-g++ 16.2.0에서는 기본값이 ARM EABI의 `__aeabi_atexit` 호출이었고, 이 옵션을 주면 소멸자가 `.fini_array` entry가 됐습니다([Part 1-02](/blog/embedded/embedded-cpp/part1-02-compiler-flags#-fno-use-cxa-atexit--등록-방식-변경)). 등록 자체를 생략하는 옵션은 Clang의 `-fno-c++-static-destructors`입니다.

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

Clang 23.1.5와 arm-none-eabi-g++ 16.2.0 모두 초기화할 객체가 두 개인데 `.init_array`가 4바이트, entry 하나였습니다. relocation은 TU 초기화 wrapper를 가리킵니다.

```text
# Clang 23.1.5
  [12] .init_array       INIT_ARRAY      00000000 000098 000004 00  WA  0   0  4
00000000  00000826 R_ARM_TARGET1          00000021   _GLOBAL__sub_I_dynamic_init.cpp

# arm-none-eabi-g++ 16.2.0 (-Os)
  [ 9] .init_array       INIT_ARRAY      00000000 000054 000004 04  WA  0   0  4
00000000  00000726 R_ARM_TARGET1     00000001   _GLOBAL__sub_I_first
```

entry 수로 객체 수나 부트 시간을 셀 수는 없습니다. 부트 시간은 생성자 본문이 정합니다.

## 자주 보는 함정과 안티패턴

### 1. Reset_Handler에서 .data 복사 누락

초기값 있는 global이 SRAM의 전원 인가 직후 값으로 시작합니다. 위 QEMU 실험에서는 `boot_count`가 42 대신 0이었습니다.

### 2. .bss 0 초기화 누락

zero-init 가정 변수(`static int counter = 0;`)가 SRAM에 남아 있던 값으로 시작합니다. QEMU는 RAM을 0으로 채워 시작하므로 이 실수를 에뮬레이터에서 잡지 못합니다.

### 3. `__libc_init_array` 호출 누락

필요한 동적 초기화가 실행되지 않습니다. 결과는 `KEEP` 누락 실험과 같아서, 생성자가 하나도 돌지 않고 객체가 zero-initialized 상태로 `main`에 들어갑니다. 가상 함수가 있는 객체라면 vptr도 0입니다.

### 4. Constructor에서 다른 TU의 static에 의존

초기화 순서 fiasco가 발생합니다. Construct-On-First-Use 패턴으로 회피합니다.

### 5. Constructor에서 RTOS 호출

스케줄러 시작 전 허용되는 API는 RTOS마다 다릅니다. 객체 생성 API와 blocking API를 구분하고, tick·scheduler·heap이 필요한 작업은 해당 runtime이 준비된 뒤 명시적으로 호출합니다.

### 6. `.init_array` 섹션 KEEP 누락

`--gc-sections`가 `.init_array`와 static 생성자 함수를 제거합니다. 위 실험처럼 링크는 경고 없이 성공합니다.

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

이 골격은 .preinit_array, 소멸자 등록, FPU·clock·vector 설정 등 제품별 요구를 생략했습니다. 이 글의 QEMU 실험은 이 골격에 `.preinit_array` 순회와 semihosting 함수만 더한 C 버전으로 했고, 실제 보드에서는 실행하지 않았습니다. 같은 C 버전을 arm-none-eabi-gcc 16.2.0 `-Os -ffreestanding`으로 컴파일한 오브젝트에는 미정의 심볼이 링커 심볼(`_sidata` 등)과 `main`뿐이었습니다. 같은 파일을 `-ffreestanding` 없이 `-O2`로 컴파일하면 GCC가 복사·정리 루프를 `memcpy`·`memset` 호출로 바꿔 두 심볼이 미정의로 남았습니다(`-Os`에서는 바꾸지 않았습니다). C 라이브러리 없이 링크하는 startup은 `-ffreestanding` 또는 `-fno-tree-loop-distribute-patterns`로 이 변환을 막고, 오브젝트에 `arm-none-eabi-nm -u`를 돌려 확인합니다.

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

2026-11-16 확인은 QEMU `mps2-an386`(Cortex-M4) 부팅 실험(링크 순서, `KEEP` 누락, `.data` 복사 누락), ARM ELF 오브젝트의 .init_array·relocation 검사, host의 상수 초기화 예제 실행입니다. FPU 설정, newlib 링크와 실제 보드 부팅은 하지 않았습니다.

## 관련 항목

- [Part 1-03: 런타임 요구사항](/blog/embedded/embedded-cpp/part1-03-runtime-requirements) — `__libc_init_array`의 소속
- [Part 1-07: 링커 스크립트와 C++](/blog/embedded/embedded-cpp/part1-07-linker-scripts) — `.init_array` 섹션 배치
- [Part 4-08: Singleton 대안](/blog/embedded/embedded-cpp/part4-08-singleton-alternatives) — Construct-On-First-Use

## 다음 글

[Part 1-07: 링커 스크립트와 C++](/blog/embedded/embedded-cpp/part1-07-linker-scripts) — `.init_array`, `.text`, `.rodata`, `.data`, `.bss`의 정확한 배치와 custom 섹션을 다룹니다.
