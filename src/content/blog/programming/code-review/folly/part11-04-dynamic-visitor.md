---
title: "folly dynamic Visitor pattern — type별 분기"
date: 2026-06-06T09:16:00
description: "Part 11-04: dynamic을 type별로 처리하는 visitor 패턴. std::visit-like helper로 switch boilerplate를 줄인다."
series: "Folly Code Review"
seriesOrder: 52
tags: [cpp, folly, dynamic, visitor, pattern]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

## 한 줄 요약

`folly::dynamic`은 6가지 타입을 담는 tagged union이고, 처리 코드도 type별로 분기가 잦다. switch + isXxx의 반복을 줄이려면 **visitor 헬퍼**를 만든다. `std::visit`와 같은 정신이지만 dynamic은 closed type set이라 더 단순한 형태가 가능하다.

## 동기 — 반복되는 type 분기

JSON-like dynamic을 일반화 처리할 때 자주 나오는 모양.

```cpp
void print(const folly::dynamic& d) {
  if (d.isNull())       std::cout << "null";
  else if (d.isBool())   std::cout << d.getBool();
  else if (d.isInt())    std::cout << d.getInt();
  else if (d.isDouble()) std::cout << d.getDouble();
  else if (d.isString()) std::cout << d.getString();
  else if (d.isArray())  printArray(d);
  else if (d.isObject()) printObject(d);
}
```

이 패턴이 print, validate, transform, schema check 등 곳곳에서 반복된다. type 하나 빼먹으면 silent buggy. helper로 한 번에 처리하자는 게 visitor 패턴이다.

## 직접 visitor — overloaded helper

C++17의 `overloaded` 트릭으로 lambda 세트를 visitor로 만들 수 있다.

```cpp
template <class... Ts> struct overloaded : Ts... { using Ts::operator()...; };
template <class... Ts> overloaded(Ts...) -> overloaded<Ts...>;

void visit(const folly::dynamic& d, auto&& v) {
  if (d.isNull())        v(nullptr);
  else if (d.isBool())   v(d.getBool());
  else if (d.isInt())    v(d.getInt());
  else if (d.isDouble()) v(d.getDouble());
  else if (d.isString()) v(d.getString());
  else if (d.isArray())  v(d.items_array());  // const reference to array
  else if (d.isObject()) v(d.items_object());
}

// 사용
visit(d, overloaded{
  [](std::nullptr_t)   { std::cout << "null"; },
  [](bool b)           { std::cout << b; },
  [](int64_t i)        { std::cout << i; },
  [](double dv)        { std::cout << dv; },
  [](const std::string& s) { std::cout << s; },
  [](const auto& container) { std::cout << "container"; },
});
```

`std::visit(variant, overloaded{...})`와 같은 모양이다. lambda 한 줄로 type 분기.

장점:
- 컴파일러가 타입별 처리 누락을 잡아준다 (`auto`로 catch-all 두지 않으면).
- 코드가 한 군데 모인다.
- 람다 별 type-specific 처리가 명료.

단점:
- dynamic은 std::visit과 달리 native 지원이 아니므로 위 `visit` 함수를 직접 작성.

## recursive traversal

JSON tree 전체를 도는 패턴.

```cpp
void traverse(const folly::dynamic& d, auto&& fn) {
  fn(d); // visit current
  if (d.isArray()) {
    for (const auto& e : d) traverse(e, fn);
  } else if (d.isObject()) {
    for (const auto& [k, v] : d.items()) traverse(v, fn);
  }
}

// 사용 — 모든 string 값 수집
std::vector<std::string> strings;
traverse(json, [&](const folly::dynamic& v) {
  if (v.isString()) strings.push_back(v.getString());
});
```

이런 helper는 schema validation, redaction(민감정보 마스킹), telemetry 추출 등에 자주 쓰인다.

## transform — 새 dynamic 생성

```cpp
folly::dynamic transform(const folly::dynamic& d, auto&& fn) {
  if (d.isArray()) {
    folly::dynamic out = folly::dynamic::array;
    for (const auto& e : d) out.push_back(transform(e, fn));
    return out;
  } else if (d.isObject()) {
    folly::dynamic out = folly::dynamic::object;
    for (const auto& [k, v] : d.items()) out[k] = transform(v, fn);
    return out;
  }
  return fn(d); // leaf
}

// 사용 — 모든 password 필드를 *** 로 마스킹
auto redacted = transform(d, [](const folly::dynamic& v) -> folly::dynamic {
  // leaf 처리만, key는 부모에서 처리 필요(여기선 단순화)
  return v;
});
```

