---
title: "항목 32: 객체를 클로저로 이동시키려면 init capture를 사용하라"
date: 2025-01-06T08:00:00
description: "C++14 init capture로 move-only 객체를 람다에 — C++11 우회법까지."
tags: [C++, Lambda, Move Semantics, Modern C++]
series: "Effective Modern C++"
seriesOrder: 32
draft: true
---

## 왜 이 항목이 중요한가?

`std::unique_ptr`을 람다에 넣고 싶을 때가 있다. 비동기 작업의 결과를 콜백에 전달하거나, 자원을 람다와 함께 다른 스레드로 옮길 때다.

문제는 C++11 람다 캡처가 **copy 또는 reference만 지원**한다는 점이다. `unique_ptr` 같은 move-only 객체는 직접 캡처할 방법이 없다. 참조로 캡처하면 외부 변수 수명에 의존해 댕글링이 위험하다.

C++14의 **init capture** 문법이 이 문제를 푼다. `[name = std::move(x)]` 형태로 임의 표현식 결과를 클로저에 저장한다. 이 항목은 그 사용법과 C++11에서의 우회법(직접 함수 객체, `std::bind`)을 정리한다.

## 개요

C++11 람다는 **값 캡처(`[x]`)나 참조 캡처(`[&x]`)** 만 가능하다. `std::unique_ptr` 같은 **move-only 객체**를 클로저에 못 넣는다. C++14의 **init capture** 문법이 해결한다.

## 필수 개념: 람다 캡처의 한계 (C++11)

> **초보자를 위한 배경 지식**

<br>

### C++11 캡처 — 두 종류

```cpp
int x = 10;

[x]() {};      // 값 복사 — copy ctor
[&x]() {};     // 참조
```

**copy 가능 객체만** 된다. `unique_ptr` 같은 move-only는 안 된다.

```cpp
auto pw = std::make_unique<Widget>();

[pw]() { pw->doIt(); };       // 에러! unique_ptr는 copy 불가
[&pw]() { pw->doIt(); };      // OK이지만 람다가 pw에 의존 (수명 함정)
```

**이동시켜 클로저에 넣고 싶지만** C++11엔 직접 표현할 방법이 없다.

## C++14 init capture — 해결

```cpp
[name = expression](...) { ... }
```

표현식의 결과를 새 캡처 변수 `name`에 저장한다. 좌변은 **클로저 안의 새 변수**, 우변은 **바깥 스코프의 표현식**이다.

```cpp
auto pw = std::make_unique<Widget>();

auto func = [pw = std::move(pw)] {   // 새 캡처 pw에 std::move(pw) 저장
    pw->doSomething();
};
```

좌변 `pw`는 클로저 안의 새 변수, 우변 `pw`는 바깥 unique_ptr다.

## 임시 객체 직접 캡처

```cpp
auto func = [pw = std::make_unique<Widget>()] {   // 람다 안에서 만든 효과
    pw->doSomething();
};
```

람다가 자기 자원을 보유한다. 외부 의존이 없다.

## init capture 다양한 활용

### 멤버 값 복사 (this 회피)

[항목 31](/blog/programming/cpp/effective-modern-cpp/item31-avoid-default-capture-modes)에서 본 패턴이다.

```cpp
class Widget {
    int divisor;
public:
    auto makeFilter() const {
        return [d = divisor](int v) { return v % d == 0; };
        //      ↑ 멤버 값 복사 — this 캡처 X
    }
};
```

### 계산 결과 캡처

```cpp
auto func = [result = expensiveCompute()] {
    use(result);   // 한 번만 계산
};
```

### perfect forwarding 캡처

```cpp
template<typename T>
auto delayed(T&& x) {
    return [x = std::forward<T>(x)]() {   // 카테고리 보존 캡처
        use(x);
    };
}
```

## C++11 우회법 1 — 직접 함수 객체

람다가 하는 일을 손으로 풀어서 작성한다.

