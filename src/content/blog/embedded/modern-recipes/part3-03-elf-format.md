---
title: "ELF 파일 구조 분석 — Section·Segment·Symbol Table·DWARF"
slug: "embedded/modern-recipes/part3-03-elf-format"
date: 2026-04-12T09:25:00
description: "Header·sections·symbols — `readelf`로 dissect."
series: "Modern Embedded Recipes"
seriesOrder: 25
tags: [recipes, toolchain, elf]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"ELF는 컴파일된 코드, 데이터, 메타데이터를 담는 표준 컨테이너입니다."** Linker가 만드는 결과물이고, debugger·flasher·loader가 같은 파일을 서로 다른 표(section header, program header)로 읽습니다.

## 어떤 상황에서 쓰나

- Symbol이 어디에 있는지, 크기는 얼마나 되는지 분석
- Debug 정보가 들어 있는지 확인
- Custom section을 만들고 위치 검증
- Flash에 올릴 bin 추출 전 검수

이 글의 출력은 Debian 13 arm64 guest의 `gcc-arm-none-eabi` 14.2.rel1-1(GCC 14.2.1, binutils 2.44)로 아래 예제를 빌드해 얻었습니다. section의 정의는 System V ABI(gABI) 4장 "Sections", ARM 고유 부분은 Arm의 *ELF for the Arm Architecture*(ARM-software/abi-aa `aaelf32`)를 따릅니다.

## 핵심 개념

### 1) ELF 전체 구조

| 영역 | 내용 | 역할 |
| --- | --- | --- |
| ELF Header | magic `7f 45 4c 46`, class, machine, entry | 파일 종류와 나머지 표의 위치 |
| Program Headers | `PT_LOAD` 등 segment 목록 | loader·flasher가 무엇을 어디에 올릴지 |
| Sections | `.text`, `.data`, `.debug_*` 등 | 실제 내용 |
| Section Headers | section마다 이름·타입·주소·크기 | linker·objdump·gdb용 목록 |

예제 프로그램입니다. 각 변수가 어느 section에 갈지를 주석에 적었습니다.

```c
#include <stdint.h>
const char banner[] = "app v1";          /* .rodata */
uint32_t my_global_var = 0x1234;         /* .data */
uint32_t big_buf[128];                   /* .bss */
static uint32_t file_local;              /* .bss, LOCAL */
extern int ext_func(int);                /* resolved at link */
__attribute__((weak)) void Default_IRQ(void) { for (;;) {} }
static int helper(int x) { return x * 3; }
int main(void) {
    file_local = my_global_var;
    big_buf[0] = banner[0];
    return ext_func(helper(file_local));
}
```

`ext.c`는 `ext_func`와 strong `Default_IRQ`를 정의하고, startup·linker script는 [3-02](/blog/embedded/modern-recipes/part3-02-compile-pipeline)의 것에 `.rodata` 출력 section만 따로 둔 것입니다.

```bash
M="-mcpu=cortex-m4 -mthumb -O1 -g"
arm-none-eabi-gcc $M -c app.c -o app.o
arm-none-eabi-gcc $M -c ext.c -o ext.o
arm-none-eabi-gcc $M -c startup.c -o startup.o
arm-none-eabi-gcc $M -nostartfiles -nostdlib -T linker.ld startup.o app.o ext.o -o app.elf
```

### 2) Program Header vs Section Header

| 구분 | 용도 | 누가 읽음 |
| --- | --- | --- |
| Program Header | 실행 시 메모리에 올릴 segment | loader, flasher, `objcopy -O binary` |
| Section Header | link·debug용 section 목록 | linker, objdump, gdb |

Program header는 "이 바이트들을 어디에 올려라", section header는 "이 바이트들이 무엇인가"를 말합니다. 같은 파일을 두 시각으로 보는 셈이고, `readelf -l`의 "Section to Segment mapping"이 둘을 이어 줍니다(아래 출력).

### 3) 표준 섹션

