---
title: "Ch 9: 타이머와 클럭"
date: 2026-05-17T09:00:00
description: "QEMU의 시간 관리, RTC, 타이머 구현을 이해한다."
tags: [QEMU, Timer, Clock, RTC]
series: "QEMU Internals"
seriesOrder: 9
draft: true
---

## QEMU 클럭

QEMU는 여러 종류의 클럭을 관리합니다:

- **QEMU_CLOCK_REALTIME**: 실제 시간
- **QEMU_CLOCK_VIRTUAL**: 게스트 가상 시간
- **QEMU_CLOCK_HOST**: 호스트 단조 시간

---

## 타이머

```c
QEMUTimer *timer = timer_new_ns(QEMU_CLOCK_VIRTUAL, callback, opaque);
timer_mod(timer, qemu_clock_get_ns(QEMU_CLOCK_VIRTUAL) + delay_ns);
```

---

## RTC 에뮬레이션

- **MC146818**: 표준 PC RTC
- **pl031**: ARM PrimeCell RTC

---

## icount

명령어 수 기반 시간:

```bash
qemu-system-x86_64 -icount shift=1
```

---

## 정리

- QEMU는 여러 클럭(실제/가상/호스트)을 관리한다.
- 타이머로 시간 기반 이벤트를 스케줄링한다.
- icount로 결정론적 실행이 가능하다.

---

## 관련 항목

- [Ch 8: 인터럽트 컨트롤러](/blog/tools/emulation/qemu-internals/chapter08-interrupt-controller)
- [Ch 10: 마이그레이션](/blog/tools/emulation/qemu-internals/chapter10-migration)
