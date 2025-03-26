![CUDA](/Users/hawk/Desktop/CUDA.png)



[TOC]

## Part 0. CUDA를 위한 컴퓨터 구조 기초

### 0.1 컴퓨터의 동작 원리 간단 요약

- CPU, 메모리, 저장장치, 버스 설명
- 명령어 → 연산 → 결과 저장 흐름
- **시각 자료:** von Neumann 구조, fetch-decode-execute 사이클

### 0.2 프로그램과 데이터는 어디에 있을까?

- 코드/데이터/스택/힙의 메모리 영역
- RAM과 캐시 메모리의 역할
- **시각 자료:** 메모리 맵 구조 그림

### 0.3 코드가 실제로 실행될 때 무슨 일이 일어날까?

- 프로그램 → 실행파일 → 메모리 적재 → 연산 처리 흐름
- CUDA 커널 실행 시 흐름 비교

## Part 1. CUDA 입문: GPU 프로그래밍의 첫걸음

### 1. 병렬 컴퓨팅과 CUDA 개요

- 병렬 컴퓨팅의 필요성
- CPU vs GPU 구조 비교
- CUDA란 무엇인가?
- CUDA 프로그램 실행 흐름
- **시각 자료:** CPU-GPU 비교 다이어그램

### 2. 개발 환경 설정과 첫 번째 CUDA 프로그램

- CUDA Toolkit 설치 및 `nvcc` 사용법
- Nsight Compute / Nsight Systems 소개
- Hello CUDA 프로그램 작성
- 디바이스 정보 출력 (`cudaGetDeviceProperties`)

### 3. CUDA 프로그램 구조와 실행 모델

- Host-Device 역할
- 커널 함수 정의 (`__global__`, `__device__`)
- 블록과 스레드 구성 (`threadIdx`, `blockIdx` 등)
- Grid-stride loop 기초
- **시각 자료:** Thread-Block-Grid 구조도

### 4. CUDA 메모리 모델 기초

- Global / Shared / Local / Constant Memory
- `cudaMemcpy`를 통한 데이터 이동
- 간단한 메모리 복사와 연산 실습
- **시각 자료:** CUDA 메모리 계층 구조

### 5. 동기화와 흐름 제어

- `__syncthreads()`와 warp divergence
- barrier 동기화와 메모리 일관성
- 조건문 포함 커널 설계 주의점

## Part 2. CUDA 중급: 효율적인 병렬 프로그래밍

### 6. 메모리 접근 최적화

- Coalesced Memory Access
- Shared Memory 최적화 및 Bank Conflict 방지
- Padding 기법
- **예제 코드:** Shared memory 활용 벡터 합산

### 7. 병렬 연산 패턴: Reduction과 Scan

- 버터플라이 Tree-based Reduction
- Warp-level shuffle (`__shfl_down_sync`)
- Unrolling, Padding, Atomic 기반 방식 비교
- Prefix Sum (inclusive/exclusive)
- **시각 자료:** Tree 구조, Warp 구조

### 8. 스트림과 동시 실행

- CUDA Streams 개념
- 커널과 memcpy의 비동기 처리
- 멀티 스트림 성능 실험
- `cudaStreamSynchronize()`와 동기화 방식 비교

### 9. 동적 메모리와 Unified Memory

- `cudaMalloc`, `cudaFree`, `cudaMallocManaged`
- Memory Migration 동작 방식
- **예제 코드:** Unified memory 기반 연산

### 10. 템플릿과 커널 재사용

- 템플릿 기반 커널 작성
- 타입 일반화 예제 (`int`, `float`, `double`)

### 11. 성능 분석과 튜닝 전략

- Occupancy 개념 및 계산법
- Block/Thread 크기 조절 실습
- Nsight 및 nvprof 활용법

## Part 3. CUDA 고급: 고성능 최적화와 설계 전략

### 12. 커널 디버깅과 설계 전략

- warp divergence 방지 기법
- `cuda-gdb`, Visual Profiler, `printf` 디버깅 기법

### 13. 다양한 병렬화 테크닉

- Grid-stride loop
- Thread coarsening
- Loop unrolling
- Warp shuffle
- Double buffering
- Atomic 최적화 및 race condition 방지
- **예제 코드:** 각 테크닉 적용 커널 샘플

### 14. 커널 분할과 파이프라이닝

- Task Decomposition
- Kernel Fusion / Splitting 전략
- 이미지 필터를 활용한 예제 설계

### 15. CUDA Graph와 실행 흐름 최적화

- CUDA Graph API 소개
- 반복 작업 최적화 사례

### 16. Runtime API vs Driver API

- API 구조 비교 및 활용 시나리오
- Driver API 실습 예제

## Part 4. CUDA 전문가를 위한 병렬 시스템 설계

### 17. 데이터 분할과 부하 분산

- Static vs Dynamic Partitioning
- grid-stride loop 활용
- Workload imbalance 문제 해결 전략

### 18. 성능 확장성과 Multi-GPU 활용

- Strong vs Weak Scaling 개념
- Multi-GPU 실행 전략 및 성능 실험

### 19. 동기화와 일관성 모델

- CUDA Memory Model
- `__threadfence()`, memory visibility
- atomic 없이 race condition 실험

### 20. 분산 병렬 시스템과 Topology-aware 설계

- Ring, Tree, Mesh, All-to-All 구조
- GPU 간 통신 구조: NVLink, GPUDirect, MPI 연동
- **시각 자료:** Topology 도식

### 21. 병렬 알고리즘의 CUDA 구현 전략

- Map / Reduce / Scan / Scatter / Gather 설계
- Stream Compaction, Bitonic Sort, Parallel BFS
- 데이터 의존성 제거 전략

### 22. 종합 실전 프로젝트

- Matrix Multiply, Histogram, Prefix Sum 통합
- 최적화 전후 성능 분석
- 코드 리팩토링을 통한 병렬화 개선 사례

## 부록

- 자주 쓰는 CUDA API 요약
- 에러 코드와 디버깅 팁 (`cudaGetLastError` 등)
- 각 장 연습 문제 예시 (3~5문제)
- 추천 논문/자료 링크 정리