---
title: "folly::io::Cursor·RWCursor — chain 위의 stream"
date: 2026-06-05T09:02:00
description: "Cursor는 IOBuf chain을 단일 stream처럼 읽고 쓰는 추상화. endian-safe primitive read와 chain 자동 순회를 제공한다."
series: "Folly Code Review"
seriesOrder: 20
tags: [cpp, folly, iobuf, cursor, stream]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true
---

> **한 줄 요약**: `folly::io::Cursor`는 IOBuf chain 위를 *단일 byte stream처럼* 순회한다. chain 경계를 자동으로 넘기고 endian-safe primitive read/write를 제공한다.

## 동기 — chain 위 parse의 boilerplate

IOBuf chain을 직접 parse하면 *chain 경계*가 매번 문제다.

```cpp
// chain 직접 — boilerplate
uint32_t readU32(IOBuf* buf, size_t offset) {
  IOBuf* cur = buf;
  while (cur && offset >= cur->length()) {
    offset -= cur->length();
    cur = cur->next();
  }
  // cur에 [offset, offset+4)이 들어맞는지 확인
  // 안 맞으면 다음 buffer로 넘어가서 합쳐서 읽기
  ...
}
```

이 로직이 모든 primitive read마다 필요하다. `Cursor`는 이를 추상화한다.

## 기본 사용

```cpp
#include <folly/io/Cursor.h>

auto buf = ...;   // IOBuf chain

folly::io::Cursor cur(buf.get());

uint32_t magic = cur.readBE<uint32_t>();   // big-endian
uint8_t type = cur.read<uint8_t>();
uint64_t size = cur.readLE<uint64_t>();    // little-endian

// 문자열 읽기
std::string name = cur.readFixedString(16);

// 가변 길이
auto body = std::make_unique<folly::IOBuf>(folly::IOBuf::create(size));
cur.pull(body->writableTail(), size);
body->append(size);

// 남은 길이
size_t remaining = cur.totalLength();
```

`Cursor`는 *read-only*다. write는 `RWCursor`를 쓴다(아래).

## 핵심 메서드

```cpp
// folly/io/Cursor.h (요약)
class CursorBase {
 public:
  // peek (advance 안 함)
  template <class T> T peekBE() const;
  template <class T> T peekLE() const;
  template <class T> T peek() const;

  // read (advance)
  template <class T> T readBE();
  template <class T> T readLE();
  template <class T> T read();

  // pull bytes
  void pull(void* buf, size_t n);
  size_t pullAtMost(void* buf, size_t n);

  // skip
  void skip(size_t n);
  size_t skipAtMost(size_t n);

  // clone — 같은 chain, 다른 cursor
  CursorBase clone() const;

  // accessors
  size_t totalLength() const;
  bool isAtEnd() const;
};
```

## RWCursor — write 가능 Cursor

```cpp
#include <folly/io/Cursor.h>

auto buf = folly::IOBuf::create(1024);
buf->append(64);   // 64 bytes 영역 확보

folly::io::RWCursor cur(buf.get());

cur.writeBE<uint32_t>(0xDEADBEEF);
cur.writeBE<uint32_t>(0x12345678);
cur.write<uint8_t>(0xFF);
```

`RWCursor`는 *기존 IOBuf의 data를 덮어쓴다*. 새 buffer를 만들지 않는다. data가 chain 경계에 걸치면 *각 buffer에 부분적으로* 쓴다.

## QueueAppender — 늘려 쓰는 cursor

```cpp
folly::IOBufQueue q;
folly::io::QueueAppender app(&q, 4096);   // chunk 4096

app.writeBE<uint32_t>(0xDEADBEEF);
app.push(reinterpret_cast<const uint8_t*>("hello"), 5);
app.write<uint8_t>(0xFF);

// q에 모두 들어감
```

`QueueAppender`는 *queue를 늘려가며* 쓴다. tailroom이 부족하면 새 IOBuf를 만들어 chain에 추가한다. *protocol message serializer*의 표준 구현이다.

## endian-safe primitive

```cpp
// 네트워크 byte order = big-endian
cur.writeBE<uint16_t>(port);
cur.writeBE<uint32_t>(addr);

// 일부 protocol은 little-endian (Windows API 등)
cur.writeLE<uint64_t>(timestamp);

// host-endian (보통 little)
cur.write<uint32_t>(localValue);
```

`readBE`/`writeBE`는 내부적으로 `__builtin_bswap32` 등을 사용한다. portability 보장.

## 실전 — protocol parser

