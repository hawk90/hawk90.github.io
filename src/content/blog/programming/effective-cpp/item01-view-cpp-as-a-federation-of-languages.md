---
title: "항목 1: C++를 언어들의 연합체로 보라"
date: 2025-02-01T10:00:00
description: "C++는 단일 언어가 아니라 네 가지 하위 언어의 연합 — 영역마다 효율의 규칙이 다르다."
tags: [C++, Effective C++]
series: "Effective C++"
seriesOrder: 1
---

## 개요

C++ 입문자가 가장 먼저 마주치는 혼란은 "**효율적인 코드**가 도대체 무엇이냐"는 질문에 일관된 답이 없다는 점입니다. 어떤 책은 "값으로 전달하라", 어떤 책은 "참조로 전달하라"고 합니다. 모순처럼 보이지만 둘 다 맞습니다 — **어느 영역의 코드를 쓰고 있는지에 따라 답이 다르기 때문**입니다.

Scott Meyers는 C++를 단일 언어가 아닌 **네 가지 하위 언어의 연합체**(federation of related languages)로 보라고 권합니다. 한 영역의 관습을 다른 영역에 무비판적으로 옮기면 비효율 혹은 버그로 이어집니다.

## 네 가지 하위 언어

### 1) C — 절차적 기반

블록, 문장, 전처리기, 내장 타입, 배열, 포인터. C++의 가장 오래된 층입니다. 이 영역만 사용하면 C++는 사실상 "더 나은 C"에 불과합니다 — 클래스·템플릿·예외의 이점을 전혀 얻지 못합니다.

```cpp
// 순수 C 스타일
int sum(const int* arr, size_t n) {
    int s = 0;
    for (size_t i = 0; i < n; ++i) s += arr[i];
    return s;
}
```

이 영역의 효율 규칙: **작은 값 타입은 값으로 전달**, 배열은 포인터+크기로.

### 2) 객체 지향 C++

클래스, 캡슐화, 상속, 다형성, 가상 함수. C에 클래스를 더한 "C with Classes" 시절의 핵심 영역입니다. 전통적인 OOP 원리 — Liskov 치환, 가상 소멸자, NVI 패턴 — 가 그대로 적용됩니다.

```cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};
```

이 영역의 효율 규칙: **객체는 const 참조로 전달**(복사 비용 회피), 생성자에서 멤버 초기화 리스트 사용, 상속이 깊어지지 않게.

### 3) 템플릿 C++

제네릭 프로그래밍. 타입에 추상화된 코드를 컴파일러가 인스턴스화합니다. **템플릿 메타프로그래밍(TMP)** 은 사실상 함수형 언어의 한 갈래로, "값"이 아니라 "타입"을 계산합니다.

```cpp
template<typename T>
T max(const T& a, const T& b) {
    return a > b ? a : b;
}
```

이 영역의 효율 규칙: **타입 매개변수는 보통 const 참조로 전달**(상대가 비싼 객체일 수도, 값 타입일 수도 있으므로 안전한 기본값). C++11+ 에서는 **forwarding reference**(`T&&`)가 추가됨.

### 4) STL — 컨테이너·반복자·알고리즘·함수 객체

자체 규약을 가진 거대한 라이브러리. 반복자는 포인터를 흉내 내도록 설계되었고, 함수 객체는 **값으로 전달·복사**되는 것을 전제로 합니다.

```cpp
std::vector<int> v{3, 1, 4, 1, 5, 9, 2, 6};
std::sort(v.begin(), v.end(), [](int a, int b) { return a < b; });
```

이 영역의 효율 규칙: **반복자와 함수 객체는 값으로 전달**(가벼움), 컨테이너는 참조로.

## 왜 중요한가 — 같은 질문에 답이 4개

가장 단순한 예시: "함수 매개변수는 어떻게 전달할까?"

```cpp
// 1) C 영역 — pass-by-value (int는 가벼움)
void f(int x);

// 2) OOP 영역 — pass-by-const-reference (string 복사는 비쌈)
void g(const std::string& s);

// 3) 템플릿 영역 — pass-by-const-reference (상대가 뭔지 모름)
template<typename T>
void h(const T& x);

// 4) STL 영역 — pass-by-value (반복자·함수 객체는 가벼움 전제)
std::for_each(v.begin(), v.end(), Functor{});
```

