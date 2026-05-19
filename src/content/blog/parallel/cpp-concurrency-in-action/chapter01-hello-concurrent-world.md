---
title: "Ch 1: Hello, concurrent world!"
date: 2026-05-06T01:00:00
description: "동시성과 병렬성의 차이, C++11 std::thread 첫 사용, 동시성을 사용해야 할 이유."
tags: [C++, Concurrency, std::thread]
series: "C++ Concurrency in Action"
seriesOrder: 1
draft: false
---

동시성(concurrency)은 왜 필요한가? 단일 스레드로 충분하지 않은가? 이 장에서는 동시성의 본질을 짚고, C++에서 첫 번째 스레드를 띄워 본다.

### 왜 멀티스레드가 단일 스레드를 대체하지 못했는가

질문의 방향이 사실은 거꾸로다. **멀티스레드는 단일 스레드를 *대체*한 게 아니라, 단일 스레드가 더 이상 빨라질 수 없게 되자 *추가*된 것이다.** 1970년대부터 2000년대 중반까지는 단일 코어의 성능을 끌어올리는 것이 곧 컴퓨터를 빠르게 만드는 것과 같은 말이었다. 트랜지스터를 작게 만들면 같은 면적에 더 많이 넣을 수 있고, 클럭을 올려도 전력 밀도가 일정하게 유지된다는 **데나드 스케일링(Dennard scaling)**이 그 근거였다.

2005년경 이 법칙이 무너졌다. 트랜지스터를 더 작게 만들어도 누설 전류(leakage current)가 기하급수적으로 늘어났다. 클럭을 올리면 전력 밀도가 폭주했고, 칩이 녹기 직전에 도달했다. Intel은 4 GHz를 향해 가던 Pentium 4 후속 로드맵을 폐기했고, AMD도 같은 시기에 듀얼 코어로 방향을 틀었다. 이후 20년 동안 단일 코어 클럭은 3~5 GHz 사이에서 거의 정체되어 있다.

성능을 더 짜내는 길은 두 가지가 남았다. 같은 클럭으로 *명령어를 더 많이* 실행하는 길(super-scalar, SIMD, 분기 예측)과, *코어를 더 많이* 두는 길이다. 전자는 컴파일러와 하드웨어가 알아서 한다. 후자는 *소프트웨어가 일을 잘게 쪼개 줘야* 비로소 효과를 본다. 동시성이 옵션이 아니라 *기본기*가 된 이유다.

> **데나드 스케일링의 종말.** Robert Dennard가 1974년에 정리한 관계식은 트랜지스터의 길이를 1/k로 줄이면 전압도 1/k로 줄어 전력 밀도가 일정하게 유지된다는 것이다. 2000년대 중반 이후 임계 전압을 더 낮출 수 없게 되면서(누설 전류 폭증) 이 관계가 깨졌다. 무어의 법칙(트랜지스터 수)은 아직 살아 있지만, 데나드 스케일링(클럭 속도)은 죽었다.

## 1.1 동시성이란 무엇인가

### 동시성 vs 병렬성

두 개념은 자주 혼용되지만 다르다.

| 개념 | 정의 | 핵심 |
|------|------|------|
| **동시성 (Concurrency)** | 여러 작업이 **논리적으로** 동시에 진행 | 구조의 문제 |
| **병렬성 (Parallelism)** | 여러 작업이 **물리적으로** 동시에 실행 | 실행의 문제 |

![동시성과 병렬성의 차이](/images/blog/cpp-concurrency-in-action/diagrams/ch01-concurrency-vs-parallelism.svg)

**동시성은 병렬성 없이도 존재한다.** 싱글 코어 CPU에서도 OS 스케줄러가 작업을 빠르게 전환하면 동시에 실행되는 것처럼 보인다.

**병렬성은 동시성을 전제한다.** 물리적으로 동시에 실행하려면 먼저 작업이 독립적으로 분리되어 있어야 한다.

### 카페로 보는 비유

동시성과 병렬성의 차이는 카페 운영에 빗대면 손에 잡힌다.

- **혼자 일하는 바리스타.** 손님 A의 에스프레소를 추출 버튼 누르고, 추출되는 30초 동안 손님 B의 주문을 받고, 다시 A의 잔을 마무리한다. 어느 순간이든 *한 작업*만 수행하지만, 손님 입장에서는 두 주문이 *동시에 진행*된다. 이것이 동시성이다(병렬성 없음). OS 스케줄러가 단일 코어에서 두 스레드를 번갈아 깨우는 모습이 그대로 이 장면이다.
- **두 명의 바리스타.** A와 B의 주문을 *같은 순간*에 두 사람이 처리한다. 둘 다 동시에 추출 버튼을 누르고, 둘 다 동시에 잔을 채운다. 이것이 병렬성이다.
- **혼합형.** 카페에 바리스타 두 명이 있고 손님 다섯이 줄을 섰다. 두 명은 진짜 병렬로 일하지만, 각자는 또 자기 손님들 사이에서 빠르게 전환한다. 현실의 멀티코어 시스템이 이 모습이다.

비유의 핵심은 *작업을 분리할 수 있어야* 병렬화가 가능하다는 점이다. 한 잔의 에스프레소를 두 명이 동시에 추출할 수는 없다. 같은 동시성 구조도 작업이 데이터를 공유하면 락이나 트랜잭션 같은 *조정 비용*이 따라붙는다. 카페의 두 바리스타가 같은 우유통을 쓰면 잠깐씩 서로를 기다려야 하듯이.

### 하드웨어 동시성 vs 태스크 동시성

책의 그림 1.1과 1.2는 동시성을 두 축으로 나눈다. 하나는 **하드웨어가 실제로 무엇을 하는가**이고, 다른 하나는 **소프트웨어가 작업을 어떻게 쪼개는가**이다.

