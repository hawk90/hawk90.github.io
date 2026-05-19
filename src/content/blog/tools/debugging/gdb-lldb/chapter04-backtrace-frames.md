---
title: "Ch 4: Backtrace와 프레임 이동"
date: 2026-05-17T04:00:00
description: "bt·frame·up·down — 호출 스택 분석, 프레임 안 변수 조사, 인라인 함수 처리."
tags: [gdb, lldb, Backtrace, Stack]
series: "GDB and LLDB"
seriesOrder: 4
draft: false
---

## 호출 스택은 *디버깅의 지도*

프로그램이 어떤 자리에 멈췄을 때, *어떻게 거기까지 왔는지*를 알아야 합니다. 답이 *호출 스택* (call stack)이고, 디버거가 보여 주는 게 *backtrace*.

```c
void deepest() { *(int*)0 = 1; }   // SIGSEGV

void deeper()  { deepest(); }
void deep()    { deeper(); }
int main()     { deep(); return 0; }
```

```
(gdb) run
Program received signal SIGSEGV, Segmentation fault.
0x000055555555512e in deepest () at crash.c:1

(gdb) backtrace
#0  0x000055555555512e in deepest () at crash.c:1
#1  0x0000555555555140 in deeper () at crash.c:3
#2  0x000055555555514c in deep () at crash.c:4
#3  0x0000555555555158 in main () at crash.c:5
```

*충돌이 deepest에서 일어났고*, 거기까지 deeper→deep→main 순으로 왔다는 사실이 한눈에. 이게 *bt의 가치*입니다.

---

## `backtrace` 변형

```
(gdb) backtrace         # 전체 스택
(gdb) bt                # 약어
(gdb) bt 5              # 안쪽 5 프레임만
(gdb) bt -5             # 바깥 5 프레임만
(gdb) bt full           # 변수 값까지 포함
(gdb) bt no-filters     # 필터 비활성화 (Python 필터 제거)
```

LLDB:
```
(lldb) thread backtrace
(lldb) bt
(lldb) bt 5
(lldb) bt all           # 모든 스레드
```

### `bt full` — 변수 포함

```
(gdb) bt full
#0  factorial (n=3) at hello.c:4
        result = <optimized out>
#1  factorial (n=4) at hello.c:5
        result = 6
#2  factorial (n=5) at hello.c:5
        result = 24
#3  main () at hello.c:10
        n = 5
        result = <optimized out>
```

각 프레임의 *지역 변수가 다 같이* 출력. 충돌 시점의 *전체 컨텍스트*를 빠르게 파악.

비용: *큰 함수나 STL 객체*는 출력이 매우 길어집니다. *전체*보다 *특정 프레임 들어가서 `info locals`*가 보통 빠름.

---

## `frame` — *특정 프레임 이동*

```
(gdb) frame 2           # 2번 프레임으로
(gdb) f 2               # 약어

#2  0x000055555555514c in deep () at crash.c:4
```

프레임을 *현재 위치*로 설정. 그 프레임 안의 *변수와 인자*를 볼 수 있게 됩니다.

```
(gdb) frame 2
(gdb) info locals
(gdb) info args
(gdb) print local_var       # 그 프레임의 변수
```

LLDB:
```
(lldb) frame select 2
(lldb) f 2
(lldb) frame variable       # = info locals + info args
```

### `up` / `down` — 상대적 이동

```
(gdb) up        # 한 단계 위 (호출자)
(gdb) up 3      # 3단계 위
(gdb) down      # 한 단계 아래 (피호출자)
(gdb) down 2
```

`up`은 *스택 깊이 줄임*(호출자 방향), `down`은 *깊어짐*. `bt`에서 *번호가 큰 쪽이 깊은 호출*이고, *up은 번호 증가, down은 감소*.

이름이 헷갈리기 쉽습니다. 외울 때:
- 호출자(*caller*) = `up` (먼저 호출한 쪽 = *위*)
- 피호출자(*callee*) = `down`

---

## `info frame` — 프레임 *상세 정보*

```
(gdb) info frame
Stack level 0, frame at 0x7fffffffe340:
 rip = 0x55555555512e in deepest (crash.c:1); saved rip = 0x555555555145
 called by frame at 0x7fffffffe350
 source language c.
 Arglist at 0x7fffffffe330, args:
 Locals at 0x7fffffffe330, Previous frame's sp is 0x7fffffffe340
 Saved registers:
  rbp at 0x7fffffffe330, rip at 0x7fffffffe338
```

각 항목:
- **`rip`** — 현재 명령어 포인터.
- **`saved rip`** — 호출자로 *돌아갈* 주소.
- **`called by frame at`** — 호출자의 *프레임 위치*.
- **`Arglist`** — 함수 인자가 위치한 메모리.
- **`Saved registers`** — 호출 전 *저장된 레지스터들*의 메모리 위치.

