---
title: "4-10: System Call — SVC, ECALL, User/Kernel 분리, FreeRTOS-MPU"
date: 2026-05-19T22:00:00
description: "MPU/MMU로 user task와 kernel을 분리하는 RTOS의 syscall 구조를 정리합니다. Cortex-M의 SVC trap, RISC-V의 ECALL, FreeRTOS-MPU와 Zephyr USERSPACE의 차이, capability 검사, syscall overhead 측정까지 다룹니다."
series: "Practical RTOS Internals"
seriesOrder: 42
tags: [syscall, svc, ecall, mpu, mmu, privilege, freertos-mpu]
---

## 한 줄 요약

> **"System call은 user task가 kernel 서비스에 접근하는 *유일한 합법 통로*입니다."** — 경계 자체가 안전성을 만듭니다.

## 어떤 문제를 푸는가

대부분의 embedded RTOS는 *모든 task가 같은 권한*으로 동작합니다. FreeRTOS 기본 구성이 그렇고, Zephyr와 ThreadX도 USERSPACE 옵션을 끄면 마찬가지입니다. 빠르고 단순합니다. RTOS API 호출이 *그냥 함수 호출*이므로 overhead가 0에 가깝습니다.

문제는 *한 buggy task가 kernel 자료구조를 직접 손상*시킬 수 있다는 것입니다. 누군가 `pxCurrentTCB`를 잘못 덮어쓰면 scheduler 전체가 깨집니다. 평범한 IoT firmware라면 단위 테스트와 코드 리뷰로 충분히 막을 수 있지만, *DO-178C Level A 항공기*나 *ASIL-D 자동차 ECU*에서는 그 수준의 보장이 부족합니다.

해결책은 *user mode와 kernel mode를 hardware로 분리*하고, 그 사이 통로로 *system call*만 허용하는 것입니다. user task는 직접 kernel data를 못 만지고, 모든 요청은 *SVC 명령*을 거쳐 권한 검사를 받습니다.

이번 편은 ARM Cortex-M의 SVC와 RISC-V의 ECALL, FreeRTOS-MPU와 Zephyr USERSPACE 구조를 비교합니다.

## CPU Privilege Level

대표 아키텍처의 권한 레벨입니다.

```text
ARM Cortex-M:
  Handler mode      → 항상 privileged
  Thread mode       → CONTROL.nPRIV로 결정
                      nPRIV=0: privileged
                      nPRIV=1: unprivileged

ARM Cortex-A (ARMv8):
  EL0 — user (application)
  EL1 — OS kernel
  EL2 — hypervisor
  EL3 — secure monitor (TF-A)

RISC-V:
  M-mode — machine (가장 높은 권한, 펌웨어)
  S-mode — supervisor (Linux kernel)
  U-mode — user (application)
```

unprivileged task는 *kernel 영역의 메모리를 직접 access 불가*입니다. MPU 또는 MMU가 hardware로 차단합니다. 위반하면 MemManage fault나 page fault가 발생합니다.

## SVC — Cortex-M의 Syscall Trap

Cortex-M에서 user task가 kernel 서비스를 요청하려면 `svc` 명령을 씁니다. *예외*로 분류되어 즉시 SVC_Handler로 분기합니다.

```c
/* User task에서 호출 */
static inline int sys_write(int fd, const void *buf, size_t n) {
    register int      r0 __asm("r0") = fd;
    register const void *r1 __asm("r1") = buf;
    register size_t   r2 __asm("r2") = n;
    register int      ret __asm("r0");
    __asm volatile (
        "svc #1\n"       /* syscall #1 = write */
        : "=r"(ret)
        : "r"(r0), "r"(r1), "r"(r2)
        : "memory"
    );
    return ret;
}
```

SVC 명령은 *immediate*에 syscall number를 담을 수 있습니다(`svc #N`). handler는 stacked PC에서 명령을 역추적해 N을 읽어냅니다.

