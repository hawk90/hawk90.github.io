---
title: "Ch 11-18: Passing the First Test → Final Features"
date: 2025-10-12T04:00:00
description: "Worked Example 8 챕터 압축 — 점진적 기능 추가, 리팩토링, mock 사용 실전."
tags: [TDD, Case Study, Mock]
series: "Growing Object-Oriented Software"
seriesOrder: 11
---

> "Make it work, make it right, make it fast."
> — Kent Beck

이 장에서는 책의 Chapter 11-18에 해당하는 **Worked Example**을 통합하여 다룬다. Walking Skeleton을 기반으로 Auction Sniper의 기능을 점진적으로 확장하는 과정을 보여준다.

---

## 개요: 8개 챕터의 여정

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKED EXAMPLE JOURNEY                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Ch 11: Passing the First Test                                  │
│         └─▶ 경매 참가 → 종료 → LOST 표시                        │
│                                                                 │
│  Ch 12: Getting Ready to Bid                                    │
│         └─▶ 가격 메시지 수신 및 파싱                            │
│                                                                 │
│  Ch 13: The Sniper Makes a Bid                                  │
│         └─▶ 입찰 로직 구현, BIDDING 상태                        │
│                                                                 │
│  Ch 14: The Sniper Wins an Auction                              │
│         └─▶ 낙찰 판정, WON 상태                                 │
│                                                                 │
│  Ch 15: Towards a Real User Interface                           │
│         └─▶ 테이블 UI, 다중 아이템 표시                         │
│                                                                 │
│  Ch 16: Sniping for Multiple Items                              │
│         └─▶ 여러 경매 동시 참가                                 │
│                                                                 │
│  Ch 17: Teasing Apart Main                                      │
│         └─▶ 책임 분리, 의존성 주입                              │
│                                                                 │
│  Ch 18: Filling in the Details                                  │
│         └─▶ 최대가 제한, 에러 처리, 완성                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Ch 11: Passing the First Test

### 목표: 경매 참가 후 패배

첫 번째 테스트를 통과시키는 것이 목표다:

```cpp
// C++ - 첫 번째 인수 테스트
TEST_F(AuctionSniperEndToEndTest,
       SniperJoinsAuctionUntilAuctionCloses) {
    auction_.start_selling_item();
    application_.start_bidding_in(auction_);
    auction_.has_received_join_request_from_sniper(SNIPER_XMPP_ID);
    auction_.announce_closed();
    application_.shows_sniper_has_lost_auction();
}
```

### 구현 단계

```
┌─────────────────────────────────────────────────────────────────┐
│                  CH 11: IMPLEMENTATION STEPS                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: XMPP 연결                                              │
│  ─────────────────                                              │
│  • 경매 서버에 연결                                             │
│  • 채팅방(MUC) 입장                                             │
│                                                                 │
│  Step 2: JOIN 메시지 전송                                       │
│  ─────────────────────────                                      │
│  • "SOLVersion: 1.1; Command: JOIN;"                            │
│  • UI에 "JOINING" 표시                                          │
│                                                                 │
│  Step 3: CLOSE 메시지 수신                                      │
│  ─────────────────────────                                      │
│  • 메시지 리스너 등록                                           │
│  • CLOSE 이벤트 감지                                            │
│                                                                 │
│  Step 4: LOST 상태 전이                                         │
│  ─────────────────────────                                      │
│  • UI에 "LOST" 표시                                             │
│  • 테스트 통과 ✓                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### AuctionMessageTranslator 구현

```cpp
// C++ - 메시지 번역기
class AuctionMessageTranslator : public MessageListener {
public:
    explicit AuctionMessageTranslator(AuctionEventListener* listener)
        : listener_(listener) {}

    void process_message(const std::string& message) override {
        auto event = AuctionEvent::from(message);

        if (event.type() == "CLOSE") {
            listener_->auction_closed();
        }
    }

private:
    AuctionEventListener* listener_;
};

class AuctionEventListener {
public:
    virtual ~AuctionEventListener() = default;
    virtual void auction_closed() = 0;
};
```

```python
# Python - 메시지 번역기
from abc import ABC, abstractmethod
from dataclasses import dataclass


class AuctionEventListener(ABC):
    @abstractmethod
    def auction_closed(self) -> None:
        pass


