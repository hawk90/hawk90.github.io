---
title: "Ch 11: Applying Analysis Patterns"
date: 2026-05-01T11:00:00
description: "Fowler의 Analysis Patterns 활용 — 도메인 모델의 공통 추상."
tags: [DDD, Analysis Patterns, Fowler]
series: "Domain-Driven Design"
seriesOrder: 11
draft: true
---

## Analysis Patterns이란?

**Analysis Patterns**는 **도메인 모델링**에서 반복적으로 나타나는 구조다.

```
Martin Fowler — *Analysis Patterns* (1996):
"재사용 가능한 도메인 모델 패턴"

디자인 패턴 (GoF):
→ 기술적 구현 패턴 (Factory, Observer, ...)

분석 패턴 (Fowler):
→ 도메인 개념 패턴 (Accountability, Quantity, ...)
```

---

## 패턴 적용의 원칙

**그대로 복사하지 않는다.** 도메인에 맞게 조정한다.

```
패턴 적용 단계:

1. 도메인 문제 인식
   "우리 도메인에 이런 복잡성이 있다"

2. 유사한 패턴 발견
   "이 패턴이 비슷한 문제를 다룬다"

3. 도메인에 맞게 조정
   "우리 용어로 번역하고, 필요한 부분만 취한다"

4. Ubiquitous Language에 통합
   "패턴 구조를 도메인 언어로 표현한다"
```

---

## 예시 1: Accountability 패턴

### 문제 상황

화물 운송 시스템에서 **조직 구조**를 모델링해야 한다.

```
요구사항:
• 운송 회사는 여러 지사를 가짐
• 지사는 여러 팀을 가짐
• 팀은 여러 직원을 가짐
• 직원은 여러 팀에 속할 수 있음
• 관계는 시간에 따라 변함
```

### 단순한 시도

```python
# 하드코딩된 계층 구조 — 유연하지 않음
class Company:
    def __init__(self, name: str) -> None:
        self._name = name
        self._branches: list[Branch] = []


class Branch:
    def __init__(self, name: str, company: Company) -> None:
        self._name = name
        self._company = company
        self._teams: list[Team] = []


class Team:
    def __init__(self, name: str, branch: Branch) -> None:
        self._name = name
        self._branch = branch
        self._employees: list[Employee] = []


class Employee:
    def __init__(self, name: str) -> None:
        self._name = name
        self._team: Team | None = None
```

문제점:
- 구조가 **고정됨** — 새 계층 추가 어려움
- **다대다 관계** 표현 어려움
- **시간 변화** 표현 어려움

### Accountability 패턴

Fowler의 Accountability 패턴은 **유연한 조직 구조**를 모델링한다.

```
┌─────────────────────────────────────────────────────────────┐
│                   Accountability                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐      ┌──────────────────────┐            │
│   │    Party     │      │  AccountabilityType  │            │
│   ├──────────────┤      ├──────────────────────┤            │
│   │ name         │      │ name                 │            │
│   │              │◀─────│                      │            │
│   └──────────────┘      └──────────────────────┘            │
│          ▲                        │                          │
│          │                        │                          │
│   ┌──────┴──────┐                 │                          │
│   │             │                 │                          │
│   ▼             ▼                 ▼                          │
│ Person     Organization    ┌─────────────────┐              │
│                            │ Accountability  │              │
│                            ├─────────────────┤              │
│                            │ commissioner    │→ Party       │
│                            │ responsible     │→ Party       │
│                            │ type            │→ Type        │
│                            │ time_period     │→ DateRange   │
│                            └─────────────────┘              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 도메인에 적용

```python
from abc import ABC
from dataclasses import dataclass
from datetime import date


# Party — 조직 또는 개인
class Party(ABC):
    def __init__(self, party_id: str, name: str) -> None:
        self._party_id = party_id
        self._name = name

    @property
    def party_id(self) -> str:
        return self._party_id

    @property
    def name(self) -> str:
        return self._name


class Organization(Party):
    """조직 — 회사, 지사, 팀 등"""
    pass


class Person(Party):
    """개인 — 직원, 고객 등"""
    pass


