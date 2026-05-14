---
title: "Ch 14: Maintaining Model Integrity"
date: 2025-10-01T14:00:00
description: "Bounded Context. Context Map. Shared Kernel / ACL / Conformist / Partnership."
tags: [DDD, Bounded Context, Context Map]
series: "Domain-Driven Design"
seriesOrder: 14
draft: true
---

## 단일 모델의 한계

시스템이 커지면 하나의 통합 모델을 유지하기 어려워진다.

```
작은 시스템:
┌─────────────────────────────────┐
│         단일 도메인 모델          │
│  Cargo, Voyage, Customer, ...   │
│         모든 팀이 공유           │
└─────────────────────────────────┘

큰 시스템:
┌─────────┐ ┌─────────┐ ┌─────────┐
│ 예약팀   │ │ 운송팀   │ │ 정산팀   │
│ Cargo?  │ │ Cargo?  │ │ Cargo?  │
│ 의미 A  │ │ 의미 B  │ │ 의미 C  │
└─────────┘ └─────────┘ └─────────┘
     ↑           ↑           ↑
   같은 이름, 다른 의미 = 혼란
```

**문제**: "Cargo"가 팀마다 다른 의미를 가진다.

- **예약팀**: Cargo = 고객 요청, 예상 일정
- **운송팀**: Cargo = 실제 물리적 화물, 현재 위치
- **정산팀**: Cargo = 청구 항목, 비용 계산 단위

하나의 Cargo 클래스에 모든 의미를 담으면 괴물이 된다.

---

## Bounded Context

**Bounded Context**는 특정 모델이 적용되는 경계를 명시적으로 정의한다.

```
┌─────────────────────────────────────────────────────┐
│              화물 해운 시스템                         │
│                                                     │
│  ┌───────────────┐  ┌───────────────┐              │
│  │ Booking       │  │ Shipping      │              │
│  │ Context       │  │ Context       │              │
│  │               │  │               │              │
│  │ • Cargo       │  │ • Cargo       │              │
│  │   (예약 정보) │  │   (물리 화물) │              │
│  │ • Itinerary   │  │ • Location    │              │
│  │   (계획 경로) │  │   (현재 위치) │              │
│  │ • Customer    │  │ • HandlingEvent│             │
│  │               │  │               │              │
│  └───────────────┘  └───────────────┘              │
│                                                     │
│  ┌───────────────┐  ┌───────────────┐              │
│  │ Billing       │  │ Reporting     │              │
│  │ Context       │  │ Context       │              │
│  │               │  │               │              │
│  │ • Invoice     │  │ • CargoSummary│              │
│  │ • Charge      │  │ • VoyageStats │              │
│  │ • Payment     │  │               │              │
│  └───────────────┘  └───────────────┘              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

각 Context 내에서는 **통일된 언어**가 사용된다.

### Context 경계의 기준

```
경계를 나누는 기준:

1. 팀 구조
   - 각 팀이 독립적으로 개발
   - 팀 간 커뮤니케이션 비용

2. 도메인 전문가 분리
   - 예약 전문가 ≠ 운송 전문가
   - 각자의 언어와 관심사

3. 기술적 경계
   - 레거시 시스템
   - 외부 서비스 연동

4. 변경 주기
   - 예약 규칙: 자주 변경
   - 운송 물리 법칙: 거의 불변
```

---

## Context Map

**Context Map**은 여러 Bounded Context 간의 관계를 시각화한다.

```
                    ┌─────────────────┐
                    │   Booking       │
                    │   Context       │
                    │   (Upstream)    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │  Shipping   │  │  Billing    │  │  Reporting  │
    │  Context    │  │  Context    │  │  Context    │
    │ (Downstream)│  │ (Downstream)│  │ (Downstream)│
    └─────────────┘  └─────────────┘  └─────────────┘
          │
          │ ACL
          ▼
    ┌─────────────┐
    │  Legacy     │
    │  Tracking   │
    │  System     │
    └─────────────┘

관계 유형:
━━━ : Shared Kernel
──▶ : Customer-Supplier
═══ : Partnership
~── : Conformist
ACL : Anticorruption Layer
```

Context Map은 **정치적 현실**을 반영한다.

---

## 통합 패턴

### 1. Shared Kernel

두 팀이 도메인 모델의 일부를 공유한다.

```
┌─────────────────┐     ┌─────────────────┐
│    Booking      │     │    Shipping     │
│    Context      │     │    Context      │
│                 │     │                 │
│  ┌───────────┐  │     │  ┌───────────┐  │
│  │ Booking   │  │     │  │ Shipping  │  │
│  │ specific  │  │     │  │ specific  │  │
│  └───────────┘  │     │  └───────────┘  │
│        │        │     │        │        │
│        ▼        │     │        ▼        │
│  ┌─────────────────────────────────┐   │
│  │         Shared Kernel           │   │
│  │  • TrackingId (Value Object)    │   │
│  │  • Location (Value Object)      │   │
│  │  • CargoSize (Value Object)     │   │
│  └─────────────────────────────────┘   │
│                 │     │                 │
└─────────────────┘     └─────────────────┘
```

**Python - Shared Kernel**:

```python
# shared_kernel/cargo_id.py
# 이 모듈은 Booking과 Shipping 모두에서 사용

