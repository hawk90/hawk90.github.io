---
title: "Ch 5: Maintaining the Test-Driven Cycle"
date: 2025-10-11T02:00:00
description: "외부 → 내부 (outside-in). 인수 → 단위 테스트로 좁혀가기."
tags: [TDD, Outside-In]
series: "Growing Object-Oriented Software"
seriesOrder: 5
---

Walking Skeleton이 완성되면 본격적인 개발이 시작된다. TDD 사이클을 어떻게 유지하면서 기능을 추가해 나갈 수 있을까?

## 5.1 이중 루프 TDD

### 바깥 루프와 안쪽 루프

```
┌───────────────────────────────────────────────────────────────┐
│                       Outer Loop                               │
│                   (인수 테스트 수준)                            │
│                                                                │
│   ┌────────────────────────────────────────────────────────┐  │
│   │  1. 실패하는 인수 테스트 작성                            │  │
│   │                      │                                  │  │
│   │                      ▼                                  │  │
│   │  ┌──────────────────────────────────────────────────┐  │  │
│   │  │              Inner Loop                           │  │  │
│   │  │            (단위 테스트 수준)                       │  │  │
│   │  │                                                    │  │  │
│   │  │    RED ──► GREEN ──► REFACTOR ──► RED ──► ...    │  │  │
│   │  │                                                    │  │  │
│   │  │    (필요한 만큼 반복)                               │  │  │
│   │  └──────────────────────────────────────────────────┘  │  │
│   │                      │                                  │  │
│   │                      ▼                                  │  │
│   │  2. 인수 테스트 통과!                                   │  │
│   └────────────────────────────────────────────────────────┘  │
│                      │                                         │
│                      ▼                                         │
│   3. 다음 기능을 위한 실패하는 인수 테스트 작성                 │
└───────────────────────────────────────────────────────────────┘
```

### 각 루프의 역할

| 루프 | 목적 | 범위 | 속도 |
|------|------|------|------|
| **Outer (인수)** | 전체 시스템이 동작하는가? | End-to-End | 느림 |
| **Inner (단위)** | 각 컴포넌트가 동작하는가? | 단일 객체 | 빠름 |

## 5.2 실패하는 인수 테스트로 시작

### 새 기능 추가: 입찰하기

```cpp
// 새로운 인수 테스트: 입찰 기능 추가
TEST_F(AuctionSniperE2ETest, MakesHigherBidButLoses) {
    // 경매 시작
    auction_.start_selling_item();

    // 스나이퍼가 참여
    application_.start_bidding_in(auction_);
    auction_.has_received_join_request_from_sniper();

    // 다른 입찰자가 1000에 입찰 (증분 98)
    auction_.report_price(1000, 98, "other bidder");

    // 스나이퍼가 더 높은 가격(1098)으로 입찰해야 함
    auction_.has_received_bid(1098, "sniper");

    // 경매 종료 (스나이퍼 패배)
    auction_.announce_closed();
    application_.shows_sniper_has_lost_auction();
}
```

```python
# 새로운 인수 테스트: 입찰 기능 추가
def test_makes_higher_bid_but_loses(self):
    """현재 가격보다 높게 입찰하지만 결국 패배"""
    # 경매 시작
    self.auction.start_selling_item()

    # 스나이퍼가 참여
    self.application.start_bidding_in(self.auction)
    self.auction.has_received_join_request_from_sniper()

    # 다른 입찰자가 1000에 입찰 (증분 98)
    self.auction.report_price(1000, 98, "other bidder")

    # 스나이퍼가 더 높은 가격(1098)으로 입찰해야 함
    self.auction.has_received_bid(1098, "sniper")

    # 경매 종료 (스나이퍼 패배)
    self.auction.announce_closed()
    self.application.shows_sniper_has_lost_auction()
```

### 테스트 상태: RED

```
이 테스트는 실패한다:

1. report_price() 메서드가 없음
2. has_received_bid() 메서드가 없음
3. 스나이퍼가 입찰 로직을 구현하지 않음

→ 이제 안쪽 루프로 들어간다
```

## 5.3 단위 테스트로 좁히기

### 어디서 시작할까?

