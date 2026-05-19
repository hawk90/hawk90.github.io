---
title: "Part 15-01: absl::Cord — 분산 시스템용 대용량 문자열"
date: 2026-05-26T05:00:00
description: "absl::Cord — tree 구조로 표현되는 immutable-ish 문자열. zero-copy concat, shared substring, Google 내부 RPC payload의 기본 표현."
series: "Abseil Code Review"
seriesOrder: 73
tags: [cpp, abseil, cord, strings, zero-copy]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
---

## 한 줄 요약

`absl::Cord`는 *큰 문자열을 조각으로 표현*하는 자료구조다. 내부적으로 leaf chunk의 reference-counted tree를 유지해 concat·substring·prepend가 O(log n)에서 *복사 없이* 가능하다. Google 내부 RPC payload, file IO buffer, log message 누적 등에 표준으로 쓰인다.

## 동기

수십 MB의 문자열을 다루다 보면 `std::string`의 한계가 드러난다.

```cpp
// 회피 — 매 concat마다 전체 복사
std::string body;
for (auto& chunk : chunks) {
  body += chunk;   // O(n^2) 누적 복사
}

// 회피 — substring이 매번 복사
std::string head = body.substr(0, 1024);
```

`string_view`로 substring을 피할 수 있지만 *원본 lifetime*에 묶여서 RPC 응답이나 비동기 처리에는 쓰기 어렵다.

`Cord`는 두 가지 목표를 모두 만족한다.

- **shared ownership** — chunk는 reference count로 공유. substring·copy가 zero-copy.
- **balanced tree** — concat이 O(log n), 매우 큰 데이터에서도 일정 비용.

## 데이터 모델

`Cord`는 두 가지 표현을 가진다.

**Inline (≤15 byte)**: SSO처럼 객체 안에 직접 저장. 작은 문자열에 alloc 없음.

**Tree**: 16 byte 이상이면 *CordRep tree*로 전환.

```text
Cord = "Hello, " + 1MB chunk + ", world"

         CONCAT
        /      \
     CONCAT    FLAT("...world")
    /      \
 FLAT      EXTERNAL(1MB)
("Hello,") (refcount=2)
```

leaf 타입:

- `FLAT` — 작은 inline byte 배열 (4KB까지)
- `EXTERNAL` — 외부 메모리의 view + releaser
- `SUBSTRING` — 다른 chunk의 일부
- `BTREE` — 자식 노드 묶음 (default), 또는 `CONCAT` (legacy)

각 leaf는 `refcount`를 가진다. `Cord c2 = c1;`은 root에서 refcount만 증가시킨다.

## API와 사용법

```cpp
#include "absl/strings/cord.h"

absl::Cord c("Hello");
c.Append(", world!");        // O(log n), 새 chunk 한 개 추가
c.Prepend("Greeting: ");     // O(log n)

absl::Cord copy = c;         // O(1), refcount 증가
absl::Cord sub = c.Subcord(9, 20);  // O(log n), zero-copy

// 반복
for (absl::string_view chunk : c.Chunks()) {
  ::write(fd, chunk.data(), chunk.size());
}

// 평탄화 — std::string 필요 시 (alloc)
std::string flat(c);
absl::string_view view = c.Flatten();  // 내부적으로 평탄화

// 외부 메모리 흡수
absl::Cord c = absl::MakeCordFromExternal(view, [](absl::string_view) {
  // releaser — refcount 0 시 호출
});
```

`Chunks()`는 leaf를 순회한다. 한 chunk가 `string_view`이므로 `writev(2)` scatter-gather IO와 자연스럽게 결합한다.

## 내부 구현 핵심

`absl/strings/cord.h`와 `cord_internal.h`에서 발췌.

```cpp
class Cord {
 public:
  Cord() = default;
  Cord(absl::string_view src);
  Cord(const Cord& src);    // O(1) — refcount 증가
  Cord(Cord&& src) noexcept;

  void Append(absl::string_view src);
  void Append(Cord src);
  void Prepend(absl::string_view src);

  Cord Subcord(size_t pos, size_t n) const;  // O(log n)

  size_t size() const;
  bool empty() const;

  ChunkRange Chunks() const;
  CharIterator char_begin() const;

  std::string ToString() const;
  absl::string_view Flatten();

 private:
  // InlineRep — union { inline_buf[15]; CordRep* tree; }
  cord_internal::InlineData contents_;
};
```

### InlineData 트릭

`InlineData`는 16 byte 객체에 *두 형태*를 인코딩한다.

```cpp
struct InlineData {
  // Inline mode — 마지막 byte의 LSB = 0
  char inline_buf[15];
  uint8_t tagged_size;   // bit0=0 → inline, bits1-7 = size

  // Tree mode — 마지막 byte의 LSB = 1
  // CordRep* tree (8B) + reserved (7B) + tag (1B, LSB=1)
};
```

LSB 하나로 inline/tree를 구분한다. 작은 문자열은 alloc 없이 객체 안에 산다.

### CordRep refcount

```cpp
struct CordRep {
  std::atomic<int32_t> refcount;
  uint8_t tag;       // FLAT / EXTERNAL / SUBSTRING / BTREE
  uint8_t storage[3];
  size_t length;
};
```

`tag`로 실제 타입을 알아낸다. C-style discriminated union이다.

### Btree 균형

옛 구현은 `CONCAT` 노드의 binary tree였다. 현재는 `BTREE` 노드(branching factor ~64)로 변경되어 깊이가 매우 얕다. 64-bit 빌드에서 4GB 문자열도 깊이 5 이내.

```text
Btree root (height=2)
├─ Btree (height=1)
│  ├─ FLAT [0..4KB]
│  ├─ FLAT [4KB..8KB]
│  ├─ ...
│  └─ FLAT (~64개)
├─ Btree (height=1)
└─ ...
```

