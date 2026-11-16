---
title: "J-Link 도구 체인 분석 — JLinkExe·RTT·GDB Server 활용"
slug: "tools/debugging/embedded/chapter04-jlink"
date: 2026-05-26T09:04:00
description: "JLinkGDBServer, JLinkExe, J-Run, J-Trace, Unlimited Flash BP, RTT, Ozone."
tags: [jlink, segger, embedded, rtt]
series: "Embedded Debugging"
seriesOrder: 4
draft: false
topics: ["tools", "tools/debugging"]
---

J-Link는 SEGGER의 디버그 프로브와 그 소프트웨어 도구 체인입니다. 3장의 OpenOCD가 *공개 소스의 Tcl 데몬*이라면, J-Link는 프로브·DLL·GDB Server·Commander·RTT 도구를 한 벤더가 함께 만든 묶음입니다.

이 장은 그 도구들을 용도별로 나눠 봅니다. J-Link GDB Server, J-Link Commander, J-Run, Unlimited Flash Breakpoints, RTT, Ozone이 대상입니다.

:::tldr
GDB를 붙일 때는 J-Link GDB Server(기본 포트 2331), 스크립트로 굽고 확인할 때는 J-Link Commander, CI에서 실행 결과를 받을 때는 J-Run을 씁니다. 기능별 포함 조건은 프로브 모델마다 다릅니다.
:::

## 이 장의 근거와 한계

J-Link 소프트웨어는 SEGGER의 사용 약관에 동의해야 내려받을 수 있고, 이 장을 쓴 환경에는 J-Link 프로브와 보드도 없습니다. 그래서 **이 장의 J-Link 명령은 하나도 실행하지 않았습니다.** 명령 이름·옵션·기본값은 모두 2026-11에 확인한 SEGGER 문서에서 가져왔고, 세션 출력은 SEGGER 문서에 실린 예를 출처와 함께 옮겼습니다.

