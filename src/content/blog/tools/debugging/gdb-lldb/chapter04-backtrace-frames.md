---
title: "GDB·LLDB Backtrace와 프레임 이동 — Call Stack 분석"
slug: "tools/debugging/gdb-lldb/chapter04-backtrace-frames"
date: 2026-05-24T09:04:00
description: "bt·frame·up·down — 호출 스택 분석, 프레임 안 변수 조사, 인라인 함수 처리."
tags: [gdb, lldb, Backtrace, Stack]
series: "GDB and LLDB"
seriesOrder: 4
draft: false
topics: ["tools", "tools/debugging"]
---

## 호출 스택은 *디버깅의 지도*

프로그램이 어떤 자리에 멈췄을 때, *어떻게 거기까지 왔는지*를 알아야 원인을 찾을 수 있습니다. 그 답이 *호출 스택*(call stack)이고, 디버거가 이를 보여 주는 명령이 *backtrace*입니다. 택배 송장의 배송 이력처럼, 지금 위치에서 출발지까지 거쳐 온 지점을 역순으로 나열합니다.

이 장의 출력은 모두 Debian 13 arm64의 GDB 16.3, lldb 19.1.7, GCC 14.2.0에서 얻었습니다. 첫 예제는 NULL 포인터를 세 단계 아래로 넘겨 죽는 프로그램입니다.

```c title="crash.c"
// crash.c
#include <stdio.h>

struct node { int value; struct node* left; };

void deepest(struct node* n) { printf("%d\n", n->value); }
void deeper(struct node* n)  { deepest(n->left); }
void deep(struct node* n)    { int depth = 2; deeper(n); (void)depth; }
int main(void) {
    struct node leaf = {1, NULL};
    struct node root = {0, &leaf};
    deep(&root);        /* root.left = leaf, leaf.left = NULL */
    deep(&leaf);        /* deeper -> deepest(NULL) */
    return 0;
}
```

`gcc -g -O0 crash.c -o crash`로 빌드해 GDB에서 실행하면 첫 `deep(&root)`는 `1`을 출력하고, 두 번째 호출에서 `deepest(NULL)`이 죽습니다.

```text
(gdb) run
Starting program: /root/ch04/crash
...
1

Program received signal SIGSEGV, Segmentation fault.
0x0000aaaaaaaa07b8 in deepest (n=0x0) at crash.c:6
6	void deepest(struct node* n) { printf("%d\n", n->value); }
(gdb) backtrace
#0  0x0000aaaaaaaa07b8 in deepest (n=0x0) at crash.c:6
#1  0x0000aaaaaaaa07f0 in deeper (n=0xfffffffffa70) at crash.c:7
#2  0x0000aaaaaaaa0818 in deep (n=0xfffffffffa70) at crash.c:8
#3  0x0000aaaaaaaa0854 in main () at crash.c:13
```

`#0`이 지금 멈춘 함수, 번호가 커질수록 바깥 호출자입니다. `#3`이 13행을 가리키므로 죽은 것은 두 번째 `deep` 호출이고, `#0`의 `n=0x0`이 원인입니다.

---

## `backtrace` 변형

```text
(gdb) backtrace         # 전체 스택
(gdb) bt                # 약어
(gdb) bt 5              # 안쪽 5 프레임만
(gdb) bt -5             # 바깥 5 프레임만
(gdb) bt full           # 지역 변수 값까지 포함
(gdb) bt no-filters     # Python frame filter를 적용하지 않음
```

`bt N`은 뒤에 프레임이 더 있으면 그렇다고 알려 주고, `bt -N`은 가장 바깥 N개를 원래 번호 그대로 보여 줍니다.

```text
(gdb) bt 2
#0  0x0000aaaaaaaa07b8 in deepest (n=0x0) at crash.c:6
#1  0x0000aaaaaaaa07f0 in deeper (n=0xfffffffffa70) at crash.c:7
(More stack frames follow...)
(gdb) bt -2
#2  0x0000aaaaaaaa0818 in deep (n=0xfffffffffa70) at crash.c:8
#3  0x0000aaaaaaaa0854 in main () at crash.c:13
```

LLDB는 `bt`가 `thread backtrace`의 alias이고, 숫자를 주면 그만큼만 보여 줍니다. 차이는 바닥입니다. GDB는 `main`에서 멈추지만(`set backtrace past-main` 기본값 `off`), LLDB는 libc의 `__libc_start_call_main`과 `_start`까지 보여 주고, 줄 번호 뒤에 열 번호를 붙입니다.

