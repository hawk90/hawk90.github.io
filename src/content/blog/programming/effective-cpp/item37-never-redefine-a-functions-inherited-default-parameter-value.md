---
title: "항목 37: 상속받은 함수의 기본 매개변수 값을 재정의하지 말라"
date: 2025-02-06T15:00:00
description: "기본값은 정적 바인딩, 함수 본문은 동적 바인딩 — 어긋나면 derived 본문이 base 기본값으로 호출되는 함정."
tags: [C++, Effective C++, Virtual, Default Arguments]
series: "Effective C++"
seriesOrder: 37
---

## 개요

가상 함수의 본문은 **동적 바인딩**(런타임에 객체 실제 타입의 함수 호출)이지만, 기본 매개변수 값은 **정적 바인딩**(컴파일 타임에 호출자 포인터 타입으로 결정). 둘이 어긋나면 — **derived의 본문이 base의 기본값으로 호출**되는 매우 헷갈리는 동작.

## 필수 개념: 정적 vs 동적 바인딩 — 다시

> **초보자를 위한 배경 지식**

<br>

```cpp
class Base {
public:
    virtual void f();    // 가상 함수
};

class Derived : public Base {
public:
    void f() override;   // override
};

Base* p = new Derived;
p->f();         // 동적 바인딩 — Derived::f 호출 (런타임)
```

**정적 바인딩** (static binding):
- 컴파일러가 컴파일 타임에 결정
- 포인터/참조의 **선언 타입**에 의존
- 적용 대상: non-virtual 함수, **기본 매개변수 값**, 변수 타입

**동적 바인딩** (dynamic binding):
- 런타임에 vtable로 결정
- 객체의 **실제 타입**에 의존
- 적용 대상: 가상 함수 본문

## 함정 — 기본값과 본문의 불일치

```cpp
enum Color { Red = 0, Green = 1, Blue = 2 };

class Shape {
public:
    virtual void draw(Color c = Red) const = 0;     // 기본값: Red
};

class Circle : public Shape {
public:
    void draw(Color c = Green) const override {     // 기본값: Green (변경!)
        std::cout << "Color: " << c << '\n';
    }
};

Shape*  ps = new Circle;
Circle* pc = new Circle;

pc->draw();     // "Color: 1" (Green) — pc 타입이 Circle → Green
ps->draw();     // "Color: 0" (Red)   — ⚠️
                //
                // 호출되는 함수: Circle::draw (동적 바인딩)
                // 사용되는 기본값: Red (정적 바인딩 — ps의 타입이 Shape*)
                // → Circle::draw가 Red를 인자로 받음!
```

`ps->draw()` 호출 시:
1. 컴파일러: `Shape::draw`의 기본값 `Red`로 변환 — `ps->draw(Red)`
2. 런타임: vtable이 `Circle::draw`를 호출
3. → `Circle::draw(Red)` 실행

**Circle 사용자는 기본값으로 Green을 기대**했을 텐데, Shape 포인터로 호출했더니 Red가 사용됨. 매우 미묘한 버그.

## 왜 이렇게 설계됐나 — 효율

기본값을 동적 바인딩하려면 매 호출마다 vtable + 기본값 테이블 조회 — 비용. C++은 기본값을 **호출 측에 인라인 삽입**:

```cpp
ps->draw();           // 컴파일러가 다음으로 변환:
ps->draw(Red);        // ← Shape::draw의 기본값 사용
```

이 변환이 컴파일 타임에 일어남 — 정적. 다형성과 어긋나지만 효율 우선.

## 해결 1 — derived에서 기본값 재정의 안 하기

```cpp
class Circle : public Shape {
public:
    void draw(Color c) const override {     // ✅ 기본값 명시 안 함
        std::cout << "Color: " << c << '\n';
    }
};

Circle* pc = new Circle;
pc->draw();           // ❌ 컴파일 에러 — 기본값 없음
pc->draw(Green);      // ✅
```

base가 기본값을 정의했지만 derived는 안 함 → derived 객체로 직접 호출 시 인자 명시 필요. 안전하지만 다소 불편.

**또는** — base와 동일 기본값:

```cpp
class Circle : public Shape {
public:
    void draw(Color c = Red) const override {   // base와 동일
        // ...
    }
};
```

이 경우 일치하지만 — base의 기본값이 바뀌면 derived도 따라 바꿔야 함. **DRY 위반**. 컴파일러가 일치 검증 안 함.

## 해결 2 — NVI 패턴 (권장)

기본값을 public non-virtual에 두고, 내부 private virtual은 기본값 없음:

```cpp
class Shape {
public:
    void draw(Color c = Red) const {     // ✅ non-virtual + 기본값 (한 곳)
        doDraw(c);
    }
private:
    virtual void doDraw(Color c) const = 0;     // 기본값 없음
};

class Circle : public Shape {
private:
    void doDraw(Color c) const override {
        std::cout << "Color: " << c << '\n';
    }
};

Shape*  ps = new Circle;
Circle* pc = new Circle;

ps->draw();           // "Color: 0" (Red)
pc->draw();           // "Color: 0" (Red)
ps->draw(Green);      // "Color: 1" (Green)
```

**왜 동작하나**:
- `draw`는 non-virtual — 정적 바인딩. 어느 타입의 포인터로 호출해도 같은 함수.
- 그 함수 안에서 `doDraw`(virtual) 호출 — 동적 바인딩. 실제 타입의 함수.
- 기본값은 **한 곳**에만 — 일관성 보장.

