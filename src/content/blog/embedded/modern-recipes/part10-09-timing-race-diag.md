---
title: "타이밍·Race 진단 — Heisenbug 잡는 법"
slug: "embedded/modern-recipes/part10-09-timing-race-diag"
date: 2026-04-19T09:08:00
description: "printf로 race가 사라지는 두 가지 이유를 -O2 코드와 QEMU 실험(ISR·main 공유 카운터에서 잃는 증가 수)으로 보이고, atomicity·barrier·LDREX/STREX를 ARMv7-M ARM과 Arm AN321로 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 119
tags: [recipes, debugging, race, timing]
topics: ["embedded"]
---

## 한 줄 요약

> **"Race condition은 *관찰 자체가 race를 사라지게* 만드는 가장 까다로운 버그입니다."** Printf 대신 GPIO pulse·SWO·DWT cycle count로 *간섭 없이* 관찰해야 잡힙니다.

## 어떤 상황에서 쓰나

"가끔 buffer가 깨져요." "ISR과 main이 같은 변수를 만지는데 1000번에 한 번 이상 동작합니다." "printf 한 줄을 추가했더니 문제가 사라졌어요." 마지막 줄이 가장 큰 단서입니다. Race는 *관찰자*가 timing을 바꾸면 사라집니다. Heisenbug라고 부릅니다.

## 첫 번째 원인 후보 — 컴파일러가 다시 읽지 않는 변수

"printf를 넣었더니 증상이 사라졌다"는 경험은 원인이 둘 중 하나일 때 자주 나옵니다. 하나는 컴파일러가 공유 변수를 다시 읽지 않는 경우, 다른 하나는 ISR과 main이 같은 변수를 읽고-고치고-쓰는 사이에 끼어드는 경우입니다. 첫째부터 봅니다.

UART ISR이 `head`를 올리고 main이 `head == tail`인 동안 기다리는 ring buffer에서, `head`가 `volatile`이 아니면 무슨 일이 생기는지 `arm-none-eabi-gcc` 16.2.0 `-O2`로 확인했습니다.

```c
uint16_t head_plain, tail_plain;
volatile uint16_t head_vol, tail_vol;
void wait_plain(void) { while (head_plain == tail_plain) { } }
void wait_vol(void)   { while (head_vol == tail_vol) { } }
```

```text
00000000 <wait_plain>:
   0:	ldr	r3, [pc, #8]	@ (c <wait_plain+0xc>)
   2:	ldrh	r2, [r3, #0]
   4:	ldrh	r3, [r3, #2]
   6:	cmp	r2, r3
   8:	beq.n	6 <wait_plain+0x6>
   a:	bx	lr
   c:	.word	0x00000000

00000010 <wait_vol>:
  10:	ldr	r3, [pc, #8]	@ (1c <wait_vol+0xc>)
  12:	ldrh	r1, [r3, #4]
  14:	ldrh	r2, [r3, #6]
  16:	cmp	r1, r2
  18:	beq.n	12 <wait_vol+0x2>
  1a:	bx	lr
  1c:	.word	0x00000000
```

`wait_plain`은 두 값을 한 번만 읽고(0x2, 0x4), 0x6의 `cmp`로 되돌아가 다시 읽지 않습니다. ISR이 `head_plain`을 바꿔도 이 루프는 끝나지 않습니다. `wait_vol`은 매번 0x12로 돌아가 `ldrh`로 다시 읽습니다. 루프 안에 함수 호출(`printf`)을 넣으면 컴파일러는 그 함수가 전역 변수를 바꿀 수 있다고 보고 다시 읽으므로, 이런 경우 printf가 버그를 "고친" 것처럼 보입니다. 고치는 방법은 printf가 아니라 ISR과 공유하는 변수에 `volatile`을 붙이는 것입니다.

## 두 번째 원인 후보 — 읽고-쓰기 사이에 끼어드는 ISR

`volatile`은 매번 메모리에서 읽고 쓰게 할 뿐, 읽기와 쓰기 사이에 ISR이 끼어드는 것은 막지 못합니다. SysTick ISR이 카운터를 올리고, main이 그 값을 가져간 뒤 0으로 만드는 코드를 QEMU 11.1.3 `mps2-an386`(Cortex-M4)에서 돌려 잃어버린 증가를 셌습니다. ISR은 정답 확인용으로 `isr_total`도 함께 올립니다.

