---
title: "Ch 12: Memory Protection Unit (MPU) Support"
date: 2026-05-09T12:00:00
description: "FreeRTOS-MPU·privileged·unprivileged — 태스크 격리와 보안."
series: "Mastering the FreeRTOS Real Time Kernel"
seriesOrder: 12
tags: [freertos, mpu, security, isolation]
draft: true
---

## 한 줄 요약

> **"FreeRTOS-MPU는 *Cortex-M의 Memory Protection Unit*을 활용해 *각 태스크에 별도의 RAM/Flash 권한 영역*을 부여하는 변형 포트입니다. 태스크는 *privileged*와 *unprivileged*로 나뉘고, *xTaskCreateRestricted*로 *region 8~16개*를 지정해 stack overflow·잘못된 포인터·악성 코드의 *피해 범위*를 한 태스크 안으로 가둡니다."**

평범한 FreeRTOS에서는 모든 태스크가 *같은 주소 공간*을 보고, 한 태스크의 *stack overflow*가 *다른 태스크의 데이터*를 덮어쓸 수 있습니다. 의료기기·항공·자동차 같은 *safety-critical* 분야는 이 위험을 받아들이지 않습니다. FreeRTOS-MPU는 *하드웨어 MPU*로 태스크를 격리하고, *SVC 시스템 콜*을 통해서만 권한 작업을 허용해 *fault containment*를 보장합니다. 이번 장에서는 Cortex-M MPU 모델, region 속성, 그리고 `xTaskCreateRestricted` 사용법을 다룹니다.

## Cortex-M MPU 모델

Cortex-M의 MPU는 *region 단위*로 권한과 속성을 부여합니다.

| 코어 | Region 수 | 비고 |
|------|----------|------|
| Cortex-M3 / M4 | **8** | ARMv7-M MPU |
| Cortex-M7 | **16** | ARMv7-M MPU |
| Cortex-M23 / M33 / M55 | **8 또는 16** | ARMv8-M MPU (간소화 모델) |
| Cortex-M0 / M0+ | 0 또는 8 | 옵션 (보통 없음) |

각 region은 다음을 정의합니다.

```text
[ARMv7-M MPU region 속성]

Base Address    │  region 시작 (size에 align)
Size            │  32B ~ 4GB (2의 거듭제곱)
Subregion mask  │  region을 8등분, 일부 disable
AP (Access Perm)│  No access / RO / RW / privileged-only
TEX/C/B/S       │  메모리 속성 (Normal/Device, Cacheable, Bufferable, Shareable)
XN              │  Execute Never (data 영역에 코드 실행 금지)
```

### Access Permission 표

| AP | Privileged | Unprivileged |
|----|-----------|--------------|
| 000 | No access | No access |
| 001 | RW | No access |
| 010 | RW | RO |
| 011 | RW | RW |
| 100 | reserved | reserved |
| 101 | RO | No access |
| 110 | RO | RO |
| 111 | RO | RO |

펌웨어 데이터의 *기본 권장*은 `010`(privileged RW, unprivileged RO) 또는 `011`(둘 다 RW). 코드 영역은 항상 RO + XN 해제.

## Privileged vs Unprivileged 태스크

FreeRTOS-MPU에서 태스크 생성 시 *우선순위 워드 비트*로 모드를 지정합니다.

```c
/* portmacro.h (요약) */
#define portPRIVILEGE_BIT   (0x80000000UL)

/* 생성 시 OR로 결합 */
xTaskCreate(task_fn, "sys",  2048, NULL,
            tskIDLE_PRIORITY | portPRIVILEGE_BIT, &h);   /* privileged */

xTaskCreate(task_fn, "user", 2048, NULL,
            tskIDLE_PRIORITY, &h);                       /* unprivileged */
```

| 모드 | 권한 |
|------|------|
| Privileged | 모든 region 접근 가능. MPU 자체를 끌 수 있음. 커널 코드와 동일 권한. |
| Unprivileged | xRegions에서 명시한 영역만 접근. 시스템 영역 직접 접근 시 *MemManage fault*. |

응용 태스크는 *기본적으로 unprivileged*가 옳습니다. 드라이버, 인터럽트 핸들러, 커널 호출은 *privileged*가 필요합니다.

