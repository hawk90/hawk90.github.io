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

lock-free의 핵심은 *알고리즘으로* 서로의 진행을 보장하는 데에 있다. 락은 한 사람이 자물쇠를 쥐고 있는 동안 다른 사람을 멈춰 세운다. lock-free는 자물쇠 없이도 충돌 없는 순서를 만들어 낸다. 누군가가 갑자기 멈춰도 다른 사람의 일은 멈추지 않는다는 점이 결정적인 차이다.

7장의 코드를 읽다 보면 모든 패턴이 결국 *CAS* 한 줄로 수렴한다는 인상을 받는다. CAS는 "값이 내가 기억하는 것과 같으면 새 값으로 바꾸고, 아니면 실패하라"는 한 줄짜리 동기화 명령이다. 락이 *기간*을 가진 자물쇠라면 CAS는 *순간*에 결판이 나는 동전 던지기다. 이 단순함이 lock-free의 강점이자, 동시에 모든 미묘한 함정의 출발점이다. 두 사람이 같은 순간에 동전을 보았다면 어떻게 되는가? 한 사람이 동전을 본 직후 다른 사람이 동전을 바꿔치기했다면? 7장의 거의 모든 코드와 가이드라인은 이 두 질문의 변주에 답하는 형태다.

비유로 생각하면 lock-free는 화장실에 *예약제*가 없는 상태와 비슷하다. 먼저 들어간 사람이 사용을 끝낼 때까지 다른 사람은 노크를 반복한다. 누군가가 점유 중간에 사라져도 다음 사람이 그냥 들어가면 된다. 락 기반 모델은 열쇠 보관소에 키가 매달려 있고, 키를 든 사람이 쓰러지면 모두가 대기하는 모델이다. 같은 화장실 한 칸을 다루는 두 가지 정책일 뿐인데, 한쪽은 점유자가 사라지면 시스템이 멈추고 한쪽은 그렇지 않다.

wait-free는 한 단계 더 강한 보장이다. 모두에게 *정해진 횟수* 안에 자기 작업을 마칠 권리를 약속한다. 길게 줄을 서더라도 차례가 반드시 돌아온다는 점에서, lock-free보다 starvation에 강하다. 다만 그 보장을 얻기 위해 알고리즘은 훨씬 복잡해진다. 일반 자료구조의 wait-free 변환은 학술적으로 가능하지만 실용적인 경우는 드물고, 보통은 single-producer-single-consumer 큐처럼 *구조가 단순해 자연스럽게 wait-free가 되는* 자료구조에만 적용한다.

실제 시스템에서 어떤 자료구조가 어떤 형태로 살아 있는지 미리 짚어 두면 이 장의 코드를 읽기가 편하다. Linux 커널의 RCU(Read-Copy-Update)는 reader-mostly 시나리오에서 reader 측을 wait-free에 가깝게 만든다. Facebook Folly의 URCU 구현은 같은 아이디어를 사용자 공간으로 끌어왔다. jemalloc은 thread-cache 경합을 줄이기 위해 lock-free 자료구조를 군데군데 사용한다. Java의 `ConcurrentLinkedQueue`는 7장에서 다룰 Michael-Scott 큐의 정통 구현이다.

이런 시스템들이 공통적으로 보여 주는 메시지는 단순하다. lock-free는 *어디에나 쓰는 도구*가 아니라, *측정된 병목에 한정해서 적용하는 정밀 도구*다. RCU도 reader가 압도적으로 많은 자료구조에만 쓰이고, jemalloc도 thread-cache 경계를 벗어나는 작은 비율의 경합에만 lock-free를 적용한다. 7장의 가이드라인이 "검증된 알고리즘을 써라"로 끝나는 이유는, 이 정밀 도구를 직접 다듬어 본 사람의 경험을 단번에 받는 것이 합리적이기 때문이다.

## 7.1 Definitions and consequences

### 7.1.1 Non-blocking 자료구조의 분류

