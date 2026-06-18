---
title: "folly::IOBufQueue — chain의 push/pull 추상화"
date: 2026-06-05T09:01:00
description: "IOBufQueue는 IOBuf chain의 append/prepend/split을 효율적으로 관리한다. streaming codec과 framing layer의 표준 도구다."
series: "Folly Code Review"
seriesOrder: 19
tags: [cpp, folly, iobuf, queue, buffer]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true
---

> **한 줄 요약**: `IOBufQueue`는 IOBuf chain의 *생산자/소비자 API*다. append/prepend/split-at-cursor를 효율적으로 제공해 streaming codec의 backbone이 된다.

## 동기 — IOBuf만으로는 불편하다

`IOBuf`는 자료구조 자체다. chain의 *append*, *prepend*, *N바이트 split*은 사용자가 직접 다뤄야 한다. 그 boilerplate가 너무 많다.

```cpp
// IOBuf 직접 — append
if (last->tailroom() >= newData.size()) {
  std::memcpy(last->writableTail(), newData.data(), newData.size());
  last->append(newData.size());
} else {
  auto next = folly::IOBuf::create(kPageSize);
  std::memcpy(next->writableTail(), newData.data(), newData.size());
  next->append(newData.size());
  head->prependChain(std::move(next));
}
```

이 패턴이 모든 streaming codec에서 반복된다. `IOBufQueue`가 이를 추상화한다.

## 기본 사용

![IOBufQueue append/trim](/images/blog/folly/diagrams/part4-02-iobuf-queue.svg)

```cpp
#include <folly/io/IOBufQueue.h>

folly::IOBufQueue q{folly::IOBufQueue::cacheChainLength()};

// 1) append
q.append("hello ", 6);
q.append("world", 5);

// 2) IOBuf 자체 append
auto buf = folly::IOBuf::create(1024);
buf->append(100);
q.append(std::move(buf));

// 3) preallocate — 큰 buffer 한 번 할당
auto [data, capacity] = q.preallocate(1024, 4096);   // 최소 1024, 최대 4096
size_t written = recv(fd, data, capacity, 0);
q.postallocate(written);

// 4) split — 앞 N바이트 빼오기
auto front = q.split(128);    // 정확히 128 bytes, 부족하면 throw
auto front2 = q.splitAtMost(128);   // 있는 만큼

// 5) move out
auto allData = q.move();   // queue 비우고 전체 chain 반환
```

## 핵심 메서드

```cpp
// folly/io/IOBufQueue.h (요약)
class IOBufQueue {
 public:
  static Options cacheChainLength() { return ...; }

  // append
  void append(StringPiece);
  void append(unique_ptr<IOBuf>&& buf);
  void append(IOBufQueue& other);

  // preallocate/postallocate — receive buffer 패턴
  std::pair<void*, size_t> preallocate(
      size_t minSize, size_t maxSize, size_t newAllocSize = 0);
  void postallocate(size_t n);

  // split
  unique_ptr<IOBuf> split(size_t n);          // 정확히 n
  unique_ptr<IOBuf> splitAtMost(size_t n);    // 있는 만큼

  // trim
  void trimStart(size_t);
  void trimEnd(size_t);

  // accessors
  size_t chainLength() const;   // O(1) if cacheChainLength()
  bool empty() const;

  // ownership transfer
  unique_ptr<IOBuf> move();
  const IOBuf* front() const;
};
```

`cacheChainLength()` 옵션은 *총 길이를 캐싱*해 O(1)에 알 수 있게 한다. 매번 chain을 순회하지 않는다.

## preallocate/postallocate — recv 패턴

```cpp
folly::IOBufQueue q{folly::IOBufQueue::cacheChainLength()};

while (running) {
  auto [data, cap] = q.preallocate(4096, 65536);
  ssize_t n = ::recv(fd, data, cap, 0);
  if (n <= 0) break;
  q.postallocate(n);

  // q에서 framing parser로 넘기기
  while (auto frame = parseFrame(q)) {
    handle(std::move(frame));
  }
}
```

`preallocate`는 *큰 빈 buffer*를 한 번에 확보한다. recv 한 번에 64KB까지 받아도 단일 IOBuf로 처리된다. `postallocate(n)`이 실제 받은 만큼 chain에 commit한다.

이 패턴이 *모든 zero-copy network read*의 표준이다.

## split — framing layer의 핵심

