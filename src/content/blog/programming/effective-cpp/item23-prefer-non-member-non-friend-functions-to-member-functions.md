---
title: "항목 23: 멤버 함수보다 비-멤버 비-friend 함수를 선호하라"
date: 2025-02-04T15:00:00
description: "캡슐화는 클래스 외부 코드 수가 적을수록 강해진다."
tags: [C++, Effective C++, Encapsulation, API Design]
series: "Effective C++"
seriesOrder: 23
draft: true
---

> **초안** — 정리 진행 중

## 개요

직관적으로는 멤버 함수가 캡슐화를 강화할 것 같지만, 사실은 반대 — **클래스 내부에 직접 접근하는 코드 수가 적을수록 캡슐화가 강해집니다.** 멤버 함수와 friend는 접근권이 있고, 비-멤버 비-friend는 public 인터페이스만 사용하므로 캡슐화 친화적.

## 예제

```cpp
class WebBrowser {
public:
    void clearCache();
    void clearHistory();
    void removeCookies();

    // 옵션 A: 멤버 함수
    void clearEverything() {
        clearCache();
        clearHistory();
        removeCookies();
    }
};

// 옵션 B: 비-멤버 함수
void clearBrowser(WebBrowser& wb) {
    wb.clearCache();
    wb.clearHistory();
    wb.removeCookies();
}
```

옵션 B는 public 인터페이스만 사용 — `WebBrowser` 내부 변경이 영향 없음. 옵션 A는 멤버라 잠재적으로 private 멤버 접근 가능.

## 네임스페이스 활용

비-멤버 함수를 같은 네임스페이스에 묶어 "모듈" 형성:

```cpp
namespace WebBrowserStuff {
    class WebBrowser { /* ... */ };
    void clearBrowser(WebBrowser& wb);
    void bookmark(WebBrowser& wb, const std::string& url);
    void share(WebBrowser& wb);
}
```

기능별로 헤더 파일을 분리할 수도 있어 의존성 관리 ↑.

## 비-멤버 함수의 추가 장점

- **확장성**: 다른 사람이 이미 컴파일된 클래스에 새 비-멤버 함수 추가 가능
- **packaging 유연성**: 자주 쓰는 함수와 드물게 쓰는 함수를 다른 헤더에

## 멤버 함수가 적합한 경우

- **객체 상태에 직접 접근** — getter/setter, 핵심 동작
- **객체의 명확한 일부** — `string::length()` 같은 본질적 속성
- **다형적 동작** (virtual)

## 핵심 정리

1. 비-멤버 비-friend가 캡슐화에 유리
2. 같은 네임스페이스로 묶어 모듈화
3. 핵심 동작은 멤버, 편의 함수는 비-멤버
