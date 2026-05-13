---
title: "Ch 12: Relating Design Patterns to the Model"
date: 2025-10-04T02:00:00
description: "GoF 패턴 — 도메인 의미와 연결될 때만 사용. Strategy / Composite."
tags: [DDD, Design Patterns, GoF]
series: "Domain-Driven Design"
seriesOrder: 12
draft: true
---

## 디자인 패턴과 도메인 모델

**GoF 디자인 패턴**은 기술적 문제를 해결하는 도구다.
그러나 도메인 모델에서는 **도메인 의미**가 있을 때만 가치 있다.

```
두 가지 접근:

1. 기술적 사용 (도메인 무관)
   → Infrastructure Layer에서 사용
   → 클라이언트 코드에 영향 없음

2. 도메인 의미 있는 사용
   → Domain Layer에서 사용
   → 도메인 개념을 표현
   → Ubiquitous Language의 일부가 됨
```

---

## Strategy 패턴 — 도메인의 정책

**Strategy 패턴**은 도메인에서 **정책(Policy)**이나 **알고리즘 선택**을 표현한다.

### 문제 상황

화물 운송에서 **운임 계산 정책**이 다양하다.

```
요구사항:
• 기본 운임 = 무게 × 거리 × 단가
• 위험물 운임 = 기본 + 50% 할증
• 냉동 화물 = 기본 + 30% 할증
• VIP 고객 = 기본 - 20% 할인
• 정책 조합 가능 (위험물 + VIP)
• 새 정책 추가 용이해야 함
```

### Strategy 없이

```python
class FreightCalculator:
    def calculate(
        self,
        cargo: Cargo,
        customer: Customer,
        distance: Quantity
    ) -> Money:
        base = self._calculate_base(cargo, distance)

        # if-else 지옥
        if cargo.is_hazardous:
            base = base.multiply(Decimal("1.5"))
        if cargo.requires_refrigeration:
            base = base.multiply(Decimal("1.3"))
        if customer.is_vip:
            base = base.multiply(Decimal("0.8"))
        if cargo.is_oversized:
            base = base.multiply(Decimal("2.0"))
        # ... 조건 계속 추가

        return base
```

문제점:
- 조건이 늘어날수록 복잡해짐
- 조건 조합이 어려움
- 테스트하기 어려움
- **"정책"**이라는 도메인 개념이 암묵적

### Strategy로 — 정책을 명시적으로

```python
from abc import ABC, abstractmethod


class FreightPolicy(ABC):
    """운임 정책 — Strategy 패턴, 도메인의 '정책' 개념"""

    @abstractmethod
    def calculate(
        self,
        base_freight: Money,
        cargo: Cargo,
        customer: Customer
    ) -> Money:
        """기본 운임에 정책을 적용한다"""
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        """정책 이름"""
        pass


class StandardPolicy(FreightPolicy):
    """표준 운임 정책 — 변경 없음"""

    def calculate(
        self,
        base_freight: Money,
        cargo: Cargo,
        customer: Customer
    ) -> Money:
        return base_freight

    @property
    def name(self) -> str:
        return "Standard"


class HazardousMaterialPolicy(FreightPolicy):
    """위험물 할증 정책"""

    def __init__(self, surcharge_rate: Decimal = Decimal("0.5")) -> None:
        self._surcharge_rate = surcharge_rate

    def calculate(
        self,
        base_freight: Money,
        cargo: Cargo,
        customer: Customer
    ) -> Money:
        if cargo.is_hazardous:
            surcharge = base_freight.multiply(self._surcharge_rate)
            return base_freight.add(surcharge)
        return base_freight

    @property
    def name(self) -> str:
        return "HazardousMaterial"


class RefrigeratedCargoPolicy(FreightPolicy):
    """냉동 화물 할증 정책"""

    def __init__(self, surcharge_rate: Decimal = Decimal("0.3")) -> None:
        self._surcharge_rate = surcharge_rate

    def calculate(
        self,
        base_freight: Money,
        cargo: Cargo,
        customer: Customer
    ) -> Money:
        if cargo.requires_refrigeration:
            surcharge = base_freight.multiply(self._surcharge_rate)
            return base_freight.add(surcharge)
        return base_freight

    @property
    def name(self) -> str:
        return "Refrigerated"


class VIPDiscountPolicy(FreightPolicy):
    """VIP 고객 할인 정책"""

    def __init__(self, discount_rate: Decimal = Decimal("0.2")) -> None:
        self._discount_rate = discount_rate

    def calculate(
        self,
        base_freight: Money,
        cargo: Cargo,
        customer: Customer
    ) -> Money:
        if customer.is_vip:
            discount = base_freight.multiply(self._discount_rate)
            return base_freight.subtract(discount)
        return base_freight

    @property
    def name(self) -> str:
        return "VIPDiscount"
```

