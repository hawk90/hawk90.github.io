---
title: "GoF 0: 23 패턴을 이해하는 6개의 멘탈 모델"
date: 2026-05-01T00:00:00
description: "GoF가 어려운 이유와 그것을 풀어줄 6개의 멘탈 모델. 일상 비유, 결정 트리, 흔한 혼동까지."
tags: [Design Pattern, GoF, Mental Model, Overview]
series: "GoF Design Patterns"
seriesOrder: 0
draft: false
---

## 왜 GoF가 어렵게 느껴지는가

23개의 패턴 이름을 외워도 *실제 코드에서 떠오르지 않는* 경험이 흔합니다. 원인은 보통 셋입니다.

1. **이름이 추상적입니다.** "Abstract Factory"와 "Factory Method"가 무엇이 다른지 이름만으로는 알 수 없습니다. "Bridge"는 무엇과 무엇을 잇는지 모호합니다.
2. **UML 다이어그램이 본질을 가립니다.** 화살표와 박스 너머의 *왜*가 잘 안 보입니다. 같은 다이어그램에서 *어디서 변화가 일어나는가*가 패턴을 가르는데, 그림만으로는 그 차이가 안 드러납니다.
3. **개별 학습이 함정입니다.** 23개를 하나씩 외우면 *비교*가 안 됩니다. Strategy와 State는 같은 그림이지만 의도가 다르고, Decorator와 Proxy는 같은 형태지만 책임이 다릅니다.

이 글은 이 세 문제를 한 번에 해소합니다. 23개를 **6개의 멘탈 모델**로 묶고, 각 패턴에 **일상 비유**를 붙이고, **결정 트리**로 선택을 안내합니다.

## 6개의 멘탈 모델

### 모델 1 — "어떻게 만들까" (Creational)

객체 *생성의 결정권*을 누구에게 줄지가 핵심입니다.

| 패턴 | 결정권 | 비유 |
| --- | --- | --- |
| **Singleton** | 클래스 자신이 *유일성* 보장 | 회사의 *CEO* — 한 명만 존재 |
| **Factory Method** | *서브클래스*가 어떤 타입 생성 결정 | *피자 가게 본사 vs 지점* — 본사는 절차, 지점이 토핑 결정 |
| **Abstract Factory** | *팩토리 객체*가 같은 군의 부품 일관성 보장 | *IKEA 가구 시리즈* — 같은 디자인의 식탁·의자·서랍 한 세트 |
| **Builder** | *Builder 객체*가 단계별 조립 | *서브웨이 샌드위치* — 빵·고기·야채·소스 순서대로 |
| **Prototype** | *기존 인스턴스*가 자신의 복제본 제공 | *치즈 발효 종균* — 한 덩이에서 다음 덩이로 |

핵심 통찰: 모든 Creational 패턴은 *"new 키워드를 직접 부르지 마라"*에서 출발합니다. 누가 대신 부를지가 다를 뿐입니다.

### 모델 2 — "어떻게 합칠까" (Structural)

여러 객체를 *조합*해서 새 기능을 만드는 방법입니다.

| 패턴 | 무엇을 합치나 | 비유 |
| --- | --- | --- |
| **Adapter** | *다른 인터페이스* 두 개를 연결 | *돼지코 어댑터* — 220V 콘센트에 110V 플러그 |
| **Bridge** | *추상*과 *구현*을 분리해 독립 진화 | *리모컨 vs TV* — 리모컨 종류와 TV 종류가 따로 늘어남 |
| **Composite** | *단일*과 *복합*을 같은 인터페이스로 | *폴더 vs 파일* — 폴더 안에 파일도, 폴더도 |
| **Decorator** | 객체에 *책임을 동적으로 적층* | *커피 + 시럽 + 휘핑 + 휘핑* — 주문할 때마다 추가 |
| **Facade** | 복잡한 서브시스템에 *단순한 창구* | *호텔 컨시어지* — 손님이 부서마다 안 찾아도 됨 |
| **Flyweight** | 공유 가능한 부분을 *떼어내 절약* | *알파벳 폰트 글리프* — 'a' 하나만 메모리에 |
| **Proxy** | *동일 인터페이스의 대리인* | *비서* — 사장 일정을 대신 받음 |

핵심 통찰: Structural 패턴은 *"누가 누구를 감싸고 있는가"*를 결정합니다. 감싸는 *목적*(변환·분리·적층·대리)이 패턴 이름이 됩니다.

