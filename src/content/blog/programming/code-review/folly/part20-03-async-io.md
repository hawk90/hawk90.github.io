---
title: "folly::AsyncIO — io_uring·Linux AIO"
date: 2026-06-08T09:13:00
description: "folly::AsyncIO와 IoUringBackend — kernel async disk I/O, callback과 coroutine 통합."
series: "Folly Code Review"
seriesOrder: 85
tags: [cpp, folly, async-io, io_uring, linux]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

> **한 줄 요약**: `folly::AsyncIO`는 Linux의 io_uring(우선) 또는 libaio(폴백)을 wrap한 async disk I/O 인터페이스다. thread-per-IO 모델 없이 수만 동시 I/O를 다룬다.

## 동기

전통적인 disk I/O는 *blocking* — read/write가 thread를 잠근다. 한 번에 수천 파일을 다루려면 thread를 수천 개 만들거나, 별도 threadpool로 던지거나, epoll+nonblock(disk엔 적용 안 됨)을 흉내내야 한다.

Linux는 두 가지 kernel async I/O를 제공.

1. **libaio (kernel AIO)** — 2003년경 도입. O_DIRECT만 지원, 일부 fs에서 fallback to blocking.
2. **io_uring** — 2019년 5.1+. unified sqe/cqe ring, O_DIRECT 불필요, regular file 지원, network/disk 모두.

`folly::AsyncIO`는 두 backend를 같은 인터페이스로 노출한다.

```cpp
folly::IoUringBackend backend(folly::IoUringBackend::Options{}.setCapacity(4096));

folly::AsyncIO::Op op;
op.pread(fd, buffer, length, offset);
op.setNotificationCallback([](folly::AsyncIO::Op* o) {
  std::cout << "done, bytes: " << o->result() << "\n";
});
backend.submit(&op);

backend.pollCompleted();   // 또는 EventBase에서 자동
```

## API

```cpp
#include <folly/experimental/io/AsyncIO.h>

class AsyncIO {
 public:
  struct Op {
    void pread(int fd, void* buf, size_t count, off_t offset);
    void pwrite(int fd, const void* buf, size_t count, off_t offset);
    void preadv(int fd, const iovec* iov, int iovcnt, off_t offset);
    void pwritev(int fd, const iovec* iov, int iovcnt, off_t offset);
    void fsync(int fd);
    void fdatasync(int fd);
    ssize_t result() const;   // 완료 후 값
  };

  void submit(Op* op);
  void pollCompleted();
  Range<Op**> wait(size_t minRequests);
};
```

`Op`가 한 I/O 요청. submit 후 `pollCompleted` 또는 `wait`로 결과 수확.

### Coroutine 통합

```cpp
folly::coro::Task<size_t> ReadAsync(folly::IoUringBackend& backend,
                                    int fd, void* buf, size_t len, off_t off) {
  folly::AsyncIO::Op op;
  op.pread(fd, buf, len, off);
  
  folly::coro::Baton done;
  op.setNotificationCallback([&](auto*) { done.post(); });
  
  backend.submit(&op);
  co_await done;
  
  if (op.result() < 0) throw std::system_error(-op.result(), std::system_category());
  co_return op.result();
}
```

`Baton`으로 코루틴이 I/O 완료를 await. `folly::coro::IoUringExecutor` 같은 wrapper가 이 패턴을 자동화.

## 내부 — io_uring 동작

```text
io_uring 모델:
  SQE (Submission Queue Entry) ring — user 영역 fill, kernel poll
  CQE (Completion Queue Entry) ring — kernel fill, user poll

submit:
  1. SQE에 op 정보 채움
  2. io_uring_enter syscall (또는 SQPOLL mode면 kernel이 자동 poll)
  3. kernel이 SQE를 처리, 완료 시 CQE에 결과
  
poll:
  1. CQE ring을 user가 poll
  2. 각 CQE의 user_data로 Op* 복원
  3. callback 호출
```

ring 한 쌍이 *batch* 제출과 *batch* 수확을 가능하게 한다. syscall 한 번에 수십 op 처리. context switch 비용이 결정적으로 줄어든다.

```cpp
// folly/experimental/io/IoUring.cpp 약식
void IoUringBackend::submit(Op* op) {
  io_uring_sqe* sqe = io_uring_get_sqe(&ring_);
  if (!sqe) {
    io_uring_submit(&ring_);   // ring 가득 → flush
    sqe = io_uring_get_sqe(&ring_);
  }
  setupSqe(sqe, op);   // pread / pwrite / fsync 등
  io_uring_sqe_set_data(sqe, op);
  pending_.insert(op);
}

void IoUringBackend::pollCompleted() {
  io_uring_cqe* cqe;
  while (io_uring_peek_cqe(&ring_, &cqe) == 0) {
    auto* op = static_cast<Op*>(io_uring_cqe_get_data(cqe));
    op->result_ = cqe->res;
    io_uring_cqe_seen(&ring_, cqe);
    op->complete();   // callback
  }
}
```

## libaio fallback

io_uring이 없는 (5.1 미만) kernel에서는 libaio.

