---
title: "GDB 원격 디버깅 — gdbserver·OpenOCD·J-Link 통합"
slug: "tools/debugging/gdb-lldb/chapter08-remote-debugging"
date: 2026-05-24T09:08:00
description: "다른 머신·MCU를 GDB로. RSP, gdbserver, OpenOCD, J-Link, JTAG/SWD, ARM CoreSight."
tags: [gdb, remote-debug, gdbserver, OpenOCD, JTAG, ARM]
series: "GDB and LLDB"
seriesOrder: 8
draft: false
topics: ["tools", "tools/debugging"]
---

:::tip[Deep dive]
이 챕터는 빠른 참조입니다. 깊은 내부 메커니즘은 [Embedded Debugging 시리즈](/blog/tools/debugging/embedded/chapter01-rsp-protocol)를 참고하세요 — RSP 프로토콜 패킷 카탈로그, JTAG/SWD/CoreSight 회로, OpenOCD TCL, J-Link, RTOS-aware.
:::


GDB가 실행되는 *호스트*와 디버깅 대상이 도는 *타깃*은 같은 컴퓨터가 아니어도 됩니다. 라즈베리파이, ARM 보드, Cortex-M MCU 모두 한쪽 끝에 GDB Remote Serial Protocol(이하 RSP)을 말하는 *스텁*만 있으면 GDB가 로컬처럼 디버깅합니다. 통역사를 사이에 둔 회의처럼, GDB는 상대가 어떤 기계인지 몰라도 RSP라는 공통어만 알면 됩니다.

이 장은 RSP의 실제 패킷에서 출발해 두 갈래로 나아갑니다.

1. **OS가 있는 원격 머신** — gdbserver / lldb-server. Debian 13 arm64 VM에서 GDB 16.3·lldb 19.1.7로 실제로 연결했습니다.
2. **베어메탈 MCU** — OpenOCD / J-Link → JTAG/SWD → ARM CoreSight. 이 시리즈에서는 probe와 보드를 연결하지 않았으므로, OpenOCD는 probe 없이 실행한 결과와 매뉴얼을, J-Link는 SEGGER 문서를 근거로 적습니다.

어디까지가 *GDB의 일*이고 어디부터가 *스텁의 일*인지 구분하면 두 갈래가 한 그림으로 모입니다.

## RSP — Remote Serial Protocol

RSP는 GDB와 원격 스텁이 명령·응답을 주고받는 패킷 기반 프로토콜입니다. 사양은 GDB 매뉴얼의 [Remote Protocol](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Remote-Protocol.html) 부록입니다.

### 패킷 형식

```text
$<payload>#<checksum>
```

- `$` — 시작.
- `<payload>` — 명령/응답 본문.
- `#` — 끝.
- `<checksum>` — GDB 매뉴얼 Overview 절의 정의대로 payload 바이트의 "modulo 256 sum"을 16진 두 자리로 씁니다.

수신 측은 `+`(ACK)나 `-`(재전송 요청)로 답합니다. 연결 직후 GDB가 `QStartNoAckMode`를 보내고 스텁이 `OK`로 받으면 이후로는 ACK를 생략합니다. 아래 gdbserver 세션에서는 이 협상이 성공했고, QEMU의 gdbstub 세션에서는 패킷마다 `Received Ack`가 찍혔습니다.

### 자주 쓰이는 패킷

아래 표의 형식은 GDB 16.3 매뉴얼 Packets 절의 항목을 옮긴 것입니다.

