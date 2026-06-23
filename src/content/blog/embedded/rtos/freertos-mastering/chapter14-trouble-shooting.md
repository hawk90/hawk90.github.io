---
title: "Ch 14: Trouble Shooting"
date: 2026-05-09T14:00:00
description: "stack overflow·malloc failed·assert — FreeRTOS 흔한 버그 패턴."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 14
tags: [freertos, debugging, stack-overflow, assert]
type: book-review
bookTitle: "Mastering the FreeRTOS Real Time Kernel"
bookAuthor: "Richard Barry"
draft: true
---

## 한 줄 요약

> **"FreeRTOS의 버그 80%는 *configASSERT*, *stack overflow hook*, *malloc failed hook*, 그리고 *Cortex-M NVIC 우선순위 설정*을 점검하면 잡힙니다. 나머지는 *Tracealyzer / SystemView*로 *시간 축에 모든 태스크와 인터럽트*를 펼쳐서 보면 패턴이 드러납니다. 이번 장은 시리즈의 마지막 — *FreeRTOS 양산 펌웨어가 자주 빠지는 함정*과 *디버깅 도구의 사용법*을 정리합니다."**

RTOS 펌웨어는 *재현이 어려운 버그*가 잦습니다. 같은 입력에도 컨텍스트 스위치 타이밍이 달라서, 어제 1시간 만에 죽던 버그가 오늘은 *6시간이 지나도 안 죽습니다*. 이 장은 *실전에서 반복적으로 발견되는 패턴*과 그것을 *조기에 잡는 도구*를 다룹니다. 결국 *시리즈를 마무리하는 디버깅 핸드북*입니다.

## configASSERT — 가장 강력한 첫 무기

거의 모든 FreeRTOS 함수가 *전제 조건*을 `configASSERT`로 검사합니다. 디폴트 정의는 빈 매크로라서 *그냥 두면 검사를 안 합니다*. *반드시 정의*해서 켭니다.

```c
/* FreeRTOSConfig.h */
extern void vAssertCalled(const char *file, int line);

#define configASSERT(x)  do { if (!(x)) vAssertCalled(__FILE__, __LINE__); } while (0)

/* main.c */
void vAssertCalled(const char *file, int line)
{
    taskDISABLE_INTERRUPTS();
    printf("ASSERT: %s:%d\n", file, line);
    /* breakpoint — debug 빌드 */
    __asm volatile("bkpt #0");
    while (1) {}
}
```

`bkpt #0`은 *디버거가 연결돼 있으면 즉시 멈춤*, 연결돼 있지 않으면 *Hard Fault*로 잡힙니다. 양산 빌드에서는 *reset + crash log* 저장으로 바꿉니다.

흔한 발견들입니다.

```text
ASSERT: queue.c:XXX     — ISR에서 non-FromISR API 호출
ASSERT: tasks.c:XXX     — uxPriority가 configMAX_PRIORITIES 이상
ASSERT: port.c:XXX      — NVIC priority가 configMAX_SYSCALL_INTERRUPT_PRIORITY 위반
ASSERT: heap_4.c:XXX    — pvPortMalloc(0) 또는 corruption
```

ASSERT 한 줄이 *수십 시간의 디버깅*을 절약합니다.

## Stack overflow hook

태스크가 *할당된 stack을 넘어 쓰면* 다른 태스크의 자료가 망가집니다. 이걸 *runtime에 감지*하는 hook이 있습니다.

```c
/* FreeRTOSConfig.h */
#define configCHECK_FOR_STACK_OVERFLOW   2

/* main.c */
void vApplicationStackOverflowHook(TaskHandle_t xTask, char *pcTaskName)
{
    taskDISABLE_INTERRUPTS();
    printf("STACK OVERFLOW: %s\n", pcTaskName);
    __asm volatile("bkpt #0");
    while (1) {}
}
```

