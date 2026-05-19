---
title: "Ch 17: ARM Hypervisor (EL2)"
date: 2026-05-17T17:00:00
description: "KVM·Xen nested — ARM virtualization on QEMU."
tags: [QEMU, hypervisor, EL2, kvm-arm, xen, nested]
series: "QEMU Embedded Emulation"
seriesOrder: 17
draft: true
---

자동차 ECU에서는 *한 SoC*가 infotainment(Linux), cluster(RTOS), ADAS(real-time OS)를 *분리된 partition*으로 동시에 돌립니다. 이를 가능하게 하는 토대가 ARMv8 *virtualization extension*(EL2)입니다. QEMU `virt,virtualization=on`으로 KVM·Xen·nested virtualization을 시뮬레이션할 수 있습니다.

## EL2 — Hypervisor mode

ARMv8 Exception Level의 *중간층*.

| EL | 영역 |
|----|------|
| EL3 | Secure Monitor |
| **EL2** | **Hypervisor** ← 이 장의 주제 |
| EL1 | Guest OS |
| EL0 | App |

EL2에서 *hypervisor*가 동작하면서 EL1의 *guest OS*를 관리합니다. KVM·Xen·Hafnium 같은 hypervisor 모두 EL2에서.

## ARMv8.1 VHE — Virtualization Host Extensions

KVM의 효율을 *대폭 끌어올린* extension. host kernel을 *EL2에 직접* 두어 KVM hypervisor와 host scheduling을 같은 level에 통합. vmexit 비용 ↓.

Cortex-A55/A72/A76 이후가 지원.

## Stage-2 translation

guest의 *IPA*(Intermediate Physical Address)를 host의 *PA*로 변환. hypervisor가 stage-2 page table을 관리해 *각 guest의 memory를 isolate*.

```text
Guest VA → (Stage-1: guest's MMU) → Guest IPA
                                       │
                                       ▼ (Stage-2: hypervisor's MMU)
                                    Host PA
```

guest는 자기 IPA를 *진짜 physical*로 알고 동작. hypervisor가 *투명하게* host PA로 매핑.

## QEMU 활성

```bash
qemu-system-aarch64 -M virt,virtualization=on,gic-version=3 \
    -cpu cortex-a72 -smp 4 -m 4G \
    -kernel Image -dtb virt.dtb -initrd rootfs.cpio.gz \
    -nographic -append "console=ttyAMA0"
```

`virtualization=on`이 EL2 활성화. *guest 안에서* KVM 사용 가능.

guest 안:

```bash
guest$ ls /dev/kvm
/dev/kvm

# nested: guest 안에서 또 KVM
guest$ qemu-system-aarch64 -M virt -cpu host -accel kvm \
       -kernel inner-Image -nographic
```

이로써 *KVM-on-KVM*이 가능.

## Trap & Emulate

hypervisor의 핵심 메커니즘. guest가 *sensitive instruction*(TLB invalidate, system register access)을 실행하면 *EL2 trap*. hypervisor가 emulate 후 guest 재개.

```text
Guest (EL1): TLBI VAE1
                │
                ▼ (sensitive — trap)
Hypervisor (EL2): handle_tlbi(...)
                │
                ▼ (return)
Guest (EL1): 다음 명령
```

대부분의 명령은 *trap 없이 직접* 실행 — 그래서 거의 native 성능.

## KVM API

Linux KVM은 `/dev/kvm`을 통해 ioctl로 제어.

```c
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
        .slot = 0,
        .guest_phys_addr = 0x40000000,
        .memory_size = 1 << 20,
        .userspace_addr = (uint64_t)mmap(NULL, 1 << 20,
                                          PROT_READ | PROT_WRITE,
                                          MAP_SHARED | MAP_ANONYMOUS, -1, 0),
    };
    ioctl(vmfd, KVM_SET_USER_MEMORY_REGION, &mem);

    /* run */
    struct kvm_run *run = mmap(NULL,
        ioctl(kvm, KVM_GET_VCPU_MMAP_SIZE, 0),
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

QEMU가 *바로 이 API*를 사용해 KVM mode로 동작합니다(`-accel kvm`).

## vGIC — Virtual GIC

guest의 IRQ도 *가상화*됩니다. **vGIC**가 physical GIC을 추상화해 guest에 노출.

- 각 vCPU가 *virtual interrupt controller* 가짐
- guest의 IRQ는 *vGIC가 inject*
- host의 IRQ는 hypervisor가 받아 *어느 guest로 라우팅*

ICH_LR_EL2(list registers)가 핵심 mechanism.

## vTimer

ARM Generic Timer도 *가상화*. guest별 *vtimer* register, hypervisor가 trap·라우팅.

## Device pass-through

guest가 *PCI device*를 직접 사용하게 하려면 **VFIO**(Ch 9 of qemu-fpga-driver) + SR-IOV(Ch 11).

```bash
# host
echo 1 > /sys/bus/pci/devices/0000:01:00.0/sriov_numvfs
echo "10ee 5038" > /sys/bus/pci/drivers/vfio-pci/new_id

