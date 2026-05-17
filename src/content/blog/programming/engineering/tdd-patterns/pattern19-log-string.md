---
title: "Pattern 19: Log String"
date: 2026-07-01T19:00:00
description: "상호작용 순서를 string/list에 기록 — 단순하고 명확한 sequence 검증."
series: "TDD by Example — Patterns Deep Dive"
seriesOrder: 19
tags: [tdd, beck, log-string, interaction-test]
draft: true
type: book-review
bookTitle: "Test-Driven Development: By Example"
bookAuthor: "Kent Beck"
---

## 한 줄 요약

> 협력 객체가 호출될 때마다 *log에 기록*하고, 테스트 끝에 *expected log와 비교*. mock보다 *단순한 호출 순서 검증*.

## 동기 (Motivation)

호출 순서를 검증하는 시나리오:

```python
# 이 순서대로 호출되어야 함:
# 1. validate()
# 2. save()
# 3. notify()
```

Mock의 `assert_called_before()`도 있지만 **Log String**이 더 단순.

### 신호

- 협력 객체 호출 *순서*가 의미.
- 여러 collaborator의 *interleaving 검증* 필요.
- *event-driven* 시스템 동작 검증.
- mock 라이브러리 *복잡한 syntax* 회피.

### 언제 적용하는가

- *순서 자체*가 검증 대상.
- *workflow/pipeline* 동작 검증.
- 이벤트 발행 순서.

### 언제 적용하지 않는가

- 세부 *parameter 검증*이 핵심 — Mock 적합.
- 단일 호출 — Log 불필요.

## 절차 (Mechanics)

1. **log container** 생성 (list 또는 string).
2. **fake collaborator** 작성 — 호출 시 log 추가.
3. test에서 *fake 주입*.
4. SUT 실행.
5. **log 검증** — expected sequence와 비교.

## 예시 1 — 기본 패턴

```python
class TestOrderWorkflow:
    def setup_method(self):
        self.log = []

    def test_order_flow(self):
        validator = FakeValidator(self.log)
        saver     = FakeSaver(self.log)
        notifier  = FakeNotifier(self.log)
        service   = OrderService(validator, saver, notifier)

        service.process(Order())

        assert self.log == ["validate", "save", "notify"]
```

Fakes:

```python
class FakeValidator:
    def __init__(self, log): self.log = log
    def validate(self, order):
        self.log.append("validate")
        return True

class FakeSaver:
    def __init__(self, log): self.log = log
    def save(self, order):
        self.log.append("save")

class FakeNotifier:
    def __init__(self, log): self.log = log
    def notify(self, order):
        self.log.append("notify")
```

## 예시 2 — 상세 정보 포함

```python
def test_payment_steps():
    log = []
    gateway = FakeGateway(log)
    processor = PaymentProcessor(gateway)

    processor.charge("user_1", 1000)

    assert log == [
        "auth:user_1",
        "charge:1000",
        "confirm:user_1"
    ]
```

각 호출에 *식별 정보* 포함 → *순서 + 데이터* 동시 검증.

## 예시 3 — Event 시스템

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

이벤트 *발행 순서* 검증.

## 자주 보는 안티패턴

### 1. *String concat 사용*
```python
log = "validate save notify"   # split·trim 필요
```
List가 더 명확. equality도 강력.

### 2. *너무 많이 기록*
모든 내부 호출 기록 → 노이즈, 결합. *핵심 이벤트*만.

### 3. *Order infinitive*
*순서 무관*한데 list로 검증 → false negative. set 또는 contains.

### 4. *Threading race*
async 환경에서 *log race* → flaky. `threading.Lock` 또는 `Queue`.

### 5. *Implementation-coupled log*
internal helper까지 log → 리팩터링 시 *test 깨짐*. *외부 동작*만.

### 6. *Production logging과 혼동*
production code의 logger 출력을 *test에서 검증* → fragile. *명시적 fake*.

## Modern variants

### Approval testing

```python
verify(rendered_log)   # approved file과 비교
```

큰 log를 *baseline 파일*과 자동 비교. ApprovalTests library.

### Event sourcing

```python
events_recorded = []
class TestProjection:
    def on_event(self, e): events_recorded.append(e)

# Apply events
for e in events: aggregate.apply(e)
assert events_recorded == [Created(...), Updated(...), Deleted(...)]
```

event sourcing 시스템의 *자연스러운 검증*.

### Snapshot testing (Jest)

```javascript
expect(eventLog).toMatchSnapshot();
```

복잡한 sequence를 *snapshot으로*. 변경은 review.

### Property-based ordering

```python
@given(st.lists(st.integers()))
def test_workflow_ordering(items):
    log = []
    process(items, lambda x: log.append(x))
    assert log == sorted(items)   # property 검증
```

### OpenTelemetry traces

production-level *span 기록* → test에서도 *trace로 검증*.

## 도구 / IDE

| 도구 | 기능 |
| --- | --- |
| List literal | 단순 검증 |
| approvaltests | golden file |
| Jest snapshot | snapshot 비교 |
| OpenTelemetry | distributed trace |
| Mockito InOrder | mock library의 ordering 검증 |

## List vs String

| List | String |
| --- | --- |
| 정확한 equality | parse/trim 필요 |
| Diff message 명확 | 긴 string fail 시 읽기 어려움 |
| element별 검사 가능 | concat 자연스러움 (디버깅에는 약함) |

거의 항상 *List* 권장.

## 성능 고려

log 기록은 *극히 빠름* (`list.append`). 100만 entry까지 OK. *flush* 부담 없음 (in-memory).

## 관련 패턴

- [Pattern 17: Mock Object](/blog/programming/engineering/tdd-patterns/pattern17-mock-object) — 상세 검증
- [Pattern 18: Self Shunt](/blog/programming/engineering/tdd-patterns/pattern18-self-shunt) — test class가 callback
- [Pattern 20: Crash Test Dummy](/blog/programming/engineering/tdd-patterns/pattern20-crash-test-dummy) — 에러 상황 테스트
- [Pattern 11: Learning Test](/blog/programming/engineering/tdd-patterns/pattern11-learning-test) — 외부 lib 동작 확인
