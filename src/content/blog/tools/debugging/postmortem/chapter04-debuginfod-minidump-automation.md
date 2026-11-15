---
title: "포스트모템 자동화 — debuginfod·Minidump 파이프라인"
slug: "tools/debugging/postmortem/chapter04-debuginfod-minidump-automation"
date: 2026-06-01T09:04:00
description: "build-id 기반 debuginfo 조회 설정, Breakpad/crashpad minidump, CI 사후 분석 자동화."
tags: [debuginfod, minidump, breakpad, sentry, automation, postmortem]
series: "Postmortem Debugging"
seriesOrder: 4
draft: false
topics: ["tools", "tools/debugging"]
---

대규모 운영 환경에서는 반복되는 core dump 분석을 자동화할 수 있습니다. 이 장에서는 build-id 기반 debuginfo 조회, Breakpad/crashpad minidump 워크플로, Sentry 같은 서비스, CI 사후 분석을 다룹니다. GDB의 debuginfod 조회는 사용 가능한 서버와 설정에 따라 달라집니다.

:::tldr
build-id는 ELF 산출물 식별에 쓰이며, debuginfod는 build-id를 사용해 네트워크에서 파일을 조회합니다. minidump는 클라이언트 측 crash 수집에 쓰이는 여러 형식 중 하나입니다.
:::

## Build-ID — 정체성

