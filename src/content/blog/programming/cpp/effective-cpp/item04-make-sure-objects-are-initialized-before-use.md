---
title: "항목 4: 사용 전에 객체를 반드시 초기화하라"
date: 2025-02-01T13:00:00
description: "내장 타입 비초기화 함정, 멤버 초기화 리스트, 초기화 순서, static 초기화 순서 fiasco와 Meyers' singleton."
tags: [C++, Effective C++, Initialization]
series: "Effective C++"
seriesOrder: 4
---

## 개요

C++에서 "초기화"는 규칙이 단순해 보이지만 **여러 층의 예외**가 있습니다. 어떤 변수는 자동 초기화되지만 어떤 변수는 쓰레기 값이고, 같은 코드도 컴파일러나 빌드 옵션에 따라 결과가 달라집니다. 초기화되지 않은 객체에서 값을 읽는 것은 UB — **모든 객체를 사용 전에 명시적으로 초기화**하는 습관이 가장 안전합니다.

## 필수 개념: 초기화의 종류

> **초보자를 위한 배경 지식**

<br>

C++ 표준은 여러 초기화 방식을 구분합니다 — 같은 이름의 변수가 어떤 초기화를 받는지는 위치와 문법에 따라 다릅니다.

| 초기화 종류 | 트리거 | 결과 (내장 타입) |
| --- | --- | --- |
| **Default initialization** | `int x;` (블록 안) | 쓰레기 값 |
| **Default initialization** | `int x;` (전역/static) | 0 |
| **Value initialization** | `int x{};`, `int x();` (C++03 함정), `new int()` | 0 |
| **Zero initialization** | static 저장 기간, 초기화 전 | 0 |
| **Aggregate initialization** | `int arr[3] = {1};` | `{1, 0, 0}` |

블록 스코프 내장 타입은 `int x;`만 적으면 **자동 초기화 안 됨**. 전역/static은 자동 0. 이 차이가 입문자가 가장 많이 빠지는 함정입니다.

## 내장 타입은 함수 안에서 자동 초기화 안 됨

```cpp
void f() {
    int x;           // ⚠️ 쓰레기 값
    double pi;       // ⚠️ 쓰레기
    int* p;          // ⚠️ 쓰레기 포인터
    bool flag;       // ⚠️ 쓰레기 (true도 false도 아닌 비트 패턴)

    if (x > 0) ... ; // UB
}
```

해결: **항상 초기치를 명시**.

```cpp
int    x  = 0;        // C 스타일
int    y(0);          // 함수 호출 문법
int    z{0};          // C++11 brace
int*   p  = nullptr;
double pi = 3.14;
bool   ok = false;
```

C++11 이후로는 `{}` brace init이 권장 — **narrowing 변환을 차단**하고 모든 자리에서 동일.

## 클래스 멤버 — 생성자가 초기화 책임

```cpp
class Point {
    int x, y;
public:
    Point() {}   // ⚠️ x, y는 쓰레기!
};
```

생성자 본문 진입 시 멤버는 이미 **default-initialized** 상태. 내장 타입 멤버는 쓰레기. 생성자 본문에서 대입하면 **두 단계** — 먼저 default 초기화, 그 다음 대입.

```cpp
Point() {
    x = 0;    // 두 번째 단계 — 사실은 "대입"
    y = 0;    // (default init은 이미 일어난 후)
}
```

`std::string` 같은 클래스 타입은 default-init도 의미 있는 동작(빈 string 생성). 내장 타입만 함정.

## 멤버 초기화 리스트 — 권장

```cpp
class PhoneBook {
    std::string name;
    std::vector<std::string> phones;
    int callCount;
public:
    // ❌ 비효율 — string은 두 번 만들어짐 (default + copy assign)
    PhoneBook(const std::string& n, const std::vector<std::string>& ps) {
        name      = n;
        phones    = ps;
        callCount = 0;
    }

    // ✅ 효율적 — 각 멤버 복사 생성 한 번
    PhoneBook(const std::string& n, const std::vector<std::string>& ps)
        : name(n),
          phones(ps),
          callCount(0) {}
};
```

생성자 본문은 멤버가 이미 default-init된 후 실행됩니다. 거기서 다시 대입하는 건 **default 생성 + 대입**의 두 단계 — string·vector처럼 무거운 타입에선 비효율.

초기화 리스트에 적으면 **곧바로 원하는 값으로 생성** — 단일 단계.

### const, 참조, 기본 생성자 없는 타입 — 반드시 초기화 리스트

```cpp
class C {
    const int     id;        // const — 대입 불가, 초기화만 가능
    std::string&  ref;       // 참조 — 한 번 묶이면 끝
    Mutex         mu;        // 기본 생성자 없음 (가정)
public:
    C(int i, std::string& s, Mutex& m)
        : id(i), ref(s), mu(m) {}   // 본문 대입은 불가능
};
```

본문에선 `id = i;`나 `ref = s;`가 컴파일 에러. **반드시** 초기화 리스트.

## 멤버 초기화 순서 — 선언 순서

