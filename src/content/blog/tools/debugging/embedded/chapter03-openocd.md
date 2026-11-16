---
title: "OpenOCD 심화 분석 — Configuration·Adapter·Target 통합"
slug: "tools/debugging/embedded/chapter03-openocd"
date: 2026-05-26T09:03:00
description: "TCL 인터프리터, target/interface 설정, flash driver, custom 명령, multi-core."
tags: [openocd, embedded, tcl, flash]
series: "Embedded Debugging"
seriesOrder: 3
draft: false
topics: ["tools", "tools/debugging"]
---

OpenOCD(Open On-Chip Debugger)는 오픈 소스 임베디드 디버그 데몬입니다. 프로브(adapter)·코어(target)·flash driver 조합을 다루며, 내장 *Tcl 인터프리터*로 모든 동작을 스크립트로 묶을 수 있습니다. 이 장은 OpenOCD를 블랙박스로 두지 않고 안쪽을 봅니다. Tcl 명령 체계, 설정 파일, flash driver, 이벤트, RTOS 지원이 차례로 나옵니다.

:::tldr
JTAG/SWD 프로브와 칩 사이의 매개 데몬입니다. GDB 쪽에는 RSP 서버로, 사람과 스크립트 쪽에는 telnet·Tcl RPC 서버로 보이고, 안쪽은 Tcl 스크립트와 칩별 driver로 묶여 있습니다.
:::

## 실험 환경과 한계

프로브와 보드가 없으므로, 이 장은 OpenOCD를 *가짜 adapter*로 띄워 실제로 확인할 수 있는 것만 실행했습니다. OpenOCD에는 하드웨어 없이 JTAG 상태 천이만 흉내 내는 `dummy` adapter와, 기능이 거의 없는 시험용 `testee` target이 들어 있습니다.

| 항목 | 값 |
|------|-----|
| OpenOCD | Open On-Chip Debugger 0.12.0 (Debian `openocd 0.12.0-3+b2`, arm64) |
| 게스트 OS | Debian 13.7 arm64 (QEMU `virt`) |
| 설정 | 아래 `dummy.cfg` |
| 소스 | OpenOCD git main(2026-11) 소스와 `doc/openocd.texi`를 읽기 전용으로 참조 |

```tcl title="dummy.cfg"
# OpenOCD 0.12.0 with no probe: dummy adapter + testee target
adapter driver dummy
transport select jtag
adapter speed 1000
jtag newtap chip cpu -irlen 4 -expected-id 0x4ba00477
target create chip.cpu testee -chain-position chip.cpu
```

이 구성으로는 서버 기동, 설정 탐색, telnet·Tcl RPC, 이벤트, 오류 메시지 형식까지 볼 수 있습니다. 반면 메모리 읽기, flash 쓰기, halt 같은 *타깃 동작*은 하나도 되지 않으며, 그 부분은 소스와 매뉴얼을 인용합니다.

## 내부 구조

![OpenOCD 내부 구조](/images/blog/tools/diagrams/openocd-architecture.svg)

OpenOCD 소스 트리도 이 구조대로 나뉩니다.

- **Adapter driver** (`src/jtag/drivers/`) — 프로브와의 통신. CMSIS-DAP, J-Link, ST-LINK, FTDI MPSSE, 이 장의 `dummy` 등.
- **Target driver** (`src/target/`) — 코어 동작. `cortex_m`, `cortex_a`, `riscv` 등.
- **Flash driver** (`src/flash/nor/`) — 칩별 flash 프로그래밍. `stm32f2x`, `nrf5` 등.
- **서버** (`src/server/`) — GDB(RSP), telnet, Tcl RPC.
- **Tcl 인터프리터** — 위를 묶고 사용자 명령으로 노출.

설정 파일이 *interface*와 *target*으로 갈리는 이유가 이 분리입니다.

## 실행과 설정

