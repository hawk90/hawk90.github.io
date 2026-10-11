---
title: "RTOS Semaphore 활용 — Binary·Counting·ISR Give"
slug: "embedded/modern-recipes/part6-04-semaphore-usage"
date: 2026-04-15T09:03:00
description: "Binary semaphore signaling, counting semaphore resource pool, ISR-to-task wake-up 패턴과 task notification과의 선택 기준을 FreeRTOS V11.2.0 소스로 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 66
tags: [recipes, rtos, semaphore]
topics: ["embedded"]
---

## 한 줄 요약

> **"Semaphore는 count를 가진 신호입니다."** Binary는 0과 1, counting은 0부터 max까지 셉니다. 어느 쪽을 쓰든 ISR은 `xSemaphoreGiveFromISR()`로 give만 하고, 받는 task가 하나로 정해져 있으면 task notification이 더 가볍습니다.

## 어떤 상황에서 쓰나

ADC 변환 완료나 무선 패킷 수신을 ISR에서 task로 넘기는 코드, 그리고 DMA channel 4개처럼 개수가 정해진 자원을 여러 task가 나눠 쓰는 코드를 FreeRTOS로 짤 때의 글입니다. 이 글이 답하는 질문은 셋입니다. Binary·counting semaphore·task notification 중 무엇을 고르는가, 각각 어디서 event를 잃는가, ISR 쪽 실수가 어떻게 드러나는가입니다.

Task와 scheduler의 동작은 [6-03: RTOS Scheduler 동작 분석](/blog/embedded/modern-recipes/part6-03-scheduler-internals)을, ISR에서 부를 수 있는 API의 일반 규칙은 [6-09: ISR-Safe API 설계](/blog/embedded/modern-recipes/part6-09-isr-api)를 전제로 합니다. 코드는 STM32F407(CMSIS device header)과 FreeRTOS-Kernel V11.2.0의 GCC `ARM_CM4F` port를 기준으로 하고, API 이름과 동작은 V11.2.0의 [`semphr.h`](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h)와 [`tasks.c`](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c)를 따릅니다. `process_sample()`·`pending_packets()`처럼 정의를 보이지 않은 함수는 애플리케이션 쪽 함수입니다.

## 핵심 개념

Take는 count가 0보다 크면 하나 줄이고, 0이면 timeout까지 block 합니다. Give는 count를 하나 늘리고 기다리는 task를 깨웁니다. 기다리는 task는 event list에 priority 순서로 들어가고 give는 그 맨 앞을 깨우므로, 여러 task가 같은 semaphore를 기다리면 priority가 가장 높은 task가 먼저 받습니다([tasks.c L5306-5317](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L5306-L5317), [L5417](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L5417)).