@dataclass
class AuctionEvent:
    type: str
    values: dict

    @staticmethod
    def from_message(message: str) -> "AuctionEvent":
        parsed = AuctionMessageParser.parse(message)
        return AuctionEvent(
            type=parsed.event_or_command,
            values=parsed.values
        )


class AuctionMessageTranslator:
    def __init__(self, listener: AuctionEventListener):
        self._listener = listener

    def process_message(self, message: str) -> None:
        event = AuctionEvent.from_message(message)

        if event.type == "CLOSE":
            self._listener.auction_closed()
```

---

## Ch 12: Getting Ready to Bid

### 목표: 가격 정보 수신

경매 서버의 가격 메시지를 수신하고 파싱한다:

```cpp
// C++ - 가격 정보 수신 테스트
TEST_F(AuctionSniperEndToEndTest,
       SniperReceivesPriceUpdateFromAuction) {
    auction_.start_selling_item();
    application_.start_bidding_in(auction_);
    auction_.has_received_join_request_from_sniper(SNIPER_XMPP_ID);

    // 가격 정보 전송
    auction_.report_price(1000, 98, "other bidder");

    // Sniper가 BIDDING 상태로 전이
    application_.shows_sniper_is_bidding(1000, 1098);
}
```

### AuctionEventListener 확장

```cpp
// C++ - 가격 이벤트 추가
class AuctionEventListener {
public:
    virtual ~AuctionEventListener() = default;
    virtual void auction_closed() = 0;
    virtual void current_price(int price, int increment,
                               PriceSource source) = 0;
};

enum class PriceSource {
    FROM_SNIPER,
    FROM_OTHER_BIDDER
};

// 번역기 업데이트
void AuctionMessageTranslator::process_message(const std::string& message) {
    auto event = AuctionEvent::from(message);

    if (event.type() == "CLOSE") {
        listener_->auction_closed();
    } else if (event.type() == "PRICE") {
        listener_->current_price(
            event.get_int("CurrentPrice"),
            event.get_int("Increment"),
            event.get_string("Bidder") == sniper_id_
                ? PriceSource::FROM_SNIPER
                : PriceSource::FROM_OTHER_BIDDER
        );
    }
}
```

```python
# Python - 가격 이벤트 추가
from enum import Enum, auto


class PriceSource(Enum):
    FROM_SNIPER = auto()
    FROM_OTHER_BIDDER = auto()


class AuctionEventListener(ABC):
    @abstractmethod
    def auction_closed(self) -> None:
        pass

    @abstractmethod
    def current_price(self, price: int, increment: int, source: PriceSource) -> None:
        pass


class AuctionMessageTranslator:
    def __init__(self, listener: AuctionEventListener, sniper_id: str):
        self._listener = listener
        self._sniper_id = sniper_id

    def process_message(self, message: str) -> None:
        event = AuctionEvent.from_message(message)

        if event.type == "CLOSE":
            self._listener.auction_closed()
        elif event.type == "PRICE":
            source = (
                PriceSource.FROM_SNIPER
                if event.values.get("Bidder") == self._sniper_id
                else PriceSource.FROM_OTHER_BIDDER
            )
            self._listener.current_price(
                int(event.values["CurrentPrice"]),
                int(event.values["Increment"]),
                source
            )
```

---

## Ch 13: The Sniper Makes a Bid

### 목표: 입찰 로직 구현

다른 입찰자가 입찰하면 Sniper도 입찰한다:

```
┌─────────────────────────────────────────────────────────────────┐
│                   BIDDING STATE MACHINE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│      ┌─────────┐                                                │
│      │ JOINING │                                                │
│      └────┬────┘                                                │
│           │ PRICE (from other)                                  │
│           ▼                                                     │
│      ┌─────────┐         PRICE (from other)                     │
│      │ BIDDING │◀────────────────────────────┐                  │
│      └────┬────┘                             │                  │
│           │                                  │                  │
│           │ PRICE (from sniper)              │                  │
│           ▼                                  │                  │
│      ┌─────────┐                             │                  │
│      │ WINNING │─────────────────────────────┘                  │
│      └────┬────┘                                                │
│           │                                                     │
│           │ CLOSE                                               │
│           ▼                                                     │
│      ┌─────────┐                                                │
│      │   WON   │                                                │
│      └─────────┘                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### AuctionSniper 핵심 로직

