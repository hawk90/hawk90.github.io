---
title: "JTAG·SWD 안 붙을 때 — 핀·전압·속도·세션 진단"
slug: "embedded/modern-recipes/part10-02-jtag-swd"
date: 2026-04-19T09:01:00
description: "JTAG·SWD가 안 붙을 때 VTref·커넥터 핀·클럭·리셋·STM32 RDP·저전력·디버그 핀 재설정을 차례로 점검합니다. Arm·SEGGER·OpenOCD 문서와 STM32F4 데이터시트·HAL을 근거로 합니다."
series: "Modern Embedded Recipes"
seriesOrder: 112
tags: [recipes, jtag, swd, openocd, debug, brick]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"JTAG·SWD가 안 붙으면 전원·VTref·핀 → 속도 → 리셋 → 보호 설정 → 저전력 순으로 좁힙니다."** 아래 단계는 각각 무엇을 재고, 어느 문서가 근거인지와 함께 적었습니다.

이 글은 연결이 안 될 때의 점검 순서를 다룹니다. JTAG TAP, SWD 패킷, DP/AP 같은 프로토콜 자체는 [Embedded Debugging 2장](/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight)에서 ADIv5 원문과 함께 설명했습니다. 이 글의 근거는 Arm의 *Cortex-M Debug Connectors* 문서, SEGGER J-Link 지식 베이스(UM08001과 *20-pin J-Link Connector*), OpenOCD 사용자 설명서(openocd.org), STM32F405/407 데이터시트(DS8626, DocID022152 Rev 4), ST HAL v1.8.6입니다. 프로브와 보드가 없어 OpenOCD·J-Link 명령은 실행하지 않았고, 아래 C 코드는 빌드만 확인했습니다.

## JTAG vs SWD

| 항목 | JTAG | SWD |
|---|---|---|
| 신호 | TCK·TMS·TDI·TDO, 선택적으로 nTRST·RTCK | SWCLK·SWDIO, trace용 SWO는 별도 |
| 여러 칩 연결 | TDI→TDO 직렬 체인 | SW-DP v1은 프로브 하나에 DP 하나, SW-DP v2·SWJ-DP v2는 multi-drop으로 여러 DP (OpenOCD 설명서 *Debug Adapter Configuration*) |
| 근거 | IEEE 1149.1 / Arm JTAG-DP | Arm ADIv5 SW-DP |

STM32F405/407은 두 방식을 한 포트에서 고를 수 있는 SWJ-DP를 넣었습니다. DS8626 2.2.38절은 JTAG의 TMS·TCK 핀이 SWDIO·SWCLK와 공유되고, TMS 핀에 특정 시퀀스를 보내 JTAG-DP와 SW-DP를 전환하며, SWD는 JTAG의 5핀 대신 2핀만 쓴다고 적습니다. 남는 JTAG 핀(PA15 JTDI, PB3 JTDO/TRACESWO, PB4 NJTRST)은 다른 기능으로 쓸 수 있습니다(DS8626 핀 정의 표).

## Step 1: 핀 연결

### 20-pin JTAG (0.1", 레거시)

SEGGER *20-pin J-Link Connector* 문서의 배치입니다. 같은 커넥터를 SWD로도 씁니다.

| 핀 | JTAG | SWD | 핀 | 신호 |
| --- | --- | --- | --- | --- |
| 1 | VTref | VTref | 2 | NC (SWD에서는 Vsupply, J-Link는 미연결) |
| 3 | nTRST | — | 4, 6, 8, 10, 12 | GND |
| 5 | TDI | — | 14, 16, 18, 20 | Reserved |
| 7 | TMS | SWDIO | 19 | 5 V supply |
| 9 | TCK | SWCLK | | |
| 11 | RTCK | — | | |
| 13 | TDO | SWO (선택) | | |
| 15 | nRESET | nRESET | | |
| 17 | DBGRQ | — | | |

Arm *Cortex-M Debug Connectors* 문서는 같은 20핀 IDC 커넥터의 짝수 핀 4~20을 GND로 그립니다. 14·16·18·20을 SEGGER는 Reserved로, Arm은 GND로 적으므로, 보드에서는 이 핀들을 신호로 쓰지 않으면 두 쪽과 모두 맞습니다.

