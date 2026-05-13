---
title: "Ch 19: Listening to the Tests"
date: 2026-10-13T01:00:00
description: "테스트가 어렵다 = 디자인이 어렵다. 신호 / 해석 / 액션."
tags: [TDD, Test Smells]
series: "Growing Object-Oriented Software"
seriesOrder: 19
---

> "The tests are telling us something about our design."
> — 테스트가 설계에 대해 말하고 있다

테스트 작성이 어렵다면, 그것은 설계가 어렵다는 신호다. 이 장에서는 테스트가 주는 피드백을 해석하고, 설계를 개선하는 방법을 배운다.

---

## 테스트의 목소리

```
┌─────────────────────────────────────────────────────────────────┐
│                   TESTS AS DESIGN FEEDBACK                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐         ┌─────────────┐         ┌───────────┐ │
│  │  테스트가   │         │   이것은    │         │  설계를   │ │
│  │  어렵다면   │────────▶│   신호다    │────────▶│ 개선하라  │ │
│  └─────────────┘         └─────────────┘         └───────────┘ │
│                                                                 │
│  핵심 원칙:                                                     │
│  • 테스트 어려움 = 설계 문제                                    │
│  • 테스트 냄새 = 코드 냄새                                      │
│  • 테스트는 첫 번째 클라이언트                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 신호 1: Mock이 너무 많다

### 증상

```cpp
// C++ - Mock이 너무 많은 테스트
class AuctionControllerTest : public ::testing::Test {
protected:
    MockAuction auction_;
    MockInventory inventory_;
    MockPayment payment_;
    MockShipping shipping_;
    MockNotification notification_;
    MockLogger logger_;
    MockMetrics metrics_;
    MockCache cache_;

    std::unique_ptr<AuctionController> controller_;

    void SetUp() override {
        controller_ = std::make_unique<AuctionController>(
            &auction_, &inventory_, &payment_, &shipping_,
            &notification_, &logger_, &metrics_, &cache_
        );
    }
};

TEST_F(AuctionControllerTest, ProcessesBid) {
    // 8개의 mock을 설정해야 함...
    EXPECT_CALL(auction_, current_price()).WillOnce(Return(100));
    EXPECT_CALL(inventory_, check_availability(_)).WillOnce(Return(true));
    EXPECT_CALL(payment_, validate(_)).WillOnce(Return(true));
    // ... 더 많은 설정
}
```

### 진단

```
┌─────────────────────────────────────────────────────────────────┐
│                     TOO MANY MOCKS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  신호: 테스트에서 5개 이상의 mock 필요                          │
│                                                                 │
│  원인:                                                          │
│  • 클래스가 너무 많은 책임을 가짐 (SRP 위반)                    │
│  • 너무 많은 협력자에 의존                                      │
│  • God Object 패턴                                              │
│                                                                 │
│  해결:                                                          │
│  • 책임 분리 (Extract Class)                                    │
│  • 관련 의존성 그룹화 (Introduce Parameter Object)              │
│  • Facade 패턴 적용                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 해결: 책임 분리

```cpp
// C++ - 책임 분리 후
// 결제 관련 책임을 PaymentProcessor로 분리
class PaymentProcessor {
public:
    PaymentProcessor(Payment* payment, Notification* notification)
        : payment_(payment), notification_(notification) {}

    bool process(const Bid& bid) {
        if (payment_->validate(bid)) {
            payment_->charge(bid);
            notification_->send_confirmation(bid);
            return true;
        }
        return false;
    }

private:
    Payment* payment_;
    Notification* notification_;
};

// 이제 AuctionController 테스트가 더 간단해짐
class AuctionControllerTest : public ::testing::Test {
protected:
    MockAuction auction_;
    MockPaymentProcessor payment_processor_;  // 2개로 줄어듦

    std::unique_ptr<AuctionController> controller_;
};
```

