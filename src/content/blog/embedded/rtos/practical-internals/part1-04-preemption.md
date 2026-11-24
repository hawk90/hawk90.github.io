---
title: "Preemption과 Cooperation — 강제 전환 vs 자발 양보"
slug: "embedded/rtos/practical-internals/part1-04-preemption"
date: 2026-05-04T09:04:00
description: "선점형과 협력형의 전환 지점, tick·IRQ·blocking API, interrupt mask와 응답시간 분석의 차이를 다룹니다."
series: "Practical RTOS Internals"
seriesOrder: 4
tags: [rtos, preemption, cooperative, yield, tick]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **선점 여부만으로 실시간성은 보장되지 않습니다.** 두 방식의 최대 비선점 구간·우선순위·blocking·ISR 간섭을 비교합니다.

## Preemption — 강제 전환

높은 priority task가 ready 되면 *현재 running task를 강제로 중단*시킵니다. 수업 중에 교장 선생님이 들어오면 선생님이 말을 멈추는 것과 같습니다. tick·ISR 이후 전환뿐 아니라 task 문맥의 API가 고우선 task를 깨우는 경우도 있습니다. Cortex-M 포트에서 전환은 언제나 PendSV 예외 안에서 일어나고, 포트는 PendSV와 SysTick의 우선순위를 가장 낮은 255로 설정합니다([`ARM_CM3/port.c` L55-L57, L390-L391](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/port.c#L55-L57)). 그래서 다른 ISR이 도는 동안이나 BASEPRI로 마스킹된 critical section 안에서는 전환이 미뤄집니다.

### Tick Preemption

SysTick 인터럽트가 `xTaskIncrementTick()`을 부르고, 이 함수가 `pdTRUE`를 돌려주면 PendSV를 pend합니다. `pdTRUE`가 되는 경우는 세 가지입니다. (1) delay가 끝나 깨어난 task의 우선순위가 현재 task보다 높을 때([`tasks.c` L4826-L4840](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L4826-L4840)), (2) time slicing이 켜져 있고 같은 우선순위 ready task가 둘 이상일 때(L4861), (3) ISR이 `xHigherPriorityTaskWoken`을 버렸더라도 `xTaskRemoveFromEventList()`가 세워 둔 `xYieldPendings[0]`이 남아 있을 때(L5458, L4908-L4919)입니다. 세 경로 모두 `configUSE_PREEMPTION == 1`일 때만 컴파일됩니다.

### IRQ Preemption

Cortex-M 포트의 `portYIELD_FROM_ISR(x)`는 `portEND_SWITCHING_ISR(x)`이고, x가 `pdFALSE`가 아니면 ICSR(0xE000ED04)에 PENDSVSET bit를 씁니다([`ARM_CM3/portmacro.h` L98-L111](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/portmacro.h#L98-L111)). 호출 지점에서 곧바로 task를 실행하는 함수가 아닙니다. 현재 ISR과 그보다 우선순위가 높은 예외가 모두 끝난 뒤, 가장 낮은 우선순위인 PendSV가 tail-chain으로 들어와 context를 바꿉니다(DDI 0403E.b B1.5.12).

ISR이 *higher-priority task를 깨우면* (`xSemaphoreGiveFromISR` 등) 두 번째 인자 `xHigherPriorityTaskWoken`이 `pdTRUE`가 됩니다. 이 값을 `portYIELD_FROM_ISR`에 넘기느냐에 따라 결과가 다릅니다. 아래는 우선순위 1의 `lo`가 TIMER0 IRQ를 pending시키고, ISR이 우선순위 3의 `hi`가 기다리는 세마포어를 주는 실험입니다. `lo`는 IRQ 직후 `hi`가 이미 돌았는지 확인합니다.

```c title="isryield.c (발췌)"
void TIMER0_IRQHandler(void){ BaseType_t w=pdFALSE; xSemaphoreGiveFromISR(sem,&w); woken_seen=w; portYIELD_FROM_ISR(USE_YIELD ? w : pdFALSE); }
static void hi(void*a){ (void)a; for(;;){ xSemaphoreTake(sem,portMAX_DELAY); hi_ran=1; } }
/* lo: pend TIMER0 IRQ, then */
  int seen_right_after=hi_ran;
  while(!hi_ran){}
```

FreeRTOS V11.2.0 `ARM_CM3`, arm-none-eabi-gcc 16.2.0 `-O2`, QEMU 11.1.3 `mps2-an385 -icount shift=5`에서 `configUSE_PREEMPTION`과 `USE_YIELD`를 바꿔 네 번 빌드했습니다.

```text
USE_YIELD=1 PREEMPTION=1 woken=1 hi_ran right after IRQ=1, hi ran at tick +0
USE_YIELD=0 PREEMPTION=1 woken=1 hi_ran right after IRQ=0, hi ran at tick +1
USE_YIELD=1 PREEMPTION=0 woken=1 hi_ran right after IRQ=1, hi ran at tick +0
```

yield 요청을 넘기면 ISR이 끝나자마자 `hi`가 돌았습니다. 넘기지 않으면 `hi`는 ready가 되었을 뿐 다음 tick 인터럽트에서야 돌았습니다. 이 다음 tick의 전환이 위 (3)번 경로입니다. `tasks.c` L5456-L5458의 주석은 이를 "in case the user is not using the xHigherPriorityTaskWoken parameter"라고 설명합니다. 네 번째 조합(`USE_YIELD=0`, `PREEMPTION=0`)은 5초 timeout으로 끝났습니다. 아래 cooperative 절에서 이유를 봅니다.

## Cooperation — 자발 양보

task는 명시적 yield 또는 실제 blocking·suspend·delete 등으로 실행권을 넘길 수 있습니다.

```c
void taskA(void *arg) {
    while (1) {
        do_work();
        taskYIELD();    // scheduler 재선택; 호출 task가 계속 선택될 수 있음
    }
}
```

단일 코어의 `taskYIELD()`는 현재 task를 Ready에서 제거하지 않습니다. 자신보다 낮은 priority task만 남아 있으면 자신이 다시 선택됩니다. `configUSE_TIME_SLICING=0`도 tick에 의한 같은 priority 회전을 끄는 설정이지, 명시적 yield나 blocking으로 인한 전환까지 금지하는 설정은 아닙니다.

또는 *blocking API*가 implicit yield 역할을 합니다. 대기 시간이 양수인 delay나 실제 대기 조건이 성립한 queue receive 등이 전환을 유발합니다. 데이터가 이미 있거나 timeout0이면 receive가 즉시 반환할 수 있습니다.

### Cooperative만 사용 시

```c
#define configUSE_PREEMPTION 0   // FreeRTOSConfig.h
```

Tick 인터럽트는 tick 수를 세고 delay가 끝난 task를 ready로 옮기지만, 앞의 `xTaskIncrementTick()` 두 경로가 컴파일되지 않으므로 전환을 요청하지 않습니다. 그렇다고 ISR에서 전환이 불가능한 것은 아닙니다. 위 실험의 세 번째 줄처럼 `portYIELD_FROM_ISR(pdTRUE)`는 cooperative 구성에서도 PendSV를 pend하고, ISR이 끝나자마자 `hi`로 전환됐습니다. `portEND_SWITCHING_ISR`에는 `configUSE_PREEMPTION` 조건이 없기 때문입니다.

네 번째 조합이 멈춘 이유도 같은 구조에 있습니다. ISR이 yield를 요청하지 않았고 tick도 전환을 요청하지 않으므로, `while(!hi_ran){}`에서 도는 `lo`가 CPU를 영원히 놓지 않습니다. `hi`는 ready 상태로 계속 기다립니다.

## 비교 — Preemptive vs Cooperative 타임라인

아래 그림은 전환 순서를 설명하는 개념 모델입니다. 같은 구조를 QEMU에서 실제로 돌린 결과는 그림 아래에 있습니다.

![Preemption vs Cooperation — 1ms PID + 5ms Log](/images/blog/practical-internals/diagrams/part1-04-preemption-vs-cooperation.svg)

QEMU에서는 PID task(우선순위 3)를 2 tick 주기로 `xTaskDelayUntil()`에 걸고, logger(우선순위 1)는 5 tick 동안 CPU를 쓴 뒤 `taskYIELD()`를 부르게 했습니다. PID는 깨어날 예정 tick과 실제로 돈 tick의 차이(release latency)를 출력합니다. 형식은 `예정 tick:지연 tick`입니다.

```c title="pidlog.c (발췌)"
static void pid(void*a){ (void)a; TickType_t last=xTaskGetTickCount(), worst=0;
  for(int i=0;i<10;i++){ xTaskDelayUntil(&last,2); TickType_t lat=xTaskGetTickCount()-last; if(lat>worst) worst=lat;
    pr("%u:%u ",(unsigned)last,(unsigned)lat); }
  /* ... */ }
static void logger(void*a){ (void)a; for(;;){ burn(5); taskYIELD(); } }
```

```text
2:0 4:0 6:0 8:0 10:0 12:0 14:0 16:0 18:0 20:0 
configUSE_PREEMPTION=1 worst PID release latency = 0 ticks
2:3 4:1 6:4 8:2 10:0 12:3 14:1 16:4 18:2 20:0 
configUSE_PREEMPTION=0 worst PID release latency = 4 ticks
```

선점형에서는 PID가 매번 예정 tick에 돌았습니다. 협력형에서는 logger가 5 tick 덩어리를 끝내고 yield할 때까지 기다려 최대 4 tick 늦었습니다. 지연 상한이 logger의 가장 긴 비양보 구간(5 tick)에서 나온다는 점이 협력형 분석의 핵심입니다.

## 비교 표

| 항목 | Preemptive | Cooperative |
| --- | --- | --- |
| **전환 트리거** | tick·IRQ·API wake·yield·blocking 등 | yield·blocking·suspend 등, 포트별 명시적 전환 |
| **고우선 task 지연 상한** | 상위 우선순위 간섭 + critical section·ISR | 낮은 task의 가장 긴 비양보 구간 (위 실험: 4 tick) |
| **task 간 race** | 어느 명령 사이에서든 전환 가능 → 공유 데이터마다 보호 | yield·block 지점 사이에서는 task 간 전환 없음 |
| **ISR과의 race** | 있음 | 있음 (ISR은 그대로 실행) |
| **전환 지점** | 소스만 보고 알 수 없음 | 소스에 드러남 |

## Trade-off — 예시

### 시나리오: 5 tick 작업 logger + 2 tick 주기 PID

위 `pidlog.c` 결과를 그대로 읽으면 선택 기준이 나옵니다.

- 선점형에서는 PID 지연이 0이었습니다. 대신 logger가 다루는 데이터를 PID도 건드린다면, 그 데이터는 logger의 어느 명령 사이에서든 PID에게 끼어들릴 수 있으므로 보호해야 합니다.
- 협력형에서 PID 지연은 logger의 덩어리 크기에 묶였습니다. PID의 주기가 2 tick이므로 4 tick 지연은 이미 주기 두 번을 놓친 셈입니다. logger를 1 tick 이하 덩어리로 쪼개면 지연 상한도 그만큼 줄어듭니다.

두 경우 모두 지연 상한은 모델로 계산할 수 있습니다. [1-03의 RTA 예제](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms)에 비선점 구간을 blocking 항으로 더하는 방법은 1-10에서 다룹니다.

## Preemption Disable (Critical Section)

Preemptive RTOS에서도 *짧은 구간은 preemption disable*이 필요합니다.

```c
taskENTER_CRITICAL();
shared_counter++;
shared_buffer[idx++] = value;
taskEXIT_CRITICAL();
```

FreeRTOS V11.2.0 Cortex-M3/M4F 포트의 `taskENTER_CRITICAL()`은 `vPortEnterCritical()`이고, `portDISABLE_INTERRUPTS()` = `vPortRaiseBASEPRI()`로 BASEPRI를 `configMAX_SYSCALL_INTERRUPT_PRIORITY`에 맞춘 뒤 nesting 카운터를 올립니다([`ARM_CM3/portmacro.h` L119, L212](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/portmacro.h#L212), [`port.c` L426-L440](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/port.c#L426-L440)). BASEPRI는 그 값 이상(숫자가 같거나 큰)의 우선순위만 막으므로, 숫자가 더 작은 IRQ와 NMI·HardFault는 critical section 안에서도 들어옵니다. 회의실 문에 "중요 손님만 입장"이라고 써 붙이는 것과 비슷합니다. 아래 "재현" 절의 디스어셈블에서 이 값이 실제로 BASEPRI에 들어가는 것을 봅니다.

## ISR과 Preemption

ISR은 *task가 아닙니다*. 단순히 *현재 task를 잠시 빼앗는* 코드입니다. ISR 도중에는 다음 규칙이 적용됩니다.

- task 전환을 하지 않습니다. PendSV가 가장 낮은 우선순위라 모든 ISR이 끝나야 들어옵니다.
- 다른 ISR이 *더 높은 priority*면 nested IRQ가 가능합니다(DDI 0403E.b B1.5.4).
- ISR이 task를 깨우고 `portYIELD_FROM_ISR(pdTRUE)`를 부르면, ISR이 끝난 직후 PendSV가 tail-chain으로 실행되어 전환합니다.

```c
void TIM1_IRQHandler(void) {
    BaseType_t xHigherPriorityTaskWoken = pdFALSE;

    xSemaphoreGiveFromISR(semHandle, &xHigherPriorityTaskWoken);
    /* 위 호출이 higher-priority task를 ready로 만들면
       xHigherPriorityTaskWoken = pdTRUE 설정됨 */

    portYIELD_FROM_ISR(xHigherPriorityTaskWoken);
    /* 필요한 전환 요청; 실제 PendSV 실행 시점은 예외·mask 상태에 따름 */
}
```

## Tick Rate 선택

| Tick Rate | Period | 초당 tick 인터럽트 | `pdMS_TO_TICKS(1)` |
| --- | --- | --- | --- |
| 100 Hz | 10 ms | 100 | 0 (절삭) |
| 1 kHz | 1 ms | 1,000 | 1 |
| 10 kHz | 0.1 ms | 10,000 | 10 |

`pdMS_TO_TICKS(ms)`는 `ms * configTICK_RATE_HZ / 1000`을 정수로 계산하므로 100 Hz에서 1 ms는 0 tick입니다(1-02의 `REQUIRE_ONE_MS` 검사). tick 인터럽트 하나의 비용은 보드에서 재야 하는 값이고, 초당 횟수는 rate에 비례합니다.

`vTaskDelay(1)`은 "다음 tick 경계까지"를 뜻합니다. 그래서 tick 안의 어느 시점에 부르느냐에 따라 실제로 쉬는 시간이 달라집니다. QEMU에서 SysTick의 현재 값 레지스터(SYST_CVR, 0xE000E018)를 읽어 tick 경계 직후와 tick의 90%가 지난 시점에서 각각 `vTaskDelay(1)`을 불러 봤습니다.

```c title="delayphase.c (발췌)"
static uint32_t now(void){ uint32_t t1,c; do{ t1=xTaskGetTickCount(); c=CVR; }while(t1!=xTaskGetTickCount()); return t1*(RVR+1)+(RVR-c); }
/* ... */
    TickType_t s=xTaskGetTickCount(); while(xTaskGetTickCount()==s){}   /* align to tick edge */
    if(k==1){ while(CVR > per/10){} }                       /* wait until ~90% of the tick has elapsed */
    uint32_t a0=now(); vTaskDelay(1); uint32_t a1=now();
```

```text
SysTick reload+1 = 25000 cycles per tick
right after tick: vTaskDelay(1) blocked for 25088 cycles (1.00 ticks)
late in tick : vTaskDelay(1) blocked for 2624 cycles (0.10 ticks)
```

같은 `vTaskDelay(1)`이 한 번은 1 tick, 한 번은 0.1 tick 동안 쉬었습니다. 여기서 cycle은 QEMU icount 가상 시간으로 센 SysTick 계수이며 실제 보드의 시간은 아닙니다. 하지만 "1 tick 지연은 0에서 1 tick 사이"라는 구조는 커널 코드에서 나오므로 보드에서도 같습니다.

## Tickless Mode

Idle 시 *tick interrupt를 멈추면* CPU sleep을 더 길게 할 수 있습니다. 조건이 맞으면 저전력 대기시간을 늘릴 수 있습니다.

```c
#define configUSE_TICKLESS_IDLE 1
#define configEXPECTED_IDLE_TIME_BEFORE_SLEEP 2  // 2 tick 이상 idle 시 sleep (기본값도 2)
```

다음 task의 wake 시간을 알아내 *그 시점까지 timer를 다시 설정*합니다. Cortex-M3 포트의 기본 구현(weak `vPortSuppressTicksAndSleep()`, [`port.c` L520](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/port.c#L520))은 별도 timer 없이 SysTick 자체의 reload 값을 잠들 tick 수만큼 늘려 쓰고(L585) `wfi`로 잠듭니다(L605). 한 번에 잠들 수 있는 tick 수는 24비트 SysTick이 셀 수 있는 범위(`xMaximumPossibleSuppressedTicks`)로 잘립니다. 자세한 보정은 [2-09](/blog/embedded/rtos/practical-internals/part2-09-tickless)에서 봅니다.

## SMP에서 Preemption

다중 코어에서는 한 코어의 ISR이 깨운 task를 다른 코어가 실행해야 할 수 있습니다. FreeRTOS V11.2.0 SMP에서는 `prvYieldForTask()`가 깨어난 task보다 낮은 우선순위를 돌리는 코어를 찾아 `prvYieldCore()`를 부르고, 그 코어가 자기 자신이 아니면 포트가 정의하는 `portYIELD_CORE( xCoreID )`로 그 코어에 전환을 요청합니다([`tasks.c` L361](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L361)). 무엇으로 요청할지는 포트가 정합니다. 예를 들어 RP2040 포트의 `vYieldCore()`는 코어 간 SIO FIFO에 0을 써서(`sio_hw->fifo_wr = 0`) 상대 코어에 인터럽트를 일으킵니다([`portable/ThirdParty/GCC/RP2040/port.c` L510-L524](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/ThirdParty/GCC/RP2040/port.c#L510-L524)). 예 — `Core 0: ISR → portYIELD_CORE(1) → Core 1에서 전환`.

## 흔한 함정

> ⚠️ ISR에서 long work

Preemptive RTOS에서도 같은 코어에서는 ISR 실행 중 task 명령을 실행하지 않습니다. SMP의 다른 코어까지 모두 멈춘다는 뜻은 아닙니다. ISR은 *짧게* 유지하고 긴 작업은 *deferred task*로 넘깁니다(1-05).

> ⚠️ Critical Section 너무 김

`taskENTER_CRITICAL()` 안에 printf 같은 긴 작업을 넣으면 그 시간만큼 `configMAX_SYSCALL_INTERRUPT_PRIORITY` 이하의 IRQ와 tick, task 전환이 모두 늦어집니다. 그 경계보다 숫자가 작은 IRQ는 계속 들어옵니다.

> ⚠️ Cooperative에서 무한 루프

Yield 없는 무한 루프는 시스템을 멈춥니다. 위 `isryield.c`의 네 번째 조합이 정확히 이 경우로, 5초 timeout까지 아무 출력이 없었습니다. *while(1)에 항상 wait API*나 yield를 넣습니다.

> ⚠️ Tick rate 너무 높음

10 kHz tick은 100 µs마다, 초당 10,000번 ISR을 일으킵니다. 1 kHz의 10배입니다. tick ISR 한 번의 비용을 보드에서 재고 rate를 곱하면 tick이 쓰는 CPU 비율이 나옵니다.

## 정리

- **Preemptive**는 tick과 IRQ에서 전환합니다. QEMU 실험에서 PID 지연은 0 tick이었습니다.
- **Cooperative**에서 고우선 task 지연은 낮은 task의 가장 긴 비양보 구간에 묶입니다(실험: 5 tick 덩어리 → 최대 4 tick).
- FreeRTOS cooperative에서도 `portYIELD_FROM_ISR(pdTRUE)`는 전환합니다. tick만 전환을 요청하지 않습니다.
- `vTaskDelay(1)`은 0~1 tick 사이를 쉽니다.
- Critical section은 BASEPRI로 `configMAX_SYSCALL_INTERRUPT_PRIORITY` 이하 IRQ만 막습니다.
- Tickless는 idle 구간 동안 tick 인터럽트를 멈추고 SysTick reload를 늘립니다.

다음 편에서는 **인터럽트와 RTOS**를 다룹니다. ISR context, deferred processing, FromISR API를 살펴봅니다.

## 재현 — 포트의 mask와 yield 코드 생성

다음 소스를 V11.2.0 ARM_CM4F 공식 헤더로 교차 컴파일하면 ISR critical section의 BASEPRI 저장·복원과 PendSV 요청을 볼 수 있습니다. 이 장의 config는 `configMAX_SYSCALL_INTERRUPT_PRIORITY`가 `(5<<5)` = 160입니다.

```c title="critical-port.c"
#include "FreeRTOS.h"
#include "task.h"
void inspect_isr_mask(void) {
    UBaseType_t old = taskENTER_CRITICAL_FROM_ISR();
    __asm volatile ("" ::: "memory");
    taskEXIT_CRITICAL_FROM_ISR(old);
}
void request_switch(void) { portYIELD_FROM_ISR(pdTRUE); }
```

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -mfloat-abi=hard -mfpu=fpv4-sp-d16 -O2 -ffreestanding \
  -I. -IFreeRTOS-Kernel/include -IFreeRTOS-Kernel/portable/GCC/ARM_CM4F -c critical-port.c
arm-none-eabi-objdump -d --no-show-raw-insn critical-port.o
```

arm-none-eabi-gcc 16.2.0의 출력입니다.

```text
00000000 <inspect_isr_mask>:
   0:	mrs	r3, BASEPRI
   4:	mov.w	r2, #160	@ 0xa0
   8:	msr	BASEPRI, r2
   c:	isb	sy
  10:	dsb	sy
  14:	msr	BASEPRI, r3
  18:	bx	lr
  1a:	nop

0000001c <request_switch>:
  1c:	mov.w	r3, #3758153728	@ 0xe000e000
  20:	mov.w	r2, #268435456	@ 0x10000000
  24:	str.w	r2, [r3, #3332]	@ 0xd04
  28:	dsb	sy
  2c:	isb	sy
  30:	bx	lr
  32:	nop
```

`inspect_isr_mask`는 이전 BASEPRI를 r3에 저장하고 160(0xa0)을 쓴 뒤 다시 되돌립니다. 0이 아닌 BASEPRI는 우선순위 값이 그 이상인 예외만 막으므로, 0x00~0x9F 우선순위 IRQ는 이 구간에도 들어옵니다. `request_switch`는 0xE000ED04(ICSR)에 0x10000000, 즉 bit 28 PENDSVSET을 씁니다. 함수 안에서 전환이 일어나지 않고 PendSV를 pend만 한다는 뜻입니다.

## 1차 자료와 확인 범위

- [FreeRTOS V11.2.0 ARM_CM3 port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/port.c): PendSV·SysTick 우선순위(L55-L57), `vPortEnterCritical`(L426), `vPortSuppressTicksAndSleep`(L520)
- [ARM_CM3 portmacro.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM3/portmacro.h): `portEND_SWITCHING_ISR`(L98), `vPortRaiseBASEPRI`(L212)
- [ARM_CM4F port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c), [portmacro.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/portmacro.h): 같은 BASEPRI·PendSV 규약
- [tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c): `xTaskIncrementTick`의 전환 조건(L4826, L4861)
- ARM DDI 0403E.b B1.5.4(우선순위와 선점), B1.5.12(tail-chaining)

QEMU 실행 결과는 icount 가상 시간 기준입니다. 순서와 tick 단위 결과는 커널 코드에서 나오지만, cycle 수와 latency의 절댓값은 실제 보드에서 다시 재야 합니다.

## 관련 항목

- [1-03: 스케줄링 알고리즘](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms)
- [1-05: 인터럽트와 RTOS](/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos)
- [2-08: Tick과 타이머](/blog/embedded/rtos/practical-internals/part2-08-tick-timer)