### 10-pin Cortex Debug (0.05")

Arm *Cortex-M Debug Connectors* 문서의 배치입니다. 이 문서는 새 설계에 이 커넥터와 20핀 Cortex Debug+ETM 커넥터를 권합니다.

| 핀 | 신호 | 핀 | 신호 |
| --- | --- | --- | --- |
| 1 | VCC | 2 | SWDIO / TMS |
| 3 | GND | 4 | SWDCLK / TCK |
| 5 | GND | 6 | SWO / TDO |
| 7 | KEY | 8 | NC / TDI |
| 9 | GNDDetect | 10 | nRESET |

7번은 핀이 없는 키 자리이고, 9번은 GND가 아니라 GNDDetect입니다. 같은 문서는 이 커넥터가 JTAG, Serial Wire debug, SWO를 통한 Serial Wire Viewer를 지원한다고 적습니다.

## Step 2: 전압 — VTref

SEGGER UM08001은 VTref를 target 기준 전압이라고 정의합니다. J-Link는 이 전압으로 target에 전원이 있는지 확인하고, 입력 비교기의 논리 기준을 만들고, target 쪽 출력 레벨을 정합니다. 보통 target 보드의 VDD에서 직접 받고, 직렬 저항을 넣으면 안 됩니다. VTref가 0이면 프로브가 target 전원이 없다고 보고 신호 레벨도 잡지 못합니다. 같은 문서는 최근 J-Link 하드웨어가 J-Link Commander의 `VTREF` 명령으로 고정 기준 전압을 쓸 수 있다고 적습니다.

20핀 커넥터 19번의 5 V는 프로브가 target에 *주는* 전원입니다. UM08001은 최대 300 mA이고 J-Link Commander의 `power on`/`power off`로 켜고 끈다고 적습니다. 3.3 V 보드에 이 핀을 VDD로 이어 버리면 5 V가 들어가므로, 보드 쪽 커넥터에서는 연결하지 않거나 별도 레귤레이터를 거칩니다.

## Step 3: 클럭 속도

OpenOCD 설명서 8.4절 *JTAG Speed*는 속도 설정을 이렇게 설명합니다. `adapter speed`의 단위는 kHz이고(3000 = 3 MHz), 프로브는 지정값보다 빠르지 않은 속도 중 지원하는 값을 씁니다. 칩 데이터시트가 최고 디버그 클럭을 주며, PCB 배선이나 외부 어댑터 배선 때문에 더 낮춰야 할 수 있습니다. ARM7·ARM9·ARM11은 JTAG 클럭을 CPU 클럭의 1/6 이하로 받지만, ADIv5 이후의 디버그 회로는 스스로 클럭을 받으므로 CPU 클럭보다 빨라도 됩니다.

OpenOCD v0.12.0의 `target/stm32f4x.cfg`가 이 순서를 그대로 구현합니다. 리셋 직후 CPU는 16 MHz HSI로 돌아오므로 `reset-start`에서 2 MHz로 낮추고, `reset-init`에서 PLL로 64 MHz를 만든 뒤 8 MHz로 올립니다.

```text
$_TARGETNAME configure -event reset-init {
	# Configure PLL to boost clock to HSI x 4 (64 MHz)
	...
	# Boost JTAG frequency
	adapter speed 8000
}

$_TARGETNAME configure -event reset-start {
	# Reduce speed since CPU speed will slow down to 16MHz with the reset
	adapter speed 2000
}
```

보드 설정에서 같은 이벤트에 핸들러를 다시 정의하면 OpenOCD는 기존 핸들러를 바꿔 끼우므로, cfg의 PLL 설정까지 사라집니다. 속도만 바꾸려면 핸들러 전체를 옮겨 와 고칩니다.

같은 절은 리셋 직후에는 느리게, CPU 클럭을 설정한 뒤 빠르게 바꾸는 순서를 권하고, RTCK(adaptive clocking)를 지원하는 시스템이면 그것이 가장 튼튼한 방법이라고 적습니다. `adapter speed 0`이 RTCK를 고릅니다.

