---
title: "Ch 8: 원격 디버깅 — gdbserver / OpenOCD / J-Link"
date: 2025-08-20T08:00:00
description: "다른 머신·MCU를 GDB로. RSP, gdbserver, OpenOCD, J-Link, JTAG/SWD, ARM CoreSight."
tags: [gdb, Remote Debug, gdbserver, OpenOCD, JTAG, ARM]
series: "GDB and LLDB"
seriesOrder: 8
draft: false
---

GDB가 실행되는 *호스트*와 디버깅 대상이 도는 *타깃*은 같은 컴퓨터가 아니어도 됩니다. 라즈베리파이, x86 서버, ARM 보드, Cortex-M MCU — 모두 한 끝에 GDB Remote Serial Protocol(이하 RSP)을 말할 줄 아는 *스텁*만 있으면 GDB가 마치 로컬처럼 디버깅합니다.

이 장은 RSP 프로토콜의 정체에서 출발해 두 갈래로 나아갑니다.

1. **OS가 있는 원격 머신** — gdbserver / lldb-server. 가벼운 협조 모델.
2. **베어메탈 MCU** — OpenOCD / J-Link → JTAG/SWD → ARM CoreSight 디버그 회로.

베어메탈 쪽이 더 깊어 보이지만 GDB 쪽의 표현은 같습니다. 어디까지가 *GDB의 일*이고 어디부터가 *스텁의 일*인지 구분하면 두 갈래가 한 그림으로 모입니다.

## RSP — Remote Serial Protocol

RSP는 1989년 GDB 4.x 시절 도입된 ASCII 패킷 기반 텍스트 프로토콜입니다. 단순함이 미덕 — 시리얼 9600bps에서 USB 3.0까지 같은 메시지가 통합니다.

### 패킷 형식

```
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
| `c<addr>?` | continue (옵션: 주소부터) | 다음 stop 패킷 |
| `s<addr>?` | single-step | 다음 stop 패킷 |
| `Z0,<addr>,<kind>` | software 브레이크포인트 설정 | `OK` |
| `Z1,<addr>,<kind>` | hardware 브레이크포인트 | `OK` |
| `Z2,<addr>,<len>` | write watchpoint | `OK` |
| `Z3` / `Z4` | read / access watchpoint | `OK` |
| `z*` | 위 BP/WP 제거 | `OK` |
| `qSupported` | feature negotiation | 쉼표 구분 능력 목록 |
| `vCont;<actions>` | 다중 스레드 제어 | 다음 stop |
| `qXfer:features:read:target.xml:...` | 아키텍처 XML 전송 | XML 청크 |
| `k` | kill | (응답 없음) |

### 실제 트래픽 한 컷

`break main` + `continue`를 친 직후의 RSP 트래픽(GDB `set debug remote 1`로 노출).

```
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

스텁이 누구든 — gdbserver든 OpenOCD든 J-Link 펌웨어든 — GDB는 *이 패킷*만 봅니다. 본격 디버거를 만들고 싶다면 [RSP 명세](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Remote-Protocol.html)를 정독하면 됩니다.

### qSupported — feature negotiation

연결 직후 첫 패킷이 `qSupported`. 상호 능력을 협상합니다.

```
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

`xxx+` = 지원, `xxx-` = 미지원, `xxx?` = 조건부. 이 한 줄로 GDB가 *이 스텁에서는 무엇을 할 수 있는지* 결정합니다.

### Software vs Hardware breakpoint

- **SW BP** (`Z0`) — 스텁이 *명령어 한 바이트를* `0xCC`(x86 INT3) 또는 ARM `BKPT`로 갈아 끼웁니다. 원래 명령은 별도 저장.
  - 장점: 개수 무제한.
  - 단점: 메모리가 *쓰기 가능*해야 함 — flash 같은 ROM에선 불가능.
- **HW BP** (`Z1`) — 칩 안의 BP 레지스터에 *주소 비교기*를 설치. 명령어를 건드리지 않음.
  - 장점: ROM/flash에서 동작.
  - 단점: 칩마다 4~6개 등 *유한*.

Cortex-M의 FPB(Flash Patch and Breakpoint) 유닛은 보통 6개의 HW BP를 제공합니다. 6개 다 쓰면 다음 BP는 *침묵*하므로 `info breakpoints`로 종종 확인해야 합니다.

## OS 있는 원격 — gdbserver

가장 일반적: 다른 리눅스 박스의 프로세스를 디버깅.

### 타깃 측

```bash
# 새 프로세스 시작
$ gdbserver :2345 ./my_program arg1 arg2
Process ./my_program created; pid = 5678
Listening on port 2345

# 또는 이미 도는 프로세스에 attach
$ gdbserver :2345 --attach 5678

# 또는 멀티 인스턴스(여러 디버그 세션을 같은 데몬에서)
$ gdbserver --multi :2345

