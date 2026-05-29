---
title: "Ch 6: Designing lock-based concurrent data structures"
date: 2026-05-06T06:00:00
description: "thread-safe stack/queue/map 설계. 락 입자, 예외 안전, 인터페이스 vs 구현."
tags: [C++, C, Concurrency, Data Structures, Mutex]
series: "C++ Concurrency in Action"
seriesOrder: 6
draft: true
---

스레드 안전한 자료구조를 설계하는 방법을 다룬다. 단순히 뮤텍스를 감싸는 것 이상으로, 인터페이스 설계와 락 입자도가 중요하다. 6장은 lock-based 설계, 7장은 lock-free 설계로 자연스럽게 이어진다.

## 6장이 푸는 단 하나의 문제

3장의 락은 *충돌을 막는 도구*였고, 4장의 condition variable과 future는 *기다림을 조직하는 도구*였다. 6장이 묻는 것은 한 단계 더 위다. **이 도구들로 자료구조를 만들 때, 락의 입자도가 동시성과 correctness를 동시에 결정한다**. 너무 굵으면 동시성이 사라지고, 너무 가늘면 데드락과 인터페이스 race가 자란다. 그 사이의 균형이 이 장 전체의 주제다.

거칠게 말하면 결정은 셋이다. *락을 어디에 두느냐*, *인터페이스를 어떻게 묶느냐*, *예외 가능 작업을 락 안에 두느냐 밖에 두느냐*. 이 셋이 정해지면 자료구조의 동시성 상한이 정해진다.

### 비유로 잡는 락 입자도

같은 자료구조라도 락을 거는 방식에 따라 *얼마나 많은 사람이 동시에 일할 수 있는가*가 달라진다. 도서관 비유로 잡아 두면 이 장의 모든 설계가 같은 척도 위에 놓인다.

| 입자도 | 비유 | 본질 |
|--------|------|------|
| Coarse lock (단일 mutex) | 도서관 *입구*에서 한 명만 통제 | 어떤 책장이든 동시에 한 명만 |
| Fine-grained (책장 단위) | *책장별* 락 — 다른 책장은 동시에 가능 | bucket / segment / shard 분리 |
| Hand-over-hand (노드별) | 책 *한 권씩* 손에서 손으로 락 이동 | linked list traversal, 항상 같은 방향 |
| Reader-writer | 열람은 여럿, *반납·정리*는 혼자 | reader-heavy일 때만 이득 |

도서관 입구에서 한 명만 통과시키면 충돌은 없지만 *대기 줄*이 자라난다. 책장별로 락을 나누면 동시 작업자가 늘지만, *두 책장을 동시에 잡아야 하는 작업*에서 데드락이 살아난다. Hand-over-hand는 두 손이 항상 *같은 방향*으로만 락을 잡아야 데드락이 안 생긴다. Reader-writer는 *비율을 측정한 뒤*에야 이득이 보인다. 6장의 코드는 모두 이 격자 안에서 움직인다.

### 인터페이스 race — 가장 자주 놓치는 함정

락만 잘 걸면 끝이 아니다. 더 자주 놓치는 것은 *인터페이스 그 자체가 race를 만드는* 경우다. 책의 핵심 예가 `top()`과 `pop()`의 분리다.

도서관 비유로 옮기면 이렇다. 사서가 *책장의 맨 위에 무슨 책이 있는지* 알려 주는 함수와, *그 책을 꺼내 가는* 함수가 따로 있다고 하자. 한 손님이 "맨 위에 무슨 책이지?" 하고 묻고, *그 답을 듣는 순간*에 다른 손님이 그 책을 채갈 수 있다. 첫 손님이 다시 가서 꺼내면 *전혀 다른 책*이 손에 잡힌다. 각 함수의 락은 완벽했지만, *두 호출 사이의 틈*에서 race가 살아난다.

해법은 단 하나다. *질의와 변경을 한 호출로 묶어* 사서가 *책을 들고 있는 동안에는 절대 놓지 않게* 한다. `pop()` 하나에 "최상단 확인 + 꺼내기"를 합치는 것이 6장의 표준 패턴이다. 락 입자도와 무관하게, 인터페이스의 *원자성*이 우선이다.

### 시스템에서 만나는 같은 패턴

이 장의 결론은 라이브러리·커널·런타임이 이미 산업 규모로 적용해 둔 것과 같다. 같은 격자를 두 번 보면 의도가 빠르게 잡힌다.

- **Java `ConcurrentHashMap` segments**: 초기에는 16개의 *segment*마다 독립 mutex. 키의 해시 일부로 segment를 골라 그 안에서만 락. C++로 옮기면 *bucket 별 mutex*의 hash map과 같은 모델이다. Java 8 이후로는 bin-level CAS로 더 가늘어졌다.
- **Linux radix tree**: 페이지 캐시의 인덱스. 트리 노드 단위의 spinlock과 RCU 읽기 경로의 조합. *hand-over-hand가 아닌* RCU로 reader-heavy 워크로드를 극단까지 최적화한 예.
- **Folly `ConcurrentHashMap`**: Facebook의 production hash map. SIMD-friendly bucket layout과 fine-grained lock의 조합. 책의 6장 hash map 절을 *실전 규모*로 확장하면 이런 모습이 된다.
- **Rust `parking_lot::RwLock`**: 표준의 `std::sync::RwLock`보다 작은 메모리·빠른 fast path. 6장의 reader-writer 논의가 *실제 어떤 변수*로 구현되는지 보여 준다.
- **PostgreSQL buffer pool**: shared buffer마다 lightweight lock과 spinlock의 두 층. 6장의 *예외 가능 작업을 락 밖으로* 원칙을 DB 차원에서 끝까지 밀어붙인 예.

이름은 segment / shard / partition / stripe / lane으로 갈리지만, 모두 *같은 결정의 변주*다. *공유의 단위를 작게 자르고, 인터페이스를 원자 단위로 묶고, 예외 가능 작업을 락 밖으로 뺀다*.

### 설계 결정의 표준 체크리스트

스레드 안전 자료구조를 설계할 때마다 동일한 다섯 질문이 등장한다. 본문의 모든 예제(stack, queue, hash map, linked list)는 이 격자 위에서 다른 답을 고른다. 머리에 두고 읽으면 *왜 이 자료구조는 head/tail을 나누고, 저 자료구조는 못 나누는가*가 분명해진다.

1. **불변(invariant)이 깨지는 *순간*이 어디인가?** 락은 그 구간을 덮어야 한다. push의 *링크 갱신*, hand-over-hand traversal의 *두 노드 사이*가 그 자리다.
2. **인터페이스 race를 만드는 *함수 쌍*이 있는가?** 있다면 한 호출로 합친다. `top` + `pop`, `find` + `erase`, `contains` + `insert`가 흔한 함정.
3. **자료구조의 *부분*들이 독립적으로 변할 수 있는가?** stack은 못 나누지만 queue는 head/tail이 분리되고, hash map은 bucket이 자연스럽게 나뉜다.
4. **예외 가능 작업이 락 안에 있는가?** 사용자 타입의 copy/move, 할당, allocator, 콜백. 모두 락 밖으로 빼야 강한 예외 보장이 가능하다.
5. **락 획득 *순서*는 모든 멤버 함수에서 일관되는가?** 두 락을 잡을 때마다 항상 같은 방향. 일관되지 않으면 데드락은 *언제든* 발생한다.

다섯 질문에 모두 답이 나오면 자료구조의 모양은 거의 정해진다. 본문은 각 자료구조마다 이 다섯을 차례로 짚는다. 답이 막히는 자리가 *그 자료구조의 본질적 한계*다. Lock-free로 넘어가야 할 자리가 거기에서 드러난다.

### 인터페이스 race의 최소 예제

말로 풀면 자주 놓치는 함정이라, 가장 짧은 코드로 한 번 더 잡아 둔다. 다음은 *각 함수의 락이 완벽한데도* race가 살아 있는 코드다.

