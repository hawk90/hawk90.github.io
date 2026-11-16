---
title: "멀티스레드·멀티프로세스 디버깅 — Non-Stop·Scheduler-Locking·Fork"
slug: "tools/debugging/gdb-lldb/chapter06-multithread-multiprocess"
date: 2026-05-24T09:06:00
description: "스레드별 backtrace와 정지 범위, scheduler-locking, fork/exec 추적과 rr의 검증 조건."
tags: [gdb, Multithread, Multiprocess]
series: "GDB and LLDB"
seriesOrder: 6
draft: false
topics: ["tools", "tools/debugging"]
---

:::tip[Deep dive]
이 챕터는 빠른 참조입니다. 재현 조건을 좁힌 뒤 [TSan](/blog/tools/debugging/sanitizers/chapter04-tsan)과 [Helgrind/DRD](/blog/tools/debugging/valgrind/chapter04-helgrind-drd)의 실행 범위를 함께 비교합니다.
:::


싱글 스레드 버그는 호출 흐름만 따라가면 됩니다. 멀티 스레드 버그는 *순서*가 망가집니다. 어떤 스레드가 먼저 락을 잡았는지, 어떤 스레드가 데이터를 덮어썼는지, 어떤 스레드가 안 깨어났는지를 봐야 합니다. 디버거가 정지하면 모든 스레드의 콜스택을 한 번에 볼 수 있고, 이 장은 그 사진을 읽는 법을 다룹니다.

*Linux 스레드의 정체*에서 출발해 GDB의 스레드 모델, scheduler-locking, fork/vfork/clone의 차이, 그리고 record-and-replay 도구 rr까지 다룹니다. 출력은 Debian 13 arm64(glibc 2.41, 커널 6.12.116)의 GDB 16.3과 lldb 19.1.7에서 얻었습니다.

## Linux의 스레드 — 실은 프로세스

Linux 커널에서 *스레드*는 별도 개념이 아닙니다. 새 태스크를 만들 때 무엇을 부모와 공유할지 플래그로 고르고, 전부 공유하면 스레드, 거의 아무것도 공유하지 않으면 프로세스가 됩니다. 한 집에 사는 가족(주소 공간·파일·시그널 처리를 공유)과 분가한 가족(사본만 들고 나감)의 차이와 비슷합니다.

말로 하기보다 `strace`로 직접 보는 편이 정확합니다. 이 장의 실습 프로그램 `mt.c`(스레드 4개)와 `fork.c`(`fork` 한 번, `vfork` 한 번)를 `strace -f`로 돌리면 glibc 2.41이 실제로 부르는 시스템 콜이 나옵니다.

```text
$ strace -f -e trace=clone3 ./mt
clone3({flags=CLONE_VM|CLONE_FS|CLONE_FILES|CLONE_SIGHAND|CLONE_THREAD|CLONE_SYSVSEM|CLONE_SETTLS|CLONE_PARENT_SETTID|CLONE_CHILD_CLEARTID, child_tid=0xffffb40af250, parent_tid=0xffffb40af250, exit_signal=0, stack=0xffffb38a0000, stack_size=0x80ea60, tls=0xffffb40af8a0}

$ strace -f -e trace=clone,clone3,execve ./fork
clone(child_stack=NULL, flags=CLONE_CHILD_CLEARTID|CLONE_CHILD_SETTID|SIGCHLD, child_tidptr=0xffffb25370f0) = 7673
[pid  7673] execve("/bin/echo", ["echo", "from exec"], 0xfffff2e34488 /* 17 vars */) = 0
clone(child_stack=0xfffff2e342e0, flags=CLONE_VM|CLONE_VFORK|SIGCHLD) = 7674
```

`pthread_create`는 `clone3`에 공유 플래그를 모두 켜고 `CLONE_THREAD`로 같은 스레드 그룹(같은 PID)에 넣습니다. `fork()`는 공유 플래그 없이 `SIGCHLD`만 주고, `vfork()`는 `CLONE_VM`(주소 공간 공유)에 `CLONE_VFORK`(자식이 `exec`하거나 끝날 때까지 부모 정지)를 더합니다. 플래그 하나하나의 의미는 `man 2 clone`에 있습니다.

**LWP**(Light Weight Process) 번호가 커널의 스레드 ID(tid)이고, `pthread_self()`가 돌려주는 `pthread_t`는 그와 다른 값입니다. POSIX는 `pthread_t`의 표현을 정하지 않고, glibc는 스레드 descriptor의 주소를 씁니다. `mt.c`의 `main`이 출력한 두 값과 GDB에서 본 값이 그 관계를 보여 줍니다.

```c
#include <sys/syscall.h>
pid_t my_lwp = syscall(SYS_gettid);   // LWP id (= tid)
pthread_t my_pth = pthread_self();    // glibc: thread descriptor 주소
```

```text
main tid=7593 pthread_self=0xfffff7fef020
...
(gdb) info threads
  Id   Target Id                                   Frame
* 1    Thread 0xfffff7fef020 (LWP 7593) "mt"       main () at mt.c:53
(gdb) print/x pthread_self()
$1 = 0xfffff7fef020
```

