---
title: "Ch 4: Helgrind와 DRD"
date: 2026-05-15T04:00:00
description: "Valgrind의 두 동시성 분석 도구 비교 — Helgrind의 락 추적과 DRD의 vector clock, 언제 무엇을."
tags: [Valgrind, Helgrind, DRD, Concurrency, DataRace, Debugging, C, C++]
series: "Valgrind"
seriesOrder: 4
draft: false
---

## 두 도구가 *나뉜 이유*

Valgrind에는 멀티스레드 분석 도구가 *두 개* 있습니다 — Helgrind와 DRD. 같은 일을 한다면 *왜 둘인지* 궁금할 만합니다.

답은 *알고리즘이 다르기* 때문입니다.

| | Helgrind | DRD |
|---|---|---|
| 알고리즘 기반 | *Lock-set* + *happens-before* | *Lamport's vector clock* |
| 메모리 사용 | 많음 | 적음 (큰 코드에 유리) |
| 락 사용 오류 | *매우 강함* | 보통 |
| 데이터 레이스 감지 | 강함 | *조금 더 정확* |
| Lock-order inversion | 잡음 | 잡음 |
| 시작 시간 | 빠름 | 빠름 |
| False positive | 비교적 적음 | 비슷 |

요약: **Helgrind는 락 오용에, DRD는 데이터 레이스에 약간 더 강합니다**. 실무에서는 *Helgrind를 먼저 시도*하고, 그래도 안 잡히는 자리에 DRD를 씁니다.

---

## Helgrind — 락 추적

Helgrind는 *각 메모리 접근에 대한 lockset*을 추적합니다. lockset이란 *접근 시점에 잡혀 있던 락의 집합*.

```cpp
std::mutex m1, m2;
int counter = 0;

// 스레드 A
{
    std::lock_guard<std::mutex> g(m1);
    counter++;     // 이 접근 시점 lockset = {m1}
}

// 스레드 B
{
    std::lock_guard<std::mutex> g(m2);
    counter++;     // 이 접근 시점 lockset = {m2}
}
```

두 접근의 lockset이 *교집합 없음* → *공통 보호 락 없음* → *데이터 레이스*.

Helgrind의 lockset 모델은 *직관적*이고, *false positive가 비교적 적습니다*. 두 스레드가 *같은 락을 쥐고* 같은 변수에 접근하면 안전, 다른 락을 쥐고 접근하면 경고.

### Helgrind 실행

```bash
valgrind --tool=helgrind ./myapp
```

### 잡는 것

1. **데이터 레이스** — 동기화 없이 동시 접근.
2. **Lock-order violation** — 데드락 가능성. 두 스레드가 *서로 다른 순서로* 락 획득.
3. **Misuse of pthread API** — `pthread_mutex_unlock`을 *잡지 않은 락에* 호출 등.
4. **API 위반** — `pthread_cond_wait`을 락 없이 호출 등.

### 보고서 예시 — 데이터 레이스

```
Possible data race during write of size 4 at 0x10c020 by thread #2
   at 0x40119A: increment (race.c:8)
   by 0x40120F: thread_run (race.c:15)
   by 0x4842B61: ??? (pthread_create.c:478)

This conflicts with a previous write of size 4 by thread #1
   at 0x40119A: increment (race.c:8)
   by 0x40120F: thread_run (race.c:15)

Location 0x10c020 is 0 bytes inside data symbol "counter"
```

핵심:
- *Possible data race* — Helgrind는 "*확실한*" 게 아니라 "*가능한*" 레이스를 보고.
- *두 스레드의 두 접근*이 같은 메모리에 충돌.
- *Location*에서 변수 이름(`counter`)까지 표시.

### 락 오용 — Helgrind의 강점

```cpp
std::mutex m;

void buggy() {
    m.lock();
    if (some_condition()) {
        return;       // ❌ unlock 안 함
    }
    m.unlock();
}
```

Helgrind는 *unlock 안 된 락*을 추적합니다.

