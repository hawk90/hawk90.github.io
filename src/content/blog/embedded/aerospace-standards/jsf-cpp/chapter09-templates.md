---
title: "Ch 9: Templates (Rule 101-105)"
date: 2025-09-30T10:00:00
description: "JSF C++ Rule 101-105 — 단순 generic만 허용, template metaprogramming 회피, code bloat 우려, F-35 적용."
tags: [jsf-cpp, templates, generic, code-bloat, metaprogramming, cpp03]
series: "JSF C++"
seriesOrder: 9
draft: false
---

JSF C++의 *template 정책* — *단순 generic만 허용*, *metaprogramming 회피*, *code bloat 신중*. C++03 시대의 *template은 매우 단순*. 이 장은 *각 rule + template 함정 + modern progression*까지.

## AV Rule 101 — Template 사용 제한

```
AV Rule 101 (Should)
"Templates shall be reviewed to ensure their use is necessary
 and not creating unnecessary complexity."
```

JSF는 *template 보수적 사용*. *necessary*에만.

```cpp
// 정당한 사용 — generic container
template <typename T>
class CFixedArray {
public:
    CFixedArray() : m_size(0) {}
    
    int Push(const T &p_value) {
        if (m_size >= MAX_SIZE) return -1;
        m_data[m_size++] = p_value;
        return 0;
    }
    
    T& Get(int p_index) {
        return m_data[p_index];
    }

private:
    static const int MAX_SIZE = 100;
    T m_data[MAX_SIZE];
    int m_size;
};

// 사용
CFixedArray<int> int_array;
CFixedArray<float> float_array;
CFixedArray<CFlightState> state_array;
```

*같은 logic*이 *다른 type에 적용*. Template으로 *코드 중복 제거*.

### 부당한 사용

```cpp
// 회피 — over-templated
template <typename T, typename Allocator, typename Comparator, typename Hasher>
class CHashTable {
    /* 4 template params, 복잡 */
};

// Good — fixed
class CHashTable {
    /* int → int hash table only, simple */
};
```

JSF는 *수많은 type combination*을 *지원할 필요 없음*. *Mission specific*.

## AV Rule 102 — Function Template

```cpp
// Good — function template (단순)
template <typename T>
T Max(const T &a, const T &b) {
    return (a > b) ? a : b;
}

int x = Max(5, 10);          // int instantiation
float y = Max(3.14F, 2.71F); // float instantiation
```

`Max`가 *모든 type에 적용*. operator `>` 정의된 type만.

### Function Template vs Macro

```cpp
// 위반 (AV Rule 26) — macro
#define MAX(a, b) ((a) > (b) ? (a) : (b))

// Good — template
template <typename T>
T Max(const T &a, const T &b) {
    return (a > b) ? a : b;
}
```

Template이 *type-safe + debugger 친화*.

## AV Rule 103 — Class Template

```cpp
// 단순 class template
template <typename T, int N>
class CFixedVector {
public:
    void Push(const T &p_value) {
        if (m_size < N) {
            m_data[m_size++] = p_value;
        }
    }
    
    T Pop() {
        return (m_size > 0) ? m_data[--m_size] : T();
    }

private:
    T m_data[N];
    int m_size{0};   // C++11 in-class init
};

// 사용
CFixedVector<int, 10> v1;       // int 10개
CFixedVector<float, 100> v2;    // float 100개
```

각 instantiation이 *완전 별도 class*. *Compile-time*에 결정.

## AV Rule 104 — Template Specialization 회피

```
AV Rule 104 (Should)
"Template specialization shall be avoided when possible."
```

```cpp
// Primary template
template <typename T>
class CStorage {
public:
    void Store(const T &p_value) { m_data = p_value; }
    T Get() const { return m_data; }
private:
    T m_data;
};

// 위반 — specialization
template <>
class CStorage<bool> {
public:
    void Store(bool p_value) {
        m_packed_data |= (p_value ? 1 : 0);  // bit packing
    }
    bool Get() const { return (m_packed_data & 1) != 0; }
private:
    uint8_t m_packed_data;
};
```

Specialization이 *다른 implementation*. *예상치 못한 동작* 위험 (`std::vector<bool>` 함정).

JSF는 *avoid* — 단 *특수 필요* 시 OK.

## AV Rule 105 — Template 정의는 .h에

