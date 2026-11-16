---
title: "Core Dump 생성 메커니즘 — kernel의 dump path 분석"
slug: "tools/debugging/postmortem/chapter01-core-generation"
date: 2026-06-01T09:01:00
description: "Linux core dump가 어떻게 만들어지나. ulimit, core_pattern, dumpable, systemd-coredump."
tags: [core-dump, linux, ulimit, systemd]
series: "Postmortem Debugging"
seriesOrder: 1
draft: false
topics: ["tools", "tools/debugging"]
---

프로덕션에서 한 번 죽고 다시는 재현되지 않는 버그가 있습니다. 이때 남는 단서가 core dump입니다. core dump는 프로세스가 죽는 순간의 메모리·레지스터·스레드 상태를 담은 파일이고, 라이브 디버깅이 진료라면 core 분석은 부검입니다.

이 시리즈는 core dump의 생명주기 전체를 다룹니다. 첫 장은 core가 *어떤 조건에서* 만들어지고 *어디로* 가는지부터 봅니다. 시신이 안치소에 도착하지 않으면 부검도 없습니다. 디버깅의 첫 작업이 "왜 core가 안 떨어졌나"인 경우가 많은 이유입니다.

:::tldr
core는 기본 동작이 Core인 시그널을 받은 dumpable 프로세스에서 만들어지고, `core_pattern`이 파일 경로냐 `|` 파이프냐에 따라 갈 곳이 정해집니다. 파일 방식은 `RLIMIT_CORE`를 따르고 파이프 방식은 무시합니다. Debian 13에서는 `systemd-coredump` 패키지를 설치하는 순간 core_pattern·core_pipe_limit·suid_dumpable·기본 core 한도가 한꺼번에 바뀝니다.
:::

## 실행 환경

이 장의 출력은 모두 아래 VM에서 직접 실행한 결과입니다.

| 항목 | 값 |
| --- | --- |
| 게스트 | Debian 13.7 arm64 cloud 이미지, 커널 `6.12.116+deb13-arm64` |
| 호스트 | QEMU 11.1.3 `-M virt -accel hvf -smp 4 -m 4g` (Apple Silicon) |
| 도구 | GCC 14.2.0, GDB 16.3, systemd 257.13, man-pages 6.9.1 |

## 생성 조건

core가 만들어지려면 네 단계를 모두 통과해야 합니다. 하나라도 막히면 프로세스는 조용히 죽고 파일은 남지 않습니다.

1. 기본 동작이 Core인 시그널을 받고, 그 시그널을 잡는 핸들러가 없습니다.
2. 프로세스가 dumpable입니다. setuid 실행이나 `PR_SET_DUMPABLE 0`이 이 상태를 끕니다.
3. 파일 방식이면 `RLIMIT_CORE`가 0이 아니고, 대상 디렉터리에 쓸 수 있어야 합니다. 파이프 방식은 `RLIMIT_CORE`를 보지 않습니다.
4. `core_pattern`이 가리키는 파일이나 파이프 핸들러가 받아서 저장합니다.

`core(5)`는 core가 안 만들어지는 경우를 이렇게 나열합니다. 디렉터리에 쓰기 권한이 없거나 디렉터리가 없을 때, 같은 이름의 파일이 이미 있고 하드 링크가 둘 이상일 때, 파일 시스템이 가득 찼거나 읽기 전용일 때, `RLIMIT_CORE` 또는 `RLIMIT_FSIZE`가 0일 때, 실행 파일에 읽기 권한이 없을 때, setuid·file capability 프로그램을 실행 중일 때, 커널이 `CONFIG_COREDUMP` 없이 빌드됐을 때입니다.

## Core-generating 시그널

`signal(7)`의 "Action" 열이 `Core`인 시그널만 core를 만듭니다. 아래 번호와 결과는 VM에서 `kill -l`과 실제 `kill`로 확인했습니다. 각 시그널을 `ulimit -c unlimited` 셸의 자식에게 보내고 `core.<pid>`가 생겼는지 봤습니다.

| 시그널 | 번호 | 종료 코드 | core | 흔한 원인 |
|--------|------|-----------|------|-----------|
| SIGSEGV | 11 | 139 | 생김 | NULL 역참조, 매핑되지 않은 주소 |
| SIGABRT | 6 | 134 | 생김 | `abort()`, `assert()`, uncaught C++ exception |
| SIGFPE | 8 | 136 | 생김 | x86의 정수 0 나누기 (arm64 `SDIV`/`UDIV`는 0을 돌려줌, Ch 2) |
| SIGBUS | 7 | 135 | 생김 | 잘린 mmap 파일 접근, 정렬 위반 |
| SIGILL | 4 | 132 | 생김 | 손상된 코드, 잘못된 함수 포인터 |
| SIGSYS | 31 | 159 | 생김 | seccomp 위반 |
| SIGQUIT | 3 | 131 | 생김 | 터미널의 Ctrl-\ |
| SIGTRAP | 5 | 133 | 생김 | 디버거 없이 실행된 breakpoint 명령 |
| SIGXCPU | 24 | 152 | 생김 | `RLIMIT_CPU` 초과 |
| SIGXFSZ | 25 | 153 | 생김 | `RLIMIT_FSIZE` 초과 |
| SIGTERM | 15 | 143 | 없음 | 기본 동작이 Term |
| SIGINT | 2 | 130 | 없음 | 기본 동작이 Term |

종료 코드는 128 + 시그널 번호입니다. 번호는 x86과 ARM이 같지만 `signal(7)`의 번호 표에서 Alpha·SPARC·MIPS는 다릅니다. 예를 들어 SIGBUS는 Alpha·SPARC·MIPS에서 10이고, SIGSYS는 Alpha·SPARC·MIPS에서 12입니다.

