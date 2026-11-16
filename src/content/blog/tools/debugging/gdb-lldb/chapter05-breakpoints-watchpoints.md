---
title: "Breakpoint와 Watchpoint 분석 — Conditional·Hardware·Catchpoint"
slug: "tools/debugging/gdb-lldb/chapter05-breakpoints-watchpoints"
date: 2026-05-24T09:05:00
description: "조건부 break, watchpoint(변수 변경 추적), catchpoint, hardware vs software."
tags: [gdb, lldb, Breakpoint, Watchpoint]
series: "GDB and LLDB"
seriesOrder: 5
draft: false
topics: ["tools", "tools/debugging"]
---

## Breakpoint — *멈출 자리*를 정밀하게

[Ch 2](/blog/tools/debugging/gdb-lldb/chapter02-basic-commands)에서 `break`의 기본을 봤습니다. 이 장은 *조건부 break*, *watchpoint*, *catchpoint*, 그리고 *hardware vs software* 차이를 다룹니다. breakpoint가 "이 문 앞에 오면 세워라"라면, watchpoint는 "이 금고가 열리면 세워라"이고, catchpoint는 "경보(예외·시그널·시스템 콜)가 울리면 세워라"입니다.

모든 출력은 아래 실습 프로그램 `bp.cpp` 하나를 Debian 13 arm64의 GDB 16.3, lldb 19.1.7로 실행해 얻었습니다(`g++ -g -O0 bp.cpp -o bp`). 시간 측정은 6 vCPU QEMU HVF 게스트(Apple M2 Pro 호스트)에서 5회 실행의 중앙값입니다.

```cpp title="bp.cpp (발췌)"
int balance = 100;                          // 16행
Account my_struct = {42, {0, 0, 0}};        // 17행, struct Account { int value; int pad[3]; };
int big_array[1024];

void process_withdrawal(int amount) { balance -= amount; }   // 22행
void bug_function() { balance = -1; }                         // 23행
void buggy_function() { my_struct.value = -1; }               // 24행
int reader() { return balance + 1; }                          // 25행

void process(Record& r) { r.value += 1; }                     // 36행

int main(int argc, char** argv) {
    std::vector<Record> data(10000);
    for (int i = 0; i < 10000; i++) data[i] = {i, (i % 7 == 0) ? 0 : 1};
    for (int i = 0; i < 10000; i++) {
        if (data[i].value == 0) {
            process(data[i]);                                 // 43행
        }
    }
    process_withdrawal(50); reader(); bug_function(); buggy_function(); inner();
    ...  // parse_data("abcdef")가 runtime_error를, data.at(20000)이 out_of_range를 던짐
    ...  // raise(SIGPIPE), dlopen("./libplugin.so"), fork() + execl("/bin/true")
}
```

`value`가 0인 레코드는 `i % 7 == 0`인 1429개(0, 7, …, 9996)이고, `process`는 정확히 1429번 호출됩니다.

---

## 조건부 Breakpoint — `if`

깊은 루프 안의 *특정 상황만* 잡습니다. `printf` 디버깅이라면 1만 번 출력 중 하나를 눈으로 찾아야 하지만, 조건부 breakpoint는 그 한 번에만 멈춥니다.

```text
(gdb) break 43 if i == 5234 && data[i].value == 0
Breakpoint 1 at 0x146c: file bp.cpp, line 43.
(gdb) break 43 if i == 5236 && data[i].value == 0
Note: breakpoint 1 also set at pc 0x146c.
Breakpoint 2 at 0x146c: file bp.cpp, line 43.
(gdb) run
Breakpoint 2, main (argc=1, argv=0xfffffffffc08) at bp.cpp:43
43	            process(data[i]);
(gdb) print data[i]
$2 = {id = 5236, value = 0}
```

1번은 한 번도 멈추지 않았습니다. 5234는 7의 배수가 아니라 `data[5234].value`가 1이므로 43행에 아예 도달하지 않기 때문입니다. 조건이 거짓이면 GDB는 아무 말 없이 지나가므로, 조건부 breakpoint가 안 걸릴 때는 조건 자체가 그 자리에서 참이 될 수 있는지부터 의심합니다.

### 조건 표현식 — *어디까지 가능한가*

조건에는 현재 언어(C/C++)의 식을 씁니다.

