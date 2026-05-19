---
title: "Ch 1: Code Layout"
date: 2026-05-18T01:00:00
description: "4-space 들여쓰기, 79자 줄 길이, 빈 줄 규칙. 연속 줄, 닫는 괄호 정렬."
tags: [Python, PEP8, Indentation, Layout, Formatting]
series: "Python Style Guide (PEP 8)"
seriesOrder: 1
draft: false
---

> "Use 4 spaces per indentation level."

## 들여쓰기

### 4-Space 규칙

```python
# Good: 4칸 스페이스
def function():
    if condition:
        do_something()
        do_another_thing()

# Bad: 탭 또는 2칸
def function():
  if condition:  # 2칸 — 틀림
	do_something()  # 탭 — 틀림
```

### 연속 줄 (Continuation Lines)

```python
# 방법 1: 여는 괄호에 맞춤
result = function_name(argument_one,
                       argument_two,
                       argument_three)

# 방법 2: 행잉 인덴트 (4칸 추가)
result = function_name(
    argument_one,
    argument_two,
    argument_three,
)

# 방법 3: 행잉 인덴트 (구분을 위해 추가 들여쓰기)
def long_function_name(
        var_one, var_two, var_three,
        var_four):
    print(var_one)
```

### 닫는 괄호 위치

```python
# 방법 1: 마지막 요소와 같은 줄
my_list = [
    1, 2, 3,
    4, 5, 6]

# 방법 2: 첫 문자 아래에 정렬 (권장)
my_list = [
    1, 2, 3,
    4, 5, 6,
]
```

### if 문 들여쓰기

```python
# 문제: if와 본문의 구분이 어렵다
if (this_is_one_thing and
    that_is_another_thing):
    do_something()

# 해결 1: 주석으로 구분
if (this_is_one_thing and
    that_is_another_thing):
    # Both conditions are true
    do_something()

# 해결 2: 추가 들여쓰기
if (this_is_one_thing
        and that_is_another_thing):
    do_something()
```

## 줄 길이

### 79자 규칙

```python
# 코드: 최대 79자
# 주석/문서화 문자열: 최대 72자

# Good
result = calculate_total(
    first_item, second_item, third_item
)

# Bad: 79자 초과
result = calculate_total(first_item, second_item, third_item, fourth_item, fifth_item)
```

### 줄 나누기

```python
# 괄호 안에서 자연스럽게 나누기
income = (gross_wages
          + taxable_interest
          + (dividends - qualified_dividends)
          - ira_deduction
          - student_loan_interest)

# 백슬래시 피하기 (괄호 사용)
# Bad
with open('/path/to/file') as file_one, \
     open('/path/to/other') as file_two:
    pass

# Good
with (
    open('/path/to/file') as file_one,
    open('/path/to/other') as file_two,
):
    pass
```

### 이항 연산자 줄 나누기

```python
# Good: 연산자 앞에서 나누기 (권장)
income = (gross_wages
          + taxable_interest
          + dividends
          - ira_deduction)

# Acceptable: 연산자 뒤에서 나누기
income = (gross_wages +
          taxable_interest +
          dividends -
          ira_deduction)
```

## 빈 줄

### 최상위 정의

```python
# 함수/클래스 사이: 2줄
def function_one():
    pass


def function_two():
    pass


class MyClass:
    pass
```

### 클래스 내부

```python
class MyClass:
    """Class docstring."""

    # 메서드 사이: 1줄
    def method_one(self):
        pass

    def method_two(self):
        pass
```

### 함수 내부

```python
def function():
    # 논리적 섹션을 빈 줄로 구분
    # 하지만 남용하지 말 것

    first_part = do_something()
    process(first_part)

    second_part = do_another()
    finalize(second_part)

    return result
```

## Imports

### 한 줄에 하나씩

```python
# Good
import os
import sys

# Bad
import os, sys

# 예외: from import
from subprocess import Popen, PIPE
```

### 그룹과 순서

```python
# 1. 표준 라이브러리
import os
import sys

# 2. 서드파티 라이브러리
import numpy as np
import pandas as pd

# 3. 로컬 모듈
from myproject import utils
from myproject.models import User
```

### 절대 경로 선호

```python
# Good: 절대 경로
from mypackage.mymodule import myfunction

# Acceptable: 명시적 상대 경로
from . import sibling_module
from .sibling import function

# Bad: 암시적 상대 경로 (Python 3에서 제거됨)
import sibling_module  # 현재 패키지에서 찾으려 함
```

### 와일드카드 피하기

```python
# Bad: 네임스페이스 오염
from module import *

# Good: 명시적 import
from module import specific_function, SpecificClass
```

## 문자열 따옴표

### 일관성

```python
# PEP 8: 일관성만 유지하면 됨
# 작은따옴표 또는 큰따옴표 중 하나 선택

# 선택 1: 작은따옴표
name = 'Alice'
message = 'Hello, World!'

# 선택 2: 큰따옴표
name = "Alice"
message = "Hello, World!"

# 따옴표 안에 따옴표
quote = "He said, 'Hello!'"
quote = 'He said, "Hello!"'
```

### 삼중 따옴표

```python
# 문서화 문자열: 큰따옴표
def function():
    """This is a docstring."""
    pass

# 여러 줄 문자열
text = """
This is a
multi-line string.
"""
```

## 공백

### 괄호 안

```python
# Good
spam(ham[1], {eggs: 2})

# Bad
spam( ham[ 1 ], { eggs: 2 } )
```

### 콤마, 콜론, 세미콜론

```python
# Good
if x == 4:
    print(x, y)
x, y = y, x

# Bad
if x == 4 :
    print(x , y)
x , y = y , x
```

### 슬라이스

```python
# Good
ham[1:9], ham[1:9:3], ham[:9:3], ham[1::3]
ham[lower:upper], ham[lower:upper:]
ham[lower + offset : upper + offset]

# Bad
ham[lower + offset:upper + offset]
ham[1: 9], ham[1 :9], ham[1 : 9]
```

### 함수 호출과 인덱싱

```python
# Good
spam(1)
dct['key']
lst[index]

# Bad
spam (1)
dct ['key']
lst [index]
```

## 정리

| 항목 | 규칙 |
|------|------|
| 들여쓰기 | 4 spaces |
| 줄 길이 | 79자 (코드), 72자 (주석) |
| 함수/클래스 간격 | 2줄 |
| 메서드 간격 | 1줄 |
| Import | 한 줄에 하나, 절대 경로 |
| 괄호 안 공백 | 없음 |

---

다음 장에서는 **Naming Conventions**를 다룬다. snake_case, CamelCase, UPPER_CASE 규칙을 살펴본다.
