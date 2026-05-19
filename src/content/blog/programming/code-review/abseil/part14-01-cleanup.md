---
title: "Part 14-01: absl::Cleanup — 함수 종료 시 실행 보장"
date: 2026-05-26T01:00:00
description: "absl::Cleanup — lambda 기반 RAII scope guard. 임시 객체로도 동작하는 ergonomic API, folly::ScopeGuard와의 비교."
series: "Abseil Code Review"
seriesOrder: 69
tags: [cpp, abseil, cleanup, raii, scope-guard]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
---

## 한 줄 요약

`absl::Cleanup`은 *함수 종료 시 lambda를 한 번 실행하는* RAII scope guard다. C API 호출 결과 정리, 임시 파일 삭제, 임시 상태 복구처럼 destructor를 갖지 않는 자원의 해제를 *지역적으로* 보장한다. `gsl::final_action`이나 folly의 `ScopeGuard`와 같은 계열이며 Abseil은 deduction guide와 `[[nodiscard]]`를 결합해 사용성을 끌어올렸다.

## 동기

C API와 섞여 동작하는 코드에서는 RAII가 자연스럽지 않다.

```cpp
// 회피 — 모든 return 분기에서 close 호출 반복
absl::Status Process(const char* path) {
  int fd = ::open(path, O_RDONLY);
  if (fd < 0) return absl::InternalError("open");

  Header h;
  if (!ReadHeader(fd, &h)) {
    ::close(fd);
    return absl::DataLossError("header");
  }

  if (!Validate(h)) {
    ::close(fd);
    return absl::InvalidArgumentError("header");
  }

  ::close(fd);
  return absl::OkStatus();
}
```

`close` 호출이 분기마다 반복된다. 분기를 하나 추가할 때마다 정리 코드도 함께 추가해야 한다. 빠뜨리면 leak이다.

`Cleanup`은 이 정리 책임을 *진입 시점에 한 번* 등록한다.

```cpp
// Good
absl::Status Process(const char* path) {
  int fd = ::open(path, O_RDONLY);
  if (fd < 0) return absl::InternalError("open");
  auto closer = absl::MakeCleanup([fd] { ::close(fd); });

  Header h;
  if (!ReadHeader(fd, &h)) return absl::DataLossError("header");
  if (!Validate(h)) return absl::InvalidArgumentError("header");
  return absl::OkStatus();
}
```

분기 추가에도 정리는 영향받지 않는다. 스코프를 벗어날 때 lambda가 한 번 실행된다.

## RAII 원리 — 무엇을 보장하는가

`Cleanup`은 결국 RAII / scope guard 패턴의 한 instance다. scope를 *어느 경로로 빠져나가도* 소멸자가 호출된다는 보장이 핵심.

![RAII scope guard](/images/blog/cpp-concepts/diagrams/raii-scope-guard.svg)

정상 return, early return, exception throw 모두 동일하게 cleanup이 실행된다. C API에서 `goto cleanup` 패턴을 쓰던 자리를 그대로 대체할 수 있고, exception 안전성이 *자동으로* 따라온다.

scope 진입부터 종료까지의 시점별 동작은 다음과 같다.

![Cleanup RAII scope flow](/images/blog/abseil/diagrams/part14-01-cleanup-raii.svg)

## API와 사용법

```cpp
#include "absl/cleanup/cleanup.h"

// 기본 사용 — MakeCleanup factory
auto c = absl::MakeCleanup([&] { ::close(fd); });

// CTAD를 통한 더 짧은 형태 (C++17)
absl::Cleanup c = [&] { ::close(fd); };

// 명시 취소 — Invoke()는 호출되지 않음
std::move(c).Cancel();

// 명시 실행 — 즉시 호출 후 lambda 폐기
std::move(c).Invoke();
```

`Cancel`과 `Invoke`는 *rvalue 참조*에서만 호출된다. 일반 변수에 묶인 상태에서는 호출할 수 없고 반드시 `std::move`로 소비해야 한다. lambda를 두 번 실행하거나 *조용히 무시*하는 실수를 막기 위한 설계다.