```c
void SVC_Handler(void) {
    /* user task의 PSP를 가져옴 */
    uint32_t *psp = (uint32_t*)__get_PSP();

    /* PSP[6] = stacked PC = SVC 명령 *다음* 주소
       SVC 명령 = PC-2, 명령의 LSB가 syscall number */
    uint16_t *svc_instr = (uint16_t*)psp[6] - 1;
    uint8_t   svc_num   = *svc_instr & 0xFF;

    /* arg = R0, R1, R2, R3 */
    uint32_t r0 = psp[0];
    uint32_t r1 = psp[1];
    uint32_t r2 = psp[2];
    uint32_t r3 = psp[3];

    /* dispatch */
    uint32_t ret = syscall_dispatch(svc_num, r0, r1, r2, r3);

    /* return value를 R0에 기록 (stacked) */
    psp[0] = ret;
}
```

SVC_Handler는 *handler mode*에서 실행되므로 자동으로 privileged입니다. MSP를 사용해 user stack과 분리됩니다. 처리가 끝나고 `bx lr`로 return하면 hardware가 *user mode + PSP*로 복귀시킵니다.

## ECALL — RISC-V의 Syscall Trap

RISC-V는 `ecall` 명령으로 *다음 상위 모드의 trap*을 발생시킵니다. U-mode에서 `ecall`은 S-mode 또는 M-mode trap이 됩니다.

```c
/* User code */
static inline long sys_write(int fd, const void *buf, size_t n) {
    register long a0 __asm("a0") = fd;
    register const void *a1 __asm("a1") = buf;
    register size_t a2 __asm("a2") = n;
    register long a7 __asm("a7") = SYS_write;
    register long ret __asm("a0");
    __asm volatile ("ecall"
        : "=r"(ret)
        : "r"(a0), "r"(a1), "r"(a2), "r"(a7)
        : "memory");
    return ret;
}
```

```c
void trap_handler(void) {
    uint64_t cause = csr_read(scause);
    if (cause == CAUSE_USER_ECALL) {        /* 8 */
        uint64_t num = read_reg(a7);
        long     a0_ = read_reg(a0);
        long     a1_ = read_reg(a1);
        long     a2_ = read_reg(a2);
        long     ret = syscall_dispatch(num, a0_, a1_, a2_);
        write_reg(a0, ret);
        /* sepc += 4 (다음 명령으로) */
        csr_write(sepc, csr_read(sepc) + 4);
    }
    /* mret 또는 sret로 user mode 복귀 */
}
```

ARM과 사상은 같습니다. *명령으로 trap → handler가 dispatch → 결과를 register에 → 복귀*. argument convention만 ABI에 따라 다릅니다(ARM은 R0-R3, RISC-V는 A0-A5 + A7).

## FreeRTOS-MPU

FreeRTOS는 *MPU variant*를 별도로 제공합니다. `xTaskCreateRestricted`로 만든 task는 *unprivileged*로 동작하며, 허용 region만 access할 수 있습니다.

```c
static StackType_t  user_stack[2048];
static uint8_t      user_data[256] __attribute__((aligned(256)));

const TaskParameters_t params = {
    .pvTaskCode    = user_task_fn,
    .pcName        = "user",
    .usStackDepth  = 2048,
    .pvParameters  = NULL,
    .uxPriority    = 3 | portPRIVILEGE_BIT,  /* bit 미설정 = unprivileged */
    .puxStackBuffer = user_stack,
    .xRegions = {
        { user_data, sizeof(user_data),
          portMPU_REGION_READ_WRITE | portMPU_REGION_EXECUTE_NEVER },
        { NULL, 0, 0 },
        { NULL, 0, 0 },
    },
};
xTaskCreateRestricted(&params, NULL);
```

user task가 *허용되지 않은 메모리에 접근*하면 MemManage fault가 즉시 발생합니다. RTOS API 호출은 어떻게 할까요. FreeRTOS-MPU는 *모든 공용 API를 SVC wrapper*로 감쌉니다.

```c
/* MPU port의 API wrapper */
BaseType_t MPU_xQueueSend(QueueHandle_t q, const void *item, TickType_t to) {
    BaseType_t ret;
    extern BaseType_t xPortRaisePrivilege(void);
    BaseType_t prev = xPortRaisePrivilege();    /* SVC → privileged */
    ret = xQueueGenericSend(q, item, to, 0);
    vPortResetPrivilege(prev);                  /* 다시 unprivileged */
    return ret;
}
```

`xPortRaisePrivilege`가 내부에서 `svc`를 호출해 *일시적으로 privileged mode로 승격*합니다. API 처리 후 *원래 권한으로 복귀*합니다.

## Zephyr USERSPACE

