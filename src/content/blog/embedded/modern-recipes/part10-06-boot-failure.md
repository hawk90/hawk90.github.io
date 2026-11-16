---
title: "임베디드 부팅 실패 진단 — 단계별 Isolation"
slug: "embedded/modern-recipes/part10-06-boot-failure"
date: 2026-04-19T09:05:00
description: "전원·reset·클럭·디버거·vector table·boot 핀·SystemInit·main 순으로 부팅 실패를 좁히고, 빈 flash와 HSE 대기 hang을 QEMU에서 재현해 LLDB로 멈춘 위치와 RCC 레지스터를 확인합니다."
series: "Modern Embedded Recipes"
seriesOrder: 116
tags: [recipes, debugging, boot]
topics: ["embedded"]
---

## 한 줄 요약

> **"부팅 디버깅은 *전기 → 클럭 → reset → vector table → main*을 위에서 아래로 한 단계씩 좁혀 가는 작업입니다."** 마지막에 도달하기 전까지는 코드를 의심하지 않습니다.

## 어떤 상황에서 쓰나

firmware를 flash했는데 LED도 UART도 반응이 없고, 디버거 연결도 되다 말다 하는 경우입니다. 이때 코드를 먼저 의심하면 원인이 전원이나 클럭일 때 시간을 잃습니다. 아래 순서는 아래층(전기)에서 위층(코드)으로 올라가며, 각 단계가 무엇을 확인하는지와 근거를 함께 적었습니다. 근거는 STM32F405/407 데이터시트(DS8626, DocID022152 Rev 4), ST HAL v1.8.6, OpenOCD v0.12.0이고, 코드 쪽 단계 중 둘(빈 flash, HSE 대기)은 QEMU 11.1.3의 STM32F405 머신(`netduinoplus2`)에서 실제로 재현했습니다. 보드에서는 실행하지 않았습니다.

## Step 1 — 전원

- [ ] VDD 핀 전압이 데이터시트의 동작 범위 안인가(멀티미터)
- [ ] GND가 연결되어 있는가
- [ ] 소비 전류가 같은 firmware를 올린 정상 보드와 비슷한가
- [ ] VDD와 GND 사이가 단락되지 않았는가(전원 끄고 저항 측정)

STM32F405/407의 V_DD 절대 최대값은 4.0 V입니다(DS8626 Table 11). 5 V를 바로 넣으면 정격을 넘습니다. 소비 전류는 보드마다 다르므로 절대값보다 정상 보드와의 비교가 기준입니다.

## Step 2 — Reset 핀

- [ ] NRST가 평소 high인가
- [ ] reset 버튼을 누르면 low, 떼면 high로 돌아오는가

NRST가 low에 머물면 칩은 reset을 벗어나지 못합니다. DS8626 Table 50에 따르면 NRST에는 30~50 kΩ 내부 pull-up이 있고, Figure 38은 외부에 0.1 µF를 권장 보호 회로로 그립니다. 같은 그림의 주석은 NRST 레벨이 V_IL(NRST) 아래로 내려가야 reset이 인식된다고 적습니다. 외부 supervisor IC가 NRST를 잡고 있다면 그 IC의 출력부터 봅니다. 스코프를 NRST에 걸고 전원을 켜면, 0 V에서 시작해 high로 올라가 머무는지 볼 수 있습니다. 내부 pull-up과 커패시터로 올라가는 시간은 [10-02](/blog/embedded/modern-recipes/part10-02-jtag-swd)에서 계산했습니다(0.1 µF에서 최대 6 ms).

## Step 3 — 클럭

- [ ] 외부 크리스털을 쓰는 설계라면 OSC_IN·OSC_OUT에서 발진이 보이는가
- [ ] 크리스털 부하 커패시터가 크리스털 사양의 C_L에 맞는가

STM32F4는 reset 직후 내부 HSI 16 MHz로 시작하므로(`system_stm32f4xx.c`의 `SystemCoreClock` 초깃값, [1-02](/blog/embedded/modern-recipes/part1-02-clock-timing)), 외부 크리스털이 죽어 있어도 reset은 벗어납니다. 멈추는 곳은 HSE를 켜고 준비를 기다리는 코드입니다. 그 모습은 아래 Step 7에서 직접 봅니다. 부하 커패시터를 고르는 식(C = 2 × (C_L − C_S))은 1-02에 있습니다.

## Step 4 — 디버거 연결

```bash
openocd -f interface/stlink.cfg -f target/stm32f4x.cfg
```

OpenOCD v0.12.0의 `target/stm32f4x.cfg`는 이 칩의 debug port ID를 JTAG에서 0x4ba00477, SWD에서 0x2ba01477로 기대합니다(34·36행). OpenOCD가 SWD로 읽은 DPIDR이 0x2ba01477이면 칩의 debug port까지는 살아 있습니다. 연결이 안 되면 [10-02: JTAG·SWD 안 붙을 때](/blog/embedded/modern-recipes/part10-02-jtag-swd)의 순서로 내려갑니다. 이전 firmware가 SWD 핀을 GPIO로 바꿨다면 `reset_config srst_only srst_nogate connect_assert_srst`로 reset을 잡은 채 연결합니다.

