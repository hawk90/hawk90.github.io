---
title: "Ch 3: Binding Model and Implementation"
date: 2026-05-01T03:00:00
description: "Model-Driven Design — 모델과 구현 일치. Hands-on Modelers."
tags: [DDD, Model-Driven Design, Hands-on Modelers]
series: "Domain-Driven Design"
seriesOrder: 3
draft: true
---

## 모델과 구현의 괴리

많은 프로젝트에서 "분석 모델"과 "구현 모델"이 따로 존재한다.

```
분석 단계:
┌─────────────────────────────────────────────┐
│  도메인 전문가 + 분석가                       │
│  → 멋진 UML 다이어그램 작성                   │
│  → "개념적" 모델 완성                         │
└─────────────────────────────────────────────┘
                    │
                    ▼ (던져버림)
구현 단계:
┌─────────────────────────────────────────────┐
│  개발자                                      │
│  → "그건 구현 불가능해요"                     │
│  → 완전히 다른 구조로 코딩                    │
└─────────────────────────────────────────────┘
```

이렇게 되면 분석 모델은 사장되고, 코드는 도메인 지식을 반영하지 못한다.

---

## Model-Driven Design

**Model-Driven Design**은 모델과 구현이 하나임을 선언한다.

```
┌─────────────────────────────────────────────┐
│              Domain Model                    │
│         (개념 + 구현이 하나)                  │
├─────────────────────────────────────────────┤
│  • 도메인 전문가와 대화할 수 있는 개념         │
│  • 동시에 실행 가능한 코드                    │
│  • 모델이 바뀌면 코드도 바뀜                  │
│  • 코드가 바뀌면 모델도 바뀜                  │
└─────────────────────────────────────────────┘
```

### 핵심 원칙

1. **코드가 곧 모델이다** — 별도의 "분석 문서"가 아님
2. **모델러 = 개발자** — 모델링하는 사람이 구현함
3. **양방향 동기화** — 모델 변경 ↔ 코드 변경

---

## 안티패턴: 분리된 모델

### 분석가-개발자 분리

```
분석가:
"화물(Cargo)은 여정(Itinerary)을 가지며,
 여정은 구간(Leg)들의 순서 있는 집합이다."

        ▼ 문서 전달

개발자:
"음... 일단 CargoEntity, ItineraryDTO, LegVO 만들고...
 DB 테이블은 CARGO_TBL, ITIN_TBL, LEG_TBL로 하고...
 비즈니스 로직은 CargoService에 넣자..."
```

결과:
- 분석가의 모델은 PPT 속에만 존재
- 코드는 도메인 언어를 반영하지 않음
- 도메인 전문가와 대화 불가능

### 잘못된 예 — 빈약한 도메인

**C++**

```cpp
// 안티패턴: 데이터만 있는 "빈약한" 모델
struct CargoData {
    std::string trackingId;
    std::string origin;
    std::string destination;
    std::vector<LegData> legs;
};

// 로직은 전부 서비스에
class CargoService {
public:
    void assignItinerary(CargoData& cargo, const ItineraryData& itinerary) {
        cargo.legs = itinerary.legs;
        // 검증 로직...
        // 이벤트 발생...
        // 상태 변경...
    }

    bool isRouted(const CargoData& cargo) {
        return !cargo.legs.empty();
    }

    bool isMisrouted(const CargoData& cargo) {
        // 복잡한 검증 로직...
    }
};
```

**Python**

```python
# 안티패턴: 데이터만 있는 "빈약한" 모델
@dataclass
class CargoData:
    tracking_id: str
    origin: str
    destination: str
    legs: list[LegData]

# 로직은 전부 서비스에
class CargoService:
    def assign_itinerary(self, cargo: CargoData, itinerary: ItineraryData) -> None:
        cargo.legs = itinerary.legs
        # 검증 로직...
        # 이벤트 발생...
        # 상태 변경...

    def is_routed(self, cargo: CargoData) -> bool:
        return len(cargo.legs) > 0

    def is_misrouted(self, cargo: CargoData) -> bool:
        # 복잡한 검증 로직...
        pass
```

이 구조에서:
- `CargoData`는 단순한 데이터 컨테이너
- 도메인 로직이 `CargoService`에 흩어짐
- "화물이 여정을 할당받는다"를 코드에서 읽을 수 없음

---

## 올바른 Model-Driven Design

### 풍부한 도메인 모델

**C++**

