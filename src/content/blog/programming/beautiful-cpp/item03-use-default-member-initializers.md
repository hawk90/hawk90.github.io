---
title: "항목 3: 기본 생성자 대신 기본 멤버 초기화자로 초깃값을 설정하라"
date: 2026-05-08T12:00:00
description: "Default Member Initializer로 초기값을 선언부에 모으는 법 — 노이즈 감소, 일관성, 다중 생성자에서의 효과."
tags: [C++, Initialization, Constructor]
series: "Beautiful C++"
seriesOrder: 3
draft: false
---

## 왜 이 항목이 중요한가?

C++ 클래스가 멤버 변수 5개를 가지고, 생성자가 3개 있다고 해 보자. C++03 시절엔 각 생성자마다 모든 멤버를 초기화 리스트에 적었다 — **15개의 중복 항목**. 한 멤버의 기본값을 바꾸려면 3곳을 동시에 수정해야 했다.

C++11이 **Default Member Initializer**(이하 DMI)를 도입했다. 멤버 선언 옆에 직접 초기값을 적을 수 있게 된 것. 한 곳에 두면 모든 생성자가 그 값을 공유한다. 이 항목은 DMI를 언제 쓰고, 함정은 무엇이며, 다중 생성자에서 어떻게 빛나는지를 다룬다.

## 핵심 내용

- 멤버 초기화만을 위한 기본 생성자는 **노이즈**다 — 컴파일러가 더 잘한다
- C++11부터 **클래스 정의 안에 직접** 멤버 초깃값을 줄 수 있다
- 컴파일러 자동 생성 기본 생성자(`= default`)와 결합하면 코드가 짧고 의도가 명확해진다
- 초기값이 **한 곳(선언부)** 에 모이므로 유지보수가 쉽다
- 다중 생성자에서 특히 효과 — 공통 초기값은 DMI, 차이만 생성자 본문에

## 비교 — Before / After

### Bad: 멤버 초기화만을 위한 기본 생성자

```cpp
class Widget {
    int         count_;
    std::string name_;
    bool        ready_;
public:
    Widget() : count_(0), name_("none"), ready_(false) {}
};
```

문제:
- 멤버 선언과 초기값이 **떨어져** 있다 — 머릿속에서 짝짓기해야
- 멤버가 추가되면 **두 군데 수정** (선언 + 초기화 리스트)
- 멤버 순서가 바뀌면 컴파일러 경고(`-Wreorder`) 또는 미묘한 초기화 순서 버그

### Good: DMI + `= default`

```cpp
class Widget {
    int         count_ = 0;
    std::string name_  = "none";
    bool        ready_ = false;
public:
    Widget() = default;          // 컴파일러가 만들어줘도 충분
};
```

각 멤버 옆에 초기값. 생성자는 **단 한 줄**.

## 다중 생성자에서의 진짜 가치

DMI의 진가는 생성자가 여러 개일 때 드러난다.

```cpp
// Before: 세 생성자에 같은 초기값 반복
class Connection {
    std::string host_;
    int         port_;
    int         timeout_ms_;
    bool        keep_alive_;
public:
    Connection() : host_("localhost"), port_(8080), timeout_ms_(5000), keep_alive_(true) {}
    Connection(const std::string& host) : host_(host), port_(8080), timeout_ms_(5000), keep_alive_(true) {}
    Connection(const std::string& host, int port) : host_(host), port_(port), timeout_ms_(5000), keep_alive_(true) {}
};
```

초기값 `5000`, `true`가 세 번 반복. 한 곳만 바꿔도 다른 곳을 잊으면 버그.

```cpp
// After: 공통 초기값은 DMI, 차이만 생성자
class Connection {
    std::string host_       = "localhost";
    int         port_       = 8080;
    int         timeout_ms_ = 5000;
    bool        keep_alive_ = true;
public:
    Connection() = default;
    Connection(const std::string& host) : host_(host) {}
    Connection(const std::string& host, int port) : host_(host), port_(port) {}
};
```

각 생성자는 자기 책임만 — 나머지는 DMI에서 가져온다.

## 초기화 우선순위 — 헷갈리지 말 것

생성자 초기화 리스트가 DMI보다 **우선**한다.

```cpp
class C {
    int x_ = 10;                 // DMI
public:
    C()        = default;        // → x_ = 10
    C(int x) : x_(x) {}          // → DMI 무시, x_ = x
};

C c1;        // x_ == 10
C c2(42);    // x_ == 42
```

생성자에서 명시한 멤버는 DMI를 **덮어쓴다**. 둘 다 평가되는 게 아니라, 생성자 리스트가 있으면 DMI는 그냥 사용되지 않음.

## 어떤 값을 DMI에 둘 수 있나

```cpp
class C {
    int            a = 42;                              // 리터럴
    int            b = a * 2;                            // 다른 멤버 참조 (선언 순서 주의)
    std::string    s = "hello";                          // 문자열
    std::vector<int> v = {1, 2, 3};                      // 컨테이너
    std::unique_ptr<Widget> p = std::make_unique<Widget>();    // 동적 객체
    Foo            f{42, "x"};                           // brace init
    int            g();                                  // ❌ 컴파일 에러 — 함수 선언으로 파싱
    int            h = compute();                        // 일반 함수 호출 (정적 또는 비-멤버)
};
```

