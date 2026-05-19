---
title: "Ch 3: 상태 들여다보기 — 변수·메모리·레지스터·STL"
date: 2026-05-17T03:00:00
description: "print 만으로 부족한 자리들 — x/memory examine, ptype, STL 컨테이너, pretty printer."
tags: [gdb, lldb, Memory, Inspection, STL]
series: "GDB and LLDB"
seriesOrder: 3
draft: false
---

## `print`의 한계

[Ch 2](/blog/tools/debugging/gdb-lldb/chapter02-basic-commands)에서 `print x` 같은 기본 명령을 봤습니다. 실무에서는 *그것만으로는 부족한 자리*가 자주 등장합니다.

- 포인터가 가리키는 *메모리 덩어리*를 보고 싶다 → `x/...`
- 변수의 *타입을 모를 때* → `ptype`
- `std::vector` 안의 *실제 원소*를 보고 싶다 → pretty printer
- 레지스터에 살아 있는 *최적화된 변수* → `info registers`
- *연결 리스트*를 따라가며 모든 노드를 보고 싶다 → 반복문 또는 스크립트

이 장은 그 *깊은 조사*를 다룹니다.

---

## `x` — 메모리 *examine*

GDB의 가장 강력한 명령 중 하나. *임의 주소의 메모리*를 *원하는 형식*으로 봅니다.

```
x/[N][f][u] addr

N: 출력 개수
f: 형식 (x=16진수, d=10진수, s=문자열, i=명령어 등)
u: 단위 (b=byte, h=halfword, w=word, g=giant)
```

### 예시

```
(gdb) x/16xb 0x7fff1234       # 16바이트를 byte 단위 16진수로
0x7fff1234:  0x48  0x65  0x6c  0x6c  0x6f  0x2c  0x20  0x77
0x7fff123c:  0x6f  0x72  0x6c  0x64  0x00  0x00  0x00  0x00

(gdb) x/4wx 0x7fff1234         # 4 word(4byte) 단위 16진수
0x7fff1234:  0x6c6c6548  0x77202c6f  0x646c726f  0x00000000

(gdb) x/s 0x7fff1234            # 문자열로 (널 종료까지)
0x7fff1234:  "Hello, world"

(gdb) x/i $pc                   # 현재 instruction
=> 0x401234 <main+10>: mov $0x0, %eax

(gdb) x/20i $pc                 # 20개 명령어
```

### 형식 지정자

| `f` | 의미 |
|-----|------|
| `x` | 16진수 |
| `d` | 부호 있는 10진수 |
| `u` | 부호 없는 10진수 |
| `o` | 8진수 |
| `t` | 2진수 |
| `c` | 문자 |
| `s` | 문자열 |
| `f` | float |
| `i` | 명령어 (디스어셈블리) |
| `a` | 주소 (심볼과 함께) |

### 단위

| `u` | 의미 | 크기 |
|-----|------|------|
| `b` | byte | 1 |
| `h` | halfword | 2 |
| `w` | word | 4 |
| `g` | giant | 8 |

### LLDB의 동등 명령

```
(lldb) memory read --format hex --size 1 --count 16 0x7fff1234
(lldb) memory read --format string 0x7fff1234
(lldb) memory read -fc 0x7fff1234     # alias
(lldb) x/16xb 0x7fff1234              # GDB-style alias 동작!
```

LLDB는 *GDB의 `x` 문법을 alias로 지원*합니다. 같은 문자열을 양쪽에서 쓰면 됩니다.

---

## `ptype` / `whatis` — 타입 정보

```
(gdb) ptype my_struct
type = struct Point {
    int x;
    int y;
    char name[20];
}

(gdb) whatis my_struct
type = struct Point

(gdb) ptype my_var
type = std::vector<int, std::allocator<int>>
```

`ptype`은 *전체 정의*, `whatis`는 *타입 이름만*. 외부 라이브러리의 구조체를 *처음 만났을 때* 매우 유용.

```
(gdb) ptype /o my_struct      # offset 함께 (멤버 위치)
type = struct Point {
/*  0     |     4 */    int x;
/*  4     |     4 */    int y;
/*  8     |    20 */    char name[20];
                       /* total size (bytes):   28 */
}
```

`/o` 옵션이 *각 멤버의 byte offset*과 *크기*를 같이 보여 줍니다. *메모리 레이아웃 디버깅*에 결정적.

LLDB:
```
(lldb) type lookup Point
(lldb) frame variable --raw my_struct
```

---

## `info registers` — 레지스터

```
(gdb) info registers
rax  0x55555555515f  93824992293215
rbx  0x0  0
rcx  0x0  0
rdx  0x7fffffffe458  140737488348248
rsi  0x7fffffffe448  140737488348232
rdi  0x1  1
rbp  0x7fffffffe340  0x7fffffffe340
rsp  0x7fffffffe320  0x7fffffffe320
r8   0x0  0
r9   0x0  0
r10  0xfffffffffffff34c -3252
r11  0x202  514
r12  0x555555555100  93824992292096
rip  0x55555555515f  0x55555555515f <main+22>
eflags 0x202  [ IF ]
cs  0x33  51
ss  0x2b  43
```

