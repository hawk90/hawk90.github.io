---
title: "Part 2-07: Templates 비용 분석"
date: 2026-05-14T07:00:00
description: "Template instantiation의 코드 bloat — 추적, 통제, 공통 부분 분리 패턴."
series: "Embedded C++ for Real Systems"
seriesOrder: 15
tags: [cpp, embedded, templates, code-bloat, instantiation, optimization]
type: tech
---

## 한 줄 요약

> **"템플릿은 *zero runtime cost*지만 *compile-time + binary size cost*가 있습니다."** — 같은 함수가 *5개 타입*에 쓰이면 *코드도 5배*.

## 어떤 문제를 푸는가

[Part 2-06](/blog/embedded/embedded-cpp/part2-06-templates-basics)에서 봤듯 템플릿은 *zero-cost*입니다. 그러나 *bloat 두 형태*가 있습니다.

1. **Code bloat** — 같은 함수가 *여러 인스턴스*로 *코드 중복*
2. **Compile time** — 인스턴스화마다 *컴파일러 작업*

임베디드는 *binary size*가 critical. 무심코 쓴 템플릿이 *수 KB*를 더할 수 있음. *측정과 패턴*으로 통제.

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

5개의 *전용 함수* 생성. *200 lines × 5 = 1000 lines*. 동일 로직이라도 *각 타입별*.

확인:

```bash
arm-none-eabi-nm --size-sort --print-size --demangle firmware.elf | grep "process<"

00000200 T void process<int>(int)
00000200 T void process<long>(long)
000002a0 T void process<float>(float)
000002a0 T void process<double>(double)
000003c0 T void process<MyClass>(MyClass)
```

총 *3344 B*. 무시 못 함.

## 패턴 1 — 비-템플릿 helper로 공통 부분 분리

타입 의존이 *작은 부분*만이면 *그 부분만 템플릿*.

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

각 인스턴스에는 *작은 코드만*. 공통 부분은 *한 번만* 컴파일.

측정 (이전 예제):

```text
Before: 3344 B
After:
  process_common              : 280 B (한 번만)
  process<int> 등 5개         : 80 B × 5 = 400 B
  total                       : 680 B (-80%)
```

## 패턴 2 — 타입 erasure (`std::any`, `std::variant`)

여러 타입을 *하나의 컨테이너 타입*으로 wrap.

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

`std::variant`는 *sizeof = 최대 멤버 + tag*. *코드는 한 번*. 타입별 분기 *visit*으로.

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

*if constexpr*이 *컴파일 타임 분기*. 사용 안 하는 case는 *코드에 없음*.

## 패턴 3 — non-template wrapper

매개변수만 *non-type* (값)으로 만들면 *코드는 같지만 타입 다름*.

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

`push_impl`은 *Buffer<T> 한 번만* 컴파일. *N별로 인스턴스화 안 됨*. *storage만 다른 크기*.

## 패턴 4 — extern template

자주 사용되는 인스턴스를 *한 TU에만* 컴파일. 다른 TU는 *extern*.

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

*Container<int>, Container<float>* 코드가 *container.o에만* 있음. 다른 .o 파일은 *extern 선언만 보고 link*.

효과: *컴파일 시간 감소* + *코드 중복 제거*.

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

가상 함수 *vtable + 간접 호출* 제거. 각 인스턴스에 *해당 분기만*.

타입 set이 *닫혀 있고 작음*일 때 적합. *plug-in 시스템*처럼 *런타임 확장* 필요하면 virtual.

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

증가된 함수 목록 출력. *어느 인스턴스가 새로 추가*되었는지 즉시 확인.

### nm으로 인스턴스 갯수

```bash
arm-none-eabi-nm --demangle firmware.elf | grep "Container<" | wc -l
# 23 — 23개 다른 Container 인스턴스
```

너무 많으면 *디자인 재검토*.

### __PRETTY_FUNCTION__ 디버깅

```cpp
template<typename T>
void func(T x) {
    static_assert(sizeof(T) == 0, __PRETTY_FUNCTION__);
    // 컴파일 에러 메시지에 인스턴스화 정보
}
```

*어디서 인스턴스화*되는지 *컴파일 에러*로 추적. (Debug 후 제거.)

## 컴파일 시간 — 큰 문제

큰 프로젝트에서 *템플릿 폭증*은 *컴파일 시간*도 늘림.

```bash
# 측정
time make
# 또는 어느 파일이 느린지
make -j1 -B 2>&1 | ts '[%H:%M:%S]'
```

C++ 컴파일 시간이 *수십 초 → 분*으로 늘면:

