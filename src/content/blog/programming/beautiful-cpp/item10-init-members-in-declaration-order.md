---
title: "항목 10: 멤버를 선언한 순서대로 데이터 멤버를 정의하고 초기화하라"
date: 2026-05-10T10:00:00
description: "초기화 리스트 순서가 선언 순서와 어긋날 때 생기는 함정"
tags: [C++, Initialization, Constructor]
series: "Beautiful C++"
seriesOrder: 10
draft: true
---


## 핵심 내용

- 멤버는 **클래스에 선언된 순서**대로 초기화된다 — 초기화 리스트의 순서와 무관하다
- 리스트 순서를 다르게 쓰면 **읽는 사람이 착각**하고, 한 멤버를 다른 멤버로 초기화할 때 미정의 동작이 생긴다
- 일부 컴파일러는 `-Wreorder` 경고로 잡아주지만 의존하지 마라
- 선언 순서 = 초기화 순서 = 소멸 역순 — 이 일관성을 유지하라

## 예제 코드

```cpp
// Bad: 리스트 순서가 선언 순서와 다름
class Buffer {
    int size_;
    int* data_;
public:
    // 보기엔 size_부터 같지만, 실제 초기화는 data_가 먼저!
    Buffer(int n)
      : data_(new int[n])    // 이 시점에 size_는 아직 미초기화
      , size_(n)
    {}
};

// Worse: 한 멤버를 다른 멤버로 초기화 — UB 위험
class View {
    int* end_;
    int* begin_;
public:
    // begin_으로 end_를 초기화? begin_은 아직 초기화 전
    View(int* p, int n) : begin_(p), end_(begin_ + n) {}
    // 실제 순서: end_(begin_ + n) ← begin_ 미초기화!
};

// Good: 선언 순서 그대로
class Buffer {
    int size_;
    int* data_;
public:
    Buffer(int n) : size_(n), data_(new int[n]) {}
};
```

## 정리

초기화 리스트의 순서는 **장식이 아니다**. 선언 순서와 일치시켜야 의도가 명확하고, 한 멤버로 다른 멤버를 초기화하는 함정도 피할 수 있다.
