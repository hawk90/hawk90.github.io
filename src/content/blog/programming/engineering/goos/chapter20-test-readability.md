---
title: "Ch 20: Test Readability"
date: 2026-05-10T13:00:00
description: "Test as documentation. AAA / Given-When-Then. Helper / Builder 패턴."
tags: [TDD, Readability, Builder]
series: "Growing Object-Oriented Software"
seriesOrder: 20
draft: true
---

> "Tests are executable documentation."
> — 테스트는 실행 가능한 문서다

좋은 테스트는 코드가 무엇을 하는지 명확히 설명한다. 이 장에서는 테스트를 문서처럼 읽을 수 있게 만드는 방법을 다룬다. 도구는 단순하다. 의미 있는 이름, AAA 또는 Given-When-Then 구조, Builder와 Object Mother로 셋업을 압축하기, 그리고 도메인 언어를 닮은 헬퍼다. 한 가지 원칙으로 묶으면, **테스트가 무엇을 하는지 한 화면 안에서 읽힐 것**.

---

## 테스트의 역할

테스트는 3가지 역할을 한다.

| 역할 | 의미 |
|------|------|
| 검증 (Verification) | 코드가 올바르게 동작하는지 확인 |
| 문서화 (Documentation) | 코드의 의도와 사용법을 설명 |
| 설계 도구 (Design Tool) | 좋은 설계를 유도 |

좋은 테스트의 특징:

- 누구나 읽고 이해할 수 있다
- 코드의 의도를 명확히 전달한다
- 실패 시 원인을 쉽게 파악할 수 있다

---

## 테스트 이름 짓기

### 좋은 테스트 이름의 특징

| 패턴 | 예시 |
|------|------|
| `Should_ExpectedBehavior_When_Condition` | `Should_ReturnTrue_When_UserIsAdmin`, `Should_ThrowException_When_BalanceIsNegative` |
| `MethodName_Scenario_ExpectedResult` | `Withdraw_SufficientFunds_DecreasesBalance`, `Login_InvalidPassword_ReturnsError` |
| `Given_When_Then` (BDD) | `GivenEmptyCart_WhenAddItem_ThenCartHasOneItem`, `GivenLoggedInUser_WhenLogout_ThenRedirectToHome` |

핵심 원칙:

- 무엇을 테스트하는지 명확히
- 조건과 기대 결과 포함
- 구현이 아닌 행동 설명

### 예시: 이름 개선

```cpp
// C++ - 나쁜 이름 vs 좋은 이름

// Bad: 무엇을 테스트하는지 불명확
TEST(AuctionTest, Test1) { }
TEST(AuctionTest, TestBid) { }
TEST(AuctionTest, BidWorks) { }

// Good: 조건과 기대 결과가 명확
TEST(AuctionSniper, ReportsLostWhenAuctionClosesWhileJoining) { }
TEST(AuctionSniper, BidsHigherWhenNewPriceArrivesFromOtherBidder) { }
TEST(AuctionSniper, DoesNotBidWhenPriceExceedsStopPrice) { }
```

```python
# Python - 나쁜 이름 vs 좋은 이름

# Bad: 무엇을 테스트하는지 불명확
def test_bid():
    pass

def test_auction():
    pass

# Good: 조건과 기대 결과가 명확
def test_reports_lost_when_auction_closes_while_joining():
    pass

def test_bids_higher_when_new_price_arrives_from_other_bidder():
    pass

def test_does_not_bid_when_price_exceeds_stop_price():
    pass
```

---

## AAA 패턴: Arrange-Act-Assert

### 구조

![AAA Pattern](/images/blog/goos/diagrams/ch20-aaa-pattern.svg)

### 예시

```cpp
// C++ - AAA 패턴 적용
TEST_F(AuctionSniperTest, BidsHigherWhenNewPriceArrives) {
    // Arrange
    const int current_price = 1001;
    const int increment = 25;
    const int expected_bid = current_price + increment;

    // Act
    sniper_->current_price(current_price, increment,
                          PriceSource::FROM_OTHER_BIDDER);

    // Assert
    EXPECT_THAT(auction_.received_bids(), Contains(expected_bid));
    EXPECT_EQ(SniperState::BIDDING, sniper_->state());
}
```

