---
title: "Chapter 6: Data Parallelism"
date: 2026-05-06T06:00:00
description: "GPU / SIMD — 한 명령으로 수천 데이터. OpenCL, CUDA, kernel 사고."
series: "Seven Concurrency Models in Seven Weeks"
seriesOrder: 6
tags: [parallel, concurrency, book-review, data-parallel, gpu, opencl, cuda, simd]
type: book-review
bookTitle: "Seven Concurrency Models in Seven Weeks"
bookAuthor: "Paul Butcher"
draft: true
---

> **Seven Concurrency Models in Seven Weeks** Chapter 6 요약

## 6.1 Data Parallelism이란

지금까지 본 모델 — task parallelism. *다른 작업*을 동시에.

Data parallelism — *같은 작업*을 *다른 데이터*에 동시에.

| 모델 | 코어 분배 |
|------|-----------|
| Task parallel | Core 1 → 작업 A, Core 2 → 작업 B, Core 3 → 작업 C |
| Data parallel | 모든 코어가 같은 작업, `data[]`를 분할 |

극단으로 가면 — **수천 개의 데이터에 같은 명령을 동시에**. 이게 GPU.

## 6.2 SIMD — Single Instruction, Multiple Data

CPU 차원의 데이터 병렬.

- **일반 명령** — `ADD a, b` (스칼라 하나만)
- **SIMD 명령** — `ADD [a0,a1,a2,a3], [b0,b1,b2,b3]` (한 사이클에 4개 더하기)

CPU의 SSE / AVX / NEON 등이 SIMD.

```cpp
// C++ 컴파일러가 자동 벡터화
for (int i = 0; i < N; ++i) {
    c[i] = a[i] + b[i];
}
// 컴파일러: 4~16개씩 묶어 SIMD 명령으로

// 명시적 (Intel intrinsics)
__m256 va = _mm256_load_ps(&a[i]);  // 8 floats
__m256 vb = _mm256_load_ps(&b[i]);
__m256 vc = _mm256_add_ps(va, vb);
_mm256_store_ps(&c[i], vc);
```

## 6.3 GPU — 극단의 데이터 병렬

- **CPU** — 적은 코어 (8~64) + 복잡한 제어 / 큰 캐시
- **GPU** — 수천 코어 + 단순한 제어 / 작은 캐시

예: NVIDIA RTX 4090은 16384 CUDA cores를 가져 동시에 16384개 데이터를 처리할 수 있다.

**핵심 제약** — 모든 코어가 *같은 명령*을 실행해야 효율적. 분기가 많으면 성능 폭락.

## 6.4 OpenCL — 표준 GPU API

CPU/GPU/FPGA 등 다양한 *디바이스*에서 동작.

```c
// Kernel — GPU에서 실행되는 함수
__kernel void vector_add(__global const float* a,
                         __global const float* b,
                         __global float* c)
{
    int i = get_global_id(0);  // 내가 몇 번째 work-item?
    c[i] = a[i] + b[i];
}
```

호스트 (CPU) 코드:
```c
// 1. 데이터를 GPU 메모리로 복사
clEnqueueWriteBuffer(queue, d_a, ...);
clEnqueueWriteBuffer(queue, d_b, ...);

// 2. Kernel 실행 (N개 work-item)
size_t global_size = N;
clEnqueueNDRangeKernel(queue, kernel, 1, NULL, &global_size, NULL, ...);

// 3. 결과를 CPU 메모리로 복사
clEnqueueReadBuffer(queue, d_c, ...);
```

## 6.5 Work-Item과 Work-Group

- **Global work-items** — 전체 작업 단위 (예: 백만 개)
- **Work-group** — work-items의 묶음 (예: 256개)
  - work-group 내부는 **local memory**를 공유하며 *barrier*로 동기화 가능
  - 다른 work-group과는 *독립*

Work-group 내부는 *서로 협력*. 다른 그룹은 *독립*.

