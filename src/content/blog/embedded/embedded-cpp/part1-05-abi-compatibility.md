---
title: "C++ ABI 호환성 — Itanium ABI·name mangling·vtable 레이아웃"
date: 2026-04-28T09:05:00
description: "C와 C++가 한 바이너리에서 살아남는 법 — name mangling, extern \"C\", calling convention, struct layout."
series: "Embedded C++ for Real Systems"
seriesOrder: 5
tags: [cpp, c, embedded, abi, name-mangling, extern-c, calling-convention]
type: tech
---

## 한 줄 요약

> **"C와 C++의 통신은 함수 이름의 mangling과 호출 규약의 일치가 전부입니다."** `extern "C"`와 헤더 분리 패턴이 표준 해법입니다.

## 어떤 문제를 푸는가

대부분의 임베디드 프로젝트는 C와 C++가 섞여 있습니다. 벤더가 제공하는 HAL은 C이고 애플리케이션은 C++입니다. 또는 legacy C 코드베이스에 C++ 신규 모듈을 얹기도 합니다.

이 통신 경계에서 세 가지 ABI 문제가 발생합니다.

1. **Name mangling**: C++는 함수 이름에 타입 정보를 더합니다. C는 함수 이름 그대로 씁니다.
2. **Calling convention**: 인자 전달, 반환값, stack 정리 규칙을 결정합니다.
3. **Struct layout**: 패딩, 정렬, virtual table 포함 여부를 결정합니다.

이 셋이 맞아야 링크가 통과하고 런타임에 정확히 동작합니다.

## Name Mangling — 왜 필요한가

C는 함수 이름이 unique하다고 가정합니다. 오버로드도 없고 namespace도 없습니다.

```c
// C: 두 함수 이름 같으면 컴파일 에러
int add(int, int);
int add(double, double);   // 에러: 재정의
```

C++는 같은 이름의 함수가 여러 개 가능합니다(overload). 링커가 구분하려면 고유한 심볼 이름이 필요합니다.

```cpp
// C++: 오버로드 가능
int add(int, int);
double add(double, double);
template<typename T> T add(T, T);
```

컴파일러가 함수 시그니처 정보를 심볼 이름에 인코딩합니다. 이것이 name mangling입니다(Itanium C++ ABI, GCC와 Clang 표준).

```text
# 원래 이름                         # mangled
int add(int, int)                    _Z3addii
double add(double, double)           _Z3adddd
namespace foo { int bar(int); }      _ZN3foo3barEi
class C { void m(int); }             _ZN1C1mEi
```

`nm`에서 보이는 길고 이상한 이름이 이것입니다. `nm --demangle`로 원래 이름을 복원할 수 있습니다.

## C에서 C++ 함수를 부르려면

C 컴파일러는 mangling을 모릅니다. C++ 함수를 그냥 선언하면 링크 실패가 납니다.

```c
// fail.c
extern int add(int, int);   // C는 mangled name 모름

int main() {
    return add(1, 2);   // link error: undefined reference
}
```

```cpp
// lib.cpp
int add(int a, int b) { return a + b; }   // mangled as _Z3addii
```

해결책은 C++ 측에서 `extern "C"`로 mangling을 비활성화하는 것입니다.

```cpp
// lib.cpp
extern "C" int add(int a, int b) { return a + b; }
//        ^^^^^^^^^^ C linkage — no mangling
```

이제 C가 `add`라는 이름으로 찾을 수 있습니다.

## `extern "C"`가 하는 일

`extern "C"`는 두 가지를 동시에 합니다.

1. **Name mangling 비활성**: 심볼 이름 그대로 둡니다
2. **C calling convention 사용**: 인자 전달 규약을 C와 동일하게 맞춥니다

대부분의 경우 동일하지만 일부 플랫폼에서는 다를 수 있으므로 둘 다 명시합니다.

`extern "C"`로 감쌀 수 있는 것은 다음과 같습니다.

- 함수 선언 또는 정의
- 변수 선언(드뭅니다)

감쌀 수 없는 것은 다음과 같습니다.

- 클래스, 멤버 함수(개념 자체가 C에 없습니다)
- 템플릿(C에 없습니다)
- 오버로드(`extern "C"`는 한 이름만 허용합니다)

```cpp
// 한 함수
extern "C" int add(int, int);

// 여러 함수 — 블록
extern "C" {
    int add(int, int);
    int sub(int, int);
    void* alloc(size_t);
}
```

