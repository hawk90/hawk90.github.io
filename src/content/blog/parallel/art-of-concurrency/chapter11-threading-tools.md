---
title: "Ch 11: Threading Tools"
date: 2025-05-20T11:00:00
description: "동시성 디버깅과 프로파일링 도구 — 레이스 탐지, 성능 분석"
series: "The Art of Concurrency"
seriesOrder: 11
tags: [concurrency, debugging, profiling, race-detection, tools]
draft: true
type: book-review
bookTitle: "The Art of Concurrency"
bookAuthor: "Clay Breshears"
---

## 동시성 디버깅의 어려움

**동시성 버그는 재현이 어렵다**. 비결정성과 타이밍 의존성 때문.

```
동시성 버그의 특징:

1. 비결정성:
   - 매번 다른 실행 순서
   - 같은 입력, 다른 결과

2. 하이젠버그 (Heisenbug):
   - 관찰하면 사라짐
   - 디버거 붙이면 타이밍 변경
   - printf 추가하면 동작 변경

3. 타이밍 의존:
   - 특정 부하에서만 발생
   - 특정 하드웨어에서만 발생
   - 릴리즈 빌드에서만 발생
```

**버그 유형**:

| 유형 | 증상 | 원인 |
|------|------|------|
| 데이터 레이스 | 잘못된 결과 | 동기화 누락 |
| 데드락 | 프로그램 멈춤 | 순환 대기 |
| 라이브락 | CPU 100%, 진행 없음 | 충돌 반복 |
| 기아 | 특정 스레드 느림 | 불공정 스케줄링 |

---

## 레이스 컨디션 탐지

### 정적 분석

**코드를 실행하지 않고 분석**.

```
정적 분석 도구:
- Clang Thread Safety Analysis
- Coverity
- PVS-Studio
- Cppcheck (제한적)

원리:
1. 락 주석 검사
2. 데이터 흐름 분석
3. 패턴 매칭
```

```
Clang Thread Safety Annotations:

// 락으로 보호됨을 명시
class Counter {
    std::mutex mtx;
    int value GUARDED_BY(mtx);

public:
    int get() {
        std::lock_guard<std::mutex> lock(mtx);
        return value;  // OK
    }

    void unsafe_get() {
        return value;  // 경고: mtx 없이 접근
    }
};

컴파일:
clang++ -Wthread-safety -std=c++17 counter.cpp
```

**장단점**:

| 장점 | 단점 |
|------|------|
| 빠름 | 모든 레이스 탐지 불가 |
| 실행 불필요 | 주석 필요 |
| 100% 경로 커버리지 | 오탐 (False positive) 많음 |

### 동적 분석

**실행 중 메모리 접근 모니터링**.

```
동적 분석 도구:
- ThreadSanitizer (TSan)
- Helgrind (Valgrind)
- Intel Inspector

원리:
1. 모든 메모리 접근 기록
2. Happens-before 관계 추적
3. 충돌 접근 탐지
```

```
ThreadSanitizer 사용:

// 컴파일
g++ -fsanitize=thread -g program.cpp -o program

// 또는
clang++ -fsanitize=thread -g program.cpp -o program

// 실행
./program

출력 예:
WARNING: ThreadSanitizer: data race (pid=1234)
  Write of size 4 at 0x7f... by thread T1:
    #0 increment() race.cpp:10
    #1 thread_func() race.cpp:20

  Previous read of size 4 at 0x7f... by thread T2:
    #0 get_value() race.cpp:15
    #1 thread_func2() race.cpp:25

  Location is global 'counter' of size 4 at 0x7f...
```

**TSan의 동작 원리**:

```
Shadow Memory:
각 8바이트 메모리에 대해 shadow 상태 유지

Shadow 정보:
- 마지막 접근 스레드
- 접근 유형 (읽기/쓰기)
- 벡터 클럭 (happens-before 추적)

메모리 접근 시:
1. Shadow 확인
2. 이전 접근과 비교
3. 충돌 시 (다른 스레드, 하나는 쓰기, happens-before 없음) 보고
```

**오버헤드**:

| 도구 | 속도 | 메모리 |
|------|------|--------|
| TSan | 5-15× 느림 | 5-10× 증가 |
| Helgrind | 20-100× 느림 | 10× 증가 |
| Inspector | 10-50× 느림 | 10× 증가 |

### Happens-before 분석

**동시성 정확성의 이론적 기초**.

```
Happens-before 관계 (HB):
A happens-before B (A → B)는 다음 중 하나:

1. 프로그램 순서:
   같은 스레드에서 A가 B보다 먼저

2. 동기화 순서:
   - A가 락 해제, B가 같은 락 획득
   - A가 신호, B가 같은 조건 변수 대기 후 깨어남
   - A가 스레드 생성, B가 그 스레드의 첫 명령
   - A가 스레드 마지막 명령, B가 그 스레드 조인

3. 전이:
   A → B이고 B → C이면 A → C
```

