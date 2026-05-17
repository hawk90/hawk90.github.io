---
title: "Ch 1: Core Dump 생성 메커니즘"
date: 2025-09-05T01:00:00
description: "Linux core dump가 어떻게 만들어지나. ulimit, core_pattern, dumpable, systemd-coredump."
tags: [core-dump, linux, ulimit, systemd]
series: "Postmortem Debugging"
seriesOrder: 1
draft: false
---

프로덕션이 한 번 죽고 다시는 재현 안 되는 버그 — 답은 *시신*. core dump가 프로세스 사망 직전의 메모리·레지스터·콜스택 스냅샷. 라이브 디버깅이 진료라면 core 분석은 부검입니다.

이 시리즈는 *core dump의 전체 생명주기*를 다룹니다. 첫 장은 *어떻게* 만들어지는지부터.

:::tldr
특정 시그널 + ulimit 허용 + 저장 위치 결정 + dumpable 플래그 — 네 조건이 모두 맞아야 core가 떨어짐.
:::

## 생성 조건

1. **Core-generating 시그널**.
2. **ulimit -c** > 0.
3. **`/proc/sys/kernel/core_pattern`** 결정한 위치에 쓰기 가능.
4. **PR_SET_DUMPABLE** 플래그 = 1.

하나라도 빠지면 *조용히 사라짐*. 디버깅의 첫 작업이 *왜 core가 안 떨어졌나* 확인일 때가 많음.

## Core-generating 시그널

`man 7 signal`의 "Default action" 열에 "Core" 표시된 시그널들.

| 시그널 | 번호 | 의미 | 흔한 원인 |
|--------|------|------|-----------|
| SIGSEGV | 11 | Segmentation fault | NULL deref, 권한 |
| SIGABRT | 6 | `abort()` 호출 | assert(), Sanitizer |
| SIGFPE | 8 | 부동소수 예외 | div by 0 |
| SIGBUS | 7 | Bus error | unaligned access, mmap 권한 |
| SIGILL | 4 | Illegal instruction | 손상된 코드, 잘못된 함수 포인터 |
| SIGSYS | 31 | Bad syscall | seccomp 위반 |
| SIGQUIT | 3 | Ctrl-\ | 사용자가 의도적 |
| SIGTRAP | 5 | Breakpoint trap | 디버거 안 붙은 BP |
| SIGXCPU | 24 | CPU time 초과 | rlimit |
| SIGXFSZ | 25 | File size 초과 | rlimit |

기본 "Term"인 SIGTERM, SIGINT는 core 생성 안 함.

직접 `abort()` 호출 시.

```c
#include <stdlib.h>
abort();        // SIGABRT → core
```

C++ uncaught exception, `assert(false)`도 결국 `abort()`.

## ulimit -c

```bash
$ ulimit -c
0                    # 기본 — core 안 만들어짐

$ ulimit -c unlimited
$ ulimit -c
unlimited
```

세션 한정. 새 셸을 열면 다시 0.

### 영구 설정

`/etc/security/limits.conf` 또는 `/etc/security/limits.d/*.conf`.

```
*       soft    core    unlimited
*       hard    core    unlimited
```

`soft`는 *사용자가 ulimit으로 변경 가능*한 한도, `hard`는 *최대*. 보통 둘 다 unlimited.

### systemd 서비스

`/etc/systemd/system/myapp.service`.

```ini
[Service]
LimitCORE=infinity
```

systemd로 시작된 서비스는 *셸 ulimit과 무관*. 반드시 service unit에 설정.

```bash
$ systemctl show myapp.service | grep LimitCORE
LimitCORE=infinity
```

## core_pattern

```bash
$ cat /proc/sys/kernel/core_pattern
|/usr/lib/systemd/systemd-coredump %P %u %g %s %t %c %h
```

이 한 줄이 *모든 core dump의 운명*을 결정.

### 두 가지 형식

#### 1. 파일 경로

```bash
$ echo '/var/crash/core.%e.%p' | sudo tee /proc/sys/kernel/core_pattern
```

`/var/crash/core.<exe>.<pid>` 형식으로 떨어짐. *그 자리에* 그대로 저장.

#### 2. 파이프

```bash
$ echo '|/usr/bin/my-coredump-handler %P' | sudo tee /proc/sys/kernel/core_pattern
```

`|`로 시작하면 *그 프로그램*을 *fork + exec*. core 데이터는 *stdin*으로 전달.

핸들러가 디스크에 쓰거나, 압축, 또는 클라우드 업로드.

### 서식 지정자

| 토큰 | 의미 |
|------|------|
| `%p` | PID (namespace 안) |
| `%P` | 글로벌 PID (호스트 namespace) |
| `%i` | TID (스레드, namespace 안) |
| `%I` | 글로벌 TID |
| `%u` | UID |
| `%g` | GID |
| `%s` | 시그널 번호 |
| `%t` | UNIX 시각 |
| `%h` | 호스트 이름 |
| `%e` | 실행 파일 이름 (15바이트) |
| `%E` | 실행 파일 *경로* (`/`를 `!`로 치환) |
| `%c` | core size limit |
| `%C` | CPU |
| `%d` | dumpable 모드 |

