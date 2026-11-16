---
title: "Core Dump 분석 기법 — coredumpctl·ELF core·디버거 활용"
slug: "tools/debugging/gdb-lldb/chapter07-core-dump"
date: 2026-05-24T09:07:00
description: "ulimit과 core_pattern부터 ELF core·NT_PRSTATUS·systemd-coredump를 거쳐 GDB로 분석하는 흐름."
tags: [gdb, core-dump, Crash, ELF]
series: "GDB and LLDB"
seriesOrder: 7
draft: false
topics: ["tools", "tools/debugging"]
---

:::tip[Deep dive]
이 챕터는 빠른 참조입니다. 깊은 내부 메커니즘은 [Postmortem Debugging 시리즈](/blog/tools/debugging/postmortem/chapter01-core-generation)를 참고하세요 — core 파일 ELF 포맷, NT_PRSTATUS, build-id 매칭, minidump, debuginfod 자동화.
:::


프로덕션에서 가장 답답한 순간은 서버가 한 번 죽고, 다시 켜면 문제가 보이지 않을 때입니다. 이때 *시신*만 남아 있으면 부검할 수 있습니다. core dump는 프로세스가 죽은 순간의 메모리·레지스터 스냅샷이고, 라이브 디버깅이 환자 진료라면 core 분석은 부검입니다.

이 장은 Linux의 core 생성 조건, core 파일의 내부 구조(ELF + note), systemd-coredump, debuginfo 매칭, `coredump_filter`로 크기 줄이기를 실제로 돌려 봅니다. 출력은 Debian 13 arm64(커널 6.12.116, systemd 257, GDB 16.3, lldb 19.1.7)에서 얻었습니다. 실습 프로그램 `server.cpp`는 인자에 따라 세 가지로 죽습니다.

```cpp title="server.cpp (발췌)"
void load_config(Config& config) {
    std::vector<int> table;
    table.reserve(config.entries);    // 13: entries < 0이면 length_error
}
void bad_pointer() {
    int* p = (int*)0xdeadbeef;
    *p = 1;                           // 18: 매핑 없는 주소
}
void write_rodata() {
    char* s = (char*)"read-only";
    s[0] = 'R';                       // 23: 읽기 전용 주소
}
```

## core dump가 만들어지는 조건

core(5)와 signal(7)이 정리한 조건은 다음과 같습니다.

1. **시그널** — signal(7)의 표에서 기본 동작이 `Core`인 시그널입니다. `SIGSEGV`, `SIGABRT`, `SIGBUS`, `SIGFPE`, `SIGILL`이 여기에 속합니다.
2. **크기 제한** — `RLIMIT_CORE`(셸의 `ulimit -c`)가 0이면 파일형 core는 생기지 않습니다. 다만 core(5)는 core를 프로그램으로 *파이프*하는 설정에서는 커널이 `RLIMIT_CORE`를 적용하지 않는다고 적고 있습니다.
3. **저장 위치** — `/proc/sys/kernel/core_pattern`이 정합니다.
4. **dumpable** — setuid 프로그램처럼 dumpable이 꺼진 프로세스는 `/proc/sys/fs/suid_dumpable` 설정을 따릅니다(core(5)).

2번에는 실제 환경에서 확인할 함정이 있습니다. Debian 13의 `core_pattern`은 systemd-coredump로 가는 파이프인데, 커널이 제한을 무시하는 대신 *systemd-coredump가* 제한을 봅니다. systemd-coredump(8)은 "the core dump will only be processed when the related process resource limits (RLIMIT_CORE) are sufficient"라고 적고 있고, 실제로 `ulimit -c 0`으로 죽인 프로세스는 셸에는 `(core dumped)`로 찍혔지만 저장된 core가 없었습니다.

```text
$ ( ulimit -c 0; ./server maperr )
Segmentation fault      (core dumped) ( ulimit -c 0; ./server maperr )
$ ( ulimit -c unlimited; ./server maperr )
Segmentation fault      (core dumped) ( ulimit -c unlimited; ./server maperr )
$ coredumpctl list server
TIME                        PID UID GID SIG     COREFILE EXE                SIZE
Mon 2026-11-16 07:53:56 UTC 658   0   0 SIGSEGV none     /root/ch07/server     -
Mon 2026-11-16 07:53:59 UTC 667   0   0 SIGSEGV present  /root/ch07/server 39.3K
```

