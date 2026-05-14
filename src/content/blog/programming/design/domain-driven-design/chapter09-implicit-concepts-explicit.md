---
title: "Ch 9: Making Implicit Concepts Explicit"
date: 2025-10-01T09:00:00
description: "암묵 개념을 객체로 — Specification, 제약, 프로세스, 정책."
tags: [DDD, Explicit Concepts, Specification]
series: "Domain-Driven Design"
seriesOrder: 9
draft: true
---

## 암묵적 개념이란?

도메인 전문가의 머릿속에는 있지만, 코드에는 **명시적으로 표현되지 않은** 개념들이 있다.

```
암묵적 개념의 징후:

• if-else 체인이 길어진다
• 같은 조건이 여러 곳에 반복된다
• 주석이 길어진다 ("이 경우는...")
• 메서드 이름에 "And", "Or"가 들어간다
• 도메인 전문가가 쓰는 용어가 코드에 없다
```

이런 개념을 **명시적으로 드러내면** 모델이 풍부해진다.

---

## 신호 1: 반복되는 조건

### Before — 조건이 곳곳에 흩어짐

```python
class BookingService:
    def can_book(self, cargo: Cargo, voyage: Voyage) -> bool:
        # 같은 조건이 여러 곳에 반복
        if cargo.size > voyage.capacity - voyage.booked_size:
            return False
        if cargo.hazardous and not voyage.allows_hazardous:
            return False
        if cargo.destination not in voyage.stops:
            return False
        return True

    def book(self, cargo: Cargo, voyage: Voyage) -> None:
        # 또 같은 조건 검사
        if cargo.size > voyage.capacity - voyage.booked_size:
            raise CapacityExceeded()
        if cargo.hazardous and not voyage.allows_hazardous:
            raise HazardousMaterialNotAllowed()
        if cargo.destination not in voyage.stops:
            raise DestinationNotServed()
        voyage.add_cargo(cargo)


class VoyageReportService:
    def available_voyages(self, cargo: Cargo) -> list[Voyage]:
        result = []
        for voyage in self._all_voyages:
            # 또 같은 조건...
            if cargo.size <= voyage.capacity - voyage.booked_size:
                if not cargo.hazardous or voyage.allows_hazardous:
                    if cargo.destination in voyage.stops:
                        result.append(voyage)
        return result
```

문제점:
- 동일한 조건이 3곳에 반복
- 조건 변경 시 모든 곳을 수정해야 함
- "예약 가능 조건"이라는 개념이 **암묵적**

### 💡 발견: "Overbooking Policy"

도메인 전문가와 대화:

```
개발자: "예약 가능 여부를 어떻게 판단하나요?"

전문가: "Overbooking Policy에 따라요.
        용량, 위험물 허용, 경유지 등을 보죠.
        정책은 상황에 따라 달라질 수 있어요."

개발자: "정책이라... 별도 개념이군요!"
```

### After — 정책을 명시적으로

```python
from abc import ABC, abstractmethod


class OverbookingPolicy(ABC):
    """예약 가능 정책 — 암묵적 개념이 명시적으로"""

    @abstractmethod
    def is_allowed(self, cargo: Cargo, voyage: Voyage) -> bool:
        pass

    @abstractmethod
    def validate(self, cargo: Cargo, voyage: Voyage) -> None:
        """위반 시 구체적인 예외 발생"""
        pass


class StandardOverbookingPolicy(OverbookingPolicy):
    """표준 예약 정책"""

    def __init__(self, overbooking_ratio: float = 1.1) -> None:
        self._overbooking_ratio = overbooking_ratio

    def is_allowed(self, cargo: Cargo, voyage: Voyage) -> bool:
        return (
            self._has_capacity(cargo, voyage)
            and self._allows_hazardous(cargo, voyage)
            and self._serves_destination(cargo, voyage)
        )

    def validate(self, cargo: Cargo, voyage: Voyage) -> None:
        if not self._has_capacity(cargo, voyage):
            raise CapacityExceeded()
        if not self._allows_hazardous(cargo, voyage):
            raise HazardousMaterialNotAllowed()
        if not self._serves_destination(cargo, voyage):
            raise DestinationNotServed()

    def _has_capacity(self, cargo: Cargo, voyage: Voyage) -> bool:
        max_capacity = voyage.capacity * self._overbooking_ratio
        return cargo.size <= max_capacity - voyage.booked_size

    def _allows_hazardous(self, cargo: Cargo, voyage: Voyage) -> bool:
        return not cargo.hazardous or voyage.allows_hazardous

    def _serves_destination(self, cargo: Cargo, voyage: Voyage) -> bool:
        return cargo.destination in voyage.stops


class BookingService:
    def __init__(self, policy: OverbookingPolicy) -> None:
        self._policy = policy

    def can_book(self, cargo: Cargo, voyage: Voyage) -> bool:
        return self._policy.is_allowed(cargo, voyage)

    def book(self, cargo: Cargo, voyage: Voyage) -> None:
        self._policy.validate(cargo, voyage)
        voyage.add_cargo(cargo)


class VoyageReportService:
    def __init__(self, policy: OverbookingPolicy) -> None:
        self._policy = policy

    def available_voyages(self, cargo: Cargo) -> list[Voyage]:
        return [v for v in self._all_voyages
                if self._policy.is_allowed(cargo, v)]
```

