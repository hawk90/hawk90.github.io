---
title: "ELF Core 파일 포맷 분해 — NT_PRSTATUS·NT_PRPSINFO·NT_FILE"
slug: "tools/debugging/postmortem/chapter02-elf-core-format"
date: 2026-06-01T09:02:00
description: "core dump의 내부 구조. PT_NOTE/PT_LOAD, NT_PRSTATUS, NT_FILE, NT_AUXV."
tags: [core-dump, elf, nt-prstatus, postmortem]
series: "Postmortem Debugging"
seriesOrder: 2
draft: false
topics: ["tools", "tools/debugging"]
---

Linux가 만든 core 파일은 그냥 ELF입니다. `e_type`이 `ET_CORE`일 뿐 실행 파일·공유 라이브러리와 같은 포맷이고, 같은 `readelf`로 열립니다. 이 장은 한 개의 실제 core를 처음부터 끝까지 분해합니다. PT_NOTE 안의 노트가 무엇을 담는지, PT_LOAD가 어떤 메모리를 담고 어떤 메모리를 빼는지, 디버거가 그 둘을 어떻게 읽는지 차례로 봅니다.

:::tldr
core는 PT_NOTE 하나와 PT_LOAD 여러 개로 이루어집니다. PT_NOTE에는 프로세스 노트(PRPSINFO, SIGINFO, AUXV, FILE)가 한 벌, 스레드 노트(PRSTATUS, FPREGSET, 아키텍처 레지스터)가 스레드 수만큼 들어 있습니다. PT_LOAD 중 `FileSiz`가 0이거나 `MemSiz`보다 작은 것은 core에 내용이 없는 영역이고, 디버거는 그 부분을 NT_FILE이 가리키는 원본 파일에서 읽습니다.
:::

## 분해할 core

실험용 프로그램은 스레드 두 개를 띄운 뒤 메인 스레드에서 `0xdeadbeef`를 역참조합니다. Debian 13.7 arm64(커널 6.12.116, GCC 14.2.0, binutils 2.44, elfutils 0.192) QEMU VM에서 `-g -O0 -pthread`로 빌드하고 `./server --config=prod.yaml`로 실행해 17,199,104바이트짜리 core를 얻었습니다.

```c title="server.c"
#include <pthread.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

static void *worker(void *arg) {
    (void)arg;
    for (;;) pause();
}

static int parse_port(const char *s) {
    int *bad = (int *)0xdeadbeef;     /* corrupted pointer */
    return *bad + (s ? (int)strlen(s) : 0);
}

int main(int argc, char **argv) {
    pthread_t t[2];
    for (int i = 0; i < 2; i++) pthread_create(&t[i], NULL, worker, NULL);
    sleep(1);
    printf("port=%d\n", parse_port(argc > 1 ? argv[1] : NULL));
    return 0;
}
```

## 전체 구조

![ELF core 파일 — PT_NOTE / PT_LOAD 분해](/images/blog/tools/diagrams/core-elf-structure.svg)

ELF 헤더부터 봅니다. `Type`이 `CORE`이고, 섹션 헤더는 하나도 없으며 프로그램 헤더만 23개 있습니다. core에서는 프로그램 헤더가 전부입니다.

```text
$ readelf -h core
ELF Header:
  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00
  Class:                             ELF64
  Data:                              2's complement, little endian
  Type:                              CORE (Core file)
  Machine:                           AArch64
  Entry point address:               0x0
  Start of program headers:          64 (bytes into file)
  Start of section headers:          0 (bytes into file)
  Number of program headers:         23
  Number of section headers:         0
(Version·OS/ABI·크기 필드 생략)
```

23개 중 첫 번째가 PT_NOTE이고 나머지 22개가 PT_LOAD입니다.

```text
$ readelf -lW core
Program Headers:
  Type           Offset   VirtAddr           PhysAddr           FileSiz  MemSiz   Flg Align
  NOTE           0x000548 0x0000000000000000 0x0000000000000000 0x001a38 0x000000     0x4
  LOAD           0x002000 0x0000aaaacd7b0000 0x0000000000000000 0x001000 0x001000 R E 0x1000
  LOAD           0x003000 0x0000aaaacd7cf000 0x0000000000000000 0x001000 0x001000 R   0x1000
  LOAD           0x004000 0x0000aaaacd7d0000 0x0000000000000000 0x001000 0x001000 RW  0x1000
  LOAD           0x005000 0x0000aaaaf1375000 0x0000000000000000 0x021000 0x021000 RW  0x1000
  LOAD           0x026000 0x0000ffff9e940000 0x0000000000000000 0x000000 0x010000     0x1000
  LOAD           0x026000 0x0000ffff9e950000 0x0000000000000000 0x800000 0x800000 RW  0x1000
  ...
  LOAD           0x1026000 0x0000ffff9f960000 0x0000000000000000 0x001000 0x19c000 R E 0x1000
  ...
  LOAD           0x1046000 0x0000ffffcb575000 0x0000000000000000 0x021000 0x021000 RW  0x1000
(LOAD 22개 중 9개 표시)
```

## PT_NOTE — 메타데이터

NOTE 세그먼트 6,712바이트(0x1a38) 안에 노트 레코드가 이어 붙어 있습니다. 노트 하나는 12바이트 헤더, owner 이름, descriptor 순서입니다.

### Note 레코드 구조

헤더 세 필드와 4바이트 정렬을 C로 옮긴 예입니다. 정렬 함수는 오버플로를 검사합니다.

