---
title: "Task와 Thread 개념 — TCB·상태 머신·생명 주기 분석"
slug: "embedded/rtos/practical-internals/part1-02-task-thread"
date: 2026-05-04T09:02:00
description: "Task는 stack과 TCB, 상태로 구성됩니다. 5상태 머신(Running·Ready·Blocked·Suspended·Deleted)과 그 전이를 다룹니다."
series: "Practical RTOS Internals"
seriesOrder: 2
tags: [rtos, task, tcb, state-machine, lifecycle]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"Task = stack + TCB + state"입니다.** 세 가지가 갖춰지면 RTOS가 task로 인식합니다.

## Task의 본질 — 세 가지 구성

| 요소 | 역할 |
| --- | --- |
| **Stack** | 함수 호출·로컬 변수·인터럽트 시 레지스터 저장 |
| **TCB** (Task Control Block) | 메타데이터 (state, priority, stack pointer, ...) |
| **State** | Running / Ready / Blocked / ... |

이 셋이 있으면 RTOS scheduler가 *교대로 실행*할 수 있습니다.

## TCB — Task Control Block

FreeRTOS V11.2.0 `tasks.c`의 주요 필드를 단순화한 설명입니다. 실제 선언은 MPU·SMP·추적·할당 설정별 조건부 필드를 포함하므로 아래 구조체를 kernel의 실제 ABI로 사용하지 않습니다. [고정 버전 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c)를 기준으로 확인합니다.

```c
typedef struct tskTaskControlBlock {
    volatile StackType_t *pxTopOfStack;     // 현재 스택 포인터
    ListItem_t xStateListItem;              // ready/blocked list에 link
    ListItem_t xEventListItem;              // event wait list에 link
    UBaseType_t uxPriority;                 // 현재 우선순위
    StackType_t *pxStack;                   // 스택 시작 주소
    char pcTaskName[configMAX_TASK_NAME_LEN];

    UBaseType_t uxBasePriority;             // 원래 우선순위 (PI 후 복원용)
    UBaseType_t uxMutexesHeld;              // 보유 mutex 수
    /* ... 기타 ... */
} tskTCB;
```

`pxTopOfStack`은 저장된 context를 찾는 핵심 필드입니다. 하지만 전환에는 ready 선택·interrupt mask·포트별 저장 규약도 필요합니다. Cortex-M에서는 예외 진입 시 하드웨어가 저장하는 frame과 PendSV에서 소프트웨어가 저장하는 레지스터를 구분하며 FPU 상태도 설정에 따라 달라집니다. 모든 레지스터를 매번 같은 코드가 push하는 것은 아닙니다.

## Stack — Task별 독립

각 task의 stack 크기는 호출 깊이·로컬 객체·라이브러리·포트별 exception frame을 분석하여 정합니다. Cortex-M의 handler stack과 task stack은 역할이 다르므로 모든 ISR 실행 중 stack을 task stack 사용량에 그대로 더하지 않습니다.

```c
void pid_task(void *arg) {
    int local_var = 0;        // stack에
    update();                 // ABI·최적화에 따라 LR 또는 stack 등에 return address 보관
    ...
}

// 생성 시 stack size 명시
xTaskCreate(pid_task, "PID", 256, NULL, 3, NULL);
//                            ^^^
//                            256 × sizeof(StackType_t) = 1 KB (32-bit)
```

`configCHECK_FOR_STACK_OVERFLOW`, canary·high-water mark·MPU는 서로 보완적입니다. 검출 시점과 탐지 범위가 다르며, 실제 최악 사용량이나 모든 overflow 검출을 자동 보증하지 않습니다. 근거 없는 장애 비율로 위험을 평가하지 않습니다.

## Task State — 5 상태 머신

![Task 5-state machine](/images/blog/practical-internals/diagrams/part1-02-task-states.svg)

| State | 의미 |
| --- | --- |
| **Running** | 해당 코어에서 선택된 task. ISR 실행 중에는 그 task의 명령 실행은 중단됩니다. |
| **Ready** | 실행 가능, CPU 대기 (scheduler가 골라줘야 합니다) |
| **Blocked** | 이벤트 대기 (semaphore·queue·delay·notification) |
| **Suspended** | 명시적 suspend 등으로 실행 후보에서 제외. 내부 suspended list와 공개 상태를 동일시하지 않습니다. |
| **Deleted** | 삭제·정리 단계. 자기 삭제의 동적 TCB/stack 정리는 idle로 지연될 수 있고, 실행 중이 아닌 다른 task 삭제는 바로 정리할 수 있습니다. |

### 전이 — 누가 트리거하나