### 정책 조합

```python
class CompositeFreightPolicy(FreightPolicy):
    """복합 운임 정책 — 여러 정책 조합"""

    def __init__(self, policies: list[FreightPolicy]) -> None:
        self._policies = policies

    def calculate(
        self,
        base_freight: Money,
        cargo: Cargo,
        customer: Customer
    ) -> Money:
        result = base_freight
        for policy in self._policies:
            result = policy.calculate(result, cargo, customer)
        return result

    @property
    def name(self) -> str:
        names = [p.name for p in self._policies]
        return " + ".join(names)


# 사용
standard_policy = CompositeFreightPolicy([
    HazardousMaterialPolicy(),
    RefrigeratedCargoPolicy(),
    VIPDiscountPolicy()
])

# 도메인 언어로 읽힘:
# "위험물 할증 + 냉동 할증 + VIP 할인 정책 적용"
```

### 서비스에서 사용

```python
class FreightCalculationService:
    """운임 계산 서비스"""

    def __init__(self, default_policy: FreightPolicy) -> None:
        self._default_policy = default_policy

    def calculate_freight(
        self,
        cargo: Cargo,
        customer: Customer,
        route: Itinerary,
        policy: FreightPolicy | None = None
    ) -> FreightQuote:
        """운임을 계산한다"""
        effective_policy = policy or self._default_policy

        base_freight = self._calculate_base_freight(cargo, route)
        final_freight = effective_policy.calculate(
            base_freight, cargo, customer
        )

        return FreightQuote(
            cargo_id=cargo.tracking_id,
            base_amount=base_freight,
            final_amount=final_freight,
            policy_applied=effective_policy.name
        )

    def _calculate_base_freight(
        self,
        cargo: Cargo,
        route: Itinerary
    ) -> Money:
        distance = route.total_distance
        weight = cargo.size.weight
        rate = Money(Decimal("0.01"), "USD")  # 1kg당 0.01 USD/km
        return rate.multiply(
            weight.to(Unit.kilogram()).amount * distance.to(Unit.kilometer()).amount
        )


@dataclass(frozen=True)
class FreightQuote:
    """운임 견적 — 결과 Value Object"""
    cargo_id: TrackingId
    base_amount: Money
    final_amount: Money
    policy_applied: str
```

```cpp
// C++ 버전
class FreightPolicy {
public:
    virtual ~FreightPolicy() = default;
    virtual Money calculate(
        const Money& baseFreight,
        const Cargo& cargo,
        const Customer& customer
    ) const = 0;
    virtual std::string name() const = 0;
};

class HazardousMaterialPolicy : public FreightPolicy {
    Decimal surchargeRate_;

public:
    explicit HazardousMaterialPolicy(Decimal rate = Decimal("0.5"))
        : surchargeRate_(rate) {}

    Money calculate(
        const Money& baseFreight,
        const Cargo& cargo,
        const Customer& customer
    ) const override {
        if (cargo.isHazardous()) {
            auto surcharge = baseFreight.multiply(surchargeRate_);
            return baseFreight.add(surcharge);
        }
        return baseFreight;
    }

    std::string name() const override {
        return "HazardousMaterial";
    }
};

class CompositeFreightPolicy : public FreightPolicy {
    std::vector<std::unique_ptr<FreightPolicy>> policies_;

public:
    void add(std::unique_ptr<FreightPolicy> policy) {
        policies_.push_back(std::move(policy));
    }

    Money calculate(
        const Money& baseFreight,
        const Cargo& cargo,
        const Customer& customer
    ) const override {
        Money result = baseFreight;
        for (const auto& policy : policies_) {
            result = policy->calculate(result, cargo, customer);
        }
        return result;
    }

    std::string name() const override {
        std::string result;
        for (const auto& policy : policies_) {
            if (!result.empty()) result += " + ";
            result += policy->name();
        }
        return result;
    }
};
```

---

## Composite 패턴 — 트리 구조 도메인

**Composite 패턴**은 도메인에 **계층 구조**가 있을 때 사용한다.

### 문제 상황

