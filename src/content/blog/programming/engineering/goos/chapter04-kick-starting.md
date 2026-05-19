---
title: "Ch 4: Kick-Starting the TDD Cycle"
date: 2026-05-10T04:00:00
description: "Walking Skeleton — 가장 단순한 end-to-end. 첫 사이클 시작 방법."
tags: [TDD, Walking Skeleton]
series: "Growing Object-Oriented Software"
seriesOrder: 4
draft: true
---

첫 번째 테스트를 어디서 시작해야 하는가? TDD 사이클을 시작하는 핵심 전략인 Walking Skeleton을 살펴본다.

## 4.1 Walking Skeleton

### 정의

![Walking Skeleton](/images/blog/goos/diagrams/ch04-walking-skeleton.svg)

Walking Skeleton은:
- 전체 아키텍처를 관통하는 **가장 단순한** 기능
- 모든 기술 스택이 **연결되어 동작**함을 증명
- **빌드, 배포, 테스트** 인프라 구축의 기반
- 실제 기능이 아닌 **통합의 증명**

### 왜 필요한가?

```
┌─────────────────────────────────────────────────────────────┐
│              프로젝트 시작의 두 가지 위험                     │
│                                                             │
│   1. 기술적 위험 (Technical Risk)                           │
│      - 기술 스택이 함께 동작하는가?                          │
│      - 성능 요구사항을 만족하는가?                           │
│      - 배포가 가능한가?                                     │
│                                                             │
│   2. 요구사항 위험 (Requirements Risk)                      │
│      - 요구사항을 제대로 이해했는가?                         │
│      - 사용자가 원하는 것을 만들고 있는가?                   │
│      - 도메인 모델이 올바른가?                              │
│                                                             │
│   Walking Skeleton → 기술적 위험을 먼저 제거                 │
└─────────────────────────────────────────────────────────────┘
```

## 4.2 인수 테스트부터 시작

### 첫 번째 테스트

```
바깥에서 시작하라 (Start from the Outside)

┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │              Acceptance Test                         │  │
│   │  ┌─────────────────────────────────────────────┐    │  │
│   │  │                                             │    │  │
│   │  │   "시스템이 실제로 동작하는가?"              │    │  │
│   │  │                                             │    │  │
│   │  └─────────────────────────────────────────────┘    │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│   첫 인수 테스트는:                                         │
│   - 가장 단순한 성공 시나리오                               │
│   - 모든 계층을 관통                                        │
│   - 최소한의 비즈니스 로직                                  │
│   - 빌드/배포 파이프라인 필요                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### C++ 예제: Auction Sniper 첫 테스트

```cpp
// test/acceptance/auction_sniper_e2e_test.cpp
#include <gtest/gtest.h>
#include "fake_auction_server.h"
#include "application_runner.h"

class AuctionSniperE2ETest : public ::testing::Test {
protected:
    FakeAuctionServer auction_{"item-54321"};
    ApplicationRunner application_;
};

// 가장 단순한 시나리오: 경매 참여 후 낙찰 실패
TEST_F(AuctionSniperE2ETest, JoinsAuctionUntilAuctionCloses) {
    // 경매 서버 시작
    auction_.start_selling_item();

    // 애플리케이션이 경매에 참여
    application_.start_bidding_in(auction_);

    // 서버가 참여 요청 수신 확인
    auction_.has_received_join_request_from_sniper();

    // 경매 종료 발표
    auction_.announce_closed();

    // 애플리케이션이 낙찰 실패 표시
    application_.shows_sniper_has_lost_auction();
}
```

```python
# tests/acceptance/test_auction_sniper_e2e.py
import pytest
from tests.support.fake_auction_server import FakeAuctionServer
from tests.support.application_runner import ApplicationRunner

class TestAuctionSniperE2E:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.auction = FakeAuctionServer("item-54321")
        self.application = ApplicationRunner()
        yield
        self.application.stop()
        self.auction.stop()

    def test_joins_auction_until_auction_closes(self):
        """가장 단순한 시나리오: 경매 참여 후 낙찰 실패"""
        # 경매 서버 시작
        self.auction.start_selling_item()

        # 애플리케이션이 경매에 참여
        self.application.start_bidding_in(self.auction)

        # 서버가 참여 요청 수신 확인
        self.auction.has_received_join_request_from_sniper()

        # 경매 종료 발표
        self.auction.announce_closed()

        # 애플리케이션이 낙찰 실패 표시
        self.application.shows_sniper_has_lost_auction()
