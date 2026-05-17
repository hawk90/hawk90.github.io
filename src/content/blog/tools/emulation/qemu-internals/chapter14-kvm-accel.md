---
title: "Ch 14: KVM Accelerator Interface"
date: 2025-09-03T14:00:00
description: "Accel ops·KVM_RUN·MMIO trap — KVM과 QEMU의 만남."
tags: [QEMU, kvm, accelerator, kvm-run]
series: "QEMU Internals"
seriesOrder: 14
draft: true
---

## 이 챕터의 의도

QEMU가 느린 TCG만으로 끝나면 production hypervisor가 될 수 없다. KVM accelerator가 vCPU 명령 실행을 host CPU의 VT-x/AMD-V/ARM EL2에 맡기고, QEMU는 MMIO/PIO trap 처리와 device emulation만 담당한다. 이 장에서는 KVM과 QEMU 사이의 인터페이스(`AccelOps`, `KVM_RUN`, exit reason 처리)를 본다.

## 핵심 항목

- ✦ **Accelerator framework** — `AccelOps` interface, 동일 QEMU 코드가 `tcg`/`kvm`/`hvf`(macOS)/`whpx`(Windows)/`xen` 백엔드 선택
- ✦ `accel/accel-{system,user}.c` — accelerator 추상 layer
- ✦ KVM 진입 — `/dev/kvm` open → `KVM_CREATE_VM` → `KVM_CREATE_VCPU` → `KVM_RUN`
- ✦ **vCPU thread lifecycle** — QEMU가 vCPU당 thread 1개, 그 thread 안에서 `KVM_RUN` 무한 루프
- ✦ Memory region 설정 — `KVM_SET_USER_MEMORY_REGION` (guest_phys ↔ host_virt)
- ✦ **MMIO trap** — guest의 MMIO 접근 → host CPU vmexit → KVM이 user space에 `KVM_EXIT_MMIO` 전달 → QEMU가 device emulation
- ✦ Exit reason 종류 — `KVM_EXIT_MMIO`, `KVM_EXIT_IO`, `KVM_EXIT_HLT`, `KVM_EXIT_SHUTDOWN`, `KVM_EXIT_INTR`, `KVM_EXIT_INTERNAL_ERROR`
- ✦ **Coalesced MMIO** — 연속 MMIO write를 batch (graphics 가속)
- ✦ **Interrupt injection** — IRQFD (eventfd → IRQ), MSI route table, `KVM_IRQ_LINE`
- ✦ Hardware-assisted features
  - Intel VT-x: VMX root/non-root, VMCS, EPT (Extended Page Tables)
  - AMD-V: SVM, VMCB, NPT (Nested Page Tables)
  - ARM: stage-2 translation, GICv3 ITS
- ✦ State sync — `KVM_GET_REGS`/`SREGS`, save/restore, migration
- ✦ KVM features negotiation — `KVM_GET_API_VERSION`, `KVM_CHECK_EXTENSION`
- ◦ Nested KVM — guest 안에 KVM 또
- ◦ Confidential VM (SEV-SNP/TDX) — Ch 21

## 다이어그램 (4)

1. AccelOps 추상 — 같은 QEMU code → tcg/kvm/hvf/whpx 백엔드
2. vCPU thread loop — KVM_RUN → vmexit → QEMU handle → resume
3. MMIO trap 경로 — guest write → vmexit → KVM exit_mmio → QEMU device callback
4. Interrupt injection — host event → IRQFD → KVM IRQ route → guest IDT

## 코드 sketch

```c
/* QEMU 측 — KVM vCPU 진입 loop (accel/kvm/kvm-all.c 단순화) */
int kvm_cpu_exec(CPUState *cpu) {
    struct kvm_run *run = cpu->kvm_run;

    while (1) {
        int ret = kvm_vcpu_ioctl(cpu, KVM_RUN, 0);

        if (ret < 0 && errno != EINTR) {
            error_report("KVM_RUN failed: %s", strerror(errno));
            return -1;
        }

        switch (run->exit_reason) {
        case KVM_EXIT_MMIO:
            address_space_rw(&address_space_memory, run->mmio.phys_addr,
                             MEMTXATTRS_UNSPECIFIED, run->mmio.data,
                             run->mmio.len, run->mmio.is_write);
            break;
        case KVM_EXIT_IO:
            kvm_handle_io(run);
            break;
        case KVM_EXIT_HLT:
            qemu_cpu_kick(cpu);
            return EXCP_HLT;
        case KVM_EXIT_INTR:
            /* signal received, recheck */
            break;
        default:
            error_report("Unknown exit reason %d", run->exit_reason);
            return -1;
        }
    }
}
```

```c
/* Interrupt injection — IRQFD 등록 */
static void kvm_irqfd_assign(int fd, int gsi) {
    struct kvm_irqfd irqfd = { .fd = fd, .gsi = gsi };
    kvm_vm_ioctl(kvm_state, KVM_IRQFD, &irqfd);
    /* 이후 fd에 write → guest GSI에 IRQ */
}

/* MSI route table */
static int kvm_msi_route_add(uint64_t addr, uint32_t data) {
    struct kvm_irq_routing_entry e = {
        .gsi = next_gsi++,
        .type = KVM_IRQ_ROUTING_MSI,
        .u.msi.address_lo = addr & 0xffffffff,
        .u.msi.address_hi = addr >> 32,
        .u.msi.data = data,
    };
    /* KVM_SET_GSI_ROUTING으로 batch 설정 */
    return e.gsi;
}
```

```bash
# KVM 활성 부팅
qemu-system-x86_64 -accel kvm -smp 4 -m 4G -enable-kvm \
    -kernel vmlinuz -initrd initrd -nographic

# KVM 통계
(qemu) info kvm
(qemu) info status

# host 측
cat /sys/kernel/debug/kvm/exits          # exit reason 카운트
cat /sys/kernel/debug/kvm/mmio_exits
```

## 레퍼런스

- Linux `Documentation/virt/kvm/api.rst` — KVM userspace API (전체 ioctl)
- Linux `arch/x86/kvm/`, `arch/arm64/kvm/`
- QEMU `accel/kvm/kvm-all.c`, `target/i386/kvm/kvm.c`
- Intel SDM Vol 3 Ch 23-33 (VT-x)
- AMD APM Vol 2 Ch 15 (SVM)
- "KVM: the Linux Virtual Machine Monitor" — Avi Kivity OLS 2007

## 관련 항목

- [Ch 13: TCG 심화](/blog/tools/emulation/qemu-internals/chapter13-tcg-deep)
- [Ch 15: Coroutine](/blog/tools/emulation/qemu-internals/chapter15-coroutine)
- [Ch 18: virtio impl](/blog/tools/emulation/qemu-internals/chapter18-virtio-impl)
- [QEMU Embedded Ch 17: ARM Hypervisor](/blog/tools/emulation/qemu-embedded/chapter17-hypervisor)
