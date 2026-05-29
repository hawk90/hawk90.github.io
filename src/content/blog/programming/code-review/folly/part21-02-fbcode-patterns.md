---
title: "Part 21-02: fbcode 패턴 모음 — folly 사용의 실전"
date: 2026-05-28T12:00:00
description: "Meta fbcode 코드 리뷰에서 반복적으로 등장하는 folly 사용 패턴 — overview + 시리즈 마무리."
series: "Folly Code Review"
seriesOrder: 88
tags: [cpp, folly, patterns, fbcode, summary]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: true

---

> **한 줄 요약**: 21 parts 88 chapters를 통과한 folly 시리즈의 마지막. fbcode 코드 리뷰에서 *반복적으로* 등장하는 folly 사용 패턴을 한 자리에 정리한다.

## 시리즈 마무리

이 시리즈는 folly를 다음 14 파트로 시작해 7 파트를 추가했다.

1. **Part 1**: 개요 / 철학 / build
2. **Part 2**: Future / Promise
3. **Part 3**: Executors
4. **Part 4**: IOBuf / Cursor
5. **Part 5**: String 계열
6. **Part 6**: Conv
7. **Part 7**: F14 hash maps
8. **Part 8**: 컨테이너
9. **Part 9**: 동기화 primitive
10. **Part 10**: Queue
11. **Part 11**: dynamic / JSON
12. **Part 12**: Singleton
13. **Part 13**: Utility
14. **Part 14**: 코드 리뷰 가이드
15. **Part 15**: coro
16. **Part 16**: Expected / Try
17. **Part 17**: Range / Uri / Hash
18. **Part 18**: Init / Indestructible / MicroLock
19. **Part 19**: Format / Demangle / DynamicConverter
20. **Part 20**: RecordIO / Compression / AsyncIO / Cancellation
21. **Part 21**: Observer / 패턴 모음

여기서는 시리즈 내내 반복된 *생산 코드의 folly 패턴*을 챕터 횡단으로 묶는다.

## 패턴 1 — 함수 인자는 view, 반환은 owning

```cpp
// Good
void Process(folly::StringPiece s);
folly::fbstring Build();

std::unique_ptr<folly::IOBuf> Encode(folly::ByteRange data);

// Bad
void Process(const std::string& s);   // 호출자가 std::string 강요
fbstring* Build();                     // ownership 모호
```

`StringPiece` / `ByteRange` / `Range<Iter>`로 받아 임의 view를 허용. 반환은 ownership이 명확한 type.

## 패턴 2 — Future 체인 vs 코루틴

```cpp
// Future style (legacy)
folly::SemiFuture<Result> Process(Input x) {
  return Step1(x)
    .via(executor)
    .thenValue([](S1 s1) { return Step2(s1); })
    .thenValue([](S2 s2) { return Step3(s2); });
}

// Coroutine style (preferred for new code)
folly::coro::Task<Result> Process(Input x) {
  auto s1 = co_await Step1(x);
  auto s2 = co_await Step2(s1);
  co_return co_await Step3(s2);
}
```

새 코드는 코루틴. 두 모델이 양방향 변환 가능해 점진적 마이그레이션.

## 패턴 3 — Synchronized 우선, raw mutex는 예외

```cpp
// Good
folly::Synchronized<std::vector<Item>> items_;

void Add(Item x) {
  items_.wlock()->push_back(std::move(x));
}

size_t Size() const {
  return items_.rlock()->size();
}

// Bad
std::mutex             mu_;
std::vector<Item>      items_;
// data와 mutex가 분리 — lock 누락 risk
```

`Synchronized<T>`로 *데이터와 lock을 한 객체*에. lock 없이 접근하는 코드 경로가 컴파일러로 막힘.

## 패턴 4 — F14는 기본 hash map

```cpp
folly::F14FastMap<std::string, int> m;          // value-stable, fast
folly::F14NodeMap<Key, BigValue> nm;            // pointer-stable
folly::F14ValueMap<Key, SmallValue> vm;         // value-inline (smaller)
folly::F14VectorMap<Key, Value> ordered;        // iteration order = insertion
```

`std::unordered_map` 대신 F14가 기본. variant 선택은 *value 크기*와 *pointer stability*.

## 패턴 5 — Indestructible로 global

```cpp
Foo& GetFoo() {
  static folly::Indestructible<Foo> instance;
  return *instance;
}
```

Meyers singleton의 static deinit order 위험을 회피.

## 패턴 6 — Init은 main() 첫 줄

```cpp
int main(int argc, char* argv[]) {
  folly::Init init(&argc, &argv);
  RunServer();
}
```

gflags, glog, signal handler 일괄 init. fbcode 거의 모든 binary 표준.

## 패턴 7 — JSON은 dynamic + parseJson

```cpp
auto d = folly::parseJson(text);
auto cfg = folly::convertTo<Config>(d);   // DynamicConverter
// 또는
auto host = d["host"].asString();
```

dynamic이 type-erased, struct로 변환은 traits 한 번.

## 패턴 8 — to<T> 한 줄 변환

```cpp
auto n = folly::to<int>("42");
auto s = folly::to<std::string>(42);
auto fp = folly::to<double>(s);
```

`std::to_string` / `std::stoi`의 통합. 잘못된 입력에 throw, `tryTo<T>`는 Expected.

## 패턴 9 — Cancellation을 처음부터

