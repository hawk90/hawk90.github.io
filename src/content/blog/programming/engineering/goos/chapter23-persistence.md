---
title: "Ch 23-27: Advanced — Persistence / Threads / Async / Wrap-up"
date: 2026-05-10T16:00:00
description: "DB 테스트, 스레드 / 비동기 테스트, 시리즈 마무리."
tags: [TDD, Persistence, Threading]
series: "Growing Object-Oriented Software"
seriesOrder: 23
draft: true
---

이 장은 GOOS 원서의 Chapter 23-27 고급 주제를 한 글로 통합한다. 영속성, 스레드, 비동기, 그리고 시리즈 마무리까지 함께 다룬다. 각 주제는 한 권의 책으로 빠질 만큼 깊지만, 공통된 원칙은 단순하다. **외부 경계는 wrapper로 격리하고, 도메인은 그 wrapper에 대해서만 테스트한다.**

---

# Part 1: Persistence 테스트 (Ch 23)

## 데이터베이스 테스트 전략

영속성 계층 테스트는 다른 테스트와 다른 고려사항이 있다.

![Test Pyramid](/images/blog/goos/diagrams/ch23-test-pyramid.svg)

## Repository 패턴으로 격리

### C++ Repository 인터페이스

```cpp
// 영속성 추상화
class AuctionRepository {
public:
    virtual ~AuctionRepository() = default;
    virtual void save(const AuctionRecord& record) = 0;
    virtual std::optional<AuctionRecord> findById(const std::string& id) = 0;
    virtual std::vector<AuctionRecord> findByState(AuctionState state) = 0;
    virtual void deleteById(const std::string& id) = 0;
};

// 도메인 로직 테스트: Mock Repository 사용
class MockAuctionRepository : public AuctionRepository {
public:
    MOCK_METHOD(void, save, (const AuctionRecord&), (override));
    MOCK_METHOD(std::optional<AuctionRecord>, findById, (const std::string&), (override));
    MOCK_METHOD(std::vector<AuctionRecord>, findByState, (AuctionState), (override));
    MOCK_METHOD(void, deleteById, (const std::string&), (override));
};

TEST_F(AuctionServiceTest, SavesWonAuction) {
    AuctionRecord expected{"item-123", AuctionState::WON, 1098};

    EXPECT_CALL(repository_, save(RecordWithId("item-123")));

    service_.recordWin("item-123", 1098);
}
```

### Python Repository 패턴

```python
from abc import ABC, abstractmethod
from typing import Optional, List
from dataclasses import dataclass

@dataclass
class AuctionRecord:
    item_id: str
    state: str
    final_price: int

class AuctionRepository(ABC):
    @abstractmethod
    def save(self, record: AuctionRecord) -> None: ...

    @abstractmethod
    def find_by_id(self, item_id: str) -> Optional[AuctionRecord]: ...

    @abstractmethod
    def find_by_state(self, state: str) -> List[AuctionRecord]: ...

    @abstractmethod
    def delete_by_id(self, item_id: str) -> None: ...


# Mock Repository로 도메인 로직 테스트
def test_saves_won_auction():
    repository = Mock(spec=AuctionRepository)
    service = AuctionService(repository)

    service.record_win("item-123", 1098)

    repository.save.assert_called_once()
    saved_record = repository.save.call_args[0][0]
    assert saved_record.item_id == "item-123"
    assert saved_record.state == "WON"
```

## In-Memory Repository

빠른 테스트를 위한 메모리 기반 구현.

### C++ In-Memory 구현

