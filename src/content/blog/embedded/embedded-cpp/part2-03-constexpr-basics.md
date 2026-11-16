---
title: "constexpr 기초와 임베디드 적용 — 컴파일 타임 계산 활용"
slug: "embedded/embedded-cpp/part2-03-constexpr-basics"
date: 2026-04-29T09:11:00
description: "constexpr 변수와 함수로 상수 평가를 요구하는 위치, CRC 테이블 생성, 런타임 호출의 경계를 확인합니다."
series: "Embedded C++ for Real Systems"
seriesOrder: 11
tags: [cpp, embedded, constexpr, compile-time, optimization, zero-cost]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"런타임에 할 일을 컴파일러에게 시킵니다."** — 코드와 데이터 모두 컴파일 타임으로 옮길 수 있습니다.

## 어떤 문제를 푸는가

런타임 비용은 두 형태로 나타납니다.

1. **CPU 사이클** — 함수 실행 시간
2. **메모리** — 코드와 데이터가 차지하는 공간

상수식이 필요한 문맥에서 `constexpr` 함수의 결과를 계산하면 그 계산을 런타임에 반복할 필요가 없습니다. 결과 객체를 저장하거나 읽는 비용은 별도입니다. 아래 두 버전을 arm-none-eabi-g++ 16.2.0(`-mcpu=cortex-m4 -mthumb`)으로 컴파일해 비교합니다.

```cpp
// 런타임 계산
int factorial(int n) {
    return (n <= 1) ? 1 : n * factorial(n - 1);
}

int x = factorial(10);   // 상수 평가 의무 없음
```

전역 `x`의 초기화를 컴파일러가 미리 계산하는 것은 허용되지만([basic.start.static]/3) 의무가 아닙니다. 위 코드는 `-O0`과 `-Os` 모두에서 `x`가 `.bss` 4바이트에 놓이고 `.init_array` entry 4바이트가 생겼습니다. 즉 [Part 1-06](/blog/embedded/embedded-cpp/part1-06-startup-code)의 `__libc_init_array`가 부팅 때 `factorial(10)`을 실제로 실행합니다.

```cpp
// 컴파일 타임 계산
constexpr int factorial(int n) {
    return (n <= 1) ? 1 : n * factorial(n - 1);
}

constexpr int x = factorial(10);   // 컴파일러가 3628800으로 치환
```

이번에는 `.init_array`가 없고, `x`는 `.rodata`에 `00 5f 37 00`(리틀 엔디안 0x00375F00 = 3628800)으로 들어갔습니다. 측정 파일에는 `x`의 주소를 쓰는 `const int* px = &x;`를 두었습니다. 주소를 쓰는 곳이 없으면 `-Os`에서는 `x`의 저장 공간 자체가 생기지 않습니다. 함수 호출도, 부팅 때의 계산도 남지 않습니다. 같은 파일에 `int y = factorial(10);`처럼 `constexpr`을 붙이지 않은 변수를 둬도 `y`는 `.data`에 3628800으로 들어갔습니다. 초기화식이 상수식이면 상수 초기화가 의무이기 때문입니다([basic.start.static]/2). 함수에 `constexpr`을 붙인 것만으로 부팅 때의 실행이 사라졌습니다.

## `constexpr`이 적용되는 두 곳

1. **변수** — 컴파일 타임 상수
2. **함수** — 컴파일 타임 호출 가능

### constexpr 변수

```cpp
constexpr int kBufferSize = 1024;     // 정수
constexpr float kPi = 3.14159f;        // 실수
constexpr const char* kVersion = "1.2"; // 포인터/문자열

// 컴파일 타임에 계산
constexpr int kEntries = kBufferSize / sizeof(int);
```

`const`와의 차이는 다음과 같습니다.
- `const`는 읽기 전용이라는 의미이며, 값은 컴파일 타임이나 런타임에 결정될 수 있습니다.
- `constexpr`은 컴파일 타임에 값이 알려진다는 강한 보장입니다.

