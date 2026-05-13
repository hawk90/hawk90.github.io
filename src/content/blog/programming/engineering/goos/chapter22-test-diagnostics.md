---
title: "Ch 22: Test Diagnostics"
date: 2025-10-13T04:00:00
description: "실패하는 테스트는 좋은 진단 메시지 — assert 메시지, dump."
tags: [TDD, Diagnostics]
series: "Growing Object-Oriented Software"
seriesOrder: 22
draft: true
---

## 테스트 진단의 중요성

테스트가 실패했을 때, **왜 실패했는지** 즉시 알 수 있어야 한다. 좋은 진단 메시지는 디버깅 시간을 극적으로 줄인다.

```
┌─────────────────────────────────────────────────────────┐
│                 테스트 실패 진단 흐름                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  테스트 실패!                                            │
│      │                                                  │
│      ▼                                                  │
│  ┌──────────────────────────────────────────┐           │
│  │ 나쁜 메시지:                             │           │
│  │ "AssertionError"                         │           │
│  │                                          │           │
│  │ → 무엇이? 어디서? 왜?                    │           │
│  │ → 디버거 연결                            │           │
│  │ → 30분+ 디버깅                           │           │
│  └──────────────────────────────────────────┘           │
│                                                         │
│  ┌──────────────────────────────────────────┐           │
│  │ 좋은 메시지:                             │           │
│  │ "Expected state=WON but was LOST         │           │
│  │  for item 'item-123' at price 1098"      │           │
│  │                                          │           │
│  │ → 문제 즉시 파악                         │           │
│  │ → 원인 추론 가능                         │           │
│  │ → 5분 내 수정                            │           │
│  └──────────────────────────────────────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

좋은 진단 메시지의 요소:
- **무엇이** 실패했는가 (what)
- **어디서** 실패했는가 (where)
- **왜** 실패했는가 (why) - 기대값 vs 실제값
- **어떤 맥락**에서 실패했는가 (context)

---

## 기본 Assertion 메시지

### 나쁜 예 vs 좋은 예

**C++ - 나쁜 메시지**
```cpp
// 정보가 없는 assertion
TEST(SniperTest, BadMessage) {
    auto snapshot = sniper.currentSnapshot();

    // 실패 시: "Value of: snapshot.state() == SniperState::WON"
    //         "Actual: false"
    //         "Expected: true"
    EXPECT_TRUE(snapshot.state() == SniperState::WON);
}
```

**C++ - 좋은 메시지**
```cpp
// 정보가 풍부한 assertion
TEST(SniperTest, GoodMessage) {
    auto snapshot = sniper.currentSnapshot();

    // 실패 시: "Expected: WON"
    //         "Actual: LOST"
    EXPECT_EQ(SniperState::WON, snapshot.state());

    // 또는 커스텀 메시지 추가
    EXPECT_EQ(SniperState::WON, snapshot.state())
        << "Sniper should have won auction for item: " << snapshot.itemId()
        << ", final price: " << snapshot.lastPrice();
}
```

**Python - 나쁜 메시지**
```python
# 정보가 없는 assertion
def test_bad_message():
    snapshot = sniper.current_snapshot()

    # 실패 시: "AssertionError: assert False"
    assert snapshot.state == SniperState.WON
```

**Python - 좋은 메시지**
```python
# 정보가 풍부한 assertion
def test_good_message():
    snapshot = sniper.current_snapshot()

    # 실패 시: "AssertionError: Expected WON but got LOST"
    assert snapshot.state == SniperState.WON, \
        f"Expected {SniperState.WON} but got {snapshot.state}"

    # pytest는 자동으로 좋은 메시지 생성
    # "assert <SniperState.LOST: 2> == <SniperState.WON: 4>"
```

---

## 향상된 Assertion 라이브러리

### C++ - Google Test Matchers

```cpp
#include <gmock/gmock-matchers.h>

using namespace testing;

