---
title: "Chapter 9: The Pseudocode Programming Process"
date: 2025-06-20T09:00:00
description: "PPP — 의사 코드로 먼저 생각, 그 다음 코드로 옮기기. 함수 작성의 표준 흐름."
series: "Code Complete"
seriesOrder: 9
tags: [code-complete, pseudocode, PPP, McConnell]
draft: true
---

## 이 챕터의 메시지

McConnell이 권장하는 함수 작성 흐름이 **Pseudocode Programming Process (PPP)** 다.

> 코드를 짜기 전에 — **의사 코드**로 의도를 먼저 적는다.

이게 단순해 보이지만 — 실제론 함수의 책임, 흐름, 경계 조건을 사고로 풀어 두는 작업이다. 이 과정 없이 곧장 코드를 짜면 — 머릿속에서 모든 것을 풀어야 한다. 실수가 나기 쉽다.

## 핵심 내용

- **의사 코드로 먼저** — 자연어로 흐름을 적는다.
- 의사 코드가 **함수의 책임을 명확히** 한다.
- 의사 코드 → **주석으로 변환** → 그 사이에 실제 코드 채우기.
- 의사 코드는 **설계 검토에도 활용**.
- 한 함수당 PPP를 짧게 적용 — **분 단위**.

## PPP의 단계

McConnell이 제안하는 흐름.

### 1) 함수의 정보 정의

함수를 만들기 전에 다음을 답한다.

- 이 함수의 **책임**은 무엇인가?
- **입력**은 무엇이고 **출력**은 무엇인가?
- **전제 조건**과 **사후 조건**은?
- 어떤 **에러 케이스**를 처리해야 하는가?

### 2) 의사 코드 작성

자연어 + 약간의 구조로 흐름을 적는다.

```
function processOrder(order):
    검증한다 order가 유효한지
    만약 검증 실패면 → 에러 반환
    재고를 확인한다
    만약 재고 부족이면 → 에러 반환
    결제를 시도한다
    만약 결제 실패면 → 에러 반환
    주문을 저장한다
    이메일을 보낸다
    return 성공
```

이 단계에서 — **어떻게 구현할지는 신경 안 쓴다**. 무엇을 하는지에 집중.

### 3) 의사 코드 검토

의사 코드를 읽으며 자문한다.

- 흐름이 자연스러운가?
- 빠진 경계 조건은 없는가?
- 한 가지 일에 집중하는가?
- 너무 많은 책임이 있는가?

자연어로 적힌 게 어색하면 — **그것이 코드로도 어색할** 가능성이 크다. 의사 코드 단계에서 수정하는 게 훨씬 싸다.

### 4) 의사 코드를 주석으로

마음에 들면 — 의사 코드 한 줄 한 줄을 **함수 안의 주석**으로 변환.

```cpp
ResultCode processOrder(Order order) {
    // 검증한다 order가 유효한지
    // 만약 검증 실패면 → 에러 반환
    // 재고를 확인한다
    // 만약 재고 부족이면 → 에러 반환
    // 결제를 시도한다
    // ...
}
```

### 5) 주석 사이에 코드 채우기

각 주석 아래에 실제 코드를 채운다.

```cpp
ResultCode processOrder(Order order) {
    // 검증한다 order가 유효한지
    if (!order.isValid()) {
        return ResultCode::InvalidOrder;
    }
    // 재고를 확인한다
    if (!inventory.hasStock(order)) {
        return ResultCode::OutOfStock;
    }
    // 결제를 시도한다
    if (!payment.charge(order)) {
        return ResultCode::PaymentFailed;
    }
    // ...
}
```

### 6) 결과 검토

주석과 그 아래 코드의 행동이 일치하는지 본다. 일치하면 — **주석을 일부 또는 전부 제거**한다. 코드 자체로 의도가 드러나면 주석 불필요.

## PPP의 효과

- 함수의 책임이 **명확해진다**.
- 코드 짜기 전에 **설계 결함을 잡는다** — 가장 싼 시점.
- 함수가 **자연스럽게 짧아진다** — 의사 코드 한 줄당 코드 몇 줄.
- 작성 후 코드가 **자기 문서화** — 주석을 지워도 의도가 보임.

## 언제 PPP를 쓰나

- **익숙하지 않은 영역** — 도메인이나 라이브러리가 새로울 때.
- **복잡한 함수** — 흐름이 머리에 한 번에 안 잡힐 때.
- **새 시스템 시작** — 패턴이 정립 안 된 자리.

익숙한 함수(예: 단순 getter)엔 PPP가 과하다. 도구의 적절한 사용.

## 정리

- 코드 전에 **의사 코드**로 먼저 생각.
- 의사 코드가 **책임을 명확히**.
- 의사 코드 → 주석 → 코드 → 주석 정리.
- 설계 결함을 **가장 싼 시점**에 잡는다.
- 익숙한 함수엔 과함. **새 영역**에서 가치.

## 관련 항목

- [Ch 7: High-Quality Routines](/blog/programming/engineering/code-complete/ch07-High-Quality-Routines)
- [Ch 10: General Issues in Using Variables](/blog/programming/engineering/code-complete/ch10-General-Issues-in-Using-Variables)
- [Clean Code Ch 3: 함수](/blog/programming/engineering/clean-code/chapter03-functions)
