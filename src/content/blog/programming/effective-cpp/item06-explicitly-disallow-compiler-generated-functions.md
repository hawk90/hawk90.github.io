---
title: "항목 6: 자동 생성 함수가 싫으면 명시적으로 금지하라"
date: 2025-02-02T11:00:00
description: "복사를 막아야 하는 클래스 — C++98 private 트릭, Uncopyable base, C++11 = delete."
tags: [C++, Effective C++, Special Member Functions]
series: "Effective C++"
seriesOrder: 6
---

## 개요

복사가 **의미상 잘못된** 클래스가 있습니다 — 부동산 객체, 파일 핸들, 뮤텍스, 싱글톤. 컴파일러가 자동으로 복사 함수를 만들어 주면 클라이언트가 무심코 복사할 수 있고, 그 결과는 보통 자원 누수·이중 해제·논리 오류입니다.

해결책은 시대에 따라 발전했습니다. C++98엔 트릭이 필요했지만 C++11에선 `= delete` 한 줄.

## 왜 복사를 막아야 하는가

### 사례 1 — 부동산 객체

```cpp
class HomeForSale {
    Address address;
    Price   price;
};
```

같은 집이 두 객체로 동시에 존재하는 게 도메인상 잘못. 매물은 **유일**해야 함.

### 사례 2 — 파일 핸들 RAII

```cpp
class FileGuard {
    FILE* fp;
public:
    FileGuard(const char* name) : fp(fopen(name, "r")) {}
    ~FileGuard() { if (fp) fclose(fp); }
};

FileGuard a("data.txt");
FileGuard b = a;          // 컴파일러 자동 복사 — fp 비트 복사
                          // → b 소멸: fclose(fp)
                          // → a 소멸: fclose(같은 fp!) → 이중 close
```

자원 핸들 객체는 보통 단일 소유 — 복사 의미가 없음.

### 사례 3 — 뮤텍스 / 락

```cpp
class Lock {
    Mutex* mu;
public:
    Lock(Mutex* m) : mu(m) { mu->lock(); }
    ~Lock()                 { mu->unlock(); }
};

Lock a(&m), b = a;        // ⚠️ 같은 뮤텍스에 unlock 두 번
```

락은 분명 복사 불가.

## C++98 방식 — `private` + 정의 없음

C++98엔 `= delete`가 없어 트릭이 필요했습니다.

```cpp
class HomeForSale {
private:
    HomeForSale(const HomeForSale&);                  // 선언만, 정의 X
    HomeForSale& operator=(const HomeForSale&);       // 선언만, 정의 X
};
```

**왜 동작하나**:
1. `private` — 외부에선 호출 시도 → **컴파일 에러** (access denied)
2. 정의 없음 — 멤버 함수 안이나 친구가 호출하면 **링크 에러** (undefined reference)

```cpp
HomeForSale a, b;
b = a;                    // 외부에서 호출 → access denied (컴파일 에러)

class Realtor {
    void f(HomeForSale& a, HomeForSale& b) {
        b = a;            // friend가 아니면 access denied
                          // friend면 컴파일 통과, 링크에서 unresolved reference
    }
};
```

**문제점**:
- 멤버 함수/friend 안의 호출은 **링크 시점까지 발견 안 됨** — 피드백 지연
- 의도가 명확하지 않음 — "private이라 못 쓰는 건가, 아니면 단순히 외부 차단인가?"

## C++98 강화판 — Uncopyable base

링크 에러를 컴파일 에러로 앞당기는 패턴:

```cpp
class Uncopyable {
protected:
    Uncopyable() = default;
    ~Uncopyable() = default;
private:
    Uncopyable(const Uncopyable&);                // 선언만
    Uncopyable& operator=(const Uncopyable&);     // 선언만
};

class HomeForSale : private Uncopyable {
    // ...
};
```

**왜 동작하나**: 컴파일러가 `HomeForSale`의 복사 함수를 자동 생성하려면 base의 복사 함수를 호출해야 함. base의 복사 함수는 private이라 derived(또는 그 친구)에서 호출 불가 → **컴파일 시점에 잡힘**.

Boost의 `boost::noncopyable`이 같은 패턴.

**상속 형태 주의**:
- `private` 상속 — "is-implemented-in-terms-of" 의미 (항목 39). 사용자에겐 base가 보이지 않음.
- `public` 상속도 가능하지만 의미가 흐려짐.

## C++11 방식 — `= delete`

```cpp
class HomeForSale {
public:
    HomeForSale(const HomeForSale&) = delete;
    HomeForSale& operator=(const HomeForSale&) = delete;
};
```

**비교 — 왜 더 좋은가**:

| 측면 | C++98 private 트릭 | C++11 = delete |
| --- | --- | --- |
| 외부 호출 | 컴파일 에러 (access) | 컴파일 에러 (use of deleted) |
| 친구/멤버 호출 | 링크 에러 | 컴파일 에러 |
| 의도 표현 | 모호 | 명확 |
| 에러 메시지 | "private member" | "use of deleted function" |
| 적용 범위 | 비-template 함수 | 모든 함수 (멤버, free, 템플릿 인스턴스) |

### `= delete`는 `public`에 두라

```cpp
class C {
public:
    C(const C&) = delete;     // ✅ public — 에러 메시지가 "deleted"로 명확
private:
    // C(const C&) = delete;  // ❌ 에러 메시지가 "private" 먼저 → 의도 혼동
};
```

**근거**: 컴파일러는 access check 전에 deleted check를 하지 않음. private이면 일반 사용자에겐 "private이라 못 쓴다"는 메시지가 먼저 — 의도 전달 실패.

### `= delete`의 추가 활용

복사 금지 외에도:

```cpp
class C {
public:
    void f(int);
    void f(double) = delete;     // double로 호출 금지 (실수 방지)
};

c.f(3.14);                       // ❌ deleted overload
c.f(3);                          // ✅
```

```cpp
template<typename T>
void process(T x);
template<>
void process<char>(char) = delete;   // char 특수화 금지

process<char>('x');                  // ❌
process<int>(5);                     // ✅
```

free 함수, 멤버, 템플릿 특수화 모두 가능 — private 트릭으론 안 되던 경우.

## 이동 연산도 함께 결정

C++11+ 에서 클래스의 복사를 막으면 **이동도** 명시적으로 결정해야 함.

```cpp
class HomeForSale {
public:
    HomeForSale(const HomeForSale&) = delete;
    HomeForSale& operator=(const HomeForSale&) = delete;
    // 이동은? 자동 생성 안 됨 (사용자가 복사 ops 명시했으므로)
    // → 명시적으로 결정
};
```

세 가지 선택:

```cpp
// 1) 이동도 금지 — 진정한 noncopyable + nonmovable
class A {
public:
    A(const A&) = delete;            A& operator=(const A&) = delete;
    A(A&&)      = delete;            A& operator=(A&&)      = delete;
};

// 2) 이동만 허용 — unique_ptr 스타일
class B {
public:
    B(const B&) = delete;            B& operator=(const B&) = delete;
    B(B&&)      = default;           B& operator=(B&&)      = default;
};

// 3) 복사·이동 모두 사용자 정의
class C {
public:
    C(const C&) = delete;            C& operator=(const C&) = delete;
    C(C&& other) noexcept { /* 사용자 본문 */ }
    C& operator=(C&& other) noexcept { /* 사용자 본문 */ return *this; }
};
```

표준 라이브러리의 예: `std::unique_ptr`는 (2)번 — 복사 불가, 이동 가능.

## 모던 변형 — `final` 클래스와 noncopyable의 결합

```cpp
class Singleton final {     // 더 이상 상속 불가
public:
    static Singleton& instance() {
        static Singleton s;
        return s;
    }

    Singleton(const Singleton&) = delete;
    Singleton& operator=(const Singleton&) = delete;
    Singleton(Singleton&&) = delete;
    Singleton& operator=(Singleton&&) = delete;

private:
    Singleton() = default;
    ~Singleton() = default;
};
```

`final`은 C++11+ 키워드 — 상속 차단. 싱글톤 같은 패턴에서 자주 결합.

## 실무 가이드

| 의도 | 권장 패턴 |
| --- | --- |
| 복사·이동 모두 금지 | 6개 deleted (public) |
| 복사 금지, 이동 허용 | 복사 deleted, 이동 default |
| 모든 인스턴스가 유일 (singleton) | + `final` + private ctor + static accessor |
| C++98만 사용 가능 | `private` 선언 + 정의 없음 (또는 Uncopyable base) |

## 핵심 정리

1. **C++11+ 이라면 `= delete`** — 가장 명확하고 컴파일 시점에 잡힘
2. `= delete`는 **public**에 두라 — 에러 메시지가 의도 그대로
3. **C++98 호환이 필요하면** `private` 선언 + 정의 X (또는 Uncopyable base)
4. 복사 금지 시 **이동 ops도 명시적으로 결정** (자동 생성 안 됨)
5. `= delete`는 free 함수·템플릿 특수화·overload 차단에도 활용

## 관련 항목

- [항목 5: C++가 자동 생성하는 함수들](/blog/programming/effective-cpp/item05-know-what-functions-cpp-silently-writes) — 무엇이 자동 생성되는가
- [항목 14: 자원 관리 클래스의 복사 동작](/blog/programming/effective-cpp/item14-think-carefully-about-copying-behavior-in-resource-managing-classes) — 복사 금지가 한 가지 선택지
- [항목 39: private 상속을 신중히](/blog/programming/effective-cpp/item39-use-private-inheritance-judiciously) — Uncopyable 패턴의 base
