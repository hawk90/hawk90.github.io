---
title: "GDB·LLDB 기본 명령 — break·step·next·print 동작 비교"
slug: "tools/debugging/gdb-lldb/chapter02-basic-commands"
date: 2026-05-24T09:02:00
description: "디버거에서 매일 쓰는 핵심 명령 10가지 — 정확한 의미와 자주 쓰는 변형."
tags: [gdb, lldb, Debugging, BasicCommands]
series: "GDB and LLDB"
seriesOrder: 2
draft: false
topics: ["tools", "tools/debugging"]
---

## 매일 쓰는 명령 10가지

[Ch 1](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install)에서 첫 세션을 봤습니다. 이 장은 *그 안에서 본 명령들*을 하나씩 실제로 돌려 보며 정확한 동작을 확인합니다. 출력은 모두 Debian 13 arm64의 GDB 16.3과 lldb 19.1.7에서 같은 실행 파일로 얻은 것입니다.

| 명령 | 약어 | 의미 |
|------|------|------|
| `run` | `r` | 프로그램 실행 |
| `continue` | `c` | 정지 상태에서 계속 |
| `break` | `b` | 중단점 설정 |
| `next` | `n` | 다음 줄로 (함수 안 안 들어감) |
| `step` | `s` | 다음 줄로 (함수 안으로 진입) |
| `finish` | `fin` | 현재 함수 끝까지 실행 |
| `print` | `p` | 변수·식 값 출력 |
| `info` | `i` | 정보 조회 |
| `list` | `l` | 소스 코드 표시 |
| `quit` | `q` | 디버거 종료 |

약어 열은 GDB 16.3의 `help <약어>` 첫 줄(`info, inf, i` 같은 형식)에서 확인했습니다.

### 실습 프로그램

이 장의 모든 세션은 아래 `basics.cpp` 하나로 돌렸습니다. 줄 번호가 출력에 그대로 나오므로 번호를 함께 붙였습니다. 빌드는 `g++ -g -O0 basics.cpp -o basics`입니다.

```cpp title="basics.cpp (15~40행)"
15  int add(int a, int b) {
16      return a + b;
17  }
18
19  int Parser::parse(const char* buf) {
20      if (strcmp(buf, "ERROR") == 0) return -1;
21      return (int)strlen(buf);
22  }
23
24  int main(int argc, char** argv) {
25      int x = 1;
26      int y = 2;
27      int z = add(x, y);
28      int arr[5] = {10, 20, 30, 40, 50};
29      Point p = {3, 4};
30      Point* pp = &p;
31      const char* msgs[] = {"ok", "warn", "ERROR", "ok"};
32      Parser parser;
33      int total = 0;
34      for (int i = 0; i < 4; i++) {
35          total += parser.parse(msgs[i]);
36      }
37      Box<int> box{42};
38      printf("z=%d total=%d box=%d argc=%d\n", z, total, box.get(), argc);
39      return 0;
40  }
```

1~14행에는 `#include <cstdio>`·`<cstring>`, `struct Point { int x; int y; }`, `Parser` 클래스 선언, `template <typename T> struct Box { T v; T get() const { return v; } };`(13행)가 있습니다.

---

## `run` / `continue` — 시작과 진행

`run`은 *처음부터*, `continue`는 *멈춘 자리부터* 실행합니다. `run` 뒤에 적은 인자는 프로그램의 `argv`로 그대로 넘어갑니다.

```text
(gdb) run input.txt --verbose
Starting program: /root/ch02/basics input.txt --verbose
...
Breakpoint 1, main (argc=3, argv=0xfffffffffbd8) at basics.cpp:25
25	    int x = 1;
(gdb) print argv[1]
$2 = 0xfffffffffe46 "input.txt"
```

`continue N`의 숫자는 *지금 멈춰 있는 breakpoint를 더 무시할 횟수*입니다([GDB 매뉴얼 Continuing and Stepping](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Continuing-and-Stepping.html)의 "a further number of times to ignore"). `continue 2`에 GDB가 `Will ignore next crossing of breakpoint 1.`이라고 답하듯 실제로 무시되는 것은 N-1번입니다. `Parser::parse`에 멈춘 상태에서 `continue 2`를 주면 두 번째 호출(`"warn"`)을 건너뛰고 세 번째 호출(`"ERROR"`)에서 멈춥니다. 매뉴얼은 이 숫자가 breakpoint 때문에 멈췄을 때만 의미가 있다고 적고 있고, 멈춘 자리의 breakpoint를 지운 뒤 `continue 2`를 주자 숫자가 버려졌습니다.

