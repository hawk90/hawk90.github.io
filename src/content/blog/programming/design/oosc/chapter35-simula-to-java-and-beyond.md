---
title: "Ch 35: Simula to Java and Beyond: Major O-O Languages and Environments"
date: 2026-05-19T11:00:00
description: "주요 OO 언어들 — Simula, Smalltalk, C++, Java, Eiffel 비교."
series: "Object-Oriented Software Construction"
seriesOrder: 35
tags: [oop, meyer, simula, smalltalk, cpp, java, eiffel, languages]
draft: false
type: book-review
bookTitle: "Object-Oriented Software Construction"
bookAuthor: "Bertrand Meyer"
---

## 한 줄 요약

> Simula가 클래스를 발명하고, Smalltalk이 순수 OO를 보여주고, C++가 대중화하고, Java가 단순화했다. 각 언어는 **설계 철학**이 다르고, 그 철학이 **문법과 의미론**에 반영된다.

## OO 언어의 계보

### 역사적 흐름

| 시대 | 언어 | 특징 |
|------|------|------|
| 1960s | Simula 67 (노르웨이) | 클래스, 상속, 가상 프로시저 발명. 시뮬레이션 목적 |
| 1970s | Smalltalk (Xerox PARC) | 순수 OO ("모든 것이 객체"). 동적 타이핑. GUI, 바이트코드 VM |
| 1980s | C++ (AT&T Bell Labs) | C의 효율성 + OO. 정적 타이핑, 다중 상속. 대중화 |
| 1980s | Objective-C (NeXT) | C + Smalltalk 메시징. 동적 바인딩. Apple 생태계 |
| 1980s | Eiffel (Meyer) | Design by Contract. 다중 상속, 제네릭. 정적 타이핑 |
| 1990s | Java (Sun) | C++ 단순화. 단일 상속 + 인터페이스. GC, 바이트코드 |
| 1990s | Python, Ruby | 동적 OO. 스크립팅 친화적 |
| 2000s+ | C#, Kotlin, Swift, Rust(?) | 현대적 OO. 함수형 요소 통합 |

## Simula 67

### 클래스의 탄생

```simula
! Simula 67 — 클래스 정의
class Point;
begin
    real x, y;

    procedure move(dx, dy);
    real dx, dy;
    begin
        x := x + dx;
        y := y + dy;
    end;
end;

! 인스턴스 생성
ref(Point) p;
p :- new Point;
p.x := 3.0;
p.y := 4.0;
p.move(1.0, 1.0);
```

### Simula의 기여

| Simula가 발명한 개념 |
|--------------------|
| 클래스 (Class) |
| 객체 (Object) |
| 상속 (Inheritance) |
| 가상 프로시저 (Virtual procedure) |
| 코루틴 (Coroutine) |

**영향**: 모든 OO 언어의 조상. 코루틴은 현대 비동기 프로그래밍으로 이어진다.

### 상속과 가상 프로시저

```simula
! 상속
Point class ColorPoint(c);
integer c;
begin
    ! ColorPoint는 Point의 모든 것을 상속
end;

! 가상 프로시저
class Shape;
virtual: real procedure area;
begin
    ! 기본 구현 없음
end;

Shape class Circle(r);
real r;
begin
    real procedure area;
        area := 3.14159 * r * r;
end;
```

## Smalltalk

### 순수 객체지향

```smalltalk
"Smalltalk — 모든 것이 객체"

"클래스 정의"
Object subclass: #Point
    instanceVariableNames: 'x y'
    classVariableNames: ''
    poolDictionaries: ''.

"메서드 정의"
Point >> x
    ^ x.

Point >> y
    ^ y.

Point >> moveDx: dx dy: dy
    x := x + dx.
    y := y + dy.

"인스턴스 생성"
| p |
p := Point new.
p x: 3.
p y: 4.
p moveDx: 1 dy: 1.
```

### Smalltalk의 특징

