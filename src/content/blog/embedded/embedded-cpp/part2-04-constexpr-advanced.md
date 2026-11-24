---
title: "constexpr 고급 활용 — 정렬 테이블·검색·해시 컴파일 타임 생성"
slug: "embedded/embedded-cpp/part2-04-constexpr-advanced"
date: 2026-04-29T09:12:00
description: "컴파일 타임 sort, search, 문자열 — constexpr 알고리즘의 한계와 가능성."
series: "Embedded C++ for Real Systems"
seriesOrder: 12
tags: [cpp, embedded, constexpr, compile-time, algorithm, std-array]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"컴파일러는 작은 컴파일 타임 인터프리터입니다."** — sort, search, 문자열 처리까지 컴파일 타임에 가능합니다.

## 어떤 문제를 푸는가

`constexpr` 기초([Part 2-03](/blog/embedded/embedded-cpp/part2-03-constexpr-basics))는 간단한 계산과 LUT 생성을 다뤘습니다. 이 글은 훨씬 복잡한 컴파일 타임 작업을 다룹니다.

- 정렬된 lookup 테이블을 컴파일 타임에 생성합니다.
- 문자열을 컴파일 타임에 파싱합니다.
- 복잡한 데이터 구조를 Flash에 직접 박습니다.
- 디자인 결정을 컴파일 타임에 검증합니다.

상수식 문맥에서 완료한 계산에는 런타임 생성 루프가 필요하지 않습니다. 결과 데이터가 `.rodata`에 놓이고 `.init_array`가 생기지 않는다는 것은 [Part 2-03](/blog/embedded/embedded-cpp/part2-03-constexpr-basics)에서 arm-none-eabi-g++ 16.2.0으로 확인했습니다. 이 글의 호스트 실행은 Homebrew Clang 23.1.5(libc++)와 g++-16(libstdc++)으로 했습니다.

## 컴파일 타임 sort

`std::sort`는 C++20부터 `constexpr`입니다. 그 전에는 직접 구현해야 합니다.

