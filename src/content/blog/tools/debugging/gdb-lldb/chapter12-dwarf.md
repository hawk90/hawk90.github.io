---
title: "DWARF 디버그 정보 — 디버거가 변수와 라인을 찾는 방식"
slug: "tools/debugging/gdb-lldb/chapter12-dwarf"
date: 2026-05-24T09:12:00
description: "DWARF 표준, DIE / abbrev / line / location, expression VM, CFI, split-DWARF."
tags: [gdb, lldb, DWARF, ELF, debug-info]
series: "GDB and LLDB"
seriesOrder: 12
draft: false
topics: ["tools", "tools/debugging"]
---

:::tip[Deep dive]
이 챕터는 빠른 참조입니다. 깊은 내부 메커니즘은 [DWARF and ELF Internals 시리즈](/blog/tools/debugging/dwarf-elf/chapter01-elf-overview)를 참고하세요 — ELF 구조, DIE 트리, .debug_line VM, expression VM, CFI, split-DWARF.
:::


GDB가 `print x`라고 했을 때 `x`의 *타입*, *위치(메모리 주소 또는 레지스터)*, *어느 소스 파일의 몇 번째 줄에 정의됐는지*를 어떻게 알까요. 답은 ELF 파일 안에 들어 있는 **DWARF**라는 디버그 정보 형식입니다. 실행 파일이 건물이라면 DWARF는 그 건물의 설계도와 층별 안내도입니다. 설계도가 없어도 건물에는 들어갈 수 있지만(일반 심볼·레지스터·메모리 조사), 어느 방이 무슨 용도인지(지역 변수, 소스 줄)는 알 수 없습니다.

이 장은 DWARF가 무엇을 표현하고, 크기를 어떻게 줄이며, 흔한 문제("심볼이 없다", "value optimized out")를 어떻게 진단하는지를 실제 출력으로 봅니다. 예제는 Debian 13 arm64에서 GCC 14.2.0과 clang 19로 빌드했고, `readelf`(binutils), `llvm-dwarfdump-19`, GDB 16.3으로 읽었습니다. 첫 예제는 함수 둘과 인라인 함수 하나짜리 `main.c`입니다.

```c title="main.c"
// main.c
int global_counter = 3;

static inline int square(int x) { return x * x; }

int compute(int a, int b) {
    int local = a + b;
    return square(local) + global_counter;
}

int main(void) {
    return compute(2, 3) & 0xff;
}
```

## DWARF가 뭔가