```
┌─────────────────────────────────────────────────────────────┐
│              Outside-In 방향                                 │
│                                                             │
│   인수 테스트 실패                                           │
│         │                                                   │
│         ▼                                                   │
│   ┌─────────────┐                                          │
│   │ UI / Entry  │ ← 여기서 시작?                            │
│   └──────┬──────┘                                          │
│          │                                                  │
│   ┌──────┴──────┐                                          │
│   │  Translator │ ← 아니면 여기?                            │
│   └──────┬──────┘                                          │
│          │                                                  │
│   ┌──────┴──────┐                                          │
│   │   Sniper    │ ← 핵심 로직은 여기                        │
│   └─────────────┘                                          │
│                                                             │
│   GOOS 권장: 도메인 로직(Sniper)부터 시작                    │
│   → Mock을 사용해 협력자 정의                                │
└─────────────────────────────────────────────────────────────┘
```

### 첫 번째 단위 테스트

```cpp
// tests/unit/auction_sniper_test.cpp
#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "auction_sniper.h"
#include "mock_auction.h"

using ::testing::_;

class AuctionSniperTest : public ::testing::Test {
protected:
    MockAuction auction_;
    AuctionSniper sniper_{&auction_};
};

// 단위 테스트: 현재 가격 수신 시 더 높은 가격으로 입찰
TEST_F(AuctionSniperTest, BidsHigherWhenNewPriceArrives) {
    int price = 1001;
    int increment = 25;

    // 기대: auction.bid()가 price + increment 로 호출됨
    EXPECT_CALL(auction_, bid(price + increment));

    // 가격 정보 수신
    sniper_.current_price(price, increment, PriceSource::FromOtherBidder);
}
```

```python
# tests/unit/test_auction_sniper.py
from unittest.mock import Mock, create_autospec
from auction_sniper.sniper import AuctionSniper, PriceSource
from auction_sniper.auction import Auction

class TestAuctionSniper:
    def setup_method(self):
        self.auction = create_autospec(Auction)
        self.sniper = AuctionSniper(self.auction)

    def test_bids_higher_when_new_price_arrives(self):
        """현재 가격 수신 시 더 높은 가격으로 입찰"""
        price = 1001
        increment = 25

        # 가격 정보 수신
        self.sniper.current_price(price, increment, PriceSource.FROM_OTHER_BIDDER)

        # 검증: auction.bid()가 price + increment로 호출됨
        self.auction.bid.assert_called_once_with(price + increment)
```

### 테스트 통과시키기: GREEN

```cpp
// src/sniper/auction_sniper.cpp
void AuctionSniper::current_price(int price, int increment, PriceSource source) {
    if (source == PriceSource::FromOtherBidder) {
        auction_->bid(price + increment);
    }
}
```

```python
# src/auction_sniper/sniper.py
def current_price(self, price: int, increment: int, source: PriceSource) -> None:
    if source == PriceSource.FROM_OTHER_BIDDER:
        self.auction.bid(price + increment)
```

## 5.4 안쪽 루프 반복

### 다음 단위 테스트: 상태 변경

```cpp
// 입찰 후 상태가 Bidding으로 변경되어야 함
TEST_F(AuctionSniperTest, ReportsBiddingWhenNewPriceArrives) {
    MockSniperListener listener;
    AuctionSniper sniper{&auction_, &listener};

    // 기대: 상태가 Bidding으로 변경됨을 리스너에 알림
    EXPECT_CALL(listener, sniper_state_changed(SniperState::Bidding));
    EXPECT_CALL(auction_, bid(_));

    sniper.current_price(1001, 25, PriceSource::FromOtherBidder);
}

// 내가 입찰한 가격이 반영되면 Winning 상태로
TEST_F(AuctionSniperTest, ReportsWinningWhenCurrentPriceFromSniper) {
    MockSniperListener listener;
    AuctionSniper sniper{&auction_, &listener};

    // 기대: 내 입찰이 현재가가 되면 Winning
    EXPECT_CALL(listener, sniper_state_changed(SniperState::Winning));

    sniper.current_price(1000, 25, PriceSource::FromSniper);
}
```

