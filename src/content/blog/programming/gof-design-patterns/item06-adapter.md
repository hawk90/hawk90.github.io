---
title: "GoF 6: Adapter"
date: 2026-02-02T10:00:00
description: "호환되지 않는 인터페이스를 클라이언트가 기대하는 형태로 변환."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 6
draft: true
---

## 의도

클래스의 인터페이스를 클라이언트가 기대하는 다른 인터페이스로 **변환**합니다. 호환되지 않는 인터페이스 때문에 함께 동작할 수 없는 클래스들을 협력 가능하게 만듭니다.

## 동기

기존 라이브러리의 클래스를 그대로 사용하고 싶지만 인터페이스가 우리 코드와 맞지 않는 경우 — 라이브러리 코드를 수정할 수 없으면 어댑터로 감쌉니다.

## 적용 가능성

- 기존 클래스를 사용하고 싶은데 인터페이스가 우리 요구와 안 맞을 때
- 재사용 가능한 클래스를 만들고 싶은데, 협력해야 할 클래스의 인터페이스가 미리 알려지지 않을 때
- (object adapter 한정) 여러 기존 서브클래스를 사용하고 싶은데 각각을 서브클래싱하기 비실용적일 때

## 두 형태

### Object Adapter (composition) — 권장
어댑터가 어댑티(adaptee)를 멤버로 보유.

### Class Adapter (다중 상속)
어댑터가 어댑티와 타깃 인터페이스를 모두 상속.

## 구조 — Object Adapter

```
   Client ─► Target (interface)
                 △
                 │
              Adapter ◇──► Adaptee (existing)
              + request()       + specificRequest()
```

## C++ 구현 — Object Adapter

```cpp
// 클라이언트가 기대하는 인터페이스
class Logger {
public:
    virtual ~Logger() = default;
    virtual void log(const std::string& msg) = 0;
};

// 기존 라이브러리 (수정 불가)
class LegacyPrinter {
public:
    void print(const char* fmt, ...) { /* C-style printf */ }
};

// 어댑터
class LegacyLoggerAdapter : public Logger {
    LegacyPrinter& printer;
public:
    explicit LegacyLoggerAdapter(LegacyPrinter& p) : printer(p) {}
    void log(const std::string& msg) override {
        printer.print("%s\n", msg.c_str());
    }
};

// 클라이언트
void doWork(Logger& l) {
    l.log("hello");
}

LegacyPrinter lp;
LegacyLoggerAdapter adapter(lp);
doWork(adapter);
```

## C++ 구현 — Class Adapter

```cpp
class LegacyLoggerAdapter : public Logger, private LegacyPrinter {
public:
    void log(const std::string& msg) override {
        print("%s\n", msg.c_str());     // base의 메서드 직접 호출
    }
};
```

다중 상속 사용 — composition보다 결합도 ↑, 유연성 ↓. C++에선 거의 안 쓰임.

## C 구현

```c
typedef struct Logger {
    void (*log)(struct Logger*, const char*);
} Logger;

typedef struct {
    Logger          base;       // 인터페이스를 첫 멤버로
    LegacyPrinter*  lp;
} LegacyLoggerAdapter;

static void adapter_log(Logger* self, const char* msg) {
    LegacyLoggerAdapter* a = (LegacyLoggerAdapter*)self;
    legacy_print(a->lp, "%s\n", msg);
}

LegacyLoggerAdapter* adapter_create(LegacyPrinter* lp) {
    LegacyLoggerAdapter* a = malloc(sizeof *a);
    a->base.log = adapter_log;
    a->lp = lp;
    return a;
}
```

## 결과 (트레이드오프)

**Object Adapter 장점**
- 단일 어댑터로 어댑티의 모든 서브클래스 처리
- 어댑티의 동작을 추가·재정의 쉬움

**Class Adapter 장점**
- 어댑티의 일부만 override 가능
- 추가 포인터 간접 호출 없음 (성능)

**공통 단점**
- 추가 추상화 계층
- 단순 변환 코드 boilerplate

## 변형

- **Two-way Adapter** — 양 인터페이스 모두 만족 (양방향 호환)
- **Pluggable Adapter** — 어댑티 인터페이스를 매개변수화

## 알려진 사용 사례

- STL의 `std::stack`, `std::queue` (`std::deque`를 어댑트)
- `std::back_inserter` 등 iterator adapter
- C 라이브러리를 C++ 객체로 감싸는 모든 wrapper
- IO library에서 `streambuf` 어댑터

## 관련 패턴

- **[Bridge (item 7)](/blog/programming/gof-design-patterns/item07-bridge)** — Bridge는 사전에 추상-구현 분리, Adapter는 사후에 호환되지 않는 것을 연결
- **[Decorator (item 9)](/blog/programming/gof-design-patterns/item09-decorator)** — 둘 다 wrapping이지만 Decorator는 인터페이스 유지 + 책임 추가, Adapter는 인터페이스 변환
- **[Proxy (item 12)](/blog/programming/gof-design-patterns/item12-proxy)** — 둘 다 wrapping이지만 Proxy는 인터페이스 동일 + 접근 제어
- **[Facade (item 10)](/blog/programming/gof-design-patterns/item10-facade)** — Facade는 새 인터페이스 정의(단순화), Adapter는 기존 인터페이스에 맞춤