```cpp
// 회피 — 각 함수는 안전, 인터페이스는 race
template<typename T>
class ConcurrentStack {
public:
    bool empty() const {
        std::lock_guard<std::mutex> lk(mtx_);
        return data_.empty();
    }
    T top() const {
        std::lock_guard<std::mutex> lk(mtx_);
        return data_.top();  // throws if empty
    }
    void pop() {
        std::lock_guard<std::mutex> lk(mtx_);
        data_.pop();
    }
private:
    mutable std::mutex mtx_;
    std::stack<T> data_;
};

// 사용자 코드 — 동시에 실행되면 무너진다
if (!s.empty()) {   // (A) lock + unlock
    T v = s.top();  // (B) lock + unlock   ← 사이에 다른 스레드 pop 가능
    s.pop();        // (C) lock + unlock   ← 사이에 다른 스레드 pop 가능 → throw
    process(v);
}
```

세 함수 각각은 자신의 락을 정확히 잡는다. 그런데 사용자 코드의 *세 줄 사이*가 무방비다. (A)와 (B) 사이에 다른 스레드가 push/pop을 끼워 넣으면 (B)는 다른 값을 본다. (B)와 (C) 사이에 다른 스레드가 pop하면 (C)는 *없는 원소*를 제거하려다 `top`이 던졌을 예외 대신 *조용한 데이터 손실*을 만든다.

```cpp
// Good — 질의 + 변경을 한 호출로 묶는다
template<typename T>
class ConcurrentStack {
public:
    bool try_pop(T& out) {
        std::lock_guard<std::mutex> lk(mtx_);
        if (data_.empty()) return false;
        out = std::move(data_.top());
        data_.pop();
        return true;
    }
    // top() / empty() 분리 인터페이스는 *제공하지 않는다*
};
```

`try_pop` 하나로 "확인 + 꺼내기"를 락 안에서 끝낸다. 본문 6.2~6.3의 모든 자료구조는 이 원칙을 따른다. *분리된 함수의 락이 완벽해도 인터페이스의 시간 틈에서 race가 자란다*.

## 6.1 동시성을 위한 설계가 의미하는 것

### 스레드 안전의 두 측면

자료구조가 스레드 안전하다는 말에는 두 측면이 있다. 하나는 어떤 스레드도 자료구조의 깨진 중간 상태를 보지 않는 것이고, 다른 하나는 자료구조의 inherent 인터페이스가 race condition을 만들지 않는 것이다. 단순히 멤버 함수 각각을 mutex로 감싼다고 해서 인터페이스 race가 사라지지는 않는다.

기본 요구는 셋이다.

1. **불변성(invariant) 보호**: 어떤 스레드도 깨진 상태를 관측하지 않는다.
2. **데이터 레이스 부재**: 동시 접근이 well-defined behavior를 가진다.
3. **race condition으로부터의 인터페이스 안전**: 멤버 함수의 조합이 깨진 상태를 노출하지 않는다.

이 셋이 모두 충족되어야 자료구조는 스레드 안전이라 할 수 있다.

### 진정한 동시 접근의 기회

위 조건만 충족하면 끝이 아니다. *동시성을 위한* 설계는 한 걸음 더 나간다. 자료구조에 대해 *얼마나 많은 동시 접근이 실제로 가능한가*를 묻는다. 모든 멤버 함수를 한 mutex로 감싸면 스레드 안전은 얻지만, 사실상 임의의 시점에 한 스레드만 자료구조를 만질 수 있다. 이를 *serialization*이라 부른다. 스레드는 차례를 기다리며 줄 서고, 자료구조 자체가 동시성을 잡아먹는다.

좋은 설계는 다음을 검토한다.

- 어떤 연산이 다른 락 안에서도 안전하게 수행될 수 있는가
- 자료구조의 서로 다른 영역이 별도의 mutex로 보호될 수 있는가
- 모든 연산이 동일한 수준의 보호를 필요로 하는가
- 자료구조의 동시성을 단순한 변경만으로 향상시킬 수 있는가

이 질문들은 같은 한 가지를 가리킨다. *어디까지가 한 스레드만의 일이고, 어디서부터가 진짜 공유인가*.

### Serialization과 concurrency의 trade-off

Serialization과 concurrency는 양 끝에 있다.

| 끝점 | 의미 | 효과 |
|------|------|------|
| Serialization 최대 | 단일 mutex로 모든 연산 보호 | 스레드는 한 줄로 줄 서서 차례대로 접근 |
| Concurrency 최대 | per-element/per-node mutex | 무관한 두 연산이 동시에 진행 |

극단으로 가면 둘 다 문제다. Serialization은 throughput을 죽이고, 극단적 concurrency는 lock 획득/해제 비용, deadlock risk, cache contention을 폭발시킨다. 실무 설계는 *그 사이 어딘가에서 측정으로 점을 찍는 일*이다.

Williams는 이 trade-off의 두 가지 비대칭을 강조한다.

1. **읽기는 쓰기보다 공유 친화적이다.** Reader가 압도적이면 `std::shared_mutex`로 reader 병렬성을 확보한다. Writer가 잦으면 shared_mutex의 추가 비용이 손해다.
2. **인접 영역의 분리.** Stack은 head 하나뿐이지만 queue는 head/tail 두 끝이 있다. Tree와 list는 노드마다 독립이다. 자료구조의 *모양*이 곧 분리 가능한 lock 경계의 모양이다.

### Invariant 보호의 지침

자료구조 설계에서 invariant 보호는 다음 guideline들로 압축된다. 책에서 반복해 강조되는 원칙이다.

1. **깨진 상태를 절대로 lock 밖으로 노출하지 마라.** 멤버 함수가 mutex를 풀고 나갈 때 자료구조는 다시 invariant를 만족해야 한다.
2. **인터페이스에서 race condition 가능한 조합을 제거하라.** `empty()`, `top()`, `pop()`의 세 단계 호출은 한 스레드의 시점에서 race를 만든다. 이런 조합을 하나의 atomic 멤버로 통합한다.
3. **예외 발생을 고려하라.** 예외가 자료구조의 invariant를 깨트리지 않게 한다. RAII와 commit-or-rollback 패턴을 활용한다.
4. **lock의 범위를 최소화하라.** Lock 안에서 nested lock을 잡지 않게 한다. 다른 lock을 잡는 다른 자료구조의 멤버 함수를 lock 안에서 부르지 않는다.
5. **lock 안에서 사용자 코드를 호출하지 마라.** 콜백, allocator, copy constructor 등은 자료구조가 알지 못하는 lock을 다시 잡거나 외부에서 자료구조 자체를 재진입할 수 있다.

이 guideline들은 책이 stack, queue, hash map, list 각각의 구현에서 반복해 보여 주는 패턴이다. 다음 절에서 코드로 만난다.

### 인터페이스 race condition

3장에서 본 `top() + pop()` 문제를 다시 본다. 멤버 함수 각각은 mutex로 보호되지만, 호출 *사이*에 다른 스레드가 끼어든다.

```cpp
// 인터페이스 race
stack.empty();    // true 반환
stack.top();      // 다른 스레드가 그 사이 pop했으면?
stack.pop();
```

`empty()`가 반환되는 순간 결과는 즉시 stale이다. `top()`이 무엇을 반환하든 `pop()`이 그것을 제거하리란 보장은 없다. 해결은 *인터페이스를 재설계*하는 것이다.

```cpp
// 인터페이스 자체를 atomic 단위로
std::shared_ptr<T> value = stack.try_pop();
```

`try_pop`은 "비어 있으면 nullptr, 아니면 top 가져오고 pop"을 *한 mutex 안에서* 수행한다. 호출자는 stale empty 상태를 볼 수 없다.

### 락 입자도