```c
volatile uint32_t shared_counter;   /* ISR adds, main takes and zeroes */
volatile uint32_t isr_total;        /* ground truth: every ISR increment */

void SysTick_Handler(void) { shared_counter++; isr_total++; }

static uint32_t take_racy(void) {          /* read ... write 0: ISR may land in between */
    uint32_t snap = shared_counter;
    for (volatile int k = 0; k < 20; k++) { }   /* widen the window like real work would */
    shared_counter = 0;
    return snap;
}
static uint32_t take_safe(void) {
    __disable_irq();
    uint32_t snap = shared_counter;
    shared_counter = 0;
    __enable_irq();
    return snap;
}

static void run(const char *name, uint32_t (*take)(void)) {
    uint32_t taken = 0;
    shared_counter = 0; isr_total = 0;
    SysTick->LOAD = 2000 - 1; SysTick->VAL = 0;
    SysTick->CTRL = SysTick_CTRL_CLKSOURCE_Msk | SysTick_CTRL_TICKINT_Msk | SysTick_CTRL_ENABLE_Msk;
    while (isr_total < 20000) taken += take();
    SysTick->CTRL = 0;
    taken += take();
    pr("%s: ISR increments %u, main took %u, lost %u\n", name, isr_total, taken, isr_total - taken);
}

int main(void) { run("racy", take_racy); run("safe", take_safe); return 0; }
```

```bash
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O1 -g -ffreestanding -nostdlib \
  -I CMSIS_5/CMSIS/Core/Include -Wall -T an386.ld startup.c sh.c race.c -lgcc -o race.elf
qemu-system-arm -M mps2-an386 -nographic -monitor none -serial none \
  -semihosting-config enable=on,target=native -kernel race.elf      # 두 번 실행
```

```text
racy: ISR increments 20000, main took 8093, lost 11907
safe: ISR increments 20000, main took 20000, lost 0
racy: ISR increments 20000, main took 7269, lost 12731
safe: ISR increments 20000, main took 20000, lost 0
```

`take_racy()`는 읽은 뒤 0을 쓰기까지의 짧은 구간에 ISR이 들어오면, 그 사이의 증가를 0으로 덮어 버립니다. 데모에서는 이 구간을 일부러 넓혔기 때문에 2만 번 중 1만 2천 번 안팎을 잃었고, 두 번 돌릴 때마다 잃은 수가 달랐습니다(11907, 12731). `take_safe()`처럼 읽기와 0 쓰기를 `__disable_irq()`·`__enable_irq()` 사이에 두면 잃는 것이 없습니다. 실제 코드에서는 구간이 훨씬 짧아 드물게만 잃으므로, 이 데모처럼 정답 카운터를 따로 두고 비교해야 드러납니다.

같은 이유로 "16·32비트 정렬된 쓰기는 atomic"이라는 말도 쓰기 *하나*에 대한 것입니다. ARMv7-M ARM A3.5.3은 byte, halfword 정렬 halfword, word 정렬 word 접근을 single-copy atomic으로 정하고, `LDRD`·`STRD`·`LDM`·`STM`은 word 접근의 연속이라 그 연속 전체는 atomic이 아닐 수 있다고 적습니다. `volatile uint64_t`에 대입하면 실제로 `strd` 하나가 나오지만 이 규칙에 따라 두 word 사이에 예외가 끼어들 수 있습니다.

```text
00000000 <set_big>:
   0:	ldr	r3, [pc, #4]	@ (8 <set_big+0x8>)
   2:	strd	r0, r1, [r3]
   6:	bx	lr
   8:	.word	0x00000000
```

## 측정 1 — GPIO pulse로 ISR과 main 보기

```c
void USART1_IRQHandler(void) {
    GPIOC->BSRR = GPIO_PIN_0;       /* PC0 = ISR */
    uint8_t b = USART1->DR;
    rx_buf[head] = b;
    head = (head + 1) & 0xFF;
    GPIOC->BSRR = GPIO_PIN_0 << 16;
}

uint8_t ring_pop(void) {
    GPIOC->BSRR = GPIO_PIN_1;       /* PC1 = main 구간 */
    while (head == tail) ;
    uint8_t b = rx_buf[tail];
    tail = (tail + 1) & 0xFF;
    GPIOC->BSRR = GPIO_PIN_1 << 16;
    return b;
}
```