처음 측정할 때 SIGQUIT는 종료 코드 0으로 core가 없었습니다. 비대화형 bash가 백그라운드(`&`)로 띄운 자식은 SIGINT와 SIGQUIT를 무시한 채 시작하기 때문입니다. 모든 시그널을 `SIG_DFL`로 되돌린 뒤 `pause()`하는 작은 프로그램으로 다시 재서 위 표의 값을 얻었습니다. 시그널 동작이 상속된다는 점은 서비스 관리자나 셸 스크립트가 띄운 프로세스에서 core가 안 나는 원인이 되기도 합니다.

`abort()`를 직접 부르는 코드입니다.

```c title="abort-core-signal.c"
#include <stdlib.h>

int main(void) {
    abort();
}
```

uncaught C++ exception도 같은 길로 갑니다. `throw std::runtime_error("boom")`만 있는 프로그램은 `terminate called after throwing an instance of 'std::runtime_error'`를 찍고 종료 코드 134(SIGABRT)로 core를 남겼습니다.

## ulimit -c

Debian 13 cloud 이미지에 root로 로그인한 셸의 기본값입니다. soft 한도는 0이고 hard 한도는 unlimited라서, 사용자가 직접 올릴 수 있습니다.

```text
$ ulimit -c
0
$ ulimit -Hc
unlimited
$ ulimit -c unlimited
$ ulimit -c
unlimited
```

`ulimit`은 그 셸과 자식에게만 적용됩니다. 새 로그인 셸은 PAM이 `/etc/security/limits.conf`와 `limits.d/*.conf`에서 다시 읽은 값으로 시작합니다.

아래 셸 출력은 이 장의 측정을 모은 스크립트(`/root/c1.sh`)로 돌린 것이라 오류 줄 앞에 스크립트 이름과 줄 번호가 붙습니다. 한도를 아주 작게 잡으면 core가 잘립니다. `ulimit -c 4`(4 KiB)로 같은 프로그램을 죽이자 286,720바이트였던 core가 4,128바이트로 남았고, 셸은 그래도 `(core dumped)`를 찍었습니다.

```text
$ bash -c "ulimit -c unlimited; ./segv"
/root/c1.sh: line 21:  2147 Segmentation fault      (core dumped) bash -c "ulimit -c unlimited; ./segv"
$ bash -c "ulimit -c 4; ./segv"
/root/c1.sh: line 22:  2148 Segmentation fault      (core dumped) bash -c "ulimit -c 4; ./segv"
$ ls -l core.*
-rw------- 1 root root 286720 Nov 16 05:46 core.2147
-rw------- 1 root root   4128 Nov 16 05:46 core.2148
```

셸의 `(core dumped)`는 `wait()` 상태의 core 비트(`WCOREDUMP`)를 옮긴 것입니다. 커널이 dump를 시작했다는 뜻일 뿐, 쓸 수 있는 core가 원하는 곳에 저장됐다는 증거는 아닙니다.

### 영구 설정

`/etc/security/limits.conf` 또는 `/etc/security/limits.d/*.conf`에 줄을 추가합니다.

```text
*       soft    core    unlimited
*       hard    core    unlimited
```

`soft`는 프로세스에 실제로 적용되는 값이고, 사용자는 `ulimit`으로 soft를 hard까지 올릴 수 있습니다. `hard`는 root가 아니면 올릴 수 없는 상한입니다.

### systemd 서비스

systemd가 띄운 서비스는 로그인 셸을 거치지 않으므로 PAM limits도, 셸의 `ulimit`도 받지 않습니다. 한도는 systemd의 `DefaultLimitCORE=`와 unit의 `LimitCORE=`가 정합니다. 서비스마다 다르게 잡으려면 unit에 적습니다.

```ini
[Service]
LimitCORE=infinity
```

Debian 13에서는 기본값이 패키지 설치 여부에 따라 달라집니다. 기본 이미지에서 `systemctl show -p DefaultLimitCORE -p DefaultLimitCORESoft`는 `infinity`와 `0`이었습니다. 서비스의 soft 한도가 0이라 파일 방식 core가 생기지 않습니다. `systemd-coredump` 패키지를 설치하자 둘 다 `infinity`가 됐고, unit에 아무것도 적지 않은 서비스도 `LimitCORESoft=infinity`로 떴습니다.

```text
$ systemctl show server.service -p LimitCORE -p LimitCORESoft
LimitCORE=infinity
LimitCORESoft=infinity
```

이 값은 패키지가 설치하는 `/usr/lib/systemd/system.conf.d/20-coredump-debian.conf`의 `DefaultLimitCORE=infinity`에서 옵니다. 같은 패키지가 로그인 셸용으로 `/etc/security/limits.d/20-coredump-debian.conf`(soft core infinity)도 설치합니다.

## core_pattern

core가 어디로 갈지는 `/proc/sys/kernel/core_pattern` 한 줄이 정합니다. 커널 기본값은 `core`이고, Debian 13 기본 이미지도 그대로였습니다. `core_uses_pid`가 1이라서 실제 파일 이름은 `core.<pid>`가 됩니다. 패턴에 `%p`가 없고 `core_uses_pid`가 0이 아니면 커널이 `.PID`를 붙입니다(kernel `sysctl/kernel.rst`).

```text
$ cat /proc/sys/kernel/core_pattern
core
$ cat /proc/sys/kernel/core_uses_pid
1
```

### 두 가지 형식

#### 1. 파일 경로

경로에 `%` 서식 지정자를 섞으면 커널이 dump 시점에 값을 채웁니다. 지정자를 거의 다 넣어 실행 파일 이름이 긴 프로그램을 죽여 봤습니다.

