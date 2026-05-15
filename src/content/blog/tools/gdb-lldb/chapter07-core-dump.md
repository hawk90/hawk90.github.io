---
title: "Ch 7: core dump 분석"
date: 2025-08-20T07:00:00
description: "ulimit / core_pattern. gdb -c. 패닉 사후 분석. coredumpctl / macOS .crash."
tags: [gdb, Core Dump, Crash]
series: "GDB and LLDB"
seriesOrder: 7
draft: false
---

프로덕션에서 가장 답답한 순간 — 서버가 한 번 죽고, 다음에 켤 땐 문제가 안 보입니다. 이때 *시신*만 남으면 부검할 수 있습니다. core dump는 프로세스가 죽기 직전의 메모리·레지스터·콜스택 스냅샷입니다. 라이브 디버깅이 환자 진료라면 core 분석은 부검입니다.

## core dump가 만들어지는 조건

세 가지가 모두 맞아야 파일이 떨어집니다.

1. **시그널** — `SIGSEGV`(11), `SIGABRT`(6), `SIGFPE`(8), `SIGBUS`(7), `SIGILL`(4) 등 *코어를 생성하는 시그널* (`man 7 signal`의 "Default action" 열에 "Core").
2. **ulimit** — `ulimit -c`로 허용된 최대 코어 크기. 기본 0이면 안 만들어집니다.
3. **저장 위치** — Linux는 `/proc/sys/kernel/core_pattern`이 결정. 일반 파일·파이프·systemd-coredump 등.

## ulimit 켜기

```bash
# 셸 세션 한정
$ ulimit -c unlimited
$ ulimit -c
unlimited

# 영구 (systemd 서비스)
[Service]
LimitCORE=infinity

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
| `%p` | PID |
| `%e` | 실행 파일 이름 |
| `%E` | 실행 파일 경로(`/`를 `!`로) |
| `%t` | UNIX 시각 |
| `%s` | 시그널 번호 |
| `%h` | 호스트 이름 |
| `%c` | core size limit |
| `%u`/`%g` | UID/GID |

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
```

`coredumpctl debug`는 실행 파일·debuginfo를 자동으로 찾아 줍니다. 가장 편한 진입점.

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

## 코어 크기 줄이기 — coredump_filter

큰 서버는 코어가 수십 GB까지 갑니다. `/proc/<pid>/coredump_filter`에 비트마스크로 어떤 메모리 영역을 포함할지 지정.

```bash
# 기본값 = 0x33 (anon private + anon shared + huge anon)
$ cat /proc/self/coredump_filter
00000033

# file-backed 영역 제외하고 anon만 (대부분의 경우 충분)
$ echo 0x33 > /proc/<pid>/coredump_filter
```

비트 | 영역
---|---
bit 0 | anonymous private
bit 1 | anonymous shared
bit 2 | file-backed private
bit 3 | file-backed shared
bit 4 | ELF headers
bit 5 | huge private
bit 6 | huge shared

대용량 mmap 파일은 비트 2를 끄면 코어가 확 줄어듭니다. 그 영역이 디버깅에 필요하면 다시 켭니다.

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

macOS 코어는 lldb로 엽니다.

```bash
$ lldb /usr/local/bin/server -c /cores/core.1234
(lldb) bt
(lldb) thread backtrace all
```

## minidump / 크로스 플랫폼

크로스 플랫폼 코어 포맷도 있습니다.

- **minidump** (Google Breakpad / crashpad) — Windows·macOS·Linux 공통, 작은 크기. Chrome·Firefox·게임이 사용.
- **stackwalker** + symbol server로 후처리.

대규모 클라이언트 배포에서는 minidump가 표준. 서버는 보통 그냥 core.

## ASan / TSan / 시그널과의 관계

[Sanitizer](/blog/tools/debugging/sanitizers/chapter01-asan)들은 검출 시 *진단 메시지*를 출력하고 `abort()`로 죽습니다. `abort()`는 SIGABRT를 일으키므로 core가 생성됩니다. 다만 ASan은 자체 메모리 풀을 쓰므로 core 안의 상태가 약간 혼란스러울 수 있습니다.

```bash
$ ASAN_OPTIONS="abort_on_error=1:disable_coredump=0" ./my_program
```

- `abort_on_error=1` — `_exit` 대신 `abort()` 호출 → core 생성.
- `disable_coredump=0` — ASan이 ulimit을 0으로 안 만들도록.

TSan도 같은 옵션이 있습니다 (`TSAN_OPTIONS`).

## 실전 운영

1. 서비스 unit에 `LimitCORE=infinity` 박기.
2. `core_pattern`을 systemd-coredump 또는 별도 디렉터리로.
3. coredump_filter로 큰 mmap 제외 (선택).
4. CI 빌드의 stripped 바이너리 + debuginfo 별도 저장 (build-id 디렉터리).
5. 사고 시 `coredumpctl list` → `coredumpctl debug` → `thread apply all bt` → 짚어 가며 변수 확인.

## 정리

- core 생성 조건 — 시그널 + ulimit + 저장 위치.
- `coredumpctl`이 systemd 환경의 정석.
- `gdb <exe> <core>` 또는 `coredumpctl debug <PID>`.
- debuginfo는 build-id로 자동 매칭.
- 큰 mmap은 `coredump_filter` 비트로 제외해 용량 절감.
- macOS는 SIP·기본값이 다름 — `.ips`는 코어가 아니라 크래시 리포트.
- Sanitizer로 잡힌 버그도 `abort_on_error=1`이면 core가 떨어진다.

## 다음 장 예고

Ch 8 — 원격·임베디드 디버깅. gdbserver·lldb-server로 다른 머신을 디버깅하는 법과, OpenOCD·J-Link로 베어메탈 MCU(ARM Cortex-M)를 GDB 위에서 다루는 법.

## 관련 항목

- [Ch 6: 멀티스레드 / 멀티프로세스](/blog/tools/gdb-lldb/chapter06-multithread-multiprocess)
- [Ch 8: 원격 디버깅 / OpenOCD / J-Link](/blog/tools/gdb-lldb/chapter08-remote-debugging)
- [Sanitizers Ch 1: AddressSanitizer](/blog/tools/debugging/sanitizers/chapter01-asan)
- `man 5 core` — core dump 포맷
- [systemd-coredump(8)](https://www.freedesktop.org/software/systemd/man/systemd-coredump.html)
