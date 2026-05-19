---
title: "Pattern 10: Explanation Test"
date: 2026-05-10T10:00:00
description: "TDD를 설명할 때 — 함께 테스트를 작성하며 시연한다."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 10
tags: [tdd, beck, explanation-test, teaching]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> TDD를 *말로 설명*하지 말고 *함께 테스트를 작성하며 시연*. Learning by doing이 압도적으로 강력하다.

## 동기 (Motivation)

동료에게 TDD를 설명하려 한다.

- **말**: *"테스트를 먼저 쓰고, 실패 확인 후 코드..."*  
- **시연**: *"자, Calculator 만들 거야. 어떻게 쓰고 싶어? `calc.add(2,3)`? 그럼 테스트부터 적자..."*

후자가 *훨씬 강력*. 추상 설명보다 *구체 동작*이 학습에 효과적.

### 신호

- 동료/멘티가 *TDD 개념 이해는 했지만 실제 적용 못 함*.
- *코드 리뷰*에서 "이거 왜 이렇게?" 질문 빈번.
- *새 팀원 온보딩* 필요.
- *몹 프로그래밍/페어*에서 patterns 공유.

### 왜 시연이 효과적인가

1. **Learning by Doing** — 능동적 참여.
2. **즉각적 피드백** — Red/Green을 *눈으로*.
3. **질문 유도** — 시연 중 *대화 발생*.
4. **자연스러운 리듬** — Red-Green-Refactor를 *몸이 기억*.

## 절차 (Mechanics)

1. **간단한 도메인 선택** — 계산기, 환율 변환 같은 *5분 내 완성*.
2. **Test List**를 *공동으로* 작성.
3. **첫 테스트(Starter)** 작성 + 실패 확인.
4. **최소 코드** 작성 + 통과 확인.
5. **다음 테스트** — 자연스러운 일반화.
6. **중간에 질문 받음** — "왜 5를 하드코딩?", "왜 이 순서?".
7. **리팩터링 단계** 시연 — 안전망 효과 설명.

## 예시 1 — 페어에서 버그 수정

```text
A: "이 버그 어떻게 고칠까?"
B: "먼저 버그를 재현하는 테스트를 써보자."

A: "이렇게?"
    def test_bug_123():
        result = process(edge_case_input)
        assert result == expected

B: "실행해보자. fail이지? 이게 버그 자체야.
    이제 production을 고쳐서 통과시키자."
```

버그 fix가 *test 추가 + production 수정*이 됨 → *regression 자동 보호*.

## 예시 2 — 새 팀원 온보딩

```text
"우리 팀은 TDD로 작업해.
간단한 기능 하나를 같이 만들어 볼까?
주문 취소 기능. 테스트 먼저 써보자.

[화면 공유]
def test_cancel_order():
    order = Order(status='pending')
    order.cancel()
    assert order.status == 'cancelled'

자, 실행하면? — fail. order 객체에 cancel 없음.

이제 production:
class Order:
    def __init__(self, status): self.status = status
    def cancel(self): self.status = 'cancelled'

다시 실행 — green!

다음 테스트는? 이미 cancelled인 order는?"
```

대화가 *자연스럽게 다음 케이스* 유도.

## 예시 3 — Mob programming

```text
드라이버 (코드 작성): "다음 테스트는 뭘 써야 할까?"
네비게이터1: "쿠폰 적용 케이스"
네비게이터2: "그 전에 쿠폰 없는 경우부터 — One Step!"
드라이버: "좋아, 쿠폰 없으면 할인 없음.

def test_no_coupon_no_discount():
    cart = Cart(); cart.add(Item('A', 1000))
    assert cart.total() == 1000

테스트 통과. 다음?"

네비게이터1: "이제 쿠폰 적용 케이스로 가자.
def test_coupon_applies_discount():..."
```

여러 사람의 *경험 공유* + *합의된 진행*.

## 시연 효과적 팁

### 1. 작은 예제로

5분 안에 끝나는 예제. 한 기능에 *3-5 테스트*.

### 2. 실패를 보여주기

```text
"일부러 assertion을 틀리게 해볼게."
assert add(2, 3) == 6   # 일부러 fail
"실패 메시지: expected 6, actual 5
이게 디버깅을 쉽게 해주는 이유야."
```

### 3. 리팩터링 단계 포함

```text
"테스트 통과. 이제 정리할 수 있어.
테스트가 안전망이니까. 중복 제거 — 테스트 다시 → 여전히 green."
```

### 4. 질문 환영

"왜?"가 *깊은 이해*. 즉답 어려우면 *나중에 답변*도 OK.

## 자주 보는 안티패턴

### 1. *시연 도중 끼어들지 못함*
"끝까지 들어!" → 학습 막힘. *질문 환영*.

### 2. *너무 큰 예제*
30분 시연으로 *복잡한 OrderWorkflow* — 멘티가 *어디서부터 어디까지인지* 모름. 작게.

### 3. *완성된 코드 보여주기*
"이건 이미 짠 거고..." — *과정*이 빠짐. *처음부터 함께*.

### 4. *말로만 추가 설명*
시연 중 *말 폭주*. *코드가 말함*. 말은 *핵심만*.

### 5. *Red 단계 생략*
green만 보여줌 → "테스트가 항상 통과하니 의미 없네". *Red → Green 전환*이 핵심.

### 6. *Refactor 생략*
green 즉시 다음 테스트 → "TDD는 짧은 코드 짜기네". *Refactor가 디자인 개선* 메시지 누락.

## Modern variants

### Live coding workshop

conference 발표 — *실시간 코딩 시연*. 청중이 *오타·실패까지* 함께 봄.

### Kata practice

Coding kata (예: FizzBuzz, Roman Numerals, Bowling Game)를 *반복 연습* — 매번 다른 *접근* 시도.

### Pair/Mob programming session

직접 시연 + 참여 — *기억 강화*.

### Video tutorial

녹화 영상 — *반복 시청* 가능. 그러나 *질문 못 함*. supplementary.

### Code review as teaching

PR 리뷰에서 *test 작성 패턴* 공유 — *비동기 교육*.

### "Hammock-driven development" (Beck humour)

너무 어려운 문제는 *시연 중 멈춤* — *생각할 시간* 명시. 시연이 *문제 해결 과정*의 진실.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| VS Code Live Share | 실시간 페어/몹 |
| IntelliJ Code With Me | 같음 |
| Zoom / Meet 화면 공유 | 원격 시연 |
| OBS Studio | 녹화·스트리밍 |
| Carbon | 시연용 깔끔한 코드 이미지 |
| asciinema | terminal 녹화 |

## 성능 고려

추상 — *시간 효율*. 일대일 시연은 *시간 많이* 듦. *팀 단위 시연 / 녹화*로 *amortize*.

## 관련 패턴

- [Pattern 1: Test](/blog/programming/engineering/tdd-patterns/pattern01-test) — 테스트의 기본
- [Pattern 4: Test First](/blog/programming/engineering/tdd-patterns/pattern04-test-first) — 테스트 먼저
- [Pattern 9: Starter Test](/blog/programming/engineering/tdd-patterns/pattern09-starter-test) — 시연 시작점
- [Pattern 11: Learning Test](/blog/programming/engineering/tdd-patterns/pattern11-learning-test) — 새 API 학습 시 test 활용
