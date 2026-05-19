---
title: "Ch 5: 객체 지향 프로그래밍"
date: 2026-05-01T05:00:00
description: "OO의 본질은 캡슐화도 상속도 아닌 다형성이다. 그것이 가능하게 만든 가장 중요한 것은 의존성 역전이다."
tags: [Architecture, OO, Polymorphism, DependencyInversion]
series: "Clean Architecture"
seriesOrder: 5
draft: true
---

## 이 챕터의 메시지

객체 지향을 정의하라고 하면 거의 모든 사람이 같은 답을 한다.

- **캡슐화** (Encapsulation)
- **상속** (Inheritance)
- **다형성** (Polymorphism)

Martin은 이 정의가 잘못됐다고 말한다. 캡슐화와 상속은 OO만의 특성이 아니다. C에서도 다 가능하다. OO의 진짜 본질은 **다형성**이며, 더 정확히는 **다형성을 안전하게 사용할 수 있게 만든 것**이다.

그리고 그 다형성이 가능하게 만든 가장 중요한 것은 **의존성 역전**(Dependency Inversion)이다.

## 캡슐화는 OO가 아니다

C에서 캡슐화는 완벽하게 가능하다.

```c
// point.h — 공개 인터페이스
struct Point;  // 전방 선언만
struct Point* make_point(double x, double y);
double distance(struct Point* p1, struct Point* p2);

// point.c — 비공개 구현
struct Point {
  double x, y;  // 외부에서 접근 불가
};
```

`Point`의 내부 필드는 외부에서 보이지 않는다. 완벽한 캡슐화다.

Martin은 더 자극적인 주장을 한다 — **C가 C++보다 캡슐화가 더 강하다**. C++는 클래스 헤더에 private 멤버를 노출해야 한다(컴파일러가 크기를 알아야 하므로). C는 헤더에 구조체를 전방 선언만으로 두면 멤버를 완전히 숨길 수 있다.

> "C++ programmers must declare private member functions in the header file. So encapsulation is broken at the source code level."

따라서 캡슐화는 OO의 정의일 수 없다.

## 상속은 OO가 아니다

C에서도 상속을 흉내낼 수 있다. 구조체를 다른 구조체에 임베드한다.

```c
struct Animal {
  int age;
};

struct Dog {
  struct Animal base;  // 상속
  char breed[20];
};

struct Dog* d = make_dog();
((struct Animal*)d)->age = 5;  // 부모 필드 접근
```

OO 언어가 이 패턴을 더 편리하게 만들었지만, 본질적으로 새로운 능력은 아니다.

따라서 상속도 OO의 정의일 수 없다.

## OO의 진짜 본질 — 다형성

C에서 다형성도 가능하다 — **함수 포인터로**.

```c
// 출력 장치 종류별로 다른 write
struct Device {
  void (*write)(struct Device* self, const char* data);
};

void write(struct Device* d, const char* data) {
  d->write(d, data);  // 함수 포인터 호출 — 어떤 함수인지 런타임 결정
}
```

OO 언어가 한 일은 **이 패턴을 안전하고 편리하게 만든 것**이다.

- 함수 포인터를 직접 다루지 않게
- 컴파일러가 vtable을 자동 생성하게
- 잘못된 캐스팅을 막게

다시 말해 OO의 본질은 **함수 포인터의 안전한 사용**이다.

> "Polymorphism is an application of pointers to functions. ... OO languages eliminate the need to manage these function pointers manually."

## 다형성이 만든 진짜 가치 — 의존성 역전

함수 포인터를 안전하게 다룰 수 있게 됐다는 게 왜 중요한가? Martin은 한 가지를 강조한다 — **의존성 역전**.

전통적인 의존성 흐름은 다음과 같다.

```
높은 수준 (정책)
     ↓
중간 수준
     ↓
낮은 수준 (디테일, DB, UI, ...)
```

이게 무슨 문제일까? 디테일이 바뀌면(예: DB를 PostgreSQL에서 MongoDB로) 모든 상위 모듈을 다시 컴파일해야 한다. 디테일이 정책을 흔든다.

다형성을 쓰면 이 화살표를 뒤집을 수 있다.

