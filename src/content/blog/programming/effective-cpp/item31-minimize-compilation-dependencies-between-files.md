---
title: "항목 31: 파일 사이 컴파일 의존성을 최소화하라"
date: 2025-02-05T15:00:00
description: "Pimpl 관용구와 인터페이스 클래스로 빌드 시간을 줄이는 패턴."
tags: [C++, Effective C++, Pimpl, Compilation]
series: "Effective C++"
seriesOrder: 31
draft: true
---

> **초안** — 정리 진행 중

## 개요

C++ 빌드 시간이 길어지는 주 원인은 **헤더 파일의 의존성**. Pimpl 관용구와 인터페이스 클래스로 의존성을 끊으면 큰 프로젝트에서 빌드 시간 ↓.

## 문제 — 멤버 변수가 헤더 의존성을 강요

```cpp
// Person.h
#include <string>          // 의존성 ↑
#include "Date.h"          // 의존성 ↑
#include "Address.h"       // 의존성 ↑

class Person {
    std::string name;
    Date        birthday;
    Address     addr;
public:
    // ...
};
```

`Person.h`를 포함하는 모든 파일은 `string`, `Date.h`, `Address.h`까지 모두 컴파일해야 함. `Date.h`가 바뀌면 → 모든 의존 파일 재컴파일.

## 해결 1 — Pimpl (Pointer to Implementation)

```cpp
// Person.h
#include <memory>

class PersonImpl;        // 전방 선언만

class Person {
    std::unique_ptr<PersonImpl> pImpl;
public:
    Person(/* ... */);
    ~Person();           // .cpp에 정의
    std::string name() const;
};

// Person.cpp
#include "Person.h"
#include "PersonImpl.h"   // string, Date, Address 의존성은 여기만

Person::~Person() = default;   // PersonImpl 완전 타입 필요 — EMC++ item 22
```

헤더 의존성이 `<memory>`만으로 줄어듦.

## 해결 2 — 인터페이스 클래스 (추상 base + 팩토리)

```cpp
// Person.h
class Person {
public:
    virtual ~Person() {}
    virtual std::string name() const = 0;
    static std::unique_ptr<Person> create(/* ... */);
};

// Person.cpp
class RealPerson : public Person { /* 실제 구현 */ };
std::unique_ptr<Person> Person::create(/* ... */) {
    return std::make_unique<RealPerson>(/* ... */);
}
```

사용자는 `Person*` 또는 `unique_ptr<Person>`만 다룸. 구현 헤더 노출 없음.

## 트레이드오프

- **장점**: 컴파일 의존성 ↓, 빌드 시간 ↓, 인터페이스 안정성 ↑
- **단점**:
  - Pimpl: 간접 메모리 접근 (한 단계 더), 동적 할당
  - 인터페이스 클래스: 가상 호출 비용, 메모리 한 단계 더

핫패스가 아니면 보통 무시할 비용. 라이브러리 헤더, 자주 변경되는 큰 헤더에 가장 유용.

## 일반 가이드

- **선언만 필요하면 전방 선언** (`class X;`) — 정의 #include 회피
- **참조/포인터 멤버**는 전방 선언으로 충분 — 값 멤버만 완전 타입 필요
- 함수 매개변수/반환 타입도 전방 선언으로 OK
- **표준 헤더는 전방 선언 금지** — 표준이 허용 안 함

## 핵심 정리

1. 헤더 의존성 = 빌드 시간 비용
2. Pimpl로 멤버 의존성 숨김
3. 인터페이스 클래스로 구현 자체를 분리
4. 가능한 자리에선 전방 선언으로 #include 대체
