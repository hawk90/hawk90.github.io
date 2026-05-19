---
title: "Ch 5: Breakpoint와 Watchpoint"
date: 2026-05-17T05:00:00
description: "조건부 break, watchpoint(변수 변경 추적), catchpoint, hardware vs software."
tags: [gdb, lldb, Breakpoint, Watchpoint]
series: "GDB and LLDB"
seriesOrder: 5
draft: false
---

## Breakpoint — *멈출 자리*를 정밀하게

[Ch 2](/blog/tools/debugging/gdb-lldb/chapter02-basic-commands)에서 `break`의 기본을 봤습니다. 이 장은 *조건부 break*, *watchpoint*, *catchpoint*, 그리고 *hardware vs software* 차이를 다룹니다.

---

## 조건부 Breakpoint — `if`

```
(gdb) break 42 if x > 100
(gdb) b factorial if n == 0
(gdb) b parser.c:50 if strcmp(buf, "ERROR") == 0
```

가장 강력한 기능. 깊은 루프 안의 *특정 상황만* 잡습니다.

```c
for (int i = 0; i < 10000; i++) {
    if (data[i].value == 0) {
        process(data[i]);  // ← 특정 i에서만 멈추고 싶음
    }
}
```

```
(gdb) b 4 if i == 5234 && data[i].value == 0
```

이게 *디버거를 강력하게 만드는* 핵심. printf 디버깅으로는 *루프 5234번째*만 보기 어렵습니다.

### 조건 표현식 — *어디까지 가능한가*

```
b 42 if x > 100 && y < 0          # 논리 연산
b 42 if my_func(x) != 0           # 함수 호출 (side effect 주의)
b 42 if strcmp(s, "key") == 0     # 문자열
b 42 if ((Node*)p)->next == NULL  # 캐스팅
b 42 if i == count - 1            # 산술
```

C/C++ *식 전부*가 조건. 단점은 *조건 평가 비용*입니다. 매 break마다 식이 평가되므로 *복잡한 조건*은 프로그램을 느리게 만듭니다.

### `commands` — Breakpoint에 *동작 첨부*

```
(gdb) break 42
Breakpoint 1 at ...

(gdb) commands 1
> print x
> print y
> continue
> end
```

이제 1번 breakpoint에 도달하면 *자동으로*:
1. `x` 출력
2. `y` 출력
3. `continue`로 계속 진행

***디버거를 printf로 활용*하는 강력한 트릭**. 코드 수정 없이 *로깅을 동적으로 추가*.

```
(gdb) commands 1
> silent
> printf "Loop %d: x=%d y=%d\n", i, x, y
> continue
> end
```

`silent`로 *Breakpoint 도달 메시지*를 끄고, `printf`로 직접 포맷. 결과:

```
Loop 1: x=10 y=20
Loop 2: x=15 y=18
Loop 3: x=22 y=15
...
```

코드 한 줄 수정 없이 *시간순 로그*를 받습니다.

### Ignore Count — *N번 무시*

```
(gdb) break 42
(gdb) ignore 1 1000      # 1번 breakpoint를 1000번 무시
```

1000번째 도달까지 *조용히 통과*, 1001번째에 처음 멈춤. 큰 루프에서 *특정 반복*만 보고 싶을 때.

`if i == 1000`도 같은 효과지만, *ignore count가 더 효율적*입니다 (조건식 평가 없음).

---

## 임시 / 일회성 Breakpoint

```
(gdb) tbreak main       # 한 번 멈추면 자동 삭제
(gdb) tb main           # 약어
```

`run`을 자주 할 때 *시작점 잡기*. `break`로 등록하면 매번 정리해야 하는데, `tbreak`는 자동.

LLDB:
```
(lldb) breakpoint set --one-shot --name main
(lldb) b -o main
```

### `rbreak` — 정규식 매칭

```
(gdb) rbreak handle_.*
Breakpoint 1 at ...: file foo.c, line 10.
Breakpoint 2 at ...: file foo.c, line 25.
...
```

`handle_`로 시작하는 *모든 함수*에 한꺼번에 break. 새 API를 처음 탐색할 때 *어떤 함수가 호출되는지* 한눈에.

---

## Watchpoint — *변수 변경 추적*

가장 강력한 디버깅 도구 중 하나. 변수의 *값이 변할 때마다* 자동 정지.

```
(gdb) watch x          # x가 변경될 때 멈춤
(gdb) watch -location my_struct.field   # 주소 기준
```

**용도**: *어디서 이 변수가 망가졌는지 모를 때*. 코드 전체를 뒤지는 대신 *디버거가 알아서 찾아 줍니다*.

```c
int balance = 100;

void process() {
    // ... 어딘가에서 balance가 -1이 됨, 어디서?
}
```

