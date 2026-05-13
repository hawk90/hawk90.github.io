---
title: "Ch 8: OCP — 개방-폐쇄 원칙"
date: 2025-06-03T02:00:00
description: "확장에는 열려 있고 변경에는 닫혀 있어야 한다. OCP의 본질은 의존성 방향을 통제해 변경의 영향 범위를 차단하는 것."
tags: [Architecture, SOLID, OCP]
series: "Clean Architecture"
seriesOrder: 8
---

## 이 챕터의 메시지

OCP는 1988년 Bertrand Meyer가 정식화한 원칙이다.

> **Software entities should be open for extension, but closed for modification.**

소프트웨어 개체는 **확장에는 열려** 있어야 하고, **변경에는 닫혀** 있어야 한다.

Martin의 해석은 다음과 같다 — 시스템의 동작을 확장(새 기능 추가)할 수 있으면서, 그 확장이 **기존 코드를 거의 변경하지 않도록** 만든다.

이 원칙이 정확히 무엇을 의미하는지는 종종 모호하다. Martin은 OCP의 본질을 **의존성 방향의 통제**로 본다.

## 단순한 예 — 보고서 생성

재무 보고서를 두 가지 형식으로 출력해야 한다. 웹과 종이.

```
[데이터 가져오기] → [데이터 처리] → [표시]
                                 ├→ 웹
                                 └→ 종이
```

**OCP 위반 디자인**:

```java
class FinancialReport {
  public void renderReport(Format f) {
    Data d = fetchData();
    Data processed = processData(d);
    if (f == WEB) renderHTML(processed);
    else if (f == PAPER) renderPDF(processed);
  }
}
```

새 형식(예: JSON)을 추가하려면 이 클래스를 수정해야 한다. OCP 위반.

**OCP 준수 디자인**:

```java
interface Presenter {
  void render(Data data);
}

class WebPresenter implements Presenter { ... }
class PaperPresenter implements Presenter { ... }
class JsonPresenter implements Presenter { ... }  // 새 형식

class FinancialReport {
  private Presenter presenter;
  public void renderReport() {
    Data d = fetchData();
    Data processed = processData(d);
    presenter.render(processed);
  }
}
```

새 형식은 **새 클래스 추가**로 처리된다. `FinancialReport`는 안 바뀐다.

## 의존성 방향이 핵심

표면적으로 OCP는 "if-else 대신 다형성"으로 보인다. Martin은 더 깊은 메시지가 있다고 본다.

**OCP의 본질은 의존성 방향 통제다.**

```
높은 수준 모듈 (정책, 안 바뀐다)
    ↑
    │ (의존)
    │
낮은 수준 모듈 (디테일, 바뀐다)
```

낮은 수준이 높은 수준에 의존해야 한다. 그 반대가 되면 — 즉 높은 수준이 낮은 수준에 의존하면 — 낮은 수준의 변경이 높은 수준을 흔든다.

위의 예에서 FinancialReport가 직접 WebPresenter, PaperPresenter를 알면 디테일이 정책을 흔든다. Presenter 인터페이스를 두고 그것만 알게 하면 디테일이 정책에 의존한다 — 화살표가 뒤집힌다.

## 컴포넌트 수준의 OCP

OCP는 클래스 수준에서만 작동하지 않는다. **컴포넌트 수준**에서 더 강력하다.

```
Component A (상위 정책)
    ↑
    │
Component B (중간)
    ↑
    │
Component C (저수준 디테일)
```

C의 변경은 B에 영향을 줄 수 있다. 그러나 A는 영향을 받지 않는다 — 컴포넌트 경계가 차단한다.

이게 컴포넌트 분리의 가치다. 한 컴포넌트 안의 변경이 다른 컴포넌트에 새 컴파일/배포를 강요하지 않는다.

## 정보 은닉이 OCP의 도구

OCP는 결국 **정보를 숨김으로써** 달성된다.

- 상위 정책은 하위 디테일을 모른다 (디테일 정보의 은닉)
- 인터페이스 뒤에서 디테일이 자유롭게 바뀐다
- 인터페이스 자체는 안정적으로 유지된다

OO의 캡슐화와 같은 정신이지만, 더 큰 범위에 적용된다.

## OCP의 한계 — 모든 변경을 닫을 수는 없다

Martin도 인정한다 — **모든 종류의 변경에 닫혀 있을 수는 없다**. 어떤 종류의 변경에 닫을지를 선택해야 한다.

```
"X 종류의 변경에 닫혀 있다."
- 새 보고서 형식 추가 — 닫혀 있음 (Presenter 추가)
- 처리 로직 변경 — 열려 있음 (FinancialReport 변경 필요)
```

따라서 OCP를 적용할 때는 **어떤 변경 축에 닫을 것인가**를 먼저 정해야 한다.

이 선택은 도메인 지식과 미래 예측에 의존한다. 잘못 예측하면 잘못된 추상을 만든다 — 변하지 않는 부분에 인터페이스를 두고, 변하는 부분이 변하지 않게 된다.

## "추측성 일반화"의 위험

OCP의 가장 흔한 실수 — **모든 부분을 미래 변경에 대비해 추상화**.

이건 YAGNI 위반이다. 실제로는 변하지 않을 부분에 인터페이스를 두면 코드만 복잡해지고 이득이 없다.

Refactoring 책의 "Speculative Generality" 냄새가 이 실수의 다른 이름이다. **변경이 실제로 들어왔을 때** 그 변경 축에 대해 OCP를 적용하는 게 정확하다.

## OCP와 진화적 디자인

Fowler의 Evolutionary Design과 결합되는 지점이 여기다.

1. 처음에는 단순하게 짠다 (OCP 신경 안 씀)
2. 변경 요구가 들어오면 그 변경 축에 OCP를 적용한다 (리팩터링)
3. 다른 변경 축에 대해서는 여전히 열려 있다 (단순함 유지)

이 방식이 가장 정확한 OCP다. **변경이 실제로 일어나는 곳에만 인터페이스**를 둔다.

## 정리

- OCP — **확장에 열려, 변경에 닫혀**
- 본질은 **의존성 방향 통제** — 디테일이 정책에 의존하게
- 클래스 수준뿐 아니라 **컴포넌트 수준**에 더 강력
- **정보 은닉**이 OCP의 도구
- 모든 변경에 닫을 수는 없다 — **어떤 변경 축에 닫을지 선택**해야
- 추측성 일반화는 OCP 남용 — **실제 변경이 올 때** 적용

## 다음 장 예고

다음 장은 **LSP** — Liskov Substitution Principle. 서브타입은 부모타입의 자리를 대체할 수 있어야 한다.

## 관련 항목

- [Ch 5: OO](/blog/programming/design/clean-architecture/chapter05-object-oriented-programming) — 다형성과 의존성 역전
- [C++ Software Design 가이드라인 5: 확장 대비](/blog/programming/cpp/cpp-software-design/guideline05-design-for-extension)
- [Refactoring Ch 10: 다형성으로 조건 교체](/blog/programming/design/refactoring/ch10) — OCP의 실전 도구