| 패킷 | 의미 | 응답 |
|------|------|------|
| `?` | 정지 사유 | stop reply (`T05...`) |
| `g` | 모든 레지스터 읽기 | 16진 인코딩된 전체 레지스터 |
| `G<hex>` | 모든 레지스터 쓰기 | `OK` |
| `p<n>` | 한 레지스터 읽기 | `<hex>` |
| `m<addr>,<length>` | 메모리 읽기 | `<hex bytes>` |
| `M<addr>,<length>:<hex>` | 메모리 쓰기 | `OK` |
| `c[addr]` / `s[addr]` | continue / single-step | 다음 stop reply |
| `Z0,<addr>,<kind>` | software breakpoint 설정 | `OK` |
| `Z1,<addr>,<kind>` | hardware breakpoint | `OK` |
| `Z2` / `Z3` / `Z4,<addr>,<kind>` | write / read / access watchpoint | `OK` |
| `z0`~`z4` | 위 BP/WP 제거 | `OK` |
| `qSupported` | 기능 협상 | 세미콜론 구분 기능 목록 |
| `vCont;<action>` | 스레드별 실행 제어 | 다음 stop reply |
| `qXfer:features:read:target.xml:...` | 레지스터 구성 XML 전송 | XML 청크 |
| `k` | kill | 매뉴얼은 "The exact effect of this packet is not specified"라고 적습니다 |

`kind`의 의미는 아키텍처마다 다릅니다. 매뉴얼 ARM Breakpoint Kinds 절은 ARM에서 2를 16비트 Thumb, 3을 32비트 Thumb-2, 4를 32비트 ARM 모드 breakpoint로 정의합니다.

### 실제 트래픽 — gdbserver

VM 안에서 `gdbserver :2345 ./hello`를 띄우고 `set debug remote 1`로 연결해 [Ch 1](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install)의 `factorial`에 breakpoint를 건 뒤 continue했습니다. 로그에서 흐름을 보여 주는 패킷만 골랐고, 긴 패킷은 `...`로 줄였습니다.

```text
[remote] Sending packet: $qSupported:multiprocess+;swbreak+;hwbreak+;qRelocInsn+;fork-events+;vfork-events+;exec-events+;vContSupported+;QThreadEvents+;QThreadOptions+;no-resumed+;memory-tagging+;error-message+#89
[remote] Packet received: PacketSize=2001f;QPassSignals+;QProgramSignals+;QStartupWithShell+;QEnvironmentHexEncoded+;QEnvironmentReset+;QEnvironmentUnset+;QSetWorkingDir+;binary-upload+;QCatchSyscalls+;qXfer:libraries-svr4:read+;augmented-libraries-svr4-read+;qXfer:auxv:read+;qXfer:siginfo:read+;q...
[remote] Sending packet: $vCont?#49
[remote] Packet received: vCont;c;C;t;s;S;r
[remote] Sending packet: $QStartNoAckMode#b0
[remote] Packet received: OK
[remote] Sending packet: $qXfer:features:read:target.xml:0,1000#0c
[remote] Packet received: m<?xml version="1.0"?>\n<!DOCTYPE target SYSTEM "gdb-target.dtd">\n<target>\n  <architecture>aarch64</architecture>\n  <osabi>GNU/Linux</osabi>...
[remote] Sending packet: $?#3f
[remote] Packet received: T051d:0000000000000000;1f:50fcffffffff0000;20:c092fdf7ffff0000;thread:p437.437;core:3;
[remote] Sending packet: $g#67
[remote] Sending packet: $Z0,aaaaaaaa07b4,4#1b
[remote] Sending packet: $vCont;c:p437.-1#7c
[remote] Packet received: T05swbreak:;1d:a0faffffffff0000;1f:a0faffffffff0000;20:b407aaaaaaaa0000;thread:p437.437;core:4;
[remote] Sending packet: $z0,aaaaaaaa07b4,4#3b
```

몇 가지가 눈에 띕니다.

- 첫 `?` 응답 `T05`는 SIGTRAP(5)이고, `thread:p437.437`의 437은 16진수입니다. gdbserver는 `Process ./hello created; pid = 1079`라고 했고 0x437 = 1079입니다.
- `Z0,aaaaaaaa07b4,4`의 kind 4는 arm64 명령 하나의 길이입니다.
- 마지막 stop reply의 `swbreak:`는 software breakpoint에 걸렸다는 표시이고, `20:b407aaaaaaaa0000`은 레지스터 0x20(pc)의 값을 리틀엔디언 바이트로 적은 것입니다. 거꾸로 읽으면 `0xaaaaaaaa07b4`, 바로 `Z0`를 건 주소입니다.