GDB의 `Thread 0x...`는 glibc의 `pthread_t` 값과 같고, `LWP 7593`은 `gettid()`와 같습니다. 이 대응은 glibc + Linux native target에서 확인한 것이고, `pthread_t`를 정수 tid로 취급해도 된다는 뜻은 아닙니다.

## 정지의 의미

GDB의 기본은 *all-stop* 모드입니다. 한 스레드가 breakpoint에 닿으면 나머지 스레드도 멈추고, 그 상태에서 모든 스레드의 위치를 볼 수 있습니다. 운동회 사진처럼 셔터를 누른 순간의 장면입니다. 다만 GDB 매뉴얼 All-Stop Mode 절은 다른 스레드가 문장 경계가 아니라 "in the middle of a statement"에서 멈춘다고 적고 있습니다. 같은 절은 `step`·`next` 한 번 동안 다른 스레드가 여러 문장을 실행할 수 있다고도 적고 있습니다.

`set non-stop on`이면 멈춘 스레드만 멈추고 나머지는 계속 달립니다. `mt.c`를 non-stop으로 실행해 53행에 멈추면 메인 스레드만 서 있고 나머지는 `(running)`입니다.

```text
(gdb) set non-stop on
(gdb) break 53
(gdb) run
Thread 1 "mt" hit Breakpoint 1, main () at mt.c:53
(gdb) info threads
  Id   Target Id                                   Frame
* 1    Thread 0xfffff7fef020 (LWP 7636) "mt"       main () at mt.c:53
  2    Thread 0xfffff7def180 (LWP 7638) "worker-0" (running)
  3    Thread 0xfffff75df180 (LWP 7639) "worker-1" (running)
  4    Thread 0xfffff6dcf180 (LWP 7640) "waiter"   (running)
  5    Thread 0xfffff65bf180 (LWP 7641) "io"       (running)
(gdb) thread 2
(gdb) interrupt
Thread 2 "worker-0" stopped.
0x0000aaaaaaaa0cd8 in worker (arg=0x0) at mt.c:22
(gdb) print counter
$1 = {401381230, 405674151}
(gdb) print counter
$2 = {401381230, 405864792}
```

`interrupt`로 worker-0만 세우자 `counter[0]`은 고정되고, 아직 달리는 worker-1의 `counter[1]`은 두 번의 `print` 사이에도 계속 늘었습니다. heartbeat를 보내는 스레드처럼 디버깅 중에도 멈추면 안 되는 스레드가 있을 때 non-stop을 씁니다. 명령이 스레드별로 따로 놀기 때문에, 그런 이유가 없다면 all-stop이 다루기 쉽습니다.

## 스레드 목록 보기

all-stop으로 같은 프로그램을 53행에 세운 결과입니다. 스레드 이름은 각 스레드가 `pthread_setname_np`로 붙인 것입니다.

```text
(gdb) info threads
  Id   Target Id                                   Frame
* 1    Thread 0xfffff7fef020 (LWP 7593) "mt"       main () at mt.c:53
  2    Thread 0xfffff7def180 (LWP 7595) "worker-0" worker (arg=0x0) at mt.c:21
  3    Thread 0xfffff75df180 (LWP 7596) "worker-1" 0x0000aaaaaaaa0cc4 in worker (arg=0x1) at mt.c:22
  4    Thread 0xfffff6dcf180 (LWP 7597) "waiter"   __syscall_cancel_arch () at ../sysdeps/unix/sysv/linux/aarch64/syscall_cancel.S:50
  5    Thread 0xfffff65bf180 (LWP 7598) "io"       __syscall_cancel_arch () at ../sysdeps/unix/sysv/linux/aarch64/syscall_cancel.S:50
```

별표(`*`)는 *현재 스레드*이고, `Id`는 GDB가 붙인 번호입니다. 조건 변수를 기다리는 `waiter`와 `read`에서 막힌 `io`는 맨 위 프레임만으로는 구분되지 않습니다. 둘 다 glibc의 시스템 콜 진입점에 있기 때문이고, 무엇을 기다리는지는 아래 backtrace로 봅니다.

이름은 NUL을 포함해 16바이트까지입니다(`man 3 pthread_setname_np`). `mt.c`가 23글자 이름을 붙이려 하자 `pthread_setname_np`가 `ERANGE`를 돌려줬습니다.

```text
setname 23 chars: Numerical result out of range
```

LLDB의 `thread list`도 같은 정보를 보여 줍니다. LLDB는 tid와 이름을 같은 줄에 적습니다.

```text
(lldb) thread list
Process 7934 stopped
* thread #1: tid = 7934, 0x0000aaaaaaaa0e80 mt`main at mt.c:53:5, name = 'mt', stop reason = breakpoint 1.1
  thread #2: tid = 7941, 0x0000aaaaaaaa0cc4 mt`worker(arg=0x0000000000000000) at mt.c:22:25, name = 'worker-0'
  thread #3: tid = 7942, 0x0000aaaaaaaa0cbc mt`worker(arg=0x0000000000000001) at mt.c:22:25, name = 'worker-1'
  thread #4: tid = 7943, 0x0000fffff7e7f228 libc.so.6`__syscall_cancel_arch at syscall_cancel.S:50, name = 'waiter'
  thread #5: tid = 7944, 0x0000fffff7e7f228 libc.so.6`__syscall_cancel_arch at syscall_cancel.S:50, name = 'io'
