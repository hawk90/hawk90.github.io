---
title: "Zero-Copy Pipeline — DMA-BUF·sendfile·io_uring·splice"
slug: "embedded/modern-recipes/part8-05-zero-copy"
date: 2026-04-17T09:04:00
description: "Linux 6.12에서 read/write·sendfile·splice·io_uring·V4L2 DMA-BUF를 직접 돌려, API마다 어디서 CPU 복사가 사라지는지 잽니다."
series: "Modern Embedded Recipes"
seriesOrder: 93
tags: [recipes, zero-copy, dma-buf, sendfile, io_uring, splice]
topics: ["embedded"]
---

## 한 줄 요약

> **"Zero-copy = 가능한 경로에서 불필요한 CPU 복사를 줄이는 것."** fd 하나를 넘긴다고 복사가 사라지는 것은 아니고, API마다 "어디서 복사가 사라지는지"가 다릅니다. 이 글은 Linux 6.12에서 `read`/`write`, `sendfile`, `splice`, `io_uring`, V4L2 DMA-BUF를 직접 돌려 그 차이를 잽니다.

## 어떤 상황에서 쓰나

4K(3840×2160) 60 fps 카메라를 NV12(픽셀당 1.5 B)로 받으면 3840 × 2160 × 1.5 × 60 = 약 746 MB/s, YUYV(2 B)면 약 995 MB/s입니다. camera driver → user buffer → encoder 입력처럼 경계를 하나 넘을 때마다 CPU가 이만큼을 한 번 더 읽고 씁니다. 이사할 때 짐을 트럭에서 내려 창고에 쌓았다가 다시 다른 트럭에 싣는 대신, 트럭 열쇠만 넘겨주는 것이 zero-copy입니다.

또 하나는 CPU 시간입니다. 아래 측정에서 512 MiB 파일을 socket으로 보낼 때 `read`/`write`는 송신 쪽 sys 시간이 0.130초, `sendfile`은 0.022초였습니다. 같은 일을 하면서 CPU를 6분의 1만 썼습니다(다시 돌린 실행에서는 0.109초 대 0.021초).

## 핵심 개념

세 갈래로 나눕니다.

1. **Buffer 공유** — DMA-BUF, shared memory, `mmap`. 같은 page를 여러 주체가 봅니다.
2. **Kernel 안 전송** — `sendfile`, `splice`. user space를 거치지 않고 fd에서 fd로 옮깁니다.
3. **Kernel 경계 비용 줄이기·우회** — `io_uring`, XDP, DPDK. syscall을 묶거나 kernel 경로 일부를 건너뜁니다.

`sendfile(2)` man page는 이 차이를 이렇게 적습니다. "Because this copying is done within the kernel, sendfile() is more efficient than the combination of read(2) and write(2), which would require transferring data to and from user space." 복사가 kernel 안에서 일어난다는 뜻이지, 복사가 0이라는 뜻은 아닙니다.

## 코드 / 실제 사용 예

아래 사용자 공간 예제는 모두 Apple M2 Pro 위 QEMU(`-accel hvf`) Debian 13 arm64 게스트(6 vCPU, 커널 6.12.116+deb13-arm64, GCC 14.2.0, liburing 2.9)에서 `gcc -O2 -Wall`로 빌드해 돌렸습니다.

### `read`/`write` vs `sendfile` vs `splice`

page cache에 올린 512 MiB 파일을 localhost TCP socket으로 보냅니다. 받는 쪽은 자식 프로세스가 읽고 버립니다. 시간은 송신 프로세스의 wall time과 `getrusage(RUSAGE_SELF)`의 user·sys 시간입니다.

