---
title: "항목 18: 인터페이스는 올바르게 쓰기 쉽고 잘못 쓰기 어렵게 만들라"
date: 2025-02-04T10:00:00
description: "타입 시스템·기본값·반환 타입·표준 관습으로 사용자 실수를 컴파일 타임에 차단하는 API 설계."
tags: [C++, Effective C++, API Design]
series: "Effective C++"
seriesOrder: 18
---

## 왜 이 항목이 중요한가?

좋은 API의 첫째 척도는 "사용자가 잘못 호출할 수 있는가"다. 주석으로 "조심하세요"를 적는 건 약한 방어다. 진짜 좋은 API는 **잘못된 사용이 컴파일 에러**가 되도록 설계된다.

대표적 예가 `Date(int, int, int)` 같은 시그니처다. 사용자는 `(month, day, year)`인지 `(year, month, day)`인지 매번 헷갈리고, 주석을 안 읽으면 조용히 잘못된 값을 만든다. 해결책은 `Month`, `Day`, `Year`라는 별도 타입을 도입해 컴파일러가 순서를 강제하게 하는 것이다.

이 항목은 API 설계의 네 가지 도구를 정리한다.

- **별도 타입**으로 의미를 박는다.
- **값 범위 제한** (enum class, 팩토리 함수).
- **표준 관습 일관성** (STL과 동일한 인터페이스).
- **스마트 포인터 반환**으로 자원 관리 의무를 자동화한다.

## 개요

좋은 인터페이스의 첫째 척도는 "사용자가 잘못 호출할 수 있는가"다. 주석으로 "조심하세요"라고 적는 대신, **타입 시스템이 잘못된 호출을 컴파일 타임에 차단**하도록 설계하면 한 부류의 버그가 통째로 사라진다. 이 항목은 그 설계 도구들 — 별도 타입, 값 범위 제한, 표준 관습 일관성, 스마트 포인터 반환 — 을 다룬다.

## 사례 1 — 의미 없는 매개변수 순서

```cpp
class Date {
public:
    Date(int month, int day, int year);
};

Date d1(30, 3, 1995);     // ⚠️ 30월 3일? 의미 모호
Date d2(2, 30, 1995);     // ⚠️ 2월 30일은 없는데 컴파일은 통과
```

세 `int`는 컴파일러에게 모두 동등 — 순서를 바꿔도 잡지 못함. 사용자는 매번 문서를 참조해야.

### 해결 — 별도 타입

```cpp
struct Day   { explicit Day(int d) : val(d) {}   int val; };
struct Month { explicit Month(int m) : val(m) {} int val; };
struct Year  { explicit Year(int y) : val(y) {}  int val; };

class Date {
public:
    Date(const Month& m, const Day& d, const Year& y);
};

Date d1(Day(30), Month(3), Year(1995));     // ❌ 컴파일 에러 — 타입 불일치
Date d2(Month(3), Day(30), Year(1995));     // ✅
```

각 매개변수가 별도 타입 — 잘못된 순서는 **컴파일 에러**. `explicit` 생성자로 암묵 변환 차단.

비용은 약간의 보일러플레이트 — 그러나 한 번 정의하면 모든 호출자가 안전.

## 사례 2 — 값 범위 제한

`Month`는 1~12만 의미 있음. 사용자가 13을 넣으면?

```cpp
Date d(Month(13), Day(15), Year(2025));   // 컴파일은 통과
```

런타임 검증으로 잡을 수 있지만 — **컴파일 타임에 차단할 수 있다면 더 좋음**.

```cpp
class Month {
public:
    static Month Jan()  { return Month(1); }
    static Month Feb()  { return Month(2); }
    // ... Mar ~ Dec
private:
    explicit Month(int m) : val(m) {}
    int val;
};

Date d(Month::Jan(), Day(15), Year(2025));     // 1~12 외 입력 불가능
Date d2(Month(13), ...);                         // ❌ private ctor
```

`enum class Month`도 동등한 효과:

```cpp
enum class Month {
    Jan = 1, Feb, Mar, Apr, May, Jun,
    Jul, Aug, Sep, Oct, Nov, Dec
};

Date d(Month::Jan, Day(15), Year(2025));
```

C++11+ `enum class`는 강 타입 — 다른 enum과 섞이지 않고, int로 암묵 변환도 안 됨.

## 사례 3 — 표준 관습 일관성

표준 라이브러리와 같은 관습을 따르면 사용자가 새로 배울 게 적음.

```cpp
container.size();          // size_t
container.length();        // size_t (string 등)
container.begin();         // iterator
container.empty();         // bool

container.add(x);          // ❌ — 표준 관습은 push_back, insert
container.numElements();   // ❌ — 표준 관습은 size
```

자체 컨테이너에서도:

```cpp
class MyContainer {
public:
    using value_type = T;
    using iterator   = ...;
    using size_type  = std::size_t;

    iterator    begin();
    iterator    end();
    size_type   size() const;
    bool        empty() const;
    void        push_back(const T&);
    // ...
};
```

표준 알고리즘과 range-based for도 호환됨 — 큰 이득.

## 사례 4 — 반환 타입과 RAII 강제

```cpp
// ❌ 사용자가 delete 잊으면 누수
Investment* createInvestment();

Investment* p = createInvestment();
// ... 어딘가 ...
delete p;       // 잊었나? 예외 났나?

// ✅ 자동 해제 강제
std::unique_ptr<Investment> createInvestment();

auto p = createInvestment();
// 자동 정리, 잊을 길 없음
```

