---
title: "GoF 6: Adapter"
date: 2026-02-02T10:00:00
description: "호환되지 않는 인터페이스를 클라이언트가 기대하는 형태로 변환."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 6
---

## 한 줄 요약

> **"플러그 모양이 안 맞을 때 끼우는 어댑터"** — 기존 라이브러리를 우리 인터페이스에 맞춰 wrapping.

## 어떤 문제를 푸는가

기존 라이브러리(혹은 legacy 코드)를 그대로 쓰고 싶은데 **인터페이스가 안 맞습니다**. 라이브러리를 수정할 순 없고, 클라이언트 쪽도 표준 인터페이스(`Logger` 같은)에 맞춰져 있습니다.

→ 사이에 **어댑터**를 끼워 변환.

```
[클라이언트] → [Logger 인터페이스] → [LegacyAdapter] → [LegacyPrinter]
                                            (변환)
```

## 한눈에 보는 구조 (Object Adapter — 권장)

<img src="/images/blog/gof/diagrams/item06-adapter.svg" alt="Adapter 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

Adapter가 Target을 구현하면서 내부적으로 Adaptee에게 위임.

## 두 형태

| 형태 | 방식 | 장단점 |
| --- | --- | --- |
| **Object Adapter** | composition (멤버) | 권장. 어댑티의 모든 서브클래스 처리 가능 |
| **Class Adapter** | 다중 상속 | 어댑티의 일부 메서드 override 가능, 하지만 결합도 ↑ |

C++에선 거의 항상 Object Adapter.

## 언제 쓰면 좋은가

- 기존 클래스를 사용하고 싶은데 인터페이스가 우리 요구와 안 맞을 때
- 재사용 가능한 클래스를 만들고 싶은데, 협력해야 할 클래스의 인터페이스가 미리 알려지지 않았을 때
- C 라이브러리를 C++ 객체로 wrapping할 때

## 언제 쓰면 안 되나

> ⚠️ **새 라이브러리를 처음부터 설계**한다면 Adapter 대신 [Bridge](/blog/programming/gof-design-patterns/item07-bridge)로 사전 분리.

> ⚠️ **변환 비용이 큰 경우** — 매 호출마다 변환이 들어가면 성능 손해.

## C++ 구현 — Object Adapter

### 1. 클라이언트가 기대하는 인터페이스

```cpp
class Logger {
public:
    virtual ~Logger() = default;
    virtual void log(const std::string& msg) = 0;
};
```

### 2. 기존 라이브러리 (수정 불가)

```cpp
class LegacyPrinter {
public:
    void print(const char* fmt, ...) { /* C-style printf */ }
};
```

### 3. 어댑터 — 둘 사이를 잇는다

```cpp
class LegacyLoggerAdapter : public Logger {
    LegacyPrinter& printer;
public:
    explicit LegacyLoggerAdapter(LegacyPrinter& p) : printer(p) {}

    void log(const std::string& msg) override {
        printer.print("%s\n", msg.c_str());
    }
};
```

### 4. 클라이언트는 변환을 모름

```cpp
void doWork(Logger& l) { l.log("hello"); }

LegacyPrinter lp;
LegacyLoggerAdapter adapter(lp);
doWork(adapter);   // Logger처럼 보이지만 실제론 LegacyPrinter
```

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

## 트레이드오프 — 한눈에

| 차원 | Adapter |
| --- | --- |
| 기존 코드 재사용 | ✅ 그대로 활용 |
| 호환되지 않는 인터페이스 통합 | ✅ |
| 추가 추상화 계층 | ⚠️ 한 단계 더 |
| 변환 비용 | ⚠️ 호출당 작은 비용 |
| 두 인터페이스가 매우 다르면 | ❌ 어댑터가 비대 |

## 실제 사례

- **STL의 컨테이너 어댑터** — `std::stack`, `std::queue`(`std::deque`를 어댑트)
- **iterator 어댑터** — `std::back_inserter`, `reverse_iterator`
- **C 라이브러리 wrapping** — C++ 객체로 감싸는 모든 wrapper
- **IO 라이브러리** — `streambuf` 어댑터

## 관련 패턴

- **[Bridge (item 7)](/blog/programming/gof-design-patterns/item07-bridge)** — Bridge는 사전에 추상-구현 분리, Adapter는 사후에 호환되지 않는 것을 연결
- **[Decorator (item 9)](/blog/programming/gof-design-patterns/item09-decorator)** — 둘 다 wrapping이지만 Decorator는 인터페이스 유지 + 책임 추가, Adapter는 인터페이스 변환
- **[Proxy (item 12)](/blog/programming/gof-design-patterns/item12-proxy)** — 둘 다 wrapping이지만 Proxy는 인터페이스 동일 + 접근 제어
- **[Facade (item 10)](/blog/programming/gof-design-patterns/item10-facade)** — Facade는 새 인터페이스 정의(단순화), Adapter는 기존 인터페이스에 맞춤
