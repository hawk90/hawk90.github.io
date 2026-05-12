---
title: "가이드라인 3: 인공적 결합을 피하기 위해 인터페이스를 분리하라"
date: 2026-05-13T13:00:00
description: "Interface Segregation Principle (ISP) — 뚱뚱한 인터페이스가 만드는 우연한 결합, 작은 인터페이스로 결합도 격리."
tags: [C++, Software Design, SOLID, ISP, Concepts]
series: "C++ Software Design"
seriesOrder: 3
---

## 왜 이 가이드라인이 중요한가?

가이드라인 2에서 — "**변화의 축**을 분리하라"고 했다. 그 분리의 가장 강력한 도구가 **인터페이스**. 그런데 인터페이스 자체가 — **뚱뚱하면** 분리 효과가 사라진다.

```cpp
class IDevice {
public:
    virtual void read() = 0;
    virtual void write() = 0;
    virtual void play_audio() = 0;
    virtual void capture_image() = 0;
};

class TextFile : public IDevice {
    void read() override;
    void write() override;
    void play_audio() override { throw std::logic_error("not supported"); }     // ⚠️
    void capture_image() override { throw std::logic_error("not supported"); }  // ⚠️
};
```

`TextFile`은 — `play_audio()`, `capture_image()`를 의미적으로 못 한다. 그래도 인터페이스 때문에 구현해야 함 (또는 throw로 우회). LSP 위반이고, 인터페이스가 **거짓말**.

진짜 문제는 — **클라이언트가 사용하지 않는 메서드에 우연히 의존**하게 됨. `IDevice`만 보는 함수도 — 모든 메서드의 ABI 변경에 영향. **인공적 결합**(artificial coupling)의 원인.

**Interface Segregation Principle**(ISP) — "**클라이언트는 사용하지 않는 인터페이스에 의존하면 안 된다**". 큰 인터페이스를 — **작고 응집도 높은 여러 인터페이스**로 분리.

## 핵심 내용

- 뚱뚱한 인터페이스는 — **사용하지 않는 메서드에 우연히 결합**시킨다 (artificial coupling)
- **Interface Segregation Principle**(ISP): "클라이언트는 사용하지 않는 인터페이스에 의존하면 안 된다"
- **작고 응집도 높은 인터페이스**로 분리 — 클라이언트는 필요한 것만 의존
- C++20 **concepts**는 — 모던 ISP의 핵심 도구 (vtable 없이 인터페이스 명시)
- LSP(Liskov)와 ISP는 — **동전의 양면** (LSP 위반의 원인이 종종 ISP 위반)

## 비교 — 뚱뚱한 인터페이스 vs 분리된 인터페이스

### Bad: God Interface

```cpp
class IDocument {
public:
    virtual ~IDocument() = default;
    
    // 데이터 접근
    virtual std::string content() const = 0;
    virtual void set_content(const std::string&) = 0;
    
    // 저장
    virtual void save_to_file(const std::string&) = 0;
    virtual void save_to_db() = 0;
    
    // 인쇄
    virtual void print() = 0;
    virtual void print_preview() = 0;
    
    // 편집
    virtual void undo() = 0;
    virtual void redo() = 0;
    
    // 협업
    virtual void share(const std::string& email) = 0;
    virtual void invite_collaborator(const std::string&) = 0;
};
```

문제:
- **모든 구현체가 모든 메서드** 구현해야
- `ReadOnlyDocument`도 `set_content`, `undo` 구현 강제 (또는 throw)
- 한 메서드가 변하면 — `IDocument` 의존하는 모든 코드가 영향
- 테스트 — Mock 만들 때 10개 메서드 모두 stub 작성

### Good: 응집도 높은 작은 인터페이스로 분리

```cpp
class IReadable {
public:
    virtual ~IReadable() = default;
    virtual std::string content() const = 0;
};

class IWritable {
public:
    virtual ~IWritable() = default;
    virtual void set_content(const std::string&) = 0;
};

class IPersistable {
public:
    virtual ~IPersistable() = default;
    virtual void save() = 0;
};

class IPrintable {
public:
    virtual ~IPrintable() = default;
    virtual void print() = 0;
};

// 필요한 것만 조합
class Document : public IReadable, public IWritable,
                 public IPersistable, public IPrintable {
    // ...
};

class ReadOnlyDocument : public IReadable, public IPrintable {
    // set_content, save 의무 없음
};

class CollaborativeDocument : public IReadable, public IWritable {
    // 협업 인터페이스는 별도
};
```