| 값 | 검사 |
|---|------|
| 0 | 끔 |
| 1 | 컨텍스트 스위치 때 *stack pointer가 끝을 넘었는지* 확인 (빠름, 빈약) |
| 2 | stack 끝 16바이트를 *magic word 0xA5A5...*로 채우고 검사 (강력, 약간 느림) |

양산까지 *값 2*를 유지하는 것이 권장입니다. 비용은 *컨텍스트 스위치당 ~50 cycle*이고, *디버깅 가치가 훨씬 큽니다*.

**Stack 크기 측정**:

```c
/* 각 태스크의 high water mark — 최소 잔여 byte */
UBaseType_t hwm = uxTaskGetStackHighWaterMark(h_task);
printf("task %s stack remaining: %u bytes\n", name, hwm * sizeof(StackType_t));
```

처음에는 *모든 태스크에 4 KB stack*을 주고 시작한 뒤, hwm을 측정해서 *peak + 25% 여유*로 조정하는 것이 실용적인 흐름입니다.

## Malloc failed hook

`pvPortMalloc`이 실패하면 *NULL을 반환*합니다. 그걸 못 체크하면 NULL 역참조로 Hard Fault가 납니다. Hook을 켜면 *실패 시점에 즉시* 알림이 옵니다.

```c
/* FreeRTOSConfig.h */
#define configUSE_MALLOC_FAILED_HOOK   1

/* main.c */
void vApplicationMallocFailedHook(void)
{
    taskDISABLE_INTERRUPTS();
    size_t heap_free = xPortGetFreeHeapSize();
    size_t heap_min  = xPortGetMinimumEverFreeHeapSize();
    printf("MALLOC FAILED: free=%u min=%u\n", heap_free, heap_min);
    __asm volatile("bkpt #0");
    while (1) {}
}
```

`xPortGetMinimumEverFreeHeapSize`로 *부팅 이후 가장 적었던 free heap*을 추적합니다. 이 값이 *0에 가까워지면* heap 부족이거나 *누수*가 있다는 신호입니다.

## Cortex-M NVIC priority — 가장 자주 만나는 함정

ARM Cortex-M은 *우선순위가 작을수록 높음*입니다. 거기에 `__NVIC_PRIO_BITS`(보통 3 또는 4)만큼만 *실제 비트*가 있어서 *상위 비트에 시프트*되어 들어갑니다. FreeRTOS는 *시프트된 raw 값* 기준으로 *MAX_SYSCALL_INTERRUPT_PRIORITY*를 정합니다.

```c
/* FreeRTOSConfig.h (STM32F4 예) */
#define configPRIO_BITS                              4
#define configKERNEL_INTERRUPT_PRIORITY              (15 << (8 - configPRIO_BITS))
#define configMAX_SYSCALL_INTERRUPT_PRIORITY         (5  << (8 - configPRIO_BITS))
#define configLIBRARY_LOWEST_INTERRUPT_PRIORITY      15
#define configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY 5
```

STM32 4-bit priority:

| NVIC_SetPriority value | Raw register value | FreeRTOS API 호출 가능? |
|------------------------|--------------------|--------------------------|
| 0 (가장 높음) | 0x00 | X (커널 위, FromISR 호출 불가) |
| 1 | 0x10 | X |
| 2 | 0x20 | X |
| 3 | 0x30 | X |
| 4 | 0x40 | X |
| 5 | 0x50 | O (configMAX_SYSCALL = 0x50 부터) |
| 6 ... 15 | 0x60 ... 0xF0 | O |

대부분의 *Hard Fault·이상 동작*이 *5보다 낮은 우선순위의 ISR이 FromISR API를 호출*해서 발생합니다. configASSERT가 켜져 있으면 *port.c에서 즉시 발견*됩니다.

또 한 가지 흔한 함정은 *priority group*입니다. FreeRTOS는 *전부 preemption priority*로 설정돼야 합니다. *subpriority가 있으면 동작이 미정의*입니다.

```c
NVIC_PriorityGroupConfig(NVIC_PriorityGroup_4);   /* STM32 — 4 bits preemption, 0 sub */
```

