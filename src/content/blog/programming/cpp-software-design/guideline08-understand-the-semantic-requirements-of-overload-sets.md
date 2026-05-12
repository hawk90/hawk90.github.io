---
title: "가이드라인 8: 오버로드 집합의 의미적 요구사항을 이해하라"
date: 2026-05-13T18:00:00
description: "함수 오버로드도 인터페이스 — 같은 이름은 같은 의미여야. std::swap, std::begin 같은 표준 customization point."
tags: [C++, Software Design, Overloading, Customization Point]
series: "C++ Software Design"
seriesOrder: 8
---

## 왜 이 가이드라인이 중요한가?

함수 오버로드 — C++의 일상:

```cpp
void log(int);
void log(double);
void log(const std::string&);
```

이건 — **하나의 인터페이스**처럼 동작한다. 사용자가 "log를 부른다"고 생각하지, "log(int) vs log(double) 중 어느 거"를 생각하지 않음.

오버로드 집합(overload set)이 — 의미상 같지 않으면:

```cpp
void process(int x);          // 정수 처리
void process(const Order&);   // 주문 처리 — 의미 완전 다름
```

사용자가 — "**process**" 호출 시점에 어느 의미인지 안 보임. 의미적 일관성 깨짐. **인터페이스로서의 오버로드 집합**이 잘못 설계됨.

이 가이드라인은 — 오버로드 집합을 **단일 인터페이스**로 다루는 원칙 + C++ 표준 customization point(`std::swap`, `std::begin` 등)의 의미.

## 핵심 내용

- 함수 오버로드 집합 = **하나의 인터페이스** — 같은 이름은 같은 의미
- 모든 오버로드가 — **같은 의미 + 같은 사전·사후조건** (LSP가 함수 수준에도)
- C++ 표준의 **customization point** — `swap`, `begin`, `end` 등 — 같은 의미 강제
- ADL(Argument-Dependent Lookup) + `using` — customization의 메커니즘
- C++20 **customization point objects** (CPOs) — 더 안전한 모던 도구

## 비교 — 좋은 vs 나쁜 오버로드

### Bad: 같은 이름, 다른 의미

```cpp
class Logger {
public:
    void log(int level);              // ⚠️ 로그 레벨 설정
    void log(const std::string& msg); // ⚠️ 메시지 출력
};

logger.log(3);                // 레벨 설정? 메시지?
logger.log("error");          // 메시지 출력
```

`log(3)` — 레벨 설정인지 정수 메시지 출력인지 불명확. 의미가 다르므로 **이름이 달라야**.

### Good: 의미별 다른 이름

```cpp
class Logger {
public:
    void set_level(int level);
    void log(const std::string& msg);
};
```

또는 — 같은 이름 유지하되 의미를 일치:

```cpp
class Logger {
public:
    void log(int x);                  // 정수 메시지 출력
    void log(double x);               // 부동소수 메시지 출력
    void log(const std::string& msg); // 문자열 메시지 출력
    // 모두 "로깅"이라는 같은 의미
};
```

## 오버로드 집합 = 인터페이스

오버로드 집합의 **모든 함수가 만족해야 할 약속**:

1. **같은 의미** — 사용자가 "이 이름을 부른다"고 생각하는 의미
2. **같은 사전조건 / 사후조건** (호환 가능한)
3. **같은 예외 보장**
4. **같은 부작용 패턴**

이게 — **함수 레벨의 LSP** (가이드라인 6).

```cpp
// 모든 size() 오버로드 — 같은 의미: "컨테이너의 원소 개수"
size_t size(const std::vector<int>&);
size_t size(const std::list<int>&);
size_t size(const std::string&);
size_t size(const std::array<int, 10>&);
```

사용자가 `size(c)` 부를 때 — c의 타입에 무관하게 같은 의미.

## std::swap — Customization Point

C++ 표준의 가장 유명한 customization point:

```cpp
namespace std {
    template<typename T>
    void swap(T& a, T& b) noexcept(...) {
        T tmp = std::move(a);
        a = std::move(b);
        b = std::move(tmp);
    }
}

// 사용자 타입을 위한 swap 오버로드
namespace mylib {
    class Widget {
        // ...
    };
    
    void swap(Widget& a, Widget& b) noexcept {     // 같은 namespace에
        // ... 효율적 swap (예: pointer 교환) ...
    }
}
```

표준 사용 패턴:

```cpp
template<typename T>
void doSomething(T& a, T& b) {
    using std::swap;     // ADL 후보로 std::swap 등록
    swap(a, b);          // unqualified — ADL이 mylib::swap 찾음
                         // 또는 std::swap fallback
}
```

이 패턴이 — `std::swap`을 **customization point**로 만듦. 사용자가 자기 타입에 더 효율적인 swap 제공 가능.

**핵심**: `mylib::swap`이 — `std::swap`과 **같은 의미** (두 변수 값 교환). 의미가 같지 않으면 — 패턴 깨짐.

## std::begin / std::end / std::size

```cpp
namespace std {
    template<typename C>
    auto begin(C& c) -> decltype(c.begin()) { return c.begin(); }
    
    template<typename T, size_t N>
    T* begin(T (&arr)[N]) { return arr; }     // C 배열 특수화
}

// 사용자 타입
namespace mylib {
    class MyContainer {
        // begin() 멤버 정의 — std::begin이 호출
    };
}

// 또는 사용자가 std::begin 오버로드 (드뭄)
```

표준이 — `begin`, `end`, `size`, `data` 등에 같은 패턴. **컨테이너 인터페이스**를 통일.

## C++20 ranges — customization point objects (CPOs)

C++20부터 — `std::ranges::swap`, `std::ranges::begin` 등이 **CPO**(Customization Point Object):

```cpp
namespace std::ranges {
    inline constexpr auto begin = /* CPO impl */;
}

// 사용
std::ranges::begin(container);     // 더 안전한 customization
```

CPO 이점:
- **using std::swap 불필요** — 자동으로 ADL + fallback
- **함수 포인터로 사용 가능** — function object
- **잘못된 사용 차단** — 더 안전

```cpp
auto f = std::ranges::begin;     // 함수 객체로 받음
container | std::views::transform(f);     // pipe 가능
```

## 어떻게 customization 가능한가 — ADL

```cpp
namespace mylib {
    class Widget { /* ... */ };
    
    // 같은 namespace에 swap 정의
    void swap(Widget& a, Widget& b);
}

void user_code() {
    mylib::Widget a, b;
    using std::swap;
    swap(a, b);    // ADL이 mylib namespace 검색 → mylib::swap 찾음
}
```

**ADL** (Argument-Dependent Lookup) — 매개변수 타입의 namespace에서 함수 검색. customization point의 핵심.

규칙:
1. 사용자 타입과 — **같은 namespace에** customization 함수 정의
2. 함수 이름이 — 표준의 customization point와 정확히 일치
3. `using std::swap;` (또는 CPO) 후 unqualified 호출

## 함정 — 의미 다른 오버로드

```cpp
namespace mylib {
    class Container { /* ... */ };
    
    void swap(Container& a, Container& b);     // ⚠️ 정말 swap?
    // 만약 swap이 — "두 컨테이너의 원소를 합치는 함수"라면? — 잘못된 사용
}
```

`swap`이라는 이름 — 표준 의미("값 교환")가 강제. 다른 의미면 — 다른 이름 (`merge`, `combine` 등).

표준의 customization point 이름:
- `swap` — 값 교환
- `begin`, `end`, `cbegin`, `cend` — iterator 반환
- `size`, `empty`, `data` — 컨테이너 메타
- `hash` — 해시 함수
- `to_string`, `from_string` — 변환

이 이름들을 사용자가 정의 시 — **표준 의미 그대로** 지켜야.

## 함정 — 멤버 vs 비-멤버

```cpp
class Container {
public:
    void swap(Container& other);     // 멤버 swap
};

namespace mylib {
    class Container { /* ... */ };
    void swap(Container& a, Container& b);     // 비-멤버 swap
}
```

표준이 — **비-멤버 + ADL** 권장. 멤버 swap이 있다면 비-멤버는 멤버 호출:

```cpp
namespace mylib {
    class Container {
    public:
        void swap(Container& other) noexcept { /* 본문 */ }
    };
    
    inline void swap(Container& a, Container& b) noexcept {     // ADL용
        a.swap(b);
    }
}
```

표준 컨테이너 (`std::vector`, `std::list`) — 모두 이 패턴.

## 함정 — 함수 템플릿 부분 특수화

```cpp
namespace std {
    template<>
    void swap<MyType>(MyType& a, MyType& b) {     // ⚠️ 함수 템플릿 부분 특수화
        // ...
    }
}
```

- **함수 템플릿 부분 특수화는 표준상 금지**
- 전체 특수화는 OK지만 — 사용자 코드의 ADL과 충돌 가능
- **올바른 방법**: 사용자 namespace에 비-멤버 함수 (위에 본 패턴)

C++ 표준 라이브러리도 — 사용자가 `std::swap`을 특수화하지 말고 ADL용 함수를 자기 namespace에 두라고 권고.

## 오버로드 vs 템플릿 — 차이

```cpp
// 오버로드 — 다른 매개변수 타입
void log(int);
void log(double);
void log(const std::string&);

// 템플릿 — 같은 코드, 다른 인스턴스
template<typename T>
void log(const T& x);
```

오버로드 — **각 타입별 다른 동작** 가능.
템플릿 — **같은 동작** 모든 타입.

종종 — **템플릿 + 오버로드 혼합**:

```cpp
template<typename T>
void log(const T& x) { /* 일반 동작 */ }

// 특정 타입 — 다른 동작
void log(const SecureData& x);     // 비밀번호 마스킹 후 로그
```

오버로드 우선 (특정 타입), 템플릿 fallback (그 외).

## 함정 — 의도치 않은 오버로드 매칭

```cpp
void process(int x);
void process(unsigned int x);
void process(long x);

process(0);     // int — OK
process(0u);    // unsigned int — OK
process(0L);    // long — OK

process(0.0);   // ⚠️ 어느 것? — 모호 또는 자동 변환
```

너무 많은 오버로드 — 매칭 모호. 사용자가 — 의도하지 않은 변환으로 잘못된 오버로드 호출.

해결:
- 오버로드 수 줄임
- `=delete`로 특정 타입 차단:

```cpp
void process(int);
void process(double) = delete;     // double 호출 차단
```

## 함정 — 변환 함수 + 오버로드

```cpp
class Number {
public:
    operator int() const;       // int 변환
    operator double() const;    // double 변환
};

void process(int);
void process(double);

Number n;
process(n);     // ⚠️ 모호 — int? double?
```

암묵 변환 + 오버로드 — 자주 모호. `explicit`로 차단:

```cpp
class Number {
public:
    explicit operator int() const;
    explicit operator double() const;
};
```

## C++20 concept과 오버로드

```cpp
template<std::integral T>
void process(T x);     // 정수 타입

template<std::floating_point T>
void process(T x);     // 부동소수
```

concept으로 — **타입 카테고리별 오버로드**. 명확.

## 멤버 함수 오버로드 — `const` / ref-qualifier

```cpp
class C {
public:
    int& get() &;            // lvalue
    int&& get() &&;          // rvalue
    const int& get() const&;  // const lvalue
};
```

`&`, `&&`, `const&` qualifier로 — 호출 컨텍스트별 다른 오버로드. 모던 C++ 패턴.

## 의미 일관성 — 4가지 신호

오버로드 집합이 — 같은 의미인지 검증:

### 1) 같은 이름이 같은 동작을 하는가?

```cpp
void send(Email);        // 이메일 발송
void send(SmsMessage);   // SMS 발송
// 모두 "발송" — 같은 의미 OK
```

### 2) 사후 조건이 같은가?

```cpp
size_t count(const std::vector<int>&);     // post: 컨테이너 원소 개수
size_t count(const std::map<K, V>&);        // 같은 의미
```

### 3) 부작용 패턴이 같은가?

