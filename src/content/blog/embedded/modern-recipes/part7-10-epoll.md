---
title: "epoll 실전 — LT·ET·ONESHOT·EXCLUSIVE 비교"
slug: "embedded/modern-recipes/part7-10-epoll"
date: 2026-04-16T09:09:00
description: "select·poll의 한계와 epoll의 트리거 모드, ONESHOT·EXCLUSIVE 플래그를 코드와 성능으로 비교합니다."
series: "Modern Embedded Recipes"
seriesOrder: 84
tags: [recipes, epoll, level-triggered, edge-triggered, multiplex]
topics: ["embedded"]
---

## 한 줄 요약

> **"epoll = 등록한 fd 수가 아니라 준비된 fd 수만큼 일하는 multiplex."** `select`·`poll`은 호출할 때마다 감시할 fd 전체를 넘기고 훑지만, epoll은 관심 목록을 커널에 한 번 등록해 두고 준비된 fd만 돌려받습니다. 이 글의 모든 출력과 시간은 Debian 13 arm64 VM(커널 `6.12.116+deb13-arm64`, gcc 14.2.0)에서 직접 돌린 결과입니다.

## 어떤 상황에서 쓰나

게이트웨이 하나가 수천 개의 TCP 연결을 동시에 들고 있고, 그중 데이터가 오는 연결은 몇 개뿐인 상황이 있습니다. `select`는 fd 번호가 `FD_SETSIZE`(1024)보다 작은 fd만 감시할 수 있고, man page가 이 한계는 바뀌지 않는다고 적습니다(`select(2)`, man-pages 6.9.1). `poll`은 그 제한이 없지만 매번 배열 전체를 커널에 넘깁니다. 아래 측정에서 2만 개 fd 중 하나만 준비됐을 때 `poll`은 호출당 1 ms가 넘었고 epoll은 1.5 µs였습니다.

임베디드 daemon에서도 쓸모가 큽니다. timerfd·signalfd·eventfd·socket을 epoll 하나에 묶으면 thread 하나의 event loop에서 타이머·signal·다른 thread의 알림·네트워크를 함께 처리합니다. 우체국 창구 직원이 번호표 기계 하나만 보고 있다가 호출된 번호만 응대하는 것과 같습니다.

## 핵심 개념

epoll은 커널이 관리하는 관심 fd 집합 위에서 동작합니다.

| 호출 | 하는 일 |
| --- | --- |
| `epoll_create1(flags)` | 관심 집합(epoll 인스턴스) 생성 |
| `epoll_ctl(epfd, ADD/MOD/DEL, fd, &ev)` | 멤버 추가·변경·삭제 |
| `epoll_wait(epfd, events, n, timeout)` | 준비된 fd만 회수 |

알림 방식은 두 가지입니다. Level-Triggered(LT, 기본값)는 fd가 준비된 상태인 동안 `epoll_wait`마다 계속 알립니다. Edge-Triggered(ET, `EPOLLET`)는 상태가 바뀌는 순간에만 알리므로, 한 번 깨면 `EAGAIN`이 날 때까지 비워야 다음 알림을 받습니다. 초인종(ET)은 누른 순간 한 번 울리고, 문 앞에 쌓인 택배(LT)는 치울 때까지 보입니다.

추가 플래그 두 개를 자주 씁니다. `EPOLLONESHOT`은 이벤트를 한 번 알린 뒤 그 fd를 비활성으로 돌려, 다시 `EPOLL_CTL_MOD`로 켤 때까지 알리지 않습니다. `EPOLLEXCLUSIVE`(Linux 4.5부터)는 같은 fd를 여러 epoll 인스턴스가 감시할 때 전부가 아니라 "하나 이상"만 깨워, thundering herd를 줄이는 용도라고 man page가 적습니다(`epoll_ctl(2)`).

## 코드 / 실제 사용 예

아래 프로그램 하나로 LT·ET, ONESHOT, close와 dup, thundering herd, timerfd·eventfd·signalfd loop를 차례로 확인했습니다. 함수마다 한 가지 성질을 보여 주므로 필요한 함수만 떼어 써도 됩니다.

