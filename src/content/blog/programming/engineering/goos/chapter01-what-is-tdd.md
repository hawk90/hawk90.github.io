---
title: "Ch 1: What Is TDD?"
date: 2025-10-10T01:00:00
description: "TDD 정의 — Red/Green/Refactor 사이클. 단순 테스트 우선 vs 디자인 도구."
tags: [TDD, Red-Green-Refactor]
series: "Growing Object-Oriented Software"
seriesOrder: 1
draft: true
---

TDD는 단순히 "테스트를 먼저 작성하는 것"이 아니다. 테스트가 설계를 이끄는 개발 방법론이다.

## 1.1 TDD의 본질

### 테스트 = 설계 도구

```
┌─────────────────────────────────────────────────────────────┐
│                     TDD의 두 가지 측면                       │
│                                                             │
│   ┌─────────────────────┐   ┌─────────────────────┐        │
│   │     검증 (Testing)   │   │   설계 (Design)     │        │
│   │                     │   │                     │        │
│   │  코드가 의도대로     │   │  테스트가 처음으로   │        │
│   │  동작하는지 확인     │   │  코드를 사용하면서   │        │
│   │                     │   │  인터페이스 발견     │        │
│   └─────────────────────┘   └─────────────────────┘        │
│              │                        │                     │
│              └────────────┬───────────┘                     │
│                           │                                 │
│                    ┌──────┴──────┐                         │
│                    │    TDD     │                         │
│                    │ Test-Driven │                         │
│                    │   Design    │                         │
│                    └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

**핵심 통찰:**
> 테스트는 코드의 **첫 번째 사용자(client)**다. 테스트 작성이 어렵다면, 실제 사용자도 그 코드를 사용하기 어렵다.

### TDD vs Test-First

| 접근 | 목적 | 결과 |
|------|------|------|
| **Test-First** | 버그 방지 | 테스트 커버리지 |
| **TDD** | 설계 탐색 | 테스트 + 좋은 설계 |

## 1.2 Red-Green-Refactor 사이클

### 기본 사이클

![Red-Green-Refactor Cycle](/images/blog/goos/diagrams/ch01-red-green-refactor.svg)

### 각 단계의 규칙

#### RED: 실패하는 테스트 작성

```cpp
// C++ (Google Test)
TEST(AuctionMessageTranslatorTest, NotifiesClosedWhenCloseMessage) {
    // 아직 구현이 없으므로 컴파일조차 안 됨
    MockAuctionEventListener listener;
    AuctionMessageTranslator translator{&listener};

    EXPECT_CALL(listener, auction_closed()).Times(1);

    translator.process_message("SOLVersion: 1.1; Event: CLOSE;");
}
```

```python
# Python (pytest)
def test_notifies_closed_when_close_message():
    # 아직 구현이 없으므로 실패
    listener = Mock(spec=AuctionEventListener)
    translator = AuctionMessageTranslator(listener)

    translator.process_message("SOLVersion: 1.1; Event: CLOSE;")

    listener.auction_closed.assert_called_once()
```

**RED 단계 규칙:**
- 컴파일 에러도 "실패"다
- 한 번에 하나의 테스트만
- 테스트가 실패하는 이유를 명확히 알 것

#### GREEN: 최소한의 코드로 통과

```cpp
// C++ — 테스트를 통과시키는 가장 단순한 코드
class AuctionMessageTranslator {
    AuctionEventListener* listener_;
public:
    explicit AuctionMessageTranslator(AuctionEventListener* listener)
        : listener_{listener} {}

    void process_message(std::string_view message) {
        listener_->auction_closed();  // 일단 무조건 호출!
    }
};
```

```python
# Python — 가장 단순한 구현
class AuctionMessageTranslator:
    def __init__(self, listener):
        self.listener = listener

    def process_message(self, message):
        self.listener.auction_closed()  # 일단 무조건 호출!
```

**GREEN 단계 규칙:**
- "가장 단순한" 코드로 통과
- 완벽한 구현 아님
- 다음 테스트가 더 나은 구현을 요구할 것

#### REFACTOR: 코드 정리

```cpp
// C++ — 중복 제거, 명확성 향상
class AuctionMessageTranslator {
    AuctionEventListener* listener_;
public:
    explicit AuctionMessageTranslator(AuctionEventListener* listener)
        : listener_{listener} {}

    void process_message(std::string_view message) {
        auto event = AuctionEvent::from(message);

        if (event.type() == "CLOSE") {
            listener_->auction_closed();
        }
    }
};
```

```python
# Python — 리팩토링
class AuctionMessageTranslator:
    def __init__(self, listener):
        self.listener = listener

    def process_message(self, message: str):
        event = AuctionEvent.from_string(message)

        if event.type == "CLOSE":
            self.listener.auction_closed()
