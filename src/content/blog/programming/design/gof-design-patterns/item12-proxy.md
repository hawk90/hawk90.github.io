---
title: "GoF 12: Proxy"
date: 2026-05-01T12:00:00
description: "다른 객체에 대한 대리·접근 제어 — virtual·remote·protection·smart proxy."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 12
draft: false
---

## 한 줄 요약

> **"진짜 객체 앞에 서서 접근을 통제하는 대리인"** — lazy load, 권한 검사, 원격 호출, 캐싱 등.

## 비유 — 비서, 신용카드, 부동산 중개인

*비서*는 사장에게 *직접 연락이 닿기 전*에 가로막습니다. 일정을 확인하고, 우선순위를 정하고, 사장이 *정말 응해야 할 통화*만 전달합니다. *비서와 사장이 같은 "전화 받는 사람"*이라는 인터페이스이지만, 비서가 *접근을 제어*합니다.

*신용카드*는 *현금을 직접 꺼내는 대신* 결제합니다. 가게 입장에선 *결제가 끝났다는 사실*만 같습니다. 카드사가 뒤에서 *진짜 돈의 이동*을 처리합니다.

*부동산 중개인*은 *집주인을 직접 만나지 않고* 거래를 진행합니다. 임차인은 *집과 계약*에 집중하고, 중개인이 *집주인과의 소통*을 대리합니다.

Proxy가 이 *대리* 구조입니다.

- *비서·카드·중개인* = Proxy (Subject 인터페이스 동일)
- *사장·현금·집주인* = RealSubject
- *대리 목적* = 접근 제어, 지연, 캐싱, 원격

클라이언트는 *Proxy인지 RealSubject인지 모릅니다*. *같은 인터페이스*입니다.

## 어떤 문제를 푸는가

진짜 객체에 직접 접근하면 곤란한 경우들:

- **비싼 객체**가 로드되기도 전에 메모리에 다 올라옴
- **원격 객체**를 호출하는 코드가 네트워크 디테일을 알아야 함
- **권한 검증**을 호출자가 매번 직접 함
- **자원 lifetime** 관리를 호출자가 책임

```cpp
// Bad: 모든 호출자가 디테일 알아야
auto img = loadImageFromDisk("big.png");   // ◄── 100MB read, 갤러리 표시도 전에
if (currentUser.canRead(img))              // ◄── 권한 검사 매번 수동
    sendOverNetwork(img.bytes());          // ◄── 직렬화 디테일
```

Proxy는 같은 인터페이스 뒤에서 **추가 동작을 투명하게 끼워넣음**.

```cpp
// Good: proxy가 알아서
auto img = std::make_unique<ImageProxy>("big.png");   // 안 로드
img->display();   // 첫 호출 시에만 로드 + 권한 검사 + (원격이면) 네트워크
```

## Proxy의 4가지 종류

| 종류 | 의도 | 예 |
| --- | --- | --- |
| **Virtual Proxy** | 비싼 객체의 lazy load | 갤러리에서 안 보이는 이미지 안 로드 |
| **Remote Proxy** | 원격 객체의 로컬 대리 | RPC, RMI |
| **Protection Proxy** | 접근 권한 제어 | 사용자 권한 검사 |
| **Smart Proxy** (Smart Reference) | 참조 카운트, 락, 로깅 | `std::shared_ptr` |

## 한눈에 보는 구조

<img src="/images/blog/gof/diagrams/item12-proxy.svg" alt="Proxy 패턴 클래스 다이어그램" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

Proxy는 Subject 구현 + RealSubject 참조 + **추가 동작**(lazy/auth/log/...).

런타임 상호작용은 다음과 같습니다.

<img src="/images/blog/gof/diagrams/item12-proxy-seq.svg" alt="Proxy 시퀀스 — Proxy가 RealSubject 호출 전후 정책 삽입" style="max-width:100%; background:white; padding:8px; border-radius:6px;" />

## 언제 쓰면 좋은가 (종류별)

- 비용 큰 객체의 lazy load → **Virtual Proxy**
- 다른 주소 공간의 객체 접근 → **Remote Proxy**
- 권한 검증 → **Protection Proxy**
- 자원 관리 (참조 카운트, 락) → **Smart Proxy**

## 언제 쓰면 안 되나

> ⚠️ **추가 간접 호출**이 hot path에 있으면 성능 영향.

