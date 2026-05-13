---
title: "Ch 6: 함수형 프로그래밍"
date: 2025-06-02T04:00:00
description: "함수형의 본질은 불변성이다. 동시성 문제는 모두 가변 상태에서 기인하며, 함수형은 그 문제를 뿌리부터 끊어 낸다."
tags: [Architecture, Functional, Immutability]
series: "Clean Architecture"
seriesOrder: 6
draft: true
---

## 이 챕터의 메시지

세 패러다임 중 마지막 — 함수형. 본질은 단순하다 — **변수가 변하지 않는다**.

이게 왜 중요한가? 모던 소프트웨어의 가장 큰 골칫거리들 — race condition, deadlock, 동시 수정 문제 — 이 모두 가변 상태에서 기인하기 때문이다. 변수가 변하지 않으면 이 문제들이 **존재하지 않는다**.

## 단순한 예 — 정수의 제곱

```java
// 명령형 (가변)
public class Squint {
  public static void main(String args[]) {
    for (int i = 0; i < 25; i++)
      System.out.println(i * i);
  }
}
```

`i`가 0에서 25까지 **변한다**. 변수 i는 시간에 따라 다른 값을 가진다.

```clojure
;; 함수형 (불변)
(println (take 25 (map (fn [x] (* x x)) (range))))
```

여기에는 **변하는 변수가 없다**. `range`는 0, 1, 2, ... 를 만들어 내는 무한 수열, `map`은 각각을 제곱으로 변환, `take 25`는 그중 25개만. 어떤 변수도 새 값을 받지 않는다.

## 왜 불변이 중요한가 — 동시성

소프트웨어의 모든 동시성 문제는 가변 상태 때문에 생긴다.

- **Race condition** — 두 스레드가 같은 변수를 동시에 읽고 쓴다
- **Deadlock** — 가변 자원의 락을 잡는 순서가 꼬인다
- **Lost update** — 한 쓰레드의 갱신이 다른 쓰레드의 갱신에 덮인다
- **Concurrent modification** — 한 쓰레드가 컨테이너를 순회하는 동안 다른 쓰레드가 그 컨테이너를 수정한다

이 모든 문제는 한 가지 가정을 공유한다 — **변수가 변한다**.

변수가 변하지 않으면 이 문제들이 모두 사라진다. 두 쓰레드가 같은 데이터를 동시에 읽어도 안전하다 — 변하지 않으니까.

## 가변성의 격리

그렇다면 모든 코드를 함수형으로 짜야 하는가? Martin은 그렇지 않다고 본다. 현실적으로는 **가변 상태를 격리**한다.

```
┌─────────────────────────────────┐
│   가변 컴포넌트 (작게 유지)      │
│  - 트랜잭션 메모리              │
│  - DB 갱신                      │
│  - 외부 I/O                     │
└─────────────────────────────────┘
            ↕
┌─────────────────────────────────┐
│   불변 컴포넌트 (대부분)         │
│  - 비즈니스 로직                 │
│  - 계산                         │
│  - 변환                         │
└─────────────────────────────────┘
```

대부분의 코드는 불변으로 짠다. 변경이 필요한 부분은 명시적으로 분리해서, 그 작은 부분에만 락이나 트랜잭션 같은 동시성 통제 장치를 적용한다.

> "Well-structured applications will be segregated into those components that do not mutate variables and those that do."

## Event Sourcing — 가변성 자체를 제거

더 극단적인 접근 — **상태를 아예 저장하지 않는다**. 대신 상태로 가는 **이벤트의 시퀀스**를 저장한다.

예를 들어 은행 계좌의 잔고를 직접 저장하는 대신, 모든 입출금 이벤트를 저장한다. 현재 잔고가 필요하면 모든 이벤트를 처음부터 더해서 계산한다.

```
가변 상태:
  account.balance = 1000;
  account.balance = 1100;  // +100
  account.balance = 900;   // -200

Event sourcing:
  events = [
    Deposit(1000),
    Deposit(100),
    Withdraw(200),
  ]
  balance = events.reduce(...);
```

처음에는 비효율로 보인다 — 매번 처음부터 계산? 그러나 이벤트 수가 일정 수준에 머무는 도메인에서는 충분히 실용적이다. 그리고 스냅샷을 주기적으로 저장하면 계산 비용도 일정하게 유지된다.

이 접근의 가치는 다음과 같다.

- **이벤트는 변하지 않는다** — 과거에 일어난 일은 바뀌지 않는다
- **모든 갱신은 새 이벤트** — race condition이 발생할 가변 위치가 없다
- **감사 가능(auditable)** — 어떤 일이 어떤 순서로 일어났는지 완벽히 기록된다

Git이 정확히 이 패턴이다. 파일의 현재 상태를 저장하는 게 아니라, 모든 커밋(이벤트)을 저장한다.

## 실용적 함수형

Martin은 100% 함수형을 권하지 않는다. 그건 학문적 이상이다. 현실적으로는 다음 균형을 권한다.

1. **기본은 불변** — 변수는 가능한 한 변경하지 않는다
2. **가변은 예외** — 정말 필요한 곳에서만, 그리고 명시적으로
3. **격리** — 가변 부분을 작고 명확한 모듈로 분리

이게 모던 소프트웨어 디자인의 일반 트렌드다. Java의 record, Kotlin의 val, JavaScript의 const, C++의 const — 모두 불변을 기본으로 만들려는 움직임이다.

## 함수형과 아키텍처

함수형이 아키텍처에 주는 것은 두 가지다.

**1. 안전한 동시성**

분산 시스템, 멀티 코어, 비동기 — 모두 함수형의 도움을 받는다. 가변 상태가 없으면 이 모든 환경이 단순해진다.

**2. 상태의 의미 명확화**

어디서 상태가 변하는지가 명시적으로 드러난다. 가변 컴포넌트는 작아지고, 그 안에서만 트랜잭션이나 락이 필요하다.

이게 Clean Architecture의 외곽 — **세부 사항(detail) 층** — 과도 연결된다. DB는 본질적으로 가변이다. 따라서 DB와의 상호작용은 함수형 핵심 정책의 외부에 있다. 그 외부 영역에만 가변성과 락이 들어간다.

## 정리

- 함수형의 본질은 **불변성**
- **동시성 문제는 모두 가변 상태에서 기인** — 변수가 변하지 않으면 그 문제들은 존재하지 않는다
- 100% 함수형은 비현실적 — **가변성을 격리**하는 것이 실용적
- **Event Sourcing** — 상태 대신 이벤트의 시퀀스를 저장하는 극단적 접근 (Git이 이 패턴)
- 함수형이 아키텍처에 주는 것은 **안전한 동시성**과 **상태의 명확화**
- Clean Architecture의 외곽(detail)이 가변성의 자리

## 다음 장 예고

다음 장부터는 **디자인 원칙 — SOLID 5개**가 시작된다. SRP, OCP, LSP, ISP, DIP 각 한 챕터씩.

## 관련 항목

- [Ch 3: 패러다임 개요](/blog/programming/design/clean-architecture/chapter03-paradigm-overview) — 세 패러다임의 종합
- [C++ Software Design 가이드라인 22: 값 의미론](/blog/programming/cpp/cpp-software-design/guideline22-prefer-value-semantics-over-reference-semantics) — 불변의 가치
- [Refactoring Ch 9: 데이터 조직화](/blog/programming/design/refactoring/ch09) — Change Reference to Value