| 특징 | 설명 |
|------|------|
| 순수 OO | 모든 것이 객체(숫자, 블록, 클래스 포함). `1 + 2` → 1에게 `+` 메시지를 2를 인자로 보냄 |
| 동적 타이핑 | 변수에 타입 선언 없음. 런타임에 메시지 해석 |
| 메타클래스 | 클래스도 객체. 클래스의 클래스 = 메타클래스 |
| 블록 (클로저) | `[:x | x * 2] value: 5` → 10 |
| 리플렉션 | 객체가 자신의 구조 조회 가능. 동적 메서드 추가 |

### 메시지 전송

```smalltalk
"모든 연산이 메시지 전송"

3 + 4              "3에게 +를 4와 함께 전송"
'hello' size       "'hello'에게 size 전송"
Array new: 10      "Array 클래스에게 new: 전송"

"제어 구조도 메시지"
x > 0
    ifTrue: [Transcript show: 'positive']
    ifFalse: [Transcript show: 'non-positive'].

"ifTrue:ifFalse:는 Boolean의 메서드"
```

## C++

### C의 확장

```cpp
// C++ — "더 나은 C" + OO
class Point {
private:
    double x_, y_;

public:
    Point(double x = 0, double y = 0) : x_(x), y_(y) {}

    void move(double dx, double dy) {
        x_ += dx;
        y_ += dy;
    }

    double x() const { return x_; }
    double y() const { return y_; }
};

// 사용
Point p(3, 4);
p.move(1, 1);
```

### C++의 특징

| 특징 | 설명 |
|------|------|
| 하이브리드 | 절차적 + OO + 제네릭 + (C++11 이후) 함수형. C 호환성 유지 |
| 다중 상속 | 복잡하지만 강력. 가상 상속으로 다이아몬드 해결 |
| 제네릭 (템플릿) | 컴파일 타임 다형성. 매크로보다 타입 안전 |
| 연산자 오버로딩 | 사용자 정의 타입에 연산자 재정의 |
| 결정적 자원 관리 | 소멸자 + RAII. GC 없음 (명시적 메모리 관리) |

### 가상 함수

```cpp
class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;  // 순수 가상

    void move(double dx, double dy) {
        x_ += dx;
        y_ += dy;
    }

protected:
    double x_ = 0, y_ = 0;
};

class Circle : public Shape {
public:
    explicit Circle(double r) : radius_(r) {}

    double area() const override {
        return 3.14159 * radius_ * radius_;
    }

private:
    double radius_;
};

// 다형적 사용
std::vector<std::unique_ptr<Shape>> shapes;
shapes.push_back(std::make_unique<Circle>(5));
shapes.push_back(std::make_unique<Rectangle>(4, 3));

for (const auto& s : shapes) {
    std::cout << s->area() << '\n';
}
```

### 다중 상속

```cpp
class Drawable {
public:
    virtual void draw() const = 0;
};

class Serializable {
public:
    virtual void save(std::ostream& out) const = 0;
    virtual void load(std::istream& in) = 0;
};

// 다중 상속
class DrawableCircle : public Circle,
                       public Drawable,
                       public Serializable {
public:
    void draw() const override { /* ... */ }
    void save(std::ostream& out) const override { /* ... */ }
    void load(std::istream& in) override { /* ... */ }
};
```

## Java

### 단순화된 OO

```java
// Java — "단순하고 안전한 OO"
public class Point {
    private double x;
    private double y;

    public Point(double x, double y) {
        this.x = x;
        this.y = y;
    }

    public void move(double dx, double dy) {
        this.x += dx;
        this.y += dy;
    }

    public double getX() { return x; }
    public double getY() { return y; }
}

// 사용
Point p = new Point(3, 4);
p.move(1, 1);
```

### Java의 설계 결정

| 설계 결정 | 설명 |
|----------|------|
| 단일 상속 | 클래스는 하나만 상속. 인터페이스로 다중 "계약" |
| 가비지 컬렉션 | 자동 메모리 관리. 결정적 종료화 없음 (finalize deprecated) |
| 참조만 | 객체는 항상 참조로 접근. 기본 타입(int, double)은 값 |
| 체크드 예외 | 예외 처리 강제. 메서드 시그니처에 throws |
| 바이트코드 | JVM에서 실행. "Write once, run anywhere" |