```bash
openocd -f interface/stlink.cfg -f target/stm32f4x.cfg
```

`-f`는 설정 파일, `-c`는 Tcl 명령 한 줄입니다. 둘 다 여러 번 쓸 수 있고 순서대로 실행됩니다. 설정 단계를 끝내는 명령은 `init`입니다. 매뉴얼은 설정 파일과 명령줄 어디에도 `init`이 없으면 *모든 설정을 처리한 뒤 OpenOCD가 직접 실행한다*고 적습니다.

### 포트

dummy 구성으로 띄웠을 때 서버 로그입니다.

```text
Info : Listening on port 6666 for tcl connections
Info : Listening on port 4444 for telnet connections
```

| 포트 | 용도 |
|------|------|
| 3333 | GDB RSP (`src/server/gdb_server.c`의 기본값) |
| 4444 | telnet (사람용 Tcl 셸) |
| 6666 | Tcl RPC (스크립트용) |

3333은 열리지 않았습니다. `-d3` 로그에 이유가 남습니다.

```text
Debug: 145 2 gdb_server.c:3819 gdb_target_add_one(): skip gdb server for target chip.cpu
```

`target_supports_gdb_connection()`(`src/target/target.c`)은 target 타입이 `get_gdb_reg_list`를 제공해야 GDB 포트를 연다고 정하는데, `testee`에는 그게 없습니다. 실제 `cortex_m` target이라면 여기서 3333이 열립니다.

### telnet과 Tcl RPC

4444에 붙으면 Tcl 셸이 나옵니다. dummy 구성에서 실제로 받은 응답입니다.

```text
> version
 Open On-Chip Debugger 0.12.0
> targets
     TargetName         Type       Endian TapName            State       
--  ------------------ ---------- ------ ------------------ ------------
 0* chip.cpu           testee     little chip.cpu           unknown

> mdw 0x20000000 4
 Target chip.cpu doesn't support read_memory
```

6666은 명령 끝을 바이트 `0x1a`로 표시하는 RPC입니다. Python으로 `expr {6*7}` 뒤에 `0x1a`를 붙여 보내면 응답도 `0x1a`로 끝났습니다.

```text
b'Open On-Chip Debugger 0.12.0\x1a'
b'42\x1a'
```

CI처럼 프로그램이 OpenOCD를 조작할 때는 이 RPC가 telnet보다 다루기 쉽습니다. 응답의 끝이 분명하기 때문입니다.

### `echo`와 `puts`

같은 telnet 세션에서 두 명령의 출력 위치가 달랐습니다. `echo "from echo"`는 telnet 화면과 서버 로그 양쪽에 찍혔고, `puts "from puts"`는 telnet에는 아무것도 나오지 않고 *OpenOCD 프로세스의 표준 출력*에만 찍혔습니다. 사람이 보는 telnet에 메시지를 띄우려면 `echo`를 씁니다.

### 디버그 레벨

`-d`만 주면 레벨 3입니다(매뉴얼: 기본 2, `-d`는 3). 레벨 범위는 버전에 따라 다릅니다. 0.12.0에서 `debug_level 5`를 주자 다음 오류가 났습니다.

```text
Error: level must be between -3 and 4
```

현재 main의 매뉴얼은 레벨 5에 USB 통신 메시지를 추가했다고 적고 있으니, 설치한 버전의 `debug_level` 도움말을 먼저 봐야 합니다.

`-d3` 로그 한 줄의 형식은 `Debug: <순번> <경과 ms> <파일>:<줄> <함수>(): <메시지>`입니다. dummy 구성의 실제 줄입니다.

```text
Debug: 120 2 dummy.c:46 dummy_write(): dummy_tap: IRSELECT
Debug: 121 2 dummy.c:46 dummy_write(): dummy_tap: IRCAPTURE
Debug: 122 2 dummy.c:46 dummy_write(): dummy_tap: IRSHIFT
Debug: 134 2 arm_dap.c:97 dap_init_all(): Initializing all DAPs ...
Debug: 135 2 openocd.c:151 handle_init_command(): Examining targets...
Debug: 136 2 target.c:1843 target_call_event_callbacks(): target event 19 (examine-start) for core chip.cpu
```

