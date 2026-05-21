---
title: "Ch 9: Templates"
date: 2026-05-18T10:00:00
description: "JSF C++ 일반 template 정책 — 단순 generic, metaprogramming 회피, code bloat 신중."
tags: [jsf-cpp, templates, generic, code-bloat, metaprogramming, cpp03]
series: "JSF C++"
seriesOrder: 9
draft: false
---

JSF C++의 *template 정책* 일반 — *단순 generic 허용*, *metaprogramming 회피*, *code bloat 신중*. C++03 시기의 *template 한계*도 함께. *정확한 AV Rule 번호와 wording은 원문 PDF 참조*.

## Template 사용 — 보수적 접근

JSF의 *기본 입장*: template은 *necessary*에만, 단순한 generic에 한정. 복잡도가 추가되면 *review 부담* 증가.

```cpp
// 정당한 사용 — generic fixed-size container
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

CFixedArray<int> int_array;
CFixedArray<float> float_array;
```

같은 logic이 *다른 type에 적용*. Template으로 *코드 중복 제거*.

### 부당한 사용

```cpp
// 회피 — over-templated
template <typename T, typename Allocator, typename Comparator, typename Hasher>
class CHashTable { /* 4 template params, 복잡 */ };

// Good — mission specific
class CIntIntHashTable { /* int → int 만, simple */ };
```

JSF는 *수많은 type combination 지원할 필요 없음*. *Mission specific* 우선.

## Function Template

```cpp
// Good — function template (단순)
template <typename T>
T Max(const T &a, const T &b) {
    return (a > b) ? a : b;
}

int x = Max(5, 10);
float y = Max(3.14F, 2.71F);
```

### Function Template vs Macro

```cpp
// 회피 — macro
#define MAX(a, b) ((a) > (b) ? (a) : (b))

// Good — template (type-safe, debugger 친화)
template <typename T>
T Max(const T &a, const T &b) {
    return (a > b) ? a : b;
}
```

Template이 *type-safe + debug 친화*.

## Class Template

```cpp
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
    int m_size;
};

CFixedVector<int, 10> v1;
CFixedVector<float, 100> v2;
```

각 instantiation이 *완전 별도 class*. *Compile-time*에 결정.

## Template Specialization — 회피

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

// 회피 — specialization (다른 implementation, 예상치 못한 동작 위험)
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

Specialization이 *primary template과 다른 동작*. `std::vector<bool>`의 *유명 함정*과 같은 부류. JSF는 *필요시 OK, 가능하면 회피*.

## Template 정의 — Header에

C++03에서 *template separate compilation*은 *지원 안 됨*. *전체 정의가 header에* 있어야 함.

```cpp
// fixed_vector.h
template <typename T, int N>
class CFixedVector {
public:
    void Push(const T &p_value);
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
```

C++11의 *`export` keyword*가 *separate compilation*을 시도했으나 폐지. *C++20 Modules*가 진정한 해결이지만 *항공 분야 채택은 늦음*.

## Template Metaprogramming — 회피

C++03의 *TMP*가 *compile-time 계산 가능*. 단 *극도로 복잡*.

```cpp
// TMP — Factorial at compile time
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
- 코드 가독성 저하
- Compile time 영향
- Debug 어려움
- Error message가 끔찍

C++11+의 *`constexpr`*가 *훨씬 깔끔*:

```cpp
// C++11 constexpr
constexpr int Factorial(int n) {
    return (n <= 1) ? 1 : n * Factorial(n - 1);
}

const int kF5 = Factorial(5);
```

## Code Bloat — 주의

```cpp
template <typename T>
class CSensor {
public:
    int Read() { /* 100 lines */ }
    int Calibrate() { /* 50 lines */ }
    int Reset() { /* 30 lines */ }
    /* 등 총 500 lines */
};

CSensor<int8_t> s1;
CSensor<int16_t> s2;
CSensor<float> s3;
// 각 instantiation이 500 lines × type 수
```

각 instantiation은 *동일 logic이라도 별도 binary*. 다수 type 사용 시 *binary 폭증*.

### 해결 — Common base + minimal template

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
int y = Max<int>(5, 10);     // T = int (명시)

// 함정
int z = Max(5, 10.0);        // 컴파일 에러 — T가 int인가 double인가?

// 해결
int z = Max<int>(5, 10);
```

