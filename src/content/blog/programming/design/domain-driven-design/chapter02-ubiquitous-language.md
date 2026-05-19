---
title: "Ch 2: Communication and the Use of Language"
date: 2026-05-01T02:00:00
description: "Ubiquitous Language — 도메인 전문가와 개발자 공통 어휘. 모든 곳에서."
tags: [DDD, Ubiquitous Language, Communication]
series: "Domain-Driven Design"
seriesOrder: 2
draft: true
---

## 유비쿼터스 언어란?

**유비쿼터스 언어(Ubiquitous Language)**는 도메인 전문가와 개발자가 **공유하는 언어**다. 이 언어는 코드, 대화, 문서, 다이어그램 — 어디서나 동일하게 사용된다.

![유비쿼터스 언어의 범위](/images/blog/domain-driven-design/diagrams/ch02-ubiquitous-language.svg)

---

## 왜 유비쿼터스 언어가 필요한가?

### 번역의 비용

언어가 다르면 번역이 필요하다. 번역은 비용이다.

![번역 없는 세계 vs 있는 세계](/images/blog/domain-driven-design/diagrams/ch02-translation-cost.svg)

### 코드가 모델이 된다

유비쿼터스 언어를 사용하면 **코드 자체가 도메인 문서**가 된다.

**Before: 코드와 도메인이 분리됨**
```cpp
// 무슨 뜻인지 도메인 전문가가 이해할 수 없음
class ShipmentData {
    std::string src;
    std::string dst;
    std::vector<RouteSegment> segs;
};
```

**After: 코드가 도메인 언어를 말함**
```cpp
// 도메인 전문가도 읽을 수 있음
class Cargo {
    TrackingId tracking_id;
    RouteSpecification route_specification;
    Itinerary itinerary;
};
```

---

## 유비쿼터스 언어 구축

### 1. 용어 수집

도메인 전문가와 대화하며 용어를 수집한다.

```
해운 도메인 용어 사전
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

용어              정의                      코드
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cargo            운송할 화물                class Cargo
Tracking ID      화물 추적 번호             class TrackingId
Itinerary        화물의 전체 여정           class Itinerary
Leg              여정의 한 구간             class Leg
Voyage           선박의 정기 운항           class Voyage
Route Spec       고객 요구 경로 조건        class RouteSpecification
Load             화물 선적                  cargo.load()
Unload           화물 하역                  cargo.unload()
Handling Event   화물 처리 이벤트           class HandlingEvent
```

### 2. 코드에 반영

수집한 용어를 **그대로** 코드에 사용한다.

**C++ - 유비쿼터스 언어가 반영된 코드**
```cpp
// 용어가 그대로 코드에 나타남
class Cargo {
public:
    TrackingId tracking_id() const { return tracking_id_; }

    // "화물에 여정을 할당한다" → assignItinerary
    void assignItinerary(Itinerary itinerary);

    // "화물이 경로가 지정되었는가?" → isRouted
    bool isRouted() const;

    // "화물이 잘못 경로 지정되었는가?" → isMisrouted
    bool isMisrouted() const;

private:
    TrackingId tracking_id_;
    RouteSpecification route_specification_;
    std::optional<Itinerary> itinerary_;
};

// "화물의 현재 위치를 조회한다"
Location currentLocationOf(const Cargo& cargo);

// "화물의 배송 이력을 조회한다"
std::vector<HandlingEvent> deliveryHistoryOf(const Cargo& cargo);
```

