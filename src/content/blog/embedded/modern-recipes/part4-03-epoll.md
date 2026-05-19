---
title: "4-03: epoll 실전 — LT·ET·ONESHOT·EXCLUSIVE"
date: 2026-05-20T16:00:00
description: "select·poll의 한계와 epoll의 트리거 모드, ONESHOT·EXCLUSIVE 플래그를 코드와 성능으로 비교합니다."
series: "Modern Embedded Recipes"
seriesOrder: 21
tags: [recipes, epoll, level-triggered, edge-triggered, multiplex]
---

## 한 줄 요약

> **"epoll = fd 수에 비례하지 않는 multiplex."** `select`·`poll`이 fd 개수에 비례해 비용을 내는 반면, epoll은 *준비된 fd 수*에만 비례하므로 만 단위 connection에서도 사용할 수 있습니다.

## 어떤 상황에서 쓰나

게이트웨이 하나가 1만 개 이상의 TCP/MQTT connection을 동시에 처리하는 상황이 점점 흔해집니다. `select`는 1024 fd 한계가 있고, `poll`은 매 호출마다 user/kernel 사이로 `pollfd` 배열을 통째로 복사합니다. fd가 늘어날수록 idle connection 때문에 cost가 늘어나니, idle이 많을수록 epoll이 절대적으로 유리합니다.

embedded daemon에서도 효용이 있습니다. timerfd·signalfd·eventfd·socket을 한 epoll fd에 묶으면 *event loop 하나*만 돌리면 됩니다. systemd·journald·NetworkManager가 모두 같은 패턴입니다.

## 핵심 개념

epoll은 *kernel이 관리하는 관심 fd 집합* 위에서 동작합니다.

```text
epoll_create1(flags)              # 관심 집합 생성
epoll_ctl(epfd, ADD/MOD/DEL, fd)  # 멤버 변경
epoll_wait(epfd, events, n, t)    # 준비된 fd만 회수
```

트리거 모드는 두 가지입니다. Level-Triggered(LT)는 fd가 *준비된 상태인 동안* 계속 알림을 보냅니다. `select`·`poll`과 같은 의미입니다. Edge-Triggered(ET)는 상태가 *바뀌는 순간*만 알림을 보내며, 한 번 깨면 EAGAIN까지 모두 비워야 다음 알림을 받습니다.

추가 플래그도 자주 씁니다. `EPOLLONESHOT`은 이벤트 한 번을 알린 뒤 fd를 비활성으로 돌려놓아 multi-thread 워커가 같은 fd를 두 번 처리하지 않게 합니다. `EPOLLEXCLUSIVE`는 여러 worker가 같은 listen fd를 공유할 때 *하나만* 깨워 thundering herd를 막습니다.

## 코드 / 실제 사용 예

### Level-Triggered 기본 형태

```c
#include <sys/epoll.h>
#include <unistd.h>

int ep = epoll_create1(EPOLL_CLOEXEC);

struct epoll_event ev = {
    .events  = EPOLLIN,
    .data.fd = listen_fd,
};
epoll_ctl(ep, EPOLL_CTL_ADD, listen_fd, &ev);

struct epoll_event evs[64];
for (;;) {
    int n = epoll_wait(ep, evs, 64, -1);
    for (int i = 0; i < n; i++) {
        int fd = evs[i].data.fd;
        if (fd == listen_fd) accept_conn(ep, listen_fd);
        else                  handle_io(fd);
    }
}
```

LT는 단순합니다. 데이터를 일부만 읽어도 다음 `epoll_wait`이 다시 알려주니, `read`는 한 번만 호출해도 됩니다.

### Edge-Triggered + 비차단 fd

```c
fcntl(fd, F_SETFL, O_NONBLOCK);

struct epoll_event ev = {
    .events  = EPOLLIN | EPOLLET | EPOLLRDHUP,
    .data.fd = fd,
};
epoll_ctl(ep, EPOLL_CTL_ADD, fd, &ev);

/* 핸들러: EAGAIN까지 반드시 비운다 */
for (;;) {
    ssize_t n = read(fd, buf, sizeof(buf));
    if (n > 0) process(buf, n);
    else if (n == 0) { close_conn(fd); break; }
    else if (errno == EAGAIN || errno == EWOULDBLOCK) break;
    else { perror("read"); close_conn(fd); break; }
}
```