```cpp
// C++ - AuctionSniper 입찰 로직
class AuctionSniper : public AuctionEventListener {
public:
    AuctionSniper(const std::string& item_id,
                  Auction* auction,
                  SniperListener* listener)
        : snapshot_(SniperSnapshot::joining(item_id))
        , auction_(auction)
        , listener_(listener) {}

    void auction_closed() override {
        snapshot_ = snapshot_.closed();
        notify_change();
    }

    void current_price(int price, int increment, PriceSource source) override {
        if (source == PriceSource::FROM_OTHER_BIDDER) {
            int bid = price + increment;
            auction_->bid(bid);
            snapshot_ = snapshot_.bidding(price, bid);
        } else {
            snapshot_ = snapshot_.winning(price);
        }
        notify_change();
    }

private:
    void notify_change() {
        listener_->sniper_state_changed(snapshot_);
    }

    SniperSnapshot snapshot_;
    Auction* auction_;
    SniperListener* listener_;
};
```

```python
# Python - AuctionSniper 입찰 로직
class AuctionSniper(AuctionEventListener):
    def __init__(self, item_id: str, auction: Auction, listener: SniperListener):
        self._snapshot = SniperSnapshot.joining(item_id)
        self._auction = auction
        self._listener = listener

    def auction_closed(self) -> None:
        self._snapshot = self._snapshot.closed()
        self._notify_change()

    def current_price(self, price: int, increment: int, source: PriceSource) -> None:
        if source == PriceSource.FROM_OTHER_BIDDER:
            bid = price + increment
            self._auction.bid(bid)
            self._snapshot = self._snapshot.bidding(price, bid)
        else:
            self._snapshot = self._snapshot.winning(price)
        self._notify_change()

    def _notify_change(self) -> None:
        self._listener.sniper_state_changed(self._snapshot)
```

### 단위 테스트

```cpp
// C++ - AuctionSniper 단위 테스트
class AuctionSniperTest : public ::testing::Test {
protected:
    void SetUp() override {
        sniper_ = std::make_unique<AuctionSniper>(
            ITEM_ID, &auction_, &listener_);
    }

    static constexpr const char* ITEM_ID = "item-12345";
    MockAuction auction_;
    MockSniperListener listener_;
    std::unique_ptr<AuctionSniper> sniper_;
};

TEST_F(AuctionSniperTest, BidsHigherWhenNewPriceArrivesFromOtherBidder) {
    int price = 1001;
    int increment = 25;
    int bid = price + increment;

    EXPECT_CALL(auction_, bid(bid));
    EXPECT_CALL(listener_, sniper_state_changed(
        SniperState(ITEM_ID, price, bid, SniperState::BIDDING)));

    sniper_->current_price(price, increment, PriceSource::FROM_OTHER_BIDDER);
}

TEST_F(AuctionSniperTest, ReportsWinningWhenCurrentPriceComesFromSniper) {
    int price = 123;

    EXPECT_CALL(listener_, sniper_state_changed(
        SniperState(ITEM_ID, price, 0, SniperState::WINNING)));

    sniper_->current_price(price, 45, PriceSource::FROM_SNIPER);
}
```

```python
# Python - AuctionSniper 단위 테스트
import pytest
from unittest.mock import Mock


class TestAuctionSniper:
    ITEM_ID = "item-12345"

    @pytest.fixture
    def auction(self):
        return Mock(spec=Auction)

    @pytest.fixture
    def listener(self):
        return Mock(spec=SniperListener)

    @pytest.fixture
    def sniper(self, auction, listener):
        return AuctionSniper(self.ITEM_ID, auction, listener)

    def test_bids_higher_when_new_price_arrives_from_other_bidder(
        self, sniper, auction, listener
    ):
        price = 1001
        increment = 25
        bid = price + increment

        sniper.current_price(price, increment, PriceSource.FROM_OTHER_BIDDER)

        auction.bid.assert_called_once_with(bid)
        listener.sniper_state_changed.assert_called_once()
        snapshot = listener.sniper_state_changed.call_args[0][0]
        assert snapshot.state == SniperState.BIDDING
        assert snapshot.last_price == price
        assert snapshot.last_bid == bid

    def test_reports_winning_when_current_price_comes_from_sniper(
        self, sniper, auction, listener
    ):
        price = 123

        sniper.current_price(price, 45, PriceSource.FROM_SNIPER)

        auction.bid.assert_not_called()
        listener.sniper_state_changed.assert_called_once()
        snapshot = listener.sniper_state_changed.call_args[0][0]
        assert snapshot.state == SniperState.WINNING
```

