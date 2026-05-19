---
title: "Ch 13: SMP Support"
date: 2026-05-09T13:00:00
description: "configNUMBER_OF_CORES·core affinity — FreeRTOS의 멀티코어 스케줄링."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 13
tags: [freertos, smp, multicore, affinity]
draft: false
---

## 한 줄 요약

> **"FreeRTOS v11(2023)부터 *Symmetric Multi-Processing(SMP) 스케줄러*가 mainline에 통합됐습니다. `configNUMBER_OF_CORES ≥ 2`만 켜면 *두 코어 이상에서 단일 스케줄러*가 동시에 동작하고, `vTaskCoreAffinitySet`으로 *특정 코어에 태스크를 고정*할 수 있습니다. RP2040(듀얼 Cortex-M0+)과 ESP32-S3(듀얼 Xtensa LX7)가 대표 타깃이며, Espressif가 오래 유지하던 *fork SMP는 v11 합류로 deprecated*되는 추세입니다."**

오랫동안 FreeRTOS는 *단일 코어 스케줄러*였습니다. 듀얼 코어 칩은 *Espressif fork* 또는 *Raspberry Pi Pico SDK*가 별도 패치로 SMP를 구현해 왔습니다. v11에서 *mainline SMP*가 들어오면서 이 분기들은 하나로 수렴 중입니다. 이번 장에서는 SMP의 설정, core affinity, *core-aware critical section*, 그리고 두 대표 SoC의 동작을 다룹니다.

## SMP vs AMP

| 항목 | SMP (Symmetric) | AMP (Asymmetric) |
|------|-----------------|------------------|
| 스케줄러 | 단일, 모든 코어 관리 | 코어마다 독립 |
| 메모리 | 공유 | 분리 (또는 부분 공유) |
| 태스크 이동 | runtime에 자유 | 컴파일 시점에 고정 |
| FreeRTOS v11 | **지원** | 일부 port (RP2040 multicore_*) |
| 적합한 경우 | 부하 분산, 응답성 | 격리, 결정성 |

이 장은 *SMP*에 집중합니다. AMP는 [Ch 10 stream buffer](/blog/embedded/rtos/freertos-mastering/chapter10-stream-message-buffers)에서 다룬 *코어 간 통신*에 더 가깝습니다.

## 활성화 — FreeRTOSConfig

```c
/* FreeRTOSConfig.h */
#define configNUMBER_OF_CORES               2

/* SMP 추가 옵션 */
#define configRUN_MULTIPLE_PRIORITIES       1   /* 여러 코어가 서로 다른 우선순위 동시 실행 */
#define configUSE_CORE_AFFINITY             1   /* affinity API 활성 */
#define configUSE_TASK_PREEMPTION_DISABLE   1   /* 특정 태스크 선점 막기 */
#define configUSE_PASSIVE_IDLE_HOOK         0
```

| 옵션 | 동작 |
|------|------|
| `configRUN_MULTIPLE_PRIORITIES=1` | 두 코어가 동시에 *다른 우선순위 태스크*를 실행 (일반적) |
| `configRUN_MULTIPLE_PRIORITIES=0` | 가장 높은 우선순위 N개만 동시 실행 (단순 부하 분산) |
| `configUSE_CORE_AFFINITY=1` | `vTaskCoreAffinitySet` 등 affinity API 사용 가능 |
| `configUSE_TASK_PREEMPTION_DISABLE=1` | `vTaskPreemptionDisable`로 *해당 태스크 임계 영역 안전* |

## Core affinity API

```c
/* core mask — 비트 0 = core 0, 비트 1 = core 1, ... */
typedef UBaseType_t UBaseType_t;

void vTaskCoreAffinitySet(const TaskHandle_t xTask, UBaseType_t uxCoreAffinityMask);
UBaseType_t vTaskCoreAffinityGet(const TaskHandle_t xTask);

/* 예 */
TaskHandle_t h_radio;
xTaskCreate(radio_task, "radio", 4096, NULL, 5, &h_radio);
vTaskCoreAffinitySet(h_radio, 1U << 1);   /* core 1에만 고정 */

TaskHandle_t h_app;
xTaskCreate(app_task, "app", 4096, NULL, 4, &h_app);
vTaskCoreAffinitySet(h_app, 1U << 0);     /* core 0에만 고정 */

/* 양쪽 모두 허용 (default) */
vTaskCoreAffinitySet(h_worker, (1U << 0) | (1U << 1));
```