```
예:

Thread 1:           Thread 2:
x = 1;        (A)
mtx.unlock(); (B)
                    mtx.lock();   (C)
                    y = x;        (D)

Happens-before:
A → B (프로그램 순서)
B → C (동기화)
C → D (프로그램 순서)
따라서 A → D (전이)

→ D가 x를 읽을 때 A의 쓰기를 봄이 보장
```

```
데이터 레이스 정의:
두 메모리 접근이 레이스 ⟺
1. 같은 위치
2. 최소 하나는 쓰기
3. happens-before 관계 없음
```

---

## 데드락 탐지

**데드락 조건 감지 및 회피**.

```
데드락 4조건:
1. 상호 배제
2. 점유 대기
3. 비선점
4. 순환 대기

도구의 탐지 방법:
- 락 순서 그래프 구축
- 사이클 탐지
- 잠재적 데드락 보고
```

```
Helgrind 데드락 탐지:

// 잠재적 데드락 코드
void thread1() {
    lock(A);
    lock(B);  // A 보유하고 B 요청
    unlock(B);
    unlock(A);
}

void thread2() {
    lock(B);
    lock(A);  // B 보유하고 A 요청
    unlock(A);
    unlock(B);
}

Helgrind 출력:
Thread #1: lock order "A before B" established
  at 0x...: pthread_mutex_lock (...)
  by 0x...: thread1() (deadlock.cpp:5)

Thread #2: lock order "B before A" established
  (potential deadlock with "A before B")
  at 0x...: pthread_mutex_lock (...)
  by 0x...: thread2() (deadlock.cpp:12)
```

```
락 순서 시각화:

관찰된 락 순서:
Thread 1: A → B
Thread 2: B → A

그래프:
A ──→ B
↑     │
└─────┘

사이클 발견! → 잠재적 데드락
```

---

## 성능 프로파일링

### 스레드 활용률

**스레드가 실제로 일하는 시간 측정**.

```
스레드 상태:
- Running: CPU에서 실행 중
- Runnable: 실행 대기
- Blocked: 락/IO/조건 대기
- Idle: 작업 없음

활용률 = Running 시간 / 전체 시간
```

```
Linux perf 사용:

# 스레드별 CPU 사용
perf stat -e cpu-clock --per-thread ./program

# 호출 그래프
perf record -g ./program
perf report

# 플레임 그래프
perf script | stackcollapse-perf.pl | flamegraph.pl > flame.svg
```

```
활용률 분석:

이상적:
Thread 0: ████████████████████ 100%
Thread 1: ████████████████████ 100%
Thread 2: ████████████████████ 100%
Thread 3: ████████████████████ 100%

문제 있는 패턴:
Thread 0: ████████████████████ 100%
Thread 1: ████████░░░░░░░░░░░░  40%  ← 불균형
Thread 2: ██████░░░░░░░░░░░░░░  30%
Thread 3: ████░░░░░░░░░░░░░░░░  20%

원인: 부하 불균형, 동기화 대기
```

### 동기화 오버헤드

**락 경합과 대기 시간 측정**.

```
측정 지표:
- 락 획득 시도 횟수
- 락 대기 시간
- 경합 (contention) 비율
- 스핀 횟수
```

```
Intel VTune 락 분석:

Lock & Waits 분석 결과:
┌─────────────────────────────────────────────────┐
│ Object          Wait Time   Contention   Count  │
├─────────────────────────────────────────────────┤
│ global_mutex    2.5s        85%          15000  │
│ queue_lock      0.8s        45%          8000   │
│ cache_mutex     0.2s        12%          3000   │
└─────────────────────────────────────────────────┘

해석:
- global_mutex가 병목
- 85% 경합 → 심각한 직렬화
- 대안 필요 (락 분할, 락프리 등)
```

```
경합 줄이기 전략:

1. 락 분할:
   global_mutex → shard_mutex[hash(key) % N]

2. 읽기-쓰기 락:
   mutex → shared_mutex (읽기 많을 때)

3. 락프리 자료구조:
   락 기반 큐 → 락프리 큐

4. 락 범위 축소:
   lock { 계산 + 업데이트 } → 계산; lock { 업데이트 }
```

### 캐시 효과

**False sharing과 캐시 미스 분석**.

```
False Sharing:
다른 데이터인데 같은 캐시 라인에 있어 불필요한 무효화

캐시 라인 (64바이트):
┌────────────────────────────────────────┐
│ counter[0] │ counter[1] │ counter[2] │ ... │
└────────────────────────────────────────┘
   Thread 0     Thread 1     Thread 2

Thread 0이 counter[0] 수정 →
Thread 1, 2의 캐시 라인 무효화 →
불필요한 캐시 미스
```

