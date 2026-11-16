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

FreeRTOS 기본 구성에서는 *모든 task가 같은 권한*으로 동작합니다. 지금까지 이 시리즈의 QEMU 실행이 모두 그랬습니다. RTOS API 호출이 그냥 함수 호출이라 trap 비용은 없지만, 어떤 task의 잘못된 포인터 하나가 kernel 자료구조를 덮을 수 있습니다. 4-06의 stack overflow가 커널 `.bss`를 덮은 것이 그 예입니다.

system call은 은행 창구와 같습니다. 손님(user task)은 금고(kernel 메모리)에 직접 들어가지 못하고, 창구(SVC/ECALL)에서 용건을 말하면 직원(kernel)이 확인하고 대신 처리합니다. 창구가 의미 있으려면 금고 문이 실제로 잠겨 있어야 합니다(MPU/MMU).

이 글은 FreeRTOS-Kernel V11.2.0(commit `0adc196d`)의 `ARM_CM3_MPU` port와 MPU wrapper v2를 QEMU 11.1.3 `mps2-an385`에서 실제로 돌리고, SVC trap을 bare metal로 따라갑니다(`arm-none-eabi-gcc` 16.2.0). Zephyr v3.7.0과 RISC-V는 문서와 소스로만 확인했습니다.

## CPU Privilege Level

대표 아키텍처의 권한 레벨입니다.

ARM Cortex-M

- Handler mode → 항상 privileged
- Thread mode → `CONTROL.nPRIV`(bit 0)로 결정 (0: privileged, 1: unprivileged). 아래 FreeRTOS-MPU 실행에서 user task가 읽은 `CONTROL`은 `0x3`이었습니다(nPRIV=1, SPSEL=1로 PSP 사용).

ARM Cortex-A (ARMv8)

- EL0 — user (application)
- EL1 — OS kernel
- EL2 — hypervisor
- EL3 — secure monitor (TF-A)

RISC-V

- M-mode — machine (가장 높은 권한, 펌웨어)
- S-mode — supervisor (Linux kernel)
- U-mode — user (application)

권한 모드만으로는 메모리가 막히지 않습니다. unprivileged가 어디를 읽고 쓸 수 있는지는 MPU/MMU/PMP region이 정합니다. 아래 실행에서 그 차이가 그대로 보입니다.

## SVC — Cortex-M의 Syscall Trap

Cortex-M의 SVC는 동기 exception을 일으킵니다. immediate 번호와 register ABI는 OS가 정합니다. 아래 번호 1은 이 글의 교육용 계약이며 FreeRTOS나 Linux의 syscall 번호가 아닙니다.

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

handler는 먼저 hardware가 쌓은 frame이 MSP와 PSP 중 어디에 있는지 알아야 합니다. EXC_RETURN(진입 때의 LR)의 bit 2가 그 표시입니다. bare-metal harness에 짧은 naked handler를 붙여 확인했습니다. LR bit 2로 MSP/PSP를 고른 뒤 C 함수에 frame을 넘기고, C 함수는 stacked PC 바로 앞의 16-bit SVC 명령에서 immediate를 읽고 `frame[0]`(stacked R0)에 결과를 씁니다.

```c
__attribute__((naked)) void SVC_Handler(void) {
    __asm volatile("tst lr, #4
 ite eq
 mrseq r0, msp
 mrsne r0, psp
"
                   "mov r1, lr
 push {lr}
 bl svc_c
 pop {pc}
");
}
```

위 `call_demo_write()`를 privileged thread(MSP)에서 한 번, `CONTROL`을 3으로 바꿔 unprivileged thread(PSP)에서 한 번 불렀습니다.

```text
SVC handler: EXC_RETURN=0xfffffff9 (MSP), imm=1, r0=1 r1=0x203fffe8 r2=5, stacked PC=0x000007f8
call_demo_write from privileged thread (MSP): returned 5
SVC handler: EXC_RETURN=0xfffffffd (PSP), imm=1, r0=2 r1=0x20000200 r2=3, stacked PC=0x0000081a
call_demo_write from unprivileged thread (PSP): returned 3
```

