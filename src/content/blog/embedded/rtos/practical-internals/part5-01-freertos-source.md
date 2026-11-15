---
title: "FreeRTOS 소스 분석 — tasks.c·queue.c·port.c 추적"
slug: "embedded/rtos/practical-internals/part5-01-freertos-source"
date: 2026-05-08T09:46:00
description: "FreeRTOS-Kernel 저장소의 핵심 파일 셋을 따라가며 xTaskCreate부터 PendSV까지의 흐름을 정리합니다. TCB·ready list·port 계층 사이의 경계가 어떻게 그어져 있는지 source 수준에서 살펴봅니다."
series: "Practical RTOS Internals"
seriesOrder: 46
tags: [freertos, source-analysis, tasks, queue, port]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> 세 파일을 출발점으로 읽되 config·header·port와 호출자를 함께 추적합니다. — `tasks.c`가 스케줄러, `queue.c`가 IPC, `port.c`가 아키텍처 경계입니다.

## 어떤 문제를 푸는가

이 글은 **FreeRTOS-Kernel V11.2.0**, commit 0adc196d4bd52a2d91102b525b0aafc1e14a2386을 기준으로 합니다. LoC는 포함 파일·config·comment 계산법에 따라 달라 고정된 전체 크기로 비교하지 않습니다. 그래도 처음 소스를 열면 어디부터 읽어야 할지 막막합니다. 파일 수십 개, 매크로 수백 개, `#if` 분기가 함수 한 줄 단위로 박혀 있습니다.

이 글의 목표는 *세 핵심 파일*만 골라 읽는 길을 만드는 것입니다. `tasks.c`에서 스케줄러의 자료구조와 진입점을 따라가고, `queue.c`에서 큐·세마포어·뮤텍스가 같은 구현을 공유하는 모습을 보고, `port.c`에서 아키텍처에 의존하는 경계가 어디까지인지 확인합니다. 이 흐름을 한 번 잡아 두면 SMP, MPU, tickless 같은 확장 옵션도 같은 지도 위에서 자연스럽게 읽힙니다.

저장소는 `github.com/FreeRTOS/FreeRTOS-Kernel`입니다. 커널만 분리되어 있어 빌드 시스템과 BSP에 끌려다니지 않고 본체만 읽기 좋습니다.

## 저장소 구조와 진입점

```text
FreeRTOS-Kernel/
├── include/                       # public API
│   ├── FreeRTOS.h                 # 모든 컴파일 단위의 시작
│   ├── task.h
│   ├── queue.h
│   └── semphr.h
├── tasks.c                        # 스케줄러 본체
├── queue.c                        # 큐·세마포어·뮤텍스 통합
├── timers.c                       # software timer
├── event_groups.c
├── stream_buffer.c
├── list.c                         # 양방향 list 자료구조
├── portable/                      # 아키텍처별 port
│   ├── GCC/ARM_CM4F/
│   ├── GCC/ARM_CM33_NTZ/non_secure/
│   ├── GCC/RISC-V/
│   └── MemMang/                   # heap_1 ~ heap_5
└── License/
```

읽는 순서는 `FreeRTOS.h` → `list.c` → `tasks.c` → `queue.c` → `portable/<your-arch>/port.c`가 자연스럽습니다. `list.c`를 먼저 보는 이유는 ready list와 wait list의 모든 연결이 같은 자료구조 위에 얹혀 있기 때문입니다.

## tasks.c — 스케줄러 본체

`tasks.c`의 첫 줄에 가까운 곳에 *모든 것*의 출발점이 있습니다.

```c
PRIVILEGED_DATA TCB_t * volatile pxCurrentTCB = NULL;
```

위는 single-core 조건의 설명입니다. SMP에서는 current TCB 배열과 선택 경로가 다릅니다. 컨텍스트 스위치는 결국 이 포인터를 바꾸고 그 안의 `pxTopOfStack`을 새 PSP로 옮기는 일입니다.

TCB는 task 상태를 담습니다. 아래는 주요 필드만 고른 설명용 발췌이며 실제 config별 전체 layout은 tasks.c를 따릅니다.

```c
typedef struct tskTaskControlBlock {
    volatile StackType_t * pxTopOfStack;   /* MUST be first */

    #if (portUSING_MPU_WRAPPERS == 1)
    xMPU_SETTINGS xMPUSettings;
    #endif

    ListItem_t  xStateListItem;            /* ready/delay/suspend */
    ListItem_t  xEventListItem;            /* queue/semaphore wait */
    UBaseType_t uxPriority;
    StackType_t *pxStack;
    char        pcTaskName[configMAX_TASK_NAME_LEN];

    #if (configUSE_MUTEXES == 1)
    UBaseType_t uxBasePriority;            /* PI base */
    UBaseType_t uxMutexesHeld;
    #endif
    /* ... 다른 필드 */
} tskTCB;
```

