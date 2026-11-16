---
title: "ISR-Safe API 설계 — Reentrant·Atomic·Defer 패턴"
slug: "embedded/modern-recipes/part6-09-isr-api"
date: 2026-04-15T09:08:00
description: "ISR 안전 함수 작성. Reentrant, atomic 변수, deferred work, FromISR variant."
series: "Modern Embedded Recipes"
seriesOrder: 71
tags: [recipes, isr, reentrant, atomic, defer]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"ISR에서 부르는 함수는 막히지 않고, 짧고, 끊긴 코드와 공유하는 데이터를 깨뜨리지 않아야 합니다."** RTOS API는 `FromISR` 변종만 쓰고, task와 나누는 변수는 한 번의 load·store로 끝나는지 확인합니다.

실행 환경은 [6-01](/blog/embedded/modern-recipes/part6-01-rtos-decision)과 같습니다(FreeRTOS V11.2.0 `ARM_CM3`, QEMU 11.1.3 `mps2-an385` `-icount shift=5`). 아키텍처 규칙은 ARMv7-M Architecture Reference Manual(DDI 0403E.b)에서 가져왔습니다.

## ISR에서 부르는 함수의 조건

| 조건 | 뜻 |
|---|---|
| 막히지 않음 | 대기, sleep, 다른 쪽이 풀어 줘야 하는 lock이 없음 |
| 짧음 | 이 ISR이 도는 동안 같거나 낮은 우선순위 인터럽트와 모든 task가 기다림 |
| 재진입 안전 | 끊긴 코드가 같은 함수 안에 있어도 서로의 상태를 덮지 않음 |
| 공유 데이터 보호 | task와 나누는 변수는 한 번의 접근으로 끝나거나, 접근 동안 인터럽트를 막음 |

## 재진입 안전

```c
/* not reentrant: shared static state */
static int last_value;

int compute(int x) {
    last_value = x * 2;
    return last_value;
}

/* reentrant: only arguments and locals */
int compute2(int x) {
    return x * 2;
}
```

task가 `compute()`의 두 줄 사이에서 끊기고 ISR이 같은 함수를 부르면, task가 돌아와 읽는 `last_value`는 ISR이 쓴 값입니다. 인자와 지역 변수만 쓰는 함수는 호출마다 자기 stack을 쓰므로 이런 일이 없습니다.

C 표준 라이브러리의 `strtok()`, `rand()`는 호출 사이의 상태를 숨은 static에 두므로 같은 문제가 있습니다. POSIX의 `strtok_r()`, `rand_r()`은 그 상태를 호출자가 넘깁니다.

## 한 번의 접근으로 끝나는 것

DDI 0403E.b A3.5.3("Atomicity in the ARM architecture")은 ARMv7-M에서 single-copy atomic인 접근을 "All byte accesses", "All halfword accesses to halfword-aligned locations", "All word accesses to word-aligned locations"로 듭니다. 그리고 LDRD·STRD·LDM·STM 같은 명령은 "a sequence of word-aligned word accesses"이고 그 각 word만 atomic이라고 적습니다.

여기서 두 가지가 나옵니다.

- **정렬된 32-bit 변수 하나를 읽거나 쓰는 것**은 한 번에 끝납니다.
- **`counter++`는 load, add, store 세 명령**이라 한 번에 끝나지 않습니다. 그 사이에 ISR이 같은 변수를 바꾸면 그 변경을 덮어씁니다. **64-bit 변수**는 word 두 개라, 두 word 사이에 바뀔 수 있습니다.

### 측정

빠른 TIMER0 인터럽트(200 timer clock마다)와 task가 32-bit counter를 함께 `++`하고, ISR이 64-bit 값을 `0x00000000FFFFFFFF`와 `0x0000000100000000` 사이에서 바꾸는 동안 task가 그 값을 읽었습니다.

