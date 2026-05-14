---
title: "Ch 15: Distillation"
date: 2025-10-01T15:00:00
description: "Core Domain / Generic Subdomain / Supporting Subdomain — 핵심 식별."
tags: [DDD, Core Domain, Distillation]
series: "Domain-Driven Design"
seriesOrder: 15
draft: true
---

## 모든 것이 중요하면 아무것도 중요하지 않다

대규모 시스템에서는 모든 부분에 같은 노력을 기울일 수 없다. **증류(Distillation)**는 핵심을 식별하고 집중하는 전략이다.

```
증류 전:
┌─────────────────────────────────────────────────────┐
│                  화물 해운 시스템                     │
│                                                     │
│  예약  운송  청구  인증  로깅  알림  보고서  ...     │
│   ?     ?    ?    ?    ?    ?     ?              │
│                                                     │
│       어디에 집중해야 하나?                          │
└─────────────────────────────────────────────────────┘

증류 후:
┌─────────────────────────────────────────────────────┐
│                  화물 해운 시스템                     │
│                                                     │
│  ┌─────────────────────────────────┐               │
│  │         CORE DOMAIN             │               │
│  │   예약 최적화 / 경로 계획       │  ← 차별화     │
│  │   (최고의 인재, 최고의 설계)    │               │
│  └─────────────────────────────────┘               │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │Supporting│ │ Generic  │ │ Generic  │          │
│  │ 청구    │ │  인증    │ │  로깅    │  ← 구매/위임│
│  └──────────┘ └──────────┘ └──────────┘          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 도메인 분류

### 1. Core Domain

**비즈니스를 차별화하는 영역**. 경쟁 우위의 원천.

```
화물 해운 회사의 Core Domain:

┌─────────────────────────────────────────┐
│              CORE DOMAIN                │
│                                         │
│  경로 최적화 알고리즘                    │
│  ─────────────────────                  │
│  • 최소 비용 경로 탐색                   │
│  • 다중 경유지 최적화                    │
│  • 실시간 지연 반영                      │
│  • 선박 용량 고려                        │
│                                         │
│  화물 적재 최적화                        │
│  ─────────────────                      │
│  • 컨테이너 배치 알고리즘                │
│  • 무게 균형 계산                        │
│  • 하역 순서 최적화                      │
│                                         │
│  → 이것이 우리 회사를 다르게 만든다      │
└─────────────────────────────────────────┘
```

### 2. Generic Subdomain

**어느 회사나 필요로 하는 일반적 기능**. 구매하거나 표준 솔루션 사용.

```
Generic Subdomains:

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│    인증      │  │    결제      │  │    알림      │
│              │  │              │  │              │
│ • OAuth 2.0 │  │ • 카드결제   │  │ • 이메일    │
│ • JWT       │  │ • 계좌이체   │  │ • SMS       │
│ • RBAC      │  │ • 환불       │  │ • 푸시알림  │
│              │  │              │  │              │
│ → 구매하라  │  │ → 구매하라  │  │ → 구매하라  │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 3. Supporting Subdomain

**Core Domain을 지원**하지만 차별화 요소는 아닌 부분.

```
Supporting Subdomains:

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   고객 관리  │  │   청구/정산  │  │   보고서     │
│              │  │              │  │              │
│ • 고객 정보 │  │ • 운임 계산 │  │ • 통계      │
│ • 계약 관리 │  │ • 청구서    │  │ • 대시보드  │
│ • 신용 평가 │  │ • 수금      │  │ • 분석      │
│              │  │              │  │              │
│ → 내부 개발 │  │ → 내부 개발 │  │ → 내부 개발 │
│   (덜 복잡)│  │   (덜 복잡)│  │   (덜 복잡)│
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 도메인 분류 판단

```
질문으로 판단하기:

1. "이것이 경쟁사와 우리를 구별하는가?"
   YES → Core Domain
   NO  → 다음 질문

2. "시장에서 구매하거나 오픈소스를 쓸 수 있는가?"
   YES → Generic Subdomain
   NO  → 다음 질문

3. "Core Domain을 지원하는 우리만의 로직이 있는가?"
   YES → Supporting Subdomain
   NO  → Generic Subdomain
```

**Python - 도메인 분류**:

```python
from enum import Enum, auto
from dataclasses import dataclass


class DomainType(Enum):
    CORE = auto()           # 차별화 영역
    SUPPORTING = auto()     # 지원 영역
    GENERIC = auto()        # 일반 영역


@dataclass
class DomainClassification:
    """도메인 영역 분류"""

    name: str
    domain_type: DomainType
    investment_priority: int  # 1-10
    team_skill_level: str     # "senior", "mid", "junior"
    buy_vs_build: str         # "build", "buy", "outsource"
    rationale: str


