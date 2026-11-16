---
title: "디버거로 상태 들여다보기 — 변수·메모리·레지스터·STL 추적"
slug: "tools/debugging/gdb-lldb/chapter03-inspecting-state"
date: 2026-05-24T09:03:00
description: "print 만으로 부족한 자리들 — x/memory examine, ptype, STL 컨테이너, pretty printer."
tags: [gdb, lldb, Memory, Inspection, STL]
series: "GDB and LLDB"
seriesOrder: 3
draft: false
topics: ["tools", "tools/debugging"]
---

## `print`의 한계

[Ch 2](/blog/tools/debugging/gdb-lldb/chapter02-basic-commands)에서 `print x` 같은 기본 명령을 봤습니다. 실무에서는 *그것만으로는 부족한 자리*가 자주 등장합니다.

- 포인터가 가리키는 *메모리 덩어리*를 바이트 단위로 보고 싶다 → `x/...`
- 변수의 *타입과 레이아웃*을 모를 때 → `ptype`, `ptype /o`
- `std::vector` 안의 *실제 원소*를 보고 싶다 → pretty printer
- 최적화 때문에 `<optimized out>`이 된 변수 → 레지스터와 디스어셈블리
- *연결 리스트*를 따라가며 모든 노드를 보고 싶다 → `while` 루프 또는 스크립트

`print`가 변수를 "이름표 붙은 상자"로 보여 준다면, 이 장의 명령들은 상자를 열어 칸막이 위치와 바닥에 깔린 바이트까지 보는 도구입니다. 아래 출력은 모두 Debian 13 arm64에서 `g++ -std=c++20 -g -O0 inspect.cpp -o inspect`로 빌드한 실습 프로그램을 GDB 16.3과 lldb 19.1.7로 55행(`printf` 호출 직전)에 세워 두고 얻었습니다. 프로그램의 주요 지역 변수는 다음과 같습니다.

```cpp
char greeting[16] = "Hello, world";
unsigned int marker[4] = {0x11111111, 0x12345678, 0x22222222, 0};
char pattern[8] = "xxABCxx";
Point pt = {3, 4, "origin"};            // struct Point { int x; int y; char name[20]; };
std::vector<int> v = {1, 2, 3, 4, 5};
Node* head = make_list(3);              // struct Node { int value; struct Node* next; };
Node* big = make_list(1000);
Base* p = new Derived();                // Derived : Base, Base::id = 7, Derived::extra = 42
int* heap = (int*)malloc(sizeof(int));  // *heap = 99
```

---

## `x` — 메모리 *examine*

`x`는 *임의 주소의 메모리*를 *원하는 형식*으로 읽습니다. `print`가 타입을 따라 해석해 준다면 `x`는 타입을 무시하고 주어진 단위로 잘라 보여 줍니다.

```text
x/[N][f][u] addr

N: 출력 개수
f: 형식 (x=16진수, d=10진수, s=문자열, i=명령어 등)
u: 단위 (b=byte, h=halfword, w=word, g=giant)
```

### 실행 결과

같은 `greeting` 버퍼를 세 가지로 읽으면 바이트 순서가 드러납니다. `x/4wx`의 첫 word가 `0x6c6c6548`인 것은 aarch64가 리틀엔디언이라 `"Hell"`의 첫 글자 `H`(0x48)가 가장 낮은 바이트에 들어 있기 때문입니다.

```text
(gdb) x/16xb greeting
0xfffffffff930:	0x48	0x65	0x6c	0x6c	0x6f	0x2c	0x20	0x77
0xfffffffff938:	0x6f	0x72	0x6c	0x64	0x00	0x00	0x00	0x00
(gdb) x/4wx greeting
0xfffffffff930:	0x6c6c6548	0x77202c6f	0x646c726f	0x00000000
(gdb) x/s greeting
0xfffffffff930:	"Hello, world"
(gdb) x/2gx marker
0xfffffffff920:	0x1234567811111111	0x0000000022222222
(gdb) x/4dw marker
0xfffffffff920:	286331153	305419896	572662306	0
(gdb) x/3i $pc
=> 0xaaaaaaaa2118 <main()+792>:	ldr	w19, [sp, #344]
   0xaaaaaaaa211c <main()+796>:	add	x0, sp, #0x140
   0xaaaaaaaa2120 <main()+800>:	bl	0xaaaaaaaa30a0 <_ZNKSt6vectorIiSaIiEE4sizeEv>
```

