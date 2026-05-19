---
title: "Chapter 6: Working Classes"
date: 2026-05-11T06:00:00
description: "좋은 클래스 — ADT 기반, 좋은 인터페이스, 포함 vs 상속, 13 정당한 이유, Law of Demeter."
series: "Code Complete"
seriesOrder: 6
tags: [code-complete, classes, ADT, McConnell]
draft: true
---

## 이 챕터의 메시지

> **KEY POINT** — 클래스 = 데이터와 루틴의 — 일관된·잘 정의된 책임. 효과적인 프로그래머의 핵심 = **한 부분 작업할 때 — 안전하게 무시할 수 있는 비중을 — 최대화**. 클래스가 — 그 도구.

## 핵심 내용

- 클래스 = **ADT + 상속 + 다형성**.
- 좋은 인터페이스 = 일관된 추상 + 강한 캡슐화.
- **Containment(has-a) 선호, Inheritance(is-a) 신중**.
- 15+ 정당한 이유로 클래스 생성.
- Law of Demeter, deep copy 선호.

## §6.1 Class Foundations: Abstract Data Types (ADTs)

ADT = 데이터 + 그 데이터에 대한 연산의 — 모음.

ADT 이해 없이 클래스를 만들면 — 이름만 클래스. 실제 = 느슨하게 — 묶인 데이터·루틴 가방.

### Example of the Need for an ADT

폰트(typeface·point size·attribute) 다루는 프로그램. 12-point을 — 16 pixels로 — 설정하고 싶다.

#### Ad hoc 방식

```
currentFont.size = 16
currentFont.size = PointsToPixels(12)
currentFont.sizeInPixels = PointsToPixels(12)
```

문제 = `sizeInPixels`와 `sizeInPoints`를 — 둘 다 — 가질 수 없다(어느 것을 쓸지 모름). 곳곳에 — 비슷한 줄 — 흩어짐.

Bold 설정:

```
currentFont.attribute = currentFont.attribute or 0x02
currentFont.attribute = currentFont.attribute or BOLD
currentFont.bold = True
```

여전히 — 클라이언트가 — 데이터 멤버를 직접 조작.

#### ADT 방식

```
currentFont.SetSizeInPoints(sizeInPoints)
currentFont.SetSizeInPixels(sizeInPixels)
currentFont.BoldOn()
currentFont.BoldOff()
currentFont.ItalicOn()
currentFont.ItalicOff()
currentFont.SetTypeFace(faceName)
```

> **KEY POINT** — 내부 코드는 — ad hoc 방식과 비슷할 수 있다. 차이 = 폰트 연산이 — 한 자리에 격리. 더 나은 추상 + 변경에 대한 보호.

### Benefits of Using ADTs (8 가지)

1. **Implementation details 은닉** — 데이터 타입 변경 — 한 자리.
2. **변경이 — 전체 프로그램에 영향 X** — 새 연산(small caps, superscript) 추가 — 한 자리.
3. **인터페이스가 — 더 정보성** — `currentFont.size = 16` 모호(픽셀? 포인트?). ADT가 — 명시.
4. **성능 개선 — 쉬움** — 잘 정의된 루틴만 — 재코딩.
5. **프로그램의 정확성 — 더 명백** — `currentFont.BoldOn()` 호출 검증 vs `attribute or 0x02` 검증.
6. **자기 문서화** — `currentFont.BoldOn()` >> `currentFont.attribute or 0x02`. **HARD DATA** — Woodfield, Dunsmore, Shen(1981) — 학생 연구. ADT 버전이 — 함수 버전보다 — **30% 높은 점수**.
7. **데이터를 — 프로그램 곳곳에 — 전달 안 함** — `currentFont`가 — ADT 안에. 전역 X, 인자 전달 X.
8. **실세계 엔티티와 — 일함** — 배열·구조체·boolean 대신 — `currentFont`로.

