---
title: "GDB 원격 디버깅 — OpenOCD·J-Link·target remote 구성"
date: 2026-04-19T09:02:00
description: "OpenOCD·pyOCD로 target에 붙고, .gdbinit으로 반복 작업을 자동화하는 패턴을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 113
tags: [recipes, debugging, gdb, openocd]
---

## 한 줄 요약

> **"GDB 원격 디버깅은 *target 옆의 gdbserver*에 host gdb를 붙여, 메모리·레지스터·breakpoint를 그대로 다루는 방식입니다."** OpenOCD나 pyOCD가 gdbserver 역할을 합니다.

## 어떤 상황에서 쓰나

JTAG/SWD가 달린 모든 MCU·MPU에서 첫 디버깅 도구입니다. STM32, NXP, Nordic, RP2040, ESP32 모두 gdb + OpenOCD 조합으로 동작합니다. IDE의 디버거도 안을 들여다보면 결국 gdb remote protocol을 쓰고 있습니다.

CLI로 직접 다루면 IDE보다 빠르고, script로 반복 작업을 자동화할 수 있습니다. CI에서 자동 flash·자동 verify·자동 fault 재현까지 모두 gdb script로 묶입니다.

## 핵심 개념

```text
+----------+    JTAG/SWD     +----------+    TCP 3333    +----------+
|  Target  | <-------------> | OpenOCD  | <------------> |   GDB    |
|  (MCU)   |                 | (server) |                |  (host)  |
+----------+                 +----------+                +----------+
```

OpenOCD가 *gdb remote protocol*을 말하는 서버 역할을 합니다. GDB는 target 종류를 모릅니다. 메모리 읽기·breakpoint·step 명령을 OpenOCD에 보내면 OpenOCD가 JTAG으로 번역합니다.

## OpenOCD 시작

대부분의 보드는 vendor가 cfg를 제공합니다.

```bash
# STM32F4 Discovery (ST-Link v2)
openocd -f interface/stlink.cfg -f target/stm32f4x.cfg

# Raspberry Pi Pico
openocd -f interface/cmsis-dap.cfg -f target/rp2040.cfg

# Nordic nRF52
openocd -f interface/jlink.cfg -f target/nrf52.cfg
```

성공하면 다음이 뜹니다.

```text
Info : Listening on port 3333 for gdb connections
Info : Listening on port 6666 for tcl connections
Info : Listening on port 4444 for telnet connections
```

3333번이 gdb remote port입니다.

## GDB로 연결

```bash
arm-none-eabi-gdb firmware.elf

(gdb) target extended-remote :3333
(gdb) monitor reset halt
(gdb) load
(gdb) monitor reset
(gdb) continue
```

`monitor` 접두사는 OpenOCD 자체 명령(JTAG 제어)이고, 그 외는 일반 gdb 명령입니다. `load`는 elf의 모든 section을 flash에 씁니다.

## 핵심 명령 모음

```text
break main              # main 진입에 breakpoint
break uart.c:42         # 파일·라인 breakpoint
watch g_counter         # 메모리 변화 시 정지 (data watchpoint)
rwatch g_state          # 읽기 시 정지
awatch g_state          # 읽기·쓰기 모두

info breakpoints        # bp 목록
delete 3                # bp 3번 삭제

step / next             # 한 줄 실행 (step in / over)
stepi / nexti           # 명령 한 줄

print/x g_status        # hex 출력
x/16x 0x20000000        # 메모리 dump
info registers          # CPU register
info threads            # RTOS thread 목록

backtrace               # call stack
frame 3                 # 스택 프레임 3번으로 이동
```

`step`이 함수 안으로 들어가고 `next`는 한 줄로 넘깁니다. `stepi`/`nexti`는 어셈블리 단위입니다.

## Watchpoint — 메모리 오염 잡기

```text
(gdb) watch g_user_count
Hardware watchpoint 2: g_user_count

(gdb) continue
Continuing.

Hardware watchpoint 2: g_user_count
Old value = 5
New value = 1879048197    ← 깨진 값
0x08001234 in process_input (data=0xdeadbeef) at input.c:78
```

Cortex-M의 DWT comparator는 보통 4개입니다. 정확한 주소만 알면 *누가, 어디서* 메모리를 망가뜨렸는지 즉시 잡습니다.

## .gdbinit으로 반복 작업 자동화

`~/.gdbinit` 또는 프로젝트 루트의 `.gdbinit`이 자동 실행됩니다.

```text
# ~/.gdbinit
set history save on
set history size 10000
set print pretty on
set print array on
set confirm off

define connect
    target extended-remote :3333
    monitor reset halt
    load
    monitor reset
end

define dump_regs
    printf "PSR  = 0x%08x\n", $xpsr
    printf "MSP  = 0x%08x\n", $msp
    printf "PSP  = 0x%08x\n", $psp
    printf "PC   = 0x%08x\n", $pc
    printf "CFSR = 0x%08x\n", *(uint32_t*)0xE000ED28
end
```

`gdb` 켜고 `connect`만 치면 연결·flash·reset이 한 번에 됩니다. `dump_regs`는 hardfault 분석에 즉시 쓰입니다.

## RTOS Awareness

FreeRTOS, Zephyr, RT-Thread는 *task list*를 gdb thread로 보여 줄 수 있습니다.

```text
# OpenOCD 설정에 추가
$_TARGETNAME configure -rtos FreeRTOS
```

```text
(gdb) info threads
  Id   Target Id          Frame
* 1    idle (Running)     idle_task () at ...
  2    sensor             vTaskDelay () at ...
  3    network            xQueueReceive () at ...

(gdb) thread 3
(gdb) backtrace
```