```c
#define _GNU_SOURCE
#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <pthread.h>
#include <signal.h>
#include <stdatomic.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/epoll.h>
#include <sys/eventfd.h>
#include <sys/signalfd.h>
#include <sys/socket.h>
#include <sys/timerfd.h>
#include <unistd.h>

static int add(int ep, int fd, unsigned ev)
{
	struct epoll_event e = { .events = ev, .data.fd = fd };
	return epoll_ctl(ep, EPOLL_CTL_ADD, fd, &e);
}

/* 1) LT vs ET when the handler reads only part of the data */
static void partial(unsigned mode, const char *name)
{
	int p[2]; pipe2(p, O_NONBLOCK);
	int ep = epoll_create1(0);
	add(ep, p[0], EPOLLIN | mode);
	write(p[1], "0123456789012345678901234567890123456789", 40);
	int wakes = 0, got = 0; char b[10]; struct epoll_event e;
	while (epoll_wait(ep, &e, 1, 100) == 1) {    /* 100 ms timeout */
		wakes++;
		got += read(p[0], b, sizeof b);          /* only 10 bytes */
	}
	printf("%s: wakeups=%d bytes read=%d of 40\n", name, wakes, got);
	close(ep); close(p[0]); close(p[1]);
}

/* 2) ONESHOT: no second event until EPOLL_CTL_MOD */
static void oneshot(void)
{
	int p[2]; pipe2(p, O_NONBLOCK);
	int ep = epoll_create1(0);
	add(ep, p[0], EPOLLIN | EPOLLONESHOT);
	write(p[1], "xx", 2);
	struct epoll_event e;
	int a = epoll_wait(ep, &e, 1, 100);
	int b = epoll_wait(ep, &e, 1, 100);          /* still readable, but disarmed */
	struct epoll_event re = { .events = EPOLLIN | EPOLLONESHOT, .data.fd = p[0] };
	epoll_ctl(ep, EPOLL_CTL_MOD, p[0], &re);
	int c = epoll_wait(ep, &e, 1, 100);
	printf("ONESHOT: first=%d second=%d after MOD=%d\n", a, b, c);
	close(ep); close(p[0]); close(p[1]);
}

/* 3) close() with a dup alive: the registration stays */
static void dupclose(void)
{
	int p[2]; pipe2(p, O_NONBLOCK);
	int ep = epoll_create1(0);
	add(ep, p[0], EPOLLIN);
	int d = dup(p[0]);
	close(p[0]);                                  /* the dup keeps the file alive */
	write(p[1], "x", 1);
	struct epoll_event e;
	int n = epoll_wait(ep, &e, 1, 100);
	printf("close+dup: epoll_wait=%d, reported fd=%d (closed number), dup is fd %d\n",
	       n, n == 1 ? e.data.fd : -1, d);
	int r = epoll_ctl(ep, EPOLL_CTL_DEL, d, NULL);
	printf("EPOLL_CTL_DEL with the dup: %d (%s)\n", r, r ? strerror(errno) : "ok");
	close(ep); close(d); close(p[1]);
}

/* 4) thundering herd on a listening socket */
static int lfd;
static atomic_int woke, accepted;
static void *worker(void *arg)
{
	unsigned flags = *(unsigned *)arg;
	int ep = epoll_create1(0);
	add(ep, lfd, EPOLLIN | flags);
	struct epoll_event e;
	for (;;) {
		if (epoll_wait(ep, &e, 1, 300) == 0) break;
		atomic_fetch_add(&woke, 1);
		int c = accept(lfd, NULL, NULL);
		if (c >= 0) { atomic_fetch_add(&accepted, 1); close(c); }
		usleep(1000);                               /* let others race too */
	}
	close(ep);
	return NULL;
}
static void herd(unsigned flags, const char *name)
{
	enum { W = 8, CONNS = 50 };
	struct sockaddr_in a = { .sin_family = AF_INET, .sin_addr.s_addr = htonl(INADDR_LOOPBACK) };
	lfd = socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0);
	bind(lfd, (void *)&a, sizeof a); listen(lfd, 128);
	socklen_t al = sizeof a; getsockname(lfd, (void *)&a, &al);
	woke = accepted = 0;
	pthread_t t[W];
	for (int i = 0; i < W; i++) pthread_create(&t[i], NULL, worker, &flags);
	usleep(50000);
	for (int i = 0; i < CONNS; i++) {
		int c = socket(AF_INET, SOCK_STREAM, 0);
		connect(c, (void *)&a, sizeof a);
		close(c);
		usleep(5000);
	}
	for (int i = 0; i < W; i++) pthread_join(t[i], NULL);
	printf("%s: %d workers, %d connections -> %d wakeups, %d accepted\n",
	       name, W, CONNS, woke, accepted);
	close(lfd);
}

/* 5) one loop for timerfd, eventfd, signalfd */
static void loop(void)
{
	int ep = epoll_create1(EPOLL_CLOEXEC);
	int tfd = timerfd_create(CLOCK_MONOTONIC, TFD_NONBLOCK | TFD_CLOEXEC);
	struct itimerspec it = { { 0, 100000000 }, { 0, 100000000 } };   /* 100 ms */
	timerfd_settime(tfd, 0, &it, NULL);
	int efd = eventfd(0, EFD_NONBLOCK | EFD_CLOEXEC);
	sigset_t m; sigemptyset(&m); sigaddset(&m, SIGTERM);
	sigprocmask(SIG_BLOCK, &m, NULL);
	int sfd = signalfd(-1, &m, SFD_NONBLOCK | SFD_CLOEXEC);
	add(ep, tfd, EPOLLIN); add(ep, efd, EPOLLIN); add(ep, sfd, EPOLLIN);
	int ticks = 0, sent_ev = 0, sent_sig = 0;
	for (;;) {
		struct epoll_event e;
		epoll_wait(ep, &e, 1, -1);
		if (e.data.fd == tfd) {
			uint64_t n; read(tfd, &n, 8); ticks += n;
			if (ticks >= 3 && !sent_ev) { sent_ev = 1; uint64_t one = 1; write(efd, &one, 8); }
			if (ticks >= 5 && !sent_sig) { sent_sig = 1; kill(getpid(), SIGTERM); }
		} else if (e.data.fd == efd) {
			uint64_t v; read(efd, &v, 8); printf("loop: eventfd %llu at tick %d\n", (unsigned long long)v, ticks);
		} else if (e.data.fd == sfd) {
			struct signalfd_siginfo si; read(sfd, &si, sizeof si);
			printf("loop: signal %d (%s) at tick %d, leaving\n", si.ssi_signo, strsignal(si.ssi_signo), ticks);
			break;
		}
	}
}

int main(void)
{
	setvbuf(stdout, NULL, _IONBF, 0);
	partial(0, "LT");
	partial(EPOLLET, "ET");
	oneshot();
	dupclose();
	herd(0, "no EXCLUSIVE");
	herd(EPOLLEXCLUSIVE, "EPOLLEXCLUSIVE");
	loop();
	return 0;
}
```