```

macOS의 LLDB는 여기에 libdispatch 큐 이름을 더합니다. [Ch 1](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install)의 macOS 세션에서 메인 스레드가 `queue = 'com.apple.main-thread'`로 표시된 것이 그 예입니다.

## 스레드 전환

`thread N`으로 전환하면 이후의 `bt`·`print`·`info locals`가 그 스레드 기준으로 동작합니다.

```text
(gdb) thread 2
[Switching to thread 2 (Thread 0xfffff7def180 (LWP 7595))]
#0  0x0000aaaaaaaa0c90 in worker (arg=0x0) at mt.c:21
21	        counter[id]++;                 /* line 21 */
(gdb) bt
#0  0x0000aaaaaaaa0c90 in worker (arg=0x0) at mt.c:21
#1  0x0000fffff7e761d8 in start_thread (arg=0xfffff7def180) at ./nptl/pthread_create.c:448
#2  0x0000fffff7ede15c [PAC] in thread_start () at ../sysdeps/unix/sysv/linux/aarch64/clone3.S:79
```

LLDB는 `thread select N`입니다. `thread backtrace`는 선택한 스레드의 스택을 보여 주고, `bt 1`의 숫자는 *프레임 개수*이지 스레드 번호가 아닙니다.

```text
(lldb) thread select 2
(lldb) bt 1
* thread #2, name = 'worker-0'
    frame #0: 0x0000aaaaaaaa0cc4 mt`worker(arg=0x0000000000000000) at mt.c:22:25
```

## 모든 스레드에 명령 적용

`thread apply all bt`는 모든 스레드의 콜스택을 한 번에 보여 줍니다. 특정 스레드만 보려면 번호를 나열하고, 뒤에 붙는 명령에는 옵션을 그대로 줄 수 있습니다.

```text
(gdb) thread apply 2 3 bt 2

Thread 2 (Thread 0xfffff7def180 (LWP 7595) "worker-0"):
#0  0x0000aaaaaaaa0c90 in worker (arg=0x0) at mt.c:21
#1  0x0000fffff7e761d8 in start_thread (arg=0xfffff7def180) at ./nptl/pthread_create.c:448
(More stack frames follow...)

