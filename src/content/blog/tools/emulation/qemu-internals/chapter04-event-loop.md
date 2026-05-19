---
title: "Ch 4: 이벤트 루프"
date: 2026-05-17T04:00:00
description: "QEMU의 메인 루프, AIO, coroutine을 이해한다."
tags: [QEMU, EventLoop, Coroutine, AIO, BottomHalf]
series: "QEMU Internals"
seriesOrder: 4
draft: true
---

QEMU 프로세스의 *심장*은 **main loop**입니다. fd I/O·timer·bottom half·coroutine — 모든 *비동기 작업*이 이 한 루프 안에서 처리됩니다. 새 device의 background work·migration·block I/O 모두 이 인프라 위에서 동작하므로 *반드시* 이해해야 합니다.

## Main loop — 한 줄로

```c
while (running) {
    /* 1. timeout까지 event 대기 */
    os_host_main_loop_wait(timeout);

    /* 2. expired timers 처리 */
    qemu_clock_run_all_timers();

    /* 3. bottom halves 처리 */
    qemu_bh_poll();
}
```

이 셋이 모든 비동기 동작의 진입점. `wait`이 *blocking*이지만 timeout과 시그널이 있으므로 *영원히* 대기하지는 않습니다.

## fd handler

파일 디스크립터 readable/writable 시 callback.

```c
qemu_set_fd_handler(fd, read_handler, write_handler, opaque);

static void read_handler(void *opaque) {
    char buf[1024];
    ssize_t n = read(fd, buf, sizeof(buf));
    process_data(buf, n);
}
```

network·chardev·migration이 모두 이 메커니즘. `select`/`poll`/`epoll`을 *공통 인터페이스*로 추상화.

## Timer

```c
QEMUTimer *t = timer_new_ns(QEMU_CLOCK_VIRTUAL, callback, opaque);
timer_mod(t, qemu_clock_get_ns(QEMU_CLOCK_VIRTUAL) + 1000000);  /* 1ms */

static void callback(void *opaque) {
    /* 1ms 후 호출 */
    timer_mod(t, qemu_clock_get_ns(QEMU_CLOCK_VIRTUAL) + 1000000);  /* 재예약 */
}
```

clock 종류는 ch9에서 자세히. 핵심은 `QEMU_CLOCK_VIRTUAL`(simulation time)과 `QEMU_CLOCK_REALTIME`(host wall clock).

## Bottom Half (BH)

*main loop에 일을 queue*하는 가장 간단한 방법.

```c
QEMUBH *bh = qemu_bh_new(callback, opaque);
qemu_bh_schedule(bh);

/* main loop가 다음 iteration에서 callback 호출 */
```

용도: *IRQ context*에서 *복잡한 작업*을 main thread로 미룰 때. 또는 *deferred work*.

```c
/* device IRQ handler에서 */
static void device_irq(void *opaque) {
    DeviceState *s = opaque;
    /* 빠른 처리 */
    s->status |= STATUS_PENDING;
    /* 무거운 작업은 BH로 */
    qemu_bh_schedule(s->process_bh);
}
```

## Coroutine

*협력적 multitasking* — yield하면 다른 coroutine으로 switch.

```c
static void coroutine_fn my_coroutine(void *opaque) {
    /* 1단계 */
    do_step1();

    /* yield — 다른 coroutine으로 */
    qemu_coroutine_yield();

    /* 깨어나면 여기서 재개 */
    do_step2();
}

Coroutine *co = qemu_coroutine_create(my_coroutine, arg);
qemu_coroutine_enter(co);
```

block layer가 이 패턴을 *전면 사용*. read/write를 *순차적으로* 보이는 코드가 *내부적으로는 비동기*.

## Coroutine의 magic

C 함수가 *yield 가능*해 보이는 비결 — *별도 stack*을 할당하고 *context swap*(setjmp/longjmp 또는 makecontext).

```text
Coroutine A             Coroutine B
─────────────────────────────────
read_block(): {
    submit_aio();        ←┐
    yield;              ─┘ context save A
                          context load B
                          B's code
                          ...
                          aio completed
                          schedule A
                          context save B
                          context load A
    /* yield 후 위치 */ ← │
    return data;
}
```

C++의 coroutine과 *동일 개념*이지만 C 매크로로 구현.

## AIO — Asynchronous I/O

block layer의 *비동기 I/O* primitive.

```c
AioContext *ctx = aio_context_new(&error_fatal);

/* fd handler 등록 */
aio_set_fd_handler(ctx, fd, false,
                  read_callback, NULL, NULL, NULL, opaque);

/* coroutine 실행 */
aio_co_schedule(ctx, co);
```

