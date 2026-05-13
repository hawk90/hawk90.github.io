---
title: "Ch 6: The Life Cycle of a Domain Object"
date: 2025-10-02T03:00:00
description: "Aggregate / Factory / Repository — 객체 라이프사이클 관리."
tags: [DDD, Aggregate, Factory, Repository]
series: "Domain-Driven Design"
seriesOrder: 6
---

## 도메인 객체의 생명주기

Entity는 생명주기를 가진다:

```
생성 (Creation)
    │
    ▼
┌───────────────────────────────────────┐
│           활성 상태 (Active)           │
│  • 메모리에 존재                        │
│  • 비즈니스 로직 수행                   │
│  • 상태 변경                           │
└───────────────────────────────────────┘
    │                 │
    ▼                 ▼
저장 (Store)      삭제 (Delete)
    │
    ▼
┌───────────────────────────────────────┐
│          보관 상태 (Stored)            │
│  • DB에 영속화                         │
│  • 메모리에서 해제                      │
└───────────────────────────────────────┘
    │
    ▼
재구성 (Reconstitute)
    │
    ▼
활성 상태로 복귀
```

이 생명주기를 관리하는 3가지 패턴:

| 패턴 | 역할 |
|-----|------|
| **Aggregate** | 일관성 경계 정의 |
| **Factory** | 복잡한 객체 생성 |
| **Repository** | 영속성 추상화 |

---

## Aggregate

**Aggregate**는 일관성(consistency)을 보장하는 경계다.

### 왜 필요한가?

```
문제: 여러 객체가 서로 참조할 때

┌─────────┐     ┌───────────┐     ┌─────┐
│  Cargo  │────►│ Itinerary │────►│ Leg │
└─────────┘     └───────────┘     └─────┘
     │                                 │
     └─────────────────────────────────┘
                   직접 참조?

• Cargo를 저장하면 Itinerary도 저장?
• Leg만 삭제해도 되나?
• 어디까지가 트랜잭션 경계?
```

### Aggregate 정의

```
Aggregate = 관련 객체들의 클러스터 + 일관성 규칙

┌─────────────────────────────────────────┐
│            Cargo Aggregate              │
│  ┌─────────────────────────────────┐   │
│  │     Cargo (Aggregate Root)      │   │
│  └─────────────────────────────────┘   │
│         │                │              │
│         ▼                ▼              │
│  ┌───────────┐    ┌───────────────┐    │
│  │ Itinerary │    │   Delivery    │    │
│  └───────────┘    └───────────────┘    │
│         │                               │
│         ▼                               │
│    ┌─────────┐                          │
│    │   Leg   │                          │
│    └─────────┘                          │
└─────────────────────────────────────────┘
      ↑
      │ 외부에서는 Root만 접근
```

### Aggregate Root

**Aggregate Root**: 외부에서 접근하는 유일한 진입점.

**C++**

```cpp
// Aggregate Root: Cargo
class Cargo {
public:
    Cargo(TrackingId trackingId, RouteSpecification routeSpec)
        : trackingId_(std::move(trackingId))
        , routeSpecification_(std::move(routeSpec))
        , delivery_(Delivery::notRouted())
    {}

    // 외부에서 Aggregate 내부를 직접 수정하지 못함
    // Root를 통해서만 조작

    void assignItinerary(Itinerary itinerary) {
        // 불변식 검증
        if (!routeSpecification_.isSatisfiedBy(itinerary)) {
            throw InvalidItineraryException{};
        }
        itinerary_ = std::move(itinerary);
        // Delivery도 함께 업데이트 (일관성 유지)
        delivery_ = Delivery::derivedFrom(
            routeSpecification_, itinerary_, HandlingHistory{}
        );
    }

    void specifyNewRoute(RouteSpecification newSpec) {
        routeSpecification_ = std::move(newSpec);
        // 기존 Itinerary가 새 조건을 만족하는지 재검증
        if (itinerary_ && !routeSpecification_.isSatisfiedBy(*itinerary_)) {
            delivery_ = delivery_.withRoutingStatus(RoutingStatus::MISROUTED);
        }
    }

    // 읽기 전용 접근
    const TrackingId& trackingId() const { return trackingId_; }
    const Delivery& delivery() const { return delivery_; }
    const std::optional<Itinerary>& itinerary() const { return itinerary_; }

private:
    TrackingId trackingId_;
    RouteSpecification routeSpecification_;
    std::optional<Itinerary> itinerary_;  // 내부 객체
    Delivery delivery_;                    // 내부 객체
};
```