```c
/* file -> TCP socket on localhost with read/write, sendfile or splice */
#define _GNU_SOURCE
#include <arpa/inet.h>
#include <fcntl.h>
#include <netinet/in.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/resource.h>
#include <sys/sendfile.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec + t.tv_nsec / 1e9; }
static double tv(struct timeval t) { return t.tv_sec + t.tv_usec / 1e6; }

int main(int argc, char **argv)
{
    const char *mode = argv[1];
    int file_fd = open(argv[2], O_RDONLY);
    struct stat st; fstat(file_fd, &st);
    size_t count = st.st_size;

    int ls = socket(AF_INET, SOCK_STREAM, 0);
    struct sockaddr_in a = { .sin_family = AF_INET, .sin_addr.s_addr = htonl(INADDR_LOOPBACK) };
    bind(ls, (void *)&a, sizeof a); listen(ls, 1);
    socklen_t al = sizeof a; getsockname(ls, (void *)&a, &al);

    if (fork() == 0) {                       /* sink: read and discard */
        int c = accept(ls, NULL, NULL);
        static char sink[1 << 16];
        while (read(c, sink, sizeof sink) > 0) { }
        _exit(0);
    }
    int sock_fd = socket(AF_INET, SOCK_STREAM, 0);
    connect(sock_fd, (void *)&a, sizeof a);

    struct rusage r0, r1; getrusage(RUSAGE_SELF, &r0);
    double t0 = now();
    size_t done = 0;
    if (!strcmp(mode, "rw")) {
        static char buf[1 << 16];
        ssize_t n;
        while ((n = read(file_fd, buf, sizeof buf)) > 0)
            for (ssize_t o = 0; o < n; ) o += write(sock_fd, buf + o, n - o);
        done = count;
    } else if (!strcmp(mode, "sendfile")) {
        while (done < count) { ssize_t n = sendfile(sock_fd, file_fd, NULL, count - done); if (n <= 0) break; done += n; }
    } else {                                  /* splice */
        int p[2]; pipe(p);
        while (done < count) {
            ssize_t n = splice(file_fd, NULL, p[1], NULL, 1 << 16, SPLICE_F_MOVE);
            if (n <= 0) break;
            for (ssize_t m = n; m > 0; ) m -= splice(p[0], NULL, sock_fd, NULL, m, SPLICE_F_MOVE);
            done += n;
        }
    }
    shutdown(sock_fd, SHUT_WR);
    wait(NULL);
    double t = now() - t0;
    getrusage(RUSAGE_SELF, &r1);
    printf("%-8s %zu MiB  wall %.3f s  sender user %.3f s sys %.3f s\n", mode, done >> 20, t,
           tv(r1.ru_utime) - tv(r0.ru_utime), tv(r1.ru_stime) - tv(r0.ru_stime));
    return 0;
}
```

```bash
#!/bin/bash
# 512 MiB file kept in the page cache; each mode 5 times
[ -f big.bin ] || head -c $((512<<20)) /dev/urandom > big.bin
cat big.bin > /dev/null
gcc -O2 -Wall -o xfer xfer.c
for m in rw sendfile splice; do for i in 1 2 3 4 5; do ./xfer $m big.bin; done; done
```

```text
rw       512 MiB  wall 0.130 s  sender user 0.000 s sys 0.130 s
rw       512 MiB  wall 0.128 s  sender user 0.000 s sys 0.128 s
rw       512 MiB  wall 0.130 s  sender user 0.000 s sys 0.130 s
rw       512 MiB  wall 0.136 s  sender user 0.000 s sys 0.136 s
rw       512 MiB  wall 0.126 s  sender user 0.000 s sys 0.126 s
sendfile 512 MiB  wall 0.069 s  sender user 0.000 s sys 0.023 s
sendfile 512 MiB  wall 0.070 s  sender user 0.000 s sys 0.022 s
sendfile 512 MiB  wall 0.069 s  sender user 0.000 s sys 0.022 s
sendfile 512 MiB  wall 0.070 s  sender user 0.000 s sys 0.020 s
sendfile 512 MiB  wall 0.071 s  sender user 0.000 s sys 0.021 s
splice   512 MiB  wall 0.065 s  sender user 0.002 s sys 0.020 s
splice   512 MiB  wall 0.066 s  sender user 0.000 s sys 0.025 s
splice   512 MiB  wall 0.068 s  sender user 0.000 s sys 0.023 s
splice   512 MiB  wall 0.065 s  sender user 0.000 s sys 0.024 s
splice   512 MiB  wall 0.073 s  sender user 0.000 s sys 0.028 s
```

