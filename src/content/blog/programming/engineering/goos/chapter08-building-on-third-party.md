---
title: "Ch 8: Building on Third-Party Code"
date: 2026-05-10T08:00:00
description: "외부 라이브러리 — 직접 모킹 X. ACL / wrapper로 격리."
tags: [TDD, Third-Party, Wrapper]
series: "Growing Object-Oriented Software"
seriesOrder: 8
draft: true
---

실제 프로젝트에서는 외부 라이브러리, 프레임워크, API를 사용할 수밖에 없다. 이들을 어떻게 테스트 가능하게 통합할 것인가?

## 8.1 소유하지 않은 타입을 Mock하지 마라

### 핵심 원칙

![Don't Mock Types You Don't Own](/images/blog/goos/diagrams/ch08-dont-mock-external.svg)

### 나쁜 예: 외부 코드 직접 Mock

```cpp
// ❌ 나쁜 예: 외부 라이브러리 직접 Mock
// xmpp_connection.h (외부 라이브러리)
class XmppConnection {
public:
    void send(const std::string& message);
    void set_listener(XmppListener* listener);
    // ... 많은 메서드
};

// 테스트 — 외부 타입 직접 Mock (위험!)
class MockXmppConnection : public XmppConnection {
    MOCK_METHOD(void, send, (const std::string&), (override));
    // 문제: XmppConnection의 구현 세부사항에 의존
    // 라이브러리 업데이트 시 깨질 수 있음
};

TEST(BadTest, DirectlyMockExternalLibrary) {
    MockXmppConnection connection;  // ❌ 외부 타입 직접 Mock
    AuctionSniper sniper{&connection};

    EXPECT_CALL(connection, send("SOL/1.1; BID 100"));
    sniper.bid(100);
}
```

```python
# ❌ 나쁜 예: 외부 라이브러리 직접 Mock
# 외부 라이브러리
import xmpp_library  # 가상의 외부 라이브러리

def test_bad_directly_mock_external():
    # 외부 타입 직접 Mock (위험!)
    mock_connection = Mock(spec=xmpp_library.XmppConnection)

    sniper = AuctionSniper(mock_connection)
    sniper.bid(100)

    # 문제: xmpp_library의 구현 세부사항에 의존
    mock_connection.send.assert_called_with("SOL/1.1; BID 100")
```

### 좋은 예: Wrapper 사용

```cpp
// ✅ 좋은 예: Wrapper로 감싸기

// 1. 내 인터페이스 정의 (내가 소유함)
class Auction {
public:
    virtual ~Auction() = default;
    virtual void bid(int amount) = 0;
    virtual void join() = 0;
};

// 2. Wrapper 구현 (외부 코드를 감쌈)
class XmppAuction : public Auction {
    XmppConnection* connection_;  // 외부 라이브러리
    std::string auction_id_;

public:
    XmppAuction(XmppConnection* connection, const std::string& auction_id)
        : connection_{connection}, auction_id_{auction_id} {}

    void bid(int amount) override {
        std::string message = "SOL/1.1; BID " + std::to_string(amount);
        connection_->send_to(auction_id_, message);
    }

    void join() override {
        connection_->send_to(auction_id_, "SOL/1.1; JOIN");
    }
};

// 3. 테스트에서는 내 인터페이스 Mock
class MockAuction : public Auction {
public:
    MOCK_METHOD(void, bid, (int), (override));
    MOCK_METHOD(void, join, (), (override));
};

TEST(GoodTest, MockMyOwnInterface) {
    MockAuction auction;  // ✅ 내 타입 Mock
    AuctionSniper sniper{&auction};

    EXPECT_CALL(auction, bid(100));
    sniper.process_price(90, 10, PriceSource::FromOtherBidder);
}
```

