---
title: "Ch 4: Isolating the Domain"
date: 2026-05-01T04:00:00
description: "Layered Architecture — 도메인 계층 분리. UI / Application / Domain / Infrastructure."
tags: [DDD, Layered Architecture, Domain Layer]
series: "Domain-Driven Design"
seriesOrder: 4
draft: true
---

## 왜 도메인을 격리하는가?

도메인 로직이 UI, DB, 네트워크 코드와 섞이면:

```
문제점:
┌────────────────────────────────────────────┐
│  버튼 클릭 핸들러 안에서...                  │
│  • SQL 쿼리 실행                           │
│  • 비즈니스 규칙 검증                        │
│  • UI 갱신                                 │
│  • 이메일 발송                             │
│  → 전부 한 곳에!                           │
└────────────────────────────────────────────┘

결과:
• 도메인 로직을 찾기 어려움
• 테스트 불가능
• 재사용 불가능
• 변경 시 전체 영향
```

도메인 모델을 보호하려면 **격리(Isolation)**가 필요하다.

---

## Layered Architecture

DDD는 4개 계층을 제안한다:

```
┌─────────────────────────────────────────────┐
│          User Interface (UI)                │
│     사용자와 상호작용 / HTTP 요청 처리         │
├─────────────────────────────────────────────┤
│          Application Layer                  │
│     작업 조율 / 트랜잭션 / 얇은 계층           │
├─────────────────────────────────────────────┤
│          Domain Layer ★                     │
│     비즈니스 로직 / 핵심 모델 / 규칙          │
├─────────────────────────────────────────────┤
│          Infrastructure Layer               │
│     DB / 메시지 큐 / 파일 시스템 / 외부 API   │
└─────────────────────────────────────────────┘

의존 방향: 위 → 아래 (단방향)
```

### 각 계층의 책임

| 계층 | 책임 | 예시 |
|-----|------|-----|
| **UI** | 표현, 입력 수신 | Controller, View, CLI |
| **Application** | 작업 조율, 트랜잭션 | ApplicationService |
| **Domain** | 비즈니스 로직 | Entity, Value Object, Service |
| **Infrastructure** | 기술적 구현 | Repository 구현, DB, 외부 API |

---

## 계층별 구현

### User Interface Layer

사용자의 요청을 받아 Application Layer에 전달.

**C++**

```cpp
// UI Layer: HTTP 컨트롤러 (간략화)
class CargoController {
public:
    explicit CargoController(BookingService& bookingService)
        : bookingService_(bookingService) {}

    HttpResponse bookCargo(const HttpRequest& request) {
        // 1. 요청 파싱
        auto origin = request.param("origin");
        auto destination = request.param("destination");
        auto deadline = DateTime::parse(request.param("deadline"));

        // 2. Application Layer 호출
        auto trackingId = bookingService_.bookNewCargo(
            origin, destination, deadline
        );

        // 3. 응답 생성
        return HttpResponse::created()
            .json({{"trackingId", trackingId.value()}});
    }

private:
    BookingService& bookingService_;  // Application Layer
};
```

**Python**

```python
# UI Layer: HTTP 컨트롤러 (Flask 예시)
from flask import Blueprint, request, jsonify

cargo_bp = Blueprint("cargo", __name__)

@cargo_bp.post("/cargos")
def book_cargo():
    """화물 예약 엔드포인트"""
    # 1. 요청 파싱
    data = request.get_json()
    origin = data["origin"]
    destination = data["destination"]
    deadline = datetime.fromisoformat(data["deadline"])

    # 2. Application Layer 호출
    booking_service = get_booking_service()  # DI 컨테이너에서
    tracking_id = booking_service.book_new_cargo(
        origin, destination, deadline
    )

    # 3. 응답 생성
    return jsonify({"trackingId": tracking_id.value}), 201
```

UI 계층은:
- 도메인 로직을 **포함하지 않음**
- 요청/응답 변환만 담당
- Application Layer에 위임

---

### Application Layer

작업을 조율하고 도메인 객체에게 위임. **얇아야 한다.**

**C++**

