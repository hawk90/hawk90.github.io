---
title: "RTOS 포팅 가이드 — 새 아키텍처에 옮기는 절차"
slug: "embedded/rtos/practical-internals/part5-04-porting"
date: 2026-05-08T09:49:00
description: "FreeRTOS와 Zephyr의 port 계층을 따라가며 새 아키텍처에 RTOS를 옮기는 절차를 정리합니다. initial stack frame, context switch assembly, tick source, critical section primitive까지 한 번에 잡습니다."
series: "Practical RTOS Internals"
seriesOrder: 49
tags: [porting, architecture, port-c, context-switch, tick]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> 시작·저장/복원·tick·mask를 출발점으로 ABI와 board integration을 검증합니다. — 초기 스택, 스케줄러 시작, 수동 yield, tick, critical section 진입/탈출 그리고 context switch 핸들러입니다.

## 어떤 문제를 푸는가

새 SoC에 공식 BSP가 없거나, 사내 ASIC에 RTOS를 올리거나, 지원 목록에 없는 RISC-V core에 옮겨야 할 때가 있습니다. 이때 RTOS 본체(`tasks.c`, `queue.c`)는 그대로 두고 *port layer*만 새로 씁니다. 이사할 때 가구는 그대로 옮기고 콘센트 어댑터만 새 집에 맞추는 것과 같습니다.

이번 편의 목표는 두 가지입니다. 첫째, port layer가 RTOS와 아키텍처 사이에 *정확히 어느 경계*를 그리는지 정리합니다. 둘째, FreeRTOS Cortex-M port를 기준으로 *최소 여섯 가지 구현물*을 추리고, RISC-V와 Cortex-A로 확장될 때 무엇이 추가되는지를 봅니다.

이 글은 FreeRTOS V11.2.0(commit `0adc196d`) ARM_CM4F port를 기준으로 합니다. 새 architecture port를 쓰지는 않았지만, 이 시리즈의 QEMU 실행 자체가 작은 "board 포팅"이었습니다. 기존 `ARM_CM3`·`ARM_CM4F` port를 QEMU `mps2-an385`·`mps2-an386`에 올리려고 vector table, startup, linker script, `FreeRTOSConfig.h`를 직접 썼고, 그때 부딪힌 문제를 아래에 함께 적습니다(`arm-none-eabi-gcc` 16.2.0, QEMU 11.1.3).

## 포팅 대상 — 여섯 가지 함수

1. `pxPortInitialiseStack` — 초기 stack frame을 만들어 둠
2. `xPortStartScheduler` — 첫 task로 진입
3. `portYIELD()` — 수동 reschedule trigger (CM4F에서는 C 함수가 아니라 `portmacro.h`의 매크로)
4. `xPortSysTickHandler` — tick interrupt 진입점
5. `vPortEnterCritical` — IRQ disable + nesting
6. `vPortExitCritical` — IRQ enable + nesting

여기에 Context switch 본체(PendSV·trap·SWI 어셈블리)가 추가됩니다.

여섯 항목 말고도 `portmacro.h`에 type(`StackType_t`, `TickType_t`), 정렬(`portBYTE_ALIGNMENT`), mask 매크로가 있어야 하고, board 쪽에는 vector table·startup·linker script가 있어야 합니다. 이 harness에서 board 쪽을 쓰며 필요했던 것은 이렇습니다.

| 항목 | harness에서 한 일 |
| --- | --- |
| vector table | SVC·PendSV·SysTick 자리에 port의 `vPortSVCHandler`·`xPortPendSVHandler`·`xPortSysTickHandler`를 직접 넣음 |
| startup | `.data` 복사, `.bss` 0 채우기 후 `main()` (C++ 전역 constructor 호출은 없음, 4-04) |
| linker script | flash 0x0, RAM 0x20000000, `_estack`을 RAM 끝에 |
| config | `configPRIO_BITS 3`, `configMAX_SYSCALL_INTERRUPT_PRIORITY (2 << 5)`, `configASSERT` 정의 |
| 출력 | libc가 없어 `printf`·`memcpy`를 직접 쓰고 semihosting으로 출력 |