```

### 이 테스트가 요구하는 것

```
┌─────────────────────────────────────────────────────────────┐
│           첫 인수 테스트가 필요로 하는 것들                   │
│                                                             │
│   인프라:                                                   │
│   ├── 빌드 시스템 (CMake / setuptools)                      │
│   ├── 테스트 프레임워크 설정                                 │
│   ├── 가짜 서버 (FakeAuctionServer)                        │
│   └── 애플리케이션 러너 (ApplicationRunner)                 │
│                                                             │
│   애플리케이션:                                             │
│   ├── 메인 윈도우/UI                                       │
│   ├── 서버 연결 코드                                       │
│   ├── 메시지 송수신                                        │
│   └── 상태 표시                                            │
│                                                             │
│   → 매우 많은 작업, 하지만 모든 것이 필요                    │
└─────────────────────────────────────────────────────────────┘
```

## 4.3 빌드/배포 인프라 우선

### 왜 인프라가 먼저인가?

```
┌─────────────────────────────────────────────────────────────┐
│              인프라 우선의 이유                               │
│                                                             │
│   1. 피드백 루프 확립                                       │
│      - 코드 변경 → 테스트 실행 → 결과 확인                  │
│      - 이 루프가 없으면 TDD 불가능                          │
│                                                             │
│   2. 통합 문제 조기 발견                                    │
│      - "내 컴퓨터에서는 동작해요" 방지                       │
│      - 환경 차이 문제 조기 해결                             │
│                                                             │
│   3. 배포 가능성 증명                                       │
│      - 개발 마지막에 배포 시도 → 위험                       │
│      - 처음부터 배포 가능 → 안전                            │
│                                                             │
│   4. 팀 협업 기반                                           │
│      - 누구나 빌드/테스트 가능                              │
│      - 일관된 개발 환경                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### C++ 프로젝트 구조 예시

```
auction-sniper/
├── CMakeLists.txt           # 빌드 설정
├── src/
│   ├── main.cpp
│   ├── sniper/
│   │   ├── auction_sniper.h
│   │   └── auction_sniper.cpp
│   └── ui/
│       └── main_window.cpp
├── tests/
│   ├── CMakeLists.txt
│   ├── unit/
│   │   └── auction_sniper_test.cpp
│   └── acceptance/
│       ├── auction_sniper_e2e_test.cpp
│       └── support/
│           ├── fake_auction_server.h
│           └── application_runner.h
├── .github/
│   └── workflows/
│       └── ci.yml           # CI 파이프라인
└── README.md
```

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.14)
project(AuctionSniper)

set(CMAKE_CXX_STANDARD 17)

# Google Test 설정
include(FetchContent)
FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG v1.14.0
)
FetchContent_MakeAvailable(googletest)

# 소스 라이브러리
add_library(sniper_lib
    src/sniper/auction_sniper.cpp
)

# 실행 파일
add_executable(auction_sniper src/main.cpp)
target_link_libraries(auction_sniper sniper_lib)

