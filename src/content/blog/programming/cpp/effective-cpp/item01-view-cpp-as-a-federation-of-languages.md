---
title: "항목 1: C++를 언어들의 연합체로 보라"
date: 2025-02-01T01:00:00
description: "C++는 단일 언어가 아니라 네 가지 하위 언어의 연합 — 영역마다 효율의 규칙이 다르다."
tags: [C++, Effective C++]
series: "Effective C++"
seriesOrder: 1
draft: true
---

## 왜 이 항목이 중요한가?

C++를 한참 쓰다 보면 모순처럼 보이는 조언들과 마주친다. "값으로 전달해라", "참조로 전달해라". "가상 함수를 적극 쓰라", "가상 함수는 인라인 안 되니 피해라". "복사 비용을 줄여라", "함수 객체는 복사를 전제로 한다".

이 모순은 **C++가 한 언어가 아니기 때문**이다. Bjarne Stroustrup이 처음부터 다중 패러다임 언어로 설계했고, 그 안의 영역마다 자기 규칙이 있다. 한 영역의 직관만 가진 사람이 다른 영역을 건드리면 **자연스럽지 않은 코드**가 나오고, 운이 나쁘면 성능 함정이나 미묘한 버그가 따라온다.

이 항목은 그 네 영역(C, OOP, 템플릿, STL)을 구분하고, 영역마다 효율의 정의가 어떻게 다른지 정리한다. 책 전체의 토대다 — 이후 항목들은 모두 "어느 영역에 사는 규칙인가"가 명확해야 풀린다.

## 개요

C++ 입문자가 가장 먼저 마주치는 혼란은 "**효율적인 코드**가 도대체 무엇이냐"는 질문에 일관된 답이 없다는 점이다. 어떤 책은 "값으로 전달하라", 어떤 책은 "참조로 전달하라"고 한다. 모순처럼 보이지만 둘 다 맞다. **어느 영역의 코드를 쓰고 있는지에 따라 답이 다르기 때문**이다.

Scott Meyers는 C++를 단일 언어가 아닌 **네 가지 하위 언어의 연합체**(federation of related languages)로 보라고 권한다. 한 영역의 관습을 다른 영역에 무비판적으로 옮기면 비효율 혹은 버그로 이어진다.

## 잠깐 — 왜 한 언어가 아닌가

Stroustrup이 의도한 설계 철학은 "**여러 프로그래밍 스타일을 한 언어로 직접 표현할 수 있게 한다**"였다. C 호환성을 유지하면서, 객체 지향을 얹고, 그 위에 제네릭 프로그래밍을 더했다. 표준 라이브러리(STL)는 다시 그 위에서 자기 규약을 정립했다.

각 영역이 다른 시기에, 다른 목표로, 다른 사람의 손을 거쳐 합쳐졌다. 그래서 각 영역은 마치 다른 언어처럼 자기 idiom과 비용 모델을 가진다.

- C는 1972년부터의 정밀한 메모리·성능 모델.
- 객체 지향(Simula 기원)은 1980년대 추상화 도구.
- 템플릿(Ada generics 기원)은 1990년대 제네릭 프로그래밍.
- STL은 Alexander Stepanov가 1990년대에 함수형·제네릭 사고로 설계.

언어 안에 시대가 층층이 쌓여 있다.

## 네 가지 하위 언어

### 1) C — 절차적 기반

블록, 문장, 전처리기, 내장 타입, 배열, 포인터. C++의 가장 오래된 층이다. 이 영역만 사용하면 C++는 사실상 "더 나은 C"에 불과하다. 클래스·템플릿·예외의 이점을 전혀 얻지 못한다.

```cpp
// 순수 C 스타일
int sum(const int* arr, size_t n) {
    int s = 0;
    for (size_t i = 0; i < n; ++i) s += arr[i];
    return s;
}
```

이 영역의 효율 규칙은 이렇다.

