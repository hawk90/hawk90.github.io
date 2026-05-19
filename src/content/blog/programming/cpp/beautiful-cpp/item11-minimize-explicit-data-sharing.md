---
title: "항목 11: 쓰기 가능한 데이터의 명시적 공유는 최소화하라"
date: 2026-05-05T11:00:00
description: "공유는 읽기에만 안전 — 가변 상태 공유가 만드는 동시성·소유권·재진입 문제와 그 대안."
tags: [C++, Concurrency, Ownership]
series: "Beautiful C++"
seriesOrder: 11
draft: true
---

## 왜 이 항목이 중요한가?

전역 변수, 싱글톤, 외부에서 받은 raw pointer 멤버 — 이 모든 게 "**같은 메모리를 여러 곳에서 수정**"하는 패턴이다. 단일 스레드 시대엔 잠재적 위험, 멀티스레드 시대엔 즉시 폭탄.

공유 가변 상태는:
- **데이터 레이스** — 두 스레드가 동시 수정 → UB
- **재진입성** — 콜백 안에서 같은 데이터를 수정 → 미묘한 버그
- **소유권 불명** — 누가 정리하나, 라이프타임 누가 책임지나
- **추적 어려움** — 어디서 변경됐는지 디버깅 지옥

**원칙**: 가변 데이터는 **값 또는 단일 소유자**로. 공유는 **읽기 전용**일 때만 안전.

## 핵심 내용

- 여러 곳에서 **수정 가능한 같은 데이터**를 가리키면 동시성·재진입·소유권 문제가 폭발
- 공유는 **읽기 전용일 때만** 안전 (`const` 참조, `shared_ptr<const T>`)
- 쓰기가 필요한 데이터는 가능하면 **값으로 전달**하거나 **단일 소유자**(`unique_ptr`)에 묶어라
- 공유가 꼭 필요하다면 **동기화 메커니즘과 함께** 의식적으로

## 비교 — 명시적 공유 vs 값/단일 소유

### Bad: 두 객체가 같은 가변 데이터를 공유

```cpp
struct Counter {
    int* count_;
    Counter(int* p) : count_(p) {}
    void inc() { ++*count_; }
};

int shared = 0;
Counter a(&shared);
Counter b(&shared);
// a.inc()와 b.inc()가 섞이면 누가 무엇을 했는지 불명확
// 두 스레드가 동시에 inc() → race
// shared 라이프타임 누가 책임? a와 b 중 누가 먼저 소멸?
```

문제:
- a, b 둘 다 shared를 수정 — 누구의 책임?
- shared의 라이프타임이 a, b보다 짧으면 dangling
- 멀티스레드면 data race

### Good: 값 소유 + 명시적 인터페이스

```cpp
class Counter {
    int count_ = 0;
public:
    void inc() { ++count_; }
    int  get() const { return count_; }
};

Counter a, b;        // 각자 자기 데이터
a.inc();
b.inc();
// 명확 — 각자 자기 상태
```

각 객체가 자기 상태 소유 — 다른 객체에 영향 없음.

### Good: 읽기 전용 공유

```cpp
auto cfg = std::make_shared<const Config>(load_config());

void worker(std::shared_ptr<const Config> c) {
    // c를 읽기만 — 어떤 스레드든 안전
}

std::thread t1(worker, cfg);
std::thread t2(worker, cfg);
```

`shared_ptr<const T>` — 여러 스레드가 공유 가능, 변경 불가. **immutable 데이터의 공유**는 안전.

## 가변 공유가 정말 필요한 경우 — 동기화 강제

```cpp
class SharedCounter {
    mutable std::mutex  mu_;
    int                 count_ = 0;
public:
    void inc() {
        std::lock_guard lock(mu_);
        ++count_;
    }
    int get() const {
        std::lock_guard lock(mu_);
        return count_;
    }
};

auto shared = std::make_shared<SharedCounter>();
```

또는 atomic:

```cpp
class SharedCounter {
    std::atomic<int> count_ = 0;
public:
    void inc() { count_.fetch_add(1, std::memory_order_relaxed); }
    int  get() const { return count_.load(std::memory_order_relaxed); }
};
```

**공유를 허용하면 동기화도 함께** — 둘 중 하나 빠지면 race.

## 함정 — raw pointer 멤버

```cpp
class Widget {
    Database* db_;     // ⚠️ 누가 소유? 라이프타임?
public:
    explicit Widget(Database* db) : db_(db) {}
};

void use() {
    Database db;
    Widget w(&db);
    return;     // db 소멸 → w.db_ dangling
}
```

raw pointer가 멤버에 있으면 — 라이프타임 의존성 불명확. 사용자가 db를 먼저 destroy하면 crash.

해결:

```cpp
// 옵션 1: Widget이 소유
class Widget {
    std::unique_ptr<Database> db_;
public:
    Widget() : db_(std::make_unique<Database>()) {}
};

// 옵션 2: 공유 소유
class Widget {
    std::shared_ptr<Database> db_;
public:
    explicit Widget(std::shared_ptr<Database> db) : db_(std::move(db)) {}
};

// 옵션 3: 의식적 비-소유 + 라이프타임 보장 (계약)
class Widget {
    Database& db_;     // 참조 멤버 — Widget보다 오래 살아야 (사용자 책임)
public:
    explicit Widget(Database& db) : db_(db) {}
};
```

각 옵션의 의도가 시그니처에 드러남.

## 함정 — 콜백을 통한 암묵적 공유

```cpp
class Window {
    std::function<void()> on_click_;
public:
    void setOnClick(std::function<void()> cb) { on_click_ = std::move(cb); }
};

Widget w;
window.setOnClick([&w]() { w.update(); });    // ⚠️ w 라이프타임 < window?
```