Zephyr는 같은 사상을 *macro 기반*으로 표현합니다.

```c
K_THREAD_STACK_DEFINE(user_stack, 2048);
struct k_thread user_thr;

void user_entry(void *a, void *b, void *c) {
    /* unprivileged 영역 */
    k_msgq_put(&cmd_q, &msg, K_FOREVER);
}

k_thread_create(&user_thr, user_stack,
                K_THREAD_STACK_SIZEOF(user_stack),
                user_entry, NULL, NULL, NULL,
                5, K_USER, K_NO_WAIT);   /* K_USER 플래그 */

k_thread_access_grant(&user_thr, &cmd_q);   /* 사용 가능 객체 명시 */
```

`K_USER` 플래그로 만든 thread는 *unprivileged*입니다. `k_thread_access_grant`로 *명시적으로 허용된 kernel object*만 사용할 수 있습니다. capability-based 모델입니다.

내부에서는 *Zephyr syscall macro*가 자동 생성된 SVC wrapper를 호출합니다. user mode에서 `k_msgq_put`을 호출하면 *macro가 SVC를 발생*시키고 kernel에서 *권한 검사 후 실제 처리*합니다.

## Capability 검사

권한 분리를 hardware로 한 뒤에도 *어떤 user task가 어떤 서비스를 호출 가능한가*를 결정해야 합니다.

```c
struct task_caps {
    uint32_t allowed_syscalls;   /* bitmap */
    uint32_t allowed_devices;
};

uint32_t syscall_dispatch(uint8_t num, uint32_t a0, uint32_t a1,
                          uint32_t a2, uint32_t a3) {
    struct task_caps *c = current_task->caps;
    if (!(c->allowed_syscalls & (1u << num))) {
        return -EPERM;
    }
    return syscall_table[num](a0, a1, a2, a3);
}
```

L4·seL4 같은 microkernel은 이 capability 모델을 *모든 IPC와 자원 접근*으로 확장합니다. 각 user task가 *capability table*을 갖고, 그 table에 등록된 객체만 호출할 수 있습니다. 인증 가능한 격리의 기본 모델입니다.

## Syscall Overhead

`SVC` 한 번의 비용은 *예외 진입 + dispatch + 복귀*의 합입니다.

```text
Cortex-M4 168 MHz:
  SVC 진입 (HW)              : ~12 cycle
  SVC_Handler dispatch       : ~30 cycle
  syscall 실제 처리           : 가변
  복귀 (HW)                  : ~10 cycle
  ────────────────────────────
  최소 round-trip            : ~60 cycle (≈0.4 µs)

Cortex-A53 1.2 GHz (EL0 → EL1):
  SVC round-trip 최소        : ~50 cycle (≈42 ns)

Linux ARM64 user → kernel:
  일반 syscall                : 80~200 ns
  vDSO 경로 (gettimeofday)    : ~5 ns
```

가벼운 API 호출이라면 *함수 호출(수 cycle) 대비 10배 이상* 차이가 납니다. 이 비용을 줄이는 일반적 기법이 *vDSO*입니다. Linux는 시간 관련 syscall(`clock_gettime` 등)을 *kernel data page를 user에 매핑*하는 방식으로 처리해 *syscall 자체를 건너뜁니다*.

## TrustZone 한 줄

Cortex-M33+의 TrustZone-M은 *secure / non-secure*의 또 다른 경계를 만듭니다. non-secure 영역의 FreeRTOS가 secure 영역의 *crypto, secure boot, secure storage*를 호출하려면 `SG`(Secure Gateway) 명령으로 *NSC veneer*를 거칩니다. user/kernel과는 별개의 축으로 동작하며, 자세한 내용은 다음 편 4-11에서 다룹니다.

## 자동차·항공 — Partitioning이 필수인 도메인

```text
ARINC-653 (avionics):
  Time partition + Space partition
  → 각 partition은 별도 MMU/MPU 영역
  → partition 사이 자원 침범 hardware로 차단
  → 인증 시 격리 증명이 가능

ISO 26262 ASIL-D (automotive):
  Freedom From Interference 요구
  → MPU 기반 partitioning 또는 lock-step CPU
  → mixed-criticality 시 critical과 non-critical 격리
```