5회 중앙값으로 정리하면 다음과 같습니다.

| 방식 | wall | 송신 sys | `read`/`write` 대비 sys |
| --- | ---: | ---: | ---: |
| `read`/`write` (64 KiB buffer) | 0.130 s | 0.130 s | 1 |
| `sendfile` | 0.070 s | 0.022 s | 0.17 |
| `splice` (file → pipe → socket) | 0.066 s | 0.024 s | 0.18 |

- **송신 CPU는 5~6분의 1로 줄었습니다.** 같은 블록을 새 디렉터리에서 다시 돌린 실행에서는 중앙값이 `read`/`write` 0.109초, `sendfile` 0.021초, `splice` 0.024초였습니다. `read`/`write`는 page cache → user buffer, user buffer → socket buffer 두 번을 CPU가 옮기고, `sendfile`·`splice`는 user buffer를 거치지 않습니다.
- **wall time은 1.9배(다시 돌린 실행에서는 2.4배)만 줄었습니다.** 받는 쪽은 세 경우 모두 `read`로 socket에서 user buffer로 복사하므로, 받는 쪽이 병목이 됩니다. zero-copy 효과는 경로의 한쪽 끝만 바꾸면 그 끝에서만 보입니다.
- `splice`는 `SPLICE_F_MOVE`를 줬지만 결과가 `sendfile`과 거의 같았습니다. `splice(2)`에서 이 flag는 kernel에 대한 힌트이고, 두 호출 모두 user 공간을 거치지 않는다는 점이 같습니다.

### `io_uring` — async submission

queue depth 1로 4 KiB씩 읽으면 io_uring이 `pread`보다 빠를까요? page cache에 올린 같은 512 MiB 파일로 쟀습니다.

```c
/* 4 KiB reads of a cached file, queue depth 1: pread vs io_uring read vs read_fixed */
#include <fcntl.h>
#include <liburing.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/uio.h>
#include <time.h>
#include <unistd.h>

#define BS 4096
static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec + t.tv_nsec / 1e9; }

int main(int argc, char **argv)
{
    int fd = open(argv[1], O_RDONLY);
    struct stat st; fstat(fd, &st);
    long n = st.st_size / BS;
    static char buf[BS] __attribute__((aligned(4096)));
    struct io_uring ring;

    int ret = io_uring_queue_init(8, &ring, 0);
    if (ret < 0) { printf("io_uring_queue_init: %s\n", strerror(-ret)); return 1; }

    double t0 = now();
    for (long i = 0; i < n; i++) pread(fd, buf, BS, i * BS);
    double t_pread = now() - t0;

    t0 = now();
    for (long i = 0; i < n; i++) {
        struct io_uring_sqe *sqe = io_uring_get_sqe(&ring);
        io_uring_prep_read(sqe, fd, buf, BS, i * BS);
        io_uring_submit(&ring);
        struct io_uring_cqe *cqe;
        io_uring_wait_cqe(&ring, &cqe);
        if (cqe->res != BS) { printf("short read %d\n", cqe->res); return 1; }
        io_uring_cqe_seen(&ring, cqe);
    }
    double t_uring = now() - t0;

    struct iovec iov = { .iov_base = buf, .iov_len = BS };
    io_uring_register_buffers(&ring, &iov, 1);
    t0 = now();
    for (long i = 0; i < n; i++) {
        struct io_uring_sqe *sqe = io_uring_get_sqe(&ring);
        io_uring_prep_read_fixed(sqe, fd, buf, BS, i * BS, 0);
        io_uring_submit(&ring);
        struct io_uring_cqe *cqe;
        io_uring_wait_cqe(&ring, &cqe);
        if (cqe->res != BS) { printf("short read %d\n", cqe->res); return 1; }
        io_uring_cqe_seen(&ring, cqe);
    }
    double t_fixed = now() - t0;

    printf("%ld reads of 4 KiB: pread %.0f ns, io_uring read %.0f ns, read_fixed %.0f ns per read\n",
           n, t_pread / n * 1e9, t_uring / n * 1e9, t_fixed / n * 1e9);
    io_uring_queue_exit(&ring);
    return 0;
}
```

