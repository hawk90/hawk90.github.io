---
title: "GDB vs LLDB 분석 — 두 디버거의 설치·차이·선택 기준"
slug: "tools/debugging/gdb-lldb/chapter01-intro-and-install"
date: 2026-05-24T09:01:00
description: "네이티브 디버거의 메커니즘, gdb·lldb 차이, 설치, 첫 세션."
tags: [gdb, lldb, Setup]
series: "GDB and LLDB"
seriesOrder: 1
draft: false
topics: ["tools", "tools/debugging"]
---

:::info[디버깅 시리즈 지도]
이 시리즈는 *GDB·LLDB의 일상 사용*을 다룹니다. 깊이 들어갈 때:

- [GDB 확장 & IDE](/blog/tools/debugging/gdb-extension/chapter01-python-api-basics) — Python API, pretty-printer, DAP
- [DWARF & ELF 내부](/blog/tools/debugging/dwarf-elf/chapter01-elf-overview) — 디버그 정보의 정체
- [Embedded](/blog/tools/debugging/embedded/chapter01-rsp-protocol) — RSP, JTAG/SWD, OpenOCD, J-Link
- Concurrency — 멀티스레드, rr, TSan
- [Postmortem](/blog/tools/debugging/postmortem/chapter01-core-generation) — core dump, debuginfod
- [Python 디버깅](/blog/tools/debugging/python/chapter01-pdb-basics) — pdb, debugpy, py-spy
- [Sanitizers](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan) · [Valgrind](/blog/tools/debugging/valgrind/chapter02-memcheck) — 자동 검출
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
// 성공 후 waitpid(pid, &status, 0)로 실제 정지를 확인
// 레지스터·메모리 읽기·쓰기 가능
ptrace(PTRACE_DETACH, pid, NULL, NULL);
```

GDB·LLDB 모두 *Linux에서는 `ptrace`*를 사용합니다. attach·wait·메모리 접근·재개를 결합하며 ptrace 한 번으로 전체 세션이 끝나지는 않습니다.

`ptrace`가 하는 일:
- 다른 프로세스의 *레지스터 읽기/쓰기*.
- *메모리 읽기/쓰기* (디버거가 변수를 보거나 변경).
- *시스템 호출 추적* (`strace`도 같은 메커니즘).
- *시그널 가로채기* (SIGSEGV 등을 디버거가 먼저 받음).

### macOS — `Mach` API

macOS는 `ptrace`가 *제한적*입니다. 대신 *Mach* 메시지를 통해 같은 일을 합니다. LLDB가 macOS에서 *사실상 표준*인 이유 — Apple이 Mach 기반으로 LLDB를 가장 잘 통합.

### Windows — `DebugActiveProcess`

Windows는 별도 debugging API와 target 지원 조합을 사용합니다. Windows target을 선택할 때는 GDB·LLDB의 해당 target 지원 범위와 Visual Studio debugger를 비교합니다.

이 시리즈는 *Linux와 macOS*에 집중합니다. Windows는 Visual Studio 디버거가 훨씬 잘 동작합니다.

---

## GDB와 LLDB — *같은 일, 다른 명령어*

두 도구는 *비슷한 기능*을 *다른 명령으로* 제공합니다. 핵심 차이는 다음과 같습니다.

| 측면 | GDB | LLDB |
|------|-----|------|
| 출신 | GNU 프로젝트 | LLVM 프로젝트 |
| 주 플랫폼 | Linux와 여러 Unix 계열 | macOS·iOS와 LLVM 생태계 (지원은 target별 확인) |
| 자주 쓰는 컴파일러 | GCC·Clang | Clang (둘 다 호환 가능한 조합이 많음) |
| Python 스크립트 | 매우 강력 | 강력 (다른 API) |
| 터미널 화면 | `gdb -tui` | LLDB CLI; IDE·별도 프런트엔드와 함께 사용 |
| 명령 스타일 | 짧고 관용적 (`b`, `n`, `s`) | 풀 명령 (`breakpoint set`) + alias |
| 원격 디버깅 | `gdbserver` | `lldb-server` |

### 자주 쓰는 명령 *대조표*

| 동작 | GDB | LLDB |
|------|-----|------|
| 시작 | `gdb ./prog` | `lldb ./prog` |
| 실행 | `run` (또는 `r`) | `run` (또는 `r`) |
| 다음 줄 (step over) | `next` (`n`) | `next` (`n`) |
| 함수 진입 (step into) | `step` (`s`) | `step` (`s`) |
| 현재 함수 반환까지 (스텝아웃) | `finish` | `finish` |
| 계속 실행 | `continue` (`c`) | `continue` (`c`) |
| Breakpoint 설정 | `break main` (`b main`) | `breakpoint set --name main` (또는 `b main`) |
| 변수 보기 | `print x` (`p x`) | `print x` (`p x`) |
| Backtrace | `backtrace` (`bt`) | `bt` |
| 종료 | `quit` (`q`) | `quit` (`q`) |

LLDB는 *풀 명령*이 길고 GDB와 비슷한 alias도 제공합니다. 명령 이름이 같아도 옵션·동작이 완전히 같다고 가정하지 말고 LLDB help와 command map으로 확인합니다.

### 어느 것을 쓸까

플랫폼이 가장 중요한 결정 요인.

- **Linux**: GDB와 LLDB 중 타깃·도구 호환성을 확인해 선택합니다. 두 도구는 주요 배포판에서 패키지로 제공되지만 기본 설치 여부는 배포판·이미지마다 다릅니다.
- **macOS (Apple Silicon)**: *LLDB*. Xcode와 같이 설치. Xcode 도구와 통합됩니다.
- **임베디드/크로스 컴파일**: GDB 또는 LLDB를 서버·아키텍처 지원과 함께 선택합니다. Debian 계열의 `gdb-multiarch`는 여러 아키텍처를 다룰 때 쓸 수 있는 한 선택지입니다.
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
# GDB는 별도 서명 설정이 필요할 수 있음; 자세한 조건은 macOS/Xcode 버전에 따라 확인
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

위 버전 출력은 형식 예이며 이번 검증 환경과 다릅니다. 실제로 사용하는 디버거·컴파일러·DWARF 버전을 기록하고 해당 라이브러리·타깃 지원을 확인합니다.

---

## 컴파일러 옵션 — *디버그 정보를 위한 준비*

디버거가 *변수 이름·줄 번호·타입 정보*를 보려면 *디버그 심볼*이 필요합니다.

```bash
gcc -g -O0 -fno-omit-frame-pointer main.c -o myapp
```

각 옵션:

- **`-g`** — *DWARF 디버그 정보 생성*. 변수, 함수, 타입, 줄 번호 모두 포함. *필수*.
- **`-O0`** — 최적화 *없음*. 최적화에 따른 변형을 줄입니다. 명령어·줄 매핑이 소스 문장과 일대일이라는 보장은 없습니다.
- **`-fno-omit-frame-pointer`** — 가능한 경우 프레임 포인터를 유지해 일부 환경에서 스택 조사에 도움을 줍니다. 정확한 backtrace는 unwind 정보·ABI·최적화와도 관련되며 이 옵션만으로 보장되지는 않습니다.

### 최적화 레벨과 디버깅

```bash
gcc -g -O0 myapp.c    # 디버깅 친화적. 가장 권장.
gcc -g -O1 myapp.c    # 일부 최적화. 보통 디버깅 가능.
gcc -g -O2 myapp.c    # 인라인 많음. 변수 사라짐.
gcc -g -Og myapp.c    # 디버깅용 최적화. 컴파일러의 지원 여부를 확인합니다.
```

**`-Og`**는 디버깅 친화적인 최적화를 선택하지만 변수 위치와 제어 흐름이 원본 그대로 보존되지는 않습니다. *릴리스에 가까운 행동*을 디버깅하고 싶을 때 좋습니다.

`-O2`에서는 변수가 *레지스터에 살아 사라지거나*, *루프가 합쳐지거나*, *조건문이 통째로 사라질* 수 있습니다. 디버거에서 `print x`했을 때 `<optimized out>` 메시지를 만나면 그 자리.

### 디버그 심볼 분리 — Linux ELF

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

```c title="hello.c"
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

