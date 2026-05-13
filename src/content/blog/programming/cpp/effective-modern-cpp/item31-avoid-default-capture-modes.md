---
title: "항목 31: 기본 캡처 모드를 피하라"
date: 2025-01-09T10:00:00
description: "[&]·[=]가 만드는 댕글링 참조와 의외의 캡처 — 명시 캡처가 안전."
tags: [C++, Lambda, Capture, Modern C++]
series: "Effective Modern C++"
seriesOrder: 31
draft: true
---

## 왜 이 항목이 중요한가?

람다의 기본 캡처 `[&]`와 `[=]`는 편리해 보인다. "필요한 것만 자동으로 캡처해 준다"는 점이 끌린다. 그러나 세 가지 함정이 따라온다.

- **`[&]`** — 람다가 캡처 스코프보다 오래 살면 댕글링 참조가 된다. 비동기 콜백이나 컨테이너에 저장하면 거의 항상 위험하다.
- **`[=]` + 멤버 변수** — 값 복사처럼 보이지만 실제로는 `this`만 캡처한다. 객체가 사라지면 댕글링이다.
- **`[=]` + static 변수** — 캡처되지 않고 직접 참조된다. "값으로 복사됐겠지" 하는 오해를 부른다.

이 항목은 세 함정과, 안전한 명시 캡처·C++14 init capture·C++17 `[*this]` 해결책을 정리한다.

## 개요

람다의 기본 캡처 모드 `[&]`(모두 참조 캡처)와 `[=]`(모두 값 캡처)는 편하지만 **댕글링 참조**와 **의도치 않은 캡처**를 만든다. 명시적으로 캡처할 변수를 적는 게 안전하다.

## 필수 개념: 람다 캡처

> **초보자를 위한 배경 지식**

<br>

```cpp
int x = 10;

[]() { /* x 사용 X */ };           // 캡처 없음
[x]() { /* x 값 복사 */ };          // 명시 값 캡처
[&x]() { /* x 참조 */ };            // 명시 참조 캡처
[=]() { /* 자동: 사용된 모든 변수 값 복사 */ };
[&]() { /* 자동: 사용된 모든 변수 참조 */ };
[x, &y]() { /* x 값, y 참조 */ };
```

기본 캡처 `[=]`/`[&]`는 **사용된 변수**만 자동 캡처한다 (`[=]`가 모든 자동 변수를 잡는 게 아니다).

## 함정 1 — `[&]`의 댕글링 참조

```cpp
std::vector<std::function<bool(int)>> filters;

void addFilter() {
    auto divisor = computeDivisor();   // 지역 변수
    filters.emplace_back(
        [&](int v) { return v % divisor == 0; }
        //  ↑ divisor는 참조 캡처
    );
}   // ← 함수 종료 시 divisor 소멸
    //   filters의 람다는 댕글링 참조 보유

// 나중에
for (auto& f : filters) f(5);   // ⚠️ 댕글링 참조 접근 — UB
```

**람다가 자신의 캡처를 만든 스코프보다 오래 사는 순간 위험**해진다.

해결책은 명시적 값 캡처다.

```cpp
filters.emplace_back(
    [divisor](int v) { return v % divisor == 0; }   // 값 복사 — 안전
);
```

## 함정 2 — `[=]`의 멤버 변수는 사실 `this` 캡처

```cpp
class Widget {
    int divisor;
public:
    void addFilter() const {
        filters.emplace_back(
            [=](int v) { return v % divisor == 0; }
            //   ↑ divisor가 캡처되는 게 아니라 this가 캡처됨!
            //     실제로는 this->divisor 접근
        );
    }
};
```

`[=]`에 멤버처럼 보이는 게 사실 `this`다. `Widget` 객체가 사라지면 `this`가 댕글링이다.

```cpp
auto w = std::make_unique<Widget>();
w->addFilter();   // 람다가 this 보유
w.reset();         // Widget 소멸 → this 댕글링
filters[0](5);     // ⚠️ UB
```

### C++14 해결 — init capture로 멤버 복사

```cpp
void addFilter() const {
    auto divisorCopy = divisor;
    filters.emplace_back(
        [divisor = divisorCopy](int v) { return v % divisor == 0; }
        //  ↑ 진짜 값 캡처 — this 안 캡처
    );
}
```

또는 직접 init capture를 쓴다.

```cpp
filters.emplace_back(
    [divisor = divisor](int v) { return v % divisor == 0; }
);
```

### C++17 — `[*this]` 객체 자체 값 캡처

