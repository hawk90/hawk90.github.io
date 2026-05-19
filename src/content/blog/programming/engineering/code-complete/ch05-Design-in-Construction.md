---
title: "Chapter 5: Design in Construction"
date: 2026-05-11T05:00:00
description: "construction 단계의 설계 — wicked problem, 본질·우연 복잡성, 5 레벨, 다발의 휴리스틱, BDUF vs ENUF."
series: "Code Complete"
seriesOrder: 5
tags: [code-complete, design, McConnell]
draft: true
---

## 이 챕터의 메시지

설계는 "위에서 한 번"이 아니다. construction 매 순간 — 클래스 분할, 함수 책임, 매개변수 결정에서 — 설계가 일어난다.

> Software's Primary Technical Imperative = **복잡성 관리**.

이 챕터는 — Code Complete의 가장 긴 챕터(54페이지). 5개 절(§5.1~§5.5)을 — 가능한 한 충실히 옮긴다.

## 핵심 내용

- 설계 = **wicked problem** (Rittel & Webber 1973).
- 본질적 vs 우연적 복잡성 (Brooks 1987).
- 5 레벨 설계 (System → Subsystem → Class → Routine → Internal).
- **휴리스틱의 다발** — 한 도구에 갇히지 마라.
- BDUF X — **ENUF**(Enough Design Up Front).

## §5.1 Design Challenges

### Design is a Wicked Problem

Horst Rittel과 Melvin Webber(1973)의 **wicked problem** — "풀어 봐야 비로소 명확히 정의되는" 문제.

> Tacoma Narrows 다리 (1940) — 무너지기 전까지 — 공기역학이 — 그토록 고려해야 할 요인인지 — 모름. 무너진 후에야 — 두 번째 다리를 — 성공적으로 짓는다.

Parnas와 Clements 인용 — 합리적·오류 없는 설계의 그림은 — **현실에 없다**. 책의 작은 프로그램조차 — 저자가 의도한 모습이지 — 실제로 일어난 모습이 아니다.

### Design is a Sloppy Process

- 최종 설계는 — 깨끗하지만, 과정은 — 그렇지 않다.
- 잘못된 발걸음·막다른 길 — 많이.
- "충분히 좋다"의 기준이 — 모호.
- 일반적 답 = "시간이 떨어졌을 때".

### Design is About Trade-Offs and Priorities

이상적 세계 = 즉시 실행, 0 스토리지, 0 대역폭, 0 오류, 0 비용. 현실 = 그 사이의 **균형**.

### Design Involves Restrictions

> 무한한 시간·자원·공간이 있으면 — 신발 한 켤레당 방 하나의 — 무지막지한 건물. 제한이 — 단순화를 강제 → 더 나은 해법.

### Design is Non-Deterministic

같은 사양으로 세 명에게 설계를 시키면 — 다 다른 — **수용 가능한** 결과.

### Design is a Heuristic Process

> **KEY POINT** — 설계는 비결정적이므로, 기법은 — "rules of thumb" / "sometimes work". 한 도구가 — 모든 일에 맞지 않는다.

### Design is Emergent

Bain & Shalloway 2004 — 설계는 — **발현**(emergent). 누구의 머리에서 — 완성형으로 — 나오지 않는다. 리뷰·토론·코드 작성 경험 — 통해 — 진화.

## §5.2 Key Design Concepts

### Software's Primary Technical Imperative: Managing Complexity

#### Accidental and Essential Difficulties

Brooks의 "No Silver Bullets"(1987) — Aristotle의 — **본질**(essential) vs **우연**(accidental).

- **본질** — 그 사물이 되기 위해 반드시 필요한 속성. 자동차 = 엔진·바퀴·문.
- **우연** — 그 사물이 — 우연히 가진 속성. V8 vs 4기통, 2도어 vs 4도어.

> 소프트웨어의 — 우연한 어려움은 — 옛날에 — 해결됨. assembly → 고수준 언어, 배치 → 시분할, 통합 환경. 본질적 어려움 = 더 느린 진보.

본질 = 복잡하고 무질서한 현실 세계의 — 정확한 인터페이스, 의존·예외의 정확한 식별, 근사 X 정확한 해법.