진행 보장(progress guarantee)의 강도에 따라 non-blocking 자료구조는 세 단계로 나뉜다. 강한 쪽일수록 구현이 어렵고 일반적으로 더 느리다.

| 용어 | 정의 | 보장 |
|------|------|------|
| **Obstruction-free** | 다른 스레드가 모두 멈춰 있을 때 임의 스레드가 유한 step 안에 완료 | 가장 약함 |
| **Lock-free** | 여러 스레드가 동시에 동작할 때 최소 *한* 스레드가 유한 step 안에 완료 | 시스템 전체 진행 |
| **Wait-free** | *모든* 스레드가 유한 step 안에 자기 작업을 완료 | starvation 없음 |

Wait-free가 가장 강한 보장이다. 어떤 스레드가 얼마나 느리든, 다른 스레드의 작업과 무관하게 유한 시간 안에 끝난다. Lock-free는 그보다 한 단계 약하다. 어떤 스레드 하나가 계속 CAS에 성공해서 전진하면, 다른 스레드는 그 자리에서 계속 retry를 돌 수도 있다. 그래도 시스템 전체로 보면 작업이 진행된다.

wait-free의 의미를 비유로 풀면 *번호표가 있는 은행 창구*에 가깝다. 번호표를 뽑으면 그 번호가 호명될 때까지 걸리는 시간이 *고정 상한*을 갖는다. 다른 손님이 얼마나 오래 상담하든, 내 차례가 무한정 밀리지는 않는다. lock-free는 그 자리에 *번호표 없는 줄*만 있는 상태에 비유할 수 있다. 누군가는 반드시 창구 앞으로 다가가고 있지만, 내가 그 누군가가 될지는 보장되지 않는다. 시스템 전체의 처리량은 유지되지만 개별 스레드의 응답 시간 상한은 없다.

Obstruction-free는 가장 약한 보장이다. 다른 스레드가 모두 중단된 상태(이를테면 디버거가 잡고 있는 상태)에서만 진행을 보장한다. 실무에서 obstruction-free는 단독으로 잘 쓰지 않는다. lock-free 또는 wait-free로 강화해서 쓰는 경우가 대부분이다.

세 보장의 차이를 한 줄로 정리하면 이렇다. wait-free는 *모든 개별 스레드*의 진행을 보장하고, lock-free는 *시스템 전체*의 진행을 보장하며, obstruction-free는 *경합이 사라진 순간*의 진행만 보장한다. starvation의 가능성은 lock-free에서 살아 있고, wait-free에서 사라진다. 실시간 시스템이 lock-free보다 wait-free를 선호하는 이유다.

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

이득 항목 중 *우선순위 역전 회피*와 *시그널 핸들러 안전성*은 실시간/임베디드 영역에서 특히 의미가 크다. 우선순위 역전은 낮은 우선순위 스레드가 락을 쥔 채 중간 우선순위 스레드에 선점되면, 락을 기다리는 높은 우선순위 스레드까지 함께 멈추는 현상이다. lock-free 자료구조는 그런 종류의 의존성을 만들지 않는다. 시그널 핸들러 안전성은 비동기 신호 처리 중에도 같은 자료구조를 만질 수 있다는 뜻이다. 락이라면 시그널 핸들러가 락을 다시 잡으려다 데드락에 빠지지만, lock-free는 그런 함정이 없다.

비용 항목에서 가장 무시되는 것은 *캐시 라인 경합*이다. CAS는 그 자체가 캐시 라인의 ownership을 빼앗는 작업이다. 여러 코어가 같은 캐시 라인을 두고 CAS를 반복하면 메모리 버스에 진동이 일어나고, 처리량이 락 기반 구현보다도 떨어진다. 락은 적어도 한 번에 한 코어가 임계 영역 안에서 캐시 라인을 사용하지만, lock-free는 매 retry마다 ownership이 튀어 다닌다. 7.3.6의 cache ping-pong 가이드라인이 이 문제를 직접 다룬다.