```python
# Python - AAA 패턴 적용
def test_bids_higher_when_new_price_arrives():
    # Arrange
    current_price = 1001
    increment = 25
    expected_bid = current_price + increment
    sniper = create_sniper()

    # Act
    sniper.current_price(current_price, increment, PriceSource.FROM_OTHER_BIDDER)

    # Assert
    assert expected_bid in auction.received_bids
    assert sniper.state == SniperState.BIDDING
```

---

## Given-When-Then (BDD 스타일)

### 구조

| 절 | 예시 문장 |
|----|-----------|
| Given (주어진 조건) | "경매가 진행 중이고, Sniper가 참가한 상태에서" |
| When (실행) | "다른 입찰자가 더 높은 가격을 제시하면" |
| Then (기대 결과) | "Sniper는 그보다 높은 가격으로 입찰해야 한다" |

AAA와의 차이 — AAA는 *기술적 관점* (어떻게), GWT는 *비즈니스 관점* (무엇을).

### 예시

```cpp
// C++ - Given-When-Then 스타일
TEST_F(AuctionSniperTest,
       ReportsLostWhenAuctionClosesWhileBidding) {
    // Given: Sniper가 입찰 중인 상태
    sniper_->current_price(100, 10, PriceSource::FROM_OTHER_BIDDER);
    ASSERT_EQ(SniperState::BIDDING, sniper_->state());

    // When: 경매가 종료됨
    sniper_->auction_closed();

    // Then: Sniper는 패배 상태가 됨
    EXPECT_EQ(SniperState::LOST, sniper_->state());
}
```

```python
# Python - Given-When-Then 스타일 (pytest-bdd 없이)
def test_reports_lost_when_auction_closes_while_bidding():
    # Given: Sniper가 입찰 중인 상태
    sniper = create_sniper()
    sniper.current_price(100, 10, PriceSource.FROM_OTHER_BIDDER)
    assert sniper.state == SniperState.BIDDING

    # When: 경매가 종료됨
    sniper.auction_closed()

    # Then: Sniper는 패배 상태가 됨
    assert sniper.state == SniperState.LOST
```

---

## Test Data Builder 패턴

### 문제: 복잡한 객체 생성

```cpp
// C++ - 복잡한 객체 생성 (문제)
TEST_F(OrderTest, CalculatesTotalWithTax) {
    // 객체 생성이 너무 길다
    auto customer = Customer("cust-1", "John", "john@example.com",
        Address("123 Main", "Seoul", "Korea", "12345"),
        PaymentMethod("credit_card", "1234-5678-9012-3456", "12/25"));

    auto item1 = OrderItem("prod-1", "Widget", 100, 2);
    auto item2 = OrderItem("prod-2", "Gadget", 200, 1);

    auto order = Order("order-1", customer, {item1, item2},
        ShippingMethod::EXPRESS, TaxRate::STANDARD);

    // 실제 테스트는 이 한 줄뿐
    EXPECT_EQ(440, order.total_with_tax());
}
```

### 해결: Builder 패턴

```cpp
// C++ - Test Data Builder
class OrderBuilder {
public:
    OrderBuilder() {
        // 합리적인 기본값
        order_.id = "default-order";
        order_.customer = CustomerBuilder().build();
        order_.shipping = ShippingMethod::STANDARD;
        order_.tax_rate = TaxRate::STANDARD;
    }

    OrderBuilder& with_id(const std::string& id) {
        order_.id = id;
        return *this;
    }

    OrderBuilder& with_customer(const Customer& customer) {
        order_.customer = customer;
        return *this;
    }

    OrderBuilder& with_item(const std::string& name, int price, int qty = 1) {
        order_.items.push_back({name, price, qty});
        return *this;
    }

    OrderBuilder& with_shipping(ShippingMethod method) {
        order_.shipping = method;
        return *this;
    }

    Order build() const { return order_; }

    // 특수 용도 팩토리 메서드
    static Order an_order_with_total(int total) {
        return OrderBuilder()
            .with_item("Item", total, 1)
            .build();
    }

private:
    Order order_;
};

// 테스트에서 사용
TEST_F(OrderTest, CalculatesTotalWithTax) {
    auto order = OrderBuilder()
        .with_item("Widget", 100, 2)   // 200
        .with_item("Gadget", 200, 1)   // 200
        .build();                       // 합계: 400

    EXPECT_EQ(440, order.total_with_tax());  // 400 * 1.1 = 440
}
```

