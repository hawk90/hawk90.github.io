---
title: "Part 16-03: Try vs Expected — 선택 기준"
date: 2026-05-27T13:00:00
description: "언제 Try, 언제 Expected — 비동기 결과 슬롯과 도메인 오류 표현의 명확한 분리."
series: "Folly Code Review"
seriesOrder: 71
tags: [cpp, folly, try, expected, design]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
---

> **한 줄 요약**: `Try<T>`는 *비동기 결과 슬롯*에 어떤 예외든 받는다. `Expected<T, E>`는 *도메인 오류*를 type-safe enum/struct로 표현한다. 둘은 겹쳐 보이지만 사용 자리가 다르다.

## 두 타입의 의도 차이

| 항목 | Try<T> | Expected<T, E> |
|------|--------|----------------|
| 오류 타입 | exception_wrapper (임의 예외) | E (보통 enum/struct) |
| 주 사용처 | Future/Task 결과 슬롯 | 함수 반환값 |
| throw 비용 | 예외 객체 만들 때 | 없음 (그냥 enum) |
| type-safe 분기 | runtime type check | compile-time enum match |
| monadic | thenTry / Future API | then / transform / orElse |
| empty 상태 | 있음 | 있음 |

`Try`는 `Future<T>::getTry()`의 반환 타입이다. *비동기 결과 슬롯* — 결과가 무엇이든 들어가야 한다. 호출 그래프 중간에서 throw된 임의 예외도 들고 다닌다.

`Expected`는 함수 시그니처의 반환 타입이다. *이 함수가 어떤 오류를 만들 수 있는지* compile-time에 명시. enum이면 switch가 exhaustive해진다.

## 사용 자리 매트릭스

```text
              | 도메인 오류 명시 | 임의 예외 캐리어
─────────────|──────────────────|──────────────────
함수 반환     |   Expected       |  Try (드물게 OK)
Future 결과   |   Future<E>가    |   Try (항상)
              |   드물게 가능      |
Variant 슬롯  |   variant        |   Try
```

핵심 규칙 둘.

1. **함수 시그니처에서 오류 가능성을 *명시*하려면** → `Expected`.
2. **비동기 결과를 *어떤 형태든 받아* 호출자에 전달하려면** → `Try`.

## 실전 예 — 둘이 만나는 곳

```cpp
// 도메인 함수 — Expected
folly::Expected<int, ParseError> ParseInt(folly::StringPiece s);

// 비동기 wrapping — Future<int>로 노출
folly::SemiFuture<int> ParseIntAsync(std::string s);

// Future가 throw할 때 호출자가 Try로 받음
folly::SemiFuture<int> f = ParseIntAsync("42");
auto t = std::move(f).getTry();   // Try<int>

if (t.hasValue()) use(*t);
else {
  // 어떤 예외든 가능 — ParseError가 throw됐을 수도, network 예외일 수도
  if (t.exception().is_compatible_with<ParseException>()) { ... }
  else if (t.exception().is_compatible_with<std::system_error>()) { ... }
}
```

도메인 함수는 `Expected`로 *type-safe enum*을 반환하고, 비동기 wrap이 그 함수를 `Future`로 노출한다. Future 호출자는 `Try`로 *임의 예외*를 받는다. 두 타입이 한 파이프라인에 공존한다.

## 변환 패턴

### Expected → Future

```cpp
folly::SemiFuture<int> ToFuture(folly::Expected<int, ParseError> e) {
  if (e) return folly::makeSemiFuture<int>(*e);
  return folly::makeSemiFuture<int>(
    folly::make_exception_wrapper<ParseException>(e.error()));
}
```

도메인 오류 enum이 throw하는 예외 타입으로 변환된다. async 경계에서 예외가 정상 메커니즘.

### Future → Expected

```cpp
folly::Expected<int, ParseError> FromTry(folly::Try<int>&& t) {
  if (t.hasValue()) return *t;
  if (t.exception().is_compatible_with<ParseException>()) {
    return folly::makeUnexpected(
      t.exception().get_exception<ParseException>()->error());
  }
  // 임의 예외 — 도메인 enum으로 표현 불가
  return folly::makeUnexpected(ParseError::Unknown);
}
```

