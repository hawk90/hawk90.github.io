---
title: "Ch 11: Testing and debugging multithreaded applications"
date: 2026-05-06T11:00:00
description: "ThreadSanitizer, 재현 가능성, 시뮬레이션 테스트, 동시성 버그 분류."
tags: [C++, C, Concurrency, Testing, Debugging, ThreadSanitizer]
series: "C++ Concurrency in Action"
seriesOrder: 11
draft: false
---

동시성 버그는 재현이 어렵고 디버깅이 까다롭다. Williams는 11장에서 *어떤 버그가 어떤 형태로 나타나는지*, *어떻게 찾을 것인지*, *어떻게 재현 가능하게 테스트할 것인지*를 정리한다. 이 글은 그 흐름을 따라가며 ThreadSanitizer 같은 현대 도구와 structured concurrency 관점까지 확장한다.

### 한 줄 요약 — 본질은 *재현 어려움*

동시성 버그의 본질은 한 문장으로 정리된다. *같은 입력으로 같은 코드를 돌려도 결과가 매번 다르다.* 단일 스레드 코드에서 디버깅이 작동하는 이유는 *결정적 재현*이다. 같은 입력에 같은 출력이 나오므로, 입력을 들고 가서 stepping하면 버그가 잡힌다. 동시성 코드에서는 이 가정이 깨진다.

OS 스케줄러는 매 실행마다 다른 순서로 스레드를 깨운다. 캐시 상태, 다른 프로세스의 부하, 인터럽트 타이밍이 결과를 바꾼다. 한 번 보였다가 한 시간 동안 안 보이는 버그가 흔하다. 11장의 모든 도구·전략은 결국 *비결정성을 어떻게 다룰 것인가*라는 한 질문에 대한 답이다.

따라서 검증·디버깅 전략 자체가 단일 스레드와 다르다. *증상이 나오기를 기다리는* 디버깅은 작동하지 않는다. 대신 *모든 가능한 실행을 검사*하거나, *비결정성을 강제로 노출*하거나, *기록해서 재현 가능하게* 만든다. 11장의 도구 분류는 이 세 접근의 카탈로그다.

### 직관 — TSAN은 *동시 접근 감시 카메라*

ThreadSanitizer(TSan)의 동작은 한 비유로 잡힌다. *24시간 돌아가는 감시 카메라*가 메모리 접근 하나하나를 기록한다고 생각하면 된다. 어느 스레드가 어느 주소에 언제 접근했는지, 그 사이에 동기화(`lock`, `atomic`, `join`)가 있었는지를 모두 추적한다.

두 스레드가 같은 주소를 건드렸는데 *그 사이 동기화 기록이 없다*면 TSan은 즉시 경고한다. 한 번의 실행에서 race가 *발생하지 않아도* 발생 가능성을 잡아낸다 — happens-before 그래프에 cycle이 없으면 데이터 레이스로 분류한다.

이 감시는 비싸다. TSan은 보통 *5~15배 느리고 5~10배 메모리를 더 쓴다*. 그러나 동시성 버그의 *비결정적 실행 1회*만으로는 잡기 어려운 것을 *정적 그래프 분석*으로 잡아낸다. 운에 의존하지 않고 버그를 만난다.

### 직관 — Stress test는 *자동차 충돌 시험 반복*

스트레스 테스트는 *자동차 충돌 시험을 수천 번 반복하는 일*과 같다. 한 번 충돌해서 멀쩡하다고 안전한 차가 아니다. 다양한 각도, 속도, 노면 조건으로 수백 번 박아 봐야 약점이 드러난다.

동시성 코드도 마찬가지다. 한 번 테스트가 통과했다고 race가 없는 것이 아니다. 스케줄러가 *어쩌다 안전한 순서*를 골랐을 뿐일 수 있다. 같은 테스트를 *수천 번 반복*하면서 코어 수, 부하, 스레드 우선순위를 바꾸어 가며 *비결정성을 노출*해야 한다.

이 접근의 한계는 분명하다. 통과한 테스트가 *버그가 없음을 증명*하지 못한다. 그저 *특정 시간 동안의 실행에서 버그가 나타나지 않았다*는 통계적 증거일 뿐이다. 그래서 TSan(정적 분석) + stress test(동적 노출)를 *함께* 쓴다. 둘은 보완 관계지 대체 관계가 아니다.

### 직관 — Race vs Data Race: *분실*과 *바뀐 편지*

두 용어를 헷갈리지 않는 가장 빠른 방법은 *우체국 비유*다.

- **Race condition**: 두 통의 편지가 우체국에 도착했는데 *어느 것이 먼저 처리되느냐*에 따라 결과가 달라진다. 예: 잔액 확인 후 출금. 다른 스레드가 그 사이에 출금하면 잔액이 마이너스가 된다. 편지 자체는 멀쩡하지만 *순서*가 결과를 바꾼다.
- **Data race**: 두 통의 편지가 같은 주소를 *동시에* 쓴다. 한 통은 "A 부동산", 다른 통은 "B 빌딩"이라고 적혀 있다. 결과는 *바뀐 편지* — "A 빌딩"이라는 존재하지 않는 주소가 만들어진다. 비유적으로 단일 메모리 위치의 *비트가 섞인다*.

C++ 표준은 후자만을 **undefined behavior**로 규정한다. 전자는 *의미적 버그*지만 표준 입장에서는 정의된 동작이다. 그래서 도구가 자동으로 잡는 것은 *data race*뿐이고, *race condition* 일반은 사람이 invariant를 명세해야 검증 가능하다 — Coyote/Loom/Lincheck 같은 시뮬레이션 도구가 등장하는 이유다.

### 시스템 사례 — 도구 생태계 한눈에

같은 문제를 다른 언어 생태계가 어떻게 푸는지 보면 도구 선택의 감이 잡힌다.

| 도구 | 언어/플랫폼 | 접근 방식 |
|------|-------------|-----------|
| **ThreadSanitizer** | C/C++/Go (Clang/GCC) | happens-before 그래프 기반 동적 분석 |
| **Helgrind / DRD** | C/C++ (Valgrind) | 락 순서 + happens-before 추적, 빌드 재구성 불필요 |
| **Coyote** | .NET (Microsoft Research) | 스케줄 공간을 *체계적으로 탐색* — 비결정성을 결정적으로 |
| **Loom** | Java | 모든 가능한 인터리빙을 모델 체크 |
| **Lincheck** | Kotlin/JVM (JetBrains) | linearizability 자동 검증, lock-free 알고리즘 테스트 |
| **rr** | Linux (Mozilla) | record-and-replay — 동일 실행 재생 |

이 도구들은 같은 본질적 문제 — *비결정성* — 를 서로 다른 각도에서 푼다. TSan/Helgrind는 *한 번의 실행*을 분석한다. Coyote/Loom/Lincheck은 *모든 실행*을 탐색한다. rr은 *한 번의 실행을 영원히 재생 가능하게* 한다. 어느 도구도 만능이 아니다. 11장 후반의 *layered testing* 전략이 강조하는 바다.

특히 Microsoft의 Coyote는 흥미로운 접근이다. .NET의 async 코드를 가로채 *스케줄러를 모킹*한다. `await` 지점마다 *체계적으로* 다른 인터리빙을 시도한다. 비결정성을 결정적으로 만들어 *재현 가능한 동시성 테스트*를 제공한다. C++에는 직접 대응되는 도구가 없지만, 같은 아이디어가 Loom(Java), Lincheck(Kotlin), Shuttle(Rust)에 퍼져 있다.

## 11.1 동시성 버그의 종류

### 두 개의 큰 범주

Williams는 동시성 버그를 두 개의 큰 범주로 묶는다. 이 분류가 디버깅 전략을 결정한다.

| 범주 | 증상 | 대표 형태 |
|------|------|-----------|
| **Unwanted blocking** | 일부 또는 전체 스레드가 진행을 못 함 | deadlock, livelock, blocked I/O |
| **Race conditions** | 실행 순서에 따라 결과가 바뀜 | data race, broken invariant, lifetime race |

이 두 범주는 *직교적*이다. blocking은 "멈춰 있다"가 증상이고, race는 "결과가 다르다"가 증상이다. 디버거로 잡기 쉬운 쪽은 blocking이다. 멈춰 있으면 스택을 뜰 수 있다. race는 멈추지 않으므로 도구가 필요하다.

### 버그 분류

**동시성 버그 유형**

