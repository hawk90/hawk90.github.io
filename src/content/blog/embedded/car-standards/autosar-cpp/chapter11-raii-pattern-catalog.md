---
title: "Ch 11: RAII 패턴 카탈로그 — 50개 실전 패턴"
date: 2025-09-15T12:00:00
description: "C++ RAII의 모든 실전 패턴. ScopedLock, FileHandle, Transaction, Snapshot, Guard, Pool, Reservation 등 50가지 패턴을 코드로."
tags: [autosar, cpp, raii, scoped, lock-guard, transaction, smart-pointer, pattern]
series: "AUTOSAR C++14"
seriesOrder: 11
draft: false
---

5장에서 RAII의 *기본 패턴*을 봤다. 이 장은 *실전에서 쓰는 RAII 패턴 카탈로그* 50개를 본다. 각 패턴은 *문제 → 해법 → 코드 → 함정* 구조로. *AUTOSAR C++14의 핵심 가치*가 어떻게 *구체적 코드*로 표현되는지 본다.

## 패턴 분류

| 카테고리 | 패턴 수 | 설명 |
|---------|--------|------|
| Acquisition Patterns | 10 | 자원 획득·해제 표준 패턴 |
| Lock Patterns | 8 | 동시성 critical section |
| Transaction Patterns | 6 | 실패 시 rollback |
| Scope Guards | 7 | 임시 상태 변경 + 자동 복귀 |
| Memory Patterns | 6 | 메모리 관리 |
| Pool/Reservation Patterns | 5 | 풀에서 자원 빌리기 |
| Specialized Patterns | 8 | 특수 자원 (FD, ID, GPU 등) |

## Acquisition Patterns

### Pattern 1 — ScopedHandle (기본 RAII)

```cpp
class FileHandle {
public:
    explicit FileHandle(const std::string &path, const std::string &mode = "r")
        : fp_(std::fopen(path.c_str(), mode.c_str())) {
        if (!fp_) throw std::runtime_error("open: " + path);
    }
    ~FileHandle() noexcept { if (fp_) std::fclose(fp_); }

    FileHandle(const FileHandle &) = delete;
    FileHandle &operator=(const FileHandle &) = delete;
    FileHandle(FileHandle &&o) noexcept : fp_(o.fp_) { o.fp_ = nullptr; }
    FileHandle &operator=(FileHandle &&o) noexcept {
        if (this != &o) {
            if (fp_) std::fclose(fp_);
            fp_ = o.fp_; o.fp_ = nullptr;
        }
        return *this;
    }

    std::FILE *get() const noexcept { return fp_; }

private:
    std::FILE *fp_;
};
```

함정:
- Copy를 *deleted*로. file handle 공유는 *bug*.
- `~` 안에서 *예외 던지지 마라*. `noexcept` 명시.
- Move 후 `nullptr` 설정 — double close 방지.

### Pattern 2 — Unique Resource (template)

여러 자원 타입에 동일 패턴을 적용.

```cpp
template <typename T, T null_value, typename Deleter>
class UniqueResource {
public:
    explicit UniqueResource(T r = null_value) noexcept : r_(r) {}
    ~UniqueResource() noexcept { reset(); }

    UniqueResource(const UniqueResource &) = delete;
    UniqueResource &operator=(const UniqueResource &) = delete;

    UniqueResource(UniqueResource &&o) noexcept : r_(o.release()) {}
    UniqueResource &operator=(UniqueResource &&o) noexcept {
        if (this != &o) {
            reset(o.release());
        }
        return *this;
    }

    T get() const noexcept { return r_; }
    T release() noexcept { T t = r_; r_ = null_value; return t; }
    void reset(T r = null_value) noexcept {
        if (r_ != null_value) Deleter{}(r_);
        r_ = r;
    }
    explicit operator bool() const noexcept { return r_ != null_value; }

private:
    T r_;
};

// 사용
struct FdDeleter { void operator()(int fd) const { ::close(fd); } };
using ScopedFd = UniqueResource<int, -1, FdDeleter>;

ScopedFd fd(::open("/tmp/data", O_RDONLY));
if (!fd) return -1;
::read(fd.get(), buf, sizeof(buf));
// 자동 close
```

C++23의 `std::experimental::unique_resource`가 표준화 진행 중.

### Pattern 3 — ScopedPointer (custom deleter)