main loop이 하나의 AioContext(`qemu_aio_context`)를 가지고, *iothread*(별도 thread)가 자기만의 AioContext를 가질 수 있습니다.

## IOThread

기본은 main loop이 *모든* I/O를 처리하지만, throughput이 필요하면 *별도 thread*에 위임.

```bash
qemu-system-x86_64 -object iothread,id=iothread0 \
    -drive file=disk.qcow2,if=none,id=hd0,iothread=iothread0 \
    -device virtio-blk-pci,drive=hd0
```

`iothread0`이 *전용 thread*. disk I/O가 main loop을 *block하지 않음*. high-IOPS 워크로드에서 성능 향상.

## RCU — Read-Copy-Update

여러 thread가 동시에 *읽고 쓰는* 자료구조에 lock-free 접근.

```c
rcu_read_lock();
const MyData *d = qatomic_rcu_read(&shared_data);
do_something(d);
rcu_read_unlock();

/* writer */
MyData *new = g_new(MyData, 1);
*new = compute_new();
qatomic_rcu_set(&shared_data, new);
call_rcu1(...);   /* old data 해제는 grace period 후 */
```

main loop과 vCPU thread가 *공유 자료구조*에 접근할 때.

## Notifier — event broadcasting

```c
Notifier my_notifier;
my_notifier.notify = my_callback;
qemu_add_machine_init_done_notifier(&my_notifier);

static void my_callback(Notifier *n, void *data) {
    /* machine init이 끝났을 때 호출 */
}
```

QEMU의 *전역 이벤트*(reset, machine init, exit)에 hook할 때.

## Thread pool

worker thread에서 task 실행 후 main loop에 *완료 통지*.

```c
typedef struct WorkItem {
    int (*func)(void *);
    void *arg;
    void (*cb)(void *, int);
} WorkItem;

thread_pool_submit_aio(pool, item->func, item->arg,
                      item->cb, item->arg);
```

block layer에서 *동기 syscall*을 worker thread로 보내 *coroutine을 yield 가능*하게 함.

## 디버깅 — main loop hang

QEMU가 "hang"한 것처럼 보이면.

```bash
# gdb attach
gdb -p $(pidof qemu-system-x86_64)
(gdb) thread apply all bt
```

main loop thread의 stack에서 *어디서 block*되었는지. 자주 보는 패턴:

- `g_poll`에서 영원히 대기 — fd handler가 *event 미생산*
- `qemu_cond_wait` — 다른 thread가 *signal 안 함*
- coroutine swap 도중 stack overflow — coroutine stack 부족

## 흔한 함정

- **BH 중복 schedule** — 같은 BH를 두 번 schedule하면 *한 번만 실행*. 의존 안전, 무시 가능.
- **timer leak** — `timer_free` 짝. realize에서 만들고 unrealize에서 해제.
- **coroutine yield from non-coroutine** — `qemu_coroutine_yield`는 *coroutine 안에서만*. main thread에서 호출 시 abort.
- **iothread race** — block layer는 *iothread*가 처리. main thread가 같은 BDS에 동시 접근하면 race.

## 정리

- QEMU main loop는 *fd handler + timer + BH*를 *single thread*에서 처리.
- **BH**는 *main loop에 일 queue*. IRQ context에서 main에 위임할 때.
- **Coroutine**은 *협력적 multitasking* — yield/resume. block layer가 대대적 사용.
- **AIO**가 비동기 I/O primitive. 각 AioContext가 fd handler·timer·coroutine 묶음.
- **IOThread**로 *특정 I/O*를 main에서 분리해 throughput ↑.
- **RCU**로 lock-free 공유 자료구조. main + vCPU thread 협력.
- **Notifier**·**Thread pool**·**event_notifier**가 보조 primitive.
- main loop hang은 *gdb thread apply all bt*로 첫 진단.

## 다음 장 예고

다음 장은 *block layer* — qcow2·raw·nbd가 어떻게 협력하는지. coroutine이 *어디서* 빛나는지가 명확해집니다.

## 관련 항목

- [Ch 3: 메모리 모델](/blog/tools/emulation/qemu-internals/chapter03-memory-model)
- [Ch 5: 블록 레이어](/blog/tools/emulation/qemu-internals/chapter05-block-layer)
- [Ch 15: Coroutine 심화](/blog/tools/emulation/qemu-internals/chapter15-coroutine)
- [Ch 16: AIO](/blog/tools/emulation/qemu-internals/chapter16-aio)
