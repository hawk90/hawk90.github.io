---
title: "4-12: 워치독 (IWDG/WWDG)"
date: 2026-05-13T22:00:00
description: "Independent vs Window·refresh 전략·debug 모드 freeze."
series: "Modern Embedded Recipes"
seriesOrder: 46
tags: [recipes, bare-metal, watchdog]
draft: false
---

## 한 줄 요약

> **"보드가 hang하면 워치독이 reset 합니다."** IWDG는 단순 안전망, WWDG는 *너무 빠르면 reset하는* window 패턴.

## 어떤 상황에서 쓰나

펌웨어가 무한 루프에 빠지거나, 외부 device가 응답하지 않거나, IRQ가 잘못 마스크되어 다시 안 들어오는 상황 — 일반 사용자가 보면 "보드가 죽었다"는 결과입니다. 사람이 옆에서 reset 버튼을 누를 수 없는 환경(현장 설치, 우주, 의료기기, 차량)에서는 *워치독이 자동 reset*을 해야 합니다.

이 글은 STM32의 IWDG와 WWDG, 두 워치독의 차이와 사용 패턴을 정리합니다.

## 핵심 개념

### IWDG vs WWDG

| 특성 | IWDG | WWDG |
|------|------|------|
| Clock | LSI (~32 kHz internal RC) | PCLK1 |
| Reset 조건 | 시간 초과 | 시간 초과 *또는* 너무 빠른 refresh |
| Stop/Standby에서 | 동작 (LSI 살아있음) | 정지 |
| 정밀도 | ±10% (LSI 변동) | clock 정밀도 따름 |
| 용도 | 일반 안전망 | 강한 timing 보장 |

대부분의 프로젝트는 IWDG 하나로 충분합니다. WWDG는 *실시간 시스템*에서 *너무 빠른 refresh도 잡고 싶을 때* 씁니다.

### IWDG timing

```text
LSI = 32 kHz (typ)
Prescaler = 4, 8, 16, 32, 64, 128, 256
Reload (RLR) = 12-bit (0 ~ 4095)

Timeout = (RLR + 1) × prescaler / 32000

Examples:
  PR=4,  RLR=4095 → 4096 × 4   / 32000 = 0.512 s
  PR=64, RLR=4095 → 4096 × 64  / 32000 = 8.19  s
  PR=256, RLR=4095 → 4096 × 256 / 32000 = 32.77 s (max)
```

### WWDG window

WWDG는 *window 안에서만 refresh가 허용*됩니다.

| Counter 범위 | 동작 |
| --- | --- |
| > 0x80 | 초기 상태 (start 전) |
| 0x7F ~ 0x50 | refresh 너무 빠름 → reset |
| 0x50 ~ 0x40 (window) | refresh OK |
| < 0x40 | refresh 너무 늦음 → reset |

너무 빠른 refresh는 *bug*로 본다는 철학입니다. 정확한 주기로 refresh되는지 검증하는 도구.

## 코드 예제

### 1. IWDG basic — 1초 timeout

```c
void iwdg_init_1sec(void) {
    IWDG->KR = 0x5555;        // unlock
    IWDG->PR = 4;             // /64 → ~500 Hz
    IWDG->RLR = 500;          // 500 / 500 = 1 sec
    IWDG->KR = 0xAAAA;        // refresh (start counter)
    IWDG->KR = 0xCCCC;        // start
}

static inline void iwdg_kick(void) {
    IWDG->KR = 0xAAAA;
}

// main
iwdg_init_1sec();
while (1) {
    do_work();
    iwdg_kick();   // 100 ms마다 — 1 sec 한참 전
}
```

`KR = 0xAAAA` 한 줄이 watchdog refresh입니다. 어디서 부르느냐가 핵심.

### 2. Multi-task check-in 패턴

여러 task가 동작할 때 한 task만 멈춰도 *전체 reset*되어야 합니다.

```c
#define TASKS 4
static volatile uint32_t task_alive_mask;
#define ALL_TASKS_MASK ((1u << TASKS) - 1)

void task_alive(int id) {
    task_alive_mask |= (1u << id);
}

// 최상위 supervisor
void watchdog_task(void) {
    if (task_alive_mask == ALL_TASKS_MASK) {
        iwdg_kick();
        task_alive_mask = 0;   // 다음 주기
    }
    // 다른 task가 죽으면 mask가 안 차고 IWDG가 reset
}
```

각 task는 *자기 일을 끝낼 때마다* `task_alive(id)`를 호출. supervisor는 *모든 task가 신호 했을 때만* IWDG를 refresh.

### 3. WWDG with window

```c
void wwdg_init(void) {
    RCC->APB1ENR |= RCC_APB1ENR_WWDGEN;

    // PCLK1 = 42 MHz, prescaler /8 = 5.25 MHz → /4096 = 1.28 kHz
    // counter 0x40~0x7F (64 step), 1 step = 0.78 ms
    // window W = 0x60 (=96) → 0x40 (=64): 32 steps = 25 ms
    // total timeout: 0x7F (=127) → 0x3F = 64 steps = 50 ms

    WWDG->CFR = (1u << 8)             // WDGTB = /8
              | (3u << 7)             // EWI off
              | 0x60;                 // W = 0x60
    WWDG->CR = (1u << 7) | 0x7F;      // WDGA = 1, counter = max
}

static inline void wwdg_kick(void) {
    WWDG->CR = (WWDG->CR & ~0x7F) | 0x7F;   // refresh — 0x7F write
}
```

