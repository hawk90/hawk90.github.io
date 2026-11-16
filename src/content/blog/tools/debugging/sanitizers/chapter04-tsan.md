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

```cpp title="counter.cpp"
#include <iostream>
#include <thread>
int counter = 0;
void increment_counter() { counter++; }
int main() {
    std::thread t1(increment_counter);
    std::thread t2(increment_counter);
    t1.join(); t2.join();
    std::cout << counter << '\n';   // 데이터 레이스로 UB: 결과를 1/2로 제한할 수 없음
}
```

`counter++`은 *세 단계의 명령*입니다: load → add → store. 두 스레드가 *동시에* load를 하면, 둘 다 같은 옛 값을 보고 같은 새 값을 저장합니다. 단순한 교차 실행으로 1이 되는 상황을 설명할 수 있지만, C++ 데이터 레이스는 UB라서 가능한 결과를 1과 2로 한정할 수 없습니다.

이 버그가 어려운 이유는 *대부분의 실행에서는 안 보입니다*. sanitizer 없이 Apple clang 21 `-O1`로 빌드해 M2 Pro에서 1,000번 실행했을 때 이번에는 986번이 `2`, 14번(1.4%)이 `1`이었습니다. 한 스레드가 다른 스레드보다 먼저 끝나면 정상으로 보이니, 테스트를 몇 번 돌려서는 1.4%짜리 실패를 만나기 어렵습니다.

`ThreadSanitizer(TSan)`은 이런 *잠재된 데이터 레이스*를 *실행 중에* 감지합니다. 같은 파일을 `-fsanitize=thread -g -O1`로 빌드해 한 번 실행한 결과입니다(Apple clang 21, libc++ 템플릿 프레임은 `...`로 생략).

```text
==================
WARNING: ThreadSanitizer: data race (pid=58902)
  Write of size 4 at 0x0001024c0000 by thread T2:
    #0 increment_counter() counter.cpp:4 (counter:arm64+0x100000728)
    ...

  Previous write of size 4 at 0x0001024c0000 by thread T1:
    #0 increment_counter() counter.cpp:4 (counter:arm64+0x100000728)
    ...

  Location is global 'counter' at 0x0001024c0000 (counter+0x100008000)

  Thread T2 (tid=32468469, running) created by main thread at:
    #0 pthread_create <null> (libclang_rt.tsan_osx_dynamic.dylib:arm64e+0x33bac)
    ...

  Thread T1 (tid=32468468, finished) created by main thread at:
    #0 pthread_create <null> (libclang_rt.tsan_osx_dynamic.dylib:arm64e+0x33bac)
    ...

SUMMARY: ThreadSanitizer: data race counter.cpp:4 in increment_counter()
==================
2
ThreadSanitizer: reported 1 warnings
```

출력은 정상값 `2`였고, 보고서는 T1이 이미 `finished` 상태라고 적었습니다. 두 증가가 실제로 겹치지 않은 실행에서도 TSan은 "두 쓰기 사이에 happens-before가 없다"는 사실만으로 보고합니다. Debian 13의 clang 19 빌드를 10번 돌렸을 때도 10번 모두 보고와 함께 종료 코드 66으로 끝났습니다. TSan이 레이스를 보고하면 Linux에서는 `exitcode` 기본값 66으로, macOS에서는 `abort_on_error` 기본값 `true` 때문에 134로 끝났습니다.

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