**Python - 유비쿼터스 언어가 반영된 코드**
```python
class Cargo:
    """화물 - 운송의 핵심 엔티티"""

    def __init__(
        self,
        tracking_id: TrackingId,
        route_specification: RouteSpecification
    ):
        self._tracking_id = tracking_id
        self._route_specification = route_specification
        self._itinerary: Itinerary | None = None

    @property
    def tracking_id(self) -> TrackingId:
        return self._tracking_id

    def assign_itinerary(self, itinerary: Itinerary) -> None:
        """화물에 여정을 할당한다"""
        self._itinerary = itinerary

    @property
    def is_routed(self) -> bool:
        """화물이 경로가 지정되었는가?"""
        return self._itinerary is not None

    @property
    def is_misrouted(self) -> bool:
        """화물이 잘못 경로 지정되었는가?"""
        if self._itinerary is None:
            return False
        return not self._route_specification.is_satisfied_by(self._itinerary)


def current_location_of(cargo: Cargo) -> Location:
    """화물의 현재 위치를 조회한다"""
    ...

def delivery_history_of(cargo: Cargo) -> list[HandlingEvent]:
    """화물의 배송 이력을 조회한다"""
    ...
```

### 3. 대화에서 사용

회의, 이메일, 슬랙 — 모든 커뮤니케이션에서 같은 언어를 사용한다.

**BAD: 언어가 섞임**
```
개발자: "주문 데이터의 destination 필드가 null이에요"
전문가: "배송지가 없다고요? 그건 필수인데..."
개발자: "아, Shipment 테이블의 address 컬럼 말씀이시죠?"
```

**GOOD: 유비쿼터스 언어 사용**
```
개발자: "Cargo의 RouteSpecification에 destination이 없어요"
전문가: "RouteSpecification은 항상 destination이 있어야 해요"
개발자: "RouteSpecification 생성 시 validation을 추가할게요"
```

---

## 언어 충돌 해결

### 동의어 (Synonyms) 처리

같은 개념을 다른 단어로 부르는 경우.

```
문제:
  - 영업팀: "주문(Order)"
  - 물류팀: "배송 요청(Delivery Request)"
  - 개발팀: "트랜잭션(Transaction)"

  → 모두 같은 개념을 가리킴!

해결:
  → 하나의 용어 선택: "Cargo"
  → 모든 곳에서 Cargo만 사용
  → 용어 사전에 동의어 기록 (참고용)
```

### 다의어 (Polysemy) 처리

같은 단어가 다른 의미로 쓰이는 경우.

```
문제:
  "Shipment"의 의미가 문맥마다 다름
  - 창고팀: 포장된 박스
  - 물류팀: 운송 과정
  - 고객: 배송 추적 단위

해결:
  → 각 의미에 다른 용어 부여
  → Package (포장 단위)
  → Cargo (운송 단위)
  → Delivery (배송 추적 단위)
```

**C++ - 명확한 구분**
```cpp
// 다의어를 피한 명확한 모델
class Package {
    // 창고에서 관리하는 물리적 포장 단위
    Dimensions dimensions;
    Weight weight;
};

class Cargo {
    // 운송 시스템에서 추적하는 운송 단위
    TrackingId tracking_id;
    Itinerary itinerary;
};

class Delivery {
    // 고객에게 보이는 배송 추적 단위
    DeliveryId delivery_id;
    DeliveryStatus status;
};
```

**Python - 명확한 구분**
```python
@dataclass
class Package:
    """창고에서 관리하는 물리적 포장 단위"""
    dimensions: Dimensions
    weight: Weight

@dataclass
class Cargo:
    """운송 시스템에서 추적하는 운송 단위"""
    tracking_id: TrackingId
    itinerary: Itinerary | None

@dataclass
class Delivery:
    """고객에게 보이는 배송 추적 단위"""
    delivery_id: DeliveryId
    status: DeliveryStatus
```

---

## 이중 언어 환경 (한국어/영어)

한국 프로젝트에서 흔한 문제: 도메인 전문가는 한국어, 코드는 영어.

### 전략 1: 영어 용어 통일

도메인 전문가도 영어 용어를 사용하도록 합의.

```
대화 예시:
전문가: "이 Cargo의 Itinerary가 RouteSpecification을 만족하나요?"
개발자: "네, RouteSpecification.isSatisfiedBy(itinerary) 확인했습니다"
```

**장점:** 코드와 대화가 완전히 일치
**단점:** 도메인 전문가 학습 비용

### 전략 2: 매핑 테이블 유지

한국어 ↔ 영어 매핑을 문서화.

