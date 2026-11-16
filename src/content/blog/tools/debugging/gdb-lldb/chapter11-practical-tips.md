---
title: "GDB·LLDB 실전 팁 — STL·최적화 코드·시간 역행 디버깅"
slug: "tools/debugging/gdb-lldb/chapter11-practical-tips"
date: 2026-05-24T09:11:00
description: "심볼·변수 위치·초기 설정을 확인하는 실전 순서와 GDB record/rr의 실행 조건."
tags: [gdb, STL, Optimization, rr]
series: "GDB and LLDB"
seriesOrder: 11
draft: false
topics: ["tools", "tools/debugging"]
---

이 장에서는 매일의 답답함을 줄여 주는 작은 팁을 모았습니다. STL 출력이 너무 길거나 짧은 문제, `-O2` 코드의 `<optimized out>`, `.gdbinit`의 기본값, 그리고 GDB 자체의 *시간 역행 디버깅*입니다. 모든 출력은 Debian 13 arm64의 GDB 16.3, lldb 19.1.7, g++ 14.2.0으로 아래 `tips.cpp`를 돌려 얻었습니다.

```cpp title="tips.cpp (발췌)"
#define BUF_SIZE 64
struct Leaf { int id; };
struct Mid { Leaf leaf; int weight; };
struct Graph { Mid mid; const char* name; };
int counter = 0;

void bump(int step) {
    for (int i = 0; i < step; i++) counter += i;   // line 16
}
// main: v = {1,2,3} (reserve 4), m = {1:"one", 2:"two"}, s = "hello",
//       huge_vector = 0..9999, graph = &g, bump(5); bump(3); printf(...)  // line 31
```

## STL — 알아서 예쁘게

[Ch 3](/blog/tools/debugging/gdb-lldb/chapter03-inspecting-state)에서 본 대로 Debian 13에서는 libstdc++ printer가 자동으로 등록되어 별 설정 없이 이렇게 나옵니다.

```text
(gdb) print v
$1 = std::vector of length 3, capacity 4 = {1, 2, 3}
(gdb) print m
$2 = std::map with 2 elements = {[1] = "one", [2] = "two"}
(gdb) print s
$3 = "hello"
```

자동 등록이 안 되는 환경이라면 [Ch 9](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting)의 `.gdbinit` 설정으로 직접 등록합니다.

### 벡터 내용을 N개만

printer를 거치지 않고 libstdc++ 내부의 시작 포인터에서 바로 N개를 읽을 수 있습니다. `@n`은 연속한 n개 원소를 배열로 보여 주는 연산자입니다([Ch 2](/blog/tools/debugging/gdb-lldb/chapter02-basic-commands)).

```text
(gdb) print *v._M_impl._M_start@3
$4 = {1, 2, 3}
(gdb) print *huge_vector._M_impl._M_start@10
$5 = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9}
```

`_M_impl._M_start`는 libstdc++ 구현의 멤버 이름이라 libc++에서는 다릅니다.

### 큰 컨테이너의 머리만

`set print elements N`은 printer의 출력에도 적용됩니다. 0은 무제한입니다.

```text
(gdb) set print elements 20
(gdb) print huge_vector
$6 = std::vector of length 10000, capacity 10000 = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19...}
(gdb) set print elements 0
```

### 깊은 중첩

`set print pretty on`은 중첩 구조를 들여쓰고, 중첩 깊이 제한은 `set print max-depth N`입니다. 예전 자료에 나오는 `set print depth`는 GDB 16.3에 없습니다.

```text
(gdb) print *graph
$8 = {mid = {leaf = {id = 7}, weight = 3}, name = 0xaaaaaaaa3fe0 "g"}
(gdb) set print depth 1
Undefined set print command: "depth 1".  Try "help set print".
(gdb) set print max-depth 1
(gdb) print *graph
$1 = {mid = {...}, name = 0xaaaaaaaa3fe0 "g"}
(gdb) set print max-depth 0
(gdb) print *graph
$2 = {...}
```

## "value optimized out" — 최적화 코드

`-O2`로 빌드한 코드에서 변수를 찍으면 자주 만나는 메시지입니다. 같은 `tips.cpp`를 `-O2`와 `-Og`로 빌드해 `break bump` → `next` → `info locals`를 비교했습니다.