from dataclasses import dataclass
import re


@dataclass(frozen=True)
class TrackingId:
    """화물 추적 ID - Shared Kernel의 핵심 Value Object"""

    value: str

    def __post_init__(self):
        if not self._is_valid_format(self.value):
            raise ValueError(f"Invalid tracking ID format: {self.value}")

    @staticmethod
    def _is_valid_format(value: str) -> bool:
        # ABC-123456 형식
        return bool(re.match(r'^[A-Z]{3}-\d{6}$', value))

    def __str__(self) -> str:
        return self.value


@dataclass(frozen=True)
class Location:
    """위치 - 양쪽 Context에서 동일한 의미"""

    un_locode: str  # UN/LOCODE 표준
    name: str

    def __post_init__(self):
        if len(self.un_locode) != 5:
            raise ValueError("UN/LOCODE must be 5 characters")


@dataclass(frozen=True)
class CargoSize:
    """화물 크기 - 물리적 속성"""

    weight_kg: float
    volume_cbm: float  # cubic meters

    def __post_init__(self):
        if self.weight_kg <= 0 or self.volume_cbm <= 0:
            raise ValueError("Size must be positive")
```

**C++ - Shared Kernel**:

```cpp
// shared_kernel/tracking_id.hpp
#pragma once
#include <string>
#include <regex>
#include <stdexcept>

namespace shared_kernel {

class TrackingId {
public:
    explicit TrackingId(std::string value) : value_(std::move(value)) {
        if (!is_valid_format(value_)) {
            throw std::invalid_argument("Invalid tracking ID format");
        }
    }

    const std::string& value() const { return value_; }

    bool operator==(const TrackingId& other) const {
        return value_ == other.value_;
    }

private:
    std::string value_;

    static bool is_valid_format(const std::string& v) {
        static const std::regex pattern(R"([A-Z]{3}-\d{6})");
        return std::regex_match(v, pattern);
    }
};

class Location {
public:
    Location(std::string un_locode, std::string name)
        : un_locode_(std::move(un_locode))
        , name_(std::move(name)) {
        if (un_locode_.length() != 5) {
            throw std::invalid_argument("UN/LOCODE must be 5 characters");
        }
    }

    const std::string& un_locode() const { return un_locode_; }
    const std::string& name() const { return name_; }

    bool operator==(const Location& other) const {
        return un_locode_ == other.un_locode_;
    }

private:
    std::string un_locode_;
    std::string name_;
};

}  // namespace shared_kernel
```

**Shared Kernel 규칙**:

- 양 팀의 **합의** 없이 변경 불가
- **자동화된 테스트**로 호환성 검증
- 가능한 **작게** 유지

---

### 2. Customer-Supplier

Upstream(공급자)이 Downstream(소비자)의 요구를 수용한다.

```
┌─────────────────────────────────────────┐
│              Booking Context            │
│              (Upstream = Supplier)      │
│                                         │
│  "운송팀이 필요한 이벤트를 발행해줄게"    │
│                                         │
│  CargoBooked 이벤트 발행 ────────────┐  │
│  ItineraryChanged 이벤트 발행 ───────┼──│──┐
│                                      │  │  │
└──────────────────────────────────────┼──┘  │
                                       │     │
                                       ▼     ▼
┌─────────────────────────────────────────────┐
│              Shipping Context               │
│              (Downstream = Customer)        │
│                                             │
│  "예약 정보가 필요해요, 이런 형식으로요"      │
│                                             │
│  CargoBooked 수신 → Cargo 생성              │
│  ItineraryChanged 수신 → 경로 업데이트       │
│                                             │
└─────────────────────────────────────────────┘
```

**Python - Customer-Supplier Events**:

```python
# booking_context/events.py (Upstream)
from dataclasses import dataclass
from datetime import datetime
from shared_kernel.cargo_id import TrackingId, Location


@dataclass(frozen=True)
class CargoBooked:
    """예약 완료 이벤트 - Downstream이 요청한 형식"""

    tracking_id: TrackingId
    origin: Location
    destination: Location
    deadline: datetime
    customer_id: str
    booked_at: datetime


