---
title: "Ch 7: core dump 분석"
date: 2025-08-20T07:00:00
description: "ulimit / core_pattern. gdb -c. ELF core 포맷, NT_PRSTATUS, systemd-coredump."
tags: [gdb, Core Dump, Crash, ELF]
series: "GDB and LLDB"
seriesOrder: 7
draft: false
---

:::tip[Deep dive]
이 챕터는 빠른 참조입니다. 깊은 내부 메커니즘은 [Postmortem Debugging 시리즈](/blog/tools/debugging/postmortem/chapter01-core-generation)를 참고하세요 — core 파일 ELF 포맷, NT_PRSTATUS, build-id 매칭, minidump, debuginfod 자동화.
:::


프로덕션에서 가장 답답한 순간 — 서버가 한 번 죽고, 다음에 켤 땐 문제가 안 보입니다. 이때 *시신*만 남으면 부검할 수 있습니다. core dump는 프로세스가 죽기 직전의 메모리·레지스터·콜스택 스냅샷입니다. 라이브 디버깅이 환자 진료라면 core 분석은 부검입니다.

이 장은 core dump의 *내부 포맷*(ELF + Notes), Linux의 코어 생성 메커니즘, debuginfo 매칭, *부분* 코어로 용량 절감, 그리고 사고 시 표준 분석 흐름을 다룹니다.

## core dump가 만들어지는 조건

세 가지가 모두 맞아야 파일이 떨어집니다.

1. **시그널** — `SIGSEGV`(11), `SIGABRT`(6), `SIGFPE`(8), `SIGBUS`(7), `SIGILL`(4) 등 *코어를 생성하는 시그널* (`man 7 signal`의 "Default action" 열에 "Core").
2. **ulimit** — `ulimit -c`로 허용된 최대 코어 크기. 기본 0이면 안 만들어집니다.
3. **저장 위치** — Linux는 `/proc/sys/kernel/core_pattern`이 결정. 일반 파일·파이프·systemd-coredump 등.

추가로 *프로세스 dumpable 플래그*도 영향을 줍니다.

```c
// suid 바이너리는 dumpable 비활성으로 시작
prctl(PR_SET_DUMPABLE, 0);   // 코어 생성 안 됨
prctl(PR_SET_DUMPABLE, 1);   // 허용
```

`/proc/<pid>/coredump_filter`도 dumpable이 1이어야 효과 있음. setuid·setgid 바이너리는 보안상 자동으로 dumpable=0. `/proc/sys/fs/suid_dumpable=2`로 *root만 읽을 수 있는* 코어 생성 허용.

## ulimit 켜기

```bash
# 셸 세션 한정
$ ulimit -c unlimited
$ ulimit -c
unlimited

# 영구 (systemd 서비스)
[Service]
LimitCORE=infinity

# 영구 (셸 로그인 시)
$ cat /etc/security/limits.d/core.conf
* soft core unlimited
* hard core unlimited

# 영구 (sysctl 한계도 확인)
$ sysctl fs.suid_dumpable     # setuid 바이너리도 dump 허용할지
fs.suid_dumpable = 0
```

데몬·systemd 서비스는 셸의 ulimit이 적용되지 않습니다. `LimitCORE=infinity`를 unit 파일에 박아야 합니다.

## core_pattern — 어디로 떨어지나

```bash
$ cat /proc/sys/kernel/core_pattern
|/usr/lib/systemd/systemd-coredump %P %u %g %s %t %c %h
```

`|`로 시작하면 그 프로그램의 stdin으로 코어가 전달됩니다. systemd 환경에서는 `systemd-coredump`가 받아 `/var/lib/systemd/coredump/`에 압축 저장합니다.

파이프가 아니라 단순 파일 경로면 그 자리에 떨어집니다.

```bash
# /var/crash/core.<exe>.<pid> 형식으로
$ echo '/var/crash/core.%e.%p' | sudo tee /proc/sys/kernel/core_pattern
```

서식 지정자.

| 토큰 | 의미 |
|------|------|
| `%p` | PID (namespace 안) |
| `%P` | 글로벌 PID |
| `%e` | 실행 파일 이름 |
| `%E` | 실행 파일 경로(`/`를 `!`로) |
| `%t` | UNIX 시각 |
| `%s` | 시그널 번호 |
| `%h` | 호스트 이름 |
| `%c` | core size limit |
| `%u`/`%g` | UID/GID |
| `%I` | TID (스레드) |
| `%d` | dumpable 모드 |

