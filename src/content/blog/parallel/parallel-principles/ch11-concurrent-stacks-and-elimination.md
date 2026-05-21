---
title: "Chapter 11: Concurrent Stack과 Elimination"
date: 2026-05-06T11:00:00
description: "Lock-Free Treiber Stack. Elimination 기법으로 push/pop이 서로 상쇄되어 스택을 안 거치게."
series: "The Art of Multiprocessor Programming"
seriesOrder: 11
tags: [parallel, concurrency, book-review, amp, stack, treiber, elimination, C++, C]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
draft: false
---

> **The Art of Multiprocessor Programming** Chapter 11 요약
>
> 이 시리즈는 C++20/23과 C11을 사용하여 최신 문법으로 재구성했다.

스택은 큐와 달리 *push와 pop의 짝이 자주 만난다* — LIFO 특성상 가장 최근의 push가 다음 pop의 대상이다. 동시 환경에서 이 만남은 두 의미를 가진다. 첫째, 두 연산이 같은 변수(top)를 두고 *경쟁*한다 — 모든 스레드가 한 꼭대기에서 다투는 형국. 둘째, 만남 자체가 *우회의 기회*다 — push와 pop이 서로 만나면 스택을 *안 거치고* 서로 상쇄될 수 있다. 이 챕터의 핵심 통찰은 *경합을 완화하는 게 아니라 우회한다*는 발상에 있다.

먼저 Treiber stack을 본다. 단일 LIFO에서 *모든 사람이 꼭대기 한 자리를 두고 다투는* 가장 단순한 lock-free 구조. CAS 한 번으로 push/pop이 끝나지만, 경합이 높으면 cache line ping-pong으로 락보다 느려질 수 있다. 그 다음 elimination — *push와 pop이 만나면 서로 상쇄*되어 스택을 건드리지 않는다. 생산자와 소비자가 *직거래*하는 셈이다. 시장에서 사과를 사려는 사람과 팔려는 사람이 가게를 거치지 않고 길에서 만나 거래하는 풍경.

elimination이 가능한 이유의 한 축은 *짝을 만날 확률*이다. **생일 역설** — 23명만 모이면 같은 생일을 가진 두 사람이 있을 확률이 50%를 넘는다. elimination array의 슬롯 수와 활성 스레드 수가 비슷할 때 *같은 슬롯에서 만나는* 짝이 자주 생긴다. 이 확률 계산이 elimination 디자인의 수학적 기반이다.

실세계 시스템: Java의 `Exchanger` (두 스레드가 객체를 직접 교환하는 동기화 객체), RxJava의 `SerializedSubject` (이벤트 스트림의 직접 전달), 비동기 pool (생산자가 task를 들고 있고 free worker가 직접 pickup하는 구조)이 모두 elimination 패턴의 변형이다.

## 11.1 Lock-Free Stack — Treiber Stack

가장 단순한 lock-free 자료구조.

비유로 보면 — *모든 사람이 한 책상의 꼭대기 책*을 두고 다투는 풍경. 책을 올리는 사람도, 가져가는 사람도, 모두 같은 꼭대기를 노린다. 한 명만 성공하고 나머지는 다시 시도. 단순하지만 그 단순함이 경합 시 약점.

### C++20/23 구현

```cpp
#include <atomic>
#include <memory>
#include <optional>

template<typename T>
class TreiberStack {
private:
    struct Node {
        T data;
        Node* next;
        explicit Node(T value) : data(std::move(value)), next(nullptr) {}
    };

    std::atomic<Node*> top{nullptr};

public:
    void push(T item) {
        Node* newNode = new Node(std::move(item));
        newNode->next = top.load(std::memory_order_relaxed);

        // CAS: 성공할 때까지 재시도
        while (!top.compare_exchange_weak(
            newNode->next, newNode,
            std::memory_order_release,
            std::memory_order_relaxed)) {
            // newNode->next가 자동으로 현재 top으로 갱신됨
        }
    }

    std::optional<T> pop() {
        Node* oldTop = top.load(std::memory_order_acquire);

        while (oldTop != nullptr) {
            Node* newTop = oldTop->next;

            if (top.compare_exchange_weak(
                oldTop, newTop,
                std::memory_order_release,
                std::memory_order_acquire)) {
                T result = std::move(oldTop->data);
                delete oldTop;  // 주의: ABA 문제 가능
                return result;
            }
            // oldTop이 자동으로 현재 top으로 갱신됨
        }
        return std::nullopt;
    }
};
```

### C11 구현