@dataclass(frozen=True)
class ItineraryAssigned:
    """경로 확정 이벤트"""

    tracking_id: TrackingId
    legs: list  # List of ItineraryLeg
    assigned_at: datetime


# shipping_context/event_handlers.py (Downstream)
class CargoBookedHandler:
    """Booking Context의 이벤트를 처리"""

    def __init__(self, cargo_repository):
        self._cargo_repository = cargo_repository

    def handle(self, event: CargoBooked) -> None:
        # Booking Context의 이벤트로 Shipping의 Cargo 생성
        cargo = ShippingCargo(
            tracking_id=event.tracking_id,
            origin=event.origin,
            destination=event.destination,
            delivery_deadline=event.deadline
        )
        self._cargo_repository.save(cargo)


# shipping_context/cargo.py
class ShippingCargo:
    """Shipping Context의 Cargo - 물리적 화물 추적에 집중"""

    def __init__(
        self,
        tracking_id: TrackingId,
        origin: Location,
        destination: Location,
        delivery_deadline: datetime
    ):
        self._tracking_id = tracking_id
        self._origin = origin
        self._destination = destination
        self._delivery_deadline = delivery_deadline
        self._current_location: Location | None = None
        self._handling_history: list = []

    def record_handling(self, event_type: str, location: Location) -> None:
        """물류 이벤트 기록 - Shipping의 핵심 관심사"""
        self._handling_history.append({
            "type": event_type,
            "location": location,
            "timestamp": datetime.now()
        })
        self._current_location = location

    @property
    def current_location(self) -> Location | None:
        return self._current_location

    @property
    def is_on_schedule(self) -> bool:
        # 배송 일정 준수 여부 - Shipping의 관심사
        if not self._current_location:
            return True
        # 복잡한 일정 계산 로직...
        return True
```

**협력 계약**:

```python
# 팀 간 합의된 계약
class BookingShippingContract:
    """
    Booking(Upstream) ↔ Shipping(Downstream) 계약

    Booking이 제공하는 것:
    - CargoBooked 이벤트 (예약 시)
    - ItineraryAssigned 이벤트 (경로 확정 시)
    - ItineraryChanged 이벤트 (경로 변경 시)

    Shipping이 요청한 필드:
    - tracking_id: 고유 식별자 (필수)
    - origin, destination: Location (필수)
    - deadline: 배송 기한 (필수)
    - customer_id: 고객 식별 (선택)

    변경 정책:
    - Breaking change는 Shipping과 협의 필수
    - 최소 2주 전 통보
    - 이전 버전 1개월 병행 지원
    """
    pass
```

---

### 3. Conformist

Downstream이 Upstream 모델을 그대로 따른다. 협상력이 없을 때.

```
┌─────────────────────────────────────────┐
│          External Shipping API          │
│          (우리가 통제 불가)              │
│                                         │
│  {                                      │
│    "shipment_ref": "ABC123",            │
│    "status_code": "IN_TRANSIT",         │
│    "loc": {"port": "KRPUS", ...}        │
│  }                                      │
│                                         │
└────────────────────┬────────────────────┘
                     │
                     │ "그냥 따를 수밖에..."
                     ▼
┌─────────────────────────────────────────┐
│           Our Tracking Context          │
│           (Conformist)                  │
│                                         │
│  class ShipmentRef:  # 그들의 용어      │
│      ...                                │
│  class StatusCode:   # 그들의 상태 코드 │
│      IN_TRANSIT = "IN_TRANSIT"          │
│      ...                                │
│                                         │
└─────────────────────────────────────────┘
```

**Python - Conformist**:

```python
# tracking_context/external_types.py
# 외부 API의 타입을 그대로 사용 (Conformist)

from dataclasses import dataclass
from enum import Enum


class ExternalStatusCode(Enum):
    """외부 시스템의 상태 코드 - 그대로 사용"""
    BOOKED = "BOOKED"
    IN_TRANSIT = "IN_TRANSIT"
    AT_PORT = "AT_PORT"
    CUSTOMS = "CUSTOMS"
    DELIVERED = "DELIVERED"
    EXCEPTION = "EXCEPTION"


@dataclass
class ExternalLocation:
    """외부 시스템의 위치 형식 - 그대로 사용"""
    port: str
    country: str
    terminal: str | None = None


@dataclass
class ExternalShipment:
    """외부 시스템의 화물 구조 - 그대로 사용"""
    shipment_ref: str  # 우리의 tracking_id와 다른 명명
    status_code: ExternalStatusCode
    loc: ExternalLocation
    eta: str | None = None  # ISO 8601 문자열