```
perf로 캐시 미스 측정:

perf stat -e L1-dcache-load-misses,LLC-load-misses ./program

출력:
Performance counter stats:
   1,234,567  L1-dcache-load-misses
     456,789  LLC-load-misses

False sharing 의심 시:
perf c2c record ./program
perf c2c report

Shared Data Cache Line 분석
```

```
False Sharing 해결:

패딩 추가:
struct PaddedCounter {
    alignas(64) int counter;  // 캐시 라인 정렬
    char padding[64 - sizeof(int)];
};

PaddedCounter counters[NUM_THREADS];

또는 C++17:
struct alignas(std::hardware_destructive_interference_size) Counter {
    int value;
};
```

---

## Intel VTune Profiler

**가장 강력한 스레딩 성능 분석 도구**.

### 분석 유형

```
VTune 분석 모드:

1. Hotspots (핫스팟):
   - CPU 시간 소비 함수 식별
   - 콜 스택 분석
   - 최적화 우선순위 결정

2. Threading (스레딩):
   - 스레드 동시성 분석
   - 락 경합 탐지
   - 부하 불균형 식별

3. Memory Access (메모리):
   - 캐시 미스 분석
   - NUMA 효과
   - 대역폭 병목

4. Microarchitecture:
   - CPU 파이프라인 분석
   - 분기 예측 실패
   - 명령어 수준 병목
```

### Hotspots 분석

```
실행:
vtune -collect hotspots ./program

또는 GUI:
1. New Project → Analysis Type: Hotspots
2. Run 클릭
3. Summary → Bottom-up 탭 확인

결과 해석:
┌────────────────────────────────────────────────────┐
│ Function           CPU Time   %      Module       │
├────────────────────────────────────────────────────┤
│ process_item       45.2s     62.3%   program      │
│ hash_lookup        12.8s     17.6%   program      │
│ malloc             8.5s      11.7%   libc         │
│ pthread_mutex_lock 4.2s       5.8%   libpthread   │
└────────────────────────────────────────────────────┘

해석:
- process_item이 62% 차지 → 최적화 1순위
- pthread_mutex_lock 5.8% → 락 경합 의심
```

### Threading 분석

```
실행:
vtune -collect threading ./program

핵심 지표:
- Effective CPU Utilization: 스레드가 실제 일한 비율
- Spin Time: 스핀락 대기 시간
- Wait Time: 블로킹 대기 시간
- Overhead Time: 스레드 생성/조인 비용
```

```
Threading 분석 결과:

Effective CPU Utilization: 45%  ← 문제! (목표: 80%+)

┌──────────────────────────────────────────────────┐
│ Metric                Value      Ideal          │
├──────────────────────────────────────────────────┤
│ Elapsed Time          120s       -              │
│ CPU Time              216s       -              │
│ Effective Time        97s        216s           │
│ Spin Time             68s        0s    ← 문제   │
│ Overhead Time         51s        0s    ← 문제   │
└──────────────────────────────────────────────────┘

Spin Time 68s → 락 경합 심각
Overhead Time 51s → 스레드 생성/소멸 과다
```

```
Timeline 뷰:

시간 →
Core 0: ████░░░░████████░░████████░░░░████
Core 1: ░░░░████████░░░░████░░░░████████░░
Core 2: ████████░░░░░░░░████████████░░░░░░
Core 3: ░░░░░░░░████████░░░░░░░░░░████████

█ = 실행 (녹색)
░ = 대기 (빨강/노랑)

패턴 분석:
- 수직 빨강 줄 → 모든 스레드 대기 = 직렬화 지점
- 연속 노랑 → 특정 스레드 기아
- 짧은 녹색 조각 → 오버헤드 과다
```

### Lock Analysis

```
Lock & Waits 상세 분석:

vtune -collect threading -knob enable-locks=true ./program

결과:
┌─────────────────────────────────────────────────────────┐
│ Sync Object      Wait Time  Contention  Wait Count     │
├─────────────────────────────────────────────────────────┤
│ work_queue_mtx   25.3s      89%         1,234,567      │
│ result_map_mtx   8.7s       67%         456,789        │
│ log_mutex        2.1s       23%         89,012         │
└─────────────────────────────────────────────────────────┘

work_queue_mtx 분석:
- 89% 경합 → 거의 직렬화됨
- 1.2M 대기 → 초당 ~10K 대기
- 해결: 락프리 큐 또는 샤딩
```

### 워크플로우