### More Examples of ADTs

PDF의 — primary 예시 = **원자로 냉각 시스템**:

```
coolingSystem.Temperature()
coolingSystem.SetCirculationRate(rate)
coolingSystem.OpenValve(valveNumber)
coolingSystem.CloseValve(valveNumber)
```

나머지 프로그램은 — 데이터-구조 디테일·한계·변경을 — 걱정 X.

표의 11개 추가 예시: Cruise Control, Blender, Fuel Tank, Set of Help Screens, Menu, List, Pointer, Light, Elevator, Stack, File. 각각 — 연산을 — ADT로 — 정의.

### ADT Guidelines

- **저수준 데이터 타입을 — ADT로** — Stack/List/Queue를 — 그 자체로 취급 X. **그것이 — 무엇을 — 표현하는가** 물어. Stack of employees → "**Employees**" ADT로.
- **Files도 — ADT** — OS·고수준 언어가 — 이미 추상화 계층 제공.
- **단순 항목도 — ADT** — On/Off만 있는 — Light도 — `TurnLightOn()`·`TurnLightOff()`로.
- **저장 매체와 독립** — 보험료 표가 — 디스크에 저장 → `rateFile.Read()` X. → `rateTable.Read()` 또는 `rates.Read()` O. 매체 변경 시 — 이름이 — 거짓이 되지 않게.

### Handling Multiple Instances in Non-OO Environments

C 같은 — 비OO 환경에서. 3 옵션:

1. **Implicit instances** (조심히) — `SetCurrentFont(fontId)`. 단순 응용 OK, 복잡엔 — 상태 추적의 복잡성.
2. **Explicit identification** — 매 호출에 `fontId` 전달. "current font" 개념 X.
3. **Explicit data** — `Font` 데이터 타입을 — 매 호출에 — 전달.

### ADTs and Classes

ADT = 클래스의 — 기초. **클래스 = ADT + 상속 + 다형성**.

## §6.2 Good Class Interfaces

좋은 클래스 = **좋은 추상의 — 인터페이스** + **그 뒤에 — 디테일 — 숨김**.

### Good Abstraction

#### 좋은 예

```cpp
class Employee {
public:
    Employee();
    Employee(FullName name, String address, String workPhone,
             String homePhone, TaxId taxIdNumber, JobClassification jobClass);
    virtual ~Employee();
    FullName Name();
    String Address();
    String WorkPhone();
    String HomePhone();
    TaxId TaxIdNumber();
    JobClassification GetJobClassification();
};
```

모든 루틴이 — 일관된 끝을 향해. **Employee 추상**.

#### 나쁜 예 (CODING HORROR)

```cpp
class Program {
public:
    void InitializeCommandStack();
    void PushCommand(Command &command);
    Command PopCommand();
    void ShutdownCommandStack();
    void InitializeReportFormatting();
    void FormatReport(Report &report);
    void PrintReport(Report &report);
    void InitializeGlobalData();
    void ShutdownGlobalData();
};
```

명령 스택·보고서·전역 데이터 — 연결 X. **나쁜 응집**. 더 집중된 — 여러 클래스로 — 재조직.

### 인터페이스 가이드라인

- **일관된 추상 수준** — 클래스가 — 정확히 — 하나의 ADT 구현. 두 개 발견 → 재조직.
- **클래스가 — 구현하는 추상 — 이해**. spreadsheet 컨트롤로 — grid 컨트롤을 — 흉내. 150 루틴 노출 X — 15 grid 루틴 + 1 셀 색상 — 만 노출.
- **반대 쌍의 서비스를 — 짝으로** — Light → On/Off. Add → Remove. 그러나 — 무의식적으로 만들지 X — 필요 검사 후.
- **무관한 정보를 — 다른 클래스로** — 한 클래스의 반은 — 한 데이터, 반은 — 다른 데이터 → **2 클래스가 가장한 1 클래스**.
- **인터페이스 추상의 — 부식 경계** — 시간이 지나면 — 어울리지 않는 — 기능 추가. Employee에 — `IsZipCodeValid()`, `GetQueryToCreateNewEmployee()` 등 추가 → 추상 무너짐.
- **추상과 일관 X public 멤버 추가 X** — "이 루틴이 — 추상과 — 일관되나?" 물음.
- **추상과 응집 — 함께 고려** — 좋은 추상 = 보통 강한 응집. 약한 응집 → 일관된 추상 — 다시 검토.