class ConformistTrackingService:
    """
    외부 API를 그대로 따르는 서비스

    장점: 구현이 간단, 통합 빠름
    단점: 우리 도메인 언어와 불일치
    """

    def __init__(self, external_api):
        self._api = external_api

    def get_shipment(self, shipment_ref: str) -> ExternalShipment:
        # 외부 형식 그대로 반환
        data = self._api.fetch(shipment_ref)
        return ExternalShipment(
            shipment_ref=data["shipment_ref"],
            status_code=ExternalStatusCode(data["status_code"]),
            loc=ExternalLocation(**data["loc"]),
            eta=data.get("eta")
        )

    def is_in_transit(self, shipment_ref: str) -> bool:
        shipment = self.get_shipment(shipment_ref)
        return shipment.status_code == ExternalStatusCode.IN_TRANSIT
```

Conformist는 **빠르지만 위험**하다. 외부 모델이 우리 도메인에 침투.

---

### 4. Anticorruption Layer (ACL)

외부 모델이 우리 도메인을 오염시키지 않도록 번역 레이어를 둔다.

```
┌─────────────────────────────────────────┐
│          External Shipping API          │
│                                         │
│  shipment_ref, status_code, loc, eta    │
│                                         │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│       Anticorruption Layer (ACL)        │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │  Adapter    │  │   Translator    │   │
│  │ (API 호출)  │→│ (모델 변환)      │   │
│  └─────────────┘  └────────┬────────┘   │
│                            │            │
└────────────────────────────┼────────────┘
                             │
                             ▼
┌─────────────────────────────────────────┐
│           Our Shipping Context          │
│                                         │
│  TrackingId, DeliveryStatus, Location   │
│  (우리의 Ubiquitous Language)           │
│                                         │
└─────────────────────────────────────────┘
```

**Python - ACL 구현**:

```python
# shipping_context/acl/external_tracking_adapter.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from shared_kernel.cargo_id import TrackingId, Location


# 우리 도메인의 모델 (순수하게 유지)
class DeliveryStatus(Enum):
    PENDING = "pending"
    IN_TRANSIT = "in_transit"
    AT_CUSTOMS = "at_customs"
    DELIVERED = "delivered"
    DELAYED = "delayed"


@dataclass
class CargoLocation:
    """우리 도메인의 위치 표현"""
    location: Location
    arrived_at: datetime
    is_final: bool = False


@dataclass
class DeliveryTracking:
    """우리 도메인의 배송 추적 정보"""
    tracking_id: TrackingId
    status: DeliveryStatus
    current_location: Optional[CargoLocation]
    estimated_arrival: Optional[datetime]


# ACL - Translator
class ExternalToInternalTranslator:
    """외부 모델 → 내부 모델 변환"""

    # 상태 코드 매핑
    STATUS_MAP = {
        "BOOKED": DeliveryStatus.PENDING,
        "IN_TRANSIT": DeliveryStatus.IN_TRANSIT,
        "AT_PORT": DeliveryStatus.IN_TRANSIT,
        "CUSTOMS": DeliveryStatus.AT_CUSTOMS,
        "DELIVERED": DeliveryStatus.DELIVERED,
        "EXCEPTION": DeliveryStatus.DELAYED,
    }

    def translate_shipment(
        self,
        external: dict,
        our_tracking_id: TrackingId
    ) -> DeliveryTracking:
        """외부 shipment를 우리 DeliveryTracking으로 변환"""

        status = self._translate_status(external["status_code"])
        location = self._translate_location(external.get("loc"))
        eta = self._translate_eta(external.get("eta"))

        return DeliveryTracking(
            tracking_id=our_tracking_id,
            status=status,
            current_location=location,
            estimated_arrival=eta
        )

    def _translate_status(self, external_status: str) -> DeliveryStatus:
        return self.STATUS_MAP.get(
            external_status,
            DeliveryStatus.PENDING
        )

    def _translate_location(self, loc_data: dict | None) -> CargoLocation | None:
        if not loc_data:
            return None

        # 외부의 port 코드를 우리 Location으로 변환
        un_locode = self._port_to_locode(loc_data["port"])
        location = Location(
            un_locode=un_locode,
            name=loc_data.get("terminal", "Unknown")
        )

        return CargoLocation(
            location=location,
            arrived_at=datetime.now()  # 외부에서 안 주면 현재 시각
        )

    def _port_to_locode(self, port_code: str) -> str:
        """외부 포트 코드 → UN/LOCODE 변환"""
        # 실제로는 매핑 테이블 사용
        port_mapping = {
            "KRPUS": "KRPUS",  # 부산
            "CNSHA": "CNSHA",  # 상하이
            "USNYC": "USNYC",  # 뉴욕
        }
        return port_mapping.get(port_code, port_code)

    def _translate_eta(self, eta_str: str | None) -> datetime | None:
        if not eta_str:
            return None
        return datetime.fromisoformat(eta_str)


