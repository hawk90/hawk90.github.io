---
title: "RTC 활용 — Calendar·Alarm·Wake-up Timer·Backup Domain"
date: 2026-04-14T09:62:00
description: "Battery backup·alarm·calendar·tamper."
series: "Modern Embedded Recipes"
seriesOrder: 62
tags: [recipes, peripheral, rtc]
draft: false
---

## 한 줄 요약

> **"32.768 kHz crystal + 작은 코인 배터리 = 전원 꺼져도 시간 유지."** STM32 RTC는 calendar + alarm + tamper까지 한 peripheral에.

## 어떤 상황에서 쓰나

데이터 로거의 timestamp, scheduling (특정 시각 wake-up), low-power 시계, security event timestamping. 전원이 꺼져도 *코인 배터리로 RTC와 backup register 영역만 살려둠*. 다음 power-on 시 *현재 시각이 그대로*.

이 글은 STM32F4 RTC로 LSE 32.768 kHz를 source로 calendar 동작, alarm 설정, tamper detection, sub-second resolution을 다룹니다.

## 핵심 개념

### Clock source

```text
LSE  32.768 kHz external crystal  → 정확 (±20 ppm), 표준 선택
LSI  32 kHz internal RC            → 부정확 (±10%), no crystal 필요
HSE/128 → less common
```

LSE는 *VBAT으로 backup 가능*. LSI는 main power 꺼지면 정지.

### BCD format

STM32 RTC는 *BCD (Binary-Coded Decimal)*. 25 = 0x25 (not 0x19).

**TR (Time Register):**

- [22:20] HT  (hour tens)
- [19:16] HU  (hour units)
- [14:12] MNT
- [11:8]  MNU
- [6:4]   ST
- [3:0]   SU

### Sub-second resolution

RTC는 *PREDIV_S+1 단계*로 1초를 나눔. PREDIV_S=255 → 1/256초 resolution.

```text
LSE / (PREDIV_A+1) = 1 Hz internal counter
PREDIV_A=127, PREDIV_S=255:
   32768 / (127+1) / (255+1) = 1 Hz
   sub-second tick = 32768/128 = 256 Hz → 3.9 ms resolution
```

`RTC->SSR`이 PREDIV_S → 0으로 카운트다운. 시간 비교에 사용.

### Alarm A / Alarm B

두 개의 독립 alarm. 각각 *date·hour·minute·second의 조합* 매칭 시 IRQ. mask 비트로 *특정 field만 일치*시킬 수도.

```text
Alarm A: 매일 09:00 → mask date, second
Alarm A: 매 시 30분  → mask date, hour, second
Alarm A: 매 초       → mask all + second match
```

### Tamper

Pin이 *unexpected edge*를 감지하면 *backup register 자동 erase* + IRQ. 보안 device에서 *case open detection*에 사용.

## 코드 예제

### 1. LSE 활성화 + RTC init

```c
void rtc_init(void) {
    RCC->APB1ENR |= RCC_APB1ENR_PWREN;
    PWR->CR |= PWR_CR_DBP;                     // backup domain access

    if (!(RCC->BDCR & RCC_BDCR_LSEON)) {
        RCC->BDCR |= RCC_BDCR_LSEON;
        while (!(RCC->BDCR & RCC_BDCR_LSERDY));
    }

    RCC->BDCR |= (1u << 8);                    // RTC src = LSE
    RCC->BDCR |= RCC_BDCR_RTCEN;

    RTC->WPR = 0xCA; RTC->WPR = 0x53;          // unlock

    RTC->ISR |= RTC_ISR_INIT;
    while (!(RTC->ISR & RTC_ISR_INITF));

    // PREDIV: 32768 / 128 / 256 = 1 Hz
    RTC->PRER = (127u << 16) | 255u;

    RTC->CR &= ~RTC_CR_FMT;                    // 24-hour mode

    // Set time: 2026-05-18 14:30:00
    RTC->TR = (1u << 20) | (4u << 16)          // 14
            | (3u << 12) | (0u << 8)           // 30
            | (0u << 4)  | (0u);               // 00
    RTC->DR = (2u << 20) | (6u << 16)          // year 26
            | (0u << 12) | (5u << 8)           // month 05
            | (4u << 13)                       // weekday Mon
            | (1u << 4) | (8u);                // day 18

    RTC->ISR &= ~RTC_ISR_INIT;
    RTC->WPR = 0xFF;                           // lock
}
```