```text
b 42 if x > 100 && y < 0          # 논리 연산
b 42 if my_func(x) != 0           # 함수 호출 (대상 프로세스에서 실제 실행)
b 42 if $_streq(s, "key")         # 문자열 (Ch 2 참고)
b 42 if ((Node*)p)->next == NULL  # 캐스팅
b 42 if i == count - 1            # 산술
```

문자열 비교에 `strcmp`를 그대로 쓰면 GDB 16.3에서 반환 타입 오류가 나고 조건과 상관없이 멈춘다는 점은 [Ch 2](/blog/tools/debugging/gdb-lldb/chapter02-basic-commands)에서 확인했습니다.

조건은 공짜가 아닙니다. 소프트웨어 breakpoint는 조건이 거짓이어도 매번 프로세스를 멈추고, GDB가 식을 평가한 뒤 다시 재개합니다. 아래 `ignore` 절에서 이 비용을 직접 잽니다.

### `commands` — Breakpoint에 *동작 첨부*

`commands N`으로 breakpoint에 명령 목록을 붙이면 멈출 때마다 자동으로 실행됩니다. `silent`는 멈춤 안내를 끄고, `printf`는 원하는 형식으로 찍고, 마지막 `continue`는 다시 달리게 합니다. 코드를 고치지 않고 로그를 꽂는 방법입니다.

```text
(gdb) break process
Breakpoint 1 at 0x136c: file bp.cpp, line 36.
(gdb) commands 1
Type commands for breakpoint(s) 1, one per line.
End with a line saying just "end".
>silent
>printf "process: id=%d value=%d\n", r.id, r.value
>continue
>end
```

### Ignore Count — *N번 무시*

`ignore N K`는 N번 breakpoint를 다음 K번 그냥 지나가게 합니다. 위 `commands`에 `ignore 1 1425`를 더해 실행하면 1429번 중 마지막 4번만 로그가 찍힙니다.

```text
(gdb) ignore 1 1425
Will ignore next 1425 crossings of breakpoint 1.
(gdb) run
process: id=9975 value=0
process: id=9982 value=0
process: id=9989 value=0
process: id=9996 value=0
...
(gdb) info breakpoints
Num     Type           Disp Enb Address            What
1       breakpoint     keep y   0x0000aaaaaaaa136c in process(Record&) at bp.cpp:36
	breakpoint already hit 1429 times
        silent
        printf "process: id=%d value=%d\n", r.id, r.value
        continue
```

무시한 1425번도 `hit` 횟수에 들어갑니다. 무시도 결국 *멈춘 뒤 다시 재개하는 것*이기 때문입니다. 같은 1429번째 호출에서 멈추는 두 방법을 `gdb -batch`로 5회씩 재 봤습니다.

| 방법 | 명령 | 중앙값 |
|------|------|--------|
| breakpoint 없음 | `run` | 0.115 s |
| ignore count | `break process` + `ignore 1 1428` | 0.274 s |
| 조건 | `break process if r.id == 9996` | 0.342 s |
| (참고) 디버거 없이 실행 | `./bp` | 0.001 s |

breakpoint 없는 실행을 빼면 ignore는 1428번에 약 0.16초(한 번에 0.11 ms), 조건은 1429번에 약 0.23초(한 번에 0.16 ms)였습니다. ignore가 조건식 평가만큼 더 빠르지만, 두 방법 모두 매번 멈추고 재개하는 비용은 같이 냅니다. 수백만 번 지나가는 자리라면 둘 다 느리므로 breakpoint 위치를 루프 밖으로 옮기는 편이 낫습니다.

---

## 임시 / 일회성 Breakpoint

`tbreak`(`tb`)는 한 번 멈추면 스스로 지워집니다. `run`을 반복할 때 시작점을 잡는 용도로 씁니다. 멈춘 직후 `info breakpoints`가 비어 있습니다.

```text
(gdb) tbreak main
Temporary breakpoint 1 at 0x13a8: file bp.cpp, line 39.
(gdb) run
Temporary breakpoint 1, main (argc=1, argv=0xfffffffffc08) at bp.cpp:39
(gdb) info breakpoints
No breakpoints, watchpoints, tracepoints, or catchpoints.
(gdb) tb inner
Temporary breakpoint 3 at 0xaaaaaaaa12a8: file bp.cpp, line 28.
```

