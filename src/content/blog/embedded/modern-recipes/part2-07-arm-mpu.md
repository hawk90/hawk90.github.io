---
title: "Cortex-M4 MPU 활용 — Region 배치·Stack Guard·Task 격리"
slug: "embedded/modern-recipes/part2-07-arm-mpu"
date: 2026-04-11T09:19:00
description: "Cortex-M4(ARMv7-M) MPU 하나의 region 배치에 privileged stack guard와 unprivileged task 격리를 함께 넣고, guard를 일부러 건드려 MemManage 레지스터 기대값과 대조하는 방법을 DUI 0553A 기준으로 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 19
tags: [recipes, arm, mpu]
draft: false
topics: ["embedded"]
lastVerified: 2026-10-11
---

## 한 줄 요약

> **"MPU는 주소 범위마다 누가(privileged/unprivileged) 무엇을(읽기·쓰기·실행) 할 수 있는지 정하고, 어기면 MemManage fault를 냅니다."** 이 글은 Cortex-M4(ARMv7-M) MPU의 region 8개 안에 stack guard와 task 격리를 함께 배치하고, guard가 동작하는지 확인하는 절차까지 보입니다. ARMv7-M MPU만 다룹니다.

레지스터 정의와 표 번호는 [Cortex-M4 Devices Generic User Guide (ARM DUI 0553A)](https://documentation-service.arm.com/static/5f2ac4ab60a93e65927bbdbf)를, 레지스터 매크로 이름은 [CMSIS_5 5.9.0 `core_cm4.h`](https://github.com/ARM-software/CMSIS_5/blob/5.9.0/CMSIS/Core/Include/core_cm4.h)를, `__set_CONTROL`·`__disable_irq` 같은 intrinsic은 같은 태그의 [`cmsis_gcc.h`](https://github.com/ARM-software/CMSIS_5/blob/5.9.0/CMSIS/Core/Include/cmsis_gcc.h)를 따릅니다. 예제 주소는 STM32F407 device header([cmsis-device-f4 v2.6.9 `stm32f407xx.h`](https://github.com/STMicroelectronics/cmsis-device-f4/blob/v2.6.9/Include/stm32f407xx.h))의 `FLASH_BASE` 0x08000000(최대 1 MB, `FLASH_END` 0x080FFFFF), `SRAM1_BASE` 0x20000000(112 KB), `SRAM2_BASE` 0x2001C000(16 KB)을 씁니다.

전제 지식: 예외 진입 때 stack에 무엇이 쌓이는지와 handler mode가 MSP를 쓴다는 것은 [2-04: Cortex-M4 예외 처리](/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions)에서, MSP/PSP와 `CONTROL` 레지스터는 [2-03: Cortex-M 레지스터 구조 분석](/blog/embedded/modern-recipes/part2-03-arm-registers)에서 다룹니다.

## 어떤 상황에서 쓰나

- Privileged thread의 stack overflow를 메모리 손상 대신 fault로 잡고 싶을 때
- RTOS task가 자기 RAM 밖을 읽거나 쓰지 못하게 막을 때

## 핵심 개념

### Region과 우선순위

Cortex-M4 MPU는 region 0~7의 8개와 background region을 가집니다. Region이 겹치면 번호가 가장 큰 region의 속성이 적용되고, background region은 privileged 소프트웨어만 쓸 수 있습니다(DUI 0553A 4.5절). 구현한 region 수는 `MPU->TYPE`의 DREGION 필드(비트 [15:8])로 읽습니다(4.5.1절).

`MPU_CTRL`의 ENABLE과 PRIVDEFENA가 모두 1이면 privileged와 unprivileged가 다르게 취급됩니다(4.5.2절).

- Privileged 접근이 enable된 region에 들지 않으면 default memory map을 따릅니다. MPU fault는 나지 않습니다.
- Unprivileged 접근이 enable된 region에 들지 않으면 MemManage fault가 납니다.

이 비대칭이 아래 설계 전체를 정합니다. Unprivileged task에게는 열어 준 region의 경계 자체가 보호선이고, privileged 코드는 명시적으로 막은 region에서만 MPU fault가 납니다.

### Region 크기·정렬·sub-region

`MPU_RASR.SIZE`(비트 [5:1])는 `region 크기 = 2^(SIZE+1)` byte로 해석합니다. 가장 작은 region은 32 B(SIZE = 4)이고 가장 큰 region은 4 GB(SIZE = 31)입니다(4.5.5절, Table 4-44). 같은 절의 Table 4-43은 SIZE 최소값을 3으로 적지만, 공식으로 SIZE = 3은 16 B이므로 본문과 Table 4-44의 SIZE = 4를 따릅니다. 시작 주소는 region 크기의 배수여야 합니다. 64 KB region은 0x00010000이나 0x00020000처럼 64 KB 경계에서 시작합니다(4.5.4절).

256 B 이상인 region은 크기가 같은 sub-region 8개로 나뉘고, `MPU_RASR.SRD`(비트 [15:8])의 비트 n이 sub-region n을 끕니다. 최하위 비트가 첫 sub-region입니다. 꺼진 sub-region에는 겹치는 다른 region이 적용되고, 그런 region이 없으면 MPU가 fault를 냅니다. 32·64·128 B region은 sub-region이 없으므로 SRD를 0x00으로 써야 하고, 아니면 동작이 Unpredictable입니다(4.5.8절 Subregions).

크기가 2의 거듭제곱이 아닌 영역은 두 방법 중 하나로 덮습니다. 64 KB 경계에서 시작하는 33 KB 영역을 예로 듭니다.

| 방법 | 설정 | 쓰는 region | 실제로 열리는 크기 |
| --- | --- | --- | --- |
| 64 KB region + SRD | sub-region 8 KB × 8, sub-region 0~4를 남기고 5·6·7을 끔 → `SRD = 0xE0` | 1개 | 40 KB (요청보다 7 KB 많음) |
| 32 KB + 1 KB region | base에 32 KB(SIZE = 14), base + 32 KB에 1 KB(SIZE = 9). 두 시작 주소 모두 자기 크기의 배수 | 2개 | 33 KB (정확히 일치) |

남는 7 KB에 다른 task의 데이터가 있으면 첫 방법은 그 데이터까지 열어 버립니다. Region에 여유가 있으면 두 번째 방법이 경계를 정확히 지킵니다.

### AP와 메모리 속성 — 이 글의 선택

AP(`MPU_RASR` 비트 [26:24])와 실행 금지 `XN`(비트 28)은 아래처럼 고릅니다. AP 의미는 Table 4-47, TEX/C/B/S 값은 Table 4-48(Memory region attributes for a microcontroller)의 Flash·Internal SRAM 행입니다.

| 대상 | AP (privileged / unprivileged) | XN | TEX/C/B/S | 고른 이유 |
| --- | --- | --- | --- | --- |
| Flash | 110 (RO / RO) | 0 | 000/1/0/0 | Task가 코드를 실행하고 상수를 읽되 쓰지는 못하게 함 |
| Task A RAM | 011 (RW / RW) | 1 | 000/1/0/1 | Unprivileged task의 데이터·stack. 실행은 금지 |
| Stack guard | 000 (No access / No access) | 1 | 000/0/0/0 | 보호 대상이 privileged thread이므로 privileged 접근도 fault가 나야 함. `001`·`101`은 privileged 접근을 허용하므로 guard가 되지 못함 |

Guard는 어떤 접근도 허용하지 않으므로 TEX/C/B/S가 적용될 일이 없습니다. DUI 0553A 4.5.9절은 microcontroller 구현 대부분에서 shareability와 cache policy 속성이 시스템 동작에 영향을 주지 않고, Table 4-48 값을 쓰면 코드 이식성이 좋아진다고 적습니다.

## 코드 / 실제 사용 예

### Region 배치

Stack guard와 task 격리를 한 MPU에 넣은 배치입니다. 어느 기능을 어느 번호에 두느냐가 두 기능이 서로를 덮어쓰지 않게 하는 핵심입니다.

| Region | 용도 | 범위 | SIZE |
| --- | --- | --- | --- |
| 0 | Flash (task A 코드·상수) | 0x08000000~0x080FFFFF | 19 (1 MB) |
| 1 | Task A RAM (stack은 이 region의 바닥) | 0x20000000~0x20000FFF | 11 (4 KB) |
| 2~6 | 미사용 (ENABLE = 0) | — | — |
| 7 | Privileged thread stack의 guard | 0x20018000~0x2001801F | 4 (32 B) |

Guard를 region 7에 두는 이유는 겹침 규칙입니다. 나중에 SRAM 전체를 덮는 region을 0~6 중 하나에 추가해도 번호가 가장 큰 region 7의 No access가 이깁니다(4.5절). Region 1은 RTOS에서 task마다 다시 쓰는 자리입니다.

### 설정 코드

```c
#include "stm32f4xx.h"   /* stm32f407xx.h -> core_cm4.h -> cmsis_compiler.h */

static void mpu_write_region(uint32_t rnr, uint32_t base, uint32_t rasr) {
    MPU->RNR  = rnr;
    MPU->RASR = 0;                     /* disable first (4.5.8) */
    MPU->RBAR = base;
    MPU->RASR = rasr;
}

void mpu_setup(void) {
    uint32_t primask = __get_PRIMASK();
    __disable_irq();                   /* 4.5.9 */
    MPU->CTRL = 0;

    uint32_t nreg = (MPU->TYPE & MPU_TYPE_DREGION_Msk) >> MPU_TYPE_DREGION_Pos;
    for (uint32_t r = 0; r < nreg; r++) {   /* clear previous setup (4.5.9) */
        MPU->RNR  = r;
        MPU->RASR = 0;
    }

    /* Region 0: Flash 1 MB, AP=110, TEX=000 C=1 B=0 S=0 */
    mpu_write_region(0, 0x08000000,
          (0x6UL << MPU_RASR_AP_Pos) | MPU_RASR_C_Msk
        | (19UL << MPU_RASR_SIZE_Pos) | MPU_RASR_ENABLE_Msk);

    /* Region 1: task A RAM 4 KB, AP=011, XN, TEX=000 C=1 B=0 S=1 */
    mpu_write_region(1, 0x20000000,
          MPU_RASR_XN_Msk | (0x3UL << MPU_RASR_AP_Pos)
        | MPU_RASR_S_Msk | MPU_RASR_C_Msk
        | (11UL << MPU_RASR_SIZE_Pos) | MPU_RASR_ENABLE_Msk);

    /* Region 7: guard 32 B, AP=000, XN, SRD=0 */
    mpu_write_region(7, 0x20018000,
          MPU_RASR_XN_Msk | (0x0UL << MPU_RASR_AP_Pos)
        | (4UL << MPU_RASR_SIZE_Pos) | MPU_RASR_ENABLE_Msk);

    SCB->SHCSR |= SCB_SHCSR_MEMFAULTENA_Msk;
    MPU->CTRL = MPU_CTRL_ENABLE_Msk | MPU_CTRL_PRIVDEFENA_Msk;
    __DSB();
    __ISB();
    __set_PRIMASK(primask);
}
```

`mpu_write_region`은 4.5.8절 예제의 순서를 따릅니다. 이미 enable된 region을 바꿀 때는 먼저 disable하고 base와 속성을 쓴 뒤 다시 enable합니다. 4.5.9절은 handler가 접근할 수 있는 region의 속성을 바꾸기 전에 interrupt를 끄고, 이전에 MPU를 설정한 적이 있으면 쓰지 않는 region을 disable하라고 적습니다. 위 함수가 `PRIMASK`를 저장한 뒤 interrupt를 끄고 DREGION 개수만큼 region을 지우는 이유입니다. 끝의 `DSB`·`ISB`는 4.5.8절에서 옵니다. 설정을 바로 적용하려면 `DSB`가 필요하고, 설정 코드가 branch나 call로 진입했으면 `ISB`도 필요합니다.

### Stack guard가 잡는 것과 놓치는 것

Cortex-M4는 full descending stack을 씁니다. Push할 때 SP를 먼저 줄이고 그 주소에 씁니다(2.1.2절). 그래서 guard는 stack의 *가장 낮은 주소*에 둡니다. 위 배치의 guard는 0x20018000~0x2001FFFF(32 KB)를 stack으로 쓰는 privileged thread를 보호합니다.

이 stack은 PSP로 써야 합니다. 예외 진입 때 프로세서는 8워드 stack frame을 *현재 stack*에 쌓고(2.3.7절), handler mode는 항상 MSP를 씁니다(2.1.2절, Table 2-1). Thread가 PSP를 쓰면 guard에 닿은 뒤에도 MemManage handler는 guard와 무관한 MSP에서 돕니다. Thread가 MSP를 쓰면 handler가 이미 guard 바로 위까지 내려온 그 stack에서 돌게 됩니다. Thread를 PSP로 옮기는 방법은 2.1.3절(MSR로 `CONTROL.SPSEL = 1`, 또는 EXC_RETURN으로 예외 복귀)에 있습니다. MSP용 stack은 0x20018000~0x2001FFFF 밖에 둡니다.

Guard는 guard 안의 주소에 *접근할 때만* fault를 냅니다. 이 stack에서 도는 함수 하나가 SP를 32 B보다 크게 줄인 뒤 guard 아래 주소부터 쓰면, 그 주소는 privileged background map에 속하므로 MPU fault 없이 0x20018000 아래 메모리를 덮습니다. 그래서 guard 크기는 이 stack에서 도는 함수의 가장 큰 frame보다 커야 합니다. 함수별 frame 크기는 [8-09: Stack 분석](/blog/embedded/modern-recipes/part8-09-stack-analysis)의 "함수별 stack usage 분석" 절처럼 컴파일러 보고서로 얻습니다. Guard를 키우면 SIZE와 시작 주소 정렬을 함께 바꿉니다. 256 B guard라면 SIZE = 7이고 시작 주소는 256의 배수입니다.

Unprivileged task에는 별도 guard region이 필요 없습니다. Task A의 stack을 region 1의 바닥(0x20000000 쪽)에 두면, overflow한 push는 region 1 아래 주소로 가고 그 주소는 enable된 어느 region에도 들지 않으므로 MemManage fault가 납니다(4.5.2절). 반대로 stack을 region 1의 위쪽에 두고 그 아래에 task 데이터를 두면, overflow는 같은 region 안의 데이터를 fault 없이 덮습니다.

### Guard를 일부러 건드려 확인하기

설정이 맞는지는 guard 첫 word에 직접 써 보고 fault 레지스터를 기대값과 대조해 확인합니다. Handler는 4.3.15절의 순서대로 `MMFAR`를 먼저 읽습니다. 더 높은 우선순위의 예외가 끼어들면 `MMFAR`가 바뀔 수 있기 때문입니다.

```c
volatile uint32_t g_mmfar;
volatile uint32_t g_cfsr;

void MemManage_Handler(void) {
    g_mmfar = SCB->MMFAR;              /* 1. address first (4.3.15) */
    g_cfsr  = SCB->CFSR;               /* 2. then MMARVALID etc. */
    for (;;) { }                       /* inspect g_cfsr / g_mmfar with a debugger */
}

/* call from the privileged thread running on the guarded PSP stack */
void mpu_guard_selftest(void) {
    *(volatile uint32_t *)0x20018000 = 0;
}
```

`mpu_setup()` 뒤, stack에 여유가 있는 시점에 `mpu_guard_selftest()`를 부르고 handler의 무한 루프에서 디버거로 두 변수를 읽습니다. 아래 기대값은 Table 4-25(MMFSR)의 정의에서 끌어낸 것이며, 측정값이 아닙니다.

| 항목 | 기대값 | 근거 (Table 4-25) |
| --- | --- | --- |
| `DACCVIOL` | 1 | Load/store가 허용되지 않은 위치에 접근 |
| `MMARVALID` | 1 | DACCVIOL이면 MMAR(MMFAR)에 접근 주소를 기록 |
| `MMFAR` | 0x20018000 | 시도한 접근의 주소 |
| `MSTKERR` | 0 | 진입 stacking이 guard 위의 정상 영역에 쓰임 |
| Stacked PC | `mpu_guard_selftest`의 store 명령 | DACCVIOL이면 stacked PC가 fault 명령을 가리킴 |

Handler에 오지 않으면 MPU의 ENABLE과 region 7의 ENABLE·주소·AP를 다시 봅니다. HardFault로 가면 아래 "자주 보는 함정"의 `MEMFAULTENA` 항목에 해당합니다.

실제 overflow는 이 시험과 다릅니다. Fault 순간 PSP가 guard 바로 위에 있으므로, guard 위 끝(0x20018020)과 PSP 사이가 stack frame보다 좁으면 진입 stacking도 guard에 씁니다. Frame은 8워드이고, 부동소수점 상태까지 쌓으면 S0~S15와 FPSCR이 더해집니다(2.3.7절, Figure 2-3). Stacking이 guard에 닿은 경우가 `MSTKERR`의 정의이고, 이때 stack의 context 값은 틀릴 수 있으므로(Table 4-25) stacked PC로 원인 함수를 찾지 않습니다.

### Task 격리와 context switch

Handler mode는 항상 privileged이고, thread mode의 권한은 `CONTROL.nPRIV`가 정합니다. `CONTROL`은 privileged 코드만 쓸 수 있으므로 unprivileged thread는 스스로 권한을 올리지 못하고 `SVC`로 privileged 코드를 불러야 합니다(2.1.1절). 위 배치에서 unprivileged가 된 task A는 region 0의 Flash 읽기·실행과 region 1의 4 KB만 쓸 수 있습니다. 0x20001000 이상의 SRAM이나 peripheral에 접근하면 MemManage fault가 납니다.

```c
/* call from privileged thread mode; cannot be undone from unprivileged code */
void drop_to_unprivileged(void) {
    __set_CONTROL(__get_CONTROL() | CONTROL_nPRIV_Msk);
    __ISB();
}
```

DUI 0553A 2.1.3절은 OS 환경에서 thread는 PSP, kernel과 handler는 MSP를 쓰도록 권장하고, 4.5절은 OS kernel이 실행할 process에 맞춰 MPU region 설정을 동적으로 바꿀 수 있다고 적습니다. 위 배치에서 그 자리는 region 1입니다. Context switch handler에서 `mpu_write_region(1, …)`으로 다음 task의 RAM을 열 때, 4.5.8절은 MPU 설정을 바꾼 뒤 `DSB`가 필요하고 예외로 진입한 설정 코드에는 `ISB`가 필요 없다고 적습니다. Region 0과 7은 그대로 둡니다. FreeRTOS-MPU의 구조는 [RTOS System Call — SVC·ECALL·User/Kernel 분리·FreeRTOS-MPU](/blog/embedded/rtos/practical-internals/part4-10-syscall)에서 다룹니다.

## 자주 보는 함정

> ⚠️ Region 정의 후 `MPU_CTRL.ENABLE` 누락

ENABLE = 0이면 privileged·unprivileged 모두 MPU가 없을 때와 같은 default memory map을 씁니다(4.5.2절). Region 위반으로는 fault가 나지 않으므로 "Guard를 일부러 건드려 확인하기"의 시험에서 handler에 오지 않습니다.

> ⚠️ `PRIVDEFENA = 0`으로 MPU enable

Enable된 region이 덮지 않는 주소는 privileged 접근도 fault가 됩니다. 예외는 System Control Space와 vector table로, MPU가 켜져 있으면 이 두 영역 접근은 항상 허용됩니다(4.5.2절). Handler·kernel의 코드·데이터·MSP stack을 region으로 모두 덮은 뒤에 enable합니다.

> ⚠️ `SHCSR.MEMFAULTENA = 0`

Handler가 enable되지 않은 fault는 HardFault로 escalate됩니다(2.4.2절). MemManage handler에 둔 진단 코드가 돌지 않습니다.

## 정리

- Privileged 접근까지 막아야 하는 guard는 가장 큰 번호(region 7)에 두고, task마다 바뀌는 region은 한 자리(region 1)로 정해 그것만 context switch에서 다시 씁니다.
- Privileged thread의 stack guard는 그 stack을 PSP로 써야 handler가 MSP에서 돌 수 있고, guard 크기는 그 stack의 가장 큰 함수 frame보다 커야 합니다.
- Unprivileged task는 stack을 자기 region 바닥에 두면 region 경계가 guard 역할을 합니다.
- 설정을 마치면 guard 첫 word에 써서 `DACCVIOL = 1`이고 `MMFAR`가 guard 주소인지 확인합니다.

다음 편에서는 **MMU 기초**를 다룹니다. Cortex-A의 가상 주소 변환입니다.

## 관련 항목

- [2-03: Cortex-M 레지스터 구조 분석](/blog/embedded/modern-recipes/part2-03-arm-registers) — MSP/PSP, `CONTROL`, `EXC_RETURN`
- [2-04: Cortex-M4 예외 처리](/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions) — 예외 진입 stacking, handler mode
- [2-05: ARM 메모리 맵](/blog/embedded/modern-recipes/part2-05-arm-memory-map)
- [2-06: ARM 캐시 (L1/L2)](/blog/embedded/modern-recipes/part2-06-arm-cache)
- [2-08: MMU 기초](/blog/embedded/modern-recipes/part2-08-arm-mmu)
- [8-09: Stack 분석](/blog/embedded/modern-recipes/part8-09-stack-analysis) — 함수별 stack usage, 패턴 채우기·overflow hook
- 더 깊이 — [Practical RTOS Internals: RTOS System Call — SVC·ECALL·User/Kernel 분리·FreeRTOS-MPU](/blog/embedded/rtos/practical-internals/part4-10-syscall)

## 참고 자료

- ARM, [Cortex-M4 Devices Generic User Guide](https://documentation-service.arm.com/static/5f2ac4ab60a93e65927bbdbf), DUI 0553A (Issue A, 2010-12-16) — 2.1절(프로그래머 모델·stack), 2.3.7절(예외 진입), 2.4.2절(fault escalation), 4.3절(SHCSR·CFSR·MMFAR), 4.5절(MPU). 이 글은 2026-10-11에 이 문서와 대조했고, ARMv7-M Architecture Reference Manual과는 대조하지 않았습니다.
- ARM, CMSIS_5 태그 5.9.0 — [`core_cm4.h`](https://github.com/ARM-software/CMSIS_5/blob/5.9.0/CMSIS/Core/Include/core_cm4.h)(레지스터 구조체·비트 매크로), [`cmsis_gcc.h`](https://github.com/ARM-software/CMSIS_5/blob/5.9.0/CMSIS/Core/Include/cmsis_gcc.h)(`__get_CONTROL`·`__set_CONTROL`·`__get_PRIMASK`·`__set_PRIMASK`·`__disable_irq`)
- STMicroelectronics, [cmsis-device-f4 v2.6.9 `stm32f407xx.h`](https://github.com/STMicroelectronics/cmsis-device-f4/blob/v2.6.9/Include/stm32f407xx.h) — `FLASH_BASE`·`FLASH_END`·`SRAM1_BASE`·`SRAM2_BASE`
