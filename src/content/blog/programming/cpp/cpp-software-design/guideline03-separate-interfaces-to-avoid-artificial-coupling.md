---
title: "가이드라인 3: 인공적 결합을 피하기 위해 인터페이스를 분리하라"
date: 2026-05-13T03:00:00
description: "Interface Segregation Principle. 뚱뚱한 인터페이스가 만드는 우연한 결합을 작은 인터페이스로 끊는다."
tags: [C++, Software Design, SOLID, ISP, Concepts]
series: "C++ Software Design"
seriesOrder: 3
draft: true
---

## 왜 이 가이드라인이 중요한가?

가이드라인 2에서 변화의 축을 분리하라고 했다. 그 분리를 위한 가장 강력한 도구가 **인터페이스**다. 그런데 인터페이스 자체가 뚱뚱하면 분리 효과가 흐려진다.

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

`TextFile`은 의미상 `play_audio()`나 `capture_image()`를 할 수 없다. 그런데도 인터페이스 때문에 구현은 해야 한다(아니면 예외를 던지는 방식으로 우회한다). LSP에도 어긋나고, 인터페이스 자체가 거짓말을 하는 셈이다.

더 큰 문제는 따로 있다. **클라이언트가 사용하지도 않는 메서드에 우연히 의존**하게 된다는 것이다. `IDevice`만 보는 함수도 모든 메서드의 ABI 변경에 영향을 받는다. **인공적 결합(artificial coupling)** 의 전형이다.

**Interface Segregation Principle(ISP)** — *"클라이언트는 자기가 사용하지 않는 인터페이스에 의존하면 안 된다."* 큰 인터페이스를 작고 응집도 높은 여러 인터페이스로 가르는 일이다.

## 핵심 내용

- 뚱뚱한 인터페이스는 사용하지 않는 메서드에 우연히 결합시킨다(artificial coupling).
- **ISP** — 클라이언트는 사용하지 않는 인터페이스에 의존하지 않아야 한다.
- 인터페이스를 작고 응집도 높게 가르면, 클라이언트는 필요한 것만 의존한다.
- C++20 **concepts** — vtable 없이 인터페이스를 명시하는 모던 ISP의 핵심 도구다.
- LSP와 ISP는 동전의 양면이다. LSP 위반은 흔히 ISP 위반에서 시작된다.

## 비교 — 뚱뚱한 인터페이스와 분리된 인터페이스

### Bad — God Interface

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

문제점은 다음과 같다.

- 모든 구현체가 모든 메서드를 구현해야 한다.
- `ReadOnlyDocument`도 `set_content`나 `undo`를 강제로 구현하거나 throw해야 한다.
- 메서드 하나가 바뀌면 `IDocument`에 의존하는 모든 코드가 영향을 받는다.
- 테스트에서 Mock을 만들려면 10개 메서드 전체를 stub해야 한다.

### Good — 응집도 높은 작은 인터페이스로 분리

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

// 필요한 것만 조합해 쓴다
class Document : public IReadable, public IWritable,
                 public IPersistable, public IPrintable {
    // ...
};

class ReadOnlyDocument : public IReadable, public IPrintable {
    // set_content, save를 구현할 의무가 없다
};

class CollaborativeDocument : public IReadable, public IWritable {
    // 협업 인터페이스는 별도로 둔다
};
```

이제 각 클라이언트는 자기에게 필요한 인터페이스에만 의존한다. `void print_anything(IPrintable& p)`은 `Document`와 `ReadOnlyDocument`를 둘 다 받을 수 있고, `void edit(IWritable& w)`는 `Document`만 받아들이며 `ReadOnlyDocument`는 컴파일 타임에 차단된다. 새 인터페이스를 추가해도 기존 클라이언트는 영향을 받지 않는다.

## 인공적 결합

뚱뚱한 인터페이스가 만들어 내는 진짜 비용을 보자.

```cpp
// 이 함수는 read만 필요로 한다
void analyze_text(IDocument& doc) {
    auto text = doc.content();
    // ... 분석만 ...
}