| 축 | 핵심 질문 | 결과 |
|----|----------|------|
| 하드웨어 동시성 | CPU에 코어/하드웨어 스레드가 몇 개인가? | 진짜 병렬 실행 능력 |
| 태스크 동시성 | 프로그램이 작업을 몇 갈래로 분기시키는가? | 논리적 동시 실행 능력 |

싱글 코어에서 두 작업을 번갈아 실행하는 방식을 **태스크 전환(task switching)**이라 한다. 코어가 한 작업을 잠시 멈추고 컨텍스트를 저장한 뒤 다른 작업을 이어 실행한다. 충분히 빠르게 전환되면 사람 눈에는 두 작업이 동시에 진행되는 것처럼 보인다. 그러나 어느 순간이든 코어는 단 하나의 명령만 처리한다.

멀티 코어에서는 **하드웨어 동시성(hardware concurrency)**이 가능하다. 두 작업이 서로 다른 코어에서 *같은 순간*에 명령을 수행한다. 책에서는 이 모드를 그림 1.1로, 단일 코어 위의 태스크 전환을 그림 1.2로 대비시킨다.

```text
싱글 코어 (태스크 전환):
Core 0:  [A1][B1][A2][B2][A3][B3]...     ← 시간 축
         └─ 한 순간엔 A 또는 B만 실행

멀티 코어 (하드웨어 동시성):
Core 0:  [A1][A2][A3][A4]...
Core 1:  [B1][B2][B3][B4]...
         └─ 같은 순간에 A와 B 모두 실행
```

태스크 동시성은 **상호작용 동시성(interaction concurrency)**과 **데이터 동시성(data concurrency)**으로 다시 나뉜다. 전자는 서로 다른 일을 하는 작업이 동시에 진행되는 경우(UI와 디스크 I/O 등)이고, 후자는 같은 일을 데이터 조각마다 반복하는 경우(이미지 픽셀 처리 등)다. 후자가 곧 데이터 병렬성(data parallelism)의 동기다.

### 하이브리드: 컨텍스트 스위치 + 병렬

실제 시스템은 거의 항상 둘이 섞여 있다. 코어 8개짜리 기기에서 100개의 스레드를 띄우면, 어느 시점에는 8개만 진짜 병렬로 동작하고 나머지 92개는 대기한다. 운영체제 스케줄러는 짧은 시간 단위로 어떤 스레드를 어떤 코어에 올릴지 결정한다.

이때 발생하는 비용이 **컨텍스트 스위치 비용**이다. 레지스터 저장·복원, 캐시 무효화, TLB 플러시 같은 부담이 누적된다. 따라서 코어 수보다 훨씬 많은 스레드를 띄우는 것은 거의 항상 손해다.

### 왜 구분이 중요한가

동시성은 **설계 패턴**이고, 병렬성은 **실행 전략**이다.

```cpp
// 동시성: 구조적 분리 (싱글 코어에서도 의미 있음)
void server() {
    while (true) {
        auto conn = accept();          // 연결 대기
        std::thread([conn] {           // 각 연결을 독립 처리
            handle(conn);
        }).detach();
    }
}

// 병렬성: 성능 최적화 (멀티 코어 필수)
std::vector<int> data(1'000'000);
std::for_each(std::execution::par,     // 병렬 실행
              data.begin(), data.end(),
              [](int& x) { x *= 2; });
```

## 1.2 왜 동시성을 쓰는가

### 이유 1: 관심사 분리 (Separation of Concerns)

복잡한 시스템을 독립적인 작업 단위로 나눈다.

![게임 루프 — 단일 스레드 vs 멀티 스레드](/images/blog/cpp-concurrency-in-action/diagrams/ch01-game-loop.svg)

관심사 분리의 핵심은 **응답성(responsiveness)**이다. GUI 애플리케이션에서 파일 다운로드 중에도 UI가 반응하는 것이 대표적인 예다.

### 이유 2: 성능 (Performance)

무어의 법칙이 끝났다. 클럭 속도는 정체되고 코어 수가 늘어난다.

```
CPU 진화 (대략적):
2000: 1 GHz, 1 core    → 단일 스레드 최적화
2005: 3 GHz, 2 cores   → 병렬화 시작
2010: 3 GHz, 4 cores   → 병렬화 필수
2020: 3 GHz, 8+ cores  → 병렬화 기본
2025: 5 GHz, 24+ cores (P+E core 혼합), 서버는 96+ cores 일반
```

**싱글 스레드 성능은 한계에 도달했다.** 성능을 높이려면 코어를 더 쓰는 수밖에 없다.

```cpp
// 싱글 스레드: 1억 개 요소 처리
auto start = std::chrono::high_resolution_clock::now();
for (auto& x : data) { x = heavy_computation(x); }
auto end = std::chrono::high_resolution_clock::now();
// 예: 10초

// 멀티 스레드 (8코어): 이론상 8배 빠름
std::for_each(std::execution::par, data.begin(), data.end(),
              [](auto& x) { x = heavy_computation(x); });
// 예: 1.5초 (오버헤드 포함)
```

### 언제 동시성을 피해야 하는가

동시성은 복잡성을 더한다. 항상 득이 되지 않는다.

| 상황 | 권장 |
|------|------|
| 작업이 충분히 빠르다 | 단일 스레드 유지 |
| I/O 바운드지만 비동기로 해결 가능 | `async/await` 또는 이벤트 루프 |
| 공유 상태가 많다 | 락 비용 > 병렬화 이득 |
| 코드 복잡도가 급격히 증가한다 | 단순함 우선 |

> "Make it work, make it right, make it fast — in that order."

### 동시성을 *쓰지 말아야* 하는 이유 — 책 1.2.3 정리

Williams는 동시성 도입을 만류해야 하는 상황을 두 갈래로 정리한다. **이득이 비용을 능가하지 못하는 경우**와 **복잡성이 위험을 만드는 경우**다.