| 섹션 | 용도 | gABI 타입 | 메모리 영역 |
| --- | --- | --- | --- |
| `.text` | 실행 코드 | `PROGBITS`, flags `AX` | Flash |
| `.rodata` | 상수, string literal | `PROGBITS`, flags `A` | Flash |
| `.data` | 초기값 있는 RAM 변수 | `PROGBITS`, flags `WA` | RAM (초기값은 Flash에서 복사) |
| `.bss` | 0으로 시작하는 RAM 변수 | `NOBITS`, flags `WA` | RAM |
| `.debug_*` | DWARF 디버그 정보 | `PROGBITS`, flags 없음 | 올라가지 않음 |
| `.symtab` / `.strtab` | symbol 표 / 이름 문자열 | `SYMTAB` / `STRTAB` | 올라가지 않음 |

gABI는 `SHT_NOBITS` section이 "may have a non-zero size, but it occupies no space in the file"이라고 정의합니다. `.bss`가 크기는 있어도 파일에는 0 byte를 차지하는 이유입니다. `.heap`·`.stack`은 표준 section이 아니라 linker script가 관례적으로 만드는 이름입니다.

### 4) Symbol table

각 symbol entry는 이름(string table offset), value(주소), size, binding(LOCAL·GLOBAL·WEAK), type(FUNC·OBJECT·SECTION·FILE·NOTYPE), visibility, section index를 갖습니다. `-O0`으로 컴파일한 `app.o`의 `readelf -s`와 `nm`입니다.

```text
$ arm-none-eabi-readelf -s app-O0.o
   Num:    Value  Size Type    Bind   Vis      Ndx Name
     9: 00000200     4 NOTYPE  LOCAL  DEFAULT    4 file_local
    11: 00000007    26 FUNC    LOCAL  DEFAULT    1 helper
    16: 00000000     4 OBJECT  GLOBAL DEFAULT    3 my_global_var
    18: 00000001     6 FUNC    WEAK   DEFAULT    1 Default_IRQ
    19: 00000021    56 FUNC    GLOBAL DEFAULT    1 main
$ arm-none-eabi-nm app-O0.o
00000000 W Default_IRQ
00000000 R banner
00000000 B big_buf
         U ext_func
00000200 b file_local
00000006 t helper
00000020 T main
00000000 D my_global_var
```

`static`인 `file_local`·`helper`는 LOCAL이고 `nm`에서 소문자(`b`, `t`)입니다. FUNC symbol의 value 홀수(`0x7`, `0x21`)는 Thumb 함수라는 표시이고, `nm`은 그 bit를 지운 주소를 보여 줍니다. `-O1`로 빌드한 `app.o`에서는 `helper`가 inline되고 `file_local`도 사라져 `nm`에 나오지 않았습니다.

### 5) Relocation

`.o` 파일은 다른 파일의 symbol이나 자기 section 주소를 아직 모르므로, 그 자리를 relocation entry로 남깁니다. ARM ELF는 addend를 명령·데이터 자리에 넣어 두는 REL 형식을 쓰므로 section 이름이 `.rel.text`입니다(aaelf32의 "REL type relocations").

```text
$ arm-none-eabi-readelf -r app.o
Relocation section '.rel.text' at offset 0x780 contains 3 entries:
 Offset     Info    Type            Sym.Value  Sym. Name
00000012  0000160a R_ARM_THM_CALL    00000000   ext_func
00000018  00000302 R_ARM_ABS32       00000000   .data
0000001c  00000402 R_ARM_ABS32       00000000   .bss
```

`ext_func` 호출은 Thumb `BL`이라 `R_ARM_THM_CALL`(aaelf32 표에서 type 10)이고, 32-bit 주소 상수 두 개는 `R_ARM_ABS32`(type 2)입니다. `my_global_var`·`file_local` 같은 symbol 이름 대신 `.data`·`.bss` section symbol이 나온 것은 assembler가 같은 파일 안 symbol의 참조를 section 기준 offset으로 바꿔 두었기 때문입니다. `-g`로 빌드하면 `.rel.debug_info` 같은 debug section용 relocation도 생기고, 이 파일에서는 35개였습니다. linker가 이 entry를 모두 풀어 최종 주소를 써 넣습니다.