```cpp
// Application Layer: 얇은 서비스
class BookingService {
public:
    BookingService(CargoRepository& cargoRepo,
                   RoutingService& routingService)
        : cargoRepo_(cargoRepo)
        , routingService_(routingService) {}

    // 화물 예약 — 작업 조율만
    TrackingId bookNewCargo(const std::string& origin,
                            const std::string& destination,
                            DateTime deadline) {
        // 1. ID 생성
        auto trackingId = cargoRepo_.nextTrackingId();

        // 2. 도메인 객체 생성 (도메인 로직은 Cargo 내부에)
        auto routeSpec = RouteSpecification{
            Location{origin},
            Location{destination},
            deadline
        };
        auto cargo = Cargo{trackingId, routeSpec};

        // 3. 저장
        cargoRepo_.save(cargo);

        return trackingId;
    }

    // 여정 할당 — 작업 조율만
    void assignCargoToRoute(const TrackingId& trackingId,
                            const Itinerary& itinerary) {
        // 1. 조회
        auto cargo = cargoRepo_.find(trackingId);
        if (!cargo) {
            throw CargoNotFoundException{trackingId};
        }

        // 2. 도메인 로직 호출 (Cargo가 판단)
        cargo->assignItinerary(itinerary);

        // 3. 저장
        cargoRepo_.save(*cargo);
    }

private:
    CargoRepository& cargoRepo_;
    RoutingService& routingService_;
};
```

**Python**

```python
# Application Layer: 얇은 서비스
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
        """화물 예약 — 작업 조율만"""
        # 1. ID 생성
        tracking_id = self._cargo_repo.next_tracking_id()

        # 2. 도메인 객체 생성 (도메인 로직은 Cargo 내부에)
        route_spec = RouteSpecification(
            origin=Location(origin),
            destination=Location(destination),
            deadline=deadline
        )
        cargo = Cargo(tracking_id, route_spec)

        # 3. 저장
        self._cargo_repo.save(cargo)

        return tracking_id

    def assign_cargo_to_route(
        self,
        tracking_id: TrackingId,
        itinerary: Itinerary
    ) -> None:
        """여정 할당 — 작업 조율만"""
        # 1. 조회
        cargo = self._cargo_repo.find(tracking_id)
        if cargo is None:
            raise CargoNotFoundError(tracking_id)

        # 2. 도메인 로직 호출 (Cargo가 판단)
        cargo.assign_itinerary(itinerary)

        # 3. 저장
        self._cargo_repo.save(cargo)
```

Application Layer는:
- **비즈니스 로직 없음** (판단하지 않음)
- 조회 → 도메인 호출 → 저장 패턴
- 트랜잭션 경계 관리

---

### Domain Layer

비즈니스의 핵심. **두꺼워야 한다.**

**C++**

```cpp
// Domain Layer: 핵심 비즈니스 로직
class Cargo {
public:
    Cargo(TrackingId trackingId, RouteSpecification routeSpec)
        : trackingId_(std::move(trackingId))
        , routeSpecification_(std::move(routeSpec))
        , delivery_(Delivery::notRouted())
    {}

    // 비즈니스 로직: 여정 할당
    void assignItinerary(Itinerary itinerary) {
        itinerary_ = std::move(itinerary);
        // 인도 상태 재계산 — 도메인 로직!
        delivery_ = delivery_.updateOnRouting(
            routeSpecification_, *itinerary_
        );
    }

    // 비즈니스 로직: 경로 변경
    void specifyNewRoute(RouteSpecification newRouteSpec) {
        routeSpecification_ = std::move(newRouteSpec);
        // 기존 여정이 새 조건을 만족하는지 재검증
        delivery_ = delivery_.updateOnRouting(
            routeSpecification_, itinerary_
        );
    }

    // 비즈니스 질문: 잘못된 경로인가?
    bool isMisrouted() const {
        return delivery_.routingStatus() == RoutingStatus::MISROUTED;
    }

    // 비즈니스 규칙: 처리 이벤트 등록
    void registerHandlingEvent(const HandlingEvent& event) {
        handlingHistory_.add(event);
        delivery_ = Delivery::derivedFrom(
            routeSpecification_, itinerary_, handlingHistory_
        );
    }

private:
    TrackingId trackingId_;
    RouteSpecification routeSpecification_;
    std::optional<Itinerary> itinerary_;
    Delivery delivery_;
    HandlingHistory handlingHistory_;
};

// Domain Layer: Value Object
class RouteSpecification {
public:
    RouteSpecification(Location origin,
                       Location destination,
                       DateTime deadline)
        : origin_(std::move(origin))
        , destination_(std::move(destination))
        , deadline_(deadline) {}

    // 비즈니스 규칙: 여정이 조건을 만족하는가?
    bool isSatisfiedBy(const Itinerary& itinerary) const {
        return itinerary.origin() == origin_
            && itinerary.finalDestination() == destination_
            && itinerary.finalArrivalDate() <= deadline_;
    }

private:
    Location origin_;
    Location destination_;
    DateTime deadline_;
};
```

