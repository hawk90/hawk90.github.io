---
title: "Ch 8: Breakthrough"
date: 2025-10-03T01:00:00
description: "모델 통찰의 순간. 점진적 진화 → 갑작스러운 도약."
tags: [DDD, Breakthrough, Refactoring]
series: "Domain-Driven Design"
seriesOrder: 8
draft: true
---

## 점진적 정제 vs 도약

모델은 대부분 **점진적으로** 발전한다:

```
점진적 정제:
Day 1:  ████░░░░░░░░░░░░░░░░  20%
Day 10: ██████░░░░░░░░░░░░░░  30%
Day 20: ████████░░░░░░░░░░░░  40%
Day 30: ██████████░░░░░░░░░░  50%
        ...

그러다 어느 순간 도약(Breakthrough):
Day 31: ████████████████████  100%  💡
```

**Breakthrough**는 모델이 갑자기 명확해지는 순간이다.

---

## Breakthrough의 특징

```
Before:
┌─────────────────────────────────────────┐
│  복잡하고 어색한 모델                    │
│  • 예외 케이스가 많음                    │
│  • 도메인 전문가 설명과 불일치            │
│  • 코드가 점점 복잡해짐                   │
│  • "뭔가 이상한데..." 느낌               │
└─────────────────────────────────────────┘
            │
            ▼ 💡 Breakthrough
            │
After:
┌─────────────────────────────────────────┐
│  단순하고 명확한 모델                    │
│  • 예외가 자연스럽게 처리됨              │
│  • 도메인 전문가가 "맞아요!" 반응         │
│  • 코드가 오히려 줄어듦                   │
│  • "이게 맞다!" 확신                     │
└─────────────────────────────────────────┘
```

---

## 사례: 화물 운송 시스템

### Before — 어색한 모델

```python
# 초기 모델: Cargo가 모든 상태를 직접 관리
class Cargo:
    def __init__(self, tracking_id: TrackingId) -> None:
        self._tracking_id = tracking_id
        self._origin: Location | None = None
        self._destination: Location | None = None
        self._arrival_deadline: datetime | None = None
        self._current_status: str = "NOT_RECEIVED"
        self._current_location: Location | None = None
        self._is_on_track: bool = True
        self._eta: datetime | None = None
        # ... 더 많은 상태 필드들

    def handle_loading(self, voyage: Voyage, location: Location) -> None:
        self._current_status = "ONBOARD"
        self._current_location = location
        self._current_voyage = voyage
        self._update_eta()
        self._check_if_on_track()

    def handle_unloading(self, voyage: Voyage, location: Location) -> None:
        self._current_status = "IN_PORT"
        self._current_location = location
        self._current_voyage = None
        self._check_if_at_destination()
        self._update_eta()
        self._check_if_on_track()

    def change_destination(self, new_destination: Location) -> None:
        self._destination = new_destination
        self._check_if_on_track()
        self._update_eta()

    # ... 수많은 상태 관리 메서드들

    def _check_if_on_track(self) -> None:
        # 복잡한 조건문...
        if self._itinerary is None:
            self._is_on_track = False
        elif self._current_location not in self._expected_locations():
            self._is_on_track = False
        # ... 더 많은 조건들

    def _update_eta(self) -> None:
        # 복잡한 계산...
        pass
```

문제점:
- 상태 필드가 너무 많음
- 상태 간 일관성 유지가 어려움
- 메서드마다 여러 필드를 업데이트
- 버그 발생 시 추적 어려움

### 💡 Breakthrough 순간

도메인 전문가와 대화 중:

```
개발자:
"화물의 현재 상태를 추적하는 게 너무 복잡해요.
 선적, 하역, 위치, 예상 도착 시간... 전부 연결되어 있어서요."

도메인 전문가:
"아, 그건 '인도 상태(Delivery)'라고 불러요.
 인도 상태는 화물 자체가 아니라,
 '경로 명세'와 '여정'과 '처리 이력'으로부터 계산되는 거예요.
 화물이 상태를 '가지는' 게 아니라 '파생되는' 거죠."

개발자:
"아...! 그러면 Delivery를 별도 개념으로 분리하고,
 매번 계산하면 되겠네요?"

도메인 전문가:
"네, 맞아요. 처리 이벤트가 발생할 때마다
 현재 인도 상태를 새로 계산하면 돼요."
```

### After — 명확한 모델

```python
# Breakthrough 후: Delivery는 파생되는 값
@dataclass(frozen=True)
class Delivery:
    """인도 상태 — RouteSpec, Itinerary, History로부터 파생"""
    transport_status: TransportStatus
    routing_status: RoutingStatus
    current_voyage: VoyageNumber | None
    last_known_location: Location | None
    eta: datetime | None
    is_unloaded_at_destination: bool
    is_misdirected: bool

    @classmethod
    def derived_from(
        cls,
        route_spec: RouteSpecification,
        itinerary: Itinerary | None,
        history: HandlingHistory
    ) -> "Delivery":
        """세 가지 입력으로부터 인도 상태 계산"""
        # 모든 상태가 이 메서드에서 일관되게 계산됨
        ...


class Cargo:
    """화물 — 단순해진 모델"""

    def __init__(
        self,
        tracking_id: TrackingId,
        route_specification: RouteSpecification
    ) -> None:
        self._tracking_id = tracking_id
        self._route_specification = route_specification
        self._itinerary: Itinerary | None = None
        # Delivery는 저장하지 않고 필요할 때 계산
        # (또는 성능상 캐시)

    def derive_delivery_progress(self, history: HandlingHistory) -> Delivery:
        """현재 인도 상태를 계산한다"""
        return Delivery.derived_from(
            self._route_specification,
            self._itinerary,
            history
        )
```

변화:
- **상태 필드 대폭 감소** — Cargo는 본질적 데이터만 보유
- **일관성 자동 보장** — Delivery는 매번 계산
- **단일 진실 소스** — `derived_from` 하나가 모든 상태 결정
- **코드가 도메인 언어와 일치** — "인도 상태는 파생된다"

---

## Breakthrough를 위한 조건

### 1. 깊은 도메인 학습

```
표면적 이해:
"화물은 상태를 가진다"
"선적하면 상태가 바뀐다"

깊은 이해:
"인도 상태는 여러 요소의 함수다"
"상태는 저장되는 게 아니라 계산되는 것이다"
"처리 이벤트는 불변이고, 상태는 파생된다"
```

### 2. 모델링 자유

```
제약이 많으면:
"DB 스키마가 이미 정해졌으니 맞춰야 해요"
"기존 API가 있으니 호환해야 해요"
"일정이 촉박하니 리팩토링은 나중에요"
→ Breakthrough 불가능

자유가 있으면:
"모델이 이상하면 바꿀 수 있어요"
"DB는 모델에 맞출 거예요"
"더 나은 방법을 찾으면 적용해요"
→ Breakthrough 가능
```

### 3. 지속적인 대화

```
단발성 인터뷰:
"요구사항 정리 → 개발 → 끝"

지속적 대화:
"모델 만들기 → 전문가 검토 → 수정 →
 검토 → 수정 → ... → 💡 Breakthrough"
```

---

## Breakthrough의 징후

### 사전 징후

```
도약 직전의 신호:
• "이 코드 왜 이렇게 복잡하지?"
• "도메인 전문가 말이랑 코드가 안 맞아"
• "예외 처리가 너무 많아"
• "뭔가 근본적으로 잘못된 것 같아"
• 같은 개념이 여러 곳에 흩어져 있음
```

### Breakthrough 순간