affinity가 *0x3*(모든 코어 허용)이면 SMP 스케줄러가 *부하가 적은 코어*로 자동 이동시킵니다. 특정 코어에 *cache hot 데이터*가 있거나 *인터럽트가 그 코어로만 라우팅*되는 페리페럴 작업이면 *명시 고정*이 빠릅니다.

## Core-aware critical section

단일 코어 FreeRTOS의 `taskENTER_CRITICAL`은 *인터럽트만 끄면 충분*했습니다. SMP에서는 *다른 코어가 동시에 같은 자료를 만질 수 있어서* spinlock이 함께 필요합니다.

```c
/* SMP에서 임계 영역 진입 */
void update_shared(void)
{
    taskENTER_CRITICAL();
    /* 이 시점:
       - 현재 코어의 interrupt OFF
       - 다른 코어가 같은 spinlock을 잡으려 spin
    */
    shared_count++;
    shared_buf[idx++] = sample;
    taskEXIT_CRITICAL();
}

/* ISR 변형 */
UBaseType_t saved = taskENTER_CRITICAL_FROM_ISR();
/* ... */
taskEXIT_CRITICAL_FROM_ISR(saved);
```

내부적으로는 *코어별 nesting counter*와 *전역 spinlock*이 결합된 구조입니다.

```c
/* 개념 (port에 따라 차이 있음) */
typedef struct {
    portSpinLock_t  lock;
    uint32_t        owner_core;
    uint32_t        nesting;
} portCRITICAL_NESTING_xCoreID_t;
```

핵심 규칙은 *임계 영역을 짧게* 유지하는 것입니다. SMP에서 임계 영역은 *다른 코어를 spin시키는 비용*까지 들기 때문에, 단일 코어에서보다 *훨씬 비싼* 작업이 됩니다.

## RP2040 — 듀얼 Cortex-M0+

Raspberry Pi의 RP2040은 *Cortex-M0+ 두 개*를 갖는 비교적 작은 SoC입니다. FreeRTOS-Kernel의 `GCC/RP2040` 포트가 v11 SMP를 지원합니다.

| 항목 | 값 |
|------|----|
| 코어 | Cortex-M0+ × 2 @ 133 MHz |
| 명령 캐시 | 없음 (XIP cache 16KB) |
| SRAM | 264 KB (banked) |
| 하드웨어 spinlock | **32개** (SIO) |

```c
/* RP2040 FreeRTOSConfig.h (Pico SDK 통합) */
#define configNUMBER_OF_CORES                2
#define configUSE_CORE_AFFINITY              1
#define configUSE_PASSIVE_IDLE_HOOK          0
#define configTICK_RATE_HZ                   1000

/* main */
int main(void)
{
    /* core 0이 main 시작 — core 1은 SDK가 켜 줌 */
    xTaskCreate(sensor_task,  "sensor",  2048, NULL, 3, &h_sensor);
    xTaskCreate(network_task, "net",     2048, NULL, 2, &h_net);

    vTaskCoreAffinitySet(h_sensor, 1U << 0);
    vTaskCoreAffinitySet(h_net,    1U << 1);

    vTaskStartScheduler();
    return 0;
}
```

RP2040의 *하드웨어 spinlock 32개*가 FreeRTOS 임계 영역 구현에 직접 활용됩니다. 코드 한 줄이 *수 사이클의 spinlock acquire*로 끝납니다.

## ESP32-S3 — Xtensa LX7 듀얼 + RISC-V LP

ESP32-S3는 *Xtensa LX7 두 코어*에 *RISC-V LP 코어 하나*까지 붙은 비대칭 칩입니다. ESP-IDF 5.x부터 *mainline FreeRTOS v11*과 *Espressif fork SMP*를 선택할 수 있습니다.