# 화물 해운 시스템 도메인 분류
SHIPPING_DOMAINS = [
    DomainClassification(
        name="Route Optimization",
        domain_type=DomainType.CORE,
        investment_priority=10,
        team_skill_level="senior",
        buy_vs_build="build",
        rationale="경쟁 우위의 핵심. 최고의 알고리즘이 최적 경로 제공"
    ),
    DomainClassification(
        name="Cargo Allocation",
        domain_type=DomainType.CORE,
        investment_priority=9,
        team_skill_level="senior",
        buy_vs_build="build",
        rationale="선박 용량 최적화로 비용 절감. 우리만의 알고리즘"
    ),
    DomainClassification(
        name="Booking Management",
        domain_type=DomainType.SUPPORTING,
        investment_priority=6,
        team_skill_level="mid",
        buy_vs_build="build",
        rationale="Core를 지원하지만 표준적인 CRUD 위주"
    ),
    DomainClassification(
        name="Billing",
        domain_type=DomainType.SUPPORTING,
        investment_priority=5,
        team_skill_level="mid",
        buy_vs_build="build",
        rationale="운임 계산은 비즈니스 규칙이 있지만 차별화는 아님"
    ),
    DomainClassification(
        name="Authentication",
        domain_type=DomainType.GENERIC,
        investment_priority=3,
        team_skill_level="junior",
        buy_vs_build="buy",
        rationale="표준 솔루션 사용 (Auth0, Okta 등)"
    ),
    DomainClassification(
        name="Notification",
        domain_type=DomainType.GENERIC,
        investment_priority=2,
        team_skill_level="junior",
        buy_vs_build="buy",
        rationale="표준 서비스 사용 (SendGrid, Twilio 등)"
    ),
]
```

---

## Domain Vision Statement

**Core Domain의 본질을 한 페이지로 설명**하는 문서.

```
┌─────────────────────────────────────────────────────┐
│           Domain Vision Statement                   │
│           화물 해운 예약 시스템                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  비전                                               │
│  ────                                               │
│  세계 최고의 화물 경로 최적화를 통해 고객에게         │
│  최저 비용과 최단 시간의 배송을 제공한다.            │
│                                                     │
│  핵심 차별화 요소                                    │
│  ────────────                                       │
│  1. 실시간 다변수 경로 최적화 알고리즘               │
│     - 날씨, 연료비, 항구 혼잡도 반영                 │
│     - 경쟁사 대비 15% 비용 절감                      │
│                                                     │
│  2. 지능형 화물 적재 시스템                          │
│     - 하역 순서 최적화로 항구 체류 시간 30% 단축     │
│     - 무게 균형 자동 계산                           │
│                                                     │
│  Core Domain 경계                                   │
│  ──────────────                                     │
│  포함: RouteOptimizer, CargoAllocator,             │
│       VoyagePlanner, LoadBalancer                  │
│  제외: Booking CRUD, Billing, Reporting            │
│                                                     │
│  전략적 방향                                        │
│  ─────────                                          │
│  - 경로 최적화 알고리즘에 R&D 투자 집중             │
│  - 머신러닝 기반 수요 예측 도입 계획                 │
│  - Supporting 영역은 효율성 중심으로 개발            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Highlighted Core

**코드와 문서에서 Core Domain을 명시적으로 표시**한다.

### 코드에서의 강조

**Python**:

