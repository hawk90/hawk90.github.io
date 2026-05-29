---
title: "Chapter 1: Introduction"
date: 2026-05-06T01:00:00
description: "멀티프로세서 프로그래밍이 왜 필요한가. 공유 메모리와 메시지 전달. 병렬 프로그래밍의 어려움."
series: "The Art of Multiprocessor Programming"
seriesOrder: 1
tags: [parallel, concurrency, book-review, amp, introduction, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: true
---

> **The Art of Multiprocessor Programming** Chapter 1 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

## 왜 이 장을 읽어야 하는가

2005년 이전의 개발자는 코드를 빠르게 만들고 싶으면 그저 기다리기만 하면 됐다. 2년 뒤 클럭이 두 배 빨라진 CPU가 나왔기 때문이다. 그 시대는 끝났다. Dennard scaling이 멈추고 클럭은 4GHz 근처에서 멈춰버렸다. 그래서 칩 제조사는 클럭 대신 **코어 수**를 늘리기 시작했다. 한 코어가 처리하던 일을 여러 코어가 나눠 처리해야 성능이 올라간다. 이 장은 그 새 세계의 지도다 — 왜 어렵고, 어떤 함정이 있으며, 책 전체가 무엇을 풀려고 하는지.

## 1.1 공유 객체와 동기화

### 왜 멀티프로세서인가?

칩의 트랜지스터 개수는 여전히 늘어난다 — Moore의 법칙은 살아 있다. 그러나 같은 면적당 전력을 일정하게 유지하면서 클럭을 올리던 **Dennard scaling**은 2005년경 끝났다. 클럭을 올리면 발열이 기하급수로 늘어 식힐 방법이 없어진 것이다. 제조사는 같은 다이에 코어를 늘리는 길로 방향을 틀었다. 4코어 → 8코어 → 16코어 → 데이터센터 EPYC 192코어. 이제 *프로그래머가 코어를 활용해야* 성능이 나온다.

**Moore's Law의 종말**

```
1970s-2000s: 클럭 속도 ↑ → 단일 스레드 성능 ↑
2005~: 클럭 속도 정체 (발열 한계)
2005~: 코어 수 ↑ → 병렬 처리 필수
```

단일 스레드 성능 향상이 멈췄다. 성능을 높이려면 **여러 코어**를 활용해야 한다.

### 공유 메모리 vs 메시지 전달

두 모델을 일상에 비유하면 다음과 같다. **공유 메모리**는 한 식탁에 둘러앉은 가족이 같은 김치 그릇에 손을 뻗는 상황이다. 누구의 손이 먼저 닿느냐가 문제고, 한 사람이 그릇을 잡고 있으면 다른 사람은 기다린다. **메시지 전달**은 다른 방에 있는 사람과 쪽지를 주고받는 상황이다. 그릇은 각자 자기 방에 있고, 필요하면 "그 김치 좀 줘"라고 쪽지를 보낸다.

![공유 메모리 vs 메시지 전달](/images/blog/parallel/diagrams/ch01-shared-vs-message.svg)

**공유 메모리 (Shared Memory)** — 모든 프로세서가 같은 메모리에 접근. 통신은 읽기/쓰기, 동기화는 락 / 원자적 연산.

**메시지 전달 (Message Passing)** — 각 프로세서가 독립된 메모리. 통신은 명시적 메시지 송수신, 동기화는 메시지 순서.

**이 책의 초점**: 공유 메모리 멀티프로세서

공유 메모리는 *빠르지만 위험*하다. 두 사람이 동시에 같은 김치에 손을 뻗으면 누구 손이 닿는지 보장되지 않는다 — 데이터 경쟁(data race). 메시지 전달은 *느리지만 안전*하다. 쪽지에 순서가 있어 두 명이 동시에 같은 자원을 만지지 않는다. 멀티코어 CPU는 하드웨어가 공유 메모리를 제공하므로, 우리는 빠른 길을 택하되 위험을 *동기화*로 다뤄야 한다.

---

## 1.2 병렬 프로그래밍의 도전

병렬 프로그래밍의 고전 문제 셋이 책 전체를 관통한다. 직관부터 잡고 가자.

**Dining Philosophers — 식당의 다섯 학자**

다섯 명의 학자가 둥근 식탁에 앉아 있다. 학자들 사이에는 젓가락이 한 짝씩, 총 다섯 짝이 놓여 있다. 식사하려면 *양옆의 젓가락 두 짝*이 필요하다. 모두가 동시에 왼쪽 젓가락을 집으면? 모두 오른쪽 젓가락을 영원히 기다린다. 곧 **데드락**이다. 자원 공유의 본질이 이 한 그림에 다 들어 있다.

**Producer-Consumer — 바리스타와 손님**

카페에 바리스타 한 명, 손님 여러 명. 바리스타는 커피잔을 카운터에 놓고, 손님은 카운터에서 잔을 가져간다. 카운터에는 잔을 둘 자리가 *유한*하다. 바리스타가 자리 다 차면 잠시 멈춰야 하고, 손님은 잔이 없으면 기다려야 한다. 이게 *bounded buffer*다 — 1.6.7절에서 코드로 다시 만난다.

**Readers-Writers — 도서관 사서와 정리 직원**

도서관에서 책을 읽는 손님은 여럿이 동시에 같은 책장을 봐도 된다. 그러나 새로 책을 *정리하는 직원*이 책장을 만지는 동안에는 누구도 그 책장에 접근하면 안 된다. 그렇지 않으면 책이 절반쯤 옮겨진 어중간한 상태를 보게 된다. 읽기는 여럿 OK, 쓰기는 혼자만. `std::shared_mutex`가 이 패턴이다.

### 도전 1: 상호 배제 (Mutual Exclusion)

상호 배제는 *한 번에 한 명만* 임계 영역에 들어가게 하는 것. 단순해 보이지만 하드웨어 도움 없이 구현하면 50년 전 Dekker, Peterson, Lamport가 풀었던 그 미묘함이 그대로 남아 있다. 2장 전체가 이 문제다.



**C++20**

```cpp
#include <atomic>
#include <thread>

std::atomic<int> counter{0};

void dangerous_increment() {
    // 위험: non-atomic 버전
    // int temp = counter.load(std::memory_order_relaxed);
    // counter.store(temp + 1, std::memory_order_relaxed);

    // 안전: atomic increment
    counter.fetch_add(1, std::memory_order_relaxed);
}
```

**C11 (`<stdatomic.h>`)**

```c
#include <stdatomic.h>

atomic_int counter = 0;

void dangerous_increment(void) {
    // 안전: atomic increment
    atomic_fetch_add(&counter, 1);
}
```

해결: 한 번에 하나의 스레드만 접근 허용

### 도전 2: 조건 동기화 (Condition Synchronization)

**C++20 (std::condition_variable + std::mutex)**

```cpp
#include <mutex>
#include <condition_variable>
#include <queue>

std::mutex mtx;
std::condition_variable cv;
std::queue<int> buffer;

void consumer() {
    std::unique_lock lock(mtx);
    cv.wait(lock, [] { return !buffer.empty(); });  // 조건 대기
    int item = buffer.front();
    buffer.pop();
}

void producer(int item) {
    {
        std::scoped_lock lock(mtx);
        buffer.push(item);
    }
    cv.notify_one();
}
```

**C11 (`<threads.h>`)**

```c
#include <threads.h>

mtx_t mtx;
cnd_t cv;
int buffer[100];
int count = 0;

int consumer(void* arg) {
    mtx_lock(&mtx);
    while (count == 0) {
        cnd_wait(&cv, &mtx);  // 조건 대기
    }
    int item = buffer[--count];
    mtx_unlock(&mtx);
    return item;
}

int producer(void* arg) {
    int item = *(int*)arg;
    mtx_lock(&mtx);
    buffer[count++] = item;
    mtx_unlock(&mtx);
    cnd_signal(&cv);
    return 0;
}
```

### 도전 3: 지연과 실패 (Latency and Failure)

스레드 A가 락을 잡고 멈추면, *다른 스레드들이 영원히 대기*할 수 있다. 데드락, 라이브락.

해결: 락-프리 알고리즘, 타임아웃

**C++20 — std::jthread와 cooperative cancellation**

```cpp
#include <thread>
#include <stop_token>

void worker(std::stop_token stoken) {
    while (!stoken.stop_requested()) {
        // 작업 수행
    }
}

int main() {
    std::jthread t(worker);
    // t.request_stop()으로 중단 요청 가능
    // 소멸자에서 자동 join
}
```

---

## 1.3 병렬 프로그래밍의 예술

### 정확성 vs 성능의 트레이드오프

| 접근 | 정확성 | 성능 | 복잡도 |
|-----|--------|------|--------|
| 거친 락 (Coarse) | 쉬움 | 낮음 | 낮음 |
| 세밀한 락 (Fine) | 어려움 | 높음 | 높음 |
| 락-프리 (Lock-free) | 매우 어려움 | 가장 높음 | 매우 높음 |

### 추상화 레벨

![Concurrency primitives by abstraction level](/images/blog/parallel-principles/diagrams/ch01-concurrency-layers.svg)

**위로 갈수록**: 사용하기 쉬움, 성능 손실 가능
**아래로 갈수록**: 성능 좋음, 버그 위험

---

## 1.4 C++20/23 동시성 기능

### C++11 → C++26 진화

| 표준 | 추가된 기능 |
|------|------------|
| C++11 | `std::thread`, `std::mutex`, `std::atomic`, `std::future` |
| C++14 | `std::shared_timed_mutex` |
| C++17 | `std::shared_mutex`, `std::scoped_lock`, 병렬 알고리즘 |
| C++20 | `std::jthread`, `std::stop_token`, `std::latch`, `std::barrier`, `std::counting_semaphore` |
| C++23 | `std::generator` (코루틴), `std::expected`, monadic 인터페이스 |
| C++26 | `std::hazard_pointer`, `std::rcu`, `std::execution` (sender/receiver) 등 진행 중 |

### C++20 신규 기능 맛보기

**std::latch — 일회성 카운터**

```cpp
#include <latch>
#include <thread>
#include <vector>

void worker(std::latch& done) {
    // 작업 수행
    done.count_down();
}

int main() {
    constexpr int N = 10;
    std::latch done(N);
    std::vector<std::jthread> threads;

    for (int i = 0; i < N; ++i) {
        threads.emplace_back(worker, std::ref(done));
    }

    done.wait();  // 모든 워커가 끝날 때까지 대기
}
```

**std::barrier — 재사용 가능 동기점**

```cpp
#include <barrier>
#include <thread>
#include <print>

void worker(std::barrier<>& sync_point, int id) {
    for (int phase = 0; phase < 3; ++phase) {
        std::println("Worker {} phase {}", id, phase);
        sync_point.arrive_and_wait();
    }
}

int main() {
    constexpr int N = 4;
    std::barrier sync_point(N);
    std::vector<std::jthread> threads;

    for (int i = 0; i < N; ++i) {
        threads.emplace_back(worker, std::ref(sync_point), i);
    }
}
```

**std::counting_semaphore**

```cpp
#include <semaphore>
#include <thread>

std::counting_semaphore<10> slots(10);  // 최대 10개 동시 접근

void limited_resource_access() {
    slots.acquire();
    // 리소스 사용 (최대 10개 스레드만 동시 접근)
    slots.release();
}
```

---

## 1.5 C11 동시성 기능

### `<stdatomic.h>` 기본

```c
#include <stdatomic.h>
#include <threads.h>
#include <stdio.h>

atomic_int shared_counter = 0;
atomic_flag spinlock = ATOMIC_FLAG_INIT;

void increment(void) {
    // atomic increment
    atomic_fetch_add_explicit(&shared_counter, 1, memory_order_relaxed);
}

void spinlock_acquire(void) {
    while (atomic_flag_test_and_set_explicit(&spinlock, memory_order_acquire)) {
        // spin
    }
}

void spinlock_release(void) {
    atomic_flag_clear_explicit(&spinlock, memory_order_release);
}
```

### `<threads.h>` 기본

```c
#include <threads.h>
#include <stdio.h>

int thread_func(void* arg) {
    int id = *(int*)arg;
    printf("Thread %d\n", id);
    return 0;
}

int main(void) {
    thrd_t threads[4];
    int ids[4] = {0, 1, 2, 3};

    for (int i = 0; i < 4; ++i) {
        thrd_create(&threads[i], thread_func, &ids[i]);
    }

    for (int i = 0; i < 4; ++i) {
        thrd_join(threads[i], NULL);
    }

    return 0;
}
```

---

## 1.6 실습: Amdahl의 법칙

### 직관 — 청소와 모래시계

100명을 모아 100㎡ 사무실을 청소한다. 각자 1㎡씩 맡으면 100배 빠르게 끝날까? **청소 자체**는 그렇다. 그러나 청소 후 모두가 한 줄로 서서 *모래시계* 하나를 통과해야 퇴근할 수 있다고 하자. 모래시계는 한 번에 한 명, 1초에 한 명씩. 청소가 0.5초 만에 끝나도 100명이 모래시계를 통과하려면 100초가 필요하다. 전체 시간은 100.5초 — 청소 시간이 0으로 가도 100초의 *직렬 부분*이 천장이다. 이게 Amdahl의 법칙이다.

### 병렬화의 한계

프로그램의 일부만 병렬화 가능:

$$
\text{Speedup} = \frac{1}{(1-p) + \frac{p}{n}}
$$

- **p**: 병렬화 가능 비율
- **n**: 프로세서 수

### 공식 유도

책은 단순한 논리에서 공식을 끌어낸다. 단일 프로세서에서 전체 작업 시간을 1로 정규화한다.

$$
T_1 = 1 = \underbrace{(1-p)}_{\text{순차 부분}} + \underbrace{p}_{\text{병렬 부분}}
$$

n개 프로세서를 쓰면 순차 부분은 그대로지만, 병렬 부분은 n분의 1로 줄어든다.

$$
T_n = (1-p) + \frac{p}{n}
$$

speedup은 두 시간의 비.

$$
S_n = \frac{T_1}{T_n} = \frac{1}{(1-p) + p/n}
$$

n이 무한대로 가면 분모가 $1-p$로 수렴한다. 따라서 이론적 상한은:

$$
S_\infty = \lim_{n \to \infty} \frac{1}{(1-p) + p/n} = \frac{1}{1-p}
$$

### 예시

```text
90% 병렬화 가능, 10코어:
Speedup = 1 / (0.1 + 0.9/10) = 1 / 0.19 ≈ 5.3x

90% 병렬화 가능, 100코어:
Speedup = 1 / (0.1 + 0.9/100) = 1 / 0.109 ≈ 9.2x

90% 병렬화 가능, ∞ 코어:
Speedup = 1 / 0.1 = 10x (최대)
```

### 워크드 예제 — 책에서

10시간 걸리는 작업이 있다. 그 중 1시간이 본질적으로 순차적이라면 ($p = 0.9$):

```text
n=1:    T = 10h,              S = 1.0x
n=2:    T = 1 + 9/2  = 5.5h,  S = 1.82x
n=4:    T = 1 + 9/4  = 3.25h, S = 3.08x
n=8:    T = 1 + 9/8  = 2.125h,S = 4.71x
n=16:   T = 1 + 9/16 = 1.56h, S = 6.40x
n=64:   T = 1 + 9/64 = 1.14h, S = 8.77x
n=∞:    T = 1h,               S = 10.0x   ← 상한
```

코어가 64개 있어도 8.77배밖에 안 나온다. **순차 1시간이 전체를 결정한다**. 95% 병렬화로 끌어올리면 상한이 20배로 두 배가 된다.

| $p$ | $S_\infty$ | $n = 64$일 때 |
|-----|-----------|---------------|
| 0.50 | 2.0x | 1.97x |
| 0.75 | 4.0x | 3.88x |
| 0.90 | 10.0x | 8.77x |
| 0.95 | 20.0x | 15.42x |
| 0.99 | 100.0x | 39.26x |
| 0.999 | 1000.0x | 60.32x |

**결론**: 순차 부분이 전체를 지배한다. 병렬화율을 1%만 올려도 상한이 극적으로 바뀐다.

### Gustafson의 법칙 — 또 다른 시각

Amdahl은 **문제 크기 고정**을 가정한다. Gustafson(1988)은 다른 시각을 제시했다. 코어가 늘어나면 사람들은 **더 큰 문제**를 풀고 싶어한다.

n 프로세서 환경에서 작업의 순차 시간 비율이 $s$, 병렬 시간 비율이 $1-s$라 하자. 이 작업을 단일 프로세서로 환산하면:

$$
T_1 = s + n(1-s)
$$

병렬 부분이 n개 프로세서에 분산된 결과이기 때문이다. 따라서 scaled speedup:

$$
S_{\text{Gustafson}}(n) = \frac{s + n(1-s)}{s + (1-s)} = s + n(1-s) = n - s(n-1)
$$

이 공식은 **n에 선형**이다. Amdahl과 정반대 결론. 핵심 차이는 가정이다.

| 법칙 | 가정 | 결론 |
|------|------|------|
| Amdahl | 문제 크기 고정 ($p$ 비율 고정) | 코어 늘려도 상한 존재 |
| Gustafson | 시간 고정, 문제 크기 확장 | 코어에 비례한 선형 speedup |

실제 워크로드 — 시뮬레이션, 머신러닝 학습, 빅데이터 — 는 Gustafson 모델에 가깝다. 데이터셋이 클수록 병렬 부분이 절대적으로 늘어나기 때문이다.

### 강한 확장성 vs 약한 확장성

**Strong scaling (Amdahl):**

- 문제 크기 고정
- 코어 추가 시 각 코어의 일이 줄어듦
- 통신/동기화 오버헤드가 지배적

**Weak scaling (Gustafson):**

- 코어당 일이 일정
- 코어 추가 시 전체 문제 크기 증가
- 통신이 잘 설계되면 선형

벤치마크할 때 둘을 구분하지 않으면 잘못된 결론을 내린다. HPC 벤치마크는 두 가지 모두 보고하는 게 표준이다.

### C++17 병렬 알고리즘으로 측정

```cpp
#include <algorithm>
#include <execution>
#include <vector>
#include <chrono>
#include <print>

int main() {
    std::vector<double> data(100'000'000, 1.0);

    // 순차 실행
    auto t1 = std::chrono::high_resolution_clock::now();
    std::for_each(std::execution::seq, data.begin(), data.end(),
                  [](double& x) { x = std::sin(x) * std::cos(x); });
    auto t2 = std::chrono::high_resolution_clock::now();

    // 병렬 실행
    auto t3 = std::chrono::high_resolution_clock::now();
    std::for_each(std::execution::par, data.begin(), data.end(),
                  [](double& x) { x = std::sin(x) * std::cos(x); });
    auto t4 = std::chrono::high_resolution_clock::now();

    auto seq_time = std::chrono::duration<double>(t2 - t1).count();
    auto par_time = std::chrono::duration<double>(t4 - t3).count();

    std::println("Sequential: {:.3f}s", seq_time);
    std::println("Parallel:   {:.3f}s", par_time);
    std::println("Speedup:    {:.2f}x", seq_time / par_time);
}
```

---

## 1.6.5 Hard vs Soft Real-time

책 1.5절은 동시성 시스템의 시간 보장을 두 부류로 나눈다.

### Hard real-time

> 데드라인을 **놓치면 시스템이 실패**한다.

- 항공기 제어, 자동차 브레이크, 의료 기기, 산업용 로봇
- 응답 시간이 결정론적(deterministic)이어야 한다
- 평균이 아닌 **최악(worst-case)** 시간을 보장해야 한다
- wait-free 알고리즘이 필수에 가깝다 — 모든 호출이 유한 단계에서 끝나야 한다

### Soft real-time

> 데드라인을 **놓쳐도 결과가 열화**될 뿐 시스템은 계속 동작한다.

- 비디오 재생(프레임 드롭), 게임(스터터링), VOIP(음성 끊김)
- 평균 응답 시간이 중요하지 최악 시간은 통계적 한계로 충분
- lock-free 또는 잘 튜닝된 lock 기반으로 충분

### 비교 표

| 항목 | Hard real-time | Soft real-time |
|------|----------------|----------------|
| 데드라인 위반 | 시스템 실패 | 품질 저하 |
| 응답 시간 보장 | 결정론적 worst-case | 확률적/평균 |
| 동기화 | wait-free 선호 | lock-free / mutex |
| 가비지 컬렉션 | 금지 또는 결정론적 GC | 일반 GC 허용 |
| 스케줄러 | 우선순위 기반 RTOS | 일반 OS |
| 예시 | 항공, 자동차, 의료 | 비디오, 오디오, 게임 |

### Hard real-time의 함정

**일반 OS의 함정:**

- 페이지 폴트 → 디스크 IO → 수십 ms 지연
- 가비지 컬렉션 stop-the-world
- 우선순위 역전 (Mars Pathfinder, 1997)
- 캐시 미스로 인한 지연 변동성
- mutex의 priority inheritance 없으면 무한 대기 가능

**해결책:**

- 메모리 핀(mlockall)
- 미리 할당된 객체 풀
- 우선순위 상속 mutex (PTHREAD_PRIO_INHERIT)
- wait-free 자료구조
- RTOS (FreeRTOS, Zephyr, VxWorks, QNX)

이 책의 후반부 자료구조 — lock-free queue, wait-free counter — 가 왜 중요한지 여기서 동기가 나온다. 실시간 시스템은 평균이 아닌 최악을 다뤄야 한다.

---

## 1.6.7 Producer-Consumer with Bounded Buffer

책 1.2절의 대표 예제. 한 스레드가 데이터를 생성하고 다른 스레드가 소비한다. 버퍼는 유한 크기.

### 의사 코드

**shared:**

- buffer[N]           ─ 원형 버퍼
- head, tail          ─ 인덱스
- not_full, not_empty ─ 조건 변수
- mtx                 ─ 뮤텍스

**producer():**


**loop:**

- item = produce()
- acquire(mtx)

**while (count == N):**

- wait(not_full, mtx)
- buffer[tail] = item
- tail = (tail + 1) mod N
- count = count + 1
- signal(not_empty)
- release(mtx)

**consumer():**


**loop:**

- acquire(mtx)

**while (count == 0):**

- wait(not_empty, mtx)
- item = buffer[head]
- head = (head + 1) mod N
- count = count - 1
- signal(not_full)
- release(mtx)
- consume(item)

### C++20 구현

```cpp
#include <mutex>
#include <condition_variable>
#include <optional>
#include <array>

template <typename T, size_t N>
class BoundedBuffer {
    std::array<T, N> buffer;
    size_t head = 0, tail = 0, count = 0;
    mutable std::mutex mtx;
    std::condition_variable not_full, not_empty;

public:
    void put(T item) {
        std::unique_lock lock(mtx);
        not_full.wait(lock, [this] { return count < N; });
        buffer[tail] = std::move(item);
        tail = (tail + 1) % N;
        ++count;
        not_empty.notify_one();
    }

    T take() {
        std::unique_lock lock(mtx);
        not_empty.wait(lock, [this] { return count > 0; });
        T item = std::move(buffer[head]);
        head = (head + 1) % N;
        --count;
        not_full.notify_one();
        return item;
    }
};
```

### C11 구현

```c
#include <threads.h>
#include <stdbool.h>

#define BUF_SIZE 256

typedef struct {
    int buffer[BUF_SIZE];
    size_t head, tail, count;
    mtx_t mtx;
    cnd_t not_full, not_empty;
} BoundedBuffer;

void bb_init(BoundedBuffer* bb) {
    bb->head = bb->tail = bb->count = 0;
    mtx_init(&bb->mtx, mtx_plain);
    cnd_init(&bb->not_full);
    cnd_init(&bb->not_empty);
}

void bb_put(BoundedBuffer* bb, int item) {
    mtx_lock(&bb->mtx);
    while (bb->count == BUF_SIZE) {
        cnd_wait(&bb->not_full, &bb->mtx);
    }
    bb->buffer[bb->tail] = item;
    bb->tail = (bb->tail + 1) % BUF_SIZE;
    bb->count++;
    cnd_signal(&bb->not_empty);
    mtx_unlock(&bb->mtx);
}

int bb_take(BoundedBuffer* bb) {
    mtx_lock(&bb->mtx);
    while (bb->count == 0) {
        cnd_wait(&bb->not_empty, &bb->mtx);
    }
    int item = bb->buffer[bb->head];
    bb->head = (bb->head + 1) % BUF_SIZE;
    bb->count--;
    cnd_signal(&bb->not_full);
    mtx_unlock(&bb->mtx);
    return item;
}
```

### 두 가지 핵심 — 책의 강조

1. **상호 배제**: `count`, `head`, `tail`이 일관되게 갱신되려면 mutex로 보호해야 한다.
2. **조건 동기화**: 버퍼가 가득/비어 있으면 단순 spin이 아니라 **조건 변수**로 대기. CPU 낭비도 없고, 깨어날 때 조건을 다시 검사한다 (`while` 루프, `if`가 아니다 — spurious wakeup 때문).

이 패턴은 14장의 lock-free queue에서 다시 등장한다. 거기서는 mutex 없이 같은 일을 한다.

---

## 1.7 이 책의 구조

### Part I: Principles (원리)

| Chapter | 내용 |
|---------|------|
| Ch 2 | Mutual Exclusion: 상호 배제의 이론 |
| Ch 3 | Concurrent Objects: 정확성 정의 (Linearizability) |
| Ch 4 | Shared Memory: 레지스터와 원자적 스냅샷 |

### Part II: Practice (실전)

| Chapter | 내용 |
|---------|------|
| Ch 5-6 | 동기화 프리미티브의 힘과 한계 |
| Ch 7-8 | 스핀락, 모니터, 블로킹 동기화 |
| Ch 9-15 | 동시성 자료구조 (리스트, 큐, 스택, 해시, ...) |
| Ch 16-17 | 스케줄링, 배리어 |
| Ch 18 | 트랜잭셔널 메모리 |

---

## 핵심 개념

| 개념 | 정의 | C++ | C |
|-----|------|-----|---|
| **Shared Memory** | 여러 프로세서가 공유하는 메모리 | `std::atomic<T>` | `_Atomic T` |
| **Mutual Exclusion** | 한 번에 하나만 임계 영역 진입 | `std::mutex` | `mtx_t` |
| **Linearizability** | 동시 실행이 순차 실행처럼 보임 | - | - |
| **Lock-free** | 일부가 멈춰도 시스템은 진행 | `std::atomic<T>::compare_exchange_*` | `atomic_compare_exchange_*` |
| **Wait-free** | 모든 스레드가 유한 시간 내 완료 | - | - |

---

## 생각해볼 질문

1. 왜 클럭 속도를 계속 올릴 수 없는가?
2. 공유 메모리와 메시지 전달 중 어떤 게 더 쉬운가?
3. 락-프리가 항상 빠른가?
4. Amdahl의 법칙이 비관적인 이유는?

---

## 한국 개발자의 흔한 함정

**1. *멀티스레드 = 빠름*이라는 착각**

- Amdahl: 순차 부분이 지배
- 동기화 오버헤드가 이득보다 클 수 있음

**2. *mutex만 쓰면 안전*하다는 오해**

- 정확성 ≠ 성능
- 거친 락은 확장성을 죽인다

**3. *락-프리 = 무조건 좋다***

- 구현이 매우 어렵다
- 코어 수 적으면 락이 더 빠를 수 있다

**4. *프레임워크가 다 해준다***

- 메모리 모델 이해 없이는 미묘한 버그

## 실무 적용 — 어디서 만나나

**C++20/23:**

- std::jthread         → 자동 join + stop_token
- std::latch/barrier   → 동기화 지점
- std::counting_semaphore → 리소스 제한
- std::atomic<T>::wait → 스핀락 대신 대기

**C11:**

- <stdatomic.h>       → atomic_*
- <threads.h>         → thrd_*, mtx_*, cnd_*

**비교:**

- C++ std::mutex       ↔ C mtx_t
- C++ std::thread      ↔ C thrd_t
- C++ std::atomic<T>   ↔ C _Atomic T
- C++ condition_variable ↔ C cnd_t

## 자기 점검

- [ ] Moore's Law 종말의 의미를 한 줄로 설명?
- [ ] Shared memory vs message passing 차이 명시?
- [ ] Amdahl 법칙 직접 계산 가능?
- [ ] C++20 std::jthread vs std::thread 차이?
- [ ] C11 atomic_flag의 용도?
- [ ] Lock-free vs Wait-free 구분?

## 실제 시스템 사례

이 장의 추상 개념이 실제 시스템에서 어떻게 나타나는지 살펴보자.

### Intel/AMD 코어 수의 폭증

```text
2006: Intel Core 2 Duo       — 2 cores
2010: Intel Core i7-980X     — 6 cores
2017: AMD Ryzen Threadripper — 16 cores
2019: AMD EPYC 7742          — 64 cores  (Rome)
2022: AMD EPYC 7773X         — 64 cores  (with 768MB L3)
2023: AMD EPYC 9654          — 96 cores  (Genoa)
2024: AMD EPYC 9965          — 192 cores (Turin Dense)
```

서버 한 대에 192코어가 들어가는 시대다. 단일 머신에서 *수십~수백 스레드*가 같은 메모리를 공유한다. 이 장의 공유 메모리 모델이 그대로 적용된다. Amdahl을 모르고 워크로드를 짜면 코어 추가가 수익으로 이어지지 않는다.

### 스마트폰의 big.LITTLE / DynamIQ

ARM이 도입한 *비대칭 멀티코어*. 빠르지만 전력 먹는 *big* 코어 몇 개, 느리지만 효율적인 *LITTLE* 코어 몇 개를 한 칩에 둔다. Snapdragon, Apple A/M 시리즈, Samsung Exynos 모두 이 구조.

**Apple A17 Pro:**

- 2× Performance core (high freq, big OOO window)
- 4× Efficiency core (low freq, small OOO window)

스케줄러가 워크로드를 *코어 클래스에 매핑*한다. 공유 메모리 모델은 동일하고, 캐시 일관성 프로토콜은 *클래스를 가리지 않고* 모든 코어에 적용된다.

이게 동기화 비용을 더 복잡하게 만든다. big-core가 LITTLE-core를 기다리는 경우 latency가 비대칭이다. 9-10장의 락 알고리즘들이 이런 환경에서 *공정성*을 보장하려고 큐 기반(MCS, CLH)으로 진화한 배경.

### 데이터센터 분산 처리

단일 서버 192코어는 시작에 불과하다. Google, Meta, Amazon은 *수십만 대*를 묶어 한 워크로드를 돌린다.

계층 — 이 책(공유 메모리, 단일 노드) → 한 노드 안에서 lock-free / wait-free → 분산(메시지 전달).

| 분산 영역 | 도구 |
|-----------|------|
| 분산 합의 | gRPC, Raft (etcd, Consul) |
| 대용량 배치 | Spark, Flink |
| 이벤트 스트림 | Kafka |

분산 시스템에서도 이 책의 개념이 변형되어 등장한다. **Linearizability** → 분산 합의 (Raft, Paxos). **Wait-free** → 한 노드가 죽어도 다른 노드는 진행. **Amdahl** → MapReduce의 reduce 단계가 직렬 부분.

### Java/Kotlin 서버 워크로드

Spring Boot, Ktor 같은 JVM 웹 프레임워크는 요청당 스레드 모델이거나 코루틴 기반. 어느 쪽이든 내부적으로 `ConcurrentHashMap`, `ReentrantLock`, `AtomicLong`이 도처에 깔려 있다. JDK의 `java.util.concurrent`는 이 책의 알고리즘들 (Harris-Michael list, Michael-Scott queue, CLH lock 등)이 production에서 검증된 구현체다.

### 게임 엔진 — Unity / Unreal

게임 엔진은 *프레임당 16.6ms* (60fps) 안에 모든 일을 끝내야 한다. Job system은 작업을 여러 코어에 뿌리고 합치는 패턴 — 이게 정확히 Amdahl이다. *직렬 부분*이 한 프레임 천장을 결정한다. Unity DOTS / Unreal Mass entity 시스템이 ECS로 가는 이유는 데이터 의존성을 끊어 병렬화 비율 `p`를 올리려는 것.

---

## 관련 항목

- [Chapter 2: Mutual Exclusion](/blog/parallel/parallel-principles/ch02-mutual-exclusion) — 다음 글
- [Chapter 3: Concurrent Objects](/blog/parallel/parallel-principles/ch03-concurrent-objects) — Linearizability
- [C++ Concurrency in Action — Ch 1](/blog/parallel/cpp-concurrency-in-action/chapter01-hello-concurrent-world) — C++ 관점

---

다음 글: [Chapter 2: Mutual Exclusion](/blog/parallel/parallel-principles/ch02-mutual-exclusion)
