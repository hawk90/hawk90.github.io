---
title: "Ch 5: 리눅스 커널 부팅"
date: 2025-09-15T05:00:00
description: "크로스 컴파일된 리눅스 커널을 QEMU에서 부팅한다."
tags: [QEMU, Linux, Kernel]
series: "QEMU Embedded Emulation"
seriesOrder: 5
draft: true
---

## 크로스 컴파일 환경

ARM64 커널 빌드:

```bash
export ARCH=arm64
export CROSS_COMPILE=aarch64-linux-gnu-
make defconfig
make -j$(nproc)
```

---

## QEMU에서 부팅

```bash
qemu-system-aarch64 -M virt -cpu cortex-a53 -m 512M \
  -kernel arch/arm64/boot/Image \
  -append "console=ttyAMA0" -nographic
```

---

## 커널 커맨드라인

주요 옵션:
- `console=ttyAMA0`: 시리얼 콘솔
- `root=/dev/vda`: 루트 파일시스템
- `earlycon`: 초기 콘솔

---

## 정리

- 크로스 컴파일러로 타겟 아키텍처 커널을 빌드한다.
- QEMU -kernel 옵션으로 직접 커널을 로드한다.
- console= 옵션으로 시리얼 출력을 설정한다.

---

## 관련 항목

- [Ch 4: U-Boot 부팅](/blog/tools/qemu-embedded-emulation/chapter04-uboot)
- [Ch 6: 루트 파일시스템](/blog/tools/qemu-embedded-emulation/chapter06-rootfs)