```text
131072 reads of 4 KiB: pread 615 ns, io_uring read 690 ns, read_fixed 722 ns per read
131072 reads of 4 KiB: pread 583 ns, io_uring read 707 ns, read_fixed 707 ns per read
131072 reads of 4 KiB: pread 540 ns, io_uring read 630 ns, read_fixed 651 ns per read
```

다시 돌린 실행에서 `kernel.io_uring_disabled`를 2로 바꿔 같은 프로그램을 돌리고 0으로 되돌린 출력입니다.

```text
kernel.io_uring_disabled = 2
io_uring_queue_init: Operation not permitted
kernel.io_uring_disabled = 0
```

세 번 모두 `pread`가 가장 빨랐습니다(540~615 ns 대 630~722 ns). 다시 돌린 실행에서도 383 ns 대 482·511 ns로 순서가 같았습니다. 한 번에 요청 하나를 넣고 끝나기를 기다리면 io_uring은 syscall 수를 줄이지 못하고, SQE를 채우고 CQE를 거두는 일만 더해집니다. 등록 buffer(`read_fixed`)도 cache에 있는 4 KiB 읽기에서는 차이가 없었습니다. io_uring의 이점은 요청을 여러 개 쌓아 한 번에 제출하거나, 완료를 기다리는 동안 다른 일을 할 때 생깁니다. 그러니 "io_uring = 빠름"으로 가정하지 말고 대상 workload의 queue depth로 재 봅니다.

두 번째 출력의 가운데 줄이 `sysctl -w kernel.io_uring_disabled=2` 상태에서 실행한 결과입니다. v6.12 `Documentation/admin-guide/sysctl/kernel.rst`의 `io_uring_disabled` 항목대로 "io_uring_setup() always fails with -EPERM"이라 `io_uring_queue_init`이 `Operation not permitted`로 실패했습니다. 보안 정책으로 이 값을 1이나 2로 두는 배포판·컨테이너가 있으면 io_uring 경로는 아예 열리지 않으므로, 실패 시 일반 `read`로 돌아가는 경로를 둡니다.

### DMA-BUF로 driver 간 공유 (kernel)

```c
/* exporter, e.g. a camera driver */
DEFINE_DMA_BUF_EXPORT_INFO(exp_info);
exp_info.ops   = &my_dmabuf_ops;
exp_info.size  = size;
exp_info.flags = O_RDWR;
exp_info.priv  = my_buffer;
struct dma_buf *buf = dma_buf_export(&exp_info);
int fd = dma_buf_fd(buf, O_CLOEXEC);

/* importer, e.g. an encoder driver */
struct dma_buf *imported = dma_buf_get(fd);
struct dma_buf_attachment *attach = dma_buf_attach(imported, dev);
struct sg_table *sgt = dma_buf_map_attachment_unlocked(attach, DMA_FROM_DEVICE);
```

함수 이름은 v6.12 `include/linux/dma-buf.h`(549–628행)에 있습니다. 같은 버전의 `dma_buf_map_attachment()`는 첫머리에서 `dma_resv_assert_held(attach->dmabuf->resv)`를 부르므로, reservation lock을 잡지 않은 importer는 `dma_buf_map_attachment_unlocked()`를 씁니다(`drivers/dma-buf/dma-buf.c:1188`). 하나의 dma-buf가 importer마다 다른 scatter-gather 목록으로 mapping되므로, 각 device는 [8-04](/blog/embedded/modern-recipes/part8-04-dma-allocator)에서 본 것처럼 자기 DMA 주소를 받습니다.

