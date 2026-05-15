---
title: "Ch 1: Linux 스레드의 정체 — clone / pthread / futex"
date: 2025-09-04T01:00:00
description: "Linux 스레드는 실은 프로세스. clone() 옵션, pthread_create의 안쪽, futex 메커니즘."
tags: [linux, threads, clone, futex, pthread]
series: "Concurrency Debugging"
seriesOrder: 1
draft: false
---

멀티스레드 버그를 잡으려면 *Linux의 스레드가 실제로 무엇인지*부터 알아야 합니다. 이 시리즈는 그 토대에서 시작해 GDB 멀티스레드 명령, race·deadlock 진단 방법론, 그리고 rr·TSan·Helgrind를 통합한 *재현 불가 버그* 해결까지 다룹니다.

첫 장은 *clone() 시스템 콜이 만든 프로세스가 스레드인 이유*부터 *futex가 락 대기의 정체*까지.

## 한 줄 요약

Linux의 *스레드*는 별 추상화가 없고, `clone()` 옵션 비트로 자원을 *공유하는* 프로세스가 그저 *POSIX 스레드*로 보이는 것.

## clone(2) — 모든 것의 시작

```c
long clone(unsigned long flags, void *stack, int *ptid, int *ctid, unsigned long tls);
```

`flags`가 자원 공유 옵션. 각 비트가 *부모와 무엇을 공유할지* 결정.

![clone() 플래그 조합 — fork / vfork / pthread 비교](/images/blog/tools/diagrams/clone-flags-spectrum.svg)

| Flag | 공유 자원 |
|------|-----------|
| `CLONE_VM` | 주소 공간 (`mm_struct`) |
| `CLONE_FS` | 파일시스템 (cwd, root, umask) |
| `CLONE_FILES` | 파일 디스크립터 테이블 |
| `CLONE_SIGHAND` | 시그널 핸들러 테이블 |
| `CLONE_THREAD` | 같은 thread group (= 같은 PID) |
| `CLONE_PARENT` | 같은 부모 |
| `CLONE_NEWNS` | 새 mount namespace |
| `CLONE_NEWPID` | 새 PID namespace |
| `CLONE_PIDFD` | child pidfd 반환 |
| `CLONE_SETTLS` | TLS 설정 |
| `CLONE_PARENT_SETTID` | 부모 측 변수에 자식 tid 저장 |
| `CLONE_CHILD_CLEARTID` | 자식 종료 시 부모 변수 0 + futex wake |
| `CLONE_DETACHED` | detached |
| `CLONE_UNTRACED` | ptrace 안 받음 |
| `CLONE_VFORK` | 자식 exec/exit까지 부모 정지 |

pthread_create의 안쪽.

```c
// glibc nptl-create.c (단순화)
int pthread_create(pthread_t *thread, ...) {
    int clone_flags = (CLONE_VM | CLONE_FS | CLONE_FILES | CLONE_SIGHAND |
                       CLONE_THREAD | CLONE_SYSVSEM | CLONE_SETTLS |
                       CLONE_PARENT_SETTID | CLONE_CHILD_CLEARTID | 0);
    
    pid_t tid = syscall(SYS_clone, clone_flags, child_stack,
                        &pd->tid, tls_descriptor, &pd->tid);
    *thread = (pthread_t)pd;
    return 0;
}
```

이 모든 플래그를 켜면 *POSIX 스레드*. 일부만 켜면 *부모-자식 프로세스* 또는 vfork.

`CLONE_VM` 만 켜면 fork보다 가볍지만 분리된 PID 가짐 → process-like-thread (구식 LinuxThreads 모델).

`CLONE_THREAD`까지 켜면 *같은 PID 공유* (TGID 동일). `getpid()`이 모든 스레드에서 같은 값.

## LWP vs pthread_t

| | LWP (Light Weight Process) | pthread_t |
|---|----------------------------|-----------|
| 정의 | 커널의 스레드 ID | glibc의 사용자 공간 구조체 포인터 |
| 얻기 | `syscall(SYS_gettid)` 또는 `/proc/[pid]/task/` | `pthread_self()` |
| 표시 | `top -H`, `ps -L` | (없음, opaque) |
| GDB | `LWP nnnnn` | `Thread 0x...` |

