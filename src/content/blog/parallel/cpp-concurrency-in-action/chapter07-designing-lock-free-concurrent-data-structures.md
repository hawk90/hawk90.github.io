---
title: "Ch 7: Designing lock-free concurrent data structures"
date: 2026-05-06T07:00:00
description: "lock-free / wait-free 정의, compare-and-swap, ABA 문제, hazard pointer, reference counting, Michael-Scott 큐."
tags: [C++, C, Concurrency, Lock-free, Atomic, CAS]
series: "C++ Concurrency in Action"
seriesOrder: 7
draft: false
---

뮤텍스 없이 스레드 안전한 자료구조를 만들 수 있다. 원자적 연산만으로 동기화를 달성하는 lock-free 프로그래밍을 다룬다. 6장의 락 기반 자료구조는 단순하고 견고하지만, 락이 점유된 동안 다른 모든 스레드는 대기해야 한다. 7장은 그 대기를 없애는 방향을 탐구한다. 다만 그 대가로 메모리 회수, ABA, 메모리 순서 같은 까다로운 문제를 떠안게 된다.

## 7.1 Definitions and consequences

### 7.1.1 Non-blocking 자료구조의 분류

진행 보장(progress guarantee)의 강도에 따라 non-blocking 자료구조는 세 단계로 나뉜다. 강한 쪽일수록 구현이 어렵고 일반적으로 더 느리다.

| 용어 | 정의 | 보장 |
|------|------|------|
| **Obstruction-free** | 다른 스레드가 모두 멈춰 있을 때 임의 스레드가 유한 step 안에 완료 | 가장 약함 |
| **Lock-free** | 여러 스레드가 동시에 동작할 때 최소 *한* 스레드가 유한 step 안에 완료 | 시스템 전체 진행 |
| **Wait-free** | *모든* 스레드가 유한 step 안에 자기 작업을 완료 | starvation 없음 |

Wait-free가 가장 강한 보장이다. 어떤 스레드가 얼마나 느리든, 다른 스레드의 작업과 무관하게 유한 시간 안에 끝난다. Lock-free는 그보다 한 단계 약하다. 어떤 스레드 하나가 계속 CAS에 성공해서 전진하면, 다른 스레드는 그 자리에서 계속 retry를 돌 수도 있다. 그래도 시스템 전체로 보면 작업이 진행된다.

Obstruction-free는 가장 약한 보장이다. 다른 스레드가 모두 중단된 상태(이를테면 디버거가 잡고 있는 상태)에서만 진행을 보장한다. 실무에서 obstruction-free는 단독으로 잘 쓰지 않는다. lock-free 또는 wait-free로 강화해서 쓰는 경우가 대부분이다.

```cpp
// Lock-free: 한 스레드가 멈춰도 다른 스레드는 진행
void lock_free_push(Node* node) {
    node->next = head.load();
    while (!head.compare_exchange_weak(node->next, node));
    // CAS 실패 = 다른 스레드가 성공 → 시스템은 진행 중
}

// Lock-based: 락 보유 스레드가 멈추면 모두 멈춤
void lock_based_push(Node* node) {
    std::lock_guard lock(mtx);  // 이 스레드가 죽으면 전체 정지
    node->next = head;
    head = node;
}
```

핵심 관찰. lock-free 알고리즘에서는 어떤 스레드가 임의의 지점에서 멈추더라도 다른 스레드는 계속 진행한다. 락 기반 알고리즘이 락 점유 스레드의 갑작스러운 중단에 취약한 것과 대비된다.

### 7.1.2 Lock-free의 비용과 이득

```
이득:
- 데드락이 정의상 불가능 (락이 없으므로)
- 우선순위 역전(priority inversion) 회피
- 시그널 핸들러 안전성 (재진입 가능)
- 어떤 스레드의 중단도 다른 스레드를 막지 않음

비용:
- 구현 난이도 증가
- 메모리 회수 문제(누가 언제 노드를 free할 것인가)
- ABA 문제와 그 회피 비용
- 약한 메모리 순서 사용 시 검증 부담
- CAS 실패로 인한 retry — 캐시 라인 경합이 심하면 락보다 느림
- 자료구조에 따라 wait-free 변환이 불가능하거나 매우 어려움
```

현실에서 대부분의 경우는 `std::mutex`가 더 낫다. lock-free는 락이 측정된 병목이고, 짧은 임계 영역이며, 진행 보장이 정말로 필요한 상황에서만 정당화된다.

### 7.1.3 ABA problem

ABA는 lock-free CAS 기반 알고리즘의 고전적 함정이다. 단순한 CAS는 값이 같으면 변하지 않은 것으로 간주한다. 그러나 두 번의 관측 사이에 값이 A → B → A로 변했다면, CAS는 변화를 감지하지 못한다.

```
초기: head → A → B → C

Thread 1                    Thread 2
─────────────────────────────────────────────
old = head        (= A)
next = old->next  (= B)     // 일시 정지
                            pop() // A 제거, head → B
                            pop() // B 제거, head → C
                            push(D), push(A_recycled)
                            // head → A_recycled → D → C
                            //       (A의 원래 주소 재사용)
// Thread 1 재개
head.CAS(A, B)              // 성공! A == A_recycled
                            // head → B (하지만 B는 free된 상태!)
```