```python
# ✅ 좋은 예: Wrapper로 감싸기

# 1. 내 인터페이스 정의 (내가 소유함)
from typing import Protocol

class Auction(Protocol):
    def bid(self, amount: int) -> None: ...
    def join(self) -> None: ...

# 2. Wrapper 구현 (외부 코드를 감쌈)
class XmppAuction:
    def __init__(self, connection: "XmppConnection", auction_id: str):
        self._connection = connection  # 외부 라이브러리
        self._auction_id = auction_id

    def bid(self, amount: int) -> None:
        message = f"SOL/1.1; BID {amount}"
        self._connection.send_to(self._auction_id, message)

    def join(self) -> None:
        self._connection.send_to(self._auction_id, "SOL/1.1; JOIN")

# 3. 테스트에서는 내 인터페이스 Mock
def test_good_mock_my_own_interface():
    auction = create_autospec(Auction)  # ✅ 내 타입 Mock
    sniper = AuctionSniper(auction)

    sniper.process_price(90, 10, PriceSource.FROM_OTHER_BIDDER)

    auction.bid.assert_called_once_with(100)
```

## 8.2 Thin Wrapper 패턴

### Wrapper 설계 원칙

![Thin Wrapper 원칙](/images/blog/goos/diagrams/ch08-thin-wrapper.svg)

### Thin Wrapper 예제

```cpp
// Thin Wrapper: 외부 → 내 도메인 번역

// 외부 라이브러리의 복잡한 API
class XmppConnection {
public:
    void connect(const std::string& host, int port, const XmppCredentials& cred);
    XmppSession* create_session(const std::string& jid);
    void send_message(XmppSession* session, const XmppMessage& msg);
    void add_listener(XmppEventListener* listener);
    // ... 많은 저수준 API
};

// 내 Thin Wrapper: 도메인 언어로 번역
class XmppAuctionHouse {
    std::unique_ptr<XmppConnection> connection_;

public:
    // 생성자에서 연결 설정
    explicit XmppAuctionHouse(const AuctionConfig& config) {
        connection_ = std::make_unique<XmppConnection>();
        XmppCredentials cred{config.username(), config.password()};
        connection_->connect(config.server(), config.port(), cred);
    }

    // 도메인 메서드
    std::unique_ptr<Auction> auction_for(const std::string& item_id) {
        auto session = connection_->create_session(make_auction_jid(item_id));
        return std::make_unique<XmppAuction>(session, item_id);
    }

private:
    std::string make_auction_jid(const std::string& item_id) {
        return "auction-" + item_id + "@xmpp.server";
    }
};

// XmppAuction: 단일 경매 래퍼
class XmppAuction : public Auction {
    XmppSession* session_;
    std::string item_id_;

public:
    void bid(int amount) override {
        // 도메인 → 외부 API 번역 (얇음!)
        XmppMessage msg;
        msg.set_body("SOL/1.1; BID " + std::to_string(amount));
        session_->send(msg);
    }

    void join() override {
        XmppMessage msg;
        msg.set_body("SOL/1.1; JOIN");
        session_->send(msg);
    }
};
```

```python
# Thin Wrapper: 외부 → 내 도메인 번역

# 외부 라이브러리의 복잡한 API
# (가상의 xmpp_library)

# 내 Thin Wrapper: 도메인 언어로 번역
class XmppAuctionHouse:
    def __init__(self, config: AuctionConfig):
        self._connection = xmpp_library.XmppConnection()
        credentials = xmpp_library.Credentials(
            config.username, config.password
        )
        self._connection.connect(config.server, config.port, credentials)

    def auction_for(self, item_id: str) -> Auction:
        """도메인 메서드: 아이템 ID로 경매 얻기"""
        jid = self._make_auction_jid(item_id)
        session = self._connection.create_session(jid)
        return XmppAuction(session, item_id)

    def _make_auction_jid(self, item_id: str) -> str:
        return f"auction-{item_id}@xmpp.server"


class XmppAuction:
    """단일 경매 래퍼"""

    def __init__(self, session: "XmppSession", item_id: str):
        self._session = session
        self._item_id = item_id

    def bid(self, amount: int) -> None:
        # 도메인 → 외부 API 번역 (얇음!)
        message = xmpp_library.Message(body=f"SOL/1.1; BID {amount}")
        self._session.send(message)

    def join(self) -> None:
        message = xmpp_library.Message(body="SOL/1.1; JOIN")
        self._session.send(message)
```

## 8.3 테스트 전략

### 단위 테스트 vs 통합 테스트