**Python**

```python
# Aggregate Root: Cargo
class Cargo:
    """화물 Aggregate의 Root"""

    def __init__(
        self,
        tracking_id: TrackingId,
        route_specification: RouteSpecification
    ) -> None:
        self._tracking_id = tracking_id
        self._route_specification = route_specification
        self._itinerary: Itinerary | None = None  # 내부 객체
        self._delivery = Delivery.not_routed()    # 내부 객체

    def assign_itinerary(self, itinerary: Itinerary) -> None:
        """Root를 통해서만 Itinerary 할당"""
        # 불변식 검증
        if not self._route_specification.is_satisfied_by(itinerary):
            raise InvalidItineraryError()

        self._itinerary = itinerary
        # Delivery도 함께 업데이트 (일관성 유지)
        self._delivery = Delivery.derived_from(
            self._route_specification,
            itinerary,
            HandlingHistory()
        )

    def specify_new_route(self, new_spec: RouteSpecification) -> None:
        """경로 명세 변경"""
        self._route_specification = new_spec
        # 기존 Itinerary가 새 조건을 만족하는지 재검증
        if self._itinerary and not new_spec.is_satisfied_by(self._itinerary):
            self._delivery = self._delivery.with_routing_status(
                RoutingStatus.MISROUTED
            )

    @property
    def tracking_id(self) -> TrackingId:
        return self._tracking_id

    @property
    def delivery(self) -> Delivery:
        return self._delivery

    @property
    def itinerary(self) -> Itinerary | None:
        # 불변 객체라 반환해도 안전
        return self._itinerary
```

### Aggregate 규칙

```
1. Root만 외부 참조 가능
   - 외부: Cargo만 참조
   - 내부 객체(Itinerary, Leg)는 Root 통해서만 접근

2. 트랜잭션 경계 = Aggregate 경계
   - 하나의 트랜잭션에서 하나의 Aggregate만 수정
   - 여러 Aggregate 수정 시 → 이벤트/사가 패턴

3. 내부 불변식은 Root가 보장
   - Cargo가 Itinerary 할당 시 조건 검증
   - 외부에서 Leg를 직접 추가할 수 없음

4. 삭제 시 함께 삭제
   - Cargo 삭제 → Itinerary, Delivery도 삭제
```

### 다른 Aggregate 참조

```
Aggregate 간에는 ID로만 참조:

┌─────────────────────┐     ┌─────────────────────┐
│   Cargo Aggregate   │     │  Voyage Aggregate   │
│                     │     │                     │
│  Leg.voyageId ──────┼────►│  Voyage             │
│  (ID만 저장)         │     │                     │
└─────────────────────┘     └─────────────────────┘

잘못된 방법: Leg가 Voyage 객체를 직접 참조
올바른 방법: Leg가 VoyageId(식별자)만 저장
```

**C++**

```cpp
// Aggregate 간 ID 참조
class Leg {
public:
    Leg(VoyageId voyageId,  // Voyage 객체가 아닌 ID
        Location loadLocation,
        Location unloadLocation,
        DateTime loadTime,
        DateTime unloadTime)
        : voyageId_(std::move(voyageId))
        , loadLocation_(std::move(loadLocation))
        // ...
    {}

private:
    VoyageId voyageId_;  // 다른 Aggregate는 ID로만 참조
    Location loadLocation_;
    Location unloadLocation_;
    DateTime loadTime_;
    DateTime unloadTime_;
};
```

**Python**

```python
# Aggregate 간 ID 참조
@dataclass(frozen=True)
class Leg:
    voyage_id: VoyageId  # Voyage 객체가 아닌 ID
    load_location: Location
    unload_location: Location
    load_time: datetime
    unload_time: datetime
```

---

## Factory

**Factory**는 복잡한 객체 또는 Aggregate 생성을 캡슐화한다.

### 언제 필요한가?

```
Factory가 필요한 경우:
• 생성 로직이 복잡할 때
• 여러 객체를 조합해야 할 때
• 생성 로직이 도메인 지식을 포함할 때
• 다양한 방법으로 생성해야 할 때
```

