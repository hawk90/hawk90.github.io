---
title: "Ch 4: U-Boot 부팅"
date: 2025-09-15T04:00:00
description: "QEMU에서 U-Boot 부트로더를 실행하고 커널을 로드한다."
tags: [QEMU, U-Boot, Bootloader]
series: "QEMU Embedded Emulation"
seriesOrder: 4
draft: true
---

## U-Boot란

Das U-Boot는 임베디드 시스템의 표준 부트로더입니다.

- 멀티 아키텍처 지원
- 네트워크 부팅 (TFTP)
- 스크립트 기반 부팅

---

## QEMU에서 U-Boot 실행

```bash
qemu-system-aarch64 -M virt -cpu cortex-a53 -m 512M \
  -bios u-boot.bin -nographic
```

---

## U-Boot에서 커널 로드

```
=> load virtio 0:1 0x40000000 Image
=> booti 0x40000000 - 0x44000000
```

---

## 정리

- U-Boot를 QEMU에서 실행해 부트로더를 테스트한다.
- virtio-blk로 디스크 이미지를 연결한다.
- booti/bootm 명령으로 커널을 로드한다.

---

## 관련 항목

- [Ch 3: RISC-V virt 머신](/blog/tools/qemu-embedded-emulation/chapter03-riscv-virt)
- [Ch 5: 리눅스 커널 부팅](/blog/tools/qemu-embedded-emulation/chapter05-linux-kernel)
