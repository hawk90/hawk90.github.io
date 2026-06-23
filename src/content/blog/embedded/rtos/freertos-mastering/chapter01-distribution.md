---
title: "Ch 1: The FreeRTOS Distribution"
date: 2026-05-09T01:00:00
description: "FreeRTOS 소스 트리, 포팅 레이어, FreeRTOSConfig.h, MIT 라이선스, LTS — 시작 전에 알아둘 것."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 1
tags: [freertos, rtos, embedded, portability]
type: book-review
bookTitle: "Mastering the FreeRTOS Real Time Kernel"
bookAuthor: "Richard Barry"
draft: true
---

## 한 줄 요약

> **"FreeRTOS는 *순수 ANSI C로 작성된 커널*이고, 칩 의존 부분은 모두 `Source/portable/`에 격리됩니다. 새 프로젝트는 *데모 한 개를 베이스로 시작*하되 *FreeRTOSConfig.h만 직접 다듬으면* 90%가 끝납니다."**

FreeRTOS의 진짜 입문 장벽은 *API*가 아니라 *디렉터리 구조*입니다. zip을 풀면 수백 개의 폴더가 쏟아지고, 어느 파일을 빌드에 포함해야 하는지가 막막합니다. *Source/* 안에 무엇이 있고, *portable/* 어디서 멈춰야 하고, *FreeRTOSConfig.h*는 어디에 두는지를 먼저 정리하면 이후 장이 가벼워집니다.

이번 장에서는 *FreeRTOS 배포본의 구조*, *포팅 레이어의 경계*, *컴파일 타임 설정 한 파일*, *데모 vs 실제 프로젝트의 차이*, 그리고 *LTS·MIT 라이선스의 의미*를 다룹니다.

## 배포본의 두 갈래 — Source/와 Demo/

FreeRTOS 공식 zip을 풀면 최상위에 *FreeRTOS/*와 *FreeRTOS-Plus/*가 보입니다. 우리가 다루는 *커널*은 `FreeRTOS/Source/`에 있고, *데모와 추가 라이브러리*는 그 바깥에 있습니다.

```text
FreeRTOS/
├─ Source/                         ← 커널 (이것만으로 동작 가능)
│   ├─ tasks.c                     ← 스케줄러, 태스크 API
│   ├─ queue.c                     ← 큐, 세마포, 뮤텍스
│   ├─ list.c                      ← 내부 doubly-linked list
│   ├─ timers.c                    ← 소프트웨어 타이머
│   ├─ event_groups.c              ← 이벤트 그룹
│   ├─ stream_buffer.c             ← 스트림/메시지 버퍼
│   ├─ croutine.c                  ← (legacy) co-routine
│   │
│   ├─ include/                    ← 공개 헤더
│   │   ├─ FreeRTOS.h
│   │   ├─ task.h
│   │   ├─ queue.h
│   │   ├─ semphr.h
│   │   ├─ timers.h
│   │   └─ ...
│   │
│   └─ portable/                   ← 칩·컴파일러 의존
│       ├─ GCC/                    ← GCC 컴파일러
│       │   ├─ ARM_CM3/            ← Cortex-M3
│       │   ├─ ARM_CM4F/           ← Cortex-M4 + FPU
│       │   ├─ ARM_CM7/            ← Cortex-M7
│       │   └─ ...
│       ├─ IAR/                    ← IAR EWARM
│       ├─ Keil/                   ← Keil MDK (ARM CC)
│       ├─ MemMang/                ← heap_1.c ~ heap_5.c
│       └─ Common/
│
└─ Demo/                           ← 예제 프로젝트 (보드별)
    ├─ CORTEX_STM32F407_GCC/
    ├─ CORTEX_M3_MPS2_QEMU_GCC/
    ├─ Common/                     ← 데모 공용 헬퍼
    └─ ...
```

빌드에 *반드시* 포함할 파일은 다음과 같습니다.

```text
필수
  Source/tasks.c
  Source/queue.c
  Source/list.c
  Source/portable/GCC/<MCU>/port.c
  Source/portable/MemMang/heap_X.c   (X는 1~5 중 하나)

선택 (configUSE_TIMERS=1이면)
  Source/timers.c

선택 (configUSE_EVENT_GROUPS=1이면)
  Source/event_groups.c

선택 (Stream/Message Buffer 쓰면)
  Source/stream_buffer.c
```

`croutine.c`는 *유물*입니다. 신규 프로젝트에는 *쓰지 않습니다*. 책에서도 *legacy*로 명시됩니다.

## 포팅 레이어 — 칩 의존성의 경계

`Source/portable/`는 *FreeRTOS가 새 칩에 이식될 때 변경되는 유일한 영역*입니다. 그 안의 두 파일이 핵심입니다.

| 파일 | 역할 |
|------|------|
| `port.c` | 스케줄러 시작, context switch, tick 인터럽트 |
| `portmacro.h` | 타입 정의 (`BaseType_t`, `TickType_t`), critical section 매크로 |

`portmacro.h`의 일부를 보면 *왜 이 분리가 필요한지*가 보입니다.

```c
/* Cortex-M4F portmacro.h 발췌 */
#define portCHAR        char
#define portFLOAT       float
#define portDOUBLE      double
#define portLONG        long
#define portSHORT       short
#define portSTACK_TYPE  uint32_t
#define portBASE_TYPE   long

