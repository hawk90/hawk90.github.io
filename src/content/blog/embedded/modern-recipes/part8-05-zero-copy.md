---
title: "Zero-Copy Pipeline — DMA-BUF·sendfile·io_uring·splice"
slug: "embedded/modern-recipes/part8-05-zero-copy"
date: 2026-04-17T09:04:00
description: "DMA-BUF·V4L2의 버퍼 수명과 sendfile·splice·io_uring의 복사·완료·오류 처리 계약을 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 93
tags: [recipes, zero-copy, dma-buf, sendfile, io_uring, splice]
topics: ["embedded"]
---

## 한 줄 요약

> **Zero-copy는 어느 경계의 복사를 줄였는지와 buffer를 언제 다시 써도 되는지를 함께 설명해야 합니다.** fd를 넘겼거나 비동기 API를 썼다는 사실만으로 복사가 모두 사라지지는 않습니다.

## 어떤 상황에서 쓰나

카메라 frame을 encoder에 넘기고 다시 socket으로 보낼 때, 각 단계가 같은 저장소를 빌릴 수 있다면 일부 CPU 복사를 줄일 수 있습니다. 하지만 raw frame과 압축 bitstream은 다른 데이터이며 encoder output까지 입력과 같은 buffer인 것은 아닙니다. format·stride·modifier 변환과 장치별 mapping이 추가될 수도 있습니다.

공유 buffer는 같은 서류를 여러 부서가 돌려 보는 방식입니다. 서류를 복제하지 않는 대신 누가 수정 중이고 언제 돌려받는지 표시해야 합니다. fd는 보관함 열쇠이지 작업 완료 통지서가 아닙니다. 비동기 큐에 주문을 넣었다는 접수증도 실제 배송 완료와 구분합니다.

이 글은 Linux에서 buffer 공유와 파일 전송의 **오류·짧은 전송·완료·해제 계약**을 다룹니다. 실제 camera/GPU/encoder 장치가 없는 검증을 그 장치들의 end-to-end zero-copy 성공으로 표시하지 않습니다.

## 서로 다른 세 경계 구분하기

| 방식 | 줄이려는 경계 | 그대로 남는 일 |
|---|---|---|
| DMA-BUF·shared mmap | 주체 사이 payload 복사 | format 협상·mapping·cache/fence·소유권 |
| sendfile·splice | 파일/FD 전송 중 userspace 왕복 | kernel 내부 처리·backpressure·부분 전송 |
| io_uring | 제출·완료 처리 비용과 일부 등록 비용 | kernel I/O·buffer 접근·opcode별 복사 |
| XDP·AF_XDP·DPDK | packet 경로 또는 userspace/kernel 경계 | mode·driver·queue·DMA 등록·buffer 반납 |

io_uring은 kernel 우회 API가 아닙니다. 일반 `io_uring_prep_read`는 지정한 userspace buffer에 읽고, XDP 자체는 kernel/driver 등의 hook에서 실행됩니다. AF_XDP의 zero-copy mode와 DPDK의 userspace driver 경로도 같은 이름의 기능이 아닙니다.

## Camera 공유: export와 import 경로 구분하기

V4L2 driver가 buffer를 **할당하고 export**한다면 MMAP memory 방식으로 REQBUFS한 뒤 EXPBUF로 fd를 얻습니다. 다른 allocator에서 받은 fd를 V4L2가 **import**하려면 DMABUF memory 방식과 QBUF의 plane fd를 사용합니다. DMABUF로 요청한 buffer를 같은 흐름에서 EXPBUF하는 예제로 섞지 않습니다.

다음 helper는 format이 이미 설정된 multi-planar capture queue를 전제로 합니다. 실제 buffer 수와 plane 수는 driver 응답으로 처리합니다.