```cpp
// Model-Driven Design: 모델이 곧 코드
class Cargo {
public:
    explicit Cargo(TrackingId trackingId,
                   RouteSpecification routeSpec)
        : trackingId_(std::move(trackingId))
        , routeSpecification_(std::move(routeSpec))
    {}

    // 도메인 행위: "화물이 여정을 할당받는다"
    void assignItinerary(Itinerary itinerary) {
        itinerary_ = std::move(itinerary);
    }

    // 도메인 질문: "경로가 지정되었는가?"
    bool isRouted() const {
        return itinerary_.has_value();
    }

    // 도메인 질문: "잘못된 경로인가?"
    bool isMisrouted() const {
        if (!itinerary_) return false;
        return !routeSpecification_.isSatisfiedBy(*itinerary_);
    }

    // 도메인 행위: "목적지를 변경한다"
    void specifyNewRoute(RouteSpecification newSpec) {
        routeSpecification_ = std::move(newSpec);
        // 기존 여정이 새 조건을 만족하는지 재검증 필요
    }

private:
    TrackingId trackingId_;
    RouteSpecification routeSpecification_;
    std::optional<Itinerary> itinerary_;
};
```

**Python**

```python
# Model-Driven Design: 모델이 곧 코드
class Cargo:
    """운송 화물 — 도메인의 핵심 엔티티"""

    def __init__(self, tracking_id: TrackingId,
                 route_specification: RouteSpecification) -> None:
        self._tracking_id = tracking_id
        self._route_specification = route_specification
        self._itinerary: Itinerary | None = None

    def assign_itinerary(self, itinerary: Itinerary) -> None:
        """화물에 여정을 할당한다."""
        self._itinerary = itinerary

    @property
    def is_routed(self) -> bool:
        """경로가 지정되었는가?"""
        return self._itinerary is not None

    @property
    def is_misrouted(self) -> bool:
        """잘못된 경로인가?"""
        if self._itinerary is None:
            return False
        return not self._route_specification.is_satisfied_by(self._itinerary)

    def specify_new_route(self, new_spec: RouteSpecification) -> None:
        """목적지를 변경한다."""
        self._route_specification = new_spec
```

이 구조에서:
- `Cargo`가 자신의 행위를 직접 수행
- 코드가 도메인 언어를 그대로 반영
- 도메인 전문가와 코드를 보며 대화 가능

---

## 코드와 모델의 동기화

### 모델 → 코드

도메인 전문가와 대화 중 새로운 개념 발견:

```
도메인 전문가:
"화물이 최종 목적지에 도착하면 '인도(Delivery)'가 이루어져요.
 인도는 화물의 현재 상태를 나타내는 중요한 개념이에요."
```

즉시 코드에 반영:

**C++**

```cpp
// 새로 발견된 개념: Delivery (인도 상태)
class Delivery {
public:
    static Delivery derivedFrom(
        const RouteSpecification& routeSpec,
        const std::optional<Itinerary>& itinerary,
        const HandlingHistory& handlingHistory
    ) {
        // 경로 지정, 여정, 처리 이력으로부터 인도 상태 계산
        return Delivery{
            calculateTransportStatus(itinerary, handlingHistory),
            calculateRoutingStatus(routeSpec, itinerary),
            calculateEstimatedArrival(itinerary),
            isUnloadedAtDestination(routeSpec, handlingHistory)
        };
    }

    TransportStatus transportStatus() const { return transportStatus_; }
    RoutingStatus routingStatus() const { return routingStatus_; }
    bool isDelivered() const { return isDelivered_; }

private:
    Delivery(TransportStatus ts, RoutingStatus rs,
             std::optional<DateTime> eta, bool delivered)
        : transportStatus_(ts), routingStatus_(rs)
        , estimatedArrival_(eta), isDelivered_(delivered) {}

    TransportStatus transportStatus_;
    RoutingStatus routingStatus_;
    std::optional<DateTime> estimatedArrival_;
    bool isDelivered_;
};

// Cargo가 Delivery를 포함
class Cargo {
public:
    // ...

    const Delivery& delivery() const { return delivery_; }

    // 처리 이벤트 발생 시 Delivery 재계산
    void deriveDeliveryProgress(const HandlingHistory& history) {
        delivery_ = Delivery::derivedFrom(
            routeSpecification_, itinerary_, history
        );
    }

private:
    // ...
    Delivery delivery_;
};
```

**Python**