```cpp
auto socket = std::unique_ptr<SOCKET, decltype(&closesocket)>(
    new SOCKET(::socket(AF_INET, SOCK_STREAM, 0)),
    &closesocket
);

// 또는 lambda
auto x = std::unique_ptr<Foo, std::function<void(Foo*)>>(
    raw_alloc(), [](Foo *p) { custom_free(p); }
);
```

함정: `function` 객체 캡처가 *unique_ptr 크기*에 추가됨 (8~16 바이트). 성능 critical에서는 함수 객체 타입 직접 사용.

### Pattern 4 — Shared Resource (refcount)

```cpp
class Cache {
public:
    using Entry = std::shared_ptr<CacheData>;

    Entry get(const Key &k) {
        std::lock_guard<std::mutex> lock(m_);
        auto it = cache_.find(k);
        if (it != cache_.end()) {
            if (auto e = it->second.lock()) return e;
        }

        auto e = std::make_shared<CacheData>(load(k));
        cache_[k] = e;
        return e;
    }

private:
    std::mutex m_;
    std::unordered_map<Key, std::weak_ptr<CacheData>> cache_;
};
```

`weak_ptr`로 *순환 참조 차단*. Cache가 *마지막 owner가 아니어도 OK*.

### Pattern 5 — Intrusive RefCount

표준 `shared_ptr`는 *제어 블록*이 별도. 성능 critical 코드에서는 *intrusive*.

```cpp
class IntrusiveBase {
public:
    void Ref() noexcept { ++refs_; }
    void Unref() noexcept { if (--refs_ == 0) delete this; }
protected:
    virtual ~IntrusiveBase() = default;
private:
    std::atomic<int> refs_{0};
};

template <typename T>
class IntrusivePtr {
public:
    explicit IntrusivePtr(T *p = nullptr) noexcept : p_(p) {
        if (p_) p_->Ref();
    }
    ~IntrusivePtr() noexcept { if (p_) p_->Unref(); }
    /* ... copy/move ... */
private:
    T *p_;
};
```

Boost.intrusive_ptr, COM의 IUnknown이 같은 패턴.

### Pattern 6 — Unique Borrow

자원을 *빌렸지만 해제는 다른 곳*인 경우.

```cpp
class Borrowed {
public:
    explicit Borrowed(Pool &pool) : pool_(pool), item_(pool.acquire()) {}
    ~Borrowed() noexcept { pool_.release(item_); }

    Item &get() { return *item_; }

private:
    Pool &pool_;
    Item *item_;
};
```

*Pool에 반환*하는 RAII. 일반 free와 다름.

### Pattern 7 — Conditional Acquisition

자원을 *조건부로* 획득.

```cpp
class MaybeLock {
public:
    MaybeLock(std::mutex &m, bool lock_it) : m_(m), locked_(lock_it) {
        if (locked_) m_.lock();
    }
    ~MaybeLock() noexcept { if (locked_) m_.unlock(); }
private:
    std::mutex &m_;
    bool locked_;
};

void Process(std::mutex &m, bool need_lock) {
    MaybeLock lock(m, need_lock);
    /* ... */
}
```

### Pattern 8 — Acquisition Failure with Optional

생성자에서 예외 안 던지고 `optional`로.

```cpp
class Connection {
public:
    static std::optional<Connection> Connect(const Endpoint &ep) {
        int fd = ::socket(...);
        if (fd < 0) return std::nullopt;
        if (::connect(fd, &ep.addr, sizeof(ep.addr)) < 0) {
            ::close(fd);
            return std::nullopt;
        }
        return Connection(fd);
    }

    ~Connection() noexcept { if (fd_ >= 0) ::close(fd_); }

private:
    explicit Connection(int fd) : fd_(fd) {}
    int fd_;
};
```

생성자에서 예외 안 던지므로 *no-exception 환경*에 적합.

### Pattern 9 — Lazy Initialization

```cpp
class LazyResource {
public:
    Resource &get() {
        std::call_once(flag_, [this]() {
            res_ = std::make_unique<Resource>();
        });
        return *res_;
    }

private:
    std::unique_ptr<Resource> res_;
    std::once_flag flag_;
};
```

`call_once`로 *thread-safe lazy init*.

### Pattern 10 — Resource Registry