## 1. 초기 스택 프레임

V11.2.0 ARM_CM4F의 `pxPortInitialiseStack()`(`port.c:205-230`)은 PendSV가 복원하는 순서 그대로 frame을 만듭니다. 저장 SP부터 R4~R11(8 word), EXC_RETURN, 그 위에 hardware frame R0~R3·R12·LR·PC·xPSR입니다(5-01). 예전 판의 예는 EXC_RETURN slot이 빠져 있었습니다. 아래 fixture는 그 배치를 18 word 배열로 흉내 냅니다.

```c title="m4-frame-fixture.c"
#include <stdint.h>
/* Layout 비교용 fixture. MCU port나 실제 실행 가능한 task stack 생성기가 아님. */
void make_m4_basic_fixture(uint32_t storage[18], uint32_t pc,
                           uint32_t argument, uint32_t task_return)
{
    for (unsigned i = 0; i < 18; ++i) storage[i] = 0;
    storage[8] = UINT32_C(0xfffffffd); /* EXC_RETURN */
    storage[9] = argument;           /* R0 */
    storage[14] = task_return;       /* task LR */
    storage[15] = pc & UINT32_C(0xfffffffe);
    storage[16] = UINT32_C(0x01000000); /* xPSR Thumb state */
}
```

이 fixture가 맞는지 실제 함수와 비교했습니다. `mps2-an386`에서 `0xa5a5a5a5`로 채운 배열에 진짜 `pxPortInitialiseStack(top, entry, (void *)0x1234)`를 부르고 결과를 찍었습니다.

```text
pxPortInitialiseStack: top=0x20000100 returned sp=0x200000bc (17 words below top)
  sp[ 7]=0xa5a5a5a5
  sp[ 8]=0xfffffffd
  sp[ 9]=0x00001234
  sp[13]=0xa5a5a5a5
  sp[14]=0x00003fe1
  sp[15]=0x00000784
  sp[16]=0x01000000
  sp[17]=0xa5a5a5a5
fixture vs real on initialised slots (8 EXC_RETURN, 9 R0, 14 LR, 15 PC, 16 xPSR): match
```

fixture가 값을 넣는 다섯 칸은 실제와 같았습니다. `sp[14]`의 LR `0x3fe1`은 `prvTaskExitError`(`0x3fe0`)에 Thumb bit를 붙인 값이고, `sp[15]`의 PC `0x784`는 `entry`의 주소입니다. 차이도 보입니다. 실제 port는 R4~R11(`sp[0..7]`)과 R1~R3·R12(`sp[10..13]`)를 건드리지 않아 원래 채워 둔 `0xa5`가 그대로이고(주석 "Save code space by skipping register initialisation"), fixture는 이 칸들을 0으로 채웁니다. `sp[17]`은 `pxTopOfStack--`로 한 칸 비워 둔 자리입니다(`:209-211`, 주석 "Offset added to account for the way the MCU uses the stack on entry/exit of interrupts, and to ensure alignment"). 첫 task는 PendSV가 아니라 `prvPortStartFirstTask()`의 `svc 0`으로 시작합니다.

## 2. 스케줄러 시작

`xPortStartScheduler()`는 handler 설치 검사, priority bit 검사, PendSV·SysTick priority 설정, timer 설정, FPU 켜기를 한 뒤 `prvPortStartFirstTask()`로 들어갑니다. 그 함수는 VTOR(`0xE000ED08`)에서 vector table을 찾아 초기 MSP를 다시 읽어 MSP를 되돌리고, interrupt를 켠 뒤 `svc 0`을 실행합니다(`port.c` `prvPortStartFirstTask()`).

handler 설치 검사가 포팅에서 처음 걸리는 지점입니다. `configCHECK_HANDLER_INSTALLATION`이 1(기본)이면 vector table의 SVC·PendSV 자리가 정확히 port 함수인지 assert합니다(`port.c:342-343`). vendor startup이 자기 이름(`SVC_Handler`)의 wrapper를 거쳐 port 함수로 가게 만든 경우가 여기 걸립니다. SVC 자리에 `b vPortSVCHandler` 한 줄짜리 wrapper를 넣어 봤습니다.

