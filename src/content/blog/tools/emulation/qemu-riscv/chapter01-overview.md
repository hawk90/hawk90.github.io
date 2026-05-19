---
title: "Ch 1: QEMU RISC-V 개요"
date: 2026-05-17T19:00:00
description: "QEMU RISC-V — 지원 머신, 빌드 옵션, 기본 사용법을 다룬다."
series: "RISC-V QEMU 심화"
seriesOrder: 1
tags: [RISC-V, QEMU, Emulation, virt]
draft: true
---

## 개요

QEMU의 RISC-V 시스템 에뮬레이션을 다룬다.

---

## QEMU RISC-V 바이너리

TODO:

```
qemu-system-riscv32  — 32비트 시스템
qemu-system-riscv64  — 64비트 시스템
```

---

## 지원 머신

TODO:

```bash
qemu-system-riscv64 -machine help
```

| 머신 | 설명 |
|------|------|
| virt | 범용 가상 플랫폼 |
| sifive_e | SiFive E 시리즈 |
| sifive_u | SiFive U 시리즈 |
| opentitan | OpenTitan 보안 칩 |
| spike | Spike ISA 시뮬레이터 호환 |

---

## 설치

TODO:

```bash
# Ubuntu
sudo apt install qemu-system-misc

# 소스 빌드
git clone https://gitlab.com/qemu-project/qemu.git
cd qemu
./configure --target-list=riscv32-softmmu,riscv64-softmmu
make -j$(nproc)
```

---

## 기본 실행

TODO:

```bash
qemu-system-riscv64 -machine virt -nographic \
    -bios opensbi-riscv64-generic-fw_jump.bin \
    -kernel u-boot.bin
```

---

## 주요 옵션

TODO:

| 옵션 | 설명 |
|------|------|
| -machine | 머신 타입 |
| -cpu | CPU 모델 |
| -m | 메모리 크기 |
| -bios | 펌웨어 (OpenSBI) |
| -kernel | 커널/부트로더 |
| -nographic | GUI 없이 |
| -s -S | GDB 대기 |

---

## 정리

- QEMU는 RISC-V 시스템 에뮬레이션 지원
- virt 머신이 범용적
- OpenSBI + U-Boot + Linux 풀 스택 가능
- 하드웨어 없이 개발/테스트

---

## 다음 장 예고

Ch 2에서는 virt 머신을 상세히 다룬다.

---

## 참고 자료

- [QEMU RISC-V](https://www.qemu.org/docs/master/system/target-riscv.html)