문제의 본질. Thread 1은 head가 가리키던 A를 봤고, 그 next가 B임을 기억했다. Thread 2가 A를 제거했다가 같은 주소에 새 노드를 재할당하면 Thread 1의 CAS는 "변하지 않았다"고 잘못 판단한다. 그 결과 head는 이미 free된 B를 가리키게 된다.

ABA는 free된 노드 주소의 재사용이 원인이다. 따라서 메모리 회수 전략과 ABA 회피 전략은 한 묶음이다.

ABA를 해결하는 일반적인 접근:

1. **Tagged pointer** — 포인터에 버전 카운터를 붙여 CAS가 (포인터, 버전) 쌍을 비교하게 한다. 같은 주소라도 버전이 다르면 변경된 것으로 판정.
2. **Hazard pointer** — 어떤 스레드가 어떤 노드를 보고 있는지 공개적으로 선언한다. 보호 중인 노드는 다른 스레드가 회수하지 못한다.
3. **Reference counting** — 노드에 참조 카운트를 두고 0이 되어야 회수.
4. **Garbage collection** — 언어 차원의 GC가 도달 가능성을 추적하면 ABA가 사라진다. C++에는 없으므로 위 세 가지 중 하나를 직접 구현해야 한다.

## 7.2 Examples of lock-free data structures

이 절은 책의 listing 흐름을 따라 lock-free 스택과 큐를 단계별로 구성한다. 각 단계마다 발견되는 결함을 다음 단계에서 고쳐 나가는 방식이다.

### 7.2.1 Lock-free 스택 — Listing 7.1: 누수형 push

가장 단순한 시작점. push만 있고 pop이 없다면 메모리 회수 문제는 발생하지 않는다.

```cpp
template<typename T>
class lock_free_stack {
private:
    struct node {
        T data;
        node* next;
        node(const T& d) : data(d) {}
    };
    std::atomic<node*> head;

public:
    void push(const T& data) {
        node* const new_node = new node(data);
        new_node->next = head.load();
        while (!head.compare_exchange_weak(new_node->next, new_node));
    }
};
```

`compare_exchange_weak`가 실패하면 `new_node->next`에 *실제* 현재 head가 채워진다. 따라서 retry 루프는 매번 새로운 expected 값을 가지고 다시 시도한다. spurious failure가 발생할 수 있는 `weak` 버전이지만 어차피 루프 안이라 문제 없다.

이 코드의 push 동작은 lock-free다. 그러나 노드 메모리는 절대 해제되지 않는다. 다음 단계에서 pop을 추가한다.

### 7.2.2 Listing 7.2: pop 추가, 그러나 use-after-free

```cpp
template<typename T>
class lock_free_stack {
    // ... 위와 동일 ...
public:
    void pop(T& result) {
        node* old_head = head.load();
        while (!head.compare_exchange_weak(old_head, old_head->next));
        result = old_head->data;
        // delete old_head; // 다른 스레드가 아직 보고 있을 수 있음
    }
};
```

문제 1. `old_head`가 nullptr이면 `old_head->next` 역참조에서 충돌. 빈 스택을 다루지 못한다.

문제 2. `delete`를 어디서 어떻게 호출할 것인가. 다른 스레드가 같은 노드를 `head.load()`로 읽었을 가능성이 있다. 그 스레드의 CAS는 실패할 테지만, 실패 전에 `old_head->next`를 역참조하면 해제된 메모리를 읽는다.

문제 3. 값을 참조로 반환하므로 `data`의 복사 생성자에서 예외가 던져지면 pop이 완료되었지만 호출자는 값을 받지 못한 상태가 된다. 이는 6장 lock-based 스택에서도 다룬 안전성 문제다.

### 7.2.3 Listing 7.3: shared_ptr 반환으로 예외 안전성 확보

```cpp
template<typename T>
class lock_free_stack {
private:
    struct node {
        std::shared_ptr<T> data;
        node* next;
        node(const T& d) : data(std::make_shared<T>(d)) {}
    };
    std::atomic<node*> head;

public:
    void push(const T& data) {
        node* const new_node = new node(data);
        new_node->next = head.load();
        while (!head.compare_exchange_weak(new_node->next, new_node));
    }

    std::shared_ptr<T> pop() {
        node* old_head = head.load();
        while (old_head &&
               !head.compare_exchange_weak(old_head, old_head->next));
        return old_head ? old_head->data : std::shared_ptr<T>();
    }
};
```

데이터를 `shared_ptr<T>`로 미리 감싸 두면 pop은 그 포인터만 반환하면 된다. 반환 시점에 복사 생성자가 호출되지 않으므로 예외가 던져질 가능성이 사라진다.

여전히 남는 문제. 노드 자체는 절대 해제되지 않는다. 책은 다음 listing에서 메모리 회수 전략을 본격적으로 다룬다.

