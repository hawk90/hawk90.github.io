---
title: "Ch 7: Designing lock-free concurrent data structures"
date: 2026-05-20T07:00:00
description: "lock-free / wait-free 정의, compare-and-swap, ABA 문제, hazard pointer."
tags: [C++, Concurrency, Lock-free, Atomic, CAS]
series: "C++ Concurrency in Action"
seriesOrder: 7
---

뮤텍스 없이 스레드 안전한 자료구조를 만들 수 있다. 원자적 연산만으로 동기화를 달성하는 lock-free 프로그래밍을 다룬다.

## 7.1 Lock-free의 의미

### 정의

| 용어 | 정의 | 보장 |
|------|------|------|
| **Lock-free** | 최소 하나의 스레드가 진행 | 일부 starvation 가능 |
| **Wait-free** | 모든 스레드가 유한 시간 내 진행 | starvation 없음 |
| **Obstruction-free** | 다른 스레드 중단 시 진행 | 가장 약함 |

```cpp
// Lock-free: 한 스레드가 멈춰도 다른 스레드는 진행
void lock_free_push(Node* node) {
    node->next = head.load();
    while (!head.compare_exchange_weak(node->next, node));
    // CAS 실패 = 다른 스레드가 성공 → 시스템은 진행 중
}

// Lock-based: 락 보유 스레드가 멈추면 모두 멈춤
void lock_based_push(Node* node) {
    std::lock_guard lock(mtx);  // 💥 이 스레드가 죽으면?
    node->next = head;
    head = node;
}
```

### 왜 Lock-free인가

| 장점 | 단점 |
|------|------|
| 데드락 불가 | 구현 복잡 |
| 우선순위 역전 없음 | 디버깅 어려움 |
| 시그널 핸들러 안전 | 메모리 관리 복잡 |
| 일부 상황에서 더 빠름 | ABA, 메모리 순서 이슈 |

**현실:** 대부분의 경우 `std::mutex`가 더 낫다. lock-free는 특수한 상황에서만.

## 7.2 Lock-free 스택

### 기본 구현

```cpp
template<typename T>
class lock_free_stack {
    struct node {
        std::shared_ptr<T> data;
        node* next;
        node(const T& d) : data(std::make_shared<T>(d)), next(nullptr) {}
    };

    std::atomic<node*> head{nullptr};

public:
    void push(const T& data) {
        node* new_node = new node(data);
        new_node->next = head.load();
        while (!head.compare_exchange_weak(new_node->next, new_node));
    }

    std::shared_ptr<T> pop() {
        node* old_head = head.load();
        while (old_head &&
               !head.compare_exchange_weak(old_head, old_head->next));
        return old_head ? old_head->data : nullptr;
        // 💥 old_head 메모리 누수!
    }
};
```

**문제:** `old_head`를 언제 `delete`할 수 있는가? 다른 스레드가 아직 사용 중일 수 있다.

## 7.3 메모리 회수 문제

### 문제 상황

```
Thread 1                    Thread 2
───────────────────────────────────────
old = head.load()
                            old = head.load() // 같은 노드
head.CAS(old, old->next)
delete old                  // 💥 Thread 2가 아직 사용 중!
                            old->data  // 💥 use-after-free
```

### 해결법 1: 지연 삭제 (Deferred Reclamation)

삭제 대상 노드를 목록에 모았다가 안전할 때 삭제.

```cpp
std::atomic<node*> to_be_deleted{nullptr};

void try_reclaim(node* old_head) {
    if (threads_in_pop == 1) {  // 혼자면 안전하게 삭제
        node* nodes = to_be_deleted.exchange(nullptr);
        delete_nodes(nodes);
        delete old_head;
    } else {
        // 나중에 삭제
        old_head->next = to_be_deleted.load();
        while (!to_be_deleted.compare_exchange_weak(old_head->next, old_head));
    }
}
```

### 해결법 2: Hazard Pointer

"이 포인터를 사용 중"이라고 공개적으로 선언.

```cpp
std::atomic<void*> hazard_pointers[MAX_THREADS];

void* get_hazard_pointer_for_current_thread() {
    // 현재 스레드의 hazard pointer 반환
}

template<typename T>
class hazard_pointer_owner {
    std::atomic<void*>& hp_;
public:
    hazard_pointer_owner() : hp_(get_hazard_pointer_for_current_thread()) {}
    ~hazard_pointer_owner() { hp_.store(nullptr); }

    void set(T* p) { hp_.store(p); }
    T* get() const { return static_cast<T*>(hp_.load()); }
};

// 삭제 전: 아무도 이 포인터를 hazard로 등록하지 않았는지 확인
bool outstanding_hazard_pointers_for(void* p) {
    for (auto& hp : hazard_pointers) {
        if (hp.load() == p) return true;
    }
    return false;
}
```

