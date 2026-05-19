---
title: "1-06: JTAG·SWD 안 붙을 때 — 핀·전압·속도·세션"
date: 2026-05-07T23:00:00
description: "JTAG·SWD 디버깅 체크리스트. Pin·voltage·clock·daisy chain·security 잠금."
series: "Modern Embedded Recipes"
seriesOrder: 6
tags: [recipes, jtag, swd, openocd, debug, brick]
draft: true
---

## 한 줄 요약

> **"JTAG 안 붙음 = 전기·핀 → 속도 → 보안잠금"** — 위에서부터.

## JTAG vs SWD

| 항목 | JTAG | SWD |
|---|---|---|
| 핀 | 4-5 (TCK·TMS·TDI·TDO·TRST?) | 2 (SWCLK·SWDIO) |
| 속도 | 수십 MHz | 수십 MHz |
| Daisy chain | O (여러 device) | X (single) |
| Cortex-M | 일부 | 표준 |
| Cortex-A | 표준 | 가능 (cJTAG 변종) |
| ARM debug protocol | Both supports |  |

Cortex-M3+ — *SWJ-DP* (선택 가능). 보통 SWD가 핀 수 적어 선호.

## Step 1: 핀 연결

### 20-pin JTAG (ARM Cortex 표준)

```text
   ┌──────────────────────────────┐
   │ 1  VTref       2  N/C          │
   │ 3  nTRST       4  GND          │
   │ 5  TDI         6  GND          │
   │ 7  TMS         8  GND          │
   │ 9  TCK        10  GND          │
   │ 11 RTCK       12  GND          │
   │ 13 TDO        14  GND          │
   │ 15 nRESET     16  GND          │
   │ 17 N/C        18  GND          │
   │ 19 N/C        20  GND          │
   └──────────────────────────────┘
```

VTref = *target voltage* — debugger가 *level translate*에 사용.

### 10-pin Cortex (SWD/JTAG 양용)

```text
   ┌──────────────┐
   │ 1 VTref  2 SWDIO/TMS │
   │ 3 GND    4 SWCLK/TCK │
   │ 5 GND    6 SWO/TDO   │
   │ 7 KEY    8 N/C       │
   │ 9 GND    10 nRESET   │
   └──────────────┘
```

ST-Link·J-Link 표준 커넥터.

## Step 2: 전압 매칭

```text
3.3V 보드 + 5V J-Link → fry 위험
1.8V 보드 (modern SoC) + 3.3V debugger → 신호 불안정 또는 손상
```

**VTref pin이 *target에서 debugger로*** 정보 제공 — debugger가 자동 level shift.

VTref 안 연결 시 *debug interface 모름* → connect fail.

## Step 3: Clock Speed

```bash
# OpenOCD
adapter speed 1000   # 1 MHz — 안전
adapter speed 4000   # 4 MHz — 일반
adapter speed 20000  # 20 MHz — 최대

# 처음 connect 시 *느린 속도*에서 시작
# 안정 후 *높임*
```

너무 빠르면 *간헐 connect failure*. 너무 느리면 *flash erase 매우 느림* (~분 단위).

## Step 4: Reset 신호

```bash
# nRESET 사용 가능?
adapter reset_config srst_only
# 또는
adapter reset_config trst_and_srst

# 일부 보드 — nRESET 풀업 약함 → debugger가 못 잡음
```

`srst_pulls_trst` — system reset이 *test reset도 트리거*.

## Step 5: Security Lock — RDP

```text
STM32: Readout Protection (RDP)
  Level 0 — 잠금 없음
  Level 1 — Flash 읽기 잠금, 디버깅 가능 but read 못 함
  Level 2 — 완전 잠금 (영구) — Brick에 가까움

NXP: HAB (High Assurance Boot)
ESP32: eFuse-based secure boot
Nordic: APPROTECT — debug 차단
```

```bash
# STM32CubeProgrammer
> readout protection
Level 1 set
# → 다시 풀려면 *mass erase* (코드 잃음)
```

읽지 못하는 게 *기능* — 양산 폰·자동차 ECU 표준.

> ⚠️ 양산 펌웨어에 *실수로 RDP Level 2 set* → 영원 디버깅 불가, 칩 *교체* 외 답 없음.

## Step 6: Power 상태

```text
PWR_OFF — 보드 전원 자체 없음
DEEP_SLEEP — DEBUGEN 비활성 (특정 칩)
WFI 또는 WFE — clock 정지, debugger 못 잡음
```

```c
/* STM32 — debug 시 WFI 동안 clock 유지 */
DBGMCU->CR |= DBGMCU_CR_DBG_SLEEP | DBGMCU_CR_DBG_STOP;
```

## Step 7: Bootloader가 Debug 차단

