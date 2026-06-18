---
title: "DWARF 디버그 정보 — 디버거가 변수와 라인을 찾는 방식"
date: 2026-05-24T09:12:00
description: "DWARF 표준, DIE / abbrev / line / location, expression VM, CFI, split-DWARF."
tags: [gdb, lldb, DWARF, ELF, DebugInfo]
series: "GDB and LLDB"
seriesOrder: 12
draft: false
---

:::tip[Deep dive]
이 챕터는 빠른 참조입니다. 깊은 내부 메커니즘은 [DWARF and ELF Internals 시리즈](/blog/tools/debugging/dwarf-elf/chapter01-elf-overview)를 참고하세요 — ELF 구조, DIE 트리, .debug_line VM, expression VM, CFI, split-DWARF.
:::


GDB가 `print x`라고 했을 때 `x`의 *타입*, *위치(메모리 주소 또는 레지스터)*, *어떤 라이브러리·소스 파일에 정의됐는지*를 어떻게 알까요. 답은 ELF 파일 안에 박힌 **DWARF**라는 디버그 정보 형식입니다. 이 정보 없이는 GDB가 그저 어셈블리 디스어셈블러에 불과합니다.

이 장은 DWARF가 무엇을 표현하고, 왜 그렇게 크고, 어떻게 줄이며, 흔한 트러블 ("심볼이 없다", "value optimized out")을 어떻게 진단할지를 다룹니다. 평소 *블랙박스*로 두던 DWARF를 한 번 열어 보면 디버거의 행동이 훨씬 또렷해집니다.

## DWARF가 뭔가

DWARF(Debugging With Attributed Record Formats)는 1992년부터 ELF·Mach-O·COFF 등 거의 모든 ABI에서 *디버그 정보 표준*으로 쓰이고 있습니다. 현재 DWARF 5가 표준(2017). GCC/Clang의 `-g` 플래그가 만들어 내는 게 바로 이것.

설계 목표 셋.

1. **언어 중립** — C, C++, Fortran, Rust, Ada, Go, Zig 모두 같은 포맷에 매핑.
2. **컴파일러 친화** — 컴파일러가 출력하기 쉽고, 디버거가 *부분만* 읽을 수 있게 인덱스.
3. **압축 가능** — 약어 + 문자열 풀로 중복 제거. 결국 DWARF 자체가 *수십 MB*가 흔해 압축이 필수.

```bash
$ readelf -S my_prog | grep debug
[35] .debug_info       PROGBITS         00000000  0001234c
[36] .debug_abbrev     PROGBITS         00000000  00018765
[37] .debug_line       PROGBITS         00000000  0001b234
[38] .debug_str        PROGBITS         00000000  0001d432
[39] .debug_loc        PROGBITS         00000000  0001f987
[40] .debug_ranges     PROGBITS         00000000  00022345
[41] .debug_aranges    PROGBITS         00000000  00023145
[42] .debug_frame      PROGBITS         00000000  00023589
[43] .eh_frame         PROGBITS         00000000  00023b21
...
```

각 섹션이 다른 정보를 담습니다.

| 섹션 | 내용 | DWARF 5에서 |
|------|------|--------------|
| `.debug_info` | DIE 트리 — 컴파일 유닛·함수·변수·타입의 메인 표현 | 그대로 |
| `.debug_abbrev` | 약어 테이블 — `.debug_info`가 참조 | 그대로 |
| `.debug_line` | PC ↔ (파일, 줄) 매핑 | 그대로 |
| `.debug_str` | 문자열 풀 — DIE가 인덱스로 참조 | `+ .debug_line_str` |
| `.debug_loc` | 변수 위치 표현(스코프별) | → `.debug_loclists` |
| `.debug_ranges` | 함수·범위 주소 구간 | → `.debug_rnglists` |
| `.debug_frame` | 콜스택 해제 정보 | 그대로 |
| `.eh_frame` | 콜스택 해제 (C++ exception용, 항상 있음) | 그대로 |
| `.debug_aranges` | PC → 컴파일 유닛 빠른 인덱스 | (선택) |
| `.debug_pubnames` / `.debug_pubtypes` | 공개 심볼 인덱스 | 폐기 → `.debug_names` |
| `.debug_str_offsets` | 문자열 인덱스 (split-DWARF용) | DWARF 5 신규 |
| `.debug_addr` | 주소 인덱스 (split-DWARF) | DWARF 5 신규 |
| `.debug_names` | 빠른 심볼 검색 | DWARF 5 신규 |

