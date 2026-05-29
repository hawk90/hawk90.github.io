---
title: "Pattern 11: Learning Test"
date: 2026-05-10T11:00:00
description: "외부 라이브러리·API를 사용하기 전에 — 작은 테스트로 학습하고 안전망 확보."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 11
tags: [tdd, beck, learning-test, library]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
draft: true

---

## 한 줄 요약

> 낯선 라이브러리/API를 사용 전 작은 테스트로 학습. 내 이해가 맞는지 검증 + 업그레이드 안내자 부수효과.

## 동기

새 라이브러리 도입 시 — 문서를 읽었지만 정말 이해한 대로 동작할까?

Learning Test가 답:

- "이 API가 내 예상대로 동작?"를 테스트로 확인.
- 문서가 부실/오래된 경우 실제 동작 검증.
- 라이브러리 업그레이드 시 regression 탐지.

Learning Test는 production 검증이 아니라 학습 도구. 그러나 부산물이 가치.

### 신호

- 새 라이브러리 사용 전 예제 코드만 시도해봄.
- 라이브러리 업그레이드 후 production에서 깨짐.
- 문서가 *부실/오래됨*.
- 동료가 같은 라이브러리에 같은 질문 반복.

### 언제 적용하는가

| 상황 | Learning Test 필요성 |
| --- | --- |
| 처음 쓰는 라이브러리 | 높음 |
| 문서 부실 라이브러리 | 매우 높음 |
| 복잡한 API | 높음 |
| 단순 utility | 낮음 |
| 버전 업그레이드 예정 | 높음 |
| Cross-platform 동작 | 높음 |

## 절차

1. 학습할 API 식별.
2. 예상 동작 가정 형성 ("이렇게 호출하면 이걸 반환").
3. **테스트 작성** — `assert library.foo() == expected`.
4. 실행 → 내 예상과 일치 여부 확인.
5. 불일치면 문서 재확인 + 가설 수정.
6. 통과하면 test를 git에 commit — 업그레이드 안내용.

## 예시 1 — HTTP 클라이언트

```python
# requests 라이브러리 학습
def test_requests_get_returns_json():
    response = requests.get("https://api.github.com")
    assert response.status_code == 200
    assert "current_user_url" in response.json()

def test_requests_timeout_raises():
    with pytest.raises(requests.Timeout):
        requests.get("https://httpbin.org/delay/5", timeout=1)
```

GitHub API/httpbin이 실제 응답 — 내 코드가 그것에 맞춰 작성 됨을 확인.

## 예시 2 — 날짜 라이브러리

```python
def test_relativedelta_month_addition():
    """1월 31일 + 1개월?"""
    jan_31 = date(2024, 1, 31)
    result = jan_31 + relativedelta(months=1)
    assert result == date(2024, 2, 29)   # 윤년 2월 마지막

def test_relativedelta_preserves_day():
    jan_15 = date(2024, 1, 15)
    assert jan_15 + relativedelta(months=1) == date(2024, 2, 15)
```

월 더하기의 edge case 동작을 내 코드에 의존하기 전에 확인.

## 예시 3 — ORM lazy loading

```python
def test_sqlalchemy_lazy_loading():
    session = Session()
    user = session.query(User).first()
    assert "posts" not in inspect(user).loaded   # 아직 안 로드
    _ = user.posts                                # 접근하면
    assert "posts" in inspect(user).loaded       # 로드 발생
```

ORM의 동작 시점을 명시 — N+1 query 같은 함정 방지.

## 자주 보는 안티패턴

### 1. Production test와 혼동

Learning test가 production CI에 포함 → 외부 API down 시 false failure. 별도 marker (`@pytest.mark.learning`)로 분리.

### 2. Network 의존 test 남발

모든 learning test가 external API → 느리고 flaky. recorded response (VCR, betamax).

### 3. 영원히 삭제 안 함

초기 학습 끝나면 일부는 제거 OK. 가치 있는 것만 문서 + regression로 유지.

### 4. API rate limit 무시

GitHub/Twitter API 등 rate limit — 매 test마다 호출 누적. cache 또는 mock.

### 5. Mock으로 channel 우회

"외부 호출 mock" → learning이 안 됨. learning test는 진짜 호출.

### 6. 학습 안 되는 test

의미 없는 assertion (`assert True`) — 학습 가설을 명시해야.

## Modern variants

### Recorded API responses

```python
# VCR.py
@vcr.use_cassette("github_api.yaml")
def test_github_api():
    r = requests.get("https://api.github.com")
    assert r.status_code == 200
```

첫 호출 녹화, 이후 재생. 학습은 진짜 + 이후는 빠름.

### Contract testing

Pact, Spring Cloud Contract — consumer-driven contracts. 학습 + 합의가 코드 + 문서.

### Property-based exploratory

```python
@given(st.integers())
def test_lib_property(n):
    result = library.process(n)
    assert isinstance(result, int)
```

수많은 입력으로 동작 탐색.

### Codecov of library usage

```bash
coverage report --include="*site-packages/library/*"
```

내 코드가 라이브러리의 어느 부분을 쓰는지 — 업그레이드 영향 평가.

### "Walking skeleton" + learning

walking skeleton 단계에 learning test를 함께 — 실제 라이브러리 통합까지 한 번에.

### Bumping dependencies

dependabot 등이 PR 생성 → learning test가 CI에서 자동 검증 → 안전 업그레이드.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| VCR.py / vcr (Ruby) | HTTP 녹화/재생 |
| betamax (Python) | HTTP fixture |
| Polly.JS | JS HTTP 녹화 |
| Pact | consumer-driven contract |
| Hypothesis | exploratory property test |
| pytest-recording | pytest용 VCR |

## 성능 고려

- 외부 호출은 느리고 불안정. recording 권장.
- Learning test는 production CI에서 분리 — 별도 schedule (nightly).
- Caching 적극 활용.

## Learning Test vs 프로덕션 테스트

| Learning Test | 프로덕션 테스트 |
| --- | --- |
| 외부 lib 학습 | 내 코드 검증 |
| 실험적·탐색적 | 목적 지향 |
| 삭제해도 됨 | 유지 필수 |
| 외부 API 호출 OK | 보통 mock |
| flaky 허용 | flaky 금지 |

## 관련 패턴

- [Pattern 1: Test](/blog/programming/engineering/tdd-patterns/pattern01-test) — 테스트의 기본
- [Pattern 13: Regression Test](/blog/programming/engineering/tdd-patterns/pattern13-regression-test) — 회귀 방지
- [Pattern 10: Explanation Test](/blog/programming/engineering/tdd-patterns/pattern10-explanation-test) — 학습과 설명
- [Pattern 17: Mock Object](/blog/programming/engineering/tdd-patterns/pattern17-mock-object) — production에서 외부 의존 격리
