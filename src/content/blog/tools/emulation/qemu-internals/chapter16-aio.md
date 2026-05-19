---
title: "Ch 16: AIO 서브시스템"
date: 2026-05-17T16:00:00
description: "fd handler·io_uring·linux-aio backend — async I/O 통합."
tags: [QEMU, aio, io-uring, linux-aio, IOThread]
series: "QEMU Internals"
seriesOrder: 16
draft: true
---

QEMU의 **AIO**(Asynchronous I/O) subsystem은 *fd handler·timer·coroutine·bottom half*를 한 곳에 묶는 *event loop infrastructure*입니다. main loop·iothread 각각이 *자기 AioContext*를 갖고, 그 안에서 *모든 비동기 동작*이 일어납니다.

## AioContext

```c
typedef struct AioContext {
    GSource source;
    /* fd handlers */
    AioHandler *first_handler;
    /* timers */
    QEMUTimerList *tlg;
    /* bottom halves */
    QEMUBH *first_bh;
    /* scheduled coroutines */
    QSLIST_HEAD(, Coroutine) scheduled_coroutines;
    /* ... */
} AioContext;
```

QEMU에는 *여러 AioContext*가 동시에 존재. 기본은 `qemu_aio_context`(main thread)와 각 iothread의 *전용 context*.

## fd handler 등록

```c
aio_set_fd_handler(ctx,
                   fd,
                   false,                /* is_external */
                   read_handler,         /* readable */
                   NULL,                 /* writable */
                   NULL,                 /* poll */
                   NULL,                 /* poll_ready */
                   opaque);
```

fd가 *readable*해지면 `read_handler` 호출. *writable*에도 등록 가능. main thread는 main loop가 자동으로 watch.

## Timer in AioContext

```c
QEMUTimer *t = aio_timer_new(ctx, QEMU_CLOCK_VIRTUAL,
                              SCALE_NS, callback, opaque);
timer_mod(t, qemu_clock_get_ns(QEMU_CLOCK_VIRTUAL) + 1000000);
```

해당 AioContext의 event loop가 timer를 *처리*. iothread에서 만든 timer는 iothread에서.

## Coroutine schedule

```c
Coroutine *co = qemu_coroutine_create(fn, arg);
aio_co_schedule(ctx, co);   /* ctx의 event loop에서 enter */
```

coroutine이 *어떤 context에서 동작할지* 결정. block I/O coroutine은 iothread context에 schedule되어 *main loop 비점유*.

## Backend 종류

리눅스 환경에서 AIO backend.

| Backend | 사용처 |
|---------|--------|
| **`thread-pool`** | preadv/pwritev를 worker thread에 위임. 모든 platform |
| **`linux-aio`** | Linux `io_setup`/`io_submit` (legacy AIO) |
| **`io_uring`** | Linux 5.1+ io_uring (modern) |

```bash
qemu-system-x86_64 -drive file=disk.img,aio=native,...   # linux-aio
qemu-system-x86_64 -drive file=disk.img,aio=io_uring,... # io_uring
qemu-system-x86_64 -drive file=disk.img,aio=threads,...  # thread-pool
```

## io_uring 통합

QEMU 5.0+ Linux io_uring 지원. *고성능 비동기 I/O*.

```c
struct io_uring ring;
io_uring_queue_init(QUEUE_SIZE, &ring, 0);

/* submit */
struct io_uring_sqe *sqe = io_uring_get_sqe(&ring);
io_uring_prep_read(sqe, fd, buf, len, offset);
io_uring_submit(&ring);

/* completion */
struct io_uring_cqe *cqe;
io_uring_wait_cqe(&ring, &cqe);
```

QEMU 내부는 *event loop이 io_uring fd*를 watch하다 completion 시 *coroutine resume*.

## Linux AIO

legacy interface. *direct I/O only* — page cache 우회.

```c
io_context_t ctx;
io_setup(QUEUE_SIZE, &ctx);

struct iocb cb;
io_prep_pread(&cb, fd, buf, len, offset);
struct iocb *cbs[1] = { &cb };
io_submit(ctx, 1, cbs);
```