## 헤더 분리 패턴 — C/C++ 양쪽에서 사용

C 헤더를 C와 C++ 양쪽에서 inclusion 가능하게 만드는 표준 패턴입니다.

```c
// driver.h — C와 C++ 양쪽 사용

#ifndef DRIVER_H
#define DRIVER_H

#ifdef __cplusplus
extern "C" {
#endif

typedef struct {
    int fd;
    int flags;
} Driver;

void driver_init(Driver* d);
int  driver_read(Driver* d, void* buf, size_t n);
void driver_close(Driver* d);

#ifdef __cplusplus
}
#endif

#endif // DRIVER_H
```

`__cplusplus`는 C++ 컴파일러만 정의하는 매크로입니다. C 컴파일러는 정의하지 않습니다.

C로 컴파일하면 `extern "C" {`/`}` 블록이 사라지고, C++로 컴파일하면 활성화됩니다. 같은 헤더로 양쪽 모두 처리할 수 있습니다.

벤더 HAL 헤더(STM32, NXP)가 모두 이 패턴을 따릅니다. 그대로 따라 쓰면 됩니다.

## C++ 클래스를 C에 노출 — Opaque Pointer 패턴

C는 class를 모릅니다. C++ 객체를 C에서 다루려면 opaque pointer로 감싸 C 인터페이스만 노출합니다.

```cpp
// logger.h — C/C++ 양쪽
#ifdef __cplusplus
extern "C" {
#endif

typedef struct Logger Logger;   // forward declaration, 내용은 모름

Logger* logger_create(int level);
void    logger_destroy(Logger* l);
void    logger_log(Logger* l, const char* msg);

#ifdef __cplusplus
}
#endif
```

```cpp
// logger.cpp — C++ 구현
class LoggerImpl {
public:
    LoggerImpl(int level) : level_(level) {}
    void log(const char* msg) { /* */ }
private:
    int level_;
};

extern "C" {

Logger* logger_create(int level) {
    return reinterpret_cast<Logger*>(new LoggerImpl(level));
}

void logger_destroy(Logger* l) {
    delete reinterpret_cast<LoggerImpl*>(l);
}

void logger_log(Logger* l, const char* msg) {
    reinterpret_cast<LoggerImpl*>(l)->log(msg);
}

}   // extern "C"
```

C에서의 사용은 다음과 같습니다.

```c
// app.c
#include "logger.h"

void run() {
    Logger* l = logger_create(2);
    logger_log(l, "hello");
    logger_destroy(l);
}
```

C 코드는 Logger의 내부를 모릅니다. 불투명한 핸들만 다룹니다. C++ 구현은 자유롭게 바꿀 수 있습니다.

## C 콜백을 C++가 받기

C 라이브러리가 콜백 함수 포인터를 받는 경우입니다. C는 C linkage 함수만 받을 수 있습니다.

```c
// C 라이브러리
typedef void (*callback_t)(int event);
void register_callback(callback_t cb);
```

C++ 멤버 함수는 암묵의 `this`를 받으므로 C 함수 포인터로 사용할 수 없습니다. static이나 free function만 가능합니다.

```cpp
// 해결 1: free function + 글로벌 객체
EventHandler* g_handler = nullptr;

extern "C" void on_event(int event) {
    if (g_handler) g_handler->handle(event);
}

void setup() {
    static EventHandler handler;
    g_handler = &handler;
    register_callback(&on_event);
}
```

```cpp
// 해결 2: static 멤버 + this 캐시
class EventHandler {
public:
    static EventHandler* instance;

    void handle(int event) { /* */ }

    static void trampoline(int event) {
        instance->handle(event);
    }
};

EventHandler* EventHandler::instance = nullptr;

void setup() {
    static EventHandler h;
    EventHandler::instance = &h;
    register_callback(&EventHandler::trampoline);
}
```

```cpp
// 해결 3: lambda (capture 없는 lambda만)
register_callback([](int event) {
    // capture 없는 lambda는 함수 포인터로 변환 가능합니다
});
```

capture 있는 lambda는 함수 객체이므로 함수 포인터로 변환할 수 없습니다. 그런 경우에는 `user_data` 포인터 인자가 있는 C API를 쓰거나 trampoline 패턴을 사용합니다.

## Calling Convention — ARM 예시