```python
def test_reports_bidding_when_new_price_arrives(self):
    """입찰 후 상태가 Bidding으로 변경됨"""
    listener = create_autospec(SniperListener)
    sniper = AuctionSniper(self.auction, listener)

    sniper.current_price(1001, 25, PriceSource.FROM_OTHER_BIDDER)

    # 상태 변경 알림 확인
    listener.sniper_state_changed.assert_called_with(SniperState.BIDDING)

def test_reports_winning_when_current_price_from_sniper(self):
    """내 입찰이 현재가가 되면 Winning 상태"""
    listener = create_autospec(SniperListener)
    sniper = AuctionSniper(self.auction, listener)

    sniper.current_price(1000, 25, PriceSource.FROM_SNIPER)

    listener.sniper_state_changed.assert_called_with(SniperState.WINNING)
```

### 구현 확장

```cpp
// src/sniper/auction_sniper.cpp
class AuctionSniper : public AuctionEventListener {
    Auction* auction_;
    SniperListener* listener_;
    SniperState state_ = SniperState::Joining;

public:
    AuctionSniper(Auction* auction, SniperListener* listener)
        : auction_{auction}, listener_{listener} {}

    void current_price(int price, int increment, PriceSource source) override {
        if (source == PriceSource::FromOtherBidder) {
            auction_->bid(price + increment);
            state_ = SniperState::Bidding;
        } else {
            state_ = SniperState::Winning;
        }
        listener_->sniper_state_changed(state_);
    }

    void auction_closed() override {
        if (state_ == SniperState::Winning) {
            listener_->sniper_state_changed(SniperState::Won);
        } else {
            listener_->sniper_state_changed(SniperState::Lost);
        }
    }
};
```

```python
# src/auction_sniper/sniper.py
class AuctionSniper:
    def __init__(self, auction: Auction, listener: SniperListener):
        self.auction = auction
        self.listener = listener
        self.state = SniperState.JOINING

    def current_price(self, price: int, increment: int, source: PriceSource) -> None:
        if source == PriceSource.FROM_OTHER_BIDDER:
            self.auction.bid(price + increment)
            self.state = SniperState.BIDDING
        else:
            self.state = SniperState.WINNING
        self.listener.sniper_state_changed(self.state)

    def auction_closed(self) -> None:
        if self.state == SniperState.WINNING:
            self.listener.sniper_state_changed(SniperState.WON)
        else:
            self.listener.sniper_state_changed(SniperState.LOST)
```

## 5.5 바깥 루프로 돌아가기

### 인수 테스트 다시 실행

```
안쪽 루프 (단위 테스트)에서 충분히 구현했다면:

1. AuctionSniper가 current_price에 반응
2. 다른 입찰자의 가격에 더 높은 가격으로 입찰
3. 상태 변화를 리스너에 알림

→ 이제 인수 테스트가 통과할까?
→ 아직 아닐 수 있다!
```

### 빠진 조각 찾기

```
┌─────────────────────────────────────────────────────────────┐
│              통합 지점 점검                                   │
│                                                             │
│   [FakeAuctionServer]                                       │
│          │                                                  │
│          │ XMPP Message                                     │
│          ▼                                                  │
│   [AuctionMessageTranslator] ← 메시지 파싱 필요             │
│          │                                                  │
│          │ current_price() 호출                             │
│          ▼                                                  │
│   [AuctionSniper] ← 구현 완료                               │
│          │                                                  │
│          │ bid() 호출                                       │
│          ▼                                                  │
│   [XMPPAuction] ← XMPP 메시지 전송 필요                     │
│          │                                                  │
│          │ XMPP Message                                     │
│          ▼                                                  │
│   [FakeAuctionServer]                                       │
│                                                             │
│   → Translator와 XMPPAuction 구현 필요                      │
└─────────────────────────────────────────────────────────────┘
```

### 추가 단위 테스트