이 정보는 *프레임 포인터를 따라가는* low-level 디버깅에서 필요. 보통은 `bt`로 충분.

LLDB:
```
(lldb) frame info
```

---

## 인라인 함수의 *까다로움*

```c
inline int small() { return 42; }

int main() {
    int x = small();    // 컴파일러가 small() 인라인 가능
    return x;
}
```

`-O2`에서 `small()`이 *인라인*되면, 디버거가 *현재 자리가 어디인지* 헷갈릴 수 있습니다.

```
(gdb) bt
#0  small () at inline.c:1
#1  main () at inline.c:5
```

GDB 7+는 *인라인 표시*를 잘합니다. `#0`이 *진짜 스택 프레임이 아니라* "*main 안의 인라인된 자리*"라는 의미.

```
(gdb) info frame
Inlined frame, no frame info.
```

*인라인 프레임은 진짜 스택이 없음*. 변수 일부가 `<optimized out>` 가능. 정확한 분석을 위해 `-O0` 빌드 권장.

### `set print frame-info source-and-location`

```
(gdb) bt
#0  0x... small () at inline.c:1
#1  0x... main () at inline.c:5
```

기본 출력에 *소스 위치*가 같이. 외부 라이브러리가 *심볼만 있고 소스 없을 때* 구분 도움.

---

## *최적화 코드*의 스택 — `frame` 안의 함정

`-O2`로 컴파일하면 *tail call optimization*이 적용될 수 있습니다.

```c
int helper() { return compute(); }   // tail call

int main() { return helper(); }
```

```
(gdb) bt
#0  compute () at opt.c:5
#1  main () at opt.c:8         # ← helper가 사라짐!
```

`helper`가 *스택에 안 보입니다*. tail call로 `main` → `compute` 직접 jump한 것처럼 보임. 이게 *디버깅을 어렵게* 합니다.

해결:
- `-fno-optimize-sibling-calls` 컴파일 옵션.
- 또는 `-O0`/`-Og` 빌드.

---

## *재귀의 backtrace*

```
(gdb) bt
#0  factorial (n=0) at fact.c:4
#1  factorial (n=1) at fact.c:5
#2  factorial (n=2) at fact.c:5
#3  factorial (n=3) at fact.c:5
#4  factorial (n=4) at fact.c:5
#5  factorial (n=5) at fact.c:5
#6  main () at fact.c:10
```

각 재귀 호출이 *별도 프레임*. 깊은 재귀에서 *스택 오버플로*가 나면 backtrace에서 *수천 프레임* 보일 수 있습니다.

```
(gdb) bt 20      # 안쪽 20만
```

너무 깊을 때 *최근 N만* 보면 패턴 파악 가능.

---

## *모든 스레드의 backtrace*

```
(gdb) thread apply all backtrace
Thread 4 (Thread 0x7fff...):
#0  ...
#1  ...

Thread 3 (Thread 0x7fff...):
#0  ...
#1  ...

Thread 2 (Thread 0x7fff...):
...

Thread 1 (Thread 0x7fff...):
...
```

*모든 스레드의 현재 위치*. *데드락*이나 *어느 스레드에서 멈췄는지* 모를 때 결정적.

LLDB:
```
(lldb) thread backtrace all
(lldb) bt all
```

자세한 멀티스레드 디버깅은 [Ch 6](/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess)에서.

---

## *부분 스택* — 깨진 스택의 복구

스택이 *심하게 손상*되면 GDB가 깊이 따라가지 못합니다.

```
(gdb) bt
#0  0x000055555555512e in deepest () at crash.c:1
Backtrace stopped: previous frame inner to this frame (corrupt stack?)
```

원인: *스택 오버런*이 backtrace 정보까지 망가뜨림.

해결 시도:
1. **`bt no-filters`** — Python 필터 비활성화. 가끔 깨진 자리 통과.
2. **`info registers`** — *수동으로 스택 따라가기*. `rbp`, `rsp`로 프레임 추적.
3. **메모리 검사** — `x/64xg $rsp`로 스택 내용 확인.

깨진 스택은 *근본 원인이 따로* 있습니다 (buffer overflow). 디버거로 *그 자리를 찾는* 게 목표.

---

## *외부 라이브러리* 프레임 숨기기

```
(gdb) skip function pthread_*
(gdb) skip function __libc_*
```

`bt`에서 *pthread_* 와 __libc_* 프레임을 숨김. *우리 코드만* 보고 싶을 때.

```
(gdb) info skip
(gdb) skip disable 1     # 임시 비활성화
(gdb) skip enable 1
```