이런 환경에서는 *모든 application task가 user mode + 별도 MPU region*입니다. RTOS API 호출은 매번 syscall을 거치고, 권한 위반은 즉시 fault → 격리된 partition만 재시작합니다.

## Embedded RTOS — Privilege 분리를 안 쓰는 경우

대다수 IoT firmware는 *분리를 안 씁니다*. 이유는 단순합니다.

- syscall 비용이 *현실적으로 비쌈* (cycle 수십~수백 배)
- 코드 베이스가 작아 *분리의 이득보다 비용이 큼*
- 인증 요구가 없음

이 경우 *모든 task가 privileged*이고 RTOS API 호출은 *그냥 함수*입니다. 단위 테스트, static analysis, 코드 리뷰로 *런타임 분리 대신 정적 분리*를 보장합니다.

```text
선택 기준:
  ─ 인증 필요 (DO-178C, ASIL-D, IEC 61508)  → 분리 필수
  ─ 다양한 third-party 코드 함께 실행         → 분리 권장
  ─ Single-vendor firmware, 자체 빌드만       → 분리 불필요
  ─ Battery IoT, 극단적 자원 제약              → 분리 회피 가능
```

## 자주 보는 함정과 안티패턴

> 경고 — User task에서 kernel pointer 직접 접근

```c
void user_task(void) {
    extern TCB_t pxCurrentTCB;
    pxCurrentTCB.uxPriority = 0;   /* ← MemManage fault */
}
```

분리가 켜져 있으면 *즉시 fault*입니다. 의도된 동작이면 *syscall로 요청*해야 합니다.

> 경고 — SVC handler에서 권한 검사 누락

```c
uint32_t svc_set_priority(uint32_t new_prio) {
    current_task->priority = new_prio;   /* ← 누구나 자기 priority 변경 가능 */
    return 0;
}
```

권한 분리의 의미가 사라집니다. capability bitmap 또는 role 검사를 *모든 syscall 입구에* 둡니다.

> 경고 — User-provided pointer를 검증 없이 dereference

```c
uint32_t svc_read(int fd, void *buf, size_t n) {
    /* buf가 user 영역에 속하는지 확인 안 함 */
    do_read(fd, buf, n);   /* ← user가 kernel address를 넘기면 손상 */
}
```

Linux의 `copy_from_user` / `copy_to_user`처럼 *user pointer는 별도 검증과 fault-safe copy*를 거쳐야 합니다.

> 경고 — Syscall ABI 변경

syscall number와 argument 순서는 *user binary와의 계약*입니다. 한 번 발행한 ABI를 바꾸면 *기존 user 코드가 silent하게 깨집니다*. 새 syscall은 *새 번호로 추가*하고 기존 것은 유지하는 것이 원칙입니다.

## 정리

- system call은 *user/kernel 경계의 합법 통로*로, 분리가 있는 RTOS에서는 모든 RTOS API 호출이 이 경로를 거칩니다.
- ARM Cortex-M은 `svc` 명령으로 SVC_Handler에 진입하고, RISC-V는 `ecall`로 상위 모드 trap을 일으킵니다.
- FreeRTOS-MPU는 *공용 API를 SVC wrapper로 감싸* user task가 RTOS 서비스를 안전하게 호출하도록 합니다.
- Zephyr USERSPACE는 `K_USER` 플래그와 `k_thread_access_grant`로 *capability-based 격리*를 표현합니다.
- syscall overhead는 함수 호출 대비 *수십~수백 cycle* 추가되며, Linux는 vDSO로 일부를 우회합니다.
- 자동차·항공 인증 도메인은 *partitioning이 필수*이며 syscall + MPU/MMU 분리가 그 기반입니다.
- 일반 IoT firmware는 *비용 대비 이득이 작아* 분리를 생략하고 단위 테스트와 정적 분석으로 보장하는 편이 합리적입니다.

다음 편은 [4-11 TrustZone과 TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)에서 secure / non-secure 분리를 다룹니다.

## 관련 항목

- [2-05: Cortex-M Context Switch](/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context)
- [2-07: RISC-V Context Switch](/blog/embedded/rtos/practical-internals/part2-07-riscv-context)
- [4-06: Stack Overflow 탐지](/blog/embedded/rtos/practical-internals/part4-06-stack-overflow)
- [4-09: Software Timer](/blog/embedded/rtos/practical-internals/part4-09-software-timer)
