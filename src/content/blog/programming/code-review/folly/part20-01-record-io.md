---
title: "folly::RecordIO — append-only 로그 파일 포맷"
date: 2026-06-08T09:11:00
description: "RecordIO의 frame 포맷, checksum, mid-file 복구 — append-only log 파일의 표준 패턴."
series: "Folly Code Review"
seriesOrder: 83
tags: [cpp, folly, recordio, log, file-format]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

> **한 줄 요약**: `RecordIO`는 가변 길이 record를 append-only로 쓰고 mid-file부터도 안전하게 읽을 수 있는 파일 포맷이다. 각 record에 magic, length, checksum이 붙어 truncation/corruption을 견딘다.

## 동기

append-only log 파일은 흔하다. event log, audit log, write-ahead log, message queue spool. 다음을 만족해야 한다.

1. **write가 atomic** — partial write가 다음 read를 망가뜨리면 안 됨.
2. **mid-file부터 읽기 가능** — process crash 후 임의 offset에서 다음 valid record를 찾을 수 있어야.
3. **각 record가 self-describing** — length, checksum 포함.
4. **schema 유연** — record가 임의 binary blob.

이걸 매번 직접 짜면 endian, alignment, frame sync에서 실수가 나온다. `RecordIO`가 표준화한다.

## Frame 포맷

```text
+----------------+----------------+----------------+----------------+
|  magic (4)     |  length (4)    |   fileId (4)   |  checksum (4)  |
+----------------+----------------+----------------+----------------+
|                          payload (length bytes)                   |
+-------------------------------------------------------------------+

총 헤더: 16 bytes
magic    : 0xFADE0001 (sync word)
length   : payload 길이 (big endian)
fileId   : 같은 파일을 식별하는 32-bit (random per file)
checksum : SpookyHashV2 결과 32-bit (header + payload)
```

핵심은 두 가지.

- **magic** — 임의 offset에서 검색 시작점. magic이 발견되면 candidate record.
- **checksum** — magic이 우연히 데이터 안에 나올 수 있으므로 false positive 걸러냄.
- **fileId** — 두 RecordIO 파일이 어쩌다 concat되면 다른 fileId로 구분.

## API

```cpp
#include <folly/io/RecordIO.h>

// write
{
  folly::File f("log.recordio", O_WRONLY | O_CREAT | O_APPEND);
  folly::RecordIOWriter writer(std::move(f));
  
  writer.write(folly::IOBuf::wrapBuffer(data1, len1));
  writer.write(folly::IOBuf::wrapBuffer(data2, len2));
}

// read
{
  folly::File f("log.recordio", O_RDONLY);
  folly::RecordIOReader reader(std::move(f));
  
  for (auto rec : reader) {
    folly::ByteRange payload = rec.first;
    off_t            offset  = rec.second;
    Process(payload);
  }
}
```

Writer는 단순 append, Reader는 iterator로 record를 streaming.

### Random-access seek + 복구

```cpp
folly::RecordIOReader reader(std::move(f));

// 파일 중간 임의 offset에서 다음 valid record 찾기
auto it = reader.seek(offset);
for (; it != reader.end(); ++it) {
  Process(it->first);
}
```

`seek(offset)`은 offset 이후의 *첫 valid record*를 찾는다. magic을 forward 검색 → checksum 검증 → 통과한 record를 반환.

partial write/corruption 영역은 자동으로 skip. log file이 crash로 중간이 잘려도 다음 valid frame부터 복원.

## 내부 구현

```cpp
// folly/io/RecordIO.cpp 약식
struct Header {
  uint32_t magic;
  uint32_t length;
  uint32_t fileId;
  uint32_t checksum;
};

void RecordIOWriter::write(std::unique_ptr<folly::IOBuf> buf) {
  Header h;
  h.magic    = kMagic;
  h.length   = buf->computeChainDataLength();
  h.fileId   = fileId_;
  h.checksum = computeChecksum(h, *buf);   // header + payload

  pwrite(fd_, &h, sizeof(h), offset_);
  pwriteIOBuf(fd_, *buf, offset_ + sizeof(h));
  offset_ += sizeof(h) + h.length;
}

static uint32_t computeChecksum(const Header& h, const IOBuf& buf) {
  folly::hash::SpookyHashV2 sp;
  sp.Init(0, 0);
  // header without checksum field
  Header partial = h;
  partial.checksum = 0;
  sp.Update(&partial, sizeof(partial));
  // payload
  for (auto& range : buf) {
    sp.Update(range.data(), range.size());
  }
  uint64_t h1, h2;
  sp.Final(&h1, &h2);
  return static_cast<uint32_t>(h1);
}
```

writer는 단순 append. 한 record가 atomic하게 보이도록 *한 번의 write*로 (가능하면 `writev`/iovec) 보낸다.