### V4L2 카메라에서 DMA-BUF fd 얻기

`VIDIOC_EXPBUF`는 "an extension to the memory mapping I/O method, therefore it is available only for V4L2_MEMORY_MMAP buffers"입니다(v6.12 `vidioc-expbuf.rst`). `V4L2_MEMORY_DMABUF`는 반대로 *밖에서 만든* dma-buf를 받아들이는 모드입니다. 가상 카메라 드라이버 vivid(`modprobe vivid`)로 두 모드를 모두 시험하고, 내보낸 fd를 CPU로 쓸 때의 sync까지 해 봤습니다.

```c
/* VIDIOC_EXPBUF needs MMAP buffers; then the dma-buf fd is CPU-accessed with DMA_BUF_IOCTL_SYNC */
#include <errno.h>
#include <fcntl.h>
#include <linux/dma-buf.h>
#include <linux/videodev2.h>
#include <stdio.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/mman.h>
#include <unistd.h>

static int try(int cam, enum v4l2_memory mem, const char *name)
{
    struct v4l2_requestbuffers req = { .count = 4, .type = V4L2_BUF_TYPE_VIDEO_CAPTURE, .memory = mem };
    if (ioctl(cam, VIDIOC_REQBUFS, &req) < 0) { printf("%s: REQBUFS %s\n", name, strerror(errno)); return -1; }
    struct v4l2_exportbuffer exp = { .type = V4L2_BUF_TYPE_VIDEO_CAPTURE, .index = 0, .flags = O_RDWR | O_CLOEXEC };
    int r = ioctl(cam, VIDIOC_EXPBUF, &exp);
    printf("%s: REQBUFS count=%u, EXPBUF %s", name, req.count, r < 0 ? strerror(errno) : "ok");
    if (r == 0) printf(" fd=%d", exp.fd);
    printf("\n");
    return r < 0 ? -1 : exp.fd;
}

int main(int argc, char **argv)
{
    int cam = open(argv[1], O_RDWR);
    struct v4l2_format f = { .type = V4L2_BUF_TYPE_VIDEO_CAPTURE };
    ioctl(cam, VIDIOC_G_FMT, &f);
    printf("format %ux%u sizeimage %u\n", f.fmt.pix.width, f.fmt.pix.height, f.fmt.pix.sizeimage);

    try(cam, V4L2_MEMORY_DMABUF, "V4L2_MEMORY_DMABUF");
    struct v4l2_requestbuffers zero = { .count = 0, .type = V4L2_BUF_TYPE_VIDEO_CAPTURE, .memory = V4L2_MEMORY_DMABUF };
    ioctl(cam, VIDIOC_REQBUFS, &zero);                          /* free them */
    int dma_fd = try(cam, V4L2_MEMORY_MMAP, "V4L2_MEMORY_MMAP");
    if (dma_fd < 0) return 1;

    unsigned char *p = mmap(NULL, f.fmt.pix.sizeimage, PROT_READ | PROT_WRITE, MAP_SHARED, dma_fd, 0);
    struct dma_buf_sync s = { .flags = DMA_BUF_SYNC_START | DMA_BUF_SYNC_RW };
    printf("SYNC_START %s\n", ioctl(dma_fd, DMA_BUF_IOCTL_SYNC, &s) ? strerror(errno) : "ok");
    memset(p, 0x5a, 16);
    s.flags = DMA_BUF_SYNC_END | DMA_BUF_SYNC_RW;
    printf("SYNC_END   %s\n", ioctl(dma_fd, DMA_BUF_IOCTL_SYNC, &s) ? strerror(errno) : "ok");
    munmap(p, f.fmt.pix.sizeimage);
    close(dma_fd);
    return 0;
}
```

```text
format 640x360 sizeimage 460800
V4L2_MEMORY_DMABUF: REQBUFS count=4, EXPBUF Invalid argument
V4L2_MEMORY_MMAP: REQBUFS count=4, EXPBUF ok fd=4
SYNC_START ok
SYNC_END   ok
```

