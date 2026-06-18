---
title: "constexpr 고급 활용 — 룩업 테이블·CRC·해시 컴파일 타임 생성"
date: 2026-04-29T09:12:00
description: "컴파일 타임 sort, search, 문자열 — constexpr 알고리즘의 한계와 가능성."
series: "Embedded C++ for Real Systems"
seriesOrder: 12
tags: [cpp, embedded, constexpr, compile-time, algorithm, std-array]
type: tech
---

## 한 줄 요약

> **"컴파일러는 작은 컴파일 타임 인터프리터입니다."** — sort, search, parse까지 컴파일 타임에 가능합니다.

## 어떤 문제를 푸는가

`constexpr` 기초([Part 2-03](/blog/embedded/embedded-cpp/part2-03-constexpr-basics))는 간단한 계산과 LUT 생성을 다뤘습니다. 이 글은 훨씬 복잡한 컴파일 타임 작업을 다룹니다.

- 정렬된 lookup 테이블을 컴파일 타임에 생성합니다.
- 문자열을 컴파일 타임에 파싱합니다.
- 복잡한 데이터 구조를 Flash에 직접 박습니다.
- 디자인 결정을 컴파일 타임에 검증합니다.

이 모든 작업이 런타임 초기화 비용 0이며, Flash 사용량은 늘지만 RAM은 절약됩니다.

## 컴파일 타임 sort

`std::sort`는 C++20부터 `constexpr`입니다. 그 전에는 직접 구현해야 합니다.

```cpp
template<typename T, size_t N>
constexpr void bubble_sort(std::array<T, N>& arr) {
    for (size_t i = 0; i < N - 1; ++i) {
        for (size_t j = 0; j < N - 1 - i; ++j) {
            if (arr[j] > arr[j + 1]) {
                T tmp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = tmp;
            }
        }
    }
}

constexpr std::array<int, 5> make_sorted() {
    std::array<int, 5> arr = {5, 2, 8, 1, 4};
    bubble_sort(arr);
    return arr;
}

constexpr auto sorted = make_sorted();   // {1, 2, 4, 5, 8} at compile time
```

`sorted`는 Flash에 정렬된 데이터로 들어가며 런타임 정렬은 사라집니다.

### C++20 — std::sort 사용

```cpp
constexpr auto make_sorted() {
    std::array arr = {5, 2, 8, 1, 4};
    std::sort(arr.begin(), arr.end());   // C++20 constexpr
    return arr;
}
```

GCC 10+, Clang 12+에서 동작합니다. 임베디드 toolchain 지원을 먼저 확인합니다.

## 컴파일 타임 binary search

정렬된 테이블에서 컴파일 타임 binary search를 수행합니다. 컴파일러가 분기 chain으로 변환합니다.

```cpp
template<typename T, size_t N>
constexpr int binary_search(const std::array<T, N>& arr, T value) {
    int low = 0;
    int high = N - 1;
    while (low <= high) {
        int mid = (low + high) / 2;
        if (arr[mid] == value) return mid;
        if (arr[mid] < value) low = mid + 1;
        else high = mid - 1;
    }
    return -1;
}

constexpr std::array<int, 8> sorted = {1, 3, 7, 15, 31, 63, 127, 255};
constexpr int idx = binary_search(sorted, 31);   // = 4, compile time

static_assert(idx == 4);
```

`idx`는 컴파일 타임에 4로 확정되고, 런타임 binary search 코드가 0이 됩니다.

## 컴파일 타임 문자열 처리

C++14까지 `constexpr` 문자열은 `const char*` 위주였습니다. C++17의 `string_view`가 들어오면서 표현력이 풍부해졌습니다.

```cpp
#include <string_view>

constexpr bool starts_with(std::string_view s, std::string_view prefix) {
    if (prefix.size() > s.size()) return false;
    for (size_t i = 0; i < prefix.size(); ++i) {
        if (s[i] != prefix[i]) return false;
    }
    return true;
}

constexpr bool a = starts_with("hello world", "hello");   // true
constexpr bool b = starts_with("hi", "hello");            // false

static_assert(a);
static_assert(!b);
```

C++20에서는 `std::string_view::starts_with`가 `constexpr`이므로 직접 구현할 필요가 없습니다.

### 컴파일 타임 해시

```cpp
constexpr uint32_t fnv1a(std::string_view s) {
    uint32_t hash = 2166136261u;
    for (char c : s) {
        hash ^= static_cast<uint32_t>(c);
        hash *= 16777619u;
    }
    return hash;
}

constexpr uint32_t kEventStart    = fnv1a("event_start");
constexpr uint32_t kEventStop     = fnv1a("event_stop");
constexpr uint32_t kEventError    = fnv1a("event_error");

// 런타임 switch
switch (event_hash) {
    case kEventStart: /* */ break;
    case kEventStop:  /* */ break;
    case kEventError: /* */ break;
}
```