```
┌──────────────┬──────────────────┬─────────────────────┐
│ 한국어        │ English          │ Code               │
├──────────────┼──────────────────┼─────────────────────┤
│ 화물          │ Cargo            │ class Cargo        │
│ 추적번호      │ Tracking ID      │ class TrackingId   │
│ 여정          │ Itinerary        │ class Itinerary    │
│ 구간          │ Leg              │ class Leg          │
│ 항해          │ Voyage           │ class Voyage       │
│ 경로사양      │ Route Spec       │ RouteSpecification │
│ 선적          │ Load             │ load()             │
│ 하역          │ Unload           │ unload()           │
└──────────────┴──────────────────┴─────────────────────┘
```

### 전략 3: 하이브리드

핵심 용어는 영어로 통일, 설명은 한국어.

```cpp
class Cargo {  // 화물
public:
    void assignItinerary(Itinerary itinerary);  // 여정 할당
    bool isMisrouted() const;  // 잘못된 경로 여부
};
```

```python
class Cargo:  # 화물
    def assign_itinerary(self, itinerary: Itinerary) -> None:
        """여정을 할당한다 (Assign Itinerary)"""
        ...

    @property
    def is_misrouted(self) -> bool:
        """잘못된 경로 여부 (Is Misrouted)"""
        ...
```

---

## 언어를 진화시키기

유비쿼터스 언어는 고정된 것이 아니다. 도메인 이해가 깊어지면 언어도 진화한다.

### 언어 변경 시 코드도 변경

```
Before: "화물의 상태" = CargoStatus
After: "화물의 배송 상태" = DeliveryStatus (더 정확함)

→ 코드 리팩토링 필요!
```

**리팩토링 예시**
```cpp
// Before
enum class CargoStatus {
    IN_PORT,
    ON_BOARD,
    DELIVERED
};

// After - 더 정확한 도메인 언어
enum class TransportStatus {
    NOT_RECEIVED,      // 미접수
    IN_PORT,           // 항구 대기
    ONBOARD_CARRIER,   // 운송 중
    CLAIMED,           // 인도됨
    UNKNOWN            // 알 수 없음
};
```

```python
# Before
class CargoStatus(Enum):
    IN_PORT = "in_port"
    ON_BOARD = "on_board"
    DELIVERED = "delivered"

# After - 더 정확한 도메인 언어
class TransportStatus(Enum):
    NOT_RECEIVED = "not_received"      # 미접수
    IN_PORT = "in_port"                # 항구 대기
    ONBOARD_CARRIER = "onboard"        # 운송 중
    CLAIMED = "claimed"                # 인도됨
    UNKNOWN = "unknown"                # 알 수 없음
```

### 새로운 개념 발견

대화 중 새로운 개념이 등장하면 즉시 모델에 반영.

```
대화:
전문가: "화물이 목적지에 도착해도 고객이 찾아가지 않으면 문제예요"
개발자: "그 상태를 뭐라고 부르나요?"
전문가: "인도 대기(Awaiting Claim)라고 해요"

→ 새 개념 추가!
```

```cpp
enum class TransportStatus {
    // ... 기존 상태들
    AWAITING_CLAIM,  // 새로 발견된 개념: 인도 대기
    CLAIMED
};
```

---

## 테스트에서의 유비쿼터스 언어

테스트 코드도 유비쿼터스 언어를 사용해야 한다. 테스트가 **실행 가능한 명세서**가 된다.