각 task의 stack을 그대로 들여다볼 수 있습니다. Crash가 어느 task에서 났는지, 다른 task가 어디서 묶여 있는지 한 화면에 보입니다.

## pyOCD — Python 친화 대안

```bash
pip install pyocd
pyocd gdbserver --target stm32f407vg

# 별도 터미널
arm-none-eabi-gdb firmware.elf
(gdb) target extended-remote :3333
```

pyOCD는 Python으로 확장하기 쉬워, 자동화·script에 강합니다.

```python
from pyocd.core.helpers import ConnectHelper

with ConnectHelper.session_with_chosen_probe() as session:
    target = session.target
    target.reset_and_halt()
    target.flash_binary("firmware.bin", 0x08000000)
    target.resume()
    # ... custom test sequence
```

CI에서 board test를 돌릴 때 진가가 나옵니다.

## SWO / RTT viewer 통합

OpenOCD는 SWO trace도 함께 받습니다.

```text
# openocd에 추가
tpiu config internal :3344 uart off 168000000
itm port 0 on
```

별도 nc로 받습니다.

```bash
nc localhost 3344 | itm-parse
```

SEGGER J-Link 사용자는 RTT가 더 편합니다. UART보다 빠르고 (몇 MB/s) GPIO를 안 씁니다.

```bash
JLinkRTTClient
```

## VS Code 통합

`.vscode/launch.json`:

```json
{
    "version": "0.2.0",
    "configurations": [{
        "name": "Cortex Debug",
        "type": "cortex-debug",
        "request": "launch",
        "executable": "build/firmware.elf",
        "servertype": "openocd",
        "configFiles": [
            "interface/stlink.cfg",
            "target/stm32f4x.cfg"
        ],
        "svdFile": "STM32F407.svd"
    }]
}
```

`svdFile`이 핵심입니다. 모든 peripheral register를 이름·필드 단위로 볼 수 있습니다.

## SVD로 peripheral 보기

```text
(gdb) source /path/to/PyCortexMDebug/PyCortexMDebug.py
(gdb) svd_load STM32F407.svd

(gdb) svd USART1
USART1 (USART, 0x40011000)
  SR
    PE: 0   ; Parity error
    FE: 0   ; Framing error
    TXE: 1  ; Transmit data register empty
    ...

(gdb) svd USART1 SR TXE
1
```

NVIC pending, USART status, RCC clock enable를 외울 필요가 없어집니다.

## CI에서 자동 flash·테스트

```bash
#!/usr/bin/env bash
# flash_and_test.sh

openocd -f interface/stlink.cfg -f target/stm32f4x.cfg &
OPENOCD_PID=$!
sleep 1

arm-none-eabi-gdb -batch \
    -ex "target extended-remote :3333" \
    -ex "monitor reset halt" \
    -ex "load build/firmware.elf" \
    -ex "monitor reset run" \
    -ex "quit"

# UART에서 test 결과 수신
timeout 30 cat /dev/ttyUSB0 > test_result.txt
kill $OPENOCD_PID

grep "ALL PASS" test_result.txt
```

이 한 스크립트가 night build의 board-in-loop 테스트의 뼈대입니다.

## 자주 보는 함정

> Optimized 코드에 source-level breakpoint

```c
// -O2 빌드
int compute(int x) {
    int a = x * 2;       // ← bp 안 잡힘
    int b = a + 1;       // ← inline 됨
    return b;
}
```

`-Og` (debug 친화 최적화)로 빌드하거나 `volatile`로 감쌉니다. `info line` 명령으로 source ↔ 주소 매핑을 확인합니다.

> Hardware breakpoint 부족

Cortex-M의 FPB는 보통 6개입니다. 7번째 breakpoint를 걸면 "no more breakpoints" 에러가 납니다. 안 쓰는 bp는 정리합니다.

> Watchpoint를 변수가 아닌 *주소*로 걸어야 할 때

```text
(gdb) watch *(uint32_t*)0x20001234
```

Stack 변수는 함수가 끝나면 address가 바뀌므로 watchpoint가 무의미해집니다.

> `monitor reset run` 직후 GDB가 hang

```text
(gdb) monitor reset run
... 응답 없음
```

OpenOCD 일부 버전이 reset 후 sync를 놓칩니다. `monitor reset halt` 후 `continue`로 바꿉니다.

> Stack overflow로 backtrace 망가짐

```text
(gdb) backtrace
#0  0xffffffff in ??()
#1  Cannot access memory at address 0xdeadbeef
```

Stack이 깨지면 backtrace를 못 만듭니다. MPU로 stack guard를 두면 *깨지는 순간* fault가 나서 정확한 위치를 잡습니다.

## 정리

- OpenOCD/pyOCD가 gdbserver, GDB가 client. JTAG/SWD를 통해 통신합니다.
- `target extended-remote :3333`로 붙고, `monitor`로 OpenOCD 명령을 내립니다.
- Watchpoint는 메모리 오염 추적의 가장 강력한 도구입니다.
- `.gdbinit`으로 반복 명령을 함수처럼 묶습니다.
- FreeRTOS·Zephyr는 thread-aware debugging이 됩니다.
- SVD를 로드하면 peripheral register를 이름으로 다룹니다.
- CI에서 board-in-loop 테스트의 자동화 토대가 됩니다.
- `-Og` 빌드로 source-level 디버깅을 잘 따라가게 합니다.

다음 편은 **하드폴트 분석**입니다.

## 관련 항목

- [10-04: 하드폴트 분석](/blog/embedded/modern-recipes/part10-04-hardfault-analysis)
- [10-08: 메모리 오염 진단](/blog/embedded/modern-recipes/part10-08-memory-corruption)
- [10-11: 로깅 시스템 설계](/blog/embedded/modern-recipes/part10-11-logging-system)
