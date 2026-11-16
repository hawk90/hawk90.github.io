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

이 글은 **FreeRTOS-Kernel V11.2.0**, commit `0adc196d4bd52a2d91102b525b0aafc1e14a2386`(2025-03-04)을 기준으로 합니다. 이 태그에서 `wc -l`로 센 줄 수(주석 포함)는 `tasks.c` 8861, `queue.c` 3387, `timers.c` 1343, `list.c` 248, `portable/GCC/ARM_CM4F/port.c` 907줄입니다. 저장소 루트의 C 파일 7개를 합친 줄 수에서 `tasks.c` 하나가 절반을 넘고, 그 안에 `#if` 분기가 함수 한 줄 단위로 박혀 있어 처음 열면 어디부터 읽어야 할지 막막합니다. 낯선 도시에서 지도 없이 골목부터 걷는 것과 비슷합니다.

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
│   ├── ThirdParty/GCC/Posix/      # Linux 위에서 도는 port
│   └── MemMang/                   # heap_1 ~ heap_5
├── CMakeLists.txt
└── LICENSE.md
```

읽는 순서는 `FreeRTOS.h` → `list.c` → `tasks.c` → `queue.c` → `portable/<your-arch>/port.c`가 자연스럽습니다. `list.c`를 먼저 보는 이유는 ready list와 wait list의 모든 연결이 같은 자료구조 위에 얹혀 있기 때문입니다.

## tasks.c — 스케줄러 본체

`tasks.c`의 출발점은 지금 돌고 있는 task를 가리키는 포인터 하나입니다.

```c
/* tasks.c:462 (configNUMBER_OF_CORES == 1) */
portDONT_DISCARD PRIVILEGED_DATA TCB_t * volatile pxCurrentTCB = NULL;
```

SMP 빌드에서는 바로 아래 `:467`의 `pxCurrentTCBs[configNUMBER_OF_CORES]` 배열이 대신 쓰입니다(4-07). 단일 core의 context switch는 결국 이 포인터를 바꾸고, 새 TCB 안의 `pxTopOfStack`을 PSP로 옮기는 일입니다.

TCB는 `tasks.c:374-454`의 `tskTaskControlBlock`입니다. 아래는 주요 필드만 원문 순서대로 고른 발췌이고(affinity·SMP·trace 등 조건부 필드는 생략), 주석은 줄였습니다.

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

`pxTopOfStack`이 *반드시 첫 필드*여야 합니다. 원문 주석(`tasks.c:376`)이 "THIS MUST BE THE FIRST MEMBER OF THE TCB STRUCT"라고 대문자로 적습니다. 이유는 어셈블리에 있습니다. 3-09에서 ARM_CM4F로 빌드한 ELF의 PendSV handler를 objdump하면, `pxCurrentTCB`(`0x20000108`)를 읽은 뒤 offset 0에 SP를 저장하고 다시 offset 0에서 읽습니다.

```text
    3fe8:	4b13      	ldr	r3, [pc, #76]	@ (4038 <xPortPendSVHandler+0x58>)
    3fea:	681a      	ldr	r2, [r3, #0]
    3ff6:	e920 4ff0 	stmdb	r0!, {r4, r5, r6, r7, r8, r9, sl, fp, lr}
    3ffa:	6010      	str	r0, [r2, #0]
    400e:	f7fd fc0b 	bl	1828 <vTaskSwitchContext>
    401c:	6819      	ldr	r1, [r3, #0]
    401e:	6808      	ldr	r0, [r1, #0]
    4038:	20000108 	.word	0x20000108
```

`str r0, [r2, #0]`와 `ldr r0, [r1, #0]`의 `#0`이 C 구조체의 첫 필드 offset입니다. 필드 순서를 바꾸면 이 어셈블리는 다른 필드를 SP로 읽습니다.

ready list는 priority별로 분리되어 있습니다.

```c
PRIVILEGED_DATA static List_t pxReadyTasksLists[configMAX_PRIORITIES];
```

priority별 ready list를 사용합니다. 같은 priority의 순환 선택과 tick time slicing·yield·preemption 정책을 구분합니다. 비트맵은 port-optimized selection을 사용하는 config의 경로입니다.

`configUSE_PORT_OPTIMISED_TASK_SELECTION 1`이면 `uxTopReadyPriority`를 priority별 bit로 쓰고, 가장 높은 bit를 CLZ로 찾습니다. ARM_CM4F `portmacro.h`의 실제 정의입니다.

```c
/* portable/GCC/ARM_CM4F/portmacro.h:166, :171 */
#define portRECORD_READY_PRIORITY( uxPriority, uxReadyPriorities )    ( uxReadyPriorities ) |= ( 1UL << ( uxPriority ) )
#define portGET_HIGHEST_PRIORITY( uxTopPriority, uxReadyPriorities )    uxTopPriority = ( 31UL - ( uint32_t ) ucPortCountLeadingZeros( ( uxReadyPriorities ) ) )
```

`ucPortCountLeadingZeros()`(`:151`)가 `clz` 명령을 쓰는 inline 함수입니다. 32-bit bitmap이라 이 경로에서는 priority가 32개를 넘을 수 없고, bitmap이 0이면 CLZ가 32를 돌려 결과가 -1이 되므로 idle task가 항상 ready라는 전제 위에서 동작합니다. 이 harness의 config는 이 옵션을 켜지 않아 generic C 선택 경로를 썼습니다.

## xTaskCreate부터 PendSV까지

task 하나가 만들어져 처음 실행되기까지 지나가는 함수들입니다. 줄 번호는 V11.2.0 기준입니다.

| 단계 | V11.2.0의 확인 지점 | 빠뜨리면 생기는 오해 |
|---|---|---|
| 생성 | `xTaskCreate()`(`tasks.c:1740`) → `prvCreateTask()`(`:1642`) | stack/TCB 할당 실패와 해제 경로 |
| 초기화 | `prvInitialiseNewTask()`(`:1815`) → `pxPortInitialiseStack()`(`:1974`/`:1978`) | 첫 frame을 만들고 그 주소를 `pxTopOfStack`에 저장 |
| ready 등록 | `prvAddNewTaskToReadyList()` | scheduler가 이미 돌고 있으면 그 자리에서 선점 |
| 첫 실행 | xPortStartScheduler → prvPortStartFirstTask → SVC | 첫 task를 반드시 첫 PendSV가 시작한다고 오해 |
| 이후 switch | xPortPendSVHandler → vTaskSwitchContext | IRQ mask·ABI·FP frame·scheduler suspended 경로 누락 |

**ARM_CM4F의 initial frame에는 R0 아래에 EXC_RETURN slot이 하나 더 있습니다.** `pxPortInitialiseStack()`(`port.c:205-230`)은 xPSR·PC·LR·R12·R3~R1·R0를 쌓은 뒤 `portINITIAL_EXC_RETURN`(`0xfffffffd`, `:93`)을 한 칸 넣고(`:226`), R11~R4 자리 8칸을 비워 둡니다(`:228`). 위 PendSV 어셈블리가 그 이유를 보여 줍니다. `stmdb r0!, {r4-r11, lr}`로 9 word를 저장하고 `ldmia.w r0!, {r4-r11, lr}`로 9 word를 복원하므로, 처음 만든 frame도 같은 9 word 모양이어야 합니다. 복원된 `lr`(EXC_RETURN)의 bit 4가 0이면 `vldmiaeq`로 FPU register S16~S31도 복원합니다.

같은 어셈블리에서 `vTaskSwitchContext()`를 부르기 전에 BASEPRI를 `0x40`(이 harness의 `configMAX_SYSCALL_INTERRUPT_PRIORITY`)으로 올리고, 돌아온 뒤 0으로 내립니다. 예전 판에 있던 `cpsid f`가 들어간 재구성 어셈블리는 upstream 코드에 없어 지웠습니다. [Cortex-M context](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)와 [포팅 검증](/blog/embedded/rtos/practical-internals/part5-04-porting)에서 frame과 검증 범위를 이어갑니다. switch 시간은 재지 않았습니다.

## queue.c — 하나의 구현으로 세 가지 IPC

`Queue_t`의 `u`는 queue용 `QueuePointers_t`(`pcTail`, `pcReadFrom`)와 semaphore용 `SemaphoreData_t`(mutex holder, recursive count)의 union입니다(`queue.c:68-72`, `:103-140`). 같은 구조체 하나가 쓰임에 따라 둘 중 하나로 해석됩니다.

binary semaphore는 item size 0, 길이 1인 queue이고, counting semaphore는 길이가 최대 count인 queue입니다. mutex는 여기에 holder 기록과 priority inheritance 경로가 붙습니다(3-05). send·receive가 block하는 경로는 scheduler suspend, queue lock, 조건 재검사, timeout 계산, event list 등록, yield가 한 loop에 묶여 있어서 짧게 요약하면 빠지는 단계가 생깁니다. [Queue 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)에서 QEMU 실행과 함께 따라갔습니다.

## port.c — 아키텍처 경계

이 글의 ARM_CM4F port에서 다음 항목을 확인합니다. 다른 ISA·MPU·SMP port로 일반화하지 않습니다.

- `pxPortInitialiseStack()`의 첫 frame(위 절), 그리고 `xPortStartScheduler()`가 priority bit를 세고 PendSV·SysTick priority를 가장 낮게 두는 과정(3-09).
- `xPortSysTickHandler()`는 `xTaskIncrementTick()`을 부르고 그 반환값이 참이면 PendSV를 pending시킵니다. 지연된 task는 task별 countdown이 아니라 깰 tick 순으로 정렬된 delayed list에 있습니다(2-02).
- `portmacro.h`의 `portYIELD()`·`ulPortRaiseBASEPRI()`·`vPortSetBASEPRI()`(3-09).
- `xPortPendSVHandler()`의 저장·복원(위 objdump).

BASEPRI는 그 값과 같거나 숫자가 큰(덜 긴급한) IRQ를 막습니다. 더 긴급한 IRQ는 FreeRTOS critical section 안에서도 들어오므로 FreeRTOS API를 부르면 안 됩니다(3-09의 `port.c:888` assert).

## 흥미로운 세 곳

이 시리즈에서 소스를 따라가다 실행으로 확인한 지점 셋을 모으면 이렇습니다.

- **PI는 한 단계만 전파됩니다.** `xTaskPriorityInherit()`가 blocked holder의 priority만 바꾸고 그 너머로 재귀하지 않아, block 순서에 따라 chain이 전파되기도 하고 안 되기도 했습니다(3-05).
- **event group의 clear는 순회 뒤입니다.** `xEventGroupSetBits()`가 clear를 모아 뒀다가 한 번에 해서 같은 bit를 기다리던 task가 모두 깨어났습니다(3-08).
- **batching buffer는 trigger와 같은 양에서 깨우고 0을 돌려줍니다.** 깨우는 조건(`>=`)과 읽는 조건(`>`)이 한 byte 어긋나 있었습니다(3-11).

## SMP — FreeRTOS 11

V11.2.0 SMP 빌드는 `pxCurrentTCBs[]` 배열과 `portGET_CORE_ID()`, 공유 ready list, task lock·ISR lock을 씁니다. 이 태그에서 SMP를 지원하는 port는 RP2040·XCOREAI·CCRH F1Kx 셋뿐입니다. [SMP 설명](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)에서 자세히 다뤘습니다.

## 빌드 — CMake 모듈로 묶기

V11.2.0의 `CMakeLists.txt`는 `freertos_config` target이 없으면 멈춥니다(`CMakeLists.txt:19-22`). 그래서 이 target을 `add_subdirectory()`보다 먼저 정의합니다. port와 heap도 명시합니다. 다음은 kernel 경로를 command line으로 받는 POSIX port용 최소 project입니다.

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

이 파일을 Debian 13 arm64 guest(cmake 3.31.6, gcc 14.2.0)에서 그대로 썼습니다. `config/FreeRTOSConfig.h`와, producer가 길이 1 queue에 1·2·3을 넣고 consumer가 받을 때마다 10 tick 쉬는 `main.c`를 더했습니다.

```text
cfg=0
build=0
consumer got 1 at tick 0
consumer got 2 at tick 10
consumer got 3 at tick 20
exit=0
```

`freertos_config` 정의 두 줄을 지우고 다시 configure하면 그 자리에서 멈춥니다.

```text
CMake Error at /root/freertos/CMakeLists.txt:22 (message):
   freertos_config target not specified.  Please specify a cmake target that defines the include directory for FreeRTOSConfig.h:
```

POSIX port의 tick은 Linux 시간 위에서 흐르므로 MCU에서의 timing과는 다릅니다.

## 자주 보는 함정

- 블로그나 책의 "재구성한" TCB·PendSV 코드를 원문으로 믿습니다. 태그를 정하고 `tasks.c`와 objdump로 대조합니다.
- CM3 port의 initial frame을 CM4F에 가져갑니다. CM4F에는 EXC_RETURN slot이 하나 더 있습니다.
- heap_1에서 task를 지우면 메모리가 새는 것으로 봅니다. `configASSERT`가 켜져 있으면 `vPortFree()`의 assert에서 멈춥니다(4-02).
- `freertos_config` target을 `add_subdirectory()` 뒤에 정의합니다. configure가 멈춥니다.

## 정리

- V11.2.0에서 `tasks.c`는 8861줄, `queue.c`는 3387줄, CM4F `port.c`는 907줄입니다.
- `pxTopOfStack`이 TCB 첫 필드인 이유는 PendSV가 offset 0으로 SP를 읽고 쓰기 때문입니다(objdump로 확인).
- CM4F initial frame은 PendSV가 저장·복원하는 9 word(R4~R11 + EXC_RETURN) 모양을 미리 만들어 둡니다.
- 최적화된 task 선택은 32-bit bitmap과 CLZ를 씁니다.
- CMake 빌드는 `freertos_config` target을 먼저 정의해야 하고, POSIX port로 Linux에서 바로 돌려 볼 수 있습니다.

## 근거 자료

- [V11.2.0 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c), [queue.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/queue.c).
- [ARM_CM4F port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c), [portmacro.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/portmacro.h), [CMake](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/CMakeLists.txt). 본문 줄 번호는 이 태그 기준입니다.



다음 편은 [5-02 Zephyr 커널 분석](/blog/embedded/rtos/practical-internals/part5-02-zephyr-source)에서 devicetree와 driver model 위에서 동작하는 더 큰 RTOS를 봅니다.

## 관련 항목

- [2-01: Ready List](/blog/embedded/rtos/practical-internals/part2-01-ready-list)
- [2-05: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [3-02: Semaphore 구현](/blog/embedded/rtos/practical-internals/part3-02-semaphore-impl)
- [3-07: Queue 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)
- [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [5-04: RTOS 포팅 가이드](/blog/embedded/rtos/practical-internals/part5-04-porting)
