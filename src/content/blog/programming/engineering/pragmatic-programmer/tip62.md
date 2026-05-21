---
title: "Tip 62: Estimate the Order of Your Algorithms"
date: 2026-05-11T14:00:00
description: "알고리즘의 차수를 추정하라. Big-O 표기로 성능을 예측하고 병목을 찾는다."
series: "The Pragmatic Programmer"
seriesOrder: 62
tags: [pragmatic-programmer, algorithms, performance]
draft: false
---

## 이 팁의 메시지

> **Tip 62: Estimate the Order of Your Algorithms.** Get a feel for how long things are likely to take before you write code.

코드를 작성하기 전에 얼마나 걸릴지 감을 잡아라.

## Big-O 표기법

알고리즘의 성능을 표현하는 방법이다.

| 표기 | 이름 | 예 |
|------|------|-----|
| O(1) | 상수 | 배열 인덱스 접근 |
| O(log n) | 로그 | 이진 탐색 |
| O(n) | 선형 | 리스트 순회 |
| O(n log n) | 선형로그 | 퀵소트, 머지소트 |
| O(n²) | 이차 | 중첩 루프 |
| O(2ⁿ) | 지수 | 피보나치(재귀) |

## 실전 예: 중첩 루프

```python
# O(n²) - 이차
def find_duplicates(items):
    duplicates = []
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if items[i] == items[j]:
                duplicates.append(items[i])
    return duplicates
```

n이 1,000이면 약 500,000번 비교한다. n이 10,000이면 약 50,000,000번 비교한다. 10배 입력에 100배 시간이 걸린다.

```python
# O(n) - 선형
def find_duplicates(items):
    seen = set()
    duplicates = []
    for item in items:
        if item in seen:
            duplicates.append(item)
        else:
            seen.add(item)
    return duplicates
```

집합을 쓰면 O(n)이 된다. n이 10배가 되면 시간도 10배가 된다.

## 추정 방법

**1. 루프를 센다**

```python
for item in items:       # O(n)
    process(item)

for i in items:          # O(n²)
    for j in items:
        compare(i, j)
```

단일 루프는 O(n), 중첩 루프는 O(n²)다.

**2. 분할 정복을 찾는다**

```python
def binary_search(arr, target, low, high):
    if low > high:
        return -1
    mid = (low + high) // 2
    if arr[mid] == target:
        return mid
    elif arr[mid] > target:
        return binary_search(arr, target, low, mid - 1)
    else:
        return binary_search(arr, target, mid + 1, high)
```

매번 절반씩 줄어들면 O(log n)이다.

**3. 재귀를 분석한다**

```python
def fib(n):
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)  # 두 번 호출
```

매번 두 번 호출하면 O(2ⁿ)가 된다. n=40이면 10억 번 이상 호출한다.

## 실제 영향

| n | O(n) | O(n²) | O(2ⁿ) |
|---|------|-------|-------|
| 10 | 10 | 100 | 1,024 |
| 100 | 100 | 10,000 | 1.27 × 10³⁰ |
| 1,000 | 1,000 | 1,000,000 | ∞ |

O(2ⁿ)은 n이 조금만 커져도 실행 불가능해진다.

## 상수도 중요하다

Big-O는 증가율을 보여주지만, 상수도 무시할 수 없다.

```python
# O(n)이지만 느림
def slow_process(items):
    for item in items:
        expensive_operation(item)  # 각 연산이 1초

# O(n²)이지만 빠름
def fast_process(items):
    for i in items:
        for j in items:
            simple_compare(i, j)  # 각 연산이 1나노초
```

n이 작으면 상수가 더 중요하다. n이 크면 Big-O가 지배한다.

## 정리

- Big-O로 알고리즘 성능을 추정한다.
- 루프 중첩은 복잡도를 곱한다.
- 분할 정복은 O(log n)을 만든다.
- 재귀 호출 수에 주의한다.
- 실제 데이터 크기에서 테스트한다.

## 다음 장 예고

[Tip 63: Test Your Estimates](/blog/programming/engineering/pragmatic-programmer/tip63)에서는 추정을 실제로 검증하는 방법을 다룬다.

## 관련 항목

- [Tip 61: Don't Program by Coincidence](/blog/programming/engineering/pragmatic-programmer/tip61)
- [Tip 63: Test Your Estimates](/blog/programming/engineering/pragmatic-programmer/tip63)