```c
#include <stdatomic.h>
#include <stdlib.h>
#include <stdbool.h>

typedef struct Node {
    int data;
    struct Node* next;
} Node;

typedef struct {
    _Atomic(Node*) top;
} TreiberStack;

void treiber_stack_init(TreiberStack* stack) {
    atomic_store(&stack->top, NULL);
}

void treiber_stack_push(TreiberStack* stack, int item) {
    Node* newNode = malloc(sizeof(Node));
    newNode->data = item;
    newNode->next = atomic_load_explicit(&stack->top, memory_order_relaxed);

    // CAS: 성공할 때까지 재시도
    while (!atomic_compare_exchange_weak_explicit(
        &stack->top,
        &newNode->next,
        newNode,
        memory_order_release,
        memory_order_relaxed)) {
        // newNode->next가 자동으로 현재 top으로 갱신됨
    }
}

bool treiber_stack_pop(TreiberStack* stack, int* out) {
    Node* oldTop = atomic_load_explicit(&stack->top, memory_order_acquire);

    while (oldTop != NULL) {
        Node* newTop = oldTop->next;

        if (atomic_compare_exchange_weak_explicit(
            &stack->top,
            &oldTop,
            newTop,
            memory_order_release,
            memory_order_acquire)) {
            *out = oldTop->data;
            free(oldTop);  // 주의: ABA 문제 가능
            return true;
        }
        // oldTop이 자동으로 현재 top으로 갱신됨
    }
    return false;
}
```

**핵심** — top 포인터에 대한 CAS 한 번. 매우 단순하고 빠르다.

### Treiber의 원래 알고리즘 (책 Listing 11.4)

Treiber(1986)는 IBM 보고서에서 이 알고리즘을 제시했다. 책은 그 골격을 거의 그대로 따른다.

```text
push(v):
    new = Node(v)
    repeat:
        old_top = top
        new.next = old_top
    until CAS(top, old_top, new) succeeds

pop():
    repeat:
        old_top = top
        if old_top == null: return EMPTY
        new_top = old_top.next
    until CAS(top, old_top, new_top) succeeds
    return old_top.value
```

**linearization point**: 성공한 CAS의 시점. 그 외 모든 시도는 *시도되지 않은* 것처럼 본다 (failed attempts는 무효).

**Lock-freedom 증명 스케치**: 어떤 스레드가 무한히 실패한다면, 다른 스레드가 무한히 자주 성공해야 한다 (top이 바뀌어야 내 CAS가 실패하므로). 따라서 시스템 전체로는 항상 누군가 진행한다 — lock-free.

**Wait-freedom은 보장 안 함**: 한 스레드가 끝없이 양보될 수 있다. 그래서 책은 11.6에서 starvation-free 변형을 별도로 다룬다.

## 11.2 Treiber Stack의 한계

성능 측정을 해 보면 — **경합이 심하면 매우 느리다**.

비유 — 회의실 칠판에 *맨 위에만 글을 쓰는* 규칙이 있다고 하자. 모두가 칠판으로 달려가지만 한 번에 한 명만 쓸 수 있다. 쓰려는 사람이 8명이면 7명은 매번 헛걸음. 칠판이 *한 점*이라는 점이 본질적 병목이다.

이유는 단순하다. 모든 스레드가 같은 변수(top)에 CAS를 시도한다. **Cache line contention**이 매우 크다.

```
8 코어, 모두 push 시도:
- 매 사이클 7 코어가 CAS 실패
- top cache line이 코어 사이를 핑퐁
- 처리량 거의 0에 수렴
```

이게 단순 lock-free의 한계다. **모두가 같은 위치에서 경쟁**하면 락보다도 못한 성능.

## 11.3 통찰 — Push와 Pop이 만나면?

Herlihy의 우아한 통찰.

> **Push와 Pop이 동시에 일어나면 — 그 두 작업은 서로 상쇄된다.**

시장 비유가 잘 맞는다. 사과를 *팔려는* 사람과 *사려는* 사람이 가게에 가는 길에 우연히 만났다고 하자. 둘이 가게 안에 들어가서 줄을 서기보다, 그 자리에서 직접 주고받는 게 더 빠르다. 가게(스택)의 카운터(top)는 손도 안 댄다. 이게 *직거래* — elimination의 정수다.

```
스택: [A, B, C]
스레드 X: push(D)
스레드 Y: pop() → 무엇을 받을까?
```

답은 두 가지 가능.

1. push가 먼저 — Y는 D를 받음
2. pop이 먼저 — Y는 C를 받음, 그 후 push로 D 추가