### 7.1.3 ABA problem

ABA는 lock-free CAS 기반 알고리즘의 고전적 함정이다. 단순한 CAS는 값이 같으면 변하지 않은 것으로 간주한다. 그러나 두 번의 관측 사이에 값이 A → B → A로 변했다면, CAS는 변화를 감지하지 못한다.

비유로 들면 동전 던지기 후의 *바꿔치기*에 가깝다 — 결과만 보면 같은 동전이지만, 본 순간과 비교한 순간 사이에 다른 손이 거쳐 갔는지 알 길이 없다.

조금 더 풀어서 말하면 이렇다. 똑같이 생긴 동전 A를 책상 위에 두고 잠시 자리를 비웠다고 하자. 돌아왔을 때 같은 자리에 같은 모양의 동전이 놓여 있으면 우리는 변한 게 없다고 판단한다. 그러나 그 사이에 누군가 동전을 가져가 다른 사람에게 주고, 다시 받아서 같은 자리에 놓았다면 동전의 정체는 이미 다르다. CAS는 동전의 모양만 본다. 누가 동전을 만진 적이 있는지는 알지 못한다.

이 비유가 단순한 농담이 아닌 이유는 메모리 할당기의 동작 때문이다. 일반적인 allocator는 free된 블록을 즉시 재사용한다. 같은 노드 객체를 해제하고 같은 타입의 새 노드를 할당하면 *같은 주소*가 돌아올 가능성이 매우 높다. 즉 lock-free 코드에서 ABA는 우연한 사고가 아니라 allocator가 적극적으로 만들어 내는 패턴이다.

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

이 네 가지 전략 중에서 어느 쪽을 고를지는 작업 부하의 형태에 달려 있다. tagged pointer는 가장 가볍지만 64비트 환경에서 포인터의 상위 비트를 카운터로 빼앗아 써야 한다는 제약이 있다. ARM이나 x86-64에서 캐노니컬 주소의 상위 비트를 활용하거나, 128비트 CAS(`cmpxchg16b`)를 사용하는 식으로 구현한다. hazard pointer는 reader 측에 약간의 오버헤드를 추가하지만 회수 시점이 명확하고 메모리 footprint가 작다. reference counting은 모든 노드에 카운터를 매달기 때문에 작은 노드에서는 비율적으로 큰 비용이고, 카운터 증감이 또 다른 cache ping-pong을 만들 수 있다. GC가 있는 언어에서는 ABA가 자연히 사라진다. Java가 `ConcurrentLinkedQueue`를 단순하게 구현할 수 있는 이유다.

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

메모리 회수는 lock-free의 가장 어려운 부분이고, 동시에 가장 흔히 잘못 구현되는 부분이다. 락 기반 자료구조에서는 락을 쥔 동안 노드를 안전하게 free할 수 있다. lock-free에서는 *지금 이 노드를 누가 보고 있는가*를 알 길이 없다. 어떤 스레드는 1000 cycle 전에 head를 읽었을 수도 있고, 다른 스레드는 1 cycle 전에 읽었을 수도 있다. 모두가 자기 손에 든 포인터를 따라가는 중일 수 있고, 한쪽에서 free하는 순간 다른 쪽에서는 use-after-free가 발생한다.

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

이 기법이 단순한 reference counting보다 효율적인 이유는 *공개되는 정보가 매우 적기 때문*이다. reference counting은 모든 노드에 카운터를 매달지만, hazard pointer는 *스레드 수에 비례하는 슬롯*만 유지한다. reader가 100만 노드를 거쳐도 hazard 슬롯은 스레드당 하나(또는 두 개)만 갱신된다. 핫 경로의 메모리 대역폭이 줄어드는 효과가 크다. 단점은 회수자의 작업 — 매번 모든 스레드의 슬롯을 스캔해야 하므로 retire 목록이 커질수록 회수 비용이 증가한다.

