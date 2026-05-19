---
title: "Ch 17: 블록 I/O Lifecycle"
date: 2026-05-17T17:00:00
description: "BDS·request stack·throttling·caching — block I/O 일대기."
tags: [QEMU, block-layer, bds, throttling, write-cache, write-back]
series: "QEMU Internals"
seriesOrder: 17
draft: true
---

Ch 5에서 본 block layer 위에서 *실제 I/O가 어떻게 흐르는지*를 따라갑니다. virtio-blk write 한 번이 *어떤 layer를 거쳐* host의 syscall이 되는지, 그 path의 throttle·cache·zero-copy까지.

## Write request의 일대기

```text
1. guest: write(/dev/vda, buf, 4KB)
        │
2. virtio-blk frontend: VirtIO ring에 descriptor enqueue + doorbell
        │
3. virtio-blk handler (host): vring에서 fetch + BB로 submit
        │
4. BlockBackend: throttle 검사 (iops/bps limit)
        │
5. BDS 1 (qcow2): L1/L2 lookup → cluster offset
        │ (할당 안 됐으면 새로 cluster allocate)
        │
6. BDS 2 (luks, encryption layer): cluster를 암호화
        │
7. BDS 3 (file Protocol): host file의 offset에 write
        │
8. AIO backend (io_uring): kernel에 submit
        │
9. (host kernel page cache 또는 direct disk write)
        │
10. completion → coroutine resume → BDS chain unwinds
        │
11. virtio-blk: completion ring + IRQ inject
        │
12. guest: write returns
```

각 단계가 *coroutine yield 가능*하므로 *비동기*. main thread도 *block 안 됨*.

## BlockBackend (BB)

```c
typedef struct BlockBackend {
    BlockDriverState *root;
    /* throttle */
    ThrottleGroup *throttle_group;
    /* I/O state */
    QLIST_HEAD(, BlockBackendAioNotifier) aio_notifiers;
    /* ... */
} BlockBackend;
```

guest의 *device 측*과 *BDS chain*을 잇는 *연결 layer*. throttle·mirror·replication 같은 *host policy*를 적용.

## BlockDriverState (BDS) chain

```text
BB → BDS_1 (qcow2) → BDS_2 (luks) → BDS_3 (file)
```

각 BDS가 *bs->file* 또는 *bs->backing*을 통해 *다음 layer*로 위임.

```c
int coroutine_fn bdrv_co_preadv(BlockDriverState *bs, ...) {
    /* qcow2 → luks → file */
    return bs->drv->bdrv_co_preadv(bs, ...);
}
```

각 driver의 callback이 *자기 처리 후* `bdrv_co_preadv(bs->file, ...)`로 *다음 BDS로 위임*.

## qcow2의 cluster lookup

```text
File offset계산:
  L1 idx  = guest_offset / (cluster_size * L2_entries)
  L2 idx  = (guest_offset / cluster_size) % L2_entries

  L1[L1_idx] → L2 table 위치
  L2[L2_idx] → cluster 위치
```

```c
int coroutine_fn qcow2_co_preadv(BlockDriverState *bs, ...) {
    /* L1·L2 lookup */
    uint64_t cluster_offset = lookup(bs, offset);

    if (cluster_offset == 0) {
        /* sparse — 한 번도 쓴 적 없음 */
        memset(buf, 0, len);
        return 0;
    }

    /* file로 위임 */
    return bdrv_co_preadv(bs->file, cluster_offset + sector, len, ...);
}
```

L1/L2 table은 *cache*되어 *자주 hit*. cold path만 disk 접근.

## Write — copy on write

```c
int coroutine_fn qcow2_co_pwritev(BlockDriverState *bs, ...) {
    uint64_t cluster_offset = lookup(bs, offset);

    if (cluster_offset == 0 || /* allocate 필요 */ ) {
        /* 새 cluster 할당 */
        cluster_offset = allocate_cluster(bs);
        update_l2_table(bs, ...);
    }

    /* file에 write */
    return bdrv_co_pwritev(bs->file, cluster_offset, buf, len);
}
```

sparse 영역에 처음 write 시 *cluster 할당 + L2 갱신*. write가 *느림*. fully-allocated 이미지는 빠름(`qemu-img create -o preallocation=full`).

## Throttle

```c
typedef struct ThrottleConfig {
    int64_t avg[BUCKETS_COUNT];     /* iops/bps */
    int64_t max[BUCKETS_COUNT];
    int64_t burst[BUCKETS_COUNT];
} ThrottleConfig;
```

`throttle.c`가 *token bucket*으로 rate 제한.

```bash
-drive file=disk.img,iops=1000,bps=50000000
```

