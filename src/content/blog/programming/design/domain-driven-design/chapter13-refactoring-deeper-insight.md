---
title: "Ch 13: Refactoring Toward Deeper Insight"
date: 2025-10-04T03:00:00
description: "발견 → 리팩토링 → 깊이. 지속적 정제 사이클."
tags: [DDD, Refactoring, Continuous]
series: "Domain-Driven Design"
seriesOrder: 13
draft: true
---

## 두 종류의 리팩토링

**Martin Fowler의 리팩토링**은 코드 품질 개선이다.
**도메인 통찰 리팩토링**은 모델 자체의 개선이다.

```
코드 리팩토링 (Fowler):
• Extract Method, Rename Variable, etc.
• 외부 동작 유지
• 코드 구조 개선

도메인 통찰 리팩토링 (DDD):
• 도메인 개념 발견
• 모델 구조 변경
• Ubiquitous Language 진화
• 더 깊은 이해
```

---

## 리팩토링의 시작점

### 불편함의 신호

```
모델이 불편할 때:

• "이 코드 왜 이렇게 복잡하지?"
• "도메인 전문가가 쓰는 용어가 코드에 없네"
• "예외 케이스가 너무 많아"
• "이 조건문 뭐지? 주석 없이 이해 못하겠어"
• "같은 개념이 여러 곳에 흩어져 있어"
• "새 기능 추가가 왜 이렇게 어렵지?"
```

### 구체적 사례: 운임 계산

```python
# Before — 불편함의 징후

class BookingService:
    def calculate_freight(
        self,
        cargo: Cargo,
        voyage: Voyage
    ) -> Money:
        base = self._base_rate(cargo, voyage)

        # 조건이 복잡하고 계속 늘어남
        if cargo.is_hazardous:
            base = base.multiply(Decimal("1.5"))
        if cargo.requires_refrigeration:
            base = base.multiply(Decimal("1.3"))
        if voyage.is_express:
            base = base.multiply(Decimal("1.2"))

        # 이건 뭐지? 주석이 필요함
        if voyage.load_factor > Decimal("0.9"):
            # "피크 시즌 할증"... 이런 개념이 있구나
            base = base.multiply(Decimal("1.1"))

        # 또 뭔가 추가됨
        if cargo.customer.loyalty_tier == "GOLD":
            base = base.multiply(Decimal("0.95"))
        elif cargo.customer.loyalty_tier == "PLATINUM":
            base = base.multiply(Decimal("0.90"))

        return base
```

불편함:
- "피크 시즌 할증"이라는 개념이 암묵적
- "로열티 할인"이라는 개념이 암묵적
- 조건이 계속 늘어남
- 테스트가 어려움

---

## 가설 → 실험 → 검증

### 1단계: 가설 세우기

도메인 전문가와 대화:

```
개발자: "운임 계산이 복잡해요.
        여러 조건이 어떻게 연결되나요?"

전문가: "운임은 '기본 운임'에 여러 '조정 요소'가 적용돼요.
        조정 요소에는 '할증'과 '할인'이 있고요."

개발자: "조정 요소... 각각 별도 개념인 거죠?"

전문가: "네. 위험물 할증, 냉동 할증, 피크 시즌 할증,
        그리고 고객 등급별 할인이 있어요."

개발자: "그러면 '운임 조정(Freight Adjustment)'이라는
        개념으로 묶을 수 있겠네요?"

전문가: "네, 좋은 표현이에요!"
```

**가설**: "운임 조정"이라는 명시적 개념이 필요하다.

### 2단계: 실험

