---
title: "Part 4-05: IOBuf shared semantics — clone / unshare / takeOwnership"
date: 2026-05-23T22:00:00
description: "IOBuf의 ref-count는 buffer share를 표현한다. clone/unshare/takeOwnership의 의미를 정확히 이해해야 zero-copy가 안전하다."
series: "Folly Code Review"
seriesOrder: 22
tags: [cpp, folly, iobuf, shared, semantics]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true
---

> **한 줄 요약**: IOBuf의 *buffer*와 *node*는 별개다. `clone`은 buffer를 공유하고 node를 새로 만든다. `unshare`는 buffer를 분리한다. 이 구분이 zero-copy의 안전성을 결정한다.

## 동기 — share의 두 층위

IOBuf의 구조를 다시 본다.

![IOBuf — node vs shared buffer](/images/blog/folly/diagrams/part4-05-iobuf-shared.svg)

**buffer**는 *실제 byte 영역*과 SharedInfo다. **node**는 *그 buffer를 가리키는 IOBuf 객체*다.

share할 수 있는 것은 *buffer*다. 여러 IOBuf node가 *같은 buffer를 가리킬* 수 있다. 각 node는 독립된 chain link, 독립된 data_/length를 가질 수 있다(같은 buffer의 다른 부분).

## clone — 같은 buffer를 가리키는 새 node

```cpp
auto a = folly::IOBuf::create(1024);
a->append(100);

auto b = a->clone();
// b는 새 node, a와 같은 buffer를 가리킴
// a->data() == b->data()
// SharedInfo.refcount = 2
```

clone은 *얕은 복사*다. node는 새로 만들지만 buffer는 공유한다. ref-count가 0이 될 때까지 buffer는 살아 있다.

## unshare — buffer copy로 분리

```cpp
auto b = a->clone();   // ref-count = 2
b->unshare();           // b만의 buffer로 복사 — ref-count = 1, 1

b->writableData()[0] = 'x';   // a는 영향 없음
```

`unshare`는 *write 전 분리*다. 자기만의 buffer로 copy하고 ref-count를 분리한다. *copy-on-write*의 수동 버전이다.

![Copy-on-Write split](/images/blog/cpp-concepts/diagrams/cow-copy-on-write.svg)

`fbstring`이 write를 가로채 자동으로 unshare를 수행한다면, IOBuf는 *명시적으로* `unshare()`를 부르는 모델이다. 같은 원리, 다른 정책 — IOBuf의 buffer는 보통 더 크고 unshare 비용이 더 크기 때문에 의사 결정을 호출자에게 위임한다.

```cpp
// folly/io/IOBuf.cpp (개념)
void IOBuf::unshareOne() {
  if (isSharedOne()) {
    // 새 buffer 할당 + copy
    auto newBuf = ...;
    std::memcpy(newBuf, data_, length_);
    // 기존 SharedInfo decref, 새 SharedInfo
    decrementRefcount();
    setNewBuffer(newBuf);
  }
}
```

## clone vs cloneOne vs cloneAsValue

```cpp
auto chain = ...;   // 3-node chain

auto a = chain->clone();          // 전체 chain clone, ref-count 모두 share
auto b = chain->cloneOne();       // 첫 node만 clone, 나머지 chain은 없음
auto c = chain->cloneAsValue();   // unique_ptr 대신 IOBuf 값
```

- `clone()` — 전체 chain의 모든 node share
- `cloneOne()` — 단일 node만 share
- `cloneCoalesced()` — 새 buffer 하나로 chain 합치기 (zero-copy 아님)

## takeOwnership — 외부 메모리 wrap

```cpp
uint8_t* mem = (uint8_t*)malloc(1024);
auto buf = folly::IOBuf::takeOwnership(
    mem, 1024,            // 시작, 크기
    [mem](void*, void*) { free(mem); });   // free callback

// buf의 ref-count가 0이 되면 callback 호출
```

callback의 두 인자는 `(data, userData)`다. userData는 SharedInfo에 보관할 추가 context다.

```cpp
// mmap 예
void* mapped = mmap(nullptr, size, PROT_READ, MAP_PRIVATE, fd, 0);
auto buf = folly::IOBuf::takeOwnership(
    mapped, size,
    [size](void* p, void*) { munmap(p, size); });
```

## wrapBuffer — read-only, lifetime 미관리

```cpp
const char* msg = "hello";
auto buf = folly::IOBuf::wrapBuffer(msg, 5);
// buf의 ref-count = 0 (관리 안 함)
// msg의 lifetime은 caller가 보장
```

`wrapBuffer`는 *zero-cost wrap*이다. ref-count도 없고, free 콜백도 없다. *caller가 lifetime을 보장*해야 한다.

좋은 사용:
- string literal
- static buffer
- caller가 lifetime을 *확실히* 길게 잡은 buffer

위험:
- stack-local buffer
- temporary container의 buffer
- lambda capture로 share되는 buffer

## SharedInfo — 내부

```cpp
// folly/io/IOBuf.h (요약)
struct SharedInfo {
  FreeFunction freeFn;     // free 콜백
  void* userData;          // 콜백에 전달할 context
  std::atomic<uint32_t> refcount{1};
  uint8_t externallyShared{0};   // 외부 reference 표시
};
```