```text
# echo "/var/crash/core.%e.%p.%P.%s.%t.%E.%c.%d.%C" > /proc/sys/kernel/core_pattern
# bash -c "ulimit -c unlimited; exec ./a_really_long_program_name"
# ls /var/crash/
core.a_really_long_p.2154.2154.11.1794807999.!root!c1!a_really_long_program_name.18446744073709551615.1.1
```

`%e`는 15글자에서 잘렸고(`a_really_long_p`), `%E`는 `/`를 `!`로 바꾼 전체 경로입니다. `%c`는 unlimited인 `RLIMIT_CORE`를 64비트 최댓값 18446744073709551615로 찍었습니다. 상대 경로는 죽는 프로세스의 현재 디렉터리·mount namespace·root 기준으로 해석됩니다(`core(5)`).

#### 2. 파이프

`|`로 시작하면 커널이 그 프로그램을 실행하고 core를 표준 입력으로 흘려 보냅니다. `core(5)`의 설명대로 핸들러는 root 권한으로, 초기 namespace에서, 작업 디렉터리 `/`로 실행됩니다. 인자와 입력 크기를 기록하는 핸들러로 확인했습니다.

```bash title="/usr/local/bin/core-handler"
#!/bin/sh
# core_pattern 파이프 핸들러가 받는 인자와 stdin 크기를 기록
{ echo "argv: $*"; echo "uid=$(id -u) cwd=$(pwd)"; echo "bytes=$(wc -c)"; } > /var/crash/handler.log
```

`ulimit -c 0`인 셸에서 죽였는데도 286,720바이트가 전부 들어왔습니다. 파이프 방식은 `RLIMIT_CORE`를 적용하지 않습니다. 한도는 `%c`로 핸들러에 넘어가고, 그 값을 따를지는 핸들러가 정합니다.

```text
# echo "|/usr/local/bin/core-handler %p %P %i %I %e %s %c" > /proc/sys/kernel/core_pattern
# bash -c "ulimit -c 0; exec ./segv"
# cat /var/crash/handler.log
argv: 2159 2159 2159 2159 segv 11 0
uid=0 cwd=/
bytes=286720
```

### 서식 지정자

아래 표는 Linux 6.12 `Documentation/admin-guide/sysctl/kernel.rst`의 목록입니다. man-pages 6.9.1의 `core(5)`에는 `%f`와 `%C`가 아직 없습니다.

| 토큰 | 의미 |
|------|------|
| `%p` | PID (프로세스가 속한 PID namespace 기준) |
| `%P` | PID (초기 PID namespace 기준) |
| `%i` | dump를 일으킨 스레드의 TID (namespace 기준) |
| `%I` | 같은 TID (초기 namespace 기준) |
| `%u` / `%g` | 실제 UID / GID (초기 user namespace 기준) |
| `%s` | 시그널 번호 |
| `%t` | dump 시각 (UNIX epoch 초) |
| `%h` | 호스트 이름 |
| `%e` | `comm` 값, 최대 15글자 |
| `%f` | 실행 파일 이름 |
| `%E` | 실행 파일 경로 (`/` → `!`) |
| `%c` | `RLIMIT_CORE` soft 한도 |
| `%C` | 태스크가 돌던 CPU |
| `%d` | dump 모드 (`PR_GET_DUMPABLE` 값) |

목록에 없는 `%X` 조합은 지정자와 문자가 함께 버려집니다.

### 컨테이너 / namespace

PID namespace 안에서 죽은 프로세스는 `%p`와 `%P`가 다릅니다. 이번에는 핸들러가 받은 인자를 덮어쓰지 않고 한 줄씩 덧붙이게(`echo "argv: $* bytes=$(wc -c)" >> /var/crash/handler-ns.log`) 바꾸고, `unshare -p -f --mount-proc`로 만든 namespace 안에서 같은 프로그램을 죽였습니다.

```text
# unshare -p -f --mount-proc bash -c "ulimit -c 0; ./segv; echo inner-exit=\$?"
bash: line 1:     2 Segmentation fault      (core dumped) ./segv
inner-exit=139
# cat /var/crash/handler-ns.log
argv: 2 2171 2 2171 segv 11 0 bytes=286720
```

namespace 안의 셸은 PID 2를 보고, 핸들러는 `%p` 2와 `%P` 2171을 받았습니다. 명령 끝의 `echo`를 빼면 결과가 달라집니다. 마지막 명령이 된 `./segv`를 bash가 `exec`하고, `unshare`는 자식이 시그널로 죽으면 같은 시그널로 자신도 죽기 때문에 `unshare` 프로세스의 core가 하나 더 핸들러로 들어옵니다. 앞 핸들러처럼 로그를 덮어쓰면 그 두 번째 호출(`%e`가 `unshare`)만 남습니다. 핸들러는 초기 namespace에서 실행되므로 `/proc/<pid>`를 찾으려면 `%P`를 써야 합니다. 컨테이너마다 1, 2 같은 작은 PID가 반복되므로 파일 이름에도 `%P`가 겹치지 않습니다.

`core_pattern`은 커널 전체에 하나뿐이고 namespace별 사본이 없습니다. 호스트 root가 `unshare -p -m -u -f`로 새 PID·mount·UTS namespace를 만들고 그 안에서 값을 쓰자 호스트의 `core_pattern`이 바뀌었습니다. 반대로 일반 사용자가 `unshare -U -r`로 만든 user namespace의 "root"는 같은 파일에 `Permission denied`를 받았습니다. 컨테이너 안에서 `core_pattern`을 바꿀 수 있다면 그것은 호스트 설정을 바꾸는 것입니다.

