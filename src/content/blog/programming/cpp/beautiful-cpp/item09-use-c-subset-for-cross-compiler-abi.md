---
title: "항목 9: 크로스 컴파일러 ABI가 필요하면 C 방식의 하위 집합을 사용하라"
date: 2026-05-05T09:00:00
description: "DLL/플러그인 경계에서 C++ ABI 호환성 문제를 피하는 패턴 — extern C, POD 구조체, 불투명 핸들."
tags: [C++, ABI, FFI]
series: "Beautiful C++"
seriesOrder: 9
draft: true
---

## 왜 이 항목이 중요한가?

**ABI**(Application Binary Interface) — 컴파일된 코드 간의 바이너리 계약. C++의 ABI는 다음에 의존한다:

- **이름 맹글링**(name mangling): `void foo(int)` → `_Z3fooi` (GCC), `?foo@@YAXH@Z` (MSVC) — 컴파일러마다 다름
- **클래스 레이아웃**: vtable 위치, padding, 다중 상속 오프셋
- **표준 라이브러리 내부**: `std::string`의 SSO 크기, `std::vector` 멤버 레이아웃 — 구현마다 다름
- **예외 처리 메커니즘**: 스택 unwinding 방식

→ **두 다른 컴파일러로 빌드된 C++ 모듈을 링크하면 거의 항상 깨진다.** DLL 플러그인, 다른 언어 FFI(Python, Rust, C#), OS API 등 경계에서는 C++ 타입을 그대로 노출하지 말 것.

해결: **`extern "C"` + 단순 C 타입**만 경계에 노출. 내부 구현은 C++로 자유롭게.

## 핵심 내용

- C++의 ABI는 **컴파일러·버전마다 다르다** — name mangling, vtable, 표준 라이브러리 내부
- DLL/so 경계, 플러그인, 다른 언어와의 FFI에서 C++ 타입을 그대로 노출하면 **호환성이 깨진다**
- 경계에서는 **`extern "C"`로 선언된 단순한 C 함수 + POD 구조체 + 불투명 핸들**만 사용
- 내부 구현은 마음껏 C++로 작성하되, **인터페이스만 C 하위 집합**으로 좁혀라

## 비교 — C++ 타입 노출 vs C 하위 집합

### Bad: C++ 타입이 ABI 경계를 넘는다

```cpp
// mylib.h — DLL 헤더
extern "C" {
    std::string  get_version();              // ⚠️ std::string ABI 의존
    std::vector<int> get_data();             // ⚠️ std::vector ABI 의존
    void process(std::function<void()> cb);  // ⚠️ std::function 내부
}
```

문제:
- `std::string`의 SSO buffer 크기, 멤버 순서는 구현마다 다름
- libstdc++로 빌드된 DLL을 MSVC 앱이 호출 → `std::string` 레이아웃 mismatch → 크래시
- 라이브러리 사용자가 같은 컴파일러·표준 라이브러리 버전을 강제 받음

### Good: C 하위 집합만 노출

```cpp
// mylib.h
#ifdef __cplusplus
extern "C" {
#endif

// 불투명 핸들 — 내부 구조는 사용자에게 안 보임
typedef struct LibContext LibContext;

// 라이프사이클
LibContext* lib_create(void);
void        lib_destroy(LibContext* ctx);

// 함수 — 출력 버퍼는 호출자가 제공
int   lib_get_version(LibContext* ctx, char* out, size_t out_size);
int   lib_get_data(LibContext* ctx, int* out, size_t* in_out_count);

// 콜백 — C 함수 포인터
typedef void (*lib_callback_t)(void* user_data);
void lib_set_callback(LibContext* ctx, lib_callback_t cb, void* user_data);

// POD 구조체로 묶음 — 단순 멤버만
typedef struct LibConfig {
    int   timeout_ms;
    int   max_retries;
    char  host[256];
} LibConfig;

int lib_configure(LibContext* ctx, const LibConfig* config);

#ifdef __cplusplus
}
#endif
```

핵심:
- `extern "C"` — name mangling 없음, C 링키지
- **불투명 핸들** (`typedef struct X X`) — 내부 구조 비공개
- **POD 구조체** — `int`, `char[]` 같은 단순 멤버만, 표준 레이아웃 보장
- **C 함수 포인터** — `std::function` 대신
- **출력 버퍼는 호출자가 제공** — `std::string` 반환 안 함

## 내부는 C++ 자유롭게

```cpp
// mylib.cpp
#include "mylib.h"
#include <string>
#include <vector>
#include <memory>

struct LibContext {     // 외부엔 불투명, 내부엔 C++
    std::string host;
    std::vector<int> data;
    int timeout_ms = 5000;
    // ... C++ 멤버 ...
};

extern "C" LibContext* lib_create() {
    try {
        return new LibContext{};
    } catch (...) {
        return nullptr;     // 예외는 경계를 넘지 않게
    }
}

extern "C" void lib_destroy(LibContext* ctx) {
    delete ctx;     // delete는 noexcept (가정)
}

extern "C" int lib_get_version(LibContext* ctx, char* out, size_t out_size) {
    if (!ctx || !out) return -1;
    try {
        auto version = std::string{"1.2.3"};
        if (version.size() + 1 > out_size) return -2;     // 버퍼 부족
        std::memcpy(out, version.c_str(), version.size() + 1);
        return 0;
    } catch (...) {
        return -3;
    }
}
```

내부에선 `std::string`, `std::vector`, `try/catch` 자유롭게. 경계만 단순 C로.

## 예외도 경계를 넘지 마라

C 코드는 C++ 예외를 catch 못 함. ABI 경계에서 예외가 빠져나가면 — **undefined behavior**, 크래시.

```cpp
extern "C" int my_function(/* ... */) {
    try {
        // ... C++ 로직 ...
        return 0;     // 성공
    } catch (const std::exception& e) {
        log_error(e.what());
        return -1;    // 실패
    } catch (...) {
        return -2;
    }
}
```

**모든 `extern "C"` 함수는 try/catch로 래핑**. 에러는 반환 코드로.

## 함정 — std::function을 콜백에

```cpp
// ⚠️ std::function은 ABI 불안정
extern "C" void register_handler(std::function<void(int)> handler);
```

대신:

```cpp
// C 함수 포인터 + user data
typedef void (*handler_t)(int event, void* user_data);
extern "C" void register_handler(handler_t handler, void* user_data);
```

사용:

```cpp
// 사용자 코드
void my_handler(int event, void* data) {
    auto* state = static_cast<MyState*>(data);
    // ...
}

MyState state;
register_handler(my_handler, &state);
```

C 함수 포인터 + `void*` user data — 모든 콜백 ABI의 표준 패턴.

## 함정 — class를 통째로 noexport

```cpp
// ⚠️ 클래스를 DLL export — 사용자가 같은 컴파일러 필수
__declspec(dllexport) class MyClass {
public:
    void doSomething();
    // ...
};
```

이건 작동은 한다 — 같은 컴파일러·표준 라이브러리 버전이라면. 다른 환경에서는 깨짐. **PIMPL + extern "C" 함수**로 우회.

## PIMPL + extern "C" 패턴

```cpp
// mylib.h
typedef struct Widget Widget;

extern "C" {
    Widget* widget_create(int width, int height);
    void    widget_destroy(Widget* w);
    void    widget_resize(Widget* w, int width, int height);
    int     widget_width(const Widget* w);
}
```

```cpp
// mylib.cpp
#include "mylib.h"

class WidgetImpl {
public:
    int width, height;
    // ... C++ 풍부한 멤버 ...
};

struct Widget {
    std::unique_ptr<WidgetImpl> impl;
};

extern "C" Widget* widget_create(int w, int h) {
    auto widget = std::make_unique<Widget>();
    widget->impl = std::make_unique<WidgetImpl>();
    widget->impl->width = w;
    widget->impl->height = h;
    return widget.release();
}

extern "C" void widget_destroy(Widget* w) { delete w; }

extern "C" void widget_resize(Widget* w, int width, int height) {
    if (!w) return;
    w->impl->width = width;
    w->impl->height = height;
}
```

C++ 객체지향 내부 + C 인터페이스 외부 — 양쪽 장점.

## 함정 — 표준 라이브러리 타입 포인터로 노출

```cpp
extern "C" std::vector<int>* get_data();     // ⚠️ vector 레이아웃 의존
```

포인터든 값이든 — `std::vector`라는 타입을 노출하면 깨짐. 사용자가 그 vector에 어떻게 접근할 건가? 결국 vector의 내부 메서드를 호출 → 다른 컴파일러의 vector 구현과 충돌.

해결: **데이터 + 크기 분리**.

```cpp
extern "C" {
    int  get_data_count(LibContext* ctx);
    int  get_data_at(LibContext* ctx, int index);
    // 또는
    int  get_data_array(LibContext* ctx, int* out, int max_count);
}
```

## 다른 언어 FFI 지원

C ABI는 거의 모든 언어가 지원:

```python
# Python (ctypes)
import ctypes
lib = ctypes.CDLL("./mylib.so")
ctx = lib.lib_create()
buffer = ctypes.create_string_buffer(64)
lib.lib_get_version(ctx, buffer, 64)
```

```rust
// Rust
extern "C" {
    fn lib_create() -> *mut LibContext;
    fn lib_destroy(ctx: *mut LibContext);
}
```

C++ ABI를 Rust/Python에서 호출하는 건 매우 어렵지만 — C ABI는 표준.

## 빌드 시스템 검증

```cmake
add_library(mylib SHARED mylib.cpp)
target_compile_options(mylib PRIVATE
    -fvisibility=hidden          # 기본 숨김
)

# 내보낼 함수만 명시
set_target_properties(mylib PROPERTIES
    CXX_VISIBILITY_PRESET hidden
    VISIBILITY_INLINES_HIDDEN ON
)
```

기본 hidden + `__attribute__((visibility("default")))` 또는 `__declspec(dllexport)`로 명시 export.

## 함정 — `bool` 크기

`sizeof(bool)`은 보통 1이지만 컴파일러마다 다를 수 있음. C99의 `_Bool` 또는 `int`로 명시:

```cpp
extern "C" int lib_is_ready(LibContext* ctx);     // 0/1로 표현
```

## 실무 가이드 — 경계 설계 체크리스트

- [ ] `extern "C"`로 감쌌는가?
- [ ] 모든 매개변수·반환 타입이 C 호환?
  - 기본 정수 타입, 포인터, 단순 struct
  - `std::string`, `std::vector` 등 표준 라이브러리 타입 X
- [ ] 클래스 포인터 → **불투명 핸들** (`typedef struct X X`)
- [ ] 함수 포인터 + `void* user_data` for 콜백
- [ ] 출력 버퍼는 **호출자가 제공**
- [ ] 모든 함수가 **try/catch로 래핑** (예외 누출 방지)
- [ ] 에러는 반환 코드로
- [ ] `__attribute__((visibility))` / `__declspec(dllexport)` 명시 export
- [ ] 헤더에 `#ifdef __cplusplus` + `extern "C" {}` 가드

## 정리

C++의 풍요로움은 **모듈 내부에서**만 누리고, 모듈 경계는 **C로 좁혀라**. 이 한 줄이 멀티 컴파일러·다언어 호환성을 지켜준다.

핵심 도구:
- `extern "C"` — name mangling 차단
- **불투명 핸들** — 내부 비공개
- **POD 구조체** — 단순 멤버만
- **함수 포인터 + user data** — 콜백 표준
- **try/catch 래핑** — 예외 격리
- **출력 버퍼** — 사용자 메모리 사용

## 관련 항목

- [항목 7: 지저분한 struct 캡슐화](/blog/programming/cpp/beautiful-cpp/item07-encapsulate-messy-structs) — C API의 안쪽 래핑
- [항목 13: 원시 포인터로 소유권 이전 X](/blog/programming/cpp/beautiful-cpp/item13-never-transfer-ownership-via-raw-pointer) — 단, ABI 경계는 예외
- [항목 17: 전역 상태 / 에러](/blog/programming/cpp/beautiful-cpp/item17-avoid-global-state-error-handling) — 반환 코드 패턴