```python
# Python - Test Data Builder
from dataclasses import dataclass, field
from typing import List


@dataclass
class OrderBuilder:
    """테스트용 Order 빌더"""

    _id: str = "default-order"
    _customer: Customer = None
    _items: List[OrderItem] = field(default_factory=list)
    _shipping: ShippingMethod = ShippingMethod.STANDARD
    _tax_rate: TaxRate = TaxRate.STANDARD

    def __post_init__(self):
        if self._customer is None:
            self._customer = CustomerBuilder().build()

    def with_id(self, id: str) -> "OrderBuilder":
        self._id = id
        return self

    def with_customer(self, customer: Customer) -> "OrderBuilder":
        self._customer = customer
        return self

    def with_item(self, name: str, price: int, qty: int = 1) -> "OrderBuilder":
        self._items.append(OrderItem(name, price, qty))
        return self

    def with_shipping(self, method: ShippingMethod) -> "OrderBuilder":
        self._shipping = method
        return self

    def build(self) -> Order:
        return Order(
            id=self._id,
            customer=self._customer,
            items=self._items,
            shipping=self._shipping,
            tax_rate=self._tax_rate
        )

    @staticmethod
    def an_order_with_total(total: int) -> Order:
        """특수 용도 팩토리"""
        return OrderBuilder().with_item("Item", total).build()


# 테스트에서 사용
def test_calculates_total_with_tax():
    order = (
        OrderBuilder()
        .with_item("Widget", 100, 2)   # 200
        .with_item("Gadget", 200, 1)   # 200
        .build()                        # 합계: 400
    )

    assert order.total_with_tax() == 440  # 400 * 1.1 = 440
```

---

## Object Mother 안티패턴

### 문제

```cpp
// C++ - Object Mother (안티패턴)
class TestDataFactory {
public:
    static Order create_order_for_happy_path() {
        return Order(/* 많은 파라미터 */);
    }

    static Order create_order_with_tax() {
        return Order(/* 다른 파라미터 */);
    }

    static Order create_order_for_shipping_test() {
        return Order(/* 또 다른 파라미터 */);
    }

    static Order create_order_for_discount_test() {
        return Order(/* 또또 다른 파라미터 */);
    }

    // 메서드가 폭발적으로 증가...
};
```

### 문제점

| # | 문제 | 세부 |
|---|------|------|
| 1 | 조합 폭발 | N개 옵션 → 2^N 개 메서드 필요, 유지보수 어려움 |
| 2 | 숨겨진 의도 | `create_order_for_happy_path()`가 정확히 무엇인지 불명확, 테스트 의도가 팩토리에 숨김 |
| 3 | 결합도 증가 | 팩토리 변경 시 많은 테스트 영향, 테스트 간 암묵적 의존성 |

해결 — Builder 패턴 사용. 조합 가능 + 의도 명확 + 유연함.

### Builder vs Object Mother

```cpp
// Object Mother - 의도가 숨겨짐
auto order = TestDataFactory::create_order_for_tax_test();

// Builder - 의도가 명확함
auto order = OrderBuilder()
    .with_item("Widget", 100)
    .with_tax_rate(TaxRate::HIGH)
    .build();
```

---

## Domain-Specific Test API

### 문제: 저수준 코드

