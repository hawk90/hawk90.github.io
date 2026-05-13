---
title: "Ch 34: 빠진 챕터"
date: 2025-06-10T04:00:00
description: "Simon Brown이 쓴 보너스 장. 패키징 전략 — Package by layer / feature / component / Ports & Adapters."
tags: [Architecture, Packaging, SimonBrown]
series: "Clean Architecture"
seriesOrder: 34
---

## 이 챕터의 메시지

마지막 장은 Martin이 아닌 **Simon Brown**(C4 Model 저자)이 쓴 보너스 장이다. Martin의 책이 원칙에 집중했다면, Simon Brown은 한 단계 더 실용적인 질문을 던진다.

> **이 원칙들을 실제 코드 구조에 어떻게 반영할 것인가?**

다른 말로 — **패키지(폴더) 구조**를 어떻게 짤 것인가.

## 네 가지 패키징 전략

Simon Brown은 네 가지를 비교한다.

### 1. Package by Layer (전통적)

```
src/
├── web/             ← 모든 컨트롤러
├── service/         ← 모든 서비스
└── repository/      ← 모든 리포지토리
```

- 같은 종류의 클래스끼리 묶는다
- 한 도메인 개념의 코드가 세 폴더에 흩어진다 (UserController, UserService, UserRepository)
- 21장의 Screaming Architecture 위반

가장 흔하지만 가장 약한 패키징.

### 2. Package by Feature (도메인 묶음)

```
src/
├── users/           ← User 관련 모든 코드
│   ├── UserController.java
│   ├── UserService.java
│   └── UserRepository.java
├── orders/          ← Order 관련 모든 코드
└── inventory/       ← Inventory 관련 모든 코드
```

- 도메인 개념별로 묶는다
- Screaming Architecture 가능
- 한 폴더 안에서 모든 게 보임 — CCP 만족

훨씬 좋다. 그러나 한 폴더 안에서 layer 사이의 의존성이 통제되지 않는다.

### 3. Package by Component (Simon Brown 추천)

```
src/
├── users/           ← User 컴포넌트 (외부 API)
│   ├── UserController.java        ← public
│   ├── User.java                  ← package-private
│   ├── UserServiceImpl.java       ← package-private
│   └── JdbcUserRepository.java    ← package-private
└── orders/
```

- Feature와 비슷하지만 한 가지 차이 — 컴포넌트 안의 내부 클래스는 **package-private**
- 외부에서 접근 가능한 건 컨트롤러 같은 진입점뿐
- 다른 컴포넌트가 내부 구현을 못 만진다

Java의 package-private(default) 가시성을 활용한다. 다른 언어에서는 internal / 모듈 시스템으로 비슷한 효과.

이게 Simon Brown이 가장 권하는 전략이다.

### 4. Package by Ports & Adapters (Hexagonal)

```
src/
├── domain/          ← 비즈니스 로직 (포트 인터페이스 포함)
├── adapters/
│   ├── web/         ← REST 어댑터
│   ├── persistence/ ← DB 어댑터
│   └── messaging/   ← 메시징 어댑터
└── application/     ← Use Case orchestration
```

- 22장의 Clean Architecture 다이어그램 그대로
- 도메인이 가장 안쪽
- Adapter들이 바깥쪽

가장 엄격하다. 그러나 작은 시스템에는 과할 수 있다.

## 네 가지 비교

| 전략 | 응집도 | 결합 통제 | 복잡도 | 권장 |
|---|---|---|---|---|
| By Layer | 낮음 | 약함 | 단순 | 안 권장 |
| By Feature | 높음 | 부분적 | 단순 | OK |
| By Component | 높음 | 강함 (package-private) | 중간 | **추천** |
| By Ports & Adapters | 최고 | 가장 강함 | 복잡 | 큰 시스템 |

Simon Brown의 권고 — **작거나 중간 시스템은 By Component, 큰 시스템은 Ports & Adapters**.

## 가시성의 역할

이 챕터의 또 다른 통찰 — **가시성 modifier가 아키텍처 도구**다.

Java의 경우.

- `public` — 다른 패키지에서 접근 가능
- `package-private` (default) — 같은 패키지 안에서만
- `private` — 같은 클래스 안에서만

`package-private`을 잘 쓰면 컴포넌트 경계를 강제할 수 있다.