![외부 코드 테스트 전략](/images/blog/goos/diagrams/ch08-test-strategy.svg)

### 단위 테스트: Wrapper Mock

```cpp
// 단위 테스트: 내 코드 (AuctionSniper)
// Wrapper 인터페이스만 Mock

class AuctionSniperTest : public ::testing::Test {
protected:
    MockAuction auction_;           // 내 인터페이스 Mock
    MockSniperListener listener_;
    AuctionSniper sniper_{&auction_, &listener_};
};

// 비즈니스 로직 검증
TEST_F(AuctionSniperTest, BidsHigherWhenPriceFromOther) {
    EXPECT_CALL(auction_, bid(125));  // Wrapper 호출 검증
    EXPECT_CALL(listener_, sniper_state_changed(_));

    sniper_.current_price(100, 25, PriceSource::FromOtherBidder);
}

// 외부 코드(XMPP)는 전혀 관여하지 않음
// 빠름, 격리됨, 결정적
```

```python
# 단위 테스트: 내 코드 (AuctionSniper)
# Wrapper 인터페이스만 Mock

class TestAuctionSniper:
    def setup_method(self):
        self.auction = create_autospec(Auction)  # 내 인터페이스 Mock
        self.listener = create_autospec(SniperListener)
        self.sniper = AuctionSniper(self.auction, self.listener)

    def test_bids_higher_when_price_from_other(self):
        self.sniper.current_price(100, 25, PriceSource.FROM_OTHER_BIDDER)

        self.auction.bid.assert_called_once_with(125)  # Wrapper 호출 검증
        self.listener.sniper_state_changed.assert_called()

# 외부 코드(XMPP)는 전혀 관여하지 않음
# 빠름, 격리됨, 결정적
```

### 통합 테스트: 실제 외부 코드

```cpp
// 통합 테스트: Wrapper + 실제 외부 코드

class XmppAuctionIntegrationTest : public ::testing::Test {
protected:
    void SetUp() override {
        // 실제 XMPP 연결 (또는 테스트 서버)
        connection_ = std::make_unique<XmppConnection>();
        connection_->connect("test-server", 5222, test_credentials());

        auction_ = std::make_unique<XmppAuction>(
            connection_.get(), "item-54321");
    }

    void TearDown() override {
        connection_->disconnect();
    }

    std::unique_ptr<XmppConnection> connection_;
    std::unique_ptr<XmppAuction> auction_;
};

// 실제 연결로 메시지 전송 검증
TEST_F(XmppAuctionIntegrationTest, SendsBidMessage) {
    // 가짜 서버에서 메시지 수신 대기
    FakeAuctionServer fake_server{"item-54321"};
    fake_server.start();

    auction_->bid(100);

    // 실제 메시지가 올바른 형식으로 도착했는지 확인
    EXPECT_TRUE(fake_server.has_received_bid(100));
}
```

```python
# 통합 테스트: Wrapper + 실제 외부 코드

import pytest

class TestXmppAuctionIntegration:
    @pytest.fixture(autouse=True)
    def setup(self):
        # 실제 XMPP 연결 (또는 테스트 서버)
        self.connection = xmpp_library.XmppConnection()
        self.connection.connect("test-server", 5222, test_credentials())
        self.auction = XmppAuction(self.connection, "item-54321")

        yield

        self.connection.disconnect()

    def test_sends_bid_message(self):
        # 가짜 서버에서 메시지 수신 대기
        fake_server = FakeAuctionServer("item-54321")
        fake_server.start()

        self.auction.bid(100)

        # 실제 메시지가 올바른 형식으로 도착했는지 확인
        assert fake_server.has_received_bid(100)
```

## 8.4 Anti-Corruption Layer (ACL)

### DDD에서의 ACL

![Anti-Corruption Layer](/images/blog/goos/diagrams/ch08-acl-pattern.svg)

### ACL 구현