```
AV Rule 105 (Should)
"Templates shall be defined in header files (since separate compilation
 of templates is not well-supported in C++03)."
```

C++03에서 *template separate compilation* 거의 안 됨. *전체 정의가 header에*.

```cpp
// fixed_vector.h
template <typename T, int N>
class CFixedVector {
public:
    void Push(const T &p_value);   // declaration
    T Pop();
private:
    T m_data[N];
    int m_size;
};

// Template 정의도 header에
template <typename T, int N>
void CFixedVector<T, N>::Push(const T &p_value) {
    if (m_size < N) {
        m_data[m_size++] = p_value;
    }
}

template <typename T, int N>
T CFixedVector<T, N>::Pop() {
    return (m_size > 0) ? m_data[--m_size] : T();
}
```

C++11의 *`export` keyword*가 *separate compilation 도입 시도*. 실패. 폐지.

C++20의 *Modules*가 *진정 해결*. 단 *항공 채택 늦음*.

## Template Metaprogramming — JSF 회피

C++03의 *TMP (Template Metaprogramming)*가 *compile-time 계산 가능*. 단 *극도로 복잡*.

```cpp
// TMP 예 — Factorial at compile time
template <int N>
struct Factorial {
    static const int value = N * Factorial<N - 1>::value;
};

template <>
struct Factorial<0> {
    static const int value = 1;
};

const int kF5 = Factorial<5>::value;  // 120 at compile time
```

JSF는 *회피*:
- *코드 가독성*
- *Compile time 큰 영향*
- *Debug 어려움*
- *Error message 끔찍*

C++11+의 *`constexpr`*가 *훨씬 깔끔*:

```cpp
// C++11 constexpr
constexpr int Factorial(int n) {
    return (n <= 1) ? 1 : n * Factorial(n - 1);
}

const int kF5 = Factorial(5);  // 120 at compile time
```

JSF C++03 원본은 TMP 가능. *권장 X*.

## Template 함정 — Code Bloat

```cpp
template <typename T>
class CSensor {
public:
    int Read() { /* 100 lines of code */ }
    int Calibrate() { /* 50 lines */ }
    int Reset() { /* 30 lines */ }
    /* 등등 — 총 500 lines */
};

// 사용
CSensor<int8_t> s1;
CSensor<int16_t> s2;
CSensor<int32_t> s3;
CSensor<float> s4;
CSensor<double> s5;
```

각 instantiation이 *500 lines × type 수*. 5 type이면 *2500 lines binary*. 비록 *동일 logic*이지만 *별도 binary*.

해결:
- *Common base class*에 non-template logic
- *Template은 minimal interface*

```cpp
class CSensorBase {
public:
    int Calibrate() { /* common 50 lines */ }
    int Reset() { /* common 30 lines */ }

protected:
    int m_calibrationOffset;
};

template <typename T>
class CSensor : public CSensorBase {
public:
    int Read(T *p_pValue) {
        /* type-specific small code */
        *p_pValue = static_cast<T>(m_rawValue);
        return 0;
    }

private:
    int m_rawValue;
};
```

Common code가 *non-template*. Type-specific만 template. Binary 작음.

## Template Argument 추론

```cpp
template <typename T>
T Max(T a, T b) {
    return (a > b) ? a : b;
}

int x = Max(5, 10);          // T = int (자동)
int x = Max<int>(5, 10);     // T = int (명시)

// 함정
int x = Max(5, 10.0);        // 컴파일 에러 — T가 int인가 double인가?

// 해결
int x = Max<int>(5, 10);            // 명시
int x = Max(5, static_cast<int>(10.0));  // type 일치
```

C++11의 `auto`가 *function signature 추론*. C++03 원본은 *수동 지정 필요*.

## SFINAE — JSF 회피

```cpp
// SFINAE — Substitution Failure Is Not An Error
template <typename T>
typename std::enable_if<std::is_integral<T>::value, T>::type
Process(T value) {
    /* integer-only logic */
}

template <typename T>
typename std::enable_if<std::is_floating_point<T>::value, T>::type
Process(T value) {
    /* float-only logic */
}
```

SFINAE = *template metaprogramming*. JSF 회피.

C++20의 *Concepts*가 *훨씬 깔끔*:

```cpp
// C++20
template <typename T> requires std::integral<T>
T Process(T value) { /* ... */ }

template <typename T> requires std::floating_point<T>
T Process(T value) { /* ... */ }
```