### 모델 3 — "누가 결정하는가" (Behavioral - 책임 분배)

객체들 사이에서 *결정 권한*을 어떻게 나눌지입니다.

| 패턴 | 누가 결정 | 비유 |
| --- | --- | --- |
| **Chain of Responsibility** | *체인의 누군가*가 — 처음 받는 사람이 처리하거나 다음에게 |  *민원 처리* — 동사무소 → 구청 → 시청 |
| **Command** | *요청 자체*를 객체로 만들어 나중에 결정 | *식당 주문서* — 주방이 나중에 처리, 취소 가능 |
| **Mediator** | *중재자*가 모든 협력 조율 | *공항 관제탑* — 항공기들끼리 직접 대화 안 함 |
| **Strategy** | *외부에서* 알고리즘 객체 주입 | *내비게이션 모드* — 최단/최단시간/도보 |
| **State** | *내부 상태*가 스스로 다음 상태 결정 | *신호등* — 빨강은 자기 다음이 초록임을 안다 |
| **Template Method** | *부모가 골격*, *자식이 빈칸* | *시험지 양식* — 머리말 고정, 답안만 학생이 |

핵심 통찰: 누가 결정권을 가지느냐가 *결합도*를 결정합니다. 외부 결정(Strategy)일수록 *유연*, 내부 결정(State)일수록 *자율*입니다.

### 모델 4 — "어떻게 흘려보낼까" (Behavioral - 데이터·통지 흐름)

상태와 사건이 어떻게 전달되는지입니다.

| 패턴 | 흐름 방향 | 비유 |
| --- | --- | --- |
| **Iterator** | 컬렉션 → 클라이언트로 *원소를 하나씩* | *영화관 좌석 안내* — 다음, 다음, 다음 |
| **Observer** | 주체 → 모든 관찰자에게 *변경 통지* | *신문 구독* — 발행 즉시 구독자 전원에게 |
| **Memento** | 객체 → 외부 보관소로 *상태 snapshot* | *게임 세이브 파일* — 나중에 불러오기 |
| **Visitor** | 새 연산이 → 객체 구조를 *순회하며 작업* | *전기 검침원* — 집집마다 방문해 미터기 읽기 |

핵심 통찰: *데이터*가 흐르는가, *알림*이 흐르는가, *연산자*가 흐르는가에 따라 패턴이 갈립니다.

### 모델 5 — "특수 목적"

흔한 도메인 문제 두 개입니다.

| 패턴 | 풀려는 문제 | 비유 |
| --- | --- | --- |
| **Interpreter** | *작은 언어*를 표현하고 평가 | *전자계산기 수식 파서* — `1+2*3`을 트리로 |

이 패턴은 단독으로 거의 안 쓰입니다. 보통 *DSL*이나 *규칙 엔진*에서만 등장합니다.

### 모델 6 — "패턴이 아닌 듯한 패턴"

특정 상황에서만 의미를 가지는 패턴들입니다.

| 패턴 | 의미 |
| --- | --- |
| **Singleton** | *언어/플랫폼에 따라 trivial*. 대부분 안티패턴으로 분류됩니다. |
| **Template Method** | *상속의 기본*. OOP를 안다면 이미 쓰고 있습니다. |
| **Iterator** | *언어에 흡수됨* (Python `for`, C++ range-for, Rust `Iterator`). |

이 패턴들은 *학습 가치보다 인식 가치*가 큽니다. 코드에서 보면 *알아채는* 정도면 충분합니다.

## 패턴 선택 결정 트리

"이 문제에 어떤 패턴이 어울릴까"가 막막할 때 사용합니다.

### 객체를 만들고 싶다

```text
객체 생성을 어떻게 하지?
├─ 유일성 보장이 필요한가?
│   └─ Yes → Singleton (단, 신중)
├─ 같은 군의 객체들을 함께 만들고 싶은가?
│   └─ Yes → Abstract Factory
├─ 단계별로 복잡하게 조립하는가?
│   └─ Yes → Builder
├─ 기존 객체를 복제하면 되는가?
│   └─ Yes → Prototype
└─ 그 외 → Factory Method (또는 직접 new)
```

### 객체를 합치고 싶다

