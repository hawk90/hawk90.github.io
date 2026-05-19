---
title: "Ch 6: 객체와 자료구조"
date: 2026-05-11T06:00:00
description: "객체와 자료구조의 본질적 대립 — 데이터를 감추는가 노출하는가. Law of Demeter, DTO."
tags: [CleanCode, OOP, Data Structures, Robert Martin]
series: "Clean Code"
seriesOrder: 6
draft: true
---

## 이 챕터의 메시지

객체 지향 입문자가 가장 헷갈리는 한 가지가 "**객체란 무엇인가**"다. C 구조체에 함수를 붙이면 객체인가? `public` 필드를 가진 클래스는 객체인가, 아니면 자료구조인가?

Martin은 이 챕터에서 **객체와 자료구조의 본질적 대립**을 보여준다. 둘은 정반대다 — 한쪽에서 쉬운 일이 다른 쪽에서 어렵고, 그 반대도 마찬가지다.

> 객체는 **행동**을 노출하고 **데이터**를 감춘다.
> 자료구조는 **데이터**를 노출하고 **행동**이 없다.

선택은 도메인에 따라 다르다. 다만 **둘을 섞으면 가장 나쁘다**. 데이터를 노출하면서 메서드도 잔뜩 가진 클래스 — 잡종(hybrid)이다.

## 핵심 내용

- 객체와 자료구조는 **정반대**다. 섞으면 잡종이 된다.
- 객체는 **행동을 노출, 데이터를 감춘다**. 새 행동 추가는 어렵지만 새 타입 추가는 쉽다.
- 자료구조는 **데이터를 노출, 행동이 없다**. 새 행동 추가는 쉽지만 새 타입 추가는 어렵다.
- **Law of Demeter**: 객체는 자신과 직접 친한 객체에만 말을 건다.
- **DTO/Active Record**는 자료구조의 자연스러운 형태.

## 자료 추상화

먼저 — 객체 지향이라고 **모든 데이터를 getter/setter로 감싸는** 게 능사가 아니다. 그건 그저 데이터를 함수로 한 번 감싼 것일 뿐이다.

```java
// 자료 노출 — 자료구조
public class Point {
    public double x;
    public double y;
}

// 자료 감춘 듯 보이지만 — 사실은 같은 노출 (getter/setter)
public class Point {
    private double x;
    private double y;
    public double getX() { return x; }
    public void setX(double x) { this.x = x; }
    public double getY() { return y; }
    public void setY(double y) { this.y = y; }
}
```

위 두 클래스는 의미상 같다. 두 번째가 `private`라고 해서 추상화가 더 잘 된 게 아니다. 사용자는 여전히 직각좌표계 표현을 그대로 본다.

진짜 객체는 이렇다.

```java
public interface Point {
    double getX();
    double getY();
    void setCartesian(double x, double y);
    double getR();
    double getTheta();
    void setPolar(double r, double theta);
}
```

이 인터페이스는 점이 **직각좌표인지 극좌표인지 숨긴다**. 사용자는 점의 "수학적 본질"만 본다. 구현이 어떻게 바뀌든 사용자 코드는 그대로다.

> **객체는 구현을 감추고 의도된 인터페이스만 노출한다.**

## 자료/객체의 비대칭

다음 두 스타일을 비교해 보자.

### 자료구조 + 절차적 코드

```java
public class Square    { public Point topLeft; public double side; }
public class Rectangle { public Point topLeft; public double height; public double width; }
public class Circle    { public Point center; public double radius; }

public class Geometry {
    public final double PI = 3.14;

    public double area(Object shape) throws NoSuchShapeException {
        if (shape instanceof Square) {
            Square s = (Square)shape;
            return s.side * s.side;
        }
        else if (shape instanceof Rectangle) {
            Rectangle r = (Rectangle)shape;
            return r.height * r.width;
        }
        else if (shape instanceof Circle) {
            Circle c = (Circle)shape;
            return PI * c.radius * c.radius;
        }
        throw new NoSuchShapeException();
    }
}
```

### 객체 지향 코드

```java
public class Square implements Shape {
    private Point topLeft;
    private double side;

    public double area() { return side * side; }
}

public class Rectangle implements Shape {
    private Point topLeft;
    private double height;
    private double width;

    public double area() { return height * width; }
}

public class Circle implements Shape {
    private Point center;
    private double radius;

    public double area() { return Math.PI * radius * radius; }
}
```

### 비대칭

두 스타일이 **정반대 방향에서 유연하고 경직**되어 있다.

**새 도형(Pentagon)을 추가하려면?**

| 스타일 | 새 도형 추가 |
| --- | --- |
| 자료구조 + 절차 | Geometry의 모든 메서드(`area`, `perimeter`, ...)에 `if` 분기 추가 — **모든 함수를 수정** |
| 객체 지향 | `class Pentagon implements Shape`만 추가 — **기존 코드는 변경 안 됨** |

**새 함수(perimeter)를 추가하려면?**

| 스타일 | 새 함수 추가 |
| --- | --- |
| 자료구조 + 절차 | Geometry에 `perimeter(shape)` 한 함수만 추가 — **기존 코드 변경 안 됨** |
| 객체 지향 | `Shape` 인터페이스에 `perimeter()` 추가 + **모든 구현 클래스 수정** |

