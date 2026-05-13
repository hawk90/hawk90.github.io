---
title: "Ch 9: Naming"
date: 2025-05-13T09:00:00
description: "File / Type / Variable / Constant / Function / Namespace / Enum / Macro / Aliases — 모든 식별자의 명명 규칙."
tags: [Google, C++, Style-Guide, Naming]
series: "Google C++ Style"
seriesOrder: 9
draft: false
---

> 명명 = 가이드의 가장 가시적인 부분. *코드 읽기*에 직접 영향.

## General Naming Rules

### 원칙

> 약어보다 — *풀어 쓰기*.

```cpp
// 좋음:
int num_errors;
int num_completed_connections;
int num_dns_connections;

// 회피:
int n;                   // 의미 불명
int nerr;                // 약어
int n_comp_conns;        // 압축된 약어
int wgcConnections;      // 약어 + 다른 스타일
```

### 알려진 약어는 OK

```cpp
int num_dns_connections;   // DNS — 알려진 약어 OK
int url_string;            // URL — OK
```

널리 알려진 약어 — 풀어 쓸 필요 없음.

### Type / Variable 구분

```cpp
class MyClass { /* ... */ };   // PascalCase — 타입
MyClass my_object;             // snake_case — 변수
```

스타일이 다르면 — 무엇인지 한눈에.

## File Names

### 규칙

> `snake_case`. `.h` / `.cc` 확장자.

```cpp
my_useful_class.h
my_useful_class.cc
url_table_test.cc   // 테스트 파일
```

### 회피

```cpp
MyUsefulClass.h     // PascalCase — 회피
my-useful-class.h   // hyphen — 회피
myUsefulClass.h     // camelCase — 회피
```

### 헤더 / 구현 짝

```
foo.h        — 인터페이스
foo.cc       — 구현
foo_test.cc  — 단위 테스트
```

테스트 — `_test.cc` 접미사.

## Type Names

### 규칙

> `PascalCase`. 클래스 / struct / typedef / using / enum.

```cpp
class MyClass;
struct UrlTableProperties;
class FileDescriptor;
enum class UrlTableErrors { ... };
using PropertiesMap = std::map<...>;
```

### 인터페이스 / 구현체

```cpp
// 좋음 (Google):
class Connection { /* 인터페이스 */ };
class TcpConnection : public Connection { /* 구현 */ };

// Java 스타일 회피:
class IConnection;   // I 접두사 — Google에서는 안 씀
```

Google은 — `I` 접두사 안 씀.

## Variable Names

### 일반 변수

```cpp
// 좋음:
std::string table_name;
int counter;
double max_value;
```

`snake_case`.

### 클래스 멤버

```cpp
class TableInfo {
private:
    std::string table_name_;   // 끝에 `_`
    int num_entries_;
};
```

끝에 — `_`. 멤버임을 명시.

### 구조체 멤버

```cpp
struct UrlInfo {
    std::string url;       // 끝에 `_` 없음
    std::string title;
};
```

`struct`는 — *passive data*. 끝에 `_` 없음.

### Static 멤버

```cpp
class Foo {
private:
    static int next_id_;   // non-const static — 일반 멤버처럼
    static constexpr int kMaxValue = 100;   // const static — 상수 명명
};
```

### 매개변수

```cpp
// 좋음:
void Process(int input_count, const std::string& input_name);
```

`snake_case`. 멤버 변수와 같음.

## Constant Names

### 규칙

> `k` + `PascalCase`.

```cpp
const int kDaysInWeek = 7;
constexpr double kPi = 3.14159;
constexpr int kMaxRetries = 3;

// 글로벌 / static / 클래스 멤버 — 모두 동일:
class Foo {
public:
    static constexpr int kMaxValue = 100;
};
```

### 적용 대상

```
- 컴파일 시 상수 (constexpr)
- 변경 안 되는 const 변수 (전역)
- enum class 멤버
```

### 회피 — `UPPER_SNAKE_CASE`

```cpp
// 회피 (매크로처럼 보임):
const int MAX_RETRIES = 3;
const int kMaxRetries = 3;   // Google 스타일 ✓
```

`UPPER_SNAKE_CASE` — 매크로 전용.