```c title="elf-note-layout.c"
#include <stddef.h>
#include <stdint.h>

struct Elf64_Nhdr {
    uint32_t n_namesz;
    uint32_t n_descsz;
    uint32_t n_type;
};

static int align4(size_t n, size_t *aligned) {
    if (n > SIZE_MAX - 3u) return -1;
    *aligned = (n + 3u) & ~(size_t)3u;
    return 0;
}

_Static_assert(sizeof(struct Elf64_Nhdr) == 12, "ELF note header layout");

int main(void) {
    size_t a, b;
    return align4(5, &a) == 0 && a == 8 &&
           align4(9, &b) == 0 && b == 12 &&
           align4(SIZE_MAX, &a) == -1 ? 0 : 1;
}
```

`CORE`는 NUL 포함 5바이트라 이름 칸은 8바이트를 차지합니다. owner 이름은 `n_type`과 함께 노트 종류를 정합니다. `CORE` 노트는 SVR4 시절부터 내려온 공통 노트이고, `LINUX` 노트는 Linux가 추가한 아키텍처별 레지스터 묶음입니다.

### 이 core에 들어 있는 노트

`readelf -nW core`의 출력에서 첫 스레드 부분입니다. 긴 16진 덤프는 줄였습니다.

```text
  Owner                Data size 	Description
  CORE                 0x00000188	NT_PRSTATUS (prstatus structure)
  CORE                 0x00000088	NT_PRPSINFO (prpsinfo structure)
  CORE                 0x00000080	NT_SIGINFO (siginfo_t data)
  CORE                 0x00000170	NT_AUXV (auxiliary vector)
  CORE                 0x00000257	NT_FILE (mapped files)	    Page size: 4096
  CORE                 0x00000210	NT_FPREGSET (floating point registers)
  LINUX                0x00000010	NT_ARM_TLS (AArch TLS registers)
  LINUX                0x00000108	NT_ARM_HW_BREAK (AArch hardware breakpoint registers)
  LINUX                0x00000108	NT_ARM_HW_WATCH (AArch hardware watchpoint registers)
  LINUX                0x00000004	NT_ARM_SYSTEM_CALL (AArch system call number)
  LINUX                0x00000010	NT_ARM_PAC_MASK (AArch pointer authentication code masks)
  LINUX                0x00000008	NT_ARM_PAC_ENABLED_KEYS (AArch64 pointer authentication enabled keys)
  LINUX                0x00000040	NT_ARM_PACA_KEYS (ARM pointer authentication address keys)
  LINUX                0x00000010	NT_ARM_PACG_KEYS (ARM pointer authentication generic keys)
  LINUX                0x00000008	NT_ARM_TAGGED_ADDR_CTRL (AArch tagged address control)
  CORE                 0x00000188	NT_PRSTATUS (prstatus structure)
  CORE                 0x00000210	NT_FPREGSET (floating point registers)
  ...
(NT_FILE 목록과 description data 생략, 두 번째·세 번째 스레드도 같은 11개 노트)
```

프로세스 노트 4개(PRPSINFO, SIGINFO, AUXV, FILE)는 첫 PRSTATUS 바로 뒤에 한 번만 나옵니다. 나머지 11개는 스레드마다 한 벌씩 들어가서, 스레드 3개인 이 core에는 PRSTATUS가 세 번 있습니다.

### 주요 NT_*

`n_type` 값은 `linux-libc-dev 6.12.117`의 `/usr/include/linux/elf.h`에서 확인했습니다.

| Note | n_type | Owner | 내용 |
|------|--------|-------|------|
| `NT_PRSTATUS` | 1 | CORE | 한 스레드의 시그널·PID·범용 레지스터 |
| `NT_PRFPREG` (`NT_FPREGSET`) | 2 | CORE | 부동소수·SIMD 레지스터 |
| `NT_PRPSINFO` | 3 | CORE | 프로세스 상태, UID, 실행 파일 이름, 명령줄 앞 80바이트 |
| `NT_TASKSTRUCT` | 4 | CORE | 헤더에 정의만 있고 이 core에는 없음 |
| `NT_AUXV` | 6 | CORE | 커널이 프로세스에 넘긴 보조 벡터 |
| `NT_SIGINFO` | 0x53494749 | CORE | 죽음을 일으킨 `siginfo_t` |
| `NT_FILE` | 0x46494c45 | CORE | 매핑된 파일 목록 |
| `NT_PRXFPREG` | 0x46e62b7f | LINUX | x86 FXSAVE 영역 |
| `NT_X86_XSTATE` | 0x202 | LINUX | x86 XSAVE 영역(AVX, AVX-512) |
| `NT_ARM_VFP` | 0x400 | LINUX | 32비트 ARM VFP/NEON |
| `NT_ARM_TLS` | 0x401 | LINUX | TLS 레지스터(`TPIDR_EL0`) |
| `NT_ARM_HW_BREAK` / `HW_WATCH` | 0x402 / 0x403 | LINUX | 하드웨어 breakpoint·watchpoint 레지스터 |
| `NT_ARM_SYSTEM_CALL` | 0x404 | LINUX | 진행 중이던 syscall 번호 |
| `NT_ARM_SVE` | 0x405 | LINUX | SVE 레지스터 |
| `NT_ARM_PAC_MASK` | 0x406 | LINUX | 포인터 인증 코드가 쓰는 비트 마스크 |
| `NT_ARM_PACA_KEYS` / `PACG_KEYS` | 0x407 / 0x408 | LINUX | 포인터 인증 키 |
| `NT_ARM_TAGGED_ADDR_CTRL` | 0x409 | LINUX | `PR_SET_TAGGED_ADDR_CTRL` 상태(TBI·MTE) |
| `NT_ARM_PAC_ENABLED_KEYS` | 0x40a | LINUX | 켜진 PAC 키 |

어떤 노트가 들어가는지는 CPU 기능을 따릅니다. 이 VM은 Apple Silicon 호스트의 `-cpu host`라 PAC 노트가 있고, SVE가 없는 CPU라 `NT_ARM_SVE`가 없습니다.

