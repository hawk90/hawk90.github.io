---
title: "Ch 15: Coroutine 서브시스템"
date: 2026-05-17T15:00:00
description: "qemu_coroutine_*·yield/resume — async without callback hell."
tags: [QEMU, coroutine, async, block-io, fiber]
series: "QEMU Internals"
seriesOrder: 15
draft: true
---

QEMU의 *비동기 I/O*가 *순차적 코드*처럼 보이는 비결이 **coroutine**입니다. C++20·Python·JavaScript의 *async/await*과 같은 개념을 *C 매크로*로 구현. block layer가 *전면 사용*하며, *callback hell* 없이도 복잡한 I/O sequence를 표현합니다.

## 어떤 문제를 푸는가

비동기 I/O를 *callback*으로 표현하면.

```c
void step1(int fd) {
    aio_read(fd, buf1, ..., step2);   /* 콜백 1 */
}
void step2(...) {
    aio_read(fd, buf2, ..., step3);   /* 콜백 2 */
}
void step3(...) {
    /* ... */
}
```

각 단계가 *별도 함수*. *문맥(local variables)*이 명시적으로 전달돼야 함. 5단계만 되어도 *읽기 어려움*.

coroutine으로 같은 흐름.

```c
static void coroutine_fn pipeline(void *opaque) {
    aio_read_co(fd, buf1, ...);
    do_something(buf1);

    aio_read_co(fd, buf2, ...);
    do_something_else(buf2);

    /* ... 5단계까지 그대로 ... */
}
```

*동기 코드처럼* 보이지만 *내부적으로 yield/resume*. 문맥은 *stack*이 보존.

## qemu_coroutine_create + enter

```c
static void coroutine_fn my_co(void *opaque) {
    printf("Step 1\n");
    qemu_coroutine_yield();      /* main으로 돌아감 */
    printf("Step 3\n");
}

void caller(void) {
    Coroutine *co = qemu_coroutine_create(my_co, NULL);
    printf("Step 0\n");
    qemu_coroutine_enter(co);    /* my_co 실행, yield 시 복귀 */
    printf("Step 2\n");
    qemu_coroutine_enter(co);    /* my_co 재개, 끝까지 */
    printf("Step 4\n");
}

/* 출력:
 * Step 0
 * Step 1
 * Step 2
 * Step 3
 * Step 4
 */
```

`enter`로 *진입*, `yield`로 *떠남*. 다음 `enter`가 *yield 다음 줄*에서 재개.

## coroutine_fn annotation

```c
static void coroutine_fn my_function(void *opaque) {
    /* ... */
}
```

`coroutine_fn`은 *문서적 annotation* — 이 함수가 *coroutine context*에서 호출됨을 명시. compile-time 검사 없지만 *읽는 사람*에게 신호.

## 구현 — context switching

```text
Main thread stack          Coroutine stack
┌──────────────┐          ┌──────────────┐
│ caller frame │          │ co frame     │
│              │          │              │
│ stack ptr A  │          │ stack ptr B  │
└──────────────┘          └──────────────┘
       │                          ▲
       │ enter → save A, load B   │
       │ ◀─ yield → save B, load A│
       ▼                          │
```

각 coroutine이 *별도 stack* 할당받음. `setjmp/longjmp`·`makecontext`·`ucontext` API 또는 *inline asm*으로 stack 교체.

QEMU는 plain C에서 *3 backend* 지원: `ucontext`(POSIX)·`sigaltstack`(legacy)·`windows fiber`(Win).

## yield와 entering

```c
static void coroutine_fn aio_read_co(int fd, void *buf, size_t len) {
    AIOContext *ctx = qemu_get_current_aio_context();
    int ret = -EAGAIN;

    /* submit AIO */
    submit_aio(fd, buf, len, &ret);

    /* AIO 완료까지 yield */
    while (ret == -EAGAIN) {
        qemu_coroutine_yield();
    }
}
```

AIO callback이 *완료 시* `ret` 변경하고 *coroutine을 re-enter*.

## Block layer의 coroutine 사용

`bdrv_co_preadv` 같은 함수.

```c
int coroutine_fn bdrv_co_preadv(BdrvChild *child,
                                 int64_t offset, int64_t bytes,
                                 QEMUIOVector *qiov,
                                 BdrvRequestFlags flags) {
    /* qcow2 처리 */
    ret = bdrv_co_preadv(child->bs->file, ...);   /* file protocol */
    return ret;
}
```

