---
title: "항목 10: 멤버를 선언한 순서대로 데이터 멤버를 정의하고 초기화하라"
date: 2026-05-08T19:00:00
description: "초기화 리스트 순서 ≠ 실제 초기화 순서 — 한 멤버로 다른 멤버를 초기화할 때의 UB와 -Wreorder 경고."
tags: [C++, Initialization, Constructor]
series: "Beautiful C++"
seriesOrder: 10
draft: false
---

## 왜 이 항목이 중요한가?

C++의 미묘한 규칙 — **멤버 초기화 순서는 클래스 선언 순서**이다. 생성자 초기화 리스트에 적은 순서가 아니다. 두 순서가 다르면 — 한 멤버를 다른 멤버로 초기화하는 코드가 **미초기화 메모리를 읽는** UB를 일으킬 수 있다.

이건 컴파일러가 잘 잡지 못하는 함정. `-Wreorder` 경고가 있긴 하지만 항상 켜는 사람이 적고, 한 멤버로 다른 멤버를 초기화하는 패턴은 흔하다 — 그래서 가장 미묘한 버그 중 하나.

## 핵심 내용

- 멤버는 **클래스에 선언된 순서**대로 초기화된다 — 초기화 리스트의 순서와 무관
- 리스트 순서를 다르게 쓰면 **읽는 사람이 착각**하고, 한 멤버를 다른 멤버로 초기화할 때 미정의 동작
- 일부 컴파일러는 `-Wreorder` 경고로 잡아주지만 의존하지 마라
- **선언 순서 = 초기화 순서 = 소멸 역순** — 이 일관성을 유지

## 비교 — 순서 어긋남 vs 일치

### Bad: 리스트 순서가 선언 순서와 다름

```cpp
class Buffer {
    int  size_;        // 선언 1번째
    int* data_;        // 선언 2번째
public:
    Buffer(int n)
      : data_(new int[size_])   // ⚠️ 실제 1번째 — size_가 아직 미초기화!
      , size_(n)                // 2번째
    {}
};

Buffer b(100);
// 1. data_ 초기화 시도 → new int[size_] → size_는 쓰레기 값
// → 거대한 메모리 할당 또는 bad_alloc, 혹은 crash
```

해당 코드를 읽으면 — "리스트 위에서 아래 순서겠지" 라고 생각하지만, 실제 순서는 **선언 순서**.

### Worse: 한 멤버로 다른 멤버를 초기화 — UB

```cpp
class View {
    int* end_;         // 선언 1번째
    int* begin_;       // 선언 2번째
public:
    View(int* p, int n) 
      : begin_(p)              // 리스트 1번째지만 실제 2번째
      , end_(begin_ + n)       // 리스트 2번째지만 실제 1번째!
    {}
    // 실제 순서:
    // 1. end_(begin_ + n)  ← begin_은 아직 미초기화 → UB
    // 2. begin_(p)         ← 너무 늦음
};
```

`begin_`이 다른 멤버 초기화에 사용되지만 — **아직 초기화 안 됨**.

### Good: 선언 순서 = 리스트 순서

```cpp
class Buffer {
    int  size_;
    int* data_;
public:
    Buffer(int n) : size_(n), data_(new int[size_]) {}
                 // size_ 먼저, data_가 size_ 사용 — OK
};

class View {
    int* begin_;     // 의존이 있으면 의존 받는 멤버를 먼저 선언
    int* end_;
public:
    View(int* p, int n) : begin_(p), end_(begin_ + n) {}
};
```

`-Wreorder` 경고도 사라짐. 코드를 읽는 사람의 직관과 컴파일러의 동작이 일치.

## 왜 선언 순서로 초기화하나

C++ 표준이 이렇게 정한 이유:

1. **소멸 순서의 역대칭** — 멤버는 생성 역순으로 소멸. 생성이 명확한 순서여야 소멸도 결정적.
2. **여러 생성자의 일관성** — 두 생성자가 다른 리스트 순서를 적어도 멤버 초기화 순서는 동일.
3. **컴파일러의 단순화** — 선언 순서를 따라가면 됨.

```
class C { A a; B b; C c; };
생성: a → b → c
소멸: c → b → a (역순)
```

## 컴파일러 경고

```bash
g++  -Wreorder
clang -Wreorder-ctor
```

```
warning: 'Buffer::data_' will be initialized after 'Buffer::size_'
   [-Wreorder]
note: ...
```

기본 활성화 안 됨 — `-Wall`에 포함되지만 의식적으로 켜야 안전. **CI에서 `-Werror=reorder`** 권장.

## 함정 — 멤버 의존성 + DMI

```cpp
class C {
    int b = a * 2;     // ⚠️ a 아직 선언 안 됨 — 쓰레기 값으로 초기화
    int a = 10;
};
```

DMI(항목 3)도 같은 규칙. 선언 순서가 모든 것의 기준.

해결:

```cpp
class C {
    int a = 10;
    int b = a * 2;    // a가 먼저 — OK
};
```

## 함정 — base 클래스의 초기화 순서

```cpp
class Base1 { /* ... */ };
class Base2 { /* ... */ };
class Member { /* ... */ };

class C : public Base1, public Base2 {
    Member m_;
public:
    C() : m_(/* ... */), Base2(/* ... */), Base1(/* ... */) {}
    // 실제 순서:
    // 1. Base1 (선언 순서대로)
    // 2. Base2
    // 3. m_ (멤버 변수)
};
```

base 클래스도 같은 규칙 — **상속 선언 순서**대로 초기화 + 그 다음 멤버 변수. 리스트 순서는 무시.

## 함정 — virtual base의 특별 규칙

```cpp
class Virtual { /* ... */ };

class A : virtual public Virtual { /* ... */ };
class B : virtual public Virtual { /* ... */ };

class C : public A, public B {
public:
    C() : Virtual(/* most-derived가 직접 호출 */) {}
};
```

virtual base는 **most-derived 클래스가 직접 초기화** — A, B의 초기화 리스트는 무시. 항목 40(EC++)에서 자세히.

## 흔한 패턴 — 멤버 순서를 의미 있게

```cpp
class Logger {
    // 1. 의존성 없는 단순 멤버
    int level_ = INFO;
    bool enabled_ = true;
    
    // 2. 큰 컨테이너 (size 결정 후)
    int max_entries_ = 1000;
    std::deque<LogEntry> entries_;
    
    // 3. 다른 멤버에 의존하는 것
    std::ofstream file_;        // open at construction
public:
    Logger(const std::string& path) 
      : entries_(),             // 빈 컨테이너
        file_(path)             // path는 매개변수
    {}
};
```

**의존성이 적은 멤버를 위에 둬라** — 자연스러운 선언 순서가 자연스러운 초기화 순서.

## 함정 — 한 멤버를 참조하는 멤버

```cpp
class C {
    int  data_;
    int& ref_;             // data_를 참조하는 reference 멤버
public:
    C(int x) : data_(x), ref_(data_) {}    // 선언 순서대로 — OK
};
```

선언 순서대로 적어야 — `ref_`가 초기화될 때 `data_`가 이미 있음.

반대 순서면 UB:

```cpp
class Bad {
    int& ref_;
    int  data_;
public:
    Bad(int x) : data_(x), ref_(data_) {}     
    // ⚠️ 실제 순서: ref_가 먼저 → data_는 미초기화
    //     ref_가 미초기화 메모리에 바인딩 — UB
};
```

## 모던 변형 — DMI + 일반 멤버 결합

```cpp
class Connection {
    std::string host_       = "localhost";   // DMI
    int         port_       = 8080;
    int         timeout_ms_ = 5000;
    std::chrono::steady_clock::time_point connected_at_;  // 런타임 계산
public:
    Connection(const std::string& h, int p)
      : host_(h), port_(p),                   // DMI 덮어쓰기
        connected_at_(std::chrono::steady_clock::now())   // 일반 멤버
    {
        // timeout_ms_는 DMI 값 5000 유지
    }
};
```

DMI와 명시 초기화의 혼합도 OK — 선언 순서 규칙은 동일.

## clang-tidy로 자동 감지

```bash
clang-tidy --checks='cppcoreguidelines-prefer-member-initializer' src/*.cpp
```

`-Wreorder` 외 정적 분석 도구로 추가 검증.

## 실무 가이드 — 체크리스트

- [ ] 초기화 리스트가 **선언 순서**와 일치하는가?
- [ ] 한 멤버가 다른 멤버를 사용한다면 — 의존 받는 쪽이 **선언이 앞**인가?
- [ ] 참조 멤버는 참조 대상이 **선언 순서상 먼저**?
- [ ] `-Wreorder` 경고 활성화?
- [ ] CI에 `-Werror=reorder`?
- [ ] DMI 사용 시 의존성 순서 검토?

## 정리

초기화 리스트의 순서는 **장식이 아니다**. 선언 순서와 일치시켜야 의도가 명확하고, 한 멤버로 다른 멤버를 초기화하는 함정도 피할 수 있다.

규칙:
- **선언 순서 = 초기화 순서**
- **소멸 순서 = 생성의 역순**
- 리스트 순서 ≠ 실제 순서일 때 컴파일러가 침묵할 수 있음

## 관련 항목

- [항목 3: 기본 멤버 초기화자](/blog/programming/beautiful-cpp/item03-use-default-member-initializers) — DMI도 같은 규칙
- [항목 28: 사용 전 초기화](/blog/programming/beautiful-cpp/item28-dont-declare-before-init) — 초기화의 일반 원칙
- [Effective C++ 항목 4: 객체 초기화](/blog/programming/effective-cpp/item04-make-sure-objects-are-initialized-before-use) — 초기화의 전반