운송 **경로**는 계층적이다.

```
요구사항:
• 경로(Route)는 여러 구간(Segment)으로 구성
• 구간은 다시 하위 구간을 가질 수 있음
• 모든 수준에서 총 거리, 비용, 시간 계산 필요
• 일관된 인터페이스로 전체/부분 처리
```

### Composite로

```python
from abc import ABC, abstractmethod


class RouteComponent(ABC):
    """경로 컴포넌트 — Composite 패턴, 도메인의 '경로 구성요소' 개념"""

    @abstractmethod
    def total_distance(self) -> Quantity:
        """총 거리"""
        pass

    @abstractmethod
    def total_duration(self) -> timedelta:
        """총 소요 시간"""
        pass

    @abstractmethod
    def total_cost(self) -> Money:
        """총 비용"""
        pass

    @abstractmethod
    def description(self) -> str:
        """경로 설명"""
        pass


@dataclass
class Leg(RouteComponent):
    """구간 — Leaf 노드, 실제 운송 구간"""
    voyage_number: VoyageNumber
    load_location: Location
    unload_location: Location
    load_time: datetime
    unload_time: datetime
    distance: Quantity
    cost: Money

    def total_distance(self) -> Quantity:
        return self.distance

    def total_duration(self) -> timedelta:
        return self.unload_time - self.load_time

    def total_cost(self) -> Money:
        return self.cost

    def description(self) -> str:
        return f"{self.load_location} → {self.unload_location} ({self.voyage_number})"


class CompositeRoute(RouteComponent):
    """복합 경로 — Composite 노드, 여러 구간의 조합"""

    def __init__(self, name: str) -> None:
        self._name = name
        self._components: list[RouteComponent] = []

    def add(self, component: RouteComponent) -> None:
        """구성요소 추가"""
        self._components.append(component)

    def remove(self, component: RouteComponent) -> None:
        """구성요소 제거"""
        self._components.remove(component)

    def total_distance(self) -> Quantity:
        """모든 하위 구간의 거리 합"""
        if not self._components:
            return Quantity(Decimal("0"), Unit.kilometer())
        total = self._components[0].total_distance()
        for comp in self._components[1:]:
            total = total.add(comp.total_distance())
        return total

    def total_duration(self) -> timedelta:
        """모든 하위 구간의 시간 합"""
        total = timedelta()
        for comp in self._components:
            total += comp.total_duration()
        return total

    def total_cost(self) -> Money:
        """모든 하위 구간의 비용 합"""
        if not self._components:
            return Money(Decimal("0"), "USD")
        total = self._components[0].total_cost()
        for comp in self._components[1:]:
            total = total.add(comp.total_cost())
        return total

    def description(self) -> str:
        """전체 경로 설명"""
        parts = [comp.description() for comp in self._components]
        return f"{self._name}: " + " ⟶ ".join(parts)


# 사용
# 1. 개별 구간 생성
shanghai_to_singapore = Leg(
    voyage_number=VoyageNumber("V100"),
    load_location=Location("SHANGHAI"),
    unload_location=Location("SINGAPORE"),
    load_time=datetime(2024, 1, 1, 8, 0),
    unload_time=datetime(2024, 1, 5, 18, 0),
    distance=Quantity(Decimal("2500"), Unit.nautical_mile()),
    cost=Money(Decimal("5000"), "USD")
)

singapore_to_rotterdam = Leg(
    voyage_number=VoyageNumber("V200"),
    load_location=Location("SINGAPORE"),
    unload_location=Location("ROTTERDAM"),
    load_time=datetime(2024, 1, 6, 10, 0),
    unload_time=datetime(2024, 1, 20, 14, 0),
    distance=Quantity(Decimal("8000"), Unit.nautical_mile()),
    cost=Money(Decimal("15000"), "USD")
)

# 2. 복합 경로 구성
asia_to_europe = CompositeRoute("Asia to Europe Route")
asia_to_europe.add(shanghai_to_singapore)
asia_to_europe.add(singapore_to_rotterdam)

# 3. 일관된 인터페이스로 사용
print(f"Total distance: {asia_to_europe.total_distance()}")
print(f"Total cost: {asia_to_europe.total_cost()}")
print(f"Route: {asia_to_europe.description()}")
```