// 기본 assertion보다 훨씬 나은 메시지
TEST_F(AuctionSniperTest, MatchersProvideGoodMessages) {
    SniperSnapshot snapshot = createSnapshot(SniperState::LOST);

    // 실패 시:
    // "Value of: snapshot.state()"
    // "Expected: is equal to WON"
    // "Actual: LOST"
    EXPECT_THAT(snapshot.state(), Eq(SniperState::WON));

    // 컬렉션 검증
    std::vector<std::string> items = {"item-1", "item-2"};

    // 실패 시:
    // "Value of: items"
    // "Expected: contains 'item-3'"
    // "Actual: ['item-1', 'item-2']"
    EXPECT_THAT(items, Contains("item-3"));
}
```

**Custom Matcher with Description**
```cpp
// 설명이 포함된 커스텀 matcher
MATCHER_P(HasState, expected,
    std::string(negation ? "doesn't have" : "has") +
    " state " + PrintToString(expected)) {
    return arg.state() == expected;
}

MATCHER_P2(HasPriceInRange, min_price, max_price,
    "has price in range [" + PrintToString(min_price) +
    ", " + PrintToString(max_price) + "]") {
    return arg.lastPrice() >= min_price && arg.lastPrice() <= max_price;
}

// 실패 시:
// "Value of: snapshot"
// "Expected: has state WON"
// "Actual: {itemId: 'item-123', state: LOST, price: 1000, bid: 1098}"
EXPECT_THAT(snapshot, HasState(SniperState::WON));
```

**PrintTo로 객체 출력 개선**
```cpp
// 객체의 출력 형식 정의
void PrintTo(const SniperSnapshot& snapshot, std::ostream* os) {
    *os << "SniperSnapshot{"
        << "itemId: '" << snapshot.itemId() << "', "
        << "state: " << toString(snapshot.state()) << ", "
        << "price: " << snapshot.lastPrice() << ", "
        << "bid: " << snapshot.lastBid()
        << "}";
}

void PrintTo(SniperState state, std::ostream* os) {
    switch (state) {
        case SniperState::JOINING: *os << "JOINING"; break;
        case SniperState::BIDDING: *os << "BIDDING"; break;
        case SniperState::WINNING: *os << "WINNING"; break;
        case SniperState::LOST: *os << "LOST"; break;
        case SniperState::WON: *os << "WON"; break;
        default: *os << "UNKNOWN(" << static_cast<int>(state) << ")";
    }
}
```

### Python - pytest 자동 assertion 분석

**pytest는 assertion을 자동 분석**
```python
def test_pytest_auto_analysis():
    snapshot = SniperSnapshot(
        item_id="item-123",
        state=SniperState.LOST,
        last_price=1000,
        last_bid=1098
    )

    # pytest는 이를 자동으로 상세히 보여줌
    assert snapshot.state == SniperState.WON

    # 출력:
    # AssertionError: assert <SniperState.LOST: 2> == <SniperState.WON: 4>
    # +  where <SniperState.LOST: 2> = SniperSnapshot(item_id='item-123', ...).state
```

**__repr__로 객체 출력 개선**
```python
from dataclasses import dataclass
from enum import Enum

class SniperState(Enum):
    JOINING = 0
    BIDDING = 1
    WINNING = 2
    LOST = 3
    WON = 4

@dataclass
class SniperSnapshot:
    item_id: str
    state: SniperState
    last_price: int
    last_bid: int

    def __repr__(self):
        return (
            f"SniperSnapshot("
            f"item_id='{self.item_id}', "
            f"state={self.state.name}, "
            f"price={self.last_price}, "
            f"bid={self.last_bid})"
        )

# 실패 시 출력:
# assert SniperSnapshot(item_id='item-123', state=LOST, price=1000, bid=1098).state == WON
```

**pytest-clarity / pytest-icdiff**
```python
# pytest-clarity 설치: pip install pytest-clarity

# 실패 시 diff 형태로 보여줌
def test_with_clarity():
    expected = SniperSnapshot("item-123", SniperState.WON, 1098, 1098)
    actual = SniperSnapshot("item-123", SniperState.LOST, 1000, 1098)

    assert actual == expected

    # 출력:
    # E         - SniperSnapshot(item_id='item-123', state=WON, price=1098, bid=1098)
    # E         + SniperSnapshot(item_id='item-123', state=LOST, price=1000, bid=1098)
    # E         ?                                         ^^^^        ^^^^
