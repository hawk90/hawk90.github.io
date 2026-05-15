---
title: "Ch 2: GDB 멀티스레드 명령"
date: 2025-09-04T02:00:00
description: "info threads, thread apply all, scheduler-locking, non-stop 모드 깊이."
tags: [gdb, threads, scheduler-locking, non-stop]
series: "Concurrency Debugging"
seriesOrder: 2
draft: false
---

GDB가 멀티스레드 프로세스를 어떻게 정지·검사·재개하는지의 안쪽을 봅니다. 단순한 `info threads` 이상으로 *all-stop vs non-stop 모드*의 차이, scheduler-locking의 한계, 모든 스레드 콜스택 출력의 자동화까지.

## 정지의 의미

GDB가 한 스레드를 멈추면 *모든* 스레드가 같이 멈추는 게 기본 (`set non-stop off`). 한 BP에 도달하면 *마이크로초 안에* 다른 스레드도 SIGSTOP/PTRACE_INTERRUPT로 정지.

```text
(gdb) break main
(gdb) run
[Thread 0x... (LWP 12346) hit Breakpoint 1, main () at main.cpp:10]
[All threads stopped]
```

내부 동작.

1. GDB가 `ptrace(PTRACE_CONT)`로 디버기 진행.
2. 디버기의 한 스레드가 BP의 `INT3` 명령 실행 → 커널이 SIGTRAP.
3. ptrace가 GDB에 알림.
4. GDB가 *모든 다른 LWP*에 `ptrace(PTRACE_INTERRUPT)` 또는 `tgkill(pid, tid, SIGSTOP)`.
5. 각 LWP가 *그 시점*에 정지.

"동시 정지"는 *근사* — 5번 단계가 *마이크로초 ~ 밀리초* 걸려, 그 사이 다른 스레드가 *조금 더* 진행. 정밀한 시점 일관성이 필요하면 rr 같은 도구로.

## info threads 깊이

```text
(gdb) info threads
  Id   Target Id                                  Frame
* 1    Thread 0x7ffff7d8b740 (LWP 12345) "main"   __pthread_cond_wait at futex-internal.h:174
  2    Thread 0x7ffff75c4640 (LWP 12346) "worker" std::__atomic_base<int>::fetch_add at queue.cpp:42
  3    Thread 0x7ffff6dc3640 (LWP 12347) "worker" pthread_cond_wait at queue.cpp:88
  4    Thread 0x7ffff65c2640 (LWP 12348) "io"     read at io.cpp:23
```

각 컬럼.

- `Id` — GDB가 부여한 *짧은 번호* (1부터). thread group 안에서.
- `Target Id` — pthread_t + LWP + 이름.
- `Frame` — 현재 PC의 함수 (가장 안쪽 프레임).

`*`가 *현재 스레드*. 이 시점의 모든 작업 (`bt`, `print`, `frame`) 이 *이 스레드 컨텍스트*에서.

### LWP만 보기

```text
(gdb) thread find 12346       # LWP 12346의 GDB id
Thread 2 has target id 'Thread 0x7ffff75c4640 (LWP 12346) "worker"'

(gdb) thread find worker      # 이름으로
Thread 2 has target id 'Thread 0x... (LWP 12346) "worker"'
Thread 3 has target id 'Thread 0x... (LWP 12347) "worker"'
```

큰 프로세스 (수백 스레드)에서 *어느 스레드인지* 찾기.

## thread 전환

```text
(gdb) thread 3
[Switching to thread 3 (Thread 0x7ffff6dc3640 (LWP 12347) "worker")]
#0  __pthread_cond_wait at ...
```

전환 후 `bt`, `print`, `info locals` 모두 *그 스레드 컨텍스트*.

```text
(gdb) thread 1
(gdb) bt
(gdb) thread 2
(gdb) bt        # 이번엔 스레드 2의 콜스택
```

