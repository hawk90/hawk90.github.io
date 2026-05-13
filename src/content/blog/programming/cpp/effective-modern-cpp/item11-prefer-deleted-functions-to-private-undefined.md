---
title: "항목 11: 정의되지 않은 private 함수보다 = delete를 선호하라"
date: 2025-01-06T14:00:00
description: "= delete가 C++98 private 트릭보다 안전·강력 — 컴파일 타임, public 가능, 비-멤버·템플릿 특수화도 차단."
tags: [C++, deleted Functions, Special Member, Modern C++]
series: "Effective Modern C++"
seriesOrder: 11
---

## 왜 이 항목이 중요한가?

복사 불가능한 클래스, 특정 변환을 막고 싶은 함수 — "이 함수는 쓰지 마라"를 표현해야 하는 자리가 많다. C++98에선 `private` + 정의 없음이라는 트릭을 썼지만 세 가지 약점이 있었다.

- 멤버·friend 안에서 실수로 호출하면 **링크 시점**에야 잡힌다.
- 에러 메시지가 "private이라 접근 불가"로 나와 의도(삭제)가 흐려진다.
- **비-멤버 함수**, **템플릿 특수화**에는 적용할 방법이 없다.

C++11의 `= delete`는 이 셋을 모두 해결한다. 이 항목은 두 방식을 비교하고, `= delete`만이 가능한 패턴(타입별 변환 차단, 템플릿 인스턴스 차단)을 본다.

## 개요

C++98에서 함수를 "사용 불가"로 만들려면 `private`로 선언하고 정의를 빼는 트릭을 썼다. C++11의 **`= delete`** 는 같은 의도를 더 명확하고 강력하게 표현한다. **public**으로, **컴파일 타임에**, **비-멤버 함수에도**, **템플릿 특수화에도** 적용 가능하다.

## 필수 개념: "함수를 사용 불가로" 패턴

> **초보자를 위한 배경 지식**

<br>

대표 케이스가 복사 불가능한 클래스다. 표준 라이브러리의 `std::ifstream`, `std::ostream` 같은 스트림은 복사할 수 없다 (각 인스턴스가 자원 보유).

```cpp
std::ifstream f1("file.txt");
std::ifstream f2 = f1;   // ❌ 복사 불가 — 컴파일 에러
```

이걸 **사용자 정의 클래스**에서도 표현하려면 어떻게 해야 할까?

## C++98 방식 — `private` + 정의 없음

```cpp
class basic_ios {
public:
    // ...
private:
    basic_ios(const basic_ios&);              // 선언만, 정의 없음
    basic_ios& operator=(const basic_ios&);
};
```

### 동작 원리

1. **외부에서 호출** — `private`이라 컴파일 에러 (즉시 차단, OK).
2. **멤버·friend 안에서 호출** — 컴파일 통과, **링크 시점에 에러** (정의 없음).

### 단점

- 멤버/친구 함수에서 실수로 호출하면 **링크 에러**가 빌드 후반에 발견된다.
- 에러 메시지가 "사용 불가"보다 "정의 없음"으로 나와 의도가 불명확하다.
- private이라 외부 사용자에게 **삭제 의도가 보이지 않는다**.

### 보강 — Uncopyable 베이스 클래스

Boost의 `boost::noncopyable` 패턴이다.

```cpp
class Uncopyable {
protected:
    Uncopyable() {}
    ~Uncopyable() {}
private:
    Uncopyable(const Uncopyable&);
    Uncopyable& operator=(const Uncopyable&);
};

class HomeForSale : private Uncopyable { /* ... */ };
```

복사 시점에 base의 복사 함수가 호출된다. private이라 컴파일 에러. **컴파일 타임**에 잡힌다.

여전히 `private`라는 점은 같다.

## C++11 방식 — `= delete`

```cpp
class basic_ios {
public:
    basic_ios(const basic_ios&) = delete;
    basic_ios& operator=(const basic_ios&) = delete;
    // ...
};
```

### 동작

- **컴파일 타임**에 에러가 난다 (링크 시점 X).
- 에러 메시지가 명확하다. `error: use of deleted function`.
- `public`으로 선언하는 것이 권장된다. 의도가 시그니처에 분명하게 드러난다.
- 멤버 안에서 호출해도 같은 에러가 난다.

### `public` vs `private`

```cpp
// public — 권장
class W {
public:
    W(const W&) = delete;
};

// private — 컴파일 에러는 동일
class W {
private:
    W(const W&) = delete;
};
```

`public`을 권장하는 이유는 **에러 메시지가 명확**하기 때문이다.

```cpp
W a, b;
W c(a);
```

`public + delete`의 경우 이렇게 나온다.

```
error: use of deleted function 'W::W(const W&)'
```

`private + delete` (또는 그냥 private)의 경우는 이렇다.

```
error: 'W::W(const W&)' is private within this context
note: declared here ...
```

전자가 "삭제됨"이 즉시 보여 더 명확하다.

## `= delete`가 더 강력한 이유 — 비-멤버 함수에도 적용

`private` 트릭은 **멤버 함수만** 가능하다. 비-멤버 함수에는 적용할 수 없다.

`= delete`는 비-멤버에도 OK다.