PAC 키 노트에는 그 프로세스의 실제 키 바이트가 들어 있습니다(`NT_ARM_PACA_KEYS`의 description data 64바이트). core를 다른 사람에게 넘기는 것은 메모리 내용뿐 아니라 이런 비밀까지 넘기는 일입니다.

## NT_PRSTATUS — 한 스레드의 정체

스레드마다 하나씩 있는 가장 중요한 노트입니다. glibc 2.41의 `<sys/procfs.h>` 정의는 다음과 같습니다.

```c
struct elf_prstatus
  {
    struct elf_siginfo pr_info;		/* Info associated with signal.  */
    short int pr_cursig;		/* Current signal.  */
    unsigned long int pr_sigpend;	/* Set of pending signals.  */
    unsigned long int pr_sighold;	/* Set of held signals.  */
    __pid_t pr_pid;
    __pid_t pr_ppid;
    __pid_t pr_pgrp;
    __pid_t pr_sid;
    struct timeval pr_utime;		/* User time.  */
    struct timeval pr_stime;		/* System time.  */
    struct timeval pr_cutime;		/* Cumulative user time.  */
    struct timeval pr_cstime;		/* Cumulative system time.  */
    elf_gregset_t pr_reg;		/* GP registers.  */
    int pr_fpvalid;			/* True if math copro being used.  */
  };
```

`pr_pid`는 스레드의 TID(LWP)입니다. `pr_reg`의 크기는 아키텍처가 정합니다. aarch64의 `elf_gregset_t`는 `struct user_regs_struct`(x0–x30, sp, pc, pstate 34개 × 8바이트 = 272바이트)이고, 정렬까지 더하면 노트 크기 0x188 = 392바이트와 맞습니다.

`readelf`는 이 노트의 크기만 보여 주므로 내용은 `eu-readelf -n`으로 풉니다.

```text
$ eu-readelf -n core
  CORE                 392  PRSTATUS
    info.si_signo: 11, info.si_code: 0, info.si_errno: 0, cursig: 11
    sigpend: <>
    sighold: <>
    pid: 6512, ppid: 6504, pgrp: 6504, sid: 6504
    utime: 0.000000, stime: 0.000000, cutime: 0.000000, cstime: 0.000000
    pc: 0x0000aaaacd7b091c, pstate: 0x0000000020001000, fpvalid: 1
    x0:            3735928559  x1:       281473361251168
    ...
    x30:      187650568554956  sp:    0x0000ffffcb594b60
(x1–x29 생략)
```

`cursig: 11`이 SIGSEGV이고, `pc`가 죽은 명령 주소, `sp`가 콜스택을 풀기 시작할 스택 포인터입니다. `x0` 3735928559는 0xdeadbeef로, 역참조한 포인터가 그대로 레지스터에 남아 있습니다.

`info.si_code`가 0인 점을 눈여겨봐야 합니다. PRSTATUS의 `pr_info`에는 시그널 번호만 채워지고 `si_code`는 비어 있습니다. 실제 `si_code`(1, SEGV_MAPERR)는 아래 NT_SIGINFO에 있습니다.

## NT_PRPSINFO — 프로세스 정보

프로세스 단위 정보는 이 노트 하나에 있습니다.

```c
struct elf_prpsinfo
  {
    char pr_state;			/* Numeric process state.  */
    char pr_sname;			/* Char for pr_state.  */
    char pr_zomb;			/* Zombie.  */
    char pr_nice;			/* Nice val.  */
    unsigned long int pr_flag;		/* Flags.  */
    __pr_uid_t pr_uid;
    __pr_gid_t pr_gid;
    int pr_pid, pr_ppid, pr_pgrp, pr_sid;
    /* Lots missing */
    char pr_fname[16];			/* Filename of executable.  */
    char pr_psargs[ELF_PRARGSZ];	/* Initial part of arg list.  */
  };
```

`ELF_PRARGSZ`는 80이라 명령줄은 80바이트에서 잘립니다. 여기의 `pr_pid`는 프로세스 ID(TGID)입니다.

```text
  CORE                 136  PRPSINFO
    state: 0, sname: R, zomb: 0, nice: 0, flag: 0x0000000000400600
    uid: 0, gid: 0, pid: 6512, ppid: 6504, pgrp: 6504, sid: 6504
    fname: server, psargs: ./server --config=prod.yaml
```

GDB가 core를 열 때 찍는 "Core was generated by `./server --config=prod.yaml'."가 이 `psargs`입니다.

## NT_SIGINFO — 죽음의 정체

커널이 시그널을 보낼 때 만든 `siginfo_t` 128바이트가 그대로 들어 있습니다. `eu-readelf`가 핵심 필드를 풀어 줍니다.

```text
  CORE                 128  SIGINFO
    si_signo: 11, si_errno: 0, si_code: 1
    fault address: 0xdeadbeef
```

GDB에서는 `$_siginfo` 편의 변수로 같은 내용을 봅니다. 공용체 전체가 찍히므로 SIGSEGV에서는 `_sigfault` 부분만 읽습니다.

```text
(gdb) p $_siginfo
$1 = {si_signo = 11, si_errno = 0, si_code = 1, _sifields = {_pad = {-559038737, 0 <repeats 27 times>}, ...
      _sigfault = {si_addr = 0xdeadbeef}, ...}}
```

### si_code 값

값은 `linux-libc-dev 6.12.117`의 `/usr/include/asm-generic/siginfo.h`에서 옮겼습니다. 오른쪽 열은 같은 VM에서 실제로 그 코드를 만든 방법입니다.

| si_code (SIGSEGV) | 의미 | 재현 |
|-------------------|------|------|
| 1 (SEGV_MAPERR) | 매핑되지 않은 주소 | `*(int *)0`, `*(int *)0xdeadbeef` |
| 2 (SEGV_ACCERR) | 매핑은 있지만 권한 없음 | `static const` 배열에 쓰기 (`si_addr`가 `<ro>`) |
| 3 (SEGV_BNDERR) | bound 검사 실패 | — |
| 4 (SEGV_PKUERR) | protection key 검사 실패 | — |
| 8 / 9 (SEGV_MTEAERR / MTESERR) | Arm MTE 비동기 / 동기 태그 불일치 | — |

