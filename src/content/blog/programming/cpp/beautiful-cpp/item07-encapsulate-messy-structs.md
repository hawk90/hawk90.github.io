---
title: "항목 7: 지저분한 구조체는 코드에 펼쳐놓지 말고 캡슐화하라"
date: 2026-05-08T07:00:00
description: "외부 C API의 거친 자원 관리를 RAII 래퍼로 한 곳에 가두는 패턴 — sqlite3, OpenGL, OS handle 등."
tags: [C++, RAII, Encapsulation]
series: "Beautiful C++"
seriesOrder: 7
draft: true
---

## 왜 이 항목이 중요한가?

C 라이브러리(SQLite, libcurl, OpenGL, Win32 API, POSIX)나 OS 시스템 콜은 종종 **"open → use → close" 패턴**을 노출한다. C++ 코드에서 직접 호출하면:

- 호출 지점마다 정리 코드 반복
- 예외 발생 시 누락 (그래서 try/finally 같은 우회)
- 에러 처리가 산만하게 흩어짐
- 이중 close나 누수가 미묘하게 숨음

해결책은 단순하다 — **얇은 RAII 래퍼 클래스에 한 번만 가두고**, 호출부는 그 깔끔한 인터페이스만 사용. C++의 가장 강력한 idiom 중 하나.

## 핵심 내용

- 외부 라이브러리·OS API가 노출하는 C 스타일 구조체는 종종 **수동 초기화·해제**가 필요
- 이런 코드를 호출 지점마다 흩뿌리면 **누락·중복·이중 해제**로 이어진다
- 얇은 RAII 래퍼 클래스에 **한 번만 가두면** 호출부는 깔끔해지고 자원 안전성이 자동으로 따라온다
- 복사·이동 정책을 명시적으로 결정 (보통 noncopyable + movable)

## 비교 — 호출부에 흩뿌린 vs RAII 캡슐화

### Bad: 지저분한 C API가 호출부에 노출

```cpp
sqlite3* db = nullptr;
if (sqlite3_open("data.db", &db) != SQLITE_OK) {
    sqlite3_close(db);     // 에러 시 close 잊기 쉬움
    return;
}

sqlite3_stmt* stmt = nullptr;
if (sqlite3_prepare_v2(db, "SELECT ...", -1, &stmt, nullptr) != SQLITE_OK) {
    sqlite3_close(db);
    return;
}

// ... 작업 도중 예외 발생하면? ...

sqlite3_finalize(stmt);
sqlite3_close(db);
```

문제:
- 한 함수에 cleanup 코드 4-6번 반복
- 예외 unwinding 시 정리 누락 — 자원 누수
- 새 early return 추가하면 cleanup 잊기 쉬움
- 호출자가 매번 SQLite API 디테일 알아야

### Good: 한 곳에 캡슐화

```cpp
class Database {
    sqlite3* db_ = nullptr;
public:
    explicit Database(const char* path) {
        if (sqlite3_open(path, &db_) != SQLITE_OK) {
            auto msg = std::string{sqlite3_errmsg(db_)};
            sqlite3_close(db_);
            throw std::runtime_error(msg);
        }
    }
    ~Database() {
        if (db_) sqlite3_close(db_);
    }

    // 복사 금지 — 같은 핸들을 두 번 close하면 안 됨
    Database(const Database&)            = delete;
    Database& operator=(const Database&) = delete;

    // 이동 OK
    Database(Database&& other) noexcept : db_(other.db_) {
        other.db_ = nullptr;
    }
    Database& operator=(Database&& other) noexcept {
        if (this != &other) {
            if (db_) sqlite3_close(db_);
            db_ = other.db_;
            other.db_ = nullptr;
        }
        return *this;
    }

    sqlite3* handle() const noexcept { return db_; }
};
```

호출부:

```cpp
void process() {
    Database db("data.db");          // 생성 시 open, 실패 시 throw
    auto stmt = db.prepare("SELECT ...");
    stmt.execute();
    // scope 끝 → ~Statement → ~Database 자동
}
```

호출부 코드 30줄 → 4줄. cleanup 누락 불가능.

## RAII 래퍼 작성 체크리스트

1. **생성자: open / acquire**
   - 실패 시 throw (또는 nullable 상태)
2. **소멸자: close / release**
   - `noexcept` 보장 (항목 8 — 소멸자 예외 함정)
   - null 체크 (이동 이후 상태)
3. **복사 정책 결정**
   - 보통 `= delete` (자원이 단일 소유)
   - 참조 카운팅이 의미 있으면 shared_ptr 패턴
4. **이동 정책 결정**
   - 보통 OK — 다른 객체로 소유권 이전 가능
   - `noexcept` 명시
5. **raw 자원 접근**
   - `.handle()` / `.get()` 등 명시 메서드
   - 외부 C API 호출 시 사용

## 표준 라이브러리 + `unique_ptr` 활용 — 더 짧게

표준 `unique_ptr`에 custom deleter를 박으면 클래스 작성 없이도 RAII 가능:

```cpp
// 람다 deleter
auto deleter = [](sqlite3* db) {
    if (db) sqlite3_close(db);
};
using DbHandle = std::unique_ptr<sqlite3, decltype(deleter)>;

DbHandle open_db(const char* path) {
    sqlite3* raw = nullptr;
    if (sqlite3_open(path, &raw) != SQLITE_OK) {
        if (raw) sqlite3_close(raw);
        throw std::runtime_error("failed to open DB");
    }
    return DbHandle(raw, deleter);
}
```