```python
# 새로 발견된 개념: Delivery (인도 상태)
@dataclass(frozen=True)
class Delivery:
    """화물의 현재 운송/인도 상태"""
    transport_status: TransportStatus
    routing_status: RoutingStatus
    estimated_arrival: datetime | None
    is_delivered: bool

    @classmethod
    def derived_from(
        cls,
        route_spec: RouteSpecification,
        itinerary: Itinerary | None,
        handling_history: HandlingHistory
    ) -> "Delivery":
        """경로 지정, 여정, 처리 이력으로부터 인도 상태 계산"""
        return cls(
            transport_status=cls._calculate_transport_status(
                itinerary, handling_history
            ),
            routing_status=cls._calculate_routing_status(
                route_spec, itinerary
            ),
            estimated_arrival=cls._calculate_eta(itinerary),
            is_delivered=cls._is_unloaded_at_destination(
                route_spec, handling_history
            )
        )

# Cargo가 Delivery를 포함
class Cargo:
    def __init__(self, tracking_id: TrackingId,
                 route_specification: RouteSpecification) -> None:
        self._tracking_id = tracking_id
        self._route_specification = route_specification
        self._itinerary: Itinerary | None = None
        self._delivery = Delivery.derived_from(
            route_specification, None, HandlingHistory.empty()
        )

    @property
    def delivery(self) -> Delivery:
        return self._delivery

    def derive_delivery_progress(self, history: HandlingHistory) -> None:
        """처리 이벤트 발생 시 Delivery 재계산"""
        self._delivery = Delivery.derived_from(
            self._route_specification, self._itinerary, history
        )
```

### 코드 → 모델

리팩토링 중 발견한 개념을 모델에 반영:

```
개발자:
"여러 곳에서 '출발지-도착지-기한' 조합을 사용하는데,
 이걸 하나의 개념으로 묶으면 좋겠어요."

도메인 전문가:
"아, 그건 '경로 명세(Route Specification)'라고 불러요!"
```

코드 리팩토링 = 모델 진화:

```cpp
// Before: 흩어진 파라미터
class Cargo {
    Location origin_;
    Location destination_;
    DateTime deadline_;
};

// After: 명시적 개념
class RouteSpecification {
    Location origin_;
    Location destination_;
    DateTime deadline_;

    bool isSatisfiedBy(const Itinerary& itinerary) const;
};

class Cargo {
    RouteSpecification routeSpec_;  // 응집된 개념
};
```

---

## Hands-On Modelers

**Hands-On Modelers**: 모델을 설계하는 사람이 직접 코드를 작성한다.

### 왜 필요한가?

```
분리된 역할:
┌──────────────┐     문서     ┌──────────────┐
│   Modeler    │ ──────────► │  Developer   │
│ (설계만 함)   │             │ (코딩만 함)   │
└──────────────┘             └──────────────┘
     ↑                              │
     │         피드백 단절           │
     └──────────────────────────────┘

Hands-On Modelers:
┌──────────────────────────────────┐
│   Modeler + Developer (동일인)    │
│   • 모델링하면서 바로 코딩         │
│   • 구현 제약을 모델에 반영        │
│   • 코드에서 새 개념 발견          │
└──────────────────────────────────┘
```

### 구현 피드백 루프

**C++**

```cpp
// 1단계: 초기 모델 — 단순
class Cargo {
public:
    void route(Itinerary itinerary);
};

// 2단계: 구현하면서 발견 — "경로 조건이 필요하다"
class Cargo {
public:
    void route(Itinerary itinerary);
private:
    RouteSpecification routeSpec_;  // 추가됨
};

// 3단계: 더 깊은 통찰 — "여정 할당은 조건 검증이 필요하다"
class Cargo {
public:
    // 조건을 만족하는 여정만 할당 가능
    bool assignItinerary(Itinerary itinerary) {
        if (!routeSpec_.isSatisfiedBy(itinerary)) {
            return false;  // 조건 불만족
        }
        itinerary_ = std::move(itinerary);
        return true;
    }

private:
    RouteSpecification routeSpec_;
    std::optional<Itinerary> itinerary_;
};

// 4단계: 도메인 전문가와 검증
// "맞아요, 아무 여정이나 할당하면 안 되죠.
//  반드시 경로 조건을 만족해야 해요."
```

**Python**

```python
# 1단계: 초기 모델 — 단순
class Cargo:
    def route(self, itinerary: Itinerary) -> None:
        pass

# 2단계: 구현하면서 발견 — "경로 조건이 필요하다"
class Cargo:
    def __init__(self, route_spec: RouteSpecification) -> None:
        self._route_spec = route_spec  # 추가됨

# 3단계: 더 깊은 통찰 — "여정 할당은 조건 검증이 필요하다"
class Cargo:
    def assign_itinerary(self, itinerary: Itinerary) -> bool:
        """조건을 만족하는 여정만 할당 가능"""
        if not self._route_spec.is_satisfied_by(itinerary):
            return False  # 조건 불만족
        self._itinerary = itinerary
        return True

# 4단계: 도메인 전문가와 검증
# "맞아요, 아무 여정이나 할당하면 안 되죠."
```

