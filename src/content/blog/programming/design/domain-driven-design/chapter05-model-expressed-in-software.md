---
title: "Ch 5: A Model Expressed in Software"
date: 2025-10-01T05:00:00
description: "Entity / Value Object / Service / Module — 빌딩 블록 4가지."
tags: [DDD, Entity, Value Object, Service, Module]
series: "Domain-Driven Design"
seriesOrder: 5
draft: true
---

## 도메인 모델의 구성요소

Domain Layer를 구성하는 4가지 빌딩 블록:

```
┌─────────────────────────────────────────────┐
│              Domain Layer                    │
├─────────────────────────────────────────────┤
│  Entity       - 식별자로 구분되는 객체        │
│  Value Object - 속성으로 정의되는 객체        │
│  Service      - 객체에 속하지 않는 동작       │
│  Module       - 응집된 개념의 컨테이너        │
└─────────────────────────────────────────────┘
```

---

## Entity

**Entity**는 고유한 식별자(Identity)로 구분되는 객체다.

### 핵심 특징

```
Entity의 특징:
• 식별자가 같으면 같은 객체
• 속성이 바뀌어도 동일성 유지
• 생명주기(lifecycle)를 가짐
• 변경 가능(mutable)
```

### 언제 Entity인가?

```
질문: "이 두 객체가 같은지 어떻게 판단하는가?"

답이 "ID로 비교" → Entity
답이 "모든 속성으로 비교" → Value Object
```

### 화물 운송 예시

**C++**

```cpp
// Entity: 식별자로 구분
class Cargo {
public:
    Cargo(TrackingId trackingId, RouteSpecification routeSpec)
        : trackingId_(std::move(trackingId))
        , routeSpecification_(std::move(routeSpec))
    {}

    // 식별자 접근
    const TrackingId& trackingId() const { return trackingId_; }

    // 속성은 변경될 수 있음
    void specifyNewRoute(RouteSpecification newSpec) {
        routeSpecification_ = std::move(newSpec);
    }

    void assignItinerary(Itinerary itinerary) {
        itinerary_ = std::move(itinerary);
    }

    // 동등성: ID로만 비교
    bool operator==(const Cargo& other) const {
        return trackingId_ == other.trackingId_;
    }

private:
    const TrackingId trackingId_;  // 불변 식별자
    RouteSpecification routeSpecification_;  // 변경 가능
    std::optional<Itinerary> itinerary_;     // 변경 가능
};
```

**Python**

```python
# Entity: 식별자로 구분
class Cargo:
    """운송 화물 — Entity"""

    def __init__(
        self,
        tracking_id: TrackingId,
        route_specification: RouteSpecification
    ) -> None:
        self._tracking_id = tracking_id  # 불변 식별자
        self._route_specification = route_specification
        self._itinerary: Itinerary | None = None

    @property
    def tracking_id(self) -> TrackingId:
        return self._tracking_id

    def specify_new_route(self, new_spec: RouteSpecification) -> None:
        """속성은 변경될 수 있음"""
        self._route_specification = new_spec

    def assign_itinerary(self, itinerary: Itinerary) -> None:
        self._itinerary = itinerary

    # 동등성: ID로만 비교
    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Cargo):
            return NotImplemented
        return self._tracking_id == other._tracking_id

    def __hash__(self) -> int:
        return hash(self._tracking_id)
```

### Entity의 동등성

```
화물 ABC123:
  Day 1: 서울→부산, 미배정
  Day 2: 서울→부산, 여정 할당
  Day 3: 서울→대구→부산 (경로 변경)

속성이 바뀌어도 같은 화물이다!
→ ID(ABC123)가 같으면 동일한 Entity
```

---

## Value Object

**Value Object**는 속성의 조합으로 정의되는 객체다.

### 핵심 특징

```
Value Object의 특징:
• 모든 속성이 같으면 같은 객체
• 식별자 없음
• 불변(immutable)
• 교체 가능 (side-effect free)
```

### 언제 Value Object인가?

```
질문: "이 객체가 무엇인지 어떻게 설명하는가?"

답이 "ID가 X인 객체" → Entity
답이 "A, B, C 속성을 가진 것" → Value Object
```

### 화물 운송 예시

**C++**

