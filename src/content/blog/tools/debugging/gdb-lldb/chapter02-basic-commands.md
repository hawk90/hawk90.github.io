---
title: "Ch 2: 기본 명령 — break / step / next / print"
date: 2026-05-17T02:00:00
description: "디버거에서 매일 쓰는 핵심 명령 10가지 — 정확한 의미와 자주 쓰는 변형."
tags: [gdb, lldb, Debugging, BasicCommands]
series: "GDB and LLDB"
seriesOrder: 2
draft: false
---

## 매일 쓰는 명령 10가지

[Ch 1](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install)에서 첫 세션을 봤습니다. 이 장은 *그 안에서 본 명령들*을 *정확히* 다룹니다.

| 명령 | 약어 | 의미 |
|------|------|------|
| `run` | `r` | 프로그램 실행 |
| `continue` | `c` | 정지 상태에서 계속 |
| `break` | `b` | 중단점 설정 |
| `next` | `n` | 다음 줄로 (함수 안 안 들어감) |
| `step` | `s` | 다음 줄로 (함수 안으로 진입) |
| `finish` | `fin` | 현재 함수 끝까지 실행 |
| `print` | `p` | 변수·식 값 출력 |
| `info` | — | 정보 조회 |
| `list` | `l` | 소스 코드 표시 |
| `quit` | `q` | 디버거 종료 |

이 10개를 외우면 *디버거 사용 90%*가 끝납니다.

---

## `run` / `continue` — 시작과 진행

```
(gdb) run                    # 인자 없이 실행
(gdb) run input.txt --verbose
(gdb) r                      # 약어

(gdb) continue               # Breakpoint나 signal로 멈춘 자리에서 다시 실행
(gdb) c
```

`run`은 *처음부터*, `continue`는 *멈춘 자리부터*. `continue N`으로 *N번 무시*하고 진행 가능.

LLDB:
```
(lldb) run input.txt --verbose
(lldb) continue
```

---

## `break` — *멈출 자리* 설정

가장 많이 쓰는 명령. 다양한 형태가 있습니다.

### 함수 이름

```
(gdb) break main             # main 함수 시작에서 멈춤
(gdb) b main                 # 약어
(gdb) b MyClass::method      # C++ 메서드
(gdb) b 'MyClass<int>::foo'  # 템플릿 함수
```

LLDB:
```
(lldb) breakpoint set --name main
(lldb) b main                # alias
```

### 파일과 줄 번호

```
(gdb) break main.c:42        # main.c의 42번째 줄
(gdb) b parser.c:128
```

LLDB:
```
(lldb) breakpoint set --file main.c --line 42
(lldb) b main.c:42
```

### 조건부

```
(gdb) break main.c:42 if x > 10
(gdb) b factorial if n == 0
(gdb) b parser.c:50 if strcmp(buf, "ERROR") == 0
```

`x > 10`이 *참일 때만* 멈춤. 깊은 루프 안의 *특정 상황*만 잡을 때 필수. 문자열 비교도 가능.

### 일회성 (Temporary)

```
(gdb) tbreak main           # 한 번 멈추면 자동 삭제
```

LLDB:
```
(lldb) breakpoint set --one-shot --name main
```

### 모든 함수에 자동

```
(gdb) rbreak factorial.*    # 정규식 매칭 모든 함수에 break
```

큰 코드베이스 탐색용.

### Breakpoint 관리

```
(gdb) info breakpoints      # 목록
(gdb) i b                   # 약어
(gdb) delete 1              # 1번 삭제
(gdb) clear main.c:42       # 특정 자리 삭제
(gdb) disable 1             # 비활성화 (안 삭제)
(gdb) enable 1
```

LLDB:
```
(lldb) breakpoint list
(lldb) breakpoint delete 1
(lldb) breakpoint disable 1
(lldb) breakpoint enable 1
```

---

## `step` vs `next` vs `finish` — 진행 명령

가장 헷갈리는 셋. 정확한 차이를 알아 둡니다.

```c
int add(int a, int b) {
    return a + b;     // ← 4
}

int main() {
    int x = 1;        // ← 1
    int y = 2;        // ← 2
    int z = add(x, y); // ← 3
    return z;         // ← 5
}
```

위치 3에서:

| 명령 | 3 → ? |
|------|-------|
| `next` | 5 (`add()` 안 안 들어감, 다음 줄) |
| `step` | 4 (`add()` 안으로 진입) |

위치 4에서:

| 명령 | 4 → ? |
|------|-------|
| `next` | 5 (return 후 main으로) |
| `finish` | 5 (현재 함수 끝까지) |

요약:
- **`next`** — 한 줄. 함수 호출은 *통째로* 실행.
- **`step`** — 한 줄. 함수 호출은 *안으로 진입*.
- **`finish`** — 현재 함수가 *반환할 때까지* 실행.

`finish`는 *너무 깊이 들어갔을 때 빠져나오는* 단축키. `step`을 잘못 눌러 깊은 라이브러리 안으로 들어갔을 때 `finish`로 탈출.

### 명령어 단위 진행

```
(gdb) stepi    # 어셈블리 한 명령씩 진입
(gdb) si
(gdb) nexti    # 어셈블리 한 명령 (call은 통째)
(gdb) ni
```

C/C++ 줄이 아니라 *기계어 한 줄*씩. *최적화된 코드*나 *디스어셈블리*를 따라가야 할 때.

### `until` — 같은 위치 반복 무시

```
(gdb) until 50    # 50번 줄까지 같은 자리에 안 멈춤
```

루프 안의 break가 *매번 멈추는 게 싫을 때*. 50번 줄까지 *통과해 진행*.

---

## `print` — 변수·식 평가

### 기본

```
(gdb) print x
$1 = 42

(gdb) p x          # 약어
(gdb) print x + y
$2 = 100
```

C/C++ *식 전부*가 평가 가능. 함수 호출도 됩니다 (side effect 주의).

```
(gdb) print strlen(str)
$3 = 13
```

### `$N` 변수

`$1`, `$2`처럼 *결과가 자동 번호*됩니다. 이후 참조 가능.

```
(gdb) print my_struct
$1 = {field1 = 10, field2 = 20}
(gdb) print $1.field1     # 이전 결과 재사용
$2 = 10
```

### 포맷 지정자

```
(gdb) p/x x           # 16진수
(gdb) p/d x           # 10진수 (기본)
(gdb) p/o x           # 8진수
(gdb) p/t x           # 2진수
(gdb) p/c x           # 문자
(gdb) p/s str         # 문자열
(gdb) p/f x           # 정수 메모리를 float으로
```

LLDB:
```
(lldb) print x
(lldb) p/x x          # 16진수
(lldb) print --format hex x
```

### 배열·메모리

```
(gdb) print *arr@10   # arr의 10개 원소 (배열로 출력)
(gdb) p *(int*)0x7fff1234@5  # 주소에서 5개 int
```

### 포인터 따라가기

```
(gdb) p *ptr          # 포인터가 가리키는 곳
(gdb) p ptr->field    # 구조체 멤버
(gdb) p *node->next   # 체이닝
```

### `set var` — 변수 수정

```
(gdb) set variable x = 100
(gdb) set var x = 100        # 약어
```

`print x = 100`도 동일 효과. *가설 검증*에서 필수.

```c
if (x > 0) {
    // 이 분기를 강제로 들어가고 싶음
}
```

`(gdb) set var x = 1`로 *조건 자체를 바꿔* 다른 분기 검증.

### `display` — 자동 출력

```
(gdb) display x
1: x = 5

(gdb) next
6
1: x = 6     # 자동으로 출력
```

매 step마다 *자동으로 x값*을 보여 줌. 변수 변화를 *연속 추적*.

```
(gdb) info display     # 등록된 목록
(gdb) undisplay 1      # 삭제
```

---

## `info` — 정보 조회

`info`는 *서브 명령*이 많습니다.

```
(gdb) info breakpoints      # 또는 i b
(gdb) info args             # 현재 함수의 인자
(gdb) info locals           # 현재 함수의 지역 변수
(gdb) info registers        # 모든 레지스터
(gdb) info threads          # 모든 스레드
(gdb) info frame            # 현재 프레임 정보
(gdb) info functions        # 모든 함수
(gdb) info variables        # 전역 변수
(gdb) info sharedlibrary    # 로드된 동적 라이브러리
```

LLDB:
```
(lldb) breakpoint list      # = info breakpoints
(lldb) frame variable       # = info locals + info args
(lldb) register read        # = info registers
(lldb) thread list          # = info threads
(lldb) image list           # = info sharedlibrary
```

가장 자주 쓰는 `info locals` — 함수 안에서 *모든 지역 변수를 한 번에* 봅니다. `print`를 일일이 안 해도 됨.

---

## `list` — 소스 코드 보기