# Accountability Type — 관계 유형
@dataclass(frozen=True)
class AccountabilityType:
    """책임 관계 유형"""
    name: str

    @classmethod
    def employment(cls) -> "AccountabilityType":
        return cls("Employment")

    @classmethod
    def management(cls) -> "AccountabilityType":
        return cls("Management")

    @classmethod
    def branch_of(cls) -> "AccountabilityType":
        return cls("BranchOf")


# Date Range — 유효 기간
@dataclass(frozen=True)
class DateRange:
    """기간"""
    start: date
    end: date | None = None

    def is_active_on(self, d: date) -> bool:
        if d < self.start:
            return False
        if self.end is not None and d > self.end:
            return False
        return True

    def is_current(self) -> bool:
        return self.is_active_on(date.today())


# Accountability — 책임 관계
class Accountability:
    """책임 관계 — Party 간의 유연한 관계"""

    def __init__(
        self,
        commissioner: Party,
        responsible: Party,
        accountability_type: AccountabilityType,
        time_period: DateRange
    ) -> None:
        self._commissioner = commissioner  # 위임자 (상위)
        self._responsible = responsible    # 책임자 (하위)
        self._type = accountability_type
        self._time_period = time_period

    @property
    def commissioner(self) -> Party:
        return self._commissioner

    @property
    def responsible(self) -> Party:
        return self._responsible

    @property
    def accountability_type(self) -> AccountabilityType:
        return self._type

    def is_active(self) -> bool:
        return self._time_period.is_current()
```

### 사용 예시

```python
# 조직 구조 생성
company = Organization("ORG001", "Global Shipping Co.")
tokyo_branch = Organization("ORG002", "Tokyo Branch")
logistics_team = Organization("ORG003", "Logistics Team")
employee = Person("PER001", "Tanaka")

# 관계 설정 — 유연하게
accountabilities = [
    # Tokyo Branch는 Company의 지사
    Accountability(
        commissioner=company,
        responsible=tokyo_branch,
        accountability_type=AccountabilityType.branch_of(),
        time_period=DateRange(date(2020, 1, 1))
    ),
    # Logistics Team은 Tokyo Branch에 속함
    Accountability(
        commissioner=tokyo_branch,
        responsible=logistics_team,
        accountability_type=AccountabilityType.management(),
        time_period=DateRange(date(2021, 6, 1))
    ),
    # Tanaka는 Logistics Team의 직원
    Accountability(
        commissioner=logistics_team,
        responsible=employee,
        accountability_type=AccountabilityType.employment(),
        time_period=DateRange(date(2022, 4, 1))
    ),
]


# 조직 계층 조회
def get_subordinates(
    party: Party,
    accountabilities: list[Accountability],
    acc_type: AccountabilityType | None = None
) -> list[Party]:
    """특정 Party의 하위 조직/인원 조회"""
    result = []
    for acc in accountabilities:
        if acc.commissioner == party and acc.is_active():
            if acc_type is None or acc.accountability_type == acc_type:
                result.append(acc.responsible)
    return result


# 사용
subordinates = get_subordinates(tokyo_branch, accountabilities)
# → [logistics_team]

all_employees = get_subordinates(
    logistics_team,
    accountabilities,
    AccountabilityType.employment()
)
# → [employee]
```

```cpp
// C++ 버전
class Party {
public:
    virtual ~Party() = default;

    const std::string& partyId() const { return partyId_; }
    const std::string& name() const { return name_; }

protected:
    Party(std::string partyId, std::string name)
        : partyId_(std::move(partyId)), name_(std::move(name)) {}

private:
    std::string partyId_;
    std::string name_;
};

class Organization : public Party {
public:
    Organization(std::string partyId, std::string name)
        : Party(std::move(partyId), std::move(name)) {}
};

class Person : public Party {
public:
    Person(std::string partyId, std::string name)
        : Party(std::move(partyId), std::move(name)) {}
};

class Accountability {
public:
    Accountability(
        std::shared_ptr<Party> commissioner,
        std::shared_ptr<Party> responsible,
        AccountabilityType type,
        DateRange timePeriod
    ) : commissioner_(std::move(commissioner)),
        responsible_(std::move(responsible)),
        type_(type),
        timePeriod_(timePeriod) {}

