---
title: "STM32F4 RTC 활용 — Calendar·Alarm·Sub-second·Tamper·Backup Register"
slug: "embedded/modern-recipes/part5-14-rtc-utilization"
date: 2026-04-14T10:02:00
description: "STM32F407 RTC를 LSE로 돌려 BCD calendar를 읽고 쓰고, alarm mask·sub-second·tamper·backup register를 RM0090 기준으로 설정합니다."
series: "Modern Embedded Recipes"
seriesOrder: 62
tags: [recipes, peripheral, rtc]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **RTC clock을 LSE로 두고 VBAT를 유지하면 VDD가 꺼져도 calendar와 backup register 20개(80 bytes)가 남습니다.** 읽을 때는 SSR → TR → DR 순서를 지킵니다.

## 어떤 상황에서 쓰나

데이터 로거의 timestamp, 정해진 시각의 alarm, 케이스 열림을 감지하는 tamper 기록에 씁니다. 주기적으로 깨우는 wake-up timer는 [4-11: 저전력 모드](/blog/embedded/modern-recipes/part4-11-low-power-modes)의 "Standby + RTC wake-up" 절에 코드가 있어 이 글에서는 다루지 않습니다. LSE 오차를 보정하는 smooth calibration(RTC_CALR, RM0090 26.3.11)과 RTC_SHIFTR 위상 이동(26.3.8)도 이 글의 범위 밖입니다.

이 글의 기준은 다음과 같습니다.

