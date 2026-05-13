---
title: "Ch 7: Using the Language: An Extended Example"
date: 2025-10-02T04:00:00
description: "선적(cargo) 시스템 종합 예제. 모델 진화 / 빌딩 블록 적용."
tags: [DDD, Case Study, Cargo]
series: "Domain-Driven Design"
seriesOrder: 7
draft: true
---

## 화물 운송 시스템

지금까지 배운 모든 개념을 화물 운송 시스템에 통합 적용한다.

```
시스템 목표:
┌─────────────────────────────────────────────────┐
│  고객이 화물을 예약하고,                          │
│  시스템이 최적 경로를 찾아,                       │
│  화물의 운송 상태를 추적한다.                     │
└─────────────────────────────────────────────────┘
```

---

## 도메인 모델 개요

### 주요 개념

```
┌─────────────────────────────────────────────────┐
│                  도메인 모델                     │
├─────────────────────────────────────────────────┤
│  Customer      — 고객 (화물 예약자)              │
│  Cargo         — 화물 (운송 대상)                │
│  RouteSpec     — 경로 명세 (요구사항)             │
│  Itinerary     — 여정 (실제 운송 계획)            │
│  Leg           — 구간 (여정의 단위)               │
│  Voyage        — 항해 (선박/항공기 운행)          │
│  Location      — 위치 (항구/공항)                │
│  HandlingEvent — 처리 이벤트 (선적/하역 등)       │
│  Delivery      — 인도 상태 (현재 운송 상태)       │
└─────────────────────────────────────────────────┘
```

### Entity vs Value Object 식별

| 개념 | 유형 | 이유 |
|-----|------|------|
| Customer | Entity | 고유 ID로 구분, 상태 변경 |
| Cargo | Entity | 추적 ID로 구분, 생명주기 |
| Voyage | Entity | 항해 번호로 구분, 일정 관리 |
| RouteSpecification | Value Object | 속성으로 정의, 불변 |
| Itinerary | Value Object | Leg 집합, 불변 |
| Leg | Value Object | 속성으로 정의, 불변 |
| Location | Value Object | 코드로 정의, 불변 |
| HandlingEvent | Entity | 발생 시점/장소로 구분 |
| Delivery | Value Object | 파생된 상태, 불변 |

---

## 전체 모델 구조

**Python**

