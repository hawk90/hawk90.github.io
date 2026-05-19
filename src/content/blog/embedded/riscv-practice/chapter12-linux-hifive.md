---
title: "Ch 12: Linux on HiFive"
date: 2026-05-17T18:00:00
description: "Linux on HiFive Unmatched — 빌드, 부팅, 드라이버 개발 맛보기를 다룬다."
series: "RISC-V 임베디드 실습"
seriesOrder: 12
tags: [RISC-V, Linux, SiFive, HiFive]
draft: true
---

## 개요

HiFive Unmatched에서 Linux를 실행하고 개발하는 방법을 다룬다.

---

## 부팅 스택

TODO:

```
ROM → U-Boot SPL → OpenSBI → U-Boot → Linux
```

---

## 프리빌트 이미지

TODO:

```bash
# SiFive Freedom-U-SDK
git clone https://github.com/sifive/freedom-u-sdk.git
cd freedom-u-sdk
make DISK=sda
```

---

## 커널 빌드

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

- Buildroot
- Yocto
- Debian/Ubuntu RISC-V

---

## 부팅

TODO:

```bash
# microSD 준비
# 이미지 기록
# 보드에 삽입, 전원
```

---

## 드라이버 개발 맛보기

TODO:

```c
#include <linux/module.h>
#include <linux/kernel.h>

static int __init hello_init(void) {
    pr_info("Hello RISC-V Linux!\n");
    return 0;
}

static void __exit hello_exit(void) {
    pr_info("Goodbye RISC-V Linux!\n");
}

module_init(hello_init);
module_exit(hello_exit);
MODULE_LICENSE("GPL");
```

---

## 크로스 컴파일

TODO:

```makefile
ARCH := riscv
CROSS_COMPILE := riscv64-linux-gnu-
KDIR := /path/to/linux

obj-m := hello.o

all:
    make -C $(KDIR) M=$(PWD) modules
```

---

## 정리

- HiFive Unmatched는 Linux 실행 가능
- Freedom-U-SDK로 풀 스택 빌드
- 표준 Linux 개발 워크플로우
- 드라이버 개발도 가능

---

## 시리즈 마무리

이 시리즈에서 RISC-V 임베디드 개발을 실습했다.

---

## 관련 시리즈

- [RISC-V ISA 해부](/blog/systems/riscv/isa-anatomy/) — ISA 기초
- [RISC-V 베어메탈 부트](/blog/systems/riscv/baremetal-boot/) — 부트 과정
- [RISC-V QEMU 심화](/blog/tools/emulation/qemu-riscv/) — 에뮬레이션

---

## 참고 자료

- [Freedom-U-SDK](https://github.com/sifive/freedom-u-sdk)
- [Linux RISC-V](https://www.kernel.org/doc/html/latest/riscv/)