    const Party& commissioner() const { return *commissioner_; }
    const Party& responsible() const { return *responsible_; }
    bool isActive() const { return timePeriod_.isCurrent(); }

private:
    std::shared_ptr<Party> commissioner_;
    std::shared_ptr<Party> responsible_;
    AccountabilityType type_;
    DateRange timePeriod_;
};
```

---

## 예시 2: Quantity 패턴

### 문제 상황

화물 운송에서 **다양한 단위의 양**을 다뤄야 한다.

```
요구사항:
• 화물 무게: 톤, 킬로그램, 파운드
• 화물 부피: 입방미터, 입방피트
• 거리: 킬로미터, 해리, 마일
• 단위 변환이 필요
• 단위가 다르면 비교/연산 불가
```

### Quantity 패턴

```
┌─────────────────────────────────────────────────┐
│                   Quantity                       │
├─────────────────────────────────────────────────┤
│                                                  │
│   ┌────────────────┐    ┌────────────────┐      │
│   │    Quantity    │───▶│      Unit      │      │
│   ├────────────────┤    ├────────────────┤      │
│   │ amount: number │    │ name: string   │      │
│   │ unit: Unit     │    │ symbol: string │      │
│   └────────────────┘    └────────────────┘      │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 구현

```python
from dataclasses import dataclass
from decimal import Decimal
from typing import Self


@dataclass(frozen=True)
class Unit:
    """단위"""
    name: str
    symbol: str
    base_unit_ratio: Decimal  # 기본 단위 대비 비율

    # 무게 단위
    @classmethod
    def kilogram(cls) -> "Unit":
        return cls("Kilogram", "kg", Decimal("1"))

    @classmethod
    def ton(cls) -> "Unit":
        return cls("Ton", "t", Decimal("1000"))

    @classmethod
    def pound(cls) -> "Unit":
        return cls("Pound", "lb", Decimal("0.453592"))

    # 부피 단위
    @classmethod
    def cubic_meter(cls) -> "Unit":
        return cls("Cubic Meter", "m³", Decimal("1"))

    @classmethod
    def cubic_foot(cls) -> "Unit":
        return cls("Cubic Foot", "ft³", Decimal("0.0283168"))

    # 거리 단위
    @classmethod
    def kilometer(cls) -> "Unit":
        return cls("Kilometer", "km", Decimal("1"))

    @classmethod
    def nautical_mile(cls) -> "Unit":
        return cls("Nautical Mile", "nm", Decimal("1.852"))

    @classmethod
    def mile(cls) -> "Unit":
        return cls("Mile", "mi", Decimal("1.60934"))


@dataclass(frozen=True)
class Quantity:
    """단위가 있는 양"""
    amount: Decimal
    unit: Unit

    def __str__(self) -> str:
        return f"{self.amount} {self.unit.symbol}"

    def to(self, target_unit: Unit) -> "Quantity":
        """다른 단위로 변환"""
        # 기본 단위로 변환 후 대상 단위로 변환
        base_amount = self.amount * self.unit.base_unit_ratio
        target_amount = base_amount / target_unit.base_unit_ratio
        return Quantity(target_amount, target_unit)

    def add(self, other: "Quantity") -> "Quantity":
        """같은 단위로 변환 후 더함"""
        other_converted = other.to(self.unit)
        return Quantity(
            self.amount + other_converted.amount,
            self.unit
        )

    def subtract(self, other: "Quantity") -> "Quantity":
        """같은 단위로 변환 후 뺌"""
        other_converted = other.to(self.unit)
        return Quantity(
            self.amount - other_converted.amount,
            self.unit
        )

    def multiply(self, factor: Decimal) -> "Quantity":
        """배수 곱함"""
        return Quantity(self.amount * factor, self.unit)

    def is_greater_than(self, other: "Quantity") -> bool:
        """비교 — 단위 변환 후"""
        other_converted = other.to(self.unit)
        return self.amount > other_converted.amount

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Quantity):
            return False
        other_converted = other.to(self.unit)
        return self.amount == other_converted.amount


# 사용
weight1 = Quantity(Decimal("5"), Unit.ton())
weight2 = Quantity(Decimal("2000"), Unit.kilogram())

total = weight1.add(weight2)  # 7 t
print(f"Total: {total}")  # "Total: 7 t"

# 단위 변환
weight_in_kg = weight1.to(Unit.kilogram())
print(f"In kg: {weight_in_kg}")  # "In kg: 5000 kg"

# 비교
print(weight1.is_greater_than(weight2))  # True (5t > 2000kg = 2t)
```

