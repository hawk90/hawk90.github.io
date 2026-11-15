---
title: "RTOS가 필요한 이유 — 일반 OS와의 결정적 차이"
slug: "embedded/rtos/practical-internals/part1-01-why-rtos"
date: 2026-05-04T09:01:00
description: "Super-loop와 RTOS의 지연 원인을 비교하고, 실행시간·주기·우선순위·blocking을 함께 검토해 deadline 가능성을 판단합니다."
series: "Practical RTOS Internals"
seriesOrder: 1
tags: [rtos, super-loop, realtime, preemption]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **deadline은 RTOS 도입만으로 보장되지 않습니다.** 실행시간·주기·blocking을 분석해 super-loop, 비동기 처리, RTOS 중 적합한 구조를 선택합니다.

## 시작 — 가장 단순한 임베디드 프로그램

```c
int main(void) {
    init_hw();
    while (1) {
        read_sensors();      // 1 ms
        compute_pid();       // 0.5 ms
        update_actuators();  // 0.3 ms
        log_uart();          // 5 ms  ← 느림
    }
}
```

이 "**Super-Loop**" 패턴은 다음과 같은 장점이 있습니다.
- *구조가 단순합니다*.
- *디버그가 쉽습니다* (실행 순서가 코드 그대로입니다).
- 태스크별 stack·TCB·스케줄러 관리 비용이 없습니다. 루프·호출·인터럽트 비용까지 0이라는 뜻은 아닙니다.

작은 MCU 프로젝트라면 이걸로 충분합니다.

## 한계 — 가장 느린 작업이 *전체*를 결정합니다

위 예에서 한 사이클은 1 + 0.5 + 0.3 + 5 = **6.8 ms**입니다.

만약 **PID 제어가 1 kHz** (1 ms마다) 필요하다면 어떨까요? 슈퍼루프에서 PID는 *6.8 ms마다* 실행됩니다. 제시한 실행 시간과 구조로는 이 1 ms 요구를 만족할 수 없습니다.

해결책 후보:

### (1) UART 로깅을 비동기로

```c
while (1) {
    read_sensors();
    compute_pid();
    update_actuators();
    if (uart_can_send()) log_uart_nonblocking();
}
```

로깅의 blocking을 줄일 수 있습니다. 그러나 남은 작업도 1 + 0.5 + 0.3 = 1.8 ms이므로 1 ms 요구는 여전히 불가능합니다. 필요한 경로의 실행 시간 자체를 줄이거나 요구 주기를 바꿔야 합니다. 모든 작업을 비동기로 바꿔야 하는 것은 아닙니다.

### (2) 인터럽트로 빠른 작업 분리

```c
void TIM1_IRQHandler(void) {
    read_sensors();
    compute_pid();
    update_actuators();
}
```

인터럽트 우선순위로 PID를 분리할 수 있습니다. 하지만 *복잡한 작업을 ISR에서 처리하면* ISR이 길어져 다른 인터럽트가 막힙니다.

### (3) **RTOS**

아래는 주기를 **10 ms로 변경**한 FreeRTOS API 사용 조각입니다. PID 경로의 예시 실행 시간 1.8 ms, PID가 logger보다 높은 우선순위, 선점 활성, `INCLUDE_xTaskDelayUntil=1`을 전제로 합니다. 실제 보드 WCET·ISR·공유 자원 blocking은 별도로 확인해야 합니다.

```c title="pid-task.c"
#include "FreeRTOS.h"
#include "task.h"
void read_sensors(void);
void compute_pid(void);
void update_actuators(void);
void record_period_overrun(void);

void pid_task(void *arg) {
    (void)arg;
    const TickType_t period = pdMS_TO_TICKS(10);
    configASSERT(period > 0);
    TickType_t last = xTaskGetTickCount();
    for (;;) {
        read_sensors();       // 예시 CPU시간 1ms
        compute_pid();        // 0.5ms
        update_actuators();   // 0.3ms
        if (xTaskDelayUntil(&last, period) == pdFALSE) {
            record_period_overrun(); // 비차단 기록; catch-up/중단 정책은 제품에서 결정
        }
    }
}
```