```cpp
template <typename T>
class Registry {
public:
    using Token = size_t;

    Token Register(T &&value) {
        std::lock_guard<std::mutex> lock(m_);
        Token t = ++next_;
        items_.emplace(t, std::move(value));
        return t;
    }

    void Unregister(Token t) {
        std::lock_guard<std::mutex> lock(m_);
        items_.erase(t);
    }

    class ScopedRegistration {
    public:
        ScopedRegistration(Registry &reg, T &&v) : reg_(reg), t_(reg.Register(std::move(v))) {}
        ~ScopedRegistration() noexcept { reg_.Unregister(t_); }
    private:
        Registry &reg_;
        Token t_;
    };

private:
    std::mutex m_;
    std::map<Token, T> items_;
    std::atomic<Token> next_{0};
};
```

callback·observer pattern을 *RAII로 관리*. 등록자 객체 destruct 시 *자동 unregister*.

## Lock Patterns

### Pattern 11 — std::lock_guard (단순)

```cpp
{
    std::lock_guard<std::mutex> lock(m_);
    /* critical section */
}   // 자동 unlock
```

### Pattern 12 — std::unique_lock + Condition

```cpp
std::unique_lock<std::mutex> lock(m_);
cv_.wait(lock, [this] { return ready_; });
// wait 중 lock release, 깨어나서 다시 acquire
```

### Pattern 13 — std::scoped_lock (다중 mutex)

```cpp
{
    std::scoped_lock lock(m1_, m2_, m3_);    // C++17 — deadlock-free
    /* ... */
}
```

C++14에서는 `std::lock` + 수동 RAII.

```cpp
// C++14
std::unique_lock<std::mutex> l1(m1_, std::defer_lock);
std::unique_lock<std::mutex> l2(m2_, std::defer_lock);
std::lock(l1, l2);   // 표준이 deadlock-free 알고리즘
```

### Pattern 14 — Reader-Writer

```cpp
std::shared_mutex m_;

// Reader
{
    std::shared_lock<std::shared_mutex> lock(m_);
    /* read */
}

// Writer
{
    std::unique_lock<std::shared_mutex> lock(m_);
    /* write */
}
```

### Pattern 15 — Reentrant Mutex (조심해 사용)

```cpp
std::recursive_mutex m_;   // 재귀 잠금 허용 — 설계가 부득이할 때
```

대부분의 경우 *재귀 잠금 없이 재구조화*가 더 좋다.

### Pattern 16 — Try-Lock with Timeout

```cpp
std::timed_mutex m_;
std::unique_lock<std::timed_mutex> lock(m_, std::defer_lock);
if (lock.try_lock_for(std::chrono::milliseconds(100))) {
    /* got lock */
} else {
    /* timeout */
}
```

### Pattern 17 — RAII over RTOS API

```cpp
class FreeRTOSLock {
public:
    explicit FreeRTOSLock(SemaphoreHandle_t m, TickType_t timeout = portMAX_DELAY)
        : m_(m), acquired_(xSemaphoreTake(m, timeout) == pdTRUE) {}

    ~FreeRTOSLock() noexcept { if (acquired_) xSemaphoreGive(m_); }

    bool acquired() const noexcept { return acquired_; }

private:
    SemaphoreHandle_t m_;
    bool acquired_;
};
```

C 라이브러리(POSIX, FreeRTOS, Zephyr)의 lock에 RAII wrap.

### Pattern 18 — Hierarchical Lock (deadlock 방지)

```cpp
class HierarchicalMutex {
public:
    explicit HierarchicalMutex(uint64_t level) : level_(level) {}

    void lock() {
        if (this_thread_level_ <= level_)
            throw std::logic_error("lock hierarchy violation");
        m_.lock();
        prev_ = this_thread_level_;
        this_thread_level_ = level_;
    }

    void unlock() {
        if (this_thread_level_ != level_)
            throw std::logic_error("lock unbalanced");
        this_thread_level_ = prev_;
        m_.unlock();
    }

private:
    std::mutex m_;
    uint64_t level_;
    uint64_t prev_;
    static thread_local uint64_t this_thread_level_;
};

thread_local uint64_t HierarchicalMutex::this_thread_level_ = UINT64_MAX;
```

Anthony Williams의 *C++ Concurrency in Action*에서 소개된 패턴. *Lock order violation을 런타임에 검출*.

## Transaction Patterns

### Pattern 19 — Commit-or-Rollback

