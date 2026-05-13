---
title: "Google C++ Style — 시리즈 개요"
date: 2025-05-13T00:00:00
description: "Google C++ Style Guide — 단일 코드베이스의 일관성을 위한 실용적 규칙. 가독성과 유지보수 우선, '예외 금지' 등 강한 의견을 가진 스타일."
tags: [Google, C++, Style-Guide, Standards, Series]
series: "Google C++ Style"
seriesOrder: 0
draft: false
---

> Google의 사내 C++ 표준. 십수 년 검증된 — 대규모 코드베이스의 일관성 규칙.

## 위치와 성격

```
MISRA C / C++  ── 안전중요 (자동차)
CERT C / C++   ── 보안 (CVE 예방)
AUTOSAR C++14  ── 자동차 + 모던 C++
High Integrity ── 일반 안전중요

Google C++     ── 대규모 코드베이스의 가독성 / 유지보수
```

다른 표준이 — 안전 / 보안을 중심으로 *금지*에 가깝다면, Google은 — *읽기 쉬움 / 유지 쉬움*을 중심으로 *선택*에 가깝다.

## 핵심 원칙

> **Optimize for the reader, not the writer.**

코드를 — 쓰는 시간보다 읽는 시간이 길다. 그래서:

- 한 사람의 천재성보다 — 모두의 가독성
- 새로운 기법 도입은 — 도입 비용까지 고려
- "내가 이해할 수 있는" 코드보다 — "신참이 이해할 수 있는" 코드

## 의견이 강한 결정들

Google의 스타일은 — 다른 표준과 *다른* 선택이 많다.

### 예외 금지

```cpp
// Google C++:
absl::Status DoSomething();   // 반환값으로 에러 전달

// 일반:
void DoSomething();   // 실패 시 throw
```

이유 — *기존 코드와의 호환*. 예외를 안 쓰는 거대한 코드베이스에 — 예외를 도입할 수 없음. 새 코드도 따라야 일관성.

### RTTI 제한

```cpp
dynamic_cast<Derived*>(p);   // 사용 금지 (테스트 외)
```

다형성 대신 — 인터페이스 설계로 해결.

### Implicit Conversion 금지

```cpp
class MyString {
public:
    explicit MyString(const char* s);   // ← explicit 필수
};
```

`MyString s = "hello";` 같은 — 묵시적 변환 차단.

### 다중 상속 제한

```cpp
// 허용:
class A : public Interface1, public Interface2 { };   // 인터페이스만

// 금지:
class A : public Concrete1, public Concrete2 { };   // 구체 다중 상속
```

## 강한 권장 사항

### Smart Pointer

```cpp
// 권장:
std::unique_ptr<Foo> p = std::make_unique<Foo>();

// 회피:
Foo* p = new Foo();   // 원시 포인터로 소유권 표현 금지
```

소유권을 — 타입으로 표현. `unique_ptr` / `shared_ptr`로.

### `auto` 신중하게

```cpp
// OK:
auto it = vec.begin();   // 타입 자명

// 회피:
auto result = ComputeSomething();   // 타입 불명확
```

`auto`는 — *타입이 자명*할 때만.

### Trailing Return 신중하게

```cpp
// 보통:
int Add(int a, int b);

// trailing return — 템플릿 등 필요한 곳만:
template <typename T>
auto Add(T a, T b) -> decltype(a + b);
```

## 형식 규칙

- 줄 길이 — 80자
- 들여쓰기 — 2 spaces (탭 금지)
- `{`는 — 함수 정의 다음 줄, 그 외 같은 줄
- 한 줄에 — 한 선언만

```cpp
// Good:
int x = 10;
int y = 20;

// Bad:
int x = 10, y = 20;
```

## 명명 규칙

```
Type:       PascalCase    (MyClass, MyEnum)
Variable:   snake_case    (my_var, table_name)
Member:     snake_case_   (my_var_)             ← 끝에 _
Constant:   kCamelCase    (kDaysInWeek)
Function:   PascalCase    (DoWork, GetCount)
Namespace:  snake_case    (utility, my_app)
File:       snake_case.cc (my_file.cc, my_file.h)
```

## 시리즈 구성

이 시리즈에서 — 다음 주제를 차례로 살펴본다.

1. **개요와 철학** — Optimize for reader, Google의 결정 동기 (이 글)
2. **헤더 파일** — include guard, forward declaration, inline, 순서
3. **스코프** — namespace, anonymous namespace, nonmember static
4. **클래스** — 생성자, struct vs class, 상속, 연산자 오버로딩
5. **함수** — 출력 매개변수, 길이, 오버로딩, 기본 인자
6. **C++ 기능** — 소유권 / 참조 / 캐스팅 / 예외 / RTTI
7. **명명** — 모든 식별자의 이름 규칙
8. **주석** — 파일 / 클래스 / 함수 / 변수 / TODO
9. **형식** — 줄 길이 / 공백 / 중괄호 / 조건문
10. **도구와 결론** — clang-format, lint, 다른 표준 비교

## 적용 대상

이 스타일이 — 모두에게 맞지는 않는다.

```
잘 맞음:
- 거대한 코드베이스 (모놀리식)
- 신규 인원 유입이 많은 팀
- 기존 코드에 예외가 거의 없음

덜 맞음:
- 안전중요 / 인증 필요 (MISRA / AUTOSAR가 우선)
- 보안 중심 (CERT가 우선)
- 모던 C++ 적극 활용 (예외 / RTTI 등 필수)
```

## 관련 항목

- [CERT C — 시리즈 개요](/blog/embedded/standards/cert-c/00-overview) — 보안 중심
- [AUTOSAR C++14 — 시리즈 개요](/blog/embedded/standards/autosar-cpp/00-overview) — 자동차 + 모던 C++
- [Effective Modern C++ — 시리즈 개요](/blog/programming/cpp/effective-modern-cpp/) — C++11/14 모범 사례