| 접근 | 장점 | 단점 |
|------|------|------|
| 단일 global lock | 단순함, 검증 쉬움 | concurrency 거의 없음 |
| 연산별 lock (head/tail) | 중간 concurrency | 구현 복잡 |
| 노드별 lock | 최대 concurrency | 매우 복잡, deadlock 위험 |

선택은 측정으로 한다. 단순한 single-mutex 구현으로 시작해서, 측정된 contention이 병목임이 드러날 때 fine-grained로 옮긴다.

## 6.2 Lock-based 동시 자료구조

이 절에서는 책의 네 가지 lock-based 자료구조를 따라간다. Stack, queue (단일 mutex 버전과 fine-grained 버전), bucketed hash map, fine-grained linked list. 각 구현이 어떤 invariant를 보호하고 어떻게 concurrency를 끌어올리는지를 본다.

### 스레드 안전 스택 (Listing 6.1)

Stack은 동시 자료구조 중 가장 단순한 형태다. 한쪽 끝(top)에서만 push/pop이 일어나므로 lock granularity를 fine-grained로 쪼개기 어렵다. 그 대신 *인터페이스 race를 어떻게 제거하는가*를 가장 명확히 보여 준다.

```cpp
#include <mutex>
#include <stack>
#include <memory>
#include <stdexcept>

struct empty_stack : std::exception {
    const char* what() const noexcept override {
        return "empty stack";
    }
};

template<typename T>
class threadsafe_stack {
    std::stack<T> data_;
    mutable std::mutex mtx_;

public:
    threadsafe_stack() = default;

    threadsafe_stack(const threadsafe_stack& other) {
        std::lock_guard<std::mutex> lock(other.mtx_);
        data_ = other.data_;
    }

    threadsafe_stack& operator=(const threadsafe_stack&) = delete;

    void push(T value) {
        std::lock_guard<std::mutex> lock(mtx_);
        data_.push(std::move(value));
    }

    std::shared_ptr<T> pop() {
        std::lock_guard<std::mutex> lock(mtx_);
        if (data_.empty()) throw empty_stack();
        std::shared_ptr<T> result(
            std::make_shared<T>(std::move(data_.top())));
        data_.pop();
        return result;
    }

    void pop(T& value) {
        std::lock_guard<std::mutex> lock(mtx_);
        if (data_.empty()) throw empty_stack();
        value = std::move(data_.top());
        data_.pop();
    }

    bool empty() const {
        std::lock_guard<std::mutex> lock(mtx_);
        return data_.empty();
    }
};
```

이 구현의 설계 결정을 하나씩 분해한다.

**1. `top()` 멤버 함수 제거.** 표준 `std::stack`은 `top()`을 reference로 돌려준다. Thread-safe stack은 `top()`을 제공하지 않는다. 호출자가 `top()`을 받아 보유하는 동안 다른 스레드가 `pop()`하면 dangling reference가 되기 때문이다. `top`과 `pop`을 하나의 atomic 연산으로 통합한다.

**2. `pop()`의 두 오버로드.** 책에서 강조하는 trade-off다.

- `std::shared_ptr<T> pop()`: 호출자에게 새 `shared_ptr`을 돌려준다. Heap allocation 비용은 있지만, `T`가 copy-constructible이 아니어도 동작하고, 반환 시 발생할 수 있는 copy exception을 피한다.
- `void pop(T& value)`: 호출자가 미리 준비한 reference에 값을 옮긴다. Allocation은 없지만 `T`가 reference에 assign 가능해야 한다.

**3. 빈 stack에서의 동작.** `pop()`이 empty stack에서 호출되면 `empty_stack` exception을 던진다. "비어 있는지 먼저 보고 그다음 꺼낸다"는 race-prone 패턴 대신, "꺼내려 시도하고 빈 경우 exception"이라는 atomic 시도로 인터페이스를 통합한다. 빈 stack이 자주 정상적 경로라면 `try_pop`이 더 적절하지만, 책의 Listing 6.1은 exception 모델을 선택한다.

**4. `empty()`의 한계.** `empty()`는 보존되지만 *반환되는 순간 stale*이다. 다른 스레드가 즉시 push할 수도, pop할 수도 있다. `empty()`는 hint에 불과하다. 호출자는 `empty()` 결과로 분기하지 말고 직접 `try_pop`을 호출해야 한다.

**5. Copy constructor의 lock.** `threadsafe_stack(const threadsafe_stack& other)`는 `other.mtx_`를 잡고 데이터를 복사한다. 소스 stack이 다른 스레드에 의해 변형되는 동안 partial state를 복사하지 않게 보장한다. Member initializer list 대신 생성자 본문에서 복사한다는 점이 핵심이다. Member initializer list에서는 lock을 잡기 전에 복사가 시작된다.

**6. `mutable` mutex.** `empty()`는 `const`다. `const` 안에서 `mtx_.lock()`을 호출하려면 `mtx_`가 `mutable`이어야 한다.

**한계.** 이 구현은 모든 연산이 단일 mutex를 공유한다. Stack 자체의 모양(한쪽 끝에서만 접근)이 fine-grained로의 분할을 막는다. 두 스레드가 동시에 push하려 해도 한 명은 기다린다. 이것은 *자료구조의 본질적 한계*이지 구현의 결함이 아니다. 7장의 lock-free stack도 같은 본질적 직렬화를 가진다(CAS retry로 표현될 뿐).

**Deadlock 위험.** 멤버 함수가 mutex를 들고 있을 때 호출되는 코드는 `T`의 생성자, 소멸자, copy/move 연산, allocator뿐이다. 이들이 *해당 stack의 다른 멤버 함수를 다시 호출하면* deadlock이다. 책은 이 위험을 명시적으로 경고한다. 사용자 정의 타입을 stack에 넣을 때, 그 타입의 copy 연산이 같은 stack을 만지는 경로를 가지면 안 된다.

### C11 스레드 안전 스택

```c
// C11 <threads.h> 기반 스레드 안전 스택
#include <threads.h>
#include <stdlib.h>
#include <stdbool.h>

typedef struct StackNode {
    void* data;
    struct StackNode* next;
} StackNode;

typedef struct {
    StackNode* head;
    mtx_t mtx;
} ThreadsafeStack;

int ts_stack_init(ThreadsafeStack* s) {
    s->head = NULL;
    return mtx_init(&s->mtx, mtx_plain);
}

void ts_stack_destroy(ThreadsafeStack* s) {
    mtx_lock(&s->mtx);
    while (s->head != NULL) {
        StackNode* old = s->head;
        s->head = old->next;
        free(old);
    }
    mtx_unlock(&s->mtx);
    mtx_destroy(&s->mtx);
}

void ts_stack_push(ThreadsafeStack* s, void* data) {
    StackNode* new_node = malloc(sizeof(StackNode));
    new_node->data = data;

    mtx_lock(&s->mtx);
    new_node->next = s->head;
    s->head = new_node;
    mtx_unlock(&s->mtx);
}

bool ts_stack_try_pop(ThreadsafeStack* s, void** out_data) {
    mtx_lock(&s->mtx);
    if (s->head == NULL) {
        mtx_unlock(&s->mtx);
        return false;
    }
    StackNode* old = s->head;
    *out_data = old->data;
    s->head = old->next;
    mtx_unlock(&s->mtx);
    free(old);
    return true;
}

bool ts_stack_empty(ThreadsafeStack* s) {
    mtx_lock(&s->mtx);
    bool empty = (s->head == NULL);
    mtx_unlock(&s->mtx);
    return empty;
}
```

### Stack의 한계와 다음 단계

- **단일 mutex**: push와 pop이 동시에 불가.
- **인터페이스 통합으로 race 제거**: top + pop의 분리 호출이 불가능하게 설계.
- **shared_ptr 반환으로 exception safety**: 반환 시 copy가 던지더라도 stack 상태는 이미 일관됨.