```cpp
int runtime_val = read_register();
const int a = runtime_val;        // OK — const는 runtime 값 가능
constexpr int b = runtime_val;    // ERROR — constexpr은 compile-time 필요
constexpr int c = 42;             // OK
```

### constexpr 함수

```cpp
constexpr int square(int x) {
    return x * x;
}

constexpr int a = square(5);      // 25 — 컴파일 타임
int b = square(read_input());     // 런타임 호출 (compile-time 값 아니므로)
```

`constexpr` 함수는 상황에 따라 컴파일 타임 또는 런타임에 호출됩니다. 상수식이 필요한 문맥은 언어 규칙이 평가를 요구하고, 나머지 문맥의 상수 접기는 최적화 선택입니다.

C++11의 비생성자 `constexpr` 함수 본문에는 단일 return 등 엄격한 제약이 있었습니다. C++14부터는 loop, branch, 변수 등 대부분의 statement를 쓸 수 있습니다.

```cpp
// C++14 — full constexpr
constexpr int factorial(int n) {
    int result = 1;
    for (int i = 2; i <= n; ++i) {
        result *= i;
    }
    return result;
}
```

## 임베디드 — 컴파일 타임 LUT

룩업 테이블을 컴파일러가 자동으로 생성합니다. RAM/Flash 공간은 그대로 쓰지만 런타임 계산은 사라집니다.

```cpp
// <array> 포함, taylor_sin 정의를 이 블록보다 먼저 배치
// Sin 테이블 256 entry
constexpr std::array<float, 256> generate_sin_table() {
    std::array<float, 256> table{};
    for (int i = 0; i < 256; ++i) {
        // 이 예제는 C++17: taylor_sin 정의를 먼저 배치
        float angle = (i * 2.0f * 3.14159f) / 256.0f;
        table[i] = taylor_sin(angle);
    }
    return table;
}

constexpr auto sin_table = generate_sin_table();   // 상수 초기화; 배치는 링커 설정
```

아래 CRC 테이블과 함께 `std::array` 대신 같은 모양의 작은 `Array` 구조체로 바꿔(이 글의 ARM 툴체인에 libstdc++가 없어서) `sin_table`을 읽는 `fast_sin(uint8_t)`과 `compute_crc`를 함께 두고 arm-none-eabi-g++ 16.2.0으로 컴파일하면, `sin_table`과 `crc_table`이 각각 1,024바이트 지역 읽기 전용 심볼(`r`)로 `.rodata`에 놓이고 `.data`·`.bss`·`.init_array`는 0입니다. `.rodata`가 Flash로 가는지는 링커 스크립트가 정합니다([Part 1-07](/blog/embedded/embedded-cpp/part1-07-linker-scripts)). `constexpr`이 정하는 것은 초기화 시점이지 저장 위치가 아닙니다.

측정에 쓴 파일(`lut-arm.cpp`)과 명령입니다.

```cpp
#include <stdint.h>
#include <stddef.h>
template <class T, size_t N> struct Array {   // std::array 대용 (이 툴체인에 <array> 없음)
    T v[N];
    constexpr T& operator[](size_t i) { return v[i]; }
    constexpr const T& operator[](size_t i) const { return v[i]; }
};
constexpr float taylor_sin(float x) {
    constexpr float pi = 3.14159265358979323846f;
    while (x > pi) x -= 2 * pi;
    while (x < -pi) x += 2 * pi;
    float result = x, term = x;
    for (int n = 1; n < 7; ++n) { term *= -x * x / ((2 * n) * (2 * n + 1)); result += term; }
    return result;
}
constexpr Array<float, 256> generate_sin_table() {
    Array<float, 256> table{};
    for (int i = 0; i < 256; ++i) table[i] = taylor_sin((i * 2.0f * 3.14159f) / 256.0f);
    return table;
}
constexpr auto sin_table = generate_sin_table();
constexpr Array<uint32_t, 256> generate_crc_table() {
    Array<uint32_t, 256> table{};
    for (uint32_t i = 0; i < 256; ++i) {
        uint32_t crc = i;
        for (int j = 0; j < 8; ++j) crc = (crc & 1) ? (crc >> 1) ^ 0xEDB88320u : crc >> 1;
        table[i] = crc;
    }
    return table;
}
constexpr auto crc_table = generate_crc_table();
uint32_t compute_crc(const uint8_t* data, size_t len) {
    uint32_t crc = 0xFFFFFFFF;
    for (size_t i = 0; i < len; ++i) crc = (crc >> 8) ^ crc_table[(crc ^ data[i]) & 0xFF];
    return ~crc;
}
float fast_sin(uint8_t idx) { return sin_table[idx]; }
```

