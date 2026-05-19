---
title: "Ch 6: Object-Oriented Style"
date: 2026-05-10T06:00:00
description: "Steve & Nat의 OO 스타일 — 작은 객체, 명확한 역할, 한 곳의 진실."
tags: [OO, Style, Roles]
series: "Growing Object-Oriented Software"
seriesOrder: 6
draft: true
---

TDD와 객체지향은 상호 보완적이다. 테스트하기 쉬운 코드는 대체로 좋은 설계를 따르고, 좋은 설계는 테스트를 쉽게 만든다.

## 6.1 좋은 객체의 특성

### 작은 객체, 명확한 역할

![좋은 객체의 특성](/images/blog/goos/diagrams/ch06-good-object-characteristics.svg)

### 나쁜 예 vs 좋은 예

```cpp
// ❌ 나쁜 예: 너무 많은 책임
class AuctionSniper {
    void process_message(const std::string& message);  // 메시지 파싱
    void bid(int amount);                              // 입찰 실행
    void update_ui(SniperState state);                 // UI 업데이트
    void log_activity(const std::string& activity);   // 로깅
    void save_to_database();                           // 영속화
    // ... 계속 늘어남
};

// ✅ 좋은 예: 각 객체가 한 가지 책임
class AuctionSniper {
    // 핵심 도메인 로직만
    void process_auction_event(const AuctionEvent& event);
};

class AuctionMessageTranslator {
    // 메시지 → 이벤트 변환만
    AuctionEvent translate(const std::string& message);
};

class SniperStateDisplay {
    // UI 표시만
    void update(SniperState state);
};
```

```python
# ❌ 나쁜 예: 너무 많은 책임
class AuctionSniper:
    def process_message(self, message: str) -> None: ...
    def bid(self, amount: int) -> None: ...
    def update_ui(self, state: SniperState) -> None: ...
    def log_activity(self, activity: str) -> None: ...
    def save_to_database(self) -> None: ...

# ✅ 좋은 예: 각 객체가 한 가지 책임
class AuctionSniper:
    """핵심 도메인 로직만"""
    def process_auction_event(self, event: AuctionEvent) -> None: ...

class AuctionMessageTranslator:
    """메시지 → 이벤트 변환만"""
    def translate(self, message: str) -> AuctionEvent: ...

class SniperStateDisplay:
    """UI 표시만"""
    def update(self, state: SniperState) -> None: ...
```

## 6.2 Composite Simpler than Parts

### 핵심 원칙

![전체가 부분의 합보다 단순해야 한다](/images/blog/goos/diagrams/ch06-composite-simpler.svg)

### 예제: 입찰 한도 관리

```cpp
// 개별 부품들
class StopPrice {
    int limit_;
public:
    explicit StopPrice(int limit) : limit_{limit} {}
    bool allows(int price) const { return price <= limit_; }
};

class AuctionSniper {
    Auction* auction_;
    SniperListener* listener_;
    StopPrice stop_price_;

public:
    void current_price(int price, int increment, PriceSource source) {
        if (source == PriceSource::FromOtherBidder) {
            int bid = price + increment;
            if (stop_price_.allows(bid)) {
                auction_->bid(bid);
                notify(SniperState::Bidding);
            } else {
                notify(SniperState::Losing);
            }
        } else {
            notify(SniperState::Winning);
        }
    }
};

// 외부에서 보면: sniper.current_price(...)
// 내부 복잡성(StopPrice 판단)은 숨겨짐
```

```python
# 개별 부품들
class StopPrice:
    def __init__(self, limit: int):
        self.limit = limit

    def allows(self, price: int) -> bool:
        return price <= self.limit

class AuctionSniper:
    def __init__(self, auction: Auction, listener: SniperListener, stop_price: StopPrice):
        self.auction = auction
        self.listener = listener
        self.stop_price = stop_price

    def current_price(self, price: int, increment: int, source: PriceSource) -> None:
        if source == PriceSource.FROM_OTHER_BIDDER:
            bid = price + increment
            if self.stop_price.allows(bid):
                self.auction.bid(bid)
                self._notify(SniperState.BIDDING)
            else:
                self._notify(SniperState.LOSING)
        else:
            self._notify(SniperState.WINNING)

# 외부에서 보면: sniper.current_price(...)
# 내부 복잡성(StopPrice 판단)은 숨겨짐
```

