---
title: "Ch 2: ARM virt 머신"
date: 2026-05-17T02:00:00
description: "QEMU ARM virt 머신으로 AArch64 리눅스를 부팅한다."
tags: [QEMU, ARM, virt, AArch64, GIC, PL011]
series: "QEMU Embedded Emulation"
seriesOrder: 2
draft: true
---

ARM 임베디드 개발에서 가장 자주 쓰는 환경이 QEMU의 **virt 머신**입니다. 특정 SoC를 흉내내지 않고 *합의된 표준 peripheral 묶음*을 제공해, 학습·CI·prototype에 두루 적합합니다. 이 장은 ARM virt 머신의 구성·옵션·부팅 흐름을 한 번에 정리합니다.

## ARM virt — 구성 요소

| 구성 | 모델 | 비고 |
|------|------|------|
| CPU | Cortex-A53/A57/A72/A76, Max | `-cpu`로 선택 |
| 인터럽트 컨트롤러 | GIC v2/v3 | `gic-version` 옵션 |
| UART | PL011 | Linux 콘솔 `ttyAMA0` |
| Timer | ARM Generic Timer | privileged 분리 |
| RTC | PL031 | wall clock |
| VirtIO MMIO | 8 slots | 블록·net·rng 등 |
| PCIe host | ECAM | VirtIO-PCI 가능 |
| Flash (CFI) | 2 slots | `-pflash`로 attach |
| GPIO | PL061 | 옵션 |
| Watchdog | SBSA gwdt | 옵션 |

이 구성이 *ARM SBSA*(Server Base System Architecture) 권장 사항을 따라 만들어졌습니다. 결과적으로 *upstream Linux·U-Boot·FreeBSD·NuttX* 모두 out-of-the-box 지원.

## 기본 실행

```bash
qemu-system-aarch64 -M virt -cpu cortex-a53 -m 512M \
    -kernel Image -append "console=ttyAMA0" -nographic
```

실행 결과(예):

```text
[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x412fd050]
[    0.000000] Linux version 6.6.0 (...) (aarch64-linux-gnu-gcc) ...
[    0.000000] Machine model: linux,dummy-virt
[    0.000000] earlycon: pl011 at MMIO 0x0000000009000000
[    0.000000] printk: bootconsole [pl011] enabled
...
```

`Machine model: linux,dummy-virt`이 virt 머신의 표식. 종료는 `Ctrl-A`, `x`.

## 주요 옵션

| 옵션 | 의미 |
|------|------|
| `-M virt` | virt 머신 |
| `-M virt,gic-version=3` | GICv3 (default 2) |
| `-M virt,secure=on` | TrustZone(Ch 16) |
| `-M virt,virtualization=on` | EL2 활성(Ch 17) |
| `-cpu cortex-a72` | A53/A57/A72/A76/Max |
| `-smp 4` | 코어 수 |
| `-m 2G` | DRAM |
| `-kernel <file>` | Linux Image or U-Boot |
| `-initrd <file>` | initramfs |
| `-append "..."` | cmdline |
| `-dtb <file>` | 직접 device tree (default: 자동) |
| `-nographic` | GUI 없이 stdio 콘솔 |
| `-s -S` | GDB stub + halt |

## DTB 자동 생성

virt 머신은 머신 구성에 맞는 device tree를 *런타임에* 생성합니다. 확인:

```bash
qemu-system-aarch64 -M virt,dumpdtb=virt.dtb -nographic
dtc -I dtb -O dts virt.dtb -o virt.dts
```

`virt.dts`의 핵심.

```dts
/dts-v1/;

/ {
    compatible = "linux,dummy-virt";
    #address-cells = <0x02>;
    #size-cells = <0x02>;

    chosen { stdout-path = "/pl011@9000000"; };

    cpus {
        cpu@0 { compatible = "arm,cortex-a53"; reg = <0x00>; /* ... */ };
    };

    memory@40000000 {
        device_type = "memory";
        reg = <0x00 0x40000000 0x00 0x20000000>;
    };

    intc@8000000 { compatible = "arm,gic-v3"; /* ... */ };
    pl011@9000000 { compatible = "arm,pl011"; /* ... */ };
    virtio_mmio@a000000 { compatible = "virtio,mmio"; /* ... */ };
};
```

VirtIO MMIO 8개·PCIe ECAM·GIC·PL011이 표준 위치(`0x0800_0000`·`0x0900_0000`·`0x0A00_0000`)에 배치됩니다.

## 메모리 맵

| 주소 | 크기 | 영역 |
|------|------|------|
| `0x0000_0000` | 128MB | Flash (CFI) |
| `0x0800_0000` | 256MB | GIC distributor + redistributor |
| `0x0900_0000` | 4KB | PL011 UART |
| `0x0901_0000` | 4KB | PL031 RTC |
| `0x0903_0000` | 4KB | GPIO PL061 |
| `0x0A00_0000` | 32MB | VirtIO MMIO ×8 |
| `0x1000_0000` | 256MB | PCIe ECAM |
| `0x4000_0000` | (configurable) | DRAM 시작 |