### 컨테이너 / namespace

`%p`와 `%P`의 차이가 중요. *컨테이너 안 프로세스*가 죽으면:

- 컨테이너 안에서 `getpid()` = `%p` = 1 (또는 작은 수)
- 호스트에서 본 PID = `%P` = 12345

호스트의 `core_pattern`이 적용되면 보통 `%P` 사용 — 컨테이너 안 PID가 *충돌*할 수 있어서.

컨테이너 안에 자체 `core_pattern`을 두려면 `--privileged` 또는 `--cap-add SYS_ADMIN` 필요.

### 파이프 핸들러의 함정

```
|/path/to/handler %P
```

핸들러가 *디스크에 쓰는 동안* 디버기는 이미 죽어 사라짐. 시간 제한 있음.

```bash
$ cat /proc/sys/kernel/core_pipe_limit
0
```

기본 0 = 무제한. 너무 많은 *동시* core면 핸들러를 *drop*. 사용 시 1 이상으로.

핸들러 자체는 *root 권한*으로 실행. 잘못 짜면 *시스템 전체 보안 위협*.

## systemd-coredump

Fedora·Arch·Ubuntu 22.04+·최신 SUSE의 표준.

```bash
$ cat /proc/sys/kernel/core_pattern
|/usr/lib/systemd/systemd-coredump %P %u %g %s %t %c %h
```

systemd-coredump가 받아 `/var/lib/systemd/coredump/`에 *압축 저장*.

```bash
$ ls /var/lib/systemd/coredump/
core.myapp.1000.deadbeef....1700000000.123456.zst
```

`zstd` 압축. 디스크 절약 + 자동 만료.

### 설정

`/etc/systemd/coredump.conf` 또는 `/etc/systemd/coredump.conf.d/*.conf`.

```ini
[Coredump]
Storage=external          # external = 별 파일, journal = systemd-journal에, none
Compress=yes
ProcessSizeMax=2G         # 한 프로세스의 core 한도
ExternalSizeMax=2G        # 한 파일 크기 한도
JournalSizeMax=767M       # journal 모드 한도
MaxUse=10G                # 전체 디스크 한도
KeepFree=1G               # 디스크 여유
```

```bash
$ systemctl restart systemd-coredump.socket
```

### coredumpctl 명령

```bash
# 목록
$ coredumpctl list
TIME                            PID  UID  GID SIG     COREFILE EXE
Sun 2026-05-10 03:21:14 KST    1234 1000 1000 SIGSEGV present  /usr/local/bin/server

# 정보만
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
       Storage: /var/lib/systemd/coredump/core.server....zst (present)
     Disk Size: 12.5M
       Message: Process 1234 (server) of user 1000 dumped core.

# GDB로 자동 분석
$ coredumpctl debug 1234

# core 파일만 추출
$ coredumpctl dump 1234 > /tmp/core
```

`coredumpctl debug`가 *실행 파일·debuginfo 자동 매칭*. 가장 편한 분석 시작점.

### Filter

```bash
$ coredumpctl list myapp
$ coredumpctl list --since=yesterday
$ coredumpctl list --until=2024-01-01
$ coredumpctl list PID=1234
$ coredumpctl list COMM=myapp
$ coredumpctl list EXE=/usr/local/bin/server
```

systemd-journal 쿼리 문법 — strict filter.

## PR_SET_DUMPABLE

```c
prctl(PR_SET_DUMPABLE, 0);   // core 생성 안 됨
prctl(PR_SET_DUMPABLE, 1);   // 정상
prctl(PR_SET_DUMPABLE, 2);   // suidsafe — root만 dump 읽기
```

setuid/setgid 바이너리는 *보안상 자동으로 0*. `passwd`, `sudo`가 죽으면 core 안 떨어짐 (악의적 사용자가 *root 비밀번호 해시*를 core에서 읽을 수 있어).

`/proc/sys/fs/suid_dumpable=2`로 *root만 읽을 수 있는* core 생성 허용.

```bash
$ sysctl fs.suid_dumpable
fs.suid_dumpable = 0

$ sudo sysctl fs.suid_dumpable=2
```

## coredump_filter — 영역 선택

`/proc/<pid>/coredump_filter`로 *어떤 메모리 영역*을 core에 포함할지.

```bash
$ cat /proc/self/coredump_filter
00000033        # 기본
```

비트별.

| 비트 | 영역 |
|------|------|
| 0 | anonymous private (stack, heap) |
| 1 | anonymous shared |
| 2 | file-backed private (.text, .rodata, .so) |
| 3 | file-backed shared |
| 4 | ELF headers |
| 5 | huge private |
| 6 | huge shared |
| 7 | DAX (persistent memory) |
| 8 | shared anonymous huge pages |

기본 `0x33` = bits 0, 1, 4, 5 — 충분한 정보 + 파일 백킹 데이터 제외 (이미 디스크에 있음).