```cpp
template <typename Action>
class Transaction {
public:
    explicit Transaction(Action rollback) : rollback_(std::move(rollback)), committed_(false) {}
    ~Transaction() noexcept {
        if (!committed_) {
            try { rollback_(); } catch (...) { /* log */ }
        }
    }
    void Commit() noexcept { committed_ = true; }
    Transaction(const Transaction &) = delete;
    Transaction &operator=(const Transaction &) = delete;
private:
    Action rollback_;
    bool committed_;
};

// 사용
void Foo() {
    db.BeginTransaction();
    Transaction t([&] { db.Rollback(); });

    db.Insert(...);
    db.Update(...);

    db.Commit();
    t.Commit();    // 명시
}
```

예외 또는 *commit 누락*이면 자동 rollback.

### Pattern 20 — Scope Guard (boost·gsl)

```cpp
#include <gsl/util>

void Foo() {
    auto cleanup = gsl::finally([] { std::cout << "cleanup\n"; });
    /* 작업 */
    // 또는 cleanup.~finally(); 로 이전 실행
}
```

`std::experimental::scope_exit` (C++23 진행 중)도 같은 패턴.

자체 구현:

```cpp
template <typename F>
class ScopeExit {
public:
    explicit ScopeExit(F f) : f_(std::move(f)), active_(true) {}
    ~ScopeExit() noexcept { if (active_) try { f_(); } catch (...) {} }
    void Cancel() noexcept { active_ = false; }
    ScopeExit(const ScopeExit &) = delete;
    ScopeExit(ScopeExit &&o) noexcept : f_(std::move(o.f_)), active_(o.active_) {
        o.active_ = false;
    }
private:
    F f_;
    bool active_;
};

template <typename F>
ScopeExit<F> MakeScopeExit(F f) { return ScopeExit<F>(std::move(f)); }
```

### Pattern 21 — Two-Phase Commit

```cpp
class TwoPhaseCommit {
public:
    bool Prepare() {
        for (auto &r : resources_) {
            if (!r.Prepare()) {
                for (auto &p : prepared_) p.Cancel();
                return false;
            }
            prepared_.push_back(r);
        }
        return true;
    }

    void Commit() {
        for (auto &r : prepared_) r.Commit();
        prepared_.clear();
    }

    ~TwoPhaseCommit() {
        for (auto &p : prepared_) p.Cancel();   // 미커밋 시 자동 cancel
    }

private:
    std::vector<Resource> resources_;
    std::vector<Resource> prepared_;
};
```

분산 transaction이나 multi-resource 작업.

### Pattern 22 — Saga Pattern

각 단계가 *대응 compensation*을 등록.

```cpp
class Saga {
public:
    template <typename Action, typename Compensation>
    bool Execute(Action a, Compensation c) {
        if (!a()) return false;
        compensations_.push_back(c);
        return true;
    }

    void Rollback() {
        // 역순으로 compensation
        for (auto it = compensations_.rbegin(); it != compensations_.rend(); ++it) {
            try { (*it)(); } catch (...) {}
        }
        compensations_.clear();
    }

    void Commit() {
        compensations_.clear();
    }

    ~Saga() { if (!compensations_.empty()) Rollback(); }

private:
    std::vector<std::function<void()>> compensations_;
};
```

마이크로서비스 transaction이나 *복잡한 multi-step 작업*.

### Pattern 23 — Snapshot

```cpp
class StateSnapshot {
public:
    explicit StateSnapshot(State &s) : state_(s), backup_(s) {}

    ~StateSnapshot() noexcept {
        if (!committed_) state_ = backup_;
    }

    void Commit() noexcept { committed_ = true; }

private:
    State &state_;
    State backup_;
    bool committed_ = false;
};

void Foo(State &s) {
    StateSnapshot snap(s);
    s.x = 5;
    s.y = 10;
    if (!ValidateState(s)) return;   // 자동 rollback
    snap.Commit();
}
```

상태 *복사 → 작업 → 검증 → 커밋* 패턴.

### Pattern 24 — Optimistic Concurrency

```cpp
class OptimisticTransaction {
public:
    template <typename Action>
    bool Try(Action a, int max_retries = 3) {
        for (int i = 0; i < max_retries; i++) {
            uint64_t version = current_version_.load();
            auto result = a();
            if (current_version_.compare_exchange_strong(version, version + 1)) {
                return true;
            }
            // 다른 thread가 먼저 변경 — 재시도
        }
        return false;
    }

private:
    std::atomic<uint64_t> current_version_{0};
};
```

Lock-free 패턴. CAS 기반.

## Scope Guards

### Pattern 25 — TemporaryValue