```text
객체를 어떻게 합치지?
├─ 인터페이스가 안 맞아서 호환만 필요?
│   └─ Yes → Adapter
├─ 추상과 구현을 따로 늘리고 싶은가?
│   └─ Yes → Bridge
├─ 트리 구조가 필요한가?
│   └─ Yes → Composite
├─ 기능을 런타임에 추가하고 싶은가?
│   └─ Yes → Decorator
├─ 복잡한 시스템에 단순 진입점만?
│   └─ Yes → Facade
├─ 같은 작은 객체가 수만 개?
│   └─ Yes → Flyweight
└─ 다른 객체에 접근을 통제하고 싶은가?
    └─ Yes → Proxy
```

### 객체들이 협력하게 하고 싶다

```text
어떻게 협력시키지?
├─ 알고리즘을 바꿔 끼우고 싶은가?
│   └─ Yes → Strategy
├─ 상태에 따라 동작이 달라지는가?
│   └─ Yes → State
├─ 알고리즘 골격은 같고 일부만 다른가?
│   └─ Yes → Template Method
├─ 요청을 객체로 만들어야 하는가? (undo, 큐, 매크로)
│   └─ Yes → Command
├─ 처리자가 여럿이고 누가 처리할지 모르는가?
│   └─ Yes → Chain of Responsibility
├─ 객체들이 서로 너무 많이 알고 있는가?
│   └─ Yes → Mediator
├─ 상태 변화를 여러 곳에 알려야 하는가?
│   └─ Yes → Observer
├─ 상태 snapshot이 필요한가? (undo, save)
│   └─ Yes → Memento
├─ 컬렉션을 순회해야 하는가?
│   └─ Yes → Iterator
├─ 객체 구조에 새 연산을 자주 추가하는가?
│   └─ Yes → Visitor
└─ 작은 언어를 평가해야 하는가?
    └─ Yes → Interpreter
```

## 흔한 혼동 — 같은 그림, 다른 의도

GoF에서 가장 어려운 부분은 *비슷한 패턴들의 차이*입니다. UML이 거의 같아 보이는 패턴이 많습니다.

### Strategy vs State

```text
같은 그림: Context → IStrategy (또는 IState) ← 여러 구현체

다른 의도:
- Strategy: 외부에서 "이 알고리즘으로 바꿔" (정렬·할인·압축)
- State:    내부에서 "다음은 이 상태야"   (신호등·주문 상태·연결 상태)

판별: 전이 규칙이 객체 안에 있으면 State, 밖에서 주입하면 Strategy.
```

### Adapter vs Decorator vs Proxy

```text
모두 객체를 감쌉니다(wrap). 차이는 *왜* 감싸는가.

- Adapter:   기존 인터페이스를 *다른 모양*으로 변환 (USB-C → USB-A)
- Decorator: 기존 인터페이스 *그대로 + 기능 추가* (커피 + 시럽)
- Proxy:     기존 인터페이스 *그대로 + 접근 제어* (비서, 캐시, lazy load)

판별:
- 인터페이스가 바뀌면 Adapter.
- 인터페이스가 같고 새 기능이 추가되면 Decorator.
- 인터페이스가 같고 호출을 통제하면 Proxy.
```

### Decorator vs Composite

```text
구조가 비슷합니다. 둘 다 Component를 *상속·포함*합니다.

- Decorator: 한 객체를 감싸 *책임 적층* (선형 wrapping)
- Composite: 여러 자식을 묶어 *부분-전체 트리* (재귀 구조)

판별:
- "이게 또 다른 것을 감싸나?" → Decorator
- "이게 여러 개를 포함하나?" → Composite
```

### Factory Method vs Abstract Factory vs Builder

```text
모두 생성을 위임합니다.

- Factory Method:  서브클래스가 *한 종류*의 객체 결정
- Abstract Factory: 한 팩토리가 *여러 종류*의 객체 일관성 유지
- Builder:         *복잡한 단일 객체*를 단계적으로 조립

판별:
- 단일 객체 단계 조립 → Builder
- 여러 종류의 객체 군 → Abstract Factory
- 한 종류의 객체 + 서브클래스 결정 → Factory Method
```

### Mediator vs Observer vs Facade