```cpp
// ACL: 외부 XMPP 메시지 → 내 도메인 이벤트

// 외부 메시지 형식
// "SOLVersion: 1.1; Event: PRICE; CurrentPrice: 100; Increment: 10; Bidder: other;"

// 내 도메인 이벤트
class AuctionEvent {
public:
    enum class Type { Close, Price };
    Type type;
    int price;
    int increment;
    PriceSource source;
};

// ACL: 메시지 번역기
class AuctionMessageTranslator : public XmppMessageListener {
    AuctionEventListener* listener_;

public:
    explicit AuctionMessageTranslator(AuctionEventListener* listener)
        : listener_{listener} {}

    // 외부 → 내부 번역
    void on_message(const XmppMessage& message) override {
        auto fields = parse_message(message.body());

        if (fields["Event"] == "CLOSE") {
            listener_->auction_closed();
        } else if (fields["Event"] == "PRICE") {
            auto source = (fields["Bidder"] == sniper_id_)
                ? PriceSource::FromSniper
                : PriceSource::FromOtherBidder;

            listener_->current_price(
                std::stoi(fields["CurrentPrice"]),
                std::stoi(fields["Increment"]),
                source
            );
        }
    }

private:
    std::map<std::string, std::string> parse_message(const std::string& body) {
        // 메시지 파싱 로직
        // "Key: Value; Key: Value;" 형식
    }
};
```

```python
# ACL: 외부 XMPP 메시지 → 내 도메인 이벤트

from dataclasses import dataclass
from enum import Enum
from typing import Dict

# 내 도메인 이벤트
class EventType(Enum):
    CLOSE = "CLOSE"
    PRICE = "PRICE"

@dataclass
class AuctionEvent:
    type: EventType
    price: int = 0
    increment: int = 0
    source: PriceSource = PriceSource.FROM_OTHER_BIDDER


# ACL: 메시지 번역기
class AuctionMessageTranslator:
    def __init__(self, listener: AuctionEventListener, sniper_id: str):
        self.listener = listener
        self.sniper_id = sniper_id

    def on_message(self, message: "XmppMessage") -> None:
        """외부 → 내부 번역"""
        fields = self._parse_message(message.body)

        if fields.get("Event") == "CLOSE":
            self.listener.auction_closed()

        elif fields.get("Event") == "PRICE":
            source = (
                PriceSource.FROM_SNIPER
                if fields.get("Bidder") == self.sniper_id
                else PriceSource.FROM_OTHER_BIDDER
            )

            self.listener.current_price(
                price=int(fields["CurrentPrice"]),
                increment=int(fields["Increment"]),
                source=source
            )

    def _parse_message(self, body: str) -> Dict[str, str]:
        """메시지 파싱: 'Key: Value; Key: Value;' 형식"""
        fields = {}
        for pair in body.split(";"):
            if ":" in pair:
                key, value = pair.split(":", 1)
                fields[key.strip()] = value.strip()
        return fields
```

### ACL 테스트

```cpp
// ACL 테스트: 메시지 번역 검증

class AuctionMessageTranslatorTest : public ::testing::Test {
protected:
    MockAuctionEventListener listener_;
    AuctionMessageTranslator translator_{&listener_, "sniper-123"};
};

TEST_F(AuctionMessageTranslatorTest, NotifiesCloseWhenCloseMessage) {
    EXPECT_CALL(listener_, auction_closed());

    translator_.on_message(XmppMessage{
        "SOLVersion: 1.1; Event: CLOSE;"
    });
}

TEST_F(AuctionMessageTranslatorTest, NotifiesPriceWhenPriceMessage) {
    EXPECT_CALL(listener_, current_price(100, 10, PriceSource::FromOtherBidder));

    translator_.on_message(XmppMessage{
        "SOLVersion: 1.1; Event: PRICE; "
        "CurrentPrice: 100; Increment: 10; Bidder: other;"
    });
}

TEST_F(AuctionMessageTranslatorTest, RecognizesSniperAsSource) {
    EXPECT_CALL(listener_, current_price(_, _, PriceSource::FromSniper));

    translator_.on_message(XmppMessage{
        "SOLVersion: 1.1; Event: PRICE; "
        "CurrentPrice: 100; Increment: 10; Bidder: sniper-123;"
    });
}
```

