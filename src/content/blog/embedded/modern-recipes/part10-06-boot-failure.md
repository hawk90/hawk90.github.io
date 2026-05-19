---
title: "10-06: 부팅 안 될 때 — 단계별 Isolation"
date: 2026-05-16T20:00:00
description: "전원·reset·clock·vector table·main 진입까지 단계별로 isolation하는 부팅 디버깅 절차를 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 116
tags: [recipes, debugging, boot]
---

## 한 줄 요약

> **"부팅 디버깅은 *전기 → 클럭 → reset → vector table → main*을 위에서 아래로 한 단계씩 isolation하는 작업입니다."** 마지막에 도달하기 전까지는 코드를 의심하지 않습니다.

## 사례 — "프로그램은 분명 flash했는데 안 켜져요"

새 보드 prototype 100장이 도착했습니다. 1장에 firmware를 flash하니 동작합니다. 2장째는 죽어 있습니다. UART도 없고 LED도 안 켜집니다. JTAG으로 붙으니 "Target not responding". 시작합니다.

## Step 1 — 전원

```text
[ ] VDD 핀에 3.3V (또는 보드 spec) 측정?
[ ] GND 핀 0V?
[ ] 전류 소비 정상? (몇 mA ~ 수십 mA)
[ ] 디커플링 cap 손상 없음?
```

멀티미터로 VDD와 GND를 먼저 잡습니다. 새 보드의 흔한 사고.

- 5V 전원을 3.3V MCU에 직접 연결 → MCU 사망
- 솔더 단락으로 GND와 VDD 짧음 → 0.7V만 떨어짐
- 디커플링 cap 솔더 브리지 → MCU 0V

전류가 0 mA 또는 수백 mA로 비정상이면 *MCU가 dead*거나 *전원 회로 단락*입니다.

## Step 2 — Reset 핀

```text
[ ] NRST 핀 idle = high (3.3V)?
[ ] Reset 버튼 누르면 low → 떼면 high?
[ ] Reset 핀에 pull-up 있음? (보통 외부 또는 internal)
```

NRST가 *low로 계속 머물러* 있으면 MCU는 영원히 reset 상태입니다. 외부 reset IC, supervisor IC, 또는 디커플링 누락이 원인입니다.

```c
// 측정: oscilloscope를 NRST에 걸고 power on
// 정상: 0V → 짧은 시간 후 3.3V 안정
// 비정상: 0V 계속 / 진동
```

## Step 3 — 클럭

```text
[ ] HSE/외부 crystal 발진 확인?
[ ] OSC_IN·OSC_OUT 핀에 oscilloscope로 신호?
[ ] HSI만 쓰는 보드는 *내부 발진*이라 외부 측정 불가
```

크리스털이 발진을 못 시키는 사례는 의외로 많습니다.

- 부하 커패시터 값 부적합 (보통 12-22 pF)
- 크리스털 자체 불량
- PCB layout 길이 너무 김
- 솔더링 cold joint

```text
정상: OSC_IN에 1.6V~1.7V 중심의 sinusoidal (수 MHz)
비정상: DC 일정 / 진동 없음
```

HSI(내부 RC) fallback이 있는 MCU(STM32 등)는 외부 발진 실패 후 HSI로 부팅할 수 있습니다. 그러나 baud·timing이 맞지 않아 UART는 못 씁니다.

## Step 4 — JTAG/SWD 연결 확인

```bash
openocd -f interface/stlink.cfg -f target/stm32f4x.cfg
```

```text
Info : SWD DPIDR 0x2ba01477  ← MCU 인식
Info : stm32f4x.cpu: hardware has 6 breakpoints, 4 watchpoints

vs.

Error: init mode failed
Error: Could not initialize the debug port
```

DPIDR이 안 뜨면.

- SWDIO·SWCLK 배선 잘못 (TX/RX 같이 헷갈림)
- VDD 미공급 (JTAG 어댑터가 target VCC 측정)
- 이전 firmware가 SWD 핀을 GPIO로 사용 (재flash 불가)

마지막 케이스는 *connect under reset*으로 회복합니다. `openocd ... -c "init; reset halt"` 또는 ST-Link Utility의 "Connect Under Reset".

## Step 5 — Flash 내용 검증

```text
(openocd) telnet 4444
> flash banks
> dump_image dump.bin 0x08000000 0x1000

$ hexdump -C dump.bin | head
00000000  00 80 00 20 a9 01 00 08  41 01 00 08 41 01 00 08
          ^^^^^^^^^^^ ^^^^^^^^^^^
          MSP 초기값   Reset_Handler PC
```

첫 4 byte가 *initial MSP*, 두 번째 4 byte가 *Reset_Handler 주소*입니다. Vector table이 깨졌으면 부팅 자체가 안 됩니다.

- 모두 0xFF → flash가 비어 있음
- 첫 4 byte가 0xFFFFFFFF → MSP 무효 → fault 즉시
- Reset handler 주소가 RAM 영역 → bootloader 모드일 수 있음

## Step 6 — Boot pin / Option byte

```text
STM32:
  BOOT0 = 0 → flash boot (정상)
  BOOT0 = 1 → system bootloader (DFU)

[ ] BOOT0 풀다운 저항 (10k → GND) 잘 솔더링?
[ ] Option byte의 dual bank·bootloader 설정 확인
```

BOOT0 floating은 가장 흔한 prototype 사고입니다. 가끔 부팅되고 가끔 bootloader로 빠집니다.

Option byte에서 *RDP level 2*가 걸리면 영원히 flash 못 합니다. 잘 모르고 보호 걸어 보드 한 장을 brick 만든 사례를 자주 봅니다.

## Step 7 — Reset_Handler 안에서 진입 확인

