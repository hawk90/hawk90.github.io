---
title: "Ch 13: GSL safety types — span, not_null, owner, narrow_cast"
date: 2025-09-15T14:00:00
description: "Microsoft GSL / C++ Core Guidelines의 type wrapper들 — *컴파일러가 잡지 못하는 의미를 type system에 인코딩*. 임베디드 적용 패턴."
tags: [autosar, cpp, gsl, core-guidelines, span, not-null, owner, narrow-cast]
series: "AUTOSAR C++14"
seriesOrder: 13
draft: false
---

C++의 *타입 시스템*은 *값의 의미와 제약*을 표현할 수 있다. 단순 포인터·정수보다 *의미를 가진 wrapper*를 쓰면 *컴파일러와 분석기*가 더 많이 잡아준다. **GSL(Guidelines Support Library)** 과 **C++ Core Guidelines**가 정의하는 패턴들을 본다.

## C++ Core Guidelines란

Bjarne Stroustrup과 Herb Sutter가 주도하는 *현대 C++ 가이드라인*. GitHub에서 공개·진화 중.

```
URL: https://isocpp.github.io/CppCoreGuidelines/
주제: 약 600 가이드라인
주요 카테고리:
  P  Philosophy
  I  Interface
  F  Function
  C  Class
  R  Resource Management
  ES Expression & Statement
  CP Concurrency
  E  Error Handling
  T  Templates
  SF Source Files
  SL Standard Library
  GSL Guidelines Support Library
```

GSL은 *Core Guidelines의 일부를 라이브러리로 구현*. Microsoft가 *gsl-lite, Microsoft.GSL* 등 구현 제공. C++20부터 *일부 GSL 타입은 표준화*(예: `std::span`).

## span — 길이를 동반한 포인터

### 문제

```cpp
// 회피 — 포인터와 길이가 *분리됨*
void Process(int *data, size_t n);

int arr[100];
Process(arr, 100);          // OK
Process(arr, 1000);          // 컴파일 통과, 런타임에 OOB
```

포인터와 길이가 *떨어져* 있어 *불일치*가 일어난다.

### 해법 — `gsl::span` (또는 C++20 `std::span`)

```cpp
#include <gsl/span>

void Process(gsl::span<int> data);     // 길이 내장

int arr[100];
Process(arr);                          // 자동 추론, 길이 100
Process(gsl::span(arr, 50));           // 명시 — 처음 50개만

std::vector<int> v(100);
Process(v);                            // 자동 변환

std::array<int, 100> a;
Process(a);                            // 자동 변환
```

`span`은 *포인터 + 길이* 묶음. C-style 배열, `std::array`, `std::vector` 모두에서 자동 변환.

### 내부 구현 (단순화)

```cpp
template <typename T>
class span {
public:
    constexpr span() noexcept : data_(nullptr), size_(0) {}
    constexpr span(T *ptr, size_t size) noexcept : data_(ptr), size_(size) {}

    template <size_t N>
    constexpr span(T (&arr)[N]) noexcept : data_(arr), size_(N) {}

    template <typename Container>
    constexpr span(Container &c) noexcept : data_(c.data()), size_(c.size()) {}

    constexpr T &operator[](size_t i) const {
        Expects(i < size_);          // GSL precondition check
        return data_[i];
    }

    constexpr T *data() const noexcept { return data_; }
    constexpr size_t size() const noexcept { return size_; }
    constexpr size_t size_bytes() const noexcept { return size_ * sizeof(T); }

    constexpr span subspan(size_t offset, size_t count) const {
        Expects(offset + count <= size_);
        return span(data_ + offset, count);
    }

    constexpr T *begin() const noexcept { return data_; }
    constexpr T *end() const noexcept { return data_ + size_; }

private:
    T *data_;
    size_t size_;
};
```

`Expects()`는 *전제 조건 검사*. GSL의 다른 도구.

### span의 효과

```cpp
void HexDump(gsl::span<const uint8_t> bytes) {
    for (auto b : bytes) {            // range-based for
        printf("%02x ", b);
    }
}

uint8_t buf[64];
HexDump(buf);                          // OK — 64 byte
HexDump(gsl::span(buf, 32));           // OK — 32 byte
HexDump(buf, 128);                     // 컴파일 에러 — 시그니처 불일치
```

*길이 인자 누락이나 불일치*가 *컴파일 시 검출*.

### 임베디드 사용 예 — DMA 버퍼

