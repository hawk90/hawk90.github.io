---
title: "Bare-metal 프로파일링 — GPIO·DWT·SysTick·ITM 활용"
slug: "embedded/performance-engineering/part5-07-baremetal-profiling"
date: 2026-04-27T09:06:00
description: "OS도 perf도 없는 환경에서 GPIO, DWT cycle counter, SysTick, ITM으로 측정하기."
series: "Embedded Performance Engineering"
seriesOrder: 46
tags: [bare-metal, dwt, gpio, cycle-counter, itm, systick]
topics: ["embedded"]
---

## 한 줄 요약

> **"MCU에서 시간을 재는 길은 둘입니다. 핀을 흔들어 바깥에서 보거나, 코어 안의 cycle counter를 읽습니다."** 다만 cycle counter는 아키텍처상 *선택 사항*이고, QEMU 11.1.3 `mps2-an386`에서는 돌지 않았습니다.

## 어떤 문제를 푸는가

Cortex-M0/M3/M4 같은 작은 MCU에는 OS도 없고 perf 같은 도구도 없습니다. printf로 시간을 찍으면 UART 출력 자체가 측정 대상보다 길어지기 쉽습니다. 115200 baud UART는 8N1 기준 한 글자에 10 bit이므로 "start\n" 여섯 글자만 해도 약 0.52 ms가 걸립니다. ETM은 외부 probe가 있어야 하고([5-06](/blog/embedded/performance-engineering/part5-06-arm-ds-lauterbach)), Cortex-M0처럼 trace 블록이 아예 없는 코어도 있습니다.

그래서 남는 방법은 두 가지입니다. 하나는 GPIO 핀을 toggle하고 오실로스코프나 로직 분석기로 바깥에서 재는 것으로, 마라톤 결승선에 서서 스톱워치를 누르는 쪽에 가깝습니다. 다른 하나는 코어 안의 DWT cycle counter를 두 번 읽어 차이를 내는 것으로, 선수 손목의 GPS 시계를 보는 쪽입니다. 이 글은 두 방법과 SysTick·ITM·SystemView를 Arm 아키텍처 매뉴얼과 벤더 문서로 정리하고, 실제로 돌릴 수 있는 부분은 QEMU와 크로스 컴파일러로 확인합니다.

> **실행 환경** QEMU 11.1.3 `mps2-an386`(Cortex-M4) 머신, arm-none-eabi-gcc 16.2.0, host는 Apple M2 Pro(Apple clang 21.0.0). 실제 보드·오실로스코프·J-Link는 쓰지 않았습니다. 그래서 GPIO edge 폭, SWO 수신, SystemView capture 결과는 싣지 않았습니다.

## GPIO Toggle + 오실로스코프 — 외부 관찰

