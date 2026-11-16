---
title: "임베디드 로깅 시스템 설계 — 레벨·버퍼·SWO·Deferred"
slug: "embedded/modern-recipes/part10-11-logging-system"
date: 2026-04-19T09:10:00
description: "레벨 필터·ring buffer·binary record·deferred 출력·crash dump로 로그 비용을 나누고, QEMU 명령 카운트 플러그인으로 각 방식의 호출당 명령 수를 실제로 세어 저장 경로가 비용을 정한다는 것을 보입니다."
series: "Modern Embedded Recipes"
seriesOrder: 121
tags: [recipes, debugging, logging]
topics: ["embedded"]
---

## 한 줄 요약

> **"임베디드 로깅의 핵심은 로그 호출이 hot path에 남기는 비용을 줄이는 것입니다."** 호출 자리에서는 RAM에 기록만 하고, 출력과 해석은 뒤로 미룹니다. 이 글의 비용 수치는 QEMU에서 실제로 센 명령 수입니다.

## 어떤 상황에서 쓰나

ISR 안에서 UART로 바로 출력하면, 문자를 내보내는 시간 동안 ISR이 끝나지 않습니다. 115200 baud에서 한 문자는 86.8 µs이므로([10-05](/blog/embedded/modern-recipes/part10-05-uart-not-printing)) 12글자 한 줄이면 1 ms를 넘습니다. 1 ms 주기 인터럽트라면 다음 인터럽트를 놓칩니다. 그래서 호출 자리에서는 RAM에 기록만 하고(ring buffer), 출력은 나중에(deferred), 가능하면 사람이 읽는 텍스트 대신 숫자로(binary) 남깁니다. 아래에서는 이 세 선택이 실제로 얼마의 비용 차이를 내는지 QEMU로 셉니다.

## 핵심 개념 — 비용 분리

| 단계 | 위치 | 비용 |
|------|------|------|
| 로그 호출 | ISR / main에서 호출됨 | 짧아야 함 |
| 저장 | RAM ring buffer | 빠른 write |
| 전송 | UART/SWO/USB | background에서 천천히 |
| 해석 | host에서 binary → text | 느려도 됨 |

각 단계를 분리하면 hot path의 부담은 *RAM write 몇 byte*로 끝납니다.

## Layer 1 — 매크로로 zero-cost 또는 컴파일 제거

```c
typedef enum { LOG_ERR, LOG_WARN, LOG_INFO, LOG_DBG } log_lvl_t;

extern log_lvl_t g_log_level;

#define LOG(lvl, fmt, ...) \
    do { \
        if ((lvl) <= g_log_level) \
            log_emit(lvl, __FILE__, __LINE__, fmt, ##__VA_ARGS__); \
    } while (0)

#define LOG_ERR(fmt, ...)  LOG(0, fmt, ##__VA_ARGS__)
#define LOG_WARN(fmt, ...) LOG(1, fmt, ##__VA_ARGS__)
#define LOG_INFO(fmt, ...) LOG(2, fmt, ##__VA_ARGS__)
#define LOG_DBG(fmt, ...)  LOG(3, fmt, ##__VA_ARGS__)
```

Release build에서 `g_log_level = LOG_ERR`로 두면 LOG_DBG는 조건 검사만 남습니다. 아래 측정에서 이 경우는 호출당 명령 3개였습니다. 더 줄이고 싶으면 컴파일 time으로 제거:

```c
#if !defined(LOG_LEVEL) || LOG_LEVEL < 3
#  define LOG_DBG(fmt, ...) ((void)0)
#endif
```

## Layer 2 — Circular ring buffer

```c
#define LOG_RING 4096
static uint8_t g_log[LOG_RING];
static volatile uint16_t g_head, g_tail;

static inline void log_push_bytes(const void *p, size_t n) {
    const uint8_t *b = p;
    for (size_t i = 0; i < n; i++) {
        uint16_t next = (g_head + 1) & (LOG_RING - 1);
        if (next == g_tail) g_tail = (g_tail + 1) & (LOG_RING - 1); /* drop oldest */
        g_log[g_head] = b[i];
        g_head = next;
    }
}
```

가득 차면 가장 오래된 바이트를 버리므로, 마지막 기록은 남습니다. 이 함수는 ISR과 main이 동시에 부르면 `g_head`를 읽고-쓰는 사이에 끼어들 수 있으므로([10-09](/blog/embedded/modern-recipes/part10-09-timing-race-diag)의 QEMU 실험), 양쪽에서 부를 때는 [10-09](/blog/embedded/modern-recipes/part10-09-timing-race-diag)의 trace 버퍼처럼 칸을 차지하는 부분만 IRQ를 막습니다.