[Clang 문서](https://clang.llvm.org/docs/ThreadSanitizer.html)는 "Typical slowdown introduced by ThreadSanitizer is about 5x-15x", 메모리는 "about 5x-10x"라고 적습니다. Limitations 절에는 기본 설정의 메모리 비용이 "5x plus 1Mb per each thread"라는 설명도 있습니다.

직접 잰 값은 다음과 같습니다. 스레드 4개가 각자 난수 2^23개를 `std::sort`하고 중앙값을 mutex로 더하는 `work.cpp`를 Apple clang 21 `-O1`로 빌드해, 한 번 데운 뒤 다섯 번씩 `/usr/bin/time -l`로 쟀습니다(M2 Pro, 12코어).

| 빌드 | 실행 시간 (초) | 최대 RSS |
|------|------|------|
| 계측 없음 | 0.21~0.30 | 129.8MB |
| `-fsanitize=thread` | 0.35~0.38 (첫 측정 0.61) | 438.9~486.8MB |
| `-fsanitize=address` | 0.23~0.26 | 160.7~160.8MB |

다섯 번의 중앙값은 계측 없음 0.23초, TSan 0.37초로 TSan이 약 1.6배였고, 메모리는 3.4~3.7배였습니다. 같은 측정을 두 번 더 했을 때 중앙값 비율은 약 1.5배, 그리고 2.0배(0.21초 대 0.42초)로 흔들렸습니다. 이 작업에서 시간 배율은 1.5~2.0배 범위였습니다. 이 작업은 스레드마다 자기 배열만 정렬하므로 스레드 사이의 공유 접근이 mutex 구간 하나뿐입니다. 이 숫자는 "문서 값보다 작게 나온 사례 하나"로만 읽고, PR과 야간 빌드에 TSan을 어떻게 나눌지는 자기 테스트의 시간으로 정합니다.

---

## 보고서 해석 — *실전 예시*

```cpp title="map.cpp"
#include <map>
#include <thread>
std::map<int, int> cache;     // 동기화 없음
int compute(int k) { return k * 2; }
void worker(int key) { cache[key] = compute(key); }
int main() {
    std::thread t1([] { worker(1); });
    std::thread t2([] { worker(2); });
    t1.join(); t2.join();
}
```

Debian 13의 GCC 14로 `g++ -std=c++17 -O1 -g -fsanitize=thread`를 빌드해 실행한 첫 보고입니다. `std::_Rb_tree` 내부 프레임과 스레드 생성 정보는 `...`로 생략했습니다.

```text
WARNING: ThreadSanitizer: data race (pid=1081)
  Read of size 4 at 0xffffb4000b90 by thread T2:
    ...
    #5 worker(int) /root/t/map.cpp:5 (mapg+0x14ac)
    #6 operator() /root/t/map.cpp:8 (mapg+0x1680) (BuildId: 0105a37f9129a0babf1d8040bdc5bf3c3602712e)
    ...
  Previous write of size 8 at 0xffffb4000b90 by thread T1:
    ...
    #8 worker(int) /root/t/map.cpp:5 (mapg+0x1504)
    #9 operator() /root/t/map.cpp:7 (mapg+0x1644) (BuildId: 0105a37f9129a0babf1d8040bdc5bf3c3602712e)
    ...
  Location is heap block of size 40 at 0xffffb4000b70 allocated by thread T1:
    ...
SUMMARY: ThreadSanitizer: data race /usr/include/c++/14/bits/stl_function.h:405 in std::less<int>::operator()(int const&, int const&) const
```

**읽는 법**:

1. T2의 *Read*와 T1의 *Previous write*가 *같은 주소*(`0xffffb4000b90`)에서 일어났습니다.
2. 두 접근이 *다른 스레드*에서, 둘 사이의 *동기화 없이* 일어났습니다.
3. Location은 T1이 할당한 *40바이트 heap 블록*, 즉 T1이 `cache[1]`로 넣은 트리 노드입니다. T1이 그 노드를 쓴 뒤, 둘 사이의 동기화 없이 T2가 키를 비교하려고(`std::less<int>`) 같은 노드를 읽었습니다.
4. SUMMARY의 위치는 라이브러리 헤더(`stl_function.h:405`)입니다. 우리 코드 위치는 스택에서 `map.cpp`가 나오는 첫 프레임(#5)을 찾아야 합니다.

같은 파일을 macOS의 Apple clang 21(libc++)로 돌리면 한 실행에서 `ThreadSanitizer: reported 5 warnings`가 나왔습니다. 트리 루트, 노드 키, 자식 포인터처럼 서로 다른 주소마다 보고가 하나씩 생겼습니다.

해결은 `std::mutex`를 추가하거나 `std::shared_mutex`로 읽기/쓰기를 나누는 것입니다. STL 컨테이너는 서로 다른 스레드의 동시 수정에 대해 스레드 안전하지 않습니다. 아래 수정본은 같은 Apple clang 21 TSan 빌드에서 경고 없이 종료 코드 0으로 끝났습니다.

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

[TSan 문서](https://clang.llvm.org/docs/ThreadSanitizer.html#limitations)의 Limitations 절은 "ThreadSanitizer generally requires all code to be compiled with -fsanitize=thread"라고 적고, 미리 빌드된 동적 라이브러리처럼 계측되지 않은 코드가 있으면 "TSan may fail to detect races or may report false positives"라고 경고합니다. 대응 옵션으로는 `ignore_interceptors_accesses`와 `ignore_noninstrumented_modules`를 가리킵니다.

표준 라이브러리는 이 장의 예제에서 문제를 일으키지 않았습니다. `std::thread`·`std::mutex`·`std::map`을 쓰는 수정본 `mapfix.cpp`는 macOS의 libc++(Apple clang 21)에서, 이 장 끝의 `-DSAFE` 빌드는 libc++와 Debian의 libstdc++(clang 19) 모두에서 경고 없이 끝났습니다. libc의 `pthread_mutex_lock` 같은 동기화는 TSan 런타임의 인터셉터가 직접 봅니다.

계측하지 않은 외부 C 라이브러리의 보고는 suppression으로 끕니다.

```text
# tsan.supp
race:libcurl.so
race:OpenSSL_*
```

`race:` 패턴이 스택의 *어느 프레임*에든 맞으면 보고 전체가 꺼진다는 점은 주의합니다. 이 장 첫 예제 `counter.cpp`의 실제 레이스에 `race:libstdc++.so` 한 줄을 주자, 스택 아래쪽에 libstdc++의 스레드 시작 프레임이 있다는 이유로 보고가 사라지고 종료 코드가 0이 됐습니다(아래 Suppression 절).

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

`relaxed`는 *atomic 자체의 원자성만* 보장하고, *주변 메모리의 happens-before 순서는 보장하지 않습니다*. TSan은 정확히 이걸 잡습니다. 이 장 끝의 `publication-race.cpp`가 이 패턴이고, `data`에 대한 `data race` 보고가 나왔습니다. 실제 동작이 우연히 올바르더라도 코드는 잘못됐습니다.

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

시그널 핸들러는 *동기화 없이 메인 스레드를 인터럽트*합니다. 이 패턴을 실행 가능하게 만들어, 작업 스레드가 `counter++`를 100만 번 하는 동안 메인 스레드가 `raise(SIGUSR1)`로 핸들러를 부르게 했습니다. 결과는 플랫폼마다 달랐습니다.

- Debian 13 clang 19: `WARNING: ThreadSanitizer: data race`가 나왔고, 두 접근은 `handler /root/t/sig.c:9:12`와 `worker /root/t/sig.c:14:86`이었습니다(SUMMARY: `data race /root/t/sig.c:9:12 in handler`).
- macOS Apple clang 21: 같은 파일이 보고 없이 끝났습니다.

핸들러 안에 `free(malloc(16))`을 더한 빌드도 Debian에서 같은 data race 하나만 보고했고, `report_signal_unsafe`(기본 `true`)의 별도 경고는 나오지 않았습니다.

시그널 핸들러에서는 signal-safe 규칙을 따릅니다. [C++ 표준 초안 support.signal](https://eel.is/c++draft/support.signal)은 핸들러 안의 표준 라이브러리 호출을 signal-safe가 아니라고 보고, 예외로 "plain lock-free atomic operations"를 둡니다. `is_lock_free()`가 `true`인 객체에 대한 멤버 함수 호출이 여기에 들어가므로, 아래 C++17 예제처럼 `static_assert`로 lock-free를 컴파일 시점에 못 박아 둡니다.

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

초기화가 스레드 시작 전에 완료되고 이후 변경되지 않는 객체를 여러 스레드가 읽는 것은 데이터 레이스가 아닙니다. `load_config()`가 `{"prod", 100}`을 돌려주게 하고 스레드 세 개가 `g_config`를 읽는 프로그램은 Debian 13 clang 19 TSan에서 `prod 100` 세 줄과 종료 코드 0으로 끝났습니다. 전역 초기화가 `main` 이전에 끝나고, 스레드 생성이 그 뒤의 happens-before를 만들기 때문입니다. `const`라는 사실이 아니라 이 순서가 안전의 근거이므로, 스레드가 이미 도는 중에 값을 채우는 설정 객체라면 같은 결론이 나오지 않습니다.

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

TSan suppression은 *여러 종류*를 지원합니다. 아래 표는 [TSan 문서의 Suppressions 절](https://clang.llvm.org/docs/ThreadSanitizer.html#suppressions)이 나열한 종류입니다.

| 키워드 | 무시 대상 (문서 설명) |
|--------|----------|
| `race:` | 데이터 레이스. 함수·소스 파일·전역 변수 이름을 스택 전체에서 맞춤 |
| `race_top:` | 스택 *최상위* 프레임이 맞는 레이스만 |
| `thread:` | 스레드 누수 보고. 누수된 스레드의 이름과 맞춤 |
| `mutex:` | 이중 잠금, 잘못된 해제 같은 mutex 오용 |
| `deadlock:` | 잠금 순서 역전·데드락 보고 |
| `signal:` | 시그널 핸들러 안의 signal-unsafe 호출과 errno 사용 |
| `called_from_lib:` | 계측하지 않은 특정 라이브러리에서 시작된 호출 |

`counter.cpp`의 레이스(두 스레드의 `increment_counter()`가 전역 `counter`에 씀)에 규칙을 하나씩 주고 Debian 13 clang 19 빌드를 돌린 결과입니다.

| 규칙 | 종료 코드 | 남은 경고 |
|------|------|------|
| (없음) | 66 | 1 |
| `race:counter` (전역 변수 이름) | 0 | 0 |
| `race:increment_counter` | 0 | 0 |
| `race_top:increment_counter` | 0 | 0 |
| `race_top:main` | 66 | 1 |
| `race:counter.cpp` | 0 | 0 |
| `race:libstdc++.so` | 0 | 0 |

`race_top:main`은 최상위 프레임이 `increment_counter()`라서 맞지 않았고, `race:libstdc++.so`는 스택 아래쪽의 libstdc++ 스레드 시작 프레임에 맞아 진짜 레이스를 지웠습니다. 외부 라이브러리를 끌 때는 `race_top:`이나 함수 이름 규칙이 더 좁습니다. `print_suppressions=1`을 주면 종료 때 `ThreadSanitizer: Matched 1 suppressions (pid=666):`와 `1 race:increment_counter`처럼 어떤 규칙이 몇 번 쓰였는지가 나옵니다.

---

## TSan과 atomic memory model

아래 두 패턴은 이 장 끝의 `publication-race.cpp`로 직접 돌렸습니다. `relaxed` 버전은 `data race`로 보고됐고, `release/acquire` 버전(`-DSAFE`)은 보고 없이 끝났습니다.

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

### `seq_cst`는 *기본값이자 가장 강한 것*

C++ atomic의 *디폴트 메모리 순서*는 `seq_cst`(sequentially consistent)입니다. 모든 스레드가 *같은 순서*로 모든 atomic 연산을 본다는 가장 강한 보장.

```cpp
std::atomic<int> x;
x = 5;        // memory_order_seq_cst (기본)
int v = x;    // memory_order_seq_cst
```

1장의 `publication.cpp`가 이 기본값만으로 TSan 경고 없이 `data=42`를 전달했습니다. `release/acquire`나 `relaxed`로 약화하는 건 그 비용 차이를 자기 코드에서 측정하고 이유를 남긴 뒤에 합니다.

---

## 데드락 검출

TSan은 `detect_deadlocks` 옵션으로 잠금 순서 역전을 검사합니다. [TSan 문서](https://clang.llvm.org/docs/ThreadSanitizer.html#run-time-flags)는 기본값을 `true`로 적고 Debian clang 19·Homebrew LLVM 23 런타임의 `TSAN_OPTIONS=help=1`도 `true`였지만, Apple clang 21 런타임은 `false`였습니다.

| 런타임 | `detect_deadlocks` 기본값 | 아래 예제 결과 |
|------|------|------|
| Debian 13 clang 19 | true | `lock-order-inversion` 보고, 종료 코드 66 |
| Debian 13 GCC 14 | — | `lock-order-inversion` 보고 |
| macOS Homebrew LLVM 23 | true | 보고 없음 |
| macOS Apple clang 21 | false | `detect_deadlocks=1`을 줘도 보고 없음 |

macOS에서는 `std::mutex` 대신 `pthread_mutex_t` 두 개를 한 스레드에서 역순으로 잡는 C 예제로 바꿔도 두 컴파일러 모두 보고가 없었습니다. 이 검사는 Linux 빌드에서 돌립니다. GCC 칸의 —는 기본값을 읽지 않았다는 뜻입니다.

```cpp title="deadlock.cpp"
#include <mutex>
#include <thread>
std::mutex m1, m2;
void thread_a() {
    std::lock_guard<std::mutex> g1(m1);
    std::lock_guard<std::mutex> g2(m2);   // m1 → m2 순서
}
void thread_b() {
#ifdef SCOPED
    std::scoped_lock g(m2, m1);
#else
    std::lock_guard<std::mutex> g2(m2);
    std::lock_guard<std::mutex> g1(m1);   // m2 → m1 순서 — 데드락 위험
#endif
}
int main() {
    std::thread a(thread_a); a.join();
    std::thread b(thread_b); b.join();
}
```

`main`은 `thread_a`가 끝난 뒤에야 `thread_b`를 시작하므로 이 프로그램은 절대 멈추지 않습니다. 그래도 Debian 13의 clang 19 TSan은 다음을 보고했습니다(libstdc++ 프레임은 생략).

```text
==================
WARNING: ThreadSanitizer: lock-order-inversion (potential deadlock) (pid=1031)
  Cycle in lock order graph: M0 (0xaaaab6743928) => M1 (0xaaaab6743958) => M0

  Mutex M1 acquired here while holding mutex M0 in thread T1:
    #0 pthread_mutex_lock <null> (deadlock+0x6e38c) (BuildId: 6219fb3cf8a39c8834d1cd30fafde371e7bfb2eb)
    ...
    #4 thread_a() /root/t/deadlock.cpp:6:33 (deadlock+0xfdc84)
    ...

    Hint: use TSAN_OPTIONS=second_deadlock_stack=1 to get more informative warning message

  Mutex M0 acquired here while holding mutex M1 in thread T2:
    #0 pthread_mutex_lock <null> (deadlock+0x6e38c) (BuildId: 6219fb3cf8a39c8834d1cd30fafde371e7bfb2eb)
    ...
    #4 thread_b() /root/t/deadlock.cpp:13:33 (deadlock+0xfdd10)
    ...

  Thread T1 (tid=1033, finished) created by main thread at:
    ...

  Thread T2 (tid=1034, running) created by main thread at:
    ...

SUMMARY: ThreadSanitizer: lock-order-inversion (potential deadlock) (/root/t/deadlock+0x6e38c) (BuildId: 6219fb3cf8a39c8834d1cd30fafde371e7bfb2eb) in pthread_mutex_lock
==================
ThreadSanitizer: reported 1 warnings
```

TSan은 "M0을 쥔 채 M1을 잡았다", "M1을 쥔 채 M0을 잡았다"라는 두 사실로 잠금 순서 그래프에 순환을 만들고, 두 스레드가 실제로 겹쳤는지와 상관없이 보고합니다. 이 경고는 *실제로 멈췄다*가 아니라 *타이밍만 맞으면 멈출 수 있다*는 뜻입니다. 힌트대로 `TSAN_OPTIONS=second_deadlock_stack=1`을 주면 각 mutex를 먼저 잡은 위치(`deadlock.cpp:5:33`, `deadlock.cpp:12:33`)도 `Mutex M0 previously acquired by the same thread here:` 아래에 붙었습니다.

해결: *모든 스레드에서 같은 순서로 락*. C++17의 `std::scoped_lock`을 쓰면 자동 처리.

```cpp
void thread_a() {
    std::scoped_lock g(m1, m2);
}
void thread_b() {
    std::scoped_lock g(m1, m2);   // 안전: 내부 알고리즘이 deadlock-free
}
```

`-DSCOPED`로 빌드해 `thread_b`만 `std::scoped_lock g(m2, m1);`(인자 순서를 일부러 반대로 둠)을 쓰게 한 바이너리도 Debian 13 clang 19 TSan에서 보고 없이 종료 코드 0으로 끝났습니다. [`std::scoped_lock`](https://en.cppreference.com/w/cpp/thread/scoped_lock)은 mutex가 둘 이상이면 `std::lock`과 같은 교착 회피 알고리즘으로 잡으므로, 인자 순서가 달라도 교착이 생기지 않습니다.

---

## 운영 팁

### *작은 단위 테스트*가 TSan에 적합

TSan은 문서 기준 5~15배 느리고, 앞의 측정에서도 메모리를 3.4~3.7배 썼습니다. 테스트 전체를 TSan 빌드로 돌리면 그만큼 CI 시간과 러너 메모리가 늘어나므로 다음처럼 나눕니다.

- *동시성 관련 단위 테스트*만 TSan으로 자주 돌림 (PR 빌드).
- *전체 테스트*는 야간 빌드에 한 번 (성능 측정 안 되는 시간).
- *벤치마크 시나리오*는 stress test 형태로 짧게.

### *반복 실행*으로 신뢰도 높이기

TSan은 *실행된* 접근만 봅니다. 앞의 `counter.cpp`처럼 두 접근이 매번 실행되는 코드라면 첫 실행에서 잡히고, 실제로 Debian에서 10번 모두 같은 보고가 나왔습니다. 반복이 도움이 되는 경우는 스레드 스케줄에 따라 *어느 코드 경로가 실행되는지*가 달라지는 테스트입니다. 그런 테스트는 반복 실행으로 경로 표본을 늘립니다.

```yaml
- name: TSan stress test
  run: |
    for i in {1..10}; do
      ./build-tsan/test || exit 1
    done
```

### *thread sanitizer 친화적 라이브러리*

일부 코드는 TSan과 안 친합니다.

- **메모리 풀**: 해제한 블록을 다른 스레드에 다시 줄 때 mutex나 atomic이 아닌 방법으로 넘기면, TSan은 그 전달을 동기화로 보지 못합니다.
- **사용자 정의 mutex·lock-free 큐**: `sanitizer/tsan_interface.h`는 이런 코드를 위해 `__tsan_acquire(void *addr)`/`__tsan_release(void *addr)`와 사용자 mutex용 annotation을 제공합니다. 헤더 주석은 mutex annotation의 대가로 "annotated mutex code itself is not checked for correctness"라고 적습니다.
- **계측하지 않은 라이브러리**: 위 Limitations 인용대로 놓친 레이스와 오탐이 모두 생길 수 있습니다.

annotation은 이미 존재하는 동기화를 TSan에 알려 줄 때만 씁니다. 잘못된 코드에 `__tsan_release`/`__tsan_acquire`를 넣으면 실제 레이스가 가려집니다. suppression도 원인과 재검토 조건을 기록한 뒤 최소 범위로 적용합니다.

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

macOS Apple clang 21에서 기본 분기를 실행한 결과입니다(libc++ 프레임은 생략).

```text
$ TSAN_OPTIONS=halt_on_error=1 ./race
==================
WARNING: ThreadSanitizer: data race (pid=69378)
  Read of size 4 at 0x00016d886168 by thread T2:
    #0 main::$_1::operator()() const publication-race.cpp:24 (race:arm64+0x100000b7c)
    ...

  Previous write of size 4 at 0x00016d886168 by thread T1:
    #0 main::$_0::operator()() const publication-race.cpp:18 (race:arm64+0x100000974)
    ...

  Location is stack of main thread.

  Thread T2 (tid=32518287, running) created by main thread at:
    #0 pthread_create <null> (libclang_rt.tsan_osx_dynamic.dylib:arm64e+0x33bac)
    ...

  Thread T1 (tid=32518286, finished) created by main thread at:
    #0 pthread_create <null> (libclang_rt.tsan_osx_dynamic.dylib:arm64e+0x33bac)
    ...

SUMMARY: ThreadSanitizer: data race publication-race.cpp:24 in main::$_1::operator()() const
==================
$ echo $?
134
$ TSAN_OPTIONS=halt_on_error=1 ./safe
data=42
$ echo $?
0
```

`halt_on_error=1` 때문에 기본 분기는 `printf`에 닿기 전에 멈춰 `data=` 줄이 없습니다. 읽기(`publication-race.cpp:24`, `printf`의 `data`)와 쓰기(`:18`, `data = 42`)가 지목됐고, `data`가 `main`의 지역 변수라 Location은 `stack of main thread`입니다. Debian 13의 clang 19에서도 같은 두 줄이 보고됐고 종료 코드는 66, `SAFE` 빌드는 `data=42`와 0이었습니다.

## 정리

- TSan은 *happens-before 모델*로 데이터 레이스를 감지합니다. 두 접근이 실제로 겹치지 않은 실행에서도 동기화가 없으면 보고합니다(`counter.cpp`는 출력 `2`에서도 보고).
- 황금 옵션: `-fsanitize=thread -fno-omit-frame-pointer -g -O1`. ASan과 *별도 빌드*.
- 문서 값은 시간 5~15배·메모리 5~10배이고, 정렬 작업 하나에서 잰 값은 시간 1.5~2.0배·메모리 3.4~3.7배였습니다.
- `relaxed`는 *주변 메모리 보호 못 함*. `release/acquire` 필요.
- 잠금 순서 역전은 Debian의 clang·GCC에서 실제로 멈추지 않는 실행으로도 보고됐고, macOS 두 런타임에서는 보고되지 않았습니다.
- Suppression은 `race:` / `race_top:` / `mutex:` / `deadlock:` 등 키워드별이며, `race:`는 스택 전체에 맞으므로 라이브러리 이름 하나로 진짜 레이스를 지울 수 있습니다.
- 반복 실행은 스케줄에 따라 실행 경로가 바뀌는 테스트에서 경로 표본을 늘리는 수단입니다.

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