### 파이프 핸들러의 대기 — core_pipe_limit

핸들러가 `/proc/<pid>`에서 정보를 더 읽으려면 그동안 죽는 프로세스가 회수되지 않아야 합니다. `core_pipe_limit`이 이 동작을 정합니다. `core(5)`에 따르면 0은 "병렬 수 제한 없음, 핸들러 종료를 기다리지 않음"이고 커널 기본값이 0입니다. 1 이상이면 그 수만큼만 동시에 처리하고, 넘는 dump는 커널 로그를 남기고 건너뜁니다.

stdin을 다 읽은 뒤 2초 쉬고 `/proc/<pid>/comm`을 읽는 핸들러로 두 값을 비교했습니다.

```text
limit=0 segv-exit-after=0.00s bytes=286720 comm=cat: /proc/2194/comm: No such file or directory
limit=1 segv-exit-after=2.00s bytes=286720 comm=segv
```

0이면 핸들러가 stdin을 다 읽는 순간 프로세스가 회수되어 `/proc/2194`가 사라집니다. 1이면 커널이 핸들러 종료까지 기다리므로 죽은 프로세스의 종료가 2초 늦어지고 `/proc`이 남아 있습니다.

한도를 넘는 경우도 재현했습니다. 3초 동안 stdin을 읽지 않는 핸들러를 걸고 `core_pipe_limit=1`에서 세 프로세스를 동시에 죽이자 하나만 처리되고 둘은 버려졌습니다.

```text
[  210.259659] coredump: 2218(segv): over core_pipe_limit, skipping core dump
[  210.259679] coredump: 2219(segv): over core_pipe_limit, skipping core dump
```

이 실험에서 limit=0일 때도 세 프로세스가 모두 3.01초 뒤에 끝났습니다(limit=1일 때도 3.01초). 커널이 core를 파이프에 쓰는 동안은 핸들러가 읽어 주기를 기다리기 때문입니다. "기다리지 않는다"는 말은 stdin을 다 쓴 뒤 핸들러의 종료를 기다리지 않는다는 뜻입니다. 핸들러가 stdin을 읽지 않고 멈추면 죽는 프로세스도 그 자리에 묶입니다.

## systemd-coredump

Debian 13 cloud 이미지에는 `systemd-coredump`가 깔려 있지 않습니다. `apt install systemd-coredump`(257.13-1~deb13u1)만으로 바뀌는 값을 정리하면 다음과 같습니다.

| 항목 | 설치 전 | 설치 후 | 설정 파일 |
| --- | --- | --- | --- |
| `kernel.core_pattern` | `core` | `\|/usr/lib/systemd/systemd-coredump %P %u %g %s %t %c %h %d %F` | `/usr/lib/sysctl.d/50-coredump.conf` |
| `kernel.core_pipe_limit` | 0 | 16 | 같은 파일 |
| `fs.suid_dumpable` | 0 | 2 | 같은 파일 |
| 서비스 기본 soft core 한도 | 0 | infinity | `system.conf.d/20-coredump-debian.conf` |
| 로그인 셸 soft core 한도 | 0 | infinity | `limits.d/20-coredump-debian.conf` |

패턴 끝의 `%F`는 Linux 6.12의 지정자 목록에 없으므로 이 커널에서는 버려집니다.

core는 `/var/lib/systemd/coredump/`에 zstd로 압축되어 저장됩니다. 파일 이름은 `core.<comm>.<uid>.<boot id>.<pid>.<마이크로초 시각>.zst`입니다.

```text
$ ls -l /var/lib/systemd/coredump/
-rw-r----- 1 root root 16468 Nov 16 05:52 core.server.0.cae0f96507a64bf391aea4deff2b3dc8.2766.1794808364000000.zst
-rw-r----- 1 root root 16435 Nov 16 05:52 core.server.0.cae0f96507a64bf391aea4deff2b3dc8.2806.1794808364000000.zst
```

286,720바이트짜리 core가 16 KiB로 줄었습니다. 오래된 파일은 `/usr/lib/tmpfiles.d/systemd.conf`의 `d /var/lib/systemd/coredump 0755 root root 2w` 줄에 따라 2주 뒤 `systemd-tmpfiles`가 지웁니다.

### 설정

`/etc/systemd/coredump.conf`에는 컴파일 기본값이 주석으로 들어 있습니다. 바꿀 때는 `/etc/systemd/coredump.conf.d/*.conf`에 drop-in을 둡니다.

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

`coredump.conf(5)`(systemd 257)의 정의입니다.

| 키 | 기본값 | 의미 |
| --- | --- | --- |
| `Storage=` | `external` | `external`은 별도 파일, `journal`은 journal 안, `none`은 저장 안 함 |
| `ProcessSizeMax=` | 64비트 32G | 이보다 큰 core는 스택 트레이스를 만들지 않음 |
| `ExternalSizeMax=` | 64비트 32G | 파일로 저장할 최대 크기 |
| `JournalSizeMax=` | 767M | journal에 저장할 최대 크기. journal 레코드 상한이라 올릴 수 없음 |
| `MaxUse=` | 디스크의 10%, 최대 4GiB | 넘으면 오래된 core부터 삭제 |
| `KeepFree=` | 디스크의 15%, 최대 4GiB | 최소 여유 공간 |

`Storage=none`과 `ProcessSizeMax=0`을 함께 주면 로그 한 줄만 남기고 모든 처리를 끕니다. 설정은 core가 들어올 때마다 새로 뜨는 `systemd-coredump@.service`가 읽으므로 재시작할 데몬이 없습니다.

### `RLIMIT_CORE`=0이면 systemd-coredump도 버린다