```
(gdb) watch balance
(gdb) run
...
Hardware watchpoint 2: balance
Old value = 100
New value = 50
process_withdrawal (amount=50) at account.c:42
42      balance -= amount;

(gdb) continue
Hardware watchpoint 2: balance
Old value = 50
New value = -1
bug_function () at bug.c:18
18      balance = -1;       # ← 여기 범인!
```

*수동으로 찾으면 며칠 걸릴* 사고를 *몇 분 만에* 잡습니다.

### 종류 — `rwatch`, `awatch`

```
(gdb) watch x          # 쓰기에만 (변경)
(gdb) rwatch x         # 읽기에만
(gdb) awatch x         # 읽기 + 쓰기 (access)
```

- **`watch`** — *쓰기*만. 값이 *변할 때*.
- **`rwatch`** — *읽기*만. 변수가 *사용될 때*.
- **`awatch`** — *읽기와 쓰기 모두*. 모든 접근.

`rwatch`는 *변수가 안 쓰이는지* 확인할 때. 데드 코드 탐색.

### Hardware vs Software Watchpoint

```
(gdb) watch x
Hardware watchpoint 1: x        # 빠름!
```

CPU의 *디버그 레지스터*를 사용. 보통 *x86은 4개, ARM은 더 많음*. 빠르고 *프로그램이 거의 느려지지 않습니다*.

```
(gdb) watch (long array)[100]   # 큰 영역
Hardware watchpoint 2: ...
warning: Could not insert hardware watchpoint 2.
```

*하드웨어 한도 초과* 또는 *추적 영역 너무 큼*. 그러면 GDB가 *software watchpoint*로 대체:

```
(gdb) set can-use-hw-watchpoints 0   # software 강제
(gdb) watch big_array
Watchpoint 3: big_array
```

Software watchpoint는 *매 명령어마다 변수 값 비교*. *극도로 느립니다* (수십~수백× 느림). 작은 변수에만 hardware watchpoint를 쓰세요.

### Watchpoint 함정 — *스코프*

```c
void inner() {
    int local = 0;
    // 여기에 watch
}

void outer() {
    inner();
    // inner 종료 후 local은 사라짐
}
```

지역 변수에 watch를 걸면, *함수가 끝나면서 watchpoint도 사라집니다*. 변수가 *스택에서 해제*되어서.

```
Watchpoint 1 deleted because the program has left the block in
which its expression is valid.
```

GDB가 알려 줍니다. 전역 변수나 *생존 기간이 긴* 변수에 watch가 자연스러움.

---

## Catchpoint — *예외와 시그널*

```
(gdb) catch throw       # 모든 C++ 예외 throw
(gdb) catch catch       # 모든 catch
(gdb) catch signal SIGSEGV    # SIGSEGV 발생 시
(gdb) catch syscall open      # open() 시스템 콜
(gdb) catch fork              # fork()
(gdb) catch exec              # exec()
(gdb) catch load              # 동적 라이브러리 로드
```

C++ 예외 디버깅:

```
(gdb) catch throw
Catchpoint 1 (throw)

(gdb) run
Catchpoint 1 (exception thrown), 0x... in __cxa_throw () from libstdc++

(gdb) bt
#0  __cxa_throw
#1  parse_data () at parser.c:25
#2  main () at main.c:10
```

*어디서 던졌는지* 즉시 알 수 있습니다. *Stack unwinding 전*에 멈추므로 *완전한 호출 스택*을 봅니다.

```
(gdb) catch throw std::runtime_error    # 특정 예외만
```

LLDB:
```
(lldb) breakpoint set --name __cxa_throw
(lldb) breakpoint set -E c++
```

### `catch syscall` — 시스템 콜 추적

```
(gdb) catch syscall open
Catchpoint 1 (syscall 'open' [2])

(gdb) run
Catchpoint 1 (call to syscall open), 0x... in open ()
```

`strace`와 비슷하지만 *디버거 환경*에서 통합. *파일 열기 누락* 같은 사고에 유용.

---

## Breakpoint *명시적 비활성화 / 활성화*

```
(gdb) disable 1         # 1번 비활성 (안 삭제)
(gdb) enable 1          # 다시 활성
(gdb) disable 1-5       # 1~5 일괄
(gdb) enable count 5 2  # 2번을 5번 카운트 후 자동 비활성
(gdb) enable delete 3   # 3번이 한 번 트리거되면 삭제
```

`disable` + `enable count`로 *복잡한 동작* 시나리오 가능.

---

## Hardware Breakpoint

```
(gdb) hbreak main       # hardware breakpoint
```

CPU의 *디버그 레지스터* 사용. 일반 `break`와 차이:

| 방식 | 동작 | 한계 | 사용 자리 |
|------|------|------|-----------|
| `break` (software) | 명령어를 `int3`(x86)으로 *교체* | 무제한 | 일반 코드 |
| `hbreak` (hardware) | 디버그 레지스터 사용 | x86은 4개 | ROM·플래시·*수정 불가* 메모리 |

소프트웨어 break는 *메모리 쓰기*를 요구합니다. *읽기 전용 영역*(ROM, 매핑된 라이브러리 부분)에서는 `hbreak` 필수.

---

## `commands`로 *자동 처리*

복잡한 동작을 *Breakpoint에 박아*두면 자동화됩니다.

### 예 1: 로깅 + 자동 계속

```
(gdb) break parse_data
(gdb) commands
> silent
> printf "parse_data called with input='%s'\n", input
> continue
> end
```

코드 수정 없이 *trace log* 생성.

### 예 2: 조건부 메모리 dump

```
(gdb) break 50 if error_count > 0
(gdb) commands
> print error_message
> info locals
> bt 5
> continue
> end
```

에러 카운트가 *비-0이 되는 순간*에만 자동 dump.

### 예 3: 변수 수정 후 계속

```
(gdb) break race_condition_func
(gdb) commands
> set var shared_state = 0    # 강제 초기화
> continue
> end
```

가설 검증 — *변수를 강제로 바꾸면* 문제가 없는지.

---

## *시그널* 처리

```
(gdb) info signals
Signal       Stop  Print Pass  Description
SIGHUP       Yes   Yes   Yes   Hangup
SIGINT       Yes   Yes   No    Interrupt
SIGSEGV      Yes   Yes   Yes   Segmentation fault
SIGPIPE      No    Yes   Yes   Broken pipe
...
```

각 시그널의 *동작 설정*:
- **Stop** — 디버거가 *멈출지*.
- **Print** — *메시지 출력*.
- **Pass** — *프로그램에 전달*.

```
(gdb) handle SIGPIPE nostop noprint
(gdb) handle SIGSEGV stop print pass
```

`SIGPIPE`를 무시하면 *broken pipe 처리 코드*를 *디버거가 가로채지 않습니다*. 네트워크 코드 디버깅에 유용.

---

## *원격 / 동적 라이브러리* Breakpoint

```c
// 아직 로드 안 된 라이브러리의 함수에 break
break my_plugin_function
Function "my_plugin_function" not defined.
Make breakpoint pending on future shared library load? (y or [n]) y
Breakpoint 1 (my_plugin_function) pending.
```

라이브러리가 *나중에 dlopen*될 때 자동으로 등록. 플러그인 시스템 디버깅.

```
(gdb) set breakpoint pending on    # 자동으로 pending 만들기
```

---

## *실전 시나리오*

### 시나리오 1: 메모리가 망가지는 순간

```
(gdb) print my_struct.value
$1 = 42        # 정상

# 어딘가에서 망가짐 — 어디?
(gdb) watch my_struct.value
(gdb) continue
Hardware watchpoint 2: my_struct.value
Old value = 42
New value = -1
buggy_function () at bug.c:88
```

*거기*가 범인.

### 시나리오 2: 깊은 루프의 특정 자리

```
(gdb) b process_record if record_id == 12345
(gdb) commands
> bt 5
> info locals
> continue
> end
(gdb) run

# 12345번 레코드 만나면 자동 dump
```

### 시나리오 3: 예외 추적

```
(gdb) catch throw std::out_of_range
(gdb) run

Catchpoint 1 (exception thrown), ...
(gdb) bt
# 어디서 out_of_range를 던졌는지
```

---

## 정리

- **조건부 break** `if`: 깊은 루프에서 *특정 상황*만 잡음.
- **`commands`**: 자동 동작 첨부 — 로깅·dump·변수 수정.
- **`watch`**: 변수 변경 자동 감지. *어디서 망가지는지* 모를 때 결정적.
- **Hardware vs Software**: hardware는 빠름 (CPU 디버그 레지스터), software는 느림 (모든 명령어 평가).
- **`catch`**: 예외, 시그널, 시스템 콜.
- **`disable` / `enable count` / `enable delete`**: 정교한 활성화 제어.
- **`handle`**: 시그널 동작 (stop / print / pass).
- *Pending breakpoint*로 동적 라이브러리 함수에도 break.

## 다음 장 예고

[Ch 6: 멀티스레드 / 멀티프로세스](/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess)에서는 동시 실행 디버깅을 다룹니다. 스레드 전환, 데드락 진단, fork된 자식 따라가기.

## 참고 자료

- [GDB Breakpoints](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Breakpoints.html)
- [GDB Watchpoints](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Set-Watchpoints.html)
- [LLDB Breakpoint Commands](https://lldb.llvm.org/use/tutorial.html#setting-breakpoints)
