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

> **"런타임에 할 일을 컴파일러에게 시킵니다."** — 코드 + 데이터 모두 컴파일 타임으로 옮길 수 있습니다.

## 어떤 문제를 푸는가

런타임 비용은 두 형태입니다.

1. **CPU 사이클** — 함수 실행 시간
2. **메모리** — 코드 + 데이터 차지 공간

`constexpr`은 *컴파일 타임에 결과를 계산*해 *runtime cost를 0으로* 만듭니다.

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

어셈블리에서 `x`는 *그냥 상수 3628800*. *함수 호출도, 계산도 없음*.

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

`const`와의 차이:
- `const` = *읽기 전용* (값은 컴파일 타임 또는 런타임)
- `constexpr` = *컴파일 타임에 알려짐* (강한 보장)

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

`constexpr` 함수는 *상황에 따라 컴파일 타임 또는 런타임 호출*. 컴파일러가 *인자*를 보고 결정.

C++14 이전 `constexpr` 함수는 *한 줄 return*만 가능. C++14부터 *대부분 statement* 가능 — loop, branch, 변수.

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

룩업 테이블을 *컴파일러가 자동 생성*. RAM/Flash 그대로 쓰지만 *런타임 계산 없음*.

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

`sin_table`은 *256 * 4 = 1024 바이트*가 *.rodata 섹션*에 들어감. *런타임 초기화 없음*.

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

*C++ 표준 sin/cos는 constexpr 아님*. 직접 *Taylor 급수* 또는 *CORDIC* 구현 필요. 일회성 노력으로 *전체 LUT 자동 생성*.

## 임베디드 — 컴파일 타임 CRC

CRC 테이블 생성은 *임베디드 단골*. `constexpr`로 컴파일 타임에:

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

테이블이 *Flash에 미리 박혀*. 런타임에 *초기화 코드 0*. 비교:

```text
# C — 첫 호출 시 lazy 초기화 또는 main 시작 시 초기화
# 코드 사이즈: +200 바이트 (초기화 함수) + 1024 (테이블)

# C++ constexpr — 컴파일 타임 생성
# 코드 사이즈: 1024 (테이블만)
```

## 임베디드 — 컴파일 타임 register 주소

여러 peripheral의 *register 주소*가 *컴파일 타임 상수*. 함수로 계산:

```cpp
constexpr uintptr_t gpio_base(int port) {
    return 0x40020000 + port * 0x400;   // STM32 GPIOA, GPIOB, ...
}

constexpr uintptr_t kGpioAOdrAddr = gpio_base(0) + 0x14;
constexpr uintptr_t kGpioBOdrAddr = gpio_base(1) + 0x14;

#define GPIOA_ODR (*reinterpret_cast<volatile uint32_t*>(kGpioAOdrAddr))
```

매크로 대신 *컴파일 타임 함수 + 상수*. *타입 안전 + 디버깅 가능*.

## `if constexpr` (C++17)

*컴파일 타임 분기*. 잘못된 분기는 *컴파일러가 제거*.

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

`sizeof(T)`가 *컴파일 타임에 알려짐* → *해당 분기 외의 코드 제거*.

런타임 `if`는 *모든 분기 컴파일*하므로 *코드 크기 증가*. `if constexpr`은 *필요한 것만*.

## `static_assert` + `constexpr`로 컴파일 타임 검증

```cpp
constexpr int kMaxBufferSize = 4096;
constexpr int kSlotCount = 16;

static_assert(kMaxBufferSize % kSlotCount == 0,
              "Buffer size must be divisible by slot count");

constexpr int kSlotSize = kMaxBufferSize / kSlotCount;
```

*잘못된 설정*은 *컴파일 실패*. *런타임에 발견*하지 않음.

## 런타임 vs 컴파일 타임 — 어셈블리 비교

같은 코드, 다른 *constexpr* 적용.

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

V1 어셈블리 — *루프 실행 + 함수 호출*:

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

V2 어셈블리 — *상수만 남음*:

```text
# threshold 변수 직접 사용 — 함수 호출 없음
ldr     r0, =3200
```

*완전한 zero-cost*.

## constexpr의 *제약*

C++14 기준 (대부분 C++17/20에서 완화).

- *동적 메모리 할당 불가* (C++20에서 `constexpr new` 허용)
- *예외 throw 불가* (C++20 부분 완화)
- *virtual 함수 호출 불가* (C++20에서 허용)
- *try/catch 불가* (C++20 부분)
- *I/O 불가* (영원히)
- *reinterpret_cast 불가*