## 6.3 단일 책임 원칙 (SRP)

### 변경 이유가 하나

단일 책임 원칙(SRP)의 핵심은 "변경 이유"로 책임을 판단하는 것이다.

**질문:** "이 클래스가 변경되어야 하는 이유는?"

**여러 이유가 있다면 (분리 필요):**
- 메시지 형식이 바뀌면
- UI 요구사항이 바뀌면
- 비즈니스 규칙이 바뀌면

**한 가지 이유만 있다면 (응집도 높음):**
- 입찰 규칙이 바뀌면

### 리팩토링: 책임 분리

```cpp
// Before: 여러 책임이 뒤섞임
class AuctionSniper : public MessageListener {
    void process_message(const std::string& message) override {
        // 1. 메시지 파싱 (변경 이유: 프로토콜)
        auto event = parse_message(message);

        // 2. 도메인 로직 (변경 이유: 비즈니스 규칙)
        if (event.type == "PRICE") {
            int new_bid = event.price + event.increment;
            auction_->bid(new_bid);
        }

        // 3. UI 업데이트 (변경 이유: UI 요구사항)
        ui_->show_state(state_);
    }
};

// After: 각 책임을 별도 객체로
class AuctionMessageTranslator : public MessageListener {
    AuctionEventListener* listener_;

    void process_message(const std::string& message) override {
        auto event = parse_message(message);
        listener_->handle(event);  // 파싱만, 로직은 위임
    }
};

class AuctionSniper : public AuctionEventListener {
    void handle(const AuctionEvent& event) override {
        // 도메인 로직만
        if (event.type == EventType::Price) {
            process_price(event);
        }
        listener_->state_changed(state_);  // UI는 위임
    }
};

class SniperStateDisplayer : public SniperListener {
    void state_changed(SniperState state) override {
        // UI 업데이트만
        ui_->show(state);
    }
};
```

```python
# Before: 여러 책임이 뒤섞임
class AuctionSniper(MessageListener):
    def process_message(self, message: str) -> None:
        # 1. 메시지 파싱 (변경 이유: 프로토콜)
        event = self._parse_message(message)

        # 2. 도메인 로직 (변경 이유: 비즈니스 규칙)
        if event.type == "PRICE":
            new_bid = event.price + event.increment
            self.auction.bid(new_bid)

        # 3. UI 업데이트 (변경 이유: UI 요구사항)
        self.ui.show_state(self.state)

# After: 각 책임을 별도 객체로
class AuctionMessageTranslator(MessageListener):
    def __init__(self, listener: AuctionEventListener):
        self.listener = listener

    def process_message(self, message: str) -> None:
        event = self._parse_message(message)
        self.listener.handle(event)  # 파싱만, 로직은 위임

class AuctionSniper(AuctionEventListener):
    def handle(self, event: AuctionEvent) -> None:
        # 도메인 로직만
        if event.type == EventType.PRICE:
            self._process_price(event)
        self.listener.state_changed(self.state)  # UI는 위임

class SniperStateDisplayer(SniperListener):
    def state_changed(self, state: SniperState) -> None:
        # UI 업데이트만
        self.ui.show(state)
```

## 6.4 협력자 캡슐화

### 내부 구현 숨기기

협력자 캡슐화는 Law of Demeter를 따르는 것이다.

**협력자 노출 (Law of Demeter 위반):**
```cpp
client.get_connection().get_session().send(message)
```
- 내부 구조에 의존
- 변경에 취약

**협력자 숨김 (캡슐화):**
```cpp
client.send(message)
```
- 내부 구조 캡슐화
- 변경에 유연