### 2. 시간 read / 시간 set

```c
typedef struct {
    uint16_t year;
    uint8_t  month, day, hour, min, sec;
} datetime_t;

void rtc_read(datetime_t *t) {
    // Read TR first (DR follows automatically when SR is read)
    while (!(RTC->ISR & RTC_ISR_RSF));
    uint32_t tr = RTC->TR;
    uint32_t dr = RTC->DR;

    t->hour  = ((tr >> 20) & 3)  * 10 + ((tr >> 16) & 0xF);
    t->min   = ((tr >> 12) & 7)  * 10 + ((tr >> 8)  & 0xF);
    t->sec   = ((tr >> 4)  & 7)  * 10 + ( tr        & 0xF);
    t->year  = ((dr >> 20) & 0xF)* 10 + ((dr >> 16) & 0xF) + 2000;
    t->month = ((dr >> 12) & 1)  * 10 + ((dr >> 8)  & 0xF);
    t->day   = ((dr >> 4)  & 3)  * 10 + ( dr        & 0xF);
}

void rtc_set(const datetime_t *t) {
    PWR->CR |= PWR_CR_DBP;
    RTC->WPR = 0xCA; RTC->WPR = 0x53;
    RTC->ISR |= RTC_ISR_INIT;
    while (!(RTC->ISR & RTC_ISR_INITF));

    int y = t->year - 2000;
    RTC->TR = ((t->hour / 10) << 20) | ((t->hour % 10) << 16)
            | ((t->min  / 10) << 12) | ((t->min  % 10) << 8)
            | ((t->sec  / 10) << 4)  |  (t->sec  % 10);
    RTC->DR = ((y       / 10) << 20) | ((y       % 10) << 16)
            | ((t->month/ 10) << 12) | ((t->month% 10) << 8)
            | ((t->day  / 10) << 4)  |  (t->day  % 10);

    RTC->ISR &= ~RTC_ISR_INIT;
    RTC->WPR = 0xFF;
}
```

### 3. Alarm — 매분 0초

```c
void alarm_init_each_min(void) {
    PWR->CR |= PWR_CR_DBP;
    RTC->WPR = 0xCA; RTC->WPR = 0x53;

    RTC->CR &= ~RTC_CR_ALRAE;        // disable A
    while (!(RTC->ISR & RTC_ISR_ALRAWF));

    RTC->ALRMAR = RTC_ALRMAR_MSK4   // date don't care
                | RTC_ALRMAR_MSK3   // hour don't care
                | RTC_ALRMAR_MSK2   // minute don't care
                | (0 << 4) | 0;     // seconds = 00, second NOT masked

    RTC->CR |= RTC_CR_ALRAE | RTC_CR_ALRAIE;

    EXTI->IMR  |= (1u << 17);        // EXTI line 17 = RTC alarm
    EXTI->RTSR |= (1u << 17);
    NVIC_EnableIRQ(RTC_Alarm_IRQn);
    RTC->WPR = 0xFF;
}

void RTC_Alarm_IRQHandler(void) {
    EXTI->PR = (1u << 17);
    if (RTC->ISR & RTC_ISR_ALRAF) {
        RTC->ISR &= ~RTC_ISR_ALRAF;
        // 매분 0초에 호출됨
        on_minute_tick();
    }
}
```

### 4. Sub-second 측정

```c
uint32_t rtc_ms_in_second(void) {
    // PREDIV_S = 255, 1초 = 256 ticks
    uint32_t ss = RTC->SSR;
    return (255 - ss) * 1000 / 256;   // 0~999 ms
}

void timestamp_now(datetime_t *t, uint16_t *ms) {
    rtc_read(t);
    *ms = rtc_ms_in_second();
}
```

### 5. Backup register

42개의 32-bit register가 VBAT으로 backup. boot flag, calibration value 저장에 적합.

```c
RTC->BKP0R = 0xDEADBEEFu;   // boot magic
uint32_t boot_magic = RTC->BKP0R;

if (boot_magic == 0xDEADBEEFu) {
    // 정상 boot
} else {
    // 첫 boot 또는 power cut
    RTC->BKP0R = 0xDEADBEEFu;
    rtc_set_default_time();
}
```

