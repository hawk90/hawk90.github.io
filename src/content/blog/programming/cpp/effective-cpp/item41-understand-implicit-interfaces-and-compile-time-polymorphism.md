---
title: "항목 41: 암묵 인터페이스와 컴파일 타임 다형성을 이해하라"
date: 2025-02-07T10:00:00
description: "OOP의 명시 인터페이스 + 런타임 다형성 vs 템플릿의 암묵 인터페이스 + 컴파일 타임 다형성 — 두 모델의 트레이드오프."
tags: [C++, Effective C++, Template, Polymorphism]
series: "Effective C++"
seriesOrder: 41
draft: true
---

## 왜 이 항목이 중요한가?

C++의 다형성은 두 모델로 구현되고, 둘은 서로 다른 언어 영역에 산다.

- **OOP (객체 지향)** — 명시적 인터페이스(virtual 함수 시그니처) + **런타임 다형성**.
- **템플릿 (제네릭)** — **암묵 인터페이스**(컴파일러가 사용 패턴에서 추론) + **컴파일 타임 다형성**.

같은 "다형성"이라는 이름을 공유하지만 시점, 비용, 검증 방식이 모두 다르다. OOP는 인터페이스가 base 클래스에 적혀 있어 명시적이지만 vtable 비용이 든다. 템플릿은 인라인 가능하지만 인터페이스가 코드에 흩어져 있어 에러 메시지가 난해하다.

C++20의 concepts가 등장하면서 격차가 크게 좁혀졌다. 템플릿에 명시적 인터페이스를 적을 수 있다. 이 항목은 두 모델의 비교와 concepts의 위치를 정리한다.

## 개요

C++의 다형성은 두 가지 모델로 구현된다.

- **OOP (객체 지향)**: 명시적 인터페이스(virtual 함수 시그니처) + **런타임 다형성**(가상 함수 호출).
- **템플릿 (제네릭)**: **암묵 인터페이스**(컴파일러가 사용 패턴에서 추론) + **컴파일 타임 다형성**(인스턴스화).

두 모델은 같은 "다형성"이라는 이름을 공유하지만 시점, 비용, 검증 방식이 모두 다르다. 이 항목은 두 모델을 비교하고, C++20 concepts가 어떻게 격차를 메우는지 다룬다.

## 명시적 인터페이스 — OOP

```cpp
class Widget {
public:
    virtual std::size_t size() const;
    virtual void normalize();
    void swap(Widget& other);
};

void doStuff(Widget& w) {
    if (w.size() > 10) w.normalize();
    Widget temp(w);
    temp.swap(w);
}
```

`doStuff`가 호출 가능한 함수들 — 모두 **Widget 헤더에 명시**되어 있음. 사용자는 헤더만 보면 사용법 파악.

특징:
- **인터페이스가 코드에 명시** — 시그니처, 반환 타입, const 여부
- **런타임 vtable로 디스패치** — 실제 타입 검색
- **상속 계층**으로 호환성 표현 — derived는 base의 모든 메서드 보장

## 암묵 인터페이스 — 템플릿

```cpp
template<typename T>
void doStuff(T& w) {
    if (w.size() > 10 && w != someValue) {
        T temp(w);
        temp.normalize();
        temp.swap(w);
    }
}
```

`T`가 만족해야 할 인터페이스는 **암묵적** — 코드의 사용 패턴에서 추론:

| 요구사항 | 코드에서 |
| --- | --- |
| `T`는 `size()` 멤버를 가짐 | `w.size()` |
| 그 결과가 `> 10`과 비교 가능 | `w.size() > 10` |
| `T`와 `someValue`의 `!=` 비교 가능 | `w != someValue` |
| `T`가 복사 생성 가능 | `T temp(w)` |
| `T`는 `normalize()`, `swap()` 멤버 보유 | `temp.normalize()` 등 |

요구사항은 **사용된 표현식**에서 컴파일 타임에 검증. 만족 못 하면 컴파일 에러.

