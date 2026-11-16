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

[Ch 3](/blog/tools/debugging/postmortem/chapter03-gdb-core-analysis)의 콜스택에는 `??`가 많았습니다. 시스템 라이브러리의 debuginfo가 없었기 때문입니다. core가 하루에 몇 개씩 쌓이는 환경이라면 사람이 매번 맞는 debuginfo를 찾아 붙일 수 없습니다. 이 장은 그 일을 기계에 넘깁니다. build-id로 debuginfo를 찾는 규칙, 네트워크에서 받아 오는 debuginfod, 클라이언트용 minidump, 그리고 core가 생기면 자동으로 분석하는 CI·운영 구성을 다룹니다.

모든 실행은 Debian 13.7 arm64 QEMU VM(커널 6.12.116, GDB 16.3, binutils 2.44, elfutils 0.192)에서 했습니다.

:::tldr
build-id는 링커가 산출물에 넣는 식별자이고, GDB와 debuginfod는 이 값으로 debuginfo를 찾습니다. Debian 13은 debuginfod 클라이언트를 기본으로 꺼 두며, GDB batch 모드에서는 `-ex`가 아니라 `-iex 'set debuginfod enabled on'`이어야 다운로드가 됩니다. minidump는 core와 별개 포맷이고 Breakpad의 `dump_syms`·`minidump_stackwalk`로 심볼을 붙입니다.
:::

## Build-ID — 정체성

build-id는 링크 결과물마다 붙는 ID입니다. 파일 이름이나 경로가 바뀌어도 그대로라서, "이 core를 만든 바로 그 바이너리"를 찾는 열쇠가 됩니다. GNU ld 2.44의 `ld(1)`은 스타일을 이렇게 정의합니다.

| 스타일 | 길이 | 성질 |
| --- | --- | --- |
| `sha1` | 160비트 | 스타일을 생략하면 이것. 출력 내용의 해시 |
| `md5` | 128비트 | 출력 내용의 해시 |
| `xx` | 128비트 | 출력 내용의 XXHASH |
| `uuid` | 128비트 | 링크할 때마다 무작위 |
| `0x<hex>` | 지정한 길이 | 직접 준 값 |
| `none` | — | 앞의 `--build-id`를 끔 |

`ld(1)`은 해시 스타일이 "같은 출력에는 늘 같은 값"이고 "체크섬으로 비교하라고 만든 것은 아니"라고 적습니다. Debian의 `gcc`는 링크할 때 `--build-id`를 항상 넘깁니다(`gcc -v`의 collect2 줄). 같은 소스를 스타일만 바꿔 링크했습니다.

```text
sha1:     Build ID: b358f6d9585111b5771325b3549e70c2b8c43677
md5:     Build ID: 5ac71bfd45e3aaf7497181a66e20a37b
uuid:     Build ID: da53723546d6650bcc5fc0d2e5440c0b
0xdeadbeef:     Build ID: deadbeef
none: no-build-id
```

같은 명령으로 두 번 빌드한 `r1`, `r2`는 sha1 build-id가 `b358f6d9…`로 같았고, 같은 소스를 `uuid`로 한 번 더 링크한 세 번째 파일은 위의 `da537235…`과 다른 `b0481f36…`이었습니다. 재현 가능한 빌드를 원하면 해시 스타일을 씁니다.

core에서 build-id를 뽑는 방법은 [Ch 2](/blog/tools/debugging/postmortem/chapter02-elf-core-format)에서 봤습니다(`eu-unstrip -n --core`). 기본 `coredump_filter`가 매핑의 첫 페이지를 남기기 때문에 가능하고, 비트 4를 끄면 vDSO만 남습니다.

## 별도 debuginfo

배포 바이너리에서 DWARF를 떼어 따로 보관하는 세 단계입니다.

```bash
objcopy --only-keep-debug myapp myapp.debug
strip --strip-debug myapp
objcopy --add-gnu-debuglink=myapp.debug myapp
```

`--add-gnu-debuglink`는 `.gnu_debuglink` 섹션에 파일 이름과 CRC32를 넣습니다.

```text
$ readelf -x .gnu_debuglink myapp
Hex dump of section '.gnu_debuglink':
  0x00000000 6d796170 702e6465 62756700 b1d08d9c myapp.debug.....
```

GDB가 debuginfo를 찾는 위치를 하나씩 옮겨 가며 확인했습니다. 실행 파일은 `/root/c4/myapp`, build-id는 `b4ec5591…`입니다. 네 위치 모두에서 `bt`가 `parse_port (s=0xffffcbaa0e71 "x") at server.c:13`으로 인자와 줄 번호까지 나왔고, 파일을 치우자 `parse_port ()`만 남았습니다.

| 위치 | 경로 |
| --- | --- |
| 실행 파일과 같은 디렉터리 | `/root/c4/myapp.debug` |
| 그 아래 `.debug/` | `/root/c4/.debug/myapp.debug` |
| 전역 디렉터리 + 실행 파일 경로 | `/usr/lib/debug/root/c4/myapp.debug` |
| build-id 디렉터리 | `/usr/lib/debug/.build-id/b4/ec559172d5f1136de14969a1835a793f34953f.debug` |

`--strip-debug`는 심볼 테이블을 남기므로 debuginfo가 없어도 함수 이름은 나옵니다. 인자와 줄 번호가 DWARF에서 옵니다. 전역 디렉터리는 `debug-file-directory`가 정하고, 여러 경로를 콜론으로 이어 줄 수 있습니다.

