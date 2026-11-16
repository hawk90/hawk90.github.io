---
title: "저전력 모드 분석 — Sleep·Stop·Standby·Wake-up Source"
slug: "embedded/modern-recipes/part4-11-low-power-modes"
date: 2026-04-13T09:45:00
description: "STM32F407 데이터시트 값으로 Sleep·Stop·Standby의 전류·wake 시간·wake source를 비교하고, 1초 주기 duty cycle의 평균 전류를 계산합니다."
series: "Modern Embedded Recipes"
seriesOrder: 45
tags: [recipes, bare-metal, low-power]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> Sleep은 CPU 몫만 줄이고, Stop과 Standby 사이의 선택은 깨어난 뒤 SRAM 내용이 필요한가로 정해집니다.

## 어떤 상황에서 쓰나

배터리로 동작하는 sensor 노드는 깨어 있는 시간보다 자는 시간이 훨씬 길게 설계됩니다. 이 글은 세 가지 질문에 답합니다.

- 세 모드는 각각 무엇을 끄고 무엇을 남기며, 데이터시트 기준 전류와 wake 시간은 얼마인가
- 각 모드에서 무엇으로 깨울 수 있는가
- 같은 duty cycle에서 Stop과 Standby를 고르면 평균 전류가 얼마나 달라지는가

