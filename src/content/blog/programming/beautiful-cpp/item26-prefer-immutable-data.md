---
title: "항목 26: 가변 데이터보다는 불변 데이터를 택하라"
date: 2026-05-10T15:00:00
description: "불변 데이터 — 공짜 동시성, 안정적 추론, 테스트 용이성. 값 객체와 함수형 스타일."
tags: [C++, Immutability, const]
series: "Beautiful C++"
seriesOrder: 26
draft: false
---

## 왜 이 항목이 중요한가?

가변 상태가 많은 코드는 — 추론이 어렵다. "이 변수가 어디서 변하나? 다른 함수가 부른 다음에도 같은 값인가? 다른 스레드는?"

```cpp
Point p{1, 2};
process(p);                   // p 변하나?
notify_observers(p);
update_visualization(p);       // 여전히 {1, 2}?
```

각 함수 호출 후 `p`가 어떤 상태인지 — 함수 시그니처만 보고 알 수 없다 (`const Point&`가 아니라면).

**불변 데이터**는 이 모든 질문에 답을 준다 — "변하지 않습니다". 결과:
- 추론 단순
- 멀티스레드에서 락 없이 공유 가능
- 테스트가 쉬움 (상태 변화 없음)
- 캐시·메모이제이션 자연스러움

이 항목은 — 불변 데이터를 기본으로, 가변은 정말 필요할 때만의 원칙.

## 핵심 내용

- 변하지 않는 데이터는 **추론·테스트·동시성**에서 모두 유리
- 변경 가능 멤버는 모두 **상태 전이**의 출처 — 줄일수록 버그가 줄어든다
- 가능한 한 `const` / `constexpr`로 선언하고, 멤버 함수도 기본을 `const`로
- 멀티스레드에서 **불변 객체는 공짜로 thread-safe**
- "수정"이 필요하면 **새 객체로** (값 의미론, 함수형 스타일)

## 비교 — 가변 vs 불변 값 객체

### Bad: 가변 멤버 가득

```cpp
struct Point {
    int x, y;
    void set(int nx, int ny) { x = nx; y = ny; }
};

Point p{1, 2};
modify1(p);
modify2(p);
log(p);     // p가 지금 어떤 상태?
```

문제:
- 모든 함수가 잠재적으로 `p` 변경
- 추적·디버깅 어려움
- 멀티스레드 락 필요

### Good: 불변 값 객체

```cpp
class Point {
    const int x_;
    const int y_;
public:
    constexpr Point(int x, int y) : x_(x), y_(y) {}
    constexpr int x() const { return x_; }
    constexpr int y() const { return y_; }
    
    // "변경"은 새 인스턴스 생성
    constexpr Point translated(int dx, int dy) const {
        return Point{x_ + dx, y_ + dy};
    }
};

const Point origin{0, 0};
Point p2 = origin.translated(5, 3);      // 새 객체

// 멀티스레드 공유도 안전
std::thread t1([&]() { use(origin); });    // 락 X
std::thread t2([&]() { use(origin); });
```

각 객체가 — 한 번 만들면 변경 X. "변경"은 새 객체 생성.

## 불변의 4가지 이점

### 1) 추론 단순

```cpp
const Config cfg = load_config();
process(cfg);
analyze(cfg);
report(cfg);
// 모든 호출 후 cfg는 동일 — 추적 불필요
```

const 객체를 받는 함수는 — 그 객체의 상태에 의존만 하고 변경 X. 사이드 이펙트 줄어듦.

### 2) 공짜 동시성

```cpp
const auto& shared = make_shared_data();

std::thread t1([&]() { use(shared); });    // 락 없이
std::thread t2([&]() { use(shared); });    // 락 없이
std::thread t3([&]() { use(shared); });    // 락 없이
```

불변 객체는 — 여러 스레드가 동시 읽기 안전. 락·atomic 불필요. **shared_ptr<const T>** 패턴.

### 3) 테스트 용이

```cpp
TEST(PointTest, Translated) {
    const Point p{1, 2};
    auto moved = p.translated(3, 4);
    
    EXPECT_EQ(p.x(), 1);              // 원본 변경 없음
    EXPECT_EQ(p.y(), 2);
    EXPECT_EQ(moved.x(), 4);
    EXPECT_EQ(moved.y(), 6);
}
```

