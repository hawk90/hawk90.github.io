---
title: "데이터 병렬성 vs 태스크 병렬성"
date: 2026-05-12
description: "두 가지 병렬화 접근법. 같은 연산을 여러 데이터에? 다른 연산을 동시에? 언제 무엇을 선택하는가."
series: "Parallel Programming Principles"
seriesOrder: 4
tags: [parallel, data-parallelism, task-parallelism, simd, fundamentals]
type: tech
---

> 이 글은 *Structured Parallel Programming* Chapter 3을 기반으로 합니다.

## 두 가지 병렬화 전략

병렬화에는 두 가지 근본적인 접근법이 있다.

### Data Parallelism (데이터 병렬성)

> **같은 연산**을 **여러 데이터**에 동시 적용

```
데이터: [1, 2, 3, 4, 5, 6, 7, 8]
연산:   ×2

Core 1: [1, 2] × 2 = [2, 4]
Core 2: [3, 4] × 2 = [6, 8]
Core 3: [5, 6] × 2 = [10, 12]
Core 4: [7, 8] × 2 = [14, 16]
```

### Task Parallelism (태스크 병렬성)

> **다른 연산**을 **동시에** 실행

```
Input Data
    │
    ├──→ [Core 1: 압축]
    ├──→ [Core 2: 암호화]
    ├──→ [Core 3: 체크섬]
    └──→ [Core 4: 메타데이터]
```

---

## Data Parallelism

### 특징

```cpp
// 전형적인 데이터 병렬 코드
#pragma omp parallel for
for (int i = 0; i < N; i++) {
    output[i] = transform(input[i]);
}
```

**핵심**: 루프의 각 반복이 **독립적**이다.

### 장점

| 장점 | 설명 |
|-----|------|
| 확장성 | 데이터가 많을수록 병렬화 용이 |
| 단순성 | 동기화 최소화 |
| 효율성 | SIMD, GPU에 최적 |
| 부하 균형 | 균등 분배 쉬움 |

### 예시

```cpp
// 이미지 처리: 각 픽셀에 필터 적용
parallel_for(0, height, [&](int y) {
    for (int x = 0; x < width; x++) {
        output[y][x] = apply_filter(input, x, y);
    }
});

// 벡터 덧셈
parallel_for(0, N, [&](int i) {
    C[i] = A[i] + B[i];
});

// 행렬 곱
parallel_for(0, N, [&](int i) {
    for (int j = 0; j < N; j++) {
        C[i][j] = dot_product(A.row(i), B.col(j));
    }
});
```

### SIMD와의 관계

**SIMD** (Single Instruction, Multiple Data)는 데이터 병렬성의 **하드웨어 구현**:

```cpp
// 스칼라 코드
for (int i = 0; i < N; i++) {
    C[i] = A[i] + B[i];
}

// SIMD 코드 (AVX-256: 8개 float 동시 처리)
for (int i = 0; i < N; i += 8) {
    __m256 a = _mm256_load_ps(&A[i]);
    __m256 b = _mm256_load_ps(&B[i]);
    __m256 c = _mm256_add_ps(a, b);
    _mm256_store_ps(&C[i], c);
}
```

**멀티코어 + SIMD = 이중 병렬화**

```
Core 1: [A[0:7] + B[0:7]]   (SIMD)
Core 2: [A[8:15] + B[8:15]] (SIMD)
Core 3: [A[16:23] + B[16:23]] (SIMD)
Core 4: [A[24:31] + B[24:31]] (SIMD)
```

---

## Task Parallelism

### 특징

```cpp
// 전형적인 태스크 병렬 코드
std::future<int> a = std::async(task_A);
std::future<int> b = std::async(task_B);
std::future<int> c = std::async(task_C);

int result = combine(a.get(), b.get(), c.get());
```

**핵심**: 서로 **다른 작업**을 동시에 실행한다.

### 장점

| 장점 | 설명 |
|-----|------|
| 유연성 | 이질적인 작업 처리 |
| 파이프라인 | 단계별 처리 |
| 응답성 | I/O와 계산 분리 |
| 자연스러움 | 문제의 구조 반영 |

### 예시

```cpp
// 웹 서버: 각 요청이 독립 태스크
void server() {
    while (true) {
        auto request = accept_connection();
        std::async([=] {
            auto response = handle_request(request);
            send_response(response);
        });
    }
}

// 파이프라인: 단계별 처리
void pipeline() {
    std::thread reader([&] {
        while (auto chunk = read_input()) {
            stage1_queue.push(chunk);
        }
    });

    std::thread processor([&] {
        while (auto chunk = stage1_queue.pop()) {
            auto result = process(chunk);
            stage2_queue.push(result);
        }
    });

    std::thread writer([&] {
        while (auto result = stage2_queue.pop()) {
            write_output(result);
        }
    });
}

// Fork-Join: 독립 하위 문제
int parallel_sum(int* arr, int n) {
    if (n < THRESHOLD) return sequential_sum(arr, n);

    auto left = std::async([&] {
        return parallel_sum(arr, n/2);
    });
    int right = parallel_sum(arr + n/2, n - n/2);

    return left.get() + right;
}
```

