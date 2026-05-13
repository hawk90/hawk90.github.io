---
title: "Chapter 18: Transactional Memory"
date: 2026-05-12
description: "락 없는 atomic block의 약속. Software TM, Hardware TM (Intel TSX, IBM POWER). 합성성과 진행 보장."
series: "The Art of Multiprocessor Programming"
seriesOrder: 18
tags: [parallel, concurrency, book-review, amp, transactional-memory, stm, htm]
type: book-review
bookTitle: "The Art of Multiprocessor Programming"
bookAuthor: "Maurice Herlihy, Nir Shavit"
---

> **The Art of Multiprocessor Programming** Chapter 18 요약

## 18.1 락의 문제

지금까지 본 모든 동기화 도구는 락 또는 lock-free 알고리즘. 둘 다 문제가 있다.

**락의 문제**:
- 합성 불가 — 두 함수를 합치면 deadlock 위험
- 잘못된 락 순서 → deadlock
- 우선순위 역전
- 보유 시간 / 임계 영역 분석 어려움

**Lock-Free의 문제**:
- 매우 복잡 (ABA, 메모리 회수)
- 자료구조마다 새 알고리즘
- 일반 코드에는 적용 어려움

**Transactional Memory** (TM)는 이 둘의 대안 약속.

## 18.2 Transactional Memory의 약속

```
atomic {
    if (account_a.balance >= 100) {
        account_a.balance -= 100
        account_b.balance += 100
    }
}
```

`atomic` 블록 안의 모든 작업이 **하나의 트랜잭션**처럼 실행. DB 트랜잭션처럼:

- **Atomicity** — 모두 성공 또는 모두 실패
- **Isolation** — 다른 트랜잭션과 격리

락 없이. 코드는 마치 단일 스레드인 것처럼 작성.

## 18.3 STM — Software Transactional Memory

소프트웨어로 TM을 구현.

**Optimistic Concurrency**:

1. 트랜잭션 시작 — 읽기 셋 / 쓰기 셋 추적
2. 트랜잭션 본문 실행 — 실제 메모리는 안 만지고 로그에
3. 커밋 시점 — 읽기 셋이 그 사이에 변경됐는지 확인
4. 안 변경됐으면 쓰기 셋을 실제 메모리에 반영, 커밋
5. 변경됐으면 **abort** 후 재시도

```python
class STMTransaction:
    read_set: Map<addr, value>
    write_set: Map<addr, value>
    
    def read(addr):
        if addr in write_set: return write_set[addr]
        value = memory[addr]
        read_set[addr] = value
        return value
    
    def write(addr, value):
        write_set[addr] = value
    
    def commit():
        # validation
        for addr, old in read_set:
            if memory[addr] != old:
                return ABORT
        # commit
        for addr, value in write_set:
            memory[addr] = value
        return COMMIT
```

**장점**: 일반 코드처럼 자연스럽다. 합성 가능.
**단점**: 충돌 시 abort → 재실행 비용.

## 18.4 합성성 — TM의 가장 큰 가치

락의 가장 큰 문제는 **합성 불가**.

```python
# 두 함수가 있다:
def deposit(account, amount):
    lock(account)
    account.balance += amount
    unlock(account)

def withdraw(account, amount):
    lock(account)
    account.balance -= amount
    unlock(account)

# 합치려면?
def transfer(from, to, amount):
    lock(from)
    lock(to)            # ⚠️ 락 순서 문제 (deadlock 위험)
    from.balance -= amount
    to.balance += amount
    unlock(to)
    unlock(from)
```

TM에서는 자연스러움.

```python
def transfer(from, to, amount):
    atomic {
        withdraw(from, amount)
        deposit(to, amount)
    }
```

`atomic` 블록은 합성이 자유롭다. 함수의 `atomic`이 호출자의 `atomic` 안에 자연스럽게 nested.

이게 TM의 진정한 가치 — **모듈러 동시성**.

## 18.5 STM의 비용

좋은 점만 있는 건 아니다.

**1. 메타데이터 비용**

읽기 셋 / 쓰기 셋 추적에 메모리 + CPU. 매 메모리 접근이 추가 비용.

**2. 충돌 시 재실행**

낙관적 — 충돌 거의 없다는 가정. 충돌 많으면 락보다 나쁨.

**3. I/O와 안 맞음**

트랜잭션이 abort 가능. 그 안에서 I/O를 하면 — 어떻게 롤백? Console에 출력했다 abort하면 출력이 거짓이 됨.

**4. 성능**

STM은 일반적으로 lock-free보다 느림. 잘 짠 lock 기반보다도 가끔 느림.

이런 이유로 STM은 학계의 관심에 비해 산업에서는 제한적으로 사용.

## 18.6 HTM — Hardware Transactional Memory

CPU가 TM을 직접 지원.

**Intel TSX** (Transactional Synchronization Extensions, 2013):
- `XBEGIN`, `XEND`, `XABORT` 명령어
- Cache coherence 메커니즘이 충돌 감지
- 충돌 시 CPU가 자동 abort