다음으로 queue를 본다. Queue는 head/tail의 두 끝을 가지므로 stack보다 fine-grained로 쪼갤 여지가 있다.

### 스레드 안전 큐: 조건 변수 버전 (Listing 6.2)

Queue는 stack과 달리 *waiting*이 핵심 기능이 된다. Producer-consumer 패턴에서 consumer는 큐가 비었을 때 단순히 실패를 받기보다 "데이터가 도착할 때까지 기다리는" 동작을 원한다. 이를 위해 `std::condition_variable`이 도입된다.

```cpp
#include <queue>
#include <mutex>
#include <condition_variable>
#include <memory>

template<typename T>
class threadsafe_queue {
    std::queue<T> data_;
    mutable std::mutex mtx_;
    std::condition_variable cv_;

public:
    threadsafe_queue() = default;

    void push(T value) {
        std::lock_guard<std::mutex> lock(mtx_);
        data_.push(std::move(value));
        cv_.notify_one();
    }

    void wait_and_pop(T& value) {
        std::unique_lock<std::mutex> lock(mtx_);
        cv_.wait(lock, [this] { return !data_.empty(); });
        value = std::move(data_.front());
        data_.pop();
    }

    std::shared_ptr<T> wait_and_pop() {
        std::unique_lock<std::mutex> lock(mtx_);
        cv_.wait(lock, [this] { return !data_.empty(); });
        std::shared_ptr<T> result(
            std::make_shared<T>(std::move(data_.front())));
        data_.pop();
        return result;
    }

    bool try_pop(T& value) {
        std::lock_guard<std::mutex> lock(mtx_);
        if (data_.empty()) return false;
        value = std::move(data_.front());
        data_.pop();
        return true;
    }

    std::shared_ptr<T> try_pop() {
        std::lock_guard<std::mutex> lock(mtx_);
        if (data_.empty()) return std::shared_ptr<T>();
        std::shared_ptr<T> result(
            std::make_shared<T>(std::move(data_.front())));
        data_.pop();
        return result;
    }

    bool empty() const {
        std::lock_guard<std::mutex> lock(mtx_);
        return data_.empty();
    }
};
```

설계 결정의 핵심들이다.

**1. `wait_and_pop`과 `try_pop`의 분리.** Williams는 인터페이스를 네 개로 통합한다. `wait_and_pop` 두 오버로드(reference 인자, shared_ptr 반환)와 `try_pop` 두 오버로드. `wait_and_pop`은 데이터가 도착할 때까지 블록하고, `try_pop`은 즉시 반환한다. 호출자는 자기 의도에 맞는 변종을 선택한다.

**2. Condition variable의 predicate.** `cv_.wait(lock, [this] { return !data_.empty(); })`는 spurious wakeup에 안전하다. Wait이 깨어났을 때 predicate를 재검사하므로, push되지 않은 상태로 잘못 깨어나도 다시 잠든다. Predicate 형태가 표준이다.

**3. Push의 notify.** `push`는 mutex를 잡은 채 `notify_one`을 호출해도 되고, mutex를 풀고 호출해도 된다. 책은 mutex를 잡은 채 호출하는 형태를 보여 준다(데이터가 enqueue된 직후). 두 방식 모두 정확하지만, mutex를 푼 뒤 notify하면 깨어난 wait이 즉시 lock을 잡을 수 있어 약간의 latency 이득이 있다.

**4. shared_ptr 반환의 또 다른 이유.** Stack에서와 마찬가지로 exception safety다. 그러나 queue에서는 추가 이점이 있다. 책의 Listing 6.3은 이 발상을 더 발전시켜 *queue가 내부적으로 `std::shared_ptr<T>`를 저장하는* 변종을 제시한다. Push가 shared_ptr을 만들면서 발생할 수 있는 할당 비용이 mutex *밖*에서 일어나, 임계 영역이 더 짧아진다.

```cpp
// Listing 6.3 — shared_ptr을 내부에 저장
template<typename T>
class threadsafe_queue {
    std::queue<std::shared_ptr<T>> data_;
    mutable std::mutex mtx_;
    std::condition_variable cv_;

public:
    void push(T new_value) {
        std::shared_ptr<T> data(
            std::make_shared<T>(std::move(new_value)));  // lock 밖
        std::lock_guard<std::mutex> lock(mtx_);
        data_.push(data);
        cv_.notify_one();
    }

    std::shared_ptr<T> wait_and_pop() {
        std::unique_lock<std::mutex> lock(mtx_);
        cv_.wait(lock, [this] { return !data_.empty(); });
        std::shared_ptr<T> result = data_.front();
        data_.pop();
        return result;
    }
    // ...
};
```

Allocation은 단일 mutex 버전에서도 push의 일부였지만, 내부 표현이 shared_ptr이면 *push와 pop 모두* 임계 영역 안에서 어떤 allocation도 하지 않는다. `data_.push(data)`는 pointer copy(noexcept)다. `wait_and_pop`은 front를 가져와서 pop하기만 하며, exception을 던지지 않는다.

### C11 스레드 안전 큐

```c
// C11 <threads.h> 기반 스레드 안전 큐 (조건 변수 사용)
#include <threads.h>
#include <stdlib.h>
#include <stdbool.h>

typedef struct QueueNode {
    void* data;
    struct QueueNode* next;
} QueueNode;

typedef struct {
    QueueNode* head;
    QueueNode* tail;
    mtx_t mtx;
    cnd_t not_empty;
} ThreadsafeQueue;

int ts_queue_init(ThreadsafeQueue* q) {
    q->head = NULL;
    q->tail = NULL;
    if (mtx_init(&q->mtx, mtx_plain) != thrd_success) return -1;
    if (cnd_init(&q->not_empty) != thrd_success) {
        mtx_destroy(&q->mtx);
        return -1;
    }
    return 0;
}

void ts_queue_destroy(ThreadsafeQueue* q) {
    mtx_lock(&q->mtx);
    while (q->head != NULL) {
        QueueNode* old = q->head;
        q->head = old->next;
        free(old);
    }
    mtx_unlock(&q->mtx);
    cnd_destroy(&q->not_empty);
    mtx_destroy(&q->mtx);
}

void ts_queue_push(ThreadsafeQueue* q, void* data) {
    QueueNode* new_node = malloc(sizeof(QueueNode));
    new_node->data = data;
    new_node->next = NULL;

    mtx_lock(&q->mtx);
    if (q->tail == NULL) {
        q->head = q->tail = new_node;
    } else {
        q->tail->next = new_node;
        q->tail = new_node;
    }
    cnd_signal(&q->not_empty);
    mtx_unlock(&q->mtx);
}

void ts_queue_wait_and_pop(ThreadsafeQueue* q, void** out_data) {
    mtx_lock(&q->mtx);
    while (q->head == NULL) {
        cnd_wait(&q->not_empty, &q->mtx);
    }
    QueueNode* old = q->head;
    *out_data = old->data;
    q->head = old->next;
    if (q->head == NULL) q->tail = NULL;
    mtx_unlock(&q->mtx);
    free(old);
}

bool ts_queue_try_pop(ThreadsafeQueue* q, void** out_data) {
    mtx_lock(&q->mtx);
    if (q->head == NULL) {
        mtx_unlock(&q->mtx);
        return false;
    }
    QueueNode* old = q->head;
    *out_data = old->data;
    q->head = old->next;
    if (q->head == NULL) q->tail = NULL;
    mtx_unlock(&q->mtx);
    free(old);
    return true;
}
```

### Fine-grained lock queue (Listing 6.6)

Single-mutex queue는 push와 pop이 같은 lock을 두고 다툰다. Queue가 producer-heavy workload에 쓰일 때 push가 자주 일어나면, consumer의 pop은 무관한 끝(head)을 만지면서도 push의 lock을 기다리게 된다. 자료구조의 *모양*은 두 끝을 분리할 수 있다. Head를 위한 lock과 tail을 위한 lock을 따로 둘 수 있다.

