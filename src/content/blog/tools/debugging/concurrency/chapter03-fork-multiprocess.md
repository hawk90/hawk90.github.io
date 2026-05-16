---
title: "Ch 3: fork / vfork / 멀티프로세스 디버깅"
date: 2025-09-04T03:00:00
description: "follow-fork-mode, detach-on-fork, exec 추적, namespace, 컨테이너 디버깅."
tags: [fork, vfork, multiprocess, namespace, container]
series: "Concurrency Debugging"
seriesOrder: 3
draft: true
---

`fork()` 직후의 *자식 프로세스*에 버그가 있다면? GDB가 *어느 쪽*을 따라갈지 결정해야 합니다. 이 장은 fork/vfork/clone의 차이, follow-fork-mode 옵션, 자식·부모 동시 추적, exec로 바이너리가 바뀌는 경우, 그리고 컨테이너 안 프로세스 디버깅까지 다룹니다.

## fork — 기본 동작

```c
pid_t pid = fork();
if (pid == 0) {
    // 자식
    process_child();
} else {
    // 부모
    waitpid(pid, NULL, 0);
}
```

기본적으로 GDB는 *부모*를 따라가고 자식은 *자유 실행*. 자식의 디버깅 필요 시 모드 변경.

```text
(gdb) show follow-fork-mode
Debugger response to a program call of fork or vfork is "parent".

(gdb) set follow-fork-mode child
(gdb) run
```

`child`로 두면 fork 직후 *자식 프로세스를 추적*. 부모는 분리 + 자유 실행.

## fork / vfork / clone

| | `fork()` | `vfork()` | `clone()` |
|---|----------|-----------|-----------|
| 주소 공간 | COW 사본 | 부모와 공유 | 플래그로 결정 |
| 부모 정지 | 즉시 반환 | 자식 exec/exit까지 정지 | 플래그로 결정 |
| 시그널 핸들러 | 사본 | 공유 | 플래그 |
| 시스템 콜 | `clone(CLONE_CHILD_CLEARTID, ...)` | `clone(CLONE_VFORK\|CLONE_VM, ...)` | 직접 |

`vfork`는 *fork보다 가볍지만 자식이 exec/exit하기 전엔 부모 정지*. 옛 Unix에서 *exec 직전 가벼운 분기*용. 오늘날 Linux는 fork도 COW로 거의 똑같이 가벼우므로 거의 사용 안 함.

`clone` 자체는 *플래그 조합*. POSIX 스레드도 clone (Ch 1). GDB가 `CLONE_THREAD` 비트로 *스레드 vs 프로세스* 구분.

GDB의 `set follow-fork-mode`는 fork·vfork 모두에 적용.

## 자식·부모 동시 추적

```text
(gdb) set detach-on-fork off
(gdb) run
[fork 후]
[New inferior 2 (process 12346)]
[Switching to inferior 2 [process 12346]...]
```

자식·부모 둘 다 추적. `info inferiors`로 확인.

```text
(gdb) info inferiors
  Num  Description       Connection           Executable
* 1    process 12345     1 (native)           /usr/local/bin/server
  2    process 12346     1 (native)           /usr/local/bin/server
```

`inferior N`으로 전환.

```text
(gdb) inferior 1
[Switching to inferior 1 [process 12345]]
(gdb) bt           # 부모의 콜스택
(gdb) inferior 2
(gdb) bt           # 자식의 콜스택
```

부모와 자식이 *같은 바이너리*면 심볼이 자동 공유. 다르면 (exec 후) 새로 로드.

### 다중 인페리어의 GDB 모드

```text
(gdb) show schedule-multiple
Resuming the execution of threads of all processes is off.

(gdb) set schedule-multiple on
(gdb) continue
```

`schedule-multiple on`이면 *모든 인페리어 동시 continue*. off면 *현재 인페리어만*.

## catch — fork/vfork/exec 정지

```text
(gdb) catch fork           # fork 일어나면 정지
(gdb) catch vfork
(gdb) catch exec           # exec 직전 정지
```

`info breakpoints`에 catchpoint로 등록.

```text
(gdb) catch fork
(gdb) run
Starting program: /path/to/prog
[New inferior 2 (process 12346)]
Catchpoint 1 (forked process 12346), in __libc_fork
(gdb) bt
#0  __libc_fork
#1  worker_main at worker.cpp:42
#2  main at main.cpp:10
```