규칙은 이렇다.

> **새 타입이 자주 추가되면 객체 지향이 유리하다.**
>
> **새 함수가 자주 추가되면 절차적이 유리하다.**

어느 한쪽이 본질적으로 우월하지 않다. 도메인의 변화 방향에 따라 다르다.

### 함수형 vs 객체 지향 — Expression Problem

이게 함수형과 객체 지향의 본질적 대립이다. 함수형 언어(Haskell, ML)는 자료구조 + 함수 패턴을 선호한다. 새 함수를 자주 추가하는 자료 처리 도메인에 강하다. 객체 지향은 새 타입을 자주 추가하는 도메인에 강하다.

**현실의 시스템은 둘 다 필요**하다. C++의 `std::variant`, Rust의 `enum`, Scala의 `case class` 등 — 두 영역을 모두 표현하려는 도구가 점점 늘어난다.

## Law of Demeter — 디미터 법칙

객체는 **자신이 가까이 아는 객체**에만 말을 걸어야 한다. 멀리 있는 객체의 내부를 헤집고 다니면 안 된다.

> 객체의 메서드 M은 다음 자원에만 메시지를 보낼 수 있다.
> 1. M의 클래스 자신
> 2. M의 인자
> 3. M이 만든 객체
> 4. M의 클래스의 직접 인스턴스 변수

**메서드가 반환한 객체의 메서드**는 호출하지 않는다.

### 기차 충돌 (Train Wreck)

```java
// Law of Demeter 위반 — 객체의 객체의 객체...
final String outputDir = ctxt.getOptions().getScratchDir().getAbsolutePath();
```

이게 "기차 충돌"이다. 한 점(`.`)이 다음 점을 부르고, 그 점이 또 다음 점을 부른다.

**문제**: `ctxt`가 `Options`의 구조를, `Options`가 `ScratchDir`의 구조를, 그 모든 게 호출자 코드에 노출된다. 한 클래스의 내부가 바뀌면 — 호출자 코드도 깨진다.

**해결**: 각 객체에 적절한 책임을 위임한다.

```java
// 호출자는 "최종 결과"만 묻는다
final String outputDir = ctxt.getScratchDirAbsolutePath();

// ctxt가 자기 내부 처리
class Context {
    public String getScratchDirAbsolutePath() {
        return options.getScratchDirAbsolutePath();
    }
}
```

각 객체가 자기 디테일을 감춘다. 호출자는 한 객체에만 말을 건다.

### 잡종 (Hybrids)

가장 나쁜 것은 **잡종**이다. 객체와 자료구조의 단점을 모두 가졌다.

```java
class HybridShape {
    // 자료구조처럼 데이터 노출
    public double width;
    public double height;

    // 객체처럼 행동도 있음
    public double area() {
        return width * height;
    }

    public void render(Canvas c) {
        // ...
    }
}
```

- 새 타입 추가도 어렵다 (메서드 호출 코드가 도형 타입에 묶임).
- 새 함수 추가도 어렵다 (모든 도형 클래스를 수정해야).

잡종은 거의 항상 잘못된 설계의 신호다. 데이터를 들고 다니는 객체와 행동을 가진 객체를 **명확히 분리**한다.

## 자료 전송 객체 (DTO)

DTO(Data Transfer Object)는 **자료구조의 자연스러운 형태**다.

```java
public class AddressDTO {
    private String street;
    private String city;
    private String state;
    private String zip;
    // getters / setters
}
```

DTO는 자료를 한 곳에서 다른 곳으로 옮기는 매개체다 (DB → 비즈니스 로직, API → 클라이언트). 행동이 없는 게 정상이다.

### Active Record

Active Record는 DTO에 `save()`, `find()` 같은 **CRUD 메서드**를 더한 형태다.

```java
public class User extends ActiveRecord {
    public String name;
    public String email;
    // 데이터 노출 + CRUD
}

User u = User.find(42);
u.email = "new@example.com";
u.save();
```

Active Record가 편하긴 하지만 — **잡종이 될 위험**이 크다. CRUD 외의 비즈니스 로직을 Active Record에 추가하기 시작하면, 그것은 더 이상 자료구조가 아니다. 비즈니스 로직은 별도 객체에 두는 것이 권장된다.

## 정리

- 객체는 **행동을 노출, 데이터 감춤**. 자료구조는 **데이터를 노출, 행동 없음**.
- 둘은 **정반대 강점**을 가진다 — 새 타입 vs 새 함수.
- **Law of Demeter** — 기차 충돌 금지. 객체는 자기가 직접 아는 객체에만 말을 건다.
- **잡종 금지** — 객체와 자료구조의 단점을 모두 가진다.
- **DTO**는 자료구조의 정상 형태. Active Record는 잡종 위험.

다음 챕터는 **에러 처리** — 예외와 반환 코드, 깨끗한 에러 처리의 패턴.

## 관련 항목

- [Ch 3: 함수](/blog/programming/engineering/clean-code/chapter03-functions) — 함수의 부작용과 명령/질문 분리
- [Ch 10: 클래스](/blog/programming/engineering/clean-code/chapter10-classes) — 객체의 책임과 SRP
- [Clean Architecture Ch 5: OOP](/blog/programming/design/clean-architecture/chapter05-object-oriented-programming) — 객체 지향의 본질
