---
title: "항목 44: 매개변수와 무관한 코드는 템플릿 밖으로 빼라"
date: 2025-02-07T13:00:00
description: "코드 부풀어 오름(code bloat)을 줄이는 리팩토링 패턴."
tags: [C++, Effective C++, Template, Code Bloat]
series: "Effective C++"
seriesOrder: 44
draft: true
---

> **초안** — 정리 진행 중

## 개요

템플릿은 인스턴스마다 새 코드를 생성 — 같은 로직이 여러 타입에 대해 중복되면 **코드 부풀어 오름**(code bloat). 매개변수와 무관한 부분은 별도 함수/클래스로 분리해 공유하면 부피 ↓.

## 함정 — 타입과 크기 모두 템플릿 매개변수

```cpp
template<typename T, std::size_t n>
class SquareMatrix {
public:
    void invert();    // 역행렬 계산 — 같은 T라도 n마다 별도 코드 생성
};

SquareMatrix<double, 5>  s5;
SquareMatrix<double, 10> s10;
// invert() 코드가 두 벌 — 거의 같은데 n만 다름
```

## 해결 — base 클래스에 공통 코드

```cpp
template<typename T>
class SquareMatrixBase {
protected:
    SquareMatrixBase(std::size_t n, T* mat) : size(n), data(mat) {}
    void invert(std::size_t matrixSize);    // 한 벌만 (T별로)
private:
    std::size_t size;
    T*          data;
};

template<typename T, std::size_t n>
class SquareMatrix : private SquareMatrixBase<T> {
public:
    SquareMatrix() : SquareMatrixBase<T>(n, data) {}
    void invert() { this->invert(n); }
private:
    T data[n*n];
};
```

`invert(n)`은 `T` 별로 한 번만 인스턴스화, `SquareMatrix`의 `invert()`는 단순 위임.

## 비-타입 매개변수의 다른 처리

크기, 인덱스 같은 비-타입 매개변수는 **함수 인자**로 받는 게 보통. 템플릿 매개변수로 두면 인스턴스 폭발.

```cpp
template<std::size_t N>
class Buffer { /* ... */ };   // N마다 다른 클래스 (필요할 때만)

class Buffer {
    std::size_t n;
public:
    Buffer(std::size_t size) : n(size) {}    // 일반화 — 한 클래스
};
```

성능이 정말 중요하고 컴파일 타임 알 수 있다면 템플릿이 빠를 수 있음. 의심되면 측정.

## 타입 매개변수도 비슷한 패턴

```cpp
// 모든 포인터 타입 → void* 한 벌로 처리 후 thin wrapper
template<typename T>
class Stack {
public:
    void push(T x) { stackImpl.push(static_cast<void*>(x)); }   // 위임
private:
    StackImpl stackImpl;    // void* 기반 — 한 벌
};
```

`std::list`, `std::vector` 등 표준 라이브러리도 비슷한 internal helper 사용.

## 핵심 정리

1. 템플릿은 인스턴스마다 코드 — bloat 위험
2. 매개변수에 무관한 코드는 별도 base/함수로 분리
3. 비-타입 매개변수는 함수 인자로도 OK (필요한 경우만 템플릿 매개변수)
4. 효율과 부피 트레이드오프 — 측정 후 결정