```python
# Python - 책임 분리 후
class PaymentProcessor:
    """결제 관련 책임을 담당"""

    def __init__(self, payment: Payment, notification: Notification):
        self._payment = payment
        self._notification = notification

    def process(self, bid: Bid) -> bool:
        if self._payment.validate(bid):
            self._payment.charge(bid)
            self._notification.send_confirmation(bid)
            return True
        return False


class TestAuctionController:
    """이제 테스트가 더 간단해짐"""

    @pytest.fixture
    def auction(self):
        return Mock(spec=Auction)

    @pytest.fixture
    def payment_processor(self):
        return Mock(spec=PaymentProcessor)  # 의존성 2개로 줄어듦

    @pytest.fixture
    def controller(self, auction, payment_processor):
        return AuctionController(auction, payment_processor)
```

---

## 신호 2: 테스트 Setup이 거대하다

### 증상

```python
# Python - 거대한 Setup
class TestOrderProcessor:
    @pytest.fixture
    def processor(self):
        # 50줄 이상의 Setup...
        customer = Customer(
            id="cust-1",
            name="John",
            email="john@example.com",
            address=Address(
                street="123 Main St",
                city="Seoul",
                country="Korea",
                zip_code="12345"
            ),
            payment_method=PaymentMethod(
                type="credit_card",
                number="1234-5678-9012-3456",
                expiry="12/25",
                cvv="123"
            )
        )

        products = [
            Product(id="p1", name="Item 1", price=100),
            Product(id="p2", name="Item 2", price=200),
            Product(id="p3", name="Item 3", price=300),
        ]

        inventory = Inventory()
        for p in products:
            inventory.add(p, quantity=10)

        shipping_options = [
            ShippingOption("standard", 5.00, days=7),
            ShippingOption("express", 15.00, days=2),
        ]

        # ... 더 많은 설정

        return OrderProcessor(
            customer, products, inventory, shipping_options,
            # ... 더 많은 인자
        )
```

### 진단

```
┌─────────────────────────────────────────────────────────────────┐
│                      HUGE SETUP                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  신호: Setup이 테스트 코드보다 길다                             │
│                                                                 │
│  원인:                                                          │
│  • 너무 많은 의존성                                             │
│  • 객체 구성이 복잡함                                           │
│  • 테스트하려는 단위가 너무 큼                                  │
│                                                                 │
│  해결:                                                          │
│  • Builder 패턴으로 객체 생성 단순화                            │
│  • Test Data Builder 사용                                       │
│  • Object Mother 패턴                                           │
│  • 기본값이 있는 Factory 메서드                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 해결: Test Data Builder

```cpp
// C++ - Test Data Builder
class CustomerBuilder {
public:
    CustomerBuilder() {
        // 합리적인 기본값
        customer_.id = "default-id";
        customer_.name = "Default Name";
        customer_.email = "default@example.com";
    }

    CustomerBuilder& with_id(const std::string& id) {
        customer_.id = id;
        return *this;
    }

    CustomerBuilder& with_name(const std::string& name) {
        customer_.name = name;
        return *this;
    }

    CustomerBuilder& with_email(const std::string& email) {
        customer_.email = email;
        return *this;
    }

    Customer build() const { return customer_; }

private:
    Customer customer_;
};

// 테스트에서 사용
TEST_F(OrderTest, ProcessesOrderForValidCustomer) {
    auto customer = CustomerBuilder()
        .with_name("John Doe")
        .build();  // 나머지는 기본값

    auto order = OrderBuilder()
        .with_customer(customer)
        .build();

    EXPECT_TRUE(processor_.process(order));
}
```

```python
# Python - Test Data Builder
from dataclasses import dataclass, field


@dataclass
class CustomerBuilder:
    """테스트용 Customer 빌더"""

    _id: str = "default-id"
    _name: str = "Default Name"
    _email: str = "default@example.com"
    _address: Address = field(default_factory=lambda: Address.default())

    def with_id(self, id: str) -> "CustomerBuilder":
        self._id = id
        return self

    def with_name(self, name: str) -> "CustomerBuilder":
        self._name = name
        return self

    def with_email(self, email: str) -> "CustomerBuilder":
        self._email = email
        return self

    def build(self) -> Customer:
        return Customer(
            id=self._id,
            name=self._name,
            email=self._email,
            address=self._address
        )


