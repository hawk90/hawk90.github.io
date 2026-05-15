---
title: "Ch 8: 원격 디버깅 — gdbserver / OpenOCD / J-Link"
date: 2025-08-20T08:00:00
description: "다른 머신·MCU를 GDB로. gdbserver, OpenOCD, J-Link, JTAG/SWD."
tags: [gdb, Remote Debug, gdbserver, OpenOCD, JTAG]
series: "GDB and LLDB"
seriesOrder: 8
draft: false
---

GDB가 실행되는 *호스트*와 디버깅 대상이 도는 *타깃*은 같은 컴퓨터가 아니어도 됩니다. 라즈베리파이, x86 서버, ARM 보드, Cortex-M MCU — 모두 한 끝에 GDB Remote Serial Protocol(이하 RSP)을 말할 줄 아는 *스텁*만 있으면 GDB가 마치 로컬처럼 디버깅합니다. 이 장은 두 갈래로 다룹니다.

1. **OS가 있는 원격 머신** — gdbserver / lldb-server.
2. **베어메탈 MCU** — OpenOCD / J-Link → JTAG/SWD → 칩 안의 디버그 모듈.

## 원리 — Remote Serial Protocol

RSP는 ASCII 패킷 기반 텍스트 프로토콜입니다. 호스트의 GDB가 패킷을 보내고 스텁이 답합니다.

```
호스트 → 스텁:  $g#67          # 레지스터 전체 읽기
스텁  → 호스트: $0000...#xx    # 16진 인코딩된 레지스터 덤프
```

읽기/쓰기/실행/브레이크포인트 설정 등을 모두 이 패킷 셋으로 표현합니다. 따라서 *스텁이 누구냐*만 다르고 GDB 측 명령은 똑같습니다.

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
```

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

### sysroot 지정

타깃과 호스트의 라이브러리 위치가 다르면 sysroot로 지정.

```text
(gdb) set sysroot /opt/target-rootfs
(gdb) set solib-search-path /opt/target-rootfs/usr/lib
```

크로스 컴파일 환경에서 흔히 씁니다. ARM 타깃의 `/lib/libc.so.6`이 호스트에는 없으니, 타깃 rootfs를 복사해 두고 거기를 가리킵니다.

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

## lldb-server

LLDB도 같은 모델. macOS / iOS / Linux 모두 지원.

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

iOS 기기 디버깅이 평소 우리가 가장 자주 만나는 lldb-server 사례입니다 (Xcode가 내부적으로 lldb-server를 갖다 씁니다).

## 베어메탈 — JTAG / SWD가 뭔가

여기서부터가 임베디드. MCU에는 OS가 없으니 gdbserver를 못 돌립니다. 대신 *칩 안*에 디버그 모듈이 있고, 그걸 *외부에서* JTAG 또는 SWD 핀으로 두드립니다.

| | JTAG | SWD |
|---|------|-----|
| 핀 수 | 5 (TCK/TMS/TDI/TDO/TRST) | 2 (SWCLK/SWDIO) |
| 표준 | IEEE 1149.1 | ARM 전용 |
| 속도 | 수~수십 MHz | 수~수십 MHz |
| 다중 디바이스 | 데이지 체인 | 점대점 |
| 트레이스 | 없음(별도 TRACE 핀) | SWO 1핀 |

Cortex-M은 거의 SWD. STM32, nRF52, ESP32-S3 등이 모두 SWD 2핀 + SWO 1핀 구성을 표준으로 씁니다.

이 신호를 USB로 변환해 PC와 연결하는 *프로브*가 필요합니다.

- **ST-Link** (STMicro 보드 내장, 외부 V2/V3)
- **J-Link** (Segger 상용, 가장 빠르고 비쌈)
- **DAPLink / CMSIS-DAP** (ARM 표준, 저렴)
- **Black Magic Probe** (오픈 하드웨어, 자체 gdbserver 내장)
- **FT2232** + OpenOCD 조합 (저렴, 범용)

## OpenOCD — 오픈소스 gdbserver

OpenOCD(Open On-Chip Debugger)는 거의 모든 프로브 + 거의 모든 칩을 다루는 만능 도구입니다. GDB 측에서는 *그냥 gdbserver*로 보입니다.

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

`extended-remote`는 `remote`와 거의 같지만 `run`/`kill` 같은 프로세스 제어를 지원합니다. OpenOCD에서는 보통 extended를 씁니다.

### 흔한 OpenOCD 설정

`openocd.cfg` 한 파일로 묶기.

```tcl
# interface
source [find interface/cmsis-dap.cfg]
adapter speed 4000

# target
source [find target/nrf52.cfg]

