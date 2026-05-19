---
title: "Part 2-07: Templates 비용 분석"
date: 2026-05-07T07:00:00
description: "Template instantiation의 코드 bloat — 추적, 통제, 공통 부분 분리 패턴."
series: "Embedded C++ for Real Systems"
seriesOrder: 15
tags: [cpp, embedded, templates, code-bloat, instantiation, optimization]
type: tech
---

## 한 줄 요약

> **"템플릿은 zero runtime cost지만 compile-time과 binary size cost가 있습니다."** — 같은 함수가 5개 타입에 쓰이면 코드도 5배가 됩니다.

## 어떤 문제를 푸는가

[Part 2-06](/blog/embedded/embedded-cpp/part2-06-templates-basics)에서 봤듯 템플릿은 zero-cost입니다. 다만 bloat가 두 형태로 나타납니다.

1. **Code bloat** — 같은 함수가 여러 인스턴스로 중복됩니다.
2. **Compile time** — 인스턴스마다 컴파일러가 추가 작업을 합니다.

임베디드에서는 binary size가 critical합니다. 무심코 쓴 템플릿이 수 KB를 더할 수 있으므로 측정과 패턴으로 통제합니다.

## bloat의 출처

```cpp
template<typename T>
void process(T value) {
    // 200 lines of logic
    if (value > threshold) { /* */ }
    transform(value);
    log(value);
    notify(value);
    // ...
}

process<int>(1);
process<long>(2);
process<float>(3.0f);
process<double>(4.0);
process<MyClass>(obj);
```

5개의 전용 함수가 생성됩니다. 200줄 × 5 = 1000줄로, 동일한 로직이 각 타입별로 늘어납니다.

확인은 다음과 같이 합니다.

```bash
arm-none-eabi-nm --size-sort --print-size --demangle firmware.elf | grep "process<"

00000200 T void process<int>(int)
00000200 T void process<long>(long)
000002a0 T void process<float>(float)
000002a0 T void process<double>(double)
000003c0 T void process<MyClass>(MyClass)
```

총 3344 B로 무시할 수 없는 크기입니다.

## 패턴 1 — 비-템플릿 helper로 공통 부분 분리

타입 의존이 작은 부분에 한정된다면 그 부분만 템플릿으로 둡니다.

```cpp
// BAD — 전체 템플릿
template<typename T>
void process(T value) {
    if (value > 100) {
        log_warning();      // 비-템플릿이지만 인스턴스마다 호출
        do_cleanup();       // 같음
        notify_system();    // 같음
    }
    write_to_buffer(value); // 이 부분만 T 의존
}

// GOOD — 공통 부분 분리
void process_common(bool above_threshold) {
    if (above_threshold) {
        log_warning();
        do_cleanup();
        notify_system();
    }
}

template<typename T>
void process(T value) {
    process_common(value > 100);
    write_to_buffer(value);   // 작은 템플릿 부분
}
```

각 인스턴스에는 작은 코드만 들어가고, 공통 부분은 한 번만 컴파일됩니다.

이전 예제로 측정한 결과는 다음과 같습니다.

```text
Before: 3344 B
After:
  process_common              : 280 B (한 번만)
  process<int> 등 5개         : 80 B × 5 = 400 B
  total                       : 680 B (-80%)
```

## 패턴 2 — 타입 erasure (`std::any`, `std::variant`)

여러 타입을 하나의 컨테이너 타입으로 감쌉니다.

```cpp
// BAD — 5개 vector
std::vector<int> ints;
std::vector<float> floats;
std::vector<Order> orders;
// ...

// GOOD — variant
std::variant<int, float, Order> v;
std::vector<decltype(v)> mixed;
```

`std::variant`의 sizeof는 최대 멤버 크기에 tag가 더해진 크기이며, 코드는 한 번만 생성됩니다. 타입별 분기는 `visit`으로 처리합니다.

```cpp
std::visit([](auto&& val) {
    using T = std::decay_t<decltype(val)>;
    if constexpr (std::is_same_v<T, int>) {
        process_int(val);
    } else if constexpr (std::is_same_v<T, float>) {
        process_float(val);
    }
    // ...
}, v);
```

`if constexpr`이 컴파일 타임 분기이므로 사용하지 않는 case는 코드에 남지 않습니다.

## 패턴 3 — non-template wrapper

매개변수만 non-type(값)으로 바꾸면 코드는 같지만 타입이 달라집니다.

```cpp
// BAD — 각 크기마다 별도 인스턴스
template<typename T, size_t N>
class Buffer {
    T data[N];
    // ...
};

Buffer<int, 16> a;
Buffer<int, 32> b;
Buffer<int, 64> c;
// 3개 다른 클래스 — 코드 3배
```

