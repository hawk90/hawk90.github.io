---
title: "Pattern 12: Another Test"
date: 2026-05-10T12:00:00
description: "Tangent 아이디어 — test list에 추가하고 현재 작업 유지. Squirrel Effect 회피."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 12
tags: [tdd, beck, another-test, focus]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 새 아이디어가 떠오르면 현재 작업 멈추지 않고 테스트 목록에 적기만 한다. 현재 사이클 완수 후 다음으로.

## 동기

테스트 작성 중 갑자기 "아, 이 경우도 해야 하는데..."가 떠오른다. 즉시 새 테스트로 가면:

- 현재 흐름이 끊김.
- 새 테스트가 막히면 두 작업 모두 미완성.
- 집중력 분산으로 실수 ↑.

**Another Test**의 규율:

- 새 아이디어 → 테스트 목록에 적기만.
- 현재 Red-Green-Refactor 사이클 완수.
- 다음에 목록에서 선택.

### Squirrel Effect

```text
현재 작업: test_add_single_item

생각: "아, 할인 쿠폰도 테스트해야지"
  → 할인 쿠폰 시작
  → "쿠폰 만료일도?"
    → 만료일 테스트 시작
    → "만료일 계산 복잡하네..."
      → DateUtil 클래스 추출
      → ...

결과: 세 작업 모두 미완성, 두 시간 지남
```

"다람쥐 효과" — 새 자극에 계속 방향 전환.

### 신호

- 작업 시작 후 완성 비율 낮음.
- 여러 반쯤 한 변경이 코드에 산재.
- git status에 무관한 파일 가득.
- 세션 끝나도 commit 못 함.

## 절차

1. 작업 중 떠오른 아이디어 인식.
2. 현재 사이클 멈추지 않음.
3. **즉시 메모** — Test List, TODO 주석, sticky note.
4. **현재 사이클 완수** (Green + Refactor).
5. 그 다음 메모 검토 → 다음 작업 선택.

## 예시 1 — 테스트 목록에 추가

**Test List:**

- [x] 빈 장바구니
- [x] 상품 1개 추가 ← 방금 완료
- [ ] 상품 2개 추가
- [ ] 할인 쿠폰 적용 ← 떠오른 아이디어
- [ ] 재고 초과 시 에러

메모리 부담 0 — 목록이 기억해 줌.

## 예시 2 — TODO 주석

```python
def test_add_single_item():
    cart = Cart()
    cart.add(Item("A", 1000))
    assert cart.total() == 1000

# TODO: test multiple items
# TODO: test discount coupon
# TODO: test out-of-stock error
```

IDE의 TODO panel이 수집·검색.

## 예시 3 — 빈 테스트 함수 (Pending)

```python
def test_apply_discount_coupon():
    """할인 쿠폰 적용"""
    pytest.skip("TODO")

def test_stock_limit():
    """재고 초과 시 에러"""
    pytest.skip("TODO")
```

skip된 테스트가 목록 역할 + IDE에서 yellow 상태로 가시.

## 언제 현재 작업을 멈춰도 되는가

예외:

1. **현재 테스트가 근본적으로 잘못됨** — 다른 방향이 옳음.
2. **블로킹 버그** — 다른 테스트 진행 불가.
3. **설계 결함이 명확** — 지금 고치는 게 더 빠름.

대부분의 "이것도 해야 하는데"는 나중에 해도 된다.

## 자주 보는 안티패턴

### 1. Squirrel-driven development

모든 아이디어 즉시 추적 → 진척 0. 강한 규율.

### 2. Pending 영원히 남음

`pytest.skip("TODO")`가 2년 동안 skip → dead test. 주기적 정리.

### 3. Memo 잃어버림

포스트잇이 떨어짐, 메모 앱 못 찾음. git committed 위치.

### 4. 작업 중 commit 안 함

"끝나면 commit" → 30개 변경 미커밋. 작은 단위로 commit.

### 5. Tangent에 깊이 빠짐

"잠깐만 보자" → 두 시간. 5분 룰.

### 6. 다른 PR로 빠짐

새 아이디어로 다른 branch 만들기. context switch 비용 큼.

## Modern variants

### Git WIP commit

```bash
git add . && git commit -m "WIP: notes for X"
```

미완 작업도 commit으로 보존. 새 아이디어는 new branch에 stash.

### Project tracker (Linear, GitHub Issues)

idea → issue 생성 → backlog. 팀과 가시화.

### IDE TODO comment panel

IntelliJ, VS Code의 TODO 자동 수집. visible 상태.

### Pomodoro

25분 집중 — 중간 interruption 차단. 끝나면 메모 review.

### Kanban WIP limit

진행 중인 작업 수 제한 (보통 1-3). 자동으로 another test 적용.

### "Inbox" pattern (GTD)

새 아이디어 모두 inbox에 — 나중에 분류 + 처리. 머릿속 비우기.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| IntelliJ / VS Code | TODO panel |
| GitHub Issues / Linear | task 백로그 |
| Markdown checklist | 텍스트 목록 |
| Pomodoro timer | interruption 시간 제한 |
| git stash | 임시 보관 |

## 성능 고려

추상 — 코드 성능 무관. 생산성에 큰 영향. focus가 throughput.

## 관련 패턴

- [Pattern 3: Test List](/blog/programming/engineering/tdd-patterns/pattern03-test-list) — 목록 관리
- [Pattern 8: One Step Test](/blog/programming/engineering/tdd-patterns/pattern08-one-step-test) — 다음 테스트 선택
- [Pattern 4: Test First](/blog/programming/engineering/tdd-patterns/pattern04-test-first) — 현재 사이클 완수
- [Pattern 14: Break](/blog/programming/engineering/tdd-patterns/pattern14-break) — 막혔을 때 잠시 쉬기
