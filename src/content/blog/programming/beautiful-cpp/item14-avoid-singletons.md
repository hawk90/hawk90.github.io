---
title: "항목 14: 싱글턴을 피하라"
date: 2026-05-09T13:00:00
description: "싱글턴이 숨기는 비용과 의존성 주입이라는 대안"
tags: [C++, Design Patterns, Dependency Injection]
series: "Beautiful C++"
seriesOrder: 14
draft: true
---


## 핵심 내용

- 싱글턴은 **숨겨진 전역 상태**다 — 호출 그래프에 안 나타나서 결합도를 보이지 않게 한다
- 테스트가 어렵다 (mock 주입 불가, 테스트 간 상태 공유)
- 멀티스레드에서 초기화 순서·동기화 함정이 많다
- 대부분의 경우 **의존성 주입(DI)**으로 같은 효과를 얻을 수 있다
- "단 하나만 필요해서 싱글턴"은 보통 잘못된 추론이다 — **누구도 둘을 만들지 않을 책임**과 **둘을 못 만들게 강제하는 책임**은 다르다

## 예제 코드

```cpp
// Bad: 싱글턴 — 어디서나 전역 접근 가능, 테스트 불가
class Logger {
public:
    static Logger& instance() {
        static Logger inst;
        return inst;
    }
    void log(const std::string& msg);
private:
    Logger() = default;
};

void do_work() {
    Logger::instance().log("working");  // 숨겨진 의존성
}

// Good: 명시적 의존성 주입
class Logger {
public:
    virtual void log(const std::string& msg) = 0;
    virtual ~Logger() = default;
};

void do_work(Logger& log) {            // 의존성이 시그니처에 드러남
    log.log("working");
}

// 테스트 시: MockLogger를 주입
```

## 정리

싱글턴은 **"전역 변수 + OOP 위장"**일 뿐이다. 의존성을 명시적 인자로 주입하면 결합도·테스트·동시성이 모두 좋아진다.