문제는 단순한 linked list에서 head와 tail이 *겹치는 경우*다. List에 노드가 하나면 head == tail이다. List가 비면 둘 다 null이다. 이 겹침 영역에서 head_mtx와 tail_mtx의 분리는 동작하지 않는다. 책의 해법은 *dummy node*다. 빈 queue도 항상 하나의 dummy 노드를 가져, head와 tail이 같은 노드를 가리키더라도 그 노드는 데이터가 없는 sentinel이다. Push는 dummy의 data를 채우고 새 dummy를 next로 매단다. Pop은 옛 head(데이터를 가진 노드)를 제거하고, 그 next(dummy일 수도 있고 데이터일 수도 있는 노드)를 새 head로 삼는다.

![Fine-grained 큐 구조](/images/blog/parallel/diagrams/fine-grained-queue.svg)

```cpp
template<typename T>
class threadsafe_queue {
    struct node {
        std::shared_ptr<T> data;
        std::unique_ptr<node> next;
    };

    std::mutex head_mtx_;
    std::unique_ptr<node> head_;
    std::mutex tail_mtx_;
    node* tail_;

    node* get_tail() {
        std::lock_guard<std::mutex> tail_lock(tail_mtx_);
        return tail_;
    }

    std::unique_ptr<node> pop_head() {
        std::lock_guard<std::mutex> head_lock(head_mtx_);
        if (head_.get() == get_tail()) {
            return nullptr;
        }
        std::unique_ptr<node> old_head = std::move(head_);
        head_ = std::move(old_head->next);
        return old_head;
    }

public:
    threadsafe_queue() : head_(new node), tail_(head_.get()) {}

    threadsafe_queue(const threadsafe_queue&) = delete;
    threadsafe_queue& operator=(const threadsafe_queue&) = delete;

    void push(T new_value) {
        std::shared_ptr<T> new_data(
            std::make_shared<T>(std::move(new_value)));
        std::unique_ptr<node> p(new node);
        node* const new_tail = p.get();
        std::lock_guard<std::mutex> tail_lock(tail_mtx_);
        tail_->data = new_data;
        tail_->next = std::move(p);
        tail_ = new_tail;
    }

    std::shared_ptr<T> try_pop() {
        std::unique_ptr<node> old_head = pop_head();
        return old_head ? old_head->data : std::shared_ptr<T>();
    }
};
```

설계의 핵심들이다.

**1. Dummy node로 head/tail 겹침 회피.** 생성자는 `head_(new node), tail_(head_.get())`. 빈 queue가 *하나의 빈 노드*를 가진다. 이 노드의 `data`는 null이다. Push가 처음 호출되면 이 dummy의 `data`가 채워지고, 새 dummy가 추가되며 tail이 그쪽으로 이동한다. 어떤 시점에서도 head는 "다음에 pop될 데이터를 가진 노드 또는 dummy"를 가리키고, tail은 항상 dummy를 가리킨다.

**2. Lock 안에서 allocation 회피.** `push`는 `new_data`와 새 노드 `p`를 *lock 밖에서* 만든다. 새 노드의 allocation은 tail_mtx와 무관한 작업이다. 그다음 tail_mtx를 잡고, 기존 dummy의 data를 채우고 next를 새 dummy로 연결하고 tail 포인터를 옮긴다. Lock 안의 작업은 모두 pointer assignment뿐이다.

**3. `get_tail`의 lock.** `pop_head`는 head_mtx를 먼저 잡고 그 안에서 `get_tail()`을 호출한다. `get_tail()`은 tail_mtx를 잠시 잡고 tail 포인터를 읽어 돌려준다. *lock 획득 순서가 head_mtx → tail_mtx* 한 방향이다. Deadlock을 피하려면 push도 같은 순서를 따라야 한다. Push는 tail_mtx만 잡으므로 head_mtx를 잡지 않고, 순서 위배가 일어날 일이 없다. 만약 어떤 멤버 함수가 두 lock을 모두 잡아야 한다면 *반드시 head_mtx → tail_mtx* 순서를 따라야 한다.

**4. Pop과 push의 진정한 동시 실행.** 비어 있지 않은 queue에서 pop은 head_mtx 안에서 옛 head 노드를 떼어내고, push는 tail_mtx 안에서 dummy의 data를 채운다. 두 작업은 *다른 노드를 만진다*. Head ≠ tail이면 진짜 동시에 진행된다.

**5. Pop이 empty를 검사하는 방식.** `head_.get() == get_tail()`은 "head와 tail이 같은 노드"를 검사한다. 같으면 dummy 하나만 있는 빈 queue다. `head_.empty()`나 `data == null` 같은 검사가 아니라 *두 끝이 만나는지*를 본다.

**6. `try_pop`의 인터페이스.** Listing 6.6은 condition variable을 다시 도입하지 않는다. `try_pop`만 노출한다. Wait 지원을 다시 붙이려면 push의 lock 안에서 `cv_.notify_one()`을 호출하고, `wait_and_pop`은 head_mtx와 cv로 wait하면 된다. 책은 이 확장을 Listing 6.7~6.8에서 보여 준다.

**한계.** 두 mutex의 도입은 contention을 줄이지만 *완전한 동시성*은 아니다. 같은 끝(head 또는 tail)을 만지는 두 스레드는 여전히 줄을 선다. 두 consumer가 동시에 pop하려 하면 한 명은 head_mtx에서 기다린다. 진정한 lock-free queue는 7장에서 다룬다.

### C11 Fine-grained 락 큐

```c
// C11 Two-Lock Queue (head/tail 분리)
#include <threads.h>
#include <stdlib.h>
#include <stdbool.h>

typedef struct FGNode {
    void* data;
    struct FGNode* next;
} FGNode;

typedef struct {
    FGNode* head;
    FGNode* tail;
    mtx_t head_mtx;
    mtx_t tail_mtx;
} FineGrainedQueue;

int fg_queue_init(FineGrainedQueue* q) {
    // 더미 노드 생성
    FGNode* dummy = malloc(sizeof(FGNode));
    dummy->data = NULL;
    dummy->next = NULL;

    q->head = q->tail = dummy;

    if (mtx_init(&q->head_mtx, mtx_plain) != thrd_success) return -1;
    if (mtx_init(&q->tail_mtx, mtx_plain) != thrd_success) {
        mtx_destroy(&q->head_mtx);
        return -1;
    }
    return 0;
}

void fg_queue_push(FineGrainedQueue* q, void* data) {
    FGNode* new_node = malloc(sizeof(FGNode));
    new_node->data = data;
    new_node->next = NULL;

    mtx_lock(&q->tail_mtx);
    q->tail->next = new_node;
    q->tail = new_node;
    mtx_unlock(&q->tail_mtx);
}

bool fg_queue_try_pop(FineGrainedQueue* q, void** out_data) {
    mtx_lock(&q->head_mtx);
    FGNode* old_head = q->head;
    FGNode* new_head = old_head->next;

    if (new_head == NULL) {
        mtx_unlock(&q->head_mtx);
        return false;  // 큐가 비어 있음
    }

    *out_data = new_head->data;
    q->head = new_head;
    mtx_unlock(&q->head_mtx);

    free(old_head);  // 이전 더미 노드 해제
    return true;
}
```

### Bucketed concurrent hash map (Listing 6.11)

Hash map의 동시성 설계는 *bucket 단위로의 분할*에 기반한다. 일반적 단일 chained hash table은 buckets 배열을 가지고, 각 bucket은 충돌한 key들의 list다. 두 key의 hash가 다른 bucket에 떨어지면 *두 연산은 서로 만지지 않는다*. Bucket마다 mutex를 두면 무관한 key 쌍은 동시에 처리된다.

책의 설계는 두 가지 추가 결정을 한다.

