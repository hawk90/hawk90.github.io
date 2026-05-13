---
title: "항목 12: 재정의 함수에는 override를 선언하라"
date: 2025-01-06T15:00:00
description: "override 키워드로 가상 함수 재정의의 미묘한 실수를 컴파일 타임에 잡아낸다. 참조 한정자도 함께."
tags: [C++, virtual, override, Modern C++]
series: "Effective Modern C++"
seriesOrder: 12
---

## 왜 이 항목이 중요한가?

가상 함수 재정의는 매일 작성하는 코드인데, 시그니처가 조금이라도 어긋나면 컴파일러가 **침묵**한다. base를 재정의했다고 생각하지만 실제로는 새 가상 함수가 만들어진다. 다형성 호출은 여전히 base로 간다.

흔한 실수들이다.

- `const` 빠뜨림.
- 매개변수 타입 미세 차이 (`int` vs `unsigned`).
- C++11의 참조 한정자(`&`, `&&`) 누락.
- base의 시그니처가 바뀐 뒤 derived가 따라가지 못함.

C++11의 `override` 키워드는 "이건 재정의여야 한다"고 컴파일러에 검증을 위임한다. 실수가 컴파일 타임에 잡힌다. 이 항목은 그 동작과, `final` 키워드, 참조 한정자 검증까지 함께 본다.

## 개요

가상 함수를 재정의(override)할 때 시그니처가 조금이라도 어긋나면 base 함수를 가리는 **새로운 가상 함수**가 만들어진다. 컴파일러는 침묵한다. C++11의 `override` 키워드는 "이건 재정의여야 한다"고 컴파일러에 검증을 위임한다. 실수가 컴파일 타임에 잡힌다.

## 필수 개념: 재정의 vs 새 함수

> **초보자를 위한 배경 지식**

<br>

가상 함수 재정의가 인정되려면 **시그니처와 다음 항목들**이 모두 일치해야 한다.

| 일치해야 하는 것 |
| --- |
| 함수 이름 |
| 매개변수 타입 |
| **const성** |
| **참조 한정자** (`&`, `&&` — C++11+) |
| 반환 타입 (covariant 허용) |
| **예외 명세** 호환 |
| **virtual 여부** |

하나라도 어긋나면 **재정의가 아니라 새 가상 함수**가 만들어진다.

### 위험한 침묵 함정

```cpp
class Base {
public:
    virtual void f1() const;
    virtual void f2(int);
    virtual void f3() &;        // *this가 lvalue일 때만 호출
    void         f4() const;    // virtual 아님
};

class Derived : public Base {
public:
    virtual void f1();           // const 빠짐 — 새 함수!
    virtual void f2(unsigned);   // 매개변수 타입 다름 — 새 함수!
    virtual void f3() &&;        // 한정자 다름 — 새 함수!
    virtual void f4() const;     // base에 virtual 없음 — 새 가상 함수!
};
```

위 네 함수 모두 **재정의가 아닌데** 컴파일러는 경고하지 않는다. 사용자는 다형성 동작을 기대하지만 base 함수가 호출된다.

## 해결: `override`

```cpp
class Derived : public Base {
public:
    virtual void f1() override;        // 에러! const 빠짐
    virtual void f2(unsigned) override;// 에러! 시그니처 불일치
    virtual void f3() && override;     // 에러! 한정자 다름
    virtual void f4() const override;  // 에러! base에 virtual 없음
};
```

컴파일러가 모두 잡아낸다. 의도가 코드에 박혀 있어 자기 검증이 된다.

## `override`의 추가 이점

### 1. 의도 표현

`override`가 적힌 함수는 "이건 base의 가상 함수를 재정의하는 것"이다. 코드를 읽는 사람에게도 명확하다.

### 2. base 변경 시 회귀 방지

base의 가상 함수 시그니처가 바뀌면 derived에서 즉시 컴파일 에러가 난다. **잠잠히 기능을 잃지 않는다.**

```cpp
// before
class Base { virtual void doIt(int); };
class Derived : Base { virtual void doIt(int) override; };

// base 변경
class Base { virtual void doIt(int, int); };

// derived 즉시 컴파일 에러 — override가 base에 없는 함수 가리킴
// → 사용자가 알아채고 derived도 수정
```

`override`가 없으면 derived의 옛 `doIt(int)`가 그냥 새 함수가 되어 다형성 호출은 base의 `doIt(int, int)`로 간다. **버그다.**