```cpp
class InMemoryAuctionRepository : public AuctionRepository {
public:
    void save(const AuctionRecord& record) override {
        records_[record.itemId] = record;
    }

    std::optional<AuctionRecord> findById(const std::string& id) override {
        auto it = records_.find(id);
        if (it != records_.end()) {
            return it->second;
        }
        return std::nullopt;
    }

    std::vector<AuctionRecord> findByState(AuctionState state) override {
        std::vector<AuctionRecord> result;
        for (const auto& [id, record] : records_) {
            if (record.state == state) {
                result.push_back(record);
            }
        }
        return result;
    }

    void deleteById(const std::string& id) override {
        records_.erase(id);
    }

    // 테스트 헬퍼
    void clear() { records_.clear(); }
    size_t count() const { return records_.size(); }

private:
    std::unordered_map<std::string, AuctionRecord> records_;
};

// 통합 테스트: In-Memory Repository 사용
class AuctionServiceIntegrationTest : public testing::Test {
protected:
    InMemoryAuctionRepository repository_;
    AuctionService service_{&repository_};
};

TEST_F(AuctionServiceIntegrationTest, PersistsAndRetrievesAuction) {
    service_.recordWin("item-123", 1098);

    auto record = service_.getAuction("item-123");

    ASSERT_TRUE(record.has_value());
    EXPECT_EQ(AuctionState::WON, record->state);
    EXPECT_EQ(1098, record->finalPrice);
}
```

### Python In-Memory 구현

```python
class InMemoryAuctionRepository(AuctionRepository):
    def __init__(self):
        self._records: dict[str, AuctionRecord] = {}

    def save(self, record: AuctionRecord) -> None:
        self._records[record.item_id] = record

    def find_by_id(self, item_id: str) -> Optional[AuctionRecord]:
        return self._records.get(item_id)

    def find_by_state(self, state: str) -> List[AuctionRecord]:
        return [r for r in self._records.values() if r.state == state]

    def delete_by_id(self, item_id: str) -> None:
        self._records.pop(item_id, None)

    # 테스트 헬퍼
    def clear(self):
        self._records.clear()

    def count(self) -> int:
        return len(self._records)


# 통합 테스트
@pytest.fixture
def repository():
    return InMemoryAuctionRepository()

@pytest.fixture
def service(repository):
    return AuctionService(repository)

def test_persists_and_retrieves_auction(service, repository):
    service.record_win("item-123", 1098)

    record = service.get_auction("item-123")

    assert record is not None
    assert record.state == "WON"
    assert record.final_price == 1098
```

## 실제 DB 테스트

통합 테스트에서 실제 DB를 사용하는 경우.

### C++ SQLite 테스트

```cpp
#include <sqlite3.h>

class SqliteAuctionRepository : public AuctionRepository {
public:
    explicit SqliteAuctionRepository(const std::string& db_path) {
        sqlite3_open(db_path.c_str(), &db_);
        createTable();
    }

    ~SqliteAuctionRepository() {
        sqlite3_close(db_);
    }

    void save(const AuctionRecord& record) override {
        const char* sql = R"(
            INSERT OR REPLACE INTO auctions (item_id, state, final_price)
            VALUES (?, ?, ?)
        )";

        sqlite3_stmt* stmt;
        sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr);
        sqlite3_bind_text(stmt, 1, record.itemId.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(stmt, 2, static_cast<int>(record.state));
        sqlite3_bind_int(stmt, 3, record.finalPrice);
        sqlite3_step(stmt);
        sqlite3_finalize(stmt);
    }

    // ... 다른 메서드들

private:
    sqlite3* db_;

    void createTable() {
        const char* sql = R"(
            CREATE TABLE IF NOT EXISTS auctions (
                item_id TEXT PRIMARY KEY,
                state INTEGER,
                final_price INTEGER
            )
        )";
        sqlite3_exec(db_, sql, nullptr, nullptr, nullptr);
    }
};

// DB 테스트 픽스처
class SqliteAuctionRepositoryTest : public testing::Test {
protected:
    void SetUp() override {
        // 테스트마다 새 DB 파일
        db_path_ = "/tmp/test_auction_" +
            std::to_string(std::chrono::system_clock::now().time_since_epoch().count()) +
            ".db";
        repository_ = std::make_unique<SqliteAuctionRepository>(db_path_);
    }

    void TearDown() override {
        repository_.reset();
        std::remove(db_path_.c_str());
    }

    std::string db_path_;
    std::unique_ptr<SqliteAuctionRepository> repository_;
};

TEST_F(SqliteAuctionRepositoryTest, SavesAndRetrievesRecord) {
    AuctionRecord record{"item-123", AuctionState::WON, 1098};

    repository_->save(record);
    auto retrieved = repository_->findById("item-123");

    ASSERT_TRUE(retrieved.has_value());
    EXPECT_EQ("item-123", retrieved->itemId);
    EXPECT_EQ(AuctionState::WON, retrieved->state);
}
```