`pxTopOfStack`이 *반드시 첫 필드*여야 합니다. 컨텍스트 스위치 어셈블리가 TCB 포인터를 받으면 offset 0에서 SP를 꺼내고 새 SP를 다시 그 자리에 저장합니다. 이 필드를 옮기면 어셈블리와 C 구조가 어긋나면서 첫 스위치 직후 모든 task가 깨집니다.

ready list는 priority별로 분리되어 있습니다.

```c
PRIVILEGED_DATA static List_t pxReadyTasksLists[configMAX_PRIORITIES];
```

priority별 ready list를 사용합니다. 같은 priority의 순환 선택과 tick time slicing·yield·preemption 정책을 구분합니다. 비트맵은 port-optimized selection을 사용하는 config의 경로입니다.

```c
#if (configUSE_PORT_OPTIMISED_TASK_SELECTION == 1)
    static volatile UBaseType_t uxTopReadyPriority;
#endif

#define portRECORD_READY_PRIORITY(uxPriority, uxTopReadyPriority) \
    (uxTopReadyPriority) |= (1U << (uxPriority))
#define portGET_HIGHEST_PRIORITY(uxTopPriority, uxReadyPriorities) \
    uxTopPriority = (31U - __CLZ(uxReadyPriorities))
```

이 절의 macro는 bitmap 개념 설명이며 실제 ARM_CM4F portmacro.h와 비교합니다. 32-bit bitmap·지원 priority 범위·nonzero 조건과 config를 확인하고 전체 scheduler 비용을 CLZ 한 명령의 cycle로 환산하지 않습니다.

## xTaskCreate부터 PendSV까지

실제 소스를 읽을 때 다음 순서로 함수와 실패 경로를 대조합니다. 복사 가능한 대체 kernel 구현은 아닙니다.

| 단계 | V11.2.0의 확인 지점 | 빠뜨리면 생기는 오해 |
|---|---|---|
| 생성 | xTaskCreate → prvCreateTask | stack/TCB 실패·해제·stack depth 산술을 무시 |
| 초기화 | prvInitialiseNewTask → pxPortInitialiseStack | 할당한 stack이 TCB와 연결되지 않은 의사 코드 |
| ready 등록 | prvAddNewTaskToReadyList | scheduler 실행 여부·preemption을 무시 |
| 첫 실행 | xPortStartScheduler → prvPortStartFirstTask → SVC | 첫 task를 반드시 첫 PendSV가 시작한다고 오해 |
| 이후 switch | xPortPendSVHandler → vTaskSwitchContext | IRQ mask·ABI·FP frame·scheduler suspended 경로 누락 |

**ARM_CM4F의 initial frame에는 R4–R11 다음 EXC_RETURN slot이 있어야 합니다.** V11.2.0은 R0 아래에 portINITIAL_EXC_RETURN을 저장한 뒤 8 register 공간을 남깁니다. 이 slot을 빼면 PendSV/SVC의 복원 순서와 맞지 않습니다. PC의 Thumb 주소 bit 처리·xPSR와 task return error 경로도 실제 port를 따릅니다.

PendSV는 task의 R4–R11/EXC_RETURN과 조건부 S16–S31을 저장합니다. scheduler 호출 전 BASEPRI를 설정하고 ABI에 맞게 MSP를 사용합니다. FAULTMASK를 켜는 cpsid f와 single-word push를 넣은 기존 재구성 assembly는 upstream 구현이 아니므로 사용하지 않습니다. [Cortex-M context](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)와 [포팅 검증](/blog/embedded/rtos/practical-internals/part5-04-porting)에서 frame과 검증 범위를 이어갑니다.

30–50 cycle 같은 switch 시간은 이 source tour에서 측정하지 않았습니다.

## queue.c — 하나의 구현으로 세 가지 IPC

Queue_t는 queue data pointer를 가진 QueuePointers_t와 mutex holder/recursive count를 가진 SemaphoreData_t의 union을 사용합니다. pcReadFrom 하나와 recursive count 하나만의 union으로 대체하면 실제 field layout을 설명하지 못합니다.

binary semaphore는 item size 0·최대 count 1, counting semaphore는 지정한 최대 count를 사용합니다. mutex는 소유자와 priority inheritance 경로가 더해집니다. 관련 symbol은 xQueueGenericSend, xQueueReceive, xQueueSemaphoreTake와 prvCopyDataToQueue에서 따라갑니다.

blocking send는 단순 critical 안에서 event list를 등록하는 loop 하나가 아닙니다. scheduler suspend·queue lock·조건 재검사·timeout bookkeeping·event list·resume/yield가 함께 필요합니다. 실제로 빼먹은 코드를 source 전체처럼 제시하지 않습니다. [Queue 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)의 실제 API 검증으로 연결합니다.

## port.c — 아키텍처 경계