```cpp
// C++ 버전
class OverbookingPolicy {
public:
    virtual ~OverbookingPolicy() = default;
    virtual bool isAllowed(const Cargo& cargo, const Voyage& voyage) const = 0;
    virtual void validate(const Cargo& cargo, const Voyage& voyage) const = 0;
};

class StandardOverbookingPolicy : public OverbookingPolicy {
    double overbookingRatio_;

public:
    explicit StandardOverbookingPolicy(double ratio = 1.1)
        : overbookingRatio_(ratio) {}

    bool isAllowed(const Cargo& cargo, const Voyage& voyage) const override {
        return hasCapacity(cargo, voyage)
            && allowsHazardous(cargo, voyage)
            && servesDestination(cargo, voyage);
    }

    void validate(const Cargo& cargo, const Voyage& voyage) const override {
        if (!hasCapacity(cargo, voyage))
            throw CapacityExceeded();
        if (!allowsHazardous(cargo, voyage))
            throw HazardousMaterialNotAllowed();
        if (!servesDestination(cargo, voyage))
            throw DestinationNotServed();
    }

private:
    bool hasCapacity(const Cargo& cargo, const Voyage& voyage) const {
        double maxCapacity = voyage.capacity() * overbookingRatio_;
        return cargo.size() <= maxCapacity - voyage.bookedSize();
    }

    bool allowsHazardous(const Cargo& cargo, const Voyage& voyage) const {
        return !cargo.isHazardous() || voyage.allowsHazardous();
    }

    bool servesDestination(const Cargo& cargo, const Voyage& voyage) const {
        return voyage.stops().contains(cargo.destination());
    }
};
```

변화:
- **"Overbooking Policy"**가 명시적 개념이 됨
- 조건이 한 곳에 집중
- 정책 변경이 쉬움 (새 클래스 추가)
- 테스트가 용이

---

## Specification 패턴

**Specification**은 가장 강력한 명시화 기법 중 하나다.

```
Specification = 비즈니스 규칙을 객체로 캡슐화
```

### 구조

```
┌─────────────────────────────────────────────────┐
│                 Specification                    │
├─────────────────────────────────────────────────┤
│  + is_satisfied_by(candidate) -> bool           │
│  + and(other: Specification) -> Specification   │
│  + or(other: Specification) -> Specification    │
│  + not() -> Specification                       │
└─────────────────────────────────────────────────┘
           ▲               ▲               ▲
           │               │               │
    ┌──────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐
    │ Hazardous   │ │ Destination │ │ Capacity    │
    │    Spec     │ │    Spec     │ │    Spec     │
    └─────────────┘ └─────────────┘ └─────────────┘
```

### 구현

```python
from abc import ABC, abstractmethod
from typing import Generic, TypeVar

T = TypeVar('T')


class Specification(ABC, Generic[T]):
    """비즈니스 규칙을 객체로"""

    @abstractmethod
    def is_satisfied_by(self, candidate: T) -> bool:
        pass

    def and_(self, other: "Specification[T]") -> "Specification[T]":
        return AndSpecification(self, other)

    def or_(self, other: "Specification[T]") -> "Specification[T]":
        return OrSpecification(self, other)

    def not_(self) -> "Specification[T]":
        return NotSpecification(self)


class AndSpecification(Specification[T]):
    def __init__(self, left: Specification[T], right: Specification[T]) -> None:
        self._left = left
        self._right = right

    def is_satisfied_by(self, candidate: T) -> bool:
        return (self._left.is_satisfied_by(candidate)
                and self._right.is_satisfied_by(candidate))


class OrSpecification(Specification[T]):
    def __init__(self, left: Specification[T], right: Specification[T]) -> None:
        self._left = left
        self._right = right

    def is_satisfied_by(self, candidate: T) -> bool:
        return (self._left.is_satisfied_by(candidate)
                or self._right.is_satisfied_by(candidate))


class NotSpecification(Specification[T]):
    def __init__(self, spec: Specification[T]) -> None:
        self._spec = spec

    def is_satisfied_by(self, candidate: T) -> bool:
        return not self._spec.is_satisfied_by(candidate)
```

