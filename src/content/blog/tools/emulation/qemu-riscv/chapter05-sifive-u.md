---
title: "Ch 5: sifive_u 머신"
date: 2026-05-17T23:00:00
description: "QEMU sifive_u — U54 코어, S 모드, Linux 부팅을 다룬다."
series: "RISC-V QEMU 심화"
seriesOrder: 5
tags: [RISC-V, QEMU, SiFive, U54, Linux, HiFive-Unleashed]
draft: true
---

`sifive_e`가 마이크로컨트롤러급이었다면 **`sifive_u`**는 *application processor*급 머신입니다. SiFive의 첫 Linux-capable 보드 HiFive Unleashed(2018)과 그 후속 HiFive Unmatched(2021)에 들어간 U-시리즈 코어를 모사합니다. RISC-V에서 Linux를 *진짜로* 띄워 보는 가장 표준적인 환경 중 하나입니다.

이 장은 sifive_u의 머신 구성, U54 코어와 S-mode, OpenSBI + U-Boot + Linux 부팅 흐름까지 한 번에 갑니다.

## SiFive Freedom U540과 U54 코어

HiFive Unleashed에 탑재된 SoC는 SiFive Freedom U540.

| 항목 | 값 |
|------|-----|
| Application 코어 | U54 ×4 (RV64GC) |
| Monitor 코어 | S7 ×1 (RV64IMAC) |
| Memory | 8GB DDR4 (실 보드) |
| GbE, MMC, SPI | 표준 |

QEMU의 `sifive_u`는 이 SoC의 *기능적 모델*입니다. application 코어 + monitor 코어 구분, S-mode 지원, GbE/MMC 등 peripheral이 모사됩니다.

`-smp` 옵션으로 application 코어 개수를 조정할 수 있고, monitor 코어(S7)는 항상 HART 0으로 존재합니다.

```bash
qemu-system-riscv64 -machine sifive_u -smp 5 ...
# HART 0: S7 monitor
# HART 1..4: U54 application
```

## S-mode와 Linux

U54는 RISC-V의 *3-mode privilege* 모델(M/S/U)을 완전 지원합니다.

- **M-mode** — Machine, 최고 권한. OpenSBI가 동작.
- **S-mode** — Supervisor. Linux kernel.
- **U-mode** — User. application.

E31(`sifive_e`)는 *M/U*만 있어서 Linux를 띄울 수 없었습니다. U54의 S-mode 지원이 sifive_u에서 Linux 부팅이 가능한 이유입니다.

## 메모리 맵

QEMU sifive_u의 핵심 영역.

| 주소 | 영역 |
|------|------|
| `0x0000_1000` | Boot ROM |
| `0x0200_0000` | CLINT |
| `0x0C00_0000` | PLIC |
| `0x1000_0000` | PRCI (PLL, clock) |
| `0x1001_0000` | UART0 |
| `0x1002_0000` | GPIO |
| `0x1003_0000` | OTP |
| `0x1004_0000` | PWM0 |
| `0x1005_0000` | GEM (GbE) |
| `0x1006_0000` | DDR controller |
| `0x1007_0000` | I2C |
| `0x2000_0000` | Flash (XIP) |
| `0x6000_0000` | DRAM (FU540 기본 시작) |
| `0x8000_0000` | DRAM 확장 |

QEMU 9.x에서는 DRAM이 `0x80000000`부터 시작하도록 표준화되어 있어서 OpenSBI/Linux 빌드와의 호환성이 좋습니다.

## OpenSBI 빌드

Linux를 띄우려면 *M-mode 런타임*인 OpenSBI가 필요합니다.

```bash
git clone https://github.com/riscv-software-src/opensbi.git
cd opensbi

# Generic platform (가장 보편적)
make PLATFORM=generic CROSS_COMPILE=riscv64-linux-gnu-

# sifive/fu540 platform (HW-specific)
make PLATFORM=sifive/fu540 CROSS_COMPILE=riscv64-linux-gnu-
```

빌드 산출물:
- `build/platform/generic/firmware/fw_jump.elf` — 정해진 주소로 jump
- `build/platform/generic/firmware/fw_payload.elf` — payload(예: Linux)와 같이 묶임
- `build/platform/generic/firmware/fw_dynamic.bin` — 런타임에 다음 단계 주소 결정

