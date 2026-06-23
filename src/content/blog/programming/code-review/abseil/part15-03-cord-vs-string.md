---
title: "absl::Cord vs std::string — 선택 기준과 메모리 프로파일"
date: 2026-06-13T09:11:00
description: "absl::Cord와 std::string 중 무엇을 쓸지 판단하는 기준 — 크기·mutation 패턴·공유 빈도·메모리 프로파일 비교."
series: "Abseil Code Review"
seriesOrder: 75
tags: [cpp, abseil, cord, std-string, memory]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## 한 줄 요약

`std::string`은 *연속 buffer, 자주 mutation, 작은 크기*에 강하다. `absl::Cord`는 *공유, 큰 크기, 잘라내기·합치기*에 강하다. 두 타입의 cost model이 다르므로 선택은 **데이터 lifecycle**에 따라 정한다.

## 한 장 정리

다음 표가 결정의 90%를 정한다.

| 사용 패턴 | std::string | absl::Cord |
|---|---|---|
| 크기 < 4KB | O | △ |
| 크기 > 64KB | △ | O |
| 빈번한 mutation (append/erase) | O | × |
| 한 번 만들고 다수에 전달 | △ | O |
| substring을 비동기로 전달 | × | O |
| random `s[i]` 접근 | O | × |
| 연속 `data()` 필요 | O | × |
| RPC payload | × | O |
| log buffer | △ | O |
| mmap 흡수 | × | O |
| key for hash map | O | × |

## 메모리 프로파일 비교

### std::string

libstdc++ x86_64 기준 sizeof = 32 byte.

```text
+-------------------+
| data_*  (8B)      |  → heap 또는 inline buf
| size_   (8B)      |
| capacity_ (8B)    |
| inline_buf_[15]   |  → 작은 문자열은 여기
| +1 NUL            |
+-------------------+
```

SSO 임계치를 넘으면 *연속 heap buffer 한 개*에 모든 byte. capacity 부족 시 *전체 재할당 + memcpy*.

### absl::Cord

sizeof = 16 byte (inline rep) 또는 16 byte (tree rep, root pointer만).

```text
Inline (size ≤ 15B):
+-------------------+
| inline_buf[15]    |
| tag (LSB=0)       |
+-------------------+

Tree (size > 15B):
+-------------------+
| CordRep* tree     |
| reserved          |
| tag (LSB=1)       |
+-------------------+
```

큰 데이터는 *외부 tree*에 산다. tree 자체는 BTREE 노드 + leaf chunk들로 구성. 각 chunk는 refcount + 4KB FLAT 또는 외부 view.

### 메모리 풋프린트 차이

10MB 문자열을 5개의 컴포넌트가 *공유*하는 경우:

```text
std::string 5개 + 각자 복사:
  10MB × 5 = 50MB

Cord 5개 + refcount 공유:
  10MB × 1 + (16B × 5) = 10.00008MB
```

거대 데이터의 공유 빈도가 높을수록 격차가 크다. 반대로 5개 컴포넌트가 *각자 mutation*을 한다면 결국 copy-on-write 비용을 부담해야 한다 (Cord의 mutation은 path 위 노드를 자체 복사).

## append/erase 비용 모델

| 연산 | std::string | absl::Cord |
|---|---|---|
| `append(view)` | amortized O(n_new), reallocation 시 O(total) | O(log n + n_new) |
| `prepend` | O(n_total) 항상 | O(log n + n_new) |
| `erase` 중간 | O(n_total) | O(log n) (tree 분할) |
| `insert` 중간 | O(n_total) | O(log n) |
| `substr` | O(n_substr) alloc | O(log n) zero-copy |

`std::string`은 단순한 연속 buffer라 *작은 mutation*이 매우 빠르다. *중간 삽입*이나 *prepend*는 비효율적. `Cord`는 위치 무관 O(log n)이지만 작은 mutation에도 tree 조작 비용을 항상 낸다.

## 사용 사례별 권장

### 1. 짧은 식별자, key

```cpp
absl::flat_hash_map<std::string, User> users;   // key는 std::string
```

hash map key는 `==` 비교가 잦고 메모리 locality가 필수. `Cord`는 불리.

### 2. 큰 RPC payload

```cpp
class RpcResponse {
  absl::Cord payload_;   // 외부에서 받아 그대로 전달
};
```

받은 데이터를 *내가 변형하지 않고* 다른 컴포넌트로 흘려보낼 때 `Cord`가 적격. zero-copy 체인이 길수록 이득.

### 3. log buffer 누적

```cpp
// 회피 — 큰 string에 매번 append
std::string log;
for (auto& msg : msgs) log += msg;   // 후반에 reallocation 폭발

// Good — Cord, 또는 std::string에 reserve
absl::Cord log;
for (auto& msg : msgs) log.Append(msg);
```

`reserve`로 미리 잡을 수 있다면 `std::string`도 OK. 크기 예측이 어려우면 `Cord`.

### 4. file mmap 흡수

```cpp
void* p = ::mmap(...);
absl::Cord c = absl::MakeCordFromExternal(
    absl::string_view(static_cast<char*>(p), len),
    [fd, p, len](absl::string_view) { ::munmap(p, len); ::close(fd); });
```