1. **고정 bucket 수.** Buckets 배열을 처음에 고정 크기(소수가 권장됨)로 만들고 rehashing은 하지 않는다. Rehashing은 *모든 bucket*을 일시에 lock해야 하므로 동시성을 산산조각낸다. 책의 Listing 6.11은 의도적으로 이 복잡함을 피한다.
2. **Bucket당 `shared_mutex`.** Lookup이 압도적으로 잦은 hash map의 특성을 고려해 reader-writer lock을 쓴다. 같은 bucket에서도 여러 reader가 동시에 진행된다. Writer는 exclusive하게 잡는다.

```cpp
#include <vector>
#include <list>
#include <shared_mutex>
#include <functional>
#include <algorithm>

template<typename Key, typename Value, typename Hash = std::hash<Key>>
class threadsafe_map {
    class bucket {
        using bucket_value = std::pair<Key, Value>;
        using bucket_data = std::list<bucket_value>;
        bucket_data data_;
        mutable std::shared_mutex mtx_;

        typename bucket_data::iterator find_entry(const Key& key) {
            return std::find_if(data_.begin(), data_.end(),
                [&](const bucket_value& item) {
                    return item.first == key;
                });
        }

    public:
        Value value_for(const Key& key, const Value& default_value) const {
            std::shared_lock lock(mtx_);
            auto it = std::find_if(data_.begin(), data_.end(),
                [&](const bucket_value& item) {
                    return item.first == key;
                });
            return it == data_.end() ? default_value : it->second;
        }

        void add_or_update(const Key& key, const Value& value) {
            std::unique_lock lock(mtx_);
            auto it = find_entry(key);
            if (it == data_.end()) {
                data_.push_back({key, value});
            } else {
                it->second = value;
            }
        }

        void remove(const Key& key) {
            std::unique_lock lock(mtx_);
            auto it = find_entry(key);
            if (it != data_.end()) {
                data_.erase(it);
            }
        }
    };

    std::vector<std::unique_ptr<bucket>> buckets_;
    Hash hasher_;

    bucket& get_bucket(const Key& key) const {
        size_t index = hasher_(key) % buckets_.size();
        return *buckets_[index];
    }

public:
    explicit threadsafe_map(size_t num_buckets = 19)
        : buckets_(num_buckets) {
        for (auto& b : buckets_) {
            b = std::make_unique<bucket>();
        }
    }

    threadsafe_map(const threadsafe_map&) = delete;
    threadsafe_map& operator=(const threadsafe_map&) = delete;

    Value value_for(const Key& key, const Value& default_value = Value()) const {
        return get_bucket(key).value_for(key, default_value);
    }

    void add_or_update(const Key& key, const Value& value) {
        get_bucket(key).add_or_update(key, value);
    }

    void remove(const Key& key) {
        get_bucket(key).remove(key);
    }
};
```

설계 포인트들이다.

**1. Bucket-level locking.** `get_bucket(key)`는 hash로 bucket 인덱스를 구하고 그 bucket을 돌려준다. 모든 멤버 함수가 *해당 bucket의 lock만* 잡는다. 두 다른 key의 hash가 다른 bucket에 떨어지면 두 연산은 완전히 독립이다.

**2. `shared_mutex`로 reader 병렬.** `value_for`는 `std::shared_lock`을 잡아 같은 bucket을 여러 reader가 동시에 읽을 수 있게 한다. `add_or_update`, `remove`는 `std::unique_lock`을 잡는다. Reader heavy인 hash map의 전형적 trade-off다. Writer가 잦으면 `std::shared_mutex`의 추가 비용(typical 구현에서 약 2-3배 무거움)이 손해다.

**3. 고정 bucket 수.** 생성자에서 받은 수의 bucket으로 시작해 변하지 않는다. Rehashing 없이도 chained list가 길어지는 만큼 lookup이 O(list 길이)로 늘어나지만, 일정 부하 인자(load factor)를 알고 있는 application에서는 무리가 없다. 책의 권장은 19, 31, 53 같은 소수다.

**4. 전체 snapshot 연산의 다중 lock.** 책은 `get_map()` 같은 "현재 상태를 snapshot"하는 연산을 위해 *모든 bucket을 lock 순서대로* 잡는 패턴을 보여 준다. 인덱스 순서로 잡으면 deadlock이 없다. 일관된 snapshot이 필요한 경우에만 쓰고, 일반 lookup은 single-bucket lock만 잡는다.

```cpp
// 모든 bucket을 인덱스 순서로 잡아 snapshot
std::map<Key, Value> get_map() const {
    std::vector<std::unique_lock<std::shared_mutex>> locks;
    for (auto& b : buckets_) {
        locks.emplace_back(b->mtx_);  // 순서대로 잡으면 deadlock 없음
    }
    std::map<Key, Value> result;
    for (auto& b : buckets_) {
        for (auto& entry : b->data_) {
            result.insert(entry);
        }
    }
    return result;
}
```

**5. 인터페이스 race 처리.** Hash map의 인터페이스 race는 stack/queue와 다른 양상이다. "key가 있는지 보고 있으면 가져온다"는 두 단계 호출은 race-prone이다. `value_for(key, default)`는 한 lock 안에서 검색하고, 없으면 default를 돌려주는 atomic 연산으로 통합한다. "있으면 get, 없으면 put"이 필요하면 별도 `get_or_insert` 같은 atomic 멤버를 추가해야 한다.

### C11 + POSIX bucketed hash map (요약)

C11 `<threads.h>`는 reader-writer lock을 제공하지 않는다. POSIX `pthread_rwlock_t`로 보완한다. 핵심 구조만 보인다.

```c
#include <pthread.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

#define NUM_BUCKETS 19

typedef struct Entry {
    char* key;
    int value;
    struct Entry* next;
} Entry;

typedef struct {
    Entry* head;
    pthread_rwlock_t lock;
} Bucket;

typedef struct {
    Bucket buckets[NUM_BUCKETS];
} ThreadsafeMap;

bool ts_map_get(ThreadsafeMap* m, const char* key, int* out_value) {
    size_t idx = /* hash(key) */ 0 % NUM_BUCKETS;
    Bucket* b = &m->buckets[idx];

    pthread_rwlock_rdlock(&b->lock);   // 읽기 lock — 동시 reader 허용
    for (Entry* e = b->head; e != NULL; e = e->next) {
        if (strcmp(e->key, key) == 0) {
            *out_value = e->value;
            pthread_rwlock_unlock(&b->lock);
            return true;
        }
    }
    pthread_rwlock_unlock(&b->lock);
    return false;
}

void ts_map_put(ThreadsafeMap* m, const char* key, int value) {
    size_t idx = /* hash(key) */ 0 % NUM_BUCKETS;
    Bucket* b = &m->buckets[idx];

    pthread_rwlock_wrlock(&b->lock);   // 쓰기 lock — exclusive
    for (Entry* e = b->head; e != NULL; e = e->next) {
        if (strcmp(e->key, key) == 0) {
            e->value = value;
            pthread_rwlock_unlock(&b->lock);
            return;
        }
    }
    Entry* new_entry = malloc(sizeof(Entry));
    new_entry->key = strdup(key);
    new_entry->value = value;
    new_entry->next = b->head;
    b->head = new_entry;
    pthread_rwlock_unlock(&b->lock);
}
```

C++ 버전과 동등한 설계다. Bucket마다 rwlock을 두어 reader는 동시 진행, writer는 exclusive. 다른 bucket의 연산은 완전 독립.

### Fine-grained linked list (Listing 6.13)

Hash map은 bucket을 잘라 무관한 key를 동시에 처리했다. Linked list는 같은 발상을 *노드 단위로* 끌고 간다. 노드마다 mutex를 두고, 순회 중 한 번에 두 노드의 lock만 잡는 *hand-over-hand locking*을 쓴다. 한 스레드가 list의 앞쪽을 보는 동안 다른 스레드가 뒤쪽에서 무관한 작업을 동시에 진행한다.