이 VM의 기본값은 다음과 같았습니다. `suid_dumpable`이 2("suidsafe")이면 core(5)에 따라 `core_pattern`은 절대 경로나 파이프여야 하고, Debian의 파이프 설정이 그 조건을 맞춥니다.

```text
$ ulimit -c
unlimited
$ cat /proc/sys/fs/suid_dumpable
2
```

## ulimit 켜기

셸에서는 `ulimit -c`로, systemd 서비스는 unit의 `LimitCORE=`로 제한을 정합니다(systemd-coredump(8)의 Configuration 절이 이 지시어를 가리킵니다). 셸의 `ulimit`은 그 셸에서 띄운 프로세스에만 적용되므로 서비스에는 영향을 주지 않습니다.

```bash
# 셸 세션 한정
$ ulimit -c unlimited

# systemd 서비스
[Service]
LimitCORE=infinity
```

## core_pattern — 어디로 떨어지나

```text
$ cat /proc/sys/kernel/core_pattern
|/usr/lib/systemd/systemd-coredump %P %u %g %s %t %c %h %d %F
```

`|`로 시작하면 커널이 그 프로그램을 띄워 stdin으로 core를 넘깁니다. 파이프가 아니라 경로를 쓰면 그 자리에 파일로 떨어집니다.

```bash
# /var/crash/core.<exe>.<pid> 형식으로
$ echo '/var/crash/core.%e.%p' | sudo tee /proc/sys/kernel/core_pattern
```

서식 지정자는 core(5)에 정의되어 있습니다. 위 Debian 기본값에 쓰인 것과 자주 쓰는 것을 옮기면 다음과 같습니다.

| 토큰 | core(5)의 정의 |
|------|------|
| `%p` | PID, 프로세스가 속한 PID namespace 기준 |
| `%P` | PID, initial PID namespace 기준 |
| `%i` / `%I` | core를 일으킨 스레드의 TID (namespace 기준 / initial namespace 기준) |
| `%e` | 프로세스의 comm 값 |
| `%E` | 실행 파일 경로, `/`를 `!`로 바꾼 형태 |
| `%s` | 시그널 번호 |
| `%t` | 덤프 시각, Epoch 이후 초 |
| `%h` | 호스트 이름 |
| `%c` | 죽는 프로세스의 core 크기 soft limit |
| `%u` / `%g` | 실제 UID / GID |
| `%d` | dump mode (prctl `PR_GET_DUMPABLE` 값) |
| `%F` | 덤프되는 프로세스의 PIDFD (Linux 6.16부터) |

컨테이너 안 프로세스가 죽으면 `%p`는 컨테이너 안의 PID, `%P`는 호스트의 PID입니다. systemd-coredump가 `%P`를 받는 이유입니다. `%c`가 넘어가기 때문에 위에서 본 것처럼 systemd-coredump가 `RLIMIT_CORE`를 스스로 확인할 수 있습니다.

### 파이프 핸들러의 함정

core(5)의 `/proc/sys/kernel/core_pipe_limit` 설명에 따르면, 이 값은 동시에 파이프로 처리할 수 있는 crash 프로세스 수의 상한입니다. 0이 아니면 커널은 핸들러가 끝날 때까지 기다려 핸들러가 `/proc/<pid>`를 읽을 기회를 주고, 상한을 넘은 프로세스의 core는 커널 로그에 남기고 건너뜁니다. 이 VM의 값은 16이었습니다.

## ELF core 파일의 정체

core 파일은 `e_type`이 `ET_CORE`인 ELF입니다. `coredumpctl dump`로 꺼낸 `maperr.core`(540672바이트)를 열어 보면 다음과 같습니다.

```text
$ readelf -h maperr.core | grep -E "Class|Type|Machine|Entry"
  Class:                             ELF64
  Type:                              CORE (Core file)
  Machine:                           AArch64
  Entry point address:               0x0
$ readelf -lW maperr.core
...
There are 32 program headers, starting at offset 64

Program Headers:
  Type           Offset   VirtAddr           PhysAddr           FileSiz  MemSiz   Flg Align
  NOTE           0x000740 0x0000000000000000 0x0000000000000000 0x000f44 0x000000     0x4
  LOAD           0x002000 0x0000aaaad0010000 0x0000000000000000 0x001000 0x003000 R E 0x1000
  LOAD           0x003000 0x0000aaaad002f000 0x0000000000000000 0x001000 0x001000 R   0x1000
  LOAD           0x004000 0x0000aaaad0030000 0x0000000000000000 0x001000 0x001000 RW  0x1000
  LOAD           0x005000 0x0000aaaae86b4000 0x0000000000000000 0x021000 0x021000 RW  0x1000
...
```