> ⚠️ **단순 wrapping만이라면 Proxy 아닌 그냥 wrapper.** Proxy는 의도가 분명해야.

> ⚠️ **lifetime 관리가 복잡**해질 수 있음 — proxy와 real이 다른 owner를 가지면 위험.

## 헷갈리는 패턴과의 차이

| 비교 대상 | 무엇이 다른가 |
| --- | --- |
| [Decorator](/blog/programming/design/gof-design-patterns/item09-decorator) | Decorator는 *기능 추가*가 목적. Proxy는 *접근 제어*가 목적. 구조는 동일. |
| [Adapter](/blog/programming/design/gof-design-patterns/item06-adapter) | Adapter는 *인터페이스 변환*. Proxy는 *인터페이스 유지*. |
| [Facade](/blog/programming/design/gof-design-patterns/item10-facade) | Facade는 *복잡한 서브시스템에 새 단순 인터페이스*. Proxy는 *기존 인터페이스 그대로 + 제어*. |
| [Flyweight](/blog/programming/design/gof-design-patterns/item11-flyweight) | Flyweight는 *공유로 메모리 절약*. Proxy는 *접근 통제* (보안, 지연, 원격). |

판별 한 줄: *"같은 인터페이스로 호출되지만 진짜 호출 전에 무언가를 하고 싶다"*면 Proxy.

## C++ 구현 — Virtual Proxy (lazy load)

### 1. Subject 인터페이스

```cpp
class Image {
public:
    virtual ~Image() = default;
    virtual void display() = 0;
};
```

### 2. RealSubject — 비쌈

```cpp
class RealImage : public Image {
    std::string filename;
    std::vector<char> pixels;
public:
    explicit RealImage(std::string f) : filename(std::move(f)) {
        loadFromDisk();    // 비쌈 (수 MB 파일)
    }
    void display() override { /* 픽셀 출력 */ }
private:
    void loadFromDisk() { /* I/O */ }
};
```

### 3. Proxy — 첫 호출 시에만 로드

```cpp
class ImageProxy : public Image {
    std::string filename;
    mutable std::unique_ptr<RealImage> real;
public:
    explicit ImageProxy(std::string f) : filename(std::move(f)) {}

    void display() override {
        if (!real) real = std::make_unique<RealImage>(filename);   // ◄── lazy
        real->display();
    }
};
```

### 4. 사용 — 안 보이는 건 안 로드

```cpp
std::vector<std::unique_ptr<Image>> gallery;
for (auto& f : files)
    gallery.push_back(std::make_unique<ImageProxy>(f));   // 모두 proxy

gallery[0]->display();    // 0번만 진짜 로드
                          // 나머지는 메모리에 안 올림
```

## C++ 구현 — Protection Proxy

```cpp
class File {
public:
    virtual ~File() = default;
    virtual std::string read() = 0;
    virtual void write(const std::string& data) = 0;
};

class RealFile : public File { /* ... */ };

class ProtectedFile : public File {
    std::unique_ptr<File> real;
    User                  user;
public:
    ProtectedFile(std::unique_ptr<File> f, User u)
        : real(std::move(f)), user(std::move(u)) {}

    std::string read() override {
        if (!user.canRead()) throw AccessDenied();
        return real->read();
    }

    void write(const std::string& data) override {
        if (!user.canWrite()) throw AccessDenied();
        real->write(data);
    }
};
```

## C++ 표준의 Smart Proxy

`std::shared_ptr`, `std::unique_ptr`도 일종의 smart proxy — 자동 해제, 참조 카운트, `operator->`/`operator*`로 진짜 객체처럼 보임.

## 자주 보는 안티패턴

### 1. Lazy proxy의 race condition

```cpp
// Bad: thread-unsafe lazy init
void display() override {
    if (!real) real = std::make_unique<RealImage>(filename);   // ◄── race
    real->display();
}
```

**문제**: 두 스레드가 동시에 첫 호출 → 둘 다 로드, 또는 partial init.

**해결**: `std::call_once`, `std::atomic<RealImage*>` + 락, 또는 `std::shared_ptr` + double-check.

```cpp
std::once_flag flag;
void display() override {
    std::call_once(flag, [this] { real = std::make_unique<RealImage>(filename); });
    real->display();
}
```

### 2. Proxy가 RealSubject의 lifetime을 깸

```cpp
// Bad
class Proxy : public Subject {
    Subject* real;   // ◄── 누가 소유?
};
```