```python
from dataclasses import dataclass
from datetime import datetime
from enum import Enum, auto
from typing import Protocol


# ========== Value Objects ==========

@dataclass(frozen=True)
class Location:
    """위치 (항구/공항)"""
    code: str
    name: str


@dataclass(frozen=True)
class TrackingId:
    """화물 추적 ID"""
    value: str


@dataclass(frozen=True)
class VoyageNumber:
    """항해 번호"""
    value: str


class TransportStatus(Enum):
    NOT_RECEIVED = auto()  # 미접수
    IN_PORT = auto()       # 항구 대기
    ONBOARD = auto()       # 운송 중
    CLAIMED = auto()       # 수령 완료
    UNKNOWN = auto()


class RoutingStatus(Enum):
    NOT_ROUTED = auto()    # 미지정
    ROUTED = auto()        # 경로 지정됨
    MISROUTED = auto()     # 잘못된 경로


@dataclass(frozen=True)
class RouteSpecification:
    """경로 명세 — 화물의 운송 요구사항"""
    origin: Location
    destination: Location
    arrival_deadline: datetime

    def is_satisfied_by(self, itinerary: "Itinerary") -> bool:
        """여정이 이 명세를 만족하는가?"""
        return (
            itinerary.initial_departure_location == self.origin
            and itinerary.final_arrival_location == self.destination
            and itinerary.final_arrival_date <= self.arrival_deadline
        )


@dataclass(frozen=True)
class Leg:
    """여정의 단위 구간"""
    voyage_number: VoyageNumber
    load_location: Location
    unload_location: Location
    load_time: datetime
    unload_time: datetime


@dataclass(frozen=True)
class Itinerary:
    """여정 — 운송 계획"""
    legs: tuple[Leg, ...]

    @property
    def initial_departure_location(self) -> Location:
        return self.legs[0].load_location

    @property
    def final_arrival_location(self) -> Location:
        return self.legs[-1].unload_location

    @property
    def final_arrival_date(self) -> datetime:
        return self.legs[-1].unload_time


@dataclass(frozen=True)
class Delivery:
    """인도 상태 — 화물의 현재 운송 상태 (파생됨)"""
    transport_status: TransportStatus
    routing_status: RoutingStatus
    current_voyage: VoyageNumber | None
    last_known_location: Location | None
    last_event: "HandlingEvent | None"
    eta: datetime | None
    is_unloaded_at_destination: bool
    is_misdirected: bool

    @classmethod
    def not_routed(cls) -> "Delivery":
        """미경로 상태"""
        return cls(
            transport_status=TransportStatus.NOT_RECEIVED,
            routing_status=RoutingStatus.NOT_ROUTED,
            current_voyage=None,
            last_known_location=None,
            last_event=None,
            eta=None,
            is_unloaded_at_destination=False,
            is_misdirected=False
        )

    @classmethod
    def derived_from(
        cls,
        route_spec: RouteSpecification,
        itinerary: Itinerary | None,
        history: "HandlingHistory"
    ) -> "Delivery":
        """경로 명세, 여정, 처리 이력으로부터 인도 상태 계산"""
        last_event = history.most_recent_event

        # 경로 상태 결정
        if itinerary is None:
            routing_status = RoutingStatus.NOT_ROUTED
        elif route_spec.is_satisfied_by(itinerary):
            routing_status = RoutingStatus.ROUTED
        else:
            routing_status = RoutingStatus.MISROUTED

        # 운송 상태 및 현재 위치 결정
        transport_status, location, voyage = cls._derive_transport_status(
            last_event, itinerary
        )

        # ETA 계산
        eta = itinerary.final_arrival_date if itinerary else None

        # 목적지 도착 확인
        is_unloaded = cls._check_unloaded_at_destination(
            last_event, route_spec.destination
        )

        return cls(
            transport_status=transport_status,
            routing_status=routing_status,
            current_voyage=voyage,
            last_known_location=location,
            last_event=last_event,
            eta=eta,
            is_unloaded_at_destination=is_unloaded,
            is_misdirected=routing_status == RoutingStatus.MISROUTED
        )
```

**C++**

```cpp
// ========== Value Objects ==========

class Location {
public:
    Location(std::string code, std::string name)
        : code_(std::move(code)), name_(std::move(name)) {}

    const std::string& code() const { return code_; }
    const std::string& name() const { return name_; }

    bool operator==(const Location& other) const {
        return code_ == other.code_;
    }

private:
    std::string code_;
    std::string name_;
};

class RouteSpecification {
public:
    RouteSpecification(Location origin, Location destination,
                       DateTime arrivalDeadline)
        : origin_(std::move(origin))
        , destination_(std::move(destination))
        , arrivalDeadline_(arrivalDeadline) {}

    bool isSatisfiedBy(const Itinerary& itinerary) const {
        return itinerary.initialDepartureLocation() == origin_
            && itinerary.finalArrivalLocation() == destination_
            && itinerary.finalArrivalDate() <= arrivalDeadline_;
    }

    const Location& origin() const { return origin_; }
    const Location& destination() const { return destination_; }

private:
    Location origin_;
    Location destination_;
    DateTime arrivalDeadline_;
};

class Itinerary {
public:
    explicit Itinerary(std::vector<Leg> legs)
        : legs_(std::move(legs)) {}

    const Location& initialDepartureLocation() const {
        return legs_.front().loadLocation();
    }

    const Location& finalArrivalLocation() const {
        return legs_.back().unloadLocation();
    }

    DateTime finalArrivalDate() const {
        return legs_.back().unloadTime();
    }

    const std::vector<Leg>& legs() const { return legs_; }

private:
    std::vector<Leg> legs_;
};
```

---

## Aggregate 설계

### Cargo Aggregate

```
┌────────────────────────────────────────────────┐
│               Cargo Aggregate                  │
│  ┌──────────────────────────────────────────┐ │
│  │          Cargo (Root)                    │ │
│  │  • trackingId                            │ │
│  │  • routeSpecification                    │ │
│  │  • itinerary                             │ │
│  │  • delivery                              │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  불변식:                                        │
│  • itinerary가 있으면 routeSpec을 만족해야 함    │
│  • delivery는 항상 현재 상태를 정확히 반영       │
└────────────────────────────────────────────────┘
```

