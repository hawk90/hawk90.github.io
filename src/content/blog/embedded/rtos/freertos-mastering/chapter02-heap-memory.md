---
title: "Ch 2: Heap Memory Management"
date: 2026-05-09T02:00:00
description: "heap_1·heap_2·heap_3·heap_4·heap_5 — 다섯 가지 메모리 할당 전략과 static allocation."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 2
tags: [freertos, heap, memory, allocator]
type: book-review
bookTitle: "Mastering the FreeRTOS Real Time Kernel"
bookAuthor: "Richard Barry"
draft: true
---

## 한 줄 요약

> **"FreeRTOS는 표준 `malloc`을 *피하기 위해* `pvPortMalloc`을 통해 *5가지 heap 구현 중 하나*를 선택하게 합니다. 대부분의 프로젝트는 *heap_4*면 충분하고, *정적 할당까지 함께 쓰면 RAM 사용량이 결정론적*이 됩니다."**

표준 `malloc`은 *임베디드에서 두 가지로 위험*합니다. 첫째, *thread-safe 보장이 컴파일러 런타임에 의존*합니다. 둘째, *fragmentation으로 long-run에 실패*할 수 있고 *실패 경로가 errno로 숨겨집니다*. FreeRTOS는 이를 우회해 *자체 heap을 5종 제공*하고, *프로젝트가 한 가지를 골라 컴파일*에 포함합니다.

이번 장에서는 *`pvPortMalloc`·`vPortFree`의 의미*, *heap_1~heap_5의 정확한 차이*, *언제 어떤 heap을 쓰는지*, *static allocation으로 heap을 아예 안 쓰는 길*까지 다룹니다.

## pvPortMalloc·vPortFree — FreeRTOS의 단일 인터페이스

FreeRTOS 내부에서 *모든* 동적 할당은 *두 함수*만 호출합니다.

```c
void *pvPortMalloc(size_t xWantedSize);
void  vPortFree(void *pv);
```

`xTaskCreate`·`xQueueCreate`·`xSemaphoreCreateMutex` 등은 *내부적으로 `pvPortMalloc`을 호출*해 *TCB·큐 control block·스택*을 잡습니다. 이 두 함수의 *구현*이 곧 *heap 전략*입니다. `Source/portable/MemMang/heap_X.c` 중 하나만 빌드에 포함하면 됩니다.

표준 `malloc`을 직접 부르는 건 *권장되지 않습니다*. 라이브러리의 `malloc`이 *내부 lock을 안 잡으면* 멀티태스킹에서 깨지고, *잡으면* 그 lock이 *FreeRTOS의 critical section과 충돌*합니다.

## 다섯 가지 heap 한눈 비교

| heap | 자유 가능 | fragmentation | 사용처 |
|------|----------|--------------|--------|
| heap_1 | 아니오 | 없음 | 한 번만 할당하고 끝까지 유지하는 시스템 |
| heap_2 | 예 | 가능 (병합 없음) | legacy, 신규 프로젝트는 회피 |
| heap_3 | 예 | 표준 malloc 의존 | newlib가 잘 동작하는 경우 |
| heap_4 | 예 | 인접 블록 자동 병합 | *대부분의 신규 프로젝트* |
| heap_5 | 예 | heap_4 + 비인접 영역 | external SRAM·SDRAM 등 분할 메모리 |

`configTOTAL_HEAP_SIZE`로 *전체 heap 크기*를 정합니다. heap_5만 예외로 *여러 영역의 배열*을 등록합니다.

## heap_1 — Allocate-Only

가장 단순합니다. *내부 `ucHeap[]` 배열에서 차례로 떼어 줄 뿐* 자유가 없습니다. `vPortFree`를 호출하면 *assert로 실패*합니다.

`ucHeap[configTOTAL_HEAP_SIZE]` 배열을 *왼쪽부터 차례로 떼어 쓰는* 구조입니다.

| 위치 | 0 → | → | → | → | → | `pxNextFreeByte` | → end |
|------|-----|---|---|---|---|------------------|-------|
| 내용 | TCB1 | Stack1 | Queue1 | TCB2 | Stack2 | ... (free) | |