```cpp
filters.emplace_back(
    [*this](int v) { return v % divisor == 0; }   // *this 복사 (Widget 자체 복사)
);
```

Widget이 소멸해도 람다가 자기 복사본을 보유한다.

## 함정 3 — `[=]`는 정적 변수를 캡처하지 않음

```cpp
void process() {
    static int divisor = 5;
    auto f = [=](int v) { return v % divisor == 0; };
    //  ↑ divisor는 static이라 캡처 X — 직접 참조됨
    //    [=]가 적혀 있어 "값 복사됐겠지" 오해 유발
}
```

값을 복사한 것처럼 보이지만 **실제로는 매번 같은 static을 읽는다**. divisor가 다른 곳에서 변경되면 람다 동작도 바뀐다.

명시적 캡처면 컴파일 에러로 알 수 있다.

```cpp
auto f = [divisor](int v) { return v % divisor == 0; };
//  ↑ static은 명시 캡처 안 됨 — 에러 또는 그냥 직접 사용 (컴파일러 경고)
```

## 권장 — 명시적 캡처

```cpp
// Bad — 기본 캡처
[&](int v) { return v % divisor == 0; }
[=](int v) { return v % divisor == 0; }

// Good — 명시
[&divisor](int v) { return v % divisor == 0; }   // 명시 참조
[divisor](int v)  { return v % divisor == 0; }   // 명시 값
```

각 변수의 캡처 의도가 코드에 적혀 있어 함정을 회피한다.

## C++14 init capture (자세히)

```cpp
[name = expr](...) { ... }
```

표현식의 결과를 새 변수 `name`에 저장한다. 자세한 건 [항목 32](/blog/programming/cpp/effective-modern-cpp/item32-use-init-capture-to-move-objects-into-closures)에서 다룬다.

활용은 이렇다.

- 멤버 값 복사 (this 캡처 회피).
- move-only 객체 캡처.
- 임시 객체 캡처.

## 클래스 데이터 멤버 캡처 — 안전한 패턴

```cpp
class Widget {
    int divisor;
public:
    auto makeFilter() const {
        // 명시적으로 멤버 값을 복사
        auto d = divisor;
        return [d](int v) { return v % d == 0; };
        // 또는 C++14:
        return [d = divisor](int v) { return v % d == 0; };
    }
};
```

## 캡처 여부 의식적으로

람다가 **언제까지 살까?** 이 질문이 캡처 모드를 결정한다.

| 람다 수명 | 권장 |
| --- | --- |
| 즉시 호출 (`std::for_each`) | `[&]` OK (스코프 안에서만) |
| 함수 반환·저장 | 명시 값 캡처 |
| 비동기·콜백 | 명시 값 또는 `[*this]` |

## 표준 알고리즘에선 `[&]` OK

```cpp
std::vector<int> v;
int total = 0;
std::for_each(v.begin(), v.end(), [&](int x) { total += x; });
//                                  ↑ 짧은 수명 — 안전
```

람다가 호출이 끝나면 사라진다. 댕글링이 없다.

## 함정 — 람다 안의 `this`

C++17부터 `[this]`를 명시한다.

```cpp
[this]() { return divisor; }   // this 캡처 명시 (포인터)
[*this]() { return divisor; }  // *this 객체 자체 복사 (C++17+)
```

기본 `[=]`가 `this`를 캡처하는 건 C++20부터 deprecated다. `[=, this]` 또는 `[*this]` 명시를 권장한다.

## 핵심 정리

1. `[&]`는 **댕글링 참조** 위험이 있다. 람다가 캡처 스코프보다 오래 살면 UB다.
2. `[=]`는 **`this`를 캡처**해 멤버 접근이 의외의 동작을 한다.
3. `[=]`는 **static 변수를 캡처하지 않는다**. 오해를 유발한다.
4. **명시적 캡처가 안전**하다. 의도가 코드에 드러난다.
5. C++14 init capture `[x = ...]`로 멤버 값을 복사한다.
6. C++17 `[*this]`로 객체 자체를 복사한다.
7. 짧은 수명 람다(`for_each`)면 `[&]` OK다.

## 관련 항목

- [항목 32: init capture](/blog/programming/cpp/effective-modern-cpp/item32-use-init-capture-to-move-objects-into-closures)
- [항목 33: decltype + forward](/blog/programming/cpp/effective-modern-cpp/item33-use-decltype-on-auto-parameters-when-forwarding)
- [항목 34: 람다 vs bind](/blog/programming/cpp/effective-modern-cpp/item34-prefer-lambdas-to-std-bind)
