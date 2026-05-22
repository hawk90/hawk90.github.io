---
title: "Part 1-04: API stability 정책 — 어떤 보장도 없다는 솔직함"
date: 2026-05-23T04:00:00
description: "Folly의 API/ABI 안정성 정책 — Meta의 입장과 외부 사용자가 따라야 할 전략."
series: "Folly Code Review"
seriesOrder: 4
tags: [cpp, folly, api, stability, versioning]
type: book-review
bookTitle: "Folly C++ Common Libraries"
bookAuthor: "Meta (Facebook)"
draft: false
---

> **한 줄 요약**: Folly는 API/ABI 안정성을 약속하지 않는다. 이는 무책임이 아니라 fbcode monorepo의 운영 모델을 OSS에 그대로 노출한 결과다. 외부 사용자는 *commit 단위 freeze*로 이를 보완한다.

## 동기 — 왜 보장을 하지 않는가

fbcode 안에서는 모든 호출자가 동시에 빌드된다. Folly 헤더를 바꾸면 그 시점의 trunk에 들어 있는 모든 호출자가 같이 컴파일된다. signature를 바꾸고 싶다면 호출자도 함께 바꾸면 된다. *언제든* 가능하다.

OSS 사용자는 그 가정 밖에 있다. Meta는 OSS 사용자가 fbcode와 다른 schedule로 업데이트한다는 점을 안다. 그래서 다음 둘 중 하나를 택해야 한다.

1. OSS 사용자를 위해 *별도의 안정화 layer*를 둔다.
2. 안정성 약속을 하지 않고, 사용자가 lockstep으로 따라오게 한다.

Meta는 두 번째를 택했다. Folly는 그래서 다음을 보장하지 않는다.

- API 호환성 (signature, default argument)
- ABI 호환성 (struct layout, virtual table)
- behaviour 호환성 (throw 여부, exception type)
- header 위치 (`folly/Foo.h`가 `folly/bar/Foo.h`로 이동 가능)
- 이름 (`folly::Promise::setException`이 `setError`로 rename 가능)

## 실제로 일어나는 변화

GitHub commit history를 보면 패턴이 보인다.

```text
v2023.06.05.00 → v2024.05.06.00 사이 변화 (예시)

- folly::SmallLocks::MicroLock layout 변경 (ABI break)
- folly::futures::Future::onError → thenError로 deprecated
- folly::experimental::* → folly::로 승격
- AtomicHashMap의 일부 method signature 변경
- IOBuf::create_combined 추가, IOBuf::wrap_buffer signature 보강
```

대부분은 API 추가/개선이지만 ABI break도 *드물지 않다*. Header 위치 변경, namespace 이동도 분기마다 한두 건씩 일어난다.

## 외부 사용자의 전략

### 1. Tag로 고정

```cmake
FetchContent_Declare(
  folly
  GIT_REPOSITORY https://github.com/facebook/folly.git
  GIT_TAG        v2024.11.04.00   # 특정 release
)
```

`main` branch는 *언제든 깨질 수 있다*. CI green이라 해도 다음 commit이 우리 코드를 깨지 않는다는 보장은 없다.

### 2. 격리 layer

```cpp
// my_async.h — 외부에 노출되는 인터페이스
namespace myapp {
  class AsyncOp {
   public:
    std::future<int> Run();   // 표준 future로 반환
  };
}

// my_async.cpp — 내부 구현
#include <folly/futures/Future.h>
std::future<int> AsyncOp::Run() {
  folly::SemiFuture<int> sf = ...;
  return std::async(std::launch::deferred, [sf = std::move(sf)]() mutable {
    return std::move(sf).get();
  });
}
```

Public header에서 Folly type을 노출하지 않으면 Folly 버전 업그레이드 시 *cpp 파일만* 영향받는다. 다운스트림은 무관하다.

### 3. 단위 테스트로 회귀 감지

```cpp
TEST(FollyContract, FutureThenValueReturnsValue) {
  auto f = folly::makeFuture(42).thenValue([](int x) { return x + 1; });
  EXPECT_EQ(std::move(f).get(), 43);
}
```

Folly의 behaviour를 우리 가정대로 동작하는지 검증하는 테스트를 둔다. 다음 버전에서 깨지면 즉시 알 수 있다.