# Unix 소켓
$ gdbserver unix:/tmp/gdb.sock ./my_program

# 시리얼
$ gdbserver /dev/ttyS0 ./my_program
```

`gdbserver`는 GDB 소스 트리 안에 있는 가벼운 데몬입니다. 하는 일은 셋.

1. ptrace로 디버기 attach (Linux).
2. RSP 패킷을 받아 ptrace 호출로 변환.
3. 응답을 RSP로 돌려보냄.

ptrace에 대한 자세한 동작은 [Ch 1](/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install) 참고. macOS는 ptrace 대신 Mach Exception API, Windows는 `DebugActiveProcess`를 씁니다. lldb-server는 이 모든 백엔드를 통합합니다.

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

> **중요** — 호스트의 GDB는 *호스트에 있는 같은 실행 파일*을 알아야 합니다. 심볼이 거기 박혀 있으니까요. 타깃 바이너리와 비트 단위로 같아야 합니다 (혹은 같은 build-id).

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

GDB 7.4+ 의 *file transfer*로 타깃의 라이브러리를 자동으로 끌어올 수도 있습니다.

```text
(gdb) set sysroot remote:
(gdb) remote get /lib/libc.so.6 /tmp/libc.so.6
```

`remote:` sysroot는 GDB가 `qXfer:libraries-svr4`로 타깃에서 *직접* 메타정보를 가져옵니다. 가장 편하지만 트래픽이 많아짐.

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

LLDB도 같은 모델. macOS / iOS / Linux 모두 지원하고, *플랫폼* 모드라는 추상 레이어가 추가됩니다.

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

플랫폼 모드는 *파일 시스템 작업*까지 RSP-LLDB 확장으로 처리합니다 — 호스트의 `target create`가 자동으로 타깃에 바이너리를 전송합니다. 가장 매끄러운 크로스 디버깅 경험.

iOS 기기 디버깅이 평소 우리가 가장 자주 만나는 lldb-server 사례입니다 (Xcode가 내부적으로 lldb-server를 갖다 씁니다).

### debugserver vs lldb-server

macOS / iOS는 historic 이유로 `debugserver`라는 별도 바이너리를 씁니다. Xcode 안에 묶여 있고, Apple Developer 도구로만 배포. 인터페이스는 lldb-server와 거의 같지만 코드 사이닝·entitlement가 추가로 필요합니다.

```bash
$ codesign -dvvv $(which debugserver)
```

## 베어메탈 — JTAG / SWD가 뭔가

여기서부터가 임베디드. MCU에는 OS가 없으니 gdbserver를 못 돌립니다. 대신 *칩 안*에 디버그 모듈이 있고, 그걸 *외부에서* JTAG 또는 SWD 핀으로 두드립니다.

### JTAG (IEEE 1149.1)

1990년 표준화된 boundary-scan 프로토콜. 원래는 PCB 제조 후 핀 솔더링 검증용이었지만 디버그·플래시 프로그래밍까지 흡수.

| 핀 | 방향 | 의미 |
|---|------|------|
| TCK | 입력 | 테스트 클럭 |
| TMS | 입력 | 모드 선택 — TAP 상태 천이 결정 |
| TDI | 입력 | 데이터 입력(시프트인) |
| TDO | 출력 | 데이터 출력(시프트아웃) |
| TRST | 입력 | 비동기 리셋(옵션) |

핵심은 **TAP**(Test Access Port) — 16-상태 유한 상태 머신. TMS 값에 따라 천이.

```
                  TMS=1
        ┌─────────────────────┐
        ▼                      │
   Test-Logic-Reset            │
        │ TMS=0                │
        ▼                      │
   Run-Test/Idle ──TMS=1──> Select-DR-Scan
                                │
                          ┌─────┴─────┐
                       TMS=0       TMS=1
                          │           │
                          ▼           ▼
                       Capture-DR  Select-IR-Scan
                          │           │
                          ...        ...
```

이 상태 머신에서 *명령 레지스터(IR)*와 *데이터 레지스터(DR)*를 시프트해서 칩의 디버그 자원을 조작합니다. 흔히 보는 IR 명령.

| IR 코드 | 의미 |
|---------|------|
| `EXTEST` | boundary scan |
| `SAMPLE/PRELOAD` | 핀 상태 캡처 |
| `IDCODE` | 32-bit 칩 식별자 |
| `BYPASS` | 1-bit 통과 |
| `DEBUG` (ARM) | 디버그 자원 접근 (ARM7/9의 SCAN_N+INTEST 등) |

### SWD (Serial Wire Debug)

ARM이 핀 수를 줄이기 위해 만든 2핀 대체. JTAG 5핀 → SWD 2핀(SWCLK/SWDIO).

| 핀 | 의미 |
|---|------|
| SWCLK | 클럭 |
| SWDIO | 양방향 데이터(반이중) |
| SWO | (옵션) 1핀 트레이스 출력 |

JTAG의 TAP 상태 머신 대신 *패킷 기반*. 패킷 한 단위는.

```
[Start=1][APnDP][RnW][A2..A3][Parity][Stop=0][Park=1][TRN]
[ACK 3-bit]
[Data 32-bit][Parity]
```

- APnDP — Access Port(0) or Debug Port(1)?
- RnW — read(1) or write(0)?
- A2..A3 — 4바이트 정렬 주소 비트.

Cortex-M은 거의 SWD. STM32, nRF52, ESP32-S3 등이 모두 SWD 2핀 + SWO 1핀 구성을 표준으로 씁니다.

### CoreSight — ARM 디버그 아키텍처

JTAG/SWD가 *물리 인터페이스*라면 그 위에 칩 안에서 실제 일을 하는 게 **CoreSight**입니다.

```
[SWD/JTAG 핀]
     │
     ▼