- 자주 변경되는 파일이 *큰 template header* include?
- `#include <iostream>`이 *수많은 곳*? (iostream은 무거움)
- *forward declaration* 활용
- *Pimpl* 패턴으로 *컴파일 의존성 격리*

## Precompiled Headers (PCH)

자주 사용되는 헤더를 *미리 컴파일*.

```bash
# GCC
arm-none-eabi-g++ -x c++-header common.h -o common.h.gch

# 이후 컴파일
arm-none-eabi-g++ -include common.h source.cpp ...
```

*컴파일 시간 30-50% 감소* 가능. 단 *PCH가 invalidate*되면 *전체 재컴파일*.

CMake:

```cmake
target_precompile_headers(my_target PRIVATE common.h)
```

## Unity build — 다른 접근

여러 .cpp 파일을 *하나로 합쳐 컴파일*. *템플릿 인스턴스 중복 제거*.

```cmake
# CMake 3.16+
set_target_properties(my_target PROPERTIES UNITY_BUILD ON)
```

*컴파일 시간 40-70% 감소*. 단 *static 함수 충돌*, *header include 충돌* 발생 가능.

## 자주 보는 함정과 안티패턴

### 1. *작은 함수도 템플릿*
```cpp
template<typename T>
T abs(T x) { return x < 0 ? -x : x; }
```
5개 타입에 쓰면 *5개 함수*. 그러나 *각 4-8 바이트*라 *무시 가능*. 큰 함수만 분리.

### 2. *namespace 안 함수도 인스턴스화*
```cpp
namespace detail {
    template<typename T>
    void helper(T x) { /* large */ }
}
```
*public API와 같은 비용*. detail이라고 작은 것 아님.

### 3. *header에 거대 template*
```cpp
// container.h
template<typename T>
class Container {
    // 200 lines
    void heavy_method() { /* 50 lines */ }
};
```
*include할 때마다 파싱*. PCH 또는 *extern template*.

### 4. *컴파일러가 dead code 제거 못 함*
사용 안 하는 *template member*도 *인스턴스화될 수* 있음 (특정 호출 chain). *gc-sections* 활용 또는 *직접 분리*.

### 5. *macro vs template 혼란*
매크로는 *텍스트 치환*, 템플릿은 *컴파일러 평가*. 비슷해 보이지만 *동작 다름*. 새 코드는 *템플릿 우선*.

### 6. *디버깅 어려움*
템플릿 함수의 *디버그 정보*가 *각 인스턴스*에 별도 생성 → *디버그 정보 크기 증가*. 단 *Flash와 무관* (디버그 정보는 ELF에만).

## 측정 — 실제 프로젝트의 bloat 패턴

한 STM32 프로젝트 (FreeRTOS + C++)의 *template 인스턴스 분포*.

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

8%는 *수용 가능*. 단 *std::function*이 *1.8 KB*는 *과한지 검토*. capture lambdas로 *직접 함수 포인터* 또는 *delegate 패턴*으로 대체 가능.

## C++20 — modules로 컴파일 시간 단축

C++20 modules는 *include의 대안*. *템플릿 한 번 컴파일 후 재사용*.

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

GCC 11+ 부분 지원. 임베디드 *toolchain 대부분 미지원* (2026 기준). *몇 년 후* 일반화 예상.

## 정리

- 템플릿 = *zero runtime cost + compile/binary size cost*.
- *큰 함수*는 *비-템플릿 helper 분리* → bloat 70% 이상 감소.
- *type erasure* (`std::variant`) — 닫힌 type set에 유리.
- `extern template` + `template class` — *명시적 인스턴스화*로 코드 한 곳에.
- *측정 도구*: `nm` (인스턴스 수), `bloaty` (PR diff), `__PRETTY_FUNCTION__` (debug).
- 컴파일 시간 줄이려면 *PCH, unity build, modules (C++20)*.

## 관련 항목

- [Part 2-06: Templates 기초](/blog/embedded/embedded-cpp/part2-06-templates-basics) — template 기본
- [Part 1-04: 코드 크기 분석](/blog/embedded/embedded-cpp/part1-04-code-size-analysis) — bloat 측정 도구
- [Part 2-08: Static Polymorphism](/blog/embedded/embedded-cpp/part2-08-static-polymorphism) — CRTP로 vtable 제거
- [Part 4-02: ETL 라이브러리](/blog/embedded/embedded-cpp/part4-02-etl-library) — heap 없는 STL

## 다음 글

[Part 2-08: Static Polymorphism](/blog/embedded/embedded-cpp/part2-08-static-polymorphism) — CRTP. virtual 함수 없이 *컴파일 타임 다형성*.
