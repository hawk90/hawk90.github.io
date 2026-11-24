---
title: "C++ ABI 호환성 — Itanium ABI·name mangling·vtable 레이아웃"
slug: "embedded/embedded-cpp/part1-05-abi-compatibility"
date: 2026-04-28T09:05:00
description: "C와 C++가 한 바이너리에서 살아남는 법 — name mangling, extern \"C\", calling convention, struct layout."
series: "Embedded C++ for Real Systems"
seriesOrder: 5
tags: [cpp, c, embedded, abi, name-mangling, extern-c, calling-convention]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **C/C++ 경계는 이름, 호출 규약, 데이터 배치와 수명 계약을 함께 맞춥니다.** `extern "C"`는 언어 linkage를 지정하며, 메모리 할당·해제와 실패 전달 방식까지 해결하지는 않습니다.

## 어떤 문제를 푸는가

C++로 쓰는 임베디드 프로젝트에도 C가 섞입니다. 벤더가 제공하는 HAL(STM32Cube HAL 등)은 C이고 애플리케이션은 C++인 경우입니다. 또는 legacy C 코드베이스에 C++ 신규 모듈을 얹기도 합니다.

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

컴파일러가 함수 시그니처 정보를 심볼 이름에 인코딩합니다. 이것이 name mangling입니다(이 글의 ELF 예시는 Itanium C++ ABI 계열입니다). MSVC ABI 등 다른 대상까지 같은 이름이나 vtable 배치를 보장하지 않습니다.

```text
# 원래 이름                         # mangled
int add(int, int)                    _Z3addii
double add(double, double)           _Z3adddd
namespace foo { int bar(int); }      _ZN3foo3barEi
class C { void m(int); }             _ZN1C1mEi
```

오른쪽 열은 네 함수를 정의해 arm-none-eabi-g++ 16.2.0으로 컴파일한 오브젝트의 `arm-none-eabi-nm` 출력 그대로입니다. 같은 파일의 `extern "C" int add_c(int, int)`는 `add_c`로 나왔습니다. `nm`에서 보이는 길고 이상한 이름이 이것이고, `nm --demangle`로 원래 이름을 복원합니다.

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