```
Thread #1's call to pthread_mutex_lock failed
   ...
```

이런 자리는 *런타임에 보일 때까지* 디버깅이 어려운데, Helgrind가 *바로 잡아 줍니다*.

### Lock-order inversion

```cpp
// 스레드 A
std::lock_guard<std::mutex> a(m1);
std::lock_guard<std::mutex> b(m2);   // m1 → m2

// 스레드 B
std::lock_guard<std::mutex> b(m2);
std::lock_guard<std::mutex> a(m1);   // m2 → m1 ← 데드락 위험
```

```
Thread #2: lock order "m1 before m2" violated
   ...
This required order was established by acquisition of lock at 0x... 
   by thread #1
```

*실제 데드락이 발생하지 않아도* 가능성만으로 경고. C++17의 `std::scoped_lock`이 이를 자동 회피합니다.

---

## DRD — Data Race Detector

DRD는 *Lamport's vector clock* 알고리즘으로 *시간 순서*를 추적합니다.

```
       T1: a=1
        \
         sem_post
            \
             sem_wait → T2 (a 읽기 안전)

       T1: b=1
                    
        T2: b 읽기  ← 동기화 없음, race
```

각 스레드와 각 동기화 객체에 *vector clock*을 두고, 메모리 접근마다 이 clock으로 *happens-before 관계*를 정확히 계산.

### DRD 실행

```bash
valgrind --tool=drd ./myapp
```

### 잡는 것

Helgrind와 *대부분 겹칩니다*. 차이:

- **DRD는 vector clock 기반**이라 *복잡한 동기화 패턴*에 더 정확.
- **메모리를 덜 씀**. 큰 프로그램에서 Helgrind가 OOM 날 때 DRD는 동작.
- **POSIX condvar 의미가 더 정확**. 일부 시그널/대기 패턴.

### 자주 추가 잡는 자리

```cpp
// Helgrind는 놓칠 수 있지만 DRD가 잡는 패턴
std::atomic<int> seq{0};

// 스레드 A
data = compute();
seq.store(seq.load() + 1, std::memory_order_relaxed);   // sequence number 갱신

// 스레드 B
int s = seq.load(std::memory_order_relaxed);
if (s > last_seq) {
    use(data);   // ← relaxed라 happens-before 없음. race
}
```

`relaxed` atomic은 *순서 보장이 없는데*, Helgrind는 *atomic이라 OK라고 판단*할 수 있습니다. DRD는 vector clock으로 *정확히* 잡습니다.

---

## 둘 *동시에* 돌리지 마라

```bash
# 안 됨
valgrind --tool=helgrind --tool=drd ./myapp
```

Valgrind 도구는 *한 번에 하나*만 실행할 수 있습니다. Helgrind와 DRD를 모두 보려면 *별도 실행*.

```bash
valgrind --tool=helgrind ./myapp 2>&1 | tee hg.log
valgrind --tool=drd ./myapp 2>&1 | tee drd.log
```

각 보고서를 *교차 검증*하면 신뢰도가 올라갑니다. 둘 다 잡은 자리 → 거의 확실. 한쪽만 잡은 자리 → 그 도구의 특기일 가능성.

---

## 비용 — *얼마나 느린가*

Helgrind와 DRD는 *Memcheck보다 약간 더 느림*. 보통 20~50× 정도.

```
일반 실행:           1초
Memcheck:           10~50초
Helgrind:           30~100초
DRD:                25~80초
```

큰 프로그램 + 멀티스레드 시나리오에서는 *분 → 시간* 단위가 됩니다. *짧은 시나리오*에서 호출.

---

## 주요 옵션

### Helgrind

```bash
valgrind --tool=helgrind \
  --history-level=full \
  --conflict-cache-size=2000000 \
  ./myapp
```