```
VTune 최적화 사이클:

1. Baseline 측정:
   vtune -collect hotspots ./program
   → CPU 시간 분포 확인

2. Threading 분석:
   vtune -collect threading ./program
   → 병렬 효율성 확인

3. 병목 식별:
   - Hotspots: 어디서 시간 소비?
   - Threading: 왜 병렬성 낮은가?
   - Locks: 어떤 락이 병목?

4. 최적화 적용:
   - 알고리즘 개선
   - 락 최소화
   - 데이터 구조 변경

5. 재측정 & 비교:
   vtune -report summary -r result_before -r result_after
   → 개선 효과 정량화

반복...
```

### CLI 명령어

```
수집:
vtune -collect hotspots ./program
vtune -collect threading ./program
vtune -collect memory-access ./program
vtune -collect uarch-exploration ./program

결과 디렉토리 지정:
vtune -collect threading -r my_result ./program

보고서 생성:
vtune -report summary -r my_result
vtune -report hotspots -r my_result
vtune -report top-down -r my_result

비교:
vtune -report summary -r baseline -r optimized

GUI 열기:
vtune-gui my_result
```

---

## 시각화 도구

**복잡한 동시성 동작을 시각적으로 이해**.

```
타임라인 뷰:

시간 →
Thread 0: ████▒▒▒▒████████▒▒████
Thread 1: ▒▒▒▒████████▒▒▒▒████▒▒
Thread 2: ████▒▒████████████▒▒▒▒
Thread 3: ▒▒████▒▒▒▒████████████

█ = 실행
▒ = 대기/유휴

패턴 분석:
- 동시 대기 → 락 경합
- 순차 실행 → 직렬화
- 긴 유휴 → 부하 불균형
```

```
도구별 시각화:

Intel VTune:
- 타임라인 뷰
- CPU 사용률 그래프
- 락 경합 히트맵

Trace Compass:
- LTTng 트레이스 시각화
- 커널 이벤트 분석
- 커스텀 분석 스크립트

Chrome Tracing:
- JSON 기반 이벤트 포맷
- chrome://tracing에서 보기
- 커스텀 계측 가능
```

```
커스텀 트레이싱 (Chrome Tracing 포맷):

#include <fstream>
#include <chrono>

void trace_event(const char* name, char phase) {
    auto now = std::chrono::high_resolution_clock::now();
    auto us = std::chrono::duration_cast<
        std::chrono::microseconds>(now.time_since_epoch()).count();

    fprintf(trace_file,
        "{\"name\":\"%s\",\"ph\":\"%c\",\"ts\":%lld,\"pid\":1,\"tid\":%d},\n",
        name, phase, us, get_thread_id());
}

// 사용
trace_event("process_item", 'B');  // Begin
process_item();
trace_event("process_item", 'E');  // End

// chrome://tracing에서 결과 JSON 로드
```

---

## 정리

- **정적 분석**: 빠르지만 제한적, 주석 필요
- **동적 분석**: 정확하지만 오버헤드, TSan 권장
- **Happens-before**: 레이스 탐지의 이론적 기초
- **VTune**: Hotspots → Threading → Lock 순으로 분석
- **프로파일링**: 활용률, 락 경합, 캐시 효과
- **시각화**: 타임라인, 플레임 그래프

---

## 핵심 비교

| 도구 | 유형 | 탐지 대상 | 오버헤드 |
|------|------|-----------|----------|
| Clang Annotations | 정적 | 레이스 (제한) | 없음 |
| ThreadSanitizer | 동적 | 레이스 | 5-15× |
| Helgrind | 동적 | 레이스, 데드락 | 20-100× |
| perf | 프로파일 | 성능, 캐시 | 매우 낮음 |
| VTune Hotspots | 프로파일 | CPU 병목 | 낮음 |
| VTune Threading | 프로파일 | 락, 동시성 | 낮음 |
| VTune Memory | 프로파일 | 캐시, NUMA | 낮음 |

| 문제 | 탐지 방법 | 도구 |
|------|-----------|------|
| 데이터 레이스 | HB 분석 | TSan, Helgrind |
| 데드락 | 락 순서 그래프 | Helgrind, VTune |
| False sharing | 캐시 라인 분석 | perf c2c |
| 부하 불균형 | 타임라인 분석 | VTune, Trace |

---

## 관련 항목

- [Ch 3: Proving Correctness and Measuring Performance](/blog/parallel/art-of-concurrency/chapter03-correctness-performance) — 정확성 개념
- [Ch 4: Eight Simple Rules](/blog/parallel/art-of-concurrency/chapter04-eight-rules) — 테스트 규칙
- [Ch 5: Threading Libraries](/blog/parallel/art-of-concurrency/chapter05-threading-libraries) — 동기화 프리미티브
- [Tanenbaum Ch 6: Coordination](/blog/parallel/distributed-systems-tanenbaum/chapter06-coordination) — 분산 동기화