- `PT_NOTE` 세그먼트 하나에 *프로세스 상태*(레지스터, 시그널, 매핑된 파일 목록)가 들어 있습니다.
- `PT_LOAD` 세그먼트마다 메모리 영역 하나입니다. 실행 파일의 코드 영역(`R E`)은 `MemSiz`가 `0x3000`인데 `FileSiz`는 `0x1000`뿐입니다. 파일에 있는 코드는 다시 읽으면 되므로 첫 페이지(ELF 헤더)만 저장한 것이고, 이것이 아래 `coredump_filter`의 bit 4(ELF headers) 동작입니다.

`readelf -n`으로 note를 보면 아키텍처별 항목까지 나옵니다.

```text
$ readelf -n maperr.core
  Owner                Data size 	Description
  CORE                 0x00000188	NT_PRSTATUS (prstatus structure)
  CORE                 0x00000088	NT_PRPSINFO (prpsinfo structure)
  CORE                 0x00000080	NT_SIGINFO (siginfo_t data)
  CORE                 0x00000170	NT_AUXV (auxiliary vector)
  CORE                 0x00000571	NT_FILE (mapped files)
  CORE                 0x00000210	NT_FPREGSET (floating point registers)
  LINUX                0x00000010	NT_ARM_TLS (AArch TLS registers)
  LINUX                0x00000108	NT_ARM_HW_BREAK (AArch hardware breakpoint registers)
  LINUX                0x00000108	NT_ARM_HW_WATCH (AArch hardware watchpoint registers)
  LINUX                0x00000004	NT_ARM_SYSTEM_CALL (AArch system call number)
  LINUX                0x00000010	NT_ARM_PAC_MASK (AArch pointer authentication code masks)
...
```

| Note | 이 core에서 본 내용 |
|------|------|
| `NT_PRSTATUS` | 스레드별 레지스터·시그널·PID. 스레드가 여럿이면 스레드 수만큼 나옵니다 |
| `NT_PRPSINFO` | 프로세스 이름·UID·GID 등 |
| `NT_SIGINFO` | 죽음을 일으킨 `siginfo_t` (아래 `$_siginfo`의 출처) |
| `NT_AUXV` | auxiliary vector (아래 `info auxv`의 출처) |
| `NT_FILE` | 매핑된 파일과 주소 범위 |
| `NT_FPREGSET` | 부동소수점·SIMD 레지스터 |
| `NT_ARM_*` | arm64 전용 상태 (TLS, hardware breakpoint/watchpoint, PAC 키 등) |

`NT_FILE`에는 실행 파일과 공유 라이브러리의 경로가 주소 범위와 함께 들어 있습니다. core를 다른 머신으로 옮겨 분석할 때 어떤 파일을 함께 가져가야 하는지 알려 주는 목록입니다.

```text
    Page size: 4096
                 Start                 End         Page Offset
    0x0000aaaad0010000  0x0000aaaad0013000  0x0000000000000000
        /root/ch07/server
...
    0x0000ffffb8980000  0x0000ffffb8a0e000  0x0000000000000000
        /usr/lib/aarch64-linux-gnu/libm.so.6
```

## coredumpctl — systemd 환경

systemd-coredump가 받은 core는 `coredumpctl`로 관리합니다. `coredumpctl info`는 메타데이터와 함께, systemd-coredump가 저장 시점에 떠 둔 스택도 보여 줍니다.

```text
$ coredumpctl info 686
           PID: 686 (server)
           UID: 0 (root)
           GID: 0 (root)
        Signal: 6 (ABRT)
     Timestamp: Mon 2026-11-16 07:54:03 UTC (2s ago)
  Command Line: ./server length
    Executable: /root/ch07/server
 Control Group: /user.slice/user-0.slice/session-5.scope
...
       Storage: /var/lib/systemd/coredump/core.server.0.15e5948972a94704a703ddfffec3b19c.686.1794815643000000.zst (present)
  Size on Disk: 40.2K
       Message: Process 686 (server) of user 0 dumped core.

                Module libgcc_s.so.1 from deb gcc-14-14.2.0-19.arm64
                Module libstdc++.so.6 from deb gcc-14-14.2.0-19.arm64
                Stack trace of thread 686:
                #0  0x0000ffffb61e8020 __pthread_kill_implementation (libc.so.6 + 0x88020)
...
                #7  0x0000ffffb6400dc8 _ZSt20__throw_length_errorPKc (libstdc++.so.6 + 0xa0dc8)
                #8  0x0000aaaac6b215f8 n/a (/root/ch07/server + 0x15f8)
```

