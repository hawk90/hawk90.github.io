---
title: "Ch 9: 풀 스택 부팅"
date: 2026-05-17T03:00:00
description: "QEMU 풀 스택 — OpenSBI + U-Boot + Linux 부팅을 다룬다."
series: "RISC-V QEMU 심화"
seriesOrder: 9
tags: [RISC-V, QEMU, OpenSBI, U-Boot, Linux, Buildroot, Boot]
draft: true
---

RISC-V Linux 시스템의 표준 부팅 chain은 다음과 같습니다.

```text
QEMU mrom (0x1000)
    │
    ▼
OpenSBI (M-mode)
    │
    ▼
U-Boot (S-mode)
    │
    ▼
Linux kernel (S-mode)
    │
    ▼
Userland (U-mode)
```

이 장은 *각 단계*를 직접 빌드해서 QEMU에 올리는 *모든 명령*을 한 자리에 모읍니다. RISC-V 시스템 개발자가 *한 번은* 통과해야 하는 흐름입니다.

## 어떤 문제를 푸는가

`-bios default`로 OpenSBI만 빠르게 띄울 수도, `fw_payload`로 OpenSBI+Linux 한 binary를 만들 수도 있지만, *모든 단계를 분리해서* 각자 빌드·테스트할 줄 알아야 합니다.

- OpenSBI 정책 변경(예: PMP 추가)을 시험할 때.
- U-Boot 명령 추가나 새 driver를 시험할 때.
- Kernel config를 자유롭게 바꾸며 부팅을 점검할 때.
- 새로운 rootfs 이미지를 갈아 끼우며 application stack을 테스트할 때.

분리된 흐름을 한 번 만들어 두면 *각 layer를 독립적으로* 바꿔 가며 시험할 수 있습니다.

## 1단계 — Cross toolchain 준비

```bash
# Ubuntu
sudo apt install gcc-riscv64-linux-gnu binutils-riscv64-linux-gnu

# 또는 풀 GNU toolchain
git clone https://github.com/riscv-collab/riscv-gnu-toolchain.git
cd riscv-gnu-toolchain
./configure --prefix=/opt/riscv --enable-multilib
make linux -j$(nproc)
```

환경 변수 설정.

```bash
export CROSS_COMPILE=riscv64-linux-gnu-
export ARCH=riscv
export PATH=/opt/riscv/bin:$PATH
```

## 2단계 — OpenSBI 빌드

OpenSBI는 *M-mode 런타임*. 부팅 직후 가장 먼저 동작하고 *Supervisor Binary Interface*(SBI) ecall을 노출합니다.

```bash
git clone https://github.com/riscv-software-src/opensbi.git
cd opensbi
git checkout v1.3

make PLATFORM=generic
```

빌드 결과:
- `build/platform/generic/firmware/fw_jump.elf` — payload를 *고정 주소로 jump*
- `build/platform/generic/firmware/fw_jump.bin` — binary 형태
- `build/platform/generic/firmware/fw_dynamic.bin` — *런타임에* 다음 단계 주소 결정
- `build/platform/generic/firmware/fw_payload.bin` — payload embedded

`fw_dynamic`이 가장 유연합니다 — QEMU가 device tree로 다음 단계 주소를 전달합니다.

## 3단계 — U-Boot 빌드

U-Boot은 S-mode bootloader. *kernel을 로드하고 device tree·boot args를 정리*해서 진입합니다.

```bash
git clone https://github.com/u-boot/u-boot.git
cd u-boot
git checkout v2024.04

# QEMU virt용 config
make qemu-riscv64_smode_defconfig
make -j$(nproc)
```

결과:
- `u-boot.bin` — bare binary
- `u-boot.itb` — flattened image tree(권장, fdt 포함)

## 4단계 — Linux kernel 빌드

```bash
git clone --depth=1 https://github.com/torvalds/linux.git
cd linux
git checkout v6.6

# RISC-V defconfig
make defconfig
make -j$(nproc) Image
```

결과:
- `arch/riscv/boot/Image` — uncompressed kernel image
- `arch/riscv/boot/Image.gz` — compressed

## 5단계 — Rootfs 만들기

