---
title: "Ch 5: 블록 레이어"
date: 2026-05-17T05:00:00
description: "QEMU 블록 레이어의 이미지 포맷과 I/O 경로를 이해한다."
tags: [QEMU, Block, Storage, qcow2, BDS]
series: "QEMU Internals"
seriesOrder: 5
draft: true
---

QEMU의 **block layer**는 guest의 disk I/O를 *host 파일/네트워크 storage*로 forward하는 stack입니다. qcow2의 snapshot·암호화, nbd의 원격 disk, live mirror·backup이 모두 이 layer 위에서 동작. 4-layer 구조와 coroutine 패턴을 이해하면 *고급 storage 기능*을 활용할 수 있습니다.

## 4-Layer 구조

```text
┌──────────────────┐
│  BlockDevice     │  ← virtio-blk / IDE / NVMe (guest 인터페이스)
└────────┬─────────┘
         │
┌────────▼─────────┐
│  BlockBackend    │  ← throttle / mirror / replication
│  (BB)            │
└────────┬─────────┘
         │
┌────────▼─────────┐
│  BlockDriverState│  ← qcow2 / raw / qed / vmdk / luks
│  (BDS)           │
└────────┬─────────┘
         │
┌────────▼─────────┐
│  Protocol        │  ← file / nbd / iscsi / ssh / curl
└──────────────────┘
```

각 layer가 *교환 가능*. virtio-blk 위에 qcow2 위에 file이 한 조합, IDE 위에 raw 위에 nbd가 다른 조합.

## BlockDevice (frontend)

게스트가 *보는* 인터페이스.

```bash
qemu-system-x86_64 -drive file=disk.qcow2,if=none,id=hd0 \
    -device virtio-blk-pci,drive=hd0
```

`virtio-blk-pci`가 frontend. `-drive`가 *BlockBackend + BDS + Protocol* 묶음.

## BlockBackend (BB)

host-side *throttle·mirror·replication*을 다루는 layer.

```c
BlockBackend *blk = blk_new(qemu_get_aio_context(), 0, BLK_PERM_ALL);
blk_insert_bs(blk, bs, &error_fatal);

/* throttle */
ThrottleConfig cfg = { /* limits */ };
blk_set_io_limits(blk, &cfg);

/* I/O */
blk_co_preadv(blk, offset, len, &qiov, 0);
```

`-drive`의 `iops=`·`bps=` 같은 옵션이 BB의 throttle에 매핑.

## BlockDriverState (BDS)

format을 다루는 layer.

| Format | 특징 |
|--------|------|
| **raw** | 1:1, 가장 빠름 |
| **qcow2** | snapshot·sparse·encryption·compression |
| **qed** | qcow2 단순화. deprecated 진행 |
| **vmdk** | VMware 호환 |
| **vdi** | VirtualBox |
| **luks** | encryption layer (다른 BDS 위에) |

BDS는 *chain* 가능 — qcow2 위의 luks 같은 *layer 조합*.

```bash
qemu-system-... -drive file=encrypted.luks,format=luks,key-secret=sec0 ...
```

## Protocol

actual data를 *어디서* 읽는지.

| Protocol | 의미 |
|----------|------|
| `file` | 로컬 파일 |
| `nbd` | Network Block Device |
| `iscsi` | iSCSI target |
| `ssh` | SSH·SCP 기반 |
| `curl` (http) | HTTP/HTTPS |
| `rbd` | Ceph RBD |
| `gluster` | GlusterFS |

```bash
qemu-system-x86_64 -drive driver=nbd,server.host=10.0.0.1,server.port=10809,export=disk1
```

## qcow2 구조

QEMU 네이티브 포맷. *sparse·snapshot·encryption·compression*을 자체 지원.

```text
qcow2 파일 헤더
├── magic ("QFI\xfb")
├── version, cluster size
├── L1 table offset
├── refcount table offset
└── snapshots offset

L1 table  →  L2 table  →  data cluster
                              │
                              ▼
                           실제 게스트 data
```

*2-level* address translation으로 sparse 지원. 한 번도 쓴 적 없는 영역은 *디스크에 할당 안 됨*.

## qcow2 snapshot

`savevm`/`loadvm` monitor 명령으로 시점 저장.

```text
(qemu) savevm snap1
(qemu) (... 변경 ...)
(qemu) loadvm snap1
```

내부적으로 *L1 table을 복사*하고 *현재 클러스터에 reference count* 증가. *copy-on-write*로 효율적 저장.

## Coroutine 기반 I/O

block layer가 *coroutine 전면 사용*.