| 전이 | 트리거 |
| --- | --- |
| Ready → Running | Scheduler (preemption 또는 yield 시) |
| Running → Ready | 고우선 task로 선점 또는 같은 우선순위로 yield/time slice |
| Running → Blocked | task 자신이 wait API 호출 |
| Running/Ready/Blocked → Suspended | 허용된 task 문맥에서 대상 suspend 또는 자기 suspend |
| Blocked → Ready | 이벤트 발생 (semaphore give, queue send, timeout) |
| Suspended → Ready | vTaskResume() |
| 유효한 task → Deleted | vTaskDelete() — 자기 또는 다른 task가 호출, cleanup 경로는 구성별 확인 |

> 💡 `taskYIELD()`에 의한 Running → Ready 전이도 자발적입니다. 반면 wait API를 호출해도 이벤트가 이미 있거나 timeout이0이면 block하지 않을 수 있습니다. 이 그림은 개념 전이이며 모든 내부 list 이동을 표현한 것은 아닙니다.

## Task 생성 — FreeRTOS 예

```c
TaskHandle_t pid_handle = NULL;

BaseType_t result = xTaskCreate(
    pid_task,               // 함수
    "PID",                  // 이름 (디버깅용)
    256,                    // stack size (words)
    NULL,                   // 함수에 전달할 인자
    3,                      // priority (0 = lowest)
    &pid_handle             // 핸들 (제어용)
);

if (result != pdPASS) {
    /* 메모리 부족 — heap 확인 */
}
```

이 *한 줄*에서 RTOS는 다음 일을 합니다.
1. `xTaskCreate`는 동적으로 TCB를 할당합니다. `xTaskCreateStatic`은 호출자가 제공한 저장 공간을 사용합니다.
2. Stack을 할당합니다.
3. 포트의 초기 context frame에 task 진입 PC·인자·task return 오류 경로 등을 준비합니다.
4. Ready list에 추가합니다.
5. scheduler가 실행 중이고 선점 설정·문맥이 허용하면 더 높은 우선순위 task로 전환할 수 있습니다. 생성 성공 여부도 반드시 검사합니다.

## Task 함수의 패턴

```c
void pid_task(void *arg) {
    /* 초기화 (1회) */
    init_pid();

    /* 메인 루프 */
    while (1) {
        wait_for_event();      // Blocked로 들어감
        process();             // Ready → Running
    }

    /* 이 무한루프에서는 도달하지 않음. 유한 작업이라면 종료 경로에서 호출. */
    vTaskDelete(NULL);
}
```

> ⚠️ FreeRTOS task entry는 return하지 않는 계약입니다. 위반 결과는 포트의 오류 handler/assert 등에 따라 다르므로 항상 같은 crash라고 단정하지 않습니다. 유한 task는 `vTaskDelete(NULL)`로 종료하고, 그 이후 핸들을 재사용하지 않습니다.

## Idle Task — 항상 존재하는 최저 우선순위 task

```c
void prvIdleTask(void *pvParameters) {
    while (1) {
        /* 1. Deleted task 정리 */
        prvCheckTasksWaitingTermination();
        /* 2. Tickless idle 진입 (저전력) */
        if (configUSE_TICKLESS_IDLE)
            portSUPPRESS_TICKS_AND_SLEEP(xExpectedIdleTime);
    }
}
```

단일 코어의 idle priority는 0입니다. ready task가 없을 때뿐 아니라 같은 우선순위 task와 설정에 따라 실행 기회를 나눌 수도 있습니다. tickless sleep은 예상 idle 시간과 sleep 허용 조건을 만족할 때 선택됩니다. 위 코드는 내부 구조를 보여주는 의사 코드이며 실제 idle loop 전체가 아닙니다.

## Static vs Dynamic 할당

| | Static | Dynamic (heap) |
| --- | --- | --- |
| API | `xTaskCreateStatic` | `xTaskCreate` |
| 메모리 | 컴파일 타임 결정 | 런타임 heap_X에서 |
| Fragmentation | 없음 | 가능 |
| Code size | 실제 사용 API·링크 결과로 확인 | allocator 선택과 이미 링크된 코드에 따라 다름 |
| 검증 항목 | 저장 공간 수명·용량·재사용 계약 | 최악 지연·실패 처리·fragmentation 계약 |

static 메모리도 task가 사용하는 동안 살아 있어야 합니다. 삭제 시 호출자 저장 공간이 heap처럼 free되지는 않으며, 재사용은 task가 더 이상 실행되지 않고 cleanup이 끝난 뒤에만 합니다. 할당 방식을 특정 인증 규정의 일괄 허용·금지로 판단하지 않습니다.

## Thread vs Task — 용어 차이

RTOS 세계의 *전통적 용어*는 **task**입니다. POSIX, Zephyr, 일부 자료에서는 **thread**를 씁니다.

| 용어 | 사용처 |
| --- | --- |
| **Task** | FreeRTOS, ThreadX, MicroC/OS, VxWorks |
| **Thread** | Zephyr, POSIX (pthread), Windows |
| **Process** | Linux (별도 메모리 공간) |

