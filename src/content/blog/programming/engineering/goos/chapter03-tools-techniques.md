---
title: "Ch 3: An Introduction to the Tools and Techniques"
date: 2025-10-10T03:00:00
description: "Google Test, pytest, Mock 라이브러리. C++과 Python 테스트 환경."
tags: [TDD, Tools, GoogleTest, pytest]
series: "Growing Object-Oriented Software"
seriesOrder: 3
draft: true
---

TDD를 실천하려면 적절한 도구가 필요하다. C++과 Python 환경에서 사용하는 테스트 프레임워크와 Mock 라이브러리를 살펴본다.

## 3.1 테스트 프레임워크

### C++: Google Test (gtest)

```cpp
#include <gtest/gtest.h>

// 기본 테스트
TEST(CalculatorTest, AddsTwoNumbers) {
    Calculator calc;

    int result = calc.add(2, 3);

    EXPECT_EQ(5, result);
}

// Test Fixture (공통 설정)
class AuctionSniperTest : public ::testing::Test {
protected:
    void SetUp() override {
        listener_ = std::make_unique<MockSniperListener>();
        sniper_ = std::make_unique<AuctionSniper>(listener_.get());
    }

    std::unique_ptr<MockSniperListener> listener_;
    std::unique_ptr<AuctionSniper> sniper_;
};

TEST_F(AuctionSniperTest, ReportsLossWhenAuctionCloses) {
    EXPECT_CALL(*listener_, sniper_lost());

    sniper_->auction_closed();
}
```

### Python: pytest

```python
import pytest

# 기본 테스트
def test_adds_two_numbers():
    calc = Calculator()

    result = calc.add(2, 3)

    assert result == 5

# Fixture (공통 설정)
@pytest.fixture
def sniper_with_mock_listener():
    listener = Mock(spec=SniperListener)
    sniper = AuctionSniper(listener)
    return sniper, listener

def test_reports_loss_when_auction_closes(sniper_with_mock_listener):
    sniper, listener = sniper_with_mock_listener

    sniper.auction_closed()

    listener.sniper_lost.assert_called_once()
```

## 3.2 Assertion 스타일

### C++ Assertions

```cpp
// gtest 기본 assertion
EXPECT_EQ(expected, actual);   // ==
EXPECT_NE(val1, val2);         // !=
EXPECT_LT(val1, val2);         // <
EXPECT_LE(val1, val2);         // <=
EXPECT_GT(val1, val2);         // >
EXPECT_GE(val1, val2);         // >=
EXPECT_TRUE(condition);
EXPECT_FALSE(condition);

// 문자열
EXPECT_STREQ(expected, actual);
EXPECT_STRNE(str1, str2);

// 예외
EXPECT_THROW(statement, exception_type);
EXPECT_NO_THROW(statement);

// 부동소수점
EXPECT_FLOAT_EQ(expected, actual);
EXPECT_NEAR(val1, val2, abs_error);

// ASSERT vs EXPECT
// ASSERT: 실패 시 테스트 즉시 종료
// EXPECT: 실패해도 테스트 계속 진행
ASSERT_EQ(expected, actual);  // 치명적 실패
EXPECT_EQ(expected, actual);  // 비치명적 실패
```

### Python Assertions

```python
# pytest 기본 assertion
assert result == expected
assert result != unexpected
assert result < limit
assert result in collection
assert isinstance(obj, SomeClass)

# 예외 검증
with pytest.raises(ValueError):
    function_that_raises()

with pytest.raises(ValueError) as exc_info:
    function_that_raises()
assert "specific message" in str(exc_info.value)

# 부동소수점
assert result == pytest.approx(expected, rel=1e-6)

# 컬렉션
assert set(result) == {1, 2, 3}
assert len(result) == 5
```

## 3.3 Mock 라이브러리

### C++: Google Mock (gmock)