### 4. 큰 점프 회피

| 전략 | 평가 |
|------|------|
| `v2022 → v2024` 한 번에 업그레이드 | *위험* |
| `v2022 → v2023 → v2024` 단계적 | *안전* |

분기마다 changelog가 따로 있지는 않지만, tag 사이의 diff는 작다. *작은 점프를 자주* 하는 게 큰 점프 한 번보다 안전하다.

## ABI 측면

ABI break는 *링크 시점*에 들킨다.

```text
undefined symbol: folly::AsyncSocket::AsyncSocket(folly::EventBase*, int, ...)
```

Folly와 application이 다른 시점의 헤더로 컴파일되면 발생한다. 해결책은 단 하나, *같은 commit으로 동시 빌드*다.

```cmake
# 정적 링크 + 단일 toolchain
set(BUILD_SHARED_LIBS OFF)
add_compile_options(-fvisibility=hidden -fvisibility-inlines-hidden)
```

Folly를 dynamic library로 배포하지 마라. 다른 application이 다른 시점의 Folly와 링크되면 undefined behaviour다.

## Meta의 입장 — Compatibility Document

`folly/CMake/COMPATIBILITY.md`(혹은 `folly/docs/` 안)에 다음 취지의 문서가 있다.

> Folly does not guarantee API or ABI stability between any two commits. External users are expected to update Folly together with their applications, treating Folly as part of their own source tree.

이는 *Boost*의 모델과는 정반대다. Boost는 release를 통한 안정성을 약속한다. Folly는 fbcode trunk를 약속한다.

## std/Abseil과의 비교

| 라이브러리 | API 안정성 | ABI 안정성 | 버전 schedule |
|------------|------------|------------|---------------|
| C++ 표준 | 강력 (deprecation cycle) | 처리계별 | 3년 |
| Abseil | LTS 안에서 약속 | 동일 빌드 내 | LTS + main |
| Boost | release 안에서 강력 | release 안에서 | 4개월 |
| Folly | 어떤 약속도 없음 | 어떤 약속도 없음 | 불규칙 tag |

## 코드 리뷰 포인트

- **`main` branch가 import되는가?** PR에서 즉시 거절. tag로 고정한다.
- **public header에 Folly type이 있는가?** SDK라면 격리한다.
- **Folly upgrade PR이 단독으로 올라왔는가?** Folly만 올리지 말고 application code와 동시에 올린다.
- **버전 점프가 1년 이상인가?** 단계적 업그레이드를 고려한다.

## 자주 보는 안티패턴

```cpp
// 1. Public API에 folly::Future 노출
namespace mylib {
  folly::SemiFuture<Result> ComputeAsync();  // 다운스트림이 Folly에 결박됨
}

// 2. Folly object를 dynamic library 경계로 전달
extern "C" folly::IOBuf* GetBuffer();  // ABI는 internal — 위험
```

```cmake
# 3. main branch 사용
FetchContent_Declare(folly GIT_TAG main)

# 4. shared library로 배포
add_library(folly SHARED ...)
# 다른 application이 다른 commit의 folly와 충돌
```

## 정리

- Folly는 API/ABI 안정성을 약속하지 않는다. 이는 fbcode 운영 모델의 직접적 결과다.
- 외부 사용자는 *tag 고정 + 격리 layer + 회귀 테스트 + 단계적 업그레이드*로 보완한다.
- Folly를 dynamic library로 배포하지 말고 정적 링크로 application과 lockstep을 유지한다.
- Public header에 Folly type을 노출하지 마라. SDK 호환성이 깨진다.
- Abseil/Boost와는 *완전히 다른* 운영 가정 위에 있다.

## 다음 편

[Part 1-05: Production validation 문화](/blog/programming/code-review/folly/part1-05-production-validation)에서 Meta production scale이 라이브러리 품질에 미치는 영향을 본다.

## 관련 항목

- [Folly Part 1-03 — Build / fbcode](/blog/programming/code-review/folly/part1-03-build-fbcode)
- [Abseil Part 1-05 — Versioning & ABI](/blog/programming/code-review/abseil/part1-05-versioning-abi)
- [Abseil Part 1-04 — LTS vs HEAD release](/blog/programming/code-review/abseil/part1-04-lts-vs-head-release)