스텁이 gdbserver든 OpenOCD든 J-Link 서버든, GDB는 이런 패킷만 봅니다.

### qSupported — 기능 협상

연결 직후 첫 패킷이 `qSupported`입니다. GDB가 자신이 아는 기능을 나열하면 스텁이 지원하는 기능으로 답합니다. GDB 16.3 매뉴얼은 각 항목의 표기를 이렇게 정의합니다.

| 표기 | 매뉴얼의 정의 |
|------|------|
| `name=value` | 지원하며 값이 딸림 (`PacketSize=2001f`) |
| `name+` | 지원하며 값이 없음 |
| `name-` | 지원하지 않음 |
| `name?` | 지원할 수도 있으며, 필요할 때 GDB가 다른 방법으로 자동 감지 |

위 세션의 gdbserver 16.3은 `PacketSize=2001f`와 `QCatchSyscalls+`, `qXfer:libraries-svr4:read+` 등을 알렸습니다.

### Software vs Hardware breakpoint

- **SW BP** (`Z0`) — 매뉴얼 설명대로 그 주소의 명령을 trap 명령으로 바꿉니다. 스텁이 그 메모리를 쓸 수 있어야 합니다.
- **HW BP** (`Z1`) — 칩의 breakpoint 비교 레지스터를 씁니다. 명령을 건드리지 않으므로 ROM에서도 되지만, 개수는 칩이 정합니다. 이 시리즈의 arm64 VM 커널은 breakpoint 레지스터 6개를 보고했습니다([Ch 5](/blog/tools/debugging/gdb-lldb/chapter05-breakpoints-watchpoints)).

Cortex-M의 FPB(Flash Patch and Breakpoint) 비교기 수는 칩마다 다릅니다. OpenOCD 0.12.0의 `src/target/cortex_m.c`는 `FP_CTRL`을 읽어 코드 비교기 수를 `((fpcr >> 8) & 0x70) | ((fpcr >> 4) & 0xF)`로(2470행), `DWT_CTRL`의 상위 4비트(`(dwtcr >> 28) & 0xF`)로 DWT 비교기 수를 계산합니다(2196행).

## OS 있는 원격 — gdbserver

다른 Linux 박스의 프로세스를 디버깅하는 가장 흔한 방법입니다. 이 절의 모든 세션은 같은 VM 안에서 gdbserver와 GDB를 localhost로 연결해 돌렸습니다.

### 타깃 측

`gdbserver --help`(16.3)가 보여 주는 세 가지 실행 형태입니다.

```text
Usage:	gdbserver [OPTIONS] COMM PROG [ARGS ...]
	gdbserver [OPTIONS] --attach COMM PID
	gdbserver [OPTIONS] --multi COMM

COMM may either be a tty device (for serial debugging),
HOST:PORT to listen for a TCP connection, or '-' or 'stdio' to use
stdin/stdout of gdbserver.
```

새 프로세스를 띄우면 gdbserver는 프로그램을 세워 두고 연결을 기다립니다. `--attach`는 이미 도는 프로세스에 붙습니다.

```text
$ gdbserver :2345 ./hello
Process ./hello created; pid = 1079
Listening on port 2345
Remote debugging from host ::1, port 43500

$ gdbserver --attach :2348 1133
Attached; pid = 1133
Listening on port 2348
```

gdbserver는 Linux에서 `ptrace`로 대상을 제어합니다([Ch 1](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install)). macOS에서 같은 역할은 Xcode의 `debugserver`가 합니다.

### 호스트 측

```text
$ gdb -q ./hello
(gdb) target remote :2349
_start () at ../sysdeps/aarch64/dl-start.S:23
(gdb) break factorial
(gdb) continue
Breakpoint 1, factorial (n=5) at hello.c:5
```

