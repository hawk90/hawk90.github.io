---
title: "Ch 16: Large-Scale Structure"
date: 2025-10-05T03:00:00
description: "Evolving Order / System Metaphor / Responsibility Layers / Knowledge Level / Pluggable."
tags: [DDD, Large-Scale Structure]
series: "Domain-Driven Design"
seriesOrder: 16
draft: true
---

## 대규모 시스템의 문제

시스템이 커지면 **전체 그림**을 파악하기 어렵다.

```
작은 시스템:
┌──────────────────────────┐
│  모든 개발자가 전체 이해   │
│  "이건 여기에 넣으면 돼"   │
└──────────────────────────┘

큰 시스템:
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐     │
│  │   │ │   │ │   │ │   │ │   │ │   │ │   │ │   │     │
│  └─┬─┘ └─┬─┘ └─┬─┘ └─┬─┘ └─┬─┘ └─┬─┘ └─┬─┘ └─┬─┘     │
│    │     │     │     │     │     │     │     │        │
│    └─────┴─────┴─────┴─────┴─────┴─────┴─────┘        │
│                                                         │
│  "새 기능은 어디에 넣어야 하지?"                         │
│  "이 모듈은 저 모듈을 참조해도 되나?"                    │
│  "전체 구조가 뭐지?"                                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Large-Scale Structure**는 시스템 전체에 **일관된 패턴**을 부여한다.

---

## Evolving Order

구조는 **강요가 아닌 진화**를 통해 형성된다.

```
잘못된 접근:
┌─────────────────────────────────────────┐
│  아키텍트가 처음에 완벽한 구조 설계      │
│           ↓                             │
│  개발팀에 강요                          │
│           ↓                             │
│  현실과 맞지 않아 무시됨                 │
│           ↓                             │
│  구조 없는 혼돈                          │
└─────────────────────────────────────────┘

올바른 접근:
┌─────────────────────────────────────────┐
│  최소한의 구조로 시작                    │
│           ↓                             │
│  개발하면서 패턴 발견                    │
│           ↓                             │
│  구조 점진적 정립                        │
│           ↓                             │
│  팀 전체가 이해하고 따르는 구조           │
└─────────────────────────────────────────┘
```

**핵심 원칙**:

1. 구조는 **제한이 아닌 가이드**
2. 팀이 **이해하고 따를 수 있는 수준**으로 단순하게
3. 도메인과 함께 **진화**

---

## System Metaphor

**은유(Metaphor)**를 통해 시스템 전체를 설명한다.

### 화물 해운 시스템의 은유

```
은유: "물류 파이프라인"

┌─────────────────────────────────────────────────────────┐
│                    물류 파이프라인                        │
│                                                         │
│  ┌──────────┐                           ┌──────────┐   │
│  │  입구    │ ════════════════════════▶ │  출구    │   │
│  │ (예약)   │                           │ (배송)   │   │
│  └──────────┘                           └──────────┘   │
│        ↓                                      ↑         │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐  │         │
│  │  밸브    │ → │  펌프    │ → │  필터    │──┘         │
│  │ (확정)   │   │ (운송)   │   │ (검수)   │            │
│  └──────────┘   └──────────┘   └──────────┘            │
│                                                         │
│  화물(Cargo)은 파이프라인을 통해 흐른다                   │
│  각 단계에서 상태가 변환된다                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**은유의 효과**:

```python
# 파이프라인 은유를 반영한 코드 구조

# 입구 (Intake) - 예약 수락
class BookingIntake:
    """파이프라인 입구 - 화물이 시스템에 들어오는 곳"""

    def accept(self, booking_request: "BookingRequest") -> "Cargo":
        # 화물을 파이프라인에 투입
        cargo = Cargo.from_request(booking_request)
        cargo.enter_pipeline()
        return cargo


# 밸브 (Valve) - 예약 확정
class ConfirmationValve:
    """파이프라인 밸브 - 흐름을 조절"""

    def open(self, cargo: "Cargo") -> bool:
        """조건 충족시 다음 단계로 진행 허용"""
        if self._can_proceed(cargo):
            cargo.proceed_to_next_stage()
            return True
        return False

    def _can_proceed(self, cargo: "Cargo") -> bool:
        return cargo.is_payment_confirmed and cargo.has_valid_route


# 펌프 (Pump) - 실제 운송
class ShippingPump:
    """파이프라인 펌프 - 화물을 이동시키는 힘"""

    def push(self, cargo: "Cargo", voyage: "Voyage") -> None:
        """화물을 다음 위치로 밀어냄"""
        cargo.load_onto(voyage)
        cargo.advance_position()


# 필터 (Filter) - 검수
class InspectionFilter:
    """파이프라인 필터 - 품질 검증"""

    def filter(self, cargo: "Cargo") -> bool:
        """검수 통과 여부"""
        if self._passes_inspection(cargo):
            cargo.mark_inspected()
            return True
        cargo.flag_for_review()
        return False


# 출구 (Outlet) - 배송 완료
class DeliveryOutlet:
    """파이프라인 출구 - 화물이 시스템을 떠나는 곳"""

    def release(self, cargo: "Cargo") -> "DeliveryReceipt":
        """화물 인도"""
        cargo.exit_pipeline()
        return DeliveryReceipt(cargo)
```