```
높은 수준 (정책)
     ↓
   ┌─┴─┐
   │   ▲   ← Interface (정책 측이 소유)
   │   │
   ▼   │
중간 수준
     ↓
   ┌─┴─┐
   │   ▲   ← Interface
   │   │
   ▼   │
낮은 수준 (디테일)
```

낮은 수준이 높은 수준이 소유한 인터페이스를 **구현한다**. 모든 의존성 화살표가 안쪽(정책)을 향한다.

**결과**:
- DB를 바꿔도 정책은 안 바뀐다 (재컴파일 불필요)
- UI를 바꿔도 정책은 안 바뀐다
- 정책이 디테일에서 격리된다

이게 Clean Architecture의 핵심이다. Ch 22(The Clean Architecture)의 동심원 다이어그램이 이 의존성 역전을 시각화한 것이다.

## 플러그인 아키텍처

의존성 역전이 가능해지면 **플러그인 아키텍처**가 가능해진다.

```
        ┌──────────────────┐
        │    핵심 정책     │  ← 변경 거의 없음
        └────────▲─────────┘
                 │ 인터페이스
        ┌────────┴─────────┐
        │   플러그인 영역   │
        │ ┌──────┐ ┌──────┐│  ← 자유롭게 교체
        │ │ DB-A │ │ UI-X │ │
        │ └──────┘ └──────┘ │
        └──────────────────┘
```

핵심 정책이 인터페이스를 소유하고, 디테일들(DB, UI, framework)이 그 인터페이스를 구현하는 **플러그인**이 된다.

이게 모던 소프트웨어 아키텍처의 가장 강력한 패턴 중 하나다. **핵심은 안정적, 디테일은 교체 가능**.

## 배포 단위로서의 다형성

Martin이 추가로 강조하는 점 — 다형성은 **배포 독립성**도 만든다.

플러그인 구조에서 핵심 정책 모듈과 플러그인 모듈은 **별도로 컴파일되고 배포될 수 있다**. 인터페이스가 변하지 않는 한, 한쪽을 바꿔도 다른 쪽은 그대로다.

이게 모던 아키텍처의 핵심 — **마이크로서비스, 모듈러 모놀리스, 라이브러리** 모두 이 원리를 활용한다.

## OO를 다시 정의하면

세 가지 흔한 정의를 다 검토했다.

- 캡슐화 — OO만의 특성이 아니다
- 상속 — OO만의 특성이 아니다
- 다형성 — 함수 포인터로 모든 언어에서 가능, 다만 OO가 안전하게 만들었다

Martin의 결론적 정의:

> **OO is the ability, through the use of polymorphism, to gain absolute control over every source code dependency in the system. It allows the architect to create a plugin architecture, in which modules that contain high-level policies are independent of modules that contain low-level details.**

OO는 **다형성을 통해 시스템의 모든 소스 코드 의존성을 절대적으로 통제할 수 있는 능력**이다.

## 정리

- 흔한 OO 정의(캡슐화/상속/다형성) 중 **다형성만 OO의 진짜 본질**
- 다형성은 **함수 포인터의 안전한 사용** — C로도 가능하지만 OO가 편리/안전하게 만들었다
- 다형성의 진짜 가치는 **의존성 역전**
- 의존성 역전은 **플러그인 아키텍처**를 가능하게 만든다
- 핵심 정책은 안정적, 디테일은 교체 가능
- 이게 Clean Architecture의 가장 핵심 아이디어

## 다음 장 예고

다음 장은 **함수형 프로그래밍** — 가변성을 제거함으로써 얻는 것은 무엇인가.

## 관련 항목

- [Ch 3: 패러다임 개요](/blog/programming/design/clean-architecture/chapter03-paradigm-overview) — 패러다임의 본질
- [Ch 11: DIP](/blog/programming/design/clean-architecture/chapter11-dip-the-dependency-inversion-principle) — 의존성 역전 원칙
- [C++ Software Design 가이드라인 9: 추상화 소유권](/blog/programming/cpp/cpp-software-design/guideline09-pay-attention-to-the-ownership-of-abstractions) — 같은 아이디어
- [C++ Software Design 가이드라인 32: Type Erasure](/blog/programming/cpp/cpp-software-design/guideline32-consider-replacing-inheritance-hierarchies-with-type-erasure) — 다형성의 모던 변형
