---
title: "항목 13: 자원 관리에는 객체를 사용하라"
date: 2025-02-03T10:00:00
description: "RAII — 자원의 획득은 곧 초기화. 스마트 포인터·lock_guard·컨테이너로 누수 없는 자원 관리."
tags: [C++, Effective C++, RAII, Smart Pointer]
series: "Effective C++"
seriesOrder: 13
---

## 개요

수동으로 `new`/`delete` 짝을 맞추는 코드는 **예외, early return, 새 분기 추가** 모두에 취약합니다. C++의 결정적 자원 관리 모델은 **RAII**(Resource Acquisition Is Initialization) — 자원을 객체의 생성/소멸 라이프타임에 묶어, 어떤 경로로 빠져나가도 정리가 자동 보장되게 합니다.

## 필수 개념: RAII의 두 원리

> **초보자를 위한 배경 지식**

<br>

RAII는 두 가지 원리 위에 서 있습니다.

**1. 자원은 획득 즉시 객체에 위임된다.**

자원을 얻는 순간 그 자원을 관리하는 객체가 만들어집니다 — 그래서 "**자원 획득 == 객체 초기화**". 자원을 들고 다닐 raw 변수가 따로 존재하지 않습니다.

**2. 자원 관리 객체의 소멸자가 자원을 해제한다.**

C++은 스코프를 벗어날 때 자동 변수의 소멸자를 **결정적으로** 호출 — 정상 종료, return, 예외 unwinding 어떤 경로든 동일.

```
{
    SomeRAII guard(...);   // 자원 획득
    // ...
    // ↓ scope 나가는 모든 경로에서
    // ↓ guard의 소멸자 호출 → 자원 해제
}
```

이 두 원리가 결합하면 **수동 정리 코드가 필요 없어집니다**.

## 위험한 수동 관리

```cpp
void f() {
    Investment* pInv = createInvestment();   // factory가 동적 할당
    // ... 처리 ...
    delete pInv;                              // 정리
}
```

겉보기엔 OK. 그러나 진화하면서 함정이 생깁니다.

### 함정 1 — 예외

```cpp
void f() {
    Investment* pInv = createInvestment();
    process(pInv);              // ⚠️ 예외 던질 수 있음
    delete pInv;
}
```

`process`가 예외를 던지면 stack unwinding으로 `delete pInv`에 도달하지 못함 → 누수.

### 함정 2 — 추가된 early return

```cpp
void f() {
    Investment* pInv = createInvestment();
    if (cond1) return;          // ⚠️ 누수
    if (cond2) return;          // ⚠️ 누수
    delete pInv;
}
```

리팩토링하면서 누군가 새로운 early return을 추가하면 — 누수. 코드 리뷰로 잡지 못하는 경우 다반사.

### 함정 3 — 새로운 분기

```cpp
void f() {
    Investment* pInv = createInvestment();
    if (cond) {
        // 새로 추가된 분기에서 delete 빠뜨림
        return;
    }
    delete pInv;
}
```

특히 자원이 한 개가 아니라 여러 개면 — 정리 순서, 정리 누락 위험이 기하급수적.

## RAII로 정리

```cpp
void f() {
    std::unique_ptr<Investment> pInv(createInvestment());
    process(pInv.get());        // 예외 던져도 OK
    if (cond) return;           // 자동 정리
    // 어디로 빠져나가도 unique_ptr 소멸자가 delete 호출
}
```

`unique_ptr`의 소멸자가 함수 끝에서 자동으로 `delete`. 어떤 경로로 빠져나가도 보장.

## 표준 RAII 도구

### `std::unique_ptr` — 독점 소유 (C++11+)

```cpp
auto p = std::make_unique<Widget>(args...);   // C++14
// 또는
std::unique_ptr<Widget> p(new Widget(args...));

p->method();          // 멤버 접근
*p = newValue;        // 역참조
Widget* raw = p.get(); // raw pointer (양도 X)

// 복사 불가 — 이동만
auto q = p;            // ❌ 컴파일 에러
auto q = std::move(p); // ✅ 소유권 이전
```

- 메모리 오버헤드 0 (raw pointer와 같은 크기)
- 컴파일러가 정확히 한 번의 `delete` 보장
- 배열은 `std::unique_ptr<T[]>` — `delete[]` 자동

### `std::shared_ptr` — 공유 소유 (C++11+)

```cpp
auto p = std::make_shared<Widget>(args...);
auto q = p;            // 복사 OK — 참조 카운트 ++
// 마지막 shared_ptr가 소멸할 때 자원 해제
```

- 참조 카운팅 (atomic)
- 메모리 오버헤드 (control block) + 약간의 성능 비용
- 순환 참조 위험 — `weak_ptr`로 보완

언제 사용: 진짜 공유 소유가 필요할 때만. 보통은 `unique_ptr` + 함수 인자에 raw pointer/reference로 빌려주기.

### `std::lock_guard` / `std::unique_lock` / `std::scoped_lock` — 뮤텍스

```cpp
std::mutex mu;

void f() {
    std::lock_guard<std::mutex> lock(mu);    // 생성 시 lock
    // ... critical section ...
}                                              // 스코프 끝에서 unlock
```

C++17 `std::scoped_lock`은 다중 뮤텍스 deadlock-free 획득.

```cpp
std::scoped_lock lock(mu1, mu2);    // 여러 뮤텍스 동시 획득
```

### 컨테이너 — `std::vector`, `std::string`, `std::map` 등

내부 메모리를 자동 관리.

```cpp
{
    std::vector<int> v(1000000);     // 4MB 할당
    // ...
}                                      // 자동 해제
```

