---
title: "Ch 4: J-Link 도구 체인"
date: 2026-05-17T04:00:00
description: "JLinkGDBServer, JLinkExe, J-Run, J-Trace, Unlimited Flash BP, RTT, Ozone."
tags: [jlink, segger, embedded, rtt]
series: "Embedded Debugging"
seriesOrder: 4
draft: false
---

J-Link는 *상용 표준*입니다. OpenOCD가 오픈·범용이라면 J-Link는 *속도·안정성·완성도*가 압도적. 특히 신호 무결성 안 좋은 보드, 큰 펌웨어, 시간 sensitive한 디버깅에서 OpenOCD가 자꾸 끊긴다면 J-Link로 전환하면 거의 모든 문제가 사라집니다.

이 장은 Segger의 도구 체인 전체 — J-Link GDB Server, JLinkExe(commander), J-Run, J-Trace, Ozone GUI, Unlimited Flash Breakpoints, RTT — 를 다룹니다.

:::tldr
Segger의 디버그 프로브 + 데몬 + GUI 일체. *비상업·교육용 무료*이지만 상업 라이선스 별도.
:::

## 하드웨어 라인업

| 모델 | SWD/JTAG | 속도 | 대상 |
|------|----------|------|------|
| J-Link EDU mini | SWD | 3 MHz | 학습·취미 (~$20) |
| J-Link EDU | SWD/JTAG | 15 MHz | 학습·취미 |
| J-Link BASE | SWD/JTAG | 15 MHz | 상업용 시작 |
| J-Link PLUS | SWD/JTAG | 50 MHz | 빠른 다운로드 |
| J-Link PRO | SWD/JTAG + Eth | 50 MHz | 네트워크 |
| J-Trace PRO | SWD/JTAG + ETM | ETM trace |
| Flasher | 자동 양산 굽기 |

EDU 모델은 *비상업·교육·취미용*. 상업적 사용은 BASE 이상 필요. EDU mini가 *원가 가까운 가격*이라 입문에 추천.

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
J-Link> mem 0x20000000 16    # 16 워드 dump
J-Link> w4 0x20000100 0xdead # 4바이트 쓰기
J-Link> regs        # 모든 레지스터
J-Link> reg pc      # PC만
J-Link> loadfile firmware.bin 0x08000000
J-Link> verifybin firmware.bin 0x08000000
J-Link> erase
J-Link> savebin /tmp/dump.bin 0x08000000 0x1000
J-Link> rtt setup    # RTT 시작
J-Link> rtt read 0   # 채널 0 읽기
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
Start address 0x080001b8, load size 41960
Transfer rate: 90 KB/sec, 4195 bytes/write.    ← 4 MHz SWD 기준
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

`exec` 접두사는 *J-Link Commander 명령을 그대로* 실행. 도구 체인 전체를 GDB 안에서.

## 속도 비교 — OpenOCD vs J-Link

대표적 차이.

| | OpenOCD + CMSIS-DAP | J-Link PLUS |
|---|----------------------|--------------|
| 64KB flash 굽기 | ~6초 | ~1.5초 |
| 메모리 read 1MB | ~10초 | ~3초 |
| BP 설치/제거 | ~5ms | ~1ms |
| 안정성 (signal noise) | 보통 | 매우 좋음 |

J-Link의 우위 원인.

1. *USB → SWD 변환 펌웨어*가 효율적 — 한 USB 트랜잭션에 여러 SWD 패킷 묶음.
2. *Adaptive Clocking* — 신호 무결성에 따라 SWCLK 자동 조정.
3. *Memory transfer optimization* — DAP의 *block transfer* 적극 활용.

대형 펌웨어 또는 자주 굽는 환경에서 *시간이 곧 돈*. J-Link 가격이 충분히 회수됩니다.

## Unlimited Flash Breakpoints

J-Link만의 상용 기능. FPB의 HW BP 개수(6개) 제한을 *flash patching*으로 무한 흉내.

### 동작 원리

![Unlimited Flash BP 메커니즘](/images/blog/tools/diagrams/jlink-unlimited-fbp.svg)

1. BP 7번째 설정 → J-Link 펌웨어가 *flash 페이지 전체*를 SRAM 임시 영역에 복사.
2. SRAM 사본에서 해당 위치를 `BKPT` 명령으로 패치.
3. CPU의 메모리 매핑 (또는 *aliasing*)을 활용해 *그 페이지만* SRAM 사본을 보도록.
4. CPU가 fetch → 패치된 BKPT → halt.
5. Resume 시 원래 flash로 복원.

마법처럼 보이지만 *FPB의 flash patch* 메커니즘을 잘 활용한 것. 일부 칩(Cortex-M의 FP_REMAP 지원)에만 동작.

큰 펌웨어에서 *모든 함수에 BP 걸기* 같은 작업이 가능해집니다. 매우 비싸지만 BP 부족이 일상인 환경에서 가치 있음.

```text
# 활성화
J-Link> SetUnlimitedBP 1
```

GDB에서는 자동.

## RTT — Segger의 진짜 강점

[Ch 6 trace 장]에서 자세히 다루지만 J-Link의 RTT는 *가장 빠르고 안정적*. 100 KB/s 이상의 throughput.