## 코드 / 실제 사용 예

링크한 `app.elf`를 `readelf`로 봅니다.

```text
$ arm-none-eabi-readelf -h app.elf
  Magic:   7f 45 4c 46 01 01 01 00 00 00 00 00 00 00 00 00
  Class:                             ELF32
  Data:                              2's complement, little endian
  Type:                              EXEC (Executable file)
  Machine:                           ARM
  Entry point address:               0x8000009
  Flags:                             0x5000200, Version5 EABI, soft-float ABI
  Number of program headers:         2
  Number of section headers:         18
```

entry point 0x08000009는 `Reset_Handler`(0x08000008)에 Thumb bit를 더한 값입니다.

```text
$ arm-none-eabi-readelf -S -W app.elf
  [Nr] Name              Type            Addr     Off    Size   ES Flg Lk Inf Al
  [ 1] .isr_vector       PROGBITS        08000000 010000 000008 00  WA  0   0  4
  [ 2] .text             PROGBITS        08000008 010008 00003e 00  AX  0   0  4
  [ 3] .rodata           PROGBITS        08000048 010048 000007 00   A  0   0  4
  [ 4] .data             PROGBITS        20000000 020000 000008 00  WA  0   0  4
  [ 5] .bss              NOBITS          20000008 020008 000220 00  WA  0   0  4
  [ 6] .debug_info       PROGBITS        00000000 020008 0002ec 00      0   0  1
  ...
  [15] .symtab           SYMTAB          00000000 020968 000280 10     16  29  4
  [16] .strtab           STRTAB          00000000 020be8 000082 00      0   0  1
  [17] .shstrtab         STRTAB          00000000 020c6a 0000b6 00      0   0  1

$ arm-none-eabi-readelf -l -W app.elf
  Type           Offset   VirtAddr   PhysAddr   FileSiz MemSiz  Flg Align
  LOAD           0x010000 0x08000000 0x08000000 0x0004f 0x0004f RWE 0x10000
  LOAD           0x020000 0x20000000 0x0800004f 0x00008 0x00228 RW  0x10000
 Section to Segment mapping:
   00     .isr_vector .text .rodata
   01     .data .bss
```

두 번째 `LOAD` segment가 이 글의 핵심입니다. VirtAddr는 RAM(0x20000000), PhysAddr는 Flash(0x0800004F)이고, FileSiz 8은 `.data`만, MemSiz 0x228은 `.data` 8 + `.bss` 0x220입니다. 파일에는 `.data`의 초기값만 들어 있고, `.bss`는 메모리 크기만 차지합니다. `.debug_info` 이후 section은 어느 segment에도 속하지 않으므로 메모리에 올라가지 않습니다.

weak symbol이 실제로 대체됐는지는 `.o`와 `.elf`의 symbol 표를 비교합니다.

```text
$ arm-none-eabi-objdump -t app.o | grep Default_IRQ
00000000  w    F .text	00000002 Default_IRQ
$ arm-none-eabi-objdump -t app.elf | grep Default_IRQ
08000044 g     F .text	00000002 Default_IRQ
```

`app.o`의 weak(`w`) 정의 대신 `ext.o`의 global(`g`) 정의가 0x08000044에 링크됐습니다. 주소를 소스 줄로 바꾸려면 `addr2line`을 씁니다(`-g` 필요).

```text
$ arm-none-eabi-addr2line -f -e app.elf 0x08000022
main
/root/p303/app.c:9
```

Flash에 올릴 이미지는 `objcopy`로 뽑습니다. `-O binary`는 `LOAD` segment의 내용을 PhysAddr 순서로 이어 붙입니다.

```bash
arm-none-eabi-objcopy -O binary app.elf app.bin
arm-none-eabi-objcopy -O ihex   app.elf app.hex
```

## 측정 / 비교

같은 프로그램의 파일 크기입니다.

| 파일 | 크기 (byte) |
| --- | ---: |
| `app.elf` (`-g`) | 135,152 |
| `app.elf`를 `arm-none-eabi-strip`한 것 | 131,600 |
| `app.hex` | 312 |
| `app.bin` | 87 |

