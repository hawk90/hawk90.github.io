---
title: "Part 1-02: Design philosophy — std 호환 + 추가 기능"
date: 2026-05-23T02:00:00
description: "Part 1-02: Abseil 설계 철학 — std 호환, ABI 안정성 정책, Live at Head 모델."
series: "Abseil Code Review"
seriesOrder: 2
tags: [cpp, abseil, design, philosophy, std]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

> **한 줄 요약**: Abseil의 설계는 "std와 충돌하지 않으면서 production 요구를 채운다"는 한 줄로 요약되지만, 그 한 줄을 지키기 위해 inline namespace, ABI 정책, Live at Head 같은 인프라가 따라온다.

## 어떤 문제를 푸는가

C++ 라이브러리를 설계하는 사람은 세 가지 질문에 답해야 한다.

1. **표준과 어떻게 공존하는가** — std에 같은 이름이 있다면 어떻게 충돌을 피할지.
2. **버전 간 호환성을 어떻게 관리하는가** — 한 번 공개한 API는 영원히 유지해야 하는지.
3. **빌드 단위를 어떻게 정의하는가** — header-only인지, 정적/공유 라이브러리인지.

Abseil은 이 셋에 대해 일관된 답을 가지고 있고, 그 답이 사용자의 코드에도 영향을 준다.

Abseil 전체의 의존 구조를 계층으로 보면 다음과 같다.

![Abseil 계층형 아키텍처](/images/blog/abseil/diagrams/part1-02-design-philosophy.svg)

## 원칙 1: Compatibility with std

Abseil의 polyfill 타입은 std 버전과 *교환 가능*하도록 설계되어 있다. C++17이 표준화한 `std::optional`을 예로 보면 다음과 같다.

```cpp
// Abseil 16자 인터페이스: std::optional과 동일
absl::optional<int> a = 42;
if (a.has_value()) {
    std::cout << *a << '\n';
}

// 마이그레이션 시
std::optional<int> b = 42;
if (b.has_value()) {
    std::cout << *b << '\n';
}
```

차이를 *의도적으로 제거*했기 때문에, 표준이 따라잡으면 sed 한 번으로 옮길 수 있다. 실제로 Google은 C++17 도입과 함께 사내에서 `absl::optional` → `std::optional` 자동 마이그레이션을 진행했다.

이 원칙의 부작용은 "표준이 잘못 결정한 부분도 따라가야 한다"는 점이다. `std::optional`은 비교 연산자에서 nullopt가 어떤 값보다 작다고 정의한다. Abseil은 이 결정에 동의하지 않더라도 호환을 위해 따른다.

## 원칙 2: ABI 안정성은 "단일 빌드 단위 내"에서만

표준 라이브러리는 ABI를 영원히 유지해야 한다. `std::string`의 내부 표현을 한 번 정하면 다음 30년간 바꿀 수 없다. Abseil은 이 제약을 받아들이지 않는다.

> **같은 컴파일 옵션으로 같은 시점에 빌드된 코드끼리만 ABI 호환을 보장한다.**

이 정책의 결과로 Abseil은 내부 구현을 자유롭게 바꿀 수 있다. `flat_hash_map`의 SIMD probing 방식이 한 LTS 릴리스에서 다음 릴리스로 넘어가며 바뀐 적도 있다.

대신 사용자는 다음 규칙을 지켜야 한다.

```cpp
// 회피 — 사전 빌드된 abseil.so를 다른 사람이 빌드한 my_lib.so와 링크
// 두 .so가 다른 컴파일 옵션을 썼다면 ODR violation으로 깨질 수 있다.

// Good — 자신의 build system이 abseil 소스를 함께 컴파일
// Bazel, CMake FetchContent, Conan source build 모두 OK
```

Abseil은 이 정책을 강제하기 위해 **inline namespace**를 활용한다. 빌드 옵션이 다르면 namespace 이름이 달라져 링크 단계에서 에러가 나도록 만든다. 자세한 내용은 1-05.

## 원칙 3: Live at Head

가장 논쟁적인 원칙이다.

> **고객은 항상 main 브랜치를 추적해야 한다.**

Google 사내에서는 이게 자연스럽다. 모든 코드가 단일 monorepo에 있고, 한 commit이 들어가면 의존하는 모든 코드가 동시에 빌드된다. API 변경이 일어나면 그 commit에서 모든 사용처를 함께 고친다.

