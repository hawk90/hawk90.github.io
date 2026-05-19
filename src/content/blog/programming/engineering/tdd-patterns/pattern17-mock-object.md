---
title: "Pattern 17: Mock Object"
date: 2026-05-10T17:00:00
description: "비싸거나 어려운 collaborator — mock으로 대체해 격리된 테스트."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 17
tags: [tdd, beck, mock-object, test-double]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 실제 객체가 *테스트하기 어려울 때*(비쌈/느림/비결정적/부수효과) *mock 객체*로 대체. 실제처럼 보이지만 *테스트 제어 하의 가짜*.

## 동기 (Motivation)

이메일 전송 테스트:

```python
def test_send_notification():
    service = NotificationService()
    service.send("user@example.com", "Hello")
    # 어떻게 검증? 실제로 이메일이 갔는지?
```

실제 SMTP 사용 시:

- *느림* (network).
- *비용* (이메일 서비스 과금).
- *부수효과* (실제 발송).
- *비결정* (network 상태).

Mock으로 *동작 흉내* + *테스트 제어*.

### Test Double 종류 (Meszaros 분류)

| 종류 | 역할 | 예시 |
| --- | --- | --- |
| **Dummy** | 전달만 됨, 사용 안 됨 | parameter 채우기용 null |
| **Stub** | 미리 정해진 응답 | 항상 true 반환 인증 |
| **Fake** | 실제 동작 단순 구현 | in-memory DB |
| **Mock** | 호출 검증 + stub | "이 메서드 호출됐나?" |
| **Spy** | 실제 객체 감싸 호출 기록 | 호출 횟수 |

### 신호

- 테스트가 *외부 시스템*에 의존 (DB, network, file).
- 테스트가 *느림*, *flaky*.
- 비용 발생 (API 호출).
- *시간/random* 의존.

### 언제 적용하는가

- *외부 시스템 호출* 격리 필요.
- 의존성이 *test 환경에 없음*.
- 빠른 *unit test* 우선.

### 언제 적용하지 않는가

- *Integration test* — 실제 의존성 검증이 목적.
- mock이 *production보다 단순* → 실제 동작과 *차이*.
- *Over-mocking* 위험.

## 절차 (Mechanics)

1. **외부 의존 식별**.
2. *Test Double 종류* 결정 (stub/mock/fake).
3. **DI로 주입 가능**하게 (constructor injection).
4. test에서 *mock 생성 + 동작 설정*.
5. *호출 검증* 또는 *결과 검증*.
6. test 종료 시 mock *cleanup*.

## 예시 1 — Python unittest.mock

```python
from unittest.mock import Mock

def test_send_notification():
    mock_sender = Mock()
    service = NotificationService(email_sender=mock_sender)

    service.send("user@example.com", "Hello")

    mock_sender.send_email.assert_called_once_with(
        to="user@example.com",
        body="Hello"
    )
```

호출 *검증*에 집중.

## 예시 2 — 외부 API patch

```python
@patch('requests.get')
def test_fetch_user(mock_get):
    mock_get.return_value.json.return_value = {"name": "Alice"}

    result = fetch_user(123)

    assert result["name"] == "Alice"
    mock_get.assert_called_with("https://api.example.com/users/123")
```

*전역 함수도 patch*. 테스트 종료 시 자동 복원.

## 예시 3 — Fake 구현

```python
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
```

Fake는 *실제 동작*하는 *단순 구현*. *상태 검증*에 적합.

## 자주 보는 안티패턴

### 1. *Over-mocking*
```python
def test_complex_flow():
    mock_db = Mock()
    mock_cache = Mock()
    mock_email = Mock()
    mock_queue = Mock()
    mock_logger = Mock()
    # 모두 mock — 무엇을 검증?
```
*production behavior 미검증*. integration test 보완.

### 2. *Implementation에 결합*
```python
mock_repo.find_by_id.assert_called_once()   # ← 구현 detail
```
리팩터링 시 *test도 깨짐*. *결과 검증* 우선.

### 3. *Mock이 production보다 단순*
production이 *복잡한 retry/timeout*인데 mock은 *바로 반환* → silent bug.

### 4. *Mock의 mock의 mock*
```python
mock_db.connect.return_value.cursor.return_value.execute.return_value.fetchall.return_value = [...]
```
*결합 폭증*. Wrapper class 도입.

### 5. *Mock cleanup 누락*
`@patch` decorator 안 쓰고 직접 monkey-patch → 다른 test 영향. *context manager* 또는 *fixture*.

### 6. *Mock으로 production 디버깅*
"mock test 통과하는데 production 깨짐" → mock이 *진실 아님*. *integration test* 추가.

## Modern variants

### Library-specific

| 언어 | Mock library |
| --- | --- |
| Python | unittest.mock, pytest-mock, mocker |
| Java | Mockito, EasyMock, PowerMock |
| C# | Moq, NSubstitute, FakeItEasy |
| JavaScript | jest.mock, sinon |
| Ruby | RSpec mocks, Mocha |
| Rust | mockall, mockito (HTTP) |
| Go | gomock, testify/mock |

### HTTP recording (VCR pattern)

```python
@vcr.use_cassette()
def test_api():
    response = requests.get("...")
```

첫 실행 시 *녹화*, 이후 *재생* — mock보다 *production-like*.

### Service virtualization

WireMock, MockServer — *전체 service*를 mock. integration test에 적합.

### Testcontainers (real instead of mock)

```python
with PostgresContainer() as postgres:
    # 진짜 DB. mock 대신.
```

real dependency를 *Docker로 격리*. mock보다 *진실*.

### Property-based mocking

```python
@given(st.text())
def test_property(input):
    mock = Mock()
    mock.process.return_value = transform(input)
    # ...
```

### London vs Detroit School

| London (Mockist) | Detroit (Classicist) |
| --- | --- |
| 협력 객체는 대부분 mock | mock 최소 |
| 단위 = class | 단위 = behavior |
| *상호작용* 검증 | *상태* 검증 |
| 설계 피드백 | 리팩터링 내성 |

둘 다 valid. *상황*에 맞게.

### Tell-Don't-Ask + Mock

[Hide Delegate](/blog/programming/design/refactoring-catalog/pattern18-hide-delegate)와 결합 — 객체에 *명령*만 → mock 검증이 *자연스러운 boundary*.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| unittest.mock | Python 표준 |
| pytest-mock | pytest용 |
| Mockito | Java |
| Sinon | JS |
| Mockall | Rust |
| WireMock | HTTP service mock |
| Testcontainers | real container |
| VCR.py / Polly | HTTP record/replay |

## 성능 고려

- Mock test는 *극히 빠름*. real DB의 1/100.
- *Mock setup 복잡*하면 test 자체 느림.
- *VCR cassette* 재생은 매우 빠름.

## 관련 패턴

- [Pattern 18: Self Shunt](/blog/programming/engineering/tdd-patterns/pattern18-self-shunt) — 테스트 클래스가 mock 역할
- [Pattern 19: Log String](/blog/programming/engineering/tdd-patterns/pattern19-log-string) — 호출 순서 검증
- [Pattern 20: Crash Test Dummy](/blog/programming/engineering/tdd-patterns/pattern20-crash-test-dummy) — 에러 상황 테스트
- [Pattern 2: Isolated Test](/blog/programming/engineering/tdd-patterns/pattern02-isolated-test) — 격리 원칙