Thread 3 (Thread 0xfffff75df180 (LWP 7596) "worker-1"):
#0  worker (arg=0x1) at mt.c:22
#1  0x0000fffff7e761d8 in start_thread (arg=0xfffff75df180) at ./nptl/pthread_create.c:448
(More stack frames follow...)
```

`waiter`의 전체 스택을 보면 조건 변수 대기임이 드러납니다.

```text
Thread 4 (Thread 0xfffff6dcf180 (LWP 7597) "waiter"):
#0  __syscall_cancel_arch () at ../sysdeps/unix/sysv/linux/aarch64/syscall_cancel.S:50
...
#5  0x0000fffff7e7564c [PAC] in __pthread_cond_wait_common (cond=0xaaaaaaac00e8 <qcond>, mutex=0xaaaaaaac00b8 <qlock>, clockid=0, abstime=0x0) at ./nptl/pthread_cond_wait.c:426
#6  ___pthread_cond_wait (cond=0xaaaaaaac00e8 <qcond>, mutex=0xaaaaaaac00b8 <qlock>) at ./nptl/pthread_cond_wait.c:458
#7  0x0000aaaaaaaa0d2c [PAC] in waiter (arg=0x0) at mt.c:30
```

LLDB는 `bt all`이고, 풀 명령은 `thread backtrace all`입니다.

### 출력이 너무 많을 때

스레드가 수백 개면 출력이 금방 수천 줄이 됩니다. 범위를 좁히는 방법은 세 가지입니다.

1. **프레임 수 제한** — `thread apply all -- bt 1`은 스레드마다 맨 위 프레임만 보여 줍니다. `--`는 `thread apply`의 옵션과 뒤 명령을 구분하고, `-q`를 주면 `Thread N (...)` 머리줄까지 뺍니다.

2. **파일로** — GDB 16.3에서는 `set logging on`이 deprecated입니다. 쳐 보면 대체 명령을 알려 줍니다.

   ```text
   (gdb) set logging file /root/ch06/threads.log
   (gdb) set logging on
   Warning: 'set logging on', an alias for the command 'set logging enabled', is deprecated.
   Use 'set logging enabled on'.

   Copying output to /root/ch06/threads.log.
   (gdb) thread apply all bt
   ...
   (gdb) set logging enabled off
   Done logging to /root/ch06/threads.log.
   (gdb) shell wc -l /root/ch06/threads.log
   34 /root/ch06/threads.log
   ```

3. **요약 — Python으로** — 맨 위 프레임 이름으로 스레드를 묶어 세면, 같은 자리에 멈춘 스레드가 몇 개인지 한눈에 보입니다. Java thread dump의 "같은 스택 N개" 요약과 같은 발상입니다.

   ```python
   (gdb) python
   from collections import Counter
   counts = Counter()
   for thread in gdb.selected_inferior().threads():
       thread.switch()
       frame = gdb.newest_frame()
       counts[frame.name() or '??'] += 1
   for name, n in counts.most_common(10):
       print(f"{n:>4} {name}")
   end
   ```

   `mt.c`에서 실행한 결과입니다.

   ```text
      2 __syscall_cancel_arch
      2 worker
      1 main
   ```

## futex — 락 대기의 정체

Linux의 pthread mutex와 조건 변수는 *futex*(fast user-space mutex) 위에 서 있습니다. `man 7 futex`의 설명대로, 경합이 없으면 사용자 공간의 원자 연산만으로 끝나고 경합이 있을 때만 `futex` 시스템 콜로 커널에서 잠듭니다. 화장실 문고리를 돌려 보고 열리면 그냥 들어가고, 잠겨 있을 때만 줄을 서는 셈입니다.

그래서 락을 기다리는 스레드의 스택 맨 위는 glibc 2.41에서 늘 같은 모양입니다. [Ch 4](/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames)의 `dead.c`에서 본 스택이 그 예입니다.

```text
#0  futex_wait (futex_word=0xaaaac98f0090 <m2>, expected=2, private=0) at ../sysdeps/nptl/futex-internal.h:146
#1  __GI___lll_lock_wait (futex=futex@entry=0xaaaac98f0090 <m2>, private=private@entry=0) at ./nptl/lowlevellock.c:49
#2  0x0000ffff93549750 [PAC] in lll_mutex_lock_optimized (mutex=0xaaaac98f0090 <m2>) at ./nptl/pthread_mutex_lock.c:48
#3  ___pthread_mutex_lock (mutex=0xaaaac98f0090 <m2>) at ./nptl/pthread_mutex_lock.c:93
```

`expected=2`는 glibc `sysdeps/nptl/lowlevellock.h` 주석의 세 상태(0 = 풀림, 1 = 잠김·대기자 없음, >1 = 잠김·대기자 있을 수 있음) 중 마지막 상태이고, 그 mutex를 *누가* 잡고 있는지는 glibc `pthread_mutex_t`의 `__owner` 필드(소유자의 LWP)에 있습니다. 이 필드는 glibc 내부 구조라서 다른 libc에서는 이름이 다릅니다.

## 데드락 사례

`Cache::Update`는 Cache 락을 잡은 채 `Logger::Write`를 부르고, `Flush`는 Logger 락을 잡은 채 `Cache::Touch`를 부르는 `cache.cpp`를 실행해 두고 GDB로 붙었습니다. 두 스레드가 락을 반대 순서로 잡는 전형적인 순서 역전입니다.

```cpp title="cache.cpp (발췌)"
void Update(const std::string& key) {
    std::lock_guard<std::mutex> g(cache_mutex_);          // 18: Cache lock
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    data_[key]++;
    log_.Write(key);                                      // 21: then Logger lock
}
void Touch() { std::lock_guard<std::mutex> g(cache_mutex_); }   // 23

void Logger::Write(const std::string& msg) {
    std::lock_guard<std::mutex> g(log_mutex_);                // 33: Logger lock
}
void Flush(Logger& log) {
    std::lock_guard<std::mutex> g(log.log_mutex_);            // 38: Logger lock
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
    g_cache->Touch();                                         // 40: then Cache lock
}
```

```text
(gdb) thread apply 2 3 -- bt 9

Thread 2 (Thread 0xffffb521f160 (LWP 7855) "cache"):
#0  futex_wait (futex_word=0xfffff24de6c8, expected=2, private=0) at ../sysdeps/nptl/futex-internal.h:146
...
#5  0x0000aaaadbac2538 in std::mutex::lock (this=0xfffff24de6c8) at /usr/include/c++/14/bits/std_mutex.h:113
#6  0x0000aaaadbac299c in std::lock_guard<std::mutex>::lock_guard (this=0xffffb521e788, __m=...) at /usr/include/c++/14/bits/std_mutex.h:250
#7  0x0000aaaadbac2828 in Cache::Touch (this=0xfffff24de6c8) at cache.cpp:23
#8  0x0000aaaadbac1a24 in Flush (log=...) at cache.cpp:40