```python
# core_domain/__init__.py
"""
═══════════════════════════════════════════════════════════════
                      CORE DOMAIN
═══════════════════════════════════════════════════════════════

이 패키지는 화물 해운 시스템의 Core Domain을 포함합니다.

포함 모듈:
- route_optimizer: 최적 경로 탐색 알고리즘
- cargo_allocator: 화물 적재 최적화
- voyage_planner: 항해 계획 수립
- load_balancer: 선박 무게 균형 계산

주의사항:
- 이 코드는 비즈니스 차별화의 핵심입니다.
- 변경 시 도메인 전문가와 반드시 협의하세요.
- 최고 수준의 테스트 커버리지를 유지하세요.
- 리팩토링 전 팀 리뷰가 필요합니다.

담당 팀: Core Algorithm Squad
문의: core-team@shipping.example

═══════════════════════════════════════════════════════════════
"""

from .route_optimizer import RouteOptimizer
from .cargo_allocator import CargoAllocator
from .voyage_planner import VoyagePlanner
from .load_balancer import LoadBalancer

__all__ = [
    'RouteOptimizer',
    'CargoAllocator',
    'VoyagePlanner',
    'LoadBalancer',
]


# core_domain/route_optimizer.py
"""
[CORE DOMAIN] Route Optimizer
경쟁 우위의 핵심 - 최적 경로 탐색 알고리즘
"""

from dataclasses import dataclass
from typing import List, Optional
from decimal import Decimal


@dataclass(frozen=True)
class Route:
    """최적화된 경로"""
    legs: List["RouteLeg"]
    total_cost: Decimal
    estimated_days: int
    optimization_score: float  # 0.0 - 1.0


@dataclass(frozen=True)
class RouteLeg:
    """경로의 한 구간"""
    origin: str
    destination: str
    voyage_number: str
    cost: Decimal
    transit_days: int


class RouteOptimizer:
    """
    [CORE DOMAIN]
    다변수 경로 최적화 엔진

    이 클래스는 비즈니스의 핵심 차별화 요소입니다.
    알고리즘 변경 시 반드시 Core Algorithm Squad와 협의하세요.
    """

    def __init__(
        self,
        cost_calculator: "CostCalculator",
        schedule_service: "ScheduleService",
        constraint_validator: "ConstraintValidator"
    ):
        self._cost_calc = cost_calculator
        self._schedule = schedule_service
        self._validator = constraint_validator

    def find_optimal_route(
        self,
        origin: str,
        destination: str,
        cargo_spec: "CargoSpecification",
        deadline: Optional["datetime"] = None
    ) -> Route:
        """
        [CORE ALGORITHM]
        최적 경로 탐색

        다음 요소를 고려하여 최적 경로를 계산합니다:
        - 총 비용 (운임 + 연료 + 항구 수수료)
        - 운송 시간
        - 환적 횟수
        - 선박 용량 가용성
        - 날씨 및 계절 요인
        """
        # 후보 경로 생성
        candidates = self._generate_candidates(origin, destination)

        # 제약 조건 필터링
        valid_routes = [
            r for r in candidates
            if self._validator.is_valid(r, cargo_spec, deadline)
        ]

        # 비용 계산 및 정렬
        scored_routes = [
            self._score_route(r, cargo_spec)
            for r in valid_routes
        ]

        # 최적 경로 선택
        return min(scored_routes, key=lambda r: r.total_cost)

    def _generate_candidates(
        self,
        origin: str,
        destination: str
    ) -> List[Route]:
        """
        [PROPRIETARY ALGORITHM]
        경로 후보 생성 - 특허 출원 중인 알고리즘
        """
        # 실제 구현은 영업 비밀
        pass

    def _score_route(
        self,
        route: Route,
        cargo_spec: "CargoSpecification"
    ) -> Route:
        """비용 및 효율성 점수 계산"""
        pass
```

**C++**:

```cpp
// core_domain/route_optimizer.hpp
/**
 * ═══════════════════════════════════════════════════════════════
 *                        CORE DOMAIN
 * ═══════════════════════════════════════════════════════════════
 *
 * 이 헤더는 Core Domain의 핵심 클래스를 정의합니다.
 *
 * 주의: 이 코드는 비즈니스 차별화의 핵심입니다.
 *       변경 시 Core Algorithm Squad와 협의 필수.
 */
#pragma once

#include <vector>
#include <optional>
#include <decimal.hpp>

namespace core_domain {

/**
 * [CORE DOMAIN] Route Optimizer
 *
 * 경쟁 우위의 핵심 - 최적 경로 탐색 알고리즘
 *
 * @note 이 클래스의 알고리즘은 영업 비밀입니다.
 * @note 성능 최적화가 중요합니다 (밀리초 단위).
 */
class RouteOptimizer {
public:
    RouteOptimizer(
        std::unique_ptr<CostCalculator> cost_calc,
        std::unique_ptr<ScheduleService> schedule,
        std::unique_ptr<ConstraintValidator> validator
    );

    /**
     * [CORE ALGORITHM] 최적 경로 탐색
     *
     * @param origin 출발지 UN/LOCODE
     * @param destination 도착지 UN/LOCODE
     * @param cargo_spec 화물 사양
     * @param deadline 배송 기한 (optional)
     * @return 최적화된 경로
     *
     * @complexity O(V * E * log V) where V=ports, E=voyages
     * @performance 목표: < 100ms for 1000 ports
     */
    [[nodiscard]]
    Route find_optimal_route(
        const std::string& origin,
        const std::string& destination,
        const CargoSpecification& cargo_spec,
        std::optional<DateTime> deadline = std::nullopt
    ) const;

private:
    // [PROPRIETARY] 특허 출원 중
    std::vector<Route> generate_candidates(
        const std::string& origin,
        const std::string& destination
    ) const;

    Route score_route(
        const Route& route,
        const CargoSpecification& cargo_spec
    ) const;

    std::unique_ptr<CostCalculator> cost_calc_;
    std::unique_ptr<ScheduleService> schedule_;
    std::unique_ptr<ConstraintValidator> validator_;
};

}  // namespace core_domain
```

### Distillation Document

코드 외부에서 Core Domain을 설명하는 문서:

```markdown
# Core Domain Distillation Document

## 화물 해운 시스템 - Core Domain 정의

### 1. Core Domain 구성 요소

| 모듈 | 책임 | 중요도 |
|------|------|--------|
| RouteOptimizer | 최적 경로 탐색 | ★★★★★ |
| CargoAllocator | 화물 적재 최적화 | ★★★★★ |
| VoyagePlanner | 항해 일정 계획 | ★★★★☆ |
| LoadBalancer | 선박 무게 균형 | ★★★★☆ |

### 2. 핵심 도메인 개념

```
경로 최적화 핵심 개념:

