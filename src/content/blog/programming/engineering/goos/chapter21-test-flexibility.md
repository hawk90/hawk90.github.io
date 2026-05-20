---
title: "Ch 21: Test Flexibility"
date: 2026-05-10T14:00:00
description: "유연한 테스트 — over-specified mocks 회피. Custom matchers."
tags: [TDD, Flexibility, Matchers]
series: "Growing Object-Oriented Software"
seriesOrder: 21
draft: false
---

## 테스트 유연성의 중요성

테스트는 코드의 **본질적인 동작**을 검증해야 한다. 구현 세부사항에 결합된 테스트는 코드가 바뀔 때마다 깨진다. 이런 테스트는 리팩토링을 가로막는다. Khorikov가 *Unit Testing*에서 fragility를 단위 테스트의 네 축 중 하나로 꼽은 것도 같은 이유다. GOOS의 mockist 스타일은 강력하지만 over-specification에 취약하므로, 유연성을 의식적으로 설계해야 한다.

![Test Coupling Spectrum](/images/blog/goos/diagrams/ch21-coupling-spectrum.svg)

유연한 테스트의 목표:
- **구현이 아닌 행동** 검증
- **필수 조건만** 명시
- **변경에 탄력적**으로 대응
- **의도를 명확히** 전달

---

## Over-Specification 문제

### Over-Specified Test란?

테스트가 필요 이상으로 많은 것을 검증하면 **over-specified**라 한다.

**C++ - Over-Specified 테스트 (나쁜 예)**
```cpp
// 과도하게 명세된 테스트 - 깨지기 쉽다
TEST_F(AuctionSniperTest, ReportsLostWhenAuctionCloses_Overspecified) {
    // 문제: 정확한 값과 호출 순서까지 검증
    EXPECT_CALL(listener_, sniperStateChanged(
        SniperSnapshot("item-123", 0, 0, SniperState::JOINING)));
    EXPECT_CALL(listener_, sniperStateChanged(
        SniperSnapshot("item-123", 1000, 98, SniperState::BIDDING)));
    EXPECT_CALL(listener_, sniperStateChanged(
        SniperSnapshot("item-123", 1000, 98, SniperState::LOST)));

    // 중간 상태까지 모두 검증 → 구현 변경 시 테스트 깨짐
    sniper_->process(PriceMessage{1000, 98, "other bidder"});
    sniper_->process(CloseMessage{});
}
```

**Python - Over-Specified 테스트 (나쁜 예)**
```python
# 과도하게 명세된 테스트
def test_reports_lost_when_auction_closes_overspecified(self):
    # 문제: 정확한 호출 횟수와 인자까지 모두 검증
    self.sniper.process(PriceMessage(1000, 98, "other bidder"))
    self.sniper.process(CloseMessage())

    # assert_has_calls는 순서까지 검증
    self.listener.sniper_state_changed.assert_has_calls([
        call(SniperSnapshot("item-123", 0, 0, SniperState.JOINING)),
        call(SniperSnapshot("item-123", 1000, 98, SniperState.BIDDING)),
        call(SniperSnapshot("item-123", 1000, 98, SniperState.LOST)),
    ])
```

### 문제점

| # | 폐해 | 세부 |
|---|------|------|
| 1 | 리팩토링 방해 | 중간 상태 변경 시 테스트 실패, 메서드 추출/이동 시 테스트 수정 필요 |
| 2 | 유지보수 비용 증가 | 작은 변경에도 많은 테스트 수정, 테스트 코드가 프로덕션보다 더 많은 변경 필요 |
| 3 | 테스트 의도 불명확 | 무엇이 진짜 중요한지 알 수 없음, 테스트가 문서 역할을 못함 |
| 4 | False Failures | 코드는 정상인데 테스트만 실패, 팀이 테스트를 불신하게 됨 |

### 올바른 접근

