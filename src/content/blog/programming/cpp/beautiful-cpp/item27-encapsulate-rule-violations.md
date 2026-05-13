---
title: "항목 27: 규칙 위반을 캡슐화하라"
date: 2026-05-10T16:00:00
description: "규칙을 어겨야 할 때 — 위반을 한 곳에 가두고 안전한 인터페이스로 외부 노출. const_cast, reinterpret_cast, 저수준 메모리 조작."
tags: [C++, Encapsulation]
series: "Beautiful C++"
seriesOrder: 27
draft: false
draft: true
---

## 왜 이 항목이 중요한가?

C++ 가이드라인은 — "**이렇게 하지 마라**"가 많다. `reinterpret_cast` 금지, raw `new` 금지, mutable 글로벌 금지, etc. 그러나 현실에선 — 정말 어쩔 수 없이 어겨야 할 때가 있다:

- 외부 C API와의 호환 (`reinterpret_cast`)
- 저수준 하드웨어 / 메모리 매핑
- 레거시 라이브러리 wrapping
- 극한 성능 (SIMD intrinsic, bit manipulation)

규칙을 어기는 게 문제는 아니다 — **위반이 코드 곳곳에 흩어지는** 게 문제. 사용자가 모든 호출 지점에서 위험을 의식해야 함.

해결: **위반을 한 클래스/함수에 가두고**, 외부에는 **안전한 인터페이스**만 노출. 안에서는 어쩔 수 없이 위험한 코드 — 단, 한 곳에서만, 잘 문서화되고, 단위 테스트로 보호. 이게 **캡슐화의 강력함**.

## 핵심 내용

- 가끔은 가이드라인을 **어겨야** 하는 경우가 있다 (성능, 외부 API, 저수준 비트 조작)
- 그럴 때는 **위반을 한 곳에 가두고** 안전한 인터페이스로 외부에 노출
- 위반 코드는 **명확하게 표시**(주석·이름·정적 분석 억제 지시)하고, 단위 테스트로 보호
- 대표 예: `reinterpret_cast`, `const_cast`, 원시 메모리 조작, 스레드 안전 우회 등
- 외부 코드는 위반의 존재를 **모른 채** 안전한 API만 보면 된다

## 비교 — 흩뿌린 위반 vs 캡슐화

### Bad: reinterpret_cast가 호출부에 흩어짐

```cpp
void send(const Packet& p) {
    auto* raw = reinterpret_cast<const std::byte*>(&p);     // ⚠️ 위반
    socket.write(raw, sizeof(p));
}

void log(const Packet& p) {
    auto* raw = reinterpret_cast<const std::byte*>(&p);     // ⚠️ 또 위반
    file.write(raw, sizeof(p));
}

void hash(const Packet& p) {
    auto* raw = reinterpret_cast<const std::byte*>(&p);     // ⚠️ 또 또
    return std::hash_bytes(raw, sizeof(p));
}
```

문제:
- 같은 위반이 N번 — 코드 리뷰 부담
- alignment, lifetime, undefined behavior 의식을 N번 해야
- 새 함수 추가할 때마다 또 위반

### Good: 한 곳에 캡슐화

```cpp
class PacketBytes {
    const std::byte* data_;
    std::size_t      size_;
public:
    explicit PacketBytes(const Packet& p)
        : data_(reinterpret_cast<const std::byte*>(&p))     // 여기서만 위반
        , size_(sizeof(p)) {
        static_assert(std::is_trivially_copyable_v<Packet>,
                      "Packet must be trivially copyable for byte access");
    }
    
    const std::byte* data() const { return data_; }
    std::size_t      size() const { return size_; }
};

void send(const Packet& p) { PacketBytes b{p}; socket.write(b.data(), b.size()); }
void log (const Packet& p) { PacketBytes b{p}; file  .write(b.data(), b.size()); }
void hash(const Packet& p) { PacketBytes b{p}; return std::hash_bytes(b.data(), b.size()); }
```

- 위반은 `PacketBytes` 생성자 **한 줄**
- `static_assert`로 사용자가 잘못된 타입 방지
- 외부 사용자는 위반 의식 안 함
- 단위 테스트로 `PacketBytes` 자체 검증

## 캡슐화 단계

### 1) 위반을 클래스 안에 가두기