`unique_ptr`/`shared_ptr` 반환은 **계약을 타입에 박는** 가장 명시적인 방법. 사용자는 raw pointer 관리법을 배울 필요가 없음.

### custom deleter 박기

자원이 특별한 정리 방식을 요구하면 deleter를 박아 반환:

```cpp
std::shared_ptr<Investment> createInvestment() {
    auto deleter = [](Investment* p) { getInvestmentDB().release(p); };
    return std::shared_ptr<Investment>(getInvestmentDB().acquire(), deleter);
}
```

사용자는 그냥 받아 쓰면 됨 — 어떻게 해제하는지 신경 쓸 필요 없음.

## 사례 5 — 일관된 매개변수 순서

```cpp
// 표준 라이브러리 관습 — destination이 보통 마지막
std::copy(src_begin, src_end, dst_begin);
std::strcpy(dest, source);       // ⚠️ C 함수, 반대 — 혼란

// 사용자 API — 표준에 맞추기
void writeData(const Buffer& src, Buffer& dst);   // src → dst
```

자체 API도 표준 관습 모방 — 사용자가 매개변수 순서 매번 외울 필요 없음.

## 사례 6 — 잘못 쓰기 어려운 enum

```cpp
// ❌ enum 값을 int처럼 사용
enum Color { Red, Green, Blue };
void setColor(int c);   // int를 받으므로 잘못된 값도 OK

setColor(42);                       // OK — 의미 없는 값

// ✅ enum class — 강 타입
enum class Color { Red, Green, Blue };
void setColor(Color c);

setColor(42);                       // ❌ 컴파일 에러
setColor(Color::Red);                // ✅
```

## 사례 7 — 명확한 호출 — Builder 패턴

매개변수가 많고 일부 optional이면 — 위치 매개변수보다 builder:

```cpp
// 보기에 비싼 호출
auto img = Image(800, 600, true, false, 90, "png", true);
//              ┘  ┘   ┘    ┘   ┘   ┘     ┘  └ 무엇이 무엇?

// builder
auto img = Image::Builder()
              .width(800)
              .height(600)
              .alpha(true)
              .grayscale(false)
              .quality(90)
              .format("png")
              .progressive(true)
              .build();
```

또는 C++20 designated initializers:

```cpp
struct ImageConfig {
    int    width;
    int    height;
    bool   alpha       = false;
    bool   grayscale   = false;
    int    quality     = 100;
    std::string format = "png";
};

auto img = makeImage({.width = 800, .height = 600, .quality = 90});
```

각 인자가 이름과 함께 — 의미 명확.

## 사례 8 — boolean 매개변수 함정

```cpp
void save(const std::string& path, bool compress, bool overwrite);

save("data.bin", true, false);   // ⚠️ 무엇이 무엇인가?
```

해결 — strong enum 또는 named flag:

```cpp
enum class Compression { On, Off };
enum class Overwrite { Yes, No };

void save(const std::string& path, Compression c, Overwrite o);

save("data.bin", Compression::On, Overwrite::No);   // 명확
```

## 모던 변형 — concepts (C++20)

```cpp
template<typename T>
concept Numeric = std::integral<T> || std::floating_point<T>;

template<Numeric T>
T square(T x) { return x * x; }

square(5);       // OK
square("x");     // ❌ 컴파일 에러: "x" doesn't satisfy Numeric
                 //    + concepts는 친절한 에러 메시지
```

C++20 concepts는 템플릿 매개변수에 **컴파일 타임 제약** 추가 — 잘못된 호출이 빠르고 명확한 에러로 잡힘.

## 실무 가이드 — 체크리스트

API 설계할 때:

- [ ] 매개변수 순서를 바꿔도 컴파일 통과하는가? → 별도 타입으로 차단
- [ ] 값 범위가 정해져 있다면 enum class 또는 factory method?
- [ ] `bool` 매개변수가 두 개 이상인가? → enum class로 의미 명시
- [ ] 자원 반환 시 raw pointer? → unique_ptr/shared_ptr
- [ ] 표준 라이브러리와 같은 이름·관습?
- [ ] 매개변수 너무 많지 않은가? (>4-5) → builder 또는 designated init
- [ ] 템플릿 매개변수에 concepts 제약(C++20)?

## 핵심 정리

1. **잘못된 사용을 컴파일 타임에 막는** 인터페이스 설계
2. 의미 다른 매개변수는 **별도 타입** — explicit 생성자로 암묵 변환 차단
3. 값 범위는 **enum class 또는 factory method**로 제한
4. **표준 라이브러리 관습** 일관 — size, begin, push_back 등
5. 자원 반환은 **스마트 포인터** — custom deleter 박아 자동 해제
6. C++20 **concepts**로 템플릿 매개변수 제약

## 관련 항목

- [항목 13: RAII](/blog/programming/cpp/effective-cpp/item13-use-objects-to-manage-resources) — 자원 반환 디자인
- [항목 19: 클래스 설계는 타입 설계](/blog/programming/cpp/effective-cpp/item19-treat-class-design-as-type-design) — 인터페이스의 시작
- [항목 23: 비-멤버 비-friend 선호](/blog/programming/cpp/effective-cpp/item23-prefer-non-member-non-friend-functions-to-member-functions) — 인터페이스 측면의 캡슐화