```cpp
// folly/experimental/io/Aio.cpp 약식
class AioBackend {
  void submit(Op* op) {
    io_event ev;
    iocb* cb = &op->cb_;
    io_prep_pread(cb, op->fd_, op->buf_, op->len_, op->offset_);
    io_submit(ctx_, 1, &cb);
  }

  void pollCompleted() {
    io_event events[64];
    int n = io_getevents(ctx_, 0, 64, events, nullptr);
    for (int i = 0; i < n; ++i) {
      auto* op = static_cast<Op*>(events[i].data);
      op->result_ = events[i].res;
      op->complete();
    }
  }
};
```

libaio는 `O_DIRECT` 강제, regular fs에서 fallback to blocking이 있어 *모든 I/O가 진짜 async* 아닐 수 있음. io_uring이 압도적 우위.

## 사용 패턴 — high-throughput read

```cpp
folly::IoUringBackend backend(folly::IoUringBackend::Options{}
  .setCapacity(8192));

std::vector<folly::AsyncIO::Op> ops(1000);
std::vector<std::vector<char>> bufs(1000, std::vector<char>(4096));

for (size_t i = 0; i < 1000; ++i) {
  ops[i].pread(fd, bufs[i].data(), 4096, i * 4096);
  backend.submit(&ops[i]);
}

size_t completed = 0;
while (completed < 1000) {
  auto done = backend.wait(/*min=*/1);
  for (auto* op : done) {
    ++completed;
    // process result
  }
}
```

1000개 4KB read를 한 번에 제출. io_uring이라면 4-5 syscall로 완료. thread-per-IO 모델은 1000 thread 필요.

## std와의 비교

| 항목 | 표준 (없음) | folly::AsyncIO | std::async | Boost.Asio |
|------|-------------|------------------|--------------|--------------|
| disk async | N/A | io_uring/libaio | thread per call | 같음 (asio도 io_uring backend 추가) |
| network async | N/A | folly::AsyncSocket | N/A | yes |
| throughput | N/A | 매우 높음 (kernel polling) | 낮음 | 높음 |
| coroutine | N/A | folly::coro | N/A | asio::awaitable |

`std::async`는 disk I/O 해법이 아니다. thread를 spawn해 blocking read하는 정도. `folly::AsyncIO`는 진짜 kernel async.

io_uring backend는 Boost.Asio도 추가했다 — 같은 kernel feature를 다른 wrapper가 채택.

## 코드 리뷰 포인트

- io_uring 사용 여부가 kernel version에 좌우 → runtime check 후 fallback.
- ring capacity가 부족하면 submit이 spin/block. capacity tuning.
- buffer가 op 수명보다 짧으면 UAF — buffer 보장.
- syscall mode (`io_uring_enter` 직접 vs SQPOLL) — SQPOLL은 kernel thread를 점유. high-throughput 환경에서만.
- coroutine wrap이 없으면 callback boilerplate. `folly::coro::IoUringExecutor` 또는 직접 Baton wrap.

## 자주 보는 안티패턴

```cpp
// 1. op buffer가 stack에 있는데 callback이 늦게
{
  folly::AsyncIO::Op op;
  char buf[4096];
  op.pread(fd, buf, 4096, 0);
  backend.submit(&op);
}   // op과 buf 모두 destroy — kernel은 아직 작업 중
// → heap에 두거나 callback이 완료될 때까지 살아있어야

// 2. fsync를 매 write마다
for (auto& blk : blocks) {
  op.pwrite(fd, blk.data(), blk.size(), off);
  backend.submit(&op);
  op.fsync(fd);   // 매 write마다 fsync — throughput 박살
}
// → batch 후 한 번 fsync

// 3. O_DIRECT 없는 fd에 libaio
fd = open(path, O_RDONLY);   // O_DIRECT 아님
AioBackend backend;
// → libaio가 blocking으로 fallback. io_uring 사용 또는 O_DIRECT.

// 4. pollCompleted를 한 thread에서, submit을 다른 thread에서
// → io_uring ring은 multi-threaded SQ submit 위험. SQ lock 또는 single submitter.
```

## 정리

- `folly::AsyncIO`는 io_uring/libaio를 통합한 async disk I/O wrapper.
- io_uring이 우선 — kernel 5.1+에서 사용.
- batch 제출/수확으로 syscall 비용 분산.
- coroutine wrap으로 callback boilerplate 제거 가능.
- thread-per-IO 모델 대비 throughput·resource 효율 결정적.

## 다음 편

[Part 20-04: CancellationToken](/blog/programming/code-review/folly/part20-04-cancellation-token)에서 코루틴/Future 취소 전파를 본다.

## 관련 항목

- [Folly Part 3-05 — EventBase](/blog/programming/code-review/folly/part3-05-event-base)
- [Folly Part 15-02 — coro::Task](/blog/programming/code-review/folly/part15-02-coro-task)
- [원문 — folly/experimental/io/IoUring.h](https://github.com/facebook/folly/blob/main/folly/experimental/io/IoUring.h)
- [Jens Axboe — io_uring overview](https://kernel.dk/io_uring.pdf)