```text
(gdb) show debug-file-directory
The directory where separate debug symbols are searched for is "/usr/lib/debug".
(gdb) set debug-file-directory /opt/symbols:/usr/lib/debug
```

## Build-ID 디렉터리 구조

build-id 디렉터리는 앞 2글자가 하위 디렉터리, 나머지가 파일 이름입니다. 16진수 두 글자라 하위 디렉터리는 최대 256개입니다.

```text
/usr/lib/debug/.build-id/
├── b4/
│   └── ec559172d5f1136de14969a1835a793f34953f.debug    # myapp
├── 5f/
│   └── 3926d9963ff284b8173bf3601bbb00c3abad16.debug    # libc.so.6
└── ...
```

```bash title="inspect-build-id.sh"
build_id=$(readelf -n ./myapp | awk '/Build ID/ {print $3}')
ls /usr/lib/debug/.build-id/${build_id:0:2}/${build_id:2}.debug
```

배포판은 이 구조로 debuginfo 패키지를 냅니다. Debian 13에서 확인한 이름입니다.

| 대상 | 패키지 | 저장소 |
| --- | --- | --- |
| glibc | `libc6-dbg` (2.41-12+deb13u4) | 기본 `main` |
| libstdc++ | `libstdc++6-dbgsym` (14.2.0-19) | `deb http://deb.debian.org/debian-debug trixie-debug main`을 추가해야 보임 |

패키지를 일일이 깔지 않고 필요한 파일만 받는 방법이 debuginfod입니다.

## debuginfod — 네트워크 자동 다운로드

debuginfod는 build-id를 URL에 넣어 HTTP로 debuginfo·실행 파일·소스를 받는 프로토콜입니다. 클라이언트는 `DEBUGINFOD_URLS`에 적힌 서버에 `/buildid/<id>/debuginfo` 같은 경로를 요청합니다.

![Build-ID 매칭 + debuginfod 자동 다운로드 흐름](/images/blog/tools/diagrams/build-id-matching.svg)

Debian 13은 클라이언트를 기본으로 꺼 둡니다. `libdebuginfod-common`의 debconf 값 `libdebuginfod/usedebiandebuginfod`가 `false`였고, 로그인 셸의 `DEBUGINFOD_URLS`가 비어 있었습니다. 설치는 됐지만 `/etc/debuginfod/elfutils.urls`(내용 `https://debuginfod.debian.net`)를 읽는 `/etc/profile.d` 스크립트가 연결되지 않은 상태입니다.

### batch 모드의 함정: `-ex`가 아니라 `-iex`

URL만 주고 GDB를 batch로 돌리면 아무것도 받지 않습니다. `show debuginfod enabled`는 `Debuginfod functionality is currently set to "ask".`였습니다. 그래서 `-ex 'set debuginfod enabled on'`을 붙였더니 그래도 받지 않았습니다.

```text
$ DEBUGINFOD_URLS=https://debuginfod.debian.net gdb -q -nx -batch \
    -ex 'set debuginfod enabled on' -ex 'bt 6' ./patterns core.assert

This GDB supports auto-downloading debuginfo from the following URLs:
  <https://debuginfod.debian.net>
Enable debuginfod for this session? (y or [n]) [answered N; input not from terminal]
Debuginfod has been disabled.
To make this setting permanent, add 'set debuginfod enabled off' to .gdbinit.
...
#3  0x0000ffff8554f8bc [PAC] in ?? () from /lib/aarch64-linux-gnu/libc.so.6
```

GDB는 명령줄의 실행 파일과 core를 `-ex`보다 먼저 읽습니다. 그 순간 debuginfod를 쓸지 묻고, 터미널이 없으니 N으로 답한 뒤 꺼 버립니다. 파일을 읽기 전에 실행되는 `-iex`로 옮기자 다운로드가 일어났습니다.

```text
$ DEBUGINFOD_URLS=https://debuginfod.debian.net gdb -q -nx -batch \
    -iex 'set debuginfod enabled on' -ex 'bt 6' ./patterns core.assert
Downloading 8.93 M separate debug info for /lib/aarch64-linux-gnu/libstdc++.so.6...
Downloading 348.56 K separate debug info for /lib/aarch64-linux-gnu/libgcc_s.so.1...
Downloading 5.20 M separate debug info for /lib/aarch64-linux-gnu/libc.so.6...
Downloading 1.15 M separate debug info for /lib/aarch64-linux-gnu/libm.so.6...
Downloading 457.55 K separate debug info for /lib/ld-linux-aarch64.so.1...
Downloading 37.93 K separate debug info for system-supplied DSO at 0xffff859d3000...
...
Download failed: Invalid argument.  Continuing without source file ./nptl/./nptl/pthread_kill.c.
#0  __pthread_kill_implementation (threadid=281472923365408, signo=signo@entry=6, no_tid=no_tid@entry=0) at ./nptl/pthread_kill.c:44
#1  0x0000ffff855a80c4 [PAC] in __pthread_kill_internal (threadid=<optimized out>, signo=6) at ./nptl/pthread_kill.c:89
#2  0x0000ffff85556880 in __GI_raise (sig=sig@entry=6) at ../sysdeps/posix/raise.c:26
#3  0x0000ffff85541a84 [PAC] in __GI_abort () at ./stdlib/abort.c:77
#4  0x0000ffff8554f8bc [PAC] in __assert_fail_base (fmt=<optimized out>, assertion=<optimized out>, file=<optimized out>, line=35, function=<optimized out>) at ./assert/assert.c:118
#5  0x0000aaaabcd81a88 [PAC] in do_validate (x=-1) at patterns.cpp:35
```