### 화물 예약 Factory

**C++**

```cpp
// Factory: 복잡한 Aggregate 생성
class CargoFactory {
public:
    // 새 화물 생성 — 기본 방법
    static Cargo createNew(
        TrackingId trackingId,
        Location origin,
        Location destination,
        DateTime deadline
    ) {
        auto routeSpec = RouteSpecification{
            std::move(origin),
            std::move(destination),
            deadline
        };
        return Cargo{std::move(trackingId), std::move(routeSpec)};
    }

    // 화물 재구성 — DB에서 로드할 때
    static Cargo reconstitute(
        TrackingId trackingId,
        RouteSpecification routeSpec,
        std::optional<Itinerary> itinerary,
        Delivery delivery
    ) {
        // 내부 상태를 직접 설정하여 재구성
        return Cargo::reconstitute(
            std::move(trackingId),
            std::move(routeSpec),
            std::move(itinerary),
            std::move(delivery)
        );
    }
};

// Cargo 내부에 재구성용 팩토리 메서드
class Cargo {
public:
    // 일반 생성자
    Cargo(TrackingId trackingId, RouteSpecification routeSpec);

    // 재구성용 팩토리 메서드 (Repository에서 사용)
    static Cargo reconstitute(
        TrackingId trackingId,
        RouteSpecification routeSpec,
        std::optional<Itinerary> itinerary,
        Delivery delivery
    ) {
        Cargo cargo{std::move(trackingId), std::move(routeSpec)};
        cargo.itinerary_ = std::move(itinerary);
        cargo.delivery_ = std::move(delivery);
        return cargo;
    }

private:
    // friend class CargoFactory;  // 또는 friend 선언
};
```

**Python**

```python
# Factory: 복잡한 Aggregate 생성
class CargoFactory:
    """화물 생성 팩토리"""

    @staticmethod
    def create_new(
        tracking_id: TrackingId,
        origin: Location,
        destination: Location,
        deadline: datetime
    ) -> Cargo:
        """새 화물 생성 — 기본 방법"""
        route_spec = RouteSpecification(
            origin=origin,
            destination=destination,
            deadline=deadline
        )
        return Cargo(tracking_id, route_spec)

    @staticmethod
    def reconstitute(
        tracking_id: TrackingId,
        route_spec: RouteSpecification,
        itinerary: Itinerary | None,
        delivery: Delivery
    ) -> Cargo:
        """화물 재구성 — DB에서 로드할 때"""
        cargo = Cargo.__new__(Cargo)  # __init__ 우회
        cargo._tracking_id = tracking_id
        cargo._route_specification = route_spec
        cargo._itinerary = itinerary
        cargo._delivery = delivery
        return cargo


# 또는 Cargo 클래스 내에 클래스 메서드로
class Cargo:
    @classmethod
    def reconstitute(
        cls,
        tracking_id: TrackingId,
        route_spec: RouteSpecification,
        itinerary: Itinerary | None,
        delivery: Delivery
    ) -> "Cargo":
        """DB에서 재구성 (Repository 전용)"""
        cargo = cls.__new__(cls)
        cargo._tracking_id = tracking_id
        cargo._route_specification = route_spec
        cargo._itinerary = itinerary
        cargo._delivery = delivery
        return cargo
```

### Itinerary Factory

**C++**

```cpp
// 복잡한 Value Object 생성
class ItineraryFactory {
public:
    // 경로에서 Itinerary 생성
    static Itinerary createFromPath(
        const std::vector<VoyageSegment>& path,
        const VoyageRepository& voyageRepo
    ) {
        std::vector<Leg> legs;
        legs.reserve(path.size());

        for (const auto& segment : path) {
            auto voyage = voyageRepo.find(segment.voyageId);
            if (!voyage) {
                throw VoyageNotFoundException{segment.voyageId};
            }

            legs.emplace_back(
                segment.voyageId,
                segment.loadLocation,
                segment.unloadLocation,
                voyage->schedule().departureAt(segment.loadLocation),
                voyage->schedule().arrivalAt(segment.unloadLocation)
            );
        }

        return Itinerary{std::move(legs)};
    }
};
```

**Python**