LLDB에서는 `-o true`(`--one-shot true`)입니다.

```text
(lldb) breakpoint set -o true -n main
Breakpoint 1: where = bp`main + 28 [inlined] std::__new_allocator<Record>::__new_allocator() at new_allocator.h:88:49, address = 0x00000000000013a8
```

LLDB가 `main`의 breakpoint 위치를 `std::vector` 생성자 안에 인라인된 할당자 코드로 표시한 점이 눈에 띕니다. 주소(`0x13a8`)는 GDB와 같고, 그 주소에 걸린 가장 안쪽 인라인 정보를 보여 준 것입니다.

### `rbreak` — 정규식 매칭

`rbreak 정규식`은 이름이 맞는 모든 함수에 breakpoint를 겁니다. 범위를 좁히지 않으면 공유 라이브러리까지 뒤집니다. `rbreak ^handle_.*`는 `bp.cpp`의 두 함수 외에 `ld.so`·`libc`의 `handle_preload_list`·`handle_requests`·`handle_fildes_io`에도 걸렸습니다. 파일을 앞에 붙이면 그 파일 안으로 제한됩니다.

```text
(gdb) rbreak bp.cpp:^handle_
Breakpoint 4 at 0xaaaaaaaa1224: file bp.cpp, line 21.
void handle_close();
Breakpoint 5 at 0xaaaaaaaa11f4: file bp.cpp, line 20.
void handle_open(char const*);
Successfully created breakpoints 4-5.
```

---

## Watchpoint — *변수 변경 추적*

어떤 변수가 *어디서 망가졌는지* 모를 때, 코드 전체를 뒤지는 대신 그 변수의 메모리를 감시합니다. `watch`는 값이 바뀔 때, `-location`은 식이 아니라 *주소*를 감시하므로 스코프와 상관없이 그 메모리를 계속 봅니다.

```text
(gdb) watch balance
Hardware watchpoint 2: balance
(gdb) watch -location my_struct.value
Hardware watchpoint 3: -location my_struct.value
(gdb) continue
Hardware watchpoint 2: balance

Old value = 100
New value = 50
process_withdrawal (amount=50) at bp.cpp:22
22	void process_withdrawal(int amount) { balance -= amount; }
(gdb) continue
Hardware watchpoint 2: balance

Old value = 50
New value = -1
bug_function () at bp.cpp:23
23	void bug_function() { balance = -1; }
(gdb) continue
Hardware watchpoint 3: -location my_struct.value

Old value = 42
New value = -1
buggy_function () at bp.cpp:24
24	void buggy_function() { my_struct.value = -1; }
```

`balance`를 -1로 만든 범인이 23행이라는 것을 코드를 한 줄도 읽지 않고 찾았습니다. GDB 매뉴얼 Set Watchpoints 절에 따르면 hardware watchpoint는 값을 바꾼 바로 그 명령에서, software watchpoint는 바꾼 다음 *문장*에서 변경을 보고합니다.

LLDB에서는 `watchpoint set variable`이고, 접근 종류는 `-w`로 줍니다. lldb 19.1.7의 `help watchpoint set variable`이 보여 주는 값은 `read | write | modify | read_write`이고, 기본은 값이 바뀔 때만 멈추는 `modify`(`type = m`)입니다. `watchpoint list`가 하드웨어 watchpoint 개수도 알려 줍니다.

```text
(lldb) watchpoint set variable balance
Watchpoint created: Watchpoint 1: addr = 0xaaaaaaac0108 size = 4 state = enabled type = m
(lldb) watchpoint set variable -w read_write my_struct.value
Watchpoint created: Watchpoint 2: addr = 0xaaaaaaac0110 size = 4 state = enabled type = rw
(lldb) watchpoint list
Number of supported hardware watchpoints: 4
...
(lldb) continue

Watchpoint 1 hit:
old value: 100
new value: 50
...
    frame #0: 0x0000aaaaaaaa1254 bp`process_withdrawal(amount=50) at bp.cpp:22:58