# ACL - Adapter
class ExternalTrackingAdapter:
    """외부 API 호출 담당"""

    def __init__(self, api_client, translator: ExternalToInternalTranslator):
        self._api = api_client
        self._translator = translator
        self._id_mapping = {}  # our_tracking_id → external_shipment_ref

    def register_mapping(self, tracking_id: TrackingId, shipment_ref: str):
        """우리 ID와 외부 ID 매핑 등록"""
        self._id_mapping[tracking_id.value] = shipment_ref

    def get_delivery_tracking(self, tracking_id: TrackingId) -> DeliveryTracking:
        """우리 도메인 언어로 배송 추적 정보 조회"""

        # 외부 ID로 변환
        shipment_ref = self._id_mapping.get(tracking_id.value)
        if not shipment_ref:
            raise ValueError(f"Unknown tracking ID: {tracking_id}")

        # 외부 API 호출
        external_data = self._api.fetch(shipment_ref)

        # 우리 모델로 번역
        return self._translator.translate_shipment(
            external_data,
            tracking_id
        )


# 사용 예시
class ShippingService:
    """우리 도메인 서비스 - 외부 시스템 몰라도 됨"""

    def __init__(self, tracking_adapter: ExternalTrackingAdapter):
        self._tracking = tracking_adapter

    def is_cargo_delayed(self, tracking_id: TrackingId) -> bool:
        """우리 언어로 질문"""
        tracking = self._tracking.get_delivery_tracking(tracking_id)
        return tracking.status == DeliveryStatus.DELAYED

    def get_current_location(self, tracking_id: TrackingId) -> Location | None:
        """우리 언어로 응답"""
        tracking = self._tracking.get_delivery_tracking(tracking_id)
        if tracking.current_location:
            return tracking.current_location.location
        return None
```

**C++ - ACL 구현**:

```cpp
// shipping_context/acl/translator.hpp
#pragma once
#include <string>
#include <optional>
#include <unordered_map>
#include <chrono>
#include "shared_kernel/tracking_id.hpp"

namespace shipping::acl {

// 우리 도메인 모델
enum class DeliveryStatus {
    Pending,
    InTransit,
    AtCustoms,
    Delivered,
    Delayed
};

struct CargoLocation {
    shared_kernel::Location location;
    std::chrono::system_clock::time_point arrived_at;
    bool is_final = false;
};

struct DeliveryTracking {
    shared_kernel::TrackingId tracking_id;
    DeliveryStatus status;
    std::optional<CargoLocation> current_location;
    std::optional<std::chrono::system_clock::time_point> estimated_arrival;
};

class ExternalToInternalTranslator {
public:
    DeliveryTracking translate(
        const nlohmann::json& external,
        const shared_kernel::TrackingId& tracking_id
    ) const {
        DeliveryTracking result;
        result.tracking_id = tracking_id;
        result.status = translate_status(external["status_code"]);

        if (external.contains("loc")) {
            result.current_location = translate_location(external["loc"]);
        }

        if (external.contains("eta")) {
            result.estimated_arrival = translate_eta(external["eta"]);
        }

        return result;
    }

private:
    static const std::unordered_map<std::string, DeliveryStatus> status_map_;

    DeliveryStatus translate_status(const std::string& external) const {
        auto it = status_map_.find(external);
        return it != status_map_.end() ? it->second : DeliveryStatus::Pending;
    }

    CargoLocation translate_location(const nlohmann::json& loc) const {
        std::string un_locode = port_to_locode(loc["port"]);
        return CargoLocation{
            .location = shared_kernel::Location(un_locode, loc.value("terminal", "Unknown")),
            .arrived_at = std::chrono::system_clock::now()
        };
    }

    std::string port_to_locode(const std::string& port) const {
        // 매핑 로직
        return port;  // 간단히 동일하게
    }