수동으로 일일이 전환하긴 귀찮음. `thread apply`가 자동화.

## thread apply

```text
(gdb) thread apply 2 3 4 bt
(gdb) thread apply all bt
(gdb) thread apply all -- bt 5     # 각 스레드 상위 5프레임만
```

* `2 3 4` — 지정 스레드들만.
* `all` — 전부.
* `-- <cmd>` — 명령에 `--`로 인자 분리 (그렇지 않으면 `bt 5`의 `5`가 thread ID로 해석될 수 있음).

### 단순 사례 — 데드락 진단

```text
(gdb) thread apply all bt
Thread 4 (...): #0 __lll_lock_wait ... #1 pthread_mutex_lock ... #3 Logger::Write
Thread 3 (...): #0 __lll_lock_wait ... #1 pthread_mutex_lock ... #3 Cache::Update
Thread 2 (...): #0 __pthread_cond_wait ... #1 condvar_wait ...
Thread 1 (...): #0 epoll_wait
```

Thread 3과 4가 *둘 다 락 대기*. `frame N`으로 가서 mutex 주소 확인.

```text
(gdb) thread 3
(gdb) frame 1
(gdb) print *mutex
$1 = {... __owner = 12347, ...}     # Thread 4가 들고 있음 (LWP 12347)

(gdb) thread 4
(gdb) frame 1
(gdb) print *mutex
$2 = {... __owner = 12346, ...}     # Thread 3이 들고 있음 (LWP 12346)
```

12347이 12346의 락을 기다리고, 12346이 12347의 락을 기다림. *고전적 락 순서 역전*.

### thread apply의 출력 통제

큰 프로세스에선 수십 KB의 출력. 옵션.

```text
(gdb) thread apply all -ascending bt       # 1, 2, 3, ... 순서로
(gdb) thread apply all -- bt 3              # 짧게
(gdb) thread apply all -- p $rip            # 모든 PC만
(gdb) thread apply all -q -- bt 5           # quiet (Thread N 헤더 생략)
```

`thread apply all -- p`로 *모든 스레드의 표현식 평가*. 활용 — 각 스레드의 *특정 변수* 일괄 보기.

```text
(gdb) thread apply all -- print my_state
```

## scheduler-locking

한 스레드만 step하면서 다른 스레드는 *정지 유지*.

```text
(gdb) set scheduler-locking on
(gdb) thread 2
(gdb) next
```

- `on` — *진행* 명령(`next`/`step`)이 현재 스레드만. 다른 스레드는 정지 유지.
- `step` — `step` 시에만 단일, `continue` 시 모두.
- `off` (기본) — 모두 같이.
- `replay` — rr replay 모드 전용.

내부 메커니즘 — GDB가 진행시킬 LWP에만 `PTRACE_CONT` 보냄. 나머지는 `SIGSTOP` 상태 유지.

### 위험성

`scheduler-locking on`으로 *continue*하면 다른 스레드 정지 상태로 자기만 진행. *그 스레드가 다른 스레드의 작업을 기다리면* 디버깅이 *영영* 진행 안 함.

```text
(gdb) set scheduler-locking on
(gdb) continue                  # 한참 동안 응답 없음...
^C                              # 인터럽트
(gdb) set scheduler-locking off # 정상화
```

평소엔 `off`, *경합 조건 step debug* 시에만 `on`.

## non-stop 모드

근본적으로 다른 모델. `set non-stop on`이면 *한 스레드가 멈춰도 다른 스레드는 계속*.

```text
(gdb) set non-stop on
(gdb) attach 12345
(gdb) info threads
* 1  ...    [running]
  2  ...    [stopped at SIGTRAP]
  3  ...    [running]
```

각 스레드가 *독립적*으로 정지·진행. continue/step도 한 스레드만.

용도 — heartbeat 스레드가 계속 돌아야 *클러스터가 정상*이라고 보고하는 환경. 한 작업 스레드만 정지·디버깅하고 heartbeat은 계속.

