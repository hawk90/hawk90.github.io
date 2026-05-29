---
title: "Ch 9: Commitment: The Sniper Project"
date: 2026-05-10T09:00:00
description: "책의 Worked Example 소개 — 경매 sniper 시스템. Part 3 시작."
tags: [TDD, Case Study, Auction Sniper]
series: "Growing Object-Oriented Software"
seriesOrder: 9
draft: true
---

> "The best way to learn is by doing."
> — 실습으로 배우는 TDD

이제 본격적인 실전 예제를 시작한다. 앞 장에서 정리한 원칙을 **Auction Sniper** 프로젝트를 통해 직접 적용해 본다. 이 프로젝트는 책의 Part III(9~18장)에 걸쳐 점진적으로 구축된다. 도메인은 단순하지만 다루는 문제는 풍부하다. XMPP 같은 외부 프로토콜, 비동기 메시지, 다중 경매 관리, UI 갱신이 한곳에 모인다.

---

## To-Do: Auction Sniper

우리가 만들 시스템의 이름은 **Auction Sniper**다. 온라인 경매에서 마지막 순간에 자동으로 입찰하는 프로그램이다. "경매 마감 직전, 자동으로 최고가 입찰하는 시스템"이 한 줄 정의다.

예시 상태 — 한 사용자가 세 경매에 동시 참가했을 때.

| 경매 | 아이템 | 현재가 | 상태 |
|------|--------|--------|------|
| 1 | MacBook | 800 | `BIDDING` |
| 2 | Camera | 500 | `WON` |
| 3 | Watch | 200 | `LOST` |

상단에는 전역 정보 — 최대 예산 1000, 현재 입찰 850, 전체 상태 `BIDDING`.

---

## 온라인 경매 도메인

### 경매의 기본 흐름

온라인 경매는 다음 4단계로 동작한다.

| 단계 | 이름 | 일어나는 일 |
|------|------|-------------|
| 1 | 경매 시작 | 상품 등록 |
| 2 | 입찰 진행 | 가격 제시 |
| 3 | 입찰 경쟁 | 최고가 갱신 |
| 4 | 경매 종료 | 낙찰자 결정 |

### Southabee's On-line

우리 예제의 경매 사이트는 가상의 **Southabee's On-line**이다. 이 사이트의 특징:

| 특성 | 설명 |
|------|------|
| **통신 방식** | XMPP(채팅 프로토콜) 기반 |
| **메시지 형식** | 간단한 텍스트 명령 |
| **실시간 알림** | 가격 변동 즉시 전달 |
| **입찰 방식** | 메시지 전송으로 입찰 |

### XMPP 프로토콜

경매 서버와 클라이언트는 **XMPP**(Extensible Messaging and Presence Protocol)로 통신한다. 메시지는 양방향 — `Auction Server` ↔ `Sniper Client`.

전형적인 메시지 시퀀스.

| # | 발신 | 메시지 | 의미 |
|---|------|--------|------|
| 1 | Sniper → Server | `JOIN` | 경매 참가 |
| 2 | Server → Sniper | `PRICE` | 현재가 알림 |
| 3 | Sniper → Server | `BID` | 입찰 |
| 4 | Server → Sniper | `CLOSE` | 경매 종료 |

---

## 메시지 프로토콜

### 메시지 형식

Southabee's의 메시지는 간단한 텍스트 형식이다:

```
SOLVersion: 1.1; Command: <command>; Key: Value; Key: Value; ...
```

### 서버 → 클라이언트 메시지

```cpp
// 가격 알림
// SOLVersion: 1.1; Event: PRICE; CurrentPrice: 192; Increment: 7; Bidder: other@somewhere.com;

// 경매 종료
// SOLVersion: 1.1; Event: CLOSE;
```

### 클라이언트 → 서버 메시지

```cpp
// 경매 참가
// SOLVersion: 1.1; Command: JOIN;

// 입찰
// SOLVersion: 1.1; Command: BID; Price: 199;
```

### 메시지 파서 예시 (C++)

```cpp
#include <string>
#include <map>
#include <sstream>

class AuctionMessageParser {
public:
    struct Message {
        std::string version;
        std::string event_or_command;
        std::map<std::string, std::string> values;
    };

    static Message parse(const std::string& message_text) {
        Message msg;
        std::istringstream stream(message_text);
        std::string pair;

        while (std::getline(stream, pair, ';')) {
            auto colon_pos = pair.find(':');
            if (colon_pos != std::string::npos) {
                std::string key = trim(pair.substr(0, colon_pos));
                std::string value = trim(pair.substr(colon_pos + 1));

                if (key == "SOLVersion") {
                    msg.version = value;
                } else if (key == "Event" || key == "Command") {
                    msg.event_or_command = value;
                } else {
                    msg.values[key] = value;
                }
            }
        }
        return msg;
    }

private:
    static std::string trim(const std::string& s) {
        auto start = s.find_first_not_of(" \t");
        auto end = s.find_last_not_of(" \t");
        return (start == std::string::npos) ? "" : s.substr(start, end - start + 1);
    }
};
```