// 그런데 IDocument 인터페이스가 바뀌면 (예: save() 시그니처 변경)
// → analyze_text도 재컴파일이 필요하다.
// → analyze_text가 쓰지도 않는 save()에 결합되어 있는 셈이다.
```

이것이 **인공적 결합**이다. 코드가 자기가 쓰지도 않는 메서드의 변경에 끌려다니는 상태다. 큰 코드베이스에서는 컴파일 시간이 폭증하고 변경의 영향 범위도 추적하기 어려워진다.

해법은 인터페이스를 가르는 것이다.

```cpp
void analyze_text(IReadable& doc) {     // ← IReadable만 의존한다
    auto text = doc.content();
}

// IWritable, IPersistable이 바뀌어도 analyze_text는 영향이 없다
```

## ISP의 정의

> **Interface Segregation Principle**: "Clients should not be forced to depend on methods they do not use."
> "**클라이언트는 자기가 사용하지 않는 메서드에 의존하지 말아야 한다.**"

여기서 "의존"은 단순한 호출만이 아니라 컴파일 시점의 결합과 변경의 영향까지 포함한다.

## ISP와 LSP의 관계

가이드라인 1과 2에서 LSP를 잠깐 언급했다. 두 원칙은 서로를 보완한다.

### LSP 위반의 흔한 원인은 ISP 위반이다

```cpp
class IDevice {
    virtual void play_audio() = 0;
};

class TextFile : public IDevice {
    void play_audio() override { throw "not supported"; }     // ⚠️ LSP 위반
};
```

`TextFile`이 `IDevice`를 대체 가능해야 한다는 것이 LSP인데, 정작 `play_audio`를 부르면 예외를 던진다. 사용자가 `IDevice`를 받아 `play_audio`를 호출하는 순간 무너진다.

원인은 이렇다. 인터페이스가 모든 디바이스에 적용되지 않는 메서드를 포함하고 있다. ISP 위반이 LSP 위반으로 번진 것이다.

해법은 분리다.

```cpp
class IDevice { /* 공통 메서드만 */ };
class IAudioDevice : public IDevice { virtual void play_audio() = 0; };
class TextFile : public IDevice { /* play_audio 의무가 없다 */ };
```

각 derived가 자기가 지원하는 인터페이스만 구현한다. LSP 위반 가능성이 사라진다.

## "인터페이스"의 정의를 더 넓게

ISP에서 말하는 "인터페이스"는 C++의 abstract class만 가리키지 않는다.

- **추상 클래스** — 가장 명시적인 형태
- **클래스의 public 메서드 집합** — concrete class에도 인터페이스가 있다
- **C++20 concept** — 타입 요구사항
- **함수의 매개변수와 반환 타입** — 함수 시그니처 역시 인터페이스
- **헤더 파일** — 모듈의 인터페이스

뚱뚱한 헤더, 즉 한 헤더에 무관한 것이 가득 들어 있는 경우도 ISP 위반이다.

```cpp
// Bad — 모든 게 한 헤더에 모여 있다
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

// 함수 하나만 쓰는 코드도 utils.h 전체에 의존한다
```

```cpp
// Good — 응집도별로 가른다
// string_utils.h, log.h, file_utils.h, thread_utils.h
```

각 소스가 필요한 헤더만 include한다. 컴파일 시간이 줄고 의존 관계도 명확해진다.

## C++20 concepts — 모던 ISP

C++20 concepts는 가상 함수 없이 인터페이스를 정의한다.

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

// 클라이언트는 필요한 concept만 요구한다
template<Readable T>
void analyze(const T& doc) {
    auto text = doc.content();
}

template<Readable T, Writable U>
void copy(const T& src, U& dst) {
    dst.set_content(src.content());
}
```

이점은 다음과 같다.

- 상속이 필요 없다. composition만으로 인터페이스를 충족한다.
- vtable 비용이 없다. 컴파일 타임 다형성이다.
- 여러 concept을 자유롭게 조합한다. 예: `Readable && Printable`.
- 사용자 정의 타입이 명시적인 상속 선언 없이 자동으로 충족한다.

C++20 이후 환경에서는 concept이 ISP의 1순위 도구다.

## 함정 — 너무 잘게 쪼개기