## 참조 한정자 멤버 함수 — 한 발 더

C++11부터 멤버 함수에 **`&`, `&&` 한정자**를 붙일 수 있다.

```cpp
class Widget {
public:
    void doWork() &;     // *this가 lvalue일 때만 호출
    void doWork() &&;    // *this가 rvalue일 때만 호출
};

Widget w;
w.doWork();              // & 버전 — w는 lvalue

makeWidget().doWork();   // && 버전 — 임시 객체는 rvalue
```

### 사용 예 — 임시에서 효율적 추출

`&&` 버전에서 내부 데이터를 move할 수 있다.

```cpp
class DataHolder {
    std::vector<int> data;
public:
    std::vector<int>& access() &       { return data; }
    std::vector<int>  access() &&      { return std::move(data); }
//                              ^^      임시일 때만 — 값으로 리턴 + move
};

DataHolder h;
auto& d1 = h.access();              // & — 참조
auto  d2 = makeDataHolder().access(); // && — move (임시 객체에서)
```

임시 객체에서 더 효율적으로 추출할 수 있다.

### `override`와 결합

```cpp
class Base {
public:
    virtual void f() & = 0;
    virtual void f() && = 0;
};

class Derived : public Base {
public:
    void f() &  override { /* lvalue */ }
    void f() && override { /* rvalue */ }
};
```

`override`로 한정자도 검증된다.

## `final` — "더 이상 재정의 금지"

C++11의 또 다른 키워드다.

### 함수에 final — 더 이상 override 못 함

```cpp
class Base {
public:
    virtual void f();
};

class Derived : public Base {
public:
    void f() override final;   // override + 더는 막음
};

class More : public Derived {
public:
    void f() override;         // 에러! Derived::f가 final
};
```

### 클래스에 final — 상속 금지

```cpp
class Final final {            // 더 이상 상속 불가
};

class Derived : public Final {  // 에러!
};
```

성능 최적화에도 쓰인다. `final` 클래스/함수는 컴파일러가 가상 호출을 직접 호출로 변환할 수 있다 (devirtualization).

## 함정 — `override` 위치

`override`는 **함수 시그니처 끝에**, `;` 또는 `{` 앞에 위치해야 한다.

```cpp
void f(int) const override;        // OK
override void f(int) const;        // 에러
void f(int) override const;        // 에러
```

`const`, `noexcept`, `volatile`, `&`/`&&` 다음에 온다.

## `override`/`final`은 contextual keyword

`override`와 `final`은 **contextual keyword**다. 함수 선언 안에서만 키워드이고, 그 외에는 일반 식별자다.

```cpp
int override = 5;     // OK — 변수명 (어색하지만)
class Final {};       // OK — 클래스명
```

기존 코드 호환성을 위해 contextual로 만들었다.

## 마이그레이션 가이드

기존 코드에 `override`를 추가하려면 다음을 활용한다.

```bash
# clang-tidy 자동
clang-tidy -checks='modernize-use-override' --fix file.cpp
```

수동으로 할 때는 이렇게 한다.

- 모든 derived의 가상 함수에 `override`를 추가한다.
- 컴파일 에러 = 시그니처 불일치를 발견한 것이다.
- 의도된 새 함수면 base에도 virtual을 추가하고, 아니면 derived를 수정한다.

## 핵심 정리

1. **재정의는 시그니처가 정확히 일치**해야 한다. 어긋나면 새 가상 함수가 된다 (조용한 버그).
2. **`override`로 컴파일러에 검증을 위임**한다. 항상 사용하는 것이 권장된다.
3. **base 변경 시 회귀 방지** 효과가 있다.
4. **`final`** 도 함께 쓴다. 더 이상 재정의를 금지하고, devirtualization 최적화 기회를 만든다.
5. C++11+ 참조 한정자 `&`/`&&`도 `override`로 검증할 수 있다.

## 관련 항목

- [항목 11: private + 미정의보다 deleted function을 선호하라](/blog/programming/cpp/effective-modern-cpp/item11-prefer-deleted-functions-to-private-undefined) — 안전한 API 설계
- [항목 17: 특수 멤버 자동 생성](/blog/programming/cpp/effective-modern-cpp/item17-understand-special-member-function-generation) — 특수 멤버는 override가 아니다 (자동 생성)