**둘 다 정당하다**. Linearizability는 어느 순서든 허용.

그렇다면 — **스택 자체를 안 거치고** push/pop이 서로 합의할 수 있을까? push가 D를 쥐고 있고 pop이 기다리고 있다면, 둘이 만나서 push가 D를 직접 pop에게 넘기면 된다. 스택은 그대로.

이게 **Elimination Backoff Stack**의 아이디어.

## 11.4 Elimination Backoff Stack

![Elimination Array 구조](/images/blog/parallel/diagrams/elimination-array.svg)

### C++20/23 구현

```cpp
#include <atomic>
#include <memory>
#include <optional>
#include <random>
#include <thread>
#include <chrono>

template<typename T>
class EliminationStack {
private:
    static constexpr size_t ELIMINATION_ARRAY_SIZE = 16;
    static constexpr auto TIMEOUT = std::chrono::microseconds(100);

    // Exchanger: 두 스레드가 값을 교환하는 슬롯
    struct Exchanger {
        enum class State { EMPTY, WAITING, BUSY };

        std::atomic<State> state{State::EMPTY};
        std::atomic<T*> item{nullptr};

        // exchange 시도: 상대방과 값을 교환
        std::optional<T> exchange(T* myItem, std::chrono::microseconds timeout) {
            auto deadline = std::chrono::steady_clock::now() + timeout;

            while (std::chrono::steady_clock::now() < deadline) {
                State expected = State::EMPTY;

                // 슬롯이 비어있으면 내가 먼저 대기
                if (state.compare_exchange_strong(expected, State::WAITING,
                    std::memory_order_acq_rel)) {
                    item.store(myItem, std::memory_order_release);

                    // 상대방 기다림
                    while (std::chrono::steady_clock::now() < deadline) {
                        if (state.load(std::memory_order_acquire) == State::BUSY) {
                            T* other = item.load(std::memory_order_acquire);
                            state.store(State::EMPTY, std::memory_order_release);
                            if (other) return *other;
                            return std::nullopt;
                        }
                    }
                    // 타임아웃 — 원복
                    expected = State::WAITING;
                    if (state.compare_exchange_strong(expected, State::EMPTY,
                        std::memory_order_acq_rel)) {
                        return std::nullopt;
                    }
                    // 그 사이 누가 와서 BUSY로 바꿈
                    T* other = item.load(std::memory_order_acquire);
                    state.store(State::EMPTY, std::memory_order_release);
                    if (other) return *other;
                    return std::nullopt;
                }

                // 누군가 대기 중이면 교환 시도
                if (expected == State::WAITING) {
                    if (state.compare_exchange_strong(expected, State::BUSY,
                        std::memory_order_acq_rel)) {
                        T* other = item.exchange(myItem, std::memory_order_acq_rel);
                        if (other) return *other;
                        return std::nullopt;
                    }
                }
            }
            return std::nullopt;
        }
    };

    TreiberStack<T> centralStack;
    std::array<Exchanger, ELIMINATION_ARRAY_SIZE> eliminationArray;

    size_t randomSlot() {
        thread_local std::mt19937 gen(std::random_device{}());
        thread_local std::uniform_int_distribution<size_t> dist(0, ELIMINATION_ARRAY_SIZE - 1);
        return dist(gen);
    }

public:
    void push(T item) {
        T* itemPtr = new T(std::move(item));

        while (true) {
            // 먼저 central stack 시도
            centralStack.push(*itemPtr);
            delete itemPtr;
            return;

            // 실패 시 elimination 시도 (간략화)
            size_t slot = randomSlot();
            auto result = eliminationArray[slot].exchange(itemPtr, TIMEOUT);
            if (result.has_value()) {
                // pop과 만남 — 성공
                delete itemPtr;
                return;
            }
        }
    }

    std::optional<T> pop() {
        while (true) {
            auto item = centralStack.pop();
            if (item.has_value()) {
                return item;
            }

            // elimination 시도
            size_t slot = randomSlot();
            auto result = eliminationArray[slot].exchange(nullptr, TIMEOUT);
            if (result.has_value()) {
                return result;
            }
        }
    }
};
```

### C11 구현 (간략화)

