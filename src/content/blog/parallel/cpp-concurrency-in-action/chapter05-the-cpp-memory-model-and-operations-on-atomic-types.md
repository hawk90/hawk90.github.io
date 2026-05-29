---
title: "Ch 5: The C++ memory model and operations on atomic types"
date: 2026-05-06T05:00:00
description: "memory order — relaxed / acquire / release / seq_cst. std::atomic, fence, happens-before."
tags: [C++, Concurrency, Memory Model, Atomic, Memory Order]
series: "C++ Concurrency in Action"
seriesOrder: 5
draft: true
---

뮤텍스 없이 스레드 안전한 코드를 작성하려면 메모리 모델을 이해해야 한다. 이 장에서는 C++ 메모리 모델의 기초 개념, `std::atomic` 타입들, 그리고 memory order를 통한 동기화 강제 방법을 다룬다. 책 5장의 구조를 따라간다. 메모리 모델 기본기, atomic 타입과 연산, 동기화와 순서 강제 순이다.

## 5장이 푸는 단 하나의 문제

직관적으로 "코드가 적힌 순서대로 실행된다"고 믿고 싶지만, 현실은 그렇지 않다. CPU는 *명령을 재배치*해 파이프라인을 채우고, 컴파일러는 *최적화로 순서를 바꾸며*, 멀티코어 시스템에서는 *한 코어의 쓰기가 다른 코어에 늦게 보인다*. 이 어긋남을 다스리지 못하면 락 없는 자료구조는 즉시 무너진다.

5장이 푸는 단 하나의 문제는 이것이다. **CPU와 컴파일러가 마음대로 순서를 바꾸는 세상에서, 두 스레드가 "이쪽이 먼저"라고 어떻게 약속하는가**. C++ 메모리 모델은 이 약속의 *최소 단위*와 *강도*를 표준 어휘로 정한다. 약속이 너무 약하면 race가 살아나고, 너무 강하면 성능을 잃는다. 5장은 그 사이의 격자를 그린다.

### 비유로 잡는 핵심 개념

추상적인 표준 어휘를 일상의 그림으로 환원하면 의도가 분명해진다. 본문에서 각 개념을 정의할 때 다시 참조하게 된다.

| 개념 | 비유 | 본질 |
|------|------|------|
| `memory_order` | 신호등의 색깔 — 강한 빨강은 모든 차가 멈춤, 약한 점멸은 일부만 양보 | 순서 약속의 *강도*를 선택 |
| `happens-before` | 영화 *플롯의 시간 순서* — 실제 촬영 순서는 다를 수 있음 | 관측 가능한 인과 관계의 부분 순서 |
| `synchronizes-with` | 두 장면을 잇는 *매치 컷* — release가 acquire에 닿는 한 쌍 | 두 스레드 사이의 happens-before를 만드는 경로 |
| `modification order` | 한 무대 위 한 배우의 *대사 순서* — 관객마다 같은 순서로 듣는다 | 단일 객체의 쓰기 전순서, 전 스레드 합의 |
| `atomic_flag` | 가장 작은 자물쇠 — 단 1비트 | lock-free가 표준으로 강제되는 유일한 atomic |
| `seq_cst` | 모든 신호등이 *동시에* 빨강·초록 — 전역 시각 동기화 | 전 스레드 단일 전순서. 비싸지만 안전 |
| `relaxed` | 양보 표지판 — 도착 순서만 기억하면 됨 | 단일 객체의 modification order만 보장 |

신호등의 색깔이 *얼마나 강한 약속이냐*를 정하고, 영화의 플롯 순서가 *관객이 본 순서대로의 인과*를 정한다. 두 그림을 머리에 두면, 본문의 acquire/release 쌍이 *어떤 매치 컷*을 만드는지 추적하기 쉬워진다.

### 시스템에서 만나는 같은 패턴

C++ 메모리 모델은 진공에서 태어나지 않았다. 하드웨어가 이미 가지고 있던 *순서 보장의 격자*를 표준 어휘로 옮긴 것에 가깝다. 따라서 다른 플랫폼과 언어의 모델은 C++ 어휘와 일대일에 가깝게 매핑된다.

- **x86 TSO (Total Store Order)**: x86은 *거의 모든* load가 acquire, *거의 모든* store가 release처럼 동작한다. seq_cst를 위해서만 `mfence`나 `lock` 접두사가 필요하다. 그래서 x86에서는 `memory_order_acquire`/`release`를 써도 코드 변화가 거의 없다.
- **ARMv8 LDAR/STLR**: ARMv8에는 *acquire load* (`LDAR`)와 *release store* (`STLR`) 명령이 분리되어 존재한다. C++의 acquire/release가 그대로 한 명령으로 번역된다. relaxed는 일반 `LDR`/`STR`.
- **Java `volatile`**: Java 5 이후 `volatile`은 seq_cst와 같은 의미다. C++의 `std::atomic<T>` 기본 모드(`seq_cst`)와 같은 격을 가진다.
- **Linux 커널 `READ_ONCE`/`WRITE_ONCE` + `smp_mb`**: 커널은 acquire/release/full-barrier를 매크로로 직접 노출한다. C++ atomic이 표준화한 것을 매크로로 손수 만든 셈이다.
- **Rust `Ordering::{Relaxed, Acquire, Release, AcqRel, SeqCst}`**: 변수명까지 같다. Rust의 메모리 모델은 의도적으로 C++ 모델을 그대로 채택했다.

5장의 어휘를 익혀 두면, x86 어셈블리든 ARM 매뉴얼이든 Java 메모리 모델이든 Linux 커널 매크로든 *같은 격자 위에서* 읽을 수 있다. 메모리 모델은 한 언어의 문법이 아니라 *하드웨어 시대의 공용어*다.

### 메모리 오더 선택의 결정 규칙

본문에서 가장 자주 마주칠 결정은 *어떤 memory_order를 골라야 하는가*다. 너무 강하면 성능을 잃고, 너무 약하면 코드가 *어떤 머신에서는 잘 돌고 어떤 머신에서는 부서진다*. 다음 다섯 규칙이 그 결정을 좁힌다.

1. *처음 작성하는 atomic 코드*는 모두 `seq_cst`로 시작한다. 정확성을 먼저 잡고, 측정으로 약화시킨다.
2. 카운터처럼 *값만 정확하면 되고 다른 변수의 가시성과 무관한* 경우 → `relaxed`.
3. 한쪽이 *플래그를 세팅*하고 다른 쪽이 *그 플래그 이후의 데이터를 읽는* 패턴 → 세팅 측 `release`, 읽기 측 `acquire`. 쌍으로 다닌다.
4. RMW(`fetch_add`, `compare_exchange` 등)가 release sequence를 *끊지 않도록* 유지해야 할 때 → `acq_rel`.
5. 두 변수의 전순서를 *서로 다른 스레드*가 같은 방식으로 봐야 한다 → `seq_cst`. 단, 다른 옵션이 충분하지 않은 경우에 한정.