`unique_ptr<sqlite3, Deleter>` 자체가 RAII — `~unique_ptr`이 deleter 호출. 짧고 표준.

## 실전 — Win32 HANDLE

```cpp
struct HandleCloser {
    using pointer = HANDLE;     // 표준 unique_ptr가 HANDLE을 받도록
    void operator()(HANDLE h) const noexcept {
        if (h != INVALID_HANDLE_VALUE) CloseHandle(h);
    }
};

using FileHandle = std::unique_ptr<void, HandleCloser>;

FileHandle open_for_read(const wchar_t* path) {
    HANDLE h = CreateFileW(path, GENERIC_READ, FILE_SHARE_READ, nullptr,
                            OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (h == INVALID_HANDLE_VALUE) throw std::system_error{/* ... */};
    return FileHandle(h);
}
```

`unique_ptr`의 nested `pointer` typedef 트릭 — 포인터가 아닌 핸들 타입에도 적용 가능.

## 실전 — OpenGL 리소스

```cpp
class Shader {
    GLuint id_ = 0;
public:
    explicit Shader(GLenum type) : id_(glCreateShader(type)) {
        if (id_ == 0) throw std::runtime_error("shader creation failed");
    }
    ~Shader() { if (id_) glDeleteShader(id_); }

    Shader(const Shader&)            = delete;
    Shader& operator=(const Shader&) = delete;
    Shader(Shader&& other) noexcept : id_(std::exchange(other.id_, 0)) {}
    Shader& operator=(Shader&& other) noexcept {
        if (this != &other) {
            if (id_) glDeleteShader(id_);
            id_ = std::exchange(other.id_, 0);
        }
        return *this;
    }

    GLuint id() const noexcept { return id_; }
};
```

`std::exchange` 트릭 — 이동 시 source를 0으로 reset.

## 함정 — 복사 정책 명시 안 함

```cpp
class Database {
    sqlite3* db_;
public:
    Database(const char* path) { /* ... */ }
    ~Database() { sqlite3_close(db_); }
    // 복사·이동 미정의 — 컴파일러 자동 생성!
};

Database a("x.db"), b("y.db");
b = a;     // ⚠️ 자동 복사 대입: a.db_ → b.db_ (포인터 복사)
           //     a와 b가 같은 핸들 가리킴
           //     소멸 시 둘 다 close → 이중 close → 크래시
```

raw 자원 멤버 + 사용자 정의 소멸자 = **복사·이동 명시 필수**. 안 그러면 컴파일러 자동 복사가 자원을 두 번 해제.

## 함정 — 소멸자가 예외 던짐

```cpp
~Database() {
    int rc = sqlite3_close(db_);
    if (rc != SQLITE_OK) throw std::runtime_error("close failed");    // ⚠️
}
```

예외 unwinding 도중 소멸자가 또 throw → `std::terminate`. 소멸자는 **반드시 noexcept**.

해결:

```cpp
~Database() noexcept {
    if (db_) {
        int rc = sqlite3_close(db_);
        if (rc != SQLITE_OK) {
            log_error("DB close failed");        // 로깅만
        }
    }
}
```

## 함정 — handle 노출 → 외부에서 close

```cpp
Database db("x.db");
sqlite3_close(db.handle());      // ⚠️ 외부에서 직접 close
                                  //     db 소멸자가 또 close → 이중 해제
```

`.handle()`을 노출하는 게 의도지만, 사용자가 라이프타임을 침범할 위험. 문서로 명시 + 가능하면 `const` 메서드만 노출.

## 모던 변형 — `std::observer_ptr` (실험적) / GSL `not_null<T*>`

소유권 없는 raw 포인터 + null이 아님을 타입으로 명시:

```cpp
#include <gsl/pointers>

void use(gsl::not_null<sqlite3*> db) {
    // db는 nullptr 아님이 컴파일 타임 보장
}
```

## 실무 가이드 — 체크리스트

외부 C API를 사용한다면:

- [ ] 그 API의 자원을 RAII 래퍼로 감쌌는가?
- [ ] 생성자에서 자원 acquire, 소멸자에서 release?
- [ ] 복사·이동 정책 명시 (`= delete` 또는 직접 구현)?
- [ ] 소멸자 `noexcept`?
- [ ] handle 노출 메서드는 `const`?
- [ ] `unique_ptr` + custom deleter로 더 짧게 가능?
- [ ] 외부에서 직접 close하지 말 것을 문서화?

## 정리

지저분함은 **한 군데에 가두는 게 핵심**이다. 외부의 거친 API를 RAII 래퍼로 한 번 감싸면 나머지 코드는 평온해진다.

선택지:
- 정식 클래스 — 복사·이동 정책 명시적
- `unique_ptr<T, Deleter>` — 더 짧음, 한 줄로 정의

호출부의 가독성과 안전성은 — 이 한 번의 래핑이 결정한다.

## 관련 항목

- [항목 8: 소멸자에서 예외 금지](/blog/programming/cpp/beautiful-cpp/item08-keep-function-arguments-minimal) — RAII 소멸자의 규칙
- [항목 13: 원시 포인터로 소유권 이전 X](/blog/programming/cpp/beautiful-cpp/item13-never-transfer-ownership-via-raw-pointer) — 소유권의 표현
- [항목 30: RAII로 누수 방지](/blog/programming/cpp/beautiful-cpp/item30-use-raii-to-prevent-leaks) — RAII 원리