### Python SQLite 테스트

```python
import sqlite3
import tempfile
import os
import pytest

class SqliteAuctionRepository(AuctionRepository):
    def __init__(self, db_path: str):
        self.conn = sqlite3.connect(db_path)
        self._create_table()

    def _create_table(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS auctions (
                item_id TEXT PRIMARY KEY,
                state TEXT,
                final_price INTEGER
            )
        """)
        self.conn.commit()

    def save(self, record: AuctionRecord) -> None:
        self.conn.execute(
            "INSERT OR REPLACE INTO auctions VALUES (?, ?, ?)",
            (record.item_id, record.state, record.final_price)
        )
        self.conn.commit()

    def find_by_id(self, item_id: str) -> Optional[AuctionRecord]:
        cursor = self.conn.execute(
            "SELECT item_id, state, final_price FROM auctions WHERE item_id = ?",
            (item_id,)
        )
        row = cursor.fetchone()
        if row:
            return AuctionRecord(*row)
        return None

    def close(self):
        self.conn.close()


# pytest fixture로 DB 관리
@pytest.fixture
def sqlite_repository():
    """각 테스트마다 새 DB 생성"""
    fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)

    repo = SqliteAuctionRepository(db_path)
    yield repo

    repo.close()
    os.unlink(db_path)


def test_saves_and_retrieves_record(sqlite_repository):
    record = AuctionRecord("item-123", "WON", 1098)

    sqlite_repository.save(record)
    retrieved = sqlite_repository.find_by_id("item-123")

    assert retrieved is not None
    assert retrieved.item_id == "item-123"
    assert retrieved.state == "WON"
```

## 트랜잭션 롤백 패턴

테스트 후 DB 상태를 원래대로 복원.

```python
@pytest.fixture
def transactional_session(db_connection):
    """테스트마다 트랜잭션 롤백"""
    connection = db_connection.connect()
    transaction = connection.begin()

    yield connection

    transaction.rollback()
    connection.close()


def test_with_rollback(transactional_session):
    # 테스트 중 DB 변경
    transactional_session.execute("INSERT INTO auctions VALUES ('item-1', 'WON', 100)")

    # 검증
    result = transactional_session.execute("SELECT * FROM auctions").fetchall()
    assert len(result) == 1

    # 테스트 종료 시 자동 롤백 → DB 상태 복원
```

---

# Part 2: Threading 테스트 (Ch 24)

## 스레드 테스트의 어려움

| # | 도전 | 세부 |
|---|------|------|
| 1 | Non-deterministic | 실행 순서가 매번 다름, 때로는 통과 / 때로는 실패 |
| 2 | Race Conditions | 타이밍에 따라 버그 발생, 테스트에서 재현하기 어려움 |
| 3 | Deadlocks | 테스트가 영원히 멈춤, CI에서 timeout |

해결 전략:

- 동기화 포인트 사용
- Timeout으로 보호
- Thread-safe 설계 검증

## 동기화 포인트

### C++ - Condition Variable

```cpp
#include <mutex>
#include <condition_variable>

// 동기화를 위한 래치
class TestLatch {
public:
    explicit TestLatch(int count = 1) : count_(count) {}

    void countDown() {
        std::unique_lock<std::mutex> lock(mutex_);
        if (--count_ <= 0) {
            cv_.notify_all();
        }
    }

    bool await(std::chrono::milliseconds timeout) {
        std::unique_lock<std::mutex> lock(mutex_);
        return cv_.wait_for(lock, timeout, [this] { return count_ <= 0; });
    }

private:
    std::mutex mutex_;
    std::condition_variable cv_;
    int count_;
};

// 테스트에서 사용
TEST_F(ThreadedAuctionTest, NotifiesListenerFromAnotherThread) {
    TestLatch notified;
    SniperSnapshot received;

    // 리스너가 호출되면 래치 해제
    EXPECT_CALL(listener_, sniperStateChanged(_))
        .WillOnce([&](const SniperSnapshot& snapshot) {
            received = snapshot;
            notified.countDown();
        });

    // 다른 스레드에서 이벤트 발생
    std::thread worker([&] {
        sniper_->process(PriceMessage{1000, 98, "other"});
    });

    // 타임아웃과 함께 대기
    ASSERT_TRUE(notified.await(std::chrono::seconds(5)))
        << "Listener was not notified within timeout";

    EXPECT_EQ(SniperState::BIDDING, received.state());

    worker.join();
}
```