규칙의 핵심은 *짝*이다. release는 acquire와, acquire는 release와 짝을 이뤄야 happens-before가 생긴다. 한쪽만 강하게 두는 코드는 *효과가 없다*. 본문에서 acquire/release 쌍이 *어디에서 만들어지는가*를 추적하면 5장의 모든 그림이 풀린다.

### 가장 자주 보는 패턴 — 데이터 + 플래그

전체 장의 절반은 다음 한 패턴의 변주다. *비-atomic 데이터*를 먼저 채우고, *atomic 플래그*로 "준비됐다"를 알린다. 다른 스레드는 플래그가 참이 된 뒤에야 데이터를 읽는다. 락 없이 데이터의 가시성을 약속하는 가장 단순한 형태다.

```cpp
std::atomic<bool> ready{false};
int data = 0;  // 비-atomic

// 생산자
data = 42;
ready.store(true, std::memory_order_release);  // 이전 쓰기가 보임을 약속

// 소비자
while (!ready.load(std::memory_order_acquire)) { /* spin */ }
assert(data == 42);  // 절대 0이 보이지 않는다
```

이 코드의 핵심은 두 줄의 *짝*이다. `release` store는 *그 이전의 모든 쓰기*가 다른 스레드에 보이도록 약속한다. `acquire` load는 *그 이후의 모든 읽기*가 release 이후의 상태를 본다고 약속한다. 두 줄을 모두 `relaxed`로 바꾸면 `data == 0`이 *합법적*으로 관측된다. 두 줄 모두 `seq_cst`로 두면 정확하지만 비싼 명령(`mfence`/`dmb ish`)이 끼어든다. 본문 5.2~5.3은 이 패턴을 *수정 순서*와 *synchronizes-with*의 격자 위에서 정확하게 정의한다.

## 5.1 메모리 모델 기본기

### 객체와 메모리 위치

C++ 표준은 모든 데이터를 **객체(object)** 의 집합으로 본다. 객체는 타입과 수명을 가진 저장 영역이다. 그리고 모든 객체는 하나 이상의 **메모리 위치(memory location)** 로 구성된다.

메모리 위치의 정의는 두 가지 중 하나다.

- 스칼라 타입의 객체 또는 그 부분 객체 — `int`, `float`, 포인터, 열거형
- 인접한 일련의 비트필드

```cpp
struct S {
    int        i;     // 위치 1
    double     d;     // 위치 2
    unsigned   b1 : 10;  // 위치 3 (b1, b2, b3가 인접하면 한 위치)
    int        b2 : 25;  // 위치 3
    int        b3 : 0;   // 비트필드 분리 — b4는 새 위치
    int        b4 : 9;   // 위치 4
    std::string s;       // 위치 5 + 그 안의 부분 객체들
};
```

표준의 핵심 규칙은 단순하다. **하나의 메모리 위치에 둘 이상의 스레드가 동시에 접근하고, 그 중 하나라도 쓰기라면 데이터 레이스이고 동작은 정의되지 않는다.** 데이터 레이스를 피하는 방법은 두 가지다. 동기화 프리미티브(뮤텍스, atomic)로 접근을 강제로 직렬화하거나, atomic 연산으로 그 메모리 위치에 대한 happens-before 관계를 만들어 두는 것이다.

### 수정 순서

같은 객체에 대한 모든 쓰기는 **수정 순서(modification order)** 라는 단일한 전역 순서를 갖는다. 이 순서는 객체별로 결정되며, 모든 스레드는 이 순서에 동의해야 한다.

```cpp
std::atomic<int> x{0};

// 스레드 A
x.store(1);
x.store(2);

// 스레드 B
x.store(3);
```

`x`의 수정 순서는 가령 `0 → 1 → 2 → 3` 또는 `0 → 3 → 1 → 2`처럼 어떤 인터리빙이든 가능하다. 다만 한 번 정해진 수정 순서는 모든 스레드에 대해 동일하다. 즉 한 스레드가 `x`에서 `2` 다음에 `1`을 봤는데 다른 스레드가 `1` 다음에 `2`를 보는 일은 없다. 한 스레드 안에서 같은 atomic에 대한 연속된 쓰기는 그 스레드의 프로그램 순서대로 수정 순서에 들어간다.

수정 순서는 **객체별**이라는 점이 중요하다. 다른 atomic 변수 사이의 순서는 별도의 memory order 규칙으로 묶어주지 않으면 보장되지 않는다.

### 컴파일러와 CPU는 재정렬한다

작성한 코드와 실행되는 코드는 다를 수 있다.

```cpp
int a = 0, b = 0;

// 스레드 1
void thread1() {
    a = 1;  // (1)
    b = 2;  // (2)
}

// 스레드 2
void thread2() {
    while (b != 2);  // (3)
    assert(a == 1);  // 실패할 수 있다
}
```

두 단계에서 재정렬이 일어난다.

- **컴파일러 재정렬**: 최적화로 (1)과 (2)의 순서를 바꿀 수 있다.
- **CPU 재정렬**: 스토어 버퍼, 캐시, 비순차 실행 때문에 다른 코어에서 다른 순서로 관측될 수 있다.

비-atomic 변수에 대한 재정렬을 막으려면 atomic 연산이 만들어내는 happens-before 관계가 필요하다.

### sequenced-before, synchronizes-with, happens-before

책은 세 가지 관계를 구별한다.

**sequenced-before**는 *한 스레드 안에서* 평가들 사이의 순서다. 대체로 프로그램 순서와 일치한다. `f(); g();`에서 `f()`의 평가는 `g()`의 평가보다 sequenced-before다.

**synchronizes-with**는 *스레드 간* 관계다. 한 스레드의 atomic store와 다른 스레드의 같은 atomic 변수에 대한 atomic load 사이에 성립할 수 있다. 정확히는 release 의미를 가진 store와 그 값을 본 acquire 의미를 가진 load 사이에 synchronizes-with가 만들어진다. 뮤텍스의 unlock과 다음 lock 사이도 synchronizes-with다.

**happens-before**는 위 둘로부터 유도된다. A가 B와 같은 스레드에서 sequenced-before거나, A가 B와 synchronizes-with거나, 그 둘의 추이적 합성이면 A happens-before B다.

```text
sequenced-before:   같은 스레드 안. 프로그램 순서.
synchronizes-with:  스레드 사이. release ↔ acquire 또는 unlock ↔ lock.
happens-before:     위 둘의 추이적 폐쇄.
```

happens-before가 성립하면 A의 쓰기 효과가 B에서 보장된다. 데이터 레이스를 피하는 본질은 같은 메모리 위치에 대한 모든 충돌하는 접근 쌍 사이에 happens-before 관계를 보장하는 것이다.