bucket이 비면 *coroutine yield* → token 채워질 때까지 대기 → resume.

## Write cache modes

```bash
-drive file=disk.img,cache=writeback,...
```

| Mode | 동작 |
|------|------|
| `writeback` (default) | host page cache 사용. write 빠름, crash 시 risk |
| `writethrough` | 매 write에 host fsync 강제 |
| `none` (O_DIRECT) | page cache 우회 |
| `directsync` | O_DIRECT + O_SYNC |
| `unsafe` | guest fsync 무시. 가장 빠름, 위험 |

production은 `writeback` + guest의 *명시적 fsync* 조합. cloud는 `none` 권장(double cache 회피).

## flush — barrier

guest가 *sync*를 호출하면.

```c
int coroutine_fn bdrv_co_flush(BlockDriverState *bs) {
    /* qcow2: metadata flush + data flush */
    /* luks: 아래로 위임 */
    /* file: fsync syscall */
    /* AIO: io_uring fsync */
}
```

flush가 *모든 layer*를 거쳐 *host fsync*까지. 비싼 operation.

## Zero-copy — vhost·dma-buf

VirtIO + iothread + io_uring이 결합되면 *guest buffer*가 *host disk*로 *복사 없이* 직접.

```text
guest userspace buf
    │
    │ guest virt → guest phys (guest MMU)
    │
    ├ kernel skips copy
    │
    │ guest phys → host phys (EPT)
    │
    ├ io_uring SQE의 vector에 직접 register
    │
    ▼
host kernel io_uring → disk
```

bouncing buffer 없음. *최고 throughput*.

## Snapshot 시 I/O

internal qcow2 snapshot 중 active write가 발생하면.

```text
Active L2 → modified cluster
Snapshot L2 → 원본 cluster reference
```

snapshot이 *원본 보존*. active L2가 *새 cluster*에 write. snapshot은 *read-only* 보장.

## Mirror — block job

block layer의 *background job*. source의 모든 cluster를 destination에 copy.

```c
typedef struct BlockJobDriver {
    int (*run)(BlockJob *job);
    /* ... */
} BlockJobDriver;
```

`drive_mirror`가 job 시작. background에서 *cluster 단위 복사*. 그 사이의 write는 *둘 다*에 적용.

## drive Stream — backing 통합

backing chain의 *cluster를 top layer*로 끌어옴.

```bash
qemu-img create -b backing.qcow2 -f qcow2 top.qcow2
# top과 backing chain
```

```text
(qemu) drive_stream -b backing top
```

backing의 모든 cluster를 top에 *copy → backing 의존 끊김*.

## Request ordering

block layer는 *coroutine 친화* — 같은 BDS의 *동시 request*가 *interleave*. 그러나 *barrier*(flush)는 *순서 보장*.

```c
/* serialized 모드 */
bdrv_drained_begin(bs);
/* 작업 */
bdrv_drained_end(bs);
```

`drained_begin/end`가 *in-flight 모두 끝낼 때까지 대기*. snapshot·resize에 사용.

## 흔한 함정

- **cache=writeback + guest fsync 무시** — guest crash 시 data loss.
- **direct I/O + 4KB alignment 위반** — `EIO`. buffer alignment 확인.
- **throttle 너무 작음** — coroutine 항상 wait. guest perspective에서 slow.
- **backing chain 깊이** — qcow2 chain이 20 level 깊으면 read latency 누적.

## 정리

- Block I/O 흐름: guest device → BB(throttle) → BDS chain(format) → Protocol → AIO backend → host syscall.
- 각 단계가 *coroutine_fn* — yield 가능, async.
- **qcow2**의 L1/L2 lookup으로 cluster 위치 확인. sparse·copy-on-write.
- **Throttle**(`iops=`·`bps=`)은 token bucket. 부족 시 coroutine yield.
- Write cache: writeback(default)·writethrough·none(O_DIRECT)·unsafe.
- **Flush**가 가장 비싼 operation. guest fsync → host fsync.
- VirtIO + iothread + io_uring으로 *zero-copy*.
- **Block job**(mirror·stream·backup·commit)이 background에서 동작.

## 다음 장 예고

다음 장은 *device 레이어* — **VirtIO 구현 심화**. virtqueue 처리·virtio-blk·virtio-net의 host side.

## 관련 항목

- [Ch 16: AIO](/blog/tools/emulation/qemu-internals/chapter16-aio)
- [Ch 18: VirtIO Impl](/blog/tools/emulation/qemu-internals/chapter18-virtio-impl)
- [Ch 5: Block Layer](/blog/tools/emulation/qemu-internals/chapter05-block-layer)