DRAM 시작 주소가 `0x4000_0000`입니다. ARM 표준이고, kernel link script가 이 주소를 가정합니다.

## VirtIO 디바이스 attach

블록·네트워크.

```bash
qemu-system-aarch64 -M virt -cpu cortex-a53 -m 2G -nographic \
    -kernel Image \
    -drive file=rootfs.ext4,format=raw,id=hd0,if=none \
    -device virtio-blk-device,drive=hd0 \
    -netdev user,id=net0,hostfwd=tcp::2222-:22 \
    -device virtio-net-device,netdev=net0 \
    -append "root=/dev/vda rw console=ttyAMA0 earlycon"
```

`virtio-blk-device`(MMIO)와 `virtio-blk-pci`(PCIe) 둘 다 가능. driver는 다르지만 *기능적*으로 같습니다.

## GIC 버전 선택

| 버전 | 특징 | 적합도 |
|------|------|--------|
| GICv2 | 최대 8 CPU, legacy | Cortex-A5/A7/A9/A15/A53 호환 |
| GICv3 | 최대 수천 CPU, redistributor 분리 | Cortex-A53+, server 권장 |
| GICv4 | virtual GIC | virtualization 시 |

```bash
qemu-system-aarch64 -M virt,gic-version=3 -cpu cortex-a72 -smp 8 ...
```

`-smp`가 8 이상이면 GICv3가 사실상 강제.

## CPU 옵션

```bash
# A53 (기본 — IoT/모바일급)
-cpu cortex-a53

# A72 (성능 우선)
-cpu cortex-a72

# A76 (server-class)
-cpu cortex-a76

# Maximum supported (모든 feature)
-cpu max
```

`-cpu max`는 QEMU가 지원하는 *모든* feature를 켭니다. spec 검증·새 instruction 테스트에 유용.

## SMP

```bash
qemu-system-aarch64 -M virt -cpu cortex-a72 -smp 4 -m 4G ...
```

Linux가 부팅 시 모든 코어를 *psci power on*으로 활성화. `/proc/cpuinfo`에서 4 core 확인.

```text
guest$ cat /proc/cpuinfo | grep processor
processor	: 0
processor	: 1
processor	: 2
processor	: 3
```

## 시리얼 콘솔과 monitor

`-nographic`이 stdio를 콘솔로 묶어 monitor 접근이 막힙니다. 분리하려면:

```bash
qemu-system-aarch64 -M virt -cpu cortex-a72 -m 2G \
    -nographic -serial mon:stdio \
    -kernel Image ...
```

`Ctrl-A`, `c`로 monitor 진입, 다시 같은 키로 serial 복귀.

## 흔한 함정

- **`console=ttyS0`** — virt 머신은 PL011, `ttyAMA0`. ttyS0는 16550 standard.
- **DRAM 부족** — 기본 128MB로는 Linux 부팅 어려움. 최소 512MB.
- **GIC 버전 불일치** — `-smp 8` 이상에서 GICv2 시도 시 fail. `gic-version=3` 명시.
- **DTB 충돌** — `-dtb`를 줬는데 머신과 맞지 않으면 boot fail. 기본은 자동.

## 정리

- ARM `virt`는 *ARM SBSA 권장 구성*의 가상 SoC. upstream Linux·U-Boot·FreeBSD·NuttX 호환.
- 표준 peripheral: GICv2/v3·PL011·PL031·VirtIO MMIO ×8·PCIe ECAM. 메모리 시작 `0x4000_0000`.
- 기본 명령: `qemu-system-aarch64 -M virt -cpu cortex-a72 -m 2G -kernel Image -nographic -append "console=ttyAMA0"`.
- DTB는 *자동 생성* — `dumpdtb=...`로 확인.
- VirtIO MMIO와 PCIe 둘 다 사용. multi-core는 GICv3 권장.
- `-cpu max`로 모든 feature 켜기 — spec 검증용.
- `console=ttyS0`(virt) ↔ `ttySIF0`(sifive_u) ↔ `ttyAMA0`(ARM PL011) 헷갈리지 말 것.

## 다음 장 예고

다음 장은 같은 흐름의 **RISC-V virt**. 둘이 어떻게 닮았고 어디서 다른지 비교하며 정리합니다.

## 관련 항목

- [Ch 1: 임베디드 에뮬레이션 개요](/blog/tools/emulation/qemu-embedded/chapter01-overview)
- [Ch 3: RISC-V virt 머신](/blog/tools/emulation/qemu-embedded/chapter03-riscv-virt)
- [QEMU Internals — Memory Model](/blog/tools/emulation/qemu-internals/chapter03-memory-model)
- [RISC-V QEMU — virt 머신 해부](/blog/tools/emulation/qemu-riscv/chapter02-virt-machine)
