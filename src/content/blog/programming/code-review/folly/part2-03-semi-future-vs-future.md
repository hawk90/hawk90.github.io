---
title: "Part 2-03: SemiFuture vs Future — executor binding의 명시화"
date: 2026-05-23T08:00:00
description: "SemiFuture는 executor에 바인딩되지 않은 상태, Future는 바인딩 완료 상태. 이 구분이 라이브러리 API의 안전성을 만든다."
series: "Folly Code Review"
seriesOrder: 8
tags: [cpp, folly, semifuture, executor, async]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: false
---

> **한 줄 요약**: `SemiFuture<T>`는 *executor에 바인딩되지 않은* Future다. 라이브러리 API의 반환 타입으로 SemiFuture를 강제하면 *caller가 executor 결정권*을 갖는다.

## 동기 — executor가 누구의 책임인가

비동기 함수가 `Future<T>`를 반환하면 *어디서 callback이 도는지*가 함수 안에 고정된다. caller는 그 executor가 자기 thread context와 맞는지 알 수 없다. 다음 코드는 잘못된 thread에서 GUI를 갱신할 위험이 있다.

```cpp
folly::Future<Image> loadImage(std::string path) {
  static folly::CPUThreadPoolExecutor pool(4);
  return folly::via(&pool, [path] { return decodeImage(path); });
}

// GUI thread에서
loadImage("a.png").thenValue([](Image img) {
  ui->display(img);   // BUG: GUI thread가 아닐 수 있음
});
```

`loadImage`의 caller는 callback이 어디서 도는지 보이지 않는다. Folly의 해법은 *executor 결정을 caller에게 떠넘기는 것*이다.

```cpp
folly::SemiFuture<Image> loadImage(std::string path) {
  return folly::makeSemiFuture()
    .deferValue([path](auto) { return decodeImage(path); });
}

// caller
loadImage("a.png")
  .via(&guiExecutor)         // executor 명시
  .thenValue([](Image img) {
    ui->display(img);         // 안전
  });
}
```

`SemiFuture`를 반환하면 caller가 `.via(executor)`를 *반드시* 호출해야 다음 단계로 갈 수 있다. 컴파일러가 강제하지 않지만 API 관례로 강제된다.

## SemiFuture의 인터페이스

```cpp
// folly/futures/Future.h (요약)
template <class T>
class SemiFuture {
 public:
  // executor 바인딩 — Future로 전환
  Future<T> via(Executor* e) &&;
  Future<T> via(Executor::KeepAlive<> e) &&;

  // executor 없이 callback 등록 — DrivableExecutor 위에서만 의미
  template <class F> SemiFuture<U> deferValue(F&& fn) &&;
  template <class F> SemiFuture<U> deferError(F&& fn) &&;
  template <class F> SemiFuture<U> defer(F&& fn) &&;

  // blocking
  T get() &&;
  T getVia(DrivableExecutor* e) &&;

  // 그 외
  bool isReady() const;
  SemiFuture<T> wait() &&;
};
```

`deferValue`/`deferError`는 *executor가 정해질 때까지* callback을 보류한다. 나중에 `.via(e)`가 호출되면 모든 deferred callback이 그 executor에서 실행된다.

## Future의 인터페이스 (요약)

```cpp
template <class T>
class Future {
 public:
  Executor* getExecutor() const;

  template <class F> Future<U> thenValue(F&& fn) &&;
  template <class F> Future<U> thenError(folly::tag_t<E>, F&& fn) &&;
  template <class F> Future<U> thenTry(F&& fn) &&;

  Future<T> via(Executor* e) &&;     // executor 재바인딩
  Future<T> within(Duration);
  Future<T> onTimeout(Duration, F);

  // SemiFuture로 역변환 — executor 분리
  SemiFuture<T> semi() &&;
};
```

`Future`는 *bound executor가 있는 상태*이므로 `.thenValue`를 바로 호출할 수 있다. SemiFuture는 그렇지 않다.

## 변환 흐름

```text
makeSemiFuture(v) ──▶ SemiFuture<T> ──.via(e)──▶ Future<T>
                                                    │
Promise<T>.getSemiFuture() ──▶ SemiFuture<T>        │
                                                    │
Promise<T>.getFuture() ──▶ Future<T> (InlineExecutor)
                                                    ▼
                                            .thenValue / .thenError ...
                                                    │
                                                    ▼
                                            Future<U> 또는 .semi() ──▶ SemiFuture<U>
```

`getFuture()`는 InlineExecutor에 자동 바인딩된다. 이는 *어디서 callback이 도는지가 caller의 thread*에 의존한다는 뜻이고, 거의 항상 명확한 표현이 아니다. **OSS 코드 리뷰에서는 `getSemiFuture()` 사용을 권장**한다.

## 라이브러리 API 권장 패턴

