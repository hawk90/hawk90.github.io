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


싱글 스레드 버그는 호출 흐름만 따라가면 됩니다. 멀티 스레드 버그는 *순서*가 망가집니다. 어떤 스레드가 먼저 락을 잡았는지, 어떤 스레드가 데이터를 덮어썼는지, 어떤 스레드가 안 깨어났는지를 봐야 합니다. 디버거가 정지하는 순간 모든 스레드의 콜스택이 한 시점의 사진처럼 박제됩니다. 이 사진을 잘 읽는 법이 이 장의 주제입니다.

이 장에서는 *Linux 스레드의 정체*에서 출발해 GDB의 스레드 모델, scheduler-locking의 한계, fork/vfork/clone의 차이, 그리고 비결정적 race 디버깅의 표준 무기인 rr까지 다룹니다.

## Linux의 스레드 — 실은 프로세스

Linux 커널에서 *스레드*는 별도 개념이 아닙니다. `clone(2)` 시스템 콜의 옵션 비트로 만들어진 *프로세스*가 다른 프로세스와 *어떤 자원을 공유하는지*에 따라 의미가 갈립니다.

```c
// pthread_create의 안쪽 (단순화)
clone(child_func, child_stack,
      CLONE_VM      |    // 주소 공간 공유
      CLONE_FS      |    // 파일시스템 정보 공유
      CLONE_FILES   |    // FD 테이블 공유
      CLONE_SIGHAND |    // 시그널 핸들러 공유
      CLONE_THREAD  |    // 같은 thread group (같은 PID)
      CLONE_SYSVSEM |
      CLONE_SETTLS  |
      CLONE_PARENT_SETTID | CLONE_CHILD_CLEARTID,
      arg, &parent_tid, tls, &child_tid);
```

이 모든 플래그를 함께 켜면 *POSIX 스레드*. 일부만 켜면 *부모-자식 프로세스*. vfork의 부모 정지는 CLONE_VM만으로 설명되지 않고 CLONE_VFORK 등의 의미도 확인해야 합니다.

**LWP**(Light Weight Process)가 *커널의* 스레드 ID. `top -H`에서 보이는 그 ID입니다. `pthread_self()`가 반환하는 사용자 공간 pthread_t와는 다른 개념 — pthread_t는 POSIX가 정수·포인터 중 하나로 고정하지 않는 불투명 타입입니다. glibc 내부 표현과 Linux tid를 혼동하지 않습니다.

```c
#include <sys/syscall.h>
pid_t my_lwp = syscall(SYS_gettid);   // LWP id (= tid)
pthread_t my_pth = pthread_self();    // glibc pthread descriptor
```

`info threads`의 `Target Id` 형식은 OS와 target backend에 따릅니다. Linux native target에서는 LWP 항목에 커널 TID가 표시될 수 있지만, 주소처럼 보이는 thread id를 `pthread_t`라고 단정하면 안 됩니다. `pthread_t`의 표현은 POSIX가 고정하지 않는 불투명 타입입니다.

## 정지의 의미

기본적으로 GDB가 한 스레드를 멈추면 *모든* 스레드가 같이 멈춥니다 (`set non-stop off`, 기본값). 즉 브레이크포인트에 한 스레드가 도착하면 나머지 스레드도 그 자리에서 동결됩니다. 이때 콜스택을 찍으면 모든 스레드의 현재 위치가 동시에 보입니다 — 실시간이 아니라 정지 직후의 한 컷.

운영체제와 target backend는 실행 중인 다른 스레드를 정지시킬 수 있습니다. 전체가 멈추기까지 일부 스레드가 진행할 수 있으므로 all-stop의 관측값도 원자적인 동시 스냅샷이라고 보장되지는 않습니다. non-stop은 선택한 스레드를 제어하는 방식이며 전체 스냅샷을 강화하는 기능은 아닙니다.

`set non-stop on`이면 멈춘 스레드만 멈추고 나머지는 계속 달립니다. 디버깅 중에도 일부 스레드가 진행돼야 할 때 (예: heartbeat 송신 스레드) 쓰지만 보통은 off로 둡니다.