```cpp
template <typename T>
class TempValue {
public:
    TempValue(T &var, T new_val) : var_(var), old_(var) { var_ = new_val; }
    ~TempValue() noexcept { var_ = old_; }
private:
    T &var_;
    T old_;
};

void Foo() {
    TempValue<int> t(g_debug_level, 5);    // 임시로 5로 변경
    DoVerbose();
}   // g_debug_level 복원
```

### Pattern 26 — Errno Snapshot

```cpp
class ErrnoSaver {
public:
    ErrnoSaver() noexcept : saved_(errno) { errno = 0; }
    ~ErrnoSaver() noexcept { errno = saved_; }
private:
    int saved_;
};

void Foo() {
    ErrnoSaver guard;
    errno = 0;
    long v = strtol(s, &end, 10);
    if (errno != 0) { /* ... */ }
}   // 호출자 errno 복원
```

### Pattern 27 — Floating Point Environment

```cpp
class FpEnvSaver {
public:
    FpEnvSaver() { std::fegetenv(&env_); }
    ~FpEnvSaver() noexcept { std::fesetenv(&env_); }
private:
    std::fenv_t env_;
};

void NumericCode() {
    FpEnvSaver guard;
    std::feenableexcept(FE_DIVBYZERO);    // 임시 예외 활성화
    /* ... */
}   // 복원
```

### Pattern 28 — Signal Mask

```cpp
class SignalMaskGuard {
public:
    explicit SignalMaskGuard(const sigset_t *mask) {
        sigprocmask(SIG_BLOCK, mask, &saved_);
    }
    ~SignalMaskGuard() noexcept {
        sigprocmask(SIG_SETMASK, &saved_, nullptr);
    }
private:
    sigset_t saved_;
};
```

POSIX 시그널 일시 차단.

### Pattern 29 — Working Directory

```cpp
class ChdirGuard {
public:
    explicit ChdirGuard(const std::string &path) {
        char buf[PATH_MAX];
        getcwd(buf, sizeof(buf));
        saved_ = buf;
        ::chdir(path.c_str());
    }
    ~ChdirGuard() noexcept { ::chdir(saved_.c_str()); }
private:
    std::string saved_;
};
```

### Pattern 30 — Umask Guard

```cpp
class UmaskGuard {
public:
    explicit UmaskGuard(mode_t new_umask) : old_(::umask(new_umask)) {}
    ~UmaskGuard() noexcept { ::umask(old_); }
private:
    mode_t old_;
};
```

### Pattern 31 — Console Mode Guard (Windows)

```cpp
class ConsoleModeGuard {
public:
    explicit ConsoleModeGuard(HANDLE h, DWORD new_mode) : h_(h) {
        GetConsoleMode(h, &old_);
        SetConsoleMode(h, new_mode);
    }
    ~ConsoleModeGuard() noexcept { SetConsoleMode(h_, old_); }
private:
    HANDLE h_;
    DWORD old_;
};
```

## Memory Patterns

### Pattern 32 — Aligned Memory

```cpp
template <typename T, size_t Align = alignof(T)>
class AlignedBuffer {
public:
    explicit AlignedBuffer(size_t n) : data_(std::aligned_alloc(Align, n * sizeof(T))) {
        if (!data_) throw std::bad_alloc();
    }
    ~AlignedBuffer() noexcept { std::free(data_); }
    T *data() noexcept { return static_cast<T *>(data_); }
private:
    void *data_;
};
```

SIMD, DMA 버퍼 등 정렬 요구사항.

### Pattern 33 — Stack Buffer (alloca-like)

```cpp
template <typename T, size_t StackSize = 4096>
class SmallVector {
public:
    SmallVector() : data_(stack_), size_(0), capacity_(StackSize / sizeof(T)) {}

    ~SmallVector() noexcept {
        for (size_t i = 0; i < size_; i++) data_[i].~T();
        if (data_ != stack_) ::operator delete(data_);
    }

    void push_back(const T &v) {
        if (size_ == capacity_) Grow();
        new (data_ + size_) T(v);
        ++size_;
    }

private:
    void Grow();   // heap으로 이전
    alignas(T) std::byte stack_[StackSize];
    T *data_;
    size_t size_;
    size_t capacity_;
};
```

작은 크기는 stack, 크면 heap. LLVM의 `SmallVector`가 동일 패턴.

### Pattern 34 — Memory Mapping