```text
모두 객체 간 결합을 줄입니다.

- Facade:    클라이언트 → 서브시스템 (단방향 단순화)
- Mediator:  여러 객체끼리 중재자 거쳐 협력 (다대다 → 별 모양)
- Observer:  주체 → 관찰자들에게 알림 (느슨한 pub/sub)

판별:
- 외부 클라이언트를 위한 진입점 → Facade
- 내부 객체들 사이의 양방향 조율 → Mediator
- 상태 변경의 단방향 통지 → Observer
```

### Command vs Strategy

```text
둘 다 동작을 객체화합니다.

- Strategy: *알고리즘*을 캡슐화 (정렬·압축의 *방법*)
- Command:  *요청*을 캡슐화 (수행할 *작업 자체*)

판별:
- "어떻게 할까"를 객체로 → Strategy
- "무엇을 할까"를 객체로 → Command (undo·queue·매크로 필요)
```

### Bridge vs Adapter

```text
둘 다 두 개를 분리합니다.

- Bridge:  *시작 시점*에 추상-구현을 분리해 *둘 다 따로 진화*
- Adapter: *사후*에 호환되지 않는 두 인터페이스를 *임시 결합*

판별:
- 처음부터 설계 의도 → Bridge
- 기존 코드 통합 → Adapter
```

### Template Method vs Strategy

```text
둘 다 가변 단계를 표현합니다.

- Template Method: *상속* + 부모가 골격, 자식이 빈칸
- Strategy:        *합성* + 외부 객체가 알고리즘

판별:
- 컴파일 시점 고정 → Template Method
- 런타임 교체 가능 → Strategy
```

## 학습 순서 — 처음 GoF를 만난다면

23개를 순서대로 읽지 마세요. **친숙도와 의존도** 기준으로:

```text
1단계 — 매일 마주치는 패턴 (이미 쓰고 있을 가능성)
  Singleton, Factory Method, Iterator, Observer, Strategy, Template Method

2단계 — 한 번에 직관적
  Adapter, Decorator, Composite, Facade, Command

3단계 — 조금 깊은 이해 필요
  State, Chain of Responsibility, Proxy, Memento

4단계 — 본격적 생성·구조
  Abstract Factory, Builder, Prototype, Bridge, Flyweight

5단계 — 고급 행위
  Mediator, Visitor, Interpreter
```

## Modern 언어에서는 사라지는 패턴들

언어 기능이 발전하면서 *패턴 자체가 단순화*되거나 *언어에 흡수*됩니다.

| 전통 패턴 | 현대 언어의 표현 |
| --- | --- |
| Iterator | Python `for`, C++ range-for, Rust `Iterator` |
| Strategy | first-class function, lambda |
| Command | closure, `std::function` |
| Observer | reactive stream (RxJS, Combine, Signal) |
| Singleton | module-level (Python), `static` block (Java) |
| Visitor | `std::variant` + `std::visit`, Rust enum + match |
| State | sum type (Rust `enum`, Kotlin sealed class) |
| Prototype | structured clone, `__deepcopy__` |
| Factory | `std::make_unique`, `Object.create` |

패턴이 *사라지지는 않습니다*. 다만 *키워드 한두 개로* 표현됩니다. 그래도 *왜* 그 키워드가 필요한지 알면 더 자연스럽게 씁니다.

## 정리

GoF가 어려운 진짜 이유는 *각 패턴의 정의*가 아니라 *비슷한 것들과의 구별*입니다. 6개의 멘탈 모델로 묶고, 일상 비유로 외피를 입히고, 흔한 혼동을 미리 정리해두면 23개가 한꺼번에 떠오릅니다.

이 글의 사용법:

- 새 패턴을 처음 만났다면 → *비유*를 먼저 외웁니다.
- 코드 작성 중 패턴이 필요하다면 → *결정 트리*를 따라갑니다.
- 두 패턴 중 고민된다면 → *흔한 혼동* 표를 확인합니다.
- 전체 그림이 흐려졌다면 → *6개 모델*로 다시 묶어봅니다.

## 다음 읽을 글

- [GoF 24: 23 패턴 전체 관계도 + Atlas](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview) — 패턴 사이의 *관계*를 다이어그램으로
- 카테고리별 시작:
  - [Item 1: Abstract Factory](/blog/programming/design/gof-design-patterns/item01-abstract-factory) (Creational)
  - [Item 6: Adapter](/blog/programming/design/gof-design-patterns/item06-adapter) (Structural)
  - [Item 13: Chain of Responsibility](/blog/programming/design/gof-design-patterns/item13-chain-of-responsibility) (Behavioral)
