---
title: "Ch 3: RISC-V virt 머신"
date: 2026-05-17T03:00:00
description: "QEMU RISC-V virt 머신으로 RV64 리눅스를 부팅한다."
tags: [QEMU, RISC-V, virt, RV64, OpenSBI, PLIC]
series: "QEMU Embedded Emulation"
seriesOrder: 3
draft: true
---

ARM virt와 짝을 이루는 RISC-V 측 환경이 `qemu-system-riscv64 -M virt`입니다. 둘은 *놀라울 만큼 닮았지만* RISC-V만의 부팅 단계(OpenSBI)와 인터럽트 구조(PLIC + CLINT)에 차이가 있습니다. 이 장은 그 차이를 중심으로 RISC-V virt 머신을 정리합니다.

## RISC-V virt — 구성 요소

| 구성 | 모델 | 비고 |
|------|------|------|
| CPU | RV32/RV64 (rv64gc 등) | `-cpu`로 선택 |
| 인터럽트 컨트롤러 | PLIC (외부) + CLINT (per-HART) | ARM의 GIC와 다름 |
| UART | NS16550 | Linux 콘솔 `ttyS0` |
| Timer | mtime + mtimecmp (CLINT) | M-mode 직접 |
| VirtIO MMIO | 8 slots | 동일 |
| PCIe host | ECAM | 동일 |
| Flash (CFI) | 옵션 | |

ARM과의 가장 큰 차이는 *인터럽트 구조*와 *부팅 chain*입니다.

## 부팅 chain — OpenSBI

RISC-V의 부팅은 *M-mode*에서 시작해 *S-mode*로 전환됩니다. 이 전환을 *Supervisor Binary Interface*(SBI)가 추상화하고, 구현체가 **OpenSBI**.

```text
QEMU mrom (0x1000)
  │
  ▼
OpenSBI (M-mode)  ← 시리즈 ch4에서 자세히
  │
  ▼
U-Boot or Linux kernel (S-mode)
```

`-bios default`로 QEMU 빌드에 포함된 OpenSBI를 자동 선택할 수 있습니다.

## 기본 실행

```bash
qemu-system-riscv64 -M virt -m 512M \
    -bios default \
    -kernel Image -nographic \
    -append "console=ttyS0"
```

부팅 로그(예):

```text
OpenSBI v1.3
   ____                    _____ ____ _____
  / __ \                  / ____|  _ \_   _|
 | |  | |_ __   ___ _ __ | (___ | |_) || |
 | |  | | '_ \ / _ \ '_ \ \___ \|  _ < | |
 | |__| | |_) |  __/ | | |____) | |_) || |_
  \____/| .__/ \___|_| |_|_____/|____/_____|
        | |
        |_|

Platform Name             : riscv-virtio,qemu
Boot HART Priv Version    : v1.12
...

[    0.000000] Linux version 6.6.0 ... (gcc 13.2.0)
[    0.000000] Machine model: riscv-virtio,qemu
[    0.000000] earlycon: sbi0 at I/O port 0x0
```

## 메모리 맵

| 주소 | 영역 |
|------|------|
| `0x0000_1000` | mrom (boot ROM) |
| `0x0010_0000` | sifive_test (poweroff/reboot) |
| `0x0200_0000` | CLINT |
| `0x0C00_0000` | PLIC |
| `0x1000_0000` | UART (NS16550) |
| `0x1000_1000` | VirtIO MMIO ×8 |
| `0x3000_0000` | PCIe ECAM |
| `0x8000_0000` | DRAM |

DRAM 시작이 `0x8000_0000`. ARM의 `0x4000_0000`과 *주소만* 다르고 구조는 같습니다.

## PLIC vs CLINT — RISC-V 인터럽트

ARM의 GIC가 *모든 인터럽트*를 하나로 묶어 다룬다면, RISC-V는 *둘로 분리*합니다.

| 컨트롤러 | 역할 |
|----------|------|
| **CLINT** (Core-Local Interruptor) | per-HART 소프트웨어/타이머 인터럽트 |
| **PLIC** (Platform-Level Interrupt Controller) | 외부 디바이스 IRQ를 aggregate |

CLINT는 *각 HART의 일부*처럼 동작하고, PLIC은 *전체 시스템* IRQ를 priority 기반으로 분배. ARM 개발자가 처음 접하면 *왜 둘인가* 의아할 수 있는데, RISC-V는 *minimalism*을 우선해 *core-local*과 *platform-wide*를 분리한 것입니다.

## SMP

```bash
qemu-system-riscv64 -M virt -smp 4 -m 2G -nographic \
    -bios default -kernel Image -append "console=ttyS0"
```

OpenSBI가 부팅하면서 모든 HART를 enumerate.

```text
Platform HART Count       : 4
Boot HART ID              : 0
```