```c
#include <sys/syscall.h>
#include <pthread.h>

pid_t lwp = syscall(SYS_gettid);          // 커널 tid
pthread_t pth = pthread_self();           // glibc descriptor
```

GDB의 `info threads` 출력.

```text
  Id   Target Id                                       Frame
* 1    Thread 0x7ffff7d8b740 (LWP 12345) "main"        ...
  2    Thread 0x7ffff75c4640 (LWP 12346) "worker"      ...
```

`0x7ffff7d8b740` = pthread_t (스레드 descriptor 주소).
`LWP 12345` = 커널 tid.

## /proc/[pid]/task/

Linux의 *스레드 = 프로세스* 정신을 그대로 반영.

```bash
$ ls /proc/12345/task/
12345/  12346/  12347/  12348/
```

각 디렉터리가 *한 스레드*. 거의 모든 `/proc/[pid]/` 항목이 `/proc/[pid]/task/[tid]/`에도 있음 (stat, status, comm, ...).

```bash
$ cat /proc/12345/task/12346/comm
worker
$ cat /proc/12345/task/12346/status | grep State
State:  S (sleeping)
$ cat /proc/12345/task/12346/wchan       # 어디서 자고 있나
futex_wait_queue_me
```

`wchan`이 *sleep 중인 커널 함수*. `futex_wait_queue_me`면 *futex 대기*. 락 또는 condition variable.

## 스레드 이름 — pthread_setname_np

스레드에 *짧은 이름*을 줄 수 있습니다 (최대 15바이트).

```c
#include <pthread.h>
pthread_setname_np(pthread_self(), "db-conn-7");
```

GDB·top·htop·strace가 모두 이 이름을 표시. 디버깅이 *훨씬* 쉬워집니다.

```text
$ top -H -p 12345
PID    USER  PR  ...  COMMAND
12345  me    20  ...  main
12346  me    20  ...  db-conn-7
12347  me    20  ...  worker-img
12348  me    20  ...  io-event
```

내부적으로 `prctl(PR_SET_NAME, name)` 또는 `/proc/self/task/<tid>/comm` 쓰기.

## TLS — Thread-Local Storage

각 스레드가 *자기만의* 변수를 가지는 메커니즘.

```c
__thread int counter = 0;        // GCC 확장
thread_local int counter2 = 0;   // C11 / C++11
```

내부적으로 *DTV*(Dynamic Thread Vector) + *TPIDR* 레지스터 (또는 x86-64의 fs/gs).

```c
// x86-64: fs:0이 TCB(Thread Control Block) 시작
asm("mov %%fs:0, %0" : "=r"(tcb));
```

GDB에서 `info threads`는 각 스레드의 TLS 영역을 알고 있어 `print my_thread_local` 같은 접근이 *현재 스레드의* TLS를 반환.

## 스택 — 각 스레드가 별 영역

pthread_create는 *스택을 mmap으로 따로 할당*. 기본 8MB (`ulimit -s`). 너무 크면 메모리 낭비, 너무 작으면 stack overflow.

```c
pthread_attr_t attr;
pthread_attr_init(&attr);
pthread_attr_setstacksize(&attr, 512 * 1024);   // 512KB
pthread_create(&thread, &attr, func, arg);
```

스택은 *guard page* 1페이지(4KB)와 함께 할당. overflow 시 guard에 접근 → SIGSEGV. 일부 OS는 *자동 확장*하지만 Linux pthread는 *고정 크기*.

```bash
# 각 스레드의 스택 위치
$ cat /proc/[pid]/maps | grep stack
7fff... 7fff... rw-p ... [stack]                  # main 스레드
7fffe... 7fffe... rw-p ... (mmap된 스레드 스택)
```

main 스레드의 스택만 `[stack]`로 표시. 다른 스레드는 *일반 mmap 영역*.

## futex(2) — 빠른 사용자 락

POSIX mutex/condvar의 *진짜 구현 메커니즘*. 1990s의 무거운 SysV semaphore에 비해 압도적으로 빠릅니다.

핵심 아이디어: *대부분의 락은 경합 없음*. 경합 없을 땐 *사용자 공간에서 atomic CAS 한 번*. 경합 때만 *커널 진입*.

