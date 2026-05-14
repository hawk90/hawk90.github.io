---
title: "항목 20: 값 전달보다 const 참조 전달을 선호하라"
date: 2025-02-01T20:00:00
description: "복사 비용 + 슬라이싱 회피 — 그러나 작은 내장 타입과 STL 반복자/함수 객체는 값 전달. C++11 이동 의미론으로 by-value도 재평가."
tags: [C++, Effective C++, Performance, Pass by Reference]
series: "Effective C++"
seriesOrder: 20
draft: true
---

## 왜 이 항목이 중요한가?

함수 매개변수를 어떻게 전달하느냐는 매일 작성하는 코드의 결정이다. 잘못 선택하면 두 가지 사고가 난다.

- **큰 객체에 by-value** → 매번 copy 비용. 핫 패스에서는 무시 못 하는 수준이다.
- **다형성 객체에 by-value** → **객체 슬라이싱**. derived 부분이 잘려나가 base 부분만 복사된다. 컴파일러는 경고하지 않고, 다형성 호출이 조용히 깨진다.

기본 규칙은 단순하다. **`const T&`를 default로**. 단 두 가지 예외가 있다.

- **작은 내장 타입** (`int`, `double`, 포인터) — 참조보다 값이 빠르다.
- **STL 반복자와 함수 객체** — 가벼움이 전제다.

C++11 이동 의미론으로 by-value 패턴 일부가 다시 평가됐다 ([EMC 항목 41](/blog/programming/cpp/effective-modern-cpp/item41-consider-pass-by-value-for-copyable-cheap-to-move-always-copied-params)). 이 항목은 그 결정 기준을 정리한다.

## 개요

함수 매개변수의 기본 전달 방식은 **값 전달**(by-value)이다. 인자가 매개변수에 복사된다. 큰 클래스 객체에선 이 복사가 비싸고, 다형성 객체에선 **슬라이싱**(derived 부분 손실)이 일어난다. 대부분의 경우 `const T&` 참조 전달이 안전하고 효율적이다. 단, **작은 내장 타입과 STL 반복자/함수 객체**는 예외다. C++11 이동 의미론으로 일부 영역에선 by-value도 재평가됐다.

## 필수 개념: 값 전달 시 일어나는 일

> **초보자를 위한 배경 지식**

<br>

```cpp
void f(Person p);       // 값 전달

Person student = ...;
f(student);             // 함수 호출
```

호출 시점에:
1. `p`의 메모리 공간 확보 (스택 또는 레지스터)
2. `Person`의 **복사 생성자** 호출 — `student`에서 `p`로 복사
3. `Person` 클래스의 멤버가 또 다른 클래스 타입이면 — 그 클래스의 복사 생성자도 호출
4. `f` 종료 시 `p`의 **소멸자** 호출

```cpp
class Person {
    std::string name;     // string 복사 — 동적 할당 가능
    std::string address;  // string 복사 — 동적 할당 가능
};

f(student);
//  → Person 복사 ctor 호출
//    → name 복사 ctor 호출 → string 할당 + memcpy
//    → address 복사 ctor 호출 → string 할당 + memcpy
//  → f 종료 시
//    → Person dtor 호출
//      → address dtor → string 해제
//      → name dtor → string 해제
```

가벼운 호출 하나에 **수 차례의 동적 할당과 해제**.

## 복사 비용 회피 — `const T&`

```cpp
void f(const Person& p);     // 참조 전달

f(student);                   // 복사 없음 — 주소만 전달
```

참조는 본질적으로 **포인터** — 8 byte. 복사 생성자/소멸자 호출 없음. 큰 객체일수록 이득.

## 슬라이싱 방지 — 더 미묘한 함정

```cpp
class Window {
public:
    virtual void display() const { /* 일반 윈도우 */ }
};

class WindowWithScrollBars : public Window {
public:
    void display() const override { /* 스크롤바 윈도우 */ }
};

void f(Window w);           // 값 전달 — 슬라이싱!
void g(const Window& w);    // 참조 전달 — 다형성 유지

WindowWithScrollBars sw;
f(sw);                       // sw가 Window로 슬라이싱
                             // Window의 복사 생성자 호출 — Window 부분만 복사
                             // → f 안에서 w.display() = Window::display() 호출
                             //   (WindowWithScrollBars::display 호출 안 됨)
g(sw);                       // 참조 — 다형성 유지
                             // → w.display() = WindowWithScrollBars::display()
```

