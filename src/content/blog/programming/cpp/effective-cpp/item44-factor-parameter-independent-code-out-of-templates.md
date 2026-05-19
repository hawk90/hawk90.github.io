---
title: "항목 44: 매개변수와 무관한 코드는 템플릿 밖으로 빼라"
date: 2026-05-04T20:00:00
description: "code bloat 줄이기 — base 클래스 추출, 비-타입 매개변수 → 런타임 인자, 포인터 타입 통합."
tags: [C++, Effective C++, Template, Code Bloat]
series: "Effective C++"
seriesOrder: 44
draft: true
---

## 왜 이 항목이 중요한가?

템플릿의 단점 중 하나가 **code bloat**다. 각 인스턴스마다 새 코드가 생성되므로, 매개변수에 따라 사실상 같은 로직이 여러 번 컴파일되어 바이너리 크기가 커진다.

흔한 세 가지 bloat 패턴이 있다.

- **비-타입 매개변수의 중복** — `Matrix<int, 3, 3>`과 `Matrix<int, 4, 4>`가 같은 알고리즘을 두 번 컴파일.
- **포인터 타입의 중복** — `Stack<int*>`, `Stack<Widget*>`이 사실상 같은 코드를 인스턴스화.
- **호출 패턴이 비슷한 함수의 중복** — 동일한 멤버 함수 본문이 인스턴스마다 복사.

해결책은 매개변수에 무관한 부분을 별도 함수/클래스로 분리해 한 번만 컴파일되게 하는 것이다. 임베디드 시스템이나 큰 라이브러리에선 결정적인 최적화다.

## 개요

템플릿은 인스턴스마다 새 코드를 생성한다. 같은 로직이 여러 인스턴스에 중복되면 **code bloat**(코드 부풀어 오름)가 일어난다. 매개변수에 무관한 부분을 별도 함수/클래스로 분리하면 한 번만 컴파일되어 부피가 줄어든다. 이 항목은 세 가지 흔한 bloat 패턴과 그 해결을 다룬다.

## 필수 개념: 템플릿 인스턴스화의 부피

> **초보자를 위한 배경 지식**

<br>

```cpp
template<typename T>
void process(T x) { /* 100줄 코드 */ }

process(1);          // process<int> 인스턴스 — 100줄
process(3.14);       // process<double> — 또 100줄
process("hello");    // process<const char*> — 또 100줄

// 총 300줄의 코드가 바이너리에
```

각 인스턴스가 별개의 함수 — 같은 100줄 코드도 N번 컴파일·링크. T가 같으면 한 번이지만, 다른 T마다 별도.

이게 본질적 비용이지만 — **불필요한 중복**을 줄이는 게 이 항목의 목표.

## 함정 1 — 타입 + 비-타입 매개변수의 곱셈

```cpp
template<typename T, std::size_t N>
class SquareMatrix {
public:
    void invert();      // 역행렬 계산 알고리즘 — 100+ 줄
};

SquareMatrix<double, 5>  s5;
SquareMatrix<double, 10> s10;
SquareMatrix<double, 15> s15;
SquareMatrix<float,  5>  f5;
// invert() 코드가 4벌!
// 그러나 (double, N) 인스턴스의 invert는 거의 동일 — N만 다름
```

타입 `T`만 다르면 어쩔 수 없지만 — `N`만 다른 인스턴스끼리는 사실상 같은 코드. 컴파일러는 이를 알지 못함.

## 해결 1 — base 클래스로 N 분리

```cpp
template<typename T>
class SquareMatrixBase {
protected:
    SquareMatrixBase(std::size_t n, T* mat)
        : size(n), data(mat) {}

    void invert(std::size_t matrixSize);    // N에 의존 안 함 — T별로 1벌만
private:
    std::size_t size;
    T*          data;
};

template<typename T, std::size_t N>
class SquareMatrix : private SquareMatrixBase<T> {
public:
    SquareMatrix()
        : SquareMatrixBase<T>(N, data) {}

    void invert() {
        this->invert(N);    // base의 invert(size_t) 호출
    }

private:
    T data[N * N];
};
```

이제 `SquareMatrix<double, 5>::invert()`, `<double, 10>::invert()`, `<double, 15>::invert()` 모두 — **같은 `SquareMatrixBase<double>::invert(size_t)` 호출**. 코드는 1벌만.

