---
title: "Pattern 4: Test First"
date: 2026-05-10T04:00:00
description: "프로덕션 코드를 작성하기 직전에 테스트를 먼저 — TDD의 정의."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 4
tags: [tdd, beck, test-first]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
draft: true

---

## 한 줄 요약

> 프로덕션 코드 작성 직전에 테스트를 먼저. 설계 압력과 리듬을 동시에 얻는 TDD의 정의.

## 동기

"Test First"는 TDD를 정의하는 특징. 왜 코드보다 테스트 먼저인가.

### 설계 압력 (Design Pressure)

테스트를 먼저 쓰면:

- 호출자 입장에서 API 설계 — 사용 어려운 API는 작성 단계에서 발견.
- 테스트하기 어려운 코드는 작성 전에 알 수 있음.
- 결합도 낮은 설계로 자연 유도 (DI, interface).

### 불안 감소 (Anxiety Reduction)

- "이 코드가 맞나" 고민에 시간 낭비하지 않음.
- 테스트 통과 → 확신 → 다음 단계.
- Red-Green-Refactor가 리듬 제공.

### Red-Green-Refactor 사이클

```text
1. 테스트 작성 (Red)
2. 실행 → 실패 확인
3. 최소한의 코드로 통과 (Green)
4. 다시 실행 → 통과 확인
5. 리팩터링 (Refactor)
6. 다음 테스트 → 1
```

이 사이클이 짧을수록 (몇 분) TDD의 효과 극대.

### 신호

- "이거 어떻게 호출하는 거지?" — API 설계가 호출자에 친절하지 않음.
- 코드 작성 후 테스트 작성 미루기.
- 작성한 코드를 테스트하기 위해 큰 setup 필요.
- 디버깅 시간이 코딩 시간보다 큼.

## 절차

1. [Test List](/blog/programming/engineering/tdd-patterns/pattern03-test-list)에서 다음 테스트 선택.
2. **테스트 작성** — production 코드 없이.
3. **실행 → fail** 확인. 실패 메시지가 기대대로인지 검증.
4. **최소 코드 작성** — 통과만 시키면 됨.
5. **실행 → green**.
6. **리팩터링** — 중복 제거, 이름 개선. 항상 green 유지.
7. test list에서 항목 체크, 다음 테스트로.

## 예시 1 — 계산기

### Step 1: Red

```python
def test_add_two_numbers():
    calc = Calculator()
    result = calc.add(2, 3)
    assert result == 5
```

`Calculator`가 없음 — fail.

```text
NameError: name 'Calculator' is not defined
```

### Step 2: Green (최소)

```python
class Calculator:
    def add(self, a, b):
        return 5   # hardcoded!
```

통과. "5만 return하면 되잖아" — 맞음. 지금은 그게 정답.

### Step 3: Triangulate — 다음 테스트

```python
def test_add_different_numbers():
    calc = Calculator()
    result = calc.add(3, 4)
    assert result == 7
```

hardcoded fail. 일반화 강제:

```python
class Calculator:
    def add(self, a, b):
        return a + b
```

테스트가 구현을 끌어낸다.

## 예시 2 — API 설계 압력

```python
# Test First로 작성하면 자연스럽게 사용하기 좋은 API
def test_format_currency():
    formatter = CurrencyFormatter(locale="ko_KR")
    result = formatter.format(1234567)
    assert result == "₩1,234,567"
```

테스트 먼저 쓰며 "어떻게 쓰고 싶은가?"를 결정. 코드 먼저면 사용성 무시한 API가 자주 나옴.

## 예시 3 — DI 강제

```python
def test_send_notification():
    email_sender = FakeEmailSender()        # ← 테스트 위해 주입
    notifier = Notifier(email_sender)
    notifier.send("user@example.com", "Hello")
    assert email_sender.last_recipient == "user@example.com"
```

테스트가 DI를 요구 → production 코드가 결합도 낮게 설계.

```python
# 자연스럽게
class Notifier:
    def __init__(self, email_sender):
        self._sender = email_sender
    def send(self, to, msg):
        self._sender.send(to, msg)
```

## 자주 보는 안티패턴

### 1. Test After

