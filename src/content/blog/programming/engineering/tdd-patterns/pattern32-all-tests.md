---
title: "Pattern 32: All Tests"
date: 2026-05-10T08:00:00
description: "모든 test를 한 번에 — 변경의 안전망, CI의 토대."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 32
tags: [xunit, all-tests, test-suite, beck]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
draft: true

---

## 한 줄 요약

> 시스템의 모든 테스트를 한 명령으로 실행 → 변경이 기존 동작을 깨뜨리지 않았는지 확인.

## 동기

코드 변경 후 — 내가 수정한 부분은 테스트했는데 다른 곳에 영향은?

```bash
pytest        # 모든 test
npm test
go test ./...
cargo test
```

**All Tests**가 변경의 안전망. Continuous Integration의 토대.

### 신호

- 변경 후 unit test만 돌림 → 다른 곳 깨짐 발견 늦음.
- 전체 실행 명령이 팀마다 다름.
- 느려서 전체 안 돌림.
- CI에서 처음 발견하는 깨짐.

### 언제 적용하는가

- commit 전 (pre-commit hook).
- push 전.
- PR 생성 + merge 전 (CI).
- deploy 전.

## Test pyramid

```text
       /\
      /  \   E2E (느림, 적음)
     /────\
    /      \  Integration (중간)
   /────────\
  /          \  Unit (빠름, 많음)
 /────────────\
```

빠른 unit은 자주, 느린 E2E는 가끔.

## 절차

1. **단일 명령**으로 모든 test 실행.
2. **분류** — unit/integration/e2e marker.
3. **CI 파이프라인** — 단계별 실행.
4. **실패 시 빠른 fail** (`-x`, `--maxfail`).
5. *전체 통과 = 안전*.

## 예시 1 — Marker 분리

```python
@pytest.mark.unit
def test_add():
    assert add(2, 3) == 5

@pytest.mark.integration
def test_database_save():
    db.save(user)
    assert db.find(user.id) is not None

@pytest.mark.e2e
def test_checkout_flow():
    # browser test
    ...
```

```bash
pytest                       # 전체
pytest -m unit               # 빠른 피드백
pytest -m "unit or integration"
pytest -m "not e2e"
```

## 예시 2 — CI 단계별

```yaml
# .github/workflows/test.yml
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - run: pytest -m unit   # 빠름, 먼저

  integration:
    needs: unit
    runs-on: ubuntu-latest
    steps:
      - run: pytest -m integration

  e2e:
    needs: integration
    runs-on: ubuntu-latest
    steps:
      - run: pytest -m e2e
```

빠른 단계 실패 시 즉시 중단 → 비싼 단계 skip.

## 예시 3 — 빠른 피드백 옵션

```bash
# 첫 실패에서 중단
pytest -x

# 처음 3개 실패 후 중단
pytest --maxfail=3

# 마지막 실패한 것만 재실행
pytest --lf

# 실패한 것 먼저, 나머지도
pytest --ff

# 병렬
pytest -n auto

# 변경 파일만 (pytest-testmon)
pytest --testmon
```

## 자주 보는 안티패턴

### 1. Unit만 돌림

변경 후 unit만 → integration 깨진 채 PR. 항상 전체 또는 명시적 해당 영역.

### 2. Slow test 누적

test suite 30분+ → 사람들이 우회. 속도 모니터.

### 3. Flaky test

가끔 fail → re-run으로 통과. 근본 원인 추적 또는 격리.

### 4. CI만 의존

local에서 안 돌리고 push 후 fail 확인. local에서 빠른 unit는 매번.

### 5. Marker 없음

분류 안 됨 → 선택 실행 불가. 처음부터 marker.

### 6. 전체 실행이 deploy 후

deploy 전 full suite 통과 보장. 실패해도 되돌릴 수 있어야.

## Modern variants

### Test selection (testmon, jest --changedSince)

```bash
pytest --testmon   # 변경된 코드 영향 받는 test만
jest --changedSince=main
```

### Mutation testing (test 품질)

```bash
mutmut run   # 코드를 mutate → test가 잡는지
```

테스트가 진짜 검증하는지.

### Coverage gate

```yaml
- run: pytest --cov=src --cov-fail-under=80
```

coverage 기준 미달 시 fail.

### Parallelism

```bash
pytest -n auto                # pytest-xdist
gotestsum --packages=./...    # Go
mocha --parallel               # JS
```

cores 활용.

### Selective branch test

```yaml
# main branch만 full E2E
if: github.ref == 'refs/heads/main'
```

PR branch는 unit, main은 full.

### Trunk-based CI

매 commit이 full pipeline 통과 → main 항상 deploy 가능하다.

### Visual regression (UI)

```bash
percy snapshot
chromatic
```

UI 변경을 시각적 diff.

## 속도 vs 빈도

| 실행 시간 | 실행 빈도 |
| --- | --- |
| < 10초 | 매 저장 |
| < 1분 | 매 commit |
| < 10분 | 매 push |
| < 30분 | PR |
| > 1시간 | nightly / weekly |

목표는 *commit 시 < 1분*.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| pytest | Python full suite |
| Jest | JS full suite |
| go test ./... | Go |
| cargo test | Rust |
| pytest-xdist | parallel |
| testmon | selective |
| coverage.py | coverage |
| mutmut, pitest | mutation testing |
| GitHub Actions, GitLab CI | CI orchestration |

## 성능 고려

- Hot test suite (자주 변경되는 영역) 빠르게 분리.
- Slow E2E 별도 schedule (nightly).
- Cache test fixture, dependency, container.
- Parallel + isolation.
- Test selection — 변경 영역만.

## 관련 패턴

- [Pattern 2: Isolated Test](/blog/programming/engineering/tdd-patterns/pattern02-isolated-test) — 테스트 독립성
- [Pattern 22: Clean Check-in](/blog/programming/engineering/tdd-patterns/pattern22-clean-check-in) — 항상 green
- [Pattern 13: Regression Test](/blog/programming/engineering/tdd-patterns/pattern13-regression-test) — 버그 방지
- [Pattern 28: Fixture](/blog/programming/engineering/tdd-patterns/pattern28-fixture) — 공통 setup