### 인터페이스

```java
interface Drawable {
    void draw();
}

interface Serializable {
    void save(OutputStream out) throws IOException;
    void load(InputStream in) throws IOException;
}

// 다중 인터페이스 구현
class Circle extends Shape implements Drawable, Serializable {
    private double radius;

    @Override
    public double area() {
        return Math.PI * radius * radius;
    }

    @Override
    public void draw() {
        // 구현
    }

    @Override
    public void save(OutputStream out) throws IOException {
        // 구현
    }

    @Override
    public void load(InputStream in) throws IOException {
        // 구현
    }
}
```

### Java 8+ 변화

```java
// 함수형 요소 추가
List<Integer> numbers = Arrays.asList(1, 2, 3, 4, 5);

// 람다
int sum = numbers.stream()
    .filter(n -> n % 2 == 0)
    .mapToInt(n -> n * 2)
    .sum();

// 디폴트 메서드 (인터페이스에 구현)
interface Collection<E> {
    default void forEach(Consumer<? super E> action) {
        for (E e : this) {
            action.accept(e);
        }
    }
}
```

## Eiffel

### 계약 기반 설계

```eiffel
class STACK [G]

create
    make

feature {NONE} -- 초기화
    make (n: INTEGER)
        require
            positive_capacity: n > 0
        do
            create representation.make (1, n)
            capacity := n
            count := 0
        ensure
            capacity_set: capacity = n
            empty: count = 0
        end

feature -- 접근
    item: G
        require
            not_empty: not is_empty
        do
            Result := representation.item (count)
        end

feature -- 상태 변경
    push (v: G)
        require
            not_full: not is_full
        do
            count := count + 1
            representation.put (v, count)
        ensure
            count_increased: count = old count + 1
            item_pushed: item = v
        end

    pop
        require
            not_empty: not is_empty
        do
            count := count - 1
        ensure
            count_decreased: count = old count - 1
        end

feature -- 상태 질의
    is_empty: BOOLEAN
        do
            Result := count = 0
        end

    is_full: BOOLEAN
        do
            Result := count = capacity
        end

    capacity: INTEGER
    count: INTEGER

feature {NONE} -- 구현
    representation: ARRAY [G]

invariant
    count_non_negative: count >= 0
    count_bounded: count <= capacity

end
```

### Eiffel의 특징

| 특징 | 설명 |
|------|------|
| Design by Contract | require(전조건), ensure(후조건), invariant(불변식). 언어에 완전 통합 |
| 다중 상속 | rename, redefine, select로 충돌 해결. 유연하지만 강력 |
| Void 안전성 | attached/detachable 구분. 컴파일 타임 null 체크 |
| 균일 참조 | 모든 것이 참조(expanded 제외). GC 기반 |
| 명령-질의 분리 | 함수는 상태 변경 금지(권장). 프로시저만 상태 변경 |

## 언어 비교

### 타입 시스템

| 언어 | 정적/동적 | 강타입/약타입 | Null 안전성 |
|------|----------|--------------|-------------|
| Simula | 정적 | 강타입 | 없음 |
| Smalltalk | 동적 | 강타입 | nil 허용 |
| C++ | 정적 | 약타입 | 없음 (포인터) |
| Java | 정적 | 강타입 | 없음 (null) |
| Eiffel | 정적 | 강타입 | attached/detachable |
| Kotlin | 정적 | 강타입 | nullable 명시 |
| Swift | 정적 | 강타입 | Optional |

### 상속 모델

| 언어 | 클래스 상속 | 인터페이스/믹스인 | 충돌 해결 |
|------|------------|-----------------|-----------|
| Simula | 단일 | 없음 | — |
| Smalltalk | 단일 | 없음 (동적) | — |
| C++ | 다중 | 없음 (추상 클래스) | 가상 상속 |
| Java | 단일 | 다중 인터페이스 | 디폴트 메서드 충돌 시 명시 |
| Eiffel | 다중 | 없음 (모두 클래스) | rename, select |
| Kotlin | 단일 | 다중 인터페이스 | super<T> |

### 메모리 관리