각 layer가 *coroutine_fn*. 위 layer가 아래 layer를 *순차 호출*하지만 실제로는 *비동기*.

## Mutex — coroutine 친화

```c
CoMutex mutex;
qemu_co_mutex_init(&mutex);

static void coroutine_fn worker(void *opaque) {
    qemu_co_mutex_lock(&mutex);    /* 잡힐 때까지 yield */
    do_critical_section();
    qemu_co_mutex_unlock(&mutex);
}
```

`CoMutex`는 *coroutine 친화* — 잡지 못하면 *yield*. 다른 coroutine이 unlock 시 *resume*.

## Queue·Cond·sleep

```c
CoQueue queue;
qemu_co_queue_init(&queue);

static void coroutine_fn waiter(void *opaque) {
    qemu_co_queue_wait(&queue, NULL);   /* 누군가 wake_up까지 */
}

/* 다른 coroutine */
qemu_co_queue_next(&queue);    /* 한 명 깨움 */
qemu_co_queue_restart_all(&queue);   /* 모두 깨움 */
```

`CoSleep`으로 *timer 기반 sleep*도 coroutine 안에서.

## AioContext binding

coroutine은 *특정 AioContext*에 묶임. 그 context의 event loop이 yield/resume을 *driver*.

```c
AioContext *ctx = qemu_get_current_aio_context();
qemu_coroutine_create(...);
aio_co_schedule(ctx, co);   /* context에 schedule */
```

iothread 환경에서 *block I/O coroutine*이 *iothread의 AioContext*에서 동작.

## Generator pattern

coroutine으로 *iterator* 구현.

```c
static void coroutine_fn fib_gen(void *opaque) {
    int a = 0, b = 1;
    while (1) {
        int *out = (int *)opaque;
        *out = a;
        qemu_coroutine_yield();   /* 값 전달, caller에 control */
        int tmp = a + b;
        a = b;
        b = tmp;
    }
}
```

caller가 매 enter마다 *다음 값* 받음.

## Stack 크기

기본 stack 크기 — `COROUTINE_STACK_SIZE`(보통 256KB). large local data 또는 deep recursion 시 *overflow*.

```c
/* config로 조정 가능 */
#define QEMU_COROUTINE_STACK_SIZE (1 << 18)  /* 256KB */
```

stack overflow detection은 *guard page*. stack 끝에 unmapped page를 둬 *touch 시 SIGSEGV*.

## Coroutine pool

매번 stack 할당이 비싸므로 *pool*에서 재사용.

```c
Coroutine *co = qemu_coroutine_create(fn, arg);  /* pool에서 또는 새로 alloc */
```

pool 크기는 hard-coded·tunable.

## 디버깅 — qemu coroutine list

```text
(qemu) info coroutine
co 0x7f8b: bdrv_qcow2_co_preadv (yielded)
co 0x7f8c: bdrv_co_block_job  (running)
```

현재 *어떤 coroutine이 어디서 yield*했는지. block I/O hang 진단에.

## 흔한 함정

- **non-coroutine에서 yield** — abort. `qemu_in_coroutine()`으로 확인.
- **stack overflow** — large local array. heap allocation 또는 stack size 조정.
- **lock held over yield** — deadlock 가능. CoMutex 권장.
- **wrong AioContext** — coroutine을 다른 context에서 enter하면 race.

## 정리

- **Coroutine**은 *사용자 공간 협력적 multitasking*. async/await 없이 *동기 코드*처럼 표현.
- `qemu_coroutine_create` + `enter` + `yield`가 core API.
- 각 coroutine이 *별도 stack* (보통 256KB).
- **CoMutex·CoQueue·CoSleep**이 coroutine 친화 primitive.
- **Block layer**가 전면 사용 — bdrv_co_* 시리즈.
- **AioContext**가 yield/resume의 driver. iothread에서 multi-thread block I/O.
- 디버깅: `info coroutine`으로 *현재 상태* 확인.

## 다음 장 예고

다음 장은 *coroutine을 driving하는* **AIO subsystem** — fd handler·io_uring·linux-aio backend.

## 관련 항목

- [Ch 14: KVM Accel](/blog/tools/emulation/qemu-internals/chapter14-kvm-accel)
- [Ch 16: AIO](/blog/tools/emulation/qemu-internals/chapter16-aio)
- [Ch 4: Event Loop](/blog/tools/emulation/qemu-internals/chapter04-event-loop)
- [Ch 5: Block Layer](/blog/tools/emulation/qemu-internals/chapter05-block-layer)