### Good Encapsulation

> *"단 하나의 가장 중요한 요인, 잘 설계된 모듈을 — 나쁜 것과 — 구별하는 것은 — 모듈이 — 내부 데이터와 구현 디테일을 — 다른 모듈로부터 — 숨기는 정도다."* — Joshua Bloch

캡슐화 = 추상보다 — 강한 개념. 추상 = "디테일 무시해도 OK", 캡슐화 = "**디테일을 — 봐서는 X**".

- **클래스·멤버의 접근성 — 최소화** — public·private·protected 의심 시 — **가장 엄격한 privacy** (Meyers 1998, Bloch 2001).
- **public에 — 데이터 노출 X** — `float x; y; z;` 대신 — `float X(); SetX();` (Riel 1996).
- **interface에 — 사적 구현 디테일 — 두지 X** — C++ 헤더의 — private 섹션이 — 노출. 작가가 — 큰 노력 없이 — 회피하기 어려움. **독자**는 — private 섹션을 — 들여다보지 — 마라.
- **사용자에 대한 — 가정 X** — "이 코드는 — DerivedClass가 0.0으로 초기화하면 — 폭발하니까 — 1.0으로" 같은 주석은 — 클래스가 — 너무 — 사용자를 안다.
- **friend 클래스 — 회피**.
- **public 루틴만 — 쓴다는 — 이유로 — public에 두지 X**.
- **read-time 편의 > write-time 편의** — 코드는 — 작성보다 — 더 자주 — 읽힌다.

#### Be very, very wary of semantic violations of encapsulation

> **KEY POINT** — 구문 캡슐화는 — `private` 선언으로 — 쉽다. 의미 캡슐화는 — 다르다.

5 예시 (PDF):

1. Class A의 `Initialize()` 호출 X — `PerformFirstOperation()`이 — 자동 호출함을 — 안다.
2. `database.Connect()` 안 부름 — `employee.Retrieve(database)`가 — 연결 시킨다 — 안다.
3. Class A의 `Terminate()` 안 부름 — `PerformFinalOperation()`이 — 호출했다 — 안다.
4. ObjectA가 범위 벗어난 후도 — ObjectB 포인터 사용 — ObjectA가 — static에 — 보관한다 — 안다.
5. `ClassA.MAXIMUM_ELEMENTS` 대신 — `ClassB.MAXIMUM_ELEMENTS` 사용 — 같은 값이라 — 안다.

> 문제 = client 코드가 — public interface가 아닌 — **private 구현에 의존**. **interface를 — 통해**(through) 프로그래밍 ≠ **interface로**(to) 프로그래밍.

### Watch for Coupling Too Tight

- 멤버 접근성 최소화.
- friend 클래스 회피.
- base에 `protected` 데이터 회피.
- public에 — 데이터 노출 회피.
- 의미 캡슐화 위반 — 경계.
- **Law of Demeter** 준수.

## §6.3 Design and Implementation Issues

### Containment ("has a" relationships)

> **KEY POINT** — Containment은 — OOP의 **work-horse**. 상속이 — 책에 더 많이 적혀 있는 이유는 — 더 까다롭고 — 오류 prone이기 때문이지 — 더 좋아서가 아니다.