Thread 3 (Thread 0xffffb5a2f160 (LWP 7854) "cache"):
#0  futex_wait (futex_word=0xfffff24de730, expected=2, private=0) at ../sysdeps/nptl/futex-internal.h:146
...
#7  0x0000aaaadbac19cc in Logger::Write (this=0xfffff24de730, msg="k") at cache.cpp:33
#8  0x0000aaaadbac27e4 in Cache::Update (this=0xfffff24de6c8, key="k") at cache.cpp:21
```

스택만으로는 "두 스레드가 각자 무엇을 기다린다"까지만 압니다. 사이클을 확인하려면 각 mutex의 소유자를 찍습니다. `std::mutex`의 내부 `_M_mutex`가 glibc의 `pthread_mutex_t`입니다.

```text
(gdb) thread 2
(gdb) frame 7
#7  0x0000aaaadbac2828 in Cache::Touch (this=0xfffff24de6c8) at cache.cpp:23
(gdb) print &this->cache_mutex_
$1 = (std::mutex *) 0xfffff24de6c8
(gdb) print this->cache_mutex_._M_mutex.__data.__owner
$2 = 7854
(gdb) thread 3
(gdb) frame 7
#7  0x0000aaaadbac19cc in Logger::Write (this=0xfffff24de730, msg="k") at cache.cpp:33
(gdb) print &this->log_mutex_
$3 = (std::mutex *) 0xfffff24de730
(gdb) print this->log_mutex_._M_mutex.__data.__owner
$4 = 7855
```

스레드 2(LWP 7855)가 기다리는 Cache 락(`0x...6c8`)의 주인은 LWP 7854이고, 스레드 3(LWP 7854)이 기다리는 Logger 락(`0x...730`)의 주인은 LWP 7855입니다. 서로가 서로의 락을 쥐고 기다리는 사이클이 확인됐으므로 이제야 데드락이라고 말할 수 있습니다.

이 확인을 매번 손으로 하는 대신, 실행 중 락 순서를 기록해 역전을 경고하는 도구가 [Helgrind](/blog/tools/debugging/valgrind/chapter04-helgrind-drd)와 [TSan](/blog/tools/debugging/sanitizers/chapter04-tsan)입니다. 둘은 데드락이 실제로 일어나지 않은 실행에서도 순서 역전을 찾아냅니다.

## scheduler-locking

한 스레드만 골라 한 줄씩 진행하고 싶을 때 씁니다. GDB 16.3의 `help set scheduler-locking`이 네 값을 설명합니다.

```text
(gdb) help set scheduler-locking
Set mode for locking scheduler during execution.
off    == no locking (threads may preempt at any time)
on     == full locking (no thread except the current thread may run)
	  This applies to both normal execution and replay mode.
step   == scheduler locked during stepping commands (step, next, stepi, nexti).
	  In this mode, other threads may run during other commands.
	  This applies to both normal execution and replay mode.
replay == scheduler locked in replay mode and unlocked during normal execution.
(gdb) show scheduler-locking
Mode for locking scheduler during execution is "off".
```

효과를 카운터로 확인했습니다. `mt.c`의 두 worker는 각자 `counter[0]`과 `counter[1]`을 쉬지 않고 올립니다. `on`으로 두고 worker-0에서 `next`를 세 번 하면 `counter[0]`만 2 늘고 `counter[1]`은 그대로입니다. `off`로 돌려 메인 스레드에서 `next` 한 번을 하면 두 카운터가 각각 129,041과 227,923 늘었습니다.

```text
(gdb) print counter
$3 = {386699670, 384079235}
(gdb) set scheduler-locking on
(gdb) thread 2
(gdb) next
22	        if (counter[id] % 100000000 == 0) usleep(1);
(gdb) next
21	        counter[id]++;                 /* line 21 */
(gdb) next
22	        if (counter[id] % 100000000 == 0) usleep(1);
(gdb) print counter
$5 = {386699672, 384079235}
(gdb) set scheduler-locking off
(gdb) thread 1
(gdb) next
ready
54	    pthread_join(t[3], NULL);
(gdb) print counter
$6 = {386828713, 384307158}
```

LLDB에서는 진행 명령마다 `--run-mode this-thread`를 줍니다. worker-0에서 `thread step-over --run-mode this-thread`를 두 번 하자 `counter[0]`만 1 늘었습니다.

```text
(lldb) frame variable counter
(volatile volatile long[2]) counter = ([0] = 366424646, [1] = 351663059)
(lldb) thread step-over --run-mode this-thread
(lldb) thread step-over --run-mode this-thread
(lldb) frame variable counter
(volatile volatile long[2]) counter = ([0] = 366424647, [1] = 351663059)
```

:::warning
`scheduler-locking on`에서 현재 스레드가 다른 스레드가 쥔 락을 기다리면, 그 스레드는 영원히 풀려나지 못합니다. 다른 스레드는 실행되지 않기 때문입니다. 단계 진행이 끝나면 `off`로 되돌립니다.
:::

### scheduler-locking이 부족할 때

디버거로 멈추고 한 줄씩 진행하는 것 자체가 스레드 사이의 타이밍을 바꿉니다. race가 디버거 아래에서만 사라지거나, 반대로 디버거 아래에서만 드러나는 이유입니다. 이때는 실행을 기록해 두고 다시 보는 rr이나, 실행하면서 happens-before 관계를 검사하는 TSan을 함께 씁니다.

## fork — 자식 따라가기 / 부모 따라가기

`fork(2)`가 호출되면 GDB는 기본적으로 *부모*를 따라가고 자식은 놓아줍니다. GDB 16.3의 기본값은 다음과 같습니다.

```text
(gdb) show follow-fork-mode
Debugger response to a program call of fork or vfork is "parent".
(gdb) show detach-on-fork
Whether gdb will detach the child of a fork is on.
(gdb) show follow-exec-mode
Follow exec mode is "same".
```

자식에서 문제가 생긴다면 따라가는 쪽을 바꿉니다. `fork.c`에서 `set follow-fork-mode child`로 실행하면 GDB가 자식에 붙고 부모를 놓아준 뒤, 자식만 부르는 `child_work`에서 멈춥니다.

```text
(gdb) set follow-fork-mode child
(gdb) catch fork
(gdb) break child_work
(gdb) run
Catchpoint 1 (forked process 7653), arch_fork (ctid=0xfffff7fef0f0) at ../sysdeps/unix/sysv/linux/arch-fork.h:41
(gdb) continue
[Attaching after Thread 0xfffff7fef020 (LWP 7651) fork to child process 7653]
[New inferior 2 (process 7653)]
[Detaching after fork from parent process 7651]
[Inferior 1 (process 7651) detached]