```

---

## 객체 상태 Dump

복잡한 객체의 실패 원인을 파악하려면 상태를 덤프해야 한다.

### C++ State Dump

```cpp
// 테스트용 상태 덤프 유틸리티
class TestDiagnostics {
public:
    static std::string dump(const AuctionSniper& sniper) {
        std::ostringstream oss;
        oss << "AuctionSniper {\n"
            << "  itemId: " << sniper.itemId() << "\n"
            << "  snapshot: " << dump(sniper.snapshot()) << "\n"
            << "  auction: " << (sniper.auction() ? "connected" : "null") << "\n"
            << "}";
        return oss.str();
    }

    static std::string dump(const SniperSnapshot& snapshot) {
        std::ostringstream oss;
        oss << "SniperSnapshot {"
            << "item: " << snapshot.itemId() << ", "
            << "state: " << toString(snapshot.state()) << ", "
            << "price: " << snapshot.lastPrice() << ", "
            << "bid: " << snapshot.lastBid()
            << "}";
        return oss.str();
    }

    static std::string dump(const std::vector<SniperSnapshot>& snapshots) {
        std::ostringstream oss;
        oss << "[\n";
        for (size_t i = 0; i < snapshots.size(); ++i) {
            oss << "  [" << i << "]: " << dump(snapshots[i]) << "\n";
        }
        oss << "]";
        return oss.str();
    }
};

// 테스트에서 사용
TEST_F(AuctionSniperTest, DumpsStateOnFailure) {
    // Arrange
    auto sniper = createSniper();
    runAuctionScenario(sniper);

    // Assert with dump on failure
    auto snapshot = sniper->currentSnapshot();
    EXPECT_EQ(SniperState::WON, snapshot.state())
        << "Sniper state dump:\n" << TestDiagnostics::dump(*sniper);
}
```

**SCOPED_TRACE로 맥락 추가**
```cpp
TEST_F(MultiItemSniperTest, AllSnipersWin) {
    std::vector<std::unique_ptr<AuctionSniper>> snipers;
    createSnipers({"item-1", "item-2", "item-3"}, snipers);

    runAllAuctions(snipers);

    for (size_t i = 0; i < snipers.size(); ++i) {
        SCOPED_TRACE("Checking sniper #" + std::to_string(i) +
                     " for " + snipers[i]->itemId());

        EXPECT_EQ(SniperState::WON, snipers[i]->snapshot().state());
    }
}

// 실패 시 출력:
// path/test.cpp:42: Failure
// Value of: snipers[i]->snapshot().state()
// Expected: WON
// Actual: LOST
// Google Test trace:
// path/test.cpp:38: Checking sniper #1 for item-2
```

### Python State Dump

```python
import json
from dataclasses import asdict

def dump_sniper(sniper):
    """테스트용 sniper 상태 덤프"""
    return json.dumps({
        "item_id": sniper.item_id,
        "state": sniper.state.name,
        "snapshot": asdict(sniper.snapshot),
        "auction_connected": sniper.auction is not None
    }, indent=2)

def dump_snapshots(snapshots):
    """스냅샷 목록 덤프"""
    return json.dumps([
        {
            "item_id": s.item_id,
            "state": s.state.name,
            "price": s.last_price,
            "bid": s.last_bid
        }
        for s in snapshots
    ], indent=2)

# 테스트에서 사용
def test_with_state_dump(sniper):
    run_auction_scenario(sniper)

    snapshot = sniper.current_snapshot()
    assert snapshot.state == SniperState.WON, \
        f"Expected WON but got {snapshot.state}\n" \
        f"Sniper state:\n{dump_sniper(sniper)}"
```

**pytest fixtures로 자동 덤프**
```python
import pytest

@pytest.fixture
def sniper_with_diagnostics(sniper):
    """실패 시 자동으로 상태 덤프"""
    yield sniper
    # 테스트 실패 시 상태 출력
    if hasattr(pytest, '_test_failed'):
        print(f"\n=== Sniper State Dump ===")
        print(dump_sniper(sniper))

# pytest hook으로 실패 감지
@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    if rep.when == "call" and rep.failed:
        pytest._test_failed = True
    else:
        pytest._test_failed = False
```

**conftest.py에 자동 덤프 설정**
```python
# conftest.py
import pytest

