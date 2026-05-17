---
title: "Ch 16: AIO 서브시스템"
date: 2025-09-03T16:00:00
description: "fd handler·io_uring·linux-aio backend — async I/O 통합."
tags: [QEMU, aio, io-uring, linux-aio]
series: "QEMU Internals"
seriesOrder: 16
draft: true
---

## 이 챕터의 의도

QEMU의 모든 async I/O는 AioContext 위에 선다. event loop, fd handler, timer, BH(Bottom Half)가 한 우산 아래 모인다. Backend는 thread pool, linux-aio, io_uring 중에서 고를 수 있고, IOThread로 디바이스별 dedicated loop도 만들 수 있다. 이 장에서는 AIO subsystem 구조와 백엔드별 trade-off를 정리한다.

## 핵심 항목

- ✦ **AioContext** — event loop 컨테이너, file descriptor·timer·BH·coroutine 모두 등록
- ✦ Event sources
  - fd handler — `aio_set_fd_handler(ctx, fd, is_external, read_cb, write_cb, ...)`
  - timer — `aio_timer_init`, `timer_mod`
  - BH (Bottom Half) — `aio_bh_new` deferred work
  - Coroutine — `aio_co_schedule`, `aio_co_wake`
- ✦ Main loop — `qemu_main_loop()` → `main_loop_wait()` → `aio_poll(ctx, blocking)`
- ✦ `aio_poll` — ppoll/epoll/io_uring로 fd 대기, 이벤트 발생 시 callback
- ✦ **Backend 종류**
  - `threads` (default): worker thread pool, posix `read/write` 사용
  - `linux-aio`: kernel native AIO (`io_setup`/`io_submit`), O_DIRECT 필요
  - `io_uring`: 최신 Linux async (kernel 5.1+), 가장 빠름
- ✦ Backend 선택 — `-drive ...,aio=threads|native|io_uring`
- ✦ **IOThread** — `-object iothread,id=io1` + `-device virtio-blk,iothread=io1`, dedicated event loop per device
- ✦ Multiqueue — `-device virtio-blk,num-queues=4`, queue별 IOThread
- ✦ NUMA awareness — IOThread를 특정 CPU에 affinity
- ✦ AioContext vs main loop
  - Default: 1 AioContext (main thread)
  - IOThread: 추가 AioContext per IOThread
- ✦ Polling — `aio_poll` busy-poll 모드 (`-object iothread,poll-max-ns=...`), low latency 워크로드
- ✦ Performance tuning
  - 백엔드: high IOPS → io_uring, low latency → linux-aio + polling
  - Queue depth: virtio-blk `queue-size`
  - IOThread: per-disk 별도 thread, lock contention 회피
- ◦ 향후: io_uring uring_cmd → NVMe passthrough zero-overhead

## 다이어그램 (4)

1. AioContext 구조 — fd handler + timer + BH + coroutine
2. Main loop → aio_poll → backend (ppoll/io_uring) → callback dispatch
3. IOThread + multiqueue — virtio-blk N queue, N IOThread
4. Backend 비교 — threads vs linux-aio vs io_uring (성능 prof)

## 코드 sketch

```c
/* AioContext 사용 — fd handler 등록 */
static void my_fd_read(void *opaque) {
    int fd = (intptr_t)opaque;
    char buf[1024];
    read(fd, buf, sizeof(buf));
    /* 처리 */
}

void my_init(AioContext *ctx, int fd) {
    aio_set_fd_handler(ctx, fd, false, my_fd_read, NULL, NULL, NULL, (void *)(intptr_t)fd);
}

/* Coroutine을 AioContext에 schedule */
void coroutine_fn my_async_op(BlockBackend *blk) {
    /* block I/O coroutine — 내부에서 AioContext 활용 */
    blk_co_pread(blk, 0, 4096, buf, 0);
}
```

```bash
# Backend 선택 — virtio-blk + io_uring
qemu-system-x86_64 -enable-kvm \
    -drive file=disk.img,if=none,id=hd0,format=raw,aio=io_uring,cache=none \
    -device virtio-blk-pci,drive=hd0,num-queues=4 \
    -object iothread,id=io1 -device virtio-blk-pci,drive=hd0,iothread=io1

# Polling 활성 (low latency)
-object iothread,id=io1,poll-max-ns=50000,poll-grow=2,poll-shrink=2
```

```bash
# IOThread 통계
(qemu) info iothreads

# AIO 백엔드별 측정 (fio inside guest)
guest$ fio --name=test --rw=randread --bs=4k --iodepth=64 \
            --ioengine=libaio --direct=1 --runtime=30 --filename=/dev/vda
# QEMU host에서 backend=threads/native/io_uring 바꿔가며 비교
```

## 레퍼런스

- QEMU `util/aio-*.c` — AioContext 구현
- QEMU `block/file-posix.c` — backend 선택 (`fd_setup_aio_*`)
- QEMU `Documentation/devel/aio_notify.rst`
- "QEMU IOThread" — KVM Forum 발표 (Stefan Hajnoczi)
- Linux `Documentation/userspace-api/io_uring.rst`
- io_uring 시리즈 (별도)

## 관련 항목

- [Ch 4: Event loop](/blog/tools/emulation/qemu-internals/chapter04-event-loop) (기존)
- [Ch 15: Coroutine](/blog/tools/emulation/qemu-internals/chapter15-coroutine)
- [Ch 17: 블록 I/O lifecycle](/blog/tools/emulation/qemu-internals/chapter17-block-io)
- [io_uring 시리즈](/blog/systems/io-uring/)
