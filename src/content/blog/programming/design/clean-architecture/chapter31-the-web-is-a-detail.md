---
title: "Ch 31: 웹은 세부 사항이다"
date: 2025-06-02T07:00:00
description: "웹은 GUI의 한 변종일 뿐이다. UI는 비즈니스 규칙에서 분리해야 한다 — 핵심 로직과 UI의 진화 속도가 다르다."
tags: [Architecture, Web, GUI, Detail]
series: "Clean Architecture"
seriesOrder: 31
draft: true
---

## 이 챕터의 메시지

30장과 같은 메시지의 다른 적용.

> **웹도 세부 사항이다.**

웹은 GUI의 한 형태일 뿐이다. 비즈니스의 본질이 아니다.

## I/O 메커니즘의 역사

지난 50년의 I/O 메커니즘 변천.

- **카드 / 테이프** (1960년대)
- **터미널 / VT100** (1970-80년대)
- **클라이언트-서버 GUI** (1990년대)
- **웹** (2000년대)
- **모바일** (2010년대)
- **음성 / AR / VR** (2020년대 ~)

같은 비즈니스 기능이 각 시대마다 다른 UI로 사용자에게 전달됐다.

**비즈니스 본질은 거의 안 변했다.** UI만 변했다.

은행은 1970년에도, 2024년에도 "이자 계산" 비즈니스 규칙이 거의 같다. 그러나 UI는 카드 → 터미널 → 데스크톱 앱 → 웹 → 모바일 앱으로 진화했다.

## 같은 일이 미래에도

지금 우리가 "웹"을 절대적으로 다루는 건 1970년대 사람들이 "터미널"을 절대적으로 다룬 것과 같은 실수다.

- 10년 후엔 무엇이 표준일까? VR? 음성 인터페이스? Brain-computer interface?
- 지금 짜는 코드가 그때까지 살아남을까?

좋은 아키텍처는 **UI 진화에 살아남는다**. UI는 갈아 끼울 수 있게, 비즈니스 로직은 안정적이게.

## UI 격리 메커니즘

23장의 Presenter 패턴이 정확히 이 격리의 도구다.

```
[Use Case] (안정)
     ↓
[Presenter] (UI 변환)
     ↓
[View Model] (단순 데이터)
     ↓
[View] (현재 UI 기술 — Web/Mobile/Voice/...)
```

UI 기술이 변하면 **View와 View 어셈블리 부분만** 바뀐다. Presenter 위는 그대로.

## 흔한 함정 — UI 프레임워크에 잠긴 비즈니스 로직

```javascript
// 비즈니스 로직이 React 컴포넌트 안에 있음
function CheckoutComponent() {
  const [cart, setCart] = useState([]);
  
  function calculateTotal() {  // ⚠️ 비즈니스 로직
    let total = 0;
    for (const item of cart) {
      total += item.price;
      if (item.taxable) total *= 1.1;  // 비즈니스 규칙
    }
    if (total > 100) total *= 0.9;  // 더 많은 비즈니스 규칙
    return total;
  }
  
  return <div>{calculateTotal()}</div>;
}
```

`calculateTotal`이 비즈니스 로직이지만 React 컴포넌트 안에 갇혔다.

- React에서 Vue로 옮기려면 이 함수도 다시 짠다
- 단위 테스트하려면 React 환경이 필요하다
- 모바일 앱에서 같은 로직을 재사용 못 한다

해법은 분리.

```javascript
// 비즈니스 로직 — UI 무관
class CheckoutUseCase {
  calculateTotal(cart) {
    // ...
  }
}

// View — UI 전용
function CheckoutComponent() {
  const total = useCase.calculateTotal(cart);
  return <div>{total}</div>;
}
```

이제 비즈니스 로직은 어떤 UI 프레임워크에서든 재사용 가능. 단위 테스트도 React 없이 가능.

## "웹은 안 변한다"라는 잘못된 가정

흔한 반론 — "이미 모두가 웹을 쓴다. 안 바뀐다."

10년 후를 보자. iPhone 등장 후 모바일 첫이 많아졌다. 음성 비서가 보편화됐다. 곧 AR/VR이 더 많은 상호작용을 가져갈 것이다.

"웹은 안 변한다"는 가정은 항상 어긋났다. 30년 동안 UI 메커니즘은 5번 이상 큰 변화를 겪었다. 다음 변화가 안 올 거라 가정할 이유가 없다.

## 정리

- **웹은 세부 사항** — GUI의 한 형태
- UI 메커니즘은 끊임없이 진화 (카드 → 터미널 → 데스크톱 → 웹 → 모바일 → ?)
- 비즈니스 본질은 거의 안 변함
- 좋은 아키텍처는 **UI 진화에 살아남는다**
- 비즈니스 로직을 **UI 프레임워크 안에 가두지 마라**
- Presenter / View Model로 UI 격리

## 다음 장 예고

다음 장은 "프레임워크도 디테일". DB, 웹에 이어 framework까지.

## 관련 항목

- [Ch 23: Presenter](/blog/programming/design/clean-architecture/chapter23-presenters-and-humble-objects) — UI 격리의 도구
- [Ch 17: 경계](/blog/programming/design/clean-architecture/chapter17-boundaries-drawing-lines)
- [Ch 21: Screaming Architecture](/blog/programming/design/clean-architecture/chapter21-screaming-architecture) — 도메인 우선
