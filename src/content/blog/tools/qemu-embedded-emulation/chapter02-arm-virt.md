---
title: "Ch 2: ARM virt 머신"
date: 2025-09-15T02:00:00
description: "QEMU ARM virt 머신으로 AArch64 리눅스를 부팅한다."
tags: [QEMU, ARM, virt]
series: "QEMU Embedded Emulation"
seriesOrder: 2
draft: true
---

## ARM virt 머신이란

`virt`는 QEMU의 범용 ARM 플랫폼입니다.

- Cortex-A53/A72 등 CPU 선택 가능
- GICv2/v3 인터럽트 컨트롤러
- PL011 UART
- virtio 디바이스

---

## 기본 실행

```bash
qemu-system-aarch64 -M virt -cpu cortex-a53 -m 512M \
  -kernel Image -append "console=ttyAMA0" -nographic
```

---

## 주요 옵션

- `-M virt`: virt 머신 선택
- `-cpu cortex-a53`: CPU 모델
- `-m 512M`: 메모리
- `-kernel`: 커널 이미지
- `-nographic`: 헤드리스 모드

---

## 정리

- ARM virt 머신은 범용 ARM64 플랫폼이다.
- 크로스 컴파일된 리눅스 커널을 부팅할 수 있다.
- virtio 디바이스로 블록/네트워크를 연결한다.

---

## 관련 항목

- [Ch 1: 임베디드 에뮬레이션 개요](/blog/tools/qemu-embedded-emulation/chapter01-overview)
- [Ch 3: RISC-V virt 머신](/blog/tools/qemu-embedded-emulation/chapter03-riscv-virt)