파이프 방식이라 커널은 한도를 무시하지만, systemd-coredump는 `%c`로 받은 한도를 따릅니다. `ulimit -c 0` 셸에서 죽은 2762번은 목록에 `none`으로 남았고, journal에 이유가 찍혔습니다.

```text
systemd-coredump[2764]: Resource limits disable core dumping for process 2762 (server).
systemd-coredump[2764]: Process 2762 (server) of user 0 terminated abnormally without generating a coredump.
```

### coredumpctl 명령

`ulimit -c 0` 셸, `ulimit -c unlimited` 셸, systemd 서비스에서 같은 프로그램을 한 번씩 죽인 뒤의 목록입니다.

```text
$ coredumpctl list
TIME                         PID UID GID SIG     COREFILE EXE                   SIZE
Mon 2026-11-16 05:52:44 UTC 2762   0   0 SIGSEGV none     /usr/local/bin/server    -
Mon 2026-11-16 05:52:44 UTC 2766   0   0 SIGSEGV present  /usr/local/bin/server  16K
Mon 2026-11-16 05:52:44 UTC 2806   0   0 SIGSEGV present  /usr/local/bin/server  16K
```

`info`는 메타데이터와 함께 systemd-coredump가 저장 시점에 뽑은 스택 트레이스를 보여 줍니다.

```text
$ coredumpctl info 2806
           PID: 2806 (server)
           UID: 0 (root)
           GID: 0 (root)
        Signal: 11 (SEGV)
     Timestamp: Mon 2026-11-16 05:52:44 UTC (3s ago)
  Command Line: /usr/local/bin/server --config=prod.yaml
    Executable: /usr/local/bin/server
 Control Group: /system.slice/server.service
          Unit: server.service
         Slice: system.slice
       Boot ID: cae0f96507a64bf391aea4deff2b3dc8
    Machine ID: d48c9f0766684929b9f173997f262078
      Hostname: localhost
       Storage: /var/lib/systemd/coredump/core.server.0.cae0f96507a64bf391aea4deff2b3dc8.2806.1794808364000000.zst (present)
  Size on Disk: 16K
       Message: Process 2806 (server) of user 0 dumped core.

                Stack trace of thread 2806:
                #0  0x0000aaaad9c8076c main (/usr/local/bin/server + 0x76c)
                #1  0x0000ffffadf4225c n/a (libc.so.6 + 0x2225c)
                #2  0x0000ffffadf4233c __libc_start_main (libc.so.6 + 0x2233c)
                #3  0x0000aaaad9c80670 _start (/usr/local/bin/server + 0x670)
                ELF object binary architecture: AARCH64
```

`debug`는 저장된 core와 실행 파일로 GDB를 띄웁니다. `--debugger-arguments`로 GDB 옵션을 넘기면 비대화형으로도 쓸 수 있습니다. `dump -o`는 압축을 풀어 일반 ELF core로 꺼냅니다.

```text
$ coredumpctl debug 2806 --debugger-arguments="-batch -ex bt"
...
Program terminated with signal SIGSEGV, Segmentation fault.
#0  main () at /root/c1/server.c:1
1	int main(void) { *(volatile int *)0 = 0; return 0; }
$ coredumpctl dump 2806 -o /root/c1/core.server
$ file /root/c1/core.server
/root/c1/core.server: ELF 64-bit LSB core file, ARM aarch64, version 1 (SYSV), SVR4-style, from '/usr/local/bin/server --config=prod.yaml', real uid: 0, effective uid: 0, real gid: 0, effective gid: 0, execfn: '/usr/local/bin/server', platform: 'aarch64'
```

`debug`가 debuginfo를 네트워크에서 받는지는 GDB의 debuginfod 설정이 정합니다([Ch 4](/blog/tools/debugging/postmortem/chapter04-debuginfod-minidump-automation)).

### Filter

`coredumpctl`의 위치 인자는 PID, 실행 파일 이름(COMM), 경로(EXE) 가운데 하나이고, `=`가 들어간 인자는 journal match로 넘어갑니다(`coredumpctl(1)`). 그래서 journal 필드 이름을 써야 하고, `PID=`·`COMM=` 같은 짧은 이름은 매치되지 않습니다.

| 명령 | 결과 |
| --- | --- |
| `coredumpctl list 2766` | 2766 한 줄 |
| `coredumpctl list server` | 세 줄 모두 |
| `coredumpctl list COREDUMP_PID=2766` | 2766 한 줄 |
| `coredumpctl list --since=-1h COREDUMP_UNIT=server.service` | 서비스로 죽은 2806 한 줄 |
| `coredumpctl list PID=2766`, `COMM=server`, `EXE=/usr/local/bin/server` | `No coredumps found.` |

## PR_SET_DUMPABLE

프로세스는 스스로 dumpable 상태를 끌 수 있습니다. 비밀번호나 키를 메모리에 들고 있는 프로그램이 이 방법으로 core에 비밀이 남는 것을 막습니다. 인자를 주면 dumpable을 끄고, 이어서 값 2를 시도한 뒤 죽는 프로그램입니다.

```c title="nodump.c"
#include <stdio.h>
#include <sys/prctl.h>

int main(int argc, char **argv) {
    if (argc > 1 && prctl(PR_SET_DUMPABLE, 0) == -1) return 1;
    printf("PR_GET_DUMPABLE=%d, set 2 -> %d\n",
           prctl(PR_GET_DUMPABLE), prctl(PR_SET_DUMPABLE, 2));
    fflush(stdout);
    *(volatile int *)0 = 0;
}
```

