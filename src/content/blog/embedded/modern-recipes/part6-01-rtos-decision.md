---
title: "RTOS 도입 결정 분석 — Super Loop vs RTOS 트레이드오프"
slug: "embedded/modern-recipes/part6-01-rtos-decision"
date: 2026-04-15T09:00:00
description: "Super-loop와 RTOS의 분기점, RAM/Flash 비용, 디버깅 복잡도, 결정 기준을 한 자리에 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 63
tags: [recipes, rtos, design]
topics: ["embedded"]
---

## 한 줄 요약

> **"RTOS가 주는 것은 blocking API이고, 내는 값은 stack·heap·context switch입니다."** 동시에 기다려야 하는 흐름이 여럿일 때 그 값을 치를 만한지 숫자로 보고 정합니다.

## 어떤 상황에서 쓰나

새 board에서 RTOS를 켤지 정해야 할 때입니다. 가속도 센서 한 개를 100 Hz로 읽어 UART로 보내기만 하는 펌웨어는 main loop 하나로 충분합니다. 디스플레이 갱신, 통신 stack, motor 제어, 사용자 입력이 각자 마감을 가지면 main loop 안에서 서로의 대기를 state machine으로 쪼개야 하고, 그 지점에서 RTOS의 blocking API가 값어치를 합니다.

이 글은 두 구조를 코드로 비교하고, 같은 일을 FreeRTOS로 했을 때 늘어나는 flash·RAM을 실제 빌드로 잽니다. 실행 환경은 [PRTOS 1-01](/blog/embedded/rtos/practical-internals/part1-01-why-rtos)과 같습니다: FreeRTOS-Kernel V11.2.0 `ARM_CM3` port + `heap_4`, arm-none-eabi-gcc 16.2.0 `-O2`, QEMU 11.1.3 `mps2-an385`(Cortex-M3) `-icount shift=5`. `pr()`은 UART0 출력, `hosted_exit()`은 semihosting 종료 함수입니다. QEMU 결과는 실제 보드의 시간이나 cycle이 아닙니다.

## 핵심 개념

판단 기준은 동시에 기다리는 흐름의 수입니다.

| 조건 | 구조 |
|------|-----------|
| 흐름이 적고 기다림이 거의 없음 | super-loop + ISR flag |
| 짧은 주기 몇 개와 명확한 상태 전이 | super-loop + state machine |
| 서로 독립인 흐름이 각자 기다려야 함 | RTOS |
| vendor 통신 stack(BLE, USB 등)이 특정 구조를 요구 | 그 stack의 요구를 따름 |

RTOS가 주는 것은 "기다리는 동안 다른 일을 하는" 코드를 순차 코드처럼 쓰는 능력입니다. `xQueueReceive(q, &m, portMAX_DELAY)` 한 줄이 state machine의 상태 하나를 대신합니다. 그 대가로 task마다 stack이, kernel 객체마다 heap이, 전환마다 context switch가 듭니다.

## 코드 / 실제 사용 예

아래 1~4절은 구조를 보이는 발췌라 `hw_init()`, `process_sensor()` 같은 애플리케이션 함수는 정의하지 않았습니다. 실행한 코드는 "측정" 절에 전부 있습니다.

### 1. Super-loop

```c
int main(void) {
    hw_init();
    while (1) {
        if (sensor_ready())    process_sensor();
        if (button_pressed())  handle_button();
        if (uart_rx_pending()) parse_command();
        __WFI();               /* sleep until the next interrupt */
    }
}
```

ISR은 flag만 세우고 main loop이 처리합니다. 한 처리 함수가 오래 걸리면 다른 flag의 처리도 그만큼 늦어지는 것이 이 구조의 한계입니다.

### 2. Super-loop + state machine

```c
typedef enum { IDLE, MEASURING, REPORTING } state_t;
static state_t state = IDLE;

void tick_1ms(void) {
    switch (state) {
    case IDLE:
        if (trigger_set()) { adc_start(); state = MEASURING; }
        break;
    case MEASURING:
        if (adc_done()) { state = REPORTING; }
        break;
    case REPORTING:
        uart_send_async(result_buf);
        state = IDLE;
        break;
    }
}
```