```
도약의 순간:
• "아, 이게 별개 개념이었구나!"
• "이건 상태가 아니라 계산이었어!"
• "이 둘이 사실은 같은 거였네!"
• 도메인 전문가가 "맞아요, 그게 맞아요!"
```

### 사후 징후

```
도약 후의 변화:
• 코드가 줄어듦
• 예외 케이스가 사라짐
• 새 기능 추가가 쉬워짐
• 테스트가 간단해짐
• 팀원들이 모델을 쉽게 이해
```

---

## 또 다른 예시: Specification 패턴

### Before — 조건 검증 산재

```python
class Cargo:
    def can_accept_itinerary(self, itinerary: Itinerary) -> bool:
        # 조건 검증이 여기저기 흩어져 있음
        if itinerary.origin != self._origin:
            return False
        if itinerary.destination != self._destination:
            return False
        if itinerary.arrival_date > self._deadline:
            return False
        return True

class BookingService:
    def find_valid_routes(self, cargo: Cargo) -> list[Itinerary]:
        routes = self._routing_service.find_all_routes(
            cargo.origin, cargo.destination
        )
        # 또 같은 조건 검증
        return [r for r in routes
                if r.arrival_date <= cargo.deadline]
```

### 💡 Breakthrough

```
"잠깐, '경로 요구사항'이라는 개념이 있는 거 아냐?
 출발지, 도착지, 기한... 이게 하나의 '명세'잖아!"
```

### After — Specification 추출

```python
@dataclass(frozen=True)
class RouteSpecification:
    """경로 명세 — 하나의 응집된 개념"""
    origin: Location
    destination: Location
    arrival_deadline: datetime

    def is_satisfied_by(self, itinerary: Itinerary) -> bool:
        """여정이 이 명세를 만족하는가?"""
        return (
            itinerary.origin == self.origin
            and itinerary.destination == self.destination
            and itinerary.arrival_date <= self.arrival_deadline
        )


class Cargo:
    def __init__(
        self,
        tracking_id: TrackingId,
        route_specification: RouteSpecification  # 명세 객체로 캡슐화
    ) -> None:
        self._tracking_id = tracking_id
        self._route_specification = route_specification

    @property
    def route_specification(self) -> RouteSpecification:
        return self._route_specification


class BookingService:
    def find_valid_routes(self, cargo: Cargo) -> list[Itinerary]:
        routes = self._routing_service.find_all_routes(
            cargo.route_specification.origin,
            cargo.route_specification.destination
        )
        # 명세 객체 사용
        return [r for r in routes
                if cargo.route_specification.is_satisfied_by(r)]
```

---

## Breakthrough를 촉진하는 방법

### 1. 화이트보드 세션

```
• 도메인 전문가와 함께 다이어그램 그리기
• "이 개념을 설명해 주세요"
• "이 두 개는 어떻게 다른가요?"
• "이게 항상 이런 건가요, 예외가 있나요?"
```

### 2. 모델 실험

```
• 여러 모델 후보를 스케치
• "만약 이렇게 하면?"
• 코드 없이 개념만 탐구
• 도메인 전문가의 반응 관찰
```

### 3. 리팩토링 용기

```
• "이게 이상해요"라고 말하기
• 기존 코드에 집착하지 않기
• 더 나은 모델이 보이면 과감히 변경
• 테스트가 있으면 리팩토링이 안전
```

---

## 요약

**Breakthrough**는 모델이 갑자기 명확해지는 순간이다.

특징:
- 점진적 정제 후 **갑작스러운 도약**
- 복잡한 모델이 **단순해짐**
- 예외 케이스가 **자연스럽게 처리**
- 도메인 전문가가 **"맞아요!"** 반응

조건:
- 깊은 **도메인 학습**
- 모델링 **자유**
- 지속적인 **대화**

징후:
- Before: "뭔가 이상해..."
- After: "이게 맞다!"

다음 장에서는 숨겨진 개념을 **명시적으로 드러내는** 방법을 다룬다.