```text
(lldb) thread backtrace
* thread #1, name = 'crash', stop reason = signal SIGSEGV: address not mapped to object (fault address: 0x0)
  * frame #0: 0x0000aaaaaaaa07b8 crash`deepest(n=0x0000000000000000) at crash.c:6:32
    frame #1: 0x0000aaaaaaaa07f0 crash`deeper(n=0x0000fffffffffac0) at crash.c:7:32
    frame #2: 0x0000aaaaaaaa0818 crash`deep(n=0x0000fffffffffac0) at crash.c:8:47
    frame #3: 0x0000aaaaaaaa0854 crash`main at crash.c:13:5
    frame #4: 0x0000fffff7e1225c libc.so.6`__libc_start_call_main(main=(crash`main at crash.c:9:16), argc=1, argv=0x0000fffffffffc48) at libc_start_call_main.h:58:16
    frame #5: 0x0000fffff7e1233c libc.so.6`__libc_start_main_impl(...) at libc-start.c:360:3
    frame #6: 0x0000aaaaaaaa06b0 crash`_start + 48
(lldb) bt 2
...
  * frame #0: 0x0000aaaaaaaa07b8 crash`deepest(n=0x0000000000000000) at crash.c:6:32
    frame #1: 0x0000aaaaaaaa07f0 crash`deeper(n=0x0000fffffffffac0) at crash.c:7:32
```

LLDB의 정지 사유에는 커널이 준 `siginfo` 내용(`address not mapped to object (fault address: 0x0)`)이 함께 나옵니다. 모든 스레드를 보는 `bt all`은 아래 스레드 절에서 다룹니다.

### `bt full` — 지역 변수 포함

`bt full`은 각 프레임의 지역 변수를 같이 출력합니다. `crash`에서는 지역 변수가 있는 `deep`과 `main`만 값이 나오고, 나머지는 `No locals.`입니다.

```text
(gdb) bt full
#0  0x0000aaaaaaaa07b8 in deepest (n=0x0) at crash.c:6
No locals.
#1  0x0000aaaaaaaa07f0 in deeper (n=0xfffffffffa70) at crash.c:7
No locals.
#2  0x0000aaaaaaaa0818 in deep (n=0xfffffffffa70) at crash.c:8
        depth = 2
#3  0x0000aaaaaaaa0854 in main () at crash.c:13
        leaf = {value = 1, left = 0x0}
        root = {value = 0, left = 0xfffffffffa70}
```

한 가지 함정이 있습니다. `bt full`은 *지금 이 순간*의 값을 보여 줄 뿐이라, 아직 대입되지 않은 변수는 쓰레기 값으로 나옵니다. 아래 `fact.c`는 `result = n * factorial(n - 1);`에서 재귀로 내려가는 중이라 어느 프레임의 `result`도 아직 계산되지 않았습니다.

```c title="fact.c (4~9행)"
int factorial(int n) {
    int result;
    if (n <= 1) return 1;
    result = n * factorial(n - 1);
    return result;
}
```

```text
(gdb) break factorial if n == 2
(gdb) run
Breakpoint 1, factorial (n=2) at fact.c:6
(gdb) bt full
#0  factorial (n=2) at fact.c:6
        result = 0
#1  0x0000aaaaaaaa07d4 in factorial (n=3) at fact.c:7
        result = 65535
#2  0x0000aaaaaaaa07d4 in factorial (n=4) at fact.c:7
        result = 0
#3  0x0000aaaaaaaa07d4 in factorial (n=5) at fact.c:7
        result = 65535
#4  0x0000aaaaaaaa0808 in main () at fact.c:13
        n = 5
        result = 0