Ch 3의 패턴 5에서 `??`였던 프레임이 `__assert_fail_base`이고, `#0`은 `__pthread_kill_implementation`이었습니다. 소스 파일 요청은 `debuginfod.debian.net`에서 `Invalid argument`로 실패했고, 줄 번호까지만 나왔습니다.

첫 실행은 6개 모듈(vDSO, ld.so, libm, libc, libgcc_s, libstdc++)의 debuginfo 17 MB를 받느라 63초 걸렸고, 같은 명령을 다시 돌리자 1.3초에 끝났습니다. 첫 실행 시간은 네트워크 상태를 따르므로, 다른 날 같은 명령은 144초가 걸리기도 했습니다. GDB 매뉴얼의 [Debuginfod Settings](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Debuginfod-Settings.html)에 따르면 대화형 기본값은 `ask`입니다. `.gdbinit`에 `set debuginfod enabled on`을 넣는 방법도 있지만, `-nx`로 부르는 자동화에서는 `-iex`가 확실합니다.

### 캐시

받은 파일은 build-id별 디렉터리에 쌓입니다. 위 실행 뒤의 캐시입니다.

```text
$ find ~/.cache/debuginfod_client -type f -exec ls -l {} \; | awk '{print $5, $9}'
5 /root/.cache/debuginfod_client/cache_clean_interval_s
468536 /root/.cache/debuginfod_client/d7be73c7b2bf2531fb3e11318f0949141af7063a/debuginfo
38840 /root/.cache/debuginfod_client/cc00a9dd32953bb934aac887a0cbec5fdccf3165/debuginfo
9361560 /root/.cache/debuginfod_client/42f7f063581c06d0944bac51464a918ebb9a54d8/debuginfo
1205704 /root/.cache/debuginfod_client/524ecf1cd0f388db5317b0ec58c3b30e6f789944/debuginfo
5449288 /root/.cache/debuginfod_client/5f3926d9963ff284b8173bf3601bbb00c3abad16/debuginfo
356928 /root/.cache/debuginfod_client/3cc7ba55e94cd9fd48973153fdec044d369fbcb0/debuginfo
```

디렉터리 이름이 `eu-unstrip -n --core core.assert`가 보여 준 build-id와 같습니다(`5f3926d9…`가 libc.so.6). 캐시는 크기가 아니라 시간으로 정리됩니다. `debuginfod-client-config(7)`의 기본값입니다.

| 설정 | 기본값 | 의미 |
| --- | --- | --- |
| `cache_clean_interval_s` (캐시 안 파일) | 86400 (하루) | 정리 주기 |
| `max_unused_age_s` | 604800 (1주) | 이 기간 접근 없는 파일 삭제 |
| `cache_miss_s` | 600 | 실패한 조회를 기억하는 시간 |
| `$DEBUGINFOD_CACHE_PATH` | `$XDG_CACHE_HOME/debuginfod_client` 또는 `~/.cache/debuginfod_client` | 캐시 위치 |
| `$DEBUGINFOD_MAXSIZE` | 0 (제한 없음) | 내려받을 **파일 하나**의 최대 크기 |
| `$DEBUGINFOD_TIMEOUT` | 90초 | 100K를 받기 전까지 기다리는 시간 |

`DEBUGINFOD_MAXSIZE`는 캐시 한도가 아닙니다. 캐시 전체 크기에는 상한이 없으므로, 디스크가 걱정되면 `DEBUGINFOD_CACHE_PATH`를 큰 파티션으로 옮기거나 `max_unused_age_s`를 줄입니다.

### 알려진 서버

