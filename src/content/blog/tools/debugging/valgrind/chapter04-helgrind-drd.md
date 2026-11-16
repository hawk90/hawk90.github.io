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

멀티스레드 버그는 *재현이 안 되는* 버그입니다. 같은 입력으로 100번 돌려 99번 맞고 한 번 틀리면, 디버거로 멈춰 세운 순간 타이밍이 바뀌어 버그가 사라집니다. 그래서 "실제로 틀린 순간"을 기다리는 대신 *틀릴 수 있는 순서*를 찾아 주는 도구가 필요합니다.

Valgrind에는 그런 도구가 *두 개* 있습니다. Helgrind와 DRD입니다. 같은 일을 한다면 *왜 둘인지* 궁금할 만합니다.

알고리즘의 뿌리는 같습니다. 두 도구 모두 두 스레드의 충돌 접근이 *happens-before 관계로 순서가 정해져 있는지*를 봅니다([Helgrind 매뉴얼 7.4.2절](https://valgrind.org/docs/manual/hg-manual.html#hg-manual.data-races.algorithm), [DRD 매뉴얼 8.1.4절](https://valgrind.org/docs/manual/drd-manual.html#drd-manual.data-race-detection)). 비유하면 택배 송장입니다. A가 물건을 넣고 송장을 붙인 뒤(unlock), B가 송장을 확인하고 물건을 꺼내면(lock) 두 사람의 접근 순서가 정해집니다. 송장 없이 같은 상자를 둘이 동시에 만지면 레이스입니다. 8.1.4절은 "공유 데이터마다 mutex를 하나 정해 그 mutex를 잡고 접근한다"는 *잠금 규율*만 보는 Eraser식 방법을 따로 설명하고, 이 방식은 condition variable·semaphore·barrier로만 동기화하는 프로그램을 설명하지 못한다고 적습니다. 두 도구 모두 그쪽이 아니라 happens-before 쪽입니다.

차이는 *무엇을 더 보느냐*에 있습니다. 아래 표는 이 글에서 같은 프로그램을 두 도구에 돌린 결과입니다. 실행 환경은 [Ch 1](/blog/tools/debugging/valgrind/chapter01-intro)과 같은 Valgrind 3.24.0, Debian 13 arm64, GCC 14.2.0(`-g -O0 -pthread`)입니다.

| 검사 | Helgrind | DRD | 이 글의 프로그램 |
| --- | --- | --- | --- |
| 데이터 레이스 | 보고 | 보고 | `race.c`, `racy` |
| 잠금 순서 역전 | 보고 | 0 errors | `lockorder.cpp` |
| 소유하지 않은 mutex unlock | 보고 | 보고 | `unlock_unowned.c` |
| 스레드가 락을 쥔 채 종료 | 보고 | (돌리지 않음) | `earlyret.cpp` |
| detach한 스레드 `pthread_join` | 보고 | 0 errors | `detachjoin.c` |
| 한 condition variable에 다른 mutex 두 개 | 보고 | 보고 | `condvar.c` |
| mutex 없이 `pthread_cond_signal` | 보고 | 보고 | `signal_nolock.c` |
| 락을 오래 쥐는 경합 | 기능 없음 | `--exclusive-threshold` | (8.2.3절) |

정리하면 Helgrind가 pthread API 오용과 잠금 순서를 더 넓게 보고, DRD는 잠금 순서 검사 대신 락 경합 진단이 있습니다. 소유하지 않은 mutex unlock은 DRD도 `Mutex not locked by calling thread: mutex 0x128058, recursion count 1, owner 1.`로 보고했습니다.

---

## Helgrind — 락 추적

같은 mutex로 접근을 보호하는 것은 대표적인 happens-before 동기화입니다. 다음은 *서로 다른* mutex를 사용해 공유 `counter`가 보호되지 않는 경우입니다.

```cpp title="twomutex.cpp"
#include <mutex>
#include <thread>
std::mutex m1, m2;
int counter = 0;
void thread_a() { std::lock_guard<std::mutex> g(m1); counter++; }
void thread_b() { std::lock_guard<std::mutex> g(m2); counter++; }
int main() {
    std::thread a(thread_a), b(thread_b);
    a.join(); b.join();
    return counter == 2 ? 0 : 1;
}
```

두 스레드 모두 락을 *하나씩은* 쥐고 있지만, 서로 다른 락이라 한쪽의 unlock이 다른 쪽의 lock보다 앞선다는 보장이 없습니다. 화장실 두 칸에 각자 문을 잠그고 들어가도, 같은 세면대를 쓰면 부딪히는 것과 같습니다. Helgrind는 각 접근 시점에 쥐고 있던 락까지 보여 줍니다(`std::__invoke` 등 중간 프레임은 줄였습니다).

```text
==3930== Possible data race during read of size 4 at 0x1280F8 by thread #3
==3930== Locks held: 1, at address 0x1280C8
==3930==    at 0x108E1C: thread_b() (twomutex.cpp:6)
...
==3930== This conflicts with a previous write of size 4 by thread #2
==3930== Locks held: 1, at address 0x128098
==3930==    at 0x108DE4: thread_a() (twomutex.cpp:5)
...
==3930==  Address 0x1280f8 is 0 bytes inside data symbol "counter"
```

`Locks held`가 서로 다른 주소(`0x1280C8`과 `0x128098`, 곧 `m2`와 `m1`)라는 점이 원인을 바로 가리킵니다.

### Helgrind 실행

```bash
valgrind --tool=helgrind ./myapp
```

### 잡는 것

[Helgrind 매뉴얼](https://valgrind.org/docs/manual/hg-manual.html) 7.2~7.4절의 세 묶음입니다.

1. **pthread API 오용 (7.2)** — 소유하지 않은 락 unlock, 락을 쥔 채 스레드 종료, 실패한 pthread 호출 등.
2. **잠금 순서 불일치 (7.3)** — 두 스레드가 *서로 다른 순서로* 락을 잡는 패턴. 실제 데드락이 나지 않아도 보고합니다.
3. **데이터 레이스 (7.4)** — happens-before로 순서가 정해지지 않은 충돌 접근.

### 보고서 예시 — 데이터 레이스

메인 스레드와 자식 스레드가 락 없이 `counter++`를 하는 `race.c`입니다.

```c title="race.c"
#include <pthread.h>
#include <stdio.h>
int counter = 0;
__attribute__((noinline)) void increment(void) { counter++; }
void* thread_run(void* arg) { (void)arg; increment(); return NULL; }
int main(void) {
    pthread_t t;
    pthread_create(&t, NULL, thread_run, NULL);
    increment();
    pthread_join(t, NULL);
    printf("counter=%d\n", counter);
    return 0;
}
```

```text
==3916== Possible data race during read of size 4 at 0x12804C by thread #1
==3916== Locks held: none
==3916==    at 0x108830: increment (race.c:4)
==3916==    by 0x10888F: main (race.c:9)
==3916==
==3916== This conflicts with a previous write of size 4 by thread #2
==3916== Locks held: none
==3916==    at 0x108840: increment (race.c:4)
==3916==    by 0x10885B: thread_run (race.c:5)
==3916==    by 0x489391F: mythread_wrapper (hg_intercepts.c:406)
==3916==    by 0x49561D7: start_thread (pthread_create.c:448)
==3916==    by 0x49BDEEB: thread_start (clone.S:82)
==3916==  Address 0x12804c is 0 bytes inside data symbol "counter"
...
==3916== ERROR SUMMARY: 2 errors from 2 contexts (suppressed: 0 from 0)
```

핵심은 세 가지입니다.

- *Possible data race*라는 말처럼, Helgrind는 이번 실행에서 순서가 정해지지 않은 두 접근을 *가능한* 레이스로 보고합니다. `counter++`가 읽기와 쓰기 두 접근이라 에러도 2개입니다.
- *두 스레드의 두 접근*이 같은 주소에서 충돌했고, 양쪽 스택이 모두 나옵니다. 기본 `--history-level=full` 덕분입니다.
- 마지막 `Address ... is 0 bytes inside data symbol "counter"` 줄이 변수 이름(`counter`)까지 알려 줍니다.

### 락 오용 — Helgrind의 강점

조기 반환이 `unlock`을 건너뛰는 고전적인 실수입니다.

```cpp title="earlyret.cpp"
#include <mutex>
#include <thread>
std::mutex m;
int shared = 0;
bool some_condition() { return true; }
void buggy() {
    m.lock();
    shared++;
    if (some_condition()) {
        return;       // unlock 안 함
    }
    m.unlock();
}
int main() {
    std::thread t(buggy);
    t.join();
    m.lock();         // main은 영원히 기다릴까?
    return shared;
}
```

네이티브 실행은 `timeout 5`에 걸려 종료 코드 124로 끝났습니다. main이 영원히 기다린 것입니다. Helgrind 아래에서는 자식 스레드가 끝나는 순간 원인을 짚어 줍니다(30초 `timeout`으로 끊었습니다).

```text
==3959== Thread #2: Exiting thread still holds 1 lock
==3959==    at 0x4C06140: start_thread (pthread_create.c:604)
==3959==    by 0x4C6DEEB: thread_start (clone.S:82)
==3959==
==3959== Process terminating with default action of signal 15 (SIGTERM)
==3959==    at 0x4C02F70: futex_wait (futex-internal.h:146)
...
==3959==    by 0x108E4B: main (earlyret.cpp:17)
```

다른 스레드가 쥔 락을 푸는 경우도 바로 보고합니다. main이 잡은 `m`을 worker가 `pthread_mutex_unlock`하는 `unlock_unowned.c`의 결과입니다.

```text
==3961== Thread #2 unlocked lock at 0x128058 currently held by thread #1
==3961==    at 0x4890DA0: mutex_unlock_WRK (hg_intercepts.c:1181)
==3961==    by 0x1088BF: worker (unlock_unowned.c:3)
...
==3961==  Lock at 0x128058 was first observed
==3961==    at 0x48906BC: mutex_lock_WRK (hg_intercepts.c:944)
==3961==    by 0x1088DF: main (unlock_unowned.c:6)
==3961==  Address 0x128058 is 0 bytes inside data symbol "m"
```

Helgrind도 동적 분석이라 관련 경로가 실제로 실행되어야 보고합니다. 조기 반환의 unlock 누락은 `std::lock_guard` 같은 RAII로 구조적으로 막는 편이 확실합니다.

### Lock-order inversion

스레드 A는 `m1 → m2`, 스레드 B는 `m2 → m1` 순서로 잡습니다. `join`으로 두 스레드를 차례로 실행해서 *실제 데드락은 나지 않게* 했습니다.

```cpp title="lockorder.cpp"
#include <mutex>
#include <thread>
std::mutex m1, m2;
void thread_a() { std::lock_guard<std::mutex> a(m1); std::lock_guard<std::mutex> b(m2); }
void thread_b() { std::lock_guard<std::mutex> b(m2); std::lock_guard<std::mutex> a(m1); }
int main() {
    std::thread a(thread_a); a.join();   // 순서대로 실행: 실제 데드락은 없음
    std::thread b(thread_b); b.join();
    return 0;
}
```

```text
==3977== Thread #3: lock order "0x128098 before 0x1280C8" violated
==3977== Observed (incorrect) order is: acquisition of lock at 0x1280C8
...
==3977==    by 0x108E37: thread_b() (lockorder.cpp:5)
...
==3977== Required order was established by acquisition of lock at 0x128098
...
==3977==    by 0x108DCF: thread_a() (lockorder.cpp:4)
```

*실제 데드락이 발생하지 않아도* 순서가 한 번이라도 뒤집히면 경고합니다. 같은 바이너리를 DRD로 돌리면 `ERROR SUMMARY: 0 errors from 0 contexts (suppressed: 20 from 20)`였습니다. DRD에는 이 검사가 없습니다.

C++17의 `std::scoped_lock`은 여러 mutex를 데드락 없이 잡지만, *Helgrind 경고까지 없애 주지는 않았습니다*. `scoped_lock l(m1, m2)`와 `scoped_lock l(m2, m1)`로 바꾼 `scopedlock.cpp`도 `lock order ... violated` 1건이 나왔습니다. 보고 스택을 보면 libstdc++의 `std::lock`이 첫 mutex를 `lock`하고 나머지는 `try_lock`으로 시도하는데(`mutex:709`, `mutex:713`), Helgrind는 `try_lock` 획득도 순서 그래프에 넣습니다. 이 경우는 실제로는 데드락이 없는 *오탐*이므로, 인자 순서를 모든 호출에서 같게 맞추거나 Ch 5의 suppression으로 좁게 처리합니다.

---

## DRD — Data Race Detector

DRD도 happens-before 탐지기이고, 구현은 *vector clock*입니다. 3.24.0 소스의 `drd/drd_vc.h`는 "스레드마다 카운터 하나, vector clock은 (스레드 ID, 카운터) 쌍의 배열"이라고 설명합니다. 스레드마다 자기 시계를 들고, 동기화가 일어날 때 상대 시계를 받아 합쳐서 "이 시점 이전의 일은 저 스레드의 무엇보다 앞선다"를 계산합니다. DRD 매뉴얼은 동기화 사이의 연속된 접근 묶음을 *segment*라고 부르고, 접근 하나하나가 아니라 segment 단위로 충돌을 검사합니다(8.2.2절).

mutex unlock 뒤의 lock, semaphore post를 소비하는 wait 같은 동기화가 segment 사이의 순서를 만듭니다. 그런 동기화 없이 공유 데이터를 읽고 쓰면 보고 대상입니다.

### DRD 실행

```bash
valgrind --tool=drd ./myapp
```

같은 `race.c`를 DRD로 돌리면 보고 형식이 다릅니다.

```text
==3936== Conflicting load by thread 1 at 0x0012804c size 4
==3936==    at 0x108830: increment (race.c:4)
==3936==    by 0x10888F: main (race.c:9)
==3936== Allocation context: BSS section of /root/src/race
==3936== Other segment start (thread 2)
==3936==    (thread finished, call stack no longer available)
==3936== Other segment end (thread 2)
==3936==    (thread finished, call stack no longer available)
...
counter=2
==3936== ERROR SUMMARY: 2 errors from 2 contexts (suppressed: 10 from 10)
```

Helgrind는 상대 접근의 *정확한 스택*을 보여 줬지만, DRD는 상대 스레드의 *segment 시작·끝*을 보여 주고, 이번처럼 상대 스레드가 이미 끝났으면 그 스택도 사라집니다. 대신 `Allocation context: BSS section`처럼 변수가 어느 영역에 있는지를 알려 줍니다. `suppressed: 10 from 10`은 Valgrind 기본 suppression 파일의 DRD 항목이 glibc 내부 접근을 숨긴 수입니다(Ch 5).

### 잡는 것

[DRD 매뉴얼](https://valgrind.org/docs/manual/drd-manual.html) 8.2.2~8.2.4절의 데이터 레이스, 락 경합, POSIX threads API 오용입니다. condition variable 쪽은 이 글의 실행에서 Helgrind와 같은 두 경우를 잡았습니다(아래 "Condition Variable 추적" 절).

relaxed atomic으로 비원자 데이터를 게시하면 C++의 release/acquire 동기화가 성립하지 않습니다. 이 경우를 두 도구에 돌려 봤습니다.

```cpp title="relaxed.cpp"
#include <atomic>
#include <cstdio>
#include <thread>
int data = 0;
std::atomic<bool> ready{false};
void producer() { data = 42; ready.store(true, std::memory_order_relaxed); }
void consumer() { while (!ready.load(std::memory_order_relaxed)) {} std::printf("%d\n", data); }
int main() { std::thread c(consumer), p(producer); p.join(); c.join(); }
```

| 도구 | `data` 레이스 | `ready` 레이스 | ERROR SUMMARY |
| --- | --- | --- | ---: |
| Helgrind | `Possible data race during read of size 4 ... "data"` | 읽기·쓰기 2건 | 3 |
| DRD | `Conflicting load ... size 4` | 2건 | 3 |

두 도구 모두 진짜 레이스인 `data`를 잡았습니다. 다만 `std::atomic<bool>`인 `ready` 접근도 레이스로 보고했습니다. 그래서 같은 코드를 올바르게 고친 버전도 돌려 봤습니다. `store`를 `memory_order_release`로, `load`를 `memory_order_acquire`로 바꾼 `relacq.cpp`입니다.

```text
$ valgrind --tool=helgrind ./relacq
==704== Possible data race during write of size 1 at 0x128090 by thread #3
==704==  Address 0x128090 is 0 bytes inside data symbol "ready"
==704== Possible data race during read of size 1 at 0x128090 by thread #2
==704==  Address 0x128090 is 0 bytes inside data symbol "ready"
==704== Possible data race during read of size 4 at 0x128088 by thread #2
==704==  Address 0x128088 is 0 bytes inside data symbol "data"
==704== ERROR SUMMARY: 3 errors from 3 contexts (suppressed: 1 from 1)
```

DRD도 똑같이 3건(`ready` 2건, `data` 1건)이었습니다. C++ 메모리 모델로는 레이스가 *없는* 코드인데, relaxed 버전과 보고가 구별되지 않습니다. 이 arm64 빌드에서 두 도구 모두 release/acquire atomic을 happens-before로 보지 않았다는 뜻입니다. atomic 기반 동기화 코드는 [TSan](/blog/tools/debugging/sanitizers/chapter04-tsan)으로 확인합니다.

---

## 둘 *동시에* 돌리지 마라

```bash
# 안 됨
valgrind --tool=helgrind --tool=drd ./myapp
```

Valgrind 도구는 *한 번에 하나*만 실행할 수 있습니다. 위 명령은 에러 없이 실행되지만, 3.24.0에서는 `drd, a thread error detector` 배너가 떴습니다. 마지막 `--tool`이 이긴 것입니다. Helgrind와 DRD를 모두 보려면 *별도로 실행*합니다.

```bash
valgrind --tool=helgrind ./myapp 2>&1 | tee hg.log
valgrind --tool=drd ./myapp 2>&1 | tee drd.log
```

두 결과를 비교하는 가치는 위 표에 있습니다. 잠금 순서, detach 후 join은 Helgrind만 잡았고, `std::cout` 동시 출력은 Helgrind만 *오탐*을 냈습니다(아래). 한쪽만 보고한 자리는 그 도구의 검사 범위나 기본 suppression 차이에서 오는 경우가 많으니, 보고 내용을 직접 읽고 판단합니다.

---

## 비용 — *얼마나 느린가*

먼저 알아 둘 구조가 있습니다. [매뉴얼 2.8절](https://valgrind.org/docs/manual/manual-core.html#manual-core.pthreads)은 Valgrind가 "커널 스레드를 한 번에 하나만 돌게 직렬화하므로, 멀티코어에서도 스레드 프로그램이 CPU를 동시에 둘 이상 쓰지 못한다"고 적습니다. 그래서 멀티스레드 프로그램의 배율은 계측 비용에 *병렬성 상실*이 곱해집니다.

`mtwork.cpp`는 스레드 4개가 각자 100만 원소 배열을 300번 훑고 마지막에 mutex로 합계를 더합니다(`g++ -O1`). Ch 1과 같은 방식으로 네이티브(4스레드)와 도구 실행을 쌍으로 5번 돌린 배율의 중앙값이고, Ch 1처럼 두 번 측정했습니다(1차 원시 로그는 사라져 2차 범위를 함께 적었습니다). TSan은 같은 소스를 `-fsanitize=thread`로 다시 빌드한 바이너리입니다.

| 도구 | 1차 측정 중앙값 | 2차 측정 중앙값 | 2차 5회 범위 | 최대 RSS 배율 |
| --- | ---: | ---: | ---: | ---: |
| TSan (GCC 14.2.0) | 7.4× | 7.5× | 6.7–10.1× | 4.2× |
| Memcheck | 31.5× | 28.9× | 14.7–31.5× | 5.2–5.3× |
| DRD | 56.5× | 61.8× | 41.8–79.0× | 4.3–4.5× |
| Helgrind | 62.8× | 72.7× | 32.7–91.4× | 6.2–6.6× |

단일 스레드 `work.c`에서는 Memcheck 12.6~13.1×, DRD 16.8~23.1×, Helgrind 19.8~24.6×였습니다(Ch 1). 같은 측정 회차끼리 비교하면 4스레드 프로그램에서 배율이 2.3~3.4배 커졌고, 이것이 직렬화의 몫입니다. TSan은 스레드를 직렬화하지 않아 같은 프로그램에서 Helgrind보다 8배 이상 빨랐습니다. DRD 매뉴얼 8.2.12절은 DRD를 "단일 스레드 네이티브 대비 20~50배"로 적는데, 4스레드 네이티브와 비교한 위 값이 그보다 큰 것도 같은 이유입니다.

> ⚠️ 측정 조건은 Ch 1과 같습니다. QEMU HVF 게스트(vCPU 4개)에서 쟀고, 호스트 M2 Pro에 다른 빌드 부하가 있어 범위가 넓습니다. 네이티브 실행이 0.13~0.42초로 짧아 배율의 흔들림이 큽니다.

실행 시나리오를 줄일 때는 줄인 뒤에도 원래 결함이 보고되는지 확인합니다.

---

## 주요 옵션

### Helgrind

```bash
valgrind --tool=helgrind \
  --history-level=full \
  --conflict-cache-size=2000000 \
  ./myapp
```

기본값은 [Helgrind 매뉴얼 7.6절](https://valgrind.org/docs/manual/hg-manual.html#hg-manual.options)의 값입니다.

| 옵션 | 기본값 | 의미 |
|------|------|------|
| `--history-level=full` | full | 현재 접근과 *이전 충돌 접근*의 스택을 둘 다 보여 줍니다. 이전 접근 스택은 `--history-backtrace-size`(기본 8) 프레임까지입니다. |
| `--history-level=approx` | | 이전 접근이 두 스택 *사이 어딘가*에서 일어났다는 근사 정보만 남깁니다. |
| `--history-level=none` | | 이전 접근 정보를 모으지 않습니다. 매뉴얼은 full보다 "극적으로 빠를 수 있다"고 적습니다. |
| `--conflict-cache-size=N` | 1000000 | full에서만 의미가 있습니다. 이전 접근 정보를 담는 주소 수입니다. 레이스 보고에 스택이 하나만 나오면 늘립니다. 1 늘릴 때마다 메모리가 약 100바이트 듭니다. |
| `--check-stack-refs=no` | yes | 스레드 스택(지역 변수) 접근 검사를 건너뜁니다. 빨라지는 대신 스택 데이터의 레이스를 놓칩니다. |
| `--ignore-thread-creation=yes` | no | 스레드 생성 중의 모든 활동을 무시합니다. 매뉴얼은 기본값이 Solaris에서만 yes라고 적습니다. |
| `--track-lockorders=no` | yes | 잠금 순서 검사를 끕니다. 레이스만 보고 싶을 때 씁니다. |

`race.c` 같은 작은 예제를 돌릴 때마다 Helgrind는 `Use --history-level=approx or =none to gain increased speed, at the cost of reduced accuracy of conflicting-access information`이라는 안내를 출력했습니다.

### DRD

```bash
valgrind --tool=drd \
  --check-stack-var=yes \
  --segment-merging=yes \
  ./myapp
```

기본값은 [DRD 매뉴얼 8.2.1절](https://valgrind.org/docs/manual/drd-manual.html#drd-manual.options)의 값입니다.

| 옵션 | 기본값 | 의미 |
|------|------|------|
| `--check-stack-var=yes` | no | 스택 변수의 레이스 검사입니다. 매뉴얼은 "대부분의 프로그램이 스택 변수를 스레드 사이에 공유하지 않아서" 기본으로 끈다고 적습니다. |
| `--segment-merging=yes` | yes | segment 병합으로 메모리를 줄입니다. 끄면 보고의 'other segment' 정보가 정확해질 수 있지만 메모리가 부족해질 수 있습니다. |
| `--shared-threshold=N` | off | reader lock을 N ms 넘게 보유하면 보고합니다. |
| `--exclusive-threshold=N` | off | mutex 또는 writer lock을 N ms 넘게 보유하면 보고합니다. 경합 진단이며 데드락 판정과 다릅니다. |
| `--report-signal-unlocked` | yes | mutex를 잡지 않은 채 `pthread_cond_signal`/`broadcast`를 부르면 보고합니다. |

---

## *Pthread API* 검사

Helgrind는 POSIX pthreads 호출을 가로채서 오용을 검사합니다. C++ `std::thread`도 libstdc++ 안에서 pthreads로 구현되므로, 위 보고들의 스택에 `pthread_create_WRK (hg_intercepts.c:445)` 같은 가로채기 프레임이 나옵니다.

```c title="detachjoin.c"
#include <pthread.h>
#include <stdio.h>
#include <unistd.h>
void* worker(void* a) { (void)a; return NULL; }
int main(void) {
    pthread_t t;
    pthread_create(&t, NULL, worker, NULL);
    pthread_detach(t);
    usleep(1000);
    int rc = pthread_join(t, NULL);   // 이미 detach됨
    printf("pthread_join rc=%d\n", rc);
    return 0;
}
```

glibc 2.41에서는 네이티브 실행에서도 `pthread_join`이 22(`EINVAL`)를 돌려줬습니다. Helgrind는 이 실패를 에러로 보고합니다.

```text
==4022== Thread #1's call to pthread_join failed
==4022==    with error code 22 (EINVAL: Invalid argument)
==4022==    at 0x4890580: pthread_join_WRK (hg_intercepts.c:586)
pthread_join rc=22
==4022== ERROR SUMMARY: 1 errors from 1 contexts (suppressed: 0 from 0)
```

DRD는 같은 바이너리에서 `0 errors`였습니다.

C++ 쪽은 다릅니다.

```cpp title="detachjoin.cpp"
#include <cstdio>
#include <system_error>
#include <thread>
void worker() {}
int main() {
    std::thread t(worker);
    t.detach();
    try { t.join(); } catch (const std::system_error& e) { std::printf("system_error: %s\n", e.what()); }
    return 0;
}
```

네이티브와 Helgrind 모두 `system_error: Invalid argument`를 출력했고, Helgrind는 `0 errors`였습니다. `detach()` 뒤의 `std::thread`는 joinable이 아니라서 libstdc++가 `pthread_join`을 부르기 *전에* 예외를 던지기 때문입니다. Helgrind는 실제로 실행된 pthread 호출만 검사하므로, 이런 C++ 수준의 오용은 예외 처리와 테스트로 잡습니다.

---

## *Condition Variable* 추적

condition variable은 *잘못 쓰기 쉬운* 동기화 도구입니다. 올바른 기본형은 다음과 같습니다.

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

흔한 실수 세 가지를 각각 프로그램으로 만들어 두 도구에 돌렸습니다.

```c
// 1) mutex 밖에서 signal (signal_nolock.c)
pthread_mutex_lock(&m);
ready = 1;
pthread_mutex_unlock(&m);
pthread_cond_signal(&c);

// 2) if로 wait (ifwait.c)
if (!ready) {
    pthread_cond_wait(&c, &m);
}

// 3) 같은 cond에 다른 mutex (condvar.c)
pthread_cond_wait(&c, &m2);          // 스레드 하나는 m2로
pthread_cond_timedwait(&c, &m1, &ts); // 다른 스레드는 m1로
```

| 실수 | Helgrind | DRD |
| --- | --- | --- |
| 1) mutex 밖 signal | `pthread_cond_{signal,broadcast}: dubious: associated lock is not held by any thread` | `Probably a race condition: condition variable 0x1280a0 has been signaled but the associated mutex 0x128070 is not locked by the signalling thread.` |
| 2) `if`로 wait | 0 errors | 0 errors |
| 3) 다른 mutex | `pthread_cond_{timed}wait: cond is associated with a different mutex` | `Inconsistent association of condition variable and mutex: condition variable 0x1280e8, mutexes 0x1280b8 and 0x128088` |

1)은 POSIX 위반은 아닙니다. `ready`를 mutex 안에서 바꿨으므로 이 프로그램은 올바르게 `done`을 출력했습니다. 두 도구가 이를 "dubious", "Probably a race condition"이라는 *경고*로 표현하는 이유입니다. DRD에서는 `--report-signal-unlocked=no`로 끌 수 있습니다.

2)는 두 도구 모두 조용했습니다. 이 실행에서는 spurious wakeup이 일어나지 않았고, 도구는 실행된 API 호출의 짝만 검사하기 때문입니다. `while`로 predicate를 다시 확인하는 것은 코드 리뷰에서 지켜야 하는 규칙입니다.

3)은 POSIX가 정의하지 않은 사용이고, 두 도구 모두 첫 대기와 두 번째 대기의 mutex 주소를 함께 보여 줬습니다.

---

## *Spinlock과 lock-free* 코드

[Helgrind 매뉴얼 7.5절](https://valgrind.org/docs/manual/hg-manual.html#hg-manual.effective-use)은 "가장 중요한" 두 가지 조언으로 *모든 라이브러리가 POSIX 스레딩 기본 요소를 쓰게 할 것*과 *futex·atomic 카운터로 자체 동기화 기본 요소를 만들지 말 것*을 꼽습니다. 위반하면 "엄청난 수의 거짓 레이스 보고에 묻힌다"고 적습니다. 같은 절은 Helgrind가 mutex, reader-writer lock, condition variable, semaphore, barrier를 직접 지원하고 *spinlock은 지원하지 않는다*고 명시합니다. 앞의 `relaxed.cpp`에서 atomic `ready` 접근이 레이스로 나온 것과 같은 맥락입니다.

자체 동기화를 꼭 써야 한다면 `helgrind.h`의 client request로 *실제로 존재하는 순서*를 도구에 알려 줍니다. 7.5절은 원자적 참조 카운트를 `ANNOTATE_HAPPENS_BEFORE`/`ANNOTATE_HAPPENS_AFTER`로 표시하는 예를 듭니다. 주의할 점은 annotation이 *주장*이라는 것입니다. `relaxed.cpp`에 annotation만 붙여 봤습니다.

```cpp title="relaxed_annot.cpp"
#include <atomic>
#include <cstdio>
#include <thread>
#include <valgrind/helgrind.h>
int data = 0;
std::atomic<bool> ready{false};
void producer() {
    data = 42;
    ANNOTATE_HAPPENS_BEFORE(&ready);
    ready.store(true, std::memory_order_relaxed);   // C++ 기준으로는 여전히 레이스
}
void consumer() {
    while (!ready.load(std::memory_order_relaxed)) {}
    ANNOTATE_HAPPENS_AFTER(&ready);
    std::printf("%d\n", data);
}
int main() { std::thread c(consumer), p(producer); p.join(); c.join(); }
```

```text
==4237== Possible data race during write of size 1 at 0x128090 by thread #3
==4237==  Address 0x128090 is 0 bytes inside data symbol "ready"
==4237== Possible data race during read of size 1 at 0x128090 by thread #2
==4237==  Address 0x128090 is 0 bytes inside data symbol "ready"
==4237== ERROR SUMMARY: 2 errors from 2 contexts (suppressed: 2 from 2)
```

`data` 레이스 보고가 사라졌습니다. 그런데 `memory_order_relaxed`는 그대로라 C++ 메모리 모델로는 여전히 레이스입니다. 잘못된 알고리즘에 annotation으로 가짜 순서를 넣으면 실제 레이스를 숨깁니다. annotation은 코드가 실제로 release/acquire 순서를 만든다는 것을 확인한 뒤에만 붙입니다.

suppression도 마찬가지로 모듈 전체에 바로 적용하지 않습니다. 원인과 재검토 조건을 기록하고, 알려진 결함을 재현한 프로그램이 여전히 보고되는지 확인합니다(Ch 5).

---

## CI 통합

Helgrind/DRD를 CI에 넣는 패턴입니다.

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

`--error-exitcode`는 Helgrind·DRD에서도 동작합니다. 아래 "실행 입력" 절에서 레이스가 있는 빌드는 두 도구 모두 지정한 종료 코드로 끝났습니다. Suppression 파일로 *알려진 오탐*(앞의 `scoped_lock`, 아래 `std::cout`)을 좁게 걸러 냅니다.

### TSan과의 분담

[TSan](/blog/tools/debugging/sanitizers/chapter04-tsan)은 위 측정에서 같은 프로그램을 Helgrind보다 8배 이상 빠르게 돌렸습니다. 이 차이를 기준으로 나누면 다음과 같습니다.

- **PR 빌드**: TSan으로 빠르게.
- **야간 빌드**: Helgrind/DRD로 *추가 검증*. 특히 잠금 순서 역전과 pthread API 오용(Helgrind)은 실제 데드락이 나지 않은 실행에서도 보고됩니다.
- **외부 라이브러리 검증**: 다시 빌드할 수 없는 코드는 TSan 계측이 들어가지 않으므로 Valgrind 쪽입니다.

---

## 자주 보는 false positive

### 1. `printf`/`std::cout` 동시 사용

```cpp title="cout.cpp"
#include <iostream>
#include <thread>
void t1() { std::cout << "T1\n"; }
void t2() { std::cout << "T2\n"; }
int main() { std::thread a(t1), b(t2); a.join(); b.join(); }
```

C++ 표준 [iostream.objects.overview]/7은 동기화된 표준 iostream 객체의 입출력 함수를 여러 스레드가 동시에 호출해도 데이터 레이스가 아니라고 규정합니다(글자가 섞일 수는 있습니다). 그런데 두 도구의 결과가 갈렸습니다.

| 도구 | 결과 |
| --- | --- |
| Helgrind | `Possible data race during write of size 8 at 0x4B335D8` 등 2건, `Address 0x4b335d8 is 24 bytes inside data symbol "_ZSt4cout"`, 스택은 `std::__ostream_insert` |
| DRD | `0 errors` (`suppressed: 40 from 40`) |

`-s`로 DRD가 쓴 suppression을 보면 `drd-libstdc++-std::__ostream_insert()`라는 항목이 Valgrind 기본 suppression 파일(`default.supp:641`)에 들어 있습니다. 같은 libstdc++ 내부 접근에 대해 DRD에는 기본 suppression이 있고 Helgrind에는 없어서 생긴 차이입니다. 표준이 레이스가 아니라고 정한 자리이므로 Helgrind 쪽은 `std::__ostream_insert` 프레임으로 좁힌 suppression을 둡니다. 다만 *우리 코드*가 같은 스트림의 `width()`나 플래그를 동시에 바꾸고 있지 않은지는 먼저 확인합니다.

### 2. 함수 안 `static` 초기화

```cpp title="staticinit.cpp"
#include <thread>
#include <vector>
struct MyClass { std::vector<int> v = std::vector<int>(16, 1); };
static MyClass& get_instance() { static MyClass inst; return inst; }
int use() { return get_instance().v[0]; }
int main() {
    std::thread a(use), b(use);
    a.join(); b.join();
    return 0;
}
```

C++11부터 *function-local static* 초기화는 *스레드 안전*이 보장됩니다. 그런데 두 스레드가 처음 동시에 부르게 하면 두 도구 모두 레이스를 보고했습니다.

| 도구 | 결과 |
| --- | --- |
| Helgrind | 2건. `Address 0x1280b8 is 0 bytes inside data symbol "_ZZL12get_instancevE4inst"`, 그리고 vector 버퍼(`a block of size 64 alloc'd`) |
| DRD | 2건. `Conflicting load by thread 3 at 0x001280b8 size 8` 등 |

초기화가 끝났는지 확인하는 guard 검사를 도구가 동기화로 인식하지 못해서 생기는 보고입니다. 해결은 *최초 호출을 main 안*에서 미리 해서 *멀티스레드 진입 전*에 초기화를 끝내는 것입니다. `main` 첫 줄에 `get_instance();`를 넣은 `staticinit2.cpp`는 Helgrind와 DRD 모두 `0 errors`였습니다.

### 3. 외부 라이브러리

7.5절은 자체 동기화 기본 요소를 구현한 라이브러리의 예로 Qt 4.X와 GNU OpenMP 런타임(`libgomp`)을 들고, `libgomp`가 atomic 명령과 futex 조합으로 동기화를 만들어 Helgrind가 "볼 수 없다"고 적습니다. 이런 라이브러리 안쪽의 보고는 최소 재현으로 실제 결함인지 도구 모델의 공백인지 먼저 구분합니다. 제외할 때도 특정 호출 맥락으로 좁히고 재검토 조건을 남깁니다.

---

## 실행 입력 — 공유 counter 보호

다음 파일은 기본 빌드에서 counter 접근을 같은 mutex로 보호합니다. `RACY`를 정의한 빌드는 락을 빼서 진단용 결함 입력을 만듭니다.

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

| 빌드 | 도구 | 출력 | ERROR SUMMARY | 종료 코드 |
| --- | --- | --- | --- | ---: |
| `counter` | Helgrind | `counter=4000` | 0 errors (suppressed: 6005 from 7) | 0 |
| `counter` | DRD | `counter=4000` | 0 errors (suppressed: 21 from 21) | 0 |
| `racy` | Helgrind | `counter=4000` | 2 errors from 2 contexts | 97 |
| `racy` | DRD | `counter=4000` | 4000 errors from 2 contexts | 97 |

두 가지를 짚어 둡니다. 첫째, `racy`도 Valgrind 아래에서는 매번 `counter=4000`이 나왔습니다. 2.8절의 직렬화 때문에 두 스레드가 실제로 겹치지 않은 것입니다. 같은 `racy`를 네이티브로 열 번 돌리면 두 번은 `counter=2217`, `counter=3283`이었습니다. *결과값이 맞다는 것*이 레이스가 없다는 증거가 아니고, 도구는 결과와 무관하게 순서 없는 접근을 보고합니다. 둘째, DRD의 `4000 errors from 2 contexts`는 같은 두 자리(읽기·쓰기)의 충돌을 매번 셌다는 뜻이고, Helgrind는 자리마다 한 번씩 셌습니다. 에러 *개수*는 도구마다 세는 방식이 다르므로 CI에서는 0인지 아닌지만 봅니다.

## 정리

- Valgrind의 *멀티스레드 분석 두 도구*는 **Helgrind**와 **DRD**이고, 둘 다 happens-before 기반입니다. DRD는 vector clock과 segment로 구현됩니다.
- Helgrind만 잠금 순서 역전과 detach 후 `pthread_join`을 보고했고, DRD만 락 경합 임계값 옵션이 있습니다. condition variable 오용 두 가지는 둘 다 잡았습니다.
- `std::scoped_lock`도 Helgrind 잠금 순서 경고를 냈고, `std::cout`은 Helgrind에서만, function-local static 첫 호출은 두 도구 모두에서 오탐이 나왔습니다.
- Valgrind는 스레드를 직렬화하므로 4스레드 프로그램에서 Helgrind 62.8~72.7×, DRD 56.5~61.8×, TSan 7.4~7.5×였습니다.
- TSan과 분담: TSan = PR 빌드, Helgrind/DRD = 야간 + 외부 라이브러리.
- annotation·suppression은 *주장*입니다. relaxed atomic에 annotation을 붙이자 진짜 레이스 보고가 사라졌습니다.
- 레이스가 있는 빌드도 Valgrind 아래에서는 결과값이 맞게 나왔습니다. 결과가 아니라 보고로 판단합니다.

## 다음 장 예고

[Ch 5: Suppression과 실무 운용](/blog/tools/debugging/valgrind/chapter05-suppressions)에서는 *외부 라이브러리 우회*와 *Sanitizer와의 분담* 같은 실무 운영 패턴을 정리합니다. Suppression 문법 상세, *최소화된 suppression*, 그리고 시리즈 마무리입니다.

## 참고 자료

- [Helgrind Manual](https://valgrind.org/docs/manual/hg-manual.html) — 7.2 API 오용, 7.3 잠금 순서, 7.4 레이스와 알고리즘, 7.5 효과적인 사용, 7.6 옵션
- [DRD Manual](https://valgrind.org/docs/manual/drd-manual.html) — 8.1.4 데이터 레이스 탐지, 8.2.1 옵션, 8.2.12 자원 요구량
- [2.8 Support for Threads](https://valgrind.org/docs/manual/manual-core.html#manual-core.pthreads) — 스레드 직렬화
- [C++ draft [iostream.objects.overview]](https://eel.is/c++draft/iostream.objects.overview) — 표준 스트림 동시 사용

## 관련 항목

- [Ch 3: Valgrind Leak Report 분석](/blog/tools/debugging/valgrind/chapter03-leak-report) — 이전 글. Memcheck 보고서 읽기
- [Ch 5: Valgrind Suppression과 실무 운용](/blog/tools/debugging/valgrind/chapter05-suppressions) — 다음 글. 여기서 나온 오탐을 좁게 걸러 내는 방법
- [TSan으로 데이터 레이스 디버깅 — Happens-before 추적](/blog/tools/debugging/sanitizers/chapter04-tsan) — Helgrind·DRD와 같은 레이스를 훨씬 빠르게 잡는 쪽. PR 빌드는 이쪽이 맞습니다
- [멀티스레드·멀티프로세스 디버깅](/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess) — 잡힌 레이스를 디버거에서 재현할 때
- [Helgrind Manual](https://valgrind.org/docs/manual/hg-manual.html) — 옵션과 `ANNOTATE_*` 매크로 공식 설명