- **Data Race** — 동시에 같은 메모리 접근 (적어도 하나는 쓰기), 동기화 없음
- **Race Condition** — 실행 순서에 따라 결과가 달라짐 (데이터 레이스가 아니어도 발생)
- **Deadlock** — 스레드들이 서로 대기하며 영원히 멈춤
- **Livelock** — 스레드들이 계속 작업하지만 진행이 없음
- **Blocked I/O** — 외부 자원 응답을 기다리느라 멈춤
- **Starvation** — 특정 스레드가 영원히 자원을 못 얻음
- **Priority Inversion** — 높은 우선순위 스레드가 낮은 우선순위에 의해 차단

### Data Race vs Race Condition — 책의 정확한 구분

Williams는 두 용어를 엄격히 구분한다. 한국어 자료에서 자주 혼용되지만 표준(C++ memory model)은 분명한 정의를 둔다.

- **Data race**: *서로 다른 스레드에서 같은 메모리 위치를 동기화 없이 접근*하고, 그중 *적어도 하나가 쓰기*인 경우. C++ 표준은 이를 **undefined behavior**로 규정한다.
- **Race condition**: 결과가 *스레드 실행 순서*에 의존하는 모든 상황. 데이터 레이스가 없어도 발생할 수 있다. 흔히 *broken invariant*를 동반한다.

즉 모든 data race는 race condition이지만, 그 반대는 성립하지 않는다. 락으로 *데이터*는 보호되더라도 *순서*가 보호되지 않는 경우가 race condition의 핵심이다.

```cpp
// Data Race: 동기화 없이 동시 접근 — UB
int counter = 0;

void thread1() { counter++; }  // 💥 Data race
void thread2() { counter++; }

// Race Condition: 데이터는 락으로 보호되지만 순서가 무방비
std::mutex mtx;
bool initialized = false;
Resource* resource = nullptr;

void thread_a() {
    std::lock_guard lock(mtx);
    resource = new Resource();
    initialized = true;
}

void thread_b() {
    std::lock_guard lock(mtx);
    if (initialized) {
        resource->use();  // 💥 Race condition: thread_a가 먼저 실행되어야 함
    }
}
```

핵심: data race는 sanitizer로 *발견 가능*하지만, race condition은 *invariant를 알아야* 발견할 수 있다. 코드 리뷰의 가치가 여기서 갈린다.

### Unwanted blocking 세분화

세 가지 형태를 구분하면 디버깅 방법이 달라진다.

#### Deadlock

두 개 이상의 스레드가 서로의 자원을 기다린다. 진행이 *영구히* 멈춘다. 스레드 덤프를 뜨면 모든 스레드가 동일한 set의 락을 기다리는 형태로 잡힌다.

전형적 시그니처:

- `thread::join()`이 영원히 반환 안 함
- `condition_variable::wait()`에서 모든 스레드가 멈춤
- promise/future의 한쪽이 set 되지 않음 (broken promise)

#### Livelock

스레드가 *바쁘게 동작*하지만 *진행*은 없다. CPU는 100%지만 throughput은 0. spinlock에서 양보 패턴이 잘못 짜였거나, optimistic retry가 무한히 충돌하는 경우다.

#### Blocked I/O

스레드가 *외부 응답*을 기다리느라 멈춘 상태. 네트워크 read, 사용자 입력, 파일 lock 등. 디버거로 보면 syscall 안에 있다. 원인은 *내가 짠 동시성 코드*가 아니라 *외부 시스템*에 있을 수 있다는 점이 중요하다.

이 셋의 분기:

| 증상 | CPU 사용 | 외부 자원 | 진단 |
|------|----------|-----------|------|
| Deadlock | 0% | 무관 | 스레드가 락 대기 |
| Livelock | 100% | 무관 | 스레드가 양보/재시도 반복 |
| Blocked I/O | 0% (스레드별) | 응답 없음 | syscall 안에 멈춤 |

### Deadlock 예제

```cpp
std::mutex mtx1, mtx2;

void thread1() {
    std::lock_guard lock1(mtx1);
    std::this_thread::sleep_for(1ms);
    std::lock_guard lock2(mtx2);  // 💥 thread2가 mtx2 보유 중
}

void thread2() {
    std::lock_guard lock1(mtx2);
    std::this_thread::sleep_for(1ms);
    std::lock_guard lock2(mtx1);  // 💥 thread1이 mtx1 보유 중
}

// 해결: std::scoped_lock 사용
void safe_thread1() {
    std::scoped_lock lock(mtx1, mtx2);  // 데드락 방지
}
```

### Livelock 예제

```cpp
std::atomic<bool> flag1{false}, flag2{false};

void thread1() {
    while (true) {
        flag1 = true;
        while (flag2) {
            flag1 = false;  // 양보
            std::this_thread::yield();
            flag1 = true;   // 다시 시도
        }
        // 임계 영역
        flag1 = false;
        break;
    }
}

void thread2() {
    while (true) {
        flag2 = true;
        while (flag1) {
            flag2 = false;  // 양보
            std::this_thread::yield();
            flag2 = true;   // 다시 시도
        }
        // 💥 둘 다 계속 양보하며 진행 못함 (livelock)
        flag2 = false;
        break;
    }
}
```

### Broken invariant

race condition의 가장 자주 만나는 형태가 *invariant 위반*이다. 자료구조가 "유효한 상태"라는 약속을 다른 스레드가 깨뜨리면, 그 상태를 보는 스레드는 정의되지 않은 결과를 반환하거나 충돌한다.

```cpp
// 이중 연결 리스트의 invariant:
//   node->next->prev == node
//   node->prev->next == node

struct Node {
    int value;
    Node* prev;
    Node* next;
};

// 단일 스레드 insert: 잠시 invariant가 깨지지만 함수 종료 시 복원
void insert_after(Node* pos, Node* n) {
    n->prev = pos;
    n->next = pos->next;
    // 💥 이 시점에 pos->next->prev == pos (구) — invariant broken
    pos->next->prev = n;
    pos->next = n;
}
```

이 코드를 락 없이 두 스레드가 동시에 호출하면, *invariant가 깨진 중간 상태*를 다른 스레드가 관찰한다. 데이터 레이스이자 broken invariant다. 락은 *이 중간 상태가 관찰되지 않게* 만들어 준다.

리뷰 관점: "이 자료구조의 invariant는 무엇인가? 그것이 깨지는 모든 윈도우가 동기화되어 있는가?"

## 11.2 동시성 버그 찾기

### Heisenbug — 재현의 어려움

> *"관찰하면 사라지는 버그"*

**특징**:
- 디버거로 실행하면 사라짐
- printf 추가하면 사라짐
- 최적화 끄면 사라짐
- 1000번에 한 번 발생

**원인**:
- 타이밍에 민감한 버그
- 디버깅이 타이밍을 변경
- 관찰 자체가 동작을 변경 (양자역학의 관찰자 효과처럼)

### 재현성 높이기

```cpp
// 1. 의도적인 지연 삽입
void suspect_function() {
    // 경합 윈도우 확대
    std::this_thread::sleep_for(std::chrono::milliseconds(1));

    // 또는
    std::this_thread::yield();
}

// 2. CPU 친화성으로 경합 유도
#ifdef __linux__
void force_same_cpu() {
    cpu_set_t cpuset;
    CPU_ZERO(&cpuset);
    CPU_SET(0, &cpuset);  // 모든 스레드를 CPU 0에
    pthread_setaffinity_np(pthread_self(), sizeof(cpuset), &cpuset);
}
#endif

// 3. 스레드 시작 동기화
std::latch start_latch(1);
std::barrier sync_point(NUM_THREADS);

void worker() {
    start_latch.wait();     // 모든 스레드가 동시에 시작
    sync_point.arrive_and_wait();  // 동기점에서 만남
    // 작업
}

int main() {
    std::vector<std::thread> threads;
    for (int i = 0; i < NUM_THREADS; ++i) {
        threads.emplace_back(worker);
    }
    start_latch.count_down();  // 모두 시작!
    // ...
}
```

### 의도를 가진 코드 리뷰

Williams는 동시성 코드 리뷰를 *질문 기반*으로 수행할 것을 권한다. "이상한 점 없는지" 같은 모호한 시선은 race를 놓친다. 다음과 같은 *명시적 질문 리스트*가 효과적이다.

**책의 review 질문(요지)**:

- *어떤 데이터가 보호되어야 하는가?* 그리고 어떻게 보호되는가?
- *코드의 어떤 부분이 어떤 스레드에서 실행되는가?*
- *어떤 mutex가 어떤 데이터를 지키는가?* 그 매핑이 코드와 일치하는가?
- *서로 다른 스레드가 같은 데이터를 동시에 접근할 수 있는가?* 가능하다면 무엇이 그것을 막는가?
- 이 스레드가 어떤 mutex를 *보유*하고 어떤 mutex를 *대기*할 수 있는가?
- 같은 데이터에 대한 다른 곳의 접근도 *같은 invariant*를 따르는가?

코드를 보면서 이 질문에 *입으로* 답할 수 있어야 한다. 답이 막히면 그 자리가 버그 후보다.

### Race 식별 체크리스트

- [ ] 공유 데이터에 접근하는 모든 코드가 동기화되었는가?
- [ ] 락의 범위가 적절한가?
- [ ] 여러 락을 사용할 때 순서가 일관적인가?
- [ ] 조건 변수 사용 시 predicate를 사용하는가?
- [ ] 락 보유 중 외부 함수를 호출하지 않는가?
- [ ] shared_ptr의 복사는 원자적이지만, 객체 접근은?
- [ ] 참조나 포인터가 락 밖으로 노출되지 않는가?
- [ ] 복합 연산(check-then-act)이 원자적인가?

### 위험 패턴

```cpp
// 💥 패턴 1: Check-then-act (TOCTOU)
if (map.contains(key)) {
    value = map[key];  // 💥 다른 스레드가 삭제했을 수 있음
}

// ✓ 해결
auto it = map.find(key);
if (it != map.end()) {
    value = it->second;  // 동일한 락 범위 내에서
}

// 💥 패턴 2: 락 밖에서 참조 반환
class ThreadSafeContainer {
    std::mutex mtx_;
    std::vector<Item> items_;

public:
    Item& get(int idx) {
        std::lock_guard lock(mtx_);
        return items_[idx];  // 💥 락 해제 후 참조 사용됨
    }
};

// ✓ 해결: 복사 반환
Item get(int idx) {
    std::lock_guard lock(mtx_);
    return items_[idx];  // 복사본 반환
}

// 💥 패턴 3: 분리된 락
void process() {
    mtx_.lock();
    auto data = getData();
    mtx_.unlock();

    // 💥 다른 스레드가 data를 변경할 수 있음

    mtx_.lock();
    updateData(data);  // 💥 오래된 데이터로 업데이트
    mtx_.unlock();
}
```

### 불변식(Invariant) 검증

```cpp
class ThreadSafeAccount {
    mutable std::mutex mtx_;
    int balance_;
    std::vector<Transaction> history_;

    // 불변식: balance_ == sum(history_)

public:
    void deposit(int amount) {
        std::lock_guard lock(mtx_);
        balance_ += amount;
        history_.push_back({TransactionType::Deposit, amount});
        assert(check_invariant());  // 디버그 빌드에서 검증
    }

private:
    bool check_invariant() const {
        int sum = 0;
        for (const auto& t : history_) {
            sum += (t.type == TransactionType::Deposit ? t.amount : -t.amount);
        }
        return balance_ == sum;
    }
};
```

### 테스트로 버그 찾기

리뷰로 잡히지 않은 race는 *테스트*로 찾는다. Williams는 동시성 테스트의 어려움을 인정한다. 일반 단위 테스트와 달리 다음 특성을 가져야 한다.

- **재현 가능성**: 같은 입력에 같은 결과 — 가능한 한 결정적으로
- **확률성 인정**: 결정적이지 않다면 *시도 횟수*를 늘려 확률을 높임
- **분리성**: 한 테스트가 하나의 시나리오만 다룸. 인터리빙이 섞이면 원인 추적이 불가능
- **격리**: 외부 자원(파일, 네트워크) 의존을 제거. 타이밍 노이즈가 커진다
- **다양한 환경**: 다른 CPU 개수, 다른 메모리 모델 강도(x86 vs ARM)에서 실행

이 중 가장 큰 차이는 *결정성 부재*다. 일반 테스트는 한 번 통과하면 통과지만, 동시성 테스트는 *100번 통과해도 다음에 실패할 수 있다*. 따라서 테스트는 *반복 실행*과 *다양한 시드/스케줄*과 결합되어야 의미가 있다.

### 테스트하기 좋게 설계하기 (Designing for testability)

테스트 용이성은 *코드 작성 시*에 결정된다. Williams가 강조하는 원칙:

1. **공유 상태 최소화** — 공유가 없으면 race도 없다.
2. **공유 코드와 비공유 코드 분리** — 동시성 영향을 받는 부분과 그렇지 않은 부분을 명확히 가른다.
3. **순수 함수 추출** — 입력만으로 출력이 결정되는 함수는 단일 스레드 테스트로 충분히 검증 가능.
4. **동기화 정책의 의존성 주입** — mutex나 스케줄러를 외부에서 주입할 수 있게 하면 테스트에서 교체 가능.
5. **명확한 책임 분리** — 한 클래스가 한 가지 동시성 약속만 한다.

```cpp
// 회피: 동시성과 로직이 섞임 — 테스트하기 어렵다
class JobProcessor {
    std::mutex mtx_;
    std::queue<Job> jobs_;

    void run() {
        while (true) {
            std::unique_lock lock(mtx_);
            cv_.wait(lock, [&] { return !jobs_.empty(); });
            auto j = std::move(jobs_.front());
            jobs_.pop();
            lock.unlock();

            // 💥 로직이 락 처리와 같은 클래스에
            auto result = j.payload * 2 + 7;
            store_result(result);
        }
    }
};

// Good: 순수 함수를 분리 — 단일 스레드로 완전 검증 가능
int compute_result(int payload) {
    return payload * 2 + 7;  // 순수
}

class JobProcessor {
    // ... 동기화 로직만 ...

    void run() {
        // ...
        auto result = compute_result(j.payload);  // 호출만
        // ...
    }
};
```

이렇게 분리하면 `compute_result`는 평범한 단위 테스트로 100% 커버되고, 동시성 테스트는 *큐 동작*에만 집중할 수 있다.

### Reproducer 패턴

Heisenbug를 안정적으로 잡으려면 *재현기*를 만드는 것이 첫 단계다.

```cpp
// reproducer: 의심 시나리오를 stress 형태로 강제
void reproduce_account_race() {
    constexpr int ITERATIONS = 100'000;
    for (int run = 0; run < 1000; ++run) {
        BankAccount acc;
        acc.deposit(100);

        std::latch go(1);
        std::thread w([&] {
            go.wait();
            for (int i = 0; i < ITERATIONS; ++i) acc.withdraw(1);
        });
        std::thread d([&] {
            go.wait();
            for (int i = 0; i < ITERATIONS; ++i) acc.deposit(1);
        });

        go.count_down();
        w.join();
        d.join();

        if (acc.balance() != 100) {
            std::cerr << "reproduced on run " << run
                      << ", balance=" << acc.balance() << "\n";
            std::abort();  // 코어 덤프로 원인 분석
        }
    }
}
```

핵심 요소:

- **start latch**: 모든 스레드를 *동시에 출발*시켜 경합 윈도우 최대화
- **반복**: 한 번 통과가 의미 없으므로 1000회 단위로 반복
- **검증식**: 끝난 후 *invariant*가 유지되는지 확인 (잔액 = 초기값)
- **즉시 중단**: 재현 시 abort로 디버거가 *그 순간*을 잡을 수 있게 함

## 11.3 다중 스레드 테스트 작성

이 절은 책의 11.2 후반과 11.3을 합쳐 *어떻게 동시성 테스트를 짤 것인가*를 다룬다. Williams는 두 가지 핵심 패턴을 제시한다: (1) *stress testing*으로 인터리빙 다양성을 확률적으로 늘리고, (2) *combinatorial scheduling*으로 결정적 인터리빙을 강제한다. 그 뒤로 sanitizer와 structured concurrency를 통해 *contract*로 보강한다.

### 스레드 시작 동기화