[DAP (Debug Access Port)]
     │  AMBA AHB-AP (CPU 메모리 공간)
     ▼
[CPU][FPB][DWT][ITM][ETM]
     │   │    │    │    │
     │   │    │    │    └── 명령 트레이스 (CPU 매 명령)
     │   │    │    └─── 소프트웨어 trace (printf 같은 메시지)
     │   │    └────── 데이터 워치포인트 + 카운터 (cycle count 포함)
     │   └────────── flash-patch + breakpoint
     └──────────── core debug 레지스터 (DHCSR/DCRSR/DEMCR)
```

| 블록 | 역할 |
|------|------|
| DAP | 외부 ↔ 칩 내부 버스 게이트웨이 |
| FPB | HW 브레이크포인트 (보통 6개) + flash patching |
| DWT | 데이터 워치포인트 (4개), cycle counter, exception trace |
| ITM | software trace — `printf` 대용 SWO 출력 |
| ETM | 명령어 단위 trace (선택 옵션) |
| SCB / DCB | core 디버그 control 레지스터 |

이 블록들이 *칩 안에* 있고, 외부 디버거(OpenOCD/J-Link)는 DAP를 통해 메모리-mapped 레지스터를 읽고 씁니다. GDB의 `break`/`watch`/`step`은 결국 이 레지스터 셋업으로 변환됩니다.

### CPU halt 메커니즘 — Cortex-M

`break main`을 걸고 `continue` → main에 들어가면 정지. 이게 어떻게 일어나나?

1. 디버거가 FPB에 `main`의 주소를 기록 + 활성화.
2. CPU가 fetch 시 PC가 FPB와 일치 → core가 *debug state*로 천이.
3. 디버거가 DHCSR(Debug Halting Control and Status Register)의 `S_HALT` 비트를 폴링하다 1이 되면 GDB에 stop 패킷 전송.
4. GDB가 `bt`/`print` 요청 → 디버거가 DCRSR(register select)로 레지스터를 한 개씩 끌어옴.
5. `continue` → DHCSR.C_HALT = 0 → CPU 재개.

`monitor halt`는 *외부에서* DHCSR.C_HALT = 1을 강제로 써서 CPU를 멈추는 것.

```
DHCSR (0xE000EDF0)
[31:16] DBGKEY (0xA05F to write)
[25]    S_RESET_ST  (reset since last read)
[24]    S_RETIRE_ST (instruction retired)
[19]    S_LOCKUP
[18]    S_SLEEP
[17]    S_HALT     ← 1이면 정지
[16]    S_REGRDY
[5:2]   reserved
[3]     C_MASKINTS  (mask interrupts in halt)
[2]     C_STEP
[1]     C_HALT     ← 1로 쓰면 정지
[0]     C_DEBUGEN  ← 1이면 디버그 가능
```

DHCSR을 직접 들여다보면 *왜 CPU가 안 멈추는지*를 디버깅할 수 있습니다.

이 신호를 USB로 변환해 PC와 연결하는 *프로브*가 필요합니다.

- **ST-Link** (STMicro 보드 내장, 외부 V2/V3)
- **J-Link** (Segger 상용, 가장 빠르고 비쌈)
- **DAPLink / CMSIS-DAP** (ARM 표준, 저렴)
- **Black Magic Probe** (오픈 하드웨어, 자체 gdbserver 내장)
- **FT2232** + OpenOCD 조합 (저렴, 범용)

이들의 차이는 *드라이버·펌웨어*와 *최대 클럭* 정도. 신호 자체는 표준입니다.

## OpenOCD — 오픈소스 gdbserver

OpenOCD(Open On-Chip Debugger)는 거의 모든 프로브 + 거의 모든 칩을 다루는 만능 도구입니다. GDB 측에서는 *그냥 gdbserver*로 보입니다.

내부 구조 (간단).

```
[GDB] ──RSP──> [OpenOCD RSP server]
                       │
                       ▼
              [target.cpp — 칩 모델]
                       │
                       ▼
              [adapter.cpp — 프로브 모델]
                       │
                       ▼
                [USB → 프로브 → SWD/JTAG → 칩]