## DIE — Debugging Information Entry

`.debug_info`의 기본 단위는 *DIE*(다이). 트리 구조로 컴파일 유닛(파일 하나) → 함수 → 변수 → 타입을 표현합니다.

```text
DW_TAG_compile_unit
├─ DW_AT_name = "main.c"
├─ DW_AT_low_pc = 0x401000
├─ DW_AT_high_pc = 0x401200
├─ DW_AT_producer = "GCC 13.2.0"
├─ DW_AT_language = DW_LANG_C99
├─ DW_AT_stmt_list = offset_to_debug_line
├─ DW_TAG_base_type [<0x4e>]
│  ├─ DW_AT_name = "int"
│  ├─ DW_AT_byte_size = 4
│  └─ DW_AT_encoding = DW_ATE_signed
├─ DW_TAG_subprogram
│  ├─ DW_AT_name = "main"
│  ├─ DW_AT_low_pc = 0x401120
│  ├─ DW_AT_high_pc = 0x401200
│  ├─ DW_AT_external = true
│  ├─ DW_AT_type = ref(<0x4e>)
│  └─ DW_TAG_variable
│     ├─ DW_AT_name = "argc"
│     ├─ DW_AT_type = ref(<0x4e>)
│     └─ DW_AT_location = DW_OP_fbreg(-4)
```

읽으려면 `readelf --debug-dump=info` 또는 `llvm-dwarfdump --debug-info`.

```bash
$ llvm-dwarfdump --debug-info my_prog | head -50
0x0000000c: DW_TAG_compile_unit
              DW_AT_producer    ("clang version 17.0.0")
              DW_AT_language    (DW_LANG_C_plus_plus)
              DW_AT_name        ("main.cpp")
              DW_AT_low_pc      (0x0000000000401120)
              DW_AT_high_pc     (0x0000000000401200)

0x0000002a:   DW_TAG_subprogram
                DW_AT_low_pc    (0x0000000000401120)
                DW_AT_name      ("main")
                DW_AT_type      (0x000000a3 "int")
                DW_AT_external  (true)
```

### TAG 카탈로그

| TAG | 의미 |
|-----|------|
| `DW_TAG_compile_unit` | 컴파일 유닛 (소스 파일 하나) |
| `DW_TAG_subprogram` | 함수 |
| `DW_TAG_inlined_subroutine` | 인라인된 함수 호출 |
| `DW_TAG_lexical_block` | `{ ... }` 블록 |
| `DW_TAG_variable` | 전역/지역 변수 |
| `DW_TAG_formal_parameter` | 함수 인자 |
| `DW_TAG_base_type` | int, float 등 기본 타입 |
| `DW_TAG_pointer_type` | T* |
| `DW_TAG_array_type` | T[N] |
| `DW_TAG_structure_type` | struct |
| `DW_TAG_class_type` | C++ class |
| `DW_TAG_member` | struct 멤버 |
| `DW_TAG_typedef` | typedef alias |
| `DW_TAG_enumeration_type` | enum |
| `DW_TAG_namespace` | C++ namespace |
| `DW_TAG_template_type_parameter` | template `<T>` |
| `DW_TAG_const_type` / `volatile_type` / `restrict_type` | qualifier |
| `DW_TAG_imported_declaration` | `using` |