### 화물에 적용

```python
@dataclass(frozen=True)
class CargoSize:
    """화물 크기 — Weight와 Volume을 함께"""
    weight: Quantity
    volume: Quantity

    def is_within_limits(
        self,
        max_weight: Quantity,
        max_volume: Quantity
    ) -> bool:
        return (
            not self.weight.is_greater_than(max_weight)
            and not self.volume.is_greater_than(max_volume)
        )


class Cargo:
    def __init__(
        self,
        tracking_id: TrackingId,
        route_specification: RouteSpecification,
        size: CargoSize
    ) -> None:
        self._tracking_id = tracking_id
        self._route_specification = route_specification
        self._size = size

    @property
    def size(self) -> CargoSize:
        return self._size


class Voyage:
    def __init__(self, voyage_number: VoyageNumber) -> None:
        self._voyage_number = voyage_number
        self._max_weight = Quantity(Decimal("10000"), Unit.ton())
        self._max_volume = Quantity(Decimal("5000"), Unit.cubic_meter())
        self._booked_weight = Quantity(Decimal("0"), Unit.ton())
        self._booked_volume = Quantity(Decimal("0"), Unit.cubic_meter())

    def can_accept(self, cargo: Cargo) -> bool:
        """화물을 적재할 수 있는가?"""
        new_weight = self._booked_weight.add(cargo.size.weight)
        new_volume = self._booked_volume.add(cargo.size.volume)

        return (
            not new_weight.is_greater_than(self._max_weight)
            and not new_volume.is_greater_than(self._max_volume)
        )

    def book(self, cargo: Cargo) -> None:
        """화물 예약"""
        if not self.can_accept(cargo):
            raise CapacityExceeded()
        self._booked_weight = self._booked_weight.add(cargo.size.weight)
        self._booked_volume = self._booked_volume.add(cargo.size.volume)
```

---

## 예시 3: Range 패턴

### 문제 상황

**범위**를 다루는 로직이 곳곳에 흩어져 있다.

```python
# 날짜 범위
if start_date <= event_date <= end_date:
    # ...

# 가격 범위
if min_price <= price <= max_price:
    # ...

# 무게 범위
if min_weight <= cargo.weight <= max_weight:
    # ...
```

### Range 패턴

```python
from dataclasses import dataclass
from typing import Generic, TypeVar, Protocol


class Comparable(Protocol):
    def __lt__(self, other: "Comparable") -> bool: ...
    def __le__(self, other: "Comparable") -> bool: ...
    def __gt__(self, other: "Comparable") -> bool: ...
    def __ge__(self, other: "Comparable") -> bool: ...


T = TypeVar('T', bound=Comparable)


@dataclass(frozen=True)
class Range(Generic[T]):
    """범위 — 시작과 끝"""
    start: T
    end: T

    def __post_init__(self) -> None:
        if self.start > self.end:
            raise ValueError(f"start {self.start} > end {self.end}")

    def includes(self, value: T) -> bool:
        """값이 범위 내에 있는가?"""
        return self.start <= value <= self.end

    def includes_range(self, other: "Range[T]") -> bool:
        """다른 범위를 완전히 포함하는가?"""
        return self.start <= other.start and other.end <= self.end

    def overlaps(self, other: "Range[T]") -> bool:
        """다른 범위와 겹치는가?"""
        return self.start <= other.end and other.start <= self.end

    def gap(self, other: "Range[T]") -> "Range[T] | None":
        """두 범위 사이의 간격"""
        if self.overlaps(other):
            return None
        if self.end < other.start:
            return Range(self.end, other.start)
        return Range(other.end, self.start)


# 날짜 범위 — Range[date]
@dataclass(frozen=True)
class DateRange(Range[date]):
    """날짜 범위"""

    def days(self) -> int:
        return (self.end - self.start).days + 1

    def is_current(self) -> bool:
        return self.includes(date.today())


# 사용
voyage_period = DateRange(date(2024, 1, 1), date(2024, 1, 15))
deadline = date(2024, 1, 10)

if voyage_period.includes(deadline):
    print("기한 내 도착 가능")


# 무게 범위
@dataclass(frozen=True)
class WeightRange(Range[Quantity]):
    """무게 범위"""

    def includes(self, value: Quantity) -> bool:
        # Quantity 비교는 단위 변환 포함
        return (
            not value.is_greater_than(self.end)
            and not self.start.is_greater_than(value)
        )
```