- 부품: STM32F407, RTC clock = LSE 32.768 kHz
- 레지스터 동작: [RM0090 Rev 22](https://www.st.com/resource/en/reference_manual/rm0090-stm32f405415-stm32f407417-stm32f427437-and-stm32f429439-advanced-armbased-32bit-mcus-stmicroelectronics.pdf) 26장(RTC)과 7장(RCC)
- 레지스터 이름: [cmsis-device-f4 v2.6.9 `stm32f407xx.h`](https://github.com/STMicroelectronics/cmsis-device-f4/blob/v2.6.9/Include/stm32f407xx.h)
- 확인용 `main`이 쓰는 함수: UART로 retarget한 `_write`([3-07: C 런타임](/blog/embedded/modern-recipes/part3-07-c-runtime)), [4-06: SysTick 타이머](/blog/embedded/modern-recipes/part4-06-systick-timer)의 "delay_ms" 절 `delay_ms`

## 핵심 개념

### Clock source와 backup domain

RTCCLK는 RCC_BDCR의 `RTCSEL[1:0]`으로 고릅니다. VDD가 꺼졌을 때의 동작은 고른 source에 따라 갈립니다(RM0090 7.2.8).

| RTCSEL | Source | VDD가 꺼지면 |
| --- | --- | --- |
| `01` | LSE 32.768 kHz crystal (backup domain) | VBAT가 유지되는 동안 RTC가 계속 돕니다 |
| `10` | LSI 약 32 kHz RC (backup domain 밖) | RM은 "AWU state is not guaranteed"라고 적습니다 |
| `11` | HSE ÷ `RTCPRE`(2~31, 1 MHz로 맞춤) | RTC 상태가 보장되지 않습니다 |

`RTCSEL`은 한 번 정하면 backup domain reset 전에는 바꿀 수 없습니다(RM0090 7.3.20 RCC_BDCR). backup domain reset은 RTC 레지스터를 모두 reset 값으로 돌리므로(RM0090 7.1.3) calendar와 backup register가 함께 사라집니다.

### BCD time·date 레지스터

RTC_TR과 RTC_DR은 BCD입니다. 예를 들어 25초는 `0x25`로 씁니다(`0x19`가 아님). field 배치는 RM0090 26.6.1·26.6.2를 따르며, 아래 `rtc_read`·`rtc_set`의 shift와 mask가 그 배치입니다.

WDU는 `001` = 월요일부터 `111` = 일요일이고 `000`은 금지 값입니다. 날짜를 쓰는 함수는 요일도 함께 받아야 합니다.

TR·DR·PRER은 초기화 모드에서만 씁니다. ISR.INIT를 1로 쓰고 INITF가 1이 될 때까지 기다린 뒤 쓰고, INIT를 0으로 돌리면 4 RTCCLK 뒤에 카운트를 다시 시작합니다(RM0090 26.3.5 "Calendar initialization and configuration"). PRER은 PREDIV_S를 먼저, PREDIV_A를 나중에 두 번 나눠 써야 합니다(같은 절 3단계).

### Prescaler와 sub-second

RM0090 26.3.1의 두 식에 이 글의 PRER 값(PREDIV_A = 127, PREDIV_S = 255)을 넣습니다.

- `f_ck_apre` = 32768 / (127 + 1) = 256 Hz. RTC_SSR 다운카운터의 clock입니다.
- `f_ck_spre` = 32768 / ((255 + 1) × (127 + 1)) = 1 Hz. calendar를 올리는 clock입니다.

RTC_SSR은 PREDIV_S에서 0까지 내려가고, 초의 소수부는 `(PREDIV_S − SS) / (PREDIV_S + 1)`입니다(RM0090 26.6.11). PREDIV_S = 255면 해상도는 1/256 s = 3.90625 ms입니다. 이를 정수 ms로 내림하면 값은 ⌊1000k / 256⌋ (k = 0~255), 즉 0, 3, 7, 11, …, 996의 256개뿐입니다.

### Shadow register와 읽기 순서

BYPSHAD = 0(reset 값)이면 SSR·TR·DR 읽기는 2 RTCCLK마다 갱신되는 shadow register를 읽습니다. 이 모드에서는 PCLK1이 RTCCLK의 7배 이상이어야 하므로 LSE 기준 229.376 kHz 이상입니다(RM0090 26.3.2). SSR이나 TR을 읽으면 상위 shadow 값이 DR을 읽을 때까지 잠깁니다(RM0090 26.3.6). 그래서 한 시각의 세 값을 맞추려면 SSR → TR → DR 순서로 읽습니다. HAL도 `HAL_RTC_GetTime`에서 SSR을 TR보다 먼저 읽습니다([stm32f4xx-hal-driver v1.8.3 `stm32f4xx_hal_rtc.c`](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.3/Src/stm32f4xx_hal_rtc.c)).

### Alarm mask

Alarm A와 B는 ALRMxR의 `MSKx` 비트로 field마다 비교 여부를 정합니다. `MSKx = 1`이면 그 field는 don't care입니다(RM0090 26.6.8).

| 목적 | MSK4 (날짜) | MSK3 (시) | MSK2 (분) | MSK1 (초) | 비교 값 |
| --- | :---: | :---: | :---: | :---: | --- |
| 매일 09:00:00 | 1 | 0 | 0 | 0 | 09:00:00 |
| 매시 30분 00초 | 1 | 1 | 0 | 0 | 30:00 |
| 매분 00초 | 1 | 1 | 1 | 0 | 00 |
| 매초 | 1 | 1 | 1 | 1 | 없음 |

매일 alarm에서 초까지 mask하면 09:00:00부터 09:00:59까지 60번 일치합니다. 매초 행은 ALRMASSR의 MASKSS = 0과 함께 씁니다. MASKSS = 0이면 나머지 field가 일치하는 동안 초 단위가 올라갈 때마다 flag가 섭니다(RM0090 26.6.18). 초를 비교하면(MSK1 = 0) PREDIV_S가 3 이상이어야 하는데(RM0090 26.3.3 Caution), 이 글의 255는 이 조건을 만족합니다.

### Tamper

RTC의 tamper 입력은 2개이고, TAMPER2는 패키지에 해당 pin이 있을 때만 씁니다(RM0090 Table 120 주석). tamper event가 나면 backup register가 모두 reset되고 TAMPxF가 섭니다. TAFCR.TAMPTS = 1이면 그 시각이 RTC_TSTR·TSDR에 저장됩니다(RM0090 26.3.13). RM0090 26.6.20은 이 reset에 "as long as TAMPxF=1"이라는 조건을 붙이므로, 이 글의 코드는 TAMP1F를 지운 뒤에 backup register를 씁니다.

TAMPFLT = `00`(edge 검출)에서 TAMP1TRG = 0이면 rising edge가 event입니다. 이 모드에서는 내부 pull-up이 꺼집니다. 또 TAMP1E를 켤 때 pin이 이미 high면 edge가 없어도 바로 event가 납니다. tamper 검출은 VDD가 꺼진 동안에도 동작하므로 pin을 외부에서 정상 level로 묶어 둡니다(같은 절 Caution·Note). TAMPER1은 TAMP1INSEL = 0이면 PC13(RTC_AF1)에 매핑됩니다. RTC_ALARM·RTC_CALIB 출력을 켜지 않고 TAMPER1을 켜면 PC13의 설정은 "TAMPER1 input floating"입니다(RM0090 8.3.15, Table 38). TAMP1INSEL은 TAMP1E를 끈 상태에서 바꿔야 합니다(RM0090 26.3.13 "TAMPER alternate function detection").

## 코드 예제

### 1. 공통 helper

```c
static void rtc_unlock(void) { RTC->WPR = 0xCA; RTC->WPR = 0x53; }
static void rtc_lock(void)   { RTC->WPR = 0xFF; }   /* wrong key re-enables protection */

/* ISR flags are rc_w0 and INIT is the only rw bit, so every ISR access below
   is a plain write: 1 in a flag position has no effect. */
static void rtc_enter_init(void) {
    RTC->ISR = 0xFFFFFFFFu;                  /* INIT = 1 (LL_RTC_EnableInitMode) */
    while (!(RTC->ISR & RTC_ISR_INITF));
}

static void rtc_exit_init(void) {
    RTC->ISR = ~RTC_ISR_INIT;                /* INIT = 0 (LL_RTC_DisableInitMode) */
}

/* Clears only `flags`; INIT keeps its current value
   (same expression as HAL __HAL_RTC_ALARM_CLEAR_FLAG). */
static void rtc_clear_flags(uint32_t flags) {
    RTC->ISR = ~(flags | RTC_ISR_INIT) | (RTC->ISR & RTC_ISR_INIT);
}

static uint32_t from_bcd(uint32_t v) { return (v >> 4) * 10u + (v & 0xFu); }
static uint32_t to_bcd(uint32_t v)   { return ((v / 10u) << 4) | (v % 10u); }
```

WPR key 없이 쓸 수 있는 것은 ISR[13:8], TAFCR, BKPxR뿐이고, 나머지 RTC 레지스터는 key 두 바이트를 써야 열립니다(RM0090 26.3.5 "RTC register write protection"). RTC_ISR에서 rw bit는 INIT 하나이고 flag는 모두 rc_w0입니다(RM0090 26.6.4). 그래서 세 helper 모두 `|=`·`&=` 대신 값을 직접 씁니다. 읽기와 쓰기 사이에 다른 flag가 서면 `|=`·`&=`는 그 flag에 읽어 둔 0을 다시 써서 지워 버리지만, 직접 쓰기는 다른 flag 자리에 1을 쓰므로 영향이 없습니다. `rtc_set`의 초기화 구간에 TAMP1F나 ALRAF가 서도 남는 이유입니다. 쓰는 값은 [HAL v1.8.3 `stm32f4xx_ll_rtc.h`](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.3/Inc/stm32f4xx_ll_rtc.h)의 `LL_RTC_EnableInitMode`·`LL_RTC_DisableInitMode`, [`stm32f4xx_hal_rtc.h`](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.3/Inc/stm32f4xx_hal_rtc.h)의 `__HAL_RTC_ALARM_CLEAR_FLAG`와 같습니다.

### 2. LSE 활성화 + RTC init

```c
/* Returns 1 if the calendar survived (VBAT kept the backup domain),
   0 if it was initialised to the default time. */
int rtc_init(void) {
    RCC->APB1ENR |= RCC_APB1ENR_PWREN;
    PWR->CR |= PWR_CR_DBP;                       /* unlock RCC_BDCR and RTC */

    if (!(RCC->BDCR & RCC_BDCR_LSERDY)) {
        RCC->BDCR |= RCC_BDCR_LSEON;
        while (!(RCC->BDCR & RCC_BDCR_LSERDY));
    }
    if ((RCC->BDCR & RCC_BDCR_RTCSEL) == 0) {    /* 00 = not selected yet */
        RCC->BDCR |= RCC_BDCR_RTCSEL_0;          /* 01 = LSE */
    }
    RCC->BDCR |= RCC_BDCR_RTCEN;

    if (RTC->ISR & RTC_ISR_INITS) {              /* year field != 0 */
        return 1;
    }

    rtc_unlock();
    rtc_enter_init();
    RTC->PRER = 255u;                            /* PREDIV_S first ... */
    RTC->PRER |= 127u << 16;                     /* ... then PREDIV_A */
    RTC->CR &= ~RTC_CR_FMT;                      /* 24-hour format */
    RTC->TR = 0x00143000u;                       /* 14:30:00 */
    RTC->DR = 0x00262518u;                       /* 2026-05-18, WDU = 1 (Monday) */
    rtc_exit_init();
    rtc_lock();
    return 0;
}
```

calendar가 살아 있는지는 ISR.INITS로 판단합니다. INITS는 year field가 0이 아닐 때 1이고, backup domain reset이 나면 year가 0으로 돌아갑니다(RM0090 26.6.4, 26.3.5 Note). 그래서 기본 year를 00(2000년)으로 쓰면 이 판단이 성립하지 않습니다. INITS는 year field만 보므로 backup register가 지워졌는지는 알려 주지 않습니다. 앱 데이터는 "Backup register" 절의 `BKP0R` magic으로 따로 확인합니다.

`RTC->DR`의 `0x00262518`은 YT·YU = `0x26`, WDU = 1(bit 13), MT·MU = `0x05`, DT·DU = `0x18`입니다. 2026-05-18은 월요일입니다.

### 3. 시간 읽기·쓰기

```c
typedef struct {
    uint16_t year;                  /* 2000..2099 */
    uint8_t  month, day;
    uint8_t  weekday;               /* RTC_DR.WDU: 1 = Monday ... 7 = Sunday, 0 is forbidden */
    uint8_t  hour, min, sec;
    uint16_t ms;
} datetime_t;

void rtc_read(datetime_t *t) {
    while (!(RTC->ISR & RTC_ISR_RSF));
    uint32_t ss = RTC->SSR;         /* locks TR/DR shadows ... */
    uint32_t tr = RTC->TR;
    uint32_t dr = RTC->DR;          /* ... until DR is read */
    uint32_t s  = RTC->PRER & RTC_PRER_PREDIV_S;

    t->hour    = from_bcd((tr >> 16) & 0x3Fu);
    t->min     = from_bcd((tr >> 8)  & 0x7Fu);
    t->sec     = from_bcd( tr        & 0x7Fu);
    t->year    = 2000u + from_bcd((dr >> 16) & 0xFFu);
    t->weekday = (dr >> 13) & 0x7u;
    t->month   = from_bcd((dr >> 8) & 0x1Fu);
    t->day     = from_bcd( dr       & 0x3Fu);
    t->ms      = (uint16_t)((s - ss) * 1000u / (s + 1u));
}

/* Returns -1 without writing if weekday is outside 1..7 (WDU = 000 is forbidden). */
int rtc_set(const datetime_t *t) {
    if (t->weekday < 1u || t->weekday > 7u) {
        return -1;
    }
    uint32_t tr = (to_bcd(t->hour) << 16) | (to_bcd(t->min) << 8) | to_bcd(t->sec);
    uint32_t dr = (to_bcd(t->year - 2000u) << 16) | ((uint32_t)t->weekday << 13)
                | (to_bcd(t->month) << 8) | to_bcd(t->day);

    PWR->CR |= PWR_CR_DBP;
    rtc_unlock();
    rtc_enter_init();
    RTC->TR = tr;
    RTC->DR = dr;
    rtc_exit_init();
    rtc_lock();
    return 0;
}

/* Call after wake-up from Stop or Standby, or before re-reading within 1 RTCCLK. */
void rtc_resync(void) {
    PWR->CR |= PWR_CR_DBP;
    rtc_unlock();                   /* RSF is ISR[5], outside the key-free ISR[13:8] */
    rtc_clear_flags(RTC_ISR_RSF);
    rtc_lock();
}
```

`rtc_read`는 sub-second까지 한 번에 읽습니다. ms는 PRER에서 읽은 PREDIV_S로 계산하므로 PRER 값을 바꿔도 식을 고칠 필요가 없습니다. 첫 줄의 RSF 대기는 system reset과 초기화 뒤 shadow가 다시 채워질 때까지 기다립니다. RSF는 초기화 모드에서 hardware가 지우지만, Stop·Standby에서 깬 뒤와 1 RTCCLK(약 30.5 µs)보다 짧은 간격으로 다시 읽을 때는 소프트웨어가 RSF를 지우고 다시 기다려야 합니다(RM0090 26.3.6, 26.6.4). 그 두 경우에는 `rtc_resync()`를 부른 뒤 `rtc_read()`를 부릅니다. `rtc_set`은 weekday가 1~7이 아니면 레지스터를 쓰지 않으므로 WDU에 금지 값 `000`이 들어가지 않습니다.

### 4. Alarm — 매분 0초

```c
void alarm_init_each_min(void) {
    EXTI->IMR  |= 1u << 17;                     /* EXTI17 = RTC Alarm, rising edge */
    EXTI->RTSR |= 1u << 17;
    NVIC_EnableIRQ(RTC_Alarm_IRQn);

    PWR->CR |= PWR_CR_DBP;
    rtc_unlock();
    RTC->CR &= ~(RTC_CR_ALRAE | RTC_CR_ALRAIE);
    while (!(RTC->ISR & RTC_ISR_ALRAWF));
    RTC->ALRMAR = RTC_ALRMAR_MSK4               /* date don't care   */
                | RTC_ALRMAR_MSK3               /* hours don't care  */
                | RTC_ALRMAR_MSK2;              /* minutes don't care; seconds = 00 compared */
    RTC->ALRMASSR = 0;                          /* MASKSS = 0: sub-seconds not compared */
    rtc_clear_flags(RTC_ISR_ALRAF);
    RTC->CR |= RTC_CR_ALRAIE | RTC_CR_ALRAE;
    rtc_lock();
}

void RTC_Alarm_IRQHandler(void) {
    if (RTC->ISR & RTC_ISR_ALRAF) {
        rtc_clear_flags(RTC_ISR_ALRAF);
        on_minute_tick();                       /* application hook */
    }
    EXTI->PR = 1u << 17;
}
```

순서는 RM0090 26.5의 "EXTI line 17 rising edge → NVIC → RTC alarm 설정"과 26.3.5 "Programming the alarm"의 "ALRAE 끄기 → ALRAWF 대기 → ALRMAR 쓰기 → 다시 켜기"를 따릅니다.

### 5. Tamper detection

```c
void tamper_init(void) {
    PWR->CR |= PWR_CR_DBP;                     /* TAFCR needs DBP, not the WPR key */
    RTC->TAFCR &= ~RTC_TAFCR_TAMP1E;           /* off while TAMP1INSEL is written */
    rtc_clear_flags(RTC_ISR_TAMP1F | RTC_ISR_TSF);  /* clear before writing BKPxR (26.6.20) */

    EXTI->IMR  |= 1u << 21;                    /* EXTI21 = RTC Tamper/TimeStamp, rising edge */
    EXTI->RTSR |= 1u << 21;
    NVIC_EnableIRQ(TAMP_STAMP_IRQn);

    /* TAMPFLT = 00 (edge), TAMP1TRG = 0 (rising), TAMP1INSEL = 0 (PC13) */
    RTC->TAFCR = RTC_TAFCR_TAMPIE | RTC_TAFCR_TAMPTS;
    RTC->TAFCR |= RTC_TAFCR_TAMP1E;            /* re-enable before writing BKPxR; PC13 must be low */
}

void TAMP_STAMP_IRQHandler(void) {
    if (RTC->ISR & RTC_ISR_TAMP1F) {
        /* BKP0R..BKP19R are already reset by hardware */
        log_tamper_event(RTC->TSTR, RTC->TSDR); /* application hook */
        rtc_clear_flags(RTC_ISR_TAMP1F | RTC_ISR_TSF);
        /* TAMP1E stays set: call tamper_init() again before writing BKPxR */
    }
    EXTI->PR = 1u << 21;
}
```

RM0090 26.3.13은 tamper event를 처리해 flag를 지운 뒤, backup register를 다시 쓰기 전에 TAMPxE를 껐다가 다시 켜라고 합니다("should be disabled and then re-enabled (TAMPxE set to 1) before re-programming the backup registers"). 다시 켤 때 pin이 이미 tamper level이면 edge가 없어도 그 순간 event가 나고(같은 절 Caution) backup register가 다시 지워집니다. `tamper_init`은 TAMP1E를 끄고, 이전 boot에서 남은 TAMP1F·TSF를 지우고, TAMP1E를 다시 켭니다. 그래서 부팅 때는 `rtc_init()` → `tamper_init()` → 다음 절의 `bkp_check()` 순서로 부릅니다.

TAMPTS = 1이면 tamper 때 TSF도 함께 서므로 handler에서 같이 지웁니다(RM0090 26.3.13 "Timestamp on tamper event"). TSF를 남겨 두면 다음 tamper 때 TSTR·TSDR이 갱신되지 않고 TSOVF가 섭니다(RM0090 26.3.12).

### 6. Backup register

STM32F407의 backup register는 `BKP0R`~`BKP19R` 20개(32-bit, 80 bytes)입니다. VBAT로 유지되며 system reset이나 Standby wake-up에는 지워지지 않습니다. backup domain reset에는 지워지고, tamper event에는 "as long as TAMPxF=1"이라는 조건으로 지워집니다(RM0090 26.3.13 "RTC backup registers", 26.6.20). 쓰려면 DBP만 켜면 되고 WPR key는 필요 없습니다.

```c
#define BKP_MAGIC 0xA5A5F407u   /* any value other than the reset value 0 */

/* Returns 1 if BKP1R..BKP19R still hold application data.
   Call after tamper_init(), which clears TAMP1F and re-arms TAMPER1. */
int bkp_check(void) {
    PWR->CR |= PWR_CR_DBP;
    if (RTC->BKP0R == BKP_MAGIC) {
        return 1;
    }
    RTC->BKP0R = BKP_MAGIC;             /* backup domain reset or tamper since last boot */
    return 0;
}
```

`bkp_check`는 `tamper_init` 뒤에 부르므로 magic을 쓰는 시점에는 TAMP1F가 지워져 있고, TAMPER1도 RM이 말한 대로 다시 켜져 있습니다.

## 측정 / 동작 확인

```c
int main(void) {
    int kept = rtc_init();
    printf("calendar %s\n", kept ? "kept" : "reset to default");
    for (;;) {
        datetime_t t;
        rtc_read(&t);
        printf("%04u-%02u-%02u %02u:%02u:%02u.%03u\n",
               t.year, t.month, t.day, t.hour, t.min, t.sec, t.ms);
        delay_ms(100);
    }
}
```

루프 한 바퀴가 1 s보다 짧다는 전제에서, 출력을 다음처럼 판정합니다.

| 관찰 | 판정 |
| --- | --- |
| ms가 직전 줄보다 작아진 줄에서 초가 1 늘어남 | 합격 |
| ms가 작아진 줄에서는 초가 그대로이고, 다음 줄에서야 초가 늘어남 | 실패: SSR을 TR·DR 뒤에 읽어 TR이 직전 SSR 읽기 시점 값으로 잠겨 있음 |
| 시·분·초가 더 이상 바뀌지 않음 | 실패: DR을 읽지 않아 TR shadow가 풀리지 않음 |

둘째·셋째 행은 RM0090 26.3.6의 잠금 규칙("reading either RTC_SSR or RTC_TR locks the values in the higher-order calendar shadow registers until RTC_DR is read")에서 이 글이 추론한 증상입니다.

VBAT 유지 시험은 VBAT에 전지를 연결한 보드에서 합니다.

1. 한 번 실행하고, VDD를 끄기 직전 마지막 출력 줄의 시각을 적습니다.
2. VBAT는 연결한 채 VDD만 60 s 이상 끕니다.
3. VDD를 다시 넣고 첫 시각 출력을 1의 시각과 비교합니다.

| 관찰 | 판정 |
| --- | --- |
| `calendar kept`이고, 시각이 1의 시각보다 60 s 이상 뒤 | 합격 |
| `calendar kept`이지만 시각이 1의 시각보다 60 s 미만 뒤 | 실패: VDD가 꺼진 동안 calendar가 세지 않음 |
| `calendar reset to default`이고 2026-05-18 14:30:00부터 다시 셈 | 실패: backup domain reset. VDD와 VBAT가 모두 꺼졌다가 켜진 경우입니다(RM0090 7.1.3). 전지가 없는 보드에서 RM이 권하는 대로 VBAT를 VDD에 묶었다면 이 결과가 정상입니다(RM0090 5.1.2) |

## 자주 보는 함정

> ⚠️ DBP를 켜지 않음

RCC_BDCR의 LSEON·RTCSEL·RTCEN은 backup domain에 있어 PWR_CR.DBP를 켜기 전에는 쓰기가 막힙니다(RM0090 7.3.20). LSEON이 켜지지 않으니 `rtc_init`은 LSERDY 대기 루프에서 멈춥니다.

> ⚠️ WPR key를 쓰지 않음

INIT는 ISR[7]이라 key 예외 범위(ISR[13:8])에 들지 않습니다. key 없이 `rtc_enter_init`을 부르면 INIT가 서지 않아 INITF 대기 루프에서 멈춥니다.

> ⚠️ RTC clock source를 나중에 바꾸려 함

양산 펌웨어를 LSI에서 LSE로 바꾸면 `RTCSEL`이 이미 `10`이라 쓰기가 반영되지 않습니다. 바꾸려면 BDCR.BDRST로 backup domain을 reset해야 하고, 이때 calendar와 backup register가 모두 지워집니다(RM0090 7.1.3, 7.3.20).

> ⚠️ Tamper pin level을 정하지 않고 TAMP1E를 켬

TAMP1TRG = 0(rising edge)에서 PC13이 이미 high면 TAMP1E를 켜는 순간 tamper event가 나고 backup register가 지워집니다. 정상 상태에서 PC13을 외부에서 low로 묶고, 케이스가 열리면 high가 되게 배선합니다.

## 정리

- RTC clock은 LSE로 고릅니다. VBAT가 유지되면 VDD가 꺼져도 calendar가 돌고, `RTCSEL`은 backup domain reset 전까지 한 번만 정할 수 있습니다.
- calendar가 살아 있는지는 ISR.INITS로, 앱 데이터가 남았는지는 `BKP0R` magic으로 판단합니다. backup register는 `tamper_init`이 TAMP1F를 지우고 TAMPER1을 다시 켠 뒤에 씁니다.
- ISR은 `|=`·`&=` 없이 직접 써서, 다른 rc_w0 flag를 함께 지우지 않습니다.
- 한 시각을 읽을 때는 SSR → TR → DR 순서로 읽습니다. PREDIV_S = 255면 sub-second 해상도는 1/256 s입니다.
- Alarm은 비교할 field만 `MSKx = 0`으로 둡니다. 초를 mask하면 일치하는 1분 동안 매초 flag가 섭니다.

이것으로 Part 5 Peripheral 제어가 끝납니다. 다음 글은 [6-01: RTOS 도입 결정 분석](/blog/embedded/modern-recipes/part6-01-rtos-decision)입니다.

## 관련 항목

- [4-11: 저전력 모드](/blog/embedded/modern-recipes/part4-11-low-power-modes) — RTC wake-up timer로 Standby에서 깨기
- [4-06: SysTick 타이머](/blog/embedded/modern-recipes/part4-06-systick-timer)
- [5-13: SD 카드 SPI 모드 + FatFs](/blog/embedded/modern-recipes/part5-13-sd-card-fatfs)