```bash
arm-none-eabi-g++ -std=c++17 -mcpu=cortex-m4 -mthumb -mfloat-abi=hard -mfpu=fpv4-sp-d16 -Os -ffreestanding -fno-exceptions -c lut-arm.cpp -o lut.o
arm-none-eabi-size -A lut.o
arm-none-eabi-nm -S -C lut.o
```

### Taylor series로 컴파일 타임 sin

```cpp
constexpr float taylor_sin(float x) {
    constexpr float pi = 3.14159265358979323846f;
    while (x > pi) x -= 2 * pi;
    while (x < -pi) x += 2 * pi;
    float result = x;
    float term = x;
    for (int n = 1; n < 7; ++n) {
        term *= -x * x / ((2 * n) * (2 * n + 1));
        result += term;
    }
    return result;
}
```

C++17/20의 표준 `sin`/`cos`는 `constexpr` 함수가 아닙니다. 그래서 직접 근사 함수를 씁니다. 아래 검증 예제는 범위를 축소한 Taylor 근사를 표준 수학 함수와 256개 각도에서 비교합니다.

## 임베디드 — 컴파일 타임 CRC

CRC 테이블 생성은 임베디드의 단골 작업입니다. `constexpr`로 컴파일 타임에 만들어 둘 수 있습니다.

```cpp
constexpr std::array<uint32_t, 256> generate_crc_table() {
    std::array<uint32_t, 256> table{};
    constexpr uint32_t poly = 0xEDB88320;
    for (uint32_t i = 0; i < 256; ++i) {
        uint32_t crc = i;
        for (int j = 0; j < 8; ++j) {
            crc = (crc & 1) ? (crc >> 1) ^ poly : crc >> 1;
        }
        table[i] = crc;
    }
    return table;
}

constexpr auto crc_table = generate_crc_table();

uint32_t compute_crc(const uint8_t* data, size_t len) {
    uint32_t crc = 0xFFFFFFFF;
    for (size_t i = 0; i < len; ++i) {
        crc = (crc >> 8) ^ crc_table[(crc ^ data[i]) & 0xFF];
    }
    return ~crc;
}
```

위에서 본 대로 `crc_table`은 `.rodata` 1,024바이트이고, `compute_crc`는 40바이트였습니다. C에서 스크립트로 미리 생성해 붙인 `const uint32_t crc_table[256] = {...}`도 같은 1,024바이트 `.rodata`가 됩니다. `constexpr`의 이득은 저장 공간이 아니라, 생성 스크립트 없이 다항식 하나만 바꾸면 테이블이 같이 바뀐다는 점입니다.

## 임베디드 — 컴파일 타임 register 주소

여러 peripheral의 register 주소는 컴파일 타임 상수로 알 수 있습니다. 함수로 계산해 둡니다.

```cpp
constexpr uintptr_t gpio_base(int port) {
    return 0x40020000 + port * 0x400;   // STM32 GPIOA, GPIOB, ...
}

constexpr uintptr_t kGpioAOdrAddr = gpio_base(0) + 0x14;
constexpr uintptr_t kGpioBOdrAddr = gpio_base(1) + 0x14;

#define GPIOA_ODR (*reinterpret_cast<volatile uint32_t*>(kGpioAOdrAddr))
```