### 7.2.4 메모리 회수의 세 가지 전략

책은 lock-free 자료구조에서 메모리 회수를 다루는 세 가지 일반적 접근을 소개한다.

```
1. Reference counting
   - 노드에 참조 카운트를 두고 도달 가능 스레드 수를 센다
   - 카운트가 0이 되면 회수
   - std::shared_ptr의 atomic 연산이 lock-free라면 직접 사용 가능
   - 그렇지 않으면 split count(external + internal) 기법

2. Hazard pointer
   - 스레드는 자신이 접근 중인 포인터를 공개 선언한다
   - 회수 대상 후보는 retire 목록에 모은다
   - 주기적으로 retire 목록을 스캔하여 어떤 스레드도 보호하지 않는 노드만 회수

3. Quiescent state / RCU 류 (Read-Copy-Update)
   - 모든 reader가 자료구조 밖으로 나간 시점(grace period)을 식별
   - 그 시점 이전에 unlink된 노드는 안전하게 회수
   - 책은 epoch-based reclamation을 간단히 언급
```

각 전략은 trade-off가 있다. reference counting은 모든 노드에 atomic counter 비용. hazard pointer는 스캔 비용과 retire 목록 관리. RCU 계열은 garbage가 grace period까지 쌓이며 reader 측은 매우 가볍지만 writer 측이 무겁다.

### 7.2.5 Listing 7.5: pop 동시 실행 카운트로 회수 시도

가장 단순한 회수 전략. "현재 pop 중인 스레드 수"를 세서, 그 수가 1일 때만 회수.

```cpp
template<typename T>
class lock_free_stack {
private:
    std::atomic<unsigned> threads_in_pop;
    std::atomic<node*> to_be_deleted;
    std::atomic<node*> head;

    static void delete_nodes(node* nodes) {
        while (nodes) {
            node* next = nodes->next;
            delete nodes;
            nodes = next;
        }
    }

    void try_reclaim(node* old_head) {
        if (threads_in_pop == 1) {
            node* nodes_to_delete = to_be_deleted.exchange(nullptr);
            if (!--threads_in_pop) {
                delete_nodes(nodes_to_delete);
            } else if (nodes_to_delete) {
                chain_pending_nodes(nodes_to_delete);
            }
            delete old_head;
        } else {
            chain_pending_node(old_head);
            --threads_in_pop;
        }
    }

    void chain_pending_node(node* n) {
        n->next = to_be_deleted.load();
        while (!to_be_deleted.compare_exchange_weak(n->next, n));
    }

    void chain_pending_nodes(node* nodes) {
        node* last = nodes;
        while (node* const next = last->next) last = next;
        last->next = to_be_deleted.load();
        while (!to_be_deleted.compare_exchange_weak(last->next, nodes));
    }

public:
    std::shared_ptr<T> pop() {
        ++threads_in_pop;
        node* old_head = head.load();
        while (old_head &&
               !head.compare_exchange_weak(old_head, old_head->next));
        std::shared_ptr<T> res;
        if (old_head) res.swap(old_head->data);
        try_reclaim(old_head);
        return res;
    }
};
```

장점. 단순하다. CAS 외 추가 자료구조가 거의 없다.

단점. 부하가 높으면 `threads_in_pop`이 1로 떨어지는 시점이 거의 없다. retire 목록이 무한정 자란다. 책은 이 단점을 분명히 지적하고 다음 단계로 넘어간다.

### 7.2.6 Hazard pointer — Listing 7.6, 7.7

Hazard pointer는 Maged Michael(2004)이 제안한 회수 기법. 각 스레드는 자신이 "현재 보고 있는" 포인터를 작은 슬롯에 공개 등록한다. 회수자는 retire 목록을 스캔하기 전에 모든 스레드의 hazard 슬롯을 확인하고, 어떤 슬롯에도 등록되지 않은 노드만 회수한다.

```cpp
// Listing 7.6 — hazard pointer 등록
unsigned const max_hazard_pointers = 100;

struct hazard_pointer {
    std::atomic<std::thread::id> id;
    std::atomic<void*> pointer;
};

hazard_pointer hazard_pointers[max_hazard_pointers];

class hp_owner {
    hazard_pointer* hp;
public:
    hp_owner(hp_owner const&) = delete;
    hp_owner& operator=(hp_owner const&) = delete;

    hp_owner() : hp(nullptr) {
        for (unsigned i = 0; i < max_hazard_pointers; ++i) {
            std::thread::id old_id;
            if (hazard_pointers[i].id.compare_exchange_strong(
                    old_id, std::this_thread::get_id())) {
                hp = &hazard_pointers[i];
                break;
            }
        }
        if (!hp) throw std::runtime_error("No hazard pointers available");
    }

    std::atomic<void*>& get_pointer() { return hp->pointer; }

    ~hp_owner() {
        hp->pointer.store(nullptr);
        hp->id.store(std::thread::id());
    }
};

std::atomic<void*>& get_hazard_pointer_for_current_thread() {
    thread_local static hp_owner hazard;
    return hazard.get_pointer();
}
```

