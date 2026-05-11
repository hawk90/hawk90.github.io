---
title: "항목 42: 삽입(insertion) 대신 안치(emplacement)를 고려하라"
date: 2025-01-11T11:00:00
description: "emplace_back 등 emplace API가 push_back보다 효율적인 시점과 주의점."
tags: [C++, Container, Performance, Modern C++]
series: "Effective Modern C++"
seriesOrder: 42
---

## 개요

`std::vector::push_back(x)`는 인자를 컨테이너로 **복사 또는 이동**합니다. `emplace_back(args...)`는 컨테이너 안에서 **직접 객체를 생성**합니다 — 임시 객체가 사라집니다.

성능 이득이 클 수도 있지만, 항상 그런 건 아니고 함정도 있습니다. 무조건 emplace로 치환은 위험.

## 필수 개념: 임시 객체와 perfect forwarding

> **초보자를 위한 배경 지식**

<br>

### push_back 작동 방식

```cpp
std::vector<std::string> v;
v.push_back("hello");
```

내부 동작:
1. `"hello"` (const char*) → `std::string` **임시 객체 생성** (변환)
2. 임시 객체를 vector 안의 메모리로 **이동** (string move)
3. 임시 객체 **소멸**

→ 임시 객체 생성/소멸 1회.

### emplace_back 작동 방식

```cpp
v.emplace_back("hello");
```

내부 동작:
1. `"hello"`를 perfect-forward
2. vector 안의 메모리 위치에서 **placement new로 직접 std::string 생성**

→ 임시 객체 0개.

### perfect forwarding 복습

```cpp
template<typename... Args>
void emplace_back(Args&&... args) {
    new (target_address) T(std::forward<Args>(args)...);
}
```

`emplace_back("hello")` → `T("hello")` 직접 호출. 이 경우 `T = std::string`이라 `string(const char*)` 호출 — 컨테이너 내부 메모리에서 직접.

## push vs emplace — 코드 비교

```cpp
std::vector<std::string> v;

v.push_back("hello");
//  1. const char* → std::string 임시 (변환 생성자)
//  2. 임시를 v 안으로 move (string의 move ctor)
//  3. 임시 소멸 (string의 dtor)

v.emplace_back("hello");
//  1. v 안에서 std::string("hello") 직접 생성 (변환 생성자)
//  → move/소멸 0회
```

이미 string인 경우엔 차이가 없음:

```cpp
std::string s = "hello";

v.push_back(s);              // copy
v.emplace_back(s);           // copy (동일)

v.push_back(std::move(s));   // move
v.emplace_back(std::move(s));// move (동일)
```

→ **변환이 필요한 경우**에만 emplace 이득.

## emplace 지원 API

| 컨테이너 | insert 류 | emplace 류 |
| --- | --- | --- |
| `vector`, `deque`, `list` | `push_back`, `push_front`, `insert` | `emplace_back`, `emplace_front`, `emplace` |
| `set`, `map`, `unordered_*` | `insert` | `emplace`, `emplace_hint` |
| `stack`, `queue`, `priority_queue` | `push` | `emplace` |
| `array` | (없음) | (없음 — 고정 크기) |

## emplace가 이기는 조건

세 조건 모두 만족 시 진짜 이득:

### 조건 1 — 인자 타입과 element 타입이 다름 (변환 필요)

```cpp
std::vector<std::string> v;

v.push_back("x");     // const char* → string 변환 → move
v.emplace_back("x");  // const char*에서 string 직접 생성 — ✅ 이득
```

이미 element 타입이면 효과 없음:

```cpp
std::string s = "x";
v.push_back(s);      // copy
v.emplace_back(s);   // copy — 동일
```

### 조건 2 — 컨테이너가 중복 거부 안 함 (또는 거부해도 생성은 진행)

```cpp
std::set<Widget> s;
Widget w(args);
s.insert(w);                  // 이미 있는 Widget 객체 — 추가 실패해도 만들 필요 X
s.emplace(args);              // ⚠️ Widget 만들고 → 검사 → 중복이면 폐기 (낭비)
```

`set`/`map`은 중복이면 추가 실패. emplace는 일단 객체 만들고 검사 — 중복 빈번하면 손해.

### 조건 3 — 컨테이너가 저장 형태와 무관하게 객체 생성

`map`처럼 pair로 저장하는 컨테이너는 emplace가 분리 인자 받기 가능:

```cpp
std::map<int, std::string> m;

m.insert({42, "hello"});                              // pair 임시 → move
m.emplace(42, "hello");                               // pair 직접 생성
m.emplace(std::piecewise_construct,
          std::forward_as_tuple(42),
          std::forward_as_tuple("hello"));            // 더 미세 제어
```

## emplace의 주의점 (함정 모음)

### 함정 1 — explicit 생성자 호출 가능

```cpp
struct Widget {
    explicit Widget(int);
};

std::vector<Widget> v;

v.push_back(10);     // ❌ 컴파일 에러 — 암묵 변환 막힘
v.emplace_back(10);  // ✅ direct init이라 explicit도 호출
```

`emplace`는 **direct initialization** 사용 → `explicit` 생성자도 호출. 의도와 다른 객체 생성 위험.