**이득이 약한 경우.** 스레드 자체에 비용이 있다. 스레드 하나를 띄우는 데에 OS는 스택 메모리를 할당하고(보통 1~8 MB), 커널 구조체를 만들고, 스케줄러에 등록한다. 짧은 작업 하나를 위해 스레드를 띄우면 그 시간보다 *생성 비용이 더 클 수도* 있다.

```cpp
// 예: 작은 작업을 위해 스레드를 띄우는 안티 패턴
for (auto& item : small_collection) {        // 10개짜리 컬렉션
    std::thread t([&item] { item.touch(); }); // 매번 스레드 생성 → 손해
    t.join();
}

// 차라리 단순한 루프가 훨씬 빠르다
for (auto& item : small_collection) {
    item.touch();
}
```

**복잡성이 위험을 만드는 경우.** 동시 코드는 비동시 코드보다 정확성을 입증하기가 어렵다. 데이터 경합, 데드락, 라이브락, 우선순위 역전, ABA 문제 등 새로운 부류의 버그가 등장한다. 더 나아가 이런 버그는 재현하기 어렵다. 책에서는 동시성 도입 전에 다음 질문을 던지길 권한다.

- 이 작업이 정말 충분히 *큰가*? 한 코어로 처리해도 사용자가 기다리지 않는가?
- 이미 비동기 I/O로 응답성 문제를 해결하지 못하는가?
- 공유 데이터를 *없앨* 방법은 없는가? (각 스레드에 데이터 사본을 주는 등)
- 디버깅·테스트·유지보수 비용을 누가 짊어지는가?

세 번째 비용은 자주 간과된다. **너무 많은 스레드를 띄우는 것 자체가 문제**다. 코어 수보다 스레드가 훨씬 많아지면 컨텍스트 스위치 오버헤드와 캐시 효율 저하가 누적되어, 멀티스레드 버전이 단일 스레드보다 *더 느려진다*. 이 현상을 책에서는 "oversubscription"이라 부른다.

## 1.3 C++ 동시성의 역사

### C++11 이전: 표준 없음

C++03까지 표준 스레딩이 없었다. 플랫폼별 API를 직접 사용했다.

```cpp
// POSIX (Linux, macOS)
#include <pthread.h>
pthread_t thread;
pthread_create(&thread, nullptr, thread_func, nullptr);
pthread_join(thread, nullptr);

// Windows
#include <windows.h>
HANDLE thread = CreateThread(nullptr, 0, thread_func, nullptr, 0, nullptr);
WaitForSingleObject(thread, INFINITE);
CloseHandle(thread);
```

문제점:
- **이식성 없음** — 플랫폼마다 다른 코드
- **타입 안전성 없음** — `void*`로 인자 전달
- **RAII 없음** — 수동 리소스 관리

### POSIX threads와 Win32 threads의 시대

C++11 이전에 작성된 멀티스레드 코드 대부분은 두 API 중 하나를 직접 호출했다. **POSIX threads(pthreads)**는 IEEE 1003.1c-1995로 표준화된 인터페이스로, Linux·macOS·BSD·Solaris·AIX 등 유닉스 계열에서 사실상의 표준이었다. **Win32 threads**는 Windows에서 `CreateThread`, `WaitForSingleObject`, `CRITICAL_SECTION`을 중심으로 한 API다.

두 API는 같은 개념을 다른 이름과 다른 시맨틱으로 표현했다.

| 개념 | POSIX threads | Win32 threads |
|------|---------------|---------------|
| 스레드 생성 | `pthread_create` | `CreateThread` / `_beginthreadex` |
| 종료 대기 | `pthread_join` | `WaitForSingleObject` |
| 분리 | `pthread_detach` | `CloseHandle` (자동 정리) |
| 뮤텍스 | `pthread_mutex_t` | `CRITICAL_SECTION` / `HANDLE` |
| 조건 변수 | `pthread_cond_t` | `CONDITION_VARIABLE` (Vista+) |
| 스레드 로컬 | `pthread_key_create` | `TlsAlloc` |

이식 가능한 라이브러리를 만들려면 보통 두 API를 감싸는 추상 계층을 직접 만들어야 했다. **Boost.Thread**가 사실상의 표준 역할을 했고, 이 라이브러리의 설계가 C++11 `<thread>`의 직계 조상이 되었다. C++11 표준 위원회는 Boost.Thread의 인터페이스를 토대로, 람다·이동 시맨틱·`std::function` 같은 C++11의 새로운 도구를 활용해 더 안전한 형태로 다듬었다.

```cpp
// Boost.Thread (C++11 이전, 사실상의 표준)
#include <boost/thread.hpp>
boost::thread t(hello);
t.join();

// C++11 표준 (인터페이스가 거의 동일)
#include <thread>
std::thread t(hello);
t.join();
```

이 계보 덕분에 Boost.Thread를 쓰던 코드는 C++11로의 이주가 비교적 수월했다.

### C++11: 표준 스레딩 도입

C++11은 `<thread>`, `<mutex>`, `<condition_variable>`, `<future>`, `<atomic>`을 표준화했다.

```cpp
#include <thread>
#include <iostream>

void hello() {
    std::cout << "Hello from thread!\n";
}

int main() {
    std::thread t(hello);  // 스레드 생성
    t.join();              // 완료 대기
}
```

핵심 변화:
- **이식성** — 모든 플랫폼에서 동일한 코드
- **타입 안전성** — 템플릿 기반 인터페이스
- **RAII** — `std::thread` 소멸자가 리소스 관리

### std::thread는 OS 스레드의 *얇은 래퍼*다 — JVM·Go와의 대비

`std::thread`가 무엇인지 한 줄로 정리하면 **운영체제가 만든 진짜 OS 스레드를 RAII로 감싼 객체**다. 책 1.5 예제가 짧아 보이지만 그 한 줄에서 OS의 클론 계열 시스템 콜이 호출되고, 커널이 스레드 제어 블록과 스택을 할당하며, 스케줄러 큐에 새 엔트리가 들어간다. C++ 표준 라이브러리는 그 위에 *최소한의 포장*만 얹는다.