```cpp
// C++ - 저수준 테스트 코드
TEST_F(AuctionSniperEndToEndTest, SniperWinsAuction) {
    // 테스트 의도가 구현 세부사항에 묻힘
    xmpp_server_.create_room("item-54321@auction.localhost");
    xmpp_server_.start();

    application_.set_xmpp_host("localhost");
    application_.set_xmpp_port(5222);
    application_.set_username("sniper");
    application_.set_password("sniper");
    application_.add_item("item-54321");
    application_.start();

    std::this_thread::sleep_for(std::chrono::seconds(1));

    xmpp_server_.send_to_room("item-54321@auction.localhost",
        "SOLVersion: 1.1; Event: PRICE; CurrentPrice: 1000; Increment: 98; "
        "Bidder: other@localhost;");

    std::this_thread::sleep_for(std::chrono::milliseconds(500));

    auto messages = xmpp_server_.get_received_messages("item-54321@auction.localhost");
    bool found_bid = false;
    for (const auto& msg : messages) {
        if (msg.find("Command: BID") != std::string::npos &&
            msg.find("Price: 1098") != std::string::npos) {
            found_bid = true;
            break;
        }
    }
    EXPECT_TRUE(found_bid);
}
```

### 해결: Domain-Specific API

```cpp
// C++ - Domain-Specific Test API
TEST_F(AuctionSniperEndToEndTest, SniperWinsAuction) {
    // 비즈니스 언어로 테스트 작성
    auction_.start_selling_item();

    application_.start_bidding_in(auction_);

    auction_.has_received_join_request_from_sniper();

    auction_.report_price(1000, 98, "other bidder");
    application_.has_shown_sniper_is_bidding(1000, 1098);

    auction_.has_received_bid(1098, SNIPER_XMPP_ID);

    auction_.report_price(1098, 97, SNIPER_XMPP_ID);
    application_.has_shown_sniper_is_winning(1098);

    auction_.announce_closed();
    application_.shows_sniper_has_won_auction(1098);
}
```

```python
# Python - Domain-Specific Test API
def test_sniper_wins_auction():
    """Sniper가 경매에서 승리하는 시나리오"""
    # 비즈니스 언어로 테스트 작성
    auction.start_selling_item()

    application.start_bidding_in(auction)

    auction.has_received_join_request_from_sniper()

    auction.report_price(1000, 98, "other bidder")
    application.has_shown_sniper_is_bidding(1000, 1098)

    auction.has_received_bid(1098, SNIPER_XMPP_ID)

    auction.report_price(1098, 97, SNIPER_XMPP_ID)
    application.has_shown_sniper_is_winning(1098)

    auction.announce_closed()
    application.shows_sniper_has_won_auction(1098)
```

### Driver/DSL 클래스 구현

```cpp
// C++ - FakeAuctionServer (Domain-Specific API)
class FakeAuctionServer {
public:
    // 비즈니스 의미가 있는 메서드 이름
    void start_selling_item() {
        xmpp_.create_room(item_id_);
        xmpp_.start();
    }

    void report_price(int price, int increment, const std::string& bidder) {
        std::string message =
            "SOLVersion: 1.1; Event: PRICE; "
            "CurrentPrice: " + std::to_string(price) + "; "
            "Increment: " + std::to_string(increment) + "; "
            "Bidder: " + bidder + ";";
        xmpp_.send_to_room(auction_jid_, message);
    }

    void announce_closed() {
        xmpp_.send_to_room(auction_jid_, "SOLVersion: 1.1; Event: CLOSE;");
    }

    void has_received_join_request_from_sniper() {
        auto message = wait_for_message(std::chrono::seconds(5));
        if (message.find("Command: JOIN") == std::string::npos) {
            throw AssertionError("Expected JOIN but got: " + message);
        }
    }

    void has_received_bid(int bid, const std::string& sniper_id) {
        auto message = wait_for_message(std::chrono::seconds(5));
        std::string expected = "Command: BID; Price: " + std::to_string(bid);
        if (message.find(expected) == std::string::npos) {
            throw AssertionError("Expected BID " + std::to_string(bid) +
                               " but got: " + message);
        }
    }

private:
    std::string wait_for_message(std::chrono::seconds timeout);
};
```