`thread_local`은 각 스레드가 진입 시 한 번만 슬롯을 잡고 종료 시 해제하게 만든다. 슬롯이 부족하면 예외. 책은 max를 고정 값으로 두고, 실무에서는 dynamic 확장 또는 thread pool 크기에 맞춘 정적 할당을 권한다.

```cpp
// Listing 7.7 — hazard pointer를 사용하는 pop
std::shared_ptr<T> pop() {
    std::atomic<void*>& hp = get_hazard_pointer_for_current_thread();
    node* old_head = head.load();
    do {
        node* temp;
        do {
            temp = old_head;
            hp.store(old_head);
            old_head = head.load();
        } while (old_head != temp);   // 등록한 직후 head가 변하지 않았음을 확인
    } while (old_head &&
             !head.compare_exchange_strong(old_head, old_head->next));

    hp.store(nullptr);  // 더 이상 보호하지 않음
    std::shared_ptr<T> res;
    if (old_head) {
        res.swap(old_head->data);
        if (outstanding_hazard_pointers_for(old_head)) {
            reclaim_later(old_head);
        } else {
            delete old_head;
        }
        delete_nodes_with_no_hazards();
    }
    return res;
}
```

중요 패턴. `hp.store(old_head); old_head = head.load();`를 한 후 다시 비교한다. 이 두 단계 비교가 hazard pointer의 핵심이다. 단순히 등록만 하면 등록 직후 다른 스레드가 그 노드를 회수해 버릴 수 있다. 등록 *후* 다시 한번 head를 읽어 같은 노드라면, 그 사이 회수가 일어났더라도 다음 스캔에서 이 hazard 등록을 발견하게 된다.

`outstanding_hazard_pointers_for(p)`는 모든 hazard 슬롯을 선형 스캔. retire 목록도 같은 방식으로 처리. 부하가 높을 때 hazard pointer는 reference counting보다 빠른 경우가 많다. atomic 카운터의 cache line ping-pong이 없기 때문이다.

### 7.2.7 Reference counted lock-free stack — Listing 7.9 ~ 7.11

`std::atomic<std::shared_ptr<T>>`가 정말로 lock-free라면 코드는 매우 단순해진다.

```cpp
// 가정: atomic<shared_ptr> is_lock_free()
template<typename T>
class lock_free_stack {
private:
    struct node {
        std::shared_ptr<T> data;
        std::shared_ptr<node> next;
        node(const T& d) : data(std::make_shared<T>(d)) {}
    };
    std::atomic<std::shared_ptr<node>> head;

public:
    void push(const T& data) {
        std::shared_ptr<node> new_node = std::make_shared<node>(data);
        new_node->next = head.load();
        while (!head.compare_exchange_weak(new_node->next, new_node));
    }

    std::shared_ptr<T> pop() {
        std::shared_ptr<node> old_head = head.load();
        while (old_head &&
               !head.compare_exchange_weak(old_head, old_head->next));
        if (old_head) {
            old_head->next = std::shared_ptr<node>();
            return old_head->data;
        }
        return std::shared_ptr<T>();
    }
};
```

현실. C++20부터 `std::atomic<std::shared_ptr<T>>`가 표준에 들어왔지만, 구현이 lock-free인지는 라이브러리 구현에 달려 있다. 많은 구현은 내부적으로 spinlock을 쓴다. `std::atomic<std::shared_ptr<T>>::is_lock_free()`로 확인할 수 있다.

`atomic<shared_ptr>`가 lock-free가 아닐 때를 대비해 책은 "split reference count"라는 수동 구현을 보여준다.

```cpp
// Listing 7.10 — split reference count
template<typename T>
class lock_free_stack {
private:
    struct node;
    struct counted_node_ptr {
        int external_count;
        node* ptr;
    };
    struct node {
        std::shared_ptr<T> data;
        std::atomic<int> internal_count;
        counted_node_ptr next;

        node(T const& d) : data(std::make_shared<T>(d)), internal_count(0) {}
    };

    std::atomic<counted_node_ptr> head;

    void increase_head_count(counted_node_ptr& old_counter) {
        counted_node_ptr new_counter;
        do {
            new_counter = old_counter;
            ++new_counter.external_count;
        } while (!head.compare_exchange_strong(old_counter, new_counter,
                                               std::memory_order_acquire,
                                               std::memory_order_relaxed));
        old_counter.external_count = new_counter.external_count;
    }

public:
    ~lock_free_stack() { while (pop()); }

    void push(T const& data) {
        counted_node_ptr new_node;
        new_node.ptr = new node(data);
        new_node.external_count = 1;
        new_node.ptr->next = head.load(std::memory_order_relaxed);
        while (!head.compare_exchange_weak(new_node.ptr->next, new_node,
                                           std::memory_order_release,
                                           std::memory_order_relaxed));
    }

    std::shared_ptr<T> pop() {
        counted_node_ptr old_head = head.load(std::memory_order_relaxed);
        for (;;) {
            increase_head_count(old_head);
            node* const ptr = old_head.ptr;
            if (!ptr) return std::shared_ptr<T>();

            if (head.compare_exchange_strong(old_head, ptr->next,
                                             std::memory_order_relaxed)) {
                std::shared_ptr<T> res;
                res.swap(ptr->data);

                int const count_increase = old_head.external_count - 2;
                if (ptr->internal_count.fetch_add(count_increase,
                                                  std::memory_order_release)
                        == -count_increase) {
                    delete ptr;
                }
                return res;
            } else if (ptr->internal_count.fetch_add(-1,
                            std::memory_order_relaxed) == 1) {
                ptr->internal_count.load(std::memory_order_acquire);
                delete ptr;
            }
        }
    }
};
```

