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

C/C++ 프로그램을 작성하다 보면 *예상과 다르게 죽거나* *의도와 다르게 도는* 일을 매번 만납니다. `printf`로 잡을 수도 있지만 한계가 분명합니다.

- 죽는 자리를 *모르면* `printf`를 어디에 넣을지부터 정할 수 없습니다.
- `printf`를 넣으려면 다시 빌드하고 다시 실행해야 합니다. 재현에 한 시간이 걸리는 버그라면 그 비용을 매번 냅니다.
- 변수가 *언제 변하는지*는 출력문을 넣은 자리에서만 보입니다.

**디버거**는 이 문제를 다른 방식으로 풉니다. 프로그램을 *중간에 멈추고*, *변수를 들여다보고*, *원하는 시점부터 한 줄씩 실행*합니다. 비유하자면 `printf`는 길목마다 CCTV를 미리 달아 두는 일이고, 디버거는 영상을 일시정지하고 그 순간의 장면을 마음대로 확대해 보는 일입니다.

핵심 기능을 다섯 가지로 줄이면 다음과 같습니다.

1. **Breakpoint** — 특정 자리에 멈춥니다.
2. **Step** — 한 줄(또는 기계어 명령 하나)씩 진행합니다.
3. **Inspect** — 변수, 메모리, 레지스터를 봅니다.
4. **Backtrace** — *지금 어디까지 와서 멈췄는지* 호출 사슬을 봅니다.
5. **Modify** — 변수 값을 *디버거에서 직접 바꿔* 가설을 검증합니다.

이 다섯 기능 위에 *Watchpoint, Conditional break, Reverse exec, Remote, TUI, Python script* 같은 고급 기능이 얹혀 있고, 이 시리즈의 뒤쪽 장들이 하나씩 다룹니다.

---

## 어떻게 멈추는가 — `ptrace`와 친구들

디버거가 다른 프로세스를 *멈추고 조사*할 수 있는 것은 *운영체제가 그런 API*를 제공하기 때문입니다. 디버거는 운영체제에게 "저 프로세스의 열쇠를 잠시 빌려 달라"고 요청하는 프로그램이고, 열쇠를 내줄지는 운영체제의 권한 정책이 정합니다.

### Linux — `ptrace`

```c
#include <sys/ptrace.h>

ptrace(PTRACE_ATTACH, pid, NULL, NULL);
// 성공 후 waitpid(pid, &status, 0)로 실제 정지를 확인
// 레지스터·메모리 읽기·쓰기 가능
ptrace(PTRACE_DETACH, pid, NULL, NULL);
```

