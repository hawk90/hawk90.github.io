---
title: "DWARF .debug_line 분석 — Source-to-PC 매핑 바이트코드 VM"
slug: "tools/debugging/dwarf-elf/chapter03-debug-line"
date: 2026-05-23T09:03:00
description: "DWARF 줄 정보의 정체. 상태 머신, 표준/확장 opcode, file table, addr2line의 내부."
tags: [dwarf, debug-line, state-machine, addr2line]
series: "DWARF and ELF Internals"
seriesOrder: 3
draft: false
topics: ["tools", "tools/debugging"]
---

`addr2line`에 주소를 주면 어떻게 `square.c:2`라고 답할까요. 답은 `.debug_line` 섹션입니다. PC 주소와 (파일, 줄, 컬럼)의 매핑을 *바이트코드 가상 머신*의 프로그램으로 압축해 둡니다.

이 장은 그 VM을 다룹니다. 상태 머신 레지스터, 표준·확장·특수 opcode, 파일 테이블 구조, 그리고 `addr2line`이 이 표로 주소를 찾는 방법입니다. 예제는 macOS의 Homebrew LLVM 23.1.5로 만든 x86-64 ELF 오브젝트와 Debian 13 arm64 게스트의 GCC 14.2·binutils 2.44·GDB 16.3에서 실행했습니다. 규칙은 [DWARF 5 §6.2](https://dwarfstd.org/doc/DWARF5.pdf) "Line Number Information"을 따릅니다.

:::tldr
`.debug_line`은 *(PC, file, line, column, flags)* 행의 표입니다. 이 표를 *바이트코드*로 압축해 저장하고, 디버거가 실행해 표를 재구성합니다.
:::

## 왜 VM인가

줄 표를 그대로 저장하면 행마다 8바이트 주소와 파일·줄·컬럼·플래그가 붙습니다. 그런데 연속한 행은 대개 주소가 몇 바이트, 줄이 한두 줄만 차이 납니다. 그래서 DWARF는 표 대신 "주소를 7 올리고 줄을 1 올린 뒤 행을 하나 내라" 같은 명령을 저장합니다. 지도 전체를 보내는 대신 "직진 300m, 우회전" 같은 길 안내를 보내는 것과 같습니다.

아래 `square.o`에서는 행 5개(끝 표시 포함)를 내는 프로그램 본체가 0x43~0x61, 31바이트였습니다. 그중 세 행은 각각 special opcode 1바이트로 나왔습니다. 섹션 전체는 헤더와 파일 테이블이 붙어 0x62(98)바이트입니다. 큰 프로그램에서는 효과가 더 분명합니다. Debian 13의 `/usr/bin/ls` 디버그 정보(debuginfod로 받아 압축 해제)에서 `.debug_line`은 0x1743b(95,291)바이트였고, `llvm-dwarfdump --debug-line`이 풀어낸 행은 20,681개였습니다. 헤더·파일 테이블까지 포함해 행당 약 4.6바이트로, 8바이트 주소 하나보다 작습니다.

## 상태 머신 레지스터

VM은 다음 레지스터를 갱신하며 행을 냅니다. 초기값은 DWARF 5 Table 6.4 "Line number program initial state"입니다.

![.debug_line 바이트코드 VM — 레지스터·opcode·emit 흐름](/images/blog/tools/diagrams/dwarf-line-state-machine.svg)

| 레지스터 | 초기값 | 의미 |
|----------|--------|------|
| `address` | 0 | 현재 PC |
| `op_index` | 0 | VLIW 명령 안의 연산 번호 (`max_ops = 1`이면 항상 0) |
| `file` | 1 | 현재 파일 인덱스 |
| `line` | 1 | 현재 줄 |
| `column` | 0 | 현재 컬럼 |
| `is_stmt` | header.default_is_stmt | 이 행이 권장 breakpoint 위치인가 |
| `basic_block` | false | basic block 시작 |
| `end_sequence` | false | 시퀀스 끝 |
| `prologue_end` | false | 함수 프롤로그 끝 |
| `epilogue_begin` | false | 함수 에필로그 시작 |
| `isa` | 0 | ISA mode (ARM/Thumb 같은) |
| `discriminator` | 0 | 같은 (file, line, column)의 블록 구분자 |

DWARF 5에서 파일 인덱스 0이 유효해졌어도 `file`의 초기값은 여전히 1입니다. 그래서 clang 23.1.5는 `square.o`의 프로그램 첫 명령으로 `DW_LNS_set_file (0)`을 냈습니다(아래 실행 예).

§6.2.5.2에 따르면 `DW_LNS_copy`는 현재 레지스터로 행 하나를 내고 `discriminator`를 0으로, `basic_block`·`prologue_end`·`epilogue_begin`을 false로 되돌립니다.

## 헤더

CU마다 `.debug_line` 프로그램이 하나 있고, 헤더가 VM 동작 파라미터를 정합니다(§6.2.4 "The Line Number Program Header").

```c
struct LineHeader {
    uint32_t unit_length;
    uint16_t version;
    uint8_t  address_size;            // DWARF 5
    uint8_t  segment_selector_size;   // DWARF 5
    uint32_t header_length;
    uint8_t  minimum_instruction_length;
    uint8_t  maximum_operations_per_instruction; // VLIW
    uint8_t  default_is_stmt;
    int8_t   line_base;
    uint8_t  line_range;
    uint8_t  opcode_base;
    uint8_t  standard_opcode_lengths[opcode_base - 1];

    // file/directory tables (DWARF 5는 형식 변경)
    DirectoryEntry directories[];
    FileEntry files[];
};
```

`square.o` 헤더를 `llvm-dwarfdump -v --debug-line`이 풀어 보인 값입니다.

```text
    total_length: 0x0000005e
          format: DWARF32
         version: 5
    address_size: 8
 seg_select_size: 0
 prologue_length: 0x00000037
 min_inst_length: 1
max_ops_per_inst: 1
 default_is_stmt: 1
       line_base: -5
      line_range: 14
     opcode_base: 13
```

- `minimum_instruction_length` — 주소 증분의 단위 바이트입니다. clang 23.1.5는 x86-64·AArch64·RISC-V 오브젝트 모두에 1을 썼습니다. 반면 게스트의 GCC 14.2는 AArch64 오브젝트에 4를 썼습니다. AArch64 명령이 모두 4바이트이므로 주소 증분을 4로 나눈 값만 적으면 되고, special opcode 한 바이트로 갈 수 있는 거리가 그만큼 길어집니다.
- `maximum_operations_per_instruction` — VLIW 아키텍처용입니다. 위 출력은 1입니다.
- `default_is_stmt` — `is_stmt` 초기값입니다.
- `line_base` / `line_range` — 특수 opcode 인코딩에 사용합니다(아래).
- `opcode_base` — 첫 특수 opcode 번호입니다. 13이면 1~12가 표준 opcode입니다.

## File / Directory Table (DWARF 4)

DWARF 4의 헤더는 include 디렉터리 문자열 목록과 파일 항목 목록을 인라인 NUL 문자열로 둡니다. 같은 `lines.c`를 `-gdwarf-4`로 만들면 파일 표가 이렇습니다.

```text
$ llvm-dwarfdump --debug-line lines4.o
...
file_names[  1]:
           name: "lines.c"
      dir_index: 0
       mod_time: 0x00000000
...
```

DWARF 4 §6.2.4에서 directory index 0은 컴파일 디렉터리를 뜻하고, 파일 번호는 1부터 셉니다. 위 출력도 파일이 `file_names[1]`, 디렉터리가 0(컴파일 디렉터리)입니다.

### DWARF 5 변화

DWARF 5는 디렉터리와 파일 목록 모두 0번부터 쓰고, 0번에 CU 자신의 디렉터리와 기본 파일을 둡니다. 항목의 형식도 고정이 아니라 헤더의 `directory_entry_format`·`file_name_entry_format`이 `DW_LNCT_path`, `DW_LNCT_directory_index`, `DW_LNCT_timestamp`, `DW_LNCT_size`, `DW_LNCT_MD5` 같은 content type과 FORM의 조합으로 정합니다(§6.2.4.1 "Standard Content Descriptions"). `square.o`의 표입니다.

```text
include_directories[  0] =  .debug_line_str[0x00000000] = "/src"
file_names[  0]:
           name:  .debug_line_str[0x00000005] = "square.c"
      dir_index: 0
   md5_checksum: af719479c73631d86c5a2eac4aa04295
```

경로는 `DW_FORM_line_strp`로 `.debug_line_str`을 가리키고, MD5는 `DW_FORM_data16` 16바이트입니다. §1.4는 MD5를 사용 중인 소스 파일이 빌드 때와 같은 버전인지 검증하는 용도로 설명합니다.

## Opcode 세 가지

### 1. 표준 opcode (DW_LNS_*)

1부터 `opcode_base - 1`까지의 값입니다. 인자는 0개 이상의 LEB128이고, `DW_LNS_fixed_advance_pc`만 2바이트 고정 폭입니다(§6.2.5.2). 헤더의 `standard_opcode_lengths`가 opcode마다 인자 개수를 적어 두므로, 모르는 opcode를 만난 디코더도 건너뛸 수 있습니다.

| Opcode | 인자 | 동작 |
|--------|------|------|
| `DW_LNS_copy` | - | 현재 레지스터로 한 행 emit, basic_block 등 reset |
| `DW_LNS_advance_pc` | uleb128 | `address += operand * min_inst_len` |
| `DW_LNS_advance_line` | sleb128 | `line += operand` |
| `DW_LNS_set_file` | uleb128 | `file = operand` |
| `DW_LNS_set_column` | uleb128 | `column = operand` |
| `DW_LNS_negate_stmt` | - | `is_stmt = !is_stmt` |
| `DW_LNS_set_basic_block` | - | `basic_block = true` |
| `DW_LNS_const_add_pc` | - | special opcode 255의 주소 증분만 적용 (행은 내지 않음) |
| `DW_LNS_fixed_advance_pc` | uhalf | `address += operand`, op_index=0 |
| `DW_LNS_set_prologue_end` | - | prologue_end = true |
| `DW_LNS_set_epilogue_begin` | - | epilogue_begin = true |
| `DW_LNS_set_isa` | uleb128 | ISA mode (ARM/Thumb) |

### 2. 확장 opcode (DW_LNE_*)

`0x00` + ULEB128 길이 + opcode + 인자 형식입니다(§6.2.5.3). 시퀀스마다 시작과 끝에서 한 번씩 나오는 명령이라 길이를 더 써도 부담이 작습니다.

| Opcode | 인자 | 동작 |
|--------|------|------|
| `DW_LNE_end_sequence` | - | end_sequence=true, 한 행 emit, 레지스터 초기화 |
| `DW_LNE_set_address` | address | `address = operand`, op_index=0 |
| `DW_LNE_set_discriminator` | uleb128 | `discriminator = operand` |
| `DW_LNE_define_file` | — | DWARF 5에서 deprecated, 코드 0x03은 예약 |

`DW_LNE_set_address`가 시퀀스 시작 주소를 절대값으로 정하고, 이후로는 상대 증분만 씁니다. 오브젝트 파일에서는 이 주소 자리에 재배치가 붙습니다. `sections.o`(1장)의 `.rela.debug_line`에 `R_X86_64_64 .text + 0`이 있던 것이 그 자리입니다.

### 3. 특수 opcode (Special opcode)

`opcode_base` 이상의 값입니다. *한 바이트로* 주소 증분 + 줄 증분 + 행 emit을 모두 합니다(§6.2.5.1).

```text
adjusted_opcode = opcode - opcode_base
operation_advance = adjusted_opcode / line_range
line_increment    = line_base + (adjusted_opcode % line_range)

새 address = address + min_inst_len * ((op_index + operation_advance) / max_ops)
새 op_index = (op_index + operation_advance) % max_ops
새 line    = line + line_increment
행 emit

그 후 basic_block / prologue_end / epilogue_begin / discriminator reset
```

`opcode_base=13, line_base=-5, line_range=14, min_inst_len=1`이면 adjusted opcode는 0~242이고, 주소 증분은 0~17, 줄 증분은 -5~+8입니다. 다만 주소 증분 17은 adjusted 238~242에서만 나오므로 그때 줄 증분은 -5~-1입니다. 범위를 벗어난 조합은 `DW_LNS_advance_pc`·`DW_LNS_advance_line`·`DW_LNS_const_add_pc`로 먼저 레지스터를 옮긴 뒤 내보냅니다.

```text
opcode 0x10 → adjusted = 3
              operation_advance = 3 / 14 = 0  → address += 0
              line_increment = -5 + (3 % 14) = -2  → line -= 2

opcode 0x18 → adjusted = 11
              operation_advance = 11 / 14 = 0  → address += 0
              line_increment = -5 + 11 = 6  → line += 6

opcode 0x35 → adjusted = 40
              operation_advance = 40 / 14 = 2  → address += 2
              line_increment = -5 + (40 % 14) = -5 + 12 = 7  → line += 7
```

## 실행 예 — 짧은 함수

`square.c`를 clang 23.1.5 `--target=x86_64-unknown-linux-gnu -g -gdwarf-5 -O0`로 컴파일했습니다.

```c title="square.c"
int square(int x) {
    return x * x;
}
```

```text
$ llvm-objdump -d --no-show-raw-insn square.o
0000000000000000 <square>:
       0:      	pushq	%rbp
       1:      	movq	%rsp, %rbp
       4:      	movl	%edi, -0x4(%rbp)
       7:      	movl	-0x4(%rbp), %eax
       a:      	imull	-0x4(%rbp), %eax
       e:      	popq	%rbp
       f:      	retq
```

`llvm-dwarfdump -v --debug-line`은 opcode 한 줄마다 바이트와 결과 행을 보여 줍니다.

```text
0x00000043: 04 DW_LNS_set_file (0)
0x00000045: 00 DW_LNE_set_address (0x0000000000000000)
0x00000050: 01 DW_LNS_copy
            0x0000000000000000      1      0      0   0             0       0  is_stmt
0x00000051: 05 DW_LNS_set_column (12)
0x00000053: 0a DW_LNS_set_prologue_end
0x00000054: 75 address += 7,  line += 1,  op-index += 0
            0x0000000000000007      2     12      0   0             0       0  is_stmt prologue_end
0x00000055: 05 DW_LNS_set_column (14)
0x00000057: 06 DW_LNS_negate_stmt
0x00000058: 3c address += 3,  line += 0,  op-index += 0
            0x000000000000000a      2     14      0   0             0       0
0x00000059: 05 DW_LNS_set_column (5)
0x0000005b: 0b DW_LNS_set_epilogue_begin
0x0000005c: 4a address += 4,  line += 0,  op-index += 0
            0x000000000000000e      2      5      0   0             0       0  epilogue_begin
0x0000005d: 02 DW_LNS_advance_pc (addr += 2, op-index += 0)
0x0000005f: 00 DW_LNE_end_sequence
            0x0000000000000010      2      5      0   0             0       0  end_sequence
```

special opcode 세 개를 식에 넣어 확인합니다. `0x75`(117)는 adjusted 104 → 주소 +7, 줄 -5+6 = +1입니다. `0x3c`(60)는 adjusted 47 → 주소 +3, 줄 +0이고, `0x4a`(74)는 adjusted 61 → 주소 +4, 줄 +0입니다.

행을 읽으면 프롤로그(`push`·`mov`·`movl %edi`)가 줄 1, `prologue_end`가 붙은 0x7이 `return x * x`의 시작입니다. 0xa의 `imull`은 같은 줄의 컬럼 14인데 `negate_stmt`로 `is_stmt`가 꺼졌습니다. 닫는 중괄호(줄 3)에는 행이 없고, `popq`부터는 줄 2 컬럼 5에 `epilogue_begin`이 붙었습니다. `end_sequence` 행의 0x10은 마지막 명령 바로 다음 주소로, 시퀀스의 제외 상한입니다.

## addr2line의 안쪽

```c
// 의사 코드
int addr2line(elf *e, uint64_t target_pc) {
    for_each_cu(cu) {
        line_program *prog = get_line_program(cu);
        run_vm(prog, [](LineRow row) {
            if (row.address > target_pc) stop();
            // 또는 sequence가 PC 이상 첫 번째 행 직전을 보고
        });
    }
}
```

같은 시퀀스 안에서 `row.address <= target < next.address`인 행을 고릅니다. `end_sequence` 행은 제외 상한이고, 같은 주소에 여러 행이 있거나 시퀀스 사이에 빈 주소가 있을 수 있으므로 시퀀스 경계를 넘어 앞 행을 재사용하면 안 됩니다. `square.o`에 `llvm-addr2line`을 돌린 결과가 이 규칙대로입니다.

```text
$ llvm-addr2line -e square.o 0x5 0x7 0xc 0x10
/src/square.c:1
/src/square.c:2
/src/square.c:2
??:0
```

0x5는 0x0 행(줄 1), 0xc는 0xa 행(줄 2)에 속하고, 0x10은 `end_sequence` 주소라 어느 행에도 속하지 않습니다.

CU가 많으면 주소로 CU부터 찾아야 합니다. `.debug_aranges`가 CU별 주소 범위 표이고(§6.1.2 "Lookup by Address"), 게스트의 GCC 14.2는 기본으로 이 섹션을 만들었습니다.

```text
$ readelf --debug-dump=aranges lines
Contents of the .debug_aranges section:

  Length:                   44
  Version:                  2
  Offset into .debug_info:  0
  Pointer Size:             8
  Segment Size:             0

    Address            Length
    0000000000000768 0000000000000050
    0000000000000000 0000000000000000
```

`0x768`부터 0x50바이트가 이 CU(`sum`·`main`)이고, 0/0 쌍이 표의 끝입니다. 2장에서 본 것처럼 clang 19.1.7은 이 섹션을 기본으로 만들지 않았으므로, 도구는 aranges가 없을 때 CU의 `DW_AT_low_pc`/`high_pc`/`DW_AT_ranges`로 범위를 구합니다.

## 인라인 — 줄 표와 DIE의 분업

인라인된 함수의 줄 정보는 부모 함수의 line program에 함께 들어가고, 한 주소에는 가장 안쪽 인라인 함수의 줄만 적힙니다. 호출 체인은 `.debug_info`의 `DW_TAG_inlined_subroutine`이 담습니다(2장). `inl.c`로 확인했습니다.

```c title="inl.c"
extern int sink(int);
static inline int foo(int v) {
    return sink(v * 3);
}
static inline int bar(int v) {
    return foo(v + 1) + 7;
}
int entry(int v) {
    return bar(v);
}
```

clang 23.1.5 `-O2`에서 `entry`는 `leal (%rdi,%rdi,2)`·`addl $0x3`·`callq sink`·`addl $0x7`로 접혔습니다. 줄 표의 0x1~0xb는 `foo`의 줄 3 하나뿐이고, DIE 쪽에 `bar`(호출 줄 9)와 그 안의 `foo`(호출 줄 6)가 `DW_TAG_inlined_subroutine`으로 있습니다.

```text
$ llvm-addr2line -e inl.o -f -i -p 0x8
foo at /src/inl.c:3
 (inlined by) bar at /src/inl.c:6
 (inlined by) entry at /src/inl.c:9
```

`-i` 없이 물으면 `foo`와 `/src/inl.c:3`만 나옵니다. `-i`가 줄 표의 가장 안쪽 위치에 `DW_AT_call_file`/`DW_AT_call_line`을 차례로 이어 붙여 호출 체인을 재구성합니다.

## is_stmt — 권장 breakpoint 위치

§6.2.2는 `is_stmt`를 그 명령이 권장 breakpoint 위치, 곧 문장의 시작인지를 나타내는 레지스터로 정의합니다. 디버거가 "이 줄에 breakpoint"를 받으면 그 줄의 `is_stmt` 행을 고릅니다. 앞의 `square.o`에서 줄 2에는 0x7(`is_stmt`)과 0xa(`is_stmt` 꺼짐) 두 행이 있었고, 줄 2에 거는 breakpoint는 0x7에 걸립니다.

```c
int f() {
    return a + b;     // 이 줄에 BP → 어느 명령에 걸리나?
}
```

최적화 코드에서는 한 줄의 명령이 흩어지므로 `is_stmt` 행도 여러 개가 됩니다. 아래 discriminator 절의 `disc.c` 표에서 clang `-O2`는 줄 3에 `is_stmt` 행 4개를 냈습니다.

## Discriminator — 같은 줄의 구분자

한 줄에 여러 basic block이 있으면 (file, line)만으로는 어느 블록이 실행됐는지 알 수 없습니다. §6.2.2는 `discriminator`를 같은 파일·줄·컬럼에 걸린 여러 블록을 구분하는 값으로 정의하고, 값은 producer가 임의로 매기며 블록이 하나뿐이면 0이라고 정합니다. 샘플링 profiler가 주소를 블록 단위로 모으려면 이 구분이 필요합니다.

```c title="disc.c"
int a(void); int b(void); int c(void);
int f(void) {
    int x = a() + b() + c();
    return x;
}
int g(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) s += a();
    return s;
}
```

clang 23.1.5 `-O2`의 기본 출력은 discriminator가 모두 0이고 컬럼으로만 구분했습니다. `-fdebug-info-for-profiling`을 더하자 값이 붙었습니다.

```text
$ llvm-dwarfdump --debug-line disc-prof.o
Address            Line   Column File   ISA Discriminator OpIndex Flags
------------------ ------ ------ ------ --- ------------- ------- -------------
0x0000000000000000      2      0      0   0             0       0  is_stmt
0x0000000000000003      3     13      0   0             0       0  is_stmt prologue_end
0x0000000000000008      3     13      0   0             0       0  is_stmt
0x000000000000000a      3     19      0   0             2       0
0x000000000000000f      3     19      0   0             2       0  is_stmt
0x0000000000000011      3     17      0   0             0       0
0x0000000000000013      3     25      0   0             4       0
0x0000000000000018      3     23      0   0             0       0  is_stmt
...
0x0000000000000033      8     23      0   0             2       0  is_stmt prologue_end
0x0000000000000035      8      5      0   0             2       0  is_stmt
...
0x0000000000000040      8     38      0   0             4       0  is_stmt
0x0000000000000045      8     35      0   0             4       0  is_stmt
```

줄 3의 `b()` 호출(컬럼 19)과 `c()` 호출(컬럼 25)이 2와 4를 받았고, 줄 8의 `for`도 조건부와 본체가 2와 4로 갈렸습니다. 게스트의 GCC 14.2는 옵션 없이 `-g -O2`만으로 `DW_LNE_set_discriminator`를 냈습니다(`readelf --debug-dump=rawline`에 `Extended opcode 4: set Discriminator to 1`, `to 2`가 나옵니다). 값을 매기는 규칙은 컴파일러마다 다르고, 표준은 블록이 다르면 값이 다르다는 것만 정합니다.

## prologue_end / epilogue_begin

`prologue_end`는 디버거가 함수 진입 breakpoint를 둘 위치, `epilogue_begin`은 함수를 떠나기 전 breakpoint를 둘 위치입니다(§6.2.2). 프롤로그가 끝나야 인자가 스택 슬롯에 저장되므로, `break 함수`가 프롤로그 뒤에 걸려야 인자를 바로 읽을 수 있습니다.

```c
void f() {
    // prologue:
    //   push rbp; mov rbp, rsp; sub rsp, 16
    //   ↑ 이 명령들은 함수 진입 setup, *사용자 코드 아님*

    do_work();     // ← prologue_end가 *여기* 첫 명령에 marked

    // epilogue:
    //   mov rsp, rbp; pop rbp; ret
    //   ↑ epilogue_begin이 *여기* 첫 명령에 marked
}
```

게스트에서 `lines.c`(아래 직접 확인 절의 소스에 `main` 추가)를 GCC 14.2 `-g -O0`로 빌드하고 GDB 16.3으로 확인했습니다.

```text
$ objdump -d --no-show-raw-insn lines
0000000000000768 <sum>:
 768:	sub	sp, sp, #0x20
 76c:	str	w0, [sp, #12]
 770:	str	w1, [sp, #8]
 774:	ldr	w1, [sp, #12]
...
$ gdb -q -batch -ex 'break sum' -ex 'info line sum' ./lines
Breakpoint 1 at 0x774: file lines.c, line 2.
Line 1 of "lines.c" starts at address 0x768 <sum> and ends at 0x774 <sum+12>.
```

`objdump --dwarf=decodedline`에서 줄 1은 0x768, 줄 2는 0x774에서 시작했습니다. GCC의 이 출력에는 `prologue_end` 표시가 없었고, GDB는 줄 표의 두 번째 줄 시작(0x774)을 프롤로그 끝으로 보고 breakpoint를 놓았습니다. 인자를 스택에 저장하는 `str w0`·`str w1`이 끝난 지점입니다. clang이 `prologue_end`를 직접 표시한 `square.o`에서는 그 행이 0x7이었습니다.

## .debug_line_str — DWARF 5

DWARF 4까지는 파일·디렉터리 이름이 line program 헤더 안에 인라인 문자열로 들어갔습니다. DWARF 5는 `.debug_line_str` 섹션으로 분리했고, §1.4는 이유로 줄 표만 남기고 나머지 DWARF를 strip하는 관행을 지원하려는 것을 듭니다. `.debug_str`과 섞이지 않아야 그 섹션을 통째로 지울 수 있기 때문입니다. `square.o`의 `.debug_line_str`은 0xe바이트입니다.

```text
$ llvm-dwarfdump --debug-line-str square.o
.debug_line_str contents:
0x00000000: "/src"
0x00000005: "square.c"
```

헤더의 `include_directories[0]`이 0x0, `file_names[0]`이 0x5를 가리킵니다. 섹션 플래그가 `MS`라서 링커가 여러 CU의 같은 디렉터리 이름을 하나로 합칩니다.

## 직접 디코딩 — pyelftools

아래 직접 확인의 `decode-line.py`는 pyelftools 0.32에서 DWARF 4/5 파일 인덱스 차이와 `end_sequence` 경계를 처리하는 최소 예제입니다. 주소를 줄로 바꾸는 핵심이 이 20여 줄이라서, crash log의 PC 목록을 일괄 변환하는 스크립트를 이 위에 세울 수 있습니다.

## 다른 도구

```bash
# 기본 도구
addr2line -e my_prog 0x401234

# 함수 이름 포함
addr2line -e my_prog -f 0x401234

# 인라인 체인까지
addr2line -e my_prog -f -i -p 0x401234

# 여러 주소 한 번에, 또는 stdin에서
addr2line -e my_prog 0x401120 0x401200 0x401300
echo 0x401234 | addr2line -e my_prog

# 줄 표 보기
llvm-dwarfdump --debug-line my_prog
readelf --debug-dump=decodedline my_prog
readelf --debug-dump=rawline my_prog      # raw opcode
```

`my_prog`와 주소는 자리표시자입니다. 실제 출력은 위 `square.o`·`inl.o`와 아래 crash 예제에 있습니다.

## stack trace 후처리

crash log에 PC만 있을 때 줄 표로 위치를 되찾는 과정입니다. 게스트에서 `SIGSEGV` 핸들러가 glibc `backtrace_symbols_fd`로 프레임을 찍는 `crash.c`를 GCC 14.2 `-g -O2`로 빌드해 실행했습니다.

```c title="crash.c"
#include <execinfo.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
static void on_fault(int sig) {
    void *pcs[16];
    int n = backtrace(pcs, 16);
    backtrace_symbols_fd(pcs, n, STDERR_FILENO);
    _exit(128 + sig);
}
__attribute__((noinline)) static int process_data(int *p) {
    return *p + 1;
}
static inline int start_handler(int *p) {
    return process_data(p) * 2;
}
int main(int argc, char **argv) {
    signal(SIGSEGV, on_fault);
    int *p = argc > 5 ? &argc : NULL;
    return start_handler(p);
}
```

```text
$ ./crash
./crash(+0x960) [0xaaaada060960]
linux-vdso.so.1(__kernel_rt_sigreturn+0x0) [0xffff8dd32808]
./crash(+0x7c4) [0xaaaada0607c4]
/lib/aarch64-linux-gnu/libc.so.6(+0x2225c) [0xffff8db5225c]
/lib/aarch64-linux-gnu/libc.so.6(__libc_start_main+0x9c) [0xffff8db5233c]
./crash(+0x830) [0xaaaada060830]
```

PIE라서 절대 주소는 실행마다 바뀌지만 `(+0x…)`는 파일 안 offset입니다. 이 offset을 그대로 `addr2line`에 넣었습니다.

```text
$ for a in 0x960 0x7c4 0x2225c 0x830; do printf '%s -> ' $a; addr2line -e crash -f -i -p $a; done
0x960 -> on_fault at /w3/crash.c:8
0x7c4 -> start_handler at /w3/crash.c:16
 (inlined by) main at /w3/crash.c:21
0x2225c -> ?? ??:0
0x830 -> _start at ??:?
```

죽은 함수 `process_data`가 목록에 없는 이유는 디스어셈블에 있습니다.

```text
$ objdump -d --no-show-raw-insn crash
...
 7ac:	bl	980 <process_data.isra.0>
...
 7c0:	mov	x0, #0x0                   	// #0
 7c4:	ldr	w0, [x0]
 7c8:	brk	#0x3e8
...
0000000000000980 <process_data.isra.0>:
 980:	add	w0, w0, #0x1
 984:	ret
```

GCC `-O2`의 IPA-SRA가 `process_data`를 포인터 대신 `int` 값을 받는 `process_data.isra.0`으로 바꾸고, `*p` 역참조를 호출자로 옮겼습니다. `p`가 `NULL`인 경로(0x7c0)에서는 `main` 안의 `ldr w0, [x0]`(0x7c4)이 바로 fault를 냈습니다. 그래서 `backtrace`가 시그널 프레임 다음에 내놓은 0x7c4는 fault가 난 명령 자체의 주소이고, 줄 표가 그 주소를 인라인된 `start_handler`의 줄 16, 호출 위치 `main` 21줄로 정확히 돌려줍니다. 최적화된 코드에서는 소스의 함수 경계와 실제 명령의 위치가 이렇게 어긋납니다.

시그널 프레임 위쪽의 나머지 프레임은 반환 주소입니다. 반환 주소는 `bl`·`call` 다음 명령을 가리키므로, 호출 지점의 줄이 필요하면 주소에서 1을 빼서 묻습니다. libc 프레임(`0x2225c`)은 libc의 디버그 정보가 없어 `??`입니다. 운영에서는 stripped 바이너리를 배포하고 build-id가 같은 debug 파일로 같은 일을 합니다(6장).

## 줄 정보만 남기기 — `-gline-tables-only`

crash log 분석처럼 줄 번호만 필요하면 전체 DWARF를 다 둘 필요가 없습니다. clang의 `-gline-tables-only`와 GCC의 `-g1`이 이 용도입니다.

게스트에서 FreeRTOS-Kernel(2026-10-29 기준 main)의 `tasks.c`를 POSIX 포트 헤더와 `examples/template_configuration`으로 `-O2` 오브젝트로 만들어 비교했습니다. 코드 크기(`size`의 text)는 두 컴파일러 모두 약 12.8 KB입니다.

| 빌드 | 파일 크기 | `.debug_info` | `.debug_loclists` | `.debug_line` |
|------|----------|---------------|-------------------|---------------|
| clang 19.1.7, 디버그 없음 | 37,904 | — | — | — |
| clang `-gline-tables-only` | 53,672 | 0x556 | 없음 | 0x142c |
| clang `-g` | 87,776 | 0x20f2 | 0x1fcd | 0x16cc |
| GCC 14.2 `-g0` | 29,944 | — | — | — |
| GCC `-g1` | 47,600 | 0xabf | 없음 | 0x164f |
| GCC `-g` | 115,872 | 0x3fc3 | 0x2bad | 0x33b2 |

줄 정보만 남겨도 `.debug_info`가 0이 되지는 않습니다. 앞의 `inl.c`를 macOS clang 23.1.5 `-gline-tables-only -O2`로 만들면 `.debug_info`에 CU 1개, `DW_TAG_subprogram` 4개, `DW_TAG_inlined_subroutine` 2개, `DW_TAG_call_site` 1개만 남았고, `llvm-addr2line -f -i 0x8`이 `foo`/`bar`/`entry` 체인을 그대로 냈습니다. 함수 이름과 인라인 체인에 필요한 DIE만 남기는 것입니다. 변수·타입 DIE와 위치 목록이 빠지면서 clang은 디버그 오버헤드가 49,872바이트에서 15,768바이트로, GCC는 85,928바이트에서 17,656바이트로 줄었습니다(디버그 없는 빌드와의 파일 크기 차). 대신 `print` 같은 변수 조회는 할 수 없습니다.

## DWARF 5의 변화 요약

- `.debug_line_str` 추가 → 줄 표용 문자열 풀 분리.
- 파일·디렉터리 표 0번부터 유효 (`file` 레지스터 초기값은 여전히 1).
- `DW_LNCT_*` content type → 항목 형식을 헤더가 정의.
- `DW_LNCT_MD5`로 소스 파일 버전 검증.
- `DW_LNE_define_file` deprecated.

## 직접 확인 — DWARF 4·5에서 주소 조회

같은 소스로 DWARF 4·5 오브젝트를 만들고 `sum`의 첫 주소를 줄로 바꿉니다. macOS의 clang 23.1.5로 x86-64 Linux 오브젝트를 만들어 파일만 분석합니다.

```c title="lines.c"
int sum(int left, int right) {
    int result = left + right;
    return result;
}
```

```python title="decode-line.py"
import sys
from elftools.elf.elffile import ELFFile

def file_index(version, number):
    return number if version >= 5 else number - 1

def lookup(path, target):
    with open(path, "rb") as stream:
        dwarf = ELFFile(stream).get_dwarf_info()
        for cu in dwarf.iter_CUs():
            program = dwarf.line_program_for_CU(cu)
            if program is None:
                continue
            previous = None
            for entry in program.get_entries():
                state = entry.state
                if state is None:
                    continue
                if previous and previous.address <= target < state.address:
                    index = file_index(program["version"], previous.file)
                    files = program["file_entry"]
                    if 0 <= index < len(files):
                        return f"{files[index].name.decode()}:{previous.line}"
                previous = None if state.end_sequence else state
    return None

if __name__ == "__main__":
    result = lookup(sys.argv[1], int(sys.argv[2], 0))
    print(result or "not found")
    sys.exit(0 if result else 1)
```

```bash
clang --target=x86_64-unknown-linux-gnu -g -gdwarf-4 -O0 -c lines.c -o lines4.o
clang --target=x86_64-unknown-linux-gnu -g -gdwarf-5 -O0 -c lines.c -o lines5.o
llvm-dwarfdump --debug-line lines5.o
python3 decode-line.py lines4.o 0
python3 decode-line.py lines5.o 0
python3 decode-line.py lines5.o 0x100
```

DWARF 5 오브젝트의 줄 표입니다.

```text
Address            Line   Column File   ISA Discriminator OpIndex Flags
------------------ ------ ------ ------ --- ------------- ------- -------------
0x0000000000000000      1      0      0   0             0       0  is_stmt
0x000000000000000a      2     18      0   0             0       0  is_stmt prologue_end
0x000000000000000d      2     23      0   0             0       0
0x0000000000000010      2      9      0   0             0       0
0x0000000000000013      3     12      0   0             0       0  is_stmt
0x0000000000000016      3      5      0   0             0       0  epilogue_begin
0x0000000000000018      3      5      0   0             0       0  end_sequence
```

스크립트는 두 파일 모두 `lines.c:1`을 출력하고 종료 코드 0이었습니다. DWARF 4 파일의 `file` 값 1과 DWARF 5 파일의 `file` 값 0이 같은 `lines.c`로 풀렸다는 뜻입니다. 시퀀스 밖 주소 0x100은 `not found`와 종료 코드 1이었습니다. 이 `sum`은 오브젝트의 첫 함수라서 상대 주소 0을 조회했습니다. 링크된 바이너리에서는 `nm`이나 `readelf -s`로 함수 주소를 먼저 구합니다.

## 정리

- `.debug_line`은 *(PC, file, line, ...)* 행을 만드는 *바이트코드 VM* 프로그램입니다.
- 레지스터를 갱신하며 `DW_LNS_copy`·special opcode·`end_sequence`로 한 행씩 냅니다.
- special opcode 한 바이트가 주소 증분·줄 증분·행 emit을 함께 합니다. `square.o`의 세 행이 각각 1바이트였습니다.
- `is_stmt`는 권장 breakpoint 위치이고, `prologue_end`가 없으면 GDB는 두 번째 줄 시작을 프롤로그 끝으로 씁니다.
- `discriminator`는 같은 줄의 블록을 구분하며, clang은 `-fdebug-info-for-profiling`에서, GCC는 기본으로 냈습니다.
- 인라인 체인은 줄 표가 아니라 `DW_TAG_inlined_subroutine`이 담고, `addr2line -i`가 둘을 합칩니다.
- 반환 주소로 조회하면 호출 다음 줄이 나오므로 호출 지점은 주소 − 1로 묻습니다.
- DWARF 5는 `.debug_line_str`과 MD5, 0번부터 쓰는 파일 표를 더했습니다.

## 다음 장 예고

Ch 4 — `.debug_loc` / `.debug_loclists`의 DWARF expression VM. 변수가 *어디 있는지*를 표현하는 또 다른 바이트코드 머신입니다.

## 관련 항목

- [Ch 2: DWARF 개관](/blog/tools/debugging/dwarf-elf/chapter02-dwarf-overview)
- [Ch 4: DWARF expression VM](/blog/tools/debugging/dwarf-elf/chapter04-debug-loc)
- [DWARF 5 § 6.2 (Line Number Information)](https://dwarfstd.org/doc/DWARF5.pdf)
- [`addr2line(1)`](https://sourceware.org/binutils/docs/binutils/addr2line.html)
- [Eli Bendersky — DWARF line number programs](https://eli.thegreenplace.net/2011/02/07/how-debuggers-work-part-3-debugging-information)