C++11의 `auto`가 *function signature 추론*. C++03에서는 명시 필요.

## SFINAE — 회피

```cpp
// SFINAE — Substitution Failure Is Not An Error
template <typename T>
typename std::enable_if<std::is_integral<T>::value, T>::type
Process(T value) { /* integer-only */ }

template <typename T>
typename std::enable_if<std::is_floating_point<T>::value, T>::type
Process(T value) { /* float-only */ }
```

SFINAE는 *template metaprogramming*. JSF 회피.

C++20의 *Concepts*가 훨씬 깔끔:

```cpp
template <typename T> requires std::integral<T>
T Process(T value) { /* ... */ }
```

## Tag Dispatch — Compile-time 분기

JSF 스타일의 *RTTI 없는 compile-time dispatch*:

```cpp
struct SensorTagTemperature {};
struct SensorTagPressure {};

template <typename SensorTag>
class CSensor {
public:
    int Read(int *p_pValue);
};

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

CSensor<SensorTagTemperature> temp_sensor;
CSensor<SensorTagPressure> pressure_sensor;
```

Tag이 *compile-time type*. *dynamic_cast 없이* type-specific dispatch.

## Object Pool 예시

```cpp
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

private:
    T m_storage[N];
    bool m_used[N];
    int m_count;
};
```

Template이 *fixed-size pool*. *No dynamic allocation* (JSF 정신).

## Strong Type — Tag-based typedef

```cpp
template <typename Tag>
class CStrongInt {
public:
    explicit CStrongInt(int value) : m_value(value) {}
    int GetValue() const { return m_value; }
private:
    int m_value;
};

struct AltitudeTag {};
struct AirSpeedTag {};

typedef CStrongInt<AltitudeTag> CAltitude;
typedef CStrongInt<AirSpeedTag> CAirSpeed;

CAltitude alt(10000);
CAirSpeed spd(250);

void ProcessAltitude(CAltitude a);
ProcessAltitude(alt);   // OK
ProcessAltitude(spd);   // 컴파일 에러 — 다른 type
```

Strong type이 *parameter mixing 차단*. *Unit-bearing 값* 안전.

## Template Argument 검증

```cpp
template <typename T, int N>
class CFixedVector {
    // C++03 trick — N <= 0이면 컴파일 에러
    typedef char _N_must_be_positive[N > 0 ? 1 : -1];
    
    // C++11+ — 깔끔한 static_assert
    // static_assert(N > 0, "N must be positive");

public:
    /* ... */
};
```

C++03의 *trick assertion*. C++11의 `static_assert`가 표준 방법.

## Template Instantiation Control

```cpp
// 회피 — implicit instantiation 폭주
// header.h
template <typename T> void Foo(T x) { /* 100 lines */ }

// 다수 .cpp가 Foo<int>, Foo<float> 사용 → 각 .cpp마다 re-instantiate

// Good — explicit instantiation
// header.h
template <typename T> void Foo(T x);

// foo.cpp
template <typename T> void Foo(T x) { /* 100 lines */ }
template void Foo<int>(int);
template void Foo<float>(float);
```

Explicit instantiation이 *compile time + binary size 감소*.

## Variadic Templates — C++03 외

C++11이 *variadic template* 도입. *C++03에는 없음*.

```cpp
// C++11+
template <typename... Args>
void LogMessage(const char *fmt, Args... args) { /* ... */ }

// C++03 — 수동 overload 다수
inline void LogMessage(const char *fmt) { /* ... */ }

template <typename T1>
void LogMessage(const char *fmt, T1 a) { /* ... */ }

template <typename T1, typename T2>
void LogMessage(const char *fmt, T1 a, T2 b) { /* ... */ }
```

JSF 원본 시기에는 *수동 overload* 또는 *Boost workaround*. 복잡.

## Template Pitfalls

### Pitfall 1 — Definition 누락

```cpp
// header.h
template <typename T>
void Foo(T x);  // declaration only

// foo.cpp
template <typename T>
void Foo(T x) { /* ... */ }

// main.cpp
Foo(5);  // linker error
```