```cpp
// Translator 테스트
TEST(AuctionMessageTranslatorTest, NotifiesPriceWhenPriceMessage) {
    MockAuctionEventListener listener;
    AuctionMessageTranslator translator{&listener};

    EXPECT_CALL(listener, current_price(1000, 98, PriceSource::FromOtherBidder));

    translator.process_message(
        "SOLVersion: 1.1; Event: PRICE; CurrentPrice: 1000; "
        "Increment: 98; Bidder: other bidder;"
    );
}

// XMPPAuction 테스트
TEST(XMPPAuctionTest, SendsBidToAuction) {
    MockXmppConnection connection;
    XMPPAuction auction{&connection, "auction-item-123"};

    EXPECT_CALL(connection, send(HasSubstr("BID 1098")));

    auction.bid(1098);
}
```

```python
def test_notifies_price_when_price_message(self):
    """가격 메시지 수신 시 리스너에 알림"""
    listener = create_autospec(AuctionEventListener)
    translator = AuctionMessageTranslator(listener)

    translator.process_message(
        "SOLVersion: 1.1; Event: PRICE; CurrentPrice: 1000; "
        "Increment: 98; Bidder: other bidder;"
    )

    listener.current_price.assert_called_once_with(
        1000, 98, PriceSource.FROM_OTHER_BIDDER
    )

def test_sends_bid_to_auction(self):
    """입찰 시 XMPP 메시지 전송"""
    connection = create_autospec(XmppConnection)
    auction = XMPPAuction(connection, "auction-item-123")

    auction.bid(1098)

    # 전송된 메시지에 BID 1098 포함 확인
    connection.send.assert_called_once()
    message = connection.send.call_args[0][0]
    assert "BID 1098" in message
```

## 5.6 작은 단계로 진행하기

### 단계 크기 조절

```
┌─────────────────────────────────────────────────────────────┐
│              적절한 단계 크기                                 │
│                                                             │
│   너무 큰 단계:                                              │
│   - 실패 원인 파악 어려움                                    │
│   - 롤백 시 많은 작업 손실                                   │
│   - 디버깅 시간 증가                                        │
│                                                             │
│   너무 작은 단계:                                            │
│   - 진행이 느려짐                                           │
│   - 전체 그림 놓칠 수 있음                                   │
│                                                             │
│   적절한 단계:                                               │
│   - 5-10분 내에 완료 가능                                   │
│   - 하나의 동작/개념에 집중                                  │
│   - 실패해도 원인이 명확                                     │
│                                                             │
│   경험이 쌓이면 단계 크기 조절 가능                          │
└─────────────────────────────────────────────────────────────┘
```

### 막힐 때 대처법

```
테스트가 오래 실패하면:

1. 더 작은 단계로 분해
   ────────────────────
   큰 기능 → 여러 작은 테스트로 분리
   복잡한 조건 → 각 조건을 별도 테스트

2. 스파이크 (탐색적 코딩)
   ────────────────────
   테스트 없이 빠르게 실험
   동작 확인 후 코드 버리고
   테스트부터 다시 작성

3. 일단 통과시키고 리팩토링
   ────────────────────
   "죄악" 코드로 통과
   그 다음 천천히 개선
   테스트가 보호해줌
```

### 스파이크 예제

```cpp
// 스파이크: 메시지 파싱 실험
void experiment_message_parsing() {
    std::string message = "SOLVersion: 1.1; Event: PRICE; "
                          "CurrentPrice: 1000; Increment: 98;";

    // 정규식으로 파싱 시도
    std::regex price_regex{R"(CurrentPrice: (\d+))"};
    std::smatch match;
    if (std::regex_search(message, match, price_regex)) {
        std::cout << "Price: " << match[1] << "\n";
    }

    // 동작 확인!
    // → 이제 이 코드 버리고
    // → 테스트부터 작성
}
```

```python
# 스파이크: 메시지 파싱 실험
def experiment_message_parsing():
    message = "SOLVersion: 1.1; Event: PRICE; CurrentPrice: 1000; Increment: 98;"

    # 정규식으로 파싱 시도
    import re
    match = re.search(r'CurrentPrice: (\d+)', message)
    if match:
        print(f"Price: {match.group(1)}")

    # 동작 확인!
    # → 이제 이 코드 버리고
    # → 테스트부터 작성

# 실험 후 작성하는 테스트
def test_extracts_price_from_message():
    parser = MessageParser()
    result = parser.parse("CurrentPrice: 1000;")
    assert result.price == 1000
```

## 5.7 리팩토링 시점

### GREEN 직후