```cpp
// C++ 버전
class RouteComponent {
public:
    virtual ~RouteComponent() = default;
    virtual Quantity totalDistance() const = 0;
    virtual Duration totalDuration() const = 0;
    virtual Money totalCost() const = 0;
    virtual std::string description() const = 0;
};

class Leg : public RouteComponent {
public:
    Leg(VoyageNumber voyage, Location loadLoc, Location unloadLoc,
        DateTime loadTime, DateTime unloadTime,
        Quantity distance, Money cost)
        : voyage_(voyage), loadLocation_(loadLoc), unloadLocation_(unloadLoc),
          loadTime_(loadTime), unloadTime_(unloadTime),
          distance_(distance), cost_(cost) {}

    Quantity totalDistance() const override { return distance_; }
    Duration totalDuration() const override { return unloadTime_ - loadTime_; }
    Money totalCost() const override { return cost_; }

    std::string description() const override {
        return loadLocation_.code() + " → " + unloadLocation_.code();
    }

private:
    VoyageNumber voyage_;
    Location loadLocation_, unloadLocation_;
    DateTime loadTime_, unloadTime_;
    Quantity distance_;
    Money cost_;
};

class CompositeRoute : public RouteComponent {
    std::string name_;
    std::vector<std::unique_ptr<RouteComponent>> components_;

public:
    explicit CompositeRoute(std::string name) : name_(std::move(name)) {}

    void add(std::unique_ptr<RouteComponent> component) {
        components_.push_back(std::move(component));
    }

    Quantity totalDistance() const override {
        Quantity total(Decimal(0), Unit::kilometer());
        for (const auto& comp : components_) {
            total = total.add(comp->totalDistance());
        }
        return total;
    }

    Money totalCost() const override {
        Money total(Decimal(0), "USD");
        for (const auto& comp : components_) {
            total = total.add(comp->totalCost());
        }
        return total;
    }

    // ...
};
```

---

## Flyweight 패턴 — 공유 가능한 도메인 객체

**Flyweight 패턴**은 도메인에서 **공유 가능한 불변 객체**에 적용된다.

### 문제 상황

```
Location 객체가 수천 개 생성됨:
• 같은 "SHANGHAI" Location이 여러 곳에서 생성
• 메모리 낭비
• 비교 연산 복잡 (== vs equals)
```

### Flyweight로 — Location Pool

```python
class LocationPool:
    """Location 풀 — Flyweight 패턴"""

    _instance: "LocationPool | None" = None
    _locations: dict[str, Location] = {}

    def __new__(cls) -> "LocationPool":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def get(self, code: str) -> Location:
        """코드로 Location을 가져온다 — 없으면 생성 후 캐시"""
        if code not in self._locations:
            self._locations[code] = Location(code)
        return self._locations[code]

    @classmethod
    def of(cls, code: str) -> Location:
        """편의 메서드"""
        return cls().get(code)


@dataclass(frozen=True)
class Location:
    """위치 — 불변, 값으로 비교"""
    code: str

    # 팩토리 메서드로만 생성 권장
    @classmethod
    def of(cls, code: str) -> "Location":
        return LocationPool.of(code)


# 사용
loc1 = Location.of("SHANGHAI")
loc2 = Location.of("SHANGHAI")

assert loc1 is loc2  # 같은 인스턴스
assert loc1 == loc2  # 값도 같음
```

---

## 패턴 적용 시 주의점

### 1. 도메인 의미가 있어야 한다

```
Good — 도메인 의미 있음:
• FreightPolicy (Strategy) — "운임 정책"이라는 도메인 개념
• RouteComponent (Composite) — "경로 구성요소"라는 도메인 개념
• Location pool (Flyweight) — "위치"라는 공유 도메인 개념

Bad — 기술적 편의만:
• CargoObserver — Cargo 변경 시 알림 (이건 인프라 계층)
• ItineraryBuilder — 여정 생성 (도메인 개념 아님)
• VoyageAdapter — 외부 시스템 연동 (인프라)
```

### 2. 패턴 이름보다 도메인 이름

```python
# Bad — 패턴 이름 노출
class FreightCalculationStrategy:  # "Strategy" 노출
    pass

class RouteComposite:  # "Composite" 노출
    pass


# Good — 도메인 이름
class FreightPolicy:  # 도메인 언어: "정책"
    pass

class RouteComponent:  # 도메인 언어: "경로 구성요소"
    pass
```

### 3. 과도한 패턴 사용 피하기

```
주의:
"이 문제에 어떤 패턴을 적용할까?" ← 잘못된 접근

올바른 접근:
"도메인에 이런 개념이 있다. 이걸 어떻게 표현할까?"
→ 자연스럽게 패턴 구조가 나오면 적용
```