```text
(gdb) continue 2
Will ignore next crossing of breakpoint 1.  Continuing.

Breakpoint 1, Parser::parse (this=0xfffffffffa18, buf=0xaaaaaaaa0a38 "ERROR") at basics.cpp:20
...
(gdb) continue 2
Not stopped at any breakpoint; argument ignored.
```

LLDB도 같은 이름을 씁니다. `continue`는 `process continue`의 alias이고, 무시 횟수는 `-i` 옵션으로 줍니다. lldb 19.1.7의 `help continue`는 이 옵션을 `-i <unsigned-integer> ( --ignore-count <unsigned-integer> )`, "Ignore <N> crossings of the breakpoint (if it exists) for the currently selected thread."로 설명합니다.

```text
(lldb) run input.txt --verbose
(lldb) continue
```

---

## `break` — *멈출 자리* 설정

가장 많이 쓰는 명령이고 위치를 지정하는 방법이 여럿입니다. 우편 주소를 도로명으로도, 지번으로도 쓸 수 있듯이 같은 자리를 함수 이름·파일:줄·주소로 가리킬 수 있습니다.

### 함수 이름

C++ 메서드는 `클래스::메서드`, 템플릿 인스턴스는 따옴표로 감싸 적습니다. GDB는 각 breakpoint를 함수 프롤로그 *다음*의 첫 줄에 놓습니다.

```text
(gdb) break main
Breakpoint 1 at 0x918: file basics.cpp, line 25.
(gdb) b Parser::parse
Breakpoint 2 at 0x8d8: file basics.cpp, line 20.
(gdb) b 'Box<int>::get'
Breakpoint 3 at 0xa08: file basics.cpp, line 13.
```

LLDB는 `breakpoint set --name`이 풀 명령이고, `b`는 GDB식 위치 문법을 받아 주는 `_regexp-break`의 alias입니다.

```text
(lldb) breakpoint set --name main
Breakpoint 1: where = basics`main + 16 at basics.cpp:25:9, address = 0x0000000000000918
```

### 파일과 줄 번호

```text
(gdb) break basics.cpp:16
Breakpoint 4 at 0x8b4: file basics.cpp, line 16.
```

LLDB에서는 두 형식이 같은 자리를 가리킵니다.

```text
(lldb) b basics.cpp:16
Breakpoint 2: where = basics`add(int, int) + 12 at basics.cpp:16:16, address = 0x00000000000008b4
(lldb) breakpoint set --file basics.cpp --line 21
Breakpoint 3: where = basics`Parser::parse(char const*) + 48 at basics.cpp:21:23, address = 0x00000000000008f8
```

### 조건부

깊은 루프 안에서 *특정 상황*만 잡을 때 씁니다. 숫자 비교는 바로 됩니다. `break basics.cpp:35 if i == 2`로 실행하면 `i`가 2일 때 처음 멈추고 `print i`가 `$1 = 2`를 냅니다. 문자열 비교는 함정이 있습니다. glibc의 `strcmp`에는 디버그 타입 정보가 없어서, 그대로 쓰면 GDB 16.3은 조건을 평가하지 못하고 *조건과 상관없이 멈춥니다*.

```text
(gdb) b Parser::parse if strcmp(buf, "ERROR") == 0
(gdb) continue
Error in testing condition for breakpoint 6:
'strcmp' has unknown return type; cast the call to its declared return type

Breakpoint 6, Parser::parse (this=0xfffffffff9f8, buf=0xaaaaaaaa0a78 "ok") at basics.cpp:20
```

`buf`가 `"ok"`인데 멈췄습니다. 오류 메시지가 말하는 대로 반환 타입을 캐스팅하거나, GDB 내장 함수 `$_streq`를 쓰면 `"ERROR"`일 때만 멈춥니다.

```text
(gdb) break Parser::parse if (int)strcmp(buf, "ERROR") == 0
(gdb) run
Breakpoint 1, Parser::parse (this=0xfffffffffa18, buf=0xaaaaaaaa0a38 "ERROR") at basics.cpp:20

(gdb) break Parser::parse if $_streq(buf, "ERROR")
(gdb) run
Breakpoint 1, Parser::parse (this=0xfffffffffa18, buf=0xaaaaaaaa0a38 "ERROR") at basics.cpp:20
```

`$_streq`는 GDB 매뉴얼 Convenience Functions 절에 있는 GDB 쪽 함수(Python으로 구현, Python 지원 빌드 필요)라 대상 프로세스 안의 함수를 부르지 않습니다. LLDB에서는 `--condition`에 같은 캐스팅을 넣었고, `"ERROR"` 호출에서 멈췄습니다.

```text
(lldb) breakpoint set --name Parser::parse --condition '(int)strcmp(buf, "ERROR") == 0'
(lldb) continue
* thread #1, name = 'basics', stop reason = breakpoint 5.1
    frame #0: 0x0000aaaaaaaa08d8 basics`Parser::parse(this=0x0000fffffffffa38, buf="ERROR") at basics.cpp:20:15