```cpp
std::vector<std::regex> regexes;

regexes.push_back(nullptr);     // ❌ explicit regex(const char*)
regexes.emplace_back(nullptr);  // ✅ 컴파일 — 그러나 런타임 에러!
                                 // (regex가 nullptr로 생성 시도 — 잘못된 정규식)
```

→ explicit 생성자가 있는 타입은 emplace로 의도치 않은 객체 생성 위험.

### 함정 2 — resource leak (생성 중 예외)

```cpp
std::list<std::shared_ptr<Widget>> l;

void customDel(Widget*);

// push_back: 임시 shared_ptr 생성 → 추가
l.push_back({ new Widget, customDel });
//  1. new Widget → raw pointer
//  2. shared_ptr 임시 생성 (raw 즉시 wrap — 누수 X)
//  3. push (예외 시 임시는 정리됨)

// emplace_back: 인자를 그대로 perfect-forward → 컨테이너 안에서 shared_ptr 생성
l.emplace_back(new Widget, customDel);
//  1. new Widget → raw pointer
//  2. raw pointer를 emplace로 전달
//  3. 컨테이너 메모리 할당 — ⚠️ 여기서 OOM 등 예외 가능
//  4. shared_ptr 생성 못 하고 raw pointer 누수!
```

resource를 즉시 wrap (`make_shared`/`make_unique`)하면 안전:

```cpp
l.emplace_back(std::make_shared<Widget>(...));   // ✅
```

### 함정 3 — initializer_list

```cpp
std::vector<std::vector<int>> v;

v.push_back({1, 2, 3});      // initializer_list → vector<int> → push
v.emplace_back({1, 2, 3});   // ❌ {1,2,3}는 deduce 안 됨 (braced init은 type 아님)
v.emplace_back(std::initializer_list<int>{1, 2, 3});  // 명시
```

emplace는 perfect-forward — `{1,2,3}` 같은 braced init list는 타입이 아니라 deduce 실패.

### 함정 4 — 타입 안전성 약화

```cpp
class Date { Date(int y, int m, int d); };

std::vector<Date> dates;
dates.emplace_back(2020, 13, 99);   // 컴파일 OK — 런타임 비정상 날짜
```

push_back을 쓰면 호출자가 명시적으로 `Date(2020,13,99)` 만들어야 함 — 한 단계라도 실수 발견 가능. emplace는 그 단계를 합쳐 약점이 묻힘.

## 비교 표 — 한눈에

| 측면 | push_back / insert | emplace_back / emplace |
| --- | --- | --- |
| 임시 객체 | 1회 (변환 시) | 0회 |
| 변환 필요 시 | 임시 + move | 직접 생성 |
| 이미 element 타입 | copy/move | 동일 |
| explicit 호출 | ❌ | ⚠️ 가능 |
| 안전성 (예외 중 자원) | ✅ (임시가 wrap) | ⚠️ raw 자원 누수 가능 |
| set/map 중복 | 거부 시 작업 X | 일단 생성 |
| 코드 가독성 | 명시적 | 묵시적 (인자 → 객체) |

## 권장 패턴

### 명확히 emplace가 이길 때

```cpp
std::vector<std::string> v;
v.emplace_back("literal");                  // ✅
v.emplace_back(10, 'x');                    // ✅ string(10, 'x')

std::map<int, std::string> m;
m.emplace(42, "hello");                     // ✅
```

### push_back 유지가 안전할 때

```cpp
std::list<std::shared_ptr<Widget>> l;
l.push_back({new Widget, customDel});       // 자원 안전성

std::vector<std::regex> regexes;
regexes.push_back("pattern");               // explicit 차단 — 의도 명확
```

### 기존 객체

```cpp
Widget w(args);
v.push_back(w);                             // 의도 명확
v.push_back(std::move(w));                  // move 명시
```

→ 둘 다 문제 없음. 가독성 우선.

## 마이크로 벤치마크 주의

emplace의 이득은 **변환 비용**에 비례. 이미 element 타입 인자 / 트리비얼 타입엔 차이 거의 없음.

```cpp
std::vector<int> v;
v.push_back(42);     // ≈
v.emplace_back(42);  // ≈ 동일 (int는 변환·move 비용 0)
```

→ "emplace가 항상 빠르다" 신화 ❌.

## 핵심 정리

1. **emplace = 컨테이너 안에서 직접 생성** — 임시 객체 없음
2. **변환이 필요한 인자**, **중복 거의 없는 컨테이너**에서 이득
3. **explicit 생성자도 호출** — 의도치 않은 객체 생성 주의
4. **raw resource (`new`) 직접 전달 시 예외-안전성 손실** — `make_shared`/`make_unique` 사용
5. 무지성 emplace 치환 X — 조건 확인 후 적용
6. 이미 element 타입 인자엔 차이 없음

## 관련 항목

- [항목 21: make_unique / make_shared](/blog/programming/effective-modern-cpp/item21-prefer-make-unique-and-make-shared-to-direct-use-of-new)
- [항목 30: perfect forwarding 실패](/blog/programming/effective-modern-cpp/item30-familiarize-yourself-with-perfect-forwarding-failure-cases)
- [항목 41: pass by value](/blog/programming/effective-modern-cpp/item41-consider-pass-by-value-for-copyable-cheap-to-move-always-copied-params)