2장의 TAP 상태(IRSELECT → IRCAPTURE → IRSHIFT)가 그대로 찍히고, 소스 파일과 줄 번호가 붙으므로 실패한 지점을 소스에서 바로 찾을 수 있습니다.

### 설정 파일이 어디 있나

`-d3` 로그는 검색 디렉터리도 보여 줍니다.

```text
Debug: 9 1 configuration.c:33 add_script_search_dir(): adding /root/.config/openocd
Debug: 10 1 configuration.c:33 add_script_search_dir(): adding /root/.openocd
Debug: 11 1 configuration.c:33 add_script_search_dir(): adding /usr/bin/../share/openocd/site
Debug: 12 1 configuration.c:33 add_script_search_dir(): adding /usr/bin/../share/openocd/scripts
```

`-f target/stm32f4x.cfg`의 상대 경로는 이 순서로 찾습니다. Debian 패키지의 `/usr/share/openocd/scripts/`에는 `board/`, `chip/`, `cpld/`, `cpu/`, `fpga/`, `interface/`, `target/`, `test/`, `tools/` 디렉터리가 있었고, `target/` 아래 파일은 309개였습니다. `-s <dir>`로 검색 디렉터리를 더할 수 있습니다.

## interface 설정

설치된 0.12.0의 `interface/stlink.cfg` 본문입니다(주석 일부 생략).

```tcl
adapter driver hla
hla_layout stlink
hla_device_desc "ST-LINK"
hla_vid_pid 0x0483 0x3744 0x0483 0x3748 0x0483 0x374b 0x0483 0x374d 0x0483 0x374e 0x0483 0x374f 0x0483 0x3752 0x0483 0x3753 0x0483 0x3754
```

`hla`는 *High Level Adapter* 드라이버입니다. 매뉴얼은 이 종류의 adapter가 "OpenOCD가 평소 타깃 접근에 쓰는 저수준 API 일부를 노출하지 않는다"고 설명하고, 지원 대상으로 ST-LINK, TI ICDI, Nuvoton Nu-Link를 듭니다. 같은 ST-LINK를 DAP 수준에서 쓰는 `interface/stlink-dap.cfg`도 따로 있습니다.

`adapter speed`의 단위는 kHz입니다. 매뉴얼은 칩 데이터시트가 최대 디버그 클럭을 정하고 PCB 배선이 그 값을 더 낮출 수 있다고 적으며, 지정한 값보다 빠르게 동작하지는 않는다고 설명합니다.

## target 설정

설치된 0.12.0의 `target/stm32f4x.cfg`에서 핵심 줄을 골랐습니다(왼쪽 숫자는 파일 줄 번호).

```text
8:source [find target/swj-dp.tcl]
9:source [find mem_helper.tcl]
24:   set _WORKAREASIZE 0x8000
40:swj_newdap $_CHIPNAME cpu -irlen 4 -ircapture 0x1 -irmask 0xf -expected-id $_CPUTAPID
41:dap create $_CHIPNAME.dap -chain-position $_CHIPNAME.cpu
48:target create $_TARGETNAME cortex_m -endian $_ENDIAN -dap $_CHIPNAME.dap
50:$_TARGETNAME configure -work-area-phys 0x20000000 -work-area-size $_WORKAREASIZE -work-area-backup 0
53:flash bank $_FLASHNAME stm32f2x 0 0 0 0 $_TARGETNAME
55:flash bank $_CHIPNAME.otp stm32f2x 0x1fff7800 0 0 0 $_TARGETNAME
60:   flash bank $_QSPINAME stmqspi 0x90000000 0 0 0 $_TARGETNAME 0xA0001000
```

