---
title: "Ch 5: sifive_u 머신"
date: 2025-05-19T23:00:00
description: "QEMU sifive_u — U54 코어, S 모드, Linux 부팅을 다룬다."
series: "RISC-V QEMU 심화"
seriesOrder: 5
tags: [RISC-V, QEMU, SiFive, U54, Linux]
draft: true
---

## 개요

sifive_u 머신은 SiFive U 시리즈(HiFive Unleashed/Unmatched) 호환 플랫폼이다.

---

## 머신 스펙

TODO:

| 항목 | 값 |
|------|-----|
| CPU | U54 (RV64GC) + S7 (RV64IMAC) |
| SMP | 최대 5코어 |
| RAM | 설정 가능 |

---

## 실행

TODO:

```bash
qemu-system-riscv64 -machine sifive_u -nographic \
    -bios opensbi.bin \
    -kernel u-boot.bin
```

---

## 메모리 맵

TODO:

| 주소 | 용도 |
|------|------|
| 0x00001000 | Boot ROM |
| 0x02000000 | CLINT |
| 0x0C000000 | PLIC |
| 0x10000000 | UART |
| 0x10010000 | GPIO |
| 0x80000000 | DRAM |

---

## Linux 부팅

TODO:

```bash
qemu-system-riscv64 -machine sifive_u -m 2G -nographic \
    -bios fw_payload.bin \
    -drive file=rootfs.img,format=raw,id=hd0 \
    -device virtio-blk-device,drive=hd0 \
    -append "root=/dev/vda rw console=ttyS0"
```

---

## 네트워크

TODO:

```bash
-netdev user,id=net0,hostfwd=tcp::2222-:22 \
-device virtio-net-device,netdev=net0
```

---

## 정리

- sifive_u = HiFive Unleashed 에뮬레이션
- U54 (RV64GC) 코어
- S 모드 지원으로 Linux 실행
- VirtIO 블록/네트워크

---

## 다음 장 예고

Ch 6에서는 opentitan 머신을 다룬다.

---

## 참고 자료

- [QEMU sifive_u](https://www.qemu.org/docs/master/system/riscv/sifive_u.html)
