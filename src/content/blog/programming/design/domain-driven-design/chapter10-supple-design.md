---
title: "Ch 10: Supple Design"
date: 2025-10-01T10:00:00
description: "Intention-Revealing / Side-Effect-Free / Assertions / Standalone Class / Closure of Operations."
tags: [DDD, Supple Design]
series: "Domain-Driven Design"
seriesOrder: 10
draft: true
---

## Supple Design이란?

**Supple Design**은 **유연하고 사용하기 좋은** 설계다.

```
Supple = 유연한, 유순한

목표:
• 클라이언트 개발자가 쉽게 이해
• 변경이 쉽고 안전
• 의도가 명확히 드러남
• 조합이 자유로움
```

좋은 모델도 **사용하기 어려우면** 가치가 떨어진다.

---

## 1. Intention-Revealing Interfaces

인터페이스가 **의도를 드러내야** 한다.

### Bad — 구현을 드러냄

```python
class Account:
    def set_balance(self, new_balance: Money) -> None:
        self._balance = new_balance
        self._last_modified = datetime.now()

    def get_balance(self) -> Money:
        return self._balance


# 클라이언트 코드
def transfer(source: Account, target: Account, amount: Money) -> None:
    # 무슨 일이 일어나는지 추측해야 함
    source.set_balance(source.get_balance() - amount)
    target.set_balance(target.get_balance() + amount)
```

문제점:
- `set_balance`가 뭘 하는지 불명확
- "이체"라는 의도가 드러나지 않음
- 실수하기 쉬움 (순서 틀림, 검증 누락)

### Good — 의도를 드러냄

```python
class Account:
    def withdraw(self, amount: Money) -> None:
        """계좌에서 금액을 출금한다."""
        if amount > self._balance:
            raise InsufficientFunds(self._balance, amount)
        self._balance = self._balance - amount
        self._last_modified = datetime.now()

    def deposit(self, amount: Money) -> None:
        """계좌에 금액을 입금한다."""
        self._balance = self._balance + amount
        self._last_modified = datetime.now()

    @property
    def balance(self) -> Money:
        """현재 잔액을 반환한다."""
        return self._balance


# 클라이언트 코드 — 의도가 명확
def transfer(source: Account, target: Account, amount: Money) -> None:
    source.withdraw(amount)  # 출금
    target.deposit(amount)   # 입금
```

변화:
- 메서드 이름이 **비즈니스 의도**를 표현
- 클라이언트가 **어떻게**가 아닌 **무엇을** 하는지 이해
- 검증 로직이 내부에 캡슐화

### 화물 운송 예시

```python
# Bad
class Cargo:
    def set_itinerary(self, itinerary: Itinerary) -> None:
        self._itinerary = itinerary

    def set_delivery(self, delivery: Delivery) -> None:
        self._delivery = delivery


# Good — 의도가 드러남
class Cargo:
    def assign_itinerary(self, itinerary: Itinerary) -> None:
        """화물에 여정을 할당한다.

        여정이 경로 명세를 만족하는지 검증하고,
        인도 상태를 재계산한다.
        """
        if not self._route_specification.is_satisfied_by(itinerary):
            raise ItineraryDoesNotSatisfyRouteSpec()
        self._itinerary = itinerary
        self._derive_delivery_progress()

    def specify_new_route(
        self,
        origin: Location,
        destination: Location,
        deadline: datetime
    ) -> None:
        """새로운 경로 요구사항을 지정한다."""
        self._route_specification = RouteSpecification(
            origin, destination, deadline
        )
        self._itinerary = None  # 기존 여정 무효화
        self._derive_delivery_progress()
```

```cpp
// C++ 버전
class Cargo {
public:
    // Good: 의도를 드러내는 메서드명
    void assignItinerary(const Itinerary& itinerary) {
        if (!routeSpecification_.isSatisfiedBy(itinerary)) {
            throw ItineraryDoesNotSatisfyRouteSpec();
        }
        itinerary_ = itinerary;
        deriveDeliveryProgress();
    }

    void specifyNewRoute(
        const Location& origin,
        const Location& destination,
        const DateTime& deadline
    ) {
        routeSpecification_ = RouteSpecification(origin, destination, deadline);
        itinerary_.reset();
        deriveDeliveryProgress();
    }

private:
    void deriveDeliveryProgress() {
        // 내부 계산
    }
};
```

