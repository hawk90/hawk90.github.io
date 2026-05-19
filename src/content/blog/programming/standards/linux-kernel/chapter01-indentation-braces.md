---
title: "Ch 1: Indentation & Braces"
date: 2026-05-18T01:00:00
description: "8-space tabs의 철학, K&R brace 스타일, switch 문 정렬. 깊은 중첩은 리팩토링 신호."
tags: [Linux, Kernel, Indentation, Braces, Tabs]
series: "Linux Kernel Coding Style"
seriesOrder: 1
draft: false
---

> "Tabs are 8 characters, and thus indentations are also 8 characters."

## 8-Space Tabs

### 왜 8칸인가?

```c
// 8칸 들여쓰기의 목적:
// 1. 중첩이 깊어지면 "불편해진다"
// 2. 그 불편함이 "리팩토링하라"는 신호다

void too_deep(void)
{
        if (a) {
                if (b) {
                        if (c) {
                                // 여기서 이미 24칸
                                // 80칸 제한에 56칸만 남음
                                do_something();
                        }
                }
        }
}
```

### 올바른 해결

```c
// 중첩을 줄이는 방법 1: Early return
void better_function(void)
{
        if (!a)
                return;
        if (!b)
                return;
        if (!c)
                return;

        do_something();
}

// 중첩을 줄이는 방법 2: 함수 분리
static bool conditions_met(void)
{
        return a && b && c;
}

void best_function(void)
{
        if (conditions_met())
                do_something();
}
```

## Brace 스타일: K&R

### 함수 정의

함수는 — 여는 brace가 **다음 줄**에:

```c
// Good: 함수는 brace가 다음 줄
int function(int x, int y)
{
        /* body */
}

// Bad
int function(int x, int y) {
        /* body */
}
```

### 제어문

제어문은 — 여는 brace가 **같은 줄**에:

```c
// Good: 제어문은 brace가 같은 줄
if (condition) {
        do_this();
        do_that();
}

while (condition) {
        do_something();
}

for (i = 0; i < n; i++) {
        process(i);
}
```

### 왜 다른가?

Kernighan과 Ritchie의 원래 스타일을 따른다:

- 함수는 — 프로그램의 **최상위 블록**
- 제어문은 — 함수 **내부의 흐름**
- 시각적으로 구분하기 위해 다르게 처리

## else와 닫는 Brace

```c
// Good: else는 닫는 brace 바로 뒤에
if (condition) {
        do_this();
} else {
        do_that();
}

// Good: else if도 마찬가지
if (condition1) {
        do_a();
} else if (condition2) {
        do_b();
} else {
        do_c();
}
```

## do-while

```c
// Good: while이 닫는 brace 바로 뒤에
do {
        body();
} while (condition);
```

## 단일 문장

단일 문장에는 brace를 **생략**한다:

```c
// Good: 단일 문장은 brace 없이
if (condition)
        do_something();

for (i = 0; i < n; i++)
        process(i);

while (condition)
        wait();
```

### 예외: if-else 혼합

if-else 중 **하나라도 여러 줄**이면 — 모두 brace:

```c
// Good: 일관성을 위해 모두 brace
if (condition) {
        do_a();
        do_b();
} else {
        do_c();
}

// Bad: 불일치
if (condition) {
        do_a();
        do_b();
} else
        do_c();
```

## Switch 문

```c
// Good: case는 switch와 같은 열에
switch (value) {
case 1:
        do_one();
        break;
case 2:
        do_two();
        break;
default:
        do_default();
        break;
}
```

### Fall-through 주석

의도적인 fall-through에는 주석:

```c
switch (value) {
case 1:
        prepare();
        /* fall through */
case 2:
        process();
        break;
default:
        break;
}
```

GCC 7+에서는 `__attribute__((fallthrough))` 사용:

```c
switch (value) {
case 1:
        prepare();
        __attribute__((fallthrough));
case 2:
        process();
        break;
}
```

## 줄 길이

- **권장**: 80자
- **허용**: 100자 (가독성이 나아지는 경우)
- **예외**: 문자열 리터럴, printk 등

```c
// Good: 80자 이내
ret = function_name(arg1, arg2, arg3);

// 필요시 줄바꿈
ret = very_long_function_name(argument_one,
                              argument_two,
                              argument_three);

// 문자열은 끊지 않는다 (grep 검색을 위해)
printk(KERN_WARNING "This is a very long warning message that exceeds 80 characters\n");
```

## 공백

### 키워드 뒤

```c
// Good: 키워드 뒤에 공백
if (condition)
for (i = 0; i < n; i++)
while (condition)
switch (value)
return value;

// Bad: 공백 없음
if(condition)
for(i=0;i<n;i++)
```

### 함수 호출

```c
// Good: 함수명과 괄호 사이에 공백 없음
function(arg1, arg2);
sizeof(struct file);

// Bad
function (arg1, arg2);
sizeof (struct file);
```

### 연산자

```c
// Good: 이항 연산자 주위에 공백
x = a + b;
y = c * d;
if (a == b)

// Good: 단항 연산자는 붙여서
i++;
--j;
*ptr = value;
&variable;
!flag;
~bits;

// Good: 구조체 멤버 접근은 붙여서
ptr->member;
obj.field;
```

## 정리

| 항목 | 규칙 |
|------|------|
| 들여쓰기 | 8-space tabs |
| 함수 brace | 다음 줄에 |
| 제어문 brace | 같은 줄에 |
| 단일 문장 | brace 생략 |
| switch-case | 같은 열 정렬 |
| 줄 길이 | 80자 (100자 허용) |

---

다음 장에서는 **Naming & Typedefs**를 다룬다. 소문자_밑줄 규칙과 typedef를 절제해야 하는 이유를 살펴본다.