은유가 **Ubiquitous Language**에 스며든다:

- "화물을 파이프라인에 투입한다"
- "밸브를 열어 다음 단계로 보낸다"
- "필터를 통과해야 배송된다"

---

## Responsibility Layers

시스템을 **책임의 층**으로 나눈다. 각 층은 특정 종류의 책임을 담당.

### 화물 해운 시스템의 책임 계층

```
┌─────────────────────────────────────────────────────────┐
│                   Responsibility Layers                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │             DECISION SUPPORT LAYER              │   │
│  │  (의사결정 지원 - 최상위)                        │   │
│  │                                                  │   │
│  │  • 경로 최적화 추천                              │   │
│  │  • 가격 정책 분석                               │   │
│  │  • 예측 및 시뮬레이션                            │   │
│  └─────────────────────────────────────────────────┘   │
│                         │                               │
│                         ▼ uses                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │               OPERATION LAYER                   │   │
│  │  (운영 - 핵심 비즈니스 활동)                     │   │
│  │                                                  │   │
│  │  • 예약 처리                                    │   │
│  │  • 운송 추적                                    │   │
│  │  • 청구 및 결제                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                         │                               │
│                         ▼ uses                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │               CAPABILITY LAYER                  │   │
│  │  (역량 - 운영을 지원하는 자원)                   │   │
│  │                                                  │   │
│  │  • 선박 (Vessel)                                │   │
│  │  • 항로 (Route)                                 │   │
│  │  • 고객 (Customer)                              │   │
│  └─────────────────────────────────────────────────┘   │
│                         │                               │
│                         ▼ uses                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │                POTENTIAL LAYER                  │   │
│  │  (잠재력 - 가장 기본적인 것들)                   │   │
│  │                                                  │   │
│  │  • 위치 (Location)                              │   │
│  │  • 시간 (DateTime)                              │   │
│  │  • 금액 (Money)                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘

의존성 규칙: 위 → 아래만 허용
```

**Python - Responsibility Layers**:

```python
# ═══════════════════════════════════════════════════════
#                    POTENTIAL LAYER
#  가장 기본적인 Value Objects - 다른 모든 층이 사용
# ═══════════════════════════════════════════════════════

# potential/location.py
@dataclass(frozen=True)
class Location:
    """위치 - 잠재력 계층"""
    un_locode: str
    name: str
    latitude: float
    longitude: float


# potential/money.py
@dataclass(frozen=True)
class Money:
    """금액 - 잠재력 계층"""
    amount: Decimal
    currency: str

    def add(self, other: "Money") -> "Money":
        self._ensure_same_currency(other)
        return Money(self.amount + other.amount, self.currency)


# potential/time_period.py
@dataclass(frozen=True)
class TimePeriod:
    """기간 - 잠재력 계층"""
    start: datetime
    end: datetime

    @property
    def duration_days(self) -> int:
        return (self.end - self.start).days


# ═══════════════════════════════════════════════════════
#                    CAPABILITY LAYER
#  운영을 지원하는 자원 - Potential 계층 사용
# ═══════════════════════════════════════════════════════

# capability/vessel.py
class Vessel:
    """선박 - 역량 계층"""

    def __init__(
        self,
        vessel_id: str,
        name: str,
        capacity: "Capacity",
        home_port: Location  # ← Potential 계층 사용
    ):
        self._id = vessel_id
        self._name = name
        self._capacity = capacity
        self._home_port = home_port

    def can_carry(self, cargo_size: "CargoSize") -> bool:
        return self._capacity.can_accommodate(cargo_size)


# capability/voyage.py
class Voyage:
    """항해 - 역량 계층"""

    def __init__(
        self,
        voyage_number: str,
        vessel: Vessel,  # ← 같은 계층
        schedule: "VoyageSchedule"
    ):
        self._number = voyage_number
        self._vessel = vessel
        self._schedule = schedule

    def departs_from(self, location: Location) -> bool:  # ← Potential 사용
        return self._schedule.origin == location


# capability/customer.py
class Customer:
    """고객 - 역량 계층"""

    def __init__(
        self,
        customer_id: str,
        name: str,
        credit_limit: Money  # ← Potential 계층 사용
    ):
        self._id = customer_id
        self._name = name
        self._credit_limit = credit_limit


# ═══════════════════════════════════════════════════════
#                    OPERATION LAYER
#  핵심 비즈니스 활동 - Capability 계층 사용
# ═══════════════════════════════════════════════════════

# operation/cargo.py
class Cargo:
    """화물 - 운영 계층 (핵심 Aggregate)"""

    def __init__(
        self,
        tracking_id: "TrackingId",
        customer: Customer,  # ← Capability 계층 사용
        route_spec: "RouteSpecification"
    ):
        self._tracking_id = tracking_id
        self._customer = customer
        self._route_spec = route_spec
        self._delivery_history = DeliveryHistory()

    def assign_to_voyage(self, voyage: Voyage) -> None:  # ← Capability 사용
        if not voyage.can_accept(self):
            raise CargoNotAcceptableError()
        self._current_voyage = voyage


# operation/booking_service.py
class BookingService:
    """예약 서비스 - 운영 계층"""

    def __init__(
        self,
        cargo_repository: "CargoRepository",
        voyage_repository: "VoyageRepository",  # ← Capability 참조
        customer_repository: "CustomerRepository"
    ):
        self._cargos = cargo_repository
        self._voyages = voyage_repository
        self._customers = customer_repository

    def book_cargo(
        self,
        customer_id: str,
        origin: Location,  # ← Potential 계층
        destination: Location,
        deadline: datetime
    ) -> Cargo:
        customer = self._customers.find(customer_id)  # ← Capability
        route_spec = RouteSpecification(origin, destination, deadline)
        cargo = Cargo.create(customer, route_spec)
        self._cargos.save(cargo)
        return cargo


# ═══════════════════════════════════════════════════════
#                 DECISION SUPPORT LAYER
#  의사결정 지원 - Operation 계층 사용
# ═══════════════════════════════════════════════════════

# decision_support/route_optimizer.py
class RouteOptimizer:
    """경로 최적화 - 의사결정 지원 계층"""

    def __init__(
        self,
        voyage_repository: "VoyageRepository",  # ← Capability 계층
        cargo_repository: "CargoRepository"     # ← Operation 계층
    ):
        self._voyages = voyage_repository
        self._cargos = cargo_repository

    def suggest_optimal_route(
        self,
        cargo: Cargo,  # ← Operation 계층
        preferences: "OptimizationPreferences"
    ) -> List["RouteOption"]:
        """최적 경로 추천 - 운영 데이터 기반 분석"""
        available_voyages = self._voyages.find_for_route(
            cargo.origin,
            cargo.destination
        )

        options = []
        for voyage in available_voyages:
            score = self._calculate_score(voyage, cargo, preferences)
            options.append(RouteOption(voyage, score))

        return sorted(options, key=lambda o: o.score, reverse=True)


# decision_support/pricing_analyzer.py
class PricingAnalyzer:
    """가격 분석 - 의사결정 지원 계층"""

    def analyze_pricing_strategy(
        self,
        customer: Customer,      # ← Capability 계층
        historical_cargos: List[Cargo],  # ← Operation 계층
        market_data: "MarketData"
    ) -> "PricingRecommendation":
        """가격 전략 분석 및 추천"""
        # 고객 히스토리 분석
        avg_volume = self._average_volume(historical_cargos)
        loyalty_score = self._calculate_loyalty(customer, historical_cargos)

        # 시장 상황 반영
        market_rate = market_data.current_rate

        return PricingRecommendation(
            suggested_discount=self._suggest_discount(loyalty_score),
            competitive_rate=market_rate * 0.95
        )
```

**C++ - Responsibility Layers**:

```cpp
// ═══════════════════════════════════════════════════════
//                    POTENTIAL LAYER
// ═══════════════════════════════════════════════════════

// potential/location.hpp
namespace potential {

class Location {
public:
    Location(std::string un_locode, std::string name)
        : un_locode_(std::move(un_locode))
        , name_(std::move(name)) {}

    const std::string& un_locode() const { return un_locode_; }
    const std::string& name() const { return name_; }

    bool operator==(const Location& other) const {
        return un_locode_ == other.un_locode_;
    }

private:
    std::string un_locode_;
    std::string name_;
};

}  // namespace potential


// ═══════════════════════════════════════════════════════
//                    CAPABILITY LAYER
// ═══════════════════════════════════════════════════════

// capability/vessel.hpp
namespace capability {

using potential::Location;

class Vessel {
public:
    Vessel(
        std::string vessel_id,
        std::string name,
        Capacity capacity,
        Location home_port  // Potential 계층 사용
    )
        : vessel_id_(std::move(vessel_id))
        , name_(std::move(name))
        , capacity_(capacity)
        , home_port_(std::move(home_port)) {}

    bool can_carry(const CargoSize& size) const {
        return capacity_.can_accommodate(size);
    }

private:
    std::string vessel_id_;
    std::string name_;
    Capacity capacity_;
    Location home_port_;
};

}  // namespace capability


// ═══════════════════════════════════════════════════════
//                    OPERATION LAYER
// ═══════════════════════════════════════════════════════

// operation/cargo.hpp
namespace operation {

using potential::Location;
using capability::Customer;
using capability::Voyage;

class Cargo {
public:
    Cargo(
        TrackingId tracking_id,
        std::shared_ptr<Customer> customer,  // Capability 계층
        RouteSpecification route_spec
    )
        : tracking_id_(std::move(tracking_id))
        , customer_(std::move(customer))
        , route_spec_(std::move(route_spec)) {}

    void assign_to_voyage(std::shared_ptr<Voyage> voyage) {
        if (!voyage->can_accept(*this)) {
            throw CargoNotAcceptableError();
        }
        current_voyage_ = std::move(voyage);
    }

private:
    TrackingId tracking_id_;
    std::shared_ptr<Customer> customer_;
    RouteSpecification route_spec_;
    std::shared_ptr<Voyage> current_voyage_;
};

}  // namespace operation
```

**계층 간 의존성 규칙**:

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  ✓ Decision Support → Operation → Capability → Potential│
│                                                        │
│  ✗ Potential → Capability (역방향 금지)                │
│  ✗ Capability → Operation (역방향 금지)                │
│  ✗ Operation → Decision Support (역방향 금지)         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Knowledge Level

**런타임에 동작을 설정**할 수 있는 메타 모델 계층.

```
일반적인 접근:
┌─────────────────────────────────────────┐
│  if (cargoType == "hazardous") {        │
│      rate *= 1.5;                       │
│  } else if (cargoType == "refrigerated")│
│      rate *= 1.3;                       │
│  }                                      │
│  ...                                    │
│                                         │
│  → 비즈니스 규칙이 코드에 하드코딩       │
└─────────────────────────────────────────┘

Knowledge Level:
┌─────────────────────────────────────────┐
│  Knowledge Level (메타 모델)            │
│  ┌─────────────────────────────────────┐│
│  │ CargoType "hazardous"               ││
│  │   - rate_multiplier: 1.5            ││
│  │   - requires_certification: true    ││
│  │                                     ││
│  │ CargoType "refrigerated"            ││
│  │   - rate_multiplier: 1.3            ││
│  │   - requires_temperature_control    ││
│  └─────────────────────────────────────┘│
│                 ↓ configures            │
│  ┌─────────────────────────────────────┐│
│  │ Operation Level (실제 인스턴스)      ││
│  │                                     ││
│  │ Cargo ABC-123                       ││
│  │   type: → hazardous (참조)          ││
│  │   rate: type.rate_multiplier 적용   ││
│  └─────────────────────────────────────┘│
│                                         │
│  → 비즈니스 규칙이 데이터로 분리         │
└─────────────────────────────────────────┘
```

**Python - Knowledge Level**:

```python
# ═══════════════════════════════════════════════════════
#                   KNOWLEDGE LEVEL
#  비즈니스 규칙을 정의하는 메타 모델
# ═══════════════════════════════════════════════════════

# knowledge/cargo_type.py
@dataclass
class CargoType:
    """
    [KNOWLEDGE LEVEL]
    화물 유형 - 비즈니스 규칙 정의

    이 객체는 "어떤 종류의 화물이 있고, 각각 어떻게 처리되는가"를
    설명하는 메타데이터이다.
    """

    code: str
    name: str
    rate_multiplier: Decimal
    requires_certification: bool
    requires_special_handling: bool
    max_storage_days: int
    handling_instructions: str

    def calculate_rate(self, base_rate: Money) -> Money:
        """이 유형의 운임 계산 규칙"""
        return Money(
            base_rate.amount * self.rate_multiplier,
            base_rate.currency
        )


# knowledge/cargo_type_repository.py
class CargoTypeRepository:
    """화물 유형 저장소 - DB/설정에서 로드"""

    def __init__(self):
        # 실제로는 DB에서 로드
        self._types = {
            "STANDARD": CargoType(
                code="STANDARD",
                name="일반 화물",
                rate_multiplier=Decimal("1.0"),
                requires_certification=False,
                requires_special_handling=False,
                max_storage_days=30,
                handling_instructions="일반 취급"
            ),
            "HAZARDOUS": CargoType(
                code="HAZARDOUS",
                name="위험물",
                rate_multiplier=Decimal("1.5"),
                requires_certification=True,
                requires_special_handling=True,
                max_storage_days=7,
                handling_instructions="IMDG 코드 준수 필수"
            ),
            "REFRIGERATED": CargoType(
                code="REFRIGERATED",
                name="냉장/냉동",
                rate_multiplier=Decimal("1.3"),
                requires_certification=False,
                requires_special_handling=True,
                max_storage_days=14,
                handling_instructions="-18°C ~ 4°C 유지"
            ),
            "OVERSIZED": CargoType(
                code="OVERSIZED",
                name="특대형",
                rate_multiplier=Decimal("2.0"),
                requires_certification=True,
                requires_special_handling=True,
                max_storage_days=21,
                handling_instructions="특수 장비 사용"
            ),
        }

    def find(self, code: str) -> CargoType:
        return self._types.get(code)

    def all_types(self) -> List[CargoType]:
        return list(self._types.values())


# ═══════════════════════════════════════════════════════
#                   OPERATION LEVEL
#  Knowledge Level을 참조하는 실제 인스턴스
# ═══════════════════════════════════════════════════════

# operation/cargo.py
class Cargo:
    """
    [OPERATION LEVEL]
    실제 화물 인스턴스 - Knowledge Level 참조

    Cargo는 CargoType(Knowledge Level)을 참조하여
    자신의 동작을 결정한다.
    """

    def __init__(
        self,
        tracking_id: "TrackingId",
        cargo_type: CargoType,  # ← Knowledge Level 참조
        customer: "Customer",
        route_spec: "RouteSpecification",
        size: "CargoSize"
    ):
        self._tracking_id = tracking_id
        self._type = cargo_type  # 메타 모델 참조
        self._customer = customer
        self._route_spec = route_spec
        self._size = size

    def calculate_freight(self, base_rate: Money) -> Money:
        """운임 계산 - Knowledge Level의 규칙 적용"""
        return self._type.calculate_rate(base_rate)

    def requires_certification(self) -> bool:
        """인증 필요 여부 - Knowledge Level에서 결정"""
        return self._type.requires_certification

    def get_handling_instructions(self) -> str:
        """취급 지침 - Knowledge Level에서 제공"""
        return self._type.handling_instructions

    def max_storage_period(self) -> timedelta:
        """최대 보관 기간 - Knowledge Level에서 결정"""
        return timedelta(days=self._type.max_storage_days)


# 새로운 화물 유형 추가 시:
# 1. CargoTypeRepository에 데이터 추가 (또는 DB에 insert)
# 2. 코드 변경 불필요!

# 예: "친환경 화물" 유형 추가
eco_friendly = CargoType(
    code="ECO_FRIENDLY",
    name="친환경 화물",
    rate_multiplier=Decimal("0.9"),  # 10% 할인
    requires_certification=True,      # 친환경 인증 필요
    requires_special_handling=False,
    max_storage_days=30,
    handling_instructions="재활용 포장재 사용"
)
# DB에 저장하면 즉시 시스템에서 사용 가능
```

**더 복잡한 Knowledge Level - 정책 구성**:

```python
# knowledge/pricing_policy.py
@dataclass
class PricingRule:
    """가격 규칙 - Knowledge Level"""

    rule_id: str
    name: str
    condition: "RuleCondition"  # 적용 조건
    adjustment_type: str        # "PERCENTAGE" or "FIXED"
    adjustment_value: Decimal
    priority: int               # 우선순위

    def applies_to(self, cargo: "Cargo", customer: "Customer") -> bool:
        return self.condition.evaluate(cargo, customer)

    def apply(self, amount: Money) -> Money:
        if self.adjustment_type == "PERCENTAGE":
            factor = 1 + (self.adjustment_value / 100)
            return Money(amount.amount * factor, amount.currency)
        else:
            return Money(amount.amount + self.adjustment_value, amount.currency)


@dataclass
class RuleCondition:
    """규칙 조건 - Knowledge Level"""

    field: str          # "cargo.size", "customer.tier", etc.
    operator: str       # ">=", "==", "in", etc.
    value: Any

    def evaluate(self, cargo: "Cargo", customer: "Customer") -> bool:
        actual_value = self._get_value(cargo, customer)
        return self._compare(actual_value, self.operator, self.value)

    def _get_value(self, cargo: "Cargo", customer: "Customer") -> Any:
        if self.field.startswith("cargo."):
            return getattr(cargo, self.field.split(".")[1])
        elif self.field.startswith("customer."):
            return getattr(customer, self.field.split(".")[1])


# 가격 규칙 예시 (DB에 저장)
pricing_rules = [
    PricingRule(
        rule_id="BULK_DISCOUNT",
        name="대량 할인",
        condition=RuleCondition("cargo.weight_kg", ">=", 10000),
        adjustment_type="PERCENTAGE",
        adjustment_value=Decimal("-10"),  # 10% 할인
        priority=1
    ),
    PricingRule(
        rule_id="VIP_DISCOUNT",
        name="VIP 고객 할인",
        condition=RuleCondition("customer.tier", "==", "VIP"),
        adjustment_type="PERCENTAGE",
        adjustment_value=Decimal("-15"),  # 15% 할인
        priority=2
    ),
    PricingRule(
        rule_id="PEAK_SEASON",
        name="성수기 할증",
        condition=RuleCondition("cargo.booking_month", "in", [6, 7, 8, 12]),
        adjustment_type="PERCENTAGE",
        adjustment_value=Decimal("20"),   # 20% 할증
        priority=3
    ),
]


# operation/pricing_service.py
class PricingService:
    """가격 서비스 - Knowledge Level 규칙 적용"""

    def __init__(self, rule_repository: "PricingRuleRepository"):
        self._rules = rule_repository

    def calculate_price(
        self,
        cargo: "Cargo",
        customer: "Customer",
        base_rate: Money
    ) -> Money:
        """Knowledge Level의 규칙들을 순서대로 적용"""
        amount = base_rate

        # 우선순위 순으로 규칙 적용
        applicable_rules = [
            rule for rule in self._rules.all()
            if rule.applies_to(cargo, customer)
        ]

        for rule in sorted(applicable_rules, key=lambda r: r.priority):
            amount = rule.apply(amount)

        return amount
```

---

## Pluggable Component Framework

**교체 가능한 컴포넌트**로 시스템을 구성한다.

```
┌─────────────────────────────────────────────────────────┐
│            Pluggable Component Framework                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │                   Core System                     │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐   │  │
│  │  │  Booking   │ │  Tracking  │ │  Billing   │   │  │
│  │  │  Module    │ │  Module    │ │  Module    │   │  │
│  │  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘   │  │
│  │        │              │              │           │  │
│  │        ▼              ▼              ▼           │  │
│  │  ┌────────────────────────────────────────────┐ │  │
│  │  │            Plugin Interface               │ │  │
│  │  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │  │
│  │  │  RouteOptimizer | PaymentGateway |        │ │  │
│  │  │  NotificationService | ReportGenerator    │ │  │
│  │  └────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
│                          │                              │
│           ┌──────────────┼──────────────┐              │
│           ▼              ▼              ▼              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │ Standard    │ │ Premium     │ │ Custom      │      │
│  │ Optimizer   │ │ Optimizer   │ │ Optimizer   │      │
│  │ Plugin      │ │ Plugin      │ │ Plugin      │      │
│  └─────────────┘ └─────────────┘ └─────────────┘      │
│                                                         │
│  → 플러그인을 교체하여 시스템 동작 변경                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Python - Pluggable Component**:

```python
# ═══════════════════════════════════════════════════════
#                   PLUGIN INTERFACES
#  시스템이 정의하는 플러그인 계약
# ═══════════════════════════════════════════════════════