```

`65535`와 `0`은 스택에 원래 있던 값입니다. 각 프레임의 줄 번호(7행, 아직 대입 전)와 함께 읽어야 값의 의미를 알 수 있습니다. STL 객체가 많은 프로그램에서는 `bt full` 출력이 길어지므로, 의심 가는 프레임으로 이동해 `info locals`를 보는 편이 읽기 쉽습니다.

---

## `frame` — *특정 프레임 이동*

`frame N`은 N번 프레임을 *선택*합니다. 이후의 `info locals`·`info args`·`print`는 모두 그 프레임 기준으로 동작합니다. 프로그램을 되감는 것이 아니라 보는 위치만 바꾸는 것입니다.

```text
(gdb) frame 2
#2  0x0000aaaaaaaa0818 in deep (n=0xfffffffffa70) at crash.c:8
8	void deep(struct node* n)    { int depth = 2; deeper(n); (void)depth; }
(gdb) info locals
depth = 2
(gdb) info args
n = 0xfffffffffa70
```

LLDB는 `frame select N`이 풀 명령이고 `f N`이 alias입니다. `frame variable`은 인자와 지역 변수를 함께 보여 줍니다.

```text
(lldb) frame select 2
frame #2: 0x0000aaaaaaaa0818 crash`deep(n=0x0000fffffffffac0) at crash.c:8:47
(lldb) frame variable
(node *) n = 0x0000fffffffffac0
(int) depth = 2
(lldb) f 3
frame #3: 0x0000aaaaaaaa0854 crash`main at crash.c:13:5
```

### `up` / `down` — 상대적 이동

`up`은 호출자 쪽(번호 증가), `down`은 피호출자 쪽(번호 감소)으로 움직입니다. 숫자를 붙이면 그만큼 한 번에 이동합니다. 스택을 그릴 때 `main`을 위에 두고 안쪽 함수를 아래로 쌓는다고 생각하면 이름이 외워집니다.

```text
(gdb) frame 2
(gdb) up
#3  0x0000aaaaaaaa0854 in main () at crash.c:13
13	    deep(&leaf);        /* deeper -> deepest(NULL) */
(gdb) down 2
#1  0x0000aaaaaaaa07f0 in deeper (n=0xfffffffffa70) at crash.c:7
7	void deeper(struct node* n)  { deepest(n->left); }
```

LLDB의 `up`·`down`도 같은 방향입니다. 다만 LLDB는 libc 프레임까지 보여 주므로, `main`(#3)에서 한 칸 내려간 #2에서 `up 2`를 하면 `main`을 지나 `#4 __libc_start_call_main`까지 올라갑니다.

```text
(lldb) down
frame #2: 0x0000aaaaaaaa0818 crash`deep(n=0x0000fffffffffac0) at crash.c:8:47
(lldb) up 2
frame #4: 0x0000fffff7e1225c libc.so.6`__libc_start_call_main(main=(crash`main at crash.c:9:16), argc=1, argv=0x0000fffffffffc48) at libc_start_call_main.h:58:16
```

---

## `info frame` — 프레임 *상세 정보*

`info frame`은 선택한 프레임의 주소 정보를 보여 줍니다. `deepest`(#0)에서 실행한 결과입니다.

```text
(gdb) info frame
Stack level 0, frame at 0xfffffffffa00:
 pc = 0xaaaaaaaa07b8 in deepest (crash.c:6); saved pc = 0xaaaaaaaa07f0
 called by frame at 0xfffffffffa20
 source language c.
 Arglist at 0xfffffffff9e0, args: n=0x0
 Locals at 0xfffffffff9e0, Previous frame's sp is 0xfffffffffa00
 Saved registers:
  x29 at 0xfffffffff9e0, x30 at 0xfffffffff9e8
```

각 항목은 다음을 뜻합니다.

- **`pc`** — 이 프레임에서 실행 중인 명령 주소입니다.
- **`saved pc`** — 이 함수가 반환하면 돌아갈 주소입니다. `0xaaaaaaaa07f0`은 `bt`의 `#1` 주소와 같습니다.
- **`called by frame at`** — 호출자 프레임의 위치(CFA)입니다.
- **`Arglist`·`Locals`** — 인자와 지역 변수의 기준 주소입니다.
- **`Saved registers`** — 이 함수가 프롤로그에서 저장한 레지스터의 위치입니다. arm64에서는 `x29`(FP)와 `x30`(LR)이 `stp`로 함께 저장됩니다.

그 자리를 직접 읽으면 호출자의 FP와 반환 주소가 나옵니다. 아래는 `gdb -batch`로 다시 실행한 별도 세션이라 스택 주소가 위와 `0x20` 다르지만, `x/2gx $fp`의 두 번째 값은 `saved pc`와 같은 `0x...07f0`입니다. 스택이 깨졌을 때 손으로 따라가는 출발점이 이 정보입니다.

```text
 Saved registers:
  x29 at 0xfffffffffa00, x30 at 0xfffffffffa08
(gdb) x/2gx $fp
0xfffffffffa00:	0x0000fffffffffa20	0x0000aaaaaaaa07f0
```

LLDB의 `frame info`는 프레임 한 줄 요약만 보여 줍니다. 저장된 레지스터 위치 같은 정보는 출력하지 않았습니다.

```text
(lldb) frame info
frame #2: 0x0000aaaaaaaa0818 crash`deep(n=0x0000fffffffffac0) at crash.c:8:47
```

---

## 인라인 함수의 *까다로움*

인라인 함수는 호출자 안에 몸체가 복사돼 들어가므로 *자기 스택 프레임이 없습니다*. 그래도 DWARF가 "이 주소 범위는 `square`의 인라인 사본"이라는 정보(`DW_TAG_inlined_subroutine`)를 남기면 GDB는 *가상의* 프레임을 만들어 보여 줍니다.

```c title="inline.c (5~13행)"
static inline int square(int v) {
    int sq = v * v;
    return sq + 1;
}

