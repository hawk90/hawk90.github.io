---
title: "항목 4: 사용 전에 객체를 반드시 초기화하라"
date: 2025-02-01T13:00:00
description: "내장 타입 비초기화 함정, 멤버 초기화 리스트, 초기화 순서, static 초기화 순서 fiasco와 Meyers' singleton."
tags: [C++, Effective C++, Initialization]
series: "Effective C++"
seriesOrder: 4
---

## 왜 이 항목이 중요한가?

C++에서 "초기화"는 한마디로 정리하기 어렵다. 같은 `int x;`도 어디에 적혔는지에 따라 0이 되기도, 쓰레기 값이 되기도 한다. 클래스 멤버도 위치(초기화 리스트 vs 생성자 본문)와 작성 순서에 따라 동작이 다르다. 그리고 가장 까다로운 자리 — **다른 컴파일 단위의 static 객체끼리는 초기화 순서가 정해져 있지 않다**.

초기화되지 않은 객체에서 값을 읽으면 UB다. 운이 좋으면 디버그 빌드에서 잡히고, 운이 나쁘면 프로덕션에서 가끔만 깨진다.

이 항목은 네 가지 함정을 정리한다.

- 블록 스코프 내장 타입은 자동 초기화되지 않는다.
- 생성자 본문에서 멤버에 대입하면 두 단계(default-init + assign)가 일어난다.
- 멤버는 **선언 순서**로 초기화된다. 리스트 작성 순서가 아니다.
- TU(translation unit)간 static 객체는 순서가 미정이다. Meyers' singleton 패턴으로 우회한다.

## 개요

C++에서 "초기화"는 규칙이 단순해 보이지만 **여러 층의 예외**가 있다. 어떤 변수는 자동 초기화되지만 어떤 변수는 쓰레기 값이고, 같은 코드도 컴파일러나 빌드 옵션에 따라 결과가 달라진다. 초기화되지 않은 객체에서 값을 읽는 것은 UB다. **모든 객체를 사용 전에 명시적으로 초기화**하는 습관이 가장 안전하다.

## 필수 개념: 초기화의 종류

> **초보자를 위한 배경 지식**

<br>

C++ 표준은 여러 초기화 방식을 구분한다. 같은 이름의 변수가 어떤 초기화를 받는지는 위치와 문법에 따라 다르다.

| 초기화 종류 | 트리거 | 결과 (내장 타입) |
| --- | --- | --- |
| **Default initialization** | `int x;` (블록 안) | 쓰레기 값 |
| **Default initialization** | `int x;` (전역/static) | 0 |
| **Value initialization** | `int x{};`, `int x();` (C++03 함정), `new int()` | 0 |
| **Zero initialization** | static 저장 기간, 초기화 전 | 0 |
| **Aggregate initialization** | `int arr[3] = {1};` | `{1, 0, 0}` |

블록 스코프 내장 타입은 `int x;`만 적으면 **자동 초기화 안 됨**이다. 전역/static은 자동 0이다. 이 차이가 입문자가 가장 많이 빠지는 함정이다.

### 검출 — 컴파일러 경고와 sanitizer

비초기화 사용은 도구로 잡을 수 있다.

```bash
# 경고
g++ -Wall -Wuninitialized -Winit-self foo.cpp

# 런타임 검출
g++ -fsanitize=address,undefined -O1 -g foo.cpp
clang++ -fsanitize=memory foo.cpp     # MSAN — uninit read 검출
```

MSAN(MemorySanitizer)이 가장 정확하지만 Linux + Clang 한정이다. 일반 환경에선 `-Wuninitialized -O2`로 어느 정도 잡힌다 (최적화가 켜져야 더 잘 잡힘).

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

해결책은 **항상 초기치를 명시**하는 것이다.

```cpp
int    x  = 0;        // C 스타일
int    y(0);          // 함수 호출 문법
int    z{0};          // C++11 brace
int*   p  = nullptr;
double pi = 3.14;
bool   ok = false;
```

C++11 이후로는 `{}` brace init이 권장된다. **narrowing 변환을 차단**하고 모든 자리에서 동일하다.

## 클래스 멤버 — 생성자가 초기화 책임

```cpp
class Point {
    int x, y;
public:
    Point() {}   // ⚠️ x, y는 쓰레기!
};
```

