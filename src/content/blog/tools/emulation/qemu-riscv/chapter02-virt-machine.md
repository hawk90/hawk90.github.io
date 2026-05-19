---
title: "Ch 2: virt 머신 해부"
date: 2026-05-17T20:00:00
description: "QEMU virt 머신 — 메모리 맵, 가상 디바이스, DTB 자동 생성을 다룬다."
series: "RISC-V QEMU 심화"
seriesOrder: 2
tags: [RISC-V, QEMU, virt, Memory-Map, DTB]
draft: true
---

QEMU의 `virt` 머신은 RISC-V 시스템 개발의 *기본 환경*입니다. 특정 실 SoC를 따라가지 않고 RISC-V 생태계의 *표준 가상 플랫폼*으로 설계되어 있어서, 학습부터 펌웨어 개발·Linux 포팅까지 한 머신으로 끝낼 수 있죠. 이 장은 virt 머신을 한 번에 분해합니다 — 메모리 맵, 표준 디바이스, DTB 자동 생성, CPU 옵션까지.

## 어떤 문제를 푸는가

실 RISC-V SoC를 시뮬레이션하려면 그 SoC의 메모리 맵·인터럽트 컨트롤러·peripheral 동작을 모두 구현해야 합니다. 학습·풀 스택 부팅·CI 같은 일반적 용도에는 그 비용이 과합니다.

`virt`는 *합의된 가상 SoC*입니다.

- **RISC-V Privileged Spec**의 권장 메모리 영역(`0x0000_1000` mrom, `0x0200_0000` CLINT, `0x0C00_0000` PLIC)을 따라갑니다.
- **VirtIO over MMIO**를 통해 표준 paravirt 디바이스(블록·네트워크·random)를 제공합니다.
- **`-machine virt,dumpdtb=...`**로 device tree를 자동 생성해 부트로더·커널에 전달할 수 있습니다.

이 합의 덕분에 OpenSBI·U-Boot·Linux·FreeBSD·NuttX·Zephyr 모두 `virt`를 *out-of-the-box*로 지원합니다.

## 메모리 맵

QEMU 9.0 기준 `virt`의 정적 메모리 맵.

| 시작 주소 | 크기 | 영역 |
|-----------|------|------|
| `0x0000_1000` | 0x100 | Boot ROM (mrom — first instruction) |
| `0x0000_1100` | - | reserved |
| `0x0010_0000` | 0x1000 | Test device (sifive_test — power-off/reboot) |
| `0x0010_1000` | 0x1000 | RTC (Goldfish) |
| `0x0200_0000` | 0x10000 | CLINT (Core-Local Interruptor) |
| `0x0C00_0000` | 0x4000_0000 | PLIC (Platform-Level Interrupt Controller) |
| `0x1000_0000` | 0x100 | UART0 (NS16550-compatible) |
| `0x1000_1000` | 0x1000 | VirtIO MMIO #1 |
| `0x1000_2000` | 0x1000 | VirtIO MMIO #2 |
| `0x1000_3000` ~ `0x1000_8000` | | VirtIO MMIO #3~8 |
| `0x2000_0000` | 0x2000_0000 | Flash (CFI) |
| `0x3000_0000` | 0x1000_0000 | PCIe ECAM |
| `0x4000_0000` | 0x4000_0000 | PCIe MMIO |
| `0x8000_0000` | (configurable) | DRAM 시작 |

DRAM의 크기는 `-m`으로 결정됩니다. 위치는 항상 `0x8000_0000` 고정. 부트로더·커널 link script가 이 주소를 가정하고 만들어집니다.

## 표준 가상 디바이스

`virt`가 제공하는 디바이스들:

| 디바이스 | 종류 | 비고 |
|----------|------|------|
| CLINT | 인터럽트 | per-HART soft IRQ + machine timer |
| PLIC | 인터럽트 | 외부 IRQ aggregator |
| UART0 | console | NS16550A, Linux `ttyS0` |
| Goldfish RTC | 시계 | wall clock |
| sifive_test | misc | poweroff/reboot 메커니즘 |
| VirtIO MMIO ×8 | 다용도 | block / net / rng / 9p / console / balloon |
| CFI flash | 영구 저장 | `-pflash`로 attach |
| PCIe host | bus | virtio-pci, vhost-vsock, vfio 등 |

VirtIO MMIO 슬롯이 *8개* 있다는 점에 주목하세요. `-device virtio-blk-device,...`를 여러 번 줘서 여러 슬롯을 채울 수 있습니다.

## DTB 자동 생성

QEMU는 머신 구성에 맞춰 device tree를 *런타임에 생성*해 부트로더에 전달합니다. 이걸 *덤프해서* 보면 머신 구조가 한눈에 들어옵니다.

```bash
qemu-system-riscv64 -machine virt,dumpdtb=virt.dtb -nographic
```

binary DTB를 사람이 읽는 DTS로 변환합니다.

```bash
dtc -I dtb -O dts virt.dtb -o virt.dts
```

`virt.dts`의 일부는 다음과 같이 생겼습니다.

```dts
/dts-v1/;

/ {
    #address-cells = <0x02>;
    #size-cells = <0x02>;
    compatible = "riscv-virtio";
    model = "riscv-virtio,qemu";

    chosen {
        bootargs = [00];
        stdout-path = "/soc/serial@10000000";
    };

    memory@80000000 {
        device_type = "memory";
        reg = <0x00 0x80000000 0x00 0x80000000>;
    };

    cpus {
        timebase-frequency = <0x989680>;
        cpu@0 {
            device_type = "cpu";
            reg = <0x00>;
            status = "okay";
            compatible = "riscv";
            riscv,isa = "rv64imafdc_zicntr_zicsr_...";
            mmu-type = "riscv,sv57";
            // ...
        };
    };

    soc {
        // serial@10000000, plic@c000000, clint@2000000, virtio_mmio@... 등
    };
};
```

이 DTS는 부트로더·커널 포팅 시 *진실의 원천*입니다. virt 머신을 타겟으로 한 펌웨어를 쓰려면 이 파일에 있는 주소와 호환성 문자열을 정확히 따라야 합니다.

## CPU 옵션

`-cpu`로 cpu 모델과 확장을 지정합니다.

```bash
qemu-system-riscv64 -machine virt -cpu rv64,v=true,vlen=256 -nographic
```

자주 쓰는 조합:

| 옵션 | 의미 |
|------|------|
| `rv64` 또는 `rv64gc` | RV64GC 기본 |
| `v=true,vlen=128` | Vector extension, 128-bit lane |
| `v=true,vlen=256` | Vector, 256-bit |
| `sv57=true` | 5-level paging |
| `zba=true,zbb=true,zbc=true,zbs=true` | bit-manipulation extensions |
| `zicboz=true` | cache block zero instruction |
| `zicbom=true` | cache block management |
| `h=true` | hypervisor extension |
| `sscofpmf=true` | supervisor counter overflow + filtering |

`-cpu help`로 호스팅 QEMU 빌드가 지원하는 옵션 전체를 확인할 수 있습니다.

## 멀티코어

`-smp`로 코어 개수를 조정합니다.

```bash
qemu-system-riscv64 -machine virt -smp 4 -m 2G -nographic -bios default
```

OpenSBI가 부팅하면서 모든 HART를 enumerate한 결과가 콘솔에 보입니다.

```text
Platform HART Count       : 4
Boot HART ID              : 0
Boot HART Domain          : root
Boot HART ISA             : rv64imafdc_zicntr_zicsr_zifencei_zihpm
...
```

SMP 환경에서 SBI HSM(Hart State Management) 호출이 어떻게 동작하는지를 보는 가장 빠른 방법이 이것입니다.

## 메모리 설정