```cpp
// GOOD — 크기를 런타임으로 (또는 공통 base)
template<typename T>
class BufferBase {
protected:
    T* data_;
    size_t capacity_;
    size_t size_ = 0;

    BufferBase(T* data, size_t cap) : data_(data), capacity_(cap) {}

    bool push_impl(const T& v) {
        if (size_ >= capacity_) return false;
        data_[size_++] = v;
        return true;
    }
};

template<typename T, size_t N>
class Buffer : public BufferBase<T> {
    T storage_[N];
public:
    Buffer() : BufferBase<T>(storage_, N) {}
};
```

`push_impl`은 `Buffer<T>` 단위로 한 번만 컴파일되고, N별로 인스턴스화되지 않습니다. storage만 다른 크기가 됩니다.

## 패턴 4 — extern template

자주 사용되는 인스턴스를 한 TU에만 컴파일하고, 다른 TU에서는 extern으로 받습니다.

```cpp
// container.h
template<typename T>
class Container {
public:
    void method() { /* large impl */ }
};

// declare common instances as extern (다른 TU는 컴파일 안 함)
extern template class Container<int>;
extern template class Container<float>;
```

```cpp
// container.cpp
#include "container.h"

// 명시적 인스턴스화
template class Container<int>;
template class Container<float>;
```

`Container<int>`, `Container<float>` 코드가 `container.o`에만 들어가고, 다른 `.o` 파일은 extern 선언만 보고 link합니다.

효과는 컴파일 시간 감소와 코드 중복 제거 두 가지입니다.

## 패턴 5 — virtual 대신 if constexpr

```cpp
// BAD — virtual로 다형성
class Base {
public:
    virtual void process() = 0;
};

class A : public Base { void process() override { /* */ } };
class B : public Base { void process() override { /* */ } };

// GOOD — if constexpr (closed set)
template<typename T>
void process(T& obj) {
    if constexpr (std::is_same_v<T, A>) {
        // A 전용 code
    } else if constexpr (std::is_same_v<T, B>) {
        // B 전용 code
    }
}
```

가상 함수의 vtable과 간접 호출이 제거되고, 각 인스턴스에는 해당 분기만 남습니다.

타입 set이 닫혀 있고 작을 때 적합합니다. plug-in 시스템처럼 런타임 확장이 필요하면 virtual을 그대로 씁니다.

## 측정 — bloat 추적 도구

### bloaty로 두 빌드 비교

```bash
# 베이스라인
make
cp firmware.elf base.elf

# 템플릿 추가 후
make
cp firmware.elf new.elf

bloaty -d symbols --demangle=full new.elf -- base.elf
```

증가된 함수 목록이 출력되어, 어느 인스턴스가 새로 추가됐는지 즉시 확인할 수 있습니다.

### nm으로 인스턴스 개수

```bash
arm-none-eabi-nm --demangle firmware.elf | grep "Container<" | wc -l
# 23 — 23개 다른 Container 인스턴스
```

너무 많으면 디자인을 재검토합니다.

### __PRETTY_FUNCTION__ 디버깅

```cpp
template<typename T>
void func(T x) {
    static_assert(sizeof(T) == 0, __PRETTY_FUNCTION__);
    // 컴파일 에러 메시지에 인스턴스화 정보
}
```

어디서 인스턴스화되는지를 컴파일 에러 메시지로 추적합니다(디버깅 후 제거합니다).

## 컴파일 시간 — 큰 문제

큰 프로젝트에서는 템플릿 폭증이 컴파일 시간도 늘립니다.

```bash
# 측정
time make
# 또는 어느 파일이 느린지
make -j1 -B 2>&1 | ts '[%H:%M:%S]'
```

C++ 컴파일 시간이 수십 초에서 분 단위로 늘면 다음을 점검합니다.

- 자주 변경되는 파일이 큰 template header를 include하지는 않는지 확인합니다.
- `#include <iostream>`이 곳곳에 흩어져 있지는 않은지 봅니다(iostream은 무거운 헤더입니다).
- forward declaration을 적극적으로 활용합니다.
- Pimpl 패턴으로 컴파일 의존성을 격리합니다.

## Precompiled Headers (PCH)

자주 사용되는 헤더를 미리 컴파일해 둡니다.

```bash
# GCC
arm-none-eabi-g++ -x c++-header common.h -o common.h.gch

# 이후 컴파일
arm-none-eabi-g++ -include common.h source.cpp ...
```

컴파일 시간을 30~50% 줄일 수 있습니다. 단 PCH가 invalidate되면 전체가 재컴파일됩니다.

CMake에서는 다음과 같이 설정합니다.

```cmake
target_precompile_headers(my_target PRIVATE common.h)
```

## Unity build — 다른 접근

