---
title: "10-02: JTAG·SWD 안 붙을 때 — 핀·전압·속도·세션"
date: 2026-05-16T16:00:00
description: "JTAG·SWD 디버깅 체크리스트. Pin·voltage·clock·daisy chain·security 잠금."
series: "Modern Embedded Recipes"
seriesOrder: 112
tags: [recipes, jtag, swd, openocd, debug, brick]
draft: false
---

## 한 줄 요약

> **"JTAG가 안 붙으면 전기·핀 → 속도 → 보안잠금 순으로 점검합니다."** 위에서부터 차례로 확인합니다.

## JTAG vs SWD

| 항목 | JTAG | SWD |
|---|---|---|
| 핀 | 4-5 (TCK·TMS·TDI·TDO·TRST?) | 2 (SWCLK·SWDIO) |
| 속도 | 수십 MHz | 수십 MHz |
| Daisy chain | O (여러 device) | X (single) |
| Cortex-M | 일부 | 표준 |
| Cortex-A | 표준 | 가능 (cJTAG 변종) |
| ARM debug protocol | Both supports |  |

Cortex-M3+는 *SWJ-DP*를 제공해 선택할 수 있습니다. 보통 SWD가 핀 수가 적어 선호됩니다.

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

VTref는 *target voltage*입니다. debugger가 *level translate*에 씁니다.

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

ST-Link·J-Link의 표준 커넥터입니다.

## Step 2: 전압 매칭

```text
3.3V 보드 + 5V J-Link → fry 위험
1.8V 보드 (modern SoC) + 3.3V debugger → 신호 불안정 또는 손상
```

**VTref pin이 *target에서 debugger로*** 정보를 제공합니다. 이렇게 하면 debugger가 자동으로 level shift를 합니다.

VTref가 연결되지 않으면 *debug interface*를 알 수 없어 connect가 실패합니다.

## Step 3: Clock Speed

```bash
# OpenOCD
adapter speed 1000   # 1 MHz — 안전
adapter speed 4000   # 4 MHz — 일반
adapter speed 20000  # 20 MHz — 최대

# 처음 connect 시 *느린 속도*에서 시작
# 안정 후 *높임*
```

너무 빠르면 *간헐적 connect failure*가 발생합니다. 반대로 너무 느리면 *flash erase가 매우 느려집니다* (~분 단위).

## Step 4: Reset 신호

```bash
# nRESET 사용 가능?
adapter reset_config srst_only
# 또는
adapter reset_config trst_and_srst

# 일부 보드에서는 nRESET 풀업이 약해 debugger가 잡지 못합니다
```

`srst_pulls_trst`는 system reset이 *test reset도 트리거*하게 합니다.

## Step 5: Security Lock — RDP

```text
STM32: Readout Protection (RDP)
  Level 0: 잠금 없음
  Level 1: Flash 읽기 잠금, 디버깅 가능하지만 read는 불가
  Level 2: 완전 잠금 (영구), Brick에 가까움

NXP: HAB (High Assurance Boot)
ESP32: eFuse-based secure boot
Nordic: APPROTECT, debug 차단
```

```bash
# STM32CubeProgrammer
> readout protection
Level 1 set
# → 다시 풀려면 *mass erase*를 해야 하고 코드를 잃습니다
```

읽지 못하는 것이 *기능*입니다. 양산 폰·자동차 ECU의 표준입니다.

> ⚠️ 양산 펌웨어에서 *실수로 RDP Level 2를 set*하면 영원히 디버깅이 불가합니다. 칩 *교체* 외에는 답이 없습니다.

## Step 6: Power 상태

```text
PWR_OFF: 보드 전원 자체 없음
DEEP_SLEEP: DEBUGEN 비활성 (특정 칩)
WFI 또는 WFE: clock 정지, debugger가 못 잡음
```

```c
/* STM32 — debug 시 WFI 동안 clock 유지 */
DBGMCU->CR |= DBGMCU_CR_DBG_SLEEP | DBGMCU_CR_DBG_STOP;
```

## Step 7: Bootloader가 Debug 차단

```text
Secure boot 시 BootROM이 *디버깅을 차단* 후 application으로 jump합니다.
Application에서 *debug enable*을 다시 하지 않으면 connect가 실패합니다.
```