```cpp
class IGettable { virtual std::string get() = 0; };
class ISettable { virtual void set(const std::string&) = 0; };
class ICountable { virtual size_t count() = 0; };
class IClearable { virtual void clear() = 0; };
// ... 백 개 ...
```

지나치게 작은 인터페이스도 또 다른 문제를 낳는다.

- 클라이언트가 여러 인터페이스를 동시에 의존하게 된다(`IGettable + ISettable + ICountable` 식).
- 결국 작은 인터페이스의 합이 큰 인터페이스가 된다.
- 가독성도 떨어진다.

균형이 필요하다. **응집도 높은 그룹** 단위로만 나눈다. *"자주 함께 바뀌는 메서드는 한 인터페이스에 둔다."*

## 함정 — "확장을 위해서" 미리 가르기

```cpp
// 단순 카운터 하나를 위해 — 다섯 개 인터페이스?
class ICountIncrement { virtual void inc() = 0; };
class ICountDecrement { virtual void dec() = 0; };
class ICountReset { virtual void reset() = 0; };
class ICountRead { virtual int get() = 0; };
```

YAGNI다(가이드라인 2). **지금 알려진 결합 문제**만 해결한다. 미래의 가능성을 위해 미리 가르지 않는다.

## ISP를 꺼낼 때 — 네 가지 신호

언제 인터페이스를 분리해야 할까.

### 1) 구현체가 일부 메서드를 throw / no-op으로 처리한다

```cpp
class ReadOnly : public IDevice {
    void write() override { throw "not supported"; }   // ⚠️ 신호
};
```

→ 인터페이스가 잘못 묶인 상태다. 가른다.

### 2) 인터페이스의 다른 부분이 서로 다른 속도로 바뀐다

```cpp
class IService {
public:
    // 자주 바뀌는 비즈니스 메서드
    virtual void process_order(Order&) = 0;
    virtual void apply_discount(Discount&) = 0;

    // 거의 바뀌지 않는 인프라 메서드
    virtual void log(const std::string&) = 0;
    virtual void metrics() = 0;
};
```

→ 두 그룹이 변화 속도가 다르다. 별도 인터페이스로 가른다.

### 3) 클라이언트마다 쓰는 메서드 집합이 다르다

```cpp
class IBigInterface { /* 메서드 10개 */ };

void clientA(IBigInterface& x) { x.method1(); x.method2(); }
void clientB(IBigInterface& x) { x.method3(); x.method4(); }
void clientC(IBigInterface& x) { x.method5(); }
```

→ 클라이언트별로 인터페이스를 가른다.

### 4) Mock을 만들기 어렵다

```cpp
class FullDocumentMock : public IDocument {
    // 10개 메서드 모두 stub — 정작 테스트에서 쓰는 건 하나뿐
};
```

→ 인터페이스가 뚱뚱하다는 신호다. 가른다.

## 표준 라이브러리에서 보는 ISP

STL은 ISP의 좋은 본보기다.

```cpp
// 작은 인터페이스(concepts)
std::input_iterator
std::output_iterator
std::forward_iterator
std::bidirectional_iterator
std::random_access_iterator
```

각 iterator concept이 자기 능력만 보장한다. 알고리즘은 필요한 능력만 요구한다.

```cpp
template<std::input_iterator It>
auto count(It first, It last);

template<std::random_access_iterator It>
void sort(It first, It last);
```

`std::list`(bidirectional)에 `sort`를 부르려 하면 concept 매칭이 실패해 컴파일 에러가 난다. 인공적 결합이 들어설 자리가 없다.

## 함정 — composition 단계에서 너무 많은 인터페이스를 상속한다

```cpp
class Document
    : public IReadable, public IWritable, public IPersistable,
      public IPrintable, public IShareable, public IVersionable {
};
```

인터페이스 열 개를 상속한 클래스 자체가 뚱뚱하다. Beautiful C++의 다중 상속을 신중히 다루라는 항목과 연결되는 지점이다. 이 정도가 되면 **클래스 자체의 책임이 너무 커진 것**이다. SRP 위반이다.

대안은 composition으로 쪼개는 것이다.

```cpp
class Document {
    Content content_;          // IReadable, IWritable
    Persister persister_;      // IPersistable
    Printer printer_;          // IPrintable
    // ...
};
```