**Python**

```python
# Domain Layer: 핵심 비즈니스 로직
class Cargo:
    """운송 화물 — 도메인의 핵심 엔티티"""

    def __init__(
        self,
        tracking_id: TrackingId,
        route_specification: RouteSpecification
    ) -> None:
        self._tracking_id = tracking_id
        self._route_specification = route_specification
        self._itinerary: Itinerary | None = None
        self._delivery = Delivery.not_routed()
        self._handling_history = HandlingHistory()

    def assign_itinerary(self, itinerary: Itinerary) -> None:
        """비즈니스 로직: 여정 할당"""
        self._itinerary = itinerary
        # 인도 상태 재계산 — 도메인 로직!
        self._delivery = self._delivery.update_on_routing(
            self._route_specification, itinerary
        )

    def specify_new_route(self, new_spec: RouteSpecification) -> None:
        """비즈니스 로직: 경로 변경"""
        self._route_specification = new_spec
        # 기존 여정이 새 조건을 만족하는지 재검증
        self._delivery = self._delivery.update_on_routing(
            new_spec, self._itinerary
        )

    @property
    def is_misrouted(self) -> bool:
        """비즈니스 질문: 잘못된 경로인가?"""
        return self._delivery.routing_status == RoutingStatus.MISROUTED

    def register_handling_event(self, event: HandlingEvent) -> None:
        """비즈니스 규칙: 처리 이벤트 등록"""
        self._handling_history.add(event)
        self._delivery = Delivery.derived_from(
            self._route_specification,
            self._itinerary,
            self._handling_history
        )


# Domain Layer: Value Object
@dataclass(frozen=True)
class RouteSpecification:
    """경로 명세 — 화물의 운송 요구사항"""
    origin: Location
    destination: Location
    deadline: datetime

    def is_satisfied_by(self, itinerary: Itinerary) -> bool:
        """비즈니스 규칙: 여정이 조건을 만족하는가?"""
        return (
            itinerary.origin == self.origin
            and itinerary.final_destination == self.destination
            and itinerary.final_arrival_date <= self.deadline
        )
```

Domain Layer는:
- **모든 비즈니스 로직** 포함
- 외부 의존성 없음 (순수 도메인)
- 테스트하기 쉬움

---

### Infrastructure Layer

기술적 구현 세부사항.

**C++**

```cpp
// Infrastructure Layer: Repository 구현
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
        return mapToCargo(*row);
    }

    void save(const Cargo& cargo) override {
        db_.execute(
            "INSERT INTO cargos (tracking_id, origin, destination, ...) "
            "VALUES (?, ?, ?, ...) "
            "ON CONFLICT(tracking_id) DO UPDATE SET ...",
            cargo.trackingId().value(),
            cargo.routeSpecification().origin().code(),
            cargo.routeSpecification().destination().code()
            // ...
        );
    }

    TrackingId nextTrackingId() override {
        auto id = db_.queryScalar<std::string>(
            "SELECT nextval('cargo_tracking_id_seq')"
        );
        return TrackingId{id};
    }

private:
    Cargo mapToCargo(const Row& row) {
        // DB 행 → 도메인 객체 변환
    }

    DatabaseConnection& db_;
};
```

**Python**

```python
# Infrastructure Layer: Repository 구현
class SqlCargoRepository(CargoRepository):
    """SQL 기반 CargoRepository 구현"""

    def __init__(self, session: Session) -> None:
        self._session = session

    def find(self, tracking_id: TrackingId) -> Cargo | None:
        row = self._session.execute(
            text("SELECT * FROM cargos WHERE tracking_id = :id"),
            {"id": tracking_id.value}
        ).fetchone()

        if row is None:
            return None
        return self._map_to_cargo(row)

    def save(self, cargo: Cargo) -> None:
        self._session.execute(
            text("""
                INSERT INTO cargos (tracking_id, origin, destination, ...)
                VALUES (:tracking_id, :origin, :destination, ...)
                ON CONFLICT(tracking_id) DO UPDATE SET ...
            """),
            {
                "tracking_id": cargo.tracking_id.value,
                "origin": cargo.route_specification.origin.code,
                "destination": cargo.route_specification.destination.code,
                # ...
            }
        )

    def next_tracking_id(self) -> TrackingId:
        result = self._session.execute(
            text("SELECT nextval('cargo_tracking_id_seq')")
        ).scalar()
        return TrackingId(result)

    def _map_to_cargo(self, row: Row) -> Cargo:
        """DB 행 → 도메인 객체 변환"""
        ...
```