```python
# 복잡한 Value Object 생성
class ItineraryFactory:
    """여정 생성 팩토리"""

    def __init__(self, voyage_repo: VoyageRepository) -> None:
        self._voyage_repo = voyage_repo

    def create_from_path(
        self,
        path: list[VoyageSegment]
    ) -> Itinerary:
        """경로에서 Itinerary 생성"""
        legs = []

        for segment in path:
            voyage = self._voyage_repo.find(segment.voyage_id)
            if voyage is None:
                raise VoyageNotFoundError(segment.voyage_id)

            leg = Leg(
                voyage_id=segment.voyage_id,
                load_location=segment.load_location,
                unload_location=segment.unload_location,
                load_time=voyage.schedule.departure_at(segment.load_location),
                unload_time=voyage.schedule.arrival_at(segment.unload_location)
            )
            legs.append(leg)

        return Itinerary(tuple(legs))
```

---

## Repository

**Repository**는 Aggregate의 영속성을 추상화한다.

### Repository의 역할

```
Repository = 컬렉션처럼 동작하는 저장소 추상화

도메인 관점:
• "화물 목록에서 ABC123을 찾아줘"
• "새 화물을 목록에 추가해줘"
• "이 화물을 목록에서 삭제해줘"

실제 구현:
• SQL 데이터베이스
• NoSQL 데이터베이스
• 파일 시스템
• 외부 API
```

### Repository 인터페이스

**C++**

```cpp
// Domain Layer: Repository 인터페이스
class CargoRepository {
public:
    virtual ~CargoRepository() = default;

    // 검색
    virtual std::optional<Cargo> find(const TrackingId& trackingId) = 0;

    // 조건 검색
    virtual std::vector<Cargo> findByRouteSpecification(
        const Location& origin,
        const Location& destination
    ) = 0;

    // 저장 (추가 또는 업데이트)
    virtual void save(const Cargo& cargo) = 0;

    // 삭제
    virtual void remove(const TrackingId& trackingId) = 0;

    // ID 생성
    virtual TrackingId nextTrackingId() = 0;
};

// Infrastructure Layer: SQL 구현
class SqlCargoRepository : public CargoRepository {
public:
    explicit SqlCargoRepository(DatabaseConnection& db)
        : db_(db) {}

    std::optional<Cargo> find(const TrackingId& trackingId) override {
        auto row = db_.queryOne(
            "SELECT * FROM cargos WHERE tracking_id = ?",
            trackingId.value()
        );
        if (!row) return std::nullopt;
        return reconstitute(*row);
    }

    void save(const Cargo& cargo) override {
        db_.transaction([&] {
            // Cargo 저장
            db_.upsert("cargos", toCargoRow(cargo));

            // Itinerary 저장 (Aggregate 내부 객체)
            if (cargo.itinerary()) {
                db_.deleteWhere("legs",
                    "cargo_id = ?", cargo.trackingId().value());
                for (const auto& leg : cargo.itinerary()->legs()) {
                    db_.insert("legs", toLegRow(cargo.trackingId(), leg));
                }
            }
        });
    }

private:
    Cargo reconstitute(const Row& row) {
        // DB 행 → Aggregate 재구성
        auto trackingId = TrackingId{row.get<std::string>("tracking_id")};
        auto routeSpec = reconstructRouteSpec(row);
        auto itinerary = reconstructItinerary(trackingId);
        auto delivery = reconstructDelivery(row);

        return CargoFactory::reconstitute(
            std::move(trackingId),
            std::move(routeSpec),
            std::move(itinerary),
            std::move(delivery)
        );
    }

    DatabaseConnection& db_;
};
```

**Python**