```python
# 가설을 코드로 실험

from abc import ABC, abstractmethod
from enum import Enum, auto


class AdjustmentType(Enum):
    """조정 유형"""
    SURCHARGE = auto()  # 할증
    DISCOUNT = auto()   # 할인


class FreightAdjustment(ABC):
    """운임 조정 — 새로운 명시적 개념"""

    @property
    @abstractmethod
    def name(self) -> str:
        """조정 이름"""
        pass

    @property
    @abstractmethod
    def adjustment_type(self) -> AdjustmentType:
        """할증 or 할인"""
        pass

    @abstractmethod
    def applies_to(self, context: "FreightContext") -> bool:
        """이 조정이 적용되는가?"""
        pass

    @abstractmethod
    def calculate(self, base: Money, context: "FreightContext") -> Money:
        """조정된 금액 계산"""
        pass


@dataclass
class FreightContext:
    """운임 계산 컨텍스트 — 필요한 정보 모음"""
    cargo: Cargo
    voyage: Voyage
    customer: Customer


class HazardousMaterialSurcharge(FreightAdjustment):
    """위험물 할증"""

    @property
    def name(self) -> str:
        return "Hazardous Material Surcharge"

    @property
    def adjustment_type(self) -> AdjustmentType:
        return AdjustmentType.SURCHARGE

    def applies_to(self, context: FreightContext) -> bool:
        return context.cargo.is_hazardous

    def calculate(self, base: Money, context: FreightContext) -> Money:
        return base.multiply(Decimal("0.5"))  # 50% 할증


class PeakSeasonSurcharge(FreightAdjustment):
    """피크 시즌 할증"""

    def __init__(self, threshold: Decimal = Decimal("0.9")) -> None:
        self._threshold = threshold

    @property
    def name(self) -> str:
        return "Peak Season Surcharge"

    @property
    def adjustment_type(self) -> AdjustmentType:
        return AdjustmentType.SURCHARGE

    def applies_to(self, context: FreightContext) -> bool:
        return context.voyage.load_factor > self._threshold

    def calculate(self, base: Money, context: FreightContext) -> Money:
        return base.multiply(Decimal("0.1"))  # 10% 할증


class LoyaltyDiscount(FreightAdjustment):
    """고객 등급 할인"""

    DISCOUNT_RATES = {
        "GOLD": Decimal("0.05"),
        "PLATINUM": Decimal("0.10"),
    }

    @property
    def name(self) -> str:
        return "Loyalty Discount"

    @property
    def adjustment_type(self) -> AdjustmentType:
        return AdjustmentType.DISCOUNT

    def applies_to(self, context: FreightContext) -> bool:
        return context.customer.loyalty_tier in self.DISCOUNT_RATES

    def calculate(self, base: Money, context: FreightContext) -> Money:
        rate = self.DISCOUNT_RATES.get(context.customer.loyalty_tier, Decimal("0"))
        return base.multiply(rate)
```

### 3단계: 검증

```python
class FreightCalculationService:
    """운임 계산 서비스 — 리팩토링 후"""

    def __init__(self, adjustments: list[FreightAdjustment]) -> None:
        self._adjustments = adjustments

    def calculate(
        self,
        cargo: Cargo,
        voyage: Voyage,
        customer: Customer
    ) -> FreightQuote:
        context = FreightContext(cargo, voyage, customer)
        base = self._calculate_base(cargo, voyage)

        # 적용된 조정 목록
        applied: list[AppliedAdjustment] = []

        total_adjustment = Money(Decimal("0"), base.currency)

        for adjustment in self._adjustments:
            if adjustment.applies_to(context):
                amount = adjustment.calculate(base, context)
                applied.append(AppliedAdjustment(
                    name=adjustment.name,
                    type=adjustment.adjustment_type,
                    amount=amount
                ))
                if adjustment.adjustment_type == AdjustmentType.SURCHARGE:
                    total_adjustment = total_adjustment.add(amount)
                else:
                    total_adjustment = total_adjustment.subtract(amount)

        final = base.add(total_adjustment)

        return FreightQuote(
            base_amount=base,
            adjustments=applied,
            final_amount=final
        )


@dataclass(frozen=True)
class AppliedAdjustment:
    """적용된 조정"""
    name: str
    type: AdjustmentType
    amount: Money


@dataclass(frozen=True)
class FreightQuote:
    """운임 견적"""
    base_amount: Money
    adjustments: list[AppliedAdjustment]
    final_amount: Money

    def describe(self) -> str:
        """견적 내역 설명"""
        lines = [f"Base: {self.base_amount}"]
        for adj in self.adjustments:
            sign = "+" if adj.type == AdjustmentType.SURCHARGE else "-"
            lines.append(f"  {sign} {adj.name}: {adj.amount}")
        lines.append(f"Total: {self.final_amount}")
        return "\n".join(lines)
```

**검증 질문**:
- 도메인 전문가가 이해하는가? ✓
- 새 조정 추가가 쉬운가? ✓
- 테스트가 쉬워졌는가? ✓
- Ubiquitous Language가 풍부해졌는가? ✓

