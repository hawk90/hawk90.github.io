---
title: "Chapter 5: Design in Construction"
date: 2025-06-20T05:00:00
description: "construction 단계의 설계 — 복잡성 관리가 핵심. 추상화·캡슐화, 결합도·응집도, 휴리스틱 다발."
series: "Code Complete"
seriesOrder: 5
tags: [code-complete, design, McConnell]
draft: true
---

## 이 챕터의 메시지

설계는 "위에서 한 번"이 아니다. **construction 매 순간**에 설계 결정이 일어난다. 클래스를 어떻게 나눌지, 함수의 책임을 어디로 둘지, 매개변수를 몇 개 받을지.

McConnell이 이 챕터에서 강조하는 한 가지 키워드 — **복잡성 관리**.

> 좋은 설계 = **복잡성을 사람이 한 번에 머리에 담을 만큼 줄여 놓는 일**.

## 핵심 내용

- 설계는 **wicked problem** — 해결하면서 비로소 이해된다.
- **복잡성 관리**가 설계의 첫 목표.
- 도구: **추상화, 캡슐화, 모듈화, 정보 은닉**.
- **결합도 낮게, 응집도 높게**.
- 한 설계 휴리스틱에 갇히지 마라 — **다발로 활용**.

## Wicked Problem

McConnell은 H. Rittel의 용어 **wicked problem**을 빌린다.

> 풀려고 시도해야만 문제를 진짜로 이해할 수 있고, 그 결과로 문제 자체가 변한다.

소프트웨어 설계가 정확히 이렇다. 첫 설계는 문제의 일부만 본다. 짜다 보면 — 진짜 문제가 드러난다. 그래서 설계는 **반복적**이고 **점진적**이다.

> 첫 설계가 마지막 설계가 되지 않는다. 그게 정상이다.

## 복잡성 관리 — 설계의 첫 목표

소프트웨어가 어려운 이유는 **본질적으로 복잡**하기 때문이다. McConnell의 인용 — Dijkstra.

> 사람의 두뇌는 한 번에 한정된 정보만 처리한다. 좋은 설계는 이 한계를 인정하고 — **각 부분이 사람의 한계 안에 들어오게** 한다.

복잡성을 줄이는 도구가 네 가지다.

### 1) 추상화

복잡한 디테일을 가리고, 본질만 노출한다.

```c
// 추상 — sort()
qsort(array, n, sizeof(int), compare);
// 실제 정렬 알고리즘(quicksort, 분할정복, 피벗 선택...)은 사용자가 안 봐도 됨
```

### 2) 캡슐화

추상의 약속을 강제한다. 내부 디테일에 접근할 방법을 막는다.

```cpp
class Stack {
private:
    int data[100];
    int top;
public:
    void push(int x);
    int  pop();
};
// data, top은 외부에서 만질 수 없음
```

### 3) 모듈화 / 정보 은닉

각 모듈이 자기 결정을 안으로 숨긴다. 다른 모듈이 그 결정에 의존하지 않게.

Parnas의 고전 원리 — **각 모듈은 "변할 가능성 있는 결정"을 하나씩 감춘다**.

### 4) 상속·다형성·구성

객체 지향 도구들. 책임을 명확히 분배하고, 변형을 추가하기 쉽게.

## 결합도와 응집도

설계 품질을 가늠하는 두 측정.

### 결합도 (Coupling) — 낮을수록 좋다

모듈 A가 모듈 B에 얼마나 의존하는가.

```cpp
// 강한 결합 — A가 B의 내부를 안다
classA.b->internal_state = 5;

// 약한 결합 — A는 B의 인터페이스만 안다
classA.b->setInternalState(5);
```

낮은 결합도 = **변경 격리**.

### 응집도 (Cohesion) — 높을수록 좋다

한 모듈 안의 요소들이 얼마나 강하게 관련되는가.

```cpp
// 응집도 낮음 — 무관한 기능들이 한 클래스에
class Utility {
    void formatDate();
    void sendEmail();
    void encryptPassword();
};

// 응집도 높음 — 한 주제
class DateFormatter {
    void formatDate();
    void parseDate();
};
```

높은 응집도 = **명확한 책임**.

## 설계 휴리스틱 — 다발로 활용

McConnell은 단일 휴리스틱이 모든 문제를 풀지 못한다고 말한다. **여러 개를 동시에** 활용하라.

대표적 휴리스틱들:

- 추상화로 본질만.
- 캡슐화로 디테일 감추기.
- 정보 은닉.
- 변경 가능성 격리.
- 느슨한 결합.
- 가능한 표준 패턴 활용.
- 코드와 데이터를 함께 (OOP).
- 데이터와 함수를 따로 (함수형).
- 단순함 추구.

이들이 서로 충돌할 때도 있다. 그럴 땐 **트레이드오프**를 의식하고 선택한다.

## 설계 수준

설계는 한 층위가 아니다.

| 수준 | 결정 |
| --- | --- |
| 1: 시스템 | 서비스 / 모놀리스, 큰 모듈 |
| 2: 모듈 | 클래스 / 패키지 분할 |
| 3: 클래스 | 책임, 인터페이스 |
| 4: 루틴(함수) | 함수의 책임, 시그니처 |
| 5: 루틴 내부 | 알고리즘, 자료구조 |

각 수준의 결정이 다음 수준에 영향을 준다. **위에서 아래로** 흘러간다.

## 정리

- 설계는 **wicked problem** — 해결하면서 이해된다.
- **복잡성 관리**가 첫 목표.
- 도구: 추상화, 캡슐화, 정보 은닉, 모듈화.
- **결합도 낮게, 응집도 높게**.
- 한 휴리스틱에 갇히지 말고 **다발로 활용**.

## 관련 항목

- [Ch 6: Working Classes](/blog/programming/engineering/code-complete/ch06-Working-Classes)
- [Clean Architecture Ch 7: SRP](/blog/programming/design/clean-architecture/chapter07-srp-the-single-responsibility-principle)
- [Clean Code Ch 10: 클래스](/blog/programming/engineering/clean-code/chapter10-classes)
