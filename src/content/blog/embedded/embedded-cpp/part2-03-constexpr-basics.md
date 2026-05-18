---
title: "Part 2-03: constexpr 기초"
date: 2026-05-14T03:00:00
description: "컴파일 타임 계산 — 런타임 코드와 데이터를 컴파일러가 미리 만들어줍니다. -Os보다 강력한 zero-cost."
series: "Embedded C++ for Real Systems"
seriesOrder: 11
tags: [cpp, embedded, constexpr, compile-time, optimization, zero-cost]
type: tech
---

## 한 줄 요약

> **"런타임에 할 일을 컴파일러에게 시킵니다."** — 코드와 데이터 모두 컴파일 타임으로 옮길 수 있습니다.

## 어떤 문제를 푸는가

런타임 비용은 두 형태로 나타납니다.

1. **CPU 사이클** — 함수 실행 시간
2. **메모리** — 코드와 데이터가 차지하는 공간

`constexpr`은 컴파일 타임에 결과를 계산해 runtime cost를 0으로 만들어 줍니다.

```cpp
// 런타임 계산
int factorial(int n) {
    return (n <= 1) ? 1 : n * factorial(n - 1);
}

int x = factorial(10);   // runtime에 계산
```

```cpp
// 컴파일 타임 계산
constexpr int factorial(int n) {
    return (n <= 1) ? 1 : n * factorial(n - 1);
}

constexpr int x = factorial(10);   // 컴파일러가 3628800으로 치환
```

어셈블리에서 `x`는 그냥 상수 3628800이 됩니다. 함수 호출도, 계산도 남지 않습니다.

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

`constexpr` 함수는 상황에 따라 컴파일 타임 또는 런타임에 호출됩니다. 컴파일러가 인자를 보고 결정합니다.

C++14 이전에는 `constexpr` 함수가 한 줄짜리 return만 가능했습니다. C++14부터는 loop, branch, 변수 등 대부분의 statement를 쓸 수 있습니다.

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
// Sin 테이블 256 entry
constexpr std::array<float, 256> generate_sin_table() {
    std::array<float, 256> table{};
    for (int i = 0; i < 256; ++i) {
        // 컴파일 타임에 sin 계산 (C++26 정도까지 std::sin은 안 됨, 직접 Taylor)
        float angle = (i * 2.0f * 3.14159f) / 256.0f;
        table[i] = taylor_sin(angle);
    }
    return table;
}

constexpr auto sin_table = generate_sin_table();   // Flash에 박힘
```

`sin_table`은 256 × 4 = 1024 바이트가 `.rodata` 섹션에 들어갑니다. 런타임 초기화 코드가 전혀 없습니다.

### Taylor series로 컴파일 타임 sin

```cpp
constexpr float taylor_sin(float x) {
    // x를 [-pi, pi]로 정규화 (생략)
    float result = x;
    float term = x;
    for (int n = 1; n < 7; ++n) {
        term *= -x * x / ((2 * n) * (2 * n + 1));
        result += term;
    }
    return result;
}
```

C++ 표준 sin/cos는 `constexpr`이 아닙니다. Taylor 급수나 CORDIC을 직접 구현해야 합니다. 한 번 작성하면 전체 LUT를 자동으로 생성할 수 있습니다.

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

테이블이 Flash에 미리 박히고 런타임 초기화 코드가 0이 됩니다. 비교하면 다음과 같습니다.

```text
# C — 첫 호출 시 lazy 초기화 또는 main 시작 시 초기화
# 코드 사이즈: +200 바이트 (초기화 함수) + 1024 (테이블)

# C++ constexpr — 컴파일 타임 생성
# 코드 사이즈: 1024 (테이블만)
```

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

런타임 `if`는 모든 분기를 컴파일해 코드 크기가 늘어나지만, `if constexpr`은 필요한 분기만 남깁니다.

## `static_assert` + `constexpr`로 컴파일 타임 검증

```cpp
constexpr int kMaxBufferSize = 4096;
constexpr int kSlotCount = 16;

static_assert(kMaxBufferSize % kSlotCount == 0,
              "Buffer size must be divisible by slot count");

constexpr int kSlotSize = kMaxBufferSize / kSlotCount;
```

잘못된 설정은 컴파일 실패로 이어집니다. 런타임에 발견되지 않습니다.

## 런타임 vs 컴파일 타임 — 어셈블리 비교

같은 코드에 `constexpr` 적용 여부만 다르게 한 결과입니다.

```cpp
// V1 — 런타임 계산
int compute_threshold(int level) {
    int base = 100;
    for (int i = 0; i < level; ++i) base *= 2;
    return base;
}

int threshold = compute_threshold(5);

// V2 — constexpr
constexpr int compute_threshold(int level) {
    int base = 100;
    for (int i = 0; i < level; ++i) base *= 2;
    return base;
}

constexpr int threshold = compute_threshold(5);   // = 3200
```

V1의 어셈블리는 루프 실행과 함수 호출이 그대로 남습니다.

```text
compute_threshold:
    movs    r3, #100
    cbz     r0, .L2
    mov     r2, r0
