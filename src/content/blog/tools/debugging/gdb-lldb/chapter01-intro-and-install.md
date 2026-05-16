---
title: "Ch 1: 디버거란 / 설치 / GDB vs LLDB"
date: 2025-08-20T01:00:00
description: "네이티브 디버거의 메커니즘, gdb·lldb 차이, 설치, 첫 세션."
tags: [gdb, lldb, Setup]
series: "GDB and LLDB"
seriesOrder: 1
draft: false
---

:::info[디버깅 시리즈 지도]
이 시리즈는 *GDB·LLDB의 일상 사용*을 다룹니다. 깊이 들어갈 때:

- [GDB 확장 & IDE](/blog/tools/debugging/gdb-extension/chapter01-python-api-basics) — Python API, pretty-printer, DAP
- [DWARF & ELF 내부](/blog/tools/debugging/dwarf-elf/chapter01-elf-overview) — 디버그 정보의 정체
- [Embedded](/blog/tools/debugging/embedded/chapter01-rsp-protocol) — RSP, JTAG/SWD, OpenOCD, J-Link
- [Concurrency](/blog/tools/debugging/concurrency/chapter01-linux-threads-futex) — 멀티스레드, rr, TSan
- [Postmortem](/blog/tools/debugging/postmortem/chapter01-core-generation) — core dump, debuginfod
- [Python 디버깅](/blog/tools/debugging/python/chapter01-pdb-basics) — pdb, debugpy, py-spy
- [Sanitizers](/blog/tools/debugging/sanitizers/chapter01-asan) · [Valgrind](/blog/tools/debugging/valgrind/chapter01-memcheck) — 자동 검출
- [Memory 진단](/blog/tools/debugging/memory/chapter01-memory-accounting) — heap profiler, OOM
- [Kernel 디버깅](/blog/tools/debugging/kernel/chapter01-user-kernel-boundary) — kdb/kgdb, crash, drgn
:::

## 디버거가 *실제로 하는 일*

C/C++ 프로그램을 작성하다 보면 *예상과 다르게 죽거나* *의도와 다르게 도는* 일을 매번 만납니다. `printf`로 잡을 수도 있지만:

- 죽는 자리를 *모를 때*는 `printf`를 어디에 넣어야 하나
- 미묘한 버그는 `printf`가 *동작을 바꿔* 사라질 수 있음 (Heisenbug)
- 변수가 *언제 변하는지* `printf`로는 안 보임

**디버거**는 이 모든 문제를 푸는 도구입니다. 프로그램을 *중간에 멈추고*, *변수를 들여다보고*, *원하는 시점부터 한 줄씩 실행*합니다.

핵심 기능 다섯 가지로 줄이면:

1. **Breakpoint** — 특정 자리에 멈춤.
2. **Step** — 한 줄(또는 명령어)씩 진행.
3. **Inspect** — 변수, 메모리, 레지스터 보기.
4. **Backtrace** — *지금 어디까지 와서 멈췄는지* 호출 사슬.
5. **Modify** — 변수 값을 *디버거에서 직접 바꿔* 가설 검증.

이 다섯 기능 위에 *Watchpoint, Conditional break, Reverse exec, Remote, TUI, Python script* 같은 고급 기능이 얹혀 있습니다.

---

## 어떻게 멈추는가 — `ptrace`와 친구들

디버거가 다른 프로세스를 *멈추고 조사*할 수 있는 것은 *운영체제가 그런 API*를 제공하기 때문입니다.

### Linux — `ptrace`

```c
#include <sys/ptrace.h>

ptrace(PTRACE_ATTACH, pid, NULL, NULL);
// 이제 pid 프로세스가 STOPPED 상태
// 레지스터·메모리 읽기·쓰기 가능
ptrace(PTRACE_DETACH, pid, NULL, NULL);
```

GDB·LLDB 모두 *Linux에서는 `ptrace`*를 사용합니다. 이 한 시스템 콜이 *디버거의 모든 마법*의 근간.

`ptrace`가 하는 일:
- 다른 프로세스의 *레지스터 읽기/쓰기*.
- *메모리 읽기/쓰기* (디버거가 변수를 보거나 변경).
- *시스템 호출 추적* (`strace`도 같은 메커니즘).
- *시그널 가로채기* (SIGSEGV 등을 디버거가 먼저 받음).

### macOS — `Mach` API

