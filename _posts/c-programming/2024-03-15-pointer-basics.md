---
layout: post
title: "C 포인터 기초"
date: 2024-03-15
categories:
  - C 프로그래밍
  - 전문가를 위한 C
tags: [c, pointer, memory]
---

# C 포인터 기초

포인터는 C 프로그래밍의 핵심 개념입니다. 메모리 주소를 직접 다룰 수 있어 강력하지만 주의가 필요합니다.

## 포인터란?

포인터는 메모리 주소를 저장하는 변수입니다.

```c
int value = 42;
int *ptr = &value;  // value의 주소를 ptr에 저장
```

## 포인터 사용 예제

```c
#include <stdio.h>

int main() {
    int x = 10;
    int *p = &x;

    printf("x의 값: %d\n", x);
    printf("x의 주소: %p\n", &x);
    printf("p가 가리키는 값: %d\n", *p);

    return 0;
}
```

포인터를 통해 효율적인 메모리 관리와 함수 간 데이터 전달이 가능합니다.