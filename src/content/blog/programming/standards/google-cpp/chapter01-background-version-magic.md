---
title: "Ch 1: Background / C++ Version / Magic"
date: 2026-05-18T01:00:00
description: "Goals of the Style Guide, C++ Version 정책, Google-Specific Magic (cpplint) — 메타와 철학."
tags: [Google, C++, Style-Guide, Background, Version, cpplint]
series: "Google C++ Style"
seriesOrder: 1
draft: true
---

가이드 전체를 이해하려면 먼저 메타가 필요하다. 이 글은 *Background*, *C++ Version*, *Google-Specific Magic* 세 절을 묶었다.

## Background

Google C++ Style Guide는 Google 사내에서 십수 년에 걸쳐 수렴된 규칙이다. 처음에는 사내 문서로 출발했지만, 지금은 공개되어 수많은 회사와 오픈소스 프로젝트에 영향을 주고 있다.

### 다른 표준과의 위치

코딩 표준은 저마다 강조점이 다르다.

| 표준 | 중심 |
|------|------|
| MISRA C / C++ | 자동차 안전중요 |
| CERT C / C++ | 보안 (CVE 예방) |
| AUTOSAR C++14 | 자동차 + 모던 C++ |
| JSF C++ | 항공 (F-35) |
| High Integrity | 일반 안전중요 |
| **Google C++** | 거대 코드베이스의 일관성 |

Google이 다른 표준과 갈리는 지점은 *모노레포 규모의 거대 코드베이스에서 읽기·유지가 쉬운 코드*를 최우선으로 둔다는 것이다. 안전이나 보안이 아니라 일관성이 우선이다.

### 가이드의 적용 범위

이 가이드는 Google이 공개한 오픈소스 프로젝트 — Chromium, V8, gRPC, Abseil, TensorFlow 등 — 의 사실상 표준이다. 새로 작성하는 모든 C++ 코드는 이 규칙을 따른다. 예외는 협의로 인정된다.

## Goals of the Style Guide

원문은 가이드 자체의 목표를 네 항목으로 명시한다. 한 문장으로 요약하면 다음과 같다.

> Optimize for the reader, not the writer.

코드는 쓰는 사람보다 읽는 사람을 위해 쓰여야 한다는 단순한 명제다.

### 규칙은 스스로를 정당화해야 한다

"왜 이렇게 쓰는가"에 답하지 못하는 규칙은 좋은 규칙이 아니다. 원문 가이드를 펼쳐 보면 거의 모든 규칙에 *Pros / Cons / Decision* 섹션이 붙어 있는데, 이는 결정을 자의적으로 내리지 않으려는 의도다. 새로운 규칙을 도입할 때도 같은 형식의 논증을 요구한다.

### 일관성이 가독성을 만든다

같은 패턴이 코드베이스 어디서나 반복되면 읽는 사람의 인지 부담이 줄어든다. 다음 두 코드가 한 코드베이스에 섞여 있다고 생각해 보자.

```cpp
// 일관된 코드베이스:
std::unique_ptr<Foo> CreateFoo();

// 일관되지 않은 코드베이스:
auto CreateFoo() -> std::unique_ptr<Foo>;   // 어떤 파일은 이렇게
Foo* MakeFoo();                              // 다른 파일은 이렇게
std::unique_ptr<Foo> NewFoo();               // 또 다른 파일은 이렇게
```

세 가지 모두 의미상으로는 같다. 그러나 읽는 사람이 매번 다른 어휘를 해독해야 한다면 시간이 낭비된다. 일관성은 코드의 *예상 가능성*을 만든다.

### 읽기에 최적화한다

한 번 쓰는 데 5분 걸린 코드는 그 수명 동안 수십 번 다시 읽힌다. 쓰는 사람의 편의는 그 한 번이지만, 읽는 사람의 비용은 누적된다. 그래서 쓰기가 조금 불편해지더라도 읽기 쉬워진다면 그 트레이드오프를 받아들인다.

### 기존 코드와 충돌을 피한다

가이드의 일부 결정은 기술적으로 최선이 아니라, *기존 코드와의 호환성*을 따른 결과다. 가장 대표적인 예가 예외 금지다. 예외 자체가 나빠서가 아니라, Google의 1억 줄 넘는 기존 코드가 대부분 exception-unsafe하기 때문이다. 예외를 새로 도입하려면 그 모든 코드를 재검토해야 하는데, 그 비용은 비현실적이다.

이 점이 다른 안전 표준과 가장 큰 차이를 만든다. MISRA나 CERT가 "이 기능이 위험해서 금지"라고 한다면, Google은 "이 기능의 도입 비용이 너무 커서 금지"라고 한다.

## C++ Version

### 현재 정책

가이드는 현재 C++17을 기본으로 하며 C++20 기능을 점진적으로 도입하고 있다. C++23은 검토 중이다.