### Python - Threading Event

```python
import threading
from concurrent.futures import ThreadPoolExecutor, TimeoutError

def test_notifies_listener_from_another_thread():
    notified = threading.Event()
    received = []

    def on_state_changed(snapshot):
        received.append(snapshot)
        notified.set()

    listener.sniper_state_changed.side_effect = on_state_changed

    # 다른 스레드에서 이벤트 발생
    executor = ThreadPoolExecutor(max_workers=1)
    future = executor.submit(
        sniper.process,
        PriceMessage(1000, 98, "other")
    )

    # 타임아웃과 함께 대기
    assert notified.wait(timeout=5.0), "Listener was not notified within timeout"

    assert len(received) == 1
    assert received[0].state == SniperState.BIDDING

    future.result(timeout=1.0)
    executor.shutdown(wait=True)
```

## 스레드 안전성 테스트

### C++ - 동시 접근 테스트

```cpp
#include <thread>
#include <vector>
#include <atomic>

TEST_F(ThreadSafetyTest, ConcurrentBidsDoNotCorrupt) {
    constexpr int NUM_THREADS = 10;
    constexpr int BIDS_PER_THREAD = 100;

    std::atomic<int> bid_count{0};
    std::vector<std::thread> threads;

    // 여러 스레드에서 동시에 입찰
    for (int i = 0; i < NUM_THREADS; ++i) {
        threads.emplace_back([&, i] {
            for (int j = 0; j < BIDS_PER_THREAD; ++j) {
                sniper_->process(PriceMessage{
                    1000 + i * BIDS_PER_THREAD + j,
                    98,
                    "bidder-" + std::to_string(i)
                });
                bid_count++;
            }
        });
    }

    // 모든 스레드 완료 대기
    for (auto& t : threads) {
        t.join();
    }

    // 모든 입찰이 처리되었는지 확인
    EXPECT_EQ(NUM_THREADS * BIDS_PER_THREAD, bid_count.load());

    // 상태가 일관성 있는지 확인
    auto snapshot = sniper_->snapshot();
    EXPECT_TRUE(snapshot.isValid());
}
```

### Python - 동시성 테스트

```python
import concurrent.futures
import threading

def test_concurrent_bids_do_not_corrupt():
    NUM_THREADS = 10
    BIDS_PER_THREAD = 100

    bid_count = threading.atomic = 0
    lock = threading.Lock()

    def make_bids(thread_id):
        nonlocal bid_count
        for j in range(BIDS_PER_THREAD):
            sniper.process(PriceMessage(
                1000 + thread_id * BIDS_PER_THREAD + j,
                98,
                f"bidder-{thread_id}"
            ))
            with lock:
                bid_count += 1

    with concurrent.futures.ThreadPoolExecutor(max_workers=NUM_THREADS) as executor:
        futures = [executor.submit(make_bids, i) for i in range(NUM_THREADS)]
        concurrent.futures.wait(futures, timeout=30)

    assert bid_count == NUM_THREADS * BIDS_PER_THREAD
    assert sniper.snapshot.is_valid()
```

## Timeout 패턴

### C++ - 테스트 타임아웃

```cpp
// Google Test에서 타임아웃 처리
class TimedTest : public testing::Test {
protected:
    template<typename Func>
    bool runWithTimeout(Func&& func, std::chrono::milliseconds timeout) {
        std::atomic<bool> completed{false};

        std::thread worker([&] {
            func();
            completed = true;
        });

        auto deadline = std::chrono::steady_clock::now() + timeout;
        while (!completed && std::chrono::steady_clock::now() < deadline) {
            std::this_thread::sleep_for(std::chrono::milliseconds(10));
        }

        if (completed) {
            worker.join();
            return true;
        } else {
            worker.detach();  // 주의: 리소스 누수 가능
            return false;
        }
    }
};

TEST_F(TimedTest, CompletesWithinTimeout) {
    bool completed = runWithTimeout([&] {
        // 긴 작업
        sniper_->joinAuctionAndWait();
    }, std::chrono::seconds(10));

    ASSERT_TRUE(completed) << "Operation timed out";
}
```