`refcount`는 atomic이다. 모든 clone/unshare/destroy는 atomic operation을 거친다. 비용은 *uncontended 시 ~5ns*, contended 시 *훨씬 더*.

## externallyShared — 외부 참조 추적

```cpp
auto a = folly::IOBuf::create(1024);
auto b = a->clone();

a->markExternallySharedOne();   // 외부 코드가 a의 buffer를 본다고 표시

b->isShared();   // true — refcount > 1
b->isExternallyShared();   // true — externallyShared 비트
```

`externallyShared`는 *코드 외부에서* buffer를 보고 있을 때 사용한다. 예를 들어 raw pointer를 다른 thread에 넘긴 경우. refcount로는 안 잡힌다.

## chain의 ref-count

chain은 *node별로 buffer가 다를 수 있다*. clone은 *각 node를 개별 clone*해 각 buffer의 refcount를 늘린다.

```cpp
auto chain = makeThreeNodeChain();
auto cloned = chain->clone();
// 3개 node 모두 새로 만들고, 각각 자기 buffer의 refcount 증가
```

`unshareChain()`은 *chain의 모든 node를 unshare*한다.

```cpp
chain->unshareChain();   // 모든 node 자기 buffer로 분리
```

## 안전 규칙

1. **shared buffer에 write 금지**. `isShared()` 또는 `unshare()` 후 write.
2. **wrapBuffer는 lifetime을 caller가 보장**. heap/stack 구분.
3. **takeOwnership의 free callback이 thread-safe 한지 확인**. ref-count가 어느 thread에서 0이 될지 모름.
4. **clone 후 chain pointer를 caller에 노출하면 안 됨**. clone은 *새 chain*이지만 *같은 buffer*다.

## 코드 리뷰 포인트

- **`writableData()` 호출 전 `isShared()` 체크?** shared면 silent corruption.
- **`takeOwnership`의 free callback이 다른 destructor와 race하지 않는가?** atomic decrement 후 호출됨.
- **`wrapBuffer`의 lifetime이 명확한가?** 같은 함수 안에서 사용/소멸이 보이는가.
- **chain 전체를 clone하는데 외부에서는 node 하나만 본다고 가정하지 않는가?** clone vs cloneOne 구분.

## 자주 보는 안티패턴

```cpp
// 1. clone 후 mutation
auto b = a->clone();
b->writableData()[0] = 'x';   // a도 바뀜
// 옳음:
b->unshare();
b->writableData()[0] = 'x';

// 2. wrapBuffer + temporary
auto buf = folly::IOBuf::wrapBuffer(makeTempString().data(), 5);
// makeTempString() 소멸 — buf dangling

// 3. takeOwnership에서 다른 IOBuf와 share된 메모리
auto buf1 = folly::IOBuf::create(1024);
auto buf2 = folly::IOBuf::takeOwnership(
    buf1->writableData(), 100,   // buf1과 same buffer
    [](void*, void*) { /* nothing */ });
// buf1 또는 buf2 destroy 시 double free 또는 use-after-free

// 4. 다른 thread에서 unshare 도중 read
// thread 1: buf->unshareOne();    // 새 buffer 할당 중
// thread 2: read(buf->data());    // race
// IOBuf의 unshare는 thread-safe 아니다 — node 단위 sync 필요
```

## std::shared_ptr와 비교

`std::shared_ptr<T>`는 *T 전체*를 ref-count 관리한다. IOBuf의 `clone`은 *buffer를 share*하지만 *node는 독립*이다.

| 항목 | std::shared_ptr<T> | folly::IOBuf clone |
|------|---------------------|---------------------|
| 공유 단위 | 전체 객체 | buffer만 |
| ref-count 위치 | control block | SharedInfo |
| 분리 | 항상 deep copy | unshare로 buffer만 copy |
| 분기 view | weak_ptr/aliasing constructor | 자연스러움 |

`shared_ptr<T> + aliasing constructor`로 비슷한 모양을 만들 수 있지만 *IOBuf는 chain까지 표현*해 더 풍부하다.

## 정리

- IOBuf의 *node*와 *buffer*는 별개다. node는 chain의 link, buffer는 byte 영역.
- `clone`은 buffer를 share하고 새 node를 만든다(얕은 복사).
- `unshare`는 buffer를 자기만의 copy로 분리한다(write 전 안전).
- `takeOwnership`은 외부 메모리를 ref-count로 관리한다.
- `wrapBuffer`는 zero-cost wrap이지만 lifetime은 caller 책임.
- `SharedInfo.refcount`는 atomic. 외부 참조는 `externallyShared` 비트로 표시.
- shared buffer에 write 금지. 항상 `isShared`/`unshare` 후 write.

## 다음 편

Part 5부터 String/Format을 본다. 이 시리즈의 Part 1-4가 Folly의 *async + I/O* 핵심을 다뤘다.

## 관련 항목

- [Folly Part 4-01 — IOBuf](/blog/programming/code-review/folly/part4-01-iobuf)
- [Folly Part 4-04 — Zero-copy 패턴](/blog/programming/code-review/folly/part4-04-zero-copy-patterns)
- [Effective Modern C++ Item 19](/blog/programming/cpp/effective-modern-cpp/item19-use-shared-ptr-for-shared-ownership) — shared_ptr 비교
