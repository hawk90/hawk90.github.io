---
title: "Part 5-01: FBString — SSO + COW"
date: 2026-05-23T23:00:00
description: "FBString의 23-byte SSO와 Copy-on-Write, jemalloc 친화 레이아웃 — std::string 대체로서의 설계 결정."
series: "Folly Code Review"
seriesOrder: 23
tags: [cpp, folly, fbstring, sso, cow]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

## 한 줄 요약

`folly::fbstring`은 23-byte SSO와 medium 영역 eager copy, large 영역 copy-on-write를 결합한 3-tier 문자열이다. `std::string`보다 단편화가 적고 jemalloc 친화적이며 ABI는 호환된다.

## 동기

`std::string`은 구현체마다 다르다. libstdc++ 5 이전은 COW, 이후는 SSO 15-byte, libc++/MSVC는 SSO 22-byte. 데이터 센터 규모에서 이 차이는 무시할 수 없다.

Meta는 두 가지 요구가 있었다. 첫째, 짧은 문자열(URL path 조각, key, log tag)의 힙 할당을 없애야 한다. 둘째, 큰 페이로드(HTML, JSON blob)는 함수 인자로 자주 복사되는데 매번 복사하면 throughput이 떨어진다. SSO와 COW를 한 타입에 합쳐 둘 다 해결한다.

```cpp
folly::fbstring small = "hello";          // SSO: 힙 할당 0회
folly::fbstring large = ReadFile("doc");  // 큰 데이터
folly::fbstring copy  = large;            // COW: refcount만 증가
copy.push_back('!');                      // 이때 분리(unshare)
```

핵심은 *세 영역을 한 24-byte 객체에 우겨넣는다*는 점이다.

## API & 사용법

`fbstring`은 `std::string`의 거의 모든 멤버를 제공한다. `c_str()`, `data()`, `size()`, `operator[]`, `append`, `replace`, iterator 모두 동일하다. 추가로 다음이 있다.

```cpp
#include <folly/FBString.h>

folly::fbstring s = "abc";
s.reserve(1000);            // capacity 확장
s += "def";

// std::string과 zero-copy 변환
std::string std_s = s.toStdString();         // 새 복사
folly::fbstring back(std_s.data(), std_s.size());

// StringPiece와 호환
folly::StringPiece sp = s;
```

`-DFOLLY_USE_FBSTRING_FOR_STD_STRING`을 정의하면 `std::string`을 매크로로 `fbstring`으로 치환할 수 있다. fbcode 내부에서 쓰는 트릭이지만 외부에서는 ABI 충돌 위험이 있어 권장하지 않는다.

## 내부 구현

`fbstring`의 24-byte 객체는 마지막 byte로 카테고리를 식별한다.

![FBString 24-byte layout](/images/blog/folly/diagrams/part5-01-fbstring-sso.svg)

```cpp
// folly/FBString.h 의 약식
struct MediumLarge {
  char*   data_;       // 8 bytes
  size_t  size_;       // 8 bytes
  size_t  capacity_;   // 8 bytes — 상위 2-bit이 카테고리
};

struct Small {
  char    data_[23];   // 23 bytes
  uint8_t lastChar_;   // 상위 2-bit + (23 - size)
};
```

`capacity_`의 상위 2-bit은 little-endian 머신에서 `Small.lastChar_`의 상위 2-bit과 같은 byte에 위치한다. 이 2-bit이 카테고리다.

| Category | 2-bit | 조건 |
|----------|-------|------|
| isSmall  | `00`  | size ≤ 23 |
| isMedium | `10`  | 23 < size ≤ 254 |
| isLarge  | `11`  | size > 254, refcount 사용 |

Small 모드에서 `size()`는 `23 - lastChar_`(상위 2-bit 마스킹 후)로 계산한다. 빈 문자열이면 `lastChar_ = 23`이고 `data_[0] = '\0'`이라 `c_str()`이 그대로 동작한다.

### Medium — eager copy

23 < size ≤ 254 구간은 힙에 할당하되 복사 시 즉시 deep copy 한다. refcount overhead 없이 단순하다. malloc은 `goodMallocSize()`로 jemalloc class에 맞춰 올림한다.

```cpp
// 약식
static size_t goodMallocSize(size_t n) {
  if (n <= 64) return ((n + 7) / 8) * 8;
  // 그 외 jemalloc size class
}
```

### Large — Copy-on-Write

255 byte 이상이면 다음 레이아웃이다.

```text
[ refcount (8B) | char[] ... | '\0' ]
       ↑
   heap pointer 의 -8 위치
```

`data_`는 char 시작점을 가리키고, `data_ - sizeof(size_t)` 위치에 atomic refcount가 있다. 복사 생성자는 `__atomic_fetch_add(refcount, 1, RELAXED)`만 호출하고 반환한다.

**수정 시 분리(unshare)**:

```cpp
// 약식
char* mutableData() {
  if (category() == isLarge && refCount() > 1) {
    // deep copy 후 자기만의 buffer 보유
    unshare();
  }
  return data_;
}
```