STM32F4도 flash driver 이름은 `stm32f2x`입니다. 기본 work area는 0x8000(32 KiB)이고, OTP 영역과 QSPI flash가 별도 bank로 등록됩니다.

| Tcl 명령 | 의미 |
|----------|------|
| `swj_newdap` | JTAG 또는 SWD로 접근할 TAP/DAP 노드 정의 |
| `dap create` | DAP 인스턴스 |
| `target create` | CPU target 생성 |
| `flash bank` | flash 영역과 driver 등록 |
| `configure` | target 추가 옵션 |

`-work-area-phys`·`-work-area-size`는 flash 알고리즘과 데이터 버퍼를 올릴 SRAM 영역입니다. `-work-area-backup`에 대해 매뉴얼은 기본값이 *백업하지 않음*이며, 백업은 동작을 느리게 하므로 가능하면 백업이 필요 없는 영역(SRAM 끝 쪽처럼 빌드가 잘 쓰지 않는 곳)을 고르라고 권합니다. 즉 0이면 flash 작업 뒤 그 SRAM 내용이 바뀌어 있을 수 있습니다.

## init과 reset

```tcl
init           ;# 설정 단계 종료, 서버 시작
reset          ;# 리셋 후 실행
reset halt     ;# 리셋 후 정지
reset init     ;# 리셋 후 정지, reset-init 이벤트 실행
```

`reset init`은 리셋 직후 보드별 초기화(클럭, 외부 메모리 등)를 `reset-init` 이벤트로 실행합니다. 매뉴얼은 이 이벤트가 `reset-deassert-post` 다음에 일어난다고 적습니다.

```tcl
$_TARGETNAME configure -event reset-init {
    # 보드 매뉴얼로 확인한 clock/memory 초기화 proc만 호출
    # board_clock_init
}
```

클럭 전환은 레지스터 하나에 값을 쓰는 것으로 끝나지 않습니다. PLL ready 대기, flash wait-state, 버스 분주비 순서를 칩 레퍼런스 매뉴얼대로 구현해야 합니다.

### 이벤트

매뉴얼 *Target Events* 절에 정의된 이벤트 가운데 자주 쓰는 것들입니다.

| 이벤트 | 시점 (매뉴얼 기준) |
|--------|------|
| `examine-start` / `examine-end` | target examine 직전 / 오류 없이 끝난 직후 |
| `reset-start` | reset 처리의 첫 단계 |
| `reset-assert-pre` / `reset-assert-post` | SRST·TRST를 걸기 직전 / 직후 |
| `reset-deassert-pre` / `reset-deassert-post` | 리셋을 풀기 직전 / 직후 |
| `reset-init` | `reset init`의 보드 초기화, `reset-deassert-post` 다음 |
| `reset-end` | reset 처리의 마지막 단계 |
| `gdb-attach` / `gdb-detach` | GDB 연결 / 해제 |
| `gdb-flash-erase-start` / `-end` | GDB가 flash를 지우기 전 / 후 |
| `gdb-flash-write-start` / `-end` | GDB가 flash에 쓰기 전 / 후 |
| `resume-start` / `resume-end` | resume 전 / 모든 target resume 후 |

이벤트에는 OpenOCD가 기본 핸들러를 걸어 둔 것도 있습니다. dummy 구성의 `-d3` 로그에서 `target create` 직후 실행된 명령입니다.

```text
Debug: 36 1 command.c:155 script_debug(): command - chip.cpu configure -event gdb-flash-erase-start reset init
Debug: 38 1 command.c:155 script_debug(): command - chip.cpu configure -event gdb-flash-write-end reset halt
Debug: 40 1 command.c:155 script_debug(): command - chip.cpu configure -event gdb-attach halt 1000
```

