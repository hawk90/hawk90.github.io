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

[Part 2-06](/blog/embedded/embedded-cpp/part2-06-templates-basics)에서 봤듯 템플릿 호출에는 런타임 dispatch가 없습니다. 다만 비용이 두 형태로 나타납니다.

1. **Code bloat** — 같은 함수가 여러 인스턴스로 중복됩니다.
2. **Compile time** — 인스턴스마다 컴파일러가 추가 작업을 합니다.

이 글의 숫자는 모두 Homebrew arm-none-eabi-g++ 16.2.0(`-mcpu=cortex-m4 -mthumb -mfloat-abi=hard -mfpu=fpv4-sp-d16 -Os -ffreestanding -fno-exceptions -fno-rtti`)으로 컴파일한 오브젝트와 ELF에서 쟀습니다. 작은 예제라 바이트 수 자체보다 패턴 전후의 방향을 봅니다. 측정에 쓴 소스와 명령은 아래 [측정 소스와 명령](#측정-소스와-명령) 절에 모았습니다.

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

5개의 전용 함수가 생성됩니다. 실제로 재 보기 위해 `process`의 본문을 "`value > 100`이면 외부 함수 세 개를 세 번 부르고, 타입별 `write_to_buffer`로 값을 쓴다"로 채우고 `int32_t`·`int64_t`·`float`·`double`·구조체 `Sample` 다섯 타입으로 불렀습니다. `-Os`에서는 다섯 인스턴스가 모두 호출자에 인라인되어 심볼이 남지 않으므로, 인스턴스를 보려고 `process`에 `__attribute__((noinline))`을 붙였습니다.

```text
$ arm-none-eabi-nm -S --size-sort -C bloat.o
00000000 00000024 W void process<Sample>(Sample)
00000000 00000024 W void process<long>(long)
00000000 0000002c W void process<long long>(long long)
00000000 00000042 T run(long, long long, float, double, Sample)
00000000 00000048 W void process<double>(double)
00000000 00000050 W void process<float>(float)
```

다섯 인스턴스의 합은 36 + 36 + 44 + 72 + 80 = 268바이트, 오브젝트 `.text`는 334바이트였습니다. arm-none-eabi에서는 `int32_t`가 `long`이라 `process<long>`으로 보입니다. 같은 소스인데 `float`·`double`이 두 배쯤 큰 것은 `value > 100` 비교와 변환이 FPU 명령·libgcc 호출이 되기 때문입니다. 인스턴스 크기는 소스 줄 수가 아니라 타입이 만드는 명령이 정합니다.

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

위 측정 소스를 이렇게 바꾸면(공통 함수도 `noinline`) 다음과 같습니다.

| | 인스턴스 5개 합 | 공통 함수 | `.text` |
| --- | ---: | ---: | ---: |
| 전체 템플릿 | 268 | — | 334 |
| 공통 부분 분리 | 214 | 24 | 304 |

인스턴스마다 반복되던 세 번의 호출 루프가 `process_common` 24바이트 하나로 모였고, `.text`가 30바이트 줄었습니다. 분리한 뒤에는 같은 플래그로 다시 잽니다.

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

`push_impl`은 `Buffer<T>` 단위로 한 번만 컴파일되고, N별로 인스턴스화되지 않습니다. storage만 다른 크기가 됩니다. `Buffer<int, 16/32/64>` 전역 세 개에 `push`를 한 번씩 부르는 파일로 두 구조를 비교하면 이득과 대가가 함께 보입니다(`push`는 `noinline`).

| | push 코드 | `.text` | `.text.startup` | `.bss` |
| --- | --- | ---: | ---: | ---: |
| N별 클래스 | 22 + 26 + 26 바이트 (세 인스턴스) | 116 | 20 | 460 |
| 공통 base | 28 바이트 (하나) | 72 | 48 | 484 |

push 코드는 세 개에서 하나가 됐지만, 객체마다 `data_` 포인터와 `capacity_`가 생겨 `.bss`가 24바이트 늘었습니다. 두 구조 모두 `.init_array` entry가 있었습니다. N별 클래스는 `T data_[N]`이 초기화되지 않아 기본 생성자가 상수 초기화가 되지 못했고, base 쪽은 생성자가 저장소 포인터를 기록하는 동적 초기화 코드가 48바이트였습니다. 인스턴스가 세 개 정도면 코드 절감과 RAM·startup 증가가 비슷한 크기라, 인스턴스가 많을 때 의미가 있습니다. 이 구조는 기본 복사·이동 시 내부 포인터가 원본의 storage를 가리키게 되므로 여기서는 복사·이동을 금지했습니다. 지원하려면 목적 객체 storage로 포인터를 다시 묶고 원소를 옮기는 구현이 필요합니다.

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

주된 목적은 여러 TU에서의 중복 인스턴스화 작업을 줄이는 것입니다. 최종 바이너리는 작아지지 않습니다. `Container<int>::method`를 쓰는 TU 두 개를 startup 없이 `main`을 진입점으로 링크해 재면 이렇습니다.

| | `a.o` | `b.o` | 명시적 인스턴스화 `inst.o` | 링크한 ELF text |
| --- | ---: | ---: | ---: | ---: |
| 암묵적 인스턴스화 | 48 | 48 | — | 90 |
| `extern template` | 22 | 22 | 32 | 96 |

암묵적 인스턴스화에서는 두 오브젝트가 각각 `method`를 COMDAT 섹션으로 들고 있다가 링커가 하나만 남겼습니다. `extern template`은 각 TU의 코드 생성을 없앴지만 ELF는 6바이트 늘었습니다. 클래스 전체를 명시적으로 인스턴스화하면 쓰지 않는 멤버 `get`까지 정의되기 때문입니다([temp.explicit]/9·10). `inst.o`를 빼고 링크하면 `undefined reference to 'Container<int>::method(int)'`로 실패합니다. 클래스 본문 안에서 정의한 멤버는 inline이라 extern 선언이 있어도 인라인에 쓰일 수 있습니다.

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

`process(T&)`의 분기는 컴파일 시점에 정해지므로 이 함수 안에서는 간접 호출이 사라지고, 각 인스턴스에는 해당 분기만 남습니다. 다만 위 `A`와 `B`는 여전히 `Base`의 가상 함수를 가진 클래스라서 객체의 vptr과 클래스의 vtable은 그대로 남습니다. 그것까지 없애려면 `A`와 `B`에서 `Base` 상속과 `virtual`을 함께 걷어 내야 합니다. 간접 호출과 직접 호출이 각각 어떤 명령이 되는지는 [Part 1-01](/blog/embedded/embedded-cpp/part1-01-cpp-vs-c#4-가상-함수)의 디스어셈블리에 있습니다.

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

증가된 함수 목록이 출력되어 어느 인스턴스가 새로 추가됐는지 보입니다. 이 글을 쓴 Mac에는 bloaty가 없어 이 명령은 실행하지 않았습니다.

### nm으로 인스턴스 개수

```bash
arm-none-eabi-nm --demangle firmware.elf | grep "Container<" | wc -l
# 출력된 심볼 행 수 — 서로 다른 클래스 인스턴스 수와 같지는 않음
```

한 클래스 템플릿의 인스턴스가 늘어나는 추세를 PR마다 기록해 두면 위 패턴을 적용할 시점이 보입니다.

### __PRETTY_FUNCTION__ 디버깅

```cpp
template<typename T>
void func(T x) {
    static_assert(sizeof(T) == 0, "inspect the template instantiation diagnostic");
    // 컴파일 에러 메시지에 인스턴스화 정보
}
```

C++17/20의 static_assert 메시지는 문자열 리터럴이어야 하므로 `__PRETTY_FUNCTION__`을 그대로 메시지로 넘기지 않습니다. 대신 컴파일러가 진단에 인스턴스 정보를 붙입니다. `func(Order{})`로 부르면 g++-16은 `In instantiation of 'void func(T) [with T = Order]'`과 호출 위치(`required from here`)를, Clang 23.1.5는 `static assertion failed due to requirement 'sizeof(Order) == 0'`과 `note: in instantiation of function template specialization 'func<Order>' requested here`를 출력했습니다.

## 컴파일 시간 — 큰 문제

큰 프로젝트에서는 템플릿 폭증이 컴파일 시간도 늘립니다.

```bash
# 측정
time make
# 또는 어느 파일이 느린지
make -j1 -B 2>&1 | ts '[%H:%M:%S]'
```

컴파일 시간이 늘면 다음을 점검합니다.

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

PCH에 들어간 헤더 하나가 바뀌면 PCH를 다시 만들고 이를 쓰는 모든 TU를 다시 컴파일합니다. 그래서 자주 바뀌는 프로젝트 헤더가 아니라 거의 바뀌지 않는 라이브러리 헤더를 넣습니다. 이 글에서는 PCH의 시간 효과를 재지 않았습니다.

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

여러 `.cpp`가 한 TU가 되므로, 파일마다 따로 있던 익명 namespace·`static` 함수의 같은 이름이 충돌하고, 한 파일의 include가 다른 파일에 새어 들어갑니다. 합쳐진 TU 수만큼 병렬 컴파일 단위도 줄어듭니다. 이 글에서는 unity build의 시간 효과를 재지 않았습니다.

## 자주 보는 함정과 안티패턴

### 1. 작은 함수도 템플릿으로 둠
```cpp
template<typename T>
T abs(T x) { return x < 0 ? -x : x; }
```
이 정도 함수는 비용 걱정 대상이 아닙니다. 위 `process` 측정에서도 `noinline` 없이는 다섯 인스턴스가 모두 호출자에 인라인되어 별도 함수가 남지 않았습니다. 다만 이 signed abs는 `INT_MIN`의 부호 반전이 overflow라는 별개의 결함이 있습니다.

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
클래스 템플릿의 일반 멤버 함수는 쓰일 때만 인스턴스화됩니다([temp.inst]/4). 가상 멤버 함수는 다릅니다. `Holder<int>`의 `used()`만 부르는 파일에서 쓰지 않은 일반 멤버 `unused_plain()`은 오브젝트에 없었지만, 쓰지 않은 `virtual unused_virtual()`은 vtable이 가리켜야 하므로 정의가 생겼습니다(표준은 이 경우를 구현에 맡깁니다, [temp.inst]/12). 이 확인은 오브젝트 단계까지이며 링크 결과는 재지 않았습니다.

### 5. macro와 template 혼동
매크로는 텍스트 치환이고 템플릿은 컴파일러 평가입니다. 비슷해 보여도 동작이 다르며, 새 코드에서는 템플릿을 우선합니다.

### 6. 디버깅이 어려움
템플릿 함수의 디버그 정보는 인스턴스마다 생성되어 디버그 정보 크기가 늘어납니다. 디버그 섹션은 할당 섹션이 아니라 Flash 이미지에는 들어가지 않습니다([Part 1-02](/blog/embedded/embedded-cpp/part1-02-compiler-flags#디버그-정보---g3--gdwarf-4)에서 `-g3`가 ELF를 5,492 → 31,848바이트로 키웠지만 `size`와 binary 이미지는 그대로였습니다).

## 측정 소스와 명령

위 표의 숫자를 만든 파일입니다. 모두 Homebrew arm-none-eabi-g++ 16.2.0으로 오브젝트를 만들어 `arm-none-eabi-nm -S --size-sort -C`와 `arm-none-eabi-size -A`로 읽었습니다.

`bloat.cpp`는 `process<T>` 다섯 인스턴스 표와 공통 부분 분리 표에 썼습니다. `-DSPLIT`이 분리 버전입니다.

```cpp
#include <stdint.h>
void log_warning(); void do_cleanup(); void notify_system();
void write_word(uint32_t); void write_dword(uint64_t);
struct Sample { int32_t raw; bool operator>(int t) const { return raw > t; } };
inline void write_to_buffer(int32_t v) { write_word((uint32_t)v); }
inline void write_to_buffer(int64_t v) { write_dword((uint64_t)v); }
inline void write_to_buffer(float v) { write_word((uint32_t)(v * 1000.0f)); }
inline void write_to_buffer(double v) { write_dword((uint64_t)(v * 1000.0)); }
inline void write_to_buffer(Sample s) { write_word((uint32_t)s.raw); }
#ifndef SPLIT
template<typename T>
__attribute__((noinline)) void process(T value) {
    if (value > 100) {
        for (int i = 0; i < 3; ++i) { log_warning(); do_cleanup(); notify_system(); }
    }
    write_to_buffer(value);
}
#else
__attribute__((noinline)) void process_common(bool above) {
    if (above) { for (int i = 0; i < 3; ++i) { log_warning(); do_cleanup(); notify_system(); } }
}
template<typename T>
__attribute__((noinline)) void process(T value) { process_common(value > 100); write_to_buffer(value); }
#endif
void run(int32_t a, int64_t b, float c, double d, Sample e) {
    process(a); process(b); process(c); process(d); process(e);
}
```

```bash
F="-std=c++17 -mcpu=cortex-m4 -mthumb -mfloat-abi=hard -mfpu=fpv4-sp-d16 -Os -ffreestanding -fno-exceptions -fno-rtti"
arm-none-eabi-g++ $F -c bloat.cpp -o b.o          # 전체 템플릿
arm-none-eabi-g++ $F -DSPLIT -c bloat.cpp -o b.o  # 공통 부분 분리
```

`buf.cpp`는 N별 클래스와 공통 base 표에 썼습니다. `-DBASE`가 공통 base 버전입니다.

```cpp
#include <stddef.h>
#ifndef BASE
template<typename T, size_t N>
class Buffer {
    T data_[N]; size_t size_ = 0;
public:
    __attribute__((noinline)) bool push(const T& v) { if (size_ >= N) return false; data_[size_++] = v; return true; }
};
#else
template<typename T>
class BufferBase {
protected:
    T* data_; size_t capacity_; size_t size_ = 0;
    BufferBase(T* d, size_t c) : data_(d), capacity_(c) {}
public:
    __attribute__((noinline)) bool push(const T& v) { if (size_ >= capacity_) return false; data_[size_++] = v; return true; }
};
template<typename T, size_t N>
class Buffer : public BufferBase<T> {
    T storage_[N];
public:
    Buffer() : BufferBase<T>(storage_, N) {}
    Buffer(const Buffer&) = delete;
};
#endif
Buffer<int, 16> a; Buffer<int, 32> b; Buffer<int, 64> c;
int fill(int v) { return a.push(v) + b.push(v) + c.push(v); }
```

`container.h`와 이를 쓰는 `a.cpp`·`b.cpp`(각각 `Container<int> c; c.method(v); return c.get(1);` 한 함수), 명시적 인스턴스화 `inst.cpp`(`template class Container<int>;`), `main.cpp`(`use_a(1) + use_b(2)` 반환)는 `extern template` 표에 썼습니다.

```cpp
#pragma once
template<typename T>
class Container {
    T items_[8]; unsigned n_ = 0;
public:
    __attribute__((noinline)) void method(T v) { for (unsigned i = 0; i < 8; ++i) items_[i] = v * (T)(i + 1); n_ = 8; }
    T get(unsigned i) const { return items_[i]; }
};
#ifdef USE_EXTERN
extern template class Container<int>;
#endif
```

```bash
G="-std=c++17 -mcpu=cortex-m4 -mthumb -Os -ffreestanding -fno-exceptions -fno-rtti"
arm-none-eabi-g++ $G -c buf.cpp -o bf.o            # 또는 -DBASE
arm-none-eabi-g++ $G [-DUSE_EXTERN] -c a.cpp b.cpp inst.cpp main.cpp
arm-none-eabi-g++ $G -nostdlib -Wl,-e,main a.o b.o main.o [inst.o] -lgcc -o fw.elf
```

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

Homebrew Clang 23.1.5, arm64 macOS에서 `clang++ -std=c++17 -Wall -Wextra -pedantic-errors container.cpp extern-main.cpp -o extern-check && ./extern-check`가 exit 0이었습니다. `container.cpp`를 빼면 정의되지 않은 `Container<int>::twice(int) const` 심볼로 링크가 실패합니다.

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

GCC 16.2.0 문서는 C++20 modules 지원을 아직 실험적이라 적고 `-fmodules`로 켜게 합니다. 빌드 시스템도 모듈 의존성을 스캔해야 하므로, 쓰기 전에 설치한 컴파일러와 빌드 시스템으로 최소 프로젝트를 빌드해 봅니다. 이 글에서는 modules 빌드를 하지 않았습니다.

## 정리

- 템플릿 자체의 런타임 dispatch 없이 구현할 수 있지만 연산·컴파일·최종 코드 크기 비용은 확인해야 합니다.
- 큰 함수의 공통 부분을 helper로 분리하고 같은 조건의 최종 링크 결과를 비교합니다.
- `std::variant`는 닫힌 type set을 표현하며 visitor별 인스턴스화 비용도 확인합니다.
- `extern template`과 `template class`로 명시적 인스턴스화를 하면 코드 생성이 한 TU로 모입니다. 최종 크기는 줄지 않고, 쓰지 않는 멤버까지 정의되어 이 예에서는 오히려 늘었습니다(90 → 96바이트).
- 측정 도구는 `nm`(인스턴스 크기), `bloaty`(PR diff), 의도적 `static_assert` 진단(인스턴스 정보)입니다.
- 컴파일 시간을 줄이려면 PCH, unity build, modules(C++20)를 활용합니다.

## 관련 항목

- [Part 2-06: Templates 기초](/blog/embedded/embedded-cpp/part2-06-templates-basics) — template 기본
- [Part 1-04: 코드 크기 분석](/blog/embedded/embedded-cpp/part1-04-code-size-analysis) — bloat 측정 도구
- [Part 2-08: Static Polymorphism](/blog/embedded/embedded-cpp/part2-08-static-polymorphism) — CRTP로 vtable 제거
- [Part 4-02: ETL 라이브러리](/blog/embedded/embedded-cpp/part4-02-etl-library) — heap 없는 STL

## 다음 글

[Part 2-08: Static Polymorphism](/blog/embedded/embedded-cpp/part2-08-static-polymorphism) — CRTP를 통해 virtual 함수 없이 컴파일 타임 다형성을 구현합니다.
