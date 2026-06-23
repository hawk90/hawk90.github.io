---
title: "ARM MPU 활용 — Region·Attribute·Privilege Separation"
date: 2026-04-11T09:19:00
description: "Region setup·attributes·fault analysis — 메모리 보호의 실전."
series: "Modern Embedded Recipes"
seriesOrder: 19
tags: [recipes, arm, mpu]
draft: false
---

## 한 줄 요약

> **"MPU는 메모리에 출입 제한을 거는 하드웨어 경비입니다."** Stack overflow 감지, RTOS task 격리, DMA buffer 정책을 한 묶음으로 처리합니다.

## 어떤 상황에서 쓰나

- Stack overflow를 fault로 잡고 싶을 때
- RTOS task끼리 서로의 RAM 접근을 막을 때
- DMA buffer를 non-cacheable로 강제할 때
- Bootloader 영역을 app에서 못 쓰게 막을 때

## 핵심 개념

### 1) MPU 기본 — region 단위 보호

Cortex-M MPU는 8 (M3/M4) 또는 16 (M7/M33) region을 정의합니다. 각 region은 시작 주소, 크기, 속성을 갖습니다.

```text
Region 0: 0x08000000 ~ 0x080FFFFF (Flash)  ─ RX, normal
Region 1: 0x20000000 ~ 0x2001FFFF (SRAM)   ─ RW,  normal cached
Region 2: 0x20020000 ~ 0x20030000 (DMA)    ─ RW,  non-cacheable
Region 3: 0x40000000 ~ 0x60000000 (Peri)   ─ RW,  device
```

번호가 높은 region이 우선합니다. Overlap이 허용되며, 일부 영역만 다르게 설정할 때 사용합니다.

### 2) Region size — 2^N

크기는 32 byte ~ 4 GB의 2의 거듭제곱이어야 합니다. 시작 주소도 size 단위로 align 되어야 합니다.

```text
SIZE field = log2(size_bytes) - 1

32 B    → 4
64 B    → 5
1 KB    → 9
1 MB    → 19
4 GB    → 31
```

### 3) Access permission

| AP[2:0] | Privileged | Unprivileged |
|---|---|---|
| 000 | None | None |
| 001 | RW | None |
| 010 | RW | RO |
| 011 | RW | RW |
| 101 | RO | None |
| 110 | RO | RO |
| 111 | RO | RO |

`AP = 001`은 OS kernel만 접근 가능, user task는 fault. RTOS에서 task 격리에 사용.

### 4) Attribute — Cacheable, Bufferable, Shareable, TEX

| TEX | C | B | S | Memory type |
|---|---|---|---|---|
| 000 | 0 | 0 | - | Strongly-ordered |
| 000 | 0 | 1 | - | Device |
| 000 | 1 | 0 | S | Normal, write-through |
| 000 | 1 | 1 | S | Normal, write-back, no allocate |
| 001 | 0 | 0 | - | Normal, non-cacheable |
| 001 | 1 | 1 | S | Normal, write-back, write-allocate |

DMA buffer에는 TEX=001, C=0, B=0(non-cacheable)를 자주 씁니다.

### 5) Sub-region disable

Region을 8개의 sub-region으로 나누고, 일부만 disable할 수 있습니다. 작은 hole을 만들 때 유용합니다.

```text
Region: 1 KB, 8 sub-region (128 B 각)
SRD[7:0] = 0x18 → sub-region 3, 4 disable
   → 0x20000180~0x200002FF만 보호 제외
```

## 코드 / 실제 사용 예

STM32F4에서 stack overflow를 감지하는 MPU 설정입니다.

```c
// Stack 영역 마지막에 32 byte "guard zone" 만들기
// Stack: 0x20018000 ~ 0x2001FFFF (32 KB)
// Guard: 0x20018000 ~ 0x2001801F (32 B) — No access

void mpu_setup_stack_guard(void) {
    MPU->CTRL = 0;                              // disable
    
    MPU->RNR  = 0;
    MPU->RBAR = 0x20018000;
    MPU->RASR = MPU_RASR_ENABLE_Msk
              | (4 << MPU_RASR_SIZE_Pos)         // 32 B (2^5)
              | (0b000 << MPU_RASR_AP_Pos);      // No access
    
    MPU->CTRL = MPU_CTRL_ENABLE_Msk
              | MPU_CTRL_PRIVDEFENA_Msk;        // 기본 background map 사용
}
```