자주 보는 레지스터:
- **`rip`** (또는 `pc`) — *명령어 포인터*. 다음에 실행할 명령.
- **`rsp`** — *스택 포인터*. 현재 스택 top.
- **`rbp`** — *base 포인터*. 현재 함수의 stack frame 시작.
- **`rax`** — *반환값* 자리 (System V ABI).
- **`rdi`, `rsi`, `rdx`, `rcx`, `r8`, `r9`** — *함수 인자* 1~6번째.

```
(gdb) print $rax              # 레지스터를 변수처럼 참조
$1 = 0x55555555515f

(gdb) info registers rax rip
```

LLDB:
```
(lldb) register read
(lldb) register read rax rip
(lldb) print $rax             # 동일
```

### 어셈블리 + 레지스터 보기

```
(gdb) disassemble
Dump of assembler code for function main:
   0x000055555555513f <+0>:     push   %rbp
   0x0000555555555140 <+1>:     mov    %rsp,%rbp
=> 0x0000555555555143 <+4>:     mov    $0x5,%eax
   0x0000555555555148 <+9>:     mov    %eax,-0x4(%rbp)
   ...

(gdb) disassemble /m           # 소스와 함께
```

`=>` 화살표가 *현재 명령어*. 최적화 코드 추적에 필수.

---

## STL 컨테이너 — pretty printer

```c++
std::vector<int> v = {1, 2, 3, 4, 5};
```

기본 `print`로 보면:

```
(gdb) print v
$1 = std::vector of length 5, capacity 5 = {1, 2, 3, 4, 5}
```

깔끔하게 나오죠. 이게 *GDB pretty printer*의 결과입니다. libstdc++가 *python 스크립트*를 함께 배포해 자동 적용됩니다.

### pretty printer가 안 보일 때

```
(gdb) print v
$1 = {_M_impl = {<std::allocator<int>> = {<__gnu_cxx::new_allocator<int>>...
```

이런 *내부 구현 그대로* 나오면 pretty printer 비활성화 상태.

```
(gdb) info pretty-printer
```

목록에 *libstdc++*가 없으면 설치 또는 GDB 설정 필요.

### LLDB의 STL

```
(lldb) print v
(std::vector<int, std::allocator<int> >) $0 = size=5 {
  [0] = 1
  [1] = 2
  [2] = 3
  [3] = 4
  [4] = 5
}
```

LLDB는 *기본 빌트인 formatter*가 있어 별도 설정 불필요. *libc++* 컨테이너에 최적화. *libstdc++* 사용 시 일부 형식이 살짝 다를 수 있음.

### 자주 보는 STL 컨테이너

```
(gdb) print my_map
$1 = std::map with 3 elements = {[1] = "one", [2] = "two", [3] = "three"}

(gdb) print my_set
$2 = std::set with 4 elements = {1, 2, 3, 4}

(gdb) print my_string
$3 = "hello world"

(gdb) print my_pair
$4 = {first = 1, second = "value"}

(gdb) print my_optional
$5 = std::optional containing 42

(gdb) print my_unique_ptr
$6 = std::unique_ptr<int> = {get() = 0x55555555a2b0}
```

`std::unique_ptr` 안의 값 보기:

```
(gdb) print *my_unique_ptr
$7 = 42
```

C++17 / C++20 컨테이너 (`std::variant`, `std::span` 등)는 *GDB 버전*에 따라 지원이 다름.

---

## 포인터 / 연결 리스트 따라가기

```c
struct Node {
    int value;
    struct Node* next;
};
```

```
(gdb) print head
$1 = (Node *) 0x55555555a000

(gdb) print *head
$2 = {value = 1, next = 0x55555555a020}

(gdb) print *head->next
$3 = {value = 2, next = 0x55555555a040}

(gdb) print *head->next->next
$4 = {value = 3, next = 0x0}
```

*하나씩 따라가는 게 귀찮으면* — GDB 스크립트 사용 ([Ch 9](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting)).

```
(gdb) set $p = head
(gdb) while $p != 0
 >print $p->value
 >set $p = $p->next
 >end
$5 = 1
$6 = 2
$7 = 3
```

수동 루프로 *모든 노드*를 출력. *임시 변수* `$p`로 진행 상태 추적.

---

## *연결 리스트 길이* 측정

```
(gdb) set $count = 0
(gdb) set $p = head
(gdb) while $p != 0
 >set $count = $count + 1
 >set $p = $p->next
 >end
(gdb) print $count
$1 = 1000
```

리스트가 *무한 루프*인지, *예상한 길이*인지 즉시 확인.

---

## *동적 캐스트* — 다형성 객체

```cpp
class Base { virtual ~Base() {} };
class Derived : public Base { int extra; };

Base* p = new Derived();
```

