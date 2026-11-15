---
title: "TSan으로 데이터 레이스 디버깅 — Happens-before 추적"
slug: "tools/debugging/sanitizers/chapter04-tsan"
date: 2026-05-29T09:04:00
description: "ThreadSanitizer로 멀티스레드 버그 추적 — happens-before 모델, false positive, atomic·mutex 통합."
tags: [Sanitizer, TSan, ThreadSanitizer, Concurrency, DataRace, C, cpp]
series: "Sanitizers"
seriesOrder: 4
draft: false
topics: ["tools", "tools/debugging"]
---

## 데이터 레이스가 *왜 어려운가*

```cpp
int counter = 0;

std::thread t1([] { counter++; });
std::thread t2([] { counter++; });

t1.join(); t2.join();
std::cout << counter;   // 데이터 레이스로 UB: 결과를 1/2로 제한할 수 없음
```

`counter++`은 *세 단계의 명령*입니다: load → add → store. 두 스레드가 *동시에* load를 하면, 둘 다 같은 옛 값을 보고 같은 새 값을 저장합니다. 단순한 교차 실행으로 1이 되는 상황을 설명할 수 있지만, C++ 데이터 레이스는 UB라서 가능한 결과를 1과 2로 한정할 수 없습니다.

이 버그가 어려운 이유는 *대부분의 실행에서는 안 보입니다*. 운 좋게 한 스레드가 다른 스레드보다 먼저 끝나면 정상으로 보입니다. 빌드를 100번 돌려도 한 번 터지지 않을 수 있습니다. 그러다 *프로덕션 부하 상황에서* 처음 드러납니다.

`ThreadSanitizer(TSan)`은 이런 *잠재된 데이터 레이스*를 *실행 중에* 감지합니다.

```text
WARNING: ThreadSanitizer: data race (pid=12345)
  Write of size 4 at 0x7f8c1a000000 by thread T2:
    #0 increment_counter main.cc:5 (myapp+0x4012a3)
    #1 thread_runner main.cc:12 (myapp+0x4013e1)

  Previous write of size 4 at 0x7f8c1a000000 by thread T1:
    #0 increment_counter main.cc:5 (myapp+0x4012a3)

  Location is global 'counter' of size 4 at 0x7f8c1a000000 (myapp+...)
```

이 보고서가 *해당 실행에서 레이스가 발생할 가능성이 있다*는 의미입니다. 실제 잘못된 값을 보았는지와 *무관*하게, *충분히 빠른 스레드가 있다면* 잘못될 수 있는 자리.

---

## TSan의 동작 — *happens-before 추적*

TSan은 관찰한 메모리 접근과 동기화의 happens-before 관계를 추적합니다. 충돌하는 접근은 서로 다른 스레드가 같은 위치를 다루고 적어도 하나가 쓰기인 경우입니다. 실행되지 않은 경로와 비계측 접근까지 전수 검사하지는 않습니다.

순서가 보장되는 자리(*happens-before*)는 다음과 같습니다.

1. **mutex 락**: unlock은 이후 같은 mutex를 획득하는 lock과 동기화됩니다. 그 결과 앞선 임계구역의 쓰기를 전달합니다.
2. **atomic 연산**: acquire가 해당 release 또는 그 release sequence에서 기록한 값을 읽어야 동기화가 성립합니다.
3. **스레드 생성**: 부모 스레드가 자식 *생성 호출 이전의 모든 일*은 자식이 시작하기 *이전에* happens.
4. **스레드 join**: 자식의 *모든 일*은 부모가 `join()` *이후에* happens.
5. **condition variable**: 공유 조건은 mutex로 보호하고 wait 복귀 뒤 조건을 다시 검사합니다. notify만으로 임의의 비원자 데이터 접근이 보호되지는 않습니다.

이 *명시적 동기화 없이* 두 스레드가 같은 메모리에 접근하고 그중 *하나라도 쓰기*라면 레이스입니다.

```cpp
int data = 0;
std::atomic<bool> ready{false};

// 스레드 A
data = 42;                          // 쓰기
ready.store(true, std::memory_order_release);   // release store

// 스레드 B
if (ready.load(std::memory_order_acquire)) {    // acquire load
    int v = data;                   // 안전 — happens-after data=42
}
```