```c
// 단순화된 pthread_mutex_lock
int pthread_mutex_lock(mutex_t *m) {
    // fast path: 경합 없음
    if (atomic_cas(&m->lock, 0, 1) == 0) return 0;
    
    // 경합 — 커널로
    while (atomic_xchg(&m->lock, 2) != 0)
        syscall(SYS_futex, &m->lock, FUTEX_WAIT, 2, NULL);
    
    return 0;
}

int pthread_mutex_unlock(mutex_t *m) {
    if (atomic_xchg(&m->lock, 0) == 2) {
        // 누군가 기다리고 있음 → 깨우기
        syscall(SYS_futex, &m->lock, FUTEX_WAKE, 1, NULL);
    }
    return 0;
}
```

`m->lock` 값.

- 0 = 자유.
- 1 = 잡혔지만 *대기자 없음*.
- 2 = 잡혔고 *대기자 있음*.

상태 2일 때만 unlock이 *FUTEX_WAKE를 호출* — 대기자 없으면 syscall 자체 안 함. 이게 *fast path*.

## futex 연산

| 연산 | 의미 |
|------|------|
| `FUTEX_WAIT` | val이 예상값과 같으면 잠 |
| `FUTEX_WAKE` | n개 대기자 깨움 |
| `FUTEX_REQUEUE` | 대기자를 다른 futex로 이동 |
| `FUTEX_CMP_REQUEUE` | val 비교 후 이동 |
| `FUTEX_WAIT_BITSET` | 비트마스크 매칭 대기 |
| `FUTEX_WAKE_BITSET` | 비트마스크 매칭 깨움 |
| `FUTEX_LOCK_PI` | priority-inherit lock |
| `FUTEX_UNLOCK_PI` | PI unlock |
| `FUTEX_WAIT_REQUEUE_PI` | condvar용 |

condvar(`pthread_cond_*`)도 futex로 구현. `wait`는 `FUTEX_WAIT_REQUEUE_PI`, `signal`은 `FUTEX_REQUEUE`.

## GDB로 futex 대기 콜스택 보기

```text
(gdb) thread 2
(gdb) bt
#0  __lll_lock_wait at lowlevellock.c:52
#1  pthread_mutex_lock
#2  std::mutex::lock at mutex:104
#3  Cache::Update at cache.cpp:88
#4  Worker::Run at worker.cpp:23
```

콜스택 마지막이 `__lll_lock_wait` (또는 `futex_wait`) = *futex 대기 중*.

어떤 락을 기다리나? 인자에서.

```text
(gdb) frame 1
(gdb) print *mutex
$1 = {__data = {__lock = 2, __count = 0, __owner = 12346, ...}}
```

`__owner = 12346` — *12346 LWP가 그 락을 들고 있다*. `info threads`에서 12346 찾아 그 콜스택을 보면 *왜 안 풀고 있는지* 답.

## priority inheritance

```c
pthread_mutexattr_t attr;
pthread_mutexattr_init(&attr);
pthread_mutexattr_setprotocol(&attr, PTHREAD_PRIO_INHERIT);
pthread_mutex_init(&mutex, &attr);
```

낮은 우선순위 스레드가 락을 들고 있을 때 *우선순위 역전*이 일어나면 그 스레드의 우선순위를 *임시로 올려서* 빨리 풀게. 실시간 시스템에서 중요.

## Robust mutex

```c
pthread_mutexattr_setrobust(&attr, PTHREAD_MUTEX_ROBUST);
```

락을 든 스레드가 *죽었을 때* 다음 lock 시 `EOWNERDEAD` 반환. `pthread_mutex_consistent(&m)`로 명시적 정리 후 계속.

크래시·강제 종료 후 *데드락 회피*에 사용. 잘 안 쓰이지만 강건한 시스템에 필요.

## thread_local — C++ 함정

```cpp
thread_local std::vector<int> g_buf;  // 각 스레드가 자기 vector

void worker() {
    g_buf.push_back(1);   // 첫 호출 시 vector 생성자 호출
}
```

`thread_local` 객체의 *생성자*가 *그 스레드에서 첫 사용 시* 호출. 멀티스레드 환경에서 *동시 초기화*가 일어남 — 컴파일러가 자동으로 *guard variable + atomic check*를 삽입.

```text
(gdb) bt
#0  __cxa_guard_acquire
#1  __cxa_guard_release
#2  worker
```

이 콜스택은 *thread_local 초기화 중*. 가끔 데드락의 원인.

## clone3 — DeprecatedAPI 후속