- **작은 값 타입은 값으로 전달**한다.
- 배열은 포인터+크기로 전달한다.
- 함수는 자유롭게 인라인되고, 가상 호출 비용이 없다.
- 메모리 레이아웃이 예측 가능하다 (POD).

### 2) 객체 지향 C++

클래스, 캡슐화, 상속, 다형성, 가상 함수. C에 클래스를 더한 "C with Classes" 시절의 핵심 영역이다. 전통적인 OOP 원리 — Liskov 치환, 가상 소멸자, NVI 패턴 — 가 그대로 적용된다.

```cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};
```

이 영역의 효율 규칙은 이렇다.

- **객체는 const 참조로 전달**한다 (복사 비용 회피).
- 생성자에서 멤버 초기화 리스트를 사용한다.
- 상속이 깊어지지 않게 한다.
- 가상 함수는 **인라인이 거의 안 된다** (vtable 간접 호출).
- 객체 슬라이싱을 막기 위해 다형성 타입은 절대 값 전달을 하지 않는다.

### 3) 템플릿 C++

제네릭 프로그래밍. 타입에 추상화된 코드를 컴파일러가 인스턴스화한다. **템플릿 메타프로그래밍(TMP)** 은 사실상 함수형 언어의 한 갈래로, "값"이 아니라 "타입"을 계산한다.

```cpp
template<typename T>
T max(const T& a, const T& b) {
    return a > b ? a : b;
}
```

이 영역의 효율 규칙은 이렇다.

- **타입 매개변수는 보통 const 참조로 전달**한다. 상대가 비싼 객체일 수도, 값 타입일 수도 있어 안전한 기본값이다.
- C++11+ 에서는 **forwarding reference**(`T&&`)가 추가됐다.
- 인라인이 자주 일어난다 (각 인스턴스화가 독립).
- 컴파일 시간이 늘어나는 비용이 있다.
- 에러 메시지가 깊은 인스턴스화로 난해해진다 (C++20 concepts가 완화).

### 4) STL — 컨테이너·반복자·알고리즘·함수 객체

자체 규약을 가진 거대한 라이브러리. 반복자는 포인터를 흉내 내도록 설계되었고, 함수 객체는 **값으로 전달·복사**되는 것을 전제로 한다.

```cpp
std::vector<int> v{3, 1, 4, 1, 5, 9, 2, 6};
std::sort(v.begin(), v.end(), [](int a, int b) { return a < b; });
```

이 영역의 효율 규칙은 이렇다.

- **반복자와 함수 객체는 값으로 전달**한다 (가벼움 전제).
- 컨테이너는 참조로 전달한다.
- 알고리즘은 [begin, end) 반-개방 구간을 따른다.
- 함수 객체는 stateless 또는 작은 상태가 표준이다 (값 복사 비용이 무시 가능해야).
- 멤버 함수보다 비-멤버 알고리즘을 선호한다.

## 왜 중요한가 — 같은 질문에 답이 4개

가장 단순한 예시를 보자. "함수 매개변수는 어떻게 전달할까?"

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

네 가지가 한 함수 안에서 **공존**할 수 있다는 게 핵심이다. 한 영역의 직관만 가진 사람이 다른 영역에 손을 대면 자연스럽지 않은 코드가 나온다.

## 영역별 idiom 충돌 — 자주 마주치는 사례

### 사례 1 — 반복자를 const 참조로 받는 함정

```cpp
template<typename Iter>
void process(const Iter& it);   // 어색 — Iter는 STL 영역, 값 전달이 자연스러움
```

반복자는 `int*` 같은 가벼운 객체로 설계되어 있어 const 참조 추가가 오히려 한 단계 간접 참조를 늘린다. STL 영역 코드는 STL 규칙으로 짠다.

### 사례 2 — 함수 객체를 참조로 받는 함정

```cpp
std::sort(v.begin(), v.end(), std::ref(myCompare));   // 보통은 불필요
```