용어가 비슷해도 메모리 보호 계약은 같다고 가정하면 안 됩니다. RTOS에도 MPU/MMU 기반 보호 도메인이 있고, Linux thread는 같은 process 주소 공간을 공유하지만 process는 별도 주소 공간을 가질 수 있습니다. 실제 커널 구성으로 확인합니다.

## 자주 하는 실수

> ⚠️ Stack 너무 작음

32비트 StackType_t에서 256 words는 1 KiB라는 단위 변환일 뿐 충분성의 근거는 아닙니다. 큰 로컬 배열, printf, 재귀를 사용하면 *오버플로*가 발생합니다. `uxTaskGetStackHighWaterMark()`로 사용량을 측정합니다.

> ⚠️ Task에서 return

위에서 언급했듯이 **무한 루프 + delay**가 표준 패턴입니다.

> ⚠️ ISR에서 normal API 호출

ISR에서 `xQueueSend()`를 호출하면 데드락이나 크래시가 발생합니다. **FromISR 변종**을 사용합니다.

> ⚠️ Priority 인플레이션

모든 task를 high priority로 설정해도 의미가 없습니다. *task 간 상대적* 순서가 중요합니다.

## 정리

- Task는 **Stack과 TCB, State**로 구성됩니다.
- 5 상태가 있습니다 (Running, Ready, Blocked, Suspended, Deleted).
- 전이는 *자발적*(blocked) 또는 *강제적*(preempted)입니다.
- **Idle Task**가 항상 존재하여 tickless와 정리를 담당합니다.
- stack은 단위·포트별 frame·최악 호출 경로·실측 high-water mark와 검출 한계를 함께 확인합니다.

다음 편에서는 **스케줄링 알고리즘**을 다룹니다. Round Robin, Priority-based, EDF, Rate Monotonic을 살펴봅니다.

## 재현 — 공식 헤더의 단위와 생성 API 검사

아래는 FreeRTOS V11.2.0 ARM_CM4F 포트의 실제 헤더를 대상으로 한 **컴파일 검사**입니다. board startup·scheduler 실행 예제가 아닙니다. config에서 static/dynamic allocation과 `INCLUDE_xTaskDelayUntil`을 활성화해야 합니다. target별 stack 정렬과 충분한 깊이는 제품에서 별도 확인합니다.

```c title="task-api-check.c"
#include "FreeRTOS.h"
#include "task.h"
_Static_assert(sizeof(StackType_t) == 4, "this probe targets ARM_CM4F");
_Static_assert(sizeof(StackType_t[256]) == 1024, "words versus bytes");
#ifdef REQUIRE_ONE_MS
_Static_assert(pdMS_TO_TICKS(1) > 0, "1ms rounds to zero ticks");
#endif
static StaticTask_t tcb;
static StackType_t stack[256];
static void worker(void *arg) {
    (void)arg;
    for (;;) vTaskDelay(1);
}
BaseType_t create_dynamic(TaskHandle_t *out) {
    return xTaskCreate(worker, "worker", 256, NULL, 1, out);
}
TaskHandle_t create_static(void) {
    return xTaskCreateStatic(worker, "worker", 256, NULL, 1, stack, &tcb);
}
```

1 kHz tick에서 1 ms는 1 tick이지만 100 Hz에서는 0으로 절삭됩니다. `REQUIRE_ONE_MS`를 켠 후자를 컴파일하면 static assertion이 실패해야 합니다. 저장소의 `scripts/verify-rtos-fundamentals-examples.mjs`는 공식 헤더를 직접 사용하여 이 단위 검사와 생성 API 호출을 검사합니다. 생성 성공·실패의 런타임 검사는 포함하지 않습니다.

## 1차 자료와 검증 범위

- [FreeRTOS V11.2.0 tasks.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/tasks.c): `vTaskDelete`, `prvDeleteTCB`, `prvIdleTask`, `eTaskGetState`의 분기 확인
- [ARM_CM4F port.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/ARM_CM4F/port.c): `pxPortInitialiseStack`, PendSV context 규약

이 장의 TCB·idle 코드는 설명용 발췌입니다. 실제 ARM scheduler·stack overflow·ISR를 실행 측정한 예제가 아닙니다. task 생성과 단위는 공식 헤더로 컴파일 검사하고, 삭제·상태 전이는 위 고정 소스의 조건부 경로를 대조합니다.

## 관련 항목

- [1-01: RTOS가 필요한 이유](/blog/embedded/rtos/practical-internals/part1-01-why-rtos)
- [1-03: 스케줄링 알고리즘](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms)
- [2-04: Context Switch 원리](/blog/embedded/rtos/practical-internals/part2-04-context-switch)