## Function Names

### 규칙

> `PascalCase`. 동사로 시작.

```cpp
void DoWork();
void AddTableEntry(const Entry& entry);
int GetValue() const;
bool IsValid() const;
void OpenFile();
void SetName(const std::string& name);
```

### `Get` / `Set` / `Is` / `Has`

```cpp
int GetValue() const;        // getter
void SetValue(int v);        // setter
bool IsValid() const;        // boolean getter
bool HasItem(int id) const;
```

### 사례 — Getter

```cpp
class Foo {
public:
    int value() const { return value_; }   // 짧은 getter — 소문자 (예외)
    int GetValue() const { return value_; }   // 또는 PascalCase

private:
    int value_;
};
```

가이드는 — 짧은 inline accessor에 한해 *변수 이름과 동일*(소문자)도 허용 (Abseil 등의 스타일).

## Namespace Names

### 규칙

> `snake_case`. 짧게.

```cpp
namespace mylib { /* ... */ }
namespace mylib::util { /* ... */ }
namespace internal { /* ... */ }   // 비공개 구현 내부
```

### Top-level

```cpp
namespace google {
namespace protobuf {
// ...
}
}
```

회사 / 프로젝트 — top-level. 짧게.

### `internal` namespace

```cpp
namespace mylib {
namespace internal {   // 구현 디테일 — 외부 사용 금지 신호
class HiddenHelper;
}
}
```

`internal` — 관습. 외부에서 사용 안 함을 — 시각적으로.

## Enumerator Names

### 규칙

> `kCamelCase` (상수처럼).

```cpp
enum class UrlTableError {
    kOk,
    kOutOfMemory,
    kMalformedInput,
};
```

### `enum class` 선호

```cpp
// 좋음:
enum class Color { kRed, kGreen, kBlue };
Color c = Color::kRed;

// 회피 (unscoped):
enum Color { RED, GREEN, BLUE };   // 글로벌 오염
```

`enum class` — 스코프 / 타입 안전.

## Macro Names

### 규칙

> `UPPER_SNAKE_CASE`.

```cpp
#define MY_USEFUL_MACRO(x) ((x) * 2)
#define ARRAYSIZE(a) (sizeof(a) / sizeof((a)[0]))
```

### 회피

가능하면 — 매크로 자체를 회피 (Ch 7 참고). 매크로 작성 — *극히 제한*.

## Exceptions to Naming Rules

### 외부 호환

```cpp
// STL 호환을 위해 — STL 스타일 따름:
class MyContainer {
public:
    using value_type = T;   // STL 스타일 — snake_case
    using iterator = T*;
    iterator begin();       // snake_case
    iterator end();
};
```

STL과 — *겉보기 일치*해야 하는 경우 — STL 스타일 따름.

### 기존 코드 일관성

```cpp
// 기존 클래스가 — camelCase (오래 전 코드):
class OldClass {
public:
    void doWork();
    int getValue();
};

// 같은 클래스 안에 — 새 메서드 추가 시:
void doNewWork();   // 기존 스타일 따름 (가이드 어겨도 일관성 우선)
```

가이드 — 일관성 > 개인 선호. 기존 스타일 — 따른다.

## 정리

| 종류 | 스타일 | 예 |
|------|--------|-----|
| File | `snake_case.cc/h` | `my_class.cc` |
| Type | `PascalCase` | `MyClass`, `MyEnum` |
| Variable | `snake_case` | `my_var` |
| Member | `snake_case_` | `my_var_` |
| Struct member | `snake_case` | `my_var` |
| Constant | `kCamelCase` | `kDaysInWeek` |
| Function | `PascalCase` | `DoWork()` |
| Namespace | `snake_case` | `mylib` |
| Enumerator | `kCamelCase` | `kRed` |
| Macro | `UPPER_SNAKE` | `MY_MACRO` |

## 다음 장 예고

다음 — **Comments / Formatting**.

## 관련 항목

- [Ch 8: Type Deduction / Templates](/blog/embedded/standards/google-cpp/chapter08-deduction-templates-lambdas)
- [Ch 10: Comments / Formatting](/blog/embedded/standards/google-cpp/chapter10-comments-formatting-closing)