typedef portSTACK_TYPE  StackType_t;
typedef long            BaseType_t;
typedef unsigned long   UBaseType_t;
typedef uint32_t        TickType_t;

#define portBYTE_ALIGNMENT          8
#define portSTACK_GROWTH            (-1)
#define portTICK_PERIOD_MS          ((TickType_t)1000 / configTICK_RATE_HZ)
```

`BaseType_t`는 *해당 아키텍처의 자연스러운 워드 폭*입니다. 32-bit MCU에서는 `long`이고, AVR 같은 8-bit에서는 `char`입니다. *모든 FreeRTOS 반환값이 이 타입*인 이유는 *가장 빠른 정수 연산*을 쓰기 위해서입니다.

`portSTACK_GROWTH`는 *스택이 자라는 방향*을 알려줍니다. ARM은 `-1` (downward), 일부 RISC 아키텍처는 `+1` (upward)입니다. 이 한 매크로로 모든 스택 계산이 일반화됩니다.

## FreeRTOSConfig.h — 컴파일 타임 설정 한 곳

`FreeRTOSConfig.h`는 *FreeRTOS의 모든 행동을 결정하는 한 파일*입니다. 커널 소스 어디에도 이 파일은 없습니다. *프로젝트가 직접 만들어 include path에 두어야 합니다*.

```c
/* FreeRTOSConfig.h — Cortex-M4F 예 */
#ifndef FREERTOS_CONFIG_H
#define FREERTOS_CONFIG_H

/* 스케줄링 정책 */
#define configUSE_PREEMPTION                    1
#define configUSE_TIME_SLICING                  1
#define configUSE_TICKLESS_IDLE                 0

/* 시스템 클럭과 tick */
#define configCPU_CLOCK_HZ                      ((unsigned long)168000000)
#define configTICK_RATE_HZ                      ((TickType_t)1000)

/* 우선순위 */
#define configMAX_PRIORITIES                    5
#define configMINIMAL_STACK_SIZE                ((unsigned short)128)
#define configMAX_TASK_NAME_LEN                 16

/* 메모리 */
#define configTOTAL_HEAP_SIZE                   ((size_t)(64 * 1024))
#define configSUPPORT_DYNAMIC_ALLOCATION        1
#define configSUPPORT_STATIC_ALLOCATION         0

/* 기능 토글 */
#define configUSE_MUTEXES                       1
#define configUSE_RECURSIVE_MUTEXES             1
#define configUSE_COUNTING_SEMAPHORES           1
#define configUSE_TIMERS                        1
#define configUSE_QUEUE_SETS                    1
#define configUSE_TASK_NOTIFICATIONS            1

/* 타이머 데몬 */
#define configTIMER_TASK_PRIORITY               (configMAX_PRIORITIES - 1)
#define configTIMER_QUEUE_LENGTH                10
#define configTIMER_TASK_STACK_DEPTH            (configMINIMAL_STACK_SIZE * 2)

/* 후크 함수 (Hook) */
#define configUSE_IDLE_HOOK                     0
#define configUSE_TICK_HOOK                     0
#define configCHECK_FOR_STACK_OVERFLOW          2
#define configUSE_MALLOC_FAILED_HOOK            1

/* 디버그/추적 */
#define configGENERATE_RUN_TIME_STATS           0
#define configUSE_TRACE_FACILITY                1
#define configUSE_STATS_FORMATTING_FUNCTIONS    0

/* Cortex-M 인터럽트 */
#define configPRIO_BITS                         4
#define configLIBRARY_LOWEST_INTERRUPT_PRIORITY        0xF
#define configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY   5
#define configKERNEL_INTERRUPT_PRIORITY \
    (configLIBRARY_LOWEST_INTERRUPT_PRIORITY << (8 - configPRIO_BITS))
#define configMAX_SYSCALL_INTERRUPT_PRIORITY \
    (configLIBRARY_MAX_SYSCALL_INTERRUPT_PRIORITY << (8 - configPRIO_BITS))

/* SysTick과 PendSV, SVC 핸들러 이름 매핑 */
#define vPortSVCHandler         SVC_Handler
#define xPortPendSVHandler      PendSV_Handler
#define xPortSysTickHandler     SysTick_Handler