대상은 STM32F407(Cortex-M4, 최대 168 MHz)입니다. 수치는 모두 STM32F405xx/STM32F407xx 데이터시트 [DS8626](https://www.st.com/resource/en/datasheet/stm32f407vg.pdf) **Rev 4**(DocID022152, 2013-06)에서, 진입·탈출 조건은 ST HAL v1.8.3 `stm32f4xx_hal_pwr.c`의 모드 설명과 STM32CubeF4 예제에서 가져왔습니다. st.com의 최신 revision과 reference manual RM0090은 이 글을 고치는 동안 내려받지 못해 대조하지 못했습니다. 코드의 레지스터 이름은 [cmsis-device-f4 v2.6.9 `stm32f407xx.h`](https://github.com/STMicroelectronics/cmsis-device-f4/blob/v2.6.9/Include/stm32f407xx.h)에 있는 이름입니다.

## 핵심 개념

### 세 가지 저전력 모드

DS8626 Rev 4 2.2.19절 "Low-power modes"의 정의와 5.3.6·5.3.7절 표의 typical 값을 한 표에 모았습니다. 전류는 모두 TA = 25 °C, VDD = 3.3 V이고, 5.3.6절 공통 조건(모든 I/O를 analog input으로 설정, 명시하지 않으면 peripheral 비활성)에서 잰 값입니다. Run·Sleep 행은 4 MHz 외부 clock에 PLL을 켠 조건입니다(Table 20·22 주).

| 모드 | 무엇이 멈추나 | SRAM·레지스터 | Wake 시간 typ (Table 28) | IDD typ |
|------|---------------|---------------|--------------------------|---------|
| **Run** 168 MHz | — | 유지 | — | 40 / 87 mA ¹ (Table 20) |
| **Sleep** 168 MHz | CPU만 | 유지 | 1 µs | 12 / 59 mA ¹ (Table 22) |
| **Stop** | V12 domain의 모든 clock, PLL·HSI·HSE | 유지 | 13 / 17 µs ⁴ | 0.45 / 0.31 mA ² (Table 23) |
| **Standby** | V12 domain 전원 자체 | backup domain 레지스터와 (선택 시) backup SRAM만 유지 | 375 µs | 3.3 / 2.2 µA ³ (Table 24) |

¹ peripheral 전부 off / 전부 on.

² main regulator in Run mode / main regulator in Low Power mode. 두 값 모두 Table 23의 "Flash in Stop mode"(Deep power down 아님), low-speed·high-speed internal RC와 high-speed oscillator OFF, "no independent watchdog" 조건입니다.

⁴ Table 28의 "regulator in Run mode" / "regulator in low power mode". flash를 Deep power down으로 둔 경우는 별도 행으로 110 µs입니다.

³ low-speed oscillator·RTC on / RTC off. 두 값 모두 backup SRAM off 조건입니다.

Table 28의 wake 시간은 "measured from the wakeup event to the point in which the application code reads the first instruction"입니다(Table 28 주 2). Standby는 reset으로 다시 시작하므로 그 뒤의 clock 설정과 C runtime 초기화는 이 375 µs에 들어 있지 않습니다.

표에서 읽을 수 있는 것은 두 가지입니다.

- **Sleep이 줄이는 것은 CPU 몫입니다.** 같은 peripheral 조건끼리 168 MHz Run → Sleep은 전부 on일 때 87 → 59 mA(−32 %), 전부 off일 때 40 → 12 mA(−70 %)로, 두 경우 모두 28 mA가 줄어듭니다. Sleep에 남는 59 mA 중 peripheral clock을 꺼서 없앨 수 있는 것은 59 − 12 = 47 mA까지이고, peripheral을 모두 꺼도 12 mA는 남습니다(Table 22). Run에서도 87 − 40 = 47 mA로 같습니다.
- **Stop과 Standby의 전류 차이는 약 141배입니다.** Table 23 low-power regulator 행 0.31 mA ÷ Table 24 RTC off·backup SRAM off 행 2.2 µA ≈ 141입니다. 대가는 wake 시간(17 µs 대 375 µs)과 SRAM 내용입니다.

### Wake-up 메커니즘

**Sleep** — [HAL PWR v1.8.3의 "Sleep mode" 설명](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.3/Src/stm32f4xx_hal_pwr.c)대로 "Any peripheral interrupt acknowledged by the nested vectored interrupt controller (NVIC) can wake up the device from Sleep mode"입니다. WFI(wait for interrupt)나 WFE(wait for event)로 들어갑니다.

**Stop** — HAL 설명은 "Any EXTI Line (Internal or External) configured in Interrupt/Event mode"이고, DS8626 2.2.19절은 EXTI source로 다음을 듭니다.

- 16개 external line (GPIO edge)
- PVD 출력
- RTC alarm / wakeup / tamper / time stamp 이벤트
- USB OTG FS/HS wakeup
- Ethernet wakeup

**Standby** — DS8626 2.2.19절이 드는 탈출 조건은 다음과 같습니다.

- NRST 핀 외부 reset
- IWDG reset
- WKUP 핀 rising edge (F407은 PA0, 핀 표의 `PA0_WKUP`)
- RTC alarm / wakeup / tamper / time stamp 이벤트

Standby 복귀는 reset과 같아서, 시작 코드가 복귀인지 구분해야 합니다(아래 "3. Standby + RTC wake-up" 절).

### Duty-cycling 전략

평균 전류 = (active 전류 × active 시간 + sleep 전류 × sleep 시간) / 주기.

예를 들어 1 s 주기에서 168 MHz Run 10 ms, 저전력 990 ms로 동작한다고 해 봅니다. Run은 Table 20의 peripheral 전부 off 값 40 mA를 씁니다.

| 저전력 구간 | sleep 전류 | 평균 전류 | 평균에서 sleep 항의 비중 |
|-------------|-----------|-----------|--------------------------|
| Stop, low-power regulator | 0.31 mA | (400 + 306.9) / 1000 ≈ 0.71 mA | 306.9 / 706.9 ≈ 43 % |
| Standby, low-speed oscillator·RTC on | 3.3 µA | (400 + 3.267) / 1000 ≈ 0.40 mA | 3.267 / 403.267 ≈ 0.8 % |

(분자의 단위는 mA·ms입니다. 40 mA × 10 ms = 400.)

- Stop을 고르면 sleep 구간이 평균의 43 %를 차지합니다. active 구간을 줄이는 것만으로는 0.31 mA 아래로 내려갈 수 없습니다.
- Standby를 고르면 sleep 항은 0.8 %이고 나머지는 active 10 ms에서 나옵니다. 이때 줄일 대상은 active 시간과 active 전류입니다.

이 계산의 가정은 네 가지입니다.

- active 40 mA는 peripheral 전부 off 값입니다. 아래 코드는 GPIOA·USART2·PWR·SYSCFG clock과 LSE를 켜 두는데, peripheral clock은 이 조건 밖이고 LSE 같은 oscillator 몫은 따로 더하라고 되어 있으므로(Table 20 주 5) 40 mA는 하한입니다. 전부 on인 87 mA를 넣으면 평균은 Stop (870 + 306.9) / 1000 ≈ 1.18 mA, Standby (870 + 3.267) / 1000 ≈ 0.87 mA입니다.
- Table 23의 Stop 조건은 LSI·HSI·HSE off만 적고 LSE·RTC 상태는 적지 않습니다. 아래 코드는 LSE와 RTC를 켜 두므로 그 몫은 이 0.31 mA에 들어 있지 않고, 이 글이 연 자료에는 그 값이 없습니다.
- Stop wake 17 µs와 Standby wake 375 µs 동안의 전류, Standby에서 깰 때 voltage regulator의 inrush는 넣지 않았습니다. DS8626 Table 19의 inrush 에너지 ERUSH는 VDD = 1.8 V, TA = 105 °C 조건의 max 5.4 µC("Guaranteed by design")만 있고, 이 계산의 3.3 V·25 °C 값은 주지 않습니다.
- Standby는 깰 때마다 reset부터 다시 시작하므로 clock 설정과 초기화 시간이 active 10 ms 안에 들어 있어야 합니다.

## 코드 예제

### 1. Sleep on WFI

```c
void sleep_now(void) {
    SCB->SCR &= ~SCB_SCR_SLEEPDEEP_Msk;   // sleep mode (not deep)
    __WFI();                              // wait for interrupt
    // wake here
}

while (1) {
    do_work();
    sleep_now();
}
```

SysTick을 1 kHz로 설정해 두었다면 SysTick interrupt가 1 ms마다 깨우므로, 더 길게 자려면 SysTick을 끄고 다른 wake source를 씁니다([4-06: SysTick 타이머](/blog/embedded/modern-recipes/part4-06-systick-timer)).

### 2. Stop mode (EXTI wake-up)

```c
void stop_mode_enter(void) {
    RCC->APB1ENR |= RCC_APB1ENR_PWREN;  // PWR 레지스터 접근
    PWR->CR |= PWR_CR_LPDS;             // Stop 중 low-power regulator
    PWR->CR &= ~PWR_CR_PDDS;            // 0 = Stop (1 = Standby)

    SCB->SCR |= SCB_SCR_SLEEPDEEP_Msk;
    __WFI();

    // === wake ===
    SCB->SCR &= ~SCB_SCR_SLEEPDEEP_Msk;

    // Stop에서 깨면 system clock이 HSI → PLL 재구성
    clock_init_168mhz();
}

void exti0_wake_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_SYSCFGEN;
    SYSCFG->EXTICR[0] &= ~(0xFu << 0);   // EXTI0 = PA0
    EXTI->IMR  |= (1u << 0);
    EXTI->RTSR |= (1u << 0);
    NVIC_EnableIRQ(EXTI0_IRQn);
}

void EXTI0_IRQHandler(void) {
    EXTI->PR = (1u << 0);
}
```

`PWR->CR`에 쓰기 전에 RCC_APB1ENR의 PWREN(power interface clock)을 켭니다. `PWR_CR_LPDS`를 켜고 `PWR_CR_FPDS`(flash power-down)는 켜지 않았으므로 이 설정은 Table 23의 regulator Low Power mode·Flash in Stop mode 행(0.31 mA typ)과 Table 28의 "regulator in low power mode" 행(wake 17 µs typ)에 해당합니다.

Stop에서 깨면 HSI(16 MHz 내부 RC)가 system clock으로 선택됩니다([HAL PWR v1.8.3 `HAL_PWR_EnterSTOPMode` 주석](https://github.com/STMicroelectronics/stm32f4xx-hal-driver/blob/v1.8.3/Src/stm32f4xx_hal_pwr.c), "When exiting Stop mode by issuing an interrupt or a wake-up event, the HSI RC oscillator is selected as system clock"). PLL을 다시 켜지 않으면 16 MHz로 돌고, 168 MHz 기준으로 계산한 UART baud rate와 timer 주기가 어긋납니다. `clock_init_168mhz()`는 [4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)의 함수입니다.

### 3. Standby + RTC wake-up

RTC는 backup domain에 있어 Standby에서도 동작합니다. 아래 코드는 [5-14: RTC 활용](/blog/embedded/modern-recipes/part5-14-rtc-utilization)의 `rtc_init()`으로 LSE(32.768 kHz)를 RTC clock으로 이미 설정했다고 가정합니다. Standby를 건너 남겨야 하는 값은 5-14의 "Backup register" 절처럼 backup register에 둡니다.

```c
// seconds: 1..31 (WUTR은 16-bit)
void standby_with_rtc_wake(uint32_t seconds) {
    if (seconds == 0 || seconds > 31) return;

    RCC->APB1ENR |= RCC_APB1ENR_PWREN;
    PWR->CR |= PWR_CR_DBP;              // backup domain write protection 해제

    RTC->WPR = 0xCA; RTC->WPR = 0x53;   // RTC write protection 해제
    RTC->CR &= ~(RTC_CR_WUTE | RTC_CR_WUTIE);
    while (!(RTC->ISR & RTC_ISR_WUTWF));
    RTC->CR &= ~RTC_CR_WUCKSEL;         // 000 = RTCCLK/16 = 2048 Hz
    RTC->WUTR = seconds * 2048;         // ST example: Wakeup Time = Time Base x WakeUpCounter

    // WUTF clear (INIT 비트는 현재 값 유지)
    RTC->ISR = ~(RTC_ISR_WUTF | RTC_ISR_INIT) | (RTC->ISR & RTC_ISR_INIT);
    PWR->CR |= PWR_CR_CWUF;             // PWR WUF clear
    EXTI->IMR  |= EXTI_IMR_MR22;        // RTC wakeup on EXTI line 22, as HAL_RTCEx_SetWakeUpTimer_IT
    EXTI->RTSR |= EXTI_RTSR_TR22;
    RTC->CR |= RTC_CR_WUTIE | RTC_CR_WUTE;
    RTC->WPR = 0xFF;

    PWR->CR |= PWR_CR_PDDS;
    SCB->SCR |= SCB_SCR_SLEEPDEEP_Msk;
    __WFI();

    // standby에서 깨면 reset과 같음 → 여기 도달 안 함
}
```

순서는 ST의 STM324xG_EVAL(F407 보드) 예제 `PWR/PWR_STANDBY/Src/main.c`의 주석 "Disable all used wakeup sources" → "Clear all related wakeup flags" → "Re-enable all used wakeup sources" → "Enter the Standby mode"를 따랐습니다. 그 예제는 `__HAL_PWR_CLEAR_FLAG(PWR_FLAG_WU)`로 PWR WUF를 지우고, HAL `HAL_RTCEx_SetWakeUpTimer_IT()`도 wakeup timer를 켜기 전에 `RTC_FLAG_WUTF`를 지웁니다.

WUTR 값은 ST의 STM324xG_EVAL `PWR/PWR_CurrentConsumption` 예제(`stm32f4xx_lp_modes.c`) 주석의 식 "Wakeup Time = Wakeup Time Base * WakeUpCounter"를 따랐습니다. 그 예제는 RTCCLK/16에서 20 s에 `0xA017`(40983)을 씁니다. `RTC_WUTR_WUT` 마스크가 `0xFFFF`이므로 `seconds × 2048 ≤ 65535`, 즉 31 s까지이고, 더 길게는 WUCKSEL = 100(HAL `RTC_WAKEUPCLOCK_CK_SPRE_16BITS`, ck_spre clock)으로 바꿉니다. 5-14의 PREDIV 설정이면 ck_spre는 1 Hz입니다. EXTI line 22 설정은 HAL `HAL_RTCEx_SetWakeUpTimer_IT()`가 하는 `__HAL_RTC_WAKEUPTIMER_EXTI_ENABLE_IT()`·`_ENABLE_RISING_EDGE()`(`RTC_EXTI_LINE_WAKEUPTIMER_EVENT` = `EXTI_IMR_MR22`)와 같습니다.

깨면 `Reset_Handler`부터 시작합니다. 시작 코드에서 SBF(Standby Flag)로 복귀인지 구분합니다.

```c
// main() 첫 부분
RCC->APB1ENR |= RCC_APB1ENR_PWREN;
int from_standby = (PWR->CSR & PWR_CSR_SBF) != 0;
if (from_standby) {
    PWR->CR |= PWR_CR_CSBF;            // SBF clear
}
```

HAL은 `PWR_FLAG_SB`를 "This flag indicates that the system was resumed from StandBy mode"라고 설명하고, ST의 STM324xG_EVAL `PWR_STANDBY` 예제도 시작할 때 `__HAL_PWR_GET_FLAG(PWR_FLAG_SB)`로 복귀를 확인한 뒤 `__HAL_PWR_CLEAR_FLAG(PWR_FLAG_SB)`로 지웁니다. 지우지 않으면 다음 시작에서도 복귀로 판정되므로 위 코드도 확인 직후 CSBF를 씁니다.

### 4. Unused peripheral power down

peripheral clock으로 줄일 수 있는 범위는 "세 가지 저전력 모드" 절의 Sleep 항목에 있습니다.

```c
// 미사용 port는 clock을 켠 상태에서 analog mode로 바꾼 뒤 clock을 끈다
RCC->AHB1ENR |= RCC_AHB1ENR_GPIODEN;
GPIOD->MODER = 0xFFFFFFFFu;            // 16핀 모두 MODER = 11 (analog)
RCC->AHB1ENR &= ~RCC_AHB1ENR_GPIODEN;

// 필요한 clock만 남긴다.
// CCMDATARAMEN과 BKPSRAMEN은 현재 값을 유지한다
// (CCM RAM·backup SRAM을 쓰는 코드가 있으면 그 clock이 켜져 있어야 한다).
RCC->AHB1ENR = (RCC->AHB1ENR & (RCC_AHB1ENR_CCMDATARAMEN | RCC_AHB1ENR_BKPSRAMEN))
             | RCC_AHB1ENR_GPIOAEN;
RCC->APB1ENR = RCC_APB1ENR_USART2EN | RCC_APB1ENR_PWREN;
RCC->APB2ENR = RCC_APB2ENR_SYSCFGEN;   // EXTI 매핑에 필요
```

위 대입은 DMA1·DMA2를 포함해 GPIOA·CCM data RAM·backup SRAM 밖의 AHB1 clock을 모두 끄므로, DMA를 쓰는 코드라면 그 enable 비트도 남길 마스크에 넣습니다.

## 확인 방법

전류계를 VDD·VDDA 공급선에 직렬로 넣어 IDD를 잽니다(DS8626 Rev 4 Figure 22 "Current consumption measurement scheme", VBAT은 별도 선). 이 글은 보드 측정을 하지 않았으므로 아래 표는 측정 결과가 아니라 비교할 datasheet 값입니다. 데이터시트 조건에 맞추려고 쓰지 않는 I/O는 analog mode로 두고, 디버거를 떼고 DBGMCU 비트를 지운 상태(아래 함정)에서 잽니다.

| 실행 상태 | 비교할 값 (TA = 25 °C) |
|-----------|------------------------|
| `stop_mode_enter()`의 WFI에서 멈춘 동안 | 0.31 mA typ (VDD = 3.3 V), 1.1 mA max (VDD = 3.6 V) (Table 23, low-power regulator·flash Stop 행) |
| `standby_with_rtc_wake()`의 WFI 뒤 Standby 동안 | 3.3 µA typ at VDD = 3.3 V (Table 24, RTC on·backup SRAM off), 25 °C max는 표에 없음 |
| RTC wake 뒤 다시 시작한 `main()` | `from_standby == 1` |

## 자주 보는 함정

> ⚠️ 미사용 GPIO를 floating

DS8626 Rev 4 5.3.6절 "I/O system current consumption"은 input으로 설정한 핀에 중간 전압이 걸리면 "This current consumption is caused by the input Schmitt trigger circuits"라고 하고, Caution에서 "Any floating input pin can also settle to an intermediate voltage level or switch inadvertently"라고 적습니다. 대책도 같은 곳에 있습니다. "they must either be configured in analog mode, or forced internally to a definite digital value", 즉 pull-up/down이나 output mode입니다.

> ⚠️ Debug 모듈을 low-power 모드에서 켜 둔 채 측정

`DBGMCU->CR`의 DBG_SLEEP·DBG_STOP·DBG_STANDBY는 해당 모드에서 debug 모듈을 켜 두는 비트입니다(HAL `HAL_DBGMCU_EnableDBGStopMode()` 등). 디버깅용으로 켰다면 전류를 재기 전과 release build에서 clear합니다.

> ⚠️ Wake-up source 누락

WFI는 interrupt로 깨어나는데, Arm DUI 0553A 2.5.2절은 "Normally, the processor wakes up only when it detects an exception with sufficient priority to cause exception entry"라고 적습니다. NVIC에서 enable하지 않은 IRQ는 exception entry가 일어나지 않으므로 EXTI line만 unmask하고 `NVIC_EnableIRQ()`를 빠뜨리면 WFI로 들어간 Stop에서 깨지 않습니다. 위 `exti0_wake_init()`처럼 EXTI(`IMR`·`RTSR`)와 NVIC를 둘 다 켭니다.

## 정리

- **Sleep은 CPU 몫만 줄입니다** — 남은 전류 중 peripheral clock gating으로 줄일 수 있는 범위는 "세 가지 저전력 모드" 절의 Sleep 항목에 있습니다.
- **Stop에서 깨면 HSI 16 MHz로 돕니다.** PLL을 다시 설정해야 168 MHz로 돌아옵니다.
- **Standby 복귀는 reset과 같습니다.** backup domain 레지스터와 선택한 backup SRAM만 남고, SBF로 복귀를 구분합니다.
- **1 s 주기·10 ms active에서는 Standby의 평균이 더 낮습니다** — 계산과 가정은 "Duty-cycling 전략" 절에 있습니다.

다음 편은 **워치독**입니다. IWDG/WWDG, multi-task refresh, debug freeze를 다룹니다.

## 관련 항목

- [4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)
- [4-06: SysTick 타이머](/blog/embedded/modern-recipes/part4-06-systick-timer)
- [4-12: 워치독 (IWDG/WWDG)](/blog/embedded/modern-recipes/part4-12-watchdog)
- [5-14: RTC 활용](/blog/embedded/modern-recipes/part5-14-rtc-utilization)
