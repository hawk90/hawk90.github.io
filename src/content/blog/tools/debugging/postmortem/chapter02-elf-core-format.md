---
title: "Ch 2: ELF Core 파일 포맷"
date: 2025-09-05T02:00:00
description: "core dump의 내부 구조. PT_NOTE/PT_LOAD, NT_PRSTATUS, NT_FILE, NT_AUXV."
tags: [core-dump, elf, nt-prstatus, postmortem]
series: "Postmortem Debugging"
seriesOrder: 2
draft: false
---

생성된 core 파일은 그저 *ELF*입니다. `e_type = ET_CORE`. 일반 실행 파일·shared library와 *같은 포맷*. 이 장은 core 안에 *어떤 정보*가 어떻게 들어 있는지를 깊이 봅니다 — PT_NOTE 세그먼트의 모든 NT_* 노트, PT_LOAD의 메모리 매핑, 그리고 *부분 core*가 어떻게 표현되는지.

## 한 줄 요약

ELF core = PT_NOTE (스레드·프로세스 메타) + PT_LOAD (메모리 내용). 디버거가 이 둘로 *프로세스 상태 전체*를 재구성.

## 전체 구조

![ELF core 파일 — PT_NOTE / PT_LOAD 분해](/images/blog/tools/diagrams/core-elf-structure.svg)

`readelf`로 확인.

```bash
$ readelf -h core
ELF Header:
  Magic:   7f 45 4c 46 02 01 01 00 ...
  Class:   ELF64
  Type:    CORE (Core file)
  Machine: Advanced Micro Devices X86-64
  ...

$ readelf -l core | head -30
Program Headers:
  Type           Offset             VirtAddr           PhysAddr           FileSiz            MemSiz
  NOTE           0x0000000000000478 0x0000000000000000 0x0000000000000000 0x0000000000002a30 0x0000000000000000
  LOAD           0x0000000000003000 0x0000000000400000 0x0000000000000000 0x0000000000001000 0x0000000000001000  R   0x1000
  LOAD           0x0000000000004000 0x0000000000401000 0x0000000000000000 0x0000000000001000 0x0000000000001000  R E 0x1000
  ...
```

`PT_NOTE` 한 개 + `PT_LOAD` 다수.

## PT_NOTE — 메타데이터

NOTE 세그먼트 안에 *Note 레코드*들이 연속.

### Note 레코드 구조

```c
struct Elf64_Nhdr {
    Elf64_Word n_namesz;     // name 길이 (NUL 포함)
    Elf64_Word n_descsz;     // descriptor 길이
    Elf64_Word n_type;       // NT_*
};
// 이후 name (n_namesz, 4-byte aligned)
// 이후 descriptor (n_descsz, 4-byte aligned)
```

`name`이 vendor 식별 (보통 `"CORE"` 또는 `"LINUX"`). `n_type` + `name`이 *노트 종류*를 결정.

### 주요 NT_*

| Note | n_type | Owner | 내용 |
|------|--------|-------|------|
| `NT_PRSTATUS` | 1 | CORE | 한 스레드의 시그널·레지스터·기본 정보 |
| `NT_PRPSINFO` | 3 | CORE | 프로세스 정보 (이름, UID, PPID) |
| `NT_TASKSTRUCT` | 4 | CORE | (구식, 거의 안 씀) |
| `NT_AUXV` | 6 | CORE | auxv 벡터 (실행 파일 위치, page size 등) |
| `NT_SIGINFO` | 0x53494749 | CORE | 죽음을 일으킨 siginfo_t |
| `NT_FILE` | 0x46494C45 | CORE | 매핑된 파일 목록 |
| `NT_FPREGSET` | 2 | CORE | float/SSE 레지스터 |
| `NT_PRXFPREG` | 0x46e62b7f | LINUX | x87 + SSE 확장 |
| `NT_X86_XSTATE` | 0x202 | LINUX | x86 확장 상태 (AVX, AVX-512) |
| `NT_ARM_VFP` | 0x400 | LINUX | ARM VFP |
| `NT_ARM_TLS` | 0x401 | LINUX | ARM TLS |
| `NT_ARM_SVE` | 0x405 | LINUX | ARM SVE 확장 |
| `NT_ARM_PAC_MASK` | 0x406 | LINUX | ARM Pointer Auth |
| `NT_ARM_TAGGED_ADDR_CTRL` | 0x409 | LINUX | ARM MTE |

