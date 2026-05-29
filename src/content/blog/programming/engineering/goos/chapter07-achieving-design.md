---
title: "Ch 7: Achieving Object-Oriented Design"
date: 2026-05-10T07:00:00
description: "TDD가 디자인을 이끄는 방법 — 인터페이스 발견, 역할 진화."
tags: [TDD, Design]
series: "Growing Object-Oriented Software"
seriesOrder: 7
draft: true
---

TDD는 단순히 테스트를 먼저 작성하는 작업이 아니다. 테스트가 설계의 첫 사용자가 되어 인터페이스를 발견하고, 역할을 정의하며, 좋은 객체지향 설계를 이끌어낸다. 이 장에서는 그 과정을 단계별로 따라가며, 테스트가 어떻게 **인터페이스 발견기**로 작동하는지 본다.

## 7.1 테스트가 설계의 첫 사용자

### 테스트 = 첫 번째 클라이언트

![테스트의 역할](/images/blog/goos/diagrams/ch07-test-first-user.svg)

### 예제: 인터페이스 발견

```cpp
// 테스트를 먼저 작성하면서 인터페이스 발견

// 1단계: 테스트 작성 — 어떻게 사용하고 싶은가?
TEST(AuctionSniperTest, BidsHigherWhenPriceArrives) {
    MockAuction auction;
    MockSniperListener listener;
    AuctionSniper sniper{&auction, &listener};  // 생성자: 필요한 협력자

    EXPECT_CALL(auction, bid(125));  // 기대: bid() 메서드 호출
    EXPECT_CALL(listener, sniper_state_changed(_));

    // 이 메서드가 필요하다는 것을 테스트가 알려줌
    sniper.current_price(100, 25, PriceSource::FromOtherBidder);
}

// 2단계: 테스트를 통과시키기 위한 최소 인터페이스 정의
class AuctionSniper {
public:
    AuctionSniper(Auction* auction, SniperListener* listener);
    void current_price(int price, int increment, PriceSource source);
};

// 인터페이스는 테스트(사용자)가 결정
// 구현은 나중에
```

```python
# 테스트를 먼저 작성하면서 인터페이스 발견

# 1단계: 테스트 작성 — 어떻게 사용하고 싶은가?
def test_bids_higher_when_price_arrives():
    auction = create_autospec(Auction)
    listener = create_autospec(SniperListener)
    sniper = AuctionSniper(auction, listener)  # 생성자: 필요한 협력자

    # 이 메서드가 필요하다는 것을 테스트가 알려줌
    sniper.current_price(100, 25, PriceSource.FROM_OTHER_BIDDER)

    auction.bid.assert_called_once_with(125)  # 기대: bid() 메서드 호출
    listener.sniper_state_changed.assert_called()

# 2단계: 테스트를 통과시키기 위한 최소 인터페이스 정의
class AuctionSniper:
    def __init__(self, auction: Auction, listener: SniperListener):
        ...

    def current_price(self, price: int, increment: int, source: PriceSource) -> None:
        ...

# 인터페이스는 테스트(사용자)가 결정
# 구현은 나중에
```

## 7.2 어려운 테스트 = 설계 문제 신호

### 테스트 냄새와 설계 문제

![테스트 냄새와 설계 문제](/images/blog/goos/diagrams/ch07-test-smell-design-issue.svg)

### 예제: 복잡한 셋업

```cpp
// ❌ 나쁜 신호: 셋업이 너무 복잡
class AuctionSniperTest : public ::testing::Test {
protected:
    void SetUp() override {
        config_ = std::make_unique<Config>();
        config_->load("test.cfg");
        logger_ = std::make_unique<Logger>(config_.get());
        connection_ = std::make_unique<XmppConnection>(
            config_->server(), config_->port());
        session_ = connection_->create_session();
        auction_ = std::make_unique<XmppAuction>(session_, "item-123");
        ui_model_ = std::make_unique<SniperTableModel>();
        ui_view_ = std::make_unique<SniperView>(ui_model_.get());
        listener_ = std::make_unique<SniperStateDisplayer>(ui_view_.get());
        sniper_ = std::make_unique<AuctionSniper>(
            auction_.get(), listener_.get(), logger_.get());
    }

    // 7개 이상의 필드...
};

// ✅ 좋은 설계: 간단한 셋업
class AuctionSniperTest : public ::testing::Test {
protected:
    MockAuction auction_;
    MockSniperListener listener_;
    AuctionSniper sniper_{&auction_, &listener_};
    // 딱 필요한 것만
};
```

