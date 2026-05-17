---
title: "Ch 4: debuginfod / Minidump / 자동화"
date: 2025-09-05T04:00:00
description: "build-id로 자동 debuginfo 매칭, Breakpad/crashpad minidump, CI 자동 사후 분석."
tags: [debuginfod, minidump, breakpad, sentry, automation, postmortem]
series: "Postmortem Debugging"
seriesOrder: 4
draft: false
---

대규모 운영 환경에선 core dump 분석을 *수동*으로 할 수 없습니다. 사고가 *하루에 수십*. 이 시리즈의 마지막 장은 *자동화* — build-id로 debuginfo 자동 다운로드, Breakpad/crashpad minidump 워크플로, Sentry 같은 SaaS, 그리고 CI에서 자동 사후 분석.

:::tldr
build-id가 *바이너리 정체성*. debuginfod가 *네트워크 자동 매칭*. minidump가 *클라이언트 분포 표준*. Sentry/Crashlytics가 SaaS dashboard.
:::

## Build-ID — 정체성

ELF 빌드 시 링커가 *해시*로 만든 32바이트 (SHA-1 기본). 같은 *바이트별로 같은 빌드*면 같은 ID.

```bash
$ readelf -n /usr/bin/myapp | grep "Build ID"
    Build ID: 8d3a91f0e5a3b2c1d4e6...
```

```bash
# 명시 설정
$ ld --build-id=sha1 ...       # SHA-1 (기본)
$ ld --build-id=md5 ...
$ ld --build-id=uuid ...       # 무작위 UUID
$ ld --build-id=0xdeadbeef     # 명시 값
```

대부분의 빌드 시스템(CMake, Meson, autotools)이 자동으로 `--build-id` 켭니다.

core 안에도 *프로세스 실행 파일의 build-id*가 저장 — 디버거가 *맞는 debuginfo*를 찾는 핵심.

## 별도 debuginfo

배포 빌드는 보통 *stripped + 별도 debuginfo*.

```bash
$ objcopy --only-keep-debug myapp myapp.debug
$ strip --strip-debug myapp
$ objcopy --add-gnu-debuglink=myapp.debug myapp
```

GDB가 `myapp`를 열 때 `myapp.debug`를 함께 찾음. *세 가지 검색 경로*.

1. `myapp`와 *같은 디렉터리*.
2. *글로벌 debug 디렉터리*: `/usr/lib/debug/<path>`.
3. *build-id 디렉터리*: `/usr/lib/debug/.build-id/<XX>/<YY...>.debug`.

```text
(gdb) show debug-file-directory
The directory where separate debug symbols are searched for is "/usr/lib/debug".

(gdb) set debug-file-directory /opt/symbols:/usr/lib/debug
```

여러 경로를 콜론으로.

## Build-ID 디렉터리 구조

```
/usr/lib/debug/.build-id/
├── 8d/
│   ├── 3a91f0e5a3b2c1d4e6.....debug    # myapp
│   └── ce8b7f2a4d3e1c9b0f.....debug    # libfoo.so
├── 4f/
│   └── 5a2b...debug
└── ...
```

첫 2글자가 디렉터리, 나머지가 파일명. 효율적인 lookup.

```bash
$ build_id=$(readelf -n /usr/bin/myapp | awk '/Build ID/ {print $3}')
$ ls /usr/lib/debug/.build-id/${build_id:0:2}/${build_id:2}.debug
```

배포판은 `<package>-debuginfo` 또는 `<package>-dbgsym` 패키지로 이 구조를 제공.

```bash
# Fedora
$ sudo dnf install glibc-debuginfo libstdc++-debuginfo

# Ubuntu
$ sudo apt install glibc-dbgsym libstdc++6-dbgsym

# 또는 debuginfod로 자동 (아래)
```

## debuginfod — 네트워크 자동 다운로드

build-id로 *HTTP*로 debuginfo 가져오는 표준 서비스.

![Build-ID 매칭 + debuginfod 자동 다운로드 흐름](/images/blog/tools/diagrams/build-id-matching.svg)

```bash
$ export DEBUGINFOD_URLS="https://debuginfod.fedoraproject.org/"

# 자동 동작
$ gdb /usr/bin/foo /var/crash/core.foo.123
Downloading separate debug info for /usr/bin/foo... done
[...심볼 자동 로드 + 정상 디버깅...]
```

