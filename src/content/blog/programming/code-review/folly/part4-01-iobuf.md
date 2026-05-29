---
title: "Part 4-01: folly::IOBuf — zero-copy buffer chain의 기본 단위"
date: 2026-05-23T18:00:00
description: "IOBuf는 ref-counted byte buffer chain. network 코드의 zero-copy 패턴을 표현하는 Folly의 핵심 자료구조다."
series: "Folly Code Review"
seriesOrder: 18
tags: [cpp, folly, iobuf, zero-copy, buffer]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true
---

> **한 줄 요약**: `IOBuf`는 ref-counted byte buffer의 *연결 리스트*다. 네트워크 코드에서 *복사 없이 buffer를 분할/결합*해 protocol layer를 쌓는다.

## 동기 — 왜 std::vector<uint8_t>로는 안 되는가

네트워크 코드는 buffer를 *조합/분할*한다.

```text
HTTP Response = [header bytes] + [chunked body] + [trailer]
```

`std::vector<uint8_t>`로 표현하면 *연결할 때마다 복사*가 일어난다. 100KB body에 1KB header를 prepend하면 101KB copy다. 10K connection에 매번 이러면 매초 1GB의 memcpy다.

`IOBuf`는 다른 접근이다. 각 조각을 *별도 buffer로 두고 linked list로 연결*한다. prepend는 새 buffer를 list 앞에 잇는 것이고 copy가 없다.

```text
header IOBuf ──▶ body IOBuf ──▶ trailer IOBuf
   [128B]          [102400B]        [16B]
```

write 시에는 *scatter-gather* I/O(`writev`)로 각 buffer를 그대로 socket에 보낸다. 끝까지 *zero-copy*다.

## 할당 모델 — 왜 arena가 자연스러운가

IOBuf 노드 자체와 그 옆의 짧은 lifetime 객체(parser 상태, decoder context 등)는 request 단위로 묶여 만들어지고 응답이 나가면 한꺼번에 사라진다. 이런 패턴엔 arena가 정확히 맞다.

![Arena allocator userspace](/images/blog/cpp-concepts/diagrams/arena-allocator-userspace.svg)

bump pointer로 노드 alloc은 O(1)이고, request 끝에 arena를 reset해 모든 노드를 한 번에 free한다. per-node free list 탐색이나 단편화가 없다.

## 메모리 레이아웃

![IOBuf circular chain](/images/blog/folly/diagrams/part4-01-iobuf-chain.svg)

```cpp
// folly/io/IOBuf.h (요약)
class IOBuf {
  uint8_t* data_;          // 현재 valid data 시작
  uint64_t length_;        // valid data 크기
  uint8_t* buf_;           // 전체 buffer 시작
  uint64_t capacity_;      // 전체 buffer 크기

  IOBuf* next_;            // chain 다음
  IOBuf* prev_;            // chain 이전

  SharedInfo* shared_;     // ref-count
  uint64_t flagsAndSharedInfo_;
};
```

핵심 관계.

![IOBuf Memory Layout](/images/blog/folly/diagrams/part4-01-iobuf-layout.svg)

- **headroom** — `data_ - buf_`. *앞쪽 여유*. prepend 시 사용.
- **tailroom** — `capacity_ - (data_ - buf_) - length_`. *뒤쪽 여유*. append 시 사용.

이 구조 덕에 header를 *복사 없이 앞에 붙일 수 있다*. data_를 앞으로 옮기고 그 자리에 header를 쓴다.

## 기본 사용

```cpp
#include <folly/io/IOBuf.h>

// 1) 새 IOBuf 생성
auto buf = folly::IOBuf::create(1024);          // capacity 1024
buf->append(100);                                // length를 100으로

// 2) 데이터 쓰기
std::memcpy(buf->writableTail() - 100, "hello", 5);

// 3) headroom 활용
buf->reserve(64, 0);   // 앞에 64B 여유
buf->prepend(10);       // length가 10 늘어남, data_가 앞으로

// 4) chain 연결
auto buf2 = folly::IOBuf::create(2048);
buf2->append(500);
buf->prependChain(std::move(buf2));   // buf ← buf2

// 5) 전체 길이
size_t total = buf->computeChainDataLength();
```

## ref-counted shared buffer

```cpp
auto a = folly::IOBuf::create(1024);
a->append(100);

auto b = a->clone();   // ref-count 증가, data 공유
// a와 b는 같은 buffer를 가리킴 — copy 없음

a->writableData()[0] = 'x';
// b->data()[0] 도 'x' — 의도하지 않은 mutation 가능
```

`clone()`은 `SharedInfo` ref-count만 늘린다. *공유 buffer의 mutation*은 위험하다. `unshare()`로 *write 전 분리*하거나, *read-only로만 다룬다*.