```

설정 파일이 두 갈래로 분리된 이유 — 프로브와 칩이 독립적으로 조합되기 때문입니다.

### 실행

```bash
# 인터페이스(프로브) + 타깃(칩) 설정으로 실행
$ openocd -f interface/stlink.cfg -f target/stm32f4x.cfg
Open On-Chip Debugger 0.12.0
...
Info : clock speed 2000 kHz
Info : STLINK V2J37M27 (API v2) VID:PID 0483:374B
Info : Target voltage: 3.234
Info : stm32f4x.cpu: hardware has 6 breakpoints, 4 watchpoints
Info : Listening on port 3333 for gdb connections
Info : Listening on port 4444 for telnet connections
```

3333 = GDB, 4444 = 사람용 telnet, 6666 = TCL.

타깃 voltage·BP 개수·WP 개수 같은 정보가 디버깅 출발 직전에 나옵니다. *Target voltage: 3.234*에서 칩에 전원이 제대로 들어왔는지 1차 확인.

### GDB 연결

```bash
$ arm-none-eabi-gdb firmware.elf
(gdb) target extended-remote :3333
Remote debugging using :3333
(gdb) monitor reset halt
(gdb) load                  # ELF의 .text / .data를 칩의 flash에 굽는다
(gdb) monitor reset halt
(gdb) break main
(gdb) continue
```

핵심 명령들.

| 명령 | 효과 |
|------|------|
| `monitor reset halt` | 칩 리셋 + 즉시 정지 |
| `monitor reset run` | 리셋 후 실행 |
| `monitor flash erase_sector 0 0 last` | flash 일괄 erase |
| `load` | ELF의 LMA로 flash/SRAM 프로그래밍 |
| `monitor halt` | 외부에서 강제 정지 |
| `monitor mdw 0x20000000 16` | 메모리 워드 16개 덤프 |
| `monitor mww 0x20000100 0xdeadbeef` | 메모리 워드 쓰기 |
| `monitor reg` | 모든 코어 레지스터 |

`monitor`는 *RSP의 일반 명령을 거치지 않고* 스텁 측 인터프리터에 직접 전달. OpenOCD의 경우 모든 TCL 명령이 사용 가능합니다.

### load의 내부

```text
(gdb) load
Loading section .isr_vector, size 0x1c0 lma 0x8000000
Loading section .text, size 0x9d20 lma 0x80001c0
Loading section .rodata, size 0x4c0 lma 0x8009ee0
Loading section .data, size 0x140 lma 0x800a3a0
Start address 0x080001b8, load size 41960
Transfer rate: 22 KB/sec, 8392 bytes/write.
```

GDB가 ELF의 각 PT_LOAD 세그먼트를 RSP `M<addr>,<len>:<hex>` 패킷으로 OpenOCD에 보냅니다. OpenOCD가 그 주소가 *flash인지 SRAM인지* 판단해 flash면 *flash driver*를 호출합니다.

Flash driver의 일.

1. 섹터 erase (4-128 KB 단위).
2. CPU SRAM에 *flash loader* 코드를 올림 — 칩 제조사 제공.
3. CPU에 점프 → loader가 word 단위로 flash 프로그램.
4. verify.

이 모든 일을 GDB는 모릅니다. RSP로는 그저 메모리 쓰기 패킷일 뿐.

### 흔한 OpenOCD 설정

`openocd.cfg` 한 파일로 묶기.

```tcl
# interface
source [find interface/cmsis-dap.cfg]
adapter speed 4000

# target
source [find target/nrf52.cfg]

# (선택) reset 후 자동 halt
$_TARGETNAME configure -event reset-init {
    # 외부 클럭으로 전환
    mww 0x40000700 1
}