네 가지가 한 함수 안에서 **공존**할 수 있다는 게 핵심입니다. 한 영역의 직관만 가진 사람이 다른 영역에 손을 대면 자연스럽지 않은 코드가 나옵니다.

## 영역별 idiom 충돌 — 자주 마주치는 사례

### 사례 1 — 반복자를 const 참조로 받는 함정

```cpp
template<typename Iter>
void process(const Iter& it);   // 어색 — Iter는 STL 영역, 값 전달이 자연스러움
```

반복자는 `int*` 같은 가벼운 객체로 설계되어 있어 const 참조 추가가 오히려 한 단계 간접 참조를 늘립니다. STL 영역 코드는 STL 규칙으로.

### 사례 2 — 함수 객체를 참조로 받는 함정

```cpp
std::sort(v.begin(), v.end(), std::ref(myCompare));   // 보통은 불필요
```

STL 알고리즘은 함수 객체를 **복사**해서 내부 보관하는 것을 전제로 합니다. 상태가 있는 함수 객체를 참조로 묶고 싶다면 `std::ref`로 명시해야 하는데, 이는 STL 관습을 거스르는 의도적 선택임을 알리는 것입니다.

### 사례 3 — C 스타일 배열에 OOP 도구 적용

```cpp
int arr[100];
arr.size();           // ❌ — 배열은 C 영역, 멤버 함수 없음
std::size(arr);       // ✅ — C++17 비-멤버 함수 (영역 간 다리)
```

C 배열은 OOP 영역의 컨테이너처럼 행동하지 않습니다. C++17의 `std::size`·`std::data` 같은 비-멤버 도구가 그 간극을 좁힙니다.

## 모던 C++ — 경계는 점점 흐릿해지고 있다

C++11 이후 네 영역의 경계가 의도적으로 약해지고 있습니다.

| 변화 | 효과 |
| --- | --- |
| `auto` | C/OOP/템플릿 어느 영역이든 동일 문법 |
| Range-based for | C 배열·STL 컨테이너·사용자 컨테이너 모두 동일 |
| `std::array<T, N>` | C 배열의 효율 + STL 컨테이너의 인터페이스 |
| Concepts (C++20) | 템플릿 영역의 인터페이스 명세화 |
| `std::ranges` | STL의 새 표면 — pipe 문법, lazy view |

그러나 **idiom의 차이는 여전히 존재**합니다. 예를 들어 `std::ranges::sort`도 함수 객체를 값으로 받습니다. 표면이 통일되더라도 내부 규약은 영역의 정체성을 유지하고 있습니다.

## 실무 가이드 — 어느 영역인지 자문하기

코드를 읽거나 쓸 때 매번 자문하면 도움됩니다.

1. **이 함수는 어느 영역에 속하는가?** (C / OOP / 템플릿 / STL)
2. **매개변수 전달 방식이 그 영역의 관습에 맞는가?**
3. **반환 타입이 영역과 일관되는가?** (OOP는 const T&, STL은 보통 값)
4. **컴파일러가 인라인할 가능성이 있는가?** (C·템플릿 자주, OOP virtual은 거의 못 함)

영역을 명확히 두지 않으면 "왜 이 코드는 이렇게 어색한가"라는 질문이 항상 따라다닙니다.

## 핵심 정리

1. C++는 **C·객체 지향·템플릿·STL** 네 영역의 연합체로 보라
2. **효율적 코딩 규칙은 영역마다 다르다** — 매개변수 전달, 반환, 인라인 가능성 모두
3. 한 영역의 관습을 다른 영역에 그대로 적용하지 마라
4. 모던 C++은 경계를 흐리지만 **각 영역의 idiom은 여전히 살아 있다**
5. 코드를 보거나 쓸 때 "**이 코드는 어느 영역인가?**"를 먼저 물어라

## 관련 항목

- [항목 20: 값 전달보다 const 참조 전달을 선호하라](/blog/programming/effective-cpp/item20-prefer-pass-by-reference-to-const-to-pass-by-value) — OOP 영역의 전달 규칙
- [항목 41: 암묵적 인터페이스와 컴파일 타임 다형성](/blog/programming/effective-cpp/item41-understand-implicit-interfaces-and-compile-time-polymorphism) — 템플릿 영역의 인터페이스
- [항목 48: 템플릿 메타프로그래밍](/blog/programming/effective-cpp/item48-be-aware-of-template-metaprogramming) — TMP 패러다임
