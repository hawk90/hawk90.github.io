---
title: "항목 34: std::bind보다 람다를 선호하라"
date: 2025-01-06T10:00:00
description: "C++14+ 람다가 거의 항상 우월 — 가독성·평가 시점·오버로드·인라이닝·디버깅."
tags: [C++, Lambda, std::bind, Modern C++]
series: "Effective Modern C++"
seriesOrder: 34
draft: true
---

## 왜 이 항목이 중요한가?

C++11 이전에 `std::bind`(원래 `boost::bind`)는 클로저를 만드는 유일한 표준 도구였다. 그런데 C++11 람다가 등장하고 C++14에서 제네릭 람다와 init capture가 추가되면서, `bind`는 거의 모든 자리에서 람다에 밀린다.

이 항목은 다섯 가지 측면에서 람다가 우월한 이유를 정리한다.

- **가독성** — placeholder(`_1`, `_2`)와 인자 순서가 헷갈리는 bind vs 호출 형태가 그대로 보이는 람다.
- **평가 시점** — bind는 인자가 즉시 평가되고 람다는 호출 시점에 평가된다.
- **오버로드 처리** — bind는 캐스팅이 필요하고 람다는 자연스럽다.
- **인라이닝** — 람다는 컴파일러가 본문을 직접 본다.
- **디버깅** — bind는 내부 구현 안으로 들어가야 한다.

C++14+ 환경에선 새 코드에 `bind`를 쓸 이유가 거의 없다.

## 개요

C++11 이전에 `std::bind`(원래 `boost::bind`)가 클로저를 만드는 표준 도구였지만, C++14 람다(특히 제네릭 람다)가 등장한 후로는 거의 항상 람다가 우월하다.

## 필수 개념: std::bind

> **초보자를 위한 배경 지식**

<br>

### bind란

함수 + 일부 인자를 묶어 새 호출 가능 객체를 만든다.

```cpp
#include <functional>
using namespace std::placeholders;

void greet(const std::string& name, int age) {
    std::cout << "Hi " << name << ", age " << age << '\n';
}

auto greetAlice = std::bind(greet, "Alice", _1);   // _1은 "첫 번째 인자"
greetAlice(30);   // "Hi Alice, age 30"
```

`_1`, `_2`, ... 는 placeholder다.

`functools.partial` (Python)와 비슷하다.

## 1. 가독성 — 람다가 압도

### bind 사용

```cpp
auto setSoundB = std::bind(setAlarm, _1,
                           std::chrono::steady_clock::now() + 1h,
                           1s);
```

placeholder, 인자 순서, 타입 모두 헷갈린다.

### 람다 사용

```cpp
auto setSoundL = [](Sound s) {
    setAlarm(s, std::chrono::steady_clock::now() + 1h, 1s);
};
```

람다는 호출 형태가 그대로 보인다. `setAlarm`이 어떻게 불릴지 즉시 파악된다.

## 2. 평가 시점 — 명확성

### bind — 인자가 즉시 평가

```cpp
auto bad = std::bind(setAlarm, _1,
                     std::chrono::steady_clock::now() + 1h, 1s);
//                   ↑ bind 호출 시점에 now() 한 번만 평가
```

1시간 후 알람? bind 호출 시점 + 1시간이다. 호출자가 매번 호출할 때 + 1시간이 아니다.

### 람다 — 인자가 호출 시점 평가

```cpp
auto good = [](Sound s) {
    setAlarm(s, std::chrono::steady_clock::now() + 1h, 1s);
//          ↑ 람다 호출 때마다 now() 평가
};
```

명확한 의도다. 매번 "지금 + 1시간"이다.

bind에서 같은 동작을 원하면 이렇게 된다.

```cpp
auto better = std::bind(setAlarm, _1,
                        std::bind(plus<>{},
                                  std::bind(steady_clock::now),
                                  1h),
                        1s);
```

읽기 어렵다. 람다가 압도한다.

## 3. 오버로드 처리

### bind — 어떤 오버로드?

```cpp
void setAlarm(Sound, Time, Duration);
void setAlarm(Sound, Time, Duration, Volume);   // 오버로드 추가

auto f = std::bind(setAlarm, ...);   // 어느 오버로드?
                                      // → 컴파일 에러
```

bind는 함수 이름만 받아 오버로드 해석이 불가하다.