## Priority inversion 진단

`configUSE_MUTEXES = 1`이면 mutex가 *priority inheritance*를 자동 적용합니다. 그래도 *깊은 우선순위 inversion*은 발견하기 어렵습니다.

```c
/* 측정: GPIO 토글로 임계 영역 길이 보기 */
void critical_work(void)
{
    GPIO_SetBits(GPIOB, GPIO_PIN_5);
    xSemaphoreTake(mtx, portMAX_DELAY);
    do_work();
    xSemaphoreGive(mtx);
    GPIO_ResetBits(GPIOB, GPIO_PIN_5);
}
```

로직 애널라이저에 보이는 *GPIO high 시간이 너무 길면* mutex 보유 시간이 길거나, 그 동안 *낮은 우선순위가 자원을 들고 있어서* high-priority가 못 진행하는 신호입니다.

## Tracealyzer — 시각화 표준

*Percepio Tracealyzer*는 FreeRTOS 표준 디버깅 도구입니다. 모든 *태스크 스위치, ISR 진입/종료, 큐 send/receive, mutex 획득*을 시간 축에 펼쳐 보여 줍니다.

```c
/* trcConfig.h */
#define TRC_USE_TRACEALYZER_RECORDER     1

/* main */
vTraceEnable(TRC_START);
xTaskCreate(...);
```

설치 후 *수 분 안에* 다음이 보입니다.

- 어떤 태스크가 *진짜로 부하의 80%*를 가져가는지
- *우선순위 inversion*의 정확한 발생 시점과 지속 시간
- 큐가 *얼마나 자주 꽉 차는지*
- *예기치 않은 long ISR*

데이터 캡처는 *RAM ring buffer*(snapshot mode)나 *J-Link RTT*(streaming mode)로 합니다. 무료 community 라이선스가 *32개 태스크/queue/semaphore*까지 지원합니다.

## Segger SystemView

Segger의 *SystemView*도 동등한 기능을 *무료*로 제공합니다. J-Link 하드웨어가 있다면 *RTT를 통해 실시간 스트리밍*이 가능합니다.

```c
/* SEGGER_SYSVIEW_Conf.h, SEGGER_SYSVIEW_FreeRTOS.c 추가 */
SEGGER_SYSVIEW_Conf();
SEGGER_SYSVIEW_Start();
```

```text
[SystemView 캡처 한 컷]

time ──►
core 0  [taskA──][ISR][taskB────────────][taskA──]
core 1  [IDLE──────────────][taskC────][IDLE────]
        │                  │
        └─ taskB 우선순위 ↑ │
                            └─ taskC가 core 1로 이동
```

# vTaskGetRunTimeStats — CPU 사용량

별도 도구 없이 *간단한 CPU 사용량 표*를 얻을 수 있습니다.

```c
/* FreeRTOSConfig.h */
#define configGENERATE_RUN_TIME_STATS              1
#define configUSE_TRACE_FACILITY                   1
#define portCONFIGURE_TIMER_FOR_RUN_TIME_STATS()   timer_init_50us()
#define portGET_RUN_TIME_COUNTER_VALUE()           timer_get_count()

/* 출력 */
char buf[2048];
vTaskGetRunTimeStats(buf);
printf("%s", buf);
```

```text
Task            Abs Time      %CPU
sensor          1234567        12%
network         3456789        34%
ui              567890          5%
IDLE            4938271        49%
```

*50 µs counter*로 측정할 때 CPU 분해능이 50 µs입니다. 충분히 정확하면서도 *별도 도구 없이 즉시 사용*할 수 있는 장점이 큽니다.

## 실전 사례 — Cortex-M NVIC priority 함정

STM32F4 + FreeRTOS 양산 펌웨어의 실제 디버깅 사례입니다.