- **has-a를 — containment로 구현** — Employee "has a" name → name이 — Employee의 — 멤버 데이터.
- **마지막 수단으로 — private inheritance** (Meyers 1998) — 가족 protected 멤버 접근 위해. 실제 — 회피.
- **~7 멤버 이상 — 의심** — Miller 1956 — "7±2"는 — 마술 숫자. 7 이상이면 — 분해 (Riel 1996). 원시 타입이면 — 상한, 복잡 객체면 — 하한.

### Inheritance ("is a" relationships)

> *"public 상속의 — 가장 중요한 규칙: public 상속 = is-a. 이 규칙을 — 외워라."* — Scott Meyers

상속 = 한 클래스가 — 다른 클래스의 — 특화. 가장 — 독특한 OOP 속성 + **가장 — 위험**.

- **public 상속 = is-a** — derived가 — base 인터페이스 계약을 — **완전히** — 준수 못 하면 — 상속 X. Containment 또는 — 더 위 계층 변경 고려.
- **상속을 위해 — 설계·문서화하거나 — 금지** (Bloch). 상속받지 않을 클래스는 — `non-virtual`/`final`/`non-overridable`.
- **Liskov Substitution Principle** (Liskov 1988) — derived가 — base의 — 진짜 특화일 때만. **Hunt & Thomas 시금석**(2000) — *"Subclasses must be usable through the base class interface without the need for the user to know the difference."*

  Account → CheckingAccount/SavingsAccount/AutoLoanAccount. `InterestRate()`가 — Checking/Savings는 — 은행이 — 지불, AutoLoan은 — 소비자가 — 지불 → **의미가 — 다름**. LSP 위반 — 상속 X.

- **원하는 것만 — 상속** — Table 6-1. 3 가지:
  - Abstract overridable — 인터페이스만.
  - Overridable — 인터페이스 + 기본 구현, 오버라이드 가능.
  - Non-overridable — 인터페이스 + 구현, 오버라이드 X.
- **non-overridable 멤버 함수 — 오버라이드 X** — `private` 함수의 이름을 — derived에서 재사용 X.
- **공통 인터페이스·데이터·동작을 — 가능한 — 위로**.
- **단 하나의 인스턴스 클래스 — 의심** — 객체로 — 충분한지.
- **단 하나의 derived 클래스 — 의심** — "designing ahead" — 신호.
- **routine을 — 오버라이드해 — 아무것도 안 함 — 의심** — `Cat` → `ScratchlessCat` → `Scratch() {}`. 곧 `ScratchlessTaillessMicelessMilklessCat`. 기본 클래스의 — 잘못. 원천에서 — 수정.
- **깊은 상속 트리 — 회피** — Riel 1996 — 6 레벨 최대 (마술 7±2 기반). McConnell — "2~3 레벨이 — 현실적". **HARD DATA** — 깊은 트리 = 결함률 — 증가 (Basili, Briand, Melo 1996).
- **상속을 — 광범위 type checking보다 — 선호** — `switch(shape.type)` → 다형성 `shape.Draw()`로. (그러나 — 모든 switch가 — 그렇지 X — `ui.Command()`는 — 적절.)
- **base의 — protected 데이터를 — derived에서 — 사용 X** — Bloch "**Inheritance breaks encapsulation**" (2001). protected accessor 함수 제공.

### Multiple Inheritance

> *"C++의 다중 상속에서 — 단 하나의 부인할 수 없는 사실 = 단일 상속에서는 — 존재하지 않는 — 판도라의 — 복잡성 상자를 — 연다."* — Scott Meyers

상속이 체인소면 — 다중 상속 = 1950년대 — 안전장치 없는 — 체인소.

- **Mixins** — *Displayable, Persistant, Serializable, Sortable* 같은 — 작은 — 추상 클래스. "혼합". 다이아몬드 문제 — 피함(모두 — 독립적이면).
- Java/VB = 인터페이스의 다중 상속 + 클래스의 단일 상속. C++ = 둘 다.