뮤텍스는 lock과 unlock으로 happens-before 관계를 자동으로 만든다. atomic은 memory order로 이 관계를 수동 제어한다.

표준은 inter-thread happens-before와 그냥 happens-before를 분리하지만 효과는 거의 같다. 책에서는 이 구별이 거의 등장하지 않으므로 “happens-before”라고만 부르고 넘어간다. 한 가지 미묘한 차이는 consume의 *carries-a-dependency-to* 관계가 통상의 happens-before에는 들어가지만 inter-thread에는 들어가지 않는다는 점인데, 새 코드에서 consume을 안 쓴다면 신경 쓸 일이 없다.

## 5.2 C++에서의 atomic 연산과 타입

### lock-free 보장과 is_lock_free

`std::atomic<T>`의 모든 연산이 진짜로 lock-free일까. 표준은 보장하지 않는다. 구현은 내부적으로 뮤텍스로 폴백할 수 있고, 그 경우 lock-free 알고리즘에 사용해도 lock-free가 아니다.

```cpp
std::atomic<MyStruct> x;
std::cout << std::boolalpha << x.is_lock_free() << '\n';
// 플랫폼·타입에 따라 true 또는 false
```

C++17부터는 컴파일 타임에 결정할 수 있는 `static constexpr` 멤버 `is_always_lock_free`와 매크로(`ATOMIC_INT_LOCK_FREE` 등)가 있다.

```cpp
static_assert(std::atomic<int>::is_always_lock_free);
// 컴파일 타임 보장. lock-free 알고리즘 작성 시 활용.
```

매크로의 값은 세 가지다. `0`이면 절대 lock-free가 아니다. `1`이면 런타임에 결정된다. `2`이면 항상 lock-free다.

```cpp
#if ATOMIC_POINTER_LOCK_FREE == 2
    // 항상 lock-free. 컴파일 타임 분기로 lock-free 경로를 골라낸다.
#elif ATOMIC_POINTER_LOCK_FREE == 1
    // 런타임에 is_lock_free() 호출이 필요
#else
    // 절대 lock-free 아님. 다른 전략을 쓰자.
#endif
```

표준이 **모든 구현에 대해 항상 lock-free** 라고 못 박은 atomic 타입은 단 하나, `std::atomic_flag`다. 다른 타입은 플랫폼이 정한다.

`std::atomic<T>`는 복사 생성/대입이 삭제되어 있다. 한 atomic을 다른 atomic에 *원자적으로 복사하는 연산이 일반적으로 불가능* 하기 때문이다. 값 복사는 `load`와 `store`를 따로 호출해 명시적으로 한다. 같은 이유로 atomic은 함수 인자나 반환값으로 *값* 전달할 수 없다. 참조로 전달한다.

### std::atomic_flag — 가장 단순한 atomic

`std::atomic_flag`는 두 상태(set/clear)만 가지는 가장 단순한 atomic이다. 표준이 lock-free를 보장하는 유일한 타입이다. 다른 모든 atomic은 이걸 기반으로 구현할 수 있다.

```cpp
#include <atomic>

std::atomic_flag flag = ATOMIC_FLAG_INIT;  // C++20 전까진 반드시 이렇게 초기화

// test_and_set: true로 설정하고 이전 값 반환
bool was_set = flag.test_and_set();

// clear: false로 설정
flag.clear();
```

`std::atomic_flag`에는 store, load가 없다. `test_and_set`(RMW)과 `clear`(store)만 제공한다. 값을 비파괴적으로 읽을 수 없다는 점이 의도적인 제약이다. 이 제약 덕분에 표준이 어떤 플랫폼에서도 진짜 lock-free 구현을 강제할 수 있다.

C++20부터 `ATOMIC_FLAG_INIT` 매크로 없이 기본 생성하면 clear 상태로 초기화되고, `test()`와 `wait()`/`notify_one()`/`notify_all()`이 추가되었다.

```cpp
// C++20
std::atomic_flag flag;            // ATOMIC_FLAG_INIT 불필요
bool current = flag.test();       // 비파괴적 읽기

// blocking wait — flag 값이 인자와 같은 동안 잠
flag.wait(false);                  // false인 동안 대기
flag.test_and_set();
flag.notify_all();                 // 대기 중인 스레드 깨움
```

`wait`/`notify`는 condition variable처럼 효율적인 대기를 제공한다. 다른 모든 atomic 타입에도 추가되었다. 스핀 루프를 비지 웨이트가 아닌 OS 수준 블로킹으로 바꿀 수 있다.

#### atomic_flag로 만든 스핀락

```cpp
class spinlock_mutex {
    std::atomic_flag flag = ATOMIC_FLAG_INIT;

public:
    void lock() {
        while (flag.test_and_set(std::memory_order_acquire)) {
            // 스핀
        }
    }

    void unlock() {
        flag.clear(std::memory_order_release);
    }
};
```

`test_and_set`이 acquire, `clear`가 release를 가져 lock과 unlock이 happens-before 관계를 만든다. 단 스핀은 CPU를 낭비한다. 실무에서는 `std::mutex`를 쓴다.

### std::atomic<bool>

`std::atomic_flag`보다 다루기 쉬운 진짜 atomic 타입의 시작은 `std::atomic<bool>`이다. 단 lock-free 여부는 플랫폼에 달려 있다.

```cpp
std::atomic<bool> b{true};
b = false;            // 대입 — store와 동일. 값을 반환하지 않는다.
bool x = b.load();    // load
b.store(true);
x = b.exchange(false, std::memory_order_acq_rel);
```

대입 연산자가 일반 `bool`과 달리 *대입한 값*을 그대로 반환한다는 점에 주의한다. 참조를 반환하면 다른 스레드가 그 사이에 값을 바꿔놨을 때 race를 만들기 때문이다.

### std::atomic<T*> — 포인터에 대한 산술

`std::atomic<T*>`는 atomic<bool>의 연산에 더해 포인터 산술 `fetch_add`/`fetch_sub`/`+=`/`-=`/`++`/`--`를 제공한다. 산술의 단위는 `sizeof(T)`다. 일반 포인터처럼 인덱스가 아니라 *바이트가 아닌* 요소 단위로 움직인다는 뜻이다.

```cpp
class Foo {};
Foo arr[5];
std::atomic<Foo*> p{arr};

Foo* old = p.fetch_add(2);    // p는 arr+2를 가리키고, old는 arr를 반환
old = p.fetch_sub(1);         // p는 arr+1, old는 arr+2
p += 1;                        // p는 arr+2
p -= 2;                        // p는 arr
++p;                           // p는 arr+1
```

`fetch_add`/`fetch_sub`는 RMW이므로 memory order 인자를 받는다. `+=`, `-=`, `++`, `--`는 항상 `memory_order_seq_cst`를 쓴다.

