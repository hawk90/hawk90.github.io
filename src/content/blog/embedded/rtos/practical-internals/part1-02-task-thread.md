---
title: "Task와 Thread 개념 — TCB·상태 머신·생명 주기 분석"
date: 2026-05-04T09:02:00
description: "Task는 stack과 TCB, 상태로 구성됩니다. 5상태 머신(Running·Ready·Blocked·Suspended·Deleted)과 그 전이를 다룹니다."
series: "Practical RTOS Internals"
seriesOrder: 2
tags: [rtos, task, tcb, state-machine, lifecycle]
draft: false
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

FreeRTOS의 `TCB_t` 발췌:

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

핵심은 **pxTopOfStack**이 *context switch의 모든 것*이라는 점입니다. 다른 task로 전환할 때 *현재 task의 모든 레지스터*를 그 stack에 push하고, 다음 task의 *pxTopOfStack에서 pop*합니다.

## Stack — Task별 독립

각 task가 *자기 stack*을 보유합니다. 보통 256-2048 byte입니다. 함수 호출 깊이, 로컬 변수, ISR 시 자동 push되는 레지스터를 모두 담습니다.

```c
void pid_task(void *arg) {
    int local_var = 0;        // stack에
    update();                 // 함수 호출 → return address stack에
    ...
}

// 생성 시 stack size 명시
xTaskCreate(pid_task, "PID", 256, NULL, 3, NULL);
//                            ^^^
//                            256 × sizeof(StackType_t) = 1 KB (32-bit)
```

> ⚠️ **Stack overflow**가 임베디드 디버깅의 80%를 차지합니다. Canary, MPU, configCHECK_FOR_STACK_OVERFLOW를 활용합니다.

## Task State — 5 상태 머신

![Task 5-state machine](/images/blog/practical-internals/diagrams/part1-02-task-states.svg)

| State | 의미 |
| --- | --- |
| **Running** | *지금 CPU 차지*. 한 코어당 *정확히 1개*입니다. |
| **Ready** | 실행 가능, CPU 대기 (scheduler가 골라줘야 합니다) |
| **Blocked** | 이벤트 대기 (semaphore·queue·delay·notification) |
| **Suspended** | 명시적 vTaskSuspend. scheduler가 *고려하지 않습니다*. |
| **Deleted** | vTaskDelete. TCB만 살아있고 idle task가 정리합니다. |

### 전이 — 누가 트리거하나

| 전이 | 트리거 |
| --- | --- |
| Ready → Running | Scheduler (preemption 또는 yield 시) |
| Running → Ready | Higher-priority task ready 됨 (preempted) |
| Running → Blocked | task 자신이 wait API 호출 |
| Running → Suspended | 다른 task가 vTaskSuspend() |
| Blocked → Ready | 이벤트 발생 (semaphore give, queue send, timeout) |
| Suspended → Ready | vTaskResume() |
| 모두 → Deleted | vTaskDelete() — 자기 또는 다른 task가 호출 |

> 💡 **Running → Blocked는 자발적이고, Running → Ready는 강제적입니다.** 둘은 본질적으로 다릅니다.

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
1. TCB를 할당합니다 (heap_X 또는 static).
2. Stack을 할당합니다.
3. Stack에 *가짜 context* (return address = pid_task 등)를 쌓습니다.
4. Ready list에 추가합니다.
5. 만약 새 task가 *더 높은 priority*면 즉시 preempt합니다.

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

    /* 도달 안 함. 도달하면 *반드시 vTaskDelete()*. */
    vTaskDelete(NULL);
}
```

> ⚠️ **task 함수에서 return 하면 *RTOS가 충돌*합니다.** 명시적 `vTaskDelete(NULL)` 또는 무한루프를 사용합니다.

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

다른 모든 task가 Blocked나 Suspended일 때만 실행됩니다. priority는 **0**입니다. CPU sleep 모드 진입을 trigger합니다.

## Static vs Dynamic 할당

| | Static | Dynamic (heap) |
| --- | --- | --- |
| API | `xTaskCreateStatic` | `xTaskCreate` |
| 메모리 | 컴파일 타임 결정 | 런타임 heap_X에서 |
| Fragmentation | 없음 | 가능 |
| Code size | 약간 작음 | malloc 코드 포함 |
| 안전 인증 | 선호 (MISRA·DO-178C) | 회피 |

Safety-critical (자동차·항공·의료) 분야는 **static**을 선호하고, 일반 IoT는 **dynamic**이 흔합니다.

## Thread vs Task — 용어 차이

RTOS 세계의 *전통적 용어*는 **task**입니다. POSIX, Zephyr, 일부 자료에서는 **thread**를 씁니다.

| 용어 | 사용처 |
| --- | --- |
| **Task** | FreeRTOS, ThreadX, MicroC/OS, VxWorks |
| **Thread** | Zephyr, POSIX (pthread), Windows |
| **Process** | Linux (별도 메모리 공간) |

본질은 같습니다. 독립 stack과 공유 메모리를 가집니다. *Linux의 Process*만 격리된 메모리를 가집니다.

## 자주 하는 실수

> ⚠️ Stack 너무 작음

256 word (1 KB)는 *대부분 충분*하지만, 큰 로컬 배열, printf, 재귀를 사용하면 *오버플로*가 발생합니다. `uxTaskGetStackHighWaterMark()`로 사용량을 측정합니다.

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
- Stack overflow는 임베디드 디버깅 1위 원인입니다. canary와 MPU가 필수입니다.

다음 편에서는 **스케줄링 알고리즘**을 다룹니다. Round Robin, Priority-based, EDF, Rate Monotonic을 살펴봅니다.

## 관련 항목

- [1-01: RTOS가 필요한 이유](/blog/embedded/rtos/practical-internals/part1-01-why-rtos)
- [1-03: 스케줄링 알고리즘](/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms)
- [2-04: Context Switch 원리](/blog/embedded/rtos/practical-internals/part2-04-context-switch)
