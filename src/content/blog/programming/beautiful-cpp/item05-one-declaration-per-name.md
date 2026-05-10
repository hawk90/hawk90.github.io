---
title: "항목 5: 선언당 단 하나의 이름만 선언하라"
date: 2026-05-10T10:00:00
description: "한 줄에 여러 변수를 선언할 때 발생하는 함정을 피하는 법"
tags: [C++, Declarations, Code Style]
series: "Beautiful C++"
seriesOrder: 5
draft: true
---


## 핵심 내용

- 한 줄에 여러 변수를 선언하면 **타입 수식어**가 어디에 붙는지 헷갈린다
- 특히 포인터 `*`와 참조 `&`는 변수 이름에 붙는 것이지 타입에 붙지 않는다
- 한 변수 = 한 선언이면 초기화·코멘트·diff가 모두 명확해진다

## 예제 코드

```cpp
// Bad: p2는 포인터가 아니라 그냥 int!
int* p1, p2;

// Bad: 두 변수가 같은 줄, 다른 의미
int width = 0, height;  // height는 미초기화

// Good: 한 선언당 한 이름
int* p1 = nullptr;
int* p2 = nullptr;

int width  = 0;
int height = 0;
```

## 정리

한 줄 한 선언은 **읽는 사람의 인지 부담을 줄이는 가장 값싼 방법**이다. 포인터/참조 선언에서의 함정도 자연스럽게 사라진다.