### std::atomic<T>의 일반 사용자 정의 타입

`std::atomic<T>`에 임의의 사용자 정의 타입 `T`를 넣을 수 있는 조건은 명확하다.

- `T`는 **trivially copyable**이어야 한다. virtual 함수, virtual 베이스, 비-trivial 복사/이동/소멸자가 없어야 하고, 모든 멤버 역시 trivially copyable이어야 한다.
- 비교는 비트 단위(`memcmp`)로 이루어진다. 따라서 동일한 값을 가진 인스턴스에 비교 결과가 다를 수 있는 패딩이 있으면 `compare_exchange`가 의도와 다르게 실패한다.

```cpp
struct Point { float x, y; };   // OK — trivially copyable
std::atomic<Point> ap{{1.0f, 2.0f}};

struct Bad {
    Bad();
    Bad(const Bad&);  // 사용자 정의 복사 생성자
};
// std::atomic<Bad>는 컴파일 에러 또는 ill-formed
```

표준은 비-trivially-copyable 타입에 대한 `std::atomic`을 금지한다. 이유는 두 가지다. 첫째, 일반 복사 생성자/소멸자가 호출되는 atomic은 정의하기 어렵다. 사용자 코드가 atomic의 내부 상태에 접근하게 된다. 둘째, atomic 연산을 lock-free로 구현할 수 있는 객체 크기가 플랫폼마다 제한되어 있어 임의 타입을 안전하게 atomic화 할 수 없다. 큰 객체에 대한 `std::atomic`은 보통 내부 뮤텍스로 폴백한다.

`std::atomic<float>`/`<double>`은 가능하지만 NaN의 비교 동작 등 부동 소수점 특유의 이슈가 있다. `compare_exchange`가 비트 비교를 쓰기 때문에 같은 수학적 값이라도 비트 표현이 다르면 실패한다.

### 표준 정수형 atomic

`std::atomic<int>` 같은 정수형 atomic은 `bool`/포인터의 연산에 더해 `fetch_and`, `fetch_or`, `fetch_xor`, `+=`, `-=`, `&=`, `|=`, `^=`를 제공한다. `fetch_mul`이나 `fetch_div`는 없다. 곱셈/나눗셈은 거의 항상 `compare_exchange` 루프로 구현한다.

```cpp
std::atomic<int> x{0};

x.store(42);              // store
int v = x.load();         // load
int old = x.exchange(100);

// RMW
x.fetch_add(5);
x.fetch_sub(3);
x.fetch_and(0xF);
x.fetch_or(0x10);
x.fetch_xor(0x1);
```

`fetch_add`/`fetch_sub`의 부호 있는 오버플로는 *정의되어 있다*. 비-atomic 정수의 부호 있는 오버플로가 정의되지 않은 동작인 것과 다르다. 표준은 atomic 산술 RMW에 대해 wrap-around를 정의한다. 시간 카운터나 generation counter를 32비트 atomic으로 다룰 때 의미 있는 차이다.

### volatile과 atomic의 구분

`volatile`은 atomic이 아니다. `volatile`이 보장하는 것은 컴파일러가 *해당 객체의 접근* 을 최적화로 합치거나 없애지 못한다는 점이다. 멀티스레드 데이터 레이스에 대해서는 아무것도 약속하지 않는다.

```cpp
volatile int a = 0;   // 멀티스레드 동기화에 쓸 수 없음
std::atomic<int> b{0}; // 동기화 가능

// volatile은 메모리 매핑 I/O 레지스터, signal handler 변수 등에 씀
```

C++에서 멀티스레드 동기화에 `volatile`을 쓰는 코드는 거의 항상 잘못이다. Java의 `volatile`과 의미가 완전히 다르다는 점도 자주 혼동된다.

### compare_exchange와 spurious failure

**CAS(Compare-And-Swap)** 는 lock-free 알고리즘의 핵심 빌딩 블록이다. 기대값과 같으면 새 값으로 교체하고 성공/실패를 반환한다.

```cpp
std::atomic<int> x{5};

int expected = 5;
bool success = x.compare_exchange_strong(expected, 10);
// x == 5였으므로: x = 10, success = true, expected = 5 (변경 없음)

expected = 5;
success = x.compare_exchange_strong(expected, 20);
// x == 10이므로: x = 10 (불변), success = false, expected = 10 (현재값으로 갱신)
```

두 가지 변종이 있다.

- `compare_exchange_strong`: 값이 일치하면 *반드시* 교체한다.
- `compare_exchange_weak`: 값이 일치해도 **spurious failure** 가 일어날 수 있다. 즉, 비교는 통과했지만 교환을 못 한 채로 `false`를 돌려준다.

spurious failure는 임의로 나는 게 아니라 하드웨어 사정 때문에 난다. ARM, POWER 같은 LL/SC(Load-Linked/Store-Conditional) 기반 아키텍처에서 컨텍스트 스위치나 캐시 무효화가 SC를 실패시킬 수 있다. x86의 `lock cmpxchg`는 spurious failure가 없지만 표준은 모든 플랫폼을 포괄하기 위해 weak 버전을 둔다.

```cpp
// strong: 단일 시도. 의미적 실패와 spurious failure를 구분하지 않아도 됨.
if (x.compare_exchange_strong(expected, new_value)) {
    // 성공
}

// weak: 루프 안에서 spurious failure를 자연스럽게 흡수.
while (!x.compare_exchange_weak(expected, new_value)) {
    // expected는 현재 값으로 자동 갱신됨
    // 새 값 계산이 expected에 의존한다면 여기서 다시 계산
}
```

루프 안에서 쓸 거라면 weak를 선호한다. 어차피 다시 돌 거라면 strong이 내부에서 추가 루프를 도는 비용을 아낄 수 있기 때문이다. 단일 시도라면 strong을 쓴다.

`compare_exchange`는 성공과 실패에 대해 서로 다른 memory order를 받을 수 있다. 실패 시 order는 성공 시 order보다 *강할 수 없고*, release를 포함할 수도 없다(실패한 호출은 store를 하지 않으므로).

```cpp
head.compare_exchange_weak(
    expected, desired,
    std::memory_order_acq_rel,   // 성공: acquire + release
    std::memory_order_acquire    // 실패: acquire (release는 불가)
);
```

단일 order 인자만 주면 성공/실패 모두에 적용된다. 단 release/acq_rel을 단일로 주면 실패 시 자동으로 release 비트가 떨어진 형태(release → relaxed, acq_rel → acquire)로 해석된다.

### std::atomic<std::shared_ptr> (C++20)

C++20부터 `std::atomic<std::shared_ptr<T>>`가 표준에 들어왔다. 이전에는 `std::atomic_load`/`std::atomic_store`의 free function 오버로드로 다뤘지만 C++20에서 정식 부분 특수화로 자리잡았고, 자유 함수 버전은 deprecated다.