함수 호출 시 인자가 어디로 전달되는지, 반환값이 어디로 가는지, 어느 레지스터를 보존하는지를 정한 규약입니다.

ARM AAPCS(ARM Architecture Procedure Call Standard)의 규칙은 다음과 같습니다.

- r0-r3: 인자 1-4(정수, 포인터)
- r0-r1: 반환값(64-bit는 r0-r1, 작으면 r0)
- r4-r11: callee-saved(호출된 함수가 저장 후 복원)
- r12(ip): scratch
- r13(sp): stack pointer
- r14(lr): link register(반환 주소)
- r15(pc): program counter

VFP가 있으면 float 인자가 FPU 레지스터(s0-s15)로 전달됩니다. 없으면 r0-r3과 stack을 씁니다.

```cpp
// C 함수
int add(int a, int b);

// ARM Thumb 어셈블리
add:
    adds    r0, r0, r1   // r0(a) += r1(b), 결과 r0
    bx      lr           // return
```

C++의 멤버 함수는 암묵 `this`를 r0에 받습니다. 실제 인자는 r1부터 들어갑니다.

```cpp
class Counter {
public:
    int add(int x) { return value + x; }
private:
    int value;
};

// 어셈블리 (ABI상)
Counter::add(int):
    ldr     r2, [r0]      // r0 = this, r2 = this->value
    add     r0, r2, r1    // r0 = value + x
    bx      lr
```

이 암묵 `this`가 C에서 멤버 함수를 직접 부를 수 없는 이유입니다.

## struct Layout — C와 C++의 차이

POD(Plain Old Data) 구조체는 C와 C++ layout이 동일합니다. 그러나 C++가 복잡한 기능을 더하면 달라집니다.

```cpp
// POD — C와 동일
struct Point {
    int x, y;
};
// size = 8, layout: [x: 4][y: 4]
```

```cpp
// vtable 있으면 다름
struct Drawable {
    int x, y;
    virtual void draw() = 0;
};
// size = 12 또는 16 (alignment에 따라)
// layout: [vptr: 4][x: 4][y: 4]
```

vtable 포인터(`vptr`)가 struct 앞에 추가됩니다. C에서 이 struct를 다루면 offset이 어긋납니다. C와 통신할 struct에는 virtual 함수를 금지합니다.

### POD 보장하는 패턴

```cpp
struct Packet {
    uint32_t id;
    uint16_t length;
    uint8_t  type;
    uint8_t  reserved;
    char     data[256];
};

static_assert(std::is_standard_layout_v<Packet>);
static_assert(std::is_trivially_copyable_v<Packet>);
static_assert(sizeof(Packet) == 264);
```

`std::is_standard_layout_v`는 C와 layout 호환이 가능한지를 확인합니다.
`std::is_trivially_copyable_v`는 `memcpy`로 복사 가능한지를 확인합니다.

이 두 static_assert를 C 인터페이스 struct에 두면 향후 실수를 방지할 수 있습니다.

## Padding과 Alignment

C struct의 member 간 padding은 alignment 요구에 따라 결정됩니다.

```cpp
struct Bad {
    char  a;     // offset 0
    int   b;     // offset 4 (3 bytes padding)
    char  c;     // offset 8
    int   d;     // offset 12 (3 bytes padding)
};
// total: 16 bytes (4 wasted on padding)

struct Good {
    int   b;     // offset 0
    int   d;     // offset 4
    char  a;     // offset 8
    char  c;     // offset 9
    // 2 bytes tail padding
};
// total: 12 bytes
```

member 순서만 바꿔도 RAM이 절약됩니다. 큰 member를 먼저 두고 작은 것을 나중에 두는 것이 원칙입니다.

`-Wpadded` GCC 옵션으로 padding 발생 시 경고를 받을 수 있습니다.

### `__attribute__((packed))` — 위험

padding을 강제로 제거합니다. 프로토콜 메시지나 하드웨어 레지스터에 사용합니다.

```cpp
struct __attribute__((packed)) NetworkHeader {
    uint8_t  version;
    uint16_t length;
    uint32_t checksum;
};
// total: 7 bytes (no padding)
```

위험은 다음과 같습니다. ARM은 unaligned access가 bus fault로 이어집니다. packed struct member 접근은 컴파일러가 byte-by-byte로 변환해 느리고 불편합니다.

