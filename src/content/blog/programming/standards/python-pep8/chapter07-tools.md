---
title: "Ch 7: Tools"
date: 2025-05-14T07:00:00
description: "Black, flake8, mypy, isort, ruff. 자동 포맷팅, 린팅, 타입 체크 도구 체인."
tags: [Python, PEP8, Black, flake8, mypy, ruff, Tools]
series: "Python Style Guide (PEP 8)"
seriesOrder: 7
draft: false
---

> "Let tools do the work."

## Black: 코드 포맷터

### 설치 및 사용

```bash
# 설치
pip install black

# 포맷팅
black myfile.py
black src/

# 검사만 (변경 없음)
black --check myfile.py

# 차이점 보기
black --diff myfile.py
```

### 설정

```toml
# pyproject.toml
[tool.black]
line-length = 88
target-version = ['py312']
include = '\.pyi?$'
extend-exclude = '''
/(
    \.eggs
    | \.git
    | \.mypy_cache
    | \.venv
    | build
    | dist
)/
'''
```

### 포맷팅 예시

```python
# Before
def long_function(argument_one,argument_two,argument_three,argument_four):
    return argument_one+argument_two+argument_three+argument_four

# After (Black)
def long_function(
    argument_one,
    argument_two,
    argument_three,
    argument_four,
):
    return argument_one + argument_two + argument_three + argument_four
```

### fmt: off/on

```python
# 특정 부분 제외
# fmt: off
matrix = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
]
# fmt: on

# 한 줄 제외
result = [1,2,3,4,5]  # fmt: skip
```

## flake8: 린터

### 설치 및 사용

```bash
# 설치
pip install flake8

# 실행
flake8 myfile.py
flake8 src/

# 특정 에러만
flake8 --select=E,W myfile.py

# 특정 에러 무시
flake8 --ignore=E501 myfile.py
```

### 설정

```ini
# .flake8 또는 setup.cfg
[flake8]
max-line-length = 88
extend-ignore = E203, E501, W503
exclude =
    .git,
    __pycache__,
    build,
    dist,
    .venv
per-file-ignores =
    __init__.py: F401
```

### 일반적인 에러 코드

```
E1**: 들여쓰기
E101: 탭과 스페이스 혼합
E111: 들여쓰기가 4의 배수 아님

E2**: 공백
E201: 괄호 뒤 불필요한 공백
E203: 콜론 앞 불필요한 공백
E225: 연산자 주위 공백 누락

E3**: 빈 줄
E301: 함수 정의 전 빈 줄 필요
E302: 함수 정의 사이 2줄 필요

E4**: Import
E401: 한 줄에 여러 import
E402: 모듈 레벨 import가 맨 위 아님

E5**: 줄 길이
E501: 줄이 너무 김 (79자 초과)

W**: 경고
W503: 이항 연산자 앞 줄 바꿈

F**: Pyflakes
F401: import 했지만 사용 안 함
F841: 변수 할당 후 사용 안 함
```

## mypy: 타입 체커

### 설치 및 사용

```bash
# 설치
pip install mypy

# 실행
mypy myfile.py
mypy src/

# 엄격 모드
mypy --strict myfile.py

# 특정 에러 무시
mypy --ignore-missing-imports myfile.py
```

### 설정

```toml
# pyproject.toml
[tool.mypy]
python_version = "3.12"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
disallow_incomplete_defs = true
check_untyped_defs = true
no_implicit_optional = true
warn_redundant_casts = true
warn_unused_ignores = true
show_error_codes = true

[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false
```

### 인라인 무시

```python
# 한 줄 무시
x = problematic_function()  # type: ignore

# 특정 에러만 무시
x = func()  # type: ignore[arg-type]

# 여러 에러 무시
x = func()  # type: ignore[arg-type, return-value]
```

## isort: Import 정렬

### 설치 및 사용