상태 변화 없음 → setup 단순, 테스트 격리.

### 4) 메모이제이션 / 캐싱

```cpp
const auto result = expensive_compute(input);
// input이 불변이면 — 같은 input에 같은 result, 캐싱 안전
```

input이 가변이면 — 캐시 무효화 로직 필요. 불변이면 자연.

## "수정" — 새 객체 생성 패턴

함수형 언어 스타일:

```cpp
class Bank {
    const std::map<AccountId, Money> balances_;
public:
    Bank()                                              = default;
    Bank(const Bank&)                                   = default;
    
    // "변경"은 새 Bank 반환
    Bank deposit(AccountId id, Money amount) const {
        auto new_balances = balances_;
        new_balances[id] += amount;
        return Bank{std::move(new_balances)};
    }
    
    Bank transfer(AccountId from, AccountId to, Money amount) const {
        return deposit(to, amount).withdraw(from, amount);
    }
    
private:
    explicit Bank(std::map<AccountId, Money> b) : balances_(std::move(b)) {}
};

const Bank b1;
auto b2 = b1.deposit(AccountId{1}, Money{100});
// b1은 변경 없음, b2는 새 상태
```

각 작업이 — 새 상태 객체. 옛 상태도 그대로 — 트랜잭션·undo 자연.

**비용**: 복사. 큰 객체면 — persistent data structures(`im::Vector`, `immer` 라이브러리)로 구조 공유.

## const 멤버 함수 — 기본

```cpp
class Widget {
    int data_;
public:
    // 변경 안 하는 메서드는 const
    int value() const { return data_; }
    bool is_ready() const;
    std::string format() const;
    
    // 변경하는 메서드만 non-const
    void update(int v) { data_ = v; }
};
```

const-correctness는 — 컴파일러가 검증하는 불변성. 모든 읽기 메서드를 const로.

## 함정 — const 멤버 + 복사 대입

```cpp
class C {
    const int id_;       // const 멤버
public:
    C(int id) : id_(id) {}
};

C a{1};
C b{2};
a = b;      // ❌ 컴파일 에러 — const 멤버는 대입 X
```

`const` 멤버는 — 복사 대입 자동 생성 차단. 의도된 디자인이면 OK (값 의미론 + 새 객체 패턴). 아니면 const 빼기.

```cpp
class C {
    int id_;            // const X
public:
    C(int id) : id_(id) {}
    int id() const { return id_; }     // 읽기만 노출
    // setter 없음 — 사실상 불변
};
```

`const` 멤버 없이도 — public setter 안 두면 외부에서 변경 X.

## const + thread safety

```cpp
class Cache {
    mutable std::mutex mu_;
    mutable std::map<Key, Value> cache_;
public:
    Value get(Key k) const {
        std::lock_guard lock(mu_);
        if (auto it = cache_.find(k); it != cache_.end()) {
            return it->second;
        }
        return cache_[k] = compute(k);
    }
};
```

`const` 메서드인데 내부 cache 변경 — `mutable` 멤버. 항목 16. 사용자 관점에선 여전히 불변(외부 관찰 가능 상태 안 바뀜).

## std::shared_ptr<const T> 패턴

```cpp
class ConfigStore {
    std::shared_ptr<const Config> current_;
    mutable std::mutex mu_;
public:
    std::shared_ptr<const Config> get() const {
        std::lock_guard lock(mu_);
        return current_;            // 복사 (refcount 증가)
    }
    
    void update(std::shared_ptr<const Config> new_cfg) {
        std::lock_guard lock(mu_);
        current_ = std::move(new_cfg);
    }
};
```

immutable Config를 — 여러 스레드가 atomic하게 교체. 읽기는 락 없이 (RCU-style 가능).

C++20 `std::atomic<std::shared_ptr<T>>`로 더 깔끔.

## 함정 — 무거운 객체의 복사

```cpp
class LargeImmutable {
    std::vector<int> data_;      // 큰 데이터
public:
    LargeImmutable modified() const {
        auto copy = *this;       // 전체 복사 — 비쌈
        copy.data_.push_back(42);
        return copy;
    }
};
```