```

## 1.3 테스트 계층

### 세 가지 테스트 레벨

```
┌─────────────────────────────────────────────────────────────┐
│                    테스트 피라미드                           │
│                                                             │
│                         ╱╲                                  │
│                        ╱  ╲                                 │
│                       ╱    ╲                                │
│                      ╱ E2E  ╲     인수 테스트               │
│                     ╱────────╲    (Acceptance)              │
│                    ╱          ╲                             │
│                   ╱  통합      ╲   통합 테스트              │
│                  ╱──────────────╲  (Integration)            │
│                 ╱                ╲                          │
│                ╱     단위        ╲  단위 테스트             │
│               ╱────────────────────╲ (Unit)                 │
│                                                             │
│              많음 ─────────────────► 적음                   │
│              빠름 ─────────────────► 느림                   │
└─────────────────────────────────────────────────────────────┘
```

### 각 레벨의 역할

| 레벨 | 범위 | 목적 | 실행 속도 |
|------|------|------|-----------|
| **인수** | 전체 시스템 | 사용자 시나리오 검증 | 느림 |
| **통합** | 여러 컴포넌트 | 연동 검증 | 중간 |
| **단위** | 단일 객체/함수 | 로직 검증 | 빠름 |

### 인수 테스트 예시

```python
# Python — End-to-End 인수 테스트
def test_sniper_joins_auction_until_auction_closes():
    # 전체 시스템 통합
    auction = FakeAuctionServer("item-123")
    auction.start_selling_item()

    application = ApplicationRunner()
    application.start_bidding_in(auction)

    auction.has_received_join_request_from_sniper()

    auction.announce_closed()
    application.shows_sniper_has_lost_auction()
```

```cpp
// C++ — End-to-End 인수 테스트
TEST_F(AuctionSniperEndToEndTest, JoinsAuctionUntilAuctionCloses) {
    auction_.start_selling_item();

    application_.start_bidding_in(auction_);
    auction_.has_received_join_request_from_sniper();

    auction_.announce_closed();
    application_.shows_sniper_has_lost_auction();
}
```

## 1.4 Outside-In vs Inside-Out

### 두 가지 접근법

```
Outside-In (London/Mockist):

    ┌─────────┐
    │   UI    │ ◄─── 테스트 시작
    └────┬────┘
         │
    ┌────┴────┐
    │ Service │ ◄─── Mock으로 협력자 정의
    └────┬────┘
         │
    ┌────┴────┐
    │ Domain  │ ◄─── 마지막에 구현
    └─────────┘


Inside-Out (Detroit/Classical):

    ┌─────────┐
    │   UI    │ ◄─── 마지막에 통합
    └────┬────┘
         │
    ┌────┴────┐
    │ Service │ ◄─── 실제 객체로 테스트
    └────┬────┘
         │
    ┌────┴────┐
    │ Domain  │ ◄─── 테스트 시작
    └─────────┘
```

### GOOS의 선택: Outside-In

| 특성 | Outside-In | Inside-Out |
|------|------------|------------|
| **시작점** | 사용자 인터페이스 | 도메인 모델 |
| **협력자** | Mock으로 정의 | 실제 객체 사용 |
| **피드백** | 빠름 (격리됨) | 느림 (통합 필요) |
| **설계 발견** | 사용 측에서 인터페이스 발견 | 구현에서 인터페이스 도출 |

## 1.5 Walking Skeleton

### 개념

```
┌─────────────────────────────────────────────────────────────┐
│                    Walking Skeleton                         │
│                                                             │
│   "돌아다닐 수 있을 정도의 최소한의 뼈대"                    │
│                                                             │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   │
│   │   UI    │ → │ Service │ → │ Domain  │ → │   DB    │   │
│   │ (stub)  │   │ (stub)  │   │ (stub)  │   │ (real)  │   │
│   └─────────┘   └─────────┘   └─────────┘   └─────────┘   │
│                                                             │
│   모든 계층이 연결되어 있지만, 기능은 최소한                  │
└─────────────────────────────────────────────────────────────┘
```

### Walking Skeleton의 가치

| 가치 | 설명 |
|------|------|
| **위험 제거** | 통합 문제 조기 발견 |
| **인프라 확보** | 빌드/배포 파이프라인 구축 |
| **팀 정렬** | 전체 아키텍처 합의 |
| **진행 가시성** | "동작하는" 시스템 데모 |

## 1.6 TDD의 리듬: 이중 루프

![Double Loop TDD](/images/blog/goos/diagrams/ch01-double-loop.svg)

## 정리

| 개념 | 핵심 |
|------|------|
| **TDD** | 테스트가 설계를 이끄는 개발 |
| **Red-Green-Refactor** | 실패 → 통과 → 정리 사이클 |
| **테스트 계층** | 인수 → 통합 → 단위 |
| **Outside-In** | 사용자 관점에서 시작 |
| **Walking Skeleton** | 최소 E2E로 위험 제거 |

**핵심 질문:**
> 테스트 작성이 어렵다면, 그것은 테스트의 문제인가 설계의 문제인가?

## 다음 장 예고

다음 장에서는 객체지향과 TDD의 결합을 다룬다. "Tell, Don't Ask" 원칙과 역할/책임/협력 관점에서 객체를 바라보는 방법을 살펴본다.