## 함수 호출 흐름 비교

기본값을 derived에 둠 (함정):

```
ps->draw();
  ↓ 컴파일러: Shape::draw의 기본값 'Red' 삽입
ps->draw(Red);
  ↓ vtable
Circle::draw(Red);    ⚠️ Circle 기본값 무시
```

NVI 패턴:

```
ps->draw();
  ↓ 컴파일러: Shape::draw(non-virtual)의 기본값 'Red' 삽입
ps->draw(Red);
  ↓ Shape::draw 본문 실행 (non-virtual — 정적)
  ↓ this->doDraw(Red);
  ↓ vtable
Circle::doDraw(Red);   ✅ 의도된 동작
```

## 함정 — 컴파일러가 거의 경고 안 함

```
warning: virtual function 'Circle::draw' has a different default argument
         than overridden function 'Shape::draw'
```

일부 컴파일러(clang `-Wdefault-arg-special`)가 잡지만 GCC, MSVC는 보통 침묵. 코드 리뷰로 잡아야.

## 흔한 함정 — 라이브러리 인터페이스

```cpp
// 라이브러리 헤더 (v1)
class Plugin {
public:
    virtual void process(int level = 5) = 0;
};

// 사용자 코드
class MyPlugin : public Plugin {
public:
    void process(int level = 5) override { /* ... */ }     // 일관 유지
};

// 라이브러리 v2 — 기본값 변경
class Plugin {
public:
    virtual void process(int level = 7) = 0;     // 기본값 5 → 7
};

// MyPlugin 코드 그대로 (재컴파일)
// → Plugin*로 호출 시: process(7) — base 기본값
// → MyPlugin*로 호출 시: process(5) — derived 기본값 (옛것)
// 불일치!
```

라이브러리가 기본값 바꿀 때마다 모든 derived도 재정의 업데이트 — 매우 깨지기 쉬움.

## 다른 함정 — 디폴트 매개변수의 일반 함수

```cpp
void f(int x = 10);

class C {
public:
    void f(int x = 20);     // C의 멤버 — 무관
};

C c;
c.f();           // 20 — C::f의 기본값
```

가상 함수가 아닌 멤버 함수의 기본값은 가림 — 정상. 가상 함수의 경우만 위 함정.

## 모던 변형 — `[[deprecated]]` 와 인터페이스 진화

```cpp
class Plugin {
public:
    virtual void process(int level) = 0;             // 인터페이스에 기본값 X
};

class MyPlugin : public Plugin {
public:
    void process(int level) override { /* ... */ }   // 기본값 없음
};

// 사용 시
plugin->process(5);    // 항상 명시
```

기본값 자체를 인터페이스에서 빼고 — 호출자에 명시 강제. NVI 적용이 더 깔끔하지만 단순한 방법.

## 흔한 변형 — 기본값을 const 변수로

```cpp
class Shape {
public:
    static constexpr Color DefaultColor = Red;     // 명시적 상수

    virtual void draw(Color c) const = 0;
};

class Circle : public Shape {
public:
    void draw(Color c) const override { /* ... */ }
};

shape.draw(Shape::DefaultColor);    // 호출자가 명시
```

기본값을 코드에서 분리 — 일관성 유지 쉬움. 다만 호출자 부담.

## 실무 가이드 — 결정

```
가상 함수에 기본 매개변수가 필요한가?
├── 그렇다 → NVI 패턴 권장
│           public non-virtual + 기본값 (한 곳)
│           private virtual (기본값 X)
├── 단순 가상 함수에 기본값 두고 싶다면 → derived가 재정의 금지
└── 호출자가 매번 명시 — 가능하면 이쪽
```

## 실무 가이드 — 체크리스트

- [ ] 가상 함수에 기본값이 있는가?
- [ ] derived가 그 기본값을 다르게 두지 않는가?
- [ ] NVI 패턴으로 기본값을 non-virtual 한 곳에 두면 더 안전한가?
- [ ] 라이브러리 인터페이스 — 기본값 변경의 ABI 영향 검토?
- [ ] `[[deprecated]]` 등으로 진화 경로 명시?
- [ ] 코드 리뷰에서 base/derived 기본값 일치 검증?

## 핵심 정리

1. **가상 함수 기본값 = 정적 바인딩, 본문 = 동적 바인딩** — 어긋나면 함정
2. derived 본문이 base 기본값으로 호출되는 미묘한 버그
3. **해결 1**: derived에서 기본값 재정의 안 하기 (또는 base와 동일하게)
4. **해결 2 (권장)**: NVI 패턴 — 기본값은 non-virtual 한 곳에
5. 컴파일러는 거의 경고 안 함 — 코드 리뷰 의존
6. 라이브러리 인터페이스에선 더 신중 (ABI 진화)

## 관련 항목

- [항목 35: 가상 함수의 대안](/blog/programming/effective-cpp/item35-consider-alternatives-to-virtual-functions) — NVI 패턴
- [항목 36: non-virtual 재정의 금지](/blog/programming/effective-cpp/item36-never-redefine-an-inherited-non-virtual-function) — 정적 바인딩 함정의 사촌
- [항목 38: composition](/blog/programming/effective-cpp/item38-model-has-a-or-implemented-in-terms-of-through-composition) — 상속 대안