```text
# JLinkExe에서
J-Link> rtt setup
J-Link> rtt start
J-Link> rtt read 0           # 채널 0 일회 읽기
```

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

기존 UART printf는 *블로킹* — UART FIFO 빌 때까지 대기. 1초에 수십~수백 라인이 한계. RTT는 *non-blocking* — 링 버퍼에 워드만 쓰고 즉시 반환. ISR 안에서도 안전. 디버거 측이 백그라운드로 폴링해 가져갑니다.

ISR latency가 중요한 RT 시스템에서는 RTT가 사실상 필수.

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

```bash
$ JTraceExe -device STM32F767ZI -if SWD -tracesink SWO
```

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

신호 무결성이 안 좋을 때 J-Link가 *자동으로* SWCLK를 낮춥니다.

```text
J-Link> speed adaptive     # CPU가 보내는 RTCK 신호를 따라
```

OpenOCD에 없는 기능. 케이블이 길거나 잡음이 많은 환경에서 효과적.

## 보안 — Lock 해제

```text
J-Link> unlock         # nRF52 등의 APPROTECT 해제
J-Link> exec EnableEraseAllFlashBanks
J-Link> erase
```

칩별로 명령이 다릅니다. STM32는 OpenOCD와 비슷한 방식 (`option_write`).

## CI 패턴

```bash
#!/usr/bin/env bash
# fw-test.sh

set -e
DEVICE=STM32F407VG
ELF=$1

# 1. 굽기 + reset
cat > /tmp/flash.jlink <<EOF
device $DEVICE
si SWD
speed 4000
connect
r
loadfile $ELF
verifybin $ELF 0x08000000
g
qc
EOF
JLinkExe -CommandFile /tmp/flash.jlink

# 2. RTT 캡처 30초
timeout 30 JLinkRTTClient > /tmp/rtt.log &
sleep 31

# 3. 검증
if grep -q "TEST PASS" /tmp/rtt.log; then
    echo "PASS"
    exit 0
else
    echo "FAIL"
    cat /tmp/rtt.log
    exit 1
fi
```

J-Link Commander가 *non-interactive*로 동작하므로 CI에 자연스럽게 끼워집니다.

## License 모델

| 라이선스 | 가능 |
|---------|------|
| EDU (Educational) | 학생·취미·교육. *상업적 제품 개발 불가*. |
| BASE / PLUS / PRO | 상업적 사용 (개발자 1인). 회사 단위는 별도. |
| 양산 (Flasher) | 공장 자동 굽기. 별도 라이선스. |

EDU mini의 *시리얼 번호*가 EDU로 표시되므로, 그 프로브로 굽힌 펌웨어는 *상업적 배포 불가*. 회사에서 정식 BASE를 사야 합니다.

## OpenOCD vs J-Link 비교 정리

| | OpenOCD | J-Link |
|---|---------|--------|
| 가격 | 0 (프로브만) | $50~$1000+ |
| 라이선스 | GPL | 상용 |
| 칩 지원 폭 | 매우 넓음 | 매우 넓음 (Segger DB) |
| 신호 안정성 | 보통 | 매우 좋음 |
| 굽기 속도 | 보통 | 빠름 |
| RTT | 지원 (느림) | 빠름 |
| GUI | 별도 (VSCode 등) | Ozone 무료 |
| Unlimited Flash BP | 없음 | 있음 |
| ETM trace | 별도 J-Trace 펌웨어 | J-Trace 모델 |
| Live Variable | 없음 | 있음 (Ozone) |
| 디버그 가능성 (자체) | TCL · 소스 공개 | 블랙박스 펌웨어 |
| 자동화 | TCL | 자체 셸 + JLinkScript |

*시작은 OpenOCD, 본격 작업은 J-Link*가 일반적인 발전 경로. 첫 보드 bring-up에서는 OpenOCD가 *소스 추적이 가능*해 유리, 일상은 J-Link가 빠릅니다.

## 정리

- J-Link = Segger의 상용 디버그 프로브 + 도구 일체.
- J-Link Commander가 *직접 셸*, JLinkGDBServer가 *GDB 데몬*.
- `-device` 이름이 정확해야 flash 굽기가 정상.
- Unlimited Flash BP가 *flash patching*으로 BP 무한 흉내.
- RTT가 *최고 속도·안정성*의 trace 채널.
- J-Run으로 한 줄 굽기 + 실행 + RTT 캡처.
- Ozone이 풀 GUI, *Live Variable* 등 OpenOCD에 없는 기능.
- EDU 모델은 교육·취미 한정 — 상업적 제품에는 BASE 이상.

## 다음 장 예고

Ch 5 — 베어메탈 ELF / MAP. 굽는 단위인 ELF의 LMA/VMA, 링커 스크립트, MAP 파일로 메모리 진단.

## 관련 항목

- [Ch 3: OpenOCD 깊이](/blog/tools/debugging/embedded/chapter03-openocd)
- [Ch 5: ELF / MAP — 베어메탈 메모리](/blog/tools/debugging/embedded/chapter05-elf-map)
- [Segger J-Link Wiki](https://wiki.segger.com/Main_Page)
- [Segger Supported Devices](https://www.segger.com/supported-devices/jlink/)
- [Ozone 사용자 가이드](https://www.segger.com/products/development-tools/ozone-j-link-debugger/)