외부에서는 사정이 다르다. 그래서 Abseil은 **LTS (Long-Term Support)** 스냅숏을 함께 제공한다. 1년에 두 번 정도 main을 잘라서 태그를 붙인다. 외부 패키지 매니저(vcpkg, Conan, apt)는 이 LTS만 다룬다.

| 모델 | 누가 쓰는가 | 호환성 보장 |
|---|---|---|
| HEAD | Google 사내, Google이 직접 빌드하는 외부 프로젝트(TF, gRPC) | API breaking change가 자주 발생 |
| LTS | vcpkg/Conan 사용자, 일반 외부 프로젝트 | 한 LTS 안에서는 patch만 |

자세한 내용은 [Part 1-04](/blog/programming/code-review/abseil/part1-04-lts-vs-head-release).

## 원칙 4: header-only는 가능한 만큼만

C++ 라이브러리는 header-only이면 사용자가 편하다. 그러나 모든 것을 header에 두면 컴파일이 느려진다. Abseil은 두 가지를 섞는다.

```text
absl/
├── strings/
│   ├── string_view.h    // header에 inline 구현
│   ├── str_cat.h        // header에 declaration
│   └── str_cat.cc       // .cc에 구현 (긴 함수)
├── status/
│   ├── status.h         // declaration
│   └── status.cc        // payload 구현은 .cc
```

작은 inline 함수(`string_view::operator[]`)는 헤더에 둔다. 큰 함수(`StrCat` 구현)와 정적 데이터(`Status::OkStatus()`의 singleton)는 .cc에 둔다.

이 결정은 컴파일 시간뿐 아니라 ABI에도 영향을 준다. .cc에 들어간 코드는 사용자 컴파일러 버전에 영향을 받지 않지만, header에 들어간 코드는 inline namespace로 격리해야 한다.

### pImpl과 같은 동기

같은 trade-off가 pImpl idiom에서도 일어난다.

![pImpl vs header-only](/images/blog/cpp-concepts/diagrams/pimpl-vs-header-only.svg)

header에 implementation을 노출하면 client가 internal type을 transitively include하게 되어 컴파일 시간과 ABI break 위험이 커진다. .cc로 옮기는 것은 *pImpl pointer*를 한 단계 덜 형식적으로 적용하는 것과 같다 — internal 변경이 header를 건드리지 않게 격리한다.

## 원칙 5: 의존성은 최소

Abseil은 다음에만 의존한다.

- **C++ 표준 라이브러리** (libstdc++, libc++, MSVC STL)
- **POSIX / Windows API** (플랫폼별)
- **CCTZ** (time zone DB, Google이 만든 별도 라이브러리)

Boost에 의존하지 않는다. 다른 third-party에도 의존하지 않는다. 이 결정은 "Abseil을 도입하기 위해 다른 라이브러리를 강제로 가져오지 않는다"는 약속이다. embedded 환경이나 라이브러리를 깐깐히 통제하는 회사에서 중요하다.

## 원칙 6: testing-friendly

Abseil 자체가 Google의 테스트 문화 위에 만들어졌기 때문에, 모든 컴포넌트가 테스트하기 쉽도록 설계되어 있다.

```cpp
// 시간을 mocking할 수 있다 — absl/time/test_util.h
class TimeMockTest : public ::testing::Test {
protected:
    absl::Time start_ = absl::FromUnixSeconds(1700000000);
};

// random을 결정론적으로 — absl/random/mocking_bit_gen.h
absl::MockingBitGen gen;
EXPECT_CALL(absl::MockUniform<int>(), Call(gen, 1, 10))
    .WillOnce(::testing::Return(7));

// flag를 한 테스트 스코프에서만 — absl/flags/flag.h
absl::SetFlag(&FLAGS_my_flag, 42);
```

테스트 친화성이 *설계 원칙으로 명문화*되어 있다는 점이 차별점이다. STL에는 "시간을 mocking하라"는 요구가 없다.

## 원칙 7: 가능한 한 zero-overhead