[Buildroot](https://buildroot.org)는 가장 빠른 rootfs 생성기.

```bash
git clone https://github.com/buildroot/buildroot.git
cd buildroot
git checkout 2024.02

# QEMU RISC-V virt config
make qemu_riscv64_virt_defconfig
make -j$(nproc)
```

결과 (`output/images/`):
- `rootfs.ext2` — 32MB ext2 disk image
- `rootfs.cpio` — initramfs용
- `Image` — kernel (buildroot가 같이 빌드)
- `fw_jump.bin` — opensbi (buildroot가 같이 빌드)

buildroot이 한 번에 모든 component를 빌드해 주므로, 처음에는 buildroot로 시작하는 게 빠릅니다. 그 다음에 각 component를 *내가 빌드한 것*으로 교체.

## 6단계 — 부팅

가장 단순한 방식: OpenSBI에 kernel을 payload로.

```bash
qemu-system-riscv64 -machine virt -m 2G -smp 4 -nographic \
    -bios opensbi/build/platform/generic/firmware/fw_jump.bin \
    -kernel linux/arch/riscv/boot/Image \
    -drive file=buildroot/output/images/rootfs.ext2,format=raw,id=hd0 \
    -device virtio-blk-device,drive=hd0 \
    -append "root=/dev/vda rw console=ttyS0 earlycon"
```

여기서 `fw_jump`는 *kernel의 시작 주소*로 바로 jump합니다(U-Boot 우회). 단순하지만 U-Boot의 *CLI 디버깅*을 못 씁니다.

## 7단계 — U-Boot까지 포함

U-Boot의 CLI를 거치는 부팅.

```bash
qemu-system-riscv64 -machine virt -m 2G -smp 4 -nographic \
    -bios opensbi/build/platform/generic/firmware/fw_jump.bin \
    -kernel u-boot/u-boot.bin
```

이러면 U-Boot prompt(`=>`)에 진입합니다.

```text
U-Boot 2024.04 (Apr 25 2024 - 12:34:56 +0000)

CPU:   rv64imafdc_zicntr_zicsr_zifencei_zihpm
Model: riscv-virtio,qemu
DRAM:  2 GiB
Core:  0 devices, 8 uclasses
Loading Environment from nowhere... OK
In:    serial,usbkbd
Out:   serial,vidconsole
Err:   serial,vidconsole
Net:   eth0: virtio-net#10
=>
```

여기서 kernel을 *동적으로* 로드합니다(시리얼 protocol·tftp·VirtIO 등).

## 8단계 — TFTP boot 흐름

host에서 tftpd를 띄우고 U-Boot이 fetch.

```bash
# host에서
sudo apt install tftpd-hpa
sudo cp linux/arch/riscv/boot/Image /var/lib/tftpboot/
sudo cp virt.dtb /var/lib/tftpboot/   # QEMU dumpdtb로 얻은 것
sudo systemctl restart tftpd-hpa
```

QEMU에 host 네트워크 attach.

```bash
qemu-system-riscv64 -machine virt -m 2G -smp 4 -nographic \
    -bios opensbi/build/platform/generic/firmware/fw_jump.bin \
    -kernel u-boot/u-boot.bin \
    -netdev user,id=net0 \
    -device virtio-net-device,netdev=net0
```

U-Boot prompt에서:

```text
=> setenv serverip 10.0.2.2
=> tftpboot 0x84000000 Image
=> tftpboot 0x88000000 virt.dtb
=> booti 0x84000000 - 0x88000000
```

`10.0.2.2`는 QEMU의 *user-mode 네트워크*가 host를 노출하는 표준 주소입니다.

## 9단계 — VirtIO block에서 boot

좀 더 *실 시스템* 같은 방식 — disk에서 kernel 읽어 들이기.

```bash
# 디스크 이미지 만들기
qemu-img create -f raw rootfs.img 256M
mkfs.ext4 rootfs.img

# Mount해서 부팅 파일 복사
sudo mount -o loop rootfs.img /mnt
sudo cp linux/arch/riscv/boot/Image /mnt/
# ... 다른 rootfs 파일들
sudo umount /mnt
```

```bash
qemu-system-riscv64 -machine virt -m 2G -smp 4 -nographic \
    -bios opensbi/build/platform/generic/firmware/fw_jump.bin \
    -kernel u-boot/u-boot.bin \
    -drive file=rootfs.img,format=raw,id=hd0 \
    -device virtio-blk-device,drive=hd0
```

U-Boot에서:

```text
=> virtio scan
=> ext4ls virtio 0
=> ext4load virtio 0 0x84000000 /Image
=> booti 0x84000000 - $fdtcontrolladdr
```

`$fdtcontrolladdr`는 U-Boot이 자체 fdt를 보관해 둔 주소. QEMU가 device tree를 줬다면 이 값을 자동으로 채워 둡니다.

## fw_payload — 일체형으로 묶기

매번 따로 로드하기 번거로우면 OpenSBI에 *Linux Image*를 직접 embed.

```bash
cd opensbi
make PLATFORM=generic CROSS_COMPILE=riscv64-linux-gnu- \
    FW_PAYLOAD_PATH=../linux/arch/riscv/boot/Image \
    FW_PAYLOAD_FDT_PATH=../virt.dtb
```

```bash
qemu-system-riscv64 -machine virt -m 2G -smp 4 -nographic \
    -bios opensbi/build/platform/generic/firmware/fw_payload.bin \
    -drive file=rootfs.img,format=raw,id=hd0 \
    -device virtio-blk-device,drive=hd0 \
    -append "root=/dev/vda rw console=ttyS0"
```

`-kernel`이 사라졌습니다. OpenSBI 내부에 kernel이 *함께* 있어서.

## 부팅 결과

성공적인 풀 스택 부팅 출력 예.

```text
OpenSBI v1.3
...
Boot HART ID              : 0
Boot HART Domain          : root
Boot HART Priv Version    : v1.12
...
[    0.000000] Linux version 6.6.0 (user@host) (gcc ...)
[    0.000000] earlycon: sbi0 at I/O port 0x0 (options '')
[    0.000000] printk: bootconsole [sbi0] enabled
[    0.000000] efi: UEFI not found.
[    0.000000] OF: fdt: Ignoring memory range 0x80000000 - 0x80200000
[    0.000000] Machine model: riscv-virtio,qemu
...
[    0.000000] CPU: ASID bits 16
[    0.000000] CPU: rv64imafdc_zicntr_zicsr_zifencei_zihpm
...
[    1.234567] Run /sbin/init as init process

Welcome to Buildroot
buildroot login: root
# uname -a
Linux buildroot 6.6.0 #1 SMP ... riscv64 GNU/Linux
# cat /proc/cpuinfo
processor       : 0
hart            : 0
isa             : rv64imafdc_zicntr_zicsr_zifencei_zihpm
mmu             : sv57
uarch           : qemu
```

여기까지 도달하면 RISC-V Linux 환경이 끝입니다.

## 디버깅 팁

문제가 어디서 멈췄는지 식별하는 단계별 진단.

| 증상 | 원인 추정 |
|------|-----------|
| QEMU 자체가 안 시작 | binary 경로·권한·QEMU 버전 |
| OpenSBI 로그 안 보임 | console 옵션, `-nographic`+`-serial mon:stdio` 시도 |
| OpenSBI 출력 후 멈춤 | kernel 또는 U-Boot payload 주소 mismatch |
| U-Boot 안 보임 | `fw_jump`가 kernel로 직접 jump했을 가능성 |
| kernel panic | bootargs(`root=...`)·rootfs 손상 |
| init 못 찾음 | rootfs의 `/sbin/init` 부재 |

`-d in_asm,int -D trace.log`로 어셈블리 trace를 떨군 뒤 분석.

## 정리

- RISC-V 풀 부팅 chain: mrom → OpenSBI → U-Boot → Linux → userland.
- Cross toolchain은 apt 또는 source build. OpenSBI는 `PLATFORM=generic`, U-Boot는 `qemu-riscv64_smode_defconfig`.
- Kernel `defconfig`로 시작, Buildroot로 rootfs 빠르게 생성.
- 가장 단순한 부팅은 `-bios fw_jump.bin -kernel Image`. U-Boot까지 거치면 *CLI 디버깅* 가능.
- TFTP·VirtIO block·`fw_payload` embedded 형식 셋이 각자 다른 장단점.
- 콘솔은 `ttyS0`(virt) vs `ttySIF0`(sifive_u). cmdline에 정확히 명시.
- 단계별 디버깅 — 어디서 멈췄는지가 어느 layer의 문제인지를 알려 줍니다.

## 다음 장 예고

마지막 장은 *성능 측정과 트레이싱*입니다. QEMU의 `-d` 옵션, trace subsystem, TCG 프로파일링, perf 연동까지 — 시뮬레이션 환경에서 *어떤* 정보를 *얼마나* 얻을 수 있는지 정리합니다.

## 관련 항목

- [Ch 8: 커스텀 디바이스 추가](/blog/tools/emulation/qemu-riscv/chapter08-custom-device)
- [Ch 10: 성능 측정과 트레이싱](/blog/tools/emulation/qemu-riscv/chapter10-tracing)
- [QEMU Embedded — U-Boot](/blog/tools/emulation/qemu-embedded/chapter04-uboot)
- [Bootloader Internals — Driver Model](/blog/embedded/bootloader/chapter07-driver-model)
- [Buildroot Practical](/blog/embedded/buildroot/chapter01-problem)