```cpp
// 잘못된 패턴 — executor가 함수에 고정
folly::Future<Result> doWork();          // 어디서 callback이 도는지 불명

// 권장 패턴 — caller가 결정
folly::SemiFuture<Result> doWork();      // .via(e)를 caller가 호출

// 모듈 boundary에서의 강제
namespace mylib {
  folly::SemiFuture<Response> Handle(Request);   // SemiFuture로 export
}
```

내부 구현은 자유롭게 Future를 쓰지만 *공개 API는 SemiFuture*로 통일한다. Folly 자체의 모든 public API가 이 규칙을 따른다.

## defer vs via — 두 가지 callback 등록

```cpp
folly::SemiFuture<int> sf = computeAsync();

// 방법 A — defer: executor 결정 전 등록, 나중에 via로 일괄 실행
sf
  .deferValue([](int x) { return x + 1; })
  .deferValue([](int x) { return x * 2; })
  .via(&pool)
  .thenValue([](int x) { return std::to_string(x); })
  .get();

// 방법 B — 즉시 via, 이후 then 사용
sf
  .via(&pool)
  .thenValue([](int x) { return x + 1; })
  .thenValue([](int x) { return x * 2; })
  .get();
```

A는 SemiFuture가 라이브러리 boundary를 넘어 caller까지 흘러갈 때 유용하다. B는 같은 스코프 안에서 명확하다.

## 내부 구현 — Executor 보관

```cpp
// folly/futures/detail/Core.h (개념)
template <class T>
class Core {
  Executor::KeepAlive<> executor_;   // SemiFuture는 nullptr, Future는 bound
  // ...
};

// .via 호출 시
template <class T>
Future<T> SemiFuture<T>::via(Executor::KeepAlive<> e) && {
  this->getCore().setExecutor(std::move(e));
  return Future<T>(detail::EmptyConstruct{}, this->getCore());
}
```

`Executor::KeepAlive<>`는 executor에 대한 참조 카운트 증가를 보장한다. callback이 실행될 때까지 executor가 destroyed되지 않는다.

## std::executor 제안과의 관계

C++26 후보의 `std::execution::scheduler`/`sender`/`receiver`는 같은 문제를 푼다.

```text
Folly                    std::execution (P2300)
─────────────────────    ─────────────────────
SemiFuture<T>            sender (unbound)
Future<T>                connected sender
Executor                 scheduler
.via(e)                  on(scheduler, sender)
.thenValue(f)            then(sender, f)
.get()                   sync_wait(sender)
```

개념적으로 거의 1:1 대응이다. P2300이 표준에 도착하면 Folly 사용자는 점진적으로 이전할 수 있다.

## 코드 리뷰 포인트

- **public API가 Future를 반환하는가?** SemiFuture로 바꾼다.
- **`getFuture()` 사용?** `getSemiFuture()`로 바꾸고 caller가 `.via(e)`를 호출하게 한다.
- **체인 중간에 `.via()`가 없이 `.then`을 부르는가?** SemiFuture는 컴파일 에러가 난다. Future라면 어디서 도는지 명확해야 한다.
- **`.semi()`로 다시 SemiFuture를 만드는 이유가 있는가?** 라이브러리 경계를 넘기는 경우에만 의미 있다.

## 자주 보는 안티패턴

```cpp
// 1. public API가 Future
folly::Future<Result> handleRequest(Request);   // 잘못

// 2. SemiFuture에 InlineExecutor를 강제
auto v = computeSemi().via(&folly::InlineExecutor::instance()).get();
// continuation이 호출자 thread에서 도는 게 의도였는가?

// 3. .via 누락 후 .get
auto v = computeSemi().get();   // 내부적으로 InlineExecutor 사용 — 의도 불명

// 4. 매 호출마다 .via를 잊는다
mylib::Handle(req)
  .thenValue([](auto r) { ... });   // SemiFuture라 컴파일 에러
```

## 정리

- `SemiFuture<T>`는 executor에 바인딩되지 않은 Future다. `.via(e)`로 Future로 전환된다.
- 라이브러리 public API의 반환 타입으로 SemiFuture를 강제하면 caller가 executor 결정권을 갖는다.
- `getFuture()`는 InlineExecutor에 자동 바인딩되므로 거의 항상 모호하다. `getSemiFuture()`를 쓴다.
- `deferValue`/`deferError`는 executor 결정 전 callback을 보류한다.
- 개념적으로 C++26 senders/receivers와 1:1 대응이다.

## 다음 편

[Part 2-04: .then / .thenValue / .thenError](/blog/programming/code-review/folly/part2-04-then-value-error)에서 continuation API의 세부를 본다.

## 관련 항목

- [Folly Part 2-01 — Future 개요](/blog/programming/code-review/folly/part2-01-future-overview)
- [Folly Part 3-01 — InlineExecutor](/blog/programming/code-review/folly/part3-01-inline-executor)
- [Folly Part 3-05 — EventBase](/blog/programming/code-review/folly/part3-05-event-base)