## Step 4: Reset 신호

OpenOCD는 보드가 리셋 신호를 어떻게 연결했는지 `reset_config`로 알려 줘야 그 신호를 씁니다(설명서 *Reset Configuration*). 값은 `none`(기본), `trst_only`, `srst_only`, `trst_and_srst`이고, `srst_pulls_trst`는 시스템 리셋이 test logic까지 리셋하는 보드를 뜻합니다.

```bash
reset_config srst_only                                      # nRESET만 연결된 SWD 보드
reset_config srst_only srst_nogate connect_assert_srst      # 연결하는 동안 nRESET을 잡고 있기
```

`connect_assert_srst`는 target에 연결하기 전에 SRST를 assert합니다. 설명서는 이 옵션을 쓰려면 SRST 중에도 JTAG/SWD 통신이 되는 `srst_nogate`가 필요하다고 적고, `stm32f4x.cfg`도 76행에서 `reset_config srst_nogate`를 둡니다. 설명서는 STM32를 지원 예로 들고, 옵션 바이트가 잘못되었거나 프로그램이 이상하게 실행되어 연결할 수 없을 때 쓸모 있다고 적습니다. 아래 「SWD 핀을 GPIO로 바꾼 펌웨어」가 그 경우입니다.

리셋 핀 자체의 조건은 데이터시트에 있습니다. DS8626 Table 50에 따르면 STM32F405/407의 NRST는 내부 pull-up 30~50 kΩ, 100 ns 이하 펄스는 걸러지고 300 ns 이상은 통과합니다(V_DD > 2.7 V). Figure 38은 NRST에 0.1 µF를 권장 보호 회로로 그리고, 주석에서 NRST 레벨이 V_IL(NRST) 아래로 내려가지 않으면 리셋이 인식되지 않는다고 적습니다. 커패시터가 크면 리셋을 놓은 뒤 다시 올라오는 시간도 길어집니다. 내부 pull-up만으로 0 V에서 0.7 V_DD까지 오르는 시간을 계산하면 다음과 같습니다.

```text
NRST rise with Rpu 30k, C 0.1uF: tau=3.0 ms, 0->0.7VDD =3.6 ms
NRST rise with Rpu 50k, C 0.1uF: tau=5.0 ms, 0->0.7VDD =6.0 ms
NRST rise with Rpu 30k, C 1.0uF: tau=30.0 ms, 0->0.7VDD =36.1 ms
NRST rise with Rpu 50k, C 1.0uF: tau=50.0 ms, 0->0.7VDD =60.2 ms
```

1 µF를 달면 리셋 해제가 최대 60 ms 늦어집니다. 프로브가 리셋을 놓은 뒤 이보다 빨리 연결을 시도하면 칩은 아직 리셋 안에 있습니다.

## Step 5: 보호 설정 — STM32 RDP

STM32F4의 읽기 보호(RDP)는 옵션 바이트로 정합니다. HAL v1.8.6 `stm32f4xx_hal_flash_ex.h`의 값과 `FLASH_OB_RDP_LevelConfig()`의 설명은 다음과 같습니다.

| 레벨 | 옵션 바이트 값 | HAL 설명 |
| --- | --- | --- |
| 0 | `0xAA` | No protection |
| 1 | `0x55` | Read protection of the memory |
| 2 | `0xCC` | Full chip protection. "it's no more possible to go back to level 1 or 0" |

같은 HAL의 `stm32f4xx_hal_flash_ex.c` write protection 함수 주석은 RDP 레벨 1에서 Cortex-M4 디버그 기능이 연결되어 있으면 flash sector를 프로그램하거나 지울 수 없다고 적습니다. 그래서 레벨 1인 칩에 프로브를 붙이면 연결은 되어도 flash 쓰기가 실패합니다. 레벨 2는 HAL 주석대로 되돌릴 수 없으므로, 양산 스크립트에서 RDP 값을 쓰는 단계는 개발 보드에서 돌리지 않도록 분리해 둡니다.

## Step 6: 저전력 모드