**IBM POWER8+, ARM** — 비슷한 지원.

**장점**: 매우 빠름 — 충돌 없으면 거의 free.
**단점**: 작은 트랜잭션만 가능 (cache line 수 제한), 항상 fallback path 필요.

## 18.7 HTM의 사용 패턴 — Lock Elision

가장 흔한 HTM 사용:

```
1. 락 잡으려 시도 — 그러나 실제로 락 안 잡고 트랜잭션 시작
2. 임계 영역 실행
3. 끝에서 commit
4. 충돌 시 — 진짜 락으로 fallback
```

```cpp
// 의사 코드
mutex m;

XBEGIN()  // 트랜잭션 시작
if (!m.is_locked()) {
    // m이 안 잡혀 있으면 — speculative execution
    critical_section()
    XEND()  // commit
} else {
    XABORT()  // 다른 스레드가 진짜로 락 잡음 → fallback
    m.lock()
    critical_section()
    m.unlock()
}
```

여러 스레드가 같은 락을 잡으려 시도해도, 실제로 충돌하지 않으면 동시 실행. 충돌 시에만 직렬화.

**효과** — 락의 의미는 유지하면서 경합 적을 때는 lock-free처럼 빠름. Linux 커널, glibc의 `pthread_rwlock` 등에 적용된 적 있음.

## 18.8 TM의 미래

TM이 20년 넘게 연구됐지만 **주류로 자리 잡지 못했다**. 이유.

**1. HTM의 한계**

작은 트랜잭션만 가능. 일반 코드에는 fallback path가 필수.

**2. STM의 성능 부족**

좋은 케이스에서도 lock-free에 못 미침.

**3. 디자인 복잡도**

쉬워 보이는 추상화지만 — I/O, 예외, 다른 abort 가능 작업과의 상호작용이 복잡.

**4. 대안의 성장**

Lock-free 라이브러리, message passing, actor 모델 등이 다른 길.

다만 GC 언어 + STM은 여전히 흥미로운 영역. Haskell의 STM이 가장 성공한 사례 — pure 함수 + 명시적 atomic의 조합.

## 18.9 Haskell STM

```haskell
transfer :: TVar Int -> TVar Int -> Int -> STM ()
transfer from to amount = do
    f <- readTVar from
    t <- readTVar to
    writeTVar from (f - amount)
    writeTVar to (t + amount)

main = do
    atomically $ transfer accountA accountB 100
```

`TVar` (Transactional Variable) — STM이 추적하는 변수. `atomically`로 트랜잭션 시작.

**Haskell이 잘 맞는 이유**:
- Pure 함수 — I/O가 타입으로 분리 (`STM` 모나드)
- Strong type system — 트랜잭션 안에서 무엇이 안전한지 컴파일러가 보장

이게 Haskell STM이 실용적인 이유. 다른 언어에선 안 됨.

## 18.10 정리 — TM의 위상

20년 후의 결론:

- **HTM** — 락 elision의 도구로 일부 환경에서 유용. 일반 도구는 아님.
- **STM** — Haskell 같은 함수형 환경에서 우아함. 그 외에선 거의 안 쓰임.
- **연구는 계속** — 매년 새 논문 나옴.

실무자는 여전히 락 / lock-free 라이브러리 / 메시지 패싱을 쓴다. TM은 흥미로운 가능성이지만 마지막 도구가 되진 못했다.

## 정리

- **Transactional Memory** — atomic 블록으로 락 대체하는 추상화
- **STM** — 소프트웨어 구현, 합성 가능, 그러나 비싸다
- **HTM** — 하드웨어 지원, 작은 트랜잭션에 빠름
- 가장 큰 가치는 **합성성** — 락의 가장 큰 문제 해결
- **Lock Elision** — HTM의 실용적 사용
- Haskell STM이 가장 성공한 사례 — pure 함수 + 명시적 atomic

## 시리즈 마무리

18장의 여정을 끝내며.

**Part 1 (Ch 1-3)**: 정확성 이론 — sequential consistency, linearizability, progress conditions.
**Part 2 (Ch 4-6)**: 토대 — memory, consensus, universality.
**Part 3 (Ch 7-8)**: 락 — spin / blocking / monitor.
**Part 4 (Ch 9-15)**: 자료구조 — list / queue / stack / counter / hash / skiplist / PQ.
**Part 5 (Ch 16-18)**: 스케줄링 / 동기화 / 미래 — work stealing / barrier / TM.

이 18장이 모든 모던 동시성 시스템의 이론적 토대다. **정확성을 정의하고, 그 정의 위에서 정확하고 빠른 알고리즘을 짓는다**.

## 관련 항목

- [Ch 17: Barriers](/blog/parallel/parallel-principles/ch17-barriers)
- [C++ Concurrency in Action Ch 7: Lock-Free](/blog/parallel/cpp-concurrency-in-action/chapter07-designing-lock-free-concurrent-data-structures)
- [Ch 1: Introduction](/blog/parallel/parallel-principles/ch01-introduction) — 시작점
