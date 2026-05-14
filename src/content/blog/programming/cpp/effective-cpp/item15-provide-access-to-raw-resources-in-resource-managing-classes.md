---
title: "항목 15: 자원 관리 클래스에서 원시 자원에 대한 접근을 제공하라"
date: 2025-02-01T15:00:00
description: "RAII 객체에서 raw pointer/handle을 꺼내는 두 방식 — 명시적 .get()과 암묵 변환 연산자의 트레이드오프."
tags: [C++, Effective C++, RAII, API Design]
series: "Effective C++"
seriesOrder: 15
draft: true
---

## 왜 이 항목이 중요한가?

RAII는 자원을 객체로 감싸 안전하게 관리한다. 그런데 **현실 세계의 API는 raw 자원을 요구**한다. C 라이브러리, OS 함수, 레거시 코드는 `unique_ptr`이 아닌 raw 포인터를 받는다.

이 간극을 어떻게 메우느냐가 RAII 클래스 API의 핵심이다. 두 가지 방식이 있다.

- **명시적 `.get()`** — 안전하지만 호출이 더 적힌다.
- **암묵 변환 연산자** — 편하지만 의도치 않은 변환 함정을 만든다.

표준 라이브러리는 일관되게 명시 방식을 따른다 (`unique_ptr::get()`, `shared_ptr::get()`, `string::c_str()`). 이 항목은 두 방식의 트레이드오프를 본다.

## 개요

RAII 객체는 자원을 감싸지만, **현실 세계의 API는 raw 자원을 요구**한다. C 라이브러리, OS 함수, 레거시 코드 모두 그렇다. 자원 관리 클래스는 사용자가 raw 핸들을 꺼낼 수 있도록 **명시적**(`.get()` 메서드) 또는 **암묵적**(변환 연산자) 방식을 제공해야 한다. 두 방식은 안전성과 편의성의 트레이드오프다. 표준 라이브러리는 일관되게 명시 방식을 따른다.

## 왜 raw 접근이 필요한가

```cpp
std::unique_ptr<Font> p(loadFont("Arial"));

// C API — Font* 직접 요구
void useFontInDrawing(Font* font);

useFontInDrawing(p);          // ❌ unique_ptr 자체는 Font*가 아님
useFontInDrawing(p.get());     // ✅ raw pointer 꺼내기
```

C 라이브러리를 직접 호출하거나, 컴파일된 레거시 코드에 자원을 넘길 때 — RAII 객체에서 raw 핸들을 꺼낼 수단이 필수.

## 명시적 접근 — `.get()` 메서드

```cpp
class FontHandle {
    Font  f;
public:
    explicit FontHandle(Font font) : f(font) {}
    ~FontHandle() { releaseFont(f); }

    Font get() const { return f; }   // 명시적 접근자
};

FontHandle h(loadFont("Arial"));
useFontInDrawing(h.get());           // 매번 .get() 호출
```

**장점**:
- **의도가 명확** — "raw 핸들 빌려옴"이 코드에 보임
- **실수 방지** — RAII 객체가 자동으로 raw로 변환되지 않으므로 의도치 않은 노출 없음
- **이름 검색 친화적** — `.get()` 호출 위치를 grep으로 모두 찾기 쉬움

**단점**:
- 매번 `.get()` 호출 — 문법적 노이즈
- 연쇄 호출이 길어짐

**표준 라이브러리의 일관된 선택**:

```cpp
std::unique_ptr<int> p;
p.get();              // 명시

std::shared_ptr<int> sp;
sp.get();             // 명시

std::lock_guard<std::mutex> lock(mu);   // raw 접근 자체 노출 X (의도적)

std::fstream f;
f.rdbuf();            // 명시
```

표준은 거의 모든 RAII 타입에서 **명시적 접근 방식**을 택했습니다 — 의도성과 안전성 우선.

## 암묵적 접근 — 변환 연산자

```cpp
class FontHandle {
    Font  f;
public:
    explicit FontHandle(Font font) : f(font) {}
    ~FontHandle() { releaseFont(f); }

    operator Font() const { return f; }   // 암묵 변환
};

FontHandle h(loadFont("Arial"));
useFontInDrawing(h);                       // 자동 변환 — 자연스러움
```

**장점**:
- 사용 시 코드가 단순 — 마치 raw 타입처럼
- 작성자가 의도한 빈번한 사용에 적합

**단점 — 의도치 않은 변환**:

```cpp
FontHandle h1(loadFont("Arial"));
Font f = h1;                  // ⚠️ raw 핸들이 외부로 새어 나감
                              //    h1 소멸 후엔 f는 dangling
```

암묵 변환은 사용자가 raw 핸들을 **변수에 저장**할 수도 있게 만듦 — RAII 보호망 밖으로 나옴. 한 시점엔 RAII가 자원을 들고 있는데, 다른 변수도 같은 핸들을 가짐 → ownership 모호.

```cpp
void f(FontHandle h, bool flag) {
    Font raw = h;          // 위험 — h 소멸 후 raw는 dangling
    if (flag) {
        // ... 어딘가에 raw 저장 ...
    }
}                          // h 소멸 → raw 무효화 (그러나 다른 곳에 저장됐을 수도)
```

**디버깅 어려움**: 명시적 호출이 없으므로 raw 노출 위치를 grep으로 찾기 어려움.

## explicit 변환 연산자 (C++11+) — 중간 지점

```cpp
class FontHandle {
    Font  f;
public:
    explicit operator Font() const { return f; }   // explicit!
};

FontHandle h(loadFont("Arial"));
useFontInDrawing(h);                       // ❌ 암묵 변환 차단
useFontInDrawing((Font)h);                  // ✅ 명시적 캐스트
useFontInDrawing(static_cast<Font>(h));     // ✅
```

