---
title: "GoF: 23 패턴 전체 — 관계도 + Atlas"
date: 2026-05-01T00:00:00
description: "GoF 23 패턴의 관계 다이어그램과 각 패턴의 한눈 atlas. 책 원본 스타일."
tags: [Design Pattern, GoF, Overview, Atlas]
series: "GoF Design Patterns"
seriesOrder: 24
draft: false
---

## 왜 마지막 글에 관계도가 필요한가

23 패턴을 *개별*로만 보면 *세는 데*는 좋지만 *고르는 데*는 부족합니다. 같은 문제처럼 보이는데 답이 다른 패턴이 흔하고, 한 패턴이 다른 패턴 *안*에서 작동하는 경우도 많습니다.

이 글은 두 가지 시각 자료로 그 관계를 정리합니다.

- **관계도** — 어떤 패턴이 어떤 패턴을 *사용·구성·대체*하는가
- **Atlas** — 23 패턴 각각의 *구조 한 컷*과 *한 줄 의도*

## 23 패턴 관계도

GoF 책의 1장에 실린 *Design Pattern Relationships* 다이어그램을 블로그 톤으로 재구성. **Composite**가 가운데에 있는 것은 우연이 아닙니다. *부분-전체* 구조는 거의 모든 행위·구조 패턴이 *대상으로 삼는* 형태입니다.

![GoF 23 패턴 관계도](/images/blog/gof/relationships.svg)

*화살표는 "→ uses / composes"이고, 양방향 화살표는 "↔ similar / alternative"입니다.*

## 관계의 다섯 갈래

위 그림이 한 번에 다 들어오지 않는다면 다섯 갈래로 끊어 보세요.

### 1. **Composite를 둘러싼 행위·구조 패턴**

`Composite`가 *트리*를 만들면, 다른 패턴들이 그 트리 위에서 무언가를 합니다.

| 패턴 | Composite와 관계 |
| --- | --- |
| **Iterator** | 트리를 *순회* (`enumerating children`) |
| **Visitor** | 트리에 *새 연산 추가* (`adding operations`) |
| **Command** | Composite 자체가 *명령의 묶음* (`composed using`) |
| **Chain of Responsibility** | Composite의 *계층*이 곧 chain (`defining the chain`) |
| **Decorator** | Composite에 *책임 추가* (`adding responsibilities to objects`) |
| **Flyweight** | Composite의 leaf를 *공유* (`sharing composites`) |
| **Interpreter** | Composite로 *AST 구성* (`defining grammar`) |
| **Builder** | Composite를 *조립* (`creating composites`) |

→ Composite는 *데이터 구조의 허브*, 다른 패턴은 그 위의 *동작·생성·변환*.

### 2. **Flyweight를 둘러싼 공유 패턴**

`Flyweight`는 *공유 가능한 부분*을 떼어내는 패턴. 떼어낸 게 *상태(State)*, *전략(Strategy)*, *기호(Interpreter terminal)*면 자연스럽게 결합됩니다.

- Flyweight → **Strategy** — `sharing strategies` (stateless 전략 1개로 다수 객체 처리)
- Flyweight → **State** — `sharing states` (상태 객체를 공유)
- Flyweight → **Interpreter** — `sharing terminal symbols` (반복되는 토큰 공유)

→ "같은 객체가 *N번 등장*하는데 *내용은 같다*"면 Flyweight를 의심.

### 3. **알고리즘·요청 흐름 패턴들의 사슬**

```
Strategy ─ defining algorithm's steps ─→ Template Method
             └─ often uses ─────────────────→ Factory Method ←─ implement using ─ Abstract Factory
```

- **Strategy**가 *런타임 알고리즘 선택*이면, **Template Method**는 *컴파일 시점에 단계만 변경*.
- **Template Method**의 단계 구현이 *서브클래스에 객체 생성을 떠넘기는* 패턴 → **Factory Method**.
- **Factory Method**가 *여러 종류의 객체*를 만들면 → **Abstract Factory**.

→ 추상 → 구현으로 갈수록 *결정권*이 derived class · 외부 객체에 이동.

### 4. **상태·기록 패턴들**