```cpp
// Value Object: 속성으로 정의, 불변
class Location {
public:
    explicit Location(std::string code)
        : code_(std::move(code)) {}

    const std::string& code() const { return code_; }

    // 동등성: 모든 속성으로 비교
    bool operator==(const Location& other) const {
        return code_ == other.code_;
    }

private:
    const std::string code_;  // 불변
};

// Value Object: 복합 속성
class RouteSpecification {
public:
    RouteSpecification(Location origin,
                       Location destination,
                       DateTime deadline)
        : origin_(std::move(origin))
        , destination_(std::move(destination))
        , deadline_(deadline) {}

    const Location& origin() const { return origin_; }
    const Location& destination() const { return destination_; }
    DateTime deadline() const { return deadline_; }

    // 비즈니스 로직
    bool isSatisfiedBy(const Itinerary& itinerary) const {
        return itinerary.origin() == origin_
            && itinerary.finalDestination() == destination_
            && itinerary.finalArrivalDate() <= deadline_;
    }

    // 동등성: 모든 속성으로 비교
    bool operator==(const RouteSpecification& other) const {
        return origin_ == other.origin_
            && destination_ == other.destination_
            && deadline_ == other.deadline_;
    }

private:
    const Location origin_;
    const Location destination_;
    const DateTime deadline_;
};
```

**Python**

```python
# Value Object: 속성으로 정의, 불변
@dataclass(frozen=True)  # frozen=True → 불변
class Location:
    """위치 — Value Object"""
    code: str

    # __eq__, __hash__ 자동 생성 (모든 필드로 비교)


# Value Object: 복합 속성
@dataclass(frozen=True)
class RouteSpecification:
    """경로 명세 — Value Object"""
    origin: Location
    destination: Location
    deadline: datetime

    def is_satisfied_by(self, itinerary: Itinerary) -> bool:
        """비즈니스 로직: 여정이 조건을 만족하는가?"""
        return (
            itinerary.origin == self.origin
            and itinerary.final_destination == self.destination
            and itinerary.final_arrival_date <= self.deadline
        )


# Value Object: 여정
@dataclass(frozen=True)
class Itinerary:
    """여정 — Value Object (Leg들의 순서 있는 집합)"""
    legs: tuple[Leg, ...]  # tuple로 불변 보장

    @property
    def origin(self) -> Location:
        return self.legs[0].load_location

    @property
    def final_destination(self) -> Location:
        return self.legs[-1].unload_location

    @property
    def final_arrival_date(self) -> datetime:
        return self.legs[-1].unload_time
```

### Value Object의 불변성

```
왜 불변이어야 하는가?

┌───────────────────────────────────────┐
│  cargo1.routeSpec = RouteSpec(A, B)   │
│  cargo2.routeSpec = cargo1.routeSpec  │  ← 같은 객체 공유
│                                       │
│  cargo1.routeSpec.destination = C     │  ← 만약 변경 가능하면?
│                                       │
│  cargo2의 목적지도 C로 바뀜!           │  ← 의도치 않은 부작용
└───────────────────────────────────────┘

불변이면 안전하게 공유 가능!
```

### Value Object 교체

**C++**

```cpp
// Value Object는 수정이 아닌 교체
class Cargo {
public:
    void changeDestination(Location newDestination) {
        // 잘못된 방법: routeSpec_.setDestination(newDestination);

        // 올바른 방법: 새 Value Object로 교체
        routeSpecification_ = RouteSpecification{
            routeSpecification_.origin(),
            newDestination,  // 새 목적지
            routeSpecification_.deadline()
        };
    }
};
```

**Python**

```python
# Value Object는 수정이 아닌 교체
class Cargo:
    def change_destination(self, new_destination: Location) -> None:
        # frozen=True이므로 수정 불가, 새 객체 생성
        self._route_specification = RouteSpecification(
            origin=self._route_specification.origin,
            destination=new_destination,  # 새 목적지
            deadline=self._route_specification.deadline
        )

    # 또는 dataclasses.replace 사용
    def change_destination_v2(self, new_destination: Location) -> None:
        from dataclasses import replace
        self._route_specification = replace(
            self._route_specification,
            destination=new_destination
        )
```

---

## Entity vs Value Object 비교

| 특성 | Entity | Value Object |
|-----|--------|--------------|
| 동등성 | ID로 비교 | 모든 속성으로 비교 |
| 변경 | 변경 가능 | 불변 (교체만 가능) |
| 생명주기 | 있음 (추적) | 없음 |
| 공유 | 주의 필요 | 안전하게 공유 |
| 예시 | Cargo, Customer | Location, Money, DateRange |

### 판단 기준

```
"서울"이라는 Location:
  → 속성(code="Seoul")으로 완전히 정의됨
  → 어떤 "서울"이든 같음
  → Value Object

"화물 ABC123":
  → 속성이 바뀌어도 추적해야 함
  → 고유한 식별자 필요
  → Entity
```

---

## Service

**Service**는 특정 Entity나 Value Object에 속하지 않는 도메인 동작이다.

### 언제 Service인가?