생성자 본문 진입 시 멤버는 이미 **default-initialized** 상태다. 내장 타입 멤버는 쓰레기다. 생성자 본문에서 대입하면 **두 단계**가 일어난다 — 먼저 default 초기화, 그 다음 대입이다.

```cpp
Point() {
    x = 0;    // 두 번째 단계 — 사실은 "대입"
    y = 0;    // (default init은 이미 일어난 후)
}
```

`std::string` 같은 클래스 타입은 default-init도 의미 있는 동작(빈 string 생성)이다. 내장 타입만 함정이다.

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

생성자 본문은 멤버가 이미 default-init된 후 실행된다. 거기서 다시 대입하는 건 **default 생성 + 대입**의 두 단계다. string·vector처럼 무거운 타입에선 비효율이다.

초기화 리스트에 적으면 **곧바로 원하는 값으로 생성**된다. 단일 단계다.

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

본문에선 `id = i;`나 `ref = s;`가 컴파일 에러다. **반드시** 초기화 리스트다.

### move-only 멤버 — 초기화 리스트의 `std::move`

```cpp
class Owner {
    std::unique_ptr<Resource> p;
public:
    // ✅ rvalue 매개변수를 move로 멤버에 이동
    explicit Owner(std::unique_ptr<Resource> r)
        : p(std::move(r)) {}
};
```

`unique_ptr`은 복사 불가, 이동만 가능하다. 초기화 리스트에서 `std::move`로 이동하는 게 표준 패턴이다 ([EMC 항목 41](/blog/programming/cpp/effective-modern-cpp/item41-consider-pass-by-value-for-copyable-cheap-to-move-always-copied-params) 참고).

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

위 코드는 **버그**다. 멤버는 **클래스 선언 순서**대로 초기화된다. 리스트 작성 순서와 무관하다. `data`가 먼저 초기화되는 시점에 `size`는 아직 쓰레기다.

**규칙**: 초기화 리스트도 **선언 순서대로** 작성한다. 일관성 + 컴파일러 경고(-Wreorder)가 도움이 된다.

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

이게 진짜 사고로 이어지는 예는 [EMC 항목 37](/blog/programming/cpp/effective-modern-cpp/item37-make-std-threads-unjoinable-on-all-paths)의 ThreadRAII다. `std::thread` 멤버를 마지막에 두지 않으면 다른 멤버가 먼저 소멸되어 스레드가 죽은 자원을 본다.

## 다른 컴파일 단위의 static 객체 — 초기화 순서 fiasco

**문제**: 다른 .cpp 파일의 static 객체끼리는 **초기화 순서가 정의되지 않는다**.

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

`tempDir`가 `theFS`보다 먼저 초기화될 가능성이 있다. 그러면 **uninitialized 객체에 메서드 호출**이 일어난다. UB다.

이 버그가 무서운 이유는 **링크 순서**나 **컴파일러 버전 변경**에 따라 동작이 바뀐다는 것이다. 한 번 잘 돌던 코드가 빌드 환경 변경 후 갑자기 죽는다.

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

**왜 동작하나**: 함수 안의 static은 그 함수가 **처음 호출되는 순간** 초기화된다. 다른 컴파일 단위에 있어도, 의존 관계가 호출로 표현되므로 순서가 결정적이다.

### 스레드 안전성 — C++11 magic statics

```cpp
// C++11+ 표준 보장 — 동시 첫 호출도 안전
FileSystem& getTheFileSystem() {
    static FileSystem fs;     // thread-safe initialization 보장
    return fs;
}
```

여러 스레드가 동시에 처음 호출해도 **단 한 번만 초기화**된다. C++03까지는 직접 lock이 필요했지만 C++11 표준이 처리한다.

### Meyers' Singleton의 함정 — 종료 순서

생성 순서는 호출 순서로 결정되지만, **소멸 순서**는 그 역이다. 함수 A의 static이 함수 B의 static을 참조하면 다음 사고가 일어날 수 있다.

```cpp
FileSystem& getFS() { static FileSystem fs; return fs; }
Logger&     getLog() { static Logger l; return l; }

class Logger {
    ~Logger() { getFS().sync(); }   // ⚠️ fs가 먼저 소멸되었을 수 있음
};
```

소멸 시점에 의존성을 갖지 않도록 설계해야 한다. 또는 leak-on-purpose 패턴(`static Logger* l = new Logger;`)으로 소멸을 회피한다.

### `constinit` (C++20) — 정적 초기화 강제

C++20부터는 전역 변수에 **컴파일 타임 초기화**를 강제할 수 있다.