```text
$ (SVC vector -> my_svc_wrapper -> b vPortSVCHandler)
ASSERT FAIL pxVectorTable[ portVECTOR_INDEX_SVC ] == vPortSVCHandler at ../src/freertos-V11.2.0/portable/GCC/ARM_CM4F/port.c:342
```

wrapper가 하는 일이 분기뿐이어도 assert는 주소 비교라 통과하지 못합니다. 소스 주석(`port.c:321-324`)은 wrapper를 거치는 "Indirect Routing"을 쓰는 application은 이 값을 0으로 두라고 하고, 가능하면 direct routing을 쓰라고 적습니다. 이 harness는 vector table에 port 함수를 직접 넣어 이 검사를 통과했습니다.

## 3. 수동 yield

`taskYIELD()`는 CM4F에서 `portYIELD()` 매크로이고, PendSV pending bit를 세웁니다.

```c
/* portable/GCC/ARM_CM4F/portmacro.h:88-97 */
#define portYIELD()                                     \
    {                                                   \
        /* Set a PendSV to request a context switch. */ \
        portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT; \
                                                        \
        /* Barriers are normally not required but do ensure the code is completely \
         * within the specified behaviour for the architecture. */ \
        __asm volatile ( "dsb" ::: "memory" );                     \
        __asm volatile ( "isb" );                                  \
    }
```

원문 주석이 말하듯 barrier는 "normally not required"이지만 architecture 동작 안에 확실히 들게 하려고 넣었습니다. PendSV는 가장 낮은 priority라, 이 매크로를 critical section 안에서 부르면 switch는 critical section을 나간 뒤에 일어납니다(3-09).

## 4. Tick 핸들러

```c
/* portable/GCC/ARM_CM4F/port.c:560-583, trace 매크로 생략 */
void xPortSysTickHandler( void )
{
    portDISABLE_INTERRUPTS();
    {
        if( xTaskIncrementTick() != pdFALSE )
        {
            portNVIC_INT_CTRL_REG = portNVIC_PENDSVSET_BIT;
        }
    }
    portENABLE_INTERRUPTS();
}
```

port가 하는 일은 `xTaskIncrementTick()`을 부르고 그 반환값을 PendSV로 바꾸는 것뿐입니다. 지연된 task를 깨울지, time slice가 끝났는지는 모두 `tasks.c`가 판단합니다. 원문 주석은 SysTick이 가장 낮은 priority라 진입 시 모든 interrupt가 unmask 상태임을 알기에 이전 mask를 저장하지 않는다고 설명합니다. 새 port의 tick interrupt가 가장 낮은 priority가 아니라면 이 가정을 그대로 가져오면 안 됩니다.

## 5/6. Critical Section

CM4F의 task용 critical section은 `vPortEnterCritical()`·`vPortExitCritical()`(`port.c:475-500`)입니다. 진입은 `portDISABLE_INTERRUPTS()`(BASEPRI를 threshold로) 후 `uxCriticalNesting++`, nesting이 1일 때 ISR에서 불렸는지 assert합니다. 나갈 때는 `configASSERT(uxCriticalNesting)`로 짝이 맞는지 본 뒤 감소시키고, 0이 되면 interrupt를 엽니다. 3-09에서 ISR 안의 `xQueueSend()`를 잡은 assert가 바로 진입 쪽 검사였습니다. ISR용은 nesting 대신 이전 BASEPRI를 돌려받는 `ulPortRaiseBASEPRI()` 경로입니다. [Critical section](/blog/embedded/rtos/practical-internals/part3-01-critical-section)에서 더 다룹니다.

## PendSV 핸들러 — 컨텍스트 스위치 본체