ADC를 기다리는 동안 다른 일을 하려고 "기다림"을 상태 하나(MEASURING)로 쪼갰습니다. 기다리는 곳이 늘수록 상태도 늘어납니다.

### 3. 같은 일을 RTOS로

```c
void task_sensor(void *arg) {
    for (;;) {
        if (xSemaphoreTake(adc_ready, portMAX_DELAY) == pdTRUE)
            xQueueSend(meas_q, &sample, 0);
    }
}

void task_uart(void *arg) {
    measurement_t m;
    for (;;) {
        xQueueReceive(meas_q, &m, portMAX_DELAY);
        uart_send_blocking(&m, sizeof(m));
    }
}
```

기다림이 `portMAX_DELAY`로 막히는 호출 한 줄이 되고, 상태 변수가 사라집니다.

### 4. Hybrid — ISR은 짧게, 처리는 task에서

```c
void TIM2_IRQHandler(void) {
    BaseType_t hp = pdFALSE;
    xSemaphoreGiveFromISR(motor_tick, &hp);
    portYIELD_FROM_ISR(hp);
}

void task_motor(void *arg) {
    for (;;) {
        xSemaphoreTake(motor_tick, portMAX_DELAY);
        pid_step();
    }
}
```

ISR은 semaphore만 주고, 계산은 우선순위가 높은 task가 합니다. ISR에서는 이름이 `FromISR`로 끝나는 API만 씁니다(아래 함정 참고).

## 측정

### RTOS가 더하는 flash·RAM

task 넷(stack 128 word = 512 B씩)과 queue 하나(8 × 4 B)를 만든 FreeRTOS 빌드와, 같은 "일 네 개"를 flag로 도는 super-loop 빌드를 비교했습니다. heap 사용량은 scheduler가 돈 뒤 `xPortGetMinimumEverFreeHeapSize()`로 읽었습니다.

```c
/* rtos4.c: four tasks with 512-byte stacks and one queue, then report heap use */
#include "FreeRTOS.h"
#include "task.h"
#include "queue.h"
extern void pr(const char *, ...); extern void hosted_exit(int);

static QueueHandle_t q;
static void worker(void *arg) { (void)arg; for (;;) vTaskDelay(10); }
static void reporter(void *arg) {
    (void)arg;
    vTaskDelay(5);
    pr("heap total %u, free now %u, min ever free %u\n", (unsigned)configTOTAL_HEAP_SIZE,
       (unsigned)xPortGetFreeHeapSize(), (unsigned)xPortGetMinimumEverFreeHeapSize());
    hosted_exit(0);
}
int main(void) {
    q = xQueueCreate(8, sizeof(uint32_t));
    for (int i = 0; i < 3; i++) xTaskCreate(worker, "w", 128, NULL, 1, NULL);  /* 128 words = 512 B */
    xTaskCreate(reporter, "r", 128, NULL, 2, NULL);
    vTaskStartScheduler();
    return 0;
}
```

```c
/* superloop.c: the same "four jobs" as flags polled in one loop */
#include <stdint.h>
extern void pr(const char *, ...); extern void hosted_exit(int);
static volatile uint32_t flags;
static void job(int i) { (void)i; }
int main(void) {
    flags = 0xF;
    for (int n = 0; n < 1; n++)
        for (int i = 0; i < 4; i++) if (flags & (1u << i)) { flags &= ~(1u << i); job(i); }
    pr("superloop done\n");
    hosted_exit(0);
    return 0;
}
```

```bash
# build.sh = arm-none-eabi-gcc -mcpu=cortex-m3 -mthumb -O2 -ffreestanding -nostdlib
#            + tasks.c queue.c list.c timers.c event_groups.c port.c heap_4.c
./build.sh rtos4.c && qemu-system-arm -M mps2-an385 -nographic -semihosting -icount shift=5 -kernel rtos4.elf
arm-none-eabi-size rtos4.elf superloop.elf
```