위험 — *공유 자원* 동시 접근이 디버깅 중에도 일어남. 일반 사용엔 all-stop이 안전.

## info threads의 stop reason

```text
(gdb) info threads
  Id   Target Id  Frame  Stop reason
* 1    ...        main   <not stopped>
  2    ...        ...    Hit breakpoint 1 at main.cpp:10
  3    ...        ...    received SIGTRAP, Trace/breakpoint trap.
```

non-stop 모드에서 *어떤 스레드가 왜 멈췄는지* 명시.

## 모든 스레드 콜스택의 자동화 — Python

큰 출력을 *압축*하거나 *비슷한 콜스택을 묶기*.

```python
import gdb
from collections import defaultdict

class StackHash(gdb.Command):
    """Group threads by stack signature."""
    def __init__(self):
        super().__init__("stack-hash", gdb.COMMAND_USER)
    def invoke(self, arg, from_tty):
        groups = defaultdict(list)
        for thread in gdb.selected_inferior().threads():
            thread.switch()
            frame = gdb.newest_frame()
            sig = []
            depth = 0
            while frame and depth < 5:
                sig.append(frame.name() or '??')
                frame = frame.older()
                depth += 1
            groups[tuple(sig)].append(thread.num)
        for sig, ids in sorted(groups.items(), key=lambda x: -len(x[1])):
            print(f"{len(ids)} threads: {ids[:5]}{'...' if len(ids) > 5 else ''}")
            for name in sig:
                print(f"  {name}")
            print()

StackHash()
```

```text
(gdb) stack-hash
42 threads: [3, 4, 5, 6, 7]...
  __pthread_cond_wait
  pthread_cond_wait
  Queue::Pop
  worker_loop

5 threads: [10, 11, 12, 13, 14]
  read
  io_handler
  ...

1 threads: [1]
  epoll_wait
  ...
```

비슷한 콜스택을 *한 줄로* 묶어 *수십 스레드*의 본질만.

## 모든 스레드의 동일 표현식

```python
class AllThreadsExpr(gdb.Command):
    def __init__(self):
        super().__init__("all-eval", gdb.COMMAND_USER)
    def invoke(self, arg, from_tty):
        for thread in gdb.selected_inferior().threads():
            thread.switch()
            try:
                v = gdb.parse_and_eval(arg)
                print(f"Thread {thread.num}: {arg} = {v}")
            except gdb.error as e:
                print(f"Thread {thread.num}: error - {e}")

AllThreadsExpr()
```

```text
(gdb) all-eval my_state
Thread 1: my_state = INITIALIZED
Thread 2: my_state = WORKING
Thread 3: my_state = WAITING
```

각 스레드의 *TLS 변수* 보기에 매우 유용.

## 메모리·레지스터 — 스레드별

각 스레드가 *자기 레지스터*와 *자기 스택*. 메모리(힙·전역)는 공유.

```text
(gdb) thread 2
(gdb) info reg
rax  0x42
rbx  0xff
...

(gdb) thread 3
(gdb) info reg
rax  0x100
rbx  0x0
...
```

레지스터 변경.

```text
(gdb) thread 2
(gdb) set $rax = 100
```

위험 — *실시간 동작 중*에 레지스터 변경은 거의 모든 면에서 부작용. 디버깅 직전·직후 정도에만.

## 스레드 종료 / 생성 알림

```text
(gdb) set print thread-events on   # 기본 on
[New Thread 0x7fff... (LWP 12349)]
[Thread 0x7fff... (LWP 12347) exited]
```

매 스레드 생성·종료마다 콘솔에 표시. 큰 프로세스에선 시끄러우니 `off`로.

## thread information from /proc

GDB의 `info threads`로 충분하지 않을 때 `/proc`을 직접.

