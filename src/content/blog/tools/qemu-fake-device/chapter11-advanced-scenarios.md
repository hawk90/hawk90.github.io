---
title: "Ch 11: 고급 시나리오 — 에러 주입, 경쟁 조건"
date: 2025-09-01T11:00:00
description: "에러 주입과 경쟁 조건 테스트로 드라이버 견고성을 검증한다."
tags: [QEMU, Testing, ErrorInjection]
series: "QEMU Fake Device Driver"
seriesOrder: 11
draft: true
---

## 에러 주입

가상 디바이스에서 의도적으로 에러를 발생시킵니다.

```c
static uint64_t my_mmio_read(void *opaque, hwaddr addr, unsigned size)
{
    if (s->inject_error) {
        return 0xFFFFFFFF;  // 에러 상태
    }
    // 정상 응답
}
```

---

## 타임아웃 시뮬레이션

응답 지연을 시뮬레이션합니다.

---

## 경쟁 조건 테스트

멀티스레드 환경에서 동시 접근을 테스트합니다.

---

## 정리

- 에러 주입으로 드라이버의 에러 처리 경로를 테스트한다.
- 타임아웃을 시뮬레이션해 타이머 로직을 검증한다.
- 경쟁 조건을 재현해 동시성 버그를 찾는다.

---

## 관련 항목

- [Ch 10: 테스트 자동화](/blog/tools/qemu-fake-device/chapter10-test-automation)
- [Ch 12: 사례 연구 — NVMe](/blog/tools/qemu-fake-device/chapter12-case-study-nvme)