Route
  └── RouteLeg (1..n)
        ├── origin: Location
        ├── destination: Location
        ├── voyage: Voyage
        └── cost: Money

최적화 변수:
  • 총 비용 (cost) - 최소화
  • 운송 시간 (transit_time) - 제약 내 최소화
  • 환적 횟수 (transshipments) - 최소화
  • 신뢰도 (reliability) - 최대화
```

### 3. 핵심 비즈니스 규칙

1. **경로 선택 규칙**
   - 직항이 환적보다 선호됨 (비용이 20% 이상 차이 나지 않는 한)
   - 기한 내 도착이 비용보다 우선

2. **적재 규칙**
   - 선박 용량의 110%까지 예약 가능 (Overbooking)
   - 위험 화물은 특수 구역에만 적재

### 4. 코드 위치

```
src/
├── core_domain/           ← CORE DOMAIN
│   ├── route_optimizer.py
│   ├── cargo_allocator.py
│   ├── voyage_planner.py
│   └── load_balancer.py
├── supporting/            ← Supporting
│   ├── booking/
│   └── billing/
└── generic/              ← Generic (외부 연동)
    ├── auth/
    └── notification/
```
```

---

## Generic Subdomain 처리

Generic Subdomain은 **구매하거나 단순하게 유지**한다.

```python
# generic_subdomain/authentication.py
"""
[GENERIC SUBDOMAIN] Authentication

외부 서비스(Auth0) 위임.
직접 구현하지 않음 - 차별화 요소가 아님.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class AuthenticatedUser:
    """인증된 사용자 정보"""
    user_id: str
    email: str
    roles: list[str]


class AuthenticationService(ABC):
    """인증 서비스 인터페이스 - 구현은 외부 서비스"""

    @abstractmethod
    def authenticate(self, token: str) -> AuthenticatedUser | None:
        pass

    @abstractmethod
    def has_permission(self, user: AuthenticatedUser, permission: str) -> bool:
        pass


# 실제 구현은 외부 서비스 래퍼
class Auth0AuthenticationService(AuthenticationService):
    """Auth0 기반 구현 - 단순 래퍼"""

    def __init__(self, auth0_client):
        self._client = auth0_client

    def authenticate(self, token: str) -> AuthenticatedUser | None:
        # Auth0 API 호출
        user_info = self._client.verify_token(token)
        if not user_info:
            return None

        return AuthenticatedUser(
            user_id=user_info["sub"],
            email=user_info["email"],
            roles=user_info.get("roles", [])
        )

    def has_permission(self, user: AuthenticatedUser, permission: str) -> bool:
        # 역할 기반 권한 확인 - 단순 로직
        role_permissions = {
            "admin": ["*"],
            "operator": ["booking:read", "booking:write", "tracking:read"],
            "customer": ["booking:read", "tracking:read"],
        }

        for role in user.roles:
            perms = role_permissions.get(role, [])
            if "*" in perms or permission in perms:
                return True
        return False
```

---

## Cohesive Mechanisms

**복잡한 메커니즘을 분리**하여 Core Domain을 깔끔하게 유지한다.

```
분리 전:
┌─────────────────────────────────────────┐
│            RouteOptimizer               │
│                                         │
│  • 경로 탐색 알고리즘                    │
│  • 그래프 자료구조 관리                  │
│  • 다익스트라 구현                       │
│  • 캐시 관리                            │
│  • 병렬 처리                            │
│                                         │
│  → 메커니즘이 도메인을 압도함            │
└─────────────────────────────────────────┘

분리 후:
┌─────────────────────────────────────────┐
│            RouteOptimizer               │
│            (Core Domain)                │
│                                         │
│  • 경로 탐색 비즈니스 로직               │
│  • 도메인 규칙 적용                      │
│                                         │
└────────────────┬────────────────────────┘
                 │ uses
┌────────────────┴────────────────────────┐
│         RouteGraph (Mechanism)          │
│                                         │
│  • 그래프 자료구조                       │
│  • 다익스트라 알고리즘                   │
│  • 캐시 관리                            │
│                                         │
└─────────────────────────────────────────┘
```

**Python - Cohesive Mechanism 분리**:

```python
# mechanisms/route_graph.py
"""
[COHESIVE MECHANISM] Route Graph

그래프 기반 경로 탐색 메커니즘.
Core Domain이 아닌 기술적 메커니즘.
"""

from dataclasses import dataclass
from typing import Dict, List, Set, Tuple
from heapq import heappush, heappop


@dataclass
class GraphNode:
    """그래프 노드"""
    id: str
    data: dict


@dataclass
class GraphEdge:
    """그래프 엣지"""
    source: str
    target: str
    weight: float
    data: dict


class RouteGraph:
    """
    [MECHANISM]
    경로 탐색을 위한 그래프 자료구조

    Core Domain (RouteOptimizer)이 사용하는 기술적 메커니즘.
    도메인 로직 없이 순수 알고리즘만 제공.
    """

    def __init__(self):
        self._nodes: Dict[str, GraphNode] = {}
        self._edges: Dict[str, List[GraphEdge]] = {}
        self._cache: Dict[Tuple[str, str], List[str]] = {}

    def add_node(self, node_id: str, data: dict = None) -> None:
        """노드 추가"""
        self._nodes[node_id] = GraphNode(node_id, data or {})
        if node_id not in self._edges:
            self._edges[node_id] = []

    def add_edge(
        self,
        source: str,
        target: str,
        weight: float,
        data: dict = None
    ) -> None:
        """엣지 추가"""
        edge = GraphEdge(source, target, weight, data or {})
        self._edges[source].append(edge)
        self._invalidate_cache()

    def find_shortest_path(
        self,
        start: str,
        end: str
    ) -> Tuple[List[str], float]:
        """
        다익스트라 알고리즘으로 최단 경로 탐색

        도메인 로직 없음 - 순수 그래프 알고리즘
        """
        # 캐시 확인
        cache_key = (start, end)
        if cache_key in self._cache:
            return self._cache[cache_key]

        # 다익스트라
        distances: Dict[str, float] = {start: 0}
        previous: Dict[str, str] = {}
        visited: Set[str] = set()
        heap = [(0, start)]

        while heap:
            current_dist, current = heappop(heap)

            if current in visited:
                continue
            visited.add(current)

            if current == end:
                break

            for edge in self._edges.get(current, []):
                if edge.target in visited:
                    continue

                new_dist = current_dist + edge.weight
                if new_dist < distances.get(edge.target, float('inf')):
                    distances[edge.target] = new_dist
                    previous[edge.target] = current
                    heappush(heap, (new_dist, edge.target))

        # 경로 재구성
        if end not in distances:
            return [], float('inf')

        path = []
        current = end
        while current != start:
            path.append(current)
            current = previous[current]
        path.append(start)
        path.reverse()

        result = (path, distances[end])
        self._cache[cache_key] = result
        return result

    def find_all_paths(
        self,
        start: str,
        end: str,
        max_paths: int = 10
    ) -> List[Tuple[List[str], float]]:
        """
        K-shortest paths 알고리즘

        경로 최적화에서 여러 후보 필요시 사용
        """
        # Yen's algorithm 구현
        pass

    def _invalidate_cache(self) -> None:
        """캐시 무효화"""
        self._cache.clear()


# core_domain/route_optimizer.py
"""
[CORE DOMAIN] Route Optimizer

메커니즘(RouteGraph)을 사용하여 비즈니스 로직 구현
"""

from mechanisms.route_graph import RouteGraph


class RouteOptimizer:
    """
    [CORE DOMAIN]
    경로 최적화 엔진

    RouteGraph 메커니즘을 사용하지만,
    비즈니스 규칙은 이 클래스에서 정의
    """

    def __init__(self, schedule_service, pricing_service):
        self._graph = RouteGraph()
        self._schedule = schedule_service
        self._pricing = pricing_service
        self._initialized = False

    def initialize(self, voyages: List["Voyage"]) -> None:
        """항해 데이터로 그래프 초기화"""
        for voyage in voyages:
            # 메커니즘에 데이터 주입
            self._graph.add_node(voyage.origin.locode)
            self._graph.add_node(voyage.destination.locode)

            # 비즈니스 규칙: 비용 계산
            cost = self._pricing.calculate_voyage_cost(voyage)

            self._graph.add_edge(
                voyage.origin.locode,
                voyage.destination.locode,
                weight=float(cost),
                data={"voyage_number": voyage.number}
            )

        self._initialized = True

    def find_optimal_route(
        self,
        origin: str,
        destination: str,
        cargo: "CargoSpecification"
    ) -> "Route":
        """
        [CORE DOMAIN LOGIC]
        최적 경로 탐색 - 비즈니스 규칙 적용
        """
        if not self._initialized:
            raise RuntimeError("Optimizer not initialized")

        # 메커니즘 사용: 기본 최단 경로
        path, base_cost = self._graph.find_shortest_path(origin, destination)

        # [비즈니스 규칙] 화물 특성 반영
        adjusted_cost = self._apply_cargo_adjustments(base_cost, cargo)

        # [비즈니스 규칙] 환적 페널티
        transshipment_count = len(path) - 2
        if transshipment_count > 0:
            adjusted_cost *= (1 + 0.05 * transshipment_count)

        # [비즈니스 규칙] 신뢰도 보정
        reliability = self._calculate_reliability(path)

        return Route(
            legs=self._build_legs(path),
            total_cost=Decimal(str(adjusted_cost)),
            reliability_score=reliability
        )

    def _apply_cargo_adjustments(
        self,
        base_cost: float,
        cargo: "CargoSpecification"
    ) -> float:
        """[DOMAIN RULE] 화물 특성에 따른 비용 조정"""
        multiplier = 1.0

        if cargo.is_hazardous:
            multiplier *= 1.5  # 위험물 50% 할증

        if cargo.is_refrigerated:
            multiplier *= 1.3  # 냉동 30% 할증

        if cargo.weight_kg > 10000:
            multiplier *= 0.9  # 대량 10% 할인

        return base_cost * multiplier
```