C++의 원칙 "쓰지 않으면 비용 없음"을 Abseil도 따른다. `absl::Status`는 ok 상태에서 8바이트 포인터 한 개만 들고 있다. `absl::optional`은 std::optional과 동일한 크기다. `absl::flat_hash_map`은 작은 데이터에 대해 std::unordered_map보다 메모리도 적게 쓴다.

```cpp
static_assert(sizeof(absl::Status) == sizeof(void*));
static_assert(sizeof(absl::optional<int>) == 2 * sizeof(int));

// flat_hash_map은 1.5x load factor 기준으로 std::unordered_map의 60% 메모리
```

zero-overhead가 *설계 단계의 제약*이라는 뜻은, 편의 기능을 추가할 때 성능 비용을 함께 평가한다는 의미다. payload 시스템처럼 비용이 0이 아닌 기능은 사용하지 않으면 비용이 0이 되도록 한다.

## 코드 리뷰 포인트

이 원칙들이 코드 리뷰에서 어떤 질문으로 나타나는가.

| 원칙 | 리뷰어 질문 |
|---|---|
| std 호환 | "이 코드가 C++20을 쓰면 `absl::optional`을 `std::optional`로 바꿀 수 있는가?" |
| ABI 정책 | "사전 빌드된 .so에 Abseil이 들어 있는가? 라이센서 측 빌드와 옵션이 일치하는가?" |
| Live at Head | "이 의존성은 HEAD를 쓰는가, LTS를 쓰는가? 우리 프로젝트의 모드와 일치하는가?" |
| header-only | "이 절차가 header에 들어 있다는 이유로 컴파일이 느려지지는 않는가?" |
| 최소 의존성 | "새 third-party를 끌어들이지 않고 같은 일을 할 수 있는가?" |
| 테스트 친화 | "이 코드가 mocking 가능한 abstraction을 통과하는가?" |
| zero-overhead | "이 추가 기능이 안 쓰는 사용자에게도 비용을 부과하는가?" |

## 자주 보는 안티패턴

```cpp
// 회피 — absl::optional을 새 코드에 쓰는 것 (C++17+에서)
absl::optional<int> Find(int key);

// Good — std::optional을 우선
std::optional<int> Find(int key);
```

```cpp
// 회피 — absl::string_view를 새 코드에 쓰는 것 (C++17+)
void Process(absl::string_view input);

// Good — std::string_view를 우선
void Process(std::string_view input);
```

표준에 도달한 polyfill은 *지속적으로 std로 옮기는* 것이 원칙이다. 새 코드에서 polyfill을 쓰면 마이그레이션 부채가 늘어난다.

```cpp
// 회피 — Abseil prebuilt를 다른 빌드의 코드와 mix
// shared library 사이의 abseil 심볼이 충돌할 수 있다.
```

## 정리

- Abseil의 설계는 일곱 가지 원칙 위에 서 있다. std 호환, ABI 정책, Live at Head, header-only 부분 적용, 최소 의존성, 테스트 친화, zero-overhead.
- 가장 논쟁적인 것은 Live at Head이고, 외부 사용자를 위해 LTS 모드가 같이 제공된다.
- ABI는 "단일 빌드 단위 내"에서만 보장된다. 이 점이 prebuilt 사용에 함정을 만든다.
- polyfill은 표준 도달 후 std로 마이그레이션하는 것이 원칙이다.

## 다음 편

Part 1-03에서 빌드 시스템을 본다. Bazel과 CMake에서 Abseil을 가져오는 방법, 그리고 vcpkg/Conan 같은 패키지 매니저와의 차이를 살핀다.

## 관련 항목

- [Part 1-01: Abseil 개요](/blog/programming/code-review/abseil/part1-01-overview)
- [Part 1-03: Build & dependency (Bazel vs CMake)](/blog/programming/code-review/abseil/part1-03-build-dependency-bazel)
- [Part 1-04: LTS vs HEAD release model](/blog/programming/code-review/abseil/part1-04-lts-vs-head-release)
- [Part 1-05: Versioning & ABI 호환성](/blog/programming/code-review/abseil/part1-05-versioning-abi)
- [Effective Modern C++: Item 22 — Pimpl idiom](/blog/programming/cpp/effective-modern-cpp) — ABI와 컴파일 시간의 트레이드오프
- [원문 — Abseil compatibility guidelines](https://abseil.io/about/compatibility)
