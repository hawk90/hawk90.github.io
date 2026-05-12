---
title: "항목 8: 함수의 인자를 적게 유지하라"
date: 2026-05-08T17:00:00
description: "긴 인자 목록의 함정을 피하고 의미 단위로 묶어 표현하는 법"
tags: [C++, API Design, Function Design]
series: "Beautiful C++"
seriesOrder: 8
draft: false
---


## 핵심 내용

- 인자가 많을수록 호출자는 **순서·의미·기본값**을 모두 외워야 한다
- 같은 타입의 인자가 연달아 있으면 **무음 버그**(인자 순서 실수)의 온상이 된다
- 인자 묶음이 의미적으로 한 덩어리라면 **구조체로 묶어라**
- 인자 4~5개를 넘기 시작하면 함수 책임이 너무 큰 것은 아닌지 의심하라

## 예제 코드

```cpp
// Bad: 의미가 비슷한 인자가 너무 많다
Rectangle make_rect(int x, int y, int w, int h, int margin, int border, bool round);
auto r = make_rect(10, 20, 100, 200, 4, 2, true);  // 각 숫자가 뭐였지?

// Good: 묶음을 구조체로
struct Rect  { int x, y, w, h; };
struct Style { int margin = 0; int border = 0; bool rounded = false; };

Rectangle make_rect(Rect bounds, Style style = {});

auto r = make_rect({10, 20, 100, 200}, {.margin = 4, .border = 2, .rounded = true});
```

## 정리

인자는 **의미적 단위**로 묶고, 자주 같이 다니는 데이터는 타입을 만들어 주어라. 호출부의 가독성이 함수 시그니처의 품질을 결정한다.