```c
/* race.c: a fast TIMER0 IRQ and a task share counters.
   1) both do counter++ on a 32-bit word
   2) the IRQ alternates a 64-bit value between 0x00000000FFFFFFFF and
      0x0000000100000000; the task reads it and checks for torn values */
#include "FreeRTOS.h"
#include "task.h"
extern void pr(const char *, ...); extern void hosted_exit(int);

#define TIMER0_CTRL   (*(volatile uint32_t *)0x40000000)
#define TIMER0_RELOAD (*(volatile uint32_t *)0x40000008)
#define TIMER0_INTCLR (*(volatile uint32_t *)0x4000000C)
#define NVIC_ISER0    (*(volatile uint32_t *)0xE000E100)
#define NVIC_IPR8     (*(volatile uint8_t  *)0xE000E408)

static volatile uint32_t counter, isr_count;
static volatile uint64_t stamp = 0x00000000FFFFFFFFull;

void TIMER0_IRQHandler(void) {
    TIMER0_INTCLR = 1;
    counter++;                                   /* RMW in the ISR */
    isr_count++;
    stamp = (stamp == 0x00000000FFFFFFFFull) ? 0x0000000100000000ull
                                             : 0x00000000FFFFFFFFull;
}

static void t(void *a) {
    (void)a;
    NVIC_IPR8 = 6u << 5; NVIC_ISER0 = 1u << 8;
    TIMER0_RELOAD = 200;                         /* every 200 timer clocks */
    TIMER0_CTRL = (1u << 3) | 1u;

    for (uint32_t i = 0; i < 1000000u; i++) counter++;   /* RMW in the task */
    uint32_t isr = isr_count, c = counter;
    pr("32-bit counter: task added 1000000, ISR added %u, counter = %u, lost %u\n",
       (unsigned)isr, (unsigned)c, (unsigned)(1000000u + isr - c));

    uint32_t torn = 0;
    for (uint32_t i = 0; i < 1000000u; i++) {
#ifdef SPLIT_READ
        volatile uint32_t *w = (volatile uint32_t *)&stamp;
        uint64_t v = w[0] | ((uint64_t)w[1] << 32);   /* two separate loads */
#else
        uint64_t v = stamp;                      /* GCC -O2 emits one LDRD */
#endif
        if (v != 0x00000000FFFFFFFFull && v != 0x0000000100000000ull) torn++;
    }
    TIMER0_CTRL = 0;
    pr("64-bit value: %u torn reads in 1000000\n", (unsigned)torn);
    hosted_exit(0);
}

int main(void) { xTaskCreate(t, "t", 256, NULL, 1, NULL); vTaskStartScheduler(); return 0; }
```

```bash
./build.sh race.c              && qemu-system-arm -M mps2-an385 -nographic -semihosting -icount shift=5 -kernel race.elf
./build.sh race.c -DSPLIT_READ && qemu-system-arm ... -kernel race.elf    # second line only
```

```text
32-bit counter: task added 1000000, ISR added 21839, counter = 1008737, lost 13102
64-bit value: 0 torn reads in 1000000
64-bit value: 4362 torn reads in 1000000
```

- task의 `counter++` 1,000,000번과 ISR의 21,839번 가운데 13,102번이 사라졌습니다. task가 load와 store 사이에서 끊기면, ISR이 올린 값을 task의 store가 덮습니다.
- 64-bit 값을 GCC `-O2`가 만든 `ldrd` 한 명령으로 읽으면 QEMU에서는 torn read가 0이었습니다. QEMU는 명령 사이에서만 인터럽트를 받기 때문이고, 아키텍처는 위 인용처럼 두 word 사이의 원자성을 보장하지 않습니다. word 두 개를 따로 읽게 하면(`-DSPLIT_READ`) 1,000,000번 중 4,362번이 두 값을 섞은 값이었습니다.

그래서 task 쪽의 read-modify-write나 64-bit 값은 아래 critical section 안에서 다룹니다.

## ISR → task: SPSC ring

```c
#define RB_SIZE 64u                       /* power of two */
static volatile uint8_t buf[RB_SIZE];
static volatile uint32_t head, tail;      /* ISR writes head, task writes tail */

void UART_RX_ISR(uint8_t byte) {
    uint32_t h = head;
    if (h - tail < RB_SIZE) {             /* not full */
        buf[h % RB_SIZE] = byte;
        head = h + 1;                     /* one aligned word store */
    }                                     /* else: drop */
}

int rb_get(uint8_t *out) {                /* task side */
    uint32_t t = tail;
    if (t == head) return 0;              /* empty */
    *out = buf[t % RB_SIZE];
    tail = t + 1;
    return 1;
}
```

`head`는 ISR만, `tail`은 task만 씁니다. 각자 상대의 index는 읽기만 하고, 자기 index는 정렬된 word 하나를 store해 올리므로 lock이 필요 없습니다. 단일 코어 Cortex-M에서 ISR과 task 사이에는 이것으로 충분하고, 멀티코어나 cache가 낀 경우의 memory order는 [9-01: Lock-Free Ring Buffer](/blog/embedded/modern-recipes/part9-01-lock-free-ring)가 다룹니다.

## FromISR 변종

```c
void ISR(void) {
    BaseType_t woken = pdFALSE;
    xQueueSendFromISR(rx_q, &byte, &woken);
    portYIELD_FROM_ISR(woken);
}
```

FreeRTOS는 ISR용 API를 이름 끝 `FromISR`로 따로 둡니다. 막히지 않으므로 timeout 인자가 없고, 더 높은 우선순위 task를 깨웠는지를 `woken`으로 돌려줍니다. ISR을 나가기 전에 `portYIELD_FROM_ISR(woken)`을 부르면 그 task로 바로 전환됩니다. 일반 API를 ISR에서 부르면 [6-01](/blog/embedded/modern-recipes/part6-01-rtos-decision)의 실행처럼 `configASSERT`에 걸립니다.

## Deferred work

ISR은 데이터를 모으고 task를 깨우기만 하고, 처리는 task가 합니다. 위 SPSC ring과 task notification을 합치면 이렇습니다.