| 빌드 | `break bump` | `info args` | `next` 뒤 `main`의 `info locals` |
|------|--------------|-------------|---------------------------------|
| `-g -O2` | `bump. (2 locations)`, `bump (step=<optimized out>)` | `step = <optimized out>` | `v`는 printer가 `value has been optimized out` 예외, `g`·`graph`·`buf` = `<optimized out>` |
| `-g -Og` | `bump (step=step@entry=5)` | `step = 5` | `v`·`m`·`s`·`huge_vector` 모두 보임, `g = <optimized out>`, `graph = <synthetic pointer>`, `buf`는 0으로 채운 배열 |

`-O2`에서는 `bump`가 `main` 안에 두 번 인라인돼 breakpoint 위치가 2곳이 됐고, `-Og`에서는 함수 하나로 남았습니다. 컴파일러가 값을 레지스터에만 두거나 계산을 없애면 그 구간의 변수 위치가 DWARF에 남지 않고, GDB는 `<optimized out>`이라고 답합니다([Ch 12](/blog/tools/debugging/gdb-lldb/chapter12-dwarf)). 대처 방법은 네 가지입니다.

### 1. -Og로 다시 빌드

[GCC 14.2 매뉴얼](https://gcc.gnu.org/onlinedocs/gcc-14.2.0/gcc/Optimize-Options.html)은 `-Og`를 "the optimization level of choice for the standard edit-compile-debug cycle"이라고 설명합니다. 위 표처럼 `-Og`에서는 `-O2`보다 훨씬 많은 변수가 살아남았습니다. 다만 다시 빌드한 바이너리는 사고가 난 바이너리와 다른 프로그램이므로, 원본 core를 분석하는 데는 쓸 수 없습니다.

```bash
$ g++ -Og -g3 -fno-omit-frame-pointer ...
```

### 2. -g3로 매크로 정보 추가

GCC의 `-g3`는 매크로 정의를 디버그 정보에 더합니다. `-g`로 빌드하면 `BUF_SIZE`를 모르고, `-g3`로 빌드하면 정의 위치와 값까지 압니다. `tips-g3`에는 `.debug_macro` 섹션(37,722바이트)이 생겼습니다.

```text
# -g
(gdb) info macro BUF_SIZE
The symbol `BUF_SIZE' has no definition as a C/C++ preprocessor macro
at <user-defined>:-1
(gdb) print BUF_SIZE
No symbol "BUF_SIZE" in current context.

# -g3
(gdb) info macro BUF_SIZE
Defined at /root/ch11/tips.cpp:7
#define BUF_SIZE 64
(gdb) print BUF_SIZE
$1 = 64
```

### 3. 레지스터 직접 보기

`<optimized out>`은 현재 PC에서 그 변수의 위치를 디버그 정보가 설명하지 못한다는 뜻입니다. 값이 레지스터에 아직 남아 있다면 디스어셈블리로 그 레지스터를 찾아 직접 읽습니다. [Ch 3](/blog/tools/debugging/gdb-lldb/chapter03-inspecting-state)의 `opt.c`에서 `break *scale+20`으로 멈춰 `print $w0`가 `x = 41`을 되살린 것이 그 예입니다. arm64에서 정수 인자는 `x0`~`x7`(AAPCS64 Table 2)에 들어오므로 함수 입구 근처에서 가장 찾기 쉽습니다.

### 4. 인라인 함수와 PC ↔ 줄 매핑

`-O2`에서 인라인된 함수는 호출한 쪽 코드에 섞여 들어가 `step`이 어디로 갈지 헷갈립니다. `info line *$pc`로 현재 PC가 어느 줄에 대응하는지 확인합니다. 위 `-O2` 세션에서는 `next`로 `30 bump(3);`가 표시된 뒤의 PC가 `main()+740`이었고, `info line`은 그 주소를 16행(인라인된 `bump(3)`)으로 매핑했습니다.

```text
(gdb) info line *$pc
Line 16 of "tips.cpp" starts at address 0xaaaaaaaa0fa4 <main()+740> and ends at 0xaaaaaaaa0fa8 <main()+744>.
```

## frame info — 진짜 어디서 멈췄나

인라인 호출은 디버그 정보로 만든 *논리* 프레임으로 나타납니다. `info frame`의 `inlined into frame 1` 표시로 진짜 프레임인지 구분하는 방법은 [Ch 4](/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames)에서 다뤘습니다.

## .gdbinit 추천

아래 설정을 `~/.gdbinit`에 넣어 두면 매번 입력하지 않아도 됩니다. 같은 내용을 `-x`로 읽혀 GDB 16.3에서 오류 없이 적용되는 것을 확인했고, 끝에 `echo`를 넣어 마지막 줄까지 실행됐는지도 봤습니다.

```gdb
# 히스토리
set history save on
set history filename ~/.gdb_history
set history size 10000

# 출력
set print pretty on
set print object on
set print array on
set print array-indexes on
set print elements 200

# 자동 정지 동작
set pagination off
set confirm off

# 라이브러리 자동 로드 허용 (pretty-printer 등)
add-auto-load-safe-path /opt/myproject/debuggers

# 색
set style sources on

# follow-fork
set follow-fork-mode parent
set detach-on-fork on

# C++ STL pretty-printer (배포판이 자동 등록하지 않은 경우, Debian 13 경로)
python
import sys
sys.path.insert(0, '/usr/share/gcc/python')
try:
    from libstdcxx.v6.printers import register_libstdcxx_printers
    register_libstdcxx_printers(None)
except ImportError:
    pass
end
```

```text
recommended.gdbinit loaded
(gdb) show print array-indexes
Printing of array indexes is on.
(gdb) show confirm
Whether to confirm potentially dangerous operations is off.
(gdb) print v
$1 = std::vector of length 3, capacity 4 = {
  [0] = 1,
  [1] = 2,
  [2] = 3
}
```

`set print pretty on`과 `array-indexes on`이 함께 켜져 벡터 원소가 한 줄씩 번호와 함께 나왔습니다. `set confirm off`는 `quit`·`run`·`delete` 같은 확인 질문을 모두 없애므로, 실수로 실행 중인 프로세스를 죽이지 않도록 주의합니다.

LLDB는 `~/.lldbinit`입니다. 아래 네 줄은 lldb 19.1.7에서 오류 없이 적용됐습니다.

```text
settings set target.skip-prologue false
settings set stop-line-count-after 5
settings set stop-line-count-before 5
settings set thread-format "thread #${thread.index}: tid=${thread.id}, '${thread.name}'\n"
```

```text
(lldb) b bump
Breakpoint 1: where = tips`bump(int) at tips.cpp:15:21, address = 0x0000000000001568
(lldb) run
    frame #0: 0x0000aaaaaaaa1568 tips`bump(step=65535) at tips.cpp:15:21
   10  	struct Mid { Leaf leaf; int weight; };
...
-> 15  	void bump(int step) {
...
   20  	    std::vector<int> v = {1, 2, 3};
(lldb) thread list
Process 3068 stopped
* thread #1: tid=0x0bfc, 'tips'
```

결과에 주의할 점이 있습니다. `target.skip-prologue false` 때문에 breakpoint가 함수 첫 명령(15행, 프롤로그)에 걸렸고, 인자가 아직 스택에 저장되기 전이라 `step=65535`라는 쓰레기 값이 보였습니다. 이 줄을 빼고 기본값으로 실행하면 `bump(int) + 8 at tips.cpp:16:14`에 걸려 `step = 5`가 제대로 보였습니다. 소스 문맥은 위아래 5줄씩, `thread list`는 바꾼 `thread-format`으로 나왔습니다.

## 빠른 작업 — 한 줄 디버깅

```bash
# 핵심 함수까지 자동으로 가서 멈춤
$ gdb -ex 'break main' -ex 'run' --args ./my_prog arg1

# 배치 모드 — 한 번 실행 후 종료
$ gdb -batch -ex 'run' -ex 'bt' --args ./my_prog

# 스크립트로
$ gdb -batch -x my_script.gdb ./my_prog
```

CI에서 죽은 바이너리의 콜스택만 뽑을 때 씁니다. [Ch 4](/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames)의 `crash`에 그대로 적용한 결과입니다.

```text
$ gdb -q -batch -ex run -ex bt --args ./crash

Program received signal SIGSEGV, Segmentation fault.
0x0000aaaaaaaa07b8 in deepest (n=0x0) at crash.c:6
6	void deepest(struct node* n) { printf("%d\n", n->value); }
#0  0x0000aaaaaaaa07b8 in deepest (n=0x0) at crash.c:6
#1  0x0000aaaaaaaa07f0 in deeper (n=0xfffffffffa90) at crash.c:7
#2  0x0000aaaaaaaa0818 in deep (n=0xfffffffffa90) at crash.c:8
#3  0x0000aaaaaaaa0854 in main () at crash.c:13
```

core 파일이 있다면 같은 방식으로 사후 분석을 자동화합니다.

```bash
$ gdb -batch -ex 'bt' -ex 'info locals' -ex 'quit' ./crash crash.core > postmortem.log
```

## reverse-* — GDB 자체의 시간 역행

GDB에는 rr 없이도 쓸 수 있는 기록·재생 기능이 있습니다. GDB 16.3 매뉴얼 Process Record and Replay 절에 따르면 `record full`(또는 `target record-full`)은 GDB의 소프트웨어 기록 구현으로, 재생과 역방향 실행을 지원합니다.

`bump(5)`에 들어가 기록을 켜고 `finish`로 함수를 끝까지 실행한 뒤, `counter`에 watchpoint를 걸고 `reverse-continue`로 거꾸로 갔습니다.

```text
Breakpoint 1, bump (step=5) at tips.cpp:16
(gdb) record full
(gdb) finish
main () at tips.cpp:30
(gdb) print counter
$1 = 10
(gdb) watch counter
Hardware watchpoint 2: counter
(gdb) reverse-continue

Hardware watchpoint 2: counter

Old value = 10
New value = 6
0x0000aaaaaaaa1590 in bump (step=5) at tips.cpp:16
(gdb) reverse-continue

Hardware watchpoint 2: counter

Old value = 6
New value = 3
0x0000aaaaaaaa1590 in bump (step=5) at tips.cpp:16
(gdb) info record
Active record target: record-full
Replay mode:
Lowest recorded instruction number is 1.
Current instruction number is 57.
Highest recorded instruction number is 85.
Log contains 85 instructions.
Max logged instructions is 200000.
```

거꾸로 갈 때는 "Old"와 "New"가 시간의 역순으로 나옵니다. 첫 `reverse-continue`는 `counter`가 6에서 10이 된 마지막 쓰기(`counter += 4`) 직전으로 돌아갔고, 두 번째는 그 앞의 쓰기(3 → 6)로 돌아갔습니다. "이 값을 마지막으로 바꾼 곳"을 찾는 질문에 직접 답하는 방법입니다. 기록이 시작된 지점보다 더 거꾸로 가면 `Reached end of recorded history; stopping.`이 나옵니다.

기록에는 비용이 큽니다. 매뉴얼은 `record full insn-number-max`의 기본값을 200000으로 적고, 실제로 `info record`도 `Max logged instructions is 200000`을 보여 줬습니다. 20만 번 도는 C 루프를 기록 없이와 `record full`(한도 unlimited)로 끝까지 실행해 3회 중앙값을 비교했습니다.

| 실행 | 중앙값 | 기록된 명령 수 |
|------|--------|----------------|
| `break main` → `run` → `continue` | 0.083 s | — |
| 같은 순서 + `record full` | 147.159 s | 3,202,078 |

같은 실행이 약 1,800배 느려졌습니다. `record full`은 짧은 구간을 정해 놓고 그 안에서만 씁니다.

## rr — 진짜 time-travel

긴 실행을 기록해야 한다면 [rr](https://rr-project.org/)이 대안입니다. [Ch 6](/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess)에서 정리한 대로 rr은 하드웨어 성능 카운터가 필요하고, 이 시리즈의 QEMU HVF 게스트에서는 rr 5.9.0이 CPU를 인식하지 못해 실행되지 않았습니다. 지원 CPU·VM 조건은 rr README의 System requirements를 봅니다.

## 자주 만나는 함정 모음

이 시리즈에서 직접 만난 증상과 원인입니다.

| 증상 | 원인 / 해법 | 본 곳 |
|------|-------------|-------|
| `??` 함수 이름 | 디버그 정보 없음. `-g`로 빌드하거나 별도 debuginfo(`set debug-file-directory`, debuginfod) | Ch 4, Ch 7 |
| `<optimized out>` | 최적화로 위치 정보 없음. `-Og` 또는 레지스터 직접 보기 | 이 장, Ch 3 |
| `No symbol "x" in current context` | 스코프 밖이거나 `-O2`로 사라짐 | Ch 1, 이 장 |
| breakpoint가 여러 곳에 걸림 | 인라인 사본마다 위치가 생김 (`bump. (2 locations)`) | 이 장 |
| breakpoint 조건이 무시되고 매번 멈춤 | 디버그 타입 없는 함수(`strcmp`)를 조건에 씀. 캐스팅 또는 `$_streq` | Ch 2 |
| 디버거 아래와 밖에서 주소가 다름 | GDB가 ASLR을 끔(`set disable-randomization`, 기본 on) | Ch 4 |
| 무시하도록 설정한 시그널에도 멈춤 | GDB가 먼저 받음. `handle SIGPIPE nostop noprint` | Ch 5 |

## 빌드 옵션 권장 정리

```bash
# 평소 디버깅 빌드
-O0 -g3 -fno-omit-frame-pointer -fno-inline -fno-optimize-sibling-calls

# 최적화했지만 디버깅도 해야 할 때
-Og -g3 -fno-omit-frame-pointer

# 프로덕션 + 별도 debuginfo
-O2 -g                          # 컴파일
$ objcopy --only-keep-debug a.out a.debug
$ strip --strip-debug a.out
$ objcopy --add-gnu-debuglink=a.debug a.out
```

`-fno-optimize-sibling-calls`는 [Ch 4](/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames)에서 tail call로 사라지던 `helper`를 진짜 프레임으로 되돌렸습니다. 마지막 묶음의 `--add-gnu-debuglink`는 파일 이름과 CRC로 찾는 방식이고, build-id로 찾는 방식은 별개라는 점은 [Ch 1](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install)과 [Ch 7](/blog/tools/debugging/gdb-lldb/chapter07-core-dump)에서 실제로 확인했습니다.

## 마지막으로 — 더 깊게

이 시리즈 다음에 이어 볼 만한 이 블로그의 시리즈입니다.

- [Sanitizers](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan) — ASan·UBSan·TSan으로 메모리·UB·race를 *실행하면서* 잡습니다. 디버거의 짝입니다.
- [Valgrind](/blog/tools/debugging/valgrind/chapter02-memcheck) — 다시 빌드하지 않고 Memcheck·Helgrind로 검사합니다.
- [Postmortem](/blog/tools/debugging/postmortem/chapter01-core-generation) — core 수집과 debuginfod 운영을 더 깊게 다룹니다.
- [DWARF & ELF 내부](/blog/tools/debugging/dwarf-elf/chapter01-elf-overview) — [Ch 12](/blog/tools/debugging/gdb-lldb/chapter12-dwarf)의 디버그 정보를 바이트 단위로 엽니다.

## 정리

- STL은 `print`로 충분하고, 길면 `set print elements`, 깊으면 `set print max-depth`(GDB 16.3에 `set print depth`는 없음)로 줄입니다.
- `-O2`에서는 인자·지역 변수 다수가 `<optimized out>`이었고, `-Og`에서는 대부분 보였습니다.
- `-g3`는 `.debug_macro`를 더해 `info macro`·`print BUF_SIZE`를 가능하게 합니다.
- 추천 `.gdbinit`은 GDB 16.3에서 끝까지 오류 없이 적용됐습니다. LLDB의 `skip-prologue false`는 인자를 쓰레기 값으로 보이게 합니다.
- `record full` + `watch` + `reverse-continue`로 마지막 쓰기를 거꾸로 찾습니다. 대신 20만 회 루프에서 약 1,800배 느렸습니다.
- 함정 표의 증상은 모두 이 시리즈에서 직접 재현한 것입니다.

다음 Ch 12에서는 이 증상들을 디버그 정보(DWARF)의 실제 내용과 연결합니다.

## 관련 항목 (시리즈 전체)

- [Ch 1: 소개와 설치](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install)
- [Ch 2: 기본 명령 — 10가지](/blog/tools/debugging/gdb-lldb/chapter02-basic-commands)
- [Ch 3: 상태 검사](/blog/tools/debugging/gdb-lldb/chapter03-inspecting-state)
- [Ch 4: 콜스택과 프레임](/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames)
- [Ch 5: 브레이크포인트와 워치포인트](/blog/tools/debugging/gdb-lldb/chapter05-breakpoints-watchpoints)
- [Ch 6: 멀티스레드 / 멀티프로세스](/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess)
- [Ch 7: core dump 분석](/blog/tools/debugging/gdb-lldb/chapter07-core-dump)
- [Ch 8: 원격 / 임베디드 디버깅](/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging)
- [Ch 9: Python 스크립팅](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting)
- [Ch 10: TUI / 프런트엔드](/blog/tools/debugging/gdb-lldb/chapter10-tui-frontends)
- 다음: [Ch 12: DWARF 디버그 정보](/blog/tools/debugging/gdb-lldb/chapter12-dwarf)

## 외부 자료

- [Sanitizer 시리즈](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)
- [Valgrind 시리즈](/blog/tools/debugging/valgrind/chapter02-memcheck)
- [rr 프로젝트](https://rr-project.org/)
- [GDB 공식 매뉴얼](https://sourceware.org/gdb/current/onlinedocs/gdb.html/)
- [LLDB 튜토리얼](https://lldb.llvm.org/use/tutorial.html)