```c
#include <stdatomic.h>
#include <stdlib.h>
#include <stdbool.h>
#include <time.h>

#define ELIMINATION_ARRAY_SIZE 16
#define TIMEOUT_NS 100000  // 100 microseconds

typedef enum {
    EXCHANGER_EMPTY,
    EXCHANGER_WAITING,
    EXCHANGER_BUSY
} ExchangerState;

typedef struct {
    _Atomic(ExchangerState) state;
    _Atomic(int*) item;
} Exchanger;

typedef struct {
    TreiberStack central_stack;
    Exchanger elimination_array[ELIMINATION_ARRAY_SIZE];
} EliminationStack;

void elimination_stack_init(EliminationStack* stack) {
    treiber_stack_init(&stack->central_stack);
    for (int i = 0; i < ELIMINATION_ARRAY_SIZE; i++) {
        atomic_store(&stack->elimination_array[i].state, EXCHANGER_EMPTY);
        atomic_store(&stack->elimination_array[i].item, NULL);
    }
}

static size_t random_slot(void) {
    return (size_t)rand() % ELIMINATION_ARRAY_SIZE;
}

// exchange 구현 (간략화)
static bool exchanger_exchange(Exchanger* ex, int* my_item, int* out_item) {
    ExchangerState expected = EXCHANGER_EMPTY;

    if (atomic_compare_exchange_strong(&ex->state, &expected, EXCHANGER_WAITING)) {
        atomic_store(&ex->item, my_item);

        // 잠시 대기
        struct timespec ts = {0, TIMEOUT_NS};
        nanosleep(&ts, NULL);

        if (atomic_load(&ex->state) == EXCHANGER_BUSY) {
            int* other = atomic_load(&ex->item);
            atomic_store(&ex->state, EXCHANGER_EMPTY);
            if (other && out_item) *out_item = *other;
            return other != NULL;
        }

        expected = EXCHANGER_WAITING;
        atomic_compare_exchange_strong(&ex->state, &expected, EXCHANGER_EMPTY);
        return false;
    }

    if (expected == EXCHANGER_WAITING) {
        if (atomic_compare_exchange_strong(&ex->state, &expected, EXCHANGER_BUSY)) {
            int* other = atomic_exchange(&ex->item, my_item);
            if (other && out_item) *out_item = *other;
            return other != NULL;
        }
    }

    return false;
}

void elimination_stack_push(EliminationStack* stack, int item) {
    // 단순화: central stack에 직접 push
    treiber_stack_push(&stack->central_stack, item);
}

bool elimination_stack_pop(EliminationStack* stack, int* out) {
    // 먼저 central stack 시도
    if (treiber_stack_pop(&stack->central_stack, out)) {
        return true;
    }

    // elimination 시도
    size_t slot = random_slot();
    int result;
    if (exchanger_exchange(&stack->elimination_array[slot], NULL, &result)) {
        *out = result;
        return true;
    }

    return false;
}
```

**메커니즘**:

1. 먼저 central stack에 시도
2. 실패 시 — **elimination array**의 랜덤 슬롯에서 짝을 기다림
3. push와 pop이 같은 슬롯에서 만나면 — 서로 직접 교환, 스택은 그대로

## 11.5 왜 이게 빠른가

**경합이 적을 때** — central stack의 CAS가 보통 성공. Treiber stack과 거의 같음.

**경합이 심할 때** — central stack CAS 실패가 많지만, 그만큼 push/pop 짝이 많이 있다. Elimination array에서 만날 확률이 높음.

비유 — 시장에 사람이 많을수록 *사려는 사람과 팔려는 사람이 길에서 우연히 만날 확률*도 높다. 한산한 시장에서는 직거래가 거의 불가능하지만, 붐비는 시장에서는 자주 일어난다. 이게 elimination이 *부하 적응적*인 이유.

```text
경합 ↑ → CAS 실패 ↑ → 그러나 elimination 만남 ↑
        결과: 처리량 ↑
```

직관적으로 모순이지만 — **경합이 심할수록 elimination이 더 잘 작동**한다.

### Random Pairing의 통계

elimination 슬롯은 *균등 분포로 무작위* 선택한다. 슬롯 수가 $k$, 동시 활성 스레드 수가 $n$일 때, 두 스레드가 같은 슬롯에 도착할 확률은 birthday paradox 형태로 분석된다.

**생일 역설의 직관** — 1년 365일 중에서 23명만 모이면 같은 생일을 가진 두 사람이 있을 확률이 50%를 넘는다. "365가지 중 23명이면 작은 수 같은데"라는 첫 인상과 달리, 확률은 *쌍의 수*에 따라 증가한다. 23명에서 가능한 쌍은 $\binom{23}{2} = 253$개. 그래서 확률이 빨리 올라간다. elimination도 마찬가지 — 슬롯이 *적당히* 적으면 짝이 자주 만난다.