```python
# Python - FakeAuctionServer (Domain-Specific API)
class FakeAuctionServer:
    """테스트용 경매 서버 - 도메인 언어로 API 제공"""

    def start_selling_item(self) -> None:
        """경매 시작"""
        self._xmpp.create_room(self._item_id)
        self._xmpp.start()

    def report_price(self, price: int, increment: int, bidder: str) -> None:
        """현재 가격 알림"""
        message = (
            f"SOLVersion: 1.1; Event: PRICE; "
            f"CurrentPrice: {price}; "
            f"Increment: {increment}; "
            f"Bidder: {bidder};"
        )
        self._xmpp.send_to_room(self._auction_jid, message)

    def announce_closed(self) -> None:
        """경매 종료 알림"""
        self._xmpp.send_to_room(self._auction_jid, "SOLVersion: 1.1; Event: CLOSE;")

    def has_received_join_request_from_sniper(self, timeout: float = 5.0) -> None:
        """JOIN 요청 수신 확인"""
        message = self._wait_for_message(timeout)
        if "Command: JOIN" not in message:
            raise AssertionError(f"Expected JOIN but got: {message}")

    def has_received_bid(self, bid: int, sniper_id: str, timeout: float = 5.0) -> None:
        """입찰 요청 수신 확인"""
        message = self._wait_for_message(timeout)
        expected = f"Command: BID; Price: {bid}"
        if expected not in message:
            raise AssertionError(f"Expected BID {bid} but got: {message}")
```

---

## 테스트 가독성 체크리스트

**테스트 이름**

- [ ] 테스트하는 행동이 명확한가?
- [ ] 조건(Given/When)이 포함되어 있는가?
- [ ] 기대 결과(Then)가 포함되어 있는가?

**테스트 구조**

- [ ] AAA 또는 GWT 패턴을 따르는가?
- [ ] 각 섹션이 명확히 구분되는가?
- [ ] Act 섹션이 한 줄인가?

**객체 생성**

- [ ] Builder 패턴을 사용하는가?
- [ ] 테스트에 필요한 것만 설정하는가?
- [ ] 기본값이 합리적인가?

**검증**

- [ ] 기대값이 명시적인가?
- [ ] 테스트에 로직이 없는가?
- [ ] 실패 메시지가 유용한가?

**전체**

- [ ] 도메인 언어를 사용하는가?
- [ ] 코드를 모르는 사람도 이해할 수 있는가?
- [ ] 테스트가 문서 역할을 하는가?

---

## 요약

| 영역 | 핵심 |
|------|------|
| 테스트 이름 | 행동·조건·기대 결과 포함, 구현이 아닌 행동 설명, 읽으면 무엇을 테스트하는지 알 수 있어야 |
| 테스트 구조 | AAA (Arrange-Act-Assert), GWT (Given-When-Then), 섹션 간 명확한 구분 |
| 객체 생성 | Test Data Builder 패턴 사용, Object Mother 피하기, 의도를 드러내는 API |
| Domain-Specific API | 비즈니스 언어로 테스트 작성, 저수준 세부사항 숨기기, 테스트가 문서 역할 |

---

## 다음 장 예고

다음 장에서는 **Test Flexibility**를 다룬다. 테스트가 코드 변경에 유연하게 대응하는 방법, 테스트 결합도를 낮추는 방법을 배운다.

## 관련 항목

- [Ch 19: Listening to the Tests](/blog/programming/engineering/goos/chapter19-listening-to-tests) — 이전 장
- [Ch 21: Test Flexibility](/blog/programming/engineering/goos/chapter21-test-flexibility) — 다음 장
- [Khorikov Ch 7: 단위 테스트 리팩토링](/blog/programming/engineering/khorikov-unit-testing/chapter07-refactoring) — Builder/Object Mother로 테스트 가독성 끌어올리기
- [TDD Patterns](/blog/programming/engineering/tdd-patterns/chapter05-tdd-patterns) — Kent Beck의 가독성 패턴 카탈로그