```text
(gdb) shell cat /proc/$(pgrep my_prog | head -1)/task/12346/status
Name:   worker
State:  S (sleeping)
Tgid:   12345
Pid:    12346
PPid:   1234
...
voluntary_ctxt_switches:        12345
nonvoluntary_ctxt_switches:     567
```

*voluntary vs nonvoluntary context switch* 비율로 *그 스레드가 lock 대기 중인지* 추정. voluntary가 많으면 *대기형*, nonvoluntary가 많으면 *CPU bound + preempted*.

## tgkill — GDB가 스레드를 깨우는 방법

GDB가 PTRACE_INTERRUPT로 안 깨워질 때 `tgkill(pid, tid, SIGSTOP)`로 강제 정지. 일부 syscall 안(`accept`, `recvmsg`)에서 ptrace가 안 통할 때 사용.

GDB 내부 동작이라 사용자가 신경 쓸 일은 없지만 *왜 한 스레드만 자꾸 hung*인지의 원인이 *시그널 핸들러 mask*일 수 있음.

## thread-specific BP

```text
(gdb) break main.cpp:42 thread 3
```

`Thread 3`이 *그 줄에 도달*했을 때만 정지. 다른 스레드는 *같은 줄에 도달해도 통과*.

```text
(gdb) break process_request if $_thread == 5
```

내장 변수 `$_thread`로 현재 thread ID.

```text
(gdb) commands
> silent
> printf "thread %d processing\n", $_thread
> continue
> end
```

조건부 logpoint도 thread별.

## thread-specific watchpoint

```text
(gdb) watch g_counter thread 2
```

Thread 2의 컨텍스트에서만 watch. *공유 변수*지만 *특정 스레드의 접근*만 잡고 싶을 때.

## non-stop + asynchronous

```text
(gdb) set non-stop on
(gdb) set target-async on
(gdb) attach 12345
(gdb) c -a            # 모든 스레드 continue (background)
(gdb) interrupt 3     # 스레드 3만 정지
(gdb) bt
```

진정한 *비동기 디버깅*. 일부 스레드는 자유 실행, 일부만 검사. IDE의 *Pause* 버튼이 이렇게 동작.

복잡도가 크므로 일상 사용엔 권장 안 함.

## 매우 많은 스레드 환경

JVM·Postgres·redis-server는 수백·수천 스레드. `info threads`가 1MB+ 출력.

```text
(gdb) set print thread-events off
(gdb) set pagination off
(gdb) set logging file /tmp/threads.log
(gdb) set logging on
(gdb) thread apply all -- bt 10
(gdb) set logging off
```

파일에 떨군 뒤 `grep`/`awk`로 분석.

또는 자체 Python 명령으로 *시그니처별 묶음*.

## 정리

- 기본은 all-stop — 한 스레드 정지 시 모두 정지 (근사).
- `info threads` + `thread N` + `bt`가 일상.
- `thread apply all bt`가 데드락 진단의 첫 명령.
- `set scheduler-locking on`으로 한 스레드만 step.
- `non-stop on`은 진정한 비동기, 위험성도 큼.
- thread-specific BP/watch로 *특정 스레드*만 잡기.
- 큰 프로세스는 Python으로 *시그니처 묶음*.
- futex 대기 콜스택 + `__owner` 검사가 데드락의 표준 진단.

## 다음 장 예고

Ch 3 — fork / vfork / 멀티프로세스 디버깅. 자식·부모 동시 추적, exec 추적, namespace.

## 관련 항목

- [Ch 1: Linux 스레드 / futex](/blog/tools/debugging/concurrency-debug/chapter01-linux-threads-futex)
- [Ch 3: 멀티프로세스 디버깅](/blog/tools/debugging/concurrency-debug/chapter03-fork-multiprocess)
- [GDB All-Stop and Non-Stop](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Non-Stop-Mode.html)
- [GDB and LLDB Ch 6 (이전판)](/blog/tools/gdb-lldb/chapter06-multithread-multiprocess)
