---
title: "UML 16: 유스케이스 — 시스템 밖에서 본 한 시나리오"
date: 2026-05-03T16:00:00
description: "Actor가 system에게 시켜서 얻는 가치 단위 — 요구사항 모델링의 가장 강력한 도구."
tags: [UML, Use Case, Requirements, Actor]
series: "UML 2.5.1"
seriesOrder: 16
draft: false
---

## 한 줄 요약

> **"행위자 + 시스템 + 한 가지 가치"** — 유스케이스는 시스템 외부에서 본 한 가지 의미 있는 사용 시나리오.

## 어떤 문제를 푸는가

"시스템이 뭘 하는가?"를 클래스로 시작하면 금세 길을 잃습니다. 도메인 객체부터 만들면 사용자가 진짜로 원하는 게 뭔지 잊어버리기 쉽거든요.

유스케이스는 **사용자 입장**에서 시작합니다.

- 누가 (Actor)
- 무엇을 (Use Case)
- 시스템과 어떻게 상호작용해서
- 어떤 **가치**를 얻는가

## 한눈에 보는 구조

![Actor and use case](/images/blog/uml/diagrams/item16-use-case.svg)

- **막대 사람** — 행위자(Actor)
- **타원** — 유스케이스(Use Case)
- 둘을 잇는 **실선** — 참여(Association)

## 유스케이스 = 시나리오

유스케이스는 한 줄짜리 타원이 아니라 **시나리오 집합**입니다.

**Use Case: Place Order**

- Primary Actor — Customer
- Goal — 결제 완료된 주문을 등록

**Main Success Scenario:**

1. Customer가 장바구니를 본다
2. Customer가 주문을 시작한다
3. System이 결제 정보를 요청한다
4. Customer가 결제 정보를 입력한다
5. System이 결제를 처리한다
6. System이 주문을 확정하고 영수증을 보낸다

**Extensions (대안):**

- 3a — 결제 정보가 이미 저장돼 있으면 단계 3 생략
- 5a — 결제 실패 시 단계 4부터 다시
- 5b — 재고 부족 시 backorder로 전환

타원은 이 시나리오 텍스트의 **시각적 이름표**일 뿐.

## Actor — 시스템 외부의 모든 것

행위자는 사람만이 아닙니다.

| Actor | 예 |
| --- | --- |
| 사용자 | Customer, Admin, Guest |
| 외부 시스템 | Payment Gateway, Email Server, Bank |
| 시간 | Scheduler (매일 자정에 트리거) |
| 장치 | 센서, 카드 리더 |

> 💡 시간 자체가 actor일 수 있다 — "매일 새벽 3시에 배치 작업"의 트리거.

### Primary vs Secondary Actor

- **Primary**: 유스케이스를 시작하는 actor (Customer가 주문을 건다)
- **Secondary**: 유스케이스가 진행되며 호출하는 외부 (System이 Payment Gateway에 결제 요청)

## 좋은 유스케이스 이름

- ✅ **동사 + 명사** — "Place Order", "Cancel Subscription"
- ❌ "Order Management" — 너무 큰 묶음, 시나리오 아님
- ❌ "Click Button" — 너무 작음, UI 동작

기준: "**행위자에게 의미 있는 가치 단위**"인가? 한 sitting에 끝낼 수 있는가?

## Goal 레벨 — Cockburn의 분류

Alistair Cockburn은 유스케이스의 추상화 수준을 3단계로 분류했습니다.

| 레벨 | 기호 | 예 |
| --- | --- | --- |
| Summary | ☁️ (구름) | "고객 관리하기" |
| User Goal | 🌊 (바다) | "주문하기" |
| Subfunction | 🐟 (물고기) | "할인 적용하기" |

대부분 유스케이스는 **User Goal 레벨** — 한 사용자가 한 번 앉아서 끝낼 수 있는 일.

## 자주 하는 실수

> ⚠️ UI 흐름을 유스케이스로

"버튼 클릭 → 페이지 이동 → 폼 작성"은 유스케이스가 아닙니다. **사용자 가치**가 단위.

> ⚠️ Actor를 모듈로

내부 컴포넌트를 actor로 그리면 의미가 망가집니다. Actor는 **시스템 외부**.

> ⚠️ 시스템을 actor로

"System이 알림을 보낸다"는 actor가 아니라 시스템 자체의 동작. 시간 actor나 외부 서비스 actor를 쓰세요.

## 정리

- 유스케이스는 **외부에서 본 한 가지 가치**.
- Actor는 사용자·외부 시스템·시간·장치까지 포함.
- 다이어그램의 타원은 **시나리오 텍스트의 이름표**일 뿐.
- 좋은 이름: **동사 + 명사**, User Goal 레벨.

다음 편은 **유스케이스 다이어그램** — 여러 유스케이스를 모아 시스템 전체 그림을.