```c
static int coroutine_fn my_co_preadv(BlockDriverState *bs,
                                      int64_t offset, int64_t bytes,
                                      QEMUIOVector *qiov,
                                      BdrvRequestFlags flags) {
    /* sync syscall이지만 coroutine 안 — yield 가능 */
    int ret = bdrv_co_preadv(bs->file, offset, bytes, qiov, flags);
    return ret;
}
```

`coroutine_fn` annotation이 *함수가 coroutine context에서 호출됨*을 표시. coroutine 안에서 `qemu_coroutine_yield`로 *AIO 완료 대기*.

## I/O path 한 라운드

guest가 `read(/dev/vda, ..., 4096)`을 호출하면.

```text
guest VM                        QEMU
─────────────────────────────────
read syscall
  ↓
virtio-blk submit
  ↓ (vring write + doorbell)
                            virtio-blk-pci handler
                              ↓
                            BlockBackend (throttle 검사)
                              ↓
                            qcow2 BDS
                              ├─ L1 lookup
                              ├─ L2 lookup
                              └─ cluster offset 계산
                                ↓
                            file Protocol
                              ↓
                            pread() syscall on host
                              ↓ (또는 io_uring submit)
                            data ready
                              ↓
                            virtio-blk completion
                              ↓ (vring + IRQ)
guest read returns
```

각 단계가 coroutine yield 가능하므로 *I/O가 비동기*.

## Image format conversion

```bash
qemu-img convert -O qcow2 raw_disk.img new.qcow2
qemu-img info new.qcow2
# image: new.qcow2
# file format: qcow2
# virtual size: 10 GiB
# disk size: 1.2 GiB    <- sparse
```

`qemu-img`가 block layer의 *CLI 노출*. info·convert·snapshot·create·resize.

## Live mirror — disk migrate

VM 실행 중 *disk를 다른 storage로 복사*.

```text
(qemu) drive_mirror -n hd0 /new/disk.qcow2
(qemu) info block-jobs
```

내부적으로 *mirror block driver*가 source의 모든 cluster를 destination으로 복사하면서, write가 *둘 다*에 적용. 완료 후 *switchover*.

## Block snapshot

```text
(qemu) snapshot_blkdev hd0 snap1
```

base image 위에 *delta 파일*을 만들고 write를 *delta*에 쌓음. base는 *read-only* 보존.

## Backup

```text
(qemu) drive_backup -n hd0 /backup/disk.img
```

특정 시점의 disk를 다른 파일로 *bit-exact 복제*. backup 도중의 write는 *backup destination*에 먼저 적용 후 source.

## qemu-storage-daemon

QEMU와 *분리된* storage daemon. NBD/vhost-user를 통해 *다른 QEMU나 컨테이너*에 storage 서비스.

```bash
qemu-storage-daemon --blockdev '...' --export '...'
```

cloud orchestration·containerd integration에 사용.

## 흔한 함정

- **`if=virtio` legacy** — `-drive ...,if=virtio`는 deprecated. `-drive ...,if=none,id=hd0` + `-device virtio-blk-pci,drive=hd0` 권장.
- **format auto-detect 위험** — 사용자가 raw에 qcow2 magic을 쓰면 *오인식* 가능. `format=...` 명시.
- **snapshot 누적** — qcow2의 internal snapshot이 *파일 크기를 키움*. 정기 청소 또는 외부 snapshot 사용.
- **iothread 누락** — 고성능 disk는 iothread 명시. main loop가 block I/O로 hang.

## 정리

- QEMU block layer는 **BlockDevice → BlockBackend → BDS → Protocol** 4-layer.
- 각 layer가 *교환 가능* — virtio-blk + qcow2 + file이 흔한 조합.
- **qcow2**가 네이티브 포맷 — sparse·snapshot·encryption·compression.
- Block layer가 *coroutine 전면 사용* — yield가 자연스럽게 비동기 I/O.
- I/O path: guest read → virtio → BB → BDS → Protocol → host syscall → 거꾸로.
- `qemu-img`로 conversion·info·snapshot 등 *CLI 노출*.
- `drive_mirror`·`snapshot_blkdev`·`drive_backup`이 *live operation*.
- `qemu-storage-daemon`이 외부 process로 storage 서비스.

## 다음 장 예고

다음 장은 *network layer* — virtio-net·tap·vhost가 어떻게 연결되는지.

## 관련 항목

- [Ch 4: 이벤트 루프](/blog/tools/emulation/qemu-internals/chapter04-event-loop)
- [Ch 6: 네트워크 레이어](/blog/tools/emulation/qemu-internals/chapter06-network-layer)
- [Ch 17: Block I/O 심화](/blog/tools/emulation/qemu-internals/chapter17-block-io)