```cpp
folly::coro::Task<Result> Compute(folly::CancellationToken ct) {
  // 매 step마다 check
  if (ct.isCancellationRequested()) throw folly::OperationCancelled{};
  // ...
}
```

긴 작업은 *처음부터* cancel-aware. 나중에 추가하기 어렵다.

## 패턴 10 — Observer로 hot config

```cpp
class Service {
  folly::observer::Observer<Config> cfg_;
 public:
  void Handle() {
    auto snap = cfg_.getSnapshot();
    if (snap->featureEnabled) { ... }
  }
};
```

read-heavy 값은 observer. lock-free atomic load.

## 패턴 11 — Try/thenTry로 예외 처리

```cpp
compute()
  .thenTry([](folly::Try<int>&& t) {
    if (t.hasException()) return -1;
    return *t * 2;
  });

// 코루틴
auto t = co_await folly::coro::co_awaitTry(MaybeFails());
if (t.hasException()) { /* ... */ }
```

throw가 normal control flow면 `Try`로 받아 비용 절감.

## 패턴 12 — StringPiece는 함수 경계 표준

```cpp
void Parse(folly::StringPiece s);   // std::string, const char*, std::string_view 모두 받음
```

API boundary의 *받는 자리*가 항상 view.

## 패턴 13 — IOBuf chain은 직접 만들지 말 것

```cpp
folly::IOBufQueue q{folly::IOBufQueue::cacheChainLength()};
q.append(buf1);
q.append(buf2);
auto out = q.move();
```

수동 `next` chain 연결은 깨지기 쉽다. IOBufQueue가 표준.

## 패턴 14 — fbstring은 boundary에서 변환

```cpp
folly::fbstring fs = Build();
std::string sd = fs.toStdString();   // boundary 한 번

// 또는 처음부터 std::string 사용
std::string Build();
```

fbcode 내부는 fbstring, 외부 API와의 경계만 std::string으로 변환.

## 패턴 15 — Conv는 ASCII fast path 활용

```cpp
auto n = folly::to<int>("12345");   // SIMD-friendly fast path
```

큰 batch parsing에 stl 보다 결정적으로 빠름.

## 코드 리뷰 빈도 높은 지적

다음은 fbcode PR review에서 가장 자주 받는 코멘트 모음.

1. *"`std::string&`로 받지 말고 `folly::StringPiece` 또는 `std::string_view`로."*
2. *"raw `std::mutex` + 데이터 대신 `folly::Synchronized<T>`."*
3. *"`std::unordered_map`은 `folly::F14FastMap`으로 — 성능 4-5x."*
4. *"`std::shared_ptr`을 매 호출 복사하지 말고 `folly::observer` 모델."*
5. *"`Future::then`은 deprecated. `thenValue` + `thenError` 또는 코루틴."*
6. *"새 코드는 코루틴 `folly::coro::Task`로 — Future chain은 legacy."*
7. *"global mutex는 `folly::Indestructible`로 wrap — deinit order fiasco 회피."*
8. *"hot path에 `folly::format` 대신 `fmt::format` 또는 `std::format`."*
9. *"`std::async`로 disk I/O 던지지 말고 `folly::AsyncIO` (io_uring)."*
10. *"`OperationCancelled` 잡고 silent return하지 말 것 — propagate."*

## 일반 가이드 — folly를 적게 쓰기

표준이 따라잡은 자리는 표준이 옳다.

- `folly::Optional` → `std::optional`
- `folly::Function` → `std::move_only_function` (C++23) 또는 `std::function`
- `folly::StringPiece` → `std::string_view` (대부분 자리)
- `folly::format` → `std::format` (C++20+)

folly가 *우위*인 자리만 folly:

- 코루틴 (folly::coro)
- F14 hash map
- Synchronized
- IOBuf
- 동시성 자료구조 (MPMCQueue, ConcurrentHashMap)
- Future chain (legacy migration)
- AsyncIO / io_uring wrapper

## 시리즈를 마치며

folly는 *프로덕션 C++의 잃어버린 절반*이다. 표준이 채우지 못한 자리에서 Meta가 10년 넘게 쌓아온 추상. 이 시리즈를 통과한 독자는 다음을 얻었기를 바란다.

- 각 folly 구성요소의 *왜 존재하는가*.
- 표준/abseil과의 trade-off.
- 코드 리뷰에서 *무엇을 살펴봐야 하는가*.
- 안티패턴과 그 회피.

새 코드는 가능하면 표준, 표준이 부족한 자리는 folly. 그 경계 인식이 이 시리즈의 가장 큰 가치다.

## 관련 항목

- [Folly 시리즈 시작 — 00-preface](/blog/programming/code-review/folly/00-preface)
- [Folly Part 1-01 — 개요](/blog/programming/code-review/folly/part1-01-overview)
- [Folly Part 14-01 — Meta 스타일 코드 리뷰](/blog/programming/code-review/folly/part14-01-meta-style-review)
- [Folly Part 14-02 — 안티패턴](/blog/programming/code-review/folly/part14-02-folly-anti-patterns)
- [Folly Part 14-03 — std vs folly 선택](/blog/programming/code-review/folly/part14-03-std-vs-folly-choice)
- [원문 — folly GitHub](https://github.com/facebook/folly)
- [Meta Engineering blog](https://engineering.fb.com/category/open-source/)