```cpp
#include <gmock/gmock.h>

// Mock 클래스 정의
class MockAuctionEventListener : public AuctionEventListener {
public:
    MOCK_METHOD(void, auction_closed, (), (override));
    MOCK_METHOD(void, current_price, (int, int, PriceSource), (override));
    MOCK_METHOD(void, auction_failed, (), (override));
};

// Mock 사용
TEST(TranslatorTest, NotifiesCloseEvent) {
    MockAuctionEventListener listener;
    AuctionMessageTranslator translator{&listener};

    // 기대 설정
    EXPECT_CALL(listener, auction_closed())
        .Times(1);

    translator.process_message("Event: CLOSE;");
}

// 인자 매칭
EXPECT_CALL(listener, current_price(100, _, _));  // 첫 인자만 검증
EXPECT_CALL(listener, current_price(Gt(50), _, _));  // > 50
EXPECT_CALL(listener, current_price(_, _, PriceSource::FromSniper));

// 반환값 설정
EXPECT_CALL(mock, get_price())
    .WillOnce(Return(100))
    .WillOnce(Return(200))
    .WillRepeatedly(Return(300));

// 호출 순서 검증
{
    InSequence seq;
    EXPECT_CALL(mock, first_method());
    EXPECT_CALL(mock, second_method());
}
```

### Python: unittest.mock

```python
from unittest.mock import Mock, MagicMock, create_autospec, patch, call

# Mock 생성
listener = Mock()  # 자유로운 Mock
listener = Mock(spec=AuctionEventListener)  # 스펙 기반
listener = create_autospec(AuctionEventListener)  # 시그니처 검증

# 기본 사용
def test_notifies_close_event():
    listener = Mock(spec=AuctionEventListener)
    translator = AuctionMessageTranslator(listener)

    translator.process_message("Event: CLOSE;")

    listener.auction_closed.assert_called_once()

# 호출 검증
listener.method.assert_called()
listener.method.assert_called_once()
listener.method.assert_called_with(100, 200)
listener.method.assert_called_once_with(100, 200)
listener.method.assert_not_called()

# 호출 횟수
assert listener.method.call_count == 3

# 반환값 설정
mock.get_price.return_value = 100
mock.get_price.side_effect = [100, 200, 300]  # 순차 반환
mock.get_price.side_effect = ValueError("error")  # 예외 발생

# 호출 순서 검증
expected_calls = [call.first_method(), call.second_method()]
mock.assert_has_calls(expected_calls, any_order=False)

# patch 데코레이터
@patch('module.ClassName')
def test_with_patch(mock_class):
    mock_class.return_value.method.return_value = 100
    # ...
```

## 3.4 Test Builder 패턴

### 테스트 데이터 생성

```cpp
// C++ — Builder 패턴
class OrderBuilder {
    std::string item_id_ = "default-item";
    int quantity_ = 1;
    OrderStatus status_ = OrderStatus::Pending;

public:
    OrderBuilder& with_item(std::string id) {
        item_id_ = std::move(id);
        return *this;
    }

    OrderBuilder& with_quantity(int qty) {
        quantity_ = qty;
        return *this;
    }

    OrderBuilder& shipped() {
        status_ = OrderStatus::Shipped;
        return *this;
    }

    Order build() const {
        return Order{item_id_, quantity_, status_};
    }
};

// 사용
TEST(OrderTest, ShippedOrderCannotBeModified) {
    auto order = OrderBuilder{}
        .with_item("item-123")
        .with_quantity(5)
        .shipped()
        .build();

    EXPECT_THROW(order.add_item("item-456"), std::logic_error);
}
```

```python
# Python — Builder 패턴 (dataclass 활용)
@dataclass
class OrderBuilder:
    item_id: str = "default-item"
    quantity: int = 1
    status: OrderStatus = OrderStatus.PENDING

    def with_item(self, item_id: str) -> 'OrderBuilder':
        self.item_id = item_id
        return self

    def with_quantity(self, qty: int) -> 'OrderBuilder':
        self.quantity = qty
        return self

    def shipped(self) -> 'OrderBuilder':
        self.status = OrderStatus.SHIPPED
        return self

    def build(self) -> Order:
        return Order(self.item_id, self.quantity, self.status)

# 사용
def test_shipped_order_cannot_be_modified():
    order = (OrderBuilder()
        .with_item("item-123")
        .with_quantity(5)
        .shipped()
        .build())

    with pytest.raises(ValueError):
        order.add_item("item-456")
```

## 3.5 Hamcrest 스타일 Matcher

### C++ Custom Matchers

```cpp
// Google Mock 커스텀 Matcher
MATCHER_P(HasPrice, expected_price, "") {
    return arg.price() == expected_price;
}

MATCHER_P2(IsBetween, low, high, "") {
    return arg >= low && arg <= high;
}

// 사용
EXPECT_THAT(order, HasPrice(100));
EXPECT_THAT(value, IsBetween(10, 20));

// 조합
EXPECT_THAT(orders, Contains(HasPrice(100)));
EXPECT_THAT(orders, Each(HasPrice(Gt(0))));
EXPECT_THAT(value, AllOf(Gt(0), Lt(100)));
EXPECT_THAT(value, AnyOf(Eq(1), Eq(2)));
```