External count는 head에 누가 접근하려고 시도 중인지를 센다. Internal count는 그 시도들 중 실제로 노드 객체에 도달한 후 남은 참조 수. pop 성공자는 external을 internal로 transfer하면서 "자기 자신"을 빼는 -2 보정을 한다. 카운트가 0에 도달하는 순간이 안전한 회수 시점.

이 split count 패턴은 외우려 하기보다 책의 그림 7.5(노드 상태 전이)를 보며 이해해야 한다. external은 *head를 통해 도달하는 경로*, internal은 *그 경로에서 떨어져 나간 후 남은 참조*다.

### 7.2.8 Lock-free 큐 — Listing 7.13: single producer / single consumer

큐는 head와 tail 두 포인터를 동시에 다뤄야 해서 스택보다 어렵다. 가장 단순한 변종은 producer 한 명, consumer 한 명만 있는 SPSC 큐다.

```cpp
template<typename T>
class lock_free_queue {
private:
    struct node {
        std::shared_ptr<T> data;
        node* next;
        node() : next(nullptr) {}
    };
    std::atomic<node*> head;
    std::atomic<node*> tail;

    node* pop_head() {
        node* const old_head = head.load();
        if (old_head == tail.load()) return nullptr;
        head.store(old_head->next);
        return old_head;
    }

public:
    lock_free_queue() : head(new node), tail(head.load()) {}

    lock_free_queue(const lock_free_queue&) = delete;
    lock_free_queue& operator=(const lock_free_queue&) = delete;

    ~lock_free_queue() {
        while (node* const old_head = head.load()) {
            head.store(old_head->next);
            delete old_head;
        }
    }

    std::shared_ptr<T> pop() {
        node* old_head = pop_head();
        if (!old_head) return std::shared_ptr<T>();
        std::shared_ptr<T> const res(old_head->data);
        delete old_head;
        return res;
    }

    void push(T new_value) {
        std::shared_ptr<T> new_data(std::make_shared<T>(std::move(new_value)));
        node* p = new node;
        node* const old_tail = tail.load();
        old_tail->data.swap(new_data);
        old_tail->next = p;
        tail.store(p);
    }
};
```

이 큐의 정확성은 producer가 *오직 하나*, consumer가 *오직 하나*라는 가정에 달려 있다. head는 consumer만 쓰고, tail은 producer만 쓰며, dummy node 패턴(빈 큐일 때 head == tail)이 두 포인터의 race를 분리한다.

여러 producer 또는 여러 consumer가 들어오면 push의 `old_tail->data.swap(new_data); old_tail->next = p; tail.store(p);` 세 줄 사이에 다른 producer가 끼어들면서 깨진다. 따라서 다음 단계가 필요하다.

### 7.2.9 Multi-producer / multi-consumer 큐 — Listing 7.14 ~ 7.16

여러 producer를 지원하려면 tail 갱신이 CAS여야 한다. 그러나 단순 CAS만으로는 "data 설정"과 "tail 전진" 두 단계가 atomic하지 않아 깨진다. Michael-Scott 큐는 이 문제를 *helping*으로 해결한다. tail이 뒤처져 있는 것을 발견한 다른 스레드가 자기 작업을 잠시 미루고 tail을 대신 전진시켜 준다.