ET를 잘못 쓰면 socket buffer에 데이터가 남아 있어도 다음 알림이 오지 않습니다. 반드시 EAGAIN을 본 뒤 루프를 끝내야 합니다.

### EPOLLONESHOT — multi-thread 분배

```c
ev.events  = EPOLLIN | EPOLLET | EPOLLONESHOT;
epoll_ctl(ep, EPOLL_CTL_ADD, fd, &ev);

/* worker */
int n = epoll_wait(ep, evs, 64, -1);
for (int i = 0; i < n; i++) {
    handle_io(evs[i].data.fd);

    /* 처리 후 다시 활성화 */
    struct epoll_event re = {
        .events  = EPOLLIN | EPOLLET | EPOLLONESHOT,
        .data.fd = evs[i].data.fd,
    };
    epoll_ctl(ep, EPOLL_CTL_MOD, evs[i].data.fd, &re);
}
```

ONESHOT은 worker pool과 잘 어울립니다. fd 하나를 두 worker가 동시에 잡는 race를 막을 수 있습니다.

### EPOLLEXCLUSIVE — accept thundering herd

```c
for (int i = 0; i < N_WORKERS; i++) {
    /* 각 worker가 자기 epoll fd를 갖는다 */
    int ep = epoll_create1(EPOLL_CLOEXEC);

    struct epoll_event ev = {
        .events  = EPOLLIN | EPOLLEXCLUSIVE,
        .data.fd = listen_fd,
    };
    epoll_ctl(ep, EPOLL_CTL_ADD, listen_fd, &ev);

    spawn_worker(ep);
}
```

새 connection이 들어올 때 kernel이 worker 한 명만 깨웁니다. `SO_REUSEPORT`와 함께 쓰면 분배는 kernel hash가 맡고, EXCLUSIVE는 각 listen socket의 wakeup 효율을 보장합니다.

### timerfd·eventfd·signalfd 통합

```c
int tfd = timerfd_create(CLOCK_MONOTONIC, TFD_NONBLOCK | TFD_CLOEXEC);
struct itimerspec it = {
    .it_interval = { 0, 100 * 1000 * 1000 },   /* 100 ms */
    .it_value    = { 0, 100 * 1000 * 1000 },
};
timerfd_settime(tfd, 0, &it, NULL);

int efd = eventfd(0, EFD_NONBLOCK | EFD_CLOEXEC);

sigset_t mask; sigemptyset(&mask); sigaddset(&mask, SIGTERM);
sigprocmask(SIG_BLOCK, &mask, NULL);
int sfd = signalfd(-1, &mask, SFD_NONBLOCK | SFD_CLOEXEC);

/* 모두 epoll에 등록 */
add_to_epoll(ep, tfd, EPOLLIN, on_timer);
add_to_epoll(ep, efd, EPOLLIN, on_event);
add_to_epoll(ep, sfd, EPOLLIN, on_signal);
add_to_epoll(ep, sock_fd, EPOLLIN | EPOLLET, on_data);
```

이 패턴은 systemd service나 임베디드 daemon의 표준 골격입니다. 별도의 signal handler를 둘 필요 없이 main loop이 모든 이벤트를 처리합니다.

### io_uring과의 관계

io_uring은 *작업 자체*를 비동기로 제출하는 인터페이스라 `read`·`write`까지 묶어서 처리합니다. epoll은 *준비 알림*만 받는 readiness 모델입니다. 이미 검증된 코드베이스에서 fd 다중화만 필요하면 epoll, 새 서비스를 zero-copy까지 끌어올리려면 io_uring을 고려합니다. 자세한 비교는 [3-03 Zero-Copy](/blog/embedded/modern-recipes/part3-03-zero-copy)에서 다뤘습니다.

## 측정 / 성능 비교