```cpp
std::atomic<std::shared_ptr<MyData>> state;

void update(std::shared_ptr<MyData> p) {
    state.store(std::move(p), std::memory_order_release);
}

void consume() {
    auto p = state.load(std::memory_order_acquire);
    if (p) use(*p);
}
```

내부 구현은 보통 lock-free가 아니다. shared_ptr의 control block 갱신을 atomic으로 만들려면 더블 워드 CAS나 내부 뮤텍스가 필요하기 때문이다. `is_lock_free()`로 확인한다.

## 5.3 동기화 연산과 순서 강제

### 여섯 가지 memory order

C++ 표준은 atomic 연산에 줄 수 있는 memory order를 여섯 종류로 정의한다.

```cpp
enum memory_order {
    memory_order_relaxed,
    memory_order_consume,   // C++17 이후 사실상 권장 중단
    memory_order_acquire,
    memory_order_release,
    memory_order_acq_rel,
    memory_order_seq_cst    // 기본값
};
```

이 여섯 값은 세 가지 모델로 묶인다.

- **Sequentially consistent**: `memory_order_seq_cst`
- **Acquire-release**: `memory_order_consume`, `memory_order_acquire`, `memory_order_release`, `memory_order_acq_rel`
- **Relaxed**: `memory_order_relaxed`

연산 종류에 따라 의미 있는 order가 다르다. store는 `relaxed`, `release`, `seq_cst` 중에서, load는 `relaxed`, `consume`, `acquire`, `seq_cst` 중에서, RMW(read-modify-write)는 모두 가능하다.

각 모델은 표현력과 비용의 균형이 다르다. seq_cst가 가장 강하고 비싸고, relaxed가 가장 약하고 싸다. 같은 프로그램에 모델을 섞어 쓸 수 있는데, 그러면 강한 모델의 보장이 약한 모델의 동기화 지점에서 끊어질 수 있다. 책은 약한 모델을 쓸 때마다 *왜* 그래도 안전한지 머리에서 모델을 굴려보길 권한다.

### Sequential consistency — 단일 전역 순서

`memory_order_seq_cst`는 모든 atomic 연산에 단일 **전역 전순서(single total order)** 가 존재한다고 보장한다. 모든 스레드는 이 순서에 동의한다. 마치 모든 스레드가 잘게 인터리브된 단일 실행으로 진행되는 것처럼 보인다.

```cpp
std::atomic<bool> x{false}, y{false};
std::atomic<int> z{0};

void write_x() {
    x.store(true, std::memory_order_seq_cst);
}

void write_y() {
    y.store(true, std::memory_order_seq_cst);
}

void read_x_then_y() {
    while (!x.load(std::memory_order_seq_cst));
    if (y.load(std::memory_order_seq_cst)) ++z;
}

void read_y_then_x() {
    while (!y.load(std::memory_order_seq_cst));
    if (x.load(std::memory_order_seq_cst)) ++z;
}

// 실행 후: z는 1 또는 2. 0은 불가능.
```

`z == 0`이 불가능한 이유가 핵심이다. 그러려면 한 reader 스레드는 `x → y` 순으로 store가 일어났다고 봐야 하고, 다른 reader 스레드는 `y → x` 순으로 봐야 한다. seq_cst가 보장하는 전역 전순서는 그런 의견 불일치를 허용하지 않는다.

대가가 있다. 컴파일러는 x86에서 `mfence`나 `lock`이 붙은 store, ARM에서는 `dmb ish` 같은 강한 배리어를 삽입해야 한다. acquire/release 모델로 충분하다면 그쪽이 항상 더 싸다.

수정 순서와 전역 전순서를 구별하는 게 중요하다. *모든* 모델에서 각 atomic 객체에 대한 쓰기들은 객체별 수정 순서를 따른다. seq_cst는 그것에 더해 **서로 다른 객체에 대한 seq_cst 연산 사이에도 단일 전역 순서가 있다** 고 약속한다. acquire/release는 같은 변수에 대한 한 쌍의 synchronizes-with만 보장하지, 서로 다른 변수의 두 쌍이 어떤 전역 순서로 인터리브되는지에는 답하지 않는다. 그래서 위 4스레드 예제가 acquire/release만으로는 `z == 0`을 막아내지 못한다.

### Relaxed ordering — 원자성만 남기기

`memory_order_relaxed`는 원자성만 보장한다. 다른 atomic 연산과의 happens-before도, synchronizes-with도 만들지 않는다. 같은 atomic 객체에 대한 *수정 순서* 만큼은 모든 스레드가 동의하지만, 그게 전부다.

```cpp
std::atomic<bool> x{false}, y{false};
std::atomic<int> z{0};

void write_x_then_y() {
    x.store(true, std::memory_order_relaxed);
    y.store(true, std::memory_order_relaxed);
}

void read_y_then_x() {
    while (!y.load(std::memory_order_relaxed));
    if (x.load(std::memory_order_relaxed)) ++z;
}

// z == 0이 *허용된다*. y의 store가 x의 store보다 먼저 보일 수 있다.
```

같은 스레드에서 `x` 다음에 `y`를 store했더라도 relaxed는 다른 스레드가 보는 순서에 대해 약속하지 않는다. seq_cst라면 위 코드는 `z == 0`을 만들 수 없지만, relaxed라면 가능하다.

relaxed의 정당한 쓰임은 좁다. **다른 스레드와 동기화할 게 없을 때** 의 카운터다. 책의 Listing 5.5는 이 패턴을 보여준다.

```cpp
// 책 Listing 5.5 — relaxed 카운터
std::atomic<int> count{0};

void increment() {
    count.fetch_add(1, std::memory_order_relaxed);
}

void read() {
    // 마지막에 한 번 모은다. 다른 변수와의 happens-before는 필요 없다.
    std::cout << count.load(std::memory_order_relaxed) << '\n';
}
```

카운터가 정확히 N이 되는지만 중요하고, 그 카운터의 변화가 다른 메모리의 가시성을 강제할 필요가 없을 때 relaxed가 맞다. 그 외에 거의 모든 경우는 acquire/release나 seq_cst가 필요하다.

#### 여러 변수에 대한 relaxed의 직관

같은 스레드에서 두 변수에 relaxed로 쓰더라도 다른 스레드가 그 두 store를 같은 순서로 본다는 보장이 없다는 점이 핵심이다. 책 Listing 5.6의 변형이다.

```cpp
std::atomic<int> x{0}, y{0};

void thread_1() {
    x.store(1, std::memory_order_relaxed);   // (1)
    x.store(2, std::memory_order_relaxed);   // (2)
    y.store(20, std::memory_order_relaxed);  // (3)
    x.store(3, std::memory_order_relaxed);   // (4)
}

void thread_2() {
    int rx = x.load(std::memory_order_relaxed);
    int ry = y.load(std::memory_order_relaxed);
}
```