---

## Ch 14: The Sniper Wins an Auction

### 목표: 낙찰 처리

WINNING 상태에서 경매가 종료되면 WON 상태로 전이:

```cpp
// C++ - 낙찰 테스트
TEST_F(AuctionSniperEndToEndTest, SniperWinsAnAuctionByBiddingHigher) {
    auction_.start_selling_item();
    application_.start_bidding_in(auction_);
    auction_.has_received_join_request_from_sniper(SNIPER_XMPP_ID);

    // 다른 입찰자의 가격
    auction_.report_price(1000, 98, "other bidder");
    application_.has_shown_sniper_is_bidding(1000, 1098);

    // Sniper의 입찰 확인
    auction_.has_received_bid(1098, SNIPER_XMPP_ID);

    // Sniper가 최고 입찰자임을 알림
    auction_.report_price(1098, 97, SNIPER_XMPP_ID);
    application_.has_shown_sniper_is_winning(1098);

    // 경매 종료
    auction_.announce_closed();
    application_.shows_sniper_has_won_auction(1098);
}
```

```python
# Python - 낙찰 테스트
def test_sniper_wins_an_auction_by_bidding_higher(self):
    self.auction.start_selling_item()
    self.application.start_bidding_in(self.auction)
    self.auction.has_received_join_request_from_sniper(self.SNIPER_XMPP_ID)

    # 다른 입찰자의 가격
    self.auction.report_price(1000, 98, "other bidder")
    self.application.has_shown_sniper_is_bidding(1000, 1098)

    # Sniper의 입찰 확인
    self.auction.has_received_bid(1098, self.SNIPER_XMPP_ID)

    # Sniper가 최고 입찰자임을 알림
    self.auction.report_price(1098, 97, self.SNIPER_XMPP_ID)
    self.application.has_shown_sniper_is_winning(1098)

    # 경매 종료
    self.auction.announce_closed()
    self.application.shows_sniper_has_won_auction(1098)
```

### SniperSnapshot 상태 전이

```cpp
// C++ - SniperSnapshot 상태 전이
SniperSnapshot SniperSnapshot::closed() const {
    switch (state_) {
        case SniperState::WINNING:
            return SniperSnapshot(item_id_, last_price_, last_bid_,
                                  SniperState::WON);
        default:
            return SniperSnapshot(item_id_, last_price_, last_bid_,
                                  SniperState::LOST);
    }
}
```

```python
# Python - SniperSnapshot 상태 전이
def closed(self) -> "SniperSnapshot":
    if self.state == SniperState.WINNING:
        return SniperSnapshot(
            self.item_id, self.last_price, self.last_bid, SniperState.WON
        )
    return SniperSnapshot(
        self.item_id, self.last_price, self.last_bid, SniperState.LOST
    )
```

---

## Ch 15: Towards a Real User Interface

### 목표: 테이블 형태 UI

여러 경매 상태를 테이블로 표시:

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUCTION SNIPER UI                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┬────────────┬───────────┬───────────────────┐│
│  │    Item ID    │ Last Price │ Last Bid  │      Status       ││
│  ├───────────────┼────────────┼───────────┼───────────────────┤│
│  │  item-54321   │    1000    │   1098    │     BIDDING       ││
│  │  item-65432   │     500    │    550    │     WINNING       ││
│  │  item-76543   │     200    │      0    │       LOST        ││
│  └───────────────┴────────────┴───────────┴───────────────────┘│
│                                                                 │
│  [Add Item] [____________] [Start]                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### SnipersTableModel 구현

```cpp
// C++ - 테이블 모델
class SnipersTableModel : public SniperListener {
public:
    enum Column { ITEM_ID = 0, LAST_PRICE, LAST_BID, STATE, COLUMN_COUNT };

    void sniper_state_changed(const SniperSnapshot& snapshot) override {
        int row = find_row_for(snapshot.item_id());
        if (row >= 0) {
            snapshots_[row] = snapshot;
            fire_table_row_updated(row);
        }
    }

    void add_sniper(const SniperSnapshot& snapshot) {
        snapshots_.push_back(snapshot);
        fire_table_row_inserted(snapshots_.size() - 1);
    }

    int row_count() const { return snapshots_.size(); }
    int column_count() const { return COLUMN_COUNT; }

    std::string cell_value(int row, int column) const {
        const auto& snapshot = snapshots_[row];
        switch (column) {
            case ITEM_ID: return snapshot.item_id();
            case LAST_PRICE: return std::to_string(snapshot.last_price());
            case LAST_BID: return std::to_string(snapshot.last_bid());
            case STATE: return state_to_string(snapshot.state());
            default: return "";
        }
    }

private:
    std::vector<SniperSnapshot> snapshots_;

    int find_row_for(const std::string& item_id) const {
        for (size_t i = 0; i < snapshots_.size(); ++i) {
            if (snapshots_[i].item_id() == item_id) return i;
        }
        return -1;
    }

    void fire_table_row_updated(int row) { /* UI 알림 */ }
    void fire_table_row_inserted(int row) { /* UI 알림 */ }
};
```