.L3:
    lsls    r3, r3, #1
    subs    r2, r2, #1
    bne     .L3
.L2:
    mov     r0, r3
    bx      lr
```

V2의 어셈블리는 상수만 남습니다.

```text
# threshold 변수 직접 사용 — 함수 호출 없음
ldr     r0, =3200
```

완전한 zero-cost입니다.

## constexpr의 제약

C++14 기준이며, 대부분 C++17/20에서 완화됐습니다.

- 동적 메모리 할당이 불가합니다(C++20에서 `constexpr new` 허용).
- 예외 throw가 불가합니다(C++20에서 부분 완화).
- virtual 함수 호출이 불가합니다(C++20에서 허용).
- try/catch가 불가합니다(C++20에서 부분 허용).
- I/O는 영원히 불가합니다.
- `reinterpret_cast`도 불가합니다.

```cpp
// 안 됨 (C++17)
constexpr int* ptr() { return new int(42); }   // dynamic alloc

// 됨 (C++20)
constexpr int* ptr() { return new int(42); }
```

C++ 표준이 점진적으로 완화되고 있으며, GCC 13은 C++20 `constexpr`의 약 90%를 지원합니다.

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
constinit int counter = compute_initial();   // 컴파일 타임에 초기화

// 컴파일 에러 — runtime 초기화 시도
constinit int x = read_register();
```

[Part 1-06 — Static Initialization Order Fiasco](/blog/embedded/embedded-cpp/part1-06-startup-code)를 컴파일 타임에 방지하는 기능입니다.

## 자주 보는 함정과 안티패턴

### 1. const ≠ constexpr
```cpp
const int n = read();     // OK, but not compile-time
int arr[n];               // C VLA — 표준 C++ 아님 (gnu++만)

constexpr int n = 100;
int arr[n];               // OK — 컴파일 타임 크기
```

### 2. constexpr 함수에 IO나 std::sin 사용
```cpp
constexpr float my_sin(float x) {
    return std::sin(x);   // ERROR (C++ 표준 sin이 constexpr 아님)
}
```
직접 Taylor 급수로 구현하거나 C++26을 기다려야 합니다.

### 3. 큰 constexpr LUT으로 컴파일 시간 폭증
```cpp
constexpr auto huge = generate_table<1000000>();   // 컴파일 30초+
```
보통 256~4096 entry 정도가 적절합니다.

### 4. 컴파일러가 constexpr을 적용하지 못함
```cpp
constexpr int f(int x) { /* */ }
int y = f(some_var);   // some_var가 const 아니면 런타임 호출
```
`constexpr auto y = f(...);`로 받거나 kConst 변수에 대입해 강제합니다.

### 5. constexpr이 LTO와 충돌
거의 발생하지 않습니다. `constexpr`이 먼저 적용돼 LTO 단계에는 이미 결과가 박혀 있습니다.

### 6. constexpr 멤버 함수에서 mutable 필드 변경
C++14부터 `constexpr` 멤버 함수에서 mutable 필드를 변경할 수 있습니다. 다만 const 멤버에서는 여전히 불가능합니다.

## 측정 — constexpr 적용 후 코드 크기

CRC 테이블을 STM32F4에서 비교합니다.

```text
# C — runtime 초기화
.text       : +180 B (init function)
.bss        : +1024 B (table, runtime filled)
init time   : ~50 us at startup

# C++ constexpr
.text       : +0 B (no init)
.rodata     : +1024 B (Flash, compile-time)
init time   : 0 us
```

초기화 코드와 시간을 함께 절약합니다. 데이터가 RAM에서 Flash로 옮겨가는데, 대부분의 임베디드 환경은 Flash 쪽이 더 넉넉합니다.

## 정리

- `constexpr`은 컴파일 타임에 값이 정해지는 변수와 함수에 모두 적용됩니다.
- LUT, CRC table, lookup 함수를 컴파일 타임에 생성해 RAM을 절약합니다.
- `if constexpr`은 컴파일 타임 분기이며 코드 크기를 줄여 줍니다.
- C++14 이후 대부분의 statement가 `constexpr` 가능하며, C++20에서는 new와 virtual까지 완화됐습니다.
- `consteval` (C++20)은 런타임 호출을 차단하고, `constinit`은 static 초기화를 강제합니다.

## 관련 항목

- [Part 2-04: constexpr 고급](/blog/embedded/embedded-cpp/part2-04-constexpr-advanced) — 복잡한 컴파일 타임 알고리즘
- [Part 2-05: consteval과 constinit](/blog/embedded/embedded-cpp/part2-05-consteval-constinit) — C++20 추가 키워드
- [Part 1-07: 링커 스크립트](/blog/embedded/embedded-cpp/part1-07-linker-scripts) — `.rodata` 배치
- [Part 5-01: Register 추상화](/blog/embedded/embedded-cpp/part5-01-register-abstraction) — constexpr 주소

## 다음 글

[Part 2-04: constexpr 고급](/blog/embedded/embedded-cpp/part2-04-constexpr-advanced) — 컴파일 타임 sort, search, 문자열 처리를 다룹니다. `constexpr` 알고리즘의 한계와 가능성을 함께 살펴봅니다.