```text
(gdb) set non-stop on
(gdb) attach 12345
(gdb) info threads
* 1  ...    [running]
  2  ...    [stopped at SIGTRAP]
  3  ...    [running]
```

non-stop 모드는 *모든 명령*이 스레드별로 독립적입니다. `continue` 시 현재 스레드만 진행. 디버깅 사고가 더 많아질 수 있어 평소엔 all-stop이 안전.

## 스레드 목록 보기

```text
(gdb) info threads
  Id   Target Id                                  Frame
* 1    Thread 0x7ffff7d8b740 (LWP 12345) "main"   __pthread_cond_wait at futex-internal.h:174
  2    Thread 0x7ffff75c4640 (LWP 12346) "worker" std::__atomic_base<int>::fetch_add at queue.cpp:42
  3    Thread 0x7ffff6dc3640 (LWP 12347) "worker" pthread_cond_wait at queue.cpp:88
  4    Thread 0x7ffff65c2640 (LWP 12348) "io"     read at io.cpp:23
```

별표(`*`)는 *현재 스레드*. `Id`는 GDB가 부여한 짧은 번호입니다. Linux native target의 `LWP`(Light Weight Process)는 커널 thread ID를 가리킵니다. 다른 OS와 backend는 별도 thread-id 형식을 사용합니다.

위 `info threads` 출력은 필드 모양을 설명하는 예시이며, 주소·PID·소스 위치는 실제 한 세션에서 수집한 값이 아닙니다.

스레드 이름 (`"main"`, `"worker"`)은 `pthread_setname_np` 또는 `prctl(PR_SET_NAME)`로 설정한 것. 디버깅을 쉽게 하려면 워커마다 의미 있는 이름을 박는 게 좋습니다.

```c
pthread_setname_np(pthread_self(), "worker-3");
```

이름은 최대 15바이트(NUL 포함 16). 의외로 짧으므로 `db-conn-7` 같은 짧은 패턴이 적합.

LLDB도 거의 같습니다.

```text
(lldb) thread list
Process 12345 stopped
* thread #1: tid = 12345, 0x... main`__pthread_cond_wait, queue 'com.apple.main-thread', stop reason = breakpoint 1.1
  thread #2: tid = 12346, 0x... main`worker_loop + 0x42, name = 'worker'
  thread #3: tid = 12347, 0x... main`worker_loop + 0x88, name = 'worker'
  thread #4: tid = 12348, 0x... main`io_loop + 0x23, name = 'io'