```c
/* ESP-IDF — affinity 강제 생성 */
TaskHandle_t h;
xTaskCreatePinnedToCore(
    task_fn, "name", 4096, NULL, 5, &h,
    1                  /* core ID: 0=PRO_CPU, 1=APP_CPU */
);

/* mainline v11 API와 호환 */
vTaskCoreAffinitySet(h, 1U << 1);
```

| 항목 | 값 |
|------|----|
| 코어 | Xtensa LX7 × 2 @ 240 MHz + RISC-V LP @ 32 MHz |
| SRAM | 512 KB |
| 캐시 | 32 KB I/D |
| 특이점 | RISC-V LP는 별도 펌웨어, ULP coprocessor 성격 |

ESP32-S3는 *WiFi/BLE 스택이 한 코어를 점유*하는 경향이 강해서, 응용을 *반대 코어로 명시 고정*하는 패턴이 일반적입니다. 사용자가 *PRO_CPU(core 0)에 응용*, *APP_CPU(core 1)에 네트워크 스택*을 두면 *cache locality*가 안정됩니다.

## Espressif fork SMP의 위상

Espressif는 2017년부터 *FreeRTOS-Kernel을 fork*해서 자체 SMP 패치를 유지해 왔습니다. v11 mainline 합류로 이 fork는 *점진적 deprecated* 단계입니다.

```text
[ESP-IDF 5.0~5.2]                       [ESP-IDF 5.3~]
─────────────                            ─────────────
default: Espressif fork SMP              default: Mainline v11 SMP
opt-in: amazon mainline                  opt-in: legacy fork (호환용)
```

기능적으로 거의 동등하지만 *세부 API와 동작 차이*가 있어서, 새 프로젝트는 *처음부터 mainline*으로 시작하는 것이 안전합니다. 기존 fork 코드는 *deprecate 경고가 나오는 API를 차츰 교체*하는 마이그레이션이 필요합니다.

## vTaskPreemptionDisable

SMP에서는 *같은 우선순위 사이의 round-robin*이 두 코어에서 동시에 일어날 수 있어서, 단일 코어보다 *경합*이 잦습니다. *특정 태스크의 임계 작업 동안 선점만 막고 싶을 때* 다음 API를 씁니다.

```c
void critical_work(void)
{
    vTaskPreemptionDisable(NULL);   /* 현재 태스크 */
    /* 같은 코어에서 다른 태스크의 선점 X
       다른 코어는 계속 동작 (인터럽트도 살아 있음) */
    do_critical();
    vTaskPreemptionEnable(NULL);
}
```

`taskENTER_CRITICAL`과 달리 *인터럽트는 켜져 있어서* 응답성이 보존됩니다. *공유 자원이 없는 긴 작업*에 적합합니다.

## 부하 분산 측정

vTaskGetRunTimeStats로 *코어별 부하*를 볼 수 있습니다 (`configRUN_TIME_COUNTER_FOR_CORE_IS_NOT_IDLE` 활성 시).

```c
char buf[2048];
vTaskGetRunTimeStats(buf);
printf("%s", buf);
```

```text
Task          Abs Time(core0)  Abs Time(core1)  %CPU(c0)  %CPU(c1)
sensor             12453            0              23%       0%
net                  108         11892             <1%       22%
IDLE              40123          41384             76%       77%
```

`net` 태스크가 core 1에 잘 고정돼 있고, `sensor`는 core 0에 있습니다. IDLE 비율이 70~80%면 *여유*가 충분하고, 50% 아래로 떨어지면 *부하 분산*을 다시 보거나 *우선순위*를 조정합니다.

## 자주 하는 실수