이 설계 결정의 의미는 다른 언어와 비교하면 선명해진다.

| 런타임 | 스레드 모델 | 한 스레드의 비용 | 스케줄링 |
|--------|------------|------------------|----------|
| C++ `std::thread` | 1:1 OS 스레드 | 스택 1~8 MB + 커널 구조체 | OS 커널 |
| Java `Thread` (~21 이전) | 1:1 OS 스레드 | 스택 ~1 MB + JVM 메타 | OS 커널 |
| Java `Virtual Thread` (21+) | M:N (Loom) | 수 KB | JVM 사용자 공간 |
| Go `goroutine` | M:N | 시작 2 KB, 동적 확장 | Go 런타임 사용자 공간 |
| Erlang/Elixir process | M:N | 시작 ~338 bytes | BEAM VM |

JVM의 *클래식* `Thread`도 OS 스레드 1:1이므로 C++ `std::thread`와 비용이 비슷하다. 그러나 JVM은 거기서 멈추지 않았다. Java 21에서 도입된 **가상 스레드(Project Loom)**는 JVM이 자체적으로 만든 *경량* 실행 단위로, 수만 개를 동시에 띄울 수 있다. JVM 런타임이 직접 스케줄링하고, I/O 블로킹 시점에 캐리어 OS 스레드를 양보한다.

Go의 **goroutine**은 처음부터 같은 철학으로 설계됐다. `go f()` 한 번이면 2 KB 스택과 함께 새 goroutine이 만들어지고, Go 런타임이 사용자 공간에서 M개의 goroutine을 N개의 OS 스레드 위에 멀티플렉싱한다. *동시에 살아 있는* goroutine이 수십만 개여도 OS는 그것을 모른다. OS 입장에서는 코어 수에 비례하는 *몇 개의* 스레드만 존재할 뿐이다.

C++ `std::thread`는 이런 사용자 공간 스케줄러를 **제공하지 않는다**. 한 `std::thread` = 한 OS 스레드다. 따라서 같은 패턴(`std::thread t(work)` × 10만 번)이 Go에선 자연스럽지만 C++에서는 즉시 시스템을 무너뜨린다.

이 차이의 원인은 *C++이 시스템 언어*이기 때문이다. 런타임을 숨기지 않는다는 원칙이 우선이다. 가상 스레드가 필요하다면 코루틴(C++20), 익젝션 라이브러리(`std::execution`, C++26), 외부 사용자 공간 스케줄러(Boost.Fiber, libco) 중 하나를 명시적으로 골라야 한다. 표준 `<thread>`는 *가장 솔직한* OS 스레드 인터페이스이고, 그 위에 더 비싼 추상화를 올릴지는 사용자의 선택이다.

### C++14 ~ C++26: 지속적 개선

| 표준 | 추가된 기능 |
|------|------------|
| C++14 | `std::shared_timed_mutex` |
| C++17 | `std::shared_mutex`, `std::scoped_lock`, 병렬 알고리즘 |
| C++20 | `std::jthread`, `std::stop_token`, `std::latch`, `std::barrier`, `std::counting_semaphore` |
| C++23 | `std::generator` (코루틴), `std::expected`, monadic 인터페이스 |
| C++26 | `std::hazard_pointer`, `std::rcu`, `std::execution` (sender/receiver) 등 진행 중 |

### std::thread의 효율과 플랫폼 네이티브 비교

표준화로 얻는 이식성에는 약간의 비용이 따른다. `std::thread`는 대부분의 구현에서 플랫폼 네이티브 API를 *얇게 감싼* 래퍼다. 실제 스레드는 여전히 운영체제가 만든다.

| 항목 | std::thread | pthread / Win32 |
|------|-------------|-----------------|
| 스레드 생성 | OS 호출 + 약간의 래퍼 비용 | OS 호출 |
| 인자 전달 | 타입 안전, 복사·이동 자동 처리 | `void*` 캐스팅 수동 |
| 예외 안전 | 표준이 정의 | 직접 구현 |
| 컴파일러 최적화 | 인라인 가능 | 함수 호출 경계 |

Williams는 이 오버헤드를 "직접적인 비용은 거의 무시할 수 있는 수준"이라고 표현한다. 즉, **스레드 생성 자체가 비싼 작업이기 때문에 그 위에 얹힌 래퍼의 비용은 측정 가능한 차이를 만들지 못한다**. 다만 다음 두 가지는 짚어 둘 필요가 있다.

첫째, `std::thread`가 제공하지 않는 저수준 기능에 접근하려면 **`native_handle()`**을 통해 플랫폼 API로 내려가야 한다. 스레드 우선순위, CPU 친화도(affinity), 실시간 스케줄링 정책 같은 것들이 여기 해당한다.

```cpp
#include <thread>
#include <pthread.h>      // POSIX 헤더

void worker() { /* ... */ }

int main() {
    std::thread t(worker);

    // POSIX: 코어 0에 핀(pin)
    cpu_set_t cpuset;
    CPU_ZERO(&cpuset);
    CPU_SET(0, &cpuset);
    pthread_setaffinity_np(t.native_handle(),
                           sizeof(cpu_set_t), &cpuset);

    t.join();
}
```

둘째, **스레드 풀**처럼 매번 새 스레드를 만들지 않는 패턴이 필요할 때 `std::thread`는 부족하다. 이 경우 풀을 직접 구현하거나 `std::async`(8장에서 다룸) 또는 서드파티 풀을 쓴다.

## 1.4 C11 스레드 (C 언어)

C++11과 함께 C11도 표준 스레드 라이브러리를 도입했다. `<threads.h>` 헤더를 통해 플랫폼 독립적인 스레딩을 사용할 수 있다.