```

### 일회성 (Temporary)

한 번 멈추면 스스로 지워지는 breakpoint입니다. `info breakpoints`의 `Disp` 열이 `keep`이 아니라 `del`로 나옵니다.

```text
(gdb) tbreak basics.cpp:33
Temporary breakpoint 5 at 0x980: file basics.cpp, line 33.
...
Temporary breakpoint 5, main (argc=3, argv=0xfffffffffbd8) at basics.cpp:33
```

LLDB에서는 `--one-shot true`이고, 멈출 때 `stop reason = one-shot breakpoint 4`로 표시됩니다.

```text
(lldb) breakpoint set --one-shot true --name add
Breakpoint 4: where = basics`add(int, int) + 12 at basics.cpp:16:16, address = 0x00000000000008b4
```

### 정규식으로 여러 함수에

`rbreak`는 정규식에 맞는 함수마다 breakpoint를 하나씩 만들고, 만든 함수의 시그니처를 출력합니다.

```text
(gdb) rbreak ^add
Note: breakpoint 4 also set at pc 0x8b4.
Breakpoint 7 at 0x8b4: file basics.cpp, line 16.
int add(int, int);
Successfully created breakpoint 7.
```

### Breakpoint 관리

`delete`는 번호로, `clear`는 위치로 지웁니다. `disable`한 breakpoint는 목록에 남고 `Enb` 열만 `n`이 됩니다.

```text
(gdb) delete 7
(gdb) clear basics.cpp:16
Deleted breakpoint 4
(gdb) disable 2
(gdb) info breakpoints
Num     Type           Disp Enb Address            What
1       breakpoint     keep y   0x0000000000000918 in main(int, char**) at basics.cpp:25
2       breakpoint     keep n   0x00000000000008d8 in Parser::parse(char const*) at basics.cpp:20
3       breakpoint     keep y   0x0000000000000a08 in Box<int>::get() const at basics.cpp:13
5       breakpoint     del  y   0x0000000000000980 in main(int, char**) at basics.cpp:33
6       breakpoint     keep y   0x00000000000008d8 in Parser::parse(char const*) at basics.cpp:20
	stop only if strcmp(buf, "ERROR") == 0
```

LLDB의 대응 명령은 `breakpoint list`·`breakpoint delete`·`breakpoint disable`·`breakpoint enable`입니다. 목록에서 비활성은 `Options: disabled`, 일회성은 `Options: enabled one-shot`으로 표시됩니다.

```text
(lldb) breakpoint disable 1
1 breakpoints disabled.
(lldb) breakpoint delete 2
1 breakpoints deleted; 0 breakpoint locations disabled.
(lldb) breakpoint list
Current breakpoints:
1: name = 'main', locations = 1 Options: disabled
  1.1: where = basics`main + 16 at basics.cpp:25:9, address = basics[0x0000000000000918], unresolved, hit count = 0