### Python - pytest 타임아웃

```python
import pytest
import signal

# pytest-timeout 플러그인 사용
@pytest.mark.timeout(10)
def test_completes_within_timeout():
    sniper.join_auction_and_wait()
    assert sniper.state != SniperState.JOINING


# 수동 타임아웃
def test_with_manual_timeout():
    def timeout_handler(signum, frame):
        raise TimeoutError("Operation timed out")

    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(10)  # 10초 타임아웃

    try:
        sniper.join_auction_and_wait()
        assert sniper.state != SniperState.JOINING
    finally:
        signal.alarm(0)  # 타임아웃 취소
```

---

# Part 3: Asynchronous 테스트 (Ch 25)

## 비동기 코드 테스트 전략

| # | 전략 | 특징 |
|---|------|------|
| 1 | Polling (폴링) | 조건이 만족될 때까지 반복 확인 — 간단하지만 비효율적 |
| 2 | Notification (알림) | 이벤트 / 콜백으로 완료 알림 — 효율적이지만 설정 복잡 |
| 3 | Deterministic (결정적) | 비동기를 동기로 만듦 — 가장 신뢰성 있음 |

## Polling 패턴

### C++ - assertEventually

```cpp
#include <chrono>
#include <thread>
#include <functional>

class AsyncAssertions {
public:
    template<typename Predicate>
    static void assertEventually(
        Predicate pred,
        std::chrono::milliseconds timeout = std::chrono::seconds(5),
        std::chrono::milliseconds interval = std::chrono::milliseconds(100),
        const std::string& message = "Condition not met within timeout"
    ) {
        auto deadline = std::chrono::steady_clock::now() + timeout;

        while (std::chrono::steady_clock::now() < deadline) {
            if (pred()) {
                return;  // 성공
            }
            std::this_thread::sleep_for(interval);
        }

        FAIL() << message;
    }
};

// 매크로로 더 편리하게
#define ASSERT_EVENTUALLY(pred, ...) \
    AsyncAssertions::assertEventually([&] { return pred; }, ##__VA_ARGS__)

// 사용
TEST_F(AsyncSniperTest, EventuallyReportsWinning) {
    startAuction();
    sniper_->join();

    // 비동기 상태 변경 대기
    ASSERT_EVENTUALLY(
        sniper_->snapshot().state() == SniperState::WINNING,
        std::chrono::seconds(10),
        std::chrono::milliseconds(50),
        "Sniper did not report WINNING state"
    );
}
```

### Python - assertEventually

```python
import time
from typing import Callable

def assert_eventually(
    predicate: Callable[[], bool],
    timeout: float = 5.0,
    interval: float = 0.1,
    message: str = "Condition not met within timeout"
):
    """조건이 만족될 때까지 폴링"""
    deadline = time.time() + timeout

    while time.time() < deadline:
        if predicate():
            return  # 성공
        time.sleep(interval)

    pytest.fail(message)


# 데코레이터 버전
def eventually(timeout=5.0, interval=0.1):
    def decorator(func):
        def wrapper(*args, **kwargs):
            deadline = time.time() + timeout
            last_error = None

            while time.time() < deadline:
                try:
                    func(*args, **kwargs)
                    return  # 성공
                except AssertionError as e:
                    last_error = e
                time.sleep(interval)

            raise last_error or AssertionError("Condition not met")
        return wrapper
    return decorator


# 사용
def test_eventually_reports_winning(sniper):
    start_auction()
    sniper.join()

    assert_eventually(
        lambda: sniper.snapshot.state == SniperState.WINNING,
        timeout=10.0,
        message="Sniper did not report WINNING state"
    )


# 데코레이터 사용
@eventually(timeout=10.0)
def assert_sniper_winning(sniper):
    assert sniper.snapshot.state == SniperState.WINNING

def test_with_decorator(sniper):
    start_auction()
    sniper.join()
    assert_sniper_winning(sniper)
```

