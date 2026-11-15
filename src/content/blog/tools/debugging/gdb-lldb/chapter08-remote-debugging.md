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


GDB가 실행되는 *호스트*와 디버깅 대상이 도는 *타깃*은 같은 컴퓨터가 아니어도 됩니다. 라즈베리파이, x86 서버, ARM 보드, Cortex-M MCU — 모두 한 끝에 GDB Remote Serial Protocol(이하 RSP)을 말할 줄 아는 *스텁*만 있으면 GDB가 마치 로컬처럼 디버깅합니다.

이 장은 RSP 프로토콜의 정체에서 출발해 두 갈래로 나아갑니다.

1. **OS가 있는 원격 머신** — gdbserver / lldb-server. 가벼운 협조 모델.
2. **베어메탈 MCU** — OpenOCD / J-Link → JTAG/SWD → ARM CoreSight 디버그 회로.

베어메탈 쪽이 더 깊어 보이지만 GDB 쪽의 표현은 같습니다. 어디까지가 *GDB의 일*이고 어디부터가 *스텁의 일*인지 구분하면 두 갈래가 한 그림으로 모입니다.

## RSP — Remote Serial Protocol

RSP는 GDB와 원격 stub가 명령·응답을 주고받는 패킷 기반 프로토콜입니다. 단순함이 미덕 — 시리얼 9600bps에서 USB 3.0까지 같은 메시지가 통합니다.

### 패킷 형식

```text
$<payload>#<checksum>
```

- `$` — 시작.
- `<payload>` — 명령/응답 본문.
- `#` — 종료.
- `<checksum>` — payload 바이트의 8-bit 합 % 256, 16진 두 자리.

`+`로 ACK, `-`로 NACK. 노이즈가 많은 시리얼선에서는 패킷 재전송이 빈번해 신호 무결성이 핵심.

### 자주 쓰이는 패킷

| 패킷 | 의미 | 응답 |
|------|------|------|
| `?` | 정지 사유 | `T05thread:01;` (SIGTRAP, thread 1) |
| `g` | 모든 레지스터 읽기 | 16진 인코딩된 전체 레지스터 |
| `G<hex>` | 모든 레지스터 쓰기 | `OK` |
| `p<n>` | 한 레지스터 읽기 | `<hex>` |
| `m<addr>,<len>` | 메모리 읽기 | `<hex bytes>` |
| `M<addr>,<len>:<hex>` | 메모리 쓰기 | `OK` |
| `c[addr]` | continue (선택적으로 지정 주소부터) | 다음 stop 패킷 |
| `s[addr]` | single-step (선택적으로 지정 주소부터) | 다음 stop 패킷 |
| `Z0,<addr>,<kind>` | software 브레이크포인트 설정 | `OK` |
| `Z1,<addr>,<kind>` | hardware 브레이크포인트 | `OK` |
| `Z2,<addr>,<len>` | write watchpoint | `OK` |
| `Z3` / `Z4` | read / access watchpoint | `OK` |
| `z*` | 위 BP/WP 제거 | `OK` |
| `qSupported` | feature negotiation | 세미콜론 구분 능력 목록 |
| `vCont;<actions>` | 다중 스레드 제어 | 다음 stop |
| `qXfer:features:read:target.xml:...` | 아키텍처 XML 전송 | XML 청크 |
| `k` | kill | (응답 없음) |

### 트래픽 형식 예시

아래는 패킷 종류와 순서를 설명하기 위한 합성 예시입니다. `set debug remote 1`에서 캡처한 세션이 아니며 주소·feature 목록은 특정 서버의 결과를 뜻하지 않습니다.

```text
Sending: "qSupported:multiprocess+;swbreak+;hwbreak+;..."
Got:     "PacketSize=3fff;qXfer:features:read+;..."
Sending: "vMustReplyEmpty"
Got:     ""
Sending: "qXfer:features:read:target.xml:0,ffb"
Got:     "l<target><architecture>i386:x86-64</architecture>..."
Sending: "?"
Got:     "T05thread:p3039.3039;..."
Sending: "Hg0"               # 다음 g 명령을 위한 thread 컨텍스트
Got:     "OK"
Sending: "g"
Got:     "0000000000000000ffffffff..."    # 레지스터 덤프
Sending: "Z0,401130,1"      # main 진입에 sw BP
Got:     "OK"
Sending: "vCont;c"
Got:     "T05swbreak:;thread:p3039.3039;"
```