ARM의 PSCI와 달리 RISC-V는 SBI HSM(Hart State Management) 호출로 secondary HART를 깨웁니다.

## CPU 옵션

```bash
# 기본 — RV64GC
-cpu rv64

# Vector extension
-cpu rv64,v=true,vlen=256

# Hypervisor extension
-cpu rv64,h=true

# Maximum
-cpu max
```

vector·hypervisor·bit-manipulation 같은 *신규 확장*을 켜 가며 spec 호환성을 검증할 수 있습니다.

## VirtIO

ARM과 동일.

```bash
qemu-system-riscv64 -M virt -m 2G -smp 4 -nographic \
    -bios default -kernel Image \
    -drive file=rootfs.ext4,format=raw,id=hd0,if=none \
    -device virtio-blk-device,drive=hd0 \
    -netdev user,id=net0 \
    -device virtio-net-device,netdev=net0 \
    -append "root=/dev/vda rw console=ttyS0"
```

## DTB

ARM과 같은 방식으로 자동 생성됩니다.

```bash
qemu-system-riscv64 -M virt,dumpdtb=virt-rv.dtb -nographic
dtc -I dtb -O dts virt-rv.dtb -o virt-rv.dts
```

핵심.

```dts
/ {
    compatible = "riscv-virtio";
    model = "riscv-virtio,qemu";

    cpus {
        cpu@0 {
            compatible = "riscv";
            riscv,isa = "rv64imafdc_zicntr_zicsr_...";
            mmu-type = "riscv,sv57";
        };
    };

    soc {
        serial@10000000 { compatible = "ns16550a"; /* ... */ };
        plic@c000000 { compatible = "sifive,plic-1.0.0"; /* ... */ };
        clint@2000000 { compatible = "sifive,clint0"; /* ... */ };
        virtio_mmio@10001000 { compatible = "virtio,mmio"; /* ... */ };
    };
};
```

## ARM vs RISC-V virt — 비교

| 항목 | ARM virt | RISC-V virt |
|------|----------|--------------|
| binary | `qemu-system-aarch64` | `qemu-system-riscv64` |
| DRAM 시작 | `0x4000_0000` | `0x8000_0000` |
| UART | PL011 | NS16550 |
| Console name | `ttyAMA0` | `ttyS0` |
| 인터럽트 | GIC | PLIC + CLINT |
| Privilege | EL3/2/1/0 | M/S/U + H ext |
| 부팅 firmware | (Boot ROM) | OpenSBI |
| Hypervisor | EL2 | H extension |
| Compatible | linux,dummy-virt | riscv-virtio |

ARM 코드를 RISC-V로 옮길 때 이 표가 *체크리스트*가 됩니다.

## RISC-V QEMU 심화

이 시리즈는 *embedded* 관점. RISC-V QEMU의 *깊은 영역*은 별도 시리즈에서 다룹니다. 부팅 chain·sifive_e/u·OpenTitan·spike 비교·custom device·tracing까지.

## 흔한 함정

- **`console=ttyAMA0`** — ARM 콘솔. RISC-V virt는 `ttyS0`.
- **`-bios` 누락** — OpenSBI 없이는 S-mode 진입 불가. `-bios default` 권장.
- **vector 미지원** — 기본 빌드는 vector off. `-cpu rv64,v=true,vlen=256` 명시.
- **DRAM 부족** — virt RISC-V도 최소 512MB 권장.

## 정리

- RISC-V `virt`는 ARM virt와 *구조적으로 닮았으나* 인터럽트(PLIC+CLINT)·부팅 chain(OpenSBI)·privilege model(M/S/U)에 차이.
- 기본 명령: `qemu-system-riscv64 -M virt -m 2G -bios default -kernel Image -nographic -append "console=ttyS0"`.
- DRAM 시작 `0x8000_0000`, UART는 NS16550 → 콘솔 `ttyS0`.
- OpenSBI가 *M-mode 런타임*. SBI ecall을 통해 S-mode가 power management·console·HSM 호출.
- ARM vs RISC-V virt 비교표가 cross-arch 작업의 빠른 reference.
- 깊은 RISC-V QEMU는 별도 시리즈(QEMU RISC-V 심화).

## 다음 장 예고

다음 장은 *bootloader 단계* — **U-Boot**입니다. ARM·RISC-V 양쪽 virt 머신 위에서 U-Boot를 띄우고 kernel을 로드하는 흐름을 다룹니다.

## 관련 항목

- [Ch 2: ARM virt 머신](/blog/tools/emulation/qemu-embedded/chapter02-arm-virt)
- [Ch 4: U-Boot 부팅](/blog/tools/emulation/qemu-embedded/chapter04-uboot)
- [RISC-V QEMU 심화](/blog/tools/emulation/qemu-riscv/chapter02-virt-machine)
- [Bootloader Internals](/blog/embedded/bootloader/chapter01-boot-problem)