```python
# Domain Layer: Repository 인터페이스 (Protocol)
class CargoRepository(Protocol):
    """화물 저장소"""

    def find(self, tracking_id: TrackingId) -> Cargo | None:
        """화물 검색"""
        ...

    def find_by_route(
        self,
        origin: Location,
        destination: Location
    ) -> list[Cargo]:
        """조건 검색"""
        ...

    def save(self, cargo: Cargo) -> None:
        """저장 (추가 또는 업데이트)"""
        ...

    def remove(self, tracking_id: TrackingId) -> None:
        """삭제"""
        ...

    def next_tracking_id(self) -> TrackingId:
        """ID 생성"""
        ...


# Infrastructure Layer: SQL 구현
class SqlCargoRepository:
    """SQL 기반 CargoRepository"""

    def __init__(self, session: Session) -> None:
        self._session = session

    def find(self, tracking_id: TrackingId) -> Cargo | None:
        row = self._session.execute(
            text("SELECT * FROM cargos WHERE tracking_id = :id"),
            {"id": tracking_id.value}
        ).fetchone()

        if row is None:
            return None
        return self._reconstitute(row)

    def save(self, cargo: Cargo) -> None:
        with self._session.begin():
            # Cargo 저장
            self._upsert_cargo(cargo)

            # Itinerary 저장 (Aggregate 내부 객체)
            if cargo.itinerary is not None:
                self._delete_legs(cargo.tracking_id)
                for leg in cargo.itinerary.legs:
                    self._insert_leg(cargo.tracking_id, leg)

    def _reconstitute(self, row: Row) -> Cargo:
        """DB 행 → Aggregate 재구성"""
        tracking_id = TrackingId(row.tracking_id)
        route_spec = self._reconstruct_route_spec(row)
        itinerary = self._reconstruct_itinerary(tracking_id)
        delivery = self._reconstruct_delivery(row)

        return Cargo.reconstitute(
            tracking_id,
            route_spec,
            itinerary,
            delivery
        )
```

### 테스트용 In-Memory Repository

**C++**

```cpp
// 테스트용 In-Memory Repository
class InMemoryCargoRepository : public CargoRepository {
public:
    std::optional<Cargo> find(const TrackingId& trackingId) override {
        auto it = cargos_.find(trackingId.value());
        if (it == cargos_.end()) return std::nullopt;
        return it->second;
    }

    void save(const Cargo& cargo) override {
        cargos_[cargo.trackingId().value()] = cargo;
    }

    void remove(const TrackingId& trackingId) override {
        cargos_.erase(trackingId.value());
    }

    TrackingId nextTrackingId() override {
        return TrackingId{fmt::format("CARGO{:05d}", nextId_++)};
    }

private:
    std::unordered_map<std::string, Cargo> cargos_;
    int nextId_ = 1;
};
```

**Python**

```python
# 테스트용 In-Memory Repository
class InMemoryCargoRepository:
    """테스트용 In-Memory Repository"""

    def __init__(self) -> None:
        self._cargos: dict[str, Cargo] = {}
        self._next_id = 1

    def find(self, tracking_id: TrackingId) -> Cargo | None:
        return self._cargos.get(tracking_id.value)

    def save(self, cargo: Cargo) -> None:
        self._cargos[cargo.tracking_id.value] = cargo

    def remove(self, tracking_id: TrackingId) -> None:
        self._cargos.pop(tracking_id.value, None)

    def next_tracking_id(self) -> TrackingId:
        tracking_id = TrackingId(f"CARGO{self._next_id:05d}")
        self._next_id += 1
        return tracking_id
```

---

## 생명주기 전체 흐름

```
1. 생성 (Factory)
┌─────────────────────────────────────────────────┐
│  trackingId = cargoRepo.nextTrackingId()        │
│  cargo = CargoFactory.createNew(                │
│      trackingId, origin, destination, deadline  │
│  )                                              │
│  cargoRepo.save(cargo)                          │
└─────────────────────────────────────────────────┘

2. 조회 (Repository)
┌─────────────────────────────────────────────────┐
│  cargo = cargoRepo.find(trackingId)             │
│  // DB에서 Aggregate 전체 재구성                 │
└─────────────────────────────────────────────────┘

3. 수정 (Aggregate Root)
┌─────────────────────────────────────────────────┐
│  cargo = cargoRepo.find(trackingId)             │
│  cargo.assignItinerary(itinerary)  // Root 통해 │
│  cargoRepo.save(cargo)                          │
└─────────────────────────────────────────────────┘

4. 삭제 (Repository)
┌─────────────────────────────────────────────────┐
│  cargoRepo.remove(trackingId)                   │
│  // Aggregate 전체 삭제 (Cargo, Itinerary, ...)  │
└─────────────────────────────────────────────────┘
```

### Application Service에서의 사용

**C++**

