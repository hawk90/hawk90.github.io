---
title: "Compare-and-Swap (CAS)"
date: 2026-05-12
description: "Lock-free 프로그래밍의 핵심. CAS의 의미론과 사용 패턴. ABA 문제와 해결책. 실전 CAS 루프 작성법."
series: "Parallel Programming Principles"
seriesOrder: 15
tags: [parallel, concurrency, cas, compare-and-swap, lock-free, aba-problem]
type: tech
---

## CAS: Lock-free의 심장

**Compare-and-Swap (CAS)**은 lock-free 프로그래밍의 기본 빌딩 블록이다.

```cpp
// CAS 의미론 (원자적으로 실행)
bool CAS(T* addr, T expected, T desired) {
    if (*addr == expected) {
        *addr = desired;
        return true;   // 성공
    }
    return false;      // 실패: 다른 스레드가 먼저 변경
}
```

**핵심 아이디어**: "내가 마지막으로 본 값이 여전히 그 값이면 변경해줘"

---

## CAS 기본 패턴

### 패턴 1: CAS 루프

가장 일반적인 사용 패턴.

```cpp
void atomic_increment(std::atomic<int>& counter) {
    while (true) {
        int old_value = counter.load();           // 1. 현재 값 읽기
        int new_value = old_value + 1;            // 2. 새 값 계산

        if (counter.compare_exchange_weak(old_value, new_value)) {
            return;                               // 3. 성공하면 종료
        }
        // 4. 실패하면 재시도 (old_value가 현재 값으로 업데이트됨)
    }
}
```

**왜 루프인가?**

다른 스레드가 먼저 값을 변경할 수 있다. 실패하면 새 값을 읽고 다시 시도한다.

### 패턴 2: 조건부 업데이트

특정 조건에서만 업데이트.

```cpp
bool atomic_max(std::atomic<int>& target, int value) {
    while (true) {
        int current = target.load();

        if (current >= value) {
            return false;  // 이미 더 큼, 업데이트 불필요
        }

        if (target.compare_exchange_weak(current, value)) {
            return true;   // 업데이트 성공
        }
    }
}
```

### 패턴 3: 포인터 교체

lock-free 자료구조의 핵심.

```cpp
struct Node {
    int data;
    Node* next;
};

std::atomic<Node*> head{nullptr};

void push(Node* new_node) {
    while (true) {
        Node* old_head = head.load();
        new_node->next = old_head;

        if (head.compare_exchange_weak(old_head, new_node)) {
            return;
        }
    }
}
```

---

## `compare_exchange_weak` vs `strong`

C++은 두 가지 CAS를 제공한다.

### `compare_exchange_strong`

```cpp
bool compare_exchange_strong(T& expected, T desired);
```

- **실패 = 값이 다르다**: expected가 현재 값으로 업데이트됨
- **단일 시도에 적합**: 한 번만 시도하고 결과 처리

### `compare_exchange_weak`

```cpp
bool compare_exchange_weak(T& expected, T desired);
```

- **가짜 실패(Spurious Failure) 가능**: 값이 같아도 실패할 수 있음
- **루프에서 사용**: 어차피 재시도하므로 가짜 실패 무관

### 왜 `weak`가 존재하는가?

**LL/SC 아키텍처** (ARM, RISC-V)에서:

```cpp
// LL/SC 기반 CAS 구현
bool cas_strong(addr, expected, desired) {
    do {
        tmp = load_linked(addr);
        if (tmp != expected) {
            return false;
        }
    } while (!store_conditional(addr, desired));  // SC 실패 시 재시도
    return true;
}

bool cas_weak(addr, expected, desired) {
    tmp = load_linked(addr);
    if (tmp != expected) {
        return false;
    }
    return store_conditional(addr, desired);  // SC 실패해도 그냥 반환
}
```

`strong`은 SC 실패 시 내부 루프를 돈다. `weak`는 그냥 실패 반환.

**결론**: 루프에서는 `weak`, 단일 시도에서는 `strong`.

---

## ABA 문제

CAS의 가장 유명한 함정.

### 문제 상황

```cpp
// Lock-free 스택 pop (문제 있는 버전)
Node* pop() {
    while (true) {
        Node* old_head = head.load();        // A를 읽음
        if (old_head == nullptr) return nullptr;

        Node* new_head = old_head->next;     // A->next = B

        // 여기서 컨텍스트 스위치!

        if (head.compare_exchange_weak(old_head, new_head)) {
            return old_head;
        }
    }
}
```

**ABA 시나리오**:

```
초기 상태: head → A → B → C

스레드 1: old_head = A, new_head = B
스레드 1: (컨텍스트 스위치)

스레드 2: pop() → A 반환
스레드 2: pop() → B 반환
스레드 2: push(A)  → A를 다시 푸시 (A->next = C)

현재 상태: head → A → C

스레드 1: (재개)
스레드 1: CAS(head, A, B) → 성공! (head가 여전히 A니까)

결과: head → B → ??? (B는 이미 해제됐거나 다른 용도로 사용 중!)
```

**핵심**: 값이 A → B → A로 변해도 CAS는 "같다"고 판단한다.

### ABA가 문제인 이유

1. **해제된 메모리 접근**: 노드가 free 후 재사용되면 dangling pointer
2. **논리적 오류**: 중간에 상태가 변했는데 모름
3. **데이터 손상**: 잘못된 next 포인터로 자료구조 파괴

---

## ABA 해결책

### 해결책 1: 버전 카운터 (Tagged Pointer)

포인터와 버전 번호를 함께 저장.

