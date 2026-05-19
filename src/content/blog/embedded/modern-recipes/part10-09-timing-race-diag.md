---
title: "10-09: 타이밍/Race 진단 — Heisenbug 잡기"
date: 2026-05-16T23:00:00
description: "printf로 race가 사라지는 이유와 SWO/RTT·DWT 사이클 카운터·GPIO pulse로 non-intrusive하게 race를 가시화하는 방법."
series: "Modern Embedded Recipes"
seriesOrder: 119
tags: [recipes, debugging, race, timing]
---

## 한 줄 요약

> **"Race condition은 *관찰 자체가 race를 사라지게* 만드는 가장 까다로운 버그입니다."** Printf 대신 GPIO pulse·SWO·DWT cycle count로 *간섭 없이* 관찰해야 잡힙니다.

## 어떤 상황에서 쓰나

"가끔 buffer가 깨져요." "ISR과 main이 같은 변수를 만지는데 1000번에 한 번 이상 동작합니다." "printf 한 줄을 추가했더니 문제가 사라졌어요." 마지막 줄이 가장 큰 단서입니다. Race는 *관찰자*가 timing을 바꾸면 사라집니다. Heisenbug라고 부릅니다.

## 사례 — "printf 추가했더니 사라졌어요"

UART RX ring buffer에서 가끔 *문자 한 글자가 사라지는* 문제가 있었습니다.

```c
volatile uint8_t rx_buf[256];
volatile uint16_t head, tail;

void USART1_IRQHandler(void) {
    uint8_t b = USART1->DR;
    rx_buf[head] = b;
    head = (head + 1) & 0xFF;   /* head 갱신 */
}

uint8_t ring_pop(void) {
    while (head == tail) ;       /* wait for data */
    uint8_t b = rx_buf[tail];
    tail = (tail + 1) & 0xFF;
    return b;
}
```

문자가 안 들어오면 main이 busy wait. 디버깅하려고 다음을 추가:

```c
uint8_t ring_pop(void) {
    while (head == tail) ;
    printf("h=%d t=%d\n", head, tail);   /* 디버깅 추가 */
    /* ... */
}
```

문제가 사라집니다. Printf가 *몇 µs 걸리므로* race window가 닫혔습니다.

## 가설 정리

```text
[가설 A] head 갱신이 atomic하지 않음
  → STM32 16-bit aligned uint16_t write는 atomic. 기각.
[가설 B] tail update 시점에 ISR이 끼어 ring 깨짐
  → 가능. 측정 필요.
[가설 C] DMA가 ring을 같이 쓰는데 sync 안 됨
  → 코드 상 DMA 없음. 기각.
```

가설 B를 측정합니다.

## 측정 1 — GPIO pulse로 ISR과 main 가시화

```c
void USART1_IRQHandler(void) {
    GPIOC->BSRR = GPIO_PIN_0;       /* PC0 = ISR */
    uint8_t b = USART1->DR;
    rx_buf[head] = b;
    head = (head + 1) & 0xFF;
    GPIOC->BSRR = GPIO_PIN_0 << 16;
}

uint8_t ring_pop(void) {
    GPIOC->BSRR = GPIO_PIN_1;       /* PC1 = main critical */
    while (head == tail) ;
    uint8_t b = rx_buf[tail];
    tail = (tail + 1) & 0xFF;
    GPIOC->BSRR = GPIO_PIN_1 << 16;
    return b;
}
```

Logic analyzer로 PC0·PC1을 동시에 잡으면 ISR이 main critical 한가운데 떨어지는 *정확한 순간*이 보입니다.

## 측정 2 — DWT cycle counter

```c
uint32_t cyc_isr_in, cyc_isr_out;

void USART1_IRQHandler(void) {
    cyc_isr_in = DWT->CYCCNT;
    /* ... */
    cyc_isr_out = DWT->CYCCNT;
}

void show_race(void) {
    uint32_t isr_start_offset = cyc_isr_in - cyc_main_section_start;
    printf("isr at +%lu cyc (in main section)\n", isr_start_offset);
}
```