**C++ - 본질만 검증 (좋은 예)**
```cpp
// 본질만 검증 - 유연한 테스트
TEST_F(AuctionSniperTest, ReportsLostWhenAuctionCloses) {
    // 최종 상태만 검증 - 중간 과정은 구현 세부사항
    allowingSniperBidding();  // 중간 상태는 허용만

    EXPECT_CALL(listener_, sniperStateChanged(
        A_SniperThat(HasState(SniperState::LOST))));

    sniper_->process(PriceMessage{1000, 98, "other bidder"});
    sniper_->process(CloseMessage{});
}

void allowingSniperBidding() {
    // NiceMock을 사용하거나, EXPECT_CALL 없이 허용
    ON_CALL(listener_, sniperStateChanged(_))
        .WillByDefault(Return());
}
```

**Python - 본질만 검증 (좋은 예)**
```python
# 본질만 검증하는 테스트
def test_reports_lost_when_auction_closes(self):
    self.sniper.process(PriceMessage(1000, 98, "other bidder"))
    self.sniper.process(CloseMessage())

    # 마지막 호출만 검증
    last_call = self.listener.sniper_state_changed.call_args
    assert last_call[0][0].state == SniperState.LOST

    # 또는 custom matcher 사용
    self.listener.sniper_state_changed.assert_called_with(
        A_Sniper_That(has_state(SniperState.LOST))
    )
```

---

## Custom Matchers

Custom matcher는 테스트 유연성의 핵심 도구다. 검증할 조건만 명시하고, 나머지는 무시한다.

### C++ Google Mock Matchers

**기본 Matcher 조합**
```cpp
#include <gmock/gmock.h>

using namespace testing;

// 기본 matcher 조합
TEST_F(AuctionSniperTest, BidsWhenNewPriceArrives) {
    // Gt, Lt, Eq 등 기본 matcher 사용
    EXPECT_CALL(auction_, bid(Gt(1000)));  // 1000보다 큰 값

    sniper_->process(PriceMessage{1000, 98, "other"});
}

// AllOf, AnyOf 조합
EXPECT_CALL(listener_, sniperStateChanged(
    AllOf(
        Property(&SniperSnapshot::state, Eq(SniperState::BIDDING)),
        Property(&SniperSnapshot::lastPrice, Gt(0))
    )
));
```

**Custom Matcher 정의**
```cpp
// SniperSnapshot용 custom matcher

// 방법 1: MATCHER_P 매크로
MATCHER_P(HasState, expected_state, "") {
    return arg.state() == expected_state;
}

MATCHER_P(HasItemId, expected_id, "") {
    return arg.itemId() == expected_id;
}

MATCHER_P2(HasPriceAndBid, expected_price, expected_bid, "") {
    return arg.lastPrice() == expected_price
        && arg.lastBid() == expected_bid;
}

// 사용
EXPECT_CALL(listener_, sniperStateChanged(HasState(SniperState::LOST)));
EXPECT_CALL(listener_, sniperStateChanged(
    AllOf(HasItemId("item-123"), HasState(SniperState::BIDDING))
));
```

**Composite Matcher**
```cpp
// 복합 matcher 클래스로 정의
class SniperSnapshotMatcher {
public:
    SniperSnapshotMatcher& withState(SniperState state) {
        matchers_.push_back(HasState(state));
        return *this;
    }

    SniperSnapshotMatcher& withItemId(const std::string& itemId) {
        matchers_.push_back(HasItemId(itemId));
        return *this;
    }

    SniperSnapshotMatcher& withPrice(int price) {
        matchers_.push_back(Property(&SniperSnapshot::lastPrice, Eq(price)));
        return *this;
    }

    operator Matcher<const SniperSnapshot&>() const {
        return AllOfArray(matchers_);
    }

private:
    std::vector<Matcher<const SniperSnapshot&>> matchers_;
};

// 팩토리 함수
SniperSnapshotMatcher A_SniperThat() {
    return SniperSnapshotMatcher{};
}

// 사용: 필요한 것만 명시
EXPECT_CALL(listener_, sniperStateChanged(
    A_SniperThat()
        .withState(SniperState::BIDDING)
        .withItemId("item-123")
));
```