이제:
- 각 클라이언트가 — **필요한 인터페이스만** 의존
- `void print_anything(IPrintable& p)` — Document, ReadOnlyDocument 모두 OK
- `void edit(IWritable& w)` — Document만 받음, ReadOnlyDocument 차단 (컴파일 타임)
- 새 인터페이스 추가 — 기존 클라이언트 영향 X

## 인공적 결합(Artificial Coupling)

뚱뚱한 인터페이스의 **진짜 비용**:

```cpp
// 함수 A는 read만 필요
void analyze_text(IDocument& doc) {
    auto text = doc.content();
    // ... 분석만 ...
}

// 그런데 IDocument 인터페이스가 변경되면 (예: save() 시그니처 변경)
// → analyze_text도 재컴파일 필요!
// → analyze_text가 사용하지도 않는 save()에 결합되어 있음
```

이게 **인공적 결합** — 코드가 사용도 안 하는 메서드의 변경에 영향받는 것. 큰 코드베이스에서 — 컴파일 시간 폭증, 변경 영향 추적 어려움.

해결: 인터페이스 분리.

```cpp
void analyze_text(IReadable& doc) {     // ← IReadable만 의존
    auto text = doc.content();
}

// IWritable, IPersistable이 변경돼도 analyze_text 영향 없음
```

## ISP의 형식 정의

> **Interface Segregation Principle**: "Clients should not be forced to depend on methods they do not use."  
> "**클라이언트는 자기가 사용하지 않는 메서드에 의존하지 말아야 한다.**"

핵심: "**의존**"은 — 단순 호출이 아니라 **컴파일 시점 결합** + **변경 영향**까지 포함.

## ISP와 LSP의 관계

가이드라인 1, 2에서 LSP(Liskov Substitution Principle) 언급했음. 두 원칙은 — **서로 보완**:

### LSP 위반의 흔한 원인 = ISP 위반

```cpp
class IDevice {
    virtual void play_audio() = 0;
};

class TextFile : public IDevice {
    void play_audio() override { throw "not supported"; }     // ⚠️ LSP 위반
};
```

`TextFile`이 `IDevice`를 대체 가능해야 (LSP) — 그런데 `play_audio` 호출 시 throw. 사용자가 `IDevice` 받아서 `play_audio` 부르면 깨짐.

원인: 인터페이스가 — **모든 디바이스에 적용되지 않는 메서드**를 포함. ISP 위반.

해결: 인터페이스 분리.

```cpp
class IDevice { /* 공통 메서드만 */ };
class IAudioDevice : public IDevice { virtual void play_audio() = 0; };
class TextFile : public IDevice { /* play_audio 의무 X */ };
```

각 derived가 — **자기가 지원하는 인터페이스만** 구현. LSP 위반 가능성 차단.

## "인터페이스" 정의 — 더 넓게

ISP의 "인터페이스"는 — C++의 abstract class만이 아니다:

- **추상 클래스** — 가장 명시적
- **클래스의 public 메서드 집합** — concrete class도 인터페이스 있음
- **C++20 concept** — 타입 요구사항
- **함수의 매개변수 + 반환 타입** — 함수 시그니처도 인터페이스
- **헤더 파일** — 모듈의 인터페이스

뚱뚱한 헤더 — 한 헤더에 무관한 것 가득 — 도 ISP 위반:

```cpp
// Bad: 모든 게 한 헤더에
// utils.h
#include <string>
#include <vector>
#include <map>
#include <thread>
#include <chrono>

namespace utils {
    std::string trim(...);            // 문자열
    void log(...);                     // 로깅
    int file_size(...);               // 파일
    void start_thread(...);           // 스레드
    // ...
}

// 한 함수만 쓰는 코드도 — 전체 utils.h 의존
```

```cpp
// Good: 응집도별로 분리
// string_utils.h, log.h, file_utils.h, thread_utils.h
```

각 소스가 — 필요한 헤더만 include. 컴파일 시간 ↓, 의존성 명확.

## C++20 concepts — 모던 ISP

C++20 concepts는 — **가상 함수 없이** 인터페이스 정의:

```cpp
template<typename T>
concept Readable = requires(const T& t) {
    { t.content() } -> std::same_as<std::string>;
};

template<typename T>
concept Writable = requires(T& t, const std::string& s) {
    t.set_content(s);
};

template<typename T>
concept Printable = requires(const T& t) {
    t.print();
};

// 클라이언트는 필요한 concept만 요구
template<Readable T>
void analyze(const T& doc) {
    auto text = doc.content();
}

template<Readable T, Writable U>
void copy(const T& src, U& dst) {
    dst.set_content(src.content());
}
```

이점:
- **상속 X** — composition만으로 인터페이스 충족
- **vtable 비용 X** — 컴파일 타임 다형성
- **여러 concept 조합 자유** — `Readable && Printable`
- **사용자 정의 타입이 자동 충족** — 명시적 상속 선언 불필요

C++20+ 환경에선 — concept이 ISP의 1순위 도구.

## 함정 — 인터페이스 너무 잘게 쪼개기

```cpp
class IGettable { virtual std::string get() = 0; };
class ISettable { virtual void set(const std::string&) = 0; };
class ICountable { virtual size_t count() = 0; };
class IClearable { virtual void clear() = 0; };
// ... 100개 ...
```

너무 작은 인터페이스 — 또 다른 문제:
- 클라이언트가 — **여러 인터페이스를 동시에** 의존 (`IGettable + ISettable + ICountable`)
- 결국 — 여러 작은 인터페이스의 합으로 큰 인터페이스
- 가독성 ↓

**균형**: **응집도 높은 그룹**만큼만 분리. "**자주 함께 변하는** 메서드는 한 인터페이스에".

## 함정 — "확장을 위해" 미리 분리

```cpp
// 단순 카운터를 위해 — 5개 인터페이스로 분리?
class ICountIncrement { virtual void inc() = 0; };
class ICountDecrement { virtual void dec() = 0; };
class ICountReset { virtual void reset() = 0; };
class ICountRead { virtual int get() = 0; };
```

YAGNI (가이드라인 2). **현재 알려진 결합 문제**만 해결. 미래 가능성을 위해 미리 분리 X.

## ISP의 적용 — 4가지 시그널

언제 인터페이스를 분리할까?

### 1) 구현체가 일부 메서드를 throw / no-op

```cpp
class ReadOnly : public IDevice {
    void write() override { throw "not supported"; }   // ⚠️ 신호
};
```

→ 인터페이스가 잘못 묶여 있음. 분리.

### 2) 인터페이스의 다른 부분이 서로 다른 속도로 변함

```cpp
class IService {
public:
    // 자주 변하는 비즈니스 메서드
    virtual void process_order(Order&) = 0;
    virtual void apply_discount(Discount&) = 0;
    
    // 거의 안 변하는 인프라 메서드
    virtual void log(const std::string&) = 0;
    virtual void metrics() = 0;
};
```

→ 두 그룹이 다른 속도로 변함 → 별도 인터페이스.

### 3) 클라이언트마다 사용하는 메서드 집합이 다름

```cpp
class IBigInterface { /* 10 메서드 */ };

void clientA(IBigInterface& x) { x.method1(); x.method2(); }
void clientB(IBigInterface& x) { x.method3(); x.method4(); }
void clientC(IBigInterface& x) { x.method5(); }
```

→ 클라이언트별로 분리된 인터페이스.

### 4) Mock 만들기 어려움

```cpp
class FullDocumentMock : public IDocument {
    // 10개 메서드 모두 stub — 그런데 테스트는 1개만 사용
};
```

→ 인터페이스가 뚱뚱 → 분리.

## 실전 — STL의 ISP 사례

표준 라이브러리가 — ISP의 좋은 예:

```cpp
// 작은 인터페이스 (concepts)
std::input_iterator
std::output_iterator
std::forward_iterator
std::bidirectional_iterator
std::random_access_iterator
```

각 iterator concept이 — 자기 능력만 보장. 알고리즘은 필요한 능력만 요구:

```cpp
template<std::input_iterator It>
auto count(It first, It last);

template<std::random_access_iterator It>
void sort(It first, It last);
```

`std::list`(bidirectional)에 `sort`를 부르려 하면 — concept 매칭 실패 → 컴파일 에러. 인공적 결합 차단.

## 함정 — composition 시 너무 많은 인터페이스 상속

```cpp
class Document
    : public IReadable, public IWritable, public IPersistable,
      public IPrintable, public IShareable, public IVersionable {
};
```

