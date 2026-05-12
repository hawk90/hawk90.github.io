---
title: "항목 30: 메모리 누수를 방지하려면 RAII를 사용하라"
date: 2026-05-10T19:00:00
description: "RAII — 자원 수명을 객체 수명에 묶기. 메모리·락·파일·소켓 어디든. C++의 가장 강력한 무기."
tags: [C++, RAII, Resource Management]
series: "Beautiful C++"
seriesOrder: 30
draft: false
---

## 왜 이 항목이 중요한가?

C 스타일 자원 관리:

```cpp
FILE* f = fopen(path, "r");
Buffer* b = new Buffer(1024);

if (!f) { delete b; return; }
if (read_failed(f, b)) {
    fclose(f); delete b; return;
}
// throw 발생하면? 어떤 게 누수?

fclose(f);
delete b;
```

문제: 각 자원에 대해 — **모든 빠져나가는 경로**에서 정리 코드 반복. early return, 예외, 새 분기 추가에 취약. 한 곳 빠뜨리면 누수 또는 이중 해제.

**RAII**(Resource Acquisition Is Initialization)가 답. 자원 수명을 **객체 수명에 묶음** — 생성자에서 acquire, 소멸자에서 release. 어떤 경로로 빠져나가도 컴파일러가 소멸자 자동 호출. 누수 불가능.

C++의 가장 강력한 idiom — **모든 자원(메모리·락·파일·소켓·GPU 핸들)** 에 적용.

## 핵심 내용

- **RAII**: 자원의 수명을 **객체의 수명**에 묶는다
- 생성자에서 획득, 소멸자에서 해제 → 예외·이른 반환·복잡한 흐름에서도 자동 정리
- C++의 핵심 자원 관리 도구: `std::unique_ptr`, `std::shared_ptr`, `std::lock_guard`, `std::fstream`...
- 새 자원 종류가 생기면 **새 RAII 클래스**를 만들어라 — `new`/`delete`, `lock`/`unlock`을 코드에 직접 쓰지 마라
- RAII는 **메모리뿐 아니라** 락, 파일, 소켓, GPU 핸들 등 모든 자원에 적용

## 비교 — 수동 해제 vs RAII

### Bad: 수동 정리

```cpp
void process(const char* path) {
    FILE* f = std::fopen(path, "r");
    Buffer* b = new Buffer(1024);

    if (!f) { delete b; return; }
    if (read_failed(f, b)) {
        std::fclose(f);
        delete b;
        return;
    }
    // throw 발생? 어떤 자원 누수?

    std::fclose(f);
    delete b;
}
```

각 `return` 경로에서 — 모든 자원 수동 정리. 추가 자원이 늘면 — 코드 폭발. 예외 던지면 누수 보장.

### Good: RAII

```cpp
struct FileCloser {
    void operator()(FILE* f) const { if (f) std::fclose(f); }
};
using FilePtr = std::unique_ptr<FILE, FileCloser>;

void process(const char* path) {
    FilePtr f{std::fopen(path, "r")};
    auto    b = std::make_unique<Buffer>(1024);

    if (!f) return;                          // f, b 자동 정리
    if (read_failed(f.get(), b.get())) return;     // 자동 정리

    // 정상/예외/이른 반환 모두 안전
}
```

함수가 어떻게 종료되든 — `~FilePtr`, `~unique_ptr<Buffer>`가 자동 호출. 누수 불가능.

## RAII의 두 가지 원리

### 1) 자원 acquire = 객체 초기화

```cpp
class FileWrapper {
    FILE* f_;
public:
    explicit FileWrapper(const char* path)
        : f_(std::fopen(path, "r")) {
        if (!f_) throw std::runtime_error("cannot open");
    }
    // ...
};

FileWrapper w("data.txt");      // open + (실패 시) throw
                                 //   ↑ 자원 acquire는 ctor가 책임
```

객체 생성 시점 — 자원이 즉시 acquire (또는 throw).