```c title="v4l2-export.c"
#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include <time.h>
#include <errno.h>
#include <fcntl.h>
#include <sys/ioctl.h>
#include <linux/videodev2.h>

static int camera_ioctl(int fd, unsigned long request, void *arg)
{
    int ret;
    do { ret = ioctl(fd, request, arg); } while (ret < 0 && errno == EINTR);
    return ret < 0 ? -errno : 0;
}
int request_mmap_capture_buffers(int fd, unsigned int wanted, unsigned int *actual)
{
    struct v4l2_requestbuffers req = {
        .count = wanted, .type = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE,
        .memory = V4L2_MEMORY_MMAP,
    };
    int ret;
    if (!wanted || !actual) return -EINVAL;
    ret = camera_ioctl(fd, VIDIOC_REQBUFS, &req);
    if (ret) return ret;
    if (!req.count) return -ENOMEM;
    *actual = req.count;
    return 0;
}
int export_capture_plane(int fd, unsigned int index, unsigned int plane, int *out_fd)
{
    struct v4l2_exportbuffer exp = {
        .type = V4L2_BUF_TYPE_VIDEO_CAPTURE_MPLANE,
        .index = index, .plane = plane, .flags = O_CLOEXEC | O_RDWR,
    };
    int ret;
    if (!out_fd || *out_fd != -1) return -EINVAL;
    ret = camera_ioctl(fd, VIDIOC_EXPBUF, &exp);
    if (ret) return ret;
    *out_fd = exp.fd;
    return 0;
}
```

실제 capture에는 QUERYBUF·plane 정보·QBUF·STREAMON·DQBUF가 더 필요합니다. 위 코드는 그 전체 driver를 대신하지 않습니다. 여러 plane에 서로 다른 fd가 있을 수 있으므로 plane 0의 fd만으로 frame 전체를 전달했다고 가정하지 않습니다. 종료 때는 queue를 멈추고 consumer의 사용이 끝난 뒤 export fd를 close하며, buffer 해제 시 driver의 orphaned-buffer 지원 여부도 확인합니다.

### 같은 frame을 encoder에 넘기는 수명

다음은 동작 순서의 계약입니다. 호출 이름 하나로 전체 pipeline이 구현되었다고 표현하지 않습니다.

| 단계 | 넘기는 내용 | 재사용 조건 |
|---|---|---|
| capture 완료 | DQBUF된 frame과 plane별 fd·offset·stride·format | capture 완료가 실제로 확인되어야 합니다. |
| encoder input 제출 | 호환되는 raw frame과 buffer 참조 | encoder가 입력을 더 이상 읽지 않을 때까지 camera에 재queue하지 않습니다. |
| encoder output 완료 | 별도 압축 bitstream buffer·유효 길이 | 소비자가 bitstream을 다 쓸 때까지 유지합니다. |
| network 제출·완료 | 해당 socket API가 지원하는 저장소 | API별 송신 buffer 재사용 통지를 기다립니다. |
| 종료·취소 | 새 제출 중단·모든 실행 중 접근 종료 | fd를 닫는 것만으로 다른 장치의 작업 취소가 끝났다고 보지 않습니다. |

DRM PRIME import는 fd를 GEM handle로 연결하는 단계입니다. scanout에는 plane별 handle·pitch·offset·format/modifier와 fencing이 맞아야 하며, fd close와 GEM handle 해제의 수명도 구분합니다. GPU 변환이 필요하면 같은 frame을 그대로 scanout하는 경로와 다릅니다. 자세한 camera/DRM 구성은 [12-10](/blog/embedded/modern-recipes/part12-10-zero-copy-camera)으로 이어집니다.

## DMA-BUF importer의 오류 정리

Linux 6.12 계열에서 encoder처럼 공유 메모리를 **읽는 장치**는 DMA_TO_DEVICE 방향을 사용합니다. 아래는 dma-buf 참조·attachment·장치 mapping을 하나의 수명으로 관리하는 helper입니다. out은 0 초기화되며 호출은 직렬화되어야 합니다.

