---
title: "Chapter 6: Working Classes"
date: 2025-06-20T06:00:00
description: "좋은 클래스의 설계 — 추상 데이터 타입, 인터페이스 설계, 상속·구성 선택, 작게 유지."
series: "Code Complete"
seriesOrder: 6
tags: [code-complete, classes, ADT, McConnell]
draft: true
---

## 이 챕터의 메시지

클래스는 **객체 지향의 기본 단위**다. 좋은 클래스는 좋은 ADT(Abstract Data Type)에서 출발한다 — 명확한 데이터와 그것에 대한 연산이 한 자리에 있는 단위.

> 클래스는 **사용자가 알 필요 없는 것을 감추는** 일관된 추상이다.

이 챕터는 좋은 클래스 설계의 모든 측면을 다룬다.

## 핵심 내용

- **ADT가 출발점** — 데이터 + 그것에 대한 연산.
- **좋은 인터페이스** — 의도가 일관되고, 좋은 추상화에 머문다.
- **상속 vs 구성** — 보통 구성을 선호.
- **상속의 신중한 사용** — IS-A만, 깊이 얕게.
- 클래스는 **작게** 유지.

## ADT — 좋은 클래스의 출발

추상 데이터 타입(ADT)은 — **데이터의 표현을 감추고, 그것에 대한 연산만 노출**하는 단위다.

```cpp
class Stack {
private:
    int data[100];
    int top;
public:
    void push(int x);
    int  pop();
    bool empty() const;
};
```

- 사용자는 `push`, `pop`, `empty`만 본다.
- 내부가 배열인지 연결 리스트인지 모른다.
- 구현이 바뀌어도 사용자 코드는 그대로.

이게 OOP의 모든 가치의 출발점이다.

## 좋은 클래스 인터페이스

좋은 인터페이스의 속성들.

### 일관된 추상 수준

```cpp
// Bad — 두 추상 수준 섞임
class Employee {
    void calculatePay();     // 고수준
    void writeLogLine();     // 저수준 — Employee가 알 일 X
};

// Good — 한 수준
class Employee {
    void calculatePay();
    void processPaycheck();
};
```

한 클래스의 모든 멤버는 **같은 수준의 책임**을 가져야 한다.

### 좋은 추상화에 머문다

`Employee.calculatePay()`는 자연스럽다. `Employee.optimizeDBQuery()`는 어색하다 — DB 최적화는 `Employee`의 책임이 아니다.

### 일관성

같은 종류의 일은 같은 명명으로. `getX`, `getY`는 일관됨. `getX`, `fetchY`는 불일관.

### 프로그래밍 가능 (낮은 인터페이스)

너무 추상적이면 사용 어려움. 너무 구체적이면 융통성 낮음. **적절한 균형**.

## 정보 은닉

> McConnell이 강조하는 핵심 — **각 클래스는 "변할 가능성 있는 결정"을 감춘다**.

Parnas의 정보 은닉 원리. 클래스 설계 시 자문한다.

> "이 결정이 미래에 바뀔 가능성이 있나? 있다면 — 클래스 내부에 가두어 외부가 모르게 한다."

예시:

- **자료구조 선택** — 배열 vs 연결 리스트 → 외부에 노출 X.
- **알고리즘 선택** — 정렬 방식 → 외부 모름.
- **외부 라이브러리** — 어느 DB 라이브러리 → 한 자리에서 감쌈.

## 상속과 구성

| 상속 (Inheritance) | 구성 (Composition) |
| --- | --- |
| IS-A 관계 | HAS-A 또는 USES-A 관계 |
| `class Dog : public Animal` | `class Car { Engine engine; }` |
| 강한 결합 | 약한 결합 |

McConnell의 권고는 **보통 구성을 선호하라**. 상속은 책임을 강하게 묶고, derived가 base의 변경에 노출된다.

### 상속을 쓸 때의 규칙

상속을 쓴다면 — 다음을 지킨다.

1. **IS-A**가 정말 성립하는가? 자연어 "is-a"로 들리는지 검증.
2. **LSP** — derived가 base의 모든 자리에서 동작하는가?
3. **얕게** — 깊은 상속 계층은 변경이 어렵다.
4. **단일 상속** — 다중 상속은 다이아몬드 문제 등 복잡도가 폭증.

## 클래스는 작게

> 한 클래스의 멤버 변수는 **7개 이하**가 좋다 (사람의 단기 기억 한계).
>
> 한 클래스의 public 메서드도 **5~10개**가 보통 최선.

너무 많은 멤버·메서드를 가진 클래스는 — **여러 책임을 가진 신호**다. 분할 검토.

## 정리

- **ADT**가 출발 — 데이터 + 연산을 한 자리에.
- 좋은 인터페이스: **일관된 추상 수준**, 좋은 추상화, 일관성.
- **정보 은닉** — 변할 가능성 있는 결정을 안에 가둔다.
- **구성을 선호, 상속은 신중**.
- 클래스는 **작게** — 멤버 7개 이하, public 메서드 10개 이하.

## 관련 항목

- [Ch 5: Design in Construction](/blog/programming/engineering/code-complete/ch05-Design-in-Construction)
- [Ch 7: High-Quality Routines](/blog/programming/engineering/code-complete/ch07-High-Quality-Routines)
- [Clean Code Ch 10: 클래스](/blog/programming/engineering/clean-code/chapter10-classes)
- [Effective C++ Ch 32: public 상속 = is-a](/blog/programming/cpp/effective-cpp/item32-make-sure-public-inheritance-models-is-a)
