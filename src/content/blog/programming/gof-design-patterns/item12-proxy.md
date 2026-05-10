---
title: "GoF 12: Proxy"
date: 2026-02-02T16:00:00
description: "다른 객체에 대한 대리/접근 제어 — virtual, remote, protection, smart proxy."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 12
draft: true
---

## 의도

다른 객체에 대한 **대리자** 또는 **자리지킴이**를 제공해 그 객체에 대한 접근을 제어합니다.

## 종류 (의도별)

- **Virtual Proxy** — 비싼 객체의 지연 생성·로드
- **Remote Proxy** — 원격 객체의 로컬 대리 (RPC, RMI)
- **Protection Proxy** — 접근 권한 제어
- **Smart Reference (Smart Proxy)** — 참조 카운트, 락, 로깅, 캐싱
- **Synchronization Proxy** — 멀티스레드 안전 wrapper

## 적용 가능성

각 종류별로 다름:

- 비용 큰 객체의 lazy load → Virtual
- 다른 주소 공간의 객체 접근 → Remote
- 권한 검증 → Protection
- 자원 관리 (참조 카운트, 락) → Smart Reference

## 구조

```
   Client ──► Subject (interface)
                  △
                  │
            ┌─────┴─────┐
        RealSubject  Proxy ◇──► RealSubject
        + request()   + request()
```

## 참여자

- **Subject** — RealSubject와 Proxy의 공통 인터페이스
- **RealSubject** — 진짜 객체
- **Proxy** — Subject 인터페이스 구현, RealSubject 참조 보유, 접근 제어

## C++ 구현 — Virtual Proxy

```cpp
class Image {
public:
    virtual ~Image() = default;
    virtual void display() = 0;
};

class RealImage : public Image {
    std::string filename;
    std::vector<char> pixels;
public:
    explicit RealImage(std::string f) : filename(std::move(f)) {
        loadFromDisk();    // 비쌈
    }
    void display() override { /* 픽셀 출력 */ }
private:
    void loadFromDisk() { /* I/O */ }
};

class ImageProxy : public Image {
    std::string filename;
    mutable std::unique_ptr<RealImage> real;
public:
    explicit ImageProxy(std::string f) : filename(std::move(f)) {}

    void display() override {
        if (!real) real = std::make_unique<RealImage>(filename);   // 첫 호출 시 로드
        real->display();
    }
};

// 사용 — 화면에 안 보이는 이미지는 메모리에도 안 올림
std::vector<std::unique_ptr<Image>> gallery;
for (auto& f : files) gallery.push_back(std::make_unique<ImageProxy>(f));

gallery[0]->display();    // 0번만 로드 (다른 건 안 로드)
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

## C++ 구현 — Smart Pointer (built-in proxy)

`std::shared_ptr`, `std::unique_ptr` 모두 일종의 smart proxy — 대상 객체를 감싸 자동 해제·참조 카운트 제공. `operator->`, `operator*`로 진짜 객체처럼 보임.

```cpp
class CountingPtr {
    Widget* p;
    int*    count;
public:
    explicit CountingPtr(Widget* w) : p(w), count(new int(1)) {}
    Widget* operator->() { ++(*count); return p; }    // 호출 횟수 추적
    // ...
};
```

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

## 결과 (트레이드오프)

**장점**
- 추가 동작을 클라이언트에 투명하게 삽입
- lazy load·접근 제어·로깅 등 횡단 관심사 분리
- RealSubject 변경 없이 동작 추가

**단점**
- 응답성 ↓ (proxy 통과)
- 코드 복잡 (Subject·Real·Proxy 세 클래스)
- Remote proxy는 네트워크 latency 등 추가 고려

## 변형

- **Copy-on-write proxy** — 쓰기 시점에만 복사
- **Cache proxy** — 결과 캐싱 (memoization)
- **Logging proxy** — 모든 호출 기록 (디버깅)

## 알려진 사용 사례

- ORM의 lazy loading (Hibernate, EF)
- Java RMI / CORBA stub
- `std::shared_ptr`, `std::unique_ptr` (smart proxy)
- 모든 프록시 서버 (네트워크, web)
- mock 객체 (테스트)

## 관련 패턴

- **[Adapter (item 6)](/blog/programming/gof-design-patterns/item06-adapter)** — Adapter는 인터페이스 변환, Proxy는 인터페이스 동일 + 접근 제어
- **[Decorator (item 9)](/blog/programming/gof-design-patterns/item09-decorator)** — 구조 동일, 의도 다름. Proxy는 접근 제어, Decorator는 책임 추가
- **[Facade (item 10)](/blog/programming/gof-design-patterns/item10-facade)** — Facade는 서브시스템 단순화, Proxy는 단일 객체 대리
- **[Singleton (item 5)](/blog/programming/gof-design-patterns/item05-singleton)** — Remote proxy의 대표 객체는 종종 Singleton
