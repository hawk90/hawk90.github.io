---
title: "4-10: System Call — SVC·ECALL·User/Kernel·MPU/MMU 분리"
date: 2026-05-19T22:00:00
description: "SVC trap (ARM), ECALL (RISC-V). User/kernel privilege. MPU 보호. FreeRTOS MPU."
series: "Practical RTOS Internals"
seriesOrder: 42
tags: [syscall, svc, ecall, mpu, mmu, privilege]
draft: true
---

## 한 줄 요약

> **"System Call = privilege 경계의 합법 통로"** — user task가 kernel 서비스 요청.

## CPU Privilege Level

```text
Cortex-M (PRIMASK·CONTROL.nPRIV):
  Privileged — kernel
  Unprivileged — user task
  
Cortex-A (EL0~EL3):
  EL0 — user
  EL1 — kernel
  EL2 — hypervisor
  EL3 — secure monitor (TF-A)

RISC-V (Machine·Supervisor·User mode):
  M-mode — most privileged
  S-mode — supervisor (Linux kernel)
  U-mode — user
```

User task가 *kernel data 직접 접근 불가* — MPU/MMU 차단.

## SVC — Cortex-M Trap

```c
/* User code */
__asm volatile ("svc #0");

/* SVC handler (kernel mode) */
void SVC_Handler(void) {
    uint32_t *psp = __get_PSP();   /* user stack */
    uint32_t svc_number = ((uint8_t*)psp[6])[-2];   /* PC - 2 (SVC #N) */
    uint32_t arg0 = psp[0];   /* R0 from user */
    /* ... */
    psp[0] = result;   /* return via R0 */
}
```

SVC = *Supervisor Call* instruction. *Immediate value*가 syscall number.

## ECALL — RISC-V Trap

```c
/* User code */
asm volatile ("li a7, %0; ecall" :: "i"(SYSCALL_WRITE));

/* Trap handler (machine/supervisor mode) */
void trap_handler(void) {
    uint64_t cause = csr_read(scause);
    if (cause == 8) {   /* ECALL from U-mode */
        uint64_t syscall_num = read_register(a7);
        /* dispatch */
    }
}
```

`ecall` instruction — trap to higher mode. `mcause`·`scause`로 분류.

## FreeRTOS-MPU Variant

```c
/* Standard FreeRTOS */
xTaskCreate(task, "name", 2048, NULL, 5, &h);   /* privileged */

/* FreeRTOS-MPU */
TaskParameters_t params = {
    .pvTaskCode = task_func,
    .pcName = "name",
    .usStackDepth = 2048,
    .uxPriority = 5,
    .pxStackBuffer = stack,
    .puxStackBuffer = NULL,
    .xRegions = {
        { (void*)0x20002000, 0x100, portMPU_REGION_READ_WRITE },
        { NULL, 0, 0 },
        { NULL, 0, 0 },
    },
};
xTaskCreateRestricted(&params, &h);   /* user mode */
```

User task — MPU로 *허용 region*만 access. API call 시 SVC trap → kernel.

## MPU 보호 region

```text
Cortex-M3/M4: 8 region
Cortex-M7: 16 region
Cortex-M33+: 16 region (TrustZone 결합)

각 region:
  Base addr + size (2^N)
  Permission: privileged R/W·RO·NO·shared user
  Cacheable·Bufferable·Shareable
```

## Capability·Permission Token

```c
/* 어떤 user task가 어떤 서비스 사용 가능한가? */
struct task_caps {
    uint32_t allowed_syscalls;   /* bitmap */
    uint32_t allowed_devices;    /* bitmap */
};

void svc_handler(uint32_t n) {
    struct task_caps *c = current_task->caps;
    if (!(c->allowed_syscalls & (1u << n))) {
        return -EPERM;
    }
    /* dispatch */
}
```

Per-task capability — 권한 분리. Mikrokernel·seL4 핵심.

## Linux User-Space Syscall