부팅 흐름과 가장 잘 맞는 것이 `fw_dynamic` 또는 `fw_jump`입니다.

## 가장 간단한 Linux 부팅

미리 만들어진 이미지를 사용한다고 가정한 *Hello Linux* 명령.

```bash
qemu-system-riscv64 -machine sifive_u -smp 5 -m 2G -nographic \
    -bios fw_jump.bin \
    -kernel Image \
    -append "root=/dev/vda rw console=ttySIF0 earlycon" \
    -drive file=rootfs.ext2,format=raw,id=hd0 \
    -device virtio-blk-device,drive=hd0
```

여기서 *주의*할 점: sifive_u의 UART는 `ttySIF0`이지 `ttyS0`이 아닙니다. cmdline `console=ttySIF0`로 정확히 지정해야 콘솔이 보입니다.

부팅 로그 예시:

```text
OpenSBI v1.3
...
Platform Name             : SiFive HiFive Unleashed A00
Boot HART ID              : 1
Boot HART Domain          : root
...
Boot HART ISA             : rv64imafdc_zicntr_zicsr_zifencei_zihpm

[    0.000000] Linux version 6.1.0-... (gcc 13.2.0)
[    0.000000] earlycon: sifive0 at MMIO 0x10010000
[    0.000000] Booting Linux on physical CPU 0x1
...
Welcome to Buildroot
buildroot login: root
# uname -a
Linux buildroot 6.1.0 #1 SMP Mon ... riscv64 GNU/Linux
```

이 한 시퀀스가 *RISC-V Linux 환경*의 입문점입니다.

## fw_payload — OpenSBI + Linux 일체형

OpenSBI 빌드 시 `FW_PAYLOAD_PATH`를 주면 Linux Image를 함께 묶은 *단일 binary*가 만들어집니다.

```bash
make PLATFORM=generic CROSS_COMPILE=riscv64-linux-gnu- \
    FW_PAYLOAD_PATH=/path/to/Image \
    FW_PAYLOAD_FDT_PATH=/path/to/sifive_u.dtb
```

이 binary 하나를 `-bios`로 주면 됩니다.

```bash
qemu-system-riscv64 -machine sifive_u -smp 5 -m 2G -nographic \
    -bios fw_payload.bin \
    -drive file=rootfs.ext2,format=raw,id=hd0 \
    -device virtio-blk-device,drive=hd0
```

`-kernel`이 사라진 게 보일 겁니다. OpenSBI 안에 Image가 *embedded*되어 있어서 OpenSBI가 다음 단계를 *자기 안에서* jump합니다.

## 네트워크

VirtIO-net을 attach해서 host와 통신할 수 있습니다.

```bash
qemu-system-riscv64 -machine sifive_u -smp 5 -m 2G -nographic \
    -bios fw_payload.bin \
    -drive file=rootfs.ext2,format=raw,id=hd0 \
    -device virtio-blk-device,drive=hd0 \
    -netdev user,id=net0,hostfwd=tcp::2222-:22 \
    -device virtio-net-device,netdev=net0
```

이로써 host의 2222 포트가 guest의 22 포트로 매핑되어, host에서 `ssh -p 2222 root@localhost`로 guest에 접속 가능합니다. dropbear나 OpenSSH가 rootfs에 들어 있어야 합니다.

## sifive_u 디바이스 트리

DTB 덤프로 머신 구조를 확인합니다.

```bash
qemu-system-riscv64 -machine sifive_u,dumpdtb=fu540.dtb -nographic
dtc -I dtb -O dts fu540.dtb -o fu540.dts
```

핵심 부분:

```dts
/ {
    compatible = "sifive,hifive-unleashed-a00", "sifive,fu540-c000", "sifive,fu540";
    model = "SiFive HiFive Unleashed A00";

    cpus {
        cpu@0 {
            compatible = "sifive,e51", "sifive,rocket0", "riscv";
            // S7 monitor core
        };
        cpu@1 {
            compatible = "sifive,u54-mc", "sifive,rocket0", "riscv";
            // U54 application core 1
            mmu-type = "riscv,sv39";
        };
        // cpu@2..4: U54 application 2..4
    };

    soc {
        serial@10010000 { compatible = "sifive,uart0"; ... };
        ethernet@10090000 { compatible = "sifive,fu540-c000-gem"; ... };
        // ...
    };
};
```