내부 동작 — HTTP GET `https://server/buildid/<id>/debuginfo`. *부분 다운로드* (Range)로 매우 큰 debuginfo도 효율적.

### 캐시

```bash
$ ls ~/.cache/debuginfod_client/
$ du -sh ~/.cache/debuginfod_client/
```

기본 1 GB 한도. 자주 쓰는 debuginfo는 캐싱.

```bash
$ export DEBUGINFOD_CACHE_PATH=/big/path/cache
$ export DEBUGINFOD_MAXSIZE=10G
```

### 알려진 서버

| 서버 | URL | 커버 |
|------|-----|------|
| Fedora | https://debuginfod.fedoraproject.org/ | Fedora, RHEL, CentOS |
| Ubuntu | https://debuginfod.ubuntu.com/ | Ubuntu |
| Debian | https://debuginfod.debian.net/ | Debian |
| Arch | https://debuginfod.archlinux.org/ | Arch |
| elfutils | https://debuginfod.elfutils.org/ | 모음 |

여러 URL을 동시 (공백 구분).

```bash
$ export DEBUGINFOD_URLS="https://debuginfod.fedoraproject.org/ https://debuginfod.elfutils.org/"
```

### 사내 debuginfod

자체 CI 빌드를 사내 서버에 인덱싱.

```bash
$ debuginfod -F /opt/builds -d /var/cache/debuginfod -p 8002 /opt/builds
```

- `-F` — 인덱싱할 디렉터리.
- `-d` — 캐시 DB.
- `-p` — 리슨 포트.

운영 머신에서.

```bash
$ export DEBUGINFOD_URLS="http://debuginfod.internal.example.com:8002/"
```

*모든 사고*에 자동 debuginfo 매칭. *대규모 운영의 game changer*.

### debuginfod-find 직접

```bash
$ debuginfod-find debuginfo /usr/bin/foo
/home/me/.cache/debuginfod_client/<build-id>/debuginfo

$ debuginfod-find executable BUILDID
$ debuginfod-find source BUILDID /path/to/file.c
```

GDB 외 다른 도구(systemtap, perf, pprof)도 같은 라이브러리(`libdebuginfod`) 사용.

## 자동 사후 분석 — 한 스크립트

```bash
#!/usr/bin/env bash
# postmortem.sh — core dump 자동 분석

set -e

CORE=$1
EXE=$(file "$CORE" | awk -F"'" '{print $2}')

# build-id 추출
BUILD_ID=$(readelf -n "$CORE" 2>/dev/null | awk '/Build ID/ {print $3}' | head -1)
echo "Executable: $EXE"
echo "Build ID:   $BUILD_ID"

# debuginfo 자동 다운로드 + GDB 분석
export DEBUGINFOD_URLS="http://debuginfod.internal:8002/ https://debuginfod.elfutils.org/"

gdb -batch \
    -ex 'set pagination off' \
    -ex 'set print pretty on' \
    -ex 'set print elements 100' \
    -ex 'echo \n=== Death info ===\n' \
    -ex 'print $_siginfo' \
    -ex 'echo \n=== Backtrace ===\n' \
    -ex 'bt full' \
    -ex 'echo \n=== All threads ===\n' \
    -ex 'thread apply all bt' \
    -ex 'echo \n=== Loaded libs ===\n' \
    -ex 'info shared' \
    -ex 'echo \n=== Registers ===\n' \
    -ex 'info registers' \
    "$EXE" "$CORE" 2>&1
```

```bash
$ ./postmortem.sh /var/crash/core.myapp.1234 > /tmp/report.txt
```

CI에서 *PR에 segfault* 자동 검출 시 이 스크립트 실행 → 코멘트로 콜스택 첨부.

## minidump — 클라이언트 분포

Chrome·Firefox·Steam 게임·VLC가 *수억 사용자*에게 배포. 사용자 머신에서 *전체 core dump* (수 GB)는 비현실적. **minidump**는 *축약된* 형태.

### Breakpad / crashpad