## Step 5 — Flash 내용 검증

Cortex-M은 reset 때 vector table의 첫 word를 초기 SP로, 둘째 word를 Reset_Handler 주소로 읽습니다. OpenOCD로 flash 앞부분을 덤프해 이 두 word를 봅니다.

```text
(telnet 4444)
> dump_image dump.bin 0x08000000 0x1000
```

정상 이미지라면 다음과 같아야 합니다. 1-02의 168 MHz 예제를 빌드한 ELF의 vector table과 심볼입니다.

```text
Contents of section .isr_vector:
 8000000 00000220 43000008 41000008 41000008  ... C...A...A...
20020000 B _estack
08000042 T Reset_Handler
```

첫 word 0x20020000은 `_estack`(SRAM 끝)이고, 둘째 word 0x08000043은 `Reset_Handler`(0x08000042)에 Thumb 비트를 더한 값입니다. 반대로 flash가 비어 있으면(모두 0xFF) 무슨 일이 생기는지 QEMU에 4 KB짜리 0xFF 이미지를 올려 봤습니다.

```text
$ qemu-system-arm -M netduinoplus2 -nographic -monitor none -serial none -device loader,file=blank.bin,addr=0x08000000 -d int,guest_errors
Loaded reset SP 0x0 PC 0x0 from vector table
Loaded reset SP 0xffffffff PC 0xffffffff from vector table
Taking exception 3 [Prefetch Abort] on CPU 0
...at fault address 0xfffffffe
...with CFSR.IACCVIOL
...BusFault with BFSR.STKERR
...taking pending nonsecure exception 3
...loading from element 3 of non-secure vector table at 0xc
```

SP와 PC가 모두 0xFFFFFFFF로 읽히고, 첫 명령 fetch부터 fault(IACCVIOL)가 나며, 그 예외의 stacking도 실패합니다(BFSR.STKERR). 덤프의 첫 두 word가 0xFFFFFFFF면 이 상태이고, 이때는 코드를 볼 필요 없이 flash 쓰기부터 다시 합니다.

## Step 6 — Boot 핀

DS8626 2.2.13절에 따르면 STM32F405/407은 시작할 때 boot 핀으로 user Flash, system memory, embedded SRAM 중 하나에서 부팅합니다. system memory에는 USART1(PA9/PA10)·USART3·CAN2·USB OTG FS(DFU)로 flash를 다시 쓰는 boot loader가 있습니다. 0번지 영역(0x0000_0000~0x000F_FFFF)도 이 선택에 따라 Flash·system memory·SRAM으로 alias됩니다(DS8626 memory map).

- [ ] BOOT0가 의도한 레벨로 고정되어 있는가(떠 있지 않은가)

BOOT0가 떠 있으면 전원을 켤 때마다 읽히는 값이 달라 user Flash와 system memory 중 어디로 부팅할지 정해지지 않습니다.

option byte의 RDP 레벨 2는 HAL v1.8.6 주석대로 되돌릴 수 없습니다(10-02).

## Step 7 — Reset_Handler와 SystemInit

startup 코드는 `.data`·`.bss`를 준비하고, 클럭을 설정하고, `main()`으로 갑니다. 1-02의 168 MHz 설정 코드는 HSE를 켠 뒤 `HSERDY`를 기다립니다. HSE가 발진하지 않으면 여기서 멈추는데, 같은 상황을 QEMU에서 만들었습니다. QEMU의 이 머신은 RCC ready 비트를 세우지 않으므로 HSE가 영원히 준비되지 않은 보드와 같습니다. 실행 중인 QEMU에 LLDB를 붙여 멈춘 곳을 봤습니다.

```bash
qemu-system-arm -M netduinoplus2 -nographic -semihosting-config enable=on,target=native \
  -kernel clock.elf -gdb tcp::3344 &
lldb --batch -o "target create clock.elf" -o "gdb-remote 3344" -o "bt" \
  -o "memory read -s4 -fx -c1 0x40023800"
```

```text
* thread #1, stop reason = signal SIGTRAP
       frame #0: 0x080002a8 clock.elf`clock_168mhz at clock168.c:14:12
   13  	    RCC->CR |= RCC_CR_HSEON;
-> 14  	    while (!(RCC->CR & RCC_CR_HSERDY)) { }
(lldb) bt
   * frame #0: 0x080002a8 clock.elf`clock_168mhz at clock168.c:14:12
     frame #1: 0x0800031c clock.elf`main at main.c:5:3
     frame #2: 0x0800008a clock.elf`Reset_Handler at startup.c:10:3