`extern "C"`는 이름과 함수 타입에 C language linkage를 지정합니다. 심볼 표기와 호출 규약의 구체적인 효과는 대상 구현의 C ABI가 정합니다. 같은 `abi_add`가 ARM ELF에서는 `abi_add`이지만, macOS의 Mach-O에서는 C 심볼에 선행 밑줄이 붙어 링커가 `_abi_add`를 찾습니다(아래 [재현](#재현--cc-링크와-심볼-경계) 절의 링크 에러). `extern "C"`는 ARM의 hard/soft-float 옵션이나 구조체 packing 불일치를 맞춰 주지 않습니다.

`extern "C"`로 감쌀 수 있는 것은 다음과 같습니다.

- 함수 선언 또는 정의
- 변수 선언

감쌀 수 없는 것은 다음과 같습니다.

- 클래스 정의를 블록 안에 놓을 수는 있지만 멤버 함수와 멤버 이름의 C++ linkage는 바뀌지 않습니다
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

#include <stddef.h>

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

STMicroelectronics의 `stm32f4xx_hal.h`도 24번째 줄에서 이 블록을 열고 291번째 줄에서 닫습니다(GitHub `stm32f4xx-hal-driver` master).

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
#include "logger.h"
#include <new>
class LoggerImpl {
public:
    LoggerImpl(int level) : level_(level) {}
    void log(const char* msg) { /* */ }
private:
    int level_;
};

extern "C" {

Logger* logger_create(int level) {
    return reinterpret_cast<Logger*>(new (std::nothrow) LoggerImpl(level));
}

void logger_destroy(Logger* l) {
    delete reinterpret_cast<LoggerImpl*>(l);
}

void logger_log(Logger* l, const char* msg) {
    if (l && msg) reinterpret_cast<LoggerImpl*>(l)->log(msg);
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

C 코드는 Logger의 내부를 모릅니다. 불투명한 핸들만 다룹니다. C++ 구현은 핸들 계약을 지키며 바꿀 수 있습니다. 위 생성자는 실패 시 null을 반환하고, 이 예시의 생성자와 log 본문은 예외를 던지지 않습니다. 실제 구현이 예외를 던진다면 wrapper에서 잡아 오류 코드로 바꿔야 합니다. create로 만든 핸들은 같은 모듈의 destroy로 한 번만 해제합니다.

## C 콜백을 C++가 받기

C 라이브러리의 콜백 선언도 함수 타입과 언어 linkage를 맞춰야 합니다. 아래 typedef가 실제 C 헤더에서 `extern "C"` 안에 선언된 상황을 가정합니다.

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
// 표준상 C linkage 함수 타입과 다름: static 멤버 + this 캐시
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
// 표준상 C linkage 함수 타입과 다름: capture 없는 lambda
register_callback([](int event) {
    // capture 없는 lambda는 함수 포인터로 변환 가능합니다
});
```

static 멤버와 capture 없는 lambda의 변환 결과는 C++ linkage 함수입니다. 표준은 "언어 linkage가 다른 두 함수 타입은 다른 점이 없어도 서로 다른 타입"이라고 정합니다([dcl.link]/1). 그런데 `callback_t`를 `extern "C"` 블록 안에 선언한 헤더로 두 호출을 컴파일하면 g++-16과 Clang 23.1.5 모두 `-Wall -Wextra -pedantic`에서 경고 없이 받아들입니다. 두 컴파일러가 이 타입 구분을 구현하지 않기 때문입니다. 이식 가능한 경계에는 첫 예처럼 명시적인 `extern "C"` free function을 둡니다. capture 있는 lambda는 일반 함수 포인터로 변환할 수 없습니다. 그런 경우에는 `user_data` 포인터 인자가 있는 C API를 쓰거나 trampoline 패턴을 사용합니다.

등록된 callback의 대상은 마지막 호출이 끝날 때까지 살아 있어야 합니다. 위 static 대상은 종료 시점을 제외하면 수명이 유지되지만, instance를 바꾸거나 대상을 해제하는 구현에는 등록 해제와 실행 중 호출의 종료를 기다리는 절차가 필요합니다. 포인터를 null로 바꾸는 것만으로 이미 진입한 호출과의 race가 해결되지는 않습니다.

## Calling Convention — ARM 예시

함수 호출 시 인자가 어디로 전달되는지, 반환값이 어디로 가는지, 어느 레지스터를 보존하는지를 정한 규약입니다.

ARM AAPCS(ARM Architecture Procedure Call Standard)의 규칙은 다음과 같습니다.

- r0-r3: 기본 규약의 argument word 전달에 사용합니다. 64-bit 값·정렬·복합 인자·숨은 반환 포인터 때문에 첫 네 인자와 단순 일대일 대응하지는 않습니다.
- r0-r1: 반환값(64-bit는 r0-r1, 작으면 r0)
- r4-r8, r10-r11과 sp: callee-saved. r9의 역할과 보존 의무는 플랫폼 변형을 확인합니다
- r12(ip): scratch
- r13(sp): stack pointer
- r14(lr): link register(반환 주소)
- r15(pc): program counter

FPU 존재와 인자 전달 규약은 별개입니다. `-mfloat-abi=hard`의 AAPCS-VFP에서는 적격 float 인자를 VFP 인자 레지스터로 전달하며, `soft`/`softfp`는 기본 규약을 사용합니다. 가변 인자 함수 등에는 예외가 있으므로 서로 다른 float ABI 오브젝트를 섞지 않습니다.

`int add(int a, int b)`를 arm-none-eabi-g++ 16.2.0(`-mcpu=cortex-m4 -mthumb -Os`)으로 컴파일한 결과입니다.

```text
00000000 <_Z3addii>:
   0:	add	r0, r1
   2:	bx	lr
```

아래처럼 int를 반환하는 단순 비정적 멤버 함수는 this를 r0, int 인자를 r1에 받습니다. 복합 반환값의 숨은 인자와 가변 인자·VFP 규약은 별도로 확인합니다.

```cpp
class Counter {
public:
    int add(int x);
private:
    int value;
};
int Counter::add(int x) { return value + x; }
```

같은 컴파일러의 결과입니다. `r0`로 받은 `this`에서 `value`를 읽고, `x`는 `r1`에 있습니다.

```text
00000010 <_ZN7Counter3addEi>:
  10:	ldr	r0, [r0, #0]
  12:	add	r0, r1
  14:	bx	lr
```

이 암묵 `this`가 C에서 멤버 함수를 직접 부를 수 없는 이유입니다.

## struct Layout — C와 C++의 차이

공유 C 호환 헤더를 같은 대상 ABI·정렬·packing 옵션으로 컴파일해야 합니다. 단순 구조체라도 C++ 타입 특성만으로 임의의 C 컴파일러, 다른 CPU, 네트워크 wire format과의 배치 일치를 보장하지 않습니다.

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
// arm-none-eabi (Cortex-M4): sizeof 12, alignof 4 (vptr 4 + int 2개)
// aarch64 macOS (g++-16):    sizeof 16, alignof 8 (vptr 8 + int 2개)
```

Itanium ABI의 vtable에는 함수 entry 외에도 offset-to-top과 RTTI pointer가 있으며, 객체의 vptr는 표의 address point를 가리킵니다. 표의 시작 주소와 vptr 값이 항상 같다고 가정하면 안 됩니다.

단순한 위 클래스의 Itanium 계열 배치에서는 vtable 포인터(`vptr`)가 앞에 놓입니다. 다중·가상 상속은 추가 vptr과 조정 정보를 가질 수 있으므로 이 그림을 일반 규칙으로 쓰면 안 됩니다. C에서 이 struct를 다루면 offset이 어긋납니다. C와 통신할 struct에는 virtual 함수를 금지합니다.

### 공유 구조체를 검사하는 패턴

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

이 세 `static_assert`는 호스트 g++-16에서 그대로 통과했습니다. 이 글의 arm-none-eabi-g++ 16.2.0에는 `<type_traits>`가 없어, ARM 쪽에서는 `sizeof(Packet) == 264`와 같은 trait의 컴파일러 builtin(`__is_standard_layout`, `__is_trivially_copyable`)으로 확인했습니다.

`std::is_standard_layout_v`는 C++의 standard-layout 조건을 검사합니다. C 쪽과의 실제 일치는 양쪽의 `sizeof`, `_Alignof`/`alignof`, `offsetof`와 빌드 옵션을 대조해야 합니다.
`std::is_trivially_copyable_v`는 `memcpy`로 복사 가능한지를 확인합니다.

이 static_assert는 일부 회귀를 잡습니다. 직렬화에는 padding을 포함한 객체 표현을 그대로 쓰지 말고 endian·field encoding을 별도로 정합니다.

## Padding과 Alignment

C struct의 member 간 padding은 alignment 요구에 따라 결정됩니다.

```cpp
struct Bad {
    char  a;     // offset 0
    int   b;     // offset 4 (3 bytes padding)
    char  c;     // offset 8
    int   d;     // offset 12 (3 bytes padding)
};
// total: 16 bytes (6 bytes padding)

struct Good {
    int   b;     // offset 0
    int   d;     // offset 4
    char  a;     // offset 8
    char  c;     // offset 9
    // 2 bytes tail padding
};
// total: 12 bytes
```

두 크기는 Cortex-M4와 aarch64 호스트에서 `static_assert`로 확인했습니다. member 순서만 바꿔 4바이트를 줄였습니다. 정렬 요구가 큰 member를 앞으로 모으면 padding이 줄어듭니다. 이미 공개된 ABI나 wire format의 member 순서는 크기를 줄이려고 임의로 바꾸지 않습니다.

`-Wpadded`를 켜면 GCC가 padding을 넣는 자리마다 경고합니다. 위 두 구조체에 대한 arm-none-eabi-g++ 16.2.0의 경고입니다.

```text
m.cpp:12:26: warning: padding struct to align 'Bad::b' [-Wpadded]
m.cpp:12:41: warning: padding struct to align 'Bad::d' [-Wpadded]
m.cpp:13:8: warning: padding struct size to alignment boundary with 2 bytes [-Wpadded]
```

`Good`도 끝의 tail padding 2바이트 때문에 경고가 하나 남습니다.

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

`sizeof(NetworkHeader) == 7`은 Cortex-M4와 호스트에서 확인했습니다. 위험은 member 주소를 일반 포인터로 꺼낼 때 생깁니다. 컴파일러는 `h.length`를 직접 읽을 때는 정렬되지 않은 위치임을 알고 코드를 만들지만, `uint16_t*`로 꺼낸 뒤에는 그 정보가 사라집니다. GCC는 이 지점을 경고합니다.

```text
m.cpp:23:46: warning: taking address of packed member of 'NetworkHeader' may result in an unaligned pointer value [-Waddress-of-packed-member]
   23 | uint16_t* len_ptr(NetworkHeader& h) { return &h.length; }
```

packed는 endian 변환이나 MMIO 접근 폭도 정하지 않습니다.

대안은 명시적 byte buffer와 memcpy를 쓰는 것입니다.

```cpp
uint8_t buffer[7];
uint16_t length;
std::memcpy(&length, buffer + 1, sizeof(length));   // 일반 메모리의 정렬 문제 회피
// wire endian이 host와 다르면 별도로 변환
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

C 소스를 C++로 다시 컴파일하면 C++ linkage 규칙을 따르므로, 기존 C 오브젝트와의 ABI 경계가 사라지지 않고 오히려 이름이 바뀝니다. C와 C++는 언어 규칙도 다릅니다. `int* p = malloc(4);`는 C에서 맞지만 C++에서는 `void*`의 암묵 변환이 없어 컴파일 오류입니다. 그래서 위 예처럼 C 소스는 C 컴파일러로 따로 컴파일합니다.

## 자주 보는 함정과 안티패턴

### 1. 헤더에 `extern "C"` 누락

헤더의 조건부 linkage 블록이 빠져 있어도 C는 원래 C linkage로 선언합니다. C++에서 읽으면 기본 C++ linkage를 기대하므로, C로 빌드한 구현의 이름과 달라져 link error가 납니다. 아래 재현 절의 `BAD_LINKAGE` 빌드가 방향만 반대인 같은 실패입니다.

```c
// driver.h — wrong
void init(void);   // C++에서 include하면 _Z4initv 기대
```

모든 C 헤더에 `extern "C"` 블록을 추가합니다.

### 2. C++ class를 C에 직접 노출

```c
// app.c
struct Logger* l;   // OK: 불완전 타입 포인터
// struct Logger value;  // Bad: 정의가 없으면 객체 크기를 알 수 없음
```

위 포인터 선언 자체는 올바른 opaque pointer 패턴입니다. C++ class 정의를 C 컴파일러가 파싱하거나 불완전 타입의 객체를 값으로 만들 때 오류가 납니다.

### 3. 멤버 함수를 C callback으로 사용

```cpp
register_callback(&MyClass::method);   // 컴파일 에러
```

static method나 trampoline으로 우회합니다.

### 4. virtual struct를 C와 공유

vptr 등 C++ ABI 요소가 포함됩니다. 공유 C 헤더의 단순 구조체와 검증한 target ABI만 경계로 사용합니다.

### 5. packed struct member에 직접 access

일반 정렬 포인터로 packed member 주소를 넘기면 정렬 계약을 위반할 수 있습니다. 일반 메모리는 memcpy로 복사하고, MMIO는 장치가 허용하는 폭과 정렬을 따릅니다.

### 6. namespace 안 함수를 `extern "C"`로 선언

```cpp
namespace foo {
    extern "C" void bar();   // ← 의도 모호
}
```

namespace 안의 C linkage 선언은 표준에 정의되어 있습니다. `foo::bar`라는 C++ 이름 검색 경로는 있어도 C 심볼이 namespace별로 분리되는 것은 아닙니다. 서로 다른 namespace에서 같은 C linkage 이름을 충돌시키지 않도록 공용 C 헤더에서 한 번 선언합니다.

## 재현 — C/C++ 링크와 심볼 경계

다음 두 파일을 각각 C11, C++17로 컴파일합니다. Apple Silicon의 Homebrew Clang 23.1.5에서 host 링크·실행을 하고, ELF 심볼 표기는 `--target=arm-none-eabi -mcpu=cortex-m4 -mthumb` 오브젝트로 확인했습니다.

```c title="abi-caller.c"
#include <stddef.h>
struct Logger;
extern int abi_add(int, int);
int main(void) { return abi_add(20, 22) == 42 ? 0 : 1; }
```

```cpp title="abi-library.cpp"
#ifdef BAD_LINKAGE
int abi_add(int a, int b) { return a + b; }
#else
extern "C" int abi_add(int a, int b) { return a + b; }
#endif
namespace diagnostics { extern "C" int abi_probe() { return 7; } }
int overloaded(int value) { return value; }
int overloaded(double value) { return static_cast<int>(value); }
```

```bash
clang -std=c11 -c abi-caller.c -o caller.o
clang++ -std=c++17 -c abi-library.cpp -o library.o
clang++ caller.o library.o -o abi-check
./abi-check
clang++ --target=arm-none-eabi -mcpu=cortex-m4 -mthumb -std=c++17 -c abi-library.cpp -o arm.o
llvm-nm arm.o
```

정상 프로그램은 exit 0으로 끝났습니다. `llvm-nm arm.o`의 출력입니다.

```text
00000020 T _Z10overloadedd
00000014 T _Z10overloadedi
         U __aeabi_d2iz
00000000 T abi_add
00000010 T abi_probe
```

C linkage의 `abi_add`·`abi_probe`와 C++의 `_Z10overloadedi`·`_Z10overloadedd`가 함께 있습니다. `namespace diagnostics` 안에서 정의한 `abi_probe`도 namespace가 없는 C 심볼이 됐습니다. `double`을 `int`로 바꾸는 `static_cast`는 libgcc/compiler-rt의 `__aeabi_d2iz` 호출이 됐습니다. 이 빌드는 float ABI를 지정하지 않아 soft-float이지만, `-mfloat-abi=hard -mfpu=fpv4-sp-d16`을 줘도 같은 호출이 남았습니다. Cortex-M4의 FPU는 단정밀도만 다루기 때문입니다. `-DBAD_LINKAGE`로 라이브러리를 다시 컴파일해 링크하면 macOS 링커가 이렇게 멈춥니다.

```text
Undefined symbols for architecture arm64:
  "_abi_add", referenced from:
      _main in caller.o
ld: symbol(s) not found for architecture arm64
```

## 1차 자료

- [C++ draft: language linkage](https://eel.is/c++draft/dcl.link) — 언어 linkage와 namespace 규칙
- [Itanium C++ ABI: data layout·vtable·mangling](https://itanium-cxx-abi.github.io/cxx-abi/abi.html) — 이 글의 ELF 설명 범위
- [Arm AAPCS32](https://github.com/ARM-software/abi-aa/blob/main/aapcs32/aapcs32.rst) — 기본 인자 전달과 VFP 변형

## 정리

- C와 C++ 통신은 `extern "C"`와 C-only 헤더 패턴으로 처리합니다.
- 클래스를 C에 노출할 때는 opaque pointer와 생성·해제·실패 계약을 사용합니다.
- C callback은 user_data와 명시적 C linkage free-function wrapper를 우선 사용합니다.
- 공유 struct는 C 호환 선언과 target ABI를 맞추고 크기·정렬·offset을 양쪽에서 검사합니다.
- padding을 의식해 멤버 순서로 RAM을 절약하며(`Bad` 16 → `Good` 12바이트), packed member의 주소는 일반 포인터로 꺼내지 않습니다.

## 관련 항목

- [Part 1-03: 런타임 요구사항](/blog/embedded/embedded-cpp/part1-03-runtime-requirements) — C++ runtime이 C와 통신
- [Part 1-06: 스타트업 코드](/blog/embedded/embedded-cpp/part1-06-startup-code) — startup은 C, application은 C++
- [Part 5-03: Peripheral 추상화](/blog/embedded/embedded-cpp/part5-03-peripheral-abstraction) — C HAL을 C++ class로 wrap

## 다음 글

[Part 1-06: 스타트업 코드](/blog/embedded/embedded-cpp/part1-06-startup-code) — 부트부터 `main`까지의 흐름을 다룹니다. `__libc_init_array`와 C++ static 객체 초기화의 정확한 시점이 핵심입니다.