```python
# Python - 테이블 모델
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class SnipersTableModel(SniperListener):
    """경매 상태 테이블 모델"""

    class Column:
        ITEM_ID = 0
        LAST_PRICE = 1
        LAST_BID = 2
        STATE = 3
        COUNT = 4

    _snapshots: List[SniperSnapshot] = field(default_factory=list)
    _listeners: List = field(default_factory=list)

    def sniper_state_changed(self, snapshot: SniperSnapshot) -> None:
        row = self._find_row_for(snapshot.item_id)
        if row >= 0:
            self._snapshots[row] = snapshot
            self._fire_table_row_updated(row)

    def add_sniper(self, snapshot: SniperSnapshot) -> None:
        self._snapshots.append(snapshot)
        self._fire_table_row_inserted(len(self._snapshots) - 1)

    @property
    def row_count(self) -> int:
        return len(self._snapshots)

    @property
    def column_count(self) -> int:
        return self.Column.COUNT

    def cell_value(self, row: int, column: int) -> str:
        snapshot = self._snapshots[row]
        if column == self.Column.ITEM_ID:
            return snapshot.item_id
        elif column == self.Column.LAST_PRICE:
            return str(snapshot.last_price)
        elif column == self.Column.LAST_BID:
            return str(snapshot.last_bid)
        elif column == self.Column.STATE:
            return snapshot.state.name
        return ""

    def _find_row_for(self, item_id: str) -> int:
        for i, snapshot in enumerate(self._snapshots):
            if snapshot.item_id == item_id:
                return i
        return -1

    def _fire_table_row_updated(self, row: int) -> None:
        for listener in self._listeners:
            listener.on_row_updated(row)

    def _fire_table_row_inserted(self, row: int) -> None:
        for listener in self._listeners:
            listener.on_row_inserted(row)
```

---

## Ch 16: Sniping for Multiple Items

### 목표: 다중 경매 지원

여러 경매에 동시 참가:

```cpp
// C++ - 다중 경매 테스트
TEST_F(AuctionSniperEndToEndTest, SnipesMultipleItems) {
    auction1_.start_selling_item();
    auction2_.start_selling_item();

    application_.start_bidding_in(auction1_, auction2_);

    auction1_.has_received_join_request_from_sniper(SNIPER_XMPP_ID);
    auction2_.has_received_join_request_from_sniper(SNIPER_XMPP_ID);

    auction1_.report_price(1000, 98, "other bidder");
    auction2_.report_price(500, 21, "other bidder");

    application_.has_shown_sniper_is_bidding(auction1_, 1000, 1098);
    application_.has_shown_sniper_is_bidding(auction2_, 500, 521);

    auction1_.has_received_bid(1098, SNIPER_XMPP_ID);
    auction2_.has_received_bid(521, SNIPER_XMPP_ID);

    auction1_.announce_closed();
    auction2_.announce_closed();

    application_.shows_sniper_has_lost_auction(auction1_, 1098);
    application_.shows_sniper_has_lost_auction(auction2_, 521);
}
```

### SniperPortfolio 구현

```cpp
// C++ - Sniper 포트폴리오
class SniperPortfolio : public SniperCollector {
public:
    void add_sniper(AuctionSniper* sniper) override {
        snipers_.push_back(sniper);
        fire_sniper_added(sniper);
    }

    void add_portfolio_listener(PortfolioListener* listener) {
        listeners_.push_back(listener);
    }

private:
    void fire_sniper_added(AuctionSniper* sniper) {
        for (auto* listener : listeners_) {
            listener->sniper_added(sniper);
        }
    }

    std::vector<AuctionSniper*> snipers_;
    std::vector<PortfolioListener*> listeners_;
};

class PortfolioListener {
public:
    virtual ~PortfolioListener() = default;
    virtual void sniper_added(AuctionSniper* sniper) = 0;
};
```

