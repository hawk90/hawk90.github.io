---
title: "RTOS System Call — SVC·ECALL·User/Kernel 분리·FreeRTOS-MPU"
slug: "embedded/rtos/practical-internals/part4-10-syscall"
date: 2026-05-07T09:42:00
description: "MPU/MMU로 user task와 kernel을 분리하는 RTOS의 syscall 구조를 정리합니다. Cortex-M의 SVC trap, RISC-V의 ECALL, FreeRTOS-MPU와 Zephyr USERSPACE의 차이, capability 검사, syscall 검증·측정에 필요한 조건까지 다룹니다."
series: "Practical RTOS Internals"
seriesOrder: 42
tags: [syscall, svc, ecall, mpu, mmu, privilege, freertos-mpu]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"System call은 user task가 kernel 서비스에 접근하는 *유일한 합법 통로*입니다."** — 경계에서 객체·포인터·길이·호출 권한을 검증해야 합니다.

## 어떤 문제를 푸는가

대부분의 embedded RTOS는 *모든 task가 같은 권한*으로 동작합니다. FreeRTOS 기본 구성이 그렇고, Zephyr와 ThreadX도 USERSPACE 옵션을 끄면 마찬가지입니다. 빠르고 단순합니다. RTOS API 호출이 *그냥 함수 호출*이므로 trap 비용은 없지만 함수 본체·동기화·scheduling 비용은 남습니다.

같은 주소 공간에서 충분한 권한을 가진 task의 잘못된 write는 kernel과 다른 task를 손상시킬 수 있습니다. MPU/MMU를 이용한 격리는 피해 범위를 줄이는 수단입니다. 코드 리뷰·테스트가 hardware 경계를 대신 보장한다거나 특정 인증 등급이 모든 task에 동일한 syscall 구성을 강제한다고 단정하지 않습니다.

이 글은 FreeRTOS-Kernel V11.2.0 ARM_CM4_MPU의 wrapper v1/v2 구분과 Zephyr 3.7.0의 user object 검증을 기준으로 설명합니다. SVC/ECALL instruction만 추가해 안전한 kernel이 완성되지는 않습니다.

## CPU Privilege Level

대표 아키텍처의 권한 레벨입니다.

ARM Cortex-M

- Handler mode → 항상 privileged
- Thread mode → `CONTROL.nPRIV`로 결정 (0: privileged, 1: unprivileged)

ARM Cortex-A (ARMv8)

- EL0 — user (application)
- EL1 — OS kernel
- EL2 — hypervisor
- EL3 — secure monitor (TF-A)

RISC-V

- M-mode — machine (가장 높은 권한, 펌웨어)
- S-mode — supervisor (Linux kernel)
- U-mode — user (application)

권한 모드 자체만으로 모든 kernel 메모리가 차단되지는 않습니다. MPU/MMU/PMP 등의 실제 region·permission 설정과 fault 처리가 필요합니다. 미구현 mode와 delegation 지원도 target별로 확인합니다.

## SVC — Cortex-M의 Syscall Trap

Cortex-M의 SVC는 동기 exception을 요청합니다. immediate 번호와 register ABI는 OS가 정합니다. 이 글의 번호 1은 교육용 계약이며 FreeRTOS 또는 Linux의 실제 write syscall 번호가 아닙니다.

```c title="svc-call.c"
#include <stddef.h>
static inline int demo_write(int fd, const void *buf, size_t n)
{
    register int r0 __asm__("r0") = fd;
    register const void *r1 __asm__("r1") = buf;
    register size_t r2 __asm__("r2") = n;
    __asm__ volatile("svc #1" : "+r"(r0), "+r"(r1), "+r"(r2)
                     : : "r3", "r12", "cc", "memory");
    return r0;
}
int call_demo_write(int fd, const void *buf, size_t n)
{ return demo_write(fd, buf, n); }
```

실제 handler는 EXC_RETURN으로 MSP/PSP와 basic/extended FP frame을 구분해야 합니다. 단순 C handler가 PSP[6]만 읽으면 모든 호출 문맥을 처리할 수 없습니다. stacked PC에서 SVC instruction을 읽을 때도 허용 code 범위·opcode·syscall 번호를 검증합니다.