GDB와 LLDB 모두 Linux에서는 `ptrace`로 대상 프로세스를 다룹니다. [ptrace(2)](https://man7.org/linux/man-pages/man2/ptrace.2.html)가 제공하는 일은 다음과 같습니다.

- 다른 프로세스의 *레지스터 읽기/쓰기* (`PTRACE_GETREGSET`·`PTRACE_SETREGSET`)
- *메모리 읽기/쓰기* (`PTRACE_PEEKDATA`·`PTRACE_POKEDATA`, 디버거가 변수를 보거나 바꿀 때)
- *시스템 호출 추적* (`PTRACE_SYSCALL`, ptrace(2)가 tracer의 예로 드는 `strace(1)`도 같은 메커니즘)
- *시그널 가로채기* (SIGSEGV 같은 시그널이 대상보다 디버거에 먼저 보고됨)

열쇠를 빌려주는 정책은 Yama LSM의 `/proc/sys/kernel/yama/ptrace_scope`가 정합니다. 이 글의 Debian 13 arm64 VM(커널 6.12.116)에서 기본값은 `0`이었고, 값을 `1`로 올리면 같은 사용자의 프로세스라도 *자식이 아니면* attach가 거부됩니다. 아래는 `dev` 사용자가 띄운 `sleep`에 같은 `dev` 사용자로 붙어 본 결과입니다.

```text
# echo 1 > /proc/sys/kernel/yama/ptrace_scope
# su dev -c "gdb -q -batch -p 3309"
ptrace: Operation not permitted.
# echo 0 > /proc/sys/kernel/yama/ptrace_scope
# su dev -c "gdb -q -batch -p 3309 -ex 'info inferiors'"
...
  Num  Description       Connection           Executable
* 1    process 3309      1 (native)           /usr/bin/sleep
```

### macOS — `debugserver`와 Mach

macOS의 LLDB는 대상 프로세스를 직접 붙잡지 않고, Xcode에 들어 있는 `debugserver`라는 별도 프로세스를 띄워 그 프로세스가 대상을 실행·제어하게 합니다. macOS 27.2.1, Xcode의 `lldb-2103.0.34.407`로 `hello`를 breakpoint에 세워 둔 채 `ps`를 찍으면 부모 관계가 그대로 보입니다.

```text
$ ps -axo pid,ppid,comm | grep -E 'debugserver|lldb|hello'
97058     1 /Applications/Xcode.app/Contents/Developer/usr/bin/lldb
97338 97339 .../mac/ch01/hello
97339 97058 /Applications/Xcode.app/Contents/SharedFrameworks/LLDB.framework/Resources/debugserver
```

`hello`의 부모(PPID 97339)는 `lldb`가 아니라 `debugserver`입니다. `hello` 경로는 `...`로 줄였습니다. 같은 세션에 `log enable -f gdbremote.log gdb-remote packets`를 켜 두면 LLDB가 `debugserver`와 주고받는 패킷이 남는데, 앞부분에 `$QStartNoAckMode#b0` 같은 GDB Remote Serial Protocol 패킷입니다. 로컬 디버깅도 내부적으로는 [Ch 8](/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging)의 원격 디버깅과 같은 구조로 돕니다.

### Windows

이 시리즈는 *Linux와 macOS*만 다루고, Windows에서는 어떤 디버거도 실행하지 않았습니다. Windows 쪽 API와 도구 비교는 이 시리즈 범위 밖입니다.

---

## GDB와 LLDB — *같은 일, 다른 명령어*

두 도구는 *비슷한 기능*을 *다른 명령 체계로* 제공합니다. 이 글에서 직접 확인한 차이는 다음과 같습니다.

| 측면 | GDB | LLDB |
|------|-----|------|
| 출신 | GNU 프로젝트 | LLVM 프로젝트 |
| 이 글에서 쓴 판 | Debian 13의 GDB 16.3 | Debian 13의 lldb 19.1.7, macOS의 Xcode lldb-2103.0.34.407 |
| Python 확장 | `python` 명령과 `gdb` 모듈 ([Ch 9](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting)) | `script` 명령과 `lldb` 모듈 (API가 다름) |
| 터미널 화면 | `gdb --tui` (`gdb --help`에 `Use a terminal user interface.`) | `gui` 명령 (`help gui`: `Switch into the curses based GUI mode.`) |
| 명령 스타일 | 짧은 이름과 접두어 약어 (`b`, `n`, `s`) | `명사 동사` 풀 명령 (`breakpoint set`) + 약어 alias |
| 원격 디버깅 | `gdbserver` | `lldb-server`, macOS는 `debugserver` |

### 자주 쓰는 명령 *대조표*

아래 표의 LLDB 이름은 모두 *풀 명령의 alias*입니다. 아래 표의 오른쪽 열은 LLDB의 `help <명령>`이 출력한 `'<명령>' is an abbreviation for '...'` 문장을 옮긴 것이고, GDB 열의 약어는 GDB 16.3의 `help <약어>` 첫 줄(`next, n` 같은 형식)에서 확인했습니다.

| 동작 | GDB | LLDB | LLDB가 펼치는 풀 명령 |
|------|-----|------|----------------------|
| 시작 | `gdb ./prog` | `lldb ./prog` | — |
| 실행 | `run` (`r`) | `run` (`r`) | `process launch -X true --` (macOS), `process launch -c /bin/bash --` (Linux) |
| 다음 줄 (step over) | `next` (`n`) | `next` (`n`) | `thread step-over` |
| 함수 진입 (step into) | `step` (`s`) | `step` (`s`) | `thread step-in` |
| 현재 함수 반환까지 | `finish` (`fin`) | `finish` | `thread step-out` |
| 계속 실행 | `continue` (`c`) | `continue` (`c`) | `process continue` |
| Breakpoint 설정 | `break main` (`b main`) | `breakpoint set --name main` 또는 `b main` | `b` → `_regexp-break` |
| 변수 보기 | `print x` (`p x`) | `print x` (`p x`) | `dwim-print --` |
| Backtrace | `backtrace` (`bt`, `where`) | `bt` | `_regexp-bt` |
| 종료 | `quit` (`q`) | `quit` (`q`) | `q` → `quit` |

`run`의 확장이 두 LLDB에서 다른 점이 눈에 띕니다. 같은 이름이라도 판과 플랫폼에 따라 뒤에서 도는 명령이 다르므로, 스크립트에 넣을 때는 `help`로 펼쳐 보고 풀 명령을 씁니다.

### 어느 것을 쓸까

플랫폼이 가장 큰 결정 요인입니다.

- **Linux**: 이 시리즈의 Linux 실습은 모두 GDB 16.3으로 했고, 같은 VM에 `apt install lldb`로 lldb 19.1.7을 깔아 LLDB 쪽 동작도 비교했습니다.
- **macOS (Apple Silicon)**: *LLDB*를 씁니다. Xcode 또는 Command Line Tools에 들어 있고, 위에서 본 것처럼 `debugserver`가 함께 옵니다. GDB가 안 되는 이유는 바로 아래 설치 절에서 소스로 확인합니다.
- **임베디드/크로스 컴파일**: 이 시리즈는 GDB와 `gdb-multiarch` 기준으로 설명합니다([Ch 8](/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging)).
- **iOS / Swift**: 이 시리즈에서 iOS 기기와 Swift는 다루지 않았습니다.

크로스 플랫폼 코드를 다룬다면 둘 다 알아 두는 편이 낫습니다. 이 시리즈는 명령어를 GDB/LLDB 양쪽으로 같이 보여 줍니다.

---

## 설치

### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install gdb        # GDB
sudo apt install lldb       # LLDB (선택)
```

이 글의 Debian 13(trixie) arm64 VM에서는 위 명령으로 `gdb 16.3-1`과 `lldb 1:19.0-63`(실행 파일은 `lldb version 19.1.7`)이 설치됐습니다.

### macOS

```bash
# LLDB — Xcode Command Line Tools에 포함
xcode-select --install
```

이 Mac에는 Command Line Tools가 깔려 있어 `/Library/Developer/CommandLineTools/usr/bin/lldb`가 있고, `xcode-select -p`가 가리키는 Xcode(`/Applications/Xcode.app/Contents/Developer`)의 lldb가 이 시리즈의 macOS 세션에 쓰였습니다.

Homebrew에는 GDB 패키지가 있습니다. 이 글의 Apple Silicon Mac에서 `brew info gdb`를 실행하면 18.1 판과 함께 서명 경고가 나옵니다.

```text
==> gdb: stable 18.1 (bottled), HEAD
GNU debugger
...
==> Caveats
gdb requires special privileges to access Mach ports.
You will need to codesign the binary. For instructions, see:

  https://sourceware.org/gdb/wiki/PermissionsDarwin
```

서명보다 먼저 막히는 문제가 있습니다. GDB 소스의 `gdb/configure.nat`은 모든 Darwin 호스트에 공통 파일(`darwin-nat.o darwin-nat-info.o`)을 붙이지만, CPU별 네이티브 파일(`i386-darwin-nat.o` 등)은 `gdb_host_cpu`가 `i386`(x86 계열)일 때만 붙고 aarch64용 항목은 없습니다. GDB 16.3과 18.1 소스 모두 같은 구조입니다.

```text
    darwin)
	case ${gdb_host_cpu} in
	    i386)
		# Host: IA86 running Darwin
		NATDEPFILES="${NATDEPFILES} i386-darwin-nat.o x86-nat.o \
		    nat/x86-dregs.o amd64-nat.o"
		;;
	esac