스레드 2가 보는 `x`의 값들은 반드시 `x`의 수정 순서(0, 1, 2, 3)를 따라야 한다. 가령 `x`에서 2를 본 다음 1을 보는 것은 불가능하다. 그러나 thread_1의 (3)이 (2)와 (4) 사이에 sequenced-before로 끼어 있더라도, thread_2가 `y == 20`을 본 *후* 에 `x == 1`을 보는 것은 허용된다. relaxed는 변수 간 순서를 묶지 않기 때문이다.

### Acquire-release — 쌍으로 만드는 synchronizes-with

`release` store와 같은 변수에 대한 `acquire` load는 **synchronizes-with** 관계를 만든다. 정확히는 acquire load가 release store가 쓴 값을 *읽었을 때* 성립한다.

```cpp
// 책 Listing 5.7의 변형 — read-acquire-release
std::atomic<bool> data_ready{false};
int data = 0;

void producer() {
    data = 42;                                              // (1) 평범한 쓰기
    data_ready.store(true, std::memory_order_release);      // (2) release store
}

void consumer() {
    while (!data_ready.load(std::memory_order_acquire));    // (3) acquire load
    assert(data == 42);                                     // (4) 반드시 성공
}
```

핵심 규칙은 두 줄이다.

- (1)은 (2)와 같은 스레드에 sequenced-before. (2)가 release.
- (3)이 (2)가 쓴 `true`를 봤다면 (2) synchronizes-with (3). (3)이 (4)와 sequenced-before.

이렇게 synchronizes-with와 sequenced-before를 묶으면 (1) happens-before (4)가 성립하고, `data` 읽기는 안전하다. 이 합성이 happens-before의 추이 폐쇄다.

acquire/release는 *쌍* 으로만 의미가 있다는 점을 강조한다. release store는 해당 atomic의 acquire load와만 묶인다. 다른 atomic의 acquire와는 묶이지 않는다.

#### release sequence와 RMW 연쇄

release store에서 시작해 같은 변수에 대한 RMW들이 줄지어 있으면 **release sequence** 가 형성된다. 그 끝의 어떤 acquire 연산도 처음 release와 synchronizes-with 관계를 갖는다. 즉, 중간에 다른 스레드가 RMW로 끼어들어도 동기화 사슬이 끊어지지 않는다.

```cpp
// 책 Listing 5.8 — release sequence
std::vector<int> queue_data;
std::atomic<int> count;

void populate_queue() {
    constexpr unsigned n = 20;
    queue_data.clear();
    for (unsigned i = 0; i < n; ++i) queue_data.push_back(i);
    count.store(n, std::memory_order_release);    // (1) release
}

void consume_queue_items() {
    while (true) {
        int item_index = count.fetch_sub(1, std::memory_order_acquire);  // (2) RMW
        if (item_index <= 0) {
            wait_for_more_items();
            continue;
        }
        process(queue_data[item_index - 1]);   // (1)의 쓰기를 본다
    }
}
```

여러 consumer 스레드가 `(2)`를 동시에 호출해도, 각 `fetch_sub`가 release sequence의 일부가 되어 모두 `(1)`과 synchronizes-with 관계를 유지한다. 그래서 `queue_data`의 채워진 내용을 안전하게 읽을 수 있다.

#### memory_order_acq_rel

RMW가 동시에 acquire와 release 역할을 해야 할 때 `memory_order_acq_rel`을 쓴다. lock-free 자료구조의 push/pop이 전형적이다.

```cpp
std::atomic<Node*> head{nullptr};

void push(Node* node) {
    node->next = head.load(std::memory_order_relaxed);
    while (!head.compare_exchange_weak(
        node->next, node,
        std::memory_order_acq_rel,  // 성공: acquire + release
        std::memory_order_relaxed)) // 실패: relaxed로 충분
    { }
}
```

![Acquire-Release 의미론](/images/blog/parallel/diagrams/acquire-release-semantics.svg)

#### 추이적 동기화

세 스레드 이상이 끼는 경우에도 happens-before의 추이 폐쇄로 동기화가 전달된다. 책 Listing 5.9의 패턴이다.

```cpp
std::atomic<int> data[5];
std::atomic<bool> sync1{false}, sync2{false};

void thread_1() {
    data[0].store(42, std::memory_order_relaxed);
    data[1].store(97, std::memory_order_relaxed);
    data[2].store(17, std::memory_order_relaxed);
    data[3].store(-141, std::memory_order_relaxed);
    data[4].store(2003, std::memory_order_relaxed);
    sync1.store(true, std::memory_order_release);     // (1)
}

void thread_2() {
    while (!sync1.load(std::memory_order_acquire));   // (2)
    sync2.store(true, std::memory_order_release);     // (3)
}

void thread_3() {
    while (!sync2.load(std::memory_order_acquire));   // (4)
    assert(data[0].load(std::memory_order_relaxed) == 42);
    // 나머지 인덱스 모두 마찬가지로 안전
}
```

(1) synchronizes-with (2), (3) synchronizes-with (4)다. (2)와 (3)이 같은 스레드 안에서 sequenced-before이므로 추이적으로 (1) happens-before (4)가 성립한다. 그래서 thread_3이 `data[*]`의 relaxed load로도 thread_1이 쓴 값을 본다. 중간 스레드는 데이터를 직접 본 적이 없지만, 같은 스레드의 acquire-release 짝을 통해 동기화를 한 단계 *전달* 한다.

### memory_order_consume — 왜 권장 중단인가

`memory_order_consume`은 acquire의 약한 변종이다. acquire는 release store 이전의 *모든* 쓰기에 대한 가시성을 보장하지만, consume은 *load가 반환한 값에 데이터 의존성이 있는* 후속 연산에 대해서만 그 보장을 제공한다.

```cpp
struct X { int i; std::string s; };
std::atomic<X*> p;
std::atomic<int> a;

// 생산자
auto* x = new X{42, "hi"};
a.store(99, std::memory_order_relaxed);
p.store(x, std::memory_order_release);

// 소비자
X* x2 = p.load(std::memory_order_consume);
if (x2) {
    assert(x2->i == 42);      // OK — x2에 데이터 의존
    assert(x2->s == "hi");    // OK — x2에 데이터 의존
    assert(a.load(std::memory_order_relaxed) == 99);  // 보장 없음!
}
```

이론적으로는 매력적이다. ARM/POWER에서 acquire는 명시적 배리어가 필요하지만 consume은 보통 무료다. 의존성을 따라가는 하드웨어 트릭으로 자연스럽게 만족된다.

문제는 *데이터 의존성* 의 정의가 까다롭다는 점이다. 컴파일러는 의존성을 보존해야 하지만 최적화가 의존성을 끊어버리기 쉽다. C++17부터 `[[carries_dependency]]` 속성과 `std::kill_dependency`가 있지만 거의 쓰이지 않는다.