fork *직후*에 정지 — *어디서* fork가 일어났는지 콜스택으로 확인.

`catch exec`는 fork → exec 패턴에서 *exec 직전*에 정지. 자식이 *어떤 바이너리로 바뀌는지* 검사.

```text
(gdb) catch exec
(gdb) c
[Process 12346 about to execute /bin/ls]
Catchpoint 2 (exec'd /bin/ls), at ...
```

## follow-exec-mode

```text
(gdb) set follow-exec-mode same
(gdb) set follow-exec-mode new
```

- `same` (기본) — exec 후 새 바이너리를 *같은 인페리어*에서 디버깅. 기존 BP가 새 바이너리에 맞게 재해석.
- `new` — exec 후 *새 인페리어* 생성. 옛 인페리어와 분리.

`new`가 *깔끔하지만* BP를 다시 설정해야 함. 보통 `same`.

## 새 BP — fork 자식에서만

```text
(gdb) catch fork
(gdb) commands
> silent
> set follow-fork-mode child
> continue
> end
```

fork 일어나면 *자동으로 자식 따라감 + continue*. 부모는 분리.

## 컨테이너 — namespace

Docker·Kubernetes 컨테이너 안의 프로세스도 *호스트에서 보면* 일반 프로세스. 호스트의 PID는 *namespace 외부 PID*.

```bash
# 호스트
$ docker inspect <container> --format '{{.State.Pid}}'
12345

# attach
$ sudo gdb -p 12345
```

다만 컨테이너 안의 PID와 호스트 PID가 *다름*.

```text
(gdb) print getpid()
$1 = 12345           # 호스트 PID
```

자식이 컨테이너 안의 `getpid()`를 부르면 *namespace 내부 PID* 반환 — `1` (init 자식이면). 디버깅 시 *둘이 다름*에 주의.

### docker exec로 컨테이너 안에서

```bash
$ docker exec -it <container> bash
# 컨테이너 안
$ apt-get install -y gdb
$ gdb -p 1
```

이러면 컨테이너 안에서 디버깅. *호스트의 GDB는 컨테이너 파일시스템을 못 보므로* sysroot 설정이 어려움.

### Yet another way — nsenter

```bash
$ sudo nsenter --target 12345 --mount --uts --ipc --net --pid bash
# 컨테이너의 namespace로 진입
$ gdb -p <internal_pid>
```

호스트의 도구를 *컨테이너 환경*에서 실행. `gdb`가 호스트 바이너리지만 *컨테이너의 /proc/[pid]*를 본다.

## 멀티프로세스 — Postgres·Apache

Postgres는 *프로세스 풀* 모델. 한 클라이언트 연결당 한 backend process. 부모(postmaster)가 fork.

```bash
$ pgrep -P $(pgrep postgres | head -1)
12346
12347
12348
...
```

특정 backend 디버깅.

```bash
$ sudo gdb -p 12347
```

또는 fork 시 자동 attach.

```text
(gdb) attach <postmaster_pid>
(gdb) set follow-fork-mode child
(gdb) set detach-on-fork off
(gdb) continue
[새 fork마다 inferior 추가]
```

이렇게 하면 *모든 새 backend*를 자동으로 추적. SQL 요청 별 정확한 디버깅 가능.

## Apache prefork

비슷한 패턴. parent process가 worker를 *prefork*. `mpm_prefork.c`의 `make_child` 함수에 BP를 걸어 새 worker가 fork될 때마다 정지.

## 컨테이너의 fork

자식이 *부모와 다른 PID namespace*면 (예: `unshare -p`) 자식의 PID가 `1`로 보임. 호스트에선 다른 PID. GDB는 보통 자동 처리하지만 일부 환경에서 *attach가 거부*될 수 있음 (`ptrace_scope` 또는 cap_sys_ptrace 부족).

```bash
$ sudo sysctl -w kernel.yama.ptrace_scope=0   # 임시 풀기
```

또는 docker run 시.

```bash
$ docker run --cap-add SYS_PTRACE ...
```

## fork 후 exec — Shell

`bash` → `ls` 같은 패턴.

```c
pid_t pid = fork();
if (pid == 0) {
    execvp("ls", argv);
    perror("exec");
    exit(1);
}
```

fork + exec 사이의 *그 순간* 디버깅 가능.

```text
(gdb) catch fork
(gdb) catch exec
(gdb) run
```

fork → 자식 새 inferior → exec 직전 catchpoint → 자식이 *새 바이너리*로 바뀜.

