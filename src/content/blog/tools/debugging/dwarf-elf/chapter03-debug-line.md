---
title: "DWARF .debug_line 분석 — Source-to-PC 매핑 바이트코드 VM"
date: 2026-05-23T09:03:00
description: "DWARF 줄 정보의 정체. 상태 머신, 표준/확장 opcode, file table, addr2line의 내부."
tags: [dwarf, debug-line, state-machine, addr2line]
series: "DWARF and ELF Internals"
seriesOrder: 3
draft: false
---

`addr2line 0x401234`가 어떻게 `main.cpp:42`라고 답할까요. 답은 `.debug_line` 섹션입니다. PC 주소와 (파일, 줄, 컬럼)의 매핑을 *바이트코드 가상 머신*으로 압축한 형태.

이 장은 그 VM의 정체를 다룹니다. 상태 머신 레지스터, 표준 opcode, 특수 opcode의 인코딩 트릭, 파일 테이블 구조, 그리고 `addr2line`이 안쪽에서 이 VM을 어떻게 실행하는지.

:::tldr
`.debug_line`은 *(PC, file, line, ...)* 행이 *수만 개*인 표. 이 표를 *바이트코드 시퀀스*로 압축해 저장하고, 디버거가 실행해 표를 재구성.
:::

## 왜 VM인가

`main.cpp` 한 파일이 수천 PC↔줄 매핑을 생성합니다. 단순 표로 저장하면 *수십 KB*. 하지만 *대부분의 연속 행은 작은 차분*만 다릅니다 (PC가 1-2 명령어 진행, 줄이 1-2 줄 변화). 이 패턴을 *작은 명령어*로 표현하면 1바이트로 한 행 추가 가능 — 압축비 10배 이상.

VM 모델은 1990년대 ANSI C standard committee가 본 그대로 PostScript·PDF의 상태 머신 인코딩 영향을 받았습니다.

## 상태 머신 레지스터

VM이 실행되면서 다음 레지스터를 갱신.

![.debug_line 바이트코드 VM — 레지스터·opcode·emit 흐름](/images/blog/tools/diagrams/dwarf-line-state-machine.svg)

| 레지스터 | 초기값 | 의미 |
|----------|--------|------|
| `address` | 0 | 현재 PC |
| `op_index` | 0 | VLIW의 instruction slot (대부분 0) |
| `file` | 1 | 현재 파일 인덱스 |
| `line` | 1 | 현재 줄 |
| `column` | 0 | 현재 컬럼 |
| `is_stmt` | header.default_is_stmt | "이 행이 문장 시작인가" |
| `basic_block` | false | basic block 시작 |
| `end_sequence` | false | 시퀀스 끝 |
| `prologue_end` | false | 함수 프롤로그 끝 |
| `epilogue_begin` | false | 함수 에필로그 시작 |
| `isa` | 0 | ISA mode (ARM/Thumb 같은) |
| `discriminator` | 0 | 같은 (file, line)의 구분자 |

`DW_LNS_copy` 명령이 *현재 레지스터 상태를 한 행으로* emit. 그 후 `basic_block`, `prologue_end`, `epilogue_begin`, `discriminator`가 reset.

## 헤더

각 컴파일 유닛에 한 `.debug_line` 프로그램. 헤더가 *VM 동작 파라미터*를 정의.

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

핵심 파라미터.

- `minimum_instruction_length` — *명령어 한 단위의 바이트*. ARM=2 (Thumb), x86=1.
- `maximum_operations_per_instruction` — VLIW (IA-64) 같은 곳에서. 일반 RISC/CISC는 1.
- `default_is_stmt` — `is_stmt` 초기값 (보통 1).
- `line_base` / `line_range` — 특수 opcode 인코딩에 사용 (아래).
- `opcode_base` — 표준 opcode 개수 + 1.

## File / Directory Table (DWARF 4)

**directories[]:**

- 0: "src"
- 1: "include"
- 2: "third_party"

**files[]:**

- 1: { name: "main.cpp", dir: 0, mtime: 0, size: 0 }
- 2: { name: "utils.h",  dir: 1, mtime: 0, size: 0 }
- 3: { name: "math.cpp", dir: 0, mtime: 0, size: 0 }

`file` 레지스터가 1부터 시작 (DWARF 4까지). `0`은 무효.

### DWARF 5 변화

DWARF 5는 *0번 인덱스도 유효* (CU 자체의 파일을 0번에 둠), 그리고 *entry format*이 유연. `DW_LNCT_path`, `DW_LNCT_directory_index`, `DW_LNCT_timestamp`, `DW_LNCT_size`, `DW_LNCT_MD5` 같은 *content type*을 정의해 임의 조합 가능.