```cpp
auto c = absl::MakeCleanup([] { LOG(INFO) << "exit"; });
c.Cancel();             // 컴파일 에러 — lvalue
std::move(c).Cancel();  // OK
```

## 내부 구현

`absl/cleanup/cleanup.h`의 본문은 짧다.

```cpp
namespace absl {

template <typename Callback>
class ABSL_MUST_USE_RESULT Cleanup {
 public:
  Cleanup(Callback callback)
      : storage_(std::move(callback), /*engaged=*/true) {}

  Cleanup(Cleanup&& other) = default;

  void Cancel() && {
    storage_.Disengage();
  }

  void Invoke() && {
    storage_.Invoke();
  }

  ~Cleanup() {
    storage_.InvokeIfEngaged();
  }

 private:
  cleanup_internal::Storage<Callback> storage_;
};

template <typename Callback>
Cleanup(Callback) -> Cleanup<std::decay_t<Callback>>;

template <typename... Args, typename Callback>
absl::Cleanup<Callback> MakeCleanup(Callback callback) {
  return absl::Cleanup<Callback>(std::move(callback));
}

}  // namespace absl
```

핵심 포인트는 세 가지다.

- `ABSL_MUST_USE_RESULT` → `[[nodiscard]]`. `absl::MakeCleanup(...)`의 반환값을 변수에 잡지 않으면 경고가 나온다. 이는 임시 객체를 만들고 *즉시* 소멸시켜 lambda를 호출하는 흔한 실수를 막는다.
- deduction guide로 CTAD를 지원. `absl::Cleanup c = lambda` 한 줄로 끝난다.
- `Cancel`/`Invoke`는 ref-qualified rvalue 멤버. 이중 호출 금지.

`Storage`는 `engaged` 플래그 + callback을 묶은 small wrapper다. 빈 lambda(`[]{...}`)에 대해서는 EBO(empty base optimization)로 1바이트만 차지한다.

## std / Folly와의 비교

| 항목 | std | folly::ScopeGuard | absl::Cleanup |
|---|---|---|---|
| 표준 포함 | × | × | × |
| CTAD 한 줄 | — | `SCOPE_EXIT` 매크로 | `absl::Cleanup c = ...` |
| nodiscard 경고 | — | 일부 | O |
| 명시 cancel | — | `dismiss()` | `std::move(c).Cancel()` |
| 명시 invoke | — | — | `std::move(c).Invoke()` |
| 헤더 의존 | — | `folly/ScopeGuard.h` | `absl/cleanup/cleanup.h` |

folly의 `SCOPE_EXIT` 매크로는 익명 변수를 만들어 라인 끝에 lambda를 붙이는 형태다.

```cpp
// folly
SCOPE_EXIT { ::close(fd); };

// abseil
absl::Cleanup _ = [&] { ::close(fd); };
```

매크로 회피와 명시적 변수 이름이라는 이점이 있는 대신 한 단어 더 길다. 명시 취소 API는 Abseil이 더 깔끔하다.

C++23부터 표준에 `std::scope_exit`이 들어올 예정이다. Abseil의 `Cleanup`은 그 사실상의 polyfill 역할을 한다.

## 코드 리뷰 포인트

**1. 임시 객체 금지**

```cpp
// 회피 — 임시 객체가 곧바로 destruct → lambda 즉시 실행
absl::MakeCleanup([&] { ::close(fd); });

// Good — 변수에 묶어 스코프 끝까지 살린다
auto c = absl::MakeCleanup([&] { ::close(fd); });
```

`[[nodiscard]]` 경고가 발견해 주지만 매크로·legacy 빌드에서 무시될 수 있다.

**2. callback이 throw하지 않는지 확인**

destructor가 호출하는 lambda이므로 예외를 던지면 std::terminate로 직행한다. `noexcept` lambda를 권장한다.

```cpp
absl::Cleanup c = [&]() noexcept { ::close(fd); };
```

**3. 캡처 lifetime**