문자열 비교 대신 해시 비교(4바이트 정수 비교 한 번)로 끝납니다. 임베디드의 이벤트 dispatch에 유용합니다.

## 컴파일 타임 데이터 변환

raw 데이터를 컴파일 타임에 가공해 Flash에 박아 둡니다.

```cpp
// 기본 데이터
constexpr std::array<float, 8> raw_thresholds = {
    10.5f, 22.3f, 45.7f, 78.1f, 100.0f, 150.5f, 200.0f, 300.0f
};

// 컴파일 타임 변환 — fixed-point Q16.16
constexpr std::array<int32_t, 8> make_fixed_point() {
    std::array<int32_t, 8> result{};
    for (size_t i = 0; i < raw_thresholds.size(); ++i) {
        result[i] = static_cast<int32_t>(raw_thresholds[i] * (1 << 16));
    }
    return result;
}

constexpr auto fixed_thresholds = make_fixed_point();
// 컴파일 타임 변환된 fixed-point 값들이 Flash에
```

FPU가 없는 MCU에서는 float을 쓰지 않게 됩니다. 컴파일러가 런타임 float→fixed 변환 코드를 생성하지 않기 때문입니다.

## 컴파일 타임 verification

설계 결정을 컴파일 시점에 검증합니다.

```cpp
constexpr int kMaxTasks = 16;
constexpr int kStackSize = 2048;
constexpr int kTotalStackMemory = kMaxTasks * kStackSize;

constexpr int kAvailableRamForStacks = 64 * 1024;   // 64 KB

static_assert(kTotalStackMemory <= kAvailableRamForStacks,
              "Stack memory exceeds available RAM");

// kMaxTasks를 32로 늘리면 — 컴파일 에러
```

RAM 부족이 production에서 발견되는 대신 빌드 시점에 차단됩니다.

## 컴파일 타임 register 비트 마스크 생성

여러 비트 필드의 마스크를 함수로 표현합니다.

```cpp
constexpr uint32_t pin_mask(int pin) {
    return 1u << pin;
}

constexpr uint32_t pins_mask(std::initializer_list<int> pins) {
    uint32_t mask = 0;
    for (int p : pins) mask |= pin_mask(p);
    return mask;
}

constexpr uint32_t kLedMask = pins_mask({13, 14, 15});   // 0xE000

GPIOA->ODR |= kLedMask;   // 런타임에 그냥 상수 OR
```

매크로 `#define LED_MASK ((1<<13)|(1<<14)|(1<<15))` 대신 타입 안전성과 디버깅 가능성을 갖춘 함수형 표현을 씁니다.

## 컴파일 타임 enum-to-string

런타임에 enum 이름을 얻으려면 보통 switch나 array를 씁니다. `constexpr`로도 표현할 수 있습니다.

```cpp
enum class State { Idle, Running, Paused, Stopped };

constexpr const char* to_string(State s) {
    switch (s) {
        case State::Idle:    return "Idle";
        case State::Running: return "Running";
        case State::Paused:  return "Paused";
        case State::Stopped: return "Stopped";
    }
    return "Unknown";
}

constexpr const char* name = to_string(State::Running);   // "Running"
```

함수 호출이 컴파일 타임에 사라집니다. 런타임 `to_string`도 가능합니다(`constexpr`이 두 경우를 모두 허용).

## 컴파일 타임 메모리 할당 (C++20)

C++20부터 `constexpr new`/`delete`가 허용됩니다. 다만 컴파일 타임에 할당한 메모리는 컴파일 타임에 해제해야 합니다.

```cpp
// C++20
constexpr int sum_vector() {
    std::vector<int> v;   // 컴파일 타임 vector
    for (int i = 1; i <= 100; ++i) v.push_back(i);
    int total = 0;
    for (int x : v) total += x;
    return total;   // v는 여기서 destruction
}

constexpr int sum = sum_vector();   // = 5050
```

컴파일 타임에 vector를 생성하고 사용하고 소멸시킵니다. 런타임 heap 사용량은 0입니다.

단, vector 자체를 return하면 메모리 leak 컴파일 에러가 발생합니다. 결과 값만 반환해야 합니다.

## 임베디드 — 컴파일 타임 device tree

device tree 정보를 컴파일 타임 struct로 표현합니다.

