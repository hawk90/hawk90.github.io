---
title: "항목 6: 자동 생성 함수가 싫으면 명시적으로 금지하라"
date: 2025-02-02T11:00:00
description: "복사를 막고 싶을 때 — C++98의 private 트릭과 C++11의 = delete."
tags: [C++, Effective C++, Special Member Functions]
series: "Effective C++"
seriesOrder: 6
draft: true
---

> **초안** — 정리 진행 중

## 개요

복사 불가능해야 하는 클래스(예: 부동산 객체, 파일 핸들)는 자동 생성된 복사 연산을 막아야 합니다. C++98 시대엔 트릭이 필요했지만 C++11에선 `= delete` 한 줄.

## C++98 방식 — `private` + 정의 없음

```cpp
class HomeForSale {
private:
    HomeForSale(const HomeForSale&);             // 선언만
    HomeForSale& operator=(const HomeForSale&);
};
```

외부에선 `private` 접근 차단, 내부/친구에선 정의 없어 링크 에러. 다만 멤버/친구 안에서는 컴파일은 통과되고 링크 시점에 에러 — 피드백이 늦음.

## 더 강력한 방식 — Uncopyable 베이스 클래스

```cpp
class Uncopyable {
protected:
    Uncopyable() {}
    ~Uncopyable() {}
private:
    Uncopyable(const Uncopyable&);
    Uncopyable& operator=(const Uncopyable&);
};

class HomeForSale : private Uncopyable { /* ... */ };
```

복사 시 base 클래스의 복사 함수가 호출되어야 하는데 private이라 컴파일 에러. 컴파일 시점에 잡힘. (Boost의 `boost::noncopyable`이 같은 패턴.)

## C++11 방식 — `= delete`

```cpp
class HomeForSale {
public:
    HomeForSale(const HomeForSale&) = delete;
    HomeForSale& operator=(const HomeForSale&) = delete;
};
```

훨씬 명확. **public**으로 두는 것이 권장 — 에러 메시지가 "deleted function"으로 나와 의도가 분명.

## 핵심 정리

1. 복사 금지: C++11+ 라면 `= delete`
2. C++98만 쓴다면 `private` + 정의 없음 (또는 Uncopyable base)
3. `delete`는 컴파일 타임에 잡힘 — `private` 트릭은 링크 타임
4. EMC++ item 11도 참고