```cpp
#include <latch>
#include <barrier>

class ConcurrentTest {
protected:
    void run_concurrent(int num_threads, std::function<void(int)> worker) {
        std::latch start_latch(1);
        std::vector<std::thread> threads;

        for (int i = 0; i < num_threads; ++i) {
            threads.emplace_back([&start_latch, &worker, i] {
                start_latch.wait();  // 모두 동시에 시작
                worker(i);
            });
        }

        start_latch.count_down();  // 시작 신호

        for (auto& t : threads) {
            t.join();
        }
    }
};

// 사용 예
class CounterTest : public ConcurrentTest {
    std::atomic<int> counter_{0};

public:
    void test_concurrent_increment() {
        constexpr int NUM_THREADS = 10;
        constexpr int INCREMENTS_PER_THREAD = 1000;

        run_concurrent(NUM_THREADS, [this](int) {
            for (int i = 0; i < INCREMENTS_PER_THREAD; ++i) {
                counter_++;
            }
        });

        assert(counter_ == NUM_THREADS * INCREMENTS_PER_THREAD);
    }
};
```

### Barrier를 활용한 단계별 테스트

```cpp
#include <barrier>

void test_producer_consumer() {
    constexpr int NUM_ITEMS = 100;
    ThreadSafeQueue<int> queue;
    std::atomic<int> consumed_sum{0};

    // 생산자와 소비자가 동시에 시작
    std::barrier sync_point(2);

    std::thread producer([&] {
        sync_point.arrive_and_wait();  // 동시 시작
        for (int i = 0; i < NUM_ITEMS; ++i) {
            queue.push(i);
        }
        queue.done();
    });

    std::thread consumer([&] {
        sync_point.arrive_and_wait();  // 동시 시작
        while (auto item = queue.pop()) {
            consumed_sum += *item;
        }
    });

    producer.join();
    consumer.join();

    int expected = (NUM_ITEMS - 1) * NUM_ITEMS / 2;
    assert(consumed_sum == expected);
}
```

### C11 동시성 테스트

```c
#include <threads.h>
#include <stdatomic.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

#define NUM_THREADS 8
#define ITERATIONS 10000

// 테스트 대상: 스레드 안전 카운터
typedef struct {
    mtx_t mtx;
    int value;
} SafeCounter;

void safe_counter_init(SafeCounter* c) {
    mtx_init(&c->mtx, mtx_plain);
    c->value = 0;
}

void safe_counter_increment(SafeCounter* c) {
    mtx_lock(&c->mtx);
    c->value++;
    mtx_unlock(&c->mtx);
}

int safe_counter_get(SafeCounter* c) {
    mtx_lock(&c->mtx);
    int v = c->value;
    mtx_unlock(&c->mtx);
    return v;
}

void safe_counter_destroy(SafeCounter* c) {
    mtx_destroy(&c->mtx);
}

// 테스트용 동기화 배리어 (C11에는 std::latch 없음)
typedef struct {
    mtx_t mtx;
    cnd_t cv;
    int count;
    int target;
} Barrier;

void barrier_init(Barrier* b, int target) {
    mtx_init(&b->mtx, mtx_plain);
    cnd_init(&b->cv);
    b->count = 0;
    b->target = target;
}

void barrier_wait(Barrier* b) {
    mtx_lock(&b->mtx);
    b->count++;
    if (b->count == b->target) {
        cnd_broadcast(&b->cv);
    } else {
        while (b->count < b->target) {
            cnd_wait(&b->cv, &b->mtx);
        }
    }
    mtx_unlock(&b->mtx);
}

void barrier_destroy(Barrier* b) {
    mtx_destroy(&b->mtx);
    cnd_destroy(&b->cv);
}

// 테스트 컨텍스트
typedef struct {
    SafeCounter* counter;
    Barrier* start_barrier;
} TestContext;

static int worker(void* arg) {
    TestContext* ctx = (TestContext*)arg;

    barrier_wait(ctx->start_barrier);  // 모든 스레드 동시 시작

    for (int i = 0; i < ITERATIONS; ++i) {
        safe_counter_increment(ctx->counter);
    }

    return 0;
}

void test_concurrent_counter(void) {
    SafeCounter counter;
    Barrier start_barrier;
    thrd_t threads[NUM_THREADS];
    TestContext ctx;

    safe_counter_init(&counter);
    barrier_init(&start_barrier, NUM_THREADS);

    ctx.counter = &counter;
    ctx.start_barrier = &start_barrier;

    for (int i = 0; i < NUM_THREADS; ++i) {
        thrd_create(&threads[i], worker, &ctx);
    }

    for (int i = 0; i < NUM_THREADS; ++i) {
        thrd_join(threads[i], NULL);
    }

    int expected = NUM_THREADS * ITERATIONS;
    int actual = safe_counter_get(&counter);

    if (actual == expected) {
        printf("PASS: counter = %d\n", actual);
    } else {
        printf("FAIL: expected %d, got %d\n", expected, actual);
    }

    safe_counter_destroy(&counter);
    barrier_destroy(&start_barrier);
}

int main(void) {
    test_concurrent_counter();
    return 0;
}
```

### 스트레스 테스트

```cpp
void stress_test(int duration_seconds) {
    std::atomic<bool> stop{false};
    std::atomic<uint64_t> operations{0};
    ThreadSafeMap<int, std::string> map;

    std::vector<std::thread> threads;

    // 작업자 스레드들
    for (int i = 0; i < 8; ++i) {
        threads.emplace_back([&, i] {
            std::mt19937 rng(i);
            std::uniform_int_distribution<int> key_dist(0, 1000);
            std::uniform_int_distribution<int> op_dist(0, 2);

            while (!stop) {
                int key = key_dist(rng);
                switch (op_dist(rng)) {
                    case 0: map.insert(key, std::to_string(key)); break;
                    case 1: map.get(key); break;
                    case 2: map.remove(key); break;
                }
                operations++;
            }
        });
    }

    // 지정된 시간 동안 실행
    std::this_thread::sleep_for(std::chrono::seconds(duration_seconds));
    stop = true;

    for (auto& t : threads) {
        t.join();
    }

    std::cout << "Operations: " << operations << "\n";
    std::cout << "Ops/sec: " << operations / duration_seconds << "\n";
}
```

### Williams Listing 11.1 — push와 pop 동시 호출 테스트 골격

책의 첫 listing은 *thread-safe queue*에 push와 pop을 동시에 호출해 결과의 일관성을 보는 가장 단순한 형태다. 두 스레드의 출발을 *promise/future*로 정렬하는 것이 핵심이다.

```cpp
// Listing 11.1 형식: 두 스레드 동시 시작 → 결과 검증
#include <future>
#include <atomic>
#include <cassert>

void test_concurrent_push_and_pop_on_empty_queue() {
    threadsafe_queue<int> q;

    std::promise<void> go;                  // 출발 신호
    std::promise<void> push_ready;          // push 스레드 준비됨
    std::promise<void> pop_ready;           // pop 스레드 준비됨
    std::shared_future<void> ready(go.get_future());  // 공통 wait point

    std::future<void> push_done;
    std::future<int>  pop_done;

    try {
        push_done = std::async(std::launch::async, [&q, ready, &push_ready] {
            push_ready.set_value();         // 준비 완료 알림
            ready.wait();                   // 출발 신호 대기
            q.push(42);
        });

        pop_done = std::async(std::launch::async, [&q, ready, &pop_ready] {
            pop_ready.set_value();
            ready.wait();
            return q.pop();                 // 빈 큐에서 pop 후 결과
        });

        push_ready.get_future().wait();     // 양쪽 준비될 때까지
        pop_ready.get_future().wait();

        go.set_value();                     // 출발!

        push_done.get();
        assert(pop_done.get() == 42);       // 결과 검증
    }
    catch (...) {
        go.set_value();                     // 예외 시에도 스레드 깨움
        throw;
    }
}
```

이 골격에서 중요한 부분:

- `shared_future<void> ready`: 모든 워커가 *같은 출발선*에 선다.
- `*_ready`: 워커가 *진짜 wait에 진입한 뒤*에 출발 신호가 주어진다. 그 전이면 한 스레드가 먼저 진행해 의도한 인터리빙이 생기지 않는다.
- `try`/`catch` + 출발 신호: 한 스레드만 예외를 던지면 다른 스레드가 영원히 대기할 수 있다. catch에서도 반드시 `set_value`.

### Williams Listing 11.2 — Reusable test fixture

여러 시나리오를 같은 방식으로 묶을 수 있도록, 책은 fixture 형태를 보여 준다.