40여 개의 TAG로 거의 모든 언어 구조를 표현합니다. 새 언어를 위해 vendor-specific TAG도 추가 가능.

### Abbreviation 인코딩

`.debug_info`에서 각 DIE는 *약어 코드* + *속성 값 나열*입니다. 약어 코드가 어떤 속성이 어떤 순서·형식으로 따라오는지 `.debug_abbrev`에서 정의.

**.debug_abbrev:**


**Abbrev 1:**

- DW_TAG_compile_unit (children: yes)
- DW_AT_name       DW_FORM_strx1
- DW_AT_low_pc     DW_FORM_addr
- DW_AT_high_pc    DW_FORM_data4
- ...

같은 TAG/속성 조합의 DIE 수천 개가 한 약어를 공유합니다. 결과적으로 *압축비가 매우 높음*.

DWARF 5의 새 `DW_FORM_strx*` / `DW_FORM_addrx*`는 인덱스 형식. 문자열·주소는 별도 풀에 두고 DIE에는 인덱스만 — split-DWARF와 dwz 효율을 위한 설계.

## .debug_line — 어느 PC가 어느 줄인가

GDB가 `0x401234`에서 정지했을 때 *어느 소스 파일의 몇 번째 줄*인지 답하는 게 이 섹션입니다.

```bash
$ llvm-dwarfdump --debug-line my_prog | head -20
debug_line[0x00000000]
Address            Line   Column File   ISA  Discriminator OpIndex Flags
------------------ ------ ------ ------ ---- ------------- ------- -------
0x0000000000401120     12      0      1   0             0       0  is_stmt
0x0000000000401124     13      5      1   0             0       0  is_stmt
0x0000000000401131     14      9      1   0             0       0  is_stmt
0x000000000040113e     16      1      1   0             0       0  is_stmt end_sequence
```

내부적으로는 *바이트코드 머신*입니다. 단순 표가 아니라 작은 가상 머신의 명령어 시퀀스를 실행하면 위 표가 *재구성*됩니다.

```text
DW_LNS_advance_pc(4)
DW_LNS_advance_line(1)
DW_LNS_copy                  # 한 행 출력

DW_LNS_advance_pc(13)
DW_LNS_advance_line(1)
DW_LNS_copy

DW_LNS_const_add_pc          # 표준 증분
DW_LNS_copy

DW_LNS_advance_pc(15)
DW_LNS_advance_line(2)
DW_LNS_copy

DW_LNE_end_sequence
```

레지스터: PC, line, column, file, is_stmt, basic_block, end_sequence, prologue_end, epilogue_begin, ISA. 각 명령이 일부 레지스터를 갱신하고 `DW_LNS_copy`가 *그 시점*의 레지스터 값을 한 행으로 emit합니다.

압축비가 매우 높아 *수천 줄의 매핑*이 수십 바이트로 표현됩니다.

```bash
$ addr2line -e my_prog 0x401134
main.cpp:13

$ addr2line -e my_prog -f -i 0x401134
main
main.cpp:13

# -i는 인라인 호출 체인까지
$ addr2line -e my_prog -f -i -p 0x401134
foo at f.cpp:10 (inlined by) bar at g.cpp:30 (inlined by) main at main.cpp:13
```

크래시 로그의 주소를 소스로 되돌리는 거의 모든 도구가 안쪽에서 `.debug_line`을 본다고 보면 됩니다.

### is_stmt — "이 줄에 BP를 걸 수 있나"

`is_stmt = 1`인 행만 *문장 시작*. GDB의 줄 단위 BP는 `is_stmt`만 후보로 봅니다. `-O2`의 인라인된 코드는 `is_stmt`가 적게 표시돼 BP가 "한 줄 건너뛴" 곳에 걸리는 일이 흔합니다. `-Og`로 늘어남.

### 인라인된 호출의 표현