스레드가 N개면 *각 스레드별로* `NT_PRSTATUS` + `NT_FPREGSET` + `NT_X86_XSTATE` 등 노트들이 N벌. core 안에서 *스레드별로 그룹*.

## NT_PRSTATUS — 한 스레드의 정체

가장 중요한 노트. 각 스레드의 *레지스터, 시그널, PID/TID*.

```c
struct elf_prstatus {
    struct elf_siginfo pr_info;       // 시그널 정보
    short pr_cursig;                  // 현재 시그널
    unsigned long pr_sigpend;
    unsigned long pr_sighold;
    pid_t pr_pid;                     // TID (LWP)
    pid_t pr_ppid;
    pid_t pr_pgrp;
    pid_t pr_sid;
    struct timeval pr_utime;          // CPU time
    struct timeval pr_stime;
    struct timeval pr_cutime;
    struct timeval pr_cstime;
    elf_gregset_t pr_reg;             // 레지스터 (아키텍처별)
    int pr_fpvalid;
};
```

`pr_pid`가 *LWP* (Linux의 스레드 ID), `pr_cursig`가 *죽음을 일으킨 시그널*.

`pr_reg`가 *아키텍처별 레지스터 구조체*. x86-64는 `elf_gregset_t = unsigned long[27]` (RAX, RBX, ..., RIP, RSP, RFLAGS).

```bash
$ readelf -n core | grep -A 30 NT_PRSTATUS | head -35
  CORE                 0x00000150  NT_PRSTATUS (prstatus structure)
    pr_info: ...
    pr_cursig: 11
    pr_pid: 12345
    pr_ppid: 1
    pr_reg:
      r15:  0x00007ffd1234abcd
      r14:  0x0000000000000000
      ...
      rip:  0x00005555555a3b12
      rsp:  0x00007fff0000fab0
      eflags: 0x00010202
```

`pr_cursig: 11` = SIGSEGV. `rip` = 죽은 명령 PC. `rsp` = 그 시점의 SP — *콜스택 풀기*의 시작점.

## NT_PRPSINFO — 프로세스 정보

```c
struct elf_prpsinfo {
    char pr_state;                    // 'R' / 'S' / 'D' / 'Z'
    char pr_sname;
    char pr_zomb;
    char pr_nice;
    unsigned long pr_flag;
    uid_t pr_uid;
    gid_t pr_gid;
    pid_t pr_pid;                     // TGID (process)
    pid_t pr_ppid;
    pid_t pr_pgrp;
    pid_t pr_sid;
    char pr_fname[16];                // 실행 파일 이름 (basename)
    char pr_psargs[80];               // 명령줄
};
```

`pr_pid`가 *TGID* (사용자가 보는 PID). `pr_psargs`로 *명령줄 확인* — `/usr/local/bin/server --config=prod.yaml`.

```bash
$ readelf -n core | grep -A 5 NT_PRPSINFO
  CORE                 0x00000088  NT_PRPSINFO (prpsinfo structure)
    pr_state: ...
    pr_pid: 12345
    pr_fname: server
    pr_psargs: /usr/local/bin/server --config=prod.yaml
```

## NT_SIGINFO — 죽음의 정체

```c
struct siginfo_t {
    int si_signo;        // 11 (SIGSEGV)
    int si_errno;
    int si_code;         // 세부 (1=SEGV_MAPERR, 2=SEGV_ACCERR, ...)
    union { /* signal-specific */ }
};
```

