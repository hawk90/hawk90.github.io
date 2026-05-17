---
title: "Ch 24: 부분 경계"
date: 2025-06-02T00:00:00
description: "완전한 경계는 비싸다. 부분 경계로 절충 — 미래의 분리를 가능하게 두면서 현재 비용을 줄인다."
tags: [Architecture, Boundaries, Pragmatic]
series: "Clean Architecture"
seriesOrder: 24
draft: true
---

## 이 챕터의 메시지

완전한 아키텍처 경계는 비싸다.

- 양방향 인터페이스
- 입출력 DTO
- 별도 컴포넌트 빌드
- 모든 의존이 인터페이스를 통과

이 비용을 모든 곳에 지불할 수는 없다. 그래서 Martin은 **부분 경계**(partial boundary)라는 절충안을 제시한다.

부분 경계의 핵심 — **지금은 비용을 줄이되, 나중에 완전한 경계로 옮길 수 있게** 만든다.

## 완전한 경계의 비용

22장의 Clean Architecture를 충실히 따르면 모든 경계마다 다음이 필요하다.

```java
// 인터페이스
interface LoanRepository { ... }
interface LoanPresenter { ... }

// DTO
class LoanRequest { ... }
class LoanResponse { ... }

// 구현체
class SqlLoanRepository implements LoanRepository { ... }
class HtmlLoanPresenter implements LoanPresenter { ... }
```

작은 시스템이라면 과한 비용이다. 단순한 use case 하나에 6개 클래스가 필요하다.

## 부분 경계 1 — "Skip the Last Step"

인터페이스는 정의하되, 컴포넌트로 완전 분리는 안 한다.

```
[빌드 산출물]                [실제 구조]
─────────────                ───────────
loan-app.jar                loan-app.jar
                            ├── domain/  (Entities, Use Cases, Interfaces)
                            ├── adapters/ (Controllers, Presenters)
                            └── infra/   (DB, Web)
```

한 jar 안에 모든 게 있지만, 패키지 구조와 인터페이스로 의존 방향을 통제한다. 향후 jar로 쪼개려면 단순히 빌드 설정만 바꾸면 된다 — 코드는 안 바꿔도 된다.

이게 모듈러 모놀리스의 핵심 디자인. **소스 레벨 경계, 배포는 통합**.

## 부분 경계 2 — One-Dimensional Boundary

양방향 인터페이스 대신 한쪽 방향만 인터페이스를 둔다.

```
[단방향]                            [양방향, 완전]
─────────                          ───────────────
ClientCode                          ClientCode → IService
   ↓                                              ↑
ServiceImpl                                   ServiceImpl
                                              IClientCallback ← 콜백 인터페이스
```

단방향은 GoF Strategy 패턴이다. Service 호출만 하고, 콜백은 없다. 더 단순하지만 격리도가 낮다.

이 디자인은 다음에 적합:
- Service가 Client를 모를 때
- 콜백 / 이벤트가 필요하지 않을 때

## 부분 경계 3 — Facade

인터페이스도 정의하지 않고, 단지 **Facade** 클래스 하나로 경계를 표시한다.

```java
// 모든 호출은 LoanFacade를 통해
class LoanFacade {
  public void create(...) { loanService.create(...); }
  public Loan get(...) { return loanService.get(...); }
}

// 외부는 LoanFacade만 사용
class LoanController {
  LoanFacade facade;
  void handle() { facade.create(...); }
}
```

**가장 가벼운 경계**. 인터페이스도 없고, DTO도 없다. 다만 한 클래스가 외부 노출 표면을 통제한다.

향후 완전한 경계로 옮기려면 Facade를 인터페이스로 추출하고 DTO를 추가하면 된다.

## 어떤 부분 경계를 선택할까

이 결정은 도메인 지식과 미래 예측에 의존한다.

**완전 경계 권장**:
- 분리가 확실히 필요할 것 같은 곳 (DB, UI, framework)
- 여러 팀이 동시에 작업할 곳
- 마이크로서비스로 분리 예정

**부분 경계 권장**:
- 분리 가능성이 낮지만 0은 아닌 곳
- 같은 팀 안의 모듈
- 모듈러 모놀리스 안의 도메인 분리

**아무 경계 없이**:
- 분리될 일 없을 곳
- 너무 작은 모듈

## YAGNI vs 미래 대비

24장의 메시지는 16장과 비슷하지만 다른 각도다.

- **YAGNI** — 지금 필요 없는 것은 만들지 마라
- **미래 대비** — 변경 가능성 있는 곳은 미리 준비하라

부분 경계는 이 둘의 절충이다. 지금은 가볍게, 그러나 나중에 강해질 수 있게.

Martin의 표현:

> "Sometimes you might decide that the cost of a full architectural boundary is too high — but you want to hold a place for such a boundary in case it's needed later."

자리만 표시해 두는 것 — 그게 부분 경계의 본질이다.

## 부분 경계의 위험

이 절충은 위험도 있다.

**1. 절대 강화되지 않는다**

"나중에"라고 미루다 보면 영원히 안 옮긴다. 그러다 정작 분리가 필요해졌을 때 비용이 폭발한다.

**2. 사람이 경계를 무시한다**

소프트 경계는 빌드 시스템이 검증하지 않으면 무시되기 쉽다. "이거 한 줄만 직접 호출해도 되겠지" 하는 변경이 쌓인다.

**3. 의도의 모호함**

완전 경계인지 부분 경계인지 코드만 봐서는 구분이 안 된다. 의도가 문서화되지 않으면 다음 개발자가 헷갈린다.

## 실용적 권장

Martin의 권장.

1. **변경 가능성이 명확하면 완전 경계**
2. **불확실하면 부분 경계 + 결정 연기**
3. **변경이 없을 게 확실하면 경계 없음**

가능하면 빌드 시스템(maven, gradle, bazel 등)으로 의존 방향을 검증한다. 그러면 부분 경계도 강제된다.

## 정리

- 완전한 경계는 비싸다 — **부분 경계**가 절충
- 세 가지 형태 — Skip the last step / One-dimensional / Facade
- **자리만 표시**해 두고 나중에 강화 가능
- 위험 — 영원히 안 강해질 수 있다, 사람이 무시할 수 있다
- 빌드 시스템으로 의존 방향을 강제할 수 있으면 좋다

## 다음 장 예고

다음 장은 **레이어와 경계** — 적절한 경계의 수와 위치를 어떻게 정할 것인가.

## 관련 항목

- [Ch 17: 경계](/blog/programming/design/clean-architecture/chapter17-boundaries-drawing-lines)
- [Ch 22: The Clean Architecture](/blog/programming/design/clean-architecture/chapter22-the-clean-architecture) — 완전한 경계의 모습
- [GoF Facade](/blog/programming/design/gof-design-patterns/item01-abstract-factory/) — Facade 패턴
