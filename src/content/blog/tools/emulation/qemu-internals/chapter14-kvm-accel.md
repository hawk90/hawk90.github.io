---
title: "Ch 14: KVM Accelerator Interface"
date: 2026-05-17T14:00:00
description: "Accel ops·KVM_RUN·MMIO trap — KVM과 QEMU의 만남."
tags: [QEMU, kvm, accelerator, kvm-run, irqfd]
series: "QEMU Internals"
seriesOrder: 14
draft: true
---

KVM은 Linux kernel의 *hardware virtualization driver*입니다. CPU의 VT-x/AMD-V/ARM EL2/RISC-V H-extension을 사용해 *native에 가까운* VM 실행을 제공합니다. QEMU는 KVM의 `/dev/kvm` ioctl을 통해 그 기능을 *오케스트레이션*합니다. 이 둘의 *인터페이스*가 이 장의 주제.

## KVM과 QEMU의 분업

| 영역 | KVM | QEMU |
|------|-----|------|
| CPU 명령 실행 | VT-x로 *직접* | (KVM에 위임) |
| Memory translation | EPT/NPT (HW) | memory slot 등록 |
| Timer/IPI | KVM emulation | configuration |
| MMIO trap | KVM이 trap → QEMU dispatch | device emulation |
| Interrupt injection | irqfd | event source 등록 |

KVM이 *fast path*를, QEMU가 *device emulation*과 *configuration*을 담당.

## KVM API 흐름

```c
int kvm = open("/dev/kvm", O_RDWR);
int vmfd = ioctl(kvm, KVM_CREATE_VM, 0);

/* memory region 등록 */
struct kvm_userspace_memory_region mem = {
    .slot = 0,
    .guest_phys_addr = 0x40000000,
    .memory_size = 1 << 30,
    .userspace_addr = (uint64_t)mmap_addr,
};
ioctl(vmfd, KVM_SET_USER_MEMORY_REGION, &mem);

int vcpufd = ioctl(vmfd, KVM_CREATE_VCPU, 0);

/* vcpu state */
ioctl(vcpufd, KVM_SET_SREGS, &sregs);
ioctl(vcpufd, KVM_SET_REGS, &regs);

/* run */
struct kvm_run *run = mmap(NULL,
    ioctl(kvm, KVM_GET_VCPU_MMAP_SIZE, 0),
    PROT_READ | PROT_WRITE, MAP_SHARED, vcpufd, 0);

while (1) {
    ioctl(vcpufd, KVM_RUN, 0);
    switch (run->exit_reason) {
    case KVM_EXIT_MMIO: handle_mmio(run); break;
    case KVM_EXIT_HLT:  return 0;
    case KVM_EXIT_INTR: continue;
    }
}
```

이 *50줄 코드*가 QEMU가 KVM 사용하는 *기본 골격*. QEMU 안의 `accel/kvm/kvm-all.c`가 이 패턴.

## AccelOps abstraction

QEMU는 KVM·TCG·Hvf·WHPX를 *공통 인터페이스*로 다룹니다.

```c
typedef struct AccelClass {
    /* CPU initialization */
    void (*cpu_realize)(CPUState *cpu, Error **errp);
    /* run vcpu */
    int (*cpu_thread_fn)(void *arg);
    /* handle exit */
    int (*handle_interrupt)(...);
    /* ... */
} AccelClass;
```

`-accel kvm`이 `KVMAccelClass`를 선택해 QEMU의 vCPU loop을 *KVM_RUN으로* 위임.

## KVM_RUN exit reasons

KVM은 *몇 가지 이유*로 guest 실행을 멈추고 QEMU에 control return.

| Exit reason | 의미 | QEMU action |
|-------------|------|-------------|
| `KVM_EXIT_MMIO` | guest가 MMIO 접근 | device callback 호출 |
| `KVM_EXIT_IO` | port I/O (x86 only) | device callback |
| `KVM_EXIT_HLT` | HLT/WFI | sleep until interrupt |
| `KVM_EXIT_INTR` | host signal | check + resume |
| `KVM_EXIT_INTERNAL_ERROR` | KVM 내부 오류 | 보통 fatal |
| `KVM_EXIT_SHUTDOWN` | guest poweroff | QEMU exit |
| `KVM_EXIT_HYPERCALL` | guest의 KVM_HC | paravirt 호출 |
| `KVM_EXIT_DEBUG` | breakpoint | GDB stub에 |
| `KVM_EXIT_FAIL_ENTRY` | hardware 진입 실패 | fatal |

대부분은 MMIO/IO — 모든 device emulation이 이 path를 거침.

## ioeventfd — vmexit 최소화

VirtIO처럼 *자주 일어나는 MMIO write*는 vmexit이 *큰 비용*. **ioeventfd**로 *kernel에서 직접* eventfd signal.

```c
struct kvm_ioeventfd kioeventfd = {
    .addr = 0xfeb00000,    /* doorbell 주소 */
    .len = 4,
    .fd = eventfd,
    .datamatch = 0,        /* 값 무관 */
};
ioctl(vmfd, KVM_IOEVENTFD, &kioeventfd);
```