센서·출력·기록 함수와 task 생성은 platform 제공 부분입니다. logger는 queue 수신 등으로 작업이 없을 때 block하게 만듭니다. logger가 인터럽트를 오래 막거나 PID와 같은 mutex·버스를 점유하면 높은 우선순위만으로 격리되지 않습니다.

`vTaskDelay(1)`은 **1 tick 상대 지연**이며 정확한 1 ms 주기가 아닙니다. 실행 시간에 지연이 더해지고 tick 위상과 ready 이후 지연도 영향을 줍니다. `xTaskDelayUntil`은 기준 tick에 대한 주기 release를 도와주지만, 마감 만족이나 정확한 실행 시각을 보장하지 않습니다. [FreeRTOS V11.2.0 task.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/task.h)의 두 API 계약을 확인합니다.

### 숫자로 먼저 거절할 요구

다음 Node 예제는 위 시간 가정의 산술만 검사합니다. RTOS 시뮬레이터나 보드 측정이 아닙니다.

```js title="period-budget.mjs"
import assert from 'node:assert/strict';
const cpuUs = 1000 + 500 + 300;
assert.equal(cpuUs, 1800);
const feasibleAlone = (periodUs) => cpuUs <= periodUs;
assert.equal(feasibleAlone(1000), false); // RTOS 도입으로 해결되지 않음
assert.equal(feasibleAlone(10000), true); // 단독 실행 필요조건만 확인
assert.equal(cpuUs / 1000, 1.8);          // 180%: 단일 CPU에서 불가능
assert.equal(cpuUs / 10000, 0.18);        // ISR·blocking·다른 task는 미포함
console.log('PASS: 1ms rejected, 10ms passes the single-task budget only');
```

## RTOS의 3가지 핵심 가치

### 1. Preemption — 강제 전환

저우선 task가 실행 중이라도 *고우선 task가 ready 되고 선점 가능한 지점에 도달하면 전환*됩니다. 슈퍼루프의 *모든 일이 끝나기 전엔 다음 일을 못 하는* 문제를 해결합니다.

### 2. 우선순위 (Priority)

우선순위 범위·숫자 방향은 RTOS 설정에 따라 다릅니다. FreeRTOS에서는 `0..configMAX_PRIORITIES-1`이며 큰 숫자가 높은 우선순위입니다. 단일 코어 선점 구성에서는 실행 가능한 최고 우선순위 task를 선택하되 ISR·critical section·scheduler lock의 지연을 고려합니다.

### 3. 동기화 프리미티브

- **Mutex** — 공유 자원 보호에 사용합니다.
- **Semaphore** — task 간 신호를 전달합니다.
- **Queue** — 메시지를 전달합니다.
- **Event group** — 다중 조건을 대기합니다.

API별 ISR 허용 여부, 대기 가능 문맥, 데이터 소유권·수명과 queue 포화 처리를 지켜야 안전한 통신이 됩니다. 예를 들어 일반 mutex를 ISR에서 기다리면 안 됩니다.

## 실시간성 — Hard vs Soft

| | Soft Real-Time | Hard Real-Time |
| --- | --- | --- |
| **Deadline miss 결과** | 품질 저하 | 시스템 실패 |
| **예** | 비디오 frame drop, 게임 FPS | 자동차 ESC, 인공 호흡기, ABS |
| **판정** | 허용 가능한 miss 비율·품질 조건을 제품별 정의 | 정의한 운용 가정 안에서 모든 마감을 만족해야 함 |
| **OS 요구** | 허용 miss·응답 분포를 만족하는 구성 | 커널 이름보다 시스템의 최악 경로 근거가 필요 |

RTOS는 우선순위와 bounded 동작을 설계하는 수단입니다. hard real-time 보장은 WCET·주기·deadline·blocking·ISR·하드웨어 가정과 스케줄 가능성 분석을 포함한 시스템 수준의 근거가 필요합니다. bare-metal에서도 bounded schedule을 설계할 수 있습니다.