해결: header에 정의 전체. 또는 explicit instantiation.

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
        this->Helper();         // OK
        CBase<T>::Helper();     // OK
    }
};
```

Template의 *two-phase lookup* 때문. `this->` 또는 명시 base.

### Pitfall 3 — Specialization Visibility

```cpp
// header.h
template <typename T>
void Foo(T x) { /* generic */ }

// specialization.cpp
template <>
void Foo<int>(int x) { /* int-specific */ }

// main.cpp (specialization 보지 않음)
Foo(5);  // generic 호출 — int-specific invisible
```

Specialization은 *모든 user에 visible* (header에).

## CRTP — Static Polymorphism

```cpp
template <typename Derived>
class CBase {
public:
    void Interface() {
        static_cast<Derived*>(this)->Implementation();
    }
};

class CDerived : public CBase<CDerived> {
public:
    void Implementation() { /* ... */ }
};

CDerived d;
d.Interface();   // CDerived::Implementation 호출 (no vtable)
```

CRTP가 *virtual cost 없이 polymorphism*. JSF는 복잡 회피하지만 *가능한 패턴*.

## JSF Template — 일반 권장 패턴

**Template 일반 권장:**

- ✓ 단순 generic container (fixed-size)
- ✓ Object pool template
- ✓ Strong type (tag-based)
- ✓ Algorithm template (sort 등)

**회피:**

- ✗ Template metaprogramming
- ✗ SFINAE
- ✗ 깊은 template hierarchy
- ✗ Variadic templates (C++03 외)
- ✗ Template과 macro 혼용

*"Simple is better"* — JSF의 template 정신.

## Modern C++ Template

JSF C++03 원본은 *modern template 기능 외*. 후속 표준이 *concepts, constexpr*을 폭넓게 권장:

```cpp
// C++20 Concepts
template <typename T>
concept Numeric = std::is_arithmetic_v<T>;

template <Numeric T>
T Average(const std::vector<T>& values) {
    T sum = T{};
    for (auto v : values) sum += v;
    return sum / static_cast<T>(values.size());
}

// C++14+ constexpr
template <int N>
constexpr int Factorial() {
    int result = 1;
    for (int i = 2; i <= N; i++) result *= i;
    return result;
}
```

새 프로젝트라면 *AUTOSAR C++14 / MISRA C++:2023*이 *modern template 가이드 제공*.

## 일반적인 정적 분석 finding (templates)

**실전 finding:**

**1. Template 정의가 .cpp에 있음**

- → header에 두기

**2. Template metaprogramming 사용**

- → necessary 아닌 경우 회피

**3. Specialization 다수**

- → 가능하면 단일 template로

**4. Implicit instantiation 폭주 → binary 큼**

- → explicit instantiation 권장

**5. Dependent name (this-> 누락)**

- → 컴파일 에러

## 정리

- Template은 *necessary*에만, *단순 generic*에 한정.
- Function template — macro의 type-safe 대체.
- Class template — 단순 generic container, fixed-size.
- Specialization 회피 (가능 시).
- C++03 template은 *header에 정의 전체* (separate compilation 미지원).
- *TMP, SFINAE 회피* — 복잡 + debug 어려움.
- *Code bloat* — common base + minimal template으로 감소.
- *Strong type, object pool*이 일반적 패턴.
- Modern C++14/20: `concepts`, `constexpr`이 *훨씬 깔끔*.

## 다음 장 예고

10장은 *Exceptions, Memory, Library, Multi-threading*.

## 관련 항목

- [Ch 8 — Inheritance, Virtual](/blog/embedded/aerospace-standards/jsf-cpp/chapter08-classes-inheritance)
- [Ch 10 — Exceptions, Memory, Library](/blog/embedded/aerospace-standards/jsf-cpp/chapter10-exceptions-memory-library)
- [AUTOSAR C++14 Ch 6 — Templates](/blog/embedded/automotive/autosar-cpp/chapter06-templates)
- [AUTOSAR C++14 Ch 12 — Compile-time C++](/blog/embedded/automotive/autosar-cpp/chapter12-compile-time-cpp)