### C11 기본 스레드

```c
#include <stdio.h>
#include <threads.h>

int hello(void* arg) {
    (void)arg;
    printf("Hello from C11 thread!\n");
    return 0;
}

int main(void) {
    thrd_t t;

    // 스레드 생성
    if (thrd_create(&t, hello, NULL) != thrd_success) {
        return 1;
    }

    // 스레드 완료 대기
    int result;
    thrd_join(t, &result);

    return 0;
}
```

컴파일:

```bash
# GCC (Linux)
gcc -std=c11 -pthread hello.c -o hello

# Clang
clang -std=c11 -pthread hello.c -o hello
```

### C11 vs C++11 비교

| 기능 | C11 | C++11 |
|------|-----|-------|
| 스레드 생성 | `thrd_create(&t, func, arg)` | `std::thread t(func, args...)` |
| 대기 | `thrd_join(t, &result)` | `t.join()` |
| 분리 | `thrd_detach(t)` | `t.detach()` |
| 뮤텍스 | `mtx_t`, `mtx_lock()` | `std::mutex`, `.lock()` |
| 조건 변수 | `cnd_t`, `cnd_wait()` | `std::condition_variable` |
| 원자 연산 | `<stdatomic.h>` | `<atomic>` |

### C11 인자 전달

```c
#include <stdio.h>
#include <threads.h>
#include <stdlib.h>

typedef struct {
    int id;
    const char* message;
} ThreadArgs;

int worker(void* arg) {
    ThreadArgs* args = (ThreadArgs*)arg;
    printf("Thread %d: %s\n", args->id, args->message);
    return args->id;
}

int main(void) {
    ThreadArgs args = {42, "Hello!"};
    thrd_t t;

    thrd_create(&t, worker, &args);

    int result;
    thrd_join(t, &result);
    printf("Thread returned: %d\n", result);

    return 0;
}
```

### C11 스레드 로컬 저장소

```c
#include <stdio.h>
#include <threads.h>

// 스레드 로컬 변수
thread_local int tls_value = 0;

int worker(void* arg) {
    int id = *(int*)arg;
    tls_value = id * 100;
    printf("Thread %d: tls_value = %d\n", id, tls_value);
    return 0;
}

int main(void) {
    thrd_t t1, t2;
    int id1 = 1, id2 = 2;

    thrd_create(&t1, worker, &id1);
    thrd_create(&t2, worker, &id2);

    thrd_join(t1, NULL);
    thrd_join(t2, NULL);

    printf("Main: tls_value = %d\n", tls_value);  // 0 (각 스레드 독립)
    return 0;
}
```

> **참고:** C11 `<threads.h>`는 일부 플랫폼에서 지원이 제한적이다. Linux glibc 2.28+, macOS는 미지원(POSIX pthread 사용). 이식성이 필요하면 C++11 또는 POSIX pthread를 권장한다.

## 1.5 첫 번째 스레드: Hello, Concurrent World!

### 가장 간단한 예제

```cpp
#include <iostream>
#include <thread>

void hello() {
    std::cout << "Hello, Concurrent World!\n";
}

int main() {
    std::thread t(hello);  // 1. 스레드 생성, hello() 실행 시작
    t.join();              // 2. 스레드 완료까지 대기
    return 0;              // 3. 프로그램 종료
}
```

### Listing 1.1 한 줄씩 — 무슨 일이 벌어지는가

책의 첫 예제는 다섯 줄짜리 짧은 코드지만, 그 안에서 일어나는 일은 단순한 `printf`보다 훨씬 많다.

```cpp
#include <iostream>   // (1) 표준 출력 — main 스레드도, 새 스레드도 사용
#include <thread>     // (2) std::thread, std::this_thread 네임스페이스

void hello() {        // (3) 새 스레드의 진입 함수
    std::cout << "Hello, Concurrent World!\n";
}

int main() {
    std::thread t(hello);  // (4) 여기서 OS가 새 스레드를 만든다
    t.join();              // (5) main이 t의 종료를 기다린다
    return 0;              // (6) main 스레드도 종료
}
```

**(4) `std::thread t(hello);`** 이 한 줄이 가장 중요하다. 생성자가 호출되는 순간 OS는 다음 작업을 한다.

1. 새 스레드를 위한 스택을 할당한다(보통 1~8 MB의 가상 메모리).
2. 스레드 제어 블록(TCB)을 만들고 스케줄러에 등록한다.
3. 시작 함수의 주소(`hello`)와 인자를 새 스레드의 진입점에 연결한다.
4. 새 스레드를 실행 가능(runnable) 상태로 표시한다.

이 시점부터 **두 개의 실행 흐름**이 존재한다. 하나는 `main`이고 다른 하나는 `hello`다. 둘이 출력을 동시에 시도하면 출력이 섞일 수 있지만, 여기서는 `main`이 곧장 `join()`을 호출해 새 스레드가 끝날 때까지 기다리므로 안전하다.

**(5) `t.join();`** `main` 스레드는 여기서 멈춘다. `hello` 스레드가 `return`으로 종료하면 그제서야 `join`이 반환된다. 이 동기화가 없으면 `main`이 먼저 끝나 `std::thread` 소멸자가 호출되고, 아직 살아 있는(joinable) 스레드를 만나면 `std::terminate()`가 발동한다.

**(6) `return 0;`** `main`의 반환은 곧 프로세스 종료다. 이 시점에는 `t` 객체가 더 이상 joinable이 아니므로 소멸자가 조용히 정리된다.

### 컴파일 — 주요 컴파일러별 명령

책에서는 컴파일러마다 약간씩 다른 명령을 권한다. 핵심은 **스레딩 라이브러리를 링크에 포함**시키는 것이다.

**GCC (Linux)**