    std::chrono::system_clock::time_point translate_eta(const std::string& eta) const {
        // ISO 8601 파싱
        // ...
    }
};

}  // namespace shipping::acl
```

**ACL의 가치**:

```
외부 변경 시:
┌──────────────────────────────────────────────────┐
│ 외부 API가 status_code를 state로 변경            │
│                                                  │
│ Conformist: 전체 코드베이스 수정 필요 💥         │
│                                                  │
│ ACL: Translator만 수정                          │
│     _translate_status(external.get("state"))    │
│     나머지 코드는 그대로 ✓                       │
└──────────────────────────────────────────────────┘
```

---

### 5. Open Host Service

다수의 Downstream을 위해 공개 API를 제공한다.

```
┌─────────────────────────────────────────┐
│           Booking Context               │
│         (Open Host Service)             │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │      Published API              │    │
│  │                                 │    │
│  │  GET  /api/v1/bookings/{id}     │    │
│  │  POST /api/v1/bookings          │    │
│  │  GET  /api/v1/bookings/{id}/    │    │
│  │       itinerary                 │    │
│  │                                 │    │
│  │  Events:                        │    │
│  │  - booking.created              │    │
│  │  - booking.confirmed            │    │
│  │  - itinerary.assigned           │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┼─────────┬─────────┐
        │         │         │         │
        ▼         ▼         ▼         ▼
    Shipping   Billing  Reporting  Partner
    Context    Context  Context    Systems
```

**Python - Open Host Service**:

```python
# booking_context/api/booking_api.py
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import List
from flask import Blueprint, jsonify, request


# Published Language - 공개 계약
@dataclass
class BookingResponse:
    """API 응답 형식 - 버전 관리됨"""
    tracking_id: str
    origin_locode: str
    destination_locode: str
    customer_id: str
    status: str
    booked_at: str  # ISO 8601


@dataclass
class ItineraryLegResponse:
    """경로 구간 응답"""
    voyage_number: str
    from_locode: str
    to_locode: str
    load_time: str
    unload_time: str


@dataclass
class ItineraryResponse:
    """경로 응답"""
    tracking_id: str
    legs: List[ItineraryLegResponse]


# Open Host Service 구현
booking_api = Blueprint('booking', __name__)


@booking_api.route('/api/v1/bookings/<tracking_id>', methods=['GET'])
def get_booking(tracking_id: str):
    """
    공개 API - 버전 v1

    다수의 소비자가 의존하므로 안정적으로 유지
    Breaking change 시 v2로 새 엔드포인트 생성
    """
    booking = booking_service.find_by_tracking_id(tracking_id)
    if not booking:
        return jsonify({"error": "Booking not found"}), 404

    response = BookingResponse(
        tracking_id=booking.tracking_id.value,
        origin_locode=booking.origin.un_locode,
        destination_locode=booking.destination.un_locode,
        customer_id=booking.customer_id,
        status=booking.status.value,
        booked_at=booking.booked_at.isoformat()
    )
    return jsonify(asdict(response))


@booking_api.route('/api/v1/bookings/<tracking_id>/itinerary', methods=['GET'])
def get_itinerary(tracking_id: str):
    """경로 조회 API"""
    itinerary = booking_service.get_itinerary(tracking_id)
    if not itinerary:
        return jsonify({"error": "Itinerary not found"}), 404

    legs = [
        ItineraryLegResponse(
            voyage_number=leg.voyage_number,
            from_locode=leg.load_location.un_locode,
            to_locode=leg.unload_location.un_locode,
            load_time=leg.load_time.isoformat(),
            unload_time=leg.unload_time.isoformat()
        )
        for leg in itinerary.legs
    ]

    response = ItineraryResponse(
        tracking_id=tracking_id,
        legs=legs
    )
    return jsonify(asdict(response))


# 이벤트 발행 (Open Host의 비동기 버전)
class BookingEventPublisher:
    """이벤트 기반 Open Host"""

    def __init__(self, message_broker):
        self._broker = message_broker

    def publish_booking_created(self, booking) -> None:
        """booking.created 이벤트 발행"""
        event = {
            "event_type": "booking.created",
            "version": "1.0",
            "timestamp": datetime.now().isoformat(),
            "data": {
                "tracking_id": booking.tracking_id.value,
                "origin": booking.origin.un_locode,
                "destination": booking.destination.un_locode,
                "customer_id": booking.customer_id
            }
        }
        self._broker.publish("booking.events", event)

    def publish_itinerary_assigned(self, tracking_id: str, itinerary) -> None:
        """itinerary.assigned 이벤트 발행"""
        event = {
            "event_type": "itinerary.assigned",
            "version": "1.0",
            "timestamp": datetime.now().isoformat(),
            "data": {
                "tracking_id": tracking_id,
                "legs": [
                    {
                        "voyage": leg.voyage_number,
                        "from": leg.load_location.un_locode,
                        "to": leg.unload_location.un_locode
                    }
                    for leg in itinerary.legs
                ]
            }
        }
        self._broker.publish("booking.events", event)
