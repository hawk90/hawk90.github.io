---
title: "항목 2: #define보다 const, enum, inline을 선호하라"
date: 2025-02-01T11:00:00
description: "전처리기 매크로의 단점과 컴파일러가 다룰 수 있는 대안들."
tags: [C++, Effective C++, Preprocessor]
series: "Effective C++"
seriesOrder: 2
draft: true
---

> **초안** — 정리 진행 중

## 개요

`#define`은 **전처리기**가 처리해 컴파일러에게는 보이지 않습니다. 디버그 심볼에 안 잡히고, 타입 체크가 없으며, 스코프도 없음. 가능하면 `const`, `enum`, `inline`으로 대체.

## `#define` vs `const`

```cpp
#define ASPECT_RATIO 1.653        // 전처리기 매크로
const double AspectRatio = 1.653; // 컴파일러가 아는 상수
```

`const` 쪽의 장점:
- 디버거에 이름이 남음 (매크로는 사라짐)
- 타입 안전 (`double`로 명시)
- 스코프 가능 (네임스페이스, 클래스 안에 둘 수 있음)

## 클래스 상수

```cpp
class GamePlayer {
    static const int NumTurns = 5;   // 선언
    int scores[NumTurns];
};
const int GamePlayer::NumTurns;       // 정의 (필요 시)
```

C++11+ 에서 `constexpr static`도 동일 패턴이며, 인라인 변수(C++17)가 가장 깔끔.

## "the enum hack"

옛 컴파일러가 `static const` 멤버를 인라인 사용 못 할 때:

```cpp
class GamePlayer {
    enum { NumTurns = 5 };   // enum 값은 컴파일 타임 정수
    int scores[NumTurns];
};
```

지금도 TMP에서 종종 사용됨.

## `#define` 매크로 vs `inline` 함수

```cpp
// 위험한 매크로 — 인자가 두 번 평가
#define CALL_WITH_MAX(a, b) f((a) > (b) ? (a) : (b))

int a = 5, b = 0;
CALL_WITH_MAX(++a, b);     // a가 두 번 증가!

// 안전한 인라인 함수 템플릿
template<typename T>
inline void callWithMax(const T& a, const T& b) {
    f(a > b ? a : b);
}
```

함수는 타입 검사·스코프·평가 횟수 모두 명확.

## 핵심 정리

1. 단순 상수: `#define` 대신 `const` 객체 또는 `enum`
2. 함수형 매크로: `#define` 대신 `inline` 함수 템플릿
3. 전처리기는 가능한 한 적게