```cpp
template<typename T, size_t N>
constexpr void bubble_sort(std::array<T, N>& arr) {
    for (size_t i = 0; i + 1 < N; ++i) {
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

`sorted`는 정렬이 끝난 데이터로 `.rodata`에 들어가며 런타임 정렬은 사라집니다.

### C++20 — std::sort 사용

```cpp
constexpr auto make_sorted() {
    std::array arr = {5, 2, 8, 1, 4};
    std::sort(arr.begin(), arr.end());   // C++20 constexpr
    return arr;
}
```

컴파일러 언어 모드뿐 아니라 표준 라이브러리의 `__cpp_lib_constexpr_algorithms` 지원도 필요합니다. 아래 `advanced-check.cpp`를 `-std=c++17`로 컴파일하면 Clang 23.1.5는 `std::sort`보다 앞서 C++17의 `std::array` `operator==`가 `constexpr`이 아니라는 이유로 `error: constexpr function never produces a constant expression`을 냅니다. `-std=c++20`에서는 두 컴파일러 모두 통과합니다.

## 컴파일 타임 binary search

정렬된 테이블에서 컴파일 타임 binary search를 수행합니다. 아래 예제는 <array>·<limits>를 포함하고 N이 int로 표현되는 배열을 받습니다. 중간점은 low+high를 직접 더하지 않아 overflow를 피합니다. 상수 인자로 상수식 문맥에서 호출하면 검색 결과 자체를 확정합니다. 런타임 인자를 받는 호출도 가능합니다.

```cpp
template<typename T, size_t N>
constexpr int binary_search(const std::array<T, N>& arr, T value) {
    static_assert(N <= static_cast<size_t>(std::numeric_limits<int>::max()));
    int low = 0;
    int high = static_cast<int>(N) - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2;
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

`idx`는 컴파일 타임에 4로 확정됩니다. `binary_search`를 런타임 인자로 부르는 곳이 없으면 그 함수의 코드는 만들어지지 않습니다.

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
        hash ^= static_cast<unsigned char>(c);
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

세 상수는 호스트에서 출력해 보면 `0x6e70d7bc`, `0x483521d8`, `0xded16d06`으로 서로 다릅니다. 32비트 해시는 충돌할 수 있지만, 등록한 case 값끼리 충돌하면 같은 값의 `case`가 두 번 나오므로 컴파일 오류가 됩니다([stmt.switch]/2). 외부 입력이 등록된 이름과 같은 해시를 갖는 경우는 컴파일러가 잡지 못하므로 case 안에서 원문을 한 번 더 비교합니다. 입력 문자열의 해시 계산은 여전히 런타임 비용입니다.

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

FPU가 없는 MCU에서는 이 변환이 런타임 float 헬퍼 호출을 없앱니다. 같은 코드를 `std::array` 대신 작은 `Array` 구조체로 바꾸고, `sample_q16 >= fixed_thresholds[i]`로 단계를 세는 함수를 더해 Cortex-M0(`-mcpu=cortex-m0 -Os`)로 컴파일하면 오브젝트에 미정의 심볼이 하나도 없었습니다. `__aeabi_f*` 헬퍼가 없다는 뜻입니다. `.rodata`는 Q16.16 표 32바이트뿐이고 첫 값은 `0x000A8000`(10.5 × 65536 = 688128)이었습니다. 런타임에 쓰이지 않는 `raw_thresholds`는 오브젝트에 남지 않았습니다.

## 컴파일 타임 verification

설계 결정을 컴파일 시점에 검증합니다.

```cpp
constexpr int kMaxTasks = 16;
constexpr int kStackSize = 2048;
constexpr int kTotalStackMemory = kMaxTasks * kStackSize;

constexpr int kAvailableRamForStacks = 64 * 1024;   // 64 KB

static_assert(kTotalStackMemory <= kAvailableRamForStacks,
              "Stack memory exceeds available RAM");

// 32는 65536 == 65536이므로 통과; 33부터 컴파일 에러
```

`-DTASKS=33`으로 아래 예제를 컴파일하면 Clang 23.1.5는 `error: static assertion failed due to requirement '33 * 2048 <= 64 * 1024': stack budget exceeded`와 `note: expression evaluates to '67584 <= 65536'`을 냅니다. 예약 크기가 넘치는 설정은 빌드 시점에 멈춥니다.

## 컴파일 타임 register 비트 마스크 생성

여러 비트 필드의 마스크를 함수로 표현합니다.

```cpp
void invalid_pin();   // constexpr가 아닌 함수: 상수 평가에서 닿으면 컴파일 오류

constexpr uint32_t pin_mask(int pin) {
    if (pin < 0 || pin >= 32) invalid_pin();
    return uint32_t{1} << pin;
}

constexpr uint32_t kLedMask = pins_mask<13, 14, 15>();   // 0xE000
// pins_mask<32>();   // ERROR — static_assert

GPIOA->ODR |= kLedMask;   // 런타임에 그냥 상수 OR
```

잘못된 핀 번호를 상수 평가에서 쓰면 `invalid_pin()` 호출에 닿아 컴파일이 멈춥니다. arm-none-eabi-g++ 16.2.0은 `pin_mask(40)`에 `error: call to non-'constexpr' function 'void invalid_pin()'`를 냈습니다. 런타임 인자로 부르면 `invalid_pin()`이 실제로 불리므로, 그 함수를 오류 처리기로 정의합니다.

이전 버전은 이 자리에 `throw "invalid pin";`을 썼습니다. 이 시리즈의 기본 플래그인 `-fno-exceptions`에서는 그 함수가 상수 평가로만 쓰여도 컴파일되지 않습니다. arm-none-eabi-g++ 16.2.0은 `error: exception handling disabled, use '-fexceptions' to enable`, Clang 23.1.5는 `error: cannot use 'throw' with exceptions disabled`였습니다. 위 `invalid_pin()` 버전은 `-fno-exceptions -Wall -Wextra -pedantic-errors`에서 g++-16과 Clang 23.1.5 모두 통과했습니다.

매크로 `#define LED_MASK ((1<<13)|(1<<14)|(1<<15))` 대신 범위 검사를 갖춘 함수형 표현을 씁니다.

## 컴파일 타임 enum-to-string

런타임에 enum 이름을 얻으려면 switch나 배열을 씁니다. 같은 switch를 `constexpr`로 표현할 수 있습니다.

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

컴파일 타임에 vector를 생성하고 사용하고 소멸시킵니다. 런타임 heap 사용량은 0입니다. `static_assert(sum == 5050)`을 붙인 이 코드는 `-std=c++20`에서 g++-16과 Clang 23.1.5 모두 통과했습니다. 라이브러리 쪽 `constexpr std::vector`는 cppreference 지원 표 기준 libstdc++ 12, libc++ 15부터입니다.

함수가 vector를 반환하는 선언 자체는 허용됩니다. 다만 C++20에서 할당을 유지하는 vector를 `constexpr` 변수로 보존할 수는 없습니다. 상수 평가 안에서 결과를 소비하고 할당을 해제하거나 고정 크기 배열로 결과를 반환합니다.

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

// <string_view>와 <iterator> 포함
constexpr size_t kDeviceCount = std::size(devices);

// 컴파일 타임 검색
constexpr int find_irq(const char* name) {
    for (size_t i = 0; i < kDeviceCount; ++i) {
        if (std::string_view(devices[i].name) == name)
            return devices[i].irq_number;
    }
    return -1;
}
```

이처럼 고정된 구성은 런타임 device tree 파싱 없이 조회할 수 있습니다. 주소·IRQ는 STM32F407용 예시이며 다른 MCU에 그대로 적용하지 않습니다. 배열과 문자열의 실제 저장 위치·미사용 데이터 제거는 최종 ELF로 확인합니다.

## 자주 보는 함정과 안티패턴

### 1. 컴파일 시간 폭증
상수 평가에는 컴파일러별 한도가 있습니다. [Part 2-03](/blog/embedded/embedded-cpp/part2-03-constexpr-basics#3-큰-constexpr-lut으로-컴파일-시간-폭증)에서 원소 100만 개짜리 테이블은 GCC의 루프 한도(262,144)와 Clang의 단계 한도에 걸려 컴파일되지 않았습니다. 한도를 올리기 전에 테이블 크기와 알고리즘부터 줄입니다.

### 2. constexpr 함수가 런타임에만 호출됨
```cpp
constexpr int f(int x) { /* */ }
int y = f(read_input());   // 런타임 호출 — constexpr 효과 없음
```
런타임 인자로는 컴파일 타임 평가가 불가능합니다. 상수 인자라도 결과를 일반 변수로 받으면 평가가 의무는 아닙니다. 컴파일 타임 결과가 필요하면 `constexpr` 변수로 받거나 `consteval`([Part 2-05](/blog/embedded/embedded-cpp/part2-05-consteval-constinit))로 강제합니다.

### 3. 큰 컴파일 타임 string 처리
문자열 처리도 문자 하나하나가 평가 단계를 씁니다. 긴 문자열의 해시나 파싱은 함정 1의 한도에 같은 방식으로 걸리므로 작은 set에만 사용합니다.

### 4. 표준 라이브러리 지원 구분

C++17/20에서 `std::sin`은 `constexpr`이 아닙니다. g++-16은 내장 함수 확장으로 받아들이고 Clang 23.1.5는 거부했습니다([Part 2-03](/blog/embedded/embedded-cpp/part2-03-constexpr-basics#2-상수-평가에서-비상수-함수-호출)). 직접 근사를 구현하면 입력 범위와 오차를 별도로 검증합니다.

### 5. static_assert 메시지 누락
```cpp
static_assert(kSize <= 4096);   // C++17부터 메시지 생략 가능
```
`kSize`가 8192일 때 g++-16은 `error: static assertion failed`만, Clang 23.1.5는 `error: static assertion failed due to requirement 'kSize <= 4096'`과 `note: expression evaluates to '8192 <= 4096'`을 냈습니다. 어느 설계 제약을 어겼는지 알려면 메시지를 붙입니다. `static_assert(kSize <= 4096, "Size exceeds buffer limit")`.

### 6. 컴파일러 버전 차이
C++17과 C++20 사이에 `constexpr` 범위가 크게 다릅니다. 위 `advanced-check.cpp`가 C++17에서 거부된 것처럼, `std::sort`·`std::array`의 비교·`std::vector`가 C++20에서 `constexpr`이 됐습니다. `__cpp_lib_constexpr_algorithms` 같은 feature macro로 분기합니다.

## constexpr이 못 하는 것

- 동적 메모리를 영구 보존하는 일(할당된 메모리는 컴파일 타임 안에서만 살아 있음)
- 파일, 콘솔, 네트워크 같은 I/O
- 진정한 random number generation(deterministic만 가능)
- time, mutex, thread 같은 시스템 API
- `reinterpret_cast`(상수식에서 금지, [expr.const])

이런 작업은 런타임에만 가능합니다. `constexpr`이 모든 것을 대체하지는 않습니다.

## 작은 예제 — 빈 테이블과 상한 경계

정렬·검색의 빈 입력, RAM 상한과 같은 값, 상한 초과를 나눠 확인합니다. 이 예제의 예산 검사는 stack 데이터만 검사하며 전체 RAM 사용량을 보장하지 않습니다.

```cpp title="advanced-check.cpp"
#include <algorithm>
#include <array>
#include <cstddef>
#ifndef TASKS
#define TASKS 32
#endif
static_assert(TASKS * 2048 <= 64 * 1024, "stack budget exceeded");
template<class T, std::size_t N>
constexpr void bubble(std::array<T,N>& a) {
    for (std::size_t i=0; i+1<N; ++i)
        for (std::size_t j=0; j+1<N-i; ++j)
            if (a[j]>a[j+1]) { T t=a[j]; a[j]=a[j+1]; a[j+1]=t; }
}
constexpr bool check() {
    std::array<int,0> empty{}; bubble(empty);
    std::array<int,5> a{5,2,8,1,4}; bubble(a);
    return a == std::array<int,5>{1,2,4,5,8};
}
constexpr bool standard_sort() {
    std::array<int,3> a{3,1,2};
    std::sort(a.begin(),a.end()); return a[0]==1 && a[2]==3;
}
static_assert(check());
static_assert(standard_sort());
int main() {}
```

Homebrew Clang 23.1.5(libc++)와 g++-16(libstdc++) 모두 `clang++ -std=c++20 -Wall -Wextra -pedantic-errors advanced-check.cpp -o advanced-check`가 경고 없이 통과했습니다. `-DTASKS=33`은 위에서 본 예산 static_assert로 거부됩니다.

[C++20 N4861 sort 요건](https://timsong-cpp.github.io/cppwp/n4861/alg.sort)과 [상수식 요건](https://timsong-cpp.github.io/cppwp/n4861/expr.const)을 참고합니다. STM32의 초기화 시간과 크기는 이 예제로 측정하지 않았으며, 실제 저장 위치는 대상 링커 map으로 확인합니다.

## 정리

- `constexpr` 함수로 컴파일 타임에 sort, search, hash, 문자열 처리를 수행할 수 있습니다(C++14+).
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
