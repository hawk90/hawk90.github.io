---
title: "Critical Section 구현 비교 — IRQ Disable·BASEPRI·Spinlock"
slug: "embedded/rtos/practical-internals/part3-01-critical-section"
date: 2026-05-06T09:22:00
description: "3 가지 구현 — cpsid/BASEPRI mask, taskENTER_CRITICAL, SMP spinlock. Hold time이 latency 결정."
series: "Practical RTOS Internals"
seriesOrder: 22
tags: [critical-section, irq-disable, basepri, spinlock]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

임계 구역은 **어떤 실행 주체를 배제하는지**가 먼저입니다. IRQ mask는 로컬 코어의 일부 예외를 제한하고, scheduler suspend는 task 전환을 제한하며, SMP lock은 다른 코어와의 상호 배제를 제공합니다. 이 글의 구체적인 FreeRTOS 경로는 **V11.2.0 단일 코어 GCC/ARM_CM4F**를 기준으로 합니다.

## IRQ Disable — 이전 상태를 복원하기

Cortex-M의 PRIMASK는 "Setting PRIMASK to 1 raises the execution priority to 0"이라서(DDI 0403E.b B1.4.3) 구성 가능한 우선순위의 예외는 막지만, 고정 우선순위 −2·−1의 NMI와 HardFault는 막지 못합니다. 진입 전부터 IRQ가 꺼져 있었을 수 있으므로 종료 시 무조건 enable하지 않고 이전 값을 되돌립니다. 화장실 문을 나갈 때 "원래 잠겨 있었으면 다시 잠그고 나가는" 규칙입니다.

다음은 실제 MCU의 CMSIS device header를 포함한 뒤 사용하는 **로컬 PRIMASK 예제**입니다. RTOS task critical API와 임의로 혼합하지 않으며, 호출 순서대로 중첩을 풀어야 합니다.

```c title="irq-state.c"
#include <stdint.h>
/* Include the actual MCU CMSIS device header before this file. */
uint32_t irq_save(void) {
    uint32_t saved = __get_PRIMASK();
    __disable_irq();
    return saved;
}
void irq_restore(uint32_t saved) {
    __set_PRIMASK(saved);
}
```

PRIMASK는 이 코어의 예외만 막습니다. DMA나 다른 bus master의 메모리 접근은 그대로 일어납니다.

## BASEPRI — 우선순위 범위 확인

BASEPRI는 ARMv7-M의 mask 레지스터입니다(B1.4.3). 0이 아닌 BASEPRI 값은 그 값과 같거나 **수치가 더 큰** priority를 막고, 수치가 작은 고긴급도 예외는 계속 들어옵니다(B1.4.3). 값은 NVIC priority 필드와 같은 형식이라, 4비트 구현에서 논리 5는 0x50으로 씁니다(2-05).

FreeRTOS ARM_CM4F는 `configMAX_SYSCALL_INTERRUPT_PRIORITY`를 그대로 BASEPRI에 씁니다(1-04의 objdump: 0xa0). mask 밖의 고긴급도 ISR이 RTOS API를 부르면 1-05의 QEMU 실험처럼 `configASSERT`에 걸립니다. BASEPRI가 없는 Cortex-M0 포트의 critical section은 `cpsid i`입니다(2-05).

## taskENTER_CRITICAL의 실제 경로

V11.2.0 ARM_CM4F의 `portENTER_CRITICAL`은 `vPortEnterCritical`을 호출합니다. 이 함수는 BASEPRI를 올리고 `uxCriticalNesting`을 증가시키며, 첫 진입에서 ISR context가 아닌지 assertion으로 검사합니다. `vPortExitCritical`은 nesting을 감소시키고 0이 될 때 BASEPRI를 0으로 씁니다(1-02·2-03에서 본 ARM_CM3의 같은 함수, `port.c` L426-L452).

0으로 쓴다는 점이 중요합니다. 이전 BASEPRI를 저장하지 않기 때문입니다. QEMU에서 확인했습니다. task가 직접 BASEPRI를 0x40(더 많이 막는 값)으로 올린 뒤 `taskENTER_CRITICAL()`/`taskEXIT_CRITICAL()`을 한 번 부르면 이렇게 됩니다.

```c title="nest.c (발췌)"
  set_basepri(0x40);                         /* code that masked more IRQs on its own */
  taskENTER_CRITICAL(); uint32_t in=basepri(); taskEXIT_CRITICAL();
  pr("raw BASEPRI 0x40 -> inside taskENTER_CRITICAL 0x%x -> after taskEXIT_CRITICAL 0x%x\n",in,basepri());
```

```text
raw BASEPRI 0x40 -> inside taskENTER_CRITICAL 0xa0 -> after taskEXIT_CRITICAL 0x0
```

진입하면서 0x40이 0xa0으로 *약해졌고*, 탈출하면서 0이 되어 마스크가 아예 풀렸습니다. 직접 BASEPRI를 만지는 코드와 kernel critical section을 섞으면 이렇게 더 강했던 기존 mask를 잃습니다.