**Python**

```python
# ========== Cargo Aggregate ==========

class Cargo:
    """화물 — Aggregate Root"""

    def __init__(
        self,
        tracking_id: TrackingId,
        route_specification: RouteSpecification
    ) -> None:
        self._tracking_id = tracking_id
        self._route_specification = route_specification
        self._itinerary: Itinerary | None = None
        self._delivery = Delivery.not_routed()

    @property
    def tracking_id(self) -> TrackingId:
        return self._tracking_id

    @property
    def route_specification(self) -> RouteSpecification:
        return self._route_specification

    @property
    def itinerary(self) -> Itinerary | None:
        return self._itinerary

    @property
    def delivery(self) -> Delivery:
        return self._delivery

    def assign_to_route(self, itinerary: Itinerary) -> None:
        """
        여정을 할당한다.

        새 여정이 경로 명세를 만족해야 한다는 불변식을 검증하지 않음.
        호출자가 적절한 여정을 선택하도록 신뢰함.
        """
        self._itinerary = itinerary
        self._delivery = Delivery.derived_from(
            self._route_specification,
            itinerary,
            HandlingHistory.empty()
        )

    def specify_new_route(self, route_specification: RouteSpecification) -> None:
        """
        경로 명세를 변경한다.

        기존 여정이 새 명세를 만족하지 않으면 MISROUTED 상태가 됨.
        """
        self._route_specification = route_specification
        self._delivery = Delivery.derived_from(
            route_specification,
            self._itinerary,
            HandlingHistory.empty()  # 이력은 별도 조회 필요
        )

    def derive_delivery_progress(self, history: HandlingHistory) -> None:
        """
        처리 이력을 기반으로 인도 상태를 재계산한다.
        """
        self._delivery = Delivery.derived_from(
            self._route_specification,
            self._itinerary,
            history
        )

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Cargo):
            return NotImplemented
        return self._tracking_id == other._tracking_id

    def __hash__(self) -> int:
        return hash(self._tracking_id)
```

**C++**

```cpp
// ========== Cargo Aggregate ==========

class Cargo {
public:
    Cargo(TrackingId trackingId, RouteSpecification routeSpec)
        : trackingId_(std::move(trackingId))
        , routeSpecification_(std::move(routeSpec))
        , delivery_(Delivery::notRouted())
    {}

    // === 조회 ===
    const TrackingId& trackingId() const { return trackingId_; }
    const RouteSpecification& routeSpecification() const {
        return routeSpecification_;
    }
    const std::optional<Itinerary>& itinerary() const { return itinerary_; }
    const Delivery& delivery() const { return delivery_; }

    // === 명령 ===
    void assignToRoute(Itinerary itinerary) {
        itinerary_ = std::move(itinerary);
        delivery_ = Delivery::derivedFrom(
            routeSpecification_, itinerary_, HandlingHistory::empty()
        );
    }

    void specifyNewRoute(RouteSpecification routeSpec) {
        routeSpecification_ = std::move(routeSpec);
        delivery_ = Delivery::derivedFrom(
            routeSpecification_, itinerary_, HandlingHistory::empty()
        );
    }

    void deriveDeliveryProgress(const HandlingHistory& history) {
        delivery_ = Delivery::derivedFrom(
            routeSpecification_, itinerary_, history
        );
    }

    // === 동등성 ===
    bool operator==(const Cargo& other) const {
        return trackingId_ == other.trackingId_;
    }

private:
    TrackingId trackingId_;
    RouteSpecification routeSpecification_;
    std::optional<Itinerary> itinerary_;
    Delivery delivery_;
};
```

### HandlingEvent 관리

```
HandlingEvent는 별도 Aggregate?
아니면 Cargo Aggregate 내부?

선택: 별도 Aggregate
이유:
• 이벤트는 한 번 생성되면 변경되지 않음
• 독립적인 생명주기
• 조회 성능 고려 (이벤트만 조회하는 경우)
• Cargo와 다른 트랜잭션 경계

┌──────────────────────┐     ┌──────────────────────┐
│   Cargo Aggregate    │     │ HandlingEvent Aggr.  │
│                      │     │                      │
│  cargo.trackingId ◄──┼─────┼── event.cargoId     │
│                      │     │                      │
└──────────────────────┘     └──────────────────────┘
           │
           └── ID로만 참조
```

