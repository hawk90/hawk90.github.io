---
title: "가이드라인 8: 오버로드 집합의 의미적 요구사항을 이해하라"
date: 2026-05-13T08:00:00
description: "함수 오버로드도 인터페이스다. 같은 이름은 같은 의미여야 하고, std::swap이나 std::begin 같은 customization point도 같은 원칙을 따른다."
tags: [C++, Software Design, Overloading, Customization Point]
series: "C++ Software Design"
seriesOrder: 8
draft: true
---

## 왜 이 가이드라인이 중요한가?

함수 오버로드는 C++의 일상이다.

```cpp
void log(int);
void log(double);
void log(const std::string&);
```

이 셋은 **하나의 인터페이스**처럼 동작한다. 사용자는 "log를 부른다"라고 생각하지, "`log(int)`와 `log(double)` 중 어느 쪽이지?"를 묻지 않는다.

오버로드 집합(overload set)의 의미가 같지 않으면 곤란해진다.

```cpp
void process(int x);          // 정수 처리
void process(const Order&);   // 주문 처리 — 의미가 완전히 다르다
```

사용자가 `process`를 호출하는 시점에 어느 의미인지 보이지 않는다. 의미적 일관성이 깨지고, 인터페이스로서의 오버로드 집합 설계가 잘못된 것이다.

이 가이드라인은 두 가지를 다룬다. 첫째, 오버로드 집합을 단일 인터페이스로 다루는 원칙. 둘째, C++ 표준의 customization point(`std::swap`, `std::begin` 등)가 같은 원칙을 어떻게 강제하는지.

## 핵심 내용

- 함수 오버로드 집합은 **하나의 인터페이스**다. 같은 이름이면 같은 의미여야 한다.
- 모든 오버로드가 같은 의미와 같은 사전·사후조건을 가진다(함수 수준의 LSP).
- C++ 표준의 **customization point** — `swap`, `begin`, `end` 등 — 가 이 원칙을 강제한다.
- 메커니즘은 ADL(Argument-Dependent Lookup)과 `using`이다.
- C++20 **customization point objects(CPO)** 는 더 안전한 모던 도구다.

## 비교 — 좋은 오버로드와 나쁜 오버로드

### Bad — 같은 이름에 다른 의미를 담는다

```cpp
class Logger {
public:
    void log(int level);              // ⚠️ 로그 레벨 설정
    void log(const std::string& msg); // ⚠️ 메시지 출력
};

logger.log(3);                // 레벨 설정인가, 메시지 출력인가?
logger.log("error");          // 메시지 출력
```

`log(3)`이 레벨 설정인지 정수 메시지 출력인지 호출부에서는 보이지 않는다. 의미가 다르다면 이름을 갈라야 한다.

### Good — 의미가 다르면 이름을 가른다

```cpp
class Logger {
public:
    void set_level(int level);
    void log(const std::string& msg);
};
```

또는 같은 이름을 유지하고 모든 오버로드의 의미를 일치시킨다.

```cpp
class Logger {
public:
    void log(int x);                  // 정수 메시지 출력
    void log(double x);               // 부동소수 메시지 출력
    void log(const std::string& msg); // 문자열 메시지 출력
    // 모두 "로깅"이라는 같은 의미를 공유한다
};
```

## 오버로드 집합은 인터페이스다

오버로드 집합의 모든 함수가 다음을 함께 지켜야 한다.

1. 같은 의미 — 사용자가 그 이름을 부를 때 떠올리는 의미.
2. 같은(혹은 호환되는) 사전조건과 사후조건.
3. 같은 예외 보장.
4. 같은 부작용 패턴.

이것이 **함수 수준의 LSP**다(가이드라인 6의 확장).

```cpp
// 모든 size() 오버로드는 같은 의미를 갖는다: "컨테이너 원소의 개수"
size_t size(const std::vector<int>&);
size_t size(const std::list<int>&);
size_t size(const std::string&);
size_t size(const std::array<int, 10>&);
```

사용자가 `size(c)`를 부를 때, `c`의 타입과 무관하게 같은 의미를 기대할 수 있다.

## std::swap — Customization Point