`target remote`로 연결한 뒤로는 `bt`, `print`가 로컬과 같습니다. 호스트에 sysroot를 지정하지 않으면 GDB가 공유 라이브러리를 타깃에서 읽어 오고, 그때마다 경고가 나옵니다.

```text
Reading /lib/ld-linux-aarch64.so.1 from remote target...
warning: File transfers from remote targets can be slow. Use "set sysroot" to access files locally instead.
```

:::info[중요]
호스트의 GDB는 타깃에서 도는 것과 *같은 빌드*의 실행 파일(또는 그 디버그 정보)을 가져야 합니다. 타깃 파일을 strip하고 호스트에 디버그 정보를 보관했다면 바이트는 달라도 build-id가 같아야 합니다.
:::

### target remote vs target extended-remote

GDB 16.3 매뉴얼 Connecting 절의 두 모드 비교를 표로 옮기고, 이 VM에서 직접 확인한 결과를 함께 적었습니다.

| | `target remote` | `target extended-remote` |
|---|----------|--------------------|
| 프로그램 종료·detach 후 | GDB 연결이 끊기고 gdbserver도 종료 | 연결 유지, 다시 `run`이나 `attach` 가능 (gdbserver는 `--once`가 없으면 남음) |
| `run` | 지원 안 함. 실제로 `The "remote" target does not support "run".  Try "help target" or "continue".` | 지원. `set remote exec-file`로 실행할 파일 지정 |
| `attach` | 지원 안 함. gdbserver `--attach`를 씀 | 연결 뒤 `attach` 명령 가능 |

`gdbserver --multi`로 띄우고 extended-remote로 붙으면 한 연결 안에서 프로그램을 여러 번 실행할 수 있습니다. 같은 연결에서 `run` → `kill` → `run`을 하자 gdbserver가 프로세스를 두 번 만들었습니다.

```text
(gdb) target extended-remote :2346
(gdb) set remote exec-file /root/ch08/hello
(gdb) break factorial
(gdb) run
Breakpoint 1, factorial (n=5) at hello.c:5
(gdb) kill
[Inferior 1 (process 1104) killed]
(gdb) info inferiors
  Num  Description       Connection                Executable
* 1    <null>            1 (extended-remote :2346) /root/ch08/hello
(gdb) run
Breakpoint 1, factorial (n=5) at hello.c:5
(gdb) monitor exit
```

```text
# gdbserver 쪽 출력
Listening on port 2346
Remote debugging from host ::1, port 37372
Process /root/ch08/hello created; pid = 1104
Process /root/ch08/hello created; pid = 1105
```

OpenOCD 매뉴얼(0.12.0)의 GDB 연결 설명은 extended remote를 "the preferred choice"라고 적습니다.

### sysroot 지정

타깃과 호스트의 라이브러리 위치가 다르면 sysroot로 지정합니다. 크로스 환경에서는 타깃 rootfs를 호스트에 복사해 두고 그 디렉터리를 가리킵니다.

```text
(gdb) set sysroot /opt/target-rootfs
(gdb) set solib-search-path /opt/target-rootfs/usr/lib
```

GDB 16.3 매뉴얼(Files 절)에 따르면 `set sysroot remote:`는 `target:`으로 바뀌어 파일을 원격 시스템에서 가져오라는 뜻이 되고, 이는 `remote get`을 지원하는 원격 타깃에서만 됩니다. `remote get`으로 받은 libc가 원본과 같은지 확인했습니다.

```text
(gdb) set sysroot remote:
(gdb) target remote :2349
(gdb) remote get /lib/aarch64-linux-gnu/libc.so.6 /root/ch08/libc.copy
(gdb) info sharedlibrary
From                To                  Syms Read   Shared Object Library
0x0000fffff7fbeb80  0x0000fffff7fdb8a8  Yes         target:/lib/ld-linux-aarch64.so.1

$ cmp /root/ch08/libc.copy /lib/aarch64-linux-gnu/libc.so.6 && echo identical
identical
```