```cpp
class HardwareRegister {
    volatile uint32_t* reg_;     // 메모리 매핑된 하드웨어 — 위험
public:
    explicit HardwareRegister(uintptr_t addr)
        : reg_(reinterpret_cast<volatile uint32_t*>(addr)) {}
    
    uint32_t read() const   { return *reg_; }
    void     write(uint32_t v) { *reg_ = v; }
};
```

`reinterpret_cast`는 — 생성자에 한 번. 외부는 read/write 메서드.

### 2) static_assert로 사용자 보호

```cpp
template<typename T>
class ByteView {
    static_assert(std::is_trivially_copyable_v<T>,
                  "ByteView requires trivially copyable type");
    
    const std::byte* data_;
public:
    explicit ByteView(const T& t)
        : data_(reinterpret_cast<const std::byte*>(&t)) {}
};
```

잘못된 사용을 컴파일 타임에 차단.

### 3) 정적 분석 도구 억제

```cpp
class PacketBytes {
public:
    explicit PacketBytes(const Packet& p)
        // NOLINTNEXTLINE(cppcoreguidelines-pro-type-reinterpret-cast)
        : data_(reinterpret_cast<const std::byte*>(&p))
        , size_(sizeof(p)) {}
};
```

`// NOLINT*` 주석 — 의도된 위반임을 도구에 알림. 한 줄에 한정.

### 4) 단위 테스트로 보호

```cpp
TEST(PacketBytesTest, RoundTrip) {
    Packet original = make_test_packet();
    PacketBytes bytes{original};
    
    Packet reconstructed;
    std::memcpy(&reconstructed, bytes.data(), bytes.size());
    
    EXPECT_EQ(original, reconstructed);
}
```

위반이 가진 가정(POD, 같은 머신에서 round-trip 가능 등)을 — 명시적 테스트.

## 흔한 위반 케이스들

### const_cast — C API 호환

```cpp
class CompatibilityLayer {
    static void legacy_callback(char* mut_str, void* data) {
        // 옛 C API
    }
public:
    static void process(const std::string& s, Data& d) {
        // 한 곳에서 const_cast — legacy API와 호환
        char* mut = const_cast<char*>(s.data());      // ⚠️ s가 정말 mutable인지 호출자 보장
        legacy_callback(mut, &d);
    }
};
```

호출자에게 — "이 함수에 const 인자를 넘기지 마라"를 문서화.

### reinterpret_cast — 비트 조작

```cpp
template<typename T>
class BitView {
    static_assert(std::has_unique_object_representations_v<T>);
    
    const std::byte* bytes_;
public:
    explicit BitView(const T& t)
        : bytes_(reinterpret_cast<const std::byte*>(&t)) {}
    
    uint32_t crc32() const { /* bytes_ 기반 CRC */ }
    std::string hex() const { /* hex dump */ }
};
```

비트 단위 작업의 wrapping.

### 글로벌 상태 — 의도된 캡슐화

```cpp
class Logger {
    // 진짜 글로벌 상태 — 한 곳에 가둠
    static std::mutex mu_;
    static std::ofstream file_;
public:
    static void log(const std::string& msg);
};
```

피할 수 없는 글로벌(예: 시스템 로깅) — 클래스로 묶고 인터페이스 명시.

### 저수준 메모리 — 풀 할당기

```cpp
class FixedSizePool {
    std::byte* memory_;
    std::size_t size_;
    std::size_t used_ = 0;
public:
    void* allocate(std::size_t bytes) {
        if (used_ + bytes > size_) throw std::bad_alloc{};
        void* p = memory_ + used_;
        used_ += bytes;
        return p;
    }
    
    // 일반 코드는 이 클래스만 사용 — raw 포인터 산술 X
};
```

## 위반 캡슐화의 4가지 규칙

1. **클래스 하나에 한 종류의 위반** — `PacketBytes`는 byte 변환만. `Pool`은 메모리만.
2. **위반 코드는 한 줄로** — 가능한 최소화
3. **컴파일 타임 / 런타임 검증** — `static_assert`, assert, 예외
4. **단위 테스트 보호** — 위반의 가정을 명시 테스트

## 함정 — "위반은 어쩔 수 없으니까" 합리화

```cpp
class Bad {
public:
    void process() {
        auto* p = reinterpret_cast<int*>(someUnrelatedPointer);     // ⚠️
        // ... 가공 ...
        someState = const_cast<State*>(constState);                  // ⚠️
        // ... 또 ...
    }
};
```

같은 함수에 여러 종류 위반 — 캡슐화 X. 각 위반의 의도가 흐려짐.