```bash
gcc -O2 -Wall -pthread -o ep ep.c && ./ep
```

```text
LT: wakeups=4 bytes read=40 of 40
ET: wakeups=1 bytes read=10 of 40
ONESHOT: first=1 second=0 after MOD=1
close+dup: epoll_wait=1, reported fd=3 (closed number), dup is fd 6
EPOLL_CTL_DEL with the dup: -1 (No such file or directory)
no EXCLUSIVE: 8 workers, 50 connections -> 50 wakeups, 50 accepted
EPOLLEXCLUSIVE: 8 workers, 50 connections -> 50 wakeups, 50 accepted
loop: eventfd 1 at tick 3
loop: signal 15 (Terminated) at tick 5, leaving
```

### LT와 ET — 일부만 읽는 handler

`partial()`은 pipe에 40바이트를 써 두고, 깨어날 때마다 10바이트만 읽습니다. LT는 남은 데이터가 있는 동안 계속 깨워 네 번 만에 40바이트를 모두 읽었습니다. ET는 처음 한 번만 깨웠고, 30바이트가 pipe에 남아 있는데도 100 ms 동안 다시 알리지 않았습니다. ET handler는 `EAGAIN`을 볼 때까지 읽어야 하고, 그러려면 fd가 non-blocking이어야 합니다. Blocking fd에서 "빌 때까지 읽기"를 하면 마지막 `read`가 `EAGAIN` 대신 잠들어 버립니다.