@pytest.fixture(autouse=True)
def dump_on_failure(request):
    """모든 테스트에서 실패 시 상태 덤프"""
    yield
    if request.node.rep_call.failed:
        # 테스트에서 사용한 객체들의 상태 덤프
        for name, value in request.node.funcargs.items():
            if hasattr(value, '__dump__'):
                print(f"\n=== {name} dump ===")
                print(value.__dump__())
```

---

## Diff 비교 가독성

복잡한 객체 비교 시 diff 형태가 유용하다.

### C++ Diff 출력

```cpp
#include <algorithm>
#include <sstream>

class DiffFormatter {
public:
    static std::string diff(const std::string& expected,
                           const std::string& actual) {
        std::ostringstream oss;
        oss << "Expected:\n" << expected << "\n\n"
            << "Actual:\n" << actual << "\n\n"
            << "Diff:\n";

        // 간단한 line-by-line diff
        auto expected_lines = splitLines(expected);
        auto actual_lines = splitLines(actual);

        size_t max_lines = std::max(expected_lines.size(), actual_lines.size());
        for (size_t i = 0; i < max_lines; ++i) {
            std::string exp = i < expected_lines.size() ? expected_lines[i] : "";
            std::string act = i < actual_lines.size() ? actual_lines[i] : "";

            if (exp != act) {
                oss << "- " << exp << "\n";
                oss << "+ " << act << "\n";
            }
        }
        return oss.str();
    }

    template<typename T>
    static std::string diff(const T& expected, const T& actual) {
        std::ostringstream exp_oss, act_oss;
        PrintTo(expected, &exp_oss);
        PrintTo(actual, &act_oss);
        return diff(exp_oss.str(), act_oss.str());
    }

private:
    static std::vector<std::string> splitLines(const std::string& str) {
        std::vector<std::string> lines;
        std::istringstream iss(str);
        std::string line;
        while (std::getline(iss, line)) {
            lines.push_back(line);
        }
        return lines;
    }
};

// 테스트에서 사용
TEST(DiffTest, ShowsDifferencesClearly) {
    SniperSnapshot expected{"item-123", SniperState::WON, 1098, 1098};
    SniperSnapshot actual{"item-123", SniperState::LOST, 1000, 1098};

    EXPECT_EQ(expected, actual)
        << DiffFormatter::diff(expected, actual);

    // 출력:
    // Expected:
    // SniperSnapshot{item: 'item-123', state: WON, price: 1098, bid: 1098}
    //
    // Actual:
    // SniperSnapshot{item: 'item-123', state: LOST, price: 1000, bid: 1098}
    //
    // Diff:
    // - SniperSnapshot{item: 'item-123', state: WON, price: 1098, bid: 1098}
    // + SniperSnapshot{item: 'item-123', state: LOST, price: 1000, bid: 1098}
}
```

**Field-by-Field Diff**
```cpp
template<typename T>
class FieldDiff {
public:
    void addField(const std::string& name,
                  const std::string& expected,
                  const std::string& actual) {
        if (expected != actual) {
            diffs_.push_back({name, expected, actual});
        }
    }

    std::string toString() const {
        if (diffs_.empty()) return "Objects are equal";

        std::ostringstream oss;
        oss << "Differences found:\n";
        for (const auto& d : diffs_) {
            oss << "  " << d.name << ":\n"
                << "    expected: " << d.expected << "\n"
                << "    actual:   " << d.actual << "\n";
        }
        return oss.str();
    }

    bool hasDifferences() const { return !diffs_.empty(); }

private:
    struct Diff {
        std::string name;
        std::string expected;
        std::string actual;
    };
    std::vector<Diff> diffs_;
};

// SniperSnapshot용 diff
std::string diffSnapshots(const SniperSnapshot& expected,
                          const SniperSnapshot& actual) {
    FieldDiff<SniperSnapshot> diff;
    diff.addField("itemId", expected.itemId(), actual.itemId());
    diff.addField("state", toString(expected.state()), toString(actual.state()));
    diff.addField("price", std::to_string(expected.lastPrice()),
                          std::to_string(actual.lastPrice()));
    diff.addField("bid", std::to_string(expected.lastBid()),
                        std::to_string(actual.lastBid()));
    return diff.toString();
}
```

### Python Diff 출력

```python
import difflib
from pprint import pformat

