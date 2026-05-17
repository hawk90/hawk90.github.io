---
title: "GoF 6: Adapter"
date: 2026-02-01T06:00:00
description: "호환되지 않는 인터페이스를 클라이언트가 기대하는 형태로 변환."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 6
draft: true
---

## 한 줄 요약

> **"플러그 모양이 안 맞을 때 끼우는 어댑터"** — 기존 라이브러리를 우리 인터페이스에 맞춰 wrapping.

## 어떤 문제를 푸는가

기존 라이브러리(또는 legacy 코드)를 그대로 쓰고 싶은데 **인터페이스가 안 맞습니다**. 라이브러리를 수정할 순 없고, 클라이언트 쪽도 *표준 인터페이스(`Logger` 같은)*에 맞춰져 있습니다.

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
| **Object Adapter** | composition (멤버) | 권장. Adaptee의 *모든 서브클래스*에도 동작. |
| **Class Adapter** | 다중 상속 | Adaptee의 일부 메서드 override 가능. 하지만 결합도↑, 다중 상속 비용. |

C++에선 거의 항상 Object Adapter.

## 언제 쓰면 좋은가

- 기존 클래스를 사용하고 싶은데 *인터페이스가 우리 요구와 안 맞을 때*
- 재사용 가능한 클래스를 만들고 싶은데, 협력해야 할 *클래스의 인터페이스가 미리 알려지지 않았을 때*
- *C 라이브러리*를 C++ 객체로 wrapping할 때
- *Third-party SDK*를 도메인 모델에 맞춰 변환할 때
- *Test double* — 테스트용 fake가 production 인터페이스를 흉내낼 때

## 언제 쓰면 안 되나

> ⚠️ **새 라이브러리를 처음부터 설계**한다면 Adapter 대신 [Bridge](/blog/programming/design/gof-design-patterns/item07-bridge)로 *사전 분리*.

> ⚠️ **변환 비용이 큰 경우** — 매 호출마다 변환이 들어가면 hot path에서 성능 손해.

> ⚠️ **두 인터페이스의 의미가 너무 다른 경우** — 어댑터가 *완전한 재구현*에 가까워지면 의미가 약하다. 차라리 *facade* 또는 *별도 모듈*.

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

C에는 클래스가 없으므로 *struct + 함수 포인터*로 인터페이스 흉내.

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

*첫 멤버를 인터페이스로* 두면 `(Logger*)adapter`가 안전 — POSIX socket, Linux device 드라이버 등이 같은 기법.

## 변환의 5 패턴

Adapter 안에서 실제로 *무엇을 변환*하는지에 따라:

| 변환 유형 | 예 |
| --- | --- |
| **이름 변환** | `log(msg)` → `print(fmt, msg)` |
| **타입 변환** | `std::string` → `const char*`, `int` → enum |
| **인자 순서 변환** | `f(a, b)` → `g(b, a)` |
| **다중 호출 묶기** | `setSize(w, h)` → `setWidth(w); setHeight(h);` |
| **상태 누적** | 단발 호출을 받아 batch로 묶음 (e.g., transaction) |

→ 변환이 *4번 이상 누적*되면 Adapter가 *과도하게 비대*. 모듈을 나누거나 [Facade](/blog/programming/design/gof-design-patterns/item10-facade) 고려.

## 흔한 함정 — Anti-patterns

### 1. Adapter 안에 *비즈니스 로직* 들어감

```cpp
// 회피 — 단순 변환이 아니라 정책 결정까지
void log(const std::string& msg) override {
    if (msg.contains("ERROR")) {
        printer.print("[%s] %s\n", getCurrentTime(), msg.c_str());
        sendEmail("admin@...", msg);                  // ❌ 로직이 Adapter에
        incrementErrorCounter();                       // ❌
    } else {
        printer.print("%s\n", msg.c_str());
    }
}
```

→ Adapter는 *순수 변환*에 집중. 로직은 *별도 클래스*에.

### 2. Adapter 체인이 깊어짐

```cpp
ClientA → AdapterAB → ServiceB → AdapterBC → ServiceC → AdapterCD → ServiceD
```

→ 시스템 설계의 *문제 신호*. 인터페이스 통합을 한 단계에서 끝내거나, 중간 계층 통합 검토.

### 3. *깊은 wrapping*으로 디버깅 어려움

여러 Adapter를 거치면 *stack trace가 의미 흐릿*. *로깅 + 명시적 이름*으로 완화.

### 4. *생애주기 관리* 부주의

```cpp
// 회피
LegacyLoggerAdapter make_adapter() {
    LegacyPrinter lp;                  // 지역 변수
    return LegacyLoggerAdapter(lp);    // ❌ dangling reference
}
```

→ Adapter는 보통 Adaptee를 *참조 또는 raw pointer*로 보유. 생애주기는 *외부*가 책임. 명확하지 않으면 `std::shared_ptr` 또는 *owning Adapter*.

## Modern C++ 변형 — 가벼운 Adapter

### 1. `std::function` + 람다로 *클래스 없이*

기존 인터페이스가 *단일 콜백 형태*면 람다로 끝.