```text
Secure boot 시 — BootROM이 *디버깅 차단* 후 application으로 jump
Application에서 *debug enable* 다시 안 함 → connect fail
```

ESP32 — `efuse_disable_debug` 가능 (영구). Nordic — `APPROTECT`.

## OpenOCD 실전

```bash
openocd -f interface/stlink.cfg -f target/stm32f4x.cfg

# 다른 터미널
telnet localhost 4444
> reset halt
> flash write_image erase firmware.bin 0x08000000
> reset run
```

또는 GDB:

```bash
arm-none-eabi-gdb firmware.elf
(gdb) target remote :3333
(gdb) monitor reset halt
(gdb) load
(gdb) continue
```

## ST-Link 안 잡힐 때

```bash
# Linux — udev rule 필요
sudo cp /etc/udev/rules.d/99-stlink.rules ...
sudo udevadm control --reload

# Permission
sudo openocd ...

# 또는 user 그룹
sudo usermod -aG plugdev $USER
```

## J-Link Commander

```bash
JLinkExe -device STM32F407VG -if SWD -speed 4000

J-Link> connect
J-Link> reset
J-Link> halt
J-Link> regs
J-Link> mem32 0x20000000 16
```

매우 빠른 flash speed — 산업·양산 라인 표준.

## Daisy Chain (JTAG only)

```text
[Debugger] → TDI → [Device A TDO] → TDI → [Device B TDO] → TDO → [Debugger]
                                                                   ↑
                                                            (returned)
```

여러 device 직렬. OpenOCD 설정:

```bash
jtag newtap chip0 cpu -irlen 4
jtag newtap chip1 cpu -irlen 4
```

`irlen` = *Instruction Register length*. 각 device 데이터시트 확인.

## SWO Trace

```text
SWO pin (SWD에선 별도) — 디버그 trace, printf
Manchester 또는 NRZ 인코딩
ITM stimulus port — printf
DWT — cycle·event counter
ETM — instruction trace (수 백 MB/s)
```

```c
ITM_SendChar('H');   // SWO로 출력
DWT->CYCCNT;          // cycle counter
```

ETM은 *trace probe* (J-Trace 등) 필요. *실시간 명령 흐름 캡쳐*.

## 자주 하는 실수

> ⚠️ Power 안 켜지고 connect 시도

```bash
openocd ...
# Error: target not halted
```

Board power 먼저. Power LED 확인.

> ⚠️ Reset 회로 RC 시정수

reset capacitor가 크면 (1µF) — *reset assert 후 release까지 ms 단위*. Debugger의 *짧은 reset pulse* 못 인식.

> ⚠️ TDI·TDO 교차 안 함

JTAG 4-wire에서 *TDI/TDO는 1:1* (UART와 다름). Debugger TDI → Target TDI, TDO → TDO.

> ⚠️ 옛 펌웨어가 SWD pin을 GPIO로 reconfigure

```c
GPIO_InitTypeDef gpio = {0};
gpio.Pin = GPIO_PIN_13 | GPIO_PIN_14;   // ← SWDIO, SWCLK
gpio.Mode = GPIO_MODE_OUTPUT_PP;
HAL_GPIO_Init(GPIOA, &gpio);
/* → SWD 잠김 — 다음 connect 못 함 */
```

해결 — *연결 즉시 reset halt* (SWD가 GPIO 되기 *전에* halt).

```bash
# OpenOCD
init
reset halt
# 또는 boot pin으로 system memory 부트 강제
```

## Brick 복구

```text
1. NRST + BOOT pin으로 *system bootloader* 강제
2. STM32CubeProgrammer에서 *mass erase*
3. RDP 재설정
4. 펌웨어 재로드
```

마지막 수단 — *eFuse 잠금* 시 *불가*. 칩 교체.

## 자동차·항공 — JTAG 영구 차단

양산 ECU — *JTAG fuse blow* (또는 RDP Level 2). Reverse engineering 방지.

개발 vs 양산 *별도 board version*. 또는 *secure debug* (서명된 challenge로만 unlock).

## 정리

체크리스트:
1. VTref 연결
2. 전압 매칭 (level shift 필요?)
3. Pin orientation (TDI·TDO 1:1, SWD는 SWDIO·SWCLK)
4. Adapter speed 낮게 시작
5. nRESET 동작
6. RDP·secure lock 확인
7. WFI·sleep mode 회피 (DBGMCU 설정)
8. OpenOCD·J-Link Commander로 *기본 연결* 검증
9. ITM·SWO로 trace
10. Brick — system bootloader + mass erase

다음 part는 **Cortex-M Bring-up**.

## 관련 항목

- [1-05: Bootloader](/blog/embedded/modern-recipes/part1-05-bootloader)
- [Performance Engineering 2-10: PMU](/blog/embedded/performance-engineering/part2-10-pmu)