```text
heap total 65536, free now 60496, min ever free 60496
   text	   data	    bss	    dec	    hex	filename
  18200	      4	  65960	  84164	  148c4	rtos4.elf
   1272	      0	     12	   1284	    504	superloop.elf
```

| 항목 | super-loop | FreeRTOS (task 4개) |
|------|-----------:|--------------------:|
| text (flash) | 1,272 B | 18,200 B |
| heap에서 실제로 쓴 양 | 0 | 65,536 − 60,496 = 5,040 B |
| heap 밖 kernel 정적 변수(bss − heap) | — | 65,960 − 65,536 = 424 B |

5,040 B에는 사용자 task 넷과 queue 외에 scheduler가 만드는 idle task와 timer service task(이 설정에서 stack 256 word씩), timer queue가 들어 있습니다. `configTOTAL_HEAP_SIZE`(64 KiB)는 정적 배열로 bss에 잡히므로, RAM 예산은 bss 전체가 아니라 실제 heap 사용량에 여유를 더해 heap 크기를 정한 값으로 봅니다. flash 18,200 B에는 이 빌드가 넣은 `timers.c`·`event_groups.c`와 `configUSE_TRACE_FACILITY` 같은 설정이 포함돼 있어, 설정을 바꾸면 이 숫자도 바뀝니다.

### ISR에서 일반 API를 부르면

TIMER0(CMSDK timer, 10 ms 주기) 인터럽트에서 queue에 값을 넣는 코드를 `xQueueSend()`와 `xQueueSendFromISR()` 두 가지로 빌드했습니다.

```c
/* isr_misuse.c: TIMER0 IRQ sends to a queue with xQueueSend (wrong) or
   xQueueSendFromISR (right), selected by -DUSE_FROM_ISR */
#include "FreeRTOS.h"
#include "task.h"
#include "queue.h"
extern void pr(const char *, ...); extern void hosted_exit(int);

#define TIMER0_CTRL     (*(volatile uint32_t *)0x40000000)   /* CMSDK timer 0 */
#define TIMER0_RELOAD   (*(volatile uint32_t *)0x40000008)
#define TIMER0_INTCLR   (*(volatile uint32_t *)0x4000000C)
#define NVIC_ISER0      (*(volatile uint32_t *)0xE000E100)
#define NVIC_IPR8       (*(volatile uint8_t  *)0xE000E408)   /* IRQ 8 = TIMER0 */

static QueueHandle_t q;
static uint32_t n;

void TIMER0_IRQHandler(void) {
    TIMER0_INTCLR = 1;
    n++;
#ifdef USE_FROM_ISR
    BaseType_t woken = pdFALSE;
    xQueueSendFromISR(q, &n, &woken);
    portYIELD_FROM_ISR(woken);
#else
    xQueueSend(q, &n, 0);                         /* not an ISR API */
#endif
}

static void consumer(void *arg) {
    (void)arg;
    uint32_t v;
    for (int i = 0; i < 3; i++) {
        xQueueReceive(q, &v, portMAX_DELAY);
        pr("got %u at tick %u\n", (unsigned)v, (unsigned)xTaskGetTickCount());
    }
    hosted_exit(0);
}

static void start_timer(void *arg) {
    (void)arg;
    NVIC_IPR8 = 6u << 5;                          /* below configMAX_SYSCALL_INTERRUPT_PRIORITY (5<<5) */
    NVIC_ISER0 = 1u << 8;
    TIMER0_RELOAD = 25000000u / 100u;             /* 10 ms at the 25 MHz CMSDK clock */
    TIMER0_CTRL = (1u << 3) | 1u;                 /* IRQ enable, timer enable */
    vTaskDelete(NULL);
}

int main(void) {
    q = xQueueCreate(4, sizeof(uint32_t));
    xTaskCreate(consumer, "c", 256, NULL, 2, NULL);
    xTaskCreate(start_timer, "s", 256, NULL, 1, NULL);
    vTaskStartScheduler();
    return 0;
}
```