### 해결법 3: Reference Counting

`std::shared_ptr`의 원자적 버전을 사용.

```cpp
template<typename T>
class lock_free_stack_refcount {
    struct counted_node_ptr {
        int external_count;
        node* ptr;
    };

    struct node {
        std::shared_ptr<T> data;
        std::atomic<int> internal_count;
        counted_node_ptr next;
    };

    std::atomic<counted_node_ptr> head;
    // ... 복잡한 구현 ...
};
```

## 7.4 ABA 문제

### 문제 상황

```
초기: head → A → B → C

Thread 1                    Thread 2
───────────────────────────────────────
old = head (= A)
expected_next = old->next (= B)
                            pop() // A 제거
                            pop() // B 제거
                            push(D)
                            push(A) // 같은 주소 재사용!
                            // head → A → D

// Thread 1 재개
head.CAS(A, B)  // 성공! A == A
// 💥 head → B (하지만 B는 이미 삭제됨!)
```

### 해결: Tagged Pointer

포인터에 카운터를 추가해 ABA를 탐지.

```cpp
struct counted_node_ptr {
    uint16_t tag;      // 변경 횟수
    node* ptr;
};

// 64비트 시스템에서 atomic<counted_node_ptr> 사용 가능
// 또는 128비트 CAS 필요 (cmpxchg16b)

void push(node* new_node) {
    counted_node_ptr new_head;
    new_head.ptr = new_node;
    counted_node_ptr old_head = head.load();
    do {
        new_node->next = old_head;
        new_head.tag = old_head.tag + 1;  // 태그 증가
    } while (!head.compare_exchange_weak(old_head, new_head));
}
```

## 7.5 Lock-free 큐

### Michael-Scott 큐 (요약)

```cpp
template<typename T>
class lock_free_queue {
    struct node {
        std::atomic<T*> data;
        std::atomic<node*> next;
    };

    std::atomic<node*> head;
    std::atomic<node*> tail;

public:
    lock_free_queue() {
        node* dummy = new node;
        dummy->next = nullptr;
        head = tail = dummy;
    }

    void push(T value) {
        T* new_data = new T(std::move(value));
        node* new_node = new node;
        new_node->data = new_data;
        new_node->next = nullptr;

        node* old_tail;
        while (true) {
            old_tail = tail.load();
            node* next = old_tail->next.load();
            if (old_tail == tail.load()) {
                if (next == nullptr) {
                    if (old_tail->next.compare_exchange_weak(next, new_node)) {
                        break;  // 성공
                    }
                } else {
                    // tail 뒤처짐 → 앞으로
                    tail.compare_exchange_weak(old_tail, next);
                }
            }
        }
        tail.compare_exchange_weak(old_tail, new_node);
    }

    // pop은 더 복잡... (hazard pointer 또는 reference counting 필요)
};
```

## 7.6 가이드라인

### 언제 Lock-free를 쓰는가

| 상황 | 권장 |
|------|------|
| 일반적인 경우 | `std::mutex` |
| 시그널 핸들러 | lock-free 필요 |
| 실시간 시스템 | lock-free 고려 |
| 극한 성능 | 프로파일 후 결정 |

### 구현 팁

1. **작게 시작**: 복잡한 구조 대신 단순한 것부터
2. **검증된 구현 사용**: Intel TBB, Boost.Lockfree
3. **메모리 순서 신중히**: `seq_cst`로 시작, 필요시 완화
4. **ABA 대비**: tagged pointer 또는 hazard pointer
5. **테스트**: ThreadSanitizer 필수

## 정리

- **Lock-free**는 최소 하나의 스레드가 진행을 보장한다
- **메모리 회수**가 핵심 과제다: hazard pointer, reference counting
- **ABA 문제**는 tagged pointer로 해결한다
- 대부분의 경우 **`std::mutex`가 더 낫다**
- lock-free가 필요하면 **검증된 라이브러리**를 사용하라

## 다음 장 예고

다음 장에서는 동시성 코드 설계를 다룬다. 작업 분할, false sharing, Amdahl의 법칙을 살펴본다.