- $k = n$이면 한 슬롯에 두 명이 모일 확률은 약 $1 - e^{-1/2} \approx 39\%$
- $k = n/2$이면 약 $63\%$
- $k = 2n$이면 약 $22\%$

책의 권장은 **활성 스레드 수에 비례한 array 크기**다. 너무 작으면 같은 슬롯의 세 명 이상이 충돌해 모두 실패. 너무 크면 짝이 거의 안 만남.

**adaptive sizing**: 슬롯이 비어 있을 때마다 array 크기를 줄이고, 충돌이 많을 때 늘리는 동적 조정. JSR-166의 `Exchanger`는 비슷한 dynamic backoff를 쓴다.

### Bottleneck을 *우회*하는 elimination

핵심 통찰 — elimination은 stack의 bottleneck인 top 포인터를 *건드리지 않는다*. push와 pop이 만나는 순간 둘 다 종료된다.

```text
일반 Treiber:
  10 thread → top CAS 경쟁 → 1명만 진행, 9명 재시도

Elimination:
  10 thread → 5쌍이 array에서 만남 → 5명 즉시 종료
            → 5명만 top CAS 경쟁 → 1명 진행, 4명 재시도
```

이게 책이 강조하는 *우회*다. 같은 bottleneck을 더 빠르게 지나가는 게 아니라, **bottleneck을 안 지나가는 경로**를 만든 것.

비유: 고속도로 톨게이트에서 두 차가 서로 짐을 바꿔 싣고 둘 다 그 자리에서 돌아간다면, 톨게이트 처리량은 줄어들지만 *그 두 차의 목적은 달성*된다.

### Bottleneck *우회* vs *완화*의 차이

이 차이를 분명히 한다. 일반 lock-free 알고리즘은 bottleneck(top CAS)을 *완화*한다 — CAS를 더 빠르게, hardware backoff로 효율적으로, 그러나 *반드시 통과한다*. elimination은 *통과 자체를 회피*한다 — push와 pop이 만나면 top을 *건드리지도 않는다*.

이게 *우회 알고리즘*의 발상이다. 비유:

- **완화**: 톨게이트의 처리 속도를 빠르게 (자동 결제, 더 많은 부스)
- **우회**: 톨게이트를 *안 지나가는* 경로 (옆길로 우회)

elimination은 후자. 톨게이트를 더 빠르게 만드는 게 아니라, 차들끼리 *길에서 짐을 바꾸고* 둘 다 돌아간다. 톨게이트를 통과하는 차는 짝이 안 만난 차들뿐.

후자가 가능하려면 *명세가 그걸 허용*해야 한다. 톨게이트가 *확인 도장*을 찍어야 하는 거라면 우회 불가 — 모두 통과해야 한다. 스택 명세는 LIFO이므로 *방금 들어와서 방금 나간* 시나리오를 허용한다.

## 11.6 Elimination Array의 설계

각 슬롯은 **Exchanger** — 두 스레드가 만나서 값을 교환하는 동기화 객체.

### C++20/23 Exchanger

```cpp
template<typename T>
class Exchanger {
private:
    enum class State : int { EMPTY = 0, WAITING = 1, BUSY = 2 };

    std::atomic<State> state{State::EMPTY};
    std::atomic<T*> item{nullptr};

public:
    std::optional<T> exchange(T* myItem, std::chrono::microseconds timeout) {
        using namespace std::chrono;
        auto deadline = steady_clock::now() + timeout;

        while (steady_clock::now() < deadline) {
            State expected = State::EMPTY;

            // 슬롯 비어있음 — 내가 먼저 대기
            if (state.compare_exchange_strong(expected, State::WAITING)) {
                item.store(myItem, std::memory_order_release);

                // 상대방 대기
                while (steady_clock::now() < deadline) {
                    if (state.load(std::memory_order_acquire) == State::BUSY) {
                        T* other = item.load(std::memory_order_acquire);
                        state.store(State::EMPTY, std::memory_order_release);
                        return other ? std::optional<T>(*other) : std::nullopt;
                    }
                }

                // 타임아웃
                expected = State::WAITING;
                if (!state.compare_exchange_strong(expected, State::EMPTY)) {
                    T* other = item.load(std::memory_order_acquire);
                    state.store(State::EMPTY, std::memory_order_release);
                    return other ? std::optional<T>(*other) : std::nullopt;
                }
                return std::nullopt;
            }

            // 누군가 대기 중 — 교환 시도
            if (expected == State::WAITING) {
                if (state.compare_exchange_strong(expected, State::BUSY)) {
                    T* other = item.exchange(myItem, std::memory_order_acq_rel);
                    return other ? std::optional<T>(*other) : std::nullopt;
                }
            }
        }
        return std::nullopt;
    }
};
```