# (선택) flash 자동 굽기
init
reset halt
flash write_image erase firmware.elf
reset run
shutdown
```

```bash
$ openocd -f openocd.cfg
```

스크립트 안에 `init` `reset` `flash write_image`를 넣으면 굽는 작업도 한 줄로 자동화됩니다. CI에서 보드 펌웨어 자동 갱신에 유용.

### 멀티 코어 타깃

Cortex-A + Cortex-M 듀얼 코어(예: STM32MP1), Cortex-M0+ + M4 듀얼(예: nRF5340, RP2040). 두 코어를 동시에 디버깅하려면 두 target를 정의.

```tcl
# target/nrf5340.cfg
target create $_CHIPNAME.app cortex_m -dap $_CHIPNAME.dap -ap-num 0
target create $_CHIPNAME.net cortex_m -dap $_CHIPNAME.dap -ap-num 1
$_CHIPNAME.app configure -rtos auto
```

OpenOCD가 두 개의 GDB 포트(3333, 3334)를 띄우고, 각각 별 GDB 세션으로 디버깅합니다. 한 GDB가 두 코어를 동시에 보는 *멀티-인페리어*도 가능하지만 도구 체인이 제한적.

## J-Link — Segger 상용

J-Link는 J-Link GDB Server라는 자체 데몬이 따로 있습니다.

```bash
$ JLinkGDBServer -device STM32F407VG -if SWD -speed 4000
SEGGER J-Link GDB Server V7.94
Listening on TCP/IP port 2331
Connected to target
Waiting for GDB connection...
```

연결.

```bash
$ arm-none-eabi-gdb firmware.elf
(gdb) target remote :2331
(gdb) monitor reset
(gdb) load
(gdb) continue
```

- `-device` 옵션이 *필수*. Segger 데이터베이스에 등록된 정확한 부품 번호. 잘못 적으면 *connect fail*이 아니라 *load 후 동작 이상*으로 나타나 디버깅이 어려움.
- `-if SWD` 또는 `JTAG`.
- `-speed`는 kHz. 4000이 안전한 기본값, 8000은 짧고 굵은 신호선만, 1000 이하는 긴 와이어용.
- RTT(아래)를 쓰려면 `-rtos GDBServer.so` 등 추가 옵션.

상용이지만 *비상업·교육용 무료* (Segger EDU 라이선스, J-Link EDU mini가 저렴). 속도·안정성에서 OpenOCD보다 뛰어나, 정전기·잡음이 많은 현장에서 OpenOCD가 자꾸 끊기면 J-Link로 갑니다.

### J-Link 고급 — Unlimited Flash Breakpoints

상용 J-Link만 제공하는 기능. FPB의 HW BP 개수(6개) 제한을 넘기기 위해 *flash patching*으로 무한 BP를 흉내. 흐름.

1. BP 7번째 설정 → J-Link가 *flash 페이지* 전체를 임시로 SRAM에 복사.
2. 해당 위치를 `BKPT` 명령으로 패치.
3. CPU가 점프 시 SRAM의 패치된 페이지를 실행 → halt.
4. resume 시 원래 페이지로 복원.

비싸지만 BP 부족이 일상인 큰 펌웨어에서 매우 유용. OpenOCD는 같은 기능이 없으니 BP 6개 관리가 필수.

## ELF 파일 — 굽는 단위

GDB가 `load` 할 때 사용하는 *그 파일*. 실행 가능한 코드와 데이터, *어디에 놓일지*까지 포함합니다.

```bash
$ arm-none-eabi-readelf -S firmware.elf
[Nr] Name              Type            Addr     Size
[ 1] .isr_vector       PROGBITS        08000000 ...   # flash 시작
[ 2] .text             PROGBITS        080001c0 ...   # 코드
[ 3] .rodata           PROGBITS        08010000 ...   # 상수
[ 4] .data             PROGBITS        20000000 ...   # 초기화 데이터 (VMA=SRAM)
[ 5] .bss              NOBITS          20001000 ...
```

`.data`의 LMA(Load Memory Address)는 flash, VMA(Virtual Memory Address)는 SRAM. 부팅 시 startup 코드가 flash에서 SRAM으로 복사합니다. `load`는 LMA를 따라 굽습니다.

```bash
$ arm-none-eabi-readelf -l firmware.elf
Program Headers:
  Type       Offset             VirtAddr           PhysAddr           FileSiz  MemSiz   Flg Align
  LOAD       0x00010000         0x08000000         0x08000000         0x09f80  0x09f80  R E 0x10000
  LOAD       0x00020000         0x20000000         0x0800a4c0         0x00140  0x00140  RW  0x10000
  LOAD       0x00020140         0x20000140         0x0800a600         0x00000  0x00800  RW  0x10000
```

PT_LOAD 세그먼트가 *실제로 디스크와 메모리에 올라가는 단위*. VirtAddr이 VMA, PhysAddr이 LMA. 세 번째 세그먼트가 FileSiz=0인 이유는 `.bss` (제로 채움이라 굽지 않음).

```bash
$ arm-none-eabi-objdump -h firmware.elf
$ arm-none-eabi-size firmware.elf
   text	   data	    bss	    dec	    hex	filename
  47832	    320	   2048	  50200	   c418	firmware.elf
```

`text`가 flash 차지(코드+rodata), `data`가 flash에 굽힌 *초기화 데이터*의 크기 + SRAM에 차지, `bss`가 SRAM만 차지. 총 flash = text + data. 총 SRAM = data + bss + stack + heap.

## MAP 파일 — 누가 메모리를 잡아먹나

링커가 `-Map=output.map` 옵션으로 만들어 주는 파일. 어떤 심볼이 어느 주소에 얼마나 차지하는지 다 보여 줍니다.

```text
Linker script and memory map

