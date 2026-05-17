---
title: "Pattern 19: Log String"
date: 2026-07-01T19:00:00
description: "상호작용 순서를 string에 기록·검증."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 19
tags: [tdd, beck, log-string, interaction-test]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 협력 객체가 호출될 때마다 log string에 기록하고, 테스트 끝에 expected log와 비교한다.

## 동기 (Motivation)

**호출 순서**를 검증해야 할 때가 있다:

```python
# 이 순서대로 호출되어야 함:
# 1. validate()
# 2. save()
# 3. notify()
```

Mock의 `assert_called_before()` 같은 메서드도 있지만, **Log String**은 더 단순하다.

## Log String 예시

### 기본 패턴

```python
class TestOrderWorkflow:
    def setup_method(self):
        self.log = ""

    def append_log(self, message):
        self.log += message + " "

    def test_order_flow(self):
        validator = FakeValidator(self.append_log)
        saver = FakeSaver(self.append_log)
        notifier = FakeNotifier(self.append_log)

        order_service = OrderService(validator, saver, notifier)
        order_service.process(Order())

        assert self.log.strip() == "validate save notify"
```

### Fake 구현

```python
class FakeValidator:
    def __init__(self, log_fn):
        self.log_fn = log_fn

    def validate(self, order):
        self.log_fn("validate")
        return True

class FakeSaver:
    def __init__(self, log_fn):
        self.log_fn = log_fn

    def save(self, order):
        self.log_fn("save")

class FakeNotifier:
    def __init__(self, log_fn):
        self.log_fn = log_fn

    def notify(self, order):
        self.log_fn("notify")
```

## 더 상세한 기록

```python
class TestPaymentFlow:
    def setup_method(self):
        self.log = []

    def test_payment_steps(self):
        gateway = FakeGateway(lambda m: self.log.append(m))
        processor = PaymentProcessor(gateway)

        processor.charge("user_1", 1000)

        expected = [
            "auth:user_1",
            "charge:1000",
            "confirm:user_1"
        ]
        assert self.log == expected
```

## List vs String

```python
# String 방식
self.log = ""
self.log += "validate "
assert self.log.strip() == "validate save notify"

# List 방식
self.log = []
self.log.append("validate")
assert self.log == ["validate", "save", "notify"]
```

List가 더 명확하고 디버깅하기 쉽다.

## 이벤트 기반 시스템에 유용

```python
class TestEventDrivenWorkflow:
    def setup_method(self):
        self.events = []

    def test_event_sequence(self):
        bus = EventBus()
        bus.subscribe("*", lambda e: self.events.append(e.type))

        workflow = Workflow(bus)
        workflow.execute()

        assert self.events == [
            "workflow_started",
            "step_1_complete",
            "step_2_complete",
            "workflow_finished"
        ]
```

## Approval Testing의 원형

Log String은 **Approval Testing**의 아이디어와 비슷하다:

```python
# Approval Testing 스타일
def test_workflow():
    log = capture_workflow_log()

    # 첫 실행 시 approved 파일 생성
    # 이후 실행 시 비교
    verify(log)
```

Golden file과 비교하여 변경을 감지한다.

## 주의사항

- **순서만 중요할 때** 사용
- 세부 파라미터 검증은 **Mock이 더 적합**
- 로그가 **너무 길어지면** 가독성 저하
- **핵심 이벤트만** 기록

## 정리

- 협력 객체 호출 시 **log에 기록**
- 테스트 끝에 **expected log와 비교**
- **호출 순서** 검증에 효과적
- List가 String보다 **가독성 좋음**
- **이벤트 기반 시스템**에 유용
- Mock 대비 **가벼움**

## 관련 패턴

- [Pattern 17: Mock Object](/blog/programming/engineering/tdd-patterns/pattern17-mock-object) — 상세 검증
- [Pattern 18: Self Shunt](/blog/programming/engineering/tdd-patterns/pattern18-self-shunt) — 테스트 클래스가 콜백
- [Pattern 20: Crash Test Dummy](/blog/programming/engineering/tdd-patterns/pattern20-crash-test-dummy) — 에러 상황 테스트