```text
증상                                    원인                                해결
─────────────────────────────────────────────────────────────────────────────────
SMP 켰는데 한 코어만 사용                affinity가 한 쪽에 묶임              affinity mask = 0x3 (둘 다)
공유 자료 corruption                    임계 영역 없이 접근                  taskENTER_CRITICAL 추가
임계 영역 안에서 yield 시 deadlock      vTaskDelay/Wait 호출                 임계 영역에서 block 금지
ESP-IDF에서 동작 다름                  fork vs mainline 차이                ESP-IDF 버전 + sdkconfig 확인
RP2040 core 1이 안 부팅                multicore_launch 누락                Pico SDK가 자동 처리하는지 확인
ISR이 한 코어에서만 처리                 인터럽트 라우팅 고정                필요한 코어에 routing 설정
runtime stats가 IDLE만                   counter timebase 미설정              configGENERATE_RUN_TIME_STATS 매크로
```

가장 잦은 함정이 *임계 영역 안에서 block API* 호출입니다. SMP에서 이건 *상대 코어가 spinlock을 영원히 못 푸는* deadlock 시나리오입니다. 임계 영역은 *cycle 단위로 짧게* 유지해야 합니다.

## 마이그레이션 — 단일 코어 → SMP

기존 단일 코어 코드를 SMP로 올릴 때 체크리스트입니다.

```text
[ ] configNUMBER_OF_CORES = 2 (또는 N)
[ ] 전역 변수 접근에 임계 영역 또는 atomic 적용
[ ] ISR이 어느 코어에서 실행되는지 명확화
[ ] 두 코어가 같은 페리페럴을 만지지 않게 분리
[ ] cache flush/invalidate 필요한 DMA 경로 확인
[ ] vTaskGetRunTimeStats로 부하 분포 확인
[ ] 임계 영역 길이 측정 (스코프 또는 GPIO 토글)
```

단일 코어에서는 *드러나지 않던 race*가 SMP에서 폭발합니다. *전역 카운터, 링버퍼 인덱스, 상태 머신 변수*가 흔한 후보입니다.

## 정리

- v11(2023) 이후 *SMP가 FreeRTOS mainline*입니다. `configNUMBER_OF_CORES ≥ 2`로 활성화합니다.
- `vTaskCoreAffinitySet`으로 *태스크별 core mask*를 정합니다. 0x3이면 자유 이동, 단일 비트면 고정입니다.
- 임계 영역은 *코어 간 spinlock + 인터럽트 마스킹* 조합입니다. 단일 코어 때보다 *훨씬 비싸므로 짧게* 유지합니다.
- *RP2040*은 듀얼 Cortex-M0+에 *하드웨어 spinlock 32개*가 있어 SMP에 자연스럽습니다.
- *ESP32-S3*는 PRO/APP CPU + RISC-V LP의 비대칭 구조. WiFi/BLE 스택과 응용을 *반대 코어*에 분배하는 것이 표준 패턴입니다.
- Espressif fork SMP는 *deprecated 경로*. 새 프로젝트는 mainline v11으로 시작하는 것이 안전합니다.
- `vTaskPreemptionDisable`은 *인터럽트는 켠 채 선점만 차단*. 공유 자원 없는 긴 작업에 유용합니다.
- 단일 코어에서 숨어 있던 *race가 SMP에서 노출*됩니다. 마이그레이션 시 전역 변수 접근을 모두 점검합니다.

## 다음 편

[Ch 14: Trouble Shooting](/blog/embedded/rtos/freertos-mastering/chapter14-trouble-shooting)이 시리즈의 마지막입니다. `configASSERT`, stack overflow hook, tracing 도구, 그리고 *실전에서 만난 Cortex-M NVIC 우선순위 함정*까지 정리합니다.

## 관련 항목

- [Ch 10: Stream and Message Buffers](/blog/embedded/rtos/freertos-mastering/chapter10-stream-message-buffers) — 코어 간 통신 (AMP)
- [Ch 14: Trouble Shooting](/blog/embedded/rtos/freertos-mastering/chapter14-trouble-shooting) — SMP race 디버그
- [ESP32-C3 Mastering Ch 10: FreeRTOS](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos) — 단일 코어 ESP32-C3 비교
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/) — SMP 스케줄러 내부
- [원문 — FreeRTOS SMP](https://www.freertos.org/symmetric-multiprocessing-introduction.html)
- [원문 — RP2040 SDK Multicore](https://www.raspberrypi.com/documentation/pico-sdk/high_level.html#group_multicore)