```cpp
class BookingService {
public:
    BookingService(CargoRepository& cargoRepo,
                   RoutingService& routingService)
        : cargoRepo_(cargoRepo)
        , routingService_(routingService) {}

    // 화물 예약
    TrackingId bookNewCargo(const std::string& origin,
                            const std::string& destination,
                            DateTime deadline) {
        // 1. ID 생성 (Repository)
        auto trackingId = cargoRepo_.nextTrackingId();

        // 2. Aggregate 생성 (Factory)
        auto cargo = CargoFactory::createNew(
            trackingId,
            Location{origin},
            Location{destination},
            deadline
        );

        // 3. 저장 (Repository)
        cargoRepo_.save(cargo);

        return trackingId;
    }

    // 여정 할당
    void assignCargoToRoute(const TrackingId& trackingId,
                            const Itinerary& itinerary) {
        // 1. 조회 (Repository)
        auto cargo = cargoRepo_.find(trackingId);
        if (!cargo) {
            throw CargoNotFoundException{trackingId};
        }

        // 2. 비즈니스 로직 (Aggregate Root)
        cargo->assignItinerary(itinerary);

        // 3. 저장 (Repository)
        cargoRepo_.save(*cargo);
    }
};
```

**Python**

```python
class BookingService:
    """화물 예약 Application Service"""

    def __init__(
        self,
        cargo_repo: CargoRepository,
        routing_service: RoutingService
    ) -> None:
        self._cargo_repo = cargo_repo
        self._routing_service = routing_service

    def book_new_cargo(
        self,
        origin: str,
        destination: str,
        deadline: datetime
    ) -> TrackingId:
        """화물 예약"""
        # 1. ID 생성 (Repository)
        tracking_id = self._cargo_repo.next_tracking_id()

        # 2. Aggregate 생성 (Factory)
        cargo = CargoFactory.create_new(
            tracking_id,
            Location(origin),
            Location(destination),
            deadline
        )

        # 3. 저장 (Repository)
        self._cargo_repo.save(cargo)

        return tracking_id

    def assign_cargo_to_route(
        self,
        tracking_id: TrackingId,
        itinerary: Itinerary
    ) -> None:
        """여정 할당"""
        # 1. 조회 (Repository)
        cargo = self._cargo_repo.find(tracking_id)
        if cargo is None:
            raise CargoNotFoundError(tracking_id)

        # 2. 비즈니스 로직 (Aggregate Root)
        cargo.assign_itinerary(itinerary)

        # 3. 저장 (Repository)
        self._cargo_repo.save(cargo)
```

---

## Aggregate 설계 지침

### 작게 유지

```
나쁜 설계:
┌────────────────────────────────────────────┐
│  Order Aggregate                           │
│  • Order (Root)                            │
│  • Customer (!)                            │
│  • Product (!)                             │
│  • PaymentHistory (!)                      │
│  • ShippingAddress (!)                     │
│  → 너무 큼, 동시성 문제                     │
└────────────────────────────────────────────┘

좋은 설계:
┌─────────────────┐  ┌──────────────────────┐
│ Order Aggregate │  │ Customer Aggregate   │
│ • Order         │  │ • Customer           │
│ • OrderLine     │  └──────────────────────┘
│ • customerId ───┼──► (ID로만 참조)
└─────────────────┘
```

### 진짜 불변식만 포함

```
불변식(Invariant) 예시:
• "주문의 총액 = 각 라인 합계" ← Order Aggregate 내
• "재고 수량 >= 0" ← Inventory Aggregate 내

불변식 아닌 것:
• "고객이 존재해야 함" ← 다른 Aggregate, 외부 검증
• "상품이 판매 가능해야 함" ← 다른 Aggregate, 외부 검증
```

---

## 요약

| 패턴 | 역할 | 핵심 |
|-----|------|-----|
| **Aggregate** | 일관성 경계 | Root만 외부 접근, 트랜잭션 단위 |
| **Factory** | 복잡한 생성 | 생성 로직 캡슐화, 재구성 지원 |
| **Repository** | 영속성 추상화 | 컬렉션처럼 동작, DB 숨김 |

설계 원칙:
- Aggregate는 **작게** 유지
- Aggregate 간에는 **ID로만** 참조
- **하나의 트랜잭션**에서 **하나의 Aggregate**만 수정
- Repository는 **Aggregate 단위**로 저장/조회

다음 장에서는 지금까지의 개념을 **확장 예제**로 통합해본다.