```cpp
bool isLucky(int);                    // 일반 — int OK
bool isLucky(char) = delete;          // char로 호출 차단
bool isLucky(bool) = delete;          // bool 차단
bool isLucky(double) = delete;        // double 차단 (float 포함 — 가까운 후보)

isLucky(7);     // OK
isLucky('a');   // 에러: deleted
isLucky(true);  // 에러: deleted
isLucky(3.5f);  // 에러: float → double 변환 후 deleted
```

이건 **암묵적 변환을 선택적으로 막는** 패턴이다. 표준 라이브러리도 활용한다.

### 표준 라이브러리 예 — `std::async`의 변형

여러 표준 함수가 특정 타입 변환을 명시적으로 차단하는 데 `= delete`를 쓴다.

## `= delete`가 더 강력한 이유 — 템플릿 인스턴스 차단

특정 타입에 대해서만 템플릿 인스턴스화를 막을 수 있다.

```cpp
template<typename T>
void processPointer(T* ptr);

template<>
void processPointer<void>(void*) = delete;       // void* 차단
template<>
void processPointer<char>(char*) = delete;       // char* 차단 (C string 의도라면 별 함수)
template<>
void processPointer<const void>(const void*) = delete;
template<>
void processPointer<const char>(const char*) = delete;

processPointer<int>(p);    // OK
processPointer<void>(p);   // 에러
processPointer<char>(p);   // 에러
```

`private` 멤버 트릭은 **템플릿 특수화에 적용 불가**다. 특수화는 base 클래스 접근 권한과 무관하다.

### 멤버 함수 템플릿 안에서

```cpp
class Widget {
public:
    template<typename T>
    void processPointer(T* ptr) { /* ... */ }
};

// void* 차단을 클래스 안에서 시도? — private은 안 됨
template<>
void Widget::processPointer<void>(void*) = delete;   // ✅ delete는 OK
```

멤버 템플릿의 특수화는 클래스 외부에 두지만, `delete`로 차단할 수 있다.

## 다른 활용 — 복사·이동 한쪽만 막기

```cpp
class W {
public:
    W();

    // 복사 금지, 이동 OK
    W(const W&) = delete;
    W& operator=(const W&) = delete;
    W(W&&) = default;
    W& operator=(W&&) = default;
};
```

`unique_ptr`가 정확히 이 패턴이다. copy를 차단하고 move를 허용한다.

## 함정 — `delete`와 자동 생성

```cpp
class W {
public:
    W(const W&) = delete;   // copy 명시적 삭제
};

// W의 move constructor: 사용자가 copy를 정의했으니 자동 생성 안 됨
                          // (= delete도 "사용자 정의"로 간주)

W a;
W b = std::move(a);   // 에러? — 자동 move 없음
```

`= delete`도 사용자 정의로 카운트된다. 자동 move 생성이 차단된다.

해결책은 move도 명시하는 것이다.

```cpp
class W {
public:
    W(const W&) = delete;
    W(W&&) = default;        // 명시
    W& operator=(W&&) = default;
};
```

자세한 건 [항목 17 (특수 멤버 자동 생성)](/blog/programming/cpp/effective-modern-cpp/item17-understand-special-member-function-generation)에서 다룬다.

## 마이그레이션 — `private` 트릭 → `= delete`

```cpp
// 옛날
class W {
private:
    W(const W&);
    W& operator=(const W&);
};

// 모던
class W {
public:
    W(const W&)            = delete;
    W& operator=(const W&) = delete;
};
```

거의 항상 안전한 변환이다. 외부 동작은 동일하고, 에러 시점이 빨라진다.

## 비교 — 한눈에

| 측면 | private + 미정의 | `= delete` |
| --- | --- | --- |
| 외부 호출 차단 | ✅ | ✅ |
| 멤버/친구 호출 차단 | 링크 시점 (느림) | **컴파일 시점** ✅ |
| 비-멤버 함수 차단 | ❌ | ✅ |
| 템플릿 특수화 차단 | ❌ | ✅ |
| 에러 메시지 명확성 | private/링크 모호 | "deleted" 명확 |
| `public`으로 선언 | — | ✅ 권장 |

## 핵심 정리

1. `= delete`는 **컴파일 타임** 에러를 낸다. `private` 미정의는 링크 시점이다.
2. **`public`으로 선언**한다. 에러 메시지가 "deleted"로 명확하게 나온다.
3. **비-멤버 함수**, **템플릿 특수화**에도 적용할 수 있다.
4. 특정 변환 차단 (`isLucky(int)`만 OK 등)에도 활용한다.
5. C++11 이상이면 `= delete`가 항상 우선이다.

## 관련 항목

- [항목 10: 범위 있는 enum을 선호하라](/blog/programming/cpp/effective-modern-cpp/item10-prefer-scoped-enums-to-unscoped-enums) — 안전한 타입 선언
- [항목 17: 특수 멤버 자동 생성](/blog/programming/cpp/effective-modern-cpp/item17-understand-special-member-function-generation) — copy를 delete하면 move도 영향
- [Effective C++ item 6](/blog/programming/cpp/effective-cpp/item06-explicitly-disallow-compiler-generated-functions) — 같은 주제의 C++98 시점