```text
DW_TAG_subprogram (out-of-line) [foo]
DW_TAG_subprogram [bar]
├─ DW_TAG_inlined_subroutine
│  ├─ DW_AT_abstract_origin = ref(foo)
│  ├─ DW_AT_low_pc = 0x401130
│  ├─ DW_AT_high_pc = 0x401140
│  ├─ DW_AT_call_file = "g.cpp"
│  └─ DW_AT_call_line = 30
```

GDB가 `bt`에서 `foo (inlined by bar at g.cpp:30)`을 출력하는 근거가 `DW_AT_call_file/line`. *abstract origin*은 inline 안 된 원본 정의를 가리킵니다. 콜스택의 의미적 깊이가 PC 한 점에서 *여러* 프레임으로 펼쳐지는 이유.

## .debug_loc — 변수 위치

같은 변수도 *코드 위치마다 어디 있는지* 다릅니다. 함수 입구에서는 `%rdi` 레지스터, 본문에서는 `[%rbp-4]` 스택, 어떤 구간에서는 *없어짐*. 이 모든 걸 표현하는 게 *location list*.

```text
DW_AT_location =
    [0x401120, 0x40112f): DW_OP_reg5 (rdi)
    [0x40112f, 0x40115a): DW_OP_fbreg -4
    [0x40115a, 0x401200): <removed by optimization>
```

`<removed>` 구간에서 GDB가 변수 출력을 요청받으면 `<optimized out>`을 답합니다. 그래서 `-Og`(디버깅 친화 최적화)가 `<optimized out>`을 줄여 줍니다 — 더 많은 구간에서 location을 보존.

### DWARF expression VM

`DW_OP_*`는 *스택 머신*의 명령어들. 단순 `reg5`부터 복잡한 *계산식*까지 표현 가능.

| op | 의미 |
|----|------|
| `DW_OP_reg<n>` | 값이 `regn`에 있음 |
| `DW_OP_breg<n> <off>` | `regn + off` 주소에 있음 |
| `DW_OP_fbreg <off>` | frame base + off |
| `DW_OP_addr <addr>` | 절대 주소 (전역 변수) |
| `DW_OP_const<n>u/s` | 상수 push |
| `DW_OP_plus`, `_minus`, `_mul` | 산술 |
| `DW_OP_deref` | 스택 top 주소를 dereference |
| `DW_OP_piece <n>` | 값이 *조각*나 있음 (n바이트) |
| `DW_OP_stack_value` | 스택 top 자체가 값 (메모리 아님) |
| `DW_OP_entry_value` | 함수 진입 시의 표현식 값 |
| `DW_OP_implicit_value` | 컴파일 시 결정된 리터럴 값 |

예: 두 레지스터에 *조각* 난 64-bit 변수.

```text
DW_OP_reg3 DW_OP_piece 4 DW_OP_reg5 DW_OP_piece 4
```

low 4바이트는 r3, high 4바이트는 r5. ARM 같은 32-bit 아키텍처에서 64-bit 변수가 자주 이렇게 표현됩니다.

또 다른 예: optimization이 변수를 없앴지만 *값이 컴파일 시 알려진* 경우.

```text
DW_OP_constu 42 DW_OP_stack_value
```

GDB는 `print x`에 `42`로 답합니다. 메모리 어디에도 없지만 값은 보존.

`DW_OP_entry_value`(DWARF 5)는 *함수 진입 시의 인자 값*을 표현. 함수 본문 중간에 인자 레지스터가 다른 용도로 재사용돼도 *원래 들어온 값*을 복원할 수 있습니다.

## 콜스택 해제 — .debug_frame / .eh_frame

`bt`가 어떻게 SP·BP를 거꾸로 풀어 가는지의 답이 여기. 각 함수의 *프롤로그/에필로그*를 *Call Frame Information*(CFI)으로 기술합니다.