```

macOS는 *디스패치 큐* 정보도 함께 — `queue 'com.apple.main-thread'`처럼. GCD/libdispatch를 쓰는 macOS 앱 디버깅에서 유용.

## 스레드 전환

```text
(gdb) thread 3
[Switching to thread 3 (Thread 0x7ffff6dc3640 (LWP 12347))]
(gdb) bt
```

`thread N`으로 전환하면 그 스레드의 콜스택과 레지스터·로컬 변수에 접근됩니다. 디버거의 *현재 컨텍스트*가 바뀐다고 생각하면 됩니다.

LLDB는 `thread select N`. 사실 LLDB에서는 `thread backtrace 3`으로 스레드 인덱스를 지정할 수 있지만 bt 3은 기본 alias에서 프레임 수 제한이므로 구분해야 합니다., 여러 작업을 그 스레드 컨텍스트에서 하려면 select가 편합니다.

## 모든 스레드에 명령 적용

가장 자주 쓰는 한 줄.

```text
(gdb) thread apply all bt
```

모든 스레드의 콜스택을 한 번에. 데드락 의심 시 가장 먼저 칩니다. 어느 스레드가 `pthread_mutex_lock`에서 멈춰 있고 어느 스레드가 그 락을 들고 있는지 한눈에 보입니다.

특정 스레드만 추리고 싶으면 ID 나열.

```text
(gdb) thread apply 2 3 4 bt full
```

LLDB는

```text
(lldb) thread backtrace all
(lldb) bt all
```

### 출력이 너무 많을 때

스레드가 많은 환경에서는 출력이 커집니다. 다음 세 가지로 범위를 좁힙니다.

1. **압축 — frame filter**

   ```text
   (gdb) thread apply all -- bt 5
   ```

   각 스레드 상위 5프레임만.

2. **외부로 — set logging**

   ```text
   (gdb) set logging file /tmp/threads.log
   (gdb) set logging on
   (gdb) thread apply all bt
   (gdb) set logging off
   ```

   디스크에 떨어진 로그를 다른 창에서 grep으로 추립니다.

3. **요약 — Python으로**

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

   비슷한 콜스택을 하나로 묶어 *유사 스레드 N개*로 봅니다. Java thread dump의 "same stack trace x42"와 같은 패턴.

## futex — 락 대기의 정체

Linux의 pthread mutex/condition variable은 내부적으로 *futex*(Fast Userspace muTEX)를 씁니다. 락이 자유로우면 사용자 공간 atomic만으로 끝나고, 경합이 일어나야만 커널로 진입.

```c
// pthread_mutex_lock의 간략 흐름
int pthread_mutex_lock(mutex *m) {
    if (atomic_cas(&m->lock, 0, 1)) return 0;       // fast path
    while (atomic_cas(&m->lock, 0, 2) != 0)
        syscall(SYS_futex, &m->lock, FUTEX_WAIT, 2, ...);
    return 0;
}
```

GDB로 보면 락 대기 중인 스레드는 `__lll_lock_wait` → `futex_wait` 식으로 콜스택이 마무리됩니다. 이 깊이는 거의 *항상 같음*. 콜스택 마지막이 `__lll_lock_wait`면 *어떤 락*을 기다리는지가 다음 질문.

```text
(gdb) thread 2
(gdb) frame 3
#3  pthread_mutex_lock (mutex=0x55555576a2c0) at ...
(gdb) print *mutex
$1 = {__data = {__lock = 2, __count = 0, __owner = 12347, ...}}
```

이 축약 예시에서는 `__owner` 값이 Linux LWP 12347을 가리킨다고 가정합니다. 해당 TID가 실제로 이 mutex를 소유하는지 다른 스레드의 stack·mutex 주소와 함께 확인해야 합니다. glibc 내부 구조와 필드 의미는 버전에 따라 달라질 수 있습니다.

## 데드락 사례

다음 콜스택을 봅니다.

```text
Thread 2:
#0  __lll_lock_wait at lowlevellock.c:52
#1  pthread_mutex_lock
#2  std::mutex::lock at mutex:104
#3  Cache::Update(string const&) at cache.cpp:88
#4  Worker::Run() at worker.cpp:23