```
SquareMatrixBase<double>::invert(size_t)       ← 1벌
SquareMatrix<double, 5>::invert()              ← thin wrapper
SquareMatrix<double, 10>::invert()             ← thin wrapper
SquareMatrix<double, 15>::invert()             ← thin wrapper
```

## 해결의 핵심 — "타입은 컴파일 타임, 크기는 런타임으로"

비-타입 매개변수(`N`)를 **런타임 함수 인자**로 전달 — 한 번만 컴파일.

대안 — 동적 데이터:

```cpp
template<typename T>
class DynamicMatrix : private SquareMatrixBase<T> {
public:
    DynamicMatrix(std::size_t n)
        : SquareMatrixBase<T>(n, new T[n * n]),
          size_(n) {}

    void invert() { this->invert(size_); }

    ~DynamicMatrix() { delete[] this->data; }   // 또는 unique_ptr
private:
    std::size_t size_;
};
```

`N`을 런타임 인자로 — 컴파일 타임 최적화 일부 잃지만 코드 부피 ↓.

## 트레이드오프 — 성능 vs 부피

| 측면 | `template<size_t N>` | 런타임 size |
| --- | --- | --- |
| 인스턴스마다 별도 코드 | ✓ (인라인·최적화 강함) | ✗ |
| 코드 부피 | ↑ | ↓ |
| 컴파일 타임 | ↑ | ↓ |
| stack vs heap 할당 | stack (N 작을 때) | heap |
| 최적화 가능성 | 최고 (size_t 상수) | 일반 |

**hot path**나 **size가 작은 stack 객체**(예: 3D 벡터) — 템플릿 매개변수 유지. **일반적 사용**엔 런타임 인자.

## 함정 2 — 포인터 타입 곱셈

```cpp
template<typename T>
class Stack {
public:
    void push(T x);
};

Stack<int*>      s1;
Stack<double*>   s2;
Stack<std::string*> s3;
// 포인터 타입은 거의 동일하지만 — 각자 별도 코드 인스턴스화
```

`int*`와 `double*`는 비트 표현이 같음. Stack의 코드도 사실 같지만 — 템플릿은 별개로 처리.

## 해결 2 — void* 위임

```cpp
class StackImpl {       // 비-템플릿 — 한 번만 컴파일
public:
    void push(void* p);
    void* top();
    void pop();
private:
    std::vector<void*> data;
};

template<typename T>
class Stack {
    StackImpl impl;
public:
    void push(T* p) { impl.push(static_cast<void*>(p)); }       // thin wrapper
    T* top()        { return static_cast<T*>(impl.top()); }
    void pop()      { impl.pop(); }
};
```

모든 `Stack<T*>`이 같은 `StackImpl` 사용 — **포인터 처리 로직은 1벌만**.

**왜 동작하나**: 모든 포인터는 같은 비트 크기 (보통 8 byte) — 같은 자료 구조로 처리 가능. T* ↔ void* 변환은 무비용.

```cpp
Stack<int*>      s1;     // → StackImpl (공유)
Stack<double*>   s2;     // → StackImpl (공유)
Stack<MyClass*>  s3;     // → StackImpl (공유)
```

비용: thin wrapper의 호출 (보통 인라인됨, 0 비용). 표준 라이브러리도 일부 컨테이너에서 이 패턴.

## 표준 라이브러리의 예 — `std::vector<T>` 일부 구현

```cpp
// 일부 STL 구현
namespace detail {
    class VectorImpl {
        void* data;
        size_t size, capacity;
    public:
        void reserve(size_t n, size_t elemSize);
        // ... 비-타입 의존 로직 ...
    };
}

template<typename T>
class vector {
    detail::VectorImpl impl;
public:
    // thin wrapper
};
```

모든 `vector<T>`가 같은 `VectorImpl` 사용 → 코드 부피 절약. 단, 모든 STL이 이렇게 구현되는 건 아님 — 구현 디테일.

## 함정 3 — Compile-time 결정 가능한 분기

```cpp
template<typename T>
void process(T x) {
    if (std::is_integral_v<T>) {
        // 정수 전용 코드
    } else {
        // 비-정수 코드
    }
}
```

T가 결정되면 한쪽 분기만 의미 — 그러나 두 분기 모두 컴파일됨. 다른 쪽 코드도 인스턴스화에 포함.