---

## 2. Side-Effect-Free Functions

**부수 효과가 없는 함수**는 이해하기 쉽고 안전하다.

```
Query (질의) — 상태 변경 없이 값 반환
Command (명령) — 상태 변경, 반환값 없음 (또는 최소화)
```

### Query — 순수 함수

```python
@dataclass(frozen=True)
class RouteSpecification:
    origin: Location
    destination: Location
    deadline: datetime

    def is_satisfied_by(self, itinerary: Itinerary) -> bool:
        """여정이 이 명세를 만족하는가? (순수 함수)"""
        return (
            itinerary.origin == self.origin
            and itinerary.final_destination == self.destination
            and itinerary.final_arrival_date <= self.deadline
        )

    def remaining_transit_days(self, as_of: datetime) -> int:
        """남은 운송 가능 일수 (순수 함수)"""
        delta = self.deadline - as_of
        return max(0, delta.days)


@dataclass(frozen=True)
class Itinerary:
    legs: tuple[Leg, ...]

    @property
    def origin(self) -> Location:
        """출발지 (순수)"""
        return self.legs[0].load_location

    @property
    def final_destination(self) -> Location:
        """최종 목적지 (순수)"""
        return self.legs[-1].unload_location

    @property
    def final_arrival_date(self) -> datetime:
        """최종 도착 예정일 (순수)"""
        return self.legs[-1].unload_time

    def expected_location_at(self, time: datetime) -> Location | None:
        """특정 시점의 예상 위치 (순수)"""
        for leg in self.legs:
            if leg.load_time <= time < leg.unload_time:
                return leg.voyage.location_at(time)
            if time < leg.load_time:
                return leg.load_location
        return self.final_destination
```

```cpp
// C++ 버전 — const 멤버 함수
class RouteSpecification {
public:
    // const = 객체 상태 변경 없음
    bool isSatisfiedBy(const Itinerary& itinerary) const {
        return itinerary.origin() == origin_
            && itinerary.finalDestination() == destination_
            && itinerary.finalArrivalDate() <= deadline_;
    }

    int remainingTransitDays(const DateTime& asOf) const {
        auto delta = deadline_ - asOf;
        return std::max(0, delta.days());
    }

private:
    Location origin_;
    Location destination_;
    DateTime deadline_;
};

class Itinerary {
public:
    // const getter = 순수 함수
    Location origin() const {
        return legs_.front().loadLocation();
    }

    Location finalDestination() const {
        return legs_.back().unloadLocation();
    }

    std::optional<Location> expectedLocationAt(const DateTime& time) const {
        for (const auto& leg : legs_) {
            if (leg.loadTime() <= time && time < leg.unloadTime()) {
                return leg.voyage().locationAt(time);
            }
        }
        return finalDestination();
    }

private:
    std::vector<Leg> legs_;
};
```

### Value Object의 장점

```python
# Value Object는 불변 → 모든 메서드가 순수 함수

@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str

    def add(self, other: "Money") -> "Money":
        """두 금액을 더한다 — 새 객체 반환"""
        if self.currency != other.currency:
            raise CurrencyMismatch(self.currency, other.currency)
        return Money(self.amount + other.amount, self.currency)

    def subtract(self, other: "Money") -> "Money":
        """금액을 뺀다 — 새 객체 반환"""
        if self.currency != other.currency:
            raise CurrencyMismatch(self.currency, other.currency)
        return Money(self.amount - other.amount, self.currency)

    def multiply(self, factor: Decimal) -> "Money":
        """금액에 배수를 곱한다 — 새 객체 반환"""
        return Money(self.amount * factor, self.currency)

    def is_greater_than(self, other: "Money") -> bool:
        """비교 — 순수 함수"""
        if self.currency != other.currency:
            raise CurrencyMismatch(self.currency, other.currency)
        return self.amount > other.amount


# 사용
total = Money(Decimal("100"), "USD")
tax = total.multiply(Decimal("0.1"))
final_amount = total.add(tax)  # 110 USD

# total은 변경되지 않음!
assert total.amount == Decimal("100")
```

---

## 3. Assertions

**단언(Assertions)**은 메서드의 **사후조건(post-condition)**과
객체의 **불변식(invariant)**을 명시한다.

### 사후조건 문서화

