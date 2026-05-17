---
title: "Pattern 20: Crash Test Dummy"
date: 2026-07-01T20:00:00
description: "Error 처리를 test — 던지는 fake로 강제."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 20
tags: [tdd, beck, crash-test-dummy, error-handling]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 에러 경로를 테스트할 때, 예외를 던지는 fake 협력 객체를 사용하여 에러 상황을 결정적으로 재현한다.

## 동기 (Motivation)

에러 처리 코드를 테스트하려면 **에러가 발생해야** 한다. 하지만 실제 에러는:
- **드물게** 발생 (네트워크 끊김, 디스크 풀)
- **비결정적** (언제 발생할지 모름)
- **재현이 어려움** (실제 환경 조작 필요)

**Crash Test Dummy**는 **의도적으로 에러를 던지는** fake다. 자동차 충돌 테스트에 사용하는 인형처럼, 코드의 "충돌" 상황을 테스트한다.

## Crash Test Dummy 예시

### 네트워크 에러 테스트

```python
class NetworkErrorStub:
    """항상 네트워크 에러를 던지는 fake"""
    def fetch(self, url):
        raise NetworkError("Connection refused")

def test_handles_network_error():
    error_client = NetworkErrorStub()
    service = DataService(http_client=error_client)

    result = service.get_data("https://api.example.com")

    assert result.status == "error"
    assert result.message == "네트워크 오류. 나중에 다시 시도해주세요."
```

### 데이터베이스 에러 테스트

```python
class DatabaseErrorStub:
    def save(self, data):
        raise DatabaseError("Disk full")

def test_handles_database_error():
    error_db = DatabaseErrorStub()
    service = OrderService(database=error_db)

    result = service.create_order(Order())

    assert result.success == False
    assert "저장 실패" in result.error_message
```

### 파일 시스템 에러 테스트

```python
class DiskFullStub:
    def write(self, path, data):
        raise IOError("No space left on device")

def test_handles_disk_full():
    error_fs = DiskFullStub()
    backup_service = BackupService(filesystem=error_fs)

    result = backup_service.backup()

    assert result.failed
    assert backup_service.notified_admin
```

## 다양한 에러 타입

```python
class ConfigurableErrorStub:
    def __init__(self, error_to_raise):
        self.error_to_raise = error_to_raise

    def operation(self):
        raise self.error_to_raise

# 사용
def test_timeout_error():
    stub = ConfigurableErrorStub(TimeoutError("Request timed out"))
    ...

def test_auth_error():
    stub = ConfigurableErrorStub(AuthenticationError("Invalid token"))
    ...
```

## 조건부 에러 (특정 호출에서만)

```python
class FailOnNthCallStub:
    def __init__(self, fail_on=2):
        self.call_count = 0
        self.fail_on = fail_on

    def operation(self):
        self.call_count += 1
        if self.call_count == self.fail_on:
            raise RuntimeError("Intermittent failure")
        return "success"

def test_retry_on_failure():
    stub = FailOnNthCallStub(fail_on=1)
    service = RetryableService(client=stub)

    result = service.execute_with_retry(max_retries=3)

    assert result == "success"
    assert stub.call_count == 2  # 첫 번째 실패 후 재시도 성공
```

## 왜 Crash Test Dummy인가

| 상황 | 프로덕션 | 테스트 |
|------|---------|-------|
| 네트워크 끊김 | 드물게 발생 | Crash Test Dummy로 즉시 재현 |
| 디스크 풀 | 거의 안 발생 | Crash Test Dummy로 100% 재현 |
| 외부 API 장애 | 예측 불가 | Crash Test Dummy로 결정적 |

## 에러 처리 커버리지

Crash Test Dummy로 테스트해야 할 에러들:

```python
# 전형적인 에러 시나리오들
def test_network_timeout(): ...
def test_network_refused(): ...
def test_network_dns_failure(): ...

def test_database_connection_lost(): ...
def test_database_disk_full(): ...
def test_database_constraint_violation(): ...

def test_external_api_500(): ...
def test_external_api_rate_limited(): ...
def test_external_api_invalid_response(): ...
```

## 정리

- **에러 경로** 테스트를 위한 fake
- 프로덕션에서 **드문 에러**를 결정적으로 재현
- **다양한 에러 타입**을 구성 가능
- **조건부 에러** (N번째 호출에서만)
- **에러 처리 코드**의 품질 보장

## 관련 패턴

- [Pattern 17: Mock Object](/blog/programming/engineering/tdd-patterns/pattern17-mock-object) — 일반 테스트 더블
- [Pattern 18: Self Shunt](/blog/programming/engineering/tdd-patterns/pattern18-self-shunt) — 간단한 stub
- [Pattern 2: Isolated Test](/blog/programming/engineering/tdd-patterns/pattern02-isolated-test) — 테스트 격리