```cpp
class DmaController {
public:
    void StartTransfer(gsl::span<const uint8_t> source,
                       gsl::span<uint8_t> destination);
};

uint8_t src_buf[256];
uint8_t dst_buf[256];
dma.StartTransfer(src_buf, dst_buf);

// 또는 일부만
dma.StartTransfer(gsl::span(src_buf, 128), gsl::span(dst_buf, 128));
```

DMA 전송에 *길이 인자 누락*이 *컴파일 에러*. 사고 예방.

## not_null — NULL이 아님을 보장

### 문제

```cpp
void Process(Foo *p);

Process(nullptr);              // 컴파일 통과, 런타임 deref → crash
```

포인터가 *NULL 가능*인지 *문서로만* 표현.

### 해법

```cpp
#include <gsl/pointers>

void Process(gsl::not_null<Foo *> p);   // NULL 불허

Process(nullptr);              // 컴파일 에러
Process(some_ptr);             // 런타임 NULL 검사 + 통과 시 OK
```

### 내부 구현

```cpp
template <typename T>
class not_null {
public:
    template <typename U>
    constexpr not_null(U &&u) : ptr_(std::forward<U>(u)) {
        Expects(ptr_ != nullptr);    // 런타임 검사 (debug에서)
    }

    // nullptr 거부
    not_null(std::nullptr_t) = delete;

    constexpr T get() const noexcept { return ptr_; }
    constexpr operator T() const noexcept { return ptr_; }
    constexpr T operator->() const noexcept { return ptr_; }
    constexpr auto &operator*() const noexcept { return *ptr_; }

private:
    T ptr_;
};
```

`Expects()` 검사가 *Debug 빌드*에서만 또는 *모든 빌드*에서 동작 (구성 가능).

### 사용 — 인터페이스 명세

```cpp
class CanDriver {
public:
    // tx_callback은 절대 NULL 아님
    void SetTxCallback(gsl::not_null<TxCallback *> cb);

    // user_data는 NULL 가능
    void SetTxCallback(TxCallback *cb, void *user_data);
};

CanDriver drv;
drv.SetTxCallback(nullptr);                 // 컴파일 에러
drv.SetTxCallback(my_callback);             // OK
```

함수 시그니처 자체가 *전제 조건을 표현*. 사용자는 *문서를 읽지 않아도* 안다.

## owner — 소유권을 표현

### 문제

```cpp
Foo *CreateFoo();
void DeleteFoo(Foo *p);

// 함수 시그니처로는 *누가 free*하는지 모름.
// 다음 코드가 owner인지 borrower인지?
Foo *MakeFoo() { return CreateFoo(); }
void Use(Foo *p);
```

### 해법

```cpp
#include <gsl/pointers>

gsl::owner<Foo *> CreateFoo();      // 호출자가 소유 (free 책임)
void DeleteFoo(gsl::owner<Foo *> p);

gsl::owner<Foo *> MakeFoo() { return CreateFoo(); }     // 소유권 이전
void Use(Foo *p);                                        // 빌림 (free X)
```

`gsl::owner<T>`는 *문서적 표시*. 분석 도구가 *소유권 흐름 추적*에 활용.

### 내부 구현

```cpp
template <typename T>
using owner = T;   // 단순 alias
```

런타임 행동 *없음*. *정적 분석 도구의 hint*.

### 실전 — RAII 마이그레이션

```cpp
// 옛 C-style 코드
gsl::owner<Buffer *> AcquireBuffer();
void ReleaseBuffer(gsl::owner<Buffer *> b);

void Process() {
    gsl::owner<Buffer *> buf = AcquireBuffer();
    DoWork(buf);
    ReleaseBuffer(buf);     // 명시적 해제
}

// 새 RAII 스타일로 변환
std::unique_ptr<Buffer, BufferDeleter> AcquireBuffer();

void Process() {
    auto buf = AcquireBuffer();    // 자동 해제
    DoWork(buf.get());
}
```

GSL `owner`는 *마이그레이션 중간 단계*에 유용.

## narrow_cast / narrow — Narrowing 명시

### 문제

```cpp
int n = 1000;
char c = n;                    // narrowing — 침묵
char c = (char)n;              // narrowing — 명시 (그러나 OK?)
```

C-style cast는 *narrowing을 가렸다*. 사고 시점 추적 어려움.

### 해법