특징:
- **인터페이스가 코드 사용 패턴에서 추론** — 명시되지 않음
- **컴파일 타임 인스턴스화** — 런타임 vtable 비용 없음
- **상속 불필요** — duck typing ("rabbit이 quack 하면 duck처럼 다룸")

## 트레이드오프 비교

| 측면 | OOP (virtual) | 템플릿 |
| --- | --- | --- |
| 인터페이스 표현 | 명시적 (선언) | 암묵적 (사용 패턴) |
| 다형성 시점 | 런타임 | 컴파일 타임 |
| 비용 | vtable lookup + 호출 | 0 (인라인 가능) |
| 코드 부피 | 함수당 1개 | 인스턴스마다 |
| 에러 메시지 | 명확 (상속 관계) | 종종 혼란 (템플릿 깊은 곳) |
| 다중 타입 처리 | 같은 컨테이너에 (`vector<Base*>`) | 각각 별도 (`vector<Foo>` vs `vector<Bar>`) |
| 동작 추가/변경 | 인터페이스 수정 → 모든 derived 수정 | 사용처 추가로 — derived 영향 X |

## 사용 패턴 — 어느 쪽?

### OOP가 적합한 경우

- **이종 컨테이너**: `std::vector<std::unique_ptr<Shape>>` — 원이든 사각형이든 한 곳
- **런타임 결정**: 사용자 입력에 따라 다른 타입 선택
- **확장 가능 시스템**: 플러그인 등 — 동적 로딩
- **인터페이스 안정성 critical**: ABI 호환

### 템플릿이 적합한 경우

- **고성능**: 인라인 + 컴파일러 최적화 — STL 알고리즘
- **컴파일 타임 결정**: 호출 시점에 타입 알려진 경우
- **상속 관계 없이 호환**: `int`, `double`, 사용자 타입을 모두 같은 코드로
- **인터페이스의 미세 차이**: 멤버 함수 이름·시그니처가 약간씩 다른 타입들

## STL의 두 가지

표준 라이브러리는 둘 다 사용:

```cpp
// OOP 측면
class std::exception {
public:
    virtual const char* what() const noexcept;
};

class std::runtime_error : public std::exception { /* ... */ };
class std::logic_error   : public std::exception { /* ... */ };

// 템플릿 측면
template<typename T>
class std::vector { /* ... */ };

template<typename Iter, typename Pred>
auto std::find_if(Iter first, Iter last, Pred p);
```

**컨테이너·알고리즘은 템플릿**(컴파일 타임 + 인라인), **에러 타입 계층은 OOP**(런타임 + 다양한 에러).

## 함정 — 템플릿의 에러 메시지

```cpp
template<typename T>
T add(T a, T b) { return a + b; }

class Widget { /* operator+ 없음 */ };
add(Widget{}, Widget{});
```

C++17까지의 에러 메시지:

```
error: no match for 'operator+' (operand types are 'Widget' and 'Widget')
note: in instantiation of 'T add(T, T) [with T = Widget]'
note: ... 200줄 ...
```

**문제**: 어디가 잘못됐는지가 깊은 인스턴스화 체인 안에 묻힘. 사용자가 헤맴.

OOP라면:

```cpp
class Addable { virtual Addable add(const Addable&) = 0; };

Widget w;
// add 호출 시도하면 — Widget이 Addable derived가 아니라는 직접적 에러
```

## C++20 concepts — 암묵 인터페이스의 명시화

```cpp
template<typename T>
concept Addable = requires(T a, T b) {
    { a + b } -> std::convertible_to<T>;
};

template<Addable T>
T add(T a, T b) { return a + b; }

add(Widget{}, Widget{});
```

에러 메시지:

```
error: 'add(Widget, Widget)': constraints not satisfied
note: 'requires(T a, T b) { a + b }' did not match
note:   Widget does not have operator+
```

**concept이 인터페이스를 코드에 명시** — OOP의 장점(명확) + 템플릿의 장점(컴파일 타임 + 0 비용) 결합.