JSF C++03 + post-update이 *서서히 modern C++ 도입*. 하지만 *Concepts는 아직*.

## Template + RTTI 회피 — Tag Dispatch

JSF 스타일 *compile-time dispatch*:

```cpp
struct SensorTagTemperature {};
struct SensorTagPressure {};
struct SensorTagAltitude {};

template <typename SensorTag>
class CSensor {
public:
    int Read(int *p_pValue);
    int Calibrate();
};

// Specialization per tag (단순)
template <>
int CSensor<SensorTagTemperature>::Read(int *p_pValue) {
    /* temperature-specific */
    return 0;
}

template <>
int CSensor<SensorTagPressure>::Read(int *p_pValue) {
    /* pressure-specific */
    return 0;
}

// 사용
CSensor<SensorTagTemperature> temp_sensor;
CSensor<SensorTagPressure> pressure_sensor;
```

Tag이 *compile-time type*. *dynamic_cast 없이* type-specific dispatch.

## Template + Composition

```cpp
// Template Pool — fixed-size object pool
template <typename T, int N>
class CObjectPool {
public:
    CObjectPool() : m_count(0) {
        for (int i = 0; i < N; i++) {
            m_used[i] = false;
        }
    }
    
    T* Acquire() {
        for (int i = 0; i < N; i++) {
            if (!m_used[i]) {
                m_used[i] = true;
                m_count++;
                return &m_storage[i];
            }
        }
        return NULL;
    }
    
    void Release(T *p_pObj) {
        int index = static_cast<int>(p_pObj - m_storage);
        if (index >= 0 && index < N && m_used[index]) {
            m_used[index] = false;
            m_count--;
        }
    }
    
    int GetUsedCount() const { return m_count; }

private:
    T m_storage[N];     // 정적 storage
    bool m_used[N];      // 사용 여부
    int m_count;
};

// 사용 — flight message pool
class CFlightMessage { /* ... */ };
CObjectPool<CFlightMessage, 32> g_messagePool;

CFlightMessage *msg = g_messagePool.Acquire();
if (msg) {
    msg->Init(/* ... */);
    Send(msg);
    g_messagePool.Release(msg);
}
```

Template이 *fixed-size pool*. *No dynamic allocation* (JSF 정신).

## Modern C++ Template — KF-21 비교

```cpp
// JSF C++03
template <typename T, int N>
class CFixedVector {
public:
    void Push(const T &p_value);
    T Pop();
private:
    T m_data[N];
    int m_size;
};

// Modern C++ (C++11+)
template <typename T, std::size_t N>
class FixedVector {
public:
    constexpr void Push(const T& value) {
        if (size_ < N) data_[size_++] = value;
    }
    
    [[nodiscard]] constexpr T Pop() {
        return (size_ > 0) ? std::move(data_[--size_]) : T{};
    }
    
    [[nodiscard]] constexpr std::size_t Size() const noexcept { return size_; }
    [[nodiscard]] constexpr std::size_t Capacity() const noexcept { return N; }

private:
    std::array<T, N> data_{};  // C++11
    std::size_t size_{0};
};

// Modern usage
FixedVector<int, 10> v;
v.Push(5);
v.Push(10);
auto x = v.Pop();
```

Modern 차이:
- `std::size_t` (type safety)
- `constexpr` (compile-time evaluation)
- `[[nodiscard]]` (return value 강제 사용)
- `std::array` (better than C array)
- `std::move` (move semantics)
- `{}` brace init
- *no Hungarian*

## Template Argument 검증

```cpp
template <typename T, int N>
class CFixedVector {
public:
    // ...
};

// 위반 — N = 0 또는 음수 가능
CFixedVector<int, 0> v0;
CFixedVector<int, -5> vn;

// Good — compile-time assertion
template <typename T, int N>
class CFixedVector {
    // C++03: simulated static_assert
    typedef char _N_must_be_positive[N > 0 ? 1 : -1];  // 0/negative → -1 array (compile error)
    
    // C++11+: real static_assert
    // static_assert(N > 0, "N must be positive");

public:
    /* ... */
};
```

C++03의 *trick assertion*. C++11의 *`static_assert`가 깔끔*.

## Template Instantiation Control

