---
title: "Ch 6: Type Hints"
date: 2025-05-14T16:00:00
description: "PEP 484 타입 힌트. 변수, 함수, 클래스 어노테이션. Generic, Protocol, TypeVar."
tags: [Python, PEP8, Type-Hints, PEP484, mypy, Typing]
series: "Python Style Guide (PEP 8)"
seriesOrder: 6
draft: false
---

> "Type hints are completely optional."
> — PEP 484

## 기본 타입 힌트

### 변수 어노테이션

```python
# 기본 타입
name: str = "Alice"
age: int = 30
price: float = 19.99
is_active: bool = True

# 타입만 선언 (초기화 없이)
count: int
message: str
```

### 함수 어노테이션

```python
# 파라미터와 반환 타입
def greet(name: str) -> str:
    return f"Hello, {name}!"

def add(a: int, b: int) -> int:
    return a + b

# None 반환
def log(message: str) -> None:
    print(message)
```

### 기본값이 있는 파라미터

```python
# 기본값과 타입 힌트
def connect(host: str, port: int = 8080) -> None:
    pass

# Optional 사용
from typing import Optional

def find_user(user_id: int, cache: Optional[dict] = None) -> Optional[str]:
    pass
```

## 컬렉션 타입

### Python 3.9+

```python
# 내장 타입 직접 사용 (3.9+)
names: list[str] = ["Alice", "Bob"]
scores: dict[str, int] = {"Alice": 100, "Bob": 85}
coordinates: tuple[float, float] = (1.0, 2.0)
unique_ids: set[int] = {1, 2, 3}
```

### Python 3.8 이하

```python
from typing import List, Dict, Tuple, Set

names: List[str] = ["Alice", "Bob"]
scores: Dict[str, int] = {"Alice": 100}
coordinates: Tuple[float, float] = (1.0, 2.0)
unique_ids: Set[int] = {1, 2, 3}
```

### 중첩 컬렉션

```python
# 복잡한 구조
users: dict[str, list[int]] = {
    "Alice": [1, 2, 3],
    "Bob": [4, 5],
}

matrix: list[list[float]] = [
    [1.0, 2.0],
    [3.0, 4.0],
]

# 가변 길이 튜플
args: tuple[int, ...] = (1, 2, 3, 4, 5)
```

## Optional과 Union

### Optional

```python
from typing import Optional

# None이 될 수 있는 타입
def get_user(user_id: int) -> Optional[str]:
    if user_id in database:
        return database[user_id]
    return None

# Python 3.10+
def get_user(user_id: int) -> str | None:
    pass
```

### Union

```python
from typing import Union

# 여러 타입 허용
def process(value: Union[int, str]) -> str:
    return str(value)

# Python 3.10+
def process(value: int | str) -> str:
    return str(value)
```

## 타입 별칭

### 복잡한 타입 단순화

```python
from typing import TypeAlias

# 타입 별칭 정의
UserId: TypeAlias = int
UserData: TypeAlias = dict[str, str | int | None]
Coordinates: TypeAlias = tuple[float, float]

# 사용
def get_user(user_id: UserId) -> UserData:
    pass

def calculate_distance(p1: Coordinates, p2: Coordinates) -> float:
    pass
```

### NewType

```python
from typing import NewType

# 구분되는 타입 생성
UserId = NewType('UserId', int)
ProductId = NewType('ProductId', int)

def get_user(user_id: UserId) -> str:
    pass

# 타입 체크에서 구분됨
user_id = UserId(123)
product_id = ProductId(456)

get_user(user_id)      # OK
get_user(product_id)   # mypy 에러
get_user(123)          # mypy 에러
```

## Callable

### 함수 타입

```python
from typing import Callable

# 함수를 인자로 받기
def apply(func: Callable[[int, int], int], a: int, b: int) -> int:
    return func(a, b)

# 콜백 타입
Callback = Callable[[str], None]

def register_callback(callback: Callback) -> None:
    pass
```