```cpp
// 5-byte length-prefixed frame parser
std::unique_ptr<folly::IOBuf> parseFrame(folly::IOBufQueue& q) {
  if (q.chainLength() < 5) return nullptr;   // 헤더 미달

  // 헤더 peek (split하지 않고 읽기)
  folly::io::Cursor cur(q.front());
  uint32_t magic = cur.readBE<uint32_t>();
  uint8_t type = cur.read<uint8_t>();

  if (q.chainLength() < 5 + bodySize(type)) return nullptr;

  q.trimStart(5);                  // 헤더 버리기
  return q.split(bodySize(type));   // body만 추출
}
```

framing layer는 *부분 도착*을 다룬다. recv 한 번에 frame 하나가 안 올 수도 있다. IOBufQueue는 *남은 bytes를 chain에 유지*하므로 다음 recv에 자연스레 이어 붙는다.

## IOBuf 직접 vs IOBufQueue

```cpp
// IOBuf 직접 — boilerplate 많음
unique_ptr<IOBuf> head;
IOBuf* tail = nullptr;
size_t totalLen = 0;
// append:
//   - tailroom 체크
//   - 부족하면 새 buffer 할당
//   - prependChain
//   - totalLen += n

// IOBufQueue — 한 줄
q.append(data, n);
```

queue가 head/tail/length를 *내부적으로 관리*한다. tailroom 활용, buffer 분할/병합도 모두 자동이다.

## std::deque<std::vector<uint8_t>>와 비교

비슷한 *byte queue*를 표준으로 만들면 `std::deque<std::vector<uint8_t>>` 또는 단일 `std::vector` 다.

| 작업 | std::deque<vector> | folly::IOBufQueue |
|------|--------------------|--------------------|
| append small (n B) | 새 vector 또는 마지막에 push | tailroom에 memcpy |
| recv into | 별도 임시 buffer + 복사 | preallocate로 직접 |
| split front | 복사 | O(1) IOBuf 분리 |
| writev | 별도 iovec 만들기 | chain 그대로 iovec |

queue 자체의 메모리 효율도 IOBufQueue가 우세하다. 빈 vector의 overhead가 없다.

## 코드 리뷰 포인트

- **`cacheChainLength()` 사용?** O(1) chainLength가 필요한 곳이면 켠다.
- **`preallocate` minSize가 너무 작지 않은가?** 매 recv마다 새 buffer면 효율 떨어짐. 4KB 정도가 보통.
- **split/splitAtMost 구분?** 정확히 필요하면 split, 부분도 OK면 splitAtMost.
- **이 queue를 cross-thread share하는가?** thread-safe 아님. 각 thread에 자기 queue를 둔다.

## 자주 보는 안티패턴

```cpp
// 1. recv 후 복사
char tmp[4096];
ssize_t n = recv(fd, tmp, sizeof(tmp), 0);
q.append(tmp, n);   // tmp → IOBuf로 복사 한 번 더
// 옳음:
auto [data, cap] = q.preallocate(4096, 65536);
ssize_t n = recv(fd, data, cap, 0);
q.postallocate(n);

// 2. chainLength를 매번 호출 (cache 없이)
folly::IOBufQueue q;   // cacheChainLength 옵션 없음
while (q.chainLength() < N) ...   // 매번 O(chain length)

// 3. split 후 queue를 재사용 안 하고 새로 만듦
auto frame = q.split(n);
folly::IOBufQueue q2;   // 새로 만들 이유 없음 — q는 자동으로 줄어듦

// 4. 같은 queue를 두 thread에서 동시 append
std::thread t1([&] { q.append(...); });
std::thread t2([&] { q.append(...); });   // race
```

## 정리

- `IOBufQueue`는 IOBuf chain의 producer/consumer 추상화다.
- `preallocate`/`postallocate`는 zero-copy recv 패턴의 표준이다.
- `split`/`splitAtMost`는 framing layer의 핵심 도구다.
- `cacheChainLength()`로 O(1) chainLength를 켠다.
- thread-safe 아니다. 각 thread에 자기 queue를 둔다.
- streaming codec, RPC framing, protocol layer의 backbone이다.

## 다음 편

[Part 4-03: Cursor](/blog/programming/code-review/folly/part4-03-cursor)에서 chain 위의 stream-like read/write를 본다.

## 관련 항목

- [Folly Part 4-01 — IOBuf](/blog/programming/code-review/folly/part4-01-iobuf)
- [Folly Part 4-03 — Cursor](/blog/programming/code-review/folly/part4-03-cursor)
- [Folly Part 4-04 — Zero-copy 패턴](/blog/programming/code-review/folly/part4-04-zero-copy-patterns)