---

## 모델 무결성 유지

### 지속적 검증

모델과 코드의 일치를 보장하려면:

**C++**

```cpp
// 모델 규칙을 테스트로 검증
TEST(CargoTest, MisroutedWhenItineraryDoesNotSatisfySpec) {
    // Given: 서울→부산 경로 조건
    auto spec = RouteSpecification{
        Location{"Seoul"},
        Location{"Busan"},
        DateTime::parse("2024-12-31")
    };
    auto cargo = Cargo{TrackingId{"ABC123"}, spec};

    // When: 서울→대구 여정 할당 (조건 불만족)
    auto wrongItinerary = Itinerary{{
        Leg{Voyage{"V001"}, Location{"Seoul"}, Location{"Daegu"}}
    }};
    cargo.assignItinerary(wrongItinerary);

    // Then: 잘못된 경로로 판정
    EXPECT_TRUE(cargo.isMisrouted());
}

TEST(CargoTest, NotMisroutedWhenItinerarySatisfiesSpec) {
    // Given: 서울→부산 경로 조건
    auto spec = RouteSpecification{
        Location{"Seoul"},
        Location{"Busan"},
        DateTime::parse("2024-12-31")
    };
    auto cargo = Cargo{TrackingId{"ABC123"}, spec};

    // When: 서울→부산 여정 할당 (조건 만족)
    auto correctItinerary = Itinerary{{
        Leg{Voyage{"V001"}, Location{"Seoul"}, Location{"Busan"}}
    }};
    cargo.assignItinerary(correctItinerary);

    // Then: 정상 경로
    EXPECT_FALSE(cargo.isMisrouted());
}
```

**Python**

```python
# 모델 규칙을 테스트로 검증
def test_misrouted_when_itinerary_does_not_satisfy_spec():
    # Given: 서울→부산 경로 조건
    spec = RouteSpecification(
        origin=Location("Seoul"),
        destination=Location("Busan"),
        deadline=datetime(2024, 12, 31)
    )
    cargo = Cargo(TrackingId("ABC123"), spec)

    # When: 서울→대구 여정 할당 (조건 불만족)
    wrong_itinerary = Itinerary([
        Leg(Voyage("V001"), Location("Seoul"), Location("Daegu"))
    ])
    cargo.assign_itinerary(wrong_itinerary)

    # Then: 잘못된 경로로 판정
    assert cargo.is_misrouted is True


def test_not_misrouted_when_itinerary_satisfies_spec():
    # Given: 서울→부산 경로 조건
    spec = RouteSpecification(
        origin=Location("Seoul"),
        destination=Location("Busan"),
        deadline=datetime(2024, 12, 31)
    )
    cargo = Cargo(TrackingId("ABC123"), spec)

    # When: 서울→부산 여정 할당 (조건 만족)
    correct_itinerary = Itinerary([
        Leg(Voyage("V001"), Location("Seoul"), Location("Busan"))
    ])
    cargo.assign_itinerary(correct_itinerary)

    # Then: 정상 경로
    assert cargo.is_misrouted is False
```

---

## Model-Driven Design의 이점

| 분리된 모델 | Model-Driven Design |
|------------|---------------------|
| 분석 문서 따로, 코드 따로 | 코드가 곧 모델 |
| 문서가 outdated됨 | 항상 최신 상태 |
| 도메인 전문가와 소통 어려움 | 코드로 대화 가능 |
| 리팩토링이 모델에 반영 안 됨 | 리팩토링 = 모델 진화 |
| 개발자가 도메인 무지 | 개발자가 도메인 전문가 |

---

## 실천 지침

1. **분석 문서를 만들지 마라** — 코드가 문서다
2. **모델러가 직접 코딩하라** — 구현 피드백을 받아라
3. **도메인 용어를 코드에 사용하라** — Ubiquitous Language
4. **리팩토링을 두려워하지 마라** — 모델 진화의 기회
5. **테스트로 모델을 검증하라** — 도메인 규칙을 테스트로

---

## 요약

**Model-Driven Design**은 분석 모델과 구현 모델의 분리를 거부한다.

- 코드가 곧 도메인 모델
- 모델이 바뀌면 코드가 바뀜
- 코드가 바뀌면 모델이 바뀜
- 모델러 = 개발자 (Hands-On Modelers)

다음 장에서는 도메인 모델을 나머지 시스템으로부터 **격리(Isolating)**하는 방법을 다룬다.