| si_code (SIGBUS) | 의미 | 재현 |
|------------------|------|------|
| 1 (BUS_ADRALN) | 정렬 위반 | — |
| 2 (BUS_ADRERR) | 존재하지 않는 물리 주소 | 4 KiB 파일을 8 KiB로 `mmap`하고 두 번째 페이지 읽기 |
| 3 (BUS_OBJERR) | 객체별 하드웨어 오류 | — |
| 4 (BUS_MCEERR_AR) | 메모리 오류, 즉시 조치 필요 | — |

| si_code (SIGILL) | 의미 | 재현 |
|------------------|------|------|
| 1 (ILL_ILLOPC) | illegal opcode | `udf #0` (`si_addr`가 `<main+236>`) |
| 2 (ILL_ILLOPN) | illegal operand | — |
| 3 (ILL_ILLADR) | illegal addressing mode | — |
| 5 (ILL_PRVOPC) | privileged opcode | — |
| 6 (ILL_PRVREG) | privileged register | — |

`—`는 이 실험에서 재현하지 않은 값입니다. 정렬 위반(BUS_ADRALN)을 노리고 홀수 주소에 `ldxr`을 실행해 봤지만 이 호스트에서는 시그널 없이 끝났습니다. 정수를 0으로 나누는 코드도 SIGFPE를 내지 않고 `7/0 = 0`을 찍었습니다. A64의 `SDIV`·`UDIV`는 나누는 수가 0이면 결과를 0으로 정의하고 예외를 내지 않기 때문입니다(Arm ARM의 SDIV/UDIV 명령 설명). x86에서 흔한 FPE_INTDIV core는 arm64에서는 나오지 않습니다.

`si_addr`는 시그널을 일으킨 주소일 뿐입니다. SIGSEGV에서는 접근한 데이터 주소이고, SIGILL에서는 명령 주소입니다. NULL 역참조인지 판단하려면 [Ch 3](/blog/tools/debugging/postmortem/chapter03-gdb-core-analysis)처럼 명령과 레지스터를 같이 봐야 합니다.

## NT_FILE — 매핑된 파일

core를 쓸 때 프로세스에 매핑돼 있던 파일 목록입니다. 커널 `fs/binfmt_elf.c`의 `fill_files_note()`가 만드는 형식은 개수, 페이지 크기, (start, end, 페이지 단위 offset) 배열, NUL로 끝나는 경로 문자열들입니다.

```c
struct {
    long count;
    long page_size;
    struct {
        unsigned long start;
        unsigned long end;
        unsigned long file_ofs;   /* page_size 단위 */
    } entries[count];
    char paths[];                 /* count개의 NUL 종료 문자열 */
};
```

`eu-readelf`는 offset을 바이트로 환산하고 크기를 더해 보여 줍니다.

```text
  CORE                 599  FILE
    10 files:
      aaaacd7b0000-aaaacd7b1000 00000000 4096        /root/c2/server
      aaaacd7cf000-aaaacd7d0000 0000f000 4096        /root/c2/server
      aaaacd7d0000-aaaacd7d1000 00010000 4096        /root/c2/server
      ffff9f960000-ffff9fafc000 00000000 1687552     /usr/lib/aarch64-linux-gnu/libc.so.6
      ffff9fafc000-ffff9fb0d000 0019c000 69632       /usr/lib/aarch64-linux-gnu/libc.so.6
      ffff9fb0d000-ffff9fb10000 0019d000 12288       /usr/lib/aarch64-linux-gnu/libc.so.6
      ffff9fb10000-ffff9fb12000 001a0000 8192        /usr/lib/aarch64-linux-gnu/libc.so.6
      ffff9fb21000-ffff9fb49000 00000000 163840      /usr/lib/aarch64-linux-gnu/ld-linux-aarch64.so.1
      ffff9fb5f000-ffff9fb61000 0002e000 8192        /usr/lib/aarch64-linux-gnu/ld-linux-aarch64.so.1
      ffff9fb61000-ffff9fb62000 00030000 4096        /usr/lib/aarch64-linux-gnu/ld-linux-aarch64.so.1
```

목록은 파일에 연결된 매핑만 담습니다. heap, 스레드 스택, vDSO 같은 익명 매핑은 PT_LOAD에는 있지만 NT_FILE에는 없습니다. 경로는 core를 쓴 시점의 이름이라, 분석하는 머신에 같은 경로의 같은 파일이 있어야 디버거가 그 내용을 채울 수 있습니다.

## NT_AUXV — auxv 벡터

커널이 `execve()` 때 프로세스 스택에 넣어 준 보조 벡터입니다. `(type, value)` 쌍이 `AT_NULL`까지 이어집니다. GDB의 `info auxv`가 이름과 설명을 붙여 줍니다.

```text
(gdb) info auxv
33   AT_SYSINFO_EHDR      System-supplied DSO's ELF header 0xffff9fb5d000
51   AT_MINSIGSTKSZ       Minimum stack size for signal delivery 0x1270
16   AT_HWCAP             Machine-dependent CPU capability hints 0xefb3ffff
6    AT_PAGESZ            System page size               4096
17   AT_CLKTCK            Frequency of times()           100
3    AT_PHDR              Program headers for program    0xaaaacd7b0040
4    AT_PHENT             Size of program header entry   56
5    AT_PHNUM             Number of program headers      10
7    AT_BASE              Base address of interpreter    0xffff9fb21000
8    AT_FLAGS             Flags                          0x0
9    AT_ENTRY             Entry point of program         0xaaaacd7b07c0
11   AT_UID               Real user ID                   0
...
23   AT_SECURE            Boolean, was exec setuid-like? 0
25   AT_RANDOM            Address of 16 random bytes     0xffffcb594f78
26   AT_HWCAP2            Extension of AT_HWCAP          0x26181
31   AT_EXECFN            File name of executable        0xffffcb595fef "./server"
15   AT_PLATFORM          String identifying platform    0xffffcb594f88 "aarch64"
27   AT_RSEQ_FEATURE_SIZE rseq supported feature size    28
28   AT_RSEQ_ALIGN        rseq allocation alignment      32
0    AT_NULL              End of vector                  0x0
(AT_EUID·AT_GID·AT_EGID 생략)
```