각 호출이 `pxNextFreeByte`만 증가시키고, free가 불가능하므로 *fragmentation을 원천 차단*합니다.

언제 쓰나? *모든 RTOS 객체를 부팅 시 한 번만 만들고 영원히 유지하는 시스템*입니다. 예를 들어 *고정된 5개 태스크·3개 큐*가 끝인 펌웨어라면 heap_1이 *가장 안전*합니다. *결정론적이고 빠르고, 분석이 쉽습니다*.

```c
/* heap_1.c의 핵심 */
void *pvPortMalloc(size_t xWantedSize)
{
    /* 8-byte 정렬 보정 */
    if((xWantedSize & portBYTE_ALIGNMENT_MASK) != 0x00) {
        xWantedSize += (portBYTE_ALIGNMENT - (xWantedSize & portBYTE_ALIGNMENT_MASK));
    }

    vTaskSuspendAll();
    {
        if((xNextFreeByte + xWantedSize) < configADJUSTED_HEAP_SIZE) {
            pvReturn = pucAlignedHeap + xNextFreeByte;
            xNextFreeByte += xWantedSize;
        }
    }
    (void)xTaskResumeAll();
    return pvReturn;
}

void vPortFree(void *pv)
{
    (void)pv;
    configASSERT(pv == NULL);  /* free 자체가 의도 위반 */
}
```

## heap_2 — Best-Fit, 병합 없음

`vPortFree`를 지원하지만 *인접한 free 블록을 병합하지 않습니다*. 같은 크기 객체를 *반복 생성·삭제*하는 패턴에는 잘 맞지만, *크기가 들쭉날쭉*하면 fragmentation으로 죽습니다.

heap_2 사용 시나리오:

1. `block(32)` alloc → free
2. `block(32)` alloc → free — OK, 같은 자리 재사용
3. `block(64)` alloc → free
4. 32+32+64 인접 free 영역 있음
5. `block(96)` alloc → *실패* — 병합을 안 하므로

*신규 프로젝트에는 권장되지 않습니다*. 책에서도 *deprecated 분위기*입니다. 후술할 heap_4가 *상위호환*이라 heap_2를 쓸 이유가 거의 없습니다.

## heap_3 — 표준 malloc 래퍼

`pvPortMalloc`이 *libc의 `malloc`을 호출*하고, *호출 동안 스케줄러를 일시 정지*시켜 thread-safe하게 만듭니다.

```c
/* heap_3.c의 핵심 */
void *pvPortMalloc(size_t xWantedSize)
{
    void *pvReturn;
    vTaskSuspendAll();
    {
        pvReturn = malloc(xWantedSize);   /* libc malloc */
    }
    (void)xTaskResumeAll();
    return pvReturn;
}
```

*newlib*가 잘 설정되어 있고 *heap 영역을 link script가 잡아주는 환경*이라면 동작합니다. 다만 *FreeRTOS의 `configTOTAL_HEAP_SIZE`가 무시*되고, *heap이 어디까지 자라는지*는 libc·link script에 달려있어 *예측이 어렵습니다*.

## heap_4 — 인접 블록 병합 (가장 일반적)

free된 블록을 *주소상 인접한 free 블록과 자동 병합*합니다. fragmentation을 *현실적으로 완화*하고, *대부분의 신규 프로젝트의 디폴트*입니다.

![heap_4 free block linked list — 주소 오름차순으로 free 블록을 잇고 각 노드는 BlockLink_t](/images/blog/freertos-mastering/diagrams/ch02-heap4-freelist.svg)

| 단계 | 동작 |
|------|------|
| 할당 | best-fit이 아니라 *first-fit* (충분히 큰 첫 블록을 씀). 남는 부분은 다시 free list에 삽입 |
| 해제 | 주변 블록의 주소를 확인 → 인접하면 *즉시 병합*. 병합 후 free list 갱신 |

`pvPortMalloc`의 흐름은 다음과 같습니다.