세 상태:

- **EMPTY** — 아무도 없음
- **WAITING** — 한 명이 기다리는 중
- **BUSY** — 두 명이 만나서 교환 중

**랜덤 슬롯 선택** — 모든 스레드가 같은 슬롯에 모이면 경합. 랜덤이라 분산됨.

**Adaptive sizing** — 경합 정도에 따라 array 크기 조정. 경합 많으면 array 크게, 적으면 작게.

## 11.7 Linearizability 보장

흥미로운 질문 — push와 pop이 elimination으로 만나면, 스택의 linearizability가 유지되는가?

**답**: 그렇다.

![Thread X의 push와 Thread Y의 pop이 elimination에서 매치되는 linearization](/images/blog/parallel-principles/diagrams/ch11-elimination.svg)

X와 Y가 elimination으로 만나는 시점이 linearization point. 그 시점에 push와 pop이 동시에 일어났다고 해석. Linearizability 정의 만족.

### Linearizability 증명 스케치 (책 11.5)

세 경우로 나눠 증명한다.

**Case 1 — 둘 다 central stack을 사용**: 두 작업의 linearization point는 각자의 CAS 성공 시점. Treiber stack과 동일.

**Case 2 — 둘 다 elimination으로 매치**: push와 pop이 같은 exchanger 슬롯에서 만남.
- linearization point = `state.CAS(WAITING, BUSY)` 성공 시점
- 그 순간: push가 *논리적으로* 먼저, pop이 *직후* 일어났다고 본다
- 결과: pop은 push의 값을 받음 — sequential 명세 만족

**Case 3 — 한쪽만 elimination**: 불가능. exchange는 매치되거나 둘 다 타임아웃. 한쪽만 성공하는 경로 없음.

핵심 관찰 — 두 작업이 elimination으로 만나면 *그 시점에 stack은 변화가 없었다*. 어떤 다른 작업도 둘 사이를 *순서적으로 관찰할 수 없다*. 그래서 사실 두 작업 모두 같은 시점에 일어났다고 봐도 sequential 명세를 만족한다.

```text
시간축:    push 시작 ─── exchange match ─── push 종료
           pop 시작  ─── exchange match ─── pop 종료
                              ↑
                       linearization point
                       (push 먼저, pop 직후)
```

이 증명이 **stack에서만 통하는** 이유: stack은 *LIFO이므로 가장 최근 push가 가장 먼저 pop된다*. 따라서 "방금 들어와서 방금 나간" 시나리오가 명세에 정확히 부합한다. FIFO queue에서는 같은 트릭이 안 된다 — 가장 오래된 원소가 dequeue되어야 하므로 elimination이 명세 위반.

## 11.7.1 EliminationBackoffStack — CAS 실패 시에만 elimination (책 Listing 11.10)

책의 권장 디자인은 *낙관적이다*. push와 pop이 먼저 central stack을 시도하고, **실패했을 때만** elimination array로 백오프한다.

```text
push(v):
    new = Node(v)
    repeat:
        if try_push_central(new):
            return                      // 빠른 경로
        // CAS 실패 — 경합 신호
        slot = random_slot()
        if elimination[slot].exchange(v, timeout) matched:
            return                      // pop과 매치
        // 매치 실패 — 다시 central 시도

pop():
    repeat:
        result = try_pop_central()
        if result.has_value:
            return result
        slot = random_slot()
        partner = elimination[slot].exchange(nullptr, timeout)
        if partner matched and partner has value:
            return partner.value
        // 매치 실패 — 다시 central 시도
```

이 구조의 묘미는 **저경합 = elimination 비활성**이라는 점이다. CAS가 성공하면 array를 건드릴 일이 없다. Treiber보다 추가 비용이 거의 없다. 고경합에서는 CAS 실패가 자동으로 elimination을 활성화 — 부하 적응적이다.

| 부하 | 빠른 경로 (central CAS) | elimination 활성도 |
|---|---|---|
| 저경합 | 거의 항상 성공 | 거의 안 씀 |
| 중경합 | 가끔 실패 | 절반 정도 매치 |
| 고경합 | 자주 실패 | 짝이 많아 매치율 높음 |

이 자기 조절(self-tuning)이 elimination backoff stack을 *실용적인* 디자인으로 만든다. JSR-166의 `ConcurrentLinkedDeque`, `LinkedTransferQueue`가 비슷한 구조.

## 11.7.2 시스템 사례 — Exchanger, RxJava, async pool