`AT_BASE`는 동적 링커(`ld-linux-aarch64.so.1`)가 올라간 주소로 NT_FILE의 0xffff9fb21000과 같습니다. `AT_SYSINFO_EHDR`는 vDSO의 위치입니다. `AT_HWCAP`·`AT_HWCAP2`는 CPU 기능 비트라서, 다른 CPU에서 돌던 프로세스의 core인지 확인할 때 씁니다. `AT_EXECFN`과 `AT_PLATFORM`은 문자열 주소이므로 GDB가 core의 스택 메모리에서 문자열을 읽어 붙였습니다. elfutils 0.192의 `eu-readelf`는 `AT_MINSIGSTKSZ`(51)와 `AT_RSEQ_*`(27, 28)를 이름 없이 번호로만 찍었습니다.

## PT_LOAD — 메모리 내용

PT_LOAD 하나가 매핑 하나입니다. 어떤 매핑의 내용을 담을지는 [Ch 1](/blog/tools/debugging/postmortem/chapter01-core-generation)의 `coredump_filter`가 정합니다.

| 필드 | 의미 |
|------|------|
| `Offset` | core 파일 안의 위치 |
| `VirtAddr` | 프로세스의 가상 주소 |
| `FileSiz` | core에 실제로 저장된 바이트 |
| `MemSiz` | 매핑 크기 |
| `Flags` | 매핑 권한 R/W/E |

`FileSiz`와 `MemSiz`를 비교하면 세 종류가 보입니다. 이 core의 PT_LOAD 22개에서 고른 대표 행입니다.

```text
  LOAD           0x002000 0x0000aaaacd7b0000 0x0000000000000000 0x001000 0x001000 R E 0x1000
  LOAD           0x026000 0x0000ffff9e940000 0x0000000000000000 0x000000 0x010000     0x1000
  LOAD           0x026000 0x0000ffff9e950000 0x0000000000000000 0x800000 0x800000 RW  0x1000
  LOAD           0x1026000 0x0000ffff9f960000 0x0000000000000000 0x001000 0x19c000 R E 0x1000
  LOAD           0x1027000 0x0000ffff9fafc000 0x0000000000000000 0x000000 0x011000     0x1000
```

| 행 | 매핑 | FileSiz / MemSiz | 이유 |
| --- | --- | --- | --- |
| 1 | `server`의 첫 페이지 (R E) | 0x1000 / 0x1000 | 실행 파일이 작아 ELF 헤더 페이지 하나가 전부 |
| 2 | 권한 없는 64 KiB | 0 / 0x10000 | 스레드 스택의 guard page, 읽을 수 없으니 저장 안 함 |
| 3 | 8 MiB RW | 0x800000 / 0x800000 | 워커 스레드 스택(anonymous private), 전부 저장 |
| 4 | `libc.so.6` 코드 (R E) | 0x1000 / 0x19c000 | file-backed private이라 비트 2가 꺼진 기본 필터에서 빠짐. 첫 페이지만 저장 |
| 5 | `libc.so.6`의 권한 없는 구간 | 0 / 0x11000 | 세그먼트 사이 빈 공간 |

4번 행의 첫 페이지는 `coredump_filter` 비트 4(ELF headers)가 남긴 것입니다. 이 페이지에 ELF 헤더와 build-id 노트가 있어서, 디버거는 나머지를 어느 파일에서 채울지 알 수 있습니다.

## GDB의 core 로딩 흐름

GDB는 BFD 라이브러리로 core를 엽니다. BFD는 노트와 PT_LOAD를 가짜 섹션으로 바꾸고, GDB는 그 섹션을 이름으로 찾습니다. `maint info sections`가 그 결과를 보여 줍니다.

```text
(gdb) maint info sections
Core file: `/root/c2/core', file type elf64-littleaarch64.
 [0]      0x00000000->0x00001a38 at 0x00000548: note0 READONLY HAS_CONTENTS
 [1]      0x00000000->0x00000110 at 0x000005cc: .reg/6512 HAS_CONTENTS
 [3]      0x00000000->0x00000080 at 0x00000794: .note.linuxcore.siginfo/6512 HAS_CONTENTS
 [5]      0x00000000->0x00000170 at 0x00000828: .auxv HAS_CONTENTS
 [6]      0x00000000->0x00000257 at 0x000009ac: .note.linuxcore.file/6512 HAS_CONTENTS
 [8]      0x00000000->0x00000210 at 0x00000c18: .reg2/6512 HAS_CONTENTS
 [16]     0x00000000->0x00000010 at 0x000010b0: .reg-aarch-pauth/6512 HAS_CONTENTS
 [20]     0x00000000->0x00000110 at 0x000011f4: .reg/6514 HAS_CONTENTS
 [27]     0x00000000->0x00000110 at 0x000018fc: .reg/6513 HAS_CONTENTS
 [34]     0xaaaacd7b0000->0xaaaacd7b1000 at 0x00002000: load1 ALLOC LOAD READONLY CODE HAS_CONTENTS
 [38]     0xffff9e940000->0xffff9e950000 at 0x00026000: load5 ALLOC READONLY
 [42]     0xffff9f960000->0xffff9f961000 at 0x01026000: load9a ALLOC LOAD READONLY CODE HAS_CONTENTS
 [43]     0xffff9f961000->0xffff9fafc000 at 0x01027000: load9b ALLOC READONLY CODE
