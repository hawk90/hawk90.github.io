---
title: "Ch 15: Coroutine 서브시스템"
date: 2026-05-17T15:00:00
description: "qemu_coroutine_*·yield/resume — async without callback hell."
tags: [QEMU, coroutine, async, block-io]
series: "QEMU Internals"
seriesOrder: 15
draft: true
---

## 이 챕터의 의도

QEMU의 block I/O, migration, NBD는 모두 비동기다. 전통적인 콜백 기반 비동기 코드는 nesting hell을 낳지만, QEMU는 coroutine으로 sync처럼 읽히는 async 코드를 짤 수 있게 한다. 이 디자인은 Stefan Hajnoczi가 만들었다. 이 장에서는 QEMU coroutine API, stack-switching 구현, Block I/O에서의 활용을 차례로 본다.

## 핵심 항목

- ✦ Why coroutine — async I/O without callback nesting, *throw + yield* 패턴
- ✦ 기본 API
  - `Coroutine *qemu_coroutine_create(CoroutineEntry *entry)`
  - `void qemu_coroutine_enter(Coroutine *co)` — resume
  - `void qemu_coroutine_yield(void)` — suspend, control to caller
  - `bool qemu_in_coroutine(void)` — 현재 coroutine 안인지
- ✦ **Stack-switching implementation** (per host OS)
  - Linux: `ucontext` (`makecontext`/`swapcontext`) 또는 sigaltstack
  - macOS: assembler-based `coroutine_asm.S`
  - Windows: native fibers (`ConvertThreadToFiber`/`SwitchToFiber`)
- ✦ Stack size — 1MB default, configurable
- ✦ **Co* primitives** — coroutine-safe synchronization
  - `CoMutex` — coroutine mutex (`qemu_co_mutex_lock/unlock`)
  - `CoQueue` — wait queue (`qemu_co_queue_wait/wake_all`)
  - `CoRwlock` — reader-writer lock
- ✦ Composition — *sync API on top of async core*
  - Block I/O: `bdrv_co_read(...)`는 coroutine 안에서 sync처럼 호출, 내부적으로 yield/resume
- ✦ Yield trigger — async event (AIO completion, timer, fd readable)
- ✦ Coroutine 재진입 — event source가 `aio_co_wake(co)` 호출
- ✦ Use case
  - Block I/O lifecycle (Ch 17)
  - NBD client/server
  - Live migration page send
  - qcow2 metadata update
- ✦ Coroutine vs Thread — *cooperative*, 1 OS thread 안에서 다중 coroutine
- ✦ Stack pool — coroutine 재사용으로 alloc 비용 회피
- ◦ Asymmetric coroutine vs symmetric — QEMU는 asymmetric
- ◦ Generator pattern — `qemu_coroutine_yield` + value 반환

## 다이어그램 (4)

1. Callback hell vs Coroutine — 같은 async 로직 비교
2. Coroutine stack switch — register save/restore, stack pointer 교체
3. Co* primitives 동작 — CoMutex로 coroutine 간 mutex (no OS lock)
4. Block I/O coroutine flow — bdrv_co_read → yield → AIO complete → resume

## 코드 sketch

```c
/* Coroutine 정의 + 진입 */
static void coroutine_fn my_co_entry(void *opaque) {
    /* coroutine 안 */
    int *count = opaque;
    while (*count < 5) {
        printf("co: count=%d\n", (*count)++);
        qemu_coroutine_yield();   /* 양보 */
    }
    printf("co: done\n");
}

int main(void) {
    int count = 0;
    Coroutine *co = qemu_coroutine_create(my_co_entry, &count);

    for (int i = 0; i < 5; i++) {
        printf("main: enter\n");
        qemu_coroutine_enter(co);   /* resume */
        printf("main: returned\n");
    }
}
/* 출력:
   main: enter
   co: count=0
   main: returned
   main: enter
   co: count=1
   ...
*/
```

```c
/* CoMutex — block I/O serialization */
typedef struct MyDev {
    CoMutex lock;
    int counter;
} MyDev;

static void coroutine_fn my_op(MyDev *d) {
    qemu_co_mutex_lock(&d->lock);
    /* critical section — other coroutines wait without OS lock */
    d->counter++;
    /* may yield here for I/O */
    bdrv_co_read(d->bs, 0, 4096, buf);
    qemu_co_mutex_unlock(&d->lock);
}
```

```c
/* Block I/O coroutine 사용 */
static int coroutine_fn my_read_co(BlockBackend *blk, int64_t off, int len, void *buf) {
    /* 이 함수는 *coroutine 안*에서만 호출 */
    return blk_co_pread(blk, off, len, buf, 0);
    /* 내부적으로:
       - AIO request 큐잉
       - qemu_coroutine_yield
       - AIO complete → aio_co_wake → resume
       - return 정수 결과
    */
}
```

```c
/* coroutine 진입점에서 호출 */
static void *coroutine_wrapper(void *opaque) {
    MyArg *a = opaque;
    a->ret = my_read_co(a->blk, a->off, a->len, a->buf);
}

int main_loop_caller(void) {
    MyArg a = {...};
    Coroutine *co = qemu_coroutine_create(coroutine_wrapper, &a);
    qemu_coroutine_enter(co);
    /* coroutine이 yield 후 AIO 완료까지 main loop가 다른 일 처리 */
    return a.ret;
}
```

## 레퍼런스

- QEMU `util/coroutine-*.c` — backend별 구현 (ucontext/sigaltstack/asm/fiber)
- QEMU `include/qemu/coroutine.h` — API
- Stefan Hajnoczi blog — vmsplice.net — coroutine 디자인 글
- "Coroutines in QEMU" — KVM Forum talk
- QEMU `block/` — coroutine 사용 사례 천지

## 관련 항목

- [Ch 4: Event loop](/blog/tools/emulation/qemu-internals/chapter04-event-loop) (기존)
- [Ch 16: AIO 서브시스템](/blog/tools/emulation/qemu-internals/chapter16-aio)
- [Ch 17: 블록 I/O lifecycle](/blog/tools/emulation/qemu-internals/chapter17-block-io)