**슬라이싱**: derived 객체를 base 매개변수에 값 전달하면, derived 부분이 잘려나가고 **base 부분만 복사**. 가상 함수가 다형적으로 디스패치되지 않음.

복사 비용 외에 — **동작 자체가 잘못됨**. 다형성 코드에서 절대 by-value로 받지 말 것.

## 예외 — 작은 내장 타입

```cpp
void f(int x);              // 값 전달 — 4 byte
void g(const int& x);       // 참조 — 8 byte(64-bit), 간접 참조 비용
```

`int` 같은 작은 내장 타입은:
- 복사 비용 = 1 레지스터 이동
- 참조 비용 = 주소 전달 + 간접 참조

→ **값 전달이 더 빠르고 단순**.

## 예외 — STL 반복자와 함수 객체

```cpp
std::for_each(v.begin(), v.end(), MyFunctor{});
//                                ^^^^^^^^^^^ 값 전달
```

STL은 반복자와 함수 객체를 **포인터처럼 가벼움**을 전제로 설계 — 값 전달이 자연스러움. 라이브러리 내부에서도 by-value로 다룸.

```cpp
template<typename Iter, typename Pred>
Iter find_if(Iter first, Iter last, Pred p) {     // p는 값
    for (; first != last; ++first)
        if (p(*first)) return first;
    return last;
}
```

함수 객체는 작아야 함 — 그래야 STL 알고리즘 비용이 합리적. 함수 객체에 큰 상태가 있으면 `std::ref`로 참조 wrapping.

## 값 전달이 더 효율적인 경우 — 컴파일러 최적화

작은 값 타입은 컴파일러가 레지스터에 둘 수 있음:

```cpp
struct Point2D { int x, y; };    // 8 byte — 한 레지스터

void f(Point2D p);                // 레지스터로 — 매우 빠름
void g(const Point2D& p);         // 메모리 주소 — 약간의 간접 참조
```

작은 trivially copyable 타입은 by-value가 동등하거나 더 빠를 수 있음.

**규칙**: `sizeof(T) <= 2 * sizeof(void*)` 이고 trivially copyable이면 by-value 고려.

## C++11 이동 의미론 — by-value 재평가

이동 의미론 덕분에 일부 경우엔 by-value가 다시 효율적:

```cpp
class Widget {
    std::string name;
public:
    // 옵션 A — const T& 전달
    void setName(const std::string& n) { name = n; }
    
    // 옵션 B — by-value 전달 + 이동
    void setName(std::string n) { name = std::move(n); }
};

Widget w;
w.setName("Alice");                // 옵션 A: const char* → string 변환 → 대입 복사
                                    //        ≈ 1 할당 + 1 복사
                                    // 옵션 B: const char* → string 변환 → 이동 대입
                                    //        ≈ 1 할당 + 1 이동(거의 무비용)

std::string n = ...;
w.setName(n);                       // 옵션 A: 참조 → 복사 대입
                                    //        ≈ 1 복사
                                    // 옵션 B: 복사 ctor → 이동 대입
                                    //        ≈ 1 복사 + 1 이동

w.setName(std::move(n));            // 옵션 A: 참조 → 복사 대입 (move 잃음!)
                                    // 옵션 B: 이동 ctor → 이동 대입
                                    //        ≈ 2 이동 (거의 무비용)
```

`std::move`로 넘기는 호출자가 있고 클래스 멤버가 이동 가능하면 — by-value + move가 통합된 선택. EMC++ item 41.

## 비교 표 — 어떤 전달 방식?