```bash
./build.sh isr_misuse.c                 && qemu-system-arm ... -kernel isr_misuse.elf
./build.sh isr_misuse.c -DUSE_FROM_ISR  && qemu-system-arm ... -kernel isr_misuse.elf
```

```text
# xQueueSend() in the ISR
ASSERT failed: portable/GCC/ARM_CM3/port.c line 438
# xQueueSendFromISR() in the ISR
got 1 at tick 10
got 2 at tick 20
got 3 at tick 30
```

`xQueueSend()`는 안에서 `taskENTER_CRITICAL()`을 쓰고, Cortex-M3 port의 `vPortEnterCritical()`은 처음 들어갈 때 `configASSERT( ( portNVIC_INT_CTRL_REG & portVECTACTIVE_MASK ) == 0 )`로 지금 인터럽트 안인지 검사합니다(`portable/GCC/ARM_CM3/port.c` 438행). 이 빌드는 `configASSERT`를 정의했으므로 첫 인터럽트에서 그 줄이 걸렸습니다. `FromISR` 버전은 10 ms 간격(tick 10, 20, 30)으로 값을 전달했습니다.

## 자주 보는 함정

> ⚠️ 기능 하나짜리 펌웨어에 task 여럿

```c
xTaskCreate(blink_red,   ...);
xTaskCreate(blink_green, ...);
```

위 측정에서 task 넷과 queue 하나가 heap 5,040 B와 flash 약 17 KB를 더했습니다. 동시에 기다려야 할 일이 실제로 몇 개인지 먼저 셉니다.

> ⚠️ Task stack을 재지 않고 정함

```c
xTaskCreate(t, "t", 128, NULL, 1, NULL);   /* 128 words: measured? */
```

`uxTaskGetStackHighWaterMark()`로 실행 중 최소 여유를 재서 정합니다. 절차는 [8-09](/blog/embedded/modern-recipes/part8-09-stack-analysis)에 있습니다.

> ⚠️ ISR에서 `FromISR`이 아닌 API

```c
void IRQ(void) { xQueueSend(q, &v, 0); }  /* not an ISR API */
```

위 실행처럼 `configASSERT`가 있으면 port.c 438행에서 걸립니다. `configASSERT`를 끄면 이 검사가 사라지므로 개발 빌드에서는 켜 둡니다.

> ⚠️ heap을 쓰는 생성 함수만 씀

```c
xTaskCreate(...);     /* dynamic */
xQueueCreate(...);    /* dynamic */
```

`task.h`는 `xTaskCreate()`가 heap에서 메모리를 잡는 것과 달리 `xTaskCreateStatic()`은 "allows a task to be created without using any dynamic memory allocation"이라고 적습니다. 객체를 모두 `*Static`으로 만들면 heap 크기를 정할 필요가 없어집니다.

## 정리

- RTOS의 값어치는 **blocking API**: 기다림을 상태 변수 대신 호출 한 줄로 씁니다.
- 이 빌드에서 task 4개 + queue 1개의 비용은 **flash 18,200 B(super-loop 1,272 B), heap 5,040 B**였습니다.
- ISR에서는 **`FromISR` API만**. `configASSERT`가 있으면 Cortex-M3 port가 잘못된 호출을 잡습니다.
- task stack은 **high water mark로 재서** 정하고, 가능하면 **`*Static` 생성**을 씁니다.
- 동시에 기다리는 흐름이 하나둘이면 super-loop로 시작하고, state machine이 기다림 때문에 불어날 때 RTOS로 옮깁니다.

다음 편은 **Task 설계 패턴**입니다. Periodic, event-driven, state machine을 어떤 기준으로 고를지 다룹니다.

## 관련 항목

- [PRTOS 1-01: Why RTOS](/blog/embedded/rtos/practical-internals/part1-01-why-rtos)
- [PRTOS 1-02: Task와 Thread](/blog/embedded/rtos/practical-internals/part1-02-task-thread)
- [6-02: Task 설계 패턴](/blog/embedded/modern-recipes/part6-02-task-design)
- [8-09: 스택 분석](/blog/embedded/modern-recipes/part8-09-stack-analysis)