`debug remote` 로그에서 파일 전송은 `vFile:open`·`vFile:pread` 패킷으로 오갔습니다. 라이브러리 *목록*은 `qXfer:libraries-svr4:read`로 따로 받으므로, 목록 전달과 파일 내용 전송은 다른 기능입니다.

### SSH로 감싸기

GDB 16.3 매뉴얼 Server 절은 "gdbserver does not have any built-in security"라고 경고하고, 연결한 쪽이 gdbserver를 실행한 사용자와 같은 권한으로 타깃에 접근한다며 공개 네트워크에 연결하지 말라고 적습니다. 그래서 네트워크를 건널 때는 SSH 포트 포워딩으로 감쌉니다. 이 시리즈에서는 VM 한 대 안에서만 연결했으므로 SSH 터널은 실행하지 않았습니다.

```bash
# 호스트에서
$ ssh -L 2345:localhost:2345 user@target -N &
$ gdb ./my_program
(gdb) target remote localhost:2345
```

gdbserver의 stdio 모드(`COMM` 자리에 `-`)를 쓰면 파이프 하나로 끝납니다. 로컬에서 `target remote | gdbserver - ./hello`로 확인했고, `|` 뒤를 `ssh user@target gdbserver - ./prog`로 바꾸면 SSH를 거칩니다.

```text
(gdb) target remote | gdbserver - ./hello
stdin/stdout redirected
Process ./hello created; pid = 1132
Remote debugging using stdio
...
Breakpoint 1, factorial (n=5) at hello.c:5
```

## 크로스 아키텍처 — gdb-multiarch

호스트와 타깃의 아키텍처가 다르면 [Ch 1](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install)의 `gdb-multiarch`를 씁니다. 보드 대신 QEMU user mode(`qemu-arm` 10.0.13)를 스텁으로 썼습니다. `qemu-arm -g 1234`는 32비트 ARM 프로그램을 첫 명령에 세워 두고 RSP 연결을 기다립니다.

```text
$ arm-linux-gnueabihf-gcc -g -O0 -static hello.c -o hello-arm
$ qemu-arm -g 1234 ./hello-arm &
$ gdb-multiarch -q ./hello-arm
(gdb) set architecture arm
The target architecture is set to "arm".
(gdb) target remote :1234
0x00010258 in _start ()
(gdb) break factorial
Breakpoint 1 at 0x10360: file hello.c, line 5.
(gdb) continue
Breakpoint 1, factorial (n=5) at hello.c:5
(gdb) info registers r0 sp pc cpsr
r0             0x5                 5
sp             0x40800bf0          0x40800bf0
pc             0x10360             0x10360 <factorial+8>
cpsr           0xd0030             852016
```

`set debug remote 1`을 켜고 `stepi`를 하면 gdbserver와의 차이가 보입니다. ACK가 패킷마다 오가고, libc의 Thumb 코드(`0x1bedc`)에 건 내부 breakpoint는 kind 2(16비트 Thumb)입니다.

```text
[remote] Sending packet: $Z0,1bedc,2#d3
[remote] Received Ack
[remote] Packet received: OK
[remote] Sending packet: $vCont;s:p82a.82a#26
[remote] Received Ack
```

## lldb-server