큰 mmap 파일(예: 10GB 데이터)을 *제외*하려면 bit 2를 끄기 (이미 그렇게 됨).

### 실행 파일과 동시 설정

```bash
# 부모 셸의 자식 프로세스에 적용
$ echo 0x33 > /proc/self/coredump_filter
$ ./my_prog
```

자식 프로세스가 *상속*. exec 후에도 유지.

### 환경 변수

```bash
$ COREDUMP_FILTER=0x33 ./my_prog
```

GNU libc 일부 버전이 자동 적용.

## 가장 흔한 함정 — 왜 core가 안 떨어지나

체크리스트:

1. `ulimit -c unlimited` 했나?
2. `core_pattern`이 *쓰기 가능한* 위치를 가리키나?
3. `/proc/<pid>/coredump_filter`이 정상?
4. `PR_SET_DUMPABLE` 0 아닌가?
5. 디스크에 *공간 충분*한가?
6. systemd unit이면 `LimitCORE=infinity` 설정됐나?
7. seccomp가 *core 생성을 막지 않나*?

```bash
# 빠른 확인 — 강제 SIGSEGV로 테스트
$ cat > /tmp/test.c <<EOF
int main() { *(int *)0 = 0; return 0; }
EOF
$ gcc /tmp/test.c -o /tmp/test
$ ulimit -c unlimited
$ /tmp/test
Segmentation fault (core dumped)         ← OK

$ /tmp/test
Segmentation fault                       ← BAD (core not dumped)
```

`(core dumped)` 메시지가 *있어야* 떨어짐.

```bash
# 어디 떨어졌나
$ ls -la core* 2>/dev/null
$ coredumpctl list --since='5 minutes ago'
$ sudo find / -name 'core*' -newer /tmp/test 2>/dev/null
```

## ASan / TSan과 core

[Sanitizer](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)는 *검출 시 자체 진단 메시지* + `abort()` 호출. SIGABRT는 core 생성 시그널.

```bash
$ ASAN_OPTIONS="abort_on_error=1:disable_coredump=0" ./prog
```

- `abort_on_error=1` — `_exit` 대신 `abort()` (기본은 `_exit`).
- `disable_coredump=0` — ASan이 `setrlimit(RLIMIT_CORE, 0)` 호출 안 함.

TSan은 `TSAN_OPTIONS`, UBSan은 `UBSAN_OPTIONS`.

### ASan shadow 메모리

ASan은 *원본 메모리의 1/8 크기*의 shadow를 유지. 큰 프로세스면 *수 GB*. core_filter로 shadow도 포함하면 core가 *매우 커짐*.

ASAN의 `coredump_dump_full_shadow=1` 옵션으로 *shadow도 포함* — 사후 분석에 유용하지만 디스크 부담.

## 코어 생성에 시간

큰 프로세스 (10GB+)는 core 생성 자체가 *분 단위*. 그 사이 디버기는 이미 죽어 있고, 컨테이너·systemd는 *재시작 중*.

해법.

- **gcore** — 살아 있는 프로세스의 core. 디버기 *정지하지만 곧 재개*.
  ```bash
  $ sudo gcore -o /tmp/core <pid>
  ```
- **사후 압축** — core_pattern 핸들러가 *fork된 자식*에서 압축.
- **selected coredump_filter** — file-backed 제외해 크기 ↓.

## fork된 자식의 core

```c
pid_t pid = fork();
if (pid == 0) {
    *(int *)0 = 0;   // 자식만 죽음
}
```

자식 core가 떨어짐. 부모는 정상 동작.

`fork` + `vfork`의 자식이 *바로 죽으면* core 생성 — *어디서* 발생했는지 추적 어려울 수 있음 (콜스택이 *exec 직전 stub*에서 끝남).

## 정리

- 4 조건: 시그널 + ulimit + 위치 + dumpable.
- `core_pattern`이 *파일* 또는 *파이프 핸들러*.
- 컨테이너 환경은 `%P` (호스트 PID) 사용 권장.
- systemd-coredump가 현대 표준 — `coredumpctl`로 관리.
- coredump_filter로 *영역 선택* → 큰 mmap 제외.
- PR_SET_DUMPABLE = 0이면 (setuid 등) core 안 생성.
- ASan/TSan은 `abort_on_error=1`로 core 생성.
- 큰 프로세스는 `gcore`로 *살아 있는* core 추출.

## 다음 장 예고

Ch 2 — ELF core file 포맷 깊이. PT_NOTE, NT_PRSTATUS, NT_FILE의 정체.

## 관련 항목

- [Ch 2: ELF core 포맷](/blog/tools/debugging/postmortem/chapter02-elf-core-format)
- `man 5 core` — core dump 포맷
- `man 8 systemd-coredump`
- `man 1 coredumpctl`
- [Linux kernel core dump 문서](https://www.kernel.org/doc/html/latest/admin-guide/sysctl/kernel.html#core-pattern)