```cpp
struct DeviceConfig {
    const char* name;
    uintptr_t base_address;
    int irq_number;
    int priority;
};

constexpr DeviceConfig devices[] = {
    {"UART1", 0x40011000, 37, 5},
    {"UART2", 0x40004400, 38, 5},
    {"SPI1",  0x40013000, 35, 6},
    {"I2C1",  0x40005400, 31, 7},
};

constexpr size_t kDeviceCount = std::size(devices);

// 컴파일 타임 검색
constexpr int find_irq(const char* name) {
    for (size_t i = 0; i < kDeviceCount; ++i) {
        // 컴파일 타임 string 비교 (C++17 string_view 또는 직접)
        // ...
    }
    return -1;
}
```

런타임 device tree 파싱이 불필요하며, 모든 정보가 Flash에 박힙니다.

## 자주 보는 함정과 안티패턴

### 1. 컴파일 시간 폭증
큰 LUT나 복잡한 알고리즘은 분 단위 컴파일로 이어집니다. 적정 크기와 단순한 알고리즘을 유지합니다.

### 2. constexpr 함수가 런타임에만 호출됨
```cpp
constexpr int f(int x) { /* */ }
int y = f(read_input());   // 런타임 호출 — constexpr 효과 없음
```
컴파일러는 상수 인자만 컴파일 타임으로 처리합니다. `constexpr` 변수에 대입해 강제해야 합니다.

### 3. 큰 컴파일 타임 string 처리
긴 문자열의 컴파일 타임 hash나 정규식은 분 단위가 걸립니다. 작은 set에만 사용합니다.

### 4. constexpr 안에서 표준 라이브러리의 비-constexpr 함수 사용
```cpp
constexpr float f(float x) {
    return std::sin(x);   // ERROR — std::sin은 constexpr 아님 (대부분)
}
```
직접 구현하거나 C++26을 기다려야 합니다.

### 5. static_assert 메시지 누락
```cpp
static_assert(kSize <= 4096);   // 실패 시 메시지 없음
```
명확한 메시지를 붙입니다. `static_assert(kSize <= 4096, "Size exceeds buffer limit")`.

### 6. 컴파일러 버전 차이
C++17 `constexpr` 기능과 C++20 사이에 차이가 큽니다. toolchain을 확인하고 `__cpp_lib_constexpr_algorithms` 같은 feature macro를 활용합니다.

## constexpr이 못 하는 것

- 동적 메모리를 영구 보존하는 일(할당된 메모리는 컴파일 타임 안에서만 살아 있음)
- 파일, 콘솔, 네트워크 같은 I/O
- 진정한 random number generation(deterministic만 가능)
- time, mutex, thread 같은 시스템 API
- 대부분의 환경에서 `reinterpret_cast`

이런 작업은 런타임에만 가능합니다. `constexpr`이 모든 것을 대체하지는 않습니다.

## 측정 — 복잡한 LUT의 효과

256 entry sin table을 컴파일 타임과 런타임 초기화로 비교합니다(STM32F4).

```text
# 런타임 초기화 (main에서)
.text       : +312 B (init function with sin loop)
.bss        : +1024 B (table)
init time   : ~12 ms (256 * sin calls)
boot time   : main까지 +12 ms

# constexpr
.text       : 0 B
.rodata     : +1024 B (Flash)
init time   : 0
boot time   : main까지 +0 ms
```

RAM에서 Flash로 옮기면서 초기화 시간도 제거됩니다. Flash가 RAM보다 큰 대부분의 임베디드 환경에 유리합니다.

## 정리

- `constexpr` 함수로 컴파일 타임에 sort, search, hash, parse를 모두 수행할 수 있습니다(C++14+).
- 임베디드에서는 LUT, fixed-point 변환, device tree, register mask에 활용합니다.
- `static_assert`로 설계 결정을 컴파일 시점에 검증합니다.
- C++20은 `constexpr new`/`delete`와 `constexpr std::sort`를 추가했고, 컴파일 타임 vector도 가능합니다.
- 못 하는 것은 I/O, 영구 동적 메모리, system API입니다.

## 관련 항목

- [Part 2-03: constexpr 기초](/blog/embedded/embedded-cpp/part2-03-constexpr-basics) — 기본
- [Part 2-05: consteval과 constinit](/blog/embedded/embedded-cpp/part2-05-consteval-constinit) — C++20 추가
- [Part 5-01: Register 추상화](/blog/embedded/embedded-cpp/part5-01-register-abstraction) — 비트 마스크 활용

## 다음 글

[Part 2-05: consteval과 constinit](/blog/embedded/embedded-cpp/part2-05-consteval-constinit) — C++20의 컴파일 타임 강제 키워드 두 개를 다룹니다.