```

### 종류 — `rwatch`, `awatch`

```text
(gdb) watch x          # 쓰기 (값 변경)
(gdb) rwatch x         # 읽기
(gdb) awatch x         # 읽기 + 쓰기 (access)
```

세 종류를 `balance` 하나에 함께 걸고 실행하면 차이가 그대로 보입니다. `balance -= amount`는 읽고 쓰는 문장이라 한 줄에서 read와 write가 따로 잡히고, `reader()`의 `balance + 1`에서는 read만 잡힙니다.

```text
(gdb) rwatch balance
Hardware read watchpoint 4: balance
(gdb) awatch balance
Hardware access (read/write) watchpoint 5: balance
(gdb) continue
Hardware read watchpoint 4: balance
Value = 100
Hardware access (read/write) watchpoint 5: balance
Value = 100
0x0000aaaaaaaa1240 in process_withdrawal (amount=50) at bp.cpp:22
(gdb) continue
Hardware watchpoint 2: balance
Old value = 100
New value = 50
Hardware access (read/write) watchpoint 5: balance
Old value = 100
New value = 50
process_withdrawal (amount=50) at bp.cpp:22
(gdb) continue
Hardware read watchpoint 4: balance
Value = 50
...
reader () at bp.cpp:25
```

프로그램이 끝날 무렵 `info watchpoints`는 `watch`가 2번, `rwatch`가 3번(`process_withdrawal`, `reader`, 마지막 `printf`), `awatch`가 5번 맞았다고 셌습니다. `rwatch`가 멈췄다면 그 변수를 읽는 코드가 실행됐다는 증거입니다. 반대로 한 번의 실행에서 멈추지 않았다고 해서 읽는 코드가 없다는 뜻은 아닙니다.

### Hardware vs Software Watchpoint

hardware watchpoint는 CPU의 디버그 레지스터에 감시 주소를 넣고, CPU가 그 주소에 접근하는 순간 예외를 냅니다. 프로그램은 제 속도로 달립니다. 개수는 CPU가 정합니다. 이 VM의 커널은 부팅 때 이렇게 보고했습니다.

```text
[    0.077873] hw-breakpoint: found 6 breakpoint and 4 watchpoint registers.
```

LLDB의 `Number of supported hardware watchpoints: 4`와도 맞습니다. GDB에서 4바이트 watchpoint를 다섯 개 걸면 등록은 되지만 `continue`할 때 다섯 번째에서 실패합니다. 크기가 큰 식은 처음부터 software로 등록됩니다. 4096바이트 배열 `big_array`가 그랬습니다.

```text
(gdb) watch big_array
Watchpoint 11: big_array
(gdb) watch big_array[0]
Hardware watchpoint 12: big_array[0]
...
(gdb) watch big_array[4]
Hardware watchpoint 16: big_array[4]
(gdb) continue
Warning:
Could not insert hardware watchpoint 16.
Could not insert hardware breakpoints:
You may have requested too many hardware breakpoints/watchpoints.

