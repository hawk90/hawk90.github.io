---
title: "Ch 9: U-Boot RISC-V 포팅"
date: 2026-05-17T03:00:00
description: "U-Boot RISC-V — 보드 설정, 디바이스 트리, 드라이버 설정을 다룬다."
series: "RISC-V 베어메탈 부트"
seriesOrder: 9
tags: [RISC-V, U-Boot, Bootloader, Porting]
draft: true
---

## 개요

U-Boot의 RISC-V 포팅과 설정을 다룬다.

---

## U-Boot RISC-V 지원

TODO: 지원 보드 목록

---

## 빌드 환경

TODO:

```bash
git clone https://github.com/u-boot/u-boot.git
cd u-boot
make CROSS_COMPILE=riscv64-linux-gnu- qemu-riscv64_smode_defconfig
make CROSS_COMPILE=riscv64-linux-gnu- -j$(nproc)
```

---

## defconfig 구조

TODO:

```
configs/qemu-riscv64_smode_defconfig
configs/sifive_unleashed_defconfig
```

---

## 보드 파일 구조

TODO:

```
board/
├── emulation/
│   └── qemu-riscv/
└── sifive/
    └── unleashed/
```

---

## 디바이스 트리 설정

TODO:

```
arch/riscv/dts/
├── qemu-virt64.dts
└── hifive-unleashed-a00.dts
```

---

## 드라이버 설정

TODO: Kconfig, 디바이스 트리 바인딩

---

## S-mode vs M-mode

TODO:

```
qemu-riscv64_smode — S-mode (OpenSBI 필요)
qemu-riscv64       — M-mode (단독 실행)
```

---

## 정리

- defconfig로 보드 설정
- S-mode가 일반적 (OpenSBI 위에서)
- DTS로 하드웨어 기술
- 드라이버는 Kconfig로 선택

---

## 다음 장 예고

Ch 10에서는 U-Boot SPL을 다룬다.

---

## 참고 자료

- [U-Boot RISC-V Documentation](https://docs.u-boot.org/en/latest/arch/riscv.html)
