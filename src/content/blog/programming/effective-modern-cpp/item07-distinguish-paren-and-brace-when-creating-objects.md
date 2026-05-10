---
title: "항목 7: 객체 생성 시 () 와 {} 를 구분하라"
date: 2025-01-06T10:00:00
description: "C++의 객체 초기화 문법 ()와 {}의 차이, 함정, 그리고 선택 기준."
tags: [C++, Initialization, Modern C++]
series: "Effective Modern C++"
seriesOrder: 7
draft: true
---

> **초안** — 정리 진행 중

## 개요

C++11이 도입한 **uniform initialization**(`{}`)는 거의 모든 자리에서 쓸 수 있는 강력한 문법이지만, `()`와 미묘하게 다른 결과를 낳습니다. 어느 쪽을 기본으로 쓸지 선택해야 합니다.

## 초기화 문법 4가지

```cpp
int x(0);     // 1) parens — direct
int y = 0;    // 2) =      — copy
int z{0};     // 3) braces — direct (uniform init)
int w = {0};  // 4) =,{}   — copy with braces
```

값 타입에서는 결과가 같지만, 클래스 객체에서는 호출되는 생성자나 변환 규칙이 달라집니다.

## `{}` 의 장점

### 1. 가장 일관된 문법
거의 모든 자리에서 사용 가능 — 멤버 초기화, 비복사 가능 객체, 컨테이너 리터럴.

```cpp
std::vector<int> v{1, 2, 3};
class Widget { int x{0}; int y{0}; };  // 멤버 기본값
std::atomic<int> a{0};                  // 비복사 객체도 OK
```

### 2. narrowing 변환 금지
`{}` 안에서 정밀도 손실이 일어나는 변환은 컴파일 에러.

```cpp
double d = 3.14;
int x(d);     // OK: 3으로 잘림
int y = d;    // OK
int z{d};     // 에러! narrowing
```

### 3. C++의 가장 짜증나는 파싱(MVP) 회피

```cpp
Widget w1();    // 함수 선언으로 해석됨!
Widget w2{};   // 객체 — 명백
```

## `{}` 의 함정 — `initializer_list` 우선

생성자 오버로드 결정에서 `{}`는 **`initializer_list` 생성자를 최우선**으로 찾습니다.

```cpp
std::vector<int> v1(10, 20);   // 20이 10개 → {20, 20, ...}
std::vector<int> v2{10, 20};   // 원소 두 개 → {10, 20}
```

심지어 narrowing이 생기더라도 다른 생성자로 후퇴하지 않고 에러를 냅니다.

```cpp
class Widget {
    Widget(int, bool);
    Widget(int, double);
    Widget(std::initializer_list<long>);
};

Widget w{10, true};   // initializer_list 호출 (narrowing 에러)
                      // (int,bool) 생성자로 후퇴 안 함
```

### 빈 `{}` 는 예외

```cpp
class W {
    W();
    W(std::initializer_list<int>);
};

W w1{};      // 기본 생성자 (빈 list 아님!)
W w2({});    // 빈 list 호출
```

## 선택 기준

| 상황 | 권장 |
| --- | --- |
| `vector` 같은 list 생성자가 의미 있는 컨테이너 | `()` (크기·값 의미) 또는 `{}` (리터럴) — 의도에 따라 |
| 클래스 멤버 기본값 | `{}` |
| 단순 값 타입 | 어느 쪽이든 |
| 템플릿 안에서 객체 생성 | 매우 신중하게 — 호출자의 타입에 따라 결과가 달라짐 |

**한 줄 가이드**

- 라이브러리 작성자: 둘 다 일관되게 사용 가능하도록 설계
- 사용자: 의도가 더 잘 드러나는 쪽 선택. `vector<int>{10}`(원소 1개)와 `vector<int>(10)`(크기 10)의 차이를 인식

## 핵심 정리

1. `{}` 는 narrowing 차단, MVP 회피, 거의 모든 자리에서 사용 가능
2. `{}` 는 `initializer_list` 생성자를 강하게 우선시
3. `vector<int>(10, 20)` vs `vector<int>{10, 20}`처럼 의미가 완전히 다른 경우가 있음
4. 빈 `{}` 는 기본 생성자, 빈 list가 아님
