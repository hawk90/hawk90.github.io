---
title: "Ch 9: 풀 스택 부팅"
date: 2026-05-17T03:00:00
description: "QEMU 풀 스택 — OpenSBI + U-Boot + Linux 부팅을 다룬다."
series: "RISC-V QEMU 심화"
seriesOrder: 9
tags: [RISC-V, QEMU, OpenSBI, U-Boot, Linux]
draft: true
---

## 개요

QEMU에서 OpenSBI → U-Boot → Linux 풀 스택 부팅을 구성한다.

---

## 부팅 스택

TODO:

```
QEMU ROM → OpenSBI → U-Boot → Linux
```

---

## OpenSBI 빌드

TODO:

```bash
git clone https://github.com/riscv-software-src/opensbi.git
cd opensbi
make PLATFORM=generic CROSS_COMPILE=riscv64-linux-gnu-
```

---

## U-Boot 빌드

TODO:

```bash
git clone https://github.com/u-boot/u-boot.git
cd u-boot
make CROSS_COMPILE=riscv64-linux-gnu- qemu-riscv64_smode_defconfig
make CROSS_COMPILE=riscv64-linux-gnu- -j$(nproc)
```

---

## Linux 커널 빌드

TODO:

```bash
git clone https://github.com/torvalds/linux.git
cd linux
make ARCH=riscv CROSS_COMPILE=riscv64-linux-gnu- defconfig
make ARCH=riscv CROSS_COMPILE=riscv64-linux-gnu- -j$(nproc)
```

---

## 루트 파일시스템

TODO:

```bash
# Buildroot
git clone https://github.com/buildroot/buildroot.git
cd buildroot
make qemu_riscv64_virt_defconfig
make -j$(nproc)
```

---

## QEMU 실행

TODO:

```bash
qemu-system-riscv64 -machine virt -m 2G -nographic \
    -bios opensbi/build/platform/generic/firmware/fw_jump.bin \
    -kernel u-boot/u-boot.bin \
    -drive file=rootfs.ext2,format=raw,id=hd0 \
    -device virtio-blk-device,drive=hd0 \
    -append "root=/dev/vda rw console=ttyS0"
```

---

## 올인원 fw_payload

TODO:

```bash
make PLATFORM=generic FW_PAYLOAD_PATH=../u-boot/u-boot.bin
```

---

## 정리

- OpenSBI: M-mode 런타임
- U-Boot: 부트로더
- Linux: 커널
- Buildroot: 루트 파일시스템
- QEMU로 통합 테스트

---

## 다음 장 예고

Ch 10에서는 성능 측정과 트레이싱을 다룬다.

---

## 참고 자료

- [OpenSBI](https://github.com/riscv-software-src/opensbi)
- [U-Boot RISC-V](https://docs.u-boot.org/en/latest/arch/riscv.html)
- [Buildroot](https://buildroot.org/)
