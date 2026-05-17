---
title: "Ch 17: ARM Hypervisor (EL2)"
date: 2025-09-02T17:00:00
description: "KVM·Xen nested — ARM virtualization on QEMU."
tags: [QEMU, hypervisor, el2, kvm-arm, xen]
series: "QEMU Embedded Emulation"
seriesOrder: 17
draft: true
---

## 이 챕터의 의도

자동차 ECU에서 한 SoC가 *infotainment(Linux)* + *cluster(RTOS)* + *ADAS(real-time OS)* 를 동시에 *분리된 partition*으로 돌린다. **ARMv8 virtualization extension (EL2)**가 토대. QEMU `virt,virtualization=on`로 nested KVM·Xen 시뮬레이션 가능 — 본격 hypervisor 학습.

## 핵심 항목

- ✦ **ARMv8 virtualization extension** — EL2 hypervisor mode 도입
- ✦ Exception Level — EL3 (Secure Monitor) > **EL2 (Hypervisor)** > EL1 (Guest OS) > EL0 (App)
- ✦ ARMv8.1+ VHE (Virtualization Host Extensions) — host kernel을 EL2에 직접 (KVM 효율 ↑)
- ✦ **Stage-2 translation** — guest IPA(Intermediate Physical Address) → host PA, hypervisor가 page table 관리
- ✦ Trap & emulate — guest의 sensitive instruction (TLB invalidate, system reg access) → EL2 trap
- ✦ **QEMU virt** — `-machine virt,virtualization=on,gic-version=3`로 EL2 활성
- ✦ **KVM on ARM** — Linux kernel KVM/ARM driver, `kvm_run` ioctl
- ✦ **Nested virtualization** — guest가 또 hypervisor (KVM in KVM, KVM-on-QEMU 가능 ARMv8.4+)
- ✦ **Xen on QEMU** — Type-1 hypervisor 학습용, dom0 + domU 구성
- ✦ vCPU — guest CPU emulation, host thread당 1 vCPU
- ✦ **vGIC** (Virtual Generic Interrupt Controller) — guest IRQ 분배, ICH_LR_EL2 list register
- ✦ vTimer — guest timer virtualization, ARM Generic Timer
- ✦ **Device pass-through** — SR-IOV + VFIO로 guest에 직접 (Ch 12 SR-IOV, FPGA driver 시리즈와 교차)
- ✦ Performance overhead — vmexit 비용, stage-2 page fault, IPI 가속
- ✦ Tuning — `vhost-net` (네트워크 zero-copy), `vfio-pci` (디바이스 pass-through)
- ✦ Use case — automotive partition (cluster + infotainment), avionics MILS, ARMv8 server 가상화
- ◦ Realm Management Monitor (RMM) — ARMv9 CCA confidential compute
- ◦ Hafnium — Trustonic의 minimal SPM (Secure Partition Manager)

## 다이어그램 (4)

1. ARMv8 Exception Level — EL3/EL2/EL1/EL0 + Secure/Non-secure
2. Stage-1 vs Stage-2 translation (Guest VA → IPA → PA)
3. KVM vCPU loop — `kvm_run` → guest exec → vmexit → handle → resume
4. vGIC 구조 — physical GIC + virtual interface registers

## 코드 sketch

```bash
# QEMU ARM virt + KVM nested (host kernel ARM64, in guest also KVM)
qemu-system-aarch64 -M virt,virtualization=on,gic-version=3 \
    -cpu cortex-a76 -smp 4 -m 4G \
    -kernel Image -dtb virt.dtb -initrd rootfs.cpio.gz \
    -nographic -append "console=ttyAMA0"

# 게스트 안에서 KVM 사용 가능 확인
guest$ ls /dev/kvm
guest$ qemu-system-aarch64 -M virt -cpu host -accel kvm -kernel inner-Image
```

```c
/* KVM/ARM API 사용 예 */
#include <linux/kvm.h>

int main(void) {
    int kvm = open("/dev/kvm", O_RDWR);
    int vmfd = ioctl(kvm, KVM_CREATE_VM, 0);
    int vcpufd = ioctl(vmfd, KVM_CREATE_VCPU, 0);

    struct kvm_vcpu_init init = { .target = KVM_ARM_TARGET_GENERIC_V8 };
    ioctl(vmfd, KVM_ARM_PREFERRED_TARGET, &init);
    ioctl(vcpufd, KVM_ARM_VCPU_INIT, &init);

    /* memory region 설정 */
    struct kvm_userspace_memory_region mem = {
        .slot = 0, .guest_phys_addr = 0x40000000, .memory_size = 1 << 20,
        .userspace_addr = (uint64_t)mmap(NULL, 1 << 20, ...),
    };
    ioctl(vmfd, KVM_SET_USER_MEMORY_REGION, &mem);

    /* run */
    struct kvm_run *run = mmap(NULL, ioctl(kvm, KVM_GET_VCPU_MMAP_SIZE, 0),
                                PROT_READ | PROT_WRITE, MAP_SHARED, vcpufd, 0);
    while (1) {
        ioctl(vcpufd, KVM_RUN, 0);
        switch (run->exit_reason) {
        case KVM_EXIT_MMIO: handle_mmio(run); break;
        case KVM_EXIT_HLT:  return 0;
        }
    }
}
```

## 레퍼런스

- ARM Architecture Reference Manual §D7 (Virtualization)
- KVM/ARM paper — Dall & Nieh (USENIX ATC 2014)
- Linux `Documentation/virt/kvm/api.rst`, `arch/arm64/kvm/`
- QEMU `Documentation/system/arm/virt.rst::virtualization`
- Xen on ARM — wiki.xenproject.org/wiki/Xen_ARM_with_Virtualization_Extensions
- Hafnium — github.com/CTSRD-CHERI/hafnium

## 관련 항목

- [Ch 16: TrustZone](/blog/tools/emulation/qemu-embedded/chapter16-trustzone)
- [Ch 15: OpenAMP](/blog/tools/emulation/qemu-embedded/chapter15-openamp-rpmsg)
- [QEMU Internals Ch 14: KVM accelerator](/blog/tools/emulation/qemu-internals/chapter14-kvm-accel)
- [PCIe Ch 12 SR-IOV/VFIO](/blog/embedded/hardware/pcie/)