```cpp
using LogFn = std::function<void(const std::string&)>;

LegacyPrinter lp;
LogFn log = [&lp](const std::string& msg) {
    lp.print("%s\n", msg.c_str());
};

doWork(log);   // doWork가 LogFn을 받도록 변경
```

→ Adapter 클래스 *없이* 같은 효과. 단 *다중 메서드* 인터페이스에는 부적합.

### 2. CRTP로 *컴파일 타임 어댑터*

런타임 dispatch 없이 인터페이스 흉내.

```cpp
template <typename Derived>
class LoggerInterface {
public:
    void log(const std::string& msg) {
        static_cast<Derived*>(this)->log_impl(msg);
    }
};

class LegacyLoggerAdapter : public LoggerInterface<LegacyLoggerAdapter> {
    LegacyPrinter& printer;
public:
    explicit LegacyLoggerAdapter(LegacyPrinter& p) : printer(p) {}
    void log_impl(const std::string& msg) {
        printer.print("%s\n", msg.c_str());
    }
};
```

→ virtual call 비용 없음. 단 *템플릿 instantiation*으로 인터페이스 통일이 약해짐.

### 3. C++20 Concepts로 *duck typing 어댑터*

```cpp
template <typename T>
concept Loggable = requires(T& t, const std::string& s) {
    t.log(s);
};

void doWork(Loggable auto& l) { l.log("hello"); }

// 어댑터 없이 print → log 변환만 하는 thin wrapper
struct LegacyAsLogger {
    LegacyPrinter& p;
    void log(const std::string& msg) { p.print("%s\n", msg.c_str()); }
};

LegacyPrinter lp;
LegacyAsLogger lal{lp};
doWork(lal);    // Concept이 충족됨 — 상속 없음
```

→ 최소 구현. 인터페이스가 *작고 안정적*일 때.

## 성능 — 변환의 비용

| 변환 종류 | 비용 (대략) |
| --- | --- |
| inline 호출 (CRTP / concept) | 0 (컴파일러가 흡수) |
| virtual call 1단 | 수 ns (vtable lookup + 간접 jump) |
| `std::function` 호출 | 수십 ns (type erasure + heap 할당 가능) |
| 인자 변환 (`std::string` 생성) | 수십 ns ~ μs (heap allocation 시) |

→ Hot path면 *inline form* (CRTP/concept), 일반 코드면 *virtual* OK, *type erasure*는 신중.

## 트레이드오프 — 한눈에

| 차원 | Adapter |
| --- | --- |
| 기존 코드 재사용 | ✅ 그대로 활용 |
| 호환되지 않는 인터페이스 통합 | ✅ |
| 추가 추상화 계층 | ⚠️ 한 단계 더 |
| 변환 비용 | ⚠️ 호출당 작은 비용 |
| 두 인터페이스가 매우 다르면 | ❌ 어댑터가 비대 |
| 디버깅 가독성 | ⚠️ 체인이 깊어지면 약화 |
| 생애주기 관리 | ⚠️ 명시적으로 처리 필요 |

## 실제 사례

### 표준 라이브러리

- **STL 컨테이너 어댑터** — `std::stack`, `std::queue`, `std::priority_queue` (`std::deque`나 `std::vector`를 어댑트)
- **Iterator 어댑터** — `std::back_inserter`, `std::reverse_iterator`, `std::move_iterator`
- **IO 라이브러리** — `std::stringstream`이 `std::ostream` 인터페이스로 string 조작 제공
- **`std::function`** — 사실상 *호출 가능한 모든 것*을 통일 인터페이스로 어댑트

### 시스템

- **C API → C++ 객체** — `<cstdio>` → `<fstream>`, OpenSSL C API → 객체 wrapper
- **데이터베이스 드라이버** — DB 종속 API → 통일된 `Connection`/`Statement` 인터페이스 (JDBC, ODBC 정신)
- **GUI 프레임워크** — 플랫폼별 native widget → Qt/wxWidgets 통일 인터페이스
- **JNI** — Java ↔ native 사이의 어댑터 계층

### 도메인

- *DTO ↔ 도메인 객체* 변환
- *외부 API 응답* → *내부 모델* 매핑
- *Legacy DB 스키마* → *새 도메인 모델*

## 관련 패턴

- **[Bridge (item 7)](/blog/programming/design/gof-design-patterns/item07-bridge)** — Bridge는 *사전*에 추상-구현 분리, Adapter는 *사후*에 호환되지 않는 것을 연결
- **[Decorator (item 9)](/blog/programming/design/gof-design-patterns/item09-decorator)** — 둘 다 wrapping이지만 Decorator는 *인터페이스 유지 + 책임 추가*, Adapter는 *인터페이스 변환*
- **[Proxy (item 12)](/blog/programming/design/gof-design-patterns/item12-proxy)** — 둘 다 wrapping이지만 Proxy는 *인터페이스 동일 + 접근 제어*
- **[Facade (item 10)](/blog/programming/design/gof-design-patterns/item10-facade)** — Facade는 *새 인터페이스 정의 (단순화)*, Adapter는 *기존 인터페이스에 맞춤*
- **[item 24 — 23 패턴 전체 관계](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — Adapter는 *고립 영역*에 위치 (Bridge, Proxy와 함께)