### Python Hamcrest

```python
from hamcrest import *

# 기본 matchers
assert_that(result, equal_to(expected))
assert_that(result, is_(expected))
assert_that(result, is_not(unexpected))

# 숫자
assert_that(value, greater_than(10))
assert_that(value, less_than_or_equal_to(100))
assert_that(value, close_to(3.14, 0.01))

# 문자열
assert_that(text, contains_string("hello"))
assert_that(text, starts_with("prefix"))
assert_that(text, matches_regexp(r"\d+"))

# 컬렉션
assert_that(items, has_length(5))
assert_that(items, has_item(equal_to("target")))
assert_that(items, contains_inanyorder(1, 2, 3))

# 조합
assert_that(value, all_of(greater_than(0), less_than(100)))
assert_that(value, any_of(equal_to(1), equal_to(2)))

# 커스텀 matcher
def has_price(expected):
    return has_property('price', equal_to(expected))

assert_that(order, has_price(100))
```

## 3.6 테스트 구조화

### 파일 구조

```
# C++ 프로젝트
project/
├── src/
│   ├── auction_sniper.cpp
│   └── auction_sniper.h
├── tests/
│   ├── auction_sniper_test.cpp
│   ├── mocks/
│   │   └── mock_auction_event_listener.h
│   └── builders/
│       └── order_builder.h
└── CMakeLists.txt

# Python 프로젝트
project/
├── src/
│   └── auction_sniper/
│       ├── __init__.py
│       └── sniper.py
├── tests/
│   ├── conftest.py          # pytest fixtures
│   ├── test_auction_sniper.py
│   └── builders/
│       └── order_builder.py
└── pyproject.toml
```

### Fixture 공유

```cpp
// C++ — 공통 Fixture
class IntegrationTestBase : public ::testing::Test {
protected:
    void SetUp() override {
        database_ = std::make_unique<TestDatabase>();
        database_->initialize();
    }

    void TearDown() override {
        database_->cleanup();
    }

    std::unique_ptr<TestDatabase> database_;
};

// 상속하여 사용
class OrderRepositoryTest : public IntegrationTestBase {
    // database_ 사용 가능
};
```

```python
# Python — conftest.py로 fixture 공유
# tests/conftest.py
import pytest

@pytest.fixture
def database():
    db = TestDatabase()
    db.initialize()
    yield db
    db.cleanup()

@pytest.fixture
def mock_listener():
    return Mock(spec=AuctionEventListener)

# tests/test_order_repository.py
def test_saves_order(database):
    repo = OrderRepository(database)
    order = Order("item-123")

    repo.save(order)

    assert repo.find_by_id(order.id) == order
```

## 3.7 도구 비교

| 기능 | C++ (gtest/gmock) | Python (pytest) |
|------|-------------------|-----------------|
| **테스트 정의** | `TEST()`, `TEST_F()` | `def test_...()` |
| **Fixture** | `SetUp()/TearDown()` | `@pytest.fixture` |
| **Mock** | `MOCK_METHOD()` | `Mock()`, `patch()` |
| **기대 설정** | `EXPECT_CALL()` | `assert_called_*()` |
| **Assertion** | `EXPECT_*`, `ASSERT_*` | `assert` |
| **Matcher** | `EXPECT_THAT()` | Hamcrest, `pytest.approx` |
| **파라미터화** | `INSTANTIATE_TEST_SUITE_P` | `@pytest.mark.parametrize` |

## 정리

| 도구 | C++ | Python |
|------|-----|--------|
| **테스트 프레임워크** | Google Test | pytest |
| **Mock 라이브러리** | Google Mock | unittest.mock |
| **Matcher** | gmock matchers | Hamcrest |
| **빌드** | CMake/CTest | pytest/tox |

**핵심 질문:**
> 이 테스트가 무엇을 검증하는지 테스트 이름과 코드만 보고 알 수 있는가?

## 다음 장 예고

다음 장에서는 TDD 사이클을 시작하는 방법을 다룬다. Walking Skeleton으로 첫 End-to-End 테스트를 작성하는 과정을 살펴본다.