### 2) 객체 소멸 = 자원 release

```cpp
class FileWrapper {
    FILE* f_;
public:
    // ...
    ~FileWrapper() {
        if (f_) std::fclose(f_);     // 자원 release
    }
};

{
    FileWrapper w("data.txt");
    // ... 사용 ...
}     // ← scope 끝 → ~FileWrapper → fclose 자동
```

scope 떠나는 어떤 경로로도 — 소멸자 호출. 예외, return, 정상 종료 모두.

## 표준 RAII 도구

### std::unique_ptr — 단일 소유

```cpp
auto w = std::make_unique<Widget>(args);

w->method();             // 멤버 접근
Widget* raw = w.get();   // raw 포인터 (소유 안 함)

// scope 끝 → 자동 delete
```

- 메모리 오버헤드 0 (raw pointer 크기)
- delete를 한 번 호출 (이중 해제 불가)
- 이동 가능, 복사 불가

### std::shared_ptr — 공유 소유

```cpp
auto sp = std::make_shared<Widget>(args);
auto sp2 = sp;                              // refcount++

// 마지막 shared_ptr 소멸 시 자원 해제
```

- 참조 카운팅 (atomic)
- 메모리 오버헤드 (control block)
- 진짜 공유 의미일 때만 (항목 11 참고)

### std::lock_guard — 뮤텍스 잠금

```cpp
std::mutex mu;

void thread_safe_op() {
    std::lock_guard lock(mu);     // ctor: mu.lock()
    // critical section
}     // dtor: mu.unlock() 자동
```

예외 던져도 — unlock 보장.

### std::scoped_lock (C++17) — 다중 뮤텍스

```cpp
void transfer(Account& a, Account& b) {
    std::scoped_lock lock(a.mu, b.mu);     // deadlock-free 다중 락
    // ...
}
```

여러 뮤텍스 동시 잠금 — deadlock 회피 알고리즘 내장.

### std::fstream — 파일

```cpp
{
    std::ofstream out("data.txt");
    out << "Hello";
}     // scope 끝 → 자동 close + flush
```

`fopen`/`fclose` 직접 호출 X.

### std::thread / std::jthread (C++20)

```cpp
{
    std::jthread t([]{ work(); });
    // ...
}     // scope 끝 → t.join() 자동 (C++20 std::jthread)
```

`std::thread`는 — 명시적 `join()` 필요 (아니면 terminate). `std::jthread`(C++20)는 자동.

## 사용자 정의 RAII

표준에 없는 자원 — 직접 작성.

```cpp
class GLBuffer {
    GLuint id_ = 0;
public:
    GLBuffer() {
        glGenBuffers(1, &id_);
        if (id_ == 0) throw std::runtime_error("buffer creation failed");
    }
    ~GLBuffer() { if (id_) glDeleteBuffers(1, &id_); }

    // 복사 금지, 이동 OK
    GLBuffer(const GLBuffer&)            = delete;
    GLBuffer& operator=(const GLBuffer&) = delete;

    GLBuffer(GLBuffer&& other) noexcept : id_(std::exchange(other.id_, 0)) {}
    GLBuffer& operator=(GLBuffer&& other) noexcept {
        if (this != &other) {
            if (id_) glDeleteBuffers(1, &id_);
            id_ = std::exchange(other.id_, 0);
        }
        return *this;
    }

    GLuint id() const { return id_; }
};
```

체크리스트:
- ctor에서 acquire (실패 시 throw)
- dtor에서 release (noexcept)
- 복사 정책 명시 (보통 delete)
- 이동 정책 명시 (보통 default 또는 std::exchange)
- raw 자원 접근자 (`get()`, `id()` 등)

## unique_ptr + custom deleter — 더 짧게

