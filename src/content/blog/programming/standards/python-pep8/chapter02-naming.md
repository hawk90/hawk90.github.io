---
title: "Ch 2: Naming Conventions"
date: 2026-05-18T02:00:00
description: "snake_case 함수/변수, PascalCase 클래스, UPPER_CASE 상수. _private, __mangled."
tags: [Python, PEP8, Naming, Conventions, snake_case]
series: "Python Style Guide (PEP 8)"
seriesOrder: 2
draft: true
---

> "Naming conventions make code more readable."

## 기본 규칙

### 스타일 요약

| 타입 | 스타일 | 예시 |
|------|--------|------|
| 변수, 함수, 메서드 | snake_case | `my_variable`, `calculate_total` |
| 클래스 | PascalCase | `MyClass`, `HttpClient` |
| 상수 | UPPER_CASE | `MAX_SIZE`, `DEFAULT_TIMEOUT` |
| 모듈, 패키지 | lowercase | `mymodule`, `mypackage` |

### 변수와 함수

```python
# Good: snake_case
user_name = "Alice"
total_count = 42

def calculate_total(items):
    return sum(items)

def get_user_by_id(user_id):
    pass

# Bad: 다른 스타일
userName = "Alice"  # camelCase
TotalCount = 42     # PascalCase
def CalculateTotal(items):  # PascalCase
    pass
```

### 클래스

```python
# Good: PascalCase (CapWords)
class UserProfile:
    pass

class HttpRequestHandler:
    pass

class XMLParser:
    pass

# Bad
class user_profile:  # snake_case
    pass

class Userprofile:  # 단어 구분 없음
    pass
```

### 상수

```python
# Good: UPPER_CASE
MAX_CONNECTIONS = 100
DEFAULT_TIMEOUT = 30
PI = 3.14159
DATABASE_URL = "postgresql://localhost/db"

# 모듈 레벨에 정의
# 클래스 내부에도 사용 가능
class Config:
    MAX_RETRIES = 3
    DEBUG = False
```

## 특수 명명

### 접두사/접미사

```python
# _single_leading_underscore: 약한 내부 사용
class MyClass:
    def _internal_method(self):
        """내부에서만 사용하는 메서드"""
        pass

    _internal_attribute = "private"

# __double_leading_underscore: 이름 맹글링
class MyClass:
    def __private_method(self):
        """_MyClass__private_method로 변환됨"""
        pass

    __private_attr = "mangled"

# __double_leading_and_trailing__: 매직 메서드
class MyClass:
    def __init__(self):
        pass

    def __str__(self):
        return "MyClass instance"

    def __len__(self):
        return 0
```

### 이름 맹글링 (Name Mangling)

```python
class Parent:
    def __init__(self):
        self.__private = "parent private"
        self._protected = "parent protected"

class Child(Parent):
    def __init__(self):
        super().__init__()
        self.__private = "child private"  # 별도의 속성

# 맹글링 결과
child = Child()
print(child._Parent__private)  # "parent private"
print(child._Child__private)   # "child private"
print(child._protected)        # "parent protected"
```

### 단일 밑줄

```python
# 임시 변수 또는 무시
for _ in range(10):
    do_something()

# 언패킹에서 무시
x, _, z = (1, 2, 3)

# 마지막 표현식 결과 (REPL)
>>> 1 + 2
3
>>> _
3
```

## 함수/메서드 명명

### 동사 + 명사

```python
# Good: 동작을 설명
def get_user(user_id):
    pass

def calculate_total(items):
    pass

def is_valid(data):
    pass

def has_permission(user, action):
    pass

def send_email(recipient, subject, body):
    pass

# Bad: 모호한 이름
def process(x):  # 무엇을 처리?
    pass

def do_it():  # 무엇을?
    pass
```

### Boolean 반환

```python
# is_, has_, can_, should_ 접두사
def is_empty(container):
    return len(container) == 0

def has_permission(user, resource):
    return user.role in resource.allowed_roles

def can_edit(user, document):
    return document.owner == user

def should_retry(error):
    return error.is_transient
```

### 접근자 (Getters/Setters)

```python
# Python에서는 property 사용 권장
class User:
    def __init__(self, name):
        self._name = name

    @property
    def name(self):
        return self._name

    @name.setter
    def name(self, value):
        if not value:
            raise ValueError("Name cannot be empty")
        self._name = value

# 사용
user = User("Alice")
print(user.name)      # getter
user.name = "Bob"     # setter
```

## 클래스 명명

### 명사 사용

```python
# Good: 명사 또는 명사구
class User:
    pass

class HttpRequest:
    pass

class DatabaseConnection:
    pass

class EmailValidator:
    pass

# Bad: 동사로 시작
class ValidateEmail:  # EmailValidator가 나음
    pass

class CreateUser:  # UserFactory가 나음
    pass
```

### 예외 클래스

```python
# Error 접미사 사용
class ValidationError(Exception):
    pass

class DatabaseError(Exception):
    pass

class AuthenticationError(Exception):
    pass

# Warning도 마찬가지
class DeprecationWarning(Warning):
    pass
```

## 모듈과 패키지

### 짧고 소문자

```python
# Good
import mymodule
import utils
import database
from mypackage import submodule

# 가능하면 밑줄 피하기
import my_long_module_name  # 허용되지만...
import mylongmodulename     # 이것도 허용

# Bad
import MyModule  # 대문자
import My_Module  # 혼합
```

### 패키지 구조

```text
mypackage/
├── __init__.py
├── core.py
├── utils.py
├── subpackage/
│   ├── __init__.py
│   └── module.py
```

## 피해야 할 이름

### 예약어와 충돌

```python
# Bad: 내장 함수 섀도잉
list = [1, 2, 3]      # 내장 list를 덮어씀
dict = {"a": 1}       # 내장 dict를 덮어씀
id = 42               # 내장 id를 덮어씀

# Good: 다른 이름 사용
items = [1, 2, 3]
data = {"a": 1}
user_id = 42

# 불가피할 때: 밑줄 접미사
class_ = "my-class"
type_ = "button"
```

### 혼란스러운 문자

```python
# 피해야 할 단일 문자
l  # 소문자 L (숫자 1과 혼동)
O  # 대문자 O (숫자 0과 혼동)
I  # 대문자 I (소문자 l, 숫자 1과 혼동)

# 허용되는 단일 문자
i, j, k  # 루프 인덱스
x, y, z  # 좌표
n        # 개수
```

### 축약어

```python
# Bad: 과도한 축약
def calc_avg(nums):
    pass

usr = "Alice"
btn_clk_cnt = 0

# Good: 명확한 이름
def calculate_average(numbers):
    pass

user = "Alice"
button_click_count = 0

# 허용되는 일반적인 축약어
max, min, len, str, int
id, url, html, xml, json
db, io, os
```

## 정리

| 타입 | 스타일 | 접두사/접미사 |
|------|--------|---------------|
| 변수 | snake_case | _ (내부용) |
| 함수 | snake_case | is_, has_, get_ |
| 클래스 | PascalCase | - |
| 예외 | PascalCase | Error |
| 상수 | UPPER_CASE | - |
| 매직 메서드 | snake_case | __ ... __ |
| 내부 | snake_case | _ 또는 __ |

---

다음 장에서는 **Imports**를 다룬다. import 순서, 그룹핑, 절대 경로 규칙을 살펴본다.