저장된 파일은 zstd로 압축됩니다. 디스크에는 40.2K였지만 `coredumpctl dump -o length.core 686`으로 꺼낸 원본은 540672바이트였습니다. `coredumpctl debug PID`는 실행 파일과 core를 GDB에 넘겨 바로 띄웁니다. `--debugger-arguments`로 GDB 옵션을 함께 줄 수 있습니다.

```text
$ coredumpctl debug --debugger-arguments="-batch -ex bt" 667
Core was generated by `./server maperr'.
Program terminated with signal SIGSEGV, Segmentation fault.
#0  0x0000aaaad0011218 in bad_pointer () at server.cpp:18
18	    *p = 1;                                   // line 18: SEGV_MAPERR
#0  0x0000aaaad0011218 in bad_pointer () at server.cpp:18
#1  0x0000aaaad001131c in main (argc=2, argv=0xfffff3c60128) at server.cpp:32
```

저장 정책은 `/etc/systemd/coredump.conf`가 정합니다. Debian의 파일은 모든 줄이 주석이고, 파일 머리에 "Entries in this file show the compile time defaults"라고 적혀 있습니다.

```ini
[Coredump]
#Storage=external
#Compress=yes
# On 32-bit, the default is 1G instead of 32G.
#ProcessSizeMax=32G
#ExternalSizeMax=32G
#JournalSizeMax=767M
#MaxUse=
#KeepFree=
#EnterNamespace=no
```

coredump.conf(5)(systemd 257)에 따르면 `MaxUse=`의 기본값은 디스크의 10%(최대 4GiB), `KeepFree=`는 15%입니다. 오래된 core는 이 한도를 넘으면 지워집니다.

## gdb로 core 열기

순서는 `gdb <executable> <core>`입니다. `length.core`는 `std::length_error`로 abort한 core라서, 스택 맨 위는 `abort`이고 원인은 몇 프레임 아래에 있습니다.

```text
$ gdb -q ./server length.core
Core was generated by `./server length'.
Program terminated with signal SIGABRT, Aborted.
(gdb) bt
#0  __pthread_kill_implementation (threadid=281473741455392, signo=signo@entry=6, no_tid=no_tid@entry=0) at ./nptl/pthread_kill.c:44
...
#7  0x0000ffffb64099e8 [PAC] in __cxa_throw () from /lib/aarch64-linux-gnu/libstdc++.so.6
#8  0x0000ffffb6400dc8 [PAC] in std::__throw_length_error(char const*) () from /lib/aarch64-linux-gnu/libstdc++.so.6
#9  0x0000aaaac6b215f8 [PAC] in std::vector<int, std::allocator<int> >::reserve (this=0xffffdbc6d888, __n=18446744073709551615) at /usr/include/c++/14/bits/vector.tcc:71
#10 0x0000aaaac6b211d4 in load_config (config=...) at server.cpp:13
#11 0x0000aaaac6b212f4 in main (argc=2, argv=0xffffdbc6da88) at server.cpp:30
(gdb) frame 10
(gdb) print config
$1 = (Config &) @0xffffdbc6d8d0: {name = "prod", entries = -1}
```

`entries = -1`이 `size_t`로 바뀌어 `__n=18446744073709551615`가 된 것이 원인입니다. 스택과 힙이 core에 있으므로 변수 검사는 라이브 디버깅과 같습니다. 다만 프로세스가 없으므로 진행 명령은 동작하지 않습니다.

```text
(gdb) continue
The program is not being run.
```

실행 파일을 빼고 `gdb -c maperr.core`만 줘도 GDB 16.3은 `bad_pointer () at server.cpp:18`까지 보여 줬습니다. 이 실행에서는 core를 만든 `/root/ch07/server`가 같은 경로에 그대로 있었습니다. 이 동작은 GDB 16.3 매뉴얼에서 찾지 못했으므로 기대지 말고, CI artifact처럼 정확한 실행 파일을 명시하는 편이 안전합니다. 실제로 같은 경로에서 다시 빌드한 파일을 주자 GDB가 `warning: exec file is newer than core file.`로 경고했습니다.

core에서도 쓸 수 있는 조회 명령은 다음과 같습니다.