```text
$ ./nodump
PR_GET_DUMPABLE=1, set 2 -> -1
Segmentation fault (core dumped)
$ ./nodump off
PR_GET_DUMPABLE=0, set 2 -> -1
Segmentation fault
```

dumpable을 끈 쪽은 core가 없고, 값 2는 거부됐습니다(-1). `PR_SET_DUMPABLE(2const)`에 따르면 2는 Linux 2.6.13~2.6.17에서만 받았고 보안 문제로 빠졌습니다.

### suid_dumpable

setuid 프로그램을 실행하면 커널이 dumpable을 `fs.suid_dumpable` 값으로 바꿉니다. 일반 사용자 u1이 root 소유 setuid 프로그램(`/usr/local/bin/suidsegv`, mode 4755)을 실행해 세 조합을 비교했습니다. `/tmp`는 `nosuid`로 마운트되어 있어서 setuid 비트가 무시되므로 시험 파일은 `/usr/local/bin`에 뒀습니다.

| `suid_dumpable` | `core_pattern` | 결과 |
| --- | --- | --- |
| 0 | `core` | core 없음 |
| 2 | `core` (상대 경로) | core 없음, 커널 로그 "coredump: 2276(suidsegv): this process can only dump core to a fully qualified path, skipping core dump" |
| 2 | `/var/crash/core.%e.%p` | `core.suidsegv.2288` 생성, 소유자 root(그룹 u1), mode 0600 |

값 2(`suidsafe`)는 "root만 읽는 파일"이 아니라 "절대 경로나 파이프로만 dump 허용"입니다. 결과 파일이 root 소유가 되어 실행한 사용자가 읽지 못하는 것은 그 결과입니다. 상대 경로 패턴이 걸린 상태에서 값을 2로 바꾸면 커널이 먼저 경고합니다.

```text
coredump: 2027(bash): Unsafe core_pattern used with fs.suid_dumpable=2: pipe handler or fully qualified core dump path required. Set kernel.core_pattern before fs.suid_dumpable.
```

systemd-coredump 패키지는 `suid_dumpable=2`와 파이프 패턴을 같은 sysctl 파일에서 함께 켭니다. 파이프는 값 2의 조건을 만족하므로 setuid 프로그램의 core도 핸들러로 들어갑니다.

## coredump_filter — 영역 선택

core에 메모리를 전부 담을 필요는 없습니다. 실행 파일이나 공유 라이브러리처럼 디스크에 이미 있는 내용은 다시 구할 수 있기 때문입니다. `/proc/<pid>/coredump_filter`는 어떤 종류의 매핑을 담을지 고르는 비트마스크입니다. Debian 13 VM의 기본값은 `0x33`이었습니다.

```text
$ cat /proc/self/coredump_filter
00000033
```

`core(5)`의 비트 정의입니다.

| 비트 | 영역 |
|------|------|
| 0 | anonymous private (heap, stack, `malloc`) |
| 1 | anonymous shared |
| 2 | file-backed private (`.so`의 코드, `MAP_PRIVATE` 파일) |
| 3 | file-backed shared |
| 4 | ELF headers (Linux 2.6.24부터) |
| 5 | private huge pages (2.6.28부터) |
| 6 | shared huge pages (2.6.28부터) |
| 7 | private DAX pages (4.4부터) |
| 8 | shared DAX pages (4.4부터) |

기본 `0x33`은 비트 0, 1, 4, 5입니다. 비트 4는 `CONFIG_CORE_DUMP_DEFAULT_ELF_HEADERS`가 켜진 커널에서만 기본으로 켜집니다. `core(5)`는 MMIO 페이지는 항상 빠지고 vDSO는 항상 들어간다고 적습니다.

필터와 `madvise(MADV_DONTDUMP)`가 크기를 얼마나 바꾸는지 쟀습니다. 시험 프로그램은 anonymous 메모리를 N MiB 채우고, 256 MiB 파일을 `MAP_PRIVATE`로 매핑해 모두 읽은 뒤 `abort()`합니다.

| 필터 | anonymous | 옵션 | core 크기 |
| --- | --- | --- | --- |
| `0x33` | 64 MiB | | 67,395,584 B |
| `0x37` (비트 2 추가) | 64 MiB | | 337,743,872 B |
| `0x33` | 1024 MiB | | 1,074,028,544 B |
| `0x33` | 1024 MiB | `MADV_DONTDUMP` | 286,720 B |

비트 2를 켜자 읽어 둔 256 MiB 파일이 core에 그대로 들어왔습니다. 기본 필터가 큰 파일 매핑을 이미 빼고 있다는 뜻입니다. 반대로 heap에 올린 큰 캐시는 기본 필터에 걸리므로, 크기를 줄이려면 그 영역에 `MADV_DONTDUMP`를 걸어야 합니다.

### 실행 파일과 동시 설정

`core(5)`에 따르면 필터는 `fork()`로 상속되고 `execve()` 뒤에도 유지됩니다. 그래서 셸에서 값을 쓰고 프로그램을 `exec`하면 그 프로그램에 적용됩니다. 위 측정도 이렇게 했습니다.

```bash
sh -c 'echo 0x37 > /proc/self/coredump_filter; exec ./big 64 data.bin'
```

### systemd에서의 filter 설정

systemd 서비스는 `CoredumpFilter=`로 값을 줍니다(`systemd.exec(5)`). 이름이나 16진수를 공백으로 나열하고, `default`는 커널 기본값입니다. `CoredumpFilter=default private-file-backed`를 준 서비스의 `/proc/<pid>/coredump_filter`는 `00000037`이었습니다.

## 가장 흔한 함정 — 왜 core가 안 떨어지나

이 장에서 실제로 core가 안 생긴 경우를 순서대로 모았습니다.