### 예제: XMPPAuction

```cpp
// ❌ 나쁜 예: 내부 구조 노출
class XMPPAuction {
public:
    XmppConnection* connection() { return connection_.get(); }
    // 클라이언트가 이렇게 사용:
    // auction.connection()->session()->send(message);
};

// ✅ 좋은 예: 캡슐화
class XMPPAuction : public Auction {
    std::unique_ptr<XmppConnection> connection_;
    std::string auction_id_;

public:
    void bid(int amount) override {
        // 내부에서 처리
        std::string message = format_bid_message(amount);
        connection_->send_to(auction_id_, message);
    }

    void join() override {
        connection_->send_to(auction_id_, "JOIN");
    }
};

// 클라이언트:
// auction.bid(1000);  // 내부 구조 몰라도 됨
```

```python
# ❌ 나쁜 예: 내부 구조 노출
class XMPPAuction:
    def get_connection(self):
        return self._connection
    # 클라이언트가 이렇게 사용:
    # auction.get_connection().session().send(message)

# ✅ 좋은 예: 캡슐화
class XMPPAuction(Auction):
    def __init__(self, connection: XmppConnection, auction_id: str):
        self._connection = connection
        self._auction_id = auction_id

    def bid(self, amount: int) -> None:
        # 내부에서 처리
        message = self._format_bid_message(amount)
        self._connection.send_to(self._auction_id, message)

    def join(self) -> None:
        self._connection.send_to(self._auction_id, "JOIN")

# 클라이언트:
# auction.bid(1000)  # 내부 구조 몰라도 됨
```

## 6.5 Tell, Don't Ask 재강조

### 물어보지 말고 시켜라

**Ask (물어보기) - 상태 판단 로직이 외부에:**
```cpp
if (sniper.get_state() == SniperState::Winning) {
    ui.show_winning();
}
```
- sniper 내부 상태에 의존
- 캡슐화 위반

**Tell (시키기) - 상태 판단은 객체 내부에서:**
```cpp
sniper.add_listener(ui);
// sniper가 알아서 ui에 알림
```
- 캡슐화 유지
- 변경에 유연

### 실전 예제

```cpp
// ❌ Ask: 상태를 물어보고 외부에서 판단
void update_ui(AuctionSniper& sniper, UI& ui) {
    auto state = sniper.state();
    auto last_price = sniper.last_price();
    auto last_bid = sniper.last_bid();

    if (state == SniperState::Bidding) {
        ui.show_bidding(last_price, last_bid);
    } else if (state == SniperState::Winning) {
        ui.show_winning(last_price);
    } else if (state == SniperState::Lost) {
        ui.show_lost();
    }
}

// ✅ Tell: 객체에게 일을 시킴
class AuctionSniper {
    SniperListener* listener_;
    SniperSnapshot snapshot_;

public:
    void current_price(int price, int increment, PriceSource source) {
        if (source == PriceSource::FromOtherBidder) {
            int bid = price + increment;
            auction_->bid(bid);
            snapshot_ = snapshot_.bidding(price, bid);
        } else {
            snapshot_ = snapshot_.winning(price);
        }
        listener_->sniper_state_changed(snapshot_);  // Tell!
    }
};

// UI는 그냥 받아서 표시
class SniperTableModel : public SniperListener {
    void sniper_state_changed(const SniperSnapshot& snapshot) override {
        // 판단 없이 그냥 표시
        update_row(snapshot);
    }
};
```