### Why Are There So Many Rules for Inheritance?

> 상속은 — Primary Technical Imperative(복잡성 관리)에 — 반대로 작동하기 — 쉽다. 복잡성 통제 위해 — 상속에 — **무거운 편향**.

4-rule 결정:

- 공통 **데이터** O, **행동** X → 공통 객체를 — containment.
- 공통 **행동** O, **데이터** X → 공통 base에서 — derive.
- 공통 **데이터 + 행동** → 공통 base에서 — 상속.
- base가 — 자기 인터페이스를 — 통제하길 원하면 — 상속. derived가 — 자기 인터페이스 통제 → containment.

### Member Functions and Data

- **루틴 수 — 최소** — 클래스당 루틴 — 많을수록 — 결함률 ↑ (Basili et al 1996).
- **암묵 생성 함수·연산자 — 비활성화** — 원하지 않는 것은 — `private`로.
- **다른 클래스에 대한 — 직접 호출 최소화** — 직접 호출 수 = 결함과 — 통계적 상관.
- **다른 클래스에 대한 — 간접 호출 최소화** — `account.ContactPerson().DaytimeContactInfo().PhoneNumber()`.
  - **Law of Demeter** (Lieberherr & Holland 1989) — Object A는 — 자기 루틴 호출 OK. A가 — B를 인스턴스화하면 — B의 루틴 호출 OK. B가 — 제공한 객체의 — 루틴은 — 호출 X. `account.ContactPerson()` OK, `account.ContactPerson().DaytimeContactInfo()` X.
- **다른 클래스와의 — 협력 정도 — 최소**.

### Constructors

- **생성자에서 — 모든 멤버 데이터 — 초기화** — 저비용 방어 프로그래밍.
- **선언 순서대로 — 초기화** — 컴파일러에 따라 — 다른 순서가 — 이상한 버그.
- **Singleton: private constructor** — Java 예:
  ```java
  public class MaxId {
      private MaxId() { ... }
      public static MaxId GetInstance() { return m_instance; }
      private static final MaxId m_instance = new MaxId();
  }
  ```
- **Singleton: all static + reference counting** — 모든 데이터 static. 생성자에서 — counter 증가, 소멸자에서 — 감소.
- **deep copy를 — shallow copy보다 — 선호** — 증명될 때까지. shallow = ref count·safe copy·safe delete 추가 코드 — 오류 prone.

## §6.4 Reasons to Create a Class

PDF 요약 리스트의 — 13 정당한 이유:

- **실세계 객체 모델링** — 각 실세계 객체당 — 한 클래스.
- **추상 객체 모델링** — Shape ← Circle, Square. 추상 객체 — 추출이 — OO 설계의 큰 과제.
- **복잡성 감소** (KEY POINT) — 가장 — 중요한 이유. 클래스 작성 후 — 내부 모르고 — 사용.
- **복잡성 격리** — 오류가 — 한 클래스에 국지화.
- **구현 디테일 숨김**.
- **변경 효과 제한** — hardware/IO/복잡 데이터 타입/business rule.
- **전역 데이터 숨김** — access routine을 통해. "전역"이 — 실은 — class data였음을 — 자주 발견.
- **매개변수 전달 간소화** — 여러 루틴에 — 같은 매개변수 → class data로.
- **중앙 제어점** — 한 과제를 — 한 자리에서 — 통제. DB 읽기·쓰기를 — 한 클래스 → 평면 파일·인메모리로 변경 시 — 한 클래스만 영향.
- **재사용 가능 코드 촉진** — **HARD DATA** — NASA Software Engineering Lab (McGarry, Waligora, McDermott 1989) — 10 프로젝트 연구. 함수형 = **35% 재사용**. 객체지향 = **70% 이상**.
- **프로그램 패밀리 계획** (Parnas 1976) — 변할 부분을 — 자기 클래스에. 보험사 예 — 고객별 변동 부분을 — 자기 클래스에. "Custom software!"
- **관련 연산 — 묶음** — trig 함수, 통계, 문자열 조작.
- **특정 refactoring** — Ch 24의 refactoring이 — 새 클래스를 — 만든다.