Command aborted.
```

`Watchpoint 11`에는 `Hardware`가 붙지 않았습니다. software watchpoint는 GDB가 프로그램을 한 명령씩 실행하며 값을 비교하는 방식입니다(GDB 매뉴얼 Set Watchpoints 절). `set can-use-hw-watchpoints 0`으로 software를 강제하고 `balance`의 첫 변경까지 걸리는 시간을 쟀습니다. 그 사이에 1만 번 도는 루프가 두 개 있습니다.

| 방식 | 명령 | 첫 변경(100 → 50)까지 중앙값 |
|------|------|------------------------------|
| hardware | `watch balance` | 0.119 s |
| software | `set can-use-hw-watchpoints 0` + `watch balance` | 37.425 s |

같은 결과(`Old value = 100`, `New value = 50`)를 얻는 데 약 300배가 걸렸습니다. 매뉴얼도 software watchpoint를 "hundreds of times slower than normal execution"이라고 적고 있습니다. software watchpoint는 짧은 구간에만 쓰고, 감시 범위가 크면 레지스터에 들어가는 크기(이 VM에서는 4개)로 쪼개 hardware로 겁니다.

### Watchpoint 함정 — *스코프*

지역 변수에 건 watchpoint는 그 함수가 끝나면 함께 사라집니다. 식이 가리키는 스택 슬롯이 더는 유효하지 않기 때문입니다.

```c
void inner() {
    int local = 0;
    for (int k = 0; k < 3; k++) local += k;
}
```

```text
Breakpoint 1, inner () at bp.cpp:28
28	    int local = 0;
(gdb) watch local
Hardware watchpoint 2: local
(gdb) continue
Old value = 50
New value = 0
...
Old value = 1
New value = 3
(gdb) continue
Watchpoint 2 deleted because the program has left the block in
which its expression is valid.
main (argc=1, argv=0xfffffffffc08) at bp.cpp:51
```

첫 `Old value = 50`은 초기화 전 스택에 남아 있던 값입니다. 함수가 끝난 뒤에도 그 *메모리*를 계속 보고 싶다면 `watch -location`을 씁니다.

---

## Catchpoint — *예외와 시그널*

catchpoint는 코드 위치가 아니라 *사건*에 멈춥니다.

```text
(gdb) catch throw                     # C++ 예외 throw
(gdb) catch catch                     # C++ 예외 catch
(gdb) catch throw std::out_of_range   # 이 타입만
(gdb) catch signal SIGPIPE            # 시그널
(gdb) catch syscall openat            # 시스템 콜
(gdb) catch fork                      # fork()
(gdb) catch exec                      # exec()
(gdb) catch load libplugin            # 이름이 맞는 라이브러리 로드
```

### C++ 예외

`catch throw`는 `__cxa_throw`에 멈춥니다. 스택이 풀리기 *전*이라 throw한 함수까지 backtrace에 남아 있습니다.

```text
Catchpoint 1 (exception thrown), 0x0000fffff7df99a0 in __cxa_throw () from /lib/aarch64-linux-gnu/libstdc++.so.6
(gdb) bt 4
#0  0x0000fffff7df99a0 in __cxa_throw () from /lib/aarch64-linux-gnu/libstdc++.so.6
#1  0x0000aaaaaaaa1340 [PAC] in parse_data (input=0xaaaaaaaa1fc0 "abcdef") at bp.cpp:33
#2  0x0000aaaaaaaa14cc in main (argc=1, argv=0xfffffffffc08) at bp.cpp:53
(gdb) continue
Catchpoint 2 (exception caught), 0x0000fffff7df82fc in __cxa_begin_catch () from /lib/aarch64-linux-gnu/libstdc++.so.6
```

타입을 붙이면 그 예외만 잡습니다. `catch throw std::out_of_range` 하나만 걸면 `runtime_error`는 지나가고 `data.at(20000)`의 범위 검사에서 멈춥니다.

```text
Catchpoint 1 (exception thrown), 0x0000fffff7df99a0 in __cxa_throw () from /lib/aarch64-linux-gnu/libstdc++.so.6
#0  0x0000fffff7df99a0 in __cxa_throw () from /lib/aarch64-linux-gnu/libstdc++.so.6
#1  0x0000fffff7df0f08 [PAC] in std::__throw_out_of_range_fmt(char const*, ...) () from /lib/aarch64-linux-gnu/libstdc++.so.6
#2  0x0000aaaaaaaa1a08 [PAC] in std::vector<Record, std::allocator<Record> >::_M_range_check (this=0xfffffffffa58, __n=20000) at /usr/include/c++/14/bits/stl_vector.h:1160
```

LLDB는 `breakpoint set -E c++`가 예외 breakpoint입니다. `__cxa_throw`와 `__cxa_rethrow` 두 곳에 걸립니다.

```text
(lldb) breakpoint set -E c++
Breakpoint 2: 2 locations.
(lldb) breakpoint list
2: Exception breakpoint (catch: off throw: on) using: names = {'__cxa_throw', '__cxa_rethrow'}, locations = 2, resolved = 2, hit count = 0
(lldb) continue
* thread #1, name = 'bp', stop reason = breakpoint 2.1 3.1
    frame #0: 0x0000fffff7df9980 libstdc++.so.6`__cxa_throw
(lldb) bt 3
  * frame #0: 0x0000fffff7df9980 libstdc++.so.6`__cxa_throw
    frame #1: 0x0000aaaaaaaa1340 bp`parse_data(input="abcdef") at bp.cpp:33:63
    frame #2: 0x0000aaaaaaaa14cc bp`main(argc=1, argv=0x0000fffffffffc48) at bp.cpp:53:21
