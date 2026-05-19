---
title: "Ch 6: Interrupt Management"
date: 2026-05-09T06:00:00
description: "FromISR·deferred processing·Cortex-M NVIC — ISR과 태스크의 안전한 다리."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 6
tags: [freertos, interrupt, isr, deferred-processing]
type: book-review
bookTitle: "Mastering the FreeRTOS Real Time Kernel"
bookAuthor: "Richard Barry"
draft: false
---

## 한 줄 요약

> **"ISR은 *짧게, FreeRTOS API는 `...FromISR` 변형으로, 종료 직전 `portYIELD_FROM_ISR`로 우선순위 점검*. Cortex-M에서는 *`configMAX_SYSCALL_INTERRUPT_PRIORITY` 이하 우선순위 ISR만 RTOS API 호출 가능*입니다."**

ISR은 *비동기 진입점*이라 태스크와 *동기화 규칙이 다릅니다*. FreeRTOS는 *ISR-safe 변형 API*를 별도로 제공하고, *어떤 인터럽트가 RTOS API를 부를 수 있는지를 우선순위로 가릅니다*. Cortex-M의 *NVIC 우선순위 비트 표현*까지 이해해야 *왜 내 ISR이 갑자기 HardFault인지*가 풀립니다.

이번 장에서는 *`...FromISR` 패밀리의 패턴*, *`xHigherPriorityTaskWoken`과 `portYIELD_FROM_ISR`의 의미*, *deferred interrupt processing*, *Cortex-M 우선순위 비트의 함정*, *`configMAX_SYSCALL_INTERRUPT_PRIORITY`*, *세마포·큐 시그널링*을 다룹니다.

## ISR이 태스크와 다른 점

```text
            태스크 컨텍스트                          ISR 컨텍스트
            ────────────                            ────────
   스택      자신의 task stack                       main/MSP stack (Cortex-M)
   block     가능                                    불가 (block은 task만)
   API       xQueueSend / xSemaphoreTake / ...      xQueueSendFromISR / ... (전용)
   priority  configMAX_PRIORITIES-1 ~ 0              NVIC priority (별개 체계)
   재진입    스케줄러가 직접 관리                     하드웨어 nested IRQ
```

ISR은 *block할 수 없습니다*. `vTaskDelay`·`xSemaphoreTake`·`xQueueSend`를 *ISR에서 부르면 crash*입니다. *반드시 `...FromISR` 변형*을 씁니다.

## ...FromISR — 표준 패턴

```c
void EXTI0_IRQHandler(void)
{
    BaseType_t xHigherPriorityTaskWoken = pdFALSE;

    /* 1) 인터럽트 원인 청소 */
    __HAL_GPIO_EXTI_CLEAR_IT(GPIO_PIN_0);

    /* 2) RTOS API 호출 (FromISR 변형) */
    xSemaphoreGiveFromISR(xButtonSem, &xHigherPriorityTaskWoken);

    /* 3) 종료 직전 priority 점검 */
    portYIELD_FROM_ISR(xHigherPriorityTaskWoken);
}
```

세 단계가 *모든 ISR의 골격*입니다.

| 단계 | 의미 |
|------|------|
| `xHigherPriorityTaskWoken = pdFALSE` | 출력 플래그 초기화 |
| `...FromISR(&xHigherPriorityTaskWoken)` | 호출이 *블록된 더 높은 우선순위 태스크를 깨운다면* `pdTRUE` 설정 |
| `portYIELD_FROM_ISR(...)` | `pdTRUE`이면 *ISR 종료 직후 context switch 트리거* |

`portYIELD_FROM_ISR`을 빼먹으면 *깨워진 더 높은 태스크가 즉시 실행되지 않고 다음 tick까지 대기*합니다. *시간 임계 응답에서 수십 ms 지연*의 흔한 원인입니다.

## ISR-Safe API 목록

| 일반 API | ISR 변형 |
|---------|---------|
| `xQueueSend` | `xQueueSendFromISR` |
| `xQueueReceive` | `xQueueReceiveFromISR` |
| `xQueueOverwrite` | `xQueueOverwriteFromISR` |
| `xSemaphoreGive` | `xSemaphoreGiveFromISR` |
| `xSemaphoreTake` | `xSemaphoreTakeFromISR` (드물게 씀) |
| `xTaskNotify` | `xTaskNotifyFromISR` / `vTaskNotifyGiveFromISR` |
| `xTimerStart` | `xTimerStartFromISR` |
| `xTaskGetTickCount` | `xTaskGetTickCountFromISR` |

규칙 — *함수 이름에 `FromISR`가 없으면 ISR에서 부르지 않습니다*.

