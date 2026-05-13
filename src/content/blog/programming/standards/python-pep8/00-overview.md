---
title: "Python Style Guide (PEP 8) — 시리즈 개요"
date: 2025-05-14T10:00:00
description: "PEP 8 — Guido van Rossum의 Python 코딩 스타일. 4-space 들여쓰기, snake_case, 명확한 가독성."
tags: [Python, PEP8, Style-Guide, Standards, Series]
series: "Python Style Guide (PEP 8)"
seriesOrder: 0
draft: false
---

> "Readability counts."
> — The Zen of Python

## PEP 8이란?

**PEP 8**은 Python Enhancement Proposal #8로, Python 코드의 공식 스타일 가이드다. Guido van Rossum이 작성했으며, Python 표준 라이브러리의 코딩 규칙을 정의한다.

```
PEP 8     ── Python 표준 스타일
PEP 257   ── Docstring 규칙
PEP 484   ── Type Hints
PEP 20    ── The Zen of Python (철학)
```

## 핵심 원칙

### 1. 가독성이 최우선

```python
# Bad: 압축된 코드
x=y+z;a=b*c;return x+a

# Good: 명확한 코드
result = first_value + second_value
product = base * multiplier
return result + product
```

### 2. 일관성 > 개인 취향

```python
# 프로젝트 전체에서 일관된 스타일 유지
# 기존 코드와 충돌하면 — 기존 스타일을 따른다
```

### 3. 특수한 경우는 규칙을 깰 만큼 특수하지 않다

```python
# 예외를 만들지 말고, 규칙을 따른다
# 하지만 — 가독성을 해치면 규칙을 깨도 된다
```

## The Zen of Python

```python
>>> import this

Beautiful is better than ugly.
Explicit is better than implicit.
Simple is better than complex.
Complex is better than complicated.
Flat is better than nested.
Sparse is better than dense.
Readability counts.
Special cases aren't special enough to break the rules.
Although practicality beats purity.
Errors should never pass silently.
Unless explicitly silenced.
In the face of ambiguity, refuse the temptation to guess.
There should be one-- and preferably only one --obvious way to do it.
Although that way may not be obvious at first unless you're Dutch.
Now is better than never.
Although never is often better than *right* now.
If the implementation is hard to explain, it's a bad idea.
If the implementation is easy to explain, it may be a good idea.
Namespaces are one honking great idea -- let's do more of those!
```

## 시리즈 구성

| 장 | 제목 | 핵심 |
|:--:|------|------|
| 1 | Code Layout | 4-space, 79자, 빈 줄 |
| 2 | Naming Conventions | snake_case, UPPER_CASE |
| 3 | Imports | 순서, 그룹핑, 절대 경로 |
| 4 | Expressions & Statements | 공백, 연산자, 비교 |
| 5 | Comments & Docstrings | 인라인, 블록, PEP 257 |
| 6 | Type Hints | PEP 484, 타입 어노테이션 |
| 7 | Tools | Black, flake8, mypy |

## 다른 스타일과 비교

| 항목 | PEP 8 | Google Python | Black |
|------|-------|---------------|-------|
| 들여쓰기 | 4 spaces | 4 spaces | 4 spaces |
| 줄 길이 | 79 (권장) | 80 | 88 |
| 따옴표 | 일관성 | " 선호 | " 강제 |
| 트레일링 콤마 | 선택 | 권장 | 강제 |

## 원문 출처

- [PEP 8 - Style Guide for Python Code](https://peps.python.org/pep-0008/)
- [PEP 257 - Docstring Conventions](https://peps.python.org/pep-0257/)
- [PEP 484 - Type Hints](https://peps.python.org/pep-0484/)

## 언제 규칙을 깨도 되는가?

PEP 8을 따르지 않아도 되는 경우:

1. **가독성이 떨어질 때**: 규칙을 따르면 오히려 읽기 어려워질 때
2. **기존 코드와의 일관성**: 주변 코드가 다른 스타일을 사용할 때
3. **하위 호환성**: 오래된 Python 버전을 지원해야 할 때

```python
# 예: 수학 공식은 수학적 표기를 따를 수 있다
# PEP 8 위반이지만 가독성이 더 좋다
x = x*2 - 1
y = (a+b) * (a-b)
```

## 도구 체인

```bash
# 스타일 검사
flake8 my_code.py

# 자동 포맷팅
black my_code.py

# 타입 검사
mypy my_code.py

# import 정렬
isort my_code.py

# 린터 통합
pylint my_code.py
ruff check my_code.py
```

---

다음 장에서는 **Code Layout**을 다룬다. 들여쓰기, 줄 길이, 빈 줄 규칙을 살펴본다.