# 테스트에서 사용
def test_processes_order_for_valid_customer():
    customer = CustomerBuilder().with_name("John Doe").build()
    order = OrderBuilder().with_customer(customer).build()

    assert processor.process(order) is True
```

---

## 신호 3: 테스트에 로직이 있다

### 증상

```cpp
// C++ - 테스트 안에 로직
TEST_F(PricingTest, CalculatesDiscountedPrice) {
    auto items = create_items({100, 200, 300});

    // 테스트 안에서 계산 (중복!)
    int expected_total = 0;
    for (const auto& item : items) {
        expected_total += item.price;
    }
    expected_total = expected_total * 0.9;  // 10% 할인

    EXPECT_EQ(expected_total, calculator_.calculate(items, 0.1));
}
```

### 진단

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOGIC IN TESTS                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  신호: 테스트에서 루프, 조건문, 계산 수행                       │
│                                                                 │
│  원인:                                                          │
│  • 프로덕션 코드 로직을 테스트에서 복제                         │
│  • 테스트가 구현을 검증하지 못함                                │
│  • 버그가 있어도 테스트가 통과할 수 있음                        │
│                                                                 │
│  해결:                                                          │
│  • 기대값을 리터럴로 명시                                       │
│  • 테스트 케이스별로 분리                                       │
│  • 계산 결과를 미리 알고 있는 값 사용                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 해결: 명시적 기대값

```cpp
// C++ - 명시적 기대값
TEST_F(PricingTest, AppliesTenPercentDiscountToTotal) {
    auto items = create_items({100, 200, 300});  // 합계: 600

    // 기대값을 명시적으로 (600 * 0.9 = 540)
    EXPECT_EQ(540, calculator_.calculate(items, 0.1));
}

TEST_F(PricingTest, ReturnsFullPriceWithZeroDiscount) {
    auto items = create_items({100, 200, 300});

    EXPECT_EQ(600, calculator_.calculate(items, 0.0));
}

TEST_F(PricingTest, AppliesFiftyPercentDiscount) {
    auto items = create_items({100, 200, 300});

    EXPECT_EQ(300, calculator_.calculate(items, 0.5));
}
```

```python
# Python - 명시적 기대값
class TestPricing:
    def test_applies_ten_percent_discount_to_total(self):
        items = create_items([100, 200, 300])  # 합계: 600

        # 기대값을 명시적으로 (600 * 0.9 = 540)
        assert calculator.calculate(items, discount=0.1) == 540

    def test_returns_full_price_with_zero_discount(self):
        items = create_items([100, 200, 300])

        assert calculator.calculate(items, discount=0.0) == 600

    def test_applies_fifty_percent_discount(self):
        items = create_items([100, 200, 300])

        assert calculator.calculate(items, discount=0.5) == 300
```

---

## 신호 4: 클래스가 터지려 한다

### 증상

```python
# Python - 너무 커진 클래스
class AuctionSniper:
    def __init__(self, ...):
        # 20개 이상의 인스턴스 변수
        self._item_id = item_id
        self._auction = auction
        self._listener = listener
        self._state = SniperState.JOINING
        self._last_price = 0
        self._last_bid = 0
        self._stop_price = stop_price
        self._bid_count = 0
        self._max_bids = max_bids
        self._time_limit = time_limit
        self._started_at = None
        self._ended_at = None
        self._error_count = 0
        self._retry_count = 0
        # ... 더 많은 변수

    def auction_closed(self): ...
    def current_price(self, ...): ...
    def bid(self, ...): ...
    def cancel(self): ...
    def pause(self): ...
    def resume(self): ...
    def get_statistics(self): ...
    def export_history(self): ...
    def validate_bid(self, ...): ...
    def calculate_next_bid(self, ...): ...
    # ... 더 많은 메서드