---

## 패턴별 도메인 적용 예시

### State 패턴 — 상태 전이가 있는 도메인

```python
# Ch 9에서 다룬 DeliveryState
class DeliveryState(ABC):
    """인도 상태 — State 패턴"""

    @abstractmethod
    def handling_instructions(self, cargo: "Cargo") -> str:
        pass

    @abstractmethod
    def next_state(self, event: "HandlingEvent") -> "DeliveryState":
        pass


class NotReceived(DeliveryState):
    def handling_instructions(self, cargo: "Cargo") -> str:
        return "Waiting for pickup"

    def next_state(self, event: "HandlingEvent") -> DeliveryState:
        if event.type == EventType.RECEIVE:
            return InPort()
        return self
```

### Observer 패턴 — 도메인 이벤트

```python
# 도메인 이벤트로 사용될 때만 의미 있음
class CargoArrivedEvent:
    """화물 도착 이벤트 — 도메인 이벤트"""
    def __init__(self, cargo: Cargo, location: Location) -> None:
        self.cargo = cargo
        self.location = location
        self.occurred_at = datetime.now()


class CargoEventPublisher:
    """화물 이벤트 발행자"""
    _subscribers: list[Callable[[CargoArrivedEvent], None]] = []

    def subscribe(self, handler: Callable[[CargoArrivedEvent], None]) -> None:
        self._subscribers.append(handler)

    def publish(self, event: CargoArrivedEvent) -> None:
        for handler in self._subscribers:
            handler(event)


# 사용 — 도메인 로직에서
def handle_cargo_arrival(cargo: Cargo, location: Location) -> None:
    # 화물 도착 처리
    cargo.record_arrival(location)

    # 도메인 이벤트 발행
    event = CargoArrivedEvent(cargo, location)
    CargoEventPublisher().publish(event)
```

### Decorator 패턴 — 기능 확장

```python
class FreightCalculator(ABC):
    @abstractmethod
    def calculate(self, cargo: Cargo, route: Itinerary) -> Money:
        pass


class StandardFreightCalculator(FreightCalculator):
    def calculate(self, cargo: Cargo, route: Itinerary) -> Money:
        # 기본 계산
        return Money(...)


class InsuranceDecorator(FreightCalculator):
    """보험료 추가 — Decorator"""

    def __init__(
        self,
        calculator: FreightCalculator,
        insurance_rate: Decimal
    ) -> None:
        self._calculator = calculator
        self._insurance_rate = insurance_rate

    def calculate(self, cargo: Cargo, route: Itinerary) -> Money:
        base = self._calculator.calculate(cargo, route)
        insurance = base.multiply(self._insurance_rate)
        return base.add(insurance)


# 사용
calculator = InsuranceDecorator(
    StandardFreightCalculator(),
    insurance_rate=Decimal("0.02")
)
```

---

## 도메인과 기술의 경계

```
┌────────────────────────────────────────────────────────────┐
│                     Domain Layer                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  패턴이 도메인 의미를 가질 때만 사용:                        │
│                                                            │
│  • Strategy → FreightPolicy (운임 정책)                    │
│  • Composite → RouteComponent (경로 구성)                  │
│  • State → DeliveryState (인도 상태)                       │
│  • Specification → RouteSpecification (경로 요구사항)      │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  기술적 패턴 사용:                                          │
│                                                            │
│  • Repository implementation (구현체)                      │
│  • Factory for persistence                                 │
│  • Adapter for external services                           │
│  • Observer for system events                              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 요약

**디자인 패턴**은 도메인 의미가 있을 때만 Domain Layer에서 사용한다.

적용 가능한 패턴:
- **Strategy** — 정책, 알고리즘 선택
- **Composite** — 계층 구조
- **State** — 상태 전이
- **Flyweight** — 공유 불변 객체

적용 원칙:
- 패턴 이름보다 **도메인 이름** 사용
- **Ubiquitous Language**에 통합
- 도메인 의미 없으면 **Infrastructure Layer**로
- 과도한 패턴 사용 피하기

주의:
- "어떤 패턴을 적용할까?" ← 잘못된 질문
- "도메인 개념을 어떻게 표현할까?" ← 올바른 질문

다음 장에서는 **Refactoring Toward Deeper Insight** — 더 깊은 통찰을 향한 리팩토링을 다룬다.
