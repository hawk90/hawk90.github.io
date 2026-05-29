---
title: "Ch 2: PRE — Preprocessor와 매크로의 보안 함정"
date: 2026-05-18T03:00:00
description: "함수 매크로 대신 inline(PRE00), 괄호화(PRE01), side effect 회피(PRE31), 헤더 guard, ##·# 함정."
tags: [cert-c, preprocessor, macro, header-guard, side-effect]
series: "CERT C"
seriesOrder: 2
draft: true
---

전처리기는 *컴파일 전*에 텍스트를 치환한다. C 언어 시맨틱과 무관하게 동작하므로 *타입 안전성, 스코프, 평가 순서* 모두 무력화된다. PRE 카테고리는 이로 인한 보안 함정을 다룬다.

## PRE00 — 함수 매크로 대신 inline 함수 선호 (Recommendation)

함수 매크로는 *타입 안전하지 않고*, *부작용을 복수 실행*하고, *디버거에서 안 보인다*.

```c
// 회피 — 매크로
#define SQUARE(x) ((x) * (x))
int y = SQUARE(i++);     // i가 두 번 증가 — UB(C11), 의도와 다름(C17)

// Good — inline 함수
static inline int square(int x) { return x * x; }
int y = square(i++);     // i 한 번만 증가
```

MISRA Dir 4.9와 같은 메시지. C99의 `inline`은 *컴파일러가 최적화*에서 매크로와 동등하게 처리한다 — 성능 손실 없음.

매크로가 *진짜 필요한* 경우:

1. **타입 의존 코드 생성** — `DEFINE_LIST(TYPE)` 같은 generic 매크로.
2. **stringify / token paste** — `__FILE__`, `__LINE__` 결합.
3. **컴파일 타임 분기** — `STATIC_ASSERT`.

이 경우 *deviation*과 *주의 표시*가 필요하다.

## PRE01-C — 매크로 인자와 정의를 괄호로 감싸라

가장 흔한 매크로 버그.

```c
// 위반
#define DOUBLE(x) x + x
int y = DOUBLE(3) * 2;        // 3 + 3 * 2 = 9 (의도: 12)

// 위반
#define DOUBLE(x) ((x) + (x))
int y = DOUBLE(3) * 2;        // 12 (수정됨)

// Good — 정의와 각 인자 모두 괄호
#define DOUBLE(x) ((x) + (x))

// 더 흔한 함정
#define HALF(x) x / 2
int y = HALF(6 + 4);          // 6 + 4 / 2 = 8 (의도: 5)
#define HALF(x) ((x) / 2)     // 5
```

규칙: *각 인자에 괄호, 전체 정의에 괄호*. 이중 괄호가 보기에는 어색하지만 *우선순위 사고*를 막는다.

## PRE05-C — `#`, `##` 사용에 주의

`#`은 *stringify*(인자를 문자열로), `##`은 *token paste*(두 토큰 합치기).

```c
#define LOG(level, msg) fprintf(stderr, "[" #level "] " msg "\n")
LOG(INFO, "started");   // → fprintf(stderr, "[" "INFO" "] " "started" "\n");

#define MAKE_NAME(prefix, suffix) prefix##_##suffix
int MAKE_NAME(can, counter) = 0;   // → int can_counter = 0;
```

함정:

```c
// 인자가 매크로면 *치환되지 않은 채* stringify
#define VERSION 1
#define STR(x) #x
const char *v = STR(VERSION);     // "VERSION" (의도: "1")

// 한 단계 더 감싸야 치환됨
#define XSTR(x) STR(x)
const char *v = XSTR(VERSION);    // "1"
```

`##`에도 같은 함정이 있다. *간접 macro expansion* 패턴이 필요.

## PRE06-C — 헤더 파일은 *외부 가시*에 대비

```c
// foo.h — 위반 — 글로벌 매크로 노출
#define MAX_SIZE 256
#define BUFFER_SIZE 1024
#define DEBUG 1

// 모든 include 측에 영향. 충돌 위험.
```

대안:

```c
// Good — 프로젝트 prefix
#define FOO_MAX_SIZE 256
#define FOO_BUFFER_SIZE 1024
#define FOO_DEBUG 1

// 또는 const variable (linkage 비용은 inline으로 회피)
static const size_t kFooMaxSize = 256;
```

## PRE07-C — concat tokens가 *예약 식별자*를 만들지 않게

```c
#define MAKE_NAME(x) _##x
int MAKE_NAME(counter);    // → int _counter — 일부 환경에서 예약 식별자
```

이중 밑줄(`__`), 밑줄+대문자(`_A~_Z`)는 C 표준 예약. 매크로 결합 결과로 *우연히* 만들어지지 않게.

## PRE09-C — `#undef` 사용에 주의

```c
#define LIMIT 100
/* ... 100을 LIMIT으로 사용 ... */
#undef LIMIT
#define LIMIT 200
/* ... 200을 LIMIT으로 사용 ... */
```

같은 이름이 *다른 의미*로 재정의되면 *어디서 어느 값*인지 추적 어렵다. 가능하면 *고유 이름*을 쓰고 `#undef`를 피하라.

## PRE10-C — 가변 매크로는 신중하게