---

## 모델 안에서 vs 모델 자체를

```
┌────────────────────────────────────────────────────────────┐
│              리팩토링의 두 수준                              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. 모델 안에서 리팩토링                                    │
│     → 기존 개념 유지                                        │
│     → 코드 구조 개선                                        │
│     → Extract Method, Rename, etc.                         │
│                                                            │
│  2. 모델 자체를 리팩토링                                    │
│     → 새로운 개념 도입                                      │
│     → 기존 개념 폐기                                        │
│     → Ubiquitous Language 변경                             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 예시: 화물 상태

```python
# Level 1: 모델 안에서 리팩토링 — 코드 정리
class Cargo:
    def is_misdirected(self) -> bool:
        # Before: 긴 조건문
        # if self._itinerary is None:
        #     return False
        # if self._transport_status == "NOT_RECEIVED":
        #     return False
        # ...

        # After: 메서드 추출
        if self._not_yet_routed():
            return False
        if self._not_yet_received():
            return False
        return self._not_on_expected_route()

    def _not_yet_routed(self) -> bool:
        return self._itinerary is None

    def _not_yet_received(self) -> bool:
        return self._transport_status == "NOT_RECEIVED"

    def _not_on_expected_route(self) -> bool:
        return self._current_location not in self._itinerary.locations


# Level 2: 모델 자체를 리팩토링 — 새 개념 도입
# "Delivery"라는 개념을 분리

@dataclass(frozen=True)
class Delivery:
    """인도 상태 — 새로운 개념"""
    transport_status: TransportStatus
    routing_status: RoutingStatus
    is_misdirected: bool
    current_voyage: VoyageNumber | None
    last_known_location: Location | None
    eta: datetime | None

    @classmethod
    def derived_from(
        cls,
        spec: RouteSpecification,
        itinerary: Itinerary | None,
        history: HandlingHistory
    ) -> "Delivery":
        """세 요소로부터 인도 상태 계산"""
        # ...


class Cargo:
    """화물 — 단순화됨"""

    def derive_delivery(self, history: HandlingHistory) -> Delivery:
        return Delivery.derived_from(
            self._route_specification,
            self._itinerary,
            history
        )
```

---

## 자주 시도, 자주 폐기

### 실험 문화

```
좋은 접근:
1. 작은 실험을 자주 한다
2. 빠르게 피드백을 받는다
3. 안 되면 빠르게 폐기한다
4. 되면 점진적으로 확장한다

나쁜 접근:
1. 큰 설계를 미리 한다
2. 오래 구현한다
3. 문제가 발견되면 이미 늦었다
4. 매몰 비용 때문에 폐기 못함
```

### 실험 프로세스

```
┌─────────────────────────────────────────────────────────┐
│                  실험 사이클                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   불편함 발견                                             │
│        │                                                 │
│        ▼                                                 │
│   도메인 전문가와 대화                                    │
│        │                                                 │
│        ▼                                                 │
│   가설 수립                                               │
│   "이런 개념이 있는 게 아닐까?"                           │
│        │                                                 │
│        ▼                                                 │
│   작은 실험                                               │
│   (브랜치에서 프로토타입)                                 │
│        │                                                 │
│        ▼                                                 │
│   검증                                                    │
│   • 도메인 전문가 피드백                                  │
│   • 코드가 더 나아졌나?                                   │
│   • Ubiquitous Language가 풍부해졌나?                    │
│        │                                                 │
│        ├─────────────┐                                   │
│        ▼             ▼                                   │
│   성공: 적용      실패: 폐기                              │
│   (merge)        (delete branch)                         │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 폐기 예시

```python
# 실험: "운송 수단(TransportMeans)" 개념 도입 시도

class TransportMeans(ABC):
    """운송 수단 — 배, 트럭, 기차 등"""

    @abstractmethod
    def capacity(self) -> Quantity:
        pass

    @abstractmethod
    def speed(self) -> Quantity:
        pass


class Ship(TransportMeans):
    pass


class Truck(TransportMeans):
    pass


# ... 구현 중 발견

# 도메인 전문가: "우리 시스템에서 운송 수단은 중요하지 않아요.
#              Voyage가 어떤 배인지는 관심 없고,
#              출발지-도착지-시간만 중요해요."

# 결론: 폐기!
# 이 개념은 우리 도메인에 맞지 않음
```