스텁이 gdbserver든 OpenOCD든 J-Link 펌웨어든, GDB는 *이 패킷*만 봅니다. 본격 디버거를 만들고 싶다면 [RSP 명세](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Remote-Protocol.html)를 정독하면 됩니다.

### qSupported — feature negotiation

연결 직후 첫 패킷이 `qSupported`. 상호 능력을 협상합니다.

```text
GDB:  qSupported:multiprocess+;swbreak+;hwbreak+;qRelocInsn+;fork-events+;
      vfork-events+;exec-events+;vContSupported+;QThreadEvents+;no-resumed+;
      memory-tagging+;xmlRegisters=i386
Stub: PacketSize=2000;QPassSignals+;QProgramSignals+;QStartupWithShell+;
      QEnvironmentHashCheck+;QEnvironmentReset+;QEnvironmentUnset+;
      QEnvironmentSet+;QSetWorkingDir+;qXfer:features:read+;
      qXfer:libraries-svr4:read+;qXfer:auxv:read+;qXfer:exec-file:read+;
      qXfer:siginfo:read+;qXfer:siginfo:write+;QCatchSyscalls+;
      QPassSignals+;swbreak+;hwbreak+;...
```

feature+는 지원, feature-는 미지원, feature=value는 값 전달입니다. feature?는 stub의 응답에 따라 GDB가 추가 협상을 요청할 수 있다는 표기이며 막연한 조건부 지원과 구분합니다. 이 한 줄로 GDB가 *이 스텁에서는 무엇을 할 수 있는지* 결정합니다.

### Software vs Hardware breakpoint

- **SW BP** (`Z0`) — 지원되는 타깃 주소의 명령 바이트를 ISA에 맞는 trap 명령으로 바꾸고 원래 내용을 보관합니다. x86 INT3는 1바이트지만 명령 길이와 패치 방식은 ISA·서버에 따릅니다.
  - 장점: 보통 하드웨어 비교기 슬롯 수에 직접 묶이지 않습니다.
  - 단점: 서버가 코드를 패치할 수 있어야 합니다. flash에서는 별도 flash-breakpoint 지원이 필요할 수 있습니다.
- **HW BP** (`Z1`) — 칩 안의 BP 레지스터에 *주소 비교기*를 설치. 명령어를 건드리지 않음.
  - 장점: ROM/flash에서 동작.
  - 단점: 칩마다 4~6개 등 *유한*.

FPB 비교기 수는 core·구현에 따라 다릅니다. 실제 서버의 hardware resource 정보를 확인하고 삽입 실패 메시지를 검사해야 하며, 한도를 넘으면 언제나 조용히 무시된다고 가정하지 않습니다.

## OS 있는 원격 — gdbserver

가장 일반적: 다른 리눅스 박스의 프로세스를 디버깅.

### 타깃 측

```bash
# 새 프로세스 시작
$ gdbserver :2345 ./my_program arg1 arg2
Process ./my_program created; pid = 5678
Listening on port 2345

# 또는 이미 도는 프로세스에 attach
$ gdbserver --attach :2345 5678

# 또는 멀티 인스턴스(여러 디버그 세션을 같은 데몬에서)
$ gdbserver --multi :2345

# Unix 소켓
# Unix socket 지원은 설치한 gdbserver 판의 help와 문서를 확인

# 시리얼
$ gdbserver /dev/ttyS0 ./my_program
```

`gdbserver`는 GDB 소스 트리 안에 있는 가벼운 데몬입니다. 하는 일은 셋.

1. ptrace로 디버기 attach (Linux).
2. RSP 패킷을 받아 ptrace 호출로 변환.
3. 응답을 RSP로 돌려보냄.

ptrace에 대한 자세한 동작은 [Ch 1](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install) 참고. Darwin의 LLDB는 debugserver 경로를 사용하며 Linux의 gdbserver와 구분합니다.

### 호스트 측

```bash
$ gdb ./my_program
(gdb) target remote 192.168.1.20:2345
Remote debugging using 192.168.1.20:2345
0x00007f... in __libc_start_main ()
(gdb) break main
(gdb) continue
```

`target remote`로 연결한 뒤로는 로컬과 같습니다. `bt`, `info threads`, `print` 다 됩니다.

:::info[중요]
호스트의 GDB는 *호스트에 있는 같은 실행 파일*을 알아야 합니다. 심볼이 거기 박혀 있으니까요. 동일 빌드의 코드·주소 배치·라이브러리와 맞아야 합니다. 타깃 파일을 strip하고 host에 debuginfo를 보존한 경우 전체 바이트는 다를 수 있으므로 UUID/build-id와 artifact 이력으로 매칭합니다.
:::