```bash
# C++17 이상 + pthread 링크
g++ -std=c++17 -pthread hello.cpp -o hello

# C++20 / C++23 사용 시
g++ -std=c++20 -pthread hello.cpp -o hello
g++ -std=c++23 -pthread hello.cpp -o hello

# 최적화 + 경고
g++ -std=c++17 -O2 -Wall -Wextra -pthread hello.cpp -o hello
```

`-pthread` 플래그는 두 가지 일을 한다. 전처리 단계에서 `_REENTRANT`를 정의하고, 링커에 `-lpthread`를 자동으로 추가한다. `-lpthread`만 쓰면 전처리 매크로가 빠지므로 `-pthread`가 더 안전하다.

**Clang (Linux / macOS)**

```bash
# Linux
clang++ -std=c++17 -pthread hello.cpp -o hello

# macOS — libc++ 사용
clang++ -std=c++17 -stdlib=libc++ hello.cpp -o hello

# Apple Silicon에서 명시적 아키텍처 지정 시
clang++ -std=c++17 -arch arm64 hello.cpp -o hello
```

macOS의 Apple Clang은 시스템 pthread를 기본으로 링크하므로 `-pthread`를 꼭 붙이지 않아도 동작하지만, 이식성을 위해 붙이는 편이 낫다.

**MSVC (Windows)**

```bash
# 명령 프롬프트 (개발자 환경)
cl /std:c++17 /EHsc hello.cpp

# C++20 / C++23
cl /std:c++20 /EHsc hello.cpp
cl /std:c++latest /EHsc hello.cpp

# 최적화
cl /std:c++17 /EHsc /O2 /W4 hello.cpp
```

MSVC는 별도의 스레딩 플래그가 필요 없다. 표준 라이브러리가 Win32 threads를 내부적으로 사용하며, `/EHsc`는 표준 C++ 예외 처리를 켜는 옵션이다.

**CMake로 이식성 있게**

플랫폼별 차이를 매번 외우기 번거롭다면 CMake가 그 일을 대신 해 준다.

```cmake
cmake_minimum_required(VERSION 3.15)
project(hello_concurrent CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 플랫폼에 맞는 스레드 라이브러리 자동 탐색
find_package(Threads REQUIRED)

add_executable(hello hello.cpp)
target_link_libraries(hello PRIVATE Threads::Threads)
```

`Threads::Threads` 타깃이 GCC/Clang에서는 `-pthread`로, MSVC에서는 아무것도 추가하지 않는 형태로 자동 해석된다.

### 실행 흐름

![main 스레드와 새 스레드의 생성·실행·join 흐름](/images/blog/cpp-concurrency-in-action/diagrams/ch01-thread-creation.svg)

### join vs detach

스레드를 생성하면 반드시 `join()` 또는 `detach()` 중 하나를 호출해야 한다.

```cpp
std::thread t(hello);

// 선택 1: join — 완료까지 대기
t.join();   // 블로킹. t가 끝날 때까지 여기서 멈춤.

// 선택 2: detach — 분리
t.detach(); // 논블로킹. t는 백그라운드에서 계속 실행.
            // main이 먼저 끝나면 t도 강제 종료될 수 있음!
```

**`std::thread` 소멸자는 joinable 상태에서 호출되면 `std::terminate()`를 호출한다.** 이것이 C++의 명시적 설계다 — 프로그래머가 스레드의 수명을 결정하도록 강제한다.

```cpp
void dangerous() {
    std::thread t(hello);
    // join()도 detach()도 안 함
}   // 💥 std::terminate() 호출!

void safe() {
    std::thread t(hello);
    t.join();  // 또는 t.detach()
}   // ✓ 정상 종료
```

### 람다로 스레드 시작

함수 포인터 대신 람다를 쓰면 더 간결하다.

```cpp
#include <iostream>
#include <thread>

int main() {
    std::thread t([] {
        std::cout << "Hello from lambda!\n";
    });
    t.join();
}
```

캡처를 활용하면 데이터도 전달할 수 있다.

```cpp
int value = 42;
std::thread t([value] {              // 값 캡처
    std::cout << "Value: " << value << "\n";
});
t.join();

std::thread t2([&value] {            // 참조 캡처 (주의!)
    value = 100;                     // 원본 수정
});
t2.join();
// value == 100
```

> **주의:** 참조 캡처 시 스레드가 실행되는 동안 원본이 살아 있어야 한다. 지역 변수를 참조 캡처하고 `detach()`하면 댕글링 참조가 된다.

## 1.6 스레드 인자 전달

### 기본 인자 전달

`std::thread` 생성자는 가변 인자를 받는다.

```cpp
void greet(const std::string& name, int times) {
    for (int i = 0; i < times; ++i) {
        std::cout << "Hello, " << name << "!\n";
    }
}

int main() {
    std::thread t(greet, "World", 3);  // greet("World", 3) 호출
    t.join();
}
```

### 참조 전달의 함정

기본적으로 인자는 **복사**된다. 참조로 전달하려면 `std::ref`를 써야 한다.

```cpp
void increment(int& x) {
    ++x;
}

int main() {
    int value = 0;

    // std::thread t(increment, value);  // ❌ 복사됨, 원본 불변
    std::thread t(increment, std::ref(value));  // ✓ 참조 전달
    t.join();

    std::cout << value << "\n";  // 1
}
```

왜 이런 설계인가? **안전성**이다. 암묵적 참조 전달은 댕글링 참조의 원인이 된다. 명시적으로 `std::ref`를 쓰면 "이 참조가 유효함을 내가 보장한다"는 의도가 드러난다.

### move 전달

이동 전용 타입(`std::unique_ptr` 등)은 `std::move`로 전달한다.

```cpp
void process(std::unique_ptr<int> ptr) {
    std::cout << *ptr << "\n";
}

int main() {
    auto ptr = std::make_unique<int>(42);
    std::thread t(process, std::move(ptr));  // 소유권 이전
    t.join();
    // ptr은 이제 nullptr
}
```

