---
title: "Ch 5: Comments & Docstrings"
date: 2026-05-18T05:00:00
description: "블록 주석, 인라인 주석, docstring 규칙. PEP 257, Google/NumPy 스타일."
tags: [Python, PEP8, Comments, Docstrings, Documentation]
series: "Python Style Guide (PEP 8)"
seriesOrder: 5
draft: false
---

> "Comments that contradict the code are worse than no comments."

## 블록 주석

### 기본 형식

```python
# This is a block comment.
# It explains the following code.
# Each line starts with # and a space.
x = compute_value()

# 단락 구분
# First paragraph explains the context.
# More details about why this approach.
#
# Second paragraph with additional info.
# Another line in the second paragraph.
```

### 섹션 구분

```python
# ============================================================
# Data Processing
# ============================================================

def process_data():
    pass

# ------------------------------------------------------------
# Helper Functions
# ------------------------------------------------------------

def helper():
    pass
```

## 인라인 주석

### 드물게 사용

```python
# Good: 명확하지 않은 코드 설명
x = x + 1  # Compensate for border offset

# Bad: 명백한 것 설명
x = x + 1  # Increment x

# Bad: 코드와 같은 줄에 너무 긴 주석
result = calculate()  # This calculates the final result using the formula x^2 + y^2
```

### 적절한 간격

```python
# Good: 최소 2칸 띄우기
x = x + 1  # Compensate for border
y = y * 2  # Double for safety margin

# Bad: 공백 부족
x = x + 1 #Compensate for border
```

## Docstrings (PEP 257)

### 기본 규칙

```python
# 한 줄 docstring
def simple_function():
    """Return the sum of a and b."""
    pass

# 여러 줄 docstring
def complex_function(a, b):
    """
    Calculate the weighted sum of two values.

    This function multiplies each value by its weight
    and returns the sum.

    Args:
        a: First value.
        b: Second value.

    Returns:
        The weighted sum.
    """
    pass
```

### 모듈 docstring

```python
"""
This module provides utility functions for data processing.

The module includes functions for:
- Data validation
- Format conversion
- Error handling

Example usage:
    from utils import process_data
    result = process_data(raw_input)
"""

import os
```

### 클래스 docstring

```python
class DataProcessor:
    """
    A class for processing various data formats.

    This class handles CSV, JSON, and XML data formats,
    providing methods for reading, transforming, and writing.

    Attributes:
        format: The data format being processed.
        source: The data source path.

    Example:
        processor = DataProcessor('csv')
        data = processor.load('data.csv')
        processor.transform(data)
    """

    def __init__(self, format):
        """Initialize the processor with a format."""
        self.format = format
```

### 메서드 docstring

```python
def calculate_distance(self, point_a, point_b):
    """
    Calculate the Euclidean distance between two points.

    Args:
        point_a: A tuple (x, y) representing the first point.
        point_b: A tuple (x, y) representing the second point.

    Returns:
        The distance as a float.

    Raises:
        ValueError: If points have different dimensions.

    Example:
        >>> calc.calculate_distance((0, 0), (3, 4))
        5.0
    """
    pass
```

## Google 스타일

### 함수 docstring

```python
def fetch_data(url, timeout=30, retry=3):
    """Fetch data from a remote URL.

    Retrieves content from the specified URL with retry logic
    for handling transient failures.

    Args:
        url: The URL to fetch data from.
        timeout: Maximum seconds to wait for response.
            Defaults to 30.
        retry: Number of retry attempts on failure.
            Defaults to 3.

    Returns:
        A dict mapping response headers to their values. For
        example:

        {'content-type': 'application/json',
         'content-length': '1234'}

    Raises:
        ConnectionError: If unable to connect after retries.
        TimeoutError: If request exceeds timeout.
        ValueError: If URL is malformed.

    Examples:
        >>> data = fetch_data('https://api.example.com/data')
        >>> print(data['content-type'])
        application/json
    """
    pass
```

### 클래스 docstring