## Deferred Interrupt Processing — 짧은 ISR + 태스크 처리

ISR 안에서는 *원인 청소 + 신호 전달*만 합니다. *데이터 가공·통신·파일 쓰기 같은 무거운 일*은 *태스크에 위임*합니다. 이 패턴이 *deferred interrupt processing*입니다.

```text
ISR (짧고 빠름)                       Deferred Task (긴 일)
   ↓                                    ↑
   1. HW register 청소                  4. Take semaphore (block 가능)
   2. (선택) DMA 시작                   5. 데이터 처리·전송
   3. xSemaphoreGiveFromISR ───────────►
                                         6. 다시 take semaphore (loop)
```

```c
static SemaphoreHandle_t xUartRxSem;

void USART2_IRQHandler(void)
{
    BaseType_t xWoken = pdFALSE;

    if(USART2->SR & USART_SR_RXNE) {
        uint8_t ch = USART2->DR;
        ring_buffer_push(ch);                          /* 짧은 일 */
        xSemaphoreGiveFromISR(xUartRxSem, &xWoken);
    }

    portYIELD_FROM_ISR(xWoken);
}

void prvUartRxTask(void *pv)
{
    for(;;) {
        if(xSemaphoreTake(xUartRxSem, portMAX_DELAY) == pdTRUE) {
            uint8_t ch;
            while(ring_buffer_pop(&ch)) {
                parse_protocol(ch);                    /* 긴 일 */
            }
        }
    }
}
```

이 패턴의 *이점*은 세 가지입니다.

1. *ISR이 짧아져 인터럽트 응답성 보장*
2. *태스크 안에서 RTOS API 자유롭게 사용*
3. *우선순위 조정으로 처리 순서 제어 가능*

## Cortex-M NVIC 우선순위 비트 — 가장 흔한 함정

Cortex-M의 NVIC는 *우선순위 레지스터에 8 비트의 자리*를 두지만 *실제 구현 비트 수는 칩마다 다릅니다*.

```text
NVIC IPR 레지스터 (8-bit per IRQ)
   bit 7  6  5  4   3  2  1  0
        ╲ ╲ ╲ ╲   ╱ ╱ ╱ ╱
         priority  unused (read-as-zero)
            ↑
       구현 비트는 MSB 쪽

Cortex-M3/M4 (STM32F4 등): 보통 4 비트 구현 → 16 단계
   유효 비트 위치: bit 7..4
   실제 priority 0  → register 0x00
   실제 priority 5  → register 0x50  (5 << 4)
   실제 priority 15 → register 0xF0

Cortex-M0/M0+: 보통 2 비트 구현 → 4 단계
   유효 비트 위치: bit 7..6
   실제 priority 0 → 0x00
   실제 priority 1 → 0x40
   실제 priority 3 → 0xC0

특징
   * 숫자가 작을수록 우선순위 높음 (FreeRTOS task와 반대)
   * priority 0 = 가장 높음 (선점 불가, Reset 다음)
   * 0xFF = 가장 낮음
```

```text
configPRIO_BITS의 의미 (FreeRTOSConfig.h)
   Cortex-M3/M4 STM32F4:   #define configPRIO_BITS 4
   Cortex-M7 STM32H7:      #define configPRIO_BITS 4  (보통)
   Cortex-M0+ STM32G0:     #define configPRIO_BITS 2

값이 틀리면 configMAX_SYSCALL_INTERRUPT_PRIORITY 계산이 깨져
ISR이 silent하게 잘못된 우선순위로 동작
```

## configMAX_SYSCALL_INTERRUPT_PRIORITY — 핵심 경계

FreeRTOS는 *RTOS API를 부를 수 있는 ISR의 우선순위 상한*을 정합니다. *그 위 (= 더 높은 우선순위, 즉 숫자가 더 작은)*의 ISR은 *RTOS API를 부르면 안 됩니다*.

```text
Cortex-M3/M4 (configPRIO_BITS=4) 가정

  level   |   register value   |   RTOS API 호출
  ────────────────────────────────────────────
   0      |   0x00             |  NO  (kernel mask 무시, never preempted by kernel)
   1      |   0x10             |  NO
   2      |   0x20             |  NO
   3      |   0x30             |  NO
   4      |   0x40             |  NO
   5      |   0x50             |  YES ◄── configMAX_SYSCALL_INTERRUPT_PRIORITY = 5
   6      |   0x60             |  YES
   ...    |   ...              |  YES
  15      |   0xF0             |  YES (configKERNEL_INTERRUPT_PRIORITY)

  configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY = 5  (4-bit 표현)
  configMAX_SYSCALL_INTERRUPT_PRIORITY = 5 << (8-4) = 0x50
```