Linux 5.3+. `clone()`의 새 인터페이스, 더 큰 구조체로 더 많은 옵션.

```c
struct clone_args {
    u64 flags;
    u64 pidfd;
    u64 child_tid;
    u64 parent_tid;
    u64 exit_signal;
    u64 stack;
    u64 stack_size;
    u64 tls;
    u64 set_tid;
    u64 set_tid_size;
    u64 cgroup;
};

long clone3(struct clone_args *args, size_t size);
```

`set_tid`로 자식 TID를 *명시* (보안 컨테이너에서 유용), `cgroup`으로 자식을 *별 cgroup*에 두기.

## 스레드 vs 프로세스 vs goroutine

| | OS thread (LinuxThreads) | goroutine | async/await |
|---|---------------------------|-----------|--------------|
| 구현 | 커널 (clone) | 사용자 공간 | 사용자 공간 |
| 스케줄러 | 커널 | runtime | event loop |
| 스택 | 보통 8MB | 처음 2KB → 자동 확장 | 변수 한 셋 |
| 생성 비용 | 수십 µs | 1µs 미만 | 100ns 정도 |
| 컨텍스트 스위치 | 커널 trap (수 µs) | M:N | (논리적) |
| 디버깅 | GDB 기본 지원 | go tool (자체) | 디버거 + async-aware |

GDB는 OS thread만 *직접* 이해. Go의 goroutine, Python asyncio task, Rust async는 *프레임이 줄어든* 형태로 보이므로 별 도구가 필요.

## TID 재사용

스레드가 종료되고 *오래 후*에 같은 TID가 새 스레드에 할당될 수 있음. `/proc/[pid]/task/<old_tid>`이 *사라진 후* 같은 번호가 *다른 스레드*가 됨.

GDB의 `info threads`는 매번 fresh하게 갱신하므로 안전. 자체 도구에서 TID를 long-term identifier로 쓰지 말 것.

## 동기화 자료구조 한 표

| 자료구조 | 구현 | 비고 |
|----------|------|------|
| `pthread_mutex_t` | futex | 가장 흔한 락 |
| `pthread_rwlock_t` | 여러 futex | read/write 분리 |
| `pthread_cond_t` | futex | 대기·신호 |
| `pthread_spinlock_t` | atomic CAS busy-loop | 커널 미진입, 매우 짧은 critical section |
| `sem_t` | futex | counting semaphore |
| `pthread_barrier_t` | futex | N 스레드 만남 점 |
| `std::mutex` | pthread_mutex 래퍼 | C++ |
| `std::atomic<T>` | CPU atomic 명령 | lock-free |

각각의 *대기 콜스택*이 다릅니다. `__pthread_cond_wait`, `__pthread_rwlock_rdlock`, `sem_wait` 등을 식별해 *어떤 종류*의 동기화를 기다리는지 알아냄.

## 정리

- Linux 스레드 = `clone()`의 자원 공유 옵션.
- pthread_create = CLONE_VM | CLONE_FS | CLONE_FILES | CLONE_SIGHAND | CLONE_THREAD | ...
- LWP = 커널 tid (`/proc/[pid]/task/`), pthread_t = glibc descriptor.
- futex가 *경합 없을 땐 사용자 공간*에서 fast path.
- 락 대기 콜스택의 마지막은 `__lll_lock_wait` / `futex_wait`.
- `mutex->__owner`로 *현재 락을 든* 스레드 발견.
- `pthread_setname_np`로 디버깅 친화 이름.
- 각 스레드는 별 mmap 스택. main만 `[stack]`.
- TLS는 fs:0 (x86-64) 또는 TPIDR (ARM).

## 다음 장 예고

Ch 2 — GDB 멀티스레드 명령. `info threads` / `thread apply` / `scheduler-locking`의 깊이.

## 관련 항목

- [Ch 2: GDB 멀티스레드 명령](/blog/tools/debugging/concurrency-debug/chapter02-gdb-threads)
- [GDB and LLDB Ch 6 (이전판)](/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess)
- `man 2 clone`, `man 2 futex`, `man 7 pthreads`
- [futex(7) man page](https://man7.org/linux/man-pages/man7/futex.7.html)
- [Ulrich Drepper — Futexes Are Tricky](https://www.akkadia.org/drepper/futex.pdf)