이후 guest가 `0xfeb00000`에 write하면 *vmexit 없이* eventfd가 trigger. QEMU의 main loop이 그 eventfd를 watch해서 처리.

## irqfd — interrupt injection 가속

반대 방향. QEMU가 *guest에 IRQ inject*할 때.

```c
struct kvm_irqfd kirqfd = {
    .fd = eventfd,
    .gsi = irq_number,
};
ioctl(vmfd, KVM_IRQFD, &kirqfd);
```

QEMU가 eventfd에 write하면 *kernel이 직접* guest에 IRQ inject. vmexit 없음.

`ioeventfd + irqfd` 조합이 *VirtIO 성능*의 핵심.

## In-kernel IRQ chip

KVM이 *GIC·APIC·PLIC*을 *kernel에서 직접 emulate*.

```bash
qemu-system-x86_64 -enable-kvm -machine kernel_irqchip=on ...
```

option 비교:

| 옵션 | 의미 |
|------|------|
| `kernel_irqchip=on` | KVM이 IRQ chip 직접 |
| `kernel_irqchip=split` | KVM(LAPIC) + QEMU(IOAPIC) |
| `kernel_irqchip=off` | QEMU가 모든 IRQ |

`on`이 최고 성능. `split`은 안정성 + 일부 성능.

## Memory slot

KVM은 *guest physical address space*를 *slot* 단위로 관리.

```c
struct kvm_userspace_memory_region {
    __u32 slot;             /* 0~509 */
    __u32 flags;
    __u64 guest_phys_addr;
    __u64 memory_size;
    __u64 userspace_addr;
};
```

guest의 *각 RAM region*이 하나의 slot. QEMU는 *MemoryListener*로 region 변경을 *KVM slot에 동기화*.

## MMU mode

| Mode | 의미 |
|------|------|
| `shadow` | KVM이 shadow page table 유지 |
| `EPT` (Intel) / `NPT` (AMD) | HW assisted nested paging |
| ARM stage-2 | EPT의 ARM 버전 |

modern x86은 거의 *EPT*. shadow는 legacy.

## vCPU thread model

각 vCPU가 *host의 별도 thread*에서 동작.

```text
QEMU process
├── main thread (event loop, device emulation)
├── vCPU 0 thread (KVM_RUN loop)
├── vCPU 1 thread
├── vCPU 2 thread
└── iothread 0 (block I/O)
```

vCPU thread는 *KVM_RUN ioctl*에서 *대부분의 시간* 보냄. exit 시 main thread에 *device emulation 위임*.

## NMI·SMI

```c
ioctl(vcpufd, KVM_NMI);     /* NMI inject */
```

system management interrupt 등 *특수 IRQ*도 ioctl로.

## KVM 디버깅

GDB stub과 결합.

```bash
qemu-system-x86_64 -enable-kvm -s -S ...
```

KVM mode에서도 GDB stub 동작. KVM이 *KVM_EXIT_DEBUG*로 trap을 QEMU에 위임 → GDB로 전달.

## 흔한 함정

- **권한 부족** — `/dev/kvm`에 user 접근 권한. `kvm` group 필요.
- **CPU 호환성** — host가 VT-x 미지원. `kvm-ok` 또는 `egrep '(vmx|svm)' /proc/cpuinfo` 확인.
- **nested KVM 미지원** — VM 안에서 KVM 시도 시 fail. host에 `nested=1` 옵션 필요.
- **memory slot 최대 510** — large RAM을 작은 slot 다수로 나누면 한도 초과.

## 정리

- **KVM**은 Linux kernel의 hardware virt driver. /dev/kvm + ioctl interface.
- QEMU와의 분업: KVM(CPU·timer·IRQ chip)·QEMU(device·configuration).
- `KVM_RUN` loop가 vCPU 실행의 중심. `kvm_run` 구조체로 exit reason 전달.
- **ioeventfd**·**irqfd**로 vmexit 없는 fast path — VirtIO 성능의 핵심.
- In-kernel IRQ chip(`kernel_irqchip=on`)이 최고 성능.
- Memory slot으로 guest physical address space 관리.
- 각 vCPU가 *별도 host thread*. SMP scaling.

## 다음 장 예고

다음 장은 *비동기 I/O의 핵심* — **coroutine subsystem**. QEMU block layer의 async를 *순차 코드*로 보이게 하는 메커니즘.

## 관련 항목

- [Ch 13: TCG Deep](/blog/tools/emulation/qemu-internals/chapter13-tcg-deep)
- [Ch 15: Coroutine](/blog/tools/emulation/qemu-internals/chapter15-coroutine)
- [QEMU Embedded — Hypervisor](/blog/tools/emulation/qemu-embedded/chapter17-hypervisor)
- [FPGA Driver — VFIO-PCI](/blog/tools/emulation/qemu-fpga-driver/chapter10-vfio-pci-passthrough)