```c title="frame-import.h"
#ifndef FRAME_IMPORT_H
#define FRAME_IMPORT_H
#include <linux/dma-buf.h>
#include <linux/err.h>
#include <linux/errno.h>

struct frame_import {
    struct dma_buf *buffer;
    struct dma_buf_attachment *attachment;
    struct sg_table *table;
};
static inline int frame_import_begin(int fd, struct device *dev,
                                      struct frame_import *out)
{
    struct dma_buf *buffer;
    struct dma_buf_attachment *attachment;
    struct sg_table *table;
    int ret;
    if (!dev || !out) return -EINVAL;
    if (out->buffer || out->attachment || out->table) return -EBUSY;
    buffer = dma_buf_get(fd);
    if (IS_ERR(buffer)) return PTR_ERR(buffer);
    attachment = dma_buf_attach(buffer, dev);
    if (IS_ERR(attachment)) { ret = PTR_ERR(attachment); goto put_buffer; }
    table = dma_buf_map_attachment_unlocked(attachment, DMA_TO_DEVICE);
    if (IS_ERR(table)) { ret = PTR_ERR(table); goto detach_buffer; }
    *out = (struct frame_import){ buffer, attachment, table };
    return 0;
detach_buffer:
    dma_buf_detach(buffer, attachment);
put_buffer:
    dma_buf_put(buffer);
    return ret;
}
static inline void frame_import_end(struct frame_import *frame)
{
    if (!frame || !frame->buffer) return;
    dma_buf_unmap_attachment_unlocked(frame->attachment, frame->table, DMA_TO_DEVICE);
    dma_buf_detach(frame->buffer, frame->attachment);
    dma_buf_put(frame->buffer);
    *frame = (struct frame_import){ 0 };
}
#endif
```

`_unlocked` wrapper는 reservation lock을 내부에서 다루는 API입니다. lock을 직접 관리하는 map API와 혼동하지 않습니다. 실제 exporter의 이동·pinning·fence 계약과 장치가 mapping을 쓰는 전체 구간도 따릅니다. 위 helper는 implicit/explicit fence를 기다리거나 장치 명령을 취소하는 구현이 아니며, `frame_import_end`는 consumer의 접근이 완전히 끝난 뒤 호출합니다.

CPU가 mmap한 dma-buf를 읽는 경우에는 필요한 device 완료/fence를 기다린 뒤 `DMA_BUF_IOCTL_SYNC`의 START|READ와 END|READ로 CPU 접근 구간을 감쌉니다. write도 실제 접근 방향에 맞춥니다. sync ioctl은 일반적인 상호 배제나 모든 장치 작업의 완료를 대신하지 않습니다. 일부 ioctl의 EINTR/EAGAIN 재시도 계약도 처리합니다.

## Sendfile: 진행 상태를 보존하며 전송하기

한 번의 sendfile은 요청보다 적게 보낼 수 있습니다. 아래 helper는 현재 offset과 남은 길이를 보관하며 EINTR을 재시도하고 nonblocking socket의 EAGAIN에서 호출자에게 제어를 돌려줍니다. 파일 내용은 전송 동안 유지되어야 합니다.

두 전송 함수가 공유하는 상태와 선언은 별도 header에 둡니다.

```c title="file-transfer.h"
#ifndef FILE_TRANSFER_H
#define FILE_TRANSFER_H
#include <stddef.h>
#include <sys/types.h>
struct file_transfer { off_t offset; size_t left; };
int sendfile_progress(int out_fd, int in_fd, struct file_transfer *state);
int splice_progress(int out_fd, int in_fd, struct file_transfer *state);
#endif
```

다음은 sendfile의 부분 전송을 처리하는 구현입니다.

```c title="sendfile-transfer.c"
#include <errno.h>
#include <stddef.h>
#include <sys/types.h>
#include <sys/sendfile.h>
#include "file-transfer.h"
/* 0: 완료, 1: writable 대기 후 재호출, 음수: -errno */
int sendfile_progress(int out_fd, int in_fd, struct file_transfer *state)
{
    if (!state || state->offset < 0) return -EINVAL;
    while (state->left) {
        size_t chunk = state->left < 0x7ffff000U ? state->left : 0x7ffff000U;
        ssize_t n = sendfile(out_fd, in_fd, &state->offset, chunk);
        if (n > 0) { state->left -= (size_t)n; continue; }
        if (n == 0) return -ENODATA;
        if (errno == EINTR) continue;
        if (errno == EAGAIN || errno == EWOULDBLOCK) return 1;
        return -errno;
    }
    return 0;
}
```