```cpp
// Listing 7.16 발췌 — multi-producer push (helping 포함)
template<typename T>
class lock_free_queue {
private:
    struct node;
    struct counted_node_ptr {
        int external_count;
        node* ptr;
    };

    std::atomic<counted_node_ptr> head;
    std::atomic<counted_node_ptr> tail;

    struct node_counter {
        unsigned internal_count : 30;
        unsigned external_counters : 2;
    };

    struct node {
        std::atomic<T*> data;
        std::atomic<node_counter> count;
        std::atomic<counted_node_ptr> next;

        node() {
            node_counter new_count;
            new_count.internal_count = 0;
            new_count.external_counters = 2;
            count.store(new_count);

            counted_node_ptr new_next;
            new_next.ptr = nullptr;
            new_next.external_count = 0;
            next.store(new_next);
        }

        void release_ref() {
            node_counter old_counter = count.load(std::memory_order_relaxed);
            node_counter new_counter;
            do {
                new_counter = old_counter;
                --new_counter.internal_count;
            } while (!count.compare_exchange_strong(
                old_counter, new_counter,
                std::memory_order_acquire, std::memory_order_relaxed));

            if (!new_counter.internal_count && !new_counter.external_counters) {
                delete this;
            }
        }
    };

    static void increase_external_count(
        std::atomic<counted_node_ptr>& counter,
        counted_node_ptr& old_counter)
    {
        counted_node_ptr new_counter;
        do {
            new_counter = old_counter;
            ++new_counter.external_count;
        } while (!counter.compare_exchange_strong(
            old_counter, new_counter,
            std::memory_order_acquire, std::memory_order_relaxed));
        old_counter.external_count = new_counter.external_count;
    }

    void set_new_tail(counted_node_ptr& old_tail,
                      counted_node_ptr const& new_tail) {
        node* const current_tail_ptr = old_tail.ptr;
        while (!tail.compare_exchange_weak(old_tail, new_tail)
               && old_tail.ptr == current_tail_ptr);
        if (old_tail.ptr == current_tail_ptr)
            free_external_counter(old_tail);
        else
            current_tail_ptr->release_ref();
    }

public:
    void push(T new_value) {
        std::unique_ptr<T> new_data(new T(std::move(new_value)));
        counted_node_ptr new_next;
        new_next.ptr = new node;
        new_next.external_count = 1;
        counted_node_ptr old_tail = tail.load();

        for (;;) {
            increase_external_count(tail, old_tail);
            T* old_data = nullptr;
            if (old_tail.ptr->data.compare_exchange_strong(
                    old_data, new_data.get())) {
                counted_node_ptr old_next = {0};
                if (!old_tail.ptr->next.compare_exchange_strong(
                        old_next, new_next)) {
                    delete new_next.ptr;
                    new_next = old_next;
                }
                set_new_tail(old_tail, new_next);
                new_data.release();
                break;
            } else {
                // 다른 producer가 이미 이 노드에 데이터를 넣음 — 도와주자
                counted_node_ptr old_next = {0};
                if (old_tail.ptr->next.compare_exchange_strong(
                        old_next, new_next)) {
                    old_next = new_next;
                    new_next.ptr = new node;
                }
                set_new_tail(old_tail, old_next);
            }
        }
    }
};
```

여기서 핵심은 `else` 분기다. 이 스레드는 자기 데이터를 넣지 못했다. 그러나 그냥 다음 retry로 돌아가지 않는다. 대신 *다른 producer가 미처 못 한 tail 전진을 대신 해 준다*. 이것이 lock-free 알고리즘의 핵심 패턴 중 하나인 helping이다.

Helping이 없으면 다음 시나리오가 가능하다. Producer A가 data를 넣고 tail을 전진시키기 직전에 OS에 의해 스왑 아웃. Producer B는 A가 다시 깨어날 때까지 영원히 push에 실패. 시스템 전체가 한 스레드에 발이 묶인다(= lock-free 위반). Helping은 이를 방지한다. A의 진행이 멈춰 있어도 B가 A의 작업을 마무리해 주고 자기 작업을 진행한다.

### 7.2.10 Multi-producer / multi-consumer pop

Pop도 동일한 helping 구조가 필요하다. Reference count로 노드를 보호하고, data가 아직 채워지지 않은 노드를 만나면 잠시 대기 또는 retry. Tail이 head 뒤에 있는 비정상 상태가 일시적으로 가능하므로 그 경우의 처리도 포함된다. 책 listing 7.17은 분량이 길어 여기서 전부 옮기지 않는다. 패턴만 정리하면 다음과 같다.

```
1. head를 보호하기 위해 external count 증가
2. head.ptr == tail.ptr 이면 큐가 빈 것 (혹은 tail이 뒤처진 것)
3. tail이 head보다 뒤처진 것을 발견하면 tail을 도와서 전진
4. head->next로 head 전진 — CAS로 시도
5. 빠진 노드의 reference count를 감소시키고 0이면 delete
```

전체 multi-producer / multi-consumer 큐는 책에서 가장 긴 코드 예제다. 직접 손으로 구현할 일은 거의 없다. Boost.Lockfree, folly, libcds 같은 검증된 라이브러리를 쓰는 것이 정상이다. 다만 그 라이브러리의 동작을 이해하려면 이 절의 패턴을 한 번은 따라가 봐야 한다.

## 7.3 Guidelines for writing lock-free data structures

책 7.3은 lock-free 자료구조를 직접 설계할 때 따라야 할 7개의 가이드라인을 제시한다.

### 7.3.1 std::memory_order_seq_cst로 시작하라

`memory_order_seq_cst`는 모든 atomic 연산에 전역 순서를 부여한다. 가장 강한 보장이며, 알고리즘 정확성 추론이 가장 쉽다. 우선 seq_cst로 정확성을 확보하고, 프로파일링 결과 그 비용이 측정되는 지점에서만 약한 순서로 완화한다.

