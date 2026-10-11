---
title: "Map 파일 분석 — 링커가 넣은 것, 끌어온 이유, 버린 것 읽기"
slug: "embedded/modern-recipes/part3-10-map-file-analysis"
date: 2026-04-12T09:32:00
description: "GNU ld map 파일을 처음 읽는 펌웨어 개발자를 위해 절 순서와 줄 문법, archive member 연쇄, 제거된 section 목록을 읽고 SRAM을 어느 object가 쓰는지 찾는 법을 실제 STM32L011 map으로 설명합니다."
series: "Modern Embedded Recipes"
seriesOrder: 32
tags: [recipes, toolchain, mapfile]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"맵 파일은 링커가 무엇을 어디에 두었고, 왜 넣었고, 무엇을 버렸는지 적은 기록입니다."**

## 어떤 상황에서 쓰나

- SRAM·Flash를 어느 object의 어느 section이 쓰는지 확인
- 의도와 다른 영역에 변수가 배치된 경우 추적
- `--gc-sections` 뒤 무엇이 살아남고 무엇이 버려졌는지 확인
- Static library 중 어떤 object가 실제로 들어갔고, 누가 끌어왔는지 파악

linker script의 `MEMORY`·`SECTIONS` 문법은 [링커 스크립트 기초](/blog/embedded/modern-recipes/part3-04-linker-script-basics)를 읽었다고 가정합니다.

## 핵심 개념