### Classes to Avoid

- **God classes 회피** — Get()/Set()으로 — 다른 클래스의 — 데이터를 — 끝없이 — 추출 (Riel 1996).
- **무관한 클래스 제거** — 데이터만 있고 — 행동 X → 다른 클래스의 속성으로.
- **동사로 명명된 클래스 회피** — `DatabaseInitialization()`, `StringBuilder()` — 행동만 있고 — 데이터 X → 다른 클래스의 — 루틴으로.

## §6.5 Language-Specific Issues

언어마다 — 클래스 접근 — 다름. Java는 — 모든 루틴 — 오버라이드 가능 (default), `final` 키워드로 막음. C++는 — `virtual`로 — 오버라이드 가능. VB는 — `overridable`/`overrides`.

언어 의존 영역:

- 오버라이드된 ctor/dtor의 — 상속 트리 동작.
- 예외 처리 하의 — ctor/dtor.
- default constructor의 — 중요성.
- destructor/finalizer 호출 시점.
- 내장 연산자 (=, ==) 오버라이드의 — 지혜.
- 객체 생성·소멸 시 — 메모리 처리.

## §6.6 Beyond Classes: Packages

지난 수십 년 — 응집 단위가 — 점진적 — 증가. 명령문 → 루틴 → 클래스 → **패키지**.

Ada는 — 10년 전부터 — 패키지. Java도 — 패키지. C++/C# 네임스페이스 = — 좋은 한 걸음. 패키지 미지원 언어 = 컨벤션으로 — 자기 — "가난한 사람의 패키지":

- 명명 컨벤션 — public vs package-private 클래스 구별.
- 명명·코드 조직 — 어느 패키지에 — 속하는지 식별.
- 어느 패키지가 — 어느 패키지를 — 사용 가능한지 — 규칙(상속·containment).

## Key Points (§)

McConnell 원문 5가지:

1. 클래스 인터페이스 = 일관된 추상. 많은 문제는 — 이 한 원칙 위반에서.
2. 클래스 인터페이스는 — **무언가를 — 숨겨야 한다** — 시스템 인터페이스, 설계 결정, 또는 — 구현 디테일.
3. **Containment > Inheritance** — is-a를 — 모델링 안 하면.
4. 상속은 — 유용한 도구. 그러나 — 복잡성을 — 추가 → Primary Technical Imperative(복잡성 최소화)와 — **반대**.
5. **클래스는 — 복잡성 관리의 — 1차 도구**. 그 목적 달성에 — 충분한 — 주의를 — 설계에.

## 정리

- §6.1 — ADT가 — 클래스의 토대. Font 예제 + 8 이점 + HARD DATA 30% (Woodfield 1981).
- §6.2 — 좋은 인터페이스 = 일관된 추상 + 강한 캡슐화 + 의미 위반 경계.
- §6.3 — Containment 선호. 상속 = is-a만, LSP, 얕게, Bloch "상속은 캡슐화를 깬다".
- §6.4 — 13 정당한 이유. HARD DATA NASA 70% 재사용.
- §6.6 — 클래스 너머 = 패키지.

## 관련 항목

- [Ch 5: Design in Construction](/blog/programming/engineering/code-complete/ch05-Design-in-Construction)
- [Ch 7: High-Quality Routines](/blog/programming/engineering/code-complete/ch07-High-Quality-Routines)
- [Effective C++ Ch 32: public 상속 = is-a](/blog/programming/cpp/effective-cpp/item32-make-sure-public-inheritance-models-is-a)
- [Clean Code Ch 10: 클래스](/blog/programming/engineering/clean-code/chapter10-classes)