이제 *25ms ~ 50ms 사이*에 `wwdg_kick()`이 호출되어야 합니다. 더 빨라도 더 늦어도 reset.

### 4. Debug freeze

디버거에서 break point 걸어두면 보드가 멈춰 *워치독이 reset 발사*합니다. debug 빌드에서는 freeze 비트를 set합니다.

```c
DBGMCU->APB1FZ |= DBGMCU_APB1_FZ_DBG_IWDG_STOP
                | DBGMCU_APB1_FZ_DBG_WWDG_STOP;
```

릴리즈 빌드는 *반드시 freeze 안 함*. 실제 hang 시 reset이 동작하지 않으면 안 됩니다.

### 5. Reset 원인 확인

reset 후 RCC->CSR에서 어떤 reset이었는지 알 수 있습니다.

```c
typedef enum {
    RESET_POR,       // power-on
    RESET_PIN,       // NRST pin
    RESET_SOFT,      // NVIC_SystemReset()
    RESET_IWDG,      // independent watchdog
    RESET_WWDG,      // window watchdog
    RESET_LPWR,      // low-power management
    RESET_BOR,       // brown-out
} reset_cause_t;

reset_cause_t get_reset_cause(void) {
    uint32_t csr = RCC->CSR;
    RCC->CSR |= RCC_CSR_RMVF;  // clear flags

    if (csr & RCC_CSR_IWDGRSTF) return RESET_IWDG;
    if (csr & RCC_CSR_WWDGRSTF) return RESET_WWDG;
    if (csr & RCC_CSR_SFTRSTF)  return RESET_SOFT;
    if (csr & RCC_CSR_PORRSTF)  return RESET_POR;
    if (csr & RCC_CSR_PINRSTF)  return RESET_PIN;
    if (csr & RCC_CSR_BORRSTF)  return RESET_BOR;
    if (csr & RCC_CSR_LPWRRSTF) return RESET_LPWR;
    return RESET_POR;
}
```

main 첫 줄에서 호출해 *Flash에 cause를 기록*해 두면 field에서 *IWDG reset이 자주 나는가*를 분석할 수 있습니다.

## 측정 / 동작 확인

워치독 동작 검증은 일부러 hang을 만듭니다.

```c
iwdg_init_1sec();
GPIOA->BSRR = (1u << 5);   // LED on
delay_ms(500);
GPIOA->BSRR = (1u << 21);  // LED off
delay_ms(500);
GPIOA->BSRR = (1u << 5);   // LED on
while (1);   // hang here — watchdog should reset after 1 sec
```

LED가 켜졌다가 1초 후 보드가 reset 되면서 다시 켜졌다 꺼졌다 합니다. 깜빡임 주기가 정확하지 않으면 LSI 정밀도 ±10% 때문.

## 자주 보는 함정

> ⚠️ `iwdg_kick()`을 main 어디에나 박음

main loop의 모든 path에 refresh가 있으면 *hang 감지가 안 됨*. 핵심 경로에 한 번만 둡니다.

> ⚠️ ISR에서 refresh

ISR이 살아 있어도 main이 죽을 수 있습니다. *main loop의 정상 end*에서만 refresh.

> ⚠️ Debug freeze 빠뜨림

JTAG/SWD로 break 걸면 1초 후 reset. debug 빌드는 freeze 비트 set.

> ⚠️ IWDG timeout이 너무 짧음

100 ms timeout은 1초 운영 동안 9번 refresh가 일어나야 합니다. spurious reset이 잦습니다. *normal cycle의 3-5배* 정도로 두는 것이 안전.

> ⚠️ WWDG window를 너무 좁게

window가 너무 좁으면 jitter 때문에 자주 reset. 처음에는 wide window (W = 0x50 정도)에서 시작.

> ⚠️ Reset cause를 안 기록

field에서 "왜 자꾸 reset 되는가"를 못 따라잡음. cause + timestamp를 backup register나 flash에 기록.

## 정리

- **IWDG**는 LSI 기반, 단순 timeout. Stop/Standby에서도 동작.
- **WWDG**는 PCLK 기반, *window 안*에서만 refresh 허용. 강한 timing 보장.
- Refresh는 **main loop 핵심 경로에 한 번만**, ISR에서 부르지 않음.
- Multi-task는 **check-in mask** 패턴 — 모든 task가 OK해야 refresh.
- Debug build는 **freeze 비트 set**, release는 clear.
- **Reset cause**를 기록하면 field 분석이 쉬워집니다.

다음 편은 **Flash 프로그래밍**입니다. erase·write·EEPROM emulation을 다룹니다.

## 관련 항목

- [4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)
- [4-05: 인터럽트 핸들링](/blog/embedded/modern-recipes/part4-05-interrupt-handling)
- [4-11: 저전력 모드](/blog/embedded/modern-recipes/part4-11-low-power-modes)
- [4-13: Flash 프로그래밍](/blog/embedded/modern-recipes/part4-13-flash-programming)