---

## Segregated Core

**Core Domain을 별도 모듈/패키지로 물리적 분리**.

```
분리 전:
src/
├── shipping/
│   ├── booking.py          # Supporting
│   ├── route_optimizer.py  # CORE
│   ├── billing.py          # Supporting
│   ├── cargo_allocator.py  # CORE
│   └── notification.py     # Generic

분리 후:
src/
├── core/                   # CORE DOMAIN (별도 패키지)
│   ├── __init__.py
│   ├── route_optimizer.py
│   ├── cargo_allocator.py
│   ├── voyage_planner.py
│   └── load_balancer.py
│
├── supporting/             # Supporting Subdomain
│   ├── booking/
│   └── billing/
│
└── generic/               # Generic Subdomain
    ├── auth/
    └── notification/
```

**의존성 규칙**:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  ┌───────────────────────────────────────────┐     │
│  │              CORE DOMAIN                  │     │
│  │                                           │     │
│  │  • 다른 모듈에 의존하지 않음               │     │
│  │  • 인터페이스만 정의                      │     │
│  │                                           │     │
│  └────────────────────┬──────────────────────┘     │
│                       │                             │
│                       │ implements                  │
│                       ▼                             │
│  ┌───────────────────────────────────────────┐     │
│  │           SUPPORTING / GENERIC            │     │
│  │                                           │     │
│  │  • Core의 인터페이스 구현                  │     │
│  │  • Core를 참조                            │     │
│  │                                           │     │
│  └───────────────────────────────────────────┘     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Python - Segregated Core**:

```python
# core/__init__.py
"""
════════════════════════════════════════════════════════
              SEGREGATED CORE DOMAIN
════════════════════════════════════════════════════════

이 패키지는 의존성이 없는 순수한 Core Domain입니다.

의존성 규칙:
- 이 패키지는 다른 패키지를 import하지 않습니다.
- 외부 서비스는 인터페이스로 정의하고, 구현은 외부에서 주입받습니다.
- 표준 라이브러리만 사용합니다.

════════════════════════════════════════════════════════
"""

# core/interfaces.py
"""Core Domain이 필요로 하는 외부 서비스 인터페이스"""

from abc import ABC, abstractmethod
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from .value_objects import Location, Money


class ScheduleService(ABC):
    """항해 일정 서비스 인터페이스"""

    @abstractmethod
    def get_voyages(
        self,
        origin: Location,
        destination: Location,
        after: datetime
    ) -> List["Voyage"]:
        pass


class PricingService(ABC):
    """운임 계산 서비스 인터페이스"""

    @abstractmethod
    def calculate_freight(
        self,
        voyage: "Voyage",
        cargo_spec: "CargoSpecification"
    ) -> Money:
        pass


class CapacityService(ABC):
    """선박 용량 서비스 인터페이스"""

    @abstractmethod
    def get_available_capacity(
        self,
        voyage: "Voyage"
    ) -> Decimal:
        pass


# core/route_optimizer.py
"""
[CORE DOMAIN] Route Optimizer

외부 의존성 없음 - 인터페이스만 사용
"""

from .interfaces import ScheduleService, PricingService, CapacityService
from .value_objects import Location, Route
from .entities import CargoSpecification


class RouteOptimizer:
    """
    [SEGREGATED CORE]
    순수한 Core Domain 로직

    모든 외부 서비스는 인터페이스로 주입받음
    """

    def __init__(
        self,
        schedule_service: ScheduleService,
        pricing_service: PricingService,
        capacity_service: CapacityService
    ):
        self._schedule = schedule_service
        self._pricing = pricing_service
        self._capacity = capacity_service

    def find_optimal_route(
        self,
        origin: Location,
        destination: Location,
        cargo: CargoSpecification
    ) -> Route:
        """최적 경로 탐색 - 순수 도메인 로직"""
        # 인터페이스를 통해 외부 데이터 조회
        voyages = self._schedule.get_voyages(origin, destination, cargo.ready_date)

        # 순수 도메인 로직
        candidates = []
        for voyage in voyages:
            capacity = self._capacity.get_available_capacity(voyage)
            if capacity >= cargo.total_volume:
                cost = self._pricing.calculate_freight(voyage, cargo)
                candidates.append((voyage, cost))

        # 최적 선택 (도메인 규칙)
        if not candidates:
            raise NoRouteFoundError(origin, destination)

        best_voyage, best_cost = min(candidates, key=lambda x: x[1].amount)
        return Route.single_leg(best_voyage, best_cost)


# supporting/booking/schedule_service_impl.py
"""
[SUPPORTING SUBDOMAIN]
Core Domain 인터페이스의 구현
"""

from core.interfaces import ScheduleService
from core.value_objects import Location
from infrastructure.database import VoyageRepository


class DatabaseScheduleService(ScheduleService):
    """
    ScheduleService의 데이터베이스 구현

    Core Domain은 이 구현을 모름 - 인터페이스만 알고 있음
    """

    def __init__(self, repository: VoyageRepository):
        self._repo = repository

    def get_voyages(
        self,
        origin: Location,
        destination: Location,
        after: datetime
    ) -> List["Voyage"]:
        return self._repo.find_voyages(
            origin_locode=origin.locode,
            destination_locode=destination.locode,
            departure_after=after
        )
```

