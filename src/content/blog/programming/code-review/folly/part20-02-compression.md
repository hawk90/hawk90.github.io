---
title: "folly::io::Compression — zstd·lz4·snappy wrapper"
date: 2026-06-08T09:12:00
description: "folly::io::Codec — IOBuf 기반 통합 compression API. zstd/lz4/snappy를 같은 인터페이스로."
series: "Folly Code Review"
seriesOrder: 84
tags: [cpp, folly, compression, zstd, lz4, snappy]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

> **한 줄 요약**: `folly::io::Codec`은 IOBuf를 입력/출력으로 받는 통합 compression 인터페이스다. zstd/lz4/snappy/zlib을 algorithm enum 한 번 바꿔 교체할 수 있다.

## 동기

production code는 다양한 compression을 쓴다. RPC payload는 lz4(빠름), 영구 저장은 zstd(고압축), 호환성이 필요한 자리는 zlib. 각 알고리즘의 API가 미묘하게 다르고 IOBuf chain 처리도 직접 짜야 한다.

`folly::io::Codec`은 단일 추상화.

```cpp
auto codec = folly::io::getCodec(folly::io::CodecType::ZSTD);
auto compressed = codec->compress(input);
auto decompressed = codec->uncompress(compressed.get());
```

CodecType만 바꾸면 알고리즘 교체. benchmark/A-B test에 유리.

## 지원 알고리즘

```cpp
enum class CodecType : int {
  NO_COMPRESSION = 0,
  LZ4            = 1,
  SNAPPY         = 2,
  ZLIB           = 3,
  LZ4_VARINT_SIZE = 4,
  LZMA2          = 5,
  LZMA2_VARINT_SIZE = 6,
  ZSTD           = 7,
  GZIP           = 8,
  LZ4_FRAME      = 9,
  BZIP2          = 10,
  ZSTD_FAST      = 11,
};
```

build option에 따라 일부는 disabled. 사용 가능한지 `folly::io::hasCodec(type)`로 확인.

| Algorithm | Throughput (compress) | Throughput (decompress) | Compression ratio |
|-----------|----------------------|--------------------------|-------------------|
| snappy | ~500 MB/s | ~1500 MB/s | 낮음 |
| lz4 | ~500 MB/s | ~3000 MB/s | 낮음 |
| zstd (lvl 3) | ~400 MB/s | ~1500 MB/s | 중-고 |
| zstd (lvl 19) | ~10 MB/s | ~1500 MB/s | 매우 높음 |
| zlib | ~100 MB/s | ~400 MB/s | 중 |
| lzma | ~5 MB/s | ~50 MB/s | 최고 |

낮은 latency RPC는 lz4/snappy, archival storage는 zstd-19, balance는 zstd-3.

## API

```cpp
#include <folly/io/Compression.h>

auto codec = folly::io::getCodec(
  folly::io::CodecType::ZSTD,
  /*level=*/3);

// 1. compress
auto src = folly::IOBuf::copyBuffer("hello world");
auto compressed = codec->compress(src.get());

// 2. uncompress
auto decompressed = codec->uncompress(
  compressed.get(),
  /*uncompressedLength=*/src->computeChainDataLength());

// 3. uncompress with prefix size (codec이 size를 포함하면 nullopt)
auto out = codec->uncompress(compressed.get());
```

핵심 메서드 둘 — `compress(IOBuf*)`, `uncompress(IOBuf*, optional<size_t>)`. 입력/출력 모두 `unique_ptr<IOBuf>`라 chain 데이터 그대로.

### Streaming

```cpp
auto stream = folly::io::getStreamCodec(folly::io::CodecType::ZSTD);

folly::IOBufQueue inputQ, outputQ;
// ... feed inputQ from network ...

while (auto chunk = inputQ.pop_front()) {
  auto out = stream->compress(chunk.get());
  outputQ.append(std::move(out));
}
auto tail = stream->compress(nullptr);   // flush
outputQ.append(std::move(tail));
```

streaming codec은 partial input/output을 처리. fixed-size chunk가 network에서 들어올 때.

## 내부 구현 — codec factory

```cpp
// folly/io/Compression.cpp 약식
std::unique_ptr<Codec> getCodec(CodecType type, int level) {
  switch (type) {
    case CodecType::LZ4:    return std::make_unique<LZ4Codec>(level);
    case CodecType::SNAPPY: return std::make_unique<SnappyCodec>();
    case CodecType::ZSTD:   return std::make_unique<ZstdCodec>(level);
    // ...
    default: throw std::runtime_error("unsupported codec");
  }
}

class ZstdCodec : public Codec {
 public:
  ZstdCodec(int level) : level_(level) {}

  std::unique_ptr<IOBuf> doCompress(const IOBuf* data) override {
    size_t bound = ZSTD_compressBound(data->computeChainDataLength());
    auto out = IOBuf::create(bound);
    auto coalesced = data->coalesce();
    size_t actual = ZSTD_compress(
      out->writableData(), bound,
      coalesced.data(), coalesced.size(),
      level_);
    if (ZSTD_isError(actual)) throw CompressionException(...);
    out->append(actual);
    return out;
  }
};
```