```cpp
struct Header {
  uint32_t magic;
  uint8_t version;
  uint8_t type;
  uint16_t flags;
  uint32_t length;
};

Header parseHeader(folly::IOBufQueue& q) {
  if (q.chainLength() < sizeof(Header)) {
    throw std::runtime_error("not enough data");
  }
  folly::io::Cursor cur(q.front());
  Header h;
  h.magic = cur.readBE<uint32_t>();
  h.version = cur.read<uint8_t>();
  h.type = cur.read<uint8_t>();
  h.flags = cur.readBE<uint16_t>();
  h.length = cur.readBE<uint32_t>();
  return h;
}
```

queue에서 *header만 peek*하고 body는 split으로 빼내는 패턴이다.

## skip vs pull

```cpp
// pull — buffer로 복사
char temp[64];
cur.pull(temp, 64);

// skip — 그냥 건너뜀
cur.skip(64);

// pullAtMost — 부분도 OK
size_t n = cur.pullAtMost(temp, 64);

// skipAtMost — 마찬가지
size_t skipped = cur.skipAtMost(64);
```

unrecognized field를 *처리 없이 넘길* 때 skip이 효율적이다.

## clone — 같은 위치에서 분기

```cpp
auto cur1 = folly::io::Cursor(buf.get());

auto magic = cur1.peekBE<uint32_t>();
if (magic == kVersion1) {
  parseV1(cur1);
} else {
  // 다른 parsing 시도
  auto cur2 = cur1.clone();
  parseV2(cur2);
  // cur1은 여전히 원래 위치 유지
}
```

`clone()`은 *같은 chain의 다른 cursor*를 만든다. ref-count 증가 없이, 단순히 같은 위치를 가리킨다.

## std::istream과 비교

`std::istream`은 char by char를 읽지만 IOBuf chain을 *직접* 다루지 못한다. byte buffer 전체를 미리 합쳐야 한다.

| 항목 | std::istream | folly::io::Cursor |
|------|--------------|---------------------|
| 입력 | flat byte buffer | IOBuf chain |
| endian | 사용자가 직접 | readBE/readLE |
| zero-copy | 불가 | 자연스러움 |
| peek | `.peek()` (1 byte) | `.peek<T>()` |
| 분기 | tellg/seekg | clone |

`Cursor`가 *훨씬 가볍고 표현적*이다.

## 코드 리뷰 포인트

- **endian이 명시적인가?** `read<T>()`는 host-endian. network protocol이면 `readBE`/`readLE`.
- **`pull` 후 `skip`이 빠지진 않았는가?** pull은 advance하지만 어떤 코드는 skip + pull을 섞는다.
- **`isAtEnd()` 체크?** stream 끝에서 read하면 throw된다.
- **`RWCursor`로 read-only buffer를 쓰지 않았는가?** clone()된 buffer 쓰면 ref-count share buffer를 mutate.

## 자주 보는 안티패턴

```cpp
// 1. endian 잘못
cur.read<uint32_t>();   // host-endian — network protocol이면 BE 필요

// 2. 길이 검증 없이 read
auto h = cur.read<Header>();   // 모자라면 throw — 부분 도착 처리 안 됨
// 옳음:
if (cur.totalLength() < sizeof(Header)) return std::nullopt;

// 3. RWCursor + cloned buffer
auto cloned = buf->clone();
folly::io::RWCursor cur(cloned.get());
cur.writeBE<uint32_t>(0);   // 원본 buf의 data도 바뀜 — share

// 4. struct를 raw read
struct Pkt { uint32_t a; uint64_t b; };
auto p = cur.read<Pkt>();   // padding/alignment 위험 — 필드별로 읽자
```

## 정리

- `folly::io::Cursor`는 IOBuf chain을 단일 stream처럼 read한다. chain 경계를 자동으로 넘긴다.
- `RWCursor`는 기존 chain을 *덮어 쓴다*. `QueueAppender`는 *queue를 늘려가며* 쓴다.
- endian-safe primitive(`readBE`/`writeBE`/`readLE`/`writeLE`)를 제공한다.
- `clone()`으로 같은 위치에서 *분기 parsing*이 가능하다.
- `skip`/`pull`을 적절히 섞어 unrecognized field를 효율적으로 처리한다.
- protocol parser/serializer의 표준 도구다.

## 다음 편

[Part 4-04: Zero-copy 패턴](/blog/programming/code-review/folly/part4-04-zero-copy-patterns)에서 IOBuf 기반 zero-copy 송수신 패턴을 본다.

## 관련 항목

- [Folly Part 4-01 — IOBuf](/blog/programming/code-review/folly/part4-01-iobuf)
- [Folly Part 4-02 — IOBufQueue](/blog/programming/code-review/folly/part4-02-iobuf-queue)
- [Folly Part 4-04 — Zero-copy 패턴](/blog/programming/code-review/folly/part4-04-zero-copy-patterns)