```python
# Python - Sniper 포트폴리오
from typing import Protocol


class PortfolioListener(Protocol):
    def sniper_added(self, sniper: "AuctionSniper") -> None:
        ...


class SniperPortfolio:
    def __init__(self):
        self._snipers: List[AuctionSniper] = []
        self._listeners: List[PortfolioListener] = []

    def add_sniper(self, sniper: AuctionSniper) -> None:
        self._snipers.append(sniper)
        self._fire_sniper_added(sniper)

    def add_portfolio_listener(self, listener: PortfolioListener) -> None:
        self._listeners.append(listener)

    def _fire_sniper_added(self, sniper: AuctionSniper) -> None:
        for listener in self._listeners:
            listener.sniper_added(sniper)
```

---

## Ch 17: Teasing Apart Main

### 목표: 책임 분리

Main 클래스의 책임을 분리하여 테스트 가능하게 만든다:

```
┌─────────────────────────────────────────────────────────────────┐
│                    RESPONSIBILITY SEPARATION                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Before:                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                        Main                              │   │
│  │  • XMPP 연결                                             │   │
│  │  • UI 생성                                               │   │
│  │  • Sniper 생성                                           │   │
│  │  • 이벤트 처리                                           │   │
│  │  • 메시지 전송                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  After:                                                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │      Main      │  │ AuctionHouse   │  │  SniperLauncher │    │
│  │  • 시작점      │  │  • XMPP 연결   │  │  • Sniper 생성  │    │
│  │  • 조립       │  │  • Auction 생성 │  │  • 시작/종료    │    │
│  └────────────────┘  └────────────────┘  └────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### AuctionHouse 추출

```cpp
// C++ - AuctionHouse 인터페이스
class AuctionHouse {
public:
    virtual ~AuctionHouse() = default;
    virtual Auction* auction_for(const std::string& item_id) = 0;
    virtual void disconnect() = 0;
};

// XMPP 구현
class XMPPAuctionHouse : public AuctionHouse {
public:
    XMPPAuctionHouse(XMPPConnection* connection)
        : connection_(connection) {}

    Auction* auction_for(const std::string& item_id) override {
        return new XMPPAuction(connection_, item_id);
    }

    void disconnect() override {
        connection_->disconnect();
    }

private:
    XMPPConnection* connection_;
};
```

```python
# Python - AuctionHouse 인터페이스
from abc import ABC, abstractmethod


class AuctionHouse(ABC):
    @abstractmethod
    def auction_for(self, item_id: str) -> Auction:
        pass

    @abstractmethod
    def disconnect(self) -> None:
        pass


class XMPPAuctionHouse(AuctionHouse):
    def __init__(self, connection: XMPPConnection):
        self._connection = connection
        self._auctions: dict[str, XMPPAuction] = {}

    def auction_for(self, item_id: str) -> Auction:
        if item_id not in self._auctions:
            self._auctions[item_id] = XMPPAuction(self._connection, item_id)
        return self._auctions[item_id]

    def disconnect(self) -> None:
        self._connection.disconnect()
```

### SniperLauncher 추출

```cpp
// C++ - SniperLauncher
class SniperLauncher : public UserRequestListener {
public:
    SniperLauncher(AuctionHouse* auction_house,
                   SniperCollector* collector)
        : auction_house_(auction_house)
        , collector_(collector) {}

    void join_auction(const std::string& item_id) override {
        auto auction = auction_house_->auction_for(item_id);
        auto sniper = new AuctionSniper(item_id, auction);
        auction->add_auction_event_listener(sniper);
        collector_->add_sniper(sniper);
        auction->join();
    }

private:
    AuctionHouse* auction_house_;
    SniperCollector* collector_;
};
```

```python
# Python - SniperLauncher
class SniperLauncher:
    def __init__(self, auction_house: AuctionHouse, collector: SniperCollector):
        self._auction_house = auction_house
        self._collector = collector

    def join_auction(self, item_id: str) -> None:
        auction = self._auction_house.auction_for(item_id)
        sniper = AuctionSniper(item_id, auction)
        auction.add_auction_event_listener(sniper)
        self._collector.add_sniper(sniper)
        auction.join()