```cpp
struct TaggedPtr {
    Node* ptr;
    uint32_t tag;  // 버전 카운터
};

std::atomic<TaggedPtr> head;

void push(Node* new_node) {
    while (true) {
        TaggedPtr old_head = head.load();
        new_node->next = old_head.ptr;

        TaggedPtr new_head{new_node, old_head.tag + 1};  // 태그 증가

        if (head.compare_exchange_weak(old_head, new_head)) {
            return;
        }
    }
}
```

**원리**: 포인터가 같아도 태그가 다르면 CAS 실패.

**x86-64 트릭**: 포인터가 48비트만 사용. 상위 16비트를 태그로 활용.

```cpp
// 64비트 값에 포인터 + 태그 패킹
uintptr_t pack(void* ptr, uint16_t tag) {
    return (uintptr_t)ptr | ((uintptr_t)tag << 48);
}
```

### 해결책 2: Hazard Pointers

"이 포인터 사용 중이니 해제하지 마"라고 선언.

```cpp
thread_local Node* hazard_ptr = nullptr;  // 각 스레드의 hazard pointer

Node* pop() {
    while (true) {
        Node* old_head = head.load();
        hazard_ptr = old_head;  // "이 노드 사용 중"

        // 다시 확인 (hazard 설정 전에 바뀌었을 수 있음)
        if (head.load() != old_head) continue;

        if (old_head == nullptr) {
            hazard_ptr = nullptr;
            return nullptr;
        }

        Node* new_head = old_head->next;

        if (head.compare_exchange_weak(old_head, new_head)) {
            hazard_ptr = nullptr;
            // old_head는 나중에 안전하게 해제
            return old_head;
        }
    }
}

void safe_delete(Node* node) {
    // 모든 스레드의 hazard_ptr 확인
    for (auto& hp : all_hazard_pointers) {
        if (hp == node) {
            // 누군가 사용 중 → 나중에 해제
            defer_delete(node);
            return;
        }
    }
    delete node;  // 아무도 안 쓰면 해제
}
```

### 해결책 3: Epoch-Based Reclamation

시간(epoch)을 기준으로 안전한 해제 시점 결정.

```cpp
// 간략화된 개념
global_epoch = 0;
thread_epoch[N];  // 각 스레드의 현재 epoch

void enter_critical() {
    thread_epoch[my_id] = global_epoch;
}

void leave_critical() {
    thread_epoch[my_id] = INACTIVE;
}

void try_reclaim() {
    // 모든 스레드가 현재 epoch 이후로 이동했으면
    // 이전 epoch의 노드들 안전하게 해제
}
```

### 해결책 4: LL/SC (하드웨어)

ARM의 Load-Link/Store-Conditional은 ABA에 강하다.

```cpp
// LL/SC는 값이 아닌 "쓰기 발생"을 감지
load_linked(addr);   // 주소를 "예약"
// 중간에 누군가 이 주소에 쓰면 예약 무효화
store_conditional(addr, value);  // 예약 유효하면 성공
```

값이 A → B → A로 돌아와도, 쓰기가 발생했으므로 SC 실패.

---

## CAS vs LL/SC

| 특성 | CAS | LL/SC |
|-----|-----|-------|
| ABA 문제 | 취약 | 면역 |
| 가짜 실패 | 없음 | 있음 (인터럽트 등) |
| 중첩 | 가능 | 보통 불가 |
| x86 | 네이티브 | 에뮬레이션 |
| ARM | 에뮬레이션 | 네이티브 |

---

## 실전 팁

### 1. CAS 루프의 공정성

CAS 루프는 **불공정**할 수 있다.

```cpp
// 운이 나쁜 스레드는 계속 실패할 수 있음
while (!cas(...)) {
    // 무한 재시도?
}
```

**해결**: 백오프(backoff), 지수 백오프, 또는 최대 재시도 횟수.

```cpp
int backoff = 1;
while (!cas(...)) {
    for (int i = 0; i < backoff; i++) {
        // 잠시 대기
    }
    backoff = std::min(backoff * 2, MAX_BACKOFF);
}
```

### 2. False Sharing 주의

```cpp
struct alignas(64) PaddedCounter {  // 캐시라인 정렬
    std::atomic<int> value;
    char padding[64 - sizeof(std::atomic<int>)];
};

PaddedCounter counters[NUM_THREADS];  // 각 스레드 전용 카운터
```

### 3. CAS는 만능이 아니다

복잡한 불변식을 유지해야 하면 락이 더 쉽다.

```cpp
// CAS로 힘든 경우: 두 변수를 동시에 업데이트
// a와 b가 항상 a + b == 100을 유지해야 함
a = 60;  // CAS
b = 40;  // 중간에 다른 스레드가 끼어들면?
```

**Double-Width CAS**가 가능하면 해결:
```cpp
struct Pair { int a; int b; };
std::atomic<Pair> ab;  // 128-bit CAS (일부 플랫폼)
```

---

## 핵심 요약

| 개념 | 설명 |
|-----|------|
| CAS 의미론 | 값이 예상과 같으면 변경 |
| CAS 루프 | 실패 시 재시도 |
| weak vs strong | 루프에서는 weak |
| ABA 문제 | 값이 돌아와도 감지 못함 |
| 해결책 | 태그, hazard pointer, epoch |

---

## 연습 문제

1. **Lock-free 카운터**: CAS로 정확한 카운터를 구현하라. 8 스레드에서 100만 번 증가 후 결과가 정확한지 확인.

2. **ABA 재현**: ABA 문제가 발생하는 코드를 작성하고 버그를 관찰하라.

3. **Tagged Pointer**: 포인터 상위 비트에 태그를 넣는 lock-free 스택을 구현하라.

4. **백오프 효과**: 백오프 없는 CAS 루프 vs 지수 백오프의 성능을 비교하라.

---

다음 글: [Part 2-06: 메모리 모델 기초](/blog/parallel/parallel-principles/part2-06-memory-model-basics)