```cpp
// 안 됨 (C++17)
constexpr int* ptr() { return new int(42); }   // dynamic alloc

// 됨 (C++20)
constexpr int* ptr() { return new int(42); }
```

C++ 표준이 *점진적으로 완화*. 현재 GCC 13은 *C++20 constexpr의 90%* 지원.

## consteval — 컴파일 타임 *강제* (C++20)

`constexpr`은 *상황에 따라 런타임 가능*. `consteval`은 *컴파일 타임 강제*.

```cpp
consteval int square(int x) {
    return x * x;
}

constexpr int a = square(5);     // OK — 컴파일 타임
int b = square(read_input());    // ERROR — 런타임 인자 불가
```

런타임 호출 *원천 차단*. 자세한 내용은 [Part 2-05](/blog/embedded/embedded-cpp/part2-05-consteval-constinit).

## constinit — 정적 초기화 *강제* (C++20)

static 객체의 *초기화 시점*을 보장.

```cpp
constinit int counter = compute_initial();   // 컴파일 타임에 초기화

// 컴파일 에러 — runtime 초기화 시도
constinit int x = read_register();
```

[Part 1-06 — Static Initialization Order Fiasco](/blog/embedded/embedded-cpp/part1-06-startup-code)를 *컴파일 타임에 방지*.

## 자주 보는 함정과 안티패턴

### 1. *const ≠ constexpr*
```cpp
const int n = read();     // OK, but not compile-time
int arr[n];               // C VLA — 표준 C++ 아님 (gnu++만)

constexpr int n = 100;
int arr[n];               // OK — 컴파일 타임 크기
```

### 2. *constexpr 함수에 IO/std::sin*
```cpp
constexpr float my_sin(float x) {
    return std::sin(x);   // ERROR (C++ 표준 sin이 constexpr 아님)
}
```
*직접 Taylor* 또는 C++26 기다림.

### 3. *큰 constexpr LUT으로 컴파일 시간 폭증*
```cpp
constexpr auto huge = generate_table<1000000>();   // 컴파일 30초+
```
*적절한 크기* — 보통 256-4096 entry.

### 4. *컴파일러가 constexpr 적용 안 함*
```cpp
constexpr int f(int x) { /* */ }
int y = f(some_var);   // some_var가 const 아니면 런타임 호출
```
`constexpr auto y = f(...);` 또는 *kConst 변수*로 강제.

### 5. *constexpr이 LTO와 충돌*
거의 *없음*. constexpr이 *우선 적용*되어 LTO 단계엔 *이미 결과 박힘*.

### 6. *constexpr 멤버 함수에 mutable 필드 변경*
C++14부터 *constexpr 멤버 함수에서 mutable 변경 가능*. 그러나 *const 멤버에서는 안 됨*.

## 측정 — constexpr 적용 후 코드 크기

CRC 테이블 비교 (STM32F4).

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

*초기화 코드 + 시간 절약*. RAM → Flash로 *옮김* (대부분 임베디드는 Flash가 더 큼).

## 정리

- `constexpr` = *컴파일 타임에 알려진 값*. 변수와 함수 모두.
- *LUT, CRC table, lookup 함수*가 모두 *컴파일 타임 생성*. RAM 절약.
- `if constexpr`은 *컴파일 타임 분기* — 코드 크기 감소.
- C++14 이후 *대부분의 statement* `constexpr` 가능. C++20에서 *new, virtual* 등 완화.
- `consteval` (C++20)은 *런타임 호출 차단*. `constinit`은 *static 초기화 강제*.

## 관련 항목

- [Part 2-04: constexpr 고급](/blog/embedded/embedded-cpp/part2-04-constexpr-advanced) — 복잡한 컴파일 타임 알고리즘
- [Part 2-05: consteval과 constinit](/blog/embedded/embedded-cpp/part2-05-consteval-constinit) — C++20 추가 키워드
- [Part 1-07: 링커 스크립트](/blog/embedded/embedded-cpp/part1-07-linker-scripts) — `.rodata` 배치
- [Part 5-01: Register 추상화](/blog/embedded/embedded-cpp/part5-01-register-abstraction) — constexpr 주소

## 다음 글

[Part 2-04: constexpr 고급](/blog/embedded/embedded-cpp/part2-04-constexpr-advanced) — *컴파일 타임 sort, search, 문자열 처리*. constexpr 알고리즘의 한계와 가능성.