## xTaskCreateRestricted — region 지정

FreeRTOS-MPU의 핵심 API입니다. 일반 `xTaskCreate`와 달리 *MPU region 배열*을 함께 받습니다.

```c
typedef struct {
    void           *pvBaseAddress;
    uint32_t        ulLengthInBytes;
    uint32_t        ulParameters;   /* AP, TEX, XN 등 비트 조합 */
} MemoryRegion_t;

typedef struct {
    TaskFunction_t  pvTaskCode;
    const char     *pcName;
    uint16_t        usStackDepth;
    void           *pvParameters;
    UBaseType_t     uxPriority;
    StackType_t    *puxStackBuffer;
    MemoryRegion_t  xRegions[portNUM_CONFIGURABLE_REGIONS];   /* 보통 3개 */
} TaskParameters_t;

BaseType_t xTaskCreateRestricted(const TaskParameters_t *pxTaskDefinition,
                                  TaskHandle_t *pxCreatedTask);
```

`portNUM_CONFIGURABLE_REGIONS`는 보통 3입니다. MPU의 *8 region 중 5개*가 *커널 영역*에 예약되고, *나머지 3개*가 태스크 전용입니다.

### 예 — 한 태스크에 RAM/Flash region 부여

```c
#define USER_FLASH_BASE   0x08020000UL
#define USER_FLASH_SIZE   (64UL * 1024UL)

#define USER_DATA_BASE    0x20010000UL
#define USER_DATA_SIZE    (8UL * 1024UL)

#define UART_PERIPH_BASE  0x40004400UL    /* USART2 */
#define UART_PERIPH_SIZE  0x400UL

static StackType_t  user_stack[1024] __attribute__((aligned(1024 * sizeof(StackType_t))));

static const TaskParameters_t user_task_params = {
    .pvTaskCode    = user_task_fn,
    .pcName        = "user",
    .usStackDepth  = 1024,
    .pvParameters  = NULL,
    .uxPriority    = tskIDLE_PRIORITY + 2,  /* unprivileged */
    .puxStackBuffer = user_stack,
    .xRegions = {
        {
            .pvBaseAddress   = (void *)USER_FLASH_BASE,
            .ulLengthInBytes = USER_FLASH_SIZE,
            .ulParameters    = portMPU_REGION_READ_ONLY | portMPU_REGION_CACHEABLE_BUFFERABLE
        },
        {
            .pvBaseAddress   = (void *)USER_DATA_BASE,
            .ulLengthInBytes = USER_DATA_SIZE,
            .ulParameters    = portMPU_REGION_READ_WRITE | portMPU_REGION_CACHEABLE_BUFFERABLE
        },
        {
            .pvBaseAddress   = (void *)UART_PERIPH_BASE,
            .ulLengthInBytes = UART_PERIPH_SIZE,
            .ulParameters    = portMPU_REGION_READ_WRITE | portMPU_REGION_DEVICE_nSHAREABLE
        }
    }
};

xTaskCreateRestricted(&user_task_params, NULL);
```

이 태스크는 *지정된 Flash 64KB, RAM 8KB, USART2 페리페럴* 외에는 *읽기조차 못 합니다*. 시스템 메모리에 접근하려 하면 MemManage fault가 발생합니다.

## Region alignment 규칙 (ARMv7-M)

ARMv7-M MPU의 *가장 까다로운 제약*은 region이 *자기 크기에 align*되어야 한다는 것입니다.

```text
Size 1 KB   → base address가 1 KB align
Size 8 KB   → base address가 8 KB align
Size 64 KB  → base address가 64 KB align
```

stack 배열에 `__attribute__((aligned(N)))`을 정확히 매겨야 합니다. align이 안 맞으면 *생성은 성공해도 region 활성화가 silent fail*해서 디버깅이 어렵습니다. ARMv8-M (M33)는 *32B align*만 요구해서 훨씬 자유롭습니다.

## System call wrapper — MPU_pvPortMalloc

Unprivileged 태스크가 `pvPortMalloc` 같은 *커널 함수*를 직접 호출하면 *Hard Fault*가 납니다. 대신 *SVC를 통해 privileged 모드로 진입*하는 *wrapper*를 거칩니다.