```cpp
class MemoryMap {
public:
    MemoryMap(const std::string &path, size_t size, int prot, int flags)
        : ptr_(nullptr), size_(size) {
        fd_ = ::open(path.c_str(), O_RDWR);
        if (fd_ < 0) throw std::system_error(errno, std::generic_category());
        ptr_ = ::mmap(nullptr, size, prot, flags, fd_, 0);
        if (ptr_ == MAP_FAILED) {
            int e = errno;
            ::close(fd_);
            throw std::system_error(e, std::generic_category());
        }
    }
    ~MemoryMap() noexcept {
        if (ptr_ && ptr_ != MAP_FAILED) ::munmap(ptr_, size_);
        if (fd_ >= 0) ::close(fd_);
    }
    void *data() noexcept { return ptr_; }
private:
    int fd_ = -1;
    void *ptr_;
    size_t size_;
};
```

### Pattern 35 — Shared Memory

POSIX SHM과 비슷.

```cpp
class SharedMem {
public:
    SharedMem(const std::string &name, size_t size) : name_(name), size_(size) {
        fd_ = shm_open(name.c_str(), O_CREAT | O_RDWR, 0644);
        ftruncate(fd_, size);
        ptr_ = mmap(NULL, size, PROT_READ | PROT_WRITE, MAP_SHARED, fd_, 0);
    }
    ~SharedMem() noexcept {
        munmap(ptr_, size_);
        close(fd_);
        shm_unlink(name_.c_str());
    }
    void *data() { return ptr_; }
private:
    std::string name_;
    int fd_;
    void *ptr_;
    size_t size_;
};
```

### Pattern 36 — Page Locking (mlock)

```cpp
class LockedMemory {
public:
    LockedMemory(void *p, size_t n) : p_(p), n_(n) {
        if (::mlock(p, n) < 0) throw std::system_error(errno, std::generic_category());
    }
    ~LockedMemory() noexcept { ::munlock(p_, n_); }
private:
    void *p_;
    size_t n_;
};
```

암호화 키처럼 *swap out 방지* 필요한 메모리.

### Pattern 37 — Secure Erase

비밀 데이터를 *컴파일러 최적화 우회로 zero*.

```cpp
class SecureBuffer {
public:
    explicit SecureBuffer(size_t n) : data_(new uint8_t[n]), size_(n) {}
    ~SecureBuffer() noexcept {
        volatile uint8_t *p = data_.get();
        for (size_t i = 0; i < size_; i++) p[i] = 0;
        // 또는 explicit_bzero / SecureZeroMemory
    }
    uint8_t *data() noexcept { return data_.get(); }
private:
    std::unique_ptr<uint8_t[]> data_;
    size_t size_;
};
```

## Pool / Reservation Patterns

### Pattern 38 — Object Pool

```cpp
template <typename T, size_t Size>
class ObjectPool {
public:
    class Handle {
    public:
        Handle(ObjectPool &p, T *o) : pool_(p), obj_(o) {}
        ~Handle() noexcept { pool_.release(obj_); }
        T &operator*() { return *obj_; }
        T *operator->() { return obj_; }
    private:
        ObjectPool &pool_;
        T *obj_;
    };

    std::optional<Handle> acquire() {
        std::lock_guard<std::mutex> lock(m_);
        for (size_t i = 0; i < Size; i++) {
            if (!used_[i]) {
                used_[i] = true;
                new (storage_ + i) T();
                return Handle(*this, reinterpret_cast<T *>(storage_ + i));
            }
        }
        return std::nullopt;
    }

    void release(T *p) {
        p->~T();
        std::lock_guard<std::mutex> lock(m_);
        size_t i = p - reinterpret_cast<T *>(storage_);
        used_[i] = false;
    }

private:
    alignas(T) std::byte storage_[sizeof(T) * Size];
    bool used_[Size]{};
    std::mutex m_;
};
```

### Pattern 39 — Connection Pool

```cpp
class ConnectionPool {
public:
    ConnectionPool(size_t size, const std::string &dsn) {
        for (size_t i = 0; i < size; i++) {
            available_.push(std::make_unique<Connection>(dsn));
        }
    }

    class PooledConn {
    public:
        PooledConn(ConnectionPool &p, std::unique_ptr<Connection> c)
            : pool_(p), conn_(std::move(c)) {}
        ~PooledConn() noexcept { pool_.Return(std::move(conn_)); }
        Connection *operator->() { return conn_.get(); }
    private:
        ConnectionPool &pool_;
        std::unique_ptr<Connection> conn_;
    };

    PooledConn Acquire() {
        std::unique_lock<std::mutex> lock(m_);
        cv_.wait(lock, [this] { return !available_.empty(); });
        auto c = std::move(available_.front());
        available_.pop();
        return PooledConn(*this, std::move(c));
    }

    void Return(std::unique_ptr<Connection> c) {
        std::lock_guard<std::mutex> lock(m_);
        available_.push(std::move(c));
        cv_.notify_one();
    }

private:
    std::queue<std::unique_ptr<Connection>> available_;
    std::mutex m_;
    std::condition_variable cv_;
};
```