EAGAIN은 완료가 아니라 대기 상태입니다. event loop가 writable을 확인한 뒤 같은 state로 재개합니다. 중간 오류 전에 전송한 byte는 되돌릴 수 없으므로 상위 protocol은 부분 진행을 고려해야 합니다. SIGPIPE/EPIPE 정책도 호출자가 정하며, 수신 peer가 데이터를 실제 처리했다는 보장과 local 전송 진행은 구분합니다.

socket/pipe 경로가 원본 page를 참조한다면 함수가 돌아온 뒤에도 수신 측이 그 영역을 소비할 때까지 전송 영역을 수정하지 않습니다. 원본 fd를 닫는 것과 원본 내용을 덮어쓰는 것은 다른 동작입니다.

sendfile은 userspace payload buffer를 거치지 않는 경로를 제공합니다. kernel·filesystem·socket·TLS 처리에 따라 내부 복사와 실제 경로는 다를 수 있으므로 항상 0 copy 또는 throughput 2~3배라고 단정하지 않습니다.

## Splice: file → pipe → socket을 끝까지 처리하기

아래 예제는 같은 state 구조체와 함께 사용합니다. pipe에 넣은 byte를 socket으로 모두 빼며 짧은 splice와 EINTR을 처리합니다. 원본 파일은 변경되지 않아야 합니다.

```c title="splice-transfer.c"
#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include <errno.h>
#include <fcntl.h>
#include <stddef.h>
#include <unistd.h>
#include "file-transfer.h"

int splice_progress(int out_fd, int in_fd, struct file_transfer *state)
{
    int pipe_fd[2], result = 0;
    if (!state || state->offset < 0) return -EINVAL;
    if (!state->left) return 0;
    if (pipe2(pipe_fd, O_CLOEXEC) < 0) return -errno;
    while (state->left) {
        off_t read_offset = state->offset;
        size_t want = state->left < 65536 ? state->left : 65536;
        ssize_t staged;
        do { staged = splice(in_fd, &read_offset, pipe_fd[1], NULL, want, 0); }
        while (staged < 0 && errno == EINTR);
        if (staged <= 0) { result = staged == 0 ? -ENODATA : -errno; break; }
        size_t pending = (size_t)staged;
        while (pending) {
            ssize_t n = splice(pipe_fd[0], NULL, out_fd, NULL, pending, 0);
            if (n < 0 && errno == EINTR) continue;
            if (n <= 0) { result = n == 0 ? -EIO : -errno; goto done; }
            pending -= (size_t)n;
            state->left -= (size_t)n;
            state->offset += n;
        }
    }
done:
    close(pipe_fd[0]);
    close(pipe_fd[1]);
    return result;
}
```

source를 읽는 별도 offset과 실제 송신된 state를 분리했습니다. 중간에 실패하여 pipe에 남은 byte를 폐기해도 state는 socket에 전송된 지점까지만 진행합니다. 재개하려면 원본이 같은 내용으로 남아 있어야 하고 상위 protocol도 그 재개를 허용해야 합니다. blocking FD를 전제로 하며 nonblocking FD에서 -EAGAIN이 나오면 외부에서 대기 후 재호출합니다. busy loop로 다시 호출하지 않습니다.

`SPLICE_F_MOVE`는 전송 전체가 항상 page 이동이라는 보장이 아닙니다. `tee`로 pipe 참조를 복제해도 느린 consumer의 backpressure와 buffer 보유량은 남습니다. 이 예제의 성공은 파일 내용 전달을 검증하는 것이며 실제 NIC DMA나 wire의 zero-copy 증명은 아닙니다.

## io_uring: CQE와 buffer 재사용을 분리해서 보기

