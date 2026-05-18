---
title: "Pattern 44: Reconcile Differences"
date: 2026-07-02T20:00:00
description: "거의 동일한 두 method — 점진적으로 같게 만들어 통합. Big-bang 회피."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 44
tags: [tdd, beck, reconcile, dry]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 비슷한 두 코드를 *작은 변경으로 점점 같게* 만든 다음 *통합*. Big-bang 회피 + 매 단계 테스트 green.

## 동기 (Motivation)

거의 같지만 *미묘하게 다른* 두 method:

```python
class Dollar:
    def times(self, m): return Dollar(self.amount * m)

class Franc:
    def times(self, m): return Franc(self.amount * m)
```

*한 번에 합치기*는 위험 (테스트 깨질 위험). **Reconcile Differences**는 *작은 단계로 동일화* → *마지막에 통합*.

### 신호

- 두 method가 *80%+ 동일*.
- 차이가 *literal*이나 *type*만.
- *Big-bang* 통합 시 테스트 다수 깨짐.
- *기존 코드 진화* 중 발견.

### 언제 적용하는가

- 비슷한 코드 *통합 의도*.
- *안전한 점진적* 리팩터링 원함.
- *테스트가 풍부*해서 매 단계 검증 가능.

## 절차 (Mechanics)

1. **차이점 식별** — 어느 부분이 다른가.
2. **작은 변경**으로 *차이 줄임* — literal을 *공통화*, type을 *parameter화*.
3. *매 단계 테스트 green*.
4. **두 method가 동일**해지면 [Pull Up Method](/blog/programming/design/refactoring-catalog/pattern51-pull-up-method) 또는 [Extract Function](/blog/programming/design/refactoring-catalog/pattern01-extract-function).
5. 중복 제거.

## 예시 1 — Money times()

```python
# Step 0: 다른 두 method
class Dollar:
    def times(self, m): return Dollar(self.amount * m)

class Franc:
    def times(self, m): return Franc(self.amount * m)

# Step 1: 공통 부모 + currency
class Money:
    def __init__(self, amount, currency):
        self.amount = amount; self.currency = currency

class Dollar(Money):
    def __init__(self, amount): super().__init__(amount, "USD")
    def times(self, m): return Dollar(self.amount * m)   # 아직 Dollar

class Franc(Money):
    def __init__(self, amount): super().__init__(amount, "CHF")
    def times(self, m): return Franc(self.amount * m)

# Step 2: 반환을 Money로 통일
class Dollar(Money):
    def times(self, m): return Money(self.amount * m, self.currency)

class Franc(Money):
    def times(self, m): return Money(self.amount * m, self.currency)

# Step 3: 이제 둘이 동일 — Pull Up
class Money:
    def times(self, m): return Money(self.amount * m, self.currency)

# Dollar/Franc에서 times() 제거
```

각 단계 *작고 안전*.

## 예시 2 — Report 생성

```python
# Before
def generate_pdf(data):
    h = create_header("PDF Report")
    c = format_data(data)
    f = create_footer()
    return write_pdf(h + c + f)

def generate_html(data):
    h = create_header("HTML Report")
    c = format_data(data)
    f = create_footer()
    return write_html(h + c + f)

# Step 1: 차이 parameter화
def _generate(data, title, writer):
    h = create_header(title)
    c = format_data(data)
    f = create_footer()
    return writer(h + c + f)

def generate_pdf(data): return _generate(data, "PDF Report", write_pdf)
def generate_html(data): return _generate(data, "HTML Report", write_html)
```

## 예시 3 — Conditional 통합

```python
# Before
def process_premium(user):
    user.validate()
    user.apply_discount(0.20)
    user.send_premium_email()
    log("premium processed")

def process_regular(user):
    user.validate()
    user.apply_discount(0.10)
    user.send_email()
    log("regular processed")

# Step 1: 차이 분리
def process(user, discount_rate, send_email_fn, label):
    user.validate()
    user.apply_discount(discount_rate)
    send_email_fn(user)
    log(f"{label} processed")
```

## 자주 보는 안티패턴

### 1. *큰 단계 시도*
"한 번에 합치자" → 테스트 깨짐 + 디버깅. 작게.

### 2. *Test 없이 시도*
test 없는 reconcile → 안전망 부재. test 먼저.

### 3. *너무 작은 단계 무한*
0.01% 차이 줄이기 무한 → 진척 0. 적절한 *스텝 크기*.

### 4. *우연한 일치 강제 통합*
두 method가 *의미가 다른데* 통합 → 향후 변경 방해.

### 5. *통합 후 이름 안 고침*
`process_premium`이 이미 일반화됐는데 *이름이 specific* → 혼란.

### 6. *Refactor만 하고 test 변경*
test가 implementation 결합 → reconcile 자체가 test 깨뜨림. test가 *behavior* 검증.

## Modern variants

### Mikado method

큰 리팩터링을 *graph로 그려* 작은 단계로 분해. Reconcile의 *체계화*.

### Strangler Fig

기존 시스템 옆에 *새 구현*. 점진적 대체.

### Branch by abstraction

interface 도입 → old/new 둘 다 구현 → caller 점진적 마이그레이션.

```python
class PaymentGateway(ABC): ...
class OldGateway(PaymentGateway): ...
class NewGateway(PaymentGateway): ...

# caller 점진 이전
```

### Feature flag

```python
if feature_flag("new_algorithm"):
    new_algorithm(data)
else:
    old_algorithm(data)
```

incremental rollout.

### Parallel implementation

old와 new를 *동시 실행 + 결과 비교* (Scientist pattern).

```ruby
# GitHub Scientist gem
science "rename-method" do |e|
  e.use { old_method }
  e.try { new_method }
end
```

## 도구 / IDE

| 도구 | Reconcile 지원 |
| --- | --- |
| IntelliJ Refactor | small step 자동 |
| Resharper | 단계별 |
| git stash | 시도 보존 |
| GitHub Scientist | parallel 검증 |

## 성능 고려

추상 — 코드 변경 자체. 일반 성능 무관.

## 관련 패턴

- [Pattern 45: Isolate Change](/blog/programming/engineering/tdd-patterns/pattern45-isolate-change) — 변경 영역 격리
- [Pattern 47: Extract Method](/blog/programming/engineering/tdd-patterns/pattern47-extract-method) — 메서드 추출
- [Pattern 36: Template Method](/blog/programming/engineering/tdd-patterns/pattern36-template-method) — 골격 + 가변
- Refactoring [Pattern 51: Pull Up Method](/blog/programming/design/refactoring-catalog/pattern51-pull-up-method)