### Pattern 40 — Semaphore-based Reservation

```cpp
class Slots {
public:
    explicit Slots(size_t n) : sem_(n) {}

    class Reservation {
    public:
        explicit Reservation(Slots &s) : s_(s) { s_.sem_.acquire(); }
        ~Reservation() noexcept { s_.sem_.release(); }
    private:
        Slots &s_;
    };

    Reservation Acquire() { return Reservation(*this); }

private:
    std::counting_semaphore<> sem_;   // C++20
};

void Worker() {
    auto res = slots.Acquire();    // n 개까지만 동시
    /* ... */
}
```

### Pattern 41 — Bounded Queue

```cpp
template <typename T, size_t Size>
class BoundedQueue {
public:
    bool TryPush(T value) {
        std::unique_lock<std::mutex> lock(m_);
        if (queue_.size() == Size) return false;
        queue_.push(std::move(value));
        cv_.notify_one();
        return true;
    }

    std::optional<T> TryPop() {
        std::lock_guard<std::mutex> lock(m_);
        if (queue_.empty()) return std::nullopt;
        T v = std::move(queue_.front());
        queue_.pop();
        return v;
    }

private:
    std::queue<T> queue_;
    std::mutex m_;
    std::condition_variable cv_;
};
```

### Pattern 42 — Resource Lease

```cpp
template <typename T>
class LeasedResource {
public:
    LeasedResource(T value, std::chrono::milliseconds lease)
        : value_(std::move(value)),
          deadline_(std::chrono::steady_clock::now() + lease) {}

    bool Renew(std::chrono::milliseconds extension) {
        if (Expired()) return false;
        deadline_ += extension;
        return true;
    }

    bool Expired() const noexcept {
        return std::chrono::steady_clock::now() >= deadline_;
    }

    T *Get() { return Expired() ? nullptr : &value_; }

private:
    T value_;
    std::chrono::steady_clock::time_point deadline_;
};
```

DHCP lease, OAuth token 등.

## Specialized Patterns

### Pattern 43 — Reference Wrap with Auto Detach

```cpp
class EventSubscription {
public:
    template <typename Handler>
    EventSubscription(EventBus &bus, EventType type, Handler h)
        : bus_(bus), token_(bus.Subscribe(type, std::move(h))) {}

    ~EventSubscription() noexcept { bus_.Unsubscribe(token_); }

private:
    EventBus &bus_;
    SubscriptionToken token_;
};
```

이벤트 구독자 객체의 *destruct 시 자동 unsubscribe*.

### Pattern 44 — GPU Context Guard

```cpp
class CudaStreamGuard {
public:
    explicit CudaStreamGuard(cudaStream_t s) : prev_(GetCurrentStream()) {
        SetCurrentStream(s);
    }
    ~CudaStreamGuard() noexcept { SetCurrentStream(prev_); }
private:
    cudaStream_t prev_;
};
```

GPU·CUDA 스트림 컨텍스트.

### Pattern 45 — Performance Trace

```cpp
class ScopedTrace {
public:
    explicit ScopedTrace(const char *name) : name_(name) {
        start_ = std::chrono::steady_clock::now();
    }
    ~ScopedTrace() noexcept {
        auto end = std::chrono::steady_clock::now();
        auto us = std::chrono::duration_cast<std::chrono::microseconds>(end - start_).count();
        LOG_INFO("trace: %s = %ld us", name_, us);
    }
private:
    const char *name_;
    std::chrono::steady_clock::time_point start_;
};

#define TRACE(name) ScopedTrace _trace_##__LINE__(name)
```

### Pattern 46 — Profiler Marker

```cpp
class ProfileMarker {
public:
    explicit ProfileMarker(const char *zone) { PerfBegin(zone); }
    ~ProfileMarker() noexcept { PerfEnd(); }
};
```

Tracy, Optick 등.