`x/2gx marker`에서도 같은 원리가 보입니다. 메모리에 `0x11111111, 0x12345678` 순서로 놓인 두 word를 8바이트로 읽으면 뒤쪽 word가 상위 32비트에 옵니다.

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

LLDB의 `x`는 `memory read`의 alias이고(`help x`의 `'x' is an abbreviation for 'memory read'`), GDB식 `/16xb` 표기도 받습니다. 다만 두 가지가 GDB와 다릅니다. 배열 이름을 주소로 받지 않아 `&greeting`처럼 주소를 명시해야 하고, 문자열 형식 이름은 `string`이 아니라 `c-string`(약어 `s`)입니다.

```text
(lldb) x/16xb greeting
error: invalid start address expression.
error: address expression "greeting" resulted in a value whose type can't be converted to an address: char[16]
(lldb) x/16xb &greeting
0xfffffffff980: 0x48 0x65 0x6c 0x6c 0x6f 0x2c 0x20 0x77
0xfffffffff988: 0x6f 0x72 0x6c 0x64 0x00 0x00 0x00 0x00
(lldb) memory read --format hex --size 1 --count 16 &greeting
0xfffffffff980: 0x48 0x65 0x6c 0x6c 0x6f 0x2c 0x20 0x77
0xfffffffff988: 0x6f 0x72 0x6c 0x64 0x00 0x00 0x00 0x00
(lldb) memory read --format string greeting
error: Invalid format character or name 'string'. Valid values are:
...
's' or "c-string"
...
(lldb) memory read -f s &greeting
0xfffffffff980: "Hello, world"
(lldb) memory read -fc -c 8 &greeting
0xfffffffff980: Hello, w
```

GDB와 LLDB에서 `greeting`의 주소가 다른 것(`0x...f930`과 `0x...f980`)은 두 디버거가 각자 프로세스를 새로 띄운 별개의 실행이기 때문입니다. 이 글에서는 0x50바이트 차이의 원인을 따로 추적하지 않았습니다.

---

## `ptype` / `whatis` — 타입 정보

외부 라이브러리의 구조체를 *처음 만났을 때* 정의를 찾아 헤더를 뒤지는 대신 디버거에게 묻습니다. `ptype`은 *전체 정의*를, `whatis`는 *타입 이름만* 보여 줍니다. `std::vector<int>`는 GDB가 기본 템플릿 인자(`std::allocator<int>`)를 접어서 보여 줍니다.

```text
(gdb) ptype pt
type = struct Point {
    int x;
    int y;
    char name[20];
}
(gdb) whatis pt
type = Point
(gdb) ptype v
type = std::vector<int>
```

`ptype /o`는 각 멤버의 *byte offset*과 *크기*, 그리고 정렬 때문에 생긴 빈 공간까지 보여 줍니다. `Node`에서는 `int` 뒤의 4바이트 구멍이 그대로 드러납니다. 구조체를 네트워크 패킷이나 파일 포맷과 맞춰 볼 때 바로 쓰는 출력입니다.

```text
(gdb) ptype /o Point
/* offset      |    size */  type = struct Point {
/*      0      |       4 */    int x;
/*      4      |       4 */    int y;
/*      8      |      20 */    char name[20];

                               /* total size (bytes):   28 */
                             }
(gdb) ptype /o Node
/* offset      |    size */  type = struct Node {
/*      0      |       4 */    int value;
/* XXX  4-byte hole      */
/*      8      |       8 */    Node *next;

                               /* total size (bytes):   16 */
                             }
```

LLDB에서는 `type lookup`이 정의를, `frame variable --raw`가 formatter를 끈 원래 구조를 보여 줍니다. `--raw`로 보면 `name`이 문자열 대신 20개 원소 배열로 풀립니다.

```text
(lldb) type lookup Point
struct Point {
    int x;
    int y;
    char name[20];
}
(lldb) frame variable pt
(Point) pt = {
  x = 3
  y = 4
  name = "origin"
}
(lldb) frame variable --raw pt
(Point) pt = {
  x = 3
  y = 4
  name = {
    [0] = 'o'
    [1] = 'r'
...
    [19] = '\0'
  }
}
```

---

