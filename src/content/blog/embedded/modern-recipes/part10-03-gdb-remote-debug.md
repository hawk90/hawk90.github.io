---
title: "GDB 원격 디버깅 — OpenOCD·J-Link·target remote 구성"
slug: "embedded/modern-recipes/part10-03-gdb-remote-debug"
date: 2026-04-19T09:02:00
description: "OpenOCD·pyOCD로 GDB를 target에 붙이는 법을 각 도구 문서로 정리하고, QEMU gdbstub + LLDB로 메모리 오염 watchpoint 세션을 실제로 돌리며, .gdbinit·RTOS awareness·SWO·SVD·최적화와 breakpoint의 함정을 짚습니다."
series: "Modern Embedded Recipes"
seriesOrder: 113
tags: [recipes, debugging, gdb, openocd]
topics: ["embedded"]
---

## 한 줄 요약

> **"GDB 원격 디버깅은 *target 옆의 gdbserver*에 host gdb를 붙여, 메모리·레지스터·breakpoint를 그대로 다루는 방식입니다."** OpenOCD나 pyOCD가 gdbserver 역할을 합니다.

## 어떤 상황에서 쓰나

JTAG/SWD가 달린 MCU에 IDE 없이 붙거나, 같은 디버그 절차를 스크립트로 반복하고 싶을 때 씁니다. 아래 VS Code 확장 cortex-debug도 `servertype`으로 OpenOCD·pyOCD·J-Link 등의 GDB 서버를 띄우고 GDB를 거쳐 target에 붙습니다(확장 문서 *debug_attributes*).

이 글의 OpenOCD·pyOCD 명령은 프로브와 보드가 없어 실행하지 않았고, 각 도구의 문서에서 옮겼습니다. 대신 같은 GDB remote serial protocol(RSP)을 말하는 QEMU의 gdbstub에 이 Mac의 LLDB를 붙여 watchpoint 세션을 실제로 돌렸습니다. 이 Mac에는 `arm-none-eabi-gdb`가 없어서, GDB 명령은 GDB 문서 기준으로 적고 실행 결과는 LLDB 출력을 그대로 싣습니다.

## 핵심 개념

연결은 세 단계입니다. target(MCU)과 OpenOCD 사이는 JTAG/SWD, OpenOCD와 host의 GDB 사이는 TCP 위의 GDB remote serial protocol입니다. OpenOCD 설명서 *Server Configuration*에 따르면 GDB 포트 기본값은 3333입니다. GDB는 메모리 읽기·breakpoint·step을 RSP 패킷으로 보내고, OpenOCD가 이를 디버그 포트 접근으로 바꿉니다. 같은 패킷을 QEMU의 `-gdb` 옵션이 받을 수도 있어서, 아래 실행 예는 OpenOCD 자리에 QEMU를 두었습니다.

## OpenOCD 시작

OpenOCD는 프로브(`interface/`)와 칩(`target/`) 설정 파일을 조합해 실행합니다.

```bash
# STM32F4 Discovery (ST-Link v2)
openocd -f interface/stlink.cfg -f target/stm32f4x.cfg

# Raspberry Pi Pico
openocd -f interface/cmsis-dap.cfg -f target/rp2040.cfg

# Nordic nRF52
openocd -f interface/jlink.cfg -f target/nrf52.cfg
```

OpenOCD는 서버를 열 때 v0.12.0 `src/server/server.c` 297행의 `LOG_INFO("Listening on port %hu for %s connections", ...)`으로 포트를 알립니다. 기본 포트는 GDB 3333, Tcl 6666, telnet 4444입니다(*Server Configuration*). 이 줄이 나오지 않으면 GDB를 붙이기 전에 OpenOCD 쪽 오류부터 봅니다.

## GDB로 연결

```bash
arm-none-eabi-gdb firmware.elf

(gdb) target extended-remote :3333
(gdb) monitor reset halt
(gdb) load
(gdb) monitor reset
(gdb) continue
```

`monitor` 접두사는 OpenOCD 자체 명령(JTAG 제어)이고, 그 외는 일반 gdb 명령입니다. `load`는 ELF의 로드 대상 section을 ELF에 적힌 주소에 씁니다(GDB 설명서 *Target Commands*). OpenOCD가 memory map으로 flash 영역을 알려 주면 그 부분은 flash에 기록됩니다(OpenOCD *GDB and OpenOCD*).