def diff_objects(expected, actual):
    """두 객체의 diff 출력"""
    expected_str = pformat(vars(expected) if hasattr(expected, '__dict__') else expected)
    actual_str = pformat(vars(actual) if hasattr(actual, '__dict__') else actual)

    diff = difflib.unified_diff(
        expected_str.splitlines(keepends=True),
        actual_str.splitlines(keepends=True),
        fromfile='expected',
        tofile='actual'
    )
    return ''.join(diff)

def field_diff(expected, actual):
    """필드별 diff"""
    diffs = []
    expected_dict = vars(expected) if hasattr(expected, '__dict__') else dict(expected)
    actual_dict = vars(actual) if hasattr(actual, '__dict__') else dict(actual)

    all_keys = set(expected_dict.keys()) | set(actual_dict.keys())
    for key in sorted(all_keys):
        exp_val = expected_dict.get(key, '<missing>')
        act_val = actual_dict.get(key, '<missing>')
        if exp_val != act_val:
            diffs.append(f"  {key}: expected={exp_val!r}, actual={act_val!r}")

    if not diffs:
        return "Objects are equal"
    return "Differences:\n" + "\n".join(diffs)

# 테스트에서 사용
def test_with_field_diff():
    expected = SniperSnapshot("item-123", SniperState.WON, 1098, 1098)
    actual = SniperSnapshot("item-123", SniperState.LOST, 1000, 1098)

    assert expected == actual, field_diff(expected, actual)

    # 출력:
    # Differences:
    #   last_price: expected=1098, actual=1000
    #   state: expected=<SniperState.WON: 4>, actual=<SniperState.LOST: 3>
```

**DeepDiff 라이브러리 활용**
```python
# pip install deepdiff
from deepdiff import DeepDiff

def test_with_deepdiff():
    expected = {
        "item_id": "item-123",
        "state": "WON",
        "price": 1098,
        "history": [
            {"state": "JOINING"},
            {"state": "BIDDING", "price": 1000},
            {"state": "WINNING", "price": 1098},
            {"state": "WON", "price": 1098}
        ]
    }

    actual = {
        "item_id": "item-123",
        "state": "LOST",
        "price": 1000,
        "history": [
            {"state": "JOINING"},
            {"state": "BIDDING", "price": 1000},
            {"state": "LOST", "price": 1000}
        ]
    }

    diff = DeepDiff(expected, actual, verbose_level=2)
    assert not diff, f"Objects differ:\n{diff.pretty()}"

    # 출력:
    # Objects differ:
    # {
    #   'values_changed': {
    #     "root['state']": {'new_value': 'LOST', 'old_value': 'WON'},
    #     "root['price']": {'new_value': 1000, 'old_value': 1098}
    #   },
    #   'iterable_item_removed': {
    #     "root['history'][2]": {'state': 'WINNING', 'price': 1098},
    #     "root['history'][3]": {'state': 'WON', 'price': 1098}
    #   },
    #   'iterable_item_added': {
    #     "root['history'][2]": {'state': 'LOST', 'price': 1000}
    #   }
    # }
```

---

## 자동 디버그 정보 포함

테스트 실패 시 자동으로 유용한 정보를 수집한다.

### C++ 자동 컨텍스트 수집

```cpp
// 테스트 환경 정보 자동 포함
class TestContext {
public:
    static TestContext& instance() {
        static TestContext ctx;
        return ctx;
    }

    void setCurrentTest(const std::string& name) {
        current_test_ = name;
        start_time_ = std::chrono::steady_clock::now();
        events_.clear();
    }

    void logEvent(const std::string& event) {
        auto now = std::chrono::steady_clock::now();
        auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
            now - start_time_);
        events_.push_back({elapsed.count(), event});
    }

    std::string dump() const {
        std::ostringstream oss;
        oss << "=== Test Context ===\n"
            << "Test: " << current_test_ << "\n"
            << "Events:\n";
        for (const auto& [time, event] : events_) {
            oss << "  [" << time << "ms] " << event << "\n";
        }
        return oss.str();
    }

