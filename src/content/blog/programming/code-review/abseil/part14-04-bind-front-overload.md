---
title: "absl::bind_front와 Overload — 함수 객체 보조 도구"
date: 2026-06-13T09:08:00
description: "absl::bind_front — std::bind의 후속, 정적 분석 친화. absl::Overload — variant visitor 작성을 줄이는 도우미."
series: "Abseil Code Review"
seriesOrder: 72
tags: [cpp, abseil, bind-front, overload, variant]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## 한 줄 요약

`absl::bind_front`는 *맨 앞 매개변수만* 묶는 단순 binder다. `std::bind`의 placeholder 지옥과 implicit ref decay 문제를 피하고 lambda보다 짧다. `absl::Overload`는 `std::variant` visitor를 *람다 여러 개*로 한 줄에 적게 해 주는 helper다.

## 동기

함수 객체 합성에는 세 가지 표준 방법이 있다.

```cpp
struct Adder { int Add(int a, int b) { return a + b; } };
Adder ad;

// 1. std::bind — placeholder, 복잡
auto f1 = std::bind(&Adder::Add, &ad, 10, std::placeholders::_1);

// 2. lambda — 명시적이지만 길다
auto f2 = [&ad](int x) { return ad.Add(10, x); };

// 3. absl::bind_front — 깔끔
auto f3 = absl::bind_front(&Adder::Add, &ad, 10);
```

`std::bind`는 다음 문제로 EMC++ Item 34에서 회피 권장이다.

- placeholder가 *위치* 기반이라 복잡.
- 인자가 implicit `std::ref`/value로 결정 — 직관 어긋남.
- error 메시지가 template 폭증.

`bind_front`는 *앞에서부터 순차 binding*만 지원해 의미를 단순화한다. C++20에 `std::bind_front`가 들어왔고 Abseil 버전은 그 polyfill이다.

## bind_front — API와 사용법

```cpp
#include "absl/functional/bind_front.h"

// 멤버 함수 + this
auto handler = absl::bind_front(&Worker::Run, &worker);
handler(arg1, arg2);  // == worker.Run(arg1, arg2)

// 일반 함수 + 앞 인자 일부
int Sub(int a, int b) { return a - b; }
auto sub10 = absl::bind_front(Sub, 10);
sub10(3);  // 7

// pointer to data member
struct P { int x; };
auto get_x = absl::bind_front(&P::x);
P p{42};
get_x(p);  // 42
```

`std::bind`와 달리 placeholder를 쓰지 않는다. 묶지 않은 인자는 그 자리 그대로 호출 시점에 전달된다.

### lambda보다 좋은 점

```cpp
// lambda
auto f = [obj = std::move(obj)](Arg a) { return obj.Do(a); };

// bind_front
auto f = absl::bind_front(&Obj::Do, std::move(obj));
```

후자가 더 짧고 *컴파일 시간*도 약간 빠르다. 정적 분석기가 인자 타입을 자동 추론하기 좋다.

### 내부 구현 (요약)

```cpp
namespace absl {

template <typename F, typename... BoundArgs>
constexpr auto bind_front(F&& f, BoundArgs&&... args) {
  return functional_internal::bind_front_t<
      std::decay_t<F>, std::decay_t<BoundArgs>...>(
      std::forward<F>(f), std::forward<BoundArgs>(args)...);
}

// bind_front_t는 INVOKE(f, args..., CallArgs...) 형태로 호출
}
```

placeholder가 없으므로 *bound args + call args*가 자연스럽게 concatenate. invoke 시 `std::invoke`를 그대로 사용.

### bind_front vs std::bind 비교

| 항목 | std::bind | absl::bind_front (C++20 표준) |
|---|---|---|
| placeholder | `_1`, `_2`, ... | 없음 |
| 인자 순서 변경 | 가능 | 불가 (앞부터만) |
| `std::ref` 자동 처리 | × (사용자 명시) | × (사용자 명시) |
| nested bind 평탄화 | O (헷갈림) | × |
| 권장 (EMC++ Item 34) | 회피 | 권장 |

## Overload — variant visitor 도우미