### 메시지 파서 예시 (Python)

```python
from dataclasses import dataclass, field
from typing import Dict


@dataclass
class AuctionMessage:
    version: str = ""
    event_or_command: str = ""
    values: Dict[str, str] = field(default_factory=dict)


class AuctionMessageParser:
    @staticmethod
    def parse(message_text: str) -> AuctionMessage:
        msg = AuctionMessage()
        pairs = message_text.split(";")

        for pair in pairs:
            if ":" in pair:
                key, value = pair.split(":", 1)
                key = key.strip()
                value = value.strip()

                if key == "SOLVersion":
                    msg.version = value
                elif key in ("Event", "Command"):
                    msg.event_or_command = value
                else:
                    msg.values[key] = value

        return msg


# 사용 예시
message = "SOLVersion: 1.1; Event: PRICE; CurrentPrice: 192; Increment: 7;"
parsed = AuctionMessageParser.parse(message)
print(f"Event: {parsed.event_or_command}")  # Event: PRICE
print(f"Price: {parsed.values['CurrentPrice']}")  # Price: 192
```

---

## 프로젝트 요구사항

### 사용자 스토리

Auction Sniper의 핵심 기능을 사용자 스토리로 정리했다.

| # | 제목 | 스토리 |
|---|------|--------|
| 1 | 단일 아이템 | 사용자로서, 하나의 경매에 참가해서 낙찰받거나 패배하고 싶다 |
| 2 | 가격 제한 | 사용자로서, 최대 입찰가를 설정해서 그 이상으로는 입찰하지 않게 하고 싶다 |
| 3 | 다중 아이템 | 사용자로서, 여러 경매에 동시에 참가하고 각각의 상태를 확인하고 싶다 |
| 4 | 진행 상황 UI | 사용자로서, 현재 입찰 상태와 가격을 실시간으로 확인하고 싶다 |

### 기능 목록

| 우선순위 | 기능 | 설명 |
|:--------:|------|------|
| 1 | 경매 참가 | 지정한 경매에 자동 참가 |
| 2 | 입찰 | 다른 입찰자보다 높은 가격 제시 |
| 3 | 낙찰/패배 표시 | 경매 종료 시 결과 표시 |
| 4 | 최대가 설정 | 입찰 상한선 지정 |
| 5 | 다중 경매 | 여러 경매 동시 참가 |
| 6 | UI 표시 | 진행 상황 실시간 표시 |

---

## 시스템 아키텍처

### 전체 구조

![Auction Sniper System Architecture](/images/blog/goos/diagrams/ch09-auction-architecture.svg)

### 핵심 컴포넌트

#### 1. AuctionSniper (도메인 핵심)

경매 입찰 로직을 담당한다:

```cpp
// C++ - AuctionSniper 인터페이스
class SniperListener {
public:
    virtual ~SniperListener() = default;
    virtual void sniper_state_changed(const SniperSnapshot& snapshot) = 0;
};

class Auction {
public:
    virtual ~Auction() = default;
    virtual void bid(int amount) = 0;
    virtual void join() = 0;
};

enum class SniperState {
    JOINING,      // 경매 참가 중
    BIDDING,      // 입찰 중
    WINNING,      // 현재 최고 입찰자
    LOST,         // 패배
    WON           // 낙찰
};

class AuctionSniper {
public:
    AuctionSniper(const std::string& item_id,
                  Auction* auction,
                  SniperListener* listener);

    void auction_closed();
    void current_price(int price, int increment, PriceSource source);

private:
    std::string item_id_;
    Auction* auction_;
    SniperListener* listener_;
    SniperSnapshot snapshot_;
};
```