### Python Custom Matchers

**pytest 스타일 matcher**
```python
# custom matcher 구현

class SniperMatcher:
    """SniperSnapshot을 위한 fluent matcher"""

    def __init__(self):
        self._conditions = []
        self._descriptions = []

    def with_state(self, expected_state):
        self._conditions.append(lambda s: s.state == expected_state)
        self._descriptions.append(f"state={expected_state}")
        return self

    def with_item_id(self, expected_id):
        self._conditions.append(lambda s: s.item_id == expected_id)
        self._descriptions.append(f"item_id={expected_id}")
        return self

    def with_price(self, expected_price):
        self._conditions.append(lambda s: s.last_price == expected_price)
        self._descriptions.append(f"last_price={expected_price}")
        return self

    def with_price_at_least(self, min_price):
        self._conditions.append(lambda s: s.last_price >= min_price)
        self._descriptions.append(f"last_price>={min_price}")
        return self

    def __eq__(self, other):
        """mock의 assert_called_with에서 사용"""
        return all(cond(other) for cond in self._conditions)

    def __repr__(self):
        return f"SniperMatcher({', '.join(self._descriptions)})"


def a_sniper_that():
    """팩토리 함수"""
    return SniperMatcher()


# 사용 예시
def test_reports_bidding_when_price_arrives(sniper, listener):
    sniper.process(PriceMessage(1000, 98, "other"))

    # 유연한 검증: 상태와 아이템만 확인
    listener.sniper_state_changed.assert_called_with(
        a_sniper_that()
            .with_state(SniperState.BIDDING)
            .with_item_id("item-123")
    )
```

**함수형 matcher**
```python
from unittest.mock import ANY

def has_state(expected_state):
    """상태만 검증하는 matcher"""
    class StateMatcher:
        def __eq__(self, other):
            return hasattr(other, 'state') and other.state == expected_state
        def __repr__(self):
            return f"has_state({expected_state})"
    return StateMatcher()

def has_price_between(min_price, max_price):
    """가격 범위 검증"""
    class PriceRangeMatcher:
        def __eq__(self, other):
            return min_price <= other.last_price <= max_price
        def __repr__(self):
            return f"has_price_between({min_price}, {max_price})"
    return PriceRangeMatcher()

# 사용
listener.sniper_state_changed.assert_called_with(has_state(SniperState.LOST))
```

---

## Argument Captors

때로는 matcher보다 **captor**가 더 적합하다. 호출된 인자를 캡처한 후, 별도로 검증한다.

### C++ Argument Capture

**SaveArg 사용**
```cpp
#include <gmock/gmock.h>

TEST_F(AuctionSniperTest, CapturesSnapshotForDetailedVerification) {
    SniperSnapshot captured;

    // 인자를 캡처
    EXPECT_CALL(listener_, sniperStateChanged(_))
        .WillOnce(SaveArg<0>(&captured));

    sniper_->process(PriceMessage{1000, 98, "other"});

    // 캡처된 값을 자세히 검증
    EXPECT_EQ(SniperState::BIDDING, captured.state());
    EXPECT_EQ("item-123", captured.itemId());
    EXPECT_GT(captured.lastBid(), captured.lastPrice());
}
```

**여러 번 캡처**
```cpp
TEST_F(AuctionSniperTest, CapturesMultipleSnapshots) {
    std::vector<SniperSnapshot> captured;

    EXPECT_CALL(listener_, sniperStateChanged(_))
        .WillRepeatedly([&captured](const SniperSnapshot& snapshot) {
            captured.push_back(snapshot);
        });

    sniper_->process(PriceMessage{1000, 98, "other"});
    sniper_->process(PriceMessage{1098, 97, "sniper"});
    sniper_->process(CloseMessage{});

    // 마지막 상태만 검증
    ASSERT_FALSE(captured.empty());
    EXPECT_EQ(SniperState::WON, captured.back().state());
}
```