1. 셸의 soft 한도가 0입니다(`ulimit -c`). Debian 13 기본 이미지가 이 상태입니다.
2. 서비스의 soft 한도가 0입니다(`systemctl show -p LimitCORESoft`). systemd-coredump가 없는 Debian 13의 기본입니다.
3. 파이프 핸들러가 받았지만 `%c`가 0이라 버렸습니다(`coredumpctl list`의 `none`과 journal).
4. 파일 방식 패턴이 쓸 수 없는 디렉터리를 가리킵니다.
5. 프로세스가 `PR_SET_DUMPABLE 0`이거나 setuid 실행 중이고 `suid_dumpable`이 막고 있습니다.
6. `core_pipe_limit`을 넘었습니다(`dmesg`의 "over core_pipe_limit").
7. 시그널이 Core 동작이 아니거나, 부모가 그 시그널을 무시하도록 물려줬습니다.

한도 하나만 바꿔 같은 프로그램을 죽이면 차이가 바로 보입니다.

```text
$ printf "int main(void) { *(volatile int *)0 = 0; return 0; }\n" > segv.c && gcc -g -o segv segv.c
$ bash -c "ulimit -c 0; ./segv"
/root/c1.sh: line 109:  2387 Segmentation fault      bash -c "ulimit -c 0; ./segv"
$ bash -c "ulimit -c unlimited; ./segv"
/root/c1.sh: line 110:  2388 Segmentation fault      (core dumped) bash -c "ulimit -c unlimited; ./segv"
```

`(core dumped)`가 붙어도 파일이 원하는 곳에 있다는 보장은 없습니다(앞의 4 KiB 예). 파이프 방식이면 셸은 언제나 `(core dumped)`를 찍고, 실제 저장 여부는 핸들러 쪽에서 봐야 합니다.

```bash
# 어디 떨어졌나
cat /proc/sys/kernel/core_pattern
ls -la core* 2>/dev/null
coredumpctl list --since=-5min
journalctl -b -t systemd-coredump | tail
dmesg | grep -i coredump
```

## ASan / TSan과 core

[Sanitizer](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)는 오류를 찾으면 보고서를 찍고 종료합니다. 기본 종료는 `_exit()`라서 core가 없습니다. GCC 14 libasan(`libasan8 14.2.0-19`)에 `ASAN_OPTIONS=help=1`을 주면 관련 옵션의 설명과 현재 값이 나옵니다.

```text
	disable_coredump
		- Disable core dumping. By default, disable_coredump=1 on 64-bit to avoid dumping a 16T+ core file. Ignored on OSes that don't dump core by default and for sanitizers that don't reserve lots of virtual memory. (Current Value: true)
	use_madv_dontdump
		- If set, instructs kernel to not store the (huge) shadow in core file. (Current Value: true)
	abort_on_error
		- If set, the tool calls abort() instead of _exit() after printing the error report. (Current Value: false)
```

use-after-free 한 줄짜리 프로그램(`gcc -g -fsanitize=address`)을 `ulimit -c unlimited`에서 옵션만 바꿔 돌렸습니다.

| `ASAN_OPTIONS` | 종료 코드 | core |
| --- | --- | --- |
| (없음) | 1 | 없음 |
| `abort_on_error=1` | 134 | 없음 |
| `abort_on_error=1:disable_coredump=0` | 134 | 48,123,904 B (실제 할당 6,760 KiB) |
| `abort_on_error=1:disable_coredump=0:use_madv_dontdump=0` | — | 120초 뒤에도 쓰는 중, 겉보기 7,138,235,662,336 B·디스크 84 KiB에서 강제 종료 |

core를 얻으려면 두 옵션이 다 필요합니다. libasan은 시작할 때 자기 프로세스의 soft core 한도를 0으로 내립니다. `ulimit -c unlimited` 셸에서 띄운 ASan 프로그램이 자기 `/proc/<pid>/limits`를 읽자 `Max core file size 0 unlimited`(soft 0, hard unlimited)였고, `disable_coredump=0`을 주면 `unlimited unlimited`로 남았습니다. 그런데 `disable_coredump=0`만 주면 보고서 뒤 `_exit(1)`로 끝나 시그널이 없으므로 core도 없습니다. `abort_on_error=1`이 SIGABRT를 내야 합니다.

### ASan shadow 메모리

ASan은 응용 메모리 8바이트마다 shadow 1바이트를 둡니다. 64비트에서는 shadow용 가상 주소를 테라바이트 단위로 예약하고, 기본값 `use_madv_dontdump=1`이 이 영역에 `MADV_DONTDUMP`를 걸어 core에서 뺍니다. 이 옵션을 끄자 커널이 예약 영역 전체를 core에 쓰기 시작했고, 120초가 지나도 끝나지 않았습니다. 그 시점에 디스크에 실제로 쓰인 것은 84 KiB였지만 파일의 겉보기 크기는 7.1 TB였습니다. `use_madv_dontdump=0`은 shadow를 core에서 꼭 봐야 하는 경우가 아니면 켜지 않습니다.

## 코어 생성에 시간

core를 쓰는 동안 프로세스는 회수되지 않고, systemd는 서비스를 재시작하지 않습니다. 큰 프로세스일수록 이 시간이 서비스 중단 시간에 더해집니다. anonymous 메모리 2 GiB를 채우고 `abort()`하는 프로그램을 ext4 루트에 core를 쓰게 해서 쟀습니다.

| 필터 | core 크기 | 실행 전체 시간 |
| --- | --- | --- |
| `0x00` | 24,576 B | 0.23 s, 0.09 s, 0.10 s |
| `0x33` | 2,147,770,368 B | 5.28 s, 3.59 s, 1.63 s |

