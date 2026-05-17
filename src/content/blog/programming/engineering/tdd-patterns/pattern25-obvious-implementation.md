---
title: "Pattern 25: Obvious Implementation"
date: 2026-07-02T01:00:00
description: "구현이 명확하면 — 바로 진짜 구현. 가장 큰 스텝."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 25
tags: [tdd, beck, obvious-implementation]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 구현이 *명확하고 자신 있으면* Fake It/Triangulate 없이 *바로 진짜 구현*. 가장 큰 스텝.

## 동기 (Motivation)

모든 것을 Fake It으로 시작할 필요 없다. *구현이 뻔할 때*가 있다.

```python
def test_double():
    assert double(5) == 10

# Fake It?
def double(n):
    return 10   # 이게 필요?

# Obvious Implementation
def double(n):
    return n * 2   # 바로 진짜
```

### 3가지 구현 전략

| 전략 | 스텝 크기 | 언제 |
| --- | --- | --- |
| [Fake It](/blog/programming/engineering/tdd-patterns/pattern23-fake-it) | 최소 | 불확실 |
| [Triangulate](/blog/programming/engineering/tdd-patterns/pattern24-triangulate) | 중간 | 패턴 탐색 |
| Obvious Implementation | 최대 | 명확 |

### 신호

- 구현이 *머릿속에 명확*.
- 비슷한 코드 *경험* 많음.
- 단순 *위임/wrapping*.
- 표준 *라이브러리 호출*.

### 언제 적용하는가

- *구현이 자명*.
- 도메인 *익숙*.
- 단순 getter/setter.
- *표준 알고리즘* 호출.

### 언제 적용하지 않는가

- 알고리즘 *복잡*.
- *확신 없음*.
- *실패 경험* 있는 유사 코드.
- 처음 다루는 도메인.

## 절차 (Mechanics)

1. **테스트 작성** → Red.
2. **자신 평가** — 명확한가?
3. **진짜 구현 작성**.
4. Green 확인.
5. *실패 시 후퇴* — Fake It 또는 Triangulate.
6. Refactor.

## 예시 1 — 단순 연산

```python
def test_add():
    assert add(2, 3) == 5

def add(a, b):
    return a + b   # 너무 명확
```

## 예시 2 — 위임 (delegation)

```python
def test_user_name():
    user = User(name="Alice")
    assert user.get_name() == "Alice"

class User:
    def __init__(self, name):
        self._name = name
    def get_name(self):
        return self._name   # 단순 위임
```

## 예시 3 — 표준 라이브러리

```python
def test_sort():
    assert sort([3, 1, 2]) == [1, 2, 3]

def sort(items):
    return sorted(items)   # built-in
```

## 자주 보는 안티패턴

### 1. *과신*
"이 정도는 바로 되지" → 200줄 한 번에 → 실패 후 *디버깅 지옥*. 후퇴.

### 2. *후퇴 거부*
Obvious 시도 실패 → "조금만 더..." → 시간 낭비. *5분 룰* + 후퇴.

### 3. *Fake도 안 통하는데 시도*
구현이 *50줄+*인데 Obvious — 거의 항상 실패. *분해 먼저*.

### 4. *Type system 의존*
타입 OK라고 *동작 OK 아님*. 테스트 실행 필수.

### 5. *Edge case 무시*
"이건 명확" → null/empty/boundary 빠짐. 테스트가 *드러내야*.

### 6. *Documentation 안 봄*
표준 라이브러리 *호출 시 가정*만 — 실제 동작 다름. [Learning Test](/blog/programming/engineering/tdd-patterns/pattern11-learning-test) 보완.

## Modern variants

### Type-driven (Haskell, Rust)

```rust
fn double(n: i32) -> i32 { n * 2 }
```

타입 system이 *signature 확인* + 단순 본문은 *type checker가 검증*.

### AI pair / Copilot

LLM이 *boilerplate 즉시 제공* — obvious implementation의 *기계 보조*.

### Snippet / Template

IDE의 *template*으로 *standard pattern* 즉시 생성. boilerplate obvious.

### "Mikado method"

큰 변경 시 *그래프로 그려* obvious 단계 식별.

### Property-based + Obvious

```python
def double(n): return n * 2

@given(st.integers())
def test_property(n):
    assert double(n) == n + n   # property로 정확성 검증
```

Obvious 구현이 *property로 강제 검증*.

## 자신감의 척도

| 수준 | Fake | Triangulate | Obvious |
| --- | --- | --- | --- |
| 초보자 | 80% | 15% | 5% |
| 숙련자 | 30% | 30% | 40% |
| 도메인 전문가 | 10% | 20% | 70% |

Obvious 사용 빈도가 *경험·자신감 지표*.

## 후퇴는 전략

```python
# 시도: Obvious
def roman_to_int(s):
    # 복잡해서 한 번에 안 됨...
    # 테스트 실패

# 후퇴: Fake
def roman_to_int(s):
    return 14   # green

# 후퇴: Triangulate
def test_roman_i(): assert roman_to_int("I") == 1
def test_roman_v(): assert roman_to_int("V") == 5
# ... 점진적
```

후퇴는 *실패 아님* — *전략 변경*.

## Beck의 조언

> "나도 Obvious Implementation을 시도한다. 실패하면 Fake It으로 돌아간다. 부끄러운 일이 아니다."

*용기 있는 시도 + 빠른 후퇴*가 균형.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| Live template / Snippet | boilerplate 즉시 |
| IntelliJ / Rider auto-complete | 패턴 자동 |
| GitHub Copilot | LLM 보조 |
| Vim ultisnips | snippet |

## 성능 고려

추상 — 코드 성능 무관. *개발 속도*에 큰 영향. Obvious 활용도 높을수록 *throughput ↑*. 단 *과신*은 *역효과*.

## 관련 패턴

- [Pattern 23: Fake It](/blog/programming/engineering/tdd-patterns/pattern23-fake-it) — 작은 스텝
- [Pattern 24: Triangulate](/blog/programming/engineering/tdd-patterns/pattern24-triangulate) — 중간 스텝
- [Pattern 8: One Step Test](/blog/programming/engineering/tdd-patterns/pattern08-one-step-test) — 스텝 크기 선택
- [Pattern 15: Do Over](/blog/programming/engineering/tdd-patterns/pattern15-do-over) — 후퇴 시 처음부터