```cpp
// 위반 — implicit instantiation 폭주
// header.h
template <typename T> void Foo(T x) { /* 100 lines */ }

// many.cpp uses Foo<int>, Foo<float>, Foo<double>, ...
// Each .cpp re-instantiates → linker가 합치지만 compile time 큼

// Good — explicit instantiation
// header.h
template <typename T> void Foo(T x);

// foo.cpp
template <typename T> void Foo(T x) { /* 100 lines */ }

// 명시 instantiation (한 곳만)
template void Foo<int>(int);
template void Foo<float>(float);

// 다른 .cpp는 declaration만 see, linker가 foo.cpp에서 해결
```

이런 *explicit instantiation*이 *compile time + binary size 감소*. JSF에서 권장.

## Variadic Templates — JSF 금지

C++11이 *variadic template* 도입:

```cpp
// C++11 — variadic template
template <typename... Args>
void LogMessage(const char *fmt, Args... args) {
    /* ... */
}

LogMessage("error %d in %s", 42, "module");
```

C의 *varargs*보다 *type-safe*. 단 JSF C++03 시기에는 *없음*.

C++03에서 *수동 overload*:

```cpp
// C++03
inline void LogMessage(const char *fmt) { /* ... */ }

template <typename T1>
void LogMessage(const char *fmt, T1 a) { /* ... */ }

template <typename T1, typename T2>
void LogMessage(const char *fmt, T1 a, T2 b) { /* ... */ }

// 등 — 수동 overload 다수
```

Boost가 *workaround tuple*. 복잡.

## F-35 Template Usage — 실전

F-35에서 *typical template 사용*:

```cpp
// 1. Fixed-size container
CFixedArray<int, 100> int_buf;
CFixedArray<CCanMessage, 32> can_msg_pool;

// 2. Object pool
CObjectPool<CTask, 16> task_pool;

// 3. Type-safe enum (C++03 era)
template <typename Tag>
class CStrongEnum {
public:
    explicit CStrongEnum(int value) : m_value(value) {}
    int GetValue() const { return m_value; }
private:
    int m_value;
};

struct AltitudeTag {};
struct AirSpeedTag {};

typedef CStrongEnum<AltitudeTag> CAltitude;
typedef CStrongEnum<AirSpeedTag> CAirSpeed;

CAltitude alt(10000);
CAirSpeed spd(250);

void ProcessAltitude(CAltitude a) { /* ... */ }
ProcessAltitude(alt);   // OK
ProcessAltitude(spd);   // 컴파일 에러 — 다른 type
```

Strong type이 *parameter mixing 차단*. C++03 era에 *이런 trick*.

## Template Pitfalls

### Pitfall 1 — Definition 누락

```cpp
// header.h
template <typename T>
void Foo(T x);  // declaration only

// foo.cpp
template <typename T>
void Foo(T x) { /* ... */ }  // 정의가 cpp에

// main.cpp
#include "header.h"
int main() {
    Foo(5);  // linker error — Foo<int> 정의 못 찾음
}
```

해결: *header에 정의 모두* (AV Rule 105). 또는 *explicit instantiation*.

### Pitfall 2 — Dependent Name

```cpp
template <typename T>
class CBase {
public:
    void Helper();
};

template <typename T>
class CDerived : public CBase<T> {
public:
    void Method() {
        Helper();   // 컴파일 에러 — dependent name
    }
};

// Fix
template <typename T>
class CDerived : public CBase<T> {
public:
    void Method() {
        this->Helper();         // OK (this 사용)
        CBase<T>::Helper();     // OK (명시 base)
    }
};
```

Template의 *two-phase lookup*이 *dependent name 까다로움*. 명시 필수.

### Pitfall 3 — Specialization Order

```cpp
// header.h
template <typename T>
void Foo(T x) { /* generic */ }

// specialization.cpp
template <>
void Foo<int>(int x) { /* int-specific */ }

// main.cpp
#include "header.h"
// specialization.h *not included*

int main() {
    Foo(5);  // generic 호출 — int-specific 보이지 않음
}
```

Specialization이 *모든 user에 visible*해야 (header에).

## Template Compile Time

```
간단 measurement:

10 lines no template:        0.05 sec
1000 lines no template:      0.3 sec

template <T> class with 100 lines:
  no instantiation:          0.05 sec (header만 parse)
  1 instantiation:           0.1 sec
  10 instantiations:         0.5 sec
  100 instantiations:        4 sec
  1000 instantiations:       40 sec

Heavy TMP (boost spirit 등):
  100 lines:                 5-30 sec

Project total:
  Standard C++ code:         1 sec / KLoC
  Template-heavy code:       5-50 sec / KLoC

→ Template 남용이 *큰 build time 증가*
```