Binary semaphore는 take 한 쪽이 돌려줄 필요가 없어서 한 task·ISR이 계속 give 하고 다른 task가 계속 take 하는 구조를 전제로 하며, 그래서 priority inheritance를 쓰지 않습니다([semphr.h L136-141](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h#L136-L141)). 공유 자원 보호에는 priority inheritance를 쓰는 mutex를 쓰고, mutex는 ISR에서 쓸 수 없습니다([L699-703](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h#L699-L703)).

## 코드 / 실제 사용 예

### Binary semaphore — ISR signaling

```c
#include "stm32f4xx.h"
#include "FreeRTOS.h"
#include "task.h"
#include "semphr.h"

static SemaphoreHandle_t adc_done;
static volatile uint16_t adc_sample;

void ADC_IRQHandler(void) {
    BaseType_t hp = pdFALSE;
    adc_sample = (uint16_t)ADC1->DR;     /* DR read clears EOC */
    xSemaphoreGiveFromISR(adc_done, &hp);
    portYIELD_FROM_ISR(hp);
}

static void task_processor(void *arg) {
    for (;;) {
        if (xSemaphoreTake(adc_done, pdMS_TO_TICKS(100)) == pdTRUE) {
            process_sample(adc_sample);
        } else {
            log_warn("ADC timeout");
        }
    }
}

int main(void) {
    /* clock and ADC1 (EOCIE = 1) setup omitted */
    adc_done = xSemaphoreCreateBinary();
    xTaskCreate(task_processor, "adc", configMINIMAL_STACK_SIZE * 2, NULL,
                tskIDLE_PRIORITY + 2, NULL);
    NVIC_SetPriority(ADC_IRQn,
                     configMAX_SYSCALL_INTERRUPT_PRIORITY >> (8 - __NVIC_PRIO_BITS));
    NVIC_EnableIRQ(ADC_IRQn);
    vTaskStartScheduler();
    for (;;) { }
}
```

Task는 ISR이 give 할 때까지 block 하므로 polling 루프가 없습니다. 100 ms 안에 give가 없으면 `xSemaphoreTake()`가 `pdFALSE`를 돌려주어 timeout 분기로 가므로, ADC 변환을 시작하지 않은 채 돌리면 이 분기가 100 ms마다 찍힙니다. `xSemaphoreGiveFromISR()`이 더 높은 priority의 task를 깨웠으면 `hp`가 `pdTRUE`가 되고, ISR을 나가기 전에 `portYIELD_FROM_ISR(hp)`로 context switch를 요청합니다([semphr.h L570-574](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h#L570-L574)).

ISR은 `ADC_SR`를 건드리지 않고 `ADC_DR`를 읽어 EOC를 지웁니다. `ADC_SR`의 플래그는 모두 rc_w0이라 `ADC1->SR &= ~ADC_SR_EOC`처럼 read-modify-write로 지우면 읽은 뒤에 선 OVR·JEOC 같은 다른 플래그까지 0으로 써서 지웁니다([RM0090 Rev 22 13.13.1](https://www.st.com/resource/en/reference_manual/rm0090-stm32f405415-stm32f407417-stm32f427437-and-stm32f429439-advanced-armbased-32bit-mcus-stmicroelectronics.pdf)).

`NVIC_SetPriority()` 줄을 빼면 ADC 인터럽트가 리셋 기본값인 priority 0으로 남습니다. `configASSERT()`를 정의해 두었으면 `ARM_CM4F` port는 `*FromISR` API가 `configMAX_SYSCALL_INTERRUPT_PRIORITY`보다 높은 priority의 ISR에서 불릴 때 멈추고, 주석은 priority 0이 언제나 이 조건에 걸린다고 적습니다([port.c L864-888](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c#L864-L888)). `NVIC_SetPriority()`는 넘긴 값을 `8 - __NVIC_PRIO_BITS`만큼 왼쪽으로 밀어 넣으므로, shift 된 형태로 정의하는 `configMAX_SYSCALL_INTERRUPT_PRIORITY`를 같은 만큼 오른쪽으로 밀어 넘깁니다.

### Counting semaphore — resource pool

```c
#define DMA_CHANNELS 4

static SemaphoreHandle_t dma_slots;
static uint8_t dma_busy;                  /* bit n set: channel n in use */

static int alloc_dma_channel(void) {
    int ch = -1;
    taskENTER_CRITICAL();
    for (int i = 0; i < DMA_CHANNELS; i++) {
        if ((dma_busy & (1u << i)) == 0) {
            dma_busy |= (uint8_t)(1u << i);
            ch = i;
            break;
        }
    }
    taskEXIT_CRITICAL();
    return ch;
}

static void free_dma_channel(int ch) {
    taskENTER_CRITICAL();
    dma_busy &= (uint8_t)~(1u << ch);
    taskEXIT_CRITICAL();
}

static void task_xfer(void *arg) {
    for (;;) {
        xSemaphoreTake(dma_slots, portMAX_DELAY);
        int ch = alloc_dma_channel();
        start_transfer(ch);
        wait_complete(ch);
        free_dma_channel(ch);
        xSemaphoreGive(dma_slots);
    }
}

/* in main(), before vTaskStartScheduler() */
dma_slots = xSemaphoreCreateCounting(DMA_CHANNELS, DMA_CHANNELS);
```

자원이 모두 사용 중이면 take에서 block 합니다. Semaphore는 남은 개수만 셀 뿐 어느 channel이 비었는지는 모르므로, 어느 channel인지는 `dma_busy` 비트맵이 정하고 그 갱신은 critical section 안에서 합니다. Take에 성공한 task 수가 channel 수를 넘지 않으므로 `alloc_dma_channel()`이 -1을 돌려주는 경로는 없습니다. Channel을 돌려준 뒤에 give 하는 순서도 지켜야 합니다. 거꾸로 하면 give로 깨어난 task가 비트맵에서 아직 빈 channel을 찾지 못할 수 있습니다.

### Counting semaphore — event count

```c
static SemaphoreHandle_t pkt_count;
static volatile uint32_t pkt_dropped;

void RADIO_IRQHandler(void) {
    BaseType_t hp = pdFALSE;
    for (int n = pending_packets(); n > 0; n--) {
        if (xSemaphoreGiveFromISR(pkt_count, &hp) != pdTRUE)
            pkt_dropped++;
    }
    portYIELD_FROM_ISR(hp);
}

static void task_parser(void *arg) {
    for (;;) {
        xSemaphoreTake(pkt_count, portMAX_DELAY);   /* one packet */
        parse_one();
    }
}

/* in main(), before vTaskStartScheduler() */
pkt_count = xSemaphoreCreateCounting(64, 0);       /* max = 64, initial = 0 */
```

`semphr.h`는 event count 용도에서 count가 "일어난 event 수와 처리한 수의 차이"라고 적습니다([L970-990](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h#L970-L990)). 그래서 max는 parser task가 밀린 동안 쌓일 수 있는 최대 packet 수 이상이어야 합니다. Count가 이미 max인 64일 때의 `xSemaphoreGiveFromISR()`은 `errQUEUE_FULL`을 돌려주고 그 packet은 셈에서 빠지므로([semphr.h L576](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h#L576)), 위 코드는 반환값을 보고 `pkt_dropped`를 올립니다. 이 값이 0이 아니면 parser가 따라잡기 전에 밀린 수가 max를 넘은 것이므로, max를 늘리거나 parser가 더 빨리 돌게 합니다. 지금 밀린 수는 `uxSemaphoreGetCount()`로 읽을 수 있습니다([L1165-1177](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h#L1165-L1177)).

Binary semaphore로 같은 일을 하면 이미 1일 때의 give가 실패해 count가 1에 머무르므로, 두 번 들어온 event가 한 번으로 줄어듭니다.

### Task notification — 받는 task가 하나일 때

```c
static TaskHandle_t btn_task;

void EXTI0_IRQHandler(void) {
    BaseType_t hp = pdFALSE;
    EXTI->PR = EXTI_PR_PR0;               /* rc_w1: write 1 to clear */
    vTaskNotifyGiveFromISR(btn_task, &hp);
    portYIELD_FROM_ISR(hp);
}

static void task_btn(void *arg) {
    for (;;) {
        ulTaskNotifyTake(pdTRUE, portMAX_DELAY);
        handle_button();
    }
}

int main(void) {
    /* clock, GPIO and EXTI0 line setup omitted */
    xTaskCreate(task_btn, "btn", configMINIMAL_STACK_SIZE, NULL,
                tskIDLE_PRIORITY + 2, &btn_task);
    NVIC_SetPriority(EXTI0_IRQn,
                     configMAX_SYSCALL_INTERRUPT_PRIORITY >> (8 - __NVIC_PRIO_BITS));
    NVIC_EnableIRQ(EXTI0_IRQn);           /* only after btn_task is set */
    vTaskStartScheduler();
    for (;;) { }
}
```

`ulTaskNotifyTake()`의 첫 인자가 `pdTRUE`면 깨어날 때 값을 0으로 지워 binary semaphore처럼, `pdFALSE`면 하나씩 줄여 counting semaphore처럼 동작합니다([task.h L3172-3177](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/task.h#L3172-L3177)). `btn_task`는 `xTaskCreate()`가 채우므로 EXTI 인터럽트는 그 뒤에 켭니다. `btn_task`가 NULL인 채로 ISR이 돌면 `vTaskNotifyGiveFromISR()` 안의 `configASSERT( xTaskToNotify )`에 걸립니다([tasks.c L8219](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L8219)).

FreeRTOS 문서([Task Notifications](https://www.freertos.org/Documentation/02-Kernel/02-Kernel-features/03-Direct-to-task-notifications/01-Task-notifications))는 notification으로 task를 깨우는 것이 binary semaphore를 거치는 것보다 45% 빠르다고 적습니다. 측정 조건은 V8.1.2의 semaphore 구현, GCC `-O2`, `configASSERT()` 미정의이고, V8.2.0 이상의 개선된 구현과 비교하면 35%입니다. 이 문서는 V11 기준 수치를 주지 않습니다. RAM은 따로 만드는 객체가 없어서 줄어듭니다. Notification 값과 상태는 `configUSE_TASK_NOTIFICATIONS`가 1(기본값)이면 모든 TCB에 이미 들어 있고([tasks.c L434-437](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L434-L437), [FreeRTOS.h L2793-2795](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/FreeRTOS.h#L2793-L2795)), semaphore는 구조체를 담을 메모리 블록을 heap이나 호출자가 준 `StaticSemaphore_t`에 따로 둡니다([semphr.h L120-127](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h#L120-L127)).

대신 notification이 하지 못하는 일이 있고, 이것이 semaphore를 남겨 두는 이유입니다.

- **받는 task가 여럿.** 같은 문서가 드는 제약입니다. 위 DMA 풀처럼 여러 task가 같은 자원을 기다리는 구조는 semaphore의 event list가 맡습니다.
- **보내는 쪽이 받는 task를 모름.** `vTaskNotifyGiveFromISR()`은 task handle을, `xSemaphoreGiveFromISR()`은 semaphore handle을 받습니다. Semaphore를 쓰면 driver는 어느 task가 처리하는지 몰라도 되고, 처리 task를 바꿔도 ISR 코드는 그대로입니다.
- **ISR이 받는 쪽.** Notification을 받는 함수는 task용뿐이고 `FromISR` 변종이 없습니다. `xSemaphoreTakeFromISR()`은 있지만 block time 인자가 없어 count가 0이면 바로 `pdFALSE`를 돌려주고, `semphr.h`는 이것이 ISR이 자원 풀에서 하나를 가져갈 때 정도에만 쓸모 있다고 적습니다([L656-675](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h#L656-L675)).
- **넘침 감지.** `vTaskNotifyGiveFromISR()`은 notification 값을 상한 검사 없이 하나 올립니다([tasks.c L8252](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L8252)). Counting semaphore는 max에서 `errQUEUE_FULL`을 돌려주므로 위 `pkt_dropped`처럼 잃은 event를 셀 수 있습니다.

## 자주 보는 함정

> `*FromISR` 변종을 빼먹음

```c
void EXTI1_IRQHandler(void) {
    xSemaphoreGive(sem);    /* task-only macro called from an ISR */
}
```

`xSemaphoreGive()`는 ISR에서 쓰면 안 된다고 명시되어 있지만([semphr.h L407-408](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h#L407-L408)), 컴파일은 그대로 됩니다. GCC `ARM_CM4F` port에서는 이 macro가 거치는 `vPortEnterCritical()`이 interrupt 문맥에서 불리면 `configASSERT`에 걸리게 되어 있으므로([port.c L480-488](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c#L480-L488)), `configASSERT()`를 정의해 두어야 이 실수가 실행 중에 드러납니다.

> Event count의 초기값을 max로

```c
pkt_count = xSemaphoreCreateCounting(64, 64);   /* starts with 64 phantom events */
```

`semphr.h`는 event count 용도면 initial을 0, resource pool 용도면 max와 같게 두는 것이 바람직하다고 적습니다([L970-990](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h#L970-L990)). 위처럼 만들면 task가 아무 packet도 오지 않았는데 `parse_one()`을 64번 부릅니다. 거꾸로 DMA 풀을 initial 0으로 만들면 처음 give 하는 쪽이 없으므로 take가 한 번도 성공하지 못합니다.

## 정리 — 무엇을 고르나

| 상황 | 고를 것 | 근거 |
|------|---------|------|
| ISR → task 하나, 횟수는 상관없음 | Task notification, `ulTaskNotifyTake(pdTRUE, …)` | 따로 만드는 객체가 없음 |
| ISR → task 하나, 횟수를 셈 | Counting semaphore, initial 0 | max에서 `errQUEUE_FULL`로 잃은 event를 셀 수 있음 |
| 받는 task가 여럿이거나 보내는 쪽이 받는 task를 모름 | Binary·counting semaphore | Notification은 task handle을 지정함 |
| N개 자원을 여러 task가 나눠 씀 | Counting semaphore, initial = max + 자원 비트맵 | Semaphore는 남은 개수만 세고, 어느 자원인지는 비트맵이 정함 |
| 공유 자원을 한 번에 한 task만 씀 | Mutex ([6-05](/blog/embedded/modern-recipes/part6-05-mutex-usage)) | Binary semaphore에는 priority inheritance가 없음([6-10](/blog/embedded/modern-recipes/part6-10-priority-inversion)) |

다음 편은 **Mutex 활용**입니다. Priority inheritance와 recursive lock을 다룹니다.

## 관련 항목

- [PRTOS 1-07: Semaphore 개념 분해](/blog/embedded/rtos/practical-internals/part1-07-semaphore)
- [PRTOS 3-02: Semaphore 내부 구현 추적](/blog/embedded/rtos/practical-internals/part3-02-semaphore-impl)
- [6-05: Mutex 활용](/blog/embedded/modern-recipes/part6-05-mutex-usage)
- [6-06: Queue 활용](/blog/embedded/modern-recipes/part6-06-queue-usage)
- [6-07: Event Group 활용](/blog/embedded/modern-recipes/part6-07-event-group)
- [6-09: ISR-Safe API 설계](/blog/embedded/modern-recipes/part6-09-isr-api)
