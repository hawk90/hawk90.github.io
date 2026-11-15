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

DWARF를 깊이 다루기 전에 그 컨테이너인 *ELF*부터 봅니다. Linux·BSD·일부 임베디드 환경의 표준 바이너리 포맷. 링크와 로드에 필요한 정보를 구분하며, 디버그 정보·심볼·실행 가능 코드·동적 링크 메타데이터를 *한 파일*에 모두 담는 결정적인 추상화입니다.

이 시리즈는 ELF에서 출발해 주요 DWARF 섹션의 역할과 인코딩을 살펴봅니다. 첫 장은 ELF의 정체부터.

:::tldr
**Executable and Linkable Format**. 한 파일이 두 시각을 가짐 — 링커가 보는 *섹션* 모음과, 로더가 보는 *세그먼트* 모음.
:::

## 역사

ELF는 1990년 *Unix System V Release 4*에서 도입됐습니다. 이전의 a.out, COFF를 대체. 파일 구조는 [System V gABI](https://gabi.xinuos.com/elf/00-foreword.html)와 대상별 psABI를 함께 확인합니다. 거의 모든 Unix·Linux·임베디드 베어메탈 (`arm-none-eabi-gcc`도 ELF)이 사용.

설계 의도 셋.

1. **확장 가능** — 새 섹션 타입을 자유로이 추가, 기존 도구가 무시.
2. **링크와 로드의 분리** — 같은 파일을 정적 링크·동적 링크·실행 로드에 모두.
3. **재배치 정보** — `.o`(relocatable) → 실행 파일 또는 `.so`로 변환 가능.

## 한 파일 — 두 시각

![ELF 구조 — 두 시각](/images/blog/tools/diagrams/elf-structure.svg)

- **Program Headers** — *Segment* 정의. 로더가 본 그대로 mmap.
- **Section Headers** — *Section* 정의. 링커가 본 그대로 조합.

같은 *데이터*를 두 시각으로 봅니다. 한 세그먼트(PT_LOAD)가 여러 섹션(.text, .rodata, .init)을 포함하는 게 일반적.

## readelf로 들여다보기

아래 /usr/bin/ls 명령은 지원되는 Linux에서 실행할 안내입니다. 배포판과 빌드마다 헤더·주소·섹션 구성이 달라지므로 서로 다른 출력의 수치를 한 파일의 실측처럼 섞지 않습니다. macOS의 /usr/bin/ls는 ELF가 아니며, 아래 직접 확인 절은 별도의 ELF 오브젝트를 생성합니다.

```bash
readelf -h /usr/bin/ls
```

## ELF Header 구조

C로 표현 (Elf64_Ehdr, `<elf.h>`).

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

### e_ident[0..15]

```text
[0..3] = 0x7F 'E' 'L' 'F'     매직
[4]    = EI_CLASS              1=ELF32, 2=ELF64
[5]    = EI_DATA               1=little endian, 2=big
[6]    = EI_VERSION            1
[7]    = EI_OSABI              0=SysV, 3=Linux, 9=FreeBSD, ...
[8]    = EI_ABIVERSION
[9..15] padding
```

### e_type

| 값 | 의미 |
|----|------|
| 1 (REL) | `.o` 재배치 가능 파일 |
| 2 (EXEC) | 실행 파일. 정적 링크만을 뜻하지 않으며 동적 링크 실행 파일일 수도 있습니다. |
| 3 (DYN) | 동적 라이브러리 또는 PIE 실행 파일 |
| 4 (CORE) | core dump |

PIE(Position-Independent Executable)가 보안상 표준이 되면서 *최신 실행 파일*도 ET_DYN. 따라서 `file` 명령이 "shared object"라고 해도 *실행 파일*일 수 있음.

### e_machine

```text
3   = i386
40  = ARM (32-bit)
62  = x86-64
183 = ARM64 (AArch64)
243 = RISC-V
```

## Program Headers

```bash
readelf -l /usr/bin/ls
```

### Program Header 구조

```c
typedef struct {
    Elf64_Word  p_type;
    Elf64_Word  p_flags;     // R=4, W=2, X=1
    Elf64_Off   p_offset;    // 파일 안의 위치
    Elf64_Addr  p_vaddr;     // 로드된 가상 주소
    Elf64_Addr  p_paddr;     // 물리 주소 (베어메탈 LMA)
    Elf64_Xword p_filesz;    // 파일 안의 크기
    Elf64_Xword p_memsz;     // 메모리에서의 크기 (.bss 때문에 다를 수 있음)
    Elf64_Xword p_align;
} Elf64_Phdr;
```

### p_type 카탈로그

| 값 | 의미 |
|----|------|
| PT_LOAD | mmap해서 메모리에 로드할 영역 |
| PT_DYNAMIC | `.dynamic` 섹션의 위치 (동적 링크 메타) |
| PT_INTERP | `/lib64/ld-linux.so` 경로 |
| PT_NOTE | `.note.*` 섹션 (build-id 등) |
| PT_PHDR | Program Header 자체 |
| PT_TLS | Thread Local Storage 템플릿 |
| PT_GNU_EH_FRAME | `.eh_frame_hdr` 위치 (예외 처리 unwind 인덱스) |
| PT_GNU_STACK | 스택 권한 (X 비트가 0이면 NX 스택) |
| PT_GNU_RELRO | RELRO 영역 (relocation 후 read-only로 만들기) |
| PT_GNU_PROPERTY | GNU 속성 (CET 등) |

### LOAD 세그먼트의 디테일

`p_filesz < p_memsz`이면 *.bss 같은 zero-init 영역*. 파일에는 없고 로드 시 OS가 zero-fill.

`p_paddr`는 일반 ELF에선 무시 (커널이 사용 안 함). 베어메탈 ELF의 LMA로 쓰입니다 — 임베디드 빌드 시 `.data`의 paddr이 flash 주소.

### RELRO

```text
PT_GNU_RELRO       ← 이 영역이
LOAD (RW)          ← 이 LOAD 안에 있음
```

로더가 *동적 링크 후* 이 영역을 `mprotect(R only)`로 만듭니다. GOT(Global Offset Table) 같은 *링크 후 변하지 않는* 데이터를 보호 → 일부 ROP 공격 차단.

## Section Headers

```bash
readelf -S /usr/bin/ls
```

### Section Header 구조

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
| NOBITS | 파일에 없음 (.bss) |
| INIT_ARRAY | 초기화 함수 포인터 배열 |
| FINI_ARRAY | 종료 함수 포인터 배열 |
| GNU_HASH | GNU 확장 해시 (`.gnu.hash`) |
| GNU_VERSYM | 심볼 버전 인덱스 |
| GNU_VERNEED | 버전 의존 |

### sh_flags

| 비트 | 의미 |
|------|------|
| 0x1 (WRITE) | 쓰기 가능 |
| 0x2 (ALLOC) | 메모리 할당 |
| 0x4 (EXECINSTR) | 실행 가능 |
| 0x10 (MERGE) | 동일 내용 병합 가능 (.rodata) |
| 0x20 (STRINGS) | NUL-terminated string |
| 0x40 (INFO_LINK) | sh_info가 다른 섹션 인덱스 |
| 0x80 (LINK_ORDER) | 링크 순서 보존 |
| 0x100 (OS_NONCONFORMING) | OS별 |
| 0x200 (GROUP) | 섹션 그룹 |
| 0x400 (TLS) | thread-local |
| 0x800 (COMPRESSED) | ELF 압축 헤더와 SHF_COMPRESSED로 표현합니다. 옛 GNU .zdebug_* 방식과 다릅니다. |

## Dynamic Linking — .dynamic

```bash
readelf -d /usr/bin/ls
```

각 엔트리가 `(d_tag, d_val_or_ptr)`. ld.so가 *프로세스 시작 시* 이 정보를 읽어 라이브러리를 로드·심볼을 바인딩.

| d_tag | 의미 |
|-------|------|
| DT_NEEDED | 의존 라이브러리 이름 |
| DT_PLTRELSZ / DT_PLTGOT / DT_HASH | PLT/GOT/해시 위치 |
| DT_STRTAB / DT_SYMTAB | 문자열·심볼 테이블 |
| DT_RPATH / DT_RUNPATH | 라이브러리 검색 경로 |
| DT_INIT / DT_FINI | 객체 초기화·종료 함수 포인터이며 C++ 생성자·소멸자만을 뜻하지는 않습니다. |
| DT_GNU_HASH | GNU 빠른 해시 |
| DT_VERNEED | 심볼 버전 요구 |

### PLT / GOT

lazy PLT binding이 사용되는 경우 첫 호출에서 주소를 해결하고 이후 GOT를 통해 전달할 수 있습니다. eager binding, -fno-plt, 정적 링크 등에서는 이 경로와 다릅니다.

```text
[caller] call printf@plt    ← PLT 슬롯
[plt]    jmp *GOT[printf]   ← 첫 호출엔 resolver, 이후엔 실제 주소
[got]    [resolver | resolved address]
```

이 lazy binding이 *시작 시간 단축*. 큰 라이브러리(libQt5 등)에서 효과 큼.

`LD_BIND_NOW=1`로 *모든 심볼을 시작 시 해결* — 더 안전(Full RELRO와 결합).

### DT_RUNPATH vs LD_LIBRARY_PATH

| 경로 출처 | 검색 순서 |
|-----------|-----------|
| DT_RPATH | DT_RUNPATH가 없을 때만 적용합니다. |
| LD_LIBRARY_PATH | 유효한 RPATH 다음, RUNPATH 이전이며 secure-execution에서는 무시될 수 있습니다. |
| DT_RUNPATH | 3 |
| /etc/ld.so.cache | 4 |
| /lib, /usr/lib | 5 |

위는 glibc 로더에서 이름에 슬래시가 없는 의존성을 찾는 순서의 요약입니다. RUNPATH는 직접 의존성에만 적용되는 등 범위가 다릅니다. [ld.so 검색 조건](https://man7.org/linux/man-pages/man8/ld.so.8.html)을 함께 확인합니다.

## Symbol Table

```bash
readelf -s /usr/bin/ls
```

`.dynsym`은 동적 링크용. `.symtab`은 정적/디버깅용 (stripped 빌드는 제거).

### Symbol 구조

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

**Type (low 4 bits):**

- 0 = NOTYPE
- 1 = OBJECT       (변수)
- 2 = FUNC
- 3 = SECTION
- 4 = FILE
- 5 = COMMON
- 6 = TLS

**Binding (high 4 bits):**

- 0 = LOCAL
- 1 = GLOBAL
- 2 = WEAK         (override 가능)

정적 링크에서 정의가 충돌할 때 GLOBAL과 WEAK의 선택 규칙을 구분합니다. 동적 로더의 interposition과 LD_PRELOAD 검색 순서는 WEAK 하나로 설명되지 않습니다. 특정 libc 함수의 binding은 해당 빌드의 dynsym으로 확인합니다.

## Build-ID — debuginfo 매칭

```bash
readelf -n /usr/bin/ls
```

링커의 --build-id로 생성하며 지원 스타일과 기본값은 링커·배포 설정을 확인합니다. GNU ld는 sha1 등 스타일을 제공하지만 build-id를 전체 파일의 무결성 체크섬으로 취급하면 안 됩니다. 파일을 나중에 변경해도 ID가 그대로 남을 수 있습니다. [GNU ld 옵션](https://sourceware.org/binutils/docs/ld/Options.html)을 참조합니다.

활용:

1. `/usr/lib/debug/.build-id/4f/8d3a91...debug` 디렉터리에 별도 debuginfo 파일.
2. core dump의 build-id로 *어떤 빌드*인지 파악.
3. debuginfod로 네트워크 자동 다운로드.

```bash
# build-id로 debuginfo 찾기
$ build_id=$(readelf -n /usr/bin/ls | awk '/Build ID/ {print $3}')
$ ls /usr/lib/debug/.build-id/${build_id:0:2}/${build_id:2}.debug
```

## NOTE 섹션

```bash
readelf -n /usr/bin/ls
```

각 NOTE가 `(name, type, descriptor)` 트리플. 다양한 메타데이터:

- 빌드 정보 (build-id).
- ABI 호환성 (커널 버전).
- 보안 기능 (IBT, SHSTK, BTI for ARM64).
- 패키지 정보 (배포판이 추가).

NOTE는 *세그먼트로도 노출됨* (PT_NOTE) — core dump가 활용. core dump의 PT_NOTE가 NT_PRSTATUS(레지스터) 등을 담는 이유 ([Postmortem 2장](/blog/tools/debugging/postmortem/chapter02-elf-core-format)에서 자세히).

## 보안 — checksec

```bash
$ checksec --file=/usr/bin/ls
RELRO           STACK CANARY      NX            PIE             RPATH      RUNPATH
Full RELRO      Canary found      NX enabled    PIE enabled     No RPATH   No RUNPATH
```

| 보호 | 의미 | ELF에서 |
|------|------|---------|
| RELRO | GOT 등 보호 | PT_GNU_RELRO 세그먼트 |
| Stack Canary | 스택 overflow 검출 | `__stack_chk_fail` 심볼 |
| NX | 비실행 스택 | PT_GNU_STACK의 X 비트 |
| PIE | 재배치 가능한 실행 이미지 | ET_DYN만으로 공유 라이브러리와 PIE를 구분할 수는 없습니다. |
| FORTIFY | libc 함수 안전 변형 | `__*_chk` 심볼 |

## ELF 변형

같은 ELF 포맷 위에 변형이 있습니다.

- **Linux glibc ELF** — 일반적인 동적 링크.
- **musl ELF** — Alpine, 작은 정적 링크.
- **Android Bionic** — 일부 호환 차이.
- **Baremetal ELF** — `arm-none-eabi-gcc` 출력. 동적 링크 없음. p_paddr이 LMA.
- **Linux Kernel vmlinux** — 동적 링크 없지만 모듈 (.ko) 재배치 사용.

도구 (`readelf`, `objdump`, `objcopy`)는 거의 같지만 *플래그·기본값*에 차이.

## 도구 한 표

| 도구 | 용도 |
|------|------|
| `readelf` | ELF 정보 전체 보기 |
| `objdump` | 디스어셈블 + 더 |
| `objcopy` | 변환 (strip, debuginfo 분리, bin/hex) |
| `nm` | 심볼 목록 |
| `strings` | 모든 NUL-terminated string |
| `addr2line` | 주소 → 소스 (DWARF 사용) |
| `c++filt` | mangled 이름 → 원본 |
| `patchelf` | RPATH/INTERPRETER 변경 |
| `llvm-readelf` / `llvm-objdump` | LLVM 버전 (대체 호환) |

## 직접 확인 — 같은 ELF 오브젝트의 헤더·섹션·심볼

다음 소스는 헤더나 Linux libc 없이 x86-64 ELF 오브젝트로 컴파일할 수 있습니다. 이번 검증은 macOS의 Homebrew LLVM 23.1.3에서 타깃을 명시해 수행하며, 이 파일을 macOS에서 실행하거나 Linux 로더를 검증한 기록은 아닙니다.

```c title="sections.c"
int initialized = 7;
int zeroed[4];
extern int external(int);
int compute(int input) {
    return external(input) + initialized + zeroed[0];
}
```

```bash
clang --target=x86_64-unknown-linux-gnu -g -O0 -c sections.c -o sections.o
llvm-readelf -h -S -s -r sections.o
llvm-readelf -l sections.o
```

헤더는 ELF64·REL·x86-64를 표시합니다. initialized는 .data, zeroed는 NOBITS .bss에 속하고 compute는 정의된 함수, external은 UND 심볼입니다. relocation이 외부 호출·전역 참조를 연결합니다. REL 파일에는 로드할 program header가 없으므로 segment 부재를 손상으로 보지 않습니다. 연결된 실행 파일의 section-to-segment 매핑은 지원 Linux의 readelf -l로 별도 확인합니다.

## 정리

- ELF는 *링커 시각* (섹션) + *로더 시각* (세그먼트) 두 가지를 동시에.
- ELF Header가 *나머지 모든 것의 인덱스*.
- Program Header가 mmap 단위, Section Header가 링크 단위.
- LOAD 세그먼트의 p_filesz < p_memsz면 zero-init (.bss).
- `.dynamic`이 동적 링크의 모든 메타데이터.
- PLT/GOT가 lazy binding 메커니즘.
- Symbol bind는 GLOBAL/LOCAL/WEAK, type은 FUNC/OBJECT 등.
- `.note.gnu.build-id`가 바이너리의 정체성 — debuginfo 매칭의 핵심.
- ELF 메타데이터는 보호 설정의 단서이며 실제 커널·로더의 적용까지 전수 증명하지는 않습니다.

## 다음 장 예고

Ch 2 — DWARF 개관. DIE 트리, abbrev table, 컴파일 유닛, 모든 DW_TAG와 DW_AT 카탈로그.

## 관련 항목

- [Ch 2: DWARF 개관 — DIE / abbrev](/blog/tools/debugging/dwarf-elf/chapter02-dwarf-overview)
- [Embedded Debugging Ch 5: ELF / MAP](/blog/tools/debugging/embedded/chapter05-elf-map) — 베어메탈 시각
- [System V ABI](https://refspecs.linuxfoundation.org/elf/gabi4+/contents.html)
- [`elf(5)` man page](https://man7.org/linux/man-pages/man5/elf.5.html)
- [Oracle Linker and Libraries Guide](https://docs.oracle.com/cd/E26505_01/html/E26506/) — 깊은 ELF 참고
- [`<elf.h>` 헤더](https://sourceware.org/git/?p=glibc.git;a=blob;f=elf/elf.h)