이 구조는 책에서 가장 정교한 lock-based 자료구조다. Lock-free까지 가지 않으면서 가능한 만큼의 동시성을 짜낸다.

```cpp
template<typename T>
class threadsafe_list {
    struct node {
        std::mutex m;
        std::shared_ptr<T> data;
        std::unique_ptr<node> next;

        node() : next() {}  // dummy head
        node(const T& value) : data(std::make_shared<T>(value)) {}
    };

    node head_;

public:
    threadsafe_list() = default;
    ~threadsafe_list() {
        remove_if([](const node&) { return true; });
    }

    threadsafe_list(const threadsafe_list&) = delete;
    threadsafe_list& operator=(const threadsafe_list&) = delete;

    void push_front(const T& value) {
        std::unique_ptr<node> new_node(new node(value));
        std::lock_guard<std::mutex> lk(head_.m);
        new_node->next = std::move(head_.next);
        head_.next = std::move(new_node);
    }

    template<typename Function>
    void for_each(Function f) {
        node* current = &head_;
        std::unique_lock<std::mutex> lk(head_.m);
        while (node* const next = current->next.get()) {
            std::unique_lock<std::mutex> next_lk(next->m);
            lk.unlock();                 // 이전 노드 해제
            f(*next->data);
            current = next;
            lk = std::move(next_lk);     // 다음 노드 lock 인계
        }
    }

    template<typename Predicate>
    std::shared_ptr<T> find_first_if(Predicate p) {
        node* current = &head_;
        std::unique_lock<std::mutex> lk(head_.m);
        while (node* const next = current->next.get()) {
            std::unique_lock<std::mutex> next_lk(next->m);
            lk.unlock();
            if (p(*next->data)) {
                return next->data;
            }
            current = next;
            lk = std::move(next_lk);
        }
        return std::shared_ptr<T>();
    }

    template<typename Predicate>
    void remove_if(Predicate p) {
        node* current = &head_;
        std::unique_lock<std::mutex> lk(head_.m);
        while (node* const next = current->next.get()) {
            std::unique_lock<std::mutex> next_lk(next->m);
            if (p(*next->data)) {
                std::unique_ptr<node> old_next = std::move(current->next);
                current->next = std::move(next->next);
                next_lk.unlock();        // 떼어낸 노드의 lock 해제
            } else {
                lk.unlock();
                current = next;
                lk = std::move(next_lk);
            }
        }
    }
};
```

핵심 패턴이 hand-over-hand locking이다.

**1. Dummy head node.** Stack/queue의 dummy node 패턴과 같은 발상이다. List가 비어 있어도 head_가 하나 있고, 실제 첫 데이터는 `head_.next`다. 이로써 push_front, remove_if 모두 *어떤 노드의 next pointer를 수정한다*는 단일 패턴으로 통일된다. Head를 특수 처리하는 분기가 사라진다.

**2. Hand-over-hand locking.** `for_each`의 루프를 본다. 현재 lock(`lk`)을 들고 있는 상태에서 다음 노드의 lock(`next_lk`)을 *먼저 잡는다*. 두 lock을 모두 들고 있는 짧은 순간에 다음 노드로 이동한다. 그다음 이전 lock을 풀고(`lk.unlock()`), 사용자 함수 `f`를 호출한다. 이 시점에 이전 노드는 다른 스레드가 자유롭게 만질 수 있다. 다음 iteration을 위해 `lk = std::move(next_lk)`로 lock 소유권을 옮긴다.

**3. 일관된 lock 순서.** Hand-over-hand는 항상 *list의 앞쪽에서 뒤쪽*으로만 lock을 잡는다. 모든 스레드가 같은 방향이므로 deadlock이 발생할 수 없다. 만약 어떤 연산이 뒤에서 앞으로 lock을 잡는다면, 두 연산이 정반대 방향으로 만나 deadlock이다. 책의 모든 멤버 함수가 같은 방향 규칙을 따른다.

**4. Remove의 노드 분리.** `remove_if`는 predicate가 true이면 `current->next`를 옮겨 떼어낸다. `current`의 lock(`lk`)은 유지된 채로 `current->next`를 수정한다. 그다음 떼어낸 노드의 lock(`next_lk`)을 풀고, `current`의 next는 다음 노드를 가리키므로 `current`의 lock을 그대로 유지한 채 루프가 다음 반복으로 진행한다. 떼어낸 노드의 deallocation은 `std::unique_ptr`의 RAII로 처리된다.

**5. Reverse traversal의 부재.** 이 list는 forward traversal만 지원한다. Backward iteration이나 random access는 hand-over-hand 패턴과 어울리지 않는다. Backward로 가면 lock 순서가 반대가 되고, random access는 hand-over-hand의 점진적 lock 인계와 맞지 않는다. 책의 list는 의도적으로 *작업의 종류를 제한*해서 동시성을 얻는다.

**6. 진정한 동시 traversal.** 두 스레드가 동시에 `for_each`를 시작하면, 두 스레드는 list 위에서 *서로 다른 위치*에 있게 된다. 한 명이 앞쪽 노드를 처리하는 동안 다른 명이 뒤쪽 노드를 처리한다. List의 절반씩이 동시에 처리되는 모습이 된다. Push_front는 head_의 lock만 잡으므로 traversal 중에도 새 노드 추가가 가능하다(단, 이미 traversal이 지나간 자리에 추가됨).

**한계.** 이 구현은 노드마다 mutex를 가진다. Mutex 한 개당 대개 40-80 bytes의 추가 메모리가 든다. 큰 list에서는 메모리 footprint가 크다. 또한 lock 획득/해제 비용이 모든 노드 접근마다 들어가, *contention이 낮은 경우*에는 단일 mutex보다 느리다. Fine-grained는 contention이 실제로 발생할 때만 이긴다.

### 각 자료구조의 선택 기준

네 가지 구현을 비교한다. 어떤 자료구조에 어떤 lock 전략을 쓸지 선택하는 표다.

| 자료구조 | Lock 전략 | 동시 접근 가능 영역 | 적합한 경우 |
|---------|-----------|---------------------|------------|
| `threadsafe_stack` (Listing 6.1) | 단일 mutex | 없음 (직렬) | Stack은 본질적으로 한 끝만 가짐. 단순함이 우선. |
| `threadsafe_queue` (Listing 6.2/6.3) | 단일 mutex + cv | 없음 (직렬) | Wait 지원이 필요한 producer-consumer. Contention 낮을 때. |
| `threadsafe_queue` fine-grained (Listing 6.6) | head_mtx + tail_mtx | Push vs pop | Producer-heavy 또는 consumer-heavy workload에서 head/tail이 다른 노드일 때. |
| `threadsafe_map` (Listing 6.11) | bucket당 `shared_mutex` | 다른 bucket / 같은 bucket의 reader | Reader-heavy hash map. Key 분포가 균일할 때. |
| `threadsafe_list` (Listing 6.13) | 노드당 mutex | List의 다른 부분 | 긴 list의 traversal/search가 잦고 동시 진행이 가능할 때. |

선택의 일반 원칙들이다.

**1. 단일 mutex부터 시작.** 측정으로 contention이 병목임이 드러날 때만 fine-grained로 옮긴다. Fine-grained는 구현 복잡도와 lock 비용을 추가한다.

**2. 자료구조의 모양이 lock 경계를 정한다.** Stack은 한 끝, queue는 두 끝, hash map은 bucket, list는 노드. 동시성의 가능 정도는 자료구조 자체가 결정한다.

**3. Reader/writer 비율을 측정해서 `shared_mutex` 결정.** `shared_mutex`는 일반 mutex보다 무거우므로, reader가 압도적이지 않으면 손해다. 대개 read:write = 10:1 이상일 때 이득이 명확하다.

