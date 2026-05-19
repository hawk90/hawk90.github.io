---
title: "Ch 1: Crunching Knowledge"
date: 2026-05-01T01:00:00
description: "도메인 지식을 코드로 — 끊임없는 학습 / 모델링 / 정제."
tags: [DDD, Knowledge, Modeling]
series: "Domain-Driven Design"
seriesOrder: 1
draft: true
---

## 지식 탐구의 시작

소프트웨어의 핵심은 **도메인 지식**이다. 기술이 아니다. 가장 뛰어난 코드도 잘못된 도메인 이해 위에 세워지면 쓸모없다.

![소프트웨어 성공의 핵심](/images/blog/domain-driven-design/diagrams/ch01-knowledge-hierarchy.svg)

---

## 도메인 전문가와의 협업

### 지식은 어디에 있는가?

도메인 지식은 **도메인 전문가**의 머릿속에 있다. 개발자의 머릿속이 아니다.

**도메인 전문가 예시:**
- 해운 시스템: 선적 담당자, 물류 관리자
- 금융 시스템: 트레이더, 리스크 관리자
- 의료 시스템: 의사, 간호사, 병원 행정가
- 전자상거래: 상품 기획자, 주문 처리 담당자

### 지식 추출 과정

![지식 추출 사이클](/images/blog/domain-driven-design/diagrams/ch01-knowledge-cycle.svg)

---

## 예제: 화물 해운 시스템

원서의 예제를 따라 **화물 해운 시스템**을 도메인으로 사용한다.

### 첫 번째 대화

**도메인 전문가:** "화물(Cargo)을 출발지에서 목적지로 운송해야 해요."

**개발자의 첫 모델 (너무 단순):**

```cpp
// C++ - 첫 번째 시도: 너무 단순함
class Cargo {
public:
    std::string origin;
    std::string destination;
};
```

```python
# Python - 첫 번째 시도: 너무 단순함
class Cargo:
    def __init__(self, origin: str, destination: str):
        self.origin = origin
        self.destination = destination
```

**도메인 전문가:** "아니요, 화물은 여러 구간을 거쳐서 이동해요. 각 구간마다 다른 운송 수단을 쓸 수 있어요."

### 두 번째 대화 - 모델 발전

**개발자:** "구간이라는 게 뭔가요?"

**도메인 전문가:** "레그(Leg)라고 해요. 한 레그는 출발 항구, 도착 항구, 그리고 그 구간을 운항하는 항해(Voyage)로 구성돼요."

```cpp
// C++ - 두 번째 모델: Leg 개념 추가
class Leg {
public:
    Location load_location;      // 선적 장소
    Location unload_location;    // 하역 장소
    Voyage voyage;               // 이 구간을 담당하는 항해
};

class Cargo {
public:
    std::vector<Leg> itinerary;  // 여정 = 레그들의 순서
};
```

```python
# Python - 두 번째 모델: Leg 개념 추가
@dataclass
class Leg:
    load_location: Location      # 선적 장소
    unload_location: Location    # 하역 장소
    voyage: Voyage               # 이 구간을 담당하는 항해

@dataclass
class Cargo:
    itinerary: list[Leg]         # 여정 = 레그들의 순서
```

### 세 번째 대화 - 더 깊은 이해

**개발자:** "항해(Voyage)는 뭔가요?"

**도메인 전문가:** "선박이 정해진 스케줄대로 여러 항구를 도는 거예요. 예를 들어 'V100'이라는 항해는 부산 → 상하이 → 싱가포르 → 로테르담 순으로 운항해요."

```cpp
// C++ - 세 번째 모델: Voyage 상세화
class VoyageNumber {
public:
    explicit VoyageNumber(std::string number) : number_(std::move(number)) {}
    std::string value() const { return number_; }

    bool operator==(const VoyageNumber& other) const {
        return number_ == other.number_;
    }

private:
    std::string number_;
};

class CarrierMovement {
public:
    Location departure_location;
    Location arrival_location;
    std::chrono::system_clock::time_point departure_time;
    std::chrono::system_clock::time_point arrival_time;
};

class Voyage {
public:
    VoyageNumber voyage_number;
    std::vector<CarrierMovement> schedule;
};
```