정본은 [V11.2.0 ARM_CM4F port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c)의 `xPortPendSVHandler()`입니다. 5-01에서 objdump로 따라간 대로 PSP를 읽어 R4~R11+EXC_RETURN을 저장하고(EXC_RETURN bit 4가 0이면 S16~S31도), BASEPRI를 올린 채 `vTaskSwitchContext()`를 부른 뒤 새 task의 frame을 같은 순서로 되돌립니다. 예전 판의 "30~50 cycle"은 출처가 없어 지웠습니다.

## RISC-V Port — Trap 한 진입점

RISC-V에는 PendSV 같은 별도 exception이 없어 interrupt와 exception이 trap 진입점 하나로 들어옵니다. FreeRTOS V11.2.0 `portable/GCC/RISC-V/portASM.S`는 `mcause`의 최상위 bit로 interrupt와 exception을 나누고(`:337`), synchronous exception이면 `mepc`에 4를 더한 뒤(`:344-345`), mcause가 11(M-mode ECALL)이면 `vTaskSwitchContext()`를 부릅니다(`:371-376`). 즉 이 port에서 yield는 ECALL입니다. 그 밖의 exception은 기본으로 `j .`에서 멈추는 weak handler로 갑니다(`:283-287`, 4-10). [RISC-V context](/blog/embedded/rtos/practical-internals/part2-07-riscv-context)에서 저장·복원 모델을 다뤘습니다. RISC-V port는 이 글에서 돌리지 않았습니다.

## Cortex-A Port — 더 큰 컨텍스트

Cortex-A에는 Cortex-M의 NVIC·SysTick·PendSV가 없어서, port가 interrupt controller(GIC)와 timer를 직접 다뤄야 하고 hardware가 대신 쌓아 주는 exception frame도 없습니다. 5-03에서 돌린 RT-Thread `qemu-vexpress-a9` BSP가 그런 Cortex-A9 port의 예였습니다. 예전 판의 "Cortex-M의 다섯 배 분량" 같은 표현은 근거가 없어 지웠습니다. 이 글에서 Cortex-A FreeRTOS port는 다루지 않았습니다.

## SMP Port — Per-Core current

SMP port는 단일 core port에 `portGET_CORE_ID()`, `portYIELD_CORE()`, task lock·ISR lock 매크로(`portGET_TASK_LOCK()` 등)를 더 제공해야 합니다(4-07). V11.2.0에서 이것을 갖춘 port는 RP2040·XCOREAI·CCRH F1Kx 셋뿐이라 참고할 예가 적습니다.

## Zephyr arch/ 디렉터리

Zephyr v3.7.0에서 CPU architecture 지원은 `arch/` 아래 `arc`, `arm`, `arm64`, `mips`, `nios2`, `posix`, `riscv`, `sparc`, `x86`, `xtensa`에 있습니다(5-02에서 쓴 native_sim은 `posix`입니다). 새 칩이 이미 있는 architecture라면 `arch/`는 그대로 두고 `soc/`와 `boards/`, devicetree, Kconfig를 추가합니다. 5-02에서 본 대로 board 정의는 `boards/<vendor>/<board>/` 구조입니다(예: `boards/st/stm32f4_disco/`).

## Tickless Idle Port

tickless idle은 port의 `vPortSuppressTicksAndSleep()`이 맡습니다. CM4F port에는 이 함수의 weak 구현이 있습니다(`port.c:589`). SysTick을 멈추고 다음 깨어날 시각까지 reload 값을 늘린 뒤 sleep하고, 깨어나면 지나간 tick 수를 `vTaskStepTick()`(`:798`)으로 보정합니다. sleep 직전에는 `eTaskConfirmSleepModeStatus()`로 그사이 ready가 된 task가 없는지 다시 확인해, 있으면 sleep을 포기합니다(`:608`). [Tickless Idle](/blog/embedded/rtos/practical-internals/part2-09-tickless)에서 다뤘고, 이 글에서는 돌리지 않았습니다.

## 새 아키텍처에 옮길 때 — 단계 절차

