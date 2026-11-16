---
title: "DWARF .debug_loc 분석 — Variable Location Expression VM"
slug: "tools/debugging/dwarf-elf/chapter04-debug-loc"
date: 2026-05-23T09:04:00
description: "변수가 어디 있는지의 표현. 스택 머신 opcode, location list, DW_OP_entry_value."
tags: [dwarf, debug-loc, expression-vm, optimization]
series: "DWARF and ELF Internals"
seriesOrder: 4
draft: false
topics: ["tools", "tools/debugging"]
---

`print x`라고 했을 때 GDB는 `x`가 *지금 어디 있는지* 어떻게 알까요. DW_AT_location은 DIE에 직접 넣은 표현식이나 .debug_loc (DWARF 4)/.debug_loclists (DWARF 5)의 목록을 가리킬 수 있습니다. 표현식은 레지스터 위치·메모리 주소·값·조각을 기술합니다.

이 장은 그 VM을 다룹니다. 왜 변수 위치가 *식*이어야 하는지, 주요 `DW_OP_*` opcode의 의미, location list로 *PC 구간별* 다른 위치를 표현하는 법, 그리고 DWARF 5의 `DW_OP_entry_value`가 "optimized out"을 어떻게 줄이는지입니다. 예제는 macOS의 Homebrew LLVM 23.1.5로 만든 x86-64·ARM ELF 오브젝트와 Debian 13 arm64 게스트의 GCC 14.2·GDB 16.3에서 실행했고, 규칙은 [DWARF 5 §2.5](https://dwarfstd.org/doc/DWARF5.pdf) "DWARF Expressions"와 §2.6 "Location Descriptions"를 따릅니다.

## 왜 표현식인가

단순히 *주소만* 저장하면 안 될까요? 안 됩니다. 최적화된 코드에서는 같은 변수가 PC 위치에 따라 다른 곳에 있기 때문입니다. 이사를 자주 다니는 사람의 주소록에 "3월까지는 A, 6월까지는 B, 그 뒤로는 연락처 없음"이라고 적어 두는 것과 같습니다.

```c title="locals.c"
int global = 7;
extern int consume(int);
int sample(int input) {
    int tracked = input + 3;
    consume(tracked);
    return tracked + input + global;
}
```

clang 23.1.5 `--target=x86_64-unknown-linux-gnu -g -gdwarf-5 -O2`로 컴파일하면 `sample`은 이렇게 됩니다.

```text
0000000000000000 <sample>:
       0:      	pushq	%rbx
       1:      	movl	%edi, %ebx
       3:      	leal	0x3(%rbx), %edi
       6:      	callq	0xb <sample+0xb>
       b:      	leal	0x3(,%rbx,2), %eax
      12:      	addl	(%rip), %eax            # 0x18 <sample+0x18>
      18:      	popq	%rbx
      19:      	retq
```

`input`은 처음에 `%rdi`에 들어오고, 0x1에서 callee-saved인 `%rbx`로 옮겨진 뒤, 0x18의 `popq %rbx`로 `%rbx`가 호출자 값으로 돌아가면 어느 레지스터에도 남지 않습니다. `tracked`는 `consume`에 넘기는 동안(0x3~0xb)만 `%rdi`에 있고, 그 뒤에는 `2 * input + 3`으로 다시 계산될 뿐 변수로는 존재하지 않습니다. 이런 위치를 표현하려면 단순 주소가 아니라 *PC 구간별 식*이 필요합니다. 실제 출력은 아래 Location List 절에 있습니다.

## 스택 머신

DWARF expression은 *스택 머신*의 명령어 시퀀스.

- 명령이 *스택*을 조작합니다 (push, pop, 산술 등).
- 기본은 마지막 스택 top이 그 변수의 *메모리 주소*입니다(memory location description, §2.6.1.1.2).
- `DW_OP_stack_value`가 붙으면 스택 top이 *값 자체*입니다(implicit location description, §2.6.1.1.4).
- `DW_OP_reg*`는 스택을 쓰지 않고 "값이 이 레지스터에 있다"는 별도 종류입니다(register location description, §2.6.1.1.3).

![DWARF expression 스택 머신 — 각 opcode 후의 스택 상태](/images/blog/tools/diagrams/dwarf-expr-vm.svg)

| Expression | 의미 |
|------------|------|
| `DW_OP_reg5` | 값이 `r5` 레지스터에 있음 |
| `DW_OP_fbreg -16` | frame base + (−16) 주소에 있음 |
| `DW_OP_addr 0x600000` | 절대 주소 |
| `DW_OP_breg6 -8` | `r6 + (−8)` 주소에 있음 |
| `DW_OP_constu 42 DW_OP_stack_value` | 값이 42 (메모리 어디에도 없음) |
| `DW_OP_reg3 DW_OP_piece 4 DW_OP_reg5 DW_OP_piece 4` | low 4바이트는 `r3`, high 4바이트는 `r5` |

각 줄이 한 변수의 위치 표현입니다. 위의 `DW_OP_reg5`가 x86-64에서 어느 레지스터인지는 DWARF가 아니라 psABI의 DWARF 레지스터 번호 표가 정하며, x86-64에서 5는 `%rdi`, 3은 `%rbx`, 6은 `%rbp`, 7은 `%rsp`입니다. `llvm-dwarfdump`가 `DW_OP_reg5 RDI`처럼 이름을 붙여 주는 것도 이 표를 따른 것입니다.

## Opcode 카탈로그

[DWARF 5 Table 7.9](https://dwarfstd.org/doc/DWARF5.pdf) "DWARF operation encodings"는 `lit0~31`·`reg0~31`·`breg0~31`을 각각 32개로 세면 164개 연산을 정의합니다. 자주 보이는 것만 추립니다.

### Literal — 상수 push

| Opcode | 인자 | 동작 |
|--------|------|------|
| `DW_OP_lit0..31` | - | 0~31 push |
| `DW_OP_const1u` | u1 | 1바이트 unsigned push |
| `DW_OP_const2u` | u2 | 2바이트 |
| `DW_OP_const4u` | u4 | 4바이트 |
| `DW_OP_const8u` | u8 | 8바이트 |
| `DW_OP_const1s..8s` | signed | signed 버전 |
| `DW_OP_constu` | uleb128 | LEB128 unsigned |
| `DW_OP_consts` | sleb128 | LEB128 signed |
| `DW_OP_addr` | address | 절대 주소 push |
| `DW_OP_addrx` (DWARF 5) | uleb128 | `.debug_addr` 인덱스로 주소 |

### 레지스터 — 값이 레지스터에

| Opcode | 인자 | 동작 |
|--------|------|------|
| `DW_OP_reg0..31` | - | 변수가 reg0~31에 |
| `DW_OP_regx` | uleb128 | 임의 레지스터 (>= 32) |
| `DW_OP_breg0..31` | sleb128 | reg + offset 주소를 push |
| `DW_OP_bregx` | uleb128, sleb128 | 임의 reg + offset |
| `DW_OP_fbreg` | sleb128 | frame_base + offset 주소 |

### 메모리 접근

| Opcode | 인자 | 동작 |
|--------|------|------|
| `DW_OP_deref` | - | 스택 top 주소를 dereference (full word) |
| `DW_OP_deref_size` | u1 | n 바이트만 |
| `DW_OP_deref_type` | 1-byte unsigned 크기, unsigned LEB128 타입 DIE offset | typed deref (DWARF 5 §2.5.1.3) |
| `DW_OP_xderef` | - | 다중 주소 공간 deref |

### 산술

| Opcode | 의미 |
|--------|------|
| `DW_OP_plus` | a + b |
| `DW_OP_minus` | a - b |
| `DW_OP_mul` | a * b |
| `DW_OP_div` | a / b |
| `DW_OP_mod` | a % b |
| `DW_OP_and`/`or`/`xor`/`not` | 비트 연산 |
| `DW_OP_shl`/`shr`/`shra` | 시프트 |
| `DW_OP_abs` | abs(a) |
| `DW_OP_neg` | -a |
| `DW_OP_plus_uconst` | uleb128, top += operand |

### 스택 조작

| Opcode | 의미 |
|--------|------|
| `DW_OP_dup` | top 복제 |
| `DW_OP_drop` | top 제거 |
| `DW_OP_swap` | top 두 개 교환 |
| `DW_OP_over` | top-1을 복제해 top에 |
| `DW_OP_rot` | top 3개 회전 |
| `DW_OP_pick` | u1, n번째 push |

### 비교 / 제어

| Opcode | 의미 |
|--------|------|
| `DW_OP_eq`/`ne`/`lt`/`le`/`gt`/`ge` | 비교, 1 또는 0 push |
| `DW_OP_skip` | 2-byte signed 고정 폭 변위, 무조건 점프 |
| `DW_OP_bra` | 2-byte signed 고정 폭 변위, 조건부 점프 |

### 결과 표현 — 메모리 / 값 / 조각

| Opcode | 의미 |
|--------|------|
| `DW_OP_stack_value` | 스택 top이 *값 자체* (주소 아님) |
| `DW_OP_piece` | uleb128, 이전 표현이 *n바이트 조각* |
| `DW_OP_bit_piece` | 이전 표현이 *비트 조각* |
| `DW_OP_implicit_value` | block, 값이 *block bytes* (DWARF 4) |
| `DW_OP_implicit_pointer` (DWARF 5) | reference + offset, 사라진 포인터 |
| `DW_OP_entry_value` (DWARF 5) | block, 함수 진입 시 표현식 값 |

기본적으로 *스택 top = 메모리 주소*. `DW_OP_stack_value`가 있으면 *스택 top = 값 자체*. `DW_OP_piece`는 *조각*을 표현.

## 실제 예 — 단순한 케이스

2장의 `main.o`(clang `-O0`)에서 지역 변수 `obj`의 위치는 frame base 기준입니다.

```text
0x00000032:     DW_TAG_variable
                  DW_AT_location        (DW_OP_fbreg -12)
                  DW_AT_name    ("obj")
```

같은 함수의 `DW_AT_frame_base`가 `DW_OP_reg6 RBP`였으므로 `obj`는 `%rbp - 12`에 있습니다. `-O0` 스택 변수의 전형적인 모양입니다.

`-O2`에서 `sample`의 `input`은 처음 6바이트 동안 이렇게 표현됩니다.

```text
[0x0000000000000000, 0x0000000000000006): DW_OP_reg5 RDI
```

주소가 아니라 "값이 `%rdi`에 있다"는 뜻입니다. 레지스터로 들어온 인자가 이 모양을 갖습니다.

전역 변수는 고정 주소입니다. DWARF 5 오브젝트에서는 주소를 `.debug_addr` 표에 두고 `DW_OP_addrx`로 인덱스만 적고(`locals.o`의 `global`은 `DW_OP_addrx 0x2`), DWARF 4에서는 `DW_OP_addr`가 주소를 직접 담습니다.

```text
DW_AT_location = DW_OP_breg6 -8
```

DWARF register 6의 값에서 8을 뺀 주소입니다. x86-64에서는 `%rbp`이고, frame pointer로 쓰이는지와 상관없이 계산식은 같습니다.

## 복잡한 예 — 조각난 변수

32-bit ARM에서 64-bit `long long`은 레지스터 두 개에 나뉘어 들어갑니다. `piece.c`를 clang 23.1.5 `--target=armv7a-linux-gnueabihf -g -O2`로 컴파일했습니다.

```c title="piece.c"
extern long long produce(void);
extern void consume64(long long);
void pass(void) {
    long long my_ll = produce();
    consume64(my_ll);
    consume64(my_ll + 1);
}
```

```text
0x00000032:     DW_TAG_variable
                  DW_AT_location	(indexed (0x0) loclist = 0x00000010:
                     [0x0000000c, 0x00000010): DW_OP_reg4 R4, DW_OP_piece 0x4
                     [0x00000010, 0x00000020): DW_OP_reg4 R4, DW_OP_piece 0x4, DW_OP_reg5 R5, DW_OP_piece 0x4)
                  DW_AT_name	("my_ll")
```

0x10부터 하위 4바이트는 `r4`, 상위 4바이트는 `r5`에 있습니다. §2.6.1.2 "Composite Location Descriptions"대로 조각은 메모리 주소 순서, 곧 little-endian에서 하위 바이트부터 나열됩니다. 0xc~0x10 구간의 식에는 `r4` 조각 하나만 있어 상위 4바이트의 위치가 기술되어 있지 않습니다.

## 더 복잡 — implicit value

값이 컴파일 시 정해져 메모리·레지스터 어디에도 없을 때는 식이 값 자체를 만듭니다(§2.6.1.1.4).

```text
DW_AT_location = DW_OP_constu 42 DW_OP_stack_value
```

또 하나는 값의 바이트를 그대로 담는 `DW_OP_implicit_value`입니다. 첫 인자가 ULEB128 길이, 다음이 그 길이만큼의 바이트입니다.

```text
DW_AT_location = DW_OP_implicit_value 8 0x01 0x02 0x03 0x04 0x05 0x06 0x07 0x08
```

little-endian 대상에서 8바이트 값 `0x0807060504030201`입니다. DWARF 4에서 추가된 연산입니다.

상수가 변수 전체 수명 동안 같으면 컴파일러는 위치 대신 `DW_AT_const_value` 속성을 씁니다. 아래 `cexpr.cpp`를 clang 23.1.5 `-O2`로 컴파일하자 지역 변수 `x`가 `DW_AT_const_value (10)`로 나왔습니다.

## DW_OP_entry_value — 함수 진입 시점의 값

인자가 들어온 레지스터가 본문 중간에 다른 용도로 쓰이면, 그 뒤부터는 원래 인자값을 가리킬 곳이 없습니다. DWARF 5의 `DW_OP_entry_value`는 "함수에 들어올 때 이 레지스터에 있던 값"을 뜻하는 연산입니다(§2.5.1.7 "Special Operations"). 실행 중 값을 저장해 두는 기능이 아니라, 디버거가 호출자 쪽 정보로 그 값을 되찾으라는 표시입니다.

`sample`의 `input` 위치 목록 마지막 구간이 이것입니다.

```text
[0x0000000000000019, 0x000000000000001a): DW_OP_entry_value(DW_OP_reg5 RDI), DW_OP_stack_value
```

`popq %rbx` 뒤의 `retq` 한 명령 동안 `input`은 "진입 시 `%rdi`의 값"입니다. 디버거는 호출자의 `DW_TAG_call_site_parameter`에서 그 값을 다시 계산합니다. 같은 오브젝트의 `sample` 안에는 `consume` 호출에 대한 이런 항목도 있습니다.

```text
0x00000048:     DW_TAG_call_site
                  DW_AT_call_origin	(0x00000056 "consume")
                  DW_AT_call_return_pc	(0x000000000000000b)
0x0000004e:       DW_TAG_call_site_parameter
                    DW_AT_location	(DW_OP_reg5 RDI)
                    DW_AT_call_value	(DW_OP_breg3 RBX+3)
```

"`consume`을 부를 때 `%rdi`에 넣은 값은 `%rbx + 3`"이라는 뜻입니다. `consume` 안에서 `v`의 진입값을 물으면 디버거는 한 프레임 위로 올라가 이 식을 계산합니다.

게스트에서 GCC 14.2 `-g -O2`로 비슷한 `ev.c`를 빌드하고 GDB 16.3으로 `consume`에 breakpoint를 걸었습니다.

```c title="ev.c"
#include <stdio.h>
__attribute__((noinline)) void consume(int v) { __asm__ volatile("" :: "r"(v) : "memory"); }
__attribute__((noinline)) int sample(int input) {
    int tracked = input + 3;
    consume(tracked);
    consume(tracked * 2);
    return tracked + input;
}
int main(int argc, char **argv) { (void)argv; return sample(argc + 41) & 1; }
```

```text
Breakpoint 1, consume (v=v@entry=45) at ev.c:2
#0  consume (v=v@entry=45) at ev.c:2
#1  0x0000aaaaaaaa07dc in sample (input=42) at ev.c:5
#2  0x0000aaaaaaaa0650 in main (argc=<optimized out>, argv=<optimized out>) at ev.c:9
...
#0  consume (v=v@entry=90) at ev.c:2
#1  0x0000aaaaaaaa07e4 in sample (input=42) at ev.c:6
```

`v=v@entry=45`는 현재 값과 진입값이 같다는 GDB 표기입니다. `objdump --dwarf=loc`로 본 `ev`의 위치 목록에는 `DW_OP_entry_value: (DW_OP_reg0 (x0)); DW_OP_stack_value` 같은 구간이 여러 개 있었습니다. 반면 `main`의 `argc`·`argv`는 `<optimized out>`이었는데, `main`을 부르는 libc 쪽에 call site 정보가 없어서 진입값을 되찾을 길이 없기 때문입니다. 진입값 복원은 호출자가 call site 정보를 남겼을 때만 됩니다.

## DW_OP_implicit_pointer — 포인터가 사라짐

```c title="ip.c"
extern void use(int);
void f(void) {
    int x = 10;
    int *p = &x;
    use(*p);
}
```

최적화하면 `x`는 상수 10이 되고 `p`가 가리킬 메모리도 없습니다. 그래도 `print *p`에 답하려면 "p는 `x`를 가리키는 포인터였다"는 정보가 필요합니다. `DW_OP_implicit_pointer`가 그 표현으로, 인자는 가리키는 대상 DIE의 참조와 offset입니다(§2.6.1.1.4).

게스트의 GCC 14.2 `-g -O2` 출력에서 `x`는 `DW_AT_const_value : 10`, `p`의 위치 목록은 이렇습니다.

```text
$ objdump --dwarf=loc ip.o
...
             0000000000000000 0000000000000008 (DW_OP_implicit_pointer: <0x63> 0)
```

`<0x63>`은 `x`의 DIE offset입니다. GDB 16.3은 이 정보로 답합니다.

```text
(gdb) print p
$1 = (int *) <synthetic pointer>
(gdb) print *p
$2 = 10
```

같은 소스를 clang 23.1.5 `-O2`로 컴파일하면 `p`의 DIE에 `DW_AT_location`이 아예 없었습니다. 이 연산을 쓸지는 컴파일러가 정합니다.

## DW_OP_call_frame_cfa

```text
DW_AT_frame_base = DW_OP_call_frame_cfa
```

CFI(5장)가 계산한 CFA를 스택에 올리는 연산입니다. CFA(Canonical Frame Address)는 현재 함수를 부른 call 명령 직전 호출자의 SP 값입니다. 게스트의 GCC 14.2는 `-O0`·`-O2` 모두 `DW_AT_frame_base`를 이 1바이트(`0x9c`)로 냈습니다. §2.5.1.3은 이유로 공간을 듭니다. CFA를 레지스터 연산으로 직접 쓰면 함수 안에서 레지스터가 바뀔 때마다 location list가 필요한데, CFI가 이미 그 변화를 담고 있다는 것입니다.

## Location List

PC 구간마다 다른 위치를 갖는 변수는 location list로 표현합니다. 같은 `locals.c`를 `-gdwarf-4`로 만든 `.debug_loc`입니다.

```text
$ llvm-dwarfdump --debug-loc locals4.o
.debug_loc contents:
0x00000000:
            (0x0000000000000000, 0x0000000000000006): DW_OP_reg5 RDI
            (0x0000000000000006, 0x0000000000000019): DW_OP_reg3 RBX
            (0x0000000000000019, 0x000000000000001a): DW_OP_GNU_entry_value(DW_OP_reg5 RDI), DW_OP_stack_value

0x0000004c:
            (0x0000000000000006, 0x000000000000000b): DW_OP_reg5 RDI
```

첫 목록이 `input`, 둘째가 `tracked`입니다. DWARF 4 모드에서도 clang은 진입값 연산을 GNU 확장 이름(`DW_OP_GNU_entry_value`)으로 냈습니다. `DW_AT_location`이 `DW_FORM_sec_offset`이면 이 섹션의 offset이고, 디버거는 현재 PC가 든 구간의 식을 씁니다.

어느 구간에도 PC가 없으면 그 시점의 변수는 optimized out입니다. `tracked`는 0x6~0xb 밖에서는 위치가 없으므로, 0xb 이후에 `print tracked`를 하면 `<optimized out>`이 나옵니다.

### DWARF 5 — .debug_loclists

DWARF 5의 `.debug_loclists`는 CU마다 헤더와 offset 표를 두고, 항목 종류(`DW_LLE_*`)를 골라 쓸 수 있게 했습니다(§2.6.2 "Location Lists"). `locals.o`의 목록입니다.

```text
$ llvm-dwarfdump --debug-loclists locals.o
.debug_loclists contents:
locations list header: length = 0x00000029, format = DWARF32, version = 0x0005, addr_size = 0x08, seg_size = 0x00, offset_entry_count = 0x00000002
offsets: [
0x00000008
0x0000001b
]
0x00000014:
            DW_LLE_offset_pair     (0x0000000000000000, 0x0000000000000006): DW_OP_reg5 RDI
            DW_LLE_offset_pair     (0x0000000000000006, 0x0000000000000019): DW_OP_reg3 RBX
            DW_LLE_offset_pair     (0x0000000000000019, 0x000000000000001a): DW_OP_entry_value(DW_OP_reg5 RDI), DW_OP_stack_value

0x00000027:
            DW_LLE_offset_pair     (0x0000000000000006, 0x000000000000000b): DW_OP_reg5 RDI
```

DIE는 `DW_FORM_loclistx` 인덱스(0, 1)로 offset 표를 거쳐 목록을 찾습니다. `DW_LLE_offset_pair`는 CU base 주소 기준 상대 offset 두 개(ULEB128)라서 작은 함수에서는 한두 바이트로 끝납니다. §1.4는 이 구조가 오브젝트 파일의 재배치 대부분을 없애려는 것이라고 설명합니다. 같은 두 목록이 `.debug_loc`에서는 0x6f바이트, `.debug_loclists`에서는 0x2d바이트였습니다.

| `DW_LLE_*` (Table 7.30) | 값 | 의미 |
|------|----|------|
| `end_of_list` | 0x00 | 목록 끝 |
| `base_addressx` | 0x01 | 새 base 주소 (`.debug_addr` 인덱스) |
| `startx_endx` | 0x02 | 시작·끝 모두 `.debug_addr` 인덱스 |
| `startx_length` | 0x03 | 시작 인덱스 + 길이 |
| `offset_pair` | 0x04 | base 기준 시작·끝 offset |
| `default_location` | 0x05 | 다른 구간에 없는 PC의 기본 위치 |
| `base_address` | 0x06 | 새 base 주소 (주소 직접) |
| `start_end` | 0x07 | 절대 시작·끝 주소 |
| `start_length` | 0x08 | 절대 시작 + 길이 |

## DW_AT_location 평가 흐름

```c
// 의사 코드
Value evaluate_location(DIE var_die, uint64_t pc) {
    auto loc = var_die.attr(DW_AT_location);
    
    if (loc.form == DW_FORM_exprloc) {
        // 단일 표현식
        return run_expr_vm(loc.expr);
    } else if (loc.form == DW_FORM_sec_offset) {
        // location list
        auto entry = find_entry_for_pc(loc.offset, pc);
        if (entry.empty) return Value::optimized_out();
        return run_expr_vm(entry.expr);
    }
}

Value run_expr_vm(Bytes expr) {
    // 완전한 구현이 아닌 조각 처리의 개요
    // reg*는 즉시 반환하지 않고 현재 조각의 register location을 설정
    // stack_value는 현재 조각을 값으로 표시
    // piece는 현재 location/value를 누적하고 다음 조각의 평가 상태를 초기화
    // 모든 opcode 처리 후 단일 location 또는 piece 모음을 반환
    return evaluate_all_operations_and_pieces(expr);
}
```

레지스터 위치는 메모리 주소와 다른 결과 종류입니다. reg*에서 곧바로 반환하면 뒤의 piece를 처리할 수 없습니다. 위 코드는 상태 구분의 개요이며 stack_value·piece·typed opcode 전체를 구현한 평가기가 아닙니다.

## Type-aware 표현 (DWARF 5)

§2.5.1은 스택 값의 기본 타입을 대상 주소 크기의 정수인 generic type으로 정합니다. 32-bit 대상이면 32비트입니다. DWARF 5는 다른 타입의 값을 다루는 *typed* opcode를 추가했습니다(§2.5.1.6 "Type Conversions" 등).

```text
DW_OP_const_type    <type_die>, <byte_size>, <bytes>
DW_OP_regval_type   <reg>, <type_die>
DW_OP_deref_type    <byte_size>, <type_die>
DW_OP_convert       <type_die>
DW_OP_reinterpret   <type_die>
```

`<type_die>`는 `DW_TAG_base_type` DIE의 CU 안 offset(ULEB128)입니다. 이 연산들로 float나 주소 크기와 다른 정수를 그 타입 그대로 계산합니다.

## frame_base 표현

함수의 `DW_AT_frame_base`도 expression입니다. 이 시리즈의 실제 출력에서 나온 세 가지입니다.

| 컴파일러·옵션 | `DW_AT_frame_base` | 의미 |
|------|------|------|
| clang 23.1.5 x86-64 `-O0` (`main.o`) | `DW_OP_reg6 RBP` | `%rbp` 값 그대로 |
| clang 23.1.5 x86-64 `-O2` (`locals.o`) | `DW_OP_reg7 RSP` | `%rsp` 값 그대로 |
| GCC 14.2 aarch64 `-O0`·`-O2` | `DW_OP_call_frame_cfa` | CFI의 CFA |

`DW_OP_fbreg N`은 이 식의 결과에 N을 더한 주소입니다.

## DW_OP_GNU_* — 벤더 확장

DWARF 5 이전에 GNU 확장으로 먼저 쓰인 연산들입니다. 이름과 값은 LLVM의 `Dwarf.def`와 binutils 2.44 `readelf`가 아는 이름으로 확인했습니다.

| GNU opcode | 값 | DWARF 5 표준 |
|-----------|----|---------------|
| `DW_OP_GNU_implicit_pointer` | 0xf2 | `DW_OP_implicit_pointer` (0xa0) |
| `DW_OP_GNU_entry_value` | 0xf3 | `DW_OP_entry_value` (0xa3) |
| `DW_OP_GNU_const_type` | — | `DW_OP_const_type` (0xa4) |
| `DW_OP_GNU_regval_type` | — | `DW_OP_regval_type` (0xa5) |
| `DW_OP_GNU_deref_type` | — | `DW_OP_deref_type` (0xa6) |
| `DW_OP_GNU_convert` | — | `DW_OP_convert` (0xa8) |
| `DW_OP_GNU_addr_index` | 0xfb | `DW_OP_addrx` (0xa1) |
| `DW_OP_GNU_parameter_ref` | — | 대응하는 표준 연산 없음 |

GNU 쪽 값은 LLVM 23 `Dwarf.def`에 있는 것만 적었고, `—`는 binutils `readelf`의 이름 목록에서 이름만 확인한 항목입니다. 표준 쪽 값은 DWARF 5 Table 7.9입니다.

앞의 `locals4.o`처럼 clang은 `-gdwarf-4`에서 `DW_OP_GNU_entry_value`를, `-gdwarf-5`에서 `DW_OP_entry_value`를 냈습니다. 두 연산의 의미는 같고 opcode 값만 다릅니다.

## 디코딩 도구

```bash
# 한 변수의 location
$ llvm-dwarfdump --debug-info my_prog | grep -A 5 'DW_TAG_variable'

# 모든 location list
$ llvm-dwarfdump --debug-loclists my_prog | head -50
$ llvm-dwarfdump --debug-loc my_prog | head -50      # DWARF 4

# raw expression bytes
$ readelf --debug-dump=info my_prog | grep -A 2 DW_AT_location
```

아래 직접 확인의 locations.py가 파일 열기와 DWARF 객체 생성을 포함한 pyelftools 0.32 예제입니다. 목록을 파싱하는 것과 대상 프로세스 레지스터·메모리에서 실제 값을 평가하는 것은 별개입니다.

변수 위치가 함수 범위를 얼마나 덮는지는 `llvm-dwarfdump --statistics`가 JSON으로 셉니다. `locals.o`에서는 지역 변수 위치가 덮는 바이트 합이 5, 인자는 26이었고, 그중 `DW_OP_entry_value`로 덮인 바이트가 1이었습니다.

## 진단 — "optimized out"

```text
(gdb) print x
$1 = <optimized out>
```

이 장의 예제에서 나온 원인은 셋입니다.

1. *현재 PC*가 location list의 어느 구간에도 없습니다 (`tracked`의 0xb 이후).
2. 변수 DIE에 위치 속성이 아예 없습니다 (clang `-O2`의 `ip.c` `p`).
3. 진입값을 되찾을 call site 정보가 호출자에 없습니다 (`ev`의 `main` `argc`).

해법.

- 최적화 수준을 낮춥니다. 아래 표는 FreeRTOS-Kernel `tasks.c`를 게스트의 GCC 14.2로 `-O2`와 `-Og`로 빌드해 위치 커버리지를 잰 것입니다.

| 옵션 | 소스 변수 | 위치 있음 | 부모 범위 바이트 중 위치로 덮인 비율 | 위치 0%인 변수 |
|------|----------|----------|------------------|---------------|
| `-O2 -g` | 422 | 322 | 37,262 / 51,464 = 72.4% | 64 |
| `-Og -g` | 294 | 294 | 42,380 / 56,436 = 75.1% | 0 |

`-Og`에서는 위치가 전혀 없는 변수가 사라졌고 덮인 비율도 올랐습니다. 두 빌드는 DIE로 나온 변수 개수 자체가 달라서, 절대 개수보다 비율을 비교했습니다. 수치는 Debian LLVM 19.1.7의 `llvm-dwarfdump --statistics` 항목 `sum_all_variables(#bytes in parent scope covered by DW_AT_location)`와 `sum_all_variables(#bytes in parent scope)`에서 계산했습니다.

- `-g3`은 매크로 정보를 더할 뿐 최적화로 사라진 값을 되살리지 않습니다.
- 호출자 쪽 call site 정보와 `DW_OP_entry_value`가 있으면 인자의 진입값은 복원됩니다.
- 그래도 안 되면 어셈블리를 보고 레지스터를 직접 읽습니다 ([GDB and LLDB Ch 3](/blog/tools/debugging/gdb-lldb/chapter03-inspecting-state)).

## 상수 — DW_AT_const_value

```cpp title="cexpr.cpp"
extern void use(int);
constexpr int kMax = 100;
void f() {
    int x = 10;
    int *p = &x;
    use(*p);
    use(kMax);
}
```

`constexpr` 변수는 메모리에 자리가 없어도 DIE로 남습니다. clang 23.1.5 `-O2` 출력입니다.

```text
0x00000069:   DW_TAG_variable
                DW_AT_name	("kMax")
                DW_AT_type	(0x00000072 "const int")
                DW_AT_decl_file	("/src/cexpr.cpp")
                DW_AT_decl_line	(2)
                DW_AT_const_value	(100)
```

위치 식 없이 값이 속성에 바로 들어 있어 `print kMax`가 100을 답합니다. 같은 파일의 `use(kMax)` 호출은 `DW_TAG_call_site_parameter`에 `DW_AT_call_value (DW_OP_constu 0x64)`로 남았습니다. 이 호출은 `DW_AT_call_tail_call (true)`도 달고 있는데, 함수의 마지막 호출이 tail call로 바뀌었다는 표시입니다.

## 직접 확인 — 위치 목록과 typed 인자 파싱

앞에서 쓴 `locals.c`를 pyelftools 0.32로 파싱합니다. 전역 변수는 단일 식, 지역 변수는 위치 목록으로 나오는지가 확인 대상입니다. 레지스터 배치는 이 장 앞부분의 clang 23.1.5 출력 기준입니다.

```python title="locations.py"
import sys
from elftools.elf.elffile import ELFFile
from elftools.dwarf.locationlists import LocationParser

with open(sys.argv[1], "rb") as stream:
    dwarf = ELFFile(stream).get_dwarf_info()
    parser = LocationParser(dwarf.location_lists())
    for cu in dwarf.iter_CUs():
        for die in cu.iter_DIEs():
            if die.tag != "DW_TAG_variable":
                continue
            attr = die.attributes.get("DW_AT_location")
            if attr is None:
                continue
            name = die.attributes.get("DW_AT_name")
            location = parser.parse_from_attribute(attr, cu["version"], die=die)
            print(name.value.decode() if name else "<unnamed>", type(location).__name__)
```

```python title="expr-bytes.py"
from elftools.dwarf.dwarf_expr import DWARFExprParser
from elftools.dwarf.structs import DWARFStructs

structs = DWARFStructs(little_endian=True, dwarf_format=32, address_size=8)
parser = DWARFExprParser(structs)
ops = parser.parse_expr([0xa6, 4, 0x40, 0x9f])
assert ops[0].op_name == "DW_OP_deref_type"
assert ops[0].args == [4, 64]
assert ops[1].op_name == "DW_OP_stack_value"
print("typed size=4 type_offset=64")
```

```bash
clang --target=x86_64-unknown-linux-gnu -g -gdwarf-5 -O2 -c locals.c -o locals.o
llvm-dwarfdump --debug-info --debug-loclists locals.o
python3 locations.py locals.o
python3 expr-bytes.py
```

```text
$ python3 locations.py locals.o
tracked list
global LocationExpr
$ python3 expr-bytes.py
typed size=4 type_offset=64
```

`tracked`는 위치 목록(파이썬 `list`), `global`은 단일 식(`LocationExpr`)으로 나왔습니다. 스크립트가 `DW_TAG_variable`만 보므로 인자 `input`은 출력에 없습니다. `expr-bytes.py`는 `DW_OP_deref_type`(0xa6)의 두 인자, 곧 1바이트 크기 값 4와 ULEB128 타입 DIE offset 64를 읽고 다음 opcode(`DW_OP_stack_value`, 0x9f)로 정확히 넘어가는지 검사합니다(§2.5.1.3). 바이트열만 파싱한 것이라 offset 64에 실제 타입 DIE가 있는 파일은 아닙니다.

## 정리

- DWARF expression은 *스택 머신* 바이트코드이고, 결과는 메모리 주소·레지스터·값·조각 중 하나입니다.
- `DW_OP_reg*`/`DW_OP_breg*`/`DW_OP_fbreg`/`DW_OP_addr(x)`가 이 장의 출력에서 가장 많이 나왔습니다.
- `DW_OP_stack_value`는 *값 자체*, `DW_OP_piece`는 *조각*(ARM의 `long long`이 `r4`+`r5`)을 표현합니다.
- 상수는 `DW_AT_const_value`, 사라진 포인터는 `DW_OP_implicit_pointer`(GCC)로 남습니다.
- `DW_OP_entry_value`는 진입값을 가리키고, 호출자의 `DW_TAG_call_site_parameter`가 있을 때만 복원됩니다.
- Location list는 PC 구간별 위치이고, 어느 구간에도 없으면 optimized out입니다.
- DWARF 5의 `.debug_loclists`는 같은 목록을 `.debug_loc`의 0x6f바이트에서 0x2d바이트로 줄였습니다.
- `llvm-dwarfdump --statistics`로 위치 커버리지를 수치로 봅니다.

## 다음 장 예고

Ch 5 — CFI (`.debug_frame` / `.eh_frame`). 콜스택을 *어떻게* 거꾸로 풀어 가는지의 답.

## 관련 항목

- [Ch 3: .debug_line 바이트코드 VM](/blog/tools/debugging/dwarf-elf/chapter03-debug-line)
- [Ch 5: CFI — .debug_frame / .eh_frame](/blog/tools/debugging/dwarf-elf/chapter05-cfi-eh-frame)
- [DWARF 5 § 2.5 (DWARF Expressions)](https://dwarfstd.org/doc/DWARF5.pdf)
- [`DW_OP_*` 카탈로그 — DWARF 5 § 2.5.1](https://dwarfstd.org/doc/DWARF5.pdf)
- [pyelftools location parser](https://github.com/eliben/pyelftools/blob/main/elftools/dwarf/locationlists.py)