`app.bin`의 87 byte는 첫 `LOAD`의 0x4F(79) byte에 `.data` 초기값 8 byte를 더한 값입니다. ELF가 13만 byte를 넘는 것은 debug 정보 때문이 아니라 대부분 `LOAD` segment의 `Align 0x10000`에 맞춘 file offset 공백 때문입니다. `.text`가 file offset 0x10000에서 시작하는 것이 그 흔적이고, strip으로 debug section과 symbol을 지워도 131,600 byte로 남습니다.

`size -A`로 본 section별 크기입니다.

```text
section           size        addr
.isr_vector          8   134217728
.text               62   134217736
.rodata              7   134217800
.data                8   536870912
.bss               544   536870920
.debug_info        748           0
.debug_abbrev      570           0
.debug_line        374           0
.debug_str         329           0
```

## 자주 보는 함정

> ⚠️ ELF를 그대로 flash에 쓰기

위 표처럼 ELF는 header·section 표·정렬 공백·debug 정보까지 담고 있어, 87 byte짜리 이미지가 13만 byte 파일이 됩니다. raw flash에는 `objcopy -O binary`나 `-O ihex`로 변환한 결과를 씁니다. ELF를 직접 받는 도구(gdb `load`, OpenOCD `program`)는 program header를 읽어 필요한 부분만 씁니다.

> ⚠️ Stripped binary로 디버깅

strip한 파일에서는 `nm`이 "no symbols"를 냅니다. 배포용으로 strip하기 전에 symbol이 있는 `.elf`를 보관해야 crash 주소를 `addr2line`으로 풀 수 있습니다.

```text
$ arm-none-eabi-nm app-stripped.elf
arm-none-eabi-nm: app-stripped.elf: no symbols
```

> ⚠️ Debug 정보를 flash 크기로 셈

`.debug_*` section은 어떤 `LOAD` segment에도 들어가지 않으므로 `objcopy -O binary` 결과에 포함되지 않습니다. 파일 크기와 flash 사용량은 따로 봅니다.

> ⚠️ Static vs global symbol 혼동

`static` 함수·변수는 LOCAL binding이라 다른 파일에서 링크할 수 없습니다. `nm`에서 소문자(`t`, `b`)로 표시되고, 최적화로 아예 사라질 수도 있습니다.

> ⚠️ Weak symbol 대체 확인 누락

startup의 기본 IRQ handler를 weak로 두고 사용자가 같은 이름으로 정의했다면, 위처럼 `.elf`의 `objdump -t`에서 binding이 `g`로 바뀌고 주소가 사용자 정의 쪽인지 확인합니다. 이름을 잘못 쓰면 weak 기본 handler가 그대로 남습니다.

## 정리

- ELF는 program header(무엇을 어디에 올릴지)와 section header(무엇이 들었는지) 두 표로 같은 내용을 설명합니다.
- `.bss`는 `NOBITS`라 파일 공간을 차지하지 않고, `.data`는 VirtAddr(RAM)와 PhysAddr(Flash)가 다른 `LOAD` segment로 들어갑니다.
- `.o`의 `.rel.text`가 `R_ARM_THM_CALL`·`R_ARM_ABS32` 같은 relocation을 남기고 linker가 이를 풉니다.
- Flash 이미지는 `objcopy`로 뽑고, ELF 파일 크기의 대부분은 정렬 공백과 debug 정보입니다.

다음 편에서는 **링커 스크립트 기초**를 다룹니다. MEMORY와 SECTIONS의 기본 사용법입니다.

## 관련 항목

- [3-02: 컴파일 4단계](/blog/embedded/modern-recipes/part3-02-compile-pipeline)
- [3-04: 링커 스크립트 기초](/blog/embedded/modern-recipes/part3-04-linker-script-basics)
- [3-10: 맵 파일 분석](/blog/embedded/modern-recipes/part3-10-map-file-analysis)
- 더 깊이 — [Embedded C++ for Real Systems: ELF 분석](/blog/embedded/embedded-cpp/00-preface)