```
┌─────────────────────────────────────────────────────────────┐
│              리팩토링 규칙                                    │
│                                                             │
│   1. 테스트가 통과한 직후에만 리팩토링                       │
│      - RED 상태에서 리팩토링 금지                            │
│      - GREEN이 되면 즉시 리팩토링 기회                       │
│                                                             │
│   2. 작은 단계로 리팩토링                                    │
│      - 한 번에 하나의 변경                                   │
│      - 각 변경 후 테스트 실행                                │
│                                                             │
│   3. 동작 변경 없이                                          │
│      - 리팩토링 중에는 기능 추가 금지                        │
│      - 테스트가 계속 통과해야 함                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 리팩토링 예제

```cpp
// Before: 통과하지만 중복 있음
void AuctionSniper::current_price(int price, int increment, PriceSource source) {
    if (source == PriceSource::FromOtherBidder) {
        auction_->bid(price + increment);
        state_ = SniperState::Bidding;
        listener_->sniper_state_changed(state_);
    } else {
        state_ = SniperState::Winning;
        listener_->sniper_state_changed(state_);
    }
}

// After: 중복 제거
void AuctionSniper::current_price(int price, int increment, PriceSource source) {
    if (source == PriceSource::FromOtherBidder) {
        auction_->bid(price + increment);
        transition_to(SniperState::Bidding);
    } else {
        transition_to(SniperState::Winning);
    }
}

void AuctionSniper::transition_to(SniperState new_state) {
    state_ = new_state;
    listener_->sniper_state_changed(state_);
}
```

```python
# Before: 통과하지만 중복 있음
def current_price(self, price: int, increment: int, source: PriceSource) -> None:
    if source == PriceSource.FROM_OTHER_BIDDER:
        self.auction.bid(price + increment)
        self.state = SniperState.BIDDING
        self.listener.sniper_state_changed(self.state)
    else:
        self.state = SniperState.WINNING
        self.listener.sniper_state_changed(self.state)

# After: 중복 제거
def current_price(self, price: int, increment: int, source: PriceSource) -> None:
    if source == PriceSource.FROM_OTHER_BIDDER:
        self.auction.bid(price + increment)
        self._transition_to(SniperState.BIDDING)
    else:
        self._transition_to(SniperState.WINNING)

def _transition_to(self, new_state: SniperState) -> None:
    self.state = new_state
    self.listener.sniper_state_changed(self.state)
```

## 5.8 전체 흐름 요약

```
┌─────────────────────────────────────────────────────────────┐
│                   TDD 사이클 유지                            │
│                                                             │
│   1. 실패하는 인수 테스트 작성                               │
│      └── "시스템이 이 기능을 지원해야 한다"                  │
│                                                             │
│   2. 실패하는 단위 테스트 작성                               │
│      └── "이 객체가 이렇게 동작해야 한다"                    │
│                                                             │
│   3. 단위 테스트 통과시키기                                  │
│      └── 가장 단순한 구현                                   │
│                                                             │
│   4. 리팩토링                                               │
│      └── 중복 제거, 의도 명확화                             │
│                                                             │
│   5. 2-4 반복 (필요한 만큼)                                 │
│                                                             │
│   6. 인수 테스트 통과 확인                                   │
│      └── 모든 조각이 연결됨                                 │
│                                                             │
│   7. 다음 기능으로 (1로 돌아가기)                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 정리

| 개념 | 핵심 |
|------|------|
| **이중 루프** | 인수 테스트(바깥) + 단위 테스트(안쪽) |
| **Outside-In** | 바깥에서 시작해서 안으로 진행 |
| **작은 단계** | 5-10분 내 완료, 실패 원인 명확 |
| **스파이크** | 실험 후 버리고 테스트부터 다시 |
| **리팩토링** | GREEN 직후에만, 동작 변경 없이 |

**핵심 질문:**
> 지금 내가 작성하는 코드가 어느 루프에 속하는가? 인수 테스트를 향해 가고 있는가?

## 다음 장 예고

다음 장에서는 객체지향 스타일에 대해 다룬다. 좋은 객체는 어떤 특성을 가지며, TDD가 어떻게 좋은 설계를 이끌어내는지 살펴본다.