```cpp
// 인터페이스를 concept으로 묶음
template<typename T>
concept Widget = requires(T t, T other) {
    { t.size() } -> std::convertible_to<std::size_t>;
    t.normalize();
    t.swap(other);
    { t != other } -> std::convertible_to<bool>;
    T(t);     // 복사 생성 가능
};

template<Widget T>
void doStuff(T& w) { /* ... */ }    // T가 Widget 만족해야
```

## CRTP — 컴파일 타임 + 상속 결합

```cpp
template<typename Derived>
class Shape {
public:
    void draw() {
        static_cast<Derived*>(this)->doDraw();    // 컴파일 타임 디스패치
    }
};

class Circle : public Shape<Circle> {
public:
    void doDraw() { /* ... */ }
};
```

상속 문법을 빌리지만 — **컴파일 타임에 디스패치**. vtable 비용 0.

## 흔한 함정 — 잘못된 모델 선택

### 함수 객체에 OOP 사용

```cpp
class Comparator {
public:
    virtual bool operator()(int a, int b) const = 0;
};

class LessThan : public Comparator {
public:
    bool operator()(int a, int b) const override { return a < b; }
};

std::sort(v.begin(), v.end(), *comp);     // ⚠️ 매 비교마다 vtable 호출 — 느림
```

함수 객체는 보통 hot path — 컴파일 타임 다형성(템플릿)이 맞음:

```cpp
std::sort(v.begin(), v.end(), [](int a, int b) { return a < b; });
// lambda는 유니크 타입 — 컴파일 타임 + 인라인 + 0 비용
```

### 단일 타입 시스템에 템플릿 남발

```cpp
template<typename Database>
class UserRepo {
    Database db;
public:
    User find(int id) { return db.query(...); }
};

// 실제로는 PostgresDatabase 하나만 — 템플릿화 의미 없음
```

런타임 결정이 필요 없고 다양한 구현도 없으면 — OOP 또는 그냥 구체 타입.

## 종합 — 모던 C++ 가이드

| 시나리오 | 권장 |
| --- | --- |
| 컨테이너의 다양한 타입 | OOP (`vector<unique_ptr<Base>>`) |
| 고성능 알고리즘 | 템플릿 |
| 사용자 코드 확장 (플러그인) | OOP |
| 컴파일 타임 타입 검증 | concepts (C++20) |
| 큰 인터페이스, 명시 필요 | OOP 또는 concept |
| 가벼운 mixin / wrapper | CRTP |

## 실무 가이드 — 체크리스트

- [ ] 런타임 결정이 필요한가? → OOP
- [ ] 컴파일 타임 알려진 타입만 사용? → 템플릿
- [ ] 다양한 타입을 같은 컨테이너에? → OOP
- [ ] 핫 패스의 디스패치? → 템플릿 (또는 CRTP)
- [ ] C++20 사용 가능? → concepts로 인터페이스 명시
- [ ] 에러 메시지가 사용자에게 친절한가?

## 핵심 정리

1. **OOP** = 명시적 인터페이스 + 런타임 다형성 (vtable)
2. **템플릿** = 암묵 인터페이스 + 컴파일 타임 다형성 (인스턴스화)
3. 두 모델 모두 다형성 — **다른 트레이드오프**: 비용, 검증, 확장성
4. C++20 **concepts**로 템플릿 인터페이스 명시 — OOP의 장점 결합
5. **CRTP**로 상속 문법 + 컴파일 타임 디스패치
6. 도메인에 맞는 도구 선택 — 핫 패스는 템플릿, 확장은 OOP

## 관련 항목

- [항목 1: C++ 언어들의 연합체](/blog/programming/cpp/effective-cpp/item01-view-cpp-as-a-federation-of-languages) — 영역별 idiom
- [항목 35: 가상 함수의 대안](/blog/programming/cpp/effective-cpp/item35-consider-alternatives-to-virtual-functions) — 두 모델 비교의 실제
- [항목 42: typename의 두 의미](/blog/programming/cpp/effective-cpp/item42-understand-the-two-meanings-of-typename) — 템플릿 영역의 문법