GDB가 `load`로 flash를 지우기 전에 `reset init`, 쓰기를 마친 뒤 `reset halt`, 붙을 때 `halt 1000`이 기본입니다. 매뉴얼의 `gdb-attach` 설명도 "GDB는 붙는 동안 타깃이 멈춰 있다고 기대한다"고 적습니다.

## Tcl 인터프리터 — 모든 것이 명령

```tcl
# 메모리 (m=memory, d=display, w=word/h=halfword/b=byte)
mdw 0x20000000 16
mdh 0x20000000 16
mdb 0x20000000 64
mww 0x20000100 0xdeadbeef
mwh 0x20000100 0x1234
mwb 0x20000100 0xff

# 레지스터
reg                 ;# 전체
reg pc              ;# 하나
reg r0 0x12345678   ;# 쓰기

# 실행 제어
halt
resume
resume 0x08000124
step

# Flash
flash banks
flash erase_sector 0 0 last
flash write_image erase fw.elf
verify_image fw.elf
```

`help <명령>`이 사용법을 알려 줍니다. 0.12.0의 `help mdw` 출력입니다.

```text
   chip.cpu mdw address [count]
        Display target memory as 32-bit words
mdw ['phys'] address [count]
      display memory words
```

Tcl 문법(변수, `if`, `foreach`, `proc`)도 그대로 씁니다.

```tcl
proc dump_regs {} {
    foreach n {r0 r1 r2 r3 r12 sp lr pc xpsr} {
        echo "$n = [reg $n]"
    }
}
```

## 보드 하나에 cfg 하나

팀에서 보드별 cfg를 공유하면 모든 개발자가 같은 명령으로 굽고 디버깅합니다. 아래는 CMSIS-DAP + nRF52 조합의 예입니다.

```tcl
# board/my_custom.cfg
source [find interface/cmsis-dap.cfg]
transport select swd
adapter speed 4000

source [find target/nrf52.cfg]

proc flash_app {filename} {
    program $filename verify reset
    echo "$filename flashed and running"
}

proc dump_rtt {} {
    rtt setup 0x20000000 0x10000 "SEGGER RTT"
    rtt start
    rtt server start 9090 0
    echo "RTT server on localhost:9090"
}
```

`program`은 매뉴얼 기준 `program filename [preverify] [verify] [reset] [exit] [offset]` 형식의 helper입니다. 0.12.0의 `help program`은 `program <filename> [address] [pre-verify] [verify] [reset] [exit]`로 표기했습니다.

## Flash driver의 안쪽

`flash write_image`나 GDB `load`가 flash에 쓸 때, flash driver는 데이터를 SWD로 한 워드씩 밀어 넣지 않습니다. 대신 *칩 CPU에서 도는 작은 쓰기 루틴(flash algorithm)*을 work area에 올리고, 호스트는 데이터만 work area의 버퍼에 채웁니다.

OpenOCD는 이 방식을 `target_run_flash_async_algorithm()`(`src/target/target.c`)으로 공통화했습니다. `stm32f2x.c`와 `nrf5.c`가 이 함수를 호출합니다. 이름 그대로, 호스트가 버퍼를 채우는 동안 타깃 쪽 루틴이 앞서 받은 데이터를 flash에 쓰는 구조입니다. 2장에서 본 것처럼 SWD로 메모리 한 워드를 쓰는 데도 여러 번의 DP/AP 왕복이 필요하므로, flash 컨트롤러 대기까지 호스트가 직접 폴링하는 방식보다 왕복 수가 줄어듭니다. 이 장에서 속도를 측정하지는 않았습니다.

새 칩을 지원하려면 그 칩 레퍼런스 매뉴얼의 flash 쓰기 순서(unlock, erase, program, 상태 확인)를 driver와 algorithm으로 옮깁니다.

## RTT (Real-Time Transfer)

SEGGER RTT 호환 기능은 OpenOCD 0.11.0에서 들어왔습니다(`NEWS-0.11.0`: "SEGGER Real Time Transfer (RTT) initial support"). 명령은 매뉴얼 기준으로 다음과 같습니다.