#### Importance of Managing Complexity

> 프로젝트 실패의 — 기술적 이유는 — 자주 "통제되지 않은 복잡성".

Dijkstra(1989) — 한 사람의 마음이 — 1 비트에서 수백 MB까지 — **9 자릿수** 비율의 거리를 — 잇는 유일한 직업. 오늘날 — **10^15** 가까울 수도.

> Dijkstra(1972) — **누구의 두개골도 — 현대 프로그램을 — 한 번에 담을 만큼 — 크지 않다**.

#### How to Attack Complexity

> **KEY POINT** — 두 갈래:
> 1. 본질적 복잡성을 — 어느 한 순간에 — 다뤄야 할 양 — **최소화**.
> 2. 우연적 복잡성이 — 불필요하게 — **번지지 않게**.

### Desirable Characteristics of a Design

PDF의 11개 (요약):

- **Minimal complexity** — "clever" 설계 X. 단순·이해 쉬움.
- **Ease of maintenance** — 유지보수 프로그래머를 — 청중으로.
- **Minimal connectedness** — 강한 응집, 느슨한 결합, 정보 은닉.
- **Extensibility** — 시스템 기반에 — 폭력 없이 — 향상.
- **Reusability** — 다른 시스템에서 — 재사용.
- **High fan-in** — 주어진 클래스를 — 많은 클래스가 — 사용. 좋은 유틸 활용 표시.
- **Low-to-medium fan-out** — 한 클래스가 — 약 7 이상의 — 다른 클래스 사용 X. **HARD DATA** — 루틴 호출·클래스 호출 — 모두 적용 (Card & Glass 1990, Basili et al 1996).
- **Portability** — 다른 환경 이식.
- **Leanness** — 여분 부분 X (Wirth 1995, McConnell 1997). Voltaire — "책이 완성되는 것은 — 더 추가할 게 없을 때가 아니라 — 더 뺄 게 없을 때".
- **Stratification** — 한 레벨에서 — 일관된 시각.
- **Standard techniques** — 표준화된 일반 접근.

### Levels of Design

```
1: Software system           (전체)
2: Subsystems / Packages
3: Classes within packages
4: Routines within classes
5: Internal routine design
```

#### Level 1: Software System

전체 시스템. 일부 프로그래머는 — 바로 클래스 레벨로 — 점프. 그러나 — 더 높은 레벨 사고가 유익.

#### Level 2: Division into Subsystems or Packages

주요 서브시스템 식별. DB, UI, 비즈니스 로직, 명령 인터프리터, 보고서 엔진, ...

**서브시스템 통신 규칙이 — 핵심**. 모든 서브시스템이 — 다른 모든 서브시스템과 — 통신하면 → 분리 의미 X.

> "hoses" 비유 — 서브시스템 = 연결된 호스. 호스가 많을수록 — 떼내기 어렵다. 적은 호스 + 쉬운 재연결로 — 설계.

**좋은 규칙** — 서브시스템 다이어그램이 — **acyclic graph**. A→B→C→A 순환 X.

**Common Subsystems** — Business logic, User Interface, Database access, System dependencies (OS/하드웨어 격리).

#### Level 3: Division into Classes

각 서브시스템 → 클래스로 분해.

**Classes vs Objects** — 클래스 = 정적·추상, 객체 = 동적·구체적 (DB의 schema vs instance와 동일).

#### Level 4: Division into Routines

각 클래스 → 루틴으로. Level 3의 인터페이스가 — 클래스의 일부 루틴을 정의. Level 4 = private 루틴 상세.

#### Level 5: Internal Routine Design

각 루틴 — 의사코드 작성, 알고리즘 참고, 명령문 조직. 의식하든 안 하든 — **항상 일어남**.

## §5.3 Design Building Blocks: Heuristics

> 설계는 비결정적이므로 — **휴리스틱의 능숙한 적용**이 — 좋은 설계의 핵심.

### Find Real-World Objects

> *"Ask not first what the system does; ask WHAT it does it to!"* — Bertrand Meyer

단계:

1. 객체와 속성(메서드·데이터) 식별.
2. 각 객체에 — 무엇을 할 수 있는가.
3. 각 객체가 — 다른 객체에 — 무엇을 할 수 있는가.
4. 어느 부분이 — public, 어느 부분이 — private.
5. 각 객체의 — public 인터페이스 정의.

예 — 시간 청구 시스템: Employee, Client, Time Card, Bill (Figure 5-6).

### Form Consistent Abstractions

추상 = 디테일을 — 안전하게 무시.

> 집 비유 — "집"이 — 유리·나무·못의 조합보다 — 한 추상. "마을"이 — 집의 모음의 한 추상. 문도 — 직사각형 재료 + 경첩 + 손잡이의 — 추상. 손잡이 = 황동·니켈·철·강의 특정 형성의 추상.

좋은 프로그래머 = **루틴·클래스·패키지 인터페이스 레벨**의 추상을 — 만든다 (손잡이·문·집 레벨).

### Encapsulate Implementation Details

> 추상은 — "객체를 — 높은 디테일 레벨에서 보아도 OK". 캡슐화는 — "**그 외 어떤 레벨도 보지 마라**".

집의 외부는 볼 수 있다. 문의 디테일은 — 볼 수 없다. 문이 있는지·열렸는지 — 알 수 있다. 그러나 문의 재질이 — 나무인지 강인지 — **모른다**.

### Inherit When Inheritance Simplifies the Design

객체가 — 다른 객체와 — 비슷하지만 — 몇 가지 다를 때.

```
class Employee
class FullTimeEmployee : Employee   // 일부 다름
class PartTimeEmployee : Employee   // 일부 다름
```

다형성 = Open()/Close()를 — 런타임에 — 어느 문인지 모르고 — 호출.

> 상속은 OO의 — 가장 강력한 도구. 잘 쓰면 — 큰 이득, 단순히 쓰면 — 큰 손상.

### Hide Secrets (Information Hiding)

David Parnas의 1972 논문 "On the Criteria to Be Used in Decomposing Systems Into Modules"에서 — 공개적으로 등장. "비밀" = 한 자리에 — 숨겨진 — 설계·구현 결정.

> Fred Brooks — *The Mythical Man-Month* 20주년판에서 — "Parnas was right, and I was wrong about information hiding" (1995).
>
> Barry Boehm(1987) — 재작업 제거에 — 강력한 기법.

#### Two Categories of Secrets

1. **복잡성 숨기기** — 뇌가 — 특별히 관심 없으면 — 안 다루도록.
2. **변경 출처 숨기기** — 변경이 일어날 때 — 효과가 — **국지적**이도록.

#### Barriers to Information Hiding

대부분 — 다른 기법의 — 습관에서 — 생긴 — 정신적 장벽.

- **Excessive Distribution Of Information** — `100` 리터럴을 — 시스템 곳곳에. 한 자리에 `MAX_EMPLOYEES` 상수로.
- **Circular Dependencies** — 클래스 A의 루틴이 — B 호출, B 루틴이 — A 호출.
- **Class Data Mistaken For Global Data** — 클래스 데이터 ≠ 전역 데이터. 위험 훨씬 작음.
- **Perceived Performance Penalties** — 추상화의 성능 비용 — 측정 전 걱정 X. 핫스팟이 — 발견되면 그때 최적화.

#### Value of Information Hiding

> **HARD DATA** — 정보 은닉을 — 사용한 큰 프로그램이 — **약 4배 더** 수정 쉽다 (Korson & Vaishnavi 1986).

> **KEY POINT** — "**What should I hide?**"라는 습관 = 많은 어려운 설계 문제가 — 즉시 풀린다.

#### Example

```
id = ++g_maxId;    // 곳곳에 — 함정. 타입·범위 변경 시 — 곳곳 수정.
id = NewId();      // 한 자리 — 안에 무엇이 있든.
```

추가 비밀 = ID의 **타입**. `int` 대신 `IdType` (typedef 또는 별도 클래스).

### Identify Areas Likely to Change

Glass 1995 — 위대한 설계자들의 공통 속성 = **변경 예측 능력**.

**3 단계**:

1. **식별** — 변할 만한 항목 (요구사항에 — 변경 후보가 적혀 있으면 — 쉬움).
2. **분리** — 한 클래스에 — 모음.
3. **격리** — 인터페이스가 — 변경에 — 무감각하도록.

