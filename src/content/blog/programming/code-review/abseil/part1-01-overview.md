---
title: "Abseil 개요 — Google이 std를 보완한 이유"
date: 2026-06-09T09:01:00
description: "Part 1-01: Abseil 개요 — Google이 std의 한계를 보완하기 위해 만든 industrial-grade C++ 라이브러리."
series: "Abseil Code Review"
seriesOrder: 1
tags: [cpp, abseil, google, library, overview]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

> **한 줄 요약**: Abseil은 Google이 사내 수억 줄의 C++ 코드를 떠받치기 위해 만든 라이브러리이고, std의 빈자리를 메우거나 std보다 빠른 구현을 제공하는 두 축으로 굴러간다.

## 어떤 문제를 푸는가

C++ 표준은 천천히 움직인다. 위원회가 합의에 도달하는 데 수년이 걸리고, 컴파일러가 지원하는 데 또 수년이 걸린다. 그동안 production 코드베이스는 멈춰 있을 수 없다. Google은 사내에서 표준에 들어갈 만한 기능을 먼저 만들어 쓰고, 표준화가 확정되면 std로 옮겨가는 식으로 움직였다. Abseil은 그 사내 결과물을 외부에 공개한 것이다.

세 가지 빈자리가 있다.

1. **표준에 아직 없는 기능** — C++17 이전의 `string_view`, `optional`, C++20 이전의 `span` 같은 polyfill.
2. **표준에 있지만 느리거나 어색한 구현** — `unordered_map`의 노드 기반 설계 대신 Swiss table 기반 `flat_hash_map`.
3. **표준에 들어갈 가능성이 없는 도메인** — `absl::Status`, `absl::Time`, `absl::Flag` 같이 Google의 production 패턴에 특화된 도구.

Abseil은 이 셋을 한 우산 아래 묶어 제공한다.

## 무엇이 들어 있는가

13개의 sub-library가 있다. 굵직한 것만 꼽으면 다음과 같다.

| 영역 | 헤더 | 대표 타입/함수 |
|---|---|---|
| 기반 | `absl/base/*` | `ABSL_PREDICT_TRUE`, `ABSL_ATTRIBUTE_*`, `raw_logging` |
| 에러 처리 | `absl/status/*` | `absl::Status`, `absl::StatusOr<T>` |
| 문자열 | `absl/strings/*` | `absl::StrCat`, `absl::StrSplit`, `absl::string_view` |
| 컨테이너 | `absl/container/*` | `absl::flat_hash_map`, `absl::btree_map`, `absl::InlinedVector` |
| 동기화 | `absl/synchronization/*` | `absl::Mutex`, `absl::Notification` |
| 시간 | `absl/time/*` | `absl::Time`, `absl::Duration`, `absl::CivilDay` |
| 수치/타입 | `absl/numeric/*`, `absl/types/*` | `absl::int128`, `absl::optional`, `absl::variant` |
| 로깅 | `absl/log/*` | `LOG(INFO)`, `CHECK`, `VLOG` |
| 플래그 | `absl/flags/*` | `ABSL_FLAG`, `absl::ParseCommandLine` |

## 짧은 맛보기

```cpp
#include "absl/status/statusor.h"
#include "absl/strings/str_cat.h"
#include "absl/container/flat_hash_map.h"
#include "absl/time/clock.h"

absl::StatusOr<int> ParseAge(absl::string_view s) {
    int v;
    if (!absl::SimpleAtoi(s, &v)) {
        return absl::InvalidArgumentError(
            absl::StrCat("not a number: ", s));
    }
    if (v < 0 || v > 200) {
        return absl::OutOfRangeError(absl::StrCat("age out of range: ", v));
    }
    return v;
}

void Demo() {
    absl::flat_hash_map<std::string, int> ages;
    absl::Time start = absl::Now();

    if (auto age = ParseAge("42"); age.ok()) {
        ages["alice"] = *age;
    }

    absl::Duration elapsed = absl::Now() - start;
    LOG(INFO) << "took " << elapsed;
}
```

여기서 보이는 패턴은 시리즈 전반에 반복된다. exception을 던지지 않고 `StatusOr`로 결과를 감싼다. 문자열 합치기는 `StrCat`으로 단일 할당에 끝낸다. 시간은 `Duration`이라는 강타입으로 다룬다.

## 왜 또 다른 라이브러리인가

흔히 받는 질문이다. 답은 **표준 위원회의 속도**와 **Google의 production 요구** 사이의 간극에 있다.

- 표준은 `std::unordered_map`을 바꿀 수 없다. ABI 안정성 때문에 노드 기반 구현이 박제되어 있다. Google은 더 빠른 해시맵이 필요했고, 새 타입으로 만드는 수밖에 없었다.
- 표준의 `std::optional<T&>`은 끝내 합의되지 않았다. Abseil은 자체 `absl::optional`을 가지고 있지만 reference에 대한 합의는 마찬가지로 보류 중이다.
- exception을 쓰지 않는 코드베이스에서 에러를 반환하는 표준 방식은 빈약하다. `std::error_code`는 너무 가볍고, exception은 금지. 그 자리에 `absl::Status`가 들어간다.

## std와의 관계

Abseil은 std를 *대체*하지 않는다. *보완*한다. 같은 코드베이스에서 둘이 공존하는 것이 정상이다.

```cpp
// std와 absl을 섞어 쓰는 일상적 코드
std::vector<absl::string_view> tokens =
    absl::StrSplit(line, ',', absl::SkipEmpty());

std::unique_ptr<Worker> w = std::make_unique<Worker>();
absl::StatusOr<int> n = w->Process(tokens);
```