C++ 표준의 가장 유명한 customization point는 `std::swap`이다.

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

    void swap(Widget& a, Widget& b) noexcept {     // 같은 namespace에 둔다
        // ... 효율적인 swap (예: 포인터 교환) ...
    }
}
```

표준 사용 패턴은 이렇게 생겼다.

```cpp
template<typename T>
void doSomething(T& a, T& b) {
    using std::swap;     // ADL 후보로 std::swap을 등록한다
    swap(a, b);          // unqualified — ADL이 mylib::swap을 찾거나
                         // 없으면 std::swap이 fallback이 된다
}
```

이 패턴이 `std::swap`을 customization point로 만든다. 사용자가 자기 타입에 더 효율적인 swap을 제공할 수 있다.

핵심은 `mylib::swap`이 `std::swap`과 **같은 의미**(두 변수의 값을 바꿈)를 가져야 한다는 점이다. 의미가 다르면 패턴이 무너진다.

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
        // begin() 멤버를 정의해 두면 std::begin이 호출해 준다
    };
}
```

표준이 `begin`, `end`, `size`, `data` 같은 이름에 동일한 패턴을 적용한다. 컨테이너 인터페이스가 통일된다.

## C++20 ranges — customization point objects (CPO)

C++20부터 `std::ranges::swap`, `std::ranges::begin` 같은 것들이 **CPO**(Customization Point Object) 로 제공된다.

```cpp
namespace std::ranges {
    inline constexpr auto begin = /* CPO impl */;
}

// 사용
std::ranges::begin(container);     // 더 안전한 customization
```

CPO의 이점은 다음과 같다.

- `using std::swap`이 필요 없다. ADL과 fallback이 자동으로 처리된다.
- 함수 포인터처럼 받을 수 있다(function object다).
- 잘못된 사용을 차단해 더 안전하다.

```cpp
auto f = std::ranges::begin;     // 함수 객체로 받는다
container | std::views::transform(f);     // pipe로 흘릴 수도 있다
```

## 어떻게 customization이 동작하는가 — ADL

```cpp
namespace mylib {
    class Widget { /* ... */ };

    // 같은 namespace에 swap을 정의한다
    void swap(Widget& a, Widget& b);
}

void user_code() {
    mylib::Widget a, b;
    using std::swap;
    swap(a, b);    // ADL이 mylib namespace를 검색한다 → mylib::swap을 찾는다
}
```

**ADL(Argument-Dependent Lookup)** 은 매개변수 타입의 namespace에서 함수를 찾는다. customization point의 핵심 메커니즘이다.

규칙은 단순하다.

1. 사용자 타입과 **같은 namespace에** customization 함수를 정의한다.
2. 함수 이름은 표준의 customization point와 정확히 일치시킨다.
3. `using std::swap;`(또는 CPO) 다음에 unqualified로 호출한다.

## 함정 — 의미가 다른 오버로드

```cpp
namespace mylib {
    class Container { /* ... */ };

    void swap(Container& a, Container& b);     // ⚠️ 정말로 swap의 의미인가?
    // 만약 "두 컨테이너의 원소를 합치는" 함수라면 잘못된 이름이다.
}
```

`swap`이라는 이름에는 표준 의미("값을 교환한다")가 강제된다. 다른 의미라면 다른 이름(`merge`, `combine` 등)을 써야 한다.

표준의 주요 customization point 이름은 다음과 같다.

- `swap` — 값 교환
- `begin`, `end`, `cbegin`, `cend` — iterator 반환
- `size`, `empty`, `data` — 컨테이너 메타 정보
- `hash` — 해시 함수
- `to_string`, `from_string` — 변환

이 이름들을 사용자가 정의할 때는 표준 의미를 그대로 지켜야 한다.

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

표준은 **비-멤버 + ADL** 패턴을 권장한다. 멤버 swap이 있다면 비-멤버 함수는 멤버를 호출한다.

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

표준 컨테이너(`std::vector`, `std::list` 등)가 모두 이 패턴을 따른다.

## 함정 — 함수 템플릿의 부분 특수화