| 타입 | 권장 |
| --- | --- |
| 작은 내장 타입 (`int`, `double`) | by-value |
| STL 반복자, 함수 객체 | by-value |
| 작은 trivially copyable 타입 (`Point2D`) | by-value |
| 큰 사용자 정의 클래스 | `const T&` |
| 다형성 base 클래스 | `const T&` (또는 `T*`) — 슬라이싱 차단 |
| 함수 안에서 멤버에 저장 (sink) + C++11 이동 가능 | by-value + `std::move` |
| 출력 매개변수 (수정) | `T&` (참조, non-const) |
| 옵션 매개변수 | `const T*` 또는 `std::optional<T>` |

## C 호환 — pointer는 by-value의 일종

```cpp
void f(const T* p);    // pointer를 값으로 전달 (포인터 자체는 8 byte 복사)
                       //   가리키는 객체는 복사 X — 참조 효과
```

C API와의 호환을 위해 pointer를 받는 경우 — by-value지만 의미는 참조에 가까움. C++에선 nullptr 가능성 때문에 보통 reference 선호.

## 슬라이싱은 by-value의 다형성에서만

```cpp
void f(Window w);                  // ⚠️ 슬라이싱 — by-value
void g(const Window& w);            // ✅ 다형성 유지

void h(std::vector<Window> v);     // ⚠️ vector 안 객체도 슬라이싱 위험
                                    //    (요소가 base 객체로 복사됨)
```

다형적 컬렉션은 `std::vector<std::unique_ptr<Window>>` — 포인터를 담음.

## 모던 변형 — `std::string_view` (C++17)

```cpp
void f(const std::string& s);     // 좋음 — 그러나 호출자가 std::string 만들어야
void f(std::string_view s);       // 더 좋음 — 어떤 string-like도 OK

f("literal");                      // string 만들 필요 없음 — view로 직접
f(std::string("hello"));           // 임시 string → view 변환 OK
```

`string_view`는 **포인터 + 길이**의 뷰 — by-value지만 가벼움(16 byte). 임시 string 생성 회피.

비슷한 도구: `std::span<T>`(C++20) for 배열/벡터, `gsl::span` for C++17.

## 흔한 함정 — reference의 라이프타임

```cpp
const std::string& getName(const Person& p) {
    return p.name;                    // OK — p가 살아있는 동안 안전
}

const std::string& getDefault() {
    return std::string("default");     // ⚠️ 임시 객체 — 함수 종료 시 소멸
}                                       //    dangling reference!
```

reference를 반환할 땐 라이프타임 확인 (항목 21).

## 실무 가이드 — 체크리스트

함수 매개변수 결정 시:

- [ ] 타입이 작고 trivially copyable인가? → by-value
- [ ] STL 반복자/함수 객체? → by-value
- [ ] 큰 클래스인가, 비싼 복사? → `const T&`
- [ ] 다형성 base? → `const T&` (슬라이싱 차단)
- [ ] 함수 안에서 멤버에 저장 + C++11 이동 가능? → by-value + move
- [ ] 출력? → `T&` non-const
- [ ] 문자열-like? → `std::string_view`(C++17)

## 핵심 정리

1. **`const T&` 기본** — 큰 객체의 복사 비용 회피, 슬라이싱 차단
2. **작은 내장 타입, STL 반복자/함수 객체**는 by-value 예외
3. **다형성 base는 절대 by-value 금지** — 슬라이싱
4. C++11+ **by-value + move**가 일부 sink에서 우아 (EMC++ item 41)
5. C++17 **`std::string_view`** — 임시 string 회피
6. reference의 라이프타임 주의 — 임시 객체 참조 반환 금지

## 관련 항목

- [항목 21: 객체 반환 시 참조 X](/blog/programming/cpp/effective-cpp/item21-dont-try-to-return-a-reference-when-you-must-return-an-object) — 참조의 라이프타임
- [항목 25: non-throwing swap](/blog/programming/cpp/effective-cpp/item25-consider-support-for-a-non-throwing-swap) — 큰 객체 효율 교환
- [Effective Modern C++ 항목 41: by-value vs move](/blog/programming/cpp/effective-modern-cpp/item41-consider-pass-by-value-for-copyable-parameters-that-are-cheap-to-move-and-always-copied) — 모던 트레이드오프