대안은 명시적 byte buffer와 memcpy를 쓰는 것입니다.

```cpp
uint8_t buffer[7];
uint16_t length;
std::memcpy(&length, buffer + 1, sizeof(length));   // safe
```

## C/C++ 혼합 빌드 패턴

CMake 예시는 다음과 같습니다.

```cmake
project(firmware CXX C ASM)

# C 소스
add_library(hal STATIC
    hal/gpio.c
    hal/uart.c
)
target_compile_options(hal PRIVATE
    -std=c11
)

# C++ 소스
add_library(app STATIC
    app/logger.cpp
    app/state_machine.cpp
)
target_compile_options(app PRIVATE
    -std=c++17
    -fno-exceptions
    -fno-rtti
)

# 링크
add_executable(firmware main.cpp startup.s)
target_link_libraries(firmware PRIVATE app hal)
```

C 코드도 C++ 컴파일러로 컴파일하면 mangling 문제가 사라집니다. 그러나 C 코드의 의미가 약간 달라질 수 있어(예: `void*` 암묵 변환) 보통 분리해서 컴파일합니다.

## 자주 보는 함정과 안티패턴

### 1. 헤더에 `extern "C"` 누락

C에서 include하면 `__cplusplus`가 미정의이므로 `extern "C"`가 무시되어 정상 동작합니다. C++에서 include하면 mangled 이름을 기대하므로 link error가 납니다.

```c
// driver.h — wrong
void init(void);   // C++에서 include하면 _Z4initv 기대
```

모든 C 헤더에 `extern "C"` 블록을 추가합니다.

### 2. C++ class를 C에 직접 노출

```c
// app.c
struct Logger* l;   // C는 class 모름 → 컴파일 에러
```

opaque pointer를 사용합니다.

### 3. 멤버 함수를 C callback으로 사용

```cpp
register_callback(&MyClass::method);   // 컴파일 에러
```

static method나 trampoline으로 우회합니다.

### 4. virtual struct를 C와 공유

vtable이 포함되어 layout이 어긋납니다. POD만 공유합니다.

### 5. packed struct member에 직접 access

ARM에서 unaligned bus fault가 나거나 느린 byte access가 발생합니다. memcpy로 복사한 뒤 사용합니다.

### 6. namespace 안 함수를 `extern "C"`로 선언

```cpp
namespace foo {
    extern "C" void bar();   // ← 의도 모호
}
```

컴파일러마다 동작이 다릅니다. `extern "C"`는 namespace 밖에 둡니다.

## 측정 — name mangling 확인

```bash
# C++ 컴파일 후 심볼 확인
arm-none-eabi-g++ -c logger.cpp -o logger.o
arm-none-eabi-nm logger.o

00000000 T _Z12logger_inititi             # mangled
00000048 T _ZN6Logger3logEPKc            # member function

# extern "C" 적용 후
arm-none-eabi-nm logger.o

00000000 T logger_init                    # C linkage, no mangling
00000048 T _ZN6Logger3logEPKc            # 멤버는 여전히 mangled
```

C 코드에서 link 가능한 심볼은 `extern "C"`로 표시된 것뿐입니다.

## 정리

- C와 C++ 통신은 `extern "C"`와 C-only 헤더 패턴으로 처리합니다.
- 클래스를 C에 노출할 때는 opaque pointer를 사용합니다.
- 멤버 함수 callback은 static trampoline이나 capture-less lambda로 만듭니다.
- 공유 struct는 POD만 사용하고 virtual은 금지합니다.
- padding을 의식해 멤버 순서로 RAM을 절약하며, packed는 bus fault에 주의합니다.

## 관련 항목

- [Part 1-03: 런타임 요구사항](/blog/embedded/embedded-cpp/part1-03-runtime-requirements) — C++ runtime이 C와 통신
- [Part 1-06: 스타트업 코드](/blog/embedded/embedded-cpp/part1-06-startup-code) — startup은 C, application은 C++
- [Part 5-03: Peripheral 추상화](/blog/embedded/embedded-cpp/part5-03-peripheral-abstraction) — C HAL을 C++ class로 wrap

## 다음 글

[Part 1-06: 스타트업 코드](/blog/embedded/embedded-cpp/part1-06-startup-code) — 부트부터 `main`까지의 흐름을 다룹니다. `__libc_init_array`와 C++ static 객체 초기화의 정확한 시점이 핵심입니다.