## 해결 3 — `if constexpr` (C++17)

```cpp
template<typename T>
void process(T x) {
    if constexpr (std::is_integral_v<T>) {
        // 정수 전용 — T가 정수일 때만 컴파일
    } else {
        // 비-정수 — T가 비-정수일 때만
    }
}
```

`if constexpr`는 **컴파일 타임 분기** — 만족하지 않는 분기는 코드 생성 X. 인스턴스마다 한 분기만.

이전엔 SFINAE 또는 tag dispatch로 풀었던 패턴:

```cpp
// C++14 SFINAE
template<typename T>
std::enable_if_t<std::is_integral_v<T>, void> process(T x) { /* 정수 */ }

template<typename T>
std::enable_if_t<!std::is_integral_v<T>, void> process(T x) { /* 비-정수 */ }

// C++17 if constexpr 한 함수
template<typename T>
void process(T x) {
    if constexpr (std::is_integral_v<T>) { /* 정수 */ }
    else { /* 비-정수 */ }
}
```

후자가 단순하고 부피도 작음.

## 함정 — 측정 없이 최적화

```cpp
template<typename T, size_t N>
class Vec { /* ... */ };

// "code bloat 걱정" — base로 분리?
template<typename T>
class VecBase { /* ... */ };

template<typename T, size_t N>
class Vec : private VecBase<T> { /* ... */ };
```

base 추출은 **인라인을 방해**할 수 있음 — N이 컴파일 타임 상수일 때 강력한 최적화 잃음. 작은 vector(`Vec<double, 3>`)는 그냥 템플릿이 더 빠를 수 있음.

**규칙**:
1. **측정 후 최적화** — code bloat이 정말 문제인지 확인
2. 자주 호출되는 작은 함수는 — 템플릿 그대로 둠 (인라인 우선)
3. 큰 함수 / 드물게 호출 — base 분리 검토

## 흔한 함정 — 잘못된 base 분리

```cpp
template<typename T>
class Base {
protected:
    void doWork(T x);    // T에 의존 — 여전히 인스턴스마다 별도
};

template<typename T, size_t N>
class Derived : private Base<T> {
    // 그러나 N에 의존 안 하므로 적어도 N에 대한 중복은 줄음
};
```

타입 `T`에 의존하는 코드는 base로 빼도 T별로 인스턴스화 — 완전한 단일화는 어려움. 가능한 범위 안에서.

## 실무 가이드 — 결정

```
템플릿에 code bloat 의심?
├── 컴파일 결과 측정 (binary size, link time)
├── 비-타입 매개변수만 다른 인스턴스 多 → base로 분리
├── 같은 비트 크기 타입(포인터 등) → void* 위임
├── 컴파일 타임 분기 → if constexpr
└── 작은 hot path → 그대로 (인라인 우선)
```

## 실무 가이드 — 체크리스트

- [ ] 같은 템플릿의 인스턴스 수가 많은가?
- [ ] 비-타입 매개변수만 다른 인스턴스가 큰 코드 — base로 분리?
- [ ] 포인터 타입 곱셈 — void* impl로 통합?
- [ ] `if constexpr` 로 컴파일 타임 분기?
- [ ] 측정으로 최적화 가치 확인했는가?
- [ ] 인라인을 방해하지 않는가?

## 핵심 정리

1. **템플릿은 인스턴스마다 코드 — bloat 위험**
2. **매개변수에 무관한 코드는 별도 base / 함수로 분리** — T별로 1벌
3. **비-타입 매개변수**(N)는 런타임 인자로 — 가능하면
4. **포인터 타입은 void* impl로 통합** 가능
5. **`if constexpr`** (C++17) — 컴파일 타임 분기, 부피 ↓
6. 측정 없이 최적화 X — 인라인 손실 가능

## 관련 항목

- [항목 30: inline의 이해](/blog/programming/cpp/effective-cpp/item30-understand-the-ins-and-outs-of-inlining) — 인라인과 코드 부피
- [항목 43: 템플릿 base 접근](/blog/programming/cpp/effective-cpp/item43-know-how-to-access-names-in-templatized-base-classes) — base 분리의 문법
- [항목 47: traits 클래스](/blog/programming/cpp/effective-cpp/item47-use-traits-classes-for-information-about-types) — 컴파일 타임 분기 도구
