---
title: "병렬성 vs 동시성"
date: 2026-05-12
description: "Parallelism과 Concurrency의 차이. 왜 구분해야 하는가? 하드웨어 병렬성과 소프트웨어 동시성의 관계."
series: "Parallel Programming Principles"
seriesOrder: 1
tags: [parallel, concurrency, parallelism, fundamentals]
type: tech
---

> 이 글은 *The Art of Multiprocessor Programming* (Herlihy & Shavit) Chapter 1을 기반으로 합니다.

## 혼용되는 두 개념

**Parallelism**(병렬성)과 **Concurrency**(동시성)는 자주 혼용된다.

하지만 두 개념은 **다른 차원**의 이야기다.

---

## Concurrency: 논리적 동시 실행

**Concurrency**는 **여러 작업이 논리적으로 동시에 진행**되는 것이다.

```
┌─────────────────────────────────────────────┐
│ 시간 →                                       │
│                                             │
│ Task A: ████░░░░████░░░░████                │
│ Task B: ░░░░████░░░░████░░░░████            │
│                                             │
│ (░ = 대기, █ = 실행)                         │
│ 단일 코어에서 번갈아 실행                      │
└─────────────────────────────────────────────┘
```

**핵심**: 실제로 동시에 실행되지 않아도 된다. **인터리빙(interleaving)**으로 동시에 진행되는 **것처럼** 보인다.

### 예시

- 웹 서버가 여러 요청을 처리
- OS가 여러 프로세스를 스케줄링
- GUI가 사용자 입력과 렌더링을 동시에

### Concurrency의 목적

- **응답성**: 하나가 막혀도 다른 작업 진행
- **자원 활용**: I/O 대기 중 다른 작업 실행
- **모듈화**: 독립적인 작업을 분리

---

## Parallelism: 물리적 동시 실행

**Parallelism**은 **여러 작업이 물리적으로 동시에 실행**되는 것이다.

```
┌─────────────────────────────────────────────┐
│ 시간 →                                       │
│                                             │
│ Core 1: ████████████████████                │
│ Core 2: ████████████████████                │
│ Core 3: ████████████████████                │
│ Core 4: ████████████████████                │
│                                             │
│ 4개 코어가 동시에 실행                        │
└─────────────────────────────────────────────┘
```

**핵심**: **하드웨어**(멀티코어, 멀티프로세서)가 필요하다.

### 예시

- 4코어 CPU에서 4개 스레드 동시 실행
- GPU에서 수천 개 스레드 동시 실행
- 분산 시스템에서 여러 머신이 동시 계산

### Parallelism의 목적

- **처리량**: 단위 시간당 더 많은 작업 완료
- **속도**: 단일 작업을 더 빨리 완료
- **확장성**: 하드웨어 추가로 성능 향상

---

## 관계: Concurrency ⊇ Parallelism

```
┌─────────────────────────────────────┐
│          Concurrency               │
│  ┌─────────────────────────────┐   │
│  │       Parallelism          │   │
│  │                             │   │
│  │  (하드웨어 병렬 실행)         │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  (논리적 동시 실행)                  │
└─────────────────────────────────────┘
```

- **Parallelism은 Concurrency의 부분집합**
- 병렬 실행은 동시 실행이지만, 동시 실행이 항상 병렬은 아니다
- Concurrency without Parallelism: 단일 코어에서 멀티태스킹

---

## Rob Pike의 정의

Go 언어 창시자 Rob Pike의 유명한 정의:

> "**Concurrency is about dealing with lots of things at once.**
> **Parallelism is about doing lots of things at once.**"

| | Concurrency | Parallelism |
|--|-------------|-------------|
| 관점 | **구조**(Structure) | **실행**(Execution) |
| 질문 | 어떻게 설계할까? | 어떻게 빠르게 할까? |
| 요구 | 코드 설계 | 하드웨어 |

---

## 왜 구분이 중요한가

### 1. 문제 해결 방식이 다르다

**Concurrency 문제**: 동기화, 데드락, 레이스 컨디션
- "두 스레드가 같은 자원에 접근하면?"
- 해결: 락, 원자적 연산, 메모리 모델

