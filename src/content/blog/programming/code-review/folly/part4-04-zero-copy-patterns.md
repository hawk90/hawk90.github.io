---
title: "Part 4-04: Zero-copy 패턴 — IOBuf로 ScatterGather I/O 표현"
date: 2026-05-23T21:00:00
description: "IOBuf chain을 직접 writev/readv에 넘기고, splice/sendfile과 결합해 zero-copy 송수신 파이프라인을 구성한다."
series: "Folly Code Review"
seriesOrder: 21
tags: [cpp, folly, iobuf, zero-copy, network]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: false
---

> **한 줄 요약**: IOBuf chain은 *그 자체로 iovec*다. `writev`/`readv`/`sendmsg`에 직접 넘겨 user-space copy를 0회로 만든다.

## 동기 — copy가 비용이다

10Gbps 네트워크에서 매초 1GB의 byte가 흐른다. user-space에서 1번 복사하면 *추가 1GB/s memcpy*다. CPU 한 코어를 통째로 잡아먹는다.

![전통적 흐름 — kernel↔user 사이에 user buf1/buf2/socket buf 거치며 여러 번 memcpy](/images/blog/folly/diagrams/part4-04-traditional-copy.svg)

zero-copy 목표는 *user-space에서 0번 copy*다.

![zero-copy 흐름 — IOBuf가 pointer만 wrap해 chain으로 연결되고 writev/sendmsg에 직접 전달](/images/blog/folly/diagrams/part4-04-zero-copy.svg)

IOBuf의 ref-count와 chain 구조가 이를 자연스럽게 표현한다.

## 패턴 1 — recv + IOBufQueue

```cpp
folly::IOBufQueue q{folly::IOBufQueue::cacheChainLength()};

while (running) {
  auto [data, cap] = q.preallocate(4096, 65536);
  ssize_t n = ::recv(fd, data, cap, 0);
  if (n <= 0) break;
  q.postallocate(n);

  // q의 chain은 추가 copy 없이 frame parser로 흐름
  while (auto frame = parseFrame(q)) {
    handle(std::move(frame));
  }
}
```

recv가 *직접 IOBuf의 buffer에* 쓴다. user-space copy 0회.

## 패턴 2 — writev로 chain 전체 송신

```cpp
ssize_t writeChain(int fd, folly::IOBuf const* head) {
  std::array<iovec, 64> iov;
  size_t count = 0;
  size_t total = 0;
  auto cur = head;
  do {
    iov[count].iov_base = const_cast<uint8_t*>(cur->data());
    iov[count].iov_len = cur->length();
    total += cur->length();
    ++count;
    cur = cur->next();
  } while (cur != head && count < iov.size());

  ssize_t n = ::writev(fd, iov.data(), count);
  return n;   // partial write 처리는 별도
}
```

`writev` 한 번에 chain 전체가 송신된다. 각 IOBuf를 별도 copy하지 않는다.

Folly의 `AsyncSocket::writeChain()`이 이 패턴을 추상화한다.

## 패턴 3 — protocol layer stack

```cpp
// HTTP response = header + body
auto header = serializeHeader(...);   // IOBuf
auto body = std::move(bodyChain);     // IOBuf chain (file에서 읽음)

// prepend → 복사 없이 chain 앞에 잇기
header->prependChain(std::move(body));

socket->writeChain(std::move(header));
```

header를 body 앞에 prepend할 때 copy가 0회다. linked list에 노드를 잇는 것뿐이다.

## 패턴 4 — file → socket (sendfile 보완)

`sendfile`은 kernel 안에서 file → socket을 보낸다. user-space를 전혀 거치지 않는다.

```cpp
// sendfile은 raw fd로 — IOBuf와 무관
ssize_t n = ::sendfile(socketFd, fileFd, &offset, count);
```

그러나 *header를 함께* 보내야 한다면 IOBuf 패턴이 유용하다.

```cpp
// header는 IOBuf로, body는 sendfile로 분리
socket->writeChain(std::move(headerBuf));
// 다음으로
::sendfile(socketFd, fileFd, &offset, bodySize);
```

또는 *mmap된 file*을 IOBuf로 wrap한다.

```cpp
void* mapped = mmap(nullptr, size, PROT_READ, MAP_PRIVATE, fileFd, 0);
auto buf = folly::IOBuf::takeOwnership(
    mapped, size, [mapped, size] { munmap(mapped, size); });
// buf는 file의 page를 직접 가리킴, copy 없음
header->prependChain(std::move(buf));
socket->writeChain(std::move(header));
```

## 패턴 5 — broadcast/fan-out

같은 buffer를 N개 receiver에 보낼 때.

```cpp
auto data = ...;   // 큰 message

for (auto& client : clients) {
  auto cloned = data->clone();   // ref-count++, data 공유
  client->writeChain(std::move(cloned));
}
```

`clone`은 ref-count만 늘린다. N개 copy 대신 *N개 reference*다. memory도 시간도 절약된다.