### EPOLLONESHOT — worker pool에서 한 fd를 한 번만

ONESHOT으로 등록한 fd는 첫 `epoll_wait`에서 알린 뒤, 데이터가 남아 있어도 두 번째 `epoll_wait`에서는 0이었습니다. `EPOLL_CTL_MOD`로 다시 켠 뒤에야 다시 알렸습니다. 여러 thread가 같은 epoll fd로 `epoll_wait`를 부르는 worker pool에서, 한 연결을 두 thread가 동시에 처리하지 않게 하는 장치가 이것입니다. 처리를 끝낸 thread가 `MOD`로 다시 켭니다.

### close와 dup

`dupclose()`는 fd를 등록하고 `dup`한 뒤 원래 fd를 닫았습니다. 닫은 fd 번호(3)로 여전히 이벤트가 왔고, `dup`한 fd로 `EPOLL_CTL_DEL`을 하면 `ENOENT`였습니다. man page는 같은 open file description을 가리키는 fd가 모두 닫혀야 관심 목록에서 빠진다고 설명하고, 그래서 `dup` 하기 *전에* `EPOLL_CTL_DEL`로 빼라고 적습니다(`epoll(7)` Q&A "Will closing a file descriptor cause it to be removed from all epoll interest lists?"). 원래 fd가 아직 열려 있다면 `close` 전에 그 fd로 `EPOLL_CTL_DEL`을 해도 빠졌습니다(같은 VM에서 반환값 0, 이후 `epoll_wait` 0). `dup`한 fd로 지우면 `ENOENT`인 이유는, 커널이 관심 목록 항목을 (open file description, 등록할 때의 fd 번호) 쌍으로 찾기 때문입니다(v6.12 `fs/eventpoll.c`의 `ep_cmp_ffd`·`ep_find`).

### EPOLLEXCLUSIVE — accept thundering herd

`herd()`는 thread 8개가 각자 epoll 인스턴스로 같은 listening socket을 감시하게 하고, 연결 50개를 5 ms 간격으로 보냈습니다. 위 출력의 실행에서는 두 경우 모두 `epoll_wait`가 50번 돌아왔습니다. 같은 프로그램의 앞선 실행에서는 `EPOLLEXCLUSIVE` 없이 81번이었고(나머지 31번은 `accept`가 `EAGAIN`), 독립 검증으로 여섯 번 더 돌렸을 때 56~80번이었습니다. `EPOLLEXCLUSIVE`로는 매번 정확히 50번이었습니다. 즉 이 조건(thread 8개, 연결 5 ms 간격)에서 차이는 실행마다 0~31번으로 흔들렸고, `EPOLLEXCLUSIVE`는 그 흔들림을 없앴습니다. 세는 값은 `epoll_wait`가 이벤트를 돌려준 횟수이고, 커널 안에서 깼다가 이벤트 없이 다시 잠든 횟수는 들어 있지 않습니다. 여러 process가 각자 socket을 열어 커널이 연결을 나눠 주게 하는 `SO_REUSEPORT`는 다른 방식이고, 이 글에서는 재지 않았습니다.

### timerfd·eventfd·signalfd를 한 loop에

`loop()`는 100 ms 주기 timerfd, eventfd, SIGTERM을 받는 signalfd를 한 epoll에 등록합니다. 세 번째 tick에서 eventfd에 1을 쓰고, 다섯 번째 tick에서 자기에게 SIGTERM을 보냈습니다. 출력대로 eventfd 알림과 signal이 모두 같은 `epoll_wait` loop로 들어왔습니다. signalfd로 받을 signal은 `sigprocmask`로 막아 두어야 기본 동작(SIGTERM이면 종료)이 먼저 일어나지 않습니다.

### io_uring과의 관계

epoll은 "읽을 수 있다"는 준비 알림만 주고 실제 `read`·`write`는 프로그램이 따로 부릅니다. io_uring은 `read`·`write` 같은 작업 자체를 제출하고 완료를 받는 인터페이스입니다. 이 글에서는 io_uring을 재지 않았습니다.

## 측정 / 성능 비교