---

## Abstract Core

**Core Domain의 가장 본질적인 개념만 추출**하여 추상화한다.

```
구체적 Core:
┌─────────────────────────────────────────┐
│  RouteOptimizer                         │
│  ├── find_optimal_route()               │
│  ├── _generate_candidates()             │
│  ├── _apply_constraints()               │
│  ├── _calculate_costs()                 │
│  └── ... (많은 구현 세부사항)            │
└─────────────────────────────────────────┘

Abstract Core:
┌─────────────────────────────────────────┐
│  OptimizationPolicy (추상)              │
│  ├── optimize(candidates) → best        │
│  └── score(candidate) → score           │
│                                         │
│  Constraint (추상)                       │
│  └── is_satisfied(candidate) → bool     │
│                                         │
│  → 본질적 개념만 남김                    │
└─────────────────────────────────────────┘
```

**Python - Abstract Core**:

```python
# core/abstract/__init__.py
"""
════════════════════════════════════════════════════════
                   ABSTRACT CORE
════════════════════════════════════════════════════════

Core Domain의 가장 본질적인 추상화.
구체적 구현 없이 핵심 개념만 정의.

════════════════════════════════════════════════════════
"""

from abc import ABC, abstractmethod
from typing import TypeVar, Generic, List, Callable
from dataclasses import dataclass


T = TypeVar('T')  # Candidate type
S = TypeVar('S')  # Score type


class Constraint(ABC, Generic[T]):
    """
    [ABSTRACT CORE]
    제약 조건 - 후보가 유효한지 판단
    """

    @abstractmethod
    def is_satisfied(self, candidate: T) -> bool:
        pass

    @property
    @abstractmethod
    def name(self) -> str:
        pass


class OptimizationPolicy(ABC, Generic[T, S]):
    """
    [ABSTRACT CORE]
    최적화 정책 - 최적의 후보를 선택하는 방법
    """

    @abstractmethod
    def score(self, candidate: T) -> S:
        """후보 점수 계산"""
        pass

    @abstractmethod
    def compare(self, score1: S, score2: S) -> int:
        """점수 비교: -1 (score1 better), 0 (equal), 1 (score2 better)"""
        pass

    def select_best(self, candidates: List[T]) -> T:
        """최적 후보 선택 - 기본 구현"""
        if not candidates:
            raise ValueError("No candidates")

        best = candidates[0]
        best_score = self.score(best)

        for candidate in candidates[1:]:
            candidate_score = self.score(candidate)
            if self.compare(best_score, candidate_score) > 0:
                best = candidate
                best_score = candidate_score

        return best


@dataclass
class OptimizationResult(Generic[T, S]):
    """최적화 결과"""
    selected: T
    score: S
    considered_count: int
    filtered_count: int


class Optimizer(Generic[T, S]):
    """
    [ABSTRACT CORE]
    제약 조건과 최적화 정책을 조합하는 최적화기
    """

    def __init__(
        self,
        constraints: List[Constraint[T]],
        policy: OptimizationPolicy[T, S]
    ):
        self._constraints = constraints
        self._policy = policy

    def optimize(self, candidates: List[T]) -> OptimizationResult[T, S]:
        """
        제약 조건 필터링 후 최적 선택

        1. 모든 제약 조건 통과하는 후보만 필터링
        2. 정책에 따라 최적 선택
        """
        # 제약 조건 필터링
        valid = [
            c for c in candidates
            if all(constraint.is_satisfied(c) for constraint in self._constraints)
        ]

        if not valid:
            raise NoValidCandidateError(
                f"No candidates satisfy all constraints: "
                f"{[c.name for c in self._constraints]}"
            )

        # 최적 선택
        best = self._policy.select_best(valid)

        return OptimizationResult(
            selected=best,
            score=self._policy.score(best),
            considered_count=len(candidates),
            filtered_count=len(candidates) - len(valid)
        )


# core/route/optimizer.py
"""
Abstract Core를 사용한 경로 최적화 구현
"""

from ..abstract import Constraint, OptimizationPolicy, Optimizer
from .entities import Route
from .value_objects import Money


# 구체적 제약 조건
class DeadlineConstraint(Constraint[Route]):
    """배송 기한 제약"""

    def __init__(self, deadline: datetime):
        self._deadline = deadline

    @property
    def name(self) -> str:
        return f"Deadline({self._deadline})"

    def is_satisfied(self, route: Route) -> bool:
        return route.estimated_arrival <= self._deadline


class CapacityConstraint(Constraint[Route]):
    """용량 제약"""

    def __init__(self, required_capacity: Decimal):
        self._required = required_capacity

    @property
    def name(self) -> str:
        return f"Capacity({self._required})"

    def is_satisfied(self, route: Route) -> bool:
        return route.available_capacity >= self._required


# 구체적 최적화 정책
class MinCostPolicy(OptimizationPolicy[Route, Money]):
    """최소 비용 정책"""

    def score(self, route: Route) -> Money:
        return route.total_cost

    def compare(self, cost1: Money, cost2: Money) -> int:
        if cost1.amount < cost2.amount:
            return -1
        elif cost1.amount > cost2.amount:
            return 1
        return 0


class BalancedPolicy(OptimizationPolicy[Route, float]):
    """비용과 시간 균형 정책"""

    def __init__(self, cost_weight: float = 0.6, time_weight: float = 0.4):
        self._cost_weight = cost_weight
        self._time_weight = time_weight

    def score(self, route: Route) -> float:
        # 정규화된 점수 (낮을수록 좋음)
        cost_score = float(route.total_cost.amount) / 10000  # 정규화
        time_score = route.transit_days / 30  # 정규화

        return (
            self._cost_weight * cost_score +
            self._time_weight * time_score
        )

    def compare(self, score1: float, score2: float) -> int:
        if score1 < score2:
            return -1
        elif score1 > score2:
            return 1
        return 0


# 사용 예시
class RouteOptimizer:
    """Abstract Core를 활용한 경로 최적화기"""

    def find_optimal_route(
        self,
        candidates: List[Route],
        cargo: CargoSpecification,
        policy_type: str = "min_cost"
    ) -> Route:
        # 제약 조건 구성
        constraints: List[Constraint[Route]] = [
            CapacityConstraint(cargo.total_volume)
        ]

        if cargo.delivery_deadline:
            constraints.append(DeadlineConstraint(cargo.delivery_deadline))

        # 정책 선택
        if policy_type == "min_cost":
            policy = MinCostPolicy()
        elif policy_type == "balanced":
            policy = BalancedPolicy()
        else:
            raise ValueError(f"Unknown policy: {policy_type}")

        # Abstract Core 사용
        optimizer = Optimizer(constraints, policy)
        result = optimizer.optimize(candidates)

        return result.selected
```

