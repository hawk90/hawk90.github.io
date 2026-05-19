---
title: "Ch 5: 블록 레이어"
date: 2026-05-17T05:00:00
description: "QEMU 블록 레이어의 이미지 포맷과 I/O 경로를 이해한다."
tags: [QEMU, Block, Storage]
series: "QEMU Internals"
seriesOrder: 5
draft: true
---

## 블록 레이어 구조

```
┌──────────────┐
│  BlockDevice │  (virtio-blk, IDE, etc.)
└──────┬───────┘
       │
┌──────▼───────┐
│ BlockBackend │
└──────┬───────┘
       │
┌──────▼───────┐
│     BDS      │  (Block Driver State)
│  qcow2/raw   │
└──────┬───────┘
       │
┌──────▼───────┐
│   Protocol   │  (file, nbd, etc.)
└──────────────┘
```

---

## 이미지 포맷

- **raw**: 원시 디스크 이미지
- **qcow2**: QEMU Copy-On-Write v2
- **vmdk**: VMware 포맷
- **vdi**: VirtualBox 포맷

---

## qcow2 특징

- 스냅샷
- 압축
- 암호화
- 스파스 할당

---

## 정리

- 블록 레이어는 디바이스 → 백엔드 → 드라이버 → 프로토콜로 계층화된다.
- qcow2는 QEMU 네이티브 포맷으로 다양한 기능을 지원한다.
- Coroutine 기반으로 비동기 I/O를 처리한다.

---

## 관련 항목

- [Ch 4: 이벤트 루프](/blog/tools/emulation/qemu-internals/chapter04-event-loop)
- [Ch 6: 네트워크 레이어](/blog/tools/emulation/qemu-internals/chapter06-network-layer)