대부분의 표현식이 OK. **brace init `{}` 사용을 권장** — 가장 모호하지 않고 narrowing도 차단.

## C++14: aggregate에서의 DMI

C++14부터 DMI를 가진 클래스도 aggregate가 될 수 있다.

```cpp
struct Config {
    std::string host = "localhost";
    int         port = 8080;
};

Config c1;                                       // {host="localhost", port=8080}
Config c2{"example.com"};                        // {host="example.com", port=8080}
Config c3{.host = "x", .port = 9000};            // C++20 designated init
```

aggregate는 생성자 작성 없이도 brace로 초기화 가능. 설정 객체 패턴에 강력하다.

## 함정 1 — 멤버 의존 관계는 선언 순서

```cpp
class Bad {
    int b = a * 2;          // ⚠️ 'a' 아직 선언되지 않음 → 잘못된 값
    int a = 10;
};
```

DMI도 멤버 초기화 순서는 **선언 순서**. `b`가 먼저 초기화되는데 `a`는 아직 쓰레기. 컴파일러가 경고할 수도 있지만(`-Wuninitialized`) 항상은 아님.

해결: 선언 순서 조정.

```cpp
class Good {
    int a = 10;
    int b = a * 2;          // OK — a가 먼저
};
```

## 함정 2 — 헤더 의존성 증가

```cpp
// widget.h
#include "expensive_subsystem.h"     // ← DMI 때문에 강제 include

class Widget {
    ExpensiveType e_ = make_default();
};
```

DMI에 함수 호출이나 복잡한 타입 사용이 있으면 — **그 정의가 헤더에 노출**되어야 한다. 컴파일 시간 영향.

해결: 무거운 DMI는 .cpp의 생성자로 옮기거나, pImpl 적용.

## 함정 3 — 상속에서 base의 멤버를 DMI로 못 바꿈

```cpp
class Base {
protected:
    int x_ = 10;
};

class Derived : public Base {
    int x_ = 20;      // ❌ Base::x_를 가리는 새 멤버 — 의도와 다름
};
```

base의 멤버 초기값을 derived에서 다르게 두려면 — derived 생성자에서 명시.

```cpp
class Derived : public Base {
public:
    Derived() { x_ = 20; }    // base 부분 초기화 후 변경
                              // (또는 Base 생성자에 인자 전달)
};
```

## 함정 4 — const 멤버 + DMI = 복사 작동 X

```cpp
class Widget {
    const int id_ = next_id();
};

Widget a, b;
a = b;     // ❌ 복사 대입 자동 생성 불가 (const 멤버는 대입 X)
```

`const` 멤버는 대입 못 함. DMI로 const 초기화는 OK지만, 클래스 자체가 복사 대입 불가가 됨. 의도된 디자인이면 OK, 아니면 `const` 빼기.

## 모던 변형 — `consteval` 함수 + DMI (C++20)

```cpp
consteval int compute_default() { return 42; }

class C {
    int x = compute_default();    // 컴파일 타임 보장
};
```

`consteval` 함수는 컴파일 타임에만 평가 — 런타임 비용 0.

## 표준 라이브러리에서 사용 사례

```cpp
class Config {
public:
    std::chrono::milliseconds timeout       = std::chrono::seconds(30);
    bool                       verbose       = false;
    std::string                output_format = "json";
    std::vector<std::string>   include_paths{};        // 빈 컨테이너도 명시
};
```

설정·옵션 구조체에 거의 표준. C++ 모던 코드의 흔한 패턴.

## 실무 가이드 — 체크리스트

- [ ] 생성자가 "멤버 초기화"만 하는가? → `= default` + DMI로 대체
- [ ] 여러 생성자가 같은 초기값을 반복하는가? → 공통은 DMI로
- [ ] 멤버 선언 순서에 따라 DMI 평가 순서 의식?
- [ ] 무거운 타입을 DMI에 두지 않는가? → 컴파일 시간 부담
- [ ] `const` 멤버 + DMI가 복사 대입을 깨뜨리지 않는가?
- [ ] aggregate라면 designated init(C++20) 활용?

## 정리

**초기값은 선언과 함께 두라.** 기본 생성자가 정말 멤버 초기화 외에 하는 일이 없다면 `= default`로 충분하고, 가독성과 유지보수성이 모두 좋아진다.

핵심:
1. **DMI = 멤버 옆에 초기값** — 한 곳에 모임
2. 생성자 초기화 리스트가 **DMI를 덮어쓴다**
3. 다중 생성자에서 **중복 제거** 효과 큼
4. 선언 순서·헤더 의존성·const 멤버는 함정으로 주의
5. C++20 **designated init**으로 aggregate 패턴 확장

## 관련 항목

- [항목 4: 자명한 getter/setter](/blog/programming/beautiful-cpp/item04-avoid-trivial-getters-setters) — 클래스 설계의 다음 단계
- [항목 10: 멤버 선언 순서로 초기화](/blog/programming/beautiful-cpp/item10-init-members-in-declaration-order) — DMI도 같은 규칙
- [항목 28: 사용 전에 초기화](/blog/programming/beautiful-cpp/item28-dont-declare-before-init) — 초기화의 또 다른 측면