# plugins/interfaces.py
from abc import ABC, abstractmethod
from typing import List, Protocol


class RouteOptimizerPlugin(ABC):
    """경로 최적화 플러그인 인터페이스"""

    @property
    @abstractmethod
    def name(self) -> str:
        """플러그인 이름"""
        pass

    @property
    @abstractmethod
    def version(self) -> str:
        """플러그인 버전"""
        pass

    @abstractmethod
    def find_optimal_route(
        self,
        origin: "Location",
        destination: "Location",
        cargo: "CargoSpecification",
        constraints: "OptimizationConstraints"
    ) -> "Route":
        """최적 경로 탐색"""
        pass


class PaymentGatewayPlugin(ABC):
    """결제 게이트웨이 플러그인 인터페이스"""

    @abstractmethod
    def process_payment(
        self,
        amount: "Money",
        payment_method: "PaymentMethod",
        customer: "Customer"
    ) -> "PaymentResult":
        pass

    @abstractmethod
    def refund(
        self,
        transaction_id: str,
        amount: "Money"
    ) -> "RefundResult":
        pass


class NotificationPlugin(ABC):
    """알림 플러그인 인터페이스"""

    @abstractmethod
    def send(
        self,
        recipient: str,
        message: "NotificationMessage"
    ) -> bool:
        pass


# ═══════════════════════════════════════════════════════
#                   PLUGIN IMPLEMENTATIONS
#  다양한 플러그인 구현
# ═══════════════════════════════════════════════════════

# plugins/standard_optimizer.py
class StandardRouteOptimizer(RouteOptimizerPlugin):
    """기본 경로 최적화 - 단순 최단 경로"""

    @property
    def name(self) -> str:
        return "Standard Route Optimizer"

    @property
    def version(self) -> str:
        return "1.0.0"

    def find_optimal_route(
        self,
        origin: "Location",
        destination: "Location",
        cargo: "CargoSpecification",
        constraints: "OptimizationConstraints"
    ) -> "Route":
        # 단순 다익스트라 알고리즘
        graph = self._build_graph()
        path = self._dijkstra(graph, origin, destination)
        return Route.from_path(path)


# plugins/premium_optimizer.py
class PremiumRouteOptimizer(RouteOptimizerPlugin):
    """프리미엄 경로 최적화 - 다변수 최적화"""

    @property
    def name(self) -> str:
        return "Premium Route Optimizer"

    @property
    def version(self) -> str:
        return "2.0.0"

    def find_optimal_route(
        self,
        origin: "Location",
        destination: "Location",
        cargo: "CargoSpecification",
        constraints: "OptimizationConstraints"
    ) -> "Route":
        # 복잡한 다변수 최적화
        # - 비용, 시간, 신뢰도 고려
        # - 실시간 데이터 반영
        # - 기계학습 모델 사용
        candidates = self._generate_candidates(origin, destination)
        scored = self._score_candidates(candidates, cargo, constraints)
        return self._select_best(scored)


# plugins/stripe_payment.py
class StripePaymentGateway(PaymentGatewayPlugin):
    """Stripe 결제 플러그인"""

    def __init__(self, api_key: str):
        self._stripe = StripeClient(api_key)

    def process_payment(
        self,
        amount: "Money",
        payment_method: "PaymentMethod",
        customer: "Customer"
    ) -> "PaymentResult":
        stripe_result = self._stripe.charges.create(
            amount=int(amount.amount * 100),
            currency=amount.currency.lower(),
            source=payment_method.token,
            description=f"Cargo booking for {customer.name}"
        )
        return PaymentResult.from_stripe(stripe_result)


# ═══════════════════════════════════════════════════════
#                   PLUGIN REGISTRY
#  플러그인 등록 및 관리
# ═══════════════════════════════════════════════════════

# plugins/registry.py
class PluginRegistry:
    """플러그인 레지스트리 - 플러그인 관리"""

    def __init__(self):
        self._optimizers: Dict[str, RouteOptimizerPlugin] = {}
        self._payment_gateways: Dict[str, PaymentGatewayPlugin] = {}
        self._notifiers: Dict[str, NotificationPlugin] = {}

    def register_optimizer(self, key: str, plugin: RouteOptimizerPlugin) -> None:
        self._optimizers[key] = plugin

    def get_optimizer(self, key: str) -> RouteOptimizerPlugin:
        plugin = self._optimizers.get(key)
        if not plugin:
            raise PluginNotFoundError(f"Optimizer '{key}' not found")
        return plugin

    def register_payment_gateway(self, key: str, plugin: PaymentGatewayPlugin) -> None:
        self._payment_gateways[key] = plugin

    def get_payment_gateway(self, key: str) -> PaymentGatewayPlugin:
        return self._payment_gateways.get(key)