```text
증상: 부팅 후 30분~몇 시간 뒤 Hard Fault.
     재현 시간이 들쭉날쭉. core dump의 PC가 매번 다른 ISR 안.

조사:
1. configASSERT 켜고 빌드 → port.c에서 ASSERT 즉시 발견
2. ASSERT 위치: vPortValidateInterruptPriority
3. NVIC_GetActive로 ISR 번호 확인 → USART2_IRQHandler
4. CubeMX에서 USART2 우선순위 = 2 (raw 0x20)
5. configMAX_SYSCALL_INTERRUPT_PRIORITY = 0x50
6. 0x20 < 0x50 → USART2가 너무 높아서 FromISR 호출 불가

수정: CubeMX에서 USART2 priority = 6 (raw 0x60)으로 변경
결과: 문제 사라짐.
```

*configASSERT가 켜져 있었다면 30분이 아니라 *부팅 즉시* 발견*되는 버그였습니다. 첫 부팅에서 ISR이 안 떠서 잠복해 있던 것뿐입니다.

## Hard Fault 핸들러 — 최후 진단

모든 ASSERT가 실패하면 Hard Fault가 최후 보루입니다. *스택을 덤프*해 *PC, LR, PSR*을 출력하는 핸들러를 항상 두는 것이 좋습니다.

```c
void HardFault_Handler(void)
{
    __asm volatile(
        "tst lr, #4              \n"
        "ite eq                  \n"
        "mrseq r0, msp           \n"
        "mrsne r0, psp           \n"
        "ldr r1, [r0, #24]       \n"   /* PC */
        "b hard_fault_dump       \n"
    );
}

void hard_fault_dump(uint32_t *sp)
{
    printf("Hard Fault @ PC=%08lx LR=%08lx PSR=%08lx\n",
           sp[6], sp[5], sp[7]);
    printf("CFSR=%08lx HFSR=%08lx BFAR=%08lx\n",
           SCB->CFSR, SCB->HFSR, SCB->BFAR);
    while (1) {}
}
```

PC를 *map 파일과 대조*하면 *원인 라인*까지 잡을 수 있습니다. `addr2line` 도구가 ELF 안 디버그 정보로 *PC를 source line*으로 변환합니다.

```bash
arm-none-eabi-addr2line -e firmware.elf 0x08004532
# → /path/to/source.c:128
```

## 흔한 함정 카탈로그

| 증상 | 원인 | 해결 |
|------|------|------|
| 부팅 후 일정 시간 후 Hard Fault | NVIC priority 미설정 | configASSERT + priority 검토 |
| Stack overflow hook 트리거 | peak stack 부족 | hwm 측정 + 25% 여유 |
| malloc fail 빈발 | heap 부족 또는 누수 | heap_4 + free 추적 |
| 큐 send timeout 자주 | 소비자가 느림 / 막힘 | trace로 소비자 확인 |
| mutex lockup | priority inversion 또는 deadlock | mutex 사용 + 임계 영역 축소 |
| ISR 응답 늦음 | 인터럽트 우선순위 잘못 | NVIC priority 재설계 |
| Hard Fault에 PC=0xDEADBEEF | call site corruption | stack overflow 가능성 |
| SMP에서 random crash | 공유 변수 보호 누락 | taskENTER_CRITICAL 또는 atomic |
| vTaskDelay가 부정확 | tick 보정 실패 (tickless) | vTaskStepTick 점검 |
| WFI 후 wake 안 됨 | wake-up source 미설정 | LPTIM/RTC interrupt 활성 |
| 새로 만든 태스크가 안 동작 | 스택 너무 작거나 우선순위 0 | 스택 ≥ 256, 우선순위 ≥ 1 |

## 디버깅 워크플로

**1. configASSERT 켜기**


**2. configCHECK_FOR_STACK_OVERFLOW = 2**


**3. configUSE_MALLOC_FAILED_HOOK = 1**


**4. configGENERATE_RUN_TIME_STATS로 부하 확인**


**5. NVIC priority 전수 검토 (configMAX_SYSCALL 위반 검색)**