```cpp
// Listing 11.2 형식: 다중 스레드 시나리오 fixture
template <typename Setup, typename ThreadA, typename ThreadB, typename Check>
void run_two_thread_test(Setup setup, ThreadA a, ThreadB b, Check check) {
    auto fixture = setup();

    std::promise<void> go;
    std::promise<void> a_ready;
    std::promise<void> b_ready;
    std::shared_future<void> ready(go.get_future());

    auto a_done = std::async(std::launch::async, [&] {
        a_ready.set_value();
        ready.wait();
        a(fixture);
    });
    auto b_done = std::async(std::launch::async, [&] {
        b_ready.set_value();
        ready.wait();
        b(fixture);
    });

    a_ready.get_future().wait();
    b_ready.get_future().wait();
    go.set_value();

    a_done.get();
    b_done.get();
    check(fixture);
}

// 사용
void test_queue_push_pop() {
    run_two_thread_test(
        [] { return threadsafe_queue<int>{}; },
        [](auto& q) { q.push(42); },
        [](auto& q) {
            int v = 0;
            q.wait_and_pop(v);
            assert(v == 42);
        },
        [](auto&) { /* additional invariants */ }
    );
}
```

이 fixture를 가지면 *시나리오만 함수로 작성*하면 되고, 동기화 보일러플레이트가 한 곳에 모인다. 새 race 후보가 떠오를 때마다 한 줄짜리 호출로 테스트가 추가된다.

### Combinatorial scheduling — 결정적 인터리빙 강제

확률에 기대지 않고 *모든 인터리빙*을 시도하려면 스케줄러를 직접 제어한다. 책은 round-robin 시뮬레이션을 통해 가능한 *step sequence*를 enumerate하는 접근을 소개한다.

핵심 아이디어:

1. 테스트 대상 코드를 *step 단위*로 쪼갠다.
2. 각 step의 종료를 *허가*받아야 진행하게 한다.
3. 외부 controller가 어떤 스레드를 다음에 진행시킬지 선택해 *모든 순서*를 시도한다.

```cpp
// 간이 round-robin scheduler 골격
class Scheduler {
    std::vector<std::function<void()>> steps_;  // 등록된 step
    std::vector<bool> done_;
public:
    void register_step(std::function<void()> s) { steps_.push_back(s); done_.push_back(false); }

    // 모든 순열을 시도
    void run_all_interleavings() {
        std::vector<int> order(steps_.size());
        std::iota(order.begin(), order.end(), 0);
        do {
            reset_world();              // 매 시도마다 새 상태
            for (int i : order) steps_[i]();
            verify_invariants();
        } while (std::next_permutation(order.begin(), order.end()));
    }
};
```

현실에서는 외부 도구가 이를 수행한다.

- **CDSChecker / Relacy**: relaxed atomics를 포함한 인터리빙 탐색.
- **Loom (Rust)**: 같은 사상의 model checker.
- **CHESS (역사적)**: Microsoft Research, 모든 가능한 스케줄 탐색.

이 도구들의 약점은 *상태 폭발*이다. step 수가 늘면 인터리빙이 지수 폭발한다. 따라서 *작은 lock-free primitive*에 적용하는 것이 적합하며, 어플리케이션 전체에는 stress testing이 현실적이다.

### 시뮬레이션 테스트 — 산업계의 답

학계의 model checker는 *완전성*을 추구한다. 모든 인터리빙을 다 본다. 산업계는 *현실성*을 추구한다. 모든 인터리빙은 못 보더라도, *흥미로운* 인터리빙을 *재현 가능하게* 노출한다. 이 균형을 잡은 도구들이 최근 십 년에 등장했다.

- **Coyote** (Microsoft Research, .NET): async/await의 모든 yield 지점에서 스케줄러가 *결정적으로* 선택을 내린다. 같은 시드를 주면 같은 인터리빙이 재생된다. *수만 번의 다른 스케줄*을 빠르게 시도해 실패를 찾고, 실패한 스케줄은 시드 한 줄로 영원히 재현 가능하다.
- **Loom** (Java, Project Loom과는 별개): JVM의 메모리 모델 위에서 lock·atomic 호출을 가로채 가능한 reordering을 체계적으로 탐색한다. JCStress와 함께 동시성 자료구조 검증의 표준이 되었다.
- **Lincheck** (Kotlin, JetBrains): *linearizability*를 자동 검증한다. 사용자가 concurrent operation의 순차 명세만 적으면, lincheck이 동시 실행 결과가 어떤 순차 실행으로 *직선화*되는지 확인한다. Java 9의 `VarHandle`, Kotlin coroutine 모두 지원.
- **Shuttle** (AWS, Rust): Loom과 유사한 randomized scheduler. 모든 가능한 인터리빙을 보지 않고 *랜덤 샘플링*으로 버그를 찾는다. 상태 폭발을 우회하는 실용적 절충.

이 도구들의 공통 철학은 *스케줄러를 코드로 만든다*는 것이다. OS 커널의 스케줄러는 비결정적이다. 그래서 *유저스페이스에 결정적 스케줄러를 직접 깐다*. 동시성 코드의 모든 yield/await/lock 지점이 이 결정적 스케줄러를 거치게 만든다. 결과는 *비결정성이 사라진 동시성 코드* — 시드 하나로 같은 버그가 백 번이고 천 번이고 재생된다.

C++에는 직접 대응되는 표준 도구가 아직 없다. 그러나 같은 아이디어가 Folly의 `DeterministicSchedule`, Boost.Fiber 기반 테스트 하네스, 일부 임베디드 RTOS의 *replay scheduler*에 녹아 있다. 11장의 *manual scheduler injection* 예제도 이 계열의 가장 단순한 형태다.

## 11.4 Sanitizer 도구 — ThreadSanitizer 중심

### TSan을 우선 도구로

Williams가 11장 후반에서 강조하는 핵심 도구가 **ThreadSanitizer**다. C++ memory model의 *happens-before*를 컴파일러 계측으로 추적해 데이터 레이스를 런타임에 보고한다. 다른 도구보다 정확도가 높고 빠르며, 컴파일러에 내장되어 있어 진입 장벽이 낮다.

권장 사용 패턴:

- **개발 빌드**에 TSan을 *항상* 켜둔다. 비용은 시간 5~15배지만 race를 즉시 찾는다.
- **CI** 파이프라인에서 TSan 빌드 잡(job)을 별도로 둔다. 일반 빌드와 분리해 *수렴 실패*가 명확히 보이게 한다.
- **재현기**를 TSan 빌드로 돌리면, race가 *발생하기만 하면* 출처 파일/줄까지 잡힌다.

### TSan 소개

컴파일 시 계측 코드를 삽입하여 런타임에 데이터 레이스 탐지. 지원: GCC, Clang, MSVC (최근).

**탐지**:
- Data race
- 락 순서 위반
- 초기화 전 사용

**성능 영향**:
- 5~15x 느림
- 5~10x 메모리 사용

> **CI에서 필수, 프로덕션에서 금지.**

### 사용법

```bash
# C++ 컴파일
g++ -fsanitize=thread -g -O1 program.cpp -o program
clang++ -fsanitize=thread -g -O1 program.cpp -o program

# C11 컴파일
gcc -fsanitize=thread -g -O1 -std=c11 program.c -o program
clang -fsanitize=thread -g -O1 -std=c11 program.c -o program

# 실행
./program

# 환경 변수로 옵션 설정
TSAN_OPTIONS="history_size=7 verbosity=1" ./program
```

### C11 TSan 예제

```c
// data_race.c - TSan으로 탐지되는 data race

#include <threads.h>
#include <stdio.h>

int counter = 0;  // 보호되지 않은 공유 변수

int increment(void* arg) {
    (void)arg;
    for (int i = 0; i < 10000; ++i) {
        counter++;  // 💥 Data race!
    }
    return 0;
}

int main(void) {
    thrd_t t1, t2;

    thrd_create(&t1, increment, NULL);
    thrd_create(&t2, increment, NULL);

    thrd_join(t1, NULL);
    thrd_join(t2, NULL);

    printf("Counter: %d\n", counter);
    return 0;
}

// 컴파일 및 실행:
// gcc -fsanitize=thread -g -O1 -std=c11 data_race.c -o data_race
// ./data_race
// → ThreadSanitizer 경고 출력
```

```c
// fixed_race.c - atomic으로 수정된 버전

#include <threads.h>
#include <stdatomic.h>
#include <stdio.h>

atomic_int counter = 0;  // atomic으로 보호

int increment(void* arg) {
    (void)arg;
    for (int i = 0; i < 10000; ++i) {
        atomic_fetch_add(&counter, 1);  // ✓ 안전
    }
    return 0;
}

int main(void) {
    thrd_t t1, t2;

    thrd_create(&t1, increment, NULL);
    thrd_create(&t2, increment, NULL);

    thrd_join(t1, NULL);
    thrd_join(t2, NULL);

    printf("Counter: %d\n", atomic_load(&counter));
    return 0;
}

// TSan 경고 없음
```

