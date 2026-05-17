---
title: "Pattern 3: Test List"
date: 2026-07-01T03:00:00
description: "코드 작성 전에 — 어떤 테스트를 쓸지 목록부터. 작업 메모리의 외부화."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 3
tags: [tdd, beck, test-list, planning]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 코드 작성 전에 *"어떤 테스트를 쓸지"*를 목록으로. 머릿속 부담을 *외부*로 옮겨 집중·진행률·재개를 돕는다.

## 동기 (Motivation)

머릿속에 *모든 테스트 케이스*를 담고 있으면 코드 작성 중 *"이 경우도 테스트해야 하는데..."*가 떠오른다. 그 순간 *작업 중단*. 집중이 깨진다.

테스트 목록(Test List)이 해결:

- 머릿속 아이디어를 *외부에 기록*.
- 현재 작업에 *집중*.
- *진행 상황 시각화*.
- 중단 후 *복귀가 쉬움*.

Beck은 이것을 *"working memory의 외부화"*라 부른다. 뇌는 *테스트 목록을 기억*하는 데 쓰지 말고 *코드 작성*에 쓰자.

### 신호

- 작업 중 *"아 그것도..."* 가 자꾸 떠오름.
- 케이스 *기억 못 해* 빠뜨림.
- 회의·점심 후 *어디까지 했는지* 모름.
- *Scope creep* — 처음 의도보다 작업이 넓어짐.

### 어디에 작성하나

| 매체 | 장점 | 단점 |
| --- | --- | --- |
| 코드 주석 (TODO) | IDE 통합, 코드 옆 | 길어지면 잡음 |
| 별도 .md 파일 | 정리·검색 쉬움 | 코드와 분리 |
| GitHub Issue | 협업, 추적 | 외부 시스템 의존 |
| 화이트보드 | 시각적 | 비동기·기록 |
| Notion/노트 앱 | 풍부한 포맷 | 컨텍스트 스위칭 |

핵심: *눈에 보이는 곳*.

## 절차 (Mechanics)

1. **Brain dump** — 기능 구현 전, 떠오르는 *모든 테스트 케이스* 적기.
2. **우선순위 정하기** — 가장 단순·확실·중요한 것부터.
3. **현재 작업 표시** — 한 번에 하나만 진행.
4. **완료 체크 + 새 케이스 추가**.
5. **작업 종료 시 미완 목록 보존** — 다음 세션에서 재개.

## 예시 1 — 장바구니 기능

```text
Test List — ShoppingCart
[ ] 빈 장바구니의 총액은 0
[ ] 상품 1개 추가 후 총액
[ ] 같은 상품 2개 추가 후 총액
[ ] 다른 상품 2개 추가 후 총액
[ ] 할인 쿠폰 적용
[ ] 존재하지 않는 상품 추가 시 에러
[ ] 재고보다 많이 추가 시 에러
```

완벽할 필요 없음. *떠오르는 대로*.

## 예시 2 — 진행하며 업데이트

```text
[x] 빈 장바구니의 총액은 0         ← 완료
[x] 상품 1개 추가 후 총액           ← 완료
[ ] 같은 상품 2개 추가 후 총액      ← 현재 작업 중
[ ] 다른 상품 2개 추가 후 총액
[ ] 할인 쿠폰 적용
[ ] 존재하지 않는 상품 추가 시 에러
[ ] 재고보다 많이 추가 시 에러
[ ] 음수 수량 추가 시 에러          ← 새로 발견!
[ ] 동시 수정 시 동작              ← 새로 발견!
```

새 케이스 발견 시 *즉시 추가*. 지금 작업 *중단하지 않음*.

## 예시 3 — Beck의 Money 예제

```text
Test List — Money
[ ] $5 + 10 CHF = $10 (환율 2:1)
[ ] $5 * 2 = $10
[x] amount를 private으로
[ ] Dollar 부작용 제거
[ ] Money 반올림
[ ] equals()
[ ] hashCode()
[ ] null과 비교
[ ] 다른 객체와 비교
```

Beck의 *TDD by Example* 1부 Money 예제의 출발점. *작업하면서 항상 보임*.

## 자주 보는 안티패턴

### 1. *목록 안 만들고 시작*
"그냥 짜면서 생각하지" → *발견된 케이스 잊음* → bug.

### 2. *완벽한 목록 만들기*
시작 전 *모든 케이스 다 적기*에 매달림 → 코드 시작 *지연*. *brain dump*면 충분.

### 3. *목록을 영원히 유지*
완료된 항목까지 *영원히 남음* → 목록 *복잡*. 적절히 archive.

### 4. *코드 안 적고 메모에만*
메모 앱에 적고 *코드 옆에 안 봄* → 잊음. *시야*에 두기.

### 5. *너무 큰 항목*
"인증 시스템 전체" 같은 거대 항목 — *진행 안 됨*. *작게 분할*.

### 6. *순서 무시*
*가장 어려운 것 먼저* → 막힘. *Starter Test* (가장 단순한 것)부터.

## Modern variants

### TODO comment + IDE TODO panel

```python
# TODO: empty cart
# TODO: single item
# TODO: discount
```

IntelliJ/VS Code의 *TODO panel*이 자동 수집.

### Markdown file

```markdown
# Test List

## Done
- [x] empty cart returns 0

## Doing
- [ ] single item

## Todo
- [ ] discount
- [ ] error cases
```

git에 commit → *팀 가시화*.

### GitHub Issues + checklist

```markdown
## Cart implementation tests
- [x] empty cart
- [ ] single item
- [ ] discount
```

GitHub UI에서 *체크 가능 + progress %*.

### Specification by Example (Cucumber)

각 시나리오를 *Gherkin*으로:

```gherkin
Scenario: Empty cart total
  Given an empty cart
  Then total is 0

Scenario: Single item total
  Given an empty cart
  When I add an apple costing 100
  Then total is 100
```

자동화 가능한 *living document*.

### Test class 자체를 list로

```python
class TestShoppingCart:
    def test_empty_cart_returns_zero(self): pass
    def test_single_item(self): pass
    def test_discount_applied(self): pass
    def test_invalid_product_error(self): pass
```

*test method 이름*이 곧 *test list 항목*. pending 표시는 `@pytest.mark.skip`.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ / VS Code | TODO panel — comment 기반 |
| GitHub Projects | Kanban 추적 |
| Notion / Obsidian | rich note + checklist |
| Markdown 파일 | git commit으로 가시화 |
| pytest `--collect-only` | 정의된 test 목록 출력 |

## 성능 고려

추상적 패턴 — 코드 성능과 무관. *작업 효율*에 미치는 영향은 큼.

## 관련 패턴

- [Pattern 4: Test First](/blog/programming/engineering/tdd-patterns/pattern04-test-first) — 목록에서 하나 골라 테스트 먼저
- [Pattern 8: One Step Test](/blog/programming/engineering/tdd-patterns/pattern08-one-step-test) — 다음 테스트 선택 기준
- [Pattern 9: Starter Test](/blog/programming/engineering/tdd-patterns/pattern09-starter-test) — 첫 번째 테스트 선택
- [Pattern 12: Another Test](/blog/programming/engineering/tdd-patterns/pattern12-another-test) — 새 케이스 발견 시 추가
