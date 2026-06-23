---
title: "Chapter 13: Unusual Data Types"
date: 2026-05-11T13:00:00
description: "덜 흔한 데이터 타입 — struct, 포인터, 전역 변수. 각각의 함정과 안전한 사용."
series: "Code Complete"
seriesOrder: 13
tags: [code-complete, data-types, pointers, McConnell]
draft: true
---

## 이 챕터의 메시지

기본 타입 외에 — **struct, 포인터, 전역 변수**도 일상적으로 만난다. 각자 다른 종류의 함정을 가진다.

> 가장 위험한 타입 = **포인터**. 가장 남용되는 타입 = **전역 변수**.

## 핵심 내용

- **struct**: 관련 데이터를 묶는 단위. 캡슐화 없는 클래스.
- **포인터**: 메모리·생명주기·null 가능성의 함정.
- **전역 변수**: 거의 항상 잘못. 결합도 폭발.

## struct

C 시절의 데이터 묶음 단위. C++에선 — `class`와 거의 같다 (default 접근만 다름).

```c
struct Point {
    double x;
    double y;
};
```

### 언제 쓰나

- **POD**(Plain Old Data) — 데이터만 모은 단위.
- **API 경계** — C 라이브러리와 인터페이스.
- **DTO** — 데이터 전송 목적.

### 함정

- struct의 **모든 멤버가 public** → 캡슐화 X.
- 행동을 추가하기 시작하면 — 그냥 클래스를 쓰는 게 낫다.

## 포인터

C/C++의 가장 강력하고 가장 위험한 도구.

### 함정 1: null 포인터

```c
char* s = NULL;
strlen(s);    // crash
```

사용 전에 항상 null 검사.

### 함정 2: 댕글링

```c
char* p;
{
    char buf[10];
    p = buf;
}
// buf 소멸 — p는 댕글링
```

- 지역 변수의 포인터를 외부로 반환 X.
- 해제된 메모리의 포인터 사용 X.

### 함정 3: 메모리 누수

```c
char* p = malloc(100);
// ... 코드 ...
return;    // p를 free 안 함 → 누수
```

`malloc`/`free` 짝을 맞춘다. RAII가 더 좋다 (C++의 `unique_ptr` 등).

### 함정 4: 이중 해제

```c
free(p);
free(p);    // ⚠️ 같은 포인터를 두 번 — UB
```

해제 후 포인터를 `NULL`로 설정하는 습관.

### 안전한 포인터 — Modern C++

```cpp
std::unique_ptr<Widget> p(new Widget);
// 자동 해제, null 검사 가능, 댕글링 어려움
```

raw 포인터를 직접 다루는 자리는 — 최소화.

## 전역 변수

> McConnell의 분류 — **거의 모든 전역 변수는 잘못이다**.

### 왜 나쁜가

- **결합도 폭발** — 어디서든 변경 가능. 변경 추적 어려움.
- **동시성 문제** — 락 없이 공유.
- **테스트 어려움** — 상태가 함수 사이를 흐름.
- **재진입성 깨짐** — 두 호출이 서로 영향.

### 정당한 전역

- **상수** — `PI = 3.14`.
- **전역 자원** (제한된 의미) — 로거, 캐시 인스턴스.
- 그러나 이것도 — **싱글톤 패턴**이나 **DI 컨테이너**로 캡슐화하는 게 낫다.

### 대안

- 매개변수로 전달.
- 객체의 멤버로.
- 클래스의 정적 멤버로 (제한된 스코프).

## 정리

- **struct**: 데이터 묶음, 행동 없는 단위.
- **포인터**: null, 댕글링, 누수, 이중 해제. 가능하면 smart pointer.
- **전역 변수**: 거의 항상 잘못. 대안 (매개변수, 객체 멤버, DI).

## 관련 항목

- [Ch 12: Fundamental Types](/blog/programming/engineering/code-complete/ch12-Fundamental-Data-Types)
- [Ch 14: Straight-Line Code](/blog/programming/engineering/code-complete/ch14-Organizing-Straight-Line-Code)
- [Effective Modern C++ Ch 18: unique_ptr](/blog/programming/cpp/effective-modern-cpp/item18-use-unique-ptr-for-exclusive-ownership)