**directory_entry_format:**

- DW_LNCT_path  DW_FORM_line_strp

**file_name_entry_format:**

- DW_LNCT_path             DW_FORM_line_strp
- DW_LNCT_directory_index  DW_FORM_data1
- DW_LNCT_MD5              DW_FORM_data16

MD5 hash가 있어 *디버거가 소스 파일의 변경을 검출* 가능. `list` 시 *현재 소스 파일이 빌드 시점과 다르다*를 경고할 수 있게.

## Opcode 세 가지

### 1. 표준 opcode (DW_LNS_*)

`opcode_base` 미만의 값. 각각이 *0개 이상의 LEB128 인자*를 가짐.

| Opcode | 인자 | 동작 |
|--------|------|------|
| `DW_LNS_copy` | - | 현재 레지스터로 한 행 emit, basic_block 등 reset |
| `DW_LNS_advance_pc` | uleb128 | `address += operand * min_inst_len` |
| `DW_LNS_advance_line` | sleb128 | `line += operand` |
| `DW_LNS_set_file` | uleb128 | `file = operand` |
| `DW_LNS_set_column` | uleb128 | `column = operand` |
| `DW_LNS_negate_stmt` | - | `is_stmt = !is_stmt` |
| `DW_LNS_set_basic_block` | - | `basic_block = true` |
| `DW_LNS_const_add_pc` | - | (255 - opcode_base) / line_range만큼 address 증가 |
| `DW_LNS_fixed_advance_pc` | uhalf | `address += operand`, op_index=0 |
| `DW_LNS_set_prologue_end` | - | prologue_end = true |
| `DW_LNS_set_epilogue_begin` | - | epilogue_begin = true |
| `DW_LNS_set_isa` | uleb128 | ISA mode (ARM/Thumb) |

### 2. 확장 opcode (DW_LNE_*)

`0x00` + LEB128 길이 + opcode + 인자. *드물게* 쓰이는 명령.

| Opcode | 인자 | 동작 |
|--------|------|------|
| `DW_LNE_end_sequence` | - | end_sequence=true, 한 행 emit, 머신 reset |
| `DW_LNE_set_address` | address | `address = operand`, op_index=0 |
| `DW_LNE_set_discriminator` | uleb128 | `discriminator = operand` |
| `DW_LNE_define_file` | (DWARF 4 deprecated) | 동적 파일 추가 |

`DW_LNE_set_address`가 *함수 시작 시* 절대 주소를 설정하는 데 사용. 이후 `DW_LNS_advance_pc`로 상대 증분.

### 3. 특수 opcode (Special opcode)

`opcode_base` 이상의 값. *한 바이트로* address 증분 + line 증분 + copy를 모두 수행. *압축의 핵심*.

```
adjusted_opcode = opcode - opcode_base
operation_advance = adjusted_opcode / line_range
line_increment    = line_base + (adjusted_opcode % line_range)

새 address = address + operation_advance * min_inst_len
새 line    = line + line_increment
copy

그 후 basic_block / prologue_end / epilogue_begin / discriminator reset
```

예: `opcode_base=13, line_base=-5, line_range=14, min_inst_len=1`인 헤더 — 한 바이트로 *(address 증분 0-17, line 증분 -5 ~ +8)*의 거의 모든 조합을 표현.

```
opcode 0x10 → adjusted = 3
              operation_advance = 3 / 14 = 0  → address += 0
              line_increment = -5 + (3 % 14) = -2  → line -= 2
              copy

opcode 0x18 → adjusted = 11
              operation_advance = 11 / 14 = 0  → address += 0
              line_increment = -5 + 11 = 6  → line += 6
              copy

opcode 0x35 → adjusted = 40
              operation_advance = 40 / 14 = 2  → address += 2
              line_increment = -5 + (40 % 14) = -5 + 12 = 7  → line += 7
              copy
```

1바이트가 *세 연산*. C 코드의 일반적 패턴 — *한 줄 코드가 평균 3-5 명령어*, 다음 줄 — 에 정확히 맞춰 설계됨.

## 실행 예 — 짧은 함수

C 소스:

```c
// main.cpp:1
int square(int x) {        // 1
    return x * x;          // 2
}                          // 3
```

컴파일러 출력 (x86-64, `-O0`).

```asm
0x401120 push %rbp            # prologue
0x401121 mov  %rsp, %rbp
0x401124 mov  %edi, -0x4(%rbp)
0x401127 mov  -0x4(%rbp), %eax
0x40112a imul -0x4(%rbp), %eax
0x40112e pop  %rbp            # epilogue
0x40112f ret
```

DWARF line program (의사 코드).

