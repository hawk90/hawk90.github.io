---
title: "Ch 3: RISC-V virt 머신"
date: 2025-09-15T03:00:00
description: "QEMU RISC-V virt 머신으로 RV64 리눅스를 부팅한다."
tags: [QEMU, RISC-V, virt]
series: "QEMU Embedded Emulation"
seriesOrder: 3
draft: true
---

## RISC-V virt 머신

QEMU의 RISC-V `virt` 머신은 범용 RISC-V 플랫폼입니다.

- RV32/RV64 지원
- PLIC 인터럽트 컨트롤러
- 16550 UART
- virtio 디바이스

---

## 기본 실행

```bash
qemu-system-riscv64 -M virt -m 512M \
  -kernel Image -append "console=ttyS0" -nographic
```

---

## OpenSBI

RISC-V는 SBI (Supervisor Binary Interface)가 필요합니다.

```bash
qemu-system-riscv64 -M virt -bios opensbi-riscv64-generic-fw_dynamic.bin \
  -kernel Image
```

---

## 정리

- RISC-V virt 머신은 범용 RV64 플랫폼이다.
- OpenSBI로 SBI 인터페이스를 제공한다.
- ARM virt와 유사한 방식으로 리눅스를 부팅한다.

---

## 관련 항목

- [Ch 2: ARM virt 머신](/blog/tools/qemu-embedded-emulation/chapter02-arm-virt)
- [Ch 4: U-Boot 부팅](/blog/tools/qemu-embedded-emulation/chapter04-uboot)