**6. Hard Fault handler에서 PC/LR 덤프**


**7. addr2line으로 PC → source 변환**


**8. 여전히 미해결 → Tracealyzer/SystemView**


**9. 그래도 → 로직 애널라이저 + GPIO 토글**

위 9단계로 *대부분의 FreeRTOS 버그*가 잡힙니다. 4번까지가 *코드 한 줄씩 추가*로 끝나는 일이라서, *프로젝트 초기에 모두 활성화*하는 것이 정석입니다.

## 정리

- `configASSERT`는 가장 강력한 첫 무기입니다. *반드시 정의*해서 켭니다.
- `configCHECK_FOR_STACK_OVERFLOW=2`로 *런타임 stack overflow 감지*. `uxTaskGetStackHighWaterMark`로 *peak 측정*.
- `configUSE_MALLOC_FAILED_HOOK=1`과 `xPortGetMinimumEverFreeHeapSize`로 *heap 추적*.
- *Cortex-M NVIC priority*는 가장 잦은 함정입니다. *configMAX_SYSCALL_INTERRUPT_PRIORITY 위반*은 ASSERT가 잡아 줍니다.
- `vTaskGetRunTimeStats`로 *CPU 사용량 표*를 얻습니다. Tracealyzer/SystemView로 *시간 축 시각화*.
- Hard Fault handler에서 *PC/LR 덤프 + addr2line*으로 *source line*까지 추적합니다.
- SMP에서는 *공유 변수 보호 누락*이 *드물게 발생하는 race*로 나타납니다. 임계 영역으로 보호하고 짧게 유지합니다.
- 디버깅 도구를 *프로젝트 초기에 모두 켜고* 시작하는 것이 *수십 시간*을 절약합니다.

## 시리즈 마무리

여기까지가 *Mastering the FreeRTOS Real Time Kernel* 시리즈 14편의 끝입니다.

- *Ch 1~5*에서 *태스크와 스케줄러*의 모델을 깔았습니다.
- *Ch 6~10*에서 *큐·세마포·event group·notification·stream buffer*로 *IPC 전 영역*을 다뤘습니다.
- *Ch 11~13*에서 *low power, MPU, SMP*라는 *양산 펌웨어의 비기능 요구사항*까지 펼쳤습니다.
- *Ch 14*에서 *실전 디버깅 도구*로 시리즈를 닫았습니다.

FreeRTOS는 *작고 잘 만들어진 RTOS*입니다. 이 시리즈로 *책 한 권*과 *실전 함정*을 한 번에 정리했다면, 다음은 *더 깊은 내부*와 *더 큰 시스템*으로 갑니다.

## 다음 시리즈 추천

- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/00-preface) — *FreeRTOS의 스케줄러·MPU·SMP가 어떻게 동작하는지* 소스 레벨로. v11 SMP의 구현, low-power tick 보정의 코너 케이스, MPU wrapper의 SVC 진입까지 한 줄씩 따라가는 시리즈.
- [ESP32-C3 Mastering — Ch 10: FreeRTOS](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos) — Espressif 변형 FreeRTOS와 mainline의 차이. WiFi/BLE 스택과 응용의 *core pinning* 패턴.
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/00-preface) — DMA + ring buffer, 한 줄 로깅 큐, watchdog 패턴 등 *실전에서 매번 마주치는 레시피 모음*.

## 관련 항목

- [Ch 1: Introduction](/blog/embedded/rtos/freertos-mastering/chapter01-distribution)
- [Ch 13: SMP Support](/blog/embedded/rtos/freertos-mastering/chapter13-smp-support)
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/00-preface)
- [ESP32-C3 Mastering Ch 10: FreeRTOS](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos)
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/00-preface)
- [원문 — FreeRTOS Debugging](https://www.freertos.org/RTOS-debugging.html)
- [원문 — Percepio Tracealyzer](https://percepio.com/tracealyzer/)
- [원문 — Segger SystemView](https://www.segger.com/products/development-tools/systemview/)