```tcl
rtt setup 0x20000000 0x10000 "SEGGER RTT"   ;# 이 범위에서 control block 검색
rtt start
rtt server start 9090 0                     ;# 채널 0 -> TCP 9090
```

매뉴얼은 `rtt setup`의 ID 기본값이 `"SEGGER RTT"`라고 적습니다. 메모리 폴링 주기는 `rtt polling_interval`로 바꾸며, 소스(`src/rtt/rtt.c`)의 기본값은 100 ms입니다. 채널 구조와 동작은 6장에서 다룹니다.

## SWO / ITM trace

0.12.0부터는 TPIU를 `tpiu create`로 만들고 `<이름> configure`로 설정합니다. 예전 `tpiu config`는 deprecated입니다. 명령과 매뉴얼 예는 2장 SWO 절에 정리했습니다. ITM 포트는 `itm port <n> on`, `itm ports on`으로 켭니다.

## Multi-core

다음은 *가상의* Cortex-A 두 개 + Cortex-M 하나 구성을 설명하는 스케치입니다. 실제 SoC의 코어 종류, AP 번호, reset 구조는 부품마다 다르므로 그대로 쓰지 않습니다.

```tcl
swj_newdap $_CHIPNAME cpu -irlen 4 ...
dap create $_CHIPNAME.dap -chain-position $_CHIPNAME.cpu

target create $_CHIPNAME.a9_0 cortex_a -dap $_CHIPNAME.dap -ap-num 0 -coreid 0
target create $_CHIPNAME.a9_1 cortex_a -dap $_CHIPNAME.dap -ap-num 0 -coreid 1
target create $_CHIPNAME.m3   cortex_m -dap $_CHIPNAME.dap -ap-num 1

$_CHIPNAME.a9_0 configure -gdb-port 3333
$_CHIPNAME.a9_1 configure -gdb-port 3334
$_CHIPNAME.m3   configure -gdb-port 3335
```

target마다 GDB 포트가 따로 열리므로 GDB 세션을 각각 붙입니다.

### SMP

대칭 멀티 코어는 `target smp`로 묶습니다.

```tcl
target smp $_CHIPNAME.a9_0 $_CHIPNAME.a9_1
```

매뉴얼은 SMP에서 GDB 인스턴스가 하나만 만들어지며, 하드웨어 BP는 목록의 모든 target에 같이 걸리고, `halt`·`resume`도 모든 target에 적용되며, BP로 멈춘 target이 GDB 세션에 표시된다고 설명합니다.

## RTOS-aware

```tcl
$_TARGETNAME configure -rtos FreeRTOS
$_TARGETNAME configure -rtos auto
```

활성화하면 GDB의 `info threads`에 RTOS task 목록이 나옵니다. 0.12.0에서 지원 목록을 직접 물어보면 이렇게 답합니다.

```text
Unknown RTOS type nosuchos, try one of: ThreadX, FreeRTOS, eCos, linux, chibios, Chromium-EC, embKernel, mqx, uCOS-III, nuttx, RIOT, Zephyr, hwthread, , auto or none
```

OpenOCD는 RTOS 내부 구조를 *ELF 심볼*로 찾아 메모리에서 직접 읽습니다. 펌웨어를 고칠 필요는 없지만 심볼이 있는 ELF가 필요합니다. FreeRTOS의 경우 `src/rtos/freertos.c`가 찾는 심볼은 `pxCurrentTCB`, `pxReadyTasksLists`, `xDelayedTaskList1/2`, `pxDelayedTaskList`, `pxOverflowDelayedTaskList`, `xPendingReadyList`, `uxCurrentNumberOfTasks`, `xSchedulerRunning` 등이고, `uxTopUsedPriority`가 없으면 스레드 목록을 만들 때 `FreeRTOS: uxTopUsedPriority is not defined, consult the OpenOCD manual for a work-around` 오류를 냅니다. FreeRTOS 커널의 `tasks.c`는 바로 이 용도로 `uxTopUsedPriority`를 정의하고, 주석에 "OpenOCD makes use of uxTopUsedPriority for thread debugging"이라고 적어 최적화로 사라지지 않게 참조해 둡니다. 7장에서 이 부분을 다시 봅니다.