...
```

---

## `step` vs `next` vs `finish` — 진행 명령

가장 헷갈리는 셋이라 27행 `int z = add(x, y);`에 멈춘 상태에서 각각 실행해 봤습니다. 엘리베이터에 비유하면 `next`는 그 층을 지나치는 것이고, `step`은 그 층에 내려 안으로 들어가는 것이며, `finish`는 지금 층의 볼일을 마치고 원래 층으로 돌아가는 것입니다.

```text
Breakpoint 1, main (argc=1, argv=0xfffffffffbf8) at basics.cpp:27
27	    int z = add(x, y);
(gdb) next
28	    int arr[5] = {10, 20, 30, 40, 50};
(gdb) print z
$1 = 3
```

`next`는 `add()`를 통째로 실행하고 28행에 멈췄습니다. 같은 자리에서 `step`을 주면 `add` 안으로 들어갑니다.

```text
27	    int z = add(x, y);
(gdb) step
add (a=1, b=2) at basics.cpp:16
16	    return a + b;
(gdb) finish
Run till exit from #0  add (a=1, b=2) at basics.cpp:16
0x0000aaaaaaaa0934 in main (argc=1, argv=0xfffffffffbf8) at basics.cpp:27
27	    int z = add(x, y);
Value returned is $2 = 3
(gdb) print z
$3 = 1507327
(gdb) next
28	    int arr[5] = {10, 20, 30, 40, 50};
(gdb) print z
$4 = 3
```

`finish`의 동작이 이 출력에서 분명해집니다. 반환값 3은 `Value returned is $2 = 3`으로 보이지만, 멈춘 자리는 27행 *중간*(`0x...0934`, `bl add` 바로 다음 명령)이라 `z`에 대입하는 명령은 아직 실행되지 않았습니다. 그래서 `z`는 쓰레기 값 `1507327`이고, `next`로 27행을 끝낸 뒤에야 3이 됩니다.

정리하면 다음과 같습니다.

- **`next`** — 한 줄 진행하고, 함수 호출은 *통째로* 실행합니다.
- **`step`** — 한 줄 진행하되, 함수 호출이 있으면 *안으로 진입*합니다.
- **`finish`** — 현재 함수가 *반환할 때까지* 실행하고 반환값을 `$N`에 담습니다. 호출한 줄의 나머지(대입 등)는 아직 남아 있습니다.

`step`으로 깊은 함수에 잘못 들어갔을 때 `finish`로 빠져나오는 것이 가장 흔한 쓰임입니다.

### 명령어 단위 진행

`stepi`(`si`)와 `nexti`(`ni`)는 소스 줄이 아니라 기계어 명령 하나씩 움직입니다. 한 줄 안에서 명령 사이에 멈추면 GDB가 주소를 앞에 붙여 줄 중간임을 표시합니다.

```text
(gdb) stepi
0x0000aaaaaaaa09cc	37	    Box<int> box{42};
(gdb) stepi
38	    printf("z=%d total=%d box=%d argc=%d\n", z, total, box.get(), argc);
(gdb) nexti
0x0000aaaaaaaa09d4	38	    printf("z=%d total=%d box=%d argc=%d\n", z, total, box.get(), argc);
(gdb) x/i $pc
=> 0xaaaaaaaa09d4 <main(int, char**)+204>:	bl	0xaaaaaaaa0a00 <_ZNK3BoxIiE3getEv>
```

다음 명령이 `bl`(호출)이므로 여기서 `stepi`는 `Box<int>::get` 안으로 들어가고, `nexti`는 호출을 통째로 넘깁니다.

### `until` — 루프 빠져나가기

`until LOCATION`은 현재 프레임에서 그 위치에 닿거나 현재 프레임이 반환할 때까지 실행합니다([GDB 매뉴얼 Continuing and Stepping](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Continuing-and-Stepping.html)). 34~36행 루프 한가운데에서 `until 37`을 주면 남은 반복을 한 번에 돌고 루프 뒤에 멈춥니다.

```text
(gdb) until 37
main (argc=1, argv=0xfffffffffbf8) at basics.cpp:37
37	    Box<int> box{42};
(gdb) print total
$1 = 7
```

`total`이 `2 + 4 + (-1) + 2 = 7`이므로 네 번의 `parse`가 모두 끝났습니다. 다만 `until`도 breakpoint를 건너뛰지 않습니다. `Parser::parse`에 breakpoint를 걸고 루프 안에서 `until 37`을 주자 37행이 아니라 `Breakpoint 2, Parser::parse (..., buf=... "ERROR")`에서 멈췄습니다.

---

## `print` — 변수·식 평가

### 기본과 `$N` 변수

`print`의 결과에는 `$1`, `$2`처럼 번호가 붙고, 나중에 그 번호로 다시 씁니다. GDB 매뉴얼 Value History 절에 따르면 `$`는 마지막 값, `$$n`은 마지막 값에서 n개 앞의 값입니다(`$$0`은 `$`, `$$1`은 `$$`). 아래는 28행에 멈춘 상태라 `arr`·`p`가 아직 초기화되지 않아 쓰레기 값이 보입니다.

```text
(gdb) print x + y
$5 = 3
(gdb) print *pp
$9 = {x = -1136, y = 65535}
(gdb) print $
$10 = {x = -1136, y = 65535}
(gdb) print $$2
$11 = 65535
```

`print $$2`를 칠 때 마지막 값은 `$10`이므로 `$$2`는 두 개 앞인 `$8 = 65535`(`print pp->y`)입니다.

### 함수 호출

식 안에서 프로그램의 함수를 부를 수 있습니다. 대상 프로세스 안에서 함수를 *실제로 실행*하므로 부작용이 그대로 남습니다.

```text
(gdb) print add(2, 3)
$21 = 5
(gdb) print strlen(msgs[1])
'strlen' has unknown return type; cast the call to its declared return type
```

`strlen`처럼 디버그 타입 정보가 없는 라이브러리 함수는 캐스팅해야 합니다(`print strlen`은 `{void (void)} 0xfffff7fdb540 <strlen>`로 보입니다). 그리고 *부르는 시점*이 중요합니다. 28행에서는 `msgs`가 아직 초기화 전이라 `msgs[1]`이 NULL이었고, `print (int)strlen(msgs[1])`은 대상 프로세스를 죽였습니다.

```text
(gdb) print (int)strlen(msgs[1])