---

## 점진적 도약의 누적

```
작은 발견들이 누적되어 Breakthrough가 됨:

Week 1:  "Delivery는 파생값이다"
Week 3:  "RouteSpecification이 별도 개념이다"
Week 5:  "FreightAdjustment 패턴이 필요하다"
Week 8:  💡 "모든 게 연결되네! 전체 구조가 보인다!"
```

### 발견 기록하기

```python
# 프로젝트 위키나 ADR(Architecture Decision Records)에 기록

"""
# Model Insight: Delivery as Derived Value

## 날짜: 2024-01-15

## 발견
Delivery 상태는 Cargo의 속성이 아니라,
RouteSpecification + Itinerary + HandlingHistory로부터
"파생되는" 값이다.

## 이전 모델
- Cargo가 여러 상태 필드를 직접 관리
- 상태 간 일관성 유지 어려움
- "인도 상태"라는 개념이 암묵적

## 새 모델
- Delivery가 별도 Value Object
- derived_from() 메서드로 항상 계산
- 일관성 자동 보장

## 영향
- Cargo 클래스 단순화
- 테스트 용이성 향상
- 도메인 전문가가 "맞아요!" 반응

## 관련
- Ch 8: Breakthrough 패턴
"""
```

---

## 리팩토링 안전망

### 테스트의 역할

```python
# 도메인 모델 리팩토링 시 테스트가 핵심

class TestDeliveryDerivation:
    """Delivery 파생 로직 테스트"""

    def test_not_routed_cargo_has_not_routed_status(self) -> None:
        # Given: 여정이 없는 화물
        cargo = Cargo(
            TrackingId.generate(),
            RouteSpecification(...)
        )

        # When: 인도 상태 계산
        delivery = cargo.derive_delivery(HandlingHistory.empty())

        # Then: 라우팅 안 됨 상태
        assert delivery.routing_status == RoutingStatus.NOT_ROUTED

    def test_misdirected_when_not_on_route(self) -> None:
        # Given: 경로 밖 위치에 있는 화물
        cargo = create_cargo_with_itinerary(...)
        history = create_history_with_wrong_location(...)

        # When
        delivery = cargo.derive_delivery(history)

        # Then
        assert delivery.is_misdirected is True

    def test_on_track_when_following_itinerary(self) -> None:
        # Given: 정상 경로의 화물
        cargo = create_cargo_with_itinerary(...)
        history = create_normal_history(...)

        # When
        delivery = cargo.derive_delivery(history)

        # Then
        assert delivery.is_misdirected is False
```

### 점진적 적용

```
1. 새 구조를 기존과 병행
2. 테스트로 동등성 검증
3. 클라이언트를 점진적 전환
4. 기존 구조 제거
```

```python
# 병행 운영 예시

class Cargo:
    # 기존 (deprecated)
    @property
    def is_misdirected(self) -> bool:
        """Deprecated: use derive_delivery().is_misdirected"""
        return self._is_misdirected

    # 새 방식
    def derive_delivery(self, history: HandlingHistory) -> Delivery:
        delivery = Delivery.derived_from(
            self._route_specification,
            self._itinerary,
            history
        )
        # 검증: 새/기존 결과 일치 확인
        assert delivery.is_misdirected == self._is_misdirected
        return delivery
```

---

## 요약

**Refactoring Toward Deeper Insight**은 모델을 점진적으로 개선하는 과정이다.

두 종류의 리팩토링:
- **코드 리팩토링** — 구조 개선
- **모델 리팩토링** — 개념 발견

프로세스:
1. **불편함** 인식
2. **대화**로 개념 발굴
3. **가설** 수립
4. **실험** (작은 프로토타입)
5. **검증** (도메인 전문가 피드백)
6. **적용** or **폐기**

원칙:
- **자주 시도**, 자주 폐기
- **작은 도약**의 누적
- **테스트**로 안전망 확보
- **기록**으로 지식 공유

결과:
- 더 **깊은 도메인 이해**
- 더 **풍부한 Ubiquitous Language**
- 더 **유연한 모델**

다음 장에서는 **Maintaining Model Integrity** — 여러 팀에서 모델 일관성 유지를 다룬다.