```
DW_LNE_set_address    0x401120
DW_LNS_advance_line   1        ; line = 2
DW_LNS_set_prologue_end
DW_LNS_copy                    ; emit (0x401120, line=2, prologue_end)
[Special opcode]               ; address += 7, line += 0, copy
                               ; emit (0x401127, line=2)
[Special opcode]               ; address += 7, line += 1, copy
                               ; emit (0x40112e, line=3)
DW_LNE_end_sequence
```

10개 매핑이 약 12바이트.

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

VM을 실행하면서 각 *emit*마다 target_pc와 비교. *target_pc 이상의 첫 번째 행 직전*이 답.

```
PC          file:line
0x401120    main.cpp:2
0x401127    main.cpp:2
0x40112e    main.cpp:3

target = 0x401125 → 0x401120 ≤ 0x401125 < 0x401127 → main.cpp:2
target = 0x40112d → main.cpp:2
target = 0x4011f0 → 다음 sequence
```

`.debug_aranges` 인덱스가 있으면 *첫 CU 검색*이 빠릅니다. 없으면 전체 CU 순회.

```bash
$ llvm-dwarfdump --debug-aranges my_prog | head -10
.debug_aranges contents:
Address Range Header: length = 0x0000002c, format = DWARF32, version = 0x0002
                     cu_offset = 0x00000000, addr_size = 0x08, seg_size = 0x00
[0x0000000000401120, 0x0000000000401200)
```

각 CU의 *주소 범위*. addr2line이 *그 범위만* line program 실행.

## 인라인 — DWARF 5의 길

인라인된 함수의 줄 정보는 *부모 함수*의 line program에 같이 들어갑니다. PC 한 점이 *여러 (file, line) 매핑*을 가질 수 있어 보이지만 — 실제로는 *가장 안쪽 인라인의 source*만 line program이 표시.

그렇다면 `(inlined by) foo at f.cpp:10` 같은 정보는? 그건 `.debug_info`의 `DW_TAG_inlined_subroutine`에서 옵니다 (Ch 2).

```bash
$ addr2line -e my_prog -f -i -p 0x401134
foo at f.cpp:10
 (inlined by) bar at g.cpp:30
 (inlined by) main at main.cpp:13
```

`-i`(inline)은 line program + DW_TAG_inlined_subroutine 조합으로 호출 체인 재구성.

## is_stmt — BP 가능 위치

`is_stmt = 1`인 행만 *문장 시작*. GDB의 줄 단위 BP는 `is_stmt`만 후보로 봅니다.

```c
int f() {
    return a + b;     // 이 줄에 BP → 어느 명령에 걸리나?
}
```

컴파일러는 *최적의 BP 위치*를 `is_stmt=1`로 표시. 보통은 *문장 시작 명령어*. 인라인이 많은 코드에서는 `is_stmt`가 적게 표시돼 "BP가 그 줄에 못 걸린다"가 됨.

`-Og`는 *더 많은 위치에 is_stmt=1*을 표시 — 디버깅이 쉬워지는 이유.

## Discriminator — 같은 줄의 구분자

C++ 한 줄에 *여러 호출*이 있을 때:

```cpp
int x = a() + b() + c();    // line 5
```

세 호출 모두 line 5이지만 *다른 명령어*. 각 호출 사이트의 `discriminator`를 다른 값으로 두면 GDB가 구분 가능.

```
PC          file:line:discriminator
0x401120    main.cpp:5:0     ← line 시작
0x401130    main.cpp:5:1     ← a() 호출 후
0x401135    main.cpp:5:2     ← b() 호출 후
0x40113a    main.cpp:5:3     ← c() 호출 후
```

`info line main.cpp:5`가 *세 후보*를 보여 줌. profiler/coverage 도구가 *호출 site*별 통계를 낼 수 있게 함.

## prologue_end / epilogue_begin

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

`break f`는 *prologue 전*이 아닌 *prologue_end 첫 명령*에 BP. 그래서 인자가 *이미 스택에 있는* 시점부터 디버깅 가능.

## .debug_line_str — DWARF 5

DWARF 4까지는 line program 안의 파일/디렉터리 이름이 *인라인 NUL-terminated*. DWARF 5는 `.debug_line_str` 풀로 분리해 *중복 제거*.

**.debug_line_str:**

- 0x00: "main.cpp\0"
- 0x09: "src\0"
- 0x0d: "include\0"

**line program:**

- directory[0] = strp(0x09)   ← "src"
- file[1] = { path: strp(0x00), dir: 0 }   ← "src/main.cpp"

큰 프로젝트에서 같은 디렉터리·파일 이름이 *수백 CU*에 반복되므로 효과 큼.

## 직접 디코딩 — pyelftools

