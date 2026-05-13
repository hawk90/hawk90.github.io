---
title: "Ch 4: Expressions & Statements"
date: 2025-05-14T14:00:00
description: "공백 규칙, 연산자 우선순위, 비교문 스타일. None 비교, 예외 처리."
tags: [Python, PEP8, Expressions, Statements, Operators]
series: "Python Style Guide (PEP 8)"
seriesOrder: 4
draft: false
---

> "Whitespace in Expressions and Statements"

## 공백 규칙

### 괄호 안 공백

```python
# Good
spam(ham[1], {eggs: 2})
foo = (0,)

# Bad: 불필요한 공백
spam( ham[ 1 ], { eggs: 2 } )
foo = ( 0, )
```

### 쉼표 뒤 공백

```python
# Good
x, y = 1, 2
my_list = [1, 2, 3]
my_dict = {"a": 1, "b": 2}

# Bad
x,y = 1,2
my_list = [1,2,3]
my_dict = {"a":1,"b":2}
```

### 콜론 공백

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

### 슬라이스 공백

```python
# Good: 콜론 양쪽 균형
ham[1:9]
ham[1:9:3]
ham[:9:3]
ham[1::3]
ham[1:9:]

ham[lower:upper]
ham[lower:upper:]
ham[lower::step]
ham[lower + offset : upper + offset]

# Bad
ham[lower + offset:upper + offset]
ham[1: 9]
ham[1 :9]
```

### 함수 호출 공백

```python
# Good
spam(1)
dct["key"]
lst[index]

# Bad: 괄호 앞 공백
spam (1)
dct ["key"]
lst [index]
```

## 연산자 공백

### 할당 연산자

```python
# Good
x = 1
y = 2
long_variable = 3

# Bad: 정렬을 위한 추가 공백
x             = 1
y             = 2
long_variable = 3
```

### 키워드 인자

```python
# Good: 키워드 인자에서 = 주위에 공백 없음
def function(arg1, arg2, kwarg=None):
    pass

function(1, 2, kwarg="value")

# Bad
def function(arg1, arg2, kwarg = None):
    pass

function(1, 2, kwarg = "value")

# 예외: 타입 힌트가 있는 경우
def function(arg: int = 0, name: str = "default"):
    pass
```

### 이항 연산자

```python
# Good: 낮은 우선순위 연산자 주위에 공백
i = i + 1
submitted += 1
x = x*2 - 1
hypot2 = x*x + y*y
c = (a+b) * (a-b)

# 권장: 모든 이항 연산자에 공백
i = i + 1
x = x * 2 - 1
hypot2 = x * x + y * y
c = (a + b) * (a - b)
```

### 연산자 우선순위

```python
# Good: 우선순위가 다른 연산자 구분
income = gross_wages + taxable_interest - ira_deduction
x = x*2 - 1  # 곱셈이 빼기보다 높은 우선순위

# 권장 (더 명확)
income = gross_wages + taxable_interest - ira_deduction
x = x * 2 - 1
```

## 비교문

### None 비교

```python
# Good: is/is not 사용
if foo is None:
    pass

if foo is not None:
    pass

# Bad: == 사용
if foo == None:
    pass

if foo != None:
    pass
```

### Boolean 비교

```python
# Good: 암시적 불리언 평가
if my_list:
    pass

if not my_list:
    pass

if value:
    pass

# Bad: 명시적 비교
if my_list == []:
    pass

if len(my_list) == 0:
    pass

if value == True:
    pass

if value is True:  # 이것도 피함
    pass
```

### 존재 확인

```python
# Good
if key in my_dict:
    pass

if item not in my_list:
    pass

# Bad
if not key in my_dict:
    pass
```

### 체이닝 비교

```python
# Good: 체이닝
if 0 <= x < 10:
    pass

if a < b < c:
    pass

# Bad: 분리
if x >= 0 and x < 10:
    pass

if a < b and b < c:
    pass
```

### 타입 체크

```python
# Good: isinstance 사용
if isinstance(obj, int):
    pass

if isinstance(obj, (int, float)):
    pass

# Bad: type() 비교
if type(obj) == int:
    pass

if type(obj) is int:  # 서브클래스 무시됨
    pass
```

## 예외 처리

### 구체적인 예외

```python
# Good: 구체적인 예외
try:
    value = my_dict[key]
except KeyError:
    value = default_value

# Bad: 베어 except
try:
    value = my_dict[key]
except:  # 모든 예외 캐치 (KeyboardInterrupt 포함)
    value = default_value

# Bad: 너무 넓은 Exception
try:
    value = my_dict[key]
except Exception:  # 너무 넓음
    value = default_value
```

### 예외 변수

```python
# Python 3 스타일
try:
    process()
except ValueError as e:
    logger.error(f"Value error: {e}")
    raise

# 여러 예외
try:
    process()
except (TypeError, ValueError) as e:
    handle_error(e)
```

### 리소스 정리

```python
# Good: context manager 사용
with open("file.txt") as f:
    content = f.read()

# Good: finally 블록
resource = acquire_resource()
try:
    process(resource)
finally:
    release_resource(resource)

# Better: contextlib 사용
from contextlib import contextmanager

@contextmanager
def managed_resource():
    resource = acquire_resource()
    try:
        yield resource
    finally:
        release_resource(resource)
```

## 반환문

### 일관된 return

```python
# Good: 일관된 반환
def get_value(x):
    if x > 0:
        return x
    return None  # 명시적

# Good: 또는 return 없음
def process_value(x):
    if x > 0:
        do_something(x)
        return
    do_other_thing(x)

# Bad: 불일치
def get_value(x):
    if x > 0:
        return x
    # 암시적 None 반환
```

### 단일 표현식 반환

```python
# Good
def absolute(x):
    return x if x >= 0 else -x

# Good: 복잡하면 분리
def calculate(x, y):
    if x > 0:
        result = x * y
    else:
        result = x + y
    return result
```

## 컴프리헨션

### 가독성 유지

```python
# Good: 간단한 컴프리헨션
squares = [x**2 for x in range(10)]
even_squares = [x**2 for x in range(10) if x % 2 == 0]

# Good: 여러 줄로 나누기
result = [
    transform(x)
    for x in data
    if condition(x)
]

# Bad: 너무 복잡
result = [transform(x) for x in data if condition1(x) and condition2(x) for y in other_data if match(x, y)]

# Better: 일반 루프 사용
result = []
for x in data:
    if condition1(x) and condition2(x):
        for y in other_data:
            if match(x, y):
                result.append(transform(x))
```

## 정리

| 항목 | 규칙 |
|------|------|
| 괄호 안 | 공백 없음 |
| 쉼표 뒤 | 공백 있음 |
| 연산자 | 양쪽 공백 (우선순위 고려) |
| None 비교 | is / is not |
| Boolean | 암시적 평가 |
| 예외 | 구체적으로 |
| return | 일관성 유지 |

---

다음 장에서는 **Comments & Docstrings**를 다룬다. 주석 스타일, PEP 257, Google 스타일 docstring을 살펴본다.