```python
# Python - AuctionSniper 인터페이스
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum, auto


class SniperState(Enum):
    JOINING = auto()   # 경매 참가 중
    BIDDING = auto()   # 입찰 중
    WINNING = auto()   # 현재 최고 입찰자
    LOST = auto()      # 패배
    WON = auto()       # 낙찰


class PriceSource(Enum):
    FROM_SNIPER = auto()
    FROM_OTHER_BIDDER = auto()


@dataclass(frozen=True)
class SniperSnapshot:
    item_id: str
    last_price: int
    last_bid: int
    state: SniperState


class SniperListener(ABC):
    @abstractmethod
    def sniper_state_changed(self, snapshot: SniperSnapshot) -> None:
        pass


class Auction(ABC):
    @abstractmethod
    def bid(self, amount: int) -> None:
        pass

    @abstractmethod
    def join(self) -> None:
        pass


class AuctionSniper:
    def __init__(self, item_id: str, auction: Auction, listener: SniperListener):
        self._item_id = item_id
        self._auction = auction
        self._listener = listener
        self._snapshot = SniperSnapshot(item_id, 0, 0, SniperState.JOINING)

    def auction_closed(self) -> None:
        # 경매 종료 처리
        pass

    def current_price(self, price: int, increment: int, source: PriceSource) -> None:
        # 가격 변동 처리
        pass
```

#### 2. SniperSnapshot (상태 표현)

```cpp
// C++ - 불변 상태 스냅샷
class SniperSnapshot {
public:
    SniperSnapshot(const std::string& item_id, int last_price,
                   int last_bid, SniperState state)
        : item_id_(item_id), last_price_(last_price),
          last_bid_(last_bid), state_(state) {}

    // 새 상태로 전이
    SniperSnapshot bidding(int new_price, int new_bid) const {
        return SniperSnapshot(item_id_, new_price, new_bid, SniperState::BIDDING);
    }

    SniperSnapshot winning(int new_price) const {
        return SniperSnapshot(item_id_, new_price, last_bid_, SniperState::WINNING);
    }

    SniperSnapshot closed() const {
        return SniperSnapshot(item_id_, last_price_, last_bid_,
            state_ == SniperState::WINNING ? SniperState::WON : SniperState::LOST);
    }

    // Getters
    const std::string& item_id() const { return item_id_; }
    int last_price() const { return last_price_; }
    int last_bid() const { return last_bid_; }
    SniperState state() const { return state_; }

private:
    std::string item_id_;
    int last_price_;
    int last_bid_;
    SniperState state_;
};
```

```python
# Python - 불변 상태 스냅샷 (dataclass with frozen=True)
@dataclass(frozen=True)
class SniperSnapshot:
    item_id: str
    last_price: int
    last_bid: int
    state: SniperState

    @staticmethod
    def joining(item_id: str) -> "SniperSnapshot":
        return SniperSnapshot(item_id, 0, 0, SniperState.JOINING)

    def bidding(self, new_price: int, new_bid: int) -> "SniperSnapshot":
        return SniperSnapshot(self.item_id, new_price, new_bid, SniperState.BIDDING)

    def winning(self, new_price: int) -> "SniperSnapshot":
        return SniperSnapshot(self.item_id, new_price, self.last_bid, SniperState.WINNING)

    def closed(self) -> "SniperSnapshot":
        new_state = SniperState.WON if self.state == SniperState.WINNING else SniperState.LOST
        return SniperSnapshot(self.item_id, self.last_price, self.last_bid, new_state)
```

---

## 기술 스택

### C++ 버전

| 영역 | 선택 |
|------|------|
| Language | C++17 or later |
| Build | CMake 3.16+ |
| Testing | Google Test (`gtest`), Google Mock (`gmock`) |
| XMPP | `libstrophe` or `gloox` |
| UI | Qt 6 (옵션) — CLI로 시작, 나중에 UI 추가 |
| Build Tool | Ninja or Make |

**CMakeLists.txt 예시:**

```cmake
cmake_minimum_required(VERSION 3.16)
project(AuctionSniper VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Google Test
include(FetchContent)
FetchContent_Declare(
    googletest
    URL https://github.com/google/googletest/archive/refs/tags/v1.14.0.zip
)
FetchContent_MakeAvailable(googletest)

# Main library
add_library(sniper_lib
    src/auction_sniper.cpp
    src/sniper_snapshot.cpp
    src/auction_message_translator.cpp
)

# Tests
enable_testing()
add_executable(sniper_tests
    tests/auction_sniper_test.cpp
    tests/sniper_snapshot_test.cpp
    tests/message_translator_test.cpp
)
target_link_libraries(sniper_tests
    sniper_lib
    GTest::gtest_main
    GTest::gmock
)
include(GoogleTest)
gtest_discover_tests(sniper_tests)
```

### Python 버전

| 영역 | 선택 |
|------|------|
| Language | Python 3.10+ |
| Testing | `pytest`, `pytest-asyncio` (비동기 테스트) |
| Mocking | `unittest.mock`, `pytest-mock` |
| XMPP | `slixmpp` |
| UI | Tkinter (기본), PyQt6 (선택) |
| Build | Poetry or pip |