(lldb) memory read -s4 -fx -c1 0x40023800
0x40023800: 0x00010000
```

0x40023800은 `RCC->CR`이고 0x00010000은 bit 16 `HSEON`만 선 값입니다. bit 17 `HSERDY`가 0이라 루프를 벗어나지 못합니다(비트 위치는 `cmsis_device_f4`의 `RCC_CR_HSEON_Pos`·`RCC_CR_HSERDY_Pos`). 보드에서 같은 모습이 나오면 Step 3의 크리스털로 돌아갑니다. 이런 대기 루프에 timeout을 두고, 실패하면 HSI로 계속 동작하며 오류를 알리게 하면 부팅이 멈추지 않습니다.

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

LED가 깜빡이면 main 루프까지 왔습니다. 켜지지도 않으면 `SystemClock_Config()` 이전에서, 켜지기만 하고 깜빡이지 않으면 `HAL_Delay()`가 쓰는 SysTick 인터럽트가 돌지 않는 경우를 의심합니다. HAL v1.8.6 `stm32f4xx_hal.c`는 SysTick을 `HAL_Delay()`의 time base로 쓰고 1 ms마다 인터럽트를 내도록 설정한다고 적습니다.

## Bootloader로 다시 쓰기

디버거로 붙을 수 없을 때는 Step 6의 system memory boot loader를 씁니다. USB DFU라면 BOOT0를 system memory 쪽으로 두고 reset한 뒤 dfu-util로 씁니다. dfu-util 설명서의 DfuSe 예와 같은 형식입니다(`-s` 주소 뒤의 `:leave`는 쓰기를 마치고 DFU 모드를 떠나라는 수식어).

```bash
dfu-util -a 0 -s 0x08000000:leave -D firmware.bin
```

## main 진입 직후 reset이 반복될 때

reset이 반복되면 무엇이 reset을 일으켰는지부터 봅니다. STM32F4의 `RCC->CSR`에는 reset 원인 플래그가 있고, `RMVF`로 지웁니다(비트 이름은 `cmsis_device_f4` 헤더).

```c
if (RCC->CSR & RCC_CSR_IWDGRSTF) printf("IWDG reset!\n");
if (RCC->CSR & RCC_CSR_PINRSTF)  printf("Pin reset\n");
RCC->CSR |= RCC_CSR_RMVF;    // clear
```

watchdog이 원인이라면 timeout 계산을 다시 봅니다. HAL v1.8.6 `stm32f4xx_hal_iwdg.c`는 IWDG가 LSI로 돌고, 32 kHz LSI 기준 timeout이 약 125 µs~32.7 s이며, LSI 주파수 편차 때문에 timeout이 달라진다고 적습니다. DS8626 Table 34의 LSI는 최소 17, 대표 32, 최대 47 kHz입니다. 32 kHz 기준으로 100 ms를 잡은 timeout은 LSI가 47 kHz이면 100 × 32/47 = 68 ms로 짧아집니다. 초기화가 그보다 오래 걸리면 매번 reset됩니다.

## 자주 보는 함정

> 보드 한 장으로만 확인

같은 firmware로 동작하는 보드와 안 되는 보드를 나란히 놓으면 Step 1~3의 측정값을 비교할 기준이 생깁니다.

> 회로도만 보고 판단

회로도와 실제 PCB는 다를 수 있습니다. 크리스털 부하 커패시터와 BOOT0 저항은 실물에서 값과 납땜을 확인합니다.

> SWD 핀에 다른 회로를 연결

PA13·PA14는 reset 직후 SWDIO·SWCLK입니다(DS8626 Table 7). 여기에 LED나 다른 출력을 달면 디버거 신호와 부딪칩니다.

## 정리

- 전원 → reset → 클럭 → 디버거 → flash → boot 핀 → SystemInit → main 순으로 좁힙니다.
- vector table 첫 두 word가 0xFFFFFFFF면 빈 flash입니다. QEMU에서 첫 fetch부터 IACCVIOL과 STKERR가 났습니다.
- HSE를 기다리는 루프에서 멈추면 `RCC->CR`이 0x00010000(HSEON만)입니다. QEMU + LLDB로 그 위치를 직접 봤습니다.
- STM32F405/407의 boot loader는 USART1·USART3·CAN2·USB DFU로 flash를 다시 씁니다(DS8626 2.2.13).
- reset 반복은 `RCC->CSR`로 원인을 보고, IWDG timeout은 LSI 17~47 kHz 편차까지 넣어 잡습니다.

다음 편은 **인터럽트 누락/중복 진단**입니다.

## 관련 항목

- [10-04: 하드폴트 분석](/blog/embedded/modern-recipes/part10-04-hardfault-analysis)
- [10-05: UART 안 찍힐 때](/blog/embedded/modern-recipes/part10-05-uart-not-printing)
- [10-07: 인터럽트 누락/중복](/blog/embedded/modern-recipes/part10-07-interrupt-debugging)