```cpp
// reader iterator
auto RecordIOReader::Iterator::operator++() -> Iterator& {
  for (;;) {
    if (offset_ >= fileSize_) { /* end */ return *this; }
    Header h;
    pread(fd_, &h, sizeof(h), offset_);
    if (h.magic != kMagic) {
      offset_ = findNextMagic(offset_ + 1);   // forward search
      continue;
    }
    if (h.fileId != fileId_) {
      offset_ = findNextMagic(offset_ + 1);
      continue;
    }
    // 길이 sanity
    if (offset_ + sizeof(h) + h.length > fileSize_) {
      offset_ = findNextMagic(offset_ + 1);
      continue;
    }
    auto buf = readPayload(offset_ + sizeof(h), h.length);
    if (computeChecksum(h, *buf) != h.checksum) {
      offset_ = findNextMagic(offset_ + 1);
      continue;
    }
    current_ = {buf->coalesce(), offset_};
    offset_ += sizeof(h) + h.length;
    return *this;
  }
}
```

reader는 각 record를 *전부 검증*. magic mismatch, fileId mismatch, length impossible, checksum mismatch 중 하나면 *forward search*로 다음 magic을 찾는다.

## 사용 패턴

### Streaming write

```cpp
folly::RecordIOWriter writer(folly::File("events.log", O_WRONLY | O_APPEND | O_CREAT));

void OnEvent(const Event& e) {
  auto buf = SerializeToIOBuf(e);
  writer.write(std::move(buf));
}
```

매 event마다 append. 순서 보존.

### Crash 복구

```cpp
folly::RecordIOReader reader(folly::File("events.log", O_RDONLY));
size_t valid = 0, recovered = 0;
for (auto rec : reader) {
  if (rec.first.empty()) continue;
  Replay(rec.first);
  ++valid;
}
LOG(INFO) << "valid records: " << valid;
```

crash 후 read 시 corrupt 영역은 자동으로 skip. fsync 안 한 write가 사라지더라도 valid 데이터는 모두 복원.

## std와의 비교

| 항목 | 표준 (없음) | folly::RecordIO | Apache Hadoop SequenceFile | Protobuf delimited |
|------|-------------|-------------------|--------------------------------|---------------------|
| frame | N/A | magic+length+checksum | length+sync block | length-prefixed |
| 복구 | N/A | mid-file seek | sync marker | 전체 재처리 |
| checksum | N/A | SpookyHashV2 | optional | 없음 |
| append-safe | N/A | O | O | partial 가능 |
| schema | N/A | binary blob | typed | protobuf |

`RecordIO`는 *프레임 자체*에 집중. payload 안의 schema(JSON, Thrift, Protobuf 등)는 호출자 책임.

비슷한 포맷: Kafka log segment, Apache Avro container file, RocksDB WAL — 모두 magic+length+checksum 패턴이 표준.

## 코드 리뷰 포인트

- write가 `O_APPEND` 없이 열림 → 동시 write 시 truncation. 항상 `O_APPEND`.
- fsync 정책 — RecordIO는 fsync 안 함 (호출자 결정). durability 필요하면 명시적 fsync.
- record가 큼 (수십 MB) → IOBuf 체인이 한 번에 write되도록. memory pressure 확인.
- corruption 영역이 *전체 file의 큰 비율*이면 forward search가 매우 느림. 적절히 archive/rotate.
- fileId가 *우연히* 다른 파일과 같으면 concat된 파일에서 잘못 인식 — random 32-bit이라 확률 낮으나 zero가 의도된 값이면 충돌.

## 자주 보는 안티패턴

```cpp
// 1. fsync 없이 곧바로 process 종료 가능한 코드
writer.write(buf);
exit(0);   // page cache가 disk에 안 갔을 수 있음
// → fsync(fd) 또는 graceful shutdown

// 2. record가 너무 작음 (수 byte)
for (int i = 0; i < 1e6; ++i) {
  writer.write(folly::IOBuf::wrapBuffer(&i, sizeof(i)));
}
// → 16-byte header overhead가 80%. 묶어서 write 또는 다른 포맷.

// 3. reader가 매 read마다 새 File 열기
for (auto& path : files) {
  RecordIOReader r(File(path, O_RDONLY));
  for (auto rec : r) { ... }
}
// → 정상 사용. 단 동일 파일을 반복 열면 page cache는 유지되지만 syscall은 누적.

// 4. checksum 무시
for (auto rec : reader) {
  if (rec.first.empty()) continue;   // forward search 결과는 OK
  // 하지만 reader가 그저 raw read만 한다면 checksum 검증 skipping 위험
}
```

## 정리

- `RecordIO`는 append-only log 파일의 표준 frame format.
- magic + length + fileId + checksum (16 byte header).
- mid-file seek로 corruption 영역 자동 skip 후 복원.
- write는 단순 append, fsync는 호출자 결정.
- payload schema는 호출자가 결정 (binary blob).

## 다음 편

[Part 20-02: Compression](/blog/programming/code-review/folly/part20-02-compression)에서 zstd/lz4/snappy wrapper를 본다.

## 관련 항목

- [Folly Part 4-01 — IOBuf](/blog/programming/code-review/folly/part4-01-iobuf)
- [Folly Part 17-04 — SpookyHashV2](/blog/programming/code-review/folly/part17-04-spooky-hash)
- [원문 — folly/io/RecordIO.h](https://github.com/facebook/folly/blob/main/folly/io/RecordIO.h)