```

---

### 6. Published Language

여러 Context가 공유하는 문서화된 언어.

```
┌─────────────────────────────────────────────────────┐
│               Published Language                    │
│               (공유 스키마/프로토콜)                 │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  cargo-schema.json (JSON Schema)              │  │
│  │  ─────────────────────────────────            │  │
│  │  {                                            │  │
│  │    "tracking_id": "string (ABC-123456)",      │  │
│  │    "origin": "string (UN/LOCODE)",            │  │
│  │    "destination": "string (UN/LOCODE)",       │  │
│  │    "status": "enum [booked, shipped, ...]"    │  │
│  │  }                                            │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │  cargo_events.proto (Protocol Buffers)        │  │
│  │  ─────────────────────────────────────        │  │
│  │  message CargoBooked {                        │  │
│  │    string tracking_id = 1;                    │  │
│  │    string origin = 2;                         │  │
│  │    ...                                        │  │
│  │  }                                            │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
          │           │           │
          ▼           ▼           ▼
      Booking     Shipping     Billing
      Context     Context      Context
```

**Protocol Buffers 예시**:

```protobuf
// published_language/cargo_events.proto
syntax = "proto3";

package cargo.events;

// 공유 Value Objects
message Location {
  string un_locode = 1;  // UN/LOCODE 표준
  string name = 2;
}

message TrackingId {
  string value = 1;  // ABC-123456 형식
}

// 이벤트 정의
message CargoBooked {
  TrackingId tracking_id = 1;
  Location origin = 2;
  Location destination = 3;
  string customer_id = 4;
  int64 booked_at_unix = 5;
}

message CargoLoaded {
  TrackingId tracking_id = 1;
  string voyage_number = 2;
  Location location = 3;
  int64 loaded_at_unix = 4;
}

message CargoUnloaded {
  TrackingId tracking_id = 1;
  string voyage_number = 2;
  Location location = 3;
  int64 unloaded_at_unix = 4;
}

message CargoDelivered {
  TrackingId tracking_id = 1;
  Location location = 2;
  int64 delivered_at_unix = 3;
}
```

**JSON Schema 예시**:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://shipping.example.com/schemas/cargo/v1",
  "title": "Cargo",
  "description": "Published Language for Cargo domain",

  "definitions": {
    "TrackingId": {
      "type": "string",
      "pattern": "^[A-Z]{3}-\\d{6}$",
      "description": "Unique cargo identifier (e.g., ABC-123456)"
    },
    "UnLocode": {
      "type": "string",
      "pattern": "^[A-Z]{5}$",
      "description": "UN/LOCODE location code"
    },
    "CargoStatus": {
      "type": "string",
      "enum": ["booked", "in_transit", "at_customs", "delivered", "delayed"]
    }
  },

  "type": "object",
  "properties": {
    "tracking_id": { "$ref": "#/definitions/TrackingId" },
    "origin": { "$ref": "#/definitions/UnLocode" },
    "destination": { "$ref": "#/definitions/UnLocode" },
    "status": { "$ref": "#/definitions/CargoStatus" },
    "customer_id": { "type": "string" }
  },
  "required": ["tracking_id", "origin", "destination", "status"]
}
```

---

### 7. Separate Ways

통합이 득보다 실이 클 때, 독립 운영한다.

```
┌─────────────────────────────────────────┐
│           Main Cargo System             │
│                                         │
│  Booking, Shipping, Billing             │
│                                         │
└─────────────────────────────────────────┘

           ✕ 통합하지 않음 ✕

┌─────────────────────────────────────────┐
│        HR / Employee System             │
│                                         │
│  Employee, Payroll, Leave               │
│  (화물과 무관한 도메인)                  │
│                                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      Legacy Warehouse System            │
│                                         │
│  (통합 비용 > 수동 처리 비용)            │
│  → Excel로 데이터 교환                   │
│                                         │
└─────────────────────────────────────────┘
```

**Separate Ways 선택 기준**:

```python
class IntegrationDecision:
    """통합 여부 결정 기준"""

    @staticmethod
    def should_integrate(
        business_value: int,      # 통합으로 얻는 가치 (1-10)
        integration_cost: int,    # 통합 구현 비용 (1-10)
        maintenance_cost: int,    # 통합 유지 비용 (1-10)
        team_coupling: int,       # 팀 간 결합도 증가 (1-10)
        alternative_cost: int     # 대안(수동 처리 등) 비용 (1-10)
    ) -> bool:
        """
        통합 ROI 계산

        통합하는 경우:
        - business_value가 높고
        - integration_cost + maintenance_cost가 낮으며
        - alternative_cost가 높을 때

        Separate Ways 선택:
        - business_value가 낮거나
        - integration_cost가 너무 높거나
        - alternative_cost가 수용 가능할 때
        """
        integration_total = integration_cost + maintenance_cost + team_coupling

        roi = (business_value * 10 - integration_total) / max(alternative_cost, 1)

        return roi > 1.0  # ROI가 1 이상이면 통합
```