STL 알고리즘은 함수 객체를 **복사**해서 내부 보관하는 것을 전제로 한다. 상태가 있는 함수 객체를 참조로 묶고 싶다면 `std::ref`로 명시해야 하는데, 이는 STL 관습을 거스르는 의도적 선택임을 알리는 것이다.

### 사례 3 — C 스타일 배열에 OOP 도구 적용

```cpp
int arr[100];
arr.size();           // ❌ — 배열은 C 영역, 멤버 함수 없음
std::size(arr);       // ✅ — C++17 비-멤버 함수 (영역 간 다리)
```

C 배열은 OOP 영역의 컨테이너처럼 행동하지 않는다. C++17의 `std::size`·`std::data` 같은 비-멤버 도구가 그 간극을 좁힌다.

### 사례 4 — OOP 객체를 함수 객체로 사용

```cpp
struct Heavy {
    std::vector<int> cache;
    bool operator()(int x) const { /* ... */ }
};

Heavy h;
std::count_if(v.begin(), v.end(), h);   // ⚠️ Heavy가 복사됨 (cache 통째로)
                                         // STL 영역: 함수 객체는 가벼워야 한다는 전제 위반
```

함수 객체에 큰 상태가 있으면 STL 알고리즘이 매번 복사한다. 람다 + `std::ref` 또는 직접 알고리즘 작성을 검토해야 한다.

### 사례 5 — 가상 함수를 hot path에서 인라인 기대

```cpp
class Filter {
public:
    virtual bool accept(int x) const = 0;
};

Filter* f = makeFilter();
for (int x : v) {
    if (f->accept(x)) ...   // 매번 vtable 간접 호출 — 인라인 X
}
```

OOP 영역의 가상 함수는 인라인이 거의 안 된다. hot loop이라면 템플릿 영역(`Filter`를 템플릿 매개변수로) 또는 std::variant 같은 닫힌 다형성을 검토한다.

## 5번째 영역? — 임베디드/freestanding

표준엔 명시되지 않지만 실무에선 다섯 번째 영역이 자주 등장한다. **freestanding C++** — 표준 라이브러리 일부, 동적 메모리, 예외, RTTI를 모두 끄거나 제한한 환경이다.

```cpp
// 임베디드 — 자주 보는 제약
// -fno-exceptions -fno-rtti -nostdlib

class Driver {
    // new/delete X — 정적 객체나 placement new만
    // std::string X — 힙 사용
    // dynamic_cast X — RTTI 필요
};
```

이 영역에선 OOP/STL의 많은 idiom이 비용 문제로 사용 불가다. C 영역 + 템플릿 영역의 일부 + 사용자 정의 컨테이너로 작업한다. Modern C++ 기능 중에서도 `constexpr`, `enum class`, `auto` 등 제로-비용 추상화만 환영받는다.

## 모던 C++ — 경계는 점점 흐릿해지고 있다

C++11 이후 네 영역의 경계가 의도적으로 약해지고 있다.

| 변화 | 효과 |
| --- | --- |
| `auto` | C/OOP/템플릿 어느 영역이든 동일 문법 |
| Range-based for | C 배열·STL 컨테이너·사용자 컨테이너 모두 동일 |
| `std::array<T, N>` | C 배열의 효율 + STL 컨테이너의 인터페이스 |
| Concepts (C++20) | 템플릿 영역의 인터페이스 명세화 |
| `std::ranges` | STL의 새 표면 — pipe 문법, lazy view |
| `std::span` (C++20) | C 배열·STL 컨테이너 모두 동일 인터페이스 |
| Coroutines (C++20) | 5번째 패러다임? — 비동기 영역 |

그러나 **idiom의 차이는 여전히 존재**한다. 예를 들어 `std::ranges::sort`도 함수 객체를 값으로 받는다. 표면이 통일되더라도 내부 규약은 영역의 정체성을 유지하고 있다.

## 실전 — idiom 혼용이 만든 실제 버그