GDB의 `print $_siginfo`가 이 노트를 보여 줌.

```text
(gdb) print $_siginfo
$1 = {si_signo = 11, si_code = 1, si_errno = 0,
      _sifields = {_sigfault = {si_addr = 0xdeadbeef}}}
```

`si_code` 의미.

| si_code (SIGSEGV) | 의미 |
|-------------------|------|
| 1 (SEGV_MAPERR) | 주소가 매핑되지 않음 — NULL deref 또는 잘못된 포인터 |
| 2 (SEGV_ACCERR) | 권한 없음 — read-only에 쓰기 |
| 6 (SEGV_BNDERR) | bounds 위반 (MPX) |
| 7 (SEGV_PKUERR) | 메모리 보호 키 위반 |

| si_code (SIGBUS) | 의미 |
|------------------|------|
| 1 (BUS_ADRALN) | 정렬 안 됨 |
| 2 (BUS_ADRERR) | 존재 안 함 |
| 3 (BUS_OBJERR) | 하드웨어 오류 |
| 4 (BUS_MCEERR_AR) | 메모리 ECC fail (action required) |

| si_code (SIGILL) | 의미 |
|------------------|------|
| 1 (ILL_ILLOPC) | illegal opcode |
| 2 (ILL_ILLOPN) | illegal operand |
| 3 (ILL_ILLADR) | illegal address |
| 7 (ILL_PRVOPC) | privileged opcode |
| 8 (ILL_PRVREG) | privileged register |

`si_addr`가 *실제 접근한 주소*. NULL deref라면 `0x0` 또는 그 근처.

## NT_FILE — 매핑된 파일

```c
struct {
    long count;
    long page_size;
    struct {
        unsigned long start;
        unsigned long end;
        unsigned long file_offset;
    } entries[count];
    char paths[];   // 각 entry의 경로 (NUL terminated 연속)
};
```

각 entry가 *한 매핑 영역*. 실행 파일 + 모든 .so + mmap된 파일.

```bash
$ readelf -n core | grep -A 40 NT_FILE | head -50
  CORE                 0x00000460  NT_FILE
    Page size: 4096
    0x0000555555554000  0x0000555555556000  0x0000000000000000
        /usr/local/bin/server
    0x0000555555556000  0x000055555555a000  0x0000000000002000
        /usr/local/bin/server
    0x000055555555a000  0x000055555555c000  0x0000000000006000
        /usr/local/bin/server
    0x000055555555c000  0x000055555555d000  0x0000000000008000
        /usr/local/bin/server
    0x00007ffff7da6000  0x00007ffff7dca000  0x0000000000000000
        /usr/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2
    ...
```

GDB가 이 정보로 *어떤 라이브러리*가 로드됐는지 + *어디에* 알아냅니다. core dump 분석의 핵심.

다른 머신에서 core 분석 시 — *같은 라이브러리 버전*을 그 머신에 두거나 (sysroot로 가리키거나), debuginfod로 자동 다운로드.

## NT_AUXV — auxv 벡터

ELF 로더가 _start에 전달하는 *보조 벡터*. 각 entry가 (type, value).

```c
struct auxv {
    long a_type;
    long a_val;
};
```

```bash
$ readelf -n core | grep -A 30 NT_AUXV
  CORE                 0x000004f0  NT_AUXV (auxiliary vector)
    AT_SYSINFO_EHDR: 0x7ffff7ffd000
    AT_HWCAP:        0x178bfbff
    AT_PAGESZ:       4096
    AT_CLKTCK:       100
    AT_PHDR:         0x555555554040
    AT_PHENT:        56
    AT_PHNUM:        13
    AT_BASE:         0x7ffff7fcc000
    AT_FLAGS:        0
    AT_ENTRY:        0x55555555581a
    AT_UID:          1000
    AT_EUID:         1000
    AT_GID:          1000
    AT_EGID:         1000
    AT_SECURE:       0
    AT_RANDOM:       0x7fffffffeaa9
    AT_HWCAP2:       0x2
    AT_EXECFN:       /usr/local/bin/server
    AT_PLATFORM:     x86_64
```

