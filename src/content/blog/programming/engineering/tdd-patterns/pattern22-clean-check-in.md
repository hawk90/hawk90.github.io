---
title: "Pattern 22: Clean Check-in"
date: 2026-05-10T22:00:00
description: "팀 작업 끝낼 때 — 모든 test green 상태로 커밋. Trunk-based의 기반."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 22
tags: [tdd, beck, clean-check-in, ci]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 팀 환경에서는 *모든 테스트 green 상태*로 커밋. main branch가 *언제든 배포 가능*.

## 동기 (Motivation)

팀원이 `git pull` → 테스트 실패:

```text
$ npm test
FAILED: 15 tests
```

내 책임? 원래 깨졌나? *혼란*.

**Clean Check-in**: *커밋 시점에 모든 테스트가 green*. main이 *항상 deploy-ready*.

### 신호

- main에서 *주기적 broken*.
- 팀원이 *어제 동작하던 게 안 됨* 빈번.
- *bisect*가 의미 없음 (여러 commit이 broken).
- *deploy 두려움* — 무엇이 깨졌는지 모름.

### 언제 적용하는가

- *팀 환경* 모든 경우.
- main/develop branch.
- *PR merge 직전*.

### 언제 예외인가

- *개인 branch* (push 가능, 그러나 PR 시 clean).
- *spike branch* (실험, 곧 삭제).
- *WIP*는 *개인적*으로만.

## 절차 (Mechanics)

1. **변경 작성**.
2. **로컬 테스트 실행** — *모두 green* 확인.
3. *fail이 있으면* 둘 중 하나:
   - 수정 후 commit.
   - 작업 계속, commit 미루기.
4. **Pre-commit hook**으로 *자동 검증*.
5. **CI**가 *추가 검증* (다른 환경, 더 많은 테스트).
6. PR review + merge.

## 예시 1 — Pre-commit hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

npm test
if [ $? -ne 0 ]; then
    echo "Tests failed. Commit aborted."
    exit 1
fi
```

커밋 자체를 *자동 차단*.

### Husky (Node.js)

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test"
    }
  }
}
```

### Lefthook

```yaml
pre-commit:
  commands:
    test:
      run: pytest --maxfail=1
```

## 예시 2 — CI workflow

```yaml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm test

  branch-protection:
    # main에 push는 PR 통과한 것만
```

main *branch protection*으로 *direct push 차단*.

## 예시 3 — Skip vs Fail

```python
# 일시적 외부 의존성 문제
@pytest.mark.skip(reason="blocked by external API issue, ticket #456")
def test_external_api_integration():
    ...

# 구현 안 한 기능 (broken test 대신)
def test_todo_implement_later():
    pytest.skip("not implemented yet — ticket #789")
```

*skip*은 *임시 우회*. ticket 링크 + 정기 검토.

## 자주 보는 안티패턴

### 1. *--no-verify 사용*
```bash
git commit --no-verify   # hook 우회
```
*절대 금지*. 정당한 이유 없으면.

### 2. *Skip 남발*
```python
@pytest.mark.skip
def test_a(): ...
@pytest.mark.skip
def test_b(): ...
# 결국 안 돌리는 것
```
*테스트 부채* 누적. 주기적 정리.

### 3. *Flaky test 무시*
"가끔 실패" → re-run으로 통과 → *근본 원인 추적 안 함*. 원인 fix 또는 격리.

### 4. *Local만 green, CI red*
환경 차이 (timezone, locale, OS). *CI에서도 통과* 확인.

### 5. *Pre-commit이 너무 느림*
30초+ → developer가 *우회*. 빠른 *unit*만 hook, *slow integration*은 CI.

### 6. *팀 합의 없음*
한 사람만 dirty commit → *문화 부재*. 팀 헌장에 명시.

## Modern variants

### Trunk-Based Development

main에 *모두 직접 commit*. feature branch *없음*. clean check-in이 *생명선*.

### Continuous Integration (true CI)

매 commit 마다 *15분 이내* 통과 확인. *통합 빈도 ↑*.

### Trunk + feature flag

```python
# main에 머지하되 기능은 flag로 비활성
if feature_flag("new_payment_flow"):
    new_payment(...)
else:
    old_payment(...)
```

incomplete 기능도 *main에 commit 가능* (clean).

### Branch by abstraction

interface로 분리 → 점진적 구현. *main이 항상 green* 유지.

### Mob/Pair programming

여러 명이 *동시 작성* → 자연스러운 *clean*. broken 위험 ↓.

### CI 가속화

```bash
# Selective test
pytest --changed   # 변경된 file만
# Parallel
pytest -n auto
# Cache
pytest --cache-clear
```

빠른 CI → *clean 강제* 부담 ↓.

### Mutation testing

```bash
mutmut run
```

테스트 *품질* 자체를 검증 — clean이 *진짜 green*인지.

## Broken Test vs Clean Check-in

| Solo / 개인 branch | 팀 / shared branch |
| --- | --- |
| Broken Test 허용 | Clean Check-in 필수 |
| 작업 흐름 우선 | 팀 신뢰 우선 |
| Local commit | PR / merge |

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| Husky | git hook 관리 |
| Lefthook | Go 기반 hook |
| pre-commit (Python) | 다양한 lint+test hook |
| GitHub Actions | CI |
| GitLab CI | CI |
| Branch protection | direct push 차단 |
| CodeRabbit / Coderabbit AI | AI PR review |

## 성능 고려

- Pre-commit이 *너무 느리면* 우회 유혹. *<10s 권장*.
- CI는 *<10min* 권장. 더 길면 *PR 회피*.
- *Caching* (test result, dependency) 적극.
- Slow integration test는 *nightly*로 분리.

## 관련 패턴

- [Pattern 21: Broken Test](/blog/programming/engineering/tdd-patterns/pattern21-broken-test) — Solo의 반대 원칙
- [Pattern 2: Isolated Test](/blog/programming/engineering/tdd-patterns/pattern02-isolated-test) — flaky 방지
- [Pattern 13: Regression Test](/blog/programming/engineering/tdd-patterns/pattern13-regression-test) — 버그 방지
- [Pattern 32: All Tests](/blog/programming/engineering/tdd-patterns/pattern32-all-tests) — 전체 실행
