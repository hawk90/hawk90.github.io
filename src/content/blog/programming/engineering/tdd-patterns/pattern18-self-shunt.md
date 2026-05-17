---
title: "Pattern 18: Self Shunt"
date: 2026-07-01T18:00:00
description: "Test class 자신을 collaborator로 — minimal mock."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 18
tags: [tdd, beck, self-shunt, mock-light]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 테스트 클래스 자신이 협력 객체 인터페이스를 구현하여, mock 프레임워크 없이 간단한 stub을 만든다.

## 동기 (Motivation)

외부 mock 라이브러리 없이도 테스트하고 싶다. 협력 객체가 간단할 때, **테스트 클래스 자체가** 그 역할을 할 수 있다.

이것이 **Self Shunt** — 테스트가 스스로를 SUT(System Under Test)에 주입한다.

## Self Shunt 예시

### 전통적인 Mock

```python
# Mock 라이브러리 사용
def test_notification_sent():
    mock_listener = Mock()
    publisher = EventPublisher()
    publisher.add_listener(mock_listener)

    publisher.publish("event_1")

    mock_listener.on_event.assert_called_with("event_1")
```

### Self Shunt

```python
class TestEventPublisher:
    def setup_method(self):
        self.received_events = []
        self.publisher = EventPublisher()
        self.publisher.add_listener(self)  # 테스트 클래스 자신을 주입

    # 테스트 클래스가 Listener 인터페이스 구현
    def on_event(self, event):
        self.received_events.append(event)

    def test_notification_sent(self):
        self.publisher.publish("event_1")

        assert "event_1" in self.received_events
```

테스트 클래스가 **직접 콜백을 받는다**.

## 장점

1. **의존성 없음**: mock 라이브러리 불필요
2. **간단함**: 인터페이스 구현만으로 충분
3. **명확함**: 콜백이 어디로 가는지 한눈에 보임

## 패턴 구조

```python
class TestSUT(ListenerInterface):  # 인터페이스 구현
    def setup_method(self):
        self.sut = SUT()
        self.sut.register(self)  # 자신을 주입
        self.log = []  # 콜백 기록용

    # 인터페이스 메서드 구현
    def on_something(self, data):
        self.log.append(data)

    def test_something(self):
        self.sut.do_action()

        assert "expected" in self.log
```

## 언어별 변형

### Java (상속)

```java
public class OrderTest extends OrderListener {
    private List<String> events = new ArrayList<>();
    private OrderService service;

    @Before
    public void setup() {
        service = new OrderService();
        service.addListener(this);  // self shunt
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

### Python (다중 상속 / 덕 타이핑)

```python
class TestOrderService:
    def setup_method(self):
        self.events = []
        self.service = OrderService()
        self.service.add_listener(self)

    def on_order_created(self, order_id):
        self.events.append(f"created:{order_id}")

    def test_order_creation(self):
        self.service.create_order("123")

        assert "created:123" in self.events
```

## Self Shunt vs Mock

| Self Shunt | Mock |
|------------|------|
| 라이브러리 불필요 | Mock 라이브러리 필요 |
| 단순한 콜백에 적합 | 복잡한 검증에 적합 |
| 인터페이스 구현 필요 | 동적 생성 |
| 테스트 클래스가 커짐 | 테스트 클래스 작음 |

## 주의사항

- 테스트 클래스가 **너무 많은 인터페이스**를 구현하면 복잡해짐
- **단순한 콜백/이벤트**에만 사용
- 복잡한 상호작용은 **Mock 프레임워크**가 나음

## 정리

- 테스트 클래스가 **직접 협력 객체 역할**
- **Mock 라이브러리 없이** 간단한 stub
- **콜백 기록용 필드**를 테스트 클래스에 둠
- 단순한 인터페이스에 적합
- 복잡해지면 **Mock 사용 고려**

## 관련 패턴

- [Pattern 17: Mock Object](/blog/programming/engineering/tdd-patterns/pattern17-mock-object) — 일반 mock
- [Pattern 19: Log String](/blog/programming/engineering/tdd-patterns/pattern19-log-string) — 호출 순서 기록
- [Pattern 20: Crash Test Dummy](/blog/programming/engineering/tdd-patterns/pattern20-crash-test-dummy) — 에러 발생 mock