### 다양한 Callable

```python
from typing import Callable, Any

# 임의의 인자
Handler = Callable[..., None]  # 어떤 인자든 받고 None 반환

# 인자 없음
NoArgFunc = Callable[[], int]  # 인자 없이 int 반환
```

## 제네릭

### TypeVar

```python
from typing import TypeVar, List

T = TypeVar('T')

def first(items: List[T]) -> T:
    return items[0]

# 사용
first([1, 2, 3])      # int 반환
first(["a", "b"])     # str 반환
```

### 바운드 TypeVar

```python
from typing import TypeVar

# 특정 타입으로 제한
Number = TypeVar('Number', int, float)

def add(a: Number, b: Number) -> Number:
    return a + b

# 상한 지정
from typing import TypeVar

Comparable = TypeVar('Comparable', bound='SupportComparison')

def max_value(a: Comparable, b: Comparable) -> Comparable:
    return a if a > b else b
```

### Generic 클래스

```python
from typing import Generic, TypeVar

T = TypeVar('T')

class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        return self._items.pop()

# 사용
stack: Stack[int] = Stack()
stack.push(1)
stack.push(2)
value: int = stack.pop()
```

## Protocol

### 구조적 서브타이핑

```python
from typing import Protocol

class Drawable(Protocol):
    def draw(self) -> None:
        ...

class Circle:
    def draw(self) -> None:
        print("Drawing circle")

class Square:
    def draw(self) -> None:
        print("Drawing square")

def render(shape: Drawable) -> None:
    shape.draw()

# Duck typing으로 작동
render(Circle())  # OK
render(Square())  # OK
```

### Runtime Checkable

```python
from typing import Protocol, runtime_checkable

@runtime_checkable
class Closable(Protocol):
    def close(self) -> None:
        ...

# isinstance에서 사용 가능
class File:
    def close(self) -> None:
        pass

file = File()
if isinstance(file, Closable):
    file.close()
```

## 특수 타입

### Any

```python
from typing import Any

def process(data: Any) -> Any:
    # 모든 타입 허용, 타입 체크 안 함
    return data

# 사용 자제 — 가능하면 구체적인 타입 사용
```

### Literal

```python
from typing import Literal

Mode = Literal["r", "w", "a"]

def open_file(path: str, mode: Mode) -> None:
    pass

open_file("data.txt", "r")  # OK
open_file("data.txt", "x")  # mypy 에러
```

### Final

```python
from typing import Final

MAX_SIZE: Final = 100
PI: Final[float] = 3.14159

MAX_SIZE = 200  # mypy 에러: Final 변수 재할당
```

### TypedDict

```python
from typing import TypedDict

class UserDict(TypedDict):
    name: str
    age: int
    email: str

user: UserDict = {
    "name": "Alice",
    "age": 30,
    "email": "alice@example.com",
}
```

## 타입 체크 도구

### mypy

```bash
# 설치
pip install mypy

# 실행
mypy myfile.py
mypy --strict myfile.py

# 설정 (pyproject.toml)
[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
disallow_untyped_defs = true
```

### TYPE_CHECKING

```python
from typing import TYPE_CHECKING

# 런타임에는 import 안 함 (순환 import 방지)
if TYPE_CHECKING:
    from mymodule import HeavyClass

def process(obj: "HeavyClass") -> None:
    pass
```

## 정리

| 항목 | 문법 |
|------|------|
| 변수 | `name: str = "value"` |
| 함수 | `def func(x: int) -> str:` |
| 리스트 | `list[int]` (3.9+) |
| 딕셔너리 | `dict[str, int]` |
| Optional | `str \| None` (3.10+) |
| Union | `int \| str` (3.10+) |
| Generic | `TypeVar`, `Generic[T]` |
| Protocol | 구조적 서브타이핑 |

---

다음 장에서는 **Tools**를 다룬다. Black, flake8, mypy, isort, ruff 등 자동화 도구를 살펴본다.