Infrastructure Layer는:
- Domain Layer의 인터페이스를 구현
- 기술적 세부사항 캡슐화
- 교체 가능 (SQL → NoSQL, 외부 API 등)

---

## 의존성 방향

```
┌────────────────────────────────┐
│           UI Layer             │
│              │                 │
│              ▼                 │
│      Application Layer         │
│              │                 │
│              ▼                 │
│        Domain Layer ★          │  ← 핵심! 아무것도 의존하지 않음
│              ▲                 │
│              │ (역전!)          │
│     Infrastructure Layer       │
└────────────────────────────────┘

Domain → Infrastructure 의존 역전:
• Domain은 인터페이스만 정의
• Infrastructure가 구현
```

### 의존성 역전 예시

**C++**

```cpp
// Domain Layer: 인터페이스만 정의
class CargoRepository {
public:
    virtual ~CargoRepository() = default;
    virtual std::optional<Cargo> find(const TrackingId& id) = 0;
    virtual void save(const Cargo& cargo) = 0;
    virtual TrackingId nextTrackingId() = 0;
};

// Infrastructure Layer: 구현
class SqlCargoRepository : public CargoRepository {
    // ... 구현
};

class InMemoryCargoRepository : public CargoRepository {
    // ... 테스트용 구현
};
```

**Python**

```python
# Domain Layer: 인터페이스만 정의 (Protocol)
from typing import Protocol

class CargoRepository(Protocol):
    def find(self, tracking_id: TrackingId) -> Cargo | None: ...
    def save(self, cargo: Cargo) -> None: ...
    def next_tracking_id(self) -> TrackingId: ...


# Infrastructure Layer: 구현
class SqlCargoRepository:
    """SQL 기반 구현"""
    ...

class InMemoryCargoRepository:
    """테스트용 구현"""
    def __init__(self) -> None:
        self._cargos: dict[str, Cargo] = {}
        self._next_id = 1

    def find(self, tracking_id: TrackingId) -> Cargo | None:
        return self._cargos.get(tracking_id.value)

    def save(self, cargo: Cargo) -> None:
        self._cargos[cargo.tracking_id.value] = cargo

    def next_tracking_id(self) -> TrackingId:
        id = f"CARGO{self._next_id:05d}"
        self._next_id += 1
        return TrackingId(id)
```

---

## 안티패턴: Smart UI

모든 로직이 UI에 있는 구조:

```cpp
// 안티패턴: Smart UI
class CargoForm : public QWidget {
    void onBookButtonClicked() {
        // UI에서 직접...
        auto origin = originCombo_->currentText();
        auto destination = destCombo_->currentText();

        // SQL 실행!
        db_.execute(
            "INSERT INTO cargos VALUES (...)",
            origin.toStdString(),
            destination.toStdString()
        );

        // 비즈니스 규칙 검증!
        if (origin == destination) {
            showError("출발지와 도착지가 같습니다");
            return;
        }

        // 경로 검색!
        auto routes = db_.query(
            "SELECT * FROM routes WHERE ..."
        );

        // 이메일 발송!
        smtp_.send(customer_.email(), "예약 완료...");

        // UI 갱신!
        refreshCargoList();
    }
};
```

문제점:
- 테스트 불가능 (UI, DB, SMTP 모두 필요)
- 재사용 불가능 (CLI에서 같은 기능?)
- 변경 어려움 (DB 변경 시 UI 코드 수정)

---

## 올바른 계층 분리