| 옵션 | 의미 |
|------|------|
| `--history-level=full` | 모든 race의 *과거 접근 트레이스* 포함 (기본). |
| `--history-level=approx` | 트레이스 생략. *빠르지만 디버깅 어려워짐*. |
| `--history-level=none` | 가장 빠름. 트레이스 없음. |
| `--conflict-cache-size=N` | 충돌 추적 캐시. 크면 *더 많은 race* 잡지만 메모리 ↑. |
| `--check-stack-refs=no` | 스택 변수의 race 무시. 보통 켜 둠. |
| `--ignore-thread-creation=yes` | 스레드 생성 시점의 race 무시. |

### DRD

```bash
valgrind --tool=drd \
  --check-stack-var=yes \
  --segment-merging=yes \
  ./myapp
```

| 옵션 | 의미 |
|------|------|
| `--check-stack-var=yes` | 스택 변수의 race 검사. 기본 off. |
| `--segment-merging=yes` | vector clock 세그먼트 병합 (메모리 절약). |
| `--shared-threshold=N` | N 스레드 이상이 본 메모리만 검사. |
| `--exclusive-threshold=N` | 락 N ms 이상 쥔 자리 보고 (데드락 분석). |

---

## *Pthread API* 검사

Helgrind는 *POSIX pthreads 사용*을 광범위하게 추적합니다. C++ `std::thread`도 결국 pthreads로 구현되므로 동일.

```c
// 흔한 실수: detach 후 join
pthread_t t;
pthread_create(&t, NULL, worker, NULL);
pthread_detach(t);
// ...
pthread_join(t, NULL);    // ❌ 이미 detach됨
```

```
Thread #1: pthread_join: error code 22 (EINVAL): joining a detached thread
```

C++:

```cpp
std::thread t(worker);
t.detach();
t.join();    // ❌ 이미 detach됨
```

이런 API 오용을 *런타임에 발견하기 전에* Helgrind가 알려 줍니다.

---

## *Condition Variable* 추적

condition variable은 *잘못 쓰기 쉬운* 동기화 도구입니다. Helgrind와 DRD 모두 이를 추적.

```c
pthread_mutex_t m;
pthread_cond_t c;
int ready = 0;

// 스레드 A (waiter)
pthread_mutex_lock(&m);
while (!ready) {
    pthread_cond_wait(&c, &m);
}
pthread_mutex_unlock(&m);

// 스레드 B (signaler)
pthread_mutex_lock(&m);
ready = 1;
pthread_cond_signal(&c);
pthread_mutex_unlock(&m);
```

흔한 실수들:

```c
// ❌ 락 없이 signal
pthread_cond_signal(&c);

// ❌ if로 wait (spurious wakeup 무시)
if (!ready) {
    pthread_cond_wait(&c, &m);
}

// ❌ 다른 mutex로 wait
pthread_mutex_t m1, m2;
pthread_cond_wait(&c, &m1);    // 어떤 호출은 m1, 다른 호출은 m2 → 위험
```

Helgrind/DRD는 *condition variable과 mutex의 일관성*을 추적해 이런 자리를 경고합니다.

---

## *Spinlock과 lock-free* 코드

Spinlock과 lock-free 알고리즘은 *Helgrind/DRD가 잘 추적하지 못합니다*.

```c
std::atomic<bool> spinlock{false};

void lock() {
    while (spinlock.exchange(true, std::memory_order_acquire)) {
        // spin
    }
}

void unlock() {
    spinlock.store(false, std::memory_order_release);
}
```

이 자체는 정상이지만, Helgrind/DRD는 *atomic 기반 동기화*를 모릅니다. *모든 메모리 접근에 race 보고*가 쏟아집니다.

해결책은 두 가지:

1. **Annotation으로 알려 주기**

```c
#include <valgrind/helgrind.h>

void lock() {
    while (spinlock.exchange(true)) {}
    ANNOTATE_RWLOCK_ACQUIRED(&spinlock, 1);
}

void unlock() {
    ANNOTATE_RWLOCK_RELEASED(&spinlock, 1);
    spinlock.store(false);
}
```

`ANNOTATE_*` 매크로로 Valgrind에게 *명시적으로 happens-before*를 알려 줍니다.