ELF 링커는 build-id를 만들 수 있습니다. GNU ld의 기본 SHA-1 형식은 20바이트이며, 옵션에 따라 UUID나 명시한 값을 사용할 수도 있습니다. build-id는 체크섬 검증값이 아니며, 같은 입력에 대한 재현성은 빌드 도구와 옵션에 달렸습니다. [GNU ld 문서](https://sourceware.org/binutils/docs/ld/Options.html).

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

빌드 시스템의 linker 기본값과 프로젝트 설정에 따라 build-id가 포함되지 않을 수 있습니다. 산출물에서 `readelf -n` 또는 `llvm-readelf -n`으로 확인합니다.

core에 실행 파일의 build-id가 항상 저장되는 것은 아닙니다. 디버거는 core의 매핑 정보와 실행 파일, 별도 debug 파일의 build-id 등 이용 가능한 정보로 대상을 찾습니다. [GDB separate debug files](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Separate-Debug-Files.html).

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

```text
/usr/lib/debug/.build-id/
├── 8d/
│   ├── 3a91f0e5a3b2c1d4e6.....debug    # myapp
│   └── ce8b7f2a4d3e1c9b0f.....debug    # libfoo.so
├── 4f/
│   └── 5a2b...debug
└── ...
```

첫 2글자가 디렉터리, 나머지가 파일명. 효율적인 lookup.

```bash title="inspect-build-id.sh"
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

```bash title="debuginfod-gdb.sh"
$ export DEBUGINFOD_URLS="https://debuginfod.fedoraproject.org/"

# 비대화형 GDB에서는 debuginfod를 명시적으로 활성화
$ gdb -q -batch -ex 'set debuginfod enabled on' \
    -ex 'bt' /usr/bin/foo /var/crash/core.foo.123
Downloading separate debug info for /usr/bin/foo... done
[...심볼 자동 로드 + 정상 디버깅...]
```

GDB 설정의 `set debuginfod enabled`는 대화형 여부에 따라 기본 동작이 다릅니다. 비대화형 실행에서는 필요한 경우 명시적으로 활성화하고, 신뢰할 수 있는 `DEBUGINFOD_URLS`만 사용합니다. [GDB debuginfod 설정](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Debuginfod-Settings.html). 서버는 build-id를 사용해 ELF, debuginfo, source 파일을 제공합니다. 자세한 프로토콜과 지원 범위는 [elfutils 문서](https://sourceware.org/elfutils/Debuginfod.html)를 확인하세요.

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

```bash title="start-debuginfod.sh"
$ debuginfod -F /opt/builds -d /var/cache/debuginfod -p 8002 /opt/builds
```

- `-F` — ELF/DWARF 파일도 스캔하도록 활성화.
- `-d` — 데이터베이스 경로.
- `-p` — 리슨 포트.
- `/opt/builds` — 스캔할 경로.

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

```bash title="postmortem.sh"
#!/usr/bin/env bash
# postmortem.sh — core dump 자동 분석

set -euo pipefail

if [[ $# -ne 2 ]]; then
    echo "usage: $0 EXECUTABLE CORE" >&2
    exit 2
fi
EXE=$1
CORE=$2
[[ -r "$EXE" && -r "$CORE" ]] || { echo "executable/core not readable" >&2; exit 2; }

# debuginfo 자동 다운로드 + GDB 분석
export DEBUGINFOD_URLS="http://debuginfod.internal:8002/ https://debuginfod.elfutils.org/"

gdb -batch \
    -ex 'set debuginfod enabled on' \
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

```bash title="run-postmortem.sh"
$ ./postmortem.sh /usr/local/bin/myapp /var/crash/core.myapp.1234 > /tmp/report.txt
```

이 스크립트는 명시한 실행 파일과 core를 GDB에 전달합니다. `-batch`는 GDB 명령을 실행하고 종료하며 inferior를 실행하지 않습니다. 실행 파일이 core와 일치하는지, debuginfod URL과 별도 심볼을 신뢰하는지는 운영자가 확인해야 합니다.

## minidump — 클라이언트 분포

클라이언트 프로그램은 여러 운영체제와 환경에서 crash 정보를 수집해야 할 수 있습니다. **minidump**는 전체 프로세스 core와 다른 선택적 자료 형식이며, 수집되는 정보와 크기는 플랫폼·설정·제품에 따라 달라집니다.

### Breakpad / crashpad

[Google Breakpad](https://chromium.googlesource.com/breakpad/breakpad/)와 후속 [crashpad](https://chromium.googlesource.com/crashpad/crashpad). 크로스 플랫폼 (Win/Mac/Linux).

```c title="breakpad-handler-illustrative.cc"
// 개념 예시: 실제 생성자는 Breakpad/crashpad 버전과 앱의 업로드 흐름에 맞춰 구성해야 합니다.
// 앱 진입에 한 줄
#include "client/linux/handler/exception_handler.h"
google_breakpad::ExceptionHandler eh(...);
// 이후 크래시 시 minidump 자동 생성
```

minidump 파일 (`.dmp`) 구조:

- *Header* + 다수 *Streams*.
- Streams: ThreadList, ModuleList, MemoryList, SystemInfo, ExceptionInfo, ...
- 설정에 따라 선택된 스레드·모듈·메모리 범위.
- *모듈 목록* (어떤 .so/.dll이 로드됐는지).

minidump의 크기와 포함 정보는 수집 설정과 프로세스 상태에 따라 달라집니다. 실제 배포 전에 산출물 크기와 민감 정보 포함 여부를 측정해야 합니다.

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

- `abort_on_error=1` — sanitizer runtime의 오류 종료 동작을 조정합니다.
- `disable_coredump=0` — 해당 runtime의 core dump 억제를 끕니다. 커널 설정, 권한, `RLIMIT_CORE` 등도 충족해야 core가 생성됩니다.

ASan shadow 영역의 core 수록 여부는 runtime과 커널 설정에 달립니다. 일부 sanitizer runtime은 `use_madv_dontdump`로 shadow를 제외하도록 요청할 수 있습니다. 아래 옵션은 모든 버전에서 지원된다고 가정하지 마세요.

```bash
$ ASAN_OPTIONS="abort_on_error=1:disable_coredump=0:use_madv_dontdump=0" ./prog
```

shadow 수록은 core 크기를 크게 늘릴 수 있으므로 배포된 sanitizer runtime의 옵션을 확인하고 제한된 테스트 환경에서 확인합니다. [Sanitizer common flags](https://github.com/google/sanitizers/wiki/SanitizerCommonFlags).

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

```yaml title="test.yml"
# .github/workflows/test.yml
- name: Run tests
  run: |
    ulimit -c unlimited
    ./test_runner

- name: Analyze cores
  if: always()
  run: |
    shopt -s nullglob
    for core in core.*; do
      echo "=== $core ==="
      gdb -batch -ex 'bt' -ex 'thread apply all bt' \
          ./test_runner "$core"
    done
```

`failure()`는 이전 step이 실패했을 때만 실행됩니다. 분석 step을 `always()`로 두면 테스트 실패 뒤에도 분석이 실행되고, 앞 step의 실패 상태는 workflow에 남습니다. 이 예시는 runner가 `core.*` 파일을 생성하도록 구성된 경우에만 동작합니다. [GitHub Actions status functions](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions).

### Production

```ini title="postmortem-systemd-units.ini"
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

새 파일 변경을 감지해 analyzer를 호출하는 구성 예입니다. Slack·이메일 전송은 `analyze-cores.sh`나 별도 notifier에서 구현해야 합니다.

### 자체 분석 함수 — GDB Python

```python title="analyze-and-alert.py"
# analyze-and-alert.py
import gdb
import json

def analyze_core(core_path, exe_path):
    gdb.execute(f"file {exe_path}", to_string=True)
    gdb.execute(f"core-file {core_path}", to_string=True)
    
    # 콜스택
    bt = gdb.execute("bt", to_string=True)
    
    # 시그널
    siginfo = gdb.execute("print $_siginfo", to_string=True)
    
    # 콜스택 해시로 그룹화
    frames = [frame.split()[1:3] for frame in bt.split("\n") if frame.strip()]
    sig = "|".join(" ".join(parts) for parts in frames)
    
    # 실제 전송은 인증·재시도·개인정보 정책을 갖춘 별도 notifier에 맡깁니다.
    print(json.dumps({"signature": sig, "signal": siginfo, "backtrace": bt}))

# GDB Python 콘솔에서 analyze_core(core_path, exe_path)를 호출합니다.
```

## 자체 분석 — pyelftools

GDB 없이도 Python으로 core 분석.

```python title="core-notes.py"
import sys
from elftools.elf.elffile import ELFFile

with open(sys.argv[1], 'rb') as f:
    elf = ELFFile(f)
    for seg in elf.iter_segments():
        if seg.header.p_type == 'PT_NOTE':
            for note in seg.iter_notes():
                if note['n_type'] in ('NT_PRSTATUS', 'NT_FILE', 'NT_AUXV'):
                    print(note['n_type'], 'name=', note['n_name'],
                          'description-bytes=', note['n_descsz'])
```

이 예시는 note 이름과 description 길이만 열거합니다. 레지스터와 NT_FILE의 의미를 디코딩하려면 ELF class, endianness, 아키텍처별 ABI 처리가 추가로 필요합니다. 많은 core를 처리할 때 성능 이점이 있는지는 입력과 작업을 측정해 판단합니다.

## 시리즈 정리

앞의 네 장에서 core dump 분석 흐름을 다뤘습니다. 이 시리즈에는 뒤이어 CXL 디바이스와 fabric postmortem 장도 있습니다.

- **Ch 1** Core 생성 메커니즘 — ulimit, core_pattern, systemd-coredump.
- **Ch 2** ELF core 포맷 — PT_NOTE, NT_PRSTATUS, NT_FILE.
- **Ch 3** GDB로 core 분석 — 8가지 패턴, siginfo, 변수 검사.
- **Ch 4** (이 장) 자동화 — debuginfod, minidump, CI.
- **Ch 5–6** CXL 디바이스와 fabric 사례.

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
- Concurrency Debugging
- [Embedded Debugging](/blog/tools/debugging/embedded/chapter01-rsp-protocol)
- [GDB Extension and IDE](/blog/tools/debugging/gdb-extension/chapter01-python-api-basics)