```cpp
#include <gsl/util>

int n = 1000;
char c = gsl::narrow_cast<char>(n);   // 명시 — 검증 없음
char c = gsl::narrow<char>(n);        // 명시 + 런타임 검증

n = 200;
char c = gsl::narrow<char>(n);        // OK
n = 1000;
char c = gsl::narrow<char>(n);        // 런타임 예외 (narrowing 발생)
```

### 내부 구현

```cpp
template <typename T, typename U>
constexpr T narrow_cast(U &&u) noexcept {
    return static_cast<T>(std::forward<U>(u));
}

template <typename T, typename U>
T narrow(U u) {
    T t = narrow_cast<T>(u);
    if (static_cast<U>(t) != u) {
        throw narrowing_error{};
    }
    if constexpr (std::is_signed_v<T> != std::is_signed_v<U>) {
        if ((t < T{}) != (u < U{})) {
            throw narrowing_error{};
        }
    }
    return t;
}
```

`narrow`는 *값 손실 시 예외*. `narrow_cast`는 *손실 허용 + 명시만*.

## Expects / Ensures — Contract

### 메커니즘

함수의 *전제 조건*과 *사후 조건*을 명시.

```cpp
#include <gsl/assert>

int Divide(int a, int b) {
    Expects(b != 0);            // 전제: b는 0이 아님
    int result = a / b;
    Ensures(result * b == a);   // 사후: 결과 검증
    return result;
}
```

### 내부 구현

```cpp
#define Expects(cond) \
    (cond ? (void)0 : terminate_with_message("precondition failed: " #cond))

#define Ensures(cond) \
    (cond ? (void)0 : terminate_with_message("postcondition failed: " #cond))
```

C++20 *Contracts proposal*이 표준화 진행 중 (P2900). C++26 가능성.

### 사용 — 인터페이스 명세

```cpp
class StackBuffer {
public:
    void Push(int v) {
        Expects(top_ < CAPACITY);       // 가득 차지 않음
        data_[top_++] = v;
        Ensures(top_ > 0);              // 빈 상태 아님
    }

    int Pop() {
        Expects(top_ > 0);              // 비지 않음
        int v = data_[--top_];
        Ensures(top_ < CAPACITY);
        return v;
    }

private:
    int data_[CAPACITY];
    size_t top_ = 0;
};
```

전제·사후 조건이 *코드와 문서에 동시 표현*. 위반 시 *즉시 검출*.

## finally — Scope guard

11장에서 본 ScopeExit 패턴의 표준화.

```cpp
#include <gsl/util>

void Foo() {
    OpenResource();
    auto cleanup = gsl::finally([] { CloseResource(); });

    /* 작업 — 예외/return 시에도 cleanup 실행 */
}
```

C++23의 `std::experimental::scope_exit`이 후계.

## string_span — 안전한 문자열

```cpp
#include <gsl/string_span>

void Print(gsl::string_span s);     // 길이 포함 문자열

const char *cstr = "hello";
std::string str = "world";
Print(cstr);     // OK
Print(str);      // OK
Print(gsl::ensure_z(cstr));     // null 종결 검증 후
```

C-string의 *null 종결 함정*을 *type으로 차단*.

## index_t / dim_t — 의미 있는 정수 타입

```cpp
// 회피 — int / size_t / unsigned int 혼용
void Resize(int width, int height);
Resize(-100, 50);     // 음수 width? 컴파일 통과.

// Good — strongly-typed
using Width = strong_type<int, struct width_tag>;
using Height = strong_type<int, struct height_tag>;

void Resize(Width w, Height h);

Resize(100, 50);               // 컴파일 에러 — int를 Width로 변환 X
Resize(Width{100}, Height{50}); // OK
Resize(Height{100}, Width{50}); // 컴파일 에러 — 타입 다름
```

GSL은 *공식 strong type* 제공 안 하지만, *Boost.StrongTypedef* 또는 *NamedType library*가 표준.

## C++20 표준화 — `<span>`

GSL `span`이 C++20에서 *표준화*. 같은 인터페이스, *컴파일러 내장*.

```cpp
#include <span>

void Process(std::span<int> data);

int arr[100];
Process(arr);    // OK
```

C++14 프로젝트는 *gsl::span 사용*. 마이그레이션 시 *typedef*로 전환.

```cpp
#if __cplusplus >= 202002L
    #include <span>
    template <typename T> using span = std::span<T>;
#else
    #include <gsl/span>
    template <typename T> using span = gsl::span<T>;
#endif
```

## AUTOSAR C++14 정책 — GSL 사용

AUTOSAR는 *GSL을 명시 추천*하지 않지만 *허용 가능 영역*. 일부 정책:

| GSL 도구 | AUTOSAR 정책 |
|---------|-------------|
| `gsl::span` | 권장 — *명시적 길이가 컴파일러에 보임* |
| `gsl::not_null` | 권장 — A8-2-1 (시그니처 의도) 충족 |
| `gsl::owner` | 권장 — *RAII로 마이그레이션 중간 단계*에 유용 |
| `gsl::narrow_cast` | 허용 — *narrowing 명시 cast* |
| `gsl::narrow` | 신중 — *런타임 예외 던짐* |
| `Expects/Ensures` | 권장 (contract 명시) |
| `gsl::finally` | 권장 (scope guard) |

## 실전 — 완전 예제

```cpp
#include <gsl/span>
#include <gsl/pointers>
#include <gsl/util>
#include <gsl/assert>

class PacketDecoder {
public:
    explicit PacketDecoder(gsl::not_null<const Config *> cfg)
        : cfg_(cfg.get()) {}

    // Decode 함수 — 입력 길이 명시, 결과 길이 명시, 소유권 없음
    int Decode(gsl::span<const uint8_t> input,
               gsl::span<uint8_t> output,
               gsl::not_null<size_t *> output_size) {
        Expects(input.size() <= MaxInputSize);
        Expects(output.size() >= MinOutputSize);

        size_t produced = 0;
        for (auto byte : input) {
            if (produced >= output.size()) return -EOVERFLOW;
            output[produced++] = DecodeByte(byte);
        }

        *output_size = produced;
        Ensures(produced <= output.size());
        return 0;
    }

    // Owner 함수 — 결과 소유권 반환
    gsl::owner<Packet *> CreatePacket(gsl::span<const uint8_t> payload) {
        if (payload.size() > MaxPayloadSize) return nullptr;
        auto *pkt = new Packet();
        std::memcpy(pkt->data, payload.data(), payload.size());
        pkt->size = gsl::narrow<uint16_t>(payload.size());
        return pkt;
    }

private:
    const Config *cfg_;
};
```

이 코드:
- *입력 길이*가 시그니처에. NULL이 아님 보장.
- *전제·사후 조건*이 명시. 위반 즉시 검출.
- *소유권*이 명시. 호출자가 알 수 있음.
- *narrowing*이 명시 + 검증.

## 안전 측면의 종합 효과

GSL 도입 효과:

| 안전 영역 | GSL 도구 |
|---------|---------|
| Buffer overflow | `span` (길이 자동) |
| NULL deref | `not_null` |
| Use-after-free | `owner` + smart pointer |
| Narrowing | `narrow_cast` / `narrow` |
| Contract 위반 | `Expects` / `Ensures` |
| 자원 누수 | `finally` |
| 타입 혼용 | strong typedef (외부 라이브러리) |

대부분이 *컴파일 시 검출 또는 즉시 런타임 검출*. 사고가 *프로덕션까지 가지 않는다*.

## 한계

- **런타임 오버헤드** — `not_null`, `narrow`, `Expects`가 *런타임 검사*. 인증 코드에서는 *Release 모드에서 비활성화* 가능.
- **표준이 아닌 의존성** — gsl-lite, Microsoft.GSL 라이브러리 도입 필요.
- **모든 코드에 적용 어려움** — *외부 API*는 *adapter*가 필요.

## 정리

- GSL이 *C++ Core Guidelines의 라이브러리 구현*.
- `gsl::span` — 길이 동반 포인터. C++20 표준화.
- `gsl::not_null` — NULL 불허 보장.
- `gsl::owner<T*>` — 소유권 표시 (정적 분석 hint).
- `gsl::narrow_cast` / `gsl::narrow` — narrowing 명시.
- `Expects` / `Ensures` — 전제·사후 조건 명시.
- `gsl::finally` — scope guard.
- AUTOSAR는 GSL을 *호환·권장*. 인증 코드의 다층 방어.

## 다음 장 예고

14장은 *C++ 표준 진화 추적* — C++17, C++20, C++23 임베디드 안전 critical 적용 방안.

## 관련 항목

- [Ch 11 — RAII Pattern Catalog](/blog/embedded/automotive/autosar-cpp/chapter11-raii-pattern-catalog)
- [Ch 12 — Compile-time C++](/blog/embedded/automotive/autosar-cpp/chapter12-compile-time-cpp)
- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
- [Microsoft GSL](https://github.com/microsoft/GSL)
- [gsl-lite](https://github.com/gsl-lite/gsl-lite)