### TSan 출력 예시

```
==================
WARNING: ThreadSanitizer: data race (pid=12345)
  Write of size 4 at 0x7f... by thread T1:
    #0 increment() /path/to/file.cpp:10
    #1 thread1() /path/to/file.cpp:20

  Previous read of size 4 at 0x7f... by thread T2:
    #0 get_value() /path/to/file.cpp:15
    #1 thread2() /path/to/file.cpp:25

  Location is global 'counter' of size 4 at 0x7f...

  Thread T1 (tid=12346, running) created by main thread at:
    #0 pthread_create <null>
    #1 std::thread::thread<...> /usr/include/c++/...
    #2 main /path/to/file.cpp:30

  Thread T2 (tid=12347, running) created by main thread at:
    #0 pthread_create <null>
    #1 std::thread::thread<...> /usr/include/c++/...
    #2 main /path/to/file.cpp:31
==================
```

### TSan 억제(Suppression)

```cpp
// 파일: tsan.supp
race:third_party_library*
race:known_benign_race

// 실행 시
TSAN_OPTIONS="suppressions=tsan.supp" ./program
```

```cpp
// 코드에서 직접 억제 (비권장)
#if defined(__has_feature)
#if __has_feature(thread_sanitizer)
#define NO_SANITIZE_THREAD __attribute__((no_sanitize("thread")))
#endif
#endif

NO_SANITIZE_THREAD
void benign_race_function() {
    // TSan이 이 함수를 무시
}
```

## 11.5 Valgrind 도구들 — Helgrind / DRD / HWASAN

### Helgrind

```bash
# 데이터 레이스 탐지
valgrind --tool=helgrind ./program

# 옵션
valgrind --tool=helgrind \
    --history-level=full \
    --conflict-cache-size=10000000 \
    ./program
```

### DRD (Data Race Detector)

```bash
# 데이터 레이스 탐지 (Helgrind보다 빠름)
valgrind --tool=drd ./program

# 옵션
valgrind --tool=drd \
    --check-stack-var=yes \
    --exclusive-threshold=10 \
    ./program
```

### Helgrind vs DRD vs TSan vs HWASAN

| 도구 | 탐지 대상 | 속도 (배수) | 정확도 | 설치 / 컴파일 |
|------|----------|-----------|--------|----------------|
| **TSan** | data race, lock order | 5~15x | 높음 (적은 FP) | `-fsanitize=thread`, Clang/GCC |
| **HWASAN** | memory error (with tags) | 2~3x | 높음 | `-fsanitize=hwaddress`, AArch64 권장 |
| **DRD** | data race, lock 오용 | 20~50x | 중상 | Valgrind |
| **Helgrind** | data race, 데드락 | 50~100x | 중 (FP 많음) | Valgrind |

각 도구의 자리:

- **TSan**: 1순위. data race 전용. 거의 모든 race를 잡는다.
- **HWASAN**: 메모리 오류 탐지. race 전용은 아니지만, race가 *use-after-free*로 이어진 경우 잡는다. AArch64에서 native tagging을 쓰면 ASan보다 가볍다.
- **DRD**: TSan 빌드가 불가능한 환경(예: 매우 오래된 컴파일러)의 대체.
- **Helgrind**: DRD보다 추가로 *데드락 가능성*도 보고. 다만 false positive가 많아 noise 필터링 부담이 크다.

**권장:** TSan을 기본으로 사용. HWASAN/ASAN과 *별도 빌드*로 메모리 오류도 같이 본다. Valgrind는 TSan이 없는 환경이나 데드락 의심 시 추가 검증용.

### 도구 선택의 직관 — 빌드 가능성 × 정확도

네 도구의 차이를 *빌드 환경*과 *결과 신뢰도*로 정리하면 실제 선택이 쉽다.

- **TSan**은 *재빌드가 가능할 때*의 최선이다. 컴파일러 계측이므로 소스를 다시 빌드해야 하지만, 그 비용을 치르면 happens-before 그래프에 기반한 가장 정확한 race 탐지를 얻는다. 신뢰도가 높아 *CI 게이트*로 쓸 만하다.
- **Helgrind/DRD**는 *재빌드가 불가능할 때*의 안전망이다. Valgrind는 바이너리 계측이므로 *어떤 바이너리든* 그대로 돌릴 수 있다. 서드파티 라이브러리에 race가 의심될 때, 임베디드 타깃에서 받은 ELF만 있을 때 유용하다. 대신 락 기반 휴리스틱이라 false positive가 잦다.
- **HWASAN**은 *use-after-free*를 노린다. race 자체가 아니라, race로 인해 생긴 *메모리 오류*가 증상일 때 잡는다. AArch64의 하드웨어 tagging을 쓰면 오버헤드가 ASan의 절반 수준이다.

세 도구를 *경합*으로 보면 안 된다. *layered defense*다. 개발자 머신에서는 TSan으로 빠르게 잡고, CI에서는 TSan + HWASAN 별도 빌드로 검증하며, 프로덕션에서 의심 가는 코어 덤프는 Valgrind로 사후 분석한다. 각자의 자리가 다르다.

### 같은 코드, 다른 도구의 출력

같은 race를 각 도구가 어떻게 보고하는지의 형식을 알아 두면 디버깅이 빨라진다. TSan은 *happens-before 그래프*를 그대로 출력한다 — "이 쓰기와 저 읽기 사이에 sync가 없다"는 형식. Helgrind는 *락 보유 집합*을 추적해 "이 접근은 lock A를 잡고, 저 접근은 lock B를 잡았다"고 보고한다. DRD는 *segment* 모델로 "두 segment 사이에 ordering이 없다"고 보고한다.

세 도구가 *같은 race*를 잡아도 메시지 형식이 다르므로, 한 보고서에서 다른 도구의 결과를 추론하지 못한다. 각 도구의 출력 형식을 *한 번씩* 직접 보고 익혀 두는 것이 11장 디버깅 절의 핵심 실습이다.

## 11.6 정적 분석

### Clang Thread Safety Analysis

```cpp
// 컴파일: clang++ -Wthread-safety ...

class CAPABILITY("mutex") Mutex {
public:
    void lock() ACQUIRE();
    void unlock() RELEASE();
    bool try_lock() TRY_ACQUIRE(true);
};

class ThreadSafeCounter {
    Mutex mtx_;
    int value_ GUARDED_BY(mtx_);

public:
    void increment() {
        mtx_.lock();
        value_++;  // ✓ OK: mtx_ 보유 중
        mtx_.unlock();
    }

    void bad_increment() {
        value_++;  // ⚠️ 컴파일 경고: mtx_ 없이 접근
    }

    int get() const REQUIRES(mtx_) {
        return value_;  // 호출자가 락 보유해야 함
    }
};
```

### 매크로 정의

```cpp
// 스레드 안전 어노테이션
#if defined(__clang__)
    #define CAPABILITY(x) __attribute__((capability(x)))
    #define ACQUIRE(...) __attribute__((acquire_capability(__VA_ARGS__)))
    #define RELEASE(...) __attribute__((release_capability(__VA_ARGS__)))
    #define TRY_ACQUIRE(...) __attribute__((try_acquire_capability(__VA_ARGS__)))
    #define GUARDED_BY(x) __attribute__((guarded_by(x)))
    #define REQUIRES(...) __attribute__((requires_capability(__VA_ARGS__)))
    #define EXCLUDES(...) __attribute__((locks_excluded(__VA_ARGS__)))
#else
    #define CAPABILITY(x)
    #define ACQUIRE(...)
    #define RELEASE(...)
    #define TRY_ACQUIRE(...)
    #define GUARDED_BY(x)
    #define REQUIRES(...)
    #define EXCLUDES(...)
#endif
```

## 11.7 형식 검증 도구

### CHESS (Microsoft Research)

모든 가능한 스레드 스케줄을 체계적으로 탐색.

**장점**:
- 완전한 커버리지 (가능한 모든 인터리빙)
- 재현 가능한 버그 리포트

**단점**:
- 상태 폭발 (복잡한 프로그램은 불가)
- Windows/C# 위주