**Parallelism 문제**: 분할, 부하 균형, 통신 오버헤드
- "작업을 어떻게 나눌까?"
- 해결: 알고리즘 설계, 스케줄링, 캐시 최적화

### 2. 최적화 목표가 다르다

**Concurrency 최적화**: 응답 시간, 공정성
- "모든 요청이 적절한 시간 내에 처리되는가?"

**Parallelism 최적화**: 처리량, 스피드업
- "8코어에서 8배 빨라지는가?"

### 3. 버그 유형이 다르다

**Concurrency 버그**: 비결정적, 재현 어려움
- 데드락, 라이브락, 기아
- 레이스 컨디션

**Parallelism 버그**: 성능 문제, 결정적
- 잘못된 분할로 부하 불균형
- False sharing으로 캐시 충돌

---

## 실전 예시

### 웹 서버

```cpp
// Concurrency: 여러 요청을 동시에 처리
void handle_request(Request req) {
    // 각 요청이 독립적으로 진행
    auto data = fetch_from_db(req);   // I/O 대기
    auto html = render(data);          // CPU 작업
    send_response(html);               // I/O 대기
}

// 100개 요청이 동시에 진행 (Concurrency)
// 4개 코어에서 실제로 4개씩 병렬 실행 (Parallelism)
```

### 행렬 곱셈

```cpp
// Parallelism: 계산을 물리적으로 분할
void matrix_multiply(Matrix& C, const Matrix& A, const Matrix& B) {
    #pragma omp parallel for  // 여러 코어에 분산
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < N; j++) {
            C[i][j] = 0;
            for (int k = 0; k < N; k++) {
                C[i][j] += A[i][k] * B[k][j];
            }
        }
    }
}

// 순수한 Parallelism: 동기화 거의 불필요
// 각 (i,j) 계산이 독립적
```

### 생산자-소비자

```cpp
// Concurrency + Parallelism
std::queue<Item> buffer;
std::mutex mtx;
std::condition_variable cv;

void producer() {
    while (true) {
        Item item = produce();
        {
            std::lock_guard lock(mtx);  // Concurrency: 동기화
            buffer.push(item);
        }
        cv.notify_one();
    }
}

void consumer() {
    while (true) {
        Item item;
        {
            std::unique_lock lock(mtx);
            cv.wait(lock, []{ return !buffer.empty(); });
            item = buffer.front();
            buffer.pop();
        }
        consume(item);  // Parallelism: 여러 소비자가 병렬 처리
    }
}
```

---

## 멀티코어 시대

### 과거: 클럭 속도 향상

```
1990년: 25 MHz
2000년: 1 GHz
2005년: 3 GHz
2010년: 3 GHz (정체)
```

**Dennard Scaling**의 종말: 클럭을 올리면 발열이 감당 불가.

### 현재: 코어 수 증가

```
2005년: 2코어
2010년: 4코어
2015년: 8코어
2020년: 16코어
2025년: 32+ 코어
```

**Parallelism이 필수**가 됐다. 단일 스레드 성능 향상은 한계.

### 의미

- **Concurrency**는 선택이 아닌 필수 (응답성)
- **Parallelism**은 성능 향상의 유일한 길

---

## 핵심 요약

| | Concurrency | Parallelism |
|--|-------------|-------------|
| 정의 | 논리적 동시 진행 | 물리적 동시 실행 |
| 요구 | 소프트웨어 설계 | 하드웨어 (멀티코어) |
| 목적 | 응답성, 모듈화 | 처리량, 속도 |
| 문제 | 동기화, 데드락 | 분할, 부하 균형 |
| 관계 | 상위 집합 | 부분 집합 |

---

## 이 시리즈에서

- **Part 1**: 병렬 프로그래밍의 기초 개념 (Parallelism 중심)
- **Part 2**: 동기화와 정확성 (Concurrency 중심)
- **Part 3**: 병렬 패턴 (Parallelism 중심)
- **Part 4**: 성능 분석 (둘 다)

---

다음 글: [Part 1-02: Amdahl의 법칙](/blog/parallel/parallel-principles/part1-02-amdahls-law)