private:
    std::string current_test_;
    std::chrono::steady_clock::time_point start_time_;
    std::vector<std::pair<int64_t, std::string>> events_;
};

// 매크로로 자동 로깅
#define LOG_EVENT(msg) TestContext::instance().logEvent(msg)

// Test Listener로 자동 출력
class DiagnosticListener : public testing::EmptyTestEventListener {
    void OnTestStart(const testing::TestInfo& info) override {
        TestContext::instance().setCurrentTest(
            std::string(info.test_case_name()) + "." + info.name());
    }

    void OnTestEnd(const testing::TestInfo& info) override {
        if (info.result()->Failed()) {
            std::cerr << TestContext::instance().dump();
        }
    }
};

// main에서 등록
int main(int argc, char** argv) {
    testing::InitGoogleTest(&argc, argv);
    testing::UnitTest::GetInstance()->listeners().Append(
        new DiagnosticListener());
    return RUN_ALL_TESTS();
}
```

**Mock 호출 히스토리 자동 기록**
```cpp
// 모든 mock 호출 기록
class MockCallRecorder {
public:
    template<typename... Args>
    void record(const std::string& method, Args&&... args) {
        std::ostringstream oss;
        oss << method << "(";
        printArgs(oss, std::forward<Args>(args)...);
        oss << ")";
        calls_.push_back(oss.str());
    }

    std::string dump() const {
        std::ostringstream oss;
        oss << "Mock calls:\n";
        for (size_t i = 0; i < calls_.size(); ++i) {
            oss << "  " << i + 1 << ". " << calls_[i] << "\n";
        }
        return oss.str();
    }

private:
    std::vector<std::string> calls_;

    template<typename T>
    void printArgs(std::ostream& os, T&& arg) {
        os << arg;
    }

    template<typename T, typename... Rest>
    void printArgs(std::ostream& os, T&& arg, Rest&&... rest) {
        os << arg << ", ";
        printArgs(os, std::forward<Rest>(rest)...);
    }
};

// Mock에 적용
class RecordingMockSniperListener : public MockSniperListener {
public:
    void sniperStateChanged(const SniperSnapshot& snapshot) override {
        recorder_.record("sniperStateChanged", snapshot);
        MockSniperListener::sniperStateChanged(snapshot);
    }

    std::string dumpCalls() const { return recorder_.dump(); }

private:
    MockCallRecorder recorder_;
};
```

### Python 자동 컨텍스트 수집

```python
import time
import functools

class TestContext:
    """테스트 컨텍스트 자동 수집"""

    def __init__(self):
        self.events = []
        self.start_time = None
        self.test_name = None

    def start_test(self, name):
        self.test_name = name
        self.start_time = time.time()
        self.events = []

    def log_event(self, event):
        elapsed = int((time.time() - self.start_time) * 1000)
        self.events.append((elapsed, event))

    def dump(self):
        lines = [
            "=== Test Context ===",
            f"Test: {self.test_name}",
            "Events:"
        ]
        for elapsed, event in self.events:
            lines.append(f"  [{elapsed}ms] {event}")
        return "\n".join(lines)

# 전역 컨텍스트
_context = TestContext()

def log_event(event):
    _context.log_event(event)

# pytest hook으로 자동 설정
@pytest.fixture(autouse=True)
def test_context(request):
    _context.start_test(request.node.name)
    yield
    if request.node.rep_call.failed:
        print(f"\n{_context.dump()}")
```

**Mock 호출 히스토리**
```python
class RecordingMock:
    """모든 호출을 기록하는 Mock wrapper"""

    def __init__(self, mock):
        self._mock = mock
        self._calls = []

    def __getattr__(self, name):
        attr = getattr(self._mock, name)
        if callable(attr):
            return self._recording_wrapper(name, attr)
        return attr

    def _recording_wrapper(self, name, method):
        @functools.wraps(method)
        def wrapper(*args, **kwargs):
            self._calls.append({
                'method': name,
                'args': args,
                'kwargs': kwargs,
                'time': time.time()
            })
            return method(*args, **kwargs)
        return wrapper

    def dump_calls(self):
        lines = ["Mock call history:"]
        for i, call in enumerate(self._calls, 1):
            args_str = ", ".join(repr(a) for a in call['args'])
            kwargs_str = ", ".join(f"{k}={v!r}" for k, v in call['kwargs'].items())
            all_args = ", ".join(filter(None, [args_str, kwargs_str]))
            lines.append(f"  {i}. {call['method']}({all_args})")
        return "\n".join(lines)