```python
class Account:
    def withdraw(self, amount: Money) -> None:
        """계좌에서 금액을 출금한다.

        전제조건 (Precondition):
            - amount > 0
            - amount <= self.balance

        사후조건 (Postcondition):
            - self.balance == old_balance - amount
            - 트랜잭션 히스토리에 출금 기록 추가됨

        불변식 (Invariant):
            - self.balance >= 0 (항상 유지)
        """
        assert amount.amount > 0, "Amount must be positive"

        if amount.is_greater_than(self._balance):
            raise InsufficientFunds(self._balance, amount)

        old_balance = self._balance
        self._balance = self._balance.subtract(amount)
        self._history.append(Withdrawal(amount, datetime.now()))

        # 사후조건 확인
        assert self._balance == old_balance.subtract(amount)
        # 불변식 확인
        assert self._balance.amount >= 0


class Cargo:
    def assign_itinerary(self, itinerary: Itinerary) -> None:
        """여정을 할당한다.

        전제조건:
            - itinerary is not None
            - route_specification.is_satisfied_by(itinerary)

        사후조건:
            - self.itinerary == itinerary
            - self.delivery가 새 여정 기준으로 재계산됨

        불변식:
            - itinerary가 있으면 항상 route_specification을 만족
        """
        assert itinerary is not None

        if not self._route_specification.is_satisfied_by(itinerary):
            raise ItineraryDoesNotSatisfyRouteSpec()

        self._itinerary = itinerary
        self._delivery = Delivery.derived_from(
            self._route_specification,
            self._itinerary,
            self._handling_history
        )

        # 불변식 확인
        assert self._route_specification.is_satisfied_by(self._itinerary)
```

```cpp
// C++ 버전
class Account {
public:
    void withdraw(const Money& amount) {
        // 전제조건
        assert(amount.amount() > 0 && "Amount must be positive");

        if (amount > balance_) {
            throw InsufficientFunds(balance_, amount);
        }

        auto oldBalance = balance_;
        balance_ = balance_ - amount;
        history_.push_back(Withdrawal(amount, DateTime::now()));

        // 사후조건
        assert(balance_ == oldBalance - amount);
        // 불변식
        assert(balance_.amount() >= 0);
    }

private:
    Money balance_;
    std::vector<Transaction> history_;

    // 불변식 검사 메서드
    bool checkInvariant() const {
        return balance_.amount() >= 0;
    }
};
```

### 불변식의 가치

```
불변식을 명시하면:

1. 코드 이해가 쉬워짐
   - "Account의 잔액은 항상 0 이상"
   - "Cargo의 itinerary는 항상 route_specification을 만족"

2. 버그 조기 발견
   - assert 실패 → 버그 위치 즉시 파악

3. 테스트 간소화
   - 불변식만 검증하면 많은 케이스 커버
```

---

## 4. Conceptual Contours

**개념적 윤곽**을 따라 설계하면 자연스럽다.

```
Conceptual Contour = 도메인 개념의 자연스러운 경계
```

### Bad — 잘못된 경계

```python
# 너무 잘게 나눔
class CargoTrackingId:
    pass

class CargoOrigin:
    pass

class CargoDestination:
    pass

class CargoDeadline:
    pass

class CargoRouteSpec:
    def __init__(
        self,
        origin: CargoOrigin,
        destination: CargoDestination,
        deadline: CargoDeadline
    ) -> None:
        # 불필요한 래퍼들
        pass


# 또는 너무 뭉침
class CargoData:
    """모든 화물 관련 데이터"""
    tracking_id: str
    origin: str
    destination: str
    deadline: datetime
    current_location: str
    status: str
    legs: list[dict]
    handling_events: list[dict]
    # ... 끝없이 커짐
```

### Good — 자연스러운 경계