Thread 2.1 "fork" hit Breakpoint 3, child_work (x=21) at fork.c:6
```

부모와 자식을 *둘 다* 잡아 두려면 `set detach-on-fork off`를 씁니다. 이때 함정이 하나 있습니다. GDB는 새로 생긴 쪽(이 경우 자식)을 멈춘 채로 두는데, `fork.c`의 부모는 `waitpid`로 자식을 기다리므로, `catch fork` 없이 `run`하면 자식이 멈춘 채라 프로그램이 진행하지 않았습니다. `catch fork`로 멈춘 뒤 `inferior 2`로 전환해 자식을 직접 진행시켜야 합니다.

```text
(gdb) set detach-on-fork off
(gdb) catch fork
(gdb) break child_work
(gdb) run
Catchpoint 1 (forked process 7747), arch_fork (ctid=0xfffff7fef0f0) at ../sysdeps/unix/sysv/linux/arch-fork.h:41
(gdb) next
[New inferior 2 (process 7747)]
(gdb) info inferiors
  Num  Description       Connection           Executable
* 1    process 7745      1 (native)           /root/ch06/fork
  2    process 7747      1 (native)           /root/ch06/fork
(gdb) inferior 2
[Switching to inferior 2 [process 7747] (/root/ch06/fork)]
(gdb) continue
Thread 2.1 "fork" hit Breakpoint 2.2, child_work (x=21) at fork.c:6
...
(gdb) inferior 1
(gdb) info threads
  Id   Target Id                               Frame
* 1.1  Thread 0xfffff7fef020 (LWP 7745) "fork" arch_fork (ctid=0xfffff7fef0f0) at ../sysdeps/unix/sysv/linux/arch-fork.h:54
  2.1  Thread 0xfffff7fef020 (LWP 7747) "fork" child_work (x=21) at fork.c:6
```

스레드 번호가 `inferior.thread`(`1.1`, `2.1`)로 바뀌고, breakpoint도 inferior마다 위치가 따로 생겨 `Breakpoint 2.2`로 표시됩니다. 두 프로세스의 `pthread_t`(`0xfffff7fef020`)가 같은 것은 `fork`가 주소 공간을 그대로 복사했기 때문입니다.

### fork / vfork / clone — 무엇이 다른가

위 `strace` 출력과 `man 2 clone`을 표로 정리하면 다음과 같습니다.

| | `fork()` | `vfork()` | `pthread_create()` |
|---|----------|-----------|-----------|
| glibc 2.41 arm64가 부른 시스템 콜 | `clone(CLONE_CHILD_CLEARTID\|CLONE_CHILD_SETTID\|SIGCHLD)` | `clone(CLONE_VM\|CLONE_VFORK\|SIGCHLD)` | `clone3(CLONE_VM\|...\|CLONE_THREAD\|...)` |
| 주소 공간 | 복사(copy-on-write) | 부모와 공유 | 공유 |
| 부모 | 바로 반환 | 자식이 `exec`·`_exit`할 때까지 정지 | 바로 반환 |
| GDB에서 보이는 모습 | 새 inferior | 새 inferior | 같은 inferior의 새 스레드 |

`follow-fork-mode`는 `fork`와 `vfork`에 모두 적용됩니다(`show follow-fork-mode`의 문구가 "fork or vfork"입니다).
### exec 추적

`fork` 뒤 자식이 `exec`하면 프로그램 이미지가 통째로 바뀝니다. `follow-fork-mode child`와 `catch exec`를 함께 쓰면 그 순간에 멈춥니다. 기본값 `same`에서는 같은 inferior 번호가 새 실행 파일을 가리키게 됩니다.

```text
(gdb) continue
child 42
process 7653 is executing new program: /usr/bin/echo
Error in re-setting breakpoint 3: Function "child_work" not defined.