Memory Configuration
Name             Origin             Length             Attributes
FLASH            0x08000000         0x00100000         xr
SRAM             0x20000000         0x00020000         xrw

 .text           0x080001c0    0x9d20
                 0x080001c0                main_init
                 0x080001f4                HAL_Init
 ...

 .bss            0x20001234     0x800
                 0x20001234                g_buffer
                 0x20001a00                rx_queue

Cross Reference Table

Symbol                                            File
HAL_Init                                          ./build/main.o
                                                  ./build/sensor.o (HAL_Init)
                                                  ./build/uart.o (HAL_Init)
```

진단에 쓰는 세 가지.

1. **메모리 부족** — `.bss`가 너무 크면 SRAM 한계 초과. MAP에서 큰 심볼을 찾아 줄임. `.text`가 flash 초과하면 링크 단계에서 실패.
2. **알 수 없는 주소** — 콜스택에 `0x08003a12`만 나오면 MAP에서 *그 주소가 어떤 함수 안*인지 검색.
3. **링크 충돌** — Cross Reference Table에서 어느 파일이 어느 심볼을 *정의*했고 어느 파일이 *사용*했는지 확인. 누락된 ifdef·중복 정의 진단.

```bash
# 큰 심볼 상위 20개
$ awk '/^ \.text|^ \.bss|^ \.data/ {section=$1} \
       /^                 0x[0-9a-f]+ +0x[0-9a-f]+/ \
       {print section, $1, strtonum($2), $3}' \
  firmware.map | sort -k3 -n -r | head -20
```

```bash
# objdump로 디스어셈블해도 같은 정보
$ arm-none-eabi-objdump -d firmware.elf | less
```

큰 펌웨어에선 `nm --size-sort firmware.elf | tail -30`로 *코드 크기* 큰 함수를 찾는 것도 자주 합니다.

## Cortex-M 콜스택 — 어떻게 풀리나

ARM의 호출 규약(AAPCS):

- 인자 4개까지 r0-r3.
- 함수 진입 시 `push {r7, lr}` 또는 `push {r4-r7, lr}`.
- r7이 frame pointer로 자주 쓰이지만 *생략* 가능 (`-fomit-frame-pointer`).
- 리턴은 `bx lr` 또는 `pop {pc}`.

ISR(인터럽트 서비스 루틴) 진입 시 하드웨어가 stack에 *exception frame* 8개 워드를 자동 push.

```
[stack 위] xPSR
           PC
           LR
           R12
           R3
           R2
           R1
[stack 아래] R0
```

그래서 ISR 안에서 `bt`하면 정확한 frame을 풀어낼 수 있습니다. LR이 *EXC_RETURN* 값(`0xFFFFFFF9` 등)이면 ISR 안. EXC_RETURN의 비트가 *어떤 stack을 쓸지*(MSP vs PSP), *어떤 모드로 돌아갈지*를 결정.

```
EXC_RETURN 비트:
[3] Mode   — 0=Handler, 1=Thread
[2] SPSEL  — 0=MSP, 1=PSP
[0] ES     — 0=secure exit (TrustZone)
```

콜스택 풀기가 안 풀리면 보통 `r7` 미보존(`-fomit-frame-pointer`) 또는 *naked function* 때문. DWARF `.debug_frame`이 충분하면 GDB가 풀어내지만, 빌드 옵션에 따라 깨집니다 — Ch 12에서 자세히.

## 베어메탈 디버깅 흐름 (한 장 요약)

```
[작성] main.c → arm-none-eabi-gcc → firmware.elf + firmware.map
[연결] PC → USB → 프로브(ST-Link/J-Link) → SWD/JTAG → 칩 디버그 모듈
[데몬] openocd 또는 JLinkGDBServer 가동, TCP 3333/2331 리슨
[GDB]  arm-none-eabi-gdb firmware.elf → target extended-remote :3333
[프로그래밍] (gdb) load    # ELF의 .text/.data를 flash에 굽기
[디버깅] break / continue / step / print — 평소 GDB와 동일
```

## RTT — printf 없이 로그 빼기

UART도 없는 칩, 또는 ISR 안에서 printf를 쓸 수 없을 때 Segger의 **RTT**(Real-Time Transfer)가 강력합니다. SRAM의 링 버퍼를 디버그 프로브가 *백그라운드로* 읽어 갑니다. MCU 측에서는 메모리 한 번 쓰기로 끝.

### 동작 원리

1. MCU 펌웨어 측에 `_SEGGER_RTT` 구조체가 SRAM의 고정 위치에 존재.
2. `SEGGER_RTT_printf`가 그 안의 링 버퍼에 바이트를 씀(non-blocking).
3. PC측 J-Link DLL이 *SWD를 통해 백그라운드로* RAM을 폴링하다가 버퍼 데이터를 읽음.
4. PC측 RTT Client에 출력.

CPU는 *멈추지 않습니다*. 인터럽트 디스에이블 없이 1µs 이하로 끝나는 fire-and-forget 쓰기.

```c
// firmware
#include "SEGGER_RTT.h"
SEGGER_RTT_printf(0, "tick=%u\n", HAL_GetTick());