io_uring보다 *제약 많음*(direct I/O 강제·queue 크기 제한). 새 deployment는 io_uring 권장.

## Thread pool

POSIX preadv/pwritev를 *별도 thread*에 위임.

```c
static int worker(void *arg) {
    WorkItem *w = arg;
    return preadv(w->fd, w->iov, w->niov, w->offset);
}

thread_pool_submit_co(pool, worker, item);   /* coroutine_fn */
```

`thread_pool_submit_co`가 *yield*하고 worker thread에서 *blocking I/O* 후 main thread에서 *resume*. coroutine은 *동기 I/O처럼* 보이지만 *비동기 동작*.

## IOThread

기본은 main thread가 *모든 AioContext* 관리. **IOThread**로 *별도 thread*에 분리.

```bash
qemu-system-x86_64 \
    -object iothread,id=iothread0 \
    -drive file=disk.qcow2,if=none,id=hd0,iothread=iothread0 \
    -device virtio-blk-pci,drive=hd0
```

`iothread0`이 *전용 thread*. 그 thread가 *block I/O AioContext*를 driving. main loop은 *device emulation·UI*만.

## aio_poll

AioContext의 *event loop core*.

```c
bool aio_poll(AioContext *ctx, bool blocking) {
    /* fd events·timers·scheduled coroutines 처리 */
    /* return: progress 있었나? */
}
```

main loop의 `os_host_main_loop_wait`이 *내부적으로* `aio_poll`을 모든 context에 대해 호출.

## BHs 다시

```c
QEMUBH *bh = aio_bh_new(ctx, callback, opaque);
qemu_bh_schedule(bh);
```

`aio_bh_new`로 *특정 context*의 BH. main이든 iothread든.

## RCU 통합

여러 thread가 *공유 자료구조*를 다룰 때 lock-free 접근. QEMU AioContext도 *RCU-friendly*.

```c
rcu_read_lock();
const SharedData *d = qatomic_rcu_read(&ptr);
do_something(d);
rcu_read_unlock();
```

iothread와 main thread가 *같은 BDS*에 접근할 때 race 방지.

## Poll mode (busy polling)

자주 일어나는 fd event에 *busy poll*로 latency 감소.

```c
aio_set_fd_handler(ctx, fd, false, ...,
                   poll_handler,    /* polling 시 호출 */
                   NULL,
                   opaque);
```

10ns~µs 단위 polling. *spinlock 비슷*하지만 *AIO만 polling*.

## 흔한 함정

- **wrong AioContext에서 동작** — block I/O가 main thread에서 동작하면 *latency 증가*. iothread 권장.
- **iothread + RCU 누락** — main과 iothread가 *같은 자료구조*에 동시 접근. crash.
- **io_uring 미지원 host** — Linux 5.1+. 자동 fallback이지만 *명시적 확인*.
- **aio_poll 재진입** — coroutine에서 `aio_poll`을 또 호출하면 *deadlock*. `qemu_coroutine_yield` 사용.

## 정리

- **AioContext**가 QEMU event loop의 *unit*. main + iothread별 분리 가능.
- **fd handler·timer·BH·coroutine**이 같은 context에서 처리.
- Backend: **thread-pool**(범용)·**linux-aio**(legacy)·**io_uring**(modern).
- **IOThread**로 block I/O를 *별도 thread*에 분리, main loop 비점유.
- `aio_poll`이 event loop core. main loop이 모든 context의 poll 통합.
- **Poll mode**로 latency-critical workload에 busy polling.
- **RCU**로 multi-thread shared structure lock-free.

## 다음 장 예고

다음 장은 *AIO를 활용한* **block I/O lifecycle** — BDS·throttle·cache·write path.

## 관련 항목

- [Ch 15: Coroutine](/blog/tools/emulation/qemu-internals/chapter15-coroutine)
- [Ch 17: Block I/O Lifecycle](/blog/tools/emulation/qemu-internals/chapter17-block-io)
- [Ch 5: Block Layer](/blog/tools/emulation/qemu-internals/chapter05-block-layer)