```cpp
class IsValAndArch {
    std::unique_ptr<Widget> pw;
public:
    explicit IsValAndArch(std::unique_ptr<Widget>&& w)
        : pw(std::move(w)) {}

    bool operator()() const { return pw->isValidated(); }
};

auto func = IsValAndArch(std::make_unique<Widget>());
```

길지만 명확하다. C++11에서 가능하다.

## C++11 우회법 2 — `std::bind`

```cpp
auto func = std::bind(
    [](const std::unique_ptr<Widget>& pw) {   // 람다는 const&로 받음
        return pw->isValidated();
    },
    std::make_unique<Widget>()                  // bind가 임시를 보유
);
```

`std::bind`가 인자를 자기 클로저에 보관한다. move-only 객체도 OK다.

단점은 이렇다.

- `bind`의 단점이 있다 ([항목 34](/blog/programming/cpp/effective-modern-cpp/item34-prefer-lambdas-to-std-bind)). 가독성, 디버깅 문제.
- C++14 init capture가 모두 우월하다.

## C++11 vs C++14

| 기능 | C++11 | C++14 |
| --- | --- | --- |
| 값 캡처 | ✅ | ✅ |
| 참조 캡처 | ✅ | ✅ |
| 임의 표현식 캡처 | ❌ | ✅ (init capture) |
| move 캡처 | 우회 (bind, 함수 객체) | ✅ 자연 |
| generic lambda (`auto` 매개변수) | ❌ | ✅ |

## generic lambda + init capture — 강력한 조합

```cpp
auto func = [data = std::vector<int>{1, 2, 3}](auto x) {
    return std::find(data.begin(), data.end(), x) != data.end();
};

func(2);     // true
func("a");   // 컴파일 에러 (find 인자 타입 불일치)
```

## 함정 — init capture는 ctor 호출

```cpp
struct Heavy {
    Heavy() { std::cout << "Heavy ctor\n"; }
};

auto f = [h = Heavy{}] { /* ... */ };   // ✅ Heavy ctor 한 번 (람다 정의 시)

f();    // ctor 호출 X
f();    // ctor 호출 X
```

람다 **정의 시점**에 캡처 표현식이 평가된다. 호출마다 평가되지 않는다.

## init capture와 함수 시그니처

람다는 익명 클래스라 **타입을 직접 적을 수 없다**. `auto` 또는 `std::function`만 쓸 수 있다.

```cpp
auto f = [pw = std::make_unique<Widget>()] { /* ... */ };

std::function<void()> sf = std::move(f);   // OK — function이 받음
                                            // (std::function은 move 가능)
```

## 비교 — 캡처 패턴 한눈에

| 캡처 | 문법 | 예 |
| --- | --- | --- |
| 값 | `[x]` | 단순 복사 |
| 참조 | `[&x]` | 외부 객체 직접 사용 |
| init (C++14) | `[name = expr]` | 임의 표현식 |
| init move | `[x = std::move(x)]` | move-only |
| init forward | `[x = std::forward<T>(x)]` | 카테고리 보존 |
| `[*this]` (C++17) | 객체 복사 | 멤버 함수에서 안전 |

## 핵심 정리

1. **C++14 init capture**: `[name = expr]`로 임의 표현식 결과를 클로저에 저장한다.
2. **move-only 객체** (`unique_ptr` 등)도 람다에 넣을 수 있다.
3. C++11에선 **직접 함수 객체** 또는 **`std::bind`** 로 우회한다.
4. 임시 객체 직접 생성, perfect forwarding 모두 가능하다.
5. 람다 **정의 시점**에 캡처 표현식이 평가된다 (호출마다 평가되지 않는다).

## 관련 항목

- [항목 31: 기본 캡처 모드](/blog/programming/cpp/effective-modern-cpp/item31-avoid-default-capture-modes)
- [항목 33: decltype + forward](/blog/programming/cpp/effective-modern-cpp/item33-use-decltype-on-auto-parameters-when-forwarding)
- [항목 34: 람다 vs bind](/blog/programming/cpp/effective-modern-cpp/item34-prefer-lambdas-to-std-bind)