## 핵심 명령 모음

GDB 명령 요약입니다. 오른쪽 열은 같은 일을 하는 LLDB 명령입니다.

| GDB | 하는 일 | LLDB |
| --- | --- | --- |
| `break main` / `break uart.c:42` | 함수·줄에 breakpoint | `breakpoint set -n main` / `breakpoint set -f uart.c -l 42` |
| `watch g_counter` | 값이 바뀌는 쓰기에서 정지 | `watchpoint set expression -w modify -- &g_counter` |
| `rwatch` / `awatch` | 읽기 / 읽기·쓰기 watchpoint | `-w read` / `-w read_write` |
| `step` / `next` / `stepi` / `nexti` | 줄·명령 단위 실행 | `step` / `next` / `si` / `ni` |
| `print/x g_status` | 16진 출력 | `p/x g_status` |
| `x/16x 0x20000000` | 메모리 dump | `memory read -s4 -fx -c16 0x20000000` |
| `info registers` | 레지스터 | `register read` |
| `backtrace` / `frame 3` | 호출 스택 | `bt` / `frame select 3` |


`step`은 함수 안으로 들어가고 `next`는 호출을 한 줄로 넘깁니다. `stepi`/`nexti`는 명령 단위입니다.

## Watchpoint — 메모리 오염 잡기

8바이트 버퍼 바로 뒤에 카운터가 있고, 길이 검사 없는 복사가 그 카운터를 덮는 프로그램을 만들어 돌렸습니다.

```c
struct session {
    uint8_t  rx_buf[8];
    uint32_t user_count;            /* sits right after rx_buf */
};
struct session g_sess = { .user_count = 5 };

/* bug: copies len bytes even when len > sizeof rx_buf */
void process_input(const uint8_t *data, int len) {
    for (int i = 0; i < len; i++)
        g_sess.rx_buf[i] = data[i];
}

int main(void) {
    static const uint8_t pkt[12] = { 1, 2, 3, 4, 5, 6, 7, 8, 0x05, 0x00, 0x00, 0x70 };
    process_input(pkt, 8);          /* fine */
    process_input(pkt, 12);         /* overruns into user_count */
    pr("user_count = %u (0x%08x)\n", g_sess.user_count, g_sess.user_count);
    return 0;
}
```

semihosting 출력 하네스(1-03에서 쓴 `pr()`·startup)로 `-O0` 빌드해 QEMU 11.1.3 `netduinoplus2`에서 그냥 돌리면 `user_count = 1879048197 (0x70000005)`가 찍힙니다. 이번에는 `-S -gdb tcp::3342`로 QEMU를 멈춘 채 띄우고 LLDB(lldb-2103.0.34.407)를 붙여 watchpoint를 걸었습니다.

```bash
qemu-system-arm -M netduinoplus2 -nographic -semihosting-config enable=on,target=native \
  -kernel wp.elf -S -gdb tcp::3342 &
lldb --batch -o "target create wp.elf" -o "gdb-remote 3342" \
  -o "watchpoint set expression -w write -s 4 -- &g_sess.user_count" \
  -o "continue" -o "continue" -o "frame variable i" -o "continue" -o "frame variable i" \
  -o "continue" -o "frame variable i" -o "continue" -o "frame variable i" -o "bt"
```

출력에서 각 정지의 값 변화와 위치만 추렸습니다.

```text
old value: 0x00000000
new value: 0x00000005
       frame #0: 0x08000060 wp.elf`Reset_Handler at startup.c:7:12
old value: 0x00000005
new value: 0x00000005
       frame #0: 0x08000372 wp.elf`process_input(...len=12) at wp.c:12:31
