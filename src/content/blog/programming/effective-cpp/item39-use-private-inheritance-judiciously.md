---
title: "항목 39: private 상속을 신중하게 사용하라"
date: 2025-02-06T17:00:00
description: "private 상속의 의미와 EBO(empty base optimization), composition과의 비교."
tags: [C++, Effective C++, Inheritance, Private]
series: "Effective C++"
seriesOrder: 39
draft: true
---

> **초안** — 정리 진행 중

## 개요

`private` 상속은 IS-A가 아닌 **is-implemented-in-terms-of** 관계 — composition과 같은 의미. 보통 composition이 더 단순하지만, 두 가지 경우엔 private 상속이 우월합니다.

## private 상속의 의미

- 외부에서 derived → base 변환 불가
- base의 멤버는 모두 derived에서 private이 됨

```cpp
class Person { /* ... */ };
class Student : private Person { /* ... */ };

void eat(const Person& p);

Student s;
eat(s);    // 에러! private 상속이라 외부에선 IS-A 아님
```

## composition vs private 상속

대부분 경우 composition이 더 간단하고 나음. 두 경우엔 private 상속 우위:

### 1. base에 protected 멤버 또는 virtual 함수 접근

```cpp
class Timer {
public:
    virtual void onTick() const;
};

// composition으로는 onTick의 derived 동작 못 만듦
class Widget : private Timer {
    void onTick() const override { /* widget 작업 */ }
};
```

private 상속이라 base의 virtual 재정의 가능.

### 2. EBO (Empty Base Optimization)

```cpp
class Empty {};   // size 1 (C++ 표준 — 객체는 0이 아닌 크기)

class HoldsAnInt {
    int x;
    Empty e;       // composition — 패딩 포함 8 byte
};

class HoldsAnInt2 : private Empty {  // EBO 적용 — Empty가 자리 안 차지
    int x;
};

sizeof(HoldsAnInt);   // 8
sizeof(HoldsAnInt2);  // 4
```

빈 클래스를 멤버로 가지는 건 메모리 차지하지만, base로 두면 EBO로 0 byte. 다중 상속에서도 적용.

## 가이드

- 보통 → composition
- protected/virtual 접근 필요 → private 상속
- EBO 활용 → private 상속

## 핵심 정리

1. private 상속 = is-implemented-in-terms-of (composition과 같은 의미)
2. 대부분 composition이 더 단순
3. base의 protected/virtual 활용 필요 시 private 상속
4. EBO로 빈 base 멤버의 메모리 비용 제거