int main(int argc, char** argv) {
    int x = square(atoi(argc > 1 ? argv[1] : "7"));
    printf("%d\n", x);
    return 0;
}
```

`gcc -g -O2`로 빌드해 `break square`를 걸면 GDB는 인라인된 6행에 멈추고, `#1 main`에는 주소가 없습니다. `info frame`이 `inlined into frame 1`이라고 밝혀 줍니다.

```text
(gdb) break square
Breakpoint 1 at 0x6ec: file inline.c, line 6.
(gdb) run
Breakpoint 1, 0x0000aaaaaaaa06ec in square (v=<optimized out>) at inline.c:6
6	    int sq = v * v;
(gdb) bt
#0  0x0000aaaaaaaa06ec in square (v=<optimized out>) at inline.c:6
#1  main (argc=<optimized out>, argv=<optimized out>) at inline.c:11
(gdb) info frame
Stack level 0, frame at 0xfffffffffaa0:
 pc = 0xaaaaaaaa06ec in square (inline.c:6); saved pc = 0xfffff7e1225c
 inlined into frame 1
 source language c.
 Arglist at unknown address.
 Locals at unknown address, Previous frame's sp in sp
```

두 프레임의 `frame at` 주소가 `0xfffffffffaa0`으로 같은 것도 진짜 프레임이 하나뿐이라는 증거입니다. 인자 `v`는 `<optimized out>`이고, `print v`·`print sq` 모두 값을 얻지 못했습니다.

같은 바이너리에서 lldb 19.1.7은 다르게 동작했습니다. `b square`가 인라인 몸체가 아니라 `main + 36`(12행 `printf`)에 걸렸고, `bt`에 `square` 프레임이 나오지 않았습니다. 대신 `frame variable`이 `x = 50`(7×7+1)을 보여 줬습니다.

```text
(lldb) b square
Breakpoint 1: where = inline`main + 36 at inline.c:12:5, address = 0x00000000000006e4
(lldb) frame variable
(int) argc = <could not evaluate DW_OP_entry_value: no call edge for retn-pc = 0xfffff7e1225c in parent frame __libc_start_call_main>
...
(int) x = 50
```

인라인 함수에 breakpoint를 걸 때 두 디버거가 같은 자리를 고른다고 가정하지 않는 편이 좋습니다. 정확히 보려면 `-O0`나 `-Og`로 빌드합니다.

### `set print frame-info`

GDB 16.3의 `set print frame-info`는 프레임을 출력할 때 무엇을 보여 줄지 고릅니다. 같은 `frame 0`을 세 값으로 출력하면 다음과 같습니다.

```text
(gdb) set print frame-info source-and-location
(gdb) frame 0
#0  0x0000aaaaaaaa06ec in square (v=<optimized out>) at inline.c:6
6	    int sq = v * v;
(gdb) set print frame-info short-location
(gdb) frame 0
#0  0x0000aaaaaaaa06ec in square (v=<optimized out>)
(gdb) set print frame-info location-and-address
(gdb) frame 0
#0  0x0000aaaaaaaa06ec in square (v=<optimized out>) at inline.c:6
```

`short-location`은 파일·줄을 빼고, `location-and-address`는 소스 줄 출력을 뺍니다. 긴 세션 로그를 짧게 남길 때 씁니다.

---

## *최적화 코드*의 스택 — tail call

`-O2`에서 GCC는 함수의 마지막 호출을 `bl`(호출) 대신 `b`(점프)로 바꾸는 *sibling call 최적화*를 합니다. 아래 `helper`가 그 예입니다.

```c title="tail.c (5~16행)"
__attribute__((noinline)) int compute(int v) {
    printf("compute %d\n", v);
    return v * 3;
}

__attribute__((noinline)) int helper(int v) {
    return compute(v + 1);
}

int main(int argc, char** argv) {
    return helper(argc) & 0xff;
}
```

```text
0000000000000830 <helper>:
 830:	add	w0, w0, #0x1
 834:	b	800 <compute>
```

`helper`는 반환 주소를 남기지 않고 `compute`로 뛰므로, 스택만 보면 `compute`를 `main`이 직접 부른 것처럼 보입니다. 그런데 GDB 16.3의 `bt`에는 `helper`가 나옵니다.

```text
(gdb) bt
#0  compute (v=2) at tail.c:6
#1  0x0000aaaaaaaa0838 in helper (v=<optimized out>) at tail.c:11
#2  0x0000aaaaaaaa068c in main (argc=<optimized out>, argv=<optimized out>) at tail.c:15
(gdb) frame 1
(gdb) info frame
Stack level 1, frame at 0xfffffffffa90:
 pc = 0xaaaaaaaa0838 in helper (tail.c:11); saved pc = 0xfffff7e1225c
 tail call frame, caller of frame at 0xfffffffffa90