**Custom Action으로 복잡한 캡처**
```cpp
// Custom action 정의
ACTION_P(AppendTo, container) {
    container->push_back(arg0);
}

TEST_F(AuctionSniperTest, TracksStateTransitions) {
    std::vector<SniperState> states;

    EXPECT_CALL(listener_, sniperStateChanged(_))
        .WillRepeatedly([&states](const SniperSnapshot& s) {
            states.push_back(s.state());
        });

    runFullAuctionScenario();

    // 상태 전이 순서 검증
    EXPECT_THAT(states, ElementsAre(
        SniperState::JOINING,
        SniperState::BIDDING,
        SniperState::WINNING,
        SniperState::WON
    ));
}
```

### Python Argument Capture

**call_args 사용**
```python
def test_captures_snapshot_for_verification(sniper, listener):
    sniper.process(PriceMessage(1000, 98, "other"))

    # 마지막 호출 인자 캡처
    args, kwargs = listener.sniper_state_changed.call_args
    captured = args[0]

    # 자세한 검증
    assert captured.state == SniperState.BIDDING
    assert captured.item_id == "item-123"
    assert captured.last_bid > captured.last_price
```

**call_args_list로 모든 호출 캡처**
```python
def test_tracks_all_state_changes(sniper, listener):
    sniper.process(PriceMessage(1000, 98, "other"))
    sniper.process(PriceMessage(1098, 97, "sniper"))
    sniper.process(CloseMessage())

    # 모든 호출 캡처
    all_calls = listener.sniper_state_changed.call_args_list
    snapshots = [call[0][0] for call in all_calls]

    # 마지막 상태 검증
    assert snapshots[-1].state == SniperState.WON

    # 상태 전이 검증
    states = [s.state for s in snapshots]
    assert SniperState.BIDDING in states
    assert SniperState.WINNING in states
```

**Custom Captor 클래스**
```python
class ArgumentCaptor:
    """재사용 가능한 argument captor"""

    def __init__(self):
        self._values = []

    def capture(self):
        """side_effect로 사용할 캡처 함수 반환"""
        def _capture(arg):
            self._values.append(arg)
        return _capture

    @property
    def value(self):
        """마지막 캡처 값"""
        return self._values[-1] if self._values else None

    @property
    def all_values(self):
        """모든 캡처 값"""
        return list(self._values)

    def __len__(self):
        return len(self._values)


# 사용 예시
def test_with_argument_captor(sniper, listener):
    captor = ArgumentCaptor()
    listener.sniper_state_changed.side_effect = captor.capture()

    sniper.process(PriceMessage(1000, 98, "other"))
    sniper.process(CloseMessage())

    # captor로 검증
    assert len(captor) == 2
    assert captor.value.state == SniperState.LOST
```

---

## Strict vs Lenient Verification

Mock의 엄격함 수준을 조절하여 테스트 유연성을 높인다.

### C++ NiceMock vs StrictMock

```cpp
#include <gmock/gmock.h>

// 기본 Mock: 예상치 않은 호출 시 경고
class MockSniperListener : public SniperListener {
public:
    MOCK_METHOD(void, sniperStateChanged, (const SniperSnapshot&), (override));
    MOCK_METHOD(void, sniperFailed, (), (override));
};

class AuctionSniperTest : public testing::Test {
protected:
    // NiceMock: 예상치 않은 호출 무시 (관대함)
    testing::NiceMock<MockSniperListener> nice_listener_;

    // StrictMock: 예상치 않은 호출 시 실패 (엄격함)
    testing::StrictMock<MockSniperListener> strict_listener_;
};
```