(Exec file 섹션 31개와 core 섹션 58개 중 일부만 표시)
```

읽는 순서를 섹션 이름으로 따라가면 이렇습니다.

1. `.reg/<lwp>`마다 스레드를 하나 만듭니다. 0x110(272)바이트는 PRSTATUS 안의 `pr_reg`만 잘라 낸 것입니다. 그래서 GDB가 `[New LWP 6512]`, `[New LWP 6514]`, `[New LWP 6513]`을 찍습니다.
2. `.reg2`(FPREGSET), `.reg-aarch-pauth`(PAC_MASK) 같은 섹션으로 나머지 레지스터를 채웁니다.
3. `.auxv`와 `.note.linuxcore.file`로 동적 링커 위치와 라이브러리 목록을 얻어 공유 라이브러리 심볼을 읽습니다.
4. `loadN`처럼 `HAS_CONTENTS`가 있는 섹션은 core에서 메모리를 읽고, `load9b`처럼 없는 섹션은 같은 주소에 매핑된 파일(여기서는 `libc.so.6`)에서 읽습니다. BFD는 `FileSiz < MemSiz`인 PT_LOAD를 내용 있는 `load9a`와 없는 `load9b` 둘로 쪼갭니다.

이후 `bt`, `print`, `info threads`는 라이브 프로세스와 같은 명령으로 동작합니다. 다른 점은 실행을 이어 갈 수 없다는 것뿐입니다.

## 호환 — 실행 파일이 같아야

core에는 실행 파일 코드의 첫 페이지만 있습니다. `bt`와 소스 줄 번호를 얻으려면 디버거에 같은 실행 파일과 DWARF를 줘야 합니다.

```bash
gdb ./server core
```

### Build-ID 매칭

GNU build ID는 실행 파일의 `.note.gnu.build-id`에 있습니다. 이 섹션은 첫 페이지(`.note.gnu.build-id`가 0x270)에 있으므로, 비트 4가 켜진 기본 필터에서는 core에도 사본이 남습니다. `eu-unstrip -n --core`는 core 안의 모든 모듈과 build ID를 뽑아 줍니다.

```text
$ eu-unstrip -n --core core
0xaaaacd7b0000+0x21000 ce3c12e1cf437cb46c6dbbb5b556746f6b5c7462@0xaaaacd7b0280 . . /root/c2/server
0xffff9fb5d000+0x1000 cc00a9dd32953bb934aac887a0cbec5fdccf3165@0xffff9fb5d2b0 . - linux-vdso.so.1
0xffff9fb21000+0x41640 d7be73c7b2bf2531fb3e11318f0949141af7063a@0xffff9fb21268 /lib/ld-linux-aarch64.so.1 - ld-linux-aarch64.so.1
0xffff9f960000+0x1be010 5f3926d9963ff284b8173bf3601bbb00c3abad16@0xffff9f960348 /lib/aarch64-linux-gnu/libc.so.6 - libc.so.6
$ readelf -n server | grep "Build ID"
    Build ID: ce3c12e1cf437cb46c6dbbb5b556746f6b5c7462
```

필터에서 비트 4를 끄고(`0x23`) 같은 프로그램을 죽이면 `eu-unstrip -n --core`에 vDSO 한 줄만 남습니다. 커널이 메모리에서 그대로 복사하는 vDSO를 빼면 build ID를 찾을 근거가 사라집니다.

소스를 한 줄 바꾸고 `-O2`로 다시 빌드한 실행 파일(build ID `694c62ba…`)로 같은 core를 열자 GDB가 경고하고 함수 이름을 잃었습니다.

```text
$ gdb -batch -ex bt ./server2 core
warning: core file may not match specified executable file.
...
#0  0x0000aaaacd7b091c in ?? ()
#1  0x0044aaaacd7b09ac in ?? ()
#2  0x0000ffffcb595e90 in ?? ()
```

`#1`의 상위 바이트 0x0044는 PAC 서명이 남은 복귀 주소입니다. `NT_ARM_PAC_MASK`의 마스크(0x007f000000000000)가 바로 이 비트 범위입니다. 맞는 실행 파일로 열면 같은 프레임이 `#1  0x0000aaaacd7b09cc in main (argc=2, argv=0xffffcb594d58) at server.c:20`으로 풀립니다. 빌드 ID로 맞는 파일과 debuginfo를 찾는 방법은 [Ch 4](/blog/tools/debugging/postmortem/chapter04-debuginfod-minidump-automation)에서 다룹니다.

## 부분 core — gcore

`gcore`는 GDB로 살아 있는 프로세스에 붙어 core를 쓰고 떨어집니다. 포맷은 같은 ELF core이지만 노트는 GDB가 직접 만듭니다. sshd 프로세스에 `gcore`를 걸어 노트 종류를 세 봤습니다.

```text
$ gcore -o /root/c2/gc $(pgrep -x sshd | head -1)
Saved corefile /root/c2/gc.1041
[Inferior 1 (process 1041) detached]
$ eu-readelf -n gc.1041 | grep -E "^  (CORE|LINUX)" | awk '{print $1, $3}' | sort | uniq -c
      1 CORE AUXV
      1 CORE FILE
      1 CORE FPREGSET
      1 CORE PRPSINFO
      1 CORE PRSTATUS
      1 CORE SIGINFO
      1 LINUX ARM_TLS
      1 LINUX ARM_PAC_MASK
```

커널 core에 있던 HW_BREAK, HW_WATCH, SYSTEM_CALL, PAC 키 노트가 없습니다. 디버깅에 필요한 노트는 남지만, 커널이 쓰는 core와 바이트 단위로 같지는 않습니다. 정지 시간은 Ch 1에서 RSS 1 GiB 프로세스 기준 약 1.1초로 쟀습니다.