```python
class DataLoader:
    """Load and preprocess data from various sources.

    A flexible data loader that supports multiple formats
    and preprocessing pipelines.

    Attributes:
        source_path: Path to the data source.
        format: Data format ('csv', 'json', 'parquet').
        cache: Whether to cache loaded data.

    Example:
        loader = DataLoader('/data/input.csv', format='csv')
        df = loader.load()
        df_processed = loader.preprocess(df)
    """

    def __init__(self, source_path, format='auto', cache=True):
        """Initialize DataLoader with source path.

        Args:
            source_path: Path to data file or directory.
            format: Data format. If 'auto', inferred from
                file extension.
            cache: If True, cache data in memory after
                first load.
        """
        self.source_path = source_path
        self.format = format
        self.cache = cache
```

## NumPy 스타일

### 함수 docstring

```python
def array_stats(data, axis=None, keepdims=False):
    """
    Compute statistics for array data.

    Calculate mean, standard deviation, and range for
    the input array along specified axis.

    Parameters
    ----------
    data : array_like
        Input data array.
    axis : None or int or tuple of ints, optional
        Axis or axes along which to compute statistics.
        The default is to compute over the flattened array.
    keepdims : bool, optional
        If True, the reduced axes are left in the result
        as dimensions with size one. Default is False.

    Returns
    -------
    dict
        Dictionary containing 'mean', 'std', and 'range'
        keys with corresponding computed values.

    Raises
    ------
    ValueError
        If data is empty.
    TypeError
        If data cannot be converted to array.

    See Also
    --------
    numpy.mean : Compute the arithmetic mean.
    numpy.std : Compute the standard deviation.

    Notes
    -----
    The range is computed as max - min.

    Examples
    --------
    >>> data = [1, 2, 3, 4, 5]
    >>> stats = array_stats(data)
    >>> stats['mean']
    3.0
    >>> stats['std']
    1.4142135623730951
    """
    pass
```

## TODO 주석

### 형식

```python
# TODO: Implement caching mechanism.

# TODO(username): Add error handling for edge cases.

# FIXME: This breaks when input is empty.

# HACK: Temporary workaround for API bug.

# XXX: This needs review before production.

# NOTE: Algorithm assumes sorted input.

# BUG: Race condition in multi-threaded mode.
```

### 예제

```python
def process_items(items):
    # TODO: Add validation for item types.
    # TODO(alice): Optimize for large datasets.

    # FIXME: Memory leak when processing > 10k items
    for item in items:
        # NOTE: Order matters here due to dependencies
        transform(item)

    # HACK: Workaround for upstream bug #1234
    return cleanup(items)
```

## 코드 문서화

### 복잡한 알고리즘

```python
def binary_search(arr, target):
    """
    Find target in sorted array using binary search.

    Time Complexity: O(log n)
    Space Complexity: O(1)
    """
    # Initialize search bounds
    left, right = 0, len(arr) - 1

    while left <= right:
        # Avoid integer overflow (relevant in other languages)
        mid = left + (right - left) // 2

        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            # Target is in right half
            left = mid + 1
        else:
            # Target is in left half
            right = mid - 1

    # Target not found
    return -1
```

### 매직 넘버

```python
# Bad: 매직 넘버
if len(password) < 8:
    raise ValueError("Too short")

# Good: 상수로 설명
MIN_PASSWORD_LENGTH = 8

if len(password) < MIN_PASSWORD_LENGTH:
    raise ValueError("Too short")
```

## 하지 말 것

### 명백한 주석

```python
# Bad: 코드가 이미 말하고 있다
# Set x to 10
x = 10

# Loop through items
for item in items:
    pass

# Return the result
return result
```

### 오래된 주석

```python
# Bad: 코드와 맞지 않는 주석
# Calculate the sum of a and b
def multiply(a, b):  # 곱셈인데 합계라고?
    return a * b
```

### 주석 처리된 코드

```python
# Bad: 죽은 코드
# old_function()
# if deprecated_condition:
#     do_old_thing()

# Good: 삭제하고 버전 관리 활용
```

## 정리

| 항목 | 규칙 |
|------|------|
| 블록 주석 | # + 공백으로 시작 |
| 인라인 주석 | 드물게, 2칸 이상 띄우기 |
| Docstring | 삼중 따옴표, 첫 줄은 요약 |
| 함수/메서드 | Args, Returns, Raises |
| 클래스 | Attributes, Example |
| TODO | TODO(author): 설명 |

---

다음 장에서는 **Type Hints**를 다룬다. PEP 484, 타입 어노테이션, mypy 사용법을 살펴본다.