leaf만 변환하는 패턴. key까지 보려면 traverse에서 (key, value) 쌍을 함께 넘기는 변형 필요.

## std::visit와의 차이

| | `std::visit` | dynamic visitor |
|--|-------------|----------------|
| 대상 | `std::variant<Ts...>` | `folly::dynamic` (6 fixed types) |
| dispatch | jump table 또는 if chain | if chain |
| 누락 type 컴파일 에러 | yes | no (런타임에 못 매칭하면 무시) |
| recursive | 직접 | 직접 |

dynamic은 std::visit를 직접 못 쓴다(타입 시스템이 다름). 위 `visit` helper가 그 자리를 메운다. 누락 검출이 약한 게 약점이라, catch-all lambda를 두거나 `__builtin_unreachable()`로 끝맺어 missing case를 빨리 잡는다.

## 코드 리뷰 포인트

### 1. 누락 type 검출

```cpp
// 회피 — catch-all 없음, missing type silent
if (d.isString()) handle(d.getString());
else if (d.isInt()) handle(d.getInt());
// double/bool/null/array/object가 silent 무시

// Good — 명시적 else
if (d.isString()) handle(d.getString());
else if (d.isInt()) handle(d.getInt());
else throw "unsupported type: " + d.typeName();
```

dynamic은 컴파일러가 도와주지 않으므로 unhandled case는 명시적으로 throw/log.

### 2. visit helper를 한 헤더에 두고 재사용

```cpp
// utility/DynamicVisit.h
namespace mylib {
  template <class V>
  decltype(auto) visit(const folly::dynamic& d, V&& v) {
    // ... 위 구현 ...
  }
}
```

dynamic을 다루는 모든 모듈에서 이 visit을 쓰게 하면 일관성이 생긴다.

### 3. recursive traversal에 깊이 제한

```cpp
void traverse(const folly::dynamic& d, auto&& fn, int depth = 0) {
  if (depth > 64) throw "too deep"; // DoS 방어
  fn(d);
  if (d.isArray()) for (const auto& e : d) traverse(e, fn, depth + 1);
  else if (d.isObject()) for (const auto& [k, v] : d.items()) traverse(v, fn, depth + 1);
}
```

외부 JSON은 깊이 무한이 가능. recursion limit으로 stack overflow 방어.

### 4. const-correctness

```cpp
// 회피 — const& 안 받음
void process(folly::dynamic& d) { ... } // 호출자가 const 객체 못 넘김

// Good
void process(const folly::dynamic& d) { ... }
```

visitor가 변경을 안 한다면 const&로.

## 안티패턴

### 1. visit 안에서 dynamic을 다시 dynamic으로 변환

```cpp
// 회피
visit(d, overloaded{
  [](int64_t i) { folly::dynamic dd = i; ... } // 의미 없음
});
```

이미 type-specific 람다인데 다시 dynamic으로 감싸면 visitor를 쓰는 의미가 사라진다.

### 2. visitor에서 비싼 작업

```cpp
// 회피
traverse(huge_json, [](const folly::dynamic& v) {
  if (v.isString()) sendToLogger(v.getString()); // I/O — 매 string마다
});
```

leaf마다 I/O를 호출하면 매우 느려진다. 일단 모은 뒤 batch로.

### 3. switch on typeName() string

```cpp
// 회피
auto t = d.typeName(); // string
if (t == "string") ...
else if (t == "int64") ...
```

`typeName`은 디버그/로그용. 분기에는 `is*` 메서드 사용.

## 정리

- dynamic은 6가지 closed type이므로 **visitor helper**가 자연스럽다.
- `overloaded{...}` lambda 세트로 type별 처리를 한 곳에.
- recursive traversal로 tree 전체 순회 (redaction, schema check 등).
- transform helper로 새 dynamic 트리 생성.
- 컴파일러 도움이 약하므로 catch-all + recursion limit 명시.
- visit/traverse/transform 같은 helper는 공용 헤더에 두고 재사용.

## 다음 편

[Part 12-01 Singleton vs Meyers](/blog/programming/code-review/folly/part12-01-singleton-vs-meyers) — Part 12 시작. Folly의 SingletonVault가 왜 Meyers singleton보다 안전한지.

## 관련 항목

- [Part 11-01 folly::dynamic](/blog/programming/code-review/folly/part11-01-dynamic) — 타입 모델
- [Part 11-03 Dynamic ↔ struct](/blog/programming/code-review/folly/part11-03-dynamic-struct) — boundary에서 변환
- [GoF Visitor](/blog/programming/design/gof/part4-visitor) — 클래식 visitor 패턴