`Try → Expected`는 *손실*이 있다. 임의 예외 → 닫힌 enum이라 정보가 줄어든다. 정말 도메인 안 예외만 다룬다면 OK.

## 코드 리뷰 — 무엇이 잘못된 모양인가

```cpp
// 1. 도메인 함수가 Try 반환
folly::Try<int> ParseInt(folly::StringPiece s);
// → Expected<int, ParseError>. Try는 비동기 슬롯이지 도메인 시그니처가 아님

// 2. Future가 Expected를 노출
folly::Future<folly::Expected<int, ParseError>> compute();
// → 이중 분기. Future가 Expected를 들고 다닐 이유 없음.
//   compute()가 throw하거나 Future<int>로 충분.

// 3. Try를 함수 인자로
void process(folly::Try<int> t);
// → 의미가 어색. 호출자가 분기해서 정상값/오류 path로 가는 게 자연스러움.

// 4. Expected의 E가 std::exception_ptr
folly::Expected<int, std::exception_ptr> Compute();
// → Try가 적합. Expected는 도메인 enum/struct를 위함.
```

## 성능 비교

| 시나리오 | Try | Expected |
|----------|-----|----------|
| 정상 path (no error) | 동일 (T 보관) | 동일 (T 보관) |
| 오류 path (객체 생성) | exception_wrapper 비용 | E 객체 생성 (보통 enum — 무료) |
| throw 비용 | 예외 생성 시 1회 | 0 |
| catch 비용 | runtime type check | switch (분기 1개) |
| memory | sizeof T + ew | sizeof T + sizeof E + tag |

`Expected`가 오류 path에서 더 가볍다. enum이면 거의 무료. throw cost가 hot path에 있으면 `Expected`로 변환해 비용을 줄일 수 있다.

## 비동기 코드에서의 일반 가이드

```cpp
// 도메인 함수 (sync)
Expected<User, AuthError> Authenticate(Token t);

// 비동기 wrapping
SemiFuture<User> AuthenticateAsync(Token t);
// 내부: Authenticate() → Expected → throw → Future

// 호출자
SemiFuture<User> f = AuthenticateAsync(token);
auto t = std::move(f).getTry();   // Try<User>
if (t.hasException<AuthException>()) { ... }
```

규칙:

- 시그니처는 `Expected` (가능한 오류를 닫힌 집합으로 명시).
- async 경계에서 `Future<T>`로 노출 — 예외로 오류 전파.
- async 호출자는 `Try<T>` 또는 `thenTry`로 받음.

## 한 줄로

> *`Try`는 결과 슬롯, `Expected`는 시그니처*.

## 자주 보는 안티패턴

```cpp
// 1. Try와 Expected를 같은 함수에서 혼용
folly::Try<folly::Expected<int, Error>> compute();
// → 의미 없는 이중 wrapping

// 2. Future<Expected<T, E>>
// → Future가 throw하거나 Future<T>면 됨

// 3. 도메인 코드 전체를 Try로
folly::Try<int> Step1();
folly::Try<int> Step2();
// → Expected가 의도를 더 명확히

// 4. Expected의 E에 string
folly::Expected<int, std::string> Foo();
// → enum/struct로 type-safe하게. string은 메시지지 타입이 아님.
```

## 정리

- `Try<T>`는 *어떤 결과도* 들고 다니는 비동기 슬롯.
- `Expected<T, E>`는 *닫힌 오류 집합*을 시그니처에 명시.
- 함수 시그니처는 보통 `Expected`, async 결과 슬롯은 항상 `Try`.
- 두 타입은 한 파이프라인에 공존한다 — async 경계에서 서로 변환.
- 오류 path 성능이 중요하면 throw 없는 `Expected`가 유리.

## 다음 편

Part 17로 넘어가 `Range`, `Uri`, `Hash` 유틸리티들을 본다.

## 관련 항목

- [Folly Part 16-01 — Expected](/blog/programming/code-review/folly/part16-01-expected)
- [Folly Part 16-02 — Try](/blog/programming/code-review/folly/part16-02-try)
- [Folly Part 13-01 — exception_wrapper](/blog/programming/code-review/folly/part13-01-exception-wrapper)
- [Folly Part 2-04 — thenValue / thenTry / thenError](/blog/programming/code-review/folly/part2-04-then-value-error)