**변할 가능성 있는 영역**:

- **Business logic** — 정부·노조·보험사 — 정기 변경.
- **Hardware dependencies** — 스크린·프린터·키보드·마우스·드라이브.
- **Input/output** — 파일 포맷·UI 포맷.
- **Nonstandard language features** — 컴파일러·버전 의존.
- **Difficult design and construction areas** — 어차피 다시 짤 수 있음.
- **Status variables** — boolean 대신 — enum. 직접 검사 대신 — access routine.
- **Data-size constraints** — `15` 대신 `MAX_EMPLOYEES`.

### Keep Coupling Loose

**모형 기차의 결합** = 마주보는 — 후크. 밀면 — 잠긴다. 나사·전선·특정 종류 호환 — 없음. 소프트웨어의 — 모듈 연결도 — 그처럼 단순.

#### Coupling Criteria

- **Size** — 모듈 간 연결 수. 1 인자 < 6 인자. 4 public 메서드 < 37.
- **Visibility** — 연결의 — 명료함. 인자 = 광고처럼 분명. 전역 = 은밀(나쁨).
- **Flexibility** — 연결을 — 얼마나 쉽게 바꿀 수 있나. 다리미 vs USB.

#### Kinds of Coupling

- **Simple-data-parameter** — 원시 타입 + 인자만. OK.
- **Simple-object** — 모듈이 — 객체를 — 인스턴스화. OK.
- **Object-parameter** — Module1이 — Object2를 — Object3 받기에 — 요구. Simple-data보다 — 더 강.
- **Semantic** — 가장 음험. 다른 모듈의 — 내부 동작에 — 의미 의존. 예 — 제어 플래그 전달, 전역 데이터 변경 후 의존, Initialize() 호출 안 하기, Object의 일부 메서드만 사용, BaseObject → DerivedObject 캐스트, **protected 멤버 직접 수정**.

> **KEY POINT** — 클래스와 루틴은 — 무엇보다 — **복잡성을 줄이는 지적 도구**. 일을 더 단순하게 만들지 못하면 — 일하지 X.

### Look for Common Design Patterns

#### 이점 4가지

1. **기존 추상**으로 복잡성 감소 — "Factory Method를 쓰자"의 한 마디.
2. **흔한 해법의 디테일을 — 제도화**하여 오류 감소.
3. **대안 제시**의 휴리스틱 가치.
4. **더 높은 레벨로 — 토론 끌어올리기** — "Creator vs Factory Method 결정 못 하겠다".

#### Table 5-1 — 인기 패턴 (요약)

Abstract Factory, Adapter, Bridge, Composite, Decorator, Facade, **Factory Method**, Iterator, Observer, **Singleton**, Strategy, **Template Method**.

> 유일한 함정 = **feature-itis** — 패턴이 적합해서 — 가 아니라 — 써 보고 싶어서 — 쓰는 것.

### Other Heuristics (11개 요약)

- **Aim for Strong Cohesion** — 한 모듈 내 — 모든 코드가 — 중심 목적 지원.
- **Build Hierarchies** — Aristotle의 동물 분류. Simon 1996 — 사람은 — 집을 그릴 때 — 위계로.
- **Formalize Class Contracts** — 사전·사후 조건.
- **Assign Responsibilities** — "각 객체가 — 무엇을 — 책임지는가?"
- **Design for Test** — 테스트 가능성을 — 설계에 — 통합.
- **Avoid Failure** — Petroski의 *Design Paradigms*(1994) — 다리 실패의 — 역사. 과거 성공만 모방, 실패 모드 — 미고려가 — 원인.
- **Choose Binding Time Consciously** — 값이 — 언제 변수에 — 바인딩되는가. 일찍 = 단순, 늦게 = 유연.
- **Make Central Points of Control** — Plauger의 *One Right Place* 원리. 한 자리에서 찾고 — 한 자리에서 수정.
- **Consider Using Brute Force** — Butler Lampson — "*When in doubt, use brute force*". 동작하지 않는 우아한 해법보다 — 동작하는 무식한 해법이 — 낫다.
- **Draw a Diagram** — 사진 = 1000 단어. 적절히 — 추상.
- **Keep Your Design Modular** — 블랙박스 — 입력·출력만 알고 내부 모름.