- **Iterator → Memento** — iterator의 위치를 *snapshot*으로 저장 (saving state of iteration)
- **Command → Memento** — undo를 위해 *직전 상태*를 stash (avoiding hysteresis)

→ "이전으로 되돌리기"가 필요하면 Memento. 누가 *기록을 들고 있는지*에 따라 Iterator(자기 자신) 또는 Command(요청자) 결합.

### 5. **단일 인스턴스로 충분한 패턴들**

```
Abstract Factory ─→ Singleton (single instance)
Facade           ─→ Singleton (single instance)
```

`Singleton`은 *결합되는 쪽*. Abstract Factory와 Facade는 보통 *상태가 없거나 유일성이 자연스러워서* Singleton으로 구현됩니다.

→ 단, *Singleton 자체는 신중* — Ch 5 참조.

### 6. **양방향 — 비슷한데 다른 패턴들**

| 양방향 관계 | 무엇이 다른가 |
| --- | --- |
| Decorator ↔ Strategy | *changing skin* (외형 변화 = Decorator) vs *changing guts* (내부 알고리즘 = Strategy) |
| Mediator ↔ Observer | Mediator는 *중앙에서 명시적 협력*, Observer는 *느슨한 pub/sub* |

→ 같은 도식인데 *어디서 변화가 일어나는가*가 패턴을 가른다.

## 고립된 세 패턴 — Proxy, Adapter, Bridge

GoF 책 원본 관계도에서 *오른쪽 위 모서리*에 따로 떨어져 있는 세 패턴. 다른 패턴과의 *명시적 결합이 적은* 패턴들입니다.

- **Adapter** — *사후* 인터페이스 변환. 보통 *legacy 코드 통합*에 단발성으로 쓰임.
- **Bridge** — *사전* 추상-구현 분리. 시스템 *초기 설계 결정*.
- **Proxy** — *동일 인터페이스의 대리*. virtual / remote / protection 등 *특수 목적*에 단발성.

→ 셋 다 *wrapping*이지만 *의도가 완전히 다름*. Adapter는 *호환*, Bridge는 *분리*, Proxy는 *대리*.

## Atlas — 23 패턴 한눈 카탈로그

각 패턴의 *구조 한 컷*과 *한 줄 의도*. GoF 책의 1장 마지막 *Pattern Catalog* 인덱스를 블로그 톤으로 재구성.

색은 카테고리:
- <span style="background:#f9dede;color:#a82d2d;padding:2px 6px;border-radius:3px;font-size:0.85em">**Creational**</span>
- <span style="background:#dce8f7;color:#345e8e;padding:2px 6px;border-radius:3px;font-size:0.85em">**Structural**</span>
- <span style="background:#dfeede;color:#638e57;padding:2px 6px;border-radius:3px;font-size:0.85em">**Behavioral**</span>