```

---

## Ch 18: Filling in the Details

### 목표: 최대가 제한

사용자가 설정한 최대가 이상으로는 입찰하지 않는다:

```cpp
// C++ - 최대가 제한 테스트
TEST_F(AuctionSniperTest, DoesNotBidAndReportsLosingIfPriceAboveStopPrice) {
    int stop_price = 1000;
    int current_price = 1200;
    int increment = 25;

    sniper_ = make_sniper_with_stop_price(stop_price);

    // 가격이 stop price를 초과
    EXPECT_CALL(auction_, bid(_)).Times(0);  // 입찰하지 않음
    EXPECT_CALL(listener_, sniper_state_changed(
        has_state(SniperState::LOSING)));

    sniper_->current_price(current_price, increment,
                          PriceSource::FROM_OTHER_BIDDER);
}

TEST_F(AuctionSniperTest, ReportsLostIfAuctionClosesWhenLosing) {
    sniper_ = make_sniper_with_stop_price(1000);
    sniper_->current_price(1200, 25, PriceSource::FROM_OTHER_BIDDER);

    EXPECT_CALL(listener_, sniper_state_changed(
        has_state(SniperState::LOST)));

    sniper_->auction_closed();
}
```

### LOSING 상태 추가

```cpp
// C++ - 상태 확장
enum class SniperState {
    JOINING,
    BIDDING,
    WINNING,
    LOSING,   // 새로 추가
    LOST,
    WON
};

class AuctionSniper : public AuctionEventListener {
public:
    AuctionSniper(const std::string& item_id,
                  Auction* auction,
                  SniperListener* listener,
                  int stop_price)
        : snapshot_(SniperSnapshot::joining(item_id))
        , auction_(auction)
        , listener_(listener)
        , stop_price_(stop_price) {}

    void current_price(int price, int increment, PriceSource source) override {
        if (source == PriceSource::FROM_OTHER_BIDDER) {
            int bid = price + increment;
            if (bid > stop_price_) {
                snapshot_ = snapshot_.losing(price);
            } else {
                auction_->bid(bid);
                snapshot_ = snapshot_.bidding(price, bid);
            }
        } else {
            snapshot_ = snapshot_.winning(price);
        }
        notify_change();
    }

private:
    int stop_price_;
};
```

```python
# Python - 상태 확장
class SniperState(Enum):
    JOINING = auto()
    BIDDING = auto()
    WINNING = auto()
    LOSING = auto()   # 새로 추가
    LOST = auto()
    WON = auto()


class AuctionSniper(AuctionEventListener):
    def __init__(
        self,
        item_id: str,
        auction: Auction,
        listener: SniperListener,
        stop_price: int = float('inf')
    ):
        self._snapshot = SniperSnapshot.joining(item_id)
        self._auction = auction
        self._listener = listener
        self._stop_price = stop_price

    def current_price(self, price: int, increment: int, source: PriceSource) -> None:
        if source == PriceSource.FROM_OTHER_BIDDER:
            bid = price + increment
            if bid > self._stop_price:
                self._snapshot = self._snapshot.losing(price)
            else:
                self._auction.bid(bid)
                self._snapshot = self._snapshot.bidding(price, bid)
        else:
            self._snapshot = self._snapshot.winning(price)
        self._notify_change()