각 component가 자기 인터페이스를 책임진다.

## C 영역의 ISP — 헤더 분리

ISP는 C 시절부터 존재했다. 다만 형태가 헤더 분리였을 뿐이다.

```c
// Bad
#include "everything.h"     // 1MB

// Good
#include "string_utils.h"   // 필요한 것만
#include "file_io.h"
```

C++의 Pimpl이나 forward declaration도 결국 헤더 의존성을 격리하는 도구다(EC++ 항목 31).

## 빌드 시간과 ISP

큰 코드베이스에서는 ISP가 컴파일 시간에 곧장 영향을 준다.

```
모든 헤더가 IGiantInterface.h를 include
  ↓
IGiantInterface.h 한 줄 수정
  ↓
의존하는 모든 코드가 재컴파일 — 수 분 단위
```

```
헤더가 IReadable.h, IWritable.h 같은 작은 헤더만 include
  ↓
IWritable.h 수정
  ↓
IWritable에 의존하는 코드만 재컴파일 — 수 초 단위
```

## 모던 변형 — std::ranges concepts

C++20 ranges에서도 같은 패턴이 보인다.

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

각 concept이 이전 concept을 포함하면서 한 단계씩 강화된다. ISP의 표본이다.

## 실무 가이드 — 결정 트리

```
이 인터페이스가 너무 뚱뚱한가?
├── 구현체가 일부 메서드를 throw → 가른다
├── 클라이언트마다 다른 메서드 집합 → 가른다
├── Mock 만들 때 stub이 많다 → 가른다
├── 다른 속도로 바뀌는 그룹이 보인다 → 가른다
└── 응집도가 충분하다 → 그대로 둔다

가를 때는
├── C++20 이상 → concepts
├── 다형성이 필요하다 → abstract class
├── 단순 함수형이면 → 자유 함수
└── 헤더도 함께 가른다
```

## 실무 가이드 — 체크리스트

- [ ] 인터페이스가 응집도 높은 메서드만 묶고 있는가?
- [ ] 구현체가 일부 메서드를 throw나 no-op으로 처리하지는 않는가?
- [ ] 클라이언트가 사용하지도 않는 메서드에 의존하지는 않는가?
- [ ] C++20을 쓸 수 있다면 concept으로 인터페이스를 명시했는가?
- [ ] 너무 잘게 쪼개진 인터페이스는 없는가? (균형)
- [ ] 헤더를 응집도별로 가르고 있는가?

## 정리

ISP는 단순하다. **클라이언트는 자기가 쓰지 않는 인터페이스에 의존하지 말아야 한다**는 원칙이다. 뚱뚱한 인터페이스는 인공적 결합을 만들어 변경의 영향 범위를 부풀린다.

도구는 다음과 같다.

1. 응집도별로 가른 작은 abstract class들
2. C++20 concept — vtable 없이 인터페이스 명시
3. 헤더 분리 — 컴파일 의존성 격리
4. composition — 다중 인터페이스 상속 회피

원칙은 이렇게 정리할 수 있다.

- 메서드를 인터페이스에 묶을 때 응집도를 점검한다.
- 구현체에 throw가 등장하면 분리 신호다.
- 너무 작게 가르는 것도 피한다. 균형이 핵심이다.

## 관련 항목

- [가이드라인 1: 디자인의 중요성](/blog/programming/cpp/cpp-software-design/guideline01-understand-the-importance-of-software-design) — 의존성 관리
- [가이드라인 2: 변화를 위한 디자인](/blog/programming/cpp/cpp-software-design/guideline02-design-for-change) — 변화의 축 분리
- [Effective C++ 항목 31: 컴파일 의존성 최소화](/blog/programming/cpp/effective-cpp/item31-minimize-compilation-dependencies-between-files) — 헤더 ISP
- [Effective C++ 항목 32: public 상속 = is-a](/blog/programming/cpp/effective-cpp/item32-make-sure-public-inheritance-models-is-a) — LSP
- [Beautiful C++ 항목 24: concept으로 제약](/blog/programming/cpp/beautiful-cpp/item24-specify-concepts-for-template-args) — concepts ISP