### 화물 운송 시스템에 적용

```python
class RouteSpecification(Specification[Itinerary]):
    """경로 요구사항 — 출발지, 도착지, 기한"""

    def __init__(
        self,
        origin: Location,
        destination: Location,
        deadline: datetime
    ) -> None:
        self._origin = origin
        self._destination = destination
        self._deadline = deadline

    def is_satisfied_by(self, itinerary: Itinerary) -> bool:
        return (
            itinerary.origin == self._origin
            and itinerary.final_destination == self._destination
            and itinerary.final_arrival_date <= self._deadline
        )


class HazardousCargoSpecification(Specification[Voyage]):
    """위험물 허용 항해"""

    def is_satisfied_by(self, voyage: Voyage) -> bool:
        return voyage.allows_hazardous


class CapacitySpecification(Specification[Voyage]):
    """용량 여유가 있는 항해"""

    def __init__(self, required_capacity: float) -> None:
        self._required = required_capacity

    def is_satisfied_by(self, voyage: Voyage) -> bool:
        available = voyage.capacity - voyage.booked_size
        return available >= self._required


class DestinationSpecification(Specification[Voyage]):
    """특정 목적지를 경유하는 항해"""

    def __init__(self, destination: Location) -> None:
        self._destination = destination

    def is_satisfied_by(self, voyage: Voyage) -> bool:
        return self._destination in voyage.stops
```

### Specification 조합

```python
def find_suitable_voyages(
    cargo: Cargo,
    voyages: list[Voyage]
) -> list[Voyage]:
    """화물에 적합한 항해 찾기"""

    # 개별 Specification 생성
    capacity_spec = CapacitySpecification(cargo.size)
    destination_spec = DestinationSpecification(cargo.destination)

    # 위험물이면 위험물 허용 항해만
    if cargo.hazardous:
        hazardous_spec = HazardousCargoSpecification()
        combined = capacity_spec.and_(destination_spec).and_(hazardous_spec)
    else:
        combined = capacity_spec.and_(destination_spec)

    # Specification으로 필터링
    return [v for v in voyages if combined.is_satisfied_by(v)]


# 또는 더 선언적으로
class SuitableVoyageSpecification(Specification[Voyage]):
    """화물에 적합한 항해 조건"""

    def __init__(self, cargo: Cargo) -> None:
        self._spec = self._build_spec(cargo)

    def _build_spec(self, cargo: Cargo) -> Specification[Voyage]:
        base = (CapacitySpecification(cargo.size)
                .and_(DestinationSpecification(cargo.destination)))

        if cargo.hazardous:
            return base.and_(HazardousCargoSpecification())
        return base

    def is_satisfied_by(self, voyage: Voyage) -> bool:
        return self._spec.is_satisfied_by(voyage)
```

```cpp
// C++ 버전
template<typename T>
class Specification {
public:
    virtual ~Specification() = default;
    virtual bool isSatisfiedBy(const T& candidate) const = 0;

    std::unique_ptr<Specification<T>> andSpec(
        std::unique_ptr<Specification<T>> other) const {
        return std::make_unique<AndSpecification<T>>(
            clone(), std::move(other));
    }

    virtual std::unique_ptr<Specification<T>> clone() const = 0;
};

class CapacitySpecification : public Specification<Voyage> {
    double required_;

public:
    explicit CapacitySpecification(double required) : required_(required) {}

    bool isSatisfiedBy(const Voyage& voyage) const override {
        return voyage.availableCapacity() >= required_;
    }

    std::unique_ptr<Specification<Voyage>> clone() const override {
        return std::make_unique<CapacitySpecification>(required_);
    }
};
```

---

## 신호 2: 긴 if-else 체인

### Before — 상태별 분기