STM32F4는 `DBGMCU_CR`의 `DBG_SLEEP`·`DBG_STOP` 비트로 저전력 모드에서도 디버그를 유지합니다. HAL의 `HAL_DBGMCU_EnableDBGSleepMode()`·`HAL_DBGMCU_EnableDBGStopMode()`(`stm32f4xx_hal.c` 469·487행)는 "Enable the Debug Module during SLEEP/STOP mode"라는 설명과 함께 이 비트를 켭니다.

## Step 7: 펌웨어가 디버그 핀을 가져감

DS8626 Table 7은 PA13을 `(JTMS-SWDIO)`, PA14를 `(JTCK/SWCLK)`로 적어 리셋 직후 이 핀들이 디버그 기능이라는 것을 보여 줍니다. 펌웨어가 이 핀의 `MODER`를 바꾸면 그 순간부터 SWD가 끊깁니다. 아래 두 함수는 디버그 유지 설정과, 피해야 할 핀 재설정입니다.

```c
#include "stm32f407xx.h"

/* Keep the debug connection alive in Sleep/Stop (HAL_DBGMCU_EnableDBGSleepMode/StopMode) */
void debug_keep_alive_in_low_power(void) {
    DBGMCU->CR |= DBGMCU_CR_DBG_SLEEP | DBGMCU_CR_DBG_STOP;
}

/* The mistake: PA13 (SWDIO) and PA14 (SWCLK) turned into push-pull outputs */
void break_swd(void) {
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;
    GPIOA->MODER = (GPIOA->MODER & ~((3u << (13 * 2)) | (3u << (14 * 2))))
                 | (1u << (13 * 2)) | (1u << (14 * 2));
}
```

`cmsis_device_f4` 헤더로 `arm-none-eabi-gcc` 16.2.0에서 경고 없이 빌드됩니다(`-mcpu=cortex-m4 -mthumb -O2 -ffreestanding -DSTM32F407xx -Wall -Wextra`). `break_swd()`가 리셋 직후 실행되는 펌웨어라면, 연결할 틈이 리셋과 그 코드 사이밖에 없습니다. 위 Step 4의 `connect_assert_srst`로 리셋을 잡은 채 연결하고, `reset halt`로 첫 명령 전에 멈춘 뒤 flash를 지우거나 새로 씁니다. OpenOCD 설명서는 `reset halt`를 가능하면 SRST를 쓰는 가장 강한 리셋 뒤 target을 멈추는 명령으로 설명합니다(*General Commands*).

## OpenOCD 실전

```bash
openocd -f interface/stlink.cfg -f target/stm32f4x.cfg

# 다른 터미널 (telnet 포트 4444)
telnet localhost 4444
> reset halt
> flash write_image erase firmware.bin 0x08000000
> reset run
```

GDB로는 3333 포트에 붙습니다. OpenOCD 설명서 *Server Configuration*에 따르면 GDB 포트 기본값은 3333, telnet은 4444입니다.

```bash
arm-none-eabi-gdb firmware.elf
(gdb) target extended-remote :3333
(gdb) monitor reset halt
(gdb) load
(gdb) continue
```

Linux에서 프로브가 권한 문제로 열리지 않으면, OpenOCD README는 root로 실행하지 말고 저장소의 `contrib/60-openocd.rules`를 `/etc/udev/rules.d`에 두고 사용자를 `plugdev` 그룹에 넣으라고 적습니다.

```bash
sudo cp contrib/60-openocd.rules /etc/udev/rules.d/
sudo udevadm control --reload
sudo usermod -aG plugdev "$USER"
```

## J-Link Commander

```bash
JLinkExe -device STM32F407VG -if SWD -speed 4000

J-Link> connect
J-Link> halt
J-Link> regs
J-Link> mem32 0x20000000 16
```

`-device`·`-if`·`-speed`는 J-Link Commander의 명령행 옵션이고, `connect`·`halt`·`regs`·`mem32`는 각각 target 연결, CPU 정지, 레지스터 표시, 32비트 단위 메모리 읽기입니다(SEGGER *J-Link Commander* 문서의 명령 표).