**pyproject.toml 예시:**

```toml
[tool.poetry]
name = "auction-sniper"
version = "1.0.0"
description = "Automatic auction bidding system"
authors = ["Your Name <your@email.com>"]

[tool.poetry.dependencies]
python = "^3.10"
slixmpp = "^1.8.4"

[tool.poetry.group.dev.dependencies]
pytest = "^8.0.0"
pytest-asyncio = "^0.23.0"
pytest-mock = "^3.12.0"
mypy = "^1.8.0"

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

---

## 개발 계획

### 점진적 구축 순서

이 프로젝트는 **Walking Skeleton**부터 시작해서 점진적으로 기능을 추가한다.

| Ch | 단계 | 추가되는 것 |
|----|------|-------------|
| 10 | Walking Skeleton | End-to-end 테스트 환경, 가장 단순한 성공 케이스, 빌드/배포 파이프라인 |
| 11 | Passing the First Test | 경매 참가 → 즉시 종료 → 패배 표시, 최소한의 UI |
| 12 | Getting Ready to Bid | 가격 알림 수신, 가격 파싱 |
| 13 | The Sniper Makes a Bid | 입찰 로직 구현, 입찰 메시지 전송 |
| 14 | The Sniper Wins an Auction | 낙찰 판정, `WON` 상태 표시 |
| 15 | Towards a Real UI | 테이블 형태 UI, 실시간 상태 갱신 |
| 16 | Sniping for Multiple Items | 다중 경매 지원, 아이템별 상태 관리 |
| 17 | Teasing Apart Main | 책임 분리, 의존성 주입 |
| 18 | Filling in the Details | 최대가 제한, 에러 처리, 마무리 |

---

## 첫 번째 목표: Walking Skeleton

다음 장에서 만들 Walking Skeleton의 목표를 Gherkin 형식으로 표현하면 다음과 같다.

| 절 | 내용 |
|----|------|
| Given | 경매가 진행 중 |
| When | Sniper가 경매에 참가 |
| And | 경매가 즉시 종료 |
| Then | Sniper는 `LOST` 상태를 표시 |

메시지 흐름.

| # | 발신 | 메시지 | 도착 |
|---|------|--------|------|
| 1 | Sniper | `JOIN` | Auction |
| 2 | Auction | `CLOSE` | Sniper |
| 3 | Sniper | (내부) 상태 `LOST`로 전이 | UI |

### Acceptance Test 예시 (C++)

```cpp
#include <gtest/gtest.h>
#include "fake_auction_server.h"
#include "application_runner.h"

class AuctionSniperEndToEndTest : public ::testing::Test {
protected:
    FakeAuctionServer auction_{"item-54321"};
    ApplicationRunner application_;
};

TEST_F(AuctionSniperEndToEndTest,
       SniperJoinsAuctionUntilAuctionCloses) {
    // Given: 경매가 시작됨
    auction_.start_selling_item();

    // When: Sniper가 경매에 참가
    application_.start_bidding_in(auction_);

    // Then: 경매 서버가 JOIN 요청을 수신
    auction_.has_received_join_request_from_sniper();

    // When: 경매가 종료됨
    auction_.announce_closed();

    // Then: Sniper가 LOST 상태를 표시
    application_.shows_sniper_has_lost_auction();
}
```

### Acceptance Test 예시 (Python)

```python
import pytest
from fake_auction_server import FakeAuctionServer
from application_runner import ApplicationRunner


class TestAuctionSniperEndToEnd:
    @pytest.fixture
    def auction(self):
        server = FakeAuctionServer("item-54321")
        yield server
        server.stop()

    @pytest.fixture
    def application(self):
        runner = ApplicationRunner()
        yield runner
        runner.stop()

    def test_sniper_joins_auction_until_auction_closes(
        self, auction: FakeAuctionServer, application: ApplicationRunner
    ):
        # Given: 경매가 시작됨
        auction.start_selling_item()

        # When: Sniper가 경매에 참가
        application.start_bidding_in(auction)

        # Then: 경매 서버가 JOIN 요청을 수신
        auction.has_received_join_request_from_sniper()

        # When: 경매가 종료됨
        auction.announce_closed()

        # Then: Sniper가 LOST 상태를 표시
        application.shows_sniper_has_lost_auction()
```

---

## 테스트 더블 설계

### FakeAuctionServer

테스트에서 실제 경매 서버 역할을 하는 Fake:

```cpp
// C++ - FakeAuctionServer
class FakeAuctionServer {
public:
    explicit FakeAuctionServer(const std::string& item_id)
        : item_id_(item_id) {}

