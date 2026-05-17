---
title: "Pattern 32: All Tests"
date: 2026-07-02T08:00:00
description: "모든 test를 한 번에 — 변경의 안전망."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 32
tags: [xunit, all-tests, test-suite, beck]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 시스템의 모든 테스트를 한 명령으로 실행하여 변경이 기존 동작을 깨뜨리지 않았는지 확인한다.

## 동기 (Motivation)

코드를 변경했다. 내가 수정한 부분은 테스트했는데, **다른 곳에 영향**은 없을까?

```bash
# 변경 후 전체 테스트
npm test
pytest
go test ./...
```

**All Tests**는 **변경의 안전망**이다.

## Test Suite 구성

### 계층별 분리

```text
테스트 피라미드:
       /\
      /  \  E2E (느림, 적음)
     /────\
    /      \  Integration (중간)
   /────────\
  /          \  Unit (빠름, 많음)
 /────────────\
```

```python
# pytest 마커로 분리
@pytest.mark.unit
def test_add():
    assert add(2, 3) == 5

@pytest.mark.integration
def test_database_save():
    db.save(user)
    assert db.find(user.id) is not None

@pytest.mark.e2e
def test_checkout_flow():
    # 브라우저 테스트
    ...
```

### 실행 방법

```bash
# 전체
pytest

# Unit만 (빠른 피드백)
pytest -m unit

# Integration 포함
pytest -m "unit or integration"

# E2E 제외
pytest -m "not e2e"
```

## 속도가 중요

### 느린 테스트의 문제

```text
테스트 시간 vs 실행 빈도:

< 10초:  매 저장마다 실행 ✓
< 1분:   매 커밋마다 실행 ✓
< 10분:  매 push마다 실행 △
> 30분:  CI에서만 실행 ✗ (피드백 느림)
```

### 속도 개선

```python
# 병렬 실행
pytest -n auto  # pytest-xdist

# 변경된 파일 관련 테스트만
pytest --lf  # last failed
pytest --ff  # failed first

# 캐싱
pytest --cache-show
```

## CI/CD 통합

### GitHub Actions 예시

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          pip install -r requirements.txt
          pytest --cov=src --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### 단계별 실행

```yaml
jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - run: pytest -m unit  # 빠름, 먼저

  integration:
    needs: unit  # unit 통과 후
    runs-on: ubuntu-latest
    steps:
      - run: pytest -m integration

  e2e:
    needs: integration  # integration 통과 후
    runs-on: ubuntu-latest
    steps:
      - run: pytest -m e2e
```

## 테스트 조직

### 파일 구조

```text
tests/
├── unit/
│   ├── test_order.py
│   ├── test_user.py
│   └── test_payment.py
├── integration/
│   ├── test_database.py
│   └── test_api.py
└── e2e/
    └── test_checkout.py
```

### 설정 파일

```ini
# pytest.ini
[pytest]
markers =
    unit: Unit tests
    integration: Integration tests
    e2e: End-to-end tests
    slow: Slow tests
```

## 실패 시 전략

### 빠른 실패

```bash
# 첫 실패에서 중단
pytest -x

# 처음 N개 실패 후 중단
pytest --maxfail=3
```

### 실패한 테스트 재실행

```bash
# 마지막 실패한 테스트만
pytest --lf

# 실패한 것 먼저, 나머지도 실행
pytest --ff
```

## Regression 감지

```text
All Tests의 핵심 가치:

1. 코드 변경
2. 전체 테스트 실행
3. 실패? → 뭔가 깨짐 (regression)
4. 모두 통과? → 안전하게 변경됨
```

## 정리

- **한 명령**으로 모든 테스트 실행
- **변경의 안전망** — regression 감지
- **속도가 중요** — 느리면 회피하게 됨
- **계층별 분리** — unit, integration, e2e
- **CI/CD 통합** — 자동화된 검증
- **Continuous Integration**의 토대

## 관련 패턴

- [Pattern 2: Isolated Test](/blog/programming/engineering/tdd-patterns/pattern02-isolated-test) — 테스트 독립성
- [Pattern 22: Clean Check-in](/blog/programming/engineering/tdd-patterns/pattern22-clean-check-in) — 항상 green 커밋
- [Pattern 13: Regression Test](/blog/programming/engineering/tdd-patterns/pattern13-regression-test) — 버그 방지