`p`를 print하면 *Base 멤버만* 보입니다.

```
(gdb) print *p
$1 = {_vptr.Base = 0x...}
```

*실제 타입은 Derived*인데. *동적 타입 캐스트*로 해결.

```
(gdb) set print object on
(gdb) print *p
$2 = (Derived) {<Base> = {_vptr.Base = 0x...}, extra = 42}
```

`set print object on`을 켜면 GDB가 *vtable로 실제 타입을 추적*. C++ 다형성 디버깅에 필수.

또는:

```
(gdb) print *(Derived*)p
$3 = {<Base> = ..., extra = 42}
```

명시적 다운캐스트.

---

## 메모리 *비교* — `compare-sections`

```
(gdb) compare-sections
```

코어 덤프와 실행 파일의 *.text section을 비교*. *바이너리 변조* 의심 시 사용.

---

## `find` — *값으로 메모리 검색*

```
(gdb) find 0x7fff1000, 0x7fff2000, 0x12345678
0x7fff1234
1 pattern found.
```

`0x7fff1000`부터 `0x7fff2000`까지 *4바이트 값 `0x12345678`*을 검색.

```
(gdb) find /b 0x7fff1000, +1024, 'A', 'B', 'C'
0x7fff1456
```

`/b`(byte)로 *바이트 시퀀스 "ABC"*를 검색. 패턴 매칭으로 *메모리에서 알려진 값* 찾기.

LLDB:
```
(lldb) memory find -s "ABC" 0x7fff1000 0x7fff2000
```

---

## 문자열 안의 문자 코드

```
(gdb) print "hello"[2]
$1 = 0x6c 'l'

(gdb) printf "%d\n", "hello"[2]
108
```

C/C++ 문자열을 *코드 포인트*로 보고 싶을 때. ASCII 코드를 알아내려고 외부 도구를 쓰지 않아도 됨.

---

## `dump` / `restore` — 메모리 *저장과 복원*

```
(gdb) dump binary memory dump.bin 0x7fff1000 0x7fff2000
```

*0x7fff1000 ~ 0x7fff2000* 메모리를 *binary 파일*로 저장. 나중에 *외부 도구로 분석*하거나 *디버깅 세션 간 복원*.

```
(gdb) restore dump.bin binary 0x7fff1000
```

저장한 파일을 *같은 주소에* 복원. *프로세스 상태 일부를 갖고 가는* 트릭.

---

## 자동 호출 — *expression 안의 함수*

```c
size_t length(const char* s);
```

GDB에서 `print length(my_str)`을 하면 *진짜 함수가 호출*됩니다. 디버거 안에서 *Side effect*가 생길 수 있음:

```
(gdb) print add(1, 2)      # 정상
$1 = 3

(gdb) print free(my_ptr)   # ⚠️ 진짜 free 호출됨!
```

`my_ptr`이 *실제로 해제*됩니다. 디버깅 후 *상태가 망가짐*. 함수 호출 시 부작용 확인 필수.

---

## *최적화된 변수* — "optimized out"

```
(gdb) print x
$1 = <optimized out>
```

`-O2` 이상에서 *컴파일러가 변수를 제거*했습니다. 가능한 방법:

1. **`-O0` 또는 `-Og`로 재빌드** — 가장 확실. 디버깅 친화 최적화.
2. **레지스터 확인** — 변수가 *레지스터에 살아 있을 수* 있음. `info registers`.
3. **함수 인자로 추정** — 호출 시점에 *어디 들어갔는지* 디스어셈블리.

`<optimized out>`을 만나면 *재컴파일이 가장 안전*합니다.

---

## 정리

- **`x`**: 임의 주소의 메모리를 *원하는 형식*으로. GDB의 가장 강력한 명령 중 하나.
- **`ptype /o`**: 구조체의 *멤버 offset과 크기*까지. 메모리 레이아웃 디버깅.
- **`info registers`**: 레지스터 + 어셈블리 동시 추적.
- **STL pretty printer**: GDB는 *python 스크립트*, LLDB는 *내장*.
- **연결 리스트 따라가기**: `while` 루프로 *수동 트래버스*.
- **`set print object on`**: C++ 다형성 객체의 *실제 타입* 자동 캐스트.
- **`find`**: 메모리에서 값·패턴 검색.
- **함수 호출 side effect** 주의.
- *최적화된 변수*는 `<optimized out>` → 재빌드 또는 레지스터.

## 다음 장 예고

[Ch 4: Backtrace와 프레임](/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames)에서는 *호출 스택*을 더 깊이 다룹니다. `bt`의 상세, 프레임 이동, inline 함수, 코어 덤프의 backtrace.

## 참고 자료

- [GDB Examining Memory](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Memory.html)
- [LLDB Memory Read](https://lldb.llvm.org/use/tutorial.html#examining-memory)
- [GDB Pretty Printers](https://sourceware.org/gdb/wiki/STLSupport)