`%p`와 `%P`의 차이는 *PID namespace*. 컨테이너 안 프로세스가 죽으면 컨테이너 내 PID(`%p`)와 호스트 PID(`%P`)가 다릅니다. coredump를 호스트에서 수집하려면 `%P`가 안전.

### 파이프 핸들러의 함정

`|/path/to/handler %P` 형식은 fork된 *코어 핸들러*가 stdin으로 코어를 받습니다. 핸들러가 *디스크에 쓰는 동안* 디버기는 이미 죽어 사라졌으므로 시간 제한이 있습니다 (`/proc/sys/kernel/core_pipe_limit`). 너무 큰 코어 + 느린 핸들러 = 코어 누락.

## ELF core 파일의 정체

생성된 core 파일은 그냥 *ELF* 입니다. 단지 `e_type = ET_CORE`.

```bash
$ readelf -h core
ELF Header:
  Class:                             ELF64
  Type:                              CORE (Core file)
  Machine:                           Advanced Micro Devices X86-64
  Entry point address:               0x0

$ readelf -l core
Program Headers:
  Type           Offset             VirtAddr           PhysAddr           FileSiz            MemSiz
  NOTE           0x0000000000000478 0x0000000000000000 0x0000000000000000 0x0000000000002a30 0x0000000000000000
  LOAD           0x0000000000003000 0x0000000000400000 0x0000000000000000 0x0000000000001000 0x0000000000001000  R   0x1000
  LOAD           0x0000000000004000 0x0000000000401000 0x0000000000000000 0x0000000000001000 0x0000000000001000  R E 0x1000
  ...
```

- `PT_NOTE` 세그먼트가 *프로세스 상태*(레지스터, 스레드, 파일 매핑 등).
- `PT_LOAD` 세그먼트가 *메모리 내용*.

`PT_NOTE` 안에는 *Note* 레코드들이 줄지어 있습니다.

| Note 타입 | 내용 |
|-----------|------|
| `NT_PRSTATUS` | 스레드별 레지스터·시그널·PID (가장 중요) |
| `NT_PRPSINFO` | 프로세스 정보 (이름, UID/GID, ppid) |
| `NT_AUXV` | auxv 벡터 (실행 파일 정보, page size 등) |
| `NT_FILE` | 매핑된 파일 목록 |
| `NT_FPREGSET` | float/SSE/AVX 레지스터 |
| `NT_X86_XSTATE` | x86 확장 상태 (AVX-512 등) |
| `NT_SIGINFO` | 죽음을 일으킨 시그널 정보 |

GDB가 `gdb exe core`로 코어를 열 때 첫 일이 *PT_NOTE 파싱*. 거기서 스레드 수, 각 스레드 레지스터, 어떤 시그널로 죽었는지를 알아냅니다.

```bash
$ readelf -n core | head -40
Displaying notes found at file offset 0x00000478 with length 0x00002a30:
  Owner                Data size 	Description
  CORE                 0x00000150	NT_PRSTATUS (prstatus structure)
    SIG: 11
    PID: 12345
    Registers:
      rax: 0x0000000000000000
      rbx: 0x00007fff...
      rcx: 0x00007fff...
      ...
  CORE                 0x00000088	NT_PRPSINFO (prpsinfo structure)
    Filename: server
  CORE                 0x000004f0	NT_AUXV (auxiliary vector)
  CORE                 0x00000460	NT_FILE
    Page size: 4096
    /usr/local/bin/server
    /usr/lib/x86_64-linux-gnu/libc.so.6
    ...
```

`NT_FILE`이 *실행 파일과 모든 공유 라이브러리의 경로*를 담고 있어 GDB가 다른 머신에서 분석할 때도 필요한 라이브러리를 알아냅니다 (build-id 매칭과 결합).

## coredumpctl — systemd 환경의 정석

systemd-coredump를 쓰는 배포판(Fedora, Ubuntu 22.04+, Arch)에서는 `coredumpctl`로 관리합니다.