`compatible` 문자열이 *진짜 SiFive 보드*와 같습니다. Linux driver가 이 문자열을 매칭해서 동작하므로, 실 SiFive 코드가 *그대로* 작동하는 이유입니다.

## 디버깅

Linux kernel 디버깅은 `-s -S`로 stub을 띄우고 kernel을 빌드할 때 디버그 심볼을 보존(`CONFIG_DEBUG_INFO=y`)한 뒤 GDB로 attach.

```bash
qemu-system-riscv64 -machine sifive_u -smp 5 -m 2G -nographic \
    -bios fw_payload.bin -drive ... -s -S
```

```bash
riscv64-linux-gnu-gdb vmlinux
(gdb) target remote :1234
(gdb) hbreak start_kernel
(gdb) continue
```

`hbreak`를 쓰는 이유는 kernel이 *처음 RAM에 옮겨지기 전*에 거는 breakpoint라 hardware breakpoint가 안전하기 때문입니다.

## sifive_u의 의미

QEMU sifive_u가 학습 환경 이상의 의미를 갖는 이유:

- **upstream Linux RISC-V 지원의 1차 검증지**. mainline Linux의 RISC-V 변경이 가장 먼저 시험되는 환경 중 하나.
- **GbE·MMC·DDR 등 *진짜 SoC*의 peripheral 시뮬레이션**이 들어 있어서, virt보다 *실 SoC에 가까운* 시나리오 가능.
- **HiFive Unleashed/Unmatched 보드를 가졌다면**, 코드 일관성을 위한 *완벽한 fallback*.

ARM의 *Versatile Express*가 같은 역할을 하던 시기를 떠올리면 됩니다. SiFive U-시리즈는 RISC-V에서 그 위치를 차지합니다.

## 흔한 함정

- **`console=ttyS0` 사용** — sifive_u는 `ttySIF0`. virt 머신과 헷갈리기 쉽습니다.
- **DRAM 부족** — `-m 1G` 미만으로는 최신 kernel 부팅이 어렵습니다. 2G 권장.
- **fw_payload 빌드에서 endian/abi 불일치** — OpenSBI·Linux를 *같은* cross toolchain으로 빌드.
- **monitor 코어 무시** — Linux는 HART 0(S7)를 부팅 시 *건너뛰고* HART 1(U54)부터 사용. SMP 카운트에 주의.

## 정리

- `sifive_u`는 SiFive FU540(HiFive Unleashed) 호환 QEMU 머신. *Linux-capable* RISC-V 환경의 표준.
- U54 ×4 application + S7 monitor 구성, S-mode 지원으로 Linux 동작.
- OpenSBI(M-mode) → U-Boot 또는 직접 Linux(S-mode) → userland 흐름.
- `fw_jump`(payload 분리)·`fw_payload`(embedded)·`fw_dynamic`(런타임) 세 가지 OpenSBI 형식 선택.
- 콘솔은 `ttySIF0`(virt의 `ttyS0`와 다름).
- `-netdev user,...,hostfwd=...`로 host-guest 네트워크. SSH로 접속 일반적.
- DTB가 실 SiFive 보드와 같은 compatible 문자열을 사용 — driver 코드 호환성 보장.

## 다음 장 예고

다음 장은 *보안 칩* 영역을 다루는 **opentitan** 머신을 살펴봅니다. Google이 주도하는 오픈소스 Root-of-Trust 프로젝트가 QEMU에 어떻게 들어 있는지.

## 관련 항목

- [Ch 4: sifive_e 머신](/blog/tools/emulation/qemu-riscv/chapter04-sifive-e)
- [Ch 6: opentitan 머신](/blog/tools/emulation/qemu-riscv/chapter06-opentitan)
- [QEMU Embedded — Linux Kernel](/blog/tools/emulation/qemu-embedded/chapter05-linux-kernel)
- [Bootloader Internals — RISC-V Boot Flow](/blog/embedded/bootloader/chapter01-boot-problem)
