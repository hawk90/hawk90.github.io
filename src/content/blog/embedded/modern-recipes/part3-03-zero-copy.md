---
title: "3-03: Zero-Copy Pipeline — DMA-BUF·sendfile·io_uring·splice"
date: 2026-05-20T10:00:00
description: "Camera→GPU→Encoder→Network pipeline에서 memcpy를 모두 제거하는 패턴을 모았습니다."
series: "Modern Embedded Recipes"
seriesOrder: 15
tags: [recipes, zero-copy, dma-buf, sendfile, io_uring, splice]
---

## 한 줄 요약

> **"Zero-copy = buffer를 핸들로만 넘기고, 데이터 자체는 옮기지 않는다."** Sensor에서 wire까지 *fd 하나*만 전달하는 그림이 목표입니다.

## 어떤 상황에서 쓰나

4K 60fps 카메라 한 대만 받아도 raw 영상은 약 1.5 GB/s입니다. Camera driver → user buffer → encoder input → encoder output → socket까지 네 번 복사하면 6 GB/s memcpy가 발생합니다. LPDDR4 한 channel의 대역폭 절반이 memcpy로 증발합니다.

5G UPF나 자율주행 sensor fusion에서는 µs 단위 latency가 중요합니다. 데이터를 복사하는 시간은 *전송보다 길어질 수 있고* CPU cache까지 오염시킵니다. Pipeline이 길어질수록 zero-copy의 이득이 커집니다.

## 핵심 개념

세 갈래로 나눕니다.

```text
1. Buffer 공유      DMA-BUF, shared memory, mmap
                    같은 page를 여러 주체가 본다
2. Kernel 내 전송    sendfile, splice
                    user space를 거치지 않고 fd→fd
3. Kernel 우회      io_uring, XDP, DPDK
                    syscall 자체를 줄이거나 없앤다
```

세 방식은 결합 가능합니다. V4L2 → DMA-BUF → encoder → splice → socket이 흔한 조합입니다.

## 코드 / 실제 사용 예

### DMA-BUF로 driver 간 공유

```c
/* Producer (예: camera driver) */
struct dma_buf *buf = dma_buf_export(&exp_info);
int fd = dma_buf_fd(buf, O_CLOEXEC);

/* Consumer (예: encoder driver) */
struct dma_buf *imported = dma_buf_get(fd);
struct dma_buf_attachment *attach = dma_buf_attach(imported, dev);
struct sg_table *sgt = dma_buf_map_attachment(attach, DMA_FROM_DEVICE);
```

같은 physical buffer가 두 driver의 sg_table에 매핑됩니다. User space는 fd만 들고 다니고 buffer 자체는 절대 user 공간으로 올라오지 않습니다.

### V4L2 카메라에서 DMA-BUF fd 얻기

```c
int cam_fd = open("/dev/video0", O_RDWR);

struct v4l2_requestbuffers req = {
    .count  = 4,
    .type   = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE,
    .memory = V4L2_MEMORY_DMABUF,
};
ioctl(cam_fd, VIDIOC_REQBUFS, &req);

struct v4l2_exportbuffer exp = {
    .type  = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE,
    .index = 0,
};
ioctl(cam_fd, VIDIOC_EXPBUF, &exp);
int dma_fd = exp.fd;

encoder_input(dma_fd);   /* 같은 buffer */
```

User code는 fd 정수만 encoder로 넘깁니다. memcpy가 한 번도 일어나지 않습니다.

### DRM/KMS로 카메라 buffer를 그대로 화면에

```c
struct drm_prime_handle prime = {
    .fd = dma_fd_from_camera,
};
ioctl(drm_fd, DRM_IOCTL_PRIME_FD_TO_HANDLE, &prime);

drmModeAddFB2(drm_fd, w, h, format, &prime.handle, ...);
drmModeSetCrtc(drm_fd, ...);
```

자동차 클러스터, 임베디드 HMI, Wayland 컴포지터가 표준으로 쓰는 흐름입니다.

### `sendfile` — file → socket 직접

```c
/* 일반 read/write — 2 copy */
int n = read(file_fd, buf, sizeof(buf));
write(sock_fd, buf, n);

/* sendfile — kernel 내부, 0 copy */
sendfile(sock_fd, file_fd, NULL, count);
```

Nginx, Apache, ftp 서버가 정적 파일 응답에 쓰는 표준 API입니다. Throughput이 2~3배 늘어납니다.

### `splice` — pipe 기반 fd 간 전송

```c
int pipe_fd[2];
pipe(pipe_fd);

splice(file_fd, NULL, pipe_fd[1], NULL, count, SPLICE_F_MOVE);
splice(pipe_fd[0], NULL, sock_fd, NULL, count, SPLICE_F_MOVE);
```

`sendfile`이 file → socket만 지원하는 데 비해 `splice`는 임의 source/sink를 연결합니다. `tee`로 한 입력을 여러 소비자에게 fanout할 수도 있습니다.

### `io_uring` — async batch submission

```c
#include <liburing.h>

struct io_uring ring;
io_uring_queue_init(QUEUE_DEPTH, &ring, 0);

struct io_uring_sqe *sqe = io_uring_get_sqe(&ring);
io_uring_prep_read(sqe, fd, buf, len, offset);
io_uring_submit(&ring);

struct io_uring_cqe *cqe;
io_uring_wait_cqe(&ring, &cqe);
io_uring_cqe_seen(&ring, cqe);
```

Linux 5.1+에서 도입된 새 비동기 I/O API입니다. Syscall 자체를 ring queue로 묶어 한 번에 처리합니다.