---

## 예시 4: Observation 패턴

### 문제 상황

화물의 **상태 이력**을 추적해야 한다.

```
요구사항:
• 화물의 위치, 상태, 온도 등 기록
• 언제 어디서 관측되었는지 추적
• 시점별 상태 조회 가능
```

### Observation 패턴

```
┌─────────────────────────────────────────────────────────────┐
│                    Observation                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌────────────────┐    ┌──────────────────────┐            │
│   │  Observable    │    │  ObservationType     │            │
│   │  (Cargo)       │    │  (LocationCheck,     │            │
│   │                │    │   TemperatureCheck)  │            │
│   └───────┬────────┘    └──────────┬───────────┘            │
│           │                        │                         │
│           ▼                        ▼                         │
│   ┌─────────────────────────────────────────┐               │
│   │           Observation                    │               │
│   ├─────────────────────────────────────────┤               │
│   │ observable: Observable                   │               │
│   │ type: ObservationType                    │               │
│   │ observed_at: datetime                    │               │
│   │ value: ObservationValue                  │               │
│   └─────────────────────────────────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 구현

```python
from abc import ABC, abstractmethod
from datetime import datetime
from dataclasses import dataclass
from typing import TypeVar, Generic


# Observation Type
@dataclass(frozen=True)
class ObservationType:
    """관측 유형"""
    name: str

    @classmethod
    def location_check(cls) -> "ObservationType":
        return cls("LocationCheck")

    @classmethod
    def temperature_check(cls) -> "ObservationType":
        return cls("TemperatureCheck")

    @classmethod
    def weight_check(cls) -> "ObservationType":
        return cls("WeightCheck")


# Observation Value (다형적)
class ObservationValue(ABC):
    """관측 값 — 추상 기본 클래스"""
    pass


@dataclass(frozen=True)
class LocationValue(ObservationValue):
    """위치 관측 값"""
    location: Location


@dataclass(frozen=True)
class TemperatureValue(ObservationValue):
    """온도 관측 값"""
    celsius: Decimal


@dataclass(frozen=True)
class QuantityValue(ObservationValue):
    """수량 관측 값"""
    quantity: Quantity


# Observation
@dataclass(frozen=True)
class Observation:
    """관측 기록"""
    observation_type: ObservationType
    observed_at: datetime
    value: ObservationValue


# Observable (Cargo)
class ObservableHistory:
    """관측 이력을 가진 객체"""

    def __init__(self) -> None:
        self._observations: list[Observation] = []

    def record_observation(self, observation: Observation) -> None:
        """관측 기록 추가"""
        self._observations.append(observation)
        # 시간순 정렬
        self._observations.sort(key=lambda o: o.observed_at)

    def observations_of_type(
        self,
        obs_type: ObservationType
    ) -> list[Observation]:
        """특정 유형의 관측 기록들"""
        return [o for o in self._observations
                if o.observation_type == obs_type]

    def latest_observation(
        self,
        obs_type: ObservationType
    ) -> Observation | None:
        """특정 유형의 최신 관측"""
        observations = self.observations_of_type(obs_type)
        return observations[-1] if observations else None

    def observation_at(
        self,
        obs_type: ObservationType,
        at_time: datetime
    ) -> Observation | None:
        """특정 시점의 관측 (가장 가까운 이전 관측)"""
        observations = self.observations_of_type(obs_type)
        result = None
        for obs in observations:
            if obs.observed_at <= at_time:
                result = obs
            else:
                break
        return result