## minicore — 핵심만

core가 수십 GB가 되는 프로세스에서는 콜스택과 필요한 변수만 남기고 싶어집니다. Debian 13에는 Linutronix의 [minicoredumper](https://www.linutronix.de/minicoredumper/)가 패키지(`minicoredumper 2.0.7-4`)로 있습니다. `core_pattern`에 파이프로 걸리고, JSON "recept" 파일로 무엇을 담을지 정합니다.

```text
$ cat /etc/minicoredumper/sysctl-start.conf
kernel.core_pattern=|/usr/sbin/minicoredumper %P %u %g %s %t %h %e
kernel.core_pipe_limit=0x7fffffff
```

기본 recept(`generic.recept.json`)는 모든 스레드 스택, `[vdso]`, auxv와 공유 라이브러리 목록, pthread 목록을 담고 gzip으로 묶습니다. heap에 256 MiB를 채우고 NULL에 쓰는 프로그램으로 일반 core와 비교했습니다.

| 방식 | 결과 |
| --- | --- |
| 커널 core (`core_pattern` 파일) | 268,861,440 B |
| minicoredumper | `core.tar.gz` 4,672 B. 풀면 겉보기 268,862,044 B, 실제 할당 52 KiB |

minicoredumper의 core도 GDB로 열려서 `bt`는 `main () at big2.c:7`을 정확히 보여 줬습니다. 대신 heap은 담지 않으므로 `p cache`의 포인터가 가리키는 내용은 0으로 읽혔습니다. 콜스택만으로 원인을 못 찾는 버그라면 recept에 그 변수나 영역을 추가해야 합니다.

## Mach-O core (macOS)

macOS의 core는 ELF가 아니라 Mach-O 포맷입니다. 이 장을 쓴 Mac(macOS 27.2.1)에서는 `kern.corefile`이 `/cores/core.%P`이고, `/cores`가 root 소유 `drwxr-xr-x`라 일반 사용자 프로세스는 `ulimit -c unlimited`로 죽여도 core를 남기지 못했습니다. lldb의 `process save-core`는 디버거 권한 대화상자에서 멈춰서 Mach-O core도 만들지 못했습니다.

반대 방향은 됐습니다. macOS의 `/usr/bin/lldb`(lldb-2103.0.34.407)로 위 Linux aarch64 core를 열자 스택과 레지스터를 그대로 읽었습니다.

```text
$ lldb -b --core core server -o bt -o "register read pc sp x0"
Core file '.../c2/core' (aarch64) was loaded.
(lldb) bt
* thread #1, name = 'server', stop reason = SIGSEGV: address not mapped to object (fault address=0xdeadbeef)
   * frame #0: 0x0000aaaacd7b091c server`parse_port(s="--config=prod.yaml") at server.c:13:12
     frame #1: 0x0000aaaacd7b09cc server`main(argc=2, argv=0x0000ffffcb594d58) at server.c:20:5
     frame #2: 0x0000ffff9f98225c
     frame #3: 0x0000ffff9f98233c
(lldb) register read pc sp x0
      pc = 0x0000aaaacd7b091c  server`parse_port + 32 at server.c:13:12
      sp = 0x0000ffffcb594b60
      x0 = 0x00000000deadbeef
```

`#2`, `#3`에 이름이 없는 것은 Mac에 그 core의 `libc.so.6`이 없어서입니다. NT_FILE이 가리키는 파일을 같이 가져오지 않으면 어느 디버거든 이렇게 됩니다.

## .ips / .crash — Apple

macOS에서 core 대신 늘 남는 것은 Crash Reporter의 `.ips` 보고서입니다. 위 Mac에서 같은 0xdeadbeef 역참조 프로그램을 실행하자 `~/Library/Logs/DiagnosticReports/pmcrash-2026-11-16-132703.ips`(8,058바이트)가 생겼습니다. 첫 줄이 JSON 헤더이고, 둘째 줄부터 본문 JSON입니다.

```json
{"app_name":"pmcrash","timestamp":"2026-11-16 13:27:03.00 +0900","app_version":"","slice_uuid":"3a9900a4-658f-309e-a452-939524d51219","build_version":"","platform":1,"share_with_app_devs":0,"is_first_party":1,"bug_type":"309","os_version":"macOS 27.2.1 (26B131)","roots_installed":0,"incident_id":"93246A13-5454-4326-82D2-A75C5EDDA96E","name":"pmcrash"}
```

본문에서 core의 노트에 해당하는 필드를 뽑았습니다.

| 필드 | 값 | ELF core의 대응 |
| --- | --- | --- |
| `exception` | `EXC_BAD_ACCESS`, `SIGSEGV`, `KERN_INVALID_ADDRESS at 0x00000000deadbeef` | NT_SIGINFO |
| `threads[].frames` | `main` (`crash.c` 2행), `start` | 디버거가 푼 `bt` |
| `threads[].threadState` | `x`, `fp`, `lr`, `sp`, `pc`, `cpsr`, `esr` | NT_PRSTATUS |
| `usedImages` | 5개, 각각 `uuid`·`base`·`path` | NT_FILE + build ID |

메모리 덤프가 없으므로 변수 값을 볼 수 없습니다. 대신 `usedImages`의 UUID가 Mach-O의 `LC_UUID`이고 `slice_uuid`가 실행 파일 자신의 UUID라서, 맞는 dSYM으로 주소를 심볼로 바꿀 수 있습니다.

## minidump — Google Breakpad

minidump는 Microsoft가 정의한 포맷이고, Breakpad가 이를 Linux·macOS로 넓혔습니다. 디렉터리 하나와 스트림 여러 개로 이루어지며 ELF core와는 별개의 포맷입니다. Debian 13에는 Breakpad 패키지가 없어서 [upstream](https://chromium.googlesource.com/breakpad/breakpad/)(커밋 `94c818ea`, 2026-10-15)을 VM에서 직접 빌드했습니다.

`ExceptionHandler`를 건 프로그램이 0xdeadbeef를 역참조하자 14,712바이트짜리 `.dmp`가 생겼습니다. `minidump_dump`로 스트림 목록을 봤습니다.

| 스트림 | 크기 (B) | ELF core의 대응 |
| --- | --- | --- |
| `MD_THREAD_LIST_STREAM` | 52 | NT_PRSTATUS들 |
| `MD_MODULE_LIST_STREAM` | 760 | NT_FILE + build ID |
| `MD_MEMORY_LIST_STREAM` | 36 | PT_LOAD. 여기서는 범위 2개(스택 0x1000, PC 주변 0x100)뿐 |
| `MD_EXCEPTION_STREAM` | 168 | NT_SIGINFO |
| `MD_SYSTEM_INFO_STREAM` | 56 | — |
| `MD_LINUX_CPU_INFO` | 1,356 | — (`/proc/cpuinfo`) |
| `MD_LINUX_PROC_STATUS` | 1,119 | — (`/proc/<pid>/status`) |
| `MD_LINUX_CMD_LINE` | 25 | NT_PRPSINFO의 `psargs` |
| `MD_LINUX_ENVIRON` | 348 | — (환경 변수) |
| `MD_LINUX_AUXV` | 368 | NT_AUXV |
| `MD_LINUX_MAPS` | 3,153 | — (`/proc/<pid>/maps`) |
| `MD_LINUX_DSO_DEBUG` | 488 | — |

스트림 13개 중 하나는 `MD_UNUSED_STREAM`(0바이트)입니다. 환경 변수 스트림이 기본으로 들어간다는 점은 수집 서버에 무엇이 올라가는지 정할 때 중요합니다.

`dump_syms`로 만든 심볼 파일과 함께 `minidump_stackwalk`에 넣으면 콜스택이 나옵니다.

```text
$ minidump_stackwalk dumps/4fe7a110-9c56-4e0b-a2c67f98-150e3628.dmp symbols
Operating system: Linux
                  0.0.0 Linux 6.12.116+deb13-arm64 #1 SMP Debian 6.12.116-1 (2026-11-07) aarch64
CPU: arm64
     4 CPUs

Crash reason:  SIGSEGV /SEGV_MAPERR
Crash address: 0xdeadbeef

Thread 0 (crashed)
 0  app!parse_port [app.cc : 11 + 0x4]
     x0 = 0x00000000deadbeef    x1 = 0x0000000000000001
     ...
    Found by: given as instruction pointer in context
 1  app!main [app.cc : 17 + 0x0]
    Found by: call frame info
(레지스터 덤프 생략)
```

심볼 파일 이름, 모듈 ID, stackwalk 전체 흐름은 [Ch 4](/blog/tools/debugging/postmortem/chapter04-debuginfod-minidump-automation)에서 이어 봅니다. 같은 크래시의 ELF core가 얼마나 큰지와 비교하면 차이가 분명합니다. 이 장의 `server` core는 17 MB였고, minidump는 메모리를 스택 4 KiB와 PC 주변 256바이트만 담아 15 KB였습니다.

## 정리

- core는 섹션 헤더 없이 PT_NOTE 하나와 PT_LOAD 여러 개로 된 `ET_CORE` ELF입니다.
- 프로세스 노트(PRPSINFO, SIGINFO, AUXV, FILE)는 한 번, 스레드 노트(PRSTATUS, FPREGSET, 아키텍처 레지스터)는 스레드마다 들어갑니다.
- PRSTATUS의 `pr_info.si_code`는 비어 있고, 진짜 `si_code`와 fault 주소는 NT_SIGINFO에 있습니다.
- arm64 core에는 PAC 키 노트가 있습니다. core를 넘기는 일은 비밀을 넘기는 일입니다.
- `FileSiz < MemSiz`인 PT_LOAD는 내용이 없는 부분이고, GDB는 그 부분을 NT_FILE이 가리키는 원본 파일에서 읽습니다.
- 기본 필터의 비트 4가 남긴 첫 페이지 덕분에 core에서 모듈별 build ID를 뽑을 수 있습니다(`eu-unstrip -n --core`).
- arm64의 정수 0 나누기는 SIGFPE를 내지 않고 0을 돌려줍니다.
- `gcore`, minicoredumper, `.ips`, minidump는 담는 양이 다릅니다. 이 장의 실측은 17 MB core, 4.7 KB tar.gz, 8 KB JSON, 15 KB minidump였습니다.

## 다음 장 예고

Ch 3에서는 GDB로 core를 열어 실제 분석을 합니다. NULL 역참조, 손상된 포인터, 스택 손상, 데드락 등 자주 만나는 패턴을 하나씩 재현하고 각 core에서 원인을 짚습니다.

## 관련 항목

- [Ch 1: core 생성 메커니즘](/blog/tools/debugging/postmortem/chapter01-core-generation)
- [Ch 3: GDB로 core 분석](/blog/tools/debugging/postmortem/chapter03-gdb-core-analysis)
- [DWARF and ELF Internals Ch 1: ELF 포맷](/blog/tools/debugging/dwarf-elf/chapter01-elf-overview)
- [`core(5)`](https://man7.org/linux/man-pages/man5/core.5.html), [`elf(5)`](https://man7.org/linux/man-pages/man5/elf.5.html)
- Linux v6.12 `fs/binfmt_elf.c`(`fill_files_note`, `fill_note_info`), `include/uapi/linux/elf.h`
- [Anatomy of an ELF core file](https://www.gabriel.urdhr.fr/2015/05/29/core-file/)