```c
void *pvPortMalloc(size_t xWantedSize)
{
    BlockLink_t *pxBlock, *pxPreviousBlock, *pxNewBlockLink;
    void *pvReturn = NULL;

    vTaskSuspendAll();
    {
        if(pxEnd == NULL)
            prvHeapInit();              /* 첫 호출 시 초기화 */

        xWantedSize += xHeapStructSize; /* metadata 자리 추가 */
        xWantedSize = (xWantedSize + portBYTE_ALIGNMENT - 1)
                      & ~portBYTE_ALIGNMENT_MASK;

        /* 충분히 큰 첫 free 블록 탐색 */
        pxPreviousBlock = &xStart;
        pxBlock = xStart.pxNextFreeBlock;
        while((pxBlock->xBlockSize < xWantedSize) && (pxBlock->pxNextFreeBlock != NULL)) {
            pxPreviousBlock = pxBlock;
            pxBlock = pxBlock->pxNextFreeBlock;
        }

        if(pxBlock != pxEnd) {
            pvReturn = (void *)(((uint8_t *)pxBlock) + xHeapStructSize);
            pxPreviousBlock->pxNextFreeBlock = pxBlock->pxNextFreeBlock;

            /* 잉여가 크면 split */
            if((pxBlock->xBlockSize - xWantedSize) > heapMINIMUM_BLOCK_SIZE) {
                pxNewBlockLink = (void *)(((uint8_t *)pxBlock) + xWantedSize);
                pxNewBlockLink->xBlockSize = pxBlock->xBlockSize - xWantedSize;
                pxBlock->xBlockSize = xWantedSize;
                prvInsertBlockIntoFreeList(pxNewBlockLink);
            }
            pxBlock->xBlockSize |= xBlockAllocatedBit;  /* MSB = 사용 중 */
            pxBlock->pxNextFreeBlock = NULL;
        }
    }
    (void)xTaskResumeAll();
    return pvReturn;
}
```

핵심은 *MSB를 used flag로 사용*하는 트릭과 *주소 순 free list 유지*입니다. 이 둘이 결합해 *free 시 인접 병합*이 *O(블록 수)*로 끝납니다.

### heap_4의 통계 API

```c
HeapStats_t xStats;
vPortGetHeapStats(&xStats);

printf("free now      = %u\n", (unsigned)xStats.xAvailableHeapSpaceInBytes);
printf("free min ever = %u\n", (unsigned)xStats.xMinimumEverFreeBytesRemaining);
printf("largest free  = %u\n", (unsigned)xStats.xSizeOfLargestFreeBlockInBytes);
printf("smallest free = %u\n", (unsigned)xStats.xSizeOfSmallestFreeBlockInBytes);
printf("alloc count   = %u\n", (unsigned)xStats.xNumberOfSuccessfulAllocations);
printf("free  count   = %u\n", (unsigned)xStats.xNumberOfSuccessfulFrees);
```

`xMinimumEverFreeBytesRemaining`이 *시스템이 가장 빠듯했던 순간*입니다. 양산 펌웨어 *부담 테스트 후 이 값*을 보면 *heap 마진*을 알 수 있습니다.

## heap_5 — 비인접 영역 통합

heap_4와 알고리즘은 같지만 *여러 비인접 메모리 영역*을 *한 논리적 heap*으로 다룹니다. 외부 SDRAM·SRAM·tightly-coupled memory가 *서로 다른 주소*에 있을 때 씁니다.

```c
/* heap_5는 직접 초기화 필요 */
HeapRegion_t xHeapRegions[] = {
    { (uint8_t *)0x20000000, 0x10000 },   /* 내부 SRAM 64K */
    { (uint8_t *)0x60000000, 0x80000 },   /* 외부 SDRAM 512K */
    { NULL, 0 }                            /* terminator */
};

int main(void) {
    HAL_Init();
    SystemClock_Config();
    vPortDefineHeapRegions(xHeapRegions);   /* main에서 1회 */
    /* 이후 xTaskCreate 등 호출 가능 */
}
```

*주의*는 *주소 오름차순*과 *영역 크기*입니다. 잘못된 주소를 등록하면 *조용히 깨집니다*. 또한 *`vPortDefineHeapRegions` 전*에 *FreeRTOS API를 부르지 않도록* 합니다.