`AT_EXECFN`이 *실행 파일 경로*. `AT_HWCAP`이 *CPU 기능 비트* (SSE, AVX, ...). `AT_BASE`가 *ld.so 로드 주소*.

## PT_LOAD — 메모리 내용

각 PT_LOAD가 *한 메모리 영역*. `coredump_filter`로 결정된 영역들.

```
PT_LOAD                     ← 한 매핑 영역
  Offset:    파일 오프셋
  VirtAddr:  메모리 주소
  FileSiz:   파일에 저장된 크기
  MemSiz:    메모리에서의 크기
  Flags:     R/W/E
```

`FileSiz < MemSiz`이면 *부분 저장* — 나머지는 zero (`.bss` 같은 zero-init 영역).

`FileSiz = 0`이면 *전혀 저장 안 됨* — 메타데이터만 (coredump_filter로 제외된 file-backed 영역).

```bash
$ readelf -l core | grep LOAD | head -20
  LOAD    0x00003000 0x00400000 ... 0x00001000  R       # .text — 1페이지만
  LOAD    0x00004000 0x00401000 ... 0x00001000  R E     # .text 계속
  LOAD    0x00005000 0x00600000 ... 0x00001000  R W     # .data
  LOAD    0x00006000 0x00601000 ... 0x00010000  R W     # heap (큰)
  LOAD    0x00016000 0x00800000 ... 0x00000000  R       # mmap 파일 (excluded)
```

마지막 LOAD가 `FileSiz=0` — file-backed mmap이 제외된 결과.

## GDB의 core 로딩 흐름

```c
// 의사 코드
void load_core(char *exe_path, char *core_path) {
    // 1. ELF core 읽기
    elf_core = open_elf(core_path);
    
    // 2. PT_NOTE 파싱
    for (note in elf_core.notes) {
        if (note.type == NT_PRSTATUS) {
            add_thread(note.pr_pid, note.pr_reg);
        } else if (note.type == NT_FILE) {
            for (entry in note.entries) {
                map_file(entry.path, entry.start, entry.end);
            }
        } else if (note.type == NT_AUXV) {
            store_auxv(note);
        }
    }
    
    // 3. 실행 파일 로드 (심볼)
    load_elf_symbols(exe_path);
    
    // 4. 매핑된 라이브러리 로드
    for (lib in mapped_files) {
        load_elf_symbols(lib.path);
    }
    
    // 5. PT_LOAD 영역들을 메모리로 매핑 (mmap의 사본)
    for (load in elf_core.loads) {
        map_memory(load.vaddr, load.size, core_data + load.offset);
    }
    
    // 6. UI 갱신
    show_threads();
    select_first_thread();
}
```

이후 `bt`, `print`, `info threads` 모두 *라이브 디버깅과 같이* 동작. 차이는 *진행 불가*.

## 호환 — 실행 파일이 같아야

core는 *실행 파일의 메모리 사본*. 디버거가 `bt`하려면 *같은 실행 파일*의 심볼·DWARF 필요.

```bash
$ gdb /usr/local/bin/server /var/crash/core.server.1234
```

같은 *바이너리 비트*가 핵심. 빌드 다르면 (다른 일시·환경) build-id가 달라 GDB가 *경고*.

### Build-ID 매칭

core 안에 *실행 파일의 build-id*도 저장. 다른 머신에서 core를 받으면.

```bash
$ readelf -n core | grep -B 1 "Build ID"
  CORE
  Build ID: 8d3a91f0e5...
```

이 build-id로 *맞는 실행 파일*을 찾기. `/usr/lib/debug/.build-id/8d/3a91f0e5...`에 debuginfo 검색.

자세히는 다음 장.

## 부분 core — gcore

라이브 프로세스의 core를 *수동으로* 추출.