CYCCNT는 CPU 사이클을 직접 잰다. 측정 자체의 부담이 *한 명령*만 듭니다.

## 측정 3 — SWO / RTT trace

```c
ITM_SendChar('I');   /* ISR enter */
/* ... */
ITM_SendChar('M');   /* main critical */
```

SWO는 ITM stimulus port로 byte를 *backround*에서 송신합니다. CPU 부담이 거의 0이라 race가 그대로 보입니다. SEGGER RTT는 *공유 메모리* 기반이라 더 빠릅니다.

## 원인 — Compound update가 atomic하지 않음

```c
head = (head + 1) & 0xFF;
```

`head`를 *읽고*, +1하고, *다시 쓰는* 세 단계. ISR이 read와 write 사이에 끼면 안 됩니다.

다행히 *write 자체*는 atomic이지만 *read-modify-write*는 아닙니다. 그러나 이 사례에서는 head는 *오직 ISR만* 갱신하므로 그 자체는 race가 아닙니다.

진짜 원인은 다른 곳에 있었습니다. `head == tail` 비교 시.

```c
while (head == tail) ;    /* head 갱신 보기 위해 volatile 필요 */
```

`head`가 `volatile`이 아니면 컴파일러가 `head`를 *한 번만* 읽고 캐시합니다. ISR이 head를 갱신해도 main은 무한 루프. 그러나 *최적화 off* 또는 *printf로 인한 reload*가 우연히 race window를 깨뜨렸습니다.

수정 → `head`를 `volatile`로 선언 + memory barrier.

```c
volatile uint16_t head;

while (head == tail) ;     /* volatile → 매번 reload */
```

## 사례 — ISR과 main의 critical section

```c
uint32_t shared_counter;

void TIM2_IRQHandler(void) {
    shared_counter++;
}

void main_task(void) {
    if (shared_counter > 100) {
        shared_counter = 0;        /* read·zero 사이 ISR 끼면 +1 사라짐 */
        do_action();
    }
}
```

ISR이 read와 write 사이에 끼면 `+1`이 사라집니다. 해결.

```c
__disable_irq();
uint32_t snap = shared_counter;
shared_counter = 0;
__enable_irq();

if (snap > 100) do_action();
```

`__disable_irq`/`__enable_irq` 또는 BASEPRI masking. Critical section은 가능한 한 짧게.

## 사례 — Memory barrier 누락 (Cortex-M7)

Cortex-M7은 *복수 outstanding store*가 가능합니다. ISR enable 직전에 데이터를 쓰는 코드가 *순서 역전*될 수 있습니다.

```c
g_command_args[0] = 0x1234;
g_command_args[1] = 0x5678;
g_command_ready   = 1;       /* ← peripheral·ISR가 이걸 먼저 볼 가능성 */
```

해결.

```c
g_command_args[0] = 0x1234;
g_command_args[1] = 0x5678;
__DMB();                     /* memory barrier */
g_command_ready   = 1;
```

Cortex-M0/M3에서는 in-order라 보통 문제 없지만, M4/M7에서는 *반드시* barrier를 둡니다.

## 사례 — TOCTOU (Time of Check to Time of Use)

```c
if (g_buf_free)
    g_buf_free = 0;          /* 다른 task와 race */
```

검사와 사용 사이의 race. Atomic test-and-set 또는 mutex/spinlock 사용.

```c
/* Cortex-M0+ 이상은 LDREX/STREX 지원 */
do {
    if (__LDREXW(&g_buf_free) == 0) {
        __CLREX();
        return -EBUSY;
    }
} while (__STREXW(0, &g_buf_free) != 0);
```

## 사례 — RTOS scheduler 끼어듦

```c
mutex_lock(&m);
shared.x = 1;
shared.y = 2;
mutex_unlock(&m);
```