비유하자면 hazard pointer는 도서관의 *명함*과 같다. 책장 앞에 작은 명함꽂이가 있고, 책을 꺼내 읽으려는 사람은 자기 명함에 *현재 읽고 있는 책 번호*를 적어 꽂아 둔다. 책을 폐기하려는 사서는 폐기 후보 목록을 들고 명함꽂이를 한 번 훑는다. 어떤 명함에도 적혀 있지 않은 책만 실제로 폐기한다. 누군가가 그 책 번호를 명함에 적은 채로 책을 들고 있는 동안에는 절대로 사라지지 않는다.

핵심은 "내가 지금 이 노드를 보고 있다"를 *공개*한다는 점이다. 비밀로 두면 다른 스레드는 그 사실을 알 수 없고, 회수해도 안전하다고 판단한다. 명함을 꽂아 두면 회수자는 그 명함을 발견하고 폐기를 미룬다. 명함이라는 메타데이터의 비용을 치르고, 대신 reference count가 모든 노드에 붙어 다니는 무거움을 피하는 트레이드오프다.

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

hazard pointer는 우아한 만큼 운영 비용이 작지 않다. 매 노드 접근마다 두 번의 메모리 barrier가 들어간다. 한 번은 hazard 슬롯에 등록할 때, 또 한 번은 등록 후 다시 head를 확인할 때다. 이 *등록 후 재확인* 패턴이 빠지면 다른 스레드가 등록 직전에 노드를 회수해 use-after-free가 발생한다. 검증 순서를 단계별로 보면 (1) head 읽기 → (2) hazard 슬롯에 노드 주소 게시 → (3) head를 다시 읽어 같은 값인지 확인. 같지 않으면 처음부터 재시도다. 이 두 단계 비교가 hazard pointer의 정수다.

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

이 helping이 빠지면 다음 시나리오가 lock-free 보장을 부순다. producer P1이 새 노드를 tail 뒤에 연결한 직후, tail 포인터를 갱신하기 전에 OS가 P1을 스케줄에서 내린다. 다른 모든 producer는 tail이 가리키는 노드의 next가 nullptr이 아님을 보고 "이미 다른 producer가 끼어 있다"고 판단해 retry만 반복한다. P1이 다시 스케줄링되기 전까지 시스템 전체가 멈춘다. 이것은 lock-free의 정의를 정면으로 위반한다. helping은 다른 producer가 *P1을 대신해 tail을 전진*시켜 주는 것으로 이 함정을 막는다.

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

이 결정은 단순한 구현 디테일이 아니라 *자료구조의 인터페이스*에 영향을 준다. hazard pointer를 쓰면 사용자가 hazard 등록 메커니즘을 인식해야 하고, reference counting을 쓰면 노드 레이아웃이 카운터를 포함하도록 커진다. epoch-based 회수는 thread 별 epoch 등록이 필요하다. 회수 전략을 바꾸려면 API와 ABI 모두가 함께 바뀐다. 그래서 책의 가이드라인이 "회수 전략을 먼저 고르라"고 강조한다.

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

ABA 증명에서 가장 흔한 함정은 "잘못 발생해도 결과가 같으니 괜찮다"라고 결론짓는 것이다. 결과가 같아 보여도 자료구조의 *불변식*이 깨질 수 있다. 큐의 head/tail 관계, 스택의 next 체인, 트리의 부모-자식 일치 등 알고리즘이 가정하는 모든 불변식을 점검해야 한다. CAS가 성공한 직후 자료구조가 일관된 상태인지를 *외부 관찰자 관점*에서 다시 검토하는 것이 표준 절차다.

### 7.3.4 Busy-wait 루프를 발견하면 도와줘라 (Helping)

다른 스레드의 미완료 작업을 발견했을 때 그냥 retry만 하면, 그 스레드가 멈춰 있을 때 시스템 전체가 멈춘다. Lock-free 보장이 깨진다. Helping은 그 미완료 작업을 자기가 마무리해 주고 자기 작업으로 진행하는 패턴이다.

