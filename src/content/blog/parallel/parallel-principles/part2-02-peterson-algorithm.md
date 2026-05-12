---
title: "Peterson의 알고리즘"
date: 2026-05-12
description: "2-스레드 상호 배제의 고전적 해결책. Peterson's Algorithm의 동작 원리와 정확성 증명. 현대 시스템에서의 한계."
series: "Parallel Programming Principles"
seriesOrder: 12
tags: [parallel, concurrency, mutual-exclusion, peterson, synchronization]
type: tech
---

## Peterson의 알고리즘이란

**Peterson의 알고리즘**(1981)은 **2-스레드** 상호 배제를 **소프트웨어만으로** 해결한 알고리즘이다.

이전 글에서 본 실패한 시도들의 아이디어를 결합한다:

- **플래그**: 각 스레드의 의도(intention) 표현
- **턴**: 충돌 시 양보 결정

## 알고리즘

```cpp
bool flag[2] = {false, false};  // 스레드의 의도
int victim = 0;                  // 양보할 스레드

void lock(int id) {
    int other = 1 - id;          // 상대방 ID (0↔1)

    flag[id] = true;             // 1. 나 들어가고 싶어
    victim = id;                 // 2. 충돌 시 내가 양보할게

    while (flag[other] && victim == id) {
        // 3. 상대도 원하고, 내가 양보해야 하면 대기
    }
}

void unlock(int id) {
    flag[id] = false;            // 나 나간다
}
```

### 사용 예시

```cpp
void thread_0() {
    lock(0);

    // 임계 영역
    counter++;

    unlock(0);
}

void thread_1() {
    lock(1);

    // 임계 영역
    counter++;

    unlock(1);
}
```

---

## 동작 원리

### 경우 1: 스레드 0만 들어가려 함

```
스레드 0: flag[0] = true
스레드 0: victim = 0
스레드 0: flag[1] == false이므로 while 탈출
스레드 0: 임계 영역 진입
```

상대가 원하지 않으면 바로 들어간다.

### 경우 2: 스레드 1만 들어가려 함

```
스레드 1: flag[1] = true
스레드 1: victim = 1
스레드 1: flag[0] == false이므로 while 탈출
스레드 1: 임계 영역 진입
```

마찬가지로 바로 들어간다.

### 경우 3: 둘 다 동시에 들어가려 함

핵심 케이스. 두 가지 시나리오가 있다.

**시나리오 A: 스레드 0이 victim을 먼저 설정**

```
스레드 0: flag[0] = true
스레드 0: victim = 0
스레드 1: flag[1] = true
스레드 1: victim = 1    ← victim이 1로 덮어씌워짐

스레드 0: flag[1]==true, victim==1 → while 탈출 (victim≠0)
스레드 1: flag[0]==true, victim==1 → 대기 (victim==1)

스레드 0: 임계 영역 진입
```

**시나리오 B: 스레드 1이 victim을 먼저 설정**

```
스레드 1: flag[1] = true
스레드 1: victim = 1
스레드 0: flag[0] = true
스레드 0: victim = 0    ← victim이 0으로 덮어씌워짐

스레드 1: flag[0]==true, victim==0 → while 탈출 (victim≠1)
스레드 0: flag[1]==true, victim==0 → 대기 (victim==0)

스레드 1: 임계 영역 진입
```

**핵심 통찰**: `victim`에 **나중에 쓴 스레드**가 양보한다.

---

## 정확성 증명

### 상호 배제 증명

**귀류법**: 두 스레드가 동시에 임계 영역에 있다고 가정하자.

스레드 A가 임계 영역에 들어가려면:
- `flag[B] == false` **또는** `victim == B`

스레드 B가 임계 영역에 들어가려면:
- `flag[A] == false` **또는** `victim == A`

두 스레드가 동시에 임계 영역에 있으려면:
- 둘 다 `flag = true`를 설정했으므로, `flag[A] == true`, `flag[B] == true`
- 따라서 `victim == B` **그리고** `victim == A`여야 한다

하지만 `victim`은 단일 변수이므로 동시에 A와 B일 수 없다. **모순**.

따라서 두 스레드가 동시에 임계 영역에 있을 수 없다. ∎

### 진행 (데드락 자유) 증명

두 스레드가 모두 대기 중이라고 가정하자.

- 스레드 0이 대기: `flag[1] == true && victim == 0`
- 스레드 1이 대기: `flag[0] == true && victim == 1`

두 조건이 동시에 참이려면 `victim == 0`이고 `victim == 1`이어야 한다.

`victim`은 단일 변수이므로 불가능. **모순**.

따라서 적어도 하나는 진행할 수 있다. ∎

