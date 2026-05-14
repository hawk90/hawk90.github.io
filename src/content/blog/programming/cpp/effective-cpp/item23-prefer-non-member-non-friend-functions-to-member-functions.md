---
title: "항목 23: 멤버 함수보다 비-멤버 비-friend 함수를 선호하라"
date: 2025-02-01T23:00:00
description: "캡슐화는 클래스 내부에 접근하는 코드가 적을수록 강해진다 — 네임스페이스 활용과 확장성의 이득."
tags: [C++, Effective C++, Encapsulation, API Design]
series: "Effective C++"
seriesOrder: 23
draft: true
---

## 왜 이 항목이 중요한가?

직관과 정반대 결론이다. **멤버 함수가 캡슐화에 더 좋다고 생각하기 쉽지만, 사실은 비-멤버 비-friend가 더 좋다.**

캡슐화의 진짜 척도는 "이 클래스의 private 데이터를 직접 만질 수 있는 코드가 몇 개인가"다. 멤버 함수와 friend는 private에 직접 접근하므로 캡슐화를 깬다. 비-멤버 비-friend는 public 인터페이스만 사용하므로 캡슐화를 강화한다.

이 항목은 그 역설과 함께, **네임스페이스로 비-멤버 함수를 묶어 모듈화**하는 STL 스타일 패턴을 정리한다. C++17 `std::size`, `std::data`, C++20 `std::ranges` 같은 표준이 모두 이 원칙 위에 서 있다.

## 개요

직관과 반대로, **멤버 함수가 항상 캡슐화에 좋은 것은 아니다**. 캡슐화의 척도는 "클래스 내부 데이터에 직접 접근하는 코드의 양"이다. 멤버 함수와 friend는 private에 접근이 가능하고, 비-멤버 비-friend는 public 인터페이스만 사용한다. 후자가 많을수록 **클래스 내부 변경의 자유**가 커진다.

이 항목은 그 역설을 풀고, **네임스페이스로 비-멤버 함수를 묶어 모듈화**하는 패턴을 소개한다.

## 직관 깨기 — 멤버 함수가 캡슐화에 더 좋다?

표면적 판단:

```cpp
class WebBrowser {
public:
    void clearCache();
    void clearHistory();
    void removeCookies();

    void clearEverything() {     // 멤버 함수
        clearCache();
        clearHistory();
        removeCookies();
    }
};
```

vs

```cpp
class WebBrowser {
public:
    void clearCache();
    void clearHistory();
    void removeCookies();
};

void clearBrowser(WebBrowser& wb) {     // 비-멤버
    wb.clearCache();
    wb.clearHistory();
    wb.removeCookies();
}
```

직관: "**멤버라야 private 접근 가능 → 캡슐화 좋음**"
사실: **두 코드 모두 public 인터페이스만 사용** → private 데이터 변경 시 어느 쪽도 안 깨짐.

**그러나** 멤버 함수는 **잠재적으로** private에 접근 가능 — 미래에 누군가 그 안에서 private를 직접 만지면 캡슐화 약화. 비-멤버 비-friend는 public 인터페이스로만 묶임 — 그 가능성 자체가 없음.

## 캡슐화의 측정 — "이 멤버가 변경되면 깨질 코드"

```cpp
class C {
private:
    int data_;     // 멤버 변경 시 깨질 코드:
                   //   - C의 모든 멤버 함수 (public/protected/private)
                   //   - C의 모든 friend
                   //   - 비-멤버 비-friend는 영향 없음 (public 인터페이스만 사용)
};
```

비-멤버 비-friend의 양이 많을수록 — `data_` 표현을 바꿔도 **public 인터페이스만 유지하면 모두 호환**. 캡슐화 강화.

## 네임스페이스로 모듈화

비-멤버 함수를 같은 네임스페이스에 묶어 "**기능별 모듈**" 형성:

```cpp
namespace WebBrowserStuff {
    class WebBrowser { /* ... */ };

    // 핵심 동작 (자주 사용)
    void clearBrowser(WebBrowser& wb);
    void bookmark(WebBrowser& wb, const std::string& url);

    // 인쇄 (드물게 사용)
    void print(WebBrowser& wb);
    void exportToPDF(WebBrowser& wb, const std::string& path);

    // 쿠키 관리
    void importCookies(WebBrowser& wb, const std::string& file);
    void exportCookies(const WebBrowser& wb, const std::string& file);
}
```

### 헤더 파일 분리로 의존성 관리

```
webbrowser.h              ← 핵심 — 클래스 정의 + 자주 쓰는 함수
webbrowser_bookmarks.h    ← 북마크 관련
webbrowser_print.h        ← 인쇄 — 사용자만 include
webbrowser_cookies.h      ← 쿠키
```

각 헤더가 같은 네임스페이스에 함수 추가:

```cpp
// webbrowser_print.h
namespace WebBrowserStuff {
    void print(WebBrowser& wb);
    void exportToPDF(WebBrowser& wb, const std::string& path);
}
```

**이득**:
- 사용자는 필요한 헤더만 include → **컴파일 시간 단축**
- 라이브러리 작성자도 모듈별 개발 가능
- 새 기능 추가는 **새 헤더 + 같은 네임스페이스** — 기존 코드 컴파일 X

## 비-멤버 함수의 추가 장점

### 1) 확장성

```cpp
// 라이브러리 사용자가 새 헬퍼 추가
namespace WebBrowserStuff {
    void analyzeUsage(const WebBrowser& wb) {
        // 사용자가 정의한 함수 — 라이브러리 수정 불필요
    }
}
```

클래스를 재컴파일하지 않고도 같은 네임스페이스에 함수 추가 가능. 멤버 함수는 클래스 수정 필요.

### 2) 패키지 유연성

자주 쓰이는 기능은 핵심 헤더에, 드물게 쓰이는 기능은 별도 헤더에 — 사용자가 필요한 만큼만 의존.

### 3) ADL — Argument-Dependent Lookup

비-멤버 함수는 같은 네임스페이스에 있으면 **인자를 통해 자동 탐색**:

```cpp
namespace MyLib {
    class Widget { /* ... */ };
    void process(Widget& w);
}

MyLib::Widget w;
process(w);              // ✅ ADL이 MyLib::process를 찾아줌
```

`std::swap`, `std::begin` 등 표준 라이브러리도 이 메커니즘에 의존.

## 멤버 함수가 적합한 경우

**모든 함수**를 비-멤버로 만드는 게 답은 아닙니다.

### 1) 객체 상태에 직접 접근

```cpp
class Container {
    int* data;
    size_t size;
public:
    size_t getSize() const { return size; }     // private 데이터 접근 — 멤버
    int& at(size_t i) { return data[i]; }       // 멤버
};
```

내부 상태를 노출하거나 변경하는 기본 동작은 멤버.

### 2) 객체의 명확한 일부

도메인 개념상 "이 함수는 클래스의 본질적 능력":

```cpp
class String {
public:
    size_t length() const;          // string의 본질적 속성
    char& operator[](size_t i);     // 첨자 — 클래스의 일부
};
```

`length`, `size`, `empty` 등은 멤버가 자연스러움.

### 3) virtual 함수 (다형성)

```cpp
class Shape {
public:
    virtual double area() const = 0;     // 다형성 → 멤버
};
```

비-멤버는 virtual이 될 수 없음. 다형적 디스패치는 멤버 한정.

### 4) operator= 와 일부 연산자

`operator=`, `operator[]`, `operator()`, `operator->` 는 **표준이 멤버로 강제**.

```cpp
class Widget {
public:
    Widget& operator=(const Widget&);    // 멤버 한정
    Widget& operator[](size_t);          // 멤버 한정
};
```

## 비-멤버가 좋은 함수 vs 멤버가 좋은 함수

```cpp
class String {
    char* data;
    size_t length_;
public:
    // 멤버 — 내부 접근 / 본질적
    size_t length() const;
    char& operator[](size_t i);
    void clear();
    String& operator+=(const String& other);

    // 비-멤버 가능 (public 인터페이스만 사용)
};

// 비-멤버
bool operator==(const String& a, const String& b);     // 양쪽 인자 변환 가능 (항목 24)
String operator+(const String& a, const String& b);    // 새 객체 반환
std::ostream& operator<<(std::ostream& os, const String& s);

// 유틸리티
String trimmed(const String& s);
String upper(const String& s);
```

