---
title: "Ch 12: DWARF — 디버그 정보의 정체"
date: 2025-08-20T12:00:00
description: "DWARF 표준, .debug_info / .debug_line / .debug_loc, split-DWARF, dwz, addr2line."
tags: [gdb, lldb, DWARF, ELF, DebugInfo]
series: "GDB and LLDB"
seriesOrder: 12
draft: false
---

GDB가 `print x`라고 했을 때 `x`의 *타입*, *위치(메모리 주소 또는 레지스터)*, *어떤 라이브러리·소스 파일에 정의됐는지*를 어떻게 알까요. 답은 ELF 파일 안에 박힌 **DWARF**라는 디버그 정보 형식입니다. 이 정보 없이는 GDB가 그저 어셈블리 디스어셈블러에 불과합니다.

이 장은 DWARF가 무엇을 표현하고, 왜 그렇게 크고, 어떻게 줄이며, 흔한 트러블 ("심볼이 없다", "value optimized out")을 어떻게 진단할지를 다룹니다.

## DWARF가 뭔가

DWARF(Debugging With Attributed Record Formats)는 1992년부터 ELF·Mach-O·COFF 등 거의 모든 ABI에서 *디버그 정보 표준*으로 쓰이고 있습니다. 현재 DWARF 5가 표준(2017). GCC/Clang의 `-g` 플래그가 만들어 내는 게 바로 이것.

```bash
$ readelf -S my_prog | grep debug
[35] .debug_info       PROGBITS         00000000  0001234c
[36] .debug_abbrev     PROGBITS         00000000  00018765
[37] .debug_line       PROGBITS         00000000  0001b234
[38] .debug_str        PROGBITS         00000000  0001d432
[39] .debug_loc        PROGBITS         00000000  0001f987
[40] .debug_ranges     PROGBITS         00000000  00022345
...
```

각 섹션이 다른 정보를 담습니다.

| 섹션 | 내용 |
|------|------|
| `.debug_info` | DIE 트리 — 컴파일 유닛·함수·변수·타입의 메인 표현 |
| `.debug_abbrev` | 약어 테이블 — `.debug_info`가 참조 |
| `.debug_line` | PC ↔ (파일, 줄) 매핑 |
| `.debug_str` | 문자열 풀 — DIE가 인덱스로 참조 |
| `.debug_loc` / `.debug_loclists` | 변수 위치 표현(스코프별로 다름) |
| `.debug_ranges` / `.debug_rnglists` | 함수·범위 주소 구간 |
| `.debug_frame` / `.eh_frame` | 콜스택 해제 정보 |
| `.debug_aranges` | PC → 컴파일 유닛 빠른 인덱스 |
| `.debug_pubnames` / `.debug_pubtypes` | 빠른 공개 심볼 검색(폐기 추세) |

## DIE — Debugging Information Entry

`.debug_info`의 기본 단위는 *DIE*(다이). 트리 구조로 컴파일 유닛(파일 하나) → 함수 → 변수 → 타입을 표현합니다.

```text
DW_TAG_compile_unit
├─ DW_AT_name = "main.c"
├─ DW_AT_low_pc = 0x401000
├─ DW_TAG_base_type
│  ├─ DW_AT_name = "int"
│  └─ DW_AT_byte_size = 4
├─ DW_TAG_subprogram
│  ├─ DW_AT_name = "main"
│  ├─ DW_AT_low_pc = 0x401120
│  └─ DW_TAG_variable
│     ├─ DW_AT_name = "argc"
│     ├─ DW_AT_type = ref(int)
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

`addr2line`이 이 표를 검색해 답합니다.

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

## .debug_loc — 변수 위치

같은 변수도 *코드 위치마다 어디 있는지* 다릅니다. 함수 입구에서는 `%rdi` 레지스터, 본문에서는 `[%rbp-4]` 스택, 어떤 구간에서는 *없어짐*. 이 모든 걸 표현하는 게 *location list*.

```text
DW_AT_location =
    [0x401120, 0x40112f): DW_OP_reg5 (rdi)
    [0x40112f, 0x40115a): DW_OP_fbreg -4
    [0x40115a, 0x401200): <removed by optimization>
```

`<removed>` 구간에서 GDB가 변수 출력을 요청받으면 `<optimized out>`을 답합니다. 그래서 `-Og`(디버깅 친화 최적화)가 `<optimized out>`을 줄여 줍니다 — 더 많은 구간에서 location을 보존.

## 콜스택 해제 — .debug_frame / .eh_frame

`bt`가 어떻게 SP·BP를 거꾸로 풀어 가는지의 답이 여기. 각 함수의 *프롤로그/에필로그*를 *Call Frame Information*(CFI)으로 기술합니다.

- `.eh_frame` — C++ 예외 처리에도 쓰이므로 *항상 들어 있음*(stripped 빌드에도).
- `.debug_frame` — 디버깅 전용, `-g`로만 들어감.

`-fomit-frame-pointer`로 BP 레지스터가 사라져도 GDB가 콜스택을 풀 수 있는 이유가 `.eh_frame`의 CFI 덕입니다. 다만 정밀도는 BP 보유 시보다 떨어집니다 — Ch 1에서 `-fno-omit-frame-pointer`를 권한 이유.

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

또는 빌드 시 `-fdebug-prefix-map=/build=.`로 경로를 상대화.

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
```

## DWARF 5의 변화

- 새 섹션 `.debug_loclists`, `.debug_rnglists`, `.debug_str_offsets`, `.debug_addr` — 인덱싱이 더 효율적.
- `.debug_names` — 빠른 심볼 인덱스(예전 `.debug_pubnames`/`pubtypes` 대체).
- split-DWARF 표준화.
- 새 op `DW_OP_implicit_value`, `DW_OP_entry_value` — 더 풍부한 위치 표현.

GCC 11+ / Clang 11+ 가 기본으로 DWARF 5를 만듭니다. 오래된 GDB(<= 9)는 못 읽으니 호환을 위해 `-gdwarf-4` 강제할 수 있습니다.

```bash
$ clang -g -gdwarf-4 ...
```

## 정리

- DWARF가 디버거의 *눈*. 없으면 디스어셈블 외엔 거의 못 함.
- DIE 트리(`.debug_info`)가 메인, `.debug_line`이 PC↔소스, `.debug_loc`이 변수 위치.
- 콜스택 해제는 `.debug_frame`/`.eh_frame`. CFI 덕에 frame pointer 없이도 가능.
- 크기 문제 → split-DWARF, dwz, 또는 `-gline-tables-only`.
- 배포 바이너리는 strip + 별도 debuginfo + build-id로 매칭.
- `addr2line`, `llvm-dwarfdump`, `readelf --debug-dump`로 진단.
- DWARF 5가 표준이지만 호환 위해 `-gdwarf-4`를 고려.

## 관련 항목

- [Ch 1: 소개와 설치](/blog/tools/gdb-lldb/chapter01-intro-and-install) — `-g3 -fno-omit-frame-pointer`
- [Ch 7: core dump 분석](/blog/tools/gdb-lldb/chapter07-core-dump) — build-id로 debuginfo 매칭
- [Ch 11: 실전 팁](/blog/tools/gdb-lldb/chapter11-practical-tips) — "optimized out" 회피
- [DWARF 5 표준 PDF](https://dwarfstd.org/doc/DWARF5.pdf)
- [llvm-dwarfdump 문서](https://llvm.org/docs/CommandGuide/llvm-dwarfdump.html)