### Pattern 47 — Interrupt Disable Guard

```cpp
class IsrDisableGuard {
public:
    IsrDisableGuard() : prev_(__get_PRIMASK()) {
        __disable_irq();
    }
    ~IsrDisableGuard() noexcept {
        if (prev_ == 0) __enable_irq();
    }
private:
    uint32_t prev_;
};
```

ARM Cortex-M ISR 일시 차단. 짧은 critical section.

### Pattern 48 — Watchdog Pet

```cpp
class WatchdogPet {
public:
    WatchdogPet() { WatchdogReset(); }
    ~WatchdogPet() noexcept { WatchdogReset(); }
};

void LongTask() {
    WatchdogPet pet_start;
    /* ... long work ... */
    // 끝에서 자동으로 pet
}
```

### Pattern 49 — Telemetry Span

OpenTelemetry, Tracing.

```cpp
class TelemetrySpan {
public:
    TelemetrySpan(Tracer &t, const std::string &name)
        : tracer_(t), span_(t.StartSpan(name)) {}
    ~TelemetrySpan() noexcept { tracer_.EndSpan(span_); }
private:
    Tracer &tracer_;
    SpanId span_;
};
```

### Pattern 50 — RAII Token

```cpp
template <typename CapabilityTag>
class Capability {
public:
    Capability() : valid_(true) {}
    ~Capability() noexcept { Revoke(); }

    void Revoke() noexcept { valid_ = false; }
    bool IsValid() const noexcept { return valid_; }

private:
    bool valid_;
};

// 사용
struct DbWriteCap {};
using DbWriteToken = Capability<DbWriteCap>;

void DoWrite(DbWriteToken &tok) {
    if (!tok.IsValid()) throw std::logic_error("revoked");
    /* ... */
}
```

권한 토큰 — *유효한 동안에만* 작업 가능.

## 패턴 카탈로그 — 한눈에

각 패턴의 *언제 쓰는가*:

| 상황 | 패턴 |
|------|------|
| 단순 자원 lifetime | ScopedHandle (1), UniqueResource (2) |
| 자원 공유 | Shared (4), Intrusive (5) |
| Lock | lock_guard (11), unique_lock (12), scoped_lock (13) |
| RW lock | shared_lock (14) |
| 다중 lock deadlock 방지 | scoped_lock (13), Hierarchical (18) |
| Transaction commit/rollback | Transaction (19), TwoPhase (21) |
| Compensation | Saga (22) |
| 상태 일시 변경 | TempValue (25), ErrnoSaver (26) |
| 풀에서 빌리기 | ObjectPool (38), ConnectionPool (39) |
| 동시 작업 수 제한 | Semaphore (40) |
| 이벤트 구독 | EventSubscription (43) |
| 인터럽트 차단 | IsrDisableGuard (47) |

## 정리

- RAII는 *C에서의 goto cleanup, deviation 보고서, double-free 사고*를 *언어 차원에서 차단*한다.
- 단순 자원: ScopedHandle, UniqueResource template.
- 동시성: lock_guard·unique_lock·scoped_lock + RAII RTOS wrapper.
- Transaction: commit-or-rollback, scope guard, two-phase, saga.
- 임시 상태 변경: ErrnoSaver, FpEnvSaver, ChdirGuard, etc.
- 풀: ObjectPool, ConnectionPool, semaphore-based reservation.
- 특수: GPU 스트림, 인터럽트, watchdog, telemetry — 모두 RAII로.
- *모든 destructor는 noexcept*. *모든 copy 가능성을 명시* (default/delete).
- C++23의 `std::experimental::unique_resource`, `scope_exit`가 일부 자동화.

## 다음 장 예고

12장은 *modern C++ idiom의 안전 critical 적용* — Type erasure, CRTP, expression template, policy-based design.

## 관련 항목

- [Ch 5 — Classes, Inheritance, RAII](/blog/embedded/standards/autosar-cpp/chapter05-classes-inheritance)
- [Ch 7 — Exception Handling](/blog/embedded/standards/autosar-cpp/chapter07-exceptions)
- [Ch 9 — Concurrency](/blog/embedded/standards/autosar-cpp/chapter09-concurrency-memory)
- [P. Williams — C++ Concurrency in Action](https://www.manning.com/books/c-plus-plus-concurrency-in-action-second-edition)
- [Boost Scope Exit](https://www.boost.org/doc/libs/release/libs/scope_exit/doc/html/index.html)