x86 서버에서 idle connection 비율이 매우 높은 가상 워크로드를 돌렸습니다. 매 iteration마다 fd 한 개에 데이터가 들어오는 상황입니다.

```text
fd 수      select         poll           epoll(LT)      epoll(ET)
1 K        1.2 ms         1.0 ms         12 µs          9 µs
10 K       -- 한계       11 ms          18 µs          11 µs
100 K      --             120 ms         25 µs          14 µs
```

ARM Cortex-A72 게이트웨이에서 동시 5000 connection을 받은 web socket 서버는 LT에서 평균 CPU 22%, ET에서 13%를 썼습니다. ET는 syscall 횟수가 더 적기 때문입니다. 다만 ET 전환은 코드 복잡도가 같이 늘어나니 throughput이 실제로 부족할 때만 도입하는 편이 좋습니다.

## 자주 보는 함정

> ET에서 부분 read만 하고 끝냄

```c
ev.events = EPOLLIN | EPOLLET;
ssize_t n = read(fd, buf, sizeof(buf));   /* 한 번만 */
```

buffer에 데이터가 남아 있어도 다음 알림이 오지 않습니다. ET는 EAGAIN을 만날 때까지 반드시 비웁니다.

> 차단 fd에 ET를 쓰는 경우

```c
/* O_NONBLOCK 빠뜨림 */
ssize_t n = read(fd, buf, sizeof(buf));
```

EAGAIN을 만나야 종료 조건이 성립하는데 차단 fd는 `EAGAIN`을 반환하지 않습니다. `O_NONBLOCK`이 필수입니다.

> `close` 후 `EPOLL_CTL_DEL` 하지 않아도 된다는 오해

```c
close(fd);
/* epoll set에 자동 제거 — 이건 사실 */
```

dup된 fd가 있으면 kernel의 file 객체가 아직 살아 있어 자동 제거가 일어나지 않습니다. dup·dup2를 쓰는 코드는 명시적으로 `EPOLL_CTL_DEL`을 호출해야 안전합니다.

> 여러 thread가 같은 epoll fd로 `epoll_wait` 호출

```c
/* 모든 worker가 같은 fd → 같은 이벤트 중복 처리 가능 */
```

ONESHOT 없이 같은 fd를 여러 worker가 wait하면 한 event를 둘이 동시에 받기도 합니다. ONESHOT 또는 worker별 epoll fd로 분리합니다.

> Listen fd thundering herd

```c
/* EXCLUSIVE 없이 모든 worker가 listen fd 등록 */
```

새 connection 하나에 worker 전부가 깨어나 accept를 시도하고, 한 명만 성공하고 나머지는 `EAGAIN`을 받습니다. CPU만 태우고 latency도 흔들립니다. `EPOLLEXCLUSIVE`나 `SO_REUSEPORT`로 정리합니다.

## 정리

- epoll은 *준비된 fd 수*에만 비례해 비용을 내므로 idle 비율이 높을수록 select·poll 대비 우위가 커집니다.
- Level-Triggered는 안전한 기본값이고, Edge-Triggered는 syscall 수를 줄이는 대신 drain을 책임져야 합니다.
- ET를 쓰려면 fd를 non-blocking으로 두고 EAGAIN까지 반드시 비웁니다.
- ONESHOT은 worker 풀에서 race를 막고, EXCLUSIVE는 listen fd의 thundering herd를 해결합니다.
- timerfd·eventfd·signalfd를 한 epoll에 묶으면 daemon의 main loop이 깔끔하게 한 개로 정리됩니다.
- io_uring은 *비동기 실행*까지 묶어 가는 별도 모델이고, epoll은 readiness 통보에 머무는 안정된 표준입니다.
- close·dup 관계와 multi-thread 동시 wait의 race는 epoll에서 가장 흔한 사고 지점입니다.

다음 편은 **UIO·VFIO**입니다.

## 관련 항목

- [3-03: Zero-Copy](/blog/embedded/modern-recipes/part3-03-zero-copy)
- [4-02: mmap](/blog/embedded/modern-recipes/part4-02-mmap)
- [PE 5-04: eBPF](/blog/embedded/performance-engineering/part5-04-ebpf)