DRAM 크기는 `-m`. 기본은 128MB로 작아서 Linux를 띄우려면 늘려야 합니다.

```bash
# 4GB
qemu-system-riscv64 -machine virt -m 4G ...

# 정확한 크기 (1.5GB)
qemu-system-riscv64 -machine virt -m 1536 ...
```

NUMA를 모사하려면 `-machine virt,numa=on`과 `-numa node,...`을 조합합니다(상세는 9장).

## PCIe 활용

`virt`는 PCIe host bridge가 들어 있어서, VirtIO-PCI 디바이스를 사용할 수 있습니다.

```bash
qemu-system-riscv64 -machine virt -m 2G -nographic -bios default \
    -drive file=disk.qcow2,if=none,id=hd0 \
    -device virtio-blk-pci,drive=hd0 \
    -netdev user,id=net0 \
    -device virtio-net-pci,netdev=net0
```

PCIe 경로를 쓰면 *MMIO 직접*보다 한 단계 더 *실 시스템*에 가깝습니다. Linux NVMe driver 등 PCIe 의존 코드를 테스트할 때 유용합니다.

## 직렬 콘솔과 monitor 분리

`-nographic`이 stdio를 serial 콘솔로 묶어 버려, QEMU monitor에 들어갈 수 없게 됩니다. 둘을 분리하려면:

```bash
qemu-system-riscv64 -machine virt -m 2G \
    -nographic \
    -serial mon:stdio \
    -bios default
```

`-serial mon:stdio`로 monitor와 serial이 multiplex됩니다. `Ctrl-A`, `c`로 monitor로 진입하고 다시 `Ctrl-A`, `c`로 serial로.

## 자주 빠지는 함정

- **DRAM 부족** — 기본 128MB로는 Linux 시작도 못 합니다. 최소 1G 권장.
- **`-cpu rv64`로는 sv39 사용** — 5-level paging이 필요하면 `sv57=true` 명시.
- **VirtIO MMIO vs PCI** — 둘 다 동작하지만 driver가 다릅니다. `virtio-blk-device`는 MMIO, `virtio-blk-pci`는 PCI.
- **GDB 연결 안 됨** — `-s -S`를 줬다면 시작 시 일시 정지. `target remote :1234` 후 `continue`.

## 정리

- `virt`는 *합의된 가상 RISC-V SoC*로, 학습부터 풀 스택 부팅까지 모두 커버합니다.
- 메모리 맵은 `0x0000_1000` mrom, `0x0200_0000` CLINT, `0x0C00_0000` PLIC, `0x1000_0000` UART, `0x8000_0000` DRAM이 핵심.
- `virtio_mmio` 슬롯 8개로 블록·네트워크·rng를 자유롭게 attach.
- DTB가 *런타임에 자동 생성*되며, `dumpdtb`로 살펴볼 수 있습니다.
- `-cpu rv64,v=true,...`로 vector 등 확장을 켜고, `-smp`로 멀티코어를 모사.
- PCIe host bridge가 있어 VirtIO-PCI도 가능 — NVMe 등 PCIe driver 테스트에 유용.

## 다음 장 예고

다음 장은 시스템 개발에서 빠질 수 없는 도구인 **GDB 디버깅**을 다룹니다. `-s -S`로 QEMU GDB 스텁을 띄우고, 부트로더가 동작하는 중간에 breakpoint를 걸고 레지스터를 살펴보는 흐름까지.

## 관련 항목

- [Ch 1: QEMU RISC-V 개요](/blog/tools/emulation/qemu-riscv/chapter01-overview)
- [Ch 3: QEMU + GDB 디버깅](/blog/tools/emulation/qemu-riscv/chapter03-gdb-debugging)
- [QEMU Embedded — Device Tree](/blog/tools/emulation/qemu-embedded/chapter07-device-tree)
- [RISC-V 베어메탈 부트](/blog/systems/riscv/baremetal-boot/chapter01-overview) — 부트 흐름과 메모리 맵