`explicit` 변환 연산자(C++11+)는 **암묵 변환은 막고 명시적 캐스트는 허용**. `std::optional`, `std::unique_ptr<T, D>`의 `bool` 변환이 이 방식 — `if (p)`는 OK지만 `int n = p;`는 차단.

```cpp
std::unique_ptr<int> p = ...;
if (p)            // OK — bool로 명시적 변환 컨텍스트
   ...;

bool b = p;       // ❌ 암묵 변환 차단
bool b = static_cast<bool>(p);   // ✅
```

대부분의 경우 — `.get()`이 더 명확하고 표준 관습. `explicit` 변환은 부울 컨텍스트 같은 특수 케이스에 유용.

## 두 방식 모두 — 표준 라이브러리 패턴

표준은 둘을 결합해 제공하기도:

```cpp
std::shared_ptr<int> sp(new int(42));

// 명시
sp.get();          // → int*

// 암묵 (bool 컨텍스트만)
if (sp) ...;       // → operator bool() const noexcept; explicit

// 역참조 — 별도 의미
*sp;               // → int&
sp->member;
```

`get`은 raw 포인터, `operator bool`은 nullness 검사 — 각각 다른 목적의 접근. 사용자에게 가장 자주 필요한 둘만 명확히 노출.

## 흔한 함정 — 일시 객체의 raw

```cpp
useFontInDrawing(FontHandle(loadFont("Arial")).get());
//               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//               임시 객체 — 이 표현식 종료 시 소멸
```

이 코드는 안전 — 임시 FontHandle은 **전체 표현식이 끝날 때까지** 살아 있음. 그러나:

```cpp
Font f = FontHandle(loadFont("Arial")).get();   // ⚠️ 임시 소멸 → f는 dangling
useFontInDrawing(f);                              // UB
```

raw를 **변수에 저장하면** 임시는 사라지고 raw만 남음. RAII 보호 밖.

**규칙**: raw 핸들을 변수에 보관하지 말고, 함수 호출 인자로만 사용 (해당 표현식 안에서만).

## RAII가 깨지는 또 다른 함정 — 사용자가 raw에 `delete`

```cpp
std::unique_ptr<Resource> p(new Resource);

useC API(p.get());     // 그냥 raw 빌려줌 — OK

delete p.get();        // ⚠️ 사용자가 직접 delete!
                       //    unique_ptr가 또 delete → 이중 해제
```

API 문서에 명확히 적어야 함 — "**라이브러리가 자원을 해제합니다, 사용자는 delete 호출 X**". 또는 `release()` 같은 명시적 양도 API 제공.

## 표준 함수 — `std::shared_ptr::get()`

`get`은 **소유권 양도 없이 raw 포인터를 빌려줌**:

```cpp
std::shared_ptr<int> sp(new int(42));
int* raw = sp.get();   // sp는 여전히 소유, raw는 빌린 포인터
// raw는 sp의 라이프타임 안에서만 유효
```

소유권 양도가 필요하면 `std::unique_ptr::release()` (raw 반환 + 내부 nullptr).

```cpp
auto p = std::make_unique<int>(42);
int* raw = p.release();    // p는 이제 nullptr, raw가 책임
delete raw;                 // 사용자가 직접 해제
```

## 실무 가이드 — 결정

| 상황 | 권장 |
| --- | --- |
| 일반 RAII 자원 노출 | `.get()` 명시 |
| 부울 컨텍스트 (`if (handle)`) | `explicit operator bool` |
| 매우 빈번한 raw 사용 + 안전 보장 | 암묵 변환 (드묾) |
| 소유권 양도 | `release()` |
| RAII 객체 자체 노출하지 말아야 함 | 접근자 없음 (lock_guard처럼) |

## 실무 가이드 — 체크리스트

- [ ] 사용자가 raw 핸들을 자주 필요로 하는가? → 접근자 제공
- [ ] `.get()` 명시 vs 변환 연산자 — 안전성/편의성 비교
- [ ] 변환 연산자를 쓴다면 `explicit`(C++11+) 고려
- [ ] 소유권 양도 API 별도로? (`release()`)
- [ ] 사용자가 raw에 delete 호출하지 말아야 함을 문서에 명시?

## 핵심 정리

1. RAII 객체는 raw 자원 접근 방법 **제공해야** — 현실 세계의 C API 호환
2. **명시적 `.get()`** vs **암묵 변환 연산자** — 안전 vs 편의
3. **표준 라이브러리는 명시 방식** 일관 — `unique_ptr::get`, `shared_ptr::get`
4. C++11+ `explicit operator T` — 암묵 변환은 막고 명시 캐스트는 허용
5. raw 핸들은 **임시로만 사용** — 변수에 저장하면 RAII 보호 깨짐
6. 소유권 양도 시엔 `release()` 패턴 (unique_ptr)

## 관련 항목

- [항목 13: RAII](/blog/programming/cpp/effective-cpp/item13-use-objects-to-manage-resources) — 접근자가 필요한 이유
- [항목 14: RAII 복사 정책](/blog/programming/cpp/effective-cpp/item14-think-carefully-about-copying-behavior-in-resource-managing-classes) — 정책에 따른 접근자 설계
- [항목 18: 인터페이스는 쓰기 쉽게 만들기](/blog/programming/cpp/effective-cpp/item18-make-interfaces-easy-to-use-correctly-and-hard-to-use-incorrectly) — 접근자도 API 설계