**문제**: 두 곳에서 real을 알면 누가 delete? double free 또는 leak.

**해결**: `unique_ptr` 단일 소유 또는 `shared_ptr` 공유. raw pointer 금지.

### 3. Protection proxy 우회 (real 직접 노출)

```cpp
// Bad
class ProtectedFile : public File {
    std::unique_ptr<RealFile> real;
public:
    RealFile* getReal() { return real.get(); }   // ◄── 우회 가능
};
```

**문제**: proxy의 권한 검증이 의미 없음 — 호출자가 real을 직접 들고 호출.

**해결**: real을 절대 노출하지 말 것. proxy로만 접근.

### 4. Remote proxy가 네트워크 실패를 silent하게

```cpp
// Bad
class RemoteProxy : public Service {
public:
    Result call() override {
        try { return rpc(); }
        catch (...) { return Result{}; }   // ◄── 빈 결과로 무시
    }
};
```

**문제**: 호출자는 성공으로 보고 잘못된 결과 사용.

**해결**: 명시적 오류 전파 (예외 또는 `std::expected`). 클라이언트가 결정하게.

### 5. Proxy가 RealSubject보다 큰 책임 (god proxy)

```cpp
// Bad: proxy가 캐시 + 락 + 로깅 + 권한 + lazy + 재시도 + ...
class MegaProxy : public Subject {
    Cache cache; Mutex mu; Logger log; AuthChecker auth; /* ... */
};
```

**문제**: 한 proxy가 5개 책임 → SRP 위반. 변경 사유 5개.

**해결**: 각 책임을 별도 proxy로 chain. CachingProxy → LoggingProxy → AuthProxy → RealSubject (사실상 Decorator).

### 6. Proxy chain이 너무 깊어 디버깅 불가

```cpp
auto s = std::make_unique<RealSubject>();
s = std::make_unique<CachingProxy>(std::move(s));
s = std::make_unique<LoggingProxy>(std::move(s));
s = std::make_unique<RetryProxy>(std::move(s));
s = std::make_unique<AuthProxy>(std::move(s));
// 8단 깊이 — 디버거에서 스택 추적 끔찍
```

**문제**: 스택 깊이 증가로 디버깅·프로파일링 어려움.

**해결**: 진짜 필요한 proxy만. 3~4단 이상은 미들웨어 프레임워크로 일원화.

## Modern C++ 변형

### 1. `std::function` proxy 합성

```cpp
using ImageDisplay = std::function<void()>;

ImageDisplay lazy(std::string path) {
    auto loaded = std::make_shared<std::optional<RealImage>>();
    return [=]() mutable {
        if (!*loaded) *loaded = RealImage(path);
        (*loaded)->display();
    };
}

ImageDisplay logged(ImageDisplay inner) {
    return [=] { std::cout << "displaying\n"; inner(); };
}

auto d = logged(lazy("photo.png"));
d();   // log + lazy load + display
```

상속 없이 람다로 proxy chain.

### 2. Concept-based static proxy

```cpp
template <typename T>
concept Displayable = requires(T t) { t.display(); };

template <Displayable T>
class LazyProxy {
    std::optional<T> real;
    std::function<T()> creator;
public:
    LazyProxy(auto c) : creator(c) {}
    void display() {
        if (!real) real = creator();
        real->display();
    }
};
```

가상 호출 없이 lazy.

### 3. Smart pointer with custom deleter (smart proxy)

```cpp
auto fd = std::unique_ptr<FILE, decltype(&fclose)>(
    fopen("file.txt", "r"), &fclose);
// 자동 close — RAII proxy
```

자원 핸들을 객체처럼 다루는 smart proxy.

### 4. `std::async` + `std::future` (async proxy)

```cpp
class AsyncImageProxy : public Image {
    std::future<RealImage> loading;
public:
    AsyncImageProxy(std::string path)
        : loading(std::async(std::launch::async, [path] { return RealImage(path); })) {}
    void display() override {
        auto img = loading.get();   // 첫 호출 시 wait
        img.display();
    }
};
```

백그라운드 로드 → 표시 시점에 wait.

### 5. Reflection-based proxy (interceptor)

```cpp
// Java-style invocation handler. C++26 reflection으로 가능 예정.
template <typename Iface>
class LoggingProxy {
    template <auto method, typename... Args>
    auto invoke(Args... args) {
        std::cout << "calling " << method.name() << '\n';
        return std::invoke(method, real, args...);
    }
};
```