```
동작이 특정 객체에 속하지 않을 때:
• 여러 객체가 협력해야 할 때
• 객체에 넣으면 어색할 때
• 도메인 전문가가 동사로 표현할 때
```

### 경로 탐색 서비스 예시

**C++**

```cpp
// Domain Service: 경로 탐색
// 어떤 Entity에도 속하지 않는 도메인 동작
class RoutingService {
public:
    virtual ~RoutingService() = default;

    // 화물의 경로 명세에 맞는 여정들을 찾는다
    virtual std::vector<Itinerary> fetchRoutesFor(
        const RouteSpecification& routeSpec
    ) = 0;
};

// 사용
class BookingService {
public:
    void requestPossibleRoutes(const TrackingId& trackingId) {
        auto cargo = cargoRepo_.find(trackingId);
        if (!cargo) throw CargoNotFoundException{trackingId};

        // 도메인 서비스 호출
        auto routes = routingService_.fetchRoutesFor(
            cargo->routeSpecification()
        );

        // 결과 처리...
    }

private:
    CargoRepository& cargoRepo_;
    RoutingService& routingService_;  // Domain Service
};
```

**Python**

```python
# Domain Service: 경로 탐색
# 어떤 Entity에도 속하지 않는 도메인 동작
class RoutingService(Protocol):
    """경로 탐색 서비스 — Domain Service"""

    def fetch_routes_for(
        self,
        route_spec: RouteSpecification
    ) -> list[Itinerary]:
        """화물의 경로 명세에 맞는 여정들을 찾는다"""
        ...


# 구현 (Infrastructure Layer)
class GraphTraversalRoutingService:
    """그래프 탐색 기반 경로 서비스"""

    def __init__(self, graph_service: ExternalGraphService) -> None:
        self._graph_service = graph_service

    def fetch_routes_for(
        self,
        route_spec: RouteSpecification
    ) -> list[Itinerary]:
        # 외부 서비스 호출
        paths = self._graph_service.find_paths(
            route_spec.origin.code,
            route_spec.destination.code
        )
        return [self._to_itinerary(p) for p in paths]
```

### Service의 특징

```
Domain Service 특징:
• Stateless (상태 없음)
• 도메인 언어로 명명
• 인터페이스는 Domain Layer에
• 구현은 Domain 또는 Infrastructure에

예:
RoutingService.fetchRoutesFor(routeSpec)
  → "경로 서비스가 경로 명세에 대한 여정들을 가져온다"
  → 도메인 언어!
```

### Application Service vs Domain Service

```
Application Service:
• 작업 조율 (트랜잭션, 보안)
• 도메인 객체 조회 → 메서드 호출 → 저장
• 얇음

Domain Service:
• 도메인 로직 수행
• 객체에 넣기 어색한 동작
• 도메인 언어로 표현

예:
BookingService (Application) → RoutingService (Domain)
```

---

## Module (Package)

**Module**은 응집된 도메인 개념들의 컨테이너다.

### 좋은 Module의 특징

```
좋은 Module:
• 높은 응집도 — 관련된 것끼리 모음
• 낮은 결합도 — 다른 Module과 최소 의존
• 도메인 언어로 명명 — booking, routing, tracking

나쁜 Module:
• 기술 기준으로 분리 — entities/, services/, repositories/
• 너무 세분화 — 클래스마다 패키지
• 순환 의존 — A → B → C → A
```

### 디렉토리 구조

```
# 좋은 구조: 도메인 개념으로 분리
src/domain/
├── booking/           # 예약 도메인
│   ├── cargo.cpp
│   ├── route_specification.cpp
│   └── booking_policy.cpp
│
├── routing/           # 경로 도메인
│   ├── itinerary.cpp
│   ├── leg.cpp
│   └── routing_service.cpp
│
├── tracking/          # 추적 도메인
│   ├── handling_event.cpp
│   └── delivery.cpp
│
└── shared/            # 공유 개념
    ├── location.cpp
    └── voyage.cpp

# 나쁜 구조: 기술 기준으로 분리
src/domain/
├── entities/          # 기술 분류 ❌
│   ├── cargo.cpp
│   ├── itinerary.cpp
│   └── location.cpp
├── value_objects/
│   └── ...
└── services/
    └── ...
```

---

## 흔한 함정: 모든 것이 Entity

```
안티패턴:
┌─────────────────────────────────────────┐
│  모든 테이블에 ID 컬럼 있으니까...        │
│  → 전부 Entity로 만들자!                │
│  → Location도 Entity                   │
│  → Money도 Entity                      │
│  → DateRange도 Entity                  │
└─────────────────────────────────────────┘

결과:
• 불필요한 식별자 관리
• 불필요한 생명주기 추적
• 불변성 포기 → 버그
• 안전한 공유 불가능
```

