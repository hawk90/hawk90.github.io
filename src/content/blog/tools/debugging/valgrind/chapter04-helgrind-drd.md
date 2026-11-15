---
title: "Valgrind Helgrind와 DRD — 멀티스레드 레이스 진단"
slug: "tools/debugging/valgrind/chapter04-helgrind-drd"
date: 2026-05-28T09:04:00
description: "Valgrind의 두 동시성 분석 도구 비교 — Helgrind의 락 추적과 DRD의 vector clock, 언제 무엇을."
tags: [Valgrind, Helgrind, DRD, Concurrency, DataRace, Debugging, C, cpp]
series: "Valgrind"
seriesOrder: 4
draft: false
topics: ["tools", "tools/debugging"]
---

## 두 도구가 *나뉜 이유*

Valgrind에는 멀티스레드 분석 도구가 *두 개* 있습니다 — Helgrind와 DRD. 같은 일을 한다면 *왜 둘인지* 궁금할 만합니다.

두 도구는 happens-before 관계로 관찰된 충돌 접근을 분석합니다. Helgrind의 레이스 검사를 단순한 lockset 교집합 검사로만 설명하면 semaphore·condition variable 같은 동기화를 놓칩니다.

| 도구 | 문서로 확인할 검사 범위 |
| --- | --- |
| Helgrind | 데이터 레이스, POSIX pthread API 오용, 잠금 순서 역전 |
| DRD | 데이터 레이스, POSIX API 오용, 잠금 보유 시간에 의한 경합 진단 |

DRD가 항상 더 정확하거나 적은 메모리를 쓴다는 순위를 제시하지 않습니다. 실제 재현 입력으로 양쪽의 보고·비용·지원 동기화를 비교합니다. DRD의 경합 진단은 Helgrind의 잠금 순서 그래프 검사와 같은 기능이 아닙니다.


---

## Helgrind — 락 추적

같은 mutex로 접근을 보호하는 것은 대표적인 happens-before 동기화입니다. 다음은 서로 다른 mutex를 사용해 공유 counter가 보호되지 않는 경우입니다.

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

이 예제의 두 임계구역은 서로를 배제하지 않습니다. 다만 다른 락을 사용한다는 사실만으로 모든 프로그램의 레이스를 판정할 수는 없으며, 다른 동기화 경로가 있는지도 확인합니다.

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

```text
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

조기 반환으로 lock을 보유한 채 남는 것은 실제 결함입니다. 스레드 종료·후속 lock 등 실행 경로와 런타임의 보고 조건에 따라 증상이 달라집니다. 아래는 API 실패 형식 예시이며 이 조각의 즉시 실행 결과는 아닙니다.

```text
Thread #1's call to pthread_mutex_lock failed
   ...
```

Helgrind도 동적 분석이므로 관련 경로가 실제 실행되어야 합니다. RAII로 조기 반환의 unlock 누락을 막는 편이 명확합니다.

### Lock-order inversion

```cpp
// 스레드 A
std::lock_guard<std::mutex> a(m1);
std::lock_guard<std::mutex> b(m2);   // m1 → m2

// 스레드 B
std::lock_guard<std::mutex> b(m2);
std::lock_guard<std::mutex> a(m1);   // m2 → m1 ← 데드락 위험
```

```text
Thread #2: lock order "m1 before m2" violated
   ...
This required order was established by acquisition of lock at 0x... 
   by thread #1