Thread 3:
#0  __lll_lock_wait at lowlevellock.c:52
#1  pthread_mutex_lock
#2  std::mutex::lock at mutex:104
#3  Logger::Write(string const&) at logger.cpp:42
#4  Cache::Update(string const&) at cache.cpp:91
#5  Worker::Run() at worker.cpp:23
```

T2는 Cache 락을 들고 Logger 락을 기다리고, T3는 Logger 락을 들고 Cache 락을 기다린다면 전형적 락 순서 역전(데드락)입니다. 락 객체 주소를 찍어 두 스레드가 같은 락을 다투는지 확인합니다.

```text
(gdb) thread 2
(gdb) frame 3
(gdb) print &this->cache_mutex_
$1 = (std::mutex *) 0x55555576a2c0
```

같은 mutex 주소는 경합 대상을 확인할 뿐입니다. T2가 소유한 A를 T3가 기다리고 T3가 소유한 B를 T2가 기다리는 사이클과 진행 불가 조건까지 확인해야 데드락의 근거가 됩니다.

데드락 검출 자동화 — 모든 스레드의 *대기 중인 락 ↔ 보유 중인 락* 관계를 그래프로 그리고 사이클을 찾는 도구. deadcode 검사는 lock-order 검사와 다릅니다. 동적 lock-order 검사인 [Helgrind](/blog/tools/debugging/valgrind/chapter04-helgrind-drd)가 정적/동적으로 시도합니다.

## scheduler-locking

한 스레드만 골라 디버깅하고 싶을 때.

```text
(gdb) set scheduler-locking on
(gdb) thread 2
(gdb) next
```

`on`이면 `next`/`step` 등 *진행* 명령이 현재 스레드만 움직입니다. 다른 스레드는 정지 상태. 경합 조건을 단계별로 재현할 때 유용합니다.

- `on` — 현재 스레드만 진행.
- `step` — `step` 시에만 단일 스레드, `continue` 시에는 모두.
- `off` (기본) — 모두 같이 진행.
- replay — 지원되는 replay target에서 재생 중 scheduler locking을 적용합니다. rr 전용 설정은 아닙니다.

정확한 정지·재개 동작은 OS와 target backend에 따릅니다. 모든 플랫폼에서 같은 ptrace 요청과 signal 조합을 쓴다고 일반화하지 않습니다.

LLDB는 `settings set target.process.thread.step-avoid-libraries`와 `thread step-out`/`step-in --run-mode this-thread` 조합으로 비슷한 효과를 냅니다. GDB만큼 깔끔하지는 않습니다.

:::warning
`scheduler-locking on` 상태로 `continue`하면 정지 상태인 다른 스레드 때문에 데드락에 빠질 수 있습니다. 또한 *현재 스레드가 다른 스레드를 기다리고 있다면* 디버깅이 영원히 진행 안 됩니다. 디버깅 끝나면 `off`로 되돌립니다.
:::

### scheduler-locking이 부족할 때

디버거의 정지·단계 진행은 스케줄링과 타이밍을 바꾸므로 race를 숨기거나 드러낼 수 있습니다. 지연은 target·transport·환경에 따라 달라지며 이 글에서는 측정하지 않았습니다.

해법: **rr**(Ch 끝부분) 또는 **TSan**(Sanitizer Ch 4)로 보강.

## fork — 자식 따라가기 / 부모 따라가기

`fork(2)`가 호출되면 GDB는 기본적으로 *부모*를 따라가고 자식은 자유 실행합니다. 자식에서 버그가 생기는 경우(예: `exec` 직후 환경 변수 처리) 따라가는 대상을 바꿉니다.

```text
(gdb) set follow-fork-mode child
(gdb) catch fork
(gdb) run
```

`child`로 두면 fork 직후 GDB가 자식 프로세스를 디버깅하고 부모는 분리됩니다.

```text
(gdb) set detach-on-fork off
```

fork 후 부모/자식 *둘 다* 추적. `info inferiors`로 인페리어(프로세스) 목록을 보고 `inferior N`으로 전환.

```text
(gdb) info inferiors
  Num  Description       Connection           Executable
* 1    process 12345     1 (native)           /usr/local/bin/server
  2    process 12346     1 (native)           /usr/local/bin/server
```

부모/자식이 같은 바이너리이므로 둘 다 보면서 분기를 추적할 수 있습니다.

### fork / vfork / clone — 무엇이 다른가

| | `fork()` | `vfork()` | `clone()` |
|---|----------|-----------|-----------|
| 주소 공간 | COW 사본 | 부모와 공유 | 플래그로 결정 |
| 부모 정지 | 즉시 반환 | 자식 exec/exit까지 정지 | 플래그로 결정 |
| 시그널 핸들러 | 사본 | 공유 | 플래그 |
| 시스템 콜 | `clone(CLONE_CHILD_CLEARTID, ...)` | `clone(CLONE_VFORK\|CLONE_VM, ...)` | 직접 |

GDB에 영향:
- `set follow-fork-mode`는 fork·vfork 모두에 적용.
- `vfork`는 부모가 정지되어 있어 *자식 추적이 더 안정적*.
- `clone`은 어떤 플래그냐에 따라 *스레드*로 보이기도 *프로세스*로 보이기도. GDB가 자동으로 판별합니다 (CLONE_THREAD 비트).

### exec 추적

`fork → exec`로 바이너리가 바뀌는 경우 (셸 → ls), catch exec는 지원 target에서 exec 사건을 포착하며 새 executable 전환 뒤의 상태를 조사합니다.

```text
(gdb) catch exec
(gdb) set follow-exec-mode same
(gdb) run
```

same이 기본이며 exec 전후에 같은 inferior를 유지합니다. new는 새 inferior를 만들고 이전 executable을 다시 실행할 수 있도록 원래 inferior와 분리합니다.

`exec` 직후엔 *주소 공간·매핑·심볼*이 모두 새로 로드됩니다. GDB가 기존 BP를 새 바이너리에 다시 *해석*하지만, 주소가 달라져 BP가 사라질 수 있습니다. `info breakpoints`로 확인.

## 비결정적 버그 — rr

스레드 버그의 악몽: *재현이 안 됨*. 한 번 잡아도 다음 실행에서 안 나옴. 해답은 *기록 후 재생*.

[rr](https://rr-project.org/)은 Mozilla가 만든 record-and-replay 디버거입니다. 한 번 기록하면 같은 명령어 시퀀스가 정확히 재생됩니다 — 같은 스레드 스케줄, 같은 시스템 콜 응답, 같은 메모리 레이아웃. GDB가 그 재생 위에서 동작합니다.

### 동작 원리

rr은 *단일 코어*로 디버기를 실행합니다. 비결정성의 원인 셋을 통제.

1. **컨텍스트 스위치** — 단일 코어 + 커스텀 스케줄 → 결정적.
2. **시스템 콜 결과** — 모든 syscall 결과를 기록 → 재생 시 그대로 주입.
3. **시그널** — 도달 시점을 기록.

기록 비용은 workload·CPU·커널에 따라 달라지며 여기서 slowdown을 측정하지 않았습니다. 그래도 race·heisenbug를 한 번이라도 잡았다면 *몇 번이고 재생*할 수 있다는 것이 결정적 가치.

```bash
# 1. 기록 (한 번)
$ rr record ./my_program arg1 arg2
[...버그 발생...]