## 1.7 예외 안전성

### 문제: join 전에 예외 발생

```cpp
void risky() {
    std::thread t(some_work);

    do_something_that_might_throw();  // 💥 예외 발생!

    t.join();  // 여기 도달 못함 → std::terminate()
}
```

### 해결: RAII thread guard

```cpp
class thread_guard {
    std::thread& t_;
public:
    explicit thread_guard(std::thread& t) : t_(t) {}
    ~thread_guard() {
        if (t_.joinable()) {
            t_.join();
        }
    }
    thread_guard(const thread_guard&) = delete;
    thread_guard& operator=(const thread_guard&) = delete;
};

void safe() {
    std::thread t(some_work);
    thread_guard g(t);              // RAII

    do_something_that_might_throw();  // 예외 발생해도
    // g 소멸자에서 t.join() 호출 → 안전
}
```

### C++20 해결: std::jthread

C++20의 `std::jthread`는 소멸자에서 자동으로 join한다.

```cpp
#include <thread>

void modern() {
    std::jthread t(some_work);  // j = joining

    do_something_that_might_throw();
    // 예외 발생해도 t 소멸자에서 자동 join
}
```

`std::jthread`는 또한 `std::stop_token`을 통한 협력적 취소를 지원한다. 이는 9장에서 다룬다.

## 1.8 스레드 식별

### std::thread::id

각 스레드는 고유한 ID를 갖는다.

```cpp
#include <iostream>
#include <thread>

int main() {
    std::cout << "Main thread ID: "
              << std::this_thread::get_id() << "\n";

    std::thread t([] {
        std::cout << "Worker thread ID: "
                  << std::this_thread::get_id() << "\n";
    });

    std::cout << "t's ID from main: " << t.get_id() << "\n";
    t.join();
}
```

출력 예:

```
Main thread ID: 140735987623744
t's ID from main: 140735987619648
Worker thread ID: 140735987619648
```

### hardware_concurrency

시스템이 지원하는 동시 스레드 수를 알려준다.

```cpp
unsigned int n = std::thread::hardware_concurrency();
std::cout << "Hardware threads: " << n << "\n";
// 예: 8 (4코어 하이퍼스레딩)
```

이 값은 **힌트**다. 0을 반환할 수도 있다. 스레드 풀 크기 결정 시 참고하되, 맹신하지 않는다.

## 시스템 사례 — 실제 소프트웨어가 동시성을 쓰는 방식

이론을 마치기 전에 *현장의 큰 시스템들*이 동시성과 병렬성을 어떻게 조합하는지 본다. 같은 문제에 대한 *다른 답*들이 있다는 사실을 알면, 다음 장부터 다룰 `std::thread`·뮤텍스·원자 연산이 어느 자리에 놓이는지 가늠하기 쉽다.

### Chrome의 multi-process 아키텍처

Chrome은 *스레드가 아니라 프로세스*를 먼저 쓴다. 탭 하나가 새로 열리면 **렌더러 프로세스** 하나가 새로 만들어진다. 그 안에서야 비로소 스레드가 등장한다.

```text
Chrome 프로세스 구조 (대략):
Browser Process (UI, 네트워크 정책, 탭 관리)
├── GPU Process (한 개, GPU 명령 직렬화)
├── Network Service Process
├── Renderer Process #1 (탭 1: gmail.com)
│   ├── Main thread (V8 JS, DOM, 레이아웃)
│   ├── Compositor thread
│   ├── Worker threads (Web Worker, ServiceWorker)
│   └── IO thread
├── Renderer Process #2 (탭 2: youtube.com)
└── Renderer Process #3 (탭 3: news.ycombinator.com)
```

탭마다 프로세스를 분리하는 이유는 **격리(isolation)**다. 한 탭에서 V8 엔진이 크래시해도 나머지 탭은 살아남는다. Site Isolation 기능 도입 이후엔 *사이트 단위*로 프로세스를 나눠 Spectre 같은 사이드 채널 공격까지 막는다. 한 프로세스 안에서는 다시 OS 스레드 여러 개가 동시에 동작한다. 메인 스레드는 JavaScript·DOM·레이아웃을, 컴포지터 스레드는 GPU 명령 생성을, 워커 스레드들은 백그라운드 작업을 맡는다.

이 구조의 비용은 IPC(Inter-Process Communication)다. 프로세스 간 메모리는 공유되지 않으므로 모든 통신이 직렬화·역직렬화를 거친다. 그래서 Chrome은 IPC를 최소화하는 방향(예: 합성 단계의 결과를 GPU 프로세스로 직접 전송)으로 끝없이 최적화한다.

### MySQL InnoDB의 스레드 풀

MySQL의 InnoDB 스토리지 엔진은 *목적별 스레드 풀*을 운영한다. 모든 일을 하나의 풀에 던지지 않고, 작업 성격에 따라 풀을 분리한다.

| 스레드 그룹 | 역할 | 기본 개수 |
|------------|------|-----------|
| `srv_master_thread` | 백그라운드 메인 루프 (체크포인트 트리거 등) | 1 |
| `io_read_threads` | 읽기 비동기 I/O | `innodb_read_io_threads` (기본 4) |
| `io_write_threads` | 쓰기 비동기 I/O | `innodb_write_io_threads` (기본 4) |
| `purge_threads` | undo 레코드 정리 | `innodb_purge_threads` (기본 4) |
| `page_cleaner_threads` | 더티 페이지 디스크 플러시 | `innodb_page_cleaners` (기본 4) |
| user threads | SQL 쿼리 실행 | 연결 수에 비례 |

핵심은 *모든 풀이 동시에 동작*하면서도 같은 자원(버퍼 풀, redo log, undo log)을 공유한다는 점이다. 공유 자원 보호를 위해 InnoDB는 자체 mutex(`os_event_t` 기반)와 read-write lock을 운영하며, *행 단위 잠금(row-level lock)*까지 내려가 동시성을 극대화한다. 같은 테이블의 *다른 행*을 다른 트랜잭션이 동시에 수정할 수 있다.