```cpp
void log(int);            // 로그 파일에 기록
void log(double);         // 로그 파일에 기록 (같음)
void log(SecureData);     // ⚠️ 마스킹 후 기록 — 약간 다른 부작용?
```

후자가 — 의미 차이가 있으면 다른 이름:

```cpp
void log_secure(SecureData);     // 명시
```

### 4) 예외 보장이 같은가?

```cpp
void parse(const std::string&);    // throw on invalid
bool try_parse(const std::string&, int& out);     // throw X
```

같은 의미라도 — 예외 보장이 다르면 다른 이름 (`parse` vs `try_parse`). 표준의 `std::stoi` vs `std::from_chars`.

## 표준의 비슷한 패턴

```cpp
// 같은 의미 — 여러 형태
std::stoi vs std::stol vs std::stoll        // 변환, 다른 반환 타입
std::ostream::operator<< 오버로드           // 모두 stream에 출력
std::array, std::vector 모두 begin/end       // 같은 의미
```

표준이 — overload set의 의미 일관성 모범.

## 모던 변형 — Tag Dispatch

```cpp
struct sequential_tag {};
struct parallel_tag {};

template<typename Container>
void sort(Container& c, sequential_tag);

template<typename Container>
void sort(Container& c, parallel_tag);

sort(v, sequential_tag{});     // 명시적 선택
sort(v, parallel_tag{});
```

태그로 — 의미적으로 다른 동작을 같은 이름으로 묶음. 표준 `std::execution::par` 등.

## 함정 — `T*` 와 `nullptr_t`

```cpp
void f(int*);
void f(std::nullptr_t);

f(nullptr);     // nullptr_t 매칭
f(NULL);        // int* (NULL이 0)? — 함정
```

`NULL`은 — 보통 `0`(int). `nullptr`만 사용 권장. C++11+ 모던 코드.

## 실무 가이드 — 오버로드 작성 시

- [ ] 모든 오버로드가 — **같은 의미**?
- [ ] 같은 **사전·사후조건**?
- [ ] 같은 **예외 보장**?
- [ ] 같은 **부작용 패턴**?
- [ ] 의미가 다르면 — 다른 이름?
- [ ] 표준 customization point 이름은 — **표준 의미** 지킴?
- [ ] 사용자 타입 — 같은 namespace에 customization?

## 실무 가이드 — 호출자 측

```cpp
template<typename T>
void doSomething(T& a, T& b) {
    using std::swap;     // ADL 활성화 + std::swap fallback
    swap(a, b);          // unqualified 호출
}
```

표준 customization point 사용 시 — 이 패턴 기본.

C++20:

```cpp
template<typename T>
void doSomething(T& a, T& b) {
    std::ranges::swap(a, b);     // CPO — 자동 ADL
}
```

## 정리

오버로드 집합 = **하나의 인터페이스**. 같은 이름은 같은 의미여야.

원칙:
1. 모든 오버로드 — **같은 의미 + 같은 계약**
2. 의미 다르면 — 다른 이름
3. 표준 customization point — 표준 의미 지킴
4. **ADL + namespace** — 표준 customization 메커니즘
5. C++20 **CPO** — 더 안전

도구:
- `using std::swap; swap(a, b)` — 표준 idiom
- C++20 `std::ranges::swap` — CPO
- `=delete` — 의도치 않은 오버로드 차단
- concept — 명시적 타입 카테고리

## 관련 항목

- [가이드라인 6: 추상화의 기대 동작](/blog/programming/cpp-software-design/guideline06-adhere-to-the-expected-behavior-of-abstractions) — LSP의 함수 레벨
- [Effective C++ 항목 23: 비-멤버 비-friend](/blog/programming/effective-cpp/item23-prefer-non-member-non-friend-functions-to-member-functions) — ADL 활용
- [Effective C++ 항목 25: non-throwing swap](/blog/programming/effective-cpp/item25-consider-support-for-a-non-throwing-swap) — customization point의 모범
- [Beautiful C++ 항목 5: 한 선언 한 이름](/blog/programming/beautiful-cpp/item05-one-declaration-per-name) — 오버로드와 이름