map 형식 설명은 GNU binutils 2.45의 ld 기준입니다. 옵션은 [ld 2.45 Options](https://sourceware.org/binutils/docs-2.45/ld/Options.html)를, 출력 형식은 map을 찍는 소스 [`ld/ldlang.c`](https://sourceware.org/git/?p=binutils-gdb.git;a=blob;f=ld/ldlang.c;hb=binutils-2_45)와 [`ld/ldmain.c`](https://sourceware.org/git/?p=binutils-gdb.git;a=blob;f=ld/ldmain.c;hb=binutils-2_45)(태그 `binutils-2_45`)를 따릅니다.

### 맵 파일 생성

```bash
arm-none-eabi-gcc -c -ffunction-sections -fdata-sections main.c -o main.o
arm-none-eabi-gcc -c -ffunction-sections -fdata-sections gpio.c -o gpio.o
arm-none-eabi-gcc -c startup.s -o startup.o
arm-none-eabi-gcc -T app.ld -Wl,--gc-sections -Wl,-Map=app.map \
    startup.o main.o gpio.o libdrv.a -o app.elf
```

`-Map=파일`은 `-M`(`--print-map`)과 같은 link map을 그 파일에 씁니다. map의 input section 줄은 그 section을 낸 입력 파일의 이름을 찍으므로(`ldlang.c`의 `print_input_section`), 컴파일을 `-c -o main.o`로 따로 해야 map에 `main.o`가 나옵니다. `gcc main.c gpio.c -o app.elf`처럼 한 번에 컴파일·링크하면 gcc가 ld에 넘기는 object는 링크 뒤 지워지는 임시 파일이라([GCC 14.2 Developer Options](https://gcc.gnu.org/onlinedocs/gcc-14.2.0/gcc/Developer-Options.html)의 `-save-temps`), map의 파일 열에도 그 임시 파일 이름이 찍히고 아래의 파일 이름 검색이 맞지 않습니다.

`-ffunction-sections`·`-fdata-sections`는 함수·데이터마다 그 이름이 붙은 section을 따로 만들게 합니다([GCC 14.2 Optimize Options](https://gcc.gnu.org/onlinedocs/gcc-14.2.0/gcc/Optimize-Options.html)). 이 옵션을 주면 `main`은 `.text`가 아니라 `.text.main`이라는 input section으로 나오고, `--gc-sections`가 함수 단위로 지울 수 있게 됩니다.

### 실제 예시 map

이 글의 발췌는 공개 저장소 [fduignan/stm32l011_nucleo_RTC_Wakeup](https://github.com/fduignan/stm32l011_nucleo_RTC_Wakeup)에 커밋된 [`main.map`](https://github.com/fduignan/stm32l011_nucleo_RTC_Wakeup/blob/master/main.map)을 그대로 옮긴 것입니다(저장소에 태그가 없어 `master` 브랜치를 가리킵니다). 이 프로젝트의 [`Makefile`](https://github.com/fduignan/stm32l011_nucleo_RTC_Wakeup/blob/master/Makefile)은 `init.c`·`serial.c`·`main.c`를 `-c`로 따로 컴파일하고, `arm-none-eabi-ld`로 `-lgcc`, `--cref`, `-Map main.map`을 주어 링크합니다. `-ffunction-sections`와 `--gc-sections`는 쓰지 않습니다. map의 libgcc 경로로 보아 GCC 5.3.1의 `armv6-m` 라이브러리를 썼고, [linker script](https://github.com/fduignan/stm32l011_nucleo_RTC_Wakeup/blob/master/linker_script.ld)는 `flash`(16 KiB)와 `ram`(2 KiB) 두 영역을 둡니다.

### 절 순서

공유 라이브러리 없이 정적으로 링크하는 펌웨어라면 ld 2.45의 map 파일에는 아래 절이 이 순서로 나옵니다.

1. `Archive member included to satisfy reference by file (symbol)` — archive에서 꺼낸 object마다, 그 object를 끌어온 파일과 심볼. archive에서 꺼낸 object가 있을 때만 찍힙니다.
2. `Allocating common symbols` — common 심볼의 이름·크기·정의 파일. common 심볼은 `-fcommon`으로 컴파일한 C 코드의 초기값 없는 전역 변수 정의에서 생깁니다. GCC 10부터 기본이 `-fno-common`이고([GCC 10 Changes](https://gcc.gnu.org/gcc-10/changes.html)), 이때 그런 변수는 `.bss`에 들어갑니다([GCC 14.2 Code Gen Options](https://gcc.gnu.org/onlinedocs/gcc-14.2.0/gcc/Code-Gen-Options.html)). 그래서 GCC 10 이후 기본 옵션으로 빌드했다면 이 절은 나오지 않습니다.
3. `Discarded input sections` — 버려지거나 garbage collection으로 제거된 input section. `--print-map-discarded`가 기본으로 켜져 있어서 따로 옵션을 주지 않아도 나옵니다. 제거된 section이 하나도 없으면 이 헤더 대신 `There are no discarded input sections` 한 줄이 찍힙니다(`ldlang.c`의 `lang_map`).
4. `Memory Configuration` — linker script의 `MEMORY` 영역 이름·시작 주소·길이·속성.
5. `Linker script and memory map` — `LOAD` 줄, output section, input section, 심볼, 스크립트의 대입문.
6. `Cross Reference Table` — `--cref`를 줬을 때만, map 뒤에 붙습니다(`ldmain.c`에서 `lang_map` 다음에 `output_cref`를 부름).

위 예시 map은 1·2·4·5·6을 이 순서로 담고 있고 3번의 헤더도, 그 대신 찍히는 한 줄도 없습니다. 2016년에 커밋된 map이라 ld 2.45보다 앞선 판이 만든 것이고, `--no-print-map-discarded` 옵션은 2.33에서 생겼습니다([ld 2.45 NEWS](https://sourceware.org/git/?p=binutils-gdb.git;a=blob;f=ld/NEWS;hb=binutils-2_45)).

`Memory Configuration` 표에는 영역이 *얼마나 찼는지*가 없습니다. 영역별 사용량은 다음 절의 output section 주소·크기에서 계산하거나, 링커에 `--print-memory-usage`를 주면 `MEMORY` 영역마다 사용량·전체 크기·사용률을 한 줄씩 출력합니다([ld 2.45 Options](https://sourceware.org/binutils/docs-2.45/ld/Options.html)).

### Linker script and memory map

예시 map의 24-40행입니다. `.text`의 나머지 input section은 뺐습니다.

```text
Linker script and memory map

LOAD init.o
LOAD serial.o
LOAD main.o
LOAD /usr/local/gcc-arm-none-eabi/lib/gcc/arm-none-eabi/5.3.1/armv6-m/libgcc.a
                0x08000000                . = ORIGIN (flash)

.text           0x08000000      0xd3c
 *(.vectors)
 .vectors       0x08000000       0xb8 init.o
                0x08000000                Vectors
 *(.text)
 .text          0x080000b8       0x7c init.o
                0x080000b8                init
                0x0800012c                Default_Handler
 .text          0x08000134      0x5d8 serial.o
                0x08000134                ReadCom
```

같은 map의 96-128행입니다.

```text
.rodata         0x08000d3c        0xb
 .rodata        0x08000d3c        0xb main.o
                0x20000000                . = ORIGIN (ram)

.data           0x20000000        0x0 load address 0x08000d47
                0x08000d47                INIT_DATA_VALUES = LOADADDR (.data)
                0x20000000                INIT_DATA_START = .
 *(.data)
 .data          0x20000000        0x0 init.o
 .data          0x20000000        0x0 serial.o
 .data          0x20000000        0x0 main.o
 .data          0x20000000        0x0 /usr/local/gcc-arm-none-eabi/lib/gcc/arm-none-eabi/5.3.1/armv6-m/libgcc.a(_divsi3.o)
 .data          0x20000000        0x0 /usr/local/gcc-arm-none-eabi/lib/gcc/arm-none-eabi/5.3.1/armv6-m/libgcc.a(_dvmd_tls.o)
                0x20000000                INIT_DATA_END = .
                0x20000000                BSS_START = .

.igot.plt       0x20000000        0x0 load address 0x08000d47
 .igot.plt      0x20000000        0x0 init.o

.bss            0x20000000       0xa4 load address 0x08000d47
 *(.bss)
 .bss           0x20000000        0x0 init.o
 .bss           0x20000000        0x0 serial.o
 .bss           0x20000000        0x0 main.o
 .bss           0x20000000        0x0 /usr/local/gcc-arm-none-eabi/lib/gcc/arm-none-eabi/5.3.1/armv6-m/libgcc.a(_divsi3.o)
 .bss           0x20000000        0x0 /usr/local/gcc-arm-none-eabi/lib/gcc/arm-none-eabi/5.3.1/armv6-m/libgcc.a(_dvmd_tls.o)
 COMMON         0x20000000       0xa4 serial.o
                0x20000000                ComError
                0x20000004                ComRXBuffer
                0x20000050                ComTXBuffer
                0x2000009c                ComOpen
                0x200000a0                ComBusy
                0x200000a4                BSS_END = .
```

줄은 다음처럼 읽습니다.

- **`LOAD` 줄**: 링크에 들어간 입력 파일. archive는 파일 전체가 한 줄로 나오고, 그중 실제로 꺼낸 member는 `Archive member` 절에서 봅니다.
- **output section 줄**(맨 앞에 공백 없음): 이름, VMA, 크기. VMA와 LMA가 다를 때만 `load address`가 붙습니다(`ldlang.c`의 `print_output_section_statement`). `.data`는 실행 중에는 `ram`의 `0x20000000`에 있고, 초기값은 Flash `0x08000d47`에 실립니다.
- **패턴 줄**(` *(.text)`): linker script의 input section 패턴이 그대로 찍히고, 그 아래에 패턴에 걸린 input section이 나옵니다.
- **input section 줄**(공백 하나로 시작): input section 이름, 주소, 크기, 그 section을 낸 파일. archive member는 `libgcc.a(_divsi3.o)`처럼 archive 경로와 member 이름으로 찍힙니다. common 심볼은 `COMMON`이라는 이름의 input section으로 모입니다.
- **심볼 줄**: 그 input section에 정의된 global 심볼과 주소. `static` 함수 같은 local 심볼은 기본으로 찍히지 않고, `--print-map-locals`를 줘야 `(local)` 표시와 함께 나옵니다([ld 2.45 Options](https://sourceware.org/binutils/docs-2.45/ld/Options.html)).
- **대입문 줄**: `INIT_DATA_START = .`처럼 linker script에서 정의한 심볼과 그 값. startup 코드가 `.data`를 복사하고 `.bss`를 지울 때 쓰는 경계가 여기 나옵니다.

`.bss`에도 `load address`가 붙어 있습니다. 이 linker script는 `.bss`에 `AT>`를 주지 않았고, 그러면 ld는 같은 영역에 앞서 놓인 마지막 section과 VMA−LMA 차이가 같도록 LMA를 정합니다([ld 2.45 Output Section LMA](https://sourceware.org/binutils/docs-2.45/ld/Output-Section-LMA.html)). 이 맵에서 그 section은 `.data` 뒤의 `.igot.plt`이고, 둘의 VMA−LMA 차이는 같습니다. `.bss`는 `SHT_NOBITS` section이라 파일에 내용이 없으므로([System V gABI Sections](https://www.sco.com/developers/gabi/latest/ch4.sheader.html)) 이 LMA에서 Flash를 차지하지 않습니다.

주소와 크기가 이어지는지 따라가면 배치가 맞는지 확인됩니다. `.text`는 0x08000000 + 0xd3c = 0x08000d3c에서 끝나고 거기서 `.rodata`가 시작합니다. `.rodata` 끝 0x08000d3c + 0xb = 0x08000d47이 `.data`의 load address입니다. `COMMON`의 심볼도 앞 심볼 주소에 크기를 더한 자리에서 시작합니다(`ComRXBuffer` 0x20000004 + 0x4c = 0x20000050 = `ComTXBuffer`).

이 값으로 영역 사용량을 계산하면 `flash`는 `.text` 0xd3c + `.rodata` 0xb + `.data` 초기값 0x0 = 0xd47(3,399바이트, 16 KiB의 20.7%), `ram`은 `.data` 0x0 + `.bss` 0xa4 = 0xa4(164바이트, 2 KiB의 8.0%)입니다.

### Archive member 절

예시 map의 1-6행입니다.

```text
Archive member included to satisfy reference by file (symbol)

/usr/local/gcc-arm-none-eabi/lib/gcc/arm-none-eabi/5.3.1/armv6-m/libgcc.a(_divsi3.o)
                              serial.o (__aeabi_idiv)
/usr/local/gcc-arm-none-eabi/lib/gcc/arm-none-eabi/5.3.1/armv6-m/libgcc.a(_dvmd_tls.o)
                              /usr/local/gcc-arm-none-eabi/lib/gcc/arm-none-eabi/5.3.1/armv6-m/libgcc.a(_divsi3.o) (__aeabi_idiv0)
```

각 항목은 *꺼낸 object* 다음에 *그 object를 꺼내게 한 심볼을 참조한 파일*과 *심볼*을 적습니다(`ldmain.c`의 `add_archive_element`). 꺼낸 object를 찍은 문자열(`archive(member)`)이 29자 이상이면 참조 파일 열이 다음 줄로 내려가서, 이 예시처럼 한 항목이 두 줄이 됩니다.

둘째 항목의 참조 파일 자리에 archive member가 있다는 점이 핵심입니다. `_dvmd_tls.o`는 이 프로젝트의 코드가 직접 부른 적이 없고, `serial.o`의 `__aeabi_idiv` 참조 때문에 들어온 `_divsi3.o`가 `__aeabi_idiv0`을 참조해서 들어왔습니다. 예상하지 못한 library object가 보이면 이 열을 거꾸로 따라가 내 코드의 어느 참조에서 시작됐는지 찾습니다. 여기서는 `serial.o`의 정수 나눗셈입니다.

ld는 archive를 명령줄에 나온 자리에서 검색해, 그 앞의 object가 남긴 미정의 심볼을 정의하는 member를 꺼냅니다([ld 2.45 Options](https://sourceware.org/binutils/docs-2.45/ld/Options.html)의 `-l` 설명). ELF 대상에서는 꺼낸 member가 새 미정의 심볼을 남기면 archive 심볼 표를 다시 훑으므로, 그 심볼도 같은 archive에서 채워집니다([`bfd/elflink.c`](https://sourceware.org/git/?p=binutils-gdb.git;a=blob;f=bfd/elflink.c;hb=binutils-2_45)의 `elf_link_add_archive_symbols`, `loop`가 참인 동안 반복). `_dvmd_tls.o`가 그렇게 들어온 경우입니다. archive의 모든 object를 넣는 것은 `--whole-archive`를 줬을 때입니다.

### 제거된 section — `Discarded input sections`와 `--print-gc-sections`

`--gc-sections`로 제거된 input section은 ld 2.45 map 파일의 `Discarded input sections` 절에 이름·크기·파일과 함께 나옵니다(`ldlang.c`의 `lang_map`이 `print_input_section`을 discarded 모드로 부름). 같은 목록을 링크하면서 바로 보고 싶으면 `--print-gc-sections`를 줍니다. 이 옵션은 `--gc-sections`가 켜져 있을 때만 동작하고, 목록을 stderr로 출력합니다([ld 2.45 Options](https://sourceware.org/binutils/docs-2.45/ld/Options.html)).

```bash
arm-none-eabi-gcc -T app.ld -Wl,--gc-sections -Wl,--print-gc-sections \
    startup.o main.o gpio.o libdrv.a -o app.elf
```

각 줄의 형식은 `removing unused section '<section>' in file '<file>'`입니다([`bfd/elflink.c`](https://sourceware.org/git/?p=binutils-gdb.git;a=blob;f=bfd/elflink.c;hb=binutils-2_45)). 반대로 지워지면 안 되는 section(벡터 테이블 등)이 이 목록에 있으면 linker script에서 `KEEP`으로 묶어야 합니다. `KEEP`은 [링커 스크립트 기초](/blog/embedded/modern-recipes/part3-04-linker-script-basics)에서 다룹니다.

## 코드 / 실제 사용 예

### 한 object가 쓰는 SRAM 찾기

input section 줄은 파일 이름으로 끝나므로, 한 object의 기여는 파일 이름으로 찾습니다. 다만 map 전체를 grep하면 `Archive member` 절의 참조 파일 열, `LOAD` 줄, ld 2.45라면 `Discarded input sections`의 줄(제거된 section의 크기가 그대로 적혀 있음)까지 걸립니다. 예시 map에서는 `OUTPUT(main.elf elf32-littlearm)` 줄 뒤에 `.debug_*`·`.comment`·`.ARM.attributes` section과 `Cross Reference Table`이 이어지고, 여기에도 `serial.o`로 끝나는 줄이 있습니다. 그래서 `Linker script and memory map` 헤더부터 `OUTPUT(` 줄까지만 보고 `LOAD` 줄을 뺍니다.

```bash
sed -n '/^Linker script and memory map/,/^OUTPUT(/p' main.map \
    | grep -v '^LOAD' | grep 'serial\.o$'
```

예시 map에서 이 범위의 `serial.o` 줄은 `.text` 0x5d8, `.data` 0x0, `.bss` 0x0, `COMMON` 0xa4입니다. `ram`에 올라가는 것은 `.data`·`.bss` 아래 줄이므로 `serial.o`의 SRAM은 0xa4로, 앞에서 계산한 `ram` 사용량 164바이트 전부입니다. 그중 `ComRXBuffer`와 `ComTXBuffer`가 0x4c(76바이트)씩 152바이트(92.7%)이므로, SRAM을 줄이려면 이 두 버퍼의 크기부터 봅니다. `COMMON` 줄은 크기를 합쳐서만 보여 주므로, 버퍼별 크기는 `Allocating common symbols` 절(예시 map 8-15행)에서 읽습니다.

```text
Allocating common symbols
Common symbol       size              file

ComError            0x4               serial.o
ComRXBuffer         0x4c              serial.o
ComTXBuffer         0x4c              serial.o
ComOpen             0x4               serial.o
ComBusy             0x4               serial.o
```

같은 코드를 GCC 10 이후 기본값(`-fno-common`)으로 빌드하면 이 변수들은 `COMMON`이 아니라 `serial.o`의 `.bss` input section 줄에 크기가 잡히고, `-fdata-sections`까지 주면 변수 이름이 붙은 input section이 변수마다 따로 생깁니다.

### ELF 도구와 맞춰 볼 때

크기 순 심볼 목록(`nm --size-sort`)과 section 크기(`size -A`)를 ELF에서 직접 읽는 법은 [ELF 파일 구조](/blog/embedded/modern-recipes/part3-03-elf-format)에, bloaty 같은 크기 분석 도구는 [임베디드 코드 크기 최적화](/blog/embedded/modern-recipes/part8-10-code-size-optimization)에 있습니다. map과 숫자를 맞춰 볼 때는 `size -A`의 `Total`이 아니라 section별 줄을 비교합니다. `size -A`는 flag가 있는 section을 모두 한 번씩 더하므로([`binutils/size.c`](https://sourceware.org/git/?p=binutils-gdb.git;a=blob;f=binutils/size.c;hb=binutils-2_45)의 `sysv_internal_printer`), `Total`에는 `.comment`·`.ARM.attributes`·`.debug_*` 같은 non-alloc section이 들어가고, Flash(초기값)와 SRAM을 둘 다 차지하는 `.data`는 한 번만 들어갑니다.

## 자주 보는 함정

> ⚠️ map 파일을 만들지 않는 빌드

`-Wl,-Map=`이 링크 옵션에 없으면 map 파일이 생기지 않습니다. CMake라면 `target_link_options(app PRIVATE -Wl,-Map=app.map)`처럼 링크 옵션에 넣습니다([CMake 3.31 target_link_options](https://cmake.org/cmake/help/v3.31/command/target_link_options.html)). 빌드 시스템 전체 설정은 [Make·CMake 크로스 컴파일](/blog/embedded/modern-recipes/part3-11-make-cmake-cross)에서 다룹니다.

> ⚠️ archive를 object보다 앞에 둠

ld는 archive를 명령줄에 나온 그 자리에서만 검색하고, archive 뒤에 나오는 object의 미정의 심볼 때문에 다시 검색하지 않습니다([ld 2.45 Options](https://sourceware.org/binutils/docs-2.45/ld/Options.html)의 `-l` 설명). `libdrv.a`를 `main.o` 앞에 두면 `main.o`가 부르는 `libdrv.a`의 함수가 정의되지 않은 채 남고, `Archive member` 절에도 그 member가 나오지 않습니다. 위 명령처럼 archive는 그것을 쓰는 object 뒤에 둡니다.

## 정리

- map에서 파일별로 찾으려면 컴파일을 `-c -o 파일.o`로 따로 하고 `-Wl,-Map=`으로 map을 만듭니다.
- 영역 사용량은 output section 줄의 주소·크기와 `load address`에서 계산하고, `size -A`와는 `Total`이 아니라 section별로 맞춥니다.
- 예상하지 못한 library object는 `Archive member` 절의 참조 파일 열을 거꾸로 따라가 내 코드의 참조까지 찾습니다.
- 한 object의 SRAM은 `Linker script and memory map` 절 안의 `.data`·`.bss`·`COMMON` 줄에서만 모읍니다.

다음 편에서는 **Make·CMake 크로스 컴파일**을 다룹니다. map 파일 생성 같은 링크 옵션을 빌드 시스템에 고정하는 방법입니다.

## 관련 항목

- [3-03: ELF 파일 구조 분석](/blog/embedded/modern-recipes/part3-03-elf-format)
- [3-04: 링커 스크립트 기초](/blog/embedded/modern-recipes/part3-04-linker-script-basics)
- [3-08: 임베디드 메모리 레이아웃](/blog/embedded/modern-recipes/part3-08-memory-layout)
- [3-09: 임베디드 컴파일러 최적화 분석](/blog/embedded/modern-recipes/part3-09-compiler-optimization)
- [3-11: Make·CMake 크로스 컴파일](/blog/embedded/modern-recipes/part3-11-make-cmake-cross)
- [8-10: 임베디드 코드 크기 최적화](/blog/embedded/modern-recipes/part8-10-code-size-optimization)
- [Embedded Debugging 5장: ELF와 MAP 파일 분석](/blog/tools/debugging/embedded/chapter05-elf-map) — LMA/VMA와 startup 코드, map으로 메모리 부족 진단