```

*실제 데드락이 발생하지 않아도* 가능성만으로 경고. C++17의 `std::scoped_lock`이 이를 자동 회피합니다.

---

## DRD — Data Race Detector

DRD는 *Lamport's vector clock* 알고리즘으로 *시간 순서*를 추적합니다.

semaphore post를 성공적으로 소비하는 wait, mutex unlock 뒤의 lock 등 지원되는 동기화를 통해 접근의 순서를 모델링합니다. 별도의 동기화 없이 공유 데이터를 읽고 쓰면 검사 대상입니다.

### DRD 실행

```bash
valgrind --tool=drd ./myapp
```

### 잡는 것

POSIX 기반 프로그램의 레이스·동기화 오용을 관찰합니다. [DRD의 검사 범위](https://valgrind.org/docs/manual/drd-manual.html)를 기준으로 적용하고, Helgrind보다 복잡한 동기화를 항상 더 정확히 처리한다고 가정하지 않습니다.

relaxed atomic으로 비원자 데이터를 게시하면 C++의 release/acquire 동기화가 성립하지 않습니다. 어떤 도구가 이 레이스를 실제로 보고하는지는 버전·아키텍처·코드 생성에 따라 실행해서 확인해야 합니다. [TSan의 대응 예제](/blog/tools/debugging/sanitizers/chapter04-tsan)와도 검증 범위를 구분합니다.


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

속도와 메모리 비용은 같은 바이너리·입력에서 측정합니다. 이 글에서 측정하지 않은 초 단위 표나 고정 배율을 실측 결과처럼 제시하지 않습니다. 실행 시나리오를 줄일 때는 원래 결함이 유지되는지 확인합니다.


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
| `--history-level=approx` | 이전 접근이 발생한 구간의 근사 스택 정보를 남깁니다. |
| `--history-level=none` | 가장 빠름. 트레이스 없음. |
| `--conflict-cache-size=N` | 과거 충돌 접근의 스택 캐시 크기입니다. 보존되는 진단 정보와 메모리 비용에 영향을 줍니다. |
| `--check-stack-refs=no` | 스택 변수의 race 무시. 보통 켜 둠. |
| `--ignore-thread-creation=yes` | 생성 중 내부 접근·client request 등을 무시하는 범위가 생깁니다. 플랫폼별 기본값과 탐지 공백을 확인합니다. |

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
| `--shared-threshold=N` | reader lock을 N ms 넘게 보유하면 보고합니다. 스레드 수 기준이 아닙니다. |
| `--exclusive-threshold=N` | mutex 또는 writer lock을 N ms 넘게 보유하면 보고합니다. 경합 진단이며 데드락 판정과 다릅니다. |

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

```text
Thread #1: pthread_join: error code 22 (EINVAL): joining a detached thread
```

C++:

```cpp
std::thread t(worker);
t.detach();
t.join();    // ❌ 이미 detach됨
```

Helgrind는 API 호출이 실행됐을 때 진단합니다. 정적 분석처럼 실행 전에 예측하는 도구는 아닙니다. C++ detach 후 join은 std::system_error를 던질 수 있으므로 이 C++ 코드와 pthread 반환 코드를 구분합니다.

---

## *Condition Variable* 추적

condition variable은 *잘못 쓰기 쉬운* 동기화 도구입니다. Helgrind와 DRD 모두 이를 추적.

```c
pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t c = PTHREAD_COND_INITIALIZER;
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
// mutex 밖 signal 자체만으로 POSIX 위반은 아님
// 조건 변수에 대응하는 공유 상태·predicate를 올바르게 보호해야 함
pthread_cond_signal(&c);

// ❌ if로 wait (spurious wakeup 무시)
if (!ready) {
    pthread_cond_wait(&c, &m);
}