| 문서 | 다루는 것 |
|------|-----------|
| [J-Link GDB Server](https://kb.segger.com/J-Link_GDB_Server) | 명령줄 옵션, monitor 명령, 포트 |
| [J-Link Commander](https://kb.segger.com/J-Link_Commander) | Commander 명령과 batch 옵션 |
| [J-Run](https://kb.segger.com/J-Run) | 자동 테스트 실행 |
| [RTT](https://kb.segger.com/RTT) | control block 검색, 버퍼 모드, Telnet 채널 |
| [Unlimited Flash Breakpoints](https://www.segger.com/products/debug-probes/j-link/technology/flash-breakpoints/) | flash BP 동작과 라이선스 |

## 프로브와 기능 선택

모델마다 지원 인터페이스·trace 캡처·Ethernet·포함 소프트웨어 라이선스가 다릅니다. [J-Link 제품 목록](https://www.segger.com/products/debug-probes/j-link/)에서 모델을 확인합니다. 이 글은 가격이나 모델 간 속도를 비교하지 않습니다.

## 설치

```bash
# macOS (Homebrew cask)
brew install --cask segger-jlink
```

2026-11에 `brew info --cask segger-jlink`가 보여 준 cask는 `segger-jlink (Segger J-Link Command Line Tools): 9.94`였습니다. Linux는 SEGGER 다운로드 페이지에서 약관에 동의하고 패키지를 받습니다.

## J-Link Commander

J-Link Commander(Linux·macOS 실행 파일 `JLinkExe`)는 프로브를 직접 다루는 대화형 셸입니다. OpenOCD의 telnet 4444와 비슷한 자리지만 Tcl이 아니라 자체 명령 언어입니다. 문서의 명령 표에서 자주 쓰는 것을 골랐습니다(괄호는 문서에 나온 짧은 이름).

| 명령 | 동작 |
|------|------|
| `Device <name>` | 연결할 장치 선택 |
| `SelectInterface` (`SI`) | 인터페이스 선택 (SWD/JTAG) |
| `Speed` | 인터페이스 속도 |
| `Connect` (`Con`) | 타깃 연결 |
| `Reset` (`R`) / `Halt` (`H`) / `Go` (`G`) | 리셋·정지·실행 |
| `Regs` / `RReg` / `WReg` | 레지스터 전체 표시·읽기·쓰기 |
| `Mem32` / `Write4` (`W4`) | 32비트 메모리 읽기·쓰기 |
| `Erase` / `LoadFile` / `VerifyBin` / `SaveBin` | flash 지우기·쓰기·raw binary 비교·덤프 |
| `ExitOnError` (`EoE`) / `Exit` | 오류 시 종료 / 종료 |

batch 실행에는 명령줄 옵션을 씁니다. 문서에 있는 옵션은 `-AutoConnect <Value>`, `-CommandFile <path>`, `-ExitOnError <Value>`, `-NoGui <Value>`, `-Device`, `-If`, `-Speed`, 여러 프로브를 꽂았을 때 고르는 `-USB <SerialNo / Nickname>`(V7.92d부터) 등입니다. 문서의 예입니다.

```text
JLink.exe -device CC2538SF53 -if JTAG -speed 4000 -jtagconf -1,-1 -autoconnect 1 -CommandFile C:\Work\JLinkCommandFile.jlink
```

명령 파일은 위 명령을 한 줄씩 적은 텍스트입니다.

```text
ExitOnError 1
r
h
loadfile firmware.bin 0x08000000
verifybin firmware.bin 0x08000000
r
g
exit
```

문서는 `loadfile`이 flash download를 실행하고 성공하면 시간 통계를 출력한다고 설명합니다.

## J-Link GDB Server

GDB를 붙이는 데몬입니다. 문서가 정한 기본 포트는 세 개입니다.

| 옵션 | 기본값 | 용도 |
|------|--------|------|
| `-port` | 2331 | GDB RSP |
| `-swoport` | 2332 | SWO raw 출력 |
| `-telnetport` | 2333 | printf 출력(semihosting, 해석된 SWO) |
| `-RTTTelnetPort` | 19021 | RTT Telnet 채널 |

GDB Server를 여러 개 띄울 때는 이 포트를 모두 따로 지정해야 한다고 문서가 적고 있습니다.

자주 쓰는 옵션을 문서 설명대로 정리했습니다.

| 옵션 | 의미 (문서 기준) |
|------|------|
| `-device <name>` | 타깃 장치 이름 |
| `-if <Interface>` | 인터페이스. JTAG, SWD, FINE, 2-wire-JTAG-PIC32. **기본값은 JTAG** |
| `-speed <kHz>` | 초기 속도. `adaptive`, `auto` 또는 kHz 정수. CL 버전에서는 사실상 필수 |
| `-rtos <file>` | RTOS 플러그인. embOS와 FreeRTOS 플러그인이 `GDBServer` 디렉터리에 기본 포함 |
| `-singlerun` / `-s` | 모든 클라이언트가 끊기면 종료, 타깃 연결 실패 시 즉시 종료 |
| `-strict` | 설정 검사. 장치 이름이 없거나 모르는 이름이면 "Unspecified"로 넘어가지 않고 종료 |
| `-vd` / `-novd` | 다운로드한 데이터 검증 켜기 / 끄기(기본) |
| `-ir` / `-noir` | 시작 시 CPU 레지스터 초기화 / 하지 않음 |
| `-LocalhostOnly <0/1>` | 1이면 localhost만 받음. **기본은 Windows 1, Linux/macOS 0** |
| `-jlinkscriptfile <f>` | J-Link script 파일 |
| `-timeout <ms>` | 타깃 연결 대기. GUI 5초, CL 0 |

두 가지는 특히 주의할 만합니다. `-if`를 주지 않으면 JTAG로 붙으려 하므로, SWD 전용 보드라면 `-if SWD`를 꼭 줘야 합니다. 그리고 Linux와 macOS에서는 기본적으로 *모든 주소*에서 접속을 받습니다. 1장 보안 절에서 본 문제와 같으므로 공유 네트워크에서는 `-LocalhostOnly 1`을 줍니다.

### -device 이름

`-device`에는 SEGGER [Supported Devices](https://www.segger.com/supported-devices/jlink/) 목록에 있는 이름을 씁니다. 이 이름이 flash 알고리즘과 RAM 영역을 정하며, RTT 문서는 control block 자동 검색에도 "정확한 장치 이름이 필요하고 코어 이름만으로는 부족하다"고 적습니다. CI에서는 `-strict`를 켜면 이름이 틀렸을 때 조용히 진행하지 않고 종료합니다.

## GDB 연결

SEGGER 문서에 실린 GDB 세션 예입니다(이 장에서 실행한 것이 아닙니다).

```text
(gdb) file C:/temp/Blinky.elf
Reading symbols from C:/temp/Blinky.elf...done.
(gdb) target remote localhost:2331
Remote debugging using localhost:2331
0x00000000 in ?? ()
(gdb) monitor reset
Resetting target
(gdb) load
Loading section .isr_vector, size 0x188 lma 0x8000000
Loading section .text, size 0x568 lma 0x8000188
Loading section .init_array, size 0x8 lma 0x80006f0
Loading section .fini_array, size 0x4 lma 0x80006f8
Loading section .data, size 0x428 lma 0x80006fc
Start address 0x8000485, load size 2852
Transfer rate: 146 KB/sec, 570 bytes/write.
(gdb) break main
Breakpoint 1 at 0x800037a: file Src\main.c, line 38.
```

`.data`의 lma가 flash 주소(0x80006fc)인 점에 주목합니다. 5장에서 다루는 LMA/VMA 구분 때문입니다.

`monitor`로 GDB Server 명령을 보냅니다. 문서의 monitor 명령 목록에는 `clrbp`, `cp15`, `Exec`, `flash breakpoints`, `flash erase`, `go`, `halt`, `jtagconf`, `memU8`/`memU16`/`memU32`, `reg`, `regs`, `reset`, `semihosting ...`, `setbp`, `sleep`, `step`, `SWO ...`, `waithalt`, `ReadAP`/`ReadDP`/`WriteAP`/`WriteDP` 등이 있습니다.

```text
(gdb) monitor reset
(gdb) monitor halt
(gdb) monitor go
(gdb) monitor regs
(gdb) monitor memU32 0x20000000
(gdb) monitor exec SetRTTAddr 0x20000000
```

`monitor exec`는 J-Link *command string*을 넘기는 통로입니다. 위 `SetRTTAddr`는 RTT 문서에 나오는 command string입니다. Commander의 명령 집합과 GDB Server의 monitor 명령은 서로 다른 목록이므로, Commander 명령이 monitor에서 그대로 된다고 가정하지 않습니다.

## 속도 비교를 위한 조건

프로브 간 속도를 비교하려면 같은 타깃·전원·케이블·인터페이스 속도·flash 영역·이미지·erase/verify 범위를 고정해야 합니다. 위 SEGGER 예의 `Transfer rate: 146 KB/sec`도 그 문서의 환경에서 나온 한 번의 값입니다. 이 장에는 재현할 측정 자료가 없어 순위를 매기지 않습니다.

## Unlimited Flash Breakpoints

SEGGER 페이지는 이 기능이 없으면 BP 개수가 CPU 디버그 유닛의 하드웨어 BP 수로 제한된다고 설명합니다(같은 페이지가 예로 든 수는 "ARM7/9에서 2, Cortex-M에서 4~6"입니다). Cortex-M4라면 2장에서 본 FPB 구성(6개 또는 2개)이 그 한계입니다.

### 동작 원리

SEGGER가 설명하는 동작은 다음과 같습니다.

- J-Link는 하드웨어 BP를 먼저 쓰고, 다 쓰면 flash BP로 넘어갑니다.
- flash BP를 걸거나 풀 때 J-Link 소프트웨어가 *flash sector를 다시 프로그래밍*합니다. 이 작업은 RAM에 올린 전용 코드 모듈이 합니다.
- sector 프로그래밍은 필요할 때만, 대개 타깃 실행을 시작하는 시점에 몰아서 합니다. 같은 sector의 여러 BP는 한 번에 처리하고, 프로그램 메모리 내용은 캐시합니다.
- source-level step 중에는 하드웨어 BP를 쓰고, 내장 명령어 시뮬레이터로 flash 작업 수를 더 줄입니다.
- FPB가 닿지 않는 외부 메모리(memory-mapped QSPI 등)에도 BP를 걸 수 있습니다. 페이지는 대부분의 Cortex-M3/M4에서 외부 메모리에는 하드웨어 BP를 걸 수 없다고 적습니다.

![J-Link Unlimited Flash Breakpoints 판단 흐름 — hardware breakpoint가 남아 있으면 그것을 쓰고, 모두 사용 중이면 flash sector를 다시 프로그래밍하는 flash breakpoint로 넘어간다](/images/blog/tools/diagrams/jlink-unlimited-fbp.svg)

그림은 SEGGER 설명에 나온 순서만 옮긴 것입니다.

GDB Server에서는 `monitor flash breakpoints = <value>`로 켜고 끕니다. 문서는 기본으로 켜져 있고 평가 용도로 쓸 수 있다고 적습니다.

### 라이선스

SEGGER 페이지 기준으로 이 기능은 *J-Link 한 대마다* 라이선스가 붙고, J-Link BASE보다 상위의 J-Link·J-Trace 모델에는 포함돼 있습니다. J-Link EDU Mini 페이지는 Unlimited Flash Breakpoints를 포함한 J-Link 관련 소프트웨어 라이선스가 무료로 들어 있다고 적지만, EDU Mini 자체는 비영리 교육 목적으로만 쓸 수 있습니다. 실제 장치에서 BP 전환이나 erase 횟수는 이 장에서 실행하지 않았습니다.

## RTT — 프로브가 메모리를 읽는 로그 채널

RTT의 채널과 버퍼 모드는 [6장](/blog/tools/debugging/embedded/chapter06-trace)에서 다룹니다. 여기서는 J-Link 쪽 동작만 봅니다.

- **control block 찾기.** RTT 문서는 기본이 자동 검색이며, J-Link가 먼저 *벡터 테이블 오프셋 0x20*에서 control block 주소를 찾고, 없으면 J-Link 소프트웨어가 아는 타깃 RAM 영역을 검색한다고 설명합니다. 많은 장치에서 RAM의 일부만 등록돼 있어, control block이 그 밖에 있으면 `SetRTTAddr`나 `SetRTTSearchRanges`로 직접 지정해야 합니다. 문서는 큰 RAM에서는 검색에 30초 넘게 걸릴 수 있다고도 적습니다.
- **Telnet 채널.** J-Link 연결이 살아 있는 동안 localhost:19021에 RTT Telnet 서버가 열립니다.
- **RTT Client의 제약.** J-Link RTT Client는 스스로 디버그 연결을 열지 않습니다. 문서는 RTT가 동작하려면 활성 디버그 연결이 필요하므로 J-Link Commander나 GDB Server처럼 연결을 여는 도구와 함께 써야 한다고 적고, Client는 up/down 채널 0만 지원한다고 밝힙니다.

호스트 쪽 도구는 GUI인 J-Link RTT Viewer와 명령줄의 J-Link RTT Client가 있고, 둘 다 위의 활성 연결이 필요합니다.

펌웨어 쪽은 `SEGGER_RTT.c`/`SEGGER_RTT.h`를 넣고 `SEGGER_RTT_printf()`나 `SEGGER_RTT_Write()`를 부릅니다.

```c
#include "SEGGER_RTT.h"
SEGGER_RTT_printf(0, "tick=%u\n", HAL_GetTick());
SEGGER_RTT_Write(1, sensor_data, 256);   // 채널 1에 raw 데이터
```

### RTT와 UART printf

RTT 문서는 `SEGGER_RTT_MODE_BLOCK_IF_FIFO_FULL`을 제외한 모든 모드에서, 타깃이 호스트가 가져가는 속도보다 빨리 쓰면 RTT 데이터가 사라질 수 있다고 경고합니다. 반대로 `BLOCK_IF_FIFO_FULL`이면 호스트가 읽지 않을 때 타깃이 기다립니다. ISR에서 쓸지는 이 모드 선택과 버퍼 잠금 구현을 같이 보고 정해야 합니다.

## J-Run — 자동 테스트 실행

J-Run(실행 파일 `JRun`)은 ELF를 타깃에 올려 실행하고 출력을 받아 오는 명령줄 도구입니다. 문서의 사용법은 `JRun [options] elf-file`입니다.

| 옵션 | 기본값 | 의미 |
|------|--------|------|
| `--device <str>` | STM32F407IE | 장치 이름 |
| `--if SWD/JTAG` | SWD | 인터페이스 |
| `--speed <khz>` | 4000 | 속도 |
| `--rtt` / `--nortt` | Auto | RTT 강제 켜기 / 끄기 |
| `--semihost` / `--nosemihost` | Auto | semihosting 강제 켜기 / 끄기 |

문서는 테스트 앱이 *semihosting exit 호출*을 하거나 와일드카드 종료 문자열(기본 `*STOP*`)을 출력하면 J-Run 테스트가 끝난다고 설명합니다. 타깃 출력은 터미널로 나오므로 파일로 돌려 CI에서 검사할 수 있습니다.

```bash
JRun --device STM32F407VG --if SWD firmware.elf > boot.log
grep "BOOT OK" boot.log && echo PASS || echo FAIL
```

## J-Trace — 명령 trace

J-Trace는 ETM 병렬 trace port를 받는 SEGGER 프로브입니다. trace 설정은 대상 MCU의 trace port와 Ozone 같은 호환 도구에서 합니다. 이 장에서는 J-Trace를 다루지 않았고, ITM/SWO와 ETM 병렬 trace의 차이는 2장과 6장에 정리했습니다.

## Ozone — GUI 디버거

Ozone은 SEGGER의 GUI 디버거입니다. Ozone 페이지는 상업적 사용에 SEGGER Commercial-use License가 필요하고 라이선스는 영구라고 적습니다. 그리고 *J-Link PLUS, J-Link Ultra, J-Link Pro, J-Trace PRO*에는 Ozone 무료 라이선스가 포함되며, 다른 프로브로 상업적으로 쓰려면 따로 라이선스를 사야 한다고 설명합니다. 모든 J-Link 사용자에게 무료인 것은 아닙니다.

## Adaptive Clocking

RTCK를 제공하는 JTAG 타깃에서는 반환 클럭에 맞추는 adaptive clocking을 쓸 수 있습니다. GDB Server의 `-speed`가 `adaptive` 값을 받는 이유가 이것입니다. 문서는 고정 속도나, 타깃이 지원하면 adaptive 속도를 쓰라고 권합니다. 이 기능은 SWD 신호 잡음을 감지해 속도를 낮추는 기능이 아닙니다. OpenOCD도 하드웨어 조합이 지원하면 RTCK 기반 adaptive clocking을 씁니다([OpenOCD FAQ](https://openocd.org/doc/html/FAQ.html)).

## 보안 — 잠긴 칩

칩의 읽기 보호를 푸는 방법은 칩마다 다릅니다. 3장에서 본 OpenOCD의 `nrf52_recover`처럼 벤더별 접근 포트를 써야 하는 경우도 있습니다. J-Link 쪽 unlock 절차는 SEGGER가 장치별로 따로 안내하므로, 이 장에서는 명령을 적지 않았습니다. 잠금 해제는 대개 flash 전체 지우기를 동반하니 칩 레퍼런스 매뉴얼을 먼저 확인합니다.

## CI에서 BIN과 ELF 검증을 구분

Commander의 `VerifyBin`은 *raw binary* 파일을 지정 주소의 타깃 메모리와 비교합니다(문서 설명: "Verify if specified bin file is at the specified target memory location"). ELF를 binary로 착각해 넘기면 ELF 헤더와 주소 정보까지 flash 바이트와 비교하게 됩니다. 아래는 BIN 입력만 받는 오프라인 계획 생성기입니다. 실제 Commander는 실행하지 않습니다.

```js title="jlink-plan-check.mjs"
import assert from 'node:assert/strict';
function plan(name, bytes) {
    if(!/^[A-Za-z0-9_-]+\.bin$/.test(name)) throw Error('raw .bin file required');
    if(bytes.length<4 || bytes.subarray(0,4).equals(Buffer.from([127,69,76,70])))
        throw Error('ELF or empty input is not a raw flash image');
    return ['ExitOnError 1','device STM32F407VG','si SWD','speed 4000',
        'connect','r','h','loadfile '+name+' 0x08000000',
        'verifybin '+name+' 0x08000000','r','g','exit'];
}
const commands=plan('firmware.bin',Buffer.from([0,0,2,32,1,1,0,8]));
assert(commands.includes('verifybin firmware.bin 0x08000000'));
assert.throws(()=>plan('firmware.elf',Buffer.alloc(8)));
assert.throws(()=>plan('firmware.bin',Buffer.from([127,69,76,70])));
assert.throws(()=>plan('firmware.bin',Buffer.alloc(0)));
console.log(commands.join('\n'));
```

Node 24.21.0에서 실행하면 `ExitOnError 1`부터 `exit`까지 12줄의 명령 파일이 출력되고, ELF 이름·ELF magic·빈 입력은 모두 예외로 거부됩니다. 이 검사만으로 BIN의 base 주소·벡터·장치 적합성을 보증하지는 않습니다. RTT/UART 수집기는 reset/run 전에 준비하고, byte 검증 성공과 부트 테스트 성공은 별도 상태로 기록합니다.

## OpenOCD와 J-Link 선택

OpenOCD는 driver와 Tcl 설정을 소스로 추적할 수 있고, J-Link는 SEGGER의 장치 데이터베이스와 도구 묶음을 씁니다. 선택은 지원 장치, 필요한 기능(flash BP, trace, RTT), 라이선스 조건, 팀이 유지할 수 있는 설정 방식으로 합니다. 속도와 안정성은 같은 조건에서 직접 비교해야 하며, 이 장은 그 측정을 하지 않았습니다.

## 정리

- J-Link GDB Server의 기본 포트는 GDB 2331, SWO 2332, Telnet 2333, RTT Telnet 19021입니다.
- `-if`의 기본값은 JTAG이고, Linux/macOS의 기본은 모든 주소에서 접속을 받는 것입니다.
- `-strict`는 장치 이름이 틀리면 종료하므로 CI에 맞습니다.
- Commander는 `ExitOnError`, `LoadFile`, `VerifyBin`, `Exit`로 batch 굽기를 할 수 있고, `VerifyBin`은 raw binary 전용입니다.
- Unlimited Flash Breakpoints는 하드웨어 BP를 먼저 쓰고, 모자라면 flash sector를 다시 써서 BP를 겁니다.
- RTT Client는 스스로 연결하지 않으며, control block 자동 검색은 정확한 장치 이름에 의존합니다.
- J-Run은 semihosting exit나 `*STOP*` 문자열로 테스트를 끝냅니다.
- Ozone 무료 라이선스는 PLUS·Ultra·Pro·J-Trace PRO에만 포함됩니다.

## 다음 장 예고

Ch 5 — 베어메탈 ELF / MAP. 굽는 단위인 ELF의 LMA/VMA, 링커 스크립트, MAP 파일로 메모리 진단.

## 관련 항목

- [Ch 3: OpenOCD 깊이](/blog/tools/debugging/embedded/chapter03-openocd)
- [Ch 5: ELF / MAP — 베어메탈 메모리](/blog/tools/debugging/embedded/chapter05-elf-map)
- [SEGGER Knowledge Base](https://kb.segger.com/)
- [SEGGER Supported Devices](https://www.segger.com/supported-devices/jlink/)
- [Ozone](https://www.segger.com/products/development-tools/ozone-j-link-debugger/)
