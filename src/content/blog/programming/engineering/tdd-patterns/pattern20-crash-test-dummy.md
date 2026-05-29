---
title: "Pattern 20: Crash Test Dummy"
date: 2026-05-10T20:00:00
description: "Error 경로를 테스트할 때 — 예외를 던지는 fake로 강제 재현."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 20
tags: [tdd, beck, crash-test-dummy, error-handling]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
draft: true

---

## 한 줄 요약

> 에러 경로 테스트 시 의도적으로 예외를 던지는 fake를 사용. 자동차 충돌 테스트 인형처럼 코드의 충돌 상황을 결정적으로 재현.

## 동기

에러 처리 코드 테스트 — 에러가 실제로 발생해야 한다. 하지만 실제 에러는:

- 드물게 발생 (network 끊김, 디스크 풀).
- 비결정 (언제 발생할지 모름).
- 재현 어려움 (실제 환경 조작 필요).

**Crash Test Dummy**는 항상 예외를 던지는 fake.

### 신호

- 에러 처리 코드가 production에서만 발견되는 버그.
- 코드 커버리지에서 catch 블록 0%.
- "내가 작성한 에러 처리가 진짜 동작하나?" 불안.

### 언제 적용하는가

- 에러 처리 코드 검증.
- *retry / fallback 로직*.
- graceful degradation.
- *circuit breaker / timeout*.

## 절차

1. **에러 시나리오 식별** — 어떤 collaborator의 어떤 실패?
2. **Crash Test Dummy class** 작성 — 그 collaborator interface 구현, 호출 시 예외 throw.
3. test에서 dummy 주입.
4. SUT 실행.
5. **에러 처리 결과 검증** — graceful response, retry, log, fallback.

## 예시 1 — Network error

```python
class NetworkErrorStub:
    """항상 network error"""
    def fetch(self, url):
        raise NetworkError("Connection refused")

def test_handles_network_error():
    error_client = NetworkErrorStub()
    service = DataService(http_client=error_client)

    result = service.get_data("https://api.example.com")

    assert result.status == "error"
    assert result.message == "네트워크 오류. 나중에 다시 시도해주세요."
```

network down을 재현 불필요 — dummy로 즉시.

## 예시 2 — Configurable error

```python
class ConfigurableErrorStub:
    def __init__(self, error_to_raise):
        self.error = error_to_raise

    def operation(self):
        raise self.error

def test_timeout():
    stub = ConfigurableErrorStub(TimeoutError("Request timed out"))
    service = Service(client=stub)
    # ...

def test_auth_error():
    stub = ConfigurableErrorStub(AuthenticationError("Invalid token"))
    # ...
```

다양한 에러 타입을 한 stub으로.

## 예시 3 — N번째 호출에서만 실패 (retry test)

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
    assert stub.call_count == 2   # 첫 fail, 둘째 success
```

조건부 에러로 retry 로직 검증.

## 자주 보는 안티패턴

### 1. Production 코드에서만 에러 처리

test 없음 → 에러 처리가 실제 작동하는지 미검증. crash dummy로 검증.

### 2. 너무 specific한 에러

```python
raise NetworkError("eth0 down")   # 특정 환경
```
generic 에러로 시작 — 구체화는 필요할 때.

### 3. catch-all 검증

```python
try: ...
except Exception:
    pass   # ← 모든 에러 무시
```
test가 조용히 통과. 명시적 처리 검증.

### 4. Retry 무한 루프

crash dummy로 무한 실패 → test가 영원히 retry. max attempts 명시.

### 5. Exception type 부정확

production에서 `IOError`인데 test는 `Exception` → 다른 type 동등 취급. 정확한 타입.

### 6. Side effect 검증 누락

에러 발생 시 *log/metric/notification*도 검증해야. 누락은 silent failure.

## Modern variants

### Chaos engineering

production-level fault injection (Chaos Monkey, Litmus). crash test dummy의 production version.

```bash
# 무작위로 pod 죽이기
chaos-mesh apply pod-failure.yaml
```

### Hypothesis "stateful"

```python
@rule()
def crash_random(self):
    raise RandomError()
```

property-based로 무작위 crash 시나리오.

### Fault injection framework

| 도구 | 영역 |
| --- | --- |
| Toxiproxy | network fault |
| Pumba | Docker chaos |
| Chaos Monkey (Netflix) | EC2 instance kill |
| LitmusChaos | Kubernetes |

### Test container with failure

```python
postgres = PostgresContainer()
postgres.start()
# 일부러 죽이기
postgres.stop()
# 이제 service 호출 → 에러 처리 검증
```

### Mock library exception

```python
mock_db.save.side_effect = DatabaseError("disk full")
```

mock library가 side_effect로 exception 지원.

### Hypothesis-driven negative cases

```python
@given(st.integers().filter(lambda x: x < 0))
def test_negative_handling(n):
    with pytest.raises(ValueError):
        process(n)
```

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| pytest.raises | exception 검증 |
| JUnit assertThrows | 같음 |
| mock library `side_effect` | 동적 exception |
| Toxiproxy | network fault |
| chaos-toolkit | chaos automation |

## 에러 처리 커버리지

Crash test dummy로 테스트할 전형적 시나리오:

```python
# Network
def test_network_timeout(): ...
def test_network_refused(): ...
def test_network_dns_failure(): ...

# Database
def test_database_connection_lost(): ...
def test_database_disk_full(): ...
def test_database_constraint_violation(): ...

# External API
def test_external_api_500(): ...
def test_external_api_rate_limited(): ...
def test_external_api_invalid_response(): ...

# Resource
def test_out_of_memory(): ...
def test_file_not_found(): ...
def test_permission_denied(): ...
```

## 성능 고려

dummy의 exception throw는 극히 빠름. test 부담 0. 단 수많은 chaos test는 time 누적 — 별도 schedule.

## 관련 패턴

- [Pattern 17: Mock Object](/blog/programming/engineering/tdd-patterns/pattern17-mock-object) — 일반 test double
- [Pattern 18: Self Shunt](/blog/programming/engineering/tdd-patterns/pattern18-self-shunt) — 간단한 stub
- [Pattern 2: Isolated Test](/blog/programming/engineering/tdd-patterns/pattern02-isolated-test) — 격리
- [Pattern 31: Exception Test](/blog/programming/engineering/tdd-patterns/pattern31-exception-test) — exception 검증