순서를 약하게 만든 후의 검증은 매우 어렵다. 5장의 happens-before와 synchronizes-with 관계를 손으로 그려가며 모든 reader/writer 쌍을 점검해야 한다. ThreadSanitizer 같은 도구가 있어도 약한 순서의 미묘한 버그는 잘 잡히지 않는다. 책의 권장은 "seq_cst가 충분하면 거기서 멈춰라"이다.

### 7.3.2 Lock-free 메모리 회수 전략을 사용하라

lock-free 자료구조의 가장 큰 함정은 메모리 회수다. 다음 중 하나를 *반드시* 정해 두고 시작한다.

```
- 회수하지 않는다 (영원히 증가, 풀(pool) 또는 arena allocator)
- pop 카운트 기반 지연 회수
- Hazard pointer
- Split reference counting
- Epoch-based reclamation (RCU 류)
- Garbage collection (C++에선 직접 구현해야 함)
```

회수 전략 없이 lock-free를 짜면 거의 확실하게 use-after-free 또는 메모리 누수가 생긴다. 회수 전략은 자료구조 설계의 *처음*에 결정해야지, 나중에 끼워 넣을 수 없다.

### 7.3.3 ABA를 경계하라

CAS 기반 알고리즘은 ABA의 가능성을 항상 검토해야 한다. 다음 질문을 항상 던진다.

```
- 이 CAS의 expected 값이 두 번 사이에 같은 값으로 돌아올 수 있는가?
- 그 사이 자료구조의 다른 부분(예: next 포인터)이 변했을 수 있는가?
- 변했다면 이 CAS가 잘못된 결정을 내릴 수 있는가?
```

답이 "그렇다"면 다음 중 하나로 막는다.

- Tagged pointer (포인터 + 버전 카운터)
- Hazard pointer (재사용 자체를 막음)
- Reference counting (재사용을 카운트로 분리)
- Indirection (변경되는 포인터가 아닌 변하지 않는 ID를 비교)

ABA가 발생할 수 없음을 *증명*하지 않으면 발생한다고 가정하는 편이 안전하다.

### 7.3.4 Busy-wait 루프를 발견하면 도와줘라 (Helping)

다른 스레드의 미완료 작업을 발견했을 때 그냥 retry만 하면, 그 스레드가 멈춰 있을 때 시스템 전체가 멈춘다. Lock-free 보장이 깨진다. Helping은 그 미완료 작업을 자기가 마무리해 주고 자기 작업으로 진행하는 패턴이다.

Multi-producer 큐의 tail 전진(7.2.9)이 대표 예. Lock-free deque, lock-free hash table에도 helping이 거의 항상 등장한다. Helping은 wait-free 알고리즘 설계에도 핵심 기법이다.

### 7.3.5 라이브 락(live lock)을 조심하라

두 스레드가 서로를 도와주려다 영원히 retry하는 상황이 라이브 락이다. Helping을 잘못 설계하면 발생한다. 회피의 핵심은 "도와주는 작업은 항상 진행 방향과 일치해야 한다"는 원칙이다. A를 도와준 후 B의 작업으로 돌아오면, B의 다음 step은 *이미 A가 끝나 있는 상태*에서 시작해야 한다. 그래야 retry가 무한히 반복되지 않는다.

### 7.3.6 Cache ping-pong을 피하라

여러 스레드가 같은 atomic 변수를 빈번히 CAS하면 그 변수가 있는 캐시 라인이 코어 사이를 오간다. 캐시 라인은 보통 64바이트. 이 안에 자주 쓰이는 atomic이 여러 개 있으면 false sharing까지 겹친다.

```
대응:
- 자주 쓰이는 atomic은 캐시 라인 단위로 분리 (alignas(64))
- 한 자료구조에 여러 atomic이 있다면 분포 점검
- 가능하면 thread-local 누적 후 가끔 합산 (atomic 빈도 낮춤)
- Producer/consumer 큐는 head/tail을 서로 다른 캐시 라인에
```

7.2.8의 SPSC 큐도 실제 구현에서는 head와 tail을 다른 캐시 라인에 둬야 빠르다. 책의 코드는 명료성을 위해 그 alignment를 생략했다.

### 7.3.7 검증된 알고리즘과 라이브러리를 써라

마지막이자 가장 중요한 조언. 직접 설계하지 마라. Lock-free 알고리즘은 학술 논문 한 편 분량의 증명이 필요한 경우가 많다. 다음 중 자료구조에 해당하는 검증된 알고리즘이 있다면 그것을 구현한다.

```
- Treiber stack
- Michael-Scott queue (lock-free MPMC)
- Harris linked list (lock-free ordered set)
- Michael hash table
- Fraser binary tree
- crossbeam-skiplist (lock-free skip list)
```

논문에 나온 알고리즘조차 메모리 회수와 ABA 처리를 빼고 본질만 적은 경우가 많다. 그 두 가지는 직접 채워야 한다. 채울 능력이 없다면 라이브러리를 쓴다.

## 정리