```

---

## 최종 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                    FINAL ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      UI Layer                            │   │
│  │                                                          │   │
│  │  MainWindow ◀───────── SnipersTableModel                 │   │
│  │      │                        ▲                          │   │
│  │      │ UserRequestListener    │ SniperListener           │   │
│  │      ▼                        │                          │   │
│  └──────┼────────────────────────┼──────────────────────────┘   │
│         │                        │                              │
│  ┌──────▼────────────────────────┼──────────────────────────┐   │
│  │                  Domain Layer │                          │   │
│  │                               │                          │   │
│  │  SniperLauncher ─────────▶ SniperPortfolio               │   │
│  │       │                       │                          │   │
│  │       │                       ├── AuctionSniper 1        │   │
│  │       │                       ├── AuctionSniper 2        │   │
│  │       │                       └── AuctionSniper 3        │   │
│  │       │                                                  │   │
│  └───────┼──────────────────────────────────────────────────┘   │
│          │                                                      │
│  ┌───────▼──────────────────────────────────────────────────┐   │
│  │                Infrastructure Layer                      │   │
│  │                                                          │   │
│  │  XMPPAuctionHouse                                        │   │
│  │       │                                                  │   │
│  │       ├── XMPPAuction 1                                  │   │
│  │       │      └── AuctionMessageTranslator                │   │
│  │       ├── XMPPAuction 2                                  │   │
│  │       └── XMPPAuction 3                                  │   │
│  │                                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 테스트 피라미드

```
┌─────────────────────────────────────────────────────────────────┐
│                      TEST PYRAMID                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                         /\                                      │
│                        /  \                                     │
│                       / E2E\     End-to-End Tests              │
│                      /──────\    (FakeAuctionServer +           │
│                     /        \    ApplicationRunner)            │
│                    /──────────\                                 │
│                   / Integration \   Integration Tests           │
│                  /──────────────\   (XMPPAuction,               │
│                 /                \   AuctionMessageTranslator)  │
│                /──────────────────\                             │
│               /     Unit Tests     \  Unit Tests                │
│              /──────────────────────\ (AuctionSniper,           │
│             /                        \ SniperSnapshot,          │
│            /                          \ SnipersTableModel)      │
│           /____________________________\                        │
│                                                                 │
│  비율: E2E (5%) < Integration (15%) < Unit (80%)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 핵심 교훈

```
┌─────────────────────────────────────────────────────────────────┐
│                      KEY LESSONS LEARNED                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 점진적 개발                                                 │
│     ─────────────                                               │
│     • Walking Skeleton부터 시작                                 │
│     • 기능을 작은 단위로 추가                                   │
│     • 항상 동작하는 코드 유지                                   │
│                                                                 │
│  2. Outside-In TDD                                              │
│     ─────────────────                                           │
│     • 인수 테스트로 요구사항 정의                               │
│     • 단위 테스트로 설계 발견                                   │
│     • Mock으로 의존성 분리                                      │
│                                                                 │
│  3. 리팩토링의 중요성                                           │
│     ─────────────────────                                       │
│     • 책임 분리                                                 │
│     • 의존성 주입                                               │
│     • 테스트 가능한 설계                                        │
│                                                                 │
│  4. 테스트 더블 활용                                            │
│     ─────────────────                                           │
│     • Fake: 실제 동작하는 대체품 (FakeAuctionServer)            │
│     • Mock: 기대 설정 검증 (MockAuction)                        │
│     • Stub: 고정 값 반환                                        │
│                                                                 │
│  5. 상태 관리                                                   │
│     ──────────                                                  │
│     • 불변 스냅샷 (SniperSnapshot)                              │
│     • 상태 전이 명시화                                          │
│     • 이벤트 기반 알림                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────────┐
│                      CHAPTERS 11-18 SUMMARY                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Worked Example 완성                                            │
│  ─────────────────                                              │
│  • Ch 11: 첫 테스트 통과 (JOIN → CLOSE → LOST)                  │
│  • Ch 12: 가격 메시지 수신 및 파싱                              │
│  • Ch 13: 입찰 로직 (BIDDING 상태)                              │
│  • Ch 14: 낙찰 처리 (WON 상태)                                  │
│  • Ch 15: 테이블 UI (SnipersTableModel)                         │
│  • Ch 16: 다중 경매 (SniperPortfolio)                           │
│  • Ch 17: 책임 분리 (AuctionHouse, SniperLauncher)              │
│  • Ch 18: 최대가 제한 (LOSING 상태)                             │
│                                                                 │
│  핵심 컴포넌트                                                  │
│  ────────────────                                               │
│  • AuctionSniper: 핵심 비즈니스 로직                            │
│  • SniperSnapshot: 불변 상태 표현                               │
│  • XMPPAuction: 외부 시스템 래퍼                                │
│  • AuctionMessageTranslator: 프로토콜 변환                      │
│  • SniperPortfolio: Sniper 컬렉션 관리                          │
│                                                                 │
│  TDD 패턴                                                       │
│  ──────────                                                     │
│  • 인수 테스트 주도 개발                                        │
│  • Mock 객체로 의존성 분리                                      │
│  • 점진적 기능 추가                                             │
│  • 리팩토링으로 설계 개선                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 다음 장 예고

다음 장에서는 **Listening to the Tests**를 다룬다. 테스트가 설계에 대해 말해주는 것들, 테스트 작성이 어려울 때 설계를 개선하는 방법을 배운다.
