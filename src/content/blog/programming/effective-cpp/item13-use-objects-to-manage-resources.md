---
title: "항목 13: 자원 관리에는 객체를 사용하라"
date: 2025-02-03T10:00:00
description: "RAII — 자원의 획득은 곧 초기화. 스마트 포인터로 자동 해제."
tags: [C++, Effective C++, RAII, Smart Pointer]
series: "Effective C++"
seriesOrder: 13
draft: true
---

> **초안** — 정리 진행 중

## 개요

수동으로 `new`/`delete`를 짝 맞추는 코드는 예외, early return, 새 분기 추가에 취약합니다. **자원을 객체로 감싸 소멸자가 정리하도록**(RAII) 위임하면 안전.

## 위험한 수동 관리

```cpp
void f() {
    Investment* pInv = createInvestment();
    // ...
    if (cond) return;          // pInv 누수!
    // ...
    delete pInv;
}
```

예외, 일찍 return, 새 코드 추가 — 모두 누수 위험.

## RAII 패턴

```cpp
void f() {
    std::unique_ptr<Investment> pInv(createInvestment());
    // ...
    if (cond) return;          // unique_ptr 소멸자가 자동 delete
    // ...
}                              // 정상 종료 시에도 자동 delete
```

**핵심 두 가지:**

1. **자원은 획득 즉시 객체에 넘긴다** — 생성자에서 자원 획득
2. **자원 관리 객체의 소멸자가 자원을 해제** — 어떤 경로로 빠져나가도 보장

## 표준 도구

- `std::unique_ptr` — 독점 소유 (EMC++ item 18)
- `std::shared_ptr` — 공유 소유, 참조 카운팅 (EMC++ item 19)
- `std::lock_guard`, `std::unique_lock` — 뮤텍스
- 컨테이너(`vector`, `string`) — 내부 메모리 자동 관리

C++98에선 `std::auto_ptr`가 있었지만 deprecated. C++11+ `unique_ptr` 사용.

## 직접 RAII wrapper

표준에 없는 자원이라면 직접 wrapper 작성.

```cpp
class FontHandle {
    Font f;
public:
    explicit FontHandle(FontHandle h) : f(h) {}
    ~FontHandle() { releaseFont(f); }
    Font get() const { return f; }
};
```

복사·대입 정책(EMC++ item 14 참고)을 신중히 결정.

## 핵심 정리

1. 자원 관리는 **객체에 위임** — 수동 delete는 위험
2. 생성자에서 획득, 소멸자에서 해제 (RAII)
3. 표준: `unique_ptr`, `shared_ptr`, `lock_guard`, 컨테이너 활용
4. 직접 wrapper 작성 시 복사 정책 명확히
