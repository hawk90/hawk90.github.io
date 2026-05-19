---
title: "Ch 2: Test-Driven Development with Objects"
date: 2026-05-10T02:00:00
description: "객체와 협력 — Tell Don't Ask. 역할 / 책임 중심 설계."
tags: [TDD, OO, Tell Don't Ask]
series: "Growing Object-Oriented Software"
seriesOrder: 2
draft: true
---

TDD와 객체지향은 자연스럽게 결합된다. 객체의 협력 관계를 테스트가 발견하고, 테스트가 좋은 객체 설계를 이끈다.

## 2.1 객체지향의 핵심

### 객체 = 데이터 + 행동

![객체의 본질](/images/blog/goos/diagrams/ch02-object-nature.svg)

### 메시지 전달

```cpp
// C++ — 절차적: 데이터를 꺼내서 처리
if (order.get_status() == Status::Pending) {
    order.set_status(Status::Shipped);
    inventory.decrease(order.get_item_id(), order.get_quantity());
    email_service.send(order.get_customer_email(), "Shipped!");
}

// C++ — 객체지향: 메시지를 보내서 처리
order.ship(inventory, email_service);
```

```python
# Python — 절차적
if order.status == Status.PENDING:
    order.status = Status.SHIPPED
    inventory.decrease(order.item_id, order.quantity)
    email_service.send(order.customer_email, "Shipped!")

# Python — 객체지향
order.ship(inventory, email_service)
```

## 2.2 Tell, Don't Ask

### 원칙

![Tell, Don't Ask](/images/blog/goos/diagrams/ch02-tell-dont-ask.svg)

### 코드 비교

```cpp
// C++ ❌ Ask: 객체의 상태를 묻고 외부에서 처리
void process_order(Order& order) {
    if (order.get_status() == Status::Pending &&
        order.get_payment().is_complete() &&
        order.get_stock() > 0) {

        order.set_status(Status::Shipped);
        send_shipment_notification(order.get_customer_email());
    }
}

// C++ ✅ Tell: 객체에게 시키기
void process_order(Order& order) {
    order.ship_if_ready([this](const std::string& email) {
        send_shipment_notification(email);
    });
}

// Order 클래스 내부
class Order {
public:
    template<typename Notifier>
    void ship_if_ready(Notifier notifier) {
        if (can_ship()) {
            status_ = Status::Shipped;
            notifier(customer_email_);
        }
    }

private:
    bool can_ship() const {
        return status_ == Status::Pending &&
               payment_.is_complete() &&
               stock_ > 0;
    }
};
```

```python
# Python ❌ Ask
def process_order(order: Order):
    if (order.status == Status.PENDING and
        order.payment.is_complete() and
        order.stock > 0):

        order.status = Status.SHIPPED
        send_shipment_notification(order.customer_email)

# Python ✅ Tell
def process_order(order: Order):
    order.ship_if_ready(send_shipment_notification)

# Order 클래스
class Order:
    def ship_if_ready(self, notifier: Callable[[str], None]):
        if self._can_ship():
            self.status = Status.SHIPPED
            notifier(self.customer_email)

    def _can_ship(self) -> bool:
        return (self.status == Status.PENDING and
                self.payment.is_complete() and
                self.stock > 0)
```

### 왜 Tell이 더 좋은가?

| Ask | Tell |
|-----|------|
| 로직이 여러 곳에 분산 | 로직이 객체 안에 집중 |
| 변경 시 여러 곳 수정 | 변경 시 한 곳만 수정 |
| 캡슐화 위반 | 캡슐화 유지 |
| 테스트 어려움 | 테스트 용이 |

## 2.3 역할, 책임, 협력

### 세 가지 개념

![Roles, Responsibilities, Collaborations](/images/blog/goos/diagrams/ch02-roles-responsibilities.svg)

### 인터페이스로 역할 표현

```cpp
// C++ — 역할 = 추상 클래스/인터페이스
class AuctionEventListener {
public:
    virtual ~AuctionEventListener() = default;
    virtual void auction_closed() = 0;
    virtual void current_price(int price, int increment, PriceSource source) = 0;
    virtual void auction_failed() = 0;
};

// 협력 = 의존성 주입
class AuctionMessageTranslator {
    AuctionEventListener* listener_;  // 협력자
public:
    explicit AuctionMessageTranslator(AuctionEventListener* listener)
        : listener_{listener} {}

    void process_message(std::string_view message) {
        auto event = AuctionEvent::from(message);
        if (event.type() == "CLOSE") {
            listener_->auction_closed();
        } else if (event.type() == "PRICE") {
            listener_->current_price(event.price(), event.increment(), event.source());
        }
    }
};
```

```python
# Python — 역할 = Protocol (또는 ABC)
from typing import Protocol

class AuctionEventListener(Protocol):
    def auction_closed(self) -> None: ...
    def current_price(self, price: int, increment: int, source: PriceSource) -> None: ...
    def auction_failed(self) -> None: ...

# 협력 = 의존성 주입
class AuctionMessageTranslator:
    def __init__(self, listener: AuctionEventListener):
        self.listener = listener  # 협력자

    def process_message(self, message: str):
        event = AuctionEvent.from_string(message)
        if event.type == "CLOSE":
            self.listener.auction_closed()
        elif event.type == "PRICE":
            self.listener.current_price(event.price, event.increment, event.source)
```

## 2.4 Value vs Entity

### 두 가지 객체 유형

| 특성 | Value Object | Entity |
|------|--------------|--------|
| **정체성** | 값으로 식별 | ID로 식별 |
| **가변성** | 불변 | 가변 |
| **비교** | equals by value | equals by ID |
| **예시** | Money, Point | User, Order |

### Value Object

```cpp
// C++ — Value Object (불변)
class Money {
    int amount_;
    Currency currency_;
public:
    Money(int amount, Currency currency)
        : amount_{amount}, currency_{currency} {}

    Money add(const Money& other) const {
        if (currency_ != other.currency_) {
            throw std::invalid_argument("Currency mismatch");
        }
        return Money{amount_ + other.amount_, currency_};
    }

    bool operator==(const Money& other) const {
        return amount_ == other.amount_ && currency_ == other.currency_;
    }
};
```

```python
# Python — Value Object (불변, dataclass)
from dataclasses import dataclass

@dataclass(frozen=True)
class Money:
    amount: int
    currency: Currency

    def add(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise ValueError("Currency mismatch")
        return Money(self.amount + other.amount, self.currency)
```

### Entity

```cpp
// C++ — Entity (가변, ID로 식별)
class Order {
    OrderId id_;
    OrderStatus status_;
    Money total_;
public:
    explicit Order(OrderId id)
        : id_{id}, status_{OrderStatus::Pending} {}

    void ship() {
        if (status_ != OrderStatus::Pending) {
            throw std::logic_error("Cannot ship");
        }
        status_ = OrderStatus::Shipped;
    }

    bool operator==(const Order& other) const {
        return id_ == other.id_;  // ID만 비교
    }
};
```

```python
# Python — Entity
class Order:
    def __init__(self, order_id: OrderId):
        self.id = order_id
        self.status = OrderStatus.PENDING

    def ship(self):
        if self.status != OrderStatus.PENDING:
            raise ValueError("Cannot ship")
        self.status = OrderStatus.SHIPPED

    def __eq__(self, other):
        return isinstance(other, Order) and self.id == other.id
```

## 2.5 Mock으로 협력 테스트

### 협력자를 Mock으로

![Mock의 역할](/images/blog/goos/diagrams/ch02-mock-roles.svg)

### Mock 테스트 예시

```cpp
// C++ (Google Mock)
TEST(AuctionMessageTranslatorTest, NotifiesClosedWhenCloseMessage) {
    // Arrange: Mock 협력자 생성
    MockAuctionEventListener listener;
    AuctionMessageTranslator translator{&listener};

    // Assert: 협력자에게 올바른 메시지 전달 검증
    EXPECT_CALL(listener, auction_closed()).Times(1);

    // Act: SUT 실행
    translator.process_message("SOLVersion: 1.1; Event: CLOSE;");
}

TEST(AuctionMessageTranslatorTest, NotifiesPriceWhenPriceMessage) {
    MockAuctionEventListener listener;
    AuctionMessageTranslator translator{&listener};

    EXPECT_CALL(listener, current_price(192, 7, PriceSource::FromOtherBidder));

    translator.process_message(
        "SOLVersion: 1.1; Event: PRICE; CurrentPrice: 192; Increment: 7; Bidder: other;");
}
```

```python
# Python (pytest + unittest.mock)
from unittest.mock import Mock, create_autospec

def test_notifies_closed_when_close_message():
    # Arrange
    listener = create_autospec(AuctionEventListener)
    translator = AuctionMessageTranslator(listener)

    # Act
    translator.process_message("SOLVersion: 1.1; Event: CLOSE;")

    # Assert
    listener.auction_closed.assert_called_once()

def test_notifies_price_when_price_message():
    listener = create_autospec(AuctionEventListener)
    translator = AuctionMessageTranslator(listener)

    translator.process_message(
        "SOLVersion: 1.1; Event: PRICE; CurrentPrice: 192; Increment: 7; Bidder: other;")

    listener.current_price.assert_called_once_with(
        192, 7, PriceSource.FROM_OTHER_BIDDER)
```

## 2.6 인터페이스 발견 과정

### 테스트가 인터페이스를 발견

![테스트를 통한 인터페이스 발견](/images/blog/goos/diagrams/ch02-interface-discovery.svg)

### 점진적 인터페이스 발견

```python
# 첫 테스트: 단순한 시나리오
def test_reports_loss_when_auction_closes():
    listener = Mock(spec=SniperListener)
    sniper = AuctionSniper(listener)

    sniper.auction_closed()

    listener.sniper_lost.assert_called_once()  # 첫 번째 메서드 발견

# 두 번째 테스트: 더 복잡한 시나리오
def test_bids_higher_when_new_price_arrives():
    auction = Mock(spec=Auction)
    listener = Mock(spec=SniperListener)
    sniper = AuctionSniper(auction, listener)

    sniper.current_price(100, 10, PriceSource.FROM_OTHER_BIDDER)

    auction.bid.assert_called_with(110)  # 새로운 협력자 발견
    listener.sniper_bidding.assert_called_once()

# 세 번째 테스트: 엣지 케이스
def test_reports_won_when_auction_closes_while_winning():
    listener = Mock(spec=SniperListener)
    sniper = AuctionSniper(listener)

    sniper.current_price(100, 10, PriceSource.FROM_SNIPER)
    sniper.auction_closed()

    listener.sniper_won.assert_called_once()  # 인터페이스 완성
```

```cpp
// C++ — 점진적 인터페이스 발견
TEST(AuctionSniperTest, ReportsLossWhenAuctionCloses) {
    MockSniperListener listener;
    AuctionSniper sniper{&listener};

    EXPECT_CALL(listener, sniper_lost());

    sniper.auction_closed();
}

TEST(AuctionSniperTest, BidsHigherWhenNewPriceArrives) {
    MockAuction auction;
    MockSniperListener listener;
    AuctionSniper sniper{&auction, &listener};

    EXPECT_CALL(auction, bid(110));
    EXPECT_CALL(listener, sniper_bidding());

    sniper.current_price(100, 10, PriceSource::FromOtherBidder);
}
```

## 정리

| 개념 | 핵심 |
|------|------|
| **Tell, Don't Ask** | 상태를 묻지 말고 행동을 요청 |
| **역할/책임/협력** | 객체는 역할을 갖고, 책임을 수행하며, 협력한다 |
| **Value vs Entity** | 불변 값 객체 vs 가변 엔티티 |
| **Mock** | 협력자의 역할을 대신하며 인터페이스 발견 |
| **인터페이스 발견** | 테스트가 필요한 인터페이스를 알려줌 |

**핵심 질문:**
> 이 객체가 협력자에게 무엇을 **요청**해야 하는가? (무엇을 **물어봐야** 하는가가 아니라)

## 다음 장 예고

다음 장에서는 TDD에 사용되는 도구와 기술을 다룬다. Google Test, pytest, Mock 라이브러리 등 C++과 Python 테스트 환경을 살펴본다.