### target remote vs target extended-remote

| | `remote` | `extended-remote` |
|---|----------|--------------------|
| `kill` | 세션 종료 | 디버기만 종료, 연결 유지 |
| `run` | 불가 | 가능(재시작) |
| `attach` PID | 불가 | 가능 |
| 멀티프로세스 | 제한적 | 완전 지원 |

OpenOCD와 J-Link는 보통 *extended*로 연결. 시퀀스 `monitor reset halt` → `load` → `monitor reset halt` → `continue` 반복이 가능해야 하기 때문입니다.

### sysroot 지정

타깃과 호스트의 라이브러리 위치가 다르면 sysroot로 지정.

```text
(gdb) set sysroot /opt/target-rootfs
(gdb) set solib-search-path /opt/target-rootfs/usr/lib
```

크로스 컴파일 환경에서 흔히 씁니다. ARM 타깃의 `/lib/libc.so.6`이 호스트에는 없으니, 타깃 rootfs를 복사해 두고 거기를 가리킵니다.

지원되는 stub의 file transfer 기능으로 타깃의 라이브러리를 자동으로 끌어올 수도 있습니다.

```text
(gdb) set sysroot remote:
(gdb) remote get /lib/libc.so.6 /tmp/libc.so.6
```

원격 sysroot의 파일 전송은 vFile 계열 지원과 관련되며 qXfer:libraries-svr4는 라이브러리 목록 정보를 전달합니다. 라이브러리 목록과 파일 내용 전송은 다른 기능입니다. 가장 편하지만 트래픽이 많아짐.

### SSH 터널로 보안

`gdbserver`는 인증·암호화가 없습니다. 인터넷을 가로지르면 SSH로 감쌉니다.

```bash
# 호스트에서
$ ssh -L 2345:localhost:2345 user@target -N &
$ gdb ./my_program
(gdb) target remote localhost:2345
```

또는 stdio를 통째로 SSH로 보내는 한 줄.

```text
(gdb) target remote | ssh user@target gdbserver - ./my_program
```

`gdbserver -`는 stdin/stdout으로 RSP를 합니다.

운영 환경 권장: SSH 터널 + non-root gdbserver + 강력한 ptrace 제한(`/proc/sys/kernel/yama/ptrace_scope=1`).

## lldb-server

LLDB도 같은 모델. 플랫폼별 서버 배포·지원 범위를 확인해야 하며, *플랫폼* 모드라는 추상 레이어가 추가됩니다.

```bash
# 타깃
$ lldb-server platform --listen "*:2345" --server

# 호스트
$ lldb
(lldb) platform select remote-linux
(lldb) platform connect connect://192.168.1.20:2345
(lldb) target create ./my_program
(lldb) process launch
```

플랫폼 모드는 *파일 시스템 작업*까지 RSP-LLDB 확장으로 처리합니다 — target create만으로 모든 구성에서 자동 전송되는 것은 아닙니다. 원격 설치 경로·platform file install·launch 설정은 서버 문서에 따라 명시합니다.

Darwin/iOS에서는 Xcode의 debugserver와 코드 서명·device 지원 체계를 별도로 확인합니다.

### debugserver vs lldb-server

macOS / iOS는 historic 이유로 `debugserver`라는 별도 바이너리를 씁니다. Xcode 안에 묶여 있고, Apple Developer 도구로만 배포. 인터페이스는 lldb-server와 거의 같지만 코드 사이닝·entitlement가 추가로 필요합니다.

```bash
$ codesign -dvvv $(which debugserver)
```

## 베어메탈 연결 — 서버와 target을 분리하기

MCU에서는 Linux gdbserver 대신 OpenOCD·J-Link GDB Server가 probe를 통해 칩을 제어합니다. 이 장은 GDB 연결 순서를 다루고, 배선·CoreSight·trace의 세부 구현은 전용 장으로 연결합니다. 이 검토에서는 probe나 보드를 연결하지 않았습니다.

### OpenOCD 예시

아래 파일 이름은 ST-Link와 STM32F4 조합의 예입니다. 실제 board/target cfg·flash bank·reset 구성을 확인한 뒤 사용합니다.

```bash
openocd -f interface/stlink.cfg -f target/stm32f4x.cfg
arm-none-eabi-gdb firmware.elf
```