LLDB의 원격 스텁은 `lldb-server`입니다. [LLDB 문서 Remote Debugging](https://lldb.llvm.org/use/remote.html)에 따르면 Linux·Android에서는 `lldb-server` 한 바이너리가 *platform* 기능과 gdb-remote 스텁을 모두 갖고, macOS·iOS에서는 gdb-remote 기능을 `debugserver`가 맡습니다.

### gdbserver 모드

`lldb-server gdbserver`는 gdbserver와 같은 자리에 섭니다. LLDB의 `gdb-remote` 명령으로 붙었습니다.

```text
$ lldb-server gdbserver 127.0.0.1:2351 ./hello &
$ lldb /root/ch08/hello
(lldb) gdb-remote 127.0.0.1:2351
Process 1516 stopped
* thread #1, name = 'hello', stop reason = signal SIGSTOP
    frame #0: 0x0000fffff7fd92c0 ld-linux-aarch64.so.1`_start at dl-start.S:23
(lldb) b factorial
(lldb) continue
* thread #1, name = 'hello', stop reason = breakpoint 1.1
    frame #0: 0x0000aaaaaaaa07b4 hello`factorial(n=5) at hello.c:5:8
(lldb) frame variable n
(int) n = 5
```

같은 RSP를 쓰므로 LLDB는 GDB의 gdbserver에도 붙습니다. `gdbserver :2352 ./hello`에 `gdb-remote`로 연결해도 `factorial`에서 멈추고 `n = 5`가 보였습니다. 다만 끝낼 때 `process kill`이 `failed to send k packet`으로 끝나, 섞어 쓸 때의 세부 동작은 조합마다 확인해야 했습니다.

### platform 모드

platform 모드는 파일 전송과 프로세스 실행까지 원격에 맡기는 계층입니다. LLDB 문서의 절차는 다음과 같습니다.

```bash
# 타깃
$ lldb-server platform --listen "*:1234" --server

# 호스트
(lldb) platform select remote-linux
(lldb) platform connect connect://remote:1234
(lldb) file a.out
(lldb) run
```

문서에 따르면 `--server`는 연결마다 새 프로세스를 띄우고, `run`은 로컬 실행 파일이 바뀌었을 때만 platform의 작업 디렉터리로 업로드한 뒤 lldb-server를 gdb-remote 모드로 띄워 연결합니다. 이 VM 한 대에서 호스트와 타깃을 겸해 시험했을 때 `platform connect`는 `OS Version: 6.12.116 (6.12.116+deb13-arm64)`, `WorkingDir: /root/ch08`까지 보여 줬지만, `process launch`는 `error: unable to launch a GDB server on 'localhost'`로 실패했습니다. 원인은 추적하지 않았으므로 이 장은 gdbserver 모드만 성공 사례로 둡니다.

### debugserver

macOS의 `debugserver`는 Xcode 안에 있고, Apple 서명과 디버거용 private entitlement를 갖고 있습니다. 이 Mac의 Xcode에서 확인한 값입니다.

```text
$ codesign -dvvv /Applications/Xcode.app/Contents/SharedFrameworks/LLDB.framework/Resources/debugserver
Identifier=com.apple.debugserver
Format=Mach-O universal (arm64e.x1 arm64e arm64)
Authority=Software Signing
Authority=Apple Code Signing Certification Authority
Authority=Apple Root CA
$ codesign -d --entitlements - .../debugserver | grep -o 'com.apple[a-z.-]*' | sort -u
com.apple.private.cs.debugger
com.apple.private.logging.diagnostic
com.apple.private.set-exception-port
com.apple.private.thread-set-state
```

## 베어메탈 연결 — 서버와 target을 분리하기

MCU에서는 gdbserver 대신 OpenOCD나 J-Link GDB Server가 probe를 통해 칩을 제어합니다. 이 장은 GDB 쪽 연결 순서만 다루고, 배선·CoreSight·trace는 전용 장으로 연결합니다. 이 시리즈에서는 probe나 보드를 연결하지 않았습니다.

probe가 JTAG로 붙을 때 TMS 값에 따라 오가는 TAP 상태는 16개이며, 아래 그림의 상태 이름과 전이는 OpenOCD 0.12.0 `src/jtag/interface.c`의 `tap_state_transition()`(223행)을 옮긴 것입니다.

![JTAG TAP 상태 머신 — RESET·RUN/IDLE과 DR·IR 두 스캔 경로의 16개 상태, 화살표마다 TMS 값 0 또는 1](/images/blog/gdb-lldb/diagrams/ch08-jtag-tap-fsm.svg)

### OpenOCD 예시

Debian 13의 OpenOCD 0.12.0 패키지에는 ST-Link 인터페이스와 STM32F4 타깃 설정이 들어 있습니다. probe 없이 실행하면 설정은 읽히고 adapter를 여는 단계에서 멈춥니다.

```text
$ openocd -f interface/stlink.cfg -f target/stm32f4x.cfg
Open On-Chip Debugger 0.12.0
Info : auto-selecting first available session transport "hla_swd". To override use 'transport select <transport>'.
Info : The selected transport took over low-level target control. The results might differ compared to plain JTAG/SWD
Info : Listening on port 6666 for tcl connections
Info : Listening on port 4444 for telnet connections
Info : clock speed 2000 kHz
Error: open failed
```

probe가 붙어 있으면 OpenOCD가 GDB 포트를 엽니다. OpenOCD 0.12.0 매뉴얼은 기본 포트를 3333으로 적고, GDB 세션 예로 다음 순서를 듭니다.

```text
$ arm-none-eabi-gdb example.elf
(gdb) target extended-remote localhost:3333
(gdb) monitor reset halt
(gdb) load
(gdb) continue
```

`monitor` 뒤의 문자열은 RSP `qRcmd` 패킷으로 스텁에 그대로 전달됩니다(GDB 16.3 매뉴얼 General Query Packets 절). `reset halt`는 OpenOCD 자신의 명령입니다. `load`에 대해 OpenOCD 매뉴얼은 "GDB will look at the target memory map when a load command is given, if any areas to be programmed lie within the target flash area the vFlash packets will be used"라고 설명하므로, flash 영역에 쓸 때는 `M` 패킷이 아니라 `vFlashErase`·`vFlashWrite`·`vFlashDone`이 쓰입니다.

![OpenOCD 계층 — GDB가 TCP 3333으로 RSP를 보내면 GDB server, target·flash 드라이버, adapter 드라이버를 거쳐 probe와 MCU에 닿고, target과 interface 설정 파일이 각 계층을 고른다](/images/blog/gdb-lldb/diagrams/ch08-openocd-stack.svg)

위 실행에서 `interface/stlink.cfg`가 adapter(전송 방식 `hla_swd`)를, `target/stm32f4x.cfg`가 칩을 골랐습니다. 두 `-f`가 각 계층을 따로 정하므로 같은 칩 설정을 다른 probe와 조합할 수 있습니다.

### J-Link 예시

이 시리즈에서는 J-Link를 실행하지 않았습니다. 아래 형식은 SEGGER의 [J-Link GDB Server 문서](https://kb.segger.com/J-Link_GDB_Server)를 따른 것입니다. 문서의 Command line options 절에 `-device`, `-if`, `-speed`가 있고, GDB에서는 `target remote localhost:2331`로 연결하라고 적혀 있습니다. 같은 문서는 GDB 시작 명령으로 `monitor reset`과 `load`를 듭니다.

```bash
JLinkGDBServer -device STM32F407VG -if SWD -speed 1000
arm-none-eabi-gdb firmware.elf
```

```text
(gdb) target remote localhost:2331
(gdb) monitor reset
(gdb) load
(gdb) continue
```

부품 번호와 speed는 보드·probe에 맞게 정하며, 위 값은 형식을 보여 주는 예입니다.

### core 레지스터를 해석할 때

Cortex-M4의 DHCSR(Debug Halting Control and Status Register)에서 C_STEP은 bit 2, C_MASKINTS는 bit 3입니다. [Arm CMSIS_6 core_cm4.h](https://github.com/ARM-software/CMSIS_6/blob/main/CMSIS/Core/Include/core_cm4.h)의 `DCB_DHCSR_C_STEP_Pos 2U`, `DCB_DHCSR_C_MASKINTS_Pos 3U` 정의에서 확인했습니다.

![Cortex-M 디버그 접근 경로 — probe가 SWD 또는 JTAG로 DP에, DP가 MEM-AP를 거쳐 DHCSR·FPB·DWT 레지스터에 닿는다](/images/blog/gdb-lldb/diagrams/ch08-coresight-arch.svg)

OpenOCD 0.12.0의 Cortex-M 코드(`src/target/cortex_m.c`)도 `mem_ap_read_u32(armv7m->debug_ap, DCB_DHCSR, ...)`처럼 MEM-AP를 거쳐 DHCSR을 읽고, 앞에서 본 대로 `FP_CTRL`·`DWT_CTRL`을 읽어 비교기 수를 알아냅니다.

- [JTAG·SWD·CoreSight](/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight) — 배선과 실제 debug 자원
- [OpenOCD](/blog/tools/debugging/embedded/chapter03-openocd) — adapter·target·reset 설정
- [J-Link](/blog/tools/debugging/embedded/chapter04-jlink) — 서버와 probe 기능
- [Trace](/blog/tools/debugging/embedded/chapter06-trace) — RTT·ITM·ETM의 별도 전제

## RSP checksum 직접 계산하기

체크섬 규칙은 위 gdbserver 로그로 바로 검증됩니다. `$g#67`과 `$?#3f`가 로그에 그대로 있었습니다. 같은 계산을 코드로 옮기면 다음과 같고, Node.js 24.21.0에서 통과했습니다. 단순 ASCII payload만 다루며, 매뉴얼이 정의하는 escape·run-length 인코딩은 구현하지 않았습니다.

```js title="rsp-check.mjs"
import assert from "node:assert/strict";
function packet(payload) {
    assert.match(payload, /^[A-Za-z0-9?]+$/);
    const sum = [...Buffer.from(payload)].reduce((a, b) => (a+b)&255, 0);
    return "$" + payload + "#" + sum.toString(16).padStart(2, "0");
}
assert.equal(packet("g"), "$g#67");
assert.equal(packet("?"), "$?#3f");
assert.throws(() => packet("a#b"));
console.log("ASCII RSP framing checks passed");
```

## 정리

- RSP 패킷은 `$payload#checksum`이고, 체크섬은 payload의 modulo 256 합입니다. gdbserver는 `QStartNoAckMode`로 ACK를 끄고, QEMU 스텁은 ACK를 유지했습니다.
- `qSupported`로 기능을 협상합니다. `+`·`-`·`=`·`?`의 뜻은 매뉴얼에 정의되어 있습니다.
- arm64 gdbserver에서 `Z0`의 kind는 4, QEMU의 Thumb 코드에서는 2였습니다.
- `target remote`는 `run`을 지원하지 않고, `extended-remote` + `gdbserver --multi`는 한 연결에서 여러 번 실행합니다.
- `set sysroot remote:` + `remote get`으로 타깃 파일을 가져옵니다. gdbserver에는 인증이 없으니 네트워크를 건널 땐 SSH로 감쌉니다.
- lldb-server gdbserver 모드는 GDB의 gdbserver와 같은 RSP라 서로 붙습니다. platform 모드는 이 VM에서 launch에 실패했습니다.
- 베어메탈은 OpenOCD(기본 포트 3333, extended remote 권장)와 J-Link(2331)가 스텁입니다. 이 시리즈는 probe 없이 OpenOCD 설정 로딩까지만 실행했습니다.

## 다음 장 예고

[Ch 9: Python 스크립팅](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting)은 반복 작업을 명령으로, 복잡한 구조를 pretty-printer로 만드는 GDB·LLDB의 Python API를 다룹니다.

## 관련 항목

- [Ch 7: core dump 분석](/blog/tools/debugging/gdb-lldb/chapter07-core-dump)
- [Ch 9: Python 스크립팅](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting)
- [Ch 12: DWARF](/blog/tools/debugging/gdb-lldb/chapter12-dwarf) — 콜스택 풀기의 정체
- [Modern Embedded Recipes — JTAG 안 붙을 때](/blog/embedded/modern-recipes/part10-02-jtag-swd) — 트러블슈팅 시각
- [GDB RSP 명세](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Remote-Protocol.html)
- [ARMv7-M Architecture Reference Manual](https://developer.arm.com/documentation/ddi0403/latest/) — CoreSight 전체
- [OpenOCD 공식](https://openocd.org/)
- [Segger J-Link Wiki](https://wiki.segger.com/Main_Page)