`step`이나 `next`도 *건너뛴 함수는 안 들어감*. 외부 라이브러리에 *들어가지 않고* 한 줄씩 진행.

---

## *coredump의 backtrace*

```bash
$ gdb ./myapp core
Core was generated by `./myapp'.
Program terminated with signal SIGSEGV, Segmentation fault.
#0  0x000055555555512e in deepest () at crash.c:1

(gdb) bt
#0  0x000055555555512e in deepest () at crash.c:1
#1  0x0000555555555140 in deeper () at crash.c:3
#2  0x000055555555514c in deep () at crash.c:4
#3  0x0000555555555158 in main () at crash.c:5
```

코어 덤프는 *프로세스 죽은 순간의 메모리 스냅샷*. 거기서도 `bt`가 정상 동작. *프로덕션 사고 분석*의 기본.

자세한 코어 덤프 분석은 [Ch 7](/blog/tools/debugging/gdb-lldb/chapter07-core-dump)에서.

---

## *디버깅 시나리오* — 실전 예시

### 시나리오 1: 충돌 자리 찾기

```
$ gdb ./myapp
(gdb) run
Program received signal SIGSEGV.

(gdb) bt
#0  process_node (n=0x0) at tree.c:42
#1  walk_tree () at tree.c:88
#2  main () at main.c:15

(gdb) frame 0
(gdb) info args
n = 0x0

# null 포인터를 받았네 — frame 1으로 가서 누가 보냈는지
(gdb) up
#1  walk_tree () at tree.c:88
(gdb) list
# walk_tree의 어디서 process_node(NULL)을 호출했는지
```

### 시나리오 2: 깊은 재귀 분석

```
(gdb) bt
#0~99: 100단계 깊은 재귀
#100: main

# 한 단계마다 인자가 어떻게 변하는지 보고 싶다
(gdb) frame 0
(gdb) info args         # n = 0
(gdb) frame 10
(gdb) info args         # n = 10
(gdb) frame 50
(gdb) info args         # n = 50

# 각 단계마다 잘 줄어드는지 확인
```

### 시나리오 3: 데드락 진단

```
(gdb) thread apply all bt
Thread 4: 멈춰 있음
#0  __lll_lock_wait ()
#1  pthread_mutex_lock (mutex=0x... <m1>)
#2  worker (m1, m2) ...

Thread 3: 멈춰 있음
#0  __lll_lock_wait ()
#1  pthread_mutex_lock (mutex=0x... <m2>)
#2  worker (m2, m1) ...

# 두 스레드가 서로 다른 mutex를 기다림 → 데드락
```

---

## *공유 라이브러리* 프레임의 함정

```
(gdb) bt
#0  0x00007ffff7d... in malloc () from /lib/x86_64-linux-gnu/libc.so.6
#1  0x00007ffff7d... in operator new (sz=24) at libsupc++/new_op.cc:50
#2  std::vector<int, ...>::_M_default_append (this=0x...) ...
```

라이브러리 함수의 *심볼만 있고 줄 번호 없는* 경우 — `from /lib/...`. 디버그 정보가 *없는 라이브러리*에서 호출됨.

해결: *디버그 심볼 패키지* 설치.

```bash
# Ubuntu/Debian
sudo apt install libc6-dbg libstdc++6-dbgsym

# Fedora/RHEL  
sudo dnf debuginfo-install glibc libstdc++
```

이러면 `bt`에 *.c 파일과 줄 번호*도 같이 나옵니다.

---

## 정리

- **`backtrace`** — 호출 스택 보기. `bt full`은 변수 포함.
- **`frame N`** / **`up`** / **`down`** — 프레임 이동. caller = up, callee = down.
- **`info frame`** — 프레임의 *low-level 정보*.
- 인라인 함수는 *별도 프레임으로 표시*되지만 *진짜 스택 아님*.
- Tail call optimization으로 *프레임이 사라질 수* 있음. `-fno-optimize-sibling-calls` 또는 `-O0`.
- **`thread apply all bt`** — *모든 스레드의 스택*. 데드락 진단 필수.
- **`skip function`** — 외부 라이브러리 프레임 숨김.
- 코어 덤프에서도 `bt` 동작.
- 깨진 스택은 *근본 원인이 따로* — 보통 buffer overflow.

## 다음 장 예고

[Ch 5: Breakpoint와 Watchpoint](/blog/tools/debugging/gdb-lldb/chapter05-breakpoints-watchpoints)에서는 *멈출 자리*를 더 깊이 다룹니다. 조건부 break의 변형, watchpoint(변수 변경 시 멈춤), hardware vs software breakpoint.

## 참고 자료

- [GDB Backtrace](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Backtrace.html)
- [LLDB Examining Thread State](https://lldb.llvm.org/use/tutorial.html#examining-thread-state)
