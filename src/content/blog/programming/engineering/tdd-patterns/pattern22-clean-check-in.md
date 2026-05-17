---
title: "Pattern 22: Clean Check-in"
date: 2026-07-01T22:00:00
description: "팀 작업 끝낼 때 — 모든 test green 상태로."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 22
tags: [tdd, beck, clean-check-in, ci]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 팀 환경에서는 항상 모든 테스트가 통과한 상태로 커밋한다.

## 동기 (Motivation)

팀원이 코드를 pull 했는데 테스트가 실패한다:

```text
$ git pull
$ npm test

FAILED: 15 tests
```

누구 책임인가? 내 코드 문제인가? 원래 실패하던 건가?

**Clean Check-in**은 이 혼란을 방지한다. **커밋 시점에 모든 테스트가 green**이어야 한다.

## Clean Check-in 원칙

### 커밋 전 체크

```bash
# 반드시 이 과정을 거친 후 커밋
npm test          # 또는 pytest, go test, etc.
# 모두 GREEN이면
git commit -m "feat: add tax calculation"
```

### 실패 테스트가 있다면?

```text
선택지:
1. 테스트 수정 후 커밋
2. 구현 완료 후 커밋
3. 커밋하지 않음 (작업 계속)
4. 실패 테스트 @skip 처리 (최후의 수단)
```

## CI/CD와의 관계

```yaml
# GitHub Actions 예시
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm test  # 실패하면 PR merge 불가
```

CI가 **Clean Check-in을 강제**한다. main 브랜치는 항상 green.

## Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

npm test
if [ $? -ne 0 ]; then
    echo "Tests failed. Commit aborted."
    exit 1
fi
```

커밋 자체를 **자동으로 막는다**.

### Husky 사용 (Node.js)

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm test"
    }
  }
}
```

## Broken Test와의 관계

| 상황 | 패턴 |
|------|------|
| Solo 작업 | Broken Test 허용 |
| 팀 작업 | Clean Check-in 필수 |
| 개인 브랜치 | Broken Test OK |
| main/develop | Clean Check-in |

```text
Solo:
  feature-branch → Broken Test OK
  push to origin → 여전히 OK (개인 브랜치)

Team:
  feature-branch → Broken Test OK
  PR to main → Clean Check-in 필수
  main branch → 항상 GREEN
```

## 실패 테스트를 임시로 처리

### Skip 처리

```python
@pytest.mark.skip(reason="blocked by external API issue")
def test_external_api_integration():
    ...
```

### TODO 테스트로 변환

```python
def test_todo_implement_later():
    """추후 구현 예정"""
    pytest.skip("not implemented yet")
```

### 주의: skip 남발 금지

```python
# 나쁨 — skip이 쌓임
@pytest.mark.skip
def test_feature_a(): ...
@pytest.mark.skip
def test_feature_b(): ...
@pytest.mark.skip
def test_feature_c(): ...
# 결국 테스트 안 하는 것과 같음
```

## Trunk-Based Development

Clean Check-in은 **Trunk-Based Development**의 기반이다:

```text
main ─────●─────●─────●─────●─────●
          │     │     │     │     │
         all   all   all   all   all
        green green green green green
```

모든 커밋이 green이면:
- **언제든 배포 가능**
- **bisect로 버그 추적 가능**
- **팀 신뢰 유지**

## Git Bisect와의 연관

```bash
# 버그를 찾기 위해 git bisect
git bisect start
git bisect bad HEAD
git bisect good v1.0.0
# ...
git bisect run npm test
```

모든 커밋이 **테스트 통과 상태**여야 bisect가 의미 있다.

## 정리

- **팀 환경**에서는 항상 **모든 테스트 green 커밋**
- **CI/CD**가 이를 강제
- **pre-commit hook**으로 자동화
- **main 브랜치**는 항상 배포 가능 상태
- **Broken Test**는 개인 브랜치에서만
- **skip 남발 금지** — 테스트 부채

## 관련 패턴

- [Pattern 21: Broken Test](/blog/programming/engineering/tdd-patterns/pattern21-broken-test) — Solo 작업의 반대 원칙
- [Pattern 2: Isolated Test](/blog/programming/engineering/tdd-patterns/pattern02-isolated-test) — 테스트 독립성
- [Pattern 13: Regression Test](/blog/programming/engineering/tdd-patterns/pattern13-regression-test) — 버그 방지