```text
(gdb) info auxv               # core의 NT_AUXV
(gdb) info sharedlibrary      # 로드된 공유 라이브러리
(gdb) thread apply all bt     # 모든 스레드
(gdb) print $_siginfo         # core의 NT_SIGINFO
```

`maperr.core`의 `info auxv` 일부와 `info sharedlibrary`입니다. `(*)`는 그 라이브러리의 디버그 정보가 없다는 뜻이고, 이 VM에는 libc용 `libc6-dbg`만 깔려 있었습니다.

```text
16   AT_HWCAP             Machine-dependent CPU capability hints 0xefb3ffff
6    AT_PAGESZ            System page size               4096
9    AT_ENTRY             Entry point of program         0xaaaad0011080
31   AT_EXECFN            File name of executable        0xfffff3c60fef "./server"
15   AT_PLATFORM          String identifying platform    0xfffff3c60358 "aarch64"
...
From                To                  Syms Read   Shared Object Library
0x0000ffffb8cd0880  0x0000ffffb8defe7c  Yes (*)     /lib/aarch64-linux-gnu/libstdc++.so.6
0x0000ffffb8bf35c0  0x0000ffffb8c0b4c8  Yes (*)     /lib/aarch64-linux-gnu/libgcc_s.so.1
0x0000ffffb8a519c0  0x0000ffffb8b774f4  Yes         /lib/aarch64-linux-gnu/libc.so.6
...
(*): Shared library is missing debugging information.
```

### 시그널 정보 — siginfo

`$_siginfo`는 core의 `NT_SIGINFO`를 `siginfo_t`로 보여 줍니다. `si_addr`가 실제로 접근한 주소입니다.

```text
$ gdb -q -batch ./server maperr.core -ex 'print $_siginfo._sifields._sigfault.si_addr' -ex 'print $_siginfo.si_code'
$2 = (void *) 0xdeadbeef
...
$ gdb -q -batch ./server accerr.core -ex 'print $_siginfo.si_code' -ex 'x/s $_siginfo._sifields._sigfault.si_addr'
$1 = 2
0xaaaadcf61d48:	"read-only"
```

`maperr`은 `si_code = 1`(매핑 없음), `accerr`은 `si_code = 2`(매핑은 있지만 권한 없음)였습니다. `accerr`의 `si_addr`는 `info files`에서 `.rodata` 범위(`0x0000aaaadcf61d40 - 0x0000aaaadcf61dbd`) 안이고, 그 자리의 문자열이 바로 쓰려던 `"read-only"`입니다. `si_code` 값의 이름은 커널 헤더 `asm-generic/siginfo.h`에 있습니다.

| si_code (SIGSEGV) | `asm-generic/siginfo.h`의 주석 |
|-------------------|------|
| 1 `SEGV_MAPERR` | address not mapped to object |
| 2 `SEGV_ACCERR` | invalid permissions for mapped object |
| 3 `SEGV_BNDERR` | failed address bound checks |
| 4 `SEGV_PKUERR` | failed protection key checks |
| 8 `SEGV_MTEAERR` | Asynchronous ARM MTE error |
| 9 `SEGV_MTESERR` | Synchronous ARM MTE exception |

## debuginfo 매칭

배포 바이너리는 strip하고 디버그 정보를 따로 둡니다. GDB는 실행 파일의 *build-id*로 디버그 파일을 찾습니다. 아래는 `server`를 strip한 뒤, 디버그 파일을 `/opt/symbols/.build-id/<앞 2자리>/<나머지>.debug`에 두고 찾게 한 결과입니다.

```text
$ objcopy --only-keep-debug server.full server.debug
$ strip -o server.stripped server.full
$ readelf -n server.stripped | grep "Build ID"
    Build ID: 707074fb1b724e52bd00ffc9db931bb651d57026
$ cp server.debug /opt/symbols/.build-id/70/7074fb1b724e52bd00ffc9db931bb651d57026.debug

$ gdb -q -batch ./server.stripped maperr.core -ex bt
#0  0x0000aaaad0011218 in ?? ()
$ gdb -q -batch -iex "set debug-file-directory /opt/symbols" ./server.stripped maperr.core -ex bt
#0  0x0000aaaad0011218 in bad_pointer () at server.cpp:18
#1  0x0000aaaad001131c in main (argc=2, argv=0xfffff3c60128) at server.cpp:32
```

`set debug-file-directory`는 실행 파일을 읽기 전에 적용되도록 `-iex`로 줬습니다. CI가 빌드할 때마다 디버그 파일을 이 구조로 쌓아 두면, 어느 core든 build-id만으로 맞는 디버그 정보를 찾을 수 있습니다.