**NiceMock 사용 (권장)**
```cpp
TEST_F(AuctionSniperTest, NiceMock_IgnoresUnexpectedCalls) {
    // NiceMock은 설정하지 않은 호출을 무시
    AuctionSniper sniper("item-123", &nice_listener_, &auction_);

    // sniperStateChanged 호출을 여러 번 해도 OK
    // 우리가 관심 있는 것만 검증
    EXPECT_CALL(nice_listener_, sniperStateChanged(
        HasState(SniperState::LOST)));

    sniper.process(PriceMessage{1000, 98, "other"});
    sniper.process(CloseMessage{});
}
```

**StrictMock은 언제?**
```cpp
TEST_F(ProtocolTest, StrictMock_EnsuresNoExtraCalls) {
    // StrictMock: 프로토콜 검증에 유용
    // 정확히 명시한 호출만 허용

    testing::StrictMock<MockAuction> strict_auction;

    // bid가 정확히 한 번만 호출되어야 함
    EXPECT_CALL(strict_auction, bid(1098));

    AuctionSniper sniper("item", &listener_, &strict_auction);
    sniper.process(PriceMessage{1000, 98, "other"});

    // 추가 호출 시 테스트 실패
}
```

### Python Mock 엄격함 조절

**기본 Mock (관대함)**
```python
from unittest.mock import Mock, MagicMock

def test_default_mock_is_lenient():
    listener = Mock()
    sniper = AuctionSniper("item-123", listener)

    # Mock은 어떤 메서드 호출도 허용
    sniper.process(PriceMessage(1000, 98, "other"))
    sniper.process(CloseMessage())

    # 관심 있는 것만 검증
    last_call = listener.sniper_state_changed.call_args
    assert last_call[0][0].state == SniperState.LOST
```

**spec으로 인터페이스 제한**
```python
def test_mock_with_spec():
    # spec: 존재하지 않는 메서드 호출 시 에러
    listener = Mock(spec=SniperListener)

    listener.sniper_state_changed(snapshot)  # OK
    listener.nonexistent_method()  # AttributeError!
```

**autospec으로 시그니처 검증**
```python
from unittest.mock import create_autospec

def test_mock_with_autospec():
    # autospec: 메서드 시그니처까지 검증
    listener = create_autospec(SniperListener)

    listener.sniper_state_changed(snapshot)  # OK
    listener.sniper_state_changed()  # TypeError: missing argument
    listener.sniper_state_changed(1, 2, 3)  # TypeError: too many args
```

**assert_not_called로 엄격한 검증**
```python
def test_no_bid_when_winning():
    auction = Mock()
    sniper = AuctionSniper("item", listener, auction)

    # 이미 이기고 있을 때 가격 도착
    sniper.set_state(SniperState.WINNING)
    sniper.process(PriceMessage(1200, 98, "sniper"))  # 내가 최고가

    # bid가 호출되면 안 됨
    auction.bid.assert_not_called()
```

---

## 실전 패턴: 유연한 테스트 설계

### Allow vs Expect 패턴

| | Allow (허용) | Expect (기대) |
|---|--------------|----------------|
| 의미 | "이것이 일어날 수 있다" | "이것이 반드시 일어나야 한다" |
| 대상 | 부수적인 상호작용 | 테스트의 핵심 검증 |
| 용도 | 설정 / 전제 조건 | 주요 행동 |
| 실패 효과 | 검증하지 않음 | 실패 시 테스트 실패 |

**C++ Allow 패턴**
```cpp
class AuctionSniperTest : public testing::Test {
protected:
    testing::NiceMock<MockSniperListener> listener_;
    testing::NiceMock<MockAuction> auction_;

    void allowingStateChanges() {
        // 모든 상태 변경 허용 (검증 안 함)
        ON_CALL(listener_, sniperStateChanged(_))
            .WillByDefault(Return());
    }

    void allowingBidding() {
        // 입찰 허용 (검증 안 함)
        ON_CALL(auction_, bid(_))
            .WillByDefault(Return());
    }
};

TEST_F(AuctionSniperTest, ReportsLostWhenAuctionCloses) {
    allowingStateChanges();  // Allow: 중간 상태 변경
    allowingBidding();       // Allow: 입찰

    // Expect: 핵심 검증만
    EXPECT_CALL(listener_, sniperStateChanged(
        HasState(SniperState::LOST)));

    sniper_->process(PriceMessage{1000, 98, "other"});
    sniper_->process(CloseMessage{});
}
```