handler가 hardware-stacked R0를 갱신하면 exception return 때 결과가 복원됩니다. 단순한 일반 C 함수의 bx lr만으로 모든 exception return 경로를 구현하지 않습니다. compiler ABI·naked assembly bridge·RTOS context 저장 규칙이 필요하므로 완전한 handler로 오해할 수 있는 의사 코드를 제시하지 않습니다.

## ECALL — RISC-V의 Syscall Trap

ECALL은 호출 mode별 environment-call exception을 발생시킵니다. U-mode의 cause는 8이고, 처리 대상은 delegation과 구현 mode에 따라 달라집니다. 항상 바로 다음 상위 mode로 올라간다는 규칙은 아닙니다.

syscall 번호를 a7, 인자·결과를 a0 등에 두는 것은 ABI 계약이지 instruction 자체의 규칙이 아닙니다. trap frame 저장/복원, 원래 privilege, exception cause와 처리 후 EPC의 이동을 OS가 관리합니다. ECALL은 32-bit instruction이므로 성공적으로 처리한 뒤 재실행하지 않으려면 해당 EPC를 4 증가시키는 경로가 필요합니다. 다른 trap에 무조건 같은 보정을 적용하지 않습니다.

## FreeRTOS-MPU

V11.2.0은 MPU port와 configUSE_MPU_WRAPPERS_V1에 따라 wrapper 경로가 다릅니다. 오래된 raise-privilege wrapper 하나를 모든 공용 API의 현재 구현으로 설명하지 않습니다. v2에는 system-call stack, entry/exit와 kernel object/버퍼 접근 검사 경로가 있습니다.

xTaskCreateRestricted의 uxPriority에 **portPRIVILEGE_BIT를 설정하면 privileged task**입니다. unprivileged 예에 이 bit를 OR하면 의도와 반대입니다.

```c title="restricted-task.c"
#include "FreeRTOS.h"
#include "task.h"
/* board linker/MPU layout에 맞춰 배치해야 하는 1024-byte aligned stack. */
static StackType_t user_stack[256] __attribute__((aligned(1024)));
BaseType_t create_unprivileged_task(TaskFunction_t entry, TaskHandle_t *out)
{
    if (entry == NULL || out == NULL) return pdFAIL;
    TaskParameters_t params = {
        .pvTaskCode = entry, .pcName = "user", .usStackDepth = 256,
        .pvParameters = NULL, .uxPriority = 2, /* privilege bit 없음 */
        .puxStackBuffer = user_stack,
        .xRegions = { { NULL, 0, 0 }, { NULL, 0, 0 }, { NULL, 0, 0 } }
    };
    return xTaskCreateRestricted(&params, out);
}
```

이 예는 한 번만 생성하는 API 사용/compile 예입니다. user code section, linker symbol, MPU region·권한, system-call stack와 객체 ACL 설정을 포함한 실행 image가 아닙니다. task가 사용할 모든 데이터·서비스의 권한도 product에서 준비해야 합니다.

## Zephyr USERSPACE

Zephyr 3.7.0 USERSPACE는 K_USER thread와 kernel object permission을 구분합니다. syscall handler는 객체 주소·종류·초기화 상태·호출자의 권한과 버퍼 접근을 검증합니다. 모든 함수가 항상 SVC를 발생시키거나 모든 architecture가 SVC를 사용하는 것은 아닙니다.

새 user thread가 먼저 실행되어 권한 없는 object를 쓰는 race를 피하려면 생성 시 K_FOREVER로 실행을 보류하고, 필요한 object grant와 memory domain을 준비한 뒤 k_thread_start를 호출하는 흐름을 사용합니다. object grant만으로 message buffer의 memory 접근 권한까지 생기지는 않습니다.

## Capability 검사

아래는 syscall 번호에 대한 허용 bit 검사만 분리한 **모델**입니다. 실제 kernel dispatch·현재 task 조회·객체/포인터 검증을 대신하지 않습니다. shift 전에 범위를 확인해야 합니다.