### GDB 명령 순서

다음은 GDB에서 따라 할 입력이며 이 macOS 검증에서 GDB를 실행한 기록은 아닙니다. 주소·줄 번호가 섞인 가공 출력은 싣지 않습니다.

```text
(gdb) break factorial
(gdb) run
(gdb) print n
(gdb) backtrace
(gdb) disable 1
(gdb) finish
(gdb) continue
```

### LLDB 명령 순서

위 hello.c를 -g -O0로 빌드한 뒤 첫 factorial 진입에서 n=5와 호출자 main을 확인합니다. break를 비활성화한 뒤 계속하면 프로그램은 5! = 120을 출력합니다. 실행 파일 경로·주소·PID는 매 실행 달라집니다.

```text title="intro.lldb"
breakpoint set --name factorial
run
frame variable n
thread backtrace
breakpoint disable 1
continue
```

## 자주 만나는 첫 문제

### "No symbol table is loaded"

```text
(gdb) break main
No symbol table is loaded.  Use the "file" command.
```

실행 파일이 로드되지 않았거나 디버그 심볼을 찾지 못했는지 확인합니다. -g 없이 빌드한 파일도 main 같은 일반 심볼은 남을 수 있어 두 상황은 구분해야 합니다.

해결:
```bash
gcc -g hello.c -o hello
```

### "Cannot find bounds of current function"

원인: 디버그 정보 부분 손상 또는 `-O2` 이상에서 함수 인라인.

해결: `-O0` 또는 `-Og`로 재컴파일.

### macOS GDB의 "unable to find Mach task port"

```text
$ gdb ./hello
(gdb) run
Unable to find Mach task port for process-id...
```

원인: macOS 코드 사이닝 누락.

해결: 위에서 본 GDB 사이닝 절차. 또는 LLDB로 전환.

### "Operation not permitted"

```text
$ gdb -p 12345
ptrace: Operation not permitted.
```

원인: Linux의 `ptrace_scope` 보안 설정.

확인: 같은 사용자·PID namespace·dumpable·ptrace 정책·컨테이너 권한을 먼저 조사합니다. 프로젝트에서 직접 실행한 자식 프로세스를 디버깅하는 방법을 우선 사용하며, 이 문제만으로 호스트 전체 ptrace_scope를 영구 완화하지 않습니다.

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
| **Ch 12** | DWARF와 심볼·소스 매핑 진단 |

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

## 관련 항목

- [Ch 2: 기본 명령 — 10가지](/blog/tools/debugging/gdb-lldb/chapter02-basic-commands) — 다음 장, 매일 쓰는 명령
- [Ch 11: 실무 팁](/blog/tools/debugging/gdb-lldb/chapter11-practical-tips) — `.gdbinit`으로 설치 이후 환경 굳히기
- [ELF 포맷 분해](/blog/tools/debugging/dwarf-elf/chapter01-elf-overview) — `-g`가 만들어 넣는 디버그 섹션의 정체
- [ASan과 UBSan 실전 설정](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan) — 같은 디버그 빌드에 얹는 자동 검출
- [GDB 공식 매뉴얼](https://sourceware.org/gdb/current/onlinedocs/gdb.html) — 명령·옵션의 정본
