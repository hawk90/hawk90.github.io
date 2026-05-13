---
title: "항목 21: 반드시 객체를 반환해야 할 때 참조를 반환하려 하지 말라"
date: 2025-02-04T13:00:00
description: "지역 변수 참조 = 댕글링, 힙 + 참조 = 누수, static + 참조 = 공유 함정. RVO/move를 신뢰하고 값으로 반환."
tags: [C++, Effective C++, Reference, Return Value]
series: "Effective C++"
seriesOrder: 21
draft: true
---

## 왜 이 항목이 중요한가?

"참조 반환이 값 반환보다 빠르다"는 직관에서 출발한 함정이 많다. 함수가 **새 객체를 만들어 돌려줘야** 할 때 참조로 반환하려는 시도는 거의 항상 사고로 이어진다.

세 가지 경로가 모두 위험하다.

- **지역 변수의 참조** → 함수 종료 시 객체 소멸 → 댕글링.
- **힙 할당 + 참조 반환** → 호출자가 `delete`를 잊으면 누수. 잊지 않더라도 인터페이스가 어색하다.
- **static 객체의 참조** → 다중 호출자가 같은 객체를 공유 → 동시성 / 다중 비교 함정.

C++11 이동 의미론과 RVO 덕분에 **값 반환의 비용이 거의 0**이다. 그냥 값으로 반환하는 것이 가장 안전하고 효율적이다.

## 개요

함수가 **새 객체를 만들어 돌려줘야 할 때** 참조 반환은 위험하다. 지역 변수의 참조는 댕글링, 힙 할당은 누수, static 객체는 동시성과 다중 사용 문제다. 컴파일러의 RVO(Return Value Optimization)와 C++11 이동 의미론 덕분에 **값으로 반환하는 비용이 거의 0**이다. 그냥 값으로 반환하는 게 가장 안전하고 일반적으로 가장 효율적이다.

## 필수 개념: 함수가 반환할 수 있는 것

> **초보자를 위한 배경 지식**

<br>

함수의 반환 타입은 세 가지 카테고리.

| 카테고리 | 예 | 안전성 |
| --- | --- | --- |
| **값**(by-value) | `int f();`, `Widget f();` | 항상 안전 |
| **참조**(reference) | `int& f();`, `const T& f();` | 반환 대상의 라이프타임 확인 필요 |
| **포인터** | `T* f();`, `const T* f();` | 라이프타임 + nullptr 가능성 |

참조와 포인터를 반환할 땐 **반환된 대상이 함수 종료 후에도 살아 있어야** 합니다. 이게 보장되는 경우:
- 클래스 멤버에 대한 참조 (객체가 살아 있으면)
- 함수에 인자로 받은 객체에 대한 참조
- 정적/전역 객체에 대한 참조

보장되지 않는 경우:
- 함수 안에서 생성한 지역 변수에 대한 참조
- 함수 안에서 동적 할당한 객체 (누수 가능성)

## 위험 1 — 지역 변수의 참조

```cpp
const Rational& operator*(const Rational& a, const Rational& b) {
    Rational result(a.n * b.n, a.d * b.d);
    return result;     // ⚠️ 함수 종료 시 result 소멸 → 댕글링!
}

Rational a, b, c;
c = a * b;             // 댕글링 참조에 접근 — UB
```

`result`는 stack 변수 — 함수 스코프가 끝나면 사라집니다. 반환된 참조가 가리키는 메모리는 곧 다른 용도로 재사용. 디버그 빌드에선 값이 그대로 남아 동작할 수도 있지만 — 표준상 UB.

좋은 컴파일러는 경고:
```
warning: reference to local variable 'result' returned
```

## 위험 2 — 힙 할당 + 참조

```cpp
const Rational& operator*(const Rational& a, const Rational& b) {
    Rational* p = new Rational(a.n * b.n, a.d * b.d);
    return *p;          // ⚠️ 누구가 delete?
}

Rational x, y, z;
Rational w = x * y * z;     // 임시 객체 두 개 — 누수 두 번
//             ^^^^^^^^^
//             1) (x * y) → Rational* p1, *p1 반환
//             2) (p1 * z) → Rational* p2, *p2 반환 — p1은 어디갔지?
//             3) w = *p2  → p2도 delete 호출자 없음
```

