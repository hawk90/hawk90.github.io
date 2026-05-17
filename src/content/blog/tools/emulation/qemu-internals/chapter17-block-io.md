---
title: "Ch 17: 블록 I/O Lifecycle"
date: 2025-09-03T17:00:00
description: "BDS·request stack·throttling·caching — block I/O 일대기."
tags: [QEMU, block-layer, bds, throttling, write-cache]
series: "QEMU Internals"
seriesOrder: 17
draft: true
---

## 이 챕터의 의도

guest의 `write(fd, ...)` 한 줄이 QEMU 안에서는 qcow2 layer → backing file → throttle → host file까지 여러 계층을 거친다. QEMU block layer는 filter chain 구조로 caching, throttling, snapshot, encryption, mirroring을 합성한다. 이 장에서는 BDS, BlockBackend, driver chain, request lifecycle을 차례로 본다.

## 핵심 항목

- ✦ 3계층 추상
  - **BlockDriver** — qcow2, raw, vmdk, nbd, iscsi 등 *format/protocol*
  - **BlockDriverState (BDS)** — 하나의 layer instance (하나의 file/connection)
  - **BlockBackend** — frontend가 보는 추상, virtio-blk/scsi/ide가 이걸 사용
- ✦ **Filter chain** — BDS가 다른 BDS를 wrap, 함수 호출 chain
  - 예: `virtio-blk` → `BlockBackend` → `throttle BDS` → `qcow2 BDS` → `file BDS` → posix file
- ✦ Request lifecycle
  1. guest VIRTIO write request
  2. virtio-blk frontend가 `blk_pwrite(blk, off, len, buf)` 호출
  3. BlockBackend → 첫 BDS의 `bdrv_co_pwritev` (coroutine 안)
  4. Filter chain 따라 위에서 아래로 — throttle wait, qcow2 metadata update, file write
  5. 최하단 BDS가 host file/socket에 io_uring/linux-aio로 submit
  6. AIO 완료 → 위로 callback chain → coroutine resume → guest IRQ
- ✦ **Cache mode** — `cache=writeback|writethrough|none|directsync|unsafe`
  - writeback: host page cache 사용, 빠름
  - writethrough: 모든 write 즉시 flush, 안전
  - none: O_DIRECT, host cache 우회 (DB·VM 표준)
- ✦ **Throttle filter** — IOPS/throughput limit (`-drive ...,throttling.iops-total=...`)
- ✦ **Backing chain** — qcow2 overlay 위에 base image, COW
- ✦ **Snapshot semantics**
  - Internal snapshot — qcow2 안에 metadata
  - External snapshot — 새 overlay file
- ✦ Drain — 모든 in-flight I/O 완료까지 대기, snapshot/migration 전 필수
- ✦ Polled state — IOThread polling on
- ✦ Flush — `bdrv_co_flush`, write barrier
- ◦ Image streaming, mirror, commit 등 block job

## 다이어그램 (4)

1. 3계층 추상 — BlockDriver / BDS / BlockBackend 관계
2. Filter chain — virtio-blk → throttle → qcow2 → file → posix
3. Request lifecycle (guest write → 6단계)
4. Cache mode 비교 — host page cache · O_DIRECT 흐름

## 코드 sketch

```bash
# Filter chain 예
qemu-system-x86_64 -enable-kvm \
    -drive file=overlay.qcow2,if=none,id=hd0,format=qcow2,cache=none,aio=io_uring,\
throttling.iops-total=1000 \
    -device virtio-blk-pci,drive=hd0

# 결과 chain:
# virtio-blk → blk0 (BlockBackend)
#   → throttle BDS (iops cap 1000)
#     → qcow2 BDS (overlay.qcow2)
#       → backing: base.qcow2 (read-only)
#       → metadata BDS (refcount table, L1/L2)
#     → file BDS (overlay.qcow2 host file)
#       → posix open + O_DIRECT + io_uring submit
```

```c
/* Block backend API 사용 (coroutine context) */
static int coroutine_fn my_op(BlockBackend *blk) {
    /* qcow2 + throttle + file 전체 chain 자동 */
    int ret = blk_co_pwrite(blk, 0x1000, 4096, buf, 0);
    if (ret < 0) return ret;

    /* flush — write barrier */
    return blk_co_flush(blk);
}

/* Filter chain 내부 — throttle filter 예 */
static int coroutine_fn throttle_co_pwritev(BlockDriverState *bs, int64_t off,
                                             int64_t bytes, QEMUIOVector *qiov,
                                             BdrvRequestFlags flags) {
    ThrottleGroupMember *tgm = bs->opaque;
    throttle_group_co_io_limits_intercept(tgm, bytes, true);   /* may yield */
    return bdrv_co_pwritev(bs->file, off, bytes, qiov, flags); /* down chain */
}
```

```bash
# Snapshot
(qemu) snapshot_blkdev hd0 snap1.qcow2   # external
(qemu) savevm s1                          # internal (state + RAM + block)
(qemu) info block

# Drain — snapshot 전 in-flight 완료
(qemu) drive_backup -f hd0 backup.qcow2
```

## 레퍼런스

- QEMU `block.c`, `block/qcow2*.c`, `block/throttle.c`, `block/file-posix.c`
- QEMU `Documentation/devel/block-coroutine-wrapper.rst`
- QEMU `Documentation/system/qemu-block-drivers.rst`
- "Live block operations" — KVM Forum talks
- "QEMU Block Layer" — Kevin Wolf KVM Forum

## 관련 항목

- [Ch 5: Block layer 기초](/blog/tools/emulation/qemu-internals/chapter05-block) (기존)
- [Ch 15: Coroutine](/blog/tools/emulation/qemu-internals/chapter15-coroutine)
- [Ch 16: AIO](/blog/tools/emulation/qemu-internals/chapter16-aio)
- [Ch 22: Snapshot vs migration](/blog/tools/emulation/qemu-internals/chapter22-snapshot-vs-migration)