가장 흔한 사례는 **OOP 객체에 STL 알고리즘을 STL idiom으로 적용**할 때다.

```cpp
class Logger {
    std::ofstream file;
    std::mutex    m;
public:
    void operator()(const std::string& msg) {
        std::lock_guard g(m);
        file << msg << '\n';
    }
};

std::vector<std::string> msgs = {/* ... */};

// 의도: 모든 메시지를 한 Logger에 기록
Logger logger;
std::for_each(msgs.begin(), msgs.end(), logger);
```

**문제**: `std::for_each`가 `logger`를 **복사**한다. `std::ofstream`과 `std::mutex`는 복사 불가다 → 컴파일 에러. 백번 양보해 복사 가능했다 해도, 각 알고리즘 인스턴스가 자기 logger 사본을 가지므로 의도와 정반대로 동작한다.

해결책은 두 가지다.

```cpp
// 1) std::ref로 STL 관습을 의도적으로 우회
std::for_each(msgs.begin(), msgs.end(), std::ref(logger));

// 2) 람다로 명시적 참조 캡처 (STL 관습 안에서)
std::for_each(msgs.begin(), msgs.end(),
              [&logger](const auto& m) { logger(m); });
```

OOP 객체(상태 있는 logger)와 STL 알고리즘(stateless 함수 객체 전제)의 idiom 충돌이다. **"이 호출은 어느 영역의 규칙을 따르는가"** 를 의식하지 않으면 컴파일러가 알려줄 때까지(혹은 안 알려줄 때까지) 모른다.

## 실무 가이드 — 어느 영역인지 자문하기

코드를 읽거나 쓸 때 매번 자문하면 도움된다.

1. **이 함수는 어느 영역에 속하는가?** (C / OOP / 템플릿 / STL)
2. **매개변수 전달 방식이 그 영역의 관습에 맞는가?**
3. **반환 타입이 영역과 일관되는가?** (OOP는 const T&, STL은 보통 값)
4. **컴파일러가 인라인할 가능성이 있는가?** (C·템플릿 자주, OOP virtual은 거의 못 함)
5. **타입의 복사 가능성·이동 비용이 영역의 가정과 맞는가?** (STL은 cheap copy 가정)

영역을 명확히 두지 않으면 "왜 이 코드는 이렇게 어색한가"라는 질문이 항상 따라다닌다.

## 핵심 정리

1. C++는 **C·객체 지향·템플릿·STL** 네 영역의 연합체로 보라.
2. **효율적 코딩 규칙은 영역마다 다르다** — 매개변수 전달, 반환, 인라인 가능성 모두.
3. 한 영역의 관습을 다른 영역에 그대로 적용하지 마라.
4. 모던 C++은 경계를 흐리지만 **각 영역의 idiom은 여전히 살아 있다**.
5. 코드를 보거나 쓸 때 "**이 코드는 어느 영역인가?**"를 먼저 물어라.
6. 임베디드/freestanding은 사실상 5번째 영역으로, OOP/STL의 많은 도구를 사용할 수 없다.

## 관련 항목

- [항목 20: 값 전달보다 const 참조 전달을 선호하라](/blog/programming/cpp/effective-cpp/item20-prefer-pass-by-reference-to-const-to-pass-by-value) — OOP 영역의 전달 규칙
- [항목 23: 비-멤버 비-friend 함수](/blog/programming/cpp/effective-cpp/item23-prefer-non-member-non-friend-functions-to-member-functions) — STL 알고리즘 영역
- [항목 41: 암묵적 인터페이스와 컴파일 타임 다형성](/blog/programming/cpp/effective-cpp/item41-understand-implicit-interfaces-and-compile-time-polymorphism) — 템플릿 영역의 인터페이스
- [항목 48: 템플릿 메타프로그래밍](/blog/programming/cpp/effective-cpp/item48-be-aware-of-template-metaprogramming) — TMP 패러다임