Java Dynamic Proxy, C# Castle DynamicProxy, ATL/COM의 핵심.

### 6. `std::expected` + retry proxy (C++23)

```cpp
class RetryProxy : public Service {
    std::unique_ptr<Service> inner;
    int maxRetries;
public:
    std::expected<Result, Error> call(Request r) override {
        for (int i = 0; i < maxRetries; ++i) {
            auto res = inner->call(r);
            if (res) return res;
            if (!isRetryable(res.error())) return res;
        }
        return std::unexpected(Error::tooManyRetries);
    }
};
```

명시적 오류 전파 + 재시도.

## C 구현

```c
typedef struct Image {
    void (*display)(struct Image*);
} Image;

typedef struct {
    Image       base;
    char        filename[256];
    RealImage*  real;    // lazy
} ImageProxy;

void proxy_display(Image* self) {
    ImageProxy* p = (ImageProxy*)self;
    if (!p->real) p->real = real_image_load(p->filename);
    real_image_display(p->real);
}
```

## 성능 — proxy 종류별 오버헤드

100만 호출 기준.

| 방식 | 오버헤드 | 비고 |
| --- | --- | --- |
| 직접 호출 | 0 | baseline |
| Virtual proxy (lazy) | 0 + 첫 호출 cost | 두 번째부터 직접과 동일 |
| Protection proxy | +5% | bool 검사 |
| Smart proxy (`shared_ptr`) | +10% | atomic refcount |
| Remote proxy | +1000x | 네트워크 RTT |
| Logging proxy | +50% | 매 호출 I/O |

Remote 외에는 무시할 만한 오버헤드. 단 hot path의 chain은 누적 주의.

## 트레이드오프 — 한눈에

| 차원 | Proxy |
| --- | --- |
| 추가 동작 투명 삽입 | ✅ 클라이언트는 모름 |
| lazy load·접근 제어·로깅 | ✅ 횡단 관심사 분리 |
| RealSubject 변경 없음 | ✅ |
| 응답성 | ⚠️ proxy 통과 비용 |
| 코드 복잡도 | ⚠️ 3개 클래스 (Subject·Real·Proxy) |
| Lifetime 관리 | ⚠️ proxy/real 소유권 명확해야 |

## Proxy vs Decorator vs Adapter — 비교 (다시)

같은 wrapping 구조, 다른 의도. (item 9에도 비슷한 표 있음)

| | Proxy | Decorator | Adapter |
| --- | --- | --- | --- |
| 의도 | 접근 제어 | 책임 추가 | 인터페이스 변환 |
| 구조 | wrapping | wrapping | wrapping |
| 인터페이스 | 동일 | 동일 | 변환 |

## 실제 사례

- **ORM의 lazy loading** — Hibernate, Entity Framework, SQLAlchemy
- **Java RMI / CORBA stub** — 원격 객체 proxy
- **`std::shared_ptr`, `std::unique_ptr`** — smart proxy
- **모든 프록시 서버** — 네트워크 (squid, nginx reverse proxy), web
- **mock 객체** — 테스트, Mockito, Google Mock
- **gRPC stub** — 자동 생성된 remote proxy
- **D-Bus / COM/CORBA proxy** — IPC
- **JavaScript `Proxy`** — meta-programming
- **AOP** (Spring AOP, AspectJ) — proxy로 횡단 관심사 주입
- **GPU driver의 deferred command** — 즉시 실행 대신 record

## 관련 패턴

- **[Adapter (item 6)](/blog/programming/design/gof-design-patterns/item06-adapter)** — Adapter는 인터페이스 변환, Proxy는 인터페이스 동일 + 접근 제어
- **[Decorator (item 9)](/blog/programming/design/gof-design-patterns/item09-decorator)** — 구조 동일, 의도 다름. Proxy는 접근 제어, Decorator는 책임 추가
- **[Facade (item 10)](/blog/programming/design/gof-design-patterns/item10-facade)** — Facade는 서브시스템 단순화, Proxy는 단일 객체 대리
- **[Singleton (item 5)](/blog/programming/design/gof-design-patterns/item05-singleton)** — Remote proxy의 대표 객체는 종종 Singleton
- **[Pattern Relationships (item 24)](/blog/programming/design/gof-design-patterns/item24-pattern-relationships-overview)** — wrapping 패턴 군집의 한 축
