---
title: "임베디드 전력 최적화 — Sleep Mode·Clock Gating·DVFS"
slug: "embedded/modern-recipes/part8-11-power-optimization"
date: 2026-04-17T09:10:00
description: "Active와 sleep, peripheral clock gating, DVFS, tickless idle, µA-level 측정까지 임베디드 전력 절감 기법을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 99
tags: [recipes, performance, power]
topics: ["embedded"]
---

## 한 줄 요약

> 평균 전류와 에너지는 상태별 소비량, 체류 시간, 전환 비용으로 계산합니다. 낮은 정격 sleep 전류만으로 제품 배터리 수명을 예측할 수는 없습니다.

## 어떤 상황에서 쓰나

배터리 IoT device, BLE beacon, sensor logger처럼 장시간 동작해야 하는 펌웨어가 전형적입니다. 목표 평균 전류는 배터리의 유효 용량·방전 특성·온도와 목표 수명으로 계산합니다. Active 전류만으로 평균 전류를 판단하지 말고 sleep 체류 시간과 wake·radio·sensor 동작을 포함합니다.

자동차·산업 장비의 ECO 모드에서도 deadline, wake latency, 유지해야 할 memory·peripheral과 전원 안전 상태를 함께 정해야 합니다.

## 핵심 개념

측정 지점에서 상태별 평균 전류는 다음처럼 계산합니다.

```text
I_avg = Σ(I_state × t_state) / T
```

평균 전력은 `P_avg = Σ(V_state × I_state × t_state) / T`입니다. 배터리 측정에서는 regulator 효율·전원 레일·전환 에너지도 경계에 포함합니다. 예를 들어 1초 중 2 ms를 5 mA, 나머지를 5 µA로 쓴다면 전환 비용을 무시한 평균은 약 15 µA입니다. 이는 가상 duty cycle의 산술 예시이지 측정값이 아닙니다.

저전력 상태를 나눠 보는 일반적인 축입니다. 명칭과 실제 동작은 MCU별로 다릅니다.

| 동작 상태 | 일반적인 동작 | 확인할 점 |
|---|---|---|
| run | CPU와 선택한 clock/peripheral 동작 | 전압·주파수·주변 회로 부하 |
| shallow sleep | CPU 정지, 선택 clock·memory 유지 가능 | interrupt 빈도, debug 설정, 유지 clock |
| deep/stop 계열 | clock 일부 정지, 구현에 따라 memory/peripheral 유지 | wake source, 보존 영역, 재시작 지연 |
| standby/shutdown 계열 | 더 많은 전원 영역 정지 | reset 동작, retention 영역, wake 원인 |

이름·전류·보존 범위·wake 지연은 MCU마다 다릅니다. 대상 part의 datasheet/reference manual과 보드 회로를 기준으로 정합니다.

Mode 전환 외에 자주 쓰는 절감 기법은 세 가지입니다.

- **peripheral clock gating** — 사용하지 않는 peripheral clock을 끌 후보입니다. 절감량과 재기동 비용을 part에서 확인합니다.
- **DVFS** — dynamic voltage/frequency를 바꾸며 workload 완료시간과 전체 energy를 비교합니다.
- **tickless idle** — 지원되는 RTOS port에서 periodic tick이 불필요한 wake를 만드는지 확인합니다.

## 코드 / 실제 사용 예

### WFI 한 줄로 시작

```c
int main(void) {
    hw_init();
    while (1) {
        process_events();
        /* 간단한 형태만 보인 예. 실제 event flag 검사와 WFI 사이의 race를 막아야 함 */
        __WFI();
    }
}
```

`WFI`는 CPU를 대기 상태로 전환하라는 명령이지, 특정 저전력 전류나 mode를 보장하지 않습니다. interrupt가 이미 pending이면 곧바로 깨어날 수 있고, 실제 상태는 MCU의 sleep/deep-sleep bit, clock tree, debug·peripheral 설정에 달립니다. RTOS에서는 port와 idle 정책을 확인합니다.

### MCU별 stop mode 진입 순서

1. 진행 중인 DMA/peripheral transaction을 완료하거나 안전하게 중단합니다.
2. sleep 중 필요한 wake source와 retention 영역을 설정합니다.
3. 기존 wake flag를 정리하고 power/clock mode를 설정합니다.
4. reference manual의 순서와 barrier 조건에 따라 WFI/WFE를 실행합니다.
5. wake 후 reset 여부와 clock tree를 확인하고 peripheral을 복원합니다.