// PC
$ JLinkRTTClient
###RTT Client: ************************************************************
###RTT Client: *               SEGGER Microcontroller GmbH                *
###RTT Client: *   Solutions for real time microcontroller applications   *
###RTT Client: ************************************************************
tick=1234
tick=2456
...
```

OpenOCD도 RTT 채널을 지원합니다(0.11+).

```bash
(openocd telnet) rtt setup 0x20000000 0x10000 "SEGGER RTT"
(openocd telnet) rtt server start 9090 0
$ nc localhost 9090
```

RTT 채널은 *방향별*로 최대 16개씩. 채널 0는 stdout, 1은 보통 키 입력. 한 채널을 binary 로깅(예: 센서 raw 데이터)에 쓰고 다른 채널을 텍스트로 분리하는 패턴이 많습니다.

## ITM — ARM 표준 trace

ITM(Instrumentation Trace Macrocell)은 RTT의 ARM 표준 대안. 32개의 *stim port*에 워드를 쓰면 SWO(1핀) 또는 TRACE 핀(병렬)으로 trace 패킷이 흘러나옵니다.

```c
#define ITM_PORT(n)  (*((volatile uint32_t *)(0xE0000000 + 4*(n))))

void itm_putchar(char c) {
    while ((ITM->PORT[0].u32 & 1) == 0);   // wait FIFO ready
    ITM->PORT[0].u8 = c;
}
```

OpenOCD는 SWO 출력을 받아 stim port 0번을 stdout으로 풀어 줍니다.

```text
(openocd telnet) tpiu config internal /tmp/swo.log uart off 168000000 2000000
(openocd telnet) itm port 0 on
```

`168000000`은 코어 클럭, `2000000`은 SWO baud. 클럭 비율이 안 맞으면 garbled. 자주 만나는 함정.

RTT가 J-Link 종속이라면 ITM은 *완전 표준*. 하지만 SWO 한 핀이 추가로 필요합니다.

## Semihosting — 칩에서 호스트 syscall

ARM의 또 다른 디버그 통로. 펌웨어에서 `BKPT 0xAB`를 실행하면 디버거가 *그 시점에 멈춰 SVC 번호로 호스트 측 동작을 대행*합니다.

```c
extern int _write(int fd, char *p, int n) {
    // semihosting SVC
    register int r0 asm("r0") = 0x05;  // SYS_WRITE
    register const char *r1 asm("r1") = p;
    register int r2 asm("r2") = n;
    asm volatile("bkpt #0xAB" : "+r"(r0) : "r"(r1), "r"(r2));
    return r0;
}
```

OpenOCD/J-Link 모두 활성화 가능.

```text
(openocd) arm semihosting enable
```

`printf`가 호스트 콘솔로 직출력됩니다. 다만 *매 호출마다 CPU가 정지*하므로 *느립니다*. 디버깅 초창기 + 인터럽트 안 쓸 때만.

## ETM — 명령어 단위 trace

ETM(Embedded Trace Macrocell)이 있으면 CPU의 *모든 명령어 실행*이 trace됩니다. SEGGER J-Trace, Lauterbach TRACE32 같은 고가 도구가 받습니다.

쓰임:

- 비결정적 버그의 *완전한 이전 시퀀스* 재구성 (rr의 베어메탈 버전).
- 인터럽트 latency 측정.
- 캐시 hit/miss 통계.

Cortex-M7/M33은 ETM-M4 옵션 탑재. 모든 칩에 있는 건 아닙니다.

## DWT — Data Watchpoint and Trace

CoreSight DWT 유닛은 4개의 데이터 워치포인트 + 사이클 카운터 + 예외 trace를 제공합니다.

```c
// 사이클 카운터로 정확한 µs 측정
DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;
uint32_t start = DWT->CYCCNT;
do_work();
uint32_t cycles = DWT->CYCCNT - start;
```

`watch *my_var` 같은 GDB 명령은 DWT의 워치포인트 1개를 소모합니다. 4개를 넘으면 GDB가 *조용히* 추가를 거부 — Ch 5 참고.

## 자주 만나는 문제

| 증상 | 원인 / 해법 |
|------|-------------|
| `Error: unable to find a matching CMSIS-DAP device` | 권한 — `udev` 룰 필요 (`SUBSYSTEM=="usb", MODE="0666"`) |
| `init mode failed (unable to connect to the target)` | 리셋/전원/SWCLK 미연결, 또는 워치독이 너무 빨리 리셋 |
| `load`만 했는데 안 돌아감 | `monitor reset halt` 후 `continue` 안 했음 |
| 콜스택이 `0x00000000`로 빠짐 | 옵션 `-fno-omit-frame-pointer` 없음 또는 손상된 스택 |
| `value optimized out` | `-O0` 또는 `-Og`로 재빌드 (Ch 11 참고) |
| 브레이크포인트 침묵 | flash 영역인데 HW 브레이크포인트 모두 소진 — 사용 중인 BP 확인 |
| `Cortex-M0 doesn't support hardware breakpoints` | M0/M0+의 FPB는 4개만 — 더 줄여 쓰기 |
| RTT 깨진 문자 | 코어 클럭 설정 (`tpiu config`)이 실제와 다름 |
| LowPower 모드에서 SWD 끊김 | `monitor cortex_m maskisr on` 또는 sleep mode 비활성 |
| Erase 후 verify 실패 | OTP/RDP 락 — 이전 보호 해제 필요 |