```cpp
constinit int counter = 0;          // ✅ 반드시 컴파일 타임 초기화
// dynamic initialization 발생 시 컴파일 에러
```

`constinit`은 초기화 시점만 강제하고 값은 변경 가능하다. fiasco가 일어나는 자리(dynamic init이 필요한 전역 객체)에는 적용이 안 되지만, 단순 상수의 안전성을 컴파일 타임에 보증한다.

## 모던 변형

### in-class 멤버 초기화 (C++11+)

생성자가 여러 개일 때 default 값 중복을 피할 수 있다.

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

각 생성자에서 모든 멤버를 적을 필요가 없다.

### designated initializers (C++20)

aggregate 타입에 한해 이름으로 초기화한다.

```cpp
struct Config {
    int    port    = 8080;
    bool   verbose = false;
    std::string host = "localhost";
};

Config c{.port = 9000, .verbose = true};   // host는 default
```

장점은 **이름이 코드에 박힌다**는 것이다. 위치 기반 초기화는 멤버 추가/순서 변경 시 조용히 깨지지만, 이름 기반은 컴파일 에러로 잡힌다.

제약은 두 가지다.

- **aggregate 타입**만 가능 (생성자 없는 단순 struct).
- **선언 순서대로** 작성해야 한다 (`{.host = ..., .port = ...}`는 C에선 OK지만 C++에선 에러).

### `[[no_unique_address]]` (C++20)과 default member init

빈 클래스나 zero-size optimization을 위한 attribute다. default member init과 함께 쓰면 명확하다.

```cpp
template<typename T, typename Allocator = std::allocator<T>>
class Vector {
    T*                                size_t       size  = 0;
    [[no_unique_address]] Allocator   alloc {};   // 보통 empty — 추가 메모리 X
};
```

빈 allocator는 컴파일러가 다른 멤버의 자리를 빌려쓴다. default init으로 초기화 의도를 명시한다.

## 실무 가이드 — 체크리스트

- [ ] 함수 안의 내장 타입 변수는 모두 초기화되어 있는가? (`= 0`, `{0}`, `nullptr`)
- [ ] 클래스 생성자는 멤버 초기화 리스트를 쓰고 있는가?
- [ ] 초기화 리스트는 **선언 순서**와 일치하는가?
- [ ] 다른 컴파일 단위의 static에 의존하는 코드는 함수-local static으로 우회?
- [ ] 멤버에 default 값이 있다면 in-class init으로 중복 제거?
- [ ] move-only 멤버는 `std::move`로 초기화 리스트에 옮기는가?
- [ ] `-Wall -Wuninitialized` 또는 sanitizer로 검증하는가?

## 핵심 정리

1. **내장 타입은 자동 초기화 안 됨** (블록 스코프). 항상 명시한다.
2. **초기화 리스트**가 본문 대입보다 효율적이다. const·참조·non-default ctor 멤버는 강제다.
3. 초기화 리스트는 **클래스 멤버 선언 순서**대로 작성한다. 적힌 순서는 무관하다.
4. **TU 간 static 순서 fiasco**는 function-local static (Meyers' singleton)으로 우회한다.
5. C++11+ **magic static**으로 함수-local static은 thread-safe가 보장된다.
6. C++11+ **in-class member initializer**로 default 값 중복을 제거한다.
7. C++20 **`constinit`** 으로 정적 초기화 시점을 컴파일러에 강제할 수 있다.

## 관련 항목

- [항목 5: C++가 자동 작성하는 함수들](/blog/programming/cpp/effective-cpp/item05-know-what-functions-cpp-silently-writes) — 기본 생성자 자동 생성
- [항목 13: 자원 관리에는 객체](/blog/programming/cpp/effective-cpp/item13-use-objects-to-manage-resources) — RAII는 초기화의 한 적용
- [항목 26: 변수 정의를 가능한 늦춰라](/blog/programming/cpp/effective-cpp/item26-postpone-variable-definitions-as-long-as-possible) — 의미 있는 값을 가질 때 정의
- [EMC 항목 17: 특수 멤버 자동 생성](/blog/programming/cpp/effective-modern-cpp/item17-understand-special-member-function-generation) — 자동 생성 규칙
- [EMC 항목 41: pass by value](/blog/programming/cpp/effective-modern-cpp/item41-consider-pass-by-value-for-copyable-cheap-to-move-always-copied-params) — by-value + move 패턴