```

### 진단

```
┌─────────────────────────────────────────────────────────────────┐
│                   BURSTING AT THE SEAMS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  신호:                                                          │
│  • 클래스에 변수가 너무 많음 (10개 이상)                        │
│  • 메서드가 너무 많음 (15개 이상)                               │
│  • 관련 없는 메서드들이 섞여 있음                               │
│  • 테스트가 일부만 사용함                                       │
│                                                                 │
│  원인:                                                          │
│  • 여러 책임이 한 클래스에                                      │
│  • 성장하면서 분리하지 않음                                     │
│  • Feature Envy 냄새                                            │
│                                                                 │
│  해결:                                                          │
│  • 관련 기능을 새 클래스로 추출                                 │
│  • 상태와 행동을 함께 이동                                      │
│  • 역할 기반으로 분리                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 해결: 클래스 분리

```cpp
// C++ - 클래스 분리
// 통계 관련 기능 분리
class SniperStatistics {
public:
    void record_bid(int amount);
    void record_price(int price);
    int bid_count() const;
    int average_bid() const;
    std::string export_history() const;

private:
    std::vector<int> bids_;
    std::vector<int> prices_;
};

// 입찰 전략 분리
class BidStrategy {
public:
    virtual ~BidStrategy() = default;
    virtual int calculate_bid(int current_price, int increment) const = 0;
    virtual bool should_bid(int price, int stop_price) const = 0;
};

class IncrementalBidStrategy : public BidStrategy {
public:
    int calculate_bid(int current_price, int increment) const override {
        return current_price + increment;
    }

    bool should_bid(int price, int stop_price) const override {
        return price < stop_price;
    }
};

// 이제 AuctionSniper는 핵심 책임만
class AuctionSniper : public AuctionEventListener {
public:
    AuctionSniper(const std::string& item_id,
                  Auction* auction,
                  SniperListener* listener,
                  BidStrategy* strategy)
        : item_id_(item_id)
        , auction_(auction)
        , listener_(listener)
        , strategy_(strategy) {}

    void current_price(int price, int increment, PriceSource source) override {
        if (source == PriceSource::FROM_OTHER_BIDDER &&
            strategy_->should_bid(price + increment, stop_price_)) {
            int bid = strategy_->calculate_bid(price, increment);
            auction_->bid(bid);
            snapshot_ = snapshot_.bidding(price, bid);
        }
        // ...
    }

private:
    std::string item_id_;
    Auction* auction_;
    SniperListener* listener_;
    BidStrategy* strategy_;
    SniperSnapshot snapshot_;
};
```

```python
# Python - 클래스 분리
class SniperStatistics:
    """통계 관련 책임"""

    def __init__(self):
        self._bids: list[int] = []
        self._prices: list[int] = []

    def record_bid(self, amount: int) -> None:
        self._bids.append(amount)

    def record_price(self, price: int) -> None:
        self._prices.append(price)

    @property
    def bid_count(self) -> int:
        return len(self._bids)

    @property
    def average_bid(self) -> float:
        return sum(self._bids) / len(self._bids) if self._bids else 0

    def export_history(self) -> str:
        return json.dumps({"bids": self._bids, "prices": self._prices})


class BidStrategy(Protocol):
    """입찰 전략 인터페이스"""

    def calculate_bid(self, current_price: int, increment: int) -> int:
        ...

    def should_bid(self, price: int, stop_price: int) -> bool:
        ...


class IncrementalBidStrategy:
    """증분 입찰 전략"""

    def calculate_bid(self, current_price: int, increment: int) -> int:
        return current_price + increment

    def should_bid(self, price: int, stop_price: int) -> bool:
        return price < stop_price


class AuctionSniper(AuctionEventListener):
    """핵심 책임만 담당"""

    def __init__(
        self,
        item_id: str,
        auction: Auction,
        listener: SniperListener,
        strategy: BidStrategy
    ):
        self._item_id = item_id
        self._auction = auction
        self._listener = listener
        self._strategy = strategy
        self._snapshot = SniperSnapshot.joining(item_id)
```

---

## 신호 5: 테스트가 깨지기 쉽다

### 증상