```python
# 개념적으로 응집된 단위들

@dataclass(frozen=True)
class TrackingId:
    """화물 추적 식별자 — 고유 식별 개념"""
    value: str

    @classmethod
    def generate(cls) -> "TrackingId":
        return cls(str(uuid.uuid4()))


@dataclass(frozen=True)
class RouteSpecification:
    """경로 명세 — 운송 요구사항이라는 하나의 개념"""
    origin: Location
    destination: Location
    deadline: datetime

    def is_satisfied_by(self, itinerary: "Itinerary") -> bool:
        # ...


@dataclass(frozen=True)
class Itinerary:
    """여정 — 실제 운송 계획이라는 하나의 개념"""
    legs: tuple[Leg, ...]

    @property
    def origin(self) -> Location:
        # ...

    @property
    def final_destination(self) -> Location:
        # ...


@dataclass(frozen=True)
class Delivery:
    """인도 상태 — 현재 배송 진행 상황이라는 하나의 개념"""
    transport_status: TransportStatus
    routing_status: RoutingStatus
    current_voyage: VoyageNumber | None
    last_known_location: Location | None
    eta: datetime | None
    is_misdirected: bool

    @classmethod
    def derived_from(
        cls,
        spec: RouteSpecification,
        itinerary: Itinerary | None,
        history: HandlingHistory
    ) -> "Delivery":
        # 모든 인도 관련 정보가 함께 계산됨
        # ...
```

### 경계 찾기

```
좋은 경계 찾는 질문:

• 이 개념들이 항상 함께 변경되는가?
  → 함께 변경 = 같은 객체

• 이 개념을 독립적으로 사용할 수 있는가?
  → 독립 사용 = 별도 객체

• 도메인 전문가가 하나의 개념으로 말하는가?
  → 하나로 말함 = 같은 객체

• 비즈니스 규칙이 이 개념들을 묶는가?
  → 규칙이 묶음 = 같은 객체
```

---

## 5. Standalone Classes

**독립적인 클래스**는 이해하기 쉽다.

```
의존성이 적을수록 이해하기 쉽다.
```

### 의존성 줄이기

```python
# Before — 많은 의존성
class Cargo:
    def __init__(
        self,
        tracking_id: TrackingId,
        route_specification: RouteSpecification,
        itinerary: Itinerary,
        delivery: Delivery,
        handling_history: HandlingHistory,
        voyage_repository: VoyageRepository,  # 불필요한 의존
        location_service: LocationService,    # 불필요한 의존
    ) -> None:
        self._tracking_id = tracking_id
        self._route_specification = route_specification
        self._itinerary = itinerary
        self._delivery = delivery
        self._handling_history = handling_history
        self._voyage_repository = voyage_repository
        self._location_service = location_service

    def is_on_track(self) -> bool:
        # Repository 직접 사용 — 나쁨
        voyage = self._voyage_repository.find(self._delivery.current_voyage)
        location = self._location_service.resolve(self._delivery.last_known_location)
        # ...


# After — 최소 의존성
class Cargo:
    def __init__(
        self,
        tracking_id: TrackingId,
        route_specification: RouteSpecification
    ) -> None:
        self._tracking_id = tracking_id
        self._route_specification = route_specification
        self._itinerary: Itinerary | None = None

    def derive_delivery_progress(
        self,
        history: HandlingHistory
    ) -> Delivery:
        """인도 상태를 계산한다 — 필요한 것만 인자로"""
        return Delivery.derived_from(
            self._route_specification,
            self._itinerary,
            history
        )
```

### Value Object의 완전한 독립성

```python
@dataclass(frozen=True)
class Money:
    """완전히 독립적인 Value Object"""
    amount: Decimal
    currency: str

    # 외부 의존성 전혀 없음
    # 자기 완결적 연산만 제공

    def add(self, other: "Money") -> "Money":
        self._check_same_currency(other)
        return Money(self.amount + other.amount, self.currency)

    def _check_same_currency(self, other: "Money") -> None:
        if self.currency != other.currency:
            raise CurrencyMismatch(self.currency, other.currency)


@dataclass(frozen=True)
class DateRange:
    """독립적인 날짜 범위"""
    start: date
    end: date

    def __post_init__(self) -> None:
        if self.start > self.end:
            raise InvalidDateRange(self.start, self.end)

    def contains(self, d: date) -> bool:
        return self.start <= d <= self.end

    def overlaps(self, other: "DateRange") -> bool:
        return self.start <= other.end and other.start <= self.end

    def days(self) -> int:
        return (self.end - self.start).days + 1
```

