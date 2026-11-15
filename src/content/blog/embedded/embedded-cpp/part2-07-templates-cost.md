---
title: "Template 비용 분석 — 코드 폭증·인스턴스화·디버그 정보 측정"
slug: "embedded/embedded-cpp/part2-07-templates-cost"
date: 2026-04-29T09:15:00
description: "Template instantiation의 코드 bloat — 추적, 통제, 공통 부분 분리 패턴."
series: "Embedded C++ for Real Systems"
seriesOrder: 15
tags: [cpp, embedded, templates, code-bloat, instantiation, optimization]
type: tech
topics: ["embedded"]
---

## 한 줄 요약

> **"템플릿 비용은 컴파일 시간과 최종 링크 결과에서 확인합니다."** — 타입별 인스턴스가 생겨도 인라인·제거·병합 때문에 최종 크기가 정확히 배수가 되지는 않습니다.

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

5개의 전용 함수가 생성됩니다. 소스 줄 수를 기계어 크기로 환산할 수는 없으며 사용되지 않는 인스턴스는 출력되지 않을 수 있습니다.

확인은 다음과 같이 합니다.

```text
$ arm-none-eabi-nm --size-sort --print-size --demangle firmware.elf | grep "process<"

00000200 T void process<int>(int)
00000200 T void process<long>(long)
000002a0 T void process<float>(float)
000002a0 T void process<double>(double)
000003c0 T void process<MyClass>(MyClass)
```

위 값은 도구 형식을 설명하는 예시이며 실제 측정 자료가 아닙니다. 크기 열을 16진수로 읽으면 합계는 3328바이트입니다. 심볼 크기 합은 정렬·공유·링커 동작 때문에 전체 Flash 증가량과 다를 수 있습니다.

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

공통 함수가 다시 인라인될 수 있으므로 함수 분리만으로 특정 감소율을 보장하지 않습니다. 동일한 toolchain·플래그·호출 지점으로 최종 ELF와 map을 비교합니다.

## 패턴 2 — 닫힌 타입 집합의 `std::variant`

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

`std::variant`는 닫힌 합 타입이며 `std::any`와 같은 열린 type erasure와 구분합니다. 크기는 가장 큰 대안과 태그·정렬·padding에 따라 정해집니다. visitor는 대안 타입마다 인스턴스화될 수 있어 코드가 한 번만 생성된다는 보장은 없습니다.

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

visitor의 각 타입별 인스턴스 안에서 종속 분기를 선택하지만, variant의 모든 대안에 유효한 방문 코드를 제공해야 합니다. 최종 dispatch와 코드 크기는 실제 빌드로 확인합니다.

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
    Buffer(const Buffer&) = delete;
    Buffer& operator=(const Buffer&) = delete;
    Buffer(Buffer&&) = delete;
    Buffer& operator=(Buffer&&) = delete;
};
```

`push_impl`은 `Buffer<T>` 단위로 한 번만 컴파일되고, N별로 인스턴스화되지 않습니다. storage만 다른 크기가 됩니다. 이 구조는 기본 복사·이동 시 내부 포인터가 원본의 storage를 가리키게 되므로 여기서는 복사·이동을 금지했습니다. 지원하려면 목적 객체 storage로 포인터를 다시 묶고 원소를 옮기는 구현이 필요합니다.

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

주된 목적은 여러 TU에서의 불필요한 인스턴스화 작업을 줄이는 것입니다. 일반 템플릿 중복은 링커가 이미 병합할 수 있으므로 최종 바이너리가 반드시 작아지지는 않습니다. inline 멤버에는 별도 예외도 있습니다.

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
# 출력된 심볼 행 수 — 서로 다른 클래스 인스턴스 수와 같지는 않음
```

너무 많으면 디자인을 재검토합니다.

### __PRETTY_FUNCTION__ 디버깅

```cpp
template<typename T>
void func(T x) {
    static_assert(sizeof(T) == 0, "inspect the template instantiation diagnostic");
    // 컴파일 에러 메시지에 인스턴스화 정보
}
```

C++17/20의 static_assert 메시지는 문자열 리터럴이어야 하므로 `__PRETTY_FUNCTION__`을 그대로 메시지로 넘기지 않습니다. 위 의도적인 실패의 진단에 표시되는 타입과 호출 경로를 확인합니다.

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

효과는 헤더 구성과 캐시에 달립니다. PCH가 무효화되면 이를 사용하는 TU의 재빌드 비용도 비교해야 합니다.

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

속도 개선은 프로젝트별로 측정합니다. 익명 namespace·static 이름 충돌, include 순서 의존, 병렬 작업 수 감소가 생길 수 있습니다.

## 자주 보는 함정과 안티패턴

### 1. 작은 함수도 템플릿으로 둠
```cpp
template<typename T>
T abs(T x) { return x < 0 ? -x : x; }
```
여러 타입에 쓰더라도 인라인·병합으로 별도 함수가 남지 않을 수 있습니다. 이 signed abs는 최솟값의 부호 반전 overflow도 별도로 처리해야 합니다. 작은 함수의 비용까지 추정 수치로 단정하지 않습니다.

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

## 작은 예제 — extern template의 링크 계약

함수 본문을 따로 두고 명시적 인스턴스화 정의를 한 TU에서 제공합니다. 정상 링크와 그 TU를 빠뜨린 링크 실패를 비교합니다. 이 예제는 컴파일 시간 절감률을 측정하지 않습니다.

```cpp title="container.hpp"
#pragma once
template<class T> struct Container { T twice(T) const; };
extern template struct Container<int>;
```

```cpp title="container.cpp"
#include "container.hpp"
template<class T> T Container<T>::twice(T x) const { return x+x; }
template struct Container<int>;
```

```cpp title="extern-main.cpp"
#include "container.hpp"
int main() { Container<int> c; return c.twice(21)==42 ? 0 : 1; }
```

Clang 23.1.3 arm64 macOS에서 `clang++ -std=c++17 -Wall -Wextra -pedantic-errors container.cpp extern-main.cpp -o extern-check && ./extern-check`를 확인했습니다. `container.cpp`를 빼면 정의되지 않은 `Container<int>::twice(int) const` 심볼로 링크가 실패합니다. `-g` 디버그 정보를 포함한 산출물과 제거한 산출물의 파일 크기는 Flash 적재 크기와 별개입니다.

[명시적 인스턴스화의 표준 규칙](https://eel.is/c++draft/temp.explicit)을 참고합니다. 실제 프로젝트의 Flash·컴파일 시간·debug 정보 분포는 해당 프로젝트의 ELF와 빌드 기록이 있어야 판단할 수 있습니다.

## C++20 — modules로 컴파일 시간 단축

C++20 modules는 include의 대안입니다. 모듈 인터페이스의 파싱 결과를 재사용할 수 있지만, 타입별 인스턴스화 작업까지 모두 한 번으로 줄어드는 것은 아닙니다.

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

설치한 컴파일러·빌드 시스템의 모듈 지원과 의존성 스캔을 최소 프로젝트로 확인합니다. 벤더 전체의 지원율이나 향후 보급 시점을 추정하지 않습니다.

## 정리

- 템플릿 자체의 런타임 dispatch 없이 구현할 수 있지만 연산·컴파일·최종 코드 크기 비용은 확인해야 합니다.
- 큰 함수의 공통 부분을 helper로 분리하고 같은 조건의 최종 링크 결과를 비교합니다.
- `std::variant`는 닫힌 type set을 표현하며 visitor별 인스턴스화 비용도 확인합니다.
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