```c
/* FreeRTOSConfig.h Cortex-M4 예 */
#define configPRIO_BITS                                 4
#define configLIBRARY_LOWEST_INTERRUPT_PRIORITY         0xF
#define configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY    5

#define configKERNEL_INTERRUPT_PRIORITY \
    (configLIBRARY_LOWEST_INTERRUPT_PRIORITY << (8 - configPRIO_BITS))
#define configMAX_SYSCALL_INTERRUPT_PRIORITY \
    (configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY << (8 - configPRIO_BITS))
```

`NVIC_SetPriority`로 ISR 우선순위를 *5 이상*으로 설정한 ISR만 RTOS API를 부릅니다.

```c
/* OK — priority 6, RTOS API 호출 가능 */
NVIC_SetPriority(USART2_IRQn, 6);

/* 위험 — priority 3, RTOS API 호출 시 assert 또는 crash */
NVIC_SetPriority(EXTI0_IRQn, 3);
```

### M0/M0+의 특수성

Cortex-M0은 *BASEPRI 레지스터가 없습니다*. FreeRTOS는 *PRIMASK로 임시 IRQ 마스킹*을 합니다.

```text
Cortex-M0/M0+
   configMAX_SYSCALL_INTERRUPT_PRIORITY = 192  (= 3 << 6, 2-bit 구현 가정)
   PRIMASK 토글로 critical section 구현
   → 모든 IRQ가 잠시 차단됨 (선택적 차단 불가)
```

## 우선순위 그룹 — Preemption vs Sub

Cortex-M3/M4/M7은 *우선순위 비트를 preemption priority와 sub-priority로 분할*할 수 있습니다. FreeRTOS는 *반드시 preemption priority가 모든 비트를 차지*해야 합니다.

```c
/* 부팅 초기에 반드시 호출 */
NVIC_SetPriorityGrouping(0);   /* 4-bit 전부 preemption, 0-bit sub */
```

CMSIS 기본값은 NVIC_PRIORITYGROUP_4입니다. 만약 다른 값이면 *같은 우선순위 그룹 안에서 nested preemption이 불가*해 *FreeRTOS의 critical section 가정이 깨집니다*.

## 세마포 시그널링 패턴

가장 흔한 ISR↔태스크 다리는 *binary semaphore*입니다.

```c
SemaphoreHandle_t xDataReadySem;

void DMA1_Stream1_IRQHandler(void)
{
    BaseType_t xWoken = pdFALSE;
    if(DMA1->LISR & DMA_LISR_TCIF1) {
        DMA1->LIFCR = DMA_LIFCR_CTCIF1;            /* TC flag clear */
        xSemaphoreGiveFromISR(xDataReadySem, &xWoken);
    }
    portYIELD_FROM_ISR(xWoken);
}

void prvDmaProcTask(void *pv)
{
    for(;;) {
        xSemaphoreTake(xDataReadySem, portMAX_DELAY);
        process_dma_buffer();
    }
}
```

여러 발생 횟수를 *세어야* 하면 *counting semaphore*.

```c
xSemaphoreCreateCounting(maxCount=10, initialCount=0);
```

ISR이 *give*마다 count++, 태스크가 *take*마다 count--. count가 0이면 take가 block입니다.

### Task Notification — 더 빠름

`xTaskNotifyGiveFromISR`는 *세마포의 절반 cost*로 같은 의미를 구현합니다.

```c
TaskHandle_t xConsumerHandle;

void EXTI0_IRQHandler(void) {
    BaseType_t xWoken = pdFALSE;
    EXTI->PR = EXTI_PR_PR0;
    vTaskNotifyGiveFromISR(xConsumerHandle, &xWoken);
    portYIELD_FROM_ISR(xWoken);
}

void prvConsumer(void *pv) {
    for(;;) {
        ulTaskNotifyTake(/*clearOnExit=*/pdTRUE, portMAX_DELAY);
        do_work();
    }
}
```

*1 producer ISR → 1 consumer 태스크*면 task notification이 *세마포보다 짧고 빠릅니다*.

## 큐 시그널링 패턴

데이터까지 함께 넘기려면 큐를 씁니다.

```c
typedef struct { uint32_t ts; uint16_t adc; } Sample_t;
QueueHandle_t xSampleQ;     /* xQueueCreate(32, sizeof(Sample_t)) */

void ADC_IRQHandler(void)
{
    BaseType_t xWoken = pdFALSE;
    if(ADC1->SR & ADC_SR_EOC) {
        Sample_t s = { .ts = xTaskGetTickCountFromISR(), .adc = ADC1->DR };
        xQueueSendFromISR(xSampleQ, &s, &xWoken);
    }
    portYIELD_FROM_ISR(xWoken);
}
```