C++ 버전 선택은 새 표준이 나왔다고 곧장 도입하지 않는다. Google이 주로 쓰는 컴파일러(Clang) 빌드가 안정화되고, 사내 코드베이스의 빌드 인프라가 새 버전을 충분히 지원할 때 비로소 옮긴다. 안정성과 빌드 인프라의 일치가 도입의 진짜 기준이다.

### 비표준 확장 금지

다음과 같은 컴파일러 고유 확장은 사용하지 않는다.

```cpp
__attribute__((packed))    // GCC 확장
#pragma pack(1)            // 비표준 pragma
typeof(x)                  // GCC 확장 — decltype 대신
```

이식성을 지키려는 의도다. 한 컴파일러에만 의존하는 코드는 다른 컴파일러나 새 표준으로 옮길 때 문제를 일으킨다.

## Google-Specific Magic

Google 코드베이스에는 표준 C++만으로 설명되지 않는 사내 도구와 라이브러리가 있다. 이 가이드를 읽다 보면 자주 마주치므로 미리 소개한다.

### cpplint

Google이 만든 스타일 검사기다. 가이드의 형식 규칙과 일부 의미 규칙을 검사한다.

```bash
$ cpplint myfile.cc
myfile.cc:42:  Lines should be <= 80 characters long  [whitespace/line_length] [2]
myfile.cc:55:  Using auto where the type isn't clear  [build/auto] [4]
```

오픈소스로 공개되어 있으며 `pip install cpplint`로 설치할 수 있다. 줄 길이, 공백, 들여쓰기, 명명 같은 형식 규칙을 다루지만 의미 단위 분석에는 한계가 있다. 더 정밀한 검사가 필요하면 Clang-Tidy를 함께 사용한다.

### Abseil

C++ 표준 라이브러리가 비워 둔 자리를 메우는 Google의 오픈소스 기반 라이브러리다. 가이드 곳곳에서 권장 도구로 등장한다.

```cpp
#include <absl/strings/str_format.h>
#include <absl/status/status.h>

absl::Status MyFunc() {
    return absl::StrFormat("Hello %s", name);
}
```

대표적인 것들을 꼽으면 다음과 같다.

- `absl::Status` — 예외 대신 오류를 표현하는 반환 타입
- `absl::StatusOr<T>` — 값과 오류를 함께 담는 타입
- `absl::StrFormat` — 타입 안전한 printf-style 포매팅
- `absl::flat_hash_map` — `std::unordered_map`보다 빠른 해시맵

예외를 쓰지 않는 Google의 결정과 `absl::Status`는 짝을 이룬다. 6장에서 자세히 본다.

### Protocol Buffers / gRPC

직렬화와 RPC를 위한 Google의 오픈소스 도구다. `.proto` 파일로 스키마를 정의하고 코드를 생성하는 방식이 대규모 시스템의 표준에 가깝다. 가이드에 직접 명시되지는 않지만 사실상 전제로 깔려 있다.

## 다른 표준과 결정이 갈리는 지점

가이드 전체를 관통하는 큰 결정 몇 가지를 미리 묶어 둔다. 각각은 뒷장에서 자세히 다룬다.

| 항목 | Google | 다른 표준 |
|------|--------|-----------|
| 예외 | 금지 (Ch 6) | AUTOSAR/CERT는 신중히 허용 |
| RTTI | 제한 (Ch 6) | AUTOSAR는 금지, 나머지는 신중 |
| Implicit 변환 | `explicit` 강제 (Ch 4) | 대체로 신중 |
| 다중 상속 | 인터페이스만 (Ch 4) | 대체로 회피 |
| 매크로 | 회피 (Ch 7) | 대체로 회피 |
| 스트림 | 사용자 IO에 한정 (Ch 6) | 대체로 허용 |

대부분의 금지는 "이 기능이 본질적으로 나쁘다"가 아니라 "Google 코드베이스에서 이 기능의 도입 비용이 너무 크다"라는 이유에서 출발한다. 같은 기능이라도 다른 환경에서는 충분히 쓸 만하다는 점을 기억해 두면 가이드를 비판적으로 받아들이는 데 도움이 된다.

## 정리

- 가이드의 한 줄 요약은 *Optimize for the reader*다.
- 거대 코드베이스에서는 일관성 자체가 자산이다.
- C++17/20을 점진 도입하며, 비표준 확장은 금지한다.
- cpplint, Abseil, Protobuf는 사실상 사내 표준 도구로 가이드의 전제다.
- 다른 안전 표준과 결정이 다른 이유의 상당수는 기술적 우열이 아니라 호환성 비용이다.

## 다음 장 예고

다음은 **Header Files**다. self-contained, include guard, IWYU, forward declaration, include 순서를 다룬다.

## 관련 항목

- [Ch 2: Header Files](/blog/embedded/automotive/google-cpp/chapter02-header-files)
- [원문 — Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html)