## Layer 3 — Binary record

텍스트로 포맷하는 대신 format 번호와 인자만 기록하고, 사람이 읽는 문장은 host가 만듭니다.

```c
struct log_rec {
    uint32_t ts;        /* DWT CYCCNT */
    uint16_t fmt_id;    /* host가 string으로 lookup */
    uint8_t  argc;
    uint8_t  pad;
    uint32_t args[4];   /* up to 4 args */
} __attribute__((packed));

void log_binary(uint16_t fmt_id, int argc, ...) {
    struct log_rec r = { DWT->CYCCNT, fmt_id, argc, 0, {0} };
    va_list ap; va_start(ap, argc);
    for (int i = 0; i < argc && i < 4; i++)
        r.args[i] = va_arg(ap, uint32_t);
    va_end(ap);
    log_push_bytes(&r, sizeof(r));
}

#define LOG_B(fmt, ...) log_binary(__COUNTER__, ARG_COUNT(__VA_ARGS__), __VA_ARGS__)
```

`ARG_COUNT`는 인자 개수를 세는 매크로로 따로 정의해야 하고, `__COUNTER__`는 GCC·Clang 확장입니다. 위 `LOG_B`는 format 문자열을 버리고 번호만 넘기므로, host가 번호로 문장을 찾으려면 문자열을 별도 section이나 빌드 산출물에 따로 모아 두는 단계가 더 필요합니다.

### 측정 — 호출 한 번에 명령 몇 개인가

QEMU 11.1.3의 `mps2-an386`(Cortex-M4)에서, QEMU 소스의 TCG 명령 카운트 플러그인(`tests/tcg/plugins/insn.c`)으로 실행된 명령 수를 셌습니다. 같은 루프를 1000번 돌리는 프로그램을 변형별로 빌드하고(`-O2`), 빈 루프(VARIANT 0)를 뺀 뒤 1000으로 나눴습니다. 변형은 다음과 같습니다.

- VARIANT 1: 위 Layer 1처럼 실행 시간 레벨 검사에서 걸러지는 `LOG_DBG`
- VARIANT 2: 위 `log_binary()`로 24바이트 record를 위 `log_push_bytes()`에 넣기
- VARIANT 3: `"tick %u\n"`을 직접 짠 작은 포매터로 12바이트 텍스트로 만들어 같은 ring에 넣기
- VARIANT 4: 같은 24바이트 record를 바이트 단위 ring 대신 record 단위 배열에 바로 쓰기

```c
#define REC_RING 128
static struct log_rec g_recs[REC_RING];
static volatile uint32_t g_rec_idx;
__attribute__((noinline)) void log_binary_rec(uint16_t fmt_id, uint32_t a0, uint32_t a1, uint32_t a2, uint32_t a3) {
    struct log_rec *r = &g_recs[g_rec_idx++ & (REC_RING - 1)];
    r->ts = DWT->CYCCNT; r->fmt_id = fmt_id; r->argc = 4;
    r->args[0] = a0; r->args[1] = a1; r->args[2] = a2; r->args[3] = a3;
}
```

```bash
qemu-system-arm -M mps2-an386 -nographic -monitor none -serial none \
  -semihosting-config enable=on,target=native -kernel lc$v.elf -plugin libinsn.dylib -d plugin
```

```text
# QEMU 11.1.3 mps2-an386, TCG insn plugin (tests/tcg/plugins/insn.c), N=1000 calls, -O2
VARIANT 0: total insns: 6039
VARIANT 1: total insns: 9042
VARIANT 2: total insns: 342662
VARIANT 3: total insns: 325660
VARIANT 4: total insns: 19041
per call: V1 3.0, V2 336.6, V3 319.6, V4 13.0 insns/call
```

결과는 기대와 달랐습니다. binary record(VARIANT 2, 337개)가 텍스트(VARIANT 3, 320개)보다 오히려 많았습니다. 비용 대부분이 포맷이 아니라 `log_push_bytes()`의 바이트당 루프에서 나왔고, binary record가 24바이트로 텍스트 12바이트보다 길었기 때문입니다. 같은 24바이트 record를 record 단위 배열에 필드로 바로 쓰면(VARIANT 4) 13개로 줄었습니다. binary 형식 자체보다 *저장 경로의 모양*이 비용을 정합니다. 이 수치는 명령 수이고 cycle 수가 아닙니다. QEMU는 cycle을 모델링하지 않으므로, 실제 시간은 보드에서 DWT `CYCCNT`로 잽니다([Embedded Performance Engineering 1-03](/blog/embedded/performance-engineering/part1-03-measurement)).