### 6. Tamper detection

```c
void tamper_init(void) {
    PWR->CR |= PWR_CR_DBP;
    RTC->WPR = 0xCA; RTC->WPR = 0x53;

    RTC->TAFCR = RTC_TAFCR_TAMP1E      // tamper 1 enable
               | RTC_TAFCR_TAMPIE      // interrupt enable
               | RTC_TAFCR_TAMPTS;     // timestamp on tamper

    EXTI->IMR  |= (1u << 21);          // EXTI 21 = tamper
    EXTI->RTSR |= (1u << 21);
    NVIC_EnableIRQ(TAMP_STAMP_IRQn);
    RTC->WPR = 0xFF;
}

void TAMP_STAMP_IRQHandler(void) {
    EXTI->PR = (1u << 21);
    if (RTC->ISR & RTC_ISR_TAMP1F) {
        RTC->ISR &= ~RTC_ISR_TAMP1F;
        // backup register는 *자동 erase*
        log_tamper_event();
    }
}
```

## 측정 / 동작 확인

```c
while (1) {
    datetime_t t;
    uint16_t ms;
    timestamp_now(&t, &ms);
    printf("%04u-%02u-%02u %02u:%02u:%02u.%03u\n",
           t.year, t.month, t.day, t.hour, t.min, t.sec, ms);
    delay_ms(100);
}
```

```text
2026-05-18 14:30:00.123
2026-05-18 14:30:00.225
2026-05-18 14:30:00.326
...
2026-05-18 14:30:01.001
```

시간이 *1초씩 정확히* 증가하고 *sub-second가 잘 측정*되면 정상.

VBAT test: power 끄고 1시간 후 다시 power on. 시간이 살아 있으면 success. 0:00:00으로 reset되면 VBAT 회로 점검.

## 자주 보는 함정

> ⚠️ DBP bit 안 set

backup domain은 write protected. `PWR->CR |= PWR_CR_DBP` 누락하면 *모든 register write 무시*.

> ⚠️ WPR unlock 안 함

`0xCA, 0x53` write 안 하면 RTC register read-only. 모든 write 함수 시작에.

> ⚠️ TR 읽고 DR 안 읽음

TR을 읽으면 shadow가 freeze. DR도 읽어야 *다음 update가 풀림*. 두 register 모두 읽기.

> ⚠️ INITF wait 빠뜨림

`RTC->TR = ...`을 INIT mode 진입 *전에* 하면 무시. always `ISR.INIT` set + wait `INITF`.

> ⚠️ Date weekday 잘못

DR의 WDU 필드 (day of week 1=Mon)가 잘못되면 *일부 alarm match*가 안 됨. 정확히 계산.

> ⚠️ Cold start 시 잘못된 시간

VBAT 없거나 첫 power-on은 시간이 *임의 값*. backup register magic으로 판단 후 default 또는 NTP·user input으로 set.

## 정리

- RTC source는 **LSE 32.768 kHz crystal**. VBAT backup으로 power-off 후에도 유지.
- **BCD format** (TR/DR/ALRMAR), unlock sequence (WPR 0xCA 0x53).
- **PREDIV_S로 sub-second** resolution. 1/256초 = 3.9 ms.
- Alarm A/B는 **mask 비트**로 daily/hourly/minute 조합 가능.
- **Backup register 42개** + **tamper detection**으로 secure timestamping.

이것으로 **Part 5 Peripheral 제어**가 끝납니다. 다음 Part 6부터는 **RTOS 실전 활용**으로 넘어가, FreeRTOS·Zephyr·thread·queue·mutex·event group 등을 다룹니다.

## 관련 항목

- [4-11: 저전력 모드](/blog/embedded/modern-recipes/part4-11-low-power-modes)
- [4-12: 워치독 (IWDG/WWDG)](/blog/embedded/modern-recipes/part4-12-watchdog)
- [5-13: SD card + FatFs](/blog/embedded/modern-recipes/part5-13-sd-card-fatfs)
- [12-11: TF-M·TrustZone](/blog/embedded/modern-recipes/part12-11-tfm-trustzone)