fd 수를 바꿔 가며, 매 반복마다 임의의 pipe 하나에 1바이트를 쓰고 그것을 기다려 읽는 데 걸린 시간을 쟀습니다(2만 회 평균). `select`·`poll`은 호출 때마다 집합 전체를 넘기고 결과 전체를 훑으며, epoll은 등록을 한 번만 하고 준비된 fd 하나만 받습니다.

```c
#define _GNU_SOURCE
#include <fcntl.h>
#include <poll.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/epoll.h>
#include <sys/select.h>
#include <time.h>
#include <unistd.h>

static double now(void)
{
	struct timespec ts;
	clock_gettime(CLOCK_MONOTONIC, &ts);
	return ts.tv_sec + ts.tv_nsec / 1e9;
}

int main(int argc, char **argv)
{
	int n = atoi(argv[1]), iters = 20000;
	int (*p)[2] = malloc(sizeof(*p) * n);
	for (int i = 0; i < n; i++) pipe2(p[i], O_NONBLOCK);
	int maxfd = p[n - 1][1];
	char c;
	srand(1);

	/* select: rebuild the set every call, scan up to maxfd */
	double sel = -1;
	if (maxfd < FD_SETSIZE) {
		double t0 = now();
		for (int k = 0; k < iters; k++) {
			int r = rand() % n; write(p[r][1], "x", 1);
			fd_set s; FD_ZERO(&s);
			for (int i = 0; i < n; i++) FD_SET(p[i][0], &s);
			select(maxfd + 1, &s, NULL, NULL, NULL);
			for (int i = 0; i < n; i++) if (FD_ISSET(p[i][0], &s)) read(p[i][0], &c, 1);
		}
		sel = (now() - t0) / iters * 1e6;
	}

	/* poll: pass the whole array every call */
	struct pollfd *pf = calloc(n, sizeof *pf);
	for (int i = 0; i < n; i++) { pf[i].fd = p[i][0]; pf[i].events = POLLIN; }
	double t0 = now();
	for (int k = 0; k < iters; k++) {
		int r = rand() % n; write(p[r][1], "x", 1);
		poll(pf, n, -1);
		for (int i = 0; i < n; i++) if (pf[i].revents) read(pf[i].fd, &c, 1);
	}
	double pol = (now() - t0) / iters * 1e6;

	/* epoll: register once, get only the ready fd back */
	int ep = epoll_create1(0);
	for (int i = 0; i < n; i++) {
		struct epoll_event e = { .events = EPOLLIN, .data.fd = p[i][0] };
		epoll_ctl(ep, EPOLL_CTL_ADD, p[i][0], &e);
	}
	t0 = now();
	for (int k = 0; k < iters; k++) {
		int r = rand() % n; write(p[r][1], "x", 1);
		struct epoll_event e;
		epoll_wait(ep, &e, 1, -1);
		read(e.data.fd, &c, 1);
	}
	double epl = (now() - t0) / iters * 1e6;

	if (sel < 0) printf("n=%5d  select: n/a (fd %d >= FD_SETSIZE %d)  poll: %8.2f us  epoll: %6.2f us\n", n, maxfd, FD_SETSIZE, pol, epl);
	else         printf("n=%5d  select: %8.2f us  poll: %8.2f us  epoll: %6.2f us\n", n, sel, pol, epl);
	return 0;
}
```

```bash
gcc -O2 -Wall -o scale scale.c
ulimit -n 65536
for n in 10 100 500 5000 20000; do ./scale $n; done
```

```text
n=   10  select:     0.83 us  poll:     0.78 us  epoll:   0.52 us
n=  100  select:     4.16 us  poll:     7.41 us  epoll:   0.54 us
n=  500  select:    20.51 us  poll:    17.50 us  epoll:   0.61 us
n= 5000  select: n/a (fd 10002 >= FD_SETSIZE 1024)  poll:   186.98 us  epoll:   0.91 us
n=20000  select: n/a (fd 40002 >= FD_SETSIZE 1024)  poll:  1035.84 us  epoll:   1.53 us
```