# 2. 재생 (몇 번이고)
$ rr replay
(rr) continue
(rr) reverse-continue          # ← 시간 역행
(rr) reverse-step
(rr) reverse-next
```

`reverse-*`가 핵심입니다. 변수가 잘못된 값으로 바뀐 시점을 찾으려면 watchpoint + `reverse-continue`로 *마지막 쓰기*를 거꾸로 찾아갑니다.

```text
(rr) watch -l my_var
(rr) reverse-continue
[정지: my_var = 42로 바뀐 직전]
```

### rr 디버깅 워크플로

1. 버그 재현이 잘 안 되면 *루프*로 기록.
   ```bash
   for attempt in $(seq 1 20); do
       rr record ./my_test
       status=$?
       if [ "$status" -ne 0 ]; then break; fi
   done
   ```
   테스트가 성공이면 0, 찾는 실패면 비0을 반환한다는 계약 아래 최대 20회만 실행합니다. 비0은 rr 자체의 실행 오류일 수도 있으므로 trace와 종료 사유를 확인합니다. 이 환경에서는 rr을 설치하거나 실행하지 않았습니다.
2. trace 디렉터리 백업 (`~/.local/share/rr/latest-trace/`).
3. `rr replay`로 재생. 같은 결과가 반복적으로 나옴.
4. 원인 추적은 `reverse-continue` + `watch`.
5. trace를 동료에게 공유 — 그쪽 머신에서도 정확히 같은 실행.

### 제약

- Linux와 지원되는 CPU·커널·PMU가 필요합니다. x86 전용으로 고정하지 말고 [선택한 rr release의 문서](https://github.com/rr-debugger/rr)를 확인합니다.
- 일부 CPU 이벤트(RDTSC, 일부 SIMD) 기록 안 됨.
- 멀티 코어 동시성은 단일 코어 시뮬로만 — 진짜 메모리 모델 race(예: 다른 코어 캐시 사이의 reorder)는 재현 불가.
- 비결정적 입력 출력(sound, GPU)은 어색.

rr은 기록 중 실제로 재현된 실패를 반복 조사하는 방법입니다. 기록 자체가 스케줄을 바꾸어 실패를 숨길 수도 있습니다.

이 장은 macOS LLDB에서 rr과 동등한 replay를 검증하지 않았습니다. Microsoft의 [TTD](https://docs.microsoft.com/en-us/windows-hardware/drivers/debugger/time-travel-debugging-overview)가 Windows 쪽 대안.

### Pernosco — rr의 클라우드 후속

rr의 trace를 업로드하면 *모든 메모리 변화를 일종의 인덱스*로 만들어 웹 UI로 보여 주는 상용 서비스. "이 변수가 마지막으로 X 값을 가진 시점" 같은 쿼리가 즉답. trace 분석을 *팀이 공유*할 수 있어 큰 codebase에서 매우 유용합니다.

## TSan / Helgrind와의 관계

GDB로 데드락·경합을 찾는 건 *증상 확인* 단계. 사후에 어디가 진짜 race인지 보려면 [ThreadSanitizer](/blog/tools/debugging/sanitizers/chapter04-tsan)나 Helgrind/DRD가 필요합니다. GDB는 "지금 멈춘 이 상태"만 보지만, TSan은 "두 스레드의 happens-before가 어디서 깨졌는지"를 알려 줍니다. 같은 버그라도 도구 역할이 다릅니다.

세 도구의 분담.

| 도구 | 잘 잡는 것 | 못 잡는 것 |
|------|------------|-----------|
| **GDB** | 현재 멈춘 데드락의 락 보유 관계 | 과거의 race |
| **TSan** | 데이터 race + lock-order 위반 | 단일 스레드 메모리 버그 |
| **Helgrind/DRD** | 비슷, BFE + 락 그래프 분석 | 매우 느림 |
| **rr** | 재현 불가 버그의 *증거 보존* | 멀티 코어 메모리 모델 |

운영 디버깅에서는 GDB → TSan(CI) → rr(불가지의 버그) 순으로 단계적 적용.

## LLDB 차이 요약

| 작업 | GDB | LLDB |
|------|-----|------|
| 스레드 목록 | `info threads` | `thread list` |
| 전환 | `thread N` | `thread select N` |
| 모든 스레드 bt | `thread apply all bt` | `bt all` |
| scheduler-locking | `set scheduler-locking on` | (간접) `--run-mode this-thread` |
| follow-fork | `set follow-fork-mode child` | `settings set target.process.follow-fork-mode child` |
| 인페리어 | `info inferiors` / `inferior N` | `target list` / `target select N` |

LLDB의 fork 추적 지원은 플랫폼/backend에 따라 확인합니다. target 목록이 GDB inferior와 모든 면에서 일대일 대응하는 것은 아닙니다.

## 정리

- Linux 스레드는 *clone() 옵션의 결합*. POSIX 스레드 = 모든 공유 플래그 + CLONE_THREAD.
- 정지 시 모든 스레드가 같이 멈춘다 — `info threads`로 사진 보기.
- 데드락 의심 → `thread apply all bt`가 첫 명령.
- futex 대기 콜스택 → `print *mutex`로 `__owner` 확인.
- 한 스레드만 단계별 진행 → `scheduler-locking on`.
- fork 직후 자식 추적 → `set follow-fork-mode child`.
- 자식·부모 둘 다 → `set detach-on-fork off` + `info inferiors`.
- 재현 불가 race → rr로 기록 후 `reverse-continue`.
- rr → Pernosco로 trace 공유·인덱싱.
- 진짜 race 위치는 TSan/Helgrind와 병행.

## 다음 장 예고

Ch 7 — core dump 분석. 프로세스가 이미 죽었을 때 시신을 부검하는 법: `ulimit -c`, `core_pattern`, `gdb exe core`, systemd-coredump, macOS `.crash` 파일.

## 관련 항목

- [Ch 5: 브레이크포인트와 워치포인트](/blog/tools/debugging/gdb-lldb/chapter05-breakpoints-watchpoints)
- [Ch 7: core dump 분석](/blog/tools/debugging/gdb-lldb/chapter07-core-dump)
- [Sanitizers Ch 4: TSan](/blog/tools/debugging/sanitizers/chapter04-tsan) — 동시성 버그 탐지
- [Valgrind Ch 4: Helgrind / DRD](/blog/tools/debugging/valgrind/chapter04-helgrind-drd) — race / lock-order
- [rr 프로젝트](https://rr-project.org/) — record-and-replay
- [Pernosco](https://pernos.co/) — rr trace 인덱싱
- `man 2 clone` — 모든 CLONE_* 플래그 의미
- `man 7 futex` — futex 메커니즘