```c
/* User */
int fd = open("/dev/foo", O_RDONLY);
read(fd, buf, 100);

/* libc — ARM */
syscall(SYS_read, fd, buf, 100);

/* assembly */
mov r7, #3        ; SYS_read
svc #0

/* Kernel trap handler */
asmlinkage long sys_read(int fd, char __user *buf, size_t count) {
    /* fd validate */
    /* copy_from_user — page fault safe */
    /* ... */
}
```

Linux — *table-based dispatch* (`sys_call_table[]`).

## Performance — Syscall Overhead

```text
Cortex-M3 SVC: ~20 cycle
Cortex-A53 SVC: ~50 cycle (no page table walk)
Linux x86 syscall: ~100-300 ns
Linux ARM syscall: ~80-200 ns
```

User → kernel → user — *각 50+ cycle*. Heavy use는 *vDSO*·*shared memory*로 회피.

## vDSO — Linux Fast Path

```text
일부 syscall (gettimeofday, getpid) — kernel data를 *user space에 매핑*
  → syscall 없이 직접 read
  → 100x 빠름
```

ARM64 — `__vdso_clock_gettime` 등. Embedded Linux 표준.

## TrustZone — Cortex-M33

```text
Secure 영역 — TF-M (Trusted Firmware-M)
Non-secure 영역 — FreeRTOS·application

Secure call (NSC veneer):
  Non-secure → SG instruction → Secure handler
  
용도: secure boot, crypto, secure storage
```

자동차·IoT — *비밀번호·키·secure boot*에 활용.

## Microkernel — 모든 것이 Syscall

```text
seL4·QNX·L4:
  IPC, file system, network — *user task에서 구현*
  Kernel은 *최소* — scheduling, IPC, memory
  
모든 IPC = syscall
→ syscall 효율이 *전체 성능 결정*
```

seL4 — *수십 cycle* IPC. 인증 가능한 microkernel.

## Embedded RTOS — Privilege 분리 안 함

```text
FreeRTOS (기본), Zephyr (기본), ThreadX:
  모든 task = privileged
  Syscall = *직접 함수 호출* (overhead 0)
  
장점 — 빠름, 단순
단점 — buggy task가 kernel data 손상 가능
```

`-O2` 컴파일러 + good practice면 충분 — 대부분 임베디드.

## Safety-Critical — Privilege 분리 필요

```text
DO-178C Level A·B:
  Partitioning required
  Each partition isolated
  
→ ARINC-653 (avionics 표준):
  Time partition + Space partition
  → MMU·MPU로 격리

→ FreeRTOS-MPU + 각 task 별 MPU region
```

자동차 인증 ECU·민항 avionics — *partitioning 필수*.

## 자주 하는 실수

> ⚠️ User에서 kernel pointer 접근

```c
void user_task(void) {
    extern struct task_t pxCurrentTCB;
    pxCurrentTCB.priority = 0;   /* ← MPU fault */
}
```

→ syscall로 요청.

> ⚠️ Syscall 안 priv check

```c
void svc_set_priority(int new_prio) {
    current_task->priority = new_prio;   /* ← any task가 자기 priority 변경 OK? */
}
```

→ capability·permission check.

> ⚠️ SVC handler 안 IRQ disable

```c
void SVC_Handler(void) {
    /* ← ISR이 중간에 preempt 가능 — race */
}
```

→ critical section 또는 stack-based isolation.

> ⚠️ User stack에서 kernel work

```c
void SVC_Handler(void) {
    uint32_t buf[256];   /* ← MSP에서 사용 — OK */
    /* 그러나 PSP (user stack)에서 사용은 위험 */
}
```

Cortex-M SVC → MSP 자동 전환.

## 정리

- Syscall = **privilege 경계 합법 통로**.
- ARM **SVC** / RISC-V **ECALL**.
- **FreeRTOS-MPU**·**Zephyr USERSPACE** — user/kernel 분리.
- vDSO·shared memory — syscall 회피 fast path.
- TrustZone — *secure 영역* 분리 (Cortex-M33+).
- 안전 critical (avionics) — **partitioning 필수**.

다음 편은 **TrustZone·TF-M**.

## 관련 항목

- [4-09: Software Timer](/blog/embedded/rtos/practical-internals/part4-09-software-timer)
- [4-11: TrustZone·TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