```bash
$ sudo gcore -o /tmp/core <pid>
0x00007ffff7f0... in epoll_wait () from /lib/x86_64-linux-gnu/libc.so.6
Saved corefile /tmp/core.12345
```

내부적으로 GDB가 *attach + 메모리 dump + detach*. 디버기는 *잠시 정지*하지만 곧 재개.

이 core는 *진짜 사망* core와 같은 포맷. NT_PRSTATUS, NT_FILE 모두 포함.

용도 — 운영 서비스가 *느려졌을 때* core 떨어뜨려 분석. 또는 *살아 있는 프로세스의 스냅샷*.

## minicore — 핵심만

전체 core가 *너무 크면* (수십 GB) *콜스택과 핵심 변수*만 추출.

```bash
# 자체 도구로 (오픈 도구 별 없음)
$ minicoredumper --pid=<pid> --recipe=<recipe>
```

[minicoredumper](https://www.linutronix.de/en/products/minicoredumper) 같은 임베디드용 도구. *어떤 영역만* 저장할지 *레시피*로 지정.

기본적으로는 coredump_filter로 영역 제한.

## Mach-O core (macOS)

macOS의 core는 *Mach-O 포맷*. ELF와 다르지만 *개념 같음*: 메모리 매핑 + 레지스터/스레드 메타.

```bash
$ file /cores/core.12345
/cores/core.12345: Mach-O 64-bit core x86_64
```

GDB와 LLDB 모두 두 포맷 읽음. 그래서 *Linux core를 macOS의 lldb로* 분석도 가능 (드물지만).

## .ips / .crash — Apple

위는 *완전한 core*가 아닙니다. *콜스택 + 일부 변수*만. Apple Crash Reporter가 떨어뜨리는 `.ips` (JSON 또는 텍스트).

```bash
$ ls ~/Library/Logs/DiagnosticReports/
MyApp_2026-05-10-032114_MyMac.ips
```

`.ips`는 *콜스택 분석에만* 사용. lldb로 메모리 검사 안 됨.

## minidump — Google Breakpad

크로스 플랫폼 *축약된 core* 포맷.

```
콜스택만 + 일부 핫 메모리 + 모듈 목록
크기: 보통 수 MB (full core의 1/1000)
```

Chrome·Firefox·게임이 사용. *대규모 클라이언트*에서 자동 수집에 적합.

```bash
$ minidump_stackwalk crash.dmp ./symbols/
[콜스택 + 레지스터 + 모듈]
```

Sentry, Crashlytics 같은 서비스가 minidump 위에 dashboard.

## 정리

- core = ELF 파일 (ET_CORE).
- PT_NOTE = 메타데이터, PT_LOAD = 메모리 내용.
- NT_PRSTATUS가 *각 스레드의 레지스터·시그널·tid*.
- NT_PRPSINFO가 *프로세스 정보*.
- NT_FILE이 *매핑된 모든 파일* (실행 파일 + .so + mmap).
- NT_AUXV가 *auxv 벡터* (실행 환경).
- NT_SIGINFO의 si_code가 *왜 죽었나*의 첫 단서.
- coredump_filter로 *영역 선택* → 큰 file-backed 제외.
- gcore로 *살아 있는* 프로세스의 core.
- Apple은 `.ips`, Google Breakpad는 minidump.

## 다음 장 예고

Ch 3 — GDB로 core 분석. siginfo 해독, 모든 스레드 콜스택, 변수 검사.

## 관련 항목

- [Ch 1: core 생성 메커니즘](/blog/tools/debugging/postmortem/chapter01-core-generation)
- [Ch 3: GDB로 core 분석](/blog/tools/debugging/postmortem/chapter03-gdb-core-analysis)
- [DWARF and ELF Internals Ch 1: ELF 포맷](/blog/tools/debugging/dwarf-elf/chapter01-elf-overview)
- `man 5 core`, `man 5 elf`
- [Anatomy of an ELF core file](https://www.gabriel.urdhr.fr/2015/05/29/core-file/)