## Layer 4 — SWO / RTT 출력

ring을 비우는 쪽은 hot path가 아니므로 느려도 됩니다. ITM stimulus port 0으로 내보내는 예입니다. port 레지스터를 읽었을 때 bit 0이 1이면 FIFO가 받을 준비가 된 것입니다([Embedded Debugging 2장](/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight)의 ITM 절).

```c
static inline void swo_put(char c) {
    if ((ITM->TER & 1) && (ITM->TCR & 1)) {
        while (ITM->PORT[0].u32 == 0) ;
        ITM->PORT[0].u8 = c;
    }
}

void log_flush_swo(void) {
    while (g_tail != g_head) {
        swo_put(g_log[g_tail]);
        g_tail = (g_tail + 1) & (LOG_RING - 1);
    }
}
```

SEGGER RTT는 target RAM의 버퍼를 디버그 프로브가 읽어 가는 방식입니다. SEGGER RTT 문서는 target의 실시간 동작에 영향을 주지 않고 높은 속도로 입출력한다고 소개하고, 가장 빠른 모드의 전송 속도를 최대 약 3.5 MB/s로 적습니다.

```c
#include "SEGGER_RTT.h"
SEGGER_RTT_Write(0, &rec, sizeof(rec));
```

같은 문서는 모드에 따라 프로브가 메모리를 읽는 동안 target이 잠깐 멈출 수 있고, 그 영향은 interface 속도와 코어에 따라 다르다고도 적습니다.

## Layer 5 — Deferred 출력

ISR에서 호출된 로그는 RAM에만 적고, 출력은 idle task가 처리:

```c
void idle_task(void) {
    while (1) {
        if (g_tail != g_head) log_flush_uart();
        __WFI();
    }
}
```

hot path에는 위 측정의 ring 쓰기 비용만 남고, 출력은 할 일이 없을 때 처리됩니다. `__WFI()`로 잠들어 있다가 인터럽트가 오면 깨어나 다시 ring을 봅니다.

## Layer 6 — Crash dump

HardFault 때 ring 전체를 reset으로 지워지지 않는 영역에 복사해 두면, 다음 부팅에서 크래시 직전의 기록을 읽을 수 있습니다.

```c
void hardfault_log_save(void) {
    struct crash_log *cl = (void*)BACKUP_SRAM;
    cl->magic = 0xFA17;
    cl->head = g_head;
    cl->tail = g_tail;
    memcpy(cl->buf, g_log, LOG_RING);
    NVIC_SystemReset();
}

void boot_check_crash(void) {
    struct crash_log *cl = (void*)BACKUP_SRAM;
    if (cl->magic == 0xFA17) {
        printf("Previous crash log:\n");
        log_dump_buf(cl->buf, cl->head, cl->tail);
        cl->magic = 0;
    }
}
```

`BACKUP_SRAM`은 reset으로 지워지지 않는 영역이어야 합니다. STM32F405/407의 4 KB backup SRAM은 기본으로 꺼져 있어 소프트웨어로 켜야 합니다(DS8626 2.2.18, [10-04](/blog/embedded/modern-recipes/part10-04-hardfault-analysis)). 위 코드는 4096바이트 ring 전체를 복사하므로 4 KB backup SRAM에는 `magic`·`head`·`tail`이 들어갈 자리가 없습니다. ring을 더 작게 잡거나 마지막 일부만 복사합니다. 크래시 기록 전체를 다루는 방법은 [10-12: 포스트모템 분석](/blog/embedded/modern-recipes/part10-12-postmortem-analysis)에 있습니다.

## Filter / Subsystem tag

```c
#define LOG_TAG_NET   1
#define LOG_TAG_FS    2
#define LOG_TAG_UI    3

#define LOG_NET(lvl, fmt, ...) \
    do { if (lvl <= g_log_level && (g_log_tag_mask & (1 << LOG_TAG_NET))) \
            log_emit(lvl, LOG_TAG_NET, fmt, ##__VA_ARGS__); } while (0)
```

실행 중에 `g_log_tag_mask`를 바꿔 어느 subsystem의 로그를 볼지 정합니다. 걸러지는 호출은 위 VARIANT 1처럼 조건 검사만 남습니다.

## ISR 안의 printf