JSF는 *minimal template*. *Build time 빠름*.

## Modern C++ Template — KF-21 가능

```cpp
// Concepts (C++20) — clean SFINAE 대체
template <typename T>
concept Numeric = std::is_arithmetic_v<T>;

template <Numeric T>
T Average(const std::vector<T>& values) {
    T sum = T{};
    for (auto v : values) sum += v;
    return sum / static_cast<T>(values.size());
}

// Range concepts (C++20)
template <std::ranges::range R>
auto Sum(R&& range) {
    return std::ranges::fold_left(range, 0, std::plus<>{});
}

// Compile-time computation (C++14+)
template <int N>
constexpr int Factorial() {
    int result = 1;
    for (int i = 2; i <= N; i++) result *= i;
    return result;
}

constexpr int kF10 = Factorial<10>();
```

KF-21 같은 *새 항공 프로젝트*가 *Modern C++ template 활용 가능*. F-35 legacy는 *C++03 한정*.

## CRTP — Curiously Recurring Template Pattern

```cpp
// CRTP — base가 derived의 template으로
template <typename Derived>
class CBase {
public:
    void Interface() {
        // static_cast로 derived 호출 (no virtual)
        static_cast<Derived*>(this)->Implementation();
    }
};

class CDerived : public CBase<CDerived> {
public:
    void Implementation() {
        /* ... */
    }
};

CDerived d;
d.Interface();  // CDerived::Implementation 호출 (no vtable)
```

CRTP가 *static polymorphism*. *Virtual cost 없이* polymorphism. JSF는 *복잡 회피*하지만 가능.

## Template + JSF Coding Standard

```
JSF Template 권장:

✓ 단순 generic container
✓ Object pool template
✓ Type-safe strong type
✓ Algorithm template (sort 등)

✗ Template metaprogramming
✗ SFINAE
✗ 깊은 template hierarchy
✗ Variadic templates (C++11+, 원본 외)
✗ Template과 macro 혼용
```

*"Simple is better"* — JSF의 template 정신.

## Common Findings — Templates

```
실전 finding:

1. "Template definition .cpp에 있음"
   → AV Rule 105 위반

2. "Template metaprogramming 사용 (Factorial<N>)"
   → AV Rule 101 위반 (necessary 아님)

3. "Template specialization 다수"
   → AV Rule 104 위반

4. "Variadic template 사용 (C++03 시기 제외)"
   → C++11+ 기능 사용

5. "Dependent name (this-> 누락)"
   → 컴파일 에러 (some 컴파일러는 lax)

6. "Implicit instantiation 폭주 → binary 큼"
   → Explicit instantiation 권장
```

## 정리

- **AV Rule 101**: Template *necessary*에만.
- **AV Rule 102**: Function template — macro 대체.
- **AV Rule 103**: Class template — 단순 generic container.
- **AV Rule 104**: Specialization 회피.
- **AV Rule 105**: Template 정의 header에 (C++03 separate compilation 미지원).
- *TMP, SFINAE 회피* — 복잡 + debug 어려움.
- *Code bloat* — 각 instantiation 별도 binary.
- *Common base + minimal template*으로 bloat 감소.
- *Strong type, object pool*이 JSF의 typical template 사용.
- Modern C++14/20: `concepts`, `constexpr`이 *훨씬 깔끔*.

## 다음 장 예고

10장은 *Exceptions, Memory, Library, Multi-threading* (Rule 191-220) — JSF의 *exception 완전 금지*, *new/delete 거의 금지*.

## 관련 항목

- [Ch 8 — Inheritance, Virtual](/blog/embedded/aerospace-standards/jsf-cpp/chapter08-classes-inheritance)
- [Ch 10 — Exceptions, Memory, Library](/blog/embedded/aerospace-standards/jsf-cpp/chapter10-exceptions-memory-library)
- [AUTOSAR C++14 Ch 6 — Templates](/blog/embedded/car-standards/autosar-cpp/chapter06-templates)
- [AUTOSAR C++14 Ch 12 — Compile-time C++](/blog/embedded/car-standards/autosar-cpp/chapter12-compile-time-cpp)