```text
(gdb) target extended-remote localhost:3333
(gdb) monitor reset halt
(gdb) load
(gdb) monitor reset halt
(gdb) break main
(gdb) continue
```

monitor는 RSP qRcmd를 통해 서버 명령을 전달합니다. flash 쓰기는 stub의 vFlashErase/vFlashWrite/vFlashDone 지원 경로도 사용하며, 모든 load가 M 패킷만 사용한다고 가정하면 안 됩니다. linker의 section·LMA·target memory map과 서버 flash driver를 함께 확인합니다.

기존 가공 load 로그는 section 크기 합 0x1c0+0x9d20+0x4c0+0x140=0xa4e0(42208)와 total 41960이 충돌해 실행 기록으로 제거했습니다. 실제 load 로그와 map 파일이 있어야 전송량·검증 성공을 주장할 수 있습니다.

### J-Link 예시

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

부품 번호와 speed는 실제 board·probe·라이선스·전압에 맞게 정합니다. 이 값은 보편적인 안전 속도나 성능 비교의 근거가 아닙니다. RTT 자체가 RTOS plugin을 요구하지는 않으며, J-Link flash breakpoint의 내부 구현을 SRAM 페이지 실행으로 단정하지 않습니다.

### core와 보호 설정을 해석할 때

Cortex-M4 DHCSR의 C_STEP은 bit 2, C_MASKINTS는 bit 3이므로 같은 [5:2] 전체를 reserved로 적을 수 없습니다. 정확한 비트는 [Arm CMSIS core_cm4.h](https://github.com/ARM-software/CMSIS_6/blob/main/CMSIS/Core/Include/core_cm4.h)의 마스크로 확인합니다. breakpoint·watchpoint 수는 구현별 레지스터와 서버 출력으로 확인합니다.

RDP·APPROTECT·secure boot는 서로 다른 벤더 기능입니다. 예를 들어 STM32의 RDP 단계 전환을 모든 MCU에 일반화하거나 debugger attach만으로 항상 erase된다고 해석하면 안 됩니다. 부품 reference manual과 복구·영구 잠금 조건을 확인해야 합니다.

- [JTAG·SWD·CoreSight](/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight) — 배선과 실제 debug 자원
- [OpenOCD](/blog/tools/debugging/embedded/chapter03-openocd) — adapter·target·reset 설정
- [J-Link](/blog/tools/debugging/embedded/chapter04-jlink) — 서버와 probe 기능
- [Trace](/blog/tools/debugging/embedded/chapter06-trace) — RTT·ITM·ETM의 별도 전제

## 실행 범위 — RSP checksum과 로컬 아키텍처

다음 검증은 네트워크나 probe를 사용하지 않고 단순 ASCII payload의 framing만 검사합니다. reserved 문자 escaping·binary·run-length encoding·ACK 상태 머신까지 구현한 stub는 아닙니다.

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

- OS 프로세스의 원격 디버깅과 MCU probe 연결을 구분합니다.
- host artifact는 타깃의 동일 빌드 코드·라이브러리·디버그 정보와 맞춥니다.
- RSP 능력 협상·파일 전송·flash 쓰기는 서로 다른 기능입니다.
- OpenOCD와 J-Link는 정확한 target·reset·memory map 설정이 필요합니다.
- 보드 자원 수와 보호 설정은 부품 문서·실제 로그로 확인합니다.
- 이 검토의 실행은 로컬 framing·아키텍처 조회이며 원격·보드 성공은 포함하지 않습니다.

## 다음 장 예고

Ch 9 — Python 스크립팅. 반복 작업을 명령으로, 복잡한 구조를 pretty-printer로. GDB의 진짜 확장성은 여기서 열립니다.

## 관련 항목

- [Ch 7: core dump 분석](/blog/tools/debugging/gdb-lldb/chapter07-core-dump)
- [Ch 9: Python 스크립팅](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting)
- [Ch 12: DWARF](/blog/tools/debugging/gdb-lldb/chapter12-dwarf) — 콜스택 풀기의 정체
- [Modern Embedded Recipes — JTAG 안 붙을 때](/blog/embedded/modern-recipes/part10-02-jtag-swd) — 트러블슈팅 시각
- [GDB RSP 명세](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Remote-Protocol.html)
- [ARMv7-M Architecture Reference Manual](https://developer.arm.com/documentation/ddi0403/latest/) — CoreSight 전체
- [OpenOCD 공식](https://openocd.org/)
- [Segger J-Link Wiki](https://wiki.segger.com/Main_Page)