Stack이 guard zone을 침범하면 MemManage fault가 발생합니다.

MemManage fault handler:

```c
void MemManage_Handler(void) {
    uint32_t cfsr = SCB->CFSR;
    uint32_t mmfar = SCB->MMFAR;
    
    if (cfsr & SCB_CFSR_MMARVALID_Msk) {
        log("MemManage fault at 0x%08x\n", mmfar);
        if (cfsr & SCB_CFSR_DACCVIOL_Msk) {
            log("Data access violation\n");
        }
        if (cfsr & SCB_CFSR_IACCVIOL_Msk) {
            log("Instruction access violation\n");
        }
    }
    
    while (1);   // 또는 reset
}
```

RTOS task 격리:

```c
// Task A: SRAM region 0x20000000 ~ 0x20001000만 접근 가능
mpu_set_region(0, 0x20000000, 0x1000, MPU_AP_RW_RW);
// 다른 SRAM 접근 시 fault
```

## 측정 / 비교

| 코어 | MPU region 수 |
| --- | --- |
| Cortex-M0+ | 8 (option) |
| Cortex-M3 | 8 |
| Cortex-M4 | 8 |
| Cortex-M7 | 16 |
| Cortex-M33 | 16 |

| MPU enable 후 overhead | 영향 |
| --- | --- |
| Memory access | 1 ~ 2 cycle 추가 (lookup) |
| Region 변경 | DSB + 동기화 필요 |
| Context switch | RTOS가 region 재설정 |

## 자주 보는 함정

> ⚠️ Region 정의 후 enable 누락

`MPU->CTRL = MPU_CTRL_ENABLE_Msk`를 호출하지 않으면 MPU는 동작하지 않습니다. fault도 안 납니다.

> ⚠️ Background region 비활성

`PRIVDEFENA = 0`이면 region에 명시되지 않은 영역은 모두 접근 금지. 모든 메모리 영역을 region으로 명시해야 합니다. `PRIVDEFENA = 1`이 기본 권장.

> ⚠️ Stack guard region을 stack 시작이 아니라 stack 끝에 둠

Stack은 high address에서 low로 자랍니다. guard는 stack의 *낮은 주소* 쪽에 둬야 overflow 감지. high 쪽에 두면 영원히 fault 안 남.

> ⚠️ Region 크기를 2^N 아닌 임의 값으로 설정

MPU는 2의 거듭제곱만 인식합니다. 33 KB가 필요하면 64 KB로 round up하고 unused는 sub-region disable.

> ⚠️ MemManage fault disable 채로 access violation

`SHCSR.MEMFAULTENA = 0`이면 MemManage fault가 HardFault로 escalate됩니다. fault 원인을 알기 어려워집니다.

```c
SCB->SHCSR |= SCB_SHCSR_MEMFAULTENA_Msk;
```

## 정리

- MPU는 8 ~ 16 region 단위로 메모리 접근 권한과 attribute를 설정합니다.
- Region 크기는 2의 거듭제곱, 시작 주소도 크기 단위 alignment.
- Stack overflow 감지, RTOS task 격리, DMA buffer 정책을 한 MPU 설정으로 처리합니다.
- MemManage fault는 enable 후 CFSR와 MMFAR로 원인 분석합니다.
- Background region(`PRIVDEFENA`), sub-region disable 같은 옵션을 이해해야 큰 시스템에 적용 가능합니다.

다음 편에서는 **MMU 기초**를 다룹니다. Cortex-A의 가상 주소 변환입니다.

## 관련 항목

- [2-05: ARM 메모리 맵](/blog/embedded/modern-recipes/part2-05-arm-memory-map)
- [2-06: ARM 캐시 (L1/L2)](/blog/embedded/modern-recipes/part2-06-arm-cache)
- [2-08: MMU 기초](/blog/embedded/modern-recipes/part2-08-arm-mmu)
- 더 깊이 — [Practical RTOS Internals: Task isolation](/blog/embedded/rtos/practical-internals/00-preface)
