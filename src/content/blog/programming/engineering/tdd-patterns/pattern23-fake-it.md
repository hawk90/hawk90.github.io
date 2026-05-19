---
title: "Pattern 23: Fake It (Til You Make It)"
date: 2026-05-10T23:00:00
description: "Constant return부터 — 가장 빠른 green bar."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 23
tags: [tdd, beck, fake-it, green-bar]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 테스트를 통과시키기 위해 우선 상수를 반환하고, 나중에 일반화. 가장 작은 스텝으로 가장 빠른 green.

## 동기

TDD의 목표는 빠르게 green bar에 도달하는 것. 가장 빠른 방법은?

```python
def test_sum():
    assert sum([1, 2, 3]) == 6

# Fake It — 가장 빠른 green
def sum(numbers):
    return 6
```

비웃음 받을 만한 구현이지만 가장 작은 스텝. 심리적 안전 + 작은 스텝 강제.

### 신호

- 구현 방향이 불확실.
- 완벽한 구현 작성하다 막힘.
- Red bar가 길어짐.
- 어디부터 시작할지 모름.

### 언제 적용하는가

- 구현 방향 불확실.
- 복잡한 알고리즘 시작 시.
- 외부 의존성이 있을 때 (interface 먼저).
- 자신감 낮음.

### 언제 적용하지 않는가

- 구현이 명확함 → [Obvious Implementation](/blog/programming/engineering/tdd-patterns/pattern25-obvious-implementation).
- 이미 비슷한 코드 존재.
- 단순 위임 (delegation).

## 절차

1. **테스트 작성** + Red 확인.
2. **상수 반환**으로 통과 (Fake It).
3. Green 확인.
4. 두 번째 테스트 추가 → 상수로 fail → [Triangulate](/blog/programming/engineering/tdd-patterns/pattern24-triangulate)로 일반화.
5. Refactor.

## 예시 1 — 단계별 일반화

```python
# Step 1: Test
def test_plus():
    assert plus(2, 3) == 5

# Step 2: Fake (constant)
def plus(a, b):
    return 5

# Step 3: Use input (still partial fake)
def plus(a, b):
    return 2 + 3   # 테스트 데이터 사용

# Step 4: Generalize
def plus(a, b):
    return a + b
```

Fake → 부분 Fake → Real. 각 단계 안전한 green.

## 예시 2 — Collection 상수

```python
def test_get_users():
    users = get_users()
    assert len(users) == 3

# Fake — 상수 list
def get_users():
    return ["Alice", "Bob", "Charlie"]

# 두 번째 테스트 추가 후 일반화
def test_get_users_from_db():
    setup_db_with_users(["A", "B"])
    assert len(get_users()) == 2

def get_users():
    return db.query("SELECT * FROM users").fetchall()
```

## 예시 3 — Object 상수

```python
def test_create_order():
    order = create_order("user_1", 1000)
    assert order.total == 1000

# Fake
def create_order(user_id, amount):
    return Order(total=1000)

# 다음 테스트로 일반화
def test_create_order_different_amount():
    order = create_order("user_2", 2000)
    assert order.total == 2000

def create_order(user_id, amount):
    return Order(total=amount)
```

## 자주 보는 안티패턴

### 1. Fake It만 하고 끝

"테스트 통과했네" → 일반화 안 함 → production 깨짐. 항상 Triangulate 따라옴.

### 2. 너무 복잡한 Fake

if 분기 가득한 Fake → 이미 진짜 구현. 진짜 fake는 상수 한 줄.

### 3. Test가 Fake에 결합

test가 특정 값에만 의존 → fake에 과도하게 맞춤. test가 동작을 검증해야.

### 4. Fake 단계 건너뜀

명확하지도 않은데 real implementation 시도 → 막힘. fake로 시작.

### 5. Fake가 production에 commit

Fake 단계에서 PR open → reviewer 혼란. Triangulate까지 한 commit.

### 6. Fake가 부적절

constant 반환이 진짜 production의 single-case일 수도 — 그땐 진짜 implementation.

## Modern variants

### Type-driven Fake (Haskell, Rust)

```rust
fn plus(a: i32, b: i32) -> i32 {
    unimplemented!()   // type system이 strong fake
}
```

`todo!()` / `unimplemented!()` — 타입 system이 signature 검증, 본문은 fake.

### Mock library의 stub

```python
mock = Mock()
mock.return_value = "fake"
```

mock의 return_value가 Fake It의 변형.

### Property-based + Fake

```python
@given(st.integers())
def test_plus(a):
    assert plus(a, 0) == a   # identity
```

property로 강제 일반화 — fake로는 통과 불가.

### "Cucumber driven development"

acceptance test 먼저 → 점진적 step 구현. fake 단계가 자연스러움.

### "Walking skeleton"

end-to-end 최소 동작 → 모든 layer가 fake. 점진적 실화.

## Fake It 사이클

```text
Test → Red → Fake (constant) → Green
     → 두 번째 Test → Red
     → Triangulate → Generalize → Green
     → Refactor
```

작은 사이클의 반복 — 큰 도약 없이 진화.

## 도구 / IDE

| 도구 | Fake 지원 |
| --- | --- |
| Live template (IntelliJ) | `fake` snippet |
| Rust `todo!()` | 타입은 OK, panic |
| Haskell `undefined` | type check OK |
| TypeScript `never` | exhaustive switch에서 fake |

## 성능 고려

Fake 자체는 극히 빠름. cycle 속도 향상 효과. 단 Fake가 production에 남으면 functional bug.

## Beck의 조언

> "Fake it은 비웃음 받지만, 가장 실용적인 기법이다. 나도 자주 쓴다."

작은 스텝이 자신감을 만들고, 자신감이 더 큰 스텝을 가능하게.

## 관련 패턴

- [Pattern 24: Triangulate](/blog/programming/engineering/tdd-patterns/pattern24-triangulate) — Fake 후 일반화
- [Pattern 25: Obvious Implementation](/blog/programming/engineering/tdd-patterns/pattern25-obvious-implementation) — Fake 건너뛰기
- [Pattern 8: One Step Test](/blog/programming/engineering/tdd-patterns/pattern08-one-step-test) — 작은 스텝 선택
- [Pattern 9: Starter Test](/blog/programming/engineering/tdd-patterns/pattern09-starter-test) — 시작점