선택의 일반 원칙은 다음과 같다.

| 상황 | 권장 |
|---|---|
| std 버전이 충분히 빠르고 표준에 있음 | std (`std::optional` on C++17+) |
| std 버전이 느리거나 어색함 | absl (`absl::flat_hash_map`) |
| 표준에 없음 | absl (`absl::Status`, `absl::Time`) |
| 컴파일러 지원 폴리필 | 표준 도달 후 std로 마이그레이션 |

## 두 가지 릴리스 모드

Abseil은 두 모드로 배포된다.

- **HEAD** — main 브랜치를 직접 추적. Google 사내가 이 모델로 산다. "Live at Head" 철학.
- **LTS** — 1년에 두 번 정도 끊는 long-term snapshot. 외부 패키지 매니저(vcpkg, Conan)는 LTS만 다룬다.

이 둘의 차이는 1-04에서 자세히 다룬다. 일단은 "사내는 HEAD, 사외는 LTS"라고 기억해두면 충분하다.

## ABI 정책

Abseil의 ABI 정책은 한 줄로 요약된다.

> **같은 빌드 단위 안에서만 ABI 호환을 보장한다.**

Abseil로 빌드한 두 정적 라이브러리를 다른 플래그로 컴파일해서 같은 실행 파일에 링크하면 동작이 깨질 수 있다. ODR violation을 막기 위해 inline namespace로 빌드 옵션을 인코딩하는 메커니즘이 들어 있다. 자세한 내용은 [Part 1-05: Versioning & ABI 호환성](/blog/programming/code-review/abseil/part1-05-versioning-abi)에서 다룬다.

이 정책은 단일 실행 파일을 통째로 빌드하는 Google 사내 monorepo 모델에 최적화되어 있다. 외부 사용자에게는 약간의 함정이 있다.

## 빌드 시스템

Abseil은 **Bazel-first**다. CMake는 second-class지만 LTS 릴리스에 함께 제공된다.

```python
# Bazel — WORKSPACE 또는 MODULE.bazel
http_archive(
    name = "com_google_absl",
    sha256 = "...",
    strip_prefix = "abseil-cpp-20240722.0",
    urls = ["https://github.com/abseil/abseil-cpp/releases/download/20240722.0/abseil-cpp-20240722.0.tar.gz"],
)
```

```cmake
# CMake — FetchContent
include(FetchContent)
FetchContent_Declare(
    absl
    GIT_REPOSITORY https://github.com/abseil/abseil-cpp.git
    GIT_TAG 20240722.0
)
FetchContent_MakeAvailable(absl)

target_link_libraries(my_app PRIVATE absl::strings absl::status)
```

Bazel과 CMake 양쪽의 차이는 1-03에서 자세히 다룬다.

## 이 시리즈를 읽는 법

세 가지 동선이 있다.

1. **production 코드를 읽고 리뷰하는 사람** — Part 3 (Status) → Part 4 (Strings) → Part 5 (Container) 순서. 가장 자주 마주치는 세 영역.
2. **시스템 코드를 쓰는 사람** — Part 2 (Base · Meta · Memory)를 먼저. macro와 attribute로 portability를 확보하는 도구가 모여 있다.
3. **마이그레이션 담당자** — Part 13 (Code Review Patterns)을 먼저 훑고, 필요한 모듈만 깊이 들어가는 방식.

이 시리즈는 사용법이 아니라 **왜 이 모양인가**에 비중을 둔다. cppreference처럼 API를 나열하지 않고, code review에서 "이걸 쓰면 안 되는 이유"가 무엇인지를 함께 본다.

## 정리

- Abseil은 Google 사내 라이브러리의 오픈소스 부분 집합이고, std의 빈자리를 메우거나 std보다 빠른 구현을 제공한다.
- 13개 sub-library로 구성되며 Status, Strings, Container가 가장 자주 마주친다.
- std와 *공존*하는 것이 정상이고, 선택 기준은 "표준에 있는가, 충분히 빠른가" 두 가지로 단순화할 수 있다.
- HEAD와 LTS 두 모드가 있고, ABI 호환은 단일 빌드 단위 안에서만 보장된다.
- Bazel이 first-class, CMake가 second-class.

## 다음 편

Part 1-02에서는 Abseil의 설계 철학을 본다. "std 호환 + 추가 기능"이라는 슬로건이 실제로는 어떤 트레이드오프 위에 서 있는지, header-only로 만들 수 없는 이유가 무엇인지 다룬다.

## 관련 항목

- [Part 1-02: Design philosophy — std 호환 + 추가 기능](/blog/programming/code-review/abseil/part1-02-design-philosophy)
- [Part 1-03: Build & dependency (Bazel vs CMake)](/blog/programming/code-review/abseil/part1-03-build-dependency-bazel)
- [Part 1-05: Versioning & ABI 호환성](/blog/programming/code-review/abseil/part1-05-versioning-abi)
- [Part 3-01: absl::Status — exception-free error handling](/blog/programming/code-review/abseil/part3-01-status)
- [Part 13-01: Google 스타일의 Abseil 사용 패턴](/blog/programming/code-review/abseil/part13-01-google-style-patterns)
- [Effective Modern C++ 시리즈](/blog/programming/cpp/effective-modern-cpp)
- [원문 — abseil.io](https://abseil.io/)
- [Abseil GitHub](https://github.com/abseil/abseil-cpp)