logic analyzer로 PC0·PC1을 함께 잡으면 ISR이 main 구간 한가운데 들어오는 순간이 보입니다. 각 표시는 BSRR 쓰기 한 번입니다. 펄스가 짧으면 logic analyzer의 샘플 간격보다 짧아 놓칠 수 있으므로, 측정하려는 펄스 폭보다 샘플 간격이 충분히 짧은지 먼저 확인합니다.

## 측정 2 — DWT cycle counter

```c
uint32_t cyc_isr_in, cyc_isr_out;

void USART1_IRQHandler(void) {
    cyc_isr_in = DWT->CYCCNT;
    /* ... */
    cyc_isr_out = DWT->CYCCNT;
}
```

`CYCCNT`는 코어 클럭마다 1씩 오르는 카운터라, ISR이 main 구간의 몇 cycle 지점에 들어왔는지를 남깁니다. 읽기 자체도 명령 하나만큼 시간을 쓰므로, 빈 구간을 먼저 재서 빼는 방법은 [Embedded Performance Engineering](/blog/embedded/performance-engineering/00-preface)의 측정 편에 있습니다. QEMU는 cycle을 모델링하지 않으므로 이 값은 보드에서 잽니다.

## 측정 3 — SWO·RTT

```c
ITM_SendChar('I');   /* ISR enter */
/* ... */
ITM_SendChar('M');   /* main 구간 */
```

ITM은 stimulus port에 쓴 바이트를 trace 패킷으로 만들어 SWO 핀으로 내보내고, CPU는 FIFO가 준비될 때까지만 기다립니다. SEGGER RTT는 target RAM의 ring buffer에 쓰고 프로브가 그 메모리를 읽어 가는 방식입니다. 설정은 [10-03](/blog/embedded/modern-recipes/part10-03-gdb-remote-debug)의 TPIU 절과 [Embedded Debugging 2장](/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight)에 있습니다.

## ISR과 main의 critical section

위 QEMU 실행의 `take_safe()`가 이 패턴입니다. 읽고 0으로 만드는 두 단계를 IRQ를 막은 채 하고, 실제 일은 막기를 푼 뒤 합니다.

```c
__disable_irq();
uint32_t snap = shared_counter;
shared_counter = 0;
__enable_irq();

if (snap > 100) do_action();
```

모든 IRQ를 막는 대신 `BASEPRI`로 이 카운터를 건드리는 우선순위 이하만 막을 수도 있습니다([10-07](/blog/embedded/modern-recipes/part10-07-interrupt-debugging)에서 QEMU로 확인).

## Memory barrier

```c
g_command_args[0] = 0x1234;
g_command_args[1] = 0x5678;
__DMB();
g_command_ready   = 1;
```

Arm의 *Cortex-M Programming Guide to Memory Barrier Instructions*(AN321, DAI 0321A, 2012)는 Cortex-M 프로세서가 메모리 접근 순서를 바꾸지 않으므로 DMB가 필요한 경우가 드물고, Cortex-M3·M4에서는 모든 load·store의 순서가 지켜져 DMB가 중복이라고 적습니다. 같은 문서는 다른 Arm 프로세서로 옮길 코드나 DMA 같은 다른 bus master와 데이터를 주고받는 경우에는 barrier가 필요하다고 적습니다. 위 코드의 `__DMB()`는 그 경우를 위한 것입니다. 이 문서는 Cortex-M7 이전에 나왔으므로 M7은 그 코어의 문서로 따로 확인합니다.

## TOCTOU (확인과 사용 사이)

```c
if (g_buf_free)
    g_buf_free = 0;          /* 확인과 차지 사이에 다른 쪽이 끼어들 수 있음 */
```

확인과 차지를 한 번에 하려면 LDREX/STREX를 씁니다. `STREX`는 `LDREX` 이후 그 주소에 대한 독점이 깨졌으면 쓰지 않고 1을 돌려주므로, 다시 시도합니다.

```c
int try_take(volatile uint32_t *g_buf_free) {
    do {
        if (__LDREXW(g_buf_free) == 0) {
            __CLREX();
            return -1;                       /* 이미 누가 차지함 */
        }
    } while (__STREXW(0, g_buf_free) != 0);  /* 0을 쓰는 데 성공할 때까지 */
    return 0;
}
```

