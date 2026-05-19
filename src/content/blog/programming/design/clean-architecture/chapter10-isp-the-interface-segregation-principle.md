---
title: "Ch 10: ISP — 인터페이스 분리 원칙"
date: 2026-05-01T10:00:00
description: "클라이언트가 사용하지 않는 메서드에 의존하게 두지 마라. 거대한 인터페이스는 인위적 결합을 만든다."
tags: [Architecture, SOLID, ISP]
series: "Clean Architecture"
seriesOrder: 10
draft: true
---

## 이 챕터의 메시지

ISP는 단순한 원칙이다.

> **Clients should not be forced to depend on methods they do not use.**

클라이언트는 자신이 사용하지 않는 메서드에 의존하게 되어서는 안 된다.

거대한 인터페이스 하나에 많은 메서드가 모여 있으면, 그 일부만 쓰는 클라이언트조차 전체 인터페이스에 결합된다. 결과적으로 다른 메서드의 변경이 그 클라이언트에 영향을 준다.

## 단순한 예 — 거대 OPS 인터페이스

```java
interface OPS {
  void op1();
  void op2();
  void op3();
}

class User1 { OPS ops; void use() { ops.op1(); } }  // op1만 씀
class User2 { OPS ops; void use() { ops.op2(); } }  // op2만 씀
class User3 { OPS ops; void use() { ops.op3(); } }  // op3만 씀
```

User1은 op2나 op3를 부르지 않는다. 그러나 OPS 인터페이스에 의존하므로, op2의 변경(시그니처 변경, 새 매개변수 추가 등)이 OPS를 재컴파일하게 만들고, 그 결과 User1도 재컴파일된다.

해법은 인터페이스 분리다.

```java
interface U1Ops { void op1(); }
interface U2Ops { void op2(); }
interface U3Ops { void op3(); }

class User1 { U1Ops ops; }
class User2 { U2Ops ops; }
class User3 { U3Ops ops; }

class OPS implements U1Ops, U2Ops, U3Ops { ... }  // 구현체는 다 갖추되
```

각 클라이언트는 **자기가 필요한 인터페이스에만 의존**한다. op2의 변경은 U2Ops와 User2만 흔든다.

## 정적 타입 언어의 문제

ISP가 가장 명확한 이슈가 되는 곳은 **정적 타입 컴파일 언어**다 (Java, C#, C++).

- 거대 인터페이스 변경 → 그 인터페이스를 import한 모든 모듈 재컴파일
- 빌드 시간 증가
- 한 변경의 영향 범위가 코드 베이스 전체로 퍼진다

동적 타입 언어(Python, Ruby, JavaScript)에서는 이 문제가 덜 심각하다. 컴파일 단위가 없거나 적기 때문에. 그래도 의존성 차원의 결합은 여전히 존재한다.

## 아키텍처 차원의 ISP

ISP는 클래스/인터페이스 수준뿐만이 아니라 **컴포넌트 수준**에서도 작동한다.

![컴포넌트 수준 의존 — 큰 라이브러리에 대한 공통 의존](/images/blog/clean-architecture/diagrams/ch10-component-dependency.svg)

A와 B가 같은 큰 컴포넌트 C에 의존한다. A는 C의 함수 fa, B는 fb만 사용한다. 그러나 C의 다른 부분(예: fc, fd)이 바뀌어도 A와 B 모두 재컴파일된다.

해법은 C를 더 작은 컴포넌트로 쪼개거나, 인터페이스로 분리하는 것이다.

> "Depending on something that carries baggage that you don't need can cause you troubles that you didn't expect."

A는 자신이 사용하지 않는 fc의 변경 때문에도 다시 빌드되고, 새 버전을 배포해야 할 수 있다. 사용하지 않는 의존성도 의존성이다.

## ISP의 깊은 메시지

ISP는 사실 **결합의 정의**를 다시 본다.

흔한 결합 정의 — "A가 B를 호출하면 A는 B에 결합된다."

ISP가 더하는 것 — "A가 B의 일부만 쓰더라도, B 전체에 결합된다."

이게 ISP의 진짜 통찰이다. **결합은 호출 관계가 아니라 컴파일/배포 의존성**이다.

## C++ Software Design 가이드라인 3과의 연관

Iglberger의 가이드라인 3 — **Separate Interfaces to Avoid Artificial Coupling**이 정확히 ISP다. 두 책이 같은 원칙을 다른 표현으로 강조한다.

> "When two clients use a class, but each client uses a different subset of the class's interface, then the clients are artificially coupled to each other through the class."

두 클라이언트가 한 클래스를 다른 방식으로 쓴다면, 그 클래스를 통해 두 클라이언트가 **인위적으로 결합**된다. 이 결합은 코드 차원이 아니라 **변경 차원**의 결합이다.

## "Fat Interface" — 흔한 안티 패턴

거대한 인터페이스를 "Fat Interface"라 부른다. 흔한 예.

```java
interface Database {
  void connect();
  void disconnect();
  void executeQuery();
  void executeUpdate();
  void beginTransaction();
  void commit();
  void rollback();
  void backup();
  void restore();
  // ... 30+ methods
}
```

이걸 분리한다.

```java
interface Connectable { void connect(); void disconnect(); }
interface Queryable { void executeQuery(); }
interface Modifiable { void executeUpdate(); }
interface Transactional { void beginTransaction(); void commit(); void rollback(); }
interface Backupable { void backup(); void restore(); }
```

각 클라이언트는 자기가 필요한 인터페이스만 받는다. ReadOnlyClient는 `Queryable`만, BackupTool은 `Backupable`만.

## ISP의 한계 — 과도한 분리

ISP를 극단으로 적용하면 인터페이스가 너무 잘게 쪼개진다. 메서드 하나마다 인터페이스 하나가 되면 클래스를 정의하는 것보다 인터페이스를 정의하는 시간이 더 길어진다.

균형이 필요하다 — **같은 클라이언트가 항상 함께 쓰는 메서드들은 같은 인터페이스에 둔다**. 다른 클라이언트가 쓰는 메서드는 분리한다.

기준은 "다른 클라이언트 그룹"이다. 한 그룹만 쓰는 메서드들은 한 인터페이스에.

## 정리

- ISP — **클라이언트는 사용하지 않는 메서드에 의존하지 않아야**
- 거대 인터페이스 = 인위적 결합
- 해법 — 클라이언트별로 **인터페이스 분리**
- 정적 컴파일 언어에서 가장 영향 큼 (재컴파일 의존성)
- **컴포넌트 수준**에서도 작동 — 사용하지 않는 모듈 의존도 부담
- 결합의 정의 = 호출이 아니라 **변경/배포 의존성**
- 과도한 분리는 피한다 — 같은 클라이언트가 함께 쓰는 메서드는 함께 둔다

## 다음 장 예고

다음 장은 **DIP** — Dependency Inversion Principle. SOLID의 마지막이자, Clean Architecture의 핵심 원칙.

## 관련 항목

- [C++ Software Design 가이드라인 3: 인터페이스 분리](/blog/programming/cpp/cpp-software-design/guideline03-separate-interfaces-to-avoid-artificial-coupling) — 같은 원칙
- [Ch 8: OCP](/blog/programming/design/clean-architecture/chapter08-ocp-the-open-closed-principle) — 변경 격리의 연장선
- [Refactoring Ch 11: API 리팩터링](/blog/programming/design/refactoring/ch11) — 인터페이스 다듬기
