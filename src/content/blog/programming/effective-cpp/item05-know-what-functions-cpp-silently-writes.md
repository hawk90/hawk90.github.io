---
title: "항목 5: C++가 자동으로 작성·호출하는 함수들을 알아두라"
date: 2025-02-02T10:00:00
description: "기본 생성자, 복사 생성자, 복사 대입, 소멸자 — 컴파일러가 언제 만들어주는가."
tags: [C++, Effective C++, Special Member Functions]
series: "Effective C++"
seriesOrder: 5
draft: true
---

> **초안** — 정리 진행 중

## 개요

빈 클래스에도 컴파일러는 네 가지 멤버 함수를 자동 생성합니다 (필요할 때):
- 기본 생성자
- 복사 생성자
- 복사 대입 연산자
- 소멸자

(C++11+ 에선 move 생성자/대입도 추가 — 항목 17, 그리고 EMC++ item 17 참고)

## 자동 생성 예시

```cpp
class Empty {};

// 컴파일러가 만드는 것:
class Empty {
public:
    Empty() {}                              // 기본 생성자
    Empty(const Empty& rhs) { /* 멤버별 복사 */ }
    ~Empty() {}                             // 소멸자 (non-virtual)
    Empty& operator=(const Empty& rhs) { /* 멤버별 복사 대입 */ return *this; }
};
```

이 함수들은 **사용될 때만** 생성됩니다.

## 자동 생성이 안 되는 경우

### 참조 멤버, const 멤버

```cpp
class NamedObject {
    std::string& nameRef;     // 참조 멤버
    const std::string objectValue;  // const 멤버
};
```

복사 대입 연산자 자동 생성 불가 — 참조는 한 번 묶이면 다른 것을 가리킬 수 없고, const도 마찬가지.

### Base가 복사 대입 연산자를 private로 선언

```cpp
class Base {
private:
    Base& operator=(const Base&);   // private — 외부 사용 차단
};

class Derived : public Base {
    // 컴파일러가 자동으로 operator= 생성하려 하지만
    // Base의 private operator=를 부를 수 없음 → 자동 생성 실패
};
```

## 핵심 정리

1. 컴파일러는 필요할 때 4가지 특수 멤버 함수를 자동 생성
2. 생성된 함수는 모두 public이고 inline
3. 참조/const 멤버, 또는 base의 제약이 있으면 자동 생성 실패
4. C++11+ 에선 move 연산도 자동 생성 (조건은 EMC++ item 17)