macOS는 `ptrace`가 *제한적*입니다. 대신 *Mach* 메시지를 통해 같은 일을 합니다. LLDB가 macOS에서 *사실상 표준*인 이유 — Apple이 Mach 기반으로 LLDB를 가장 잘 통합.

### Windows — `DebugActiveProcess`

Windows는 또 다른 API. GDB·LLDB의 Windows 포트가 *완벽하지 않은* 이유.

이 시리즈는 *Linux와 macOS*에 집중합니다. Windows는 Visual Studio 디버거가 훨씬 잘 동작합니다.

---

## GDB와 LLDB — *같은 일, 다른 명령어*

두 도구는 *비슷한 기능*을 *다른 명령으로* 제공합니다. 핵심 차이는 다음과 같습니다.

| 측면 | GDB | LLDB |
|------|-----|------|
| 출신 | GNU 프로젝트 (1986) | LLVM 프로젝트 (2007) |
| 주 플랫폼 | Linux, *대부분의 Unix* | macOS, *iOS* |
| 기본 컴파일러 | GCC | Clang (둘 다 호환) |
| Python 스크립트 | 매우 강력 | 강력 (다른 API) |
| TUI | `gdb -tui` | `lldb`의 *내장 GUI* |
| 명령 스타일 | 짧고 관용적 (`b`, `n`, `s`) | 풀 명령 (`breakpoint set`) + alias |
| 원격 디버깅 | `gdbserver` | `lldb-server` |

### 자주 쓰는 명령 *대조표*

| 동작 | GDB | LLDB |
|------|-----|------|
| 시작 | `gdb ./prog` | `lldb ./prog` |
| 실행 | `run` (또는 `r`) | `run` (또는 `r`) |
| 다음 줄 (step over) | `next` (`n`) | `next` (`n`) |
| 함수 진입 (step into) | `step` (`s`) | `step` (`s`) |
| 한 줄 실행 (스텝아웃) | `finish` | `finish` |
| 계속 실행 | `continue` (`c`) | `continue` (`c`) |
| Breakpoint 설정 | `break main` (`b main`) | `breakpoint set --name main` (또는 `b main`) |
| 변수 보기 | `print x` (`p x`) | `print x` (`p x`) |
| Backtrace | `backtrace` (`bt`) | `bt` |
| 종료 | `quit` (`q`) | `quit` (`q`) |

LLDB는 *풀 명령*이 길지만 *alias*가 거의 모든 GDB 명령에 대응합니다. *GDB 사용자가 LLDB로 옮겨도* 큰 학습 비용 없이 적응 가능.

### 어느 것을 쓸까

플랫폼이 가장 중요한 결정 요인.

- **Linux**: *GDB*. 모든 배포판에 기본 설치. 대부분의 도구가 GDB와 통합 (perf, valgrind --vgdb 등).
- **macOS (Apple Silicon)**: *LLDB*. Xcode와 같이 설치. *공식 지원되는 유일한 디버거*.
- **임베디드/크로스 컴파일**: *GDB*. `gdb-multiarch`로 다양한 아키텍처 지원.
- **iOS / Swift**: *LLDB*. Apple이 만든 거라 통합 최강.

크로스 플랫폼 코드에서는 *둘 다* 알아 두는 게 좋습니다. 이 시리즈는 *두 도구 병행 학습*으로 진행합니다 — 명령어를 GDB/LLDB 양쪽으로 같이 보여 줍니다.

---

## 설치

### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install gdb        # GDB
sudo apt install lldb       # LLDB (선택)
```

### Linux (Fedora/RHEL)

```bash
sudo dnf install gdb
sudo dnf install lldb
```

### macOS

```bash
# LLDB — Xcode Command Line Tools에 포함
xcode-select --install

# GDB — 별도 설치, 더 복잡 (코드 사이닝 필요)
brew install gdb
```

macOS에서 GDB를 쓰려면 *코드 사이닝*이 필요합니다. Apple의 보안 정책이 디버거 권한을 제한하기 때문. Homebrew brew 설치 후:

```bash
# 사이닝 (LLDB는 자동, GDB만 수동)
# 자세한 절차는 https://sourceware.org/gdb/wiki/PermissionsDarwin
```

복잡합니다. *macOS는 LLDB*가 사실상 답.

### 크로스 컴파일

```bash
# ARM 타겟
sudo apt install gdb-multiarch