```

`info frame`의 `tail call frame`이 답입니다. GDB 매뉴얼 Tail Call Frames 절에 따르면 GDB는 컴파일러가 남긴 `DW_TAG_call_site` 정보로 꼬리 호출을 알아내면 "fictitious call frame"을 만들고, GCC에서는 `-O -g`로 빌드해야 이 정보가 생깁니다. `readelf --debug-dump=info tail`로 보면 `helper` 안에 `DW_AT_call_tail_call: 1`과 `DW_AT_call_return_pc: 0x838`을 가진 `DW_TAG_call_site`가 있습니다. `pc = 0x...0838`은 바로 이 값으로, `helper`의 마지막 명령(`0x834`) 뒤의 가상 반환 지점입니다. lldb 19.1.7도 같은 프레임을 `[artificial]` 표시와 함께 보여 줬습니다.

```text
(lldb) bt
  * frame #0: 0x0000aaaaaaaa0800 tail`compute(v=2) at tail.c:5:46
    frame #1: 0x0000aaaaaaaa0838 tail`helper(v=<unavailable>) at tail.c:11:12 [artificial]
    frame #2: 0x0000aaaaaaaa068c tail`main(argc=<unavailable>, argv=<unavailable>) at tail.c:15:12
```

재구성된 프레임에는 인자 값이 없습니다(`v=<optimized out>`). `-fno-optimize-sibling-calls`로 다시 빌드하면 `helper`가 진짜 프레임이 되어 반환 주소가 `0x...0840`으로 바뀝니다. 재구성은 `DW_TAG_call_site`가 있을 때만 되므로, 디버그 정보가 부족한 바이너리에서 중간 프레임이 빠져 보인다면 sibling call을 의심합니다.

---

## *재귀의 backtrace*

재귀 호출은 호출마다 별도 프레임이 생깁니다. `fact.c`에서 `n == 2`일 때 멈추면 같은 반환 주소(`0x...07d4`)가 세 번 반복됩니다.

```text
(gdb) bt
#0  factorial (n=2) at fact.c:6
#1  0x0000aaaaaaaa07d4 in factorial (n=3) at fact.c:7
#2  0x0000aaaaaaaa07d4 in factorial (n=4) at fact.c:7
#3  0x0000aaaaaaaa07d4 in factorial (n=5) at fact.c:7
#4  0x0000aaaaaaaa0808 in main () at fact.c:13
(gdb) frame 3
#3  0x0000aaaaaaaa07d4 in factorial (n=5) at fact.c:7
7	    result = n * factorial(n - 1);
(gdb) info args
n = 5
```

스택 오버플로로 죽은 깊은 재귀라면 `bt 20`과 `bt -5`로 안쪽과 바깥쪽만 보고, 반복되는 반환 주소와 인자의 변화로 패턴을 읽습니다.

---

## *모든 스레드의 backtrace*

`thread apply all bt`는 모든 스레드의 스택을 한 번에 보여 줍니다. 어느 스레드가 어디서 멈췄는지 모를 때, 특히 프로그램이 응답하지 않을 때 가장 먼저 칩니다. 아래는 두 스레드가 mutex 두 개를 반대 순서로 잡는 `dead.c`를 실행해 두고 GDB로 붙은 결과입니다.

```c title="dead.c (10~18행)"
void* worker(void* arg) {
    struct pair* p = arg;
    pthread_mutex_lock(p->first);
    sleep(1);
    pthread_mutex_lock(p->second);
    pthread_mutex_unlock(p->second);
    pthread_mutex_unlock(p->first);
    return NULL;
}
```

```text
$ ./dead &
$ gdb -q -batch -p <pid> -ex "thread apply all bt" -ex "print m1" -ex "print m2"

Thread 3 (Thread 0xffff934bf180 (LWP 5987) "dead"):
#0  futex_wait (futex_word=0xaaaac98f0090 <m2>, expected=2, private=0) at ../sysdeps/nptl/futex-internal.h:146
#1  __GI___lll_lock_wait (futex=futex@entry=0xaaaac98f0090 <m2>, private=private@entry=0) at ./nptl/lowlevellock.c:49
#2  0x0000ffff93549750 [PAC] in lll_mutex_lock_optimized (mutex=0xaaaac98f0090 <m2>) at ./nptl/pthread_mutex_lock.c:48
#3  ___pthread_mutex_lock (mutex=0xaaaac98f0090 <m2>) at ./nptl/pthread_mutex_lock.c:93
#4  0x0000aaaac98d091c [PAC] in worker (arg=0xffffd7ec67c0) at dead.c:14
...
Thread 2 (Thread 0xffff92caf180 (LWP 5988) "dead"):
#0  futex_wait (futex_word=0xaaaac98f0060 <m1>, expected=2, private=0) at ../sysdeps/nptl/futex-internal.h:146
...
#4  0x0000aaaac98d091c [PAC] in worker (arg=0xffffd7ec67b0) at dead.c:14
...
Thread 1 (Thread 0xffff936b2020 (LWP 5986) "dead"):
...
#6  0x0000aaaac98d09c4 [PAC] in main () at dead.c:25