`std::visit`는 callable 하나가 모든 alternative를 처리해야 한다. 보통 lambda 여러 개를 묶기 위해 [overload trick](https://en.cppreference.com/w/cpp/utility/variant/visit)을 쓴다.

```cpp
// C++17 overload trick
template <typename... Ts>
struct overload : Ts... { using Ts::operator()...; };
template <typename... Ts>
overload(Ts...) -> overload<Ts...>;

std::variant<int, std::string, double> v = "hi";
std::visit(overload{
    [](int i)               { LOG(INFO) << "int " << i; },
    [](const std::string& s){ LOG(INFO) << "str " << s; },
    [](double d)            { LOG(INFO) << "dbl " << d; },
}, v);
```

이 boilerplate를 Abseil이 제공한다.

```cpp
#include "absl/functional/overload.h"

std::variant<int, std::string, double> v = "hi";
std::visit(absl::Overload{
    [](int i)               { LOG(INFO) << "int " << i; },
    [](const std::string& s){ LOG(INFO) << "str " << s; },
    [](double d)            { LOG(INFO) << "dbl " << d; },
}, v);
```

매번 trick struct를 직접 정의할 필요가 없다.

### 내부 구현

```cpp
namespace absl {

template <typename... T>
class Overload : public T... {
 public:
  explicit Overload(T... ts) : T(std::move(ts))... {}
  using T::operator()...;
};

template <typename... T>
Overload(T...) -> Overload<T...>;

}  // namespace absl
```

`Ts...`를 base로 다중 상속하고 `using` 선언으로 `operator()`를 한 layer에 모은다. CTAD로 호출 측에서 template 인자 명시가 필요 없다.

### 핵심 활용 — exhaustive matching

```cpp
using Event = std::variant<LoginEvent, ClickEvent, ErrorEvent>;

void Handle(const Event& e) {
  std::visit(absl::Overload{
      [](const LoginEvent& l) { ... },
      [](const ClickEvent& c) { ... },
      [](const ErrorEvent& e) { ... },
  }, e);
}
```

모든 alternative에 대응하는 lambda를 적지 않으면 *컴파일 에러*. 새 alternative가 추가될 때 모든 visitor가 깨지므로 컴파일러가 누락을 잡아 준다. switch + enum 패턴의 가장 큰 약점(누락)을 막는다.

### default fall-through

모든 case를 다 적기 싫을 때 generic lambda를 마지막에 둔다.

```cpp
std::visit(absl::Overload{
    [](const LoginEvent& l) { /* 처리 */ },
    [](const auto&)         { /* 그 외 */ },
}, e);
```

단, *exhaustive matching의 안전망이 사라진다*는 점을 인지하고 쓴다.

## std / Folly와의 비교

| 항목 | std::bind | absl::bind_front | std::bind_front (C++20) |
|---|---|---|---|
| 표준 | C++11 | — | C++20 |
| placeholder | O | × | × |
| 권장 | 회피 | 권장 | 권장 |

| 항목 | overload trick | absl::Overload | std::overload (제안) |
|---|---|---|---|
| 표준 | C++17 | — | (검토 단계) |
| boilerplate | 사용자 정의 필요 | 라이브러리 제공 | — |

folly에는 `folly::partial`이 유사한 역할을 한다. 인자 capture 방식 차이가 있어 직접 호환은 안 된다.

## 코드 리뷰 포인트

**1. std::bind 발견 → bind_front 또는 lambda**

```cpp
// 회피
auto h = std::bind(&Worker::Run, &w, std::placeholders::_1, 42);

// Good 1 — bind_front (앞부터 묶음)
auto h = absl::bind_front(&Worker::Run, &w);  // 두 번째 42는 풀어둠
h(arg, 42);

// Good 2 — lambda (가독성 최우선)
auto h = [&w](Arg a) { return w.Run(a, 42); };
```

`std::bind`는 C++20 이후 *사실상 deprecated*에 가깝다.

**2. variant 분기 → switch보다 Overload**

```cpp
// 회피 — index() 분기
switch (v.index()) {
  case 0: HandleInt(std::get<0>(v)); break;
  case 1: HandleStr(std::get<1>(v)); break;
}

// Good — exhaustive 보장
std::visit(absl::Overload{
    [](int i)               { HandleInt(i); },
    [](const std::string& s){ HandleStr(s); },
}, v);
```

`index()` 분기는 새 alternative 추가 시 누락을 잡지 못한다.

**3. bind_front + AnyInvocable 조합**

```cpp
absl::AnyInvocable<void(int)> cb =
    absl::bind_front(&Service::OnEvent, service);
```

bound state는 `AnyInvocable` 안에 통째로 들어간다. SBO 안에 들어가는 크기에 주의.

## 자주 보는 안티패턴

**bind_front로 placeholder 흉내**

```cpp
// 회피 — 의도와 다르게 동작
auto f = absl::bind_front(Sub, 10);   // f(x) → Sub(10, x)
auto g = absl::bind_front(Sub, _, 10); // ❌ placeholder 미지원
```

뒤 인자를 묶고 싶으면 lambda. `absl::bind_back`은 C++23 `std::bind_back`까지 표준에 없다.

**Overload에 캡처 ref가 살아남지 못함**

```cpp
auto Visit() {
  std::string greeting = "hi";
  return absl::Overload{
      [&](int) { LOG(INFO) << greeting; },  // greeting dangling
      [&](auto) { LOG(INFO) << "other"; },
  };
}
```

visitor를 반환할 때는 캡처 by value.

## 정리

- `absl::bind_front`는 *앞부터 순차 binding*만 지원하는 단순 binder.
- `std::bind`의 placeholder·implicit ref 문제를 해결.
- `absl::Overload`는 variant visitor를 lambda 여러 개로 한 자리에 합치는 helper.
- exhaustive matching이 컴파일러로 보장됨.
- 둘 다 lambda·다중 상속 trick을 *표준화된 형태*로 제공.

## 다음 편

Part 15에서는 분산 시스템용 대용량 문자열 `absl::Cord`와 charconv 계열을 본다. [Part 15-01 — Cord](/blog/programming/code-review/abseil/part15-01-cord).

## 관련 항목

- [Part 15-01 — Cord](/blog/programming/code-review/abseil/part15-01-cord)
- [Part 14-03 — function_ref / any_invocable](/blog/programming/code-review/abseil/part14-03-function-ref-any-invocable)
- [Part 9-04 — absl::variant](/blog/programming/code-review/abseil/part9-04-variant)
- [EMC++ Item 34 — std::bind 회피](/blog/programming/cpp/effective-modern-cpp/item34-prefer-lambdas-to-std-bind)
- Folly Part 4-04 — Partial
