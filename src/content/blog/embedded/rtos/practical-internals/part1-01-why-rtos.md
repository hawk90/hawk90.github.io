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

아래 주석의 시간은 이 장의 산술에 쓰는 가정값입니다. 특정 보드에서 잰 값이 아닙니다.

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

인터럽트 우선순위로 PID를 분리할 수 있습니다. 하지만 *복잡한 작업을 ISR에서 처리하면* 그 ISR이 도는 동안 같거나 낮은 우선순위의 인터럽트와 모든 thread 코드가 기다립니다. ARMv7-M에서는 실행 중인 예외를 *더 높은 우선순위* 예외만 선점할 수 있기 때문입니다(ARM DDI 0403E.b B1.5.4 "Exception priorities and preemption").

### (3) **RTOS**

아래는 주기를 **10 ms로 변경**한 FreeRTOS API 사용 조각입니다. PID 경로의 가정 실행 시간 1.8 ms, PID가 logger보다 높은 우선순위, 선점 활성, `INCLUDE_xTaskDelayUntil=1`을 전제로 합니다. 이 조각은 ISR·공유 자원 blocking을 포함하지 않으므로 마감 판정의 근거가 되지 못합니다. 그 분석은 [1-10](/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis)에서 합니다.

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
            record_period_overrun(); // 마감을 놓친 주기를 비차단으로 기록
        }
    }
}
```

센서·출력·기록 함수와 task 생성은 platform 제공 부분입니다. logger는 queue 수신 등으로 작업이 없을 때 block하게 만듭니다. logger가 인터럽트를 오래 막거나 PID와 같은 mutex·버스를 점유하면 높은 우선순위만으로 격리되지 않습니다.

`vTaskDelay(1)`은 **호출 시점부터 1 tick 상대 지연**이며 1 ms 주기가 아닙니다. [V11.2.0 `task.h`](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/task.h#L826-L835)의 주석은 "코드 경로와 다른 task·인터럽트 활동이 `vTaskDelay()`가 호출되는 시각을 바꾸므로 주기 제어에 좋은 방법이 아니다"라고 적고 `xTaskDelayUntil()`을 대안으로 듭니다. `xTaskDelayUntil()`은 깨어날 시각을 `*pxPreviousWakeTime + xTimeIncrement`라는 절대 tick으로 정합니다([`task.h` L864-L900](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/task.h#L864-L900)).

### 주기를 놓치면 어떻게 되나 — QEMU에서 실행

`xTaskDelayUntil()`이 마감을 지켜 주지 않는다는 점은 실행해 보면 바로 드러납니다. 아래 예제는 PID task(우선순위 3, 주기 10 tick)가 매 주기 2 tick 동안 CPU를 쓰다가 4번째 주기(`i==3`)에만 25 tick을 쓰게 만들고, 우선순위 1의 logger는 쉬지 않고 카운터만 올립니다. CPU 사용 시간은 tick 수가 늘 때까지 도는 busy-wait로 흉내 냈습니다.

```c title="delayuntil.c"
static volatile unsigned logger_loops;
static void burn_ticks(TickType_t n){ TickType_t s=xTaskGetTickCount(); while(xTaskGetTickCount()-s<n){} }
static void pid_task(void*a){ (void)a;
  const TickType_t period=pdMS_TO_TICKS(10);
  TickType_t last=xTaskGetTickCount();
  for(int i=0;i<8;i++){
    TickType_t start=xTaskGetTickCount();
    burn_ticks(i==3?25:2);              /* iteration 3 overruns: 25 ticks of work */
    BaseType_t r=xTaskDelayUntil(&last,period);
    pr("iter %u start=%3u end=%3u ret=%s next_wake=%3u logger_loops=%u\n",i,(unsigned)start,(unsigned)xTaskGetTickCount(),r?"pdTRUE ":"pdFALSE",(unsigned)last,logger_loops);
  }
  hosted_exit(0);
}
static void logger(void*a){ (void)a; for(;;) logger_loops++; }
int main(void){ xTaskCreate(pid_task,"pid",256,0,3,0); xTaskCreate(logger,"log",256,0,1,0); vTaskStartScheduler(); return 0; }
```

FreeRTOS-Kernel V11.2.0의 `ARM_CM3` GCC 포트와 `heap_4.c`를 함께 arm-none-eabi-gcc 16.2.0(`-mcpu=cortex-m3 -mthumb -O2 -ffreestanding -nostdlib`)으로 빌드했습니다. `configTICK_RATE_HZ`는 1000입니다. QEMU 11.1.3 `mps2-an385`(Cortex-M3)에서 `-icount shift=5`로 돌렸습니다. icount는 명령 하나를 2⁵ ns로 세는 가상 시계라서, 실행할 때마다 같은 tick 값이 나오지만 실제 보드의 시간은 아닙니다. `pr()`과 `hosted_exit()`는 UART0 출력과 semihosting 종료를 하는 작은 보조 함수입니다.

```bash
qemu-system-arm -M mps2-an385 -nographic -semihosting -icount shift=5 -kernel delayuntil.elf
```

```text
iter 0 start=  0 end= 10 ret=pdTRUE  next_wake= 10 logger_loops=62368
iter 1 start= 10 end= 20 ret=pdTRUE  next_wake= 20 logger_loops=124737
iter 2 start= 20 end= 30 ret=pdTRUE  next_wake= 30 logger_loops=187107
iter 3 start= 30 end= 55 ret=pdFALSE next_wake= 40 logger_loops=187107
iter 4 start= 55 end= 57 ret=pdFALSE next_wake= 50 logger_loops=187107
iter 5 start= 57 end= 60 ret=pdTRUE  next_wake= 60 logger_loops=194855
iter 6 start= 60 end= 70 ret=pdTRUE  next_wake= 70 logger_loops=257225
iter 7 start= 70 end= 80 ret=pdTRUE  next_wake= 80 logger_loops=319595
```

세 가지를 읽을 수 있습니다.

- **주기는 지켜집니다.** 0~2번 주기는 2 tick만 일하고 10, 20, 30 tick에 정확히 다시 release되었습니다. 그 사이 logger가 남은 CPU를 썼습니다(`logger_loops` 증가).
- **늦으면 `pdFALSE`가 돌아오고 지연 없이 반환합니다.** 3번 주기는 55 tick에 끝나 깨어날 시각 40을 이미 지났습니다. 이때 반환값은 `pdFALSE`이고 task는 block되지 않았습니다. `task.h` 주석의 "다음 예정 시각이 과거이면 지연하지 않는다"와 같습니다.
- **밀린 주기를 따라잡느라 연달아 실행합니다.** `next_wake`는 55가 아니라 40, 50으로 주기만큼만 전진합니다. [`tasks.c` L2386](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L2386)이 깨어날 시각을 `*pxPreviousWakeTime + xTimeIncrement`로 계산하고 [L2420](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L2420)에서 이 값을 그대로 저장하기 때문입니다. 그래서 4번 주기는 곧바로 돌았고 다시 `pdFALSE`를 받았습니다. 그동안(30~57 tick) logger는 한 번도 돌지 못했습니다.

밀린 주기를 건너뛸지, 몰아서 실행할지는 커널이 정해 주지 않습니다. `pdFALSE`를 보고 `last = xTaskGetTickCount()`로 기준을 다시 잡는 것은 응용 코드가 할 일입니다. `logger_loops`의 절댓값은 icount 설정에 따라 바뀌므로 증가했는지 멈췄는지만 의미가 있습니다.

### 숫자로 먼저 거절할 요구

다음 Node 예제는 위 시간 가정의 산술만 검사합니다. RTOS 시뮬레이터나 보드 측정이 아닙니다. Node로 실행하면 `PASS: 1ms rejected, 10ms passes the single-task budget only`를 출력합니다.

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

우선순위 숫자의 방향은 커널마다 반대입니다. FreeRTOS에서는 `0..configMAX_PRIORITIES-1`이며 큰 숫자가 높은 우선순위입니다. idle task가 `tskIDLE_PRIORITY`(0, [`task.h` L199](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/task.h#L199))이고, 범위를 넘는 값은 `configASSERT`가 정의돼 있으면 L1914에서 멈추고, 없을 때만 `configMAX_PRIORITIES - 1`로 잘립니다([`tasks.c` L1914-L1918](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c#L1914-L1918)). Zephyr는 반대로 숫자가 *작을수록* 높고, 음수 우선순위는 선점되지 않는 cooperative thread입니다([Zephyr v3.7.0 threads 문서](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/doc/kernel/services/threads/index.rst) "Thread Priorities"). Cortex-M의 예외 우선순위도 숫자가 작을수록 높습니다(DDI 0403E.b B1.5.4). FreeRTOS on Cortex-M에서는 task와 인터럽트의 숫자 방향이 서로 반대인 셈입니다.

### 3. 동기화 프리미티브

- **Mutex** — 공유 자원 보호에 사용합니다.
- **Semaphore** — task 간 신호를 전달합니다.
- **Queue** — 메시지를 전달합니다.
- **Event group** — 다중 조건을 대기합니다.

API별 ISR 허용 여부, 대기 가능 문맥, 데이터 소유권·수명과 queue 포화 처리를 지켜야 안전한 통신이 됩니다. 예를 들어 FreeRTOS의 mutex는 ISR에서 쓸 수 없습니다. `semphr.h`가 mutex 생성 함수마다 "Mutex type semaphores cannot be used from within interrupt service routines."라고 적습니다([V11.2.0 `semphr.h` L703](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h#L703)).

## 실시간성 — Hard vs Soft

| | Soft Real-Time | Hard Real-Time |
| --- | --- | --- |
| **Deadline miss 결과** | 품질 저하 | 시스템 실패 |
| **예** | 비디오 frame drop, 게임 FPS | 자동차 ESC, 인공 호흡기, ABS |
| **판정** | 허용 miss 비율·품질 조건을 제품 요구사항으로 정함 | 정의한 운용 가정 안에서 모든 마감을 만족해야 함 |

RTOS는 우선순위와 bounded 동작을 설계하는 수단입니다. hard real-time 보장은 WCET·주기·deadline·blocking·ISR·하드웨어 가정과 스케줄 가능성 분석을 포함한 시스템 수준의 근거가 필요합니다. bare-metal에서도 bounded schedule을 설계할 수 있습니다.

## RTOS는 *Linux와 다르다*

규모부터 다릅니다. 위 `delayuntil.c` 예제는 FreeRTOS 커널(`tasks.c`·`queue.c`·`list.c`·`timers.c`·`event_groups.c`·`port.c`·`heap_4.c`)을 모두 링크하고도 `arm-none-eabi-size`로 text 18,312바이트였습니다. bss 65,964바이트의 대부분은 `configTOTAL_HEAP_SIZE`로 잡은 64 KiB heap입니다.

| 비교 항목 | FreeRTOS (이 시리즈 기준) | Linux |
| --- | --- | --- |
| 메모리 보호 | 기본은 모든 task가 한 주소 공간. MPU 포트(`portable/GCC/ARM_CM3_MPU` 등)는 선택 | MMU 기반 프로세스 격리 |
| 선점 범위 | task 코드는 선점, critical section·ISR 동안은 막힘 | `CONFIG_PREEMPT_RT`가 spinlock 등을 선점 가능한 PI 대응 primitive로 바꾸고 인터럽트를 thread로 돌림 |
| RT 지원 범위 | 포트가 있는 아키텍처 | v6.12에서 `ARCH_SUPPORTS_RT`를 x86·arm64·riscv가 선택. v6.12 `arch/arm/Kconfig`에는 없음 |

PREEMPT_RT 행은 v6.12 `kernel/Kconfig.preempt`의 `config PREEMPT_RT`(`depends on EXPERT && ARCH_SUPPORTS_RT`)와 도움말, 그리고 `arch/x86/Kconfig` L128·`arch/arm64/Kconfig` L105·`arch/riscv/Kconfig` L68의 `select ARCH_SUPPORTS_RT`를 근거로 합니다. 같은 파일들의 v6.11 판에는 이 `select`가 없습니다. "RTOS <10µs, Linux <1ms" 같은 지연 숫자는 플랫폼과 측정 방법이 정해져야 의미가 있으므로 이 장에서는 비교하지 않습니다. 이 시리즈의 [5-07](/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux)에서 PREEMPT_RT를 따로 다룹니다.

## 언제 RTOS를 *안 써야* 하나

- **단일 task만 있는 단순 시스템**입니다 (LED 깜빡임, 단순 센서 read 등).
- 기존 구조의 최악 응답시간이 요구 deadline을 만족하고 변경 비용이 낮습니다.
- 별도 task stack·TCB·IPC 메모리를 넣을 여유가 없고 단순 event loop로 요구를 만족합니다.
- **인증·검증 비용이 RTOS 도입 가치를 넘는 경우**입니다.

이런 경우엔 *bare-metal + interrupt-driven*이 더 깔끔합니다.

## RTOS 계열 예시

| RTOS | 관리 주체 | 라이선스 | 근거 |
| --- | --- | --- | --- |
| **FreeRTOS** | AWS | MIT | [V11.2.0 `LICENSE.md`](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/LICENSE.md), freertos.org "Maintained by AWS" |
| **Zephyr** | Linux Foundation 호스팅 프로젝트 | Apache 2.0 | [v3.7.0 `LICENSE`](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/LICENSE), zephyrproject.org |
| **RT-Thread** | RT-Thread 프로젝트 | Apache 2.0 | [v5.1.0 `LICENSE`](https://github.com/RT-Thread/rt-thread/blob/v5.1.0/LICENSE) |
| **Eclipse ThreadX** | Eclipse Foundation (구 Azure RTOS) | MIT | [`LICENSE.txt`](https://github.com/eclipse-threadx/threadx/blob/master/LICENSE.txt) |
| **Apache NuttX** | Apache Software Foundation | Apache 2.0 | [nuttx-12.8.0 `LICENSE`](https://github.com/apache/nuttx/blob/nuttx-12.8.0/LICENSE). nuttx.apache.org가 POSIX·ANSI 표준을 따른다고 소개하고 사용처로 PX4 등을 듦 |
| **VxWorks** | Wind River | 상용 | windriver.com 제품 페이지 |
| **QNX** | BlackBerry QNX | 상용 | blackberry.qnx.com: "microkernel RTOS" |

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
