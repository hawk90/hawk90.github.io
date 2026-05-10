---
title: "항목 18: 인터페이스는 올바르게 쓰기 쉽고 잘못 쓰기 어렵게 만들라"
date: 2025-02-04T10:00:00
description: "타입 시스템·기본값·반환 타입으로 사용자 실수를 컴파일 타임에 차단."
tags: [C++, Effective C++, API Design]
series: "Effective C++"
seriesOrder: 18
draft: true
---

> **초안** — 정리 진행 중

## 개요

좋은 인터페이스는 사용자가 잘못 호출할 가능성을 **컴파일 타임에 차단**합니다. 주석으로 "조심하세요"를 적는 대신, 타입 시스템이 잘못된 호출을 막도록 설계.

## 예제 — 날짜 생성자

```cpp
class Date {
public:
    Date(int month, int day, int year);   // 잘못 쓰기 쉬움
};

Date d1(30, 3, 1995);     // 30월 3일?? 의미 모호
Date d2(2, 30, 1995);     // 2월 30일은 없는데 컴파일은 통과
```

해결: 별도 타입.

```cpp
struct Day   { explicit Day(int d) : val(d) {}   int val; };
struct Month { explicit Month(int m) : val(m) {} int val; };
struct Year  { explicit Year(int y) : val(y) {}  int val; };

class Date {
public:
    Date(const Month& m, const Day& d, const Year& y);
};

Date d1(Day(30), Month(3), Year(1995));     // 컴파일 에러
Date d2(Month(3), Day(30), Year(1995));     // OK
```

각 인자 타입이 달라 잘못된 순서는 컴파일 에러.

## 값 범위 제한

```cpp
class Month {
public:
    static Month Jan() { return Month(1); }
    static Month Feb() { return Month(2); }
    // ...
private:
    explicit Month(int m);
};

Date d(Month::Jan(), Day(15), Year(2025));   // 1~12 외 입력 불가
```

## 일관된 타입

표준 라이브러리와 같은 관습 → 사용자 부담 ↓.

```cpp
container.size();      // size_t — 표준
container.length();    // size_t — string도 동일
```

자체 컨테이너에서도 같은 타입 패턴.

## 자원 반환은 스마트 포인터로

```cpp
// 나쁨
Investment* createInvestment();    // 사용자가 delete 잊을 위험

// 좋음
std::shared_ptr<Investment> createInvestment();   // 자동 해제 강제
```

`shared_ptr`에 deleter도 박아주면 사용자가 어떻게 해제할지 고민 안 해도 됨.

## 핵심 정리

1. 잘못된 사용을 컴파일 타임에 막을 수 있도록 타입 설계
2. 값 범위 제한, 표준 관습 일관성
3. 자원 반환은 스마트 포인터로 사용자 실수 차단
4. 의도가 코드에 명확히 드러나도록