**Python Allow 패턴**
```python
class TestAuctionSniper:
    def setup_method(self):
        self.listener = Mock()
        self.auction = Mock()
        self.sniper = AuctionSniper("item-123", self.listener, self.auction)

    def allowing_state_changes(self):
        """상태 변경을 허용 (검증 안 함)"""
        # Python Mock은 기본적으로 모든 호출 허용
        pass

    def allowing_bidding(self):
        """입찰을 허용하고 성공 반환"""
        self.auction.bid.return_value = True

    def test_reports_lost_when_auction_closes(self):
        self.allowing_state_changes()
        self.allowing_bidding()

        self.sniper.process(PriceMessage(1000, 98, "other"))
        self.sniper.process(CloseMessage())

        # 핵심만 검증: 마지막 상태
        last_snapshot = self.listener.sniper_state_changed.call_args[0][0]
        assert last_snapshot.state == SniperState.LOST
```

### Ignoring 패턴

**C++ - ignoring 헬퍼**
```cpp
// 특정 호출을 명시적으로 무시
void ignoringSniperStateChanges() {
    EXPECT_CALL(listener_, sniperStateChanged(_))
        .Times(AnyNumber());
}

void ignoringBids() {
    EXPECT_CALL(auction_, bid(_))
        .Times(AnyNumber());
}

TEST_F(AuctionSniperTest, FocusOnFinalState) {
    ignoringSniperStateChanges();  // 중간 상태 무시

    // InSequence로 마지막 호출만 캡처
    SniperSnapshot final_state;
    EXPECT_CALL(listener_, sniperStateChanged(_))
        .WillRepeatedly(SaveArg<0>(&final_state));

    runScenario();

    EXPECT_EQ(SniperState::WON, final_state.state());
}
```

**Python - 필요한 것만 검증**
```python
def test_focus_on_final_state(self):
    # 모든 과정 실행
    self.sniper.process(PriceMessage(1000, 98, "other"))
    self.sniper.process(PriceMessage(1098, 97, "sniper"))
    self.sniper.process(CloseMessage())

    # 중간 과정 무시, 최종 상태만 검증
    final_call = self.listener.sniper_state_changed.call_args
    assert final_call[0][0].state == SniperState.WON

    # 또는: 최소한 한 번 호출되었는지만 확인
    self.listener.sniper_state_changed.assert_called()
```

### 테스트 픽스처 패턴

**C++ - 테스트 픽스처로 정리**
```cpp
class AuctionSniperIntegrationTest : public testing::Test {
protected:
    void SetUp() override {
        sniper_ = std::make_unique<AuctionSniper>(
            "item-123", &listener_, &auction_);

        // 기본적으로 관대하게 설정
        allowAllInteractions();
    }

    void allowAllInteractions() {
        ON_CALL(listener_, sniperStateChanged(_)).WillByDefault(Return());
        ON_CALL(auction_, bid(_)).WillByDefault(Return());
        ON_CALL(auction_, join()).WillByDefault(Return());
    }

    void expectFinalState(SniperState state) {
        EXPECT_CALL(listener_, sniperStateChanged(HasState(state)))
            .Times(AtLeast(1));
    }

    void expectNoBids() {
        EXPECT_CALL(auction_, bid(_)).Times(0);
    }

    testing::NiceMock<MockSniperListener> listener_;
    testing::NiceMock<MockAuction> auction_;
    std::unique_ptr<AuctionSniper> sniper_;
};

TEST_F(AuctionSniperIntegrationTest, WinsAuctionAtHigherPrice) {
    expectFinalState(SniperState::WON);

    sniper_->process(PriceMessage{1000, 98, "other"});
    sniper_->process(PriceMessage{1098, 97, "sniper"});
    sniper_->process(CloseMessage{});
}
```

