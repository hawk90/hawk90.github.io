---
title: "항목 11: 정의되지 않은 private 함수보다 삭제된 함수를 선호하라"
date: 2025-01-06T14:00:00
description: "= delete가 private 미정의보다 안전하고 더 강력한 이유."
tags: [C++, deleted Functions, Modern C++]
series: "Effective Modern C++"
seriesOrder: 11
draft: true
---

> **초안** — 정리 진행 중

## 개요

C++98에서 함수를 "사용 불가"로 만들려면 `private`로 선언하고 정의를 빼는 트릭을 썼습니다. C++11의 `= delete`는 같은 의도를 더 명확하고 강력하게 표현합니다.

## C++98 방식 — 정의되지 않은 private

```cpp
class basic_ios {
public:
    // ...
private:
    basic_ios(const basic_ios&);              // 선언만, 정의 없음
    basic_ios& operator=(const basic_ios&);
};
```

**문제점:**
- 멤버/친구 함수 안에서 호출하면 **링크 에러**(런타임에 가까운 시점)
- 에러 메시지가 "사용 불가" 의도를 명확히 전달하지 않음

## C++11 방식 — `= delete`

```cpp
class basic_ios {
public:
    basic_ios(const basic_ios&) = delete;
    basic_ios& operator=(const basic_ios&) = delete;
};
```

**장점:**
- **컴파일 타임에** 에러 — 더 빠른 피드백
- **public**으로 선언해도 됨 — 에러 메시지에서 "deleted"가 표시되어 의도가 명확
- 멤버·친구뿐 아니라 외부 호출에도 동일하게 차단

## `= delete`가 더 강력한 이유

### 1. 비-멤버 함수에도 적용 가능

`private` 트릭은 멤버 함수만 가능. `= delete`는 비-멤버에도 사용 가능.

```cpp
bool isLucky(int);
bool isLucky(char) = delete;     // char로 호출 차단
bool isLucky(bool) = delete;     // bool로 호출 차단
bool isLucky(double) = delete;   // double, float로 호출 차단

isLucky(7);    // OK
isLucky('a');  // 에러: deleted
isLucky(true); // 에러
```

### 2. 템플릿 인스턴스 차단

특정 타입에 대해서만 템플릿 인스턴스화를 막을 수 있습니다.

```cpp
template<typename T>
void processPointer(T* ptr);

template<>
void processPointer<void>(void*) = delete;   // void*는 차단
template<>
void processPointer<char>(char*) = delete;   // C 문자열도 차단
```

`private` 멤버 트릭은 템플릿 특수화에 적용할 수 없습니다 (특수화는 다른 접근 권한을 가질 수 없음).

## 핵심 정리

1. `= delete`는 컴파일 타임 에러 — `private` 미정의는 링크 시점
2. `public`으로 선언해서 에러 메시지를 명확히
3. 비-멤버 함수와 템플릿 특수화에도 적용 가능
4. C++11 이상이면 `= delete`가 항상 우선
