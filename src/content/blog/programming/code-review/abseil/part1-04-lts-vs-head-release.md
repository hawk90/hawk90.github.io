---
title: "Part 1-04: LTS vs HEAD release model"
date: 2026-05-23T04:00:00
description: "Part 1-04: LTS vs HEAD — Abseil의 두 가지 릴리스 모델, breaking change 정책, 마이그레이션 비용."
series: "Abseil Code Review"
seriesOrder: 4
tags: [cpp, abseil, release, lts, versioning]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
---

> **한 줄 요약**: Abseil의 HEAD는 Google이 사내에서 쓰는 모델이고, LTS는 외부 사용자를 위한 1년 두 번의 snapshot이다. 두 모델은 API 변경 정책과 마이그레이션 부담이 다르다.

## 어떤 문제를 푸는가

라이브러리 사용자는 "내가 의존하는 코드가 언제 바뀌는가"를 알고 싶다. 두 가지 극단이 있다.

- **고정 버전 모델** — 정해진 버전을 박제하고, 사용자가 명시적으로 올릴 때만 변경.
- **Live at Head 모델** — 항상 최신 commit을 따라가고, 변경이 들어오면 사용자 코드도 같이 고침.

Google은 후자를 신봉한다. monorepo + 사내 빌드 인프라가 있기 때문에 가능하다. 외부 사용자는 그렇지 않다. 그래서 두 모델이 공존한다.

## HEAD 모델

HEAD는 abseil-cpp의 main 브랜치 그 자체다. Google 사내 코드와 동일한 commit이 올라온다.

```python
# Bazel WORKSPACE — HEAD를 추적
http_archive(
    name = "com_google_absl",
    strip_prefix = "abseil-cpp-master",
    urls = ["https://github.com/abseil/abseil-cpp/archive/refs/heads/master.zip"],
)
```

### HEAD를 쓰는 프로젝트

- Google 사내 (당연)
- TensorFlow, gRPC, Protocol Buffers, Envoy — Google이 주도하거나 깊이 협력하는 프로젝트
- 일부 large-scale 인프라 (Kubernetes의 일부)

이들은 자체 CI에서 매일 또는 매주 Abseil HEAD를 끌어와 빌드하고, 깨지면 즉시 고친다.

### HEAD의 정책

> **breaking change는 사전 공지와 함께 일어난다. deprecation 후 일정 기간 후 제거.**

- 새 API 추가는 언제든 가능
- 기존 API 변경은 deprecation period 후
- 일부 변경은 자동 마이그레이션 도구(clang-tidy, abseil-fix)와 함께 배포

### HEAD의 비용

- 매 commit이 깨질 가능성 — CI가 필수
- 자체 마이그레이션 책임 — Google이 사내를 고쳐도 외부는 자기 코드를 자기가 고쳐야 함
- documentation 부족 — 변경 사항이 commit message에만 있을 수 있음

## LTS 모델

LTS는 6개월~1년에 한 번 main을 잘라 태그를 붙인 snapshot이다.

```text
20240722.0  ← 2024년 7월 22일
20240116.0  ← 2024년 1월 16일
20230802.0  ← 2023년 8월 2일
20230125.0  ← 2023년 1월 25일
```

날짜 형식 자체가 버전이다. semver를 따르지 않는다. 이유는 "API 변경의 종류를 미리 분류하지 않는다"는 정책 때문이다.

### LTS의 정책

> **한 LTS 안에서는 patch만 들어간다. API는 동결.**

- 같은 LTS에 대한 패치는 보안 수정과 critical bug fix만
- 새 LTS는 1년에 두 번 정도 잘림
- 새 LTS에서는 breaking change가 일어날 수 있음

### LTS를 쓰는 프로젝트

- vcpkg, Conan, apt, brew의 모든 사용자
- monorepo가 아닌 일반 enterprise 프로젝트
- 외부 dependency 정책상 버전 pin이 필수인 환경

## 모델 비교

| 항목 | HEAD | LTS |
|---|---|---|
| 추적 대상 | main 브랜치 | 날짜 태그 (예: 20240722.0) |
| 갱신 빈도 | 매 commit | 6~12개월 |
| API 변경 | 언제든 (deprecation 후) | 같은 LTS 내에서는 없음 |
| CI 필요성 | 매일 빌드 권장 | 새 LTS 도입 시점에만 |
| 자동 마이그레이션 도구 | 일부 제공 | LTS 간에는 직접 처리 |
| 외부 패키지 매니저 | 미지원 | 지원 |
| 적합한 프로젝트 | Google, monorepo, 인프라 | 일반 enterprise, 외부 라이브러리 |

## 어느 쪽을 골라야 하는가

세 가지 질문으로 답할 수 있다.

1. **CI에 매일 Abseil HEAD를 빌드할 인프라가 있는가?** 없다면 LTS.
2. **breaking change가 들어왔을 때 코드를 24시간 안에 고칠 수 있는가?** 없다면 LTS.
3. **TensorFlow / gRPC 같은 HEAD-기반 라이브러리를 직접 의존하는가?** 그렇다면 HEAD.