```cpp
namespace std {
    template<>
    void swap<MyType>(MyType& a, MyType& b) {     // ⚠️ 함수 템플릿 부분 특수화
        // ...
    }
}
```

- 함수 템플릿의 부분 특수화는 표준상 금지된다.
- 전체 특수화는 허용되지만 사용자 코드의 ADL과 충돌할 수 있다.
- 올바른 방법은 사용자 namespace에 비-멤버 함수를 두는 것이다(위에 본 패턴).

C++ 표준 라이브러리도 `std::swap`을 특수화하지 말고 ADL용 함수를 자기 namespace에 두라고 권한다.

## 오버로드와 템플릿의 차이

```cpp
// 오버로드 — 매개변수 타입별 다른 함수
void log(int);
void log(double);
void log(const std::string&);

// 템플릿 — 같은 코드, 다른 인스턴스
template<typename T>
void log(const T& x);
```

오버로드는 각 타입별로 동작이 다를 수 있다. 템플릿은 모든 타입에 같은 동작을 적용한다.

종종 둘을 섞어 쓴다.

```cpp
template<typename T>
void log(const T& x) { /* 일반 동작 */ }

// 특정 타입에만 다른 동작
void log(const SecureData& x);     // 비밀번호를 마스킹한 뒤 로깅
```

오버로드가 우선이고(특정 타입), 템플릿이 fallback이다(그 외).

## 함정 — 의도치 않은 오버로드 매칭

```cpp
void process(int x);
void process(unsigned int x);
void process(long x);

process(0);     // int — OK
process(0u);    // unsigned int — OK
process(0L);    // long — OK

process(0.0);   // ⚠️ 어느 것? — 모호하거나 자동 변환된다
```

오버로드가 너무 많으면 매칭이 모호해진다. 사용자가 의도하지 않은 변환으로 잘못된 오버로드를 부르게 된다.

해법은 두 가지다.

- 오버로드 수를 줄인다.
- `=delete`로 특정 타입을 차단한다.

```cpp
void process(int);
void process(double) = delete;     // double 호출을 차단한다
```

## 함정 — 변환 함수와 오버로드

```cpp
class Number {
public:
    operator int() const;       // int로 변환
    operator double() const;    // double로 변환
};

void process(int);
void process(double);

Number n;
process(n);     // ⚠️ 모호하다 — int? double?
```

암묵 변환과 오버로드가 만나면 자주 모호해진다. `explicit`로 변환을 명시적으로 만든다.

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

concept으로 타입 카테고리별로 오버로드를 가른다. 의도가 분명하게 드러난다.

## 멤버 함수 오버로드 — `const`와 ref-qualifier

```cpp
class C {
public:
    int& get() &;             // lvalue
    int&& get() &&;           // rvalue
    const int& get() const&;  // const lvalue
};
```

`&`, `&&`, `const&` qualifier로 호출 컨텍스트별 오버로드를 가른다. 모던 C++에서 자주 쓰는 패턴이다.

## 의미 일관성 — 네 가지 체크

오버로드 집합이 같은 의미를 가지는지 확인하는 질문이다.

### 1) 같은 이름이 같은 동작을 하는가?

```cpp
void send(Email);        // 이메일 발송
void send(SmsMessage);   // SMS 발송
// 둘 다 "발송"이라는 같은 의미. OK.
```

### 2) 사후조건이 같은가?

```cpp
size_t count(const std::vector<int>&);     // post: 컨테이너 원소 개수
size_t count(const std::map<K, V>&);        // 같은 의미
```

### 3) 부작용 패턴이 같은가?

```cpp
void log(int);            // 로그 파일에 기록한다
void log(double);         // 로그 파일에 기록한다 (같다)
void log(SecureData);     // ⚠️ 마스킹한 뒤에 기록한다 — 부작용이 다른가?
```

후자처럼 의미 차이가 있다면 이름을 가른다.

```cpp
void log_secure(SecureData);     // 의도를 이름에 드러낸다
```

### 4) 예외 보장이 같은가?

```cpp
void parse(const std::string&);                    // 잘못된 입력에 throw
bool try_parse(const std::string&, int& out);     // throw하지 않는다
```