`Append`는 가장 오른쪽 leaf를 채우거나 새 leaf를 매단다. O(log n) 안에 끝난다.

## std::string과의 비교

| 항목 | std::string | absl::Cord |
|---|---|---|
| 메모리 모델 | 연속 buffer | refcount tree |
| inline (SSO) | 15B (libstdc++ x86_64) | 15B |
| concat | O(n) copy | O(log n) tree op |
| substring | O(n) alloc + copy | O(log n) zero-copy |
| copy | O(n) | O(1) refcount |
| 임의 접근 `s[i]` | O(1) | O(log n) |
| `data()` 연속 buffer | O(1) | `Flatten()` 비용 발생 |
| iterator stable | O(1) increment | `CharIterator` O(log n) |
| 스레드 안전 | const-share OK | const-share OK (refcount atomic) |

핵심 트레이드오프는 *random access 비용*이다. byte 단위 인덱싱이 잦으면 `Cord`는 손해. 반대로 큰 buffer를 *전달·잘라내기·합치기*가 잦으면 `Cord`가 압도적.

## 활용 — RPC payload

Google 내부 RPC framework (Stubby, gRPC++의 일부)에서 응답 body가 `Cord`로 흐른다.

```cpp
// 가상 RPC 핸들러
absl::Status Handle(const Request& req, Response* res) {
  absl::Cord body;
  body.Append(BuildHeader(req));      // 작은 inline
  body.Append(LoadFromDisk(req.key)); // 큰 file mmap을 EXTERNAL chunk로
  body.Append(BuildFooter());

  *res->mutable_payload() = std::move(body);
  return absl::OkStatus();
}
```

`LoadFromDisk`는 `MakeCordFromExternal`로 mmap 영역을 *복사 없이* 흡수한다. RPC 직렬화도 `Chunks()` 순회 + scatter-gather write로 끝난다.

## 코드 리뷰 포인트

**1. 크기 기준으로 Cord 적용**

```text
< 4KB        → std::string 또는 string_view
4KB ~ 64KB   → 케이스 바이 케이스
> 64KB       → Cord 강력 검토
mutable 잦음 → std::string
shared 잦음  → Cord
```

작은 문자열에 `Cord`를 쓰면 tree overhead만 산다.

**2. Flatten 남용 금지**

```cpp
// 회피 — Cord 잘라서 std::string으로
std::string head(cord.Subcord(0, 1024));

// Good — Cord 그대로 처리
absl::Cord head = cord.Subcord(0, 1024);
```

`Flatten`/`ToString`은 모든 chunk를 연속 buffer로 복사한다. Cord 전체의 의미가 사라진다.

**3. `data()` 가정 금지**

`absl::string_view`와 달리 `Cord`는 *내부 buffer가 연속이 아니다*. `data()`가 없다. 연속 buffer가 필요한 C API에는 `Flatten()` 후 view를 전달하거나 chunk 단위로 보낸다.

```cpp
// 회피
::write(fd, cord.data(), cord.size());   // 컴파일 에러

// Good — scatter-gather
std::vector<iovec> iov;
for (absl::string_view ch : cord.Chunks()) {
  iov.push_back({const_cast<char*>(ch.data()), ch.size()});
}
::writev(fd, iov.data(), iov.size());
```

**4. random access 회피**

```cpp
// 회피 — O(n log n)
for (size_t i = 0; i < cord.size(); ++i) {
  Use(cord[i]);
}

// Good — chunk 순회 O(n)
for (absl::string_view ch : cord.Chunks()) {
  for (char c : ch) Use(c);
}
```

## 자주 보는 안티패턴

**작은 문자열에 Cord**

`Cord("hi")`처럼 짧은 문자열에 `Cord`를 쓰면 inline 영역으로 들어가지만 *함수 시그니처가 `const Cord&`*면 호출 측에서 임시 Cord 객체를 만들어야 한다. 사실상 손해.

**mutable string처럼 사용**

```cpp
// 회피 — 빈번한 mutation
Cord buf;
for (int i = 0; i < 1000000; ++i) {
  buf.Append(absl::StrCat(i, "\n"));
}
```

작은 chunk를 백만 번 추가하면 tree node가 많아지고 cache 영향 큼. `std::string` + 일정 시점에 `Cord`로 흡수가 낫다.

**Cord 비교를 `==` 외의 ordering으로**

`Cord`도 `operator<`를 지원하지만 chunk-by-chunk 비교라 비용이 인접 `string_view`보다 무겁다. 정렬 키로는 `std::string`이 일반적으로 더 적합.

## 정리

- `absl::Cord`는 chunk tree로 구성된 *공유 가능한* 문자열.
- concat/substring/copy가 모두 O(log n) 또는 O(1).
- random access·`data()` 연속 buffer가 약점.
- RPC payload, log buffer, mmap 흡수처럼 *큰 데이터 공유*에 최적.
- 작은 문자열에는 overhead만 산다.

## 다음 편

[Part 15-02 — charconv](/blog/programming/code-review/abseil/part15-02-charconv)에서 빠른 숫자 변환을 본다.

## 관련 항목

- [Part 15-02 — charconv](/blog/programming/code-review/abseil/part15-02-charconv)
- [Part 15-03 — Cord vs std::string 선택](/blog/programming/code-review/abseil/part15-03-cord-vs-string)
- [Part 4-01 — string_view](/blog/programming/code-review/abseil/part4-01-string-view)
- [Part 4-03 — StrCat](/blog/programming/code-review/abseil/part4-03-str-cat)
- [Folly Part 5-02 — IOBuf](/blog/programming/code-review/folly/part5-02-iobuf) — Meta의 zero-copy buffer chain
