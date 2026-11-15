---
title: "DWARF 디버그 정보 분해 — DIE 트리와 .debug_abbrev"
slug: "tools/debugging/dwarf-elf/chapter02-dwarf-overview"
date: 2026-05-23T09:02:00
description: "DWARF의 정체. DIE/abbrev 인코딩, 컴파일 유닛, TAG/AT/FORM 카탈로그."
tags: [dwarf, debug-info, elf]
series: "DWARF and ELF Internals"
seriesOrder: 2
draft: false
topics: ["tools", "tools/debugging"]
---

GDB가 `print x`라고 했을 때 `x`의 *타입*, *위치*, *어떤 소스 파일에 정의됐는지*를 어떻게 알까요. 답은 ELF 파일 안에 박힌 **DWARF**라는 디버그 정보 형식입니다. DWARF가 없으면 소스 타입·지역 변수 조회가 제한되지만, GDB의 레지스터·메모리·심볼·실행 제어 기능까지 사라지는 것은 아닙니다.

이 장은 DWARF의 정체에서 시작합니다 — DIE 트리, abbreviation 인코딩, 컴파일 유닛 구조, 그리고 TAG/AT/FORM 카탈로그. 이후 장들은 `.debug_line` VM, `.debug_loc` expression VM, CFI 등 각 섹션을 깊이 봅니다.

:::tldr
DWARF = ELF 안의 *디버그 정보 표준*. 압축된 DIE 트리로 컴파일 유닛·함수·변수·타입을 표현.
:::

## DWARF의 역사와 의의