같은 의미라도 예외 보장이 다르면 이름을 가른다(`parse`와 `try_parse`). 표준의 `std::stoi`와 `std::from_chars`도 같은 사고다.

## 표준 라이브러리의 비슷한 패턴

```cpp
// 같은 의미를 여러 형태로
std::stoi vs std::stol vs std::stoll        // 변환, 반환 타입이 다르다
std::ostream::operator<< 오버로드           // 모두 stream에 출력
std::array, std::vector 모두 begin/end       // 같은 의미
```

표준 라이브러리가 오버로드 집합의 의미 일관성에서 모범이다.

## 모던 변형 — Tag Dispatch

```cpp
struct sequential_tag {};
struct parallel_tag {};

template<typename Container>
void sort(Container& c, sequential_tag);

template<typename Container>
void sort(Container& c, parallel_tag);

sort(v, sequential_tag{});     // 의도를 명시적으로 표현한다
sort(v, parallel_tag{});
```

태그로 의미적으로 다른 동작을 같은 이름 아래 묶는다. 표준의 `std::execution::par` 같은 것이 이 패턴이다.

## 함정 — `T*`와 `nullptr_t`

```cpp
void f(int*);
void f(std::nullptr_t);

f(nullptr);     // nullptr_t에 매칭된다
f(NULL);        // int*? (NULL이 0이라면) — 함정이다
```

`NULL`은 보통 `0`(int)이라 의도와 다른 오버로드가 잡힌다. C++11 이후 모던 코드는 `nullptr`만 쓴다.

## 실무 가이드 — 오버로드를 작성할 때

- [ ] 모든 오버로드가 같은 의미를 갖는가?
- [ ] 같은 사전·사후조건을 따르는가?
- [ ] 같은 예외 보장을 제공하는가?
- [ ] 같은 부작용 패턴을 갖는가?
- [ ] 의미가 다르다면 이름도 가르고 있는가?
- [ ] 표준 customization point 이름이라면 표준 의미를 지키는가?
- [ ] 사용자 타입에 대한 customization을 같은 namespace에 두었는가?

## 실무 가이드 — 호출하는 쪽

```cpp
template<typename T>
void doSomething(T& a, T& b) {
    using std::swap;     // ADL을 활성화하고 std::swap을 fallback으로 둔다
    swap(a, b);          // unqualified로 호출한다
}
```

표준 customization point를 부를 때의 기본 패턴이다.

C++20에서는 더 간결하다.

```cpp
template<typename T>
void doSomething(T& a, T& b) {
    std::ranges::swap(a, b);     // CPO가 ADL을 알아서 처리한다
}
```

## 정리

오버로드 집합은 하나의 인터페이스다. 같은 이름은 같은 의미를 가져야 한다.

원칙은 다음과 같다.

1. 모든 오버로드가 같은 의미와 같은 계약을 따른다.
2. 의미가 다르다면 이름도 가른다.
3. 표준 customization point는 표준의 의미를 그대로 지킨다.
4. **ADL + namespace** 가 표준 customization의 메커니즘이다.
5. C++20 **CPO**가 더 안전한 모던 도구다.

도구는 다음이 있다.

- `using std::swap; swap(a, b)` — 표준 idiom
- C++20 `std::ranges::swap` — CPO
- `=delete` — 의도치 않은 오버로드 차단
- concept — 타입 카테고리별 명시적 가르기

## 관련 항목

- [가이드라인 6: 추상화의 기대 동작](/blog/programming/cpp/cpp-software-design/guideline06-adhere-to-the-expected-behavior-of-abstractions) — 함수 수준의 LSP
- [Effective C++ 항목 23: 비-멤버 비-friend 함수](/blog/programming/cpp/effective-cpp/item23-prefer-non-member-non-friend-functions-to-member-functions) — ADL 활용
- [Effective C++ 항목 25: non-throwing swap](/blog/programming/cpp/effective-cpp/item25-consider-support-for-a-non-throwing-swap) — customization point의 모범 사례
- [Beautiful C++ 항목 5: 한 선언에는 한 이름](/blog/programming/cpp/beautiful-cpp/item05-one-declaration-per-name) — 오버로드와 이름