```python
# Python - 세 번째 모델: Voyage 상세화
@dataclass(frozen=True)
class VoyageNumber:
    """항해 번호 - 값 객체"""
    number: str

@dataclass
class CarrierMovement:
    """운송 구간 - 항해의 한 구간"""
    departure_location: Location
    arrival_location: Location
    departure_time: datetime
    arrival_time: datetime

@dataclass
class Voyage:
    """항해 - 선박의 스케줄"""
    voyage_number: VoyageNumber
    schedule: list[CarrierMovement]
```

---

## 모델 진화의 원칙

### 첫 모델은 항상 틀리다

![모델 진화 단계](/images/blog/domain-driven-design/diagrams/ch01-model-evolution.svg)

### 학습을 코드에 반영

모델이 발전하면 **코드도 함께** 변해야 한다.

**C++ - 도메인 지식이 코드에 녹아든 모델**
```cpp
class Itinerary {
public:
    explicit Itinerary(std::vector<Leg> legs) : legs_(std::move(legs)) {
        if (legs_.empty()) {
            throw std::invalid_argument("Itinerary must have at least one leg");
        }
        validateConnections();
    }

    Location origin() const {
        return legs_.front().load_location;
    }

    Location destination() const {
        return legs_.back().unload_location;
    }

    // 도메인 지식: 레그들이 연결되어야 함
    bool isValid() const {
        for (size_t i = 1; i < legs_.size(); ++i) {
            if (legs_[i-1].unload_location != legs_[i].load_location) {
                return false;
            }
        }
        return true;
    }

private:
    std::vector<Leg> legs_;

    void validateConnections() {
        if (!isValid()) {
            throw std::invalid_argument("Legs must be connected");
        }
    }
};

class Cargo {
public:
    Cargo(TrackingId tracking_id, RouteSpecification route_spec)
        : tracking_id_(std::move(tracking_id))
        , route_specification_(std::move(route_spec)) {}

    // 여정 할당
    void assignItinerary(Itinerary itinerary) {
        if (!route_specification_.isSatisfiedBy(itinerary)) {
            throw std::invalid_argument(
                "Itinerary does not satisfy route specification");
        }
        itinerary_ = std::move(itinerary);
    }

    bool isRouted() const {
        return itinerary_.has_value();
    }

private:
    TrackingId tracking_id_;
    RouteSpecification route_specification_;
    std::optional<Itinerary> itinerary_;
};
```

**Python - 도메인 지식이 코드에 녹아든 모델**
```python
@dataclass
class Itinerary:
    """여정 - 화물이 이동하는 경로"""
    legs: list[Leg]

    def __post_init__(self):
        if not self.legs:
            raise ValueError("Itinerary must have at least one leg")
        if not self._legs_are_connected():
            raise ValueError("Legs must be connected")

    @property
    def origin(self) -> Location:
        return self.legs[0].load_location

    @property
    def destination(self) -> Location:
        return self.legs[-1].unload_location

    def _legs_are_connected(self) -> bool:
        """도메인 규칙: 이전 레그의 도착지 = 다음 레그의 출발지"""
        for i in range(1, len(self.legs)):
            if self.legs[i-1].unload_location != self.legs[i].load_location:
                return False
        return True


@dataclass
class Cargo:
    """화물 - 핵심 엔티티"""
    tracking_id: TrackingId
    route_specification: RouteSpecification
    itinerary: Itinerary | None = None

    def assign_itinerary(self, itinerary: Itinerary) -> None:
        """여정 할당 - 경로 사양을 만족해야 함"""
        if not self.route_specification.is_satisfied_by(itinerary):
            raise ValueError("Itinerary does not satisfy route specification")
        self.itinerary = itinerary

    @property
    def is_routed(self) -> bool:
        return self.itinerary is not None
```

---

## 지식 탐구 기법

### 1. 시나리오 워크스루

도메인 전문가와 함께 실제 시나리오를 걸어본다.

```
시나리오: "서울에서 뉴욕으로 화물 보내기"

1. 고객이 화물 예약 요청
   → "어떤 정보가 필요하죠?"
   → "출발지, 목적지, 배송 기한이요"

2. 시스템이 경로 검색
   → "어떻게 경로를 찾나요?"
   → "가능한 항해 스케줄을 조합해서 찾아요"

3. 고객이 경로 선택
   → "여러 경로가 있으면요?"
   → "비용, 시간, 환적 횟수로 비교해요"

4. 화물 추적
   → "화물이 어디 있는지 어떻게 알죠?"
   → "각 항구에서 선적/하역 이벤트가 기록돼요"
```