```

`breakpoint 2.1 3.1`은 같은 주소에 걸어 둔 `breakpoint set -n __cxa_throw`(3번)도 함께 맞았다는 뜻입니다.

### `catch syscall` — 시스템 콜 추적

시스템 콜 이름은 *아키텍처의* 시스템 콜 표에 있어야 합니다. arm64 Linux에는 `open` 시스템 콜이 없고 `openat`만 있습니다.

```text
(gdb) catch syscall open openat
Unknown syscall name 'open'.
(gdb) catch syscall openat
Catchpoint 2 (syscall 'openat' [56])
(gdb) run
Catchpoint 2 (call to syscall openat), __GI___open64_nocancel (file=file@entry=0xfffff7fded10 "/etc/ld.so.cache", oflag=oflag@entry=524288)
    at ../sysdeps/unix/sysv/linux/open64_nocancel.c:39
(gdb) continue
Catchpoint 2 (returned from syscall openat), __GI___open64_nocancel (...)
(gdb) continue
Catchpoint 2 (call to syscall openat), __GI___open64_nocancel (file=file@entry=0xfffff7ff6770 "/lib/aarch64-linux-gnu/libstdc++.so.6",
```

진입(`call to`)과 반환(`returned from`)에서 각각 멈추고, 첫 `openat`이 동적 링커의 `/etc/ld.so.cache` 읽기라는 것까지 보입니다. `strace`와 달리 그 자리에서 인자와 호출 스택을 볼 수 있습니다.

### 시그널·라이브러리 로드·fork

```text
Catchpoint 4 (signal SIGPIPE), __pthread_kill_implementation (threadid=281474842415136, signo=signo@entry=13, no_tid=no_tid@entry=0)
(gdb) continue
Catchpoint 7
  Inferior loaded ./libplugin.so
__GI__dl_debug_state () at ./elf/dl-debug_state.c:28
(gdb) continue
plugin 7

Catchpoint 5 (forked process 7292), arch_fork (ctid=0xfffff7fed0f0) at ../sysdeps/unix/sysv/linux/arch-fork.h:41
(gdb) continue
[Detaching after fork from child process 7292]
```

`catch exec`는 멈추지 않았습니다. `execl`은 자식이 호출했는데, GDB의 기본 `follow-fork-mode`가 `parent`라 자식에서 떨어져 나왔기 때문입니다(`Detaching after fork`). 자식을 따라가는 방법은 [Ch 6](/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess)에서 다룹니다.

---

## Breakpoint *명시적 비활성화 / 활성화*

`enable`에는 횟수와 삭제를 붙일 수 있습니다. `enable count K N`은 K번 멈춘 뒤 비활성(`Disp`가 `dis`)으로 바뀌고, `enable delete N`은 한 번 멈추면 지워지는 임시 breakpoint로 바꿉니다.

```text
(gdb) disable 2-5
(gdb) enable count 2 2
(gdb) enable delete 3
(gdb) enable 4-5
(gdb) run
Breakpoint 1, main (argc=1, argv=0xfffffffffc08) at bp.cpp:39
(gdb) continue
Breakpoint 2, process (r=...) at bp.cpp:36
(gdb) continue
Breakpoint 2, process (r=...) at bp.cpp:36
(gdb) continue
Breakpoint 5, reader () at bp.cpp:25
(gdb) info breakpoints
2       breakpoint     dis  n   0x0000aaaaaaaa136c in process(Record&) at bp.cpp:36
	breakpoint already hit 2 times
3       breakpoint     del  y   0x0000aaaaaaaa1224 in handle_close() at bp.cpp:21
...
(gdb) continue
Breakpoint 4, buggy_function () at bp.cpp:24
(gdb) continue
Temporary breakpoint 3, handle_close () at bp.cpp:21
```

`process`는 1429번 불리지만 두 번 멈춘 뒤 꺼졌고, `handle_close`는 `Temporary breakpoint 3`으로 멈춘 뒤 목록에서 사라졌습니다.

---

## Hardware Breakpoint

`hbreak`는 코드를 고치지 않고 CPU의 breakpoint 비교 레지스터에 주소를 넣습니다. 일반 `break`는 그 주소의 명령을 trap 명령으로 바꿔 씁니다.

| 방식 | 동작 | 한계 | 사용 자리 |
|------|------|------|-----------|
| `break` (software) | 대상 메모리의 명령을 trap 명령으로 교체 | 그 메모리를 쓸 수 있어야 함 | 일반 코드 |
| `hbreak` (hardware) | CPU의 breakpoint 레지스터에 주소 등록 | 레지스터 개수(이 VM은 6개) | ROM·플래시처럼 쓸 수 없는 메모리 |

Linux 프로세스에서는 실행 중에만 hardware breakpoint를 쓸 수 있었습니다. 프로그램을 시작하기 전에 `hbreak main`을 치면 `No hardware breakpoint support in the target.`이 나오고, `break main`으로 멈춘 뒤에는 `Hardware assisted breakpoint 2 at 0xaaaaaaaa1260: file bp.cpp, line 23.`처럼 등록됩니다. 커널이 보고한 6개는 그대로 들어갔고(여섯 개를 걸고 continue하면 차례로 멈춤), 일곱 개를 걸자 `continue`에서 `Cannot insert hardware breakpoint`와 `You may have requested too many hardware breakpoints/watchpoints.`로 중단됐습니다.

[Ch 4](/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames)에서 libc의 `malloc`에 일반 `break`가 그대로 걸렸듯이, 공유 라이브러리처럼 읽기 전용으로 매핑된 코드도 `ptrace`로는 고쳐 쓸 수 있습니다. ROM·플래시가 있는 베어메탈 타깃은 [Ch 8](/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging)과 [JTAG·SWD·CoreSight 분석](/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight)에서 다룹니다.

---

## `commands`로 *자동 처리*

복잡한 동작을 breakpoint에 붙여 두면 반복 작업이 자동화됩니다. 위 `ignore` 절의 로깅이 첫 번째 예입니다. 같은 틀로 다음 패턴도 만들 수 있습니다.

```text
(gdb) break 50 if error_count > 0     # 조건이 참일 때만 상태를 덤프
(gdb) commands
> print error_message
> info locals
> bt 5
> continue
> end
```

```text
(gdb) break race_condition_func       # 멈출 때마다 변수를 강제로 바꿔 가설 검증
(gdb) commands
> set var shared_state = 0
> continue
> end
```

GDB 매뉴얼 Break Commands 절은 실행을 재개하는 명령(`continue`·`next`·`step` 등) 뒤에 적은 명령은 무시된다고 적고 있습니다. `continue`는 항상 마지막에 둡니다.

---

## *시그널* 처리

GDB는 시그널마다 멈출지(Stop), 알릴지(Print), 프로그램에 넘길지(Pass)를 따로 정합니다. GDB 16.3의 기본값 중 몇 개를 확인했습니다. `SIGINT`가 `Pass No`인 것은 GDB 자신이 쓰는 시그널이기 때문입니다. 매뉴얼 Signals 절은 `handle all`에서도 `SIGINT`와 `SIGTRAP`은 "used by GDB"라 제외된다고 적고 있습니다.

```text
(gdb) info signals SIGINT
Signal        Stop	Print	Pass to program	Description
SIGINT        Yes	Yes	No		Interrupt
(gdb) info signals SIGPIPE
Signal        Stop	Print	Pass to program	Description
SIGPIPE       Yes	Yes	Yes		Broken pipe
```

`bp.cpp`는 `signal(SIGPIPE, SIG_IGN)`으로 SIGPIPE를 무시한 뒤 `raise(SIGPIPE)`를 하는데도, GDB 아래에서는 `Program received signal SIGPIPE, Broken pipe.`로 멈췄습니다. 시그널은 프로그램에 전달되기 전에 디버거에게 먼저 보고되기 때문입니다. 소켓 코드처럼 SIGPIPE가 잦은 프로그램이라면 끄고 시작합니다.

```text
(gdb) handle SIGPIPE nostop noprint
Signal        Stop	Print	Pass to program	Description
SIGPIPE       No	No	Yes		Broken pipe
```

LLDB는 `process handle`이고, 실행 중인 프로세스가 있을 때 바꿨습니다.

```text
(lldb) process handle SIGPIPE --stop false --notify false
NAME         PASS   STOP   NOTIFY
===========  =====  =====  ======
SIGPIPE      true   false  false
```

---

## *동적 라이브러리* Breakpoint — pending

아직 `dlopen`되지 않은 라이브러리의 함수는 GDB가 모르는 이름입니다. 물어볼 때 `y`라고 하면 *pending* breakpoint가 되어, 라이브러리가 로드되는 순간 실제 주소로 바뀝니다.

```text
(gdb) break my_plugin_function
Function "my_plugin_function" not defined.
Make breakpoint pending on future shared library load? (y or [n]) y
Breakpoint 1 (my_plugin_function) pending.
(gdb) info breakpoints
Num     Type           Disp Enb Address    What
1       breakpoint     keep y   <PENDING>  my_plugin_function
(gdb) run
...
Breakpoint 1, my_plugin_function (x=7) at plugin.c:3
3	void my_plugin_function(int x) { printf("plugin %d\n", x); }
```

`.gdbinit`에서처럼 묻지 않고 만들려면 `set breakpoint pending on`을 씁니다.

---

## *실전 시나리오*

### 시나리오 1: 메모리가 망가지는 순간

`my_struct.value`가 처음엔 42였는데 어딘가에서 -1이 됩니다. 위 Watchpoint 절의 `watch -location my_struct.value`가 정확히 이 경우였고, `buggy_function () at bp.cpp:24`에서 멈췄습니다.

### 시나리오 2: 깊은 루프의 특정 자리

특정 레코드를 만났을 때만 상태를 덤프하려면 조건부 breakpoint에 `commands`를 붙입니다. 조건이 거짓인 동안에도 매번 멈췄다 재개하는 비용(위 표의 0.16 ms/회)은 듭니다.

```text
(gdb) b process if r.id == 9996
(gdb) commands
> bt 5
> info locals
> continue
> end
(gdb) run
```

### 시나리오 3: 예외 추적

어디서 `out_of_range`가 났는지는 `catch throw std::out_of_range` 한 줄이면 됩니다. 위 Catchpoint 절의 backtrace가 `_M_range_check (..., __n=20000)`까지 보여 줬습니다.

---

## 정리

- **조건부 break**는 조건이 거짓이어도 매번 멈췄다 재개합니다. 1429회 기준 조건 0.16 ms/회, `ignore` 0.11 ms/회였습니다.
- **`commands`** + `silent` + `printf` + `continue`로 코드 수정 없이 로그를 꽂습니다.
- **`watch`**는 값을 바꾼 명령 직후에 멈춥니다. `rwatch`·`awatch`는 읽기도 잡습니다.
- 이 VM은 hardware watchpoint 4개, hardware breakpoint 6개였습니다. 다섯 번째 watchpoint와 일곱 번째 `hbreak`는 `continue`에서 실패했습니다.
- software watchpoint는 같은 결과에 37.4초(hardware 0.12초)가 걸렸습니다.
- 지역 변수 watchpoint는 함수가 끝나면 지워집니다. 메모리 자체를 보려면 `watch -location`.
- **`catch`**: 예외(타입 지정 가능), 시그널, 시스템 콜(arm64에는 `open`이 없고 `openat`만), fork, 라이브러리 로드.
- **`enable count` / `enable delete`**, **`handle`**, *pending breakpoint*로 멈춤을 세밀하게 제어합니다.

## 다음 장 예고

[Ch 6: 멀티스레드 / 멀티프로세스](/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess)에서는 동시 실행 디버깅을 다룹니다. 스레드 전환, 데드락 진단, fork된 자식 따라가기.

## 참고 자료

- [GDB Breakpoints](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Breakpoints.html)
- [GDB Watchpoints](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Set-Watchpoints.html)
- [LLDB Breakpoint Commands](https://lldb.llvm.org/use/tutorial.html#setting-breakpoints)

## 관련 항목

- [Ch 4: 콜스택과 프레임](/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames) — 이전 장, 멈춘 뒤 스택 읽기
- [Ch 6: 멀티스레드 / 멀티프로세스](/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess) — 다음 장, 스레드별 멈춤 제어
- [Ch 9: Python 스크립팅](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting) — `commands` 대신 Python stop hook
- [GDB 커스텀 명령·Event 훅·Breakpoint](/blog/tools/debugging/gdb-extension/chapter02-commands-events) — Breakpoint를 코드로 다루기
- [JTAG·SWD·CoreSight 분석](/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight) — hardware breakpoint를 떠받치는 디버그 레지스터
- [GDB to LLDB 명령 대조표](https://lldb.llvm.org/use/map.html) — breakpoint·watchpoint 명령 매핑