측정하려는 구간 앞뒤에서 핀을 올리고 내리면, 스코프 화면의 high 폭이 곧 그 구간의 길이입니다. STM32F4라면 GPIO의 BSRR 레지스터를 씁니다. ST의 [`stm32f407xx.h`](https://github.com/STMicroelectronics/cmsis-device-f4/blob/master/Include/stm32f407xx.h)는 BSRR을 offset 0x18의 "GPIO port bit set/reset register"로 정의하고, 하위 16 bit(`GPIO_BSRR_BS0_Pos` = 0)가 set, 상위 16 bit(`GPIO_BSRR_BR0_Pos` = 16)가 reset입니다.

```c
/* STM32F4 예시 */
#define MEASURE_PIN GPIO_PIN_5
#define MEASURE_PORT GPIOA

static inline void measure_high(void) {
    MEASURE_PORT->BSRR = MEASURE_PIN;       /* BS5: PA5 high */
}
static inline void measure_low(void) {
    MEASURE_PORT->BSRR = MEASURE_PIN << 16; /* BR5: PA5 low */
}

void critical_section(void) {
    measure_high();
    do_work();
    measure_low();
}
```

같은 패턴(GPIOA 주소 0x40020000을 직접 쓴 버전)을 `-mcpu=cortex-m4 -O2`로 컴파일하면, 핀 하나를 바꾸는 데 `str` 한 번이면 됩니다. 읽고 고쳐 쓰는(read-modify-write) `ldr`이 없으므로 인터럽트가 중간에 끼어 다른 핀을 덮어쓸 여지도 없습니다.

```text
00000000 <critical_section>:
   0:	push	{r4, lr}
   2:	ldr	r4, [pc, #16]	@ (14 <critical_section+0x14>)
   4:	movs	r3, #32
   6:	str	r3, [r4, #24]
   8:	bl	0 <do_work>
   c:	mov.w	r3, #2097152	@ 0x200000
  10:	str	r3, [r4, #24]
  12:	pop	{r4, pc}
  14:	.word	0x40020000
```

`#24`가 BSRR offset 0x18이고, 32(`1 << 5`)가 BS5, 0x200000(`1 << 21`)이 BR5입니다. 스코프에 보이는 high 폭에는 `do_work()`뿐 아니라 첫 `str`이 버스를 지나 핀에 닿는 시간과 `mov.w`·두 번째 `str`까지 들어갑니다. 그래서 `do_work()`를 빈 함수로 바꾼 기준 폭을 먼저 재 두고 빼는 것이 이 방법의 보정 절차입니다.

이 방법의 장점은 다음과 같습니다.

- 측정 장비가 코어와 독립적이라, 코어가 멈추거나 clock이 바뀌어도 시간축이 흔들리지 않습니다.
- 핀 여러 개를 쓰면 ISR 진입과 main loop를 같은 화면에 겹쳐 볼 수 있습니다.
- 외부 입력 신호(예: CAN 수신 핀)를 같은 채널에 걸면 "신호가 들어온 순간부터 ISR이 핀을 올린 순간까지"를 그대로 잽니다. 이것은 코어 안 counter로는 잴 수 없는 구간입니다.

분해능은 장비의 표본 간격이 정합니다. 100 MHz로 샘플링하는 로직 분석기라면 표본 간격은 10 ns입니다.

## DWT Cycle Counter — 구현 확인

DWT(Data Watchpoint and Trace) 안의 `CYCCNT`는 코어 clock마다 1씩 오르는 32-bit counter입니다. 중요한 점은 이것이 *선택 사항*이라는 것입니다. [ARMv7-M Architecture Reference Manual](https://developer.arm.com/documentation/ddi0403/latest/)(DDI 0403E.b) C1.8.3절은 첫 문장에서 "CYCCNT is an optional free-running 32-bit cycle counter"라고 적고, 구현됐다면 `DWT_CTRL.NOCYCCNT`(bit 25)가 0으로 읽힌다고 정합니다. 같은 절에 따르면 overflow 시 0으로 돌아가고, 코어가 Debug state로 halt되어 있는 동안은 증가하지 않습니다. 즉 디버거로 breakpoint에 멈췄던 구간은 cycle 수에 들어가지 않습니다.

Armv6-M 쪽은 아예 없습니다. [SEGGER SystemView User Guide](https://www.segger.com/downloads/jlink/UM08027)(UM08027, 소프트웨어 4.10) 4.6.3.1절은 "Cortex-M0, Cortex-M0+ and Cortex-M1 do not have a cycle count register"라고 적고, 대신 SysTick으로 timestamp를 만들라고 안내합니다.

CMSIS의 [`core_cm4.h`](https://github.com/ARM-software/CMSIS_6/blob/main/CMSIS/Core/Include/core_cm4.h)가 정의하는 비트 이름으로 counter를 켜는 코드는 다음과 같습니다. ARMv7-M ARM은 `DEMCR.TRCENA`(bit 24)를 "Global enable for all DWT and ITM features"로 정의하므로 이것부터 켭니다.

```c
#include "core_cm4.h"

void dwt_init(void) {
    CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;  /* trace 활성화 */
    DWT->CYCCNT = 0;
    DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;             /* cycle counter on */
}

static inline uint32_t dwt_now(void) {
    return DWT->CYCCNT;
}
```

측정은 두 번 읽어 빼는 것이 전부입니다.

```c
uint32_t start = dwt_now();
do_work();
uint32_t elapsed = dwt_now() - start;

float us = (float)elapsed / (SystemCoreClock / 1000000.0f);
```

168 MHz에서 한 cycle은 약 5.95 ns이고, 32-bit counter는 2³² / 168 MHz ≈ 25.57초마다 한 바퀴 돕니다. Unsigned 뺄셈은 실제 경과가 한 바퀴 미만일 때 wrap을 포함해 맞습니다. 여러 바퀴를 돌았거나 debug halt로 counter가 멈췄다면 두 값만으로는 복원할 수 없습니다.

### QEMU에서는 CYCCNT가 돌지 않는다

보드가 없을 때 QEMU로 먼저 확인하고 싶어집니다. QEMU 11.1.3의 `mps2-an386`(Cortex-M4)에서 위 초기화를 그대로 하고 레지스터를 semihosting으로 찍어 봤습니다(소스는 아래 명령의 `fw.c`, vector table 두 칸짜리 최소 펌웨어).

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O1 -nostdlib -ffreestanding -T link.ld fw.c -o fw.elf
qemu-system-arm -M mps2-an386 -nographic -semihosting-config enable=on,target=native -kernel fw.elf
```

```text
DWT_CTRL before = 0x00000000
DWT_CTRL after  = 0x00000000
CYCCNT start    = 0x00000000
CYCCNT end      = 0x00000000
SYST_RVR        = 0x00ffffff
SYST_CVR start  = 0x00000000
SYST_CVR end    = 0x00fff98e
SYST_RVR(write 0xffffffff) = 0x00ffffff
ITM_TPR(write all ones) = 0x00000000
```

`CYCCNTENA`를 써도 `DWT_CTRL`은 0으로 남고 `CYCCNT`는 1000번 도는 루프 앞뒤에서 둘 다 0입니다. 이 QEMU 머신은 DWT를 0으로 읽히고 쓰기는 무시되는 레지스터로만 둡니다. 함정은 `NOCYCCNT`도 0으로 읽힌다는 점입니다. 아키텍처 규칙대로 "NOCYCCNT가 0이면 counter가 있다"고만 판정하는 코드는 여기서 counter가 있다고 오판합니다. SystemView 매뉴얼 4.3절의 초기화 예제도 `if ((DWT_CTRL & NOCYCCNT_BIT) == 0)`만 봅니다. 그러니 초기화 뒤에 `CYCCNT`를 두 번 읽어 실제로 증가하는지 확인하는 한 줄을 넣는 편이 안전합니다.

### 컴파일러가 측정 구간을 바꾸는가

`DWT_CYCCNT`는 `volatile`이라 두 읽기의 순서는 지켜지지만, 그 사이의 일반 연산까지 묶이는 것은 아닙니다. 체크섬 루프를 두 읽기 사이에 둔 함수를 `-O2`로 컴파일해 봤습니다.

```c
uint32_t measure(const uint8_t *buf, int len) {
    uint32_t start = DWT_CYCCNT;
    uint32_t r = checksum(buf, len);   /* static inline, s = s*31 + p[i] */
    uint32_t end = DWT_CYCCNT;
    result = r;
    return end - start;
}
```

arm-none-eabi-gcc 16.2.0의 출력에서 첫 `ldr.w ip, [r3, #4]`(CYCCNT, 0xE0001004)와 두 번째 `ldr r0, [r1, #4]` 사이에 체크섬 루프가 그대로 남았습니다. 루프 결과를 `asm volatile("" : "+r"(r) : : "memory")`로 묶은 버전도 명령열이 똑같았습니다. 다만 `result = r`의 `str`은 두 번째 CYCCNT 읽기 *뒤*로 배치됐습니다. 결과를 메모리에 쓰는 비용은 측정에 안 들어간다는 뜻입니다. 이 배치는 이 컴파일러·이 코드에서 관찰한 것이므로, 측정 함수를 바꾸면 `objdump -d`로 두 `ldr` 사이를 다시 봅니다.

## SysTick — 24-bit Counter Alternative

DWT가 없는 코어에서는 SysTick을 씁니다. ARMv7-M ARM B3.3절은 SysTick을 모든 ARMv7-M 구현이 갖춰야 하는 "24-bit clear-on-write, decrementing, wrap-on-zero counter"로 정의합니다. 위 QEMU 출력에서도 `SYST_RVR`에 0xffffffff를 쓰면 0x00ffffff만 남았습니다. CMSIS의 `SysTick_LOAD_RELOAD_Msk`도 0xFFFFFF입니다. Debug state로 halt된 동안에는 SysTick도 줄지 않습니다.

SysTick은 OS tick에 이미 쓰이고 있을 수 있으니 reload·clock·enable 상태를 먼저 확인합니다. 아래는 레지스터를 만지지 않는 **down-counter 차이 계산 함수**입니다. 실제 경과가 한 주기 미만이고 두 읽기 사이 reload·clock이 바뀌지 않았다는 전제가 필요합니다.

```c title="down-counter.c"
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

bool elapsed_down(uint32_t start, uint32_t end, uint32_t reload,
                  uint32_t *elapsed)
{
    if (elapsed == NULL || reload > 0x00ffffffu ||
        start > reload || end > reload)
        return false;
    uint32_t period = reload + 1u;
    *elapsed = start >= end ? start - end : start + period - end;
    return true;
}
```

Host(Apple clang 21.0.0, `-O2 -Wall`)에서 경계 사례를 돌린 결과입니다.

```text
start=0x0003e8 end=0x000190 reload=0xffffff -> ok=1 elapsed=600
start=0x000064 end=0xfffff0 reload=0xffffff -> ok=1 elapsed=116
start=0x000000 end=0xfff98e reload=0xffffff -> ok=1 elapsed=1650
start=0x000005 end=0x0003de reload=0x0003e7 -> ok=1 elapsed=15
start=0x0001f4 end=0x0001f4 reload=0x0003e7 -> ok=1 elapsed=0
start=0x0003e8 end=0x000000 reload=0x0003e7 -> ok=0 elapsed=0
start=0x000000 end=0x000000 reload=0x1000000 -> ok=0 elapsed=0
```

같은 값은 0 tick으로 나오지만, 실제로 한 주기를 꽉 채워 돌았는지는 두 값만으로 구별할 수 없습니다. 72 MHz에서 reload를 최대로 두면 한 주기는 2²⁴ / 72 MHz ≈ 233 ms입니다.

QEMU의 SysTick 값은 cycle 측정으로 쓰면 안 됩니다. 같은 `fw.elf`를 다섯 번 돌리자 루프 구간의 SysTick 차이가 1050, 300, 0, 2100, 0 tick으로 흩어졌습니다. QEMU의 timer는 명령 수가 아니라 host 시간으로 흐르기 때문입니다. `-icount shift=0`을 주면 다섯 번 모두 150 tick으로 같아집니다. 에뮬레이터로는 "counter 차이 계산 코드가 맞는가"까지만 확인하고, 실제 시간은 보드에서 잽니다.

## ITM — Instrumentation Trace Macrocell

ITM은 펌웨어가 stimulus port 레지스터에 값을 쓰면 그것을 trace packet으로 바꿔 SWO 핀이나 TPIU로 내보내는 블록입니다. 우체통에 엽서를 넣으면 우체부(probe)가 가져가는 구조입니다. ARMv7-M ARM C1.7.1·C1.7.3절의 규칙은 다음과 같습니다.

- Stimulus port는 최대 256개이고, 실제 개수는 8의 배수로 구현마다 정해집니다. 개수는 `ITM_TPR`에 모두 1을 쓰고 1로 남은 bit를 세면 알 수 있습니다(bit 하나가 port 8개).
- ITM이 꺼져 있거나 없어도 stimulus port에 쓰기가 BusFault를 내면 안 됩니다(C1.7.1). 덕분에 ITM 출력 코드를 출시 펌웨어에 남겨도 BusFault로 멈추지는 않습니다. 다만 아래에서 볼 FIFOREADY 대기 루프는 별개 문제입니다.
- `DEMCR.TRCENA`가 0이면 stimulus port는 읽기 값이 UNKNOWN이고 쓰기는 무시됩니다(C1.7.3).
- Stimulus port를 읽으면 bit 0이 `FIFOREADY`입니다. 0이면 FIFO가 가득 찬 상태입니다(C1.7.3).

QEMU `mps2-an386`에서 `ITM_TPR`에 모두 1을 써 봤더니 0이 읽혔습니다. 이 머신에는 ITM이 구현되어 있지 않다는 뜻입니다.

함정은 FIFO가 비기를 기다리는 루프입니다. CMSIS `core_cm4.h`(CMSIS_6 main, 2026-11-12 기준)의 `ITM_SendChar()`는 ITM과 port 0이 켜져 있으면 `while (ITM->PORT[0U].u32 == 0UL) { __NOP(); }`로 FIFOREADY를 무한정 기다립니다. probe가 SWO를 빼 가지 않는 상황이면 이 루프가 측정 대상 코드를 붙잡아 둡니다. 시간 측정 경로에서는 FIFOREADY를 한 번만 보고 가득 찼으면 버리는(drop) 방식이 낫습니다.

## SEGGER SystemView — RTT 기반 RTOS Trace

SystemView는 RTOS 이벤트를 타임라인으로 보여 주는 도구입니다. [SEGGER SystemView User Guide](https://www.segger.com/downloads/jlink/UM08027)(UM08027, 소프트웨어 4.10)에서 확인한 사실은 다음과 같습니다.

- Target 쪽에는 SYSTEMVIEW와 RTT 모듈을 넣습니다. 둘을 합친 ROM은 2 KByte 미만이고, 연속 기록에는 RAM 약 600 byte면 된다고 1.1.2절이 적습니다.
- 같은 절의 오버헤드 수치는 200 MHz Cortex-M4 기준으로 이벤트 하나에 1 µs 미만, 초당 10,000 이벤트면 1% 미만입니다. 벤더 측정이며 이 글에서 재현하지는 않았습니다.
- RTT는 실행 중에 debug 인터페이스로 메모리를 읽을 수 있어야 동작합니다. 1.1.3절은 이것이 Cortex-M0·M0+·M1·M3·M4·M7·M23·M33에서 "generally supported"라고 적습니다.
- Timestamp는 Cortex-M3/4/7에서 DWT cycle counter를 씁니다(4.5.1.1절). Cortex-M0/M0+/M1은 cycle counter가 없어 SysTick 기반 `SEGGER_SYSVIEW_X_GetTimestamp()`를 직접 구현해야 합니다(4.6.3.1절).
- 기록 버퍼(`SEGGER_SYSVIEW_RTT_BUFFER_SIZE`) 기본값은 1024 byte입니다. 4.5.2.1절은 시스템이 부하에 따라 초당 10~200 kByte를 만든다고 보고, single-shot이나 post-mortem 기록에는 최소 8 kByte를 권합니다.

함수 실행 시간 측정은 Performance Marker로 합니다. `SEGGER_SYSVIEW_MarkStart(unsigned MarkerId)`와 `SEGGER_SYSVIEW_MarkStop()`으로 구간을 감싸면 SystemView의 Events 목록에 실행 시간과 횟수가 나옵니다(5.1절). ISR은 `SEGGER_SYSVIEW_RecordEnterISR()`·`SEGGER_SYSVIEW_RecordExitISR()`를 ISR 앞뒤에서 호출해야 기록됩니다. 이 글에서는 J-Link와 보드가 없어 SystemView를 실행하지 않았습니다.

## ISR 경계의 측정

ISR 안에서 DWT를 읽거나 핀을 올리면, 그 값은 ISR의 *첫 명령*이 실행된 시점입니다. 그 앞에는 하드웨어가 하는 일이 있습니다. ARMv7-M ARM B1.5.6절에 따르면 예외가 들어오면 하드웨어가 xPSR·ReturnAddress·LR·R12·R3·R2·R1·R0 여덟 word를 스택에 쌓은 뒤에야 handler로 갑니다. 같은 절은 Floating-point extension을 구현한 코어라면 여기에 더해 FP 상태를 스택에 쌓거나 그 공간을 예약할 수 있다고 적습니다. 그래서 "외부 신호 → 스태킹 → ISR 첫 명령 → ISR 본문 → 복귀"를 따로 정의해야 합니다. 첫 구간은 외부 신호와 GPIO를 같은 스코프에 걸어야 보이고, ISR 본문은 DWT로 잴 수 있습니다. 관찰한 최대값은 시험 조건에서의 표본 최대이지 WCET가 아닙니다.

## 측정 — 정확도 비교

| 방법 | 근거 | 분해능 | 한 바퀴/용량 | 이 글에서 확인 |
|------|------|--------|--------------|----------------|
| GPIO + scope | 핀 edge당 `str` 한 번 | 장비 표본 간격(100 MHz면 10 ns) | 장비 메모리 | 명령열만(컴파일) |
| DWT CYCCNT | ARMv7-M C1.8.3, 선택 사항 | 1 core cycle | 2³² cycle(168 MHz에서 약 25.57초) | QEMU에선 0 고정 |
| SysTick | ARMv7-M B3.3, 필수 | 1 tick | 2²⁴ tick(72 MHz에서 약 233 ms) | 24-bit mask, 차이 함수 |
| ITM/SWO | ARMv7-M C1.7 | packet 단위 | FIFO·SWO 대역 | QEMU에선 미구현 |
| SystemView RTT | UM08027 | DWT 또는 SysTick | RTT 버퍼(기본 1024 byte) | 실행 안 함 |
| ETM | 5-06 참고 | cycle accurate 시 cycle | probe 메모리 | 실행 안 함 |

GPIO와 DWT를 같이 쓰면 서로의 빈 곳을 메웁니다. GPIO는 외부 신호부터 ISR까지를, DWT는 ISR 본문과 함수 실행 시간을 봅니다.

## 자주 보는 함정과 안티패턴

> ⚠️ printf로 시간 측정

```c
printf("start\n");   /* 115200 8N1: 6 chars x 10 bit = 약 0.52 ms */
do_work();
printf("end\n");
```

측정하려는 함수가 수십 µs짜리라면 printf 쪽이 몇 배 더 깁니다. 측정은 GPIO나 DWT로, 로깅은 측정 구간 밖으로 분리합니다.

> ⚠️ Cache가 있는 코어에서 평균만 보기

```c
for (int i = 0; i < 100; i++) {
    uint32_t t0 = dwt_now();
    work();
    cycles[i] = dwt_now() - t0;
}
```

cache가 있는 코어에서는 첫 호출이 cache miss를 겪습니다. 평균 하나로 뭉개지 말고 첫 값과 나머지를 나눠 보고, 배열을 통째로 남겨 분포를 봅니다.

> ⚠️ NOCYCCNT만 보고 counter가 있다고 판정

QEMU에서 본 것처럼 `NOCYCCNT`가 0인데도 counter가 증가하지 않는 환경이 있습니다. 초기화 뒤 두 번 읽어 값이 늘어나는지 확인합니다.

> ⚠️ ITM_SendChar를 시간 측정 경로에 두기

CMSIS `ITM_SendChar()`는 FIFO가 빌 때까지 무한정 기다립니다. probe가 연결되지 않은 상태에서 ITM과 port가 켜져 있으면 그 자리에서 멈춥니다.

> ⚠️ 32-bit CYCCNT의 wrap-around 무시

```c
uint32_t elapsed = end - start;          /* unsigned 뺄셈은 한 바퀴 미만이면 wrap-safe */
```

`int32_t`로 캐스팅하면 2³¹ cycle을 넘는 구간이 음수로 나옵니다. 또 debug halt 중에는 counter가 멈추므로, breakpoint를 거쳐 간 측정값은 실제 경과 시간보다 작습니다.

## 정리

- GPIO toggle은 핀 edge당 `str` 한 번이고, 외부 신호부터 ISR까지 코어 밖의 구간을 잴 수 있는 유일한 방법입니다.
- DWT `CYCCNT`는 ARMv7-M에서 선택 사항이고 Cortex-M0/M0+/M1에는 없습니다. Debug halt 중에는 멈춥니다.
- QEMU 11.1.3 `mps2-an386`에서는 DWT·ITM이 0으로만 읽히고, SysTick 차이는 `-icount` 없이는 실행마다 흩어집니다.
- SysTick은 ARMv7-M 필수의 24-bit down counter라 72 MHz 최대 reload에서 약 233 ms가 한 주기입니다.
- ITM 출력은 FIFOREADY를 기다리는 루프가 측정 대상을 붙잡지 않도록 drop 방식으로 씁니다.
- SystemView의 벤더 수치는 200 MHz Cortex-M4에서 이벤트당 1 µs 미만이며, M0 계열은 SysTick timestamp를 직접 구현해야 합니다.

다음 편은 **Nsight Systems** — GPU와 NPU가 포함된 시스템 분석.

## 관련 항목

- [5-06: ARM DS / Lauterbach](/blog/embedded/performance-engineering/part5-06-arm-ds-lauterbach)
- [5-08: Nsight Systems](/blog/embedded/performance-engineering/part5-08-nsight)
- [Practical RTOS Internals 2-11: Tracing·Observability](/blog/embedded/rtos/practical-internals/part2-11-tracing-observability)
- [Embedded Debugging: Trace 비교](/blog/tools/debugging/embedded/chapter06-trace) — RTT·ITM·SWO·ETM 중 어느 채널을 쓸지