```python
# ❌ Ask: 상태를 물어보고 외부에서 판단
def update_ui(sniper: AuctionSniper, ui: UI) -> None:
    state = sniper.state
    last_price = sniper.last_price
    last_bid = sniper.last_bid

    if state == SniperState.BIDDING:
        ui.show_bidding(last_price, last_bid)
    elif state == SniperState.WINNING:
        ui.show_winning(last_price)
    elif state == SniperState.LOST:
        ui.show_lost()

# ✅ Tell: 객체에게 일을 시킴
class AuctionSniper:
    def __init__(self, auction: Auction, listener: SniperListener):
        self.auction = auction
        self.listener = listener
        self.snapshot = SniperSnapshot.joining()

    def current_price(self, price: int, increment: int, source: PriceSource) -> None:
        if source == PriceSource.FROM_OTHER_BIDDER:
            bid = price + increment
            self.auction.bid(bid)
            self.snapshot = self.snapshot.bidding(price, bid)
        else:
            self.snapshot = self.snapshot.winning(price)
        self.listener.sniper_state_changed(self.snapshot)  # Tell!

# UI는 그냥 받아서 표시
class SniperTableModel(SniperListener):
    def sniper_state_changed(self, snapshot: SniperSnapshot) -> None:
        # 판단 없이 그냥 표시
        self._update_row(snapshot)
```

## 6.6 패턴은 절제하여

### 패턴 적용 시점

**미리 패턴 적용 (YAGNI 위반):**
- "나중에 필요할 것 같으니까 Strategy 패턴으로..."
- 불필요한 복잡성 증가

**필요할 때 패턴 적용 (리팩토링으로 도입):**
1. 코드가 중복되기 시작할 때
2. 변경이 어려워질 때
3. 테스트가 복잡해질 때

> **"패턴으로 리팩토링" >> "패턴으로 설계"**

### 리팩토링으로 패턴 도입

```cpp
// 1단계: 단순한 구현
class AuctionSniper {
    void current_price(int price, int increment, PriceSource source) {
        if (source == PriceSource::FromOtherBidder) {
            auction_->bid(price + increment);
            state_ = SniperState::Bidding;
        }
        listener_->state_changed(state_);
    }
};

// 2단계: 새 요구사항 — 입찰 한도 추가
// 조건문이 복잡해짐
class AuctionSniper {
    int stop_price_;

    void current_price(int price, int increment, PriceSource source) {
        if (source == PriceSource::FromOtherBidder) {
            int bid = price + increment;
            if (bid <= stop_price_) {
                auction_->bid(bid);
                state_ = SniperState::Bidding;
            } else {
                state_ = SniperState::Losing;
            }
        }
        listener_->state_changed(state_);
    }
};

// 3단계: State 패턴으로 리팩토링 (복잡성 관리)
class SniperState {
public:
    virtual ~SniperState() = default;
    virtual std::unique_ptr<SniperState> on_price(
        int price, int increment, PriceSource source,
        Auction& auction, int stop_price) = 0;
    virtual SniperStatus status() const = 0;
};

class JoiningState : public SniperState {
    std::unique_ptr<SniperState> on_price(
        int price, int increment, PriceSource source,
        Auction& auction, int stop_price) override {
        if (source == PriceSource::FromOtherBidder) {
            int bid = price + increment;
            if (bid <= stop_price) {
                auction.bid(bid);
                return std::make_unique<BiddingState>();
            }
            return std::make_unique<LosingState>();
        }
        return std::make_unique<WinningState>();
    }
};
```

```python
# 1단계: 단순한 구현
class AuctionSniper:
    def current_price(self, price: int, increment: int, source: PriceSource) -> None:
        if source == PriceSource.FROM_OTHER_BIDDER:
            self.auction.bid(price + increment)
            self.state = SniperState.BIDDING
        self.listener.state_changed(self.state)

# 2단계: 새 요구사항 — 입찰 한도 추가
# 조건문이 복잡해짐
class AuctionSniper:
    def __init__(self, auction, listener, stop_price: int):
        self.stop_price = stop_price
        # ...

    def current_price(self, price: int, increment: int, source: PriceSource) -> None:
        if source == PriceSource.FROM_OTHER_BIDDER:
            bid = price + increment
            if bid <= self.stop_price:
                self.auction.bid(bid)
                self.state = SniperState.BIDDING
            else:
                self.state = SniperState.LOSING
        self.listener.state_changed(self.state)

# 3단계: State 패턴으로 리팩토링 (복잡성 관리)
from abc import ABC, abstractmethod

class SniperBehavior(ABC):
    @abstractmethod
    def on_price(self, price: int, increment: int, source: PriceSource,
                 context: "SniperContext") -> "SniperBehavior": ...

    @abstractmethod
    def status(self) -> SniperStatus: ...

class JoiningBehavior(SniperBehavior):
    def on_price(self, price: int, increment: int, source: PriceSource,
                 context: "SniperContext") -> SniperBehavior:
        if source == PriceSource.FROM_OTHER_BIDDER:
            bid = price + increment
            if bid <= context.stop_price:
                context.auction.bid(bid)
                return BiddingBehavior()
            return LosingBehavior()
        return WinningBehavior()
```