Mutex로 보호된 영역도 *mutex 안의 코드*가 잘못된 순서면 race가 일어납니다. Lock은 *순서를 보장하지* 못합니다. 안에서 `__DMB()` 또는 명시적 순서가 필요한 경우가 있습니다.

## Non-intrusive logging 패턴

```c
/* Ring buffer in RAM. Producer is ISR / main. Consumer dumps later. */
struct trace_event {
    uint32_t cyc;        /* DWT CYCCNT */
    uint8_t  src;        /* ISR id or main */
    uint8_t  evt;        /* enter/exit/data */
    uint16_t arg;
};

#define TRACE_N 256
static volatile struct trace_event g_trace[TRACE_N];
static volatile uint16_t g_idx;

static inline void trace_log(uint8_t src, uint8_t evt, uint16_t arg) {
    uint16_t i = g_idx++ & (TRACE_N - 1);
    g_trace[i].cyc = DWT->CYCCNT;
    g_trace[i].src = src;
    g_trace[i].evt = evt;
    g_trace[i].arg = arg;
}
```

ISR과 main 모두 `trace_log(...)`를 호출. Crash 후 buffer를 dump해서 *cycle 단위로* 무슨 일이 있었는지 재구성합니다.

```c
void trace_dump(void) {
    for (int i = 0; i < TRACE_N; i++) {
        printf("[%lu] src=%u evt=%u arg=0x%x\n",
               g_trace[i].cyc, g_trace[i].src, g_trace[i].evt, g_trace[i].arg);
    }
}
```

## 자주 보는 함정

> Volatile 누락

```c
uint32_t g_flag;       /* ← volatile 아님 */

while (!g_flag) ;      /* 컴파일러가 무한 루프로 최적화 */
```

ISR이 갱신하거나 hardware register인 변수는 *반드시* `volatile`.

> Volatile만 있으면 atomic?

```c
volatile uint64_t big = 0;
big = some_value;      /* 32-bit MCU에서 *두 번의 write* — atomic 아님 */
```

64-bit는 32-bit MCU에서 atomic 아닙니다. 16/32-bit aligned write까지만 atomic.

> Critical section 안에 sleep

```c
__disable_irq();
HAL_Delay(10);          /* SysTick IRQ 누락 → 시간 안 감 → 무한 대기 */
__enable_irq();
```

IRQ disable 상태로 IRQ-dependent 함수 호출 금지.

> printf로 race "고침"

```c
do_x();
printf("debug\n");   /* ← race window를 메우고 있을 뿐 */
do_y();
```

Printf를 빼도 race가 안 일어나려면 *진짜 원인*을 고쳐야 합니다.

> Logic analyzer의 sample rate 부족

100 MHz CPU 사이클을 1 MHz logic analyzer로 잡으면 100 사이클 폭의 race는 안 보입니다. Sample rate가 *측정 대상의 10배 이상*이어야 합니다.

## 정리

- Race는 *관찰자*가 timing을 바꾸면 사라집니다 (Heisenbug).
- Printf 대신 *non-intrusive* 도구: GPIO pulse, SWO/RTT, DWT cycle count, ring buffer trace.
- `volatile`은 *최적화 회피*를 위한 것. *atomic 보장은 아님*.
- Read-modify-write는 critical section 또는 atomic 명령 (LDREX/STREX).
- Cortex-M4/M7은 memory barrier (`__DMB`) 필요.
- TOCTOU는 atomic test-and-set 또는 mutex.
- "printf 추가하면 사라짐"은 race 신호. 원인을 끝까지 추적.

다음 편은 **통신 프로토콜 분석**입니다.

## 관련 항목

- [10-07: 인터럽트 누락/중복](/blog/embedded/modern-recipes/part10-07-interrupt-debugging)
- [10-08: 메모리 오염 진단](/blog/embedded/modern-recipes/part10-08-memory-corruption)
- [10-11: 로깅 시스템 설계](/blog/embedded/modern-recipes/part10-11-logging-system)