# ═══════════════════════════════════════════════════════
#                   SYSTEM CONFIGURATION
#  플러그인 조합으로 시스템 구성
# ═══════════════════════════════════════════════════════

# config/system_bootstrap.py
def bootstrap_system(config: "SystemConfig") -> "ShippingSystem":
    """플러그인을 조합하여 시스템 구성"""

    registry = PluginRegistry()

    # 경로 최적화 플러그인 등록
    if config.optimizer_tier == "standard":
        registry.register_optimizer("route", StandardRouteOptimizer())
    elif config.optimizer_tier == "premium":
        registry.register_optimizer("route", PremiumRouteOptimizer())

    # 결제 게이트웨이 등록
    if config.payment_provider == "stripe":
        registry.register_optimizer("payment", StripePaymentGateway(config.stripe_key))
    elif config.payment_provider == "paypal":
        registry.register_payment_gateway("payment", PayPalPaymentGateway(config.paypal_key))

    # 시스템 생성
    return ShippingSystem(registry)


# 고객별로 다른 구성 가능
enterprise_config = SystemConfig(
    optimizer_tier="premium",
    payment_provider="stripe"
)

basic_config = SystemConfig(
    optimizer_tier="standard",
    payment_provider="paypal"
)
```

---

## 구조는 모델의 일부

Large-Scale Structure는 **도메인 모델과 함께 진화**해야 한다.

```
┌─────────────────────────────────────────────────────────┐
│              구조와 모델의 공진화                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Phase 1: 초기 모델                                     │
│  ┌─────────────────────────────────┐                   │
│  │ 단순한 모델, 구조 불필요        │                   │
│  │ Cargo, Voyage, Customer         │                   │
│  └─────────────────────────────────┘                   │
│                                                         │
│  Phase 2: 성장                                          │
│  ┌─────────────────────────────────────────┐           │
│  │ 모델 복잡해짐, 패턴 발견                │           │
│  │ "운영"과 "의사결정"이 분리되네?         │           │
│  │ → Responsibility Layers 도입           │           │
│  └─────────────────────────────────────────┘           │
│                                                         │
│  Phase 3: 확장                                          │
│  ┌───────────────────────────────────────────────┐     │
│  │ 비즈니스 규칙이 자주 바뀜                     │     │
│  │ "규칙을 데이터로 분리하면 유연해지겠다"       │     │
│  │ → Knowledge Level 도입                       │     │
│  └───────────────────────────────────────────────┘     │
│                                                         │
│  Phase 4: 다양화                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 고객마다 다른 기능 필요                         │   │
│  │ "컴포넌트를 교체 가능하게 만들자"               │   │
│  │ → Pluggable Components 도입                    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 핵심 정리

```
┌─────────────────────────────────────────────────────────┐
│              Large-Scale Structure 요약                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Evolving Order                                         │
│  → 강요가 아닌 점진적 진화                              │
│  → 팀이 이해하고 따를 수 있는 수준 유지                  │
│                                                         │
│  System Metaphor                                        │
│  → 은유로 전체 시스템 설명                              │
│  → Ubiquitous Language에 반영                          │
│                                                         │
│  Responsibility Layers                                  │
│  ┌──────────────────┐                                  │
│  │ Decision Support │ 분석, 추천                       │
│  ├──────────────────┤                                  │
│  │ Operation        │ 핵심 비즈니스                    │
│  ├──────────────────┤                                  │
│  │ Capability       │ 자원, 역량                       │
│  ├──────────────────┤                                  │
│  │ Potential        │ 기본 개념                        │
│  └──────────────────┘                                  │
│                                                         │
│  Knowledge Level                                        │
│  → 비즈니스 규칙을 데이터로 분리                        │
│  → 코드 변경 없이 동작 변경 가능                        │
│                                                         │
│  Pluggable Components                                   │
│  → 인터페이스 기반 플러그인 아키텍처                    │
│  → 컴포넌트 교체로 기능 변경                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

다음 장에서는 **전략적 설계를 종합**하여 효과적인 도메인 주도 설계 전략을 다룬다.