## Static Allocation — heap을 아예 안 쓰는 길

`configSUPPORT_STATIC_ALLOCATION=1`로 설정하면 *모든 RTOS 객체를 정적으로 만들 수 있는 `xTaskCreateStatic` 같은 변형 API*가 활성됩니다.

```c
#define STACK_SIZE 256

static StaticTask_t xTaskBuffer;
static StackType_t  xStack[STACK_SIZE];

void prvWorkerTask(void *pv) { for(;;) { /* ... */ } }

int main(void) {
    TaskHandle_t xHandle = xTaskCreateStatic(
        prvWorkerTask,           /* 함수 */
        "Worker",                /* 이름 */
        STACK_SIZE,              /* 스택 깊이 (word) */
        NULL,                    /* 파라미터 */
        tskIDLE_PRIORITY + 1,    /* 우선순위 */
        xStack,                  /* 스택 버퍼 */
        &xTaskBuffer             /* TCB 버퍼 */
    );

    vTaskStartScheduler();
}
```

이렇게 하면 *RAM 사용량이 link 시점에 완전히 결정*됩니다. 안전 인증 (IEC 61508·ISO 26262)을 받는 펌웨어가 *정적 할당을 선호*하는 이유입니다.

| API | 동적 (heap) | 정적 (static) |
|-----|------------|--------------|
| 태스크 | `xTaskCreate` | `xTaskCreateStatic` |
| 큐 | `xQueueCreate` | `xQueueCreateStatic` |
| 세마포 | `xSemaphoreCreateBinary` | `xSemaphoreCreateBinaryStatic` |
| 뮤텍스 | `xSemaphoreCreateMutex` | `xSemaphoreCreateMutexStatic` |
| 타이머 | `xTimerCreate` | `xTimerCreateStatic` |

*완전 정적 빌드*를 위해서는 `configSUPPORT_DYNAMIC_ALLOCATION=0`까지 끄고 *idle task·timer daemon의 메모리도 직접 공급*해야 합니다.

```c
/* 정적 빌드에서 application이 idle/timer 메모리를 공급 */
void vApplicationGetIdleTaskMemory(StaticTask_t **ppxIdleTaskTCBBuffer,
                                    StackType_t **ppxIdleTaskStackBuffer,
                                    uint32_t *pulIdleTaskStackSize)
{
    static StaticTask_t xIdleTaskTCB;
    static StackType_t  xIdleStack[configMINIMAL_STACK_SIZE];
    *ppxIdleTaskTCBBuffer = &xIdleTaskTCB;
    *ppxIdleTaskStackBuffer = xIdleStack;
    *pulIdleTaskStackSize   = configMINIMAL_STACK_SIZE;
}
```

## malloc failed hook — 실패를 침묵시키지 말기

`configUSE_MALLOC_FAILED_HOOK=1`로 설정하면 *`pvPortMalloc`이 NULL을 반환하기 직전* application이 정의한 hook이 호출됩니다.

```c
void vApplicationMallocFailedHook(void)
{
    /* 여기 도달 = 시스템이 RAM을 다 썼다는 뜻 */
    taskDISABLE_INTERRUPTS();
    /* 디버거 트랩, 또는 watchdog 리셋 */
    for(;;) { }
}
```

이 hook이 *없으면 NULL 반환을 검사하지 않은 상위 코드가 NULL pointer로 죽고*, 실제 원인이 *몇 단계 뒤에 발견*됩니다. 부팅 단계의 모든 `xTaskCreate`가 *반환값을 무시*해도 hook이 *진짜 원인을 잡아줍니다*.

## 어떤 heap을 골라야 하나

| 조건 | 선택 |
|------|------|
| 부팅 후 객체를 더 안 만든다 | **heap_1** |
| 표준 malloc 환경이 잘 갖춰져 있고 단순한 게 좋다 | **heap_3** |
| 메모리 영역이 비인접 (외부 SDRAM 등) | **heap_5** |
| 그 외 일반적인 상황 | **heap_4** (디폴트) |
| 안전 인증 필요·완전 결정론 | **static allocation** (idle/timer용으로 heap_X는 그대로 필요) |