## detach-on-fork + non-stop

가장 정교한 패턴.

```text
(gdb) set non-stop on
(gdb) set detach-on-fork off
(gdb) attach <parent>
(gdb) c -a
[fork 발생, 자식 추가, 부모 계속 실행]
(gdb) interrupt 2     # 자식만 정지
(gdb) inferior 2
(gdb) bt
```

부모는 자유 실행, 자식만 정지·검사. 운영 서비스 디버깅의 *방해 최소* 패턴.

## 인페리어별 BP

```text
(gdb) break main inferior 2
```

`inferior 2` 컨텍스트에서만 BP. 같은 바이너리지만 *자식에서만* 정지.

## thread group ID vs process group ID

- *thread group ID* (TGID) = "프로세스" (사용자가 보는 PID).
- *process group ID* = 셸 job 그룹.

같은 TGID의 모든 LWP가 한 "프로세스". 다른 TGID지만 같은 PGID면 같은 셸 job.

GDB의 *인페리어*는 TGID 단위.

## process state 확인

```bash
$ cat /proc/12345/status | grep -E 'Pid|TracerPid'
Pid:    12345
TracerPid:      6789      # GDB가 attach
Tgid:   12345
```

`TracerPid`가 0 아니면 *디버거가 attach 중*. 한 프로세스에 *한 GDB만* attach 가능. 두 번째 시도는 `Operation not permitted`.

## strace와의 관계

`strace -f`로 fork를 따라가며 syscall trace.

```bash
$ strace -f -e trace=process ./my_prog
[pid 12345] fork()  = 12346
[pid 12346] execve("/bin/ls", ...) = 0
[pid 12346] exit_group(0)         = ?
```

GDB로 fork *지점*에 멈추는 것과 다름 — strace는 *모든 syscall 흐름*.

병행 사용 가능. strace로 *어떤 syscall이 일어나는지* 보고, 의심 지점에 GDB BP.

## seccomp + ptrace

seccomp 필터가 *디버거를 제한*할 수 있음. 컨테이너의 default seccomp가 `ptrace`를 차단하기도. `docker run --security-opt seccomp=unconfined` 등으로 풀기.

## fork bomb 진단

```text
(gdb) set follow-fork-mode child
(gdb) catch fork
(gdb) commands
> bt 5
> continue
> end
(gdb) run
[수많은 fork 위치 출력]
```

어디서 fork가 *제어 없이* 일어나는지 추적. 보통 *재귀적 fork* 또는 *에러 시 retry로 fork* 패턴.

## namespace-aware 디버깅

Docker·LXC·Podman 컨테이너에서.

```bash
# 컨테이너 안 PID
$ docker top <container> -o pid,comm
PID    COMMAND
1      /entrypoint
42     python3 app.py

# 호스트 PID
$ docker inspect -f '{{.State.Pid}}' <container>
12345    # entrypoint의 호스트 PID

# 호스트에서 attach (외부 PID로)
$ sudo gdb -p 12345
```

또는 컨테이너 안에 *gdbserver*를 띄우고 호스트에서 연결.

```bash
# 컨테이너 안
$ gdbserver :2345 --attach 42

# 호스트
$ gdb /path/to/binary
(gdb) target remote localhost:2345
```

## 정리

- `set follow-fork-mode child`로 자식 추적.
- `set detach-on-fork off`로 부모·자식 동시.
- `info inferiors` / `inferior N`로 전환.
- `catch fork`/`catch exec`로 자동 정지.
- 컨테이너는 호스트 PID로 attach, namespace 주의.
- Postgres·Apache 같은 *fork 모델*은 자동 attach.
- non-stop + detach-on-fork off가 *방해 최소* 패턴.
- `TracerPid`로 디버거 attach 중인지 확인.

## 다음 장 예고

Ch 4 — 데드락·race 진단 방법론. 실전 케이스 분석.

## 관련 항목

- [Ch 2: GDB 멀티스레드](/blog/tools/debugging/concurrency/chapter02-gdb-threads)
- [Ch 4: 데드락 / race 방법론](/blog/tools/debugging/concurrency/chapter04-deadlock-race-methodology)
- [GDB Multi-process](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Forks.html)
- `man 2 clone`, `man 2 fork`, `man 2 execve`
- [Docker security/ptrace](https://docs.docker.com/reference/cli/docker/container/run/#security-options)