```cpp
// C++ - 깨지기 쉬운 테스트
TEST_F(UITest, DisplaysItemsInCorrectOrder) {
    auto items = {"Apple", "Banana", "Cherry"};

    ui_.display(items);

    // 구현 세부사항에 의존
    EXPECT_EQ("Apple", ui_.get_label_text(0));
    EXPECT_EQ("Banana", ui_.get_label_text(1));
    EXPECT_EQ("Cherry", ui_.get_label_text(2));
    EXPECT_EQ(3, ui_.get_item_count());
    EXPECT_TRUE(ui_.is_list_visible());
    EXPECT_EQ("vertical", ui_.get_layout_direction());
}
```

### 진단

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRAGILE TESTS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  신호:                                                          │
│  • 작은 변경에도 많은 테스트가 깨짐                             │
│  • 테스트가 구현 세부사항에 의존                                │
│  • 리팩토링 시 테스트도 함께 수정                               │
│                                                                 │
│  원인:                                                          │
│  • 과도한 specification (over-specification)                    │
│  • 행동이 아닌 구조를 테스트                                    │
│  • 캡슐화 부족                                                  │
│                                                                 │
│  해결:                                                          │
│  • 행동에 집중한 테스트                                         │
│  • 인터페이스를 통한 테스트                                     │
│  • 필수 검증만 수행                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 해결: 행동 중심 테스트

```cpp
// C++ - 행동 중심 테스트
TEST_F(UITest, DisplaysAllItems) {
    auto items = {"Apple", "Banana", "Cherry"};

    ui_.display(items);

    // 행동에만 집중
    EXPECT_TRUE(ui_.contains("Apple"));
    EXPECT_TRUE(ui_.contains("Banana"));
    EXPECT_TRUE(ui_.contains("Cherry"));
}

TEST_F(UITest, DisplaysItemsInAlphabeticalOrder) {
    auto items = {"Cherry", "Apple", "Banana"};

    ui_.display(items);

    // 순서가 중요한 경우만 검증
    auto displayed = ui_.get_displayed_items();
    EXPECT_THAT(displayed, ElementsAre("Apple", "Banana", "Cherry"));
}
```

```python
# Python - 행동 중심 테스트
class TestUI:
    def test_displays_all_items(self):
        items = ["Apple", "Banana", "Cherry"]

        ui.display(items)

        # 행동에만 집중
        assert ui.contains("Apple")
        assert ui.contains("Banana")
        assert ui.contains("Cherry")

    def test_displays_items_in_alphabetical_order(self):
        items = ["Cherry", "Apple", "Banana"]

        ui.display(items)

        # 순서가 중요한 경우만 검증
        displayed = ui.get_displayed_items()
        assert displayed == ["Apple", "Banana", "Cherry"]
```

---

## 테스트 냄새 → 설계 문제 매핑

```
┌─────────────────────────────────────────────────────────────────┐
│              TEST SMELL → DESIGN PROBLEM MAPPING                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  테스트 냄새             │  설계 문제           │  해결책       │
│  ────────────────────────┼──────────────────────┼───────────── │
│  Mock이 너무 많다        │  책임이 너무 많다    │  클래스 분리  │
│  Setup이 거대하다        │  의존성이 너무 많다  │  Builder 패턴│
│  테스트에 로직이 있다    │  추상화 부족         │  명시적 값   │
│  클래스가 터지려 한다    │  SRP 위반            │  역할 분리   │
│  테스트가 깨지기 쉽다    │  캡슐화 부족         │  행동 테스트 │
│  private을 테스트한다    │  설계 잘못됨         │  공개 API 사용│
│  시간 의존 테스트        │  하드코딩된 의존성   │  시간 주입   │
│  순서 의존 테스트        │  상태 공유           │  격리        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 리팩토링 신호 인식하기

### 코드 예시: 신호 인식

```cpp
// C++ - 리팩토링이 필요한 코드
class OrderProcessor {
public:
    OrderProcessor(
        CustomerRepository* customers,
        ProductRepository* products,
        InventoryService* inventory,
        PaymentGateway* payment,
        ShippingService* shipping,
        NotificationService* notification,
        AuditLogger* audit,
        MetricsCollector* metrics)
        : /* 8개의 의존성 */ {}