```cpp
// C++ 버전 — 독립적인 Value Object
class Money {
public:
    Money(Decimal amount, std::string currency)
        : amount_(amount), currency_(std::move(currency)) {}

    // 외부 의존성 없음
    Money add(const Money& other) const {
        checkSameCurrency(other);
        return Money(amount_ + other.amount_, currency_);
    }

    Money subtract(const Money& other) const {
        checkSameCurrency(other);
        return Money(amount_ - other.amount_, currency_);
    }

    bool operator>(const Money& other) const {
        checkSameCurrency(other);
        return amount_ > other.amount_;
    }

private:
    Decimal amount_;
    std::string currency_;

    void checkSameCurrency(const Money& other) const {
        if (currency_ != other.currency_) {
            throw CurrencyMismatch(currency_, other.currency_);
        }
    }
};
```

---

## 6. Closure of Operations

**연산의 폐쇄성** — 연산 결과가 같은 타입이면 조합이 자유롭다.

```
a + b = c (모두 같은 타입)
→ 체이닝 가능: a + b + c + d + ...
```

### Value Object에서의 Closure

```python
@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str

    # Closure: Money → Money
    def add(self, other: "Money") -> "Money":
        self._check_currency(other)
        return Money(self.amount + other.amount, self.currency)

    def subtract(self, other: "Money") -> "Money":
        self._check_currency(other)
        return Money(self.amount - other.amount, self.currency)

    def negate(self) -> "Money":
        return Money(-self.amount, self.currency)


# Closure 덕분에 체이닝 가능
total = (
    price
    .add(tax)
    .add(shipping)
    .subtract(discount)
)


@dataclass(frozen=True)
class TimeRange:
    start: time
    end: time

    # Closure: TimeRange → TimeRange
    def extend_by(self, minutes: int) -> "TimeRange":
        new_end = self._add_minutes(self.end, minutes)
        return TimeRange(self.start, new_end)

    def shift_by(self, minutes: int) -> "TimeRange":
        new_start = self._add_minutes(self.start, minutes)
        new_end = self._add_minutes(self.end, minutes)
        return TimeRange(new_start, new_end)

    # Closure: TimeRange × TimeRange → TimeRange
    def intersection(self, other: "TimeRange") -> "TimeRange | None":
        start = max(self.start, other.start)
        end = min(self.end, other.end)
        if start >= end:
            return None
        return TimeRange(start, end)
```

### Specification에서의 Closure

```python
class Specification(ABC, Generic[T]):
    @abstractmethod
    def is_satisfied_by(self, candidate: T) -> bool:
        pass

    # Closure: Specification × Specification → Specification
    def and_(self, other: "Specification[T]") -> "Specification[T]":
        return AndSpecification(self, other)

    def or_(self, other: "Specification[T]") -> "Specification[T]":
        return OrSpecification(self, other)

    def not_(self) -> "Specification[T]":
        return NotSpecification(self)


# Closure 덕분에 자유로운 조합
spec = (
    HasCapacitySpec(100)
    .and_(DestinationSpec(Location("TOKYO")))
    .and_(HazardousAllowedSpec())
    .or_(PriorityVoyageSpec())
)

suitable = [v for v in voyages if spec.is_satisfied_by(v)]
```

```cpp
// C++ 버전
template<typename T>
class Specification {
public:
    virtual bool isSatisfiedBy(const T& candidate) const = 0;

    // Closure: Specification<T> → Specification<T>
    std::shared_ptr<Specification<T>> andSpec(
        std::shared_ptr<Specification<T>> other
    ) const {
        return std::make_shared<AndSpecification<T>>(
            shared_from_this(),
            std::move(other)
        );
    }

    std::shared_ptr<Specification<T>> orSpec(
        std::shared_ptr<Specification<T>> other
    ) const {
        return std::make_shared<OrSpecification<T>>(
            shared_from_this(),
            std::move(other)
        );
    }
};
```

---

## 7. Declarative Design

**선언적 설계** — **무엇을** 원하는지 표현하고, **어떻게**는 숨긴다.

### 명령형 vs 선언형

```python
# 명령형 (Imperative) — 어떻게
def find_suitable_voyages(cargo: Cargo, voyages: list[Voyage]) -> list[Voyage]:
    result = []
    for voyage in voyages:
        if voyage.available_capacity() >= cargo.size:
            if cargo.destination in voyage.stops():
                if not cargo.is_hazardous or voyage.allows_hazardous():
                    result.append(voyage)
    return result


# 선언형 (Declarative) — 무엇을
def find_suitable_voyages(cargo: Cargo, voyages: list[Voyage]) -> list[Voyage]:
    spec = SuitableVoyageSpecification(cargo)
    return [v for v in voyages if spec.is_satisfied_by(v)]


# 더 선언적으로
class VoyageRepository:
    def find_satisfying(self, spec: Specification[Voyage]) -> list[Voyage]:
        """Specification을 만족하는 모든 항해를 반환"""
        return [v for v in self._voyages if spec.is_satisfied_by(v)]


# 사용
suitable = voyage_repository.find_satisfying(
    SuitableVoyageSpecification(cargo)
)
```