실제로는 모든 주요 컴파일러가 consume을 *acquire와 동일하게 구현* 한다. 이득은 사라지고 의미만 혼란스럽다. P0371(C++17)에서 표준화 위원회는 consume의 의미와 그 의존성 추적을 **임시로 권장 중단(temporarily discourage)** 했다. 새 코드에서는 acquire를 쓴다.

### Fence와 atomic 연산의 관계

`std::atomic_thread_fence`는 atomic *연산이 아니라 그 사이* 에 놓는 동기화 지점이다. 그 자체로는 어떤 메모리도 건드리지 않는다.

```cpp
// 책 Listing 5.12 — fence가 happens-before를 만든다
std::atomic<bool> x{false}, y{false};
std::atomic<int> z{0};

void write_x_then_y() {
    x.store(true, std::memory_order_relaxed);                    // (1)
    std::atomic_thread_fence(std::memory_order_release);          // (2)
    y.store(true, std::memory_order_relaxed);                    // (3)
}

void read_y_then_x() {
    while (!y.load(std::memory_order_relaxed));                  // (4)
    std::atomic_thread_fence(std::memory_order_acquire);          // (5)
    if (x.load(std::memory_order_relaxed)) ++z;                  // (6)
}

// 종료 시 z == 1이 보장된다.
```

핵심은 fence가 자기 *전후의 relaxed atomic 연산을 통해* synchronizes-with를 만들어준다는 점이다.

- (4)가 (3)이 쓴 `true`를 본다. 그래서 (3)이 release fence (2) *이후* 의 store이고, (4)가 acquire fence (5) *이전* 의 load라는 점이 (2) synchronizes-with (5)를 만든다.
- (1)은 (2)와 sequenced-before, (5)는 (6)과 sequenced-before. 따라서 (1) happens-before (6).

fence는 release store나 acquire load와 비슷하지만 *연산과 분리* 되어 있다는 게 차이다. 한 fence가 여러 relaxed 연산을 한꺼번에 동기화할 수 있다.

#### fence와 비-atomic 데이터

fence는 비-atomic 변수에 대해서도 같은 happens-before를 만든다. 책의 Listing 5.13이 이 점을 짚는다.

```cpp
// 책 Listing 5.13 — 비-atomic 변수에 적용되는 fence
bool x = false;          // 비-atomic
std::atomic<bool> y{false};
std::atomic<int> z{0};

void write_x_then_y() {
    x = true;                                                     // (1) 비-atomic 쓰기
    std::atomic_thread_fence(std::memory_order_release);          // (2)
    y.store(true, std::memory_order_relaxed);                    // (3)
}

void read_y_then_x() {
    while (!y.load(std::memory_order_relaxed));                  // (4)
    std::atomic_thread_fence(std::memory_order_acquire);          // (5)
    if (x) ++z;                                                  // (6) 비-atomic 읽기
}

// z == 1 보장. x에 대한 데이터 레이스 없음.
```

비-atomic 변수 `x`에 대한 (1)과 (6) 접근은 보통이라면 데이터 레이스다. fence가 만든 (1) happens-before (6) 관계 덕분에 레이스가 사라지고 `x == true` 읽기가 안전해진다. 이게 lock-free 자료구조에서 fence가 강력한 도구인 이유다. 외부 atomic 플래그 한 쌍이 그 사이의 모든 평범한 메모리 접근을 동기화한다.

#### fence가 받는 order의 의미

`std::atomic_thread_fence`는 어떤 메모리 위치도 직접 건드리지 않으므로 fence에 줄 수 있는 order의 의미는 atomic 연산일 때와 약간 다르다.

- `memory_order_release` fence: 이후의 store들에 release 의미를 *덧붙인다*.
- `memory_order_acquire` fence: 이전의 load들에 acquire 의미를 *덧붙인다*.
- `memory_order_acq_rel` fence: 위 둘을 동시에.
- `memory_order_seq_cst` fence: 전역 전순서에 포함된다.
- `memory_order_relaxed` fence: 의미 없다. 무동작.

`std::atomic_signal_fence`라는 함수도 별도로 있다. 같은 스레드 안의 signal handler 사이에서만 효력을 가지며 CPU 배리어가 아니라 컴파일러 배리어만 만든다. 멀티스레드 동기화에는 쓸 수 없다.

### atomic 연산이 비-atomic 데이터를 동기화한다

fence가 비-atomic을 동기화하는 것과 같은 원리로, acquire/release를 단 *atomic 연산도* 자기 주변 비-atomic 메모리에 대한 happens-before를 만든다. producer-consumer의 가장 흔한 패턴이 그것이다.

```cpp
std::shared_ptr<MyData> data;
std::atomic<bool> ready{false};

void producer() {
    data = std::make_shared<MyData>(/*...*/);   // 비-atomic 쓰기
    ready.store(true, std::memory_order_release);
}

void consumer() {
    while (!ready.load(std::memory_order_acquire));
    process(*data);     // 안전 — release/acquire가 가시성 보장
}
```

이 패턴이 C++ 메모리 모델의 가장 실용적인 활용이다. atomic 한 플래그가 평범한 데이터의 전달을 동기화한다.

### ABA 문제 짧게

`std::atomic<T*>`로 CAS 루프를 짤 때 주의할 함정이 ABA다.

```cpp
// 스레드 1
Node* old = head.load();
// 중단 — 다른 스레드들이 일하는 동안

// 스레드 2
pop(head);          // old가 가리키던 노드를 제거하고 메모리 회수
push(new_node);
push(old);          // 마침 같은 주소에 새 노드가 할당됨

// 스레드 1 재개
head.compare_exchange(old, new_head);  // 성공한다. 하지만 잘못된 가정.
```

해법은 7장에서 다룬다. tagged pointer로 카운터를 함께 비교하거나, hazard pointer로 회수를 지연시키는 식이다.

## 5.4 Memory Order 선택 가이드

### 어떤 order를 쓸지 정하는 표

| 상황 | store | load | RMW |
|------|-------|------|-----|
| 다른 변수와의 가시성이 필요 없는 카운터 | `relaxed` | `relaxed` | `relaxed` |
| 단일 플래그로 데이터 전달 (생산자-소비자) | `release` | `acquire` | — |
| 같은 변수에 대한 RMW 사슬 (push/pop) | — | — | `acq_rel` |
| 다중 변수 간 전역 일관성이 필요 | `seq_cst` | `seq_cst` | `seq_cst` |
| 의심스러움 | `seq_cst` | `seq_cst` | `seq_cst` |

### 실용 원칙