production 작성 후 테스트 추가 → 설계 압력 0. 테스트가 기존 코드 맞춤이 되어 useful regression만 잡음.

### 2. Red 무시

fail 확인 안 하고 바로 green → 테스트가 항상 통과하는 거짓 안전망. 반드시 fail 한 번 봄.

### 3. 너무 큰 첫 step

첫 테스트에서 완성 모델 요구 → 작성 막막. Starter Test는 trivial하게.

### 4. Refactor 생략

green 즉시 다음 테스트 → 중복 누적 → legacy. green마다 5분 리팩터.

### 5. Test framework 부담

설치·세팅이 프로젝트 시작 막음. 처음엔 standalone assert도 OK.

### 6. Test가 implementation 흉내

```python
def test_X():
    expected = production_function(...)
    assert production_function(...) == expected
```
production 결과를 기대값으로 사용 → 의미 없는 테스트.

## Modern variants

### Inside-out vs Outside-in TDD

| 방식 | 특징 |
| --- | --- |
| **Inside-out** (Detroit/Chicago) | 작은 단위부터 위로. 단순. |
| **Outside-in** (London) | UI/API부터 mock으로 내려옴. mock 중심. |

둘 다 test first이지만 출발점이 다름.

### BDD

```gherkin
Given an empty calculator
When I add 2 and 3
Then the result is 5
```

비기술 stakeholder가 test specification 작성 → developer가 통과시킴.

### Hypothesis-driven (property-based)

```python
@given(st.integers(), st.integers())
def test_add_commutative(a, b):
    assert add(a, b) == add(b, a)
```

example이 아닌 property를 먼저 쓰고 production이 만족.

### Acceptance Test-Driven Development (ATDD)

stakeholder와 acceptance test 합의 → 그것을 통과시키는 단위 테스트 + 코드.

### Test-driven specification (Beck → 미래)

Beck는 최근 AI 코파일럿 시대에 test가 spec이라고 강조 — LLM에게 test로 요구사항 제시.

## 도구 / IDE

| 도구 | Test First 지원 |
| --- | --- |
| IntelliJ | Run → fail 표시, 빠른 cycle |
| VS Code | Test Explorer, watch mode |
| pytest-watch | 파일 저장 즉시 재실행 |
| Jest --watch | 변경 파일만 실행 |
| Vitest UI | 시각적 cycle |
| Vim/Emacs | vim-test, projectile-test |

## 성능 고려

- Test execution 속도가 cycle 속도. 느린 테스트는 Test First 부담.
- Watch mode + 변경 파일만 실행.
- Hot test와 slow test 분리.

## 흔한 반론과 답변

| 반론 | 답변 |
| --- | --- |
| "시간이 더 걸린다" | 디버깅 시간 감소로 총 시간 비슷·적음. |
| "요구사항 바뀌면 테스트도 버린다" | 테스트가 설계 개선에 기여. 그 가치는 남음. |
| "뭘 테스트해야 할지 모르겠다" | Test List로 먼저 목록 작성. |
| "너무 작은 단위 아닌가" | 작은 단위가 디버깅 쉬움. |
| "UI는 어떻게?" | E2E는 별도 — unit은 model/logic부터. |

## 언제 Test First가 어려운가

- **탐색적 프로토타이핑**: 뭘 만들지 모를 때 — spike + 버림.
- **UI 시각 결과**: snapshot/visual regression 보조.
- **레거시 코드**: 인프라 없음 — [Pattern 11: Learning Test](/blog/programming/engineering/tdd-patterns/pattern11-learning-test) 활용.

## 관련 패턴

- [Pattern 1: Test](/blog/programming/engineering/tdd-patterns/pattern01-test) — 테스트의 정의
- [Pattern 3: Test List](/blog/programming/engineering/tdd-patterns/pattern03-test-list) — Test First의 출발점
- [Pattern 5: Assert First](/blog/programming/engineering/tdd-patterns/pattern05-assert-first) — assertion부터
- [Pattern 23: Fake It](/blog/programming/engineering/tdd-patterns/pattern23-fake-it) — green 만드는 첫 단계
- [Pattern 24: Triangulate](/blog/programming/engineering/tdd-patterns/pattern24-triangulate) — 일반화 강제
