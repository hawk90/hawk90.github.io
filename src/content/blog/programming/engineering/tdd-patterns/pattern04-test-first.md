---
title: "Pattern 4: Test First"
date: 2026-07-01T04:00:00
description: "코드보다 test를 먼저 — TDD의 정의."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 4
tags: [tdd, beck, test-first]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 프로덕션 코드를 작성하기 직전에 테스트를 먼저 작성한다. 이것이 TDD의 핵심이다.

## 동기 (Motivation)

"테스트 먼저"는 TDD를 정의하는 특징이다. 왜 코드보다 테스트를 먼저 작성해야 할까?

**설계 압력(Design Pressure)**:
- 테스트를 먼저 쓰면 **호출자 입장**에서 API를 설계하게 된다
- 테스트하기 어려운 코드는 작성하기 전에 알 수 있다
- **결합도가 낮은** 설계로 자연스럽게 유도된다

**불안 감소(Anxiety Reduction)**:
- "이 코드가 맞는지" 고민하며 시간 낭비하지 않는다
- 테스트가 통과하면 **확신**을 갖고 다음으로 넘어간다
- Red-Green-Refactor 사이클이 **리듬**을 만든다

## Test First의 흐름

```
1. 테스트 작성 (Red)
   ↓
2. 테스트 실행 — 실패 확인
   ↓
3. 최소한의 코드 작성 (Green)
   ↓
4. 테스트 실행 — 통과 확인
   ↓
5. 리팩터링 (Refactor)
   ↓
6. 다음 테스트로 (1번으로)
```

이것이 Red-Green-Refactor 사이클이다.

## 예시: 계산기

### Step 1: 테스트 먼저 (Red)

```python
def test_add_two_numbers():
    calc = Calculator()
    result = calc.add(2, 3)
    assert result == 5
```

이 시점에 `Calculator` 클래스는 존재하지 않는다. 테스트를 실행하면:

```text
NameError: name 'Calculator' is not defined
```

좋다. 이게 Red 상태다.

### Step 2: 최소한의 코드 (Green)

```python
class Calculator:
    def add(self, a, b):
        return 5  # 하드코딩으로 시작!
```

테스트가 통과한다. "5를 리턴하면 되잖아"라고 생각할 수 있다. 맞다. 지금은 그게 정답이다.

### Step 3: 다음 테스트로 일반화 유도

```python
def test_add_different_numbers():
    calc = Calculator()
    result = calc.add(3, 4)
    assert result == 7
```

이제 하드코딩으로는 안 된다:

```python
class Calculator:
    def add(self, a, b):
        return a + b  # 일반화
```

테스트가 **구현을 이끌어낸다**.

## Test First가 주는 설계 이점

### 1. API를 호출자 입장에서 설계

```python
# Test First로 작성하면 자연스럽게 사용하기 좋은 API가 나온다
def test_format_currency():
    formatter = CurrencyFormatter(locale="ko_KR")
    result = formatter.format(1234567)
    assert result == "₩1,234,567"
```

테스트를 먼저 쓰면서 "어떻게 쓰고 싶은가?"를 먼저 생각한다.

### 2. 의존성이 명시적으로 드러남

```python
def test_send_notification():
    # 테스트를 위해 의존성을 주입해야 함
    email_sender = FakeEmailSender()
    notifier = Notifier(email_sender)  # 의존성이 명시적

    notifier.send("user@example.com", "Hello")

    assert email_sender.last_recipient == "user@example.com"
```

테스트 먼저 쓰면 숨겨진 의존성을 만들기 어렵다.

## 흔한 반론과 답변

| 반론 | 답변 |
|------|------|
| "시간이 더 걸린다" | 디버깅 시간이 줄어 총 시간은 비슷하거나 적다 |
| "요구사항이 바뀌면 테스트도 버린다" | 테스트가 설계를 개선했으므로 그 가치는 남는다 |
| "뭘 테스트해야 할지 모르겠다" | Test List 패턴으로 먼저 목록을 만들어라 |
| "너무 작은 단위 아닌가" | 작은 단위가 디버깅을 쉽게 만든다 |

## 언제 Test First가 어려운가

- **탐색적 프로토타이핑**: 뭘 만들지 모를 때
- **UI 개발**: 시각적 결과를 자동화하기 어려울 때
- **레거시 코드**: 테스트 인프라가 없을 때

이런 경우에도 "가능한 한 빨리" 테스트를 작성하는 것이 좋다.

## 정리

- **코드 작성 직전에** 테스트를 먼저 쓴다
- Test First가 **설계 압력**을 만든다
- **호출자 입장**에서 API를 설계하게 된다
- **Red-Green-Refactor** 사이클이 리듬을 준다
- 불안을 줄이고 **확신**을 갖고 진행할 수 있다

## 관련 패턴

- [Pattern 1: Test](/blog/programming/engineering/tdd-patterns/pattern01-test) — 테스트의 정의
- [Pattern 3: Test List](/blog/programming/engineering/tdd-patterns/pattern03-test-list) — 테스트 먼저 쓰기 위한 목록
- [Pattern 5: Assert First](/blog/programming/engineering/tdd-patterns/pattern05-assert-first) — 테스트 내부에서도 assertion 먼저