# 사용
gdb-multiarch ./arm-binary
(gdb) set architecture arm
(gdb) target remote :1234   # gdbserver 연결
```

[Ch 8: Remote Debugging](/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging)에서 자세히.

### 버전 확인

```bash
$ gdb --version
GNU gdb (Ubuntu 12.1-0ubuntu1~22.04) 12.1

$ lldb --version
lldb version 15.0.7
```

*GDB 10+, LLDB 13+*가 권장. 이전 버전은 *현대 컴파일러의 디버그 정보* (DWARF 5)를 못 읽을 수 있음.

---

## 컴파일러 옵션 — *디버그 정보를 위한 준비*

디버거가 *변수 이름·줄 번호·타입 정보*를 보려면 *디버그 심볼*이 필요합니다.

```bash
gcc -g -O0 -fno-omit-frame-pointer main.c -o myapp
```

각 옵션:

- **`-g`** — *DWARF 디버그 정보 생성*. 변수, 함수, 타입, 줄 번호 모두 포함. *필수*.
- **`-O0`** — 최적화 *없음*. 컴파일러가 코드를 변형하지 않아 *소스 그대로* 추적 가능.
- **`-fno-omit-frame-pointer`** — *스택 프레임 포인터 유지*. backtrace 정확도.

### 최적화 레벨과 디버깅

```bash
gcc -g -O0 myapp.c    # 디버깅 친화적. 가장 권장.
gcc -g -O1 myapp.c    # 일부 최적화. 보통 디버깅 가능.
gcc -g -O2 myapp.c    # 인라인 많음. 변수 사라짐.
gcc -g -Og myapp.c    # 디버깅용 최적화. GCC 4.8+ 권장.
```

**`-Og`**는 *디버깅을 깨지 않는 선*에서 최적화합니다. *릴리스에 가까운 행동*을 디버깅하고 싶을 때 좋습니다.

`-O2`에서는 변수가 *레지스터에 살아 사라지거나*, *루프가 합쳐지거나*, *조건문이 통째로 사라질* 수 있습니다. 디버거에서 `print x`했을 때 `<optimized out>` 메시지를 만나면 그 자리.

### 디버그 심볼 분리

릴리스 바이너리에는 디버그 심볼을 *제거*하지만, *나중에 디버깅용*으로 따로 보관합니다.

```bash
# 1. 디버그 빌드
gcc -g -O2 main.c -o myapp

# 2. 심볼만 추출
objcopy --only-keep-debug myapp myapp.debug

# 3. 본 바이너리에서 제거
strip myapp

# 4. 심볼 위치 link
objcopy --add-gnu-debuglink=myapp.debug myapp
```

배포는 `myapp` (작음), 서버 충돌 시는 `myapp.debug`로 *symbol 매칭*. Linux 배포판이 `-dbgsym` 패키지로 분리 제공하는 게 이 방식.

---

## 첫 세션 — *간단한 프로그램 디버깅*

```c
// hello.c
#include <stdio.h>

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    int n = 5;
    int result = factorial(n);
    printf("%d! = %d\n", n, result);
    return 0;
}
```

```bash
$ gcc -g -O0 hello.c -o hello
```

### GDB 세션

```
$ gdb ./hello
GNU gdb (Ubuntu 12.1-0ubuntu1~22.04) 12.1
...
Reading symbols from ./hello...

(gdb) break main
Breakpoint 1 at 0x114e: file hello.c, line 8.

(gdb) run
Starting program: /tmp/hello
Breakpoint 1, main () at hello.c:8
8       int n = 5;

(gdb) next
9       int result = factorial(n);

(gdb) print n
$1 = 5

(gdb) step
factorial (n=5) at hello.c:4
4       if (n <= 1) return 1;

(gdb) backtrace
#0  factorial (n=5) at hello.c:4
#1  0x000055555555515f in main () at hello.c:9

(gdb) finish
Run till exit from #0  factorial (n=5) at hello.c:4
0x000055555555515f in main () at hello.c:9
9       int result = factorial(n);
Value returned is $2 = 120

(gdb) continue
Continuing.
5! = 120
[Inferior 1 (process 12345) exited normally]

(gdb) quit
```

### LLDB 세션

```
$ lldb ./hello
(lldb) target create "./hello"
Current executable set to '/tmp/hello' (x86_64).