## 자주 하는 실수와 troubleshooting

| 증상 | 원인 | 해결 |
|------|------|------|
| heap_1로 vQueueDelete 호출 → assert | heap_1은 free 불가 | heap_4로 변경 또는 큐를 안 지움 |
| configTOTAL_HEAP_SIZE 키웠는데 RAM 부족 | heap이 .bss에 들어가는데 link script가 못 따라옴 | ldscript의 RAM 크기 확인 |
| xMinimumEverFreeBytesRemaining이 0 | 한계까지 사용 | heap 늘리거나 객체 줄임 |
| heap_5인데 첫 xTaskCreate에서 NULL | vPortDefineHeapRegions 호출 전 | main 초입에 호출 |
| malloc과 pvPortMalloc 혼용 시 깨짐 | 두 allocator가 같은 메모리 공유 안 함 | 하나만 쓰기 |
| 정적 빌드인데 idle/timer가 메모리 없음 에러 | hook 함수 미정의 | vApplicationGetIdleTaskMemory 정의 |
| heap_4의 free list 손상으로 hang | 누군가 free한 메모리에 계속 씀 | configCHECK_FOR_STACK_OVERFLOW=2 + sanitizer |
| fragmentation으로 large alloc 실패 | heap_2 또는 heap_3 사용 | heap_4로 마이그레이션 |

## 정리

- FreeRTOS는 *`pvPortMalloc`·`vPortFree` 단일 인터페이스*로 모든 동적 할당을 합니다. 표준 `malloc`은 *thread-safety·결정성* 문제로 *직접 호출을 피하는 게* 원칙입니다.
- *heap_1*은 *자유 불가의 단순한 bump allocator*입니다. *고정 객체만 만드는 시스템*에 가장 안전합니다.
- *heap_2*는 *병합 없이 free 가능*. 신규 프로젝트는 *heap_4가 상위호환*이라 안 쓰는 추세입니다.
- *heap_3*는 *libc malloc 래퍼* + 스케줄러 정지. 단순하지만 *`configTOTAL_HEAP_SIZE`를 무시*해 RAM 예측이 어렵습니다.
- *heap_4*는 *인접 병합·first-fit·O(블록 수) free*입니다. *대부분의 프로젝트*가 여기서 시작합니다.
- *heap_5*는 *비인접 영역 통합*. 외부 메모리가 있을 때만 의미가 있고, *`vPortDefineHeapRegions`*를 *main 초입*에 호출합니다.
- *static allocation*은 *RAM 사용량을 link 시점에 확정*시킵니다. 안전 인증 펌웨어가 선호하고, *idle·timer 메모리 hook*까지 정의하면 *완전 정적 빌드*가 됩니다.
- *`vApplicationMallocFailedHook`*을 켜두면 *실패를 침묵시키지 않습니다*. 부팅 단계 NULL 반환 누락의 원인을 빠르게 추적합니다.

## 다음 편

[Ch 3: Task Management](/blog/embedded/rtos/freertos-mastering/chapter03-task-management)에서 *태스크 생성·우선순위·상태 머신*을 다룹니다. *Running·Ready·Blocked·Suspended 4상태*, *선점형 vs 협력형 vs time-slicing*, *vTaskDelay와 vTaskDelayUntil의 차이*를 코드와 함께 봅니다.

## 관련 항목

- [Ch 1: The FreeRTOS Distribution](/blog/embedded/rtos/freertos-mastering/chapter01-distribution)
- [Ch 3: Task Management](/blog/embedded/rtos/freertos-mastering/chapter03-task-management)
- [Ch 7: Resource Management](/blog/embedded/rtos/freertos-mastering/chapter07-resource-management) — heap과 critical section의 관계
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/00-preface) — heap 구현 비교
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/00-preface) — 정적 할당 패턴
- [원문 — FreeRTOS Memory Management](https://www.freertos.org/a00111.html)
- [원문 — heap_4 source](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/main/portable/MemMang/heap_4.c)
