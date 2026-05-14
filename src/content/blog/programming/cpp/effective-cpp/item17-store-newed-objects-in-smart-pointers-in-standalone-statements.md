---
title: "항목 17: new로 만든 객체는 독립 문장에서 스마트 포인터에 담아라"
date: 2025-02-01T17:00:00
description: "함수 인자 평가 순서 함정과 자원 누수 방지 — C++17에서 완화됐지만 make_* 사용이 정답."
tags: [C++, Effective C++, Smart Pointer, Exception Safety]
series: "Effective C++"
seriesOrder: 17
draft: true
---

## 왜 이 항목이 중요한가?

`f(std::shared_ptr<Widget>(new Widget), computePriority())` — 이 한 줄이 자원 누수의 고전적 패턴이다. 함수 인자 평가 순서가 미지정이라, `new Widget`이 실행된 후 `computePriority()`가 예외를 던지면 raw pointer가 shared_ptr에 wrap되기 전에 누수된다.

C++17부터 같은 인자 안의 부속 표현식 인터리브가 금지되어 위 패턴이 안전해졌다. 다만 인자 간 평가 순서는 여전히 미지정이고, 가독성·효율 측면에서도 **`make_*` 사용이 모든 시대에 정답**이다.

이 항목은 그 함정과, smart pointer 도입이 자원 누수를 어떻게 막는지를 정리한다.

## 개요

`new`로 만든 raw 포인터를 같은 함수 호출의 다른 인자와 한 문장에 섞어 쓰면, **C++14 이전**엔 평가 순서가 미지정이어서 자원 누수가 일어날 수 있었다. C++17 이후 일부 완화됐지만, **`make_unique`/`make_shared` 사용**이 모든 시대에 안전하고 우아한 답이다.

## 필수 개념: 함수 인자 평가 순서

> **초보자를 위한 배경 지식**

<br>

C++14 이전 표준은 함수 호출의 인자들이 **어떤 순서로 평가되는지 정하지 않았습니다** — 컴파일러 마음대로.

```cpp
f(g(), h(), k());
// g, h, k가 어떤 순서로든 호출 가능
// 같은 컴파일러도 최적화 옵션에 따라 다를 수 있음
```

각 인자 안의 부속 표현식들도 **인터리브**될 수 있었음 — 한 인자의 일부, 다른 인자의 일부, 다시 첫 인자의 나머지 식으로.

C++17부터 — 인자 사이는 여전히 미지정이지만 **한 인자의 부속 표현식은 인터리브 안 됨**. C++20에서 추가 강화.

## 함정 (C++14 이전)

```cpp
int priority();
void processWidget(std::shared_ptr<Widget> p, int priority);

processWidget(std::shared_ptr<Widget>(new Widget), priority());
```

이 한 줄 안에 세 가지 동작이 일어남:
1. `new Widget` — raw pointer 생성
2. `std::shared_ptr<Widget>(...)` — wrapping
3. `priority()` 호출

C++14 이전 컴파일러는 이 순서를 자유롭게 재배열. 가능한 순서:

```
순서 A:                          순서 B:
1) priority()                    1) new Widget       ← raw pointer 생성
2) new Widget                    2) priority()       ← 여기서 예외!
3) shared_ptr 생성                3) shared_ptr 생성 (도달 못 함)
```

**순서 B에서 `priority()`가 예외를 던지면**:
- raw pointer는 이미 생성됨
- `shared_ptr` 생성은 시작 안 됨
- 어떤 객체도 raw pointer를 소유하지 않음 → **누수**

## 해결 1 — 독립 문장으로 분리

```cpp
std::shared_ptr<Widget> p(new Widget);    // 독립 문장
processWidget(p, priority());              // 두 번째 문장
```

`new`와 wrapping이 한 문장에 끝나면 — 어떤 예외도 그 사이에 끼어들 수 없음. `priority()`가 던져도 `p`의 소멸자가 자원 정리.

## 해결 2 (권장) — `std::make_shared` / `std::make_unique`

```cpp
processWidget(std::make_shared<Widget>(), priority());
```

`make_shared`는 **단일 함수 호출** — 평가 순서 모호함 자체가 없음. 추가로:

| 측면 | `new` + `shared_ptr` | `make_shared` |
| --- | --- | --- |
| 평가 순서 | 모호 (C++14-) | 명확 |
| 메모리 할당 횟수 | 2 (object + control block) | 1 (한 번에) |
| 캐시 효율 | 두 메모리 영역 | 같은 캐시 라인 |
| 코드 길이 | `new T(...)` 명시 | 인자만 |

`make_unique`(C++14+):

```cpp
auto p = std::make_unique<Widget>(arg1, arg2);
processWidget(std::move(p), priority());     // unique이므로 move
```

`unique_ptr`는 복사 불가 — 함수에 넘길 땐 `std::move`. 또는 함수 안에서 직접 생성:

```cpp
processWidget(std::make_unique<Widget>(), priority());
```

## C++17의 완화 — 그러나 여전히 make_* 권장

C++17은 함수 인자 안의 부속 표현식이 **non-interleaved**로 평가되도록 보장. 즉:

```cpp
processWidget(std::shared_ptr<Widget>(new Widget), priority());
```

이 코드도 C++17부터는 안전 — `new Widget` 직후 `shared_ptr` 생성이 보장됨. **그러나** 인자들 사이의 순서는 여전히 미지정.

그래도 `make_*`가 권장되는 이유:
1. **모든 표준 버전에서 안전** — C++11부터 일관
2. **메모리 할당 효율** — shared_ptr는 한 번의 할당
3. **타이핑 절약** — 타입 두 번 안 적음
4. **컴파일 에러 메시지** — 인자 불일치가 더 명확

## `make_*`의 예외 — custom deleter

```cpp
auto deleter = [](Widget* w) { /* 특수 정리 */ };

// make_*는 custom deleter 지원 X
auto p = std::unique_ptr<Widget, decltype(deleter)>(new Widget, deleter);
```

custom deleter가 필요하면 `new` + 명시적 wrapping. 이 경우 독립 문장 패턴 사용.

`shared_ptr`는 생성자에서 deleter 받지만, `make_shared`로는 지정 불가. C++20 `std::allocate_shared`로 일부 보완.

## `make_shared`의 약한 단점 — 메모리 라이프타임

`make_shared`는 객체와 control block을 **하나의 메모리 블록**에 할당:

```
make_shared<T>:
┌────────────────────────────┬─────────┐
│ control block (refs, dels) │    T    │
└────────────────────────────┴─────────┘

new + shared_ptr<T>:
┌────────────────────────────┐
│ control block              │
└────────────────────────────┘
┌─────────┐
│    T    │
└─────────┘
```

`shared_ptr`의 마지막 참조가 없어져도 `weak_ptr`가 살아 있으면 **control block은 유지** — `make_shared`의 경우 객체 메모리도 함께 유지. `weak_ptr` 라이프타임이 매우 길고 객체가 크면 메모리 lingering 가능.

이 경우 `new` + `shared_ptr`로 두 메모리 분리 — 객체는 즉시 해제, control block만 weak이 들고 있음. EMC++ item 21 참고.

## 더 깊은 함정 — 원시 객체 누수의 다른 패턴

```cpp
void f(std::unique_ptr<A>, std::unique_ptr<B>);

f(std::unique_ptr<A>(new A), std::unique_ptr<B>(new B));
// C++14-: 평가 순서에 따라 누수 가능
// (new A → new B → 두 unique_ptr 중 첫 번째 생성하다 예외 → 다른 raw 누수)
```

해결:

```cpp
f(std::make_unique<A>(), std::make_unique<B>());   // ✅ 항상 안전
```

여러 인자에 `new`를 섞을 때 `make_*` 패턴의 가치가 더 분명.

## 실무 가이드 — 규칙

1. **항상 `make_shared` / `make_unique` 사용**(custom deleter 등 예외 제외)
2. `new` + 명시 wrapping이 필요하면 **독립 문장**에 분리
3. 같은 호출에 raw `new` 결과 + 예외 가능한 다른 인자 — 절대 섞지 말 것
4. 컴파일러가 `-Wsequenced` 류 경고를 주면 검토

## 실무 가이드 — 체크리스트

- [ ] `new`로 만든 raw pointer를 함수 인자에 직접 넣지 않는가?
- [ ] `make_unique`/`make_shared` 사용 가능한가?
- [ ] custom deleter가 필요하면 독립 문장에 wrap?
- [ ] 여러 동적 객체를 한 함수 호출에 넘기는가? → 모두 `make_*`로

## 핵심 정리

1. **`new` 결과를 같은 호출의 다른 인자와 섞지 마라** — C++14 이전 평가 순서 모호
2. **독립 문장에 wrapping** — 사이에 다른 작업 끼어들 여지 차단
3. **`make_shared` / `make_unique` 사용**이 가장 우아 — 함수 호출 한 번
4. C++17+ 부속 표현식 non-interleaved 보장 — 그래도 `make_*` 권장
5. custom deleter 같은 예외 경우엔 명시 wrapping + 독립 문장

## 관련 항목

- [항목 13: RAII](/blog/programming/cpp/effective-cpp/item13-use-objects-to-manage-resources) — 스마트 포인터의 기본 동기
- [항목 18: 인터페이스는 쓰기 쉽게](/blog/programming/cpp/effective-cpp/item18-make-interfaces-easy-to-use-correctly-and-hard-to-use-incorrectly) — make_* 같은 팩토리의 가치
- [Effective Modern C++ 항목 21: make_unique/make_shared 선호](/blog/programming/cpp/effective-modern-cpp/item21-prefer-make-unique-and-make-shared-to-direct-new) — make_* 심층 분석
