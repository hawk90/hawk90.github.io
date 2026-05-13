---
title: "Ch 27: 서비스 — 크고 작은"
date: 2025-06-08T03:00:00
description: "마이크로서비스의 한계. 서비스로 쪼개는 것이 자동으로 디커플링을 만들지 않는다. 결합은 인터페이스가 아닌 데이터에 산다."
tags: [Architecture, Microservices, Services]
series: "Clean Architecture"
seriesOrder: 27
draft: true
---

## 이 챕터의 메시지

마이크로서비스가 유행이다. 그러나 Martin은 한 가지를 분명히 한다.

> **서비스로 쪼개는 것이 자동으로 좋은 아키텍처를 만들지 않는다.**

서비스는 18장의 "경계의 가장 강한 형태"일 뿐이다. 강한 경계라고 좋은 디자인이 보장되는 게 아니다. SOLID와 컴포넌트 원칙은 여전히 적용된다.

## 잘못된 가정들

마이크로서비스 옹호자들이 자주 주장하는 것들.

**1. "서비스는 자동으로 격리된다"**

거짓. 서비스 사이의 결합은 호출 인터페이스에만 있는 게 아니라 **공유하는 데이터 모델**에 있다.

```
Service A ←──→ JSON message ←──→ Service B
              {customerId, amount, status}
```

두 서비스가 같은 데이터 모델에 의존한다. customerId 필드 이름이 바뀌면 둘 다 변경.

**2. "서비스는 자동으로 독립 진화한다"**

거짓. 비즈니스 도메인의 변경은 종종 여러 서비스를 동시에 만진다. "주문 흐름 변경" → Order Service + Inventory Service + Notification Service 동시 수정.

**3. "서비스는 자동으로 확장 가능하다"**

부분 거짓. 어떤 서비스는 정말 독립 확장 가능. 그러나 다른 서비스에 의존하는 경우, 그 의존 서비스의 한계가 곧 자신의 한계.

## 결합의 진짜 위치

Martin의 핵심 주장 — **결합은 데이터에 산다**.

- 인터페이스 / API
- 메시지 형식 / 스키마
- 데이터베이스 스키마 (공유 DB의 경우)

서비스 경계를 그어도 이 데이터 차원의 결합은 그대로 남는다. 오히려 더 어렵게 만들기도 한다 — 다른 팀, 다른 배포 주기, 다른 언어이므로 변경 동기화가 어렵다.

## Cross-Cutting Concerns

마이크로서비스의 또 다른 어려움 — **여러 서비스를 동시에 만지는 변경**.

예: "유럽 고객을 위한 GDPR 준수" 요구가 들어왔다.

- User Service — 데이터 보관 정책 변경
- Order Service — 데이터 보관 정책 변경
- Email Service — 동의 확인 추가
- Analytics Service — 익명화 추가
- ...

**모든 서비스에 영향**이 간다. 마이크로서비스의 "한 서비스만 만진다"는 약속이 깨진다.

이런 cross-cutting 변경은 어떤 아키텍처에서도 어렵다. 마이크로서비스에서 특히 어려운 이유는 — 각 서비스가 독립 배포되므로 변경 동기화가 자연스럽지 않다.

## SOLID는 여전히 적용된다

서비스 안에서도, 서비스 사이에서도 SOLID는 작동한다.

- **SRP** — 한 서비스는 한 actor의 책임만 (서비스 분리 기준)
- **OCP** — 새 기능 추가가 기존 서비스를 안 바꿔야
- **LSP** — 서비스 인터페이스 호환성 (특히 버전 관리)
- **ISP** — 클라이언트가 안 쓰는 메시지에 의존하지 않게
- **DIP** — 정책 서비스가 디테일 서비스에 의존하지 않게

마이크로서비스가 SOLID를 무시할 수 있다고 생각하면 큰 실수다.

## 서비스의 비용

서비스로 쪼개면 따라오는 비용.

**1. 네트워크 지연** — ms 단위, 누적되면 큼
**2. 직렬화** — JSON / Protobuf / Avro
**3. 부분 실패** — 분산 시스템의 본질, 회로 차단기 / 재시도 / 멱등성 필요
**4. 운영 복잡도** — 모니터링 / 추적 / 로깅 / 배포 파이프라인
**5. 데이터 일관성** — 분산 트랜잭션 어려움 → eventual consistency
**6. 디버깅** — 한 요청이 N 서비스 가로지름

이 비용이 정당화되어야 마이크로서비스의 가치가 있다.

## 언제 마이크로서비스인가

Martin의 추천.

**적합**:
- 진짜로 독립적인 도메인 (User / Order / Billing 등)
- 별도 팀이 별도 진화시키는 영역
- 다른 확장 패턴이 필요한 부분 (high traffic API vs batch job)
- 다른 기술 스택이 필요한 부분

**부적합**:
- 자주 함께 변하는 두 영역
- 트랜잭션이 필요한 두 영역
- 작은 팀 (인프라 비용이 가치 초과)
- 초기 단계 시스템 (도메인 경계 미확정)

> "I think the best architecture for new applications is to **start with a monolith**. ... When you understand the domain well enough, you can extract services."

처음에는 모놀리스로 시작한다. 도메인을 충분히 이해한 후 서비스로 추출한다.

## 모듈러 모놀리스 + 추출

이게 모던 권장 패턴이다.

```
1단계: 모듈러 모놀리스
       └─ Source-level 경계, 명확한 모듈 분리
2단계: 일부 모듈을 서비스로 추출
       └─ 가장 분리가 명확한 부분부터
3단계: 필요에 따라 더 많은 추출
```

이 점진적 접근의 핵심은 **컴포넌트 경계를 처음부터 잘 그어 두는 것**이다. Clean Architecture가 추구하는 것이 바로 그 경계다.

## 정리

- 마이크로서비스 = 18장의 가장 강한 경계, **자동 디커플링 아님**
- 결합은 인터페이스보다 **데이터에 산다**
- Cross-cutting 변경은 모든 서비스를 만진다
- SOLID는 서비스 안과 사이에 여전히 적용
- 서비스 비용 — 지연 / 직렬화 / 부분 실패 / 운영 복잡도
- **모놀리스로 시작 → 도메인 이해 후 서비스 추출**이 안전한 길

## 다음 장 예고

다음 장은 **테스트 경계** — 테스트도 시스템의 일부, 경계를 어떻게 설계할 것인가.

## 관련 항목

- [Ch 18: 경계의 해부](/blog/programming/design/clean-architecture/chapter18-boundary-anatomy) — 강도 스펙트럼
- [Ch 16: 독립성](/blog/programming/design/clean-architecture/chapter16-independence) — 디커플링의 모드
- [Ch 14: 컴포넌트 결합](/blog/programming/design/clean-architecture/chapter14-component-coupling)
