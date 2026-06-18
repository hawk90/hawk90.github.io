---
title: "std → absl 마이그레이션 전략"
date: 2026-06-13T09:04:00
description: "기존 std 기반 코드베이스에 Abseil을 도입하는 단계적 전략 — ABI 격리, 점진적 치환, 마이그레이션 도구."
series: "Abseil Code Review"
seriesOrder: 68
tags: [cpp, abseil, migration, std, refactoring]
type: book-review
bookTitle: "Abseil C++ Common Libraries"
bookAuthor: "Google"
draft: true

---

## 한 번에 다 바꾸지 않는다

Abseil은 *std의 보완* 이지 대체가 아니다. 도입은 영역별로 점진적이며 가치가 명확한 곳부터 한다.

권장 우선순위:

1. **새 코드만** Abseil 사용 — 기존 코드는 그대로
2. **에러 처리** — `absl::Status` / `absl::StatusOr` 도입
3. **컨테이너 hot spot** — `flat_hash_map` 등 성능 측정 가능한 곳
4. **문자열** — `StrCat`, `StrSplit`, `string_view`
5. **시간** — `absl::Time` / `Duration`
6. **나머지 유틸** — flags, log, random

## 1단계 — 새 코드 한정 도입

가장 안전한 시작.

```cpp
// 기존 module — 손대지 않음
class LegacyService {
    std::unordered_map<int, User> users_;   // 그대로
};

// 새 module — Abseil 사용
class NewService {
    absl::flat_hash_map<int, User> users_;
};
```

빌드에 `absl` dependency를 추가해 두고, 사용은 점진. 코드 리뷰에서 "새 코드는 abseil 권장" 컨벤션을 명문화.

## 2단계 — 에러 처리 통일

가장 가치가 큰 마이그레이션. `optional` + `error_code` 혼재된 인터페이스를 `StatusOr`로 통일.

```cpp
// before
struct GetResult {
    bool ok;
    User user;
    std::string error_message;
};
GetResult GetUser(int id);

// after
absl::StatusOr<User> GetUser(int id);
```

매크로(`ASSIGN_OR_RETURN`, `RETURN_IF_ERROR`)가 호출 측 코드를 크게 줄여 준다.

```cpp
// before
GetResult ProcessFlow() {
    auto a = GetUser(1);
    if (!a.ok) return {.ok = false, .error_message = a.error_message};
    auto b = GetUser(2);
    if (!b.ok) return {.ok = false, .error_message = b.error_message};
    return Combine(a.user, b.user);
}

// after
absl::StatusOr<Combined> ProcessFlow() {
    ASSIGN_OR_RETURN(User a, GetUser(1));
    ASSIGN_OR_RETURN(User b, GetUser(2));
    return Combine(a, b);
}
```

## 3단계 — 컨테이너 hot spot

벤치마크 결과 1-2배 차이 나는 hot path만 우선 치환.

```cpp
// before — profile에서 unordered_map이 hot
std::unordered_map<std::string, Counter> hits_;

// after — flat_hash_map
absl::flat_hash_map<std::string, Counter> hits_;
```

**모든 unordered_map을 한 번에 바꾸지 않는다.** 그런 wholesale 변경은 PR이 비대해지고 부작용 검증이 어렵다. 한 hot path씩.

이때 주의 — `flat_hash_map`은 *iterator invalidation 규칙이 더 엄격* (Part 5-01). 기존 코드가 iterator 유지를 가정하면 `node_hash_map`으로.

## 4단계 — string 도구

```cpp
// before
std::string result;
for (int i = 0; i < n; ++i) {
    result += std::to_string(values[i]) + ", ";
}

// after
std::string result = absl::StrJoin(values, ", ");
```

```cpp
// before
std::vector<std::string> tokens;
boost::split(tokens, input, boost::is_any_of(","));

// after
std::vector<std::string> tokens = absl::StrSplit(input, ',');
```

치환이 *국소적* 이라 작은 PR로 분할하기 쉽다.

## 5단계 — Time

```cpp
// before — chrono boilerplate
void Wait(std::chrono::milliseconds ms);
Wait(std::chrono::seconds(5));

// after
void Wait(absl::Duration d);
Wait(absl::Seconds(5));
```

Chrono ↔ Abseil 변환은 `absl::FromChrono` / `absl::ToChrono*`로 가능.

```cpp
absl::Duration d = absl::FromChrono(std::chrono::seconds(5));
auto chrono_d = absl::ToChronoMilliseconds(d);
```

라이브러리 경계에서 변환하고 *내부는 한 시스템으로 통일*.

## ABI 격리 — 헤더 인터페이스 분리

라이브러리를 제공하는 입장에서는 *공개 헤더에 Abseil 타입 노출 여부* 가 큰 결정이다.

```cpp
// 회피 — 공개 헤더에 absl 타입
// my_lib.h
#include "absl/container/flat_hash_map.h"
class MyLib {
public:
    void Process(const absl::flat_hash_map<int, Data>& data);
};
```

사용자가 *우리와 같은 Abseil 버전* 을 써야 한다. ABI 격리가 깨진다.