### 2. 용어 사전 구축

대화에서 나온 용어를 정리한다.

| 용어 | 의미 | 코드 표현 |
|------|------|----------|
| Cargo | 운송할 화물 | `class Cargo` |
| Leg | 여정의 한 구간 | `class Leg` |
| Itinerary | 전체 여정 (레그들의 모음) | `class Itinerary` |
| Voyage | 선박의 정기 운항 스케줄 | `class Voyage` |
| Route Specification | 경로 요구사항 | `class RouteSpecification` |
| Tracking ID | 화물 추적 번호 | `class TrackingId` |

### 3. 모순 발견하기

**개발자:** "화물의 목적지는 어디에 저장하나요?"

**도메인 전문가 A:** "Cargo 객체에 있어요."

**도메인 전문가 B:** "아니요, Route Specification에 있어요."

→ **이런 모순이 깊은 이해로 가는 단서다!**

**해결:** Route Specification은 "원하는 것"이고, Itinerary는 "실제 경로"다.

```cpp
// 경로 사양 vs 실제 여정
class RouteSpecification {
public:
    Location origin;          // 원하는 출발지
    Location destination;     // 원하는 목적지
    Date arrival_deadline;    // 도착 기한

    bool isSatisfiedBy(const Itinerary& itinerary) const {
        return itinerary.origin() == origin
            && itinerary.destination() == destination
            && itinerary.finalArrivalDate() <= arrival_deadline;
    }
};
```

```python
@dataclass
class RouteSpecification:
    """경로 사양 - 고객이 원하는 조건"""
    origin: Location          # 원하는 출발지
    destination: Location     # 원하는 목적지
    arrival_deadline: date    # 도착 기한

    def is_satisfied_by(self, itinerary: Itinerary) -> bool:
        """여정이 사양을 만족하는지 검사"""
        return (
            itinerary.origin == self.origin
            and itinerary.destination == self.destination
            and itinerary.final_arrival_date <= self.arrival_deadline
        )
```

---

## 효과적인 지식 탐구

### DO ✓

```
✓ 도메인 전문가의 언어를 사용하라
✓ "왜?"라고 계속 질문하라
✓ 구체적인 예시를 요청하라
✓ 모델을 그림으로 그려 확인하라
✓ 모순을 두려워하지 마라 - 그게 단서다
✓ 코드로 빨리 표현해보라
```

### DON'T ✗

```
✗ 기술 용어로 도메인 전문가를 혼란스럽게 하지 마라
✗ 첫 모델에 집착하지 마라
✗ 모든 것을 한 번에 이해하려 하지 마라
✗ 도메인 전문가 없이 모델을 만들지 마라
✗ 데이터베이스 스키마부터 시작하지 마라
```

---

## 지식이 코드에 녹아들면

**Before: 지식이 분리됨**
```cpp
// 도메인 지식이 주석에만 있음
class Cargo {
    std::string from;  // 출발지
    std::string to;    // 목적지
    // TODO: 레그들이 연결되어야 함
};
```

**After: 지식이 코드에 녹아듦**
```cpp
// 도메인 지식이 코드 구조에 반영됨
class Cargo {
    RouteSpecification route_spec_;  // 원하는 경로
    Itinerary itinerary_;            // 실제 경로

    // 불변식이 코드로 보장됨
    void assignItinerary(Itinerary it) {
        if (!route_spec_.isSatisfiedBy(it)) {
            throw InvalidRouteException{};
        }
        itinerary_ = std::move(it);
    }
};
```

---

## 요약

지식 탐구(Knowledge Crunching)의 핵심:

1. **도메인 전문가와 협업**: 지식의 원천은 전문가
2. **반복적 모델링**: 첫 모델은 항상 틀림 → 계속 정제
3. **용어 통일**: 도메인 전문가의 언어 = 코드의 언어
4. **코드에 지식 녹이기**: 주석이 아니라 구조로 표현
5. **모순은 단서**: 깊은 이해의 기회

> "The heart of software is its ability to solve domain-related problems for its user."
> — Eric Evans

---

## 다음 장 예고

다음 장에서는 **유비쿼터스 언어(Ubiquitous Language)**를 다룬다. 도메인 전문가와 개발자가 같은 언어로 소통하는 방법을 배운다.