```
┌─────────────────────────────────────────────────────────────┐
│  UI: CargoForm                                              │
│  → onBookButtonClicked()                                    │
│     → bookingService_.bookNewCargo(origin, dest, deadline) │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Application: BookingService                                │
│  → bookNewCargo()                                          │
│     → cargo = Cargo(trackingId, routeSpec)                 │
│     → cargoRepo_.save(cargo)                               │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Domain: Cargo, RouteSpecification                          │
│  → 비즈니스 규칙 캡슐화                                       │
│  → 외부 의존성 없음                                          │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │
┌─────────────────────────────────────────────────────────────┐
│  Infrastructure: SqlCargoRepository                         │
│  → Domain 인터페이스 구현                                    │
│  → 실제 DB 접근                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 테스트 용이성

격리된 도메인은 테스트하기 쉽다:

**C++**

```cpp
// Domain Layer 단위 테스트 — 외부 의존성 없음
TEST(CargoTest, AssignItinerary_UpdatesDeliveryStatus) {
    // Given: 서울→부산 화물
    auto cargo = Cargo{
        TrackingId{"ABC123"},
        RouteSpecification{
            Location{"Seoul"},
            Location{"Busan"},
            DateTime::parse("2024-12-31")
        }
    };

    // When: 여정 할당
    auto itinerary = Itinerary{{
        Leg{Voyage{"V001"}, Location{"Seoul"}, Location{"Busan"}}
    }};
    cargo.assignItinerary(itinerary);

    // Then: 경로 지정됨
    EXPECT_EQ(cargo.delivery().routingStatus(), RoutingStatus::ROUTED);
    EXPECT_FALSE(cargo.isMisrouted());
}

// Application Layer 테스트 — Mock Repository 사용
TEST(BookingServiceTest, BookNewCargo_SavesToCargos) {
    // Given
    auto mockRepo = InMemoryCargoRepository{};
    auto mockRouting = MockRoutingService{};
    auto service = BookingService{mockRepo, mockRouting};

    // When
    auto trackingId = service.bookNewCargo("Seoul", "Busan",
        DateTime::parse("2024-12-31"));

    // Then
    auto saved = mockRepo.find(trackingId);
    ASSERT_TRUE(saved.has_value());
    EXPECT_EQ(saved->routeSpecification().origin().code(), "Seoul");
}
```

**Python**

```python
# Domain Layer 단위 테스트 — 외부 의존성 없음
def test_assign_itinerary_updates_delivery_status():
    # Given: 서울→부산 화물
    cargo = Cargo(
        TrackingId("ABC123"),
        RouteSpecification(
            Location("Seoul"),
            Location("Busan"),
            datetime(2024, 12, 31)
        )
    )

    # When: 여정 할당
    itinerary = Itinerary([
        Leg(Voyage("V001"), Location("Seoul"), Location("Busan"))
    ])
    cargo.assign_itinerary(itinerary)

    # Then: 경로 지정됨
    assert cargo.delivery.routing_status == RoutingStatus.ROUTED
    assert not cargo.is_misrouted


# Application Layer 테스트 — Mock Repository 사용
def test_book_new_cargo_saves_to_repository():
    # Given
    mock_repo = InMemoryCargoRepository()
    mock_routing = MockRoutingService()
    service = BookingService(mock_repo, mock_routing)

    # When
    tracking_id = service.book_new_cargo(
        "Seoul", "Busan", datetime(2024, 12, 31)
    )

    # Then
    saved = mock_repo.find(tracking_id)
    assert saved is not None
    assert saved.route_specification.origin.code == "Seoul"
```

---

## 디렉토리 구조 예시

```
src/
├── ui/                          # UI Layer
│   ├── controllers/
│   │   └── cargo_controller.cpp
│   └── views/
│       └── cargo_form.cpp
│
├── application/                 # Application Layer
│   ├── booking_service.cpp
│   └── tracking_service.cpp
│
├── domain/                      # Domain Layer ★
│   ├── model/
│   │   ├── cargo.cpp
│   │   ├── itinerary.cpp
│   │   ├── leg.cpp
│   │   └── route_specification.cpp
│   └── services/
│       └── routing_service.cpp  # 인터페이스
│
└── infrastructure/              # Infrastructure Layer
    ├── persistence/
    │   ├── sql_cargo_repository.cpp
    │   └── sql_voyage_repository.cpp
    └── external/
        └── graph_traversal_service.cpp
```

---

## 요약

**Layered Architecture**로 도메인을 격리한다:

| 계층 | 두께 | 역할 |
|-----|------|------|
| UI | 얇음 | 표현, 입출력 |
| Application | 얇음 | 조율, 트랜잭션 |
| **Domain** | **두꺼움** | **비즈니스 로직** |
| Infrastructure | 중간 | 기술적 구현 |

핵심 원칙:
- **도메인이 중심** — 다른 계층이 도메인을 서빙
- **의존성 역전** — 도메인은 인터페이스만, 구현은 인프라에
- **Smart UI 금지** — UI에 비즈니스 로직 없음

다음 장에서는 Domain Layer의 구성요소인 **Entity, Value Object, Service**를 상세히 다룬다.
