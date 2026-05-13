---
title: "Ch 3: Imports"
date: 2025-05-14T13:00:00
description: "Import 순서와 그룹핑. 절대 경로 선호, 와일드카드 피하기. isort로 자동 정렬."
tags: [Python, PEP8, Imports, Modules, isort]
series: "Python Style Guide (PEP 8)"
seriesOrder: 3
draft: false
---

> "Imports should usually be on separate lines."

## 기본 규칙

### 한 줄에 하나씩

```python
# Good
import os
import sys
import json

# Bad
import os, sys, json

# 예외: from import
from collections import OrderedDict, defaultdict
from typing import List, Dict, Optional
```

### Import 위치

```python
"""모듈 문서화 문자열."""

# 1. __future__ imports (Python 2/3 호환)
from __future__ import annotations

# 2. 표준 라이브러리
import os
import sys

# 3. 서드파티 라이브러리
import numpy as np
import pandas as pd

# 4. 로컬 모듈
from mypackage import utils
from mypackage.models import User

# 그룹 사이에 빈 줄
```

## Import 그룹

### 표준 라이브러리

```python
# 알파벳 순서
import collections
import functools
import itertools
import json
import os
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
```

### 서드파티 라이브러리

```python
# pip로 설치한 패키지
import numpy as np
import pandas as pd
import requests
from flask import Flask, request, jsonify
from sqlalchemy import Column, Integer, String
```

### 로컬 모듈

```python
# 프로젝트 내 모듈
from myproject.config import settings
from myproject.models import User, Post
from myproject.utils import helper_function
from . import sibling_module
from .submodule import specific_function
```

## 절대 경로 vs 상대 경로

### 절대 경로 (권장)

```python
# 명확하고 읽기 쉬움
from mypackage.subpackage.module import function
from mypackage.utils import helper

# 프로젝트 구조
# mypackage/
# ├── __init__.py
# ├── utils.py
# └── subpackage/
#     ├── __init__.py
#     └── module.py
```

### 명시적 상대 경로

```python
# 같은 패키지 내에서
# mypackage/subpackage/module.py 에서

from . import sibling           # mypackage.subpackage.sibling
from .sibling import function   # mypackage.subpackage.sibling.function
from .. import parent_module    # mypackage.parent_module
from ..other import something   # mypackage.other.something
```

### 상대 경로 사용 시점

```python
# 상대 경로가 적합한 경우:
# 1. 패키지 내부 모듈 간 import
# 2. 패키지 이름이 바뀔 가능성이 있을 때
# 3. 재배포 가능한 패키지

# submodule.py
from . import utils  # 같은 패키지의 utils
from .models import User  # 같은 패키지의 models.User
```

## 와일드카드 Import

### 피해야 하는 이유

```python
# Bad: 네임스페이스 오염
from module import *

# 문제점:
# 1. 어떤 이름이 import되었는지 불명확
# 2. 이름 충돌 가능성
# 3. 코드 분석 도구가 추적 불가
# 4. 리팩토링이 어려움
```

### 명시적 Import

```python
# Good: 명시적으로 나열
from collections import OrderedDict, defaultdict, Counter
from typing import List, Dict, Optional, Union, Callable

# 너무 길면 여러 줄로
from typing import (
    Any,
    Callable,
    Dict,
    List,
    Optional,
    Tuple,
    Union,
)
```

### __all__ 정의

```python
# 모듈에서 export할 이름 정의
# mymodule.py

__all__ = ['public_function', 'PublicClass']

def public_function():
    pass

def _private_function():
    pass

class PublicClass:
    pass

class _PrivateClass:
    pass

# from mymodule import * 시
# public_function, PublicClass만 import됨
```

## Import 별칭

### 일반적인 별칭

```python
# 널리 사용되는 관례
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import tensorflow as tf
import seaborn as sns

# tkinter
import tkinter as tk
from tkinter import ttk
```

### 이름 충돌 해결

```python
# 같은 이름의 다른 모듈
from datetime import datetime
from mymodule import datetime as custom_datetime

# 긴 이름 축약
from mypackage.subpackage.module import VeryLongClassName as VLCN
```

### 피해야 할 별칭

```python
# Bad: 혼란스러운 별칭
import os as operating_system  # 불필요하게 길음
import json as j  # 너무 짧음
from collections import OrderedDict as od  # 불명확

# Good: 명확한 별칭만
import numpy as np  # 관례
from typing import Optional as Opt  # 허용 (타입 힌트에서)
```

## Import 순서 도구: isort

### 설정

```ini
# pyproject.toml
[tool.isort]
profile = "black"
line_length = 88
multi_line_output = 3
include_trailing_comma = true
force_grid_wrap = 0
use_parentheses = true
ensure_newline_before_comments = true

# 커스텀 섹션
known_first_party = ["mypackage"]
known_third_party = ["numpy", "pandas", "requests"]
```

### 사용법

```bash
# 검사
isort --check-only myfile.py

# 자동 정렬
isort myfile.py

# 프로젝트 전체
isort .

# diff 보기
isort --diff myfile.py
```

### 정렬 전/후

```python
# Before
from mypackage import utils
import sys
from collections import OrderedDict
import numpy as np
import os

# After (isort 적용)
import os
import sys
from collections import OrderedDict

import numpy as np

from mypackage import utils
```

## 순환 Import 방지

### 문제 상황

```python
# module_a.py
from module_b import function_b

def function_a():
    return function_b()

# module_b.py
from module_a import function_a  # 순환!

def function_b():
    return function_a()
```

### 해결 방법

```python
# 방법 1: 지역 import
# module_a.py
def function_a():
    from module_b import function_b  # 함수 내에서 import
    return function_b()

# 방법 2: 구조 재설계
# common.py에 공통 코드 분리

# 방법 3: TYPE_CHECKING 사용 (타입 힌트용)
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from module_b import ClassB

def function_a(obj: "ClassB") -> None:  # 문자열로 참조
    pass
```

## 조건부 Import

### 플랫폼별

```python
import sys

if sys.platform == "win32":
    import winreg
else:
    import fcntl
```

### 선택적 의존성

```python
try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False
    np = None

def process_array(data):
    if not HAS_NUMPY:
        raise ImportError("numpy is required")
    return np.array(data)
```

## 정리

| 항목 | 규칙 |
|------|------|
| 한 줄에 | 하나의 import |
| 순서 | 표준 → 서드파티 → 로컬 |
| 그룹 사이 | 빈 줄 |
| 경로 | 절대 경로 선호 |
| 와일드카드 | 피하기 |
| 별칭 | 관례적인 것만 |
| 도구 | isort |

---

다음 장에서는 **Expressions & Statements**를 다룬다. 공백, 연산자, 비교문 스타일을 살펴본다.
