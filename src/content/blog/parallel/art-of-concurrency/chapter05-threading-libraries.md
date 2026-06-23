---
title: "Ch 5: Threading Libraries"
date: 2025-05-20T05:00:00
description: "스레딩 라이브러리 개요 — 공통 개념과 추상화"
series: "The Art of Concurrency"
seriesOrder: 5
tags: [concurrency, threading, libraries, abstraction]
draft: true
type: book-review
bookTitle: "The Art of Concurrency"
bookAuthor: "Clay Breshears"
---

## 스레딩 추상화

**스레딩 라이브러리**는 OS 스레드를 추상화하여 이식성과 편의성을 제공.

```
추상화 계층:

┌─────────────────────────────────────┐
│     애플리케이션 코드                 │
├─────────────────────────────────────┤
│     스레딩 라이브러리                 │
│  (C++ std::thread, pthreads, ...)  │
├─────────────────────────────────────┤
│     OS 스레딩 API                    │
│  (Windows Threads, pthread, ...)   │
├─────────────────────────────────────┤
│     커널 스케줄러                     │
└─────────────────────────────────────┘
```

**주요 라이브러리**:

| 라이브러리 | 언어 | 특징 |
|-----------|------|------|
| **pthreads** | C | POSIX 표준, Unix/Linux |
| **std::thread** | C++11+ | 표준 라이브러리 |
| **Win32 Threads** | C/C++ | Windows 전용 |
| **OpenMP** | C/C++/Fortran | 컴파일러 지시문 |
| **Java threads** | Java | JVM 관리 |

---

## 스레드 생성과 종료

### 스레드 생성

```
일반적 패턴:

1. 스레드 함수 정의
2. 스레드 생성 (함수 + 인자)
3. 스레드 실행
4. 조인 또는 분리
```

```
C++ std::thread 예:

void worker(int id) {
    // 작업 수행
}

int main() {
    std::thread t1(worker, 1);
    std::thread t2(worker, 2);

    t1.join();  // t1 완료 대기
    t2.join();  // t2 완료 대기
}
```

```
pthreads 예:

void* worker(void* arg) {
    int id = *(int*)arg;
    // 작업 수행
    return NULL;
}

int main() {
    pthread_t t1, t2;
    int id1 = 1, id2 = 2;

    pthread_create(&t1, NULL, worker, &id1);
    pthread_create(&t2, NULL, worker, &id2);

    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
}
```

### Join vs Detach

```
Join:
- 호출 스레드가 대상 스레드 완료를 기다림
- 리소스 정리 보장
- 결과 수집 가능

Detach:
- 스레드가 독립적으로 실행
- 완료 시 자동 정리
- 결과 수집 불가 (직접적으로)

┌──────────┐
│  Main    │
│ Thread   │
└────┬─────┘
     │ create
     ├───────────▶ Worker Thread
     │                 │
     │  join           │ 작업
     │◀────────────────┤
     │                 │ 완료
     ▼
   계속 실행
```

---

## 동기화 프리미티브

### 뮤텍스 (Mutex)

**상호 배제**: 한 번에 하나의 스레드만 임계 영역 진입.

```
기본 사용:

std::mutex mtx;

void critical_section() {
    mtx.lock();
    // 임계 영역 - 하나의 스레드만
    mtx.unlock();
}

RAII 스타일 (권장):

void critical_section() {
    std::lock_guard<std::mutex> lock(mtx);
    // 임계 영역
    // 스코프 끝에서 자동 unlock
}
```

**뮤텍스 종류**:

| 종류 | 설명 |
|------|------|
| **일반 뮤텍스** | 기본, 재귀 락 불가 |
| **재귀 뮤텍스** | 같은 스레드가 여러 번 락 가능 |
| **시도 뮤텍스** | 비블로킹 try_lock |
| **시간 뮤텍스** | 타임아웃 지원 |

---

### 세마포어 (Semaphore)

**카운팅 세마포어**: N개 스레드까지 동시 접근 허용.

```
개념:
- 초기 카운트 설정
- acquire: 카운트 감소 (0이면 대기)
- release: 카운트 증가

카운트 = 1 → 뮤텍스와 동일 (이진 세마포어)
카운트 = N → N개 스레드 동시 접근
```

```
C++20 std::counting_semaphore:

std::counting_semaphore<3> sem(3);  // 최대 3개

void worker() {
    sem.acquire();  // 카운트 감소, 0이면 대기
    // 최대 3개 스레드가 여기 있을 수 있음
    sem.release();  // 카운트 증가
}
```

**용도**:

```
- 리소스 풀 관리 (DB 연결 풀)
- 동시 접근 제한 (API rate limiting)
- 생산자-소비자 (버퍼 크기 제한)
```

---

### 조건 변수 (Condition Variable)

**이벤트 대기**: 특정 조건이 만족될 때까지 대기.

```
패턴:

std::mutex mtx;
std::condition_variable cv;
bool ready = false;

// 대기 스레드
void waiter() {
    std::unique_lock<std::mutex> lock(mtx);
    cv.wait(lock, []{ return ready; });
    // ready가 true일 때 진행
}

// 신호 스레드
void signaler() {
    {
        std::lock_guard<std::mutex> lock(mtx);
        ready = true;
    }
    cv.notify_one();  // 하나의 대기자 깨움
    // cv.notify_all();  // 모든 대기자 깨움
}
```

**생산자-소비자 예**:

```
std::queue<int> buffer;
std::mutex mtx;
std::condition_variable not_empty;
std::condition_variable not_full;
const int MAX_SIZE = 10;

void producer(int item) {
    std::unique_lock<std::mutex> lock(mtx);
    not_full.wait(lock, []{ return buffer.size() < MAX_SIZE; });
    buffer.push(item);
    not_empty.notify_one();
}

int consumer() {
    std::unique_lock<std::mutex> lock(mtx);
    not_empty.wait(lock, []{ return !buffer.empty(); });
    int item = buffer.front();
    buffer.pop();
    not_full.notify_one();
    return item;
}
```

---

### 배리어 (Barrier)

**동기화 지점**: 모든 스레드가 도달할 때까지 대기.

```
개념:
N개 스레드가 배리어에 도달하면 모두 진행

Thread 0: ──────●────────────────▶
Thread 1: ────────●──────────────▶
Thread 2: ──●────────────────────▶
Thread 3: ────────────●──────────▶
                      ↑
               배리어 (모두 도달 후 진행)
```

```
C++20 std::barrier:

std::barrier sync_point(4);  // 4개 스레드

void worker(int id) {
    // 1단계 작업
    do_phase1(id);

    sync_point.arrive_and_wait();  // 모두 완료 대기

    // 2단계 작업 (1단계 결과 사용 가능)
    do_phase2(id);
}
```

**용도**:

```
- 반복 알고리즘 (Jacobi, Gauss-Seidel)
- 단계별 계산 (시뮬레이션)
- 데이터 교환 전 동기화
```

---

## 스레드 풀

**미리 생성한 스레드 집합**에 작업을 제출.

```
장점:
- 스레드 생성 오버헤드 감소
- 스레드 수 제한
- 작업 큐 관리 자동화
```

```
개념:

┌─────────────────────────────────────┐
│          Task Queue                 │
│  [Task1] [Task2] [Task3] [...]      │
└───────────────┬─────────────────────┘
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
┌───────┐  ┌───────┐  ┌───────┐
│Thread1│  │Thread2│  │Thread3│
│ (Pool)│  │ (Pool)│  │ (Pool)│
└───────┘  └───────┘  └───────┘
```

```
간단한 스레드 풀 (의사코드):

class ThreadPool {
    vector<thread> workers;
    queue<function<void()>> tasks;
    mutex mtx;
    condition_variable cv;
    bool stop = false;

public:
    ThreadPool(int num_threads) {
        for (int i = 0; i < num_threads; i++) {
            workers.push_back(thread([this] {
                while (true) {
                    function<void()> task;
                    {
                        unique_lock<mutex> lock(mtx);
                        cv.wait(lock, [this] {
                            return stop || !tasks.empty();
                        });
                        if (stop && tasks.empty()) return;
                        task = move(tasks.front());
                        tasks.pop();
                    }
                    task();
                }
            }));
        }
    }

    void submit(function<void()> task) {
        {
            lock_guard<mutex> lock(mtx);
            tasks.push(move(task));
        }
        cv.notify_one();
    }
};
```

---

## 작업 기반 병렬성

**스레드 대신 작업(Task) 관점**으로 프로그래밍.

```
스레드 기반:
- 명시적 스레드 생성/관리
- 동기화 직접 처리
- 저수준 제어

작업 기반:
- 작업 제출, 실행은 런타임이 결정
- 의존성 표현 가능
- 고수준 추상화
```

```
C++ std::async 예:

// 비동기 작업 시작
auto future1 = std::async(std::launch::async, compute_part1);
auto future2 = std::async(std::launch::async, compute_part2);

// 결과 수집
int result1 = future1.get();
int result2 = future2.get();
int total = result1 + result2;
```

```
의존성 표현:

// task_b는 task_a의 결과에 의존
auto task_a = std::async(compute_a);
auto task_b = std::async([&] {
    int a = task_a.get();  // a 완료 대기
    return compute_b(a);
});
```

**프레임워크**:

| 프레임워크 | 특징 |
|-----------|------|
| **std::async** | C++ 표준, 단순 |
| **TBB** | Intel, task graph |
| **OpenMP tasks** | 컴파일러 지원 |
| **Cilk Plus** | fork-join 모델 |

---

## 정리

- **뮤텍스**: 상호 배제, RAII 스타일 권장
- **세마포어**: N개 동시 접근 제어
- **조건 변수**: 조건 기반 대기/신호
- **배리어**: 모든 스레드 동기화 지점
- **스레드 풀**: 오버헤드 감소, 작업 큐
- **작업 기반**: 고수준 추상화

---

## 핵심 비교

| 프리미티브 | 용도 | 특징 |
|-----------|------|------|
| 뮤텍스 | 상호 배제 | 1개만 진입 |
| 세마포어 | 리소스 제한 | N개까지 |
| 조건 변수 | 이벤트 대기 | 뮤텍스와 함께 |
| 배리어 | 동기화 지점 | 모두 도달 시 |

| 접근 방식 | 추상화 수준 | 제어 | 복잡도 |
|----------|------------|------|--------|
| 스레드 기반 | 낮음 | 높음 | 높음 |
| 스레드 풀 | 중간 | 중간 | 중간 |
| 작업 기반 | 높음 | 낮음 | 낮음 |

---

## 관련 항목

- [Ch 4: Eight Simple Rules](/blog/parallel/art-of-concurrency/chapter04-eight-rules) — 설계 규칙
- [Ch 6: Parallel Sum and Prefix Scan](/blog/parallel/art-of-concurrency/chapter06-parallel-sum-prefix) — 패턴 적용
- [C++ Concurrency Ch 2: Managing Threads](/blog/parallel/cpp-concurrency-in-action/chapter02-managing-threads) — C++ 상세
- [AMP Ch 7: Spin Locks and Contention](/blog/parallel/parallel-principles/ch07-spin-locks-and-contention) — 동기화 이론
