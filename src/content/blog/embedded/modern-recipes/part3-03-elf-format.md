---
title: "ELF 파일 구조 분석 — Section·Segment·Symbol Table·DWARF"
date: 2026-04-12T09:25:00
description: "Header·sections·symbols — `readelf`로 dissect."
series: "Modern Embedded Recipes"
seriesOrder: 25
tags: [recipes, toolchain, elf]
draft: false
---

## 한 줄 요약

> **"ELF는 컴파일된 코드, 데이터, 메타데이터를 담는 표준 컨테이너입니다."** Linker가 만드는 결과물이고, debugger·flasher·loader가 읽습니다.

## 어떤 상황에서 쓰나

- Symbol이 어디에 있는지, 크기는 얼마나 되는지 분석
- Debug 정보가 들어 있는지 확인
- Custom section을 만들고 위치 검증
- Flash에 올릴 bin 추출 전 검수

## 핵심 개념

### 1) ELF 전체 구조

| 영역 | 내용 | 역할 |
| --- | --- | --- |
| ELF Header | 매직 + 포인터 | 어디에 뭐가 있는지 안내 |
| Program Headers | PT_LOAD, PT_NOTE 등 | loader용 — 어디에 올릴지 |
| `.text` | 실행 코드 | runtime 실행 |
| `.rodata` | 상수 | read-only data |
| `.data` | 초기화된 변수 | RAM 초기값 |
| `.bss` | 0 초기화 | 실제 데이터 없음, 크기만 |
| `.debug_info` | DWARF 등 | 디버그 정보 |
| Section Headers | section metadata | linker / objdump / gdb |

### 2) Program Header vs Section Header

| 구분 | 용도 | 누가 읽음 |
| --- | --- | --- |
| Program Header | runtime loading | loader, flasher |
| Section Header | linking, debug | linker, objdump, gdb |

Program header는 "어디에 올려라", section header는 "어디서 만들어졌나"입니다. 같은 ELF가 두 시각을 제공합니다.

### 3) 표준 섹션

| 섹션 | 용도 | 메모리 영역 |
| --- | --- | --- |
| `.text` | 실행 코드 | Flash |
| `.rodata` | 상수, string literal | Flash |
| `.data` | 초기화된 RAM 변수 | RAM (init from Flash) |
| `.bss` | 0 RAM 변수 | RAM (no init data) |
| `.heap` | (linker가 생성) | RAM |
| `.stack` | (linker가 생성) | RAM |
| `.debug_*` | DWARF 디버그 정보 | (load 안 됨) |
| `.symtab` | symbol 테이블 | (load 안 됨) |
| `.strtab` | symbol 이름 문자열 | (load 안 됨) |

### 4) Symbol table

각 symbol은 다음을 갖습니다.

**Symbol entry:**

- name (string table offset)
- value (주소)
- size
- binding (LOCAL, GLOBAL, WEAK)
- type (FUNC, OBJECT, SECTION, FILE, NOTYPE)
- visibility (DEFAULT, HIDDEN, PROTECTED)
- section index

`nm`이 가장 자주 쓰는 도구입니다.

### 5) Relocation

`.o` 파일은 외부 symbol 참조를 미해결로 두고, .rel.* 섹션에 "여기에 외부 symbol 주소를 넣어라"라는 entry를 둡니다. linker가 이를 해소합니다.

```text
main.o의 .rel.text:
   offset 0x14: R_ARM_CALL → printf
   offset 0x20: R_ARM_ABS32 → my_global_var

→ linker가 printf, my_global_var의 주소를 박아 넣음
```

## 코드 / 실제 사용 예

`readelf`로 분석합니다.