```c
/* mpu_wrappers.c */
void *MPU_pvPortMalloc(size_t xSize)
{
    void *xReturn;
    BaseType_t xRunningPrivileged = xPortRaisePrivilege();   /* SVC */

    xReturn = pvPortMalloc(xSize);

    vPortResetPrivilege(xRunningPrivileged);                 /* 원복 */
    return xReturn;
}
```

FreeRTOSConfig.h에서 `configENABLE_MPU=1` + `configENFORCE_SYSTEM_CALLS_FROM_KERNEL_ONLY=1`이면, 사용자가 호출하는 모든 RTOS API가 *자동으로 MPU wrapper*를 거칩니다.

```c
/* FreeRTOSConfig.h (MPU) */
#define configENABLE_MPU                              1
#define configTOTAL_MPU_REGIONS                       8
#define configENFORCE_SYSTEM_CALLS_FROM_KERNEL_ONLY   1
#define configALLOW_UNPRIVILEGED_CRITICAL_SECTIONS    0
```

`configALLOW_UNPRIVILEGED_CRITICAL_SECTIONS=0`이면 unprivileged 태스크가 `taskENTER_CRITICAL`을 호출해도 *실제로는 인터럽트가 비활성되지 않습니다*. 잘못 작성된 응용이 *전체 시스템 인터럽트를 가두는 일*을 막아 줍니다.

## MemManage fault — debug 패턴

MPU 위반이 일어나면 *MemManage 예외*가 발생합니다. 핸들러에서 *어느 주소에서 어떤 접근*이 막혔는지 확인할 수 있습니다.

```c
void MemManage_Handler(void)
{
    volatile uint32_t cfsr   = SCB->CFSR;
    volatile uint32_t mmfar  = SCB->MMFAR;
    volatile uint32_t mmfsr  = cfsr & 0xff;

    /* mmfsr 비트:
       0x01 IACCVIOL    - Instruction access violation
       0x02 DACCVIOL    - Data access violation
       0x08 MUNSTKERR   - Unstacking fault
       0x10 MSTKERR     - Stacking fault
       0x80 MMARVALID   - MMFAR holds valid address */

    printf("MemManage: CFSR=%08lx MMFAR=%08lx\n", cfsr, mmfar);
    while (1) {}
}
```

`MMARVALID`가 1이면 `MMFAR`이 *실제 위반 주소*입니다. 거기에 *map 정보*(어느 태스크의 어느 region 밖)와 *PC*를 합치면 *원인 코드 라인*까지 정확히 추적할 수 있습니다.

## Stack overflow 강화

평범한 FreeRTOS에서는 *stack 끝을 magic word*로 채우고 *컨텍스트 스위치 때 검사*합니다. *MPU 사용 시*에는 *stack region을 별도로 매겨서* overflow가 즉시 *MemManage fault*로 잡힙니다. 즉 *runtime 즉시* 감지됩니다.

```text
[일반 FreeRTOS]                        [MPU FreeRTOS]
─────────────────                      ─────────────────
overflow                               overflow
  └ 인접 메모리 corruption                └ MemManage fault (즉시)
  └ context switch에서 magic check       └ PC, 위반 주소 즉시 식별
  └ 다음 스위치까지 X µs 지연
```

## 응용 예 — 보안 모듈 격리

암호 키 같은 *민감 데이터*를 한 region에 모으고, *오직 한 태스크만* 접근 가능하게 만듭니다.

```c
/* 키 영역 — 별도 RAM 섹션 */
__attribute__((section(".secure_ram"), aligned(1024)))
static uint8_t g_secure_keys[1024];

static const TaskParameters_t crypto_task_params = {
    .pvTaskCode = crypto_task_fn,
    /* ... */
    .xRegions = {
        { .pvBaseAddress = g_secure_keys,
          .ulLengthInBytes = 1024,
          .ulParameters = portMPU_REGION_READ_WRITE | portMPU_REGION_PRIVILEGED_READ_WRITE },
        /* 다른 두 region */
    }
};
```