EXC_RETURN이 `0xfffffff9`이면 MSP, `0xfffffffd`이면 PSP였고, 두 경우 모두 handler가 쓴 stacked R0가 호출자의 반환값이 됐습니다. PSP만 가정하고 `PSP[6]`을 읽는 handler는 첫 번째 호출에서 엉뚱한 주소를 읽었을 것입니다. FP를 쓰는 core(Cortex-M4F 등)에서는 frame이 더 길어지는데, 이 M3 실행에서는 확인하지 않았습니다. 두 번째 호출의 `r1`이 달라진 것은 stack을 바꾼 뒤 컴파일러가 `msg` 주소를 새 SP 기준으로 다시 계산했기 때문이고, 실제 OS라면 task는 처음부터 자기 PSP에서 시작합니다.

## ECALL — RISC-V의 Syscall Trap

RISC-V privileged ISA(v20260120, Machine-Level ISA)의 `mcause` 표에서 ECALL은 호출한 mode마다 다른 code를 받습니다. U-mode는 8, S-mode는 9, M-mode는 11입니다. trap은 기본적으로 M-mode로 가고, `medeleg`의 해당 bit를 세우면 S-mode나 U-mode에서 난 그 trap을 S-mode handler로 넘깁니다. 그래서 U-mode의 ECALL이 S-mode로 갈지 M-mode로 갈지는 `medeleg` 설정이 정합니다.

같은 문서는 `mepc`에 "the instruction that was interrupted or that encountered the exception"의 주소가 쓰인다고 적습니다. ECALL의 경우 ECALL 자신의 주소이므로, 돌아갈 때 다음 명령으로 가려면 handler가 `mepc`를 올려야 합니다. FreeRTOS V11.2.0 RISC-V port는 이 일을 `portASM.S:344-345`에서 합니다. 그런데 이 port는 synchronous exception 전체에 똑같이 `addi a1, a1, 4`를 합니다. ECALL 말고 다른 synchronous exception(예: 잘못된 load)이 나도 다음 명령으로 넘어가는 셈이라, 이 port에서 ECALL 이외의 exception은 복구가 아니라 진단 대상으로 봐야 합니다. syscall 번호를 a7에, 인자를 a0부터 두는 것은 OS가 정하는 ABI이지 ECALL 명령의 규칙이 아닙니다. 이 RISC-V 내용은 실행하지 않았습니다.

## FreeRTOS-MPU

V11.2.0에서 `configUSE_MPU_WRAPPERS_V1`의 기본값은 0이라(`include/FreeRTOS.h:78-80`) MPU port는 wrapper v2(`portable/Common/mpu_wrappers_v2.c`)를 씁니다. task가 `xQueueSend()`를 부르면 실제로는 `MPU_xQueueGenericSend()`가 불립니다. 이 naked 함수는 `CONTROL` bit 0을 보고 privileged면 `MPU_xQueueGenericSendImpl`로 바로 분기하고, unprivileged면 `svc SYSTEM_CALL_xQueueGenericSend`를 실행합니다(`ARM_CM3_MPU/mpu_wrappers_v2_asm.c:942-958`). kernel은 그 번호로 `uxSystemCallImplementations[]` 표(`mpu_wrappers_v2.c:5030`)에서 구현을 찾아 privileged로 실행합니다.

`xTaskCreateRestricted()`의 `uxPriority`에 **`portPRIVILEGE_BIT`(`0x80000000`, `ARM_CM3_MPU/portmacro.h:79`)를 OR하면 privileged task**입니다(`include/task.h:340-342`). unprivileged task를 만들려면 이 bit를 넣지 않습니다.

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