해결책은 명시적 캐스팅이다.

```cpp
using SetAlarm3 = void(*)(Sound, Time, Duration);
auto f = std::bind(static_cast<SetAlarm3>(setAlarm), ...);
```

### 람다 — 호출 시점에 결정

```cpp
auto f = [](Sound s) {
    setAlarm(s, ...);   // 호출 시점에 오버로드 해석 — 자연스러움
};
```

람다는 일반 함수 호출이다. 오버로드 해석이 평소처럼 된다.

## 4. 인라이닝 / 성능

람다는 컴파일러가 본문을 직접 보고 **인라이닝이 가능**하다.

bind는 함수 포인터/멤버 포인터를 통한 **간접 호출**이 발생할 수 있어 인라이닝이 어렵다. 성능이 떨어질 가능성이 있다.

## 5. 디버깅

람다 본문은 평범한 함수 본문이다. 디버거에서 step-into가 가능하다.

bind는 내부 구현 안으로 들어가서 디버깅이 어렵다. 매개변수 검사도 placeholder 트릭으로 복잡하다.

## bind가 여전히 유용한 경우

### C++11 — move-only 캡처

C++14 init capture 이전엔 람다로 move-only 객체 캡처가 안 됐다.

```cpp
// C++11
auto f = std::bind(
    [](const std::unique_ptr<Widget>& pw) { pw->doIt(); },
    std::make_unique<Widget>()
);
```

bind가 인자(unique_ptr)를 자기 클로저에 보관한다. move가 가능하다.

C++14+에선 init capture로 대체된다 ([항목 32](/blog/programming/cpp/effective-modern-cpp/item32-use-init-capture-to-move-objects-into-closures)).

```cpp
auto f = [pw = std::make_unique<Widget>()] { pw->doIt(); };
```

### 일부 명시적 polymorphism

bind의 결과는 `auto`로 받지만 실제 타입은 `bind_t`다. `std::function`으로 wrap이 가능하다. 사이즈가 정해진 type-erased 객체다.

```cpp
std::function<void(int)> f = std::bind(...);
```

람다도 같다. 그러나 람다 클로저는 모두 다른 타입이다.

별 차이가 없다.

## 비교 — 한눈에

| 기준 | bind | lambda |
| --- | --- | --- |
| 가독성 | ❌ placeholder | ✅ 자연 |
| 평가 시점 | 즉시 (인자) | 호출 시점 (의도된) |
| 오버로드 처리 | ❌ 캐스팅 필요 | ✅ 자연 |
| 인라이닝 | ⚠️ 어려울 수도 | ✅ 가능 |
| 디버깅 | ❌ | ✅ |
| move-only 캡처 (C++11) | ✅ | ❌ |
| move-only 캡처 (C++14+) | ✅ | ✅ (init capture) |
| 권장 | C++11 + move-only 외 | 거의 항상 |

## 권장

- **C++14+ 환경에선 람다가 거의 항상 우월**하다.
- **C++11 + move-only 캡처**만 bind를 고려한다.
- 새 코드에서 `std::bind`를 보면 람다로 리팩토링을 검토한다.

## 마이그레이션

```cpp
// bind
auto f = std::bind(func, _1, "arg");
                                ↓
// lambda
auto f = [](auto x) { func(x, "arg"); };
```

대부분 1대1 변환이 가능하다.

## 핵심 정리

1. **C++14+ 환경에선 람다가 `bind`보다 거의 항상 우월**하다.
2. **가독성, 평가 시점, 오버로드 처리, 인라이닝, 디버깅** 모두 람다가 우위다.
3. `bind`는 C++11에서 **move-only 캡처** 등 일부 특수 용도만 의미가 있다.
4. C++14 init capture가 그 마지막 케이스도 대체한다.
5. 새 코드에서 `bind`를 발견하면 **람다로 리팩토링**을 검토한다.

## 관련 항목

- [항목 31: 기본 캡처 모드](/blog/programming/cpp/effective-modern-cpp/item31-avoid-default-capture-modes)
- [항목 32: init capture](/blog/programming/cpp/effective-modern-cpp/item32-use-init-capture-to-move-objects-into-closures)
- [항목 33: decltype + forward](/blog/programming/cpp/effective-modern-cpp/item33-use-decltype-on-auto-parameters-when-forwarding)
