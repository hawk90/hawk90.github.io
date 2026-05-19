---
title: "Ch 9: 네트워킹"
date: 2026-05-17T09:00:00
description: "QEMU에서 TAP/User-mode 네트워킹을 설정한다."
tags: [QEMU, Networking, TAP]
series: "QEMU Embedded Emulation"
seriesOrder: 9
draft: true
---

## 네트워킹 모드

- **User-mode (SLIRP)**: 별도 설정 없이 NAT 네트워킹
- **TAP**: 호스트와 브릿지 연결
- **Socket**: QEMU 간 네트워킹

---

## User-mode

```bash
qemu-system-aarch64 -M virt \
  -netdev user,id=net0 -device virtio-net-device,netdev=net0
```

---

## TAP 네트워킹

```bash
sudo ip tuntap add tap0 mode tap
sudo ip link set tap0 up
qemu-system-aarch64 -M virt \
  -netdev tap,id=net0,ifname=tap0,script=no \
  -device virtio-net-device,netdev=net0
```

---

## 정리

- User-mode는 가장 간단하지만 성능 제한이 있다.
- TAP은 실제 네트워크처럼 동작한다.
- virtio-net으로 네트워크 디바이스를 추가한다.

---

## 관련 항목

- [Ch 8: 페리페럴 추가](/blog/tools/qemu-embedded-emulation/chapter08-peripherals)
- [Ch 10: GDB 원격 디버깅](/blog/tools/qemu-embedded-emulation/chapter10-gdb-remote)