```python
# ❌ 나쁜 신호: 셋업이 너무 복잡
class TestAuctionSniper:
    def setup_method(self):
        self.config = Config()
        self.config.load("test.cfg")
        self.logger = Logger(self.config)
        self.connection = XmppConnection(self.config.server, self.config.port)
        self.session = self.connection.create_session()
        self.auction = XmppAuction(self.session, "item-123")
        self.ui_model = SniperTableModel()
        self.ui_view = SniperView(self.ui_model)
        self.listener = SniperStateDisplayer(self.ui_view)
        self.sniper = AuctionSniper(self.auction, self.listener, self.logger)
        # 7개 이상의 필드...

# ✅ 좋은 설계: 간단한 셋업
class TestAuctionSniper:
    def setup_method(self):
        self.auction = create_autospec(Auction)
        self.listener = create_autospec(SniperListener)
        self.sniper = AuctionSniper(self.auction, self.listener)
        # 딱 필요한 것만
```

### 리팩토링: 의존성 분리

```cpp
// 문제: 너무 많은 의존성을 직접 가짐
class AuctionSniper {
    XmppConnection* connection_;
    XmppSession* session_;
    Logger* logger_;
    Config* config_;
    // ... 더 많은 필드
};

// 해결: 인터페이스 뒤로 숨김
class AuctionSniper {
    Auction* auction_;           // 인터페이스만
    SniperListener* listener_;   // 인터페이스만
    // 구체적 구현(XMPP, Logger 등)은 숨겨짐
};

// 실제 조립은 별도 Factory/Wiring에서
class AuctionSniperFactory {
public:
    std::unique_ptr<AuctionSniper> create(const std::string& item_id) {
        auto connection = create_xmpp_connection();
        auto auction = std::make_unique<XmppAuction>(connection.get(), item_id);
        auto listener = std::make_unique<SniperStateDisplayer>(ui_);
        return std::make_unique<AuctionSniper>(auction.get(), listener.get());
    }
};
```

```python
# 문제: 너무 많은 의존성을 직접 가짐
class AuctionSniper:
    def __init__(self, connection, session, logger, config, ...):
        self.connection = connection
        self.session = session
        # ... 더 많은 필드

# 해결: 인터페이스 뒤로 숨김
class AuctionSniper:
    def __init__(self, auction: Auction, listener: SniperListener):
        self.auction = auction       # 인터페이스만
        self.listener = listener     # 인터페이스만
        # 구체적 구현(XMPP, Logger 등)은 숨겨짐

# 실제 조립은 별도 Factory/Wiring에서
class AuctionSniperFactory:
    def create(self, item_id: str) -> AuctionSniper:
        connection = self._create_xmpp_connection()
        auction = XmppAuction(connection, item_id)
        listener = SniperStateDisplayer(self.ui)
        return AuctionSniper(auction, listener)
```

## 7.3 인터페이스: 사용 측에서 발견

### 역할 기반 인터페이스

![인터페이스 발견 과정](/images/blog/goos/diagrams/ch07-interface-discovery-process.svg)

### 예제: 역할 발견

```cpp
// 테스트 작성 중 필요한 역할 발견

// 1. 테스트가 요구하는 것
TEST(AuctionSniperTest, NotifiesListenerWhenBidding) {
    MockAuction auction;
    MockSniperListener listener;  // "listener" 역할 필요!
    AuctionSniper sniper{&auction, &listener};

    // listener가 어떻게 동작해야 하는지 테스트가 정의
    EXPECT_CALL(listener, sniper_state_changed(SniperSnapshot::bidding(100, 125)));

    sniper.current_price(100, 25, PriceSource::FromOtherBidder);
}

// 2. 테스트에서 발견된 인터페이스
class SniperListener {
public:
    virtual ~SniperListener() = default;
    virtual void sniper_state_changed(const SniperSnapshot& snapshot) = 0;
};

// 3. 실제 구현은 나중에
class SniperStateDisplayer : public SniperListener {
    UI* ui_;
public:
    void sniper_state_changed(const SniperSnapshot& snapshot) override {
        ui_->update(snapshot);
    }
};
```