### Guidelines for Using Heuristics — Polya's *How to Solve It* (1957)

수학 문제 해결의 — 4 단계 (소프트웨어 설계에도 적용):

1. **Understanding the Problem** — 미지가 무엇인가? 데이터는? 조건은?
2. **Devising a Plan** — 비슷한 문제를 — 본 적 있는가? 관련 문제·정리?
3. **Carrying out the Plan** — 계획 수행. 매 단계가 — 옳은지 — 명확히 볼 수 있는가?
4. **Looking Back** — 결과 — 검증. 다른 문제에 — 사용할 수 있는가?

> 한 접근법에 — 갇히지 마라. UML 다이어그램이 — 안 되면 — 영어로. 짧은 테스트 프로그램. 무식한 해법. 산책. 휴식이 — 끈기보다 — 결과를 빠르게.

## §5.4 Design Practices

### Iterate

> **KEY POINT** — 설계는 — 반복적. A에서 B로 가지 않고 — A → B → A.

상·하위 레벨을 — 왔다갔다. 큰 그림이 — 낮은 디테일에 — 맥락. 낮은 디테일이 — 큰 그림에 — 현실의 토대.

> Edison — 전구 필라멘트 1000 시도 후. "1000개의 — 작동하지 않는 것을 — 발견."

### Divide and Conquer

Dijkstra — 누구의 두개골도 — 복잡한 프로그램을 — 한 번에 담지 못한다. Polya와 동일 — 이해 → 계획 → 수행 → 회고.

### Top-Down and Bottom-Up Design Approaches

- **Top-down** — 추상에서 시작 → 디테일.
- **Bottom-up** — 구체에서 시작 → 일반화.

**Argument for Top Down** — 뇌의 한정. 분할정복은 — 반복적(여러 레벨, 첫 시도가 마지막 아님).

**Argument for Bottom Up** — top-down이 너무 추상이면 — 시작 어렵다. "내가 — 이 시스템이 — 무엇을 해야 하는지 안다"부터.

**No Argument, Really** — top-down = 분해 전략, bottom-up = 합성 전략. **상호 보완적**.

- Top down 강점 = 쉽다, 디테일 지연.
- Bottom up 강점 = 재사용 가능 유틸 일찍 식별.
- Top down 약점 = 작게 시작했다가 — 디테일이 — 복잡 증식.
- Bottom up 약점 = 시작이 어렵고 — 부분에서 — 전체를 못 만들 수도 (벽돌로 — 비행기 못 만든다).

### Experimental Prototyping

> Wickedness — 부분적으로 풀기 전엔 — 문제를 정의 못 한다.

**프로토타이핑** = 특정 설계 질문에 — 답하기 위한 — **absolute minimum** 폐기 코드.

잘 안 되는 경우:
- 최소 코드 X — 결국 — 실제 구현.
- 질문이 — 충분히 구체적 X — "DB 프레임워크가 — 동작할까?" X. "X·Y·Z 가정 하에 — 1000 트랜잭션/초 — 지원?" O.
- **폐기 코드**로 — 안 다룸. 클래스명·패키지명에 — `prototype` 접두사.

### Collaborative Design

- 동료에게 — 잠시 들러 — 아이디어 토스.
- 화이트보드 옆에서 — 같이 — 대안 그리기.
- 키보드 옆에서 — 같이 — 상세 설계.
- 워크스루 회의.
- 공식 인스펙션.
- 일주일 후 — 자기 설계 — 다시 보기.

품질 보증 목적 = **공식 인스펙션**이 — 가장 효과적. 창의성·대안 다양화 목적 = 덜 구조화된 접근.

### How Much Design is Enough?

#### Table 5-2 (요약)

| 요인 | 설계 상세 | 문서 공식도 |
|---|---|---|
| 응용 분야 — 깊은 경험 | Low | Low |
| 응용 분야 — 깊지만 미경험 | Medium | Medium |
| 미경험 | Medium-High | Low-Medium |
| 응용 — safety-critical | High | High |
| 응용 — mission-critical | Medium | Medium-High |
| 작은 프로젝트 | Low | Low |
| 큰 프로젝트 | Medium | Medium |
| 짧은 수명 (주·월) | Low | Low |
| 긴 수명 (월·년) | Medium | Medium |