```c
// startup_stm32f4xx.s 안
Reset_Handler:
    ldr   r0, =_estack
    mov   sp, r0
    bl    SystemInit       // ← 이 안에서 hang 가능
    bl    __libc_init_array
    bl    main             // ← 여기 도달?
```

`SystemInit`은 PLL 설정·flash latency·SystemCoreClock 설정을 합니다. 외부 crystal이 없는데 HSE 사용 설정이면 *영원히 ready 대기*에 빠집니다.

GDB로 halt해서 PC를 확인합니다.

```text
(gdb) target extended-remote :3333
(gdb) monitor halt
(gdb) info registers
PC = 0x08000174    ← Reset_Handler 어디쯤
(gdb) list *0x08000174
0x8000174 is in SystemInit (system_stm32f4xx.c:286).
286    while ((RCC->CR & RCC_CR_HSERDY) == 0);   ← HSE 안 떴음
```

찾았습니다. 외부 crystal 미장착 보드에 HSE 코드로 빌드한 firmware를 flash한 것입니다.

## Step 8 — main()까지

```c
int main(void) {
    HAL_Init();
    SystemClock_Config();
    MX_GPIO_Init();
    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_5, GPIO_PIN_SET);  // LED ON

    while (1) {
        HAL_GPIO_TogglePin(GPIOA, GPIO_PIN_5);
        HAL_Delay(500);
    }
}
```

여기까지 도달하면 LED가 깜빡입니다. 안 깜빡이면 위 단계 중 하나에서 막힌 것입니다.

## 사례 마무리

문제의 보드를 oscilloscope로 OSC_IN 측정 → 신호 없음. Crystal 솔더링 불량.

크리스털 솔더링을 재작업하니 정상 부팅. 100장 중 7장이 같은 문제. 위탁 PCBA의 stencil thickness 문제로 0402 cap 옆 8 MHz crystal의 솔더 양이 부족했습니다.

```text
교훈:
1. 새 prototype은 *완성품 가정 금지*
2. 멀티미터 + oscilloscope가 JTAG보다 먼저
3. 같은 firmware로 동작하는 보드 1개를 기준 비교에 둠
```

## Bootloader 활용 — JTAG 실패 시 백업

STM32는 ROM bootloader가 UART/USB DFU로 flash 쓰기를 지원합니다.

```bash
# BOOT0=1로 두고 reset
dfu-util -a 0 -s 0x08000000:leave -D firmware.bin

# 또는 stm32flash로 UART
stm32flash -w firmware.bin -v -g 0x0 /dev/ttyUSB0
```

JTAG 단자가 망가졌거나 SWD 핀이 GPIO로 잡힌 보드도 이걸로 살릴 수 있습니다.

## 첫 진입 후 안 살아남는 케이스

```c
int main(void) {
    /* 진입 후 즉시 죽음 — printf도 안 나옴 */
}
```

원인 후보.

- Stack overflow — 초기 stack이 너무 작음
- Vector table offset 잘못 (VTOR)
- ISR이 즉시 떨어지고 핸들러 없음 → HardFault
- Watchdog 활성 상태로 부팅 → reset loop

Reset loop는 RCC `CSR` 또는 `CRRCR` 같은 register의 reset reason flag로 진단합니다.

```c
if (RCC->CSR & RCC_CSR_IWDGRSTF) printf("IWDG reset!\n");
if (RCC->CSR & RCC_CSR_PINRSTF)  printf("Pin reset\n");
RCC->CSR |= RCC_CSR_RMVF;    // clear
```

## 자주 보는 함정

> 첫 보드만 테스트하고 양산 가정

Prototype 1장 동작 ≠ 양산 동작. 최소 5장은 모두 부팅 확인.

> Schematic만 보고 회로 검토

PCB layout이 schematic과 다른 경우가 종종 있습니다. Crystal load cap 위치, BOOT pin pull-down 위치를 *실제 PCB*에서 확인합니다.

> RDP Level 2 실수

Production에서 SWD 잠그려 RDP 2를 걸면 *영원히* 다시 flash 못 합니다. RDP 1까지만 사용합니다.

> JTAG 핀에 외부 회로 연결

SWDIO/SWCLK에 LED를 달면 boot 직후 SWD 신호 충돌로 connect 실패. JTAG 핀은 *전용*으로 둡니다.

> Watchdog 활성으로 boot loop

```c
HAL_Init();
HAL_IWDG_Init(&hiwdg);   /* 100ms timeout */
slow_init();             /* 200ms 걸림 → watchdog reset */
```

부팅 초기 IWDG는 신중히 활성합니다. 또는 timeout을 충분히 크게 잡습니다.

## 정리

- 전원 → reset → clock → JTAG → flash → boot pin → SystemInit → main 순으로 isolation.
- 멀티미터·oscilloscope가 JTAG·코드보다 먼저.
- Vector table 첫 4 byte (MSP)와 두 번째 4 byte (Reset_Handler) 검증.
- SystemInit에서 HSE 대기 hang이 가장 흔합니다.
- 같은 firmware로 동작하는 *기준 보드* 1장을 항상 손에 둡니다.
- RDP, BOOT pin, watchdog는 boot loop의 주범. 의심부터.
- Bootloader (DFU/UART)는 JTAG 실패 시 백업 경로.
- RCC CSR의 reset reason flag로 *왜 reset됐는지* 진단.

다음 편은 **인터럽트 누락/중복 진단**입니다.

## 관련 항목

- [10-04: 하드폴트 분석](/blog/embedded/modern-recipes/part10-04-hardfault-analysis)
- [10-05: UART 안 찍힐 때](/blog/embedded/modern-recipes/part10-05-uart-not-printing)
- [10-07: 인터럽트 누락/중복](/blog/embedded/modern-recipes/part10-07-interrupt-debugging)
