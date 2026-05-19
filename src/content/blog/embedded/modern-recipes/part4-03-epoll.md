---
title: "4-03: epoll·io_uring — Userspace ↔ Kernel Async I/O"
date: 2026-05-20T16:00:00
description: "epoll level/edge trigger. io_uring SQ/CQ. signalfd/eventfd. Multi-fd polling 패턴."
series: "Modern Embedded Recipes"
seriesOrder: 21
tags: [recipes, epoll, io_uring, signalfd, eventfd]
draft: true
---

## 한 줄 요약

> **"epoll = scalable multi-fd polling"** — 1000+ fd에서도 O(1).

## select·poll·epoll 진화

```text
select() — fd_set, max 1024, O(N) on call
poll()   — pollfd[] array, no limit, O(N) on call
epoll()  — kernel maintained set, O(N events)
io_uring — submission/completion queue, batched async
```

epoll = Linux 표준 high-perf I/O.

## epoll 기본

```c
#include <sys/epoll.h>

int ep = epoll_create1(EPOLL_CLOEXEC);

struct epoll_event ev = {
    .events = EPOLLIN | EPOLLET,   /* edge trigger */
    .data.fd = fd,
};
epoll_ctl(ep, EPOLL_CTL_ADD, fd, &ev);

struct epoll_event events[64];
while (1) {
    int n = epoll_wait(ep, events, 64, -1);
    for (int i = 0; i < n; i++) {
        int rfd = events[i].data.fd;
        handle(rfd);
    }
}
close(ep);
```

`epoll_wait` 한 번에 *여러 fd ready 반환*. O(activity).

## Level vs Edge Trigger

```text
Level-triggered (LT, default):
  fd가 *readable인 동안* 계속 epoll_wait 반환
  → buffer 일부 read 후 다음 wait도 즉시 반환
  
Edge-triggered (ET):
  fd 상태가 *변경된 순간*만 반환
  → readable 신호 한 번
  → drain까지 read 안 하면 신호 *놓침*
```

ET — performance 우수, 그러나 *모든 data read* 보장 필요. EAGAIN까지 loop.

## ET 패턴 — 완전 drain

```c
ev.events = EPOLLIN | EPOLLET | EPOLLRDHUP;

/* Handler */
while (1) {
    ssize_t n = read(fd, buf, sizeof(buf));
    if (n < 0) {
        if (errno == EAGAIN || errno == EWOULDBLOCK) break;   /* drained */
        /* error */
        break;
    }
    if (n == 0) break;   /* eof */
    process(buf, n);
}
```

EAGAIN = drain 완료. ET 표준 패턴.

## eventfd — User-User Signal

```c
int efd = eventfd(0, EFD_NONBLOCK | EFD_CLOEXEC);

/* Producer */
uint64_t v = 1;
write(efd, &v, 8);

/* Consumer — epoll로 wait */
ev.events = EPOLLIN;
ev.data.fd = efd;
epoll_ctl(ep, EPOLL_CTL_ADD, efd, &ev);

uint64_t count;
read(efd, &count, 8);
```

Thread간 또는 process간 signal. *kqueue·Windows event* 같은 역할.

## signalfd — Signal as fd

```c
sigset_t mask;
sigemptyset(&mask);
sigaddset(&mask, SIGINT);
sigaddset(&mask, SIGTERM);
sigprocmask(SIG_BLOCK, &mask, NULL);

int sfd = signalfd(-1, &mask, SFD_NONBLOCK | SFD_CLOEXEC);

/* epoll에 등록 */
ev.events = EPOLLIN;
ev.data.fd = sfd;
epoll_ctl(ep, EPOLL_CTL_ADD, sfd, &ev);

/* Read */
struct signalfd_siginfo si;
read(sfd, &si, sizeof(si));
/* si.ssi_signo = SIGINT 등 */
```

Signal handler의 *async-signal-safe* 제약 회피. *file descriptor*로 처리.

## timerfd — Timer as fd

```c
int tfd = timerfd_create(CLOCK_MONOTONIC, TFD_NONBLOCK | TFD_CLOEXEC);

struct itimerspec its = {
    .it_interval = { .tv_sec = 0, .tv_nsec = 100000000 },   /* 100 ms */
    .it_value    = { .tv_sec = 0, .tv_nsec = 100000000 },
};
timerfd_settime(tfd, 0, &its, NULL);

/* epoll wait */
uint64_t expirations;
read(tfd, &expirations, 8);
```

`timer_create`·`setitimer`보다 *epoll loop 친화*.

## io_uring — Modern Async

```c
#include <liburing.h>

struct io_uring ring;
io_uring_queue_init(QUEUE_DEPTH, &ring, 0);

/* Submit — multiple at once */
struct io_uring_sqe *sqe = io_uring_get_sqe(&ring);
io_uring_prep_read(sqe, fd, buf, sizeof(buf), offset);
io_uring_sqe_set_data(sqe, my_context);

io_uring_submit(&ring);

/* Completion */
struct io_uring_cqe *cqe;
io_uring_wait_cqe(&ring, &cqe);
my_context_t *ctx = io_uring_cqe_get_data(cqe);
/* cqe->res = bytes read */
io_uring_cqe_seen(&ring, cqe);
```

Linux 5.1+ — *fully async*. epoll보다 *수 십% throughput*.

## io_uring vs epoll — 비교