```bash
# ELF header
arm-none-eabi-readelf -h app.elf
# ELF Header:
#   Magic:   7f 45 4c 46 01 01 01 00
#   Class:                             ELF32
#   Data:                              little endian
#   Type:                              EXEC (Executable file)
#   Machine:                           ARM
#   Version:                           0x1
#   Entry point address:               0x80000fd
#   Number of program headers:         3
#   Number of section headers:         22

# Section header
arm-none-eabi-readelf -S app.elf
# [Nr] Name              Type            Addr     Off    Size   Flg
# [ 1] .text             PROGBITS        08000000 010000 001234 AX
# [ 2] .rodata           PROGBITS        08001234 011234 000100 A
# [ 3] .data             PROGBITS        20000000 020000 000080 WA
# [ 4] .bss              NOBITS          20000080 020080 000200 WA
# [ 5] .debug_info       PROGBITS        00000000 030000 005000

# Program header
arm-none-eabi-readelf -l app.elf
# Type           Offset   VirtAddr   PhysAddr   FileSiz MemSiz  Flg
# LOAD           0x010000 0x08000000 0x08000000 0x01334 0x01334 R E
# LOAD           0x020000 0x20000000 0x080013B4 0x00080 0x00280 RW

# Symbol
arm-none-eabi-readelf -s app.elf | head -20
arm-none-eabi-nm --size-sort app.elf | tail -20
```

`objdump` 활용:

```bash
# 디스어셈블 + source 함께
arm-none-eabi-objdump -dS app.elf | less

# 특정 섹션의 hex dump
arm-none-eabi-objdump -s -j .data app.elf

# 모든 섹션 size
arm-none-eabi-size -A app.elf
```

ELF에서 bin 추출(flasher용):

```bash
# 모든 LOAD 섹션을 단일 binary로
arm-none-eabi-objcopy -O binary app.elf app.bin

# 특정 섹션만
arm-none-eabi-objcopy -O ihex \
    --only-section=.text \
    --only-section=.rodata \
    app.elf app.hex
```

## 측정 / 비교

| Tool | 용도 |
| --- | --- |
| `readelf` | 메타데이터 분석 |
| `objdump` | 디스어셈블, hex dump |
| `nm` | symbol 나열 |
| `size` | section 크기 요약 |
| `objcopy` | section 추출, format 변환 |
| `addr2line` | 주소 → 소스 라인 |
| `strings` | text string 추출 |

| 섹션 종류 | 메모리에 올라감 | Flash에 저장 |
| --- | --- | --- |
| .text | O | O |
| .rodata | O | O |
| .data | O | O (init copy) |
| .bss | O | X (0으로 초기화) |
| .debug_* | X | X (flash에 안 들어감) |

## 자주 보는 함정

> ⚠️ ELF를 그대로 flash에 쓰기

ELF는 metadata, debug 정보, padding을 다 갖고 있어 flash 크기를 초과합니다. `objcopy -O binary` 또는 `-O ihex`로 변환.

> ⚠️ Stripped binary로 디버깅

`strip app.elf` 후에는 symbol과 debug 정보가 사라져 gdb로 stack trace를 못 봅니다. release용 strip 전에 .elf 사본 보관.

> ⚠️ Debug 정보 크기 무시

`-g` 옵션의 debug 정보는 .text보다 5 ~ 10배 클 수 있습니다. flash 크기에는 영향 없지만 (load 안 됨), elf 파일 크기는 큽니다.

> ⚠️ Static vs global symbol 혼동

`static` 함수/변수는 LOCAL binding으로 다른 file에서 못 봅니다. `nm`에서 소문자(t, d)로 표시. global은 대문자(T, D).

> ⚠️ Weak symbol 작동 확인 누락

Startup의 default IRQ handler가 weak이면 사용자가 같은 이름의 강한 정의로 override 가능. weak 적용 확인은 `nm` 또는 `objdump -t`.

## 정리

- ELF는 program/section header, code/data, symbol, debug 정보를 담는 표준 컨테이너입니다.
- Program header는 loader용, section header는 linker/debugger용입니다.
- `readelf`, `objdump`, `nm`, `size`로 ELF를 분석합니다.
- Flash에 올릴 때는 `objcopy`로 .bin 또는 .hex로 변환합니다.
- Debug 정보는 ELF에만 있고 flash에는 안 올라갑니다.

다음 편에서는 **링커 스크립트 기초**를 다룹니다. MEMORY와 SECTIONS의 기본 사용법입니다.

## 관련 항목

- [3-02: 컴파일 4단계](/blog/embedded/modern-recipes/part3-02-compile-pipeline)
- [3-04: 링커 스크립트 기초](/blog/embedded/modern-recipes/part3-04-linker-script-basics)
- [3-10: 맵 파일 분석](/blog/embedded/modern-recipes/part3-10-map-file-analysis)
- 더 깊이 — [Embedded C++ for Real Systems: ELF 분석](/blog/embedded/embedded-cpp/)