Program received signal SIGSEGV, Segmentation fault.
strlen () at ../sysdeps/aarch64/multiarch/../strlen.S:54
...
The program being debugged was signaled while in a function called from GDB.
GDB remains in the frame where the signal was received.
```

루프 안(35행)에서 같은 식을 주면 `$4 = 4`로 `"warn"`의 길이가 나옵니다.

### 포맷 지정자

`/f`는 정수의 *비트*를 float으로 읽습니다. `p/f 3`이 3.0이 아닌 이유입니다.

```text
(gdb) p/x 255
$12 = 0xff
(gdb) p/o 8
$13 = 010
(gdb) p/t 10
$14 = 1010
(gdb) p/c 65
$15 = 65 'A'
(gdb) p/f 3
$16 = 4.20389539e-45
(gdb) p/f 1078530011
$17 = 3.14159274
(gdb) p/x arr
$18 = {0xffffffff, 0x0, 0xf7dff070, 0xffff, 0xf7ff67a0}
```

1078530011은 `0x40490fdb`이고, IEEE 754 단정도로 읽으면 π에 가장 가까운 float입니다. LLDB는 `p/x`를 그대로 받고, 풀 명령으로는 `expression --format hex`입니다.

```text
(lldb) p/x a
(int) 0x00000001
(lldb) expression --format hex -- b
(int) $0 = 0x00000002
```

### 배열·메모리·포인터

`*배열@개수`는 연속된 원소를 배열로 보여 줍니다. 포인터는 C 문법 그대로 따라갑니다.

```text
(gdb) print *arr@3
$7 = {-1, 0, -136318864}
(gdb) print pp->y
$8 = 65535
```

주소에서 직접 읽는 `p *(int*)0x...@5` 형식과 `x` 명령은 [Ch 3](/blog/tools/debugging/gdb-lldb/chapter03-inspecting-state)에서 다룹니다.

### `set var` — 변수 수정

가설을 검증할 때 변수 값을 바꿔 다른 분기를 태워 봅니다. `print x = 7`도 대입식이라 같은 효과를 냅니다.

```text
(gdb) set var x = 100
(gdb) print x = 7
$19 = 7
(gdb) print x
$20 = 7
```

`var`를 빼고 `set x = 100`이라고 쓰면 변수 이름이 GDB의 `set` 하위 명령과 겹칠 때 문제가 됩니다. GDB 매뉴얼 Assignment 절의 예가 `set g=4`인데, `set g`가 `set gnutarget`의 약어로 해석됩니다. 그래서 매뉴얼은 `set variable`을 권합니다.

### `display` — 자동 출력

`display`로 등록한 식은 프로그램이 멈출 때마다 자동으로 출력됩니다. 포맷도 붙일 수 있습니다.

```text
(gdb) display total
1: total = 0
(gdb) display/x i
2: /x i = 0x0
(gdb) next
35	        total += parser.parse(msgs[i]);
1: total = 0
2: /x i = 0x0
(gdb) next
34	    for (int i = 0; i < 4; i++) {
1: total = 2
2: /x i = 0x0
(gdb) info display
Auto-display expressions now in effect:
Num Enb Expression
1:   y  total
2:   y  /x i
(gdb) undisplay 1
```

---

## `info` — 정보 조회

`info`는 *서브 명령*이 많습니다. 자주 쓰는 것은 다음과 같습니다.

```text
(gdb) info breakpoints      # 또는 i b
(gdb) info args             # 현재 함수의 인자
(gdb) info locals           # 현재 함수의 지역 변수
(gdb) info registers        # 레지스터 (이름을 붙이면 일부만)
(gdb) info threads          # 스레드
(gdb) info frame            # 현재 프레임 정보
(gdb) info functions        # 함수 목록
(gdb) info variables        # 전역·정적 변수
(gdb) info sharedlibrary    # 로드된 동적 라이브러리
```

`info locals`는 지역 변수를 한 번에 보여 줍니다. 28행에 멈춘 상태라 이미 대입된 `x`·`y`·`z`와 아직 초기화 전인 나머지가 섞여 있습니다.

```text
(gdb) info locals
x = 1
y = 2
z = 3
arr = {-1, 0, -136318864, 65535, -134256736}
p = {x = 0, y = 0}
pp = 0xfffffffffb80
msgs = {0x0, 0x0, 0x0, 0x0}
parser = {<No data fields>}
total = 2
box = {v = 0}
(gdb) info sharedlibrary
From                To                  Syms Read   Shared Object Library
0x0000fffff7fbeb80  0x0000fffff7fdb8a8  Yes         /lib/ld-linux-aarch64.so.1
0x0000fffff7e119c0  0x0000fffff7f374f4  Yes         /lib/aarch64-linux-gnu/libc.so.6
```

LLDB에서 대응하는 명령은 다음과 같습니다. `Parser::parse`에 멈춘 상태에서 `frame variable`은 인자(`this`, `buf`)를 보여 주고, `up`으로 `main`에 올라간 뒤 이름을 붙이면 그 변수만 보여 줍니다.

```text
(lldb) frame variable
(Parser *const) this = 0x0000fffffffffa38
(const char *) buf = 0x0000aaaaaaaa0a38 "ERROR"
(lldb) up
frame #1: 0x0000aaaaaaaa09a0 basics`main(argc=3, argv=0x0000fffffffffc18) at basics.cpp:35:30
...
(lldb) frame variable i total
(int) i = 2
(int) total = 6
(lldb) register read pc sp
      pc = 0x0000aaaaaaaa09a0  basics`main + 152 at basics.cpp:35:30
      sp = 0x0000fffffffffa10
(lldb) image list basics libc.so.6
[  0] 0FBE248C-E664-3D29-41BD-4377E6FAB921-8277689C 0x0000aaaaaaaa0000 /root/ch02/basics
[  1] 5F3926D9-963F-F284-B817-3BF3601BBB00-C3ABAD16 0x0000fffff7df0000 /lib/aarch64-linux-gnu/libc.so.6
      /usr/lib/debug/.build-id/5f/3926d9963ff284b8173bf3601bbb00c3abad16.debug
```

`breakpoint list`가 `info breakpoints`, `thread list`가 `info threads`에 해당합니다. LLDB의 `image list`는 각 모듈의 build-id(UUID)와 찾아 둔 디버그 파일 경로까지 보여 줍니다. libc의 디버그 정보를 `libc6-dbg`가 설치한 `.build-id` 경로에서 찾았다는 것이 출력에 드러납니다.

---

## `list` — 소스 코드 보기

GDB의 `list`는 기준 줄을 *가운데* 두고 10줄을 보여 주고, 다시 치면 이어지는 10줄을 보여 줍니다. 파일 끝에 닿으면 그렇다고 알려 줍니다.

```text
(gdb) list 20
15	int add(int a, int b) {
16	    return a + b;
...
24	int main(int argc, char** argv) {
(gdb) list 15,17
15	int add(int a, int b) {
16	    return a + b;
17	}
(gdb) list
18
19	int Parser::parse(const char* buf) {
...
27	    int z = add(x, y);
(gdb) list 35
30	    Point* pp = &p;
...
39	    return 0;
(gdb) list
40	}
(gdb) list
End of the file was already reached, use "list ." to list the current location again
```

LLDB의 `l`은 `_regexp-list`의 alias라서 `l 20`, `l add`, `l basics.cpp:20` 같은 짧은 형식만 받습니다. 옵션은 풀 명령 `source list`에 줍니다. GDB와 달리 `l 20`은 20행을 가운데가 아니라 *첫 줄*로 놓고 보여 줍니다.

```text
(lldb) l 20
   20  	    if (strcmp(buf, "ERROR") == 0) return -1;
   21  	    return (int)strlen(buf);
...
   29  	    Point p = {3, 4};
(lldb) source list --line 13 --count 3
   13  	struct Box { T v; T get() const { return v; } };
   14
   15  	int add(int a, int b) {
(lldb) l --line 42 --count 20
error: Could not find function named: "--line 42 --count 20".
```

---

## `jump` / `return` — 흐름 제어

### `return` — 함수 *조기 종료*

`return 값`은 함수의 나머지를 *실행하지 않고* 그 값을 돌려주게 만듭니다. 오류 경로를 강제로 태워 보는 fault injection에 씁니다. GDB가 먼저 확인을 받습니다.

```text
Breakpoint 1, add (a=1, b=2) at basics.cpp:16
16	    return a + b;
(gdb) return 99
Make add(int, int) return now? (y or n) y
#0  0x0000aaaaaaaa0934 in main (argc=1, argv=0xfffffffffbf8) at basics.cpp:27
27	    int z = add(x, y);
(gdb) next
28	    int arr[5] = {10, 20, 30, 40, 50};
(gdb) print z
$1 = 99
```

### `jump` — *실행 위치 강제 변경*

`jump 줄`은 그 줄로 PC를 옮기고 바로 실행을 이어 갑니다. 중간 코드는 실행되지 않습니다. 37행에서 `jump 39`를 주면 38행의 `printf`가 건너뛰어져 프로그램이 아무것도 출력하지 않고 끝납니다.

```text
Breakpoint 2, main (argc=1, argv=0xfffffffffbf8) at basics.cpp:37
37	    Box<int> box{42};
(gdb) jump 39
Continuing at 0xaaaaaaaa09f4.
[Inferior 1 (process 4263) exited normally]
```

GDB 매뉴얼 Jumping 절에 따르면 `jump`는 PC 말고는 스택 프레임도, 스택 포인터도, 메모리나 다른 레지스터도 바꾸지 않습니다. 그래서 다른 함수의 줄로 뛰면 매뉴얼 표현대로 "bizarre"한 결과가 나오고, GDB는 현재 함수 밖으로 뛸 때 확인을 받습니다.

---

## `quit` — 종료

실행 중인 프로세스가 있으면 GDB는 확인을 받고 그 프로세스를 죽입니다. LLDB는 `[Y/n]`으로 묻습니다.

```text
(gdb) quit
A debugging session is active.

	Inferior 1 [process 4229] will be killed.

Quit anyway? (y or n) y
```

```text
(lldb) quit
Quitting LLDB will kill one or more processes. Do you really want to proceed: [Y/n]
```

`gdb -q`로 시작하면 시작할 때의 저작권 안내가 나오지 않습니다. 이 시리즈의 GDB 세션은 모두 `-q`를 붙였습니다.

---

## *모르는 명령일 때* — `help`

```text
(gdb) help
(gdb) help break          # 'break' 명령 상세
(gdb) help info breakpoints
```

```text
(lldb) help
(lldb) help breakpoint set
(lldb) apropos crash      # 키워드로 명령·설정 검색
```

`apropos`는 명령 이름과 설명, 설정 변수까지 검색합니다. lldb 19.1.7에서 `apropos crash`는 해당하는 명령이 없다고 하면서 관련 설정 하나를 찾아 줬습니다.

```text
(lldb) apropos crash
No commands found pertaining to 'crash'. Try 'help' to see a complete list of debugger commands.

The following settings variables may relate to 'crash':
  target.display-expression-in-crashlogs -- Expressions that crash will show up
                                            in crash logs if the host system
...
```

---

## `.gdbinit` / `~/.lldbinit` — 초기 설정

매번 같은 설정을 치지 않도록 *시작 스크립트*에 저장합니다.

### `.gdbinit`

```gdb
# ~/.gdbinit

# 출력 페이지네이션 끄기 (긴 출력 자동 스크롤)
set pagination off

# 자식 프로세스 따라가기 (멀티프로세스용)
set follow-fork-mode child

# 어셈블리 신택스 (x86 대상에서만 존재하는 설정)
set disassembly-flavor intel

# 자동 명령
define hookpost-run
    info threads
end
```

주석과 빈 줄을 뺀 같은 내용(`post.gdbinit`, `set disassembly-flavor intel`이 3번째 줄)을 arm64 GDB에 `-x`로 읽혀 보면 그 줄에서 멈춥니다. Debian의 arm64 `gdb`에는 `disassembly-flavor` 설정이 없어 `set disassembly-flavor`가 변수 대입식으로 해석되고, 오류가 난 뒤의 줄(`hookpost-run` 정의)은 실행되지 않습니다.

```text
post.gdbinit:3: Error in sourced command file:
No symbol "disassembly" in current context.
```

3번째 줄을 지우면 `run` 뒤에 `info threads`가 자동으로 실행됩니다. 같은 VM의 `gdb-multiarch`에서 `set architecture i386:x86-64`를 먼저 주면 `The disassembly flavor is "intel".`로 설정이 됩니다. 여러 아키텍처에서 같은 `.gdbinit`를 쓴다면 아키텍처별 설정은 따로 떼어 두는 편이 안전합니다.

프로젝트 디렉터리의 `.gdbinit`는 기본으로 *읽히지 않습니다*. `auto-load safe-path` 바깥에 있는 파일이기 때문이고, GDB 16.3은 무엇을 추가하면 되는지 알려 줍니다.

```text
warning: File "/root/ch02/proj/.gdbinit" auto-loading has been declined by your `auto-load safe-path' set to "$debugdir:$datadir/auto-load".
To enable execution of this file add
	add-auto-load-safe-path /root/ch02/proj/.gdbinit
line to your configuration file "/root/.config/gdb/gdbinit".
```

`gdb -iex "add-auto-load-safe-path /root/ch02/proj"`로 시작하면 그 디렉터리의 `.gdbinit`가 읽혔습니다.

### `~/.lldbinit`

```text
settings set target.x86-disassembly-flavor intel
settings set stop-disassembly-display always
command alias bfl breakpoint set --file %1 --line %2
```

세 줄 모두 lldb 19.1.7(arm64)에서 오류 없이 받아들여졌습니다. LLDB는 x86 전용 설정에 `target.x86-...`라는 별도 이름을 붙여 두었고, arm64 대상에서도 그 설정을 지정하는 것 자체는 오류가 아니었습니다. `stop-disassembly-display always` 때문에 멈출 때마다 소스 아래에 디스어셈블리가 붙습니다.

```text
(lldb) bfl basics.cpp 16
Breakpoint 1: where = basics`add(int, int) + 12 at basics.cpp:16:16, address = 0x00000000000008b4
(lldb) run
...
-> 16  	    return a + b;
    	               ^
...
basics`add:
->  0xaaaaaaaa08b4 <+12>: ldr    w1, [sp, #0xc]
    0xaaaaaaaa08b8 <+16>: ldr    w0, [sp, #0x8]
    0xaaaaaaaa08bc <+20>: add    w0, w1, w0
```

[Ch 11: 실무 팁](/blog/tools/debugging/gdb-lldb/chapter11-practical-tips)에서 더 다룹니다.

---

## *작은 cheatsheet*

| 동작 | GDB | LLDB |
|------|-----|------|
| 시작 | `gdb prog` | `lldb prog` |
| 실행 | `run` | `run` |
| 멈출 자리 | `break <위치>` | `b <위치>` / `breakpoint set` |
| 조건부 (문자열) | `break f if $_streq(s, "x")` | `breakpoint set -n f --condition '(int)strcmp(s,"x")==0'` |
| 한 줄 (함수 안 안 들어감) | `next` | `next` |
| 한 줄 (함수 안으로) | `step` | `step` |
| 함수 끝까지 | `finish` | `finish` |
| 계속 | `continue` | `continue` |
| 변수 보기 | `print <식>` | `print <식>` / `frame variable` |
| 지역 변수 모두 | `info locals` | `frame variable` |
| 호출 사슬 | `backtrace` | `bt` |
| 소스 보기 | `list` | `l` / `source list` |
| 변수 수정 | `set var x = 100` | `expression x = 100` |
| 자동 출력 | `display <식>` | `target stop-hook add -o "frame variable x"` |
| 종료 | `quit` | `quit` |

## 정리

- 매일 쓰는 10명령: `run` / `continue` / `break` / `next` / `step` / `finish` / `print` / `info` / `list` / `quit`.
- 문자열 조건 `if strcmp(...) == 0`은 GDB 16.3에서 평가 오류가 나고 *조건과 상관없이 멈춥니다*. `(int)` 캐스팅이나 `$_streq`를 씁니다.
- `finish`는 반환값을 보여 주지만 호출한 줄의 대입은 아직 실행 전입니다. `z`는 `next` 뒤에야 바뀌었습니다.
- `continue N`은 현재 breakpoint를 N-1번 더 무시합니다. breakpoint 때문에 멈춘 상태가 아니면 숫자는 버려집니다.
- `print`로 부른 함수는 대상 프로세스에서 실제로 실행됩니다. 초기화 전 포인터로 `strlen`을 부르면 프로세스가 SIGSEGV를 받습니다.
- LLDB의 `l`은 짧은 형식만 받고, 옵션은 `source list`에 줍니다.
- `set disassembly-flavor`는 x86 대상 GDB에만 있습니다. arm64에서 `.gdbinit`의 그 줄은 이후 줄까지 막습니다.

## 다음 장 예고

[Ch 3: 상태 들여다보기](/blog/tools/debugging/gdb-lldb/chapter03-inspecting-state)에서는 *변수 깊이 보기* — 메모리, 레지스터, STL 컨테이너, 포인터 트리.

## 참고 자료

- [GDB Command Reference](https://sourceware.org/gdb/current/onlinedocs/gdb.html/)
- [LLDB Tutorial](https://lldb.llvm.org/use/tutorial.html)
- [GDB Cheat Sheet (DarkDust)](https://darkdust.net/files/GDB%20Cheat%20Sheet.pdf)

## 관련 항목

- [Ch 1: 소개와 설치](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install) — 이전 장, 설치와 컴파일 옵션
- [Ch 3: 상태 검사](/blog/tools/debugging/gdb-lldb/chapter03-inspecting-state) — 다음 장, `print`로 부족한 자리
- [Ch 11: 실무 팁](/blog/tools/debugging/gdb-lldb/chapter11-practical-tips) — `.gdbinit`으로 명령을 손에 맞추기
- [pdb 기본 사용법](/blog/tools/debugging/python/chapter01-pdb-basics) — 같은 명령 체계를 Python에서
- [GDB to LLDB 명령 대조표](https://lldb.llvm.org/use/map.html) — 두 디버거 명령 매핑