다른 태스크가 `g_secure_keys[0]`을 *읽기만 시도*해도 MemManage가 발생합니다. *코드 결함이나 ROP exploit*이 키를 새어 나가게 하는 경로를 차단합니다.

## ARMv8-M (Cortex-M33)의 개선

ARMv8-M MPU는 *더 단순하고 유연*합니다.

| 항목 | ARMv7-M | ARMv8-M |
|------|---------|---------|
| Region alignment | size에 align | 32B align만 |
| 동작 | 비트필드 복잡 | base + limit 직관 |
| TrustZone 연계 | 없음 | Secure/Non-secure 자동 매핑 |
| Subregion mask | 8등분 | 없음 (필요 없음) |

M33은 *TrustZone-M*과 결합해 *Secure World*에 키와 부트로더를 두고 *Non-secure World*에 응용을 두는 *이중 격리*가 가능합니다. PSA Certified Level 2 펌웨어가 이 구조 위에 만들어집니다.

## 자주 하는 실수

| 증상 | 원인 | 해결 |
|------|------|------|
| xTaskCreateRestricted 후 즉시 fault | stack alignment 미달 | size에 정확히 aligned |
| unprivileged 태스크에서 큐 호출 ASSERT | MPU wrapper 미적용 | MPU_xQueueSend 사용 |
| region 활성화 안 됨 (silent) | base address가 size에 align X | align 다시 확인 |
| MemManage 후 핸들러도 fault | 핸들러도 unprivileged? | privileged + fault stacking |
| configTOTAL_MPU_REGIONS=8인데 region 3만 | portNUM_CONFIGURABLE_REGIONS=3 | 커널 예약 5 + 사용자 3 |
| 민감 데이터 leak | RW region을 다른 태스크에도 부여 | 읽기조차 막으려면 별도 region |

가장 잦은 실수는 *region alignment*입니다. linker script에서 *섹션을 명시적으로 align*하고, stack 배열에도 `aligned(N)` 어트리뷰트를 정확히 매겨야 합니다.

## 정리

- FreeRTOS-MPU는 *Cortex-M MPU*로 태스크를 *메모리 권한 영역에 가두는* 변형 포트입니다.
- 태스크는 *privileged*(전 영역)와 *unprivileged*(xRegions만)로 나뉘고, *SVC wrapper*가 RTOS API의 권한 진입을 매개합니다.
- `xTaskCreateRestricted`로 *region 3개 + 공통 region 5개*를 부여합니다.
- ARMv7-M은 *region이 자기 크기에 align*되어야 합니다. ARMv8-M (M33)는 32B align만 요구합니다.
- MPU 위반은 *즉시 MemManage fault*로 잡힙니다. stack overflow도 *런타임 즉시* 감지됩니다.
- 보안 키 격리, 드라이버 영역 분리, fault containment에 활용합니다.
- `configENFORCE_SYSTEM_CALLS_FROM_KERNEL_ONLY=1`로 *RTOS API 자동 wrapper*를 강제합니다.
- M33 + TrustZone-M으로 *이중 격리*가 가능합니다. PSA Certified 펌웨어의 토대입니다.

## 다음 편

[Ch 13: SMP Support](/blog/embedded/rtos/freertos-mastering/chapter13-smp-support)에서는 *듀얼/멀티 코어*에서 FreeRTOS가 *대칭 멀티프로세싱*으로 동작하는 v11 기능을 다룹니다. RP2040과 ESP32-S3가 주 무대입니다.

## 관련 항목

- [Ch 3: Task Management](/blog/embedded/rtos/freertos-mastering/chapter03-task-management) — 일반 태스크 생성과의 차이
- [Ch 14: Trouble Shooting](/blog/embedded/rtos/freertos-mastering/chapter14-trouble-shooting) — MemManage 디버그
- [Practical RTOS Internals](/blog/embedded/rtos/practical-internals/) — MPU 활용 패턴
- [원문 — FreeRTOS-MPU](https://www.freertos.org/FreeRTOS-MPU-memory-protection-unit.html)
- [원문 — ARM Cortex-M MPU](https://developer.arm.com/documentation/100166/0001/Programmers-Model/Memory-Protection-Unit)