`V4L2_MEMORY_DMABUF`로 할당한 buffer에서 `VIDIOC_EXPBUF`는 `Invalid argument`였고, `V4L2_MEMORY_MMAP`으로 할당하자 fd를 돌려줬습니다. 그래서 카메라가 내보내는 쪽이라면 `MMAP` + `EXPBUF`, 다른 장치가 만든 buffer를 카메라가 채우게 하려면 `DMABUF` + `VIDIOC_QBUF`에 그 fd를 주는 방식입니다.

CPU가 dma-buf를 `mmap`해 만질 때는 `DMA_BUF_IOCTL_SYNC`로 감쌉니다. v6.12 `include/uapi/linux/dma-buf.h`(26–45행)는 접근 전에 `DMA_BUF_SYNC_START`, 끝나면 같은 방향 flag로 `DMA_BUF_SYNC_END`를 부르라고 하고, 이 ioctl은 "only provides cache coherency"이지 다른 장치의 동시 접근을 막지는 않는다고 적습니다. kernel 안에서는 같은 역할을 `dma_buf_begin_cpu_access()`·`dma_buf_end_cpu_access()`가 합니다.

### DRM/KMS로 카메라 buffer를 화면에

```c
struct drm_prime_handle prime = { .fd = dma_fd_from_camera };
ioctl(drm_fd, DRM_IOCTL_PRIME_FD_TO_HANDLE, &prime);

uint32_t handles[4] = { prime.handle }, pitches[4] = { stride }, offsets[4] = { 0 };
uint32_t fb_id;
drmModeAddFB2(drm_fd, w, h, DRM_FORMAT_YUYV, handles, pitches, offsets, &fb_id, 0);
drmModeSetCrtc(drm_fd, crtc_id, fb_id, 0, 0, &conn_id, 1, &mode);
```

`DRM_IOCTL_PRIME_FD_TO_HANDLE`는 v6.12 `include/uapi/drm/drm.h:1136`에서 "Convert a DMA-BUF FD to a GEM handle"로 정의되고, `drmModeAddFB2`의 인자 순서는 libdrm 2.4.124 `xf86drmMode.h:300-303`입니다. 디스플레이 엔진이 그 포맷과 stride를 scan-out할 수 있어야 하며, 이 게스트에는 KMS 장치가 없어 이 절은 실행하지 않았습니다.

### `mmap`과 POSIX shared memory

```c
/* the child writes, the parent reads: MAP_SHARED vs MAP_PRIVATE on a POSIX shm object */
#include <fcntl.h>
#include <stdio.h>
#include <sys/mman.h>
#include <sys/wait.h>
#include <unistd.h>

static void demo(int flags, const char *name)
{
    int fd = shm_open("/mybuf", O_RDWR | O_CREAT, 0600);
    ftruncate(fd, 4096);
    volatile int *p = mmap(NULL, 4096, PROT_READ | PROT_WRITE, flags, fd, 0);
    *p = 1;
    if (fork() == 0) { *p = 2; _exit(0); }
    wait(NULL);
    int again = *(volatile int *)mmap(NULL, 4096, PROT_READ, MAP_SHARED, fd, 0);
    printf("%-11s parent sees %d, shm object holds %d\n", name, *p, again);
    shm_unlink("/mybuf");
    close(fd);
}

int main(void)
{
    demo(MAP_SHARED, "MAP_SHARED");
    demo(MAP_PRIVATE, "MAP_PRIVATE");
    return 0;
}
```

```text
MAP_SHARED  parent sees 2, shm object holds 2
MAP_PRIVATE parent sees 1, shm object holds 0
```

