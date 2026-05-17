---
title: "Ch 11: 커널 부팅"
date: 2025-05-19T05:00:00
description: "U-Boot에서 Linux 커널 부팅 — booti/bootm, FDT 전달, 커널 요구사항을 다룬다."
series: "RISC-V 베어메탈 부트"
seriesOrder: 11
tags: [RISC-V, Linux, Kernel, Boot]
draft: true
---

## 개요

U-Boot에서 Linux 커널을 부팅하는 과정을 다룬다.

---

## 커널 이미지 형식

TODO:

| 형식 | 설명 | 명령어 |
|------|------|--------|
| Image | 압축되지 않은 커널 | booti |
| uImage | U-Boot 래핑 | bootm |
| Image.gz | gzip 압축 | booti (일부 지원) |

---

## booti 명령어

TODO:

```
booti <kernel_addr> <initrd_addr> <fdt_addr>
booti 0x80200000 - 0x82000000
```

---

## FDT 전달

TODO:

```
# FDT 로드
fdt addr 0x82000000

# 커널에 전달
booti 0x80200000 - ${fdt_addr}
```

---

## 커널 요구사항

TODO:

- a0 = hartid
- a1 = FDT 물리 주소
- S-mode로 진입
- MMU off
- 인터럽트 off

---

## 부트 스크립트

TODO:

```
load mmc 0:1 0x80200000 Image
load mmc 0:1 0x82000000 dtb
booti 0x80200000 - 0x82000000
```

---

## extlinux.conf

TODO:

```
label linux
    kernel /Image
    fdt /dtb
    append root=/dev/mmcblk0p2 rootwait
```

---

## 정리

- booti로 Image 부팅
- a0=hartid, a1=fdt 규약
- S-mode, MMU off 상태로 진입
- extlinux.conf로 자동화 가능

---

## 다음 장 예고

Ch 12에서는 부트 디버깅을 다룬다.

---

## 참고 자료

- [Linux RISC-V Boot](https://www.kernel.org/doc/html/latest/riscv/boot.html)