매번 전체 복사 — 큰 객체에 비효율. 해결:
- **이동 의미론** — `LargeImmutable&&` 받기
- **Persistent data structures** — 구조 공유 (Clojure-style)
- **Copy-on-write** — `std::shared_ptr<const T>` 패턴

```cpp
class ImmutableList {
    std::shared_ptr<const std::vector<int>> data_;
public:
    ImmutableList append(int x) const {
        auto new_data = std::make_shared<std::vector<int>>(*data_);
        new_data->push_back(x);
        return ImmutableList{new_data};
    }
};
```

## 함정 — 불변 강제 vs 약속

```cpp
class Point {
    int x_, y_;
public:
    int x() const { return x_; }
    int y() const { return y_; }
    // setter 없음 — "외부에서 변경 X" 약속
};

Point p{1, 2};
const_cast<Point&>(p).x_ = 100;     // ⚠️ 약속 깨기
```

`const`만으로는 — 의도적 우회를 막지 못함. 진짜 불변이 필요하면 `const` 멤버 + 새 객체 패턴.

## 함수형 스타일 — `std::ranges` (C++20)

```cpp
auto result = data
    | std::views::filter([](int x) { return x > 0; })
    | std::views::transform([](int x) { return x * 2; })
    | std::ranges::to<std::vector>();

// data는 변경 안 됨
```

ranges — 입력을 변경하지 않고 새 view/컨테이너. 함수형 파이프라인.

## 불변 vs 가변 — 결정 기준

```
이 객체가 시간에 따라 변하나?
├── 절대 안 변함 (수학 객체, 좌표 등) → 불변 (const 멤버)
├── 만들 때만 변함, 그 후 안 변함 → const after construction
├── 빈번한 변경 (게임 상태, 큐) → 가변, 명시적 mutation API
└── 동시성·트랜잭션 필요 → 불변 + 새 객체 패턴
```

## C++20 const view types

```cpp
std::span<const int> read_only_view(data);    // 불변 view
std::string_view sv = some_string;            // 문자열 불변 view
```

view 타입으로 — 불변 보장 + 무복사.

## 표준 라이브러리의 불변 — std::string의 SSO

```cpp
const std::string greeting = "Hello";
// greeting은 변경 X — 컴파일러가 SSO buffer를 static에 두거나 .rodata에 둘 수도
```

`const` 변수는 — 컴파일러 최적화 기회 추가.

## 실무 가이드 — 결정

```
이 데이터의 수명 주기는?
├── 한 번 만들면 안 변함 → const 멤버 + 새 객체 메서드
├── 만든 후 외부에서 안 변함 → const after construction
├── 자주 변경 → 가변, 명시적 mutation API
└── 멀티스레드 공유 → 불변 + shared_ptr<const T>
```

## 실무 가이드 — 체크리스트

- [ ] 변경 안 하는 메서드는 모두 `const`?
- [ ] 멤버 변수에 `const` 적극 사용?
- [ ] setter 양산 X — 불변이 가능한지 자문?
- [ ] 멀티스레드 공유 객체는 const?
- [ ] "변경"이 의미 있는 곳만 가변?
- [ ] 큰 객체는 이동/COW로 복사 비용 줄임?

## 정리

불변 데이터는 **공짜 동시성, 안정적 추론, 테스트 용이성**을 준다. 변경이 정말 필요한 곳만 가변으로 두고, 나머지는 `const`로 잠가라.

도구 사다리:
1. **`const` 멤버 함수** — 읽기만 보장 (가장 기본)
2. **`const` 변수** — 변경 X
3. **`const` 멤버** — 객체 내부 불변
4. **새 객체 메서드** (`translated()` 등) — 함수형 변경
5. **`shared_ptr<const T>`** — 멀티스레드 immutable 공유

## 관련 항목

- [항목 11: 명시적 공유 최소화](/blog/programming/beautiful-cpp/item11-minimize-explicit-data-sharing) — 불변이 공유의 답
- [항목 16: const 캐스트 X](/blog/programming/beautiful-cpp/item16-dont-cast-away-const) — const 약속
- [항목 22: constexpr](/blog/programming/beautiful-cpp/item22-use-constexpr-for-compile-time) — 컴파일 타임 불변