```cpp
// Good — 공개 헤더는 std/raw types
// my_lib.h
#include <unordered_map>
class MyLib {
public:
    void Process(const std::unordered_map<int, Data>& data);
private:
    class Impl;
    std::unique_ptr<Impl> impl_;   // pimpl
};

// my_lib.cc — 구현은 자유롭게 absl
#include "absl/container/flat_hash_map.h"
class MyLib::Impl {
    absl::flat_hash_map<int, Data> cache_;
};
```

내부 cache는 빠른 flat_hash, 외부 인터페이스는 std 호환.

## 마이그레이션 도구 — clang-tidy / refactoring scripts

Abseil은 *공식 자동 마이그레이션 도구*를 일부 제공한다(`/tools/` 디렉터리). 다만 대규모 코드베이스용이고, 보통은 IDE의 *find & replace + 컴파일 에러 활용* 이 실용적.

```bash
# 예: unordered_map → flat_hash_map (대량 변환)
rg -l "std::unordered_map" src/ | xargs sed -i \
    -e 's/std::unordered_map/absl::flat_hash_map/g' \
    -e '/^#include/a #include "absl/container/flat_hash_map.h"'
# 그 후 컴파일·테스트 반복
```

자동 변환 후 *반드시 테스트 및 수동 리뷰*. iterator invalidation 같은 의미 차이는 sed가 못 잡는다.

## "Living at Head" — 버전 관리

Abseil은 LTS와 HEAD 두 가지 트랙(Part 1-04). 새 도입은 LTS로 시작, 안정화되면 HEAD 추적 평가.

| 트랙 | 추천 대상 |
|------|----------|
| LTS (semver) | 외부 배포 라이브러리, 보수적 팀 |
| HEAD (continuous) | monorepo, 잦은 빌드, Google 사내 스타일 |

## 마이그레이션 PR 패턴

권장 PR 분할:

1. **빌드 dependency 추가** — `absl` 링크. 코드는 안 바꿈.
2. **새 코드만 absl** — 컨벤션 문서화.
3. **에러 처리** — module별로 Status 도입. 1 module = 1 PR.
4. **hot path 컨테이너** — 벤치마크 첨부.
5. **string/time** — 영역별 작은 PR.
6. **legacy 호환 layer 정리** — 마지막.

대형 wholesale PR은 리뷰가 마비된다. *각 PR이 독립적으로 의미 있게 작동* 하도록 분할.

## 실패 패턴 — 흔한 마이그레이션 실수

```cpp
// 실패 — 임시 절충
namespace mylib {
template <typename K, typename V>
using HashMap = absl::flat_hash_map<K, V>;   // ❌ 별칭이 abseil ABI 노출
}
```

별칭이 *우리 공개 API* 가 되면 사용자 코드가 그 타입에 의존. Abseil 버전 업그레이드 시 충돌. 차라리 명시적 import.

```cpp
// 실패 — std와 absl 혼재된 컨테이너
absl::flat_hash_map<std::string, int> a;
std::unordered_map<std::string, int> b;
a.insert(b.begin(), b.end());   // ❌ 컨테이너 종류가 다른 인터페이스
```

내부적으로 두 컨테이너가 섞이면 *변환 비용* 이 자주 발생. 모듈별로 하나만 선택.

## 정리

- *전부 한 번에* 바꾸지 말 것. 가치 큰 영역부터 점진.
- 우선순위: 새 코드 → Status → 컨테이너 hot spot → string → Time → 나머지.
- 공개 헤더는 std/raw 타입 — Abseil 노출은 ABI 격리 깨짐.
- pimpl 패턴으로 *외부 std, 내부 Abseil* 분리.
- PR 분할: 1 PR = 1 module, 1 영역.

## 시리즈 마무리

Part 1~13으로 *Google이 사내 코드 리뷰에서 무엇을 보는가*를 컴포넌트 단위로 정리했다. Abseil은 *도구 모음*이 아니라 *코드 리뷰 컨벤션의 코드화*에 가깝다. 같은 문제를 같은 방식으로 풀면 큰 코드베이스의 변경 비용이 줄어든다.

## 다음 편

Part 14~16에서는 본 시리즈에서 다루지 않은 모듈을 추가로 본다. [Part 14-01 — Cleanup](/blog/programming/code-review/abseil/part14-01-cleanup)부터 시작해 algorithm wrapper, function_ref/any_invocable, Cord, charconv, stacktrace, CRC32C, PeriodicSampler까지.

## 관련 항목

- [Part 14-01: Cleanup](/blog/programming/code-review/abseil/part14-01-cleanup) — RAII scope guard
- [Part 15-01: Cord](/blog/programming/code-review/abseil/part15-01-cord) — 분산 시스템용 문자열
- [Part 16-01: Stacktrace / Symbolize](/blog/programming/code-review/abseil/part16-01-stacktrace-symbolize) — crash 분석
- [Part 1-01: Abseil 개요](/blog/programming/code-review/abseil/part1-01-overview)
- [Part 13-01: Google 스타일의 Abseil 사용 패턴](/blog/programming/code-review/abseil/part13-01-google-style-patterns)
- [Part 13-02: 자주 보는 anti-pattern](/blog/programming/code-review/abseil/part13-02-anti-patterns)
- [Folly Code Review 시리즈](/blog/programming/code-review/folly) — Meta의 같은 종류 라이브러리
- [원문 — Abseil compatibility](https://abseil.io/about/compatibility)