### Fixed buffer로 mapping overhead 제거

```c
struct iovec iov = { .iov_base = buf, .iov_len = SIZE };
io_uring_register_buffers(&ring, &iov, 1);

io_uring_prep_read_fixed(sqe, fd, buf, len, offset, 0);
```

Kernel이 buffer를 한 번만 mapping해 두고 매 I/O는 fast path를 탑니다. NVMe IOPS가 50% 이상 늘어납니다.

### `mmap`으로 파일과 메모리 공유

```c
int fd = open("file", O_RDONLY);
void *p = mmap(NULL, file_size, PROT_READ, MAP_SHARED, fd, 0);
process(p, file_size);
munmap(p, file_size);
```

Read 시스템 콜이 일어나지 않고 첫 접근에서만 page fault로 가져옵니다. LMDB·SQLite 같은 embedded DB가 표준으로 씁니다.

### POSIX shared memory

```c
int fd = shm_open("/mybuf", O_RDWR | O_CREAT, 0600);
ftruncate(fd, 4096);
void *p = mmap(NULL, 4096, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
```

두 process가 같은 page를 직접 본 채로 IPC합니다. ROS 2 intra-host transport, audio server가 흔히 씁니다.

### XDP로 NIC 단에서 packet 처리

```c
SEC("xdp")
int xdp_filter(struct xdp_md *ctx) {
    void *data = (void*)(long)ctx->data;
    void *end  = (void*)(long)ctx->data_end;

    if (drop_condition(data)) return XDP_DROP;
    return XDP_PASS;
}
```

eBPF로 NIC driver 레벨에서 결정합니다. Drop으로 끝나면 skb조차 만들지 않으므로 진정한 zero-copy drop이 됩니다.

### DPDK userspace driver

```c
struct rte_mbuf *pkt;
while (rte_eth_rx_burst(port, 0, &pkt, 1) > 0) {
    process_packet(pkt->data);
    rte_pktmbuf_free(pkt);
}
```

NIC DMA가 user space ring buffer에 직접 packet을 쓰고 user thread가 polling합니다. Kernel skb 자체가 없습니다.

## 측정 / 성능 비교

1 GB 파일을 socket으로 전송했을 때입니다.

```text
방식                       시간      CPU
read/write                 1.20 s    50%
sendfile                   0.45 s    18%
splice (file→pipe→sock)    0.42 s    16%
io_uring + fixed buf       0.38 s    12%
```

4K 60fps 카메라 → encoder pipeline입니다.

```text
copy 4번 (V4L2 read → memcpy)        CPU 35%, jitter 8 ms
DMA-BUF (V4L2 → encoder fd 전달)     CPU 8%,  jitter 1 ms
```

Drone, 자율주행, 5G UPF는 jitter 자체가 spec이므로 DMA-BUF가 기본입니다.

## 자주 보는 함정

> "Zero-copy 됐을 거"라는 가정

```c
read(fd, buf, n);
write(sock, buf, n);
```

이 코드는 두 번 복사합니다. Zero-copy는 *명시 API*를 써야 발생합니다.

> DMA-BUF cache 동기화 누락

```c
dma_buf_map_attachment(...);
/* CPU가 read만 하고 dma_buf_end_cpu_access 안 부름 */
```

Producer/consumer 양쪽 모두 `dma_buf_begin_cpu_access` / `end_cpu_access`로 cache 경계를 표시해야 합니다.

> `mmap` 후 `fork`

```c
void *p = mmap(NULL, n, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
fork();
```

`MAP_SHARED`라면 두 process가 같은 page를 보고, `MAP_PRIVATE`라면 COW가 일어납니다. 의도를 명확히 두지 않으면 디버깅이 까다로워집니다.

> `io_uring` 커널 버전

```c
io_uring_setup(...);
/* Linux 5.1 미만에서 fail */
```

Kernel 5.1 이상인지 확인하거나 `liburing`이 fallback을 제공하는 API로 우회합니다.

> Buffer 재사용 시점

```c
io_uring_prep_write(sqe, fd, buf, len, 0);
io_uring_submit(&ring);
memset(buf, 0, len);   /* 아직 kernel이 보내는 중일 수 있음 */
```

CQE를 받기 전에는 buffer를 건드리지 않습니다. Zero-copy일수록 완료 시점이 더 중요해집니다.

## 정리

- Zero-copy는 buffer 공유, kernel 내 전송, kernel 우회 세 갈래로 나뉩니다.
- DMA-BUF는 Linux에서 driver 간 buffer를 fd로 공유하는 표준입니다.
- V4L2 카메라와 DRM 디스플레이는 DMA-BUF로 직접 연결할 수 있습니다.
- `sendfile`/`splice`/`io_uring`은 user space 복사를 제거합니다.
- `mmap`과 POSIX shm은 process 간 buffer 공유에 쓰입니다.
- XDP와 DPDK는 NIC을 user space와 직접 연결해 skb 자체를 없앱니다.
- Buffer 재사용 시점과 cache 동기화 호출이 zero-copy의 정확성을 결정합니다.

다음 편은 **NUMA 메모리 토폴로지**입니다.

## 관련 항목

- [3-02: DMA Allocator](/blog/embedded/modern-recipes/part3-02-dma-allocator)
- [3-04: NUMA Memory Topology](/blog/embedded/modern-recipes/part3-04-numa)
- [PE 3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
- [RTOS 3-11: Stream Buffer](/blog/embedded/rtos/practical-internals/part3-11-stream-buffer)