```python
# ACL 테스트: 메시지 번역 검증

class TestAuctionMessageTranslator:
    def setup_method(self):
        self.listener = create_autospec(AuctionEventListener)
        self.translator = AuctionMessageTranslator(self.listener, "sniper-123")

    def test_notifies_close_when_close_message(self):
        message = MockMessage("SOLVersion: 1.1; Event: CLOSE;")

        self.translator.on_message(message)

        self.listener.auction_closed.assert_called_once()

    def test_notifies_price_when_price_message(self):
        message = MockMessage(
            "SOLVersion: 1.1; Event: PRICE; "
            "CurrentPrice: 100; Increment: 10; Bidder: other;"
        )

        self.translator.on_message(message)

        self.listener.current_price.assert_called_once_with(
            price=100, increment=10, source=PriceSource.FROM_OTHER_BIDDER
        )

    def test_recognizes_sniper_as_source(self):
        message = MockMessage(
            "SOLVersion: 1.1; Event: PRICE; "
            "CurrentPrice: 100; Increment: 10; Bidder: sniper-123;"
        )

        self.translator.on_message(message)

        self.listener.current_price.assert_called_once()
        call_args = self.listener.current_price.call_args
        assert call_args.kwargs["source"] == PriceSource.FROM_SNIPER
```

## 8.5 에러 번역

### 외부 예외 → 내 예외

```cpp
// 외부 예외를 내 도메인 예외로 번역

// 내 도메인 예외
class AuctionException : public std::runtime_error {
    using std::runtime_error::runtime_error;
};

class ConnectionLostException : public AuctionException {
public:
    ConnectionLostException() : AuctionException{"Connection lost"} {}
};

class AuctionNotFoundException : public AuctionException {
public:
    explicit AuctionNotFoundException(const std::string& item_id)
        : AuctionException{"Auction not found: " + item_id} {}
};

// Wrapper에서 번역
class XmppAuction : public Auction {
public:
    void bid(int amount) override {
        try {
            session_->send(make_bid_message(amount));
        } catch (const XmppConnectionException& e) {
            // 외부 예외 → 내 예외로 번역
            throw ConnectionLostException{};
        } catch (const XmppTimeoutException& e) {
            throw ConnectionLostException{};
        }
    }
};
```

```python
# 외부 예외를 내 도메인 예외로 번역

# 내 도메인 예외
class AuctionException(Exception):
    pass

class ConnectionLostException(AuctionException):
    def __init__(self):
        super().__init__("Connection lost")

class AuctionNotFoundException(AuctionException):
    def __init__(self, item_id: str):
        super().__init__(f"Auction not found: {item_id}")

# Wrapper에서 번역
class XmppAuction:
    def bid(self, amount: int) -> None:
        try:
            self._session.send(self._make_bid_message(amount))
        except xmpp_library.ConnectionException:
            # 외부 예외 → 내 예외로 번역
            raise ConnectionLostException()
        except xmpp_library.TimeoutException:
            raise ConnectionLostException()
```

## 8.6 테스트 구조 요약

외부 코드를 포함한 테스트 피라미드:

| 레벨 | 범위 | 비율 |
|------|------|------|
| **E2E** | 전체 시스템 (실제 외부 서버) | 5-10% |
| **통합** | Wrapper + 외부 (실제 라이브러리) | 15-25% |
| **단위** | 내 코드만 (Wrapper Mock) | 70-80% |

## 정리

| 원칙 | 핵심 |
|------|------|
| **Mock하지 마라** | 소유하지 않은 타입은 Mock 금지 |
| **Thin Wrapper** | 외부 API를 내 도메인 언어로 번역 |
| **단위 테스트** | 내 코드만, Wrapper 인터페이스 Mock |
| **통합 테스트** | Wrapper + 실제 외부 코드 |
| **ACL** | 외부 개념이 내 도메인 오염 방지 |
| **에러 번역** | 외부 예외 → 내 예외 타입 |

**핵심 질문:**
> 이 외부 라이브러리가 바뀌면 내 코드의 몇 군데를 수정해야 하는가? Wrapper 한 곳만?

## 다음 장 예고

다음 장에서는 본격적인 예제 프로젝트를 시작한다. Auction Sniper 프로젝트의 요구사항과 기술 스택을 정의하고, TDD로 구현할 준비를 한다.