## 패턴 6 — pipe through transform

```cpp
folly::IOBufQueue in_q, out_q;

void onDataReceived(folly::IOBuf data) {
  in_q.append(std::move(data));

  while (auto frame = parseFrame(in_q)) {
    auto transformed = transform(std::move(frame));   // 가능하면 IOBuf 반환
    out_q.append(std::move(transformed));
  }

  flushOut();
}
```

transformation이 *byte 단위로 새 buffer를 만들지 않는 한*, 전체 파이프라인이 zero-copy를 유지한다.

## SO_ZEROCOPY (Linux)

Linux 4.14+의 `MSG_ZEROCOPY` 플래그는 `send()`/`sendmsg()`가 user-space buffer를 *kernel page에 직접* 매핑해 보낸다. user → kernel copy도 0이 된다.

```cpp
int one = 1;
setsockopt(fd, SOL_SOCKET, SO_ZEROCOPY, &one, sizeof(one));

iovec iov = {data, len};
msghdr msg = {.msg_iov = &iov, .msg_iovlen = 1};
sendmsg(fd, &msg, MSG_ZEROCOPY);
// 완료는 cmsg로 비동기 통보
```

Folly의 `AsyncSocket`은 `setZeroCopy(true)`로 이를 활성화한다. IOBuf chain이 *그대로 kernel에 매핑*된다.

## 단점 — zero-copy의 비용

zero-copy가 항상 좋지는 않다.

- 작은 buffer(<4KB)는 *copy 비용이 zero-copy setup 비용보다 낮다*.
- ref-count atomic operation 자체도 비용이다.
- mmap/munmap 오버헤드가 크다.

벤치마크해서 *실제 이득이 있는 임계점*을 찾는다. 일반적으로 1KB 이상의 buffer에서 의미가 있다.

## 코드 리뷰 포인트

- **`writev`/`sendmsg`가 IOBuf chain을 직접 받는가?** 별도 buffer로 합치면 copy 발생.
- **header가 prepend되는가?** chain 앞에 노드만 잇는다.
- **broadcast가 N copy?** `clone`으로 ref-count 공유.
- **chain length가 너무 길지 않은가?** iovec 한계(보통 1024) 초과면 multi-call 필요.

## 자주 보는 안티패턴

```cpp
// 1. chain을 single buffer로 합쳐서 write
auto coalesced = chain->coalesce();   // 전체 copy 1회
write(fd, coalesced.data(), coalesced.size());
// 옳음: writev에 chain 직접

// 2. clone 대신 copy
auto data = original->clone();   // ref-count
// vs
auto data = folly::IOBuf::copyBuffer(original->data(), original->length());   // copy

// 3. wrapBuffer 후 lifetime 미관리
std::string tmp = ...;
auto buf = folly::IOBuf::wrapBuffer(tmp.data(), tmp.size());
return buf;   // tmp 소멸 — dangling

// 4. zero-copy를 작은 message에 적용
for (auto& msg : small_messages) {   // 100B 짜리
  socket->writeChain(folly::IOBuf::takeOwnership(...));
  // 작은 메시지는 copy가 더 싸다
}
```

## std와 비교

표준에는 *byte buffer chain*이 없다. `std::vector<std::span<std::byte>>` 비슷한 구조를 만들 수 있지만 ref-count, prepend, splitting을 직접 구현해야 한다.

C++23의 `std::span`과 P2300 senders/receivers가 결합되면 비슷한 패턴이 표준화될 수 있다. 그러나 *IOBuf만큼 풍부한* primitive는 당분간 표준에 없다.

## 정리

- IOBuf chain은 *그 자체로 iovec*다. `writev`/`readv`가 chain을 직접 처리한다.
- recv는 `IOBufQueue::preallocate`로 zero-copy, send는 `AsyncSocket::writeChain`으로 zero-copy.
- protocol layer stack은 prepend로 header를 *복사 없이* 잇는다.
- broadcast는 `clone()`으로 ref-count 공유. N copy를 N ref로 바꾼다.
- mmap된 file은 `takeOwnership`으로 IOBuf chain에 섞을 수 있다.
- Linux `SO_ZEROCOPY`와 결합하면 user→kernel copy도 0이 된다.
- 작은 buffer는 zero-copy가 오히려 비싸다. 벤치마크로 확인.

## 다음 편

[Part 4-05: IOBuf shared semantics](/blog/programming/code-review/folly/part4-05-iobuf-shared-semantics)에서 ref-count의 자세한 의미를 본다.

## 관련 항목

- [Folly Part 4-01 — IOBuf](/blog/programming/code-review/folly/part4-01-iobuf)
- [Folly Part 4-02 — IOBufQueue](/blog/programming/code-review/folly/part4-02-iobuf-queue)
- [Folly Part 4-05 — IOBuf shared semantics](/blog/programming/code-review/folly/part4-05-iobuf-shared-semantics)