`io_uring_queue_init`·buffer 등록·SQE 획득·submit·wait의 반환값을 각각 처리합니다. liburing 함수의 음수 반환값과 CQE의 `res < 0`은 별도의 오류 경로이며, cqe->res를 먼저 size_t로 cast하면 오류가 큰 길이로 바뀝니다. 아래 helper는 단일 read CQE를 소비하는 부분만 보여 줍니다.

```c title="uring-read-result.h"
#ifndef URING_READ_RESULT_H
#define URING_READ_RESULT_H
#include <errno.h>
#include <sys/types.h>
#include <liburing.h>

static inline int consume_read_result(struct io_uring *ring,
                                      struct io_uring_cqe *cqe,
                                      size_t requested, ssize_t *bytes)
{
    int result;
    if (!ring || !cqe || !bytes) return -EINVAL;
    result = cqe->res;
    io_uring_cqe_seen(ring, cqe);
    if (result < 0) return result;
    if ((size_t)result > requested) return -EIO;
    *bytes = result;
    return 0;
}
#endif
```

단일 read에서는 CQE 처리 뒤 반환 byte 수만 유효하며 0은 EOF, 짧은 read도 성공일 수 있습니다. 다만 다른 요청이 같은 buffer를 쓰는지 확인하고 ring과 buffer의 수명을 유지해야 합니다. submit 실패·wait 중단·cancel 요청도 실제 실행 중 요청이 끝났는지 확인한 뒤 정리합니다. SQE를 준비하거나 submit한 직후 buffer를 수정하지 않습니다.

fixed buffer 등록은 반복되는 메모리 pinning·등록 비용을 줄이기 위한 기능이지 일반 read/write의 payload 복사를 모두 없애는 기능이 아닙니다. SEND_ZC 같은 별도 opcode는 데이터 전송 CQE와 buffer 재사용 notification을 구분해야 하므로 “CQE 하나를 받으면 모든 zero-copy buffer를 재사용”하는 규칙으로 일반화하지 않습니다. feature probing·권한·FD 종류·opcode 지원을 확인하며 liburing이 임의의 일반 I/O fallback을 자동 제공한다고 가정하지 않습니다.

## Mmap·shared memory·packet 경로의 경계

mmap의 반환값은 NULL이 아니라 MAP_FAILED로 실패를 판정합니다. file 크기 0·범위 밖 접근·동시 truncate에 의한 SIGBUS, munmap 이후 참조도 처리해야 합니다. MAP_SHARED는 payload 공유이지 producer/consumer의 준비·완료 통지가 아니며, MAP_PRIVATE는 변경을 상대 프로세스에 전달하는 IPC가 아닙니다.

POSIX shm은 shm_open 실패·크기 설정·mmap 실패를 정리하고 fd close와 shm_unlink의 이름/객체 수명을 구분합니다. 공유 서류를 같은 곳에 두는 것만으로 누가 쓸 차례인지 정해지지 않듯, 별도 process-shared 동기화와 shutdown protocol이 필요합니다.

XDP는 실행 mode에 따라 경로가 다르며 일반 XDP 프로그램이 NIC을 userspace에 연결하는 것은 아닙니다. packet parsing에는 data_end 경계 검사가 필요합니다. AF_XDP의 copy/zero-copy mode, DPDK의 PMD·mempool·DMA 주소 등록은 각각 확인합니다. DPDK mbuf에서 payload를 얻는 `rte_pktmbuf_mtod`도 첫 segment 접근이며, chained packet 전체가 하나의 연속 배열이라고 가정하지 않습니다.

## 보드 없이 확인할 내용

| 검사 | 확인할 계약 | 증명하지 않는 것 |
|---|---|---|
| V4L2 helper | MMAP 요청·plane export 인자·오류/FD 수명 | 실제 camera format·capture·encoder 연결 |
| importer | get/attach/map 실패 정리·TO_DEVICE 방향·역순 해제 | exporter별 fence·실제 장치 접근 종료 |
| sendfile/splice | 실제 Linux FD 전송·부분 진행·EOF·EINTR/EAGAIN·오류 | NIC DMA·내부 복사 수·성능 배수 |
| io_uring | 실제 SQE/CQE·음수 결과·짧은 read·buffer 수명 | 모든 opcode의 zero-copy·자동 fallback |
| mmap/shm | 공유·정리·실패와 동기화 계약 | 완성된 IPC protocol |