- `.eh_frame` — C++ 예외 처리에도 쓰이므로 *항상 들어 있음*(stripped 빌드에도).
- `.debug_frame` — 디버깅 전용, `-g`로만 들어감.

### CFI 모델

각 PC 위치에서.

```
CFA (Canonical Frame Address) = rsp + offset
또는 = rbp + offset
또는 = 다른 표현식

각 레지스터:
  rsp = CFA
  rip = *(CFA - 8)   ; return address
  rbp = *(CFA - 16)  ; saved by prologue
  rbx = *(CFA - 24)
  r12 = *(CFA - 32)
  ...
```

이 정보가 PC 변화에 따라 바뀝니다(프롤로그 진행 중 rsp가 변하면 CFA 계산식도 변함). CFI는 *바이트코드*로 PC별 차이를 표현합니다 — `DW_CFA_advance_loc`, `DW_CFA_def_cfa`, `DW_CFA_offset` 등.

```bash
$ llvm-dwarfdump --debug-frame my_prog | head -30
0x00000018: FDE
            length: 0x0000001c
            CIE_pointer: 0x00000000
            start_addr: 0x0000000000401130 main
            range_size: 0x0000000000000050

  0x401130: CFA=rsp+8: rip=[CFA-8]
  0x401131: CFA=rsp+16: rbp=[CFA-16], rip=[CFA-8]
  0x401134: CFA=rbp+16: rbp=[CFA-16], rip=[CFA-8]
  0x40117e: CFA=rsp+8: rip=[CFA-8]
```

각 PC에서 CFA(현재 프레임 시작)와 saved register 위치가 정확히 정의됩니다. `-fomit-frame-pointer`로 BP 레지스터가 사라져도 GDB가 콜스택을 풀 수 있는 이유가 이 CFI 덕입니다.

다만 정밀도는 BP 보유 시보다 떨어집니다 — 컴파일러가 CFI를 *모든 PC*에 대해 정확히 출력하지는 않습니다(특히 inline asm, naked function, signal handler). 이게 Ch 1에서 `-fno-omit-frame-pointer`를 권한 이유.

### CIE / FDE 구조

- **CIE** (Common Information Entry) — 같은 호출 규약을 공유하는 함수들의 공통 정보. 보통 ABI별 한 개.
- **FDE** (Frame Description Entry) — 함수 하나당 한 개. CIE를 가리키고 함수의 PC 범위 + 차분 CFI 명령을 담음.

코드 1MB 프로그램의 `.eh_frame`이 100KB 가까이 가는 건 FDE가 함수마다 하나씩 있기 때문입니다.

### libunwind와 .eh_frame_hdr

`.eh_frame_hdr` 섹션은 *FDE 빠른 검색 인덱스*. PC가 주어졌을 때 어느 FDE를 봐야 할지 이진 탐색으로 결정. libunwind와 backtrace_symbols가 이 인덱스를 봅니다.

```bash
$ readelf -SW my_prog | grep eh_frame
[19] .eh_frame_hdr     PROGBITS         00000000
[20] .eh_frame         PROGBITS         00000000
```

## 크기와 골칫거리

DWARF는 *큽니다*. C++ 템플릿이 많은 코드는 디버그 정보가 본 코드의 5~10배가 흔합니다.

```bash
$ size -A my_prog | grep debug
.debug_info      52431892   0
.debug_abbrev      234123   0
.debug_line      18937451   0
.debug_str       28453122   0
.debug_loc       45129812   0
```

빌드 시간·디스크·링크 시간 모두 증가. 해법 세 가지.

### 1. -gsplit-dwarf / split-DWARF

DWARF를 `.o`에 두지 않고 *별도 `.dwo` 파일*로 분리. 링크 시 본 ELF는 가벼워지고, 디버거가 필요할 때만 `.dwo`를 열어 봅니다.