## RTOS는 *Linux와 다르다*

| 비교 항목 | 확인할 조건 |
| --- | --- |
| 메모리·부팅 | 정확한 보드, 커널 옵션·드라이버·파일시스템·이미지와 서비스 수 |
| 응답 지연 | priority, preemption 설정, ISR·lock·I/O·firmware 지연과 tail 분포 |
| 격리 | MPU/MMU와 RTOS의 보호 도메인 설정. Linux에도 MMU 없는 구성이 있음 |
| PREEMPT_RT | 더 많은 경로를 선점 가능하게 하지만 모든 지연의 상한을 자동 보증하지 않음 |

플랫폼과 측정 방법 없이 “RTOS <10µs, Linux <1ms” 같은 보편적 수치로 비교하지 않습니다. [Linux PREEMPT_RT 문서](https://www.kernel.org/doc/html/latest/core-api/real-time/index.html)는 스케줄링뿐 아니라 하드웨어·메모리·firmware 조건도 다룹니다.

## 언제 RTOS를 *안 써야* 하나

- **단일 task만 있는 단순 시스템**입니다 (LED 깜빡임, 단순 센서 read 등).
- 기존 구조의 최악 응답시간이 요구 deadline을 만족하고 변경 비용이 낮습니다.
- 별도 task stack·TCB·IPC 메모리를 넣을 여유가 없고 단순 event loop로 요구를 만족합니다.
- **인증·검증 비용이 RTOS 도입 가치를 넘는 경우**입니다.

이런 경우엔 *bare-metal + interrupt-driven*이 더 깔끔합니다.

## RTOS 계열 예시

| RTOS | 특징 | 라이선스 | 대표 사용 |
| --- | --- | --- | --- |
| **FreeRTOS** | 경량 커널, 포트별 구성 | MIT | AWS IoT, Arduino |
| **Zephyr** | Linux Foundation, 풍부한 driver | Apache 2.0 | Nordic, Intel, NXP |
| **RT-Thread** | 경량, 중국 생태계 | Apache 2.0 | 산업용 IoT |
| **Eclipse ThreadX** | 인증은 별도 패키지·버전·도구 범위 확인 | [MIT](https://github.com/eclipse-threadx/threadx/blob/master/LICENSE.txt) | 구 Azure RTOS |
| **Apache NuttX** | POSIX-compliant, mission-critical | Apache 2.0 | PX4 드론, NASA Ingenuity |
| **VxWorks** | 항공·우주 hard real-time | 상용 ($) | 우주 탐사선, 군 |
| **QNX** | 마이크로커널, 자동차 | 상용 ($) | BMW, Bosch |

## 이 시리즈에서

10 챕터에 걸쳐 *RTOS의 기초*를 다룹니다.
- Task·스케줄링·preemption (1-04)
- ISR·동기화 (5-6)
- Semaphore·Mutex·Queue (7-9)
- 실시간성 분석 (10)

Part 2부터는 *내부 구현*을 다룹니다. 스케줄러 자료구조, context switch, IPC 내부를 살펴봅니다.

## 정리

- **Super-Loop**은 단순하지만 *모든 작업이 직렬화*됩니다. 빠른 작업이 느린 작업 뒤에 줄을 섭니다.
- RTOS는 **Preemption + 우선순위 + 동기화 프리미티브**의 조합입니다.
- hard real-time은 커널 이름이 아니라 정의한 가정과 최악 경로 분석으로 평가합니다.
- 독립 실행 흐름·blocking 분리·소유권·메모리 비용을 보고 도입을 결정합니다. task 개수나 10 ms 같은 임의 문턱으로 정하지 않습니다.

다음 편에서는 **Task와 Thread 개념**을 다룹니다. TCB, 상태 머신, 생명 주기를 살펴봅니다.

## 관련 항목

- [1-02: Task와 Thread 개념](/blog/embedded/rtos/practical-internals/part1-02-task-thread)
- [1-10: 실시간성 분석](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)