pipe 하나가 fd 두 개라서 pipe 5000개면 fd 번호가 10002까지 갑니다. `select`는 `FD_SETSIZE`를 넘는 fd를 다룰 수 없어 측정하지 않았습니다. `poll`은 fd 수에 거의 비례해 늘었고(500개에서 17.50 µs, 2만 개에서 1035.84 µs), epoll은 2만 개에서도 1.53 µs였습니다. fd가 10개뿐일 때는 세 방식의 차이가 1 µs 안이므로, fd가 적은 프로그램이라면 어느 쪽을 써도 이 비용은 문제가 되지 않습니다. 같은 VM에서 다른 빌드 작업이 돌던 상태(load average 8 안팎)에서 한 번 잰 값입니다.

## 자주 보는 함정

> ⚠️ ET에서 한 번만 읽음

위 `ET: wakeups=1 bytes read=10 of 40`처럼, 남은 데이터가 있어도 다음 알림이 오지 않습니다. ET에서는 `EAGAIN`이 날 때까지 읽어야 합니다.

> ⚠️ Blocking fd에 ET

ET의 "빌 때까지 읽기" loop는 `EAGAIN`으로 끝나야 하는데, blocking fd의 마지막 `read`는 `EAGAIN`을 돌려주지 않고 잠듭니다. ET로 등록하는 fd는 `O_NONBLOCK`으로 엽니다(위 코드는 `pipe2(..., O_NONBLOCK)`).

> ⚠️ `dup`한 fd가 남아 있는데 `close`만 함

위 `close+dup` 출력처럼 닫은 번호로 이벤트가 계속 오고, `dup`한 fd로는 `EPOLL_CTL_DEL`이 `ENOENT`입니다. `close` 전에 등록한 그 fd로 `EPOLL_CTL_DEL`을 합니다.

> ⚠️ 여러 thread가 ONESHOT 없이 같은 epoll fd를 기다림

같은 VM에서 thread 4개가 한 epoll fd를 기다리고 1바이트를 읽지 않은 채 두었더니, LT는 4개 모두 이벤트를 받았고 `EPOLLET`과 `EPOLLONESHOT`은 1개만 받았습니다. 처리 중인 연결을 다른 thread가 건드리지 않게 하려면 `EPOLLONESHOT`과 처리 후 `EPOLL_CTL_MOD`를 씁니다.

> ⚠️ listening socket의 thundering herd

위 실험의 한 실행에서 `EPOLLEXCLUSIVE` 없이는 연결 50개에 `epoll_wait`가 81번 돌아왔습니다. 돌아온 thread 중 하나만 `accept`에 성공하고 나머지는 `EAGAIN`을 받습니다. `EPOLLEXCLUSIVE`로 등록하면 모든 실행에서 연결 수만큼만 돌아왔습니다.

## 정리

- epoll은 관심 목록을 커널에 두고 준비된 fd만 돌려줍니다. 이 측정에서 2만 fd 중 하나가 준비됐을 때 `poll`은 1 ms가 넘었고 epoll은 1.5 µs였습니다.
- `select`는 `FD_SETSIZE`(1024) 미만의 fd 번호만 다룹니다.
- LT는 남은 데이터가 있는 동안 계속 알리고, ET는 바뀌는 순간 한 번만 알립니다. ET에서는 non-blocking fd로 `EAGAIN`까지 읽어야 합니다.
- ONESHOT은 한 번 알린 fd를 `MOD`로 다시 켤 때까지 끕니다.
- epoll 등록은 (open file description, 등록한 fd 번호) 쌍으로 잡히므로, `dup`이 남아 있으면 `close`로 빠지지 않고 `dup`한 번호로는 지울 수도 없습니다.
- `EPOLLEXCLUSIVE`는 같은 fd를 감시하는 여러 epoll 인스턴스 전부가 아니라 하나 이상만 깨웁니다(`epoll_ctl(2)`).
- timerfd·eventfd·signalfd를 한 epoll에 묶으면 thread 하나의 loop로 타이머·알림·signal을 함께 처리합니다.

다음 편은 **UIO·VFIO**입니다.

## 관련 항목

- [7-07: 캐릭터 드라이버](/blog/embedded/modern-recipes/part7-07-char-driver) — driver 쪽 `.poll` 구현
- [7-09: mmap](/blog/embedded/modern-recipes/part7-09-mmap)
- [12-10: Zero-Copy](/blog/embedded/modern-recipes/part12-10-zero-copy-camera)
- [PE 5-04: eBPF](/blog/embedded/performance-engineering/part5-04-ebpf)