- 기본값 `seq_cst`로 시작한다. 우선 *정확함*.
- 프로파일링이 가리키는 곳에서만 약한 order로 내려간다.
- relaxed는 다른 어떤 변수의 가시성도 요구하지 않을 때만 쓴다. 통계, 단조 카운터가 후보.
- acquire/release는 *쌍* 으로 같은 atomic 변수에 매단다. 변수가 다르면 동기화가 안 된다.
- consume은 acquire와 같이 동작하니, 새 코드에서는 acquire를 쓴다.
- x86이라도 컴파일러 재정렬을 막으려면 memory order를 정확히 명시한다. ARM/POWER 이식 시점에 깨지지 않는다.

## 5.5 실전 예제

세 가지 패턴을 짧게 묶는다. 모두 5장 도구만 쓴다.

### Relaxed 카운터

```cpp
class counter {
    std::atomic<long> count_{0};

public:
    void increment() {
        count_.fetch_add(1, std::memory_order_relaxed);
    }

    long get() const {
        return count_.load(std::memory_order_relaxed);
    }
};
```

### Acquire-Release 일회성 플래그

```cpp
class one_time_flag {
    std::atomic<bool> flag_{false};

public:
    void set() {
        flag_.store(true, std::memory_order_release);
    }

    void wait() {
        while (!flag_.load(std::memory_order_acquire)) {
            std::this_thread::yield();
        }
    }
};
```

`set`이 release, `wait`이 acquire라 `set` 이전의 평범한 쓰기가 `wait` 이후 모두 가시화된다.

### CAS 루프로 만든 atomic_max

`fetch_max`가 표준에 없으므로 compare_exchange_weak로 짠다.

```cpp
template<typename T>
class atomic_max {
    std::atomic<T> value_;

public:
    explicit atomic_max(T init) : value_(init) {}

    void update(T new_val) {
        T current = value_.load(std::memory_order_relaxed);
        while (new_val > current &&
               !value_.compare_exchange_weak(
                   current, new_val,
                   std::memory_order_relaxed)) {
            // current는 자동으로 현재 값으로 갱신
        }
    }

    T get() const {
        return value_.load(std::memory_order_relaxed);
    }
};
```

weak를 쓴 이유는 어차피 루프 안이라서다. spurious failure를 무료로 흡수한다.

## 정리

- 모든 객체는 하나 이상의 **메모리 위치** 로 구성되고, 같은 위치에 대한 비-동기 동시 접근에 쓰기가 끼면 데이터 레이스다.
- 각 객체의 모든 쓰기는 **수정 순서** 라는 단일 순서를 가지며 모든 스레드가 동의한다.
- 동기화의 뼈대는 **sequenced-before · synchronizes-with · happens-before** 세 관계의 합성이다.
- `std::atomic_flag`만이 표준이 보장하는 lock-free 타입이다. 나머지는 `is_always_lock_free`로 확인한다.
- `std::atomic<T>`의 `T`는 trivially copyable이어야 하고, 비교는 비트 비교다.
- `compare_exchange_weak`는 spurious failure가 있고 루프와 짝이다. `strong`은 단일 시도에 쓴다.
- memory order는 모델로 세 묶음이다. **seq_cst** 가 단일 전역 순서, **acquire/release** 가 쌍 기반 synchronizes-with, **relaxed** 가 원자성만.
- `memory_order_consume`은 의미가 까다롭고 모든 구현이 acquire와 동일하게 다룬다. 새 코드에선 권장 중단.
- `std::atomic_thread_fence`는 연산과 분리된 동기화 지점으로 자기 주변 relaxed atomic 및 비-atomic 메모리에 happens-before를 부여한다.

## 흔한 함정

| 함정 | 무엇이 잘못인가 | 올바른 모델 |
|------|----------------|-----------|
| relaxed로 모든 곳을 빠르게 | 다른 변수 가시성 보장이 없다 | 카운터 외에는 acquire/release 또는 seq_cst |
| 서로 다른 atomic 변수 사이의 acquire/release | synchronizes-with는 *같은* 변수 한 쌍에서만 성립 | 같은 atomic으로 묶기 |
| x86이라 memory_order 무시해도 됨 | 컴파일러 재정렬은 여전. ARM/POWER에서 깨짐 | 항상 명시 |
| 단일 시도에 compare_exchange_weak | spurious failure로 잘못된 분기 가능 | strong을 쓰거나 루프로 감싸기 |
| seq_cst가 공짜 | x86에서 `lock`/`mfence`, ARM에서 강한 배리어 비용 | 충분하다면 acquire/release |
| `std::atomic<UserType>`을 그대로 사용 | trivially copyable이 아니면 ill-formed, padding이 있으면 CAS가 어긋남 | T를 단순화하거나 padding 0-초기화 |

## 자기 점검

- 메모리 위치와 객체의 정의를 말로 설명할 수 있는가.
- 수정 순서가 객체별이라는 점이 같은 변수와 다른 변수 사이에 어떤 차이를 만드는가.
- sequenced-before, synchronizes-with, happens-before 세 관계가 어떻게 합성되어 가시성을 보장하는가.
- `compare_exchange_weak`에서 spurious failure가 일어나는 하드웨어적 이유는 무엇인가.
- `std::atomic_flag`만 lock-free가 강제되는 이유는 무엇인가.
- relaxed 카운터가 안전한 조건은 정확히 무엇인가.
- release sequence가 끊어지지 않게 하는 RMW의 역할은 무엇인가.
- `memory_order_consume`이 권장 중단된 배경을 설명할 수 있는가.
- `std::atomic_thread_fence`가 비-atomic 변수에 대한 happens-before를 어떻게 만드는가.
- seq_cst의 전역 전순서가 acquire/release만으로 모사되지 않는 시나리오를 그릴 수 있는가.

## 다음 장 예고

다음 장은 락 기반 스레드 안전 자료구조다. 5장의 happens-before 도구는 그대로 살아 있되, 동기화의 주된 매개체가 atomic에서 뮤텍스로 옮겨간다. 스택, 큐, 룩업 테이블, 리스트를 차례로 짚으며 락 입자도와 성능의 트레이드오프를 다룬다.

## 관련 항목

- [Ch 4: Synchronizing Concurrent Operations](/blog/parallel/cpp-concurrency-in-action/chapter04-synchronizing-concurrent-operations)
- [Ch 6: Lock-based Data Structures](/blog/parallel/cpp-concurrency-in-action/chapter06-designing-lock-based-concurrent-data-structures)
- [Ch 7: Lock-free Data Structures](/blog/parallel/cpp-concurrency-in-action/chapter07-designing-lock-free-concurrent-data-structures)
- [AMP Ch 3: Concurrent Objects](/blog/parallel/parallel-principles/ch03-concurrent-objects) — linearizability
- [AMP Ch 4: Shared Memory](/blog/parallel/parallel-principles/ch04-foundations-of-shared-memory) — memory models
- [AMP Ch 5: Synchronization Power](/blog/parallel/parallel-principles/ch05-relative-power-of-synchronization) — CAS