<style>
.gof-atlas {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  margin: 16px 0;
}
.gof-card {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px;
  background: #fafafa;
  transition: box-shadow 0.15s;
}
.gof-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.gof-card.cre { border-left: 4px solid #c55d5d; }
.gof-card.str { border-left: 4px solid #4876b6; }
.gof-card.beh { border-left: 4px solid #639a5d; }
.gof-card h3 {
  margin: 0 0 6px 0;
  font-size: 0.95em;
}
.gof-card h3 a {
  text-decoration: none;
  color: inherit;
}
.gof-card h3 a:hover {
  text-decoration: underline;
}
.gof-card .intent {
  font-size: 0.82em;
  color: #555;
  margin: 0 0 8px 0;
  line-height: 1.35;
}
.gof-card img {
  width: 100%;
  background: white;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 4px;
  box-sizing: border-box;
}
@media (prefers-color-scheme: dark) {
  .gof-card { background: #2a2a2a; border-color: #444; }
  .gof-card .intent { color: #bbb; }
  .gof-card img { background: #f5f5f5; }
}
</style>

### Creational — 5 patterns

<div class="gof-atlas">

<div class="gof-card cre">
<h3>1. <a href="/blog/programming/design/gof-design-patterns/item01-abstract-factory">Abstract Factory</a></h3>
<p class="intent">관련된 객체 군을 한 번에 — 클라이언트는 어떤 OS·테마인지 알 필요가 없다.</p>
<img src="/images/blog/gof/diagrams/item01-abstract-factory.svg" alt="Abstract Factory 구조" />
</div>

<div class="gof-card cre">
<h3>2. <a href="/blog/programming/design/gof-design-patterns/item02-builder">Builder</a></h3>
<p class="intent">복잡한 객체를 단계별 조립 — 같은 과정으로 다른 결과.</p>
<img src="/images/blog/gof/diagrams/item02-builder.svg" alt="Builder 구조" />
</div>

<div class="gof-card cre">
<h3>3. <a href="/blog/programming/design/gof-design-patterns/item03-factory-method">Factory Method</a></h3>
<p class="intent">객체 생성을 서브클래스에 — 어떤 타입을 만들지 derived가 결정.</p>
<img src="/images/blog/gof/diagrams/item03-factory-method.svg" alt="Factory Method 구조" />
</div>

<div class="gof-card cre">
<h3>4. <a href="/blog/programming/design/gof-design-patterns/item04-prototype">Prototype</a></h3>
<p class="intent">기존 객체를 복제 — 비싼 생성을 한 번만 하고 나머지는 clone.</p>
<img src="/images/blog/gof/diagrams/item04-prototype.svg" alt="Prototype 구조" />
</div>

<div class="gof-card cre">
<h3>5. <a href="/blog/programming/design/gof-design-patterns/item05-singleton">Singleton</a></h3>
<p class="intent">유일한 인스턴스 보장 — 그러나 신중히. 많은 경우 안티패턴.</p>
<img src="/images/blog/gof/diagrams/item05-singleton.svg" alt="Singleton 구조" />
</div>

</div>

### Structural — 7 patterns

<div class="gof-atlas">

<div class="gof-card str">
<h3>6. <a href="/blog/programming/design/gof-design-patterns/item06-adapter">Adapter</a></h3>
<p class="intent">호환되지 않는 인터페이스를 클라이언트가 기대하는 형태로 변환.</p>
<img src="/images/blog/gof/diagrams/item06-adapter.svg" alt="Adapter 구조" />
</div>

<div class="gof-card str">
<h3>7. <a href="/blog/programming/design/gof-design-patterns/item07-bridge">Bridge</a></h3>
<p class="intent">추상과 구현을 분리 — N×M 클래스 폭발을 N+M으로.</p>
<img src="/images/blog/gof/diagrams/item07-bridge.svg" alt="Bridge 구조" />
</div>

<div class="gof-card str">
<h3>8. <a href="/blog/programming/design/gof-design-patterns/item08-composite">Composite</a></h3>
<p class="intent">객체를 트리로 구성 — 단일과 복합을 같은 인터페이스로.</p>
<img src="/images/blog/gof/diagrams/item08-composite.svg" alt="Composite 구조" />
</div>

<div class="gof-card str">
<h3>9. <a href="/blog/programming/design/gof-design-patterns/item09-decorator">Decorator</a></h3>
<p class="intent">객체에 책임을 동적으로 추가 — 상속의 유연한 대안.</p>
<img src="/images/blog/gof/diagrams/item09-decorator.svg" alt="Decorator 구조" />
</div>

<div class="gof-card str">
<h3>10. <a href="/blog/programming/design/gof-design-patterns/item10-facade">Facade</a></h3>
<p class="intent">복잡한 서브시스템에 단순한 진입점 — 비대해지지 않게 주의.</p>
<img src="/images/blog/gof/diagrams/item10-facade.svg" alt="Facade 구조" />
</div>

<div class="gof-card str">
<h3>11. <a href="/blog/programming/design/gof-design-patterns/item11-flyweight">Flyweight</a></h3>
<p class="intent">공유 가능한 부분을 분리해 메모리 절약 — 객체가 너무 많을 때.</p>
<img src="/images/blog/gof/diagrams/item11-flyweight.svg" alt="Flyweight 구조" />
</div>

<div class="gof-card str">
<h3>12. <a href="/blog/programming/design/gof-design-patterns/item12-proxy">Proxy</a></h3>
<p class="intent">다른 객체에 대한 대리·접근 제어 — virtual·remote·protection·smart proxy.</p>
<img src="/images/blog/gof/diagrams/item12-proxy.svg" alt="Proxy 구조" />
</div>

</div>

### Behavioral — 11 patterns

<div class="gof-atlas">

<div class="gof-card beh">
<h3>13. <a href="/blog/programming/design/gof-design-patterns/item13-chain-of-responsibility">Chain of Responsibility</a></h3>
<p class="intent">처리자 후보들을 체인으로 — 누가 처리할지는 자동으로 결정.</p>
<img src="/images/blog/gof/diagrams/item13-chain-of-responsibility.svg" alt="Chain of Responsibility 구조" />
</div>

<div class="gof-card beh">
<h3>14. <a href="/blog/programming/design/gof-design-patterns/item14-command">Command</a></h3>
<p class="intent">요청을 객체로 — undo/redo, 큐, 매크로, 로깅이 가능해진다.</p>
<img src="/images/blog/gof/diagrams/item14-command.svg" alt="Command 구조" />
</div>

<div class="gof-card beh">
<h3>15. <a href="/blog/programming/design/gof-design-patterns/item15-interpreter">Interpreter</a></h3>
<p class="intent">단순한 언어의 문법을 클래스 계층으로 — 단순 DSL과 표현식 평가.</p>
<img src="/images/blog/gof/diagrams/item15-interpreter.svg" alt="Interpreter 구조" />
</div>

<div class="gof-card beh">
<h3>16. <a href="/blog/programming/design/gof-design-patterns/item16-iterator">Iterator</a></h3>
<p class="intent">컬렉션 내부 구조 노출 없이 순회 — STL의 토대.</p>
<img src="/images/blog/gof/diagrams/item16-iterator.svg" alt="Iterator 구조" />
</div>

<div class="gof-card beh">
<h3>17. <a href="/blog/programming/design/gof-design-patterns/item17-mediator">Mediator</a></h3>
<p class="intent">객체들의 상호작용을 중재자에 캡슐화 — N×N 결합을 N으로.</p>
<img src="/images/blog/gof/diagrams/item17-mediator.svg" alt="Mediator 구조" />
</div>

<div class="gof-card beh">
<h3>18. <a href="/blog/programming/design/gof-design-patterns/item18-memento">Memento</a></h3>
<p class="intent">객체 상태를 캡슐화해 외부에 저장 — undo/snapshot 가능.</p>
<img src="/images/blog/gof/diagrams/item18-memento.svg" alt="Memento 구조" />
</div>

<div class="gof-card beh">
<h3>19. <a href="/blog/programming/design/gof-design-patterns/item19-observer">Observer</a></h3>
<p class="intent">객체 상태 변경을 관찰자들에게 자동 통보 — pub/sub의 토대.</p>
<img src="/images/blog/gof/diagrams/item19-observer.svg" alt="Observer 구조" />
</div>

<div class="gof-card beh">
<h3>20. <a href="/blog/programming/design/gof-design-patterns/item20-state">State</a></h3>
<p class="intent">객체의 내부 상태에 따라 동작이 변하도록 — if/switch 대신 상태 객체.</p>
<img src="/images/blog/gof/diagrams/item20-state.svg" alt="State 구조" />
</div>

<div class="gof-card beh">
<h3>21. <a href="/blog/programming/design/gof-design-patterns/item21-strategy">Strategy</a></h3>
<p class="intent">알고리즘을 객체로 캡슐화 — 런타임에 교체 가능.</p>
<img src="/images/blog/gof/diagrams/item21-strategy.svg" alt="Strategy 구조" />
</div>

<div class="gof-card beh">
<h3>22. <a href="/blog/programming/design/gof-design-patterns/item22-template-method">Template Method</a></h3>
<p class="intent">알고리즘 골격은 base, 단계 구현은 derived — Hollywood 원칙.</p>
<img src="/images/blog/gof/diagrams/item22-template-method.svg" alt="Template Method 구조" />
</div>

<div class="gof-card beh">
<h3>23. <a href="/blog/programming/design/gof-design-patterns/item23-visitor">Visitor</a></h3>
<p class="intent">객체 구조와 그 위 연산을 분리 — double dispatch로 새 연산 추가.</p>
<img src="/images/blog/gof/diagrams/item23-visitor.svg" alt="Visitor 구조" />
</div>

</div>

## 빠른 패턴 선택 — "비슷해 보일 때"

| 헷갈리는 두 패턴 | 무엇이 다른가 |
| --- | --- |
| Adapter vs Decorator | 인터페이스 *변환* vs 책임 *추가* |
| Decorator vs Proxy | 동적 *기능* vs *접근 제어* |
| Strategy vs State | *외부에서* 선택 vs *자체* 전이 |
| Strategy vs Template Method | *composition* vs *상속* |
| Composite vs Decorator | *부분-전체* vs *책임 적층* |
| Bridge vs Adapter | *사전* 분리 vs *사후* 호환 |
| Facade vs Mediator | *단방향* 단순화 vs *양방향* 협력 |
| Command vs Strategy | 요청 *자체* vs *알고리즘* |
| Mediator vs Observer | 중앙 *협력* vs *pub/sub* 알림 |
| Abstract Factory vs Builder | *객체 군* vs *단일 복잡 객체* |
| Abstract Factory vs Prototype | *새 인스턴스* vs *등록된 복제* |

## 학습 순서 — 처음 GoF를 공부할 때

개념 의존도가 낮은 것부터.

1. **Singleton, Factory Method** — 단순한 생성
2. **Strategy, Template Method, Iterator, Observer** — 매일 마주치는 행위
3. **Adapter, Decorator, Composite** — 직관적 구조
4. **State, Command, Chain of Responsibility** — 상태·요청 처리
5. **Abstract Factory, Builder, Prototype** — 본격적 생성
6. **Bridge, Facade, Proxy, Flyweight** — 큰 시스템 구조
7. **Mediator, Memento, Interpreter, Visitor** — 고급 행위

## Modern C++에서 변형되는 패턴들

C++11+ 기능으로 패턴 자체가 *단순*해지거나 *클래스 계층 없이* 표현되는 경우.

| 전통 패턴 | Modern C++ 변형 |
| --- | --- |
| Strategy / Command / Observer | `std::function` + 람다 |
| Singleton | Meyers' Singleton (C++11 thread-safe `static`) |
| Iterator | range-for + STL iterator concept |
| Visitor | `std::variant` + `std::visit` (closed type set) |
| Prototype | `std::unique_ptr` + virtual `clone()` |
| Factory | `std::make_unique`, `std::make_shared` |
| State | `std::variant` + state 멤버 |
| Decorator | function composition + lambda capture |

→ "패턴은 사라지지 않는다 — 다만 *언어 기능*으로 흡수된다."

## 다이어그램 재생성

`public/images/blog/gof/relationships.tex`를 수정 후:

```bash
bash scripts/build-diagrams.sh public/images/blog/gof/relationships.tex
```

개별 패턴 diagram은 `public/images/blog/gof/diagrams/itemNN-*.tex`.

## 시리즈 마치며

23 패턴은 *해야 할 일을 알고 있는 개발자*가 *읽고 쓰는 어휘*입니다. 외우는 게 목적이 아니라 *대화의 단위*로 갖는 것. "이 자리에 Strategy가 어울려" "이건 Mediator로 풀면 깔끔해" — 이런 대화가 가능해지면 GoF의 첫 페이지에서 마지막 페이지로 건너온 셈입니다.

다음 시리즈 추천:
- [Refactoring](/blog/programming/design/refactoring/ch01) — 패턴을 *추출*하는 절차
- [Clean Architecture](/blog/programming/design/clean-architecture/chapter01-what-is-design-and-architecture) — 시스템 단위에서의 패턴
- [Cpp Software Design](/blog/programming/cpp/cpp-software-design/guideline01-understand-the-importance-of-software-design) — Modern C++에서의 패턴

## 관련 항목

- 카테고리별 시작:
  - Creational: [item 1 — Abstract Factory](/blog/programming/design/gof-design-patterns/item01-abstract-factory)
  - Structural: [item 6 — Adapter](/blog/programming/design/gof-design-patterns/item06-adapter)
  - Behavioral: [item 13 — Chain of Responsibility](/blog/programming/design/gof-design-patterns/item13-chain-of-responsibility)
- 원문: GoF, *Design Patterns: Elements of Reusable Object-Oriented Software* (1994)