mmap 영역을 *그대로* Cord로 만든다. 평탄화 복사 없음. `std::string`에서는 불가능한 패턴.

### 5. 직렬화 buffer

protobuf의 `SerializeToCord()`는 Cord를 직접 만든다. 큰 메시지에서 alloc 횟수가 1/10 수준으로 줄어든다.

## 잘못된 선택의 비용

### 작은 데이터에 Cord

```cpp
absl::Cord short_name("hello");
```

inline rep에 들어가긴 한다(15 byte까지). 하지만 API 시그니처가 `const Cord&`라면 호출자가 *임시 Cord*를 만들어야 한다. `std::string`/`string_view`로 받았으면 그냥 view 한 번이면 끝났을 일.

### 큰 데이터에 std::string 반복 prepend

```cpp
std::string buf;
for (auto& chunk : reverse_chunks) {
  buf = chunk + buf;   // O(n^2) 누적
}
```

prepend는 `std::string`의 약점. 이런 패턴이 보이면 `Cord` 후보.

### Cord에 random access

```cpp
absl::Cord c = ReadLargeFile();
for (size_t i = 0; i < c.size(); ++i) {
  if (c[i] == '\n') ++lines;   // O(n log n)
}
```

chunk 순회로 바꾸면 O(n).

```cpp
size_t lines = 0;
for (absl::string_view ch : c.Chunks()) {
  lines += std::count(ch.begin(), ch.end(), '\n');
}
```

## 코드 리뷰 포인트

**1. payload 타입 선택 근거를 PR에 적는다**

`std::string`/`Cord`/`string_view` 중 선택은 *데이터 흐름*에 달려 있다. 리뷰어가 의도를 추측하지 않게 한 줄 주석.

```cpp
// payload는 외부에서 mmap으로 받아 그대로 RPC로 흘림 → Cord
absl::Cord payload_;
```

**2. 함수 시그니처 `const Cord&` vs `absl::string_view`**

```cpp
// 호출자가 Cord 들고 있을 때만
void Process(const absl::Cord& body);

// 더 일반적 — string_view, std::string, char*도 받음
void Process(absl::string_view body);
```

Cord 전용 API는 *Cord의 zero-copy 이점을 살릴 때*에만 정당하다. 단순 read-only면 `string_view`가 호출 측 유연성이 크다.

**3. 변환 횟수 계측**

`Cord ↔ std::string` 변환이 코드 경로에 반복되면 Cord의 이점이 사라진다. 변환 1회 = 전체 데이터 복사.

```cpp
// 회피 — 경로 안에서 양방향 변환
absl::Cord c = LoadFromDisk();
std::string s(c);                  // 전체 복사
auto result = Process(s);
absl::Cord out(result);            // 또 전체 복사
return out;

// Good — Cord로 일관
absl::Cord c = LoadFromDisk();
return ProcessCord(c);
```

**4. 함수 반환 타입의 영향**

```cpp
// std::string 반환 — 호출자가 immediate 소비 가정
std::string MakeReport();

// Cord 반환 — 호출자가 전달/저장 가정
absl::Cord MakeReport();
```

반환 타입이 그 함수의 *결과 데이터 lifecycle*에 대한 시그널이다. Cord 반환은 "쪼개거나 전달할 거다"라는 의도, std::string 반환은 "바로 사용할 거다"라는 의도.

## 마이그레이션 체크리스트

기존 std::string 코드를 Cord로 옮길지 결정하는 빠른 체크.

| 신호 | 점수 |
|---|---|
| 평균 크기 > 64KB | +3 |
| 동일 데이터를 여러 컴포넌트가 공유 | +3 |
| `s.substr` / prepend가 hot path | +2 |
| 외부 메모리 (mmap, RPC buf)를 흡수 | +3 |
| random `s[i]` 접근이 잦음 | -2 |
| hash map의 key | -3 |
| 호출 빈도 *극*고, alloc 회피가 critical | +1 |

합산 점수 4 이상이면 Cord 검토. 3 이하면 std::string 유지.

## 정리

- 결정은 *크기·공유·mutation 패턴*의 세 축으로.
- 작은 데이터·잦은 mutation·random access → `std::string`.
- 큰 데이터·공유·잘라내기 → `Cord`.
- hash key·짧은 식별자는 거의 항상 `std::string`.
- 변환 횟수를 의식하고 한 데이터의 *경로 전체*에 일관된 타입을 쓴다.

## 다음 편

Part 16에서 디버깅·CRC·프로파일링 도구를 본다. [Part 16-01 — Stacktrace와 Symbolize](/blog/programming/code-review/abseil/part16-01-stacktrace-symbolize).

## 관련 항목

- [Part 16-01 — Stacktrace / Symbolize](/blog/programming/code-review/abseil/part16-01-stacktrace-symbolize)
- [Part 15-01 — Cord](/blog/programming/code-review/abseil/part15-01-cord)
- [Part 15-02 — charconv](/blog/programming/code-review/abseil/part15-02-charconv)
- [Part 4-01 — string_view](/blog/programming/code-review/abseil/part4-01-string-view)
- Folly Part 5-02 — IOBuf
