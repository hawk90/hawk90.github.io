---
title: "Ch 4: 이벤트 루프"
date: 2025-10-01T04:00:00
description: "QEMU의 메인 루프, AIO, coroutine을 이해한다."
tags: [QEMU, EventLoop, Coroutine]
series: "QEMU Internals"
seriesOrder: 4
draft: true
---

## 메인 루프

QEMU의 메인 루프는 이벤트 기반입니다:

```c
while (1) {
    // 타임아웃까지 이벤트 대기
    os_host_main_loop_wait(timeout);
    // 보류된 작업 처리
    qemu_clock_run_all_timers();
}
```

---

## AIO (Asynchronous I/O)

```c
AioContext *ctx = aio_context_new(&error_fatal);
aio_set_fd_handler(ctx, fd, true, read_handler, NULL, NULL, opaque);
```

---

## Coroutine

QEMU는 coroutine으로 비동기 작업을 처리합니다:

```c
Coroutine *co = qemu_coroutine_create(my_coroutine, arg);
qemu_coroutine_enter(co);

// 코루틴 내부
qemu_coroutine_yield();
```

---

## Bottom Half (BH)

```c
QEMUBH *bh = qemu_bh_new(callback, opaque);
qemu_bh_schedule(bh);
```

---

## 정리

- 메인 루프가 QEMU의 모든 이벤트를 처리한다.
- AIO로 비동기 I/O를 관리한다.
- Coroutine으로 협력적 멀티태스킹을 구현한다.

---

## 관련 항목

- [Ch 3: 메모리 모델](/blog/tools/qemu-internals/chapter03-memory-model)
- [Ch 5: 블록 레이어](/blog/tools/qemu-internals/chapter05-block-layer)