```python
class Cargo:
    def get_handling_instructions(self) -> str:
        if self._status == "NOT_RECEIVED":
            if self._itinerary is None:
                return "Waiting for routing"
            else:
                return f"Ready for pickup at {self._origin}"

        elif self._status == "IN_PORT":
            if self._current_location == self._destination:
                return "Ready for customer pickup"
            else:
                next_leg = self._itinerary.next_leg_from(self._current_location)
                if next_leg is None:
                    return "Misdirected - needs rerouting"
                else:
                    return f"Load onto {next_leg.voyage_number}"

        elif self._status == "ONBOARD":
            current_leg = self._itinerary.leg_on_voyage(self._current_voyage)
            return f"Unload at {current_leg.unload_location}"

        elif self._status == "CLAIMED":
            return "Delivery complete"

        else:
            return "Unknown status"
```

문제점:
- 상태별 로직이 한 메서드에 뭉쳐있음
- 새 상태 추가 시 메서드가 계속 커짐
- **처리 지침(Handling Instructions)**이라는 개념이 암묵적

### 💡 발견: State 객체

```python
from abc import ABC, abstractmethod


class DeliveryState(ABC):
    """인도 상태 — 암묵적 상태 머신을 명시적으로"""

    @abstractmethod
    def get_handling_instructions(self, cargo: "Cargo") -> str:
        pass

    @abstractmethod
    def next_state(self, event: "HandlingEvent") -> "DeliveryState":
        pass


class NotReceived(DeliveryState):
    def get_handling_instructions(self, cargo: "Cargo") -> str:
        if cargo.itinerary is None:
            return "Waiting for routing"
        return f"Ready for pickup at {cargo.origin}"

    def next_state(self, event: "HandlingEvent") -> DeliveryState:
        if event.type == HandlingEventType.RECEIVE:
            return InPort()
        return self


class InPort(DeliveryState):
    def get_handling_instructions(self, cargo: "Cargo") -> str:
        if cargo.current_location == cargo.destination:
            return "Ready for customer pickup"

        next_leg = cargo.itinerary.next_leg_from(cargo.current_location)
        if next_leg is None:
            return "Misdirected - needs rerouting"
        return f"Load onto {next_leg.voyage_number}"

    def next_state(self, event: "HandlingEvent") -> DeliveryState:
        if event.type == HandlingEventType.LOAD:
            return Onboard()
        if event.type == HandlingEventType.CLAIM:
            return Claimed()
        return self


class Onboard(DeliveryState):
    def get_handling_instructions(self, cargo: "Cargo") -> str:
        leg = cargo.itinerary.leg_on_voyage(cargo.current_voyage)
        return f"Unload at {leg.unload_location}"

    def next_state(self, event: "HandlingEvent") -> DeliveryState:
        if event.type == HandlingEventType.UNLOAD:
            return InPort()
        return self


class Claimed(DeliveryState):
    def get_handling_instructions(self, cargo: "Cargo") -> str:
        return "Delivery complete"

    def next_state(self, event: "HandlingEvent") -> DeliveryState:
        return self  # 최종 상태


class Cargo:
    def __init__(self, tracking_id: TrackingId) -> None:
        self._tracking_id = tracking_id
        self._state: DeliveryState = NotReceived()
        # ...

    def get_handling_instructions(self) -> str:
        return self._state.get_handling_instructions(self)

    def handle(self, event: HandlingEvent) -> None:
        self._state = self._state.next_state(event)
        # ...
```

변화:
- 각 상태가 **명시적 객체**
- 상태별 로직이 분리됨
- 상태 전이가 명확
- 새 상태 추가가 용이

---

## 신호 3: 긴 주석

### Before — 주석으로 설명

```python
class Cargo:
    def is_misdirected(self) -> bool:
        # 화물이 잘못된 방향으로 갔는지 확인
        # 현재 위치가 여정의 예상 경로에 없으면 잘못된 것
        # 단, 아직 선적되지 않은 경우는 제외
        # 또한 이미 도착지에 있으면 잘못된 게 아님
        if self._itinerary is None:
            return False
        if self._current_location == self._destination:
            return False
        if self._transport_status == "NOT_RECEIVED":
            return False
        return self._current_location not in self._itinerary.locations
```

주석이 길다는 것은 **개념이 숨어 있다**는 신호다.

### After — 개념을 객체로