## 6.6 메모리 계층

GPU 메모리는 다층 — 성능 차이가 크다.

| 메모리 | 크기 | 속도 | 범위 |
|--------|------|------|------|
| Global | GB | 느림 (수백 cycles) | 모든 work-item |
| Local | KB | 빠름 | work-group 공유 |
| Private | 수십 bytes | 매우 빠름 | work-item 전용 |
| Constant | — | 캐시됨 | 읽기 전용 |

**핵심 최적화** — global memory 접근 최소화. local memory에 *타일링*.

## 6.7 분기의 비용

GPU는 *동일 명령*에 강하다. 분기가 다르면 *직렬화*.

```c
// 나쁨 — 분기에 따라 다른 경로
if (id % 2 == 0) {
    // 짝수만 이 길
} else {
    // 홀수만 이 길
}
// GPU: 두 길을 *둘 다* 실행, 마스크로 한쪽만 효과
// → 성능 절반

// 좋음 — 분기 없는 표현
result = (id % 2 == 0) ? a[id] : b[id];
// 또는 데이터 자체를 분리해서 다른 kernel
```

## 6.8 Reduce는 GPU에 어려움

병렬 reduce의 단계.

1. 두 쌍씩 더하기 — `[a,b,c,d,e,f,g,h] → [a+b, c+d, e+f, g+h]`
2. 또 두 쌍 — `→ [a+b+c+d, e+f+g+h]`
3. 마지막 — `→ [a+b+...+h]`

log N 단계. 각 단계 내에서는 병렬. 그러나 단계 간 *동기화* 필요.

```c
__kernel void reduce(__global float* data, __local float* shared) {
    int lid = get_local_id(0);
    shared[lid] = data[get_global_id(0)];
    barrier(CLK_LOCAL_MEM_FENCE);
    
    for (int s = get_local_size(0) / 2; s > 0; s >>= 1) {
        if (lid < s) {
            shared[lid] += shared[lid + s];
        }
        barrier(CLK_LOCAL_MEM_FENCE);
    }
    
    if (lid == 0) data[get_group_id(0)] = shared[0];
}
```

## 6.9 데이터 병렬에 잘 맞는 문제

**좋은 fit**

- 행렬 곱셈
- 이미지 필터 (블러, 엣지 검출)
- 신경망 학습 / 추론
- 물리 시뮬레이션
- N-body 시뮬레이션
- 비디오 인코딩

**나쁜 fit**

- 분기가 많은 알고리즘
- 의존성이 강한 알고리즘 (Fibonacci, 직렬 reduce)
- 작은 데이터 — 오버헤드가 크다
- 빈번한 호스트-디바이스 메모리 전송

## 6.10 모던 도구

| 도구 | 특징 |
|------|------|
| CUDA | NVIDIA 전용, 가장 성숙 |
| OpenCL | 크로스 플랫폼, 그러나 쇠퇴 중 |
| SYCL | C++ 기반 모던 API |
| Vulkan Compute | 그래픽 + 컴퓨트 |
| Metal | Apple 전용 |
| Triton | Python DSL (OpenAI) |
| WebGPU | 브라우저 |

**ML 분야**

| 라이브러리 | 특징 |
|------------|------|
| PyTorch / TensorFlow | 자동 GPU 가속 |
| JAX | 함수형 + XLA 컴파일 |
| NumPy + CuPy | NumPy 호환 GPU |

대부분 개발자는 *직접 OpenCL/CUDA* 안 쓴다. 라이브러리가 추상화.

## 6.11 CPU의 데이터 병렬

GPU 없이도 CPU SIMD 가능.

```cpp
// C++ std::execution
std::transform(std::execution::par_unseq,  // par + SIMD
    a.begin(), a.end(), b.begin(), c.begin(),
    [](float x, float y) { return x + y; });
```