```bash
# 설치
pip install isort

# 정렬
isort myfile.py
isort src/

# 검사만
isort --check-only myfile.py

# 차이점 보기
isort --diff myfile.py
```

### 설정

```toml
# pyproject.toml
[tool.isort]
profile = "black"
line_length = 88
multi_line_output = 3
include_trailing_comma = true
force_grid_wrap = 0
use_parentheses = true
ensure_newline_before_comments = true
known_first_party = ["mypackage"]
```

### 정렬 예시

```python
# Before
from mypackage import utils
import sys
from collections import OrderedDict
import numpy as np
import os

# After (isort)
import os
import sys
from collections import OrderedDict

import numpy as np

from mypackage import utils
```

## ruff: 올인원 린터

### 설치 및 사용

```bash
# 설치
pip install ruff

# 린팅
ruff check myfile.py
ruff check src/

# 자동 수정
ruff check --fix myfile.py

# 포맷팅 (Black 대체)
ruff format myfile.py
```

### 설정

```toml
# pyproject.toml
[tool.ruff]
line-length = 88
target-version = "py312"

[tool.ruff.lint]
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # Pyflakes
    "I",   # isort
    "B",   # flake8-bugbear
    "C4",  # flake8-comprehensions
    "UP",  # pyupgrade
]
ignore = [
    "E501",  # line too long (handled by formatter)
]

[tool.ruff.lint.per-file-ignores]
"__init__.py" = ["F401"]
"tests/*" = ["S101"]

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
```

### ruff의 장점

```
속도: Rust로 작성, flake8보다 10-100배 빠름
통합: flake8 + isort + pyupgrade + 더 많은 도구
호환: pyproject.toml로 통합 설정
```

## pre-commit: Git 훅

### 설치 및 설정

```bash
# 설치
pip install pre-commit
```

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.6
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.7.1
    hooks:
      - id: mypy
        additional_dependencies: [types-requests]
```

### 사용

```bash
# 훅 설치
pre-commit install

# 수동 실행
pre-commit run --all-files

# 특정 훅만
pre-commit run ruff --all-files
```

## 통합 설정

### pyproject.toml

```toml
[tool.black]
line-length = 88
target-version = ['py312']

[tool.isort]
profile = "black"

[tool.mypy]
python_version = "3.12"
strict = true

[tool.ruff]
line-length = 88
select = ["E", "W", "F", "I", "B", "C4", "UP"]

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-v --cov=src"
```

### Makefile

```makefile
.PHONY: lint format typecheck test

lint:
	ruff check src tests

format:
	ruff format src tests

typecheck:
	mypy src

test:
	pytest

check: lint typecheck test

fix:
	ruff check --fix src tests
	ruff format src tests
```

### CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: pip install ruff mypy pytest

      - name: Lint
        run: ruff check src tests

      - name: Format check
        run: ruff format --check src tests

      - name: Type check
        run: mypy src

      - name: Test
        run: pytest
```

## 도구 비교

| 도구 | 목적 | 대체 가능 |
|------|------|-----------|
| Black | 포맷팅 | ruff format |
| isort | Import 정렬 | ruff (I) |
| flake8 | 린팅 | ruff |
| pylint | 린팅 | ruff |
| mypy | 타입 체크 | pyright |
| ruff | 올인원 | 위의 대부분 |

## 권장 도구 체인

```
현재 권장 (ruff 통합):
- ruff: 린팅 + 포맷팅 + Import 정렬 (단일 도구로 통합)
- mypy 또는 pyright: 타입 체크
- pre-commit: Git 훅

전통적 (개별 도구 조합):
- black: 포맷팅
- isort: Import 정렬
- flake8: 린팅
- mypy: 타입 체크
- pre-commit: Git 훅
```

---

이것으로 **Python Style Guide (PEP 8)** 시리즈를 마친다. 도구를 적극 활용하여 일관된 코드 스타일을 유지하자.