1. **Toolchain 준비.** compiler와 C 라이브러리를 정합니다. 이 harness의 Homebrew `arm-none-eabi-gcc`에는 newlib이 없어 `printf`·`memcpy`를 직접 썼고, 5-03의 RT-Thread BSP에는 Debian의 newlib 포함 toolchain을 썼습니다.
2. **가장 가까운 기존 port를 출발점으로.** FreeRTOS V11.2.0에는 빈 틀인 `portable/template/`도 있습니다. 같은 ISA의 port가 있으면 그것을 복사해 interrupt controller와 timer만 바꿉니다.
3. **Initial stack frame과 context switch.** PendSV(또는 trap) 복원 순서와 `pxPortInitialiseStack()`의 frame을 맞춥니다. 위 비교처럼 실제 함수 출력과 대조합니다.
4. **Tick source.** timer interrupt를 가장 낮은 priority로 두고 `xTaskIncrementTick()`의 반환값으로 yield를 요청합니다.
5. **Critical section.** nesting count와 interrupt mask, ISR용 mask 저장·복원을 만듭니다.
6. **검증.** 이 시리즈의 QEMU 실행이 그 목록입니다. task 두 개의 delay와 queue(5-01 CMake 예), mutex와 PI(3-05), FromISR와 yield(3-09), stack overflow hook(4-06), software timer(4-09).

## 자주 보는 함정

- vendor startup의 `SVC_Handler`·`PendSV_Handler` wrapper를 그대로 둡니다. `port.c:342`의 assert에 걸립니다.
- initial frame의 PC에 Thumb bit를 지운 주소, xPSR에 Thumb bit(`0x01000000`)를 넣지 않습니다. 위 실행의 `sp[15]`와 `sp[16]`이 올바른 값입니다.
- `configPRIO_BITS`를 칩과 다르게 적습니다. `xPortStartScheduler()`가 IPR에 0xFF를 써서 센 bit 수와 비교해 assert합니다(3-09).
- tick interrupt priority를 가장 낮게 두지 않고 SysTick handler의 "mask 저장 생략" 가정을 그대로 씁니다.
- `.data` 복사나 `.bss` 지우기를 빼먹은 startup으로 커널을 띄웁니다. 커널의 전역 list가 쓰레기 값에서 시작합니다.

## 정리

- port는 여섯 함수와 context switch 어셈블리, `portmacro.h`의 type·매크로로 이뤄지고, board는 vector table·startup·linker script를 더합니다.
- 글의 fixture는 실제 CM4F `pxPortInitialiseStack()`과 값을 넣는 다섯 칸이 같았고, 실제 port는 나머지 register 칸을 건드리지 않았습니다.
- `configCHECK_HANDLER_INSTALLATION`은 vector table에 port 함수를 직접 넣었는지 주소로 검사합니다.
- SysTick handler는 `xTaskIncrementTick()`의 반환값을 PendSV로 바꾸는 일만 하고, 판단은 `tasks.c`가 합니다.
- RISC-V port는 trap 진입점 하나에서 mcause 11(ECALL)을 yield로 씁니다.

## 근거 자료

- [FreeRTOS V11.2.0 ARM_CM4F](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0/portable/GCC/ARM_CM4F).
- [FreeRTOS V11.2.0 RISC-V](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0/portable/GCC/RISC-V), [template](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0/portable/template).
- [Zephyr v3.7.0](https://github.com/zephyrproject-rtos/zephyr/tree/v3.7.0).



다음 편은 [5-05 RTOS 선택 가이드](/blog/embedded/rtos/practical-internals/part5-05-selection-guide)에서 프로젝트별로 어떤 RTOS를 골라야 하는지 결정 매트릭스를 정리합니다.

## 관련 항목

- [2-05: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [2-07: RISC-V Context Switch](/blog/embedded/rtos/practical-internals/part2-07-riscv-context)
- [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [4-10: Syscall 구현](/blog/embedded/rtos/practical-internals/part4-10-syscall)
- [5-01: FreeRTOS 소스 분석](/blog/embedded/rtos/practical-internals/part5-01-freertos-source)
- [5-02: Zephyr 커널 분석](/blog/embedded/rtos/practical-internals/part5-02-zephyr-source)