# QEMU as guest
qemu-system-aarch64 -M virt,virtualization=on -accel kvm \
    -cpu host -smp 4 -m 4G \
    -device vfio-pci,host=01:00.1 \
    -kernel Image ...
```

guest가 *VF*를 *kernel-bypass*로 직접 사용. cloud FPGA·NIC virtualization의 핵심.

## Xen on QEMU

Xen은 *Type-1 hypervisor*. dom0(privileged) + domU(unprivileged) 모델.

```bash
qemu-system-aarch64 -M virt -cpu cortex-a72 -m 4G \
    -kernel xen-image -dtb xen.dtb \
    -append "dom0_mem=2048M ..."
```

Xen 부팅 후 dom0가 시작되고, domU를 새로 생성할 수 있습니다. 학습용 환경.

## Use case

| 도메인 | hypervisor |
|--------|------------|
| 자동차 partition | QNX hypervisor·Green Hills INTEGRITY·Xen-arm |
| 항공 MILS | Hafnium·MultiZone |
| ARM server | KVM |
| Embedded edge | KVM·Xen |
| Cloud (Apple Silicon, AWS Graviton) | KVM·proprietary |

자동차 partition에서는 *cluster(RTOS) + infotainment(Linux) + ADAS(real-time)*가 *같은 SoC*에서 분리 동작.

## Performance overhead

| Mode | overhead |
|------|----------|
| Native | 0% |
| KVM (VHE) | 1~5% |
| KVM (no VHE) | 5~15% |
| QEMU TCG | 10× 이상 |
| Nested KVM | 5~25% (workload 의존) |

VHE 활성 KVM이 사실상 native 수준. 그래서 *실 데이터센터*에 쓰임.

## Tuning

| Trick | 효과 |
|-------|------|
| `-cpu host` | guest가 host CPU의 모든 feature 사용 |
| `-accel kvm` | KVM 가속 |
| `vhost-net` | network zero-copy |
| `vfio-pci` | device pass-through |
| `iothread` | I/O를 별도 thread |
| huge page | memory mapping 비용 ↓ |

production cloud는 이런 최적화의 조합.

## RMM·CCA — 차세대

ARMv9의 **CCA**가 *Realm Management Monitor*(RMM)를 도입. *confidential compute*에 가까운 모델 — cloud tenant의 메모리·연산이 *hypervisor에도* 보이지 않게.

## 흔한 함정

- **`-accel kvm`이 host 아키텍처 의존** — ARM host에서만 ARM KVM. macOS는 hvf, Windows는 whpx.
- **nested KVM 부재** — ARMv8.4 미만은 nested 지원 X. cortex-a76 이상 권장.
- **vGIC version mismatch** — guest가 GICv2 가정, host가 GICv3 → fail. `gic-version=` 명시.
- **timer skew** — guest와 host timer가 drift할 수 있음. PTP·NTP로 sync.

## 정리

- **EL2 Hypervisor mode**가 ARM 가상화의 기반. KVM·Xen·Hafnium 등 hypervisor가 동작.
- **Stage-2 translation**으로 guest IPA → host PA 매핑, *guest memory 격리*.
- **VHE**(Virtualization Host Extensions)가 KVM 효율 대폭 ↑ — cortex-a55+ 지원.
- **Trap & Emulate**가 sensitive instruction 처리. 대부분은 native 직접 실행.
- **vGIC/vTimer**가 IRQ·timer 가상화. 각 vCPU별 분리.
- **Device pass-through**(VFIO + SR-IOV)로 guest 직접 device 사용 — cloud FPGA/NIC 핵심.
- Performance: KVM(VHE)은 1~5% overhead — 사실상 native.
- Use case: 자동차 partition·항공 MILS·ARM server·cloud edge.

## 다음 장 예고

다음 장은 *실 보드 도착 시* — **board bringup**. 새 SoC의 첫 부팅부터 driver probe까지 표준 흐름.

## 관련 항목

- [Ch 16: TrustZone](/blog/tools/emulation/qemu-embedded/chapter16-trustzone)
- [Ch 18: 보드 bringup](/blog/tools/emulation/qemu-embedded/chapter18-board-bringup)
- [QEMU Internals — KVM Accel](/blog/tools/emulation/qemu-internals/chapter14-kvm-accel)
- [FPGA Driver — VFIO-PCI Passthrough](/blog/tools/emulation/qemu-fpga-driver/chapter10-vfio-pci-passthrough)