일반적인 답은 LTS다. HEAD를 쓰는 외부 프로젝트는 인프라 비용이 상당하다.

## LTS 간 마이그레이션

LTS에서 다음 LTS로 올라갈 때 무엇이 일어나는가.

```text
20240116.0 → 20240722.0 사이의 주요 변경 (예시)

- absl::Hash의 internal state layout 변경 — ABI 영향
- absl::flat_hash_map의 default size 변경 — 성능 영향
- absl::LogSink 인터페이스에 새 메서드 추가 — virtual override 영향
- 일부 deprecation 제거 (이전 LTS에서 deprecate된 것)
```

마이그레이션 비용은 다음에 비례한다.

- 코드베이스에서 Abseil API 사용 빈도
- 사용자 코드가 deprecated API를 얼마나 의존하는지
- 다른 third-party (gRPC 등)가 같은 Abseil 버전에 동의하는지

## breaking change 패턴

Abseil이 API를 deprecate하는 방식은 일관적이다.

```cpp
// Step 1: 새 API 도입
absl::Status NewAPI();
ABSL_DEPRECATED("Use NewAPI()") absl::Status OldAPI();

// Step 2: 일정 기간 후 — Google 사내 마이그레이션 완료
// 외부 사용자에게는 next LTS까지 시간을 줌

// Step 3: 다음 LTS에서 제거
// 또는 HEAD에서 즉시 제거
```

`ABSL_DEPRECATED` macro는 컴파일러의 `[[deprecated("...")]]` attribute로 확장된다.

## 코드 리뷰 포인트

```cmake
# 리뷰 질문 1: 어느 모델을 쓰는가?
FetchContent_Declare(absl GIT_TAG 20240722.0)  # LTS
FetchContent_Declare(absl GIT_TAG master)      # HEAD — CI 가능?
```

```cpp
// 리뷰 질문 2: deprecated API를 쓰는가?
absl::Status s = OldAPI();
// 컴파일러 경고 무시하지 말 것. 다음 LTS에서 제거될 수 있음.

// Good — 권장 API로 옮기기
absl::Status s = NewAPI();
```

```python
# 리뷰 질문 3: HEAD를 쓰는데 lock이 없는가?
git_repository(name = "absl", branch = "master")  # 매 빌드마다 다른 commit
```

리뷰에서 모델 선택이 명시되어야 한다. 의도 없이 HEAD를 따라가는 프로젝트가 가장 위험하다.

## 자주 보는 안티패턴

```cmake
# 회피 — LTS를 쓰는데 sha256를 빼먹음
FetchContent_Declare(
    absl
    GIT_REPOSITORY https://github.com/abseil/abseil-cpp.git
    GIT_TAG 20240722.0
)
# 위 코드는 동작하지만 reproducibility가 약하다. commit이 force-push되면?

# Good — 가능하면 commit hash 또는 archive sha256
FetchContent_Declare(
    absl
    URL https://github.com/abseil/abseil-cpp/releases/download/20240722.0/abseil-cpp-20240722.0.tar.gz
    URL_HASH SHA256=f50e5ac311a81382da7fa75b97310e4b9006474f9560ac46f54a9967f07d4ae3
)
```

```cpp
// 회피 — version detection을 컴파일러에서 #if로 분기
#if defined(ABSL_LTS_RELEASE_VERSION) && ABSL_LTS_RELEASE_VERSION >= 20240722
    // ...
#endif
// 가능은 하지만 권장하지 않음. 한 LTS 안에서 일관된 코드 쓰는 게 낫다.
```

## 두 모델의 미래

Abseil 팀은 LTS를 "권장" 모델로 점차 자리잡게 하고 있다. 외부 ecosystem이 LTS에 묶여 있어 사실상 그쪽이 default다. HEAD는 Google 사내와 일부 깊은 협력 프로젝트의 것으로 남는다.

## 정리

- HEAD는 main을 직접 추적. Google 사내, TF, gRPC 등.
- LTS는 6~12개월에 한 번 잘리는 snapshot. 외부 사용자 대부분.
- 한 LTS 안에서는 patch만, 다음 LTS에서는 breaking change 가능.
- 리뷰에서는 모델 선택이 명시적인지, 버전 pin이 sha256까지 내려가는지 확인.

## 다음 편

Part 1-05에서 versioning과 ABI 호환성을 깊이 본다. inline namespace로 어떻게 빌드 옵션을 인코딩하는지, ABI break를 컴파일 시점에 잡는 메커니즘을 다룬다.

## 관련 항목

- [Part 1-02: Design philosophy](/blog/programming/code-review/abseil/part1-02-design-philosophy)
- [Part 1-03: Build & dependency](/blog/programming/code-review/abseil/part1-03-build-dependency-bazel)
- [Part 1-05: Versioning & ABI 호환성](/blog/programming/code-review/abseil/part1-05-versioning-abi)
- [원문 — Live at Head](https://abseil.io/about/philosophy#we-recommend-that-you-choose-to-live-at-head)
- [원문 — LTS releases](https://abseil.io/about/releases)
