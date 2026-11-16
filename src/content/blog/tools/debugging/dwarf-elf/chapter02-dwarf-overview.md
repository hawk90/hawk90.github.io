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

[DWARF 5 표준](https://dwarfstd.org/doc/DWARF5.pdf)의 Foreword가 이력을 정리합니다. Unix International의 PLSIG가 SVR4 컴파일러·디버거의 형식에 맞춰 DWARF Version 1을 Revision 1.1.0(1992년 10월 6일)으로 냈고, 인코딩을 더 작게 바꾼 Version 2는 1993년 7월 27일 검토 초안(Revision 2.0.0)으로 나온 뒤 최종판 없이 단체가 해산했습니다. Version 3는 2005년 12월 20일에 나왔고, 이 장이 기준으로 삼는 DWARF 5는 2017년 2월 13일 판입니다. 이전 형식과 다른 부분은 따로 표시합니다.

표준은 특정 언어에 묶이지 않습니다. DWARF 5 Table 3.1의 언어 코드에는 C·C++·Fortran·Ada·Rust·Go·Swift·Haskell·OCaml이 함께 들어 있고, 이 장의 예제는 C와 C++ 두 가지로 충분합니다.

컨테이너도 ELF 하나가 아닙니다. Mach-O 오브젝트의 DWARF는 `dsymutil`이 `.dSYM` 번들로 모으고, Windows의 MSVC는 DWARF 대신 별도 형식인 CodeView/PDB를 씁니다. ELF 안에서도 DWARF를 별도 debug 파일이나 `.dwo`로 뺄 수 있는데, 이 분리는 6장에서 다룹니다.

## DWARF의 섹션들

아래 `main.cpp`를 Homebrew clang 23.1.5로 `--target=x86_64-unknown-linux-gnu -g -gdwarf-5 -O0 -c` 해서 만든 오브젝트의 debug 섹션 목록입니다(`-fdebug-prefix-map`으로 디렉터리를 `/src`로 바꿨습니다).

```cpp title="main.cpp"
class MyClass {
public:
    int x;
    int y;
};
int* last;
int main() {
    MyClass obj{1, 2};
    last = &obj.x;
    return obj.y;
}
```

```text
$ llvm-readelf -S main.o | grep debug
  [ 6] .debug_abbrev     PROGBITS        0000000000000000 000070 00007f 00      0   0  1
  [ 7] .debug_info       PROGBITS        0000000000000000 0000ef 00006e 00      0   0  1
  [ 8] .rela.debug_info  RELA            0000000000000000 000410 000060 18   I 22   7  8
  [ 9] .debug_str_offsets PROGBITS       0000000000000000 00015d 000030 00      0   0  1
  [10] .rela.debug_str_offsets RELA      0000000000000000 000470 0000f0 18   I 22   9  8
  [11] .debug_str        PROGBITS        0000000000000000 00018d 00004a 01  MS  0   0  1
  [12] .debug_addr       PROGBITS        0000000000000000 0001d7 000018 00      0   0  1
  [13] .rela.debug_addr  RELA            0000000000000000 000560 000030 18   I 22  12  8
  [18] .debug_line       PROGBITS        0000000000000000 000248 00006a 00      0   0  1
  [19] .rela.debug_line  RELA            0000000000000000 0005a8 000048 18   I 22  18  8
  [20] .debug_line_str   PROGBITS        0000000000000000 0002b2 00000e 01  MS  0   0  1
```

`.debug_str_offsets`·`.debug_addr`·`.debug_line_str`는 DWARF 5에서 생긴 섹션입니다. 같은 소스를 `-gdwarf-4`로 만들면 이 셋이 없고, 문자열은 `.debug_str`을 직접 가리키는 `DW_FORM_strp`로 바뀝니다. 각 섹션의 역할과 DWARF 5에서의 변화는 [DWARF 5 §1.4](https://dwarfstd.org/doc/DWARF5.pdf) "Changes from Version 4 to Version 5"를 따라 정리했습니다.

| 섹션 | 내용 | DWARF 5 변화 |
|------|------|---------------|
| `.debug_info` | DIE 트리 — 메인 (이 장) | `.debug_types`의 type unit도 여기로 이동 |
| `.debug_abbrev` | 약어 테이블 (이 장) | 그대로 |
| `.debug_line` | PC ↔ (파일, 줄) — Ch 3 | 헤더 형식 개편, MD5 추가 |
| `.debug_str` | 문자열 풀 | + `.debug_line_str` |
| `.debug_str_offsets` | 문자열 인덱스 | 신규 |
| `.debug_loc` → `.debug_loclists` | 변수 위치 — Ch 4 | 새 섹션으로 대체 |
| `.debug_ranges` → `.debug_rnglists` | 주소 범위 | 새 섹션으로 대체 |
| `.debug_addr` | 주소 풀 | 신규 |
| `.debug_frame` | 콜스택 unwind — Ch 5 | 그대로 |
| `.debug_aranges` | 주소 → CU 인덱스 | 그대로 |
| `.debug_names` | 이름 인덱스 | 신규, `.debug_pubnames`·`.debug_pubtypes` 대체 |
| `.debug_macro` | 매크로 정보 | 신규, `.debug_macinfo` 대체 |

런타임 unwind용 `.eh_frame`은 DWARF의 CFI 형식을 빌려 쓰지만 표준 DWARF 섹션 목록에는 없습니다. 위 오브젝트에도 `.eh_frame`이 따로 들어 있는데, 5장에서 둘을 비교합니다.

이 장은 `.debug_info`·`.debug_abbrev`·`.debug_str`(+ `.debug_str_offsets`)를 다룹니다. 다른 섹션들이 이 셋이 만든 DIE를 기준으로 연결되기 때문입니다.

## DIE — Debugging Information Entry

DWARF의 기본 단위는 DIE입니다. 컴파일 유닛·함수·변수·타입이 모두 DIE이고, DIE가 다른 DIE를 자식으로 품어 트리를 이룹니다. 도서관 분류 카드에 빗대면, 카드 한 장(DIE)마다 종류(TAG)와 항목 값(속성)이 적혀 있고 "이 책의 저자는 카드 0x4e 참조"처럼 다른 카드를 가리킵니다.

![DWARF DIE 트리](/images/blog/tools/diagrams/dwarf-die-tree.svg)

각 DIE는 세 가지로 이뤄집니다([DWARF 5 §2.1](https://dwarfstd.org/doc/DWARF5.pdf) "The Debugging Information Entry").

1. **TAG** — 이 DIE가 무엇인지 (`DW_TAG_subprogram` = 함수, `DW_TAG_variable` = 변수, ...).
2. **AT (attributes)** — 이름·타입·주소 같은 속성. 값의 인코딩은 FORM이 정합니다.
3. **자식 DIE** (있을 때만).

## llvm-dwarfdump로 보기

위 `main.o`의 `.debug_info` 전체를 `llvm-dwarfdump --debug-info main.o`로 펼친 결과입니다. `DW_AT_decl_file`·`DW_AT_decl_line`·`DW_AT_external` 줄, `main`의 `DW_AT_low_pc`/`DW_AT_high_pc`, 컴파일 유닛의 base 속성(`DW_AT_addr_base` 등)은 생략했습니다.

```text
0x00000000: Compile Unit: length = 0x0000006a, format = DWARF32, version = 0x0005, unit_type = DW_UT_compile, abbr_offset = 0x0000, addr_size = 0x08 (next unit at 0x0000006e)

0x0000000c: DW_TAG_compile_unit
              DW_AT_producer    ("Homebrew clang version 23.1.5")
              DW_AT_language    (DW_LANG_C_plus_plus_14)
              DW_AT_name        ("main.cpp")
              ...
              DW_AT_low_pc      (0x0000000000000000)
              DW_AT_high_pc     (0x0000000000000026)

0x00000023:   DW_TAG_subprogram
                DW_AT_frame_base        (DW_OP_reg6 RBP)
                DW_AT_name      ("main")
                DW_AT_type      (0x0000004e "int")
                ...
0x00000032:     DW_TAG_variable
                  DW_AT_location        (DW_OP_fbreg -12)
                  DW_AT_name    ("obj")
                  DW_AT_type    (0x00000052 "MyClass")
0x0000003d:     NULL

0x0000003e:   DW_TAG_variable
                DW_AT_name      ("last")
                DW_AT_type      (0x00000049 "int *")
                DW_AT_location  (DW_OP_addrx 0x1)
0x00000049:   DW_TAG_pointer_type
                DW_AT_type      (0x0000004e "int")
0x0000004e:   DW_TAG_base_type
                DW_AT_name      ("int")
                DW_AT_encoding  (DW_ATE_signed)
                DW_AT_byte_size (0x04)
0x00000052:   DW_TAG_class_type
                DW_AT_calling_convention        (DW_CC_pass_by_value)
                DW_AT_name      ("MyClass")
                DW_AT_byte_size (0x08)
0x00000058:     DW_TAG_member
                  DW_AT_name    ("x")
                  DW_AT_type    (0x0000004e "int")
                  DW_AT_data_member_location    (0x00)
                  DW_AT_accessibility   (DW_ACCESS_public)
0x00000062:     DW_TAG_member
                  DW_AT_name    ("y")
                  ...
                  DW_AT_data_member_location    (0x04)
0x0000006c:     NULL
0x0000006d:   NULL
```

왼쪽의 `0x0000000c` 같은 숫자가 DIE의 `.debug_info` 안 offset입니다. `DW_AT_type (0x0000004e "int")`는 offset 0x4e에 있는 `int` DIE를 가리키고, `NULL`은 형제 목록이 끝났다는 표시입니다. 이 clang은 `int *`의 `DW_TAG_pointer_type`에 `DW_AT_byte_size`를 붙이지 않았습니다. 이 CU의 포인터 크기는 헤더의 `addr_size = 0x08`과 같습니다.

## 컴파일 유닛 (CU)

`.debug_info`는 컴파일 유닛의 연속입니다. 보통 `.c`나 `.cpp` 하나가 한 CU가 되고, 링크하면 여러 오브젝트의 CU가 한 섹션에 이어 붙습니다. 각 CU는 헤더로 시작합니다. 아래는 [DWARF 5 §7.5.1.1](https://dwarfstd.org/doc/DWARF5.pdf) "Full and Partial Compilation Unit Headers"의 DWARF32 필드 순서입니다.

```c
// DWARF 5, DWARF32 형식
struct CU_Header {
    uint32_t  unit_length;         // 이후 데이터 길이
    uint16_t  version;             // 5
    uint8_t   unit_type;           // DW_UT_compile, DW_UT_partial, ...
    uint8_t   address_size;        // 4 또는 8
    uint32_t  debug_abbrev_offset; // .debug_abbrev로의 오프셋
    // skeleton·split·type unit은 여기에 필드가 더 붙는다
};
```

`main.o`의 첫 12바이트가 이 헤더입니다.

```text
$ llvm-objdump -s -j .debug_info main.o | head -3
Contents of section .debug_info:
 0000 6a000000 05000108 00000000 01002100  j.............!.
```

`6a000000`이 `unit_length` 0x6a, `0500`이 version 5, `01`이 `DW_UT_compile`, `08`이 address_size, `00000000`이 abbrev offset입니다. 첫 DIE는 그 뒤인 0x0c에서 시작하고, 0x0c의 `01`은 약어 번호 1입니다.

CU 안의 모든 DIE는 `debug_abbrev_offset`이 가리키는 약어 표 하나를 공유합니다. DWARF 4 헤더에는 `unit_type`이 없고 순서도 `version`, `debug_abbrev_offset`, `address_size`입니다. §1.4가 이 재배치를 비호환 변경으로 적어 둡니다. 같은 `main.cpp`를 `-gdwarf-4`로 만들면 헤더가 11바이트라 첫 DIE가 0x0b에서 시작합니다.

### CU 종류 (DWARF 5)

`unit_type` 값은 [DWARF 5 Table 7.2](https://dwarfstd.org/doc/DWARF5.pdf) "Unit header unit type encodings"에 있습니다.

| 이름 | 값 | 쓰임 |
|------|----|------|
| `DW_UT_compile` | 0x01 | 일반 컴파일 유닛 |
| `DW_UT_type` | 0x02 | 타입 유닛 (DWARF 4의 `.debug_types`가 `.debug_info`로 이동) |
| `DW_UT_partial` | 0x03 | 다른 유닛이 `DW_TAG_imported_unit`으로 가져오는 공유 조각. §3.1.1이 중복 제거 기법(Appendix E.1)용이라고 설명하며, dwz가 이 형태를 만듭니다 |
| `DW_UT_skeleton` | 0x04 | split DWARF에서 실행 파일 쪽에 남는 유닛 |
| `DW_UT_split_compile` | 0x05 | split DWARF의 `.dwo` 쪽 유닛 |
| `DW_UT_split_type` | 0x06 | `.dwo` 안의 타입 유닛 |

§3.1.1은 일반적인 컴파일에서는 `DW_TAG_compile_unit` 하나만 쓰이고 partial·type unit은 쓰이지 않는다고 적습니다. skeleton과 split 유닛도 `-gsplit-dwarf`를 줬을 때만 생깁니다(6장).

## Abbreviation 인코딩

DIE마다 "TAG는 무엇이고 속성은 이것과 이것, 각각 이 FORM"이라는 설명을 붙이면 같은 설명이 끝없이 반복됩니다. 구조체 멤버 DIE는 거의 모두 이름·타입·위치·선언 줄이라는 같은 모양을 갖기 때문입니다. DWARF는 이 모양을 `.debug_abbrev`에 한 번만 적고, DIE에는 모양 번호와 값만 남깁니다. 양식지 번호만 적고 칸 내용만 채우는 신청서와 같습니다.

![Abbreviation 인코딩 — 같은 약어를 수만 번 공유](/images/blog/tools/diagrams/dwarf-abbrev-encoding.svg)

`main.o`의 약어 표는 8개 항목이고 전체가 0x7f(127)바이트입니다. 앞의 [1]과 클래스·멤버에 해당하는 [6]~[8]을 보입니다.

```text
$ llvm-dwarfdump --debug-abbrev main.o
[1] DW_TAG_compile_unit	DW_CHILDREN_yes
	DW_AT_producer	DW_FORM_strx1
	DW_AT_language	DW_FORM_data2
	DW_AT_name	DW_FORM_strx1
	DW_AT_str_offsets_base	DW_FORM_sec_offset
	DW_AT_stmt_list	DW_FORM_sec_offset
	DW_AT_comp_dir	DW_FORM_strx1
	DW_AT_low_pc	DW_FORM_addrx
	DW_AT_high_pc	DW_FORM_data4
	DW_AT_addr_base	DW_FORM_sec_offset
...
[6] DW_TAG_base_type	DW_CHILDREN_no
	DW_AT_name	DW_FORM_strx1
	DW_AT_encoding	DW_FORM_data1
	DW_AT_byte_size	DW_FORM_data1

[7] DW_TAG_class_type	DW_CHILDREN_yes
	DW_AT_calling_convention	DW_FORM_data1
	DW_AT_name	DW_FORM_strx1
	DW_AT_byte_size	DW_FORM_data1
	DW_AT_decl_file	DW_FORM_data1
	DW_AT_decl_line	DW_FORM_data1

[8] DW_TAG_member	DW_CHILDREN_no
	DW_AT_name	DW_FORM_strx1
	DW_AT_type	DW_FORM_ref4
	DW_AT_decl_file	DW_FORM_data1
	DW_AT_decl_line	DW_FORM_data1
	DW_AT_data_member_location	DW_FORM_data1
	DW_AT_accessibility	DW_FORM_data1
```

`.debug_info` 안의 DIE는 약어 번호와 속성 값의 바이트만 갖습니다. offset 0x4e부터의 실제 바이트를 약어 표에 대어 읽으면 이렇습니다.

```text
$ llvm-objdump -s -j .debug_info main.o | tail -3
 0040 49000000 000602a1 01054e00 00000604  I.........N.....
 0050 05040705 09080001 08074e00 00000003  ..........N.....
 0060 00010808 4e000000 00040401 0000      ....N.........
```

| offset | 바이트 | 해석 |
|--------|--------|------|
| 0x4e | `06 04 05 04` | 약어 6(`base_type`), name = 문자열 인덱스 4(`"int"`), encoding = 0x05(`DW_ATE_signed`), byte_size = 4 |
| 0x52 | `07 05 09 08 00 01` | 약어 7(`class_type`), calling_convention = 5(`DW_CC_pass_by_value`), name = 인덱스 9(`"MyClass"`), byte_size = 8, decl_file = 0, decl_line = 1 |
| 0x58 | `08 07 4e000000 00 03 00 01` | 약어 8(`member`), name = 인덱스 7(`"x"`), type = ref4 0x4e, decl_file 0, decl_line 3, member_location 0, accessibility 1(public) |
| 0x62 | `08 08 4e000000 00 04 04 01` | 같은 약어 8, name = 인덱스 8(`"y"`), member_location 4 |
| 0x6c | `00` | 약어 0 = `MyClass`의 자식 끝 |
| 0x6d | `00` | CU의 자식 끝 |

멤버 `x`와 `y`는 약어 8을 함께 쓰므로 각각 10바이트로 끝납니다. 약어마다 속성 순서와 FORM이 정해져 있어서 디코더는 바이트에 이름표가 없어도 몇 바이트를 어떤 속성으로 읽을지 압니다. 이 공유가 큰 프로그램에서 얼마나 반복되는지는 아래 직접 확인 절에서 Debian의 `ls` 디버그 정보로 셉니다.

### 0번 약어

약어 번호 0은 두 곳에 쓰입니다. `.debug_abbrev`에서는 약어 표의 끝을, `.debug_info`에서는 형제 DIE 목록의 끝(dwarfdump의 `NULL`)을 뜻합니다. 위 표의 0x6c·0x6d가 그 예입니다.

## TAG 카탈로그

[DWARF 5 Table 7.3](https://dwarfstd.org/doc/DWARF5.pdf) "Tag encodings"에는 vendor 범위(`DW_TAG_lo_user`·`hi_user`)를 빼고 68개 태그가 있습니다. 실제 C/C++ 바이너리에서 자주 만나는 것을 용도별로 모았습니다.

### 구조

| TAG | 의미 |
|-----|------|
| `DW_TAG_compile_unit` | 컴파일 유닛 (소스 파일 하나) |
| `DW_TAG_partial_unit` | 여러 CU가 공유하는 조각 (dwz 출력, 6장) |
| `DW_TAG_module` | Fortran 90·Modula-2 모듈 (§3.2.1) |
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
| `DW_TAG_subrange_type` | 배열 한 차원의 범위. C 배열도 `DW_TAG_array_type` 밑에 이 자식을 둡니다 |
| `DW_TAG_set_type` | Pascal `set` |

C++ 특수.

| TAG | 의미 |
|-----|------|
| `DW_TAG_friend` | friend 선언 |
| `DW_TAG_ptr_to_member_type` | `int Class::*` |
| `DW_TAG_GNU_template_parameter_pack` | variadic template (GNU 확장, 표준 태그 아님) |

## AT (Attribute) 카탈로그

Table 7.5 "Attribute encodings"에는 vendor 범위와 `Reserved` 칸을 빼고 119개 속성 이름이 있습니다. 자주 보이는 것만 추립니다.

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
| `DW_AT_data_bit_offset` | 비트 필드의 시작 비트. DWARF 4까지의 `DW_AT_bit_offset`(0x0c)은 DWARF 5에서 `Reserved`로 바뀌었습니다 |
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
| `DW_AT_frame_base` | frame base 표현. 이 장의 clang `-O0` 출력은 `DW_OP_reg6 RBP`, GCC 14 출력은 `DW_OP_call_frame_cfa` |
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
| `DW_AT_producer` | 컴파일러 (예: `"Homebrew clang version 23.1.5"`) |
| `DW_AT_language` | DW_LANG_C_plus_plus 등 |
| `DW_AT_comp_dir` | 컴파일 디렉터리 |
| `DW_AT_macros` | `.debug_macro` offset (DWARF 5). DWARF 4 시절 GNU 확장은 `DW_AT_GNU_macros` |

## FORM — 속성 값의 인코딩 형식

각 AT의 *값*이 어떻게 인코딩되는지를 FORM이 결정.

### 데이터

| FORM | 인코딩 |
|------|--------|
| `DW_FORM_data1` | 1바이트 (`main.o`의 `decl_line`) |
| `DW_FORM_data2` | 2바이트 (`main.o`의 `DW_AT_language`) |
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
| `DW_FORM_addrx` | `.debug_addr` 인덱스 (DWARF 5; split이 아닌 `main.o`에도 쓰임) |
| `DW_FORM_sec_offset` | 다른 섹션 offset |

### DIE 참조

| FORM | 인코딩 |
|------|--------|
| `DW_FORM_ref1..8` | 해당 유닛 시작 기준 DIE offset이며 위치 계산 시 유닛의 섹션 offset을 더합니다. |
| `DW_FORM_ref_addr` | .debug_info 섹션 기준 DIE offset이며 같은 CU도 참조할 수 있습니다. |
| `DW_FORM_ref_sig8` | 8바이트 type signature. 대상 type unit은 DWARF 4에서는 `.debug_types`, DWARF 5에서는 `.debug_info`에 있습니다 |
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
| `DW_FORM_flag_present` | 값이 0바이트. abbrev에 있으면 참 (`main.o`의 `DW_AT_external`) |

## LEB128 — 가변 길이 정수

DWARF는 *작은 정수를 짧게* 표현하려고 LEB128(Little Endian Base 128)을 광범위 사용.

인코딩은 값을 7비트 청크로 나눠 little-endian 순서로 늘어놓는 방식입니다. 각 바이트의 MSB가 continue 비트 역할을 합니다.

- 마지막 청크는 MSB=0.
- 나머지 청크는 MSB=1 (continue).

[DWARF 5 §7.6](https://dwarfstd.org/doc/DWARF5.pdf) "Variable Length Data"의 정의입니다. `624485`(`0b10011000011101100101`)를 인코딩하면 이렇게 됩니다.

| 단계 | 값 |
|------|-----|
| 7-bit 청크 (LE) | `1100101`, `0001110`, `0100110` |
| MSB를 붙인 바이트 | `11100101`, `10001110`, `00100110` |
| 16진수 | `0xE5`, `0x8E`, `0x26` |

0~127은 1바이트, 128~16383은 2바이트로 늘어납니다(Table 7.7의 예: 127 → `0x7f`, 128 → `0x80 0x01`). 위 `main.o`의 약어 번호·속성 코드·FORM 코드는 모두 ULEB128이고 값이 127 이하라 1바이트씩입니다. `DW_FORM_udata`·`DW_FORM_sdata`, `.debug_line`의 명령 인자, CFI의 offset도 같은 인코딩입니다.

파일을 파싱할 때는 버퍼 끝, 64비트를 넘는 값, 잘린 입력을 거부해야 합니다. 아래 직접 확인 절에 이 세 경우를 검사하는 디코더를 둡니다.

## 문자열 풀 — .debug_str

DIE에 이름을 직접 넣으면 같은 문자열이 CU마다, 링크된 오브젝트마다 반복됩니다. 그래서 문자열은 `.debug_str`에 NUL로 끝나게 모아 두고 DIE는 위치만 가리킵니다. DWARF 4의 `DW_FORM_strp`는 `.debug_str` 안의 offset을 직접 담습니다. `.debug_str`이 `MS`(MERGE+STRINGS) 플래그를 달고 있어서 링커가 여러 오브젝트의 같은 문자열을 하나로 합칩니다.

DWARF 5의 `DW_FORM_strx*`는 한 단계를 더 둡니다. DIE에는 작은 인덱스만 두고, 인덱스 → `.debug_str_offsets` → `.debug_str` 순으로 찾습니다. `main.o`의 두 표입니다.

```text
$ llvm-dwarfdump --debug-str --debug-str-offsets main.o
.debug_str contents:
0x00000000: "Homebrew clang version 23.1.5"
0x0000001e: "main.cpp"
0x00000027: "/src"
...
0x0000003e: "x"
0x00000040: "y"
0x00000042: "MyClass"

.debug_str_offsets contents:
0x00000000: Contribution size = 44, Format = DWARF32, Version = 5
0x00000008: 00000000 "Homebrew clang version 23.1.5"
0x0000000c: 0000001e "main.cpp"
...
0x00000024: 0000003e "x"
0x00000028: 00000040 "y"
0x0000002c: 00000042 "MyClass"
```

멤버 `x`의 DIE는 `DW_FORM_strx1` 값 7을 가졌습니다. CU의 `DW_AT_str_offsets_base`가 0x8이므로 `0x8 + 7 × 4 = 0x24`의 항목을 읽으면 `.debug_str`의 0x3e, 곧 `"x"`입니다. 오브젝트 파일 단계에서는 재배치 대상이 `.debug_str_offsets` 표 하나에 모이고 DIE 안의 1바이트 인덱스는 재배치가 필요 없습니다. `readelf`로 보면 `.rela.debug_str_offsets`가 0xf0바이트(10개 항목)인 반면, 같은 소스의 DWARF 4 오브젝트는 `strp`마다 재배치가 붙어 `.rela.debug_info`가 0x168바이트였습니다(DWARF 5는 0x60). split DWARF에서는 `.dwo` 안에 `.debug_str_offsets.dwo`·`.debug_str.dwo`가 따로 있어 같은 단계를 `.dwo` 안에서 밟습니다(6장).

## ELF 클래스·주소 크기·DWARF32/64 구분

세 가지 크기 개념이 따로 움직입니다. 바이트 순서는 ELF 헤더의 `EI_DATA`를 따르고, 주소 크기는 CU 헤더의 `address_size`가 정하며, 섹션 offset의 폭은 DWARF32/DWARF64 형식이 정합니다. ELF64 파일에 DWARF32가 들어 있는 것이 보통이고, 이 장의 `main.o`도 ELF64 + DWARF32 + `addr_size = 0x08`입니다.

[DWARF 5 §7.4](https://dwarfstd.org/doc/DWARF5.pdf) "32-Bit and 64-Bit DWARF Formats"는 DWARF64의 initial length를 `0xffffffff` 4바이트 뒤에 8바이트 길이가 오는 12바이트 필드로 정의합니다. 같은 절은 컴파일러가 기본으로 64비트 형식을 쓰지 않을 것으로 보며, 링크된 오브젝트 하나의 DWARF 섹션이 4 GB를 넘는 드문 경우를 위한 형식이라고 설명합니다. 한 CU 안에서 두 형식을 섞을 수는 없지만, 한 실행 파일 안에서 CU마다 다른 형식은 허용됩니다.

`types.c`(아래 직접 확인 절)를 `-gdwarf64`로 만들면 첫 4바이트가 실제로 `ffffffff`입니다.

```text
$ llvm-dwarfdump --debug-info types64.o | sed -n 4p
0x00000000: Compile Unit: length = 0x0000000000000077, format = DWARF64, version = 0x0005, unit_type = DW_UT_compile, abbr_offset = 0x0000, addr_size = 0x08 (next unit at 0x00000083)
$ llvm-objdump -s -j .debug_info types64.o | sed -n 4p
 0000 ffffffff 77000000 00000000 05000108  ....w...........
```

같은 소스에서 `.debug_info`는 0x6b → 0x83바이트, `.debug_str_offsets`는 항목이 8바이트가 되면서 0x30 → 0x60바이트로 늘었습니다.

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

pyelftools 0.32로 `main.o`와 아래 `types.o`에 돌리면 `CU: main.cpp` / `fn main @ 0x0`, `CU: types.c` / `fn sum @ 0x0`이 나옵니다. 재배치 전 오브젝트라 주소는 0입니다. `DW_AT_name`이 `DW_FORM_strx1`이어도 pyelftools가 `.debug_str_offsets`를 따라가 문자열로 풀어 줍니다. 함수 크기·호출 관계를 뽑는 도구로 넓히는 방법은 6장에서 봅니다.

## 컴파일러 차이

같은 코드라도 컴파일러마다 DWARF의 모양이 다릅니다. Debian 13 게스트에서 `int sq(int v) { return v * v; }` 한 줄을 `-g`만 주고 두 컴파일러로 만들어 비교했습니다.

| 항목 | GCC 14.2.0 (Debian 게스트) | clang |
|------|------------|---------------------|
| 기본 CU 버전 (`-g`만) | 5 | 5 (Debian clang 19.1.7) |
| `.debug_aranges` | 생성 (0x30바이트) | 없음 (Debian clang 19.1.7) |
| `DW_AT_frame_base` | `-O0`·`-O2` 모두 `DW_OP_call_frame_cfa` | `-O0` `DW_OP_reg6 RBP`, `-O2` `DW_OP_reg7 RSP` (macOS clang 23.1.5, x86-64) |

GCC의 `DW_AT_producer`에는 `GNU C17 14.2.0 -mlittle-endian -mabi=lp64 -g -fasynchronous-unwind-tables`처럼 컴파일 옵션까지 들어갑니다. [DWARF 5 §2.5.1.3](https://dwarfstd.org/doc/DWARF5.pdf) "Stack Operations"는 `DW_OP_call_frame_cfa`의 근거를 이렇게 설명합니다. CFA를 레지스터 연산으로 다시 표현하면 함수 안에서 레지스터가 바뀔 때마다 location list가 필요하지만, CFI가 이미 그 변화를 담고 있으니 참조하는 편이 공간을 아낀다는 것입니다. 비교할 때는 `-gdwarf-4`/`-gdwarf-5`를 명시하고 실제 CU 헤더의 버전을 확인합니다.

## DWARF version 협상

CU마다 헤더에 버전이 있으므로 한 실행 파일 안에 여러 버전이 섞일 수 있습니다. 게스트에서 `sq`가 든 파일을 `-gdwarf-4`, `main`이 든 파일을 `-gdwarf-5`로 컴파일해 한 실행 파일로 링크했습니다.

```text
$ readelf --debug-dump=info mixed | grep -E "Compilation Unit|Version:"
  Compilation Unit @ offset 0:
   Version:       4
  Compilation Unit @ offset 0x64:
   Version:       5
$ gdb -q -batch -ex 'break sq' -ex run -ex 'info source' ./mixed
...
Breakpoint 1, sq (v=3) at v.c:1
...
Compiled with DWARF 4 debugging format.
```

GDB 16.3은 두 CU를 각자의 버전으로 읽고, `info source`가 현재 CU의 버전을 알려 줍니다. 버전이 섞이면 도구가 지원하는 가장 낮은 공통 버전이 아니라 CU 하나하나의 버전이 기준이 됩니다.

## 직접 확인 — DIE와 정수 인코딩

`types.c`는 macOS의 clang 23.1.5로 x86-64 Linux ELF 오브젝트를 만들어 파일만 분석합니다. `-gdwarf64` 유무로 두 파일의 형식을 비교하고, 구조체 멤버와 FORM을 덤프합니다.

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

`--verify`의 결과입니다.

```text
$ llvm-dwarfdump --verify types.o
Verifying types.o:	file format elf64-x86-64
Verifying .debug_abbrev...
Verifying .debug_info Unit Header Chain...
Verifying .debug_types Unit Header Chain...
Verifying non-dwo Units...
Verifying unit: 1 / 1, "types.c"
Verifying dwo Units...
Verifying .debug_line...
Verifying .debug_str_offsets...
No errors.
```

`--show-form`은 속성마다 FORM을 붙여 줍니다. `types.o`의 CU에서 `DW_AT_producer [DW_FORM_strx1]`, `DW_AT_language [DW_FORM_data2] (DW_LANG_C11)`, `DW_AT_high_pc [DW_FORM_data4] (0x00000017)`이 나왔습니다. `high_pc`가 constant 클래스라서 끝 주소가 아니라 길이 0x17입니다. DWARF32와 DWARF64의 크기 비교는 앞의 DWARF32/64 절에 있습니다.

약어 공유가 실제 프로그램에서 얼마나 반복되는지 보려고, Debian 13의 `/usr/bin/ls` 디버그 정보를 debuginfod로 받아 Debian LLVM 19.1.7의 `llvm-dwarfdump`로 셌습니다. 133개 CU에 DIE가 12294개, `.debug_abbrev`의 약어 항목이 1062개였습니다. 약어 하나를 평균 11.6개 DIE가 공유하는 셈입니다(이 파일은 dwz 처리가 된 상태라 공통 타입 일부는 별도 파일에 있습니다, 6장).

ULEB128 디코더는 macOS에서 네이티브로 컴파일해 실행했습니다. 정상 값 624485와 `UINT64_MAX`를 확인하고, 잘린 입력·64비트 초과·빈 입력을 거부합니다. 전체 DWARF 파서가 아니라 unsigned 정수 디코더 하나를 검증하는 코드입니다.

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

```text
$ cc -O0 -Wall uleb.c -o uleb && ./uleb
ULEB128 valid/truncated/overflow checks passed
```

## 정리

- DWARF는 *DIE 트리* + *abbreviation* + *문자열 풀*의 조합입니다.
- 보통 소스 파일 하나가 컴파일 유닛 하나이고, CU 헤더가 버전·주소 크기·약어 표 위치를 정합니다.
- 약어 표가 DIE의 모양을 한 번만 적고, DIE는 약어 번호와 값 바이트만 갖습니다. Debian `ls`에서 약어 하나를 평균 11.6개 DIE가 공유했습니다.
- DWARF 5 표준은 태그 68개(Table 7.3), 속성 119개(Table 7.5)를 정의합니다.
- FORM이 속성 값의 인코딩(data, string, address, reference, expression)을 정합니다.
- LEB128이 가변 길이 정수 인코딩이고, 작은 값은 1바이트입니다.
- `.debug_str`가 문자열 풀이고, DWARF 5는 `.debug_str_offsets` 인덱스를 한 단계 더 둡니다.
- DWARF64는 initial length가 `0xffffffff`로 시작하며, 4 GB를 넘는 섹션을 위한 형식입니다.
- llvm-dwarfdump·readelf로 읽고, pyelftools로 자체 도구를 만듭니다.

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