```c title="syscall-policy.c"
#include <stdbool.h>
#include <stdint.h>
bool syscall_allowed(uint32_t mask, unsigned number, unsigned table_count)
{
    return number < table_count && number < 32u &&
           (mask & (UINT32_C(1) << number)) != 0;
}
```

서비스별 권한, object ownership, 허용 buffer와 size 산술, fault-safe copy 및 동시 변경 가능성을 함께 확인합니다. 임의 bitmap 하나를 seL4 전체 capability 모델이나 인증 증거와 동일시하지 않습니다.

## Syscall Overhead

trap 진입·검증·서비스 본체·scheduling·복귀를 구분해 측정합니다. compiler·clock·memory wait·FP frame·MPU wrapper revision·IRQ 간섭에 따라 달라집니다. 원시 소스/명령/분포가 없는 M4/A53/Linux cycle·ns 표는 보편 비용으로 제시하지 않습니다.

Linux vDSO처럼 일부 서비스를 user mode에서 제공하는 설계도 있지만 이는 RTOS의 임의 privileged API를 검증 없이 우회해도 된다는 뜻은 아닙니다.

## TrustZone 한 줄

Cortex-M33+의 TrustZone-M은 *secure / non-secure*의 또 다른 경계를 만듭니다. non-secure 영역의 FreeRTOS가 secure 영역의 *crypto, secure boot, secure storage*를 호출하려면 `SG`(Secure Gateway) 명령으로 *NSC veneer*를 거칩니다. user/kernel과는 별개의 축으로 동작하며, 자세한 내용은 다음 편 4-11에서 다룹니다.

## 격리 적용의 판단

untrusted code·자산·fault containment·memory layout·deadline 요구를 먼저 정합니다. syscall/MPU/PMP·secure domain·별도 core 등 선택의 비용과 보호 범위를 비교합니다. 같은 vendor firmware라는 이유만으로 격리가 불필요하거나 테스트·정적 분석이 runtime memory 격리를 보장한다고 결론내리지 않습니다.

특정 안전 표준 등급이면 모든 application task가 user mode이고 fault마다 partition만 재시작한다는 보편 규칙도 없습니다. 제품의 실제 구현·요구와 검증 증거가 필요합니다.

## 자주 보는 함정과 안티패턴

- user pointer·length를 검사하지 않고 privileged service에 넘기지 않습니다.
- 번호 범위 검사 전에 bitmap shift나 dispatch table indexing을 하지 않습니다.
- privileged bit·wrapper v1/v2·frame layout을 다른 port의 예에서 복사하지 않습니다.
- syscall ABI·object/payload lifetime과 fault 대응도 계약으로 관리합니다.

## 정리

- 권한 mode와 실제 memory permission·syscall 검증은 각각 필요합니다.
- Cortex-M SVC frame은 PSP 하나로 일반화할 수 없고 RISC-V trap 대상은 delegation을 따릅니다.
- FreeRTOS V11.2.0 restricted task의 privilege bit와 MPU wrapper revision을 확인합니다.
- Zephyr object grant는 사용자 buffer 접근 권한을 대신하지 않습니다.
- compile/model 검사는 실제 fault 격리·권한 상승 저항·target latency 검증이 아닙니다.

## 근거 자료

- [FreeRTOS V11.2.0 ARM_CM4_MPU](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0/portable/GCC/ARM_CM4_MPU), [mpu_wrappers_v2.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/Common/mpu_wrappers_v2.c).
- [Zephyr 3.7.0 kernel objects](https://docs.zephyrproject.org/3.7.0/kernel/usermode/kernelobjects.html).
- [RISC-V privileged ISA](https://docs.riscv.org/reference/isa/priv/machine.html): environment call·delegation·trap 상태.



다음 편은 [4-11 TrustZone과 TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)에서 secure / non-secure 분리를 다룹니다.

## 관련 항목

- [2-05: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [2-07: RISC-V Context Switch](/blog/embedded/rtos/practical-internals/part2-07-riscv-context)
- [4-06: Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
- [4-09: Software Timer](/blog/embedded/rtos/practical-internals/part4-09-software-timer)
