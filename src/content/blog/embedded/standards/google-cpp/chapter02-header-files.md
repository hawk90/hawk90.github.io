---
title: "Ch 2: Header Files"
date: 2025-05-13T02:00:00
description: "Self-contained / #define guard / IWYU / Forward declaration / Inline / Include 순서."
tags: [Google, C++, Style-Guide, Header, Include]
series: "Google C++ Style"
seriesOrder: 2
draft: false
---

> 헤더 파일은 — 코드베이스의 *접합점*. 잘못 만들면 — 컴파일 시간 폭증, 순환 의존, 인터페이스 누출.

## Self-contained Headers

### 규칙

> 모든 헤더는 — 단독으로 컴파일 가능해야 한다.

```cpp
// foo.h — 다른 헤더 없이 — 그 자체로 컴파일 가능?
#include <string>

class Foo {
public:
    void Init(const std::string& name);
};
```

이 파일을 — 단독으로 `#include`해도 — 컴파일이 가능해야 한다. (즉, 필요한 모든 헤더를 — 스스로 포함)

### Bad — Self-contained 아님

```cpp
// foo.h:
class Foo {
public:
    void Init(const std::string& name);   // string은? — 안 포함됨!
};
```

사용자가:
```cpp
#include "foo.h"   // 컴파일 에러: string 모름
```

### `.inc` 파일은 예외

이 규칙은 — `.h` 파일에 적용. 코드 일부만 담은 `.inc` (코드 생성 / X-Macro 등)는 — 제외.

## The #define Guard

### 규칙

> `<PROJECT>_<PATH>_<FILE>_H_` 형식.

```cpp
// 위치: foo/src/bar/baz.h

#ifndef FOO_BAR_BAZ_H_
#define FOO_BAR_BAZ_H_

// ... content ...

#endif  // FOO_BAR_BAZ_H_
```

이름이 — 충돌 없도록.

### `#pragma once` 회피

```cpp
#pragma once   // Google 가이드: 회피
```

이유:
- 비표준 (대부분 지원하지만)
- 가이드의 일관성 우선

## Include What You Use (IWYU)

### 규칙

> 사용하는 모든 심볼 — 직접 include.

```cpp
// 좋음:
#include <vector>     // std::vector 사용 → 직접 include
#include <string>     // std::string 사용 → 직접 include

void Process(std::vector<std::string>& items);
```

다른 헤더가 — 우연히 `<string>`을 가져오고 있어도 — *우리가 직접* `#include <string>`.

### Bad — Transitive Include 의존

```cpp
// foo.h:
#include "Other.h"   // Other.h가 우연히 <string> 포함

class Foo {
    std::string name;   // <string>이 우연히 들어와 있어서 동작
};
```

`Other.h`가 — 미래에 `<string>` 안 포함하도록 바뀌면? → 빌드 실패.

**해결** — `foo.h`에서 `#include <string>`을 *직접* 추가.

### 도구 — `include-what-you-use`

```bash
$ include-what-you-use foo.cc
foo.cc should add these lines:
#include <string>
foo.cc should remove these lines:
- #include <iostream>  // lines 3
```

Clang 기반 도구. CI에 통합 가능.

## Forward Declarations

### 신중히 사용

> 가능하면 *include*. 꼭 필요할 때만 forward declaration.

```cpp
// 가능:
class Foo;   // forward declaration
void Bar(Foo* f);   // pointer/reference만 사용 → forward 충분

// 더 좋음:
#include "foo.h"
void Bar(Foo* f);   // full include
```

### Pros / Cons

```
Pros (forward decl):
- 컴파일 시간 감소
- 의존성 명시

Cons:
- 의미가 — 다른 헤더에서 결정 (헷갈림)
- 인라인 함수 / 템플릿에선 — full 정의 필요
- API 진화 시 — 빠뜨리기 쉬움
```

Google의 결론 — **꼭 필요할 때만** (컴파일 시간이 결정적 이슈인 경우).

## Inline Functions

### 규칙

> 10줄 미만의 함수에만 — `inline` 적용.

```cpp
// 좋음:
inline int Square(int x) { return x * x; }   // 1줄

// 회피:
inline int LongFunc(...) {
    // 30줄 ...
}
```

이유 — 큰 inline 함수는 *바이너리 크기* 폭증.

### Loops / Switch in Inline

```cpp
// 회피:
inline int Sum(...) {
    int total = 0;
    for (int i = 0; i < N; i++) {   // 루프 — inline 비용 큼
        total += data[i];
    }
    return total;
}
```

Loop / switch가 있으면 — inline 효과 미미. 보통 함수로.

## Names and Order of Includes

### 순서

```cpp
// myfile.cc:
#include "myfile.h"   // 1. 자기 헤더 (가장 위)

#include <sys/types.h>   // 2. C 시스템 헤더
#include <unistd.h>

#include <string>        // 3. C++ 표준 헤더
#include <vector>

#include "absl/strings/str_cat.h"   // 4. 다른 라이브러리
#include "third_party/foo/bar.h"

#include "myproject/util.h"          // 5. 같은 프로젝트의 헤더
```

### 자기 헤더 — 가장 위

```cpp
// myclass.cc:
#include "myclass.h"   // ← 항상 첫 줄
```

이유 — `myclass.h`가 *self-contained*인지 — 자동으로 확인됨. 만약 누락된 include가 있으면 — 여기서 즉시 에러.

### 빈 줄로 그룹 구분

각 그룹 — 빈 줄로 구분. 알파벳 순.

```cpp
#include "myfile.h"

#include <unistd.h>

#include <string>
#include <vector>

#include "absl/strings/str_cat.h"

#include "myproject/util.h"
```

읽기 쉬움.

### 절대 경로

```cpp
// 좋음:
#include "myproject/util.h"

// 회피:
#include "../util.h"          // 상대 경로
#include "util.h"             // 모호함 (위치 의존)
```

빌드 시스템의 — *include path*에서 본 절대 경로.

## 정리

- **Self-contained** — 모든 헤더 단독 컴파일 가능
- **`#define` Guard** — `PROJECT_PATH_FILE_H_` 형식
- **IWYU** — 사용 심볼 직접 include
- **Forward Declaration** — 신중히 (보통 include 선호)
- **Inline** — 10줄 미만만
- **Order** — 자기 / C / C++ / 라이브러리 / 프로젝트

## 다음 장 예고

다음 — **Scoping**. namespace, internal linkage, 전역 변수.

## 관련 항목

- [Ch 1: Background](/blog/embedded/standards/google-cpp/chapter01-background-version-magic)
- [Ch 3: Scoping](/blog/embedded/standards/google-cpp/chapter03-scoping)
