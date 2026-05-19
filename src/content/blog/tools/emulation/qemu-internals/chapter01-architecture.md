---
title: "Ch 1: QEMU 아키텍처 개요"
date: 2026-05-17T01:00:00
description: "QEMU의 전체 아키텍처 — TCG, KVM, 디바이스 모델을 이해한다."
tags: [QEMU, Architecture, TCG, KVM]
series: "QEMU Internals"
seriesOrder: 1
draft: true
---

## QEMU란 무엇인가

QEMU는 다목적 에뮬레이터/가상화 도구입니다.

- **Full System Emulation**: CPU + 메모리 + 디바이스 전체 에뮬레이션
- **User Mode Emulation**: 다른 아키텍처 바이너리 실행
- **KVM 가속**: 하드웨어 가상화로 네이티브 속도

---

## 핵심 구성 요소

```
┌─────────────────────────────────────────┐
│              QEMU Process               │
├─────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │   TCG   │  │   KVM   │  │  Hvf/   │ │
│  │         │  │ accel   │  │  WHPX   │ │
│  └─────────┘  └─────────┘  └─────────┘ │
├─────────────────────────────────────────┤
│              Device Model               │
│  PCI, MMIO, IRQ, DMA, etc.             │
├─────────────────────────────────────────┤
│              Main Loop                  │
│  Event loop, timers, I/O               │
└─────────────────────────────────────────┘
```

---

## TCG (Tiny Code Generator)

소프트웨어 기반 CPU 에뮬레이션:

1. 게스트 코드 → TCG IR (중간 표현)
2. TCG IR → 호스트 코드
3. 변환된 코드 캐시 (TB: Translation Block)

---

## KVM 가속

호스트와 게스트 아키텍처가 같을 때:

- VT-x/AMD-V 하드웨어 가상화 활용
- 게스트 코드가 네이티브 속도로 실행
- MMIO/포트 I/O만 QEMU가 처리

---

## 정리

- QEMU는 TCG(소프트웨어) 또는 KVM(하드웨어)으로 CPU를 에뮬레이션한다.
- 디바이스 모델은 PCI, MMIO, 인터럽트를 처리한다.
- 메인 루프가 이벤트와 타이머를 관리한다.

---

## 관련 항목

- [Ch 2: QOM 심화](/blog/tools/emulation/qemu-internals/chapter02-qom-deep-dive)
- [QEMU Fake Device Driver 시리즈](/blog/tools/emulation/qemu-fake-device/chapter01-overview)