**용도**: 작은 동시성 알고리즘 검증

### Spin/Promela

```promela
// Promela 모델 예: Peterson's Algorithm

bool flag[2];
byte turn;
byte critical = 0;

proctype P(byte i) {
    flag[i] = true;
    turn = 1 - i;
    (flag[1-i] == false || turn == i);

    critical++;
    assert(critical == 1);  // 상호 배제 검증
    critical--;

    flag[i] = false;
}

init {
    run P(0);
    run P(1);
}
```

```bash
# Spin으로 검증
spin -a peterson.pml
gcc -o pan pan.c
./pan
```

## 11.8 디버깅 전략

### 문제 분리

```cpp
// 1. 최소 재현 케이스 만들기
void minimal_reproduction() {
    std::atomic<int> shared{0};

    std::thread t1([&] {
        for (int i = 0; i < 1000; ++i) {
            shared++;
        }
    });

    std::thread t2([&] {
        for (int i = 0; i < 1000; ++i) {
            shared++;
        }
    });

    t1.join();
    t2.join();

    std::cout << "Expected: 2000, Got: " << shared << "\n";
}
```

### 로깅

```cpp
// 스레드 안전 로깅
class ThreadSafeLogger {
    std::mutex mtx_;
    std::ofstream file_;

public:
    void log(const std::string& msg) {
        auto now = std::chrono::system_clock::now();
        auto tid = std::this_thread::get_id();

        std::lock_guard lock(mtx_);
        file_ << "[" << now << "][" << tid << "] " << msg << "\n";
        file_.flush();
    }
};

// 또는 lock-free 로깅
thread_local std::vector<std::string> local_log;

void log_local(const std::string& msg) {
    local_log.push_back(msg);
}

void flush_logs() {
    // 프로그램 종료 시 한 번에 출력
}
```

### C11 스레드 안전 로깅

```c
#include <threads.h>
#include <stdio.h>
#include <time.h>
#include <stdarg.h>

typedef struct {
    mtx_t mtx;
    FILE* file;
} ThreadSafeLogger;

void logger_init(ThreadSafeLogger* logger, const char* filename) {
    mtx_init(&logger->mtx, mtx_plain);
    logger->file = fopen(filename, "w");
}

void logger_log(ThreadSafeLogger* logger, const char* fmt, ...) {
    time_t now = time(NULL);
    thrd_t tid = thrd_current();

    mtx_lock(&logger->mtx);

    fprintf(logger->file, "[%ld][%p] ", (long)now, (void*)tid);

    va_list args;
    va_start(args, fmt);
    vfprintf(logger->file, fmt, args);
    va_end(args);

    fprintf(logger->file, "\n");
    fflush(logger->file);

    mtx_unlock(&logger->mtx);
}

void logger_destroy(ThreadSafeLogger* logger) {
    fclose(logger->file);
    mtx_destroy(&logger->mtx);
}

// Thread-local 로깅 (lock-free 대안)
#define MAX_LOG_ENTRIES 1000
#define MAX_LOG_MSG_LEN 256

typedef struct {
    char messages[MAX_LOG_ENTRIES][MAX_LOG_MSG_LEN];
    size_t count;
} LocalLog;

static _Thread_local LocalLog local_log = {{{0}}, 0};

void log_local(const char* msg) {
    if (local_log.count < MAX_LOG_ENTRIES) {
        snprintf(local_log.messages[local_log.count],
                 MAX_LOG_MSG_LEN, "%s", msg);
        local_log.count++;
    }
}

void flush_local_logs(FILE* out) {
    for (size_t i = 0; i < local_log.count; ++i) {
        fprintf(out, "%s\n", local_log.messages[i]);
    }
    local_log.count = 0;
}
```

### 조건부 중단점

```cpp
// GDB에서 조건부 중단점
// (gdb) break file.cpp:42 if counter == 100

// 코드에서 조건부 중단
void debug_break_if(bool condition) {
#ifdef DEBUG
    if (condition) {
        raise(SIGTRAP);  // 디버거 중단
    }
#endif
}
```

## 11.9 CI/CD 통합

### 테스트 파이프라인

```yaml
# .github/workflows/test.yml
name: Concurrency Tests

on: [push, pull_request]

jobs:
  tsan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build with TSan
        run: |
          cmake -B build -DCMAKE_CXX_FLAGS="-fsanitize=thread -g"
          cmake --build build

      - name: Run tests
        run: |
          cd build
          ctest --output-on-failure
        env:
          TSAN_OPTIONS: "history_size=7 halt_on_error=1"

  stress:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build
        run: cmake -B build && cmake --build build

      - name: Stress test
        run: |
          for i in {1..10}; do
            ./build/stress_test --duration=60
          done
```

### CMake 설정

```cmake
# CMakeLists.txt

option(ENABLE_TSAN "Enable ThreadSanitizer" OFF)

if(ENABLE_TSAN)
    add_compile_options(-fsanitize=thread -g)
    add_link_options(-fsanitize=thread)
endif()

# 테스트 타겟
add_executable(concurrent_tests tests/concurrent_tests.cpp)
target_link_libraries(concurrent_tests PRIVATE my_lib)

# CTest
enable_testing()
add_test(NAME concurrent_tests COMMAND concurrent_tests)

# 스트레스 테스트 (별도 타겟)
add_executable(stress_test tests/stress_test.cpp)
```

## 11.10 Structured concurrency — contract 기반 설계

Williams는 2판에서 *structured concurrency* 관점을 마지막에 다룬다. 핵심 사상은 *스레드의 lifetime을 lexical scope에 묶고*, 그 scope에 *명시적 contract*를 부여해 race를 *설계 시점*에 차단하는 것이다.

### Structured 스타일의 원칙

- **No detached threads**: `std::thread::detach()`는 사용하지 않는다. 모든 스레드는 *생성된 함수에서 join*된다.
- **Scope-bound parallelism**: 병렬 영역의 시작과 끝이 *한 함수 안*에 보인다.
- **Exceptions propagate up**: 자식 스레드의 예외는 부모 scope로 전달된다.
- **Cancellation is propagated**: `stop_token`이 자식들에게 *함께* 전달된다.

```cpp
// Unstructured — 책임이 분산되어 race 추적이 어렵다
void start_worker() {
    std::thread t(do_work);  // 누가 join하지?
    t.detach();              // 💥 lifetime이 함수 밖으로 새어 나감
}

// Structured — jthread로 scope-bound
void run_with_worker() {
    std::jthread t(do_work);  // ✓ scope 끝에서 자동 join + stop 요청
    // ...
}
```

### contract를 코드로 표현하기

structured concurrency는 *contract*를 명시적으로 적는 데서 출발한다.

```cpp
// contract 명시: 이 함수는
//   - in: 호출자가 buffer를 살아 있게 유지한다 (lifetime contract)
//   - in: stop_token이 요청되면 가급적 빨리 반환한다 (cancellation)
//   - out: 정상 종료 시 buffer에 N개의 결과가 채워진다
//   - out: 예외 발생 시 buffer 상태는 unspecified
void fill_results(std::span<int> buffer, std::stop_token st);

// 호출자: contract를 lexical scope로 강제
void compute_all() {
    std::vector<int> buf(1000);
    std::jthread t([&](std::stop_token st) {
        fill_results(buf, st);
    });
    // ... 다른 작업 ...
    // jthread 소멸 시: request_stop() + join()
    // buf의 lifetime은 t의 lifetime을 *반드시* 포함한다
}
```

핵심: `buf`와 `t`가 *같은 scope*에 있으면, 컴파일러가 lifetime을 강제한다. detach된 스레드에서는 *사람이* lifetime을 관리해야 하고, 거기서 race가 새어 나온다.

### Cancellation 전파

structured concurrency에서 cancellation은 *contract의 일부*다. `stop_token`을 외부에서 받지 않는 함수는 *취소 불가능한 contract*를 가진 것이다.

```cpp
// stop_token을 *받지 않으면* "취소 불가" 약속
void compute_one_step(const Input& in);

// stop_token을 받으면 "협조적 취소 가능" 약속
Result compute_long_running(const Input& in, std::stop_token st) {
    Result r;
    for (int i = 0; i < kSteps; ++i) {
        if (st.stop_requested()) return r;  // contract 이행
        r.step = i;
        compute_one_step(in);
    }
    return r;
}
```

### Structured concurrency의 테스트 이점

structured 스타일이 테스트를 어떻게 단순화하는가:

- **결정적 종료**: 모든 스레드가 *scope 끝*에 join되므로 leak이 없다.
- **lifetime이 명확**: 자료의 lifetime이 lexical scope = race가 *원천 차단*되는 영역이 크다.
- **cancellation 검증**: `stop_token`을 테스트에서 trigger해 *cancellation contract*를 단위 테스트할 수 있다.
- **예외 안전성 검증**: 자식이 예외를 던지면 부모 scope에서 잡힌다. exception-safety 테스트가 일반 함수와 동일한 방식으로 작성된다.

```cpp
// structured 테스트: cancellation contract 검증
TEST(LongTask, RespondsToCancellation) {
    std::atomic<bool> finished{false};
    {
        std::jthread t([&](std::stop_token st) {
            compute_long_running(make_input(), st);
            finished = true;
        });
        std::this_thread::sleep_for(50ms);
        t.request_stop();
        // scope 끝: join 보장
    }
    EXPECT_TRUE(finished);  // cancellation 후 정상 반환했는지
}
```

### 책의 결론

Williams는 11장의 결론에서 *어떤 도구도 동시성 설계의 빈틈을 메우지 않는다*고 말한다. TSan은 race를 찾을 뿐, *race가 없는 설계*를 만들지 않는다. structured concurrency 패턴은 *설계 단계*에서 race가 들어올 수 있는 표면을 좁힌다. sanitizer는 그 표면에 남은 작은 틈을 검출한다. 둘이 결합되어야 동시성 코드가 안전해진다.

## 11.11 모범 사례 요약

### 개발 시

| 단계 | 활동 |
|------|------|
| 설계 | 공유 데이터 최소화, 불변 객체 선호 |
| 구현 | RAII 락, scoped_lock, atomic 사용 |
| 코드 리뷰 | Race 패턴 체크리스트 검토 |
| 테스트 | TSan 활성화, 동시성 테스트 작성 |
| CI | TSan + 스트레스 테스트 자동화 |

### 디버깅 시

1. **TSan 먼저**: 가장 빠르고 정확
2. **최소 재현**: 문제를 단순화
3. **로깅**: 스레드 ID와 타임스탬프 포함
4. **스트레스**: 반복 실행으로 재현율 높이기
5. **리뷰**: 다른 사람의 눈으로 확인

## 11.12 시리즈 마무리

### 배운 것들

**C++ Concurrency in Action 요약**

- 1장: 동시성 개념과 C++ 지원
- 2장: 스레드 생성과 관리
- 3장: 데이터 공유와 보호 (mutex, lock)
- 4장: 동기화 (condition_variable, future)
- 5장: 메모리 모델과 atomic
- 6장: 락 기반 자료구조
- 7장: 락 프리 자료구조
- 8장: 동시성 코드 설계
- 9장: 스레드 풀과 고급 관리
- 10장: 병렬 알고리즘
- 11장: 테스트와 디버깅

### 추가 학습 방향

| 주제 | 자료 |
|------|------|
| 메모리 모델 심화 | "C++ Memory Model" - Herb Sutter |
| 락 프리 심화 | "The Art of Multiprocessor Programming" |
| 병렬 알고리즘 | Intel oneTBB 문서 (구 TBB) |
| GPU 병렬 | CUDA, OpenCL, SYCL |
| 분산 시스템 | "Designing Data-Intensive Applications" |

### 핵심 원칙

1. **단순하게 시작**: mutex부터, 필요할 때만 복잡하게
2. **도구 활용**: TSan은 필수
3. **테스트 철저히**: 동시성 버그는 나중에 발견하면 비용이 큼
4. **문서화**: 동기화 정책을 명확히
5. **겸손하게**: "내 코드에 레이스가 없다"고 확신하지 마라

## 정리

- **동시성 버그**는 재현이 어렵다 (Heisenbug)
- **코드 리뷰**에서 race 패턴을 찾아라
- **TSan**은 필수 도구다. CI에 통합하라
- **정적 분석**으로 컴파일 시 오류를 잡아라
- **스트레스 테스트**로 재현율을 높여라
- 동시성은 **어렵다**. 도구와 기법을 적극 활용하라

이 시리즈를 통해 C++ 동시성 프로그래밍의 기초부터 고급 기법까지 살펴보았다. 안전하고 효율적인 동시성 코드를 작성하기 위해서는 지속적인 학습과 실습이 필요하다.

## 한국 개발자의 함정

```
1. *재현 안 되니 없는 버그*
   - Heisenbug는 *항상* 존재함
   - 1000번에 1번 → 운영에선 매시간 발생
   - 재현 안 되면 *더 위험*

2. *printf로 디버깅*
   - I/O가 타이밍을 바꿔 버그가 사라짐
   - 보통 lock-free 또는 ring buffer 로깅
   - 또는 TSan으로 정적 탐지

3. *TSan은 false positive*라는 회피
   - false positive 매우 드물다 (보통 false negative)
   - 경고 무시 = 운영 사고
   - 억제는 정말 검증된 케이스만

4. *valgrind만 쓰면 충분*
   - Helgrind / DRD는 매우 느림
   - TSan이 더 정확 + 빠름
   - 둘 다 쓰는 게 이상적

5. *동시성 테스트는 한 번만*
   - 100번 실행해서 통과 = 운 좋음
   - 매 commit마다 + 스트레스 + 다양한 코어 수
   - CI에서 자동화
```

## 실무 적용

```
이론 → 실무:
- ThreadSanitizer        → -fsanitize=thread (Clang/GCC)
- Valgrind Helgrind/DRD  → valgrind --tool=helgrind
- Static analysis        → Clang Thread Safety Analysis
- 형식 검증              → CHESS, Spin, TLA+ (분산)
- Stress testing         → 반복 실행 + 다양한 인터리빙
- Fuzzing                → libFuzzer + concurrent harness

CI 통합:
- GitHub Actions: TSan + 스트레스 테스트
- GitLab CI: 동일
- Jenkins: 비슷한 패턴

언어별:
- C++: TSan, Helgrind, Clang TSA
- Java: jcstress (concurrency stress test 도구)
- Rust: loom (model checker), miri (UB detector)
- Go: race detector (go test -race)

설계 원칙:
- 공유 상태 최소화 (immutable 선호)
- atomic 또는 명확한 락 정책
- 동기화 정책 문서화
- 모든 PR에 동시성 영향 분석
```

## 자기 점검

```
□ Data race와 Race condition 차이?
□ Heisenbug의 정의와 대응 방법?
□ Check-then-act 패턴이 위험한 이유?
□ TSan의 작동 원리 (happens-before 추적)?
□ Clang Thread Safety Analysis의 capability 시스템?
□ Livelock과 Deadlock 차이?
□ Stress test와 unit test의 다른 점?
```

## 시리즈 마무리

C++ Concurrency in Action 11장의 여정을 끝내며.

```
1장: 동시성 개념          → 동시성과 병렬성 구분
2장: Thread 관리         → join/detach, jthread
3장: 데이터 공유         → mutex, lock_guard, deadlock
4장: 동기화              → condition_variable, future
5장: 메모리 모델         → atomic, memory_order
6장: Lock-based 자료구조 → thread-safe stack/queue/map
7장: Lock-free 자료구조  → CAS, ABA, hazard pointer
8장: 동시성 설계         → false sharing, AoS/SoA
9장: 스레드 풀          → work stealing, stop_token
10장: 병렬 알고리즘     → execution::par, reduce, scan
11장: 테스트와 디버깅   → TSan, 정적 분석
```

C++ 동시성의 모든 도구가 여기 있다. 다음은 **이 도구들을 어떤 자료구조에 어떻게 적용할지**의 이론 — *The Art of Multiprocessor Programming*에서 다룬다.

## 관련 항목

- [Ch 9: Advanced Thread Management](/blog/parallel/cpp-concurrency-in-action/chapter09-advanced-thread-management)
- [Ch 10: Parallel Algorithms](/blog/parallel/cpp-concurrency-in-action/chapter10-parallel-algorithms)
- [Ch 1: Hello Concurrent World](/blog/parallel/cpp-concurrency-in-action/chapter01-hello-concurrent-world) — 시작점
- [AMP Ch 1: Introduction](/blog/parallel/parallel-principles/ch01-introduction) — 이론 시리즈
- [AMP Ch 18: Transactional Memory](/blog/parallel/parallel-principles/ch18-transactional-memory) — 이론 시리즈 끝
