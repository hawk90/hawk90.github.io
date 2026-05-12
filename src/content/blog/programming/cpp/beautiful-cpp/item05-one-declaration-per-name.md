---
title: "항목 5: 선언당 단 하나의 이름만 선언하라"
date: 2026-05-08T14:00:00
description: "한 줄에 여러 변수를 선언할 때의 함정 — 포인터/참조 수식어 위치, 초기화 누락, 가독성 손실."
tags: [C++, Declarations, Code Style]
series: "Beautiful C++"
seriesOrder: 5
draft: false
---

## 왜 이 항목이 중요한가?

C에서 물려받은 문법 중 가장 헷갈리는 것 하나:

```cpp
int* p1, p2;
```

`p1`은 `int*`. **`p2`는 그냥 `int`**. 둘 다 포인터로 만들고 싶었다면 함정. C 표준의 "선언자(declarator)" 문법은 **타입에 수식어가 붙는 게 아니라 변수 이름에 붙는** 구조 — 한 줄에 여러 변수를 선언하면 각자 별개로 적용된다. C++에선 이런 양식 자체를 피하는 게 정답.

## 핵심 내용

- 한 줄에 여러 변수를 선언하면 **타입 수식어**가 어디에 붙는지 헷갈린다
- 특히 포인터 `*`와 참조 `&`는 변수 이름에 붙는 것이지 타입에 붙지 않는다
- 한 변수 = 한 선언이면 **초기화·코멘트·diff·git blame**이 모두 명확해진다
- 컴파일러 경고로 잡기 어려운 함정 — 코드 스타일로 예방

## 함정 1 — 포인터 분배

```cpp
int* p1, p2;        // p1: int*, p2: int  ⚠️
```

`*`는 `int`에 붙는 게 아니라 `p1`에만 붙음. `p2`는 평범한 int.

해결:

```cpp
int* p1 = nullptr;
int* p2 = nullptr;     // 각자 한 줄
```

`int *p1, *p2;`처럼 둘 다 `*` 명시도 가능하지만 — 멤버 추가/이동에 취약하다.

## 함정 2 — 초기화 누락

```cpp
int width = 0, height;
```

`width = 0`은 OK. **`height`는 미초기화** — 쓰레기 값. 컴파일러는 미초기화 사용 시 일부 경고하지만 항상은 아님.

해결:

```cpp
int width  = 0;
int height = 0;
```

각 선언에 명시.

## 함정 3 — const / volatile

```cpp
const int* p1, p2;      // p1: const int*, p2: const int (값 변경 불가)
```

`p2`는 포인터가 아니지만 `const`는 적용된다. 의도와 다를 가능성.

해결: 한 줄 한 변수.

```cpp
const int* p1 = nullptr;
const int* p2 = nullptr;
```

## 함정 4 — 함수 포인터

```cpp
void (*f)(int), g(int);      // f: 함수 포인터, g: 함수 선언!!
```

`g`가 함수 선언이 됨 — 변수가 아니라 함수 프로토타입. 매우 헷갈림.

C++ 모던: `auto f = +[](int){};` 또는 `std::function<void(int)> f;` 같은 명시적 형태.

## 한 변수 = 한 선언 — 이점

```cpp
// Before
int x = 0, y = 0, z = 0;

// After
int x = 0;
int y = 0;
int z = 0;
```

- **diff/git blame**: 한 변수만 바뀐 게 명확히 보임
- **코멘트 추가**: 변수마다 줄 코멘트 가능
- **타입 변경**: 한 변수만 다른 타입으로 바꿀 때 자연스러움
- **선언 위치 이동**: 다른 스코프로 옮기기 쉬움

## 예외 — 구조적 바인딩 (C++17)

```cpp
auto [width, height] = getSize();              // OK — 단일 분해
auto [it, inserted] = map.insert({key, val});
```

구조적 바인딩은 **한 번의 분해**라 한 선언으로 봐도 OK. C++17 도입.

## 예외 — for 루프 초기화

```cpp
for (int i = 0, n = v.size(); i < n; ++i) {
    // ...
}
```

`i`와 `n`이 같은 스코프, 같은 루프 카운터 의도 — 관용적으로 허용. 그러나 가독성 신경 쓰면:

```cpp
for (int n = static_cast<int>(v.size()), i = 0; i < n; ++i) {
    // ...
}
```

또는 C++17 if-init / range-based for:

```cpp
for (int i = 0; i < std::ssize(v); ++i) {        // C++20 ssize
    // ...
}

for (const auto& x : v) {                         // 인덱스 불필요
    // ...
}
```

## 모던 변형 — `auto` + 한 줄 한 선언

```cpp
auto count = 0;
auto name = std::string{"Alice"};
auto callback = []() { /* ... */ };
```

`auto`는 자동으로 한 변수 한 줄 — 함정 자체가 없다.

## 흔한 패턴 — 멤버 변수도 한 줄에 하나

```cpp
class Widget {
    int x_, y_;             // ⚠️ 같은 함정
    int* p1_, p2_;          // ⚠️ p1_는 포인터, p2_는 int
};
```

클래스 멤버도 같은 규칙.

```cpp
class Widget {
    int x_ = 0;
    int y_ = 0;
    int* p1_ = nullptr;
    int* p2_ = nullptr;
};
```

## 컴파일러 경고

```
gcc -Wall:           대부분 잡지 못함
clang -Weverything:  -Wcomma 같은 옵션이 일부 잡음
clang-tidy:          modernize-use-trailing-return-type 등 모던화 권장
```

이 규칙 자체를 잡는 표준 경고는 약함. **스타일 가이드** + **코드 리뷰**에 의존.

## 흔한 함정 — multiple-return-value 의도

C 시절 흔한 패턴:

```cpp
int x, y, status;
status = getCoordinates(&x, &y);
```

C++ 모던 대안:

```cpp
struct Coordinates { int x; int y; };
struct Result { Coordinates coords; int status; };

auto result = getCoordinates();        // 구조체 반환

// 또는 C++17 structured binding
auto [coords, status] = getCoordinates();
```

여러 변수가 같은 의미 그룹이라면 **구조체**로 묶는 게 의도 명확.

## 실무 가이드 — 체크리스트

- [ ] 한 선언에 한 이름만?
- [ ] 포인터/참조 변수는 각자 한 줄?
- [ ] 모든 변수가 명시적으로 초기화?
- [ ] 함수 포인터 선언은 별도 줄에?
- [ ] 클래스 멤버에도 같은 규칙?
- [ ] 여러 변수가 같은 의미 그룹이면 구조체로 묶기 검토?

## 정리

한 줄 한 선언은 **읽는 사람의 인지 부담을 줄이는 가장 값싼 방법**이다. 포인터/참조 선언에서의 함정도 자연스럽게 사라지고, diff/blame의 정확도가 올라가며, 변경에 강해진다.

C++ 모던 코드에선:
- **`auto`**로 자연스럽게 한 변수 한 줄
- **structured bindings**로 단일 분해
- **for-range**로 인덱스 변수 자체 회피
- **구조체**로 의미 그룹 묶음

## 관련 항목

- [항목 3: 기본 멤버 초기화자](/blog/programming/cpp/beautiful-cpp/item03-use-default-member-initializers) — 멤버 선언 패턴
- [항목 19: 다중 반환은 struct로](/blog/programming/cpp/beautiful-cpp/item19-return-struct-for-multiple-outputs) — 여러 값 묶음
- [항목 28: 사용 전 초기화](/blog/programming/cpp/beautiful-cpp/item28-dont-declare-before-init) — 초기화 누락 함정