### 유한 대기 (기아 자유) 증명

스레드 A가 `lock()`에서 무한히 대기한다고 가정하자.

- `flag[B] == true && victim == A` 조건이 계속 참

스레드 B가 임계 영역에서 나오면:
- `flag[B] = false` 실행
- 스레드 A의 while 조건이 거짓이 됨
- 스레드 A가 진입

스레드 B가 다시 임계 영역에 들어가려면:
- `victim = B` 실행
- 스레드 A의 `victim == A` 조건이 거짓이 됨
- 스레드 A가 진입

따라서 스레드 A는 스레드 B의 **최대 1회** 임계 영역 진입 후 진입할 수 있다. ∎

---

## 구현 세부사항

### C++11 구현

```cpp
#include <atomic>
#include <array>

class PetersonLock {
private:
    std::array<std::atomic<bool>, 2> flag{};
    std::atomic<int> victim{0};

public:
    void lock(int id) {
        int other = 1 - id;

        flag[id].store(true, std::memory_order_seq_cst);
        victim.store(id, std::memory_order_seq_cst);

        while (flag[other].load(std::memory_order_seq_cst) &&
               victim.load(std::memory_order_seq_cst) == id) {
            // 스핀
        }
    }

    void unlock(int id) {
        flag[id].store(false, std::memory_order_seq_cst);
    }
};
```

### 왜 `std::atomic`이 필요한가?

일반 변수를 사용하면 **두 가지 문제**가 발생한다:

**1. 컴파일러 최적화**

```cpp
// 컴파일러가 이렇게 변환할 수 있다
while (flag[other] && victim == id) { }

// 최적화 후
bool temp_flag = flag[other];
int temp_victim = victim;
while (temp_flag && temp_victim == id) { }  // 무한 루프!
```

**2. CPU 메모리 재배치**

```cpp
flag[id] = true;   // (A)
victim = id;       // (B)

// CPU가 (B)를 (A)보다 먼저 실행할 수 있다!
```

x86에서도 Store-Load 재배치가 가능하다. ARM은 더 공격적이다.

---

## 현대 시스템에서의 한계

### 1. 2-스레드 제한

Peterson의 알고리즘은 **2-스레드에서만** 동작한다.

N-스레드로 확장하려면:
- **Filter Lock**: N-레벨의 Peterson 락 결합
- **Bakery Algorithm**: 번호표 기반 알고리즘

### 2. 바쁜 대기 (Busy Waiting)

```cpp
while (flag[other] && victim == id) {
    // CPU 사이클 낭비
}
```

대기 중에도 CPU를 100% 사용한다. **스핀락(Spinlock)**의 특성.

- **장점**: 대기 시간이 짧으면 컨텍스트 스위칭보다 빠름
- **단점**: 대기 시간이 길면 CPU 낭비

### 3. 메모리 순서 의존

`std::memory_order_seq_cst`를 사용해야 정확히 동작한다.

더 약한 메모리 순서를 사용하면 **미묘한 버그**가 발생할 수 있다.

### 4. 확장성 없음

스레드 수가 고정되어 있어야 한다. 동적으로 스레드가 추가/제거되는 환경에 부적합.

---

## 실전에서의 가치

Peterson의 알고리즘을 실제 코드에서 쓸 일은 거의 없다.

하지만 이해해야 하는 이유:

1. **상호 배제의 본질 이해**: 왜 어려운지, 어떤 조건이 필요한지
2. **정확성 증명 연습**: 동시성 코드의 정확성을 논증하는 방법
3. **메모리 모델 중요성**: 왜 `volatile`만으로는 안 되는지
4. **하드웨어 지원 필요성**: 왜 CAS 같은 원자적 명령어가 필요한지

---

## 핵심 요약

| 특성 | Peterson |
|-----|----------|
| 스레드 수 | 2 |
| 상호 배제 | ✓ |
| 데드락 자유 | ✓ |
| 기아 자유 | ✓ |
| 공정성 | FIFO 아님 |
| 대기 방식 | 스핀 (바쁜 대기) |
| 메모리 요구 | Sequential Consistency |

---

## 연습 문제

1. **메모리 순서 실험**: `seq_cst` 대신 `relaxed`를 사용하면 어떤 버그가 발생하는가?

2. **성능 측정**: Peterson 락과 `std::mutex`의 성능을 비교해보라. 어떤 상황에서 어느 쪽이 유리한가?

3. **3-스레드 확장**: Peterson 알고리즘을 3-스레드로 확장하려면 어떻게 해야 하는가? (힌트: Filter Lock)

---

다음 글: [Part 2-03: Bakery 알고리즘](/blog/parallel/parallel-principles/part2-03-bakery-algorithm)