raw 배열 + `new[]`/`delete[]` 대신 `std::vector`.

### 기타 표준 RAII

- `std::fstream` — 파일 핸들
- `std::thread` (소멸 전 join 필요)
- `std::jthread` (C++20) — 자동 join

## 직접 RAII wrapper

표준에 없는 자원(OS handle, GPU resource 등)이면 직접 작성.

```cpp
class FontHandle {
    Font f;
public:
    explicit FontHandle(Font font) : f(font) {}
    ~FontHandle() { releaseFont(f); }

    FontHandle(const FontHandle&) = delete;
    FontHandle& operator=(const FontHandle&) = delete;

    FontHandle(FontHandle&& other) noexcept
        : f(other.f) { other.f = INVALID_FONT; }
    FontHandle& operator=(FontHandle&& other) noexcept {
        if (this != &other) {
            releaseFont(f);
            f = other.f;
            other.f = INVALID_FONT;
        }
        return *this;
    }

    Font get() const { return f; }      // 외부에서 raw 사용 시
};
```

핵심: 복사 정책 명확화 (보통 deletion + move). 항목 14 참고.

### `std::unique_ptr` + custom deleter

자주 사용하는 패턴 — 표준 컨테이너를 재사용.

```cpp
struct FontDeleter {
    void operator()(Font* f) const { releaseFont(*f); delete f; }
};
using FontHandle = std::unique_ptr<Font, FontDeleter>;

FontHandle fh(new Font(loadFont(name)));   // 자동 정리
```

또는 lambda:

```cpp
auto deleter = [](Font* f) { releaseFont(*f); delete f; };
std::unique_ptr<Font, decltype(deleter)> fh(new Font(...), deleter);
```

## 흔한 함정

### 1) `auto_ptr`는 deprecated

C++03의 `std::auto_ptr`는 복사 = 소유권 이전(strange copy semantics) — 의외성이 있어 C++11에서 deprecate, C++17에서 제거. `unique_ptr` 사용.

### 2) `make_unique` / `make_shared` 선호

```cpp
auto p = std::make_unique<Widget>(arg);    // ✅ 권장
std::unique_ptr<Widget> p(new Widget(arg)); // 거의 동등 (예외 안전성 미세 차이)
```

`make_*` 류는 예외 안전성, 가독성, 효율(shared_ptr는 단일 할당)에서 유리. 항목 EMC++ 21 참고.

### 3) shared_ptr 순환 참조

```cpp
struct Node {
    std::shared_ptr<Node> next;     // ⚠️ 순환이면 누수
};
auto a = std::make_shared<Node>();
auto b = std::make_shared<Node>();
a->next = b;
b->next = a;     // 순환 — 둘 다 절대 해제 X
```

해결: 한쪽을 `weak_ptr`로.

### 4) RAII 객체 안에 raw 포인터 보관

```cpp
class Manager {
    Widget* w;
public:
    Manager() : w(new Widget) {}
    ~Manager() { delete w; }
    // 복사/이동 미정의 — 자동 생성된 복사로 ⚠️ 위험
};
```

복사 시 두 객체가 같은 `w` 공유 → 이중 해제. 해결: `unique_ptr<Widget>`로 멤버 타입 변경 (rule of zero).

## 모던 변형 — `std::any`, `std::variant`

C++17 표준 도구가 일부 RAII 작업을 단순화.

```cpp
std::any value = std::string("hello");    // 어떤 타입이든
// soft 소멸 — 들어있는 객체 자동 정리
```

## 실무 가이드 — 체크리스트

- [ ] 모든 `new`/`delete`를 RAII 객체로 감쌌는가?
- [ ] `std::unique_ptr`이 충분한 경우 `shared_ptr` 안 쓰고 있는가?
- [ ] 뮤텍스 락은 `lock_guard`/`scoped_lock`?
- [ ] 파일은 `std::fstream` (자동 close)?
- [ ] 직접 작성한 RAII 클래스는 복사/이동 정책 명확화?
- [ ] `make_unique`/`make_shared` 사용?

## 핵심 정리

1. **자원은 객체에 위임** — 수동 delete는 예외·early return·새 분기에 취약
2. **RAII의 두 원리**: 획득 즉시 객체화, 소멸자가 해제
3. **표준 도구**: `unique_ptr`(독점), `shared_ptr`(공유), `lock_guard`(뮤텍스), 컨테이너
4. `make_unique` / `make_shared` 사용 — 예외 안전성 + 효율
5. 직접 RAII 작성 시 **복사 정책 명확** (항목 14)
6. `auto_ptr`는 deprecated/제거 — `unique_ptr`로

## 관련 항목

- [항목 14: 자원 관리 클래스의 복사 동작](/blog/programming/cpp/effective-cpp/item14-think-carefully-about-copying-behavior-in-resource-managing-classes) — RAII의 복사 정책
- [항목 15: 자원 관리 클래스에서 raw 자원 접근](/blog/programming/cpp/effective-cpp/item15-provide-access-to-raw-resources-in-resource-managing-classes) — `.get()` 패턴
- [항목 17: new로 만든 객체는 스마트 포인터에](/blog/programming/cpp/effective-cpp/item17-store-newed-objects-in-smart-pointers-in-standalone-statements) — 예외 안전 생성
- [항목 18: 인터페이스는 쓰기 쉽고 오용 어렵게](/blog/programming/cpp/effective-cpp/item18-make-interfaces-easy-to-use-correctly-and-hard-to-use-incorrectly) — 팩토리 반환 타입