`MAP_SHARED`에서는 자식이 쓴 2를 부모와 shm 객체가 모두 봤습니다. `MAP_PRIVATE`에서는 부모가 쓴 1과 자식이 쓴 2가 각자의 copy-on-write 사본에만 남아, shm 객체는 처음 값 0 그대로였습니다. 두 process가 buffer를 공유하려면 `MAP_SHARED`여야 하고, `fork` 뒤에도 같은 규칙입니다.

### XDP로 NIC 단에서 packet 처리

```c
SEC("xdp")
int xdp_filter(struct xdp_md *ctx)
{
    void *data = (void *)(long)ctx->data;
    void *end  = (void *)(long)ctx->data_end;

    if (drop_condition(data, end)) return XDP_DROP;
    return XDP_PASS;
}
```

eBPF 프로그램이 driver의 수신 경로에서 packet마다 결정합니다. 다만 driver가 XDP를 지원하지 않으면 generic 모드로 붙고, v6.12 `Documentation/networking/af_xdp.rst`는 이 XDP_SKB 모드가 "uses SKBs together with the generic XDP support"라고 적습니다. 그 경우에는 skb를 만든 뒤에 판정하므로, drop 비용을 줄이려면 driver 모드(`XDP_FLAGS_DRV_MODE`, `include/uapi/linux/if_link.h:1856`)로 붙었는지 확인합니다. AF_XDP로 user space까지 올릴 때도 같은 문서는 driver 모드에서 "there is still a copy of the data into user space"라고 적습니다. 이 절은 실행하지 않았습니다.

### DPDK userspace driver

```c
struct rte_mbuf *pkts[32];
uint16_t n = rte_eth_rx_burst(port, 0, pkts, 32);
for (uint16_t i = 0; i < n; i++) {
    process_packet(rte_pktmbuf_mtod(pkts[i], void *), rte_pktmbuf_data_len(pkts[i]));
    rte_pktmbuf_free(pkts[i]);
}
```

`rte_mbuf`에는 `data` 필드가 없고, packet 데이터 포인터는 `rte_pktmbuf_mtod()`로 얻습니다(DPDK v23.11 `rte_mbuf_core.h:743`). `rte_eth_rx_burst(port_id, queue_id, rx_pkts, nb_pkts)`는 배열로 여러 개를 한 번에 받습니다(`rte_ethdev.h:6045`). 이 절도 실행하지 않았습니다.

## 측정 / 성능 비교

이 글에서 잰 숫자를 모으면 다음과 같습니다. 모두 위 Debian 13 게스트의 값입니다.

| 측정 | 결과 |
| --- | --- |
| 512 MiB file → TCP, 송신 sys | `read`/`write` 0.130 s, `sendfile` 0.022 s, `splice` 0.024 s |
| 같은 전송, wall | 0.130 s, 0.070 s, 0.066 s |
| 4 KiB 읽기, queue depth 1 | `pread` 540~615 ns, io_uring 630~707 ns, `read_fixed` 651~722 ns |
| `kernel.io_uring_disabled=2` | `io_uring_queue_init` → `EPERM` |
| vivid `VIDIOC_EXPBUF` | `V4L2_MEMORY_MMAP`만 성공 |

카메라 → encoder 경로의 실제 CPU·jitter는 encoder와 ISP가 있는 보드에서 재야 하며, 이 글에는 그 측정이 없습니다.

## 자주 보는 함정

> ⚠️ "zero-copy 됐겠지"라는 가정

```c
read(fd, buf, n);
write(sock, buf, n);
```

이 코드는 page cache → `buf`, `buf` → socket buffer로 두 번 복사합니다. 위 측정에서 송신 CPU가 `sendfile`의 5~6배였습니다.

> ⚠️ `VIDIOC_EXPBUF`를 `V4L2_MEMORY_DMABUF` buffer에 부름

위 실행처럼 `EINVAL`입니다. 내보내는 쪽은 `MMAP`으로 할당합니다.

> ⚠️ DMA-BUF를 CPU로 만지면서 sync를 빼먹음

```c
p = mmap(NULL, size, PROT_READ | PROT_WRITE, MAP_SHARED, dma_fd, 0);
memset(p, 0, size);          /* missing DMA_BUF_IOCTL_SYNC start/end */
```