```python
# 테스트 작성 중 필요한 역할 발견

# 1. 테스트가 요구하는 것
def test_notifies_listener_when_bidding():
    auction = create_autospec(Auction)
    listener = create_autospec(SniperListener)  # "listener" 역할 필요!
    sniper = AuctionSniper(auction, listener)

    sniper.current_price(100, 25, PriceSource.FROM_OTHER_BIDDER)

    # listener가 어떻게 동작해야 하는지 테스트가 정의
    listener.sniper_state_changed.assert_called_once()
    call_arg = listener.sniper_state_changed.call_args[0][0]
    assert call_arg == SniperSnapshot.bidding(100, 125)

# 2. 테스트에서 발견된 인터페이스
from typing import Protocol

class SniperListener(Protocol):
    def sniper_state_changed(self, snapshot: SniperSnapshot) -> None: ...

# 3. 실제 구현은 나중에
class SniperStateDisplayer:
    def __init__(self, ui: UI):
        self.ui = ui

    def sniper_state_changed(self, snapshot: SniperSnapshot) -> None:
        self.ui.update(snapshot)
```

## 7.4 Mock으로 역할과 협력자 명시

### Mock의 역할

Mock은 두 가지 역할을 수행한다.

**1. 협력자 대체 (Test Double):**
- 실제 구현 대신 가짜 사용
- 테스트 격리
- 빠른 실행

**2. 설계 도구 (Design Tool):**
- 협력자와의 대화 명시
- 역할 정의
- 프로토콜 설계

```cpp
EXPECT_CALL(auction, bid(125))
// → "sniper는 auction에게 125로 입찰하라고 말한다"
// → 역할과 협력 관계가 명시적
```

### Mock으로 프로토콜 설계

```cpp
// Mock을 통한 협력 프로토콜 설계

TEST(AuctionSniperTest, TransitionsFromBiddingToWinningWhenPriceFromSniper) {
    MockAuction auction;
    MockSniperListener listener;
    AuctionSniper sniper{&auction, &listener};

    // 프로토콜 정의: 순서대로 일어나야 함
    {
        InSequence seq;

        // 1. 다른 입찰자 가격 → Bidding 상태
        EXPECT_CALL(auction, bid(125));
        EXPECT_CALL(listener, sniper_state_changed(
            Property(&SniperSnapshot::state, SniperState::Bidding)));

        // 2. 내 가격이 현재가 → Winning 상태
        EXPECT_CALL(listener, sniper_state_changed(
            Property(&SniperSnapshot::state, SniperState::Winning)));
    }

    // 시나리오 실행
    sniper.current_price(100, 25, PriceSource::FromOtherBidder);
    sniper.current_price(125, 25, PriceSource::FromSniper);
}
```

```python
# Mock을 통한 협력 프로토콜 설계

def test_transitions_from_bidding_to_winning():
    auction = create_autospec(Auction)
    listener = create_autospec(SniperListener)
    sniper = AuctionSniper(auction, listener)

    # 시나리오 실행
    sniper.current_price(100, 25, PriceSource.FROM_OTHER_BIDDER)
    sniper.current_price(125, 25, PriceSource.FROM_SNIPER)

    # 프로토콜 검증: 순서대로 호출됨
    from unittest.mock import call

    expected_calls = [
        call(SniperSnapshot.bidding(100, 125)),
        call(SniperSnapshot.winning(125))
    ]
    listener.sniper_state_changed.assert_has_calls(expected_calls)

    # Auction에 bid 호출됨
    auction.bid.assert_called_once_with(125)
```

## 7.5 Listen to the Tests

### 테스트가 말하는 것

![테스트의 피드백](/images/blog/goos/diagrams/ch07-design-feedback.svg)

### 테스트 피드백 해석

```cpp
// 피드백 1: Mock이 너무 많다
TEST(OverComplicatedTest, TooManyMocks) {
    MockAuction auction;
    MockSniperListener listener;
    MockLogger logger;
    MockConfig config;
    MockTranslator translator;
    MockNotifier notifier;

    // 6개의 Mock → 객체가 너무 많은 협력자를 가짐
    // → 책임 분리 필요
}

// 해결: 책임 분리
// AuctionSniper는 핵심 로직만
// 로깅, 설정 등은 별도 레이어에서 처리
```

```python
# 피드백 2: assertion이 너무 많다
def test_too_many_assertions():
    sniper = AuctionSniper(auction, listener)

    sniper.current_price(100, 25, PriceSource.FROM_OTHER_BIDDER)

    # 너무 많은 검증 → 하나의 테스트에 여러 동작
    assert sniper.state == SniperState.BIDDING
    assert sniper.last_price == 100
    assert sniper.last_bid == 125
    auction.bid.assert_called_once_with(125)
    listener.sniper_state_changed.assert_called()
    assert sniper.item_id == "item-123"

# 해결: 테스트 분리 또는 Value Object 사용
def test_bids_when_price_from_other():
    sniper = AuctionSniper(auction, listener)
    sniper.current_price(100, 25, PriceSource.FROM_OTHER_BIDDER)
    auction.bid.assert_called_once_with(125)

def test_notifies_bidding_state():
    sniper = AuctionSniper(auction, listener)
    sniper.current_price(100, 25, PriceSource.FROM_OTHER_BIDDER)
    listener.sniper_state_changed.assert_called_with(
        SniperSnapshot.bidding(100, 125)  # 모든 상태를 Value Object로
    )
```

