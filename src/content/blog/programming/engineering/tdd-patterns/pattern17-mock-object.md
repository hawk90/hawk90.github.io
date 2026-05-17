---
title: "Pattern 17: Mock Object"
date: 2026-07-01T17:00:00
description: "비싸거나 어려운 collaborator — mock으로 대체."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 17
tags: [tdd, beck, mock-object, test-double]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 실제 객체가 테스트하기 어려울 때(비싸거나, 느리거나, 비결정적일 때), mock 객체로 대체한다.

## 동기 (Motivation)

이메일을 보내는 기능을 테스트하려 한다:

```python
def test_send_notification():
    service = NotificationService()
    service.send("user@example.com", "Hello")

    # 어떻게 검증하지? 실제로 이메일이 갔나?
```

실제 이메일 서버를 쓰면:
- **느리다** (네트워크 왕복)
- **비용 발생** (이메일 서비스 과금)
- **부작용** (실제 이메일이 발송됨)
- **비결정적** (네트워크 상태에 따라 실패)

**Mock Object**는 이 문제를 해결한다. 실제 객체처럼 보이지만, 테스트 제어 하에 있는 가짜 객체다.

## Test Double 종류

Gerard Meszaros의 분류:

| 종류 | 역할 | 예시 |
|------|------|------|
| **Dummy** | 전달만 되고 사용 안 됨 | 파라미터 채우기용 null |
| **Stub** | 미리 정해진 응답 반환 | 항상 true 반환하는 인증 |
| **Fake** | 실제 동작하는 단순 구현 | 인메모리 데이터베이스 |
| **Mock** | 호출 검증 + stub 역할 | "이 메서드가 호출됐나?" |
| **Spy** | 실제 객체 감싸서 호출 기록 | 호출 횟수 세기 |

## Mock 예시

### Python (unittest.mock)

```python
from unittest.mock import Mock, patch

def test_send_notification():
    # Mock 생성
    mock_sender = Mock()

    service = NotificationService(email_sender=mock_sender)
    service.send("user@example.com", "Hello")

    # 호출 검증
    mock_sender.send_email.assert_called_once_with(
        to="user@example.com",
        body="Hello"
    )
```

### 외부 API Mock

```python
@patch('requests.get')
def test_fetch_user(mock_get):
    # 응답 설정
    mock_get.return_value.json.return_value = {"name": "Alice"}

    result = fetch_user(123)

    assert result["name"] == "Alice"
    mock_get.assert_called_with("https://api.example.com/users/123")
```

## Fake vs Mock

```python
# Fake: 실제 동작하는 단순 구현
class FakeEmailSender:
    def __init__(self):
        self.sent_emails = []

    def send_email(self, to, body):
        self.sent_emails.append((to, body))

def test_with_fake():
    fake_sender = FakeEmailSender()
    service = NotificationService(fake_sender)

    service.send("user@example.com", "Hello")

    assert ("user@example.com", "Hello") in fake_sender.sent_emails

# Mock: 호출 검증 중심
def test_with_mock():
    mock_sender = Mock()
    service = NotificationService(mock_sender)

    service.send("user@example.com", "Hello")

    mock_sender.send_email.assert_called()
```

## Over-Mocking 주의

Mock을 너무 많이 쓰면:

```python
# Over-mocking
def test_complex_flow():
    mock_db = Mock()
    mock_cache = Mock()
    mock_email = Mock()
    mock_queue = Mock()
    mock_logger = Mock()

    # 모든 것이 mock...
    # 이 테스트가 실제로 무엇을 검증하지?
```

문제점:
- **구현에 결합** — 리팩터링하면 테스트도 깨짐
- **실제 동작 미검증** — mock이 맞아도 실제가 틀릴 수 있음
- **가독성 저하** — setup이 테스트보다 길어짐

## London vs Detroit School

| London School (Mockist) | Detroit School (Classicist) |
|------------------------|---------------------------|
| 협력 객체는 대부분 mock | mock은 최소한으로 |
| 단위 = 클래스 | 단위 = 동작 |
| 상호작용 검증 | 상태 검증 |
| 설계 피드백 강조 | 리팩터링 내성 강조 |

둘 다 틀리지 않다. **상황에 맞게 선택**한다.

## 정리

- 테스트하기 **어려운 의존성**을 mock으로 대체
- Test Double 종류: **Dummy, Stub, Fake, Mock, Spy**
- **Over-mocking** 주의 — 구현 결합, 실제 미검증
- **London vs Detroit** — 상황에 맞게 선택
- Mock은 도구일 뿐, **목적은 빠른 피드백**

## 관련 패턴

- [Pattern 18: Self Shunt](/blog/programming/engineering/tdd-patterns/pattern18-self-shunt) — 테스트 클래스가 직접 mock 역할
- [Pattern 19: Log String](/blog/programming/engineering/tdd-patterns/pattern19-log-string) — 호출 순서 검증
- [Pattern 20: Crash Test Dummy](/blog/programming/engineering/tdd-patterns/pattern20-crash-test-dummy) — 에러 상황 테스트