// ❌ 다른 mutex로 wait
pthread_mutex_t m1, m2;
pthread_cond_wait(&c, &m1);    // 어떤 호출은 m1, 다른 호출은 m2 → 위험
```

condition variable과 mutex의 연결을 확인합니다. signal 시 mutex 보유 여부에 관한 도구 권고와 POSIX 위반을 구분하고, spurious wakeup을 버틸 predicate 반복 검사도 코드에서 확인합니다. 도구가 모든 if/wait 논리 오류를 경고한다고 보장하지 않습니다.

---

## *Spinlock과 lock-free* 코드

사용자 정의 동기화는 버전·아키텍처·컴파일러가 생성한 atomic 명령에 대한 도구의 지원을 확인합니다. 모든 atomic 동기화를 모른다거나 모든 보고가 오탐이라고 단정하지 않습니다.

Helgrind client request는 실제로 존재하는 동기화를 도구에 설명할 때 사용합니다. ANNOTATE_RWLOCK_CREATE/DESTROY와 ACQUIRED/RELEASED 등 전체 수명 규칙을 [공식 매뉴얼](https://valgrind.org/docs/manual/hg-manual.html#hg-manual.effective-use)과 헤더에 맞게 적용합니다. 잘못된 알고리즘에 annotation으로 가짜 순서를 넣으면 실제 레이스를 숨길 수 있습니다.

suppression은 모듈 전체에 바로 적용하지 않습니다. 원인·재검토 조건을 기록하고 알려진 결함을 재현한 부정 대조군이 계속 보고되는지 확인합니다.


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

확인: 표준 스트림 설정·구현의 동기화·다른 공유 쓰기를 조사합니다. I/O 라이브러리라는 이유만으로 곧바로 suppress하지 않습니다.

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

확인: 실제 결함인지 도구 모델의 공백인지 최소 재현으로 구분합니다. 제외할 때도 특정 호출 맥락으로 좁히고 재검토 조건을 남깁니다.

---

## 실행 입력 — 공유 counter 보호

다음 파일은 기본 분기의 counter 접근을 같은 mutex로 보호합니다. RACY를 정의한 빌드는 진단용 결함 입력입니다. 현재 환경에서는 정상 분기의 counter=4000만 실행했고 Helgrind·DRD 결과는 Linux 검증 대기입니다.

```cpp title="counter.cpp"
#include <cstdio>
#include <mutex>
#include <thread>
std::mutex guard;
int counter = 0;
void worker() {
    for (int i = 0; i < 2000; ++i) {
#ifndef RACY
        std::lock_guard<std::mutex> lock(guard);
#endif
        ++counter;
    }
}
int main() {
    std::thread first(worker), second(worker);
    first.join();
    second.join();
    std::printf("counter=%d\n", counter);
}
```

```bash
c++ -std=c++17 -g -O0 -pthread counter.cpp -o counter
valgrind --tool=helgrind --error-exitcode=97 ./counter
valgrind --tool=drd --error-exitcode=97 ./counter
c++ -std=c++17 -g -O0 -pthread -DRACY counter.cpp -o racy
valgrind --tool=helgrind --error-exitcode=97 ./racy
valgrind --tool=drd --error-exitcode=97 ./racy
```

RACY의 출력 숫자를 1/2 같은 한정된 값으로 예측하지 않습니다. 데이터 레이스는 C++에서 UB이며 무경고 한 번으로 안전하다고 결론 내리지 않습니다.

## 정리

- Valgrind는 *멀티스레드 분석 두 도구*: **Helgrind**(lockset + happens-before)와 **DRD**(vector clock).
- 각 도구의 지원 동기화와 보고를 비교하며 정확도 순위를 일괄 가정하지 않습니다.
- *Helgrind를 먼저*, 안 잡히면 DRD.
- 비용은 실제 입력에서 측정하고 결함이 유지되는 짧은 시나리오를 사용합니다.
- TSan과 분담: TSan = PR 빌드, Helgrind/DRD = 야간 + 외부 라이브러리.
- 사용자 동기화는 지원 범위를 확인하고 annotation·suppression으로 실제 결함을 숨기지 않습니다.
- Pthreads / Condvar 오용도 정확히 추적.

## 다음 장 예고

[Ch 5: Suppression과 실무 운용](/blog/tools/debugging/valgrind/chapter05-suppressions)에서는 *외부 라이브러리 우회*와 *Sanitizer와의 분담* 같은 실무 운영 패턴을 정리합니다. Suppression 문법 상세, *최소화된 suppression*, 그리고 시리즈 마무리.

## 참고 자료

- [Helgrind Manual](https://valgrind.org/docs/manual/hg-manual.html)
- [DRD Manual](https://valgrind.org/docs/manual/drd-manual.html)
- [DRD 공식 매뉴얼](https://valgrind.org/docs/manual/drd-manual.html#drd-manual.intro) — DRD 매뉴얼 안에 비교 섹션

## 관련 항목

- [Ch 3: Valgrind Leak Report 분석](/blog/tools/debugging/valgrind/chapter03-leak-report) — 이전 글. Memcheck 보고서 읽기
- [Ch 5: Valgrind Suppression과 실무 운용](/blog/tools/debugging/valgrind/chapter05-suppressions) — 다음 글. 여기서 나온 false positive를 정리하는 방법
- [TSan으로 데이터 레이스 디버깅 — Happens-before 추적](/blog/tools/debugging/sanitizers/chapter04-tsan) — Helgrind·DRD와 같은 레이스를 훨씬 빠르게 잡는 쪽. PR 빌드는 이쪽이 맞습니다
- [멀티스레드·멀티프로세스 디버깅](/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess) — 잡힌 레이스를 디버거에서 재현할 때
- [Helgrind Manual](https://valgrind.org/docs/manual/hg-manual.html) — 옵션과 `ANNOTATE_*` 매크로 공식 설명
