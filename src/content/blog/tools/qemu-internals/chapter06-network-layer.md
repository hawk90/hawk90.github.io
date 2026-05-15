---
title: "Ch 6: 네트워크 레이어"
date: 2025-10-01T06:00:00
description: "QEMU NIC 에뮬레이션과 네트워크 백엔드를 이해한다."
tags: [QEMU, Network, NIC]
series: "QEMU Internals"
seriesOrder: 6
draft: true
---

## 네트워크 구조

```
┌──────────────┐     ┌──────────────┐
│   Guest OS   │     │   Host OS    │
└──────┬───────┘     └──────┬───────┘
       │                    │
┌──────▼───────┐     ┌──────▼───────┐
│  NIC (e1000, │     │   Backend    │
│  virtio-net) │────▶│ (tap, user)  │
└──────────────┘     └──────────────┘
```

---

## NIC 에뮬레이션

- **e1000**: Intel 82540EM
- **rtl8139**: Realtek
- **virtio-net**: 준가상화 NIC

---

## 백엔드

- **user (SLIRP)**: NAT 기반, 설정 간단
- **tap**: 호스트 네트워크 브릿지
- **socket**: QEMU 간 네트워킹
- **vhost-user**: 유저스페이스 가속

---

## 정리

- NIC 에뮬레이션이 게스트 네트워크 디바이스를 제공한다.
- 백엔드가 실제 네트워크 연결을 처리한다.
- virtio-net + vhost로 최적의 성능을 얻는다.

---

## 관련 항목

- [Ch 5: 블록 레이어](/blog/tools/qemu-internals/chapter05-block-layer)
- [Ch 7: PCI 서브시스템](/blog/tools/qemu-internals/chapter07-pci-subsystem)