```text
epoll:
  + universal, mature
  + simple model
  - syscall per operation
  - blocking read/write
  
io_uring:
  + zero syscall (registered fd/buf)
  + true async (read·write·send·recv 모두)
  + batched submission
  - Linux 5.1+, kernel patch 필요
  - learning curve
```

Modern Linux service — io_uring 채택 증가.

## SQPOLL — Kernel Thread Polling

```c
struct io_uring_params params = {
    .flags = IORING_SETUP_SQPOLL,
    .sq_thread_idle = 1000,   /* 1 sec idle */
};
io_uring_queue_init_params(QUEUE_DEPTH, &ring, &params);
```

Kernel thread가 *SQ를 polling* — user→kernel transition 0. 추가 CPU 사용.

## EPOLLEXCLUSIVE — Thundering Herd 해결

```c
/* 여러 worker thread가 같은 listen fd */
ev.events = EPOLLIN | EPOLLEXCLUSIVE;
epoll_ctl(ep, EPOLL_CTL_ADD, listen_fd, &ev);

/* Accept */
int client = accept4(listen_fd, ...);
```

`EPOLLEXCLUSIVE` — *한 worker만 wake*. Nginx·HAProxy 표준.

## SO_REUSEPORT — Per-Thread Listen

```c
int sock = socket(AF_INET, SOCK_STREAM, 0);
int one = 1;
setsockopt(sock, SOL_SOCKET, SO_REUSEPORT, &one, sizeof(one));
bind(sock, ...);
listen(sock, 128);
```

여러 thread가 *같은 port에 listen* — kernel이 connection을 *각 thread에 분배*.

## 임베디드 Daemon 패턴

```c
int main(void) {
    int ep = epoll_create1(EPOLL_CLOEXEC);
    int sigfd = setup_signalfd();
    int tfd = setup_timerfd();
    int sock = setup_unix_socket();
    
    epoll_add(ep, sigfd, EPOLLIN);
    epoll_add(ep, tfd, EPOLLIN);
    epoll_add(ep, sock, EPOLLIN);
    
    while (running) {
        struct epoll_event ev[16];
        int n = epoll_wait(ep, ev, 16, -1);
        for (int i = 0; i < n; i++) {
            if (ev[i].data.fd == sigfd) handle_signal();
            else if (ev[i].data.fd == tfd) handle_timer();
            else if (ev[i].data.fd == sock) handle_socket();
        }
    }
}
```

systemd service·OpenWrt daemon — *all-in-one event loop*.

## libev·libevent·libuv

```c
/* libuv — Node.js의 event loop */
uv_loop_t *loop = uv_default_loop();
uv_tcp_t server;
uv_tcp_init(loop, &server);
uv_tcp_bind(&server, ...);
uv_listen((uv_stream_t*)&server, 128, on_new_connection);
uv_run(loop, UV_RUN_DEFAULT);
```

Cross-platform abstraction — Linux epoll·BSD kqueue·Windows IOCP 통합.

## DPDK — User Space Bypass

```c
/* DPDK — kernel epoll 안 씀 */
while (1) {
    struct rte_mbuf *pkts[BURST_SIZE];
    int n = rte_eth_rx_burst(port, 0, pkts, BURST_SIZE);
    for (int i = 0; i < n; i++) process(pkts[i]);
}
```

10G+ network — kernel epoll 너무 느림. DPDK *polling 직접*.

## 자동차·산업 — RT Event Loop

```text
PREEMPT_RT Linux + epoll:
  - cyclictest verify
  - SCHED_FIFO + isolcpus
  - 1 kHz control loop
  - Sensor·actuator I/O
  
io_uring + IORING_SETUP_SQPOLL — *zero syscall*
```

자율주행·산업 PLC.

## 자주 하는 실수

> ⚠️ ET trigger drain 안 함

```c
ev.events = EPOLLIN | EPOLLET;
/* Handler */
ssize_t n = read(fd, buf, sizeof(buf));   /* 1 read만 */
/* → buffer에 더 있어도 다음 epoll_wait이 wake 안 함 */
```

→ EAGAIN까지 *loop*.

> ⚠️ Same fd 여러 번 add

```c
epoll_ctl(ep, EPOLL_CTL_ADD, fd, &ev);
epoll_ctl(ep, EPOLL_CTL_ADD, fd, &ev);   /* EEXIST */
```

→ `EPOLL_CTL_MOD` 또는 *unique*.

> ⚠️ Closed fd가 epoll set에 남음

```c
close(fd);
epoll_wait(...);
/* dangling — fd 재사용 시 잘못된 event */
```

→ close 전 `EPOLL_CTL_DEL`.

> ⚠️ io_uring kernel 버전 의존

```c
io_uring_queue_init(...);   /* kernel 5.0 미만 — ENOSYS */
```

→ `uname -r` 확인 또는 fallback to epoll.

## 정리

- **epoll** = scalable multi-fd polling.
- **ET trigger**가 빠르지만 *drain 필수*.
- **eventfd·signalfd·timerfd** — 모든 것이 fd.
- **io_uring** = modern async, zero syscall option.
- **EPOLLEXCLUSIVE·SO_REUSEPORT** — multi-thread 분산.
- **libev·libuv** — cross-platform 추상.

다음 편은 **UIO·VFIO**.

## 관련 항목

- [4-02: mmap](/blog/embedded/modern-recipes/part4-02-mmap)
- [4-04: UIO·VFIO](/blog/embedded/modern-recipes/part4-04-uio-vfio)