Thread 2.1 "echo" hit Catchpoint 2 (exec'd /usr/bin/echo), _start () at ../sysdeps/aarch64/dl-start.S:23
(gdb) info inferiors
  Num  Description       Connection           Executable
  1    <null>                                 /root/ch06/fork
* 2    process 7653      1 (native)           /usr/bin/echo
```

`exec` 직후 GDB는 기존 breakpoint를 새 실행 파일에 다시 맞춰 보고, 새 파일에 없는 함수는 `Error in re-setting breakpoint 3`으로 알려 줍니다. `set follow-exec-mode new`로 두면 GDB 매뉴얼 Forks 절의 설명대로 새 inferior를 만들어, 원래 프로그램을 나중에 다시 실행할 수 있게 남겨 둡니다.

LLDB도 `target.process.follow-fork-mode` 설정이 있고 기본값은 `parent`입니다. `child`로 바꾸고 `fork.c`를 실행하자 자식만 부르는 `child_work`에서 멈췄습니다. 이때 breakpoint는 프롤로그 앞(`fork.c:6:23`)에 걸려 `x=0`으로 보였고, `process status`에는 launch 때의 pid가 그대로 나왔습니다.

```text
(lldb) settings show target.process.follow-fork-mode
target.process.follow-fork-mode (enum) = parent
(lldb) settings set target.process.follow-fork-mode child
(lldb) run
* thread #2, name = 'fork', stop reason = breakpoint 1.1
    frame #0: 0x0000aaaaaaaa0968 fork`child_work(x=0) at fork.c:6:23
```

## 비결정적 버그 — rr

스레드 버그의 악몽은 *재현이 안 된다*는 것입니다. 한 번 잡아도 다음 실행에서는 나오지 않습니다. 해법은 블랙박스처럼 *기록해 두고 다시 재생*하는 것입니다.

[rr](https://rr-project.org/)은 실행을 기록한 뒤 GDB 아래에서 같은 실행을 몇 번이고 재생하는 도구입니다. rr 5.9.0 README에 따르면 Mozilla에서 시작됐고 지금은 Pernosco가 개발을 후원합니다.

### 동작 원리와 제약

rr 프로젝트 페이지의 limitations 절은 다음을 밝힙니다.

- rr은 *단일 코어 머신을 흉내* 냅니다. 병렬 프로그램은 한 코어에서 돌리는 만큼 느려지고, 이것은 설계상 특성입니다.
- 기록 트리 밖의 프로세스와 메모리를 공유하는 프로세스는 기록할 수 없습니다.
- 기록되는 프로세스가 쓰는 모든 시스템 콜을 rr이 알아야 합니다. 지원하지 않는 시스템 콜을 만나면 이슈로 보고하라고 적고 있습니다.
- 비교적 최신 x86 CPU 또는 특정 ARM CPU(Apple M1 이상)가 필요합니다.

README의 시스템 요구 사항은 더 구체적입니다. AArch64에서는 "ARM Neoverse N1 or the Apple Silicon M-series" 같은 특정 마이크로아키텍처만 지원하고, VM 안에서는 하드웨어 성능 카운터를 가상화해 주는 경우에만 동작합니다(VMware·KVM은 동작, Xen은 미동작).

이 시리즈의 VM에서는 rr이 시작조차 하지 않았습니다. 호스트는 Apple M2 Pro지만, QEMU HVF 게스트가 CPU를 implementer `0x61`(Apple), part `0x0`으로 보여 줘서 rr이 마이크로아키텍처를 알아보지 못했습니다.

```text
# rr --version
rr version 5.9.0
# rr record ./fork
[FATAL ./src/PerfCounters_aarch64.h:109:compute_cpu_microarch()] Unknown aarch64 CPU type implementer: 0x61, variant: 0x0 part: 0x0
```

그래서 아래 워크플로는 이 시리즈에서 실행하지 않았습니다. 명령은 rr 프로젝트 페이지의 "the rr debugging experience" 절(`rr record /your/application --args ...` 뒤 `rr replay`를 하면 GDB 프롬프트가 뜸)과 GDB 16.3 매뉴얼 Reverse Execution 절의 `reverse-continue`·`reverse-step`·`reverse-next`를 옮긴 것입니다.

```bash
# 1. 기록 (한 번)
$ rr record ./my_program arg1 arg2

# 2. 재생 (몇 번이고)
$ rr replay
(gdb) continue
(gdb) reverse-continue          # ← 시간 역행
(gdb) reverse-step
(gdb) reverse-next
```

rr 프로젝트 페이지는 재생 중에 "Set breakpoints and data watchpoints and quickly reverse-execute to where they were hit"라고 설명합니다. 값이 잘못 바뀐 시점을 찾으려면 그 변수에 `watch -l`을 걸고 `reverse-continue`로 *마지막 쓰기*까지 거꾸로 갑니다. GDB 자체의 `record full` 기반 역실행은 [Ch 11](/blog/tools/debugging/gdb-lldb/chapter11-practical-tips)에서 실제로 돌려 봅니다.

### Pernosco

[Pernosco](https://pernos.co/)는 rr로 기록한 x86-64 Linux 실행을 업로드하면 웹에서 쓰는 디버거를 돌려주는 상용 서비스입니다. 회사 소개에 따르면 프로그램 상태를 모든 시점에서 조회하고, 제어 흐름과 데이터 흐름의 이력을 시각화하며, 기록과 디버깅 상태를 다른 개발자와 공유할 수 있습니다. 이 시리즈에서는 사용해 보지 않았습니다.

macOS의 LLDB에서 rr과 같은 기록·재생은 이 장에서 다루지 않았습니다. Windows에는 Microsoft의 [Time Travel Debugging](https://learn.microsoft.com/en-us/windows-hardware/drivers/debuggercmds/time-travel-debugging-overview)이 있습니다.

## TSan / Helgrind와의 관계

GDB로 데드락을 확인하는 것은 *지금 멈춘 상태*를 보는 일입니다. 위 `cache.cpp`처럼 이미 멈춰 버린 프로그램에는 GDB가 가장 빠릅니다. 반면 한 번도 멈추지 않은 실행에서 잠재된 race나 순서 역전을 찾는 것은 실행을 계측하는 도구의 몫입니다.

| 도구 | 보는 것 | 이 블로그의 해당 글 |
|------|---------|--------------------|
| **GDB** | 지금 멈춘 스레드의 스택과 락 소유자 | 이 장 |
| **TSan** | 컴파일러 계측으로 data race와 lock-order 역전 | [Sanitizers Ch 4](/blog/tools/debugging/sanitizers/chapter04-tsan) |
| **Helgrind/DRD** | Valgrind 위에서 race와 락 순서 | [Valgrind Ch 4](/blog/tools/debugging/valgrind/chapter04-helgrind-drd) |
| **rr** | 실패한 실행 한 번의 기록과 역방향 재생 | 이 장 (이 VM에서는 실행 불가) |

## LLDB 차이 요약

아래 LLDB 열은 모두 lldb 19.1.7에서 실행해 확인했습니다.

| 작업 | GDB | LLDB |
|------|-----|------|
| 스레드 목록 | `info threads` | `thread list` |
| 전환 | `thread N` | `thread select N` |
| 모든 스레드 bt | `thread apply all bt` | `bt all` |
| 현재 스레드만 진행 | `set scheduler-locking on` | `thread step-over --run-mode this-thread` |
| follow-fork | `set follow-fork-mode child` | `settings set target.process.follow-fork-mode child` |
| 디버깅 대상 목록 | `info inferiors` / `inferior N` | `target list` |

LLDB의 `target list`는 실행 파일 단위의 target을 보여 주며, GDB inferior처럼 fork된 자식이 별도 항목으로 늘어나지는 않았습니다.

## 정리

- Linux 스레드는 `clone3`의 공유 플래그 + `CLONE_THREAD`입니다. glibc 2.41 arm64에서 `fork`는 `clone(SIGCHLD|...)`, `vfork`는 `clone(CLONE_VM|CLONE_VFORK|...)`이었습니다.
- GDB의 `Thread 0x...`는 glibc `pthread_t`, `LWP`는 커널 tid입니다. 스레드 이름은 NUL 포함 16바이트까지입니다.
- non-stop에서는 멈춘 스레드만 멈추고, 나머지 카운터는 계속 올라갔습니다.
- 데드락은 `thread apply all bt`로 대기 위치를, mutex의 `__owner`로 소유자를 찍어 사이클을 확인합니다.
- `scheduler-locking on`(LLDB는 `--run-mode this-thread`)이면 현재 스레드의 카운터만 움직였습니다.
- `follow-fork-mode child`로 자식을, `detach-on-fork off` + `inferior N`으로 둘 다를 잡습니다. 후자에서 부모가 `waitpid`로 기다리면 직접 자식을 진행시켜야 합니다.
- rr 5.9.0은 이 QEMU HVF 게스트에서 CPU를 인식하지 못해 실행되지 않았습니다. 지원 조건은 README의 System requirements를 봅니다.
- 지금 멈춘 상태는 GDB, 잠재된 race는 TSan·Helgrind로 봅니다.

## 다음 장 예고

[Ch 7: core dump 분석](/blog/tools/debugging/gdb-lldb/chapter07-core-dump)은 프로세스가 이미 죽었을 때 남은 core를 읽는 법을 다룹니다. `ulimit -c`, `core_pattern`, `gdb exe core`, systemd-coredump를 실제로 돌려 봅니다.

## 관련 항목

- [Ch 5: 브레이크포인트와 워치포인트](/blog/tools/debugging/gdb-lldb/chapter05-breakpoints-watchpoints)
- [Ch 7: core dump 분석](/blog/tools/debugging/gdb-lldb/chapter07-core-dump)
- [Sanitizers Ch 4: TSan](/blog/tools/debugging/sanitizers/chapter04-tsan) — 동시성 버그 탐지
- [Valgrind Ch 4: Helgrind / DRD](/blog/tools/debugging/valgrind/chapter04-helgrind-drd) — race / lock-order
- [rr 프로젝트](https://rr-project.org/) — record-and-replay
- [Pernosco](https://pernos.co/) — rr trace 인덱싱
- `man 2 clone` — 모든 CLONE_* 플래그 의미
- `man 7 futex` — futex 메커니즘