elimination의 일반화된 형태가 *직접 핸드오프(direct handoff)*다. 생산자가 task를 들고, 소비자가 빈 손으로 기다리고, 둘이 만나면 *큐를 거치지 않고* 직접 전달한다. 세 가지 실세계 시스템에서 같은 패턴을 본다.

**Java Exchanger (`java.util.concurrent.Exchanger`)** — Doug Lea가 작성한 표준 클래스. 두 스레드가 만나서 객체를 교환한다. 내부적으로 *arena*라 부르는 slot array를 두고, 경합이 적으면 한 슬롯, 많으면 여러 슬롯에 분산. JSR-166의 *adaptive arena*가 11.6의 elimination array의 정확한 일반화다.

```java
Exchanger<List<Item>> exchanger = new Exchanger<>();
// 두 스레드가 각자 List를 들고 만나서 교환
List<Item> myList = exchanger.exchange(myList);
```

**RxJava SerializedSubject / unicast bridge** — reactive stream에서 producer와 consumer를 *직접 연결*하는 패턴. 일반적인 backpressure 큐 대신, consumer가 *demand*를 표명하면 producer가 그만큼만 직접 전달한다. 큐의 메모리 비용을 줄이는 효과 — 사실상 capacity 0의 큐 = elimination.

**Async work pool (Go, Rust async)** — Go의 `runtime`은 work-stealing scheduler를 쓴다. *handoff*라 부르는 최적화: 한 goroutine이 다른 goroutine을 spawn할 때, 자신이 *block* 직전이면 새 goroutine을 *직접* runnable queue에 넣지 않고 *running CPU에 핸드오프*한다. 스케줄러 큐를 거치지 않고 immediately. 같은 elimination 발상.

| 시스템 | 핸드오프 대상 | elimination 효과 |
|---|---|---|
| Java Exchanger | 임의 객체 | arena를 통한 분산 매치 |
| RxJava Unicast | stream 이벤트 | capacity-0 큐로 메모리 절감 |
| Go runtime handoff | goroutine 실행권 | 스케줄러 큐 bypass |
| Rust tokio mpsc::channel(0) | 메시지 | sender/receiver 직접 만남 |

세 사례 모두 *큐를 만들고 통과시키는 비용 자체를 회피*한다는 점에서 elimination과 같다. 책의 stack 알고리즘은 이 일반 패턴의 *교과서 예제*인 셈.

### Random Slot 선택의 *분산 정의*

slot 선택을 균등 분포가 아닌 *thread-affinity 기반*으로 하면 더 빠를까? 직관적으로 같은 thread가 항상 같은 slot에 가면 cache locality가 좋을 것 같다. 그러나 결과적으로 짝이 안 만난다 — push thread와 pop thread가 *다른 slot*에 가둬지면 elimination 자체가 무력화.

책의 권장은 *매 시도마다 랜덤*. 시장 비유로 — 매번 다른 골목에서 만나는 게 좋다. 같은 골목만 가면 거기에 짝이 *우연히* 와야 한다. 무작위로 골목을 바꾸면 짝과 만날 *전체 확률*이 균등하다.

다만 *adaptive*: 매치 실패가 잦으면 다음 시도에서 slot 범위를 좁힌다 (짝이 적다는 신호). 매치 성공이 잦으면 범위를 넓힌다 (짝이 많아 충돌이 잦다는 신호). JSR-166의 `Exchanger.arena`가 정확히 이 동적 조정을 구현.

## 11.8 다른 elimination 응용

이 아이디어는 stack에만 국한되지 않는다.

- **Counter** — increment와 decrement
- **Set** — add와 remove
- **Map** — 어떤 키 / 어떤 값 등

서로 상쇄되는 작업 쌍이 있으면 elimination 적용 가능.

다만 — **서로 상쇄 가능한지**가 자료구조의 명세에 달려 있다. Stack/Queue/Counter에서는 쉽다. 정렬된 구조에서는 어렵다.

### Elimination이 *FIFO에서는 안 되는* 이유

stack에서 elimination이 통하는 결정적 이유는 *LIFO 명세*다. "방금 push된 원소가 다음 pop의 대상" — 그래서 push와 pop이 만나면 stack을 *건드리지 않은* 시나리오가 명세에 정확히 부합한다.

FIFO queue에서는 같은 트릭이 안 통한다. queue는 *가장 오래된 원소가 다음 dequeue의 대상*이라고 명세한다. 새로 enqueue된 원소를 즉시 dequeue가 받으면 — 명세 위반. queue에 *이미 들어 있던* 다른 원소들이 먼저 나와야 했다.