---

## 증류의 효과

```
┌─────────────────────────────────────────────────────────┐
│                    증류의 효과                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. 집중 (Focus)                                        │
│     → 핵심에 최고의 인재와 자원 투입                     │
│     → Supporting/Generic은 효율적으로 처리               │
│                                                         │
│  2. 의사소통 (Communication)                            │
│     → "Core Domain이 뭐지?" 질문에 명확한 답              │
│     → 팀 간 우선순위 합의                                │
│                                                         │
│  3. 구매 vs 구축 결정                                    │
│     → Generic: 구매하라                                  │
│     → Core: 직접 구축하라 (차별화)                       │
│                                                         │
│  4. 코드 품질 차등화                                     │
│     → Core: 최고 수준의 설계, 테스트, 리뷰               │
│     → Supporting: 적정 수준                              │
│     → Generic: 단순하게                                  │
│                                                         │
│  5. 진화 방향                                           │
│     → Core가 확장되면 비즈니스 성장                      │
│     → Generic에 투자하면 낭비                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 핵심 정리

```
┌─────────────────────────────────────────────────────────┐
│                  Distillation 요약                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  도메인 분류:                                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                │
│  │  CORE   │  │SUPPORTING│  │ GENERIC │                │
│  │ 차별화  │  │  지원    │  │ 범용    │                │
│  │ 직접구축│  │  간단히  │  │ 구매    │                │
│  └─────────┘  └─────────┘  └─────────┘                │
│                                                         │
│  증류 기법:                                             │
│  • Domain Vision Statement - 비전 문서                  │
│  • Highlighted Core - 코드/문서에서 강조                │
│  • Cohesive Mechanisms - 메커니즘 분리                  │
│  • Segregated Core - 물리적 분리                        │
│  • Abstract Core - 본질 추상화                          │
│                                                         │
│  핵심 질문:                                             │
│  "이것이 우리를 경쟁사와 다르게 만드는가?"               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

다음 장에서는 **대규모 시스템을 위한 Large-Scale Structure**를 다룬다.