```python
from elftools.elf.elffile import ELFFile

with open('my_prog', 'rb') as f:
    elf = ELFFile(f)
    dwarf = elf.get_dwarf_info()
    target = 0x401234

    for cu in dwarf.iter_CUs():
        lineprog = dwarf.line_program_for_CU(cu)
        prev = None
        for entry in lineprog.get_entries():
            if entry.state is None: continue
            s = entry.state
            if prev and prev.address <= target < s.address:
                file_idx = prev.file
                file_entry = lineprog['file_entry'][file_idx - 1]
                print(f"{file_entry.name.decode()}:{prev.line}")
                exit()
            prev = s
```

이 방식으로 자체 *crash log 분석 도구*를 작성하거나, *coverage*를 자체 측정.

## 다른 도구

```bash
# 기본 도구
$ addr2line -e my_prog 0x401234
main.cpp:42

# 함수 이름 포함
$ addr2line -e my_prog -f 0x401234
process_data
main.cpp:42

# 인라인 체인까지
$ addr2line -e my_prog -f -i -p 0x401234
process_data at main.cpp:42
 (inlined by) main at main.cpp:60

# 여러 주소 한 번에
$ addr2line -e my_prog 0x401120 0x401200 0x401300

# stdin에서
$ echo 0x401234 | addr2line -e my_prog

# raw line program 보기
$ llvm-dwarfdump --debug-line my_prog | less
$ readelf --debug-dump=decodedline my_prog | less
$ readelf --debug-dump=line my_prog | less    # raw opcode

# Python으로
$ python3 -c "from elftools.elf.elffile import ELFFile; ..."
```

## stack trace 후처리

crash log에 PC만 있고 심볼·줄 정보가 없을 때.

**crash log:**


**Backtrace:**

- #0 0x0000000000401234
- #1 0x000000000040122a
- #2 0x0000000000401180

```bash
$ for addr in 0x401234 0x40122a 0x401180; do
    echo -n "$addr → "
    addr2line -e my_prog -f -i -p $addr
done

0x401234 → process_data at main.cpp:42
 (inlined by) main at main.cpp:60
0x40122a → start_handler at handler.cpp:12
0x401180 → main at main.cpp:20
```

운영에서 *stripped 바이너리 + build-id 매칭된 debug 파일*로 같은 일을 합니다.

## 호환성 — `-g1` / line-tables-only

큰 프로젝트에서 *전체 DWARF*는 매우 큽니다. *line program*만 필요한 경우 (crash log 분석)에는.

```bash
$ clang -gline-tables-only -O2 ...
```

`.debug_info`, `.debug_loc`, `.debug_ranges`가 거의 비어 있고 `.debug_line`만. 크기는 *1/10 이하*. addr2line은 정상 동작.

`print x`는 *못 하지만* `bt`의 줄 번호는 나옵니다. 운영 빌드의 표준 옵션.

## DWARF 5의 변화 요약

- `.debug_line_str` 추가 → 문자열 풀 분리.
- File table 0번부터 유효.
- `DW_LNCT_*` content type → 유연한 file entry format.
- `DW_LNCT_MD5`로 소스 무결성 검사.

## 정리

- `.debug_line`은 *(PC, file, line, ...)* 행을 표현하는 *바이트코드 VM*.
- 상태 머신 레지스터를 갱신하며 `DW_LNS_copy`로 한 행씩 emit.
- 표준 opcode + 확장 opcode + 특수 opcode (한 바이트로 세 연산).
- 압축비가 매우 높음 — 수천 행이 수십~수백 바이트.
- `is_stmt`가 BP 가능 위치 표시 — `-Og`로 늘림.
- `discriminator`로 같은 줄의 호출 site 구분.
- `prologue_end`/`epilogue_begin`으로 함수 진입/종료 정밀 표시.
- addr2line이 VM을 실행하며 PC 검색.
- DWARF 5는 `.debug_line_str` + MD5로 한 단계 더 효율.

## 다음 장 예고

Ch 4 — `.debug_loc` / `.debug_loclists`의 DWARF expression VM. 변수가 *어디 있는지*를 표현하는 또 다른 바이트코드 머신.

## 관련 항목

- [Ch 2: DWARF 개관](/blog/tools/debugging/dwarf-elf/chapter02-dwarf-overview)
- [Ch 4: DWARF expression VM](/blog/tools/debugging/dwarf-elf/chapter04-debug-loc)
- [DWARF 5 § 6.2 (Line Number Information)](https://dwarfstd.org/doc/DWARF5.pdf)
- `addr2line(1)` man page
- [Eli Bendersky — DWARF line number programs](https://eli.thegreenplace.net/2011/02/07/how-debuggers-work-part-3-debugging-information)