`atomic store/load`가 *순서 다리*를 놓아 줍니다. TSan은 이 다리를 *이해*하고, 위 코드를 *레이스 없음*으로 판정합니다.

---

## TSan 켜기

```bash
gcc -fsanitize=thread -fno-omit-frame-pointer -g -O1 main.c -o myapp
./myapp
```

ASan과 *같이 못 씁니다*. TSan은 별도 빌드를 만들어 따로 돌립니다.

```cmake
option(ENABLE_TSAN "Enable ThreadSanitizer" OFF)

if(ENABLE_TSAN)
    add_compile_options(-fsanitize=thread -fno-omit-frame-pointer -g -O1)
    add_link_options(-fsanitize=thread)
endif()
```

```bash
cmake -B build-tsan -DENABLE_TSAN=ON
cmake --build build-tsan
ctest --test-dir build-tsan
```

### 오버헤드

실행 시간과 메모리 비용은 대상 코드·입력·런타임마다 측정합니다. [Clang 문서](https://clang.llvm.org/docs/ThreadSanitizer.html)는 일반적인 실행·메모리 비용을 설명하지만, 이 글에서는 컴파일 시간이나 해당 프로젝트의 배율을 측정하지 않았습니다. PR의 짧은 동시성 테스트와 야간 전체 테스트를 분리할지는 실제 소요 시간으로 결정합니다.

---

## 보고서 해석 — *실전 예시*

```cpp
std::map<int, int> cache;     // 동기화 없음

void worker(int key) {
    cache[key] = compute(key);
}

int main() {
    std::thread t1([] { worker(1); });
    std::thread t2([] { worker(2); });
    t1.join(); t2.join();
}
```

```text
WARNING: ThreadSanitizer: data race (pid=12345)
  Write of size 8 at 0x7f8c... by thread T2:
    #0 std::_Rb_tree_insert in <header>
    #1 std::map::operator[] in <header>
    #2 worker main.cc:6
    #3 thread_runner main.cc:12

  Previous read of size 8 at 0x7f8c... by thread T1:
    #0 std::_Rb_tree_iterator in <header>
    #1 std::map::operator[] in <header>
    #2 worker main.cc:6
    #3 thread_runner main.cc:11

  Location is heap block of size 48 at 0x7f8c... allocated by main thread:
    #0 operator new in <libtsan>
    #1 std::map allocator main.cc:3
    #2 main main.cc:9
```

**읽는 법**:

1. *Write*와 *Previous read*가 *같은 주소*에서 일어남.
2. 두 접근이 *다른 스레드*에서.
3. 둘 사이에 *동기화 없음*.
4. Location: *heap의 std::map 내부 노드*. 두 스레드가 같은 map에 동시 접근.

해결: `std::mutex`를 추가하거나 `std::shared_mutex` + 읽기/쓰기 분리. STL 컨테이너는 *기본적으로 스레드 안전 아님*.

```cpp
std::map<int, int> cache;
std::mutex cache_mutex;

void worker(int key) {
    std::lock_guard<std::mutex> lock(cache_mutex);
    cache[key] = compute(key);
}
```

---

## 실제 레이스와 도구의 탐지 한계 구분

atomic·읽기 전용 객체·외부 라이브러리라는 이름만으로 오탐 여부를 결정하지 않습니다. 실제 동기화의 존재와 도구가 이를 관찰했는지 나눠 봅니다.

### 1. 라이브러리가 TSan-instrumented가 아닐 때

TSan은 *모든 코드가 계측되어 있다고 가정*합니다. 외부 라이브러리(libc, libstdc++, OpenSSL)가 계측되지 않으면 *그 안의 동기화를 TSan이 못 봅니다*.

해결:
- **libstdc++/libc++**: 보통 잘 동작. 안 되면 *TSan-instrumented 빌드*가 필요.
- **외부 C 라이브러리**: suppression으로 해당 라이브러리 무시.

```text
# tsan.supp
race:libcurl.so
race:OpenSSL_*
```

### 2. relaxed로 전달한 비원자 데이터는 실제 레이스

```cpp
std::atomic<int> flag{0};
int data = 0;

// 스레드 A
data = 42;
flag.store(1, std::memory_order_relaxed);   // ❌ relaxed는 동기화 안 함

// 스레드 B
while (flag.load(std::memory_order_relaxed) == 0);   // ❌
int v = data;  // TSan: data race!
```

`relaxed`는 *atomic 자체의 원자성만* 보장하고, *주변 메모리의 happens-before 순서는 보장하지 않습니다*. TSan은 정확히 이걸 잡습니다. 실제 동작이 우연히 올바르더라도 *코드는 잘못된 것*.

해결: `release/acquire`로 변경.

```cpp
flag.store(1, std::memory_order_release);   // ✓
while (flag.load(std::memory_order_acquire) == 0);
```

### 3. 시그널 핸들러 안의 접근

```c
volatile int counter = 0;

void handler(int sig) {
    counter++;   // 시그널 핸들러
}

void worker() {
    counter++;   // 메인 스레드
}
```

시그널 핸들러는 *동기화 없이 메인 스레드를 인터럽트*합니다. TSan이 이 자리를 경고할 수 있습니다.

시그널 핸들러에서는 signal-safe 규칙을 따릅니다. 아래 C++17 예제처럼 lock-free임을 확인한 atomic 연산만 허용 범위에서 사용합니다. 모든 std::atomic 타입의 연산이 시그널 안전한 것은 아닙니다. [C++ signal 규칙](https://eel.is/c++draft/support.signal)을 확인합니다.

```cpp
#include <atomic>
static_assert(std::atomic<int>::is_always_lock_free);
std::atomic<int> counter{0};

void handler(int sig) {
    counter.fetch_add(1, std::memory_order_relaxed);
}
```

### 4. 락 외부의 *읽기 전용* 접근

```cpp
struct Config {
    std::string name;       // 초기화 후 변경 안 함
    int max_users;
};

const Config g_config = load_config();

// 스레드 A, B, C 모두
std::cout << g_config.name;  // 동기화 없는 읽기
```

초기화가 스레드 시작 전에 완료되고 이후 변경되지 않는 객체를 여러 스레드가 읽는 것은 데이터 레이스가 아닙니다. const라는 사실만으로 게시 시점까지 보장되지는 않습니다. 경고가 있다면 다른 쓰기·수명 종료·비계측 동기화가 있는지 확인하고, 단지 TSan이 확신하지 못한다는 이유로 무시하지 않습니다.

해결: 초기화가 *모든 스레드 시작 전*에 끝남을 명확히 (`main` 함수 시작 부분, `std::call_once`).

---

## Suppression — TSan용

```text
# tsan.supp
race:race_in_third_party_lib
deadlock:Foo::lock
mutex:libfoo.so
```

```bash
TSAN_OPTIONS=suppressions=tsan.supp ./myapp
```

TSan suppression은 *여러 종류*를 지원합니다.

| 키워드 | 무시 대상 |
|--------|----------|
| `race:` | 데이터 레이스 |
| `race_top:` | 스택 *최상위*가 매칭되는 레이스만 |
| `thread:` | 스레드 생성 누수 |
| `mutex:` | mutex 관련 보고 |
| `deadlock:` | 데드락 |
| `signal:` | 시그널 핸들러 사용 |

`race:libcurl.so`는 *어느 프레임이라도 libcurl이 끼면 무시*, `race_top:libcurl.so`는 *최상위 프레임이 libcurl일 때만* 무시. 후자가 더 엄격합니다.

---

## TSan과 atomic memory model

TSan은 *C++11 메모리 모델*을 엄격히 따릅니다. 따라서 다음 코드들이 *교과서적으로 어떻게 봐야 하는지*를 가르쳐 줍니다.

### `relaxed` 단독은 *데이터 보호 못 함*

```cpp
std::atomic<bool> flag{false};
int data;

// Producer
data = 42;
flag.store(true, std::memory_order_relaxed);

// Consumer
if (flag.load(std::memory_order_relaxed)) {
    int v = data;   // ❌ TSan 경고
}
```

`relaxed`는 *해당 atomic 변수만* 원자적입니다. 주변 메모리(`data`)의 가시성은 보장 안 합니다.

### `release/acquire`로 *데이터 보호*

```cpp
std::atomic<bool> flag{false};
int data;

// Producer
data = 42;
flag.store(true, std::memory_order_release);

// Consumer
if (flag.load(std::memory_order_acquire)) {
    int v = data;   // ✓ data=42가 보임 보장
}
```

`release`-store와 `acquire`-load는 *happens-before 다리*를 놓습니다. Producer의 `data=42`가 Consumer에 정확히 전달됩니다.

### `seq_cst`는 *기본값이자 가장 비싼 것*

C++ atomic의 *디폴트 메모리 순서*는 `seq_cst`(sequentially consistent)입니다. 모든 스레드가 *같은 순서*로 모든 atomic 연산을 본다는 가장 강한 보장.

```cpp
std::atomic<int> x;
x = 5;        // memory_order_seq_cst (기본)
int v = x;    // memory_order_seq_cst
```

성능을 *정확히* 측정하지 않았다면 `seq_cst` 디폴트가 안전. 명시적인 `release/acquire`나 `relaxed`로 약화하는 건 *측정 + 정당화 후*.

---

## 데드락 검출

일부 TSan 런타임은 detect_deadlocks 옵션으로 잠금 순서 역전을 검사합니다. 지원 여부와 기본값을 해당 런타임의 TSAN_OPTIONS=help=1에서 확인합니다. 모든 실제 데드락을 검출한다는 뜻은 아닙니다.

```cpp
std::mutex m1, m2;

void thread_a() {
    std::lock_guard<std::mutex> g1(m1);
    std::lock_guard<std::mutex> g2(m2);   // m1 → m2 순서
}

void thread_b() {
    std::lock_guard<std::mutex> g2(m2);
    std::lock_guard<std::mutex> g1(m1);   // m2 → m1 순서 — 데드락 위험
}
```

잠금 순서 검사가 지원되고 활성화되면 관찰한 획득 순서에서 순환을 찾습니다. 아래 경고는 형식 예시이며 이번 실행에서 잠금 순서 검출을 재현한 기록은 아닙니다.

```text
WARNING: ThreadSanitizer: lock-order-inversion (potential deadlock)
```

관찰한 역순은 잠재적 데드락의 단서이며, 실제로 멈췄다는 판정과 구분합니다.

해결: *모든 스레드에서 같은 순서로 락*. C++17의 `std::scoped_lock`을 쓰면 자동 처리.

```cpp
void thread_a() {
    std::scoped_lock g(m1, m2);
}
void thread_b() {
    std::scoped_lock g(m1, m2);   // 안전: 내부 알고리즘이 deadlock-free
}
```

---

## 운영 팁

### *작은 단위 테스트*가 TSan에 적합

TSan은 *느립니다*. 큰 통합 테스트는 *몇 분/몇 시간*이 걸릴 수 있어 CI 부담이 큽니다. 다음을 권장:

- *동시성 관련 단위 테스트*만 TSan으로 자주 돌림 (PR 빌드).
- *전체 테스트*는 야간 빌드에 한 번 (성능 측정 안 되는 시간).
- *벤치마크 시나리오*는 stress test 형태로 짧게.

### *반복 실행*으로 신뢰도 높이기

TSan은 *실행 중에 발생할 가능성이 있는* 레이스만 감지합니다. 한 번 실행으로는 *모든 경로*를 안 탑니다. CI에서 *같은 테스트를 10번 반복*하는 패턴이 흔합니다.

```yaml
- name: TSan stress test
  run: |
    for i in {1..10}; do
      ./build-tsan/test || exit 1
    done
```

### *thread sanitizer 친화적 라이브러리*

일부 코드는 TSan과 안 친합니다.

- **메모리 풀**: 실제 동기화 없는 재사용은 버그일 수 있습니다. 사용자 정의 동기화를 도구가 관찰하는지 별도로 확인합니다.
- **lock-free 큐**: 정교한 atomic 사용을 TSan이 못 따라갈 수 있음.
- **fiber/coroutine**: 사용자 스케줄러의 fiber API 연동과 문맥 전환 경계를 확인합니다.

먼저 알고리즘의 실제 동기화를 검증합니다. annotation은 이미 존재하는 동기화를 모델링할 때만 사용하며, 잘못된 코드에 가짜 happens-before를 추가해 경고를 가리지 않습니다. suppression도 원인과 재검토 조건을 기록한 뒤 최소 범위로 적용합니다.

---

## 직접 확인 — relaxed 실패와 release/acquire 수정

같은 파일을 두 번 빌드합니다. 기본 분기는 relaxed로 data를 게시하는 잘못된 코드이며, SAFE를 정의하면 release/acquire로 동기화합니다. 잘못된 값이 출력돼야만 레이스인 것은 아닙니다.

```cpp title="publication-race.cpp"
#include <atomic>
#include <cstdio>
#include <thread>

int main() {
    std::atomic<bool> ready{false};
    std::atomic<bool> consumer_started{false};
    int data = 0;
#ifdef SAFE
    constexpr auto store_order = std::memory_order_release;
    constexpr auto load_order = std::memory_order_acquire;
#else
    constexpr auto store_order = std::memory_order_relaxed;
    constexpr auto load_order = std::memory_order_relaxed;
#endif
    std::thread producer([&] {
        while (!consumer_started.load()) std::this_thread::yield();
        data = 42;
        ready.store(true, store_order);
    });
    std::thread consumer([&] {
        consumer_started.store(true);
        while (!ready.load(load_order)) std::this_thread::yield();
        std::printf("data=%d\n", data);
    });
    producer.join();
    consumer.join();
}
```

```bash
clang++ -std=c++17 -O1 -g -fsanitize=thread publication-race.cpp -o race
TSAN_OPTIONS=halt_on_error=1 ./race
clang++ -std=c++17 -O1 -g -fsanitize=thread -DSAFE publication-race.cpp -o safe
TSAN_OPTIONS=halt_on_error=1 ./safe
```

기본 분기는 TSan의 data race 보고와 비정상 종료를, SAFE는 data=42와 정상 종료를 확인합니다. TSan 런타임이 지원되지 않는 환경의 기동 실패를 레이스 검출 성공으로 세지 않습니다.

## 정리

- TSan은 *happens-before 모델*로 데이터 레이스를 감지. 동기화 *없이* 같은 메모리 동시 접근이 레이스.
- 황금 옵션: `-fsanitize=thread -fno-omit-frame-pointer -g -O1`. ASan과 *별도 빌드*.
- 실행 시간·메모리 비용을 측정해 짧은 동시성 테스트와 전체 테스트의 주기를 정합니다.
- `relaxed`는 *주변 메모리 보호 못 함*. `release/acquire` 필요.
- 잠금 순서 검사는 런타임의 지원·옵션을 확인하며 실제 데드락 전수 검출과 구분합니다.
- Suppression은 `race:` / `mutex:` / `deadlock:` 등 키워드별.
- 반복 실행 + 다양한 시나리오로 *커버리지* 확보.

## 다음 장 예고

[Ch 5: CMake / CI 통합](/blog/tools/debugging/sanitizers/chapter05-cmake-ci)에서는 지금까지 본 Sanitizer 빌드를 *프로젝트에 자연스럽게* 통합하는 방법을 다룹니다. CMake 옵션, sanitizer-friendly 라이브러리 모드, GitHub Actions / GitLab CI 설정 예시.

## 참고 자료

- [ThreadSanitizer Manual (Clang)](https://clang.llvm.org/docs/ThreadSanitizer.html)
- [TSan Flags](https://github.com/google/sanitizers/wiki/ThreadSanitizerFlags)
- [Memory Model Synchronization Modes](https://en.cppreference.com/w/cpp/atomic/memory_order)
- *C++ Concurrency in Action* (Anthony Williams) — 메모리 모델 깊이 이해

## 관련 항목

- [Ch 3: LSan 누수 분석](/blog/tools/debugging/sanitizers/chapter03-lsan-leaks) — ASan 계열 빌드에서 다루는 누수 쪽
- [Ch 5: Sanitizer를 CMake와 CI에 통합](/blog/tools/debugging/sanitizers/chapter05-cmake-ci) — TSan 전용 빌드를 파이프라인에 얹기
- [Valgrind Ch 4: Helgrind와 DRD](/blog/tools/debugging/valgrind/chapter04-helgrind-drd) — 같은 레이스를 재컴파일 없이 진단하는 도구
- [GDB·LLDB Ch 6: 멀티스레드·멀티프로세스 디버깅](/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess) — 레이스가 잡힌 뒤 스레드 상태를 직접 들여다볼 때
- [ThreadSanitizer Manual (Clang)](https://clang.llvm.org/docs/ThreadSanitizer.html) — TSan 옵션과 제약 원문
