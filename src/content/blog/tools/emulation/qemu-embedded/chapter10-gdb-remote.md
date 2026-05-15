---
title: "Ch 10: GDB 원격 디버깅"
date: 2025-09-15T10:00:00
description: "QEMU GDB 서버로 커널과 펌웨어를 원격 디버깅한다."
tags: [QEMU, GDB, Debugging]
series: "QEMU Embedded Emulation"
seriesOrder: 10
draft: true
---

## GDB 서버 활성화

```bash
qemu-system-aarch64 -M virt -s -S -kernel Image ...
```

- `-s`: GDB 서버 (포트 1234)
- `-S`: 시작 시 일시정지

---

## GDB 연결

```bash
aarch64-linux-gnu-gdb vmlinux
(gdb) target remote :1234
(gdb) continue
```

---

## 브레이크포인트

```bash
(gdb) break start_kernel
(gdb) continue
```

---

## 정리

- QEMU -s -S 옵션으로 GDB 서버를 시작한다.
- 크로스 GDB로 연결해 커널을 디버깅한다.
- vmlinux 심볼로 소스 레벨 디버깅이 가능하다.

---

## 관련 항목

- [Ch 9: 네트워킹](/blog/tools/qemu-embedded-emulation/chapter09-networking)
- [Ch 11: 베어메탈 펌웨어](/blog/tools/qemu-embedded-emulation/chapter11-baremetal)