[sourceware.org의 debuginfod 페이지](https://sourceware.org/elfutils/Debuginfod.html)에 실린 공개 서버 중 일부입니다. 2026-11-16에 모두 HTTP 응답을 확인했습니다(fedoraproject·ubuntu는 브라우저 요청에 안내 페이지로 301 리다이렉트).

| 서버 | URL | 페이지가 밝힌 대상 |
|------|-----|------|
| Fedora | `https://debuginfod.fedoraproject.org/` | Fedora 35+ |
| CentOS | `https://debuginfod.centos.org/` | CentOS |
| Ubuntu | `https://debuginfod.ubuntu.com/` | 지원 중인 Ubuntu 릴리스 |
| Debian | `https://debuginfod.debian.net/` | Debian 주요 배포(main distributions), arm64 포함 9개 아키텍처 |
| Arch | `https://debuginfod.archlinux.org/` | Arch Linux |
| elfutils | `https://debuginfod.elfutils.org/` | 선택한 서버들을 federation |

`DEBUGINFOD_URLS`에는 여러 URL을 공백으로 나열합니다. 같은 변수에 `ima:enforcing` 같은 태그를 넣으면 그 뒤 URL에서 받은 파일의 IMA 서명을 검사합니다(`debuginfod-client-config(7)`).

```bash
export DEBUGINFOD_URLS="https://debuginfod.debian.net https://debuginfod.elfutils.org/"
```

### 사내 debuginfod

공개 서버는 배포판 패키지만 압니다. 자체 빌드 산출물은 사내 서버에 인덱싱합니다. `-F`는 ELF/DWARF 파일을 스캔하라는 플래그이고 뒤의 경로가 스캔 대상입니다.

```bash title="start-debuginfod.sh"
debuginfod -F -d /var/tmp/debuginfod.sqlite -p 8002 /opt/builds
```

| 옵션 | 의미 |
| --- | --- |
| `-F` | 경로 인자 아래 ELF/DWARF 파일을 스캔 |
| `-d` | SQLite 인덱스 파일 |
| `-p` | 리슨 포트 (기본 8002) |
| `/opt/builds` | 스캔할 경로 |

`/opt/builds`에 debuginfo가 있는 빌드를 두고, 운영 쪽에는 strip한 같은 바이너리를 배포했습니다. 운영 바이너리가 만든 core를 열자 GDB가 사내 서버에서 71 KB를 받아 인자와 줄 번호를 채웠습니다.

```text
$ DEBUGINFOD_URLS=http://127.0.0.1:8002/ gdb -q -nx -batch \
    -iex 'set debuginfod enabled on' -ex 'bt 2' ./myapp2 core
Downloading 71.34 K separate debug info for /root/c4/prod/myapp2...
#0  0x0000aaaae8dc091c in parse_port (s=0xffffe16bde56 "--config=prod.yaml") at server.c:13
#1  0x0000aaaae8dc09cc in main (argc=2, argv=0xffffe16bdb48) at server.c:20
```

서버의 `/metrics`는 Prometheus 형식으로 스캔 상태를 내보냅니다. 이 실험에서는 `scanned_files_total{source="file"} 1`이었습니다.

### debuginfod-find 직접

GDB 없이 파일만 받을 때 씁니다. build-id 대신 ELF 파일 경로를 줘도 그 파일의 build-id로 조회합니다.

```text
$ debuginfod-find debuginfo b4ec559172d5f1136de14969a1835a793f34953f
/var/tmp/dcache/b4ec559172d5f1136de14969a1835a793f34953f/debuginfo
$ debuginfod-find source b4ec559172d5f1136de14969a1835a793f34953f /root/c4/server.c
/var/tmp/dcache/b4ec559172d5f1136de14969a1835a793f34953f/source-a8185eb5-#root#c4#server.c
$ debuginfod-find debuginfo /root/c4/myapp2
/var/tmp/dcache/b4ec559172d5f1136de14969a1835a793f34953f/debuginfo
```

elfutils 도구도 같은 클라이언트를 씁니다. 아래 `eu-stack -s`가 `DEBUGINFOD_URLS`만으로 libc의 소스 줄을 찾은 것이 그 예입니다.

## 자동 사후 분석 — 한 스크립트

실행 파일과 core를 받아 보고서를 찍는 스크립트입니다. `-iex`로 debuginfod를 켜고, `-nx`로 사용자 설정의 영향을 끊습니다.

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

export DEBUGINFOD_URLS="${DEBUGINFOD_URLS:-http://127.0.0.1:8002/ https://debuginfod.debian.net}"

gdb -q -nx -batch \
    -iex 'set debuginfod enabled on' \
    -ex 'set pagination off' \
    -ex 'set print pretty on' \
    -ex 'set print elements 100' \
    -ex 'echo \n=== Death info ===\n' \
    -ex 'print $_siginfo._sifields._sigfault' \
    -ex 'echo \n=== Backtrace ===\n' \
    -ex 'bt full 5' \
    -ex 'echo \n=== All threads ===\n' \
    -ex 'thread apply all bt 5' \
    -ex 'echo \n=== Loaded libs ===\n' \
    -ex 'info shared' \
    -ex 'echo \n=== Registers ===\n' \
    -ex 'info registers pc sp x0 x30' \
    "$EXE" "$CORE" 2>&1
```

위 운영 core에 사내 서버만 `DEBUGINFOD_URLS`로 지정해 돌리자 54줄 보고서가 나왔습니다. 앞부분입니다. 공개 서버를 빼서 libc 프레임은 `??`로 남았습니다.

```text
$ DEBUGINFOD_URLS=http://127.0.0.1:8002/ ./postmortem.sh prod/myapp2 prod/core > /root/c4/report.txt
$ cat /root/c4/report.txt
Downloading 71.34 K separate debug info for /root/c4/prod/myapp2...
...
=== Death info ===
$1 = {
  si_addr = 0xdeadbeef
}

=== Backtrace ===
#0  0x0000aaaae8dc091c in parse_port (s=0xffffe16bde56 "--config=prod.yaml") at server.c:13
        bad = 0xdeadbeef
#1  0x0000aaaae8dc09cc in main (argc=2, argv=0xffffe16bdb48) at server.c:20
        t = {281473185083776, 281473176629632}

=== All threads ===

Thread 3 (Thread 0xffff94b4f180 (LWP 12931)):
#0  0x0000ffff953ef228 in ?? () from /lib/aarch64-linux-gnu/libc.so.6
#1  0x0000ffff953e28b8 in ?? () from /lib/aarch64-linux-gnu/libc.so.6
#2  0x0000ffff953e28fc [PAC] in ?? () from /lib/aarch64-linux-gnu/libc.so.6
#3  0x0000ffff9542946c [PAC] in pause () from /lib/aarch64-linux-gnu/libc.so.6
#4  0x0000aaaae8dc08f8 [PAC] in worker (arg=0x0) at server.c:8
...
```

`info registers pc sp x0 x30`은 arm64 레지스터 이름입니다. x86-64라면 `rip rsp rdi`로 바꿉니다. 실행 파일이 core와 맞는지는 GDB가 build-id로 검사해 `core file may not match specified executable file` 경고를 냅니다(Ch 2). 자동화에서는 이 문자열을 찾아 보고서를 실패로 표시하면 됩니다.

## minidump — 클라이언트 분포

데스크톱 앱이나 게임처럼 사용자 PC에서 죽는 프로그램은 core를 받을 수 없습니다. 크기도 크고, 사용자 메모리 전체를 서버로 올릴 수도 없습니다. **minidump**는 크래시 순간의 스레드·모듈·예외와 스택 일부만 담는 별도 포맷입니다. [Ch 2](/blog/tools/debugging/postmortem/chapter02-elf-core-format)에서 본 대로 같은 0xdeadbeef 크래시의 minidump는 14,760바이트였고, 스트림 13개 중 환경 변수(`MD_LINUX_ENVIRON`)도 들어 있었습니다.

### Breakpad / crashpad

[Google Breakpad](https://chromium.googlesource.com/breakpad/breakpad/)는 크래시를 잡아 minidump를 쓰는 클라이언트 라이브러리와 서버 쪽 도구 모음입니다. 후속인 [Crashpad](https://chromium.googlesource.com/crashpad/crashpad)는 별도 handler 프로세스가 minidump를 쓰는 구조입니다. Debian 13에는 Breakpad 패키지가 없어서 upstream(커밋 `94c818ea`)을 VM에서 빌드했습니다.

클라이언트 쪽 코드는 `ExceptionHandler` 객체 하나입니다. 콜백은 dump를 쓴 뒤 불립니다. 아래가 실험에 쓴 `app.cc` 전체이고, `parse_port()`가 0xdeadbeef를 역참조합니다.

```cpp title="app.cc"
#include <cstdio>
#include "client/linux/handler/exception_handler.h"
static bool on_dump(const google_breakpad::MinidumpDescriptor& d, void*, bool ok) {
    std::printf("minidump: %s ok=%d\n", d.path(), ok);
    return ok;
}
static int parse_port(const char* s) {
    int* bad = reinterpret_cast<int*>(0xdeadbeef);
    return *bad + (s ? s[0] : 0);
}
int main(int argc, char** argv) {
    google_breakpad::MinidumpDescriptor desc("/root/bp/dumps");
    google_breakpad::ExceptionHandler eh(desc, nullptr, on_dump, nullptr, true, -1);
    return parse_port(argc > 1 ? argv[1] : nullptr);
}
```

```bash
g++ -g -O0 -I breakpad/src -o app app.cc breakpad/src/client/linux/libbreakpad_client.a -lpthread
```

크래시 후 `dumps/85cf9437-8eaf-4e1c-5236109a-b8770b1f.dmp`(14,760 B)가 생겼고, 셸은 `Segmentation fault (core dumped)`를 찍었습니다. Breakpad 핸들러가 minidump를 쓴 뒤에도 프로세스는 원래 시그널로 죽었고, 커널 core(`core.app`, 548,864 B)도 함께 만들어졌습니다. 둘 다 원하지 않으면 `ulimit -c 0`이나 `core_pattern`으로 커널 쪽을 끕니다.

### symbol server

minidump에는 심볼이 없습니다. 빌드할 때 `dump_syms`로 Breakpad 텍스트 심볼 파일을 만듭니다.

```text
$ dump_syms ./app > app.sym
$ head -3 app.sym
MODULE Linux arm64 DF6C758A457CAAB7DE2075425B4DB2390 app
INFO CODE_ID 8A756CDF7C45B7AADE2075425B4DB23925CEE84E
FILE 0 /root/bp/app.cc
$ wc -l app.sym
11244 app.sym
```

`CODE_ID`는 GNU build-id 그대로이고, `MODULE` 줄의 ID는 그 앞 16바이트를 GUID 바이트 순서로 바꾸고 0을 붙인 값입니다. `minidump_stackwalk`는 `<심볼 디렉터리>/<모듈 이름>/<MODULE ID>/<모듈 이름>.sym`을 찾으므로 그 구조로 둡니다.

```bash
id=$(head -1 app.sym | cut -d' ' -f4)
mkdir -p symbols/app/$id && mv app.sym symbols/app/$id/
```

### Stack walking

```text
$ minidump_stackwalk dumps/85cf9437-8eaf-4e1c-5236109a-b8770b1f.dmp symbols
...
Crash reason:  SIGSEGV /SEGV_MAPERR
Crash address: 0xdeadbeef
Process uptime: not available

Thread 0 (crashed)
 0  app!parse_port [app.cc : 9 + 0x4]
     x0 = 0x00000000deadbeef    x1 = 0x0000000000000001
    ...
    Found by: given as instruction pointer in context
 1  app!main [app.cc : 14 + 0x0]
    ...
    Found by: call frame info
 2  libc.so.6 + 0x22258
    ...
    Found by: call frame info

Loaded modules:
0xaaaac8a10000 - 0xaaaac8a27fff  app  ???  (main)
0xffffad4d0000 - 0xffffad55dfff  libm.so.6  ???
0xffffad580000 - 0xffffad71bfff  libc.so.6  ???  (WARNING: No symbols, libc.so.6, D926395F3F9684F2B8173BF3601BBB000)
...
(레지스터 덤프와 나머지 모듈 생략)
```

`Found by:` 줄이 각 프레임을 어떻게 찾았는지 알려 줍니다. `call frame info`는 심볼 파일의 CFI 레코드로 풀었다는 뜻입니다. libc에 `WARNING: No symbols`가 붙은 것은 libc의 `.sym`을 만들지 않았기 때문입니다. 운영 symbol server는 앱뿐 아니라 배포 대상의 시스템 라이브러리 `.sym`도 같은 구조로 쌓아야 합니다.

## Sentry / Crashlytics

minidump 수집·심볼화·집계를 서비스로 받는 방법도 있습니다. [Sentry](https://sentry.io/)는 프로젝트별 minidump 엔드포인트를 두고, [문서](https://docs.sentry.io/platforms/native/guides/minidumps/)에 따르면 `upload_file_minidump` 필드에 minidump를 담은 POST를 받습니다. [Firebase Crashlytics](https://firebase.google.com/docs/crashlytics)는 모바일 앱 중심의 크래시 보고 서비스입니다.

![Sentry / Crashlytics pipeline — client → server → stackwalker + aggregation → dashboard](/images/blog/postmortem/diagrams/ch04-sentry-pipeline.svg)

이런 서비스가 자체 스크립트 대신 맡는 일은 다음과 같습니다.

- 같은 콜스택의 크래시를 하나의 이슈로 묶습니다.
- 버전별 발생 수로 regression을 찾습니다.
- 업로드된 심볼 파일과 모듈 ID를 맞춰 스택을 풉니다.
- 알림을 보냅니다.

### Sentry 자체 호스팅

[getsentry/self-hosted](https://github.com/getsentry/self-hosted)는 README에서 스스로를 "low-volume deployments and proofs-of-concept"용 패키지라고 소개합니다. 설치 스크립트의 `install/_min-requirements.sh`는 전체 프로필에 RAM 14,000 MB·CPU 4개, `errors-only` 프로필에 RAM 7,000 MB·CPU 2개를 최소값으로 검사합니다.

```bash
git clone https://github.com/getsentry/self-hosted
cd self-hosted && ./install.sh
```

## ASan / TSan과 core

Sanitizer 빌드에서 core를 얻는 조건은 [Ch 1](/blog/tools/debugging/postmortem/chapter01-core-generation)에서 실측했습니다. GCC 14 libasan 기준으로 요약하면 다음과 같습니다.

| `ASAN_OPTIONS` | 결과 |
| --- | --- |
| (없음) | `_exit(1)`, core 없음 |
| `abort_on_error=1` | SIGABRT, 하지만 libasan이 soft core 한도를 0으로 내려 core 없음 |
| `abort_on_error=1:disable_coredump=0` | core 생성 (use-after-free 예에서 48 MB, 실제 할당 6.6 MiB) |
| 위 + `use_madv_dontdump=0` | shadow까지 dump, 120초가 지나도 끝나지 않아 겉보기 7.1 TB에서 강제 종료 |

```bash
ASAN_OPTIONS="abort_on_error=1:disable_coredump=0" ./prog
```

ASan 보고서 자체(어느 줄에서 무엇을 읽었고 언제 해제됐는지)는 stderr에 찍히고 core에는 없습니다. CI에서 sanitizer 빌드를 돌린다면 core보다 stderr 로그를 먼저 보존합니다.

## gcore — 살아 있는 프로세스

운영 서비스가 죽지는 않고 멈췄다면 `gcore`로 사진을 찍습니다. 형식과 노트는 Ch 2에서, 정지 시간은 Ch 1에서 쟀습니다(RSS 1 GiB에 1.8초).

```bash
gcore -o /tmp/core <pid>      # /tmp/core.<pid>
```

정지 시간이 부담되면 `eu-stack`으로 콜스택만 뜹니다. Ch 3의 데드락 프로세스에 걸어 봤습니다.

```text
$ eu-stack -p 7125
PID 7125 - process
TID 7125:
#0  0x0000ffff9ca9f228
#1  0x0000ffff9ca928b8
#2  0x0000ffff9ca92c50
#3  0x0000ffff9ca97d54
#4  0x0000ffff9cceb5c4 std::thread::join()
#5  0x0000aaaab6d91d30 main
...
```

21 ms에 끝났고, 메모리는 쓰지 않습니다. `-s`를 주고 `DEBUGINFOD_URLS`를 설정하면 libc 프레임까지 이름과 소스 줄이 붙습니다.

```text
$ DEBUGINFOD_URLS=https://debuginfod.debian.net eu-stack -s -p 7125
TID 7125:
#0  0x0000ffff9ca9f228 __syscall_cancel_arch
    ../sysdeps/unix/sysv/linux/aarch64/syscall_cancel.S:50
#1  0x0000ffff9ca928b8 __internal_syscall_cancel
    ./nptl/cancellation.c:49:12
#2  0x0000ffff9ca92c50 __GI___futex_abstimed_wait_cancelable64
    ./nptl/futex-internal.c:57:12
#3  0x0000ffff9ca97d54 __pthread_clockjoin_ex
    ./nptl/pthread_join_common.c:108:14
#4  0x0000ffff9cceb5c4 std::thread::join()
    /build/reproducible-path/gcc-14-14.2.0/build/aarch64-linux-gnu/libstdc++-v3/include/aarch64-linux-gnu/bits/gthr-default.h:682:33
#5  0x0000aaaab6d91d30 main
    /root/c3/patterns.cpp:55:96
```

`eu-stack`은 변수 값을 보여 주지 않으므로, 메인 스레드가 `join()`에서 기다린다는 것까지만 알 수 있습니다. 누가 어떤 락을 쥐었는지 보려면 `gcore`로 메모리를 떠야 합니다.

## 자동화 — CI / Production

### CI

GitHub Actions의 Linux runner는 비밀번호 없는 `sudo`를 씁니다([GitHub-hosted runners](https://docs.github.com/en/actions/concepts/runners/github-hosted-runners)). 그래서 runner의 기존 `core_pattern`에 기대지 않고 작업 디렉터리로 직접 지정합니다. 각 step은 별도 셸이므로 `ulimit`은 테스트와 같은 step에 둡니다.

```yaml title="test.yml"
# .github/workflows/test.yml
- name: Run tests
  run: |
    sudo sysctl -w kernel.core_pattern="$PWD/core.%e.%p"
    ulimit -c unlimited
    ./test_runner

- name: Analyze cores
  if: ${{ !cancelled() }}
  run: |
    shopt -s nullglob
    for core in core.*; do
      echo "=== $core ==="
      gdb -q -nx -batch -ex 'bt' -ex 'thread apply all bt' \
          ./test_runner "$core"
    done
```

GitHub 문서는 `always()` 대신 `!cancelled()`를 권장합니다. 테스트가 실패해도 분석 step은 돌고, workflow는 앞 step의 실패로 실패 상태가 됩니다. 두 step의 `run:` 내용을 VM에서 step마다 별도 `bash -e`로 같은 순서로 돌려 확인했습니다. `test_runner`는 Ch 3 패턴 1의 `handle_null(nullptr)`만 부르는 작은 프로그램이고, VM에는 `sudo`가 없어 root 셸에서 `sudo`를 그대로 넘기는 함수로 대신했습니다. minicoredumper 파이프가 걸려 있던 VM에서도 패턴을 바꾼 뒤 `core.test_runner.13839`가 작업 디렉터리에 생겼습니다. 첫 step은 종료 코드 139로 실패했고, 분석 step은 `#0 handle_null (req=0x0) at /root/c4/test_runner.cpp:8`을 찍고 0으로 끝났습니다.

### Production

systemd-coredump를 쓰는 호스트라면 새 core가 저장될 때 분석기를 부르는 path unit을 둡니다. 파일 두 개입니다.

```ini title="/etc/systemd/system/postmortem.service"
[Unit]
Description=Postmortem analyzer

[Service]
Type=oneshot
ExecStart=/usr/local/bin/analyze-cores.sh
```

```ini title="/etc/systemd/system/postmortem.path"
[Path]
PathChanged=/var/lib/systemd/coredump
Unit=postmortem.service

[Install]
WantedBy=multi-user.target
```

시험용 `analyze-cores.sh`는 마지막 실행 이후 생긴 `core.*.zst`를 찍기만 합니다. `systemctl enable --now postmortem.path` 뒤 서버를 한 번 죽이자 journal에 다음이 남았습니다.

```text
Starting postmortem.service - Postmortem analyzer...
new core: /var/lib/systemd/coredump/core.server.0.cae0f96507a64bf391aea4deff2b3dc8.13499.1794808979000000.zst
postmortem.service: Deactivated successfully.
Finished postmortem.service - Postmortem analyzer.
```

`PathModified=`로 바꿔도 똑같이 한 번 불렸습니다. 실제 분석기라면 `coredumpctl dump -o`로 core를 꺼내 `postmortem.sh`에 넘기고, 결과를 알림 시스템으로 보냅니다.

### 자체 분석 함수 — GDB Python

같은 원인의 크래시를 묶으려면 core마다 같은 서명을 만들어야 합니다. GDB Python API로 프레임을 직접 순회해, 소스 줄이 있는 프레임(우리 코드)만으로 서명을 만듭니다. 문자열 `bt` 출력을 `split()`으로 자르는 방식은 프레임 번호·주소·`[PAC]` 표시가 섞여 서명이 흔들립니다.

```python title="analyze.py"
import json
import gdb

def analyze_core(exe_path, core_path):
    gdb.execute(f"file {exe_path}", to_string=True)
    gdb.execute(f"core-file {core_path}", to_string=True)
    si = gdb.parse_and_eval("$_siginfo")
    frames, f = [], gdb.newest_frame()
    while f is not None and len(frames) < 8:
        sal = f.find_sal()
        where = f"{sal.symtab.filename}:{sal.line}" if sal.symtab else "?"
        frames.append(f"{f.name() or '??'}@{where}")
        f = f.older()
    # 같은 크래시를 묶을 서명: 우리 코드(소스 줄이 있는 프레임)만
    sig = "|".join(x for x in frames if not x.endswith("@?"))
    print(json.dumps({"signo": int(si["si_signo"]), "code": int(si["si_code"]),
                      "signature": sig, "frames": frames}))
```

Ch 3의 core 세 개(`core.assert`, `core.wild`, `core.uaf`)에 돌린 결과입니다.

```text
$ gdb -q -nx -batch -ex "source analyze.py" -ex 'python analyze_core("patterns", "core.assert")'
{"signo": 6, "code": -6, "signature": "do_validate@patterns.cpp:35|main@patterns.cpp:56", "frames": ["??@?", "raise@?", "abort@?", "??@?", "do_validate@patterns.cpp:35", "main@patterns.cpp:56"]}
$ gdb -q -nx -batch -ex "source analyze.py" -ex 'python analyze_core("patterns", "core.wild")'
{"signo": 11, "code": 1, "signature": "handle_wild@patterns.cpp:21|main@patterns.cpp:53", "frames": ["handle_wild@patterns.cpp:21", "main@patterns.cpp:53"]}
$ gdb -q -nx -batch -ex "source analyze.py" -ex 'python analyze_core("patterns", "core.uaf")'
{"signo": 11, "code": 1, "signature": "use_after_free@patterns.cpp:42|main@patterns.cpp:57", "frames": ["use_after_free@patterns.cpp:42", "main@patterns.cpp:57"]}
```

libc 프레임은 debuginfod가 있으면 이름이 바뀌므로 서명에서 뺐습니다. 그래야 같은 크래시가 분석 환경에 따라 다른 이슈로 갈라지지 않습니다. 전송은 인증·재시도·개인정보 정책을 갖춘 별도 notifier에 맡깁니다.

## 자체 분석 — pyelftools

GDB 없이 Python만으로 core의 노트를 훑을 수도 있습니다. Debian의 `python3-pyelftools`로 note 이름과 크기를 찍는 예입니다.

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

Ch 2의 스레드 3개짜리 core에 돌린 결과입니다.

```text
$ python3 core-notes.py core
NT_PRSTATUS name= CORE description-bytes= 392
NT_AUXV name= CORE description-bytes= 368
NT_FILE name= CORE description-bytes= 599
NT_PRSTATUS name= CORE description-bytes= 392
NT_PRSTATUS name= CORE description-bytes= 392
```

크기가 `eu-readelf`의 392·368·599와 같습니다. 레지스터나 NT_FILE 내용을 풀려면 아키텍처별 구조체(Ch 2의 `elf_prstatus`, `fill_files_note()` 형식)를 직접 해석해야 합니다. 콜스택까지 필요하면 GDB나 `eu-stack`을 쓰는 편이 짧습니다.

## 시리즈 정리

앞의 네 장에서 core dump 분석 흐름을 다뤘습니다. 이 시리즈에는 뒤이어 CXL 디바이스와 fabric postmortem 장도 있습니다.

- **Ch 1** Core 생성 메커니즘 — ulimit, core_pattern, systemd-coredump.
- **Ch 2** ELF core 포맷 — PT_NOTE, NT_PRSTATUS, NT_FILE.
- **Ch 3** GDB로 core 분석 — 8가지 패턴, siginfo, 변수 검사.
- **Ch 4** (이 장) 자동화 — debuginfod, minidump, CI.
- **Ch 5–6** CXL 디바이스와 fabric 사례.

이 장의 실험을 운영 순서로 엮으면 다음과 같습니다.

1. 서비스에 core가 남도록 `LimitCORE`와 `core_pattern`을 정합니다(Ch 1).
2. CI에서 build-id가 있는 바이너리를 만들고 debuginfo를 떼어 보관합니다.
3. 사내 debuginfod가 그 보관소를 인덱싱합니다.
4. 사고가 나면 path unit이 `postmortem.sh`를 부르고, GDB가 `-iex`로 debuginfod를 켭니다.
5. 우리 코드 프레임만으로 만든 서명으로 같은 사고를 묶습니다.
6. 사용자 PC에서 도는 앱은 minidump와 symbol server로 같은 일을 합니다.

## 관련 항목 (시리즈 전체)

- [Ch 1: core 생성](/blog/tools/debugging/postmortem/chapter01-core-generation)
- [Ch 2: ELF core 포맷](/blog/tools/debugging/postmortem/chapter02-elf-core-format)
- [Ch 3: GDB로 core 분석](/blog/tools/debugging/postmortem/chapter03-gdb-core-analysis)
- [Ch 5: CXL 디바이스 Core Dump 분석](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)

## 외부 자료

- [debuginfod 공식](https://sourceware.org/elfutils/Debuginfod.html), `debuginfod-client-config(7)`, `debuginfod(8)`
- [GDB: Debuginfod Settings](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Debuginfod-Settings.html), [Separate Debug Files](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Separate-Debug-Files.html)
- [GNU ld `--build-id`](https://sourceware.org/binutils/docs/ld/Options.html)
- [Google Breakpad](https://chromium.googlesource.com/breakpad/breakpad/), [Crashpad](https://chromium.googlesource.com/crashpad/crashpad/)
- [Sentry Minidumps](https://docs.sentry.io/platforms/native/guides/minidumps/), [getsentry/self-hosted](https://github.com/getsentry/self-hosted)
- [GitHub Actions expressions: status check functions](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions)
- [DWARF and ELF Internals — Ch 6: debuginfod](/blog/tools/debugging/dwarf-elf/chapter06-split-dwarf-tools)
- [Embedded Debugging](/blog/tools/debugging/embedded/chapter01-rsp-protocol)
- [GDB Extension and IDE](/blog/tools/debugging/gdb-extension/chapter01-python-api-basics)