여러 `.cpp` 파일을 하나로 합쳐 컴파일하여 템플릿 인스턴스 중복을 제거합니다.

```cmake
# CMake 3.16+
set_target_properties(my_target PROPERTIES UNITY_BUILD ON)
```

컴파일 시간을 40~70% 줄일 수 있습니다. 단 static 함수 충돌이나 header include 충돌이 발생할 수 있습니다.

## 자주 보는 함정과 안티패턴

### 1. 작은 함수도 템플릿으로 둠
```cpp
template<typename T>
T abs(T x) { return x < 0 ? -x : x; }
```
5개 타입에 쓰면 5개 함수가 생기지만 각각 4~8바이트라 무시할 만합니다. 큰 함수만 분리합니다.

### 2. namespace 안 함수도 인스턴스화됨
```cpp
namespace detail {
    template<typename T>
    void helper(T x) { /* large */ }
}
```
public API와 같은 비용이 듭니다. detail이라고 해서 작아지지 않습니다.

### 3. header에 거대한 template
```cpp
// container.h
template<typename T>
class Container {
    // 200 lines
    void heavy_method() { /* 50 lines */ }
};
```
include할 때마다 파싱됩니다. PCH나 extern template으로 대응합니다.

### 4. 컴파일러가 dead code를 제거하지 못함
사용하지 않는 template member도 호출 chain에 따라 인스턴스화될 수 있습니다. `gc-sections`를 활용하거나 직접 분리합니다.

### 5. macro와 template 혼동
매크로는 텍스트 치환이고 템플릿은 컴파일러 평가입니다. 비슷해 보여도 동작이 다르며, 새 코드에서는 템플릿을 우선합니다.

### 6. 디버깅이 어려움
템플릿 함수의 디버그 정보가 각 인스턴스마다 별도로 생성되어 디버그 정보 크기가 늘어납니다. 단 Flash와는 무관합니다(디버그 정보는 ELF에만 포함).

## 측정 — 실제 프로젝트의 bloat 패턴

한 STM32 프로젝트(FreeRTOS + C++)의 template 인스턴스 분포입니다.

```text
Top template instances by total size:

1. std::function<...>          : 4 instances, 1.8 KB
2. RingBuffer<...>             : 6 instances, 1.2 KB
3. EventDispatcher<...>        : 3 instances, 0.9 KB
4. Logger<...>                 : 4 instances, 0.6 KB
5. std::optional<...>          : 12 instances, 0.4 KB (small)
...

Total template overhead: ~5.5 KB (8% of code section)
```

8%는 수용할 만한 수준입니다. 다만 `std::function`이 1.8 KB를 차지하는 것은 과한지 검토해 봐야 합니다. capture lambdas 대신 함수 포인터나 delegate 패턴으로 대체할 수 있습니다.

## C++20 — modules로 컴파일 시간 단축

C++20 modules는 include의 대안입니다. 템플릿을 한 번 컴파일한 뒤 재사용할 수 있습니다.

```cpp
// container.cppm — module
export module container;

export template<typename T>
class Container {
    // ...
};
```

```cpp
// user.cpp
import container;

Container<int> c;
```

GCC 11+가 부분 지원합니다. 2026년 기준 임베디드 toolchain 대부분은 아직 미지원이며, 몇 년 안에 일반화될 것으로 보입니다.

## 정리

- 템플릿은 runtime cost는 0이지만 컴파일/binary size cost를 발생시킵니다.
- 큰 함수는 비-템플릿 helper로 분리하면 bloat가 70% 이상 줄어듭니다.
- Type erasure(`std::variant`)는 닫힌 type set에 유리합니다.
- `extern template`과 `template class`로 명시적 인스턴스화를 하면 코드가 한 곳에 모입니다.
- 측정 도구는 `nm`(인스턴스 수), `bloaty`(PR diff), `__PRETTY_FUNCTION__`(debug)입니다.
- 컴파일 시간을 줄이려면 PCH, unity build, modules(C++20)를 활용합니다.

## 관련 항목

- [Part 2-06: Templates 기초](/blog/embedded/embedded-cpp/part2-06-templates-basics) — template 기본
- [Part 1-04: 코드 크기 분석](/blog/embedded/embedded-cpp/part1-04-code-size-analysis) — bloat 측정 도구
- [Part 2-08: Static Polymorphism](/blog/embedded/embedded-cpp/part2-08-static-polymorphism) — CRTP로 vtable 제거
- [Part 4-02: ETL 라이브러리](/blog/embedded/embedded-cpp/part4-02-etl-library) — heap 없는 STL

## 다음 글

[Part 2-08: Static Polymorphism](/blog/embedded/embedded-cpp/part2-08-static-polymorphism) — CRTP를 통해 virtual 함수 없이 컴파일 타임 다형성을 구현합니다.
