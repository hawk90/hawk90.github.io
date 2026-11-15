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

J-Link는 SEGGER의 디버그 프로브와 소프트웨어 도구 체인입니다. 지원 칩·프로브 모델·firmware와 host 도구 조합을 확인해야 하며 신호 무결성·전원·reset 문제를 프로브 교체만으로 해결한다고 보장하지 않습니다.

이 장은 Segger의 도구 체인 전체를 다룹니다. J-Link GDB Server, JLinkExe(commander), J-Run, J-Trace, Ozone GUI, Unlimited Flash Breakpoints, RTT가 그 대상입니다.

:::tldr
SEGGER의 프로브·서버·Commander·RTT·GUI 도구를 용도별로 구분합니다. EDU 제한과 기능별 라이선스는 해당 제품의 현재 조건을 확인합니다.
:::

## 프로브와 기능 선택

모델마다 지원 인터페이스·최대 속도·trace 캡처·Ethernet·포함 기능이 다릅니다. [J-Link 제품 목록](https://www.segger.com/products/debug-probes/j-link/)과 [EDU Mini 조건](https://www.segger.com/products/debug-probes/j-link/models/j-link-edu-mini/)에서 정확한 모델을 확인합니다. 이 글은 가격이나 모든 모델의 속도 순위를 측정·비교하지 않습니다.

## 설치

```bash
# Linux
$ wget https://www.segger.com/downloads/jlink/JLink_Linux_V794_x86_64.deb
$ sudo dpkg -i JLink_Linux_V794_x86_64.deb

# macOS
$ brew install --cask segger-jlink

# 검증
$ JLinkExe -CommandFile <(echo exit)
SEGGER J-Link Commander V7.94 (Compiled May 17 2024 15:53:46)
DLL version V7.94, compiled May 17 2024 15:52:55

Connecting to J-Link via USB...O.K.
Firmware: J-Link EDU Mini V1 compiled Jul 26 2023 13:29:34
Hardware version: V1.00
S/N: 80...
```

`JLinkExe`가 *J-Link Commander* — TCL이 아닌 자체 셸. OpenOCD의 telnet 4444와 비슷한 역할.

## J-Link Commander

```text
J-Link> ?           # 명령 도움말
J-Link> device STM32F407VG
J-Link> si SWD      # SWD 모드
J-Link> speed 4000  # kHz
J-Link> connect
J-Link> r           # reset + halt
J-Link> h           # halt
J-Link> g           # go (resume)
J-Link> mem32 0x20000000 16  # 32비트 워드16개
J-Link> w4 0x20000100 0xdead # 4바이트 쓰기
J-Link> regs        # 모든 레지스터
J-Link> reg pc      # PC만
J-Link> loadfile firmware.bin 0x08000000
J-Link> verifybin firmware.bin 0x08000000
J-Link> erase
J-Link> savebin /tmp/dump.bin 0x08000000 0x1000

```

`JLinkExe -device STM32F407VG -if SWD -speed 4000 -autoconnect 1 -CommandFile script.jlink`으로 배치.

```text
$ cat script.jlink
r
loadfile firmware.bin 0x08000000
verifybin firmware.bin 0x08000000
g
qc          # quit + close
```

CI 굽기 자동화의 한 줄.

## J-Link GDB Server

GDB 연결용 데몬.

```bash
$ JLinkGDBServer -device STM32F407VG -if SWD -speed 4000 -port 2331
SEGGER J-Link GDB Server V7.94
Listening on TCP/IP port 2331
Connected to target
Waiting for GDB connection...
```

자주 쓰는 옵션.

| 옵션 | 의미 |
|------|------|
| `-device <name>` | 칩 종류 (Segger 데이터베이스의 정확한 이름) |
| `-if SWD` 또는 `JTAG` | 인터페이스 |
| `-speed <kHz>` | SWCLK 속도 |
| `-port <n>` | GDB RSP 포트 (기본 2331) |
| `-swoport <n>` | SWO trace 포트 (기본 2332) |
| `-telnetport <n>` | telnet 포트 (기본 2333) |
| `-rtos <plugin>` | RTOS-aware (예: `GDBServer/RTOSPlugin_FreeRTOS`) |
| `-singlerun` | 한 세션만, GDB detach 시 종료 |
| `-strict` | API 엄격 (CI에 유용) |
| `-vd` | 메모리 변경 시 자동 verify |
| `-noir` | terminal interaction 없음 (CI) |
| `-localhostonly 1` | 보안 (외부 차단) |
| `-jlinkscriptfile <f>` | JLinkScript로 reset/init 커스터마이즈 |

### -device 이름

Segger의 *Supported Device 데이터베이스*에 등록된 정확한 부품 번호. 잘못 적으면.

- *connect는 됨* (DAP·CPU는 표준이라 자동 검출).
- *load는 됨* (메모리 쓰기는 일반).
- *flash는 안 됨* (칩별 알고리즘이 잘못된 것을 골라 erase가 실패하거나 잘못된 sector를 건드림).

이 차이가 디버깅을 매우 어렵게 만듭니다 — connect만 보고 *맞다*고 착각.

```bash
# 데이터베이스 검색
$ JLinkExe -CommandFile <(echo "ShowSupportedDevices STM32F4") | head -20

# 일반적인 이름들
STM32F407VG, STM32F407VE, STM32F407IG, ...
```

[Segger Supported Devices](https://www.segger.com/supported-devices/jlink/)에서 검색.

## GDB 연결

```bash
$ arm-none-eabi-gdb firmware.elf
(gdb) target remote :2331
0x080001b8 in Reset_Handler () at startup_stm32f407xx.s:62
(gdb) monitor reset halt
(gdb) load
Loading section .isr_vector, size 0x1c0 lma 0x8000000
Loading section .text, size 0x9d20 lma 0x80001c0
Loading section .rodata, size 0x4c0 lma 0x8009ee0
Loading section .data, size 0x140 lma 0x800a3a0
Start address 0x080001b8, load size 42208
Transfer rate: ...   ← 설명용 출력; 이 환경의 실측값 아님
(gdb) monitor reset halt
(gdb) break main
(gdb) continue
```

`monitor`로 J-Link 명령을 직접 보낼 수 있습니다.

```text
(gdb) monitor reset       # 그냥 reset
(gdb) monitor halt
(gdb) monitor go
(gdb) monitor regs
(gdb) monitor mem 0x20000000 64
(gdb) monitor flash device = STM32F407VG
(gdb) monitor SetMemAccessHWBP 0x20000000 0x1000
(gdb) monitor exec SetRTTAddr 0x20000000
```

GDB Server의 monitor 명령과 Commander의 명령 집합은 같지 않습니다. `monitor exec`는 지원하는 J-Link command string을 전달하는 경로이며 Commander의 모든 명령을 그대로 실행하는 것으로 가정하지 않습니다. 설치한 GDB Server의 monitor 도움말을 기준으로 확인합니다.

## 속도 비교를 위한 조건

프로브 간 속도를 비교하려면 동일한 타깃·전원·케이블·SWD/JTAG 속도·flash 영역·이미지·erase/verify 범위를 고정해야 합니다. USB 전송 묶음, target flash algorithm, work area, 실제 flash 대기 시간이 결과를 바꿉니다. 여기서는 재현할 측정 자료가 없어 초 단위 순위나 안정성 우열을 제시하지 않습니다.

## Unlimited Flash Breakpoints

J-Link만의 상용 기능. FPB의 HW BP 개수(6개) 제한을 *flash patching*으로 무한 흉내.

### 동작 원리

SEGGER는 hardware breakpoint를 우선 사용하고 자원이 부족하면 지원하는 flash 영역에 software breakpoint를 적용한다고 설명합니다. 이를 FP_REMAP으로 flash page를 SRAM에 alias하는 방식이라고 일반화하지 않습니다. flash 패치와 복원은 flash 재프로그래밍을 포함할 수 있으며 지원 장치·영역과 라이선스를 확인합니다.

[Unlimited Flash Breakpoints 공식 문서](https://www.segger.com/products/debug-probes/j-link/technology/flash-breakpoints/)를 기준으로 했습니다. 실제 장치의 BP 전환·erase 횟수·성능은 이 환경에서 실행하지 않았습니다.

## RTT — Segger의 진짜 강점

[Ch6 trace 장](/blog/tools/debugging/embedded/chapter06-trace)에서 채널·버퍼 모드·블로킹 조건을 구분합니다. throughput은 buffer·프로브·타깃 메모리·host polling 조건에 달립니다.

RTT Client는 RTT를 제공하는 J-Link 연결 프로세스가 실행 중이어야 합니다. Commander를 종료한 뒤 Client만 시작해 메모리 폴링이 계속된다고 가정하지 않습니다.



별도 *RTT Viewer* GUI.

```bash
$ JLinkRTTViewer    # GUI
$ JLinkRTTClient    # CLI
```

펌웨어 측은 `SEGGER_RTT.c`/`SEGGER_RTT.h`를 포함. 100 KB 미만.

```c
#include "SEGGER_RTT.h"
SEGGER_RTT_printf(0, "tick=%u\n", HAL_GetTick());
SEGGER_RTT_Write(1, sensor_data, 256);   // 채널 1에 raw 데이터
```

채널 0를 텍스트, 1을 binary 센서 데이터로 분리하는 패턴이 일반적.

### RTT vs 기존 printf

UART도 queue·DMA 방식으로 비동기화할 수 있습니다. RTT는 NO_BLOCK_SKIP/TRIM이면 버퍼 부족 시 데이터를 버리거나 줄이고, BLOCK_IF_FIFO_FULL이면 호스트가 읽지 않을 때 대기할 수 있습니다. ISR 사용 여부는 buffer locking·중첩 interrupt·포트별 임계구역 구현까지 확인해야 합니다.

ISR latency가 중요하면 로그를 줄이거나 버리는 정책과 임계구역 최대 시간을 먼저 확인합니다.

## J-Run — 자동 펌웨어 실행

```bash
$ JRunExe -device STM32F407VG -if SWD -rtt firmware.elf
[Load + reset + run + RTT 자동 캡처]
```

펌웨어를 *한 줄로* 굽고 실행하면서 RTT를 캡처. CI에서 *부트 로그 검증*에 매우 유용.

```bash
$ JRunExe -device STM32F407VG -if SWD -rtt firmware.elf > /tmp/boot.log
$ grep "BOOT OK" /tmp/boot.log && echo PASS || echo FAIL
```

## J-Trace — ETM 명령 trace

J-Trace PRO는 ETM trace 핀을 받습니다. *CPU의 모든 명령 실행*을 기록.

J-Trace의 실제 trace 설정은 대상 MCU의 trace port·프로브와 호환되는 Ozone/IDE 설정을 사용합니다. 확인하지 않은 `JTraceExe -tracesink SWO` 명령을 ETM 캡처 절차로 제시하지 않습니다. ITM/SWO와 ETM 병렬 trace를 구분합니다.



쓰임:

- 인터럽트 latency 측정 — 인터럽트 발생 시각과 ISR 첫 명령 사이의 정확한 시간.
- Code coverage — 어떤 함수가 *실제로* 실행됐는지.
- 비결정적 버그의 *완전 재구성*.

큰 칩(Cortex-M7+ 옵션 ETM 탑재)이어야 하고 J-Trace 하드웨어 자체가 매우 비쌉니다.

## Ozone — GUI

Segger의 풀 GUI 디버거. VSCode + Cortex-Debug의 대안.

```bash
$ Ozone firmware.elf
```

특징:

- *Live Variable Watch* — CPU 정지 없이 백그라운드로 변수 갱신 (SWD 백그라운드 폴링).
- 메모리 hex 뷰.
- ETM trace 디스플레이.
- *Code Profile* — ETM 기반 함수별 시간 분포.

상용이지만 J-Link 사용자는 무료. 풀스택을 한 GUI에서 다루고 싶을 때.

## J-Link Configurator

여러 J-Link 프로브를 한 PC에 꽂으면 *어느 게 어느 거*인지 헷갈립니다. 시리얼 번호로 구분.

```bash
$ JLinkExe -SelectEmuBySN 80123456
```

CI에서 *보드별로 다른 프로브*에 동시 접근할 때 필수.

## Adaptive Clocking

RTCK를 제공하는 JTAG 타깃에서는 반환 clock에 맞추는 adaptive clocking을 사용할 수 있습니다. 이것은 신호 잡음을 감지해 SWCLK를 자동으로 낮추는 SWD 기능이 아닙니다. [SEGGER UM08001](https://kb.segger.com/UM08001)의 JTAG/SWD speed 설명과 [OpenOCD FAQ](https://openocd.org/doc/html/FAQ.html)를 참고합니다. OpenOCD도 hardware 조합이 지원하면 RTCK 기반 adaptive JTAG clocking을 사용할 수 있습니다.

## 보안 — Lock 해제

```text
J-Link> unlock         # nRF52 등의 APPROTECT 해제
J-Link> exec EnableEraseAllFlashBanks
J-Link> erase
```

칩별로 명령이 다릅니다. STM32는 OpenOCD와 비슷한 방식 (`option_write`).

## CI에서 BIN과 ELF 검증을 구분

Commander의 verifybin은 raw binary 비교입니다. ELF 파일을 binary로 오해해 0x08000000의 flash 바이트와 비교하면 ELF header·주소 정보까지 비교하게 됩니다. 아래는 BIN 입력만 받는 오프라인 계획 생성기입니다. 실제 Commander 실행은 하지 않습니다.

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

Node24.21.0에서 정상BIN·ELF명·ELFmagic·빈입력을 확인했습니다. 이 검사만으로 BIN의 base주소·벡터·기기 적합성을 보증하지 않습니다. [Commander verifybin·ExitOnError](https://kb.segger.com/J-Link_Commander)를 기준으로 했으며 J-Link·프로브·보드가 없어 실제 erase/write/verify는 미검증입니다. RTT/UART 수집기는 reset/run 전에 준비하고 byte 검증 성공과 부트 테스트 성공을 별도 상태로 기록합니다.

## License 모델

EDU/EDU Mini는 벤더가 정한 교육·비상업 용도 제한을 확인해야 합니다. 상용 모델도 Ozone·Unlimited Flash Breakpoints 등 기능별 포함 조건이 다를 수 있습니다. 라이선스가 개발자1인 기준이라는 단정이나 프로브 serial number 때문에 바이너리 배포 속성이 자동으로 바뀐다는 설명 대신, 사용 제품의 라이선스 문서를 확인합니다.

## OpenOCD와 J-Link 선택

OpenOCD는 공개된 driver·Tcl 설정을 추적할 수 있고 J-Link는 SEGGER의 도구·지원 device database를 사용합니다. 지원 기능·접근 방식·유지보수 요구를 기준으로 선택하고 속도·안정성은 동일 조건에서 직접 비교합니다. Live memory 접근이나 trace의 존재 여부를 제품군 전체에 대해 단정하지 않습니다.

## 정리

- J-Link = Segger의 상용 디버그 프로브 + 도구 일체.
- J-Link Commander가 *직접 셸*, JLinkGDBServer가 *GDB 데몬*.
- `-device` 이름이 정확해야 flash 굽기가 정상.
- Unlimited Flash BP가 *flash patching*으로 BP 무한 흉내.
- RTT는 buffer 모드와 수명·동시성 조건을 확인하는 메모리 trace 채널.
- J-Run으로 한 줄 굽기 + 실행 + RTT 캡처.
- Ozone은 GUI·변수 관찰·trace 분석 기능을 제공하며 해당 제품의 포함 조건을 확인합니다.
- EDU / EDU Mini의 사용 제한과 상용 도구 기능별 라이선스는 구매 모델의 현재 약관으로 확인합니다.

## 다음 장 예고

Ch 5 — 베어메탈 ELF / MAP. 굽는 단위인 ELF의 LMA/VMA, 링커 스크립트, MAP 파일로 메모리 진단.

## 관련 항목

- [Ch 3: OpenOCD 깊이](/blog/tools/debugging/embedded/chapter03-openocd)
- [Ch 5: ELF / MAP — 베어메탈 메모리](/blog/tools/debugging/embedded/chapter05-elf-map)
- [Segger J-Link Wiki](https://wiki.segger.com/Main_Page)
- [Segger Supported Devices](https://www.segger.com/supported-devices/jlink/)
- [Ozone 사용자 가이드](https://www.segger.com/products/development-tools/ozone-j-link-debugger/)