# 테스트
enable_testing()
add_subdirectory(tests)
```

### Python 프로젝트 구조 예시

```
auction-sniper/
├── pyproject.toml           # 프로젝트 설정
├── src/
│   └── auction_sniper/
│       ├── __init__.py
│       ├── main.py
│       ├── sniper.py
│       └── ui/
│           └── main_window.py
├── tests/
│   ├── conftest.py          # pytest fixtures
│   ├── unit/
│   │   └── test_auction_sniper.py
│   └── acceptance/
│       ├── test_auction_sniper_e2e.py
│       └── support/
│           ├── fake_auction_server.py
│           └── application_runner.py
├── .github/
│   └── workflows/
│       └── ci.yml           # CI 파이프라인
└── README.md
```

```toml
# pyproject.toml
[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"

[project]
name = "auction-sniper"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = []

[project.optional-dependencies]
test = [
    "pytest>=7.0",
    "pytest-asyncio>=0.21",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
asyncio_mode = "auto"
```

### CI 파이프라인

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # C++ 빌드 및 테스트
      - name: Configure CMake
        run: cmake -B build -DCMAKE_BUILD_TYPE=Release

      - name: Build
        run: cmake --build build

      - name: Test
        run: ctest --test-dir build --output-on-failure

      # Python 테스트
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -e ".[test]"

      - name: Run tests
        run: pytest
```

## 4.4 테스트 지원 인프라

### FakeAuctionServer

```cpp
// tests/acceptance/support/fake_auction_server.h
#pragma once
#include <string>
#include <queue>
#include <mutex>
#include <condition_variable>

class FakeAuctionServer {
public:
    explicit FakeAuctionServer(std::string item_id)
        : item_id_{std::move(item_id)} {}

    void start_selling_item() {
        // 가짜 XMPP 서버 시작
        server_.start();
        server_.set_handler([this](const auto& msg) {
            handle_message(msg);
        });
    }

    void has_received_join_request_from_sniper() {
        // 타임아웃 내에 JOIN 메시지 수신 확인
        auto message = receive_message(std::chrono::seconds{5});
        EXPECT_THAT(message, HasSubstr("JOIN"));
    }

    void announce_closed() {
        server_.send("SOLVersion: 1.1; Event: CLOSE;");
    }

    void stop() {
        server_.stop();
    }

private:
    std::string receive_message(std::chrono::seconds timeout) {
        std::unique_lock lock{mutex_};
        if (cv_.wait_for(lock, timeout, [this] { return !messages_.empty(); })) {
            auto msg = messages_.front();
            messages_.pop();
            return msg;
        }
        throw std::runtime_error{"Timeout waiting for message"};
    }

    void handle_message(const std::string& msg) {
        std::lock_guard lock{mutex_};
        messages_.push(msg);
        cv_.notify_one();
    }

    std::string item_id_;
    XmppServer server_;
    std::queue<std::string> messages_;
    std::mutex mutex_;
    std::condition_variable cv_;
};
```

```python
# tests/acceptance/support/fake_auction_server.py
import asyncio
from typing import Optional
from queue import Queue, Empty

class FakeAuctionServer:
    def __init__(self, item_id: str):
        self.item_id = item_id
        self.messages: Queue[str] = Queue()
        self._server: Optional[XmppServer] = None

    async def start_selling_item(self):
        """가짜 XMPP 서버 시작"""
        self._server = XmppServer()
        self._server.on_message = self._handle_message
        await self._server.start()

    def has_received_join_request_from_sniper(self, timeout: float = 5.0):
        """타임아웃 내에 JOIN 메시지 수신 확인"""
        try:
            message = self.messages.get(timeout=timeout)
            assert "JOIN" in message, f"Expected JOIN message, got: {message}"
        except Empty:
            raise TimeoutError("Timeout waiting for JOIN message")

    async def announce_closed(self):
        """경매 종료 발표"""
        await self._server.send("SOLVersion: 1.1; Event: CLOSE;")

    async def stop(self):
        if self._server:
            await self._server.stop()

    def _handle_message(self, message: str):
        self.messages.put(message)
```

### ApplicationRunner

```cpp
// tests/acceptance/support/application_runner.h
#pragma once
#include <memory>
#include <thread>

class ApplicationRunner {
public:
    void start_bidding_in(const FakeAuctionServer& auction) {
        // 별도 프로세스나 스레드에서 애플리케이션 시작
        app_thread_ = std::thread{[this, &auction] {
            app_ = std::make_unique<AuctionSniperApp>();
            app_->join_auction(auction.item_id());
            app_->run();
        }};

        // UI가 준비될 때까지 대기
        wait_for_ui_ready();
    }

    void shows_sniper_has_lost_auction() {
        // UI 상태 확인 (타임아웃 포함)
        auto status = wait_for_status(std::chrono::seconds{5});
        EXPECT_EQ(status, SniperStatus::Lost);
    }

    ~ApplicationRunner() {
        if (app_) app_->stop();
        if (app_thread_.joinable()) app_thread_.join();
    }

private:
    SniperStatus wait_for_status(std::chrono::seconds timeout);
    void wait_for_ui_ready();

    std::unique_ptr<AuctionSniperApp> app_;
    std::thread app_thread_;
};
```

```python
# tests/acceptance/support/application_runner.py
import subprocess
import time
from typing import Optional

class ApplicationRunner:
    def __init__(self):
        self._process: Optional[subprocess.Popen] = None
        self._driver: Optional[UIDriver] = None

    def start_bidding_in(self, auction: FakeAuctionServer):
        """애플리케이션을 시작하고 경매에 참여"""
        # 별도 프로세스로 애플리케이션 시작
        self._process = subprocess.Popen(
            ["python", "-m", "auction_sniper.main", auction.item_id],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        # UI 드라이버 연결
        self._driver = UIDriver()
        self._driver.wait_for_ready(timeout=5.0)

    def shows_sniper_has_lost_auction(self, timeout: float = 5.0):
        """UI가 낙찰 실패를 표시하는지 확인"""
        status = self._driver.wait_for_status(
            expected="Lost",
            timeout=timeout
        )
        assert status == "Lost", f"Expected 'Lost', got '{status}'"

    def stop(self):
        if self._process:
            self._process.terminate()
            self._process.wait(timeout=5)
```

## 4.5 인프라 vs 도메인: 어디서 시작할까?

### 두 가지 접근법

```
┌─────────────────────────────────────────────────────────────┐
│                    시작점 선택                               │
│                                                             │
│   인프라 우선 (Infrastructure First)                        │
│   ─────────────────────────────────                         │
│   장점:                                                     │
│   - 기술 위험 조기 제거                                     │
│   - 팀 전체가 같은 환경에서 작업                            │
│   - 배포 가능성 조기 확인                                   │
│                                                             │
│   단점:                                                     │
│   - 비즈니스 가치 지연                                      │
│   - "진짜 기능"까지 시간 소요                               │
│                                                             │
│   ─────────────────────────────────────────────────────────│
│                                                             │
│   도메인 우선 (Domain First)                                │
│   ─────────────────────────────                             │
│   장점:                                                     │
│   - 빠른 비즈니스 피드백                                    │
│   - 도메인 이해 우선                                        │
│                                                             │
│   단점:                                                     │
│   - 통합 문제 후반에 발견                                   │
│   - "내 컴퓨터에서는 동작해요" 위험                         │
│                                                             │
│   GOOS 권장: 인프라 우선                                    │
└─────────────────────────────────────────────────────────────┘
```

### 현실적인 접근

```
실제로는 병행:

1일차:
├── 빌드 시스템 설정
├── 테스트 프레임워크 구성
└── 첫 인수 테스트 스켈레톤

2일차:
├── CI 파이프라인
├── 가짜 서버 스텁
└── 애플리케이션 스켈레톤

3일차:
├── 첫 인수 테스트 통과!
├── 실제 통신 구현 시작
└── 단위 테스트 작성 시작

→ Walking Skeleton 완성
→ 이후부터 기능 개발 시작
```

## 4.6 첫 테스트를 통과시키기

### 단계별 접근

```
┌─────────────────────────────────────────────────────────────┐
│             첫 인수 테스트 통과까지                          │
│                                                             │
│   1단계: 컴파일 가능하게 만들기                             │
│   ─────────────────────────                                 │
│   - 필요한 클래스 스텁 생성                                 │
│   - 필요한 메서드 시그니처 정의                             │
│   - 빈 구현으로 컴파일 통과                                 │
│                                                             │
│   2단계: 테스트 실행 가능하게 만들기                        │
│   ───────────────────────────                               │
│   - 가짜 서버 기본 동작                                     │
│   - 애플리케이션 시작/종료                                  │
│   - 아직 실패하지만 실행은 됨                               │
│                                                             │
│   3단계: 테스트 통과시키기                                  │
│   ────────────────────                                      │
│   - 실제 통신 구현                                          │
│   - 메시지 파싱/생성                                        │
│   - UI 상태 업데이트                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 스텁에서 시작

```cpp
// 1단계: 컴파일 가능한 스텁

// src/sniper/auction_sniper.h
class AuctionSniper {
public:
    void join_auction(const std::string& item_id) {
        // TODO: 구현
    }

    SniperStatus status() const {
        return SniperStatus::Joining;  // 하드코딩
    }
};

// 이 상태로 테스트 실행 → 실패
// 하지만 컴파일은 됨, 구조는 잡힘
```

```python
# 1단계: 컴파일 가능한 스텁

# src/auction_sniper/sniper.py
from enum import Enum

class SniperStatus(Enum):
    JOINING = "Joining"
    LOST = "Lost"
    BIDDING = "Bidding"
    WON = "Won"

class AuctionSniper:
    def __init__(self):
        self._status = SniperStatus.JOINING

    def join_auction(self, item_id: str) -> None:
        pass  # TODO: 구현

    @property
    def status(self) -> SniperStatus:
        return self._status

# 이 상태로 테스트 실행 → 실패
# 하지만 import 가능, 구조는 잡힘
```

## 4.7 Walking Skeleton의 범위

### 무엇을 포함해야 하는가?

```
포함:
✓ 전체 아키텍처 관통
✓ 빌드/테스트/배포 자동화
✓ 기본 에러 핸들링
✓ 로깅 인프라
✓ 설정 관리

제외:
✗ 모든 비즈니스 로직
✗ 예외 케이스 처리
✗ 성능 최적화
✗ 보안 (초기에는)
✗ 완전한 UI
```

### 완료 기준

```
Walking Skeleton 완료 = 다음이 모두 참:

1. 첫 인수 테스트 통과
2. CI에서 자동 빌드/테스트
3. 배포 가능한 아티팩트 생성
4. 팀 전체가 동일 환경에서 개발 가능
5. 다음 기능 추가 준비 완료
```

## 정리

| 개념 | 핵심 |
|------|------|
| **Walking Skeleton** | 최소 기능으로 전체 아키텍처 관통 |
| **인수 테스트 우선** | 바깥에서 시작, 안으로 진행 |
| **인프라 우선** | 빌드/배포/CI가 기능보다 먼저 |
| **스텁으로 시작** | 컴파일 가능 → 실행 가능 → 통과 |
| **완료 기준** | 다음 기능 추가 준비 완료 |

**핵심 질문:**
> 지금 이 프로젝트에 새 기능을 추가하려면 무엇이 필요한가? 그것이 준비되어 있는가?

## 다음 장 예고

다음 장에서는 TDD 사이클을 유지하는 방법을 다룬다. 테스트가 복잡해지거나 구현이 어려워질 때 어떻게 대처해야 하는지 살펴본다.