```bash
# 최근 코어 목록
$ coredumpctl list
TIME                            PID  UID  GID SIG     COREFILE EXE
Sun 2026-05-10 03:21:14 KST    1234 1000 1000 SIGSEGV present  /usr/local/bin/server

# 특정 PID의 코어 디버깅
$ coredumpctl debug 1234
[gdb가 자동으로 실행 파일 + core 로딩]
(gdb) bt

# 코어 파일만 추출
$ coredumpctl dump 1234 > /tmp/core

# 메타데이터만
$ coredumpctl info 1234
           PID: 1234 (server)
           UID: 1000
           GID: 1000
        Signal: 11 (SEGV)
     Timestamp: ...
  Command Line: /usr/local/bin/server --config=prod.yaml
    Executable: /usr/local/bin/server
 Control Group: /system.slice/server.service
          Unit: server.service
         Slice: system.slice
       Boot ID: ...
    Machine ID: ...
      Hostname: prod-01
       Storage: /var/lib/systemd/coredump/core.server.1000.....zst (present)
     Disk Size: 12.5M
       Message: Process 1234 (server) of user 1000 dumped core.
```

`coredumpctl debug`는 실행 파일·debuginfo를 자동으로 찾아 줍니다. 가장 편한 진입점.

저장된 코어는 `zstd` 압축. 디스크 사용을 통제하려면 `/etc/systemd/coredump.conf`.

```ini
[Coredump]
Storage=external
Compress=yes
ProcessSizeMax=2G
ExternalSizeMax=2G
JournalSizeMax=767M
MaxUse=10G
KeepFree=1G
```

## gdb로 core 열기

```bash
$ gdb /usr/local/bin/server /var/crash/core.server.1234
(gdb) bt
#0  0x00005555... in std::__throw_length_error at stdexcept.cc:42
#1  0x00005555... in std::vector::reserve at vector.h:281
#2  0x00005555... in load_config at config.cpp:88
#3  0x00005555... in main at main.cpp:23
```

순서는 `<executable> <core>`. 실행 파일을 안 주면 GDB는 어느 함수가 어디 있는지 모릅니다(스택 주소만 보임). 코어 안에 실행 파일 경로가 박혀 있긴 하지만 *그 시점의* 경로라 빌드 디렉터리와 다를 수 있습니다.

```text
(gdb) info auxv               # auxv 벡터로 실행 파일 정보
(gdb) info shared             # 로드된 공유 라이브러리
(gdb) info threads            # 스레드별 콜스택 (모두 정지 상태)
(gdb) thread apply all bt     # 모든 스레드
(gdb) info signal             # 죽음을 일으킨 시그널
```

라이브 디버깅과 같지만 *진행이 안 된다*는 점만 다릅니다. `continue`/`step`은 의미 없음.

### 변수 검사

```text
(gdb) frame 2
(gdb) print config
(gdb) info locals
(gdb) print *this
```

스택과 힙은 그대로 있으므로 라이브와 거의 동일하게 검사됩니다. 단, mmap 영역(예: 큰 파일을 mmap한 영역)은 코어에 포함 안 될 수 있습니다 (`/proc/<pid>/coredump_filter`).

### 시그널 정보 — siginfo

```text
(gdb) print $_siginfo
$1 = {si_signo = 11, si_code = 1, si_errno = 0,
      _sifields = {_sigfault = {si_addr = 0xdeadbeef}}}
```

`si_code=1`은 `SEGV_MAPERR`(주소가 어떤 매핑에도 없음), `si_code=2`는 `SEGV_ACCERR`(주소는 매핑됐지만 권한 없음). `si_addr`이 *실제 접근한 주소*. NULL 역참조라면 `0x0` 근처.

| si_code (SIGSEGV) | 의미 |
|-------------------|------|
| 1 (SEGV_MAPERR) | 매핑 없음 — 잘못된 포인터 |
| 2 (SEGV_ACCERR) | 권한 없음 — read-only 영역에 쓰기 |
| 6 (SEGV_BNDERR) | bounds 검사 실패 (MPX) |
| 7 (SEGV_PKUERR) | 메모리 보호 키 위반 |

이 한 줄로 "왜" 죽었는지의 첫 단서를 잡습니다.

## debuginfo 매칭

stripped 바이너리 + 별도 debuginfo 패키지 환경에서는 GDB가 자동으로 매칭해 줍니다 — *Build ID*가 같으면. 안 맞으면 함수 이름이 `??`로 떨어집니다.

```bash
$ readelf -n /usr/local/bin/server | grep "Build ID"
    Build ID: 8d3a...

$ ls /usr/lib/debug/.build-id/8d/3a...
```