## 6.7 Context Independence

### 객체는 자신의 문맥을 모름

객체는 자신이 어디서 사용되는지 몰라야 한다.

**문맥 의존 (피해야 함):**
```cpp
class AuctionSniper {
    void process() {
        if (is_test_mode()) { ... }  // 문맥 알고 있음
        MainWindow::get_instance().update();  // 전역
    }
};
```

**문맥 독립 (좋은 설계):**
```cpp
class AuctionSniper {
    SniperListener* listener_;  // 주입받음
    void process() {
        listener_->state_changed(...);  // 위임
    }
};
```

- 테스트: TestListener 주입
- 프로덕션: UIListener 주입

### 테스트 용이성과의 연결

```cpp
// 문맥 독립적인 객체는 테스트하기 쉬움
class AuctionSniperTest : public ::testing::Test {
protected:
    MockAuction auction_;
    MockSniperListener listener_;
    AuctionSniper sniper_{&auction_, &listener_};

    // 실제 UI, 네트워크, DB 없이 테스트 가능
};

TEST_F(AuctionSniperTest, BidsWhenPriceFromOther) {
    EXPECT_CALL(auction_, bid(125));
    EXPECT_CALL(listener_, sniper_state_changed(_));

    sniper_.current_price(100, 25, PriceSource::FromOtherBidder);
}
```

```python
# 문맥 독립적인 객체는 테스트하기 쉬움
class TestAuctionSniper:
    def setup_method(self):
        self.auction = create_autospec(Auction)
        self.listener = create_autospec(SniperListener)
        self.sniper = AuctionSniper(self.auction, self.listener)

    # 실제 UI, 네트워크, DB 없이 테스트 가능

    def test_bids_when_price_from_other(self):
        self.sniper.current_price(100, 25, PriceSource.FROM_OTHER_BIDDER)

        self.auction.bid.assert_called_once_with(125)
        self.listener.sniper_state_changed.assert_called()
```

## 6.8 TDD와 좋은 설계의 관계

### 테스트가 설계를 이끈다

**테스트하기 어렵다면:**
- 객체가 너무 많은 책임을 가짐
- 협력자가 너무 많음
- 문맥에 의존함

**해결책:**
- 책임 분리 (SRP)
- 의존성 주입 (DI)
- 인터페이스 도입

**결과:**
- 테스트하기 쉬움
- 변경하기 쉬움
- 좋은 설계

## 정리

| 원칙 | 핵심 |
|------|------|
| **작은 객체** | 한 화면, 한 문장 설명 |
| **Composite** | 전체가 부분보다 단순 |
| **SRP** | 변경 이유 하나 |
| **캡슐화** | 협력자 숨기기 |
| **Tell, Don't Ask** | 물어보지 말고 시켜라 |
| **패턴 절제** | 필요할 때 리팩토링으로 도입 |
| **Context Independence** | 문맥 모르게, 테스트 쉽게 |

**핵심 질문:**
> 이 객체가 무엇을 하는지 한 문장으로 설명할 수 있는가? "그리고" 없이?

## 다음 장 예고

다음 장에서는 TDD로 설계를 달성하는 방법을 다룬다. 테스트를 작성하면서 어떻게 객체와 인터페이스가 발견되는지 살펴본다.