ESP32에서는 `efuse_disable_debug`가 가능합니다 (영구). Nordic은 `APPROTECT`를 씁니다.

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

매우 빠른 flash speed를 제공해 산업·양산 라인의 표준입니다.

## Daisy Chain (JTAG only)

```text
[Debugger] → TDI → [Device A TDO] → TDI → [Device B TDO] → TDO → [Debugger]
                                                                   ↑
                                                            (returned)
```

여러 device를 직렬로 연결합니다. OpenOCD 설정 예시는 다음과 같습니다.

```bash
jtag newtap chip0 cpu -irlen 4
jtag newtap chip1 cpu -irlen 4
```

`irlen`은 *Instruction Register length*입니다. 각 device 데이터시트에서 확인합니다.

## SWO Trace

```text
SWO pin (SWD에선 별도): 디버그 trace, printf
Manchester 또는 NRZ 인코딩
ITM stimulus port: printf
DWT: cycle·event counter
ETM: instruction trace (수 백 MB/s)
```

```c
ITM_SendChar('H');   // SWO로 출력
DWT->CYCCNT;          // cycle counter
```

ETM은 *trace probe* (J-Trace 등)가 필요합니다. *실시간 명령 흐름을 캡쳐*할 수 있습니다.

## 자주 하는 실수

> ⚠️ Power 안 켜지고 connect 시도

```bash
openocd ...
# Error: target not halted
```

Board power를 먼저 켜야 합니다. Power LED를 확인합니다.

> ⚠️ Reset 회로 RC 시정수

reset capacitor가 크면 (1µF) *reset assert 후 release까지 ms 단위*가 걸립니다. 이렇게 되면 Debugger의 *짧은 reset pulse*를 인식하지 못합니다.

> ⚠️ TDI·TDO 교차 안 함

JTAG 4-wire에서 *TDI/TDO는 1:1*입니다 (UART와 다릅니다). Debugger TDI → Target TDI, TDO → TDO 방식으로 연결합니다.

> ⚠️ 옛 펌웨어가 SWD pin을 GPIO로 reconfigure

```c
GPIO_InitTypeDef gpio = {0};
gpio.Pin = GPIO_PIN_13 | GPIO_PIN_14;   // ← SWDIO, SWCLK
gpio.Mode = GPIO_MODE_OUTPUT_PP;
HAL_GPIO_Init(GPIOA, &gpio);
/* → SWD가 잠겨 다음 connect가 불가합니다 */
```

해결책은 *연결 즉시 reset halt*입니다 (SWD가 GPIO로 바뀌기 *전에* halt합니다).

```bash
# OpenOCD
init
reset halt
# 또는 boot pin으로 system memory 부트 강제
```

## Brick 복구

1. NRST + BOOT pin으로 *system bootloader* 강제
2. STM32CubeProgrammer에서 *mass erase*
3. RDP 재설정
4. 펌웨어 재로드

마지막 수단입니다. *eFuse 잠금* 상태에서는 복구가 *불가*하므로 칩을 교체해야 합니다.

## 자동차·항공 — JTAG 영구 차단

양산 ECU에서는 *JTAG fuse blow*를 하거나 RDP Level 2를 적용합니다. Reverse engineering 방지가 목적입니다.

개발과 양산에는 *별도 board version*을 씁니다. 또는 *secure debug* (서명된 challenge로만 unlock)을 적용합니다.

## 정리

체크리스트는 다음과 같습니다.

1. VTref 연결을 확인합니다.
2. 전압 매칭 (level shift 필요 여부)을 확인합니다.
3. Pin orientation (TDI·TDO 1:1, SWD는 SWDIO·SWCLK)을 확인합니다.
4. Adapter speed를 낮게 시작합니다.
5. nRESET 동작을 확인합니다.
6. RDP·secure lock을 확인합니다.
7. WFI·sleep mode를 회피합니다 (DBGMCU 설정).
8. OpenOCD·J-Link Commander로 *기본 연결*을 검증합니다.
9. ITM·SWO로 trace를 합니다.
10. Brick 상태에서는 system bootloader + mass erase를 시도합니다.

다음 part는 **Cortex-M Bring-up**입니다.

## 관련 항목

- [1-05: Bootloader](/blog/embedded/modern-recipes/part1-05-bootloader)
- [Performance Engineering 2-10: PMU](/blog/embedded/performance-engineering/part2-10-pmu)