```cpp
auto deleter = [](FILE* f) { if (f) std::fclose(f); };
using FilePtr = std::unique_ptr<FILE, decltype(deleter)>;

FilePtr open(const char* path) {
    FilePtr f{std::fopen(path, "r"), deleter};
    if (!f) throw std::runtime_error("open failed");
    return f;
}
```

별도 클래스 정의 없이 — `unique_ptr` 자체가 RAII. 짧은 래핑에 적합.

## RAII로 가두는 흔한 자원

| 자원 | RAII 도구 |
| --- | --- |
| 동적 메모리 | `unique_ptr`, `shared_ptr`, 컨테이너 |
| 뮤텍스 | `lock_guard`, `scoped_lock`, `unique_lock` |
| 파일 | `fstream` (자동 close) |
| 소켓 | 사용자 정의 wrapper |
| GPU 자원 (텍스처, 버퍼) | 사용자 정의 wrapper |
| 데이터베이스 연결 | 사용자 정의 wrapper |
| 스레드 | `std::jthread` (C++20) 또는 사용자 정의 |
| 임시 디렉터리 | 사용자 정의 wrapper |
| trace / 측정 | RAII timer |

**규칙**: 자원이 있으면 — RAII wrapper 만들기. raw 자원을 함수 본문에 두지 않음.

## RAII timer 패턴

```cpp
class ScopedTimer {
    std::chrono::steady_clock::time_point start_;
    std::string label_;
public:
    explicit ScopedTimer(std::string label)
        : start_(std::chrono::steady_clock::now())
        , label_(std::move(label)) {}
    
    ~ScopedTimer() {
        auto elapsed = std::chrono::steady_clock::now() - start_;
        std::cout << label_ << ": " 
                  << std::chrono::duration_cast<std::chrono::microseconds>(elapsed).count()
                  << "µs\n";
    }
};

void operation() {
    ScopedTimer t{"operation"};
    // ... 작업 ...
}     // 자동 시간 측정 출력
```

RAII로 — 시간 측정도 안전하게 (예외에도).

## 트랜잭션 RAII

```cpp
class DBTransaction {
    Connection& conn_;
    bool committed_ = false;
public:
    explicit DBTransaction(Connection& c) : conn_(c) { conn_.begin(); }
    
    ~DBTransaction() {
        if (!committed_) conn_.rollback();     // 명시적 commit 안 했으면 자동 rollback
    }
    
    void commit() {
        conn_.commit();
        committed_ = true;
    }
};

void update() {
    DBTransaction tx{conn};
    
    // ... 변경 ...
    
    tx.commit();     // 성공 — commit
    // 예외 발생 시 — ~DBTransaction → rollback 자동
}
```

scope 기반 트랜잭션 — 데이터베이스, 게임 상태, 임시 파일 등.

## 함정 — 정리 순서

```cpp
{
    Lock lock(mu);              // 1. acquire mu
    Resource r;                  // 2. acquire r
    // ...
}     // 3. ~r (release r)
      // 4. ~lock (release mu)
```

C++ — 생성 역순으로 소멸. 자원 acquire 순서가 release 역순. 의존성 있는 자원 (락이 먼저, 자원이 다음)에 자연스러움.

## 함정 — RAII 객체 무시

```cpp
std::lock_guard(mu);            // ⚠️ 임시 객체 — 즉시 소멸
                                 //    의도: scoped lock
                                 //    실제: 한 줄에서 lock + unlock
```

이름 없는 임시는 — 즉시 소멸. RAII는 **이름 있는 변수**여야 함.

```cpp
std::lock_guard lock(mu);       // ✅ 이름 있음 — scope 끝까지 유지
```

C++17부터 `[[nodiscard]]`로 표준 라이브러리가 일부 검출 (`std::lock_guard`는 아직 안 됨).

## 함정 — 이동 후 raw 접근

```cpp
auto p1 = std::make_unique<Widget>();
auto p2 = std::move(p1);

p1->method();      // ⚠️ p1은 빈 unique_ptr — nullptr 역참조
```

