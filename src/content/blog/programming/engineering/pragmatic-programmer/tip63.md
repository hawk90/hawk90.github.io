---
title: "Tip 63: Test Your Estimates"
date: 2026-05-11T15:00:00
description: "추정을 테스트하라. 이론적 복잡도와 실제 성능을 비교해서 검증한다."
series: "The Pragmatic Programmer"
seriesOrder: 63
tags: [pragmatic-programmer, algorithms, testing]
draft: false
---

## 이 팁의 메시지

> **Tip 63: Test Your Estimates.** Mathematical analysis of algorithms doesn't tell you everything. Try timing your code in its target environment.

알고리즘의 수학적 분석이 전부를 말해주지 않는다. 실제 환경에서 시간을 측정하라.

## 이론 vs 실제

Big-O는 증가율을 알려주지만, 실제 성능은 다를 수 있다.

```python
import time

def measure_time(func, *args):
    start = time.perf_counter()
    result = func(*args)
    end = time.perf_counter()
    return end - start, result

# O(n) 알고리즘
time_taken, _ = measure_time(linear_search, data, target)
print(f"선형 탐색: {time_taken:.6f}초")

# O(log n) 알고리즘
time_taken, _ = measure_time(binary_search, data, target)
print(f"이진 탐색: {time_taken:.6f}초")
```

## 입력 크기별 테스트

여러 크기로 테스트해서 증가 패턴을 확인한다.

```python
import random

sizes = [100, 1000, 10000, 100000]

for n in sizes:
    data = list(range(n))
    random.shuffle(data)

    time_taken, _ = measure_time(my_sort, data.copy())
    print(f"n={n:6d}: {time_taken:.4f}초")
```

출력 예:

```text
n=   100: 0.0001초
n=  1000: 0.0012초
n= 10000: 0.0150초
n=100000: 0.1800초
```

n이 10배가 될 때 시간이 약 10-12배 증가한다. O(n log n)에 가깝다.

## 그래프로 시각화

```python
import matplotlib.pyplot as plt

sizes = [100, 500, 1000, 2000, 5000, 10000]
times = []

for n in sizes:
    data = list(range(n))
    t, _ = measure_time(my_function, data)
    times.append(t)

plt.plot(sizes, times, 'o-')
plt.xlabel('입력 크기 (n)')
plt.ylabel('시간 (초)')
plt.title('알고리즘 성능')
plt.show()
```

직선이면 O(n), 포물선이면 O(n²), 로그 곡선이면 O(log n)이다.

## 실제 환경의 변수

이론과 실제가 다른 이유가 있다.

| 요소 | 영향 |
|------|------|
| 캐시 적중 | 순차 접근이 랜덤 접근보다 빠르다 |
| 메모리 할당 | 동적 할당은 비용이 든다 |
| 브랜치 예측 | 예측 가능한 조건문이 빠르다 |
| JIT 컴파일 | 첫 실행이 느리고 이후가 빠르다 |

```python
# 캐시 친화적 (빠름)
def sum_rows(matrix):
    total = 0
    for row in matrix:
        for val in row:
            total += val
    return total

# 캐시 비친화적 (느림)
def sum_cols(matrix):
    total = 0
    for col in range(len(matrix[0])):
        for row in range(len(matrix)):
            total += matrix[row][col]
    return total
```

둘 다 O(n²)이지만 행 우선 접근이 훨씬 빠르다.

## 워밍업

JIT 언어에서는 워밍업이 필요하다.

```python
# 워밍업: JIT 컴파일을 유도
for _ in range(10):
    my_function(small_data)

# 실제 측정
times = []
for _ in range(100):
    t, _ = measure_time(my_function, data)
    times.append(t)

avg_time = sum(times) / len(times)
print(f"평균: {avg_time:.6f}초")
```

## 프로파일링 도구

측정 도구를 활용한다.

```python
import cProfile

cProfile.run('my_function(data)')
```

```text
         1003 function calls in 0.050 seconds

   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
     1000    0.030    0.000    0.030    0.000 module.py:10(inner_loop)
        1    0.015    0.015    0.045    0.045 module.py:5(outer_loop)
```

어디서 시간이 걸리는지 정확히 보여준다.

## 정리

- 이론적 복잡도를 실제로 검증한다.
- 여러 입력 크기로 테스트한다.
- 그래프로 증가 패턴을 확인한다.
- 캐시, 메모리, JIT 같은 실제 요소를 고려한다.
- 프로파일링 도구로 병목을 찾는다.

## 다음 장 예고

[Tip 64: Refactor Early, Refactor Often](/blog/programming/engineering/pragmatic-programmer/tip64)에서는 일찍, 자주 리팩터링하는 습관을 다룬다.

## 관련 항목

- [Tip 62: Estimate the Order of Your Algorithms](/blog/programming/engineering/pragmatic-programmer/tip62)
- [Tip 64: Refactor Early, Refactor Often](/blog/programming/engineering/pragmatic-programmer/tip64)