```java
// users 패키지
public class UserController { ... }      // 외부 진입점
class User { ... }                        // 내부 구현 (package-private)
class UserService { ... }                 // 내부 구현
class JdbcUserRepository { ... }          // 내부 구현
```

`User`, `UserService`, `JdbcUserRepository`는 `users` 패키지 외부에서 접근 불가. 다른 패키지의 코드가 우연히 의존하는 걸 막는다.

**컴파일러가 컴포넌트 경계를 강제**한다. 이게 강력하다.

## 자동 검증

Simon Brown은 추가로 권한다 — **아키텍처 규칙을 자동 검증**하라.

- ArchUnit (Java) — JUnit과 통합되어 아키텍처 규칙을 테스트로 검증
- jdepend / NDepend — 의존성 그래프 분석
- 자체 정적 분석 스크립트

자동 검증이 없으면 규칙은 무너진다. 누군가가 "잠깐만 이 한 줄만" 하다 보면 경계가 깨진다. 컴파일러나 빌드 시스템이 잡아내는 게 가장 안전.

## 시리즈 마무리

여기서 책이 끝난다. 34장의 여정을 돌아보면.

| 부 | 주제 | 핵심 |
|---|---|---|
| I | 서론 | 디자인 = 아키텍처. 변경 비용 일정성 |
| II | 패러다임 | 구조적 / OO / 함수형 — 세 차원의 규율 |
| III | SOLID | 클래스 수준 원칙 5개 |
| IV | 컴포넌트 | REP/CCP/CRP, ADP/SDP/SAP |
| V | 아키텍처 | 경계 / Clean Architecture / 4겹 동심원 |
| VI | 디테일 | DB / Web / Framework 모두 디테일 |

핵심 메시지를 한 줄로:

> **변경 비용이 일정하게 유지되는 시스템을 짓는다. 그 도구는 의존성의 통제다.**

## 추가 학습

이 책 이후로 권장되는 책들.

- *Domain-Driven Design* (Evans) — 도메인 모델링 깊이
- *Implementing Domain-Driven Design* (Vernon) — DDD 실전
- *Building Evolutionary Architectures* (Ford et al.) — 진화하는 아키텍처
- *Software Architecture: The Hard Parts* (Ford & Richards) — 트레이드오프
- *Fundamentals of Software Architecture* (Richards & Ford) — 종합

## 시리즈 회고 — 34장의 메시지

34장 동안 일관되게 반복된 메시지를 정리하면.

1. **디자인의 핵심은 변경 가능성**
2. **변경 비용 일정성**이 좋은 디자인의 유일한 지표
3. **의존성 방향**이 변경 가능성을 결정
4. **의존성 역전(DIP)**이 가장 강력한 도구
5. **세부 사항은 정책 뒤에** — DB, Web, Framework, UI
6. **테스트 가능성**이 좋은 디자인의 결과이자 신호
7. **점진적 진화** — 처음부터 완벽 디자인하지 마라

이 메시지들이 모여 Clean Architecture라는 한 아이디어를 이룬다. 4겹 동심원은 그 시각적 요약일 뿐 — 진짜 핵심은 **의존성 규칙**이다.

## 정리

- **Package by Component**가 Simon Brown의 핵심 추천
- 가시성 modifier(package-private)로 경계를 컴파일러가 강제
- 큰 시스템은 Ports & Adapters
- **자동 검증**으로 아키텍처 규칙 유지
- 책의 한 줄 요약 — **변경 비용 일정성을 위한 의존성 통제**

## 시리즈 마무리 — 감사 인사

34장의 여정을 끝까지 함께해 주셔서 감사하다.

이 책의 메시지가 더 좋은 시스템, 더 좋은 디자인, 더 좋은 엔지니어가 되는 데 작은 보탬이 되길 바란다.

> **The only way to go fast is to go well.**

빠르게 가는 유일한 방법은 잘 가는 것이다.

— Hawk

## 관련 항목

- [Ch 22: The Clean Architecture](/blog/programming/design/clean-architecture/chapter22-the-clean-architecture) — 책의 시각적 요약
- [Refactoring 시리즈](/blog/programming/design/refactoring/ch01) — 진화적 디자인의 실전
- [DDD 시리즈](/blog/programming/design/domain-driven-design/) — 도메인 모델링 깊이
- [C++ Software Design 시리즈](/blog/programming/cpp/cpp-software-design/guideline01-understand-the-importance-of-software-design) — 같은 정신, C++ 코드 차원