이동된 객체 — 빈 상태(empty). 사용 X.

## 모던 변형 — std::scope_exit (C++ Library Fundamentals TS)

```cpp
auto cleanup = std::scope_exit([&]{ release_resource(r); });
```

명시적 RAII 클래스 없이 — scope 종료 시 람다 호출. 표준 채택 진행 중.

또는 third-party:

```cpp
auto cleanup = absl::Cleanup([&]{ release(); });
```

## 함정 — 소멸자 예외

```cpp
class Bad {
public:
    ~Bad() {
        if (cond) throw std::runtime_error("...");     // ⚠️ 위험
    }
};
```

예외 unwinding 중 소멸자가 또 throw → `std::terminate`. **소멸자는 noexcept**.

```cpp
~Bad() noexcept {
    try {
        risky_cleanup();
    } catch (...) {
        log_error("cleanup failed");     // 삼키기
    }
}
```

## 함정 — 자원 두 곳에서 관리

```cpp
class Widget {
    Resource* r_;
public:
    Widget() : r_(new Resource) {}
    ~Widget() { delete r_; }
    // 복사 정의 안 함 — 자동 복사 → 이중 해제
};
```

raw pointer + 사용자 정의 dtor — **반드시 복사·이동 명시** (항목 7, 11). 또는 `unique_ptr<Resource>` 멤버로 (rule of zero).

## C++20 — `[[nodiscard]]` for RAII

```cpp
struct [[nodiscard]] Lock {
    Lock();
    ~Lock();
};

void f() {
    Lock{};     // ⚠️ 컴파일 경고 — 결과 무시
                //     lock_guard 의도였다면 이름 필요
}
```

`[[nodiscard]]` 클래스 — 임시로 만들면 경고. RAII 사용자 보호.

## 실무 가이드 — 결정 트리

```
자원 관리 — 어떻게?
├── 메모리 → unique_ptr / shared_ptr / 컨테이너
├── 뮤텍스 → lock_guard / scoped_lock / unique_lock
├── 파일 → std::fstream
├── 표준에 없음 → 사용자 정의 RAII
├── 짧은 wrapping → unique_ptr + custom deleter
└── scope 종료 시 콜백 → scope_exit (third-party)
```

## 실무 가이드 — 체크리스트

- [ ] 모든 raw 자원이 RAII 래핑됐는가?
- [ ] 사용자 정의 RAII는 rule of 5 명시?
- [ ] 소멸자 `noexcept`?
- [ ] 표준 도구 우선 (`unique_ptr` 등)?
- [ ] 임시 객체로 RAII 사용 안 함 (이름 있는 변수)?
- [ ] 트랜잭션·timer 등도 RAII로?

## 정리

C++에서 자원 관리는 **객체 수명에 위임**하는 것이 정답이다. 생/소멸자에 한 번 책임을 적어두면, 호출부의 모든 흐름에서 정리가 자동으로 보장된다 — 이것이 C++이 가진 **가장 강력한 무기**다.

핵심:
- **모든 자원** (메모리, 락, 파일, 소켓, 트랜잭션, timer) — RAII
- **표준 도구 우선** — `unique_ptr`, `shared_ptr`, `lock_guard`, `fstream`
- **사용자 정의** — rule of 5, noexcept dtor
- **raw 자원 코드에 직접 X** — 항상 wrapping

C++ = RAII. 이게 — Java/Python의 try-finally보다 강력한 이유.

## 관련 항목

- [항목 7: 지저분한 struct 캡슐화](/blog/programming/beautiful-cpp/item07-encapsulate-messy-structs) — RAII wrapper 작성
- [항목 13: 원시 포인터 X](/blog/programming/beautiful-cpp/item13-never-transfer-ownership-via-raw-pointer) — 소유권 타입으로
- [Effective C++ 항목 13: RAII](/blog/programming/effective-cpp/item13-use-objects-to-manage-resources) — RAII 심층