빈 성능 표와 실측하지 않은 개선 배수 대신, 전송 byte·offset·남은 길이·참조와 FD 정리를 먼저 검증합니다. 제품 성능은 kernel·filesystem·driver·format·buffer 수·동시 부하·암호화 여부와 분포를 기록해서 비교합니다.

### 이번 예제 검증 결과

QEMU ARM64의 실제 Linux 6.12.116 환경에서 sendfile과 file→pipe→socket splice로 각각 131101 byte의 내용·offset·잔여 길이를 대조했습니다. 요청보다 파일이 23 byte 짧은 경우의 EOF와 진행 상태, 잘못된 FD, 주입한 EINTR/EAGAIN·짧은 전송·pipe 정리도 확인했습니다. liburing 2.9의 실제 registered read에서는 64-byte 요청에 대한 5-byte CQE와 잘못된 FD의 음수 CQE를 처리했습니다.

V4L2 경로는 실제 vivid 가상 video driver에서 검사하며, 물리 camera·GPU·encoder는 사용하지 않습니다. MMAP capture queue·plane export·mmap·CPU sync·해제 흐름과 잘못된 plane 거부를 확인했습니다. 이 결과는 실제 camera→encoder→network 전체의 무복사·성능 보장이 아닙니다.

## 정리

- buffer 공유·kernel 내 FD 전송·비동기 제출·packet 경로를 구분합니다.
- V4L2 MMAP export와 DMABUF import를 같은 초기화 흐름으로 섞지 않습니다.
- raw frame, encoder input 완료, 별도 bitstream과 network 완료를 구분합니다.
- DMA-BUF 참조·attachment·mapping은 오류와 종료 경로에서 역순으로 정리합니다.
- sendfile/splice는 부분 전송·대기·EOF를 처리하고 재개할 진행 상태를 보존합니다.
- io_uring read CQE와 zero-copy 송신 notification은 buffer 재사용 계약이 다릅니다.

다음 편은 **NUMA 메모리 토폴로지**입니다. 같은 buffer를 쓰더라도 CPU와 메모리의 위치가 다른 문제를 다룹니다.

## 관련 항목

- [8-04: DMA Allocator](/blog/embedded/modern-recipes/part8-04-dma-allocator)
- [8-06: NUMA Memory Topology](/blog/embedded/modern-recipes/part8-06-numa)
- [12-10: Zero-Copy Camera](/blog/embedded/modern-recipes/part12-10-zero-copy-camera)
- [PE 3-03: DMA Performance](/blog/embedded/performance-engineering/part3-03-dma-performance)
- [RTOS: Stream/Message Buffer](/blog/embedded/rtos/practical-internals/part3-11-stream-message-buffer)

## 1차 자료

- [Linux 6.12 DMA-BUF](https://docs.kernel.org/6.12/driver-api/dma-buf.html), [pixel buffer exchange](https://docs.kernel.org/6.12/userspace-api/dma-buf-alloc-exchange.html): 참조·mapping·CPU 접근·format/fence 계약입니다.
- [V4L2 EXPBUF](https://www.kernel.org/doc/html/v6.12/userspace-api/media/v4l/vidioc-expbuf.html), [DMABUF import](https://www.kernel.org/doc/html/v6.12/userspace-api/media/v4l/dmabuf.html): export/import 경로를 구분합니다.
- [sendfile(2)](https://man7.org/linux/man-pages/man2/sendfile.2.html), [splice(2)](https://man7.org/linux/man-pages/man2/splice.2.html): 부분 전송·offset·오류와 원본 수명 계약입니다.
- [liburing](https://github.com/axboe/liburing), [io_uring_enter(2)](https://man7.org/linux/man-pages/man2/io_uring_enter.2.html): CQE 결과와 zero-copy notification의 기준입니다.