비유로 말하면 helping은 식당 주방의 분업 위반과 비슷하다. 원래는 김치찌개 담당이 있고 비빔밥 담당이 있다. 김치찌개 담당이 식자재 박스를 꺼내는 도중에 사라지면, 비빔밥 담당은 식자재 박스가 어디까지 꺼내져 있는지를 보고 마저 꺼내 둔다. 자기 메뉴 작업을 시작하기 전에 한 번 도와주는 식이다. 도움을 받지 못한 박스가 영영 절반쯤 열린 채로 남으면 주방 전체가 멈춘다.

Multi-producer 큐의 tail 전진(7.2.9)이 대표 예. Lock-free deque, lock-free hash table에도 helping이 거의 항상 등장한다. Helping은 wait-free 알고리즘 설계에도 핵심 기법이다.

helping의 미묘함은 *어떤 작업을 어디까지 도와줄지* 결정하는 데에 있다. 너무 적게 도와주면 lock-free 보장이 깨지고, 너무 많이 도와주면 자기 작업을 시작도 못 한 채 다른 사람의 작업만 처리한다. Michael-Scott 큐의 helping은 *한 단계*만 도와준다 — tail이 가리키는 노드의 next가 nullptr이 아니면 tail을 한 칸 전진시키고 자기 작업을 재시도한다. 두 칸을 한 번에 전진시키지 않는다. 이 *최소 helping* 원칙이 라이브 락을 방지하는 핵심이다. 모든 스레드가 같은 결정 규칙을 따르면 시스템은 매 단위 시간마다 적어도 한 스레드는 자기 작업을 끝낸다.

### 7.3.5 라이브 락(live lock)을 조심하라

두 스레드가 서로를 도와주려다 영원히 retry하는 상황이 라이브 락이다. Helping을 잘못 설계하면 발생한다. 회피의 핵심은 "도와주는 작업은 항상 진행 방향과 일치해야 한다"는 원칙이다. A를 도와준 후 B의 작업으로 돌아오면, B의 다음 step은 *이미 A가 끝나 있는 상태*에서 시작해야 한다. 그래야 retry가 무한히 반복되지 않는다.

라이브 락의 직관은 좁은 복도에서 두 사람이 마주쳐 서로 비켜 주려고 같은 방향으로 움직이는 상황이다. 둘 다 멈춰 서지는 않지만 진행도 하지 않는다. 알고리즘에서도 양쪽이 retry는 부지런히 돌면서 누구도 자기 작업을 끝내지 못하는 상태가 그대로 발생한다. 진행 방향에 *명확한 우선순위*를 박아 두는 것이 해법이다.

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

## 현실 시스템에서의 lock-free

7장의 알고리즘은 책장에서만 사는 이론이 아니다. 실제 시스템의 핵심 경로에서 같은 패턴이 매일 동작한다.

| 시스템 | lock-free 자료구조 | 회수 전략 |
|--------|------------------|----------|
| **Linux RCU** | read-mostly 자료구조 (라우팅 테이블, FD 테이블) | grace period |
| **Folly URCU / hazptr** | 사용자 공간 RCU, hazard pointer | grace period / hazard |
| **jemalloc** | thread-local cache, size class freelist | thread 단위 ownership |
| **Java ConcurrentLinkedQueue** | Michael-Scott 큐의 정통 구현 | JVM GC |
| **Linux per-CPU 카운터** | counter 합산 시 lock-free 읽기 | per-CPU 격리 |

Linux RCU의 묘미는 reader 측에 *동기화 명령이 거의 없다*는 점이다. reader는 일반 메모리 읽기처럼 자료구조를 순회하고, writer가 새 노드를 게시한 뒤에는 모든 reader가 자신의 임계 구역을 떠날 때까지 기다린다. 이 "기다림"이 grace period이고, 그 후에야 회수가 일어난다. 7장의 hazard pointer는 같은 문제에 다른 답을 내놓는다. reader가 *어떤 노드를 보고 있는지*를 명시적으로 게시하고, writer/회수자는 그 게시 정보를 보고 회수 시점을 결정한다.