## 7.6 점진적 설계

### 설계는 진화한다

**1단계: 가장 단순한 구현**
```cpp
class AuctionSniper {
    void current_price(int price, int inc, Source src) {
        if (src == OtherBidder) auction_->bid(price+inc);
    }
};
```

**2단계: 새 요구사항 → 리팩토링**
- 상태 추적 필요 → SniperState 추가
- 상태 알림 필요 → Listener 추가
- 가격 정보 필요 → Snapshot 도입

**3단계: 복잡성 증가 → 패턴 도입**
- 상태 전이 복잡 → State 패턴
- 여러 listener → Observer 패턴

> **"미리 설계하지 말고, 필요할 때 진화시켜라"**

### 진화 예제

```cpp
// Evolution 1: 기본
class AuctionSniper {
    Auction* auction_;
public:
    void current_price(int price, int increment, PriceSource source) {
        if (source == PriceSource::FromOtherBidder) {
            auction_->bid(price + increment);
        }
    }
};

// Evolution 2: 상태 추가
class AuctionSniper {
    Auction* auction_;
    SniperState state_ = SniperState::Joining;
public:
    void current_price(int price, int increment, PriceSource source) {
        if (source == PriceSource::FromOtherBidder) {
            auction_->bid(price + increment);
            state_ = SniperState::Bidding;
        } else {
            state_ = SniperState::Winning;
        }
    }
};

// Evolution 3: Listener 추가
class AuctionSniper {
    Auction* auction_;
    SniperListener* listener_;
    SniperSnapshot snapshot_;
public:
    void current_price(int price, int increment, PriceSource source) {
        if (source == PriceSource::FromOtherBidder) {
            int bid = price + increment;
            auction_->bid(bid);
            snapshot_ = SniperSnapshot::bidding(price, bid);
        } else {
            snapshot_ = SniperSnapshot::winning(price);
        }
        listener_->sniper_state_changed(snapshot_);
    }
};

// Evolution 4: 한도 추가 (필요할 때)
class AuctionSniper {
    // ... 기존 필드 ...
    int stop_price_;
public:
    void current_price(int price, int increment, PriceSource source) {
        if (source == PriceSource::FromOtherBidder) {
            int bid = price + increment;
            if (bid <= stop_price_) {
                auction_->bid(bid);
                snapshot_ = SniperSnapshot::bidding(price, bid);
            } else {
                snapshot_ = SniperSnapshot::losing(price);
            }
        } else {
            snapshot_ = SniperSnapshot::winning(price);
        }
        listener_->sniper_state_changed(snapshot_);
    }
};
```

```python
# Evolution 1: 기본
class AuctionSniper:
    def __init__(self, auction: Auction):
        self.auction = auction

    def current_price(self, price: int, increment: int, source: PriceSource):
        if source == PriceSource.FROM_OTHER_BIDDER:
            self.auction.bid(price + increment)

# Evolution 2: 상태 추가
class AuctionSniper:
    def __init__(self, auction: Auction):
        self.auction = auction
        self.state = SniperState.JOINING

    def current_price(self, price: int, increment: int, source: PriceSource):
        if source == PriceSource.FROM_OTHER_BIDDER:
            self.auction.bid(price + increment)
            self.state = SniperState.BIDDING
        else:
            self.state = SniperState.WINNING

# Evolution 3: Listener 추가
class AuctionSniper:
    def __init__(self, auction: Auction, listener: SniperListener):
        self.auction = auction
        self.listener = listener
        self.snapshot = SniperSnapshot.joining()

    def current_price(self, price: int, increment: int, source: PriceSource):
        if source == PriceSource.FROM_OTHER_BIDDER:
            bid = price + increment
            self.auction.bid(bid)
            self.snapshot = SniperSnapshot.bidding(price, bid)
        else:
            self.snapshot = SniperSnapshot.winning(price)
        self.listener.sniper_state_changed(self.snapshot)

# Evolution 4: 한도 추가 (필요할 때)
class AuctionSniper:
    def __init__(self, auction: Auction, listener: SniperListener, stop_price: int):
        self.stop_price = stop_price
        # ... 기존 필드 ...

    def current_price(self, price: int, increment: int, source: PriceSource):
        if source == PriceSource.FROM_OTHER_BIDDER:
            bid = price + increment
            if bid <= self.stop_price:
                self.auction.bid(bid)
                self.snapshot = SniperSnapshot.bidding(price, bid)
            else:
                self.snapshot = SniperSnapshot.losing(price)
        else:
            self.snapshot = SniperSnapshot.winning(price)
        self.listener.sniper_state_changed(self.snapshot)
```