**4. Lock 안의 작업 시간이 짧을 때만 fine-grained가 이긴다.** Lock granularity를 쪼개도 lock 보유 시간이 길면 무관한 스레드도 자주 막힌다. 임계 영역 자체를 짧게 유지하는 게 더 중요한 경우가 많다.

**5. Fine-grained의 함정.** 노드/bucket 단위 lock은 cache contention을 만들 수 있다. False sharing(같은 cache line의 다른 mutex가 cache invalidation을 유발)이 일어나기 쉽다. `alignas`로 cache line 정렬을 강제하면 메모리 footprint가 더 커진다. 측정 없이는 이득을 단정할 수 없다.

## 6.3 예외 안전성과 lock 범위

### 보장 수준의 분류

C++ 표준 라이브러리가 따르는 예외 안전성 분류는 동시 자료구조 설계에도 그대로 적용된다.

| 수준 | 의미 |
|------|------|
| 없음 | 예외 시 상태 불명. 사용 불가. |
| 기본 보장 | 예외 시에도 유효한 상태. 데이터는 손실될 수 있음. |
| 강한 보장 | 예외 시 호출 전 상태로 복귀. Commit-or-rollback. |
| 무예외(`noexcept`) | 예외를 던지지 않음. |

동시 자료구조에서는 invariant 보호가 더욱 엄격해야 한다. 한 스레드의 예외가 *다른 스레드가 관측하는* 자료구조 상태를 깨뜨리면 안 된다.

### 예외 가능 작업을 lock 밖으로

핵심 패턴이다. 예외를 던질 수 있는 작업(메모리 할당, 사용자 타입의 copy/move)은 lock을 잡기 전에 수행한다. Lock 안의 작업은 가급적 noexcept만 두고, exception이 발생하더라도 자료구조의 invariant가 깨지지 않게 한다.

```cpp
// Listing 6.6의 push 패턴
void push(T new_value) {
    std::shared_ptr<T> new_data(
        std::make_shared<T>(std::move(new_value)));  // exception 가능, lock 밖
    std::unique_ptr<node> p(new node);               // exception 가능, lock 밖
    node* const new_tail = p.get();
    std::lock_guard<std::mutex> tail_lock(tail_mtx_);
    tail_->data = new_data;                          // pointer assign, noexcept
    tail_->next = std::move(p);                      // ownership transfer, noexcept
    tail_ = new_tail;                                // pointer assign, noexcept
}
```

이 패턴이 fine-grained queue, hash map, list 전반에 나타난다. Allocation을 lock 밖에서 마치고, lock 안에서는 pointer 조작만 한다. Lock 안에서 던질 수 있는 exception이 없으므로 *commit-or-rollback이 필요 없다*. Lock 안의 작업이 일단 시작되면 끝까지 간다.

### Lock 안 사용자 코드 호출의 금지

Lock을 잡은 채 호출되는 코드 중 가장 위험한 것은 *호출자가 통제하는 함수*다. 콜백, virtual 멤버 함수, 사용자 타입의 copy/move, allocator. 이들이 같은 lock을 다시 잡거나 같은 자료구조의 다른 멤버 함수를 호출하면 deadlock이다. `threadsafe_list::for_each`는 사용자 함수 `f`를 *current 노드의 lock을 풀고서* 호출한다는 점이 중요하다.

```cpp
// 위험: lock 보유 중 사용자 함수 호출
void bad_for_each(Function f) {
    std::lock_guard<std::mutex> lk(head_.m);
    // f가 같은 list의 push_front를 호출하면 deadlock
    for (auto* n = head_.next.get(); n; n = n->next.get()) {
        f(*n->data);
    }
}
```

```cpp
// 안전: hand-over-hand로 lock 인계, 사용자 함수는 lock 밖에서 호출
void for_each(Function f) {
    node* current = &head_;
    std::unique_lock<std::mutex> lk(head_.m);
    while (node* const next = current->next.get()) {
        std::unique_lock<std::mutex> next_lk(next->m);
        lk.unlock();  // 사용자 함수 호출 전 이전 lock 해제
        f(*next->data);
        current = next;
        lk = std::move(next_lk);
    }
}
```

## 6.4 설계 가이드라인 요약

자료구조의 종류와 무관하게 적용되는 체크리스트다.

**인터페이스**
- 경합 가능한 연산 조합(empty+top+pop 등)을 단일 멤버로 통합했는가.
- 빈 상태 처리 방식(`try_pop` vs exception)이 호출자의 사용 패턴에 맞는가.
- 반환 시 race 가능한 reference나 raw pointer를 노출하지 않는가.

**Lock**
- Lock 범위가 최소인가. 임계 영역 안의 작업이 noexcept인가.
- Lock 획득 순서가 모든 멤버 함수에서 일관된가.
- Reader-heavy인 경우에만 `shared_mutex`를 사용했는가.

**성능**
- 메모리 할당이 lock 밖에서 일어나는가.
- Lock 보유 중 I/O, 사용자 콜백, 다른 자료구조의 멤버 함수를 호출하지 않는가.
- Fine-grained로 가기 전 단일 mutex 버전을 측정했는가.

자주 빠지는 실수를 두 가지 예로 본다.

```cpp
// 실수 1: lock 보유 중 외부 함수 호출
void bad_push(T value) {
    std::lock_guard<std::mutex> lock(mtx_);
    log("Pushing");  // log가 다른 lock을 잡으면 deadlock 가능
    data_.push(std::move(value));
}
```

```cpp
// 실수 2: reference 반환으로 내부 노출
T& top() {
    std::lock_guard<std::mutex> lock(mtx_);
    return data_.top();  // lock 해제 후 reference가 dangling 가능
}
```

## 정리

- 인터페이스의 race condition은 멤버 함수 각각에 mutex를 붙여도 사라지지 않는다. 인터페이스를 atomic 단위로 통합해야 한다.
- Serialization과 concurrency는 trade-off다. 자료구조의 모양이 fine-grained의 한계를 정한다.
- `shared_mutex`는 reader-heavy일 때만 이득이다. Reader/writer 비율 측정 후 결정한다.
- Stack은 단일 mutex가 본질적 한계, queue는 head/tail 분리로 push/pop 동시화, hash map은 bucket 분리, list는 node 분리. 자료구조마다 분리 가능한 경계가 다르다.
- 예외 가능 작업(할당, 사용자 타입 copy)을 lock 밖으로 빼서 강한 예외 보장을 얻는다.
- Lock 보유 중 사용자 코드를 호출하지 않는다. 콜백/copy/allocator가 자료구조에 재진입하면 deadlock이다.
- Lock 획득 순서는 모든 멤버 함수에서 일관되어야 한다. Hand-over-hand는 항상 한 방향으로만 lock을 잡는다.

## 다음 장 예고

다음 장에서는 **lock-free** 자료구조를 다룬다. 뮤텍스 없이 원자적 연산만으로 스레드 안전을 달성하는 방법을 살펴본다.

## 관련 항목

- [Ch 3: Sharing Data](/blog/parallel/cpp-concurrency-in-action/chapter03-sharing-data-between-threads)
- [Ch 5: Memory Model](/blog/parallel/cpp-concurrency-in-action/chapter05-the-cpp-memory-model-and-operations-on-atomic-types)
- [Ch 7: Lock-free Data Structures](/blog/parallel/cpp-concurrency-in-action/chapter07-designing-lock-free-concurrent-data-structures)
- [AMP Ch 9: Linked Lists](/blog/parallel/parallel-principles/ch09-linked-lists-the-role-of-locking)
- [AMP Ch 13: Concurrent Hashing](/blog/parallel/parallel-principles/ch13-concurrent-hashing-and-natural-parallelism)
- [AMP Ch 14: Skiplists](/blog/parallel/parallel-principles/ch14-skiplists-and-balanced-search)