- **Lock-free / wait-free / obstruction-free**는 진행 보장 강도가 다른 세 단계다. wait-free가 가장 강하고, obstruction-free가 가장 약하다.
- **ABA 문제**는 free된 노드 주소의 재사용에서 비롯되며, tagged pointer 또는 hazard pointer 또는 reference counting으로 막는다.
- **메모리 회수**는 lock-free 자료구조 설계의 핵심 결정 사항이다. pop 카운트 기반 지연 회수, hazard pointer, split reference counting, epoch-based 중 하나를 시작 시점에 선택한다.
- **Helping**은 lock-free 보장을 유지하면서 multi-producer / multi-consumer 자료구조를 만들 때 거의 항상 등장하는 패턴이다.
- 책의 7가지 가이드라인은 실무 설계의 체크리스트다. seq_cst로 시작, 회수 전략 우선 결정, ABA 점검, helping, live lock 회피, cache ping-pong 회피, 검증된 알고리즘 사용.
- 대부분의 경우 `std::mutex` 또는 검증된 라이브러리가 정답이다. 직접 lock-free를 짜는 것은 측정된 병목과 명확한 진행 보장 요구가 있을 때만.

## 한국 개발자의 함정

```
1. Lock-free = 무조건 빠름
   - 캐시 경합이 심하면 락보다 느림
   - 짧은 임계 영역이면 std::mutex가 충분
   - 측정 없이 lock-free 선택 금지

2. new/delete를 lock-free에서 자유롭게
   - 메모리 회수가 ABA의 원인
   - hazard pointer / epoch / 지연 삭제 필요
   - 직접 구현은 거의 항상 누수 또는 use-after-free

3. Wait-free = Lock-free
   - Wait-free는 더 강한 조건
   - 모든 스레드가 유한 step 안에 진행
   - 거의 모든 lock-free 자료구조는 wait-free 아님

4. atomic<T>가 lock-free임
   - 컴파일러가 mutex로 구현할 수도
   - is_lock_free() / is_always_lock_free 체크
   - atomic_flag만 항상 lock-free 보장

5. seq_cst로 lock-free 짜면 안전
   - 정확성은 맞지만 극도로 느림
   - 락보다 못한 경우 다반사
   - 필요한 만큼만 약한 order 사용

6. Helping은 옵션
   - Multi-producer / multi-consumer에서는 거의 필수
   - 빠진 helping은 lock-free 보장 위반
   - 한 producer가 죽으면 전체 정지
```

## 실무 적용

```
이론 → 실무:
- Lock-free Stack (Treiber)     → boost::lockfree::stack
- Lock-free Queue (Michael-Scott) → boost::lockfree::queue, folly::MPMCQueue
- SPSC Queue                    → folly::ProducerConsumerQueue, rigtorp/SPSCQueue
- Hazard Pointer                → folly::hazptr, libcds, std::experimental
- Epoch-based reclamation       → crossbeam-epoch (Rust)

언어별:
- C++: boost::lockfree, folly, libcds, moodycamel::ConcurrentQueue
- Java: ConcurrentLinkedQueue, AtomicReference (GC가 ABA 해결)
- Rust: crossbeam (epoch-based)
- Go: 직접 구현 드묾, channel로 대체

설계 결정:
- 우선 std::mutex 시도
- 측정에서 mutex가 병목 → lock-free 라이브러리
- 라이브러리에 없는 자료구조 → 신중히 직접 구현
- 직접 구현 시 ThreadSanitizer + 검증 필수
```

## 자기 점검

```
□ Lock-free / wait-free / obstruction-free의 정확한 차이?
□ ABA 문제 발생 시나리오와 회피 전략 3가지?
□ Hazard pointer의 두 단계 비교 패턴이 왜 필요한가?
□ Split reference count의 external / internal 분리 이유?
□ Michael-Scott queue의 helping 메커니즘?
□ pop 카운트 기반 회수의 단점?
□ is_lock_free()와 is_always_lock_free 차이?
□ 책 7.3의 7가지 가이드라인을 순서대로?
□ Lock-free가 무조건 빠른 게 아닌 이유?
```

## 다음 장 예고

다음 장에서는 동시성 코드 설계를 다룬다. 작업 분할, false sharing, Amdahl의 법칙을 살펴본다.

## 관련 항목

- [Ch 5: Memory Model](/blog/parallel/cpp-concurrency-in-action/chapter05-the-cpp-memory-model-and-operations-on-atomic-types)
- [Ch 6: Lock-based Data Structures](/blog/parallel/cpp-concurrency-in-action/chapter06-designing-lock-based-concurrent-data-structures)
- [Ch 8: Designing Concurrent Code](/blog/parallel/cpp-concurrency-in-action/chapter08-designing-concurrent-code)
- [AMP Ch 10: Concurrent Queues and ABA](/blog/parallel/parallel-principles/ch10-concurrent-queues-and-the-aba-problem)
- [AMP Ch 11: Concurrent Stacks](/blog/parallel/parallel-principles/ch11-concurrent-stacks-and-elimination)
- [AMP Ch 5: Synchronization Power](/blog/parallel/parallel-principles/ch05-relative-power-of-synchronization) — CAS와 합의