```text
Stack:                        Queue:
  push(D), pop() 만남:           enqueue(D), dequeue() 만남:
    pop이 D 받음 — OK              dequeue가 D 받음 — X!
    (LIFO이므로 최신이 다음)         (FIFO이므로 가장 오래된 원소가 다음)
```

이게 elimination이 *자료구조 명세에 의존하는* 최적화임을 보여준다. 명세가 그렇게 허용해야만 가능. queue, sorted set, priority queue에서는 비슷한 우회를 다른 방식으로 찾아야 한다 (예: priority queue의 skip list 기반 lock-free 구현은 elimination 대신 *fine-grained locking*).

## 11.9 실용성

Elimination Backoff Stack은 이론적으로 우아하다. 실용성은?

- **고경합 시 매우 빠름** — Treiber보다 수 배 빠를 수 있음
- **저경합 시 비슷** — Treiber와 거의 같음
- **복잡도** — 구현이 매우 복잡

실전에서는 라이브러리(java.util.concurrent.ConcurrentLinkedQueue 등)가 이런 최적화를 내장한다. 직접 짜는 건 어렵다.

## 정리

- **Treiber Stack** — 가장 단순한 lock-free 자료구조
- 경합이 심하면 Cache line contention으로 매우 느림
- **Elimination 아이디어** — push와 pop이 서로 상쇄 가능
- **Elimination Backoff Stack** — central stack + exchanger array
- 경합이 심할수록 elimination이 잘 작동 — **반직관적**
- Stack 외에도 적용 가능 (Counter, Set 등 — 상쇄 가능한 작업이 있다면)

## 한국 개발자의 함정

```
1. *Treiber Stack = 빠른 lock-free*라는 오해
   - 단일 코어 / 저경합에선 빠름
   - 고경합에선 cache line contention으로 락보다 느림
   - 측정 없이 lock-free 선택 금지

2. *Elimination = 무조건 더 빠름*
   - push/pop 비율이 비슷할 때만 효과
   - 비대칭 워크로드(예: push만)에선 무의미
   - 오히려 오버헤드만 추가

3. *직접 구현*하려는 시도
   - Exchanger의 state machine이 미묘
   - Linearization point 증명이 어려움
   - 라이브러리(java.util.concurrent.Exchanger) 사용

4. *Linearizability를 직관에 맡김*
   - elimination이 linearizable인 이유는 *증명* 필요
   - 비슷한 최적화에서 자주 깨짐
```

## 실무 적용

```
이론 → 실무:
- Treiber Stack          → boost::lockfree::stack
- Elimination 일반        → java.util.concurrent.Exchanger
- Stack with elimination  → JSR-166 EliminationStack (참고용)
- Lock-free deque         → boost::lockfree::stack

언어별:
- C++: boost::lockfree::stack, folly::AtomicLinkedList, std::atomic 직접 구현
- C: stdatomic.h + 직접 구현 (hazard pointer 필요)
- Java: ConcurrentLinkedDeque, Exchanger
- Rust: crossbeam::queue::SegQueue (스택 유사)
- Go: 직접 구현 드묾 — channel로 대체

설계 원칙:
- Producer-consumer 패턴 → channel/queue, stack 아님
- 진짜 LIFO 필요 시만 stack
- 측정 후 elimination 적용 (저경합엔 불필요)
```

## 자기 점검

- [ ] Treiber Stack에서 ABA는 어떻게 발생?
- [ ] Cache line contention의 메커니즘?
- [ ] Elimination이 linearizable인 이유?
- [ ] Exchanger의 세 상태 (EMPTY/WAITING/BUSY)?
- [ ] 경합과 elimination의 *반직관적* 관계?
- [ ] Elimination을 적용할 수 있는 자료구조 조건?

## 다음 장 예고

다음 장은 **Counting, Sorting, Distributed Coordination** — 분산 카운터와 정렬 네트워크.

## 관련 항목

- [Ch 10: Queue와 ABA](/blog/parallel/parallel-principles/ch10-concurrent-queues-and-the-aba-problem)
- [Ch 9: Linked Lists](/blog/parallel/parallel-principles/ch09-linked-lists-the-role-of-locking)
- [Ch 12: Counting & Sorting](/blog/parallel/parallel-principles/ch12-counting-sorting-and-distributed-coordination)
- [C++ Concurrency in Action Ch 7: Lock-free](/blog/parallel/cpp-concurrency-in-action/chapter07-designing-lock-free-concurrent-data-structures)