ARMv7-M ARM A3.4는 exclusive monitor의 동작을 정의하고, 예외 진입·복귀 때 local monitor가 지워지므로(B1.5.6·B1.5.8의 ClearExclusiveLocal) ISR이 그 사이에 끼면 main의 `STREX`가 실패해 다시 시도합니다.

## RTOS mutex 안의 순서

mutex는 같은 mutex를 잡는 코드끼리의 동시 실행을 막습니다. mutex를 잡지 않는 ISR이나 다른 bus master(DMA)가 같은 데이터를 보면, 그쪽에는 보호가 없습니다. 그런 데이터는 ISR과는 위 critical section으로, DMA와는 위 barrier로 따로 맞춥니다.

## 방해가 적은 trace 버퍼

```c
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
    uint32_t pm = __get_PRIMASK();
    __disable_irq();
    uint16_t i = g_idx++ & (TRACE_N - 1);   /* 칸 하나를 차지하는 RMW */
    __set_PRIMASK(pm);
    g_trace[i].cyc = DWT->CYCCNT;
    g_trace[i].src = src;
    g_trace[i].evt = evt;
    g_trace[i].arg = arg;
}
```

ISR과 main이 모두 `trace_log()`를 부르므로 `g_idx++` 자체가 위 QEMU 실행과 같은 경쟁 대상입니다. 그래서 칸을 차지하는 한 줄만 IRQ를 막고, 이전 PRIMASK를 되돌려 ISR 안에서 불러도 IRQ를 잘못 켜지 않게 했습니다. 크래시 뒤에는 버퍼를 덤프해 cycle 순서로 무슨 일이 있었는지 다시 맞춥니다.

## 자주 보는 함정

> `volatile` 누락

위 `wait_plain`의 코드처럼 ISR이 바꾸는 변수를 다시 읽지 않는 루프가 됩니다.

> `volatile`이면 atomic이라는 오해

위 QEMU 실행의 `shared_counter`도 `volatile`이었습니다. `volatile`은 매번 읽고 쓰게 할 뿐 RMW를 하나로 묶지 않습니다.

> IRQ를 막은 채 `HAL_Delay()`

```c
__disable_irq();
HAL_Delay(10);
__enable_irq();
```

HAL v1.8.6에서 `HAL_Delay()`가 보는 `uwTick`은 SysTick 인터럽트에서 부르는 `HAL_IncTick()`이 올립니다(`stm32f4xx_hal.c` 312~314행). IRQ를 막으면 `uwTick`이 오르지 않아 `HAL_Delay()`가 끝나지 않습니다.

> printf로 race를 "고침"

printf는 위 첫 번째 원인에서는 컴파일러가 변수를 다시 읽게 만들고, 두 번째 원인에서는 경쟁 구간의 시간을 바꿀 뿐입니다. 위 QEMU 실행처럼 정답 카운터와 비교해 잃는 것이 없는지 확인합니다.

## 정리

- `volatile` 없는 대기 루프는 한 번만 읽고 영원히 돕니다(`-O2` 코드로 확인).
- `volatile`은 RMW를 보호하지 않습니다. ISR과 공유한 카운터를 읽고-0으로 만드는 코드는 QEMU에서 2만 번 중 1만 2천 번 안팎을 잃었고, IRQ를 막은 버전은 하나도 잃지 않았습니다.
- 32비트 이하 정렬 접근 하나는 atomic이고, `STRD` 같은 연속 접근은 아닙니다(ARMv7-M ARM A3.5.3).
- Cortex-M3·M4는 메모리 순서를 바꾸지 않지만, 이식성과 DMA를 위해 barrier를 둡니다(Arm AN321).
- 확인-사용은 LDREX/STREX로 한 번에 합니다.

다음 편은 **통신 프로토콜 분석**입니다.

## 관련 항목

- [10-07: 인터럽트 누락/중복](/blog/embedded/modern-recipes/part10-07-interrupt-debugging)
- [10-08: 메모리 오염 진단](/blog/embedded/modern-recipes/part10-08-memory-corruption)
- [10-11: 로깅 시스템 설계](/blog/embedded/modern-recipes/part10-11-logging-system)