/* API 토글 — INCLUDE_xxx */
#define INCLUDE_vTaskPrioritySet            1
#define INCLUDE_uxTaskPriorityGet           1
#define INCLUDE_vTaskDelete                 1
#define INCLUDE_vTaskSuspend                1
#define INCLUDE_vTaskDelayUntil             1
#define INCLUDE_vTaskDelay                  1
#define INCLUDE_xTaskGetSchedulerState      1
#define INCLUDE_xQueueGetMutexHolder        1

#endif /* FREERTOS_CONFIG_H */
```

이 한 파일이 *어떤 API가 컴파일에 포함되는지*, *얼마나 많은 우선순위*, *얼마나 큰 heap*, *어떤 hook을 호출하는지*를 모두 결정합니다.

| 매크로 | 의미 | 흔한 값 |
|--------|------|---------|
| `configUSE_PREEMPTION` | 선점형 스케줄링 | 1 (대부분) |
| `configMAX_PRIORITIES` | 우선순위 단계 수 | 5~16 |
| `configMINIMAL_STACK_SIZE` | Idle task 스택 크기 (word 단위) | 128 |
| `configTOTAL_HEAP_SIZE` | FreeRTOS 힙 전체 크기 (byte) | 16K~256K |
| `configTICK_RATE_HZ` | tick 인터럽트 빈도 | 1000 (1ms) |
| `configUSE_TIMERS` | 소프트웨어 타이머 사용 | 1 |
| `configCHECK_FOR_STACK_OVERFLOW` | 스택 오버플로 검사 모드 | 1 또는 2 |

## 빌드 시 어떤 파일을 넣을지 — 최소 예제

GCC + Cortex-M4F + heap_4 + 소프트웨어 타이머 사용 시 *Makefile 발췌*입니다.

```makefile
FREERTOS_DIR  := ./FreeRTOS
PORT_DIR      := $(FREERTOS_DIR)/Source/portable/GCC/ARM_CM4F
MEMMANG_DIR   := $(FREERTOS_DIR)/Source/portable/MemMang

FREERTOS_SRC := \
    $(FREERTOS_DIR)/Source/tasks.c \
    $(FREERTOS_DIR)/Source/queue.c \
    $(FREERTOS_DIR)/Source/list.c \
    $(FREERTOS_DIR)/Source/timers.c \
    $(FREERTOS_DIR)/Source/event_groups.c \
    $(PORT_DIR)/port.c \
    $(MEMMANG_DIR)/heap_4.c

FREERTOS_INC := \
    -I$(FREERTOS_DIR)/Source/include \
    -I$(PORT_DIR) \
    -I./config              # 여기에 FreeRTOSConfig.h를 둠

CFLAGS += $(FREERTOS_INC)
```

빌드 후 *symbol 크기*를 보면 커널 전체가 *15~25 KB Flash*에 들어옵니다.

```bash
$ arm-none-eabi-size build/freertos.o
   text    data     bss     dec     hex filename
  19416       0      72   19488    4c20 build/freertos.o
```

`text`가 *Flash 사용량*, `bss`가 *내부 정적 변수의 RAM*입니다. Heap은 *별도*로 `configTOTAL_HEAP_SIZE`만큼 잡힙니다.

## 데모 vs 실제 프로젝트

`Demo/` 안의 프로젝트는 *시작점*이지 *복사해서 그대로 출시할 코드*가 아닙니다.

| 항목 | 데모 | 실제 프로젝트 |
|------|------|-------------|
| 태스크 | Blinky·Print 같은 *과시용* | 실제 비즈니스 로직 |
| `FreeRTOSConfig.h` | *모든 기능 ON* (테스트용) | 필요한 것만 ON |
| 스택 크기 | 넉넉히 (디버깅 위해) | 측정 후 줄이기 |
| heap | 보통 heap_4 | 요구사항에 맞춰 선택 |
| Hook | 다 켜둠 | stack overflow·malloc failed만 |
| 트레이스 | `configUSE_TRACE_FACILITY=1` | 필요 시만 (RAM 증가) |

데모를 *베이스로 시작*하되, 첫 작업은 *FreeRTOSConfig.h를 자기 시스템에 맞게 줄이는 것*입니다. *기본 데모의 heap이 그대로 production에 가서 RAM이 부족해진다*는 흔한 사고가 여기서 옵니다.

## 라이선스 — MIT (v10.4+)

FreeRTOS는 *v10.4부터 MIT 라이선스*입니다. 그 이전은 *modified GPL*이었고, GPL 계열 조항이 *상용 펌웨어 채택의 마찰*이 컸습니다. MIT로 바뀐 뒤 *상업적 사용·수정·재배포가 자유*이고, *유일한 조건*은 *저작권 표기 유지*입니다.

```text
MIT License