---

## 비교

### 구조적 차이

```
Data Parallelism:
┌─────────────────────────────────────┐
│        Same Operation               │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐          │
│  │ D1│ │ D2│ │ D3│ │ D4│  Data    │
│  └───┘ └───┘ └───┘ └───┘          │
└─────────────────────────────────────┘

Task Parallelism:
┌─────────────────────────────────────┐
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐      │
│  │ T1 │ │ T2 │ │ T3 │ │ T4 │ Tasks│
│  └────┘ └────┘ └────┘ └────┘      │
│   Op A   Op B   Op C   Op D        │
└─────────────────────────────────────┘
```

### 특성 비교

| 특성 | Data Parallelism | Task Parallelism |
|-----|------------------|------------------|
| 작업 | 동일 | 다양 |
| 데이터 | 분할 | 공유 가능 |
| 동기화 | 최소 | 필요 |
| 부하 균형 | 균등 | 불균등 가능 |
| 확장성 | 데이터 크기 | 태스크 수 |
| 예시 | 행렬 연산, 이미지 처리 | 파이프라인, 서버 |

---

## 하이브리드 접근

실제로는 두 가지를 **조합**하는 경우가 많다.

### 예시: 비디오 인코딩

```
Data Parallelism:
  프레임 내 블록들을 병렬 처리

Task Parallelism:
  여러 프레임을 파이프라인 처리

┌────────────────────────────────────────────┐
│ Frame 1: [Block1][Block2][Block3][Block4]  │ ← Data Parallel
│ Frame 2: [Block1][Block2][Block3][Block4]  │
│ Frame 3: [Block1][Block2][Block3][Block4]  │
└────────────────────────────────────────────┘
         ↓         ↓         ↓
      Encode    Encode    Encode              ← Task Parallel
         ↓         ↓         ↓
       Write     Write     Write
```

### 예시: MapReduce

```
Map (Data Parallel):
  모든 데이터에 같은 map 함수 적용

Shuffle (Task Parallel):
  키별로 데이터 재분배

Reduce (Data Parallel):
  각 키에 같은 reduce 함수 적용
```

---

## 선택 가이드

### Data Parallelism이 적합한 경우

✓ 대량의 **동일한** 연산
✓ 각 연산이 **독립적**
✓ **규칙적**인 데이터 구조 (배열, 행렬)
✓ **SIMD/GPU** 활용 가능

```cpp
// 적합: 이미지 필터, 벡터 연산, 시뮬레이션
for (each pixel) apply_filter();
for (each particle) update_position();
for (each element) compute();
```

### Task Parallelism이 적합한 경우

✓ **다양한** 종류의 작업
✓ 작업 간 **의존성** 존재
✓ **불규칙적**인 워크로드
✓ **파이프라인** 구조

```cpp
// 적합: 웹 서버, 컴파일러, GUI
handle_each_request_differently();
lexer -> parser -> optimizer -> codegen;
ui_thread + compute_thread + io_thread;
```

### 결정 플로우

```
"작업이 모두 같은가?"
    ├─ 예 → Data Parallelism
    └─ 아니오 → "의존성이 있는가?"
                  ├─ 아니오 → Task Parallelism (동시 실행)
                  └─ 예 → Task Parallelism (파이프라인)
```

---

## 핵심 요약

| | Data Parallelism | Task Parallelism |
|--|------------------|------------------|
| 핵심 | 같은 연산, 여러 데이터 | 다른 연산, 동시 실행 |
| 구조 | SPMD | MPMD |
| 확장성 | 데이터 크기 | 태스크 수 |
| 하드웨어 | SIMD, GPU | 멀티코어 |
| 동기화 | 최소 | 필요 |

---

## 연습 문제

1. **분류**: 다음은 Data/Task 병렬 중 무엇인가?
   - a) 웹 크롤러가 여러 URL을 동시에 방문
   - b) 이미지의 모든 픽셀에 블러 적용
   - c) 컴파일러의 렉서-파서-코드 생성 파이프라인
   - d) 행렬의 모든 행을 독립적으로 정규화

2. **설계**: 동영상 트랜스코딩 시스템을 Data + Task 병렬로 설계하라.

3. **분석**: GPU가 Data Parallelism에 특화된 이유는?

4. **구현**: `parallel_for`와 `std::async`로 각각 1000개 작업을 실행하고 차이를 비교하라.

---

다음 글: [Part 1-05: 의존성 분석](/blog/parallel/parallel-principles/part1-05-dependency-analysis)