## Async/Await 테스트

### C++ - std::future

```cpp
#include <future>

TEST_F(AsyncTest, FutureBasedAsyncTest) {
    // 비동기 작업 시작
    auto future = std::async(std::launch::async, [&] {
        sniper_->joinAndWait();
        return sniper_->snapshot();
    });

    // 타임아웃과 함께 대기
    auto status = future.wait_for(std::chrono::seconds(10));

    ASSERT_EQ(std::future_status::ready, status)
        << "Async operation timed out";

    auto snapshot = future.get();
    EXPECT_NE(SniperState::JOINING, snapshot.state());
}
```

### Python - pytest-asyncio

```python
import pytest
import asyncio

# pytest-asyncio 플러그인 사용
@pytest.mark.asyncio
async def test_async_auction_flow():
    sniper = AsyncAuctionSniper("item-123")

    await sniper.join()
    await sniper.process(PriceMessage(1000, 98, "other"))
    await sniper.process(CloseMessage())

    assert sniper.state == SniperState.LOST


@pytest.mark.asyncio
async def test_async_with_timeout():
    sniper = AsyncAuctionSniper("item-123")

    # asyncio.wait_for로 타임아웃
    try:
        await asyncio.wait_for(sniper.join(), timeout=5.0)
    except asyncio.TimeoutError:
        pytest.fail("Join operation timed out")

    assert sniper.state != SniperState.JOINING


# async fixture
@pytest.fixture
async def async_sniper():
    sniper = AsyncAuctionSniper("item-123")
    yield sniper
    await sniper.close()


@pytest.mark.asyncio
async def test_with_async_fixture(async_sniper):
    await async_sniper.join()
    assert async_sniper.is_connected
```

## 비동기를 동기로 전환

테스트 가능성을 위해 비동기를 추상화.

### C++ - Executor 추상화

```cpp
// 실행 정책 추상화
class Executor {
public:
    virtual ~Executor() = default;
    virtual void execute(std::function<void()> task) = 0;
    virtual void shutdown() = 0;
};

// 실제 비동기 실행
class AsyncExecutor : public Executor {
public:
    void execute(std::function<void()> task) override {
        std::thread([task] { task(); }).detach();
    }
    void shutdown() override { /* cleanup */ }
};

// 동기 실행 (테스트용)
class SynchronousExecutor : public Executor {
public:
    void execute(std::function<void()> task) override {
        task();  // 즉시 실행
    }
    void shutdown() override {}
};

// 테스트에서 동기 executor 주입
TEST_F(SynchronousTest, TestsWithDeterministicExecution) {
    SynchronousExecutor executor;
    AuctionSniper sniper("item-123", &listener_, &auction_, &executor);

    // 모든 것이 동기적으로 실행
    sniper.join();

    EXPECT_EQ(SniperState::JOINING, sniper.snapshot().state());
}
```

### Python - Executor 추상화

```python
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor
from typing import Callable

class Executor(ABC):
    @abstractmethod
    def execute(self, task: Callable[[], None]) -> None: ...

    @abstractmethod
    def shutdown(self) -> None: ...


class AsyncExecutor(Executor):
    def __init__(self):
        self._pool = ThreadPoolExecutor(max_workers=4)

    def execute(self, task: Callable[[], None]) -> None:
        self._pool.submit(task)

    def shutdown(self) -> None:
        self._pool.shutdown(wait=True)


class SynchronousExecutor(Executor):
    """테스트용 동기 executor"""

    def execute(self, task: Callable[[], None]) -> None:
        task()  # 즉시 실행

    def shutdown(self) -> None:
        pass


# 테스트
@pytest.fixture
def sync_executor():
    return SynchronousExecutor()

def test_deterministic_execution(sync_executor):
    sniper = AuctionSniper("item-123", listener, auction, sync_executor)

    sniper.join()

    # 동기적으로 실행되므로 상태 즉시 확인 가능
    assert sniper.state == SniperState.JOINING
```

---

# Part 4: 시리즈 마무리 (Ch 26-27)

## TDD 성숙도 모델