Copyright (C) 2020 Amazon.com, Inc. or its affiliates.  All Rights Reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, ...
```

상용 펌웨어에 넣을 때 *바이너리에 라이선스 텍스트를 넣지 않아도* 됩니다. 다만 *문서·about 화면 어딘가에 표기*하는 것이 관행입니다.

## LTS — Long Term Support

AWS가 후원하기 시작한 뒤 *FreeRTOS Kernel LTS*가 생겼습니다. 일반 릴리스가 *수시로 새 기능을 추가*하는 동안, LTS는 *보안·버그 수정만 받는* 안정 라인입니다.

| 라인 | 주기 | 누가 쓰나 |
|------|------|----------|
| 일반 (mainline) | 자주 | 신규 기능을 빠르게 따라가는 프로젝트 |
| LTS | 2년 유지보수 | 안전성이 중요한 양산 펌웨어 |

채택 기준이 단순합니다. *기능을 끝낼 수 있는 시점의 최신 LTS*를 골라 *2년간 그대로 가는 것*입니다. 그 사이 *mainline의 새 기능을 갖고 오고 싶으면* 별도 평가 후 cherry-pick합니다.

## 자주 하는 실수와 troubleshooting

| 증상 | 원인 | 해결 |
|------|------|------|
| 빌드는 되는데 link 시 undefined SVC_Handler | FreeRTOSConfig.h에서 매핑 안 함 | vPortSVCHandler를 SVC_Handler로 #define |
| HardFault가 vTaskStartScheduler 직후 | 스택 너무 작음·configCPU_CLOCK_HZ 틀림 | 스택 증가·CPU 클럭 재확인 |
| configMAX_SYSCALL_INTERRUPT_PRIORITY 미정의 | Cortex-M port에서 필수 | configPRIO_BITS와 함께 정의 |
| 프로젝트 두 곳에 FreeRTOSConfig.h가 있음 | include path 충돌 | 하나만 두고 path 정리 |
| heap_X.c를 두 개 포함 | multiple definition pvPortMalloc | 빌드 목록에서 하나만 남기기 |
| LTS 버전과 mainline 헤더 섞임 | ABI 불일치, 미묘한 crash | 한 라인만 일관되게 |
| configTICK_RATE_HZ 너무 높음 (10000+) | tick ISR overhead로 throughput 저하 | 1000Hz가 무난, 그 이상은 측정 후 결정 |

## 정리

- FreeRTOS의 커널은 *`Source/` 한 폴더*에 있고, *나머지는 데모·플러스 라이브러리*입니다.
- 칩 의존 부분은 *`Source/portable/<COMPILER>/<MCU>/`*에 격리됩니다. 새 칩 포팅은 `port.c`와 `portmacro.h`만 다룹니다.
- `FreeRTOSConfig.h`는 *프로젝트가 직접 만들어 include path에 둡니다*. 이 한 파일이 *기능 ON/OFF, 우선순위 수, heap 크기, hook* 등 모든 컴파일 타임 설정을 결정합니다.
- 빌드 시 *반드시 포함*할 파일은 `tasks.c·queue.c·list.c·port.c·heap_X.c`이고, *옵션*은 `timers.c·event_groups.c·stream_buffer.c`입니다.
- 데모는 *시작점*입니다. 그대로 production에 가져가지 말고 *FreeRTOSConfig.h부터 다듬는* 게 순서입니다.
- v10.4부터 *MIT 라이선스*라 상용 펌웨어에 자유롭게 들어갑니다. *저작권 표기*만 유지하면 됩니다.
- *LTS 라인*은 *2년 보안·버그 수정*을 보장합니다. 양산 펌웨어는 LTS가 안전합니다.

## 다음 편

[Ch 2: Heap Memory Management](/blog/embedded/rtos/freertos-mastering/chapter02-heap-memory)에서 *다섯 가지 heap 구현*을 비교합니다. *왜 표준 malloc을 안 쓰는지*, *heap_1이 자유 불가인 이유*, *heap_4의 fragmentation 해결*, *heap_5의 비인접 영역 통합*을 다룹니다.

## 관련 항목

- [Ch 2: Heap Memory Management](/blog/embedded/rtos/freertos-mastering/chapter02-heap-memory)
- [Ch 3: Task Management](/blog/embedded/rtos/freertos-mastering/chapter03-task-management)
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/00-preface) — 내부 구현 상세
- [ESP32-C3 Mastering Ch 10: FreeRTOS](/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos) — ESP-IDF가 감싼 FreeRTOS
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/00-preface) — 실전 레시피
- [원문 — FreeRTOS Kernel GitHub](https://github.com/FreeRTOS/FreeRTOS-Kernel)
- [원문 — FreeRTOS Documentation](https://www.freertos.org/Documentation/RTOS_book.html)