```cpp
// 회피 — local 변수 ref가 cleanup보다 먼저 죽을 수 있다
auto MakeLogger() {
  std::string name = "log";
  return absl::MakeCleanup([&] { LOG(INFO) << name; });  // dangling
}

// Good — by value
auto MakeLogger() {
  std::string name = "log";
  return absl::MakeCleanup([n = std::move(name)] { LOG(INFO) << n; });
}
```

함수 밖으로 cleanup이 escape하면 `&` 캡처는 위험하다. 보통은 같은 함수 안에서만 쓰므로 `&`로 충분하다.

**4. early return과의 조합**

`Cleanup`은 early return 패턴의 동반자다. `goto cleanup;`을 쓰던 C 스타일 코드를 점진적으로 옮길 때 가장 먼저 손대는 도구다.

## 자주 보는 안티패턴

**상태 토글**

```cpp
// 회피 — 의미 모호
bool was_paused = scheduler.IsPaused();
scheduler.Pause();
absl::Cleanup _ = [&] { if (!was_paused) scheduler.Resume(); };
```

`Cleanup` 안에서 분기가 시작되면 destructor가 무엇을 할지 한눈에 안 들어온다. 차라리 작은 helper class를 만든다.

```cpp
// Good
class ScopedPause {
 public:
  explicit ScopedPause(Scheduler* s) : s_(s), was_paused_(s->IsPaused()) {
    if (!was_paused_) s_->Pause();
  }
  ~ScopedPause() { if (!was_paused_) s_->Resume(); }
 private:
  Scheduler* s_;
  bool was_paused_;
};
```

`Cleanup`은 *단순 한 줄 정리*에 가장 적합하다. 복잡한 상태 기계는 별도 RAII class가 옳다.

**lambda 안에서 `return` 기대**

```cpp
absl::Cleanup _ = [&] {
  if (some_cond) return absl::InternalError("...");  // 컴파일 에러 또는 무시
};
```

lambda 반환값은 `void`다. 정리 단계에서 발견한 에러를 함수 반환값에 실어 보낼 수 없다. 그런 동작이 필요하면 `Cleanup`이 아니다.

**Cleanup 중첩으로 순서 의존**

```cpp
auto a = absl::MakeCleanup([&] { ::close(fd); });
auto b = absl::MakeCleanup([&] { Flush(fd); });  // b가 먼저 호출됨 (LIFO)
```

LIFO 순서를 명확히 알고 쓰면 문제 없지만, 등록 순서와 실행 순서가 반대라 리뷰어가 자주 헷갈린다. 가능하면 한 `Cleanup`에 묶거나 helper class로 분리한다.

## 정리

- `absl::Cleanup`은 lambda 기반 RAII scope guard.
- `[[nodiscard]]` + rvalue-only `Cancel/Invoke`로 흔한 오용을 컴파일러가 잡아 준다.
- C API 자원·임시 상태 복구·early return 분기에 가장 적합.
- callback은 `noexcept`로, 캡처 lifetime에 주의.
- 복잡한 상태 토글은 별도 RAII class가 낫다.

## 다음 편

[Part 14-02 — algorithm container 확장](/blog/programming/code-review/abseil/part14-02-algorithm-container-ext)에서 `absl::c_sort`, `c_find_if` 등 container 전체를 받는 algorithm wrapper를 본다.

## 관련 항목

- [Part 14-02 — algorithm container 확장](/blog/programming/code-review/abseil/part14-02-algorithm-container-ext)
- [Part 13-02 — anti-pattern](/blog/programming/code-review/abseil/part13-02-anti-patterns) — 자원 누수 패턴
- [Part 3-03 — Status 매크로](/blog/programming/code-review/abseil/part3-03-status-macros) — early return 패턴
- [Folly Part 6-04 — ScopeGuard](/blog/programming/code-review/folly/part6-04-scope-guard) — Meta의 대응
- [EMC++ Item 21 — std::make_unique](/blog/programming/cpp/effective-modern-cpp/item21) — 자원 RAII의 출발점
