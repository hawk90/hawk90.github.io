---
title: "Ch 32: 프레임워크는 세부 사항이다"
date: 2026-05-01T08:00:00
description: "프레임워크와 결혼하지 마라. 라이브러리로 다루고 경계로 격리해야 한다 — 프레임워크 저자의 의도와 우리의 필요가 같지 않다."
tags: [Architecture, Frameworks, Detail]
series: "Clean Architecture"
seriesOrder: 32
draft: true
---

## 이 챕터의 메시지

DB가 디테일이고, 웹이 디테일이라면 — **프레임워크도 디테일**이다. 그러나 프레임워크의 함정은 더 깊다.

Martin의 경고:

> **Don't marry the framework.**

프레임워크와 결혼하지 마라. 같이 살되, 결혼은 하지 마라.

## 프레임워크의 본질

프레임워크는 누군가가 만든 도구다. 그 누군가는 **자기 문제**를 풀기 위해 만들었다.

- Spring 저자의 문제 vs 우리의 문제
- Rails 저자의 문제 vs 우리의 문제
- React 저자의 문제 vs 우리의 문제

대부분 우리 문제와 부분적으로 겹친다 — 그래서 프레임워크가 유용하다. 그러나 100% 같지는 않다.

따라서 프레임워크는 우리 문제의 **일부 해결책**이다. 전체 해결책이 아니다.

## 결혼의 비용

흔한 패턴 — 프레임워크 위에 모든 걸 짠다.

- Entity 클래스가 `@Entity` 어노테이션
- Controller가 `@RestController`
- Service가 `@Service`
- 모든 게 Spring 컨테이너가 관리

이건 결혼이다. Spring을 빼면 시스템이 무너진다.

비용:

- **버전 업그레이드 위험** — Spring 5 → 6 호환 안 됨 → 큰 리팩터링
- **다른 프레임워크로 이동 불가** — Quarkus, Micronaut 등 대안이 나와도 이미 결혼
- **테스트 부담** — Spring 환경 없이는 테스트 불가
- **러닝 커브** — 새 개발자는 Spring을 배워야 시스템을 이해

## 라이브러리로 다루기

해법은 프레임워크를 **라이브러리로 격리**하는 것.

```
[비즈니스 로직] (Spring 안 씀)
     ↓
[Adapter 층] (Spring 어노테이션 등 여기만)
     ↓
[Frameworks 층] (Spring)
```

비즈니스 로직 / Use Case / Entity는 Spring 어노테이션 없이 순수. Adapter 층(Controller, Repository 구현)에만 Spring annotation 등장.

이게 가능하면:

- 프레임워크 변경이 Adapter 층만 만진다
- 테스트가 프레임워크 독립적
- 비즈니스 로직의 본질이 코드에 드러남 (Screaming Architecture)

## 어쩔 수 없이 결혼을 강요하는 프레임워크

문제는 — 어떤 프레임워크는 **결혼을 강요**한다.

- 코드를 특정 디렉터리에 두어야 한다
- 특정 클래스를 상속해야 한다
- 특정 인터페이스를 구현해야 한다
- 특정 어노테이션을 붙여야 한다

이런 프레임워크는 "라이브러리로 격리"가 어렵다. 프레임워크가 시스템 구조 자체를 결정한다.

Martin의 권장 — **이런 프레임워크는 신중히 선택**한다. 그리고 가능하면 라이브러리 형태의 대안을 찾는다.

## 한계 인정

100% 격리는 어렵다. 어딘가에서는 프레임워크에 직접 의존해야 한다.

- HTTP 처리 — Spring/Express/Flask 등 어딘가는 사용
- DI — 자체 wiring 아니라면 컨테이너 사용
- ORM — 그대로 노출 또는 매퍼로 격리

핵심은 **격리할 수 있는 만큼 격리**한다는 것이다. 비즈니스 로직 만큼이라도 프레임워크 독립으로 유지.

## 어떤 결정을 결혼으로 만들 것인가

Martin은 이 결정을 신중하게 하라고 한다.

**결혼해도 OK**:
- 핵심 언어 (Java, Python, ...) — 사실상 결혼 강제
- 표준 라이브러리 — 안정적
- 컴파일러 — 같은 이유

**결혼 신중**:
- DI 컨테이너 (Spring, Guice)
- ORM (Hibernate, JPA)
- 웹 프레임워크 (Spring MVC, Rails)
- UI 프레임워크 (React, Vue)

**결혼 피함**:
- 특정 클라우드 (AWS-only, Azure-only)
- 특정 메시징 시스템
- 특정 모니터링 / APM

## 점진적 의존성 통제

처음부터 모든 프레임워크를 격리할 필요는 없다. 점진적으로.

1. **비즈니스 Entity / Use Case** — 즉시 격리. Annotation 없이.
2. **Repository / Service** — 인터페이스로 격리. 구현체는 프레임워크 사용 가능.
3. **Controller / Adapter** — 프레임워크 사용 자유.
4. **main / config** — 프레임워크 wiring.

이 점진적 격리만으로도 결혼은 피할 수 있다.

## 정리

- **프레임워크는 세부 사항** — 누군가의 문제 해결책일 뿐
- 결혼의 비용 — 버전 업, 대안 이동 불가, 테스트 부담, 러닝 커브
- 해법 — **라이브러리로 격리**, Adapter 층에만 프레임워크 의존
- 어떤 프레임워크는 결혼 강요 — 신중히 선택
- 100% 격리는 아니어도 비즈니스 로직만이라도 격리
- 결혼 OK는 언어/표준 라이브러리, 신중은 DI/ORM/UI 프레임워크

## 다음 장 예고

다음 장은 **사례 연구** — 비디오 판매 시스템을 Clean Architecture로 디자인.

## 관련 항목

- [Ch 17: 경계](/blog/programming/design/clean-architecture/chapter17-boundaries-drawing-lines)
- [Ch 21: Screaming Architecture](/blog/programming/design/clean-architecture/chapter21-screaming-architecture)
- [Ch 30: DB는 디테일](/blog/programming/design/clean-architecture/chapter30-the-database-is-a-detail)
- [Ch 31: 웹은 디테일](/blog/programming/design/clean-architecture/chapter31-the-web-is-a-detail)