[Google Breakpad](https://chromium.googlesource.com/breakpad/breakpad/)와 후속 [crashpad](https://chromium.googlesource.com/crashpad/crashpad). 크로스 플랫폼 (Win/Mac/Linux).

```c
// 앱 진입에 한 줄
#include "client/linux/handler/exception_handler.h"
google_breakpad::ExceptionHandler eh(...);
// 이후 크래시 시 minidump 자동 생성
```

minidump 파일 (`.dmp`) 구조:

- *Header* + 다수 *Streams*.
- Streams: ThreadList, ModuleList, MemoryList, SystemInfo, ExceptionInfo, ...
- 콜스택의 *주변 메모리만* (스택 + 일부 힙).
- *모듈 목록* (어떤 .so/.dll이 로드됐는지).

크기: 보통 *수 MB*. core의 1/1000.

### symbol server

minidump 분석은 *symbol 서버*가 필요. 빌드 시 `dump_syms`로 *.sym* 파일 생성:

```bash
$ dump_syms ./myapp > myapp.sym
$ head -3 myapp.sym
MODULE Linux x86_64 8D3A91F0E5A3B2C1D4E6... myapp
FILE 0 /home/me/main.cpp
FUNC 1234 50 0 main
```

이 `.sym`을 *symbol 서버*에 모듈 ID별로 저장.

### Stack walking

```bash
$ minidump_stackwalk crash.dmp ./symbols/
Module 0:
  /home/me/myapp + 0x1234 [myapp + 0x1234]
  main + 0x10 [main.cpp:42]
  ...

Thread 0 (crashed):
  0x... [myapp + 0x1234]: process_request
  ...
```

stackwalker가 *minidump + symbol*로 콜스택 재구성. 일반 GDB 대신 *전용 도구*.

## Sentry / Crashlytics

상용 SaaS — minidump + symbol 서버 + dashboard.

![Sentry / Crashlytics pipeline — client → server → stackwalker + aggregation → dashboard](/images/blog/postmortem/diagrams/ch04-sentry-pipeline.svg)

기능:

- 동일 콜스택 *그룹화*.
- 사용자 영향 *통계*.
- regression 검출 (새 버전에서 증가).
- 정확한 빌드와 디버그 정보 매칭.
- Slack/email 알림.

비용 — 트래픽 기준. 큰 게임은 *월 수천 달러*.

### Sentry 자체 호스팅

상용이지만 *self-hosted* 무료 옵션. Docker compose로 배포.

```bash
$ git clone https://github.com/getsentry/self-hosted
$ cd self-hosted && ./install.sh
```

운영 환경 자체 사용에 좋음.

## 자체 Sentry 비슷한 도구 — Backtrace, Bugsnag

다양한 상용. minidump 외에도 *언어 native* (Python tracebacks, JavaScript stacks).

## ASan / TSan과 core

[Sanitizer](/blog/tools/debugging/sanitizers/chapter02-asan-ubsan)는 *검출 시 진단 + abort()*. SIGABRT가 core 생성.

```bash
$ ASAN_OPTIONS="abort_on_error=1:disable_coredump=0" ./prog
```

- `abort_on_error=1` — `_exit` 대신 `abort()`.
- `disable_coredump=0` — ASan이 `RLIMIT_CORE=0` 안 함.

core 안에 *ASan shadow 메모리*도 포함하려면.

```bash
$ ASAN_OPTIONS="abort_on_error=1:disable_coredump=0:coredump_dump_full_shadow=1" ./prog
```

shadow가 *원본 1/8*이라 큰 프로세스면 core가 *매우 큼*.

ASan 진단은 보통 *abort 직전 stderr*에 출력. core에선 추가 메모리 정보만.

## gcore — 살아 있는 프로세스

운영 서비스가 *느려졌지만 안 죽었을 때*. gcore로 *snapshot*.

```bash
$ sudo gcore -o /tmp/core <pid>
[프로세스 일시 정지, core dump, 재개]
$ ls /tmp/core.<pid>
```

이 core는 *진짜 사망* core와 같은 포맷. 일반 GDB로 분석.

`gcore`가 내부적으로 GDB attach + memory dump + detach. 큰 프로세스면 *수초* 정지.

대안: BPF로 동적 stack trace, 또는 `eu-stack`.

```bash
$ eu-stack -p <pid>
[모든 스레드 콜스택, 매우 가벼움]
```

## 자동화 — CI / Production

### CI

```yaml
# .github/workflows/test.yml
- name: Run tests
  run: |
    ulimit -c unlimited
    ./test_runner || true     # 항상 통과 (다음 step에서 분석)

- name: Analyze cores
  if: failure()
  run: |
    for core in core.*; do
      echo "=== $core ==="
      gdb -batch -ex 'bt' -ex 'thread apply all bt' \
          ./test_runner "$core"
    done
```

테스트가 죽으면 자동으로 콜스택 분석 → PR 코멘트.

### Production

```bash
# /etc/systemd/system/postmortem.service
[Unit]
Description=Postmortem analyzer

[Service]
Type=oneshot
ExecStart=/usr/local/bin/analyze-cores.sh

# /etc/systemd/system/postmortem.path
[Path]
PathChanged=/var/lib/systemd/coredump
Unit=postmortem.service

[Install]
WantedBy=multi-user.target
```

새 core 떨어질 때마다 자동 분석 + 결과 *Slack/이메일* 전송.

### 자체 알람

```python
# analyze-and-alert.py
import gdb, subprocess, json, requests

def analyze_core(core_path, exe_path):
    gdb.execute(f"file {exe_path}", to_string=True)
    gdb.execute(f"core-file {core_path}", to_string=True)
    
    # 콜스택
    bt = gdb.execute("bt", to_string=True)
    
    # 시그널
    siginfo = gdb.execute("print $_siginfo", to_string=True)
    
    # 콜스택 해시로 그룹화
    sig = "|".join(frame.split()[1:3] for frame in bt.split("\n") if frame.strip())
    
    # Slack 전송
    requests.post("https://hooks.slack.com/...", json={
        "text": f"Core dump:\n```\n{bt}\n```\nSignal:\n{siginfo}",
        "thread_ts": signature_to_ts.get(sig)  # 같은 콜스택은 같은 thread
    })

analyze_core(...)
```

## 자체 분석 — pyelftools

GDB 없이도 Python으로 core 분석.

```python
from elftools.elf.elffile import ELFFile

with open('core', 'rb') as f:
    elf = ELFFile(f)
    for seg in elf.iter_segments():
        if seg.header.p_type == 'PT_NOTE':
            for note in seg.iter_notes():
                if note.n_type == 'NT_PRSTATUS':
                    # 레지스터 추출
                    pr = note.n_desc
                    pid = struct.unpack_from('i', pr, ...)[0]
                    ...
                elif note.n_type == 'NT_FILE':
                    # 매핑된 파일 목록
                    ...
        elif seg.header.p_type == 'PT_LOAD':
            # 메모리 영역
            data = seg.data()
            ...
```

대규모 분석 (수천 core)에서 GDB 띄우기보다 빠름.

## 시리즈 정리

4장으로 *core dump의 전체 생명주기*를 다뤘습니다.

- **Ch 1** Core 생성 메커니즘 — ulimit, core_pattern, systemd-coredump.
- **Ch 2** ELF core 포맷 — PT_NOTE, NT_PRSTATUS, NT_FILE.
- **Ch 3** GDB로 core 분석 — 8가지 패턴, siginfo, 변수 검사.
- **Ch 4** (이 장) 자동화 — debuginfod, minidump, Sentry.

*사고 분석의 표준 운영*:

1. `LimitCORE=infinity` + `core_pattern`.
2. CI에서 stripped 빌드 + 별도 debuginfo.
3. 사내 debuginfod 서버에 인덱싱.
4. 사고 시 `coredumpctl debug` 또는 자동 스크립트.
5. 콜스택 해시로 *동일 사고 그룹화*.
6. 대규모 클라이언트는 minidump + Sentry.

## 관련 항목 (시리즈 전체)

- [Ch 1: core 생성](/blog/tools/debugging/postmortem/chapter01-core-generation)
- [Ch 2: ELF core 포맷](/blog/tools/debugging/postmortem/chapter02-elf-core-format)
- [Ch 3: GDB로 core 분석](/blog/tools/debugging/postmortem/chapter03-gdb-core-analysis)

## 외부 자료

- [debuginfod 공식](https://sourceware.org/elfutils/Debuginfod.html)
- [Fedora debuginfod](https://debuginfod.fedoraproject.org/)
- [Google Breakpad](https://chromium.googlesource.com/breakpad/breakpad/)
- [crashpad](https://chromium.googlesource.com/crashpad/crashpad/)
- [Sentry](https://sentry.io/)
- [DWARF and ELF Internals — Ch 6: debuginfod](/blog/tools/debugging/dwarf-elf/chapter06-split-dwarf-tools)
- [Concurrency Debugging](/blog/tools/debugging/concurrency/chapter01-linux-threads-futex)
- [Embedded Debugging](/blog/tools/debugging/embedded/chapter01-rsp-protocol)
- [GDB Extension and IDE](/blog/tools/debugging/gdb-extension/chapter01-python-api-basics)