이 코드를 그대로 `ARM_CM3_MPU` port에 넣어 돌렸습니다. port는 linker script에 `__privileged_functions_start__`·`__privileged_data_start__`·`__syscalls_flash_start__` 같은 심볼을 요구하므로(`ARM_CM3_MPU/port.c:1106-1111`, `:411-412`), privileged 함수 32 KiB, system call 4 KiB, privileged data 128 KiB를 각각 크기에 맞춰 정렬한 script를 썼습니다. 한 가지 함정이 있었습니다. `uxSystemCallImplementations[]`가 초기값을 가진 `PRIVILEGED_DATA`라서, privileged data section을 NOLOAD로 두면 표가 0으로 남고 첫 system call이 주소 0 근처로 뛰어 Reset_Handler를 다시 실행했습니다. section을 flash에서 복사되게 고친 뒤의 결과입니다. user task는 queue handle을 전역 변수 `q`에서 읽습니다.

```text
$ qemu-system-arm -M mps2-an385 -nographic -semihosting-config enable=on,target=native,userspace=on -kernel build/mpudemo.elf
xTaskCreateRestricted -> 1, user_stack at 0x20020800
user task: CONTROL=0x3 (nPRIV=1)
MemManage CFSR=0x00000082 MMFAR=0x20020400
```

user task는 queue에 닿기도 전에 `MMFAR=0x20020400`에서 멈췄습니다. 그 주소가 `.bss`의 전역 `q`입니다. unprivileged task에게 열린 것은 flash(읽기)와 자기 stack뿐이고, 평범한 전역 변수도 `xRegions`로 따로 열어 주지 않으면 읽을 수 없습니다. 그래서 handle을 `pvParameters`로 넘기고, 이어서 `PRIVILEGED_DATA` 변수에 쓰게 한 변형을 돌렸습니다.

```text
user task: CONTROL=0x3 (nPRIV=1)
user task: xQueueSend via MPU wrapper -> 1, messages waiting=1
user task: now writing PRIVILEGED_DATA kernel_secret at 0x20000000
  faulting PC=0x00009730
MemManage CFSR=0x00000082 MMFAR=0x20000000
```

queue send는 wrapper를 통해 성공했고, kernel 쪽 변수에 직접 쓰려는 순간 MemManage가 났습니다. 창구를 통한 요청은 처리되고 금고 문은 잠겨 있습니다. QEMU에서 unprivileged 코드의 semihosting(`printf`)을 허용하려고 `userspace=on`을 붙였습니다.

## Zephyr USERSPACE

Zephyr v3.7.0의 `doc/kernel/usermode/kernelobjects.rst`는 user thread가 기본적으로 자기 thread 객체 말고는 kernel 객체를 쓸 수 없고, 쓰려면 권한을 받아야 한다고 설명합니다(`:155-175`). 방법은 `K_INHERIT_PERMS`로 부모 권한을 물려받거나, 권한이 있는 thread가 `k_object_access_grant()`(여러 개는 `k_thread_access_grant()`)로 주거나, supervisor thread가 `k_object_access_all_grant()`로 공개하는 것입니다. 이 권한은 kernel 객체에 대한 것이고, 위 FreeRTOS 실행의 전역 `q`처럼 데이터 메모리를 읽고 쓰는 권한은 따로(Zephyr에서는 memory domain으로) 줘야 합니다. Zephyr는 이 글에서 실행하지 않았습니다.

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

`number < 32u` 검사가 shift보다 먼저 오는 것이 핵심입니다. C에서 32 이상으로 shift하는 것은 undefined behavior라, 순서가 바뀌면 검사 자체가 믿을 수 없게 됩니다. 실제 syscall은 이 번호 검사 뒤에 객체 handle과 user buffer의 주소·길이가 그 task에게 허용된 범위인지도 확인해야 합니다. 위 FreeRTOS 실행에서 user task가 넘긴 `&v`(자기 stack)는 그래서 받아들여졌습니다.

## Syscall Overhead