DWARF는 언어에 독립적인 디버그 정보 형식입니다. 이 글은 2017년 2월 13일자 [DWARF 5 표준](https://dwarfstd.org/doc/DWARF5.pdf)을 기준으로 용어를 씁니다. GCC 14.2.0은 아무 옵션 없이 `-g`만 줘도 DWARF 5를 냈습니다.

```text
$ gcc -g -O0 main.c -o main-O0
$ readelf --debug-dump=info main-O0 | grep -m2 -E "Version|DW_AT_producer"
   Version:       5
    <d>   DW_AT_producer    : (indirect string, offset: 0x15): GNU C17 14.2.0 -mlittle-endian -mabi=lp64 -g -O0 -fasynchronous-unwind-tables
```

디버그 정보는 여러 섹션에 나뉘어 들어갑니다. 같은 소스를 `-O0`과 `-O2`로 빌드한 뒤 섹션 이름과 크기(16진 바이트)를 비교했습니다.

| 섹션 | `-O0` | `-O2` | 내용 |
|------|------:|------:|------|
| `.debug_info` | 0xdf | 0x163 | DIE 트리 — 컴파일 유닛·함수·변수·타입 |
| `.debug_abbrev` | 0xa6 | 0xe2 | 약어 표 — `.debug_info`가 참조 |
| `.debug_line` | 0x72 | 0x96 | PC ↔ (파일, 줄) 매핑 프로그램 |
| `.debug_str` / `.debug_line_str` | 0x77 / 0x12 | 0x77 / 0x12 | 문자열 풀 |
| `.debug_aranges` | 0x30 | 0x40 | 주소 → 컴파일 유닛 인덱스 |
| `.debug_loclists` | — | 0x84 | 위치가 PC에 따라 바뀌는 변수의 위치 목록 |
| `.debug_rnglists` | — | 0x21 | 연속하지 않은 주소 범위 |
| `.eh_frame` / `.eh_frame_hdr` | 0xec / 0x4c | 0xbc / 0x44 | 콜스택 해제 정보와 그 검색 표 |

`-O2`에서만 `.debug_loclists`와 `.debug_rnglists`가 생긴 것은, 최적화로 변수 위치가 구간마다 바뀌고 함수 코드가 여러 조각으로 흩어졌기 때문입니다. DWARF 5 표준 서문의 "Changes from Version 4 to Version 5" 목록에 따르면 이 두 섹션은 DWARF 4의 `.debug_loc`·`.debug_ranges`를 대체하고, `.debug_line_str`도 DWARF 5에서 추가됐습니다. 이 빌드에는 `.debug_frame`이 없고 `.eh_frame`만 있었습니다(아래 CFI 절).

## DIE — Debugging Information Entry

`.debug_info`의 기본 단위는 *DIE*입니다. 컴파일 유닛(소스 파일 하나) 아래에 함수, 그 아래에 인자·변수가 매달린 트리입니다. `llvm-dwarfdump-19 --debug-info main-O0`의 일부입니다.

```text
0x0000000c: DW_TAG_compile_unit
              DW_AT_producer	("GNU C17 14.2.0 -mlittle-endian -mabi=lp64 -g -O0 -fasynchronous-unwind-tables")
              DW_AT_language	(DW_LANG_C11)
              DW_AT_name	("main.c")
              DW_AT_comp_dir	("/root/ch12")
              DW_AT_low_pc	(0x0000000000000768)
              DW_AT_high_pc	(0x00000000000007e4)
              DW_AT_stmt_list	(0x00000000)

0x0000002e:   DW_TAG_variable
                DW_AT_name	("global_counter")
                DW_AT_type	(0x00000044 "int")
                DW_AT_external	(true)
                DW_AT_location	(DW_OP_addr 0x20030)

0x00000044:   DW_TAG_base_type
                DW_AT_byte_size	(0x04)
                DW_AT_encoding	(DW_ATE_signed)
                DW_AT_name	("int")

0x00000069:   DW_TAG_subprogram
                DW_AT_name	("compute")
                DW_AT_low_pc	(0x0000000000000780)
                DW_AT_high_pc	(0x00000000000007c4)
                DW_AT_frame_base	(DW_OP_call_frame_cfa)

0x0000008b:     DW_TAG_formal_parameter
                  DW_AT_name	("a")
                  DW_AT_type	(0x00000044 "int")
                  DW_AT_location	(DW_OP_fbreg -20)
...
0x000000a3:     DW_TAG_variable
                  DW_AT_name	("local")
                  DW_AT_location	(DW_OP_fbreg -4)
```

일부 속성(`DW_AT_decl_file` 등)은 줄였습니다. 읽는 법은 간단합니다. 전역 `global_counter`는 고정 주소 `0x20030`에 있고, `compute`의 `a`와 `local`은 frame base(CFA)에서 각각 -20, -4바이트 떨어진 스택 슬롯에 있으며, 둘 다 `0x44`의 `int` 타입을 가리킵니다. GDB의 `print local`은 이 DIE를 찾아 CFA를 계산하고, 4바이트를 읽어 `int`로 해석하는 일입니다.

### TAG 카탈로그

위 출력과 이 시리즈의 다른 장에서 실제로 본 TAG입니다.

| TAG | 의미 | 본 곳 |
|-----|------|-------|
| `DW_TAG_compile_unit` | 컴파일 유닛 | 위 |
| `DW_TAG_skeleton_unit` | split DWARF의 뼈대 유닛 | 아래 split-DWARF |
| `DW_TAG_subprogram` | 함수 | 위 |
| `DW_TAG_inlined_subroutine` | 인라인된 호출 | 아래, [Ch 4](/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames) |
| `DW_TAG_formal_parameter` | 함수 인자 | 위 |
| `DW_TAG_variable` | 전역/지역 변수 | 위 |
| `DW_TAG_base_type` | `int` 같은 기본 타입 | 위 |
| `DW_TAG_member` | 구조체 멤버 | [Ch 3](/blog/tools/debugging/gdb-lldb/chapter03-inspecting-state)의 lldb 메시지 |
| `DW_TAG_call_site` | 호출 지점 정보 (꼬리 호출 포함) | [Ch 4](/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames) |

전체 목록은 DWARF 5 표준 7.5.3절의 Table 7.3(Tag encodings)에 있습니다.

### Abbreviation 인코딩

`.debug_info`의 각 DIE는 *약어 번호*와 속성 값만 담고, 그 번호가 어떤 TAG인지, 어떤 속성이 어떤 형식으로 오는지는 `.debug_abbrev`가 정의합니다. 같은 모양의 DIE 수천 개가 약어 하나를 공유하므로 속성 이름을 반복해 적지 않아도 됩니다.

```text
$ readelf --debug-dump=abbrev main-O0
  Number TAG (0)
   1      DW_TAG_formal_parameter    [no children]
    DW_AT_name         DW_FORM_string
    DW_AT_decl_file    DW_FORM_implicit_const: 1
    DW_AT_decl_line    DW_FORM_data1
    DW_AT_decl_column  DW_FORM_data1
    DW_AT_type         DW_FORM_ref4
    DW_AT_location     DW_FORM_exprloc
   2      DW_TAG_compile_unit    [has children]
    DW_AT_producer     DW_FORM_strp
    DW_AT_language     DW_FORM_data1
    DW_AT_name         DW_FORM_line_strp
...
```

1번 약어의 `DW_FORM_implicit_const: 1`은 값을 DIE에 넣지 않고 약어에 상수로 박아 두는 DWARF 5의 새 형식입니다(표준 서문의 새 form 목록에 `DW_FORM_implicit_const`가 있습니다). 이 파일의 모든 인자가 같은 파일(1번)에 선언됐으므로 DIE마다 파일 번호를 적을 필요가 없습니다.

## .debug_line — 어느 PC가 어느 줄인가

GDB가 `0x7a0`에서 멈췄을 때 *몇 번째 줄*인지 답하는 것이 이 섹션입니다. `llvm-dwarfdump-19 --debug-line`이 재구성한 표입니다.

```text
Address            Line   Column File   ISA Discriminator OpIndex Flags
------------------ ------ ------ ------ --- ------------- ------- -------------
0x0000000000000768      4     33      1   0             0       0  is_stmt
0x0000000000000780      6     27      1   0             0       0  is_stmt
0x0000000000000790      7      9      1   0             0       0  is_stmt
0x00000000000007a0      8     12      1   0             0       0  is_stmt
0x00000000000007ac      8     26      1   0             1       0  is_stmt
0x00000000000007bc      9      1      1   0             0       0  is_stmt
0x00000000000007c4     11     16      1   0             0       0  is_stmt
...
0x00000000000007e4     13      1      1   0             0       0  is_stmt end_sequence
```

이 표는 파일에 그대로 저장돼 있지 않습니다. `.debug_line`에는 작은 가상 머신의 *명령*이 들어 있고, 그 명령을 실행하면 표가 나옵니다. `readelf --debug-dump=rawline`으로 같은 구간의 명령을 보면 다음과 같습니다.

```text
  [0x00000038]  Extended opcode 2: set Address to 0x768
  [0x00000043]  Special opcode 8: advance Address by 0 to 0x768 and Line by 3 to 4
  [0x0000004a]  Set column to 27
  [0x0000004c]  Special opcode 35: advance Address by 8 to 0x780 and Line by 2 to 6
  [0x0000004d]  Set column to 9
  [0x0000004f]  Special opcode 62: advance Address by 16 to 0x790 and Line by 1 to 7
  [0x00000053]  Set column to 26
  [0x00000055]  Extended opcode 4: set Discriminator to 1
  [0x00000059]  Special opcode 47: advance Address by 12 to 0x7ac and Line by 0 to 8
...
  [0x0000006d]  Advance PC by 8 to 0x7e4
  [0x0000006f]  Extended opcode 1: End of Sequence
```

명령 하나가 1바이트인 *special opcode*가 "주소를 몇 바이트, 줄을 몇 줄 옮기고 행 하나를 내보내라"를 한꺼번에 표현합니다. 표의 한 행이 대부분 1~3바이트로 끝나는 이유이고, 이 파일의 `.debug_line`은 전체가 0x72(114)바이트였습니다.

주소 하나를 줄로 바꾸는 명령줄 도구가 `addr2line`입니다.

```text
$ nm main-O0 | grep " T compute$"
0000000000000780 T compute
$ addr2line -e main-O0 -f -i 0x780
compute
/root/ch12/main.c:6
```

### is_stmt — "이 줄에 BP를 걸 수 있나"

DWARF 5 표준 6.2.2절은 `is_stmt`를 "the current instruction is a recommended breakpoint location"이라고 정의합니다. 금지 규칙이 아니라 *권장* 지점 표시이고, 디버거가 `break 줄`을 받았을 때 그 줄의 어느 주소에 걸지 고르는 근거가 됩니다. 8행처럼 한 줄에 `is_stmt` 행이 둘(0x7a0 열 12, 0x7ac 열 26)이고 둘째에 `Discriminator 1`이 붙은 것은, 같은 줄 안에 별개의 코드 조각이 있다는 뜻입니다. 열 12는 `square(local)` 호출, 열 26은 그 결과에 `global_counter`를 더하는 부분입니다.

### 인라인된 호출의 표현

같은 소스를 `-O2`로 빌드하면 `compute`가 `main` 안에, `square`가 `compute` 안에 인라인됩니다. DWARF는 이를 `DW_TAG_inlined_subroutine`으로 남깁니다.

```text
0x00000069:     DW_TAG_inlined_subroutine
                  DW_AT_abstract_origin	(0x000000b1 "compute")
                  DW_AT_entry_pc	(0x0000000000000640)
                  DW_AT_low_pc	(0x0000000000000640)
                  DW_AT_high_pc	(0x000000000000064c)
                  DW_AT_call_file	("/root/ch12/main.c")
                  DW_AT_call_line	(12)
                  DW_AT_call_column	(12)
```

*abstract origin*은 인라인되지 않은 원본 정의(`0xb1`, `compute`)를 가리키고, `DW_AT_call_file`/`call_line`이 호출한 자리(12행)입니다. [Ch 4](/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames)의 `inlined into frame 1` 가상 프레임이 바로 이 정보로 만들어집니다.

## .debug_loclists — 변수 위치

같은 변수도 *코드 위치마다 있는 곳이 다릅니다*. `-O2`의 `compute`에서 인자 `a`의 위치 목록입니다.

```text
DW_AT_location	(0x00000040:
   [0x00000000000007c0, 0x00000000000007c8): DW_OP_reg0 W0
   [0x00000000000007c8, 0x00000000000007d4): DW_OP_entry_value(DW_OP_reg0 W0), DW_OP_stack_value)
```

`0x7c0`~`0x7c8`에서는 `a`가 레지스터 w0에 있습니다. 그런데 `compute`의 디스어셈블리를 보면 `0x7c4`의 `add w0, w0, w1`이 w0을 `a + b`로 덮어씁니다.

```text
00000000000007c0 <compute>:
 7c0:	adrp	x2, 20000 <__libc_start_main@GLIBC_2.34>
 7c4:	add	w0, w0, w1
 7c8:	ldr	w2, [x2, #48]
 7cc:	madd	w0, w0, w0, w2
 7d0:	ret
```

그래서 `0x7c8` 이후의 `a`는 `DW_OP_entry_value(DW_OP_reg0 W0)`, 곧 "함수에 들어올 때의 w0 값"으로 기술됩니다. 이 값은 호출한 쪽의 정보로만 되살릴 수 있고, 되살리지 못하면 GDB는 `<optimized out>`이라고 답합니다([Ch 3](/blog/tools/debugging/gdb-lldb/chapter03-inspecting-state)). DWARF 5 표준의 연산자 표에는 `DW_OP_entry_value`가 "New in DWARF Version 5" 표시와 함께 올라 있습니다.

`main` 안에 인라인된 `compute`의 사본에서는 인자가 상수였습니다. 값이 메모리 어디에도 없지만 컴파일 시간에 알려져 있으므로 DWARF가 값 자체를 적어 둡니다.

```text
0x00000088:       DW_TAG_formal_parameter
                    DW_AT_abstract_origin	(0x000000c2 "a")
                    DW_AT_location	(0x0000000e:
                       [0x0000000000000640, 0x0000000000000640): DW_OP_lit2, DW_OP_stack_value)
```

### DWARF expression VM

`DW_OP_*`는 *스택 머신*의 명령입니다. 위 출력에 나온 것과 이 시리즈에서 본 것을 표준의 정의와 함께 정리했습니다.

| op | 의미 (DWARF 5 표준 2.5·2.6절) | 본 곳 |
|----|------|------|
| `DW_OP_addr <addr>` | 절대 주소 (전역 변수) | `global_counter` |
| `DW_OP_fbreg <off>` | frame base + off | `-O0`의 `a`, `local` |
| `DW_OP_call_frame_cfa` | CFA를 스택에 올림 | `DW_AT_frame_base` |
| `DW_OP_reg<n>` | 값이 레지스터 n에 있음 | `-O2`의 `a` |
| `DW_OP_lit<n>` | 상수 n을 올림 | 인라인 사본의 `a = 2` |
| `DW_OP_stack_value` | 스택 맨 위가 메모리 주소가 아니라 값 자체 | 위 두 예 |
| `DW_OP_entry_value` | 함수 진입 시점의 식 값 | `-O2`의 `a` |
| `DW_OP_piece <n>` | 값이 n바이트 조각으로 나뉘어 있음 | (이 예제에는 없음) |

`llvm-dwarfdump --statistics main-O2`가 이 파일의 위치 정보가 얼마나 채워져 있는지 숫자로 보여 줍니다. 인자가 차지하는 범위 84바이트 중 40바이트만 `DW_AT_location`으로 덮여 있었고, 변수 전체로는 116바이트 중 52바이트, 그중 16바이트가 `DW_OP_entry_value`였습니다.

```text
  "#source variables": 8,
  "#source variables with location": 8,
  "sum_all_variables(#bytes in parent scope)": 116,
  "sum_all_variables(#bytes in parent scope covered by DW_AT_location)": 52,
  "sum_all_variables(#bytes in parent scope covered by DW_OP_entry_value)": 16,
  "sum_all_params(#bytes in parent scope)": 84,
  "sum_all_params(#bytes in parent scope covered by DW_AT_location)": 40,
```

## 콜스택 해제 — .eh_frame

`bt`가 SP·FP를 거꾸로 풀어 가는 근거가 *Call Frame Information*(CFI)입니다. 함수마다 "이 PC에서 호출자 프레임의 기준점(CFA)은 어디고, 저장된 레지스터는 CFA로부터 얼마 떨어져 있는가"를 기록합니다. 이 빌드에서 CFI는 `.eh_frame`에만 있었습니다. 줄 번호 표처럼, 이 표도 명령으로 저장돼 있고 `readelf --debug-dump=frames-interp`가 그것을 표로 펼쳐 보여 줍니다. `compute`의 FDE입니다.

```text
000000a8 000000000000001c 000000ac FDE cie=00000000 pc=0000000000000780..00000000000007c4
   LOC           CFA      x29   ra
0000000000000780 sp+0     u     u
0000000000000784 sp+48    c-48  c-40
00000000000007c0 sp+0     u     u
```

`0x780`(함수 첫 명령)에서는 CFA가 `sp+0`이고 아무 레지스터도 저장되지 않았습니다(`u`). 첫 명령 `stp x29, x30, [sp, #-48]!`이 끝난 `0x784`부터는 CFA가 `sp+48`이고, 호출자의 x29는 CFA-48에, 반환 주소(ra = x30)는 CFA-40에 있습니다. 함수 끝(`0x7c0`)에서 복원이 끝나 다시 `sp+0`이 됩니다. [Ch 4](/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames)의 `info frame`이 보여 준 `x29 at ..., x30 at ...`이 이 계산의 결과입니다. [Ch 1](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install)에서 `-fomit-frame-pointer`로 빌드해도 `bt`가 다섯 프레임을 모두 풀었던 것도, GDB가 프레임 포인터가 아니라 이 CFI로 스택을 풀기 때문입니다.

### CIE / FDE 구조

FDE(Frame Description Entry)는 함수 하나의 PC 범위와 차분 CFI 명령을 담고, 공통 정보는 CIE(Common Information Entry)가 갖습니다. 이 파일의 CIE는 하나였고, 코드 정렬 4, 데이터 정렬 -8, 반환 주소 열 30(x30)을 정의합니다.

```text
00000000 00000010 00000000 CIE
  Augmentation:          "zR"
  Code alignment factor: 4
  Data alignment factor: -8
  Return address column: 30
  DW_CFA_def_cfa: WSP +0
```

다른 FDE에는 `DW_CFA_AARCH64_negate_ra_state`가 보였습니다. Arm의 [DWARF for the Arm 64-bit Architecture](https://github.com/ARM-software/abi-aa/blob/main/aadwarf64/aadwarf64.rst)에 따르면 이 명령은 `RA_SIGN_STATE` 의사 레지스터를 "not signed"와 "signed with SP" 사이에서 뒤집습니다. 반환 주소가 PAC로 서명된 구간을 표시하는 것으로, [Ch 4](/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames)의 `[PAC]` 표시와 이어집니다.

### .eh_frame_hdr

`.eh_frame_hdr`는 PC로 FDE를 빨리 찾기 위한 정렬된 표입니다. 이 파일에는 8개 항목이 있었습니다.

```text
Contents of the .eh_frame_hdr section:
  Version:                 1
  Entries in search table: 0x8
  0xfffffffffffffe40 (offset: 0x640) -> 0x64 fde=[    14]
...
  0xffffffffffffff80 (offset: 0x780) -> 0xf8 fde=[    a8]
  0xffffffffffffffc4 (offset: 0x7c4) -> 0x118 fde=[    c8]
```

`offset: 0x780` 항목이 위 `compute`의 FDE(`a8`)를 가리킵니다.

## 크기와 골칫거리

디버그 정보는 코드보다 훨씬 큽니다. [Ch 11](/blog/tools/debugging/gdb-lldb/chapter11-practical-tips)의 `tips.cpp`(STL vector·map·string 사용)를 `g++ -g -O2`로 빌드하자 `.text`가 2,044바이트인데 디버그 섹션은 합쳐서 17만 바이트가 넘었습니다.

```text
$ size -A tips-g | grep -E "^\.(text|debug)"
.text                  2044     3264
.debug_aranges           96        0
.debug_info           67870        0
.debug_abbrev          3465        0
.debug_line            4567        0
.debug_str            83888        0
.debug_line_str         932        0
.debug_loclists       11013        0
.debug_rnglists        2064        0
```

줄이는 방법은 세 가지입니다.

### 1. -gsplit-dwarf / split-DWARF

DWARF 본체를 `.o`가 아니라 별도 `.dwo` 파일에 두고, 링크한 실행 파일에는 *skeleton* 유닛만 남깁니다. DWARF 5 표준 서문은 split object를 "reducing executable program size and by improving link times"를 위한 것으로 설명합니다.

```text
$ g++ -g -O2 -gsplit-dwarf -c tips.cpp -o tips.o
$ ls -l tips.o tips.dwo
-rw-r--r-- 1 root root 194480 Nov 16 08:38 tips.dwo
-rw-r--r-- 1 root root  78744 Nov 16 08:38 tips.o
$ g++ -g -gsplit-dwarf tips.o -o tips-split
$ size -A tips-split | grep -E "^\.debug_(info|str |addr)"
.debug_info              49        0
.debug_str               20        0
.debug_addr            5800        0
$ llvm-dwarfdump-19 --debug-info tips-split
0x00000014: DW_TAG_skeleton_unit
...
              DW_AT_dwo_name	("tips.dwo")
```

실행 파일의 `.debug_info`가 67,870바이트에서 49바이트가 됐고, 남은 skeleton이 `tips.dwo`의 이름과 ID만 가리킵니다. 그래서 `.dwo`를 옮기면 GDB가 타입을 잃습니다.

```text
$ mv tips.dwo tips.dwo.away
$ gdb -q -batch ./tips-split -ex 'ptype Graph'
warning: Could not find DWO CU tips.dwo(0x1b8d474ffa96e72d) referenced by CU at offset 0x0 [in module /root/ch12/tips-split]
DWARF Error: unexpected tag 'DW_TAG_skeleton_unit' at offset 0x0
No symbol "Graph" in current context.
```

배포할 때는 `.dwo` 파일들을 실행 파일과 함께 보관하거나, 표준이 정의한 package 형식(`.debug_cu_index`를 가진 package 파일)으로 묶습니다. 이 시리즈에서 package 파일은 만들지 않았습니다.

### 2. dwz — 중복 제거

[dwz](https://sourceware.org/dwz/)는 여러 실행 파일에 반복되는 DIE를 공통 파일 하나로 뺍니다. 같은 `tips.cpp`를 `-O0`과 `-O1`로 빌드한 두 파일에 dwz 0.15를 적용했습니다.

```text
$ dwz -m common.debug a.out b.out
$ ls -l a.orig b.orig a.out b.out common.debug
-rwxr-xr-x 1 root root 255992 Nov 16 08:38 a.orig
-rwxr-xr-x 1 root root 143704 Nov 16 08:38 a.out
-rwxr-xr-x 1 root root 249416 Nov 16 08:38 b.orig
-rwxr-xr-x 1 root root 135376 Nov 16 08:38 b.out
-rw-r--r-- 1 root root 102591 Nov 16 08:38 common.debug
$ readelf -SW a.out | grep gnu_debugaltlink
  [34] .gnu_debugaltlink PROGBITS        0000000000000000 01badd 000021 00      0   0  1
$ gdb -q -batch ./a.out -ex 'ptype Graph'
type = struct Graph {
    Mid mid;
    const char *name;
}
```

두 파일 합계는 505,408바이트에서 279,080바이트로 줄었고, 공통 부분 102,591바이트가 `common.debug`로 빠졌습니다. 각 파일에 생긴 `.gnu_debugaltlink`가 공통 파일을 가리키고, GDB는 그것을 따라가 타입을 찾았습니다. DWARF 5 표준 서문의 "supplementary object file"이 같은 생각을 표준으로 넣은 것입니다.

### 3. -g1 / -gline-tables-only

콜스택과 줄 번호만 필요하다면 정보 수준을 낮춥니다. 같은 `tips.cpp`의 `.debug_info`는 `g++ -g1 -O2`에서 7,260바이트, `clang++ -gline-tables-only -O2`에서 2,606바이트였습니다(`-g`는 67,870바이트). `-gline-tables-only` 빌드에서도 `bt`의 함수 이름과 줄은 나오지만, 변수 정보가 없어 `print step`은 엉뚱하게 libc에 있는 같은 이름의 심볼 `step`을 찍었습니다.

```text
(gdb) bt
#0  bump () at tips.cpp:16
#1  main () at tips.cpp:30
(gdb) print step
$1 = {int (const char *, const char *)} 0xfffff7be34e0 <step>
```

## 별도 debuginfo 파일

배포 바이너리는 strip하고 디버그 정보를 따로 보관합니다. `.gnu_debuglink`로 찾는 방법과 build-id로 찾는 방법은 [Ch 1](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install)과 [Ch 7](/blog/tools/debugging/gdb-lldb/chapter07-core-dump)에서 실제로 돌려 봤습니다. Ch 7에서는 `/opt/symbols/.build-id/70/7074fb...debug`에 둔 파일을 `set debug-file-directory`로 찾았고, Debian의 debuginfod 서버에서 `coreutils`의 디버그 정보를 내려받아 `??` 프레임을 채웠습니다.

## 흔한 문제 진단

### "No symbol table" / 함수가 `??`

디버그 정보와 심볼을 모두 못 찾은 상태입니다. 원인과 확인 방법은 다음과 같습니다.

- `-g` 없이 빌드했다 → `readelf -S`에 `.debug_*`가 없습니다. 다시 빌드합니다.
- strip된 바이너리 + 디버그 정보 없음 → 디버그 패키지를 깔거나 `set debug-file-directory`를 지정합니다.
- 특정 공유 라이브러리만 빠졌다 → `info sharedlibrary`의 `(*)` 표시가 디버그 정보가 없는 라이브러리입니다([Ch 7](/blog/tools/debugging/gdb-lldb/chapter07-core-dump)).

### "value optimized out"

현재 PC가 그 변수의 위치 목록 어느 구간에도 없거나, `DW_OP_entry_value`를 되살리지 못한 경우입니다. 위 `a`의 예가 그렇습니다. 대처는 [Ch 11](/blog/tools/debugging/gdb-lldb/chapter11-practical-tips)과 [Ch 3](/blog/tools/debugging/gdb-lldb/chapter03-inspecting-state)에서 다뤘습니다.

### 줄 번호가 이상하게 보일 때

`-O2`에서는 PC 하나가 여러 줄·여러 함수의 코드에 해당합니다. `-O2`의 `compute` 시작 주소를 `addr2line -p`로 물으면 함수 첫 줄(6행)이 아니라 `discriminator`가 붙은 8행이 나왔습니다. 위 디스어셈블리처럼 6~8행의 계산이 섞여 다섯 명령으로 줄었기 때문입니다.

```text
$ addr2line -e main-O2 -f -i -p 0x7c0
compute at /root/ch12/main.c:8 (discriminator 1)
```

### 빌드 디렉터리가 다름

DWARF에는 컴파일할 때의 디렉터리(`DW_AT_comp_dir`)와 파일 이름이 들어갑니다. 소스를 다른 곳으로 옮기면 GDB가 찾지 못합니다. `/root/ch12/build`에서 빌드하고 소스를 `/root/ch12/src`로 옮긴 뒤 다른 디렉터리에서 실행했습니다.

```text
$ gdb -q -batch ../moved -ex "list compute"
warning: 1	main.c: No such file or directory
$ gdb -q -batch ../moved -ex "set substitute-path /root/ch12/build /root/ch12/src" -ex "list compute"
8	    return square(local) + global_counter;
9	}
10
$ gdb -q -batch ../moved -ex "show directories"
Source directories searched: $cdir:$cwd
```

`show directories`가 보여 주듯 GDB는 기본으로 컴파일 디렉터리(`$cdir`)와 현재 디렉터리(`$cwd`)를 찾습니다. 처음 시험할 때는 현재 디렉터리에 같은 이름의 `main.c`가 있어서 옮긴 소스 대신 그 파일이 열렸습니다. 다른 디렉터리에서 실행해야 문제가 드러났습니다.

빌드할 때 `-fdebug-prefix-map`으로 경로를 바꿔 넣을 수도 있습니다. `/root/ch12/src`에서 `-fdebug-prefix-map=/root/ch12/src=.`로 빌드하자 `DW_AT_comp_dir`이 `"."`이 됐습니다.

```text
$ llvm-dwarfdump-19 --debug-info mapped | grep -m2 -E "DW_AT_comp_dir|DW_AT_name"
              DW_AT_name	("main.c")
              DW_AT_comp_dir	(".")
```

## DWARF 검사 도구

```bash
# 모든 정보
$ readelf --debug-dump=info,line,loc my_prog | less
$ llvm-dwarfdump my_prog

# 특정 주소 분석
$ addr2line -e my_prog -f -i 0x401234

# 콜스택 해제 정보
$ readelf --debug-dump=frames-interp my_prog

# 위치 정보 통계
$ llvm-dwarfdump --statistics my_prog

# 이름으로 DIE 찾기
$ llvm-dwarfdump --find=main my_prog
```

이 장의 출력은 모두 위 명령(Debian 13의 binutils `readelf`와 `llvm-dwarfdump-19`)으로 얻었습니다.

### Python으로 직접 파싱

[pyelftools](https://github.com/eliben/pyelftools)(Debian 13의 `python3-pyelftools` 0.32)로 함수 목록을 뽑았습니다.

```python
from elftools.elf.elffile import ELFFile

with open('/root/ch12/main-O0', 'rb') as f:
    elf = ELFFile(f)
    dwarf = elf.get_dwarf_info()

    for cu in dwarf.iter_CUs():
        print(f"CU @ {cu.cu_offset:#x}, version {cu['version']}")
        top = cu.get_top_DIE()
        for child in top.iter_children():
            if child.tag == 'DW_TAG_subprogram':
                name = child.attributes.get('DW_AT_name')
                low_pc = child.attributes.get('DW_AT_low_pc')
                if name is not None and low_pc is not None:
                    print(f"  {name.value.decode()} @ {low_pc.value:#x}")
```

```text
CU @ 0x0, version 5
  main @ 0x7c4
  compute @ 0x780
  square @ 0x768
```

`-O0`에서는 `static inline`인 `square`도 별도 함수로 남아 `0x768`에 있습니다. 이 스크립트는 `DW_AT_low_pc`가 있는 직접 자식만 보므로, `-O2`처럼 인라인 사본(`DW_TAG_inlined_subroutine`)이나 `DW_AT_ranges`로 흩어진 함수는 놓칩니다.

## DWARF 5의 변화

DWARF 5 표준 서문의 "Changes from Version 4 to Version 5"에서 이 장과 관련된 항목입니다.

- `.debug_loc`·`.debug_ranges`를 `.debug_loclists`·`.debug_rnglists`로 대체했습니다. 위 `-O2` 빌드에 이 두 섹션이 있었습니다.
- `.debug_pubnames`·`.debug_pubtypes`를 이름 인덱스 섹션 `.debug_names` 하나로 대체했습니다.
- split object와 package 표현(`.debug_addr`, `.debug_str_offsets`, `.dwo` 섹션들)을 추가했습니다. 위 split 빌드의 `.debug_addr`가 그것입니다.
- 줄 번호 표 헤더를 새로 정의하고 `.debug_line_str`을 추가했습니다.
- `DW_TAG_call_site`와 관련 속성·연산자로 꼬리 호출을 포함한 호출 지점 정보를 기술합니다.
- 컴파일 유닛 헤더에 `unit_type`이 생겼습니다. 위 split 빌드의 `unit_type = DW_UT_skeleton`이 그 값입니다.

GCC 14.2.0의 기본 출력이 이미 DWARF 5였으므로, 오래된 디버거나 도구와 함께 써야 한다면 `-gdwarf-4`로 판을 명시합니다.

```bash
$ gcc -g -gdwarf-4 ...
```

## DWARF 안의 함수 인라인 트리 — 한 예

인라인이 겹치면 PC 하나에 논리 프레임이 여럿 생깁니다. 상수 인자로 부르면 최적화가 전부 지워 버리므로, `argc`를 인자로 쓰도록 바꾼 예를 `clang++ -O2 -g`로 빌드했습니다.

```cpp title="sq.cpp"
inline int square(int x) { return x * x; }
inline int sum_of_squares(int a, int b) { return square(a) + square(b); }
int main(int argc, char**) { return sum_of_squares(argc, argc + 1); }
```

```text
$ llvm-dwarfdump-19 --debug-info demo | grep -c DW_TAG_inlined_subroutine
2
$ gdb -q -batch ./demo -ex 'break square' -ex run -ex bt
Breakpoint 1 at 0x76c: file sq.cpp, line 2.

Breakpoint 1, square (x=1) at sq.cpp:2
2	inline int square(int x) { return x * x; }
#0  square (x=1) at sq.cpp:2
#1  sum_of_squares (a=1, b=2) at sq.cpp:3
#2  main (argc=1) at sq.cpp:4
```

진짜 프레임은 `main` 하나지만 GDB는 인라인 DIE를 따라 세 프레임을 보여 줍니다. 같은 코드를 `sum_of_squares(3, 4)`로 부르면 clang이 `main`을 `mov w0, #0x19`(25) 한 명령으로 접고, 인라인 DIE는 0개가 됩니다.

```text
0000000000000768 <main>:
 768:	mov	w0, #0x19                  	// #25
 76c:	ret
```

GCC로 빌드한 `main.c`의 `-O2` 판에서도 `square`는 길이 0인 인라인 범위(`DW_AT_low_pc`와 `DW_AT_high_pc`가 모두 `0x7c8`)만 남았고, GDB의 `break square`는 `Function "square" not defined.`로 실패했습니다.

## 정리

- GCC 14.2.0은 기본으로 DWARF 5를 냅니다. 섹션은 `.debug_info`·`.debug_abbrev`·`.debug_line`·`.debug_str` 등으로 나뉘고, `-O2`에서는 `.debug_loclists`·`.debug_rnglists`가 생깁니다.
- DIE 트리(`.debug_info`)가 타입·변수·함수를, 줄 번호 프로그램(`.debug_line`)이 PC↔소스를, 위치 목록이 PC마다 변수 위치를 기술합니다.
- 위치 표현은 스택 머신(`DW_OP_*`)이고, `-O2`의 `a`는 w0에서 `DW_OP_entry_value`로 바뀌었습니다.
- 이 빌드의 CFI는 `.eh_frame`에만 있었고, `compute`의 FDE가 x29·x30이 CFA-48·CFA-40에 저장된다고 기술했습니다.
- 크기는 split-DWARF(`.debug_info` 67,870 → 49바이트), dwz(두 파일 505,408 → 279,080바이트 + 공통 102,591바이트), `-gline-tables-only`(2,606바이트)로 줄였습니다.
- 소스 경로 문제는 `set substitute-path`나 `-fdebug-prefix-map`으로 풀고, GDB가 `$cwd`도 찾는다는 점에 주의합니다.
- `readelf`, `llvm-dwarfdump`, `addr2line`, pyelftools로 직접 열어 볼 수 있습니다.

## 관련 항목

- [Ch 1: 소개와 설치](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install) — `-g3 -fno-omit-frame-pointer`
- [Ch 4: 콜스택과 프레임](/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames) — CFI가 풀어 주는 것
- [Ch 7: core dump 분석](/blog/tools/debugging/gdb-lldb/chapter07-core-dump) — build-id로 debuginfo 매칭
- [Ch 11: 실전 팁](/blog/tools/debugging/gdb-lldb/chapter11-practical-tips) — "optimized out" 회피
- [DWARF 5 표준 PDF](https://dwarfstd.org/doc/DWARF5.pdf)
- [llvm-dwarfdump 문서](https://llvm.org/docs/CommandGuide/llvm-dwarfdump.html)
- [pyelftools](https://github.com/eliben/pyelftools)
- [`debuginfod` 프로젝트](https://sourceware.org/elfutils/Debuginfod.html)