```c
static TaskHandle_t rx_task;

void UART_IRQHandler(void) {
    BaseType_t woken = pdFALSE;
    UART_RX_ISR(read_rx_byte());          /* into the ring above */
    vTaskNotifyGiveFromISR(rx_task, &woken);
    portYIELD_FROM_ISR(woken);
}

void rx_task_fn(void *arg) {
    uint8_t b;
    for (;;) {
        ulTaskNotifyTake(pdTRUE, portMAX_DELAY);
        while (rb_get(&b)) process(b);
    }
}
```

task가 깨어나면 ring이 빌 때까지 꺼내므로, notification이 여러 번 합쳐져도 byte를 놓치지 않습니다. CAN 수신의 같은 구조(FIFO를 읽어 ring에 넣고 task가 처리)는 [5-10](/blog/embedded/modern-recipes/part5-10-can-communication)의 `CAN1_RX0_IRQHandler`에 있습니다.

## Critical section

```c
static inline uint32_t irq_save(void) {
    uint32_t primask = __get_PRIMASK();
    __disable_irq();
    return primask;
}

static inline void irq_restore(uint32_t primask) {
    __set_PRIMASK(primask);
}

/* task side */
uint32_t m = irq_save();
shared_counter++;
uint64_t ts = shared_stamp;
irq_restore(m);
```

이전 PRIMASK를 되돌리므로, 이미 인터럽트가 막힌 상태에서 불려도 나갈 때 잘못 풀지 않습니다. FreeRTOS를 쓰면 task에서는 `taskENTER_CRITICAL()`/`taskEXIT_CRITICAL()`을, ISR에서는 `taskENTER_CRITICAL_FROM_ISR()`/`taskEXIT_CRITICAL_FROM_ISR()`을 씁니다. Cortex-M3 port에서 이들은 PRIMASK가 아니라 BASEPRI를 `configMAX_SYSCALL_INTERRUPT_PRIORITY`로 올리므로, 그보다 우선순위가 높은(숫자가 작은) 인터럽트는 막히지 않습니다. 그런 인터럽트에서는 FreeRTOS API를 부르지 않습니다.

`configMAX_SYSCALL_INTERRUPT_PRIORITY`는 이미 NVIC priority register의 상위 bit에 맞춰 shift한 값입니다(이 설정에서 `5<<5`). BASEPRI에 직접 쓸 때 다시 shift하지 않습니다.

## ISR에서 printf

```c
void ISR(void) {
    printf("byte: %02X\n", byte);   /* formatting + UART output inside the ISR */
}
```

printf는 서식 처리와 출력이 끝날 때까지 ISR을 붙잡고, C 라이브러리 구현에 따라 lock이나 heap을 씁니다. ISR에서는 값을 ring에 넣고 출력은 task에서 합니다.

## 자주 하는 실수

> ⚠️ ISR에서 heap 할당

```c
void ISR(void) { void *p = pvPortMalloc(64); }
```

FreeRTOS `heap_4.c`의 `pvPortMalloc()`은 `vTaskSuspendAll()`로 scheduler를 멈추고 할당하는 task용 함수입니다. ISR에서는 미리 잡아 둔 static buffer나 pool을 씁니다.

> ⚠️ FromISR 변종 누락

```c
void ISR(void) { xQueueSend(q, &v, 0); }
```

[6-01](/blog/embedded/modern-recipes/part6-01-rtos-decision)의 실행에서 Cortex-M3 port의 `configASSERT`(port.c 438행)에 걸렸습니다. `xQueueSendFromISR()`을 씁니다.

> ⚠️ 긴 ISR

```c
void ISR(void) {
    process_packet();
}
```

이 ISR이 도는 동안 같거나 낮은 우선순위 인터럽트와 모든 task가 기다립니다. ISR에서는 ring에 넣고 task를 깨우기만 합니다.

> ⚠️ task 쪽 read-modify-write와 64-bit 공유 변수

```c
volatile uint64_t timestamp;          /* written by an ISR */
uint64_t t = timestamp;               /* task: two word reads may straddle an update */
```

위 측정처럼 32-bit `++`는 값을 잃고, 64-bit 값은 두 word 사이에서 섞일 수 있습니다. task 쪽 접근을 critical section으로 감쌉니다.

## 정리

- ISR에서 부르는 함수는 **막히지 않고, 짧고, 재진입 안전**해야 합니다.
- **정렬된 32-bit load·store 하나**만 한 번에 끝납니다(DDI 0403E.b A3.5.3). `++`와 64-bit 접근은 위 측정처럼 깨집니다.
- RTOS API는 **`FromISR` 변종**과 `portYIELD_FROM_ISR()`을 씁니다.
- ISR은 **ring에 넣고 task를 깨우기만** 하고, 처리는 task에서 합니다.
- task 쪽 공유 데이터 접근은 **PRIMASK 저장·복원 critical section**이나 FreeRTOS critical section으로 감쌉니다.

다음 편은 **Priority Inversion 분석**입니다.

## 관련 항목

- [6-01: RTOS 도입 결정](/blog/embedded/modern-recipes/part6-01-rtos-decision)
- [6-10: Priority Inversion 분석](/blog/embedded/modern-recipes/part6-10-priority-inversion)
- [9-01: Lock-Free Ring Buffer](/blog/embedded/modern-recipes/part9-01-lock-free-ring)