```python
@dataclass(frozen=True)
class MisdirectionCheck:
    """오배송 검사 — 주석 내용이 클래스가 됨"""
    cargo: Cargo

    def is_misdirected(self) -> bool:
        if self._not_yet_routed():
            return False
        if self._not_yet_received():
            return False
        if self._already_at_destination():
            return False
        return self._not_on_expected_route()

    def _not_yet_routed(self) -> bool:
        return self.cargo.itinerary is None

    def _not_yet_received(self) -> bool:
        return self.cargo.transport_status == TransportStatus.NOT_RECEIVED

    def _already_at_destination(self) -> bool:
        return self.cargo.current_location == self.cargo.destination

    def _not_on_expected_route(self) -> bool:
        return self.cargo.current_location not in self.cargo.itinerary.locations


# 또는 Specification으로
class MisdirectedSpecification(Specification[Cargo]):
    """오배송 조건"""

    def is_satisfied_by(self, cargo: Cargo) -> bool:
        if cargo.itinerary is None:
            return False  # 라우팅 전
        if cargo.transport_status == TransportStatus.NOT_RECEIVED:
            return False  # 접수 전
        if cargo.current_location == cargo.destination:
            return False  # 이미 도착
        return cargo.current_location not in cargo.itinerary.locations
```

---

## 제약(Constraint)의 명시화

### Before — 제약이 흩어짐

```python
class Invoice:
    def add_line_item(self, item: LineItem) -> None:
        if len(self._line_items) >= 100:
            raise TooManyLineItems()
        if self._total() + item.amount > 1_000_000:
            raise InvoiceLimitExceeded()
        if self._status != "DRAFT":
            raise InvoiceNotEditable()
        self._line_items.append(item)

    def remove_line_item(self, item: LineItem) -> None:
        if len(self._line_items) <= 1:
            raise CannotRemoveLastItem()
        if self._status != "DRAFT":
            raise InvoiceNotEditable()
        self._line_items.remove(item)
```

제약이 여러 메서드에 반복되고, "왜 이 제약이 있는지" 불명확하다.

### After — 제약을 명시적으로

```python
class InvoiceConstraints:
    """인보이스 제약 조건 — 비즈니스 규칙을 명시"""

    MAX_LINE_ITEMS = 100
    MAX_AMOUNT = 1_000_000
    MIN_LINE_ITEMS = 1

    @classmethod
    def can_add_line_item(cls, invoice: "Invoice", item: LineItem) -> None:
        cls._check_editable(invoice)
        cls._check_line_item_count(invoice, count_delta=1)
        cls._check_amount_limit(invoice, item.amount)

    @classmethod
    def can_remove_line_item(cls, invoice: "Invoice") -> None:
        cls._check_editable(invoice)
        cls._check_minimum_items(invoice)

    @classmethod
    def _check_editable(cls, invoice: "Invoice") -> None:
        if invoice.status != InvoiceStatus.DRAFT:
            raise InvoiceNotEditable(
                f"Cannot modify invoice in {invoice.status} status"
            )

    @classmethod
    def _check_line_item_count(cls, invoice: "Invoice", count_delta: int) -> None:
        if len(invoice.line_items) + count_delta > cls.MAX_LINE_ITEMS:
            raise TooManyLineItems(
                f"Invoice cannot have more than {cls.MAX_LINE_ITEMS} items"
            )

    @classmethod
    def _check_minimum_items(cls, invoice: "Invoice") -> None:
        if len(invoice.line_items) <= cls.MIN_LINE_ITEMS:
            raise CannotRemoveLastItem(
                f"Invoice must have at least {cls.MIN_LINE_ITEMS} item"
            )

    @classmethod
    def _check_amount_limit(cls, invoice: "Invoice", additional: Money) -> None:
        if invoice.total + additional > cls.MAX_AMOUNT:
            raise InvoiceLimitExceeded(
                f"Invoice cannot exceed {cls.MAX_AMOUNT}"
            )


class Invoice:
    def add_line_item(self, item: LineItem) -> None:
        InvoiceConstraints.can_add_line_item(self, item)
        self._line_items.append(item)

    def remove_line_item(self, item: LineItem) -> None:
        InvoiceConstraints.can_remove_line_item(self)
        self._line_items.remove(item)
```

변화:
- 제약이 한 곳에 집중
- 제약의 이유가 명확 (상수 이름, 에러 메시지)
- 제약 변경이 용이
- 테스트가 쉬움

---

## 프로세스(Process)의 명시화

### Before — 프로세스가 서비스에 숨어있음