### 올바른 판단

```
Location은 Entity인가?
"서울역"이라는 위치가 두 개 있을 때,
다른 Location인가, 같은 Location인가?

→ "Seoul Station" 코드가 같으면 같은 Location
→ ID가 아닌 속성으로 정의됨
→ Value Object!

Money(금액)는 Entity인가?
10,000원이 두 개 있을 때,
다른 Money인가, 같은 Money인가?

→ 금액이 같으면 같은 Money
→ Value Object!
```

---

## 완전한 예시

**C++**

```cpp
// ===== Value Objects =====
class Location {
    std::string code_;
public:
    explicit Location(std::string code) : code_(std::move(code)) {}
    const std::string& code() const { return code_; }
    bool operator==(const Location& o) const { return code_ == o.code_; }
};

class Leg {
    Voyage voyage_;
    Location loadLocation_;
    Location unloadLocation_;
    DateTime loadTime_;
    DateTime unloadTime_;
public:
    // 생성자, getter, operator==
};

class Itinerary {
    std::vector<Leg> legs_;
public:
    explicit Itinerary(std::vector<Leg> legs) : legs_(std::move(legs)) {}
    Location origin() const { return legs_.front().loadLocation(); }
    Location finalDestination() const { return legs_.back().unloadLocation(); }
    // operator==: 모든 legs 비교
};

class RouteSpecification {
    Location origin_;
    Location destination_;
    DateTime deadline_;
public:
    bool isSatisfiedBy(const Itinerary& itinerary) const;
    // operator==: 모든 필드 비교
};

// ===== Entity =====
class Cargo {
    const TrackingId trackingId_;  // 불변 식별자
    RouteSpecification routeSpec_;
    std::optional<Itinerary> itinerary_;
    Delivery delivery_;

public:
    Cargo(TrackingId id, RouteSpecification spec);

    const TrackingId& trackingId() const { return trackingId_; }

    void assignItinerary(Itinerary itinerary);
    void specifyNewRoute(RouteSpecification spec);

    bool operator==(const Cargo& o) const {
        return trackingId_ == o.trackingId_;  // ID만 비교
    }
};

// ===== Domain Service =====
class RoutingService {
public:
    virtual std::vector<Itinerary> fetchRoutesFor(
        const RouteSpecification& spec) = 0;
};
```

**Python**

```python
# ===== Value Objects =====
@dataclass(frozen=True)
class Location:
    code: str


@dataclass(frozen=True)
class Leg:
    voyage: Voyage
    load_location: Location
    unload_location: Location
    load_time: datetime
    unload_time: datetime


@dataclass(frozen=True)
class Itinerary:
    legs: tuple[Leg, ...]

    @property
    def origin(self) -> Location:
        return self.legs[0].load_location

    @property
    def final_destination(self) -> Location:
        return self.legs[-1].unload_location


@dataclass(frozen=True)
class RouteSpecification:
    origin: Location
    destination: Location
    deadline: datetime

    def is_satisfied_by(self, itinerary: Itinerary) -> bool:
        return (
            itinerary.origin == self.origin
            and itinerary.final_destination == self.destination
        )


# ===== Entity =====
class Cargo:
    """운송 화물 — Entity"""

    def __init__(
        self,
        tracking_id: TrackingId,
        route_specification: RouteSpecification
    ) -> None:
        self._tracking_id = tracking_id
        self._route_specification = route_specification
        self._itinerary: Itinerary | None = None

    @property
    def tracking_id(self) -> TrackingId:
        return self._tracking_id

    def assign_itinerary(self, itinerary: Itinerary) -> None:
        self._itinerary = itinerary

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Cargo):
            return NotImplemented
        return self._tracking_id == other._tracking_id

    def __hash__(self) -> int:
        return hash(self._tracking_id)


# ===== Domain Service =====
class RoutingService(Protocol):
    def fetch_routes_for(
        self, route_spec: RouteSpecification
    ) -> list[Itinerary]: ...
```

---

## 요약

| 구성요소 | 핵심 개념 | 예시 |
|---------|----------|------|
| **Entity** | 식별자로 구분, 변경 가능 | Cargo, Customer |
| **Value Object** | 속성으로 정의, 불변 | Location, Money, DateRange |
| **Service** | 객체에 속하지 않는 동작 | RoutingService |
| **Module** | 응집된 개념의 컨테이너 | booking, routing, tracking |

판단 기준:
- "ID로 비교?" → **Entity**
- "모든 속성으로 비교?" → **Value Object**
- "어떤 객체에 넣기 어색?" → **Service**

다음 장에서는 Entity와 Aggregate의 **생명주기 관리**를 다룬다.