두 필터를 번갈아 세 번씩 실행했습니다. 시간에는 메모리를 채우는 시간이 들어 있으므로 `0x00` 행이 기준선입니다. 이 VM에서 2 GiB core를 쓰는 데 기준선보다 1.5~5.1초가 더 들었고, 실행마다 차이가 컸습니다. 디스크가 느리거나 파이프 핸들러가 압축까지 하면 더 길어집니다.

줄이는 방법은 세 가지입니다.

- **gcore** — 살아 있는 프로세스를 잠깐 멈추고 core를 뜹니다. RSS 1 GiB 프로세스에 `gcore`를 걸자 2.12초 걸렸고, 10 ms마다 깨는 루프가 본 최대 공백은 1.808초였습니다. 그만큼 프로세스가 멈췄습니다.

  ```text
  $ gcore -o /root/c1/gc $pid
  Saved corefile /root/c1/gc.2456
  [Inferior 1 (process 2456) detached]
  $ ls -l gc.2456
  -rw-r--r-- 1 root root 1076008496 Nov 16 05:49 gc.2456
  ```

- **파이프 핸들러에서 압축** — systemd-coredump가 286,720바이트를 16 KiB로 줄인 것처럼, 디스크에 쓰는 양을 줄입니다.
- **필터와 `MADV_DONTDUMP`** — 앞 절의 표처럼 필요 없는 영역을 처음부터 뺍니다.

## fork된 자식의 core

자식만 죽으면 core는 자식 PID로 생기고 부모는 계속 돕니다. 부모가 `waitpid()`로 받는 상태에도 core 비트가 실립니다.

```c title="forkcrash.c"
#include <stdio.h>
#include <sys/wait.h>
#include <unistd.h>

int main(void) {
    pid_t pid = fork();
    if (pid == 0) {
        *(volatile int *)0 = 0;   /* only the child dies */
    }
    int st;
    waitpid(pid, &st, 0);
    printf("parent %d: child %d signaled=%d sig=%d core=%d\n", getpid(), pid,
           WIFSIGNALED(st), WTERMSIG(st), WCOREDUMP(st));
    return 0;
}
```

```text
$ ./forkcrash
parent 2640: child 2641 signaled=1 sig=11 core=128
$ ls core.*
core.2641
$ gdb -q -batch -ex bt ./forkcrash core.2641
#0  main () at forkcrash.c:8
8	        *(volatile int *)0 = 0;   /* only the child dies */
```

`WCOREDUMP`는 0이 아닌 값(여기서는 128)이면 참입니다. 자식의 core에는 `fork()` 시점에 복사된 부모의 메모리가 들어 있으므로, 콜스택이 부모와 같은 `main`에서 출발합니다.

## 정리

- core는 Core 동작 시그널, dumpable 상태, 한도, `core_pattern` 네 가지를 모두 통과해야 생깁니다.
- 파일 방식은 `RLIMIT_CORE`를 따르고 파이프 방식은 따르지 않습니다. 대신 systemd-coredump는 `%c`가 0이면 버립니다.
- PID namespace 안의 프로세스는 `%p`와 `%P`가 다르고, 핸들러는 `%P`로 `/proc`을 찾습니다. `core_pattern`은 커널 전체에 하나입니다.
- `core_pipe_limit`이 0이면 핸들러가 `/proc/<pid>`를 읽을 수 없고, 1 이상이면 한도를 넘는 dump가 버려집니다.
- Debian 13에서 `systemd-coredump` 설치는 core_pattern·core_pipe_limit(16)·suid_dumpable(2)·기본 core 한도를 한꺼번에 바꿉니다.
- 기본 필터 `0x33`은 파일 매핑을 빼고 heap은 담습니다. heap의 큰 영역은 `MADV_DONTDUMP`로 뺍니다.
- ASan 프로그램의 core에는 `abort_on_error=1`과 `disable_coredump=0`이 둘 다 필요합니다.
- 큰 프로세스의 core는 쓰는 시간만큼 재시작을 늦춥니다. `gcore`도 RSS 1 GiB 프로세스를 1.8초 멈췄습니다.

## 다음 장 예고

Ch 2에서는 이렇게 만들어진 ELF core 파일을 열어 봅니다. PT_NOTE 안의 NT_PRSTATUS, NT_FILE, NT_SIGINFO가 무엇을 담는지 같은 core로 따라갑니다.

## 관련 항목

- [Ch 2: ELF core 포맷](/blog/tools/debugging/postmortem/chapter02-elf-core-format)
- [Ch 3: GDB로 Core 분석](/blog/tools/debugging/postmortem/chapter03-gdb-core-analysis)
- [Sanitizers Ch 2: ASan·UBSan](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)
- [`core(5)`](https://man7.org/linux/man-pages/man5/core.5.html), [`signal(7)`](https://man7.org/linux/man-pages/man7/signal.7.html), [`PR_SET_DUMPABLE(2const)`](https://man7.org/linux/man-pages/man2/PR_SET_DUMPABLE.2const.html)
- [`coredump.conf(5)`](https://www.freedesktop.org/software/systemd/man/latest/coredump.conf.html), [`coredumpctl(1)`](https://www.freedesktop.org/software/systemd/man/latest/coredumpctl.html), [`systemd.exec(5)` CoredumpFilter=](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html#CoredumpFilter=)
- [Linux 6.12 kernel sysctl 문서: core_pattern](https://docs.kernel.org/6.12/admin-guide/sysctl/kernel.html#core-pattern), [suid_dumpable](https://docs.kernel.org/6.12/admin-guide/sysctl/fs.html#suid-dumpable)