jemalloc은 lock-free 자체보다는 *경합을 처음부터 만들지 않는* 전략에 가깝다. 스레드마다 별도의 cache를 유지해 작은 할당은 스레드 안에서 끝낸다. cache가 부족할 때만 글로벌 arena에 lock-free로 접근한다. 7장의 코드를 라이브러리화하기 전에 한 번쯤 다시 묻게 되는 질문이다 — *이 경합이 정말 필요한가, 아니면 분리할 수 있는가?*

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

## 정리: 단계별 결정 트리

lock-free 자료구조를 도입할지 결정할 때 다음 순서로 자문하면 시행착오를 줄인다.

1. 락 기반 구현으로 측정한 결과가 충분히 빠른가? → 그렇다면 lock-free는 불필요하다.
2. 락이 측정된 병목이고 짧은 임계 영역인가? → 검증된 lock-free 라이브러리를 먼저 검토한다.
3. 라이브러리에 없는 자료구조가 필요한가? → 회수 전략을 먼저 고른 뒤 구현을 시작한다.
   - 회수 전략은 nothing(영원히 누적), hazard pointer, reference counting, epoch 중 하나를 명시적으로 선택한다.
   - 선택한 전략이 자료구조의 인터페이스에 미치는 영향을 사용자 코드에 노출되기 전에 검토한다.
4. 진행 보장이 *시스템 전체*면 충분한가, *모든 스레드 개별*에 필요한가? → 전자라면 lock-free, 후자라면 wait-free.
5. ABA가 발생할 수 있는 형태인가? → 발생 가능하다고 가정하고 막는 편이 안전하다.

또 하나의 현실적 체크는 *플랫폼이 lock-free 구현을 제공하는가*다. `std::atomic<T>::is_always_lock_free`는 컴파일 타임 상수로, 해당 타입의 모든 인스턴스가 lock-free임을 보장하는지 알려 준다. 임베디드 ARMv6-M처럼 64비트 atomic이 없는 플랫폼에서는 `std::atomic<int64_t>`가 내부적으로 뮤텍스를 사용할 수도 있다. 이런 환경에서는 lock-free의 이론적 장점이 무의미해진다.

이 다섯 질문이 7장 전체의 의사 결정 흐름이다. 책의 가이드라인 7가지는 이 흐름의 각 단계에서 발생하는 함정을 메우는 도구로 읽으면 된다. helping과 cache ping-pong 회피는 단순한 정확성 문제를 넘어 *측정 가능한 처리량*에 직접 영향을 미친다. seq_cst로 시작해 정확성을 확보한 뒤, 측정을 통해 어디까지 약화해도 안전한지를 가늠하는 것이 합리적인 절차다.

## 다음 장 예고

다음 장에서는 동시성 코드 설계를 다룬다. 작업 분할, false sharing, Amdahl의 법칙을 살펴본다.

## 관련 항목

- [Ch 5: Memory Model](/blog/parallel/cpp-concurrency-in-action/chapter05-the-cpp-memory-model-and-operations-on-atomic-types)
- [Ch 6: Lock-based Data Structures](/blog/parallel/cpp-concurrency-in-action/chapter06-designing-lock-based-concurrent-data-structures)
- [Ch 8: Designing Concurrent Code](/blog/parallel/cpp-concurrency-in-action/chapter08-designing-concurrent-code)
- [AMP Ch 10: Concurrent Queues and ABA](/blog/parallel/parallel-principles/ch10-concurrent-queues-and-the-aba-problem)
- [AMP Ch 11: Concurrent Stacks](/blog/parallel/parallel-principles/ch11-concurrent-stacks-and-elimination)
- [AMP Ch 5: Synchronization Power](/blog/parallel/parallel-principles/ch05-relative-power-of-synchronization) — CAS와 합의