매크로 대신 컴파일 타임 함수와 상수를 씁니다. 타입 안전성과 디버깅 가능성을 함께 얻습니다.

## `if constexpr` (C++17)

컴파일 타임 분기입니다. 선택되지 않은 분기는 컴파일러가 제거합니다.

```cpp
template<typename T>
void serialize(uint8_t* buf, T value) {
    if constexpr (sizeof(T) == 1) {
        buf[0] = value;
    } else if constexpr (sizeof(T) == 2) {
        buf[0] = value >> 8;
        buf[1] = value & 0xFF;
    } else if constexpr (sizeof(T) == 4) {
        buf[0] = value >> 24;
        buf[1] = (value >> 16) & 0xFF;
        buf[2] = (value >> 8) & 0xFF;
        buf[3] = value & 0xFF;
    }
}

// 사용
uint8_t buf[4];
serialize(buf, uint16_t(0x1234));   // 2바이트 분기만 컴파일됨
```

`sizeof(T)`가 컴파일 타임에 알려지므로 선택되지 않은 분기의 코드가 제거됩니다.

템플릿에서 `if constexpr`의 선택되지 않은 종속 분기는 인스턴스화하지 않습니다([stmt.if]/2). 이 예에서는 코드 크기 차이가 없었습니다. `put16`·`put32` 두 인스턴스를 `if constexpr`와 일반 `if`로 각각 컴파일하면 arm-none-eabi-g++ 16.2.0에서 `arm-none-eabi-size`의 text 열(`.ARM.exidx` 포함)이 `-O0` 196바이트, `-Os` 40바이트(`.text*` 섹션만은 164·24바이트)로 네 경우가 모두 같았습니다. GCC는 조건이 상수인 일반 `if`의 죽은 분기도 `-O0`에서 지웠습니다. `if constexpr`가 필요해지는 때는 버려질 분기가 그 타입으로는 컴파일되지 않을 때입니다(예: `T`가 구조체라 `value >> 8`이 성립하지 않는 경우). 이 serializer는 지원하는 unsigned 정수 폭과 버퍼 길이를 별도로 제한해야 합니다.

## `static_assert` + `constexpr`로 컴파일 타임 검증

```cpp
constexpr int kMaxBufferSize = 4096;
constexpr int kSlotCount = 16;

static_assert(kMaxBufferSize % kSlotCount == 0,
              "Buffer size must be divisible by slot count");

constexpr int kSlotSize = kMaxBufferSize / kSlotCount;
```

잘못된 설정은 컴파일 실패로 이어집니다. 런타임에 발견되지 않습니다.

## 상수 평가의 경계

C++20의 상수 평가 안에서는 임시 동적 할당을 사용할 수 있지만, 같은 평가 안에서 해제해야 합니다. `new int(42)`를 반환하는 함수 선언 자체가 허용되는 것과, 그 포인터를 `constexpr` 객체에 영구 보존하는 것은 다릅니다. 실제 평가 경로에서 비상수 함수·I/O·`reinterpret_cast` 등을 실행할 수 없으며, `throw` 경로도 C++17/20 상수식이 될 수 없습니다.