| 언어 | 방식 | 결정적 종료화 |
|------|------|--------------|
| Simula | GC | 없음 |
| Smalltalk | GC | 없음 |
| C++ | 수동/RAII | 있음 (소멸자) |
| Java | GC | 없음 (finalize deprecated) |
| Eiffel | GC | 없음 |
| Rust | 소유권 | 있음 (Drop) |
| Swift | ARC | 있음 (deinit) |

### 계약 지원

| 언어 | 전조건 | 후조건 | 불변식 |
|------|--------|--------|--------|
| Eiffel | require | ensure | invariant |
| D | in {} | out {} | invariant {} |
| Ada 2012 | Pre | Post | Type_Invariant |
| Java | assert (약함) | — | — |
| C++ | assert (약함) | — | — |
| Kotlin | require/check | — | — |

## 현대 언어의 경향

### 함수형 통합

| 현대 OO 언어의 공통점 |
|---------------------|
| 람다 / 클로저 |
| 불변성 강조 |
| 패턴 매칭 |
| 고차 함수 |
| 타입 추론 |

| 언어 | 함수형 요소 |
|------|-----------|
| Kotlin | data class, sealed class, when |
| Swift | enum with associated values |
| Scala | case class, for comprehension |
| Rust | enum, match (OO 아니지만 관련) |

### Null 안전성

| 언어 | Null 문제 해결 방식 |
|------|-------------------|
| Kotlin | `String` vs `String?` |
| Swift | `String` vs `String?` |
| Rust | `Option<T>` |
| Eiffel | attached vs detachable |

Tony Hoare의 "10억 달러짜리 실수"를 타입 시스템으로 방지한다.

### 확장 함수

```kotlin
// Kotlin — 확장 함수
fun String.addExclamation(): String {
    return this + "!"
}

"Hello".addExclamation()  // "Hello!"

// 기존 클래스 수정 없이 메서드 추가 (문법적으로)
```

```swift
// Swift — 확장
extension String {
    func addExclamation() -> String {
        return self + "!"
    }
}
```

## 언어 선택 기준

### 용도별 권장

| 용도 | 권장 언어 |
|------|----------|
| 시스템 프로그래밍 | C++ (성능 + 제어), Rust (안전성 + 성능) |
| 엔터프라이즈 | Java (생태계 + 안정성), C# (Microsoft 생태계), Kotlin (현대적 JVM) |
| 모바일 | Swift (iOS), Kotlin (Android) |
| 교육 | Python (간결함), Eiffel (계약 학습) |
| 스크립팅 | Python, Ruby |

### 평가 기준

| 기준 | 질문 |
|------|------|
| 타입 안전성 | 컴파일 타임에 얼마나 많은 오류를 잡는가? |
| 표현력 | 의도를 얼마나 명확하게 표현하는가? |
| 성능 | 런타임 오버헤드는? |
| 생태계 | 라이브러리, 도구, 커뮤니티는? |
| 학습 곡선 | 얼마나 빨리 생산성을 낼 수 있는가? |
| 안전성 | 메모리, null, 동시성 안전성은? |

## 정리

- **Simula**: 클래스, 상속, 가상 프로시저의 원조
- **Smalltalk**: 순수 OO, 동적 타이핑, 메시지 전송
- **C++**: 효율성 + OO, 다중 상속, RAII
- **Java**: 단순화된 OO, GC, 인터페이스
- **Eiffel**: Design by Contract, Void 안전성
- **현대 언어**: 함수형 통합, null 안전성, 타입 추론

## 다음 장 예고

Chapter 36에서는 **객체지향 환경**을 다룬다. 통합 개발 환경, 라이브러리, 도구가 OO 개발을 어떻게 지원하는가.

## 관련 항목

- [Ch 33: OO Programming and Ada](/blog/programming/design/oosc/chapter33-oo-programming-and-ada) — Ada의 OO
- [Ch 34: Emulating OO](/blog/programming/design/oosc/chapter34-emulating-oo-in-non-oo) — 비OO 에뮬레이션
- [Ch 11: Design by Contract](/blog/programming/design/oosc/chapter11-design-by-contract) — 계약