STM32도 세대별로 STOP mode의 수, 보존 SRAM·peripheral, wake 후 system clock, register와 flag clearing 순서가 다릅니다. mode 번호나 전류를 제품 전체에 일반화하지 않고 해당 부품의 [reference manual](https://www.st.com/en/microcontrollers-microprocessors/stm32u5-series/documentation.html)·datasheet에서 검증합니다. [STM32U5 저전력 application note](https://www.st.com/resource/en/application_note/an5652-how-to-optimize-power-consumption-on-stm32u5-mcus-stmicroelectronics.pdf)는 특정 시리즈의 동작 예입니다.

### Standby 계열 mode

standby/shutdown 진입은 해당 MCU의 documented procedure를 따릅니다. wake source를 설정하고 필요한 retention 상태를 저장한 뒤, wake flag를 정확한 write semantics로 정리하고 deep-sleep 진입을 요청합니다. 순서는 MCU별로 다르므로 generic register snippet으로 대체하지 않습니다. 이 mode는 wake 시 reset 경로를 거치는 경우가 많으며 retention 가능한 backup 영역도 part별로 다릅니다. wake 원인과 reset flag를 읽고, 전류·복귀시간은 datasheet 조건으로 확인합니다.

### Peripheral clock gating

```c
/* 설명용 platform API: 실제 이름과 순서는 MCU/driver 구현에 따름 */
board_uart_quiesce(UART_CONSOLE);
board_clock_disable(CLOCK_UART_CONSOLE);

/* 재사용 시 clock 안정화·reset·pin mux·baud 설정을 복원 */
board_clock_enable(CLOCK_UART_CONSOLE);
board_uart_resume(UART_CONSOLE, configured_baud);
```

이 API는 MCU에 그대로 복사할 수 없습니다. peripheral idle 상태와 pending flag, DMA/interrupt 의존성, clock enable 이후 안정화 시간을 driver에서 처리합니다. clock gating은 MCU 내부 전력만 바꿀 수 있고 외부 transceiver/sensor 전원 차단을 대신하지 않습니다.

### Tickless idle (FreeRTOS)

```c
/* FreeRTOSConfig.h: 선택한 port가 tickless idle을 지원하는지 확인 */
#define configUSE_TICKLESS_IDLE 1
#define configPRE_SLEEP_PROCESSING(x) board_pre_sleep(&(x))
#define configPOST_SLEEP_PROCESSING(x) board_post_sleep(x)

void board_pre_sleep(TickType_t *modifiable_idle_ticks) {
    board_prepare_sleep_peripherals();
    /* *modifiable_idle_ticks = 0 only if this hook itself performs WFI/WFE. */
}

void board_post_sleep(TickType_t expected_idle_ticks) {
    (void)expected_idle_ticks; /* expected ticks are not the measured sleep duration */
    board_restore_sleep_peripherals();
}
```

FreeRTOS tickless idle은 port가 예상 idle tick 수에 맞춰 tick interrupt를 억제하고, wake 뒤 tick을 보정하는 경로입니다. 위 hook은 peripheral 준비와 복원을 위한 예시이며 함수명과 macro 계약은 사용 port에서 확인해야 합니다. FreeRTOS ARM_CM4F port는 pre-sleep hook에 mutable tick-count copy를 전달하고, 값이 0이면 자체 WFI를 건너뜁니다. post-sleep hook의 인자는 예상 idle tick 수이지 실제 sleep 시간 측정값이 아닙니다. system/tick clock을 바꾸면 port의 tick 계산·복귀 절차도 그 clock 변화와 일치해야 합니다. port가 이미 wake timer·tick 보정·WFI를 처리한다면 같은 일을 hook에서 중복하지 않습니다. 임의 `vTaskStepTick()` 호출은 정상 port 경로를 깨뜨릴 수 있습니다. [FreeRTOS low-power support](https://www.freertos.org/Documentation/02-Kernel/02-Kernel-features/07-Lower-power-support)와 [V11.2.0 ARM_CM4F port](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c)를 확인합니다.

### DVFS

```c
/* 순서와 API는 MCU의 voltage/frequency operating point에 맞게 구현 */
void set_operating_point(enum operating_point target) {
    if (target == LOW_POWER) {
        set_clock_lower_first();
        wait_for_clock_switch();
        set_voltage_range_for_low_clock();
        wait_for_voltage_ready();
    } else {
        set_voltage_range_for_high_clock();
        wait_for_voltage_ready();
        set_flash_latency_for_target_clock();
        set_clock_higher();
        wait_for_clock_switch();
    }
}
```

`P ≈ αCV²f`는 switching power의 단순 근사입니다. leakage, regulator 효율, memory wait state, 주변 회로와 실행시간이 전체 에너지에 영향을 줍니다. 낮은 주파수로 실행시간이 늘어 누설 에너지가 커질 수도 있습니다. 전압 범위, flash latency와 전환 순서는 target reference manual에서 확인합니다.

### µA-level 측정

| 도구 | 특징 |
|------|------|
| DMM/ammeter | range·burden voltage·sampling 속도가 짧은 burst 포착에 영향 |
| shunt + oscilloscope | shunt 값과 bandwidth를 정하고 순간 전류를 시간축으로 확인 |
| power analyzer | range·noise floor·sample rate·입력 전압 범위를 측정 조건에 맞춤 |

계측 장비는 정확도·burden voltage·range 전환·bandwidth·trigger 동기화를 확인해 고릅니다. 장비 이름만으로 µA 정확도나 burst 포착을 보장할 수 없습니다. 측정 지점과 외부 부하(LED, regulator, sensor, radio)를 기록합니다.

### Pin float 방지

```c
/* board schematic과 MCU pin leakage 조건에 맞춰 개별 설정 */
configure_pin_from_board_policy(pin, PIN_ANALOG_OR_SAFE_BIAS);
```

floating input, 외부 회로가 구동하는 pin, analog 입력을 한 설정으로 처리하지 않습니다. MCU의 low-power pin guidance와 보드 회로를 보고 pull, analog, output 또는 retention 설정을 선택합니다. 모든 미사용 pin을 무조건 pull-down하거나 output-low로 만들면 외부 회로와 충돌할 수 있습니다.

## 측정 / 성능 비교

측정 계획을 세울 때 아래와 같이 단계별 차이를 기록합니다. 예시 글은 board, 부품, 계측 원자료가 없어 실측 수치를 제시하지 않습니다.

| 시나리오 | 평균 전류 | 배터리(CR2032) 수명 |
|----------|-----------|-----------------------|
| WFI 없이 run loop | 측정 필요 | 배터리 조건으로 계산 |
| WFI in idle | 측정 필요 | 배터리 조건으로 계산 |
| + peripheral clock gating | 측정 필요 | 배터리 조건으로 계산 |
| + stop mode (1초마다 wake) | 측정 필요 | 배터리 조건으로 계산 |
| + tickless idle + RTC wake-up | 측정 필요 | 배터리 조건으로 계산 |

각 단계의 효과와 배터리 수명은 wake 패턴·부하·측정 조건에 따라 달라지므로 단계별로 검증합니다.

DVFS 비교에서는 operating point별 voltage/frequency, workload 완료시간, 전환비용과 전체 energy를 함께 기록합니다. clock과 voltage를 낮추는 것만으로 총 energy 감소가 보장되지는 않습니다.

## 자주 보는 함정

> Busy loop를 low-power idle이라고 가정

```c
while (1) { do_things(); }    /* WFI 없음 */
```

busy loop는 CPU가 계속 일을 하므로 sleep 상태와 구분합니다. FreeRTOS에서는 tickless port 또는 해당 port가 문서화한 idle 진입을 사용하고, idle hook 안의 WFI를 임의로 추가해 race를 만들지 않습니다.

> Peripheral clock을 모두 켜둠

```c
/* 임의의 all-ones write: reserved bit/다른 peripheral 상태를 망가뜨릴 수 있음 */
PERIPH_CLOCK_REGISTER = 0xFFFFFFFF;
```

register 전체를 상수로 덮어쓰지 않습니다. driver와 MCU reference manual에 맞는 clock API/bit mask를 사용하고, 필요한 기능의 전원·clock 상태를 검증합니다.

> Wake-up source 너무 많음

```c
/* 모든 wake line을 무조건 활성화하는 설정은 피함 */
configure_wakeup_lines(ALL_LINES);
```

불필요한 wake source는 sleep을 짧게 하고 반복 진입 비용을 늘릴 수 있습니다. part가 지원하는 필요한 source만 설정하고 pending flag와 debounce 조건을 확인합니다.

> Stop mode 후 clock 미복원

```c
enter_platform_stop_mode();
/* wake 이후 clock/peripheral 상태를 확인한 뒤 driver 사용 */
uart_send_byte(UART_CONSOLE, 'X');
```

일부 MCU는 stop wake 후 system clock을 기본 source로 전환합니다. 동작은 part마다 다르므로 wake 이후 clock source·frequency·peripheral 상태를 확인하고 필요한 driver 복원을 합니다.

> µA를 multimeter로 측정

계측기 한 종류를 무조건 배제하지 않습니다. 요구하는 전류 범위와 시간해상도, burden voltage, noise floor에 맞는 장비인지 사양과 검교정 상태를 확인합니다.

## 정리

- 평균 전류는 상태별 전류와 체류 시간으로, 평균 전력은 상태별 voltage/current/시간으로 계산합니다.
- WFI는 sleep mode 설정·wake source와 함께 검증합니다.
- Stop/standby 특성은 정확한 MCU part의 datasheet/reference manual에서 확인합니다.
- peripheral clock gating은 driver·DMA·interrupt 의존성과 복귀 순서를 함께 처리합니다.
- Tickless idle은 port 구현과 sleep hook 계약을 확인한 뒤 적용합니다.
- DVFS로 active 전력 자체를 줄일 수 있습니다.
- 계측기는 정확도·burden voltage·bandwidth·sample rate를 요구 조건에 맞춥니다.
- pin 상태는 회로도와 MCU의 저전력 pin guidance를 기준으로 정합니다.

다음 편은 **WCET 분석**입니다. Worst-case execution time과 cache 영향을 다룹니다.

## 관련 항목

- [PRTOS 2-09: Tickless](/blog/embedded/rtos/practical-internals/part2-09-tickless)
- [6-03: Scheduler 동작 이해](/blog/embedded/modern-recipes/part6-03-scheduler-internals)
- [8-10: 코드 크기 최적화](/blog/embedded/modern-recipes/part8-10-code-size-optimization)
- [8-12: WCET 분석](/blog/embedded/modern-recipes/part8-12-wcet-analysis)
- [PE 3-09: Power vs Performance](/blog/embedded/performance-engineering/part3-09-power-vs-performance)