(lldb) breakpoint set --name main
Breakpoint 1: where = hello`main + 4 at hello.c:8, address = 0x114e

(lldb) run
Process 12345 launched: '/tmp/hello' (x86_64)
Process 12345 stopped
* thread #1, queue = 'com.apple.main-thread', stop reason = breakpoint 1.1
    frame #0: 0x55555555514e hello`main at hello.c:8
   5      }
   6
   7      int main() {
-> 8          int n = 5;
   9          int result = factorial(n);

(lldb) next
* thread #1, stop reason = step over
    frame #0: hello`main at hello.c:9

(lldb) print n
(int) $0 = 5

(lldb) step
* thread #1, stop reason = step in
    frame #0: hello`factorial(n=5) at hello.c:4

(lldb) bt
* thread #1, queue = 'com.apple.main-thread'
  * frame #0: hello`factorial(n=5) at hello.c:4
    frame #1: hello`main at hello.c:9

(lldb) finish
* thread #1, stop reason = step out
    frame #0: hello`main at hello.c:9
Return value: (int) $1 = 120

(lldb) continue
Process 12345 resuming
5! = 120
Process 12345 exited with status = 0

(lldb) quit
```

같은 시나리오를 *두 디버거로* 따라갔습니다. 명령은 *거의 동일*하고, 출력 형식만 조금 다릅니다.

---

## 자주 만나는 첫 문제

### "No symbol table is loaded"

```
(gdb) break main
No symbol table is loaded.  Use the "file" command.
```

원인: `-g` 옵션 없이 컴파일.

해결:
```bash
gcc -g hello.c -o hello
```

### "Cannot find bounds of current function"

원인: 디버그 정보 부분 손상 또는 `-O2` 이상에서 함수 인라인.

해결: `-O0` 또는 `-Og`로 재컴파일.

### macOS GDB의 "unable to find Mach task port"

```
$ gdb ./hello
(gdb) run
Unable to find Mach task port for process-id...
```

원인: macOS 코드 사이닝 누락.

해결: 위에서 본 GDB 사이닝 절차. 또는 LLDB로 전환.

### "Operation not permitted"

```
$ gdb -p 12345
ptrace: Operation not permitted.
```

원인: Linux의 `ptrace_scope` 보안 설정.

해결:
```bash
# 임시
echo 0 | sudo tee /proc/sys/kernel/yama/ptrace_scope

# 영구 (root 권한 필요)
echo 'kernel.yama.ptrace_scope = 0' | sudo tee -a /etc/sysctl.conf
```

---

## 시리즈 로드맵

| 장 | 주제 |
|----|------|
| **Ch 1** | 개요·설치·첫 세션 (이 글) |
| **Ch 2** | 기본 명령 — break / step / next / continue / print |
| **Ch 3** | 상태 들여다보기 — 변수·메모리·레지스터·STL |
| **Ch 4** | Backtrace와 프레임 이동 |
| **Ch 5** | Breakpoint·Watchpoint — 조건부, 임시, hardware |
| **Ch 6** | 멀티스레드·멀티프로세스 |
| **Ch 7** | Core dump 분석 |
| **Ch 8** | 원격 디버깅 — gdbserver / lldb-server |
| **Ch 9** | Python 스크립팅 |
| **Ch 10** | TUI와 GUI 프론트엔드 |
| **Ch 11** | 실무 팁 — `.gdbinit`, signal, watchpoint 함정 |

---

## 정리

- *디버거*는 프로그램을 *멈추고 조사*하는 도구. `ptrace`(Linux) / `Mach`(macOS) 기반.
- *GDB*는 Linux/Unix, *LLDB*는 macOS/iOS 주력. 명령은 *거의 동일*.
- 컴파일: `-g`(디버그 심볼) + `-O0` 또는 `-Og`(디버깅 친화 최적화).
- 첫 세션: `break main` → `run` → `next` / `step` → `print` → `bt` → `continue`.
- macOS에서 GDB는 *복잡* — LLDB 권장.

## 다음 장 예고

[Ch 2: 기본 명령](/blog/tools/debugging/gdb-lldb/chapter02-basic-commands)에서는 *디버거에서 매일 쓰는 명령 10개*를 자세히 다룹니다. `break`의 다양한 형태, `step` vs `next` vs `finish` 차이, `print` 포맷.

## 참고 자료

- [GDB Documentation](https://www.gnu.org/software/gdb/documentation/)
- [LLDB Tutorial](https://lldb.llvm.org/use/tutorial.html)
- [GDB to LLDB Command Map](https://lldb.llvm.org/use/map.html) — 명령 대조표
- [DWARF Debugging Standard](http://dwarfstd.org/)