CI에서 빌드한 바이너리는 build-id로 디버그 심볼을 찾을 수 있게 별도 저장소를 두면 운영이 편합니다.

```text
(gdb) set debug-file-directory /opt/symbols
```

### debuginfod — 자동 다운로드

Fedora·Ubuntu·Arch가 운영하는 `debuginfod` 서비스에서 build-id로 debuginfo를 자동 가져옵니다.

```bash
$ DEBUGINFOD_URLS="https://debuginfod.fedoraproject.org/" \
    gdb /usr/bin/foo /var/crash/core.foo.123
[자동 다운로드 후 심볼 사용]
```

자체 빌드 시스템에 사내 debuginfod를 띄우면 *어느 머신에서든* 자동 매칭. 대규모 운영의 게임 체인저.

## 코어 크기 줄이기 — coredump_filter

큰 서버는 코어가 수십 GB까지 갑니다. `/proc/<pid>/coredump_filter`에 비트마스크로 어떤 메모리 영역을 포함할지 지정.

```bash
# 기본값 = 0x33 (anon private + anon shared + huge anon)
$ cat /proc/self/coredump_filter
00000033

# file-backed 영역 제외하고 anon만 (대부분의 경우 충분)
$ echo 0x33 > /proc/<pid>/coredump_filter

# 자식 프로세스에 상속
$ echo 0x33 > /proc/self/coredump_filter   # exec까지 유지됨
```

비트 | 영역
---|---
bit 0 | anonymous private (스택, 힙)
bit 1 | anonymous shared
bit 2 | file-backed private (실행 파일, 공유 라이브러리)
bit 3 | file-backed shared (mmap 공유)
bit 4 | ELF headers
bit 5 | huge private
bit 6 | huge shared
bit 7 | DAX (영구 메모리)

대용량 mmap 파일은 비트 2를 끄면 코어가 확 줄어듭니다. 단, 그 영역의 데이터가 디버깅에 필요하면 다시 켭니다. *file-backed*는 어차피 디스크에 있으니 코어 안에 다시 둘 필요가 없다는 게 기본 발상.

## macOS의 사정

macOS는 *기본적으로 core를 안 만듭니다*. ulimit이 0이고 SIP(시스템 무결성 보호)이 SIGSEGV된 시스템 바이너리의 코어 생성을 막습니다.

```bash
# 활성화
$ sudo sysctl kern.coredump=1
$ ulimit -c unlimited

# 위치
$ sysctl kern.corefile
kern.corefile: /cores/core.%P

# 사용자 앱 크래시는 .crash 또는 .ips로
$ ls ~/Library/Logs/DiagnosticReports/
MyApp_2026-05-10-032114_MyMac.ips
```

`.ips`(JSON)와 `.crash`(텍스트)는 코어가 아니라 *크래시 리포트*입니다. 콜스택 + 레지스터 정도만 있고 메모리는 없습니다. 라이브 lldb 디버깅에는 못 씁니다.

```bash
$ jq '.threads[0].frames' MyApp_*.ips | head -20
```

`.ips`는 JSON이라 자동 분석이 쉽습니다. Apple이 제공하는 `symbolicatecrash` 도구로 콜스택의 주소를 함수명으로 변환.

macOS 코어는 lldb로 엽니다.

```bash
$ lldb /usr/local/bin/server -c /cores/core.1234
(lldb) bt
(lldb) thread backtrace all
```

macOS의 core는 Mach-O 포맷(LC_THREAD load command 등). lldb는 두 포맷(ELF/Mach-O)을 모두 읽습니다.

## minidump / 크로스 플랫폼

크로스 플랫폼 코어 포맷도 있습니다.

- **minidump** (Google Breakpad / crashpad) — Windows·macOS·Linux 공통, 작은 크기. Chrome·Firefox·게임이 사용.
- **stackwalker** + symbol server로 후처리.

minidump는 *완전한 메모리 덤프가 아닙니다*. 콜스택 + 일부 핫 메모리(스택 주변, 일부 힙) + 로드된 모듈 목록만. 크기는 수 MB 수준으로 작아 *대규모 클라이언트 분포에서 자동 수집*에 적합합니다.

```bash
$ minidump_stackwalk crash.dmp ./symbols/
# 콜스택 + 레지스터 + 모듈 출력
```