이 글의 ARM_CM4F port에서 다음 항목을 확인합니다. 다른 ISA·MPU·SMP port로 일반화하지 않습니다.

- pxPortInitialiseStack의 task 첫 frame과 xPortStartScheduler/prvPortStartFirstTask의 시작 조건.
- xPortSysTickHandler의 tick 증가와 PendSV 요청. delayed list는 단순 task별 countdown array가 아닙니다.
- portmacro.h의 portYIELD·vPortRaiseBASEPRI·critical nesting·FromISR mask save/restore.
- xPortPendSVHandler의 저장/복원, FP 조건과 configMAX_SYSCALL_INTERRUPT_PRIORITY.

BASEPRI는 priority encoding에서 threshold와 같거나 수치가 큰, 즉 덜 긴급한 IRQ를 mask합니다. 더 긴급한 IRQ에는 해당 FreeRTOS API 제한이 있으며, mask를 통과한다는 사실만으로 shared bus/다른 IRQ 간섭이나 timing 영향이 없어지지는 않습니다.

## 흥미로운 세 곳

소스 탐색에서는 선언과 호출자를 왕복합니다. 예를 들어 allocation failure가 반환값으로 어떻게 전달되는지, wake가 어느 list를 바꾸는지, scheduler suspended 상태에서 무엇이 pending되는지를 함께 봅니다. 자료구조 그림만으로 실행 조건을 확정하지 않습니다.

## SMP — FreeRTOS 11

V11.2.0의 SMP 조건에는 pxCurrentTCBs 배열과 portGET_CORE_ID 기반 접근, 공유 priority별 ready list와 task/ISR port lock이 있습니다. 배열 매크로 하나만 추가하면 단일 core port가 SMP가 되는 것은 아닙니다. [SMP 설명](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)의 affinity·port 계약을 함께 확인합니다.

## 빌드 — CMake 모듈로 묶기

V11.2.0의 CMake는 freertos_config target을 **add_subdirectory 이전에** 요구합니다. port와 heap 선택도 명시합니다. 다음은 kernel source를 command-line 경로로 받은 POSIX host 검사용 최소 project입니다.

```cmake title="freertos-tour-CMakeLists.txt"
cmake_minimum_required(VERSION 3.20)
project(freertos_tour C)
if(NOT FREERTOS_SOURCE_DIR)
  message(FATAL_ERROR "Set FREERTOS_SOURCE_DIR to the pinned kernel")
endif()
add_library(freertos_config INTERFACE)
target_include_directories(freertos_config INTERFACE "${CMAKE_CURRENT_SOURCE_DIR}/config")
set(FREERTOS_PORT GCC_POSIX CACHE STRING "")
set(FREERTOS_HEAP 3 CACHE STRING "")
add_subdirectory("${FREERTOS_SOURCE_DIR}" kernel)
add_executable(tour main.c)
target_link_libraries(tour PRIVATE freertos_kernel)
```

FreeRTOSConfig.h와 main.c는 별도 application 입력입니다. 이 구성은 실제 CMake target 연결 검증에 사용하며 MCU firmware link/실행을 뜻하지 않습니다.

## 자주 보는 함정

- source tag와 config 없이 재구성한 field/assembly를 upstream 원문으로 제시하지 않습니다.
- initial frame·EXC_RETURN·port FPU/ABI 조건을 서로 다른 port에서 섞지 않습니다.
- configASSERT가 켜진 heap_1에서 non-NULL free는 assertion이므로 task 삭제를 단순 memory leak 실험처럼 취급하지 않습니다.
- port 선택·heap·freertos_config target 정의 순서와 실제 생성/대기 실패 경로를 검사합니다.

## 정리

- source tour는 tasks/queue/port의 경계와 호출·실패 경로를 함께 읽는 지도입니다.
- single-core·SMP·MPU·optimized-selection 조건을 구분합니다.
- 첫 task의 SVC와 이후 PendSV, initial frame의 EXC_RETURN을 맞춥니다.
- source·object 검사는 target timing·IRQ/FP 실행 검증과 구분합니다.

## 근거 자료

- [V11.2.0 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c), [queue.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c).
- [ARM_CM4F port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c), [portmacro.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/portmacro.h), [CMake](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/CMakeLists.txt).



다음 편은 [5-02 Zephyr 커널 분석](/blog/embedded/rtos/practical-internals/part5-02-zephyr-source)에서 devicetree와 driver model 위에서 동작하는 더 큰 RTOS를 봅니다.

## 관련 항목

- [2-01: Ready List](/blog/embedded/rtos/practical-internals/part2-01-ready-list)
- [2-05: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [3-02: Semaphore 구현](/blog/embedded/rtos/practical-internals/part3-02-semaphore-impl)
- [3-07: Queue 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)
- [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [5-04: RTOS 포팅 가이드](/blog/embedded/rtos/practical-internals/part5-04-porting)