이 글에서는 syscall 비용을 재지 않았습니다. QEMU의 시간은 실리콘의 시간이 아니고, 예전 판의 M4/A53/Linux cycle·ns 표는 원시 자료가 없어 지웠습니다. 구조로 보면 MPU wrapper v2의 queue send는 일반 함수 호출에 SVC 진입·복귀 두 번과 system call stack 전환이 더해집니다.

## TrustZone 한 줄

ARMv8-M의 TrustZone은 privileged/unprivileged와 별개로 secure/non-secure라는 두 번째 경계를 만듭니다. non-secure 쪽에서 secure 함수를 부르는 입구가 NSC(non-secure callable) 영역의 `SG` 명령입니다. 다음 편 4-11에서 다룹니다.

## 격리 적용의 판단

격리는 공짜가 아닙니다. 위 실행에서 보듯 unprivileged task는 전역 변수 하나를 읽으려 해도 region을 받아야 하고, `ARM_CM3_MPU` port는 task마다 stack 외에 region 3개(`xRegions`, `portmacro.h:94-96`)만 더 줄 수 있습니다. 그래서 외부에서 받은 코드, 통신 parser처럼 잘못될 가능성이 큰 task를 골라 unprivileged로 돌리고, 나머지는 privileged로 두는 식으로 나눕니다. 이 글은 안전 표준이 격리를 어떻게 요구하는지는 다루지 않습니다.

## 자주 보는 함정과 안티패턴

- user pointer·length를 검사하지 않고 privileged service에 넘깁니다. kernel이 user 대신 커널 메모리를 덮게 됩니다.
- 번호 범위 검사 전에 bitmap shift나 dispatch table indexing을 합니다.
- `PRIVILEGED_DATA`를 NOLOAD로 둡니다. 위 실행처럼 초기값 있는 system call 표가 0이 됩니다.
- unprivileged task가 전역 변수를 읽는 코드를 그대로 둡니다. region을 주지 않으면 MemManage입니다.
- SVC handler가 PSP만 가정합니다. MSP에서 부른 SVC의 frame을 못 읽습니다.

## 정리

- FreeRTOS V11.2.0 `ARM_CM3_MPU` + wrapper v2에서 unprivileged task의 `xQueueSend()`는 성공했고, `PRIVILEGED_DATA` 쓰기와 열지 않은 전역 변수 읽기는 MemManage로 막혔습니다.
- SVC frame은 EXC_RETURN bit 2로 MSP(`0xfffffff9`)와 PSP(`0xfffffffd`)를 가려 읽습니다.
- `portPRIVILEGE_BIT`를 넣으면 privileged task입니다.
- RISC-V ECALL의 cause는 U/S/M에서 8/9/11이고, 어디서 처리할지는 `medeleg`가 정합니다.
- Zephyr의 객체 권한과 메모리 접근 권한은 따로 줍니다.

## 근거 자료

- [FreeRTOS V11.2.0 ARM_CM4_MPU](https://github.com/FreeRTOS/FreeRTOS-Kernel/tree/V11.2.0/portable/GCC/ARM_CM4_MPU), [mpu_wrappers_v2.c](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/Common/mpu_wrappers_v2.c).
- [Zephyr 3.7.0 kernel objects](https://docs.zephyrproject.org/3.7.0/kernel/usermode/kernelobjects.html).
- [RISC-V privileged ISA v20260120, Machine-Level ISA](https://docs.riscv.org/reference/isa/v20260120/priv/machine.html): `mcause` code, `medeleg`, `mepc`.
- [FreeRTOS V11.2.0 RISC-V portASM.S](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/portable/GCC/RISC-V/portASM.S).



다음 편은 [4-11 TrustZone과 TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)에서 secure / non-secure 분리를 다룹니다.

## 관련 항목

- [2-05: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [2-07: RISC-V Context Switch](/blog/embedded/rtos/practical-internals/part2-07-riscv-context)
- [4-06: Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
- [4-09: Software Timer](/blog/embedded/rtos/practical-internals/part4-09-software-timer)