**Python**

```python
class HandlingEventType(Enum):
    RECEIVE = auto()   # 접수
    LOAD = auto()      # 선적
    UNLOAD = auto()    # 하역
    CUSTOMS = auto()   # 세관
    CLAIM = auto()     # 수령


@dataclass(frozen=True)
class HandlingEvent:
    """처리 이벤트 — 화물에 발생한 물리적 이벤트"""
    event_type: HandlingEventType
    cargo_id: TrackingId      # Cargo Aggregate는 ID로만 참조
    voyage_number: VoyageNumber | None
    location: Location
    completion_time: datetime
    registration_time: datetime

    @classmethod
    def receive(
        cls,
        cargo_id: TrackingId,
        location: Location,
        completion_time: datetime
    ) -> "HandlingEvent":
        """화물 접수 이벤트 생성"""
        return cls(
            event_type=HandlingEventType.RECEIVE,
            cargo_id=cargo_id,
            voyage_number=None,
            location=location,
            completion_time=completion_time,
            registration_time=datetime.now()
        )

    @classmethod
    def load(
        cls,
        cargo_id: TrackingId,
        voyage: VoyageNumber,
        location: Location,
        completion_time: datetime
    ) -> "HandlingEvent":
        """선적 이벤트 생성"""
        return cls(
            event_type=HandlingEventType.LOAD,
            cargo_id=cargo_id,
            voyage_number=voyage,
            location=location,
            completion_time=completion_time,
            registration_time=datetime.now()
        )


class HandlingHistory:
    """처리 이력"""

    def __init__(self, events: list[HandlingEvent] | None = None) -> None:
        self._events = sorted(
            events or [],
            key=lambda e: e.completion_time
        )

    @classmethod
    def empty(cls) -> "HandlingHistory":
        return cls([])

    @property
    def most_recent_event(self) -> HandlingEvent | None:
        return self._events[-1] if self._events else None

    def add(self, event: HandlingEvent) -> "HandlingHistory":
        """새 이벤트 추가 (불변, 새 객체 반환)"""
        return HandlingHistory(self._events + [event])
```

---

## Repository 설계

**Python**

```python
# ========== Repository Interfaces ==========

class CargoRepository(Protocol):
    """화물 저장소"""

    def find(self, tracking_id: TrackingId) -> Cargo | None: ...
    def save(self, cargo: Cargo) -> None: ...
    def next_tracking_id(self) -> TrackingId: ...


class HandlingEventRepository(Protocol):
    """처리 이벤트 저장소"""

    def store(self, event: HandlingEvent) -> None: ...

    def lookup_handling_history_of(
        self, cargo_id: TrackingId
    ) -> HandlingHistory: ...


class VoyageRepository(Protocol):
    """항해 저장소"""

    def find(self, voyage_number: VoyageNumber) -> "Voyage | None": ...


class LocationRepository(Protocol):
    """위치 저장소"""

    def find(self, code: str) -> Location | None: ...
```

**C++**

```cpp
// ========== Repository Interfaces ==========

class CargoRepository {
public:
    virtual ~CargoRepository() = default;
    virtual std::optional<Cargo> find(const TrackingId& id) = 0;
    virtual void save(const Cargo& cargo) = 0;
    virtual TrackingId nextTrackingId() = 0;
};

class HandlingEventRepository {
public:
    virtual ~HandlingEventRepository() = default;
    virtual void store(const HandlingEvent& event) = 0;
    virtual HandlingHistory lookupHandlingHistoryOf(
        const TrackingId& cargoId) = 0;
};
```

---

## Application Service

**Python**