람다가 `w`를 참조 캡처 — `w`가 사라지면 콜백이 dangling reference 사용. 미묘한 use-after-free.

해결:

```cpp
auto w = std::make_shared<Widget>();
window.setOnClick([w]() { w->update(); });    // shared_ptr 캡처 — 라이프타임 보장
```

또는 weak_ptr로 cycle 방지:

```cpp
auto w = std::make_shared<Widget>();
std::weak_ptr<Widget> weak_w = w;
window.setOnClick([weak_w]() {
    if (auto w = weak_w.lock()) w->update();
});
```

## 전역 상태 — 가장 큰 공유

```cpp
// Bad: 전역
int global_counter = 0;

void worker() {
    ++global_counter;     // race
}
```

전역 가변 상태는 — **테스트하기 어렵고, 동시성에 취약하고, 라이프타임이 정적**. 대안:

```cpp
// 의존성 주입
class Service {
    Counter& counter_;
public:
    explicit Service(Counter& c) : counter_(c) {}
    void work() { counter_.inc(); }
};

// 또는 함수 매개변수
void worker(Counter& c) {
    c.inc();
}
```

상태를 **명시적으로** 받아들임 — 추적 가능, 테스트 가능.

## 싱글톤 — 공유의 모범 사례?

```cpp
class Logger {
public:
    static Logger& instance() {
        static Logger l;
        return l;
    }
    void log(const std::string& msg);    // 멀티 스레드 호출 시?
};
```

싱글톤은 글로벌 상태의 우회. **읽기 전용**(상수 데이터)이면 OK, **쓰기 가능**(로깅, 캐시)이면 동기화 필수 + 테스트 어려움.

대안:
- **의존성 주입** — Logger를 생성자로 받기
- **컨텍스트 객체** — 함수 매개변수
- **thread_local 싱글톤** — 스레드별 상태

## 함정 — 컨테이너 + 외부 reference

```cpp
std::vector<Widget> widgets;
Widget& first = widgets[0];      // ⚠️ widgets.push_back 호출 시 realloc → dangling
widgets.push_back(/* ... */);
first.doSomething();             // crash
```

컨테이너의 가변성 — 내부 reference 노출 위험. iterator/reference invalidation 규칙 의식.

## 모던 변형 — `std::shared_ptr<const T>` 패턴

```cpp
class Config {
    std::string host;
    int port;
public:
    // ... immutable ...
};

class ConfigStore {
    std::shared_ptr<const Config> current_;
    mutable std::mutex mu_;
public:
    std::shared_ptr<const Config> get() const {
        std::lock_guard lock(mu_);
        return current_;        // 복사 (참조 카운트만 증가)
    }
    void update(std::shared_ptr<const Config> new_cfg) {
        std::lock_guard lock(mu_);
        current_ = std::move(new_cfg);     // 포인터 교체 — atomic-like
    }
};

// 사용
auto cfg = store.get();         // 스레드 안전 — 자기 스냅샷
cfg->host;                       // const라 안전
```

**RCU-like 패턴** — 읽기는 무동기화, 쓰기만 atomic 교체. `std::atomic<std::shared_ptr<T>>` (C++20)이 더 깔끔.

## 모던 변형 — `std::atomic_shared_ptr` (C++20)

```cpp
std::atomic<std::shared_ptr<const Config>> current_cfg;

// 어디서든 atomic 로드
auto cfg = current_cfg.load();

// atomic 교체
current_cfg.store(std::make_shared<const Config>(new_config));
```

mutex 없이 immutable 데이터를 공유.

## 실무 가이드 — 결정 트리

```
이 데이터를 여러 곳에서 사용해야 하나?
├── 읽기만 → const 참조 / shared_ptr<const T> — 안전
├── 한 곳만 쓰기, 다른 곳들은 읽기 → mutex/atomic 또는 메시지 패싱
├── 여러 곳에서 쓰기 → 디자인 재검토 — 정말 공유가 답인가?
│   ├── 합칠 수 있나 (단일 소유자 + 메서드 호출)?
│   ├── 값으로 복사 가능한가?
│   └── 정말 공유 + 동기화 (mutex/atomic)
└── 라이프타임 불명확 → unique_ptr (단일) / shared_ptr (공유)
```

## 실무 가이드 — 체크리스트

- [ ] raw pointer 멤버가 있는가? — 소유 의도 명확? unique_ptr로?
- [ ] 전역 가변 상태? — 의존성 주입으로 대체?
- [ ] 콜백/람다가 외부 객체 참조 캡처? — 라이프타임 보장?
- [ ] 공유 가변 데이터에 mutex/atomic?
- [ ] 읽기 전용으로 만들 수 있는 데이터에 `const`?
- [ ] 컨테이너 reference invalidation 의식?

## 정리

공유는 **읽기에 한해** 안전하다. 가변 상태의 명시적 공유는 마지막 수단으로 남기고, 가능한 한 **값과 단일 소유**로 설계하라.

대안 사다리:
1. **값** — 각자 복사본 (가장 안전)
2. **단일 소유 + 메서드 호출** — `unique_ptr` 또는 멤버
3. **읽기 전용 공유** — `const T&`, `shared_ptr<const T>`
4. **공유 + 동기화** — `mutex`, `atomic` (마지막 수단)

## 관련 항목

- [항목 13: 원시 포인터로 소유권 이전 X](/blog/programming/cpp/beautiful-cpp/item13-never-transfer-ownership-via-raw-pointer) — 소유권의 표현
- [항목 14: 싱글톤 피하기](/blog/programming/cpp/beautiful-cpp/item14-avoid-singletons) — 전역 공유의 안티패턴
- [항목 26: 불변 데이터 선호](/blog/programming/cpp/beautiful-cpp/item26-prefer-immutable-data) — 공유가 안전한 영역