![TDD Maturity Model](/images/blog/goos/diagrams/ch23-tdd-maturity.svg)

## TDD 핵심 원칙 복습

### 1. Red-Green-Refactor

![Red-Green-Refactor Cycle](/images/blog/goos/diagrams/ch01-red-green-refactor.svg)

### 2. 테스트 피라미드

![Test Pyramid](/images/blog/goos/diagrams/ch23-test-pyramid.svg)

### 3. Test Doubles 사용 지침

| Double | 용도 | 예시 |
|--------|------|------|
| Stub | 고정 응답 제공 | `repository.find() returns fixed_data` |
| Mock | 상호작용 검증 | `verify(listener).stateChanged(...)` |
| Fake | 간단한 구현 | `InMemoryRepository` |
| Spy | 호출 기록 | `captor.capture(call_args)` |

## 추천 학습 자료

### 필수 도서

1. **Growing Object-Oriented Software, Guided by Tests** (Freeman & Pryce)
   - 이 시리즈의 원서
   - Outside-In TDD의 정석

2. **Unit Testing: Principles, Practices, and Patterns** (Khorikov)
   - 테스트 품질과 유지보수성
   - 좋은 테스트 vs 나쁜 테스트

3. **xUnit Test Patterns** (Meszaros)
   - 테스트 패턴 백과사전
   - Test Smells 카탈로그

### 언어별 자료

**C++:**
- Google Test / Google Mock 공식 문서
- CppCon 발표: "Modern C++ Testing"
- Catch2 프레임워크

**Python:**
- pytest 공식 문서
- "Python Testing with pytest" (Okken)
- hypothesis 라이브러리 (Property-Based Testing)

## 마무리: TDD 적용 체크리스트

**시작하기 전**

- [ ] 요구사항을 테스트로 표현했는가?
- [ ] 테스트가 실패하는 것을 확인했는가?

**구현 중**

- [ ] 테스트를 통과하는 최소 코드인가?
- [ ] 중복을 제거했는가?
- [ ] 명확한 의도를 드러내는가?

**리팩토링**

- [ ] 테스트가 여전히 통과하는가?
- [ ] 설계가 개선되었는가?
- [ ] 새 테스트가 필요한가?

**완료 후**

- [ ] 테스트가 문서 역할을 하는가?
- [ ] 테스트 실패 시 원인을 알 수 있는가?
- [ ] 리팩토링에 자신감이 있는가?

## 결론

TDD는 **테스트를 작성하는 것이 아니라 설계를 하는 것**이다.

- 테스트가 먼저 → 인터페이스 설계 강제
- Mock 사용 → 협력 관계 명확화
- 지속적 리팩토링 → 설계 개선
- 빠른 피드백 → 자신감 있는 변경

GOOS 스타일 TDD의 핵심:
1. **인수 테스트로 시작** - 외부에서 내부로
2. **Mock으로 협력 설계** - 객체 간 대화
3. **테스트가 주는 피드백 청취** - 설계 개선 힌트
4. **지속적 리팩토링** - 점진적 설계

이 시리즈를 통해 배운 것들을 실제 프로젝트에 적용하라. 처음에는 어색하겠지만, 연습을 통해 자연스러워질 것이다.

**TDD는 기술이 아니라 습관이다.**

---

## 관련 항목

- [Ch 22: Test Diagnostics](/blog/programming/engineering/goos/chapter22-test-diagnostics) — 이전 장
- [Ch 1: What Is TDD?](/blog/programming/engineering/goos/chapter01-what-is-tdd) — 시리즈 시작점
- [TDD by Example](/blog/programming/engineering/tdd-by-example/ch01) — Detroit school을 정면으로 다루는 자매 시리즈
- [Khorikov: 단위 테스트의 원칙과 관행](/blog/programming/engineering/khorikov-unit-testing/chapter02-what-is-unit-test) — GOOS 스타일에 대한 현대적 비판과 보완
- TDD Patterns — TDD를 실천하기 위한 패턴 카탈로그
- Refactoring Catalog — REFACTOR 단계를 위한 카탈로그
- [원서 — Growing Object-Oriented Software, Guided by Tests](https://www.growing-object-oriented-software.com/)

*시리즈 완결*