설계 원칙:
- 클래스 안에 멤버를 두는 이유는 **"내부 접근이 필요해서"** 또는 **"본질적 능력이라서"**
- 그 외엔 비-멤버 — 캡슐화·확장성 이득

## 흔한 함정 — friend 남발

```cpp
class Container {
    // ...
    friend void debugPrint(const Container& c);
    friend bool operator==(const Container& a, const Container& b);
    friend Container merge(const Container& a, const Container& b);
    // ... 십여 개의 friend ...
};
```

friend가 많으면 — 사실상 멤버. 캡슐화 이득 사라짐.

**대안**: public 인터페이스로 충분히 구현 가능하면 friend 제거. private 접근이 정말 필요하면 별도 protected 인터페이스 또는 detail 네임스페이스로.

```cpp
class Container {
public:
    // 디버깅에 필요한 모든 정보 노출
    auto begin() const;
    auto end() const;
    size_t size() const;
};

// friend 필요 없음 — public으로 충분
void debugPrint(const Container& c) {
    for (auto& x : c) std::cout << x << " ";
}
```

## 모던 변형 — 자유 함수 + ADL

C++20 ranges는 자유 함수의 위력을 보여줍니다:

```cpp
std::vector<int> v = {1, 2, 3, 4, 5};

// 멤버 함수 X — 자유 함수 + pipe
auto evens = v | std::views::filter([](int x) { return x % 2 == 0; })
               | std::views::transform([](int x) { return x * x; });
```

`filter`, `transform`은 멤버가 아닌 비-멤버 — 모든 range 타입에 적용. 확장성·일관성.

## 실무 가이드

| 함수 유형 | 멤버 / 비-멤버 |
| --- | --- |
| 내부 데이터 직접 접근 | 멤버 |
| virtual 함수 | 멤버 (강제) |
| operator=, [], (), -> | 멤버 (강제) |
| 양쪽 인자 변환 필요한 binary op | 비-멤버 (항목 24) |
| public 인터페이스만 사용 | 비-멤버 — 캡슐화 이득 |
| 유틸리티 함수 (trim, format 등) | 비-멤버 + 네임스페이스 |
| 새 기능 추가 (확장) | 비-멤버 + 같은 네임스페이스 |

## 실무 가이드 — 체크리스트

함수를 작성할 때:

- [ ] private 데이터 접근이 정말 필요한가? 아니면 public 인터페이스로 충분?
- [ ] 본질적 능력인가, 부가적 편의 기능인가?
- [ ] virtual이거나 강제 멤버 연산자인가? (멤버)
- [ ] 자주 쓰이는가, 드문가? (별도 헤더 분리 가능?)
- [ ] friend로 만들고 있다면 — 정말 필요한가?

## 핵심 정리

1. **비-멤버 비-friend가 캡슐화에 유리** — public 인터페이스로만 묶임
2. **네임스페이스로 묶어 모듈화** — 헤더 분리, 의존성 관리
3. 멤버 함수는 **내부 접근 / 본질적 / virtual / 강제 연산자**일 때만
4. friend 남발은 캡슐화 약화 — public으로 가능하면 friend 제거
5. **ADL**과 자유 함수가 모던 C++(ranges)의 핵심

## 관련 항목

- [항목 22: 데이터 멤버는 private](/blog/programming/cpp/effective-cpp/item22-declare-data-members-private) — 캡슐화의 시작
- [항목 24: 양쪽 변환 필요 시 비-멤버](/blog/programming/cpp/effective-cpp/item24-declare-non-member-functions-when-type-conversions-should-apply) — 비-멤버가 강제되는 경우
- [항목 25: non-throwing swap](/blog/programming/cpp/effective-cpp/item25-consider-support-for-a-non-throwing-swap) — 비-멤버 + ADL의 대표 사례