2. **Suppression으로 우회**

해당 모듈의 race 보고를 *전부 무시*. lock-free 코드는 *별도 도구*(TSan, 정적 분석)로 검증.

---

## CI 통합

Helgrind/DRD를 CI에 넣는 패턴.

```yaml
helgrind:
  runs-on: ubuntu-22.04
  steps:
    - uses: actions/checkout@v4
    - run: sudo apt install valgrind
    - run: cmake -B build -DCMAKE_BUILD_TYPE=Debug
    - run: cmake --build build
    - run: |
        valgrind --tool=helgrind \
                 --error-exitcode=1 \
                 --suppressions=tests/helgrind.supp \
                 ./build/concurrent_test
```

`--error-exitcode=1`로 *race 발견 시 CI 실패*. Suppression 파일로 *알려진 false positive*는 무시.

### TSan과의 분담

[TSan](/blog/tools/debugging/sanitizers/chapter04-tsan)이 같은 일을 *훨씬 빠르게* 합니다. 보통의 분담:

- **PR 빌드**: TSan으로 빠르게.
- **야간 빌드**: Helgrind/DRD로 *추가 검증*. TSan이 못 잡는 자리 확인.
- **외부 라이브러리 검증**: 재컴파일 불가능한 코드는 *Valgrind만 가능*.

---

## 자주 보는 false positive

### 1. `printf`/`std::cout` 동시 사용

```cpp
// 두 스레드가 동시에 std::cout
std::cout << "T1\n";
std::cout << "T2\n";
```

C++ stream 내부에 *공유 상태*가 있어 race 보고가 뜰 수 있습니다. 실제로는 *atomic operation으로 보호*되지만 Helgrind가 모를 수 있음.

해결: I/O 라이브러리 suppression.

### 2. 글로벌 초기화

```cpp
static MyClass& get_instance() {
    static MyClass inst;   // C++11+ 스레드 안전 초기화
    return inst;
}
```

C++11부터 *function-local static* 초기화는 *스레드 안전*이 보장됩니다(컴파일러가 atomic guard를 자동 삽입). 하지만 Helgrind가 이 guard를 *못 알아볼 수 있습니다*.

해결: *최초 호출을 main 안*에서 미리 해서 *멀티스레드 진입 전*에 초기화 완료.

### 3. 외부 라이브러리

OpenMP·MPI·OpenSSL 같은 라이브러리는 *내부 동기화*가 복잡해 false positive가 많습니다.

해결: 해당 라이브러리 함수 prefix로 suppression.

---

## 정리

- Valgrind는 *멀티스레드 분석 두 도구*: **Helgrind**(lockset + happens-before)와 **DRD**(vector clock).
- 둘은 *대부분 겹치지만* Helgrind는 *락 오용*에, DRD는 *복잡한 동기화*에 약간 더 강함.
- *Helgrind를 먼저*, 안 잡히면 DRD.
- 비용 20~50×. *짧은 시나리오*에 사용.
- TSan과 분담: TSan = PR 빌드, Helgrind/DRD = 야간 + 외부 라이브러리.
- Spinlock·lock-free 코드는 *annotation* (`ANNOTATE_*`) 또는 suppression.
- Pthreads / Condvar 오용도 정확히 추적.

## 다음 장 예고

[Ch 5: Suppression과 실무 운용](/blog/tools/debugging/valgrind/chapter05-suppressions)에서는 *외부 라이브러리 우회*와 *Sanitizer와의 분담* 같은 실무 운영 패턴을 정리합니다. Suppression 문법 상세, *최소화된 suppression*, 그리고 시리즈 마무리.

## 참고 자료

- [Helgrind Manual](https://valgrind.org/docs/manual/hg-manual.html)
- [DRD Manual](https://valgrind.org/docs/manual/drd-manual.html)
- [Helgrind vs DRD 비교 (논문)](https://valgrind.org/docs/manual/drd-manual.html#drd-manual.intro) — DRD 매뉴얼 안에 비교 섹션