상수 평가에는 컴파일러별 한도가 있습니다. 아래 [함정 3](#3-큰-constexpr-lut으로-컴파일-시간-폭증)에서 백만 개짜리 테이블이 두 컴파일러에서 각각 어떤 한도에 걸리는지 봅니다.

## consteval — 컴파일 타임 강제 (C++20)

`constexpr`은 상황에 따라 런타임 호출도 허용하지만, `consteval`은 컴파일 타임을 강제합니다.

```cpp
consteval int square(int x) {
    return x * x;
}

constexpr int a = square(5);     // OK — 컴파일 타임
int b = square(read_input());    // ERROR — 런타임 인자 불가
```

런타임 호출을 원천 차단합니다. 자세한 내용은 [Part 2-05](/blog/embedded/embedded-cpp/part2-05-consteval-constinit)에서 다룹니다.

## constinit — 정적 초기화 강제 (C++20)

static 객체의 초기화 시점을 보장합니다.

```cpp
constexpr int compute_initial() { return 0; }
constinit int counter = compute_initial();   // 컴파일 타임에 초기화

// 컴파일 에러 — runtime 초기화 시도
constinit int x = read_register();
```

[Part 1-06 — Static Initialization Order Fiasco](/blog/embedded/embedded-cpp/part1-06-startup-code)를 관련 변수의 동적 초기화를 거부하는 기능입니다. 다른 전역 객체의 초기화·사용 순서까지 모두 해결하지는 않습니다.

## 자주 보는 함정과 안티패턴

### 1. const ≠ constexpr
```cpp
const int n = read();     // OK, but not compile-time
int arr[n];               // C VLA — 표준 C++ 아님 (GCC·Clang 확장)

constexpr int n = 100;
int arr[n];               // OK — 컴파일 타임 크기
```

VLA는 GCC와 Clang 모두 확장으로 받아들입니다. g++-16은 `-pedantic`을 줘야 `ISO C++ forbids variable length array 'arr' [-Wvla]`를 내고, Clang 23.1.5는 플래그 없이도 `variable length arrays in C++ are a Clang extension [-Wvla-cxx-extension]`을 냈습니다.

### 2. 상수 평가에서 비상수 함수 호출

함수 선언의 `constexpr`와 개별 호출의 상수식 여부를 구분합니다. `constexpr double s = std::sin(1.0);`은 컴파일러에 따라 갈립니다. g++-16은 `-std=c++17 -pedantic`에서도 받아들였고(GCC가 `sin`을 내장 함수로 상수 접기 하는 확장), Clang 23.1.5는 `error: constexpr variable 's' must be initialized by a constant expression`과 `note: non-constexpr function 'sin' cannot be used in a constant expression`으로 거부했습니다. GCC에서 통과했다고 이식 가능한 코드가 아닙니다.

### 3. 큰 constexpr LUT으로 컴파일 시간 폭증
```cpp
constexpr auto huge = generate_table<1000000>();   // 원소 100만 개
```

`int` 100만 개를 루프로 채우는 `generate_table<1000000>()`을 두 컴파일러에 넣으면 둘 다 거부합니다.

```text
# g++-16 -std=c++17
error: 'constexpr' loop iteration count exceeds limit of 262144 (use '-fconstexpr-loop-limit=' to increase the limit)

# Clang 23.1.5 -std=c++17
error: constexpr variable 'huge' must be initialized by a constant expression
note: constexpr evaluation hit maximum step limit; possible infinite loop?
```

GCC는 루프 반복 한도(262,144)에서, Clang은 평가 단계 한도에서 멈췄습니다. 한도를 올리면 통과하지만 그만큼 컴파일 시간이 늘어납니다. 필요한 해상도·Flash 예산으로 크기를 먼저 정합니다.

### 4. 컴파일러가 constexpr을 적용하지 못함
```cpp
constexpr int f(int x) { /* */ }
int y = f(some_var);   // 상수 평가 의무가 없는 호출
```
`constexpr auto y = f(...);`처럼 상수식을 요구하는 선언으로 받으면 조건을 만족하지 않는 호출을 컴파일러가 거부합니다.

### 5. mutable과 상수식

C++14부터 `constexpr` 멤버 함수가 암묵적으로 `const`가 아니게 되어 객체를 수정하는 `constexpr` 멤버 함수를 쓸 수 있습니다([Part 1-08](/blog/embedded/embedded-cpp/part1-08-cpp-standard-choice#c14--작은-개선)). 그렇다고 상수 평가 밖에서 만든 객체를 상수 평가 안에서 고칠 수는 없습니다. 상수식은 그 평가 안에서 수명이 시작된 객체만 수정할 수 있습니다([expr.const]).

## 작은 예제 — CRC 기준값과 sin 오차

정규화한 sin 근사를 256개 각도에서 표준 런타임 함수와 비교하고, CRC-32/ISO-HDLC의 `123456789` 기준값을 확인합니다.

```cpp title="constexpr-check.cpp"
#include <array>
#include <cassert>
#include <cmath>
#include <cstdint>
constexpr double pi = 3.14159265358979323846;
constexpr double sine(double x) {
    while (x > pi) x -= 2 * pi;
    while (x < -pi) x += 2 * pi;
    double result = x, term = x;
    for (int n = 1; n < 10; ++n) {
        term *= -x*x / ((2*n)*(2*n+1)); result += term;
    }
    return result;
}
constexpr auto crc_table() {
    std::array<std::uint32_t, 256> a{};
    for (std::uint32_t i=0; i<256; ++i) {
        auto c=i;
        for (int j=0; j<8; ++j) c=(c&1) ? (c>>1)^0xedb88320u : c>>1;
        a[i]=c;
    }
    return a;
}
constexpr auto table = crc_table();
constexpr std::uint32_t crc(const char* p) {
    std::uint32_t c=0xffffffffu;
    while (*p) c=(c>>8)^table[(c^static_cast<unsigned char>(*p++))&255];
    return ~c;
}
static_assert(crc("123456789") == 0xcbf43926u);
int main() {
    for (int i=0; i<256; ++i) {
        double x=2*pi*i/256;
        assert(std::abs(sine(x)-std::sin(x)) < 1e-8);
    }
}
```

Homebrew Clang 23.1.5와 g++-16, arm64 macOS에서 `clang++ -std=c++17 -Wall -Wextra -pedantic-errors constexpr-check.cpp -o constexpr-check && ./constexpr-check`가 경고 없이 exit 0이었습니다. 이는 해당 256개 표본의 오차 한계(1e-8)이며 임의 입력 전체의 수치 보장은 아닙니다.

상수식의 제약은 [C++20 초안 N4861의 expr.const](https://timsong-cpp.github.io/cppwp/n4861/expr.const)를 기준으로 합니다. 보드의 Flash/RAM 사용량과 부팅 시간은 이 호스트 실행으로 확인하지 않았습니다.

## 정리

- `constexpr`은 컴파일 타임에 값이 정해지는 변수와 함수에 모두 적용됩니다.
- LUT와 CRC 테이블을 상수 초기화할 수 있으며 저장 위치는 링커 배치로 확인합니다.
- `if constexpr`은 버려진 분기를 인스턴스화하지 않는 컴파일 타임 분기입니다. 상수 조건의 일반 `if`도 GCC에서는 같은 크기의 코드가 나왔으므로, 이 키워드의 가치는 코드 크기보다 컴파일 가능성에 있습니다.
- C++14 이후 대부분의 statement가 `constexpr` 가능하며, C++20에서는 new와 virtual까지 완화됐습니다.
- `consteval` (C++20)은 런타임 호출을 차단하고, `constinit`은 static 초기화를 강제합니다.

## 관련 항목

- [Part 2-04: constexpr 고급](/blog/embedded/embedded-cpp/part2-04-constexpr-advanced) — 복잡한 컴파일 타임 알고리즘
- [Part 2-05: consteval과 constinit](/blog/embedded/embedded-cpp/part2-05-consteval-constinit) — C++20 추가 키워드
- [Part 1-07: 링커 스크립트](/blog/embedded/embedded-cpp/part1-07-linker-scripts) — `.rodata` 배치
- [Part 5-01: Register 추상화](/blog/embedded/embedded-cpp/part5-01-register-abstraction) — constexpr 주소

## 다음 글

[Part 2-04: constexpr 고급](/blog/embedded/embedded-cpp/part2-04-constexpr-advanced) — 컴파일 타임 sort, search, 문자열 처리를 다룹니다. `constexpr` 알고리즘의 한계와 가능성을 함께 살펴봅니다.
