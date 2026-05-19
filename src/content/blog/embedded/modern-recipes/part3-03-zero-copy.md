---
title: "3-03: Zero-Copy Pipeline — DMA-BUF·sendfile·io_uring·splice"
date: 2026-05-20T10:00:00
description: "Zero-copy 패턴. DMA-BUF, sendfile, io_uring, splice. Camera→GPU→Network pipeline."
series: "Modern Embedded Recipes"
seriesOrder: 15
tags: [recipes, zero-copy, dma-buf, sendfile, io_uring, splice]
draft: true
---

## 한 줄 요약

> **"Zero-copy = memcpy 없이 buffer 통과"** — sensor → GPU → encoder → network 전체.

## 일반 Pipeline의 Copy 비용

```text
Camera → driver → user buffer → encoder input → GPU → encoder output → network buffer → wire

Copy 발생:
  1. driver → user: 1 copy
  2. user → encoder: 1 copy
  3. encoder → file: 1 copy
  4. file → socket: 1 copy
  
4K@60fps frame = 25 MB × 60 = 1.5 GB/s × 4 copy = 6 GB/s memcpy
→ memory bandwidth 절반 낭비
```

## DMA-BUF — Linux 표준 Buffer Sharing

```c
/* Camera driver — buffer producer */
struct dma_buf *buf = dma_buf_export(&exp_info);
int fd = dma_buf_fd(buf, O_CLOEXEC);

/* Encoder driver — consumer */
struct dma_buf *imported = dma_buf_get(fd);
struct dma_buf_attachment *attach = dma_buf_attach(imported, dev);
struct sg_table *sgt = dma_buf_map_attachment(attach, DMA_FROM_DEVICE);
/* sgt — scatter list pointing to same physical pages */
```

같은 *physical buffer*를 *driver끼리 직접* 공유. *user space 안 거침*.

V4L2 camera + DRM display + V4L2 encoder — *DMA-BUF로 zero-copy*.

## V4L2 + DMA-BUF — Camera Capture

```c
/* Camera fd */
int cam_fd = open("/dev/video0", O_RDWR);

/* Request DMA-BUF capable buffers */
struct v4l2_requestbuffers req = {
    .count = 4,
    .type = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE,
    .memory = V4L2_MEMORY_DMABUF,
};
ioctl(cam_fd, VIDIOC_REQBUFS, &req);

/* Export DMA-BUF fd */
struct v4l2_exportbuffer exp = {
    .type = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE,
    .index = 0,
};
ioctl(cam_fd, VIDIOC_EXPBUF, &exp);
int dma_fd = exp.fd;

/* DMA fd를 다른 driver에 전달 */
encoder_input(dma_fd);   /* 같은 buffer */
```

User space는 *fd만 통과* — buffer 자체 안 만짐.

## DRM/KMS Display + DMA-BUF

```c
/* Camera buffer를 display에 직접 */
uint32_t fb_id;
struct drm_prime_handle prime = {
    .fd = dma_fd_from_camera,
};
ioctl(drm_fd, DRM_IOCTL_PRIME_FD_TO_HANDLE, &prime);

drmModeAddFB2(drm_fd, w, h, format, &prime.handle, ...);
drmModeSetCrtc(drm_fd, ...);
/* Camera capture → display 직접, 0 copy */
```

Wayland·embedded HMI — *DMA-BUF 표준*.

## sendfile — File → Socket

```c
/* Traditional */
int n = read(file_fd, buf, sizeof(buf));   /* file → user */
write(sock_fd, buf, n);                     /* user → socket */
/* 2 copy + 2 syscall */

/* sendfile — kernel-only */
sendfile(sock_fd, file_fd, NULL, count);
/* 0 copy + 1 syscall (DMA → DMA) */
```

Web server (Nginx) — *file serving*에 sendfile. Throughput 2-3x.

## splice — Pipe-Based Zero-Copy

```c
int pipe_fd[2];
pipe(pipe_fd);

splice(file_fd, NULL, pipe_fd[1], NULL, count, SPLICE_F_MOVE);
splice(pipe_fd[0], NULL, sock_fd, NULL, count, SPLICE_F_MOVE);
/* file → pipe → socket, 0 copy */
```

`splice` — *임의 source/sink* 가능. `tee`로 fanout도.

## io_uring — Modern Async I/O

```c
#include <liburing.h>

struct io_uring ring;
io_uring_queue_init(QUEUE_DEPTH, &ring, 0);

/* Submit */
struct io_uring_sqe *sqe = io_uring_get_sqe(&ring);
io_uring_prep_read(sqe, fd, buf, len, offset);
io_uring_submit(&ring);

/* Completion */
struct io_uring_cqe *cqe;
io_uring_wait_cqe(&ring, &cqe);
/* cqe->res — bytes read */
io_uring_cqe_seen(&ring, cqe);
```