이 unshare는 `operator[]`의 non-const 오버로드, `data()` non-const, iterator 시작에서 호출된다. const 접근은 분리하지 않는다.

### Copy-on-Write 동작 그림

Large 영역에서 vs1 = vs2가 일어나면 ptr만 복사 + refcount++. 둘 중 하나가 *수정 시*에 비로소 새 버퍼를 떼낸다.

![Copy-on-Write split](/images/blog/cpp-concepts/diagrams/cow-copy-on-write.svg)

이 lazy split이 큰 페이로드의 함수 인자 전달을 사실상 무료로 만든다. 다만 멀티스레드에서 atomic refcount의 contention 비용이 있어 large가 read-heavy일 때 가장 잘 동작한다.

### Why 254, not 255?

254 + 1(`'\0'`)이 jemalloc 256 class와 정확히 맞는다. 한 byte 더 쓰면 다음 class(384)로 올라가 단편이 생긴다. 이런 byte 단위 튜닝이 Folly다.

## std::string 비교

| 항목 | std::string (libstdc++ 5+) | folly::fbstring |
|------|------|--------|
| SSO size | 15 byte | 23 byte |
| COW | 없음 | size > 254에서 사용 |
| sizeof | 32 byte | 24 byte |
| jemalloc 친화 | 일반적 | `goodMallocSize()` 사용 |
| ABI | 표준 | Meta 사양 |
| const data() race | 안전 | 안전 (atomic refcount) |

23-byte SSO는 24-byte 객체에 마지막 1-byte로 size까지 인코딩한 결과다. libstdc++/libc++가 15 또는 22-byte에 멈춘 이유는 별도의 size 필드를 두기 때문이다.

abseil은 `absl::Cord`로 다른 방향을 택했다. Cord는 작은 조각의 트리로 큰 문자열을 표현해 substring·append를 O(log n)으로 만든다. fbstring은 contiguous를 유지한다(C API 호환을 위해).

## 코드 리뷰 포인트

```cpp
// Bad — std::string으로 받았다가 fbstring으로 복사
void Process(const std::string& s) {
  folly::fbstring fs(s);  // deep copy
  // ...
}

// Good — StringPiece로 받으면 양쪽 다 view 만 잡는다
void Process(folly::StringPiece s) {
  // ...
}
```

API boundary에서 타입을 어떻게 받느냐가 가장 큰 비용이다. 함수가 소유권을 가지지 않는다면 항상 `StringPiece`(또는 `std::string_view`)로 받는다.

```cpp
// 위험 — large fbstring을 비-const iterator로 순회
for (auto& c : large_fb_str) {  // unshare 발생!
  Sanitize(c);
}

// 안전 — 의도가 read-only면 const
for (const auto& c : large_fb_str) {
  Inspect(c);
}
```

`auto&`는 non-const reference라 large mode에서 분리를 강제한다. 의도와 다르면 silent overhead가 생긴다.

## 안티패턴

- **`fbstring`을 STL 컨테이너 key로 ABI 경계에서 노출**: 다른 라이브러리와 컨테이너 타입이 갈리면 변환 비용이 매번 든다. boundary는 `std::string` 또는 `StringPiece`로 통일.
- **`reserve(0)`으로 SSO 강제 시도**: 일단 medium/large로 올라간 buffer는 `shrink_to_fit()`을 호출해도 SSO로 다시 내려오지 않을 수 있다. 짧다고 알면 처음부터 짧게.
- **multi-thread에서 mutable iterator 공유**: large mode COW는 atomic refcount지만 동일 객체의 mutable 작업은 여전히 race다. 공유하려면 `const`로 read, 수정 전에 deep copy.

## 정리

- `fbstring`은 23-byte SSO, eager-copy medium, COW large의 3-tier 설계.
- 24-byte 객체에 상위 2-bit 카테고리 인코딩으로 별도 size 필드 없이 SSO 23-byte 달성.
- Large mode COW는 atomic refcount로 multi-thread const 접근 안전.
- jemalloc size class에 맞춘 `goodMallocSize()`로 단편 최소화.
- API boundary는 `StringPiece`로 받아 타입 변환 비용 회피.

## 다음 편

다음은 Folly가 표준 `<format>` 대신 `{fmt}` 라이브러리를 채택한 이유와 통합 방식을 본다.

## 관련 항목

- [Part 5-03: StringPiece](/blog/programming/code-review/folly/part5-03-string-piece) — fbstring의 view 짝
- [Part 5-04: Join / split utilities](/blog/programming/code-review/folly/part5-04-join-split) — StringPiece 기반 split
- [Part 1-02: Folly vs Abseil 철학](/blog/programming/code-review/folly/part1-02-folly-vs-abseil-philosophy) — Cord vs fbstring 설계 차이
- [원문 — folly/FBString.h](https://github.com/facebook/folly/blob/main/folly/FBString.h)