## `info registers` — 레지스터

레지스터는 CPU가 손에 쥐고 있는 메모장이고, 최적화된 코드에서는 변수의 값이 메모리가 아니라 여기에만 있습니다. 이 글의 실습 환경은 arm64라서 레지스터 이름이 x86-64의 `rax`·`rip`과 다릅니다.

```text
(gdb) info registers x0 x1 x29 x30 sp pc cpsr
x0             0xaaaaaaadb220      187649984672288
x1             0x63                99
x29            0xfffffffff7a0      281474976708512
x30            0xaaaaaaaa2108      187649984438536
sp             0xfffffffff7a0      0xfffffffff7a0
pc             0xaaaaaaaa2118      0xaaaaaaaa2118 <main()+792>
cpsr           0x60001000          [ EL=0 BTYPE=0 SSBS C Z ]
```

각 레지스터의 역할은 Arm의 [AAPCS64](https://github.com/ARM-software/abi-aa/blob/main/aapcs64/aapcs64.rst) "General-purpose Registers" 절의 Table 2에 정의되어 있습니다.

| 레지스터 | AAPCS64 역할 |
|----------|--------------|
| `pc` | 다음에 실행할 명령 주소 |
| `sp` | The Stack Pointer |
| `x30` (`lr`) | The Link Register, 함수가 돌아갈 주소 |
| `x29` (`fp`) | The Frame Pointer |
| `x19`~`x28` | Callee-saved 레지스터 |
| `x8` | Indirect result location register |
| `x0`~`x7` | Parameter/result registers, 인자 1~8번째와 반환값 |

이 시리즈는 x86-64 머신에서 실행하지 않았으므로 x86-64의 레지스터 이름과 호출 규약은 다루지 않습니다.

레지스터는 `$이름`으로 식 안에서 변수처럼 씁니다. GDB는 `$pc`와 `$sp`에 포인터 타입을 붙여 줍니다.

```text
(gdb) print $pc
$1 = (void (*)(void)) 0xaaaaaaaa2118 <main()+792>
(gdb) print $sp
$2 = (void *) 0xfffffffff7a0
```

LLDB는 `register read`이고, `fp`·`lr` 같은 별칭 이름을 받으며, 주소처럼 보이는 값에는 심볼과 줄을 붙여 줍니다. `lr`이 53행을 가리키는 것은 마지막으로 끝난 호출(`*heap = 99` 직전의 `malloc`)에서 돌아온 주소가 남아 있기 때문입니다.

```text
(lldb) register read x0 x1 fp lr sp pc cpsr
      x0 = 0x0000aaaaaaadb220
      x1 = 0x0000000000000063
      fp = 0x0000fffffffff7f0
      lr = 0x0000aaaaaaaa2108  inspect`main + 776 at inspect.cpp:53:29
      sp = 0x0000fffffffff7f0
      pc = 0x0000aaaaaaaa2118  inspect`main + 792 at inspect.cpp:55:11
    cpsr = 0x60001000
         = (N = 0, Z = 1, C = 1, V = 0, DIT = 0, SS = 0, IL = 0, BTYPE = 0, D = 0, A = 0, I = 0, F = 0, nRW = 0, EL = 0, SP = 0)
(lldb) p $pc
(unsigned long) 187649984438552
```

### 어셈블리와 소스 함께 보기

`disassemble /s`는 소스 줄과 명령을 섞어 보여 줍니다. `-O0`의 `add`는 인자를 스택에 저장했다가 다시 읽는 모습이 그대로 보입니다. 현재 PC가 함수 안에 있으면 그 줄 앞에 `=>`가 붙습니다(뒤의 `-O2` 예에서 볼 수 있습니다).

```text
(gdb) disassemble /s add
Dump of assembler code for function _Z3addii:
inspect.cpp:
28	int add(int a, int b) { return a + b; }
   0x0000aaaaaaaa1d68 <+0>:	sub	sp, sp, #0x10
   0x0000aaaaaaaa1d6c <+4>:	str	w0, [sp, #12]
   0x0000aaaaaaaa1d70 <+8>:	str	w1, [sp, #8]
   0x0000aaaaaaaa1d74 <+12>:	ldr	w1, [sp, #12]
   0x0000aaaaaaaa1d78 <+16>:	ldr	w0, [sp, #8]
   0x0000aaaaaaaa1d7c <+20>:	add	w0, w1, w0
   0x0000aaaaaaaa1d80 <+24>:	add	sp, sp, #0x10
   0x0000aaaaaaaa1d84 <+28>:	ret
End of assembler dump.
```

---

## STL 컨테이너 — pretty printer

`std::vector`의 내부는 포인터 세 개(`_M_start`·`_M_finish`·`_M_end_of_storage`)입니다. 이걸 그대로 보여 주면 원소를 보려고 포인터 계산을 해야 하므로, GDB는 libstdc++가 함께 배포하는 Python *pretty printer*로 원소를 펼쳐 보여 줍니다.

```text
(gdb) print v
$4 = std::vector of length 5, capacity 5 = {1, 2, 3, 4, 5}
(gdb) info pretty-printer
global pretty-printers:
  builtin
objfile /lib/aarch64-linux-gnu/libstdc++.so.6 pretty-printers:
  libstdc++-v6
```

`info pretty-printer`가 보여 주듯 printer는 `libstdc++.so.6`이라는 objfile에 묶여 있습니다. Debian에서는 `/usr/share/gdb/auto-load/usr/lib/aarch64-linux-gnu/libstdc++.so.6.0.33-gdb.py`가 그 스크립트이고, GDB가 libstdc++를 읽을 때 같은 경로 이름의 `-gdb.py`를 찾아 실행합니다(GDB 매뉴얼 objfile-gdb.py file).

### pretty printer를 끄면

`print/r`(raw)로 printer를 건너뛰면 libstdc++의 실제 멤버가 보입니다. 원소 5개짜리 `int` 벡터라 `_M_finish - _M_start`가 20바이트(`0x...32c4 - 0x...32b0`)입니다.

```text
(gdb) print/r v
$1 = {<std::_Vector_base<int, std::allocator<int> >> = {_M_impl = {<std::allocator<int>> = {<std::__new_allocator<int>> = {<No data fields>}, <No data fields>}, <std::_Vector_base<int, std::allocator<int> >::_Vector_impl_data> = {_M_start = 0xaaaaaaad32b0, _M_finish = 0xaaaaaaad32c4, _M_end_of_storage = 0xaaaaaaad32c4}, <No data fields>}}, <No data fields>}
```

`print v`가 이런 모양으로 나온다면 printer가 빠진 상태입니다. 이때는 `info pretty-printer` 목록에 `libstdc++-v6`가 있는지, `show auto-load safe-path`가 printer 스크립트 경로를 허용하는지 봅니다. 등록 절차는 [Ch 9](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting)와 [GDB Pretty-Printer 심화](/blog/tools/debugging/gdb-extension/chapter03-pretty-printers)에서 다룹니다.

### 자주 보는 STL 컨테이너 — GDB

GCC 14.2의 libstdc++ printer는 C++17·C++20 타입도 펼쳐 줍니다.

```text
(gdb) print my_map
$5 = std::map with 3 elements = {[1] = "one", [2] = "two", [3] = "three"}
(gdb) print my_set
$6 = std::set with 4 elements = {[0] = 1, [1] = 2, [2] = 3, [3] = 4}
(gdb) print my_string
$7 = "hello world"
(gdb) print my_pair
$8 = {first = 1, second = "value"}
(gdb) print my_optional
$9 = std::optional = {[contained value] = 42}
(gdb) print my_unique_ptr
$10 = std::unique_ptr<int> = {get() = 0xaaaaaaad3480}
(gdb) print *my_unique_ptr
$11 = 42
(gdb) print my_variant
$12 = std::variant [index 1] = {"text"}
(gdb) print my_span
$13 = std::span of length 3 = {1, 2, 3}
```

### LLDB의 STL

LLDB는 formatter를 *LLDB 안에* 내장하고 있어 별도 Python 스크립트 없이 컨테이너를 펼칩니다. 같은 Linux 바이너리(libstdc++)를 lldb 19.1.7로 보면 대부분은 펼쳐지지만 `std::span`은 내부 멤버 그대로 나오고, `unique_ptr`은 주소만 보여 줍니다.

```text
(lldb) frame variable v my_set my_optional my_unique_ptr my_variant my_span
(std::vector<int>) v = size=5 {
  [0] = 1
  [1] = 2
  [2] = 3
  [3] = 4
  [4] = 5
}
(std::set<int>) my_set = size=4 {
...
}
(std::optional<int>) my_optional =  Has Value=true  {
  Value = 42
}
(std::unique_ptr<int>) my_unique_ptr = 0xaaaaaaad3480 {
  pointer = 0x0000aaaaaaad3480
}
(std::variant<int, std::basic_string<char> >) my_variant =  Active Type = std::basic_string<char>  {
  Value = "text"
}
(std::span<int>) my_span = {
  _M_ptr = 0x0000aaaaaaad32b0
  _M_extent = (_M_extent_value = 3)
}
```

같은 소스를 macOS에서 Apple clang 21 + libc++로 빌드해 Xcode의 lldb-2103으로 보면 `std::span`이 `size=3 { [0] = 1 ... }`으로 펼쳐지고, `unique_ptr`은 `my_unique_ptr = 42 { pointer = 0x00000001006412d0 }`처럼 가리키는 값까지 요약에 넣습니다. LLDB formatter의 완성도가 표준 라이브러리 구현(libc++·libstdc++)에 따라 다르다는 것을 두 출력이 직접 보여 줍니다. 위 Linux 실행에서는 lldb 19.1.7이 `DW_TAG_member '_M_local_buf' refers to type 0x000000000000f8fb which extends beyond the bounds of 0x0000312b`라는 DWARF 경고도 한 줄 냈는데, 출력된 값에는 영향이 없었습니다.

---

## 포인터 / 연결 리스트 따라가기

포인터 사슬은 보물찾기 쪽지와 같습니다. 쪽지 하나를 열면 다음 쪽지가 있는 자리가 적혀 있고, 마지막 쪽지에는 "끝"(`0x0`)이 적혀 있습니다. 세 노드짜리 리스트를 손으로 따라가면 이렇습니다.

```text
(gdb) print head
$14 = (Node *) 0xaaaaaaad34e0
(gdb) print *head
$15 = {value = 1, next = 0xaaaaaaad34c0}
(gdb) print *head->next
$16 = {value = 2, next = 0xaaaaaaad34a0}
(gdb) print *head->next->next
$17 = {value = 3, next = 0x0}
```

하나씩 따라가기 번거로우면 GDB의 `while`과 편의 변수 `$p`로 루프를 돌립니다. `>`는 GDB가 블록 안의 줄을 받을 때 띄우는 프롬프트입니다.

```text
(gdb) set $p = head
(gdb) while $p != 0
 >print $p->value
 >set $p = $p->next
 >end
$1 = 1
$2 = 2
$3 = 3
```

더 복잡한 순회는 [Ch 9](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting)의 Python 스크립트로 옮깁니다.

## *연결 리스트 길이* 측정

같은 루프에서 출력 대신 개수를 세면 길이가 나옵니다. 1000개 노드를 만든 `big`으로 실행했습니다.

```text
(gdb) set $count = 0
(gdb) set $p = big
(gdb) while $p != 0
 >set $count = $count + 1
 >set $p = $p->next
 >end
(gdb) print $count
$4 = 1000
```

이 루프는 `next`가 결국 `0`이 된다고 가정합니다. 리스트가 순환하면 루프가 끝나지 않으므로, 의심될 때는 상한을 함께 둡니다. 같은 `big`에 `while $p != 0 && $count < 500`을 주면 `$count`가 500에서 멈췄습니다.

---

## *동적 캐스트* — 다형성 객체

`Base*`로 가리키는 `Derived` 객체를 그냥 출력하면 GDB는 *정적 타입*인 `Base`의 멤버만 보여 줍니다. vtable 포인터의 심볼 이름(`vtable for Derived+16`)에서 실제 타입이 이미 드러나 있는 점이 단서입니다.

```text
(gdb) print *p
$18 = {_vptr.Base = 0xaaaaaaabfd60 <vtable for Derived+16>, id = 7}
```

`set print object on`을 켜면 GDB가 vtable로 실제 타입을 찾아 `Derived` 전체를 보여 주고, 포인터 자체의 타입도 `Derived *`로 표시합니다.

```text
(gdb) set print object on
(gdb) print *p
$19 = (Derived) {<Base> = {_vptr.Base = 0xaaaaaaabfd60 <vtable for Derived+16>, id = 7}, extra = 42}
(gdb) print p
$20 = (Derived *) 0xaaaaaaadb200
```

설정을 바꾸지 않고 한 번만 보려면 명시적으로 캐스팅합니다.

```text
(gdb) print *(Derived*)p
$21 = {<Base> = {_vptr.Base = 0xaaaaaaabfd60 <vtable for Derived+16>, id = 7}, extra = 42}
```

LLDB는 기본값이 이미 동적 타입을 따라갑니다. lldb 19.1.7의 `target.prefer-dynamic-value` 기본값은 `no-run-target`이고, 그 상태에서 `frame variable *p`가 `Derived`로 나왔습니다.

```text
(lldb) settings show target.prefer-dynamic-value
target.prefer-dynamic-value (enum) = no-run-target
(lldb) frame variable *p
(Derived) *p = {
  Base = (id = 7)
  extra = 42
}
```

---

## 메모리 *비교* — `compare-sections`

`compare-sections`는 실행 파일의 loadable section과 대상 메모리의 같은 section을 비교합니다(GDB 매뉴얼 Memory 절). `-r`은 읽기 전용 section만 비교하고, 원격 타깃이 `qCRC` 패킷을 지원하면 메모리를 다 읽지 않고 CRC로 비교합니다. 실행 중 코드가 덮어써지지 않았는지 볼 때 씁니다.

`-no-pie`로 빌드한 실행 파일에서는 기대대로 동작합니다. 실행 중에 `main`의 첫 바이트를 0으로 덮어쓰자 `.text`가 바로 불일치로 바뀌었습니다.

```text
(gdb) compare-sections .text
Section .text, range 0x401a80 -- 0x4070b4: matched.
(gdb) set var *(unsigned char*)main = 0
(gdb) compare-sections .text
Section .text, range 0x401a80 -- 0x4070b4: MIS-MATCHED!
warning: One or more sections of the target image does not match the loaded file
```

같은 명령을 PIE 실행 파일(`file inspect`가 `ELF 64-bit LSB pie executable`로 보고하는 Debian GCC의 기본 출력)에 쓰면 모든 section이 `MIS-MATCHED!`로 나옵니다. 출력의 주소가 `.text, range 0x1c40 -- 0x7290`처럼 *재배치 전* 링크 주소라서, `0xaaaaaaaa0000`에 올라간 실제 코드와 다른 자리를 비교하기 때문입니다. 원격 `gdbserver`에 `_start`에서 붙은 상태로 실행하면 `target memory fault, section .note.gnu.build-id, range 0x270 -- 0x294`로 중단됐습니다. GDB 16.3에서 이 명령은 로드 주소가 링크 주소와 같은 실행 파일(`-no-pie` 등)에서만 쓸 만한 결과를 냈습니다.

---

## `find` — *값으로 메모리 검색*

메모리 어딘가에 있는 알려진 값(매직 넘버, 문자열 조각)의 위치를 찾습니다. 기본 단위는 값의 타입 크기이고, `/b`를 붙이면 바이트 시퀀스로 찾습니다.

```text
(gdb) print &marker
$5 = (unsigned int (*)[4]) 0xfffffffff920
(gdb) find &marker[0], &marker[4], 0x12345678
0xfffffffff924
1 pattern found.
(gdb) find /b pattern, +8, 'A', 'B', 'C'
0xfffffffff91a
1 pattern found.
(gdb) print &pattern
$7 = (char (*)[8]) 0xfffffffff918
```

`0x12345678`은 `marker[1]` 자리(시작 + 4), `"ABC"`는 `pattern`의 세 번째 바이트(시작 + 2)에서 찾았습니다. LLDB의 `memory find`는 찾은 주소 뒤로 메모리를 함께 덤프합니다.

```text
(lldb) memory find -s "ABC" -- &pattern &pattern+8
data found at location: 0xfffffffff96a
0xfffffffff96a: 41 42 43 78 78 00 11 11 11 11 78 56 34 12 22 22  ABCxx.....xV4.""
```

덤프 뒷부분에 `11 11 11 11 78 56 34 12`가 보이는 것은 스택에서 `pattern` 바로 뒤에 `marker`가 놓였기 때문입니다.

---

## 문자열 안의 문자 코드

GDB의 `printf`는 C의 `printf` 형식을 그대로 받습니다. 문자열 리터럴의 한 글자를 정수로 찍으면 문자 코드가 나옵니다.

```text
(gdb) printf "%d\n", "hello"[2]
108
```

108은 `'l'`의 ASCII 코드입니다.

---

## `dump` / `restore` — 메모리 *저장과 복원*

메모리 일부를 파일로 떠 두었다가 나중에 되돌립니다. 버퍼를 망가뜨리는 실험을 하기 전에 원본을 백업해 두는 용도로 씁니다.

```text
(gdb) dump binary memory greeting.bin greeting greeting+16
(gdb) set var greeting[0] = 'J'
(gdb) print greeting
$8 = "Jello, world\000\000\000"
(gdb) restore greeting.bin binary greeting
Restoring binary file greeting.bin into memory (0xfffffffff930 to 0xfffffffff940)
(gdb) print greeting
$9 = "Hello, world\000\000\000"
```

`greeting.bin`은 정확히 16바이트 파일로 만들어졌습니다. `restore ... binary ADDR`의 주소 인자는 파일 내용을 쓸 시작 주소입니다.

---

## 자동 호출 — *expression 안의 함수*

`print`에 함수 호출을 넣으면 디버거가 대상 프로세스 안에서 *그 함수를 진짜로 실행*합니다. 순수 함수라면 편리하지만, 상태를 바꾸는 함수라면 그 결과가 프로세스에 남습니다.

```text
(gdb) print add(1, 2)
$10 = 3
(gdb) print *heap
$11 = 99
(gdb) print free(heap)
$12 = void
```

`free(heap)`은 실제로 실행됐고, 프로그램 55행 바로 뒤에는 `free(heap)`이 또 있습니다. 디버거에서 같은 포인터를 한 번 더 해제해 보면 glibc가 곧바로 이중 해제를 잡아냅니다.

```text
(gdb) print (void)free(heap)
free(): double free detected in tcache 2

Program received signal SIGABRT, Aborted.
__pthread_kill_implementation (threadid=281474842415136, signo=signo@entry=6, no_tid=no_tid@entry=0) at ./nptl/pthread_kill.c:44
...
The program being debugged was signaled while in a function called from GDB.
GDB remains in the frame where the signal was received.
```

이 상태에서 `continue`하면 `Program terminated with signal SIGABRT, Aborted.`로 프로세스가 끝납니다. 디버거로 부르는 함수는 프로그램이 직접 부른 것과 똑같이 취급된다는 점을 기억해 둡니다.

---

## *최적화된 변수* — "optimized out"

`-O2`로 빌드하면 컴파일러가 변수의 값을 레지스터에만 두거나, 더 필요 없어진 순간 그 레지스터를 다른 값으로 덮어씁니다. 그 지점에서 디버그 정보가 변수 위치를 설명하지 못하면 GDB는 `<optimized out>`을 출력합니다. 아래 `opt.c`를 `gcc -g -O2`로 빌드해 8행에 멈췄습니다.

```c title="opt.c"
__attribute__((noinline)) int scale(int x) {
    int doubled = x * 2;
    int result = doubled + atoi("1");
    printf("%d\n", result);
    return result * 3;
}

int main(int argc, char** argv) {
    return scale(argc + 40) & 0xff;
}
```

```text
Breakpoint 1, scale (x=<optimized out>) at opt.c:8
8	    printf("%d\n", result);
(gdb) info locals
doubled = <optimized out>
result = 83
(gdb) print x@entry
$1 = <optimized out>
(gdb) info registers x0 x19
x0             0x1                 1
x19            0x53                83
```

`result`는 살아 있고 `x`·`doubled`는 사라졌습니다. 이유는 디스어셈블리에 있습니다. 함수 입구에서 `x`(w0)를 w19로 옮긴 뒤, `add w19, w0, w19, lsl #1`(`atoi` 결과 + `x`×2)로 같은 레지스터에 `result`를 덮어썼습니다. `x`와 `doubled`를 담은 레지스터가 더는 없습니다.

```text
5	__attribute__((noinline)) int scale(int x) {
   0x0000aaaaaaaa0854 <+20>:	mov	w19, w0
...
7	    int result = doubled + atoi("1");
   0x0000aaaaaaaa0864 <+36>:	add	w19, w0, w19, lsl #1

8	    printf("%d\n", result);
=> 0x0000aaaaaaaa0868 <+40>:	mov	w1, w19
```

이럴 때 쓸 수 있는 방법은 세 가지입니다.

1. **`-O0` 또는 `-Og`로 다시 빌드한다.** 가장 확실하지만, 다시 빌드한 바이너리는 원래 바이너리와 다른 프로그램입니다.
2. **디스어셈블리로 값을 거꾸로 계산한다.** 위 예에서는 w19 = 1 + 2x = 83이므로 x = 41, 즉 `argc + 40`에서 `argc = 1`이었다고 계산할 수 있습니다.
3. **값이 덮어써지기 전 자리에 멈춘다.** `break *scale+20`으로 `mov w19, w0` 명령에 멈추면 `print $w0`가 `$1 = 41`, 곧 `x`를 보여 줍니다.

`x@entry`는 함수 진입 시점의 값을 호출자 쪽 DWARF 정보로 되살리는 GDB 문법입니다(GDB 매뉴얼 Variables 절). 이번 빌드에서는 `up`으로 올라간 `main`의 `argc`도 `<optimized out>`이었고 `x@entry`도 되살아나지 않았습니다. 사고 당시의 바이너리와 core가 있다면 그것을 먼저 보존하고, [Ch 11](/blog/tools/debugging/gdb-lldb/chapter11-practical-tips)의 순서로 진단합니다.

---

## 정리

- **`x`**: 임의 주소의 메모리를 *원하는 형식*으로 읽습니다. LLDB의 `x`는 `memory read`의 alias이고, 배열은 `&greeting`처럼 주소로 넘깁니다.
- **`ptype /o`**: 구조체의 *멤버 offset과 크기*, 정렬 구멍(`XXX 4-byte hole`)까지 보여 줍니다.
- **레지스터**: arm64에서는 `x0`~`x7`이 인자·반환값, `x29`가 FP, `x30`이 LR입니다(AAPCS64 Table 2).
- **STL**: GDB는 libstdc++의 Python printer, LLDB는 내장 formatter를 씁니다. lldb 19.1.7은 libstdc++의 `std::span`을 펼치지 못했고, libc++에서는 펼쳤습니다.
- **연결 리스트**: `while`과 `$p`로 순회하고, 순환이 의심되면 상한을 둡니다.
- **`set print object on`**: GDB가 vtable로 실제 타입을 찾습니다. LLDB는 기본값이 동적 타입입니다.
- **`compare-sections`**: 로드 주소가 고정된 타깃에서만 의미가 있습니다. PIE에서는 전부 불일치로 나옵니다.
- **함수 호출**: `print free(p)`는 진짜 `free`입니다. 같은 포인터를 한 번 더 해제하자 프로세스가 SIGABRT로 끝났습니다.
- **`<optimized out>`**: 디스어셈블리에서 값이 덮어써진 지점을 찾아 거꾸로 계산하거나 그 전에 멈춥니다.

## 다음 장 예고

[Ch 4: Backtrace와 프레임](/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames)에서는 *호출 스택*을 더 깊이 다룹니다. `bt`의 상세, 프레임 이동, inline 함수, 코어 덤프의 backtrace.

## 참고 자료

- [GDB Examining Memory](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Memory.html)
- [LLDB Memory Read](https://lldb.llvm.org/use/tutorial.html#examining-memory)
- [GDB Pretty Printers](https://sourceware.org/gdb/wiki/STLSupport)

## 관련 항목

- [Ch 2: 기본 명령 — 10가지](/blog/tools/debugging/gdb-lldb/chapter02-basic-commands) — 이전 장, `print`와 `info`의 기본
- [Ch 4: 콜스택과 프레임](/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames) — 다음 장, 어느 프레임의 변수인가
- [Ch 9: Python 스크립팅](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting) — pretty-printer를 직접 작성
- [GDB Pretty-Printer 심화](/blog/tools/debugging/gdb-extension/chapter03-pretty-printers) — STL·커스텀 타입 시각화
- [리눅스 메모리 회계](/blog/tools/debugging/memory/chapter01-memory-accounting) — `x`로 본 주소가 어느 매핑인지
- [GDB 공식 매뉴얼](https://sourceware.org/gdb/current/onlinedocs/gdb.html) — 식 평가와 데이터 검사 정본