### debuginfod — 자동 다운로드

debuginfod는 build-id로 디버그 정보를 HTTP로 내려받는 서비스입니다. [elfutils의 Debuginfod 페이지](https://sourceware.org/elfutils/Debuginfod.html)가 공개 서버 목록을 유지하며, 거기에 Debian·Fedora·Arch Linux·openSUSE 등의 공식 서버가 있습니다. Debian 13은 `/etc/debuginfod/`에 `https://debuginfod.debian.net`을 기본으로 넣어 둡니다.

coreutils의 `sleep`을 SIGSEGV로 죽여 얻은 core로 차이를 봤습니다. debuginfod를 끄면 `sleep` 자신의 프레임은 `??`이고, 켜면 GDB가 디버그 정보를 내려받아 함수 이름과 소스 위치를 채웁니다.

```text
$ gdb -q -batch -iex "set debuginfod enabled off" /usr/bin/sleep sleep.segv.core -ex bt
#3  0x0000aaaab7dd6cb4 [PAC] in ?? ()
#4  0x0000aaaab7dd661c [PAC] in ?? ()
#5  0x0000aaaab7dd23f4 [PAC] in ?? ()

$ DEBUGINFOD_URLS=https://debuginfod.debian.net gdb -q -batch -iex "set debuginfod enabled on" /usr/bin/sleep sleep.segv.core -ex bt
Downloading 92.91 K separate debug info for /usr/bin/sleep...
Downloading 81.61 K separate debug info for /root/.cache/debuginfod_client/4386d9cb62f28a53367fb90473ed3f989efe5bde/debuginfo...
Downloading 37.93 K separate debug info for system-supplied DSO at 0xffff94609000...
#3  0x0000aaaab7dd6cb4 [PAC] in rpl_nanosleep (requested_delay=requested_delay@entry=0xffffcefb6918, remaining_delay=remaining_delay@entry=0xffffcefb6918) at lib/nanosleep.c:80
#4  0x0000aaaab7dd661c [PAC] in xnanosleep (seconds=seconds@entry=100.00000000000004) at lib/xnanosleep.c:69
#5  0x0000aaaab7dd23f4 [PAC] in main (argc=<optimized out>, argv=<optimized out>) at src/sleep.c:141
```

캐시 디렉터리 이름 `4386d9cb...`는 `readelf -n /usr/bin/sleep`의 Build ID와 같습니다. 내려받은 파일은 `~/.cache/debuginfod_client/<build-id>/`에 남아 다음부터는 다시 받지 않습니다.

## 코어 크기 줄이기 — coredump_filter

큰 서버의 core는 메모리 크기만큼 커집니다. `/proc/<pid>/coredump_filter`의 비트마스크가 어떤 매핑을 core에 넣을지 정하고, core(5)에 비트의 의미가 있습니다.

| 비트 | core(5)의 정의 |
|---|---|
| bit 0 | anonymous private 매핑 (스택, 힙) |
| bit 1 | anonymous shared 매핑 |
| bit 2 | file-backed private 매핑 |
| bit 3 | file-backed shared 매핑 |
| bit 4 | ELF 헤더 |
| bit 5 | private huge page |
| bit 6 | shared huge page |
| bit 7 | private DAX page |
| bit 8 | shared DAX page |

core(5)에 따르면 기본값은 bit 0, 1, 4(`CONFIG_CORE_DUMP_DEFAULT_ELF_HEADERS`가 켜진 경우), 5이고, 이 VM에서도 `cat /proc/self/coredump_filter`가 `00000033`이었습니다. 이 값은 `fork`로 상속되고 `execve`를 거쳐도 유지됩니다(core(5)).

효과를 재 봤습니다. `bigmap.c`는 64 MiB 파일을 `MAP_SHARED`로 매핑해 채우고, 16 MiB 힙을 채운 뒤 SIGSEGV로 죽습니다. 기본값 `0x33`과, file-backed 매핑(bit 2·3)까지 켠 `0x3f`로 각각 죽였습니다.

```text
$ ./bigmap
$ ( echo 0x3f > /proc/self/coredump_filter; exec ./bigmap )
$ coredumpctl info 843 | grep "Size on Disk"; coredumpctl dump -o bigmap.843.core 843
  Size on Disk: 17.5K
-rw-r--r-- 1 root root 17203200 Nov 16 07:54 bigmap.843.core
$ coredumpctl info 852 | grep "Size on Disk"; coredumpctl dump -o bigmap.852.core 852
  Size on Disk: 924.1K
-rw-r--r-- 1 root root 86224896 Nov 16 07:54 bigmap.852.core
```

| `coredump_filter` | 원본 core | 압축 저장 |
|---|---|---|
| `0x33` (기본) | 17,203,200 B (힙 16 MiB 포함, 파일 매핑 제외) | 17.5K |
| `0x3f` | 86,224,896 B (64 MiB 파일 매핑까지 포함) | 924.1K |

기본값이 이미 file-backed 매핑을 빼고 있으므로, 디스크에 원본이 있는 대용량 매핑은 기본 설정에서 core를 키우지 않습니다. 반대로 매핑된 파일의 *그 순간 내용*이 분석에 필요하다면 bit 2·3을 켜야 합니다. 압축 크기가 이렇게 작은 것은 실습 데이터가 같은 바이트로 채워져 있었기 때문이라 실제 서비스의 압축률로 읽으면 안 됩니다.

## macOS의 사정

이 Mac(macOS 27.2.1)에서는 커널 설정은 켜져 있고 셸의 soft limit이 0이었습니다. `kern.corefile`이 core가 떨어질 경로입니다.

```text
$ sysctl kern.coredump kern.corefile
kern.coredump: 1
kern.corefile: /cores/core.%P
$ ulimit -c
0
```

이 시리즈에서는 macOS에서 프로세스를 실제로 죽여 core를 만들지 않았습니다. 대신 LLDB의 `process save-core`로 멈춘 프로세스의 core를 직접 저장하고 다시 열었습니다. macOS의 core는 ELF가 아니라 Mach-O입니다.

```text
(lldb) b factorial
(lldb) run
(lldb) process save-core --style stack hello.core
Modified-memory or stack-memory only corefile created.  This corefile may
not show library/framework/app binaries on a different system, or when
those binaries have been updated/modified. Copies are not included
in this corefile.  Use --style full to include all process memory.

$ ls -l hello.core; file hello.core
-rw-------@ 1 hawk  wheel  36864 11월 16 16:56 hello.core
hello.core: Mach-O 64-bit core arm64
$ lldb -c hello.core ./hello -o bt -o "frame variable n"
* thread #1, stop reason = ESR_EC_BRK_AARCH64 (fault address: 0x0)
   * frame #0: 0x0000000100000470 hello`factorial(n=5) at hello.c:5:9
     frame #1: 0x00000001000004e8 hello`main at hello.c:11:18
     frame #2: 0x00000001895ccd7c dyld`start + 6652
(lldb) frame variable n
(int) n = 5
```

`--style stack`은 경고가 말하듯 스택과 수정된 메모리만 담아 36,864바이트였습니다. 정지 사유 `ESR_EC_BRK_AARCH64`는 breakpoint 명령(BRK)에서 멈춘 상태로 저장했기 때문입니다. lldb 19.1.7은 Linux의 ELF core도 같은 방식으로 엽니다.

```text
$ lldb -c maperr.core ./server -o bt
Core file '/root/ch07/maperr.core' (aarch64) was loaded.
* thread #1, name = 'server', stop reason = signal SIGSEGV: address not mapped to object
  * frame #0: 0x0000aaaad0011218 server`bad_pointer() at server.cpp:18:8
    frame #1: 0x0000aaaad001131c server`main(argc=2, argv=0x0000fffff3c60128) at server.cpp:32:20
```

## ASan과 core

ASan으로 빌드한 프로그램은 오류를 찾으면 보고서를 찍고 `_exit`로 끝나므로 기본으로는 core가 남지 않습니다. GCC 14.2의 libasan에 `ASAN_OPTIONS=help=1`을 주면 관련 플래그의 설명과 현재 값이 나옵니다.

```text
	disable_coredump
		- Disable core dumping. By default, disable_coredump=1 on 64-bit to avoid dumping a 16T+ core file. Ignored on OSes that don't dump core by default and for sanitizers that don't reserve lots of virtual memory. (Current Value: true)
	use_madv_dontdump
		- If set, instructs kernel to not store the (huge) shadow in core file. (Current Value: true)
	abort_on_error
		- If set, the tool calls abort() instead of _exit() after printing the error report. (Current Value: false)
```

use-after-free를 일으키는 `uaf.c`로 확인했습니다. 기본 설정에서는 종료 코드 1로 끝나고 core가 없었고, 두 옵션을 켜자 SIGABRT로 죽으며 core가 남았습니다.

```text
$ ./uaf; echo "exit=$?"
exit=1
$ ASAN_OPTIONS=abort_on_error=1:disable_coredump=0 ./uaf; echo "exit=$?"
Aborted                 (core dumped)
exit=134
$ coredumpctl list uaf
TIME                        PID UID GID SIG     COREFILE EXE            SIZE
Mon 2026-11-16 07:54:55 UTC 906   0   0 SIGABRT present  /root/ch07/uaf 4.4M
```

`use_madv_dontdump`가 기본으로 켜져 있어 거대한 shadow 메모리는 core에서 빠집니다. 그래도 압축 저장 크기가 4.4M로, 같은 VM의 일반 프로그램 core(40K 안팎)보다 훨씬 컸습니다.

## 실전 운영

위 실행에서 확인한 것을 순서로 묶으면 다음과 같습니다.

1. 서비스 unit에 `LimitCORE=infinity`를 둡니다. 제한이 0이면 systemd-coredump가 core를 저장하지 않습니다.
2. `core_pattern`을 systemd-coredump 또는 별도 디렉터리로 둡니다.
3. 매핑된 파일 내용이 필요할 때만 `coredump_filter`의 bit 2·3을 켭니다.
4. 빌드마다 디버그 파일을 build-id 구조로 보관하거나 debuginfod로 제공합니다.
5. 사고 때는 `coredumpctl list` → `coredumpctl debug` → `thread apply all bt` → 의심 프레임의 변수 순서로 봅니다.

살아 있는 프로세스의 스냅샷이 필요하면 GDB의 `gcore`를 씁니다. 프로세스를 잠깐 멈췄다 놓아주므로 서비스는 계속 돕니다.

```text
$ sleep 300 &
$ gcore -o /root/ch07/sleep.core 917
Saved corefile /root/ch07/sleep.core.917
[Inferior 1 (process 917) detached]
$ ls -l /root/ch07/sleep.core.917
-rw-r--r-- 1 root root 2296016 Nov 16 07:54 /root/ch07/sleep.core.917
```

## 정리

- core는 기본 동작이 `Core`인 시그널 + 크기 제한 + `core_pattern` + dumpable이 맞아야 남습니다.
- 파이프 `core_pattern`에서는 커널이 `RLIMIT_CORE`를 무시하지만 systemd-coredump가 다시 확인합니다. `ulimit -c 0`이면 COREFILE이 `none`이었습니다.
- core는 `ET_CORE` ELF입니다. `PT_NOTE`에 `NT_PRSTATUS`·`NT_SIGINFO`·`NT_FILE`과 arm64 전용 `NT_ARM_*`, `PT_LOAD`에 메모리가 들어 있습니다.
- `gdb exe core` 또는 `coredumpctl debug PID`. `$_siginfo`의 `si_code`·`si_addr`로 원인의 첫 단서를 잡습니다.
- debuginfo는 build-id로 찾습니다. `set debug-file-directory`를 쓰거나 debuginfod로 내려받습니다.
- 기본 `coredump_filter` 0x33은 file-backed 매핑을 이미 뺍니다. 0x3f로 켜자 원본 core가 17 MB에서 86 MB가 됐습니다.
- macOS core는 Mach-O이고, LLDB `process save-core`로 만들고 `lldb -c`로 엽니다.
- ASan은 `abort_on_error=1:disable_coredump=0`을 줘야 core를 남겼습니다.

## 다음 장 예고

[Ch 8: 원격 디버깅](/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging)은 gdbserver·lldb-server로 다른 머신의 프로세스를 디버깅하는 법과, OpenOCD·J-Link로 베어메탈 MCU에 GDB를 붙이는 순서를 다룹니다.

## 관련 항목

- [Ch 6: 멀티스레드 / 멀티프로세스](/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess)
- [Ch 8: 원격 디버깅 / OpenOCD / J-Link](/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging)
- [Ch 12: DWARF](/blog/tools/debugging/gdb-lldb/chapter12-dwarf) — debuginfo의 정체
- [Sanitizers Ch 1: AddressSanitizer](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)
- `man 5 core` — core dump 포맷
- [macOS `core(5)` 매뉴얼](https://man.freebsd.org/cgi/man.cgi?query=core&sektion=5&manpath=macOS+26.6.1) — Darwin/macOS core 설정
- `man 5 elf` — ELF 구조
- [systemd-coredump(8)](https://www.freedesktop.org/software/systemd/man/systemd-coredump.html)