# (선택) 호출 함수
init
reset halt
```

```bash
$ openocd -f openocd.cfg
```

스크립트 안에 `init` `reset` `flash write_image`를 넣으면 굽는 작업도 한 줄로 자동화됩니다.

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

- `-device` 옵션이 *필수*. Segger 데이터베이스에 등록된 정확한 부품 번호.
- `-if SWD` 또는 `JTAG`.
- `-speed`는 kHz.
- RTT(아래)를 쓰려면 `-rtos GDBServer.so` 등 추가 옵션.

상용이지만 *비상업·교육용 무료* (Segger EDU 라이선스, J-Link EDU mini가 저렴). 속도·안정성에서 OpenOCD보다 뛰어나, 정전기·잡음이 많은 현장에서 OpenOCD가 자꾸 끊기면 J-Link로 갑니다.

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
$ arm-none-eabi-objdump -h firmware.elf
$ arm-none-eabi-size firmware.elf
   text	   data	    bss	    dec	    hex	filename
  47832	    320	   2048	  50200	   c418	firmware.elf
```

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
```

진단에 쓰는 두 가지.

1. **메모리 부족** — `.bss`가 너무 크면 SRAM 한계 초과. MAP에서 큰 심볼을 찾아 줄임.
2. **알 수 없는 주소** — 콜스택에 `0x08003a12`만 나오면 MAP에서 *그 주소가 어떤 함수 안*인지 검색.

```bash
# objdump로 디스어셈블해도 같은 정보
$ arm-none-eabi-objdump -d firmware.elf | less
```

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

```c
// firmware
#include "SEGGER_RTT.h"
SEGGER_RTT_printf(0, "tick=%u\n", HAL_GetTick());

// PC
$ JLinkRTTClient
```

OpenOCD도 RTT 채널을 지원합니다(0.11+).

```bash
(openocd telnet) rtt setup 0x20000000 0x10000 "SEGGER RTT"
(openocd telnet) rtt server start 9090 0
$ nc localhost 9090
```

## 자주 만나는 문제

| 증상 | 원인 / 해법 |
|------|-------------|
| `Error: unable to find a matching CMSIS-DAP device` | 권한 — `udev` 룰 필요 (`SUBSYSTEM=="usb", MODE="0666"`) |
| `init mode failed (unable to connect to the target)` | 리셋/전원/SWCLK 미연결, 또는 워치독이 너무 빨리 리셋 |
| `load`만 했는데 안 돌아감 | `monitor reset halt` 후 `continue` 안 했음 |
| 콜스택이 `0x00000000`로 빠짐 | 옵션 `-fno-omit-frame-pointer` 없음 또는 손상된 스택 |
| `value optimized out` | `-O0` 또는 `-Og`로 재빌드 (Ch 11 참고) |
| 브레이크포인트 침묵 | flash 영역인데 HW 브레이크포인트 모두 소진 — 사용 중인 BP 확인 |

## OS 있는 임베디드 — 둘의 절충

라즈베리파이·NVIDIA Jetson 같은 *리눅스가 도는* 임베디드는 결국 gdbserver 시나리오로 회귀합니다. SSH 가능, gdbserver 설치 가능, 표준 라이브러리 존재 — 모두 평범한 원격 디버깅.

진짜 베어메탈 흐름이 필요한 건 OS 없는 MCU·DSP·FPGA softcore입니다.

## 정리

- RSP가 표준 프로토콜 — 스텁이 누구든 GDB는 같다.
- OS 있는 원격 → `gdbserver`/`lldb-server` + SSH 터널.
- 베어메탈 MCU → OpenOCD(오픈) 또는 J-Link(상용) → JTAG/SWD.
- ELF의 LMA가 flash 주소, `load`로 굽는다.
- MAP은 메모리 진단(공간 부족·주소 역추적)의 1차 자료.
- RTT로 printf 없이 로그 빼기.
- `arm-none-eabi-gdb` + OpenOCD = 0원 풀스택.

## 다음 장 예고

Ch 9 — Python 스크립팅. 반복 작업을 명령으로, 복잡한 구조를 pretty-printer로. GDB의 진짜 확장성은 여기서 열립니다.

## 관련 항목

- [Ch 7: core dump 분석](/blog/tools/gdb-lldb/chapter07-core-dump)
- [Ch 9: Python 스크립팅](/blog/tools/gdb-lldb/chapter09-python-scripting)
- [Modern Embedded Recipes — JTAG 안 붙을 때](/blog/embedded/modern-recipes/part1-06-jtag) — 트러블슈팅 시각
- [OpenOCD 공식](https://openocd.org/)
- [Segger J-Link Wiki](https://wiki.segger.com/Main_Page)
