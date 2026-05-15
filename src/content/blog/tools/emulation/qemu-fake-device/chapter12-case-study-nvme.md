---
title: "Ch 12: 사례 연구 — NVMe 가상 디바이스"
date: 2025-09-01T12:00:00
description: "QEMU 내장 NVMe 디바이스 분석으로 실전 패턴을 학습한다."
tags: [QEMU, NVMe, CaseStudy]
series: "QEMU Fake Device Driver"
seriesOrder: 12
draft: true
---

## QEMU NVMe 디바이스

QEMU는 NVMe 디바이스 에뮬레이션을 내장하고 있습니다.

```bash
qemu-system-x86_64 -drive file=disk.qcow2,if=none,id=nvm \
  -device nvme,serial=deadbeef,drive=nvm
```

---

## 소스 코드 분석

`hw/nvme/ctrl.c` — NVMe 컨트롤러 구현

주요 구조:
- Admin Queue / IO Queue
- Submission Queue / Completion Queue
- Doorbell Registers

---

## 학습 포인트

1. **복잡한 레지스터 레이아웃** — CAP, VS, CC, CSTS
2. **큐 관리** — SQ/CQ 생성/삭제
3. **커맨드 처리** — Admin/IO 커맨드
4. **에러 처리** — Status Field

---

## 정리

- QEMU NVMe 디바이스는 실전 디바이스 모델의 좋은 예시다.
- 큐 기반 커맨드 처리 패턴을 학습한다.
- 복잡한 레지스터 맵을 구현하는 방법을 배운다.

---

## 시리즈 마무리

이 시리즈에서 배운 것:
- QEMU 디바이스 모델 작성법
- QOM 타입 시스템
- PCI/MMIO/인터럽트/DMA 구현
- 리눅스 드라이버 연동
- 디버깅과 테스트 자동화

---

## 관련 항목

- [Ch 11: 고급 시나리오](/blog/tools/qemu-fake-device/chapter11-advanced-scenarios)
- [QEMU Embedded Emulation 시리즈](/blog/tools/qemu-embedded-emulation/chapter01-overview)