10개 인터페이스 상속 — 클래스 자체가 뚱뚱. 가이드라인 38(Beautiful C++의 다중 상속 신중)과 연결. 너무 많으면 — **클래스 자체의 책임이 너무 큼**, SRP 위반.

대안: composition으로 분할.

```cpp
class Document {
    Content content_;          // IReadable, IWritable
    Persister persister_;      // IPersistable
    Printer printer_;          // IPrintable
    // ...
};
```

각 component가 — 자기 인터페이스 책임.

## C 영역의 ISP — 헤더 분리

C 시대부터의 ISP — **헤더 분리**:

```c
// Bad
#include "everything.h"     // 1MB

// Good
#include "string_utils.h"   // 필요한 것만
#include "file_io.h"
```

C++ Pimpl, forward declaration — 모두 헤더 의존성 격리 도구 (항목 31 EC++).

## 빌드 시간과 ISP

큰 코드베이스 — ISP가 — 컴파일 시간에 직접 영향:

```
모든 헤더가 IGiantInterface.h를 include
  ↓
IGiantInterface.h 한 줄 수정
  ↓
모든 의존 코드 재컴파일 — 수 분
```

```
헤더가 IReadable.h, IWritable.h 등 작은 헤더만 include
  ↓
IWritable.h 수정
  ↓
IWritable 의존 코드만 재컴파일 — 수 초
```

## 모던 변형 — std::ranges concepts

C++20 ranges:

```cpp
namespace std::ranges {
    template<typename T>
    concept range = requires(T& t) {
        ranges::begin(t);
        ranges::end(t);
    };
    
    template<typename T>
    concept sized_range = range<T> && requires(T& t) {
        ranges::size(t);
    };
    
    template<typename T>
    concept random_access_range = bidirectional_range<T> && ...;
}
```

각 concept이 — **이전 concept을 포함하면서 강화**. ISP의 표본.

## 실무 가이드 — 결정 트리

```
이 인터페이스가 너무 뚱뚱한가?
├── 구현체가 일부 메서드를 throw → 분리
├── 클라이언트마다 다른 메서드 집합 → 분리
├── Mock 만들 때 stub 많음 → 분리
├── 다른 속도로 변하는 그룹 → 분리
└── 응집도 충분 → 그대로

분리할 때:
├── C++20+ → concepts
├── 다형성 필요 → abstract class
├── 단순 함수형 → 자유 함수
└── 헤더도 함께 분리
```

## 실무 가이드 — 체크리스트

- [ ] 인터페이스가 — 응집도 높은 메서드만 묶고 있나?
- [ ] 구현체가 — 일부 메서드를 throw / no-op으로 처리?
- [ ] 클라이언트가 — 사용 안 하는 메서드에 의존?
- [ ] C++20 사용 가능? → concepts로 인터페이스 명시
- [ ] 너무 잘게 쪼개진 인터페이스 있는가? (균형)
- [ ] 헤더 — 응집도별 분리?

## 정리

**Interface Segregation Principle** — 클라이언트는 사용하지 않는 인터페이스에 의존하면 안 된다. 뚱뚱한 인터페이스는 — **인공적 결합**을 만들어 변경 영향 범위를 확대.

도구:
1. **작은 abstract class들** — 응집도별 분리
2. **C++20 concepts** — vtable 없이 인터페이스 명시
3. **헤더 분리** — 컴파일 의존성 격리
4. **composition** — 다중 인터페이스 상속 회피

원칙:
- 메서드를 인터페이스에 묶을 때 — **응집도** 검사
- 구현체가 throw → 신호
- 균형 — 너무 작게도 X

## 관련 항목

- [가이드라인 1: 디자인의 중요성](/blog/programming/cpp/cpp-software-design/guideline01-understand-the-importance-of-software-design) — 의존성 관리
- [가이드라인 2: 변화를 위한 디자인](/blog/programming/cpp/cpp-software-design/guideline02-design-for-change) — 변화의 축 분리
- [Effective C++ 항목 31: 컴파일 의존성 최소화](/blog/programming/cpp/effective-cpp/item31-minimize-compilation-dependencies-between-files) — 헤더 ISP
- [Effective C++ 항목 32: public 상속 = is-a](/blog/programming/cpp/effective-cpp/item32-make-sure-public-inheritance-models-is-a) — LSP
- [Beautiful C++ 항목 24: concept으로 제약](/blog/programming/cpp/beautiful-cpp/item24-specify-concepts-for-template-args) — concepts ISP