C99의 가변 매크로(`...`)는 디버깅 매크로에 유용하지만 *함정*도 있다.

```c
#define LOG(fmt, ...) fprintf(stderr, fmt, __VA_ARGS__)
LOG("hello");        // fprintf(stderr, "hello",)  — 잘못된 콤마

// C99 — ##__VA_ARGS__ (GCC extension)
#define LOG(fmt, ...) fprintf(stderr, fmt, ##__VA_ARGS__)

// C20 — __VA_OPT__
#define LOG(fmt, ...) fprintf(stderr, fmt __VA_OPT__(,) __VA_ARGS__)
```

## PRE11-C — 매크로는 *세미콜론 처리*에 주의

```c
// 위반 — 함정
#define INIT(p) (p)->x = 0; (p)->y = 0
if (cond) INIT(obj);
//        ↓ 풀려서
// if (cond) (obj)->x = 0; (obj)->y = 0;
//                                  ^^^^ if 밖

// Good — do { } while (0) 패턴
#define INIT(p) do { (p)->x = 0; (p)->y = 0; } while (0)
if (cond) INIT(obj);  // OK — 한 statement
```

`do { } while (0)`은 *여러 statement를 한 블록으로* 묶고 *끝에 세미콜론을 요구*하는 표준 관용구.

## PRE12-C — Side effect가 *복수 평가*되지 않게

```c
#define MAX(a, b) ((a) > (b) ? (a) : (b))
int y = MAX(i++, j);    // i++가 두 번 평가됨

// Good — typeof + 임시 변수 (GCC extension)
#define MAX(a, b) ({ typeof(a) _a = (a); typeof(b) _b = (b); _a > _b ? _a : _b; })
```

GCC `typeof`나 C23 `__typeof__`가 *완전한 한 번 평가*를 보장한다. 표준 C로는 *inline 함수*가 최선.

## PRE13-C — `#pragma` 비표준 동작 격리

```c
#pragma pack(push, 1)
struct Packet { uint8_t hdr; uint32_t data; };
#pragma pack(pop)
```

`#pragma`는 *컴파일러별로 의미가 다르다*. GCC `__attribute__((packed))`도 비슷. 매크로로 캡슐화.

```c
#if defined(__GNUC__)
#  define PACKED __attribute__((packed))
#else
#  define PACKED
#endif

struct PACKED Packet { uint8_t hdr; uint32_t data; };
```

## include 순서의 함정

```c
// foo.c — 위반 — 순서 의존
#include "foo.h"            // FOO_DEFINED 필요
#include <stdint.h>
#include "bar.h"            // FOO_DEFINED를 봐야 함

// 더 안전 — 모든 헤더가 self-contained
#include "foo.h"            // foo.h 안에서 필요한 것 모두 include
#include "bar.h"            // bar.h도 self-contained
```

PRE08-C와 연결. 모든 헤더는 *독립적으로 컴파일 가능*해야 한다(*self-contained header*).

## 예약 식별자 — 종합

C 표준이 *구현용으로 예약*한 식별자.

| 패턴 | 예 | 예약 범위 |
|------|-----|----------|
| 두 밑줄로 시작 | `__foo`, `__init` | 모든 스코프 |
| 밑줄 + 대문자 | `_Foo`, `_INIT` | 모든 스코프 |
| 밑줄 + 소문자 (글로벌) | `_foo` (글로벌) | 글로벌 스코프 |
| 표준 헤더 식별자 | `printf`, `errno` | 해당 헤더 include 시 |

매크로·typedef·변수 이름을 정할 때 이를 피한다.

## 자주 마주치는 취약점

| 규칙 | 흔한 결과 |
|------|---------|
| PRE01 (괄호 누락) | 계산 결과 오류 → 잘못된 동작 |
| PRE10 (가변 매크로) | 빈 인자 시 컴파일 에러 |
| PRE11 (세미콜론) | 제어흐름 와해 |
| PRE12 (side effect) | i++ 중복 → 메모리 손상 |

## clang-tidy로 검출

```bash
clang-tidy -checks='cert-pre*,cppcoreguidelines-macro-usage' source.c
```

`cppcoreguidelines-macro-usage`는 *매크로 자체*를 경고. CERT 영역 외에도 PRE 함정 검출에 유용.

## 정리

- 함수 매크로 대신 *inline 함수* 우선(PRE00).
- 매크로 정의와 인자 모두 *괄호*로 감싸라(PRE01).
- 다중 statement 매크로는 *`do { } while (0)`* 패턴(PRE11).
- Side effect 인자는 *복수 평가* 위험(PRE12) — typeof 또는 inline.
- `#pragma`는 *매크로로 캡슐화*해 컴파일러 호환.
- *예약 식별자* 패턴 회피 — 두 밑줄, 밑줄+대문자.

## 다음 장 예고

3장은 DCL — 선언과 초기화. extern·static·typedef의 정합성, 초기화 누락, qualifier 사용 정책.

## 관련 항목

- [Ch 1 — CERT란 / MISRA와 차이](/blog/embedded/automotive/cert-c/chapter01-intro-vs-misra)
- [Ch 3 — Declarations & Initialization](/blog/embedded/automotive/cert-c/chapter03-declarations-init)
