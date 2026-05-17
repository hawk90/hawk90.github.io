---
title: "Pattern 16: Child Test"
date: 2026-07-01T16:00:00
description: "큰 test가 막히면 — 그 일부를 검증하는 더 작은 test로."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 16
tags: [tdd, beck, child-test, decomposition]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 현재 테스트가 너무 크면, 그 *일부를 통과시키는 더 작은 테스트(Child Test)*를 먼저 작성. 통과 후 Parent로 복귀.

## 동기 (Motivation)

테스트를 작성했는데, *통과시키려면 한 번에 너무 많은 코드*를 작성해야 한다. 막힌다.

**Child Test**가 해결:

1. 현재 큰 테스트(Parent)를 *잠시 보류* (`@skip` 또는 주석).
2. *일부를 검증하는 작은 Child Test*.
3. Child 통과.
4. Parent로 복귀.

스텝 크기를 *동적으로 조절*하는 가장 흔한 도구.

### 신호

- Parent test가 *30분+ Red*.
- 한 번에 *여러 개념* 도입 필요.
- *어디서부터 production 작성*할지 모름.
- production 변경 *수십 줄*이 한 테스트.

### 언제 적용하는가

- Parent가 *너무 큰 스텝*.
- 일부분이 *명확히 분리 가능*.
- Child를 통해 *작은 빌딩 블록* 쌓을 수 있음.

## 절차 (Mechanics)

1. **Parent test 보류** — `@pytest.mark.skip` 또는 주석.
2. **Parent 분해** — 어떤 sub-behavior가 필요?
3. **Child test 작성** — 한 sub-behavior만.
4. Child → Green.
5. *반복* — 다른 sub-behavior에 대해.
6. **Parent 재활성화** — 이제 *조립*만 남음.
7. Parent → Green.

## 예시 1 — 할인 계산

### Parent (막힘)

```python
def test_complex_discount():
    """여러 할인 조건이 복합 적용"""
    cart = Cart()
    cart.add(Item("A", 10000))
    cart.add(Item("B", 5000))
    cart.apply_coupon("SAVE10")     # 쿠폰 10%
    cart.apply_points(1000)         # 적립금 1000원
    cart.apply_membership("VIP")    # VIP 추가 5%

    # (15000 * 0.9 - 1000) * 0.95 = 11875
    assert cart.total() == 11875
```

세 할인 + cart + item을 *한 번에* 구현 → 막힘.

### Children

```python
# Child 1: 쿠폰만
def test_coupon_discount():
    cart = Cart(); cart.add(Item("A", 10000))
    cart.apply_coupon("SAVE10")
    assert cart.total() == 9000

# Child 2: 적립금만
def test_points_discount():
    cart = Cart(); cart.add(Item("A", 10000))
    cart.apply_points(1000)
    assert cart.total() == 9000

# Child 3: 멤버십만
def test_membership_discount():
    cart = Cart(); cart.add(Item("A", 10000))
    cart.apply_membership("VIP")
    assert cart.total() == 9500
```

각 Child → Green. *각 개념 분리 구현*.

### Parent 재활성화

세 building block이 준비됨 → Parent는 *조립* 코드만.

```python
def apply_all_discounts(self):
    # 순서: coupon → points → membership
    self._apply_coupon_internal()
    self._apply_points_internal()
    self._apply_membership_internal()
```

Parent → Green.

## 예시 2 — Child가 Parent 대체

때로는 Children이 *충분*해서 Parent 불필요:

```python
# 이 다섯이 있으면
def test_coupon_discount(): ...
def test_points_discount(): ...
def test_membership_discount(): ...
def test_combined_coupon_and_points(): ...
def test_combined_all_three_simple(): ...

# 복잡한 Parent 삭제 OK
# 단순 integration 정도만 유지
```

Children이 *covering*하면 Parent의 *복잡함*은 부담.

## 예시 3 — Recursive Child

Child가 *또 막히면* Child의 Child.

```python
# Parent (막힘)
def test_calculate_order_summary(): ...

# Child 1 (또 막힘)
def test_apply_taxes(): ...

# Grandchild
def test_simple_tax_calculation():
    assert calculate_tax(100, 0.10) == 10
```

*트리* 구조로 분해. 단 *깊이 3 이상*이면 *Do Over* 고려.

## 자주 보는 안티패턴

### 1. *Parent 보류 안 함*
Parent fail 그대로 + Child 시작 → CI에서 *항상 red*. *skip* 필수.

### 2. *Child가 또 너무 큼*
Child도 *작지 않음* → 또 막힘. *진짜 atomic*.

### 3. *Children이 Parent 대체 못 함*
부분 합 ≠ 전체 → Parent도 *필요*. integration test 별도.

### 4. *Parent 재활성화 잊음*
skip된 Parent가 *영원히 skip* → dead test. 주기적 검토.

### 5. *Recursive 깊이 폭증*
Child의 Child의 Child... → 미로. *Do Over* 신호.

### 6. *Sub-behavior 무관*
Child가 Parent와 *무관한 동작* 검증 → 시간 낭비. Parent에 기여하는지 확인.

## Modern variants

### Test ID로 부모-자식 관계 명시

```python
def test_complex_discount(): ...        # parent
def test_complex_discount__coupon(): ...   # child
def test_complex_discount__points(): ... # child
```

이름으로 관계 표현 (BDD `describe`/`it`도 유사).

### BDD nested describe

```javascript
describe("complex discount", () => {
  describe("coupon only", () => { it("applies 10%", ...) });
  describe("points only", () => { it("subtracts amount", ...) });
  describe("combined", () => { it("...", ...) });
});
```

자연스러운 *계층 구조*.

### Test fixtures from children

Child의 setup이 Parent에서도 사용 → DRY.

### Mob TDD ping-pong

A가 Parent → 막힘 → B가 Child 제안 → ping-pong. 자연스러운 분해.

### "Vertical slice" 분해

수평(layer)이 아닌 *수직(feature)* 분해. Child도 end-to-end의 *작은 slice*.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| pytest skip/xfail | Parent 보류 |
| JUnit @Disabled | 같음 |
| Jest describe/it | 계층 표현 |
| IntelliJ run config | 특정 test만 실행 |
| BDD frameworks (Cucumber) | 자연스러운 분해 표현 |

## 성능 고려

Child test로 *test 수 증가* → 실행 시간 ↑. 단 *fast unit*이라 보통 무관. Parent 1개 vs Children 5개 — 보통 비슷.

## 관련 패턴

- [Pattern 8: One Step Test](/blog/programming/engineering/tdd-patterns/pattern08-one-step-test) — 작은 스텝 선택
- [Pattern 9: Starter Test](/blog/programming/engineering/tdd-patterns/pattern09-starter-test) — 가장 작은 테스트로 시작
- [Pattern 15: Do Over](/blog/programming/engineering/tdd-patterns/pattern15-do-over) — 처음부터 다시
- [Pattern 4: Test First](/blog/programming/engineering/tdd-patterns/pattern04-test-first) — 사이클 유지
