---
title: "Pattern 18: Self Shunt"
date: 2026-05-10T18:00:00
description: "Test class 자신이 collaborator 인터페이스 구현 — mock framework 없이 minimal stub."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 18
tags: [tdd, beck, self-shunt, mock-light]
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 테스트 클래스가 직접 협력 객체 인터페이스를 구현하여 mock framework 없이 간단한 stub을 만든다.

## 동기

외부 mock 라이브러리 없이도 *callback/listener* 같은 단순 협력을 테스트하고 싶다. 협력 객체가 간단할 때 test 클래스 자체가 그 역할을 할 수 있다.

이것이 **Self Shunt** — 테스트가 스스로를 SUT에 주입한다.

### 신호

- *간단한 listener / observer / callback* 인터페이스.
- mock library 도입 부담.
- 협력 객체가 한 두 메서드만.
- 상태 기록이 핵심 검증.

### 언제 적용하는가

- 인터페이스가 작음.
- 기록 + 검증만 필요.
- mock 라이브러리 의존 최소화 원함.

### 언제 적용하지 않는가

- 인터페이스가 큼 (메서드 10개+) — test 클래스 부담.
- 복잡한 동작 (조건부 응답, exception).
- mock 라이브러리가 이미 표준.

## 절차

1. **협력 객체 interface** 식별.
2. **test 클래스가 interface 구현** (또는 duck typing).
3. **기록용 field** 추가 (`self.received_events = []`).
4. interface method가 기록.
5. SUT 생성 시 `self`를 주입.
6. test에서 기록 검증.

## 예시 1 — Event listener

```python
class TestEventPublisher:
    def setup_method(self):
        self.received_events = []
        self.publisher = EventPublisher()
        self.publisher.add_listener(self)   # test 클래스 자신을 주입

    # Listener interface 구현
    def on_event(self, event):
        self.received_events.append(event)

    def test_notification_sent(self):
        self.publisher.publish("event_1")
        assert "event_1" in self.received_events
```

mock library 없음. 명확하고 가벼움.

## 예시 2 — Java (상속)

```java
public class OrderTest implements OrderListener {
    private List<String> events = new ArrayList<>();
    private OrderService service;

    @Before
    public void setup() {
        service = new OrderService();
        service.addListener(this);   // self shunt
    }

    @Override
    public void onOrderCreated(String orderId) {
        events.add("created:" + orderId);
    }

    @Test
    public void testOrderCreation() {
        service.createOrder("123");
        assertTrue(events.contains("created:123"));
    }
}
```

interface implementation은 컴파일러가 강제.

## 예시 3 — Method ordering

```python
class TestOrderWorkflow:
    def setup_method(self):
        self.call_log = []
        self.workflow = OrderWorkflow(self)

    # Workflow callbacks
    def validate(self, order):
        self.call_log.append("validate")
        return True

    def process(self, order):
        self.call_log.append("process")

    def complete(self, order):
        self.call_log.append("complete")

    def test_order_flow_order(self):
        self.workflow.execute(Order())
        assert self.call_log == ["validate", "process", "complete"]
```

호출 순서를 자연스럽게 검증. Log String과 결합.

## 자주 보는 안티패턴

### 1. 모든 mock을 self shunt로

복잡한 interaction까지 test 클래스에 → test 클래스 폭증. 복잡하면 Mock.

### 2. Interface 메서드 폭증

self shunt가 10개 메서드 구현 — 책임 분산. 별도 stub class.

### 3. State 검증 안 함

기록만 하고 assertion 없음 → useful 테스트 아님. 기록 검증 필수.

### 4. Interface 변경에 취약

production interface 변경 시 모든 self shunt 클래스 함께 수정. 자동화 없다.

### 5. Threading

async/multi-thread 환경에서 기록 race — synchronization 필요하다.

### 6. Cross-test 공유

class-level field로 test 간 공유 → 격리 깨짐. instance.

## Modern variants

### Closure-based (Python/JS)

```python
def test_listener():
    received = []
    publisher = EventPublisher()
    publisher.add_listener(lambda e: received.append(e))

    publisher.publish("event_1")
    assert "event_1" in received
```

closure로 더 짧게. 작은 callback에 자연.

### Duck typing

```python
class FakeListener:
    def __init__(self):
        self.events = []
    def on_event(self, e):
        self.events.append(e)

def test():
    listener = FakeListener()
    publisher = EventPublisher()
    publisher.add_listener(listener)
    # ...
```

별도 작은 fake class. self shunt와 대등.

### Mock library + spy

```python
from unittest.mock import MagicMock
listener = MagicMock()
publisher.add_listener(listener)
publisher.publish("x")
listener.on_event.assert_called_with("x")
```

mock 라이브러리로 동적. self shunt와 competing.

### Functional callback

JS/Rust/Go 등에서 함수 자체를 전달:

```rust
publisher.on_event(|e| received.push(e.clone()));
```

interface 없이.

## 도구 / IDE

| 도구 | Self Shunt 지원 |
| --- | --- |
| 모든 IDE | interface implementation 자동 생성 |
| (특별 도구 없음) | 패턴 자체가 수동 작성 |

## Self Shunt vs Mock

| Self Shunt | Mock |
| --- | --- |
| 라이브러리 불필요 | mock 라이브러리 |
| 단순 callback에 적합 | 복잡 검증 |
| interface 구현 필요 | 동적 생성 |
| test class 커짐 | test class 작음 |
| compile-time 안전 (Java) | runtime |

## 성능 고려

self shunt는 진짜 함수 호출 — overhead 0. mock보다 약간 빠를 수도. 일반적으로 무관.

## 관련 패턴

- [Pattern 17: Mock Object](/blog/programming/engineering/tdd-patterns/pattern17-mock-object) — 일반 mock
- [Pattern 19: Log String](/blog/programming/engineering/tdd-patterns/pattern19-log-string) — 호출 순서 기록
- [Pattern 20: Crash Test Dummy](/blog/programming/engineering/tdd-patterns/pattern20-crash-test-dummy) — 에러 발생