**Python - pytest 픽스처로 정리**
```python
import pytest

@pytest.fixture
def lenient_listener():
    """관대한 listener mock"""
    return Mock(spec=SniperListener)

@pytest.fixture
def lenient_auction():
    """관대한 auction mock"""
    auction = Mock(spec=Auction)
    auction.bid.return_value = True
    return auction

@pytest.fixture
def sniper(lenient_listener, lenient_auction):
    """기본 sniper 인스턴스"""
    return AuctionSniper("item-123", lenient_listener, lenient_auction)

class TestAuctionSniperFlexible:
    def test_wins_auction_at_higher_price(self, sniper, lenient_listener):
        sniper.process(PriceMessage(1000, 98, "other"))
        sniper.process(PriceMessage(1098, 97, "sniper"))
        sniper.process(CloseMessage())

        # 최종 상태만 검증
        assert_final_state(lenient_listener, SniperState.WON)

def assert_final_state(listener, expected_state):
    """헬퍼: 최종 상태 검증"""
    final_call = listener.sniper_state_changed.call_args
    assert final_call[0][0].state == expected_state
```

---

## 유연성을 위한 설계 원칙

- [ ] 행동을 검증하는가? (구현 아님)
- [ ] 필수 조건만 명시하는가? (불필요한 제약 없음)
- [ ] Custom matcher로 관심사를 표현하는가?
- [ ] Allow와 Expect를 구분하는가?
- [ ] 호출 순서가 정말 중요한가?
- [ ] NiceMock을 사용하는가? (기본)
- [ ] 리팩토링 후에도 테스트가 통과하는가?

### 테스트 유연성 높이는 리팩토링

**Before: 취약한 테스트**
```cpp
// 모든 세부사항에 결합
EXPECT_CALL(listener, sniperStateChanged(
    SniperSnapshot("item-123", 1000, 1098, SniperState::BIDDING)));
EXPECT_CALL(listener, sniperStateChanged(
    SniperSnapshot("item-123", 1098, 1098, SniperState::WINNING)));
EXPECT_CALL(listener, sniperStateChanged(
    SniperSnapshot("item-123", 1098, 1098, SniperState::WON)));
```

**After: 유연한 테스트**
```cpp
// 본질만 검증
allowingAnyStateChanges();

EXPECT_CALL(listener, sniperStateChanged(HasState(SniperState::WON)))
    .Times(AtLeast(1));
```

---

## 요약

테스트 유연성의 핵심:

1. **Over-specification 회피**: 구현이 아닌 행동 검증
2. **Custom Matchers**: 관심사만 명시, 나머지 무시
3. **Argument Captors**: 복잡한 검증을 테스트 코드에서 수행
4. **NiceMock 우선**: 관대하게 시작, 필요시 엄격하게
5. **Allow vs Expect**: 핵심 검증과 부수적 허용 구분

유연한 테스트는 **리팩토링의 동반자**다. 코드 변경에 탄력적으로 대응하면서도 핵심 동작은 확실히 보호한다.

---

## 다음 장 예고

다음 장에서는 **Test Diagnostics**를 다룬다. 테스트 실패 시 문제를 빠르게 진단하는 방법, 좋은 실패 메시지 작성법을 배운다.

## 관련 항목

- [Ch 20: Test Readability](/blog/programming/engineering/goos/chapter20-test-readability) — 이전 장
- [Ch 22: Test Diagnostics](/blog/programming/engineering/goos/chapter22-test-diagnostics) — 다음 장
- [Khorikov Ch 5: Mock과 테스트 취약성](/blog/programming/engineering/khorikov-unit-testing/chapter05-mocks-fragility) — over-specification이 fragility로 직결되는 이유
- [Khorikov Ch 6: 단위 테스트의 세 가지 스타일](/blog/programming/engineering/khorikov-unit-testing/chapter06-styles) — output-based 테스트가 가장 유연한 이유