## 보안 — RDP / readout protection

대부분의 MCU는 *플래시 보호*가 있습니다. STM32의 RDP, ESP32의 secure boot, nRF의 APPROTECT 등.

- **Level 0** — 디버거가 자유.
- **Level 1** — 디버거 부착되면 *플래시 자동 erase*. SRAM/레지스터는 접근 가능.
- **Level 2** — 디버거 완전 차단. 영구.

L1으로 락된 칩을 디버깅하려면 *erase + L0 재설정*. 그 과정에서 펌웨어 완전 손실. 사전에 *모든* 디버거 ↔ 칩 통신이 정상인지 확인하고 lock하는 게 안전합니다.

## OS 있는 임베디드 — 둘의 절충

라즈베리파이·NVIDIA Jetson 같은 *리눅스가 도는* 임베디드는 결국 gdbserver 시나리오로 회귀합니다. SSH 가능, gdbserver 설치 가능, 표준 라이브러리 존재 — 모두 평범한 원격 디버깅.

진짜 베어메탈 흐름이 필요한 건 OS 없는 MCU·DSP·FPGA softcore입니다.

다만 *RTOS*가 도는 환경(FreeRTOS, Zephyr, CMSIS-RTOS)에서는 GDB가 RTOS task 단위로 콜스택을 풀 수 있어야 합니다.

```tcl
# openocd
$_TARGETNAME configure -rtos FreeRTOS
```

또는 J-Link.

```bash
$ JLinkGDBServer -device STM32... -rtos GDBServer/RTOSPlugin_FreeRTOS
```

활성화되면 `info threads`가 OS 스레드 목록을 보여 줍니다. *베어메탈*에 가까운 RTOS 디버깅에서 매우 중요한 기능. 안 잡으면 한 task의 스택만 보이고 나머지는 invisible.

## 정리

- RSP가 표준 프로토콜 — 스텁이 누구든 GDB는 같다.
- OS 있는 원격 → `gdbserver`/`lldb-server` + SSH 터널.
- 베어메탈 MCU → OpenOCD(오픈) 또는 J-Link(상용) → JTAG/SWD.
- JTAG 5핀 / SWD 2핀. Cortex-M은 SWD.
- ARM CoreSight = DAP + FPB(BP) + DWT(WP) + ITM(trace) + ETM(명령 trace).
- HW BP는 유한(M3/M4=6, M0/M0+=4). 다 쓰면 침묵.
- ELF의 LMA가 flash 주소, `load`로 굽는다.
- MAP은 메모리 진단(공간 부족·주소 역추적)의 1차 자료.
- RTT(Segger 표준) / ITM(ARM 표준) / semihosting / ETM — trace 네 갈래.
- RTOS 디버깅은 `-rtos FreeRTOS` 옵션 필수.
- `arm-none-eabi-gdb` + OpenOCD = 0원 풀스택, J-Link는 속도·안정성 우위.

## 다음 장 예고

Ch 9 — Python 스크립팅. 반복 작업을 명령으로, 복잡한 구조를 pretty-printer로. GDB의 진짜 확장성은 여기서 열립니다.

## 관련 항목

- [Ch 7: core dump 분석](/blog/tools/debugging/gdb-lldb/chapter07-core-dump)
- [Ch 9: Python 스크립팅](/blog/tools/debugging/gdb-lldb/chapter09-python-scripting)
- [Ch 12: DWARF](/blog/tools/debugging/gdb-lldb/chapter12-dwarf) — 콜스택 풀기의 정체
- [Modern Embedded Recipes — JTAG 안 붙을 때](/blog/embedded/modern-recipes/part1-06-jtag) — 트러블슈팅 시각
- [GDB RSP 명세](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Remote-Protocol.html)
- [ARMv7-M Architecture Reference Manual](https://developer.arm.com/documentation/ddi0403/latest/) — CoreSight 전체
- [OpenOCD 공식](https://openocd.org/)
- [Segger J-Link Wiki](https://wiki.segger.com/Main_Page)