> 나(McConnell)는 — **더 깊이 들어가는 쪽으로 — 오류한다**. 가장 큰 설계 오류 = 충분히 갔다고 생각한 — **쉬워 보이는** 영역에서.
>
> Gresham's Law — *프로그램된 활동이 — 비프로그램 활동을 — 몰아낸다*. **80%의 노력을 — 대안 탐색 + 20%를 문서 다듬기**가 — 그 반대보다 훨씬 낫다.

### Capturing Your Design Work

전통 = 공식 설계 문서. 그러나 — 작거나 비공식 프로젝트의 — 가벼운 대안:

- **코드 자체에 — 설계 문서 삽입** — 헤더 주석, JavaDoc.
- **Wiki**에 토론·결정 캡처 — 지리적으로 분산된 팀에 특히 유용.
- **이메일 요약** — 회의 후 한 명이 정리·발송.
- **디지털 카메라** — 화이트보드 그림 사진.
- **flipchart** — 큰 종이에 그려 — 프로젝트 공간 벽에.
- **CRC 카드** (Beck 1991) — 클래스명·책임·협력자.
- **UML 다이어그램** (Fowler 2004) — 적절한 레벨로.

## §5.5 Comments on Popular Methodologies

> 1990년대 초 — Code Complete 1판 — "design을 점 하나·t 하나까지 — 코딩 전에" 광신자들. 2000년대 중반 — 정반대 — "**Big Design Up Front**(BDUF) is *bad*. 아예 안 해야".
>
> 10년 사이에 — 진자가 — 양극을 — 오감. 그러나 — BDUF의 대안은 — **No design up front**가 아니라 — **Little Design Up Front**(LDUF) 또는 — **Enough Design Up Front**(ENUF).

P.J. Plauger — "**디자인 방법론에 — 더 교조적일수록 — 풀 수 있는 — 현실 문제가 — 더 적다**" (1993).

> 설계를 — wicked·sloppy·heuristic 과정으로 — 다뤄라. 첫 설계로 — 끝내지 마라. 협업. 단순함 추구. 필요할 때 — 프로토타입. **반복·반복·반복**.

## Key Points (§)

McConnell 원문 6가지:

1. Software's Primary Technical Imperative = **복잡성 관리**. 단순성에 — 설계 초점.
2. 단순성 두 갈래 — 본질 복잡성 — 최소화, 우연 복잡성 — 번지지 X.
3. 설계는 — **휴리스틱**. 한 방법론에 — 교조적 → 창의성·프로그램 손상.
4. 좋은 설계는 — 반복적. 더 많은 가능성을 시도할수록 — 최종 설계가 — 더 낫다.
5. **정보 은닉**이 — 특히 값진 개념. "**What should I hide?**"가 — 많은 어려운 설계 문제를 — 푼다.
6. 설계에 대한 — 유용·흥미 정보는 — 책 밖에 — 풍부. 여기 — 빙산의 일각.

## 정리

- 설계 = wicked + sloppy + heuristic + emergent.
- 복잡성 관리 = **Primary Technical Imperative**.
- 본질(Brooks 1987) vs 우연. 본질 최소화 + 우연 비확산.
- 5 레벨 (System/Subsystem/Class/Routine/Internal).
- 휴리스틱 — 다발로. 한 도구 X.
- BDUF X, **ENUF**. 반복·반복·반복.

## 관련 항목

- [Ch 6: Working Classes](/blog/programming/engineering/code-complete/ch06-Working-Classes)
- [Ch 7: High-Quality Routines](/blog/programming/engineering/code-complete/ch07-High-Quality-Routines)
- [Ch 24: Refactoring](/blog/programming/engineering/code-complete/ch24-Refactoring)
- [Clean Architecture Ch 7: SRP](/blog/programming/design/clean-architecture/chapter07-srp-the-single-responsibility-principle)
- [Clean Code Ch 12: Emergence](/blog/programming/engineering/clean-code/chapter12-emergence)