    void start_selling_item() {
        // XMPP 서버 시작, 채팅방 생성
    }

    void has_received_join_request_from_sniper() {
        // JOIN 메시지 수신 확인 (타임아웃 적용)
    }

    void announce_closed() {
        // CLOSE 메시지 전송
    }

    void report_price(int price, int increment, const std::string& bidder) {
        // PRICE 메시지 전송
    }

    void has_received_bid(int bid, const std::string& sniper_id) {
        // BID 메시지 수신 확인
    }

    void stop() {
        // 서버 정리
    }

private:
    std::string item_id_;
    // XMPP 연결, 메시지 큐 등
};
```

```python
# Python - FakeAuctionServer
class FakeAuctionServer:
    def __init__(self, item_id: str):
        self._item_id = item_id
        self._connection = None
        self._received_messages: list[str] = []

    def start_selling_item(self) -> None:
        """XMPP 서버 시작, 채팅방 생성"""
        pass

    def has_received_join_request_from_sniper(self, timeout: float = 5.0) -> None:
        """JOIN 메시지 수신 확인"""
        pass

    def announce_closed(self) -> None:
        """CLOSE 메시지 전송"""
        pass

    def report_price(self, price: int, increment: int, bidder: str) -> None:
        """PRICE 메시지 전송"""
        pass

    def has_received_bid(self, bid: int, sniper_id: str, timeout: float = 5.0) -> None:
        """BID 메시지 수신 확인"""
        pass

    def stop(self) -> None:
        """서버 정리"""
        pass
```

### ApplicationRunner

테스트에서 애플리케이션을 제어하는 Driver:

```cpp
// C++ - ApplicationRunner
class ApplicationRunner {
public:
    void start_bidding_in(const FakeAuctionServer& auction) {
        // 애플리케이션 시작, 경매 참가
    }

    void shows_sniper_has_lost_auction() {
        // UI에서 LOST 상태 확인
    }

    void shows_sniper_has_won_auction() {
        // UI에서 WON 상태 확인
    }

    void shows_sniper_is_bidding(int last_price, int last_bid) {
        // UI에서 BIDDING 상태 및 가격 확인
    }

    void stop() {
        // 애플리케이션 종료
    }
};
```

```python
# Python - ApplicationRunner
class ApplicationRunner:
    def __init__(self):
        self._process = None
        self._driver = None  # UI automation driver

    def start_bidding_in(self, auction: FakeAuctionServer) -> None:
        """애플리케이션 시작, 경매 참가"""
        pass

    def shows_sniper_has_lost_auction(self, timeout: float = 5.0) -> None:
        """UI에서 LOST 상태 확인"""
        pass

    def shows_sniper_has_won_auction(self, timeout: float = 5.0) -> None:
        """UI에서 WON 상태 확인"""
        pass

    def shows_sniper_is_bidding(
        self, last_price: int, last_bid: int, timeout: float = 5.0
    ) -> None:
        """UI에서 BIDDING 상태 및 가격 확인"""
        pass

    def stop(self) -> None:
        """애플리케이션 종료"""
        pass
```

---

## 요약

Auction Sniper 프로젝트:
- 온라인 경매 자동 입찰 시스템
- XMPP 프로토콜로 경매 서버와 통신
- 점진적으로 기능 추가하며 TDD 실습

핵심 컴포넌트.

| 컴포넌트 | 역할 |
|----------|------|
| `AuctionSniper` | 입찰 로직 |
| `SniperSnapshot` | 불변 상태 스냅샷 |
| `XMPPAuction` | XMPP 래퍼 |
| `AuctionMessageTranslator` | 메시지 변환 |

개발 전략:
- Walking Skeleton으로 시작
- End-to-end 테스트 먼저
- 점진적으로 기능 추가
- Outside-in 방식으로 구현

---

## 다음 장 예고

다음 장에서는 **Walking Skeleton**을 실제로 구축한다. End-to-end 테스트 환경을 설정하고, 빌드/배포 파이프라인을 만들어 첫 번째 인수 테스트를 통과시킨다.

## 관련 항목

- [Ch 8: Building on Third-Party Code](/blog/programming/engineering/goos/chapter08-building-on-third-party) — 이전 장
- [Ch 10: Walking Skeleton](/blog/programming/engineering/goos/chapter10-walking-skeleton) — 다음 장
- [Ch 4: Kick-Starting](/blog/programming/engineering/goos/chapter04-kick-starting) — 본 장이 적용할 시작 전략
- [Agile/Lean Engineering — TDD as XP](/blog/programming/engineering/agile-lean-engineering/part2-16-tdd-as-xp) — 점진적 빌드의 XP/Lean 배경