$1 = {__data = {__lock = 2, __count = 0, __owner = 5987, __nusers = 1, ...
$2 = {__data = {__lock = 2, __count = 0, __owner = 5988, __nusers = 1, ...
```

두 `worker`가 모두 14행(두 번째 `lock`)에서 기다리고, 스레드 3은 `m2`를, 스레드 2는 `m1`을 기다립니다. 이것만으로는 데드락이라고 단정할 수 없습니다. 결정적인 것은 glibc `pthread_mutex_t`의 `__owner` 필드입니다. `m1`의 소유자는 LWP 5987(스레드 3)이고 `m2`의 소유자는 LWP 5988(스레드 2)이므로 "3은 2가 가진 `m2`를, 2는 3이 가진 `m1`을 기다린다"는 사이클이 완성됩니다.

프레임 주소 옆의 `[PAC]`는 그 함수의 link register 값이 arm64 Pointer Authentication으로 서명돼 있어 GDB가 서명 비트를 벗겨 냈다는 표시입니다(GDB 매뉴얼 AArch64 절). 이 출력에서는 libc 프레임뿐 아니라 `dead.c`의 `worker`·`main` 프레임에도 붙었습니다.

LLDB에서는 `bt all`이 같은 일을 하고, 풀 명령은 `thread backtrace all`입니다. 멀티스레드 디버깅은 [Ch 6](/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess)에서 자세히 다룹니다.

---

## *부분 스택* — 깨진 스택

스택 버퍼 오버런이 저장된 FP·LR까지 덮어쓰면 디버거는 그 위로 올라갈 수 없습니다. 아래 `smash.c`는 16바이트 버퍼에 `0x41`(`'A'`)을 64바이트 씁니다. `-fno-stack-protector`로 빌드해 canary 검사를 껐습니다.

```c title="smash.c (6~13행)"
__attribute__((noinline)) void victim(int n) {
    char buf[16];
    fill(buf, n);
}

__attribute__((noinline)) void caller(int n) { victim(n); }

int main(void) {
    caller(64);
```

```text
Program received signal SIGBUS, Bus error.
0x0041414141414141 in ?? ()
(gdb) bt
#0  0x0041414141414141 in ?? ()
#1  0x4141414141414141 in ?? ()
Backtrace stopped: previous frame identical to this frame (corrupt stack?)
(gdb) info registers x29 x30 sp pc
x29            0x4141414141414141  4702111234474983745
x30            0x4141414141414141  4702111234474983745
sp             0xfffffffffa90      0xfffffffffa90
pc             0x41414141414141    0x41414141414141
```

`victim`의 디스어셈블리(`stp x29, x30, [sp, #-48]!`, `add x0, sp, #0x20`)를 보면 GCC는 arm64에서 저장할 x29·x30을 프레임 *맨 아래*에 두고 `buf`를 그 위(`sp+0x20`)에 둡니다. 그래서 오버런은 `victim` 자신의 저장값이 아니라 그 위에 있는 `caller` 프레임의 저장된 x29·x30을 `'A'`로 덮었습니다. `victim`은 정상 반환했고, `caller`가 덮인 값을 복원해 `ret`하는 순간 PC가 `0x0041414141414141`이 되어 SIGBUS가 났습니다. GDB는 덮인 FP로 한 칸 더 가 본 뒤 같은 프레임이 반복되자 멈췄습니다. lldb 19.1.7은 `stop reason = signal SIGBUS: illegal alignment`와 `frame #0: 0x0000414141414141` 한 줄만 보여 줬습니다.

이럴 때는 스택을 손으로 읽습니다.

```text
(gdb) x/8xg $sp
0xfffffffffa90:	0x4141414141414141	0x4141414141414141
0xfffffffffaa0:	0x0000fffffffffb30	0x0000aaaaaaaa081c
0xfffffffffab0:	0x0000000100000000	0x0000fffffffffc18
(gdb) info symbol 0xaaaaaaaa081c
main in section .text of /root/ch04/smash
(gdb) x/2i 0xaaaaaaaa0818
   0xaaaaaaaa0818 <caller+28>:	ret
   0xaaaaaaaa081c <main>:	stp	x29, x30, [sp, #-16]!
```

`'A'` 바로 위에 덮이지 않은 값이 보이고, 그중 `0x...081c`는 `main`의 *첫 명령* 주소입니다. 반환 주소라면 `bl` 바로 다음 명령이어야 하므로 이 값은 반환 주소가 아니라 스택에 남아 있던 다른 값입니다. 손으로 따라갈 때는 이처럼 후보 주소마다 `x/2i 주소-4`로 바로 앞이 `bl`인지 확인합니다.

`bt no-filters`는 Python frame filter만 끄는 옵션이라 깨진 스택을 복구하지 못합니다. 깨진 스택의 원인은 오버런 자체이므로, [Sanitizers](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)의 ASan이나 stack protector로 *쓰는 순간*을 잡는 편이 빠릅니다.

---

## step에서 외부 함수 진입 건너뛰기

`step`은 호출이 있으면 무조건 안으로 들어가서, 관심 없는 헬퍼나 라이브러리 안으로 빠지기 일쑤입니다. `skip`은 지정한 함수로 `step`이 *들어가지 않게* 합니다. backtrace에서 프레임을 숨기는 기능은 아닙니다.

```c title="skipdemo.c (5~10행)"
int helper_len(const char* s) { return (int)strlen(s); }
int work(const char* s) { return helper_len(s) * 2; }

int main(void) {
    int r = work("hello");
    printf("%d\n", r);
```

```text
Breakpoint 1, main () at skipdemo.c:9
9	    int r = work("hello");
(gdb) skip function helper_len
Function helper_len will be skipped when stepping.
(gdb) step
work (s=0xaaaaaaaa0878 "hello") at skipdemo.c:6
6	int work(const char* s) { return helper_len(s) * 2; }
(gdb) step
main () at skipdemo.c:10
10	    printf("%d\n", r);
(gdb) step
__printf (format=0xaaaaaaaa0880 "%d\n") at ./stdio-common/printf.c:28
```

`work` 안의 `helper_len` 호출은 건너뛰었지만 `printf`에서는 libc 안으로 들어갔습니다. `libc6-dbg`가 깔려 있어 libc에도 줄 정보가 있기 때문입니다. 정규식으로 한 번에 막을 수 있습니다.

```text
(gdb) skip -rfunction ^_*printf
Function(s) ^_*printf will be skipped when stepping.
(gdb) step
11	    return 0;
(gdb) info skip
Num   Enb Glob File                 RE Function
1     y      n <none>                y ^_*printf
```

`skip disable N`·`skip enable N`으로 끄고 켭니다.

---

## *coredump의 backtrace*

core 파일은 프로세스가 죽은 순간의 메모리와 레지스터 스냅샷이라, 살아 있는 프로세스와 같은 방식으로 `bt`를 풉니다. 이 VM은 `core_pattern`이 `systemd-coredump`로 설정돼 있어 `coredumpctl`로 core를 꺼냈습니다.

```text
$ ulimit -c unlimited; ./crash
1
Segmentation fault      (core dumped) ./crash
$ coredumpctl dump -o crash.core crash
$ gdb -q ./crash crash.core
Core was generated by `./crash'.
Program terminated with signal SIGSEGV, Segmentation fault.
#0  0x0000aaaad78f07b8 in deepest (n=0x0) at crash.c:6
(gdb) bt
#0  0x0000aaaad78f07b8 in deepest (n=0x0) at crash.c:6
#1  0x0000aaaad78f07f0 in deeper (n=0xffffc6bd5c70) at crash.c:7
#2  0x0000aaaad78f0818 in deep (n=0xffffc6bd5c70) at crash.c:8
#3  0x0000aaaad78f0854 in main () at crash.c:13
```

디버거 밖에서 실행했으므로 ASLR이 켜져 있어 주소가 `0xaaaad78f...`로 바뀌었고, 함수·줄 번호는 같습니다. 자세한 분석은 [Ch 7](/blog/tools/debugging/gdb-lldb/chapter07-core-dump)에서 다룹니다.

---

## *공유 라이브러리* 프레임의 함정

라이브러리 프레임에 줄 번호 없이 `from /lib/...`만 붙어 있으면 그 라이브러리의 디버그 정보를 찾지 못한 것입니다. `libc6-dbg`가 설치된 VM에서 GDB의 디버그 파일 경로를 일부러 없는 디렉터리로 바꿔 그 상태를 재현했습니다.

```text
$ gdb -q -iex "set debug-file-directory /nonexistent" -ex "break malloc" -ex run -ex bt ./lib
Breakpoint 1, 0x0000fffff7e87814 in malloc () from /lib/aarch64-linux-gnu/libc.so.6
#0  0x0000fffff7e87814 in malloc () from /lib/aarch64-linux-gnu/libc.so.6
#1  0x0000aaaaaaaa07f8 [PAC] in main () at lib.c:2
```

기본 경로(`/usr/lib/debug`)로 두면 같은 호출이 glibc 내부 이름과 소스 위치까지 나옵니다.

```text
Breakpoint 2.1, __GI___libc_malloc (bytes=24) at ./malloc/malloc.c:3392
warning: 3392	./malloc/malloc.c: No such file or directory
#0  __GI___libc_malloc (bytes=24) at ./malloc/malloc.c:3392
#1  0x0000aaaaaaaa07f8 in main () at lib.c:2
```

`No such file or directory`는 디버그 *정보*는 있지만 glibc *소스*는 설치하지 않았다는 뜻입니다. 이 예에서는 `break main`으로 먼저 멈춘 뒤 `break malloc`을 걸었습니다. 처음부터 `break malloc`을 걸면 디버그 정보가 있는 `ld.so`의 내부 `malloc`에 먼저 멈춰(`Breakpoint 1.22, malloc (size=1505) at ../include/rtld-malloc.h:56`) 동적 링커의 초기화 스택이 나옵니다.

Debian 13에서 이 실습에 쓴 디버그 패키지는 다음 두 개입니다.

```bash
sudo apt install libc6-dbg libstdc++6-14-dbg
```

디버그 패키지를 깔지 않고 build-id로 내려받는 debuginfod는 [Ch 7](/blog/tools/debugging/gdb-lldb/chapter07-core-dump)에서 다룹니다.

---

## 정리

- **`backtrace`** — 호출 스택을 봅니다. `bt N`·`bt -N`은 안쪽·바깥쪽 일부, `bt full`은 지역 변수까지 보여 주지만 아직 대입 전인 값은 쓰레기입니다.
- **`frame N`** / **`up`** / **`down`** — 보는 프레임을 바꿉니다. `up`이 호출자 쪽입니다. LLDB는 `main` 아래 libc 프레임까지 셉니다.
- **`info frame`** — `saved pc`와 저장된 x29·x30 위치를 보여 줍니다. 손으로 스택을 따라갈 때의 출발점입니다.
- 인라인 함수는 GDB에서 `inlined into frame 1`인 가상 프레임으로 나옵니다. lldb 19.1.7은 같은 바이너리에서 `square`에 다른 자리를 골랐습니다.
- sibling call로 사라진 프레임을 GDB 16.3은 `tail call frame`으로, LLDB는 `[artificial]`로 재구성했습니다.
- **`thread apply all bt`** + mutex의 `__owner`로 대기 사이클을 확인해야 데드락이라고 말할 수 있습니다.
- 덮인 FP·LR은 `Backtrace stopped: ... (corrupt stack?)`로 끝납니다. `x/8xg $sp`로 남은 값을 읽되 반환 주소인지 따로 확인합니다.
- `skip`은 step의 진입만 막습니다. 라이브러리 프레임의 `from /lib/...`는 디버그 정보가 없다는 신호입니다.

## 다음 장 예고

[Ch 5: Breakpoint와 Watchpoint](/blog/tools/debugging/gdb-lldb/chapter05-breakpoints-watchpoints)에서는 *멈출 자리*를 더 깊이 다룹니다. 조건부 break의 변형, watchpoint(변수 변경 시 멈춤), hardware vs software breakpoint.

## 참고 자료

- [GDB Backtrace](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Backtrace.html)
- [LLDB Examining Thread State](https://lldb.llvm.org/use/tutorial.html#examining-thread-state)

## 관련 항목

- [Ch 3: 상태 검사](/blog/tools/debugging/gdb-lldb/chapter03-inspecting-state) — 이전 장, 프레임 안 변수 읽기
- [Ch 5: 브레이크포인트와 워치포인트](/blog/tools/debugging/gdb-lldb/chapter05-breakpoints-watchpoints) — 다음 장, 멈출 자리 정하기
- [Ch 7: core dump 분석](/blog/tools/debugging/gdb-lldb/chapter07-core-dump) — 죽은 프로세스의 backtrace
- [DWARF Call Frame Information](/blog/tools/debugging/dwarf-elf/chapter05-cfi-eh-frame) — unwinding이 실제로 도는 방식
- [GDB로 Core 분석](/blog/tools/debugging/postmortem/chapter03-gdb-core-analysis) — 사후 스택 복원 워크플로
- [DWARF Debugging Standard](https://dwarfstd.org/) — CFI 규격 원문