대규모 클라이언트 배포에서는 minidump가 표준. Sentry, Crashlytics도 minidump 위에 dashboard를 얹은 형태. 서버는 보통 그냥 core.

## ASan / TSan / 시그널과의 관계

[Sanitizer](/blog/tools/debugging/sanitizers/chapter01-asan)들은 검출 시 *진단 메시지*를 출력하고 `abort()`로 죽습니다. `abort()`는 SIGABRT를 일으키므로 core가 생성됩니다. 다만 ASan은 자체 메모리 풀을 쓰므로 core 안의 상태가 약간 혼란스러울 수 있습니다.

```bash
$ ASAN_OPTIONS="abort_on_error=1:disable_coredump=0" ./my_program
```

- `abort_on_error=1` — `_exit` 대신 `abort()` 호출 → core 생성.
- `disable_coredump=0` — ASan이 ulimit을 0으로 안 만들도록.

TSan도 같은 옵션이 있습니다 (`TSAN_OPTIONS`).

ASan의 *shadow memory* 영역(원본 메모리의 1/8)은 코어 분석에 결정적입니다. shadow를 보면 *어느 바이트가 valid/poisoned*인지 알 수 있어 use-after-free의 정체를 알아낼 수 있습니다. ASAN_OPTIONS=`coredump_dump_full_shadow=1`로 강제 포함 가능.

## 실전 운영

1. 서비스 unit에 `LimitCORE=infinity` 박기.
2. `core_pattern`을 systemd-coredump 또는 별도 디렉터리로.
3. coredump_filter로 큰 mmap 제외 (선택).
4. CI 빌드의 stripped 바이너리 + debuginfo 별도 저장 (build-id 디렉터리).
5. 사고 시 `coredumpctl list` → `coredumpctl debug` → `thread apply all bt` → 짚어 가며 변수 확인.

### 자동화 한 줄

```bash
# 모든 core dump를 자동 분석해 콜스택만 떼어 내기
$ for c in /var/crash/core.*; do
    exe=$(file "$c" | awk -F"'" '{print $2}')
    echo "=== $c ($exe) ==="
    gdb -batch -ex 'thread apply all bt' "$exe" "$c"
done > /tmp/postmortem.log
```

CI에서 segfault난 테스트 실행 후 자동으로 콜스택을 수집해 PR 코멘트에 첨부 — 사고 분석 시간 단축.

## 정리

- core 생성 조건 — 시그널 + ulimit + 저장 위치 + dumpable.
- core 파일은 *ELF*(ET_CORE), PT_NOTE에 레지스터·스레드 정보, PT_LOAD에 메모리.
- `coredumpctl`이 systemd 환경의 정석.
- `gdb <exe> <core>` 또는 `coredumpctl debug <PID>`.
- `print $_siginfo`로 죽음의 정체 (NULL deref vs perm violation 등).
- debuginfo는 build-id로 자동 매칭. `debuginfod`로 네트워크 자동 다운로드.
- 큰 mmap은 `coredump_filter` 비트로 제외해 용량 절감.
- macOS는 SIP·기본값이 다름 — `.ips`는 코어가 아니라 크래시 리포트.
- minidump가 클라이언트 분포의 표준 (Breakpad/crashpad).
- Sanitizer로 잡힌 버그도 `abort_on_error=1`이면 core가 떨어진다.

## 다음 장 예고

Ch 8 — 원격·임베디드 디버깅. gdbserver·lldb-server로 다른 머신을 디버깅하는 법과, OpenOCD·J-Link로 베어메탈 MCU(ARM Cortex-M)를 GDB 위에서 다루는 법.

## 관련 항목

- [Ch 6: 멀티스레드 / 멀티프로세스](/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess)
- [Ch 8: 원격 디버깅 / OpenOCD / J-Link](/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging)
- [Ch 12: DWARF](/blog/tools/debugging/gdb-lldb/chapter12-dwarf) — debuginfo의 정체
- [Sanitizers Ch 1: AddressSanitizer](/blog/tools/debugging/sanitizers/chapter01-asan)
- `man 5 core` — core dump 포맷
- `man 5 elf` — ELF 구조
- [systemd-coredump(8)](https://www.freedesktop.org/software/systemd/man/systemd-coredump.html)
- [Google Breakpad](https://chromium.googlesource.com/breakpad/breakpad/) — minidump