### Specification을 활용한 선언적 쿼리

```python
class CargoRepository:
    def find_all(
        self,
        spec: Specification[Cargo] | None = None
    ) -> list[Cargo]:
        """조건에 맞는 화물 목록 반환"""
        if spec is None:
            return list(self._cargos.values())
        return [c for c in self._cargos.values()
                if spec.is_satisfied_by(c)]


# 선언적 사용
misdirected = cargo_repository.find_all(MisdirectedSpecification())

overdue = cargo_repository.find_all(
    OverdueSpecification(as_of=datetime.now())
)

urgent_misdirected = cargo_repository.find_all(
    MisdirectedSpecification()
    .and_(UrgentSpecification())
)
```

### 빌더 패턴으로 선언적 API

```python
class RouteQuery:
    """경로 검색 — 선언적 빌더"""

    def __init__(self) -> None:
        self._origin: Location | None = None
        self._destination: Location | None = None
        self._deadline: datetime | None = None
        self._avoid: set[Location] = set()
        self._prefer_direct: bool = False

    def from_(self, origin: Location) -> "RouteQuery":
        self._origin = origin
        return self

    def to(self, destination: Location) -> "RouteQuery":
        self._destination = destination
        return self

    def by(self, deadline: datetime) -> "RouteQuery":
        self._deadline = deadline
        return self

    def avoiding(self, *locations: Location) -> "RouteQuery":
        self._avoid.update(locations)
        return self

    def prefer_direct(self) -> "RouteQuery":
        self._prefer_direct = True
        return self

    def build(self) -> RouteSpecification:
        # 검증 및 생성
        assert self._origin is not None
        assert self._destination is not None
        return ExtendedRouteSpecification(
            origin=self._origin,
            destination=self._destination,
            deadline=self._deadline,
            avoid=frozenset(self._avoid),
            prefer_direct=self._prefer_direct
        )


# 선언적 사용
spec = (
    RouteQuery()
    .from_(Location("SHANGHAI"))
    .to(Location("ROTTERDAM"))
    .by(datetime(2024, 6, 1))
    .avoiding(Location("SINGAPORE"))
    .prefer_direct()
    .build()
)

routes = routing_service.find_routes(spec)
```

---

## Supple Design 원칙 정리

```
┌────────────────────────────────────────────────────────────┐
│                    Supple Design                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Intention-Revealing Interfaces                         │
│     → 메서드 이름이 의도를 드러냄                           │
│                                                            │
│  2. Side-Effect-Free Functions                             │
│     → 상태 변경 없이 값 반환 (Query)                        │
│                                                            │
│  3. Assertions                                             │
│     → 사전/사후조건, 불변식 명시                            │
│                                                            │
│  4. Conceptual Contours                                    │
│     → 도메인 개념의 자연스러운 경계                         │
│                                                            │
│  5. Standalone Classes                                     │
│     → 의존성 최소화                                         │
│                                                            │
│  6. Closure of Operations                                  │
│     → 같은 타입 in/out → 조합 자유                         │
│                                                            │
│  7. Declarative Design                                     │
│     → 무엇을 원하는지 표현                                  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 요약

**Supple Design**은 사용하기 좋은 설계다.

핵심 원칙:
- **Intention-Revealing** — 의도를 드러내라
- **Side-Effect-Free** — 부수 효과를 피하라
- **Assertions** — 계약을 명시하라
- **Conceptual Contours** — 자연스러운 경계를 따르라
- **Standalone** — 의존성을 최소화하라
- **Closure** — 연산 결과가 같은 타입이면 조합이 자유롭다
- **Declarative** — 무엇을 원하는지 표현하라

결과:
- 이해하기 쉬운 코드
- 안전한 변경
- 자유로운 조합
- 풍부한 도메인 표현

다음 장에서는 **Analysis Patterns** — 기존 패턴을 활용한 모델링을 다룬다.
