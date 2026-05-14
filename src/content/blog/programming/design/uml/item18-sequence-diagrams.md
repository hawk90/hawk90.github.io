---
title: "UML 18: 시퀀스 다이어그램 — 시간 축으로 펼친 시나리오"
date: 2026-04-01T18:00:00
description: "UML에서 가장 많이 그리는 행위 다이어그램. Lifeline 4개로 시스템의 한 흐름을."
tags: [UML, Sequence Diagram, Interaction, Behavior]
series: "UML User Guide"
seriesOrder: 18
draft: true
---

## 한 줄 요약

> **"위에서 아래로 시간이 흐른다"** — 시퀀스 다이어그램은 객체 간 메시지를 시간 순서로 그린다. UML에서 가장 많이 그려진다.

## 어떤 문제를 푸는가

코드 한 줄 — `order.place()` — 뒤에서 일어나는 일을 누가 어떻게 협력하는지 보고 싶다면.

```
1. UI가 OrderService에 submit
2. OrderService가 Stripe에 charge
3. Stripe가 txId 반환
4. OrderService가 DB에 저장
5. UI에 confirmed 반환
```

이걸 글로 적으면 5줄, 시퀀스 다이어그램으론 한 그림. 게다가 글로는 안 보이는 **병렬·반복·예외**가 시퀀스에선 잘 보입니다.

## 한눈에 보는 예시

![Sequence diagram](/images/blog/uml/diagrams/item18-sequence.svg)

Customer가 주문을 걸고, OrderUI가 OrderSvc에 위임, OrderSvc가 Stripe로 결제하고, 결과를 위로 돌려 보냄. `alt` 박스로 재고 분기 표현.

## 구성 요소 정리

| 요소 | 그림 | 의미 |
| --- | --- | --- |
| Lifeline | 박스 + 점선 | 참가 객체 |
| Activation bar | 얇은 직사각형 | 객체가 활성화된 구간 |
| Sync message | 실선 + 채워진 ▶ | 호출 (return 기다림) |
| Async message | 실선 + 열린 ▷ | 비동기 (return 안 기다림) |
| Return | 점선 + ▶ | 반환값 |
| Self-call | 자기 lifeline에 도는 화살표 | 자기 메서드 호출 |
| Stop | 큰 X | 객체 소멸 |
| Combined fragment | 박스 | 제어 구조 |

## Combined Fragment — 제어 구조

시퀀스 안에 분기·반복·병렬을 넣는 방법.

### alt — if/else

<img src="/images/blog/uml/diagrams/item18-frame-alt.svg" alt="시퀀스 프레임 alt — 조건 분기" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

### opt — if (옵션)

<img src="/images/blog/uml/diagrams/item18-frame-opt.svg" alt="시퀀스 프레임 opt — 선택적 실행" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

### loop — 반복

<img src="/images/blog/uml/diagrams/item18-frame-loop.svg" alt="시퀀스 프레임 loop — 반복" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

### par — 병렬

<img src="/images/blog/uml/diagrams/item18-frame-par.svg" alt="시퀀스 프레임 par — 병렬 실행" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

### critical, ref, neg

- `critical` — 임계 구역 (동시 실행 금지)
- `ref` — 다른 시퀀스 다이어그램 참조
- `neg` — 절대 일어나면 안 되는 시나리오

## 메시지 화살표 미세 분류

| 형태 | 의미 |
| --- | --- |
| `─▶` (꽉) | sync call |
| `─▷` (열림) | async signal |
| `┈▶` (점선) | return |
| `─◯` (lost) | 보낸 메시지가 받을 곳 없음 |
| `◯─` (found) | 보낸 곳 모르고 받음 |

## 그릴 때 팁

### 1. 한 시나리오만

"성공 흐름 + alt로 실패"가 한 다이어그램의 한계. 더 복잡하면 **시나리오별로 다이어그램 분리**.

### 2. 7±2 객체

lifeline이 8개를 넘으면 가독성이 무너집니다.

### 3. Self-message는 신중하게

`this.helper()` 같은 내부 호출까지 다 그리면 다이어그램이 거미줄이 됩니다. **외부 협력**이 중심.

### 4. 시간은 위→아래

물리적 시간이 아니라 **인과 순서**입니다. 비동기에서도 "호출이 먼저, 응답이 나중".

## 자주 하는 실수

> ⚠️ 모든 메서드 호출을 그리기

`getX()`, `setX()`, util 메서드는 빼고 **도메인 흐름**만.

> ⚠️ Combined fragment 남발

분기·반복이 3중 4중 들어가면 시퀀스가 아닌 다이어그램 미로가 됩니다. 그럴 땐 **활동 다이어그램**으로 가세요.

> ⚠️ Return 화살표 누락

비동기여서 return이 없는 경우는 OK. 동기인데 return을 안 그리면 의미가 흐려집니다.

## 정리

- 시퀀스 다이어그램은 **시간 축으로 펼친 객체 간 메시지**.
- Lifeline · activation · message · combined fragment 4종이 building block.
- 분기/반복은 `alt`·`opt`·`loop`·`par` 박스로.
- 한 다이어그램은 **한 시나리오**, lifeline 7±2.

다음 편은 **활동 다이어그램** — 객체 간 메시지 대신 비즈니스 흐름·알고리즘.