## Daisy chain (JTAG)

JTAG는 프로브의 TDI가 첫 칩의 TDI로 들어가고, 그 칩의 TDO가 다음 칩의 TDI로 이어지며, 마지막 칩의 TDO가 프로브로 돌아오는 직렬 체인입니다. 체인의 IR 길이가 왜 맞아야 하는지는 [Embedded Debugging 2장의 Daisy chain 절](/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight)에 `stm32f4x.cfg`의 실제 선언과 함께 있습니다. OpenOCD는 체인의 TAP을 순서대로 선언합니다.

```bash
jtag newtap chip0 cpu -irlen 4
jtag newtap chip1 cpu -irlen 4
```

OpenOCD 설명서 *TAP Declaration*은 `-irlen`을 모든 TAP에 필요한 instruction register 길이라고 정의하고, IR 길이를 모르면 OpenOCD가 자동 탐지한 `AUTO` 결과(예: `use "... -irlen 4"`)를 참고하라고 적습니다. 값의 원 출처는 각 칩의 데이터시트입니다.

## SWO trace

SWO는 SWD 2선과 별도인 단방향 trace 출력입니다. 10핀 커넥터의 6번이 SWO/TDO이고, STM32F407에서는 PB3이 `JTDO/TRACESWO`입니다(DS8626 핀 정의). JTAG 모드에서는 이 핀이 TDO이므로 SWO는 SWD 모드에서만 씁니다(Arm *Cortex-M Debug Connectors*). ITM의 stimulus port로 printf를, DWT로 cycle counter와 이벤트를 내보냅니다. stimulus port에 한 글자를 쓰는 레지스터 수준 코드는 [Embedded Debugging 2장의 ITM 절](/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight)에 있습니다.

## 자주 하는 실수

> ⚠️ target 전원 없이 연결

VTref가 0 V면 J-Link는 target 전원이 없다고 판단합니다(UM08001). 프로브 쪽 메시지보다 먼저 VTref 핀의 전압을 멀티미터로 잽니다.

> ⚠️ TDI·TDO를 UART처럼 교차

JTAG에서 프로브의 TDI는 target의 TDI로, 프로브의 TDO는 target의 TDO로 갑니다. 위 20핀·10핀 표의 핀 이름이 그대로 1:1로 이어집니다.

> ⚠️ 리셋 커패시터를 크게 달기

위 계산처럼 NRST의 1 µF는 리셋 해제를 수십 ms 늦춥니다. DS8626이 권장 회로로 그린 값은 0.1 µF입니다.

> ⚠️ SWD 핀을 GPIO로 바꾼 펌웨어

위 `break_swd()` 같은 코드가 리셋 직후 돌면 Step 4·7의 `connect_assert_srst` + `reset halt`로 연결합니다.

## 정리

1. VTref에 target VDD가 직렬 저항 없이 들어오는지 봅니다(UM08001).
2. 커넥터 핀을 Arm 10핀 또는 SEGGER 20핀 표와 맞춥니다. 20핀 19번 5 V는 프로브가 내보내는 전원입니다.
3. `adapter speed`를 낮게 시작하고, CPU 클럭 설정 뒤 올립니다(OpenOCD 8.4).
4. `reset_config`로 보드의 리셋 연결을 알리고, 연결이 안 되면 `connect_assert_srst`를 씁니다.
5. STM32 RDP 레벨 1은 디버그 연결 중 flash 쓰기를 막고, 레벨 2는 되돌릴 수 없습니다(HAL).
6. 저전력 모드에서는 `DBGMCU_CR`의 `DBG_SLEEP`·`DBG_STOP`을 켭니다.
7. NRST 커패시터는 데이터시트 권장값(0.1 µF)으로 둡니다.

다음 편은 **GDB 원격 디버깅**입니다.

## 관련 항목

- [3-12: Bootloader 체인](/blog/embedded/modern-recipes/part3-12-bootloader-chain)
- [Embedded Debugging 2장: JTAG·SWD·CoreSight](/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight)
- [Performance Engineering 2-10: PMU](/blog/embedded/performance-engineering/part2-10-pmu)