```cpp
class Buffer {
    char*  data;     // 선언 1번째
    int    size;     // 선언 2번째
public:
    Buffer(int s)
        : size(s),                    // 초기화 리스트에선 size가 먼저 적힘
          data(new char[size]) {}     // 하지만 실제 초기화는 선언 순서 (data 먼저!)
};
```

위 코드는 **버그**. 멤버는 **클래스 선언 순서**대로 초기화 — 리스트 작성 순서와 무관. `data`가 먼저 초기화되는 시점에 `size`는 아직 쓰레기.

**규칙**: 초기화 리스트도 **선언 순서대로** 작성. 일관성 + 컴파일러 경고(-Wreorder).

```cpp
class Buffer {
    int    size;     // 선언 순서 변경
    char*  data;
public:
    Buffer(int s)
        : size(s),
          data(new char[size]) {}     // size가 먼저 초기화됨 — 정상
};
```

## 다른 컴파일 단위의 static 객체 — 초기화 순서 fiasco

**문제**: 다른 .cpp 파일의 static 객체끼리는 **초기화 순서가 정의되지 않음**.

```cpp
// FileSystem.cpp
class FileSystem { /* ... */ };
FileSystem theFS;                      // 전역 static

// Directory.cpp
extern FileSystem theFS;

class Directory {
public:
    Directory() {
        size_t disks = theFS.numDisks();   // ⚠️ theFS 초기화 전일 수 있음
    }
};

Directory tempDir(...);                // 전역 static, Directory.cpp에 있음
```

`tempDir`가 `theFS`보다 먼저 초기화될 가능성이 있고, 그러면 **uninitialized 객체에 메서드 호출** — UB.

### 해결: Meyers' Singleton (function-local static)

```cpp
// FileSystem.cpp
FileSystem& getTheFileSystem() {
    static FileSystem fs;     // 첫 호출 시 초기화 — 사용 시점 보장
    return fs;
}

// Directory.cpp
extern FileSystem& getTheFileSystem();

Directory::Directory() {
    size_t disks = getTheFileSystem().numDisks();   // ✅ 항상 안전
}
```

**왜 동작하나**: 함수 안의 static은 그 함수가 **처음 호출되는 순간** 초기화. 다른 컴파일 단위에 있어도, 의존 관계가 호출로 표현되므로 순서가 결정적.

### 스레드 안전성 — C++11 magic statics

```cpp
// C++11+ 표준 보장 — 동시 첫 호출도 안전
FileSystem& getTheFileSystem() {
    static FileSystem fs;     // thread-safe initialization 보장
    return fs;
}
```

여러 스레드가 동시에 처음 호출해도 **단 한 번만 초기화**됨. C++03까지는 직접 lock 필요했지만 C++11 표준이 처리.

## 모던 변형

### in-class 멤버 초기화 (C++11+)

생성자가 여러 개일 때 default 값 중복을 피할 수 있음.

```cpp
class Widget {
    int               count   = 0;             // C++11 default member init
    std::string       name    = "Untitled";
    std::vector<int>  data    {1, 2, 3};
public:
    Widget() = default;                          // count=0, name="Untitled"...
    Widget(int c) : count(c) {}                  // count만 다르게, 나머지는 default
    Widget(int c, std::string n) : count(c), name(std::move(n)) {}
};
```

각 생성자에서 모든 멤버를 적을 필요 없음.

### designated initializers (C++20)

aggregate 타입에 한해 이름으로 초기화.

```cpp
struct Config {
    int    port    = 8080;
    bool   verbose = false;
    std::string host = "localhost";
};

Config c{.port = 9000, .verbose = true};   // host는 default
```

## 실무 가이드 — 체크리스트

- [ ] 함수 안의 내장 타입 변수는 모두 초기화되어 있는가? (`= 0`, `{0}`, `nullptr`)
- [ ] 클래스 생성자는 멤버 초기화 리스트를 쓰고 있는가?
- [ ] 초기화 리스트는 **선언 순서**와 일치하는가?
- [ ] 다른 컴파일 단위의 static에 의존하는 코드는 함수-local static으로 우회?
- [ ] 멤버에 default 값이 있다면 in-class init으로 중복 제거?

## 핵심 정리

1. **내장 타입은 자동 초기화 안 됨** (블록 스코프) — 항상 명시
2. **초기화 리스트**가 본문 대입보다 효율적 — const·참조·non-default ctor 멤버는 강제
3. 초기화 리스트는 **클래스 멤버 선언 순서**대로 — 적힌 순서 무관
4. **TU 간 static 순서 fiasco**는 function-local static (Meyers' singleton)으로 우회
5. C++11+ **magic static**으로 함수-local static은 thread-safe 보장
6. C++11+ **in-class member initializer**로 default 값 중복 제거

## 관련 항목

- [항목 5: C++가 자동 작성하는 함수들](/blog/programming/cpp/effective-cpp/item05-know-what-functions-cpp-silently-writes) — 기본 생성자 자동 생성
- [항목 13: 자원 관리에는 객체](/blog/programming/cpp/effective-cpp/item13-use-objects-to-manage-resources) — RAII는 초기화의 한 적용
- [항목 26: 변수 정의를 가능한 늦춰라](/blog/programming/cpp/effective-cpp/item26-postpone-variable-definitions-as-long-as-possible) — 의미 있는 값을 가질 때 정의