(int) i = 8
old value: 0x00000005
new value: 0x00000005
(int) i = 9
old value: 0x00000005
new value: 0x00000005
(int) i = 10
old value: 0x00000005
new value: 0x70000005
(int) i = 11
```

세 가지가 보입니다. 첫 정지는 버그가 아니라 startup 코드가 `.data` 초깃값 5를 복사하는 순간입니다. 두 번째부터는 `len=12`로 불린 `process_input`이 i = 8~11에서 카운터 바이트를 하나씩 덮는데, 0x05·0x00·0x00을 쓰는 세 번은 값이 그대로라 old와 new가 같습니다. LLDB의 `-w write`는 값과 상관없이 *쓰기*마다 멈추므로 이 세 번도 잡힙니다. 마지막 0x70이 들어간 순간 값이 0x70000005가 되고, `bt`는 `main`의 두 번째 호출(wp.c:19)을 가리킵니다. 정지 PC 0x08000372는 `strb r2, [r3, #0]`(0x08000370) 바로 다음 명령이므로, QEMU는 쓰기가 끝난 다음 명령에서 멈춥니다.

GDB의 `watch`는 이와 다릅니다. GDB 16.3 설명서는 `watch`가 식에 값이 쓰이고 *그 값이 바뀔 때* 멈춘다고 적습니다. LLDB에서 같은 동작인 `-w modify`로 다시 돌리면 `.data` 초기화 다음 정지가 곧바로 i = 11, `old value: 0x00000005` → `new value: 0x70000005`입니다. 같은 값을 덮어쓰는 세 번은 건너뜁니다. 값이 그대로인 쓰기까지 잡아야 하는지에 따라 둘을 고릅니다.

하드웨어 watchpoint 수는 칩마다 고정되어 있습니다. Cortex-M4 TRM(DDI 0439B) 8장은 debug 옵션으로 breakpoint unit(literal comparator 2개 + instruction comparator 6개, 또는 instruction comparator 2개)과 watchpoint unit(watchpoint 1개 또는 4개)을 둘 수 있다고 적습니다. 그래서 같은 M4라도 칩에 따라 watchpoint가 1개뿐일 수 있습니다. GDB에 이 한도를 알려 주는 설정은 아래 「Hardware breakpoint 부족」에 있습니다.

## .gdbinit으로 반복 작업 자동화

GDB는 시작할 때 홈 디렉터리의 `~/.gdbinit`과 현재 디렉터리의 `.gdbinit`을 읽습니다. 다만 GDB 16.3 설명서 *Init File in the Current Directory*에 따르면 현재 디렉터리의 `.gdbinit`은 `auto-load safe-path`에 그 디렉터리가 들어 있어야 읽힙니다. 프로젝트 `.gdbinit`이 무시되면 `add-auto-load-safe-path /path/to/project`를 `~/.gdbinit`에 넣습니다.

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
    printf "PSR  = 0x%08x\n", $xPSR
    printf "MSP  = 0x%08x\n", $msp
    printf "PSP  = 0x%08x\n", $psp
    printf "PC   = 0x%08x\n", $pc
    printf "CFSR = 0x%08x\n", *(uint32_t*)0xE000ED28
end
```

`connect`는 연결·flash·reset을 한 번에 합니다. `dump_regs`의 0xE000ED28은 CFSR(Configurable Fault Status Register) 주소이고, 해석은 [10-04: 하드폴트 분석](/blog/embedded/modern-recipes/part10-04-hardfault-analysis)에 있습니다. `$xPSR`·`$msp`·`$psp` 같은 레지스터 이름은 GDB 서버가 보내는 target description에 그 이름으로 있어야 씁니다. OpenOCD v0.12.0은 `src/target/armv7m.c`에서 이 레지스터를 `xPSR`로 부르고, GDB는 이름의 대소문자를 구분합니다.

## RTOS Awareness

OpenOCD 설명서 20.6절 *RTOS Support*에 따르면 OpenOCD는 RTOS의 task를 GDB thread로 보여 줄 수 있고, 기본은 꺼져 있어 target에 `-rtos`를 줘야 켜집니다.

```text
# OpenOCD 설정에 추가 (auto면 자동 탐지)
$_TARGETNAME configure -rtos FreeRTOS
```

같은 절이 적는 지원 목록은 eCos, ThreadX, FreeRTOS, linux, ChibiOS, embKernel, mqx, uCOS-III, nuttx, RIOT, hwthread, Zephyr, rtkernel입니다. OpenOCD가 RTOS를 찾으려면 그 RTOS가 정해진 심볼(FreeRTOS라면 task 목록 변수들)을 export해야 하고, 목록은 같은 절에 있습니다. 켜진 뒤에는 GDB의 `info threads`로 task 목록을, `thread N` + `backtrace`로 각 task의 스택을 봅니다.

## pyOCD — Python 친화 대안

```bash
pip install pyocd
pyocd pack install stm32f407vg      # 내장 target이 아니면 CMSIS-Pack 설치
pyocd gdbserver --target stm32f407vg

# 별도 터미널
arm-none-eabi-gdb firmware.elf
(gdb) target extended-remote :3333
```

pyOCD v0.36.0의 내장 target 목록에 STM32F407이 없으므로, 문서 *target_support.md*대로 `pyocd pack install`로 그 부품의 CMSIS-Pack을 먼저 설치합니다. 정확한 target 이름은 `pyocd pack find stm32f407`로 확인합니다. pyOCD는 같은 기능을 Python API로도 제공합니다.

pyOCD v0.36.0 `docs/api_examples.md`의 예를 줄인 것입니다. flash 쓰기는 `FileProgrammer`가 합니다.

```python
from pyocd.core.helpers import ConnectHelper
from pyocd.flash.file_programmer import FileProgrammer

with ConnectHelper.session_with_chosen_probe() as session:
    target = session.board.target
    FileProgrammer(session).program("firmware.bin")
    target.reset_and_halt()
    print("pc: 0x%X" % target.read_core_register("pc"))
    target.resume()
```

## SWO / RTT viewer 통합

OpenOCD v0.12의 SWO 설정은 `tpiu` 객체로 합니다. 설명서 16.6.3절의 STM32L152 예를 STM32F4에 맞게 옮기면 다음과 같습니다. `-traceclk`는 필수이고 Cortex-M3/M4에서는 보통 HCLK와 같으며, `-output :port`를 주면 OpenOCD가 그 TCP 포트로 trace를 내보냅니다. ITM stimulus port 0은 target을 만들 때 자동으로 켜집니다(16.6.4절 `itm port`).

```bash
openocd -f interface/stlink.cfg -c "transport select swd" -f target/stm32f4x.cfg \
  -c "stm32f4x.tpiu configure -protocol uart -output :3344" \
  -c "stm32f4x.tpiu configure -traceclk 168000000 -pin-freq 2000000" \
  -c "stm32f4x.tpiu enable"
```

`-traceclk 168000000`은 1-02의 168 MHz 설정을 가정한 값입니다. 받은 바이트는 ITM 패킷이므로 그대로 텍스트가 아닙니다. 설명서의 예는 `itmdump`로 디코드합니다. SEGGER J-Link를 쓴다면 RTT가 SWO 핀 없이 RAM 버퍼로 같은 일을 하고, J-Link RTT Client가 그 출력을 받습니다. SEGGER *J-Link RTT Client* 문서에 따르면 이 클라이언트는 J-Link Commander나 J-Link GDB Server처럼 debug 연결을 열고 있는 도구가 있어야 동작합니다.

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

`servertype`은 jlink·openocd·pyocd·stlink·qemu 등 GDB 서버 종류, `configFiles`는 OpenOCD `-f` 파일, `executable`은 심볼을 읽을 ELF입니다. `svdFile`은 cortex-debug 문서에 따르면 `mcu-debug.peripheral-viewer` 확장의 XPERIPHERALS 창이 쓰는 SVD 파일입니다(*debug_attributes.md*).

## SVD로 peripheral 보기

GDB 안에서는 PyCortexMDebug가 같은 일을 합니다. 저장소 README에 따르면 `svd_load`로 SVD를 읽고, `svd 주변장치`로 그 주변장치의 레지스터를, `svd 주변장치 레지스터`로 필드를 출력합니다.

```text
(gdb) source /path/to/gdb.py
(gdb) svd_load STM32F407.svd
(gdb) svd USART1
(gdb) svd USART1 SR
```

주소를 외우는 대신 레지스터와 필드 이름으로 읽게 됩니다. 실행하지 않았으므로 출력은 싣지 않았습니다.

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

OpenOCD를 백그라운드로 띄우고, GDB batch 모드로 flash와 reset을 한 뒤, UART로 결과를 받아 판정하는 구조입니다. `sleep 1`은 OpenOCD가 포트를 열기까지 기다리는 자리이고, 위의 `Listening on port 3333` 줄을 기다리게 바꾸면 더 확실합니다. 보드가 없어 실행하지 않았습니다.

## 자주 보는 함정

> Optimized 코드에 source-level breakpoint

```c
int compute(int x) {
    int a = x * 2;       // 2행: -O2에서도 명령 있음 (lsls)
    int b = a + 1;       // 3행: -O2·-Og에서 주소 없음
    return b;            // 4행: 주소 없음
}
```

이 함수를 `arm-none-eabi-gcc` 16.2.0 `-mcpu=cortex-m4 -mthumb -g`로 세 번 빌드해, `objdump -d -l`로 줄 번호에 붙은 명령을 봤습니다.

```text
== -O0
opt.c:1
opt.c:2
opt.c:3
opt.c:4
opt.c:5
== -O2
opt.c:2
   0:	lsls	r0, r0, #1
opt.c:5
   2:	adds	r0, #1
   4:	bx	lr
```

`-O0`에서는 다섯 줄 모두 명령이 있습니다. `-O2`에서는 2행과 5행에만 명령이 있고, 3·4행에는 주소가 없습니다. `-Og`도 이 함수에서는 `-O2`와 같은 두 줄만 남았습니다. LLDB에서 `-O2` 빌드의 3행이나 4행에 breakpoint를 걸면 5행(`compute + 2`)에 걸립니다. 줄과 주소의 대응은 GDB의 `info line`, LLDB의 `image lookup -f opt.c -l 3`으로 확인하고, 모든 줄에서 멈춰야 하면 그 파일만 `-O0`으로 빌드합니다.

> Hardware breakpoint 부족

위 Cortex-M4 TRM대로 FPB의 instruction comparator는 6개 또는 2개입니다. OpenOCD 설명서 *GDB and OpenOCD*는 OpenOCD가 target 메모리 맵을 GDB에 알려 주면 GDB가 flash 영역에 hardware breakpoint를 기본으로 쓴다고 적으므로, flash 코드에서 동시에 걸 수 있는 breakpoint 수는 이 comparator 수가 정합니다. 같은 문서는 Cortex-M3 예로 GDB에 `set remote hardware-breakpoint-limit 6`과 `set remote hardware-watchpoint-limit 4`를 알려 주는 설정을 보입니다. 칩의 실제 개수에 맞춰 이 값을 고칩니다.

> Watchpoint를 변수가 아닌 *주소*로 걸어야 할 때

```text
(gdb) watch *(uint32_t*)0x20001234
```

GDB 16.3 설명서는 지역 변수에 건 watchpoint를 그 블록을 벗어날 때 자동으로 지운다고 적습니다. 함수가 끝난 뒤에도 그 메모리를 지켜봐야 하면 `watch -l`로 주소를 지켜보거나 위처럼 주소로 겁니다.

> Stack overflow로 backtrace 망가짐

backtrace는 stack에 저장된 복귀 주소와 프레임 정보를 따라가므로, 그 영역이 덮이면 엉뚱한 주소가 나오거나 중간에 끊깁니다. 이때는 stack 끝에 MPU guard를 두어 덮이는 순간 fault가 나게 하는 방법이 [10-08: 메모리 오염 진단](/blog/embedded/modern-recipes/part10-08-memory-corruption)에 있습니다.

## 정리

- OpenOCD/pyOCD가 gdbserver, GDB가 client. JTAG/SWD를 통해 통신합니다.
- `target extended-remote :3333`로 붙고, `monitor`로 OpenOCD 명령을 내립니다.
- LLDB `-w write`는 값이 같아도 쓰기마다 멈추고(네 번), GDB `watch`와 같은 LLDB `-w modify`는 값이 바뀐 i = 11에서만 멈췄습니다(QEMU 실행). Cortex-M4의 watchpoint는 칩에 따라 1개 또는 4개입니다.
- 프로젝트 `.gdbinit`은 `auto-load safe-path`에 등록해야 읽힙니다.
- OpenOCD는 `-rtos`를 줘야 RTOS task를 thread로 보여 줍니다.
- SVD로 peripheral register를 이름으로 읽습니다(cortex-debug, PyCortexMDebug).
- `-O2`·`-Og`에서는 주소가 없는 줄이 생깁니다. 모든 줄에서 멈춰야 하면 그 파일을 `-O0`으로 빌드합니다.

다음 편은 **하드폴트 분석**입니다.

## 관련 항목

- [10-04: 하드폴트 분석](/blog/embedded/modern-recipes/part10-04-hardfault-analysis)
- [10-08: 메모리 오염 진단](/blog/embedded/modern-recipes/part10-08-memory-corruption)
- [10-11: 로깅 시스템 설계](/blog/embedded/modern-recipes/part10-11-logging-system)