```bash
$ clang++ -g -gsplit-dwarf -c foo.cpp     # foo.o + foo.dwo
$ clang++ -g -gsplit-dwarf foo.o -o prog  # prog.dwo도 자동 검색
```

큰 프로젝트(LLVM, Chromium)의 표준. 빌드 시간·메모리가 크게 줄어듭니다.

ELF 안에 남는 건 *skeleton CU* — DIE 트리는 `.dwo`에 두고, ELF는 그 위치만 가리킴.

**ELF .debug_info:**

- DW_TAG_skeleton_unit
- ├─ DW_AT_dwo_name = "foo.dwo"
- ├─ DW_AT_addr_base = ...
- ├─ DW_AT_str_offsets_base = ...
- └─ (no children — 본체는 dwo에)

배포 시 `.dwo` 파일들을 `dwp` 도구로 단일 `dwp` 패키지로 묶을 수도 있음.

### 2. dwz — 디덥

[dwz](https://sourceware.org/dwz/) 도구가 중복 DIE를 제거합니다. 대규모 C++ 코드베이스에서 같은 STL 인스턴스화가 수십 번 반복되는 걸 한 번으로 합쳐 *20-40%* 크기 감소.

```bash
$ dwz -m common.debug a.out b.out c.out
```

배포판 패키지 빌드 시 거의 표준으로 적용됩니다.

### 3. -g1 / -gline-tables-only

전체 디버그 정보는 필요 없고 *콜스택과 줄 정보*만 원할 때. 크래시 후처리 용도.

```bash
$ clang -gline-tables-only -O2 ...   # .debug_line만
```

크기는 1/10 수준. `print var`은 못 하지만 `bt` 줄 번호는 나옵니다.

## 별도 debuginfo 파일

배포 바이너리는 strip하고 debuginfo를 따로 보관하는 게 표준.

```bash
$ objcopy --only-keep-debug a.out a.debug
$ strip --strip-debug a.out
$ objcopy --add-gnu-debuglink=a.debug a.out
```

GDB가 `a.out`을 열 때 `a.debug`를 같이 찾습니다. 또는 *build-id*로 자동 매칭.

```bash
$ readelf -n a.out | grep "Build ID"
    Build ID: 8d3a91f0e5...

$ ls /usr/lib/debug/.build-id/8d/3a91f0e5...
```

배포판들은 `/usr/lib/debug/.build-id/<XX>/<YY...>` 디렉터리에 별도 패키지(`libfoo-debug`)로 debuginfo를 둡니다. core dump의 build-id로 자동 다운로드하는 `debuginfod`(Fedora 등) 서비스도 있습니다.

```bash
$ DEBUGINFOD_URLS="https://debuginfod.fedoraproject.org/" gdb /usr/bin/foo
# stripped 바이너리지만 디버그 심볼이 네트워크로 자동 다운로드됨
```

`debuginfod`는 HTTP 기반 + Cookie/Range 지원으로 *부분 다운로드*가 가능. 첫 콜스택에는 일부만, 사용자가 `print var`로 깊이 들어가면 그때 더 받습니다. 큰 debuginfo 다운로드의 전체 지연을 분산.

## 흔한 문제 진단

### "No symbol table" / 함수가 `??`

```text
(gdb) bt
#0  0x000055555555581a in ?? ()
```

debuginfo 없음. 셋 중 하나.

- `-g` 없이 빌드 → 다시 빌드.
- strip된 바이너리 + debuginfo 없음 → debuginfo 패키지 설치 또는 `set debug-file-directory` 지정.
- shared library에만 심볼 없음 → `info shared`로 어느 라이브러리가 빠졌는지 확인.

### "value optimized out"

해당 구간의 location list가 비어 있음. `-Og` 빌드 또는 레지스터 직접 보기 (Ch 11 참고).

DWARF 5의 `DW_OP_entry_value`가 도입되면서 GCC 8+/Clang 11+는 *함수 진입 시* 인자 값을 보존하는 경향이 있습니다. 일부 변수는 본문 중간에서도 `<entry value, 42>`로 보입니다.

### 잘못된 줄 번호

```text
(gdb) step
[잘못된 줄로 점프]
```

`-O2` + 인라인의 결과. `.debug_line`이 PC→소스를 일대일이 아니라 *조밀한* 매핑으로 표시해 줄 단위 step이 의도와 다를 수 있습니다. `-Og`로 줄여집니다.

### 빌드 디렉터리가 다름

```text
(gdb) list
warning: Could not find DW_AT_name "src/main.cpp"
```

빌드 시 절대 경로가 박혔는데 디버거가 도는 환경이 다른 경로일 때.

```text
(gdb) set substitute-path /build/server-x86_64 /home/me/src
```

또는 빌드 시 `-fdebug-prefix-map=/build=.`로 경로를 상대화. CI 빌드를 *어디서나 재현 가능*하게 만드는 표준 기법.

### LTO와 DWARF

LTO(Link-Time Optimization)는 인라인을 *링크 시점*에 한 번 더 합니다. 함수의 origin CU가 사라지거나 합쳐져 DIE 참조가 깨질 수 있습니다. Clang의 `-flto=thin`이 표준 LTO보다 DWARF 보존이 낫습니다.

### 누락된 colored output

`set style sources on` (GDB 8+) + 빌드 시 `-fdiagnostics-color=always`가 같이 필요합니다. 일부 터미널은 환경 변수 `TERM=xterm-256color` 필수.

## DWARF 검사 도구

```bash
# 모든 정보
$ readelf --debug-dump=info,line,loc my_prog | less
$ llvm-dwarfdump my_prog

# 특정 주소 분석
$ addr2line -e my_prog -f -i 0x401234

# 콜스택 해제 정보
$ readelf --debug-dump=frames my_prog

# 빠른 PC→파일 인덱스
$ llvm-dwarfdump --debug-aranges my_prog

# DWARF 통계
$ dwarfdump --statistics my_prog

# 한 함수만
$ llvm-dwarfdump --name='main' my_prog
$ llvm-dwarfdump --find=0x401234 my_prog
```

`llvm-dwarfdump`가 `readelf`보다 출력이 깔끔해 일상 디버깅엔 권장.

### Python으로 직접 파싱

`pip install pyelftools`. 자체 도구를 만들 때 유용.

```python
from elftools.elf.elffile import ELFFile

with open('my_prog', 'rb') as f:
    elf = ELFFile(f)
    dwarf = elf.get_dwarf_info()

    for cu in dwarf.iter_CUs():
        print(f"CU @ {cu.cu_offset:#x}, version {cu['version']}")
        top = cu.get_top_DIE()
        for child in top.iter_children():
            if child.tag == 'DW_TAG_subprogram':
                name = child.attributes.get('DW_AT_name')
                low_pc = child.attributes.get('DW_AT_low_pc')
                print(f"  {name.value.decode()} @ {low_pc.value:#x}")
```

DWARF 인덱스 자체 도구, 코드 사이즈 분석, 미사용 함수 검출 — 모두 이 정도면 됩니다.

## DWARF 5의 변화

- 새 섹션 `.debug_loclists`, `.debug_rnglists`, `.debug_str_offsets`, `.debug_addr` — 인덱싱이 더 효율적.
- `.debug_names` — 빠른 심볼 인덱스(예전 `.debug_pubnames`/`pubtypes` 대체). GDB가 `bt`에서 함수 이름을 찾는 속도가 크게 빨라짐.
- split-DWARF 표준화.
- 새 op `DW_OP_implicit_value`, `DW_OP_entry_value`, `DW_OP_const_type` — 더 풍부한 위치 표현.
- DW_TAG_call_site* — 인라인되지 않은 호출도 호출 측 정보를 풍부히. tail call 추적 개선.

GCC 11+ / Clang 11+ 가 기본으로 DWARF 5를 만듭니다. 오래된 GDB(<= 9)는 못 읽으니 호환을 위해 `-gdwarf-4` 강제할 수 있습니다.

```bash
$ clang -g -gdwarf-4 ...
```

## DWARF 외의 디버그 포맷

| 포맷 | 사용처 |
|------|--------|
| DWARF | Linux, macOS(부분), BSD — 표준 |
| CodeView (PDB) | Windows MSVC |
| STABS | 폐기, 일부 임베디드 |
| symtab만 | strip 후 남는 ELF symbol table — 함수명만 |

Windows는 별도의 PDB 파일에 CodeView를 두므로 GDB/LLDB가 Windows 바이너리를 디버깅하려면 별도 변환 도구(`cv2pdb` 등) 또는 LLDB의 PDB 리더가 필요합니다. 호환은 LLDB 쪽이 낫습니다.

## DWARF 안의 함수 인라인 트리 — 한 예

`-O2`로 컴파일된 작은 코드.

```cpp
// main.cpp
inline int square(int x) { return x * x; }
inline int sum_of_squares(int a, int b) { return square(a) + square(b); }
int main() { return sum_of_squares(3, 4); }
```

```bash
$ clang++ -O2 -g main.cpp -o demo
$ llvm-dwarfdump --debug-info demo | grep -A2 inlined
```

`main`의 DIE 안에 `DW_TAG_inlined_subroutine` 두 개(둘 다 square, sum_of_squares까지 합치면 셋). 각각 `DW_AT_call_file/line`을 가지고 GDB는 *논리적 콜스택*을 다음처럼 재구성합니다.

```text
#0  square at main.cpp:1
        (inlined by) sum_of_squares at main.cpp:2
        (inlined by) main at main.cpp:3
```

물리적으로는 한 PC지만 디버거가 보는 콜스택은 셋. 빌드 옵션에 따라 이 깊이가 의도와 달라질 수 있으므로 `info frame`으로 PC↔inline 매핑을 확인하는 습관이 도움이 됩니다.

## 정리

- DWARF가 디버거의 *눈*. 없으면 디스어셈블 외엔 거의 못 함.
- DIE 트리(`.debug_info`)가 메인, `.debug_line`이 PC↔소스, `.debug_loc`이 변수 위치.
- `.debug_loc`의 표현식은 *스택 머신* — 변수가 두 레지스터에 쪼개져 있어도 표현 가능.
- 콜스택 해제는 `.debug_frame`/`.eh_frame`. CFI 덕에 frame pointer 없이도 가능.
- 크기 문제 → split-DWARF, dwz, 또는 `-gline-tables-only`.
- 배포 바이너리는 strip + 별도 debuginfo + build-id로 매칭.
- `addr2line`, `llvm-dwarfdump`, `readelf --debug-dump`로 진단.
- DWARF 5의 `.debug_names`/`DW_OP_entry_value`가 큰 개선.
- pyelftools로 자체 도구 작성 가능.

## 관련 항목

- [Ch 1: 소개와 설치](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install) — `-g3 -fno-omit-frame-pointer`
- [Ch 4: 콜스택과 프레임](/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames) — CFI가 풀어 주는 것
- [Ch 7: core dump 분석](/blog/tools/debugging/gdb-lldb/chapter07-core-dump) — build-id로 debuginfo 매칭
- [Ch 11: 실전 팁](/blog/tools/debugging/gdb-lldb/chapter11-practical-tips) — "optimized out" 회피
- [DWARF 5 표준 PDF](https://dwarfstd.org/doc/DWARF5.pdf)
- [llvm-dwarfdump 문서](https://llvm.org/docs/CommandGuide/llvm-dwarfdump.html)
- [pyelftools](https://github.com/eliben/pyelftools)
- [`debuginfod` 프로젝트](https://sourceware.org/elfutils/Debuginfod.html)