**C++ - 도메인 언어로 작성된 테스트**
```cpp
TEST(CargoTest, CanBeAssignedAnItinerary) {
    // Given: 서울에서 뉴욕으로 가는 화물
    auto cargo = CargoBuilder()
        .from(SEOUL)
        .to(NEW_YORK)
        .build();

    // When: 여정을 할당하면
    auto itinerary = ItineraryBuilder()
        .leg(SEOUL, SHANGHAI, voyage("V100"))
        .leg(SHANGHAI, NEW_YORK, voyage("V200"))
        .build();

    cargo.assignItinerary(itinerary);

    // Then: 화물은 경로가 지정된 상태가 된다
    EXPECT_TRUE(cargo.isRouted());
}

TEST(CargoTest, IsMisroutedWhenItineraryDoesNotSatisfyRouteSpecification) {
    // Given: 서울에서 뉴욕으로 가는 화물
    auto cargo = CargoBuilder()
        .from(SEOUL)
        .to(NEW_YORK)
        .build();

    // When: 다른 목적지로 가는 여정을 할당하면
    auto wrongItinerary = ItineraryBuilder()
        .leg(SEOUL, LONDON, voyage("V300"))
        .build();

    cargo.assignItinerary(wrongItinerary);

    // Then: 화물은 잘못된 경로 상태가 된다
    EXPECT_TRUE(cargo.isMisrouted());
}
```

**Python - 도메인 언어로 작성된 테스트**
```python
def test_cargo_can_be_assigned_an_itinerary():
    """화물에 여정을 할당할 수 있다"""
    # Given: 서울에서 뉴욕으로 가는 화물
    cargo = (CargoBuilder()
        .from_location(SEOUL)
        .to_location(NEW_YORK)
        .build())

    # When: 여정을 할당하면
    itinerary = (ItineraryBuilder()
        .leg(SEOUL, SHANGHAI, voyage("V100"))
        .leg(SHANGHAI, NEW_YORK, voyage("V200"))
        .build())

    cargo.assign_itinerary(itinerary)

    # Then: 화물은 경로가 지정된 상태가 된다
    assert cargo.is_routed


def test_cargo_is_misrouted_when_itinerary_does_not_satisfy_spec():
    """여정이 경로 사양을 만족하지 않으면 잘못된 경로 상태가 된다"""
    # Given: 서울에서 뉴욕으로 가는 화물
    cargo = (CargoBuilder()
        .from_location(SEOUL)
        .to_location(NEW_YORK)
        .build())

    # When: 다른 목적지로 가는 여정을 할당하면
    wrong_itinerary = (ItineraryBuilder()
        .leg(SEOUL, LONDON, voyage("V300"))
        .build())

    cargo.assign_itinerary(wrong_itinerary)

    # Then: 화물은 잘못된 경로 상태가 된다
    assert cargo.is_misrouted
```

---

## 유비쿼터스 언어 체크리스트

```
┌─────────────────────────────────────────────────────────┐
│              유비쿼터스 언어 점검표                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  □ 용어 사전이 있는가?                                   │
│                                                         │
│  □ 코드의 클래스/메서드 이름이 도메인 용어인가?           │
│                                                         │
│  □ 도메인 전문가가 코드를 읽고 이해할 수 있는가?          │
│                                                         │
│  □ 대화에서 코드와 같은 용어를 사용하는가?               │
│                                                         │
│  □ 동의어가 제거되었는가? (하나의 개념 = 하나의 용어)    │
│                                                         │
│  □ 다의어가 분리되었는가? (하나의 용어 = 하나의 의미)    │
│                                                         │
│  □ 테스트가 도메인 언어로 작성되었는가?                  │
│                                                         │
│  □ 새로운 용어가 발견되면 코드에 즉시 반영하는가?        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 요약

유비쿼터스 언어의 핵심:

1. **공유 언어**: 도메인 전문가와 개발자가 같은 용어 사용
2. **어디서나 동일**: 코드, 대화, 문서, 테스트 — 모두 같은 언어
3. **코드 = 모델**: 코드 자체가 도메인 문서가 됨
4. **동의어 제거**: 하나의 개념에 하나의 용어
5. **다의어 분리**: 하나의 용어에 하나의 의미
6. **진화하는 언어**: 도메인 이해가 깊어지면 언어도 변화

> "A project faces serious problems when its language is fractured."
> — Eric Evans

---

## 다음 장 예고

다음 장에서는 **모델과 구현의 결합(Binding Model and Implementation)**을 다룬다. 모델이 단순한 분석 산출물이 아니라 실제 코드의 뼈대가 되어야 하는 이유를 배운다.