coherency가 없는 장치에서는 CPU가 쓴 값이 cache에만 남거나 오래된 사본을 읽습니다. `DMA_BUF_SYNC_START`·`DMA_BUF_SYNC_END`로 감쌉니다.

> ⚠️ io_uring 기능을 버전 확인 없이 가정

liburing 2.9 `io_uring_enter(2)`는 opcode마다 도입 버전을 적습니다. 예를 들어 `IORING_OP_READ`·`IORING_OP_WRITE`는 "Available since 5.6"입니다. 그보다 오래된 커널을 지원해야 한다면 `io_uring_get_probe()`로 opcode 지원을 확인하고, `kernel.io_uring_disabled` 때문에 초기화가 `EPERM`으로 실패하는 경우도 처리합니다.

> ⚠️ Zero-copy send buffer를 완료 전에 재사용

```c
io_uring_prep_send_zc(sqe, sock, buf, len, 0, 0);
io_uring_submit(&ring);
memset(buf, 0, len);   /* the kernel may still be reading buf */
```

`io_uring_enter(2)`의 `IORING_OP_SEND_ZC` 항목은 첫 CQE에 `IORING_CQE_F_MORE`가 오면 두 번째 notification CQE가 오고, "The user must not modify the data buffer until the notification is posted"라고 적습니다. zero-copy일수록 buffer를 돌려받는 시점이 늦어집니다.

## 재현 환경

QEMU 11.1.3 `-M virt -accel hvf -cpu host`, Debian 13 arm64 게스트(`liburing-dev` 2.9, `v4l-utils` 설치)입니다. `xfer.c`·`run-xfer.sh`·`uring.c`·`expbuf.c`·`forkmap.c`는 위에 전문이 있습니다.

```bash
bash run-xfer.sh
gcc -O2 -Wall -o uring uring.c -luring && ./uring big.bin
sudo sysctl -w kernel.io_uring_disabled=2 && ./uring big.bin; sudo sysctl -w kernel.io_uring_disabled=0
sudo modprobe vivid && gcc -O2 -Wall -o expbuf expbuf.c && ./expbuf /dev/video0
gcc -O2 -Wall -o forkmap forkmap.c && ./forkmap
```

## 정리

- Zero-copy는 buffer 공유, kernel 안 전송, kernel 경계 비용 줄이기 세 갈래입니다.
- 512 MiB file → socket에서 `sendfile`·`splice`는 송신 CPU를 `read`/`write`의 5~6분의 1로 줄였지만, wall time은 받는 쪽 복사 때문에 1.9~2.4배만 줄었습니다.
- queue depth 1의 4 KiB 읽기에서 io_uring은 `pread`보다 느렸습니다. 이점은 요청을 쌓을 때 나옵니다.
- `VIDIOC_EXPBUF`는 `V4L2_MEMORY_MMAP` buffer만 내보냅니다.
- CPU가 dma-buf를 만질 때는 `DMA_BUF_IOCTL_SYNC`(kernel에서는 `begin/end_cpu_access`)로 감쌉니다.
- `MAP_PRIVATE` mapping은 `fork` 뒤에도 공유되지 않습니다.
- XDP generic 모드는 skb를 만든 뒤 판정하고, AF_XDP driver 모드도 user space로 한 번 복사합니다.

다음 편은 **NUMA 메모리 토폴로지**입니다.

## 관련 항목

- [8-04: DMA Allocator](/blog/embedded/modern-recipes/part8-04-dma-allocator)
- [8-06: NUMA Memory Topology](/blog/embedded/modern-recipes/part8-06-numa)
- [12-10: Zero-Copy Camera Pipeline](/blog/embedded/modern-recipes/part12-10-zero-copy-camera)
- [PE 3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
- [RTOS 3-11: Stream Buffer](/blog/embedded/rtos/practical-internals/part3-11-stream-message-buffer)