```python
# ========== Application Services ==========

class BookingService:
    """예약 서비스"""

    def __init__(
        self,
        cargo_repo: CargoRepository,
        location_repo: LocationRepository,
        routing_service: "RoutingService"
    ) -> None:
        self._cargo_repo = cargo_repo
        self._location_repo = location_repo
        self._routing_service = routing_service

    def book_new_cargo(
        self,
        origin_code: str,
        destination_code: str,
        arrival_deadline: datetime
    ) -> TrackingId:
        """새 화물을 예약한다."""
        # 위치 조회
        origin = self._location_repo.find(origin_code)
        destination = self._location_repo.find(destination_code)

        if origin is None or destination is None:
            raise UnknownLocationError()

        # ID 생성
        tracking_id = self._cargo_repo.next_tracking_id()

        # 경로 명세 생성
        route_spec = RouteSpecification(origin, destination, arrival_deadline)

        # Cargo 생성 및 저장
        cargo = Cargo(tracking_id, route_spec)
        self._cargo_repo.save(cargo)

        return tracking_id

    def request_possible_routes(
        self, tracking_id: TrackingId
    ) -> list[Itinerary]:
        """가능한 경로들을 요청한다."""
        cargo = self._cargo_repo.find(tracking_id)
        if cargo is None:
            raise UnknownCargoError(tracking_id)

        return self._routing_service.fetch_routes_for(
            cargo.route_specification
        )

    def assign_cargo_to_route(
        self,
        tracking_id: TrackingId,
        itinerary: Itinerary
    ) -> None:
        """화물에 경로를 할당한다."""
        cargo = self._cargo_repo.find(tracking_id)
        if cargo is None:
            raise UnknownCargoError(tracking_id)

        cargo.assign_to_route(itinerary)
        self._cargo_repo.save(cargo)

    def change_destination(
        self,
        tracking_id: TrackingId,
        new_destination_code: str
    ) -> None:
        """화물의 목적지를 변경한다."""
        cargo = self._cargo_repo.find(tracking_id)
        if cargo is None:
            raise UnknownCargoError(tracking_id)

        new_destination = self._location_repo.find(new_destination_code)
        if new_destination is None:
            raise UnknownLocationError()

        # 새 경로 명세 생성
        new_route_spec = RouteSpecification(
            origin=cargo.route_specification.origin,
            destination=new_destination,
            arrival_deadline=cargo.route_specification.arrival_deadline
        )

        cargo.specify_new_route(new_route_spec)
        self._cargo_repo.save(cargo)


class HandlingEventService:
    """처리 이벤트 서비스"""

    def __init__(
        self,
        cargo_repo: CargoRepository,
        event_repo: HandlingEventRepository,
        voyage_repo: VoyageRepository,
        location_repo: LocationRepository
    ) -> None:
        self._cargo_repo = cargo_repo
        self._event_repo = event_repo
        self._voyage_repo = voyage_repo
        self._location_repo = location_repo

    def register_handling_event(
        self,
        tracking_id: TrackingId,
        voyage_number: VoyageNumber | None,
        location_code: str,
        event_type: HandlingEventType,
        completion_time: datetime
    ) -> None:
        """처리 이벤트를 등록한다."""
        # 검증
        cargo = self._cargo_repo.find(tracking_id)
        if cargo is None:
            raise UnknownCargoError(tracking_id)

        location = self._location_repo.find(location_code)
        if location is None:
            raise UnknownLocationError()

        if voyage_number:
            voyage = self._voyage_repo.find(voyage_number)
            if voyage is None:
                raise UnknownVoyageError(voyage_number)

        # 이벤트 생성 및 저장
        event = HandlingEvent(
            event_type=event_type,
            cargo_id=tracking_id,
            voyage_number=voyage_number,
            location=location,
            completion_time=completion_time,
            registration_time=datetime.now()
        )
        self._event_repo.store(event)

        # Cargo의 Delivery 상태 업데이트
        history = self._event_repo.lookup_handling_history_of(tracking_id)
        cargo.derive_delivery_progress(history)
        self._cargo_repo.save(cargo)
```

---

## Domain Service

**Python**

