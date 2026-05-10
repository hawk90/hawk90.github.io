---
title: "항목 20: 값 전달보다 const 참조 전달을 선호하라"
date: 2025-02-04T12:00:00
description: "복사 비용 회피 + 슬라이싱 방지 — 그러나 모든 타입에 적용되진 않음."
tags: [C++, Effective C++, Performance, Pass by Reference]
series: "Effective C++"
seriesOrder: 20
draft: true
---

> **초안** — 정리 진행 중

## 개요

값 전달은 **복사 비용**이 발생하고, 다형성 객체에선 **슬라이싱**(파생 부분 손실)이 일어납니다. 보통 `const T&` 전달이 안전하고 효율적.

## 복사 비용 회피

```cpp
void f(Person p);              // 복사 — 생성자 + 소멸자 호출
void g(const Person& p);       // 참조 — 무복사

class Person {
    std::string name;
    std::string address;
    // 큰 객체 — 복사가 비쌈
};
```

## 슬라이싱 방지

```cpp
class Window { virtual void display() const; };
class WindowWithScrollBars : public Window { void display() const override; };

void f(Window w);              // ← 슬라이싱!
void g(const Window& w);       // 다형성 보존

WindowWithScrollBars w;
f(w);    // Window 부분만 복사 — display()는 Window::display() 호출
g(w);    // 참조라 다형성 유지 — display()는 WindowWithScrollBars::display() 호출
```

## 예외 — 작은 내장 타입과 STL 반복자/함수 객체

값 전달이 더 효율적인 경우:

```cpp
void f(int x);                 // 값 — 4 byte, 참조 우회 비용보다 저렴
void g(double d);              // 값
void h(std::vector<int>::iterator it);   // 반복자는 가벼움
```

STL 알고리즘이 함수 객체와 반복자를 by-value로 받는 이유.

## 일반 규칙

- **사용자 정의 클래스, 큰 객체** → `const T&`
- **내장 타입, 반복자, 함수 객체** → by-value
- 의심되면 측정

## 핵심 정리

1. 클래스 객체는 보통 `const T&` 전달 — 복사 비용·슬라이싱 회피
2. 내장 타입과 STL 반복자/함수 객체는 by-value
3. C++11+ 에선 move 가능 타입에 대해 by-value도 옵션 (EMC++ item 41)