Linux 5.1+ — *kernel asynchronous I/O*. Database·web server.

### Fixed Buffers (io_uring)

```c
struct iovec iov = { .iov_base = buf, .iov_len = SIZE };
io_uring_register_buffers(&ring, &iov, 1);

io_uring_prep_read_fixed(sqe, fd, buf, len, offset, 0);
/* Kernel buffer mapping 1번만 — 매 I/O는 *zero-copy* */
```

DMA mapping을 *register*하면 매 I/O syscall *fast path*.

## mmap — File ↔ Memory

```c
int fd = open("file", O_RDONLY);
void *p = mmap(NULL, file_size, PROT_READ, MAP_SHARED, fd, 0);
/* p는 file과 *동일 page*, kernel cache 공유 */
process(p, file_size);
munmap(p, file_size);
```

File I/O — *read 안 함, page fault on access*. Database·LMDB 표준.

## Shared Memory (POSIX)

```c
int fd = shm_open("/mybuf", O_RDWR | O_CREAT, 0600);
ftruncate(fd, 4096);
void *p = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
/* 다른 process도 같은 page 접근 */
```

IPC — *copy 없는 shared buffer*. SysV shm·POSIX shm·Memfd.

## eBPF + XDP — Network Zero-Copy

```c
/* XDP — eXpress Data Path */
SEC("xdp")
int xdp_filter(struct xdp_md *ctx) {
    void *data = (void*)(long)ctx->data;
    void *end = (void*)(long)ctx->data_end;
    
    /* Packet inspect — kernel skb 만들지 않음 */
    if (drop_condition(data)) return XDP_DROP;
    return XDP_PASS;
}
```

NIC → eBPF (driver level) → 결정 — *skb 안 만들면 0 copy drop*.

## DPDK — Userspace NIC Driver

```c
struct rte_mbuf *pkt;
while (rte_eth_rx_burst(port, 0, &pkt, 1) > 0) {
    process_packet(pkt->data);
    rte_pktmbuf_free(pkt);
}
```

NIC DMA → user space buffer 직접. Kernel skb 안 거침. 10G+ network.

## GPU Direct — NVIDIA

```text
GPU Direct RDMA:
  Network NIC → GPU memory 직접
  (CPU memory 안 거침)
  
GPU Direct Storage:
  NVMe SSD → GPU memory 직접
```

자율주행·AI inference — 데이터 *NIC/SSD → GPU* 직접.

## ARM RDMA — NetworkX

```text
Cortex-A SoC + 10G NIC:
  Mellanox/Solarflare/Marvell — RDMA 지원
  → user space 직접 NIC buffer access
  → 1 µs latency 가능
```

5G UPF·고주파 trading.

## Camera → Encoder → Network Pipeline

```text
일반 (copy 많음):
  V4L2 capture → user buf → encoder → user buf → socket → send
  4 copy

Zero-copy (DMA-BUF):
  V4L2 → dma_fd1
  encoder(dma_fd1) → dma_fd2 (encoded stream)
  send(dma_fd2 via sendfile/splice)
  0 copy
```

ROS 2·자율주행·드론 — *모두 DMA-BUF*.

## 자주 하는 실수

> ⚠️ Zero-copy로 가정만

```c
read(fd, buf, n);
write(sock, buf, n);
/* "zero-copy 됐을 거" — 그러나 *2 copy* */
```

→ `sendfile`·`splice`·`io_uring`.

> ⚠️ DMA-BUF API 잘못

```c
dma_buf_attach()
dma_buf_map_attachment()
/* 그러나 dma_buf_end_cpu_access 안 부름 → cache state 깨짐 */
```

→ API 순서 엄격히.

> ⚠️ mmap 후 fork

```c
void *p = mmap(NULL, n, PROT_RW, MAP_SHARED, fd, 0);
fork();
/* Both processes 같은 mmap — careful */
```

→ MAP_SHARED 의도 명확히.

> ⚠️ io_uring kernel 버전

```c
io_uring_setup(...);
/* Linux 5.1 미만 — fail */
```

→ kernel 5.1+ 또는 `liburing` fallback.

## 정리

- Zero-copy = **memcpy 없이 buffer 통과**.
- **DMA-BUF** = Linux 표준 cross-driver sharing.
- **sendfile·splice·io_uring** — file·network zero-copy.
- **mmap** = file ↔ memory shared.
- **XDP·DPDK** = network kernel bypass.
- **GPU Direct** = NIC/SSD → GPU 직접.
- 자율주행·드론·5G — 모두 zero-copy.

다음 편은 **NUMA**.

## 관련 항목

- [3-02: DMA Allocator](/blog/embedded/modern-recipes/part3-02-dma-allocator)
- [3-04: NUMA](/blog/embedded/modern-recipes/part3-04-numa)