```python
# ========== Domain Services ==========

class RoutingService(Protocol):
    """경로 탐색 서비스 — Domain Service"""

    def fetch_routes_for(
        self, route_spec: RouteSpecification
    ) -> list[Itinerary]:
        """경로 명세를 만족하는 여정들을 찾는다."""
        ...


# Infrastructure 구현
class ExternalRoutingService:
    """외부 경로 탐색 시스템 연동"""

    def __init__(self, external_api: ExternalGraphAPI) -> None:
        self._api = external_api

    def fetch_routes_for(
        self, route_spec: RouteSpecification
    ) -> list[Itinerary]:
        # 외부 API 호출
        transit_paths = self._api.find_shortest_paths(
            route_spec.origin.code,
            route_spec.destination.code,
            route_spec.arrival_deadline
        )

        # 외부 응답 → 도메인 객체 변환
        return [self._to_itinerary(path) for path in transit_paths]

    def _to_itinerary(self, path: TransitPath) -> Itinerary:
        legs = tuple(
            Leg(
                voyage_number=VoyageNumber(edge.voyage_number),
                load_location=Location(edge.from_node, edge.from_name),
                unload_location=Location(edge.to_node, edge.to_name),
                load_time=edge.from_date,
                unload_time=edge.to_date
            )
            for edge in path.edges
        )
        return Itinerary(legs)
```

---

## 전체 흐름 예시

```
1. 화물 예약
┌─────────────────────────────────────────────────────────────┐
│  booking_service.book_new_cargo("Seoul", "Busan", deadline) │
│  → TrackingId("ABC123")                                     │
└─────────────────────────────────────────────────────────────┘

2. 경로 탐색
┌─────────────────────────────────────────────────────────────┐
│  routes = booking_service.request_possible_routes("ABC123") │
│  → [Itinerary([Leg(...), Leg(...)]), ...]                  │
└─────────────────────────────────────────────────────────────┘

3. 경로 할당
┌─────────────────────────────────────────────────────────────┐
│  booking_service.assign_cargo_to_route("ABC123", routes[0]) │
│  → Cargo.delivery.routing_status = ROUTED                   │
└─────────────────────────────────────────────────────────────┘

4. 화물 접수
┌─────────────────────────────────────────────────────────────┐
│  handling_service.register_handling_event(                  │
│      "ABC123", None, "Seoul", RECEIVE, now                  │
│  )                                                          │
│  → Cargo.delivery.transport_status = IN_PORT                │
└─────────────────────────────────────────────────────────────┘

5. 선적
┌─────────────────────────────────────────────────────────────┐
│  handling_service.register_handling_event(                  │
│      "ABC123", "V001", "Seoul", LOAD, now                   │
│  )                                                          │
│  → Cargo.delivery.transport_status = ONBOARD                │
│  → Cargo.delivery.current_voyage = V001                     │
└─────────────────────────────────────────────────────────────┘

6. 하역 (목적지)
┌─────────────────────────────────────────────────────────────┐
│  handling_service.register_handling_event(                  │
│      "ABC123", "V001", "Busan", UNLOAD, now                 │
│  )                                                          │
│  → Cargo.delivery.is_unloaded_at_destination = True         │
└─────────────────────────────────────────────────────────────┘

7. 수령
┌─────────────────────────────────────────────────────────────┐
│  handling_service.register_handling_event(                  │
│      "ABC123", None, "Busan", CLAIM, now                    │
│  )                                                          │
│  → Cargo.delivery.transport_status = CLAIMED                │
└─────────────────────────────────────────────────────────────┘
```

---

## 요약

이 예제에서 적용한 DDD 개념:

| 개념 | 적용 |
|-----|------|
| **Ubiquitous Language** | Cargo, Itinerary, HandlingEvent 등 도메인 용어 |
| **Entity** | Cargo, Voyage, HandlingEvent |
| **Value Object** | Location, RouteSpecification, Itinerary, Leg, Delivery |
| **Aggregate** | Cargo(Root + Itinerary + Delivery), HandlingEvent |
| **Repository** | CargoRepository, HandlingEventRepository |
| **Domain Service** | RoutingService |
| **Application Service** | BookingService, HandlingEventService |

핵심 설계 결정:
- **Delivery는 파생 상태** — 매번 계산하여 일관성 보장
- **HandlingEvent는 별도 Aggregate** — 독립적 생명주기
- **Aggregate 간 ID 참조** — Leg는 VoyageNumber만 저장

다음 장에서는 모델이 **갑자기 명확해지는 순간(Breakthrough)**을 다룬다.
