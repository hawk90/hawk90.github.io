---
title: "10-11: 로깅 시스템 설계 — 레벨·버퍼·SWO·Deferred"
date: 2026-05-17T01:00:00
description: "임베디드 환경에서 overhead를 최소화한 로깅. 레벨 분리·circular buffer·SWO/RTT·deferred 처리 패턴."
series: "Modern Embedded Recipes"
seriesOrder: 121
tags: [recipes, debugging, logging]
---

## 한 줄 요약

> **"임베디드 로깅의 핵심은 *시간이 안 드는* 로그를 어떻게 만드는가입니다."** Circular buffer에 binary record를 적고 host에서 후처리하면 µs 단위로 끝납니다.

## 어떤 상황에서 쓰나

ISR에서 printf를 부르면 µs가 ms가 되어 다른 timing이 깨집니다. UART output이 buffer overflow되면 가장 최근의 log가 사라집니다. Production firmware에 로그를 두고 싶지만 flash 용량이 부족합니다. 모든 경우에 *deferred + binary + ring buffer*가 답입니다.

## 핵심 개념 — 비용 분리

| 단계 | 위치 | 비용 |
|------|------|------|
| 로그 호출 | ISR / main에서 호출됨 | 빨라야 함 (µs) |
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

Release build에서 `g_log_level = LOG_ERR`로 두면 LOG_DBG는 *조건 분기 한 줄*만 남습니다. 더 줄이고 싶으면 컴파일 time으로 제거:

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

Overflow 시 *가장 오래된 데이터*를 버립니다. 가장 *최근* 직전의 로그를 잃지 않습니다.

## Layer 3 — Binary record

Printf는 `%d` formatting에 100 cycle 이상 듭니다. Binary record는 10 cycle.

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

Format string은 elf의 별도 section에 모아두고 host가 fmt_id로 조회합니다. 흔한 구현이 `defmt` (Rust embedded) 와 `dlt` (AUTOSAR).

## Layer 4 — SWO / RTT 출력

```c
/* ITM 직접 — UART보다 100배 빠름 */
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

SEGGER RTT는 더 빠릅니다 (수 MB/s).

```c
#include "SEGGER_RTT.h"
SEGGER_RTT_Write(0, &rec, sizeof(rec));
```

RTT는 *공유 메모리* 기반이라 CPU 부담이 거의 0. J-Link로 host에서 read.

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

Hot path는 ring buffer write로 끝나고, 출력 비용은 idle에서 흡수.

## Layer 6 — Crash dump

Hardfault 시 ring buffer 전체를 NVRAM에 복사.

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

Field 환경에서 *재시작 후*에도 이전 로그를 볼 수 있습니다.

## Filter / Subsystem tag

```c
#define LOG_TAG_NET   1
#define LOG_TAG_FS    2
#define LOG_TAG_UI    3

#define LOG_NET(lvl, fmt, ...) \
    do { if (lvl <= g_log_level && (g_log_tag_mask & (1 << LOG_TAG_NET))) \
            log_emit(lvl, LOG_TAG_NET, fmt, ##__VA_ARGS__); } while (0)
```

Runtime에서 `g_log_tag_mask`를 바꿔 *어느 subsystem*의 로그만 볼지 결정.

## Cost 측정

| 방식 | cycles (Cortex-M4 @ 168 MHz) |
|------|------------------------------|
| `printf("hello %d\n", x)` | ~1500 |
| `log_emit` (text, ring) | ~600 |
| `log_binary` (4 args) | ~50 |
| SEGGER RTT (4 byte) | ~30 |
| ITM SWO (1 byte) | ~20 |

ISR에서 매번 부르려면 binary + RTT 조합이 답.

## 사례 — ISR 로그가 timing 깨뜨림

처음 코드:

```c
void TIM2_IRQHandler(void) {
    HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);
    printf("tick %lu\n", HAL_GetTick());  /* ~1ms — 다음 IRQ가 떨어짐 */
}
```

1ms 주기 IRQ인데 printf가 1ms 걸려 *영원히* ISR 안에 있게 됩니다.

수정:

```c
void TIM2_IRQHandler(void) {
    TIM2->SR &= ~TIM_SR_UIF;
    HAL_GPIO_TogglePin(GPIOC, GPIO_PIN_13);
    LOG_B("tick %u", HAL_GetTick());      /* ~50 cycle */
}
```

LOG_B는 ring buffer에 binary record만 적습니다. Idle task가 batch로 UART에 출력.

## 사례 — Production에서 사용한 로그 분량

자율주행 ECU 한 대 기준.

| Subsystem | log/s | bytes/event | bandwidth |
|-----------|-------|-------------|-----------|
| camera | 30 | 48 | 1.4 KB/s |
| control | 1000 | 32 | 32 KB/s |
| diagnostic | 10 | 128 | 1.3 KB/s |
| total |  |  | ~35 KB/s |

UART 115200 baud (11 KB/s)로는 불가. 1 Mbps UART나 USB 사용. Binary record로 *text 대비 5배 압축*하면 230400 baud로도 됩니다.

## 자주 보는 함정

> Critical section 안에서 로그

```c
__disable_irq();
LOG_INFO("entering critical");   /* IRQ disable 동안 UART 못 보냄 */
do_critical();
__enable_irq();
```

Critical section에서는 ring buffer write만 사용. 출력은 외부에서.

> Floating point 로그

`printf("%f", x)`는 newlib-nano에서 빈 칸 출력. `-u _printf_float` 또는 사용자가 직접 변환.

차라리 `LOG_B(F_TIMESTAMP, *(uint32_t*)&x)` 로 float bit를 binary로 넘기고 host에서 reinterpret_cast.

> Format string flash bloat

```c
LOG_INFO("Entered process_packet with channel=%d, size=%d", ch, sz);
```

긴 format string이 flash에 100개 쌓이면 KB 단위 낭비. defmt-style은 host의 별도 file로 옮겨 flash를 비웁니다.

> Ring buffer overflow를 silently drop

가장 *오래된* 로그를 drop하는 게 보통 맞지만, crash 직전이라면 *그 직전*이 가장 중요. Crash 시점에는 drop 안 하고 overflow 횟수를 카운트.

> Production에서 SWO output

SWO는 디버거가 connect되어야 의미가 있습니다. Field firmware는 UART/USB/CAN으로 외부에 보냅니다.

## 정리

- 로그는 *호출 → 저장 → 전송 → 해석* 4단계로 비용을 분리합니다.
- Hot path에서는 ring buffer + binary record만. ~50 cycle.
- Format string은 elf section에 두고 host가 lookup.
- SWO / SEGGER RTT는 UART보다 100배 빠릅니다.
- Idle task가 출력을 batch로 처리합니다.
- Crash dump를 NVRAM에 두면 reset 후에도 이전 로그를 볼 수 있습니다.
- Tag/subsystem 마스크로 runtime에서 필터링.
- Critical section 안에서는 ring buffer write만.

다음 편은 **포스트모템 분석**입니다.

## 관련 항목

- [10-09: 타이밍/race 진단](/blog/embedded/modern-recipes/part10-09-timing-race-diag)
- [10-12: 포스트모템 분석](/blog/embedded/modern-recipes/part10-12-postmortem-analysis)
- [10-04: 하드폴트 분석](/blog/embedded/modern-recipes/part10-04-hardfault-analysis)