```cpp
auto b = a->clone();
b->unshare();   // 자기 카피 생성, ref-count 분리
b->writableData()[0] = 'x';   // 안전
```

## takeOwnership — 외부 메모리 wrap

```cpp
uint8_t* external = ...;   // 외부 할당
auto buf = folly::IOBuf::takeOwnership(external, length, [external] {
  free(external);
});
```

`takeOwnership`은 *외부 메모리를 IOBuf로 wrap*한다. ref-count가 0이 되면 lambda(free)가 호출된다. mmap-ed buffer, kernel-allocated buffer 등을 IOBuf chain에 섞을 수 있다.

## wrapBuffer — read-only wrap

```cpp
const char* msg = "hello";
auto buf = folly::IOBuf::wrapBuffer(msg, 5);
// buf는 msg를 가리킴, ref-count 없음, free 안 함
```

`wrapBuffer`는 *수명 관리 없이* 외부 buffer를 가리키는 IOBuf를 만든다. lifetime은 caller가 보장해야 한다.

## chain 순회

```cpp
auto current = buf.get();
do {
  std::cout << "len=" << current->length() << "\n";
  current = current->next();
} while (current != buf.get());
```

chain은 *circular doubly-linked list*다. `next()`가 head로 돌아오면 한 바퀴 돈 것이다.

## std와 비교

| 작업 | std::vector | folly::IOBuf |
|------|-------------|--------------|
| prepend 1KB | O(N) copy | O(1) chain |
| split | substring copy | `splitAtMost()` O(1) |
| chain serialize | concatenate | writev scatter-gather |
| share | copy | clone (ref-count) |
| 외부 memory wrap | 불가 | takeOwnership |

trade-off는 명확하다. IOBuf는 *flat byte buffer*가 아니다. random access가 *chain 순회*를 요구한다. scan/parse는 `folly::io::Cursor`(Part 4-03)로 추상화한다.

## 적합한 사용

**IOBuf 권장**:
- network 송수신 buffer
- protocol header/body 조합
- streaming pipe (file → network)
- zero-copy I/O 가 필요한 곳

**std::vector 권장**:
- 임의 접근이 빈번
- buffer 크기가 작고 *복사 비용이 무시 가능*
- 외부 라이브러리 인터페이스 (byte array as flat)

## 코드 리뷰 포인트

- **이 buffer를 prepend/append가 잦은가?** IOBuf 후보.
- **buffer를 두 곳에서 share하는가?** clone + ref-count.
- **외부 메모리를 wrap하는가?** takeOwnership(소유 인계) vs wrapBuffer(read-only).
- **chain 순회에서 head를 빠뜨리지 않았는가?** circular list이므로 do-while로 head 포함.

## 자주 보는 안티패턴

```cpp
// 1. clone 후 mutation
auto b = a->clone();
b->writableData()[0] = 'x';   // a의 데이터도 바뀜 — unshare() 먼저

// 2. wrapBuffer + lifetime 미준수
auto buf = folly::IOBuf::wrapBuffer(tempStr.data(), tempStr.size());
return buf;   // tempStr 소멸 — buf는 dangling

// 3. chain 길이를 매번 computeChainDataLength
for (...) {
  if (buf->computeChainDataLength() > N) ...   // O(chain length) — 매번
}
// 캐시하거나 IOBufQueue로

// 4. IOBuf chain 위에서 직접 parse
parse(buf->data(), buf->length());   // chain의 첫 노드만 본다 — 잘못
// → Cursor 사용
```

## 정리

- `IOBuf`는 ref-counted byte buffer의 circular doubly-linked list다.
- headroom/tailroom 덕에 prepend/append가 *복사 없이* 가능하다.
- `clone()`은 ref-count를 늘리고, `unshare()`로 분리한다.
- `takeOwnership`/`wrapBuffer`로 외부 메모리를 chain에 섞는다.
- random access는 `Cursor`로, queue 관리는 `IOBufQueue`로 추상화한다.
- 네트워크 코드의 zero-copy 패턴의 *기본 단위*다.

## 다음 편

[Part 4-02: IOBufQueue](/blog/programming/code-review/folly/part4-02-iobuf-queue)에서 chain 관리 헬퍼를 본다.

## 관련 항목

- [Folly Part 4-02 — IOBufQueue](/blog/programming/code-review/folly/part4-02-iobuf-queue)
- [Folly Part 4-03 — Cursor](/blog/programming/code-review/folly/part4-03-cursor)
- [Folly Part 4-05 — IOBuf shared semantics](/blog/programming/code-review/folly/part4-05-iobuf-shared-semantics)
