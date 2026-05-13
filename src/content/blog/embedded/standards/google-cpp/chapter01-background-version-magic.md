---
title: "Ch 1: Background / C++ Version / Magic"
date: 2025-05-13T01:00:00
description: "Goals of the Style Guide, C++ Version 정책, Google-Specific Magic (cpplint) — 메타와 철학."
tags: [Google, C++, Style-Guide, Background, Version, cpplint]
series: "Google C++ Style"
seriesOrder: 1
draft: false
---

> 이 글은 — *Background* / *C++ Version* / *Google-Specific Magic* 세 절을 묶었다. 가이드 전체를 이해하기 위한 **메타**.

## Background

Google C++ Style Guide — Google 사내에서 *십수 년에 걸쳐* 수렴된 규칙. 처음엔 — 사내 문서. 지금은 — 공개되어 많은 회사 / 오픈소스 프로젝트에 영향.

### 다른 표준과의 위치

```
MISRA C / C++  ── 안전중요 (자동차)
CERT C / C++   ── 보안 (CVE 예방)
AUTOSAR C++14  ── 자동차 + 모던 C++
JSF C++        ── 항공 (F-35)
High Integrity ── 일반 안전중요

Google C++     ── 거대 코드베이스의 일관성
```

Google의 위치 — **거대 코드베이스 (monorepo)**의 — *읽기 쉬움 / 유지 쉬움* 최우선.

### 가이드의 적용 범위

- Google의 *오픈소스* 프로젝트 — 이 가이드 따름
- Chromium, V8, gRPC, Abseil, TensorFlow 등
- 모든 새 C++ 코드 — 이 규칙 준수 (예외 협의 가능)

## Goals of the Style Guide

> *Optimize for the reader, not the writer.*

가이드의 목적 — 다음 네 가지.

### 1. Style 규칙은 자기 정당화가 있어야

> "왜?"에 답 못 하는 규칙 — 좋은 규칙 아님.

```
Bad:  "이렇게 써. 왜냐면 가이드가 그래."
Good: "이렇게 써. 왜냐면 [구체적 이유]."
```

각 규칙은 — *이유와 비용*을 명시. 가이드 문서를 읽으면 — 거의 모든 규칙에 *Pros / Cons / Decision* 섹션이 있다.

### 2. 일관성이 가독성을 만든다

```cpp
// 코드베이스 일관성:
std::unique_ptr<Foo> CreateFoo();   // 어디든 같은 패턴

// 일관성 없음:
auto CreateFoo() -> std::unique_ptr<Foo>;   // 일부
Foo* MakeFoo();                              // 일부
std::unique_ptr<Foo> NewFoo();               // 일부
```

읽는 사람의 — *예상 가능*함.

### 3. 코드의 *읽기*에 최적화

```
쓰는 시간 :: 5분
읽는 시간 :: 5분 × 50번 = 250분

쓰는 사람의 편리 < 읽는 사람의 편리
```

쓰기 어려워도 — 읽기 쉬우면 OK.

### 4. 기존 코드와 충돌 회피

새 규칙 — 기존의 *거대 코드베이스*에 — 도입 비용 큼.

```
"이 새 기능 좋은데?"
↓
"기존 1억 줄 코드와 안 맞으면?"
↓
"안 도입."
```

이것이 — *예외 금지*의 진짜 이유. C++ 예외가 나쁘다는 것이 아니라, *Google 코드베이스*에 예외 없는 코드가 너무 많아 도입 비용이 비현실적.

## C++ Version

### 현재 정책

```
지원: C++17, C++20 (점진 도입)
검토 중: C++23
```

C++ 버전은 — *툴체인 (Clang)*의 안정성에 따라 점진 도입. 새 버전 = 즉시 도입은 아님.

### 버전 결정의 이유

- 모든 Google 코드가 — 같은 버전으로 빌드 가능해야
- 일부만 새 기능 사용 → 호환성 깨짐
- *주요 빌더 (Clang) 안정성*이 — 도입 기준

### 비공식 / 비표준 확장 금지

```cpp
// 금지:
__attribute__((packed))    // GCC 확장
#pragma pack(1)            // 비표준
typeof(x)                  // GCC 확장 (`decltype` 사용)
```

표준 C++만. 이식성 / 컴파일러 독립.

## Google-Specific Magic

Google 코드베이스에는 — *사내 도구 / 라이브러리*가 있다.

### cpplint

Google이 만든 — Style 검사기.

```bash
$ cpplint myfile.cc
myfile.cc:42:  Lines should be <= 80 characters long  [whitespace/line_length] [2]
myfile.cc:55:  Using auto where the type isn't clear  [build/auto] [4]
```

오픈소스 — `pip install cpplint`.

```
역할:
- 형식 검증 (줄 길이, 공백, 들여쓰기)
- 명명 검증 (PascalCase, snake_case 등)
- 일부 의미 검증 (using-directive 등)
```

다만 — cpplint는 *기본*. 더 정밀한 검사는 — *Clang-Tidy* 등이 보완.

### Abseil

Google의 — 오픈소스 기반 라이브러리.

```cpp
#include <absl/strings/str_format.h>
#include <absl/status/status.h>

absl::Status MyFunc() {
    return absl::StrFormat("Hello %s", name);
}
```

C++ 표준에 없는 / 보완하는 기능:
- `absl::Status` — 예외 대체 (Google 코드는 예외 안 씀)
- `absl::StrFormat` — printf-style 안전 포매팅
- `absl::flat_hash_map` — `std::unordered_map`보다 빠름

### Protocol Buffers / gRPC

Google이 만든 — 직렬화 / RPC.

```
.proto 파일 → 코드 생성 → C++에서 사용
```

대규모 시스템의 — 표준 도구. 가이드에 — 명시되지 않지만 — 사실상 전제.

## 다른 표준과의 비교 요약

| 표준 | 중심 | 예외 | 매크로 | 동적 메모리 | RTTI |
|------|------|------|--------|------------|------|
| MISRA C | 안전 | (C 없음) | 신중 | 금지 | (C 없음) |
| CERT C | 보안 | (C 없음) | 제한 | 신중 | (C 없음) |
| AUTOSAR C++14 | 안전 | 신중 | 회피 | 제한 | 금지 |
| Google C++ | 일관성 | **금지** | 회피 | OK (스마트 포인터) | **제한** |

Google이 — 모던 C++ 기능에 가장 자유로움 (안전 표준 대비). 단, **예외 / RTTI는 강력 제한**.

## 정리

- *Optimize for the reader* — 가이드의 핵심 원칙
- 거대 코드베이스 — 일관성이 자산
- C++17 / 20 점진 도입, 비표준 확장 금지
- cpplint / Abseil / Protobuf — 사내 표준 도구
- 다른 안전 표준과 — 다른 결정의 이유는 *기존 코드 호환*

## 다음 장 예고

다음 — **Header Files**. self-contained, include guard, IWYU, 순서.

## 관련 항목

- [Google C++ Style — 시리즈 개요](/blog/embedded/standards/google-cpp/00-overview)
- [Ch 2: Header Files](/blog/embedded/standards/google-cpp/chapter02-header-files)
- [원문 — Google C++ Style Guide](https://google.github.io/styleguide/cppguide.html)