    bool process(const Order& order) {
        // 100줄 이상의 메서드
        auto customer = customers_->find(order.customer_id());
        if (!customer) return false;

        for (const auto& item : order.items()) {
            if (!inventory_->check(item.product_id())) {
                return false;
            }
        }

        auto payment_result = payment_->charge(customer, order.total());
        if (!payment_result.success()) {
            notification_->send_failure(customer, order);
            return false;
        }

        shipping_->schedule(order);
        notification_->send_confirmation(customer, order);
        audit_->log("order_processed", order);
        metrics_->record("order_success");

        return true;
    }

private:
    // 8개의 포인터 멤버
};
```

### 분석

```
┌─────────────────────────────────────────────────────────────────┐
│                    CODE ANALYSIS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  발견된 냄새:                                                   │
│                                                                 │
│  1. 의존성 8개 → Mock이 너무 많을 것                            │
│                                                                 │
│  2. 100줄 메서드 → 클래스가 터지려 함                           │
│                                                                 │
│  3. 여러 책임 혼재:                                             │
│     • 고객 조회                                                 │
│     • 재고 확인                                                 │
│     • 결제 처리                                                 │
│     • 배송 예약                                                 │
│     • 알림 전송                                                 │
│     • 감사 로깅                                                 │
│     • 메트릭 수집                                               │
│                                                                 │
│  리팩토링 계획:                                                 │
│  • PaymentProcessor 추출                                        │
│  • ShippingCoordinator 추출                                     │
│  • NotificationService 통합                                     │
│  • ObservabilityFacade 추출 (audit + metrics)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 리팩토링 후

```cpp
// C++ - 리팩토링 후
class OrderProcessor {
public:
    OrderProcessor(
        OrderValidator* validator,
        PaymentProcessor* payment,
        FulfillmentService* fulfillment)
        : validator_(validator)
        , payment_(payment)
        , fulfillment_(fulfillment) {}  // 3개로 줄어듦

    bool process(const Order& order) {
        if (!validator_->validate(order)) {
            return false;
        }

        if (!payment_->process(order)) {
            return false;
        }

        fulfillment_->fulfill(order);
        return true;
    }

private:
    OrderValidator* validator_;
    PaymentProcessor* payment_;
    FulfillmentService* fulfillment_;
};
```

```python
# Python - 리팩토링 후
class OrderProcessor:
    def __init__(
        self,
        validator: OrderValidator,
        payment: PaymentProcessor,
        fulfillment: FulfillmentService
    ):  # 3개로 줄어듦
        self._validator = validator
        self._payment = payment
        self._fulfillment = fulfillment

    def process(self, order: Order) -> bool:
        if not self._validator.validate(order):
            return False

        if not self._payment.process(order):
            return False

        self._fulfillment.fulfill(order)
        return True
```

---

## 요약

```
┌─────────────────────────────────────────────────────────────────┐
│                      CHAPTER SUMMARY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  핵심 원칙                                                      │
│  ──────────                                                     │
│  • 테스트 어려움 = 설계 문제                                    │
│  • 테스트는 첫 번째 클라이언트                                  │
│  • 테스트가 주는 피드백을 경청하라                              │
│                                                                 │
│  주요 신호                                                      │
│  ──────────                                                     │
│  • Mock이 너무 많다 → 책임 분리                                 │
│  • Setup이 거대하다 → Builder 패턴                              │
│  • 테스트에 로직 → 명시적 값                                    │
│  • 클래스가 터진다 → 역할 분리                                  │
│  • 테스트가 깨지기 쉽다 → 행동 테스트                           │
│                                                                 │
│  실천 방법                                                      │
│  ──────────                                                     │
│  • 테스트 작성 시 불편함을 기록                                 │
│  • 불편함을 설계 문제로 해석                                    │
│  • 리팩토링으로 문제 해결                                       │
│  • 테스트가 쉬워지는지 확인                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 다음 장 예고

다음 장에서는 **Test Readability**를 다룬다. 테스트를 문서처럼 읽을 수 있게 만드는 방법, 테스트 이름 짓기, 구조화 기법을 배운다.