## Nested Critical Section

다음은 task context에서 두 함수가 중첩되는 예제입니다. 내부 호출 뒤에도 바깥 구간이 보호되므로 두 필드를 일관된 상태로 갱신할 수 있습니다.

```c title="critical-update.c"
#include <stdint.h>
#include "FreeRTOS.h"
#include "task.h"
struct CriticalTotals { uint32_t calls, items; };
static struct CriticalTotals totals;
static void count_call(void) {
    taskENTER_CRITICAL();
    ++totals.calls;
    taskEXIT_CRITICAL();
}
void critical_update(void) {
    taskENTER_CRITICAL();
    count_call();
    ++totals.items;
    taskEXIT_CRITICAL();
}
struct CriticalTotals critical_snapshot(void) {
    taskENTER_CRITICAL();
    struct CriticalTotals copy = totals;
    taskEXIT_CRITICAL();
    return copy;
}
```

중첩이 정말 바깥 구간을 지키는지 BASEPRI를 직접 읽어 봤습니다. 같은 QEMU 프로그램에서 바깥·안쪽 진입과 각 탈출 직후의 BASEPRI입니다.

```text
BASEPRI: before=0x0 outer=0xa0 inner=0xa0 after-inner-exit=0xa0 after-outer-exit=0x0
```

안쪽 `taskEXIT_CRITICAL()` 뒤에도 0xa0이 유지되고, 바깥 탈출에서야 0이 됩니다. 이 보호는 BASEPRI로 막히는 ISR과 같은 코어의 task에만 유효합니다. 숫자가 0xa0보다 작은 ISR이나 DMA가 `totals`에 접근하면 막지 못합니다. FreeRTOS V11.2.0 `ARM_CM3`, arm-none-eabi-gcc 16.2.0 `-O2`, QEMU 11.1.3 `mps2-an385 -icount shift=5`입니다.

## ISR-safe Critical Section

허용된 priority의 ISR에서는 `taskENTER_CRITICAL_FROM_ISR()`가 *이전* BASEPRI를 반환하고 `taskEXIT_CRITICAL_FROM_ISR(saved)`가 그 값을 되돌립니다(1-04의 objdump: `mrs r3, BASEPRI` … `msr BASEPRI, r3`). task용과 달리 nesting 카운터가 아니라 저장·복원이라, 위의 raw BASEPRI 문제가 없습니다.

```c title="isr-critical.c"
#include "FreeRTOS.h"
#include "task.h"
extern void update_isr_state(void);
void update_from_isr(void) {
    UBaseType_t saved = taskENTER_CRITICAL_FROM_ISR();
    update_isr_state();
    taskEXIT_CRITICAL_FROM_ISR(saved);
}
```

## SMP Spinlock

로컬 IRQ mask는 다른 코어의 접근을 막지 않습니다. FreeRTOS V11.2.0 SMP 커널은 포트가 제공하는 두 lock `portGET_TASK_LOCK()`·`portGET_ISR_LOCK()`과 IRQ mask를 함께 써서 critical section을 만듭니다(`tasks.c` L874-L875, 2-03). `portSPINLOCK_ENTER` 같은 이름은 V11.2.0 커널에 없습니다.

아래는 C11 atomic_flag를 사용하는 **try-lock 원리 예제**입니다. 한 번 시도하고 결과를 반환합니다. 단일 코어에서 holder를 선점한 task가 이 함수를 반복해서 돌면 holder가 다시 돌 수 없어 영원히 실패합니다(1-06).

```c title="flag-lock.c"
#include <stdatomic.h>
#include <stdbool.h>
static atomic_flag guard = ATOMIC_FLAG_INIT;
bool try_guard(void) {
    return !atomic_flag_test_and_set_explicit(&guard, memory_order_acquire);
}
void release_guard(void) {
    atomic_flag_clear_explicit(&guard, memory_order_release);
}
```

성공한 owner만 release해야 하며 재귀·공정성·priority inheritance는 제공하지 않습니다. 어떤 명령이 나오는지는 target이 정합니다. 같은 파일을 컴파일하면 arm-none-eabi-gcc 16.2.0 `-mcpu=cortex-m3`에서는 `ldrexb`/`strexb` 재시도 루프 뒤에 `dmb ish`가 붙고, Homebrew clang 23.1.5 `--target=aarch64-none-elf -march=armv8-a`에서는 `ldaxrb`/`stxrb` 루프, `-march=armv8.1-a`에서는 LSE 명령 `swpab` 한 개가 됩니다.

```text
0000000000000000 <try_guard>:            // -march=armv8.1-a
       0:      	mov	w8, #0x1                // =1
       4:      	adrp	x9, 0x0 <try_guard>
       8:      	add	x9, x9, #0x0
       c:      	swpab	w8, w9, [x9]
      10:      	bic	w0, w8, w9
      14:      	ret
```

test-and-set이라 compare가 필요 없으므로 ARMv8.1에서도 CASAL이 아니라 SWP 계열이 나왔습니다.

## Hold Time과 계측