```python
class BookingApplicationService:
    def book_cargo(
        self,
        origin: str,
        destination: str,
        deadline: datetime
    ) -> str:
        # 1. 화물 생성
        cargo = Cargo(
            TrackingId.generate(),
            RouteSpecification(
                Location(origin),
                Location(destination),
                deadline
            )
        )

        # 2. 최적 경로 검색
        routes = self._routing_service.find_routes(
            cargo.route_specification
        )

        # 3. 첫 번째 경로 선택 (또는 로직)
        if routes:
            best_route = routes[0]
            cargo.assign_itinerary(best_route)

        # 4. 저장
        self._cargo_repository.save(cargo)

        # 5. 이벤트 발행
        self._event_publisher.publish(
            CargoBooked(cargo.tracking_id)
        )

        return str(cargo.tracking_id)
```

"예약 프로세스"가 메서드 안에 암묵적으로 존재한다.

### After — 프로세스를 명시적으로

```python
class BookingProcess:
    """화물 예약 프로세스 — 단계가 명시적"""

    def __init__(
        self,
        routing_service: RoutingService,
        cargo_repository: CargoRepository,
        event_publisher: EventPublisher
    ) -> None:
        self._routing_service = routing_service
        self._cargo_repository = cargo_repository
        self._event_publisher = event_publisher

    def execute(self, request: BookingRequest) -> BookingResult:
        # 각 단계가 명확한 메서드
        cargo = self._create_cargo(request)
        itinerary = self._find_best_route(cargo)
        self._assign_itinerary(cargo, itinerary)
        self._persist(cargo)
        self._notify(cargo)

        return BookingResult(
            tracking_id=cargo.tracking_id,
            itinerary=itinerary
        )

    def _create_cargo(self, request: BookingRequest) -> Cargo:
        return Cargo(
            TrackingId.generate(),
            RouteSpecification(
                Location(request.origin),
                Location(request.destination),
                request.deadline
            )
        )

    def _find_best_route(self, cargo: Cargo) -> Itinerary | None:
        routes = self._routing_service.find_routes(cargo.route_specification)
        return routes[0] if routes else None

    def _assign_itinerary(
        self,
        cargo: Cargo,
        itinerary: Itinerary | None
    ) -> None:
        if itinerary:
            cargo.assign_itinerary(itinerary)

    def _persist(self, cargo: Cargo) -> None:
        self._cargo_repository.save(cargo)

    def _notify(self, cargo: Cargo) -> None:
        self._event_publisher.publish(CargoBooked(cargo.tracking_id))


@dataclass(frozen=True)
class BookingRequest:
    """예약 요청 — 입력 파라미터 그룹"""
    origin: str
    destination: str
    deadline: datetime


@dataclass(frozen=True)
class BookingResult:
    """예약 결과 — 출력 파라미터 그룹"""
    tracking_id: TrackingId
    itinerary: Itinerary | None
```

변화:
- **BookingProcess**가 명시적 개념
- 각 단계가 메서드로 분리
- 입출력이 Value Object로 명시
- 테스트, 확장이 용이

---

## 암묵적 개념 발굴 기법

### 1. 도메인 전문가 대화에서

```
주의 깊게 들을 용어:

• "...하는 경우에는..." → 조건/Specification
• "...정책에 따라..." → Policy 객체
• "...규칙이 있어서..." → Constraint
• "...단계가 있어요..." → Process
• "...상태가 바뀌면..." → State 패턴
• "...종류가 다양해요..." → 다형성, Strategy
```

### 2. 코드 냄새에서

```
코드 냄새 → 숨은 개념:

• 긴 if-else → State 또는 Strategy
• 반복 조건 → Specification
• 긴 주석 → 개념 추출
• 플래그 인자 → 다형성
• 데이터 클래스 + 별도 로직 → 로직을 데이터로 이동
• 유사 메서드들 → 공통 개념 추출
```

### 3. 문헌에서

```
참고할 패턴 소스:

• Analysis Patterns (Fowler)
• Design Patterns (GoF)
• Domain-specific 패턴
• 업계 표준 용어
```

---

## 요약

**암묵적 개념을 명시적으로** 만들면 모델이 풍부해진다.

발굴 신호:
- 반복되는 조건 → **Specification**
- 긴 if-else → **State/Strategy**
- 긴 주석 → **새 클래스**
- 흩어진 제약 → **Constraint 객체**
- 숨은 단계들 → **Process 객체**

발굴 원천:
- **도메인 전문가 대화** — 용어에 주목
- **코드 냄새** — 리팩토링 기회
- **문헌** — 기존 패턴 참고

결과:
- 코드가 도메인 언어와 일치
- 변경이 쉬워짐
- 테스트가 용이
- 팀 커뮤니케이션 향상

다음 장에서는 **Supple Design** — 유연하고 사용하기 좋은 설계를 다룬다.