ISR 안에서 *블로킹 timeout이 없다*는 점 유의합니다. 큐가 가득 차면 *바로 실패*하므로 *실패 카운터*를 두는 것이 안전합니다.

## 자주 하는 실수와 troubleshooting

```text
증상                                            원인                                     해결
─────────────────────────────────────────────────────────────────────────────────────────────
ISR 안에서 xQueueSend(non-FromISR) → crash    잘못된 API 사용                          FromISR 변형으로
configMAX_SYSCALL_INTERRUPT_PRIORITY 이상 우선순위 ISR이 RTOS API 호출 → assert  ISR 우선순위 하향
portYIELD_FROM_ISR 빼먹음                     깨어난 태스크 즉시 실행 안 됨            ISR 끝에 항상 호출
configPRIO_BITS 틀림                          우선순위 mask 계산이 어긋남               칩 datasheet 확인
NVIC_SetPriorityGrouping이 0이 아님           critical section 가정 깨짐              초기화에서 0으로
configKERNEL_INTERRUPT_PRIORITY 0             SVC·PendSV가 최고 우선순위 → block 못 됨  0xF (가장 낮음)으로
ISR에서 printf 호출                            stdout 락 충돌·스택 사용 大              ring buffer로 deferred
HardFault 디버거 진입 시 IPSR=3              MemManage·BusFault·UsageFault             스택 overflow·misaligned access 확인
세마포 give로 데이터까지 넘기려고 함         세마포는 신호만                          큐 사용
xTaskGetTickCount in ISR → wrong              일반 API 사용                            xTaskGetTickCountFromISR 사용
```

## 정리

- ISR은 *block 불가*입니다. RTOS API는 *반드시 `...FromISR` 변형*을 씁니다.
- 표준 ISR 골격은 *`xHigherPriorityTaskWoken=pdFALSE` → `...FromISR(&xHigherPriorityTaskWoken)` → `portYIELD_FROM_ISR(xHigherPriorityTaskWoken)`*입니다.
- *Deferred interrupt processing*은 *ISR은 신호만, 무거운 일은 태스크에서*를 의미합니다. 응답성과 코드 단순성을 모두 얻습니다.
- Cortex-M NVIC 우선순위는 *숫자가 작을수록 높음*입니다. *FreeRTOS task priority와 반대 방향*이라 혼동에 주의합니다.
- 우선순위 비트는 *구현 칩마다 다릅니다*. `configPRIO_BITS`를 *데이터시트 기준으로 정확히* 설정해야 mask 계산이 맞습니다.
- *`configMAX_SYSCALL_INTERRUPT_PRIORITY`*는 *RTOS API를 부를 수 있는 ISR의 우선순위 상한*입니다. 그보다 *높은 (숫자 작은) ISR*은 RTOS API를 부르면 안 됩니다.
- `NVIC_SetPriorityGrouping(0)`을 *부팅 초입에 한 번* 호출합니다. preemption priority가 *모든 비트를 차지*하도록 강제합니다.
- *1 ISR → 1 task의 작은 신호*는 *task notification*이 세마포보다 빠릅니다. *데이터까지 넘기면* 큐를, *발생 횟수를 세야 하면* counting semaphore를 씁니다.

## 다음 편

[Ch 7: Resource Management](/blog/embedded/rtos/freertos-mastering/chapter07-resource-management)에서 *공유 자원 보호*를 다룹니다. *Critical section, scheduler suspension, mutex (priority inheritance 포함), recursive mutex, gatekeeper task*, 그리고 *priority inversion 문제와 회피*를 봅니다.

## 관련 항목

- [Ch 3: Task Management](/blog/embedded/rtos/freertos-mastering/chapter03-task-management)
- [Ch 4: Queue Management](/blog/embedded/rtos/freertos-mastering/chapter04-queue-management)
- [Ch 5: Software Timer Management](/blog/embedded/rtos/freertos-mastering/chapter05-software-timers) — `xTimerXxxFromISR`
- [Ch 7: Resource Management](/blog/embedded/rtos/freertos-mastering/chapter07-resource-management)
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/) — ISR 입출구 코드
- [ESP32-C3 Mastering Ch 10: FreeRTOS](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos)
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/) — ISR 패턴
- [원문 — FreeRTOS ISR Safety](https://www.freertos.org/a00020.html)
- [원문 — Cortex-M FreeRTOS Port Notes](https://www.freertos.org/RTOS-Cortex-M3-M4.html)