```rust
// Rust with portable_simd
use std::simd::*;
let a = f32x4::from_array([1.0, 2.0, 3.0, 4.0]);
let b = f32x4::splat(2.0);
let c = a * b;
```

## 6.12 트레이드오프

**장점**

- 거대한 데이터에 거대한 속도
- 전력 효율 — GPU가 CPU보다 throughput/watt 우월

**단점**

- 데이터 전송 비용
- 분기에 약함
- 디버깅 어려움
- 메모리 관리 복잡
- 정확성 검증 어려움 (특히 부동소수점)

## 정리

- **Data Parallelism** — 같은 작업, 다른 데이터, *동시에*
- **SIMD** — CPU 차원, AVX/SSE/NEON
- **GPU** — 수천 코어, kernel 사고
- **Work-item / Work-group** — 작업 단위
- **메모리 계층** 최적화가 핵심
- **분기 최소화** — branchless 사고
- **Reduce**는 가능하지만 log N 단계 동기화 필요

## 한국 개발자의 함정

1. ***GPU = 게임 / ML 전용*이라는 좁은 시각** — 이미지 / 신호 처리 / 시뮬레이션, 데이터 분석에도 쓰인다.
2. ***CUDA만 쓰면 됨*이라는 단순화** — PyTorch / JAX가 더 실용적. 직접 CUDA는 극한 최적화일 때만.
3. ***분기 = OK*라는 오해 (GPU)** — warp divergence로 성능이 폭락한다. 가능한 한 branchless로.
4. ***데이터 전송 비용 무시*** — GPU memory ↔ CPU memory가 매우 느리다. 한 번 올리면 GPU에서 *오래* 작업.
5. ***부동소수점이 GPU에서 같음*** — 정밀도와 순서가 다를 수 있다. 결과를 *비트 단위*로 같다고 가정하지 말 것.

## 실무 적용

**이론 → 실무**

| 개념 | 구현 |
|------|------|
| SIMD | `std::execution::par_unseq`, AVX intrinsics |
| GPU compute | CUDA, OpenCL, SYCL, Metal |
| ML 학습 / 추론 | PyTorch, TensorFlow, JAX |
| 신호 처리 | MATLAB Parallel, FFTW, cuFFT |
| 이미지 처리 | OpenCV (GPU 백엔드), Halide |
| 비디오 인코딩 | NVENC, QuickSync, VideoToolbox |

**라이브러리 (high-level)**

| 언어 | 라이브러리 |
|------|------------|
| Python | NumPy → CuPy, PyTorch |
| C++ | Thrust (CUDA), Kokkos, RAJA |
| Rust | `rust-cuda`, `wgpu` |
| JavaScript | WebGPU, TensorFlow.js |

**도메인별**

- 게임 — shader (GLSL, HLSL)
- 과학 — MPI + CUDA
- ML — 추상 라이브러리
- 영상 — 코덱 가속 (NVENC)

## 자기 점검

- [ ] Task parallelism과 Data parallelism의 차이는?
- [ ] SIMD와 GPU의 차이는?
- [ ] Work-item / Work-group의 의미는?
- [ ] GPU 메모리 계층과 최적화 전략은?
- [ ] Warp divergence가 성능에 미치는 영향은?
- [ ] Reduce를 GPU에서 구현하는 방법은?

## 다음 장 예고

마지막 장 — **Lambda Architecture**. 배치 + 스트리밍 분산 데이터 처리.

## 관련 항목

- [Ch 5: CSP](/blog/parallel/seven-concurrency-models/ch05-csp)
- [Ch 7: Lambda Architecture](/blog/parallel/seven-concurrency-models/ch07-lambda-architecture)
- [AMP Ch 12: Counting Networks](/blog/parallel/parallel-principles/ch12-counting-sorting-and-distributed-coordination) — 정렬 네트워크 (SIMD)
- [C++ Concurrency in Action Ch 10: Parallel Algorithms](/blog/parallel/cpp-concurrency-in-action/chapter10-parallel-algorithms)