각 codec class가 base `Codec` 인터페이스 구현. dispatch는 factory에서 enum→class.

### IOBuf coalesce overhead

```cpp
auto coalesced = data->coalesce();  // chain → contiguous (alloc 가능)
```

대부분 codec library가 contiguous buffer를 받는다. IOBuf chain이면 `coalesce()`로 합치는 비용이 생긴다. zstd/lz4는 streaming API도 있어 chain을 chunk별로 feed 가능.

## std와의 비교

| 항목 | std (없음) | folly::io::Codec | Abseil (없음) | Arrow Compression |
|------|------------|--------------------|---------------|---------------------|
| 표준 | N/A | 통합 wrapper | 직접 호출 | 통합 wrapper |
| algorithm 교체 | N/A | enum | 코드 변경 | enum |
| streaming | N/A | streamCodec | 직접 | 있음 |
| IOBuf 통합 | N/A | O | N/A | Arrow Buffer |

C++ 표준에는 compression이 없다. zip/gzip/zstd 모두 외부. folly가 한 추상화 안에 묶어 RPC layer 같은 *알고리즘 dynamic 선택*이 필요한 곳에 적합.

## 코드 리뷰 포인트

- 매 compress 호출마다 `getCodec`을 부르면 factory dispatch overhead. codec 객체를 보관.
- `coalesce()`가 큰 IOBuf chain에 호출되면 alloc + copy. streaming codec 검토.
- level 선택 — RPC payload에 zstd-19는 과함. lz4 또는 zstd-1~3 권장.
- uncompressed size를 모르고 decompress → zstd는 frame header에서 size 추출 가능하나 일부는 호출자가 알아야.
- 의도하지 않은 알고리즘 mismatch — magic byte로 자동 감지하는 wrapper(예: zlib magic 0x78)가 적절.

## 자주 보는 안티패턴

```cpp
// 1. compress한 buffer를 다시 decompress해 비교 (debug)
auto c = codec->compress(orig.get());
auto d = codec->uncompress(c.get());
CHECK(equals(orig, d));   // hot path에 두지 말 것

// 2. 매번 getCodec
for (auto& msg : msgs) {
  auto codec = folly::io::getCodec(CodecType::ZSTD);  // factory
  auto out = codec->compress(msg);
}
// → codec를 한 번 만들어 재사용

// 3. zstd level 22로 RPC hot path
auto codec = folly::io::getCodec(CodecType::ZSTD, 22);
// → 10 MB/s compression — RPC 처리량 한계

// 4. 압축 후 length prefix 없이 그대로 저장
// → uncompress 시 결과 길이 모름
// → length-prefixed framing 또는 algorithm이 자체 frame을 가진 variant 사용 (LZ4_FRAME)
```

## 실전 — RPC payload

```cpp
class RpcServer {
  std::unique_ptr<folly::io::Codec> codec_;

 public:
  RpcServer()
    : codec_(folly::io::getCodec(folly::io::CodecType::ZSTD, /*level=*/3)) {}

  std::unique_ptr<folly::IOBuf> EncodeResponse(const Response& r) {
    auto serialized = Serialize(r);   // IOBuf
    if (serialized->computeChainDataLength() > kCompressThreshold) {
      return codec_->compress(serialized.get());
    }
    return serialized;
  }
};
```

작은 메시지는 compression overhead가 크므로 threshold 미만은 raw. zstd-3로 적절한 trade-off.

## 정리

- `folly::io::Codec`은 zstd/lz4/snappy/zlib 통합 인터페이스.
- 입력/출력 모두 IOBuf — chain 처리.
- streaming variant로 partial input 처리.
- algorithm 선택은 throughput/ratio trade-off — RPC는 lz4/zstd-3, archival은 zstd-19.
- `coalesce` overhead 주의 — 큰 chain은 streaming 검토.

## 다음 편

[Part 20-03: folly::AsyncIO](/blog/programming/code-review/folly/part20-03-async-io)에서 Linux io_uring/AIO wrapper를 본다.

## 관련 항목

- [Folly Part 4-01 — IOBuf](/blog/programming/code-review/folly/part4-01-iobuf)
- [Folly Part 20-01 — RecordIO](/blog/programming/code-review/folly/part20-01-record-io)
- [원문 — folly/io/Compression.h](https://github.com/facebook/folly/blob/main/folly/io/Compression.h)
