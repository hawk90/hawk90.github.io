---
title: "Pattern 11: Learning Test"
date: 2026-07-01T11:00:00
description: "외부 라이브러리·API 사용 전에 — 작은 test로 학습."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 11
tags: [tdd, beck, learning-test, library]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 낯선 라이브러리나 API를 사용하기 전에, 작은 테스트를 작성하여 내가 이해한 것이 맞는지 검증한다.

## 동기 (Motivation)

새로운 라이브러리를 프로젝트에 도입하려 한다. 문서를 읽었지만, 정말 내가 이해한 대로 동작할까?

**Learning Test**는 이 질문에 답한다:
- "이 API가 내 예상대로 동작하는가?"를 **테스트로 확인**
- 문서가 부족하거나 오래된 경우 **실제 동작을 검증**
- 라이브러리 **업그레이드 시 regression 탐지**

Learning Test는 프로덕션 코드가 아니라 **학습 도구**다. 하지만 그 부산물은 가치 있다.

## Learning Test 예시

### HTTP 클라이언트 학습

```python
# requests 라이브러리 학습
def test_requests_get_returns_json():
    """GET 요청이 JSON을 파싱하는지 확인"""
    response = requests.get("https://api.github.com")

    assert response.status_code == 200
    assert "current_user_url" in response.json()

def test_requests_timeout():
    """타임아웃이 예상대로 동작하는지 확인"""
    with pytest.raises(requests.Timeout):
        requests.get("https://httpbin.org/delay/5", timeout=1)
```

### 날짜 라이브러리 학습

```python
# dateutil 학습
def test_relativedelta_month_addition():
    """월 더하기가 말일을 어떻게 처리하는지"""
    jan_31 = date(2024, 1, 31)

    # 1월 31일 + 1개월 = 2월 몇 일?
    result = jan_31 + relativedelta(months=1)

    assert result == date(2024, 2, 29)  # 2024년은 윤년

def test_relativedelta_preserves_day():
    """평범한 경우 일자가 보존되는지"""
    jan_15 = date(2024, 1, 15)
    result = jan_15 + relativedelta(months=1)

    assert result == date(2024, 2, 15)
```

### ORM 학습

```python
# SQLAlchemy 학습
def test_sqlalchemy_lazy_loading():
    """관계가 언제 로드되는지 확인"""
    session = Session()
    user = session.query(User).first()

    # 아직 posts 쿼리 안 함
    assert "posts" not in inspect(user).loaded

    # posts 접근 시 쿼리 발생
    _ = user.posts

    assert "posts" in inspect(user).loaded
```

## Learning Test의 부산물

### 1. 사용 예제로 남는다

Learning Test는 "이 라이브러리를 이렇게 쓰면 된다"는 **실행 가능한 문서**가 된다.

```python
# 팀원이 requests 사용법을 물으면
# "test_requests.py 봐" 라고 말할 수 있다
```

### 2. 업그레이드 안내자

라이브러리 버전을 올릴 때:

```bash
$ pip install requests==3.0
$ pytest test_requests.py

FAILED test_requests_timeout
# 타임아웃 동작이 바뀌었구나!
```

Breaking change를 **테스트가 알려준다**.

### 3. 문서 부족 보완

문서가 부실한 라이브러리일수록 Learning Test가 더 가치 있다:

```python
# 문서에 없는 edge case 발견
def test_undocumented_behavior():
    """빈 리스트를 넘기면 어떻게 되지?"""
    result = mysterious_lib.process([])

    # 문서에 없지만, 빈 딕셔너리를 반환하는구나
    assert result == {}
```

## 언제 Learning Test를 쓸까

| 상황 | Learning Test 필요성 |
|------|---------------------|
| 처음 쓰는 라이브러리 | 높음 |
| 문서가 부실한 라이브러리 | 매우 높음 |
| 복잡한 API | 높음 |
| 단순한 유틸리티 | 낮음 |
| 버전 업그레이드 예정 | 높음 |

## Learning Test vs 프로덕션 테스트

| Learning Test | 프로덕션 테스트 |
|--------------|----------------|
| 외부 라이브러리 학습 | 내 코드 검증 |
| 실험적, 탐색적 | 목적 지향적 |
| 삭제해도 됨 | 유지보수 필수 |
| 외부 API 호출 OK | 보통 mock 사용 |

## 정리

- 낯선 라이브러리를 **테스트로 학습**한다
- 내 이해가 맞는지 **코드로 검증**
- **사용 예제**와 **업그레이드 안내자**로 남는다
- 문서가 부족할수록 **더 가치 있다**
- 프로덕션 테스트와는 **목적이 다르다**

## 관련 패턴

- [Pattern 1: Test](/blog/programming/engineering/tdd-patterns/pattern01-test) — 테스트의 기본
- [Pattern 13: Regression Test](/blog/programming/engineering/tdd-patterns/pattern13-regression-test) — 회귀 방지
- [Pattern 10: Explanation Test](/blog/programming/engineering/tdd-patterns/pattern10-explanation-test) — 학습과 설명의 연결