---

## Context Map 문서화

실제 프로젝트의 Context Map 예시:

```python
"""
화물 해운 시스템 Context Map
============================

Last Updated: 2024-01-15
Maintainer: Architecture Team

Bounded Contexts:
-----------------
1. Booking Context (Team: Booking Squad)
   - 화물 예약 및 경로 계획
   - Owner: booking-squad@company.com

2. Shipping Context (Team: Operations Squad)
   - 실제 운송 추적 및 물류 관리
   - Owner: ops-squad@company.com

3. Billing Context (Team: Finance Squad)
   - 청구 및 결제 처리
   - Owner: finance-squad@company.com

4. External Tracking (External: TrackShip Inc.)
   - 제3자 위치 추적 서비스
   - Contact: support@trackship.example

Relationships:
--------------
Booking → Shipping: Customer-Supplier
  - Booking이 예약 이벤트 발행
  - Shipping이 구독하여 화물 추적 시작
  - 계약: BookingShippingContract v2.1

Booking → Billing: Customer-Supplier
  - Booking이 확정된 예약 정보 제공
  - Billing이 청구서 생성
  - 계약: BookingBillingContract v1.3

Shipping ← External Tracking: ACL
  - ExternalTrackingAdapter 사용
  - Translator로 모델 변환
  - 장애 시 fallback: 수동 위치 입력

Booking ↔ Reporting: Open Host Service
  - Booking이 REST API 제공
  - Reporting이 읽기 전용 조회
  - API Version: v1.2

Shared Kernel:
--------------
- TrackingId (Value Object)
- Location (Value Object)
- Maintained by: Architecture Team
- Change policy: 양 팀 합의 필수, 2주 사전 통보
"""
```

---

## 마이크로서비스와의 관계

Bounded Context는 마이크로서비스의 경계를 정하는 데 유용하다.

```
모놀리스에서 마이크로서비스로:

┌─────────────────────────────────────────┐
│            Monolith                     │
│                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Booking │ │Shipping │ │ Billing │   │
│  │ Module  │ │ Module  │ │ Module  │   │
│  └────┬────┘ └────┬────┘ └────┬────┘   │
│       │           │           │         │
│       └───────────┴───────────┘         │
│              공유 DB                     │
└─────────────────────────────────────────┘
                   │
                   │ DDD로 경계 식별
                   ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Booking  │  │ Shipping │  │ Billing  │
│ Service  │  │ Service  │  │ Service  │
│          │  │          │  │          │
│  자체 DB │  │  자체 DB │  │  자체 DB │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────────┴─────────────┘
          이벤트 기반 통합
```

**주의**: 기술적 분리가 Context 분리를 대체하지 않는다.

```
잘못된 분리:
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Cargo    │  │ Cargo    │  │ Cargo    │
│ API      │  │ Logic    │  │ DB       │
│ Service  │─▶│ Service  │─▶│ Service  │
└──────────┘  └──────────┘  └──────────┘

기술 레이어로 분리 = 분산 모놀리스 (안티패턴)

올바른 분리:
┌──────────────┐  ┌──────────────┐
│   Booking    │  │   Shipping   │
│   Service    │  │   Service    │
│              │  │              │
│ API+Logic+DB │  │ API+Logic+DB │
└──────────────┘  └──────────────┘

도메인 경계로 분리 = 진정한 마이크로서비스
```

---

## 핵심 정리

```
┌─────────────────────────────────────────────────────────┐
│              모델 무결성 유지 전략                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Bounded Context                                     │
│     → 모델이 적용되는 명확한 경계 정의                    │
│                                                         │
│  2. Context Map                                         │
│     → 컨텍스트 간 관계 시각화 및 문서화                   │
│                                                         │
│  3. 통합 패턴 선택:                                      │
│                                                         │
│     협력적:                                             │
│     • Shared Kernel - 공유 모델 (작게 유지)              │
│     • Customer-Supplier - 요구사항 협의                  │
│     • Partnership - 동등한 협력                          │
│                                                         │
│     방어적:                                             │
│     • Conformist - 외부 모델 수용 (빠르지만 위험)         │
│     • ACL - 번역 레이어로 보호                           │
│                                                         │
│     공개적:                                             │
│     • Open Host Service - 다수를 위한 API                │
│     • Published Language - 공유 스키마                   │
│                                                         │
│     독립적:                                             │
│     • Separate Ways - 통합 포기                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

다음 장에서는 **Core Domain을 식별하고 증류(Distillation)하는 방법**을 다룬다.
