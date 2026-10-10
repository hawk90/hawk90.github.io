---
title: "Zero-Copy Pipeline — DMA-BUF·sendfile·io_uring·splice"
slug: "embedded/modern-recipes/part8-05-zero-copy"
date: 2026-04-17T09:04:00
description: "Camera→GPU→Encoder→Network pipeline에서 memcpy를 모두 제거하는 패턴을 모았습니다."
series: "Modern Embedded Recipes"
seriesOrder: 93
tags: [recipes, zero-copy, dma-buf, sendfile, io_uring, splice]
topics: ["embedded"]
---

## 한 줄 요약

> **"Zero-copy = 가능한 경로에서 불필요한 CPU 복사를 줄이는 것."** Sensor에서 wire까지 fd/핸들로 연결할 수 있어도 드라이버·IOMMU·포맷 변환·동기화 때문에 실제 복사나 메모리 접근이 남을 수 있습니다.

## 어떤 상황에서 쓰나

4K 60fps 카메라의 raw 대역폭은 픽셀 포맷과 stride에 따라 달라집니다. Camera driver → user buffer → encoder input → encoder output → socket처럼 여러 경계를 거치면 각 경로에서 복사가 추가될 수 있고, 실제 메모리 트래픽은 버퍼 수명과 캐시 정책을 포함해 측정해야 합니다. LPDDR 대역폭의 어느 정도를 소모하는지는 SoC와 동시 workload에 따라 달라집니다.

5G UPF나 자율주행 sensor fusion에서는 µs 단위 latency가 중요합니다. 데이터를 복사하는 시간은 *전송보다 길어질 수 있고* CPU cache까지 오염시킵니다. Pipeline이 길어질수록 zero-copy의 이득이 커집니다.

## 핵심 개념

세 갈래로 나눕니다.

1. **Buffer 공유** — DMA-BUF, shared memory, mmap. 같은 page를 여러 주체가 본다.
2. **Kernel 내 전송** — `sendfile`, `splice`. user space를 거치지 않고 fd→fd.
3. **Kernel 우회** — io_uring, XDP, DPDK. syscall 자체를 줄이거나 없앤다.

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

하나의 dma-buf 객체가 각 장치의 주소 공간에 서로 다른 scatter-gather 매핑으로 연결될 수 있습니다. User space는 fd를 전달하지만, CPU 접근이 필요한 경우에는 별도 매핑과 cache 동기화가 필요합니다.

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

User code는 fd 정수만 encoder로 넘길 수 있습니다. 다만 드라이버가 포맷 변환·stride 보정·fallback buffer를 사용하면 복사가 남을 수 있으므로 trace와 DMA 경로로 확인해야 합니다.

### DRM/KMS로 카메라 buffer를 그대로 화면에

```c
struct drm_prime_handle prime = {
    .fd = dma_fd_from_camera,
};
ioctl(drm_fd, DRM_IOCTL_PRIME_FD_TO_HANDLE, &prime);

drmModeAddFB2(drm_fd, w, h, format, &prime.handle, ...);
drmModeSetCrtc(drm_fd, ...);
```

자동차 클러스터, 임베디드 HMI, Wayland 컴포지터에서 선택되는 흐름 중 하나입니다. 지원 포맷과 modifier, fencing은 각 DRM·카메라·컴포지터 조합을 확인해야 합니다.

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

`sendfile`의 지원 범위는 커널·파일시스템·대상 fd에 따라 달라지며, `splice`도 pipe를 포함한 지원 가능한 fd 조합에 제한이 있습니다. `tee`로 한 pipe 입력을 복제할 수 있어도 소비자별 처리와 backpressure가 사라지는 것은 아닙니다.

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

io_uring은 Linux 5.1 계열에서 도입됐지만, opcode·등록 버퍼·polling 등의 기능은 커널과 liburing 버전에 따라 다릅니다. submission/completion을 링으로 묶어 syscall 오버헤드를 줄일 수 있어도 모든 I/O가 비동기 또는 zero-copy가 되는 것은 아닙니다.

### Fixed buffer로 mapping overhead 제거

```c
struct iovec iov = { .iov_base = buf, .iov_len = SIZE };
io_uring_register_buffers(&ring, &iov, 1);

io_uring_prep_read_fixed(sqe, fd, buf, len, offset, 0);
```

등록 버퍼는 반복적인 pinning·검증 비용을 줄일 수 있지만, 실제 이득은 커널 버전·파일시스템·I/O 크기와 workload로 측정해야 합니다. NVMe IOPS가 항상 증가하거나 특정 비율로 늘어난다고 보장할 수 없습니다.

### `mmap`으로 파일과 메모리 공유

```c
int fd = open("file", O_RDONLY);
void *p = mmap(NULL, file_size, PROT_READ, MAP_SHARED, fd, 0);
process(p, file_size);
munmap(p, file_size);
```

명시적인 read 호출 대신 페이지 폴트와 파일 매핑 경로를 사용하며, 첫 접근 이후에도 major/minor fault와 writeback이 발생할 수 있습니다. LMDB·SQLite 등에서 선택되는 방식이지만 데이터베이스의 전체 I/O 경로가 자동으로 zero-copy가 되는 것은 아닙니다.

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

일부 DPDK 구성이 NIC DMA와 user-space mempool/ring을 사용해 polling하며, 일반적인 커널 skb 경로를 우회할 수 있습니다. NIC 드라이버·IOMMU·메모리 등록 조건에 따라 실제 경로는 달라집니다.

## 측정 / 성능 비교

예시 측정 형식입니다. 수치는 파일시스템, NIC, 커널, CPU, 암호화·TLS 여부에 따라 달라지므로 동일 조건에서 재측정해야 합니다.

```text
방식                       시간      CPU
read/write                 측정 필요  측정 필요
sendfile                   측정 필요  측정 필요
splice (file→pipe→sock)    측정 필요  측정 필요
io_uring + fixed buf       측정 필요  측정 필요
```

4K 60fps 카메라 → encoder pipeline입니다.

```text
copy 경로 (V4L2 read → memcpy)        CPU·jitter 측정 필요
DMA-BUF (V4L2 → encoder fd 전달)     CPU·jitter 측정 필요
```

Drone, 자율주행, 5G UPF처럼 지연·jitter가 중요한 시스템에서도 DMA-BUF는 요구사항과 드라이버 지원을 확인해 선택합니다. 사용 자체가 성능이나 jitter 사양을 보장하지는 않습니다.

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

CPU가 dma-buf에 접근하는 구간에서는 exporter/importer의 DMA-BUF 동기화 계약과 플랫폼 DMA API를 따라야 합니다. 필요한 호출과 방향은 exporter·장치·coherency 정책에 따라 다르므로 양쪽이 무조건 같은 호출을 한다고 일반화하면 안 됩니다.

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

- [3-02: DMA Allocator](/blog/embedded/modern-recipes/part8-04-dma-allocator)
- [3-04: NUMA Memory Topology](/blog/embedded/modern-recipes/part8-06-numa)
- [PE 3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
- [RTOS 3-11: Stream Buffer](/blog/embedded/rtos/practical-internals/part3-11-stream-message-buffer)