## 보안 — readout protection

STM32F2/F4/F7 계열은 `stm32f2x` driver의 명령으로 다룹니다. 매뉴얼에 정의된 명령은 `stm32f2x lock num`, `stm32f2x unlock num`, `stm32f2x mass_erase num`, `stm32f2x options_read num`, `stm32f2x options_write num user_options boot_addr0 boot_addr1`이며, `num`은 `flash banks`에 나오는 번호입니다.

```tcl
reset halt
stm32f2x unlock 0
reset halt
```

`options_write`에 대해 매뉴얼은 "비트의 의미는 기기마다 다르니 항상 데이터시트를 확인하라"고 경고합니다. RDP 레벨을 낮추면 flash가 지워진다는 동작과 레벨별 영구성은 ST 레퍼런스 매뉴얼이 정하는 내용이며, 이 장에서는 확인하지 않았습니다.

nRF52는 0.12.0의 `target/nrf52.cfg`에 복구 절차가 Tcl proc로 들어 있습니다. `nrf52_check_ap_lock`이 CTRL-AP(AP #1)의 APPROTECTSTATUS를 읽어 잠겨 있으면 `nRF52 device has AP lock engaged (see UICR APPROTECT register).`를 출력하고 `nrf52_recover`를 권합니다. `nrf52_recover`는 CTRL-AP IDR이 `0x02880000`인지 확인한 뒤 ERASEALL을 걸어 칩을 지우고 잠금을 풉니다.

## 문제를 계층으로 나누기 — 실제 실패 로그

프로브가 붙지 않을 때 가장 먼저 볼 곳은 JTAG 스캔 결과입니다. dummy adapter는 TDO에 의미 있는 값을 돌려주지 않으므로, *체인이 끊긴 보드*와 비슷한 로그가 나옵니다.

```text
Info : clock speed 1000 kHz
Info : TAP chip.cpu does not have valid IDCODE (idcode=0x0)
Info : TAP auto0.tap does not have valid IDCODE (idcode=0x80000000)
Info : TAP auto1.tap does not have valid IDCODE (idcode=0xc0000000)
...
Info : TAP auto19.tap does not have valid IDCODE (idcode=0xfffff000)
Warn : Unexpected idcode after end of chain: 21 0xfffff800
Error: double-check your JTAG setup (interface, speed, ...)
Error: Trying to use configured scan chain anyway...
Error: chip.cpu: IR capture error; saw 0x0f not 0x01
Warn : Bypassing JTAG setup events due to errors
```

읽는 법은 이렇습니다. IDCODE의 비트 0은 항상 1이어야 하는데(2장), 첫 값이 0이고 이후 값은 1이 한 비트씩 위에서 차오릅니다. 실제 TAP이 응답한 것이 아니라 TDO가 고정된 레벨로 읽히고 있다는 뜻입니다. 선언한 TAP 뒤로 21번째 위치까지 이상한 값이 이어지니 OpenOCD가 *체인 끝 뒤의 IDCODE*를 경고했고, IR capture 값도 기대한 `0x01` 대신 `0x0f`였습니다. 실물 보드에서 같은 패턴이 나오면 전원·배선·클럭 속도를 먼저 의심할 근거가 됩니다.

소스에서 확인한 다른 메시지와 그 뜻입니다.

| 메시지 | 출처 | 뜻 |
|--------|------|-------------|
| `unable to find a matching CMSIS-DAP device` | `src/jtag/drivers/cmsis_dap.c` | USB에서 CMSIS-DAP 프로브를 찾지 못함 |
| `Target voltage: %f` | `src/jtag/drivers/stlink_usb.c` | ST-LINK가 측정한 타깃 전압 |
| `not examined` | `src/target/target.c` | examine 전에 target 접근을 시도 |
| `Can not find free FPB Comparator!` | `src/target/cortex_m.c` | 하드웨어 BP 비교기 소진 |
| `flash driver '%s' not found` | `src/flash/nor/tcl.c` | `flash bank`의 driver 이름이 틀림 |
| `FreeRTOS: uxTopUsedPriority is not defined, ...` | `src/rtos/freertos.c` | RTOS-aware에 필요한 심볼 없음 |
| `nRF52 device has AP lock engaged ...` | `tcl/target/nrf52.cfg` | nRF52 APPROTECT 잠금 |

## 자동화 — 검증 실패 뒤 재개하지 않기

flash 쓰기의 byte 검증과 실행 검증은 별개입니다. 다음 proc은 `program`의 verify가 실패하면 그 자리에서 Tcl 오류로 멈추므로 `reset run`까지 가지 않습니다. `src/flash/startup.tcl`의 `program`은 verify 실패 시 `program_error "** Verify Failed **"`를 부르고, 이 proc은 `exit` 인자가 없으면 `error`로 Tcl 오류를 던집니다. UART나 RTT로 부트 로그를 받는다면 수집기를 reset 전에 시작해 부팅 초반 로그가 빠지지 않게 합니다.

```tcl title="flash-plan.tcl"
proc flash_app {filename} {
    reset init
    program $filename verify
    reset run
    echo "verified and running: $filename"
}
flash_app firmware.elf
```

이 proc은 실제 target cfg를 로드하고 `init`한 문맥에서 써야 합니다. 프로브와 보드가 없어 장치에서는 실행하지 않았습니다. [Flash Programming 문서](https://openocd.org/doc/html/Flash-Commands.html)와 [Tcl RPC 문서](https://openocd.org/doc/html/Tcl-Scripting-API.html)를 참고합니다.

## 정리

- OpenOCD는 Tcl 인터프리터에 adapter·target·flash driver와 GDB·telnet·Tcl RPC 서버를 묶은 데몬입니다.
- 포트는 GDB 3333, telnet 4444, Tcl RPC 6666이며, Tcl RPC는 `0x1a`로 명령 끝을 표시합니다.
- GDB 포트는 GDB 레지스터 목록을 제공하는 target에만 열립니다.
- `-d3` 로그는 소스 파일·줄 번호·함수를 함께 찍으므로 실패 지점을 소스에서 바로 찾을 수 있습니다.
- STM32F4의 flash driver 이름은 `stm32f2x`이고, readout protection 명령도 `stm32f2x lock/unlock`입니다.
- flash 쓰기는 work area에 올린 타깃 쪽 루틴(`target_run_flash_async_algorithm`)으로 수행합니다.
- FreeRTOS awareness에는 `uxTopUsedPriority`를 포함한 커널 심볼이 필요합니다.
- IDCODE가 0이나 1이 차오르는 값으로 읽히면 실제 TAP 응답이 아니라 TDO가 고정된 상태입니다.

## 다음 장 예고

Ch 4 — J-Link / SEGGER 도구 체인. J-Link GDB Server, J-Link Commander, Unlimited Flash Breakpoints, RTT.

## 관련 항목

- [Ch 2: JTAG / SWD / CoreSight](/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight)
- [Ch 4: J-Link 도구 체인](/blog/tools/debugging/embedded/chapter04-jlink)
- [OpenOCD 공식 문서](https://openocd.org/doc/html/)
- [Tcl 8.6 reference](https://www.tcl.tk/man/tcl/) — Tcl 문법
- OpenOCD 소스: `src/server/`, `src/target/`, `src/flash/nor/`, `src/rtos/`