해결: 위반별로 분리, 각각 별도 클래스로.

## C++20+ 더 안전한 대안

기존 위반 → 모던 도구로 대체 가능한 경우:

```cpp
// 옛: reinterpret_cast
auto* p = reinterpret_cast<const std::byte*>(&obj);

// 모던 (C++20): std::bit_cast — 안전한 비트 재해석
auto bits = std::bit_cast<uint32_t>(some_float);

// 모던: std::start_lifetime_as (C++23) — 라이프타임 시작
```

새 기능으로 — 일부 위반이 정당한 표준 도구로 변신.

## 함정 — 캡슐화 클래스가 너무 많아짐

```cpp
class ByteViewForA { /* ... */ };
class ByteViewForB { /* ... */ };
class ByteViewForC { /* ... */ };
// 매 타입마다 별도 클래스
```

해결: 템플릿으로 일반화.

```cpp
template<typename T>
class ByteView {
    static_assert(std::is_trivially_copyable_v<T>);
    // ...
};
```

## 정적 분석 도구의 위반 검출

```bash
clang-tidy --checks='cppcoreguidelines-pro-type-reinterpret-cast'
clang-tidy --checks='cppcoreguidelines-pro-type-const-cast'
clang-tidy --checks='cppcoreguidelines-avoid-c-arrays'
```

자동 검출 → 캡슐화되지 않은 위반 찾기.

## 흔한 패턴 — `detail` namespace

```cpp
namespace mylib {
    
    namespace detail {
        // 위반이 들어 있는 구현
        const std::byte* unsafe_byte_view(const auto& t) {
            return reinterpret_cast<const std::byte*>(&t);
        }
    }
    
    template<typename T>
    void serialize(const T& t, std::ostream& os) {
        auto* bytes = detail::unsafe_byte_view(t);     // 캡슐화된 호출
        os.write(reinterpret_cast<const char*>(bytes), sizeof(T));
    }
}
```

`detail` 네임스페이스 — 구현 디테일 격리. 사용자는 `mylib::serialize`만.

## 라이브러리 경계 — 위반 안 새어 나오기

```cpp
// mylib.h
namespace mylib {
    // 안전한 공개 인터페이스만
    template<typename T>
    void serialize(const T&, std::ostream&);
    
    template<typename T>
    void deserialize(T&, std::istream&);
}

// 사용자 코드는 위반을 모름
```

## 실무 가이드 — 결정 트리

```
규칙 위반이 필요한가?
├── 어쩔 수 없는 경우 (외부 API, 저수준)
│   ├── 위반을 한 클래스/함수에 가두기
│   ├── static_assert로 사용자 보호
│   ├── 단위 테스트로 가정 검증
│   └── NOLINT 주석으로 도구 억제
├── 모던 도구로 대체 가능 → std::bit_cast 등
└── 정말 필요 없음 → 위반 안 함
```

## 실무 가이드 — 체크리스트

- [ ] 모든 위반이 클래스/함수에 캡슐화되어 있는가?
- [ ] 외부 코드는 위반 의식 안 하고 사용 가능?
- [ ] `static_assert`로 잘못된 사용 차단?
- [ ] 위반의 가정을 단위 테스트로 검증?
- [ ] NOLINT 주석으로 도구 억제 (의도 명시)?
- [ ] 모던 도구(`std::bit_cast` 등)로 대체 가능한지 검토?

## 정리

규칙은 어길 수 있다. 단, **한 군데에 가두고 이름을 붙여라**. 위반 코드가 흩어지면 추적·테스트·교체가 모두 어려워진다.

캡슐화 단계:
1. **클래스로 묶기** — 위반이 멤버 함수 또는 생성자에 한 줄
2. **컴파일 타임 보호** — `static_assert`
3. **런타임 보호** — assert, 예외
4. **단위 테스트** — 가정 명시
5. **NOLINT 주석** — 의도된 위반 표시

## 관련 항목

- [항목 7: 지저분한 struct 캡슐화](/blog/programming/cpp/beautiful-cpp/item07-encapsulate-messy-structs) — C API 위반 캡슐화
- [항목 9: C ABI 경계](/blog/programming/cpp/beautiful-cpp/item09-use-c-subset-for-cross-compiler-abi) — ABI 위반 격리
- [항목 16: const 캐스트 X](/blog/programming/cpp/beautiful-cpp/item16-dont-cast-away-const) — const_cast 사용
