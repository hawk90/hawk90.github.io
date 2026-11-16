---
title: "ELF 포맷 분해 — Section·Segment·Symbol Table 구조 추적"
slug: "tools/debugging/dwarf-elf/chapter01-elf-overview"
date: 2026-05-23T09:01:00
description: "ELF 헤더, Program Header / Section Header, dynamic linking, build-id."
tags: [elf, binary, linker]
series: "DWARF and ELF Internals"
seriesOrder: 1
draft: false
topics: ["tools", "tools/debugging"]
---

DWARF를 깊이 다루기 전에 그 컨테이너인 *ELF*부터 봅니다. Linux·BSD 계열과 많은 임베디드 툴체인이 쓰는 오브젝트 파일 형식이고, 링크에 필요한 정보와 로드에 필요한 정보를 한 파일에 나눠 담습니다. 디버그 정보·심볼·실행 코드·동적 링크 메타데이터가 모두 이 안에 들어갑니다.

이 시리즈는 ELF에서 출발해 주요 DWARF 섹션의 역할과 인코딩을 살펴봅니다. 이 장의 출력은 두 곳에서 얻었습니다. 하나는 Debian 13(arm64) QEMU 게스트의 GNU binutils 2.44·GCC 14.2·glibc 2.41이고, 다른 하나는 macOS의 Homebrew LLVM 23.1.5로 만든 x86-64 오브젝트입니다. 필드 정의는 [ELF gABI 4.3 draft](https://gabi.xinuos.com/elf/00-foreword.html)의 장 번호로 인용합니다.

:::tldr
**Executable and Linkable Format**. 한 파일이 두 시각을 가집니다. 링커가 보는 *섹션* 모음과, 로더가 보는 *세그먼트* 모음입니다.
:::

## 역사

gABI의 Foreword는 ELF를 System V Release 4(SVR4) ABI의 일부로 소개합니다. SVR4 ABI는 기계 독립 부분인 generic ABI(gABI)와 아키텍처별 psABI 보충서로 나뉘고, ELF 명세는 그중 gABI의 4장 "Object Files"와 5장 "Program Loading and Dynamic Linking"을 대신하는 별도 문서로 관리됩니다. 그래서 필드의 의미는 gABI에서, 재배치 타입과 레지스터 번호 같은 기계별 값은 x86-64·AArch64 psABI에서 찾습니다.

설계 의도는 세 가지로 읽힙니다.

1. **확장 가능** — gABI §3.3 "Section Type"은 OS·프로세서별 섹션 타입 범위(`SHT_LOOS`~`SHT_HIPROC`)를 예약하고, §3.8 "Rules for Linking Unrecognized Sections"는 링커가 모르는 타입을 만났을 때의 규칙을 둡니다.
2. **링크와 로드의 분리** — 같은 파일 안에 섹션 헤더(링크용)와 프로그램 헤더(로드용)를 따로 둡니다.
3. **재배치 정보** — `.o`(relocatable)가 재배치 항목을 들고 있어 링커가 실행 파일이나 `.so`로 합칠 수 있습니다.

## 한 파일 — 두 시각

![ELF 구조 — 두 시각](/images/blog/tools/diagrams/elf-structure.svg)

- **Program Headers** — *Segment*를 정의합니다. 로더는 이 표대로 파일을 메모리에 매핑합니다.
- **Section Headers** — *Section*을 정의합니다. 링커는 이 단위로 입력을 모으고 재배치합니다.

같은 바이트를 두 시각으로 보는 것이라서, 한 세그먼트가 여러 섹션을 포함합니다. 책에 비유하면 섹션은 장(chapter) 목차이고, 세그먼트는 제본할 때 묶는 인쇄 묶음(signature)입니다. 아래 `readelf -l` 출력의 "Section to Segment mapping"이 이 대응을 직접 보여 줍니다.

## readelf로 들여다보기

이 장의 실행 파일 예시는 Debian 13 arm64 게스트의 `/usr/bin/ls`(coreutils 9.7-3)입니다. 먼저 `file`로 정체를 봅니다.

```text
$ file /usr/bin/ls
/usr/bin/ls: ELF 64-bit LSB pie executable, ARM aarch64, version 1 (SYSV), dynamically linked, interpreter /lib/ld-linux-aarch64.so.1, BuildID[sha1]=87a7eadc711cd002f7b00ba923179e5713498159, for GNU/Linux 3.7.0, stripped
```

## ELF Header 구조

ELF 헤더는 파일 맨 앞 64바이트(ELF64)이고, 나머지 모든 표의 위치를 알려 주는 색인입니다. 구조는 gABI §2.1 "Contents of the ELF Header"의 `Elf64_Ehdr`입니다.

```c
typedef struct {
    unsigned char e_ident[EI_NIDENT];   // 16 bytes magic + 식별 정보
    Elf64_Half    e_type;                // 파일 종류
    Elf64_Half    e_machine;             // 아키텍처
    Elf64_Word    e_version;
    Elf64_Addr    e_entry;               // 진입점 주소
    Elf64_Off     e_phoff;               // Program Header 시작 오프셋
    Elf64_Off     e_shoff;               // Section Header 시작 오프셋
    Elf64_Word    e_flags;
    Elf64_Half    e_ehsize;              // 이 헤더의 크기
    Elf64_Half    e_phentsize;           // Program Header 한 개의 크기
    Elf64_Half    e_phnum;               // Program Header 개수
    Elf64_Half    e_shentsize;
    Elf64_Half    e_shnum;
    Elf64_Half    e_shstrndx;            // section name 문자열 테이블 인덱스
} Elf64_Ehdr;
```

같은 필드를 `readelf -h`가 풀어 보여 줍니다.

```text
$ readelf -h /usr/bin/ls
ELF Header:
  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00
  Class:                             ELF64
  Data:                              2's complement, little endian
  Version:                           1 (current)
  OS/ABI:                            UNIX - System V
  ABI Version:                       0
  Type:                              DYN (Position-Independent Executable file)
  Machine:                           AArch64
  Version:                           0x1
  Entry point address:               0x65c0
  Start of program headers:          64 (bytes into file)
  Start of section headers:          197720 (bytes into file)
  Flags:                             0x0
  Size of this header:               64 (bytes)
  Size of program headers:           56 (bytes)
  Number of program headers:         12
  Size of section headers:           64 (bytes)
  Number of section headers:         29
  Section header string table index: 28
```

### e_ident[0..15]

Magic 줄의 16바이트가 `e_ident`입니다(gABI §2.2 "ELF Identification"). 위 `ls`는 `7f 45 4c 46`(`\x7fELF`), `02`(ELF64), `01`(little endian), `01`(version), `00`(OS ABI)입니다.

| 인덱스 | 이름 | 값 |
|--------|------|-----|
| 0..3 | `EI_MAG0..3` | `0x7f 'E' 'L' 'F'` |
| 4 | `EI_CLASS` | 1 = ELF32, 2 = ELF64 |
| 5 | `EI_DATA` | 1 = little endian, 2 = big endian |
| 6 | `EI_VERSION` | 1 |
| 7 | `EI_OSABI` | 0 = `ELFOSABI_NONE`, 3 = `ELFOSABI_GNU`(옛 이름 `ELFOSABI_LINUX`), 9 = `ELFOSABI_FREEBSD` (gABI Appendix B) |
| 8 | `EI_ABIVERSION` | OSABI별 의미 |
| 9..15 | `EI_PAD` | 0 |

Linux 실행 파일이라고 OSABI가 3인 것은 아닙니다. 위 `ls`도 0(`UNIX - System V`)입니다.

### e_type

| 값 | 의미 |
|----|------|
| 1 (REL) | `.o` 재배치 가능 파일 |
| 2 (EXEC) | 고정 주소 실행 파일. 동적 링크 실행 파일도 EXEC일 수 있습니다 |
| 3 (DYN) | 공유 오브젝트. PIE 실행 파일도 여기에 속합니다 |
| 4 (CORE) | core dump |

Debian 13의 GCC 14.2는 기본으로 PIE를 만듭니다. 같은 두 파일(`sections.c`, `ext.c`, 아래 직접 확인 절)을 옵션만 바꿔 링크하고 `.so`도 하나 만들어 비교했습니다.

| 빌드 | `readelf -h` Type | `file` 5.46 |
|------|-------------------|-------------|
| `gcc` (기본) | `DYN (Position-Independent Executable file)` | `pie executable` |
| `gcc -no-pie` | `EXEC (Executable file)` | `executable` |
| `gcc -shared -fPIC` | `DYN (Shared object file)` | `shared object` |

PIE와 `.so`는 `e_type`이 모두 3이라서 두 도구는 다른 단서로 구분합니다. PIE의 `.dynamic`에는 `FLAGS_1`에 `PIE` 비트가 있고(아래 `readelf -d` 출력), 프로그램 인터프리터(`PT_INTERP`)도 있습니다.

### e_machine

gABI Appendix A "Assigned Machine Values"의 값입니다.

| 값 | 이름 |
|----|------|
| 3 | `EM_386` |
| 40 | `EM_ARM` (32-bit) |
| 62 | `EM_X86_64` |
| 183 | `EM_AARCH64` |
| 243 | `EM_RISCV` |

## Program Headers

로더가 읽는 표입니다. `ls`에는 12개가 있습니다.

```text
$ readelf -lW /usr/bin/ls
...
  Type           Offset   VirtAddr           PhysAddr           FileSiz  MemSiz   Flg Align
  PHDR           0x000040 0x0000000000000040 0x0000000000000040 0x0002a0 0x0002a0 R   0x8
  INTERP         0x000324 0x0000000000000324 0x0000000000000324 0x00001b 0x00001b R   0x1
      [Requesting program interpreter: /lib/ld-linux-aarch64.so.1]
  LOAD           0x000000 0x0000000000000000 0x0000000000000000 0x024f58 0x024f58 R E 0x10000
  LOAD           0x02ef20 0x000000000003ef20 0x000000000003ef20 0x001390 0x002698 RW  0x10000
  DYNAMIC        0x02f908 0x000000000003f908 0x000000000003f908 0x000230 0x000230 RW  0x8
  NOTE           0x0002e0 0x00000000000002e0 0x00000000000002e0 0x000020 0x000020 R   0x8
  NOTE           0x000300 0x0000000000000300 0x0000000000000300 0x000024 0x000024 R   0x4
  NOTE           0x024f38 0x0000000000024f38 0x0000000000024f38 0x000020 0x000020 R   0x4
  GNU_PROPERTY   0x0002e0 0x00000000000002e0 0x00000000000002e0 0x000020 0x000020 R   0x8
  GNU_EH_FRAME   0x020c8c 0x0000000000020c8c 0x0000000000020c8c 0x0009fc 0x0009fc R   0x4
  GNU_STACK      0x000000 0x0000000000000000 0x0000000000000000 0x000000 0x000000 RW  0x10
  GNU_RELRO      0x02ef20 0x000000000003ef20 0x000000000003ef20 0x0010e0 0x0010e0 R   0x1

 Section to Segment mapping:
  Segment Sections...
   02     .note.gnu.property .note.gnu.build-id .interp .gnu.hash .dynsym .dynstr .gnu.version .gnu.version_r .rela.dyn .rela.plt .init .plt .text .fini .rodata .eh_frame_hdr .eh_frame .note.ABI-tag
   03     .init_array .fini_array .data.rel.ro .dynamic .got .data .bss
...
   11     .init_array .fini_array .data.rel.ro .dynamic .got
```

코드·읽기 전용 데이터 18개 섹션이 첫 `LOAD`(R E) 하나로, 쓰기 가능한 데이터 7개 섹션이 둘째 `LOAD`(RW) 하나로 묶였습니다.

### Program Header 구조

gABI §7.1 "Program Header Entry"의 `Elf64_Phdr`입니다. ELF64에서는 `p_flags`가 `p_type` 바로 뒤로 옮겨 정렬을 맞춥니다.

```c
typedef struct {
    Elf64_Word  p_type;
    Elf64_Word  p_flags;     // PF_R=4, PF_W=2, PF_X=1
    Elf64_Off   p_offset;    // 파일 안의 위치
    Elf64_Addr  p_vaddr;     // 로드된 가상 주소
    Elf64_Addr  p_paddr;     // 물리 주소 (베어메탈 LMA)
    Elf64_Xword p_filesz;    // 파일 안의 크기
    Elf64_Xword p_memsz;     // 메모리에서의 크기
    Elf64_Xword p_align;
} Elf64_Phdr;
```

### p_type 카탈로그

`PT_LOAD`~`PT_TLS`는 gABI §7.2 "Segment Types"에 있고, `PT_GNU_*`는 `PT_LOOS`~`PT_HIOS` 범위의 GNU 확장입니다.

| 값 | 의미 |
|----|------|
| PT_LOAD | 메모리에 매핑할 영역 |
| PT_DYNAMIC | `.dynamic` 섹션의 위치 (동적 링크 메타) |
| PT_INTERP | 프로그램 인터프리터 경로. 위 `ls`는 `/lib/ld-linux-aarch64.so.1` |
| PT_NOTE | `.note.*` 섹션 (build-id 등) |
| PT_PHDR | Program Header 자체 |
| PT_TLS | Thread Local Storage 템플릿 |
| PT_GNU_EH_FRAME | `.eh_frame_hdr` 위치 (unwind 이진 탐색 표, 5장) |
| PT_GNU_STACK | 스택 권한. `ls`는 `RW`로 X 비트가 없습니다 |
| PT_GNU_RELRO | 재배치 후 읽기 전용으로 바꿀 영역 |
| PT_GNU_PROPERTY | `.note.gnu.property` 위치. `ls`에는 AArch64 BTI·PAC 속성이 들어 있습니다 |

### LOAD 세그먼트의 디테일

gABI §7.2의 `PT_LOAD` 설명은 `p_memsz`가 `p_filesz`보다 크면 나머지 바이트를 0으로 정의합니다. `ls`의 둘째 `LOAD`는 FileSiz 0x1390, MemSiz 0x2698이고, 차이 0x1308은 `readelf -S`에 나오는 `.bss`의 크기(0x1308)와 같습니다. `.bss`는 `NOBITS`라서 파일에는 자리가 없고 로드할 때 0으로 채워집니다.

`p_paddr`에 대해 gABI는 System V가 응용 프로그램의 물리 주소를 무시하므로 실행 파일·공유 오브젝트에서는 내용이 정해지지 않는다고 적습니다. 위 `ls`도 `PhysAddr`가 `VirtAddr`와 같습니다. 베어메탈 링커 스크립트에서는 이 필드에 flash 적재 주소(LMA)를 넣어 `.data` 초기값을 flash에 두는 데 쓰는데, 이 흐름은 [Embedded Debugging Ch 5](/blog/tools/debugging/embedded/chapter05-elf-map)에서 다룹니다.

### RELRO

`GNU_RELRO`는 `LOAD (RW)` 세그먼트의 앞부분을 덮습니다. `ls`에서는 offset 0x2ef20부터 0x10e0바이트이고, 매핑 11번이 `.init_array .fini_array .data.rel.ro .dynamic .got`입니다. 같은 RW 세그먼트의 `.data`와 `.bss`는 RELRO 밖에 있어 계속 쓸 수 있습니다.

동적 로더는 재배치를 마친 뒤 이 범위를 `mprotect`로 읽기 전용으로 바꿉니다. 그러면 GOT 덮어쓰기를 이용한 공격이 막히는데, lazy binding을 쓰는 `.got.plt`가 RELRO 밖에 남아 있으면(Partial RELRO) 그 부분은 보호되지 않습니다. 아래 PLT/GOT 절에서 Debian 기본 빌드와 `ls`의 차이를 봅니다.

## Section Headers

링커가 읽는 표입니다. `ls`는 29개 섹션을 가집니다. 앞부분과 끝부분만 보입니다.

```text
$ readelf -SW /usr/bin/ls
  [Nr] Name              Type            Address          Off    Size   ES Flg Lk Inf Al
  [ 0]                   NULL            0000000000000000 000000 000000 00      0   0  0
  [ 1] .note.gnu.property NOTE            00000000000002e0 0002e0 000020 00   A  0   0  8
  [ 2] .note.gnu.build-id NOTE            0000000000000300 000300 000024 00   A  0   0  4
  [ 3] .interp           PROGBITS        0000000000000324 000324 00001b 00   A  0   0  1
  [ 4] .gnu.hash         GNU_HASH        0000000000000340 000340 000040 00   A  5   0  8
  [ 5] .dynsym           DYNSYM          0000000000000380 000380 000d20 18   A  6   3  8
...
  [13] .text             PROGBITS        0000000000004480 004480 017694 00  AX  0   0 64
...
  [24] .data             PROGBITS        0000000000040000 030000 0002b0 00  WA  0   0 16
  [25] .bss              NOBITS          00000000000402b0 0302b0 001308 00  WA  0   0 16
  [26] .gnu_debugaltlink PROGBITS        0000000000000000 0302b0 00004a 00      0   0  1
  [27] .gnu_debuglink    PROGBITS        0000000000000000 0302fc 000034 00      0   0  4
  [28] .shstrtab         STRTAB          0000000000000000 030330 000122 00      0   0  1
```

`.dynsym`의 `ES` 18은 엔트리 크기 0x18(24)바이트이고, `Lk` 6은 이름 문자열이 6번 `.dynstr`에 있다는 뜻입니다. `.symtab`과 `.debug_*`가 없는 대신 `.gnu_debuglink`·`.gnu_debugaltlink`가 있는데, Debian이 디버그 정보를 별도 패키지로 빼고 dwz로 공유 파일을 만든 흔적입니다(6장).

### Section Header 구조

gABI §3.2 "Section Header Table Entry"의 `Elf64_Shdr`입니다.

```c
typedef struct {
    Elf64_Word  sh_name;       // 섹션 이름 (.shstrtab 인덱스)
    Elf64_Word  sh_type;
    Elf64_Xword sh_flags;
    Elf64_Addr  sh_addr;       // VMA (메모리 주소)
    Elf64_Off   sh_offset;     // 파일 오프셋
    Elf64_Xword sh_size;
    Elf64_Word  sh_link;       // 의존하는 다른 섹션
    Elf64_Word  sh_info;
    Elf64_Xword sh_addralign;
    Elf64_Xword sh_entsize;    // 고정 크기 엔트리 (예: dynsym 24바이트)
} Elf64_Shdr;
```

### sh_type 카탈로그

`GNU_HASH`·`GNU_VERSYM`·`GNU_VERNEED`는 GNU 확장이고, 나머지는 gABI §3.3 "Section Type"에 있습니다.

| 값 | 의미 |
|----|------|
| NULL | 0번 (placeholder) |
| PROGBITS | 일반 데이터 (.text, .data, .rodata) |
| SYMTAB | 정적 심볼 테이블 (.symtab) |
| STRTAB | 문자열 테이블 (.strtab, .dynstr, .shstrtab) |
| RELA | relocation, addend 포함 (.rela.*) |
| REL | relocation, addend 없음 |
| HASH | 심볼 해시 테이블 (.hash) |
| DYNAMIC | 동적 링크 정보 (.dynamic) |
| NOTE | 노트 (.note.*) |
| NOBITS | 파일에 자리가 없음 (.bss) |
| INIT_ARRAY | 초기화 함수 포인터 배열 |
| FINI_ARRAY | 종료 함수 포인터 배열 |
| GNU_HASH | GNU 해시 (`.gnu.hash`) |
| GNU_VERSYM | 심볼 버전 인덱스 (`.gnu.version`) |
| GNU_VERNEED | 필요한 버전 (`.gnu.version_r`) |

### sh_flags

gABI §3.4 "Section Flags"의 값입니다. `readelf`의 `Flg` 열 문자(W·A·X·M·S·I·L·O·G·T·C)가 순서대로 이 비트입니다.

| 비트 | 의미 |
|------|------|
| 0x1 (WRITE) | 쓰기 가능 |
| 0x2 (ALLOC) | 실행 중 메모리를 차지함 |
| 0x4 (EXECINSTR) | 실행 가능 |
| 0x10 (MERGE) | 같은 내용을 병합할 수 있음 (`.debug_str`, `.comment`) |
| 0x20 (STRINGS) | NUL로 끝나는 문자열 모음 |
| 0x40 (INFO_LINK) | `sh_info`가 섹션 인덱스 (`.rela.*`) |
| 0x80 (LINK_ORDER) | 링크 순서 보존 |
| 0x100 (OS_NONCONFORMING) | OS별 처리 필요 |
| 0x200 (GROUP) | 섹션 그룹 구성원 |
| 0x400 (TLS) | thread-local |
| 0x800 (COMPRESSED) | `Elf64_Chdr` 압축 헤더로 시작하는 압축 섹션. 옛 GNU `.zdebug_*` 이름 방식과 다릅니다 (6장) |

`.debug_*` 섹션은 ALLOC이 없어서 로드되지 않습니다. `sections.o`의 `.debug_str`이 `MS`(MERGE+STRINGS)인 것은 링커가 여러 오브젝트의 같은 문자열을 합치게 하려는 표시입니다.

## Dynamic Linking — .dynamic

`.dynamic`은 `(d_tag, d_val 또는 d_ptr)` 쌍의 배열이고, 동적 로더 `ld.so`가 시작할 때 이 표를 읽어 라이브러리를 찾고 심볼을 묶습니다. `ls`의 31개 엔트리 중 일부입니다.

```text
$ readelf -dW /usr/bin/ls
Dynamic section at offset 0x2f908 contains 31 entries:
  Tag        Type                         Name/Value
 0x0000000000000001 (NEEDED)             Shared library: [libselinux.so.1]
 0x0000000000000001 (NEEDED)             Shared library: [libcap.so.2]
 0x0000000000000001 (NEEDED)             Shared library: [libc.so.6]
 0x0000000000000001 (NEEDED)             Shared library: [ld-linux-aarch64.so.1]
 0x000000000000000c (INIT)               0x3970
 0x000000000000000d (FINI)               0x1bb14
 0x0000000000000019 (INIT_ARRAY)         0x3ef20
...
 0x000000006ffffef5 (GNU_HASH)           0x340
 0x0000000000000005 (STRTAB)             0x10a0
 0x0000000000000006 (SYMTAB)             0x380
...
 0x0000000000000003 (PLTGOT)             0x3fb38
 0x0000000000000017 (JMPREL)             0x2ea8
...
 0x000000000000001e (FLAGS)              BIND_NOW
 0x000000006ffffffb (FLAGS_1)            Flags: NOW PIE
 0x000000006ffffffe (VERNEED)            0x17e8
...
```

| d_tag | 의미 |
|-------|------|
| DT_NEEDED | 의존 라이브러리 이름 |
| DT_PLTRELSZ / DT_PLTGOT / DT_JMPREL | PLT 재배치 크기·GOT 위치·PLT 재배치 위치 |
| DT_HASH / DT_GNU_HASH | 심볼 해시 표 (`DT_GNU_HASH`는 GNU 확장) |
| DT_STRTAB / DT_SYMTAB | 동적 문자열·심볼 테이블 |
| DT_RPATH / DT_RUNPATH | 라이브러리 검색 경로 (gABI §8.3은 `DT_RPATH`를 deprecated로 둡니다) |
| DT_INIT / DT_FINI, DT_INIT_ARRAY / DT_FINI_ARRAY | 초기화·종료 함수. C++ 정적 객체 생성자도 `INIT_ARRAY`로 들어갑니다 |
| DT_FLAGS / DT_FLAGS_1 | `BIND_NOW`·`PIE` 같은 플래그 |
| DT_VERNEED | 필요한 심볼 버전 |

### PLT / GOT

공유 라이브러리 함수의 주소는 로드해야 정해집니다. 그래서 호출 코드는 PLT 스텁을 부르고, 스텁은 GOT 슬롯에 적힌 주소로 점프합니다. 음식점 주문서에 "주방에 물어볼 것"이라고 적어 두고, 처음 물어본 뒤에는 답을 주문서에 적어 두는 방식입니다.

Debian 게스트에서 `puts`를 두 번 부르는 `lazy.c`를 `-no-pie -Wl,-z,lazy -Wl,-z,norelro`로 링크하고 PLT를 디스어셈블했습니다.

```text
$ objdump -d -j .plt lazy
...
0000000000400520 <puts@plt>:
  400520:	90000090 	adrp	x16, 410000 <__abi_tag+0xf844>
  400524:	f9450a11 	ldr	x17, [x16, #2576]
  400528:	91284210 	add	x16, x16, #0xa10
  40052c:	d61f0220 	br	x17
```

스텁은 `0x410000 + 2576 = 0x410a10`의 GOT 슬롯을 읽어 점프합니다. GDB로 첫 `puts` 호출 전후에 이 슬롯을 읽었습니다.

```text
$ gdb -q -batch -ex 'break main' -ex run -ex 'x/gx 0x410a10' -ex next -ex 'x/gx 0x410a10' -ex 'info symbol *(long*)0x410a10' ./lazy
...
0x410a10 <puts@got.plt>:	0x00000000004004d0
...
0x410a10 <puts@got.plt>:	0x0000fffff7e61cc0
puts in section .text of /lib/aarch64-linux-gnu/libc.so.6
```

호출 전 슬롯은 PLT 시작부(`0x4004d0`, resolver로 가는 공통 스텁)를 가리키고, 첫 호출 뒤에는 libc의 `puts` 주소로 바뀌었습니다. 이것이 lazy binding입니다.

`ls`는 `FLAGS BIND_NOW`, `FLAGS_1 NOW`를 갖고 있어 시작할 때 모든 PLT 재배치를 끝냅니다. 반면 옵션 없이 `gcc lazy.c`로 링크한 게스트의 실행 파일은 `FLAGS_1`에 `PIE`만 있었습니다. `BIND_NOW`와 RELRO가 함께 있으면 GOT 전체가 읽기 전용이 되고, `checksec`가 이를 Full RELRO라고 부릅니다.

`LD_BIND_NOW=1`은 플래그 없는 실행 파일에서도 시작 시 바인딩을 강제합니다. `LD_DEBUG=statistics`의 `final number of relocations`는 `lazy`를 그냥 실행했을 때 94, `LD_BIND_NOW=1`을 줬을 때 96이었습니다.

### DT_RUNPATH vs LD_LIBRARY_PATH

같은 이름의 `libwho.so`를 `/w/d1`(`"d1"` 출력)과 `/w/d2`(`"d2"` 출력)에 두고, `-rpath,/w/d1`을 `--disable-new-dtags`(→ `DT_RPATH`)와 `--enable-new-dtags`(→ `DT_RUNPATH`)로 각각 링크했습니다.

| 실행 파일 | 동적 태그 | 그냥 실행 | `LD_LIBRARY_PATH=/w/d2` |
|-----------|----------|----------|-------------------------|
| `m-rpath` | `RPATH [/w/d1]` | d1 | d1 |
| `m-runpath` | `RUNPATH [/w/d1]` | d1 | d2 |

`DT_RPATH`는 `LD_LIBRARY_PATH`보다 먼저 검색되고, `DT_RUNPATH`는 나중에 검색됩니다. `LD_DEBUG=libs`가 순서를 그대로 찍습니다.

```text
$ LD_LIBRARY_PATH=/w/d2 LD_DEBUG=libs ./m-runpath
...
      1469:	find library=libc.so.6 [0]; searching
      1469:	 search path=/w/d2		(LD_LIBRARY_PATH)
      1469:	  trying file=/w/d2/libc.so.6
      1469:	 search path=/w/d1		(RUNPATH from file ./m-runpath)
      1469:	  trying file=/w/d1/libc.so.6
      1469:	 search cache=/etc/ld.so.cache
      1469:	  trying file=/lib/aarch64-linux-gnu/libc.so.6
```

[ld.so(8)](https://man7.org/linux/man-pages/man8/ld.so.8.html)이 정리한 glibc의 전체 순서는 `DT_RUNPATH`가 없을 때의 `DT_RPATH`, `LD_LIBRARY_PATH`(secure-execution 모드에서는 무시), `DT_RUNPATH`, `/etc/ld.so.cache`, 기본 경로(`/lib`, `/usr/lib`) 순입니다. 같은 문서는 `DT_RUNPATH`가 그 파일의 직접 의존성(`DT_NEEDED`)에만 적용되고 의존성의 의존성에는 적용되지 않는다고 적습니다.

## Symbol Table

심볼 테이블은 둘입니다. `.dynsym`은 동적 링크에 필요한 심볼만 담고 ALLOC이라 실행 중에도 메모리에 있습니다. `.symtab`은 정적 링크·디버깅용 전체 목록이고 ALLOC이 아닙니다. `strip`은 `.symtab`을 지웁니다. 게스트에서 `-g`로 링크한 `sections`는 `.symtab`·`.debug_*` 섹션이 7개였고, `strip` 결과에서는 0개였으며 `.dynsym`은 남았습니다.

```text
$ readelf -sW /usr/bin/ls | head
Symbol table '.dynsym' contains 140 entries:
   Num:    Value          Size Type    Bind   Vis      Ndx Name
     0: 0000000000000000     0 NOTYPE  LOCAL  DEFAULT  UND
     1: 0000000000003970     0 SECTION LOCAL  DEFAULT   11 .init
     2: 0000000000040000     0 SECTION LOCAL  DEFAULT   24 .data
     3: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND memcpy@GLIBC_2.17 (2)
     4: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND memmove@GLIBC_2.17 (2)
     5: 0000000000000000     0 FUNC    GLOBAL DEFAULT  UND cap_to_text
...
```

`ls`는 stripped라서 `.dynsym`의 140개만 있습니다. `@GLIBC_2.17`은 `.gnu.version_r`가 요구하는 심볼 버전입니다.

### Symbol 구조

gABI §5.1 "Symbol Table Entry"의 `Elf64_Sym`입니다.

```c
typedef struct {
    Elf64_Word    st_name;     // 이름 (.strtab 인덱스)
    unsigned char st_info;     // 타입 + 바인딩
    unsigned char st_other;    // visibility
    Elf64_Half    st_shndx;    // 정의된 섹션
    Elf64_Addr    st_value;    // 주소 또는 값
    Elf64_Xword   st_size;
} Elf64_Sym;
```

### st_info 비트

값은 gABI §5.2 "Symbol Binding"·§5.3 "Symbol Type"의 표를 따릅니다.

**Type (low 4 bits):**

- 0 = NOTYPE
- 1 = OBJECT (변수)
- 2 = FUNC
- 3 = SECTION
- 4 = FILE
- 5 = COMMON
- 6 = TLS

**Binding (high 4 bits):**

- 0 = LOCAL
- 1 = GLOBAL
- 2 = WEAK (다른 GLOBAL 정의가 있으면 그쪽이 선택됨)

gABI §5.2는 링크 에디터가 여러 relocatable 파일을 합칠 때 같은 이름의 GLOBAL 정의 둘을 허용하지 않고, GLOBAL 정의가 있으면 같은 이름의 WEAK 정의를 무시한다고 정합니다. 같은 절은 이 문서가 정하지 않은 영역의 weak 동작은 구현 정의라고 덧붙입니다. 동적 로더는 이 링크 규칙 대신 로드 순서로 정의를 찾습니다. [ld.so(8)](https://man7.org/linux/man-pages/man8/ld.so.8.html)은 `LD_PRELOAD`의 라이브러리가 다른 모든 것보다 먼저 로드되어 다른 공유 오브젝트의 함수를 골라 덮어쓸 수 있다고 설명하며, 덮이는 쪽이 GLOBAL이든 WEAK이든 상관없습니다. Debian 13 arm64 glibc 2.41의 `libc.so.6` `.dynsym`에는 WEAK 심볼이 766개 있었고, 그중 `puts`는 WEAK, `malloc`·`printf`·`fopen`은 GLOBAL이었습니다.

## Build-ID — debuginfo 매칭

Build ID는 `.note.gnu.build-id`에 들어가는 식별자입니다. GNU ld의 `--build-id[=STYLE]` 옵션이 만들고, binutils 2.44의 `ld --help`는 스타일로 `none,md5,sha1,uuid,0xHEX`를 나열합니다. Debian GCC의 `gcc -dumpspecs`에는 링커에 `--build-id`를 넘기는 규칙이 들어 있어서, 옵션 없이 링크해도 20바이트(SHA-1 길이) ID가 붙었습니다.

```text
$ readelf -n /usr/bin/ls
...
Displaying notes found in: .note.gnu.build-id
  Owner                Data size 	Description
  GNU                  0x00000014	NT_GNU_BUILD_ID (unique build ID bitstring)	    Build ID: 87a7eadc711cd002f7b00ba923179e5713498159
```

ID는 링크 시점에 출력 내용으로 계산되고 이후 다시 계산되지 않습니다. 그래서 파일 무결성 체크섬으로 쓸 수 없습니다. 게스트에서 `sections`를 복사해 `.comment`의 `GCC: (Debian` 첫 글자 한 바이트를 바꿨더니 `sha1sum`은 달라졌지만 `readelf -n`의 Build ID는 `4fb21187d3a81120e79b522617ebff583d23c44c`로 그대로였습니다.

Build ID는 다음 세 곳에서 쓰입니다(6장에서 실제로 돌립니다).

1. `/usr/lib/debug/.build-id/<앞 2자리>/<나머지>.debug` 경로의 별도 debuginfo 파일.
2. core dump에 기록된 ID로 어떤 빌드인지 식별.
3. debuginfod 서버에서 ID로 debuginfo 다운로드.

```bash
# build-id로 debuginfo 경로 만들기
build_id=$(readelf -n /usr/bin/ls | awk '/Build ID/ {print $3}')
ls /usr/lib/debug/.build-id/${build_id:0:2}/${build_id:2}.debug
```

## NOTE 섹션

NOTE 엔트리는 `(name, type, descriptor)` 세 필드입니다(gABI §7.6 "Note Sections"). `ls`의 노트 셋을 보면 용도가 드러납니다.

```text
$ readelf -nW /usr/bin/ls
Displaying notes found in: .note.gnu.property
  Owner                Data size 	Description
  GNU                  0x00000010	NT_GNU_PROPERTY_TYPE_0	      Properties: AArch64 feature: BTI, PAC

Displaying notes found in: .note.gnu.build-id
  Owner                Data size 	Description
  GNU                  0x00000014	NT_GNU_BUILD_ID (unique build ID bitstring)	    Build ID: 87a7eadc711cd002f7b00ba923179e5713498159

Displaying notes found in: .note.ABI-tag
  Owner                Data size 	Description
  GNU                  0x00000010	NT_GNU_ABI_TAG (ABI version tag)	    OS: Linux, ABI: 3.7.0
```

빌드 식별(build-id), 요구하는 최소 커널 ABI(3.7.0), 보안 기능(AArch64 BTI·PAC)이 각각 노트 하나씩입니다. 노트는 `PT_NOTE` 세그먼트로도 노출되므로 섹션 헤더 없이도 찾을 수 있습니다. core dump는 같은 `PT_NOTE`에 `NT_PRSTATUS`(레지스터) 같은 노트를 담습니다([Postmortem 2장](/blog/tools/debugging/postmortem/chapter02-elf-core-format)).

## 보안 — checksec

`checksec`(Debian 패키지, v2.6.0)은 ELF 메타데이터를 읽어 보호 기능을 요약합니다.

```text
$ checksec --file=/usr/bin/ls
RELRO           STACK CANARY      NX            PIE             RPATH      RUNPATH	Symbols		FORTIFY	Fortified	Fortifiable	FILE
Full RELRO      Canary found      NX enabled    PIE enabled     No RPATH   No RUNPATH   No Symbols	  Yes	6		14		/usr/bin/ls
```

| 보호 | 의미 | ELF에서의 단서 |
|------|------|---------|
| RELRO | GOT 등을 재배치 후 읽기 전용으로 | `PT_GNU_RELRO` 세그먼트, Full이면 `BIND_NOW`도 |
| Stack Canary | 스택 overflow 검출 | `__stack_chk_fail` 심볼 |
| NX | 비실행 스택 | `PT_GNU_STACK`에 X 비트 없음 |
| PIE | 위치 독립 실행 파일 | `ET_DYN` + `DF_1_PIE` |
| FORTIFY | libc 함수의 검사 변형 | `__*_chk` 심볼 (`ls`의 `__sprintf_chk` 등) |

이 표는 파일에 적힌 의도를 읽은 것입니다. 실제 적용은 커널과 로더가 정하므로, 런타임 확인은 `/proc/<pid>/maps`의 권한으로 합니다.

## ELF 변형

같은 ELF 형식이 쓰이는 방식은 환경마다 다릅니다.

- **glibc 동적 링크** — 이 장의 `ls`처럼 `PT_INTERP`가 `ld-linux-*.so`를 가리킵니다.
- **베어메탈** — 동적 로더가 없고, 링커 스크립트가 `p_paddr`(LMA)와 `p_vaddr`(VMA)를 다르게 둡니다.
- **Linux 커널 모듈(.ko)** — `ET_REL` 파일을 커널이 직접 재배치해 적재합니다.

도구(`readelf`, `objdump`, `objcopy`)는 형식이 같으므로 어느 환경의 파일이든 읽습니다. 이 장에서도 arm64 게스트의 GNU readelf와 macOS의 `llvm-readelf`가 각각 AArch64·x86-64 파일을 읽었습니다.

## 도구 한 표

| 도구 | 용도 |
|------|------|
| `readelf` | ELF 헤더·섹션·세그먼트·심볼·노트 |
| `objdump` | 디스어셈블, DWARF 덤프 |
| `objcopy` | 변환 (strip, debuginfo 분리, bin/hex) |
| `nm` | 심볼 목록 |
| `strings` | 출력 가능한 문자열 추출 |
| `addr2line` | 주소 → 소스 (DWARF 사용, 3장) |
| `c++filt` | mangled 이름 → 원본 |
| `patchelf` | RPATH/INTERPRETER 변경 |
| `llvm-readelf` / `llvm-objdump` | LLVM 구현. 옵션 대부분이 GNU 쪽과 같습니다 |

## 직접 확인 — 같은 ELF 오브젝트의 헤더·섹션·심볼

헤더 없이 컴파일되는 작은 소스로 `.o`와 링크된 실행 파일을 비교합니다. 전역 변수 둘(초기값 있음·없음), 외부 함수 하나, 정의된 함수 하나가 각각 어느 섹션·심볼·재배치로 가는지가 목표입니다.

```c title="sections.c"
int initialized = 7;
int zeroed[4];
extern int external(int);
int compute(int input) {
    return external(input) + initialized + zeroed[0];
}
```

macOS의 Homebrew LLVM 23.1.5로 x86-64 Linux 오브젝트를 만들었습니다.

```bash
clang --target=x86_64-unknown-linux-gnu -g -O0 -c sections.c -o sections.o
llvm-readelf -h -S -s -r sections.o
llvm-readelf -l sections.o
```

헤더는 `Type: REL (Relocatable file)`, `Machine: Advanced Micro Devices X86-64`, `Number of program headers: 0`입니다. 섹션과 심볼에서 필요한 부분입니다.

```text
  [ 2] .text             PROGBITS        0000000000000000 000040 000025 00  AX  0   0 16
  [ 3] .rela.text        RELA            0000000000000000 000508 000048 18   I 22   2  8
  [ 4] .data             PROGBITS        0000000000000000 000068 000004 00  WA  0   0  4
  [ 5] .bss              NOBITS          0000000000000000 000070 000010 00  WA  0   0 16
...
Relocation section '.rela.text' at offset 0x508 contains 3 entries:
    Offset             Info             Type               Symbol's Value  Symbol's Name + Addend
000000000000000f  0000000a00000004 R_X86_64_PLT32         0000000000000000 external - 4
0000000000000015  0000000b00000002 R_X86_64_PC32          0000000000000000 initialized - 4
000000000000001b  0000000c00000002 R_X86_64_PC32          0000000000000000 zeroed - 4
...
     9: 0000000000000000    37 FUNC    GLOBAL DEFAULT     2 compute
    10: 0000000000000000     0 NOTYPE  GLOBAL DEFAULT   UND external
    11: 0000000000000000     4 OBJECT  GLOBAL DEFAULT     4 initialized
    12: 0000000000000000    16 OBJECT  GLOBAL DEFAULT     5 zeroed
...
There are no program headers in this file.
```

`initialized`는 4번 `.data`(4바이트), `zeroed`는 5번 `NOBITS .bss`(16바이트)이고, `external`은 `UND`입니다. `.text`의 재배치 셋이 `external` 호출(`R_X86_64_PLT32`)과 두 전역 참조(`R_X86_64_PC32`)를 나중에 채울 자리입니다. `.rela.text`의 `I` 플래그(INFO_LINK)와 `Inf 2`는 이 재배치가 2번 `.text`에 적용된다는 뜻입니다. REL 파일에는 program header가 없습니다.

같은 소스를 게스트에서 `ext.c`(`external`과 `main` 정의)와 함께 `gcc -g -O0`로 링크하면 program header 10개가 생기고, 매핑은 이렇게 됩니다.

```text
 Section to Segment mapping:
  Segment Sections...
   02     .note.gnu.build-id .interp .gnu.hash .dynsym .dynstr .gnu.version .gnu.version_r .rela.dyn .rela.plt .init .plt .text .fini .rodata .eh_frame_hdr .eh_frame .note.ABI-tag
   03     .init_array .fini_array .dynamic .got .got.plt .data .bss
...
   09     .init_array .fini_array .dynamic .got
```

이 실행 파일의 RW `LOAD`는 FileSiz 0x26c, MemSiz 0x288이고, RELRO(9번)는 `.got`까지만 덮어 `.got.plt`가 밖에 남습니다. lazy binding이 쓸 GOT 슬롯을 쓰기 가능하게 둔 Partial RELRO 배치입니다.

## 정리

- ELF는 *링커 시각*(섹션)과 *로더 시각*(세그먼트)을 한 파일에 둡니다.
- ELF Header가 나머지 모든 표의 위치를 알려 줍니다.
- Program Header가 메모리 매핑 단위, Section Header가 링크 단위입니다.
- `p_filesz < p_memsz`인 나머지는 0으로 채워지며, `ls`에서 그 차이가 `.bss` 크기와 같았습니다.
- `.dynamic`이 의존 라이브러리·검색 경로·바인딩 플래그를 담습니다.
- PLT/GOT의 lazy binding은 첫 호출에서 GOT 슬롯을 실제 주소로 바꿉니다. `BIND_NOW`면 시작할 때 끝냅니다.
- `DT_RPATH`는 `LD_LIBRARY_PATH`보다 먼저, `DT_RUNPATH`는 나중에 검색됩니다.
- `.note.gnu.build-id`가 debuginfo 매칭의 기준이고, 파일 무결성 체크섬은 아닙니다.
- checksec 결과는 파일 메타데이터이며, 런타임 적용은 따로 확인합니다.

## 다음 장 예고

Ch 2 — DWARF 개관. DIE 트리, abbrev table, 컴파일 유닛, 자주 보는 DW_TAG·DW_AT·DW_FORM을 다룹니다.

## 관련 항목

- [Ch 2: DWARF 개관 — DIE / abbrev](/blog/tools/debugging/dwarf-elf/chapter02-dwarf-overview)
- [Embedded Debugging Ch 5: ELF / MAP](/blog/tools/debugging/embedded/chapter05-elf-map) — 베어메탈 시각
- [ELF gABI 4.3 draft](https://gabi.xinuos.com/elf/00-foreword.html) — 이 장의 §2·§3·§5·§7·§8 인용 출처
- [System V ABI (gABI 4.1)](https://refspecs.linuxfoundation.org/elf/gabi4+/contents.html)
- [`elf(5)` man page](https://man7.org/linux/man-pages/man5/elf.5.html)
- [`ld.so(8)` man page](https://man7.org/linux/man-pages/man8/ld.so.8.html) — 라이브러리 검색 순서
- [Oracle Linker and Libraries Guide](https://docs.oracle.com/cd/E26505_01/html/E26506/) — 깊은 ELF 참고
- [`<elf.h>` 헤더](https://sourceware.org/git/?p=glibc.git;a=blob;f=elf/elf.h)