```
(gdb) list           # 현재 자리 ± 5줄
(gdb) l

(gdb) list 1,20      # 1~20번 줄
(gdb) list main      # main 함수
(gdb) list main.c:42 # 특정 자리
(gdb) list           # 다시 누르면 다음 10줄
```

LLDB:
```
(lldb) source list
(lldb) l --line 42 --count 20
```

`list`는 *깜빡할 때마다* 한 번씩 누르면 됩니다. 현재 위치의 컨텍스트를 즉시 보여 줌.

---

## `jump` / `return` — 흐름 제어

### `jump` — *실행 위치 강제 변경*

```
(gdb) jump 42    # 42번 줄로 점프
```

*위험*. 변수 상태가 안 맞으면 죽음. *디버깅 가설 검증*에 가끔 사용.

### `return` — 함수 *조기 종료*

```
(gdb) return 0   # 0을 반환하고 함수 즉시 종료
```

함수의 나머지를 *실행하지 않고* 반환. *fault injection*이나 *분기 검증*에 유용.

---

## `quit` — 종료

```
(gdb) quit
A debugging session is active.
...
Quit anyway? (y or n) y
```

`q`로 약어. 디버깅 중인 프로세스가 있으면 *확인*.

`-q` 옵션으로 시작하면 시작 메시지 안 나옴 — 깔끔한 출력.

---

## *모르는 명령일 때* — `help`

```
(gdb) help
(gdb) help break          # 'break' 명령 상세
(gdb) help info breakpoints
```

LLDB:
```
(lldb) help
(lldb) help breakpoint set
(lldb) apropos crash      # crash 관련 명령 검색
```

`apropos`로 *키워드 검색*.

---

## `.gdbinit` / `~/.lldbinit` — 초기 설정

매번 같은 설정을 안 치도록 *시작 스크립트*에 저장.

### `.gdbinit`

```
# ~/.gdbinit

# 출력 페이지네이션 끄기 (긴 출력 자동 스크롤)
set pagination off

# 자식 프로세스 따라가기 (멀티프로세스용)
set follow-fork-mode child

# 어셈블리 신택스
set disassembly-flavor intel

# 자동 명령
define hookpost-run
    info threads
end
```

프로젝트별 `.gdbinit`는 *해당 디렉터리*에 두면 자동 로드 (`auto-load safe-path` 설정 필요).

### `~/.lldbinit`

```
settings set target.x86-disassembly-flavor intel
settings set stop-disassembly-display always
command alias bfl breakpoint set --file %1 --line %2
```

[Ch 11: 실무 팁](/blog/tools/debugging/gdb-lldb/chapter11-practical-tips)에서 자세히.

---

## *작은 cheatsheet*

| 동작 | 명령 |
|------|------|
| 시작 | `gdb prog` / `lldb prog` |
| 실행 | `run` |
| 멈출 자리 | `break <위치>` |
| 한 줄 (함수 안 안 들어감) | `next` |
| 한 줄 (함수 안으로) | `step` |
| 함수 끝까지 | `finish` |
| 계속 | `continue` |
| 변수 보기 | `print <식>` |
| 지역 변수 모두 | `info locals` |
| 호출 사슬 | `backtrace` |
| 소스 보기 | `list` |
| 변수 수정 | `set var x = 100` |
| 자동 출력 | `display <식>` |
| 종료 | `quit` |

---

## 정리

- 매일 쓰는 10명령: `run` / `continue` / `break` / `next` / `step` / `finish` / `print` / `info` / `list` / `quit`.
- `break`는 *위치·조건·일회성* 등 다양한 변형.
- `step` vs `next` 차이는 *함수 호출 시 안으로 들어가느냐*. `finish`로 빠져나옴.
- `print`는 *C/C++ 식 평가기*. 함수 호출까지 가능.
- `info`, `list`, `display`로 상태 추적.
- `.gdbinit`로 *시작 설정 자동화*.

## 다음 장 예고

[Ch 3: 상태 들여다보기](/blog/tools/debugging/gdb-lldb/chapter03-inspecting-state)에서는 *변수 깊이 보기* — 메모리, 레지스터, STL 컨테이너, 포인터 트리.

## 참고 자료

- [GDB Command Reference](https://sourceware.org/gdb/current/onlinedocs/gdb.html/)
- [LLDB Tutorial](https://lldb.llvm.org/use/tutorial.html)
- [GDB Cheat Sheet (DarkDust)](https://darkdust.net/files/GDB%20Cheat%20Sheet.pdf)