```

그래서 Apple Silicon Mac에서 로컬 프로세스를 디버깅하려면 LLDB를 씁니다. 이 시리즈는 macOS에 GDB를 설치하지 않았고, GDB 실습은 모두 Debian VM에서 했습니다.

### 크로스 컴파일

ARM 타깃처럼 호스트와 다른 아키텍처를 다룰 때는 여러 아키텍처를 한 바이너리에 담은 `gdb-multiarch`를 씁니다.

```bash
# ARM 타깃
sudo apt install gdb-multiarch

# 사용
gdb-multiarch ./arm-binary
(gdb) set architecture arm
(gdb) target remote :1234   # gdbserver 연결
```

[Ch 8: Remote Debugging](/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging)에서 실제 연결 세션과 함께 다룹니다.

### 버전 확인

이 시리즈의 출력은 아래 판에서 나왔습니다.

```text
# gdb --version | head -1
GNU gdb (Debian 16.3-1) 16.3
# lldb --version
lldb version 19.1.7
# gcc --version | head -1
gcc (Debian 14.2.0-19) 14.2.0

$ lldb --version          # macOS 27.2.1, Apple Silicon
lldb-2103.0.34.407
```

---

## 컴파일러 옵션 — *디버그 정보를 위한 준비*

디버거가 *변수 이름·줄 번호·타입 정보*를 보려면 *디버그 정보*가 필요합니다. 지도 없이 낯선 도시에서 주소만 들고 헤매는 상황을 떠올리면 됩니다. 기계어만 있는 실행 파일에서 디버거가 보는 것은 주소뿐이고, 디버그 정보가 그 주소를 "hello.c 5번째 줄, 변수 `n`"으로 번역하는 지도입니다.

```bash
gcc -g -O0 -fno-omit-frame-pointer main.c -o myapp
```

각 옵션은 다음 역할을 합니다.

- **`-g`** — *DWARF 디버그 정보*를 생성합니다. 변수, 함수, 타입, 줄 번호가 들어갑니다([Ch 12](/blog/tools/debugging/gdb-lldb/chapter12-dwarf)).
- **`-O0`** — 최적화를 끕니다. GCC 매뉴얼은 "make debugging produce the expected results. This is the default."라고 적고 있으며, 아래 표처럼 인자가 entry value 표기 없이 그대로 보입니다.
- **`-fno-omit-frame-pointer`** — 프레임 포인터 레지스터(arm64의 `x29`)를 유지합니다. GDB는 DWARF의 CFI(`.eh_frame`)로도 스택을 풉니다. 같은 `hello.c`를 `-g -O0 -fomit-frame-pointer`로 빌드해 `break factorial if n==2`에서 멈춰도 `bt`가 `factorial (n=2)`부터 `main ()`까지 다섯 프레임을 모두 보여 줬습니다.

### 최적화 레벨과 디버깅

최적화 레벨이 디버깅에 주는 영향은 말로 듣는 것보다 직접 보는 편이 빠릅니다. 아래 `hello.c`를 네 레벨로 빌드하고 `break factorial` → `run` → `print n`을 같은 순서로 실행했습니다.

| 빌드 | `break factorial` 결과 | `print n` |
|------|------------------------|-----------|
| `-g -O0` | `Breakpoint 1, factorial (n=5) at hello.c:5` | `$1 = 5` |
| `-g -Og` | `Breakpoint 1, factorial (n=n@entry=5) at hello.c:5` | `$1 = 5` |
| `-g -O1` | `Breakpoint 1, factorial (n=n@entry=5) at hello.c:5` | `$1 = 5` |
| `-g -O2` | 한 번도 멈추지 않고 `5! = 120` 출력 후 종료 | `No symbol "n" in current context.` |

`-O2`에서 breakpoint가 걸리지 않은 이유는 `main`의 디스어셈블리에 있습니다. GCC 14.2가 `factorial(5)`를 컴파일 시간에 계산해 상수 120을 `printf`에 바로 넘겼고, `factorial` 함수 본체는 바이너리에 남아 있지만 아무도 부르지 않습니다.

```text
0000000000000680 <main>:
 680:	stp	x29, x30, [sp, #-16]!
 684:	mov	w2, #0x78                  	// #120
 688:	mov	w1, #0x5                   	// #5
 68c:	mov	x29, sp
 690:	adrp	x0, 0 <_init-0x5d0>
 694:	add	x0, x0, #0x848
 698:	bl	650 <printf@plt>
```

**`-Og`**에 대해 [GCC 14.2 매뉴얼(Optimize Options)](https://gcc.gnu.org/onlinedocs/gcc-14.2.0/gcc/Optimize-Options.html)은 "Optimize debugging experience"라고 설명하고, `-O1`의 최적화 중 디버깅을 방해하는 것을 뺀 묶음이라고 적습니다. 위 표에서 `-Og`와 `-O1`이 `n=n@entry=5`로 표시된 것은 GDB가 DWARF의 entry value 정보를 써서 "함수에 들어올 때의 n 값"이라고 알려 주는 표기입니다.

### 디버그 심볼 분리 — Linux ELF

릴리스 바이너리에서는 디버그 정보를 *제거*하고, *나중에 디버깅할 때 쓰도록* 따로 보관하는 방식이 있습니다.

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

위 `hello.c`를 `main.c`로 복사해 그대로 실행하면 크기와 링크가 다음처럼 바뀝니다. `readelf -lW`로 보면 두 번째 `LOAD` 세그먼트가 파일 오프셋 `0xfdc8`(64968)에서 시작하고 정렬이 `0x10000`입니다. 파일 크기의 대부분이 64 KiB 정렬로 생긴 빈 공간이라 strip으로 줄어든 폭이 작게 보입니다.

```text
-rwxr-xr-x 1 root root 72376 Nov 16 06:41 myapp        # strip 전
-rwxr-xr-x 1 root root 67696 Nov 16 06:41 myapp        # strip + debuglink 후
-rwxr-xr-x 1 root root  9216 Nov 16 06:41 myapp.debug

String dump of section '.gnu_debuglink':
  [     0]  myapp.debug
```

[GDB 매뉴얼 Separate Debug Files](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Separate-Debug-Files.html)에 따르면 GDB는 `.gnu_debuglink`에 적힌 이름을 실행 파일의 디렉터리, 그 아래 `.debug` 디렉터리, 전역 debug 디렉터리 순서로 찾습니다. 같은 디렉터리에 `myapp.debug`가 있으면 줄 정보가 살아나고, 실행 파일만 다른 디렉터리로 복사하면 사라집니다.

```text
# cd /root/ch01 && gdb -q -batch -ex "info line main" ./myapp
Line 12 of "main.c" starts at address 0x680 <main> and ends at 0x684 <main+4>.
# cp myapp /root/other/ && cd /root/other && gdb -q -batch -ex "info line main" ./myapp
Function "main" not defined.
```

다른 방법은 *build-id*로 찾는 것입니다. Debian의 `libc6-dbg`는 디버그 파일을 `/usr/lib/debug/.build-id/<앞 2자리>/<나머지>.debug` 경로에 설치합니다(`dpkg -L libc6-dbg`의 `/usr/lib/debug/.build-id/00/708f6fe79f09f3062255ee52fc1dc503bd6260.debug` 같은 항목). 같은 매뉴얼 절은 build-id 방식에서 GDB가 전역 debug 디렉터리의 `.build-id/nn/nnnnnnnn.debug`를 찾는다고 설명하며, 위 경로가 바로 그 형식입니다.

---

## 첫 세션 — *간단한 프로그램 디버깅*

재귀 함수 하나로 첫 세션을 돌려 봅니다. `factorial`에 멈춰 인자를 보고, 호출 사슬을 확인하고, 함수가 돌려준 값을 받아 보는 흐름입니다.

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

### GDB 세션

Debian 13 arm64, GDB 16.3에서 실행한 그대로입니다. `disable 1`로 breakpoint를 끈 뒤 `finish`를 하면 재귀 호출 4단계를 다시 멈추지 않고 첫 호출이 끝나는 자리까지 가며, GDB가 반환값 120을 `$2`에 담아 보여 줍니다.

```text
$ gdb -q ./hello
Reading symbols from ./hello...
(gdb) break factorial
Breakpoint 1 at 0x7b4: file hello.c, line 5.
(gdb) run
Starting program: /root/ch01/hello
[Thread debugging using libthread_db enabled]
Using host libthread_db library "/lib/aarch64-linux-gnu/libthread_db.so.1".

Breakpoint 1, factorial (n=5) at hello.c:5
5	    if (n <= 1) return 1;
(gdb) print n
$1 = 5
(gdb) backtrace
#0  factorial (n=5) at hello.c:5
#1  0x0000aaaaaaaa0800 in main () at hello.c:11
(gdb) disable 1
(gdb) finish
Run till exit from #0  factorial (n=5) at hello.c:5
0x0000aaaaaaaa0800 in main () at hello.c:11
11	    int result = factorial(n);
Value returned is $2 = 120
(gdb) continue
Continuing.
5! = 120
[Inferior 1 (process 3169) exited normally]
```

### LLDB 세션

같은 소스를 macOS에서 `clang -g -O0`로 빌드하고, 명령을 파일에 담아 `lldb --batch -s intro.lldb ./hello`로 실행했습니다. 실행 파일 경로가 나오는 두 줄은 `...`로 줄였습니다.

```text title="intro.lldb"
breakpoint set --name factorial
run
frame variable n
thread backtrace
breakpoint disable 1
continue
```

```text
(lldb) breakpoint set --name factorial
Breakpoint 1: where = hello`factorial + 16 at hello.c:5:9, address = 0x0000000100000470
(lldb) run
Process 96307 launched: '.../hello' (arm64)
Process 96307 stopped
* thread #1, queue = 'com.apple.main-thread', stop reason = breakpoint 1.1
       frame #0: 0x0000000100000470 hello`factorial(n=5) at hello.c:5:9
   2   	#include <stdio.h>
   3
   4   	int factorial(int n) {
-> 5   	    if (n <= 1) return 1;
    	        ^
   6   	    return n * factorial(n - 1);
   7   	}
   8
Target 0: (hello) stopped.
(lldb) frame variable n
(int) n = 5
(lldb) thread backtrace
* thread #1, queue = 'com.apple.main-thread', stop reason = breakpoint 1.1
   * frame #0: 0x0000000100000470 hello`factorial(n=5) at hello.c:5:9
     frame #1: 0x00000001000004e8 hello`main at hello.c:11:18
     frame #2: 0x00000001895ccd7c dyld`start + 6652
(lldb) breakpoint disable 1
1 breakpoints disabled.
(lldb) continue
5! = 120
Process 96307 resuming
Process 96307 exited with status = 0 (0x00000000)
```

두 세션을 나란히 보면 차이가 드러납니다. LLDB는 줄 번호에 *열 번호*(`hello.c:5:9`)까지 붙이고, macOS에서는 `main` 아래에 `dyld`의 `start` 프레임이 하나 더 보입니다. GDB는 `set backtrace past-main`의 기본값이 `off`라서(GDB 매뉴얼 Backtrace 절) `main`에서 backtrace를 멈춥니다.

## 자주 만나는 첫 문제

### "No symbol table is loaded"

실행 파일 없이 `gdb`만 띄운 뒤 `break main`을 치면 이 메시지가 나옵니다.

```text
$ gdb -q -batch -ex "break main"
No symbol table is loaded.  Use the "file" command.
Make breakpoint pending on future shared library load? (y or [n]) [answered N; input not from terminal]
```

`-g` 없이 빌드한 경우와는 증상이 다릅니다. `gcc -O0 hello.c -o hello-nog`로 만든 파일은 ELF 심볼 테이블에 `main`이 남아 있어 `break main`이 `Breakpoint 1 at 0x7f0`으로 성공하고, 멈춘 자리도 `0x0000aaaaaaaa07f0 in main ()`처럼 줄 번호 없이 보입니다. 이 상태에서 `next`를 치면 `Single stepping until exit from function main, which has no line number information.`이 나옵니다. 여기에 `strip`까지 하면 그제서야 `Function "main" not defined.`가 됩니다.

해결은 `-g`로 다시 빌드하는 것입니다.

```bash
gcc -g hello.c -o hello
```

### "Cannot find bounds of current function"

이 메시지는 *현재 PC를 감싸는 함수 심볼이 없을 때* `next`·`step`이 내는 오류입니다. `strip`한 바이너리에서 진입점(`readelf -h`의 `Entry point address: 0x680`)에 멈춘 뒤 `next`를 치면 그대로 재현됩니다. 첫 세션에서 `main`의 주소가 `0x0000aaaaaaaa0800`이었듯 GDB 아래에서 PIE는 `0xaaaaaaaa0000`에 올라가므로, 진입점 주소는 거기에 `0x680`을 더한 값입니다. `...`는 출력 일부를 줄인 자리입니다.

```text
(gdb) starti
...
(gdb) break *(0xaaaaaaaa0000+0x680)
Breakpoint 1 at 0xaaaaaaaa0680
(gdb) continue
Continuing.
...
Breakpoint 1, 0x0000aaaaaaaa0680 in ?? ()
(gdb) next
Cannot find bounds of current function
```

`next`는 "이 함수의 다음 줄"까지 가는 명령이라 함수 경계를 모르면 출발할 수 없습니다. 심볼이 없는 코드에서는 `stepi`/`nexti`로 명령 단위로 움직이거나, 심볼이 있는 빌드를 다시 씁니다.

### macOS의 GDB

Apple Silicon Mac에서 GDB를 쓰지 못하는 이유는 위 설치 절에서 본 대로 네이티브 지원 자체가 없기 때문입니다. 이 시리즈는 이 경우의 오류 메시지를 재현하지 않았고, LLDB로 전환하는 것을 전제로 합니다.

### "Operation not permitted"

```text
$ gdb -p 3309
ptrace: Operation not permitted.
```

위 `ptrace` 절에서 `ptrace_scope=1`로 재현한 메시지입니다. 같은 사용자라도 자식이 아닌 프로세스에 붙으려 하면 거부됩니다. 이 경우에는 붙으려는 프로세스를 디버거가 직접 실행하는 방법(`gdb ./prog`)이 가장 간단하고, attach가 꼭 필요하면 [Yama 문서](https://www.kernel.org/doc/html/latest/admin-guide/LSM/Yama.html)가 설명하는 `ptrace_scope` 값과 `CAP_SYS_PTRACE` 조건을 확인합니다. 호스트 전체의 `ptrace_scope`를 영구히 낮추는 것은 보안 설정을 바꾸는 일이므로 피합니다.

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
| **Ch 11** | 실전 팁 — STL·최적화 코드·시간 역행 디버깅 |
| **Ch 12** | DWARF와 심볼·소스 매핑 진단 |

---

## 정리

- *디버거*는 프로그램을 *멈추고 조사*하는 도구입니다. Linux에서는 `ptrace`를 쓰고, macOS의 LLDB는 `debugserver`를 띄워 대상을 제어합니다.
- attach 권한은 Yama `ptrace_scope`가 정합니다. 값이 `1`이면 자식이 아닌 프로세스에 `ptrace: Operation not permitted.`가 납니다.
- LLDB의 `run`·`next`·`p`는 풀 명령의 alias이고, `help <명령>`이 무엇으로 펼쳐지는지 알려 줍니다.
- Apple Silicon Mac에는 GDB 네이티브 지원이 없습니다(`gdb/configure.nat`). macOS에서는 LLDB를 씁니다.
- `hello.c`의 `-O2` 빌드에서는 `factorial(5)`가 상수 120으로 접혀 breakpoint가 한 번도 걸리지 않았습니다. `-O0`·`-Og`·`-O1`에서는 `n`이 보였습니다.
- 첫 세션: `break` → `run` → `print` → `backtrace` → `finish` → `continue`.

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