mask가 50 µs 동안 유지된다면, 그 구간 시작 직후에 들어온 **mask 대상 IRQ**는 최대 50 µs를 기다립니다. 숫자가 BASEPRI보다 작은 ISR과 NMI는 기다리지 않습니다. 1-10의 QEMU 측정에서 낮은 task의 critical section 길이만 바꿨는데 높은 task의 최대 release latency가 147에서 9,588 count로 늘었습니다. 이 길이는 RTA의 blocking 항 $B_i$로 들어갑니다(1-10).

계측할 때는 **가장 바깥 진입부터 마지막 종료까지**를 잽니다. 위 BASEPRI 출력처럼 안쪽 탈출에서는 mask가 풀리지 않으므로, 전역 `last_enter` 하나를 중첩 진입마다 덮어쓰는 wrapper는 바깥 구간을 잃습니다. `uxCriticalNesting`이 0에서 1이 될 때만 시작 시각을 찍고, 1에서 0이 될 때만 끝을 찍으면 됩니다. 이 글에는 보드별 hold-time 실측값이 없습니다.

## IRQ Mask와 Scheduler Suspend

| 방법 | 단일 코어에서 제한하는 대상 | 남는 경쟁 |
| --- | --- | --- |
| PRIMASK | 구성 가능한 모든 예외 | NMI·HardFault·DMA |
| BASEPRI | 숫자가 BASEPRI 이상인 예외 | 숫자가 더 작은 IRQ·NMI·DMA |
| vTaskSuspendAll | task 전환 | 모든 ISR·DMA |
| SMP lock | 같은 lock을 잡는 다른 코어 | lock을 잡지 않는 접근 |

scheduler suspend는 mutex가 아니며 내부에서 block하면 `configASSERT`에 걸립니다(2-03, `queue.c` L958). IRQ를 막지 않으므로 ISR과 공유하는 데이터는 보호하지 못합니다. 보호 구간이 길고 그동안 다른 task가 기다려도 되면 mutex를 씁니다. 기다리는 task가 CPU를 놓고 priority inheritance도 받습니다(1-08).

## Atomic과 Memory Barrier의 한계

atomic counter 갱신은 한 변수의 원자성만 줍니다. 위 `critical-update.c`의 `calls`와 `items` 두 필드를 함께 맞추려면 두 갱신을 한 critical section으로 묶어야 합니다. pointer CAS만으로 만든 linked stack은 ABA 문제와 해제된 node 접근이 남으므로 이 장에서는 다루지 않습니다.

일반 shared_data와 flag 사이에 barrier만 넣어 C의 data race를 해결할 수도 없습니다. release/acquire 게시 계약, 실제 atomic object와 데이터 수명·재사용 규칙이 필요합니다. [1-06 동기화 기초](/blog/embedded/rtos/practical-internals/part1-06-sync-basics)의 one-shot 예제와 달리 반복 게시에는 별도의 ownership/ack 설계가 필요합니다.

## 정리

- 먼저 경쟁하는 task·ISR·다른 코어·DMA를 구분합니다.
- raw mask는 이전 상태와 중첩 복원 계약을 확인합니다.
- ARM_CM4F task critical은 nesting과 BASEPRI를 사용하며 scheduler suspend와 다릅니다.
- FromISR API에도 priority·포트·공유 데이터 계약이 있습니다.
- task용 `taskEXIT_CRITICAL()`은 이전 BASEPRI를 되돌리지 않고 0을 씁니다(QEMU: raw 0x40 → 0x0). FromISR 쪽은 저장·복원합니다.
- 같은 C11 atomic_flag가 Cortex-M3에서는 LDREXB/STREXB 루프, ARMv8.1-A에서는 `swpab` 한 명령이 됩니다.

다음 [3-02 Semaphore 내부 구현](/blog/embedded/rtos/practical-internals/part3-02-semaphore-impl)에서 counter 검사와 block 등록 사이 race를 kernel이 어떻게 처리하는지 살펴봅니다.

## 근거 자료

- [FreeRTOS V11.2.0 ARM_CM4F port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c), [portmacro.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/portmacro.h): nesting·BASEPRI·ISR mask.
- [GCC atomic built-ins](https://gcc.gnu.org/onlinedocs/gcc/_005f_005fatomic-Builtins.html): memory order와 target별 구현.
- [Arm CMSIS 6.1.0 core_cm4.h](https://github.com/ARM-software/CMSIS_6/blob/v6.1.0/CMSIS/Core/Include/core_cm4.h): Cortex-M register interface.
- ARM DDI 0403E.b B1.4.3(PRIMASK·BASEPRI).
- QEMU 실험: `nest.c`, FreeRTOS V11.2.0 `ARM_CM3`, QEMU 11.1.3 `mps2-an385 -icount shift=5`.

## 관련 항목

- [1-06: 동기화 기초](/blog/embedded/rtos/practical-internals/part1-06-sync-basics)
- [3-02: Semaphore 내부](/blog/embedded/rtos/practical-internals/part3-02-semaphore-impl)
- [4-08: Spinlock과 SMP](/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp)