# 사용 예시
def test_with_recording_mock():
    listener = RecordingMock(Mock(spec=SniperListener))
    sniper = AuctionSniper("item-123", listener)

    # 시나리오 실행
    sniper.process(PriceMessage(1000, 98, "other"))
    sniper.process(CloseMessage())

    # 실패 시 호출 히스토리 출력
    assert sniper.state == SniperState.WON, \
        f"Unexpected state\n{listener.dump_calls()}"
```

**conftest.py에 전체 통합**
```python
# conftest.py
import pytest
from unittest.mock import Mock
import json

@pytest.fixture
def diagnostic_context():
    """진단 정보 수집 컨텍스트"""
    context = {
        'events': [],
        'mocks': {},
        'state_snapshots': []
    }

    def log(msg):
        context['events'].append(msg)

    def register_mock(name, mock):
        context['mocks'][name] = mock

    def snapshot_state(name, state):
        context['state_snapshots'].append((name, state))

    context['log'] = log
    context['register_mock'] = register_mock
    context['snapshot_state'] = snapshot_state

    yield context

    # 테스트 실패 시 전체 덤프
    if hasattr(pytest, '_current_test_failed') and pytest._current_test_failed:
        print("\n" + "=" * 50)
        print("DIAGNOSTIC DUMP")
        print("=" * 50)
        print(f"Events: {context['events']}")
        for name, mock in context['mocks'].items():
            print(f"\n{name} calls:")
            for call in mock.call_args_list:
                print(f"  {call}")
        for name, state in context['state_snapshots']:
            print(f"\n{name} state: {state}")
```

---

## 실패 메시지 설계 원칙

```
┌─────────────────────────────────────────────────────────┐
│               좋은 실패 메시지 체크리스트                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✓ 기대값과 실제값이 명확히 구분되는가?                  │
│                                                         │
│  ✓ 객체의 중요한 필드가 모두 보이는가?                   │
│                                                         │
│  ✓ 실패 맥락 (어떤 테스트, 어떤 시나리오)이 있는가?      │
│                                                         │
│  ✓ diff가 필요한 경우 diff를 보여주는가?                 │
│                                                         │
│  ✓ 이벤트 타임라인이 있는가? (비동기 테스트)             │
│                                                         │
│  ✓ mock 호출 히스토리가 있는가?                         │
│                                                         │
│  ✓ 메시지만 보고 원인을 추론할 수 있는가?                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 메시지 템플릿

**좋은 실패 메시지 구조**
```
Expected: {기대 상태/값}
Actual: {실제 상태/값}

Context:
  - Test: {테스트 이름}
  - Item: {관련 데이터}
  - Scenario: {실행된 시나리오}

Diff:
  {필드별 차이점}

Event Timeline:
  [0ms] {이벤트1}
  [10ms] {이벤트2}
  [25ms] {이벤트3}

Mock Call History:
  1. method1(arg1, arg2)
  2. method2(arg3)

Full State Dump:
  {객체 상태 전체}
```

---

## 요약

테스트 진단의 핵심:

1. **명확한 실패 메시지**: 기대값, 실제값, 맥락 포함
2. **PrintTo/__repr__**: 객체 출력 형식 정의
3. **Custom Matchers**: 의미 있는 실패 설명
4. **Diff 출력**: 복잡한 객체 비교 시 차이점 강조
5. **자동 컨텍스트 수집**: 이벤트 타임라인, mock 히스토리
6. **상태 덤프**: 실패 시 전체 상태 확인

좋은 진단 메시지는 **디버깅 시간을 90% 단축**한다. 테스트 실패 메시지에 투자하는 시간은 미래의 디버깅 시간으로 돌아온다.

---

## 다음 장 예고

다음 장에서는 **Advanced Topics**를 다룬다. 복잡한 테스트 시나리오, 비동기 테스트, 성능 테스트, 테스트 아키텍처 등 고급 주제를 살펴본다.