## 7.7 Value Object 활용

### 불변 객체로 상태 전달

```cpp
// Value Object: 불변, 동등성 기반
class SniperSnapshot {
    std::string item_id_;
    int last_price_;
    int last_bid_;
    SniperState state_;

public:
    // 팩토리 메서드로 생성
    static SniperSnapshot joining(const std::string& item_id) {
        return {item_id, 0, 0, SniperState::Joining};
    }

    static SniperSnapshot bidding(const std::string& item_id, int price, int bid) {
        return {item_id, price, bid, SniperState::Bidding};
    }

    // 전환 메서드 (불변 유지)
    SniperSnapshot bidding(int price, int bid) const {
        return {item_id_, price, bid, SniperState::Bidding};
    }

    SniperSnapshot winning(int price) const {
        return {item_id_, price, last_bid_, SniperState::Winning};
    }

    // 동등성
    bool operator==(const SniperSnapshot& other) const {
        return item_id_ == other.item_id_ &&
               last_price_ == other.last_price_ &&
               last_bid_ == other.last_bid_ &&
               state_ == other.state_;
    }

    // Getters (상태 노출 최소화)
    SniperState state() const { return state_; }
};
```

```python
from dataclasses import dataclass

@dataclass(frozen=True)  # 불변
class SniperSnapshot:
    item_id: str
    last_price: int
    last_bid: int
    state: SniperState

    # 팩토리 메서드
    @classmethod
    def joining(cls, item_id: str) -> "SniperSnapshot":
        return cls(item_id, 0, 0, SniperState.JOINING)

    @classmethod
    def from_bidding(cls, item_id: str, price: int, bid: int) -> "SniperSnapshot":
        return cls(item_id, price, bid, SniperState.BIDDING)

    # 전환 메서드 (불변 유지 — 새 객체 반환)
    def bidding(self, price: int, bid: int) -> "SniperSnapshot":
        return SniperSnapshot(self.item_id, price, bid, SniperState.BIDDING)

    def winning(self, price: int) -> "SniperSnapshot":
        return SniperSnapshot(self.item_id, price, self.last_bid, SniperState.WINNING)

    def losing(self, price: int) -> "SniperSnapshot":
        return SniperSnapshot(self.item_id, price, self.last_bid, SniperState.LOSING)
```

## 정리

| 원칙 | 핵심 |
|------|------|
| **테스트 = 첫 사용자** | 사용자 관점에서 인터페이스 결정 |
| **어려운 테스트** | 설계 문제 신호, 무시하지 말 것 |
| **역할 기반 인터페이스** | 사용 측에서 발견, Mock으로 명시 |
| **Listen to Tests** | 테스트 불편함 = 설계 불편함 |
| **점진적 설계** | 필요할 때 진화, 미리 설계 X |
| **Value Object** | 불변 객체로 상태 전달 |

**핵심 질문:**
> 이 테스트가 어렵다면, 무엇이 설계에 문제인가?

## 다음 장 예고

다음 장에서는 서드파티 코드와의 통합에 대해 다룬다. 외부 라이브러리나 프레임워크를 어떻게 테스트 가능하게 감싸고 통합하는지 살펴본다.

## 관련 항목

- [Ch 6: Object-Oriented Style](/blog/programming/engineering/goos/chapter06-object-oriented-style) — 이전 장
- [Ch 8: Building on Third-Party Code](/blog/programming/engineering/goos/chapter08-building-on-third-party) — 다음 장
- [Ch 19: Listening to the Tests](/blog/programming/engineering/goos/chapter19-listening-to-tests) — 테스트 신호로 설계를 진화
- [TDD by Example Ch 1](/blog/programming/engineering/tdd-by-example/ch01) — Detroit school에서 설계가 도출되는 방식과 비교
- [Khorikov Ch 5: Mock과 테스트 취약성](/blog/programming/engineering/khorikov-unit-testing/chapter05-mocks-fragility) — 인터페이스를 Mock으로 발견할 때의 리스크