참조 반환은 호출자에게 "delete 호출 책임"을 전달할 수단이 없습니다. raw pointer 반환이라면 호출자가 delete 해야 하는데, 참조는 그 의도 자체가 부재.

연쇄 호출(`a * b * c`)에선 더 심각 — 중간 임시 결과가 모두 누수.

## 위험 3 — static 객체

```cpp
const Rational& operator*(const Rational& a, const Rational& b) {
    static Rational result;
    result = Rational(a.n * b.n, a.d * b.d);
    return result;     // ⚠️ 같은 static을 모든 호출이 공유
}

Rational a, b, c, d;
if ((a * b) == (c * d)) ...     // ⚠️ 항상 true!
```

**왜 항상 true?**
1. `(a * b)` 호출 → `result`가 `(a*b)`로 설정, `result`의 참조 반환
2. `(c * d)` 호출 → 같은 `result`가 `(c*d)`로 덮어씌워짐, 같은 참조 반환
3. `==` 비교 시점에 두 참조 모두 같은 `result`를 가리킴 → 같은 값
4. 항상 true

추가로:
- **스레드 안전성 X** — 여러 스레드가 같은 static을 동시 수정
- **재진입 안전성 X** — 재귀 호출에서 깨짐

## 해결 — 값으로 반환

```cpp
Rational operator*(const Rational& a, const Rational& b) {
    return Rational(a.n * b.n, a.d * b.d);
}

Rational c = a * b;     // ✅ 안전, 효율적
```

"값 반환은 복사 비용이 비쌀 텐데?" — **거의 그렇지 않음**.

## RVO / NRVO — Return Value Optimization

컴파일러는 값 반환의 복사를 **제거**할 수 있습니다.

```cpp
Rational make() {
    return Rational(1, 2);    // 임시 객체 — return Rational(...)
}

Rational r = make();          // 보기엔 두 번의 복사:
                              // 1) 함수 안 임시 → 반환값
                              // 2) 반환값 → r
                              // 실제로는: 두 복사 모두 제거 — r에 직접 생성
```

이게 **RVO**(Return Value Optimization). 표준은 C++17부터 **반드시** 일부 케이스에서 적용(guaranteed copy elision).

### NRVO — Named Return Value Optimization

```cpp
Rational make() {
    Rational tmp(1, 2);       // 이름 있는 객체
    // ... 추가 작업 ...
    return tmp;                // NRVO — tmp가 호출자의 객체 위치에 직접 생성
}
```

이름이 있는 지역 변수의 RVO. **C++17까지 옵션**이지만 대부분 컴파일러가 적용. C++17 이후엔 일부 케이스가 guaranteed.

### copy elision 조건

RVO/NRVO가 적용되려면:
- 단일 return 문 또는 모든 경로가 같은 이름 변수 반환
- 클래스 타입이고 그 자리에 만들어진 객체
- 매개변수와 같은 객체가 아님 (move semantics가 다름)

```cpp
Widget bad(Widget w) {
    return w;                  // ⚠️ NRVO 적용 불가 (매개변수)
                               //    C++11+ 자동 move
}
```

## C++11 이동 — 또 다른 안전망

RVO가 적용 안 돼도 C++11+ 에서는 **이동 생성자** 호출:

```cpp
std::vector<int> make() {
    std::vector<int> v(1000000);
    return v;     // RVO 적용되면 0 비용, 아니면 move ctor (포인터만 교환)
}

auto big = make();   // 항상 빠름
```

`std::vector`처럼 이동 의미론을 지원하는 타입은 — RVO 실패해도 거의 무비용.

## 참조 반환이 적절한 경우

새 객체가 아닌 **기존 객체**를 가리킬 때:

```cpp
class Container {
    std::vector<T> data;
public:
    T& at(size_t i)             { return data[i]; }       // ✅ 멤버 데이터
    const T& at(size_t i) const { return data[i]; }       // ✅
};

Container& operator<<(Container& c, const T& x) {        // ✅ 인자에 대한 참조
    c.push_back(x);
    return c;
}

class Singleton {
public:
    static Singleton& instance() {
        static Singleton s;       // ✅ Meyers' singleton — 라이프타임 보장
        return s;
    }
};
```

참조 반환의 정당한 사용: 함수가 새 객체를 만들지 않고 **이미 있는 것을 가리키는** 경우.

## 흔한 패턴 — operator의 반환 타입

| 연산자 | 반환 타입 |
| --- | --- |
| `operator+` (binary) | 값 (`T`) — 새 객체 |
| `operator+=` (compound) | `T&` — `*this` |
| `operator=` | `T&` — `*this` (항목 10) |
| `operator*` (역참조) | 보통 `T&` 또는 `const T&` — 가리키는 객체 |
| `operator[]` | `T&` 또는 `const T&` — 컨테이너 요소 |

산술의 binary는 값 반환, compound는 참조 반환 — 일관된 패턴.

## 흔한 함정 — auto와 참조

```cpp
auto v = make();           // auto는 참조 안 받음 — 값 복사 (move 가능)
auto& v = make();          // ❌ 임시 객체에 lvalue 참조 — 에러
const auto& v = make();    // ✅ const lvalue ref는 임시 라이프타임 확장
auto&& v = make();         // ✅ forwarding ref — 임시 라이프타임 확장
```

`auto`는 값 복사. 참조가 필요하면 명시.

## 모던 변형 — `std::optional`, structured bindings

```cpp
std::optional<Widget> findWidget(int id);     // 실패 가능성을 타입에 반영

auto result = findWidget(42);
if (result) {                                   // explicit bool 변환
    use(*result);                                 // 역참조
}

std::pair<int, std::string> parseLine(const std::string& s);
auto [code, msg] = parseLine("...");           // C++17 structured bindings
```

`optional`, `variant`, `expected`(C++23)으로 단일 객체 + 상태 반환.

## 실무 가이드 — 결정 트리

```
이 함수는 무엇을 반환하는가?
├── 새로 만든 객체 → 값으로 (RVO + move가 비용 제거)
├── 인자/this의 일부 → 참조 가능 (라이프타임 OK)
├── 멤버 데이터 → 참조 가능 (객체 라이프타임 안에)
├── 정적/전역 객체 → 참조 가능 (Meyers' singleton)
└── 동적 할당 → unique_ptr/shared_ptr로 (raw pointer + 참조 금지)
```

## 실무 가이드 — 체크리스트

- [ ] 함수가 새 객체를 생성하는가? → 값 반환
- [ ] 함수가 기존 객체를 가리키는가? → 참조 가능 (라이프타임 확인)
- [ ] 지역 변수의 참조 반환은 절대 X
- [ ] 힙 할당 + 참조 반환 X — `unique_ptr`/`shared_ptr` 사용
- [ ] static 객체 참조 — 스레드/재진입 안전 검토
- [ ] C++11+ 이동 의미론 활용 — `vector`, `string` 등 부담 없음

## 핵심 정리

1. **새 객체 반환은 값으로** — 참조는 위험
2. 지역 변수 참조 = **댕글링**
3. 힙 할당 + 참조 = **누수**
4. static + 참조 = **공유·동시성 함정**
5. **RVO/NRVO**와 **C++11 이동 의미론**으로 값 반환 비용 거의 0
6. 참조 반환은 **기존 객체**를 가리킬 때만 — 라이프타임 보장 검토

## 관련 항목

- [항목 10: 대입 연산자는 *this 참조 반환](/blog/programming/cpp/effective-cpp/item10-have-assignment-operators-return-reference-to-this) — 참조 반환의 정당한 사용
- [항목 20: 값 전달보다 const 참조 전달](/blog/programming/cpp/effective-cpp/item20-prefer-pass-by-reference-to-const-to-pass-by-value) — 매개변수에서의 참조
- [항목 28: 객체 내부 핸들 반환 금지](/blog/programming/cpp/effective-cpp/item28-avoid-returning-handles-to-object-internals) — 멤버 참조의 함정