이 정도 수준의 동시 제어는 `std::mutex`만으로는 부족하다. 3장에서 다룰 `std::shared_mutex`, 5장의 원자 연산, 6~7장의 lock-free 자료구조까지 모두 동원돼야 비슷한 구조를 만들 수 있다.

### Nginx의 event loop + worker

Nginx는 *완전히 다른 답*을 택했다. 스레드를 거의 쓰지 않는다.

```text
Nginx 프로세스 구조:
master process (설정 로드, worker 관리)
└── worker process #1 (단일 스레드, event loop)
    └── epoll_wait → 수만 개의 active 커넥션을 비동기 처리
└── worker process #2 (코어 수만큼)
└── worker process #N
```

각 worker는 *단일 스레드 + epoll/kqueue 기반 이벤트 루프*다. C10K 문제(만 개의 동시 커넥션)를 풀기 위한 고전적 답이다. 한 worker가 한 커넥션을 점유하는 게 아니라, 한 worker가 *수천~수만 개의 커넥션을 번갈아* 처리한다. 각 커넥션은 ready 상태(데이터 도착, 쓰기 가능)일 때만 worker의 주목을 받는다.

Nginx에도 *예외적으로* 스레드 풀이 있다. 디스크 읽기처럼 *진짜로 블로킹*되는 작업(예: `sendfile`로 처리 안 되는 큰 파일의 random read)은 별도 스레드 풀로 오프로드한다. 이벤트 루프를 막지 않기 위한 안전 장치다.

세 시스템의 답을 한 표로 비교한다.

| 시스템 | 1차 동시성 단위 | 2차 동시성 단위 | 동기화 |
|--------|-----------------|-----------------|--------|
| Chrome | 프로세스 (탭별) | 스레드 (프로세스 내) | IPC (mojo) |
| MySQL InnoDB | 스레드 풀 (목적별) | row-level lock | 자체 mutex, atomic |
| Nginx | 프로세스 (worker별) | 이벤트 루프 | (대부분 락 없음) |

같은 도구 상자(`std::thread`, `std::mutex`, `std::atomic`)로 이렇게 다른 아키텍처를 짤 수 있다는 점이 중요하다. 책의 나머지 장은 그 도구 상자의 *각 도구*를 자세히 다룬다. 시스템 아키텍처의 큰 그림은 17~18장에 다시 등장한다.

## 정리

- **동시성**은 구조, **병렬성**은 실행이다
- 동시성의 두 이유: **관심사 분리**(응답성)와 **성능**(멀티코어 활용)
- C++11 이전에는 표준 스레딩이 없었다. POSIX/Windows API를 직접 사용했다
- `std::thread`로 스레드를 생성하고, 반드시 `join()` 또는 `detach()`를 호출해야 한다
- 인자는 기본적으로 **복사**된다. 참조 전달은 `std::ref`, 이동은 `std::move`
- 예외 안전성을 위해 RAII 패턴 또는 C++20 `std::jthread`를 사용한다

## 한국 개발자의 함정

```
1. *thread 만들고 join 잊음*
   - std::thread 소멸자 → std::terminate (즉시 abort)
   - 반드시 join() 또는 detach() 명시
   - C++20 std::jthread는 자동 join

2. *detach()가 안전한 선택*
   - detach 후 메인이 끝나면 스레드 강제 종료
   - 댕글링 참조 위험 (스택 변수 캡처)
   - join이 거의 항상 더 안전

3. *참조 전달이 자동*이라는 오해
   - std::thread는 인자를 *복사*
   - 참조 필요 시 std::ref(x) 명시
   - 안전성을 위한 명시적 설계

4. *hardware_concurrency() = 정확한 코어 수*
   - 단지 *힌트* (0 반환 가능)
   - 하이퍼스레딩 포함 (논리 코어)
   - 컨테이너 / VM에선 호스트 값일 수도

5. *동시성 = 성능 향상*
   - 작업이 충분히 짧으면 오버헤드 > 이득
   - I/O 바운드는 async/await가 더 적합
   - 측정 없이 도입 금지
```

## 실무 적용

```
이론 → 실무:
- std::thread          → POSIX pthread, Win32 CreateThread
- std::jthread (C++20) → 자동 join + stop_token
- std::ref             → std::reference_wrapper
- thread_local         → __thread (gcc), TLS

언어별:
- C++: std::thread, std::jthread, std::async
- Java: Thread, Runnable, ExecutorService
- Rust: std::thread::spawn (JoinHandle 반환)
- Go: goroutine + channel
- Python: threading.Thread (GIL 한계 있음)

설계 원칙:
- 짧은 작업 → std::async / thread pool
- 긴 작업 / 백그라운드 → std::jthread
- 매우 짧은 동시 / 비동기 I/O → coroutine (C++20)
```

## 자기 점검

```
□ 동시성과 병렬성의 차이?
□ join과 detach 선택 기준?
□ std::ref가 필요한 이유?
□ std::jthread의 자동 join 메커니즘?
□ hardware_concurrency()를 *신뢰*하면 안 되는 이유?
□ 동시성을 *피해야* 하는 시나리오?
```

## 다음 장 예고

다음 장에서는 스레드의 생애 주기를 더 깊이 다룬다. `join`과 `detach`의 선택 기준, 스레드에 인자를 전달하는 다양한 방법, 그리고 C++20의 `std::jthread`와 `std::stop_token`을 살펴본다.

## 관련 항목

- [Ch 2: Managing Threads](/blog/parallel/cpp-concurrency-in-action/chapter02-managing-threads)
- [AMP Ch 1: Introduction](/blog/parallel/parallel-principles/ch01-introduction) — 동시성 이론적 토대
