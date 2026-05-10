---
title: "GoF 12: Proxy"
date: 2026-02-02T16:00:00
description: "다른 객체에 대한 대리·접근 제어 — virtual·remote·protection·smart proxy."
tags: [Design Pattern, GoF, C++, C, Structural]
series: "GoF Design Patterns"
seriesOrder: 12
---

## 한 줄 요약

> **"진짜 객체 앞에 서서 접근을 통제하는 대리인"** — lazy load, 권한 검사, 원격 호출, 캐싱 등.

## Proxy의 4가지 종류

| 종류 | 의도 | 예 |
| --- | --- | --- |
| **Virtual Proxy** | 비싼 객체의 lazy load | 갤러리에서 안 보이는 이미지 안 로드 |
| **Remote Proxy** | 원격 객체의 로컬 대리 | RPC, RMI |
| **Protection Proxy** | 접근 권한 제어 | 사용자 권한 검사 |
| **Smart Proxy** (Smart Reference) | 참조 카운트, 락, 로깅 | `std::shared_ptr` |

## 한눈에 보는 구조

```
   Client ──► Subject (interface)
                  △
                  │
            ┌─────┴─────┐
        RealSubject  Proxy ◇──► RealSubject
        ─ request()   ─ request()
```

Proxy는 Subject 구현 + RealSubject 참조 + **추가 동작**(lazy/auth/log/...).

## 언제 쓰면 좋은가 (종류별)

- 비용 큰 객체의 lazy load → **Virtual Proxy**
- 다른 주소 공간의 객체 접근 → **Remote Proxy**
- 권한 검증 → **Protection Proxy**
- 자원 관리 (참조 카운트, 락) → **Smart Proxy**

## 언제 쓰면 안 되나

> ⚠️ **추가 간접 호출**이 hot path에 있으면 성능 영향.

> ⚠️ **단순 wrapping만이라면 Proxy 아닌 그냥 wrapper.** Proxy는 의도가 분명해야.

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

## 트레이드오프 — 한눈에

| 차원 | Proxy |
| --- | --- |
| 추가 동작 투명 삽입 | ✅ 클라이언트는 모름 |
| lazy load·접근 제어·로깅 | ✅ 횡단 관심사 분리 |
| RealSubject 변경 없음 | ✅ |
| 응답성 | ⚠️ proxy 통과 비용 |
| 코드 복잡도 | ⚠️ 3개 클래스 (Subject·Real·Proxy) |

## Proxy vs Decorator vs Adapter — 비교 (다시)

같은 wrapping 구조, 다른 의도. (item 9에도 비슷한 표 있음)

| | Proxy | Decorator | Adapter |
| --- | --- | --- | --- |
| 의도 | 접근 제어 | 책임 추가 | 인터페이스 변환 |
| 구조 | wrapping | wrapping | wrapping |
| 인터페이스 | 동일 | 동일 | 변환 |

## 실제 사례

- **ORM의 lazy loading** (Hibernate, EF, SQLAlchemy)
- **Java RMI / CORBA stub**
- **`std::shared_ptr`, `std::unique_ptr`** (smart proxy)
- **모든 프록시 서버** (네트워크, web)
- **mock 객체** (테스트 — Mockito 등)

## 관련 패턴

- **[Adapter (item 6)](/blog/programming/gof-design-patterns/item06-adapter)** — Adapter는 인터페이스 변환, Proxy는 인터페이스 동일 + 접근 제어
- **[Decorator (item 9)](/blog/programming/gof-design-patterns/item09-decorator)** — 구조 동일, 의도 다름. Proxy는 접근 제어, Decorator는 책임 추가
- **[Facade (item 10)](/blog/programming/gof-design-patterns/item10-facade)** — Facade는 서브시스템 단순화, Proxy는 단일 객체 대리
- **[Singleton (item 5)](/blog/programming/gof-design-patterns/item05-singleton)** — Remote proxy의 대표 객체는 종종 Singleton