# Cargo에 적용
class Cargo:
    def __init__(
        self,
        tracking_id: TrackingId,
        route_specification: RouteSpecification
    ) -> None:
        self._tracking_id = tracking_id
        self._route_specification = route_specification
        self._observation_history = ObservableHistory()

    def record_location(self, location: Location, at: datetime) -> None:
        """위치 기록"""
        self._observation_history.record_observation(
            Observation(
                observation_type=ObservationType.location_check(),
                observed_at=at,
                value=LocationValue(location)
            )
        )

    def record_temperature(self, celsius: Decimal, at: datetime) -> None:
        """온도 기록 (냉동 화물용)"""
        self._observation_history.record_observation(
            Observation(
                observation_type=ObservationType.temperature_check(),
                observed_at=at,
                value=TemperatureValue(celsius)
            )
        )

    def last_known_location(self) -> Location | None:
        """마지막으로 확인된 위치"""
        obs = self._observation_history.latest_observation(
            ObservationType.location_check()
        )
        if obs and isinstance(obs.value, LocationValue):
            return obs.value.location
        return None

    def location_at(self, time: datetime) -> Location | None:
        """특정 시점의 위치"""
        obs = self._observation_history.observation_at(
            ObservationType.location_check(),
            time
        )
        if obs and isinstance(obs.value, LocationValue):
            return obs.value.location
        return None
```

---

## 패턴 활용 지침

### 1. 맹목적으로 따르지 않기

```
Bad:
"Analysis Patterns 책에 이렇게 나와 있으니
 그대로 구현하자"

Good:
"이 패턴의 핵심 아이디어가 우리 도메인에 맞는가?
 어떻게 조정해야 하는가?"
```

### 2. 도메인 용어로 번역

```python
# 패턴 원래 이름: Accountability
# 도메인 용어로: OrganizationalRelationship

class OrganizationalRelationship:  # ← 도메인 용어
    """조직 관계 (Accountability 패턴 적용)"""

    def __init__(
        self,
        parent: Organization,
        child: Party,
        relationship_type: RelationshipType,
        effective_period: DateRange
    ) -> None:
        # ...
```

### 3. 필요한 부분만 취하기

```python
# Quantity 패턴의 전체가 아닌
# 필요한 부분만 단순화

@dataclass(frozen=True)
class Weight:
    """무게 — Quantity 패턴 단순화 버전"""
    kilograms: Decimal

    def add(self, other: "Weight") -> "Weight":
        return Weight(self.kilograms + other.kilograms)

    def to_tons(self) -> Decimal:
        return self.kilograms / Decimal("1000")

    def is_greater_than(self, other: "Weight") -> bool:
        return self.kilograms > other.kilograms


# 단위 변환이 거의 필요 없으면
# 복잡한 Unit 시스템 없이 단순하게
```

### 4. 점진적 도입

```
1단계: 가장 단순한 형태로 시작
2단계: 필요에 따라 점진적 확장
3단계: 패턴의 전체 구조가 필요할 때만 완전 적용
```

---

## 다른 유용한 Analysis Patterns

### Party 패턴

```python
# 고객도, 공급자도, 직원도 모두 "Party"
class Party(ABC):
    pass

class Person(Party):
    pass

class Organization(Party):
    pass

# 계약, 주문 등에서 Party를 참조
class Contract:
    def __init__(
        self,
        customer: Party,  # Person or Organization
        provider: Party
    ) -> None:
        # ...
```

### Money 패턴

```python
# 금액 + 통화
@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: Currency

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise CurrencyMismatch()
        return Money(self.amount + other.amount, self.currency)
```

### Knowledge Level 패턴

```python
# 인스턴스 vs 타입 분리
class ProductType:  # Knowledge Level
    """제품 유형 — 공통 속성"""
    name: str
    default_price: Money
    valid_discounts: list[DiscountPolicy]

class Product:  # Operational Level
    """제품 인스턴스 — 개별 속성"""
    serial_number: str
    product_type: ProductType  # 타입 참조
    actual_price: Money
```

---

## 요약

**Analysis Patterns**는 도메인 모델링의 재사용 가능한 해법이다.

핵심 패턴:
- **Accountability** — 유연한 조직 구조
- **Quantity** — 단위 있는 양
- **Range** — 범위 처리
- **Observation** — 관측 이력

적용 원칙:
- 그대로 복사하지 않음
- 도메인 용어로 번역
- 필요한 부분만 취함
- 점진적 도입

주의:
- 패턴은 **출발점**이지 정답이 아님
- **Ubiquitous Language**에 통합해야 함
- 불필요한 복잡성 피하기

다음 장에서는 **Design Patterns**를 도메인 모델에 적용하는 방법을 다룬다.