[DWARF 5 표준 서문](https://dwarfstd.org/doc/DWARF5.pdf)은 DWARF 1의 1992년 공개 판과 DWARF 2의 1993년 검토 초안 등 발전 과정을 설명합니다. 이 장은 DWARF 5의 형식을 기준으로 하며 이전 형식과 다른 부분을 따로 표시합니다.

C, C++, Fortran, Ada, Rust, Go, Zig, Swift 등 거의 모든 시스템 언어가 DWARF에 출력합니다. *언어 중립*이 핵심 설계 의도.

Windows는 CodeView/PDB를 흔히 사용하고, macOS는 Mach-O 오브젝트의 DWARF를 dsymutil로 .dSYM에 모을 수 있습니다. ELF의 DWARF도 별도 debug 파일이나 .dwo로 분리할 수 있어 OS별 저장 위치 하나로 고정하지 않습니다.

## DWARF의 섹션들

```bash
readelf -S my_prog | grep debug
```

각 섹션의 역할.

| 섹션 | 내용 | DWARF 5 변화 |
|------|------|---------------|
| `.debug_info` | DIE 트리 — 메인 (이 장) | 그대로 |
| `.debug_abbrev` | 약어 테이블 (이 장) | 그대로 |
| `.debug_line` | PC ↔ (파일, 줄) — Ch 3 | 그대로 |
| `.debug_str` | 문자열 풀 | + `.debug_line_str` |
| `.debug_str_offsets` | 문자열 인덱스 | 신규 |
| `.debug_loc` → `.debug_loclists` | 변수 위치 — Ch 4 | 이름 변경 + 포맷 |
| `.debug_ranges` → `.debug_rnglists` | 주소 범위 | 동상 |
| `.debug_addr` | 주소 풀 | 신규 (split-DWARF용) |
| `.debug_frame` | 콜스택 unwind — Ch 5 | 그대로 |
| `.eh_frame` | 런타임 unwind 정보이며 항상 존재하는 것은 아닙니다. | DWARF debug 섹션과 저장 목적을 구분합니다. |
| `.debug_aranges` | PC → CU 빠른 인덱스 | 선택 |
| `.debug_names` | 빠른 심볼 검색 | 신규 (pubnames 대체) |
| `.debug_pubnames` / `_pubtypes` | 이름 조회 인덱스 | DWARF 5는 .debug_names를 사용합니다. 이전 파일에서 존재할 수 있습니다. |

이 장은 `.debug_info` + `.debug_abbrev` + `.debug_str` 세 개를 다룹니다 — 다른 섹션들이 모두 이 셋을 *참조*하므로 기초.

## DIE — Debugging Information Entry

DWARF의 기본 단위. 트리 구조로 *모든 것*을 표현.

![DWARF DIE 트리](/images/blog/tools/diagrams/dwarf-die-tree.svg)

```text
DW_TAG_compile_unit (main.cpp)
  DW_AT_name = "main.cpp"
  DW_AT_language = DW_LANG_C_plus_plus
  DW_AT_low_pc = 0x401000
  DW_AT_high_pc = 0x401200
  DW_AT_producer = "clang 17.0.0"

  DW_TAG_base_type [int]
    DW_AT_name = "int"
    DW_AT_byte_size = 4
│  └─ DW_AT_encoding = DW_ATE_signed
│
├─ DW_TAG_pointer_type [int*]
│  ├─ DW_AT_byte_size = 8
│  └─ DW_AT_type = ref(int)
│
├─ DW_TAG_class_type [MyClass]
│  ├─ DW_AT_name = "MyClass"
│  ├─ DW_AT_byte_size = 16
│  ├─ DW_TAG_member [x]
│  │  ├─ DW_AT_name = "x"
│  │  ├─ DW_AT_type = ref(int)
│  │  └─ DW_AT_data_member_location = 0
│  └─ DW_TAG_member [y]
│     ├─ DW_AT_name = "y"
│     ├─ DW_AT_type = ref(int)
│     └─ DW_AT_data_member_location = 4
│
└─ DW_TAG_subprogram [main]
   ├─ DW_AT_name = "main"
   ├─ DW_AT_low_pc = 0x401120
   ├─ DW_AT_high_pc = 0x4011e0
   ├─ DW_AT_type = ref(int)
   └─ DW_TAG_variable [obj]
      ├─ DW_AT_name = "obj"
      ├─ DW_AT_type = ref(MyClass)
      └─ DW_AT_location = DW_OP_fbreg(-16)
```

각 노드(DIE)가 세 가지 속성을 가짐.

1. **TAG** — 이 DIE가 무엇인지 (`DW_TAG_subprogram` = 함수, `DW_TAG_variable` = 변수, ...).
2. **AT (attributes)** — 이름/타입/주소 등의 속성.
3. **자식 DIE** (옵션).

## llvm-dwarfdump로 보기

```bash
$ llvm-dwarfdump --debug-info my_prog | head -50
my_prog:	file format elf64-x86-64

.debug_info contents:
0x00000000: Compile Unit: length = 0x000000d6, format = DWARF32, version = 0x0005,
            unit_type = DW_UT_compile, abbr_offset = 0x0000, addr_size = 0x08
            (next unit at 0x000000da)

0x0000000c: DW_TAG_compile_unit
              DW_AT_producer    ("clang version 17.0.0")
              DW_AT_language    (DW_LANG_C_plus_plus_14)
              DW_AT_name        ("main.cpp")
              DW_AT_comp_dir    ("/home/me/project")
              DW_AT_low_pc      (0x0000000000401120)
              DW_AT_high_pc    (0x0000000000401200)
              DW_AT_stmt_list   (0x00000000)

0x0000002a:   DW_TAG_base_type
                DW_AT_name      ("int")
                DW_AT_encoding  (DW_ATE_signed)
                DW_AT_byte_size (0x04)

0x00000031:   DW_TAG_class_type
                DW_AT_calling_convention (DW_CC_pass_by_value)
                DW_AT_name      ("MyClass")
                DW_AT_byte_size (0x10)

0x00000037:     DW_TAG_member
                  DW_AT_name    ("x")
                  DW_AT_type    (0x0000002a "int")
                  DW_AT_data_member_location (0x00)
```

왼쪽의 `0x0000000c` 같은 숫자가 *DIE의 offset*. `DW_AT_type = (0x0000002a)` 같은 참조는 *그 offset의 DIE*를 가리킴.

## 컴파일 유닛 (CU)

`.debug_info`는 *여러 컴파일 유닛*의 연속. 한 CU = 한 소스 파일 (보통 `.c` 또는 `.cpp` 하나).

CU 헤더.

```c
// DWARF 5
struct CU_Header {
    uint32_t  unit_length;        // 이후 데이터 길이
    uint16_t  version;            // 5
    uint8_t   unit_type;          // DW_UT_compile, DW_UT_partial, ...
    uint8_t   address_size;       // 4 또는 8
    uint32_t  debug_abbrev_offset; // .debug_abbrev로의 오프셋
    // unit_type에 맞는 추가 필드와 첫 DIE가 이어짐. 이 조각은 일반 DWARF32 compile unit의 개요
};
```

CU 안의 *모든 DIE의 abbrev*가 `debug_abbrev_offset`이 가리키는 약어 표를 공유.

DWARF 4까지는 `version=4, abbrev, addr_size`. DWARF 5에서 `unit_type` 추가 (skeleton CU 등 구분용).

### CU 종류 (DWARF 5)

```text
DW_UT_compile      일반
DW_UT_type         타입 유닛 (DWARF 5에서는 .debug_info)
DW_UT_partial      partial CU (include)
DW_UT_skeleton     split-DWARF의 ELF 측
DW_UT_split_compile  split-DWARF의 .dwo 측
DW_UT_split_type
```

분리 디버그 정보를 선택하면 skeleton과 split 유닛을 대응시킵니다. 일반 compile unit이 모두 이 쌍으로 바뀌는 것은 아닙니다 (6장).

## Abbreviation 인코딩

DIE 하나하나를 단순 표현하면 *수백 메가*. 같은 형태의 DIE가 수천 개 — `DW_TAG_member` + `DW_AT_name` + `DW_AT_type` + `DW_AT_data_member_location` 조합이 *수만 번* 반복.

해법: 약어 표 분리.

![Abbreviation 인코딩 — 같은 약어를 수만 번 공유](/images/blog/tools/diagrams/dwarf-abbrev-encoding.svg)

**.debug_abbrev:**


**Abbrev 1:**

- DW_TAG_compile_unit (children: yes)
- DW_AT_producer        DW_FORM_strx1
- DW_AT_language        DW_FORM_data1
- DW_AT_name            DW_FORM_strx1
- DW_AT_comp_dir        DW_FORM_strx1
- DW_AT_low_pc          DW_FORM_addrx
- DW_AT_high_pc         DW_FORM_data4
- DW_AT_stmt_list       DW_FORM_sec_offset

**Abbrev 2:**

- DW_TAG_base_type (children: no)
- DW_AT_name        DW_FORM_strx1
- DW_AT_encoding    DW_FORM_data1
- DW_AT_byte_size   DW_FORM_data1

**Abbrev 3:**

- DW_TAG_class_type (children: yes)
- DW_AT_calling_convention DW_FORM_data1
- DW_AT_name              DW_FORM_strx1
- DW_AT_byte_size         DW_FORM_data1

**Abbrev 4:**

- DW_TAG_member (children: no)
- DW_AT_name                  DW_FORM_strx1
- DW_AT_type                  DW_FORM_ref4
- DW_AT_data_member_location  DW_FORM_data1

`.debug_info` 안의 각 DIE는 *약어 번호* + *속성 값들의 raw 인코딩*만 가짐.

**.debug_info 개념 예시:**

아래 offset은 실제 바이트 인코딩 결과가 아닌 관계 설명용 라벨입니다. 정확한 배치는 뒤의 직접 확인 예제에서 도구로 읽습니다.

- 0x0c: [Abbrev 1] producer=0x12 language=0x04 name=0x45 comp_dir=0x10 ...
- 0x2a: [Abbrev 2] name=0x67 encoding=0x05 byte_size=0x04
- 0x31: [Abbrev 3] calling_conv=0x01 name=0x89 byte_size=0x10
- 0x37: [Abbrev 4] name=0xAB type=0x2a data_member_location=0x00
- 0x40: [Abbrev 4] name=0xCD type=0x2a data_member_location=0x04
- 0x49: [Abbrev 0]   ← null = 자식 끝

같은 약어를 *수천 번 재사용* → 압축비 매우 큼.

같은 abbrev에 매핑된 DIE의 *속성 순서가 정해져* 있어 추가 메타데이터(어떤 속성이 어떤 위치) 없이도 디코딩 가능.

### 0번 약어

각 CU의 abbrev 표 끝, 그리고 DIE의 자식 끝을 표시. 약어 0 = "더 이상 없음".

## TAG 카탈로그

거의 40여 개. 자주 보이는 것 모음.

### 구조

| TAG | 의미 |
|-----|------|
| `DW_TAG_compile_unit` | 컴파일 유닛 (소스 파일 하나) |
| `DW_TAG_partial_unit` | partial CU (header file) |
| `DW_TAG_module` | Ada/Fortran 모듈 |
| `DW_TAG_namespace` | C++ namespace |
| `DW_TAG_imported_declaration` | `using` |
| `DW_TAG_imported_module` | `using namespace` |

### 함수·블록

| TAG | 의미 |
|-----|------|
| `DW_TAG_subprogram` | 함수 |
| `DW_TAG_inlined_subroutine` | 인라인된 호출 |
| `DW_TAG_lexical_block` | `{ ... }` 블록 |
| `DW_TAG_label` | goto 라벨 |
| `DW_TAG_subroutine_type` | 함수 포인터 타입 |
| `DW_TAG_call_site` (DWARF 5) | 호출 지점 메타 |
| `DW_TAG_call_site_parameter` (DWARF 5) | 호출 인자 메타 |

### 변수·인자

| TAG | 의미 |
|-----|------|
| `DW_TAG_variable` | 지역/전역 변수 |
| `DW_TAG_formal_parameter` | 함수 인자 |
| `DW_TAG_unspecified_parameters` | `...` 가변 인자 |
| `DW_TAG_constant` | 컴파일타임 상수 |

### 타입

| TAG | 의미 |
|-----|------|
| `DW_TAG_base_type` | int, float, char 등 |
| `DW_TAG_pointer_type` | `T*` |
| `DW_TAG_reference_type` | `T&` |
| `DW_TAG_rvalue_reference_type` | `T&&` (C++11) |
| `DW_TAG_array_type` | `T[N]` |
| `DW_TAG_structure_type` | `struct` |
| `DW_TAG_class_type` | `class` |
| `DW_TAG_union_type` | `union` |
| `DW_TAG_enumeration_type` | `enum` |
| `DW_TAG_enumerator` | 열거자 (값) |
| `DW_TAG_typedef` | `typedef` |
| `DW_TAG_const_type` | `const T` |
| `DW_TAG_volatile_type` | `volatile T` |
| `DW_TAG_restrict_type` | `restrict T` |
| `DW_TAG_atomic_type` | `_Atomic T` |
| `DW_TAG_member` | struct/class 멤버 |
| `DW_TAG_inheritance` | C++ 상속 |
| `DW_TAG_template_type_parameter` | `<T>` |
| `DW_TAG_template_value_parameter` | `<int N>` |
| `DW_TAG_subrange_type` | 배열 차원 (Fortran 등) |
| `DW_TAG_set_type` | Pascal `set` |

C++ 특수.

| TAG | 의미 |
|-----|------|
| `DW_TAG_friend` | friend 선언 |
| `DW_TAG_ptr_to_member_type` | `int Class::*` |
| `DW_TAG_GNU_template_parameter_pack` | variadic template |

## AT (Attribute) 카탈로그

100여 개. 자주 보이는 것.

### 이름·식별

| AT | 의미 |
|----|------|
| `DW_AT_name` | 이름 (문자열) |
| `DW_AT_linkage_name` | C++ mangled name |
| `DW_AT_external` | 외부 가시 (extern) |

### 위치·범위

| AT | 의미 |
|----|------|
| `DW_AT_low_pc` | 함수/블록 시작 주소 |
| `DW_AT_high_pc` | address 클래스이면 끝 주소, constant 클래스이면 low_pc에 더할 길이입니다. FORM을 함께 봅니다. |
| `DW_AT_ranges` | 여러 범위 (`.debug_ranges`/`rnglists` 참조) |
| `DW_AT_entry_pc` | 진입점 (low_pc와 다를 수 있음) |
| `DW_AT_location` | 변수의 위치 표현 (Ch 4) |
| `DW_AT_data_member_location` | struct 멤버의 offset |
| `DW_AT_const_value` | 상수 값 |

### 타입

| AT | 의미 |
|----|------|
| `DW_AT_type` | 이 DIE의 타입 (다른 DIE 참조) |
| `DW_AT_byte_size` | 바이트 크기 |
| `DW_AT_bit_size` | 비트 필드 크기 |
| `DW_AT_bit_offset` | 비트 필드 offset |
| `DW_AT_encoding` | base type 인코딩 (signed, float, ...) |

### 소스 위치

| AT | 의미 |
|----|------|
| `DW_AT_decl_file` | 소스 파일 (line table 인덱스) |
| `DW_AT_decl_line` | 줄 번호 |
| `DW_AT_decl_column` | 컬럼 |
| `DW_AT_call_file` | 인라인 호출 파일 |
| `DW_AT_call_line` | 인라인 호출 줄 |
| `DW_AT_stmt_list` | `.debug_line` offset |

### 함수 특수

| AT | 의미 |
|----|------|
| `DW_AT_prototyped` | 프로토타입 있음 |
| `DW_AT_frame_base` | frame base 표현 (보통 CFA) |
| `DW_AT_return_addr` | return address 위치 |
| `DW_AT_calling_convention` | 호출 규약 |
| `DW_AT_noreturn` (DWARF 5) | abort 같은 함수 |
| `DW_AT_inline` | 인라인 종류 |

### C++ 특수

| AT | 의미 |
|----|------|
| `DW_AT_virtuality` | virtual 함수 |
| `DW_AT_vtable_elem_location` | vtable 위치 |
| `DW_AT_accessibility` | private/protected/public |
| `DW_AT_explicit` | explicit ctor |
| `DW_AT_object_pointer` | this 포인터 |

### 메타

| AT | 의미 |
|----|------|
| `DW_AT_producer` | 컴파일러 (예: "clang 17.0.0") |
| `DW_AT_language` | DW_LANG_C_plus_plus 등 |
| `DW_AT_comp_dir` | 컴파일 디렉터리 |
| `DW_AT_GNU_macros` | 매크로 정보 |

## FORM — 속성 값의 인코딩 형식

각 AT의 *값*이 어떻게 인코딩되는지를 FORM이 결정.

### 데이터

| FORM | 인코딩 |
|------|--------|
| `DW_FORM_data1` | 1바이트 |
| `DW_FORM_data2` | 2바이트 |
| `DW_FORM_data4` | 4바이트 |
| `DW_FORM_data8` | 8바이트 |
| `DW_FORM_data16` | 16바이트 |
| `DW_FORM_sdata` | LEB128 signed |
| `DW_FORM_udata` | LEB128 unsigned |
| `DW_FORM_implicit_const` | abbrev에 박힘 (DWARF 5) |

### 문자열

| FORM | 인코딩 |
|------|--------|
| `DW_FORM_string` | 인라인 NUL-terminated |
| `DW_FORM_strp` | .debug_str offset이며 DWARF32/64에 따라 4/8바이트입니다. |
| `DW_FORM_line_strp` | `.debug_line_str` offset (DWARF 5) |
| `DW_FORM_strx1..4` | `.debug_str_offsets` 인덱스 (DWARF 5) |

### 주소

| FORM | 인코딩 |
|------|--------|
| `DW_FORM_addr` | 절대 주소 (address_size) |
| `DW_FORM_addrx` | `.debug_addr` 인덱스 (DWARF 5, split-DWARF용) |
| `DW_FORM_sec_offset` | 다른 섹션 offset |

### DIE 참조

| FORM | 인코딩 |
|------|--------|
| `DW_FORM_ref1..8` | 해당 유닛 시작 기준 DIE offset이며 위치 계산 시 유닛의 섹션 offset을 더합니다. |
| `DW_FORM_ref_addr` | .debug_info 섹션 기준 DIE offset이며 같은 CU도 참조할 수 있습니다. |
| `DW_FORM_ref_sig8` | 8바이트 type signature입니다. type unit의 저장 섹션은 버전에 따라 다릅니다. |
| `DW_FORM_ref_sup4`/`ref_sup8` | supplementary obj 참조 (DWARF 5) |

### 표현식

| FORM | 인코딩 |
|------|--------|
| `DW_FORM_exprloc` | DWARF expression (block) |
| `DW_FORM_block`/`block1`/`block2`/`block4` | 원시 byte block |
| `DW_FORM_loclistx` | `.debug_loclists` 인덱스 (DWARF 5) |
| `DW_FORM_rnglistx` | `.debug_rnglists` 인덱스 (DWARF 5) |

### Flag

| FORM | 인코딩 |
|------|--------|
| `DW_FORM_flag` | 1바이트 0/1 |
| `DW_FORM_flag_present` | abbrev에 있으면 always 1 |

## LEB128 — 가변 길이 정수

DWARF는 *작은 정수를 짧게* 표현하려고 LEB128(Little Endian Base 128)을 광범위 사용.

인코딩은 값을 7비트 청크로 나눠 little-endian 순서로 늘어놓는 방식입니다. 각 바이트의 MSB가 continue 비트 역할을 합니다.

- 마지막 청크는 MSB=0.
- 나머지 청크는 MSB=1 (continue).

`624485`(`0b10011000011101100101`)를 인코딩하면 이렇게 됩니다.

| 단계 | 값 |
|------|-----|
| 7-bit 청크 (LE) | `1100101`, `0001110`, `0100110` |
| MSB를 붙인 바이트 | `11100101`, `10001110`, `00100110` |
| 16진수 | `0xE5`, `0x8E`, `0x26` |

작은 값(0-127)은 1바이트, 큰 값은 가변.

실제 파일을 파싱할 때는 버퍼 끝·최대 폭·잘린 입력을 확인해야 합니다. 아래 직접 확인 절에 경계 검사를 포함한 디코더를 둡니다.

`DW_FORM_udata`, `DW_FORM_sdata`, `.debug_line` 명령 인자 등 거의 모든 곳에서 등장. 작은 정수가 흔한 디버그 정보에 최적.

## 문자열 풀 — .debug_str

DIE의 `DW_FORM_strp` 값은 `.debug_str` 안의 NUL-terminated 문자열로의 offset.

**.debug_str:**

- 0x0000: "main.cpp\0"
- 0x0009: "int\0"
- 0x000d: "MyClass\0"
- 0x0015: "x\0"
- 0x0017: "y\0"
- 0x0019: "obj\0"
- ...

같은 문자열이 *여러 DIE*에서 공유 → 중복 제거. 큰 프로젝트에서 클래스명·함수명이 수백 번 반복되므로 효과 큼.

DWARF 5의 `.debug_str_offsets` + `DW_FORM_strx*`는 한 단계 더 — DIE 안에 *인덱스*만 두고, 인덱스 → `.debug_str_offsets` → `.debug_str` 두 단계 lookup. split-DWARF에서는 .dwo의 문자열/offset 섹션과 각 유닛의 base 규칙을 확인합니다. 항상 skeleton ELF의 문자열 풀을 참조한다고 가정하지 않습니다.

## ELF 클래스·주소 크기·DWARF32/64 구분

ELF에 담긴 DWARF의 endian은 컨테이너를 따르지만, 주소 크기는 CU의 address_size, 섹션 offset 폭은 DWARF32/64 형식을 확인합니다.

- ELF가 little-endian → DWARF도 LE.
- ELF64와 DWARF64는 다른 구분입니다. ELF64 파일에도 DWARF32가 흔히 들어갑니다.

다만 `unit_length`가 *0xFFFFFFFF*면 *DWARF64* 모드 — 길이가 8바이트. 일반적인 DWARF는 *DWARF32*(섹션 offset이 4바이트). DWARF64는 매우 큰 디버그 정보(4 GB 초과)에서.

## 자동 도구 — pyelftools

```python
from elftools.elf.elffile import ELFFile

with open('my_prog', 'rb') as f:
    elf = ELFFile(f)
    if not elf.has_dwarf_info():
        print("no dwarf info"); exit()

    dwarf = elf.get_dwarf_info()
    for cu in dwarf.iter_CUs():
        top = cu.get_top_DIE()
        print(f"CU: {top.attributes['DW_AT_name'].value.decode()}")
        for die in top.iter_children():
            if die.tag == 'DW_TAG_subprogram':
                name = die.attributes.get('DW_AT_name')
                low = die.attributes.get('DW_AT_low_pc')
                if name and low:
                    print(f"  fn {name.value.decode()} @ {low.value:#x}")
```

자체 분석 도구 (코드 사이즈 분석, 미사용 함수 검출, 심볼 그래프 등)를 만드는 출발점. Ch 6에서 더 자세히.

## 컴파일러 차이

같은 코드라도 GCC와 Clang의 DWARF 출력이 *조금씩* 다릅니다.

기본 DWARF 버전은 컴파일러 버전·타깃·드라이버 설정에 따라 달라집니다. 비교 시 -gdwarf-4 또는 -gdwarf-5를 명시하고 실제 CU 헤더를 확인합니다. aranges 생성, entry_value, LTO 보존도 대상 버전·최적화에 따라 관찰하며 근거 없는 공통 하한 버전이나 깊이 우열을 제시하지 않습니다.

## DWARF version 협상

ELF 안에는 *여러 컴파일 유닛*이 있고 각각이 *다른 DWARF version*일 수 있습니다 (외부 라이브러리가 다른 컴파일러로 빌드됐을 때). GDB는 각 CU를 *그 version*으로 파싱.

```bash
$ llvm-dwarfdump my_prog | grep "version ="
```

여러 version이 섞여 있으면 DWARF parser가 복잡해집니다 — 도구 호환성 문제의 원인이 되기도.

## 직접 확인 — DIE와 정수 인코딩

types.c는 x86-64 Linux ELF 오브젝트로만 생성하며 macOS에서 실행하지 않습니다. -gdwarf-5와 -gdwarf64 유무로 두 파일의 format을 비교하고, 구조체의 member 위치와 FORM을 덤프합니다.

```c title="types.c"
struct Pair { int left; int right; };
struct Pair pair = {1, 2};
int sum(struct Pair* value) { return value->left + value->right; }
```

```bash
clang --target=x86_64-unknown-linux-gnu -g -gdwarf-5 -O0 -c types.c -o types.o
llvm-dwarfdump --debug-info --show-form types.o
llvm-dwarfdump --verify types.o
clang --target=x86_64-unknown-linux-gnu -g -gdwarf-5 -gdwarf64 -O0 -c types.c -o types64.o
llvm-dwarfdump --debug-info types64.o
```

ULEB128 예제는 네이티브 C 프로그램으로 별도 실행합니다. 정상 값 624485와 UINT64_MAX를 확인하고 잘린 입력·10바이트 overflow를 거부합니다. 이는 전체 DWARF 파서가 아니라 unsigned 정수 디코더의 검증입니다.

```c title="uleb.c"
#include <assert.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>

bool decode(const uint8_t* bytes, size_t size, uint64_t* result) {
    uint64_t value = 0;
    for (size_t i = 0; i < size && i < 10; ++i) {
        uint8_t byte = bytes[i];
        if (i == 9 && (byte & 0xfe)) return false;
        value |= (uint64_t)(byte & 0x7f) << (i * 7);
        if (!(byte & 0x80)) { *result = value; return true; }
    }
    return false;
}
int main(void) {
    uint64_t value;
    const uint8_t known[] = {0xe5, 0x8e, 0x26};
    const uint8_t maximum[] = {255,255,255,255,255,255,255,255,255,1};
    const uint8_t overflow[] = {255,255,255,255,255,255,255,255,255,2};
    assert(decode(known, sizeof known, &value) && value == 624485);
    assert(decode(maximum, sizeof maximum, &value) && value == UINT64_MAX);
    assert(!decode(known, 1, &value));
    assert(!decode(overflow, sizeof overflow, &value));
    assert(!decode(known, 0, &value));
    puts("ULEB128 valid/truncated/overflow checks passed");
}
```

## 정리

- DWARF는 *DIE 트리* + *abbreviation* + *문자열 풀*의 조합.
- 한 컴파일 유닛 = 한 소스 파일.
- 약어가 같은 형태의 DIE를 *수만 번 공유* → 압축비 매우 큼.
- TAG 40여 개로 모든 언어 구조 표현.
- AT 100여 개로 각 속성.
- FORM이 속성 값의 인코딩 (data, string, address, reference, expression).
- LEB128이 가변 길이 정수 인코딩.
- `.debug_str`가 문자열 풀. DWARF 5는 `.debug_str_offsets` 한 단계 더.
- DWARF 5는 split-DWARF·`.debug_names`·`DW_OP_entry_value` 등 추가.
- llvm-dwarfdump / pyelftools가 검사·자체 도구의 표준.

## 다음 장 예고

Ch 3 — `.debug_line` 바이트코드 VM. 주소·줄의 차분을 opcode로 인코딩하고 실제 줄 테이블을 읽는 방법을 다룹니다.

## 관련 항목

- [Ch 1: ELF 포맷](/blog/tools/debugging/dwarf-elf/chapter01-elf-overview)
- [Ch 3: .debug_line 바이트코드 VM](/blog/tools/debugging/dwarf-elf/chapter03-debug-line)
- [GDB and LLDB Ch 12: DWARF 디버그 정보](/blog/tools/debugging/gdb-lldb/chapter12-dwarf) — 같은 포맷을 *디버거가 쓰는 쪽*에서. 이 시리즈는 포맷 자체를 분해합니다
- [DWARF 5 표준 PDF](https://dwarfstd.org/doc/DWARF5.pdf)
- [llvm-dwarfdump](https://llvm.org/docs/CommandGuide/llvm-dwarfdump.html)
- [pyelftools 문서](https://github.com/eliben/pyelftools)
- [Eli Bendersky — How debuggers work series](https://eli.thegreenplace.net/2011/01/23/how-debuggers-work-part-1) — DWARF 입문