```c
void TIM2_IRQHandler(void) {
    HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);
    printf("tick %lu\n", HAL_GetTick());
}
```

`printf`가 UART로 바로 나간다면 이 ISR은 출력이 끝날 때까지 돌아가지 않습니다. 115200 baud에서 `tick 123456\n` 12글자는 12 × 86.8 µs ≈ 1.04 ms입니다. TIM2가 1 ms마다 인터럽트를 낸다면 ISR이 주기보다 길어집니다. 고친 코드는 기록만 하고 출력은 idle에서 합니다.

```c
void TIM2_IRQHandler(void) {
    TIM2->SR = ~TIM_SR_UIF;              /* 10-07: 0을 써서 지움 */
    HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);
    LOG_B("tick %u", HAL_GetTick());
}
```

## 자주 보는 함정

> Critical section 안에서 로그

```c
__disable_irq();
LOG_INFO("entering critical");   /* IRQ disable 동안 UART 못 보냄 */
do_critical();
__enable_irq();
```

IRQ를 막은 동안 UART를 인터럽트·DMA로 보내는 드라이버는 진행하지 못합니다. critical section 안에서는 ring 기록만 하고 출력은 밖에서 합니다.

> Floating point 로그

newlib-nano는 `_printf_float`를 기본으로 링크하지 않으므로 `%f`를 쓰려면 `-u _printf_float`로 링크해야 하고, 링크하지 않으면 newlib README는 정의되지 않은 동작이라고 적습니다([10-05](/blog/embedded/modern-recipes/part10-05-uart-not-printing)). binary 로그라면 float의 비트를 그대로 넘기고 host에서 다시 float로 해석합니다. 비트를 꺼낼 때 `*(uint32_t*)&x`는 C의 aliasing 규칙에 어긋나므로([10-08](/blog/embedded/modern-recipes/part10-08-memory-corruption)) `memcpy`를 씁니다.

```c
float x = read_temp();   /* 4-byte float */
uint32_t bits;
memcpy(&bits, &x, sizeof bits);
LOG_B("temp %f", bits);
```

> Format string flash bloat

```c
LOG_INFO("Entered process_packet with channel=%d, size=%d", ch, sz);
```

format 문자열은 그대로 flash(`.rodata`)에 들어갑니다. 위 문자열은 48바이트(끝의 NUL 포함)이므로 이런 문자열 100개면 약 4.8 KB입니다. Layer 3처럼 번호만 기록하고 문자열을 target 이미지 밖(host 쪽 표)에 두면 이 공간이 줄어듭니다.

> Ring buffer overflow를 silently drop

위 ring은 가득 차면 가장 오래된 기록을 버립니다. 버려진 양을 알 수 있게 overflow 횟수를 따로 세어 두면, 나중에 덤프를 볼 때 앞부분이 비었다는 것을 압니다.

> Production에서 SWO output

SWO와 RTT는 디버그 프로브가 연결되어 있어야 읽힙니다. 프로브가 없는 현장 보드라면 UART·USB·CAN 같은 다른 통로로 내보내거나, 위 Layer 6처럼 남겨 두었다가 나중에 읽습니다.

## 정리

- 로그는 *호출 → 저장 → 전송 → 해석* 4단계로 비용을 분리합니다.
- QEMU 명령 수로 재면 레벨에서 걸러지는 호출은 3개, 바이트 단위 ring에 넣는 binary·텍스트 기록은 320~337개, record 단위 배열에 바로 쓰는 binary 기록은 13개였습니다. 저장 경로의 모양이 비용을 정합니다.
- format 문자열을 번호로 바꾸면 flash의 문자열 공간도 줄어듭니다.
- SEGGER RTT 문서의 최대 전송 속도는 약 3.5 MB/s이고, 프로브가 연결되어 있어야 읽힙니다.
- Idle task가 출력을 batch로 처리합니다.
- Crash dump를 backup SRAM에 두면 reset 후에도 이전 로그를 볼 수 있습니다.
- Tag/subsystem 마스크로 runtime에서 필터링.
- Critical section 안에서는 ring buffer write만.

다음 편은 **포스트모템 분석**입니다.

## 관련 항목

- [10-09: 타이밍/race 진단](/blog/embedded/modern-recipes/part10-09-timing-race-diag)
- [10-12: 포스트모템 분석](/blog/embedded/modern-recipes/part10-12-postmortem-analysis)
- [10-04: 하드폴트 분석](/blog/embedded/modern-recipes/part10-04-hardfault-analysis)
